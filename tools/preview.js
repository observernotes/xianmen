const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1900, height: 1200 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(__dirname, 'preview.html')); await p.waitForTimeout(500);
  await p.screenshot({ path: process.argv[2], fullPage: true }); console.log(errs.join('\n') || 'ok'); await b.close(); })();
