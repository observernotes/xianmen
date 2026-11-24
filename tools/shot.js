// 冒烟测试 + 截图：node tools/shot.js <输出目录>
// 速度档：SPEEDS = [1, 2, 4, 0]，setSpeed(3) 是暂停
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/01-intro.png' });
  for (let i = 0; i < 10; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(150); }
  await page.screenshot({ path: out + '/02-setup.png' });
  await page.click('#goStart');
  await page.waitForTimeout(2400);
  await page.screenshot({ path: out + '/03-start.png' });
  const close = async () => { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450); await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); };
  // 中期局面：元婴圆满，打通前五张图
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    window.__xm.setSpeed(3);
    st.stones = 5e4; st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.p.t = 4; st.flags.awoke = 2; st.p.w = 4; st.p.wn = '乾坤镜'; st.p.pet = { tier: 3, name: '青鸾' };
    for (const id of ['x_houtu', 'x_qingmu', 'x_changchun', 'z_hanyue', 'z_huichun', 'z_liuyun', 'm_lianxi', 'm_yufeng']) L.giveArt(st, id);
    st.arts.own.x_houtu = L.artNeed('x_houtu', 2) + 5; st.arts.own.z_hanyue = L.artNeed('z_hanyue', 1) + 3; st.arts.own.x_qingmu = L.artNeed('x_qingmu', 3);
    L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_hanyue'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99;
    st.home = { cave: 4, array: 9, field: 8, furnace: 5 }; st.p.age = 60; st.year = 44; st.tick = 120; st.flags.maxR = 3; st.flags.maxI = 15;
    for (let k = 0; k <= 4; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = k < 4 || d < 1 ? 3 : 0;
    for (let k = 0; k <= 3; k++) st.bosses[k] = 1;
    for (let k = 0; k < 15; k++) st.meta.aff[k] = 1;
    st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.stats.tour = 3; st.stats.retreat = 3; st.retreat = null; st.exp = null; st.herbs = 120; st.pills = 3;
    L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900; st.sect.tasks[0].taken = 1;
    st.storyQ = []; st.guide = { step: 99, done: true };
    for (const h of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life']) st.hintSeen[h] = 1;
    L.checkQuests(st); st.achQ = [];
  });
  await close(); await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/04-home-mid.png' });
  for (const [nav, name] of [['exp', '05-exp'], ['home', '06-home'], ['sect', '07-sect'], ['market', '08-market'], ['me', '09-me']]) {
    await page.click(`[data-nav="${nav}"]`); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png` }); await page.click('.sheet .close'); await page.waitForTimeout(450);
  }
  // 功法页：三个大槽 + 列表；换上青木长生功、回春剑诀 → 共鸣「生生不息」揭晓
  await page.evaluate(() => window.__xm.showMe('art')); await page.waitForTimeout(300); await page.screenshot({ path: out + '/09b-arts.png' });
  // 手机上不横向溢出、可点的东西都 ≥ 44 像素
  const lay = await page.evaluate(() => {
    const body = document.querySelector('#modal .body'), bad = [];
    for (const el of document.querySelectorAll('#modal [data-slot], #modal [data-art], #modal .tabs button, #modal .close')) { const r = el.getBoundingClientRect(); if (r.height < 44 || r.width < 44) bad.push(el.textContent.trim().slice(0, 8) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
    return { over: body.scrollWidth - body.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, bad };
  });
  if (lay.over > 0 || lay.page > 0) errors.push(`功法页横向溢出 ${lay.over}/${lay.page}px`);
  if (lay.bad.length) errors.push('功法页点击目标不足 44px：' + lay.bad.join('，'));
  await page.click('#modal [data-slot="1"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/09c-arts-zhan.png' });
  await page.click('#modal [data-art="z_huichun"]'); await page.waitForTimeout(250);
  await page.click('#modal [data-slot="0"]'); await page.waitForTimeout(250);
  await page.click('#modal [data-art="x_qingmu"]'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/09d-combo.png' });
  const combo = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, c: window.__xm.st.meta.combo }));
  if (combo.t !== '共鸣揭晓' || !combo.c.c1) errors.push('共鸣揭晓没有出现：' + JSON.stringify(combo));
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/09e-arts-after.png' });
  await close();
  // 寻宝揭晓：头一回必得《引气诀》，卡上写具体的一门
  await page.evaluate(() => { const { st, L } = window.__xm; st.arts.firstBox = 0; delete st.arts.own.x_yinqi; window.__xm.showMarket(); });
  await page.waitForTimeout(300); await page.click('#modal button[data-k="box"]'); await page.waitForTimeout(900); await page.screenshot({ path: out + '/08b-box-art.png' });
  const boxArt = await page.evaluate(() => document.querySelector('#modal .artline') && document.querySelector('#modal .artline').textContent);
  if (!boxArt || !boxArt.includes('引气诀')) errors.push('寻宝揭晓卡没写出具体功法：' + boxArt);
  await close();
  // 历练确认页（血煞秘境·外围·寻宝）与札记
  await page.evaluate(() => window.__xm.confirmExp(4, 0, 1)); await page.waitForTimeout(300); await page.screenshot({ path: out + '/05b-confirm.png' });
  await close();
  await page.click('#goal'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/05c-quests.png' }); await close();
  await page.click('#cult'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/10-bt.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(2600); await page.screenshot({ path: out + '/11-trib.png' });
  for (let i = 0; i < 30 && await page.evaluate(() => window.__xm.cine); i++) await page.waitForTimeout(200);
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/12-btres.png' }); await close();
  await page.evaluate(() => { const { st } = window.__xm; st.storyQ = []; st.p.r = 3; st.p.s = 2; st.sect.total = 20000; window.__xm.doPromote(); }); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/13-promo-duel.png' });
  await page.click('.foot .btn:not([disabled])'); await page.waitForTimeout(300); await close();
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1400); await page.screenshot({ path: out + '/14-tour.png' });
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  await close();
  // 历练途中（本趟收获条）与结算卡
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.inj = 0; L.startExp(st, 3, 1, 0); });
  await page.evaluate(() => window.__xm.setSpeed(0)); await page.waitForTimeout(3500); await page.screenshot({ path: out + '/15-adv.png' });
  await page.evaluate(() => window.__xm.setSpeed(3));
  await page.evaluate(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); }); await page.waitForTimeout(700); await page.screenshot({ path: out + '/15b-result.png' });
  await close();
  await page.evaluate(() => { const { st, L } = window.__xm; st.exp = null; st.retreat = null; L.startExp(st, 4, 0, 1); }); await page.evaluate(() => window.__xm.setSpeed(0)); await page.waitForTimeout(3000); await page.screenshot({ path: out + '/16-adv2.png' });
  await page.evaluate(() => { window.__xm.setSpeed(3); window.__xm.st.exp = null; const s = window.__xm.st; s.p.inj = 2; s.stones = 5e4; }); await page.waitForTimeout(300);
  await page.click('[data-nav="home"]'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/16b-home-heal.png' }); await close();
  await page.evaluate(() => { const s = window.__xm.st; s.p.inj = 0; window.__xm.L.startRetreat(s); }); await page.waitForTimeout(800); await page.screenshot({ path: out + '/16c-retreat.png' });
  await page.evaluate(() => { const s = window.__xm.st; s.retreat = null; s.sect = null; window.__xm.showInvite(); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/17-invite.png' });
  await close();
  await page.evaluate(() => window.__xm.showDeath()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1900); await page.screenshot({ path: out + '/18-rebirth.png' });
  await page.click('.cand[data-i="0"]'); await page.click('.foot .btn.gold'); await page.waitForTimeout(800); await page.screenshot({ path: out + '/19-newlife.png' });
  const meta = await page.evaluate(() => Object.keys(window.__xm.st.meta.aff).length);
  if (meta < 15) errors.push('转世后相性图鉴没有保留（' + meta + '）');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('TEST FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
