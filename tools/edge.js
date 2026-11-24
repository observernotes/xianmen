// 针对性测试：奇遇弹窗、飞升演出、转世
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(300);
  for (let i = 0; i < 8; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
  await page.click('#goStart'); await page.waitForTimeout(300);
  // 奇遇：戒中老祖
  await page.evaluate(() => { const X = window.__xm; X.showEvent({ kind: 'ring', d: X.st.ds[0], text: X.st.ds[0].name + '捡到一枚生锈的戒指……“小友，老夫在此等候三千年了。”戒中老祖传下《混元道经》！', big: true }); });
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/31-ring.png' });
  await page.click('#modal .foot .btn'); await page.waitForTimeout(200);
  // 散修拜山
  await page.evaluate(() => { const X = window.__xm; X.showEvent({ kind: 'wander', cand: X.L.newDisciple(X.st, 5), big: true }); });
  await page.waitForTimeout(800); await page.screenshot({ path: out + '/32-wander.png' });
  await page.click('#modal .cand'); await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(200);
  // 飞升
  await page.evaluate(() => { const X = window.__xm, L = X.L, d = X.st.ds[0]; d.r = 8; d.s = 3; d.xp = L.dNeed(d); X.st.pills = 5; d.fails = 8; X.showBreakthrough(d); });
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/33-ascend-pre.png' });
  await page.click('#modal .foot .btn.gold');
  await page.waitForTimeout(3600); await page.screenshot({ path: out + '/34-ascend-trib.png' });
  await page.waitForTimeout(2600); await page.screenshot({ path: out + '/35-ascend-pillar.png' });
  await page.waitForTimeout(2500); await page.screenshot({ path: out + '/36-ascend-res.png' });
  // 转世
  await page.click('#modal .foot .btn.alt'); await page.waitForTimeout(200);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/37-rebirth.png' });
  await page.click('#goStart'); await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ rebirth: window.__xm.st.rebirth, stones: window.__xm.st.stones, ds: window.__xm.st.ds.length }));
  console.log(JSON.stringify(r));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
