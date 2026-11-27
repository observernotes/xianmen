// HD-2D 冒烟测试：node tools/hd2d_smoke.js
// 自动化下默认不开高清（见 src/fx/hd2d.js 的 defaultQ），这里用 ?hd=2 显式打开，把接管 / 分层 / 换档 / 各场景都走一遍：
//   接管后界面看到的画布仍是 200×H；呈现画布在、有画面；洞府 → 历练战斗 → 对决 → 秘境 → 对话都不报错；
//   运行时换档 2 → 0 → 1 → 3 → 2，0 档时画布还原成 200 宽；九宫格是 SVG；版面不横向溢出。
const { chromium, devices } = require('playwright');
const path = require('path');
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?hd=2'); await page.waitForTimeout(400);
  for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(1500);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => { const X = window.__xm, st = X.st, L = X.L; L.onbAll(st); st.guide = { step: 99, done: true }; st.storyQ = []; st.p.r = 3; X.setSpeed(0); });
  const close = async () => { for (let i = 0; i < 4; i++) { await ev(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(250); } };
  await close();
  const info = () => ev(() => {
    const c = document.getElementById('scene'), p = document.getElementById('sceneHD'), H = window.HD2D;
    let lit = 0; if (p && p.width > 8) { const g = document.createElement('canvas'); g.width = 40; g.height = 40; const x = g.getContext('2d'); x.drawImage(p, 0, 0, 40, 40); const d = x.getImageData(0, 0, 40, 40).data; const set = new Set(); for (let i = 0; i < d.length; i += 16) set.add((d[i] >> 3) + '|' + (d[i + 1] >> 3) + '|' + (d[i + 2] >> 3)); lit = set.size; }
    return { on: H.on, q: H.q, logicH: c.height, realW: Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get.call(c), pw: p ? p.width : 0, shown: !!p && p.style.display !== 'none', colors: lit, kind: H.F.kind + ':' + H.F.key, age: H.F.age, over: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  await page.waitForTimeout(800);
  let s = await info();
  check(s.on && s.q === 2, `接管：on=${s.on} q=${s.q}`);
  check(s.logicH >= 160 && s.logicH <= 250 && s.realW === 400, `界面看到的高 ${s.logicH}（逻辑值），后备宽 ${s.realW}`);
  check(s.shown && s.pw === 400 && s.colors > 20, `呈现画布 ${s.pw} 宽，有画面（${s.colors} 种颜色）`);
  check(s.kind === 'home:home' && s.age <= 4, `洞府在分层画（${s.kind}）`);
  check(!s.over, '不横向溢出');
  check(await ev(() => /^data:image\/svg/.test(window.__xm.ART.frame('hud').url) && document.body.classList.contains('hd2d')), '九宫格是 SVG，皮肤已挂');
  for (const ph of [0.3, 0.5, 0.72, 0.95]) { await ev(p => { window.HD2D.debugPhase = p; }, ph); await page.waitForTimeout(350); }
  check(!errs.length, '昼夜各相位无报错');
  await ev(() => { const { st, L } = window.__xm; st.exp = null; st.p.inj = 0; L.startExp(st, 0, 0, 0); }); await page.waitForTimeout(2200);
  s = await info(); check(s.kind === 'adv:forest' && s.colors > 20, `历练战斗（${s.kind}，${s.colors} 色）`);
  for (const k of ['forest', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos']) { await ev(k2 => { const X = window.__xm, c = document.getElementById('scene').getContext('2d'); X.ART.setCtx(c, 200); X.ART.drawAdventure(k2, performance.now(), 0, 30); window.HD2D.present(performance.now()); }, k); }
  check(!errs.length, '十张历练地图都能分层合成');
  for (const k of ['town', 'cloud', 'sect', 'wild', 'sect_mo', 'r_jin', 'r_mu', 'r_huo', 'r_shui']) { await ev(k2 => { const X = window.__xm; X.ART.drawDuelStage(k2, performance.now(), 0); window.HD2D.present(performance.now()); }, k); }
  check(!errs.length, '九个对决舞台 / 秘境都能合成');
  await ev(() => { const { st } = window.__xm; st.exp = null; }); await page.waitForTimeout(600); await close();
  for (const q of [0, 1, 3, 2]) {
    await ev(q2 => window.HD2D.setQuality(q2), q); await page.waitForTimeout(700); s = await info();
    if (q === 0) check(!s.on && s.realW === 200 && !s.shown, `0 档：还原成原画布（宽 ${s.realW}）`);
    else check(s.on && s.realW === 400 && s.shown && s.colors > 20 && (q === 3 ? s.pw > 800 : s.pw === 400), `${q} 档：呈现画布 ${s.pw} 宽，${s.colors} 色`);
  }
  // ---------- 硬边检查：合成出来的画面里不许有“原画面没有的长直线亮度断层”（图层被矩形裁掉、缓冲没铺满之类） ----------
  // 每个画面先取 0 档（原画面）的直线边缘当参照，再取各档合成结果；多出来的长直边（横 ≥ 44、竖 ≥ 36 个逻辑像素）算失败
  const grab = (q, map) => ev(([q2, map2]) => new Promise(res => {
    const H = window.HD2D, X = window.__xm, cv = document.getElementById('scene');
    H.setQuality(q2);
    const read = () => {
      const src = H.on ? document.getElementById('sceneHD') : cv, w = 200, h = cv.height, t = document.createElement('canvas'); t.width = w; t.height = h;
      const g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h); for (let i = 0; i < w * h; i++) L[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
      const out = [], TH = q2 === 0 ? 3 : 7, MH = q2 === 0 ? 5 : 20, MV = q2 === 0 ? 5 : 18;   // 参照用更低的阈值：原画面里本来就有、只是被调色加深了的边不算
      for (let y = 1; y < h - 1; y++) { let run = 0, sg = 0; for (let x = 0; x <= w; x++) { const dv = x < w ? L[(y + 1) * w + x] - L[y * w + x] : 0, s2 = Math.abs(dv) > TH ? Math.sign(dv) : 0; if (s2 && s2 === sg) run++; else { if (run >= MH) out.push(['h', y, x - run, x, sg]); run = s2 ? 1 : 0; sg = s2; } } }
      for (let x = 1; x < w - 1; x++) { let run = 0, sg = 0; for (let y = 0; y <= h; y++) { const dv = y < h ? L[y * w + x + 1] - L[y * w + x] : 0, s2 = Math.abs(dv) > TH ? Math.sign(dv) : 0; if (s2 && s2 === sg) run++; else { if (run >= MV) out.push(['v', x, y - run, y, sg]); run = s2 ? 1 : 0; sg = s2; } } }
      res(out);
    };
    if (map2) { const c = cv.getContext('2d'); X.ART.setCtx(c, 200); const OY = cv.height - 160; c.setTransform(1, 0, 0, 1, 0, OY); if (map2[0] === 'adv') X.ART.drawAdventure(map2[1], 5000, OY, 30); else X.ART.drawDuelStage(map2[1], 5000, OY); if (H.on) H.present(5000); read(); }
    else setTimeout(read, 450);
  }), [q, map]);
  // 一条边算“原画面里就有”：它的跨度有六成以上被参照里相邻 ±3 行（列）的短边盖住（原画的边常被抖动打成碎段）
  // 细线（光柱、雨丝：几像素内紧跟着一条反号的边）不是裁切边，不算；只看够长的（横 ≥ 44、竖 ≥ 36）
  const thin = (e, cur) => cur.some(o => o[0] === e[0] && o[4] === -e[4] && Math.abs(o[1] - e[1]) <= 5 && Math.min(o[3], e[3]) - Math.max(o[2], e[2]) >= (e[3] - e[2]) * 0.5);
  const extra = (ref, cur) => cur.filter(e => e[3] - e[2] >= (e[0] === 'h' ? 44 : 36) && !thin(e, cur)).filter(e => { const n = e[3] - e[2], cov = new Uint8Array(n); for (const r of ref) if (r[0] === e[0] && Math.abs(r[1] - e[1]) <= 3) for (let k = Math.max(r[2], e[2]); k < Math.min(r[3], e[3]); k++) cov[k - e[2]] = 1; let c = 0; for (let k = 0; k < n; k++) c += cov[k]; return c < n * 0.6; });
  const TIERS = [1, 1.5, 2, 3], bad = [];
  await ev(() => { window.__xm.setSpeed(window.__xm.pauseIdx === undefined ? 3 : window.__xm.pauseIdx); });
  for (const ph of [0.45, 0.69, 0.95]) {
    await ev(p => { window.HD2D.debugPhase = p; }, ph); const ref = await grab(0, null);
    for (const q of TIERS) { const ex = extra(ref, await grab(q, null)); if (ex.length) bad.push(`洞府 相位 ${ph} ${q} 档：${ex.slice(0, 3).map(e => e.join(',')).join(' / ')}`); }
  }
  await ev(() => { window.HD2D.selfLoop = false; });   // 下面直接调美术函数画地图，不让界面那一帧（洞府）盖回来
  for (const m of ['forest', 'hill', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos'].map(k => ['adv', k]).concat(['town', 'cloud', 'sect', 'wild', 'sect_mo', 'r_jin', 'r_mu', 'r_huo', 'r_shui'].map(k => ['duel', k]))) {
    const ref = await grab(0, m);
    for (const q of TIERS) { const fy = 128 + (await ev(() => document.getElementById('scene').height)) - 160, ex = extra(ref, await grab(q, m)).filter(e => !(e[0] === 'h' && Math.abs(e[1] - fy) <= 2));   /* 脚线上那条横边是清晰的地面压在虚化的中景上，景深本来就该有 */ if (ex.length) bad.push(`${m.join(':')} ${q} 档：${ex.slice(0, 3).map(e => e.join(',')).join(' / ')}`); }
  }
  await ev(() => { window.HD2D.selfLoop = true; window.HD2D.setQuality(2); });
  for (const b2 of bad) console.log('         · ' + b2);
  check(!bad.length, `各档各场景没有多出来的长直硬边（洞府三个时刻 + 10 张地图 + 9 个舞台 × 4 档；多出 ${bad.length} 处）`);
  await ev(() => { window.__xm_talk.fast = false; window.__xm_cine.fast = true; window.__xm.setSpeed(1); window.__xm_talk.play('s1_night'); }); await page.waitForTimeout(1500);
  check(await ev(() => !!document.querySelector('.tk-stage .hd-fx') && document.querySelector('.tk-stage .hd-fx').width > 8), '对话舞台挂上了气氛层');
  for (let i = 0; i < 10; i++) { await ev(() => { window.__xm_talk.tap(); window.__xm_talk.tap(); }); await page.waitForTimeout(300); if (await ev(() => !!document.querySelector('.tk-pt.on:not([hidden])'))) break; }
  await page.waitForTimeout(600);
  const pt = await ev(() => { const c = document.querySelector('.tk-pt.on:not([hidden])'); return c ? { w: c.width, cssW: parseFloat(c.style.width) } : null; });
  check(!pt || pt.w >= 96, `立绘画布升了 2 倍（${pt ? pt.w + ' 像素宽，显示 ' + pt.cssW.toFixed(0) + 'px' : '这一场没有立绘'}）`);
  await ev(() => window.__xm_talk.close()); await page.waitForTimeout(500);
  check(await ev(() => !document.querySelector('.hd-fx')), '对话收场后气氛层撤掉');
  check(!errs.length, '无报错' + (errs.length ? '：' + errs[0] : ''));
  await browser.close();
  console.log(fails.length ? `\n${fails.length} 项没过` : '\n全部通过');
  process.exit(fails.length ? 1 : 0);
})();
