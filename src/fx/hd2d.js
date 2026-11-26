/* 废柴仙途 · HD-2D 渲染模块（docs/ART_HD2D.md）
 * 像素画照旧由 src/art.js 逐像素生成；这里负责“次时代”的那一半：
 *   分层合成（天 / 远 / 中 / 地 / 人物 / 前景）、景深、动态光源与辉光、体积光、接触阴影与倒影、轮廓光、
 *   高清粒子、电影调色、暗角、颗粒、色差、缓慢的镜头摇移；人物精灵自动升到 2 倍像素密度。
 * 全部是 Canvas 2D（不依赖 WebGL），四档画质 0 关 / 1 省 / 2 标准 / 3 极致，掉帧时自动降档。
 * 接线方式：ART.setCtx(ctx) 发现画布是 #scene 时自动接管——界面代码一行不用改；关掉（HD2D.setQuality(0)）就是原来的画面。
 */
(function (root) {
'use strict';
const HD = {};
root.HD2D = HD;
const S = 2;                 // 人物层 / 图层的像素密度：每个逻辑像素 2×2 个“高清像素”
HD.S = S;
HD.q = 0;                    // 当前画质档
HD.on = false;               // 已接管场景画布
HD.auto = true;              // 掉帧自动降档
HD.selfLoop = true;          // 模块自己每帧合成；界面主循环显式调 HD2D.present(now) 时设成 false
HD.half = false;             // 合成隔帧做（30 帧）：降档之前先试这个
HD.ctx = null;               // 场景画布的 2d 上下文（= 人物层）
HD.minQ = 0;                 // 自动降档的下限（0 = 实在带不动就退回原画面）
HD.stats = { ms: 0, frame: 16.7, drops: 0, q: 0 };
const doc = root.document;
function mkc(w, h) { const c = doc.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
function g2(c, smooth) { const g = c.getContext('2d'); g.imageSmoothingEnabled = !!smooth; return g; }
function hexA(c, a) { const n = parseInt(c.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function mix(a, b, t) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16); const f = (s) => Math.round(((A >> s) & 255) + (((B >> s) & 255) - ((A >> s) & 255)) * t); return '#' + ((1 << 24) + (f(16) << 16) + (f(8) << 8) + f(0)).toString(16).slice(1); }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function hash(i) { let t = (i * 2654435761) >>> 0; t ^= t >>> 15; t = Math.imul(t, 0x2c1b3c6d); t ^= t >>> 12; return (t >>> 0) / 4294967296; }

// ---------- 画质档 ----------
function readPref() {
  let v = null;
  try { const m = /[?&]hd=(\w+)/.exec(root.location.search); if (m) v = m[1]; else v = root.localStorage.getItem('xm_hd'); } catch (e) { v = null; }
  return v;
}
function defaultQ() {
  const nav = root.navigator || {}, cores = nav.hardwareConcurrency || 4, mem = nav.deviceMemory || 4;
  if (cores <= 2 || mem <= 1) return 1;
  if (nav.webdriver) return 0;   // 自动化测试（无头浏览器没有 GPU，多出来的每帧开销会挪动那些按毫秒掐点的用例）：默认不开；测高清用 ?hd=1～3（tools/hd2d_*.js）
  return 2;
}
(function initPref() {
  const v = readPref();
  if (v === null || v === undefined || v === 'auto') { HD.q = defaultQ(); HD.auto = true; }
  else { HD.q = clamp(parseInt(v, 10) || 0, 0, 3); HD.auto = false; }
})();
HD.setQuality = function (q, keep) {
  if (q === 'auto') { HD.auto = true; q = defaultQ(); } else { q = clamp(q | 0, 0, 3); if (!keep) HD.auto = false; }
  if (!keep) { try { root.localStorage.setItem('xm_hd', HD.auto ? 'auto' : String(q)); } catch (e) { /* 无存储 */ } }
  const was = HD.q; HD.q = q; HD.stats.q = q;
  if (main) { if (q > 0 && !HD.on) enable(); else if (q === 0 && HD.on) disable(); else if (was !== q) sizePresent(true); }
  if (HD.onQuality) HD.onQuality(q);
  return q;
};
HD.opts = { dof: true, bloom: true, rays: true, parts: true, grade: true, cam: true, rim: true, shadow: true, upres: true, skin: true, ca: false };   // 单项开关（调试 / 降级）

// ---------- 精灵升 2 倍密度：Scale2x（EPX）+ 缓存 ----------
const upCache = new WeakMap();
function scale2x(src, shade) {
  const w = src.width, h = src.height;
  let sd; try { sd = src.getContext('2d').getImageData(0, 0, w, h); } catch (e) { return null; }
  const s = new Uint32Array(sd.data.buffer);
  for (let i = 0; i < s.length; i++) if ((s[i] >>> 24) < 8) s[i] = 0;
  const out = mkc(w * 2, h * 2), og = out.getContext('2d'), od = og.createImageData(w * 2, h * 2), o = new Uint32Array(od.data.buffer), W2 = w * 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, P = s[i];
    const A = y > 0 ? s[i - w] : P, D = y < h - 1 ? s[i + w] : P, C = x > 0 ? s[i - 1] : P, B = x < w - 1 ? s[i + 1] : P;
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (A !== D && C !== B) { if (C === A) e0 = A; if (A === B) e1 = B; if (C === D) e2 = C; if (D === B) e3 = B; }
    const j = y * 2 * W2 + x * 2; o[j] = e0; o[j + 1] = e1; o[j + W2] = e2; o[j + W2 + 1] = e3;
  }
  if (shade) volume(od.data, W2, h * 2);
  og.putImageData(od, 0, 0);
  out._hd = S;
  return out;
}
// 2 倍密度下补体积感：迎光（左上）一侧把描边收细半个像素、内侧提一线高光；背光（右下）内侧压一线偏冷的暗部
function volume(d, w, h) {
  const n = w * h, al = new Uint8Array(n), src = new Uint8ClampedArray(d);
  for (let i = 0; i < n; i++) al[i] = d[i * 4 + 3] > 40 ? 1 : 0;
  const A = (x, y) => x >= 0 && y >= 0 && x < w && y < h && al[y * w + x];
  const lum = i => src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!al[y * w + x]) continue;
    const i = (y * w + x) * 4; if (d[i + 3] < 250) continue;
    let dl = 5, ds = 5;
    for (let k = 1; k <= 4; k++) if (!A(x - k, y - k) || !A(x, y - k)) { dl = k; break; }
    for (let k = 1; k <= 4; k++) if (!A(x + k, y + k) || !A(x, y + k)) { ds = k; break; }
    const L = lum(i);
    if (dl === 2 && L < 90 && A(x + 1, y + 1)) {   // 描边的内半像素 → 与里面的颜色对半，线条变细变柔
      const j = ((y + 1) * w + x + 1) * 4, Lj = lum(j);
      if (Lj > L + 24) { d[i] = (src[i] + src[j]) >> 1; d[i + 1] = (src[i + 1] + src[j + 1]) >> 1; d[i + 2] = (src[i + 2] + src[j + 2]) >> 1; }
    } else if ((dl === 3 || dl === 4) && L >= 90 && ds > 2) {
      const f = dl === 3 ? 1.13 : 1.06; d[i] = Math.min(255, src[i] * f + 6); d[i + 1] = Math.min(255, src[i + 1] * f + 5); d[i + 2] = Math.min(255, src[i + 2] * f + 2);
    } else if ((ds === 3 || ds === 4) && L >= 70 && dl > 4) {
      const f = ds === 3 ? 0.84 : 0.92; d[i] = src[i] * f; d[i + 1] = src[i + 1] * (f - 0.01); d[i + 2] = Math.min(255, src[i + 2] * (f + 0.07));
    }
  }
}
// 取某张美术画布的 2 倍版（同一张只算一次）。画布之后要是又被改画过，调 HD2D.stale(c)
HD.up = function (c) {
  let u = upCache.get(c);
  if (u === undefined) { u = scale2x(c, !c._hdOK && HD.opts.volume !== false); upCache.set(c, u); }
  return u;
};
HD.stale = c => upCache.delete(c);
function wantUp(img) { return HD.opts.upres && img && img.getContext && (img._hdOK === 1 || (img._st === 1 && img.width <= 160 && img.height <= 160)); }

// 画图垫片：高清画布（_hd）按逻辑尺寸落笔；定稿的静态精灵先换成 2 倍版
function shimDraw(rawDraw) {
  return function (img, a, b, c, d, e, f, g, h) {
    if (!HD.on) return rawDraw.apply(null, arguments);
    const n = arguments.length;
    let k = img._hd | 0;
    if (!k && wantUp(img)) { const u = HD.up(img); if (u) { img = u; k = S; } }
    if (!k) return rawDraw.apply(null, arguments);
    if (n === 3) return rawDraw(img, a, b, img.width / k, img.height / k);
    if (n === 5) return rawDraw(img, a, b, c, d);
    return rawDraw(img, a * k, b * k, c * k, d * k, e, f, g, h);
  };
}
// ---------- 接管场景画布 ----------
let main = null, mctx = null, raw = null;          // raw：原生方法
let pc = null, pg = null, Pw = 0, Ph = 0;          // 呈现画布（叠在 #scene 上）
let logicH = 160;
const layers = {};                                   // name → { c, g, used }
const LNAMES = ['sky', 'far', 'mid', 'ground', 'fore'];
const bufs = {};
function buf(name, w, h) { let b = bufs[name]; if (!b) b = bufs[name] = { c: mkc(w, h) }; if (b.c.width !== w || b.c.height !== h) { b.c.width = w; b.c.height = h; } b.g = b.c.getContext('2d'); return b; }

HD.attach = function (ctx) {
  if (!ctx || !ctx.canvas || ctx.canvas.id !== 'scene' || main) return false;
  if (!ctx.getTransform || !root.WeakMap) { HD.q = 0; return false; }   // 太老的 WebView：不接管，原样画
  main = ctx.canvas; mctx = ctx; HD.ctx = ctx; logicH = main.height;
  const proto = root.HTMLCanvasElement.prototype, dh = Object.getOwnPropertyDescriptor(proto, 'height'), dw = Object.getOwnPropertyDescriptor(proto, 'width');
  raw = { setTransform: ctx.setTransform.bind(ctx), drawImage: ctx.drawImage.bind(ctx), getH: dh.get.bind(main), setH: dh.set.bind(main), getW: dw.get.bind(main), setW: dw.set.bind(main) };
  // 界面仍把这块画布当成 200×H：读写高度走逻辑值，真实的后备尺寸是它的 S 倍
  Object.defineProperty(main, 'height', { configurable: true, get() { return logicH; }, set(v) { logicH = v | 0; raw.setH(HD.on ? logicH * S : logicH); if (HD.on) { mctx.imageSmoothingEnabled = false; sizeLayers(); } } });
  ctx.setTransform = function (a, b, c, d, e, f) { if (!HD.on || arguments.length !== 6) return raw.setTransform.apply(null, arguments); return raw.setTransform(a * S, b * S, c * S, d * S, e * S, f * S); };
  ctx.drawImage = shimDraw(raw.drawImage);
  // 别处把场景画布当成 200×H 的图来抠（过场拿洞府当底图：drawImage(场景, sx, sy, sw, sh, …)）：换成合成好的画面
  const CP = root.CanvasRenderingContext2D.prototype, protoDraw = CP.drawImage;
  CP.drawImage = function (img) {
    if (img === main && HD.on && !inPresent && this !== mctx && arguments.length === 9) { const a = arguments; inPresent = true; try { HD.snap(this, a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]); } finally { inPresent = false; } return; }
    return protoDraw.apply(this, arguments);
  };
  if (HD.q > 0) enable();
  root.requestAnimationFrame(loop);
  return true;
};
function sizeLayers() {
  for (const n of LNAMES) { const k = n === 'ground' ? S : 1, w = 200 * k, h = logicH * k;   // 只有焦平面（地面）用 2 倍密度；天 / 远 / 中 / 前景反正要虚化，1 倍就够
    let L = layers[n]; if (!L) L = layers[n] = { c: mkc(w, h), used: false, k }; if (L.c.width !== w || L.c.height !== h) { L.c.width = w; L.c.height = h; } if (!L.g) { L.g = L.c.getContext('2d'); L.g.drawImage = shimDraw(L.g.drawImage.bind(L.g)); } L.g.imageSmoothingEnabled = false; }
  sizePresent(true);
}
function enable() {
  HD.on = true; HD.stats.q = HD.q;
  raw.setW(200 * S); raw.setH(logicH * S); mctx.imageSmoothingEnabled = false;
  if (!pc) {
    pc = mkc(8, 8); pc.id = 'sceneHD'; pc.setAttribute('aria-hidden', 'true');
    pc.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:block;';
    main.parentNode.insertBefore(pc, main.nextSibling);
  }
  pc.style.display = 'block';
  sizeLayers();
  F.age = 99;
}
function disable() {
  HD.on = false;
  raw.setW(200); raw.setH(logicH); mctx.imageSmoothingEnabled = false;
  if (pc) pc.style.display = 'none';
}
function sizePresent(force) {
  if (!pc || !HD.on) return;
  const r = main.getBoundingClientRect(), dpr = root.devicePixelRatio || 1;
  let w;
  if (HD.q >= 3) w = Math.round(r.width * dpr); else w = 200 * S;   // 1、2 档按高清像素（2 倍密度）合成，交给浏览器整数感放大；3 档按设备像素合成，光与粒子是真正平滑的
  if (!(w > 0)) w = 200 * S;
  w = Math.max(200 * S, w);
  const h = Math.round(w * logicH / 200);
  if (force || w !== Pw || h !== Ph) {
    Pw = w; Ph = h; if (pc.width !== w) pc.width = w; if (pc.height !== h) pc.height = h; pg = pc.getContext('2d');
    pc.style.filter = HD.q >= 3 && HD.opts.grade ? 'contrast(1.07) saturate(1.12)' : '';
    pc.style.imageRendering = HD.q < 3 ? 'pixelated' : 'auto';
  }
}

// ---------- 每帧的场景描述（art.js 的各 draw* 往里写） ----------
const F = { kind: '', key: '', OY: 0, t: 0, age: 99, lights: [], amb: null, dark: 0, sun: null, moon: null, sky: null, scroll: 0, prof: null, season: 0 };
HD.F = F;
// art.js：一帧背景开画。返回 true 表示接管（之后用 HD2D.layer(name) 换图层，画完 HD2D.end()）
HD.begin = function (kind, info) {
  if (!HD.on) return false;
  info = info || {};
  F.kind = kind; F.key = info.key || kind; F.OY = info.OY || 0; F.t = info.t || 0; F.age = 0; F.lights.length = 0; F.amb = null; F.dark = info.dark || 0;
  F.sun = info.sun || null; F.moon = info.moon || null; F.keyL = null; F.rays = null; F.motes = null; F.gradeC = null; F.gradeA = undefined; F.sky = info.sky || null; F.scroll = info.scroll || 0; F.season = info.season || 0;
  F.prof = profile(kind, F.key);
  const tr = mctx.getTransform();
  raw.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, 200 * S, logicH * S); mctx.setTransform(tr);
  for (const n of LNAMES) { const L = layers[n]; if (L.used) { L.g.setTransform(1, 0, 0, 1, 0, 0); L.g.clearRect(0, 0, L.c.width, L.c.height); L.used = false; } }
  return true;
};
HD.layer = function (name) {
  const L = layers[name] || layers.ground;
  L.used = true; const m = mctx.getTransform(), r = L.k / S; L.g.setTransform(m.a * r, m.b * r, m.c * r, m.d * r, m.e * r, m.f * r); L.g._k = L.k; L.g.globalAlpha = 1; L.g.globalCompositeOperation = 'source-over'; L.g.imageSmoothingEnabled = false;
  return L.g;
};
HD.end = function () { return mctx; };
HD.owns = function (c) { for (const n of LNAMES) if (layers[n] && layers[n].g === c) return true; return false; };
// 一盏灯（逻辑坐标，已含 OY 的平移由 art.js 传进来之前换算好）
HD.light = function (x, y, r, c, a, kind) { if (F.lights.length < 64) F.lights.push({ x, y, r, c, a, kind: kind || 0 }); };
HD.night = function (sky, lights) { F.amb = sky && sky.amb && sky.amb !== '#ffffff' ? sky.amb : null; F.dark = sky ? 1 - sky.light : 0; if (lights) for (const l of lights) HD.light(l.x, l.y + F.OY, l.r, l.c, l.a * (0.35 + F.dark), 1); };

// ---------- 场景配置：景深、主光、体积光、粒子、调色 ----------
// blur：各层的虚化量（0 清晰，1 全虚）；key：主光方向（像素偏移，指向光源）与颜色；rays：体积光；motes：浮尘 / 萤火 / 火星；grade：柔光调色；fog：远景空气透视
const BASE = { blur: { sky: 0.35, far: 0.7, mid: 0.3, fore: 1 }, par: { sky: 0.12, far: 0.35, mid: 0.65, fore: -1.3 }, key: { dx: -1, dy: -1, c: '#fff1cc', a: 0.5 }, rays: null, motes: { n: 26, c: '#fff6d8', kind: 'dust' }, grade: { c: '#ffb070', a: 0.1 }, vig: 0.5, fog: null, feet: 0, gloss: 0, tilt: null, bloom: 0.4 };
const PROF = {
  home: { blur: { sky: 0.3, far: 0.75, mid: 0.3, fore: 1 }, tilt: [40, 92], motes: { n: 30, c: '#fff6d8', kind: 'dust' }, vig: 0.45 },
  adv: { feet: 128, tilt: null },
  duel: { feet: 128, gloss: 0.16, tilt: [20, 96], motes: { n: 18, c: '#fff6d8', kind: 'dust' } },
  // 历练地图
  'adv:forest': { key: { dx: -1, dy: -1, c: '#fff4c0', a: 0.55 }, rays: { x: 36, y: 18, c: '#fff2b8', a: 0.2, spread: 0.9, dir: 0.55 }, sun: { x: 36, y: 18, r: 46, c: '#fff0b0', a: 0.5 }, motes: { n: 36, c: '#f4ffb8', kind: 'dust' }, grade: { c: '#a8e070', a: 0.1 }, fog: { c: '#dff4d8', a: 0.22, y0: 70, y1: 126 } },
  'adv:hill': { key: { dx: 1, dy: -1, c: '#ffc890', a: 0.55 }, sun: { x: 150, y: 44, r: 50, c: '#ffb070', a: 0.5 }, rays: { x: 150, y: 44, c: '#ffb878', a: 0.14, spread: 1.1, dir: -0.5 }, motes: { n: 30, c: '#ffd8a0', kind: 'sand' }, grade: { c: '#ff8a5a', a: 0.14 }, fog: { c: '#c890a0', a: 0.2, y0: 80, y1: 126 } },
  'adv:tomb': { key: { dx: 1, dy: -1, c: '#b8c8ff', a: 0.5 }, motes: { n: 22, c: '#9af0c8', kind: 'wisp' }, grade: { c: '#5a70c8', a: 0.16 }, fog: { c: '#7a86b8', a: 0.28, y0: 84, y1: 128 }, vig: 0.7 },
  'adv:blood': { key: { dx: 0, dy: -1, c: '#ff6a5a', a: 0.5 }, motes: { n: 30, c: '#ff7a4a', kind: 'ember' }, grade: { c: '#c81e3c', a: 0.16 }, fog: { c: '#7a1428', a: 0.26, y0: 80, y1: 128 }, vig: 0.7 },
  'adv:swords': { key: { dx: -1, dy: -1, c: '#d8f0ff', a: 0.6 }, rays: { x: 60, y: -10, c: '#cfe8ff', a: 0.14, spread: 0.8, dir: 0.4 }, motes: { n: 28, c: '#cfe8ff', kind: 'wisp' }, grade: { c: '#6aa8e0', a: 0.12 }, fog: { c: '#c8dcf0', a: 0.24, y0: 76, y1: 126 } },
  'adv:abyss': { key: { dx: 0, dy: 1, c: '#b060ff', a: 0.5 }, motes: { n: 30, c: '#c070ff', kind: 'ember' }, grade: { c: '#6a28b0', a: 0.18 }, fog: { c: '#3a1458', a: 0.3, y0: 84, y1: 130 }, vig: 0.8 },
  'adv:sea': { key: { dx: -1, dy: -1, c: '#c8fff4', a: 0.55 }, rays: { x: 80, y: -20, c: '#a8f0ff', a: 0.2, spread: 1.3, dir: 0.2 }, motes: { n: 34, c: '#d8fff8', kind: 'bubble' }, grade: { c: '#28b0c8', a: 0.14 }, fog: { c: '#5ac8d8', a: 0.2, y0: 70, y1: 126 } },
  'adv:stars': { key: { dx: 1, dy: -1, c: '#ffe8a0', a: 0.55 }, motes: { n: 34, c: '#ffe8a0', kind: 'wisp' }, grade: { c: '#6a5ad8', a: 0.14 }, vig: 0.7, bloom: 0.8 },
  'adv:palace': { key: { dx: -1, dy: -1, c: '#fff0b0', a: 0.6 }, rays: { x: 100, y: -20, c: '#ffe8a0', a: 0.2, spread: 1.4, dir: 0 }, motes: { n: 34, c: '#ffe8a0', kind: 'dust' }, grade: { c: '#ffc850', a: 0.14 }, fog: { c: '#fff0c8', a: 0.2, y0: 70, y1: 124 }, bloom: 0.75 },
  'adv:chaos': { key: { dx: 0, dy: -1, c: '#c85aff', a: 0.5 }, motes: { n: 34, c: '#3ad8c8', kind: 'ember' }, grade: { c: '#6a1aa0', a: 0.16 }, vig: 0.85, bloom: 0.8 },
  // 对决舞台与秘境
  'duel:town': { key: { dx: 1, dy: -1, c: '#ffc890', a: 0.55 }, grade: { c: '#ff9a5a', a: 0.13 }, motes: { n: 20, c: '#ffe0b0', kind: 'dust' } },
  'duel:cloud': { key: { dx: -1, dy: -1, c: '#ffffff', a: 0.6 }, rays: { x: 100, y: -20, c: '#ffffff', a: 0.16, spread: 1.4, dir: 0 }, grade: { c: '#8ac8ff', a: 0.1 }, gloss: 0.22, bloom: 0.7 },
  'duel:sect': { key: { dx: -1, dy: -1, c: '#fff1cc', a: 0.55 }, grade: { c: '#ffb070', a: 0.1 } },
  'duel:wild': { key: { dx: 1, dy: -1, c: '#d0d8ff', a: 0.5 }, motes: { n: 20, c: '#e8ff9a', kind: 'fly' }, grade: { c: '#5a70c8', a: 0.12 }, fog: { c: '#c8c0e0', a: 0.16, y0: 96, y1: 128 }, vig: 0.65 },
  'duel:sect_mo': { key: { dx: 0, dy: -1, c: '#ff6a5a', a: 0.5 }, motes: { n: 26, c: '#8aff8a', kind: 'ember' }, grade: { c: '#c81e3c', a: 0.16 }, vig: 0.8, fog: { c: '#5a2a78', a: 0.22, y0: 100, y1: 132 } },
  'duel:r_jin': { key: { dx: -1, dy: -1, c: '#e8f0ff', a: 0.6 }, motes: { n: 24, c: '#e8f0ff', kind: 'wisp' }, grade: { c: '#a0b8e0', a: 0.12 }, gloss: 0.2 },
  'duel:r_mu': { key: { dx: -1, dy: -1, c: '#e8ffb8', a: 0.55 }, rays: { x: 60, y: -10, c: '#e8ffb8', a: 0.18, spread: 1, dir: 0.4 }, motes: { n: 30, c: '#d8ff9a', kind: 'fly' }, grade: { c: '#70c850', a: 0.12 } },
  'duel:r_huo': { key: { dx: 0, dy: 1, c: '#ff9a4a', a: 0.6 }, motes: { n: 34, c: '#ffb04a', kind: 'ember' }, grade: { c: '#ff5a1e', a: 0.16 }, vig: 0.7, bloom: 0.8 },
  'duel:r_shui': { key: { dx: -1, dy: -1, c: '#b8e8ff', a: 0.55 }, motes: { n: 28, c: '#c8f0ff', kind: 'bubble' }, grade: { c: '#2878c8', a: 0.15 }, gloss: 0.26, vig: 0.7 },
};
const profCache = {};
function profile(kind, key) {
  const id = kind + ':' + key;
  let p = profCache[id];
  if (!p) { p = Object.assign({}, BASE, PROF[kind] || {}, PROF[id] || {}); p.blur = Object.assign({}, BASE.blur, (PROF[kind] || {}).blur, (PROF[id] || {}).blur); profCache[id] = p; }
  return p;
}
HD.profiles = PROF;

// ---------- 预制贴图：光斑、体积光扇面、暗角、颗粒 ----------
const tex = {};
function glowTex(c) {
  const k = 'g' + c; let t = tex[k]; if (t) return t;
  t = mkc(64, 64); const g = t.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hexA(c, 0.8)); gr.addColorStop(0.22, hexA(c, 0.5)); gr.addColorStop(0.55, hexA(c, 0.17)); gr.addColorStop(1, hexA(c, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); tex[k] = t; return t;
}
function rayTex(c) {
  const k = 'r' + c; let t = tex[k]; if (t) return t;
  t = mkc(256, 256); const g = t.getContext('2d');
  // 从 (128,0) 向下散开的一把光束：每束是一个细长三角，横向用渐变羽化
  for (let i = 0; i < 9; i++) {
    const a = (hash(i * 7 + 3) - 0.5) * 1.5, w = 0.03 + hash(i * 13 + 1) * 0.09, al = 0.25 + hash(i * 5 + 2) * 0.5;
    const x0 = 128 + Math.sin(a - w) * 300, x1 = 128 + Math.sin(a + w) * 300;
    const gr = g.createLinearGradient(x0, 256, x1, 256); gr.addColorStop(0, hexA(c, 0)); gr.addColorStop(0.5, hexA(c, al)); gr.addColorStop(1, hexA(c, 0));
    g.fillStyle = gr; g.beginPath(); g.moveTo(128, 0); g.lineTo(x0, 300); g.lineTo(x1, 300); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'destination-in';
  const fr = g.createRadialGradient(128, 0, 8, 128, 0, 256); fr.addColorStop(0, 'rgba(0,0,0,.9)'); fr.addColorStop(0.5, 'rgba(0,0,0,.55)'); fr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fr; g.fillRect(0, 0, 256, 256);
  tex[k] = t; return t;
}
function vigTex() {
  let t = tex.vig; if (t) return t;
  t = mkc(96, 96); const g = t.getContext('2d'), gr = g.createRadialGradient(48, 44, 22, 48, 48, 72);
  gr.addColorStop(0, 'rgba(8,6,20,0)'); gr.addColorStop(0.55, 'rgba(8,6,20,.16)'); gr.addColorStop(1, 'rgba(8,6,20,.82)');
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96); tex.vig = t; return t;
}
function grainTex() {
  let t = tex.grain; if (t) return t;
  t = mkc(128, 128); const g = t.getContext('2d'), d = g.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const v = 128 + (hash(i * 3 + 11) - 0.5) * 150; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
  g.putImageData(d, 0, 0); tex.grain = t; return t;
}

// ---------- 合成 ----------
function softLayer(g, L, amt, dx, dy, zoom, name) {
  // 把一层画到呈现画布。amt = 0：最近邻（清晰）；amt ≥ 0.6：先缩到一半再双线性放大（虚）；之间：直接双线性放大（微虚）。3 档时中间量是“清晰底 + 一层柔化”
  const w = Pw * zoom, h = Ph * zoom, x = (Pw - w) / 2 + dx, y = (Ph - h) / 2 + dy, q = HD.q;
  if (!HD.opts.dof || q < 2) amt = amt >= 1 ? 0.99 : 0;
  if (amt <= 0) { g.imageSmoothingEnabled = false; g.drawImage(L.c, x, y, w, h); return; }
  if (q >= 3 && amt < 0.5) { g.imageSmoothingEnabled = false; g.drawImage(L.c, x, y, w, h); g.globalAlpha = Math.min(1, amt * 1.6); g.imageSmoothingEnabled = true; g.drawImage(L.c, x, y, w, h); g.globalAlpha = 1; return; }
  g.imageSmoothingEnabled = true;
  if (amt >= 0.6) { const b = buf('s_' + name, Math.ceil(L.c.width / 2), Math.ceil(L.c.height / 2)); b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(L.c, 0, 0, b.c.width, b.c.height); g.drawImage(b.c, x, y, w, h); }
  else g.drawImage(L.c, x, y, w, h);
}
function drawLight(g, l, u, mul) {
  const r = l.r * u * (l.kind === 2 ? 1.5 : l.kind === 1 ? 2.8 : 2.1), x = l.x * u, y = l.y * u, a = clamp(l.a * mul, 0, 1);
  if (a <= 0.01) return;
  g.globalAlpha = a; g.drawImage(glowTex(l.c), x - r, y - r, r * 2, r * 2);
}
const MOTE = {
  dust: { vy: -0.004, vx: 0.006, sway: 5, size: 1 }, sand: { vy: 0.002, vx: 0.05, sway: 3, size: 1 }, wisp: { vy: -0.012, vx: 0.002, sway: 8, size: 1.6 },
  ember: { vy: -0.03, vx: 0.006, sway: 6, size: 1.2 }, bubble: { vy: -0.02, vx: 0, sway: 4, size: 1.3 }, fly: { vy: 0, vx: 0, sway: 14, size: 1.3 },
};
function drawMotes(g, m, t, u, OY, H) {
  const n = HD.q >= 2 ? m.n : Math.round(m.n * 0.5), K = MOTE[m.kind] || MOTE.dust, tx = glowTex(m.c);
  g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 3 + 1), h2 = hash(i * 3 + 2), h3 = hash(i * 3 + 3);
    const depth = 0.5 + h3;                                   // 远小近大
    let x = (h1 * 240 + t * K.vx * depth + Math.sin(t / (1700 + h2 * 900) + i) * K.sway) % 240; if (x < 0) x += 240; x -= 20;
    let y = (h2 * (H + 20) + t * K.vy * depth + Math.cos(t / (2100 + h1 * 700) + i * 2) * K.sway * 0.6) % (H + 20); if (y < 0) y += H + 20; y -= 10;
    const tw = 0.5 + 0.5 * Math.sin(t / (500 + h3 * 900) + i * 1.7), a = (m.kind === 'fly' ? tw * tw : 0.35 + 0.65 * tw) * (0.35 + 0.4 * depth);
    const r = K.size * depth * u * (m.kind === 'fly' ? 2.6 : 1.9);
    g.globalAlpha = clamp(a, 0, 1) * 0.8; g.drawImage(tx, x * u - r, y * u - r, r * 2, r * 2);
    // 核：一个高清像素的亮点，保住像素感
    const px = Math.max(1, Math.round(u / S)); g.globalAlpha = clamp(a * 1.2, 0, 1); g.fillStyle = '#ffffff'; g.fillRect(Math.round(x * u / px) * px, Math.round(y * u / px) * px, px, px);
  }
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
}
let halfN = 0, lastNow = 0, slow = 0, fast = 0, covered = false, skipN = 0, inPresent = false;
HD.present = function (now) {
  if (!HD.on || !pc) return;
  inPresent = true; try { present(now); } finally { inPresent = false; }
};
function present(now) {
  now = now || root.performance.now();
  sizePresent(false);
  const g = pg, t0 = root.performance.now();
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  F.age++;
  if (F.age > 4) {   // 这几帧没有哪个场景开画（开场、黑屏）：原样放大
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, Pw, Ph); g.drawImage(main, 0, 0, Pw, Ph); return;
  }
  const P = F.prof || BASE, u = Pw / 200, OY = F.OY, H = logicH, t = now, O = HD.opts, q = HD.q;
  const key = F.keyL || P.key;
  const cx = O.cam ? (Math.sin(t / 9100) * 1.6 + Math.sin(t / 23000) * 1.1) * u : 0, cy = O.cam ? Math.sin(t / 13000) * 0.6 * u : 0;
  const lay = n => layers[n].used ? layers[n] : null;
  // 1 天空
  let L = lay('sky');
  if (L) softLayer(g, L, P.blur.sky, cx * P.par.sky, cy * P.par.sky, 1.03, 'sky'); else { g.fillStyle = '#0b0912'; g.fillRect(0, 0, Pw, Ph); }
  // 2 日 / 月的大光晕（在远山后面）
  g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
  if (F.sun && F.sun.a > 0.02) drawLight(g, { x: F.sun.x, y: F.sun.y + OY, r: 26, c: F.sun.c || '#ffe8a8', a: 0.5 * F.sun.a }, u, 1);
  if (F.moon && F.moon.a > 0.02) drawLight(g, { x: F.moon.x, y: F.moon.y + OY, r: 24, c: '#a8c0ff', a: 0.6 * F.moon.a }, u, 1);
  if (P.sun) drawLight(g, { x: P.sun.x, y: P.sun.y + OY * 0.6, r: P.sun.r / 2, c: P.sun.c, a: P.sun.a }, u, 1);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 3 远景 + 空气透视
  L = lay('far'); if (L) softLayer(g, L, P.blur.far, cx * P.par.far, cy * P.par.far, 1.04, 'far');
  if (P.fog && O.grade) { const y0 = (P.fog.y0 + OY) * u, y1 = (P.fog.y1 + OY) * u, gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, hexA(P.fog.c, 0)); gr.addColorStop(0.7, hexA(P.fog.c, P.fog.a)); gr.addColorStop(1, hexA(P.fog.c, P.fog.a * 0.5)); g.fillStyle = gr; g.fillRect(0, y0, Pw, y1 - y0); }
  L = lay('mid'); if (L) softLayer(g, L, P.blur.mid, cx * P.par.mid, cy * P.par.mid, 1.03, 'mid');
  // 4 地面（焦平面，清晰）；上半截按移轴的办法稍稍虚掉
  L = lay('ground');
  if (L) {
    g.imageSmoothingEnabled = false; g.drawImage(L.c, 0, 0, Pw, Ph);
    if (P.tilt && O.dof && q >= 3) {
      const b = buf('tilt', 200, H); b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(L.c, 0, 0, 200, H);
      b.g.globalCompositeOperation = 'destination-in'; const gr = b.g.createLinearGradient(0, P.tilt[0] + OY, 0, P.tilt[1] + OY); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.g.fillStyle = gr; b.g.fillRect(0, 0, 200, H);
      g.imageSmoothingEnabled = true; g.drawImage(b.c, 0, 0, Pw, Ph);
    }
  }
  const lw = raw.getW(), lh = raw.getH(), k = Pw / lw;
  // 5 人物的投影与地面反光（脚底在同一条线上的场景）
  if (P.feet && O.shadow && q >= 2) {
    const fy = (P.feet + OY) * S, sb = buf('shadow', lw, lh), sg = sb.g;
    sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'copy'; sg.imageSmoothingEnabled = false; sg.drawImage(main, 0, 0, lw, fy, 0, 0, lw, fy);
    sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a0618'; sg.fillRect(0, 0, lw, lh);
    const sk = -(key.dx || 0) * 0.55, sy = 0.26;
    g.save(); g.beginPath(); g.rect(0, fy * k - 1, Pw, Ph); g.clip();
    g.setTransform(k, 0, -sk * k, -sy * k, fy * sk * k, fy * (1 + sy) * k); g.imageSmoothingEnabled = true; g.globalAlpha = 0.3; g.drawImage(sb.c, 0, 0);
    g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    if (P.gloss) {
      g.save(); g.beginPath(); g.rect(0, fy * k, Pw, 26 * u); g.clip();
      g.setTransform(k, 0, 0, -0.8 * k, 0, fy * 1.8 * k + u); g.globalAlpha = P.gloss; g.imageSmoothingEnabled = true; g.drawImage(main, 0, 0);
      g.restore(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    }
  }
  // 5b 人物身后的灵光（ART.glow 记下的那些）
  g.globalCompositeOperation = 'screen'; g.imageSmoothingEnabled = true;
  for (const l of F.lights) if (l.kind === 2) drawLight(g, l, u, 1);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 6 人物层（清晰）
  g.imageSmoothingEnabled = false; g.drawImage(main, 0, 0, Pw, Ph);
  // 7 轮廓光：人物层朝主光那一侧的边缘提亮（颜色跟主光 / 昼夜走）
  if (O.rim && key && q >= 1) {
    const rb = buf('rim', lw, lh), rg = rb.g, kc = key.c, ka = key.a;
    if (ka > 0.03) {
      rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'copy'; rg.imageSmoothingEnabled = false; rg.drawImage(main, 0, 0);
      rg.globalCompositeOperation = 'destination-out'; rg.drawImage(main, -(key.dx || 0), -(key.dy || 0));
      rg.globalCompositeOperation = 'source-in'; rg.fillStyle = kc; rg.fillRect(0, 0, lw, lh);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = ka; g.drawImage(rb.c, 0, 0, Pw, Ph); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
  }
  // 8 夜色：地面与人物以环境光正片叠底（上沿用渐变接到山色里）
  if (F.amb) {
    const y0 = (88 + OY) * u, y1 = (100 + OY) * u, gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, F.amb);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = gr; g.fillRect(0, y0, Pw, Ph - y0); g.globalCompositeOperation = 'source-over';
  }
  // 9 前景（最虚、视差最大）
  L = lay('fore'); if (L) softLayer(g, L, P.blur.fore, cx * P.par.fore, 0, 1.05, 'fore');
  // 10 光源
  g.globalCompositeOperation = 'screen'; g.imageSmoothingEnabled = true;
  for (const l of F.lights) if (l.kind !== 2) drawLight(g, l, u, l.kind === 1 ? 1.5 : 0.8);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = 1;
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 11 光缓冲（四分之一分辨率，一次加回去）：辉光 = 各层缩小 → 自乘两次只留高光 → 再缩一半糊开；体积光也画在这里面（本来就是软的）
  const rays = F.rays || P.rays, doBloom = O.bloom && q >= 2 && P.bloom > 0, doRays = rays && O.rays && q >= 2 && rays.a > 0.01;
  if (doBloom || doRays) {
    const bw = Math.ceil(Pw / (q >= 3 ? 4 : 5)), bh = Math.ceil(bw * H / 200), a = buf('bloomA', bw, bh), ag = a.g, ub = bw / 200;
    ag.setTransform(1, 0, 0, 1, 0, 0); ag.globalAlpha = 1; ag.globalCompositeOperation = 'source-over'; ag.fillStyle = '#000'; ag.fillRect(0, 0, bw, bh);
    if (doBloom) {
      ag.imageSmoothingEnabled = true;
      for (const n of ['sky', 'ground']) { const L2 = lay(n); if (L2) ag.drawImage(L2.c, 0, 0, bw, bh); }
      ag.drawImage(main, 0, 0, bw, bh);
      ag.globalCompositeOperation = 'multiply'; ag.drawImage(a.c, 0, 0); ag.drawImage(a.c, 0, 0);
      ag.globalCompositeOperation = 'source-over'; ag.globalAlpha = clamp(1 - P.bloom * 1.1, 0, 1); ag.fillRect(0, 0, bw, bh); ag.globalAlpha = 1;
      const b = buf('bloomB', Math.ceil(bw / 2), Math.ceil(bh / 2)); b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(a.c, 0, 0, b.c.width, b.c.height);
      ag.globalCompositeOperation = 'lighter'; ag.globalAlpha = 0.8; ag.drawImage(b.c, 0, 0, bw, bh); ag.globalAlpha = 1;
    }
    if (doRays) {
      const tx = rayTex(rays.c), len = (H + 40) * ub * 1.25;
      ag.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) {
        const sway = Math.sin(t / (5200 + i * 2900) + i * 2) * 0.05, al = rays.a * (0.75 + 0.25 * Math.sin(t / (1900 + i * 1300) + i * 4));
        ag.save(); ag.translate(rays.x * ub, (rays.y + OY * 0.6) * ub); ag.rotate(-(rays.dir || 0) + sway + (i ? 0.08 : 0)); ag.globalAlpha = clamp(al, 0, 1);
        ag.drawImage(tx, -len * (rays.spread || 1) / 2, 0, len * (rays.spread || 1), len); ag.restore();
      }
    }
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.drawImage(a.c, 0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over';
  }
  // 13 高清粒子
  const motes = F.motes || P.motes;
  if (motes && O.parts) drawMotes(g, motes, t, u, OY, H);
  // 14 调色、暗角、颗粒、色差
  if (O.grade) {
    if (P.grade && q >= 2) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = hexA(F.gradeC || P.grade.c, P.grade.a * (F.gradeA === undefined ? 1 : F.gradeA)); g.fillRect(0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }
    g.imageSmoothingEnabled = true; g.globalAlpha = clamp(P.vig + F.dark * 0.2, 0, 1); g.drawImage(vigTex(), 0, 0, Pw, Ph); g.globalAlpha = 1;
    if (q >= 3) { g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.07; const gt = grainTex(), ox = (hash((t / 50) | 0) * 128) | 0, oy = (hash(((t / 50) | 0) + 9) * 128) | 0, gs = Math.max(1, Math.round(u / S)) * 128; for (let y = -oy * gs / 128; y < Ph; y += gs) for (let x = -ox * gs / 128; x < Pw; x += gs) g.drawImage(gt, x, y, gs, gs); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
    if (q >= 3 && O.ca) {   // 色差：红通道沿径向外扩一点点（要回读整张画面，软件光栅下很贵，默认关）
      const cb = buf('ca', Pw, Ph); cb.g.globalCompositeOperation = 'copy'; cb.g.drawImage(pc, 0, 0); cb.g.globalCompositeOperation = 'multiply'; cb.g.fillStyle = '#ff0000'; cb.g.fillRect(0, 0, Pw, Ph);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#00ffff'; g.fillRect(0, 0, Pw, Ph);
      g.globalCompositeOperation = 'lighter'; const z = 1.0022; g.imageSmoothingEnabled = true; g.drawImage(cb.c, -(z - 1) * Pw / 2, -(z - 1) * Ph / 2, Pw * z, Ph * z); g.globalCompositeOperation = 'source-over';
    }
  }
  HD.stats.ms += (root.performance.now() - t0 - HD.stats.ms) * 0.1;
}
function loop(now) {
  root.requestAnimationFrame(loop);
  if (!HD.on) { lastNow = now; return; }
  const dt = now - lastNow; lastNow = now;
  if (pc.offsetParent === null && pc.getClientRects().length === 0) return;   // 场景不在屏上
  if (covered) return;
  if (HD.half && (++halfN & 1)) return;                                                          // 对话 / 过场盖着整屏：不合成
  const md = doc.getElementById('modal'); if (md && !md.hidden && (++skipN % 6)) return;   // 弹窗压着：六帧合成一次
  if (HD.selfLoop) HD.present(now);
  // 帧间隔的滑动平均；持续掉帧就降一档（只降不升，换场景也不反复横跳）
  if (dt > 0 && dt < 500) {
    HD.stats.frame += (dt - HD.stats.frame) * 0.05;
    if (HD.auto && !root.document.hidden) {
      if (dt > 26) slow++; else fast++;
      if (slow + fast >= 150) { if (slow > 90) { HD.stats.drops++; if (!HD.half && HD.q >= 2) HD.half = true; else if (HD.q > HD.minQ) { HD.selfLoop = true;          // 模块自己每帧合成；界面主循环显式调 HD2D.present(now) 时设成 false
HD.half = false; HD.setQuality(HD.q - 1, true); } } slow = 0; fast = 0; }
    }
  }
}
// ---------- 界面皮肤：九宫格边框升 3 倍密度并补材质（ART.frame 调）；外加一段只改观感、不改尺寸的样式 ----------
// 返回一张 SVG（固有尺寸仍是 20×20，里面嵌 60×60 的像素图）：CSS 里的 border-image 切片数不用改，放大后多出来的是细节
HD.skinOn = () => HD.q > 0 && HD.opts.skin;
HD.frame = function (c, kind, fill) {
  const k = 3, w = c.width * k, o = mkc(w, w), g = o.getContext('2d');
  g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, w, w);
  const n = parseInt((fill || '#262038').slice(1), 16), lum = ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11;
  const isBtn = /^btn|^chk/.test(kind), dark = lum < 110;
  g.globalCompositeOperation = 'source-atop';
  const gr = g.createLinearGradient(0, 0, 0, w);
  if (isBtn) { gr.addColorStop(0, 'rgba(255,255,255,.42)'); gr.addColorStop(0.3, 'rgba(255,255,255,.14)'); gr.addColorStop(0.42, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(40,10,40,.06)'); gr.addColorStop(1, 'rgba(40,10,40,.3)'); }
  else if (dark) { gr.addColorStop(0, 'rgba(150,160,255,.2)'); gr.addColorStop(0.3, 'rgba(120,130,255,.05)'); gr.addColorStop(0.7, 'rgba(0,0,0,.08)'); gr.addColorStop(1, 'rgba(0,0,10,.36)'); }
  else { gr.addColorStop(0, 'rgba(255,255,255,.38)'); gr.addColorStop(0.3, 'rgba(255,255,255,.05)'); gr.addColorStop(0.7, 'rgba(150,100,40,.05)'); gr.addColorStop(1, 'rgba(120,70,20,.2)'); }
  g.fillStyle = gr; g.fillRect(k, k, w - 2 * k, w - 2 * k);
  // 细一号的内描线：上缘一线高光、下缘一线暗（只有 1/3 个旧像素宽，放大后才看得出，这就是“高清”的来处）
  g.fillStyle = dark && !isBtn ? 'rgba(170,190,255,.35)' : 'rgba(255,255,255,.6)'; g.fillRect(2 * k, 2 * k, w - 4 * k, 1); g.fillRect(2 * k, 2 * k, 1, w - 4 * k);
  g.fillStyle = dark && !isBtn ? 'rgba(0,0,0,.5)' : 'rgba(70,40,20,.32)'; g.fillRect(2 * k, w - 2 * k - 1, w - 4 * k, 1); g.fillRect(w - 2 * k - 1, 2 * k, 1, w - 4 * k);
  if (isBtn && kind !== 'btnOff') { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(3 * k + 1, 3 * k - 1, 1, 5); g.fillRect(3 * k - 1, 3 * k + 1, 5, 1); }   // 左上角一粒十字星
  // 四角的细纹：纸面是描金角花，暗面板是玉色角线（每个角 18×18 个细像素，九宫格的角不拉伸）
  const orn = /^(sheet|card|codex$)/.test(kind) ? ['#8a5a1e', '#f4c542', '#fff2a8'] : kind === 'hud' || kind === 'talk' ? ['#1a5a52', '#4ccb9f', '#b8ffe8'] : null;
  if (orn) {
    g.globalCompositeOperation = 'source-atop';
    for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      g.save(); g.translate(sx > 0 ? 0 : w, sy > 0 ? 0 : w); g.scale(sx, sy);
      const big = kind === 'sheet' || kind === 'codex';
      g.fillStyle = orn[0]; g.fillRect(4, 4, big ? 13 : 9, 2); g.fillRect(4, 4, 2, big ? 13 : 9);
      g.fillStyle = orn[1]; g.fillRect(4, 4, big ? 12 : 8, 1); g.fillRect(4, 4, 1, big ? 12 : 8);
      if (big) { g.fillStyle = orn[0]; g.fillRect(8, 8, 6, 1); g.fillRect(8, 8, 1, 6); g.fillStyle = orn[1]; g.fillRect(7, 7, 3, 3); g.fillRect(15, 7, 1, 1); g.fillRect(7, 15, 1, 1); }
      g.fillStyle = orn[2]; g.fillRect(4, 4, 2, 2); if (big) g.fillRect(8, 8, 1, 1);
      g.restore();
    }
  }
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + c.width + "' height='" + c.height + "' viewBox='0 0 " + c.width + ' ' + c.height + "'><image width='" + c.width + "' height='" + c.height + "' href='" + o.toDataURL() + "' style='image-rendering:pixelated'/></svg>";
  return 'data:image/svg+xml;base64,' + root.btoa(svg);
};
// 加投影的那些规则前缀写成 :where(.hd2d)（不加权重）：界面自己用 box-shadow 画的选中框、提示框照样盖得过它
const SKIN_CSS = `
body.hd2d { background: radial-gradient(130% 70% at 50% 0%, #241d3c 0%, #120f1c 52%, #08060e 100%) fixed; }
:where(.hd2d) .hud { box-shadow: 0 3px 0 rgba(4,3,10,.55), 0 10px 22px rgba(4,3,10,.5); }
.hd2d #sceneWrap { box-shadow: 0 0 0 2px #0b0912, 0 0 0 3px #4a3f6e, 0 14px 30px rgba(0,0,0,.6); }
.hd2d #cult .xbar { box-shadow: 0 0 0 2px #0b0912, inset 0 2px 0 0 #120e1c, 0 0 10px rgba(76,203,159,.25); }
.hd2d #cult .xbar i { background: linear-gradient(#d8fff0 0 2px, #8ff5d0 2px 5px, #4ccb9f 5px 11px, #2f9a76 11px 14px, #1f7a5c 14px); box-shadow: 0 0 8px rgba(143,245,208,.55); }
.hd2d #cult.ready .xbar i { background: linear-gradient(#fffbe0 0 2px, #fff2a8 2px 5px, #f4c542 5px 11px, #c08a1a 11px 14px, #96680e 14px); box-shadow: 0 0 10px rgba(255,226,120,.7); }
.hd2d #cult #realm { text-shadow: 2px 2px 0 #0b0912, 0 0 12px rgba(255,220,150,.35); }
.hd2d #nav button img { filter: drop-shadow(0 2px 0 rgba(0,0,0,.5)) drop-shadow(0 0 5px rgba(140,160,255,.22)); }
:where(.hd2d) #nav button { box-shadow: 0 3px 0 rgba(4,3,10,.55), 0 8px 16px rgba(4,3,10,.45); }
:where(.hd2d) .sheet { box-shadow: 0 0 0 1px rgba(20,10,4,.6), 0 -10px 40px rgba(0,0,0,.55), 0 0 90px rgba(255,214,140,.1); }
.hd2d .sheet header h2 { text-shadow: 0 1px 0 rgba(255,255,255,.6); }
:where(.hd2d) .btn { text-shadow: 0 1px 0 rgba(255,255,255,.28); }
:where(.hd2d) .btn.gold, :where(.hd2d) #cult.ready { box-shadow: 0 3px 0 rgba(60,30,0,.5), 0 0 16px rgba(255,205,90,.38); }
.hd2d .res b, .hd2d #stats b { text-shadow: 0 0 8px currentColor; }
.hd2d #modal { background-image: radial-gradient(120% 80% at 50% 40%, rgba(8,6,16,.5), rgba(4,3,10,.86)); }
.hd2d .float { text-shadow: 2px 2px 0 #0b0912, 0 0 10px currentColor; }
.hd2d .sheet .rod { display: block; position: absolute; z-index: -1; pointer-events: none; inset: calc(-4 * var(--u2));
  background: linear-gradient(#3a2010, #8a5428 22%, #e8bc7a 42%, #a8703a 62%, #4a2a12) top / 100% calc(4 * var(--u2)) no-repeat,
    linear-gradient(#4a2a12, #a8703a 38%, #e8bc7a 58%, #8a5428 78%, #3a2010) bottom / 100% calc(4 * var(--u2)) no-repeat,
    radial-gradient(120% 90% at 50% 18%, rgba(255,250,230,.34) 0%, rgba(255,250,230,0) 46%, rgba(132,88,36,.2) 100%), var(--hd-paper, none); }
:where(.hd2d) .card { box-shadow: 0 2px 0 rgba(90,60,30,.28), 0 4px 10px rgba(90,60,30,.16); }
:where(.hd2d) .tk-box { box-shadow: 0 6px 0 rgba(4,3,10,.5), 0 0 34px rgba(110,120,255,.2); }
`;
HD.skin = function (on) {
  if (!doc || !doc.body) return;
  let s = doc.getElementById('hd2d-skin');
  if (on === undefined) on = HD.skinOn();
  if (on && !s) { s = doc.createElement('style'); s.id = 'hd2d-skin'; s.textContent = SKIN_CSS; doc.head.appendChild(s); }
  if (on && !tex.paper) {   // 宣纸纤维：一张可平铺的小图（短横丝 + 斑点），叠在纸面上
    const p = tex.paper = mkc(96, 96), g = p.getContext('2d');
    for (let i = 0; i < 260; i++) { const x = hash(i * 5 + 1) * 96, y = hash(i * 5 + 2) * 96, len = 2 + hash(i * 5 + 3) * 9, dk = hash(i * 5 + 4) < 0.6; g.fillStyle = dk ? 'rgba(120,84,40,' + (0.04 + hash(i) * 0.07) + ')' : 'rgba(255,252,240,' + (0.1 + hash(i) * 0.16) + ')'; g.fillRect(x | 0, y | 0, len | 0, 1); if (x + len > 96) g.fillRect(0, y | 0, (x + len - 96) | 0, 1); }
    for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(110,70,30,' + (0.05 + hash(i * 9) * 0.08) + ')'; g.fillRect((hash(i * 7 + 5) * 96) | 0, (hash(i * 7 + 6) * 96) | 0, 1, 1); }
    doc.body.style.setProperty('--hd-paper', 'url(' + p.toDataURL() + ')');
  }
  doc.body.classList.toggle('hd2d', !!on);
};
if (doc && HD.skinOn()) { if (doc.body) HD.skin(); else doc.addEventListener('DOMContentLoaded', () => HD.skin()); }
// ---------- 对话 / 过场舞台：在它们自己的画布上面罩一层气氛（辉光、浮尘、暗角、颗粒），不碰它们的绘制 ----------
// 对话（.tk-stage 里的 .tk-cv）和过场（.cn-wrap 里的 .cn-cv）一挂上来就自动加；HD2D.stageFx(容器, 源画布, 选项) 也可以手动给别的舞台加
const stages = [];
let stageN = 0;
HD.stageFx = function (host, src, o) {
  if (!host || !src || host.querySelector('.hd-fx')) return null;
  o = o || {};
  const c = mkc(8, 8); c.className = 'hd-fx'; c.setAttribute('aria-hidden', 'true');
  // 画布整张以“滤色”叠上去（黑 = 不改变底下的画面），所以里面只管往黑底上加光；暗角另用一个渐变层
  c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:auto;mix-blend-mode:screen;z-index:' + (o.z === undefined ? 2 : o.z) + ';';
  const v = doc.createElement('div'); v.className = 'hd-vig'; v.setAttribute('aria-hidden', 'true');
  v.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;background:radial-gradient(95% 75% at 50% 46%, rgba(8,6,20,0) 42%, rgba(8,6,20,.2) 70%, rgba(8,6,20,.62) 100%);z-index:' + (o.z === undefined ? 2 : o.z) + ';';
  if (o.after) { o.after.parentNode.insertBefore(v, o.after.nextSibling); o.after.parentNode.insertBefore(c, o.after.nextSibling); } else { host.appendChild(c); host.appendChild(v); }
  c._vig = v;
  const s = { host, src, c, o }; stages.push(s);
  if (stages.length === 1) root.requestAnimationFrame(stageLoop);
  return s;
};
// 立绘画布（对话里的 .tk-pt，界面按固有尺寸画、用 CSS 定大小）：就地换成 2 倍密度 + 体积明暗；界面重画后（尺寸被改回去）下一帧再换
function upInPlace(c) {
  if (c.hidden || c.width < 8 || c.width + 'x' + c.height === c._upW) return;
  const u = scale2x(c, true); if (!u) return;
  c.width = u.width; c.height = u.height; c._upW = u.width + 'x' + u.height;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(u, 0, 0);
}
function stageLoop(now) {
  for (let i = stages.length - 1; i >= 0; i--) { const s = stages[i]; if (!s.c.isConnected || !s.src.isConnected) { if (s.c.parentNode) s.c.parentNode.removeChild(s.c); if (s.c._vig.parentNode) s.c._vig.parentNode.removeChild(s.c._vig); stages.splice(i, 1); } }
  if (!stages.length) return;
  root.requestAnimationFrame(stageLoop);
  if (HD.q < 1) { for (const s of stages) { s.c.style.display = 'none'; s.c._vig.style.display = 'none'; } return; }
  if (HD.q < 3 && (++stageN & 1)) return;   // 气氛层 30 帧就够
  for (const s of stages) {
    if (HD.opts.upres) for (const p of s.host.querySelectorAll('canvas.tk-pt')) upInPlace(p);
    const c = s.c, cw = s.host.clientWidth, ch = s.host.clientHeight; if (!cw || !ch) continue;
    c.style.display = 'block'; c._vig.style.display = HD.opts.grade ? 'block' : 'none';
    const k = HD.q >= 3 ? 1.5 : HD.q === 2 ? 1 : 0.5, w = Math.round(cw * k), h = Math.round(ch * k);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d'), u = w / 200;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    const sr = s.src.getBoundingClientRect(), hr = s.host.getBoundingClientRect(), dx = (sr.left - hr.left) * k, dy = (sr.top - hr.top) * k, dw = sr.width * k, dh = sr.height * k;
    if (HD.q >= 2 && HD.opts.bloom && s.src.width > 1) {
      const bw = Math.ceil(w / 6), bh = Math.ceil(h / 6), a = buf('stA', bw, bh), b = buf('stB', Math.ceil(bw / 2), Math.ceil(bh / 2));
      a.g.globalCompositeOperation = 'copy'; a.g.imageSmoothingEnabled = true; a.g.fillStyle = '#000'; a.g.fillRect(0, 0, bw, bh); a.g.globalCompositeOperation = 'source-over'; a.g.drawImage(s.src, dx / 6, dy / 6, dw / 6, dh / 6);
      a.g.globalCompositeOperation = 'multiply'; a.g.drawImage(a.c, 0, 0); a.g.drawImage(a.c, 0, 0);
      b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(a.c, 0, 0, b.c.width, b.c.height);
      g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true; g.globalAlpha = 0.6; g.drawImage(b.c, 0, 0, w, h); g.globalAlpha = 0.3; g.drawImage(a.c, 0, 0, w, h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (HD.opts.parts) drawMotes(g, s.o.motes || { n: 26, c: '#fff2d8', kind: 'dust' }, now, u, 0, Math.ceil(h / u));
  }
}
if (doc && root.MutationObserver) {
  const scan = () => {
    covered = !!doc.querySelector('.tk-wrap, .cn-wrap');
    if (HD.q < 1) return;
    const tk = doc.querySelector('.tk-stage'); if (tk && !tk.querySelector('.hd-fx')) { const cv = tk.querySelector('.tk-cv'); if (cv) HD.stageFx(tk, cv, { z: 2 }); }
    const cn = doc.querySelector('.cn-wrap'); if (cn && !cn.querySelector('.hd-fx')) { const cv = cn.querySelector('.cn-cv'); if (cv) HD.stageFx(cn, cv, { z: 0, after: cv }); }
  };
  const start = () => new root.MutationObserver(scan).observe(doc.body, { childList: true });
  if (doc.body) start(); else doc.addEventListener('DOMContentLoaded', start);
}
// 把当前合成好的画面按 200×H 的逻辑坐标画进别的画布（过场拿洞府当底图时用）
HD.snap = function (g, sx, sy, sw, sh, dx, dy, dw, dh) {
  const src = HD.on && pc && F.age <= 4 ? pc : main, k = (HD.on && src === pc ? Pw : HD.on ? 200 * S : 200) / 200;
  g.drawImage(src, sx * k, sy * k, sw * k, sh * k, dx, dy, dw, dh);
};
})(typeof window !== 'undefined' ? window : globalThis);
