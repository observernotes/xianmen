// 角色精灵前后对比：node tools/hd2d_chars.js [输出目录=docs/hd2d_mock/chars] [only=sit,stand,...] [dsf=1|2] [z=8] [dump=组名:第几张] [x="A.mob('teng',0);…"]
//   dsf：截图的 deviceScaleFactor；z：原画放大倍数（2 倍密度稿放大 z/2）；dump：把某张 2 倍密度稿按字符网格打印出来（写补丁时对坐标用）
// 每个精灵一张图：左 = 原画（1 倍密度，放大 8 倍），右 = 场景里实际用的 2 倍密度版（放大 4 倍；有手工重画的用重画稿，否则是自动升密度 + 重新打光）。
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const args = process.argv.slice(2);
const opt = k => (args.find(a => a.startsWith(k + '=')) || '').slice(k.length + 1);
const dsf = +opt('dsf') || 1, Z = +opt('z') || 8, dump = opt('dump');
const out = args.find(a => !/^\w+=/.test(a)) || path.join(__dirname, '..', 'docs', 'hd2d_mock', 'chars');
const only = (args.find(a => a.startsWith('only=')) || '').slice(5).split(',').filter(Boolean);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: dsf })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?hd=2'); await page.waitForTimeout(600);
  const list = await page.evaluate(xs => {
    const A = window.ART, M = { hair: '#2a2230', skin: '#f2c9a0', f: 0, hero: 1 }, F = { hair: '#2a2230', skin: '#f6d2b0', f: 1 };
    const S = {
      sit_m: () => [A.sit(M, 0), A.sit(M, 3), A.sit(M, 8)], sit_f: () => [A.sit(F, 0), A.sit(F, 3), A.sit(F, 8)],
      stand_m: () => [A.standRealm(M, 0, 0), A.standRealm(M, 3, 1)], stand_f: () => [A.standRealm(F, 0, 0), A.standRealm(F, 3, 1)],
      fight_m: () => ['idle0', 'windup', 'strike', 'hit'].map(f => A.fighter('me', f, false)),
      elder: () => [A.elderSprite(0), A.elderSprite(1), A.portrait('elder', 'n'), A.portrait('elder', 'joy')],
      elder_sp: () => [A.elderSprite(0), A.elderSprite(1)],
      elder_p2: () => ['n', 'joy'].map(m => A.portrait('elder', m)), elder_p3: () => ['ang', 'shock', 'sad'].map(m => A.portrait('elder', m)),
      elder_t1: () => [A.tachie('elder', 'n')], elder_t2: () => [A.tachie('elder', 'joy'), A.tachie('elder', 'ang')], elder_t3: () => [A.tachie('elder', 'shock'), A.tachie('elder', 'sad'), A.tachie('elder', 'cold')],
      elder_pt: () => ['n', 'joy', 'ang', 'shock', 'sad'].map(m => A.portrait('elder', m)),
      elder_tachie: () => ['n', 'joy', 'ang'].map(m => A.tachie('elder', m)),
      elder_tachie2: () => ['shock', 'sad', 'cold'].map(m => A.tachie('elder', m)),
      pets_he: () => [A.petSprite('p_he', 0, 0), A.petSprite('p_he', 0, 1), A.petSprite('p_he', 1, 0), A.petSprite('p_he', 2, 0)],
      pets_hu2: () => [A.petSprite('p_hu2', 0, 0), A.petSprite('p_hu2', 0, 1), A.petSprite('p_hu2', 1, 0), A.petSprite('p_hu2', 2, 0)],
      pets_gui: () => [A.petSprite('p_gui', 0, 0), A.petSprite('p_gui', 0, 1), A.petSprite('p_gui', 1, 0), A.petSprite('p_gui', 2, 0)],
      pets_quad: () => [A.petSprite('p_tu', 0, 0), A.petSprite('p_hu', 0, 0), A.petSprite('p_xiong', 0, 0), A.petSprite('p_ze', 0, 0), A.petSprite('p_qilin', 0, 0), A.petSprite('p_hu', 3, 0)],
      pets_quad2: () => [A.petSprite('p_tu', 1, 0), A.petSprite('p_tu', 2, 0), A.petSprite('p_hu', 1, 0), A.petSprite('p_xiong', 1, 0), A.petSprite('p_ze', 1, 0), A.petSprite('p_ze', 2, 0)],
      pets_bird: () => [A.petSprite('p_que', 0, 0), A.petSprite('p_que', 1, 0), A.petSprite('p_que', 2, 0), A.petSprite('p_sun', 1, 0), A.petSprite('p_wu', 0, 0), A.petSprite('p_wu', 2, 0)],
      pets_other: () => [A.petSprite('p_fu', 0, 0), A.petSprite('p_fu', 1, 1), A.petSprite('p_jiao', 0, 0), A.petSprite('p_jiao', 1, 0), A.petSprite('p_he', 0, 0, 1)],
      wolf: () => [A.wolf(['#8a7a66', '#5f5244']), A.wolf(['#6a8f3a', '#3f5e22']), A.wolf(['#c85a2a', '#783619'])],
      mob_teng: () => [0, 1, 2].map(f => A.mob('teng', f)), mob_xiong: () => [0, 1, 2].map(f => A.mob('xiong', f)), mob_ya: () => [0, 1, 2].map(f => A.mob('ya', f)),
      mob_wa: () => [0, 1, 2].map(f => A.mob('wa', f)), mob_tang: () => [0, 1, 2].map(f => A.mob('tang', f)),
      fight6_m: () => [0, 1, 2, 3, 4, 5].map(f => A.fighter({ look: M, realm: 0 }, f, false)), fight6_f: () => [0, 1, 2, 3, 4, 5].map(f => A.fighter({ look: F, realm: 3 }, f, false)),
      fight6_flip: () => [0, 3, 5].map(f => A.fighter({ look: M, realm: 8 }, f, true)).concat([A.fighter('mu', 'idle0', true), A.fighter('zhao', 'strike', true), A.fighter('elder', 'idle0', false), A.fighter({ look: M, realm: 2 }, 'stand0')]),
      portraits: () => [A.portraitMe(M, 3, 'n'), A.portraitMe(F, 3, 'n'), A.portrait('mu', 'n'), A.portrait('su', 'n')],
      pets: () => [A.petSprite('p_he', 0, 0), A.petSprite('p_hu2', 0, 0), A.petSprite('p_gui', 0, 0), A.petSprite('p_tu', 0, 0)],
      foes: () => [A.wolf(['#8a7a66', '#5f5244']), A.foeMan(['#4a4a52', '#2c2c34'], 'hill'), A.foeMan(['#cfc8b0', '#8f876c'], 'tomb')].concat(A.mobIds.slice(0, 4).map(id => A.mob(id, 0))),
    };
    if (xs) S.x = () => xs.split(';').map(e => (0, eval)('(A => ' + e + ')')(A));   // x=表达式;表达式… 临时看几张（A = window.ART）
    window.__S = S; return Object.keys(S);
  }, opt('x'));
  for (const name of list.filter(n => !only.length || only.includes(n))) {
    const ok = await page.evaluate(([n, Z]) => {
      let cs; try { cs = window.__S[n]().filter(Boolean); } catch (e) { return 'ERR ' + e.message; }
      const H = Math.max(...cs.map(c => c.height)), W = cs.reduce((s, c) => s + c.width + 4, 0);
      const cv = document.createElement('canvas'); cv.id = 'chars'; cv.width = W * Z * 2 + 40; cv.height = H * Z + 44; cv.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;image-rendering:pixelated';
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
      const bg = (x, w, c1, c2) => { const gr = g.createLinearGradient(0, 0, 0, cv.height); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(x, 0, w, cv.height); };
      bg(0, W * Z + 20, '#6a7a9a', '#8a9a7a'); bg(W * Z + 20, W * Z + 20, '#6a7a9a', '#8a9a7a');
      g.fillStyle = '#fff'; g.font = '16px sans-serif'; g.fillText('原画 ×' + Z, 8, 20); g.fillText('2 倍密度 ×' + Z / 2 + (cs.some(c => c._hdNative && !c._buf) ? '（重画稿）' : cs.some(c => c._hdNative) ? '（细描边稿）' : '（自动）'), W * Z + 28, 20);
      let x = 10;
      for (const c of cs) { g.drawImage(c, x, 34, c.width * Z, c.height * Z); const u = window.HD2D.up(c); if (u) g.drawImage(u, W * Z + 20 + x, 34, u.width * Z / 2, u.height * Z / 2); x += (c.width + 4) * Z; }
      const old = document.getElementById('chars'); if (old && old !== cv) old.remove(); document.body.appendChild(cv); return 'ok';
    }, [name, Z]);
    if (ok !== 'ok') { console.log(name, ok); continue; }
    await (await page.$('#chars')).screenshot({ path: `${out}/${name}.png` });
    await page.evaluate(() => document.getElementById('chars').remove());
  }
  if (dump) {   // 2 倍密度稿（打光之前）的字符网格：每种颜色一个字母，表头列坐标
    const txt = await page.evaluate(([n, i]) => {
      const c = window.__S[n]()[+i || 0], u = c._hdNative ? c._hdNative() : window.HD2D.up(c), w = u.width, h = u.height, d = u.getContext('2d').getImageData(0, 0, w, h).data;
      const ks = new Map(), abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let o = '     ';
      for (let x = 0; x < w; x++) o += x % 10 ? (x % 5 ? ' ' : '+') : (x / 10) % 10; o += '\n';
      for (let y = 0; y < h; y++) { o += String(y).padStart(3) + '  '; for (let x = 0; x < w; x++) { const j = (y * w + x) * 4; if (d[j + 3] < 40) { o += '.'; continue; } const k = '#' + ((1 << 24) + (d[j] << 16) + (d[j + 1] << 8) + d[j + 2]).toString(16).slice(1); if (!ks.has(k)) ks.set(k, abc[ks.size % abc.length]); o += ks.get(k); } o += '\n'; }
      return o + [...ks].map(([k, v]) => v + '=' + k).join(' ');
    }, dump.split(':'));
    console.log(txt);
  }
  await b.close();
  console.log(errs.length ? 'errors: ' + errs.join('\n') : 'ok');
})();
