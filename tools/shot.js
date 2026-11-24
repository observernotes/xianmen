// 冒烟测试 + 截图：node tools/shot.js <输出目录>
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
  const X = 'window.__xm';
  // 中期局面
  await page.evaluate(() => { window.__xm.setSpeed(3); });
  await page.evaluate(() => { const { st, L } = window.__xm; st.stones = 5e4; st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.p.t = 6; st.p.w = 4; st.p.a = 3; st.p.pet = { tier: 3, name: '青鸾' }; st.home = { cave: 4, array: 9, field: 8, furnace: 5 }; st.p.age = 60; st.year = 44; L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900; st.storyQ = []; st.guide = { step: 99, done: true }; st.pact = 1; st.stats.exp = 5; ['ready','btGo','afterPact','pactSoon','market','tuna','sect','me','alch','boss','life'].forEach(k => st.hintSeen[k] = 1); if (!document.getElementById('modal').hidden) window.__xm.closeModal(); window.__xm.setSpeed(0); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/04-home-mid.png' });
  for (const [nav, name] of [['exp', '05-exp'], ['home', '06-home'], ['sect', '07-sect'], ['market', '08-market'], ['me', '09-me']]) {
    await page.click(`[data-nav="${nav}"]`); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png` }); await page.click('.sheet .close'); await page.waitForTimeout(150);
  }
  await page.click('#cult'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/10-bt.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(2600); await page.screenshot({ path: out + '/11-trib.png' });
  await page.waitForTimeout(2200); await page.screenshot({ path: out + '/12-btres.png' }); await page.click('.foot .btn'); await page.waitForTimeout(200);
  await page.evaluate(() => window.__xm.doPromote()); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/13-promo-duel.png' });
  await page.click('.foot .btn:not([disabled])'); await page.waitForTimeout(300); if (await page.$('#modal:not([hidden]) .foot .btn')) await page.click('#modal .foot .btn');
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1400); await page.screenshot({ path: out + '/14-tour.png' });
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  // 历练
  await page.evaluate(() => { const { st, L } = window.__xm; if (!document.getElementById('modal').hidden) window.__xm.closeModal(); L.startExp(st, 3); });
  await page.waitForTimeout(3500); await page.screenshot({ path: out + '/15-adv.png' });
  await page.evaluate(() => { const { st } = window.__xm; st.exp.k = 7; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__xm.st.exp = null; }); await page.waitForTimeout(300);
  await page.evaluate(() => { const { st, L } = window.__xm; L.startExp(st, 8); }); await page.waitForTimeout(3000); await page.screenshot({ path: out + '/16-adv2.png' });
  await page.evaluate(() => { window.__xm.st.exp = null; window.__xm.showInvite(); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/17-invite.png' });
  await page.evaluate(() => window.__xm.closeModal());
  await page.evaluate(() => window.__xm.showDeath()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1900); await page.screenshot({ path: out + '/18-rebirth.png' });
  await page.click('.cand[data-i="0"]'); await page.click('.foot .btn.gold'); await page.waitForTimeout(800); await page.screenshot({ path: out + '/19-newlife.png' });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e.message); process.exit(1); });
