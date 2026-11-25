// 美术预览：node tools/preview.js <输出.png> [查询串]
// 默认渲染阶段二、三的新资产总览（阶段三：only=g1…g10）；查询串例：only=old（旧精灵与场景）、only=pt（只看半身像）、z=6（放大倍数）
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1900, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (m.type() === 'log') console.log(m.text()); });
  await p.goto('file://' + path.join(__dirname, 'preview.html') + (process.argv[3] ? '?' + process.argv[3] : '')); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2], fullPage: true }); console.log(errs.join('\n') || 'ok'); await b.close(); })();
