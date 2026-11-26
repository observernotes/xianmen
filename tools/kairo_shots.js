// 开罗式重整（docs/KAIRO_PLAN.md）前后对照截图：node tools/kairo_shots.js <输出目录> ["Pixel 7"|360]
// 依次截：开局主画面、历练出发、第一张结算卡、回洞府、第一章中段主画面、装备（旧版：人物）面板、仙途路径、历练途中、年报
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2]; const dev = process.argv[3] || 'Pixel 7';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(900);
  const ev = (fn, a) => page.evaluate(fn, a);
  const shot = async n => { await page.waitForTimeout(400); await page.screenshot({ path: `${out}/${n}.png` }); };
  const closeAll = async () => { for (let i = 0; i < 6; i++) { await ev(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450); } };
  await ev(() => { const X = window.__xm; X.setSpeed(X.pauseIdx !== undefined ? X.pauseIdx : 3); });
  await shot('k01-start');
  await ev(() => window.__xm.showExp()); await page.waitForTimeout(200);
  await page.click('#modal .card[data-k="0"]').catch(() => {}); await shot('k02-exp');
  await ev(() => { const X = window.__xm; X.closeModal(); if (!X.st.exp) X.L.startExp(X.st, 0, 0, 0); X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); });
  await page.waitForTimeout(900); await shot('k03-result');
  await closeAll(); await shot('k04-after');
  // 第一章中段：第 21 月，炼气后期，聚灵阵 2 级
  await ev(() => { const X = window.__xm, { st, L } = X; st.tick = 21; st.stones = 627; st.pills = 1; st.p.s = 2; st.p.xp = L.pNeed(st.p) * 0.6; st.home.array = Math.max(2, st.home.array); st.stats.exp = Math.max(4, st.stats.exp); L.onbStep(st); L.onbStep(st); });
  await ev(() => { const X = window.__xm; X.st.guide.done = true; X.st.guide.step = 9; });
  await closeAll(); await shot('k05-main-mid');
  await ev(() => { const X = window.__xm; if (X.showEquip) X.showEquip(); else X.showMe(); }); await shot('k06-gear');
  await ev(() => { const X = window.__xm; X.closeModal(); if (X.showPath) X.showPath(); else X.showQuests(); }); await shot('k07-path');
  await closeAll();
  await ev(() => { const X = window.__xm; X.L.startExp(X.st, 0, 0, 0); });
  await page.waitForTimeout(300); await shot('k08-travel');
  await ev(() => { const X = window.__xm; if (X.showYearReport) X.showYearReport(); });
  await shot('k09-year');
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
