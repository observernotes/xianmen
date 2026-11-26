// docs/STORY_PLAN.md 的美术预览与对话场景示意：node tools/story_shots.js [输出目录=docs/story_mock]
// art_preview.html → art_preview.png（整页）与 art_bg / art_cg / art_end / art_px / art_ui 分块；mock.html（有的话）里每个 .phone[id] 各截一张
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const dir = path.join(__dirname, '..', 'docs', 'story_mock'), out = process.argv[2] || dir;
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1740, height: 1000 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const url = 'file://' + path.join(dir, 'art_preview.html');
  await p.goto(url); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, 'art_preview.png'), fullPage: true });
  for (const k of ['bg', 'cg', 'end', 'px', 'ui']) { await p.goto(url + '?only=' + k); await p.waitForTimeout(300); await p.screenshot({ path: path.join(out, 'art_' + k + '.png'), fullPage: true }); }
  if (fs.existsSync(path.join(dir, 'mock.html'))) {
    await p.setViewportSize({ width: 1700, height: 1000 });
    await p.goto('file://' + path.join(dir, 'mock.html')); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, '00_all.png'), fullPage: true });
    for (const el of await p.$$('.phone[id]')) { const id = await el.getAttribute('id'); await el.screenshot({ path: path.join(out, id + '.png') }); }
  }
  console.log(errs.join('\n') || 'ok'); await b.close();
})();
