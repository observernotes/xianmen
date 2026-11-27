// HD-2D 帧耗时：node tools/hd2d_perf.js [节流倍数=4]
// Pixel 7 竖屏、CDP 的 CPU 节流（默认 4×），各画质档（?hd=0～3）在洞府 / 历练战斗两个画面各量 4 秒：
//   帧间隔的平均值 / 95 分位 / 超过 33ms 的帧占比，以及合成那一步（HD2D.present）自己的 JS 耗时。
// 注意：无头 Chromium 的 Canvas 2D 是软件光栅化（没有 GPU），这里的数字比真机悲观，用来比较各档之间的相对开销和把住下限。
const { chromium, devices } = require('playwright');
const path = require('path');
const rate = parseFloat(process.argv[2]) || 4;
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const hd of [0, 1, 1.5, 2, 3]) {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] }), page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(url + '?hd=' + hd); await page.waitForTimeout(400);
    for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
    await page.click('#goStart'); await page.waitForTimeout(1200);
    await page.evaluate(() => { const X = window.__xm, st = X.st, L = X.L; L.onbAll(st); st.guide = { step: 99, done: true }; st.storyQ = []; st.p.r = 3; st.home = Object.assign(st.home || {}, { cave: 4, array: 9 }); X.setSpeed(0); });
    for (let i = 0; i < 3; i++) { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(300); }
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const measure = () => page.evaluate(() => new Promise(res => {
      const ts = []; let t0 = performance.now(), last = t0;
      const f = now => { ts.push(now - last); last = now; if (now - t0 < 4000) requestAnimationFrame(f); else { ts.shift(); ts.sort((a, b) => a - b); const avg = ts.reduce((a, b) => a + b, 0) / ts.length; res({ n: ts.length, avg, p95: ts[Math.floor(ts.length * 0.95)], slow: ts.filter(x => x > 33.4).length / ts.length, ms: window.HD2D ? window.HD2D.stats.ms : 0, q: window.HD2D ? window.HD2D.q : 0, size: (() => { const c = document.getElementById('sceneHD'); return c && c.style.display !== 'none' ? c.width + '×' + c.height : '200 宽原画布'; })() }); } };
      requestAnimationFrame(f);
    }));
    await page.waitForTimeout(800);
    const home = await measure();
    await page.evaluate(() => { const { st, L } = window.__xm; st.exp = null; st.p.inj = 0; L.startExp(st, 0, 0, 0); });
    await page.waitForTimeout(1500);
    const bat = await measure();
    rows.push({ hd, home, bat, errs });
    await ctx.close();
  }
  await browser.close();
  const f = v => v.toFixed(1).padStart(6);
  console.log(`CPU 节流 ${rate}×，Pixel 7（412×915，dpr 2.625），无头 Chromium 软件光栅`);
  console.log('档  合成画布        | 洞府：均值  p95  >33ms  合成JS | 战斗：均值  p95  >33ms  合成JS');
  for (const r of rows) console.log(`${String(r.hd).padEnd(3)} ${String(r.home.size).padEnd(14)} | ${f(r.home.avg)} ${f(r.home.p95)} ${(r.home.slow * 100).toFixed(0).padStart(4)}% ${f(r.home.ms)} | ${f(r.bat.avg)} ${f(r.bat.p95)} ${(r.bat.slow * 100).toFixed(0).padStart(4)}% ${f(r.bat.ms)}${r.errs.length ? '  错误：' + r.errs[0] : ''}`);
  if (rows.some(r => r.errs.length)) process.exitCode = 1;
})();
