// 开罗式重整（docs/KAIRO_PLAN.md §4.2 / §4.4 / §7）面板版式断言：node tools/kairo_check.js [outdir] ["Pixel 7"|360]
// 各面板第一屏：除名字和数字外 ≤ 60 个汉字（结算卡 ≤ 40、年报 ≤ 70、解锁卡 ≤ 30）、按钮 ≤ 6（分页条与关闭不算）、小于 14px 的字 = 0、主按钮在第一屏、不横向溢出；
// 另查：拿到第一件法宝后【装备】1 次点击看到三格装备栏；功法 / 灵宠 2 次；解锁卡【带我去】1 次点击到控件。
// 变强页（§10.9）：第一屏 ≤ 60 字、≤ 3 张牌、≤ 6 个按钮、没有小于 14px 的字、头和全部动作卡不滚动可见、红按钮恰好 1 个；每张牌 1 个大数字 1 个按钮、名字 ≤ 8 字；
// 行动点制（docs/AP_PLAN.md §6.5、§8.4）：放置不走时间；#btnSpeed 不存在、行动点一行在；所有花点的按钮都带 ◆N 角标、点数与 L.AP 一致；
// 目标卡“下一步”、老祖头像、变强页第一张同源；当场能做的牌点一下留在本页、头上的数 300ms 内跳到牌上写的值（差 ≤ 1 个显示单位）；属性页进来明细展开、≤ 6 行、行内没有说明。
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
  await ev(() => window.__xm_bt.all()); await page.waitForTimeout(700);
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
    L.checkQuests(st); st.achQ = []; st.storyQ = []; window.__xm.unlockQ.length = 0;   // L.onbAll 一口气开的系统不出解锁卡（解锁卡现在由结算链在空下来时当场出）
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
  { const pm = await ev(() => document.getElementById("modal").hidden ? "" : (document.querySelector("#modal h2") || {}).textContent); if (pm) console.log("     （空下来时结算链出了：" + pm + "）"); await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById("modal").hidden) window.__xm.closeModal(); }); await page.waitForTimeout(300); }
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
  // ---------- 变强页（KAIRO_PLAN §10.9） ----------
  const gwShape = () => ev(() => {
    const m = document.querySelector('#modal:not([hidden]) .sheet'); if (!m) return null;
    const body = m.querySelector('.body'), bb = body.getBoundingClientRect(), bot = Math.min(bb.bottom, window.innerHeight) + 1;
    const acts = [...m.querySelectorAll('.gw-act')], head = m.querySelector('.gw-head');
    return { n: acts.length, cards: acts.map(a => ({ num: a.querySelectorAll('.num').length, btn: a.querySelectorAll('button').length, nm: ((a.querySelector('.nm') || {}).textContent || '').trim() })),
      red: [...m.querySelectorAll('.gw-btn.red, .kb.red, .btn.gold, .btn.red')].filter(x => !x.disabled).length, vis: !!head && head.getBoundingClientRect().top >= bb.top - 1 && acts.every(a => a.getBoundingClientRect().bottom <= bot), top: body.scrollTop,
      det: m.querySelector('details.gw-det') ? m.querySelector('details.gw-det').open : null, rows: [...m.querySelectorAll('.gw-dr')].map(r => [...r.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim()).length + [...r.querySelectorAll('span:not(.n):not(.v):not(.a)')].length) };
  });
  for (const [nm, f, o] of [['growth', undefined], ['growth-atk', 'atk'], ['growth-inc', 'inc'], ['growth-bt', 'bt']]) {
    await ev(([f, o]) => { window.__xm.closeModal(); window.__xm.showGrowth(f, o); }, [f, o]);
    await panel(nm, () => {}, 60);
    const g = await gwShape();
    check(g && g.n >= 1 && g.n <= 3 && g.vis && g.red === 1, `${nm}：牌 ${g && g.n}/3 · 头和动作卡${g && g.vis ? '' : '不'}在第一屏 · 红按钮 ${g && g.red}`);
    check(g && g.cards.every(c => c.num === 1 && c.btn === 1 && c.nm.length <= 8), `${nm}：每张牌 1 个大数字 1 个按钮、名字 ≤ 8 字（${g && g.cards.map(c => c.nm).join(' / ')}）`);
  }
  await panel('growth-cul-detail', () => { window.__xm.closeModal(); window.__xm.showGrowth('cul', { detail: true }); }, 60);
  // 属性页的格子进来：明细已展开、≤ 6 行、行内没有说明
  await ev(() => { window.__xm.closeModal(); window.__xm.showMe('attr'); }); await page.waitForTimeout(250);
  await page.click('#modal [data-grow="atk"]'); await page.waitForTimeout(350);
  { const g = await gwShape(); check(g && g.det === true && g.rows.length >= 1 && g.rows.length <= 6 && g.rows.every(x => x === 0), `属性 → 战力：明细展开 ${g && g.det} · ${g && g.rows.length} 行 · 行内说明 ${g && g.rows.filter(x => x).length}`); }
  await page.screenshot({ path: `${out}/${dev === '360' ? '360' : 'p7'}-growth-attr.png` });
  // 三处同源：目标卡“下一步” = 老祖头像点开的第一张 = L.advise 第一张
  await ev(() => { window.__xm.closeModal(); }); await page.waitForTimeout(400);
  const same = await ev(() => { const { st, L } = window.__xm, a = L.advise(st, 'goal').acts[0], gn = L.goalNext(st); return { a: a && a.id, say: a && a.say, n: a && a.n, gk: gn.k, why: gn.why, card: document.getElementById('gNext').textContent }; });
  await ev(() => { const b = document.getElementById('guideAv'); if (b) b.click(); }); await page.waitForTimeout(350);
  const avFirst = await ev(() => ({ t: (document.querySelector('#modal h2') || {}).textContent || '', nm: ((document.querySelector('#modal .gw-act .nm') || {}).textContent || '').trim() }));
  check((same.why !== 'adv' || (same.gk === same.a && same.card === '下一步：' + same.say)) && /变强/.test(avFirst.t) && avFirst.nm === same.n, `三处同源：目标卡“${same.card}” / 老祖头像 → ${avFirst.t}“${avFirst.nm}” / advise ${same.a}`);
  // 当场能做的牌：点一下留在本页、头上的数跳到牌上写的值
  const inst = await ev(() => { const { st, L } = window.__xm; for (const f of ['goal', 'atk']) { const A = L.advise(st, f), i = A.acts.findIndex(a => a.instant && !a.gap && a.gain.to !== undefined); if (i >= 0) return { f, i, to: A.acts[i].gain.to, unit: A.acts[i].gain.unit, v0: A.head.v, big0: A.head.big }; } return null; });
  if (inst) {
    await ev(f => { window.__xm.closeModal(); window.__xm.showGrowth(f); }, inst.f); await page.waitForTimeout(250);
    await ev(() => { window.__xm.__rng0 = window.__xm.L.rng; window.__xm.L.rng = () => 0; });   // 强化不掷失败
    await page.click(`#modal [data-adv="${inst.i}"]`); await page.waitForTimeout(300);
    await ev(() => { window.__xm.L.rng = window.__xm.__rng0; });
    const af = await ev(f => { const { st, L } = window.__xm; return { t: (document.querySelector('#modal h2') || {}).textContent || '', big: ((document.querySelector('#modal .gw-big') || {}).textContent || ''), v: L.advise(st, f).head.v }; }, inst.f);
    const unit = inst.unit === 'grade' ? 1 : inst.unit === 'pw' ? Math.max(1, inst.to * 0.01) : 0.01;
    check(/变强/.test(af.t) && af.big !== inst.big0 && Math.abs(af.v - inst.to) <= unit + 1e-9, `当场做完：留在本页 · 头 ${inst.big0} → ${af.big.replace(/目标.*/, '')} · 牌上写 ${inst.unit === 'p' ? Math.round(inst.to * 100) + '%' : Math.round(inst.to * 100) / 100}（${inst.f}）`);
    await page.screenshot({ path: `${out}/${dev === '360' ? '360' : 'p7'}-growth-after.png` });
  } else check(true, '当场能做的牌：此局面没有（跳过）');
  await panel('record', () => { window.__xm.closeModal(); window.__xm.showRecord(); });
  await panel('settings', () => { window.__xm.closeModal(); window.__xm.showSettings(); });
  // 存档页（saves.js）：设置里 1 次点击进；6 格一屏；点手动 1 出存档卡
  await page.click('#btnSaves'); await page.waitForTimeout(300);
  check(await ev(() => /存档/.test(document.querySelector('#modal h2').textContent) && document.querySelectorAll('#modal [data-sv]').length === 6), '存档：设置 → 1 次点击，6 格');
  await panel('saves', () => {});
  await panel('saves-slot', () => { window.__xm.closeModal(); window.__xm.slots.writeMan(0, window.__xm.st); window.__xm.showSlot('m', 0); }, 40);
  await panel('inbox', () => { window.__xm.closeModal(); window.__xm.showInbox(); });
  await panel('year', () => { window.__xm.closeModal(); window.__xm.showYearReport(); }, 70);
  await panel('unlock', () => { window.__xm.closeModal(); window.__xm.showUnlock('field'); }, 30);
  // 解锁卡【带我去】1 次点击：打开洞府并给控件套金框
  await page.click('#unlGo'); await page.waitForTimeout(500);
  check(await ev(() => document.querySelector('#modal h2') && /洞府/.test(document.querySelector('#modal h2').textContent)), '解锁卡【带我去】1 次点击到达（洞府）');
  void X;
  // ---------- 行动点制：放置不走时间、没有速度键、花点的按钮都带角标 ----------
  await ev(() => { for (let i = 0; i < 6; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); });
  const t0 = await ev(() => ({ tick: window.__xm.st.tick, xp: window.__xm.st.p.xp }));
  await page.waitForTimeout(4000);
  const t1 = await ev(() => ({ tick: window.__xm.st.tick, xp: window.__xm.st.p.xp, spd: !!document.getElementById('btnSpeed'), row: !!document.getElementById('apRow') && document.getElementById('apRow').offsetHeight >= 44, nx: !!document.getElementById('btnNext') }));
  check(t1.tick === t0.tick && t1.xp === t0.xp, `放置 4 秒：时间不走（第 ${t0.tick} → ${t1.tick} 月）、修为不涨`);
  check(!t1.spd && t1.row && t1.nx, '没有速度键；行动点一行在（≥ 44px）、有【下一季】');
  // 花点的按钮：出发页、确认页（出发 / 扫荡）、洞府（闭关 / 打坐）都带 ◆N，点数 = L.AP
  const apScan = async (name, fn) => { await ev(fn); await page.waitForTimeout(350); return ev(n => { const AP = window.__xm.L.AP, bad = []; let n0 = 0; for (const b of document.querySelectorAll('#modal button, #modal .btn')) { const m = /◆(\d)/.exec(b.textContent); if (!m) continue; n0++; const d = b.dataset.ap || ((b.querySelector('[data-ap]') || {}).dataset || {}).ap; if (String(d) !== m[1]) bad.push(b.textContent.trim().slice(0, 8)); } return { n0, bad, name: n, ok: Object.values(AP).length > 0 }; }, name); };
  const s1 = await apScan('确认页', () => { const X = window.__xm; X.closeModal(); X.confirmExp(0, 0, 0); });
  const fb = await ev(() => { const b = [...document.querySelectorAll('#modal .foot .btn')].find(x => /出发/.test(x.textContent)); return b ? { t: b.textContent, ap: +b.dataset.ap } : null; });
  check(!!fb && /◆2/.test(fb.t) && fb.ap === 2, `确认页【${fb && fb.t}】带 ◆2、data-ap = L.AP.exp`);
  const s2 = await apScan('洞府', () => { const X = window.__xm; X.closeModal(); X.showHome(); });
  const sit = await ev(() => { const b = document.getElementById('btnSit'); return b ? +b.dataset.ap : -1; });
  check(s1.bad.length === 0 && s2.bad.length === 0 && sit === 1 && s2.n0 >= 1, `花点的按钮都带角标且与 data-ap 一致（确认页 ${s1.n0} 个、洞府 ${s2.n0} 个；打坐 data-ap ${sit}）${s1.bad.concat(s2.bad).join(' ')}`);
  console.log(errs.join('\n') || 'no errors');
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  await b.close();
  if (fails.length || errs.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 600)); process.exit(1); });
