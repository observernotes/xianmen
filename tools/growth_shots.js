// docs/KAIRO_PLAN.md §10「变强页重做」的示意图：node tools/growth_shots.js [输出目录=docs/kairo_mock]
// docs/kairo_mock/growth.html 里每个 .phone[id] 各截一张（g1_goal.png …），整页 g0_all.png；顺带查：没有小于 14px 的字、每张按钮 ≤ 6
const { chromium } = require('playwright'); const path = require('path');
const dir = path.join(__dirname, '..', 'docs', 'kairo_mock'), out = process.argv[2] || dir;
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1380, height: 900 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('file://' + path.join(dir, 'growth.html')); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(out, 'g0_all.png'), fullPage: true });
  for (const el of await p.$$('.phone[id]')) { const id = await el.getAttribute('id'); await el.screenshot({ path: path.join(out, id + '.png') }); }
  const m = await p.evaluate(() => [...document.querySelectorAll('.phone[id]')].map(ph => {
    const sh = ph.querySelector('.sheet'); let han = 0, small = 0;
    const w = document.createTreeWalker(sh, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { const el = n.parentElement; if (!n.textContent.trim()) continue; if (parseFloat(getComputedStyle(el).fontSize) < 13.9) small++; if (el.closest('.nm, .tabs, h2, .num, .btn, .n')) continue; han += (n.textContent.match(/[一-鿿]/g) || []).length; }
    const over = [...sh.children].some(c => c.getBoundingClientRect().bottom > sh.getBoundingClientRect().bottom + 1);
    return `${ph.id}: 汉字 ${han}/60 · 按钮 ${sh.querySelectorAll('.btn').length}/6 · 小字 ${small}${over ? ' · 溢出' : ''}`;
  }));
  console.log(m.join('\n')); console.log(errs.join('\n') || 'ok'); await b.close();
})();
