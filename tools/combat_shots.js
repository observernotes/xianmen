// docs/COMBAT_LOOT.md 的示意图与美术预览：node tools/combat_shots.js [输出目录=docs/combat_mock]
// art_preview.html → art_preview.png；mock.html 里每个 .phone[id] 各截一张（01_prep.png …），整页 00_all.png
const { chromium } = require('playwright'); const path = require('path');
const dir = path.join(__dirname, '..', 'docs', 'combat_mock'), out = process.argv[2] || dir;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1540, height: 1000 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(dir, 'art_preview.html')); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, 'art_preview.png'), fullPage: true });
  if (require('fs').existsSync(path.join(dir, 'mock.html'))) {
    await p.setViewportSize({ width: 2760, height: 1000 });
    await p.goto('file://' + path.join(dir, 'mock.html')); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, '00_all.png'), fullPage: true });
    for (const el of await p.$$('.phone[id]')) { const id = await el.getAttribute('id'); await el.screenshot({ path: path.join(out, id + '.png') }); }
  }
  console.log(errs.join('\n') || 'ok'); await b.close();
})();
