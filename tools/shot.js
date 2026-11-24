// 冒烟测试 + 截图：node tools/shot.js [outdir]
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(800);
  await page.screenshot({ path: out + '/01-intro.png' });
  for (let i = 0; i < 6; i++) { await page.click('#intro .story'); await page.waitForTimeout(250); if (await page.$('#goStart')) break; }
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/02-setup.png' });
  await page.click('#goStart');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out + '/03-start.png' });
  // 收徒
  await page.click('[data-nav="recruit"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/04-recruit.png' });
  await page.click('.foot .btn.gold');
  await page.waitForTimeout(1900);
  await page.click('.cand[data-i="1"]');
  await page.waitForTimeout(200);
  await page.screenshot({ path: out + '/05-cands.png' });
  await page.click('.foot [data-fi="1"]');
  await page.waitForTimeout(500);
  // 造一个中期局面
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.stones = 5e5; st.rep = 2000; st.pills = 3;
    st.b = { gate: 5, array: 9, mine: 8, library: 8, alchemy: 4 };
    for (let i = 0; i < 6; i++) { const d = L.newDisciple(st, L.rollTalent(st)); d.slot = i + 2; d.r = i % 6; d.s = i % 4; st.ds.push(d); }
    st.ds[0].r = 3; st.ds[0].s = 3; st.ds[0].xp = L.dNeed(st.ds[0]); st.ds[0].t = 6;
    st.ds[2].inj = 3;
    st.month = 4;
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/06-mid.png' });
  await page.click('[data-nav="disciples"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/07-disciples.png' });
  await page.click('.card[data-id="1"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/08-detail.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/09-bt.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(2100);
  await page.screenshot({ path: out + '/10-trib.png' });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: out + '/11-btres.png' });
  await page.click('.foot .btn'); await page.waitForTimeout(300);
  await page.click('[data-nav="dungeon"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/12-dungeon.png' });
  await page.click('.card[data-k="3"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/13-team.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(700);
  await page.screenshot({ path: out + '/14-leave.png' });
  await page.click('[data-nav="build"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/15-build.png' });
  await page.click('.sheet .close'); await page.waitForTimeout(200);
  await page.click('[data-nav="sect"]'); await page.waitForTimeout(300);
  await page.screenshot({ path: out + '/16-sect.png' });
  await page.click('.sheet .close'); await page.waitForTimeout(200);
  // 大比
  await page.evaluate(() => { window.__xm.st.month = 12; window.__xm.onMonth(); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out + '/17-tour0.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(1500);
  await page.screenshot({ path: out + '/18-tour1.png' });
  // 推进一段时间（4 倍速）
  await page.click('.foot .btn'); await page.waitForTimeout(1300);
  for (let i = 0; i < 3; i++) { if (await page.$('#modal:not([hidden]) .foot .btn:not([disabled])')) { await page.click('#modal .foot .btn:not([disabled]) >> nth=-1'); await page.waitForTimeout(1400); } }
  await page.evaluate(() => window.__xm.setSpeed(2));
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(600);
    const btn = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])');
    if (btn) await page.click('#modal .foot .btn:not([disabled]) >> nth=-1').catch(() => {});
  }
  await page.screenshot({ path: out + '/19-later.png' });
  // 小屏手机
  const p3 = await (await browser.newContext({ ...devices['iPhone SE'] })).newPage();
  p3.on('pageerror', e => errors.push('se pageerror: ' + e.message));
  await p3.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p3.waitForTimeout(500);
  for (let i = 0; i < 6; i++) { await p3.click('#intro .story'); await p3.waitForTimeout(250); if (await p3.$('#goStart')) break; }
  await p3.click('#goStart'); await p3.waitForTimeout(800);
  await p3.screenshot({ path: out + '/21-se.png' });
  // 桌面尺寸
  const p2 = await (await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 })).newPage();
  p2.on('pageerror', e => errors.push('desktop pageerror: ' + e.message));
  await p2.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await p2.waitForTimeout(600);
  for (let i = 0; i < 6; i++) { await p2.click('#intro .story'); await p2.waitForTimeout(250); if (await p2.$('#goStart')) break; }
  await p2.click('#goStart'); await p2.waitForTimeout(800);
  await p2.evaluate(() => { const { st, L } = window.__xm; st.b = { gate: 8, array: 22, mine: 12, library: 18, alchemy: 6 }; for (let i = 0; i < 9; i++) { const d = L.newDisciple(st, 3 + (i % 4)); d.slot = i + 1; d.r = 2 + (i % 7); st.ds.push(d); } st.month = 11; });
  await p2.waitForTimeout(1500);
  await p2.screenshot({ path: out + '/20-desktop.png' });
  console.log(errors.length ? errors.join('\n') : 'no console errors');
  await browser.close();
})().catch(e => { console.error('TEST FAIL', e); process.exit(1); });
