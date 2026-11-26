// 开罗式重整（docs/KAIRO_PLAN.md §4.2 / §4.4 / §7）面板版式断言：node tools/kairo_check.js [outdir] ["Pixel 7"|360]
// 各面板第一屏：除名字和数字外 ≤ 60 个汉字（结算卡 ≤ 40、年报 ≤ 70、解锁卡 ≤ 30）、按钮 ≤ 6（分页条与关闭不算）、小于 14px 的字 = 0、主按钮在第一屏、不横向溢出；
// 另查：拿到第一件法宝后【装备】1 次点击看到三格装备栏；功法 / 灵宠 2 次；解锁卡【带我去】1 次点击到控件。
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots', 'kairo');
const dev = process.argv[3] || 'Pixel 7';
require('fs').mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const b = await chromium.launch();
  const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(700);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));
  // 第一屏度量：汉字数（名字 .nm / 数字 / 分页 / 标题不算）、按钮数、小字数、横向溢出
  const measure = () => ev(() => {
    const m = document.querySelector('#modal:not([hidden]) .sheet'); if (!m) return null;
    const body = m.querySelector('.body') || m, bb = body.getBoundingClientRect(), vw = window.innerWidth;
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < Math.min(bb.bottom, window.innerHeight) - 4 && r.bottom > bb.top; };
    let han = 0, small = 0; const smallTxt = [], txt = [];
    const walk = document.createTreeWalker(m, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement; if (!el || !n.textContent.trim() || !vis(el)) continue;
      { const d = el.closest('details'); if (d && !d.open && !el.closest('summary')) continue; }   // 合着的折叠里的字看不见
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (parseFloat(cs.fontSize) < 13.9) { small++; if (smallTxt.length < 4) smallTxt.push(n.textContent.trim().slice(0, 10) + '@' + cs.fontSize); }
      if (el.closest('.klog, .nm, .pn-nm, .ktabs, header, .tabs, .kstamp, .stamp, .story-tag, .chip, .tag, .num, button, .btn')) continue;
      const hn = (n.textContent.match(/[\u4e00-\u9fff]/g) || []).length; han += hn; if (hn) txt.push(n.textContent.trim());
    }
    const btns = [...m.querySelectorAll('button, .btn')].filter(x => !x.closest('.ktabs, header, .tabs, .hplot, .kgrid, .pn-tile, .pcard, .cell, .aslot, .pn-bag, .hgrid') && vis(x) && !x.disabled);   // 图标格子（地块、包裹格、灵宠卡、槽位）不算按钮
    const foot = [...m.querySelectorAll('.foot .btn')];
    const gold = m.querySelector('.foot .btn.gold, .kb.red, .btn.gold');
    const over = [...m.querySelectorAll('*')].some(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1); });
    return { txt: txt.join('|'), han, btns: btns.length, foot: foot.length, small, smallTxt, mainVis: !gold || gold.getBoundingClientRect().bottom <= window.innerHeight + 1, over, title: (m.querySelector('h2') || {}).textContent };
  });
  const panel = async (name, fn, lim) => {
    await ev(fn); await page.waitForTimeout(350);
    await page.screenshot({ path: `${out}/${dev === '360' ? '360' : 'p7'}-${name}.png` });
    const r = await measure();
    if (!r) { check(false, `${name}：没打开`); return; }
    const L0 = lim || 60;
    if (process.env.DUMP && r.han > L0) console.log('     ', r.txt);
    check(r.han <= L0 && r.btns <= 6 && r.small === 0 && r.mainVis && !r.over, `${name}：汉字 ${r.han}/${L0} · 按钮 ${r.btns}/6 · 小字 ${r.small}${r.small ? ' ' + r.smallTxt.join(' ') : ''} · 主按钮${r.mainVis ? '在' : '不在'}第一屏${r.over ? ' · 横向溢出' : ''}`);
  };
  // 第一趟：手把手三步 → 结算卡（第一件法宝已戴上）→【装备】1 次点击
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(250);
  await page.click('#modal .card[data-k="0"]'); await page.waitForTimeout(250);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  await ev(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); }); await page.waitForTimeout(700);
  const r1 = await measure();
  await page.screenshot({ path: `${out}/${dev === '360' ? '360' : 'p7'}-result.png` });
  if (process.env.DUMP && r1) console.log('     ', r1.txt);
  check(r1 && r1.han <= 40 && r1.small === 0, `结算卡：汉字 ${r1 && r1.han}/40 · 小字 ${r1 && r1.small} ${r1 ? r1.smallTxt.join(' ') : ''}`);
  check(await ev(() => /战力/.test(document.querySelector('#modal .body').textContent) && /离目标/.test(document.querySelector('#modal .body').textContent)), '结算卡有“战力 前 → 后”和“离目标”');
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(500);
  await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(400);
  await page.click('[data-nav="gear"]'); await page.waitForTimeout(300);
  check(await ev(() => document.querySelectorAll('#modal .kslot').length >= 3 && /装备/.test(document.querySelector('#modal h2').textContent)), '拿到第一件法宝后：【装备】1 次点击看到三格装备栏');
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(300);
  // 中期局面：全开（照 tools/shot.js 的中期造法，简化）
  await ev(() => {
    const { st, L } = window.__xm;
    L.onbAll(st); st.guide = { step: 99, done: true };
    st.stones = 5e4; st.p.r = 3; st.p.s = 2; st.p.xp = L.pNeed(st.p) * 0.4; st.flags.maxR = 3; st.flags.maxI = 14; st.tick = 120; st.year = 44;
    for (const id of ['x_houtu', 'x_qingmu', 'z_hanyue', 'z_liuyun', 'm_lianxi']) L.giveArt(st, id);
    L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_hanyue'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99;
    st.home = Object.assign(st.home, { cave: 4, array: 9, field: 8, furnace: 5 });
    st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.stats.tour = 3; st.retreat = null; st.exp = null; st.herbs = 120; st.pills = 3;
    L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900;
    st.gear = L.newGear(); st.ore = 900; st.treasure = 2;
    L.gearDrop(st, 'w', 4, { base: 'w4_1' }); L.gearDrop(st, 'r', 3, { base: 'r3_0' }); L.gearDrop(st, 'o', 4, { base: 'o_cul4' });
    L.gearDrop(st, 'w', 5, {}); L.gearDrop(st, 'w', 2, {});
    st.pets = []; st.petOut = -1; st.petPend = []; st.feed = 400;
    L.petGive(st, { sp: 'p_hu2', src: 'shop' }); L.petGive(st, { sp: 'p_he' }); st.pets[0].lv = 4;
    st.storyQ = []; st.achQ = []; st.market.evQ = []; st.visitor = null;
    L.checkQuests(st); st.achQ = []; st.storyQ = [];
    window.__xm.closeModal();
  });
  await page.waitForTimeout(600);
  await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${dev === '360' ? '360' : 'p7'}-main-mid.png` });
  // 主画面：第 N 章 + 目标 + 现值→目标值 + 下一步，四样都非空；目标卡 ≤ 40 字
  const gc = await ev(() => ({ ch: document.getElementById('gCh').textContent, t: document.getElementById('gT').textContent, bar: document.getElementById('gBar').textContent, nx: document.getElementById('gNext').textContent }));
  const gn = (gc.t + gc.bar + gc.nx).replace(/[^一-鿿]/g, '').length;
  check(gc.ch && gc.t && gc.bar && gc.nx.length > 4 && gn <= 40, `目标卡四样：${gc.ch} / ${gc.t} / ${gc.bar} / ${gc.nx}（${gn} 字）`);
  check(await ev(() => [...document.querySelectorAll('#nav button')].map(x => x.dataset.nav).join(',')) === 'exp,home,gear,world,path', '底栏固定五格：历练 洞府 装备 江湖 仙途');
  const X = 'window.__xm';
  await panel('exp', () => window.__xm.showExp());
  await panel('exp-confirm', () => { window.__xm.closeModal(); window.__xm.confirmExp(1, 0, 0); });
  await panel('home', () => { window.__xm.closeModal(); window.__xm.showHome(); });
  await panel('gear', () => { window.__xm.closeModal(); window.__xm.showEquip(); });
  // 功法、灵宠：从主画面 2 次点击（装备 → 分页）
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(300);
  await page.click('[data-nav="gear"]'); await page.waitForTimeout(250); await page.click('#modal [data-kt="art"]'); await page.waitForTimeout(250);
  check(await ev(() => !!document.querySelector('#modal [data-kt="art"].on')), '功法：2 次点击（装备 → 功法）');
  await panel('arts', () => {});
  await page.click('#modal [data-kt="pets"]'); await page.waitForTimeout(250);
  check(await ev(() => !!document.querySelector('#modal [data-kt="pets"].on')), '灵宠：2 次点击（装备 → 灵宠）');
  await panel('pets', () => {});
  await panel('bag', () => { window.__xm.showBag(); });
  await panel('world-rank', () => { window.__xm.closeModal(); window.__xm.showWorld('rank'); });
  await panel('world-sect', () => { window.__xm.closeModal(); window.__xm.showSect(); });
  await panel('world-market', () => { window.__xm.closeModal(); window.__xm.showMarket(); });
  await panel('path', () => { window.__xm.closeModal(); window.__xm.showPath(); });
  await panel('attr', () => { window.__xm.closeModal(); window.__xm.showMe('attr'); });
  await panel('record', () => { window.__xm.closeModal(); window.__xm.showRecord(); });
  await panel('settings', () => { window.__xm.closeModal(); window.__xm.showSettings(); });
  await panel('inbox', () => { window.__xm.closeModal(); window.__xm.showInbox(); });
  await panel('year', () => { window.__xm.closeModal(); window.__xm.showYearReport(); }, 70);
  await panel('unlock', () => { window.__xm.closeModal(); window.__xm.showUnlock('field'); }, 30);
  // 解锁卡【带我去】1 次点击：打开洞府并给控件套金框
  await page.click('#unlGo'); await page.waitForTimeout(500);
  check(await ev(() => document.querySelector('#modal h2') && /洞府/.test(document.querySelector('#modal h2').textContent)), '解锁卡【带我去】1 次点击到达（洞府）');
  void X;
  console.log(errs.join('\n') || 'no errors');
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  await b.close();
  if (fails.length || errs.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
