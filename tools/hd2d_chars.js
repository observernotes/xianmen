// 角色精灵前后对比：node tools/hd2d_chars.js [输出目录=docs/hd2d_mock/chars] [only=sit,stand,...]
// 每个精灵一张图：左 = 原画（1 倍密度，放大 8 倍），右 = 场景里实际用的 2 倍密度版（放大 4 倍；有手工重画的用重画稿，否则是自动升密度 + 重新打光）。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const out = args.find(a => !/^\w+=/.test(a)) || path.join(__dirname, '..', 'docs', 'hd2d_mock', 'chars');
const only = (args.find(a => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?hd=2'); await page.waitForTimeout(600);
  const list = await page.evaluate(() => {
    const A = window.ART, M = { hair: '#2a2230', skin: '#f2c9a0', f: 0, hero: 1 }, F = { hair: '#2a2230', skin: '#f6d2b0', f: 1 };
    const S = {
      sit_m: () => [A.sit(M, 0), A.sit(M, 3), A.sit(M, 8)], sit_f: () => [A.sit(F, 0), A.sit(F, 3), A.sit(F, 8)],
      stand_m: () => [A.standRealm(M, 0, 0), A.standRealm(M, 3, 1)], stand_f: () => [A.standRealm(F, 0, 0), A.standRealm(F, 3, 1)],
      fight_m: () => ['idle0', 'windup', 'strike', 'hit'].map(f => A.fighter('me', f, false)),
      elder: () => [A.elderSprite(0), A.elderSprite(1), A.portrait('elder', 'n'), A.portrait('elder', 'joy')],
      portraits: () => [A.portraitMe(M, 3, 'n'), A.portraitMe(F, 3, 'n'), A.portrait('mu', 'n'), A.portrait('su', 'n')],
      pets: () => [A.petSprite('p_he', 0, 0), A.petSprite('p_hu2', 0, 0), A.petSprite('p_gui', 0, 0), A.petSprite('p_tu', 0, 0)],
      foes: () => [A.wolf(['#8a7a66', '#5f5244']), A.foeMan(['#4a4a52', '#2c2c34'], 'hill'), A.foeMan(['#cfc8b0', '#8f876c'], 'tomb')].concat(A.mobIds.slice(0, 4).map(id => A.mob(id, 0))),
    };
    window.__S = S; return Object.keys(S);
  });
  for (const name of list.filter(n => !only.length || only.includes(n))) {
    const ok = await page.evaluate(n => {
      let cs; try { cs = window.__S[n]().filter(Boolean); } catch (e) { return 'ERR ' + e.message; }
      const H = Math.max(...cs.map(c => c.height)), W = cs.reduce((s, c) => s + c.width + 4, 0);
      const cv = document.createElement('canvas'); cv.id = 'chars'; cv.width = W * 8 * 2 + 40; cv.height = H * 8 + 44; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;image-rendering:pixelated';
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      const bg = (x, w, c1, c2) => { const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(x, 0, w, cv.height); };
      bg(0, W * 8 + 20, '#6a7a9a', '#8a9a7a'); bg(W * 8 + 20, W * 8 + 20, '#6a7a9a', '#8a9a7a');
      g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('原画 ×8', 8, 20); g.fillText('2 倍密度 ×4' + (cs.some(c => c._hdNative && !c._buf) ? '（重画稿）' : cs.some(c => c._hdNative) ? '（细描边稿）' : '（自动）'), W * 8 + 28, 20);
      let x = 10;
      for (const c of cs) { g.drawImage(c, x, 34, c.width * 8, c.height * 8); const u = window.HD2D.up(c); if (u) g.drawImage(u, W * 8 + 20 + x, 34, u.width * 4, u.height * 4); x += (c.width + 4) * 8; }
      const old = document.getElementById('chars'); if (old && old !== cv) old.remove(); document.body.appendChild(cv); return 'ok';
    }, name);
    if (ok !== 'ok') { console.log(name, ok); continue; }
    await (await page.$('#chars')).screenshot({ path: `${out}/${name}.png` });
    await page.evaluate(() => document.getElementById('chars').remove());
  }
  await b.close();
  console.log(errs.length ? 'errors: ' + errs.join('\n') : 'ok');
})();
