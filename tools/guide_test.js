// 新手引导流程测试：按真实玩家的点法走一遍，逐步截图
// node tools/guide_test.js <输出目录> [设备名|desktop]
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2]; const dev = process.argv[3] || 'Pixel 7';
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const opts = dev === 'desktop' ? { viewport: { width: 1280, height: 860 } } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  const shot = async n => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${n}.png` }); };
  const gtext = () => page.evaluate(() => document.getElementById('guide').hidden ? '(hidden)' : document.querySelector('#guide .gtext').textContent.slice(0, 40));
  const tick = () => page.evaluate(() => window.__xm.st.tick);
  const log = async n => console.log(n, '| t' + await tick(), '|', await gtext());
  await log('1'); await shot('g01-welcome');
  // 老祖说话时时间应当暂停
  const t0 = await tick(); await page.waitForTimeout(6000); const t1 = await tick();
  console.log('paused while talking:', t0 === t1 ? 'yes' : `NO (${t0}→${t1})`);
  await page.click('#guide [data-g="ok"]'); await log('2'); await shot('g02-stakes');
  // 锁住的入口
  await page.click('#guide [data-g="ok"]'); await log('3');
  await page.click('[data-nav="market"]'); await page.waitForTimeout(200); await log('3-lock'); await shot('g03-locked');
  await page.click('#guide [data-g="ok"]'); await log('3'); await shot('g04-expnav');
  await page.click('[data-nav="exp"]'); await log('4'); await shot('g05-exppick');
  await page.click('#modal .card[data-k="0"]'); await log('5'); await shot('g06-expgo');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(800); await log('6'); await shot('g07-speed');
  await page.click('#guide [data-g="ok"]'); await log('7');
  await page.evaluate(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); });
  await page.waitForTimeout(600); await shot('g08-expresult');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(500); await log('8'); await shot('g09-afterexp');
  await page.click('#guide [data-g="ok"]'); await log('9'); await shot('g10-homenav');
  await page.click('[data-nav="home"]'); await log('10'); await shot('g11-homearray');
  await page.click('#modal button[data-k="array"]'); await page.waitForTimeout(300);
  await page.click('#modal .close'); await log('11'); await shot('g12-loop');
  await page.click('#guide [data-g="ok"]'); await log('12');
  console.log('guide done:', await page.evaluate(() => window.__xm.st.guide.done));
  const dismiss = async () => { for (let i = 0; i < 4; i++) { const ok = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (!ok) break; await log('hint'); await ok.click(); await page.waitForTimeout(150); } };
  await page.evaluate(() => window.__xm.setSpeed(4)); await dismiss();
  await page.click('#stats [data-s="big"]'); await shot('g13-pact');
  await page.evaluate(() => document.querySelector('#modal .body').scrollTop = 600); await shot('g14-pact2');
  await page.evaluate(() => window.__xm.closeModal()); await dismiss();
  await page.click('#goal'); await shot('g15-goal');
  await page.evaluate(() => window.__xm.closeModal()); await dismiss();
  await page.click('#btnHelp'); await shot('g16-help');
  await page.evaluate(() => window.__xm.closeModal()); await dismiss();
  await page.click('#stats [data-s="atk"]'); await shot('g17-growth');
  await page.evaluate(() => window.__xm.closeModal());
  // 快进到三年之约前 6 周天，看老祖的提醒
  await page.evaluate(() => { const X = window.__xm; X.st.exp = null; X.st.year = 3 - 6 / 8 + 0.01; X.st.hintSeen.tuna = 1; X.st.hintSeen.market = 1; X.setSpeed(0); });
  await page.waitForTimeout(500); await log('soon'); await shot('g18-pactsoon');
  if (await page.$('#guide:not([hidden]) [data-g="ok"]')) await page.click('#guide [data-g="ok"]');
  await page.evaluate(() => { window.__xm.st.year = 3; window.__xm.onTick(); window.__xm.setSpeed(1); });
  await page.waitForTimeout(400); await shot('g19-pactduel');
  await page.waitForTimeout(1500); await shot('g20-pactres');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(500); await log('after'); await shot('g21-afterpact');
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})().catch(e => { console.error('FAIL', e.message.split('\n')[0]); process.exit(1); });
