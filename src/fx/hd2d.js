/* 废柴仙途 · HD-2D 渲染模块（docs/ART_HD2D.md）
 * 像素画照旧由 src/art.js 逐像素生成；这里负责“次时代”的那一半：
 *   分层合成（天 / 远 / 中 / 地 / 人物 / 前景）、景深、动态光源与辉光、体积光、接触阴影与倒影、轮廓光、
 *   高清粒子、电影调色、暗角、颗粒、色差、缓慢的镜头摇移；人物精灵自动升到 2 倍像素密度。
 * 全部是 Canvas 2D（不依赖 WebGL），画质五档 0 关 / 1 省 / 1.5 标准 / 2 高 / 3 极致，选哪档就一直按哪档画（不自动降级）。
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
HD.auto = false;             // 旧接口：没有“自动”档了（不做任何自动降级），恒为 false
HD.selfLoop = true;          // 模块自己每帧合成；界面主循环显式调 HD2D.present(now) 时设成 false
HD.lite = true;              // “标准”档（记作 1.5）：2 档去掉移轴那一遍，默认用它；HD2D.setQuality(2) 是“高”，全开
HD.ctx = null;               // 场景画布的 2d 上下文（= 人物层）
HD.stats = { ms: 0, frame: 16.7, q: 0 };
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
  try { const m = /[?&]hd=([\w.]+)/.exec(root.location.search); if (m) v = m[1]; else v = root.localStorage.getItem('xm_hd'); } catch (e) { v = null; }
  return v;
}
// 五个固定档：0 关 / 1 省 / 1.5 标准（默认）/ 2 高 / 3 极致。玩家选哪档就一直按哪档画——掉帧也不隔帧、不降分辨率、不降档（不做任何自动降级）。
// 存档里旧的 'auto' 当“标准”
function defaultQ() {
  const nav = root.navigator || {};
  if (nav.webdriver) return 0;   // 自动化测试（无头浏览器没有 GPU，多出来的每帧开销会挪动那些按毫秒掐点的用例）：默认不开；测高清用 ?hd=1～3（tools/hd2d_*.js）
  return 1.5;
}
function prefQ(v) { const f = v === 'auto' ? 1.5 : parseFloat(v) || 0; HD.lite = f === 1.5; return HD.lite ? 2 : clamp(Math.round(f), 0, 3); }
(function initPref() {
  const v = readPref();
  HD.q = prefQ(v === null || v === undefined || v === 'auto' ? defaultQ() : v);
})();
HD.setQuality = function (q) {
  q = prefQ(q);
  try { root.localStorage.setItem('xm_hd', HD.lite ? '1.5' : String(q)); } catch (e) { /* 无存储 */ }
  const was = HD.q; HD.q = q; HD.stats.q = q;
  if (main) { if (q > 0 && !HD.on) enable(); else if (q === 0 && HD.on) disable(); else sizePresent(true); }
  if (HD.skin) HD.skin();   // 换档时界面皮肤跟着开关
  if (HD.onQuality) HD.onQuality(q);
  return q;
};
HD.cap3 = 800;               // 3 档合成画布的宽度上限（设备像素）
// 当前档（1 / 1.5 / 2 / 3）
function effLevel() { return HD.q === 2 && HD.lite ? 1.5 : HD.q; }
HD.level = effLevel;
HD.opts = { dof: true, bloom: true, rays: true, parts: true, grade: true, cam: true, rim: true, shadow: true, upres: true, skin: true, ca: false, fg: true, tilt: true, punch: 0.34, vivid: 0.28 };   // 单项开关（调试 / 降级）；punch / vivid：3 档调色层的对比 / 饱和力度（见 gradeLayer）

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
// 2 倍密度下重新打光：把每一行里同一块颜色（衣、发、肤、皮毛）当成一段圆柱面——左侧三分之一处一条受光带、右缘转暗偏冷；
// 宽的布面再压几道斜向的衣褶（一暗一亮两条细线）；深色的头发加一道竖向的高光。乘在原画自己的明暗上，色阶因此多出两三级
function relight(d, w, h, amt) {
  amt = amt === undefined ? 1 : amt;
  const lum = i => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      let i = (y * w + x) * 4;
      if (d[i + 3] < 250) { x++; continue; }
      const x0 = x, r0 = d[i], g0 = d[i + 1], b0 = d[i + 2];
      let pr = r0, pg = g0, pb = b0;
      x++;
      while (x < w) {   // 相邻像素颜色接近（同一块料子上的明暗过渡）就算同一段
        i = (y * w + x) * 4; if (d[i + 3] < 250) break;
        const dd = Math.abs(d[i] - pr) + Math.abs(d[i + 1] - pg) + Math.abs(d[i + 2] - pb), d0 = Math.abs(d[i] - r0) + Math.abs(d[i + 1] - g0) + Math.abs(d[i + 2] - b0);
        if (dd > 70 || d0 > 150) break;
        pr = d[i]; pg = d[i + 1]; pb = d[i + 2]; x++;
      }
      const len = x - x0; if (len < 10) continue;
      const L0 = r0 * 0.3 + g0 * 0.59 + b0 * 0.11, sat = Math.max(r0, g0, b0) - Math.min(r0, g0, b0), dark = L0 < 78, skin = r0 > 170 && r0 > g0 && g0 > b0 && r0 - b0 < 120, cloth = len >= 22 && sat > 45 && !dark && !skin;
      for (let k = 0; k < len; k++) {
        const j = (y * w + x0 + k) * 4, u = k / (len - 1);
        let f = u < 0.1 ? 1 : u < 0.36 ? 1.1 : u < 0.68 ? 1 : u < 0.86 ? 0.9 : 0.8, cool = u >= 0.68 ? (u < 0.86 ? 4 : 9) : 0;
        if (dark) f = u > 0.16 && u < 0.3 ? 1.38 : u >= 0.3 && u < 0.36 ? 1.16 : u > 0.8 ? 0.86 : 1;
        if (skin) f = 1 + (f - 1) * 0.4;   // 脸和手只要很轻的过渡
        f = 1 + (f - 1) * amt;
        if (cloth && y > h * 0.3) { const m = (k + (y >> 1) + ((x0 * 7) % 5)) % 11; if (m === 7) f *= 0.87; else if (m === 8) f *= 1.07; }
        d[j] = Math.min(255, d[j] * f + (dark && f > 1.1 ? 6 : 0)); d[j + 1] = Math.min(255, d[j + 1] * f + (dark && f > 1.1 ? 8 : 0)); d[j + 2] = Math.min(255, d[j + 2] * f + cool + (dark && f > 1.1 ? 16 : 0));
      }
    }
  }
}
// 2 倍密度下补体积感：迎光（左上）一侧把描边收细半个像素、内侧提一线高光；背光（右下）内侧压一线偏冷的暗部
function volume(d, w, h) {
  relight(d, w, h);
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
  if (u === undefined) {
    if (c._hdNative) { try { u = c._hdNative(); const g = u.getContext('2d'), id = g.getImageData(0, 0, u.width, u.height); const amt = u._relit === undefined ? 0.6 : u._relit; if (amt > 0) { relight(id.data, u.width, u.height, amt); g.putImageData(id, 0, 0); } u._hd = S; } catch (e) { u = null; } }   // 手工重画稿：只叠一层轻一点的打光
    if (!u) u = scale2x(c, !c._hdOK && HD.opts.volume !== false);
    upCache.set(c, u);
  }
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
    let L = layers[n]; if (!L) L = layers[n] = { c: mkc(w, h), used: false, k }; if (L.c.width !== w || L.c.height !== h) { L.c.width = w; L.c.height = h; } if (!L.g) { L.g = L.c.getContext('2d'); L.g.drawImage = shimDraw(L.g.drawImage.bind(L.g)); if (n === 'fore') trackRows(L); if (n === 'ground') trackSrc(L); } L.g.imageSmoothingEnabled = false; }
  sizePresent(true);
}
// 地面层这一帧画进了哪些“大张静态底图”（_hdOK：洞府地形、对决舞台）：拼成一个签名，地形换了（洞府升级、换季）不透明段就重算（opaqueBand）
let bidN = 0;
function trackSrc(L) { const d0 = L.g.drawImage; L.sig = 0; L.g.drawImage = function (img) { if (img && img._hdOK === 1) { if (!img._bid) img._bid = ++bidN; L.sig = (L.sig * 31 + img._bid) | 0; } return d0.apply(this, arguments); }; }
// 记下这一层这一帧画到了哪几行（图层像素）：前景层合成时只画这一条。路径 / 回写像素这类量不出范围的，当整层都有
function trackRows(L) {
  const g0 = L.g, di = g0.drawImage, fr = g0.fillRect.bind(g0), full = () => { L.y0 = -1e9; L.y1 = 1e9; };
  L.y0 = 1e9; L.y1 = -1e9;
  const tr = (y, h) => { const m = g0.getTransform(); if (m.b || m.c) { full(); return; } let a = m.d * y + m.f, b = m.d * (y + h) + m.f; if (a > b) { const t = a; a = b; b = t; } if (a < L.y0) L.y0 = a; if (b > L.y1) L.y1 = b; };
  g0.drawImage = function (img, a, b, c, d, e, f, g9, h9) { const n = arguments.length; if (n === 3) tr(b, img.height / (img._hd || 1)); else if (n === 5) tr(b, d); else tr(f, h9); return di.apply(g0, arguments); };
  g0.fillRect = function (x, y, w, h) { tr(y, h); return fr(x, y, w, h); };
  for (const m of ['fill', 'stroke', 'putImageData', 'fillText', 'strokeRect']) { const o = g0[m].bind(g0); g0[m] = function () { full(); return o.apply(null, arguments); }; }
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
  // 1、2 档按高清像素（400 宽）合成，交给浏览器放大；3 档按设备像素合成、但封顶 HD.cap3（800 = 高清像素的 2 倍：人物与地面仍是整数倍最近邻，光与粒子比 2 档细一倍）。
  // 原来 3 档直接用设备像素，骁龙 8 Elite 这类 dpr 3.5 的手机上是 1400×1550，每帧十几遍整屏合成
  const dev = Math.round(r.width * dpr) || 200 * S;
  let w = 200 * S;
  if (HD.q >= 3) w = Math.max(200 * S, Math.min(dev, HD.cap3 || 800));
  const h = Math.round(w * logicH / 200);
  if (force || w !== Pw || h !== Ph) {
    Pw = w; Ph = h; if (pc.width !== w) pc.width = w; if (pc.height !== h) pc.height = h; pg = pc.getContext('2d');
    pc.style.filter = '';   // 3 档的对比度 / 饱和度原来是这里的 CSS 滤镜（安卓 WebView 上大画布每帧都要离屏过一遍），现在烘进合成（gradeLayer）
    pc.style.imageRendering = HD.q < 3 || w < dev - 1 ? 'pixelated' : 'auto';
  }
}

// ---------- 每帧的场景描述（art.js 的各 draw* 往里写） ----------
const F = { kind: '', key: '', OY: 0, t: 0, age: 99, lights: [], amb: null, dark: 0, sun: null, moon: null, sky: null, scroll: 0, prof: null, season: 0 };
HD.F = F;
// art.js：一帧背景开画。返回 true 表示接管（之后用 HD2D.layer(name) 换图层，画完 HD2D.end()）
HD.begin = function (kind, info) {
  if (!HD.on) return false;
  info = info || {};
  if (HD.probe) beginT = root.performance.now();
  F.kind = kind; F.key = info.key || kind; F.OY = info.OY || 0; F.t = info.t || 0; F.age = 0; F.lights.length = 0; F.amb = null; F.dark = info.dark || 0;
  F.sun = info.sun || null; F.moon = info.moon || null; F.keyL = null; F.rays = null; F.motes = null; F.gradeC = null; F.gradeA = undefined; F.sky = info.sky || null; F.scroll = info.scroll || 0; F.season = info.season || 0;
  F.prof = profile(kind, F.key);
  F.shaded = F.rimmed = false;   // 这一帧的人物层还没加轮廓光、地面层还没落影（见 present）
  const FL = layers.fore; if (FL) { FL.y0 = 1e9; FL.y1 = -1e9; } if (layers.ground) layers.ground.sig = 0;
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
HD._layer = n => layers[n];   // 调试 / 测试用：取某一层（tools/hd2d_smoke.js 认地面层的天际线）
HD.owns = function (c) { for (const n of LNAMES) if (layers[n] && layers[n].g === c) return true; return false; };
// 一盏灯（逻辑坐标，已含 OY 的平移由 art.js 传进来之前换算好）
HD.light = function (x, y, r, c, a, kind) { if (F.lights.length < 64) F.lights.push({ x, y, r, c, a, kind: kind || 0 }); };
HD.night = function (sky, lights) { F.amb = sky && sky.amb && sky.amb !== '#ffffff' ? sky.amb : null; F.dark = sky ? 1 - sky.light : 0; if (lights) for (const l of lights) HD.light(l.x, l.y + F.OY, l.r, l.c, l.a * (0.35 + F.dark), 1); };

// ---------- 场景配置：景深、主光、体积光、粒子、调色 ----------
// focus：焦段（逻辑 y，不含 OY）——人物、建筑、平台站的那一带：这一带里地面与人物层逐像素清晰，辉光 / 体积光减半，移轴只虚它上面的远处，虚化近景不许伸进来（只留两角）
// blur：各层的虚化量（0 清晰，1 全虚）；key：主光方向（像素偏移，指向光源）与颜色；rays：体积光；motes：浮尘 / 萤火 / 火星；grade：柔光调色；fog：远景空气透视
const BASE = { blur: { sky: 0.35, far: 0.7, mid: 0.3, fore: 1 }, par: { sky: 0.12, far: 0.35, mid: 0.65, fore: -1.3 }, key: { dx: -1, dy: -1, c: '#fff1cc', a: 0.5 }, rays: null, motes: { n: 26, c: '#fff6d8', kind: 'dust' }, grade: { c: '#ffb070', a: 0.1 }, vig: 0.5, fog: null, feet: 0, gloss: 0, tilt: null, bloom: 0.4, lift: '#17122a', focus: null };
const PROF = {
  home: { blur: { sky: 0.3, far: 0.9, mid: 0.3, fore: 1 }, tilt: [26, 70], focus: [72, 150], bloom: 0.28, fg: { c: '#0a241c', c2: '#1c5236', kind: 'grass' }, drop: 0.07, motes: { n: 30, c: '#fff6d8', kind: 'dust' }, vig: 0.4, grade: { c: '#ffb070', a: 0.06 } },
  adv: { feet: 128, tilt: [26, 84], focus: [86, 136], fg: { c: '#0a241c', c2: '#1c5236', kind: 'grass', wide: 1 } },
  duel: { feet: 128, gloss: 0.16, tilt: [18, 82], focus: [84, 136], fg: { c: '#1a1630', c2: '#3a3458', kind: 'rock', top: false }, motes: { n: 18, c: '#fff6d8', kind: 'dust' } },
  // 历练地图
  'adv:forest': { key: { dx: -1, dy: -1, c: '#fff4c0', a: 0.55 }, rays: { x: 36, y: 18, c: '#fff2b8', a: 0.2, spread: 0.9, dir: 0.55 }, sun: { x: 36, y: 18, r: 46, c: '#fff0b0', a: 0.5 }, motes: { n: 36, c: '#f4ffb8', kind: 'dust' }, grade: { c: '#a8e070', a: 0.1 }, fog: { c: '#dff4d8', a: 0.22, y0: 70, y1: 126 } },
  'adv:hill': { fg: { c: '#2a1420', c2: '#6a3a30', kind: 'rock', wide: 1 },  key: { dx: 1, dy: -1, c: '#ffc890', a: 0.55 }, sun: { x: 150, y: 44, r: 50, c: '#ffb070', a: 0.5 }, rays: { x: 150, y: 44, c: '#ffb878', a: 0.14, spread: 1.1, dir: -0.5 }, motes: { n: 30, c: '#ffd8a0', kind: 'sand' }, grade: { c: '#ff8a5a', a: 0.14 }, fog: { c: '#c890a0', a: 0.2, y0: 80, y1: 126 } },
  'adv:tomb': { fg: { c: '#10142e', c2: '#2c3660', kind: 'rock', wide: 1 },  key: { dx: 1, dy: -1, c: '#b8c8ff', a: 0.5 }, motes: { n: 22, c: '#9af0c8', kind: 'wisp' }, grade: { c: '#5a70c8', a: 0.16 }, fog: { c: '#7a86b8', a: 0.28, y0: 84, y1: 128 }, vig: 0.7 },
  'adv:blood': { fg: { c: '#2a0a14', c2: '#6a1826', kind: 'rock', wide: 1 },  key: { dx: 0, dy: -1, c: '#ff6a5a', a: 0.5 }, motes: { n: 30, c: '#ff7a4a', kind: 'ember' }, grade: { c: '#c81e3c', a: 0.16 }, fog: { c: '#7a1428', a: 0.26, y0: 80, y1: 128 }, vig: 0.7 },
  'adv:swords': { fg: { c: '#1c2c44', c2: '#5a7ea8', kind: 'rock', wide: 1 },  key: { dx: -1, dy: -1, c: '#d8f0ff', a: 0.6 }, rays: { x: 60, y: -10, c: '#cfe8ff', a: 0.14, spread: 0.8, dir: 0.4 }, motes: { n: 28, c: '#cfe8ff', kind: 'wisp' }, grade: { c: '#6aa8e0', a: 0.12 }, fog: { c: '#c8dcf0', a: 0.24, y0: 76, y1: 126 } },
  'adv:abyss': { fg: { c: '#160a26', c2: '#40206a', kind: 'rock', wide: 1 },  key: { dx: 0, dy: 1, c: '#b060ff', a: 0.5 }, motes: { n: 30, c: '#c070ff', kind: 'ember' }, grade: { c: '#6a28b0', a: 0.18 }, fog: { c: '#3a1458', a: 0.3, y0: 84, y1: 130 }, vig: 0.8 },
  'adv:sea': { fg: { c: '#0a3a4a', c2: '#2a8a9a', kind: 'grass', wide: 1 },  key: { dx: -1, dy: -1, c: '#c8fff4', a: 0.55 }, rays: { x: 80, y: -20, c: '#a8f0ff', a: 0.2, spread: 1.3, dir: 0.2 }, motes: { n: 34, c: '#d8fff8', kind: 'bubble' }, grade: { c: '#28b0c8', a: 0.14 }, fog: { c: '#5ac8d8', a: 0.2, y0: 70, y1: 126 } },
  'adv:stars': { fg: { c: '#141234', c2: '#3a3a7a', kind: 'rock', wide: 1 },  key: { dx: 1, dy: -1, c: '#ffe8a0', a: 0.55 }, motes: { n: 34, c: '#ffe8a0', kind: 'wisp' }, grade: { c: '#6a5ad8', a: 0.14 }, vig: 0.7, bloom: 0.45 },
  'adv:palace': { fg: { c: '#4a3a1a', c2: '#a88a40', kind: 'rock', wide: 1 },  key: { dx: -1, dy: -1, c: '#fff0b0', a: 0.6 }, rays: { x: 100, y: -20, c: '#ffe8a0', a: 0.2, spread: 1.4, dir: 0 }, motes: { n: 34, c: '#ffe8a0', kind: 'dust' }, grade: { c: '#ffc850', a: 0.14 }, fog: { c: '#fff0c8', a: 0.2, y0: 70, y1: 124 }, bloom: 0.5 },
  'adv:chaos': { fg: { c: '#120a20', c2: '#3a1a5a', kind: 'rock', wide: 1 },  key: { dx: 0, dy: -1, c: '#c85aff', a: 0.5 }, motes: { n: 34, c: '#3ad8c8', kind: 'ember' }, grade: { c: '#6a1aa0', a: 0.16 }, vig: 0.85, bloom: 0.55 },
  // 对决舞台与秘境
  'duel:town': { key: { dx: 1, dy: -1, c: '#ffc890', a: 0.55 }, grade: { c: '#ff9a5a', a: 0.13 }, motes: { n: 20, c: '#ffe0b0', kind: 'dust' } },
  'duel:cloud': { key: { dx: -1, dy: -1, c: '#ffffff', a: 0.6 }, rays: { x: 100, y: -20, c: '#ffffff', a: 0.16, spread: 1.4, dir: 0 }, grade: { c: '#8ac8ff', a: 0.1 }, gloss: 0.22, bloom: 0.22 },
  'duel:sect': { key: { dx: -1, dy: -1, c: '#fff1cc', a: 0.55 }, grade: { c: '#ffb070', a: 0.1 } },
  'duel:wild': { fg: { c: '#101a30', c2: '#2a4a50', kind: 'grass' },  key: { dx: 1, dy: -1, c: '#d0d8ff', a: 0.5 }, motes: { n: 20, c: '#e8ff9a', kind: 'fly' }, grade: { c: '#5a70c8', a: 0.12 }, fog: { c: '#c8c0e0', a: 0.16, y0: 96, y1: 128 }, vig: 0.65 },
  'duel:sect_mo': { key: { dx: 0, dy: -1, c: '#ff6a5a', a: 0.5 }, motes: { n: 26, c: '#8aff8a', kind: 'ember' }, grade: { c: '#c81e3c', a: 0.16 }, vig: 0.8, fog: { c: '#5a2a78', a: 0.22, y0: 100, y1: 132 } },
  'duel:r_jin': { key: { dx: -1, dy: -1, c: '#e8f0ff', a: 0.6 }, motes: { n: 24, c: '#e8f0ff', kind: 'wisp' }, grade: { c: '#a0b8e0', a: 0.12 }, gloss: 0.2 },
  'duel:r_mu': { fg: { c: '#0a241c', c2: '#1c5236', kind: 'grass' },  key: { dx: -1, dy: -1, c: '#e8ffb8', a: 0.55 }, rays: { x: 60, y: -10, c: '#e8ffb8', a: 0.18, spread: 1, dir: 0.4 }, motes: { n: 30, c: '#d8ff9a', kind: 'fly' }, grade: { c: '#70c850', a: 0.12 } },
  'duel:r_huo': { key: { dx: 0, dy: 1, c: '#ff9a4a', a: 0.6 }, motes: { n: 34, c: '#ffb04a', kind: 'ember' }, grade: { c: '#ff5a1e', a: 0.16 }, vig: 0.7, bloom: 0.45 },
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
  // 三角形的两条边是硬的（靠近顶点处渐变带比光束宽，被路径裁掉）：整张缩小再放大糊一遍
  const s = mkc(64, 64), sg = s.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(t, 0, 0, 64, 64);
  g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(s, 0, 0, 256, 256);
  tex[k] = t; return t;
}
// 虚化近景：按 120×(H/2) 画剪影（底边一排草丛 / 乱石，两角高、中间低；左上角探进来一根枝条），缩小再放大糊两遍
function fgTex(fg, H, season, lim) {
  const k = 'fg' + fg.c + fg.kind + H + '|' + season + '|' + lim; let t = tex[k]; if (t) return t;
  const scroll = !!fg.wide, w = scroll ? 240 : 132, hh = Math.ceil(H / 2), a = mkc(w, hh), g = a.getContext('2d');
  let c0 = fg.c, c1 = fg.c2 || mix(fg.c, '#ffffff', 0.18);
  if (season === 2) { c0 = mix(c0, '#7a3a14', 0.55); c1 = mix(c1, '#e08a3a', 0.6); } else if (season === 3) { c0 = mix(c0, '#141a36', 0.75); c1 = mix(c0, '#8fa0d0', 0.3); } else if (season === 0) c1 = mix(c1, '#f7a8c4', 0.35);
  // 稀疏：不卷动的场景只在两角各 15% 的宽度里长几丛（中间七成留给人物和平台）；卷动的地图隔三差五一丛。高度不超过 lim（焦段下沿以下）
  const n = scroll ? 34 : 26;
  for (let i = 0; i < n; i++) {
    const u = (i + hash(i * 3 + 7) * 0.8) / n, x = u * w, side = Math.abs(u - 0.5) * 2;
    if (scroll ? hash(i * 11 + 5) > 0.42 : side < 0.7) continue;
    const edge = scroll ? 0.5 + 0.5 * Math.sin(u * 9.4) : (side - 0.7) / 0.3, ht = Math.min(lim, (scroll ? 5 + edge * 6 : 5 + edge * 15) + hash(i * 5 + 1) * 4);
    g.fillStyle = i % 4 ? c0 : c1;
    if (fg.kind === 'rock') { g.beginPath(); g.moveTo(x - 7, hh + 1); g.lineTo(x - 3, hh - ht * 0.7); g.lineTo(x + 2, hh - ht * 0.85); g.lineTo(x + 7, hh + 1); g.fill(); }
    else for (let b = 0; b < 4; b++) { const lean = (b - 1.5) * 0.5 + (hash(i * 13 + b) - 0.5) * 0.4, bh = ht * (0.6 + hash(i * 17 + b) * 0.4); g.save(); g.translate(x + (b - 1.5) * 2.5, hh + 2); g.rotate(lean); g.beginPath(); g.ellipse(0, -bh * 0.5, 2.6 + bh * 0.09, bh * 0.52, 0, 0, 6.3); g.fill(); g.restore(); }   // 一丛 = 四片向外撇开的宽叶
  }
  if (!scroll && fg.top !== false) {   // 左上角的枝叶
    g.strokeStyle = c0; g.lineWidth = 3; g.beginPath(); g.moveTo(-2, 6); g.quadraticCurveTo(14, 13, 30, 9); g.stroke(); g.lineWidth = 1.6; g.beginPath(); g.moveTo(10, 10); g.quadraticCurveTo(17, 18, 23, 21); g.stroke();
    for (let i = 0; i < 18; i++) { const x = 2 + hash(i * 7 + 2) * 30, y = 3 + hash(i * 7 + 3) * 20 * (1 - x / 52); g.fillStyle = i % 3 ? c0 : c1; g.beginPath(); g.ellipse(x, y, 4.4, 2, hash(i) * 3, 0, 6.3); g.fill(); }
  }
  const b = mkc(Math.ceil(w / 3), Math.ceil(hh / 3)), bg = b.getContext('2d'); bg.imageSmoothingEnabled = true; bg.drawImage(a, 0, 0, b.width, b.height);
  t = mkc(w, hh); const tg = t.getContext('2d'); tg.imageSmoothingEnabled = true; tg.drawImage(b, 0, 0, w, hh); tg.globalAlpha = 0.25; tg.drawImage(a, 0, 0);
  // 合成时只画两条（底边、左上角）：这里把两条的内缘羽化到全透明，画出来就不会有矩形的硬边
  const fin = mkc(w, hh), fg2 = fin.getContext('2d'), piece = (sx, sy, sw, sh, fade) => {
    const pc2 = mkc(sw, sh), pg2 = pc2.getContext('2d'); pg2.drawImage(t, sx, sy, sw, sh, 0, 0, sw, sh); pg2.globalCompositeOperation = 'destination-in';
    for (const f of fade) { const gr = pg2.createLinearGradient(f[0] * sw, f[1] * sh, f[2] * sw, f[3] * sh); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); pg2.fillStyle = gr; pg2.fillRect(0, 0, sw, sh); }
    fg2.drawImage(pc2, sx, sy);
  };
  const bot = Math.min(hh, FG_BOT), topH = Math.min(hh, FG_TOP);
  piece(0, hh - bot, w, bot, [[0, 0, 0, 0.3]]);
  if (!scroll && fg.top !== false) piece(0, 0, FG_TOPW, topH, [[1, 0, 0.6, 0], [0, 1, 0, 0.6]]);
  tex[k] = fin; return fin;
}
const FG_BOT = 34, FG_TOP = 32, FG_TOPW = 44;   // 两条的尺寸（半分辨率像素）
function vigTex() {
  let t = tex.vig; if (t) return t;
  t = mkc(96, 96); const g = t.getContext('2d'), gr = g.createRadialGradient(48, 44, 22, 48, 48, 72);
  gr.addColorStop(0, 'rgba(8,6,20,0)'); gr.addColorStop(0.5, 'rgba(8,6,20,.03)'); gr.addColorStop(0.72, 'rgba(8,6,20,.22)'); gr.addColorStop(1, 'rgba(8,6,20,.82)');   // 中间一大块不压：暗角只收四缘
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96); tex.vig = t; return t;
}

// ---------- 合成 ----------
// 一层缩到一半（双线性）：虚化用的小图。合成前先备好（见 present 第一步），画呈现画布时就不用中途切去别的画布
function halfOf(L, name) { const b = buf('s_' + name, Math.ceil(L.c.width / 2), Math.ceil(L.c.height / 2)); b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(L.c, 0, 0, b.c.width, b.c.height); return b.c; }
function softLayer(g, L, amt, dx, dy, zoom, name, q, rows, half) {
  // 把一层画到呈现画布（或背景小缓冲，见 present 第 1 步；坐标一律按呈现画布写，小缓冲那边由变换折算）。amt = 0：最近邻（清晰）；amt ≥ 0.6：先缩到一半再双线性放大（虚）；之间：直接双线性放大（微虚）。3 档时中间量是“清晰底 + 一层柔化”
  // rows：只画这一层有内容的那几行（[y0, y1)，图层像素；洞府前景层的云海只占底下一条，不必整屏画一遍）
  const w = Pw * zoom, h = Ph * zoom, x = (Pw - w) / 2 + dx, y = (Ph - h) / 2 + dy;
  if (!HD.opts.dof || q < 2) amt = amt >= 1 ? 0.99 : 0;
  const lw = L.c.width, lh = L.c.height, r0 = rows ? clamp(rows[0], 0, lh) : 0, r1 = rows ? clamp(rows[1], r0, lh) : lh, ky = h / lh;
  if (r1 <= r0) return;
  if (amt <= 0) { g.imageSmoothingEnabled = false; g.drawImage(L.c, 0, r0, lw, r1 - r0, x, y + r0 * ky, w, (r1 - r0) * ky); return; }
  if (q >= 3 && amt < 0.5) { g.imageSmoothingEnabled = false; g.drawImage(L.c, x, y, w, h); g.globalAlpha = Math.min(1, amt * 1.6); g.imageSmoothingEnabled = true; g.drawImage(L.c, x, y, w, h); g.globalAlpha = 1; return; }
  g.imageSmoothingEnabled = true;
  if (amt >= 0.6) {
    const b = half || halfOf(L, name), bh = b.height, kb = h / bh, s0 = Math.floor(r0 / 2), s1 = Math.min(bh, Math.ceil(r1 / 2));
    g.drawImage(b, 0, s0, b.width, s1 - s0, x, y + s0 * kb, w, (s1 - s0) * kb);
  } else g.drawImage(L.c, 0, r0, lw, r1 - r0, x, y + r0 * ky, w, (r1 - r0) * ky);
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
function drawMotes(g, m, t, u, OY, H, q) {
  const n = (q === undefined ? HD.q : q) >= 2 ? m.n : Math.round(m.n * 0.5), K = MOTE[m.kind] || MOTE.dust, tx = glowTex(m.c);
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
// 暗角预先铺成一张高清像素分辨率（400 宽）的整图：每帧按最近邻贴一次，不用每帧把 96 像素的小图双线性放大到整屏
function vigFull(w, h) {
  const k = 'vf' + w + 'x' + h; let t = tex[k]; if (t) return t;
  for (const k2 in tex) if (k2.startsWith('vf')) delete tex[k2];
  t = mkc(w, h); const g = t.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(vigTex(), 0, 0, w, h); tex[k] = t; return t;
}
// 3 档的“调色层”：一张高清像素分辨率（400 宽）的不透明图，整张以柔光叠一次，一并做三件事——原来是一次柔光填色 + 每帧平铺的颗粒 + 呈现画布上的 CSS 对比度 / 饱和度滤镜（安卓 WebView 上大画布每帧过一遍 CSS 滤镜很贵）：
//   ① 主调：底色 = 0.5 + a·(主调色 − 0.5)。柔光在叠色 ≤ 0.5 / > 0.5 两段里各自对叠色是线性的，所以这和“主调色、不透明度 a 的柔光填色”逐像素相等；
//   ② 对比 / 饱和：按 HD.opts.punch 混进画面的缩小图（柔光叠自己 ≈ 按通道拉开中间调：亮的更亮、暗的更暗），按 HD.opts.vivid 混进“缩小图 − 它的亮度”（颜色更纯）。缩小图是低频的，细节不会被涂糊；
//   ③ 颗粒：一张 128 的黑白点按高清像素平铺上去，只在 0.5 上下几个色阶里摆动——柔光自然在中间调最明显、死黑与高光里看不出，和原来的“叠加”颗粒一个脾气。
// 这张图 4 帧才重做一次（颗粒每秒跳 15 次；缩小图本来就是低频的），其余帧直接贴
const GRAIN_A = 0.085;
let gradeN = 0, gradeKey = '';
function grainTex() {
  let t = tex.grain; if (t) return t;
  t = mkc(128, 128); const g = t.getContext('2d'), d = g.createImageData(128, 128);
  for (let i = 0; i < 128 * 128; i++) { const v = (hash(i * 3 + 11) - 0.5) * 2, c = v > 0 ? 255 : 0; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = c; d.data[i * 4 + 3] = Math.round(Math.abs(v) * 255); }
  g.putImageData(d, 0, 0); tex.grain = t; return t;
}
function gradeLayer(gc, ga, t, grain, smFn) {
  const B = clamp(+HD.opts.punch || 0, 0, 0.6), V = clamp(+HD.opts.vivid || 0, 0, 0.3), W2 = 200 * S, H2 = logicH * S, gb = buf('grade', W2, H2), gg = gb.g, key2 = gc + ga.toFixed(3) + B + V + W2 + 'x' + H2 + (grain ? 1 : 0);
  if (key2 === gradeKey && (++gradeN & 3)) return gb.c;
  gradeKey = key2; gradeN = 0;
  // 目标：叠色 = 0.5 + a·(主调 − 0.5) + B·(缩小图 − 0.5) + V·(缩小图 − 缩小图的亮度)。后一项让比亮度高的通道再高一点、低的再低一点，就是饱和度。
  // 画法：底色 x 上以 B + V 的不透明度叠缩小图，再以 V 的强度加（lighter）一张“1 − 亮度”图 → x·(1 − B − V) + (B + V)·缩小图 + V·(1 − 亮度)；x 由此反解
  const C = rgb(gc), base = C.map(v => clamp(Math.round(255 * (0.5 * (1 - B) + ga * (v / 255 - 0.5) - V) / (1 - B - V)), 0, 255));
  gg.setTransform(1, 0, 0, 1, 0, 0); gg.globalAlpha = 1; gg.globalCompositeOperation = 'source-over';
  gg.fillStyle = 'rgb(' + base.join(',') + ')'; gg.fillRect(0, 0, W2, H2);
  const sm = smFn(), sw = sm.width, sh = sm.height;   // 画面的缩小图（present 拿背景小缓冲、地面层、人物层、光照图拼的，不回读呈现画布）
  gg.imageSmoothingEnabled = true; gg.globalAlpha = B + V; gg.drawImage(sm, 0, 0, W2, H2);
  if (V > 0) {
    const li = buf('gradeL', sw, sh), lg = li.g; lg.globalAlpha = 1; lg.globalCompositeOperation = 'copy'; lg.drawImage(sm, 0, 0);
    lg.globalCompositeOperation = 'saturation'; lg.fillStyle = '#808080'; lg.fillRect(0, 0, sw, sh);   // 去色 → 亮度
    lg.globalCompositeOperation = 'difference'; lg.fillStyle = '#ffffff'; lg.fillRect(0, 0, sw, sh);   // → 1 − 亮度
    gg.globalCompositeOperation = 'lighter'; gg.globalAlpha = V; gg.drawImage(li.c, 0, 0, W2, H2); gg.globalCompositeOperation = 'source-over';
  }
  if (grain) { const gt = grainTex(), ox = (hash((t / 66) | 0) * 128) | 0, oy = (hash(((t / 66) | 0) + 9) * 128) | 0; gg.globalAlpha = GRAIN_A; gg.imageSmoothingEnabled = false; for (let y = -oy; y < H2; y += 128) for (let x = -ox; x < W2; x += 128) gg.drawImage(gt, x, y); }
  gg.globalAlpha = 1;
  return gb.c;
}
let lastNow = 0, covered = false, inPresent = false;
// 测帧打点（tools/hd2d_perf.js）：HD2D.probe = {} 时，合成的每个阶段之后回读 1 个像素逼浏览器把这一段真画完，各段耗时累加进 probe.t[段名]，帧数在 probe.n。
// 回读本身有开销（还会让浏览器把画布挪到 CPU 上），只用来看分解，帧间隔另外不开打点量
let PR = null, prT = 0, beginT = 0;
function pmark(name, c) { if (!PR || !c) return; try { c.getContext('2d').getImageData(0, 0, 1, 1); } catch (e) { /* 无 */ } const n = root.performance.now(); PR.t[name] = (PR.t[name] || 0) + n - prT; prT = n; }   // 备料那一步各项：回读那张小缓冲
function mark(name) { if (!PR) return; try { pg.getImageData(0, 0, 1, 1); } catch (e) { /* 跨域图不会出现在这里 */ } const n = root.performance.now(); PR.t[name] = (PR.t[name] || 0) + n - prT; prT = n; }
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
  PR = HD.probe && F.age <= 1 ? HD.probe : null;
  if (PR) { PR.t = PR.t || {}; PR.n = (PR.n || 0) + 1; try { mctx.getImageData(0, 0, 1, 1); for (const n of LNAMES) if (layers[n].used) layers[n].g.getImageData(0, 0, 1, 1); } catch (e) { /* 无 */ } prT = root.performance.now(); PR.t.scene = (PR.t.scene || 0) + prT - beginT; }
  if (F.age > 4) {   // 这几帧没有哪个场景开画（开场、黑屏）：原样放大
    g.imageSmoothingEnabled = false; g.clearRect(0, 0, Pw, Ph); g.drawImage(main, 0, 0, Pw, Ph); return;
  }
  const lv = effLevel(), q = lv >= 3 ? 3 : lv >= 1.5 ? 2 : lv, lite = lv === 1.5;
  const P = F.prof || BASE, u = Pw / 200, OY = F.OY, H = logicH, t = now, O = HD.opts, big = Pw >= 2 * 200 * S;   // big：呈现画布是高清像素的 2 倍（3 档 800 宽）
  const key = F.keyL || P.key;
  const cx = O.cam ? (Math.sin(t / 9100) * 1.6 + Math.sin(t / 23000) * 1.1) * u : 0, cy = O.cam ? Math.sin(t / 13000) * 0.6 * u : 0;
  const lay = n => layers[n].used ? layers[n] : null;
  const lw = raw.getW(), lh = raw.getH(), W2 = 200 * S, H2 = logicH * S;
  // ======== 第一步：备料。只往小缓冲 / 图层里画，不碰呈现画布 ========
  // 这样第二步往呈现画布上画时一口气画完，中途不切去别的画布（手机 GPU 是分块渲染的，每切一次目标，整张呈现画布就要从显存读回再写出一遍）
  // 1 背景（天空、日月光晕、远景、空气透视、中景）。2 档起这几层本来就要虚：先按逻辑分辨率（3 档按高清像素）合进一张小缓冲，第二步整张放大一次——原来是每层各画一遍整屏（3 档天与中景还各两遍）。
  //   小缓冲按 1.03 倍、跟着“锚定层”（有中景用中景，没有用天空）的视差偏移画回去，所以 2 档的锚定层在里面正好 1:1、清晰度不变；其余层相对它的视差差值在小缓冲里按亚像素画。
  //   3 档的“清晰底 + 一层柔化”在 2 倍的小缓冲里做好，第二步只要一遍双线性
  //   背景各层变得很慢（星星闪、云一个像素一个像素地挪），不卷动时这张小缓冲隔帧才重做一次；历练路上在卷动，每帧都做
  const GL = lay('ground'), band = GL ? opaqueBand(GL) : null;   // 地面层整行不透明的那一段：背景在那里被盖住，第二步不画
  let bgg = null;
  if (q >= 2) {
    const anc = lay('mid') ? 'mid' : 'sky', kb = q >= 3 ? 2 : 1, bb = buf('bg', 200 * kb, H * kb), Z = 1.03, bw0 = bb.c.width;
    const ax = cx * P.par[anc], ay = cy * P.par[anc], s = Pw * Z / bw0, x0 = (Pw - Pw * Z) / 2 + ax, y0 = (Ph - Ph * Z) / 2 + ay, bg = bb.g;
    const bkey = q + '|' + Pw + 'x' + Ph + '|' + F.kind + ':' + F.key + '|' + F.scroll + '|' + anc + '|' + (band ? band.join(',') : '');
    bgg = { c: bb.c, anc, ax, ay, Z };
    if (bkey !== bgKey || (++bgN & 1) === 0 || (band && band[0] === 0 && band[1] >= lh)) {
      bgKey = bkey; bgN = 0;
      bg.setTransform(1 / s, 0, 0, 1 / s, -x0 / s, -y0 / s); bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over';
      bg.fillStyle = '#0b0912'; bg.fillRect(x0, y0, Pw * Z, Ph * Z);
      if (!(band && band[0] === 0 && band[1] >= lh)) drawBack(bg, P, cx, cy, OY, u, q, anc, x0, Pw * Z);   // 地面整屏不透明（对决舞台）：背景一点都看不见，不画
      bg.setTransform(1, 0, 0, 1, 0, 0);
    }
  }
  pmark('p.bg', bgg && bgg.c);
  // 4 人物的投影 / 地面反光 / 软落影：画进地面层自己（高清像素分辨率，随地面一次贴上去，不另画整屏）
  if (GL && O.shadow && q >= 2 && !F.shaded && (P.feet || P.drop)) {
    F.shaded = true;   // 同一帧场景只落一次（隔帧 / 弹窗时同一帧会合成好几次）
    const G = GL.g; G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.globalAlpha = 1; G.globalCompositeOperation = 'source-over';
    if (P.feet) {   // 脚底在同一条线上的场景：人物层脚线以上的部分压成墨色，带切变倒着落在脚线以下；光滑的地面再叠一层倒影
      const fy = (P.feet + OY) * S, sb = buf('shadow', lw, lh), sg = sb.g;
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = 'copy'; sg.imageSmoothingEnabled = false; sg.drawImage(main, 0, 0, lw, fy, 0, 0, lw, fy);
      sg.globalCompositeOperation = 'source-in'; sg.fillStyle = '#0a0618'; sg.fillRect(0, 0, lw, lh);
      const sk = -(key.dx || 0) * 0.55, sy = 0.26;
      G.save(); G.beginPath(); G.rect(0, fy - 1, lw, lh); G.clip();
      G.setTransform(1, 0, -sk, -sy, fy * sk, fy * (1 + sy)); G.imageSmoothingEnabled = true; G.globalAlpha = 0.3; G.drawImage(sb.c, 0, 0);
      G.restore();
      if (P.gloss) {
        G.save(); G.beginPath(); G.rect(0, fy, lw, 26 * S); G.clip();
        G.setTransform(1, 0, 0, -0.8, 0, fy * 1.8 + S); G.globalAlpha = P.gloss; G.imageSmoothingEnabled = true; G.drawImage(main, 0, 0);
        G.restore();
      }
    } else {   // 脚底不在一条线上的场景（洞府）：人物层整体往右下落一层糊开的软影，把人和物“按”在地上
      const db = buf('drop', 100, Math.ceil(H / 2)), dg = db.g; dg.setTransform(1, 0, 0, 1, 0, 0); dg.globalCompositeOperation = 'copy'; dg.imageSmoothingEnabled = true; dg.drawImage(main, 0, 0, db.c.width, db.c.height);
      dg.globalCompositeOperation = 'source-in'; dg.fillStyle = '#0a0618'; dg.fillRect(0, 0, db.c.width, db.c.height);
      G.imageSmoothingEnabled = true; G.globalAlpha = P.drop; G.drawImage(db.c, -(key.dx || 0) * 1.6 * S, 2.4 * S, lw, lh);
    }
    G.restore();
  }
  pmark('p.shadow', GL && GL.c);
  // 4b 移轴：地面层上半截缩到四分之一再放大、按竖向渐变留下远处那一截
  let tilt = null;
  if (GL && P.tilt && O.dof && O.tilt && q >= 2 && !lite) {
    const b0 = buf('tilt0', 100, Math.ceil(H / 2)); b0.g.globalCompositeOperation = 'copy'; b0.g.imageSmoothingEnabled = true; b0.g.drawImage(GL.c, 0, 0, b0.c.width, b0.c.height);
    const b = buf('tilt', 200, H); b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(b0.c, 0, 0, 200, H);
    b.g.globalCompositeOperation = 'destination-in'; const gr = b.g.createLinearGradient(0, P.tilt[0] + OY, 0, P.tilt[1] + OY); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); b.g.fillStyle = gr; b.g.fillRect(0, 0, 200, H);
    tilt = big ? upTo('tiltU', b.c, W2, H2) : b.c;   // 3 档：先放大到高清像素分辨率，第二步按最近邻贴
  }
  pmark('p.tilt', tilt);
  // 6～7 轮廓光：人物层朝主光那一侧的边缘提亮（颜色跟主光 / 昼夜走），直接加进人物层自己（高清像素分辨率），第二步人物层一次贴上去
  if (O.rim && key && q >= 1 && !F.rimmed && key.a > 0.03) {
    F.rimmed = true;
    const rb = buf('rim', lw, lh), rg = rb.g;
    rg.setTransform(1, 0, 0, 1, 0, 0); rg.globalCompositeOperation = 'copy'; rg.imageSmoothingEnabled = false; rg.drawImage(main, 0, 0);
    rg.globalCompositeOperation = 'destination-out'; rg.drawImage(main, -(key.dx || 0), -(key.dy || 0));
    rg.globalCompositeOperation = 'source-in'; rg.fillStyle = key.c; rg.fillRect(0, 0, lw, lh);
    mctx.save(); raw.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'lighter'; mctx.globalAlpha = key.a; mctx.imageSmoothingEnabled = false; raw.drawImage(rb.c, 0, 0); mctx.restore();
  }
  pmark('p.rim', main);
  // 8 夜色：一张小的光照图——先铺深蓝的环境色，再把每盏灯（连同它落在地上的光池）加上去，第二步整张正片叠底到画面上。
  //   于是没灯的地方真的暗下去，灯下回到本色并染上灯的暖色；上沿用渐变接回山色（天与远山本来就是按夜色画的）。3 档先把它双线性放大到高清像素分辨率，第二步按最近邻贴（软件光栅下便宜三倍，GPU 上一样）
  let lm = null;
  if (F.amb) {
    const dk = clamp(F.dark / 0.58, 0, 1), lw2 = 100, lh2 = Math.ceil(H / 2), lb = buf('lm', lw2, lh2), lg = lb.g, ambD = mix(F.amb, '#070c30', 0.1 * dk);   // 比环境色再压一点（原来压九成，没灯的地方糊成一片黑，石缝屋檐都看不见了）
    lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalAlpha = 1; lg.globalCompositeOperation = 'source-over'; lg.fillStyle = ambD; lg.fillRect(0, 0, lw2, lh2);
    lg.globalCompositeOperation = 'lighter'; lg.imageSmoothingEnabled = true;
    if (F.moon && F.moon.a > 0.1) { lg.globalAlpha = 0.16 * F.moon.a; lg.fillStyle = '#8fa8ff'; lg.fillRect(0, 0, lw2, lh2); }   // 月光：整体提一点冷色
    for (const l of F.lights) {
      const tx = glowTex(l.c), x = l.x / 2, y = l.y / 2, r = l.r * (l.kind === 2 ? 0.8 : 1.15), a = clamp((l.kind === 2 ? 0.5 : 0.95) * (l.a + 0.2) * dk, 0, 1);
      lg.globalAlpha = a; lg.drawImage(tx, x - r, y - r, r * 2, r * 2);
      lg.globalAlpha = a * 0.7; lg.drawImage(tx, x - r * 1.7, y + r * 0.5, r * 3.4, r * 1.2);   // 落在地上的光池（压扁的椭圆）
    }
    lg.globalAlpha = 1; const y0 = (78 + OY) / 2, y1 = (96 + OY) / 2, gr = lg.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    lg.globalCompositeOperation = 'source-over'; lg.fillStyle = gr; lg.fillRect(0, 0, lw2, y1);
    lm = big ? upTo('lmU', lb.c, W2, H2) : lb.c;
  }
  pmark('p.night', lm);
  // 9 前景层（最虚）：缩一半的小图
  const FL = lay('fore'), foreRows = FL && FL.y1 > FL.y0 ? [Math.floor(FL.y0) - 3, Math.ceil(FL.y1) + 3] : null, foreHalf = foreRows ? halfOf(FL, 'fore') : null;
  pmark('p.fore', foreHalf);
  // 11 光缓冲（四分之一分辨率）：辉光 = 各层缩小 → 自乘两次只留高光 → 再缩一半糊开；体积光也画在这里面（本来就是软的）。3 档同样先放大到高清像素分辨率
  const rays = F.rays || P.rays, doBloom = O.bloom && q >= 2 && P.bloom > 0, doRays = rays && O.rays && q >= 2 && rays.a > 0.01;
  let bloom = null;
  if (doBloom || doRays) {
    const bw = Math.ceil(Pw / 5), bh = Math.ceil(bw * H / 200), a = buf('bloomA', bw, bh), ag = a.g, ub = bw / 200;
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
        ag.save(); ag.translate(rays.x * ub, (rays.y + OY * 0.6) * ub); ag.rotate(-(rays.dir || 0) + sway + (i ? 0.08 : 0)); ag.globalAlpha = clamp(al * 1.7, 0, 1);
        ag.drawImage(tx, -len * (rays.spread || 1) / 2, 0, len * (rays.spread || 1), len); ag.restore();
      }
    }
    if (P.focus) {   // 焦段里辉光与光柱压到三成（上下各羽化 10 个逻辑像素），不把人物和建筑罩成一片雾
      const f0 = (P.focus[0] + OY) * ub, f1 = (P.focus[1] + OY) * ub, fe = 10 * ub, gr = ag.createLinearGradient(0, f0 - fe, 0, f1 + fe), e = fe / (f1 - f0 + 2 * fe);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(e, 'rgba(0,0,0,.7)'); gr.addColorStop(1 - e, 'rgba(0,0,0,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ag.globalCompositeOperation = 'source-over'; ag.globalAlpha = 1; ag.fillStyle = gr; ag.fillRect(0, f0 - fe, bw, f1 - f0 + 2 * fe);
    }
    bloom = big ? upTo('bloomU', a.c, W2, H2) : a.c;
  }
  pmark('p.bloom', bloom);
  // 14 3 档的调色层（主调 + 对比 / 饱和 + 颗粒，见 gradeLayer）；缩小图从背景小缓冲、地面层、人物层、光照图拼，不回读呈现画布
  const gc = F.gradeC || (P.grade && P.grade.c) || '#808080', ga = P.grade ? P.grade.a * (F.gradeA === undefined ? 1 : F.gradeA) : 0;
  const grade = O.grade && q >= 3 ? gradeLayer(gc, ga, t, true, () => {
    const m = buf('gradeM', 200, H), mg = m.g; mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalAlpha = 1; mg.imageSmoothingEnabled = true;
    mg.globalCompositeOperation = 'copy'; if (bgg) mg.drawImage(bgg.c, 0, 0, 200, H); else { mg.fillStyle = '#0b0912'; mg.fillRect(0, 0, 200, H); }
    mg.globalCompositeOperation = 'source-over'; if (GL) mg.drawImage(GL.c, 0, 0, 200, H); mg.drawImage(main, 0, 0, 200, H);
    if (lm) { mg.globalCompositeOperation = 'multiply'; mg.drawImage(lm, 0, 0, 200, H); }
    const sm = buf('gradeS', 100, Math.ceil(H / 2)); sm.g.globalCompositeOperation = 'copy'; sm.g.imageSmoothingEnabled = true; sm.g.drawImage(m.c, 0, 0, sm.c.width, sm.c.height);
    return sm.c;
  }) : null;
  pmark('p.grade', grade);
  // ======== 第二步：一口气画到呈现画布 ========
  // 1～3 背景
  if (bgg) {   // 只画地面没盖住的那几行（上下两截）
    const bc = bgg.c, s = Pw * bgg.Z / bc.width, x0 = (Pw - Pw * bgg.Z) / 2 + bgg.ax, y0 = (Ph - Ph * bgg.Z) / 2 + bgg.ay, kp = Pw / lw;
    let amt = P.blur[bgg.anc]; if (!O.dof) amt = 0;
    g.imageSmoothingEnabled = amt > 0;
    const slice = (pa, pb) => { pa = Math.max(0, pa); pb = Math.min(Ph, pb); if (pb > pa) g.drawImage(bc, 0, (pa - y0) / s, bc.width, (pb - pa) / s, x0, pa, Pw * bgg.Z, pb - pa); };
    if (band && band[1] > band[0]) { slice(0, (band[0] + 2 * S) * kp); slice((band[1] - 2 * S) * kp, Ph); }
    else slice(0, Ph);
  }
  else drawBack(g, P, cx, cy, OY, u, q, '', 0, Pw);
  mark('bg');
  // 4 地面（焦平面，清晰）；上半截按移轴的办法稍稍虚掉
  if (GL) {
    g.imageSmoothingEnabled = false; g.drawImage(GL.c, 0, 0, Pw, Ph);
    if (tilt) { const th = Math.min(H, P.tilt[1] + OY + 1), kt = tilt.width / 200; g.imageSmoothingEnabled = !big; g.drawImage(tilt, 0, 0, tilt.width, th * kt, 0, 0, Pw, th * u); }   // 只画有虚化的那一截
  }
  mark('ground');
  // 5 人物身后的灵光（ART.glow 记下的那些）
  g.globalCompositeOperation = 'screen'; g.imageSmoothingEnabled = true;
  for (const l of F.lights) if (l.kind === 2) drawLight(g, l, u, 1);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 6 人物层（清晰，轮廓光已在里面）
  g.imageSmoothingEnabled = false; g.drawImage(main, 0, 0, Pw, Ph);
  mark('people');
  // 8 夜色
  if (lm) { g.globalCompositeOperation = 'multiply'; g.imageSmoothingEnabled = !big; g.drawImage(lm, 0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }
  else if (O.shadow) {   // 白天：人物身后的灵光在地上也落一圈
    g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    for (const l of F.lights) if (l.kind === 2) { const r = l.r * u * 1.7; g.globalAlpha = clamp(l.a * 0.55, 0, 1); g.drawImage(glowTex(l.c), l.x * u - r * 1.5, l.y * u + r * 0.35, r * 3, r * 0.9); }
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  mark('night');
  // 9 前景（最虚、视差最大）：只画这一层有内容的那几行（洞府的云海只在最底下一条）
  if (foreRows) softLayer(g, FL, P.blur.fore, cx * P.par.fore, 0, 1.05, 'fore', q, foreRows, foreHalf);
  if (P.fg && O.dof && O.fg && q >= 2) {   // 镜头跟前的草叶 / 枝条 / 乱石：预先糊好的一张，视差最大；历练时跟着卷动（比地面快）
    const flim = P.focus ? Math.max(4, Math.floor((160 - P.focus[1]) / 2) + (F.kind === 'home' ? 12 : 2)) : 24, ft = fgTex(P.fg, H, F.kind === 'home' ? F.season : -1, flim), fw = ft.width * (Pw / 120), sx = F.scroll ? -((F.scroll * 1.9 * u) % fw) : 0, ox = cx * -2.2 - (F.scroll ? 0 : fw * 0.05);
    g.imageSmoothingEnabled = true; g.globalAlpha = F.kind === 'home' ? 0.8 : 0.86;
    const fh = ft.height, bot = Math.min(fh, FG_BOT), topH = Math.min(fh, FG_TOP);   // 只画有东西的两条：底边的草丛、左上角的枝叶
    for (let x = sx + ox; x < Pw; x += fw) {
      g.drawImage(ft, 0, fh - bot, ft.width, bot, x, Ph - bot * Ph / fh, fw, bot * Ph / fh);
      if (!F.scroll && P.fg.top !== false) g.drawImage(ft, 0, 0, FG_TOPW, topH, x, 0, fw * FG_TOPW / ft.width, topH * Ph / fh);
    }
    g.globalAlpha = 1;
  }
  mark('fore');
  // 10 光源
  g.globalCompositeOperation = 'screen'; g.imageSmoothingEnabled = true;
  for (const l of F.lights) if (l.kind !== 2) drawLight(g, l, u, l.kind === 1 ? 1.1 : 0.8);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  mark('lights');
  // 11 辉光 + 体积光，一次加回去
  if (bloom) { g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = !big; g.drawImage(bloom, 0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }
  mark('bloom');
  // 13 高清粒子
  const motes = F.motes || P.motes;
  if (motes && O.parts) drawMotes(g, motes, t, u, OY, H, q);
  mark('motes');
  // 14 调色、暗角、色差
  if (O.grade) {
    if (grade) { g.globalCompositeOperation = 'soft-light'; g.imageSmoothingEnabled = false; g.drawImage(grade, 0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }
    else if (P.grade && q >= 2) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = hexA(gc, ga); g.fillRect(0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }
    if (P.lift && q >= 2) { g.globalCompositeOperation = 'lighten'; g.fillStyle = P.lift; g.fillRect(0, 0, Pw, Ph); g.globalCompositeOperation = 'source-over'; }   // 抬一点暗部（不让最暗处死黑，偏紫）
    g.imageSmoothingEnabled = false; g.globalAlpha = clamp(P.vig + F.dark * 0.25, 0, 1); g.drawImage(vigFull(W2, H2), 0, 0, Pw, Ph); g.globalAlpha = 1;
    if (q >= 3 && O.ca) {   // 色差：红通道沿径向外扩一点点（要回读整张画面，软件光栅下很贵，默认关）
      const cb = buf('ca', Pw, Ph); cb.g.globalCompositeOperation = 'copy'; cb.g.drawImage(pc, 0, 0); cb.g.globalCompositeOperation = 'multiply'; cb.g.fillStyle = '#ff0000'; cb.g.fillRect(0, 0, Pw, Ph);
      g.globalCompositeOperation = 'multiply'; g.fillStyle = '#00ffff'; g.fillRect(0, 0, Pw, Ph);
      g.globalCompositeOperation = 'lighter'; const z = 1.0022; g.imageSmoothingEnabled = true; g.drawImage(cb.c, -(z - 1) * Pw / 2, -(z - 1) * Ph / 2, Pw * z, Ph * z); g.globalCompositeOperation = 'source-over';
    }
  }
  mark('grade');
  // 15 镜头推近（HD2D.cam）：整张合成好的画面绕焦点放大。只在推着的时候多一次整幅拷贝
  const cz = camNow(now);
  if (cz.z > 1.002) {
    const cb = buf('cam', Pw, Ph); cb.g.globalCompositeOperation = 'copy'; cb.g.imageSmoothingEnabled = false; cb.g.drawImage(pc, 0, 0);
    const sw = Pw / cz.z, sh = Ph / cz.z, sx = clamp(cz.x * u - sw / 2, 0, Pw - sw), sy = clamp(cz.y * u - sh / 2, 0, Ph - sh);
    g.imageSmoothingEnabled = q >= 3; g.drawImage(cb.c, sx, sy, sw, sh, 0, 0, Pw, Ph);
  }
  mark('cam');
  HD.stats.ms += (root.performance.now() - t0 - HD.stats.ms) * 0.1;
}
let bgKey = '', bgN = 0;
// 地面层里整行不透明的最长一段 [y0, y1)（图层像素）：背景在那几行被地面整个盖住，不用画。按场景算一次记下来（只在换场景 / 换季 / 换高度时回读一次，读的是一张拷贝，不让地面层本身变成“常被回读”的画布）；
// 卷动的历练地图每帧都不一样，不算
const bandCache = {};
let bandN = 0;
function opaqueBand(GL) {
  if (F.scroll || F.kind === 'adv') return null;
  const k = F.kind + ':' + F.key + ':' + F.OY + ':' + logicH + ':' + F.season + ':' + GL.c.width + ':' + (GL.sig || 0);
  if (k in bandCache) return bandCache[k];
  if (++bandN > 64) { for (const k2 in bandCache) delete bandCache[k2]; bandN = 0; }
  const w = GL.c.width, h = GL.c.height, t = mkc(w, h), tg = t.getContext('2d', { willReadFrequently: true });
  let d; try { tg.drawImage(GL.c, 0, 0); d = tg.getImageData(0, 0, w, h).data; } catch (e) { return (bandCache[k] = null); }
  let best = null, cur = -1;
  for (let y = 0; y <= h; y++) {
    let full = y < h; if (full) for (let i = (y * w) * 4 + 3, e = i + w * 4; i < e; i += 4) if (d[i] < 255) { full = false; break; }
    if (full) { if (cur < 0) cur = y; } else if (cur >= 0) { if (!best || y - cur > best[1] - best[0]) best = [cur, y]; cur = -1; }
  }
  return (bandCache[k] = best && best[1] - best[0] >= 8 * S ? best : null);
}
// 背景各层（天空、日月光晕、远景、空气透视、中景），坐标一律按呈现画布写。2 档起画进背景小缓冲（变换已折算好，锚定层 anc 在里面 1:1）；1 档直接画到呈现画布（各层都清晰）
function drawBack(g, P, cx, cy, OY, u, q, anc, fx, fw) {
  const lay = n => layers[n].used ? layers[n] : null, inBuf = !!anc;
  let L = lay('sky');
  if (!L && !inBuf) { g.fillStyle = '#0b0912'; g.fillRect(0, 0, Pw, Ph); }
  if (L) softLayer(g, L, anc === 'sky' && q < 3 ? 0 : P.blur.sky, cx * P.par.sky, cy * P.par.sky, 1.03, 'sky', q);
  // 日 / 月的大光晕（在远山后面）
  g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
  if (F.sun && F.sun.a > 0.02) drawLight(g, { x: F.sun.x, y: F.sun.y + OY, r: 26, c: F.sun.c || '#ffe8a8', a: 0.5 * F.sun.a }, u, 1);
  if (F.moon && F.moon.a > 0.02) drawLight(g, { x: F.moon.x, y: F.moon.y + OY, r: 24, c: '#a8c0ff', a: 0.6 * F.moon.a }, u, 1);
  if (P.sun) drawLight(g, { x: P.sun.x, y: P.sun.y + OY * 0.6, r: P.sun.r / 2, c: P.sun.c, a: P.sun.a }, u, 1);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  // 远景 + 空气透视 + 中景
  L = lay('far'); if (L) softLayer(g, L, P.blur.far, cx * P.par.far, cy * P.par.far, 1.04, 'far', q);
  if (P.fog && HD.opts.grade) { const y0 = (P.fog.y0 + OY) * u, y1 = (P.fog.y1 + OY) * u, gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, hexA(P.fog.c, 0)); gr.addColorStop(0.6, hexA(P.fog.c, P.fog.a)); gr.addColorStop(1, hexA(P.fog.c, 0)); g.fillStyle = gr; g.fillRect(fx, y0, fw, y1 - y0); }
  L = lay('mid'); if (L) softLayer(g, L, anc === 'mid' && q < 3 ? 0 : P.blur.mid, cx * P.par.mid, cy * P.par.mid, 1.03, 'mid', q);
}
// 小图双线性放大到 w×h（3 档：光照图、光缓冲先放大到高清像素分辨率，往 800 宽的呈现画布上按最近邻 2 倍贴）
function upTo(name, src, w, h) { const b = buf(name, w, h); b.g.setTransform(1, 0, 0, 1, 0, 0); b.g.globalAlpha = 1; b.g.globalCompositeOperation = 'copy'; b.g.imageSmoothingEnabled = true; b.g.drawImage(src, 0, 0, w, h); return b.c; }
// ---------- 镜头：HD2D.cam({ z, x, y, ms, hold }) ----------
// z 放大倍数（1 = 不推，突破 / 首领出场 / 出大招给 1.06 左右）；(x, y) 焦点，画布逻辑坐标（y 含 OY），省略 = 画面中心偏下；ms 推过去用多久；hold 给了就在停留这么久之后自己退回去（不给就一直停着，调 HD2D.cam() 退回）
// HD2D.camAt(x, y) → 推近之后这个逻辑坐标落在哪（界面的飘字、点击判定按它换算）；没在推时原样返回
const CAM = { z0: 1, x0: 100, y0: 100, z1: 1, x1: 100, y1: 100, t0: 0, ms: 1, hold: 0, back: 300 };
function camNow(now) {
  let k = clamp((now - CAM.t0) / CAM.ms, 0, 1); k = k * k * (3 - 2 * k);
  if (CAM.hold && now > CAM.t0 + CAM.ms + CAM.hold) { const c = { z: CAM.z1, x: CAM.x1, y: CAM.y1 }; CAM.z0 = c.z; CAM.x0 = c.x; CAM.y0 = c.y; CAM.z1 = 1; CAM.t0 = now; CAM.ms = CAM.back; CAM.hold = 0; return c; }
  return { z: CAM.z0 + (CAM.z1 - CAM.z0) * k, x: CAM.x0 + (CAM.x1 - CAM.x0) * k, y: CAM.y0 + (CAM.y1 - CAM.y0) * k };
}
HD.cam = function (o) {
  const now = root.performance.now(), c = camNow(now); o = o || {};
  CAM.z0 = c.z; CAM.x0 = c.z > 1.002 ? c.x : (o.x === undefined ? 100 : o.x); CAM.y0 = c.z > 1.002 ? c.y : (o.y === undefined ? logicH * 0.6 : o.y);
  CAM.z1 = clamp(o.z || 1, 1, 1.5); CAM.x1 = o.x === undefined ? CAM.x0 : o.x; CAM.y1 = o.y === undefined ? CAM.y0 : o.y;
  CAM.t0 = now; CAM.ms = Math.max(1, o.ms === undefined ? 260 : o.ms); CAM.hold = o.hold || 0; CAM.back = o.back || 320;
  return HD;
};
HD.camAt = function (x, y) {
  const c = camNow(root.performance.now()); if (!HD.on || c.z <= 1.002) return { x, y, z: 1 };
  const sw = 200 / c.z, sh = logicH / c.z, sx = clamp(c.x - sw / 2, 0, 200 - sw), sy = clamp(c.y - sh / 2, 0, logicH - sh);
  return { x: (x - sx) * c.z, y: (y - sy) * c.z, z: c.z };
};
function loop(now) {
  root.requestAnimationFrame(loop);
  if (!HD.on) { lastNow = now; return; }
  const dt = now - lastNow; lastNow = now;
  if (pc.offsetParent === null && pc.getClientRects().length === 0) return;   // 场景不在屏上
  if (covered) return;                                                                            // 对话 / 过场盖着整屏：不合成
  if (dt > 0 && dt < 500) HD.stats.frame += (dt - HD.stats.frame) * 0.05;   // 帧间隔的滑动平均（只是记下来给测帧看，不据此改任何东西）
  if (HD.selfLoop) HD.present(now);
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
// 界面皮肤的样式在 src/template.html 的 <style id="hd2d-skin">（全部挂在 body.hd2d 下）；这里只管开关 body.hd2d 和生成宣纸纤维那张小图
HD.skin = function (on) {
  if (!doc || !doc.body) return;
  if (on === undefined) on = HD.skinOn();
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
  if (!host || !src) return null;
  o = o || {};
  if (host.querySelector('.hd-fx')) { const old = stages.find(x => x.host === host); if (old) Object.assign(old.o, o); return old || null; }   // 已经罩过（界面和自动扫描谁先到都行）：还给同一个对象
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
// 有 2 倍密度重画稿的立绘（art.js 登记在 ART._hdBig）：隔几个像素抽样比对，认出画布上画的是哪一张（正着或镜像）
function bigOf(c) {
  const list = root.ART && root.ART._hdBig; if (!list || !list.length) return null;
  const w = c.width, h = c.height; let d; try { d = c.getContext('2d').getImageData(0, 0, w, h).data; } catch (e) { return null; }
  for (const s of list) {
    if (s.width !== w || s.height !== h) continue;
    const sd = s._sig || (s._sig = s.getContext('2d').getImageData(0, 0, w, h).data);
    for (let fl = 0; fl < 2; fl++) {
      let ok = true;
      for (let y = 3; y < h && ok; y += 5) for (let x = 2; x < w; x += 5) { const i = (y * w + x) * 4, j = (y * w + (fl ? w - 1 - x : x)) * 4; if (Math.abs(d[i + 3] - sd[j + 3]) > 12 || (d[i + 3] > 40 && Math.abs(d[i] - sd[j]) + Math.abs(d[i + 1] - sd[j + 1]) + Math.abs(d[i + 2] - sd[j + 2]) > 30)) { ok = false; break; } }
      if (ok) return { s, fl };
    }
  }
  return null;
}
function upInPlace(c, colL, colR) {
  if (c.hidden || c.width < 8 || c.width + 'x' + c.height === c._upW) return;
  let u = null; const big = bigOf(c), n = big && HD.up(big.s);
  if (n) { u = mkc(n.width, n.height); const ug = u.getContext('2d'); if (big.fl) { ug.translate(n.width, 0); ug.scale(-1, 1); } ug.drawImage(n, 0, 0); }
  if (!u) u = scale2x(c, true);
  if (!u) return;
  if (colL && HD.opts.rim) {   // 左缘染左半边背景的亮色、右缘染右半边的（火光在哪边，哪边的脸就暖）：由外向里 5 个高清像素渐弱
    const w = u.width, hh = u.height, ug = u.getContext('2d'), id = ug.getImageData(0, 0, w, hh), d = id.data, L = rgb(colL), R = rgb(colR);
    for (let y = 0; y < hh; y++) {
      const row = y * w * 4;
      for (const [dir, C] of [[1, L], [-1, R]]) {
        let run = 0;
        for (let x = dir > 0 ? 0 : w - 1; x >= 0 && x < w; x += dir) {
          const i2 = row + x * 4;
          if (d[i2 + 3] < 40) { run = 0; continue; }
          run++; if (run === 1) { const x2 = x + dir * 2; if (x2 < 0 || x2 >= w || d[row + x2 * 4 + 3] < 40 || d[row + (x + dir) * 4 + 3] < 40) run = 99; }   // 抖动散开的孤点（残魂下摆）不是轮廓，不染
          if (run > 6) continue;
          const k = [0, 0.75, 0.6, 0.45, 0.3, 0.18, 0.08][run], lum = d[i2] * 0.3 + d[i2 + 1] * 0.59 + d[i2 + 2] * 0.11, s = 0.35 + lum / 255;   // 亮的地方吃光多
          d[i2] = Math.min(255, d[i2] + C[0] * k * s); d[i2 + 1] = Math.min(255, d[i2 + 1] + C[1] * k * s); d[i2 + 2] = Math.min(255, d[i2 + 2] + C[2] * k * s);
        }
      }
    }
    ug.putImageData(id, 0, 0);
  }
  c.width = u.width; c.height = u.height; c._upW = u.width + 'x' + u.height;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(u, 0, 0);
}
function rgb(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
// 取源画布左右两半的“亮色”（缩到 2×1 再提亮提纯），每秒量一次
function sideColors(s, now) {
  if (s.cols && now - s.colT < 900) return s.cols;
  const b = buf('side', 2, 2), g = b.g; let d;
  try { g.globalCompositeOperation = 'copy'; g.imageSmoothingEnabled = true; g.drawImage(s.src, 0, 0, 2, 2); d = g.getImageData(0, 0, 2, 2).data; } catch (e) { return s.cols || ['#ffd8a0', '#a8c0ff']; }
  const pick = (i) => { let r = (d[i] + d[i + 8]) / 2, gg = (d[i + 1] + d[i + 9]) / 2, bb = (d[i + 2] + d[i + 10]) / 2; const m = Math.max(r, gg, bb, 1), k = 235 / m; r *= k; gg *= k; bb *= k; const av = (r + gg + bb) / 3; r = av + (r - av) * 1.5; gg = av + (gg - av) * 1.5; bb = av + (bb - av) * 1.5; const f = v => Math.max(0, Math.min(255, Math.round(v))); return '#' + ((1 << 24) + (f(r) << 16) + (f(gg) << 8) + f(bb)).toString(16).slice(1); };
  s.cols = [pick(0), pick(4)]; s.colT = now;
  s.bright = (d[0] + d[1] + d[2] > d[4] + d[5] + d[6]) ? 0 : 1;   // 上半张哪边更亮：光束从那边来
  return s.cols;
}
// 雨分三层（对话舞台，o.rain = 'rain' | 'storm'）：远——细、密、慢、淡，只落在底图范围里；中——正常；近——镜头跟前几根又长又亮的，落得最快，盖过立绘。
// 气氛层是“滤色”叠上去的，所以只管往上加亮线。界面那层平的雨见 HD2D.stageRain 为真就不画了
HD.stageRain = true;
function drawRain(g, storm, now, w, h, dx, dy, dw, dh) {
  const u = w / 200, t = now / 1000, k = storm ? 1.7 : 1, slant = storm ? 0.3 : 0.14;
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'butt';
  const LAY = [[Math.round(64 * k), 4, 150, 0.2, 0.5, 1], [Math.round(34 * k), 8, 250, 0.3, 0.75, 0], [Math.round(11 * k), 19, 420, 0.3, 1.5, 0]];
  for (let li = 0; li < 3; li++) {
    const [n, len, sp, a, th, clip] = LAY[li], x0 = clip ? dx : 0, y0 = clip ? dy : 0, W = clip ? dw : w, H = clip ? dh : h, L = len * u * (storm ? 1.3 : 1), v = sp * u * (storm ? 1.45 : 1);
    g.strokeStyle = 'rgba(' + (li === 2 ? '226,238,255' : '190,210,255') + ',' + Math.min(1, a * (storm ? 1.3 : 1)) + ')'; g.lineWidth = Math.max(1, th * u * 0.5);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const h1 = hash(i * 7 + li * 131 + 1), h2 = hash(i * 7 + li * 131 + 2), sv = 0.8 + h1 * 0.4;
      const y = ((h2 * (H + L) + t * v * sv) % (H + L)) - L, x = ((h1 * (W + H * slant) + i * 3.7 * u) % (W + H * slant)) - y * slant;
      const xa = x0 + x, ya = y0 + y, yb = Math.min(y0 + H, ya + L);
      if (yb <= y0 || xa < x0 - L || xa > x0 + W + L) continue;
      g.moveTo(xa, Math.max(y0, ya)); g.lineTo(xa - (yb - ya) * slant, yb);
    }
    g.stroke();
  }
  g.globalCompositeOperation = 'source-over';
}
function stageLoop(now) {
  for (let i = stages.length - 1; i >= 0; i--) { const s = stages[i]; if (!s.c.isConnected || !s.src.isConnected) { if (s.c.parentNode) s.c.parentNode.removeChild(s.c); if (s.c._vig.parentNode) s.c._vig.parentNode.removeChild(s.c._vig); stages.splice(i, 1); } }
  if (!stages.length) return;
  root.requestAnimationFrame(stageLoop);
  if (HD.q < 1) { for (const s of stages) { s.c.style.display = 'none'; s.c._vig.style.display = 'none'; } return; }
  if (HD.q < 3 && (++stageN & 1)) return;   // 气氛层 30 帧就够
  for (const s of stages) {
    const cols = sideColors(s, now);
    if (HD.opts.upres) for (const p of s.host.querySelectorAll('canvas.tk-pt')) upInPlace(p, cols[0], cols[1]);
    if (s.host.classList.contains('tk-stage')) s.host.classList.toggle('hd-cast', HD.q >= 2 && HD.opts.dof && !!s.host.querySelector('canvas.tk-pt:not([hidden])'));
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
    if (HD.q >= 2 && HD.opts.rays) {   // 一把从上方亮的那一侧斜下来的光束 + 几粒镜头跟前的大光斑
      const c1 = cols[s.bright || 0], tx = rayTex(c1), len = h * 1.15, ox = s.bright ? w * 0.82 : w * 0.18;
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2; i++) { g.save(); g.translate(ox, dy - h * 0.04); g.rotate((s.bright ? 0.42 : -0.42) + Math.sin(now / (5200 + i * 2900) + i * 2) * 0.05 + i * 0.07); g.globalAlpha = 0.2 + 0.05 * Math.sin(now / (1900 + i * 1300)); g.drawImage(tx, -len * 0.55, 0, len * 1.1, len); g.restore(); }
      const gt = glowTex(c1);
      for (let i = 0; i < 7; i++) { const r = (0.05 + hash(i * 3 + 1) * 0.07) * w, x = ((hash(i * 3 + 2) * 1.3 * w + now * (0.004 + hash(i) * 0.006)) % (w * 1.3)) - w * 0.15, y = (hash(i * 3 + 3) * h + Math.sin(now / 3100 + i) * h * 0.03); g.globalAlpha = 0.07 + 0.05 * Math.sin(now / 1700 + i * 2); g.drawImage(gt, x - r, y - r, r * 2, r * 2); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    const rain = s.o.rain || s.host.getAttribute('data-rain');
    if (rain) drawRain(g, rain === 'storm', now, w, h, dx, dy, dw, dh);
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
