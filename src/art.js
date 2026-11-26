/* 废柴仙途 · 像素美术：精灵、洞府场景、历练场景（全部用代码逐像素绘制，无外部图片） */
(function (root) {
'use strict';
const ART = {};
// 精灵尺寸与锚点（ui.js 按这些数值摆放，改精灵尺寸时同步修改）
// sit: 打坐像，脚底中心为锚点，split 以上为随呼吸起伏的上半身
// stand: 站姿（御剑、敌人），脚底中心为锚点；pet: 灵宠，左下角为锚点（尾巴已画在精灵里）
ART.dims = { sit: { w: 32, h: 36, split: 27 }, stand: { w: 24, h: 37 }, pet: { w: 28, h: 26, tail: false }, wolf: { w: 28, h: 17 } };

// ---------- 颜色工具 ----------
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function cl(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function toHex(r, g, b) { return '#' + ((1 << 24) + (cl(r) << 16) + (cl(g) << 8) + cl(b)).toString(16).slice(1); }
function lerpC(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function shade(c, f) { const A = hex(c); return toHex(A[0] * f, A[1] * f, A[2] * f); }
function lum(c) { const A = hex(c); return A[0] * 0.3 + A[1] * 0.59 + A[2] * 0.11; }
// 带色相偏移的明暗：暗部偏冷紫，亮部偏暖
const COOL = '#2a1f52', WARM = '#fff3cf';
function hs(c, f) { return f < 1 ? lerpC(shade(c, f), COOL, (1 - f) * 0.38) : lerpC(c, WARM, Math.min(1, f - 1)); }
ART.lerpC = lerpC; ART.shade = shade;

function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return c; }

function pix(map, pal) {
  const h = map.length, w = Math.max(...map.map(r => r.length));
  const c = mk(w, h), g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < map[y].length; x++) {
    const col = pal[map[y][x]];
    if (!col) continue;
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  return c;
}
ART.pix = pix;

// ---------- 精灵工具：半幅镜像、叠印、自动描边 ----------
// rows 里每行可以是半幅（自动左右镜像）或整幅
function grid(rows, w) {
  return rows.map((r, i) => {
    if (r.length === w) return r.split('');
    if (r.length * 2 === w) return (r + r.split('').reverse().join('')).split('');
    if (typeof console !== 'undefined') console.error('sprite row width', i, r.length, w, r);
    return (r + '.'.repeat(w)).slice(0, w).split('');
  });
}
function blank(w, h) { const g = []; for (let y = 0; y < h; y++) g.push(new Array(w).fill('.')); return g; }
function stamp(dst, src, ox, oy) {
  for (let y = 0; y < src.length; y++) for (let x = 0; x < src[y].length; x++) {
    const ch = src[y][x]; if (ch === '.' || ch === undefined) continue;
    const yy = y + oy, xx = x + ox;
    if (dst[yy] && xx >= 0 && xx < dst[yy].length) dst[yy][xx] = ch;
  }
  return dst;
}
function put(g, x, y, ch) { if (g[y] && x >= 0 && x < g[y].length) g[y][x] = ch; }
// 把字符网格渲染成带 1 像素留边的画布，并做选择性描边：描边颜色取自相邻像素（加深并偏冷），上缘更亮、下缘更深
function render(g, pal, opts) {
  opts = opts || {};
  const h = g.length, w = g[0].length, W2 = w + 2, H2 = h + 2;
  const c = mk(W2, H2), ctx2 = c.getContext('2d');
  const img = ctx2.createImageData(W2, H2), d = img.data;
  const col = new Array(W2 * H2).fill(null);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = pal[g[y][x]]; if (p) col[(y + 1) * W2 + x + 1] = p; }
  const out = col.slice();
  if (!opts.noOutline) {
    const ink = opts.ink || '#1c1233';
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
      const i = y * W2 + x; if (col[i]) continue;
      const dn = y + 1 < H2 ? col[i + W2] : null, up = y > 0 ? col[i - W2] : null;
      const lf = x > 0 ? col[i - 1] : null, rt = x + 1 < W2 ? col[i + 1] : null;
      let src = null, f = 0.5;
      if (up) { src = up; f = 0.36; } else if (lf && !dn) { src = lf; f = 0.42; } else if (rt && !dn) { src = rt; f = 0.5; } else if (dn) { src = dn; f = 0.6; } else if (lf) { src = lf; f = 0.42; } else if (rt) { src = rt; f = 0.5; }
      if (src) out[i] = lerpC(shade(src, f), ink, 0.42);
    }
  }
  for (let i = 0; i < out.length; i++) { if (!out[i]) continue; const A = hex(out[i]); d[i * 4] = A[0]; d[i * 4 + 1] = A[1]; d[i * 4 + 2] = A[2]; d[i * 4 + 3] = 255; }
  ctx2.putImageData(img, 0, 0);
  return c;
}
function grayPal(pal) { const o = {}; for (const k in pal) { const v = lum(pal[k]); o[k] = lerpC(toHex(v, v, v), '#6a6880', 0.18); } return o; }

// ---------- 主角 ----------
// 头部（发髻 + 脸），打坐与站立共用。半幅 15 列，镜像后 30 列
const HEAD = [
  '............Hhh',
  '.........ygHhjh',
  '...........Hhhh',
  '............GgY',
  '..........Hhhhh',
  '........HHhhjjh',
  '.......HHhjjhhh',
  '.......Hhhjhhhh',
  '.......Hhhhhhhh',
  '.......HhhhhSss',
  '.......HhhhSsss',
  '.......HhhSssss',
  '.......HhSswEsssswEsShH.......',
  '.......HhSsEEss',
  '.......HhSsiiss',
  '.......HHsmmsss',
  '........HSssssM',
  '........H..Ssss',
];
const SIT_BODY = [
  '.........RrtuSs',
  '........RrrrtuS',
  '.......Rrqrrrtu',
  '......Rrqqrrrrt',
  '.....RrqqrrRrrr',
  '....RrqqrrrRbbb',
  '....RrqrrrrRrrr',
  '.....RrrrrrttsS',
  '..rqqrDRRRTTsss',
  '.rqqqrrrrRRDDDD',
  'rqqrrrrrrrrrRrr',
  'RrrrrrRRRrrrrrr',
  '.RTtttttTTttttt',
  '..CvvvvvvvvvvvV',
  '.CcCccCccCccCcc',
  '..CCCcCCcCCcCCc',
];
const STAND_BODY = [
  '.........RrtuSs',
  '........RrrrtuS',
  '.......Rrqrrrtu',
  '.......RrqrRrrt',
  '......RrqrrRrrr',
  '......RrqrrRbbb',
  '......RrrrrRrrT',
  '......RttttRrrt',
  '.......sS.Rrrrt',
  '.........Rrqrrt',
  '........Rrqrrrt',
  '........Rrqrrrt',
  '.......Rrqqrrrt',
  '.......Rrqrrrrt',
  '......RrqrrrrrT',
  '......RTTtTTtTT',
  '..........kk...',
];
// 女相：双环髻 + 珠花 + 垂肩鬓发
const HEAD_F_TOP = [
  '.........Hhh...',
  '........Hhjhh..',
  '........Hhhhh.p',
  '.........HhhppY',
];
// 男主（少年侠客）：高马尾甩在右后、朱红发带、中分碎刘海、剑眉、收窄的下颌；不要腮红和圆眼
const HERO_HEAD = [
  [0, 16, '.HhhhH'], [1, 14, '.HhjhhhhhH'], [2, 13, 'HhhhH..HhhhH'], [3, 12, 'fFffFf....HhhH'],
  [4, 23, 'HhhH'], [5, 24, 'hhH'], [6, 24, 'hjH'], [7, 25, 'hH'], [8, 25, 'hH'], [9, 25, 'H'],
  [8, 7, 'HhhhhhhhhShhhhhH'], [9, 7, 'HhhhhShSssshhhhH'], [10, 7, 'HhhEEEhsssEEEhhH'], [11, 7, '.HSssssssssssSH.'],
  [12, 7, '.SSEEEssssEEESS.'], [13, 7, '.SSswEssssEwsSS.'], [14, 7, '..SsssssSssssS..'], [15, 7, '...SssssssssS...'], [16, 7, '....SssMMssS....'], [17, 7, '.....SssssS.....'],
];
function charGrid(body, female, hero) {
  const g = grid(HEAD.concat(body), 30);
  if (hero && !female) { for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.'; for (const [y, x0, str] of HERO_HEAD) for (let i = 0; i < str.length; i++) g[y][x0 + i] = str[i]; }
  if (female) {
    const top = grid(HEAD_F_TOP, 30);
    for (let y = 0; y < 4; y++) g[y] = top[y];
    for (let y = 16; y <= 23; y++) for (const sx of [0, 1]) {
      const a = sx ? 22 : 7, b = sx ? 21 : 8;
      if (y < 23) { put(g, a, y, 'H'); put(g, b, y, y % 3 === 1 ? 'j' : 'h'); } else put(g, b, y, 'H');
    }
    put(g, 10, 12, 'E'); put(g, 19, 12, 'E'); // 睫毛
  }
  // 光从左上来：右半边的高光压暗一级，右缘再暗一级
  for (let y = 0; y < g.length; y++) {
    let last = -1;
    for (let x = 29; x >= 0; x--) if (g[y][x] !== '.') { last = x; break; }
    for (let x = 16; x < 30; x++) {
      const ch = g[y][x];
      if (ch === 'q') g[y][x] = 'r'; else if (ch === 'j' && x > 17) g[y][x] = 'h'; else if (ch === 'v' && x > 20) g[y][x] = 'c';
      else if (ch === 'r' && x >= last - 1 && y >= 18) g[y][x] = 'R';
    }
    // 左缘受光
    for (let x = 0; x < 14; x++) { if (g[y][x] === '.') continue; if (g[y][x] === 'R' && y >= 20 && y < 29) g[y][x] = 'r'; break; }
  }
  return g;
}
// 调色板：look = {hair, skin, f}, robe = [暗, 中, 亮], trim
function palette(look, robe, trim, extra) {
  const hair = look.hair || '#2a2230', skin = look.skin || '#f2c9a0';
  const dark = lum(hair) < 110;
  return Object.assign({
    H: hs(hair, dark ? 0.62 : 0.74), h: hair, j: dark ? lerpC(hair, '#9aa2dc', 0.42) : lerpC(hair, '#ffffff', 0.7),
    g: '#f4c542', G: '#a8742a', y: '#fff2a8', Y: '#fff2a8', p: '#f7a3bd', P: '#c8607e', f: '#d8404a', F: '#8a1e2e',
    s: skin, S: lerpC(hs(skin, 0.84), '#d98a86', 0.22), m: lerpC(skin, '#f2777c', 0.42), M: lerpC(skin, '#a8444c', 0.62),
    E: '#2a1a30', i: '#6a4a52', w: '#ffffff', u: '#f6f2fa',
    D: hs(robe[0], 0.68), R: robe[0], r: robe[1], q: robe[2],
    t: trim, T: hs(trim, 0.74), b: hs(robe[0], 0.5),
    k: '#2c2238', c: '#b98a4c', C: '#8a5c36', v: '#dcb56e', V: '#f0d08a',
  }, extra || {});
}
const cache = new Map();
function cached(key, fn) { let c = cache.get(key); if (!c) { c = fn(); cache.set(key, c); if (c && c.getContext) { c._st = 1; if (typeof key === 'string' && key.slice(0, 2) === 'pt') c.toDataURL = hdDataURL; } } return c; }
// 半身像放进 <img> 时（界面都按 48 的整数倍给了宽高）：高清皮肤开着就给 2 倍密度的那张
function hdDataURL() { const h = root.HD2D, P = root.HTMLCanvasElement.prototype.toDataURL; if (h && h.skinOn() && h.opts.upres) { const u = h.up(this); if (u) return P.apply(u, arguments); } return P.apply(this, arguments); }   // _st：定稿的静态精灵（HD2D 据此升 2 倍密度）
ART.clearCache = () => { cache.clear(); layerCache.clear(); };
const layerCache = new Map();

ART.sit = function (look, realm, opts) {
  const R0 = L.REALMS[Math.min(realm, 9)];
  const hair = realm >= 7 ? '#e9e8f2' : look.hair;
  const gray = opts && opts.gray ? 1 : 0;
  const key = ['sit', hair, look.skin, look.f, realm, gray].join('|');
  return cached(key, () => {
    const g = charGrid(SIT_BODY, look.f, 1);
    // 腰间玉扣、膝头高光
    put(g, 14, 23, 'y'); put(g, 15, 23, 'G');
    let pal = palette({ ...look, hair }, R0.robe, R0.trim);
    if (realm >= 9) pal.g = '#ffffff';
    if (gray) pal = grayPal(pal);
    return render(g, pal);
  });
};
// 站姿：frame 0/1 两帧衣摆与发带飘动。extra = {horns, pal, kind}
ART.stand = function (look, robe, trim, frame, extra) {
  const key = ['st', look.hair, look.skin, look.f, look.hero ? 1 : 0, robe.join(), trim, frame, extra ? JSON.stringify(extra) : ''].join('|');
  return cached(key, () => {
    const g = charGrid(STAND_BODY, look.f, look.hero);
    const kind = extra && extra.kind;
    // 衣摆向左飘
    const sh = (y, n) => { for (let k = 0; k < n; k++) { g[y].shift(); g[y].push('.'); } };
    if (frame) { sh(28, 1); sh(29, 1); for (let y = 30; y <= 33; y++) sh(y, 2); put(g, 23, 33, 'T'); put(g, 22, 33, 'T'); }
    else { for (let y = 31; y <= 33; y++) sh(y, 1); put(g, 23, 33, 'T'); }
    // 发带
    if (!kind) { if (frame) { put(g, 6, 7, 't'); put(g, 5, 7, 't'); put(g, 4, 6, 'T'); } else { put(g, 6, 7, 't'); put(g, 5, 8, 't'); put(g, 4, 8, 'T'); } }
    if (extra && extra.horns) for (const sx of [0, 1]) { const X = x => sx ? 29 - x : x; put(g, X(9), 4, 'O'); put(g, X(8), 3, 'O'); put(g, X(8), 2, 'o'); put(g, X(9), 1, 'o'); }
    if (kind === 'hill') { // 蒙面匪寇：头巾 + 面巾
      for (let x = 9; x <= 20; x++) { put(g, x, 15, 'K'); if (x > 9 && x < 20) put(g, x, 16, 'K'); if (x > 10 && x < 19) put(g, x, 17, 'k'); }
      for (let x = 8; x <= 21; x++) put(g, x, 8, 'K'); for (let x = 9; x <= 20; x++) put(g, x, 9, g[9][x] === 's' || g[9][x] === 'S' ? 'K' : g[9][x]);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.';
    }
    if (kind === 'tomb') { // 尸骨：骷髅脸
      for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.';
      for (let y = 4; y <= 17; y++) for (let x = 0; x < 30; x++) { const ch = g[y][x]; if ('mM'.includes(ch)) g[y][x] = 's'; }
      put(g, 14, 3, 'H'); put(g, 15, 3, 'h'); put(g, 13, 3, 'H');
      for (const ex of [11, 17]) { for (let y = 12; y <= 14; y++) for (let x = ex; x <= ex + 1; x++) put(g, x, y, 'E'); put(g, ex + (ex < 15 ? 1 : 0), 13, 'w'); }
      put(g, 14, 15, 'E'); put(g, 15, 15, 'E');
      for (let x = 11; x <= 18; x++) put(g, x, 17, x % 2 ? 'E' : 's');
      put(g, 12, 6, 'S'); put(g, 13, 7, 'S'); put(g, 12, 8, 'S'); // 裂纹
    }
    if (kind === 'palace') { // 傀儡守卫：金盔
      for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.';
      for (let y = 4; y <= 11; y++) for (let x = 0; x < 30; x++) { const ch = g[y][x]; if ('Hhj'.includes(ch)) g[y][x] = ch === 'H' ? 'G' : ch === 'j' ? 'y' : 'g'; }
      for (let y = 12; y <= 17; y++) for (let x = 0; x < 30; x++) if ('Hhj'.includes(g[y][x])) g[y][x] = 'G';
      for (let y = 1; y <= 3; y++) { put(g, 14, y, 'P'); put(g, 15, y, 'p'); } put(g, 14, 0, 'p');
      for (const x of [12, 13, 16, 17]) put(g, x, 9, 'G');
      for (let x = 0; x < 30; x++) for (const y of [15]) if (g[y][x] === 'm') g[y][x] = 's';
    }
    // 武器：举在右手（画布向右加宽）
    let gw = g.map(r => r.slice(4, 26));
    const wp = extra && extra.weapon;
    if (wp) {
      gw = gw.map(r => r.concat(['.', '.', '.', '.']));
      const hx = 18, hy = 26;
      if (wp === 'halberd') { for (let y = 6; y <= 33; y++) put(gw, hx + 1, y, y % 6 === 0 ? 'G' : 'n'); for (let y = 3; y <= 6; y++) put(gw, hx + 1, y, 'x'); put(gw, hx + 1, 2, 'X'); for (let y = 5; y <= 8; y++) { put(gw, hx + 2, y, 'x'); put(gw, hx + 3, y + 0, y < 8 ? 'X' : 'x'); } put(gw, hx + 4, 6, 'x'); put(gw, hx, 8, 'P'); put(gw, hx, 9, 'p'); put(gw, hx, 10, 'P'); }
      else { // 刀/剑：斜举
        for (let k = 0; k < 13; k++) { const x = hx + 1 + Math.floor(k / 4), y = hy - 2 - k; put(gw, x, y, 'x'); put(gw, x + 1, y, k < 11 ? 'X' : '.'); if (wp === 'saber' && k > 6 && k < 11) put(gw, x + 2, y, 'x'); }
        put(gw, hx, hy - 1, 'G'); put(gw, hx + 1, hy - 1, 'g'); put(gw, hx + 2, hy - 1, 'G'); put(gw, hx + 1, hy, 'n'); put(gw, hx + 1, hy + 1, 'n');
      }
      put(gw, hx, hy, 's'); put(gw, hx + 1, hy, 's');
    }
    const pal = palette(look, robe, trim, Object.assign({ o: '#d8ccb0', O: '#a89878', K: '#2c2a36', x: '#aeb8c8', X: '#e8eef6', n: '#5a4030' }, extra && extra.pal));
    return render(gw, pal);
  });
};
ART.standRealm = function (look, realm, frame) {
  const R0 = L.REALMS[Math.min(realm, 9)];
  const hair = realm >= 7 ? '#e9e8f2' : look.hair;
  return ART.stand({ ...look, hair, hero: 1 }, R0.robe, R0.trim, frame);
};
// 人形敌人：按地图换造型
ART.foeMan = function (fc, kind) {
  const robe = [hs(fc[1], 0.8), fc[1], fc[0]];
  const K = {
    hill: { look: { hair: '#1d1a24', skin: '#d9a47c' }, extra: { kind: 'hill', weapon: 'saber', pal: { E: '#1a0c10' } }, trim: '#9a3a34' },
    tomb: { look: { hair: '#d8d0b8', skin: '#ddd6be' }, extra: { kind: 'tomb', pal: { H: hs(fc[1], 0.55), h: hs(fc[1], 0.8), j: fc[1], E: '#241a2c', w: '#ff4a3a', S: '#a39c86', u: '#6a6456', t: '#8f876c', T: '#6a6450' } }, trim: '#8f876c' },
    blood: { look: { hair: '#2a0c14', skin: '#e3a08c' }, extra: { horns: true, weapon: 'saber', pal: { E: '#5a0a10', i: '#ff3a2a', o: '#3a1016', O: '#1e080c', x: '#c8505a', X: '#ff9a8a' } }, trim: '#ffb39a' },
    abyss: { look: { hair: '#1a1026', skin: '#b7a0d6' }, extra: { horns: true, weapon: 'sword', pal: { E: '#1a0a2a', i: '#e85aff', w: '#ffd0ff', o: '#2a1838', O: '#160c20', x: '#8a5ac8', X: '#d9a8ff' } }, trim: '#c88aff' },
    palace: { look: { hair: '#e0c070', skin: '#e9dcc0' }, extra: { kind: 'palace', weapon: 'halberd', pal: { E: '#3a8ad0', i: '#8fe0ff', w: '#ffffff', p: '#e8483a', P: '#a82a26' } }, trim: '#fff0bd' },
  }[kind] || { look: { hair: '#1d1a24', skin: '#e8b68a' }, extra: { weapon: 'sword' }, trim: hs(fc[0], 1.2) };
  return ART.stand({ ...K.look, f: 0 }, robe, K.trim, 0, K.extra);
};

// ---------- 灵宠（28×26，品阶越高越华丽） ----------
const FOX_HEAD = ['.bb.....', '.baa....', '.anab...', '.anaaaaa', 'aaaaaaaa', 'aaaaaaaa', 'aaaeeaaa', 'baaexaaa', '.bmmaaan', '..wwwwww'];
const FOX_BODY = ['...baaww', '..baaaww', '..baaaww', '..baaaaw', '..bbaaba', '..bbaaba', '..wwb.ww'];
const FOX_TAIL = ['.....ww..', '....wwww.', '...aawwww', '..aaaawww', '..aaaaaww', '.baaaaaa.', '.bbaaaa..', 'bbbaaa...', '.bbbb....'];
const TIGER_HEAD = ['........', '.dd.....', 'daad....', 'danaaaaa', 'aaaaadda', 'adaaaaad', 'aaaeeaaa', 'daaexaaa', 'awwmaaan', '.wwwwwww'];
const TIGER_BODY = ['...daaww', '..aaaaww', '..daaaww', '..aaaaaw', '..daaaba', '..aaaaba', '..wwb.ww'];
const TIGER_TAIL = ['.....F..', '....Ff..', '....fyF.', '....Fff.', '.....a..', '.....da.', '......a.', '.....ad.', '....aa..', '..ada...', 'aaa.....'];
const BIRD = ['.....f.', '....faf', '...aaaa', '..aaaaa', '.aaaaaa', '.aaeeaa', '.aaexaa', '.ammaay', 'baawwwY', 'bbawwww', 'dbbwwww', 'dbbawww', '.dbbaaa', '...ybyy', '...y.y.'];
const BIRD_TAIL = ['.......fy', '.....abfy', '....ab.f.', '...ab.afy', '..ab.abfy', '.bb.ab.f.', 'bb.ab....', 'b.bb.....', '.bb......'];
const TURTLE = [
  '....................',
  '....................',
  '....................',
  '....................',
  '................bb..',
  '........ddddd..beeb.',
  '......ddbbabbdd.bbn.',
  '.....dbabbbbbabd.b..',
  '....dbbbbabbbbbbdb..',
  '....dabbabbbabbabb..',
  '.aaaadbbbbabbbbbd...',
  'aaaaaadbabbbabbd.b..',
  'aeaaaaydyyyyyyyy.bb.',
  'aaamaawwwwwwwwwwwb..',
  '.aaaa.aaa....aaa....',
  '......aab....aab....',
];
const DRAGON_HEAD = ['y..y....', 'yy.y....', '.yyy.aaa', '..yaaaaa', '.baaaaaa', 'baaeeaaa', 'baaexaaa', '.bammaaa', 'w.wwwwnn', '.w.wwwww', '....fww.'];
function curve(g, pts, r0, r1, fn) { // 沿控制点画一条由粗到细的身体
  const n = (pts.length - 1) * 10;
  for (let i = n; i >= 0; i--) {
    const u = i / n, f = u * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), t = f - k;
    const px = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, py = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t, r = r0 + (r1 - r0) * u;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (dx * dx + dy * dy > r * r + 0.4) continue; const ch = fn(u, dx, dy, r, i); if (ch) put(g, Math.round(px + dx), Math.round(py + dy), ch); }
  }
}
function petGrid(tier) {
  const g = blank(26, 24);
  if (tier <= 1) { stamp(g, grid(FOX_TAIL, 9), 13, 13); stamp(g, grid(FOX_BODY, 16), 1, 17); stamp(g, grid(FOX_HEAD, 16), 1, 7); put(g, 17, 13, 'd'); put(g, 18, 13, 'd'); }
  else if (tier === 2) { stamp(g, grid(TIGER_TAIL, 8), 14, 12); stamp(g, grid(TIGER_BODY, 16), 1, 17); stamp(g, grid(TIGER_HEAD, 16), 1, 7); put(g, 5, 19, 'd'); put(g, 12, 19, 'd'); }
  else if (tier === 3) {
    // 青鸾：三条长尾羽
    for (let k = 0; k < 3; k++) curve(g, [[12, 19], [17 + k, 18 - k * 2], [21 + k, 13 - k * 3 + (k === 0 ? 3 : 0)], [23 + (k === 0 ? 1 : 0), 9 - k * 3 + (k === 0 ? 6 : 0)]], 1.1, 0.6, (u) => u > 0.86 ? 'f' : u > 0.7 ? 'y' : (k % 2 ? 'a' : 'b'));
    stamp(g, grid(BIRD, 14), 1, 9);
    put(g, 7, 7, 'f'); put(g, 8, 6, 'y'); put(g, 5, 8, 'f');
  }
  else if (tier === 4) { stamp(g, grid(TURTLE, 20), 2, 8); }
  else if (tier === 5) {
    // 九尾：身后扇形展开的九条尾巴
    for (let k = 0; k < 9; k++) {
      const a = (-90 + (k - 4) * 27) * Math.PI / 180, L0 = 12.5 - Math.abs(k - 4) * 0.25;
      const ex = 13 + Math.cos(a) * L0, ey = 18 + Math.sin(a) * L0, mx = 13 + Math.cos(a - (k - 4) * 0.09) * L0 * 0.55, my = 18 + Math.sin(a - (k - 4) * 0.09) * L0 * 0.55;
      curve(g, [[13, 18], [mx, my], [ex, ey]], 1.7, 0.9, (u, dx, dy) => u > 0.93 ? 'f' : u > 0.78 ? 'w' : (dy < 0 && dx <= 0 ? 'a' : 'b'));
    }
    stamp(g, grid(FOX_BODY, 16), 5, 17); stamp(g, grid(FOX_HEAD, 16), 5, 7);
    put(g, 12, 11, 'F'); put(g, 13, 11, 'F'); put(g, 12, 12, 'f'); put(g, 13, 12, 'f');
  } else {
    // 金龙：盘起的龙身 + 龙首 + 龙珠
    curve(g, [[11, 15], [7, 19], [10, 22], [17, 22], [22, 19], [22, 14], [19, 11]], 2.4, 1.0, (u, dx, dy, r, i) => dy > 0.6 ? 'w' : dy < -r + 0.9 ? 'a' : 'b');
    for (const [x, y] of [[19, 10], [18, 9], [20, 9], [18, 11]]) put(g, x, y, 'f');
    put(g, 18, 8, 'F');
    stamp(g, grid(DRAGON_HEAD, 16), 3, 4);
    put(g, 2, 13, 'w'); put(g, 1, 14, 'w'); put(g, 19, 13, 'w'); put(g, 20, 14, 'w'); // 龙须
    for (const [x, y, ch] of [[23, 5, 'p'], [24, 5, 'p'], [23, 6, 'p'], [24, 6, 'P'], [22, 5, 'P'], [23, 4, 'P'], [23, 7, 'P'], [25, 6, 'P']]) put(g, x, y, ch);
  }
  return g;
}
ART.pet = function (tier) {
  return cached('pet' + tier, () => {
    const c3 = L.PETS[tier].c;
    const pal = { a: c3[0], b: c3[1], d: c3[2], w: lerpC(c3[0], '#ffffff', 0.72), e: '#2a1a30', x: '#ffffff', n: '#ee8a9a', m: lerpC(c3[0], '#f58a9a', 0.5), y: '#f4c542', Y: '#c8862a', f: '#ffd76a', F: '#ff8a3a', p: '#fff6c8', P: '#ffd76a' };
    if (tier === 1) { pal.b = lerpC(c3[1], '#b9c4e6', 0.45); pal.d = '#8fa0c8'; }
    if (tier === 2) { pal.d = '#5a2a1c'; pal.w = '#fff0dc'; }
    if (tier === 3) { pal.f = '#ffe27a'; pal.w = '#e6fbff'; pal.d = c3[2]; }
    if (tier === 4) { pal.a = '#cfeeb0'; pal.b = c3[1]; pal.d = c3[2]; pal.w = '#f4f0c8'; pal.y = '#e8c85a'; pal.e = '#2a1a30'; pal.n = '#ff6a5a'; }
    if (tier === 5) { pal.f = '#ff9ad8'; pal.F = '#ff5aa8'; pal.w = '#ffffff'; }
    if (tier === 6) { pal.y = '#fff2a8'; pal.w = '#fff6d6'; pal.f = '#ff8a3a'; pal.e = '#7a1a10'; pal.n = '#c8862a'; }
    return render(petGrid(tier), pal);
  });
};

// ---------- 怪物：狼（28×17，面朝左） ----------
const WOLF = [
  '.....b..b.................',
  '.....ad.ad................',
  '....abbabbd..........abb..',
  '...abbbbbbbb........abbbb.',
  '..abbEbbbbbbaaaabbb..bbbbd',
  '.abbbbbbbbbbbbbbbbbbbabbbd',
  'babbbbwwbbbbbbbbbbbbbbbbd.',
  'NwwwWWwwbbbbbbbbbbbbbbdd..',
  '.dddwwwwbbbbbbbbbbbbbbd...',
  '....dwwwwwbbbbbbbbbbbd....',
  '.....bbdwwwwwwwwdbbbd.....',
  '.....bb..ddd....bbd.ddd...',
  '.....bb..ddd....bb..ddd...',
  '....bbb..ddd...bbb..ddd...',
  '....ww..dd.....ww..dd.....',
];
ART.wolf = function (fc) {
  return cached('wolf' + fc.join(), () => render(grid(WOLF, 26), { b: fc[0], a: lerpC(fc[0], '#fff0d0', 0.3), d: hs(fc[1], 0.9), w: lerpC(fc[0], '#ffffff', 0.5), E: '#ff3a2a', N: '#2a1a26', W: '#ffffff' }));
};

// ---------- 戒中老祖头像（22×22，半透明的蓝白残魂） ----------
const ELDER = [
  '........WW',
  '.......Www',
  '.....wwwww',
  '....wwwwww',
  '...wwsssss',
  '..wwssssss',
  '..bbbbbsss',
  '.bbsSEEEss',
  '.b.sssssSn',
  '...sSmmssn',
  '...wbbbbbb',
  '...WwbbMMb',
  '....Wwwbww',
  '....Wwwwbw',
  '.....Wwwww',
  '.....Wwwbw',
  '......Wwww',
  '......Wwwb',
  '.......Www',
  '........Ww',
];
ART.elder = () => cached('elder', () => {
  const spr = render(grid(ELDER, 20), { w: '#e4edff', W: '#9fb4ea', s: '#8fb0ee', S: '#6f90d8', b: '#ffffff', E: '#27357a', n: '#7f9ad8', m: '#c9b4f0', M: '#3a4a8a' }, { ink: '#2a3a7a' });
  const c = mk(22, 22), g = c.getContext('2d');
  g.globalAlpha = 0.94; g.drawImage(spr, 0, 0);
  // 下缘渐隐
  g.globalCompositeOperation = 'destination-out';
  for (let y = 16; y < 22; y++) { g.globalAlpha = (y - 15) * 0.1; for (let x = (y % 2); x < 22; x += 2) g.fillRect(x, y, 1, 1); }
  return c;
});

// ---------- 头像（半身像带背景，用于界面卡片） ----------
ART.avatar = function (look, realm, bg, opts) {
  const key = ['av', look.hair, look.skin, look.f, realm, bg, opts ? JSON.stringify(opts) : ''].join('|');
  return cached(key, () => {
    const AW = 32, AH = 32;
    const c = mk(AW, AH), g = c.getContext('2d');
    const base = '#211a36', tint = bg || '#3a3155';
    g.fillStyle = base; g.fillRect(0, 0, AW, AH);
    for (let y = 0; y < AH; y++) { g.fillStyle = lerpC(base, tint, 0.2 + Math.floor(y / 8) * 0.1); g.fillRect(0, y, AW, 1); if (y % 8 === 7) for (let x = (y >> 3) % 2; x < AW; x += 2) { g.fillStyle = lerpC(base, tint, 0.3 + Math.floor(y / 8) * 0.1); g.fillRect(x, y, 1, 1); } }
    g.fillStyle = lerpC(base, tint, 0.7);
    for (let y = -11; y <= 11; y++) { const w = Math.round(Math.sqrt(121 - y * y)); g.fillRect(16 - w, 13 + y, w * 2, 1); }
    g.fillStyle = lerpC(tint, '#ffffff', 0.18);
    for (let y = -8; y <= 8; y++) { const w = Math.round(Math.sqrt(64 - y * y)); g.fillRect(16 - w, 12 + y, w * 2, 1); }
    let spr;
    if (opts && opts.robe) { spr = ART.stand(look, opts.robe, opts.trim || '#ffffff', 0, opts.extra); g.drawImage(spr, Math.round((AW - 24) / 2), 2); }
    else { spr = ART.sit(look, realm, opts); g.drawImage(spr, 0, 2); }
    return c;
  });
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

// ---------- 昼夜调色（amb 为环境光，夜里以正片叠底的方式罩在地面上） ----------
const SKY = {
  night: { top: '#090b24', mid: '#18204e', hor: '#3a4886', far: '#2e3c70', mid2: '#232e5c', near: '#182044', mist: '#4c5c98', amb: '#6676c4', light: 0.42 },
  dawn: { top: '#38448a', mid: '#b47eac', hor: '#ffc49c', far: '#a48ebc', mid2: '#78689e', near: '#504e80', mist: '#ffdccc', amb: '#ffd8cc', light: 0.8 },
  day: { top: '#2c74c6', mid: '#6cb0e8', hor: '#d4f0f8', far: '#a4c6e4', mid2: '#7ca2c8', near: '#5a82aa', mist: '#f2f9ff', amb: '#ffffff', light: 1 },
  dusk: { top: '#36286a', mid: '#b8507a', hor: '#ffb872', far: '#aa7290', mid2: '#76507e', near: '#4c3c66', mist: '#ffd2ac', amb: '#ffc6a6', light: 0.74 },
};
const KEYS = [[0, 'night'], [0.16, 'night'], [0.27, 'dawn'], [0.37, 'day'], [0.63, 'day'], [0.73, 'dusk'], [0.84, 'night'], [1, 'night']];
ART.skyAt = function (ph) {
  ph = ((ph % 1) + 1) % 1;
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, ka] = KEYS[i], [b, kb] = KEYS[i + 1];
    if (ph >= a && ph <= b) {
      const t = b === a ? 0 : (ph - a) / (b - a);
      const A = SKY[ka], B = SKY[kb], o = {};
      for (const k in A) o[k] = typeof A[k] === 'number' ? A[k] + (B[k] - A[k]) * t : lerpC(A[k], B[k], t);
      return o;
    }
  }
  return Object.assign({}, SKY.night);
};

// ---------- 场景基础绘制 ----------
let ctx = null, W = 200;
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx, cy, r, c) { ctx.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy); for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function ellipse(cx, cy, rx, ry, c) { ctx.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy); for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01)))); ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function line(x0, y0, x1, y1, c, th) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); th = th || 1; for (let i = 0; i <= n; i++) R(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, th, th, c); }
ART.R = R; ART.disc = disc;
ART.setCtx = (c, w) => { ctx = c; W = w; if (root.HD2D && c && c.canvas && c.canvas.id === 'scene') root.HD2D.attach(c); };
// HD-2D（src/fx/hd2d.js）：当前在往主场景画、且高清合成开着时，背景按层分开画（天 / 远 / 中 / 地 / 前景），画完把 ctx 还给人物层
function hdBegin(kind, info) { const h = root.HD2D; if (!h || !h.on) return null; if (ctx !== h.ctx) { if (!h.owns || !h.owns(ctx)) return null; ctx = h.ctx; } return h.begin(kind, info) ? h : null; }
function hdL(h, name) { if (h) ctx = h.layer(name); }
function hdEnd(h) { if (h) ctx = h.end(); }
function hdPt(x, y) { const m = ctx.getTransform(), k = ctx._k || root.HD2D.S; return [(m.a * x + m.c * y + m.e) / k, (m.b * x + m.d * y + m.f) / k]; }
// 临时把绘制目标切到离屏画布
function on(c, fn) { const pc = ctx, pw = W; ctx = c.getContext('2d'); W = c.width; try { fn(ctx); } finally { ctx = pc; W = pw; } return c; }
function atop(fn) { ctx.save(); ctx.globalCompositeOperation = 'source-atop'; fn(); ctx.restore(); }
function cut(fn) { ctx.save(); ctx.globalCompositeOperation = 'destination-out'; fn(); ctx.restore(); }
// 有序抖动：lvl 0..16 表示覆盖比例
const pats = new Map();
function pat(c, lvl) {
  const k = c + lvl; let p = pats.get(k);
  if (!p) { const cv = mk(4, 4), g = cv.getContext('2d'); g.fillStyle = c; for (let i = 0; i < 16; i++) if (BAYER[i] < lvl) g.fillRect(i & 3, i >> 2, 1, 1); p = g.createPattern(cv, 'repeat'); pats.set(k, p); if (pats.size > 4000) pats.clear(); }
  return p;
}
function dR(x, y, w, h, c, lvl) { if (lvl <= 0) return; if (lvl >= 16) return R(x, y, w, h, c); ctx.fillStyle = pat(c, lvl); ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function ramp(cols, k) { const o = []; for (let i = 0; i < cols.length - 1; i++) for (let j = 0; j < k; j++) o.push(lerpC(cols[i], cols[i + 1], j / k)); o.push(cols[cols.length - 1]); return o; }
// 竖向抖动渐变
function vgrad(x, y, w, h, cols, soft) {
  const n = cols.length - 1;
  for (let r = 0; r < h; r++) {
    const f = r / h * n, i = Math.min(n - 1, Math.floor(f)), lv = soft ? ((f - i) > 1 - soft ? 8 : 0) : Math.round((f - i) * 4) * 4;
    R(x, y + r, w, 1, lv >= 16 ? cols[i + 1] : cols[i]); if (lv > 0 && lv < 16) dR(x, y + r, w, 1, cols[i + 1], lv);
  }
}
function seeded(seed) { let a = (seed * 2654435761) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function vnoise(seed, cells) { const r = seeded(seed), v = []; for (let i = 0; i < cells; i++) v.push(r()); return u => { const f = (((u % 1) + 1) % 1) * cells, i = Math.floor(f), t = f - i, s = t * t * (3 - 2 * t); return v[i % cells] * (1 - s) + v[(i + 1) % cells] * s; }; }
// 周期性的山脊线（可无缝横向卷动）。sharp 越大山峰越尖
function ridgeLine(seed, len, base, amp, cells, sharp) {
  const a = vnoise(seed, cells), b = vnoise(seed + 7, cells * 2), c = vnoise(seed + 13, cells * 5), d = vnoise(seed + 3, cells * 13), out = [];
  for (let x = 0; x < len; x++) { const u = x / len; let n = a(u) * 0.55 + b(u) * 0.3 + c(u) * 0.15; n = Math.pow(Math.max(0, (n - 0.2) / 0.8), sharp || 1); out.push(Math.round(base - amp * n + (d(u) - 0.5) * 2)); }
  return out;
}
// 画一层山：顶色向底部的雾色抖动过渡，迎光面提亮、背光面压暗
function paintRidge(arr, yb, cTop, cBot, o) {
  o = o || {}; const len = arr.length; let top = 999; for (const v of arr) top = Math.min(top, v);
  const lit = o.lit || lerpC(cTop, '#ffffff', 0.22), dk = o.dark || hs(cTop, 0.82), dk2 = lerpC(cTop, dk, 0.7);
  const tmp = on(mk(len, yb), () => {
    for (let x = 0; x < len; x++) R(x, arr[x], 1, yb - arr[x], cTop);
    atop(() => {
      vgrad(0, top, len, yb - top, ramp([cTop, cTop, lerpC(cTop, cBot, 0.5), cBot], 3));
      for (let x = 0; x < len; x++) {
        const s = arr[(x + 2) % len] - arr[(x - 2 + len) % len], y = arr[x];
        if (s > 1) { const hh = 4 + (x * 7 % 6) + Math.min(8, s * 2); R(x, y, 1, hh, dk2); dR(x, y + hh, 1, 2, dk2, 8); }
        else if (s < -1) { R(x, y, 1, 1 + (x % 2), lit); dR(x, y + 1, 1, 2 + (x * 5 % 4), lit, 8); }
        else R(x, y, 1, 1, lit);
        if (o.snow && y < o.snow) { R(x, y, 1, Math.min(2 + (x * 3 % 3), o.snow - y), o.snowC || '#f4f6ff'); }
        if (o.trees && (x * 13 % 5) < 2) R(x, y - 1 - (x * 7 % 2), 1, 2, o.trees);
      }
    });
  });
  ctx.drawImage(tmp, o.x || 0, 0);
}
function glow(x, y, r, c, a) {
  const h = root.HD2D; if (h && h.on && (ctx === h.ctx || (h.owns && h.owns(ctx)))) { const p = hdPt(x, y); h.light(p[0], p[1], r, c, Math.min(1, a * 0.9), 2); return; }   // 高清合成时改成一盏平滑的灯
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 1; i--) { ctx.globalAlpha = a * (0.22 + (3 - i) * 0.18); disc(x, y, Math.round(r * i / 3), c); }
  ctx.restore();
}
ART.glow = glow;
function mulC(c, m) { const A = hex(c), B = hex(m); return toHex(A[0] * B[0] / 255, A[1] * B[1] / 255, A[2] * B[2] / 255); }
function layer(key, fn) { let c = layerCache.get(key); if (!c) { c = fn(); layerCache.set(key, c); } return c; }

// ---------- 通用小物件 ----------
// 云：受光的顶、灰紫的腹、平底
function cloudSprite(seed, w, cl, cm, cs) {
  const r = seeded(seed), n = Math.max(2, Math.round(w / 5)), bl = [];
  for (let k = 0; k < n; k++) { const u = n === 1 ? 0.5 : k / (n - 1), rr = Math.round(2.2 + Math.sin(u * Math.PI) * (2 + r() * 3.2) + r()); bl.push([5 + u * (w - 2), 11.5 - rr * 0.7 + r(), rr]); }
  return on(mk(w + 10, 16), () => {
    for (const b of bl) disc(b[0], b[1], b[2], cl);
    R(3, 9, w + 4, 4, cl);
    atop(() => {
      for (const b of bl) disc(b[0] + 1, b[1] + 3, b[2], cm);
      R(2, 10, w + 6, 3, cm);
      for (const b of bl) if (b[2] > 3) disc(b[0] + 2, b[1] + 7, b[2], cs);
      R(4, 12, w + 2, 1, cs);
    });
    ctx.clearRect(0, 13, w + 10, 3); ctx.clearRect(0, 12, 4, 1); ctx.clearRect(w + 6, 12, 4, 1);
  });
}
function pine(x, y, h, c, trunk) { // c = [暗, 中, 亮]
  x = Math.round(x); y = Math.round(y);
  R(x, y - 4, 1, 4, trunk || '#4a3028'); R(x - 1, y - 2, 1, 2, trunk || '#4a3028');
  const n = Math.max(3, Math.round(h / 4.5)), lh = Math.round((h - 3) / n) + 2;
  for (let i = 0; i < n; i++) {
    const by = y - 3 - Math.round(i * (h - 4) / n), hw = Math.round((n - i) * 1.5 + 1);
    for (let r = 0; r < lh; r++) {
      const w2 = Math.max(0, Math.round(hw * (r + 1) / lh)), yy = by - lh + r + 1;
      R(x - w2, yy, w2 * 2 + 1, 1, c[1]);
      if (w2 > 0) { R(x - w2, yy, Math.max(1, Math.round(w2 * 0.7)), 1, c[2]); R(x + 1 + Math.round(w2 * 0.3), yy, w2 - Math.round(w2 * 0.3), 1, c[0]); }
      if (r === lh - 1) { R(x - w2 - 1, yy, 1, 1, c[1]); R(x + w2 + 1, yy, 1, 1, c[0]); R(x - w2 + 1, yy + 1, 1, 1, c[0]); R(x + w2 - 2, yy + 1, 2, 1, c[0]); }
    }
  }
  R(x, y - h - 1, 1, 2, c[2]);
}
// 岩体：tops[x] 为每列顶部
function rock(x0, tops, yb, pal, seed, o) { // pal = [暗, 中, 亮, 高光]
  o = o || {}; const w = tops.length, r = seeded(seed || 1);
  const tmp = on(mk(w, yb), () => {
    for (let x = 0; x < w; x++) R(x, tops[x], 1, yb - tops[x], pal[1]);
    atop(() => {
      { const sd = lerpC(pal[1], pal[0], 0.45), sx = Math.round(w * 0.62); R(sx, 0, w, yb, sd); dR(sx - 2, 0, 2, yb, sd, 8); }
      for (let i = 0; i < w * 0.22; i++) { // 竖向石缝
        const x = Math.floor(r() * w), y = tops[x] + 2 + Math.floor(r() * 10), len = 4 + Math.floor(r() * 16);
        for (let k = 0; k < len; k++) { const xx = x + (k > len / 2 ? 1 : 0); R(xx, y + k, 1, 1, pal[0]); if (k % 3 !== 2) R(xx + 1, y + k, 1, 1, pal[2]); }
      }
      for (let i = 0; i < w * 0.2; i++) { const x = Math.floor(r() * w), y = tops[x] + 4 + Math.floor(r() * (yb - tops[x])), l = 2 + Math.floor(r() * 5); R(x, y, l, 1, pal[2]); R(x, y + 1, l + 1, 1, pal[0]); }
      for (let x = 0; x < w; x++) { const y = tops[x], s = (tops[Math.min(w - 1, x + 1)] || y) - (tops[Math.max(0, x - 1)] || y); R(x, y, 1, 1, s > 1 ? pal[2] : pal[3]); R(x, y + 1, 1, 1 + (x * 3 % 2), s > 1 ? pal[1] : pal[2]); if (s > 2) dR(x, y + 1, 1, 6, pal[0], 8); }
      if (o.moss) for (let x = 0; x < w; x++) if (vnoise(seed + 5, 9)(x / w) > 0.4) { R(x, tops[x], 1, 1 + (x * 7 % 3 === 0 ? 2 : 1), o.moss[x % 2]); if (x * 11 % 7 === 0) R(x, tops[x] + 2, 1, 2 + x % 3, o.moss[0]); }
      dR(0, yb - 10, w, 10, pal[0], 4); dR(0, yb - 4, w, 4, pal[0], 8);
    });
  });
  ctx.drawImage(tmp, x0, 0);
}
// 中式屋顶：瓦垄、檐口、起翘的飞檐
function roof(cx, y, wt, wb, h, c, o) {
  o = o || {};
  const hwAt = r => Math.round((wt + (wb - wt) * Math.pow(r / Math.max(1, h - 1), 1.6)) / 2);
  for (let r = 0; r < h; r++) { const hw = hwAt(r); R(cx - hw, y + r, hw * 2, 1, r % 2 ? c.m : c.l); dR(cx + Math.round(hw * 0.35), y + r, hw - Math.round(hw * 0.35), 1, c.d, 6); R(cx - hw, y + r, Math.max(1, Math.round(hw * 0.25)), 1, r % 2 ? c.l : c.e); }
  const hb = hwAt(h - 1);
  for (let x = cx - hb + 2; x < cx + hb - 1; x += 3) for (let r = 0; r < h; r++) if (Math.abs(x - cx + 0.5) < hwAt(r) - 1) R(x, y + r, 1, 1, c.d);
  // 檐口
  R(cx - hb - 1, y + h, hb * 2 + 2, 1, c.e); for (let x = cx - hb; x < cx + hb; x += 2) R(x, y + h, 1, 1, c.m);
  R(cx - hb, y + h + 1, hb * 2, 1, c.u);
  // 飞檐
  for (const s of [-1, 1]) { const ex = s < 0 ? cx - hb - 2 : cx + hb + 1; R(ex, y + h - 1, 1, 2, c.m); R(ex + s, y + h - 2, 1, 2, c.l); R(ex + s * 2, y + h - 3, 1, 1, s < 0 ? c.e : c.l); if (o.big) R(ex + s * 3, y + h - 5, 1, 2, c.e); }
  // 正脊
  const hw0 = Math.round(wt / 2);
  R(cx - hw0 - 1, y - 2, hw0 * 2 + 2, 2, c.d); R(cx - hw0 - 1, y - 2, hw0 * 2 + 2, 1, c.m);
  if (!o.plain) { R(cx - hw0 - 2, y - 4, 2, 3, c.d); R(cx + hw0, y - 4, 2, 3, c.d); R(cx - hw0 - 2, y - 5, 1, 1, c.e); R(cx + hw0 + 1, y - 5, 1, 1, c.e); }
}
const ROOF = {
  grey: { l: '#7d7892', m: '#615c78', d: '#45405c', e: '#9d98b0', u: '#2a2440' },
  thatch: { l: '#e0bd74', m: '#c89e58', d: '#9c7640', e: '#f2d894', u: '#553a28' },
  slate: { l: '#5f7c96', m: '#425b74', d: '#2c3c58', e: '#93b4c6', u: '#1c2036' },
  gold: { l: '#ffdf86', m: '#ecb43c', d: '#bc7c20', e: '#fff5c4', u: '#6c4418' },
};
// 悬挂的灯笼（lit 时更亮）
function lantern(x, y, lit) {
  R(x, y - 3, 1, 3, '#3a2420'); R(x - 1, y, 3, 1, '#5a3a20');
  R(x - 2, y + 1, 5, 4, lit ? '#f25a3c' : '#c23a30'); R(x - 1, y + 1, 1, 4, lit ? '#ffb070' : '#e8604a'); R(x + 2, y + 1, 1, 4, lit ? '#d8402e' : '#8e2428');
  if (lit) R(x, y + 2, 1, 2, '#ffe8a0');
  R(x - 2, y + 3, 5, 1, lit ? '#ffc060' : '#e0a040'); R(x - 1, y + 5, 3, 1, '#5a3a20'); R(x, y + 6, 1, 2, '#f4c542');
}
// 花树 / 阔叶树：季节决定花叶颜色
function bloomTree(x, y, s, pal, seed) { // pal = [暗, 中, 亮, 花]
  const r = seeded(seed || 3);
  line(x, y, x - 1, y - 6 * s, '#5a3a30', 2); line(x - 1, y - 6 * s, x + 3 * s, y - 11 * s, '#5a3a30'); line(x - 1, y - 6 * s, x - 5 * s, y - 10 * s, '#5a3a30'); R(x + 1, y - 5 * s, 1, 5 * s, '#7a5240');
  if (!pal) return;
  const bl = [[-5, -11, 5], [3, -13, 5], [-1, -16, 5], [6, -9, 4], [-8, -8, 3]];
  for (const b of bl) disc(x + b[0] * s, y + b[1] * s, Math.round(b[2] * s), pal[1]);
  for (const b of bl) { disc(x + b[0] * s + 2, y + b[1] * s + 2, Math.round(b[2] * s) - 2, pal[0]); }
  for (const b of bl) { disc(x + b[0] * s - 1, y + b[1] * s - 1, Math.round(b[2] * s) - 2, pal[1]); disc(x + b[0] * s - 1, y + b[1] * s - 2, Math.round(b[2] * s) - 3, pal[2]); }
  for (let i = 0; i < 26 * s; i++) { const b = bl[i % bl.length], a = r() * 6.28, d = r() * b[2] * s; R(x + b[0] * s + Math.cos(a) * d, y + b[1] * s + Math.sin(a) * d, 1, 1, i % 3 ? pal[3] : pal[0]); }
}

// ---------- 洞府：静态地形（按洞府等级 / 季节缓存） ----------
const G = { g0: '#5c9a4e', g1: '#467c48', g2: '#84ba5a', g3: '#aad66a', gd: '#35633f', s0: '#b8ac98', s1: '#93897e', s2: '#d0c6b0', s3: '#e2dac6', sd: '#766c70', r: ['#55506e', '#716c8a', '#928ea8', '#b4b0c8'], moss: ['#4e8448', '#6aa456'] };
const SEASON_TREE = [['#c8608a', '#f08ab0', '#ffc2d6', '#fff0f4'], ['#3a7a46', '#56a052', '#86c86a', '#c8ec8a'], ['#b0502a', '#e08a34', '#f6c050', '#ffe89a'], null];
function drawGround(season) {
  const r = seeded(41);
  R(0, 100, 200, 60, G.g0);
  // 大片的明暗草色
  const nA = vnoise(9, 7), nB = vnoise(23, 11);
  for (let y = 101; y < 152; y += 1) for (let x = 0; x < 200; x += 4) { const v = nA(x / 200 + y * 0.013) + nB(x / 200 - y * 0.02) * 0.6; if (v > 1.0) dR(x, y, 4, 1, G.g2, v > 1.15 ? 8 : 4); else if (v < 0.55) dR(x, y, 4, 1, G.g1, v < 0.42 ? 8 : 4); }
  // 草缘
  for (let x = 0; x < 200; x++) { const y = 100 + Math.round(Math.sin(x / 9) * 0.8 + Math.sin(x / 3.1) * 0.5); R(x, y - 1, 1, 2, G.g2); if (x % 3 === 0) R(x, y - 2 - (x % 2), 1, 2, x % 6 ? G.g2 : G.g3); if (x % 5 === 2) R(x, y - 2, 1, 1, G.g1); R(x, y + 1, 1, 1, G.g1); }
  // 草丛与小花
  const free = (x, y) => !(x > 40 && x < 160 && y > 103 && y < 150) && !(x < 42 && y > 106 && y < 150);
  for (let i = 0; i < 120; i++) { const x = Math.floor(r() * 198), y = 104 + Math.floor(r() * 44); if (!free(x, y)) continue; const c = r() < 0.5 ? G.g1 : G.g3; R(x, y, 1, 2, c); R(x + 1, y - 1, 1, 2, c === G.g1 ? G.gd : G.g2); if (r() < 0.4) R(x + 2, y, 1, 1, c); }
  const fl = season === 3 ? ['#ffffff', '#dfe8ff', '#ffffff'] : ['#fff4b8', '#f7a3c4', '#ffffff', '#b8a4f0'];
  for (let i = 0; i < 46; i++) { const x = Math.floor(r() * 196) + 1, y = 105 + Math.floor(r() * 42); if (!free(x, y)) continue; const c = fl[i % fl.length]; R(x, y, 1, 1, c); if (r() < 0.5) { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); R(x, y, 1, 1, '#f4c542'); } R(x, y + 1 + (r() < 0.5 ? 1 : 0), 1, 1, G.gd); }
  if (season === 3) for (let i = 0; i < 60; i++) { const x = Math.floor(r() * 198), y = 102 + Math.floor(r() * 46); if (free(x, y)) dR(x, y, 3 + r() * 5, 1, '#eef4ff', 8); }
  // 平台前沿：草皮垂在岩壁上
  for (let x = 0; x < 200; x++) { const y = 150 + Math.round(Math.sin(x / 6) + Math.sin(x / 2.3) * 0.6); R(x, y, 1, 12, G.r[1]); R(x, y, 1, 1, G.gd); R(x, y + 1, 1, 1 + (x * 7 % 3), G.g1); if (x % 4 === 1) R(x, y + 3, 1, 2, G.r[0]); dR(x, y + 4, 1, 8, G.r[0], 8); }
}
function drawCourt() {
  const r = seeded(77), x0 = 44, x1 = 156, y0 = 108, y1 = 147;
  R(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 3, G.sd);
  R(x0, y0, x1 - x0, y1 - y0, G.s1);
  // 错缝石板，每块深浅略有不同
  for (let y = y0, row = 0; y < y1; row++) {
    const hh = Math.min(y1 - y, 5 + (row % 2));
    for (let x = x0 - (row % 2 ? 6 : 0); x < x1;) {
      const ww = 9 + Math.floor(r() * 7), xa = Math.max(x0, x), xb = Math.min(x1, x + ww), t = r();
      if (xb > xa + 1) { R(xa, y, xb - xa - 1, hh - 1, t < 0.25 ? lerpC(G.s0, G.s1, 0.4) : t > 0.8 ? lerpC(G.s0, G.s2, 0.5) : G.s0); R(xa, y, xb - xa - 1, 1, G.s2); if (r() < 0.25) dR(xa + 1, y + 1, xb - xa - 3, hh - 2, G.s1, 4); if (r() < 0.14) { R(xa + 1, y + hh - 2, 2, 1, G.moss[0]); R(xa + 1, y + hh - 3, 1, 1, G.moss[1]); } if (r() < 0.12) line(xa + 2, y + 1, xa + 5, y + hh - 2, G.s1); }
      x += ww;
    }
    y += hh;
  }
  R(x0 - 1, y0 - 1, x1 - x0 + 2, 1, G.s3); R(x0 - 1, y1, x1 - x0 + 2, 1, G.s1); R(x0 - 1, y1 + 1, x1 - x0 + 2, 1, G.sd);
  // 打坐的圆形石台（刻着阵纹）
  const cx = 100, cy = 136;
  ellipse(cx, cy + 2, 29, 9, G.sd); ellipse(cx, cy, 29, 9, G.s1); ellipse(cx, cy, 28, 8, G.s2); ellipse(cx, cy, 26, 7, G.s0);
  for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180; R(cx + Math.cos(t) * 22, cy + Math.sin(t) * 5.6, 1, 1, G.s1); if (a % 45 < 8) R(cx + Math.cos(t) * 17, cy + Math.sin(t) * 4.2, 1, 1, G.sd); if (a % 8 === 0) R(cx + Math.cos(t) * 12, cy + Math.sin(t) * 3, 1, 1, G.s1); }
  // 院前石阶与踏步
  R(88, 148, 24, 2, G.s0); R(88, 148, 24, 1, G.s2); R(90, 150, 20, 2, G.s1); R(90, 150, 20, 1, G.s0);
  // 角上的草与碎石
  for (const [x, y] of [[x0 - 2, y1 - 2], [x1, y1 - 3], [x0 - 2, y0 + 2], [x1 + 1, y0 + 4]]) { R(x, y, 1, 3, G.g1); R(x + 1, y - 1, 1, 4, G.g3); R(x - 1, y + 1, 1, 2, G.g2); }
}
function boulder(x, y, w, h) { ellipse(x, y, w, h, G.r[1]); ellipse(x - 1, y - 1, w - 1, h - 1, G.r[2]); R(x - w + 2, y - h, w, 1, G.r[3]); R(x - w + 1, y + h, w * 2 - 1, 1, G.r[0]); dR(x, y, w, h, G.r[0], 6); R(x - w, y + h - 1, 2, 2, G.g1); R(x + w - 1, y + h, 2, 1, G.gd); }
function stoneLamp(x, y) { R(x - 2, y - 2, 5, 2, G.s1); R(x - 1, y - 7, 3, 5, G.s0); R(x - 1, y - 7, 1, 5, G.s2); R(x - 3, y - 12, 7, 5, G.s0); R(x - 2, y - 11, 5, 3, '#4a3a30'); R(x - 4, y - 13, 9, 1, G.s1); R(x - 3, y - 14, 7, 1, G.s2); R(x - 1, y - 16, 3, 2, G.s0); R(x - 3, y - 12, 1, 5, G.s2); }

// ---- 洞府建筑：每一档都比上一档华丽 ----
// 返回 { emis: 夜里发光的窗 [{x,y,w,h,c}], lanterns: [{x,y}] }
function wallBays(cx, y, w, h, P, o) { // 梁柱 + 槛窗
  o = o || {}; const n = o.bays || Math.max(3, (Math.round(w / 12) | 1)), bw = w / n, x0 = cx - w / 2, emis = o.emis;
  R(x0, y, w, h, P.wall);
  for (let i = 0; i < n; i++) {
    const bx = Math.round(x0 + i * bw) + 2, bwid = Math.round(bw) - 2, mid = i === (n - 1) / 2;
    if (mid && o.door) { R(bx, y + 2, bwid, h - 2, P.doorD); R(bx + 1, y + 3, bwid - 2, h - 3, P.door); R(bx + Math.floor(bwid / 2), y + 3, 1, h - 3, P.doorD); R(bx + Math.floor(bwid / 2) - 2, y + Math.floor(h / 2) + 2, 1, 1, '#f4c542'); R(bx + Math.floor(bwid / 2) + 2, y + Math.floor(h / 2) + 2, 1, 1, '#f4c542'); for (let yy = y + 4; yy < y + h - 1; yy += 3) { R(bx + 2, yy, 1, 1, P.doorL); R(bx + bwid - 3, yy, 1, 1, P.doorL); } }
    else if (h >= 9) {
      const wy = y + 3, wh = Math.min(h - 6, 8);
      R(bx, wy, bwid, wh, P.frame); R(bx + 1, wy + 1, bwid - 2, wh - 2, P.paper);
      for (let xx = bx + 2; xx < bx + bwid - 1; xx += 2) R(xx, wy + 1, 1, wh - 2, P.lat); R(bx + 1, wy + Math.floor(wh / 2), bwid - 2, 1, P.lat);
      if (emis) emis.push({ x: bx + 1, y: wy + 1, w: bwid - 2, h: wh - 2 });
      R(bx, wy + wh + 1, bwid, h - wh - 4, P.panel); R(bx, wy + wh + 1, bwid, 1, P.frame);
    } else { R(bx, y + 2, bwid, h - 3, P.paper); for (let xx = bx + 1; xx < bx + bwid; xx += 2) R(xx, y + 2, 1, h - 3, P.lat); if (emis) emis.push({ x: bx, y: y + 2, w: bwid, h: h - 3 }); }
  }
  for (let i = 0; i <= n; i++) { const px = Math.round(x0 + i * bw) - (i === n ? 2 : 0); R(px, y, 2, h, P.pil); R(px, y, 1, h, P.pilL); if (i < n) R(px + 2, y + 1, 1, h - 1, P.pilD); }
  R(x0, y, w, 2, P.beam); for (let xx = x0 + 1; xx < x0 + w; xx += 3) R(xx, y + 1, 1, 1, P.beamL); R(x0, y + 2, w, 1, P.pilD);
}
function terrace(cx, y, w, h, c) { // 台基 + 栏杆 + 踏步
  R(cx - w / 2, y - h, w, h, c[1]); R(cx - w / 2, y - h, w, 1, c[3]); R(cx - w / 2, y - h + 1, w, 1, c[2]); dR(cx - w / 2, y - 2, w, 2, c[0], 8);
  for (let x = cx - w / 2 + 3; x < cx + w / 2 - 2; x += 7) R(x, y - h + 2, 1, h - 2, c[0]);
  for (let i = 0; i < h; i++) { const sw = 12 + i * 2; R(cx - sw / 2, y - h + i, sw, 1, i % 2 ? c[1] : c[3]); }
  R(cx - 7 - h, y - h, 1, h, c[0]); R(cx + 6 + h, y - h, 1, h, c[0]);
}
function rail(x0, x1, y, c) { R(x0, y - 4, x1 - x0, 1, c[2]); R(x0, y - 2, x1 - x0, 1, c[1]); for (let x = x0; x <= x1; x += 4) { R(x, y - 5, 1, 5, c[1]); R(x, y - 6, 1, 1, c[2]); } }
function plaque(cx, y, w, gold) { R(cx - w / 2 - 1, y - 1, w + 2, 6, '#2a1a1c'); R(cx - w / 2, y, w, 4, gold ? '#1e3a6a' : '#3a2a24'); for (let x = cx - w / 2 + 2; x < cx + w / 2 - 1; x += 3) { R(x, y + 1, 2, 1, '#f4c542'); R(x, y + 2, 1, 1, '#ffe8a0'); } R(cx - w / 2 - 1, y - 1, w + 2, 1, '#c8962a'); R(cx - w / 2 - 1, y + 4, w + 2, 1, '#8a6420'); }

function bldRuin(cx, b, info) { // 0 荒山破庙
  const st = ['#6f6672', '#8a8088', '#a59a9c', '#bfb4b0'], pl = '#a79a8c', plD = '#8b7e76', br = '#8a5e50';
  bloomTree(cx - 36, b + 1, 1.3, null); line(cx - 37, b - 12, cx - 44, b - 20, '#5a3a30'); line(cx - 33, b - 13, cx - 28, b - 22, '#5a3a30'); line(cx - 42, b - 12, cx - 47, b - 13, '#5a3a30');
  R(cx - 27, b - 3, 54, 3, st[1]); R(cx - 27, b - 3, 54, 1, st[3]); for (let x = cx - 24; x < cx + 26; x += 8) R(x, b - 2, 1, 2, st[0]);
  // 左墙完好，右墙坍塌成阶梯状
  R(cx - 23, b - 21, 17, 18, pl); R(cx + 6, b - 21, 17, 18, pl);
  cut(() => { for (let i = 0; i < 6; i++) R(cx + 9 + i * 3, b - 22, 20, 3 + i * 3 - (i % 2), '#000'); });
  R(cx - 6, b - 21, 12, 18, '#1e1722'); R(cx - 5, b - 9, 10, 6, '#2a2028');
  for (const [x, y, w] of [[-21, -17, 5], [-14, -9, 6], [-20, -6, 4], [8, -8, 6], [14, -5, 5], [7, -14, 4]]) { R(cx + x, b + y, w, 2, br); R(cx + x, b + y, w, 1, lerpC(br, '#ffffff', 0.2)); R(cx + x + 2, b + y + 2, w - 1, 2, hs(br, 0.85)); }
  dR(cx - 23, b - 21, 17, 18, plD, 4); dR(cx - 12, b - 21, 6, 18, plD, 8); dR(cx + 6, b - 14, 17, 11, plD, 6);
  line(cx - 18, b - 20, cx - 15, b - 12, plD); line(cx - 15, b - 12, cx - 17, b - 7, plD);
  // 门框、斜挂的破门板、歪匾
  R(cx - 8, b - 21, 2, 18, '#4f3028'); R(cx + 6, b - 21, 2, 18, '#4f3028'); R(cx - 8, b - 22, 16, 2, '#5f3a2e');
  line(cx - 5, b - 17, cx - 1, b - 4, '#6a4634', 2); line(cx - 4, b - 17, cx, b - 4, '#855a40');
  line(cx - 5, b - 25, cx + 5, b - 23, '#3a2a24', 3); line(cx - 3, b - 24, cx + 3, b - 23, '#8a7440');
  // 半塌的瓦顶
  const rf = on(mk(200, 60), () => {
    roof(100, 12, 30, 62, 12, ROOF.grey, { plain: true });
    cut(() => { for (let i = 0; i < 9; i++) R(118 + i * 2, 8, 30, 3 + i * 2 + (i % 3), '#000'); R(84, 15, 4, 3, '#000'); R(85, 14, 2, 1, '#000'); R(100, 19, 3, 2, '#000'); });
    R(84, 15, 4, 3, '#241c2a'); R(100, 19, 3, 2, '#241c2a');
    for (const x of [78, 91, 106, 112]) { R(x, 12 + (x % 5), 2, 1, G.moss[1]); R(x + 1, 13 + (x % 5), 2, 1, G.moss[0]); }
  });
  // 露出的椽子
  line(cx + 12, b - 25, cx + 27, b - 16, '#5a3a2c', 2); line(cx + 16, b - 31, cx + 30, b - 20, '#6a4634'); line(cx + 9, b - 22, cx + 22, b - 22, '#4f3028');
  ctx.drawImage(rf, cx - 100, b - 44);
  // 蛛网、瓦砾、杂草
  line(cx - 6, b - 19, cx - 1, b - 20, '#d8d4e0'); line(cx - 6, b - 15, cx - 3, b - 20, '#d8d4e0'); R(cx - 4, b - 18, 1, 1, '#d8d4e0');
  for (const [x, w] of [[18, 7], [26, 5], [-30, 5], [31, 3]]) { ellipse(cx + x, b - 1, w / 2, 2, st[1]); R(cx + x - w / 2 + 1, b - 3, w - 2, 1, st[3]); R(cx + x + 1, b, 2, 1, st[0]); }
  for (const x of [-25, -9, 4, 12, 24, 33]) { R(cx + x, b - 4 - (x & 1), 1, 4, G.g1); R(cx + x + 1, b - 6, 1, 6, G.g2); R(cx + x + 2, b - 3, 1, 3, G.gd); }
}
function bamboo(x, y, h, lean, seed) {
  const r = seeded(seed), c = r() < 0.5 ? ['#3f7a3a', '#62a84c', '#8cd066'] : ['#356a3c', '#519648', '#78bc5c'];
  for (let k = 0; k < h; k++) { const xx = Math.round(x + lean * k / h * (k / h)); R(xx, y - k, 2, 1, c[1]); R(xx, y - k, 1, 1, c[2]); if (k % 7 === 6) { R(xx, y - k, 2, 1, c[0]); } }
  const tx = Math.round(x + lean);
  for (let i = 0; i < 7; i++) { const ly = y - h + 2 + Math.floor(r() * h * 0.5), lx = Math.round(x + lean * Math.pow((y - ly) / h, 2)), d = r() < 0.5 ? -1 : 1, ln = 3 + Math.floor(r() * 3); for (let k = 0; k < ln; k++) { R(lx + d * (k + 1), ly + Math.round(k * 0.6), 2, 1, k < 2 ? c[1] : c[2]); } R(lx + d, ly - 1, 1, 1, c[0]); }
  for (let k = 0; k < 4; k++) { R(tx - 2 + k, y - h - 1 - (k % 2), 2, 1, c[2]); R(tx + k - 3, y - h + 1 + (k % 2), 2, 1, c[1]); }
}
function bldHut(cx, b, info, lv) { // 1-2 竹林小筑
  const r = seeded(5);
  for (let i = 0; i < 15; i++) { const x = cx - 56 + i * 8 + Math.floor(r() * 5); if (Math.abs(x - cx) < 8) continue; bamboo(x, b + 1, 30 + Math.floor(r() * 22), (r() - 0.5) * 8, i + 3); }
  const wd = ['#8a6a3c', '#b89456', '#d8b672', '#ecd294'];
  // 侧屋（二级）
  if (lv >= 2) { R(cx + 20, b - 12, 16, 12, wd[1]); for (let x = cx + 20; x < cx + 36; x += 2) R(x, b - 12, 1, 12, wd[0]); R(cx + 25, b - 9, 6, 5, '#3a2a24'); R(cx + 26, b - 8, 4, 3, '#f4e0a0'); R(cx + 28, b - 8, 1, 3, wd[0]); info.emis.push({ x: cx + 26, y: b - 8, w: 4, h: 3 }); roof(cx + 28, b - 19, 8, 24, 6, ROOF.thatch, { plain: true }); }
  // 台基与门廊
  R(cx - 25, b - 3, 50, 3, G.s1); R(cx - 25, b - 3, 50, 1, G.s3); R(cx - 6, b - 1, 12, 2, G.s0);
  R(cx - 21, b - 20, 42, 17, wd[1]);
  for (let x = cx - 21; x < cx + 21; x += 3) { R(x, b - 20, 1, 17, wd[0]); R(x + 1, b - 20, 1, 17, wd[2]); }
  for (const y of [b - 15, b - 8]) for (let x = cx - 21; x < cx + 21; x += 3) R(x + 1, y + (x % 2), 2, 1, wd[0]);
  dR(cx + 8, b - 20, 13, 17, wd[0], 4);
  // 门帘
  R(cx - 6, b - 16, 12, 13, '#2a2028'); R(cx - 7, b - 17, 14, 1, wd[0]); R(cx - 5, b - 16, 10, 7, '#3c6a9a'); R(cx - 5, b - 16, 10, 1, '#5a8ac0'); R(cx, b - 16, 1, 7, '#2a4a74'); R(cx - 3, b - 13, 2, 2, '#e8f0ff'); R(cx + 2, b - 13, 2, 2, '#e8f0ff'); for (let x = cx - 5; x < cx + 5; x += 2) R(x, b - 9, 1, 1, '#3c6a9a');
  // 圆窗
  for (const s of [-1, 1]) { const wx = cx + s * 14; disc(wx, b - 11, 4, wd[0]); disc(wx, b - 11, 3, '#f4e0a0'); R(wx, b - 14, 1, 7, wd[0]); R(wx - 3, b - 11, 7, 1, wd[0]); info.emis.push({ x: wx - 2, y: b - 13, w: 5, h: 5, round: 1 }); }
  R(cx - 23, b - 20, 2, 17, wd[0]); R(cx - 23, b - 20, 1, 17, wd[2]); R(cx + 21, b - 20, 2, 17, wd[0]);
  roof(cx, b - 33, 26, 58, 12, ROOF.thatch, { plain: true });
  for (let x = cx - 28; x < cx + 28; x += 2) R(x, b - 20 + (x % 4 ? 0 : 1), 1, 1, ROOF.thatch.d);
  R(cx - 12, b - 36, 24, 2, wd[0]); R(cx - 12, b - 36, 24, 1, wd[2]); for (let x = cx - 10; x < cx + 10; x += 5) R(x, b - 37, 2, 4, wd[0]);
  // 篱笆
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = cx + s * (30 + i * 3); R(x, b - 6 - (i % 2), 1, 7, wd[1]); R(x, b - 6 - (i % 2), 1, 1, wd[3]); } R(cx - 46, b - 4, 17, 1, wd[0]); R(cx + 30, b - 4, 16, 1, wd[0]);
  // 风铃 / 灯
  R(cx - 17, b - 20, 1, 3, '#3a2a24'); R(cx - 18, b - 17, 3, 2, '#c8a44a'); R(cx - 17, b - 15, 1, 2, '#e8f0ff');
  if (lv >= 2) { info.lanterns.push({ x: cx + 17, y: b - 18 }); for (const x of [-33, -29]) { R(cx + x, b - 3, 3, 3, '#8a5a3c'); R(cx + x, b - 5, 1, 2, G.g2); R(cx + x + 1, b - 6, 1, 3, '#f7a3c4'); R(cx + x + 2, b - 5, 1, 2, G.g3); } }
}
function bldCave(cx, b, info, lv) { // 3-5 石壁洞府
  const w = 116, tops = [], n1 = vnoise(31, 5), n2 = vnoise(57, 13);
  for (let x = 0; x < w; x++) { const u = x / w, env = Math.sin(u * Math.PI); tops.push(Math.round(b - 8 - Math.pow(env, 0.55) * (40 + n1(u) * 16) - n2(u) * 5 + (x % 9 === 0 ? 1 : 0))); }
  rock(cx - w / 2, tops, b + 1, G.r, 11, { moss: G.moss });
  // 崖顶的松与垂下的藤
  pine(cx - 30, tops[28] + 2, 15, ['#2c5a40', '#3f7c4c', '#62a65c']); pine(cx + 24, tops[82] + 2, 12, ['#2c5a40', '#3f7c4c', '#62a65c']);
  for (const [x, l] of [[-40, 9], [-22, 14], [18, 11], [33, 16], [44, 8]]) for (let k = 0; k < l; k++) { R(cx + x + (k % 4 === 3 ? 1 : 0), tops[x + w / 2] + 2 + k, 1, 1, k % 3 ? G.moss[0] : G.moss[1]); if (k % 4 === 1) R(cx + x + 1, tops[x + w / 2] + 2 + k, 1, 1, G.moss[1]); }
  // 石门：门柱、门楣、门扉里透出的暖光
  const st = ['#6a6478', '#8a849a', '#aaa4b8', '#c8c2d4'];
  for (let y = 0; y < 27; y++) { const hw = y < 9 ? Math.round(Math.sqrt(81 - (9 - y) * (9 - y)) * 1.35) : 12; R(cx - hw - 3, b - 27 + y, hw * 2 + 6, 1, st[1]); }
  for (let y = 0; y < 24; y++) { const hw = y < 8 ? Math.round(Math.sqrt(64 - (8 - y) * (8 - y)) * 1.3) : 10; R(cx - hw, b - 24 + y, hw * 2, 1, '#1a1420'); if (y > 3) { R(cx - hw + 1, b - 24 + y, hw - 2, 1, '#5a3426'); R(cx + 1, b - 24 + y, hw - 2, 1, '#6a3e2c'); R(cx - hw + 1, b - 24 + y, 1, 1, '#7a4a34'); } }
  R(cx - 1, b - 22, 2, 22, '#ffb860'); R(cx, b - 22, 1, 22, '#fff0b0'); info.emis.push({ x: cx - 1, y: b - 21, w: 2, h: 21 });
  for (let y = b - 17; y < b - 2; y += 5) { R(cx - 6, y, 1, 1, '#c8962a'); R(cx + 5, y, 1, 1, '#c8962a'); } R(cx - 3, b - 11, 1, 2, '#f4c542'); R(cx + 2, b - 11, 1, 2, '#f4c542');
  R(cx - 15, b - 27, 3, 27, st[1]); R(cx - 15, b - 27, 1, 27, st[3]); R(cx + 12, b - 27, 3, 27, st[1]); R(cx + 12, b - 27, 1, 27, st[2]); R(cx + 14, b - 27, 1, 27, st[0]);
  R(cx - 16, b - 3, 5, 3, st[2]); R(cx + 11, b - 3, 5, 3, st[2]);
  R(cx - 18, b - 31, 36, 4, st[1]); R(cx - 18, b - 31, 36, 1, st[3]); R(cx - 18, b - 28, 36, 1, st[0]); R(cx - 20, b - 33, 40, 2, st[2]); R(cx - 20, b - 33, 40, 1, st[3]);
  for (let x = cx - 16; x < cx + 16; x += 4) R(x, b - 30, 2, 2, st[0]);
  plaque(cx, b - 40, 16, lv >= 4);
  // 石阶
  for (let i = 0; i < 3; i++) { R(cx - 11 - i * 2, b + i - 1, 22 + i * 4, 1, i % 2 ? st[1] : st[3]); }
  info.lanterns.push({ x: cx - 22, y: b - 25 }, { x: cx + 22, y: b - 25 });
  R(cx - 23, b - 29, 4, 1, '#4a3028'); R(cx + 20, b - 29, 4, 1, '#4a3028');
  if (lv >= 4) { // 石狮与香炉
    for (const s of [-1, 1]) { const x = cx + s * 30; R(x - 3, b - 3, 7, 3, st[1]); R(x - 3, b - 3, 7, 1, st[3]); R(x - 2, b - 9, 5, 6, st[2]); R(x - 2, b - 12, 4, 4, st[2]); R(x - 3, b - 11, 1, 2, st[1]); R(x + 2, b - 11, 1, 2, st[1]); R(x - 1, b - 10, 1, 1, '#2a2030'); R(x + 1, b - 10, 1, 1, '#2a2030'); R(x - 2, b - 9, 1, 6, st[3]); R(x + 2, b - 8, 1, 5, st[0]); }
  }
  if (lv >= 5) { // 灵晶与石壁上的灵泉
    for (const [x, h, c] of [[-46, 9, 0], [-42, 6, 1], [40, 8, 1], [45, 11, 0], [50, 5, 1]]) { const cc = c ? ['#3a8ac8', '#6fd0f0', '#d0f8ff'] : ['#6a4ac8', '#a88af0', '#e6dcff']; for (let k = 0; k < h; k++) { const ww = k < 2 ? 1 : k > h - 2 ? 2 : 3; R(cx + x - Math.floor(ww / 2), b - h + k, ww, 1, cc[1]); R(cx + x - Math.floor(ww / 2), b - h + k, 1, 1, cc[2]); if (ww > 2) R(cx + x + 1, b - h + k, 1, 1, cc[0]); } info.glows.push({ x: cx + x, y: b - h / 2, r: 6, c: cc[1], a: 0.35 }); }
    info.falls.push({ x: cx + 38, y: tops[96] + 3, w: 2, h: b - tops[96] - 4 });
  }
}
function pavPal(palace) {
  return palace ? { wall: '#f4efe6', pil: '#e2d6c0', pilL: '#ffffff', pilD: '#b8a890', beam: '#d8a838', beamL: '#fff0a8', frame: '#c89a3a', paper: '#fff4cc', lat: '#d8a84a', panel: '#e8dcc8', door: '#c8962e', doorD: '#8a6018', doorL: '#ffe08a' }
    : { wall: '#e8d8b8', pil: '#b23a2e', pilL: '#da5c48', pilD: '#7a2424', beam: '#2c6a60', beamL: '#f4c542', frame: '#7a2a22', paper: '#f6e4b0', lat: '#b0703c', panel: '#a8443a', door: '#8a2c24', doorD: '#4f1818', doorL: '#f4c542' };
}
function bldPavilion(cx, b, info, lv) { // 6-8 云中楼阁
  const P = pavPal(false), rf = ROOF.slate, st = ['#8a8498', '#a8a2b4', '#c4bece', '#e0dce8'];
  const w = 58;
  if (lv >= 7) for (const s of [-1, 1]) { // 两侧配殿
    const x = cx + s * 44; R(x - 11, b - 4, 22, 4, st[1]); R(x - 11, b - 4, 22, 1, st[3]);
    wallBays(x, b - 16, 18, 12, P, { bays: 3, emis: info.emis }); roof(x, b - 24, 10, 26, 7, rf);
  }
  terrace(cx, b, w + 14, 6, st); rail(cx - w / 2 - 6, cx - 9, b - 6, st); rail(cx + 9, cx + w / 2 + 6, b - 6, st);
  wallBays(cx, b - 23, w, 17, P, { door: true, bays: 5, emis: info.emis });
  roof(cx, b - 34, w - 8, w + 18, 10, rf, { big: true });
  plaque(cx, b - 30, 14, true);
  wallBays(cx, b - 46, w - 20, 11, P, { bays: 3, emis: info.emis }); rail(cx - w / 2 + 6, cx + w / 2 - 6, b - 35, ['#5a1c1c', '#8a2c24', '#b23a2e']);
  roof(cx, b - 56, lv >= 8 ? w - 26 : 12, w - 2, 9, rf, { big: true });
  if (lv >= 8) { wallBays(cx, b - 65, w - 36, 8, P, { bays: 3, emis: info.emis }); roof(cx, b - 74, 6, w - 22, 8, rf, { big: true }); R(cx - 1, b - 81, 2, 5, '#f4c542'); R(cx - 2, b - 79, 4, 2, '#ffe8a0'); R(cx, b - 83, 1, 2, '#fff6d0'); }
  else { R(cx - 1, b - 62, 2, 4, '#f4c542'); R(cx - 2, b - 60, 4, 1, '#ffe8a0'); }
  info.lanterns.push({ x: cx - w / 2 - 8, y: b - 22 }, { x: cx + w / 2 + 8, y: b - 22 });
  if (lv >= 7) info.lanterns.push({ x: cx - 13, y: b - 22 }, { x: cx + 13, y: b - 22 });
  // 绕着台基的云气
  for (const [x, ww, s] of [[-48, 16, 3], [36, 20, 7], [-14, 12, 9]]) ctx.drawImage(cloudSprite(s, ww, '#ffffff', '#e4e8f8', '#c4c8e4'), cx + x, b - 9);
}
function bldPalace(cx, b, info, lv) { // 9+ 琼楼仙宫
  const P = pavPal(true), rf = ROOF.gold, st = ['#b8b4cc', '#dcd8e8', '#f0eef8', '#ffffff'];
  const w = 66;
  // 身后的宝光
  if (lv >= 11) { for (let rr = 44; rr > 34; rr -= 5) { ctx.fillStyle = pat('#fff2b0', Math.round((44 - rr) / 5) * 2 + 2); for (let y = -rr; y <= 0; y++) { const ww = Math.round(Math.sqrt(rr * rr - y * y)); ctx.fillRect(cx - ww, b - 46 + y, ww * 2, 1); } } }
  // 两侧角楼
  for (const s of [-1, 1]) {
    const x = cx + s * 48; R(x - 9, b - 5, 18, 5, st[1]); R(x - 9, b - 5, 18, 1, st[3]);
    wallBays(x, b - 20, 14, 15, P, { bays: 3, emis: info.emis }); roof(x, b - 28, 8, 24, 7, rf, { big: true });
    wallBays(x, b - 37, 10, 8, P, { bays: 3, emis: info.emis }); roof(x, b - 45, 2, 18, 7, rf, { big: true });
    R(x, b - 50, 1, 4, '#f4c542'); R(x - 1, b - 48, 3, 1, '#fff2b0');
    if (lv >= 10) { R(x + s * 9, b - 30, 1, 25, '#c8962a'); for (let k = 0; k < 9; k++) R(x + s * 9 + (s > 0 ? 1 : -4), b - 29 + k, 4 - (k % 3 === 2 ? 1 : 0), 1, k % 2 ? '#d8483a' : '#b8342c'); R(x + s * 9, b - 31, 1, 1, '#fff2b0'); }
    // 廊桥
    R(Math.min(cx + s * 33, cx + s * 39), b - 12, 7, 2, st[2]); R(Math.min(cx + s * 33, cx + s * 39), b - 10, 7, 1, st[0]);
  }
  terrace(cx, b, w + 16, 8, st); rail(cx - w / 2 - 8, cx - 11, b - 8, st); rail(cx + 11, cx + w / 2 + 8, b - 8, st);
  for (let i = 0; i < 8; i++) R(cx - 3, b - 8 + i, 6, 1, i % 2 ? '#c8342c' : '#e04a3c'); // 红毯
  wallBays(cx, b - 26, w, 18, P, { door: true, bays: 5, emis: info.emis });
  roof(cx, b - 37, w - 8, w + 20, 10, rf, { big: true });
  plaque(cx, b - 33, 16, true);
  wallBays(cx, b - 49, w - 20, 11, P, { bays: 5, emis: info.emis }); rail(cx - w / 2 + 6, cx + w / 2 - 6, b - 38, ['#b88a2a', '#e0b040', '#ffe08a']);
  roof(cx, b - 59, w - 30, w, 9, rf, { big: true });
  wallBays(cx, b - 68, w - 38, 8, P, { bays: 3, emis: info.emis });
  roof(cx, b - 78, 6, w - 22, 9, rf, { big: true });
  // 宝顶
  R(cx - 1, b - 84, 2, 5, '#ecb43c'); R(cx - 2, b - 82, 4, 2, '#ffe08a'); disc(cx, b - 87, 2, '#fff6c8'); R(cx, b - 88, 1, 1, '#ffffff');
  info.glows.push({ x: cx, y: b - 87, r: 9, c: '#ffe27a', a: 0.5, always: 1 });
  info.lanterns.push({ x: cx - w / 2 - 9, y: b - 25 }, { x: cx + w / 2 + 9, y: b - 25 }, { x: cx - 14, y: b - 25 }, { x: cx + 14, y: b - 25 });
  // 祥云
  for (const [x, y, ww, s] of [[-64, -12, 22, 3], [40, -11, 24, 7], [-20, -9, 14, 9], [-70, -52, 16, 4], [52, -62, 18, 8]]) ctx.drawImage(cloudSprite(s, ww, '#ffffff', '#fff0d8', '#f0d0c0'), cx + x, b + y);
  if (lv >= 12) for (const s of [-1, 1]) { const x = cx + s * 76; ellipse(x, b - 60, 9, 3, '#8a86a4'); R(x - 8, b - 63, 16, 2, G.g2); R(x - 3, b - 71, 6, 8, '#f4efe6'); roof(x, b - 76, 2, 12, 5, rf, { plain: true }); R(x - 1, b - 56, 2, 4, '#6c6888'); }
}
function buildTerrain(st, season) {
  const lv = st.home.cave, info = { emis: [], lanterns: [], glows: [], falls: [], lamps: [] };
  const c = on(mk(200, 160), () => {
    // 左崖（瀑布从这里落下）
    const tl = []; for (let x = 0; x < 42; x++) tl.push(Math.round(x < 30 ? 45 + Math.abs(x - 13) * 0.35 + Math.sin(x * 1.3) * 1.2 + (x > 12 && x < 20 ? 3 : 0) : 49 + Math.pow(x - 30, 1.75) * 0.9));
    const far = G.r.map(c0 => lerpC(c0, '#7c96c0', 0.3));
    rock(0, tl, 102, far, 3, { moss: G.moss.map(c0 => lerpC(c0, '#7c96c0', 0.2)) });
    R(13, 48, 6, 54, lerpC(far[0], '#28304e', 0.5)); R(12, 50, 1, 52, far[0]);
    // 右崖
    const tr = []; for (let x = 0; x < 40; x++) tr.push(Math.round(96 - Math.pow(x / 39, 0.6) * 26 + Math.sin(x * 0.9) * 1.5));
    rock(160, tr, 102, far, 8, { moss: G.moss.map(c0 => lerpC(c0, '#7c96c0', 0.2)) });
    const pc = ['#2a5644', '#3c7850', '#5c9e5e'];
    pine(6, 46, 16, pc); pine(27, 49, 20, pc); pine(34, 58, 11, pc); pine(190, 73, 20, pc); pine(178, 80, 13, pc); pine(197, 76, 12, pc);
    drawGround(season);
    // 建筑
    const cx = 100, b = 104;
    if (lv <= 0) bldRuin(cx, b, info); else if (lv <= 2) bldHut(cx, b, info, lv); else if (lv <= 5) bldCave(cx, b, info, lv); else if (lv <= 8) bldPavilion(cx, b, info, lv); else bldPalace(cx, b, info, lv);
    drawCourt();
    // 院里的摆设
    boulder(36, 151, 4, 2); boulder(166, 148, 5, 3); boulder(194, 126, 4, 2); boulder(8, 148, 3, 2);
    bloomTree(184, 127, 1.25, SEASON_TREE[season], 5);
    if (season === 3) { for (const [x, y, w] of [[176, 110, 8], [185, 105, 9], [181, 113, 5]]) { R(x, y, w, 1, '#f4f8ff'); R(x + 1, y + 1, w - 3, 1, '#dfe8f8'); } }
    if (lv >= 2) { stoneLamp(48, 108); stoneLamp(152, 108); info.lamps.push({ x: 48, y: 98 }, { x: 152, y: 98 }); }
    if (lv >= 6) { stoneLamp(74, 152); stoneLamp(126, 152); info.lamps.push({ x: 74, y: 142 }, { x: 126, y: 142 }); }
  });
  return { c, info };
}

// ---- 灵田与丹炉（逐帧，带动画） ----
function drawField(st, t) {
  const lv = st.home.field; if (!lv) return;
  const plots = Math.min(6, 1 + Math.floor(lv / 3)), tier = lv >= 12 ? 2 : lv >= 6 ? 1 : 0;
  for (let i = 0; i < plots; i++) {
    const px = 5 + (i % 2) * 18, py = 112 + Math.floor(i / 2) * 12;
    R(px - 1, py - 1, 18, 9, '#5a4034'); R(px, py, 16, 7, '#6e4c36'); R(px - 1, py - 1, 18, 1, '#a07a50'); R(px - 1, py + 7, 18, 1, '#3e2a28');
    for (let k = 0; k < 3; k++) { R(px, py + 1 + k * 2, 16, 1, '#825c40'); dR(px, py + 2 + k * 2, 16, 1, '#553a30', 8); }
    for (let k = 0; k < 4; k++) {
      const x = px + 2 + k * 4, sw = Math.round(Math.sin(t / 700 + i * 1.3 + k) * 0.7), y = py + 1 + (k % 2);
      if (tier === 0) { R(x, y - 2, 1, 3, '#3f8a3a'); R(x - 1 + sw, y - 3, 1, 2, '#6fcf5a'); R(x + 1 + sw, y - 4, 1, 2, '#9ae06a'); R(x + sw, y - 5, 1, 1, '#d6f58a'); }
      else if (tier === 1) { R(x, y - 3, 1, 4, '#2f8a6a'); R(x - 1 + sw, y - 4, 1, 2, '#5fd8b0'); R(x + 1 + sw, y - 5, 1, 3, '#5fd8b0'); R(x - 2 + sw, y - 2, 1, 1, '#3fae8a'); R(x + sw, y - 6, 1, 1, '#d8fff0'); R(x + 2 + sw, y - 3, 1, 1, (t / 500 + k + i | 0) % 3 ? '#ffffff' : '#8ff5d0'); }
      else { R(x, y - 3, 1, 4, '#c8a860'); R(x - 2, y - 5 + (sw > 0 ? 0 : 0), 5, 2, '#e8483a'); R(x - 1, y - 6, 3, 1, '#ff7a5a'); R(x - 2, y - 4, 5, 1, '#ffd76a'); R(x - 1, y - 6, 1, 1, '#ffd0b0'); if ((t / 400 + k * 2 + i | 0) % 5 === 0) R(x + 2, y - 8, 1, 1, '#fff6c0'); }
    }
  }
  // 竹篱小牌
  R(1, 108, 1, 5, '#8a6a3c'); R(0, 106, 4, 3, '#b89456'); R(1, 107, 2, 1, '#5a4034');
}
const FURN = [
  '.......hH',
  '......hHH',
  '....AAaaa',
  'A..AaLaaa',
  'A.AaLaaaa',
  'AAbbbBbbb',
  '.AaLaaaaa',
  '.AaLaacCc',
  '.AaLaacCC',
  '.AaaLaaaa',
  '..AAaaaaa',
  '..A..AAAA',
  '.AA......',
  '.A.......',
];
function furnaceSprite(tier) {
  return cached('furn' + tier, () => {
    const P = [
      { a: '#a8743a', A: '#6e4628', L: '#dca860', b: '#6e4628', B: '#f4c542', c: '#3a2420', C: '#ff8a3a', h: '#c08a48', H: '#e8b868', f: '#ff7a2a', F: '#ffd060' },
      { a: '#5a8a88', A: '#34585e', L: '#9ad4c4', b: '#c89a3a', B: '#fff0a8', c: '#2a2030', C: '#8ff5d0', h: '#c89a3a', H: '#ffe08a', f: '#5ad8ff', F: '#d0f8ff' },
      { a: '#e0a83a', A: '#9a6418', L: '#fff0a8', b: '#b8342c', B: '#ff8a6a', c: '#4a1a18', C: '#ffe27a', h: '#e0a83a', H: '#fff6c8', f: '#c88aff', F: '#f0dcff' },
    ][tier];
    return render(grid(FURN, 18), P);
  });
}
function drawFurnace(st, t) {
  const lv = st.home.furnace; if (!lv) return null;
  const tier = lv >= 15 ? 2 : lv >= 7 ? 1 : 0, fx = 166, fy = 132;
  const spr = furnaceSprite(tier);
  R(fx - 8, fy - 1, 17, 2, G.gd); dR(fx - 10, fy - 1, 21, 2, G.gd, 8);
  ctx.drawImage(spr, fx - 10, fy - 15);
  // 炉火
  const fl = (t / 110 | 0) % 4, fc = [['#ff7a2a', '#ffd060', '#fff0b0'], ['#3ab8ff', '#8fe8ff', '#ffffff'], ['#a86aff', '#e0b8ff', '#ffffff']][tier];
  R(fx - 3, fy - 2, 6, 2, fc[0]); R(fx - 2 + (fl % 2), fy - 3, 3, 2, fc[1]); R(fx - 1 + (fl > 1 ? 1 : 0), fy - 4, 1, 2, fc[2]); R(fx - 4 + fl, fy - 3, 1, 1, fc[0]); R(fx + 3 - (fl % 3), fy - 4, 1, 2, fc[0]);
  R(fx - 2, fy - 7, 4, 1, (t / 300 | 0) % 2 ? fc[1] : fc[0]);
  return { x: fx, y: fy - 16, c: fc[0] };
}

// ---- 每个昼夜相位一份的图层：天空、远山、云、染色后的地形 ----
const CLOUDS = (() => { const rr = seeded(5), a = []; for (let i = 0; i < 7; i++) a.push({ x: rr() * 300, y: 4 + rr() * 44, s: 0.0016 + rr() * 0.003, k: i % 4, far: i % 2 }); return a; })();
const STARS = (() => { const rr = seeded(17), a = []; for (let i = 0; i < 70; i++) a.push({ x: Math.floor(rr() * 200), y: rr(), b: rr(), big: rr() < 0.12 }); return a; })();
const HOME_RIDGE = { far: ridgeLine(3, 200, 62, 34, 4, 1.7), mid: ridgeLine(12, 200, 76, 26, 5, 1.4), near: ridgeLine(29, 200, 90, 16, 6, 1.2) };
let homeFrame = null; // 当前相位的图层缓存（只留一份）
function homeLayers(st, sky, OY, season) {
  const tk = ['t', st.home.cave, season].join('|');
  const terr = layer(tk, () => { for (const k of Array.from(layerCache.keys())) if (k[0] === 't' && k[1] === '|') layerCache.delete(k); return buildTerrain(st, season); });
  const key = [sky.top, sky.hor, sky.far, sky.amb, OY, tk].join('|');
  if (homeFrame && homeFrame.key === key) return homeFrame;
  // 相位变化时每帧只重画一层，避免卡顿（首次进入则全部画好）
  const first = !homeFrame || homeFrame.OY !== OY, f = first ? { k: {}, OY } : homeFrame, H = 160 + OY;
  f.terr = terr;
  const steps = {
    sky() {
      f.sky = on(mk(200, H), () => {
        vgrad(0, 0, 200, OY + 100, ramp([sky.top, sky.mid, sky.hor, lerpC(sky.hor, sky.mist, 0.5)], 9), 0.34);
        R(0, OY + 100, 200, 60, sky.near);
      });
    },
    mount() {
      f.mount = on(mk(200, 104), () => {
        paintRidge(HOME_RIDGE.far, 104, sky.far, lerpC(sky.far, sky.mist, 0.75), { snow: 40, snowC: lerpC('#ffffff', sky.mist, 0.3) });
        // 远处的浮空岛与小塔
        const ic = lerpC(sky.far, sky.mid2, 0.6), il = lerpC(ic, '#ffffff', 0.25);
        for (let i = 0; i < 6; i++) R(146 + i, 44 + i, 22 - i * 2 - (i > 2 ? i : 0), 1, ic); R(146, 43, 22, 1, il);
        R(155, 31, 5, 12, ic); R(155, 31, 1, 12, il); for (const y of [30, 35, 39]) { R(153, y, 9, 1, ic); R(152, y + 1, 1, 1, ic); R(162, y + 1, 1, 1, ic); } R(157, 27, 1, 3, il);
        R(149, 41, 2, 2, ic); R(164, 40, 3, 3, ic);
        { const mc = lerpC(sky.far, sky.mist, 0.7); dR(0, 66, 200, 3, mc, 8); R(0, 69, 200, 4, mc); }
        paintRidge(HOME_RIDGE.mid, 104, sky.mid2, lerpC(sky.mid2, sky.mist, 0.7), { trees: hs(sky.mid2, 0.88) });
        { const mc = lerpC(sky.mid2, sky.mist, 0.6); dR(0, 85, 200, 2, mc, 8); R(0, 87, 200, 5, mc); }
        paintRidge(HOME_RIDGE.near, 104, sky.near, lerpC(sky.near, sky.mist, 0.55), { trees: hs(sky.near, 0.85) });
        { const mc = lerpC(sky.near, sky.mist, 0.5); dR(0, 96, 200, 2, mc, 8); R(0, 98, 200, 6, mc); }
      });
    },
    clouds() {
      const cl = lerpC(sky.mist, '#ffffff', 0.55), cm = lerpC(cl, sky.mid, 0.28), cs = lerpC(cl, sky.mid2, 0.5);
      f.clouds = [cloudSprite(2, 20, cl, cm, cs), cloudSprite(6, 30, cl, cm, cs), cloudSprite(9, 14, cl, cm, cs), cloudSprite(13, 40, cl, cm, cs)];
    },
    sea() {
      const fl = lerpC(sky.mist, '#ffffff', 0.7), fm = lerpC(fl, '#c2cdee', 0.45), fs = lerpC(fl, '#96a2d0', 0.6);
      f.sea = [cloudSprite(21, 34, fl, fm, fs), cloudSprite(25, 24, fl, fm, fs), cloudSprite(28, 44, fl, fm, fs)];
      f.seaC = lerpC(sky.mist, '#ffffff', 0.7);
      f.mist = on(mk(260, 8), () => { const n = vnoise(4, 9); for (let x = 0; x < 260; x += 2) { const v = n(x / 260); if (v > 0.45) { R(x, 3 + Math.round(v * 2), 2, v > 0.65 ? 3 : 1, sky.mist); if (v > 0.6) dR(x, 2 + Math.round(v * 2), 2, 5, sky.mist, 8); } } });
    },
    // 地形染上环境光：只染 y<96 的部分，其余由 nightOverlay 统一罩色（这样角色、灵宠也会一起变暗）
    terrT() {
      f.amb = sky.amb;
      f.terrT = on(mk(200, 160), () => {
        ctx.drawImage(terr.c, 0, 0);
        if (sky.amb !== '#ffffff') { ctx.globalCompositeOperation = 'multiply'; R(0, 0, 200, 96, sky.amb); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(terr.c, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
      });
    },
  };
  let pending = 0;
  for (const name in steps) { if (f.k[name] === key) continue; if (first || !pending) { steps[name](); f.k[name] = key; if (!first) pending = 1; } else pending = 2; }
  f.key = pending === 2 ? null : key;
  homeFrame = f;
  return f;
}
const SUN = () => cached('sun', () => on(mk(31, 31), () => { for (const [r, l] of [[13, 2], [11, 6]]) { ctx.globalAlpha = 0.55; ctx.fillStyle = pat('#fff0b8', l); for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(15 - w, 15 + y, w * 2 + 1, 1); } } ctx.globalAlpha = 1; disc(15, 15, 8, '#ffe89a'); disc(15, 15, 7, '#fff4c8'); disc(14, 14, 4, '#fffdf0'); }));
const MOON = () => cached('moon', () => on(mk(27, 27), () => { for (const [r, l] of [[11, 2], [9, 6]]) { ctx.globalAlpha = 0.5; ctx.fillStyle = pat('#b8c8ff', l); for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(13 - w, 13 + y, w * 2 + 1, 1); } } ctx.globalAlpha = 1; disc(13, 13, 7, '#dfe6ff'); disc(12, 12, 6, '#f6f8ff'); R(10, 10, 2, 2, '#d0d8f4'); R(15, 13, 3, 2, '#d0d8f4'); R(11, 16, 2, 1, '#d0d8f4'); R(16, 9, 1, 1, '#d0d8f4'); dR(14, 8, 6, 12, '#c4cef0', 4); }));
let lastHome = null;
// 洞府的主光 / 体积光 / 浮尘 / 调色跟着昼夜与季节走
function hdHomeLight(hd, sky, sunX, sunY, moonX, moonY, season, night) {
  const F = hd.F, day = Math.max(0, Math.min(1, (sky.light - 0.42) / 0.5)), low = Math.max(0, Math.min(1, (sunY + 20) / 80));   // low：太阳越低越接近 1
  const sunUp = sunY < 84, warm = lerpC('#fff4d0', '#ffb070', low);
  F.sun = sunUp ? { x: sunX, y: sunY, a: 0.5 + 0.5 * low, c: warm } : null;
  F.moon = moonY < 84 ? { x: moonX, y: moonY, a: 1 - day } : null;
  const lx = sunUp ? sunX : moonX, ly = sunUp ? sunY : moonY;
  F.keyL = { dx: lx < 100 ? -1 : 1, dy: -1, c: sunUp ? warm : '#a8c0ff', a: sunUp ? 0.35 + 0.3 * low : 0.4 };
  F.rays = { x: lx, y: ly, c: sunUp ? warm : '#9ab0ff', a: sunUp ? 0.07 + 0.2 * low * day : 0.09 * (1 - day), spread: 1.25, dir: Math.atan2(104 - lx, 150 - ly) };
  F.motes = night ? (season === 1 ? { n: 26, c: '#e8ff7a', kind: 'fly' } : { n: 18, c: '#b8c8ff', kind: 'wisp' }) : { n: 30, c: lerpC('#fff6d8', '#ffc890', low), kind: 'dust' };
  F.gradeC = sky.hor; F.gradeA = night ? 0.5 : 1.2;
}

// 洞府场景主绘制。返回需要叠加光照的点
ART.drawHome = function (st, t, OY, parts, opts) {
  const ph = root.HD2D && root.HD2D.debugPhase !== undefined ? root.HD2D.debugPhase : opts.phase, skyNow = ART.skyAt(ph), night = skyNow.light < 0.6, dark = 1 - skyNow.light;
  const sky = ART.skyAt(Math.round(ph * 240) / 240);
  const season = Math.floor(((st.year || 0) % 1) * 4);
  const f = homeLayers(st, sky, OY, season), info = f.terr.info, amb = f.amb;
  const hd = hdBegin('home', { OY, t, season, sky: skyNow, dark });
  hdL(hd, 'sky');
  ctx.drawImage(f.sky, 0, -OY);
  // 星
  if (skyNow.light < 0.78) {
    const a = Math.min(1, (0.78 - skyNow.light) / 0.3);
    for (const s of STARS) {
      const tw = Math.sin(t / 500 + s.b * 40); if (tw < -0.75) continue;
      const x = s.x, y = Math.round(-OY + s.y * (OY + 66));
      ctx.globalAlpha = a * (0.45 + s.b * 0.55);
      R(x, y, 1, 1, s.b > 0.7 ? '#fff6d8' : '#dfe6ff');
      if (s.big && tw > 0.2) { ctx.globalAlpha *= 0.6; R(x - 1, y, 3, 1, '#dfe6ff'); R(x, y - 1, 1, 3, '#dfe6ff'); }
    }
    ctx.globalAlpha = 1;
  }
  // 日月
  const ang = ph * Math.PI * 2, top = 10 - OY * 0.55;
  const sunX = 100 - Math.sin(ang) * 86, sunY = top + (1 + Math.cos(ang)) * 46;
  if (sunY < 90) ctx.drawImage(SUN(), Math.round(sunX) - 15, Math.round(sunY) - 15);
  const moonX = 100 + Math.sin(ang) * 86, moonY = top + (1 - Math.cos(ang)) * 46;
  if (moonY < 90) ctx.drawImage(MOON(), Math.round(moonX) - 13, Math.round(moonY) - 13);
  if (hd) hdHomeLight(hd, skyNow, sunX, sunY, moonX, moonY, season, night);
  // 云
  for (const c of CLOUDS) { const spr = f.clouds[c.k], x = ((c.x + t * c.s) % 290) - 50; ctx.drawImage(spr, Math.round(x), Math.round(c.y - OY * (c.far ? 0.5 : 0.25))); }
  hdL(hd, 'far');
  ctx.drawImage(f.mount, 0, 0);
  // 流动的山岚
  ctx.globalAlpha = 0.45; for (const [y, sp, o] of [[58, 0.004, 0], [74, 0.007, 90], [90, 0.011, 170]]) { const x = -(((t * sp + o) % 260) | 0); ctx.drawImage(f.mist, x, y); ctx.drawImage(f.mist, x + 260, y); } ctx.globalAlpha = 1;
  hdL(hd, 'ground');
  if (hd) {   // 高清：静态地形升 2 倍密度后直接画，环境光每帧现染（不必每个相位重做一张）
    f.terr.c._hdOK = 1; ctx.drawImage(f.terr.c, 0, 0);
    if (skyNow.amb !== '#ffffff') { ctx.globalCompositeOperation = 'multiply'; R(0, 0, 200, 96, skyNow.amb); ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(f.terr.c, 0, 0); ctx.globalCompositeOperation = 'source-over'; }
  } else ctx.drawImage(f.terrT, 0, 0);
  // 瀑布（颜色随环境光变化）
  const wc = ['#ffffff', '#d4ecff', '#9fcdf0', '#6fa8dc'].map(c => mulC(c, amb));
  const fall = (x0, y0, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = (((y * 2 + x * 5 - Math.floor(t / 45) * 2 + x * x * 3) % 11) + 11) % 11; R(x0 + x, y0 + y, 1, 1, k < 2 ? wc[0] : k < 5 ? wc[1] : k < 9 ? wc[2] : wc[3]); } };
  fall(14, 50, 4, 50);
  R(13, 49, 6, 2, wc[0]);
  const sp = (t / 120 | 0) % 3; for (let i = 0; i < 5; i++) { R(11 + i * 3 - sp % 2, 99 - ((i + sp) % 3), 2, 2, wc[i % 2]); } dR(8, 99, 16, 3, wc[0], 8);
  for (const fl of info.falls) { fall(fl.x, fl.y, fl.w, fl.h); R(fl.x - 1, fl.y + fl.h - 1, fl.w + 2, 2, wc[0]); }
  // 灵田、丹炉
  drawField(st, t);
  const furnaceTop = drawFurnace(st, t);
  if (furnaceTop && Math.random() < 0.06) parts.push({ x: furnaceTop.x + (Math.random() - 0.5) * 4, y: furnaceTop.y - 1, vx: 0.002, vy: -0.01, life: 2600, max: 2600, c: '#d8d0e4', s: 2 });
  // 夜里：窗与灯笼亮起来
  const lights = [], cx = 100;
  for (const l of info.lanterns) { lantern(l.x, l.y, false); }
  if (dark > 0.2) {
    const k = Math.min(1, (dark - 0.2) / 0.25);
    ctx.globalAlpha = k;
    for (const e of info.emis) { if (e.round) { R(e.x, e.y + 1, e.w, e.h - 2, '#ffd88a'); R(e.x + 1, e.y, e.w - 2, e.h, '#ffd88a'); R(e.x + 2, e.y, 1, e.h, '#a8742a'); R(e.x, e.y + 2, e.w, 1, '#a8742a'); } else { R(e.x, e.y, e.w, e.h, '#ffd88a'); for (let x = e.x + 1; x < e.x + e.w; x += 2) R(x, e.y, 1, e.h, '#e09a44'); if (e.h > 4) R(e.x, e.y + (e.h >> 1), e.w, 1, '#e09a44'); } }
    for (const l of info.lanterns) lantern(l.x, l.y, true);
    for (const l of info.lamps) { R(l.x - 2, l.y - 1, 5, 3, '#ffd88a'); R(l.x - 1, l.y, 3, 1, '#fff6d0'); }
    ctx.globalAlpha = 1;
    for (const e of info.emis) if (e.w * e.h > 12) lights.push({ x: e.x + e.w / 2, y: e.y + e.h / 2, r: 6, c: '#ffb050', a: 0.22 });
    for (const l of info.lanterns) lights.push({ x: l.x, y: l.y + 3, r: 9, c: '#ff8a44', a: 0.55 });
    for (const l of info.lamps) lights.push({ x: l.x, y: l.y, r: 9, c: '#ffc060', a: 0.5 });
  }
  for (const g2 of info.glows) if (g2.always || dark > 0.2) lights.push(g2);
  if (furnaceTop) lights.push({ x: 166, y: 130, r: 11, c: furnaceTop.c, a: 0.55 });
  // 前沿云海
  hdL(hd, 'fore');
  for (let i = 0; i < 9; i++) { const spr = f.sea[i % 3], sp2 = 0.0018 + (i % 3) * 0.0012, x = ((i * 41 + t * sp2) % 290) - 60; ctx.drawImage(spr, Math.round(x), 146 + (i % 3) * 3 + Math.round(Math.sin(t / 1900 + i) * 1)); }
  R(0, 158, 200, 3, f.seaC);
  hdEnd(hd);
  lastHome = { sky: skyNow };
  return { sky: skyNow, night, furnaceTop, lights };
};

// 夜间：地面以环境光正片叠底（保留色彩，偏蓝），再点亮光源
ART.nightOverlay = function (sky, OY, H, lights) {
  const dark = 1 - sky.light;
  if (root.HD2D && root.HD2D.on && ctx === root.HD2D.ctx) { root.HD2D.night(sky, lights); return; }
  if (sky.amb && sky.amb !== '#ffffff') { ctx.save(); ctx.globalCompositeOperation = 'multiply'; R(0, 96, W, 64, sky.amb); ctx.restore(); }
  else if (!sky.amb && dark > 0.02) { ctx.globalAlpha = dark * 0.62; R(0, -OY, W, H, '#080a24'); ctx.globalAlpha = 1; }
  for (const l of lights || []) glow(Math.round(l.x), Math.round(l.y), l.r, l.c, l.a * (0.35 + dark));
};

// ---------- 历练场景：每张地图 = 天空 + 多层视差长卷 + 逐帧特效 ----------
const TOPPAD = 60; // 长卷上方留出的高度（场景加高时用）
// 长卷内部用世界坐标作画（y 可以到 -TOPPAD）
function strip(w, fn) { return on(mk(w, TOPPAD + 132), () => { ctx.translate(0, TOPPAD); fn(w); }); }
function wrap3(w, fn) { for (const dx of [-w, 0, w]) { ctx.save(); ctx.translate(dx, 0); fn(); ctx.restore(); } }
function drawStrip(c, off, y) { const w = c.width; for (let x = -(((Math.floor(off) % w) + w) % w); x < 200; x += w) ctx.drawImage(c, x, y); }
function groundStrip(w, base, light, dark, fn) { // 地表在长卷内 y=12 处，对应世界 y=128
  return on(mk(w, 44), () => { R(0, 12, w, 32, base); vgrad(0, 16, w, 28, ramp([base, dark], 3)); R(0, 12, w, 1, light); dR(0, 13, w, 1, light, 8); if (fn) wrap3(w, fn); });
}
function roundTree(x, y, r, c, tc) { x = Math.round(x); y = Math.round(y); r = Math.round(r); R(x - 1, y - r, 2, r, tc || '#4a3428'); disc(x, y - r * 1.6, r, c[1]); disc(x - r * 0.6, y - r, Math.round(r * 0.7), c[1]); disc(x + r * 0.6, y - r, Math.round(r * 0.7), c[0]); disc(x - r * 0.3, y - r * 1.9, Math.round(r * 0.55), c[2]); disc(x + r * 0.45, y - r * 1.3, Math.round(r * 0.5), c[0]); R(x - r * 0.8, y - r * 1.2, 2, 1, c[2]); }
function deadTree(x, y, h, c, seed, rim) {
  const r = seeded(seed);
  const br = (x0, y0, a, len, th, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; line(x0, y0, x1, y1, c, th); if (rim) line(x0 - 1, y0, x1 - 1, y1, rim, 1); if (d > 0) { br(x1, y1, a - 0.35 - r() * 0.55, len * 0.66, Math.max(1, th - 1), d - 1); br(x1, y1, a + 0.3 + r() * 0.55, len * 0.6, 1, d - 1); } };
  br(x, y, -Math.PI / 2 + (r() - 0.5) * 0.4, h * 0.42, h > 24 ? 3 : 2, 3);
}
function grave(x, y, w, h, c) { // c = [暗, 中, 亮]
  x = Math.round(x); y = Math.round(y);
  R(x - w / 2, y - h + 2, w, h - 2, c[1]); R(x - w / 2 + 1, y - h + 1, w - 2, 1, c[1]); R(x - w / 2 + 2, y - h, w - 4, 1, c[1]);
  R(x - w / 2, y - h + 2, 1, h - 2, c[2]); R(x - w / 2 + 2, y - h, w - 4, 1, c[2]); R(x + w / 2 - 2, y - h + 2, 2, h - 2, c[0]);
  for (let k = 0; k < Math.floor((h - 5) / 2); k++) R(x - 1, y - h + 4 + k * 2, 1 + (k % 2), 1, c[0]);
  R(x - w / 2 - 1, y - 2, w + 2, 2, c[0]); R(x - w / 2 - 1, y - 2, w + 1, 1, c[1]);
}
function swordProp(x, y, len, tilt, c, hilt) { // 插在地上的剑：c = [暗, 中, 亮]
  const tx = x + tilt * len, ty = y - len, w = len > 26 ? 3 : len > 12 ? 2 : 1;
  for (let k = 0; k <= len; k++) { const px = Math.round(x + (tx - x) * k / len), py = Math.round(y - k); R(px, py, w, 1, c[1]); R(px, py, 1, 1, c[2]); if (w > 2) R(px + w - 1, py, 1, 1, c[0]); }
  if (hilt) { const gw = w + 4; R(Math.round(tx) - 2, Math.round(ty) - 1, gw, 2, hilt[0]); R(Math.round(tx) - 2, Math.round(ty) - 1, gw, 1, hilt[1]); const hl = Math.max(3, Math.round(len / 5)); for (let k = 0; k < hl; k++) R(Math.round(tx + tilt * k) + (w > 2 ? 1 : 0), Math.round(ty) - 2 - k, Math.max(1, w - 1), 1, k % 2 ? hilt[2] : hilt[0]); R(Math.round(tx + tilt * hl) + (w > 2 ? 0 : -1), Math.round(ty) - 3 - hl, w + 1, 2, hilt[1]); }
}
function floatRock(x, y, w, c, seed) { // 浮空岩：平顶、参差的倒锥底
  const r = seeded(seed || 1); x = Math.round(x); y = Math.round(y);
  for (let i = 0; i < w; i++) { const u = i / (w - 1) * 2 - 1, d = Math.round((1 - Math.pow(Math.abs(u), 1.6)) * w * (0.35 + r() * 0.22)) + 1; R(x - w / 2 + i, y, 1, d, c[1]); if (u > 0.2) dR(x - w / 2 + i, y, 1, d, c[0], 8); R(x - w / 2 + i, y + d - 1, 1, 1, c[0]); }
  R(x - w / 2, y, w, 1, c[2]); R(x - w / 2 + 1, y - 1, w - 2, 1, c[2]); R(x - w / 2 + 2, y + 1, w / 3, 1, c[2]);
}
function crystal(x, y, h, c) { x = Math.round(x); y = Math.round(y); for (let k = 0; k < h; k++) { const ww = k < 2 ? 1 : k > h - 2 ? 2 : 3; R(x - (ww >> 1), y - h + k, ww, 1, c[1]); R(x - (ww >> 1), y - h + k, 1, 1, c[2]); if (ww > 2) R(x + 1, y - h + k, 1, 1, c[0]); } }
function coral(x, y, h, c, seed) { const r = seeded(seed); const br = (x0, y0, a, len, d) => { const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len; line(x0, y0, x1, y1, c[1], d > 1 ? 2 : 1); R(x1, y1, 1, 1, c[2]); if (d > 0) { br(x1, y1, a - 0.3 - r() * 0.5, len * 0.7, d - 1); br(x1, y1, a + 0.3 + r() * 0.5, len * 0.7, d - 1); if (r() < 0.4) br(x1, y1, a, len * 0.6, d - 1); } }; br(x, y, -Math.PI / 2, h * 0.4, 3); R(x - 1, y - 1, 3, 1, c[0]); }
function column(x, y, h, c, cap) { R(x - 3, y - h, 6, h, c[1]); R(x - 3, y - h, 2, h, c[2]); R(x + 2, y - h, 1, h, c[0]); R(x, y - h, 1, h, c[0]); R(x - 5, y - 3, 10, 3, c[1]); R(x - 5, y - 3, 10, 1, c[2]); R(x - 4, y - h - 2, 8, 2, cap[1]); R(x - 5, y - h - 4, 10, 2, cap[0]); R(x - 5, y - h - 4, 10, 1, cap[2]); }

const ADV = {
  // 后山野林 / 万妖山脉：晨光里的层层林海
  forest: {
    sky: ['#3a84c8', '#74bce4', '#c4ecdc', '#f0f8d8'],
    build() {
      const far = strip(400, w => { paintRidge(ridgeLine(41, w, 70, 36, 5, 1.5), 132, '#7aaeb6', '#cfead8', { trees: '#6a9ea8' }); });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(47, w, 96, 22, 7, 1.1), 132, '#4c8a72', '#a4d2a8', { trees: '#3c7662' });
        wrap3(w, () => { const r = seeded(3); for (let i = 0; i < 30; i++) { const x = r() * w, y = 112 + r() * 10; if (r() < 0.35) pine(x, y + 8, 16 + r() * 8, ['#2f6654', '#3f8262', '#5a9e6c']); else roundTree(x, y + 8, 5 + r() * 4, ['#35705a', '#488c64', '#68ac70'], '#3a4a44'); } });
        dR(0, 122, w, 3, '#8cc49a', 4); dR(0, 125, w, 7, '#8cc49a', 8);
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(9), c = ['#245a40', '#33784a', '#4c9a54'], c2 = ['#2a6444', '#3c8650', '#5cae5c'];
        for (let i = 0; i < 12; i++) {
          const x = Math.round(i * 50 + r() * 26), h = 70 + r() * 30;
          if (i % 3 === 1) { pine(x, 130, 34 + r() * 16, c, '#3a2a26'); continue; }
          for (let y = 130; y > 130 - h; y--) { const ww = 5 - Math.round((130 - y) / h * 2), sx = Math.round(Math.sin(y / 17 + i) * 1.5); R(x + sx - ww / 2, y, ww, 1, '#4c3630'); R(x + sx - ww / 2, y, 1, 1, '#6e5040'); R(x + sx + ww / 2 - 1, y, 1, 1, '#33242a'); if ((y + i * 3) % 9 === 0) R(x + sx - 1, y, 2, 1, '#33242a'); }
          line(x, 130 - h * 0.6, x + 10, 130 - h * 0.6 - 9, '#4c3630', 2); line(x, 130 - h * 0.72, x - 9, 130 - h * 0.72 - 8, '#4c3630', 2);
          for (const [dx, dy, rr] of [[0, 0, 13], [-12, 5, 9], [12, 3, 10], [-5, -9, 9], [8, -8, 8], [17, 9, 6], [-17, 11, 6]]) disc(x + dx, 130 - h + dy, rr, c[1]);
          for (const [dx, dy, rr] of [[3, 4, 10], [14, 8, 7], [-9, 9, 6]]) disc(x + dx, 130 - h + dy, rr, c[0]);
          for (const [dx, dy, rr] of [[-3, -3, 9], [-13, 2, 6], [9, -1, 6], [-6, -11, 6]]) disc(x + dx, 130 - h + dy, rr, c2[1]);
          for (const [dx, dy, rr] of [[-5, -6, 5], [-14, 0, 3], [7, -4, 3], [-7, -13, 3]]) disc(x + dx, 130 - h + dy, rr, c2[2]);
          for (let k = 0; k < 24; k++) { const a = r() * 6.28, d = r() * 15; R(x + Math.cos(a) * d, 130 - h + Math.sin(a) * d * 0.8, 2, 1, k % 3 ? c[0] : '#7cc468'); }
        }
        for (let i = 0; i < 16; i++) { const x = r() * w; for (const [dx, rr] of [[0, 5], [5, 4], [-5, 3]]) disc(x + dx, 128 - rr / 2, rr, c[1]); disc(x - 1, 125, 3, c2[2]); disc(x + 4, 127, 3, c[0]); if (i % 3 === 0) { R(x - 2, 124, 1, 1, '#f7a3c4'); R(x + 3, 126, 1, 1, '#fff4b8'); } }
      }));
      const ground = groundStrip(400, '#5a9a4a', '#92c862', '#356e46', () => {
        const r = seeded(21);
        for (let i = 0; i < 90; i++) { const x = r() * 400, y = 13 + r() * 26; R(x, y, 2 + r() * 4, 1, r() < 0.5 ? '#74b256' : '#48854a'); }
        for (let i = 0; i < 60; i++) { const x = Math.floor(r() * 400); R(x, 10 - (i % 2), 1, 3, '#7cc060'); R(x + 1, 9, 1, 3, '#4c8a4a'); R(x + 2, 11, 1, 2, '#a8dc70'); }
        for (let i = 0; i < 26; i++) { const x = r() * 400, y = 15 + r() * 22, c = ['#fff4b8', '#f7a3c4', '#ffffff', '#c0b0ff'][i % 4]; R(x, y, 1, 1, c); if (i % 2) { R(x - 1, y, 3, 1, c); R(x, y - 1, 1, 3, c); R(x, y, 1, 1, '#f4c542'); } }
        for (let i = 0; i < 8; i++) { const x = r() * 400, y = 18 + r() * 20; ellipse(x, y, 3 + r() * 2, 1, '#8a8a94'); R(x - 2, y - 1, 3, 1, '#b4b4c0'); }
        for (let x = 0; x < 400; x += 3) dR(x, 26 + Math.round(Math.sin(x / 31) * 2), 3, 5, '#8a7a52', 8);
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.22 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) { disc(36, 18 - OY * 0.4, 9, '#fff6d0'); glow(36, 18 - OY * 0.4, 20, '#fff0b0', 0.35); },
    fx(t, OY, sc) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 + 0.02 * Math.sin(t / 1300);
      for (let k = 0; k < 4; k++) { const x0 = 30 + k * 46 - (sc * 0.1) % 46; for (let y = -OY; y < 128; y += 2) R(x0 - (y + OY) * 0.35, y, 12 + k * 3, 2, '#fff4c0'); }
      ctx.restore();
      for (let i = 0; i < 12; i++) { const x = ((i * 67 - sc * 0.7 + Math.sin(t / 900 + i) * 6) % 220 + 220) % 220 - 10, y = 40 + ((i * 37 + t * 0.006) % 80); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 300 + i * 2); R(x, y, 1, 1, i % 3 ? '#f4ffb0' : '#ffffff'); } ctx.globalAlpha = 1;
    },
  },
  // 黑风岭：黄昏的险峰、匪寨与风沙
  hill: {
    sky: ['#2c2e52', '#5c5078', '#b07a88', '#f0b088'],
    build() {
      const far = strip(400, w => { paintRidge(ridgeLine(61, w, 66, 46, 6, 2.2), 132, '#5c5676', '#c494a0', {}); });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(67, w, 98, 26, 8, 1.6), 132, '#463e5a', '#8a6a80', {});
        wrap3(w, () => { // 山寨：望楼、木栅、旗
          const c = '#2e283e', l = '#5a4a62';
          for (const bx of [70, 270]) {
            for (let x = bx - 30; x < bx + 34; x += 3) { const h = 12 + (x * 7 % 4); R(x, 118 - h, 2, h + 14, c); R(x, 118 - h - 1, 1, 1, c); R(x, 118 - h, 1, 3, l); }
            R(bx - 2, 76, 2, 44, c); R(bx + 9, 76, 2, 44, c); line(bx - 2, 110, bx + 10, 96, c); line(bx + 10, 110, bx - 2, 96, c); R(bx - 5, 86, 19, 2, c); R(bx - 4, 78, 17, 8, c); R(bx - 2, 80, 4, 4, '#f0a050'); R(bx + 6, 80, 3, 4, '#f0a050');
            for (let k = 0; k < 6; k++) R(bx - 7 + k, 77 - k, 23 - k * 2, 1, k === 0 ? l : c);
            R(bx + 4, 58, 1, 14, c); for (let k = 0; k < 6; k++) R(bx + 5, 59 + k, 8 - (k % 2) - (k > 3 ? 2 : 0), 1, k % 2 ? '#9a2c2c' : '#b83a34');
          }
        });
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(13), rc = ['#2a2436', '#3e3648', '#5c5062', '#7e6c78'];
        for (let i = 0; i < 9; i++) {
          const x = Math.round(i * 67 + r() * 30), k = i % 3;
          if (k === 0) { const ww = 26 + Math.floor(r() * 16), tops = []; for (let q = 0; q < ww; q++) tops.push(Math.round(130 - Math.sin(q / (ww - 1) * Math.PI) * (12 + r() * 3) - (q % 5 === 0 ? 2 : 0))); rock(x, tops, 131, rc, i + 2); }
          else if (k === 1) deadTree(x, 130, 44 + r() * 20, '#2a2230', i + 5, '#5c4a58');
          else { R(x, 96, 1, 34, '#2a2230'); R(x - 1, 128, 3, 2, '#2a2230'); for (let q = 0; q < 14; q++) { const fw = 11 - (q > 10 ? (q - 10) * 3 : 0) + Math.round(Math.sin(q * 0.9) * 1.5); R(x + 1, 97 + q, fw, 1, q % 5 === 4 ? '#6a1a20' : '#8e2a2c'); R(x + 1, 97 + q, 2, 1, '#b84038'); } R(x + 4, 101, 4, 4, '#1a1418'); R(x + 5, 102, 2, 2, '#d8d0c0'); R(x, 95, 1, 1, '#c8a050'); }
        }
      }));
      const ground = groundStrip(400, '#6e5a4e', '#9a8066', '#3a2c38', () => {
        const r = seeded(31);
        for (let i = 0; i < 80; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 5, 1, r() < 0.5 ? '#84705c' : '#56463f'); }
        for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 400); R(x, 10, 1, 3, '#b0a068'); R(x + 1, 9 + (i % 2), 1, 3, '#8a7a52'); R(x + 2, 11, 1, 1, '#c8b878'); }
        for (let i = 0; i < 18; i++) { const x = r() * 400, y = 16 + r() * 22; ellipse(x, y, 2 + r() * 3, 1, '#4a3e44'); R(x - 2, y - 1, 3, 1, '#a0907e'); }
        for (let x = 0; x < 400; x += 2) { R(x, 22 + Math.round(Math.sin(x / 40) * 2), 2, 1, '#56463f'); R(x, 31 + Math.round(Math.sin(x / 40 + 1) * 2), 2, 1, '#4a3c3a'); }
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.22 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) { disc(160, 58, 11, '#ffd8a0'); disc(160, 58, 9, '#fff0c8'); glow(160, 58, 24, '#ff9a60', 0.3); },
    fx(t, OY, sc) {
      for (let i = 0; i < 9; i++) { const x = ((i * 53 - t * (0.12 + (i % 3) * 0.04) - sc) % 260 + 260) % 260 - 30, y = 30 + (i * 29) % 100; ctx.globalAlpha = 0.25 + (i % 3) * 0.1; R(x, y, 10 + (i % 4) * 4, 1, '#f0d8c0'); } ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const x = ((i * 90 + t * 0.012) % 240) - 20, y = 22 + i * 9 + Math.sin(t / 500 + i) * 3 - OY * 0.3, f = (t / 160 + i | 0) % 2; R(x, y, 2, 1, '#1e1a2a'); R(x - 2, y - (f ? 1 : -1), 2, 1, '#1e1a2a'); R(x + 2, y - (f ? 1 : -1), 2, 1, '#1e1a2a'); }
    },
  },
  // 落日古墓：冷月、枯树、墓碑与紫雾
  tomb: {
    sky: ['#0b0920', '#1a1640', '#382c68', '#5a4888'], stars: 1,
    build() {
      const far = strip(400, w => {
        paintRidge(ridgeLine(71, w, 96, 20, 5, 1.2), 132, '#2c2654', '#4a3c7c', {});
        wrap3(w, () => { const c = '#241e48', l = '#40366e'; // 远处的陵寝
          for (const bx of [60, 210, 330]) { R(bx - 14, 88, 28, 12, c); for (let k = 0; k < 7; k++) R(bx - 18 + k * 2, 88 - k, 36 - k * 4, 1, k ? c : l); R(bx - 2, 76, 4, 6, c); R(bx - 4, 92, 8, 8, '#141030'); for (const s of [-1, 1]) { R(bx + s * 24 - 1, 78, 3, 24, c); R(bx + s * 24 - 2, 76, 5, 2, l); } }
          for (const bx of [130, 280]) { R(bx - 3, 80, 6, 22, c); R(bx - 4, 78, 8, 2, l); R(bx - 2, 74, 4, 4, c); }
        });
      });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(77, w, 112, 10, 6, 1), 132, '#1e1a3c', '#322a58', {});
        wrap3(w, () => { const r = seeded(7), c = ['#161230', '#221c40', '#3c3466'];
          for (let i = 0; i < 26; i++) { const x = r() * w, y = 112 + r() * 12; if (i % 6 === 0) deadTree(x, y + 4, 34 + r() * 14, c[0], i, c[2]); else if (i % 4 === 1) { R(x - 1, y - 9, 2, 12, c[1]); R(x - 3, y - 6, 6, 2, c[1]); R(x - 1, y - 9, 1, 12, c[2]); } else grave(x, y + 3, 5 + (i % 2) * 2, 7 + r() * 5, c); }
        });
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(19), st = ['#3a3654', '#5c5876', '#8480a0'];
        for (let i = 0; i < 11; i++) {
          const x = Math.round(i * 55 + r() * 26), k = i % 4;
          if (k === 0) { grave(x, 130, 11, 19 + r() * 4, st); R(x - 5, 113, 2, 2, '#4a7a5a'); R(x - 5, 125, 3, 3, '#3c6a50'); R(x + 3, 127, 2, 2, '#4a7a5a'); }
          else if (k === 1) { deadTree(x, 130, 62 + r() * 16, '#1c1830', i + 3, '#48406c'); }
          else if (k === 2) { R(x - 4, 127, 9, 3, st[0]); R(x - 2, 116, 5, 11, st[1]); R(x - 2, 116, 1, 11, st[2]); R(x - 5, 109, 11, 7, st[1]); R(x - 3, 111, 7, 4, '#141024'); R(x - 6, 107, 13, 2, st[0]); R(x - 5, 106, 11, 1, st[2]); R(x - 1, 103, 3, 3, st[1]); }
          else { grave(x, 130, 8, 12, st); grave(x + 12, 131, 6, 8, st); for (let q = 0; q < 3; q++) R(x + 20 + q * 5, 123 - (q % 2), 1, 7, st[0]); R(x + 19, 125, 13, 1, st[0]); }
        }
      }));
      const ground = groundStrip(400, '#34304c', '#524c70', '#16142a', () => {
        const r = seeded(33);
        for (let i = 0; i < 80; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 5, 1, r() < 0.5 ? '#423c5e' : '#262238'); }
        for (let i = 0; i < 44; i++) { const x = Math.floor(r() * 400); R(x, 10, 1, 3, '#3c5a5a'); R(x + 1, 9, 1, 3, '#2a4448'); R(x + 2, 11, 1, 1, '#5a7a70'); }
        for (let i = 0; i < 10; i++) { const x = r() * 400, y = 17 + r() * 20; if (i % 3 === 0) { R(x, y - 2, 4, 3, '#c8c0b0'); R(x, y + 1, 3, 1, '#9a927e'); R(x + 1, y - 1, 1, 1, '#2a2438'); R(x + 3, y - 1, 1, 1, '#2a2438'); } else { R(x, y, 5, 1, '#b0a898'); R(x - 1, y - 1, 1, 3, '#c8c0b0'); R(x + 5, y - 1, 1, 3, '#c8c0b0'); } }
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.25 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) {
      const mx = 138, my = 26 - OY * 0.35;
      glow(mx, my, 26, '#8a8ad0', 0.25); disc(mx, my, 14, '#cfcbb8'); disc(mx - 1, my - 1, 13, '#ece8d4'); disc(mx - 4, my - 5, 3, '#d4d0bc'); disc(mx + 5, my + 3, 4, '#d4d0bc'); disc(mx - 6, my + 6, 2, '#d4d0bc'); R(mx + 2, my - 8, 3, 2, '#d4d0bc');
      for (let i = 0; i < 3; i++) { const x = ((i * 80 + t * 0.004) % 280) - 40; ctx.globalAlpha = 0.5; R(x, my - 4 + i * 6, 46, 2, '#2a2454'); R(x + 8, my - 2 + i * 6, 30, 1, '#3a3068'); ctx.globalAlpha = 1; }
    },
    fx(t, OY, sc) {
      ctx.globalAlpha = 0.2; for (let k = 0; k < 3; k++) for (let x = -10; x < 210; x += 4) { const y = 112 + k * 9 + Math.sin((x + sc * (0.5 + k * 0.2) + t * 0.01 * (k + 1)) / 19) * 3; R(x, y, 4, 5 + k, k % 2 ? '#7a5ab0' : '#5a4a98'); } ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { const x = ((i * 77 - sc * 0.55) % 260 + 260) % 260 - 20, y = 96 + Math.sin(t / 700 + i * 2) * 8 + (i % 2) * 10, f = (t / 130 + i | 0) % 3; glow(x, y, 7, '#5affc0', 0.3); R(x - 1, y - 1, 3, 3, '#8fffd8'); R(x, y - 3 + (f === 1 ? 1 : 0), 1, 2, '#5affc0'); R(x, y, 1, 1, '#ffffff'); R(x - 1 + f, y - 2, 1, 1, '#5affc0'); }
    },
  },
  // 血煞秘境：血月、骨刺、暗红的大地
  blood: {
    sky: ['#14040c', '#3c0a18', '#861a24', '#dc4c34'],
    build() {
      const far = strip(400, w => { paintRidge(ridgeLine(81, w, 78, 50, 9, 2.6), 132, '#4c0e1e', '#a0282c', {}); });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(87, w, 108, 16, 7, 1.4), 132, '#2e0812', '#5a1420', {});
        wrap3(w, () => { const r = seeded(11);
          for (let i = 0; i < 12; i++) { const x = r() * w; if (i % 3 === 0) { deadTree(x, 116, 40 + r() * 12, '#22060e', i, '#5a1420'); R(x + 8, 92, 1, 9, '#22060e'); R(x + 6, 101, 5, 7, '#22060e'); R(x + 7, 102, 1, 5, '#5a1420'); R(x + 9, 102, 1, 5, '#5a1420'); } else { for (let k = 0; k < 5; k++) { const h = 14 + r() * 16, bx = x + k * 5, tl = (r() - 0.5) * 6; for (let q = 0; q < h; q++) R(bx + tl * q / h, 120 - q, Math.max(1, 3 - q / h * 3), 1, q % 4 ? '#2a0810' : '#44101a'); } } }
        });
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(23), bn = ['#6e5a58', '#a89488', '#d8c8b4'];
        for (let i = 0; i < 10; i++) {
          const x = Math.round(i * 60 + r() * 30), k = i % 3;
          if (k === 0) { // 巨兽的肋骨
            for (let q = 0; q < 5; q++) { const bx = x + q * 7, h = 26 - Math.abs(q - 2) * 5; for (let a = 0; a < h; a++) { const cx2 = bx + Math.round(Math.sin(a / h * 2.4) * 6); R(cx2, 130 - a, 2, 1, bn[1]); R(cx2, 130 - a, 1, 1, bn[2]); if (a % 6 === 5) R(cx2 + 1, 130 - a, 1, 1, bn[0]); } }
            R(x - 3, 127, 38, 2, bn[0]); R(x - 3, 127, 38, 1, bn[1]);
          } else if (k === 1) { for (let q = 0; q < 4; q++) { const h = 20 + r() * 26, bx = x + q * 7, tl = (r() - 0.5) * 8; for (let a = 0; a < h; a++) { const ww = Math.max(1, Math.round(5 - a / h * 5)); R(bx + tl * a / h - ww / 2, 130 - a, ww, 1, '#1c050c'); R(bx + tl * a / h - ww / 2, 130 - a, 1, 1, '#6a1622'); } } }
          else { for (const [dx, dy] of [[0, 0], [6, 0], [3, -5], [12, 0], [9, -5], [6, -10]]) { R(x + dx, 125 + dy, 5, 4, bn[1]); R(x + dx, 125 + dy, 5, 1, bn[2]); R(x + dx + 1, 129 + dy, 3, 1, bn[0]); R(x + dx + 1, 126 + dy, 1, 2, '#2a0810'); R(x + dx + 3, 126 + dy, 1, 2, '#2a0810'); } }
        }
      }));
      const ground = groundStrip(400, '#3c1018', '#701e24', '#12040a', () => {
        const r = seeded(35);
        for (let i = 0; i < 80; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 5, 1, r() < 0.5 ? '#521620' : '#260a10'); }
        for (let i = 0; i < 9; i++) { let x = r() * 400, y = 16 + r() * 8; for (let k = 0; k < 16; k++) { R(x, y, 2, 1, '#ff5a3a'); R(x, y + 1, 1, 1, '#a01e22'); x += 1 + r() * 2; y += r() < 0.5 ? 1 : (r() < 0.3 ? -1 : 0); } }
        for (let i = 0; i < 6; i++) { const x = r() * 400, y = 24 + r() * 12; ellipse(x, y, 7 + r() * 5, 2, '#7a1018'); ellipse(x - 1, y - 1, 4, 1, '#c8303a'); }
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.25 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) {
      const mx = 146, my = 30 - OY * 0.35, p = 0.3 + 0.08 * Math.sin(t / 600);
      glow(mx, my, 36, '#ff3a2a', p); disc(mx, my, 18, '#c8242a'); disc(mx - 1, my - 1, 17, '#f04a3a'); disc(mx - 3, my - 3, 13, '#ff7458');
      disc(mx - 6, my - 6, 3, '#e04a3a'); disc(mx + 6, my + 2, 5, '#d83a32'); disc(mx - 4, my + 8, 3, '#d83a32'); R(mx + 2, my - 11, 4, 2, '#e04a3a');
      for (let k = 0; k < 3; k++) { const dx = [-9, 2, 10][k], l = 4 + ((t / 300 + k * 3 | 0) % 6); R(mx + dx, my + 15 - Math.abs(dx) / 2, 1, l, '#c8242a'); }
    },
    fx(t, OY, sc) {
      for (let i = 0; i < 16; i++) { const x = ((i * 61 - sc * 0.8 + Math.sin(t / 700 + i) * 5) % 230 + 230) % 230 - 15, y = 130 - ((i * 43 + t * 0.02) % 120); ctx.globalAlpha = Math.min(1, (130 - y) / 20) * (0.5 + 0.5 * Math.sin(t / 200 + i)); R(x, y, 1 + (i % 4 === 0 ? 1 : 0), 1, i % 3 ? '#ff6a3a' : '#ffc070'); } ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.16; for (let x = -10; x < 210; x += 4) R(x, 116 + Math.sin((x + sc * 0.6 + t * 0.012) / 17) * 3, 4, 8, '#ff2a2a'); ctx.globalAlpha = 1;
    },
  },
  // 上古剑冢：雾中的万剑
  swords: {
    sky: ['#4a628a', '#88a0bc', '#cad6e2', '#f2f2ec'],
    build() {
      const far = strip(400, w => {
        wrap3(w, () => { const c = ['#9fb0c6', '#b4c2d4', '#d0dae6']; // 山一样高的巨剑
          for (const [x, len, tl] of [[60, 86, 0.12], [200, 104, -0.08], [320, 74, 0.2]]) { for (let k = 0; k <= len; k++) { const px = Math.round(x + tl * k), ww = k > len - 8 ? Math.max(1, len - k) : 8; R(px - ww / 2, 112 - k, ww, 1, c[1]); R(px - ww / 2, 112 - k, 2, 1, c[2]); R(px, 112 - k, 1, 1, c[0]); } }
        });
        paintRidge(ridgeLine(91, w, 84, 30, 6, 1.6), 132, '#8a9cb6', '#dfe6ee', {});
      });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(97, w, 108, 12, 7, 1), 132, '#6c7e9a', '#b4c2d2', {});
        wrap3(w, () => { const r = seeded(15), c = ['#56667e', '#7688a2', '#a4b4c8']; for (let i = 0; i < 46; i++) { const x = r() * w, len = 8 + r() * 18; swordProp(x, 112 + r() * 12, len, (r() - 0.5) * 0.7, c, len > 14 ? [c[0], c[1], c[0]] : null); } });
        dR(0, 120, w, 4, '#b4c2d2', 4); dR(0, 124, w, 8, '#b4c2d2', 8);
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(27), bl = ['#7888a4', '#c4d0de', '#ffffff'], rust = ['#6a5a52', '#9a8674', '#c8b8a0'];
        for (let i = 0; i < 13; i++) {
          const x = Math.round(i * 46 + r() * 20), len = 26 + r() * 34, tl = (r() - 0.5) * 0.5, c = i % 4 === 3 ? rust : bl;
          swordProp(x, 131, len, tl, c, [['#7a5a26', '#d8ae52', '#5a2c28'], ['#4a4a5a', '#9a9aae', '#2e4a6a'], ['#7a5a26', '#f0cc6a', '#8a2a2a']][i % 3]);
          if (i % 3 === 0) { const tx = x + tl * len + 2, ty = 131 - len - Math.max(3, Math.round(len / 5)) - 3; for (let k = 0; k < 9; k++) R(tx + Math.round(Math.sin(k / 2) * 1.5) + 3, ty + k, 1, 1, k > 6 ? '#ffb0a0' : '#c8342c'); R(tx + 2, ty, 2, 2, '#f4c542'); }
          R(x - 3, 129, 9, 2, '#5a5e70'); R(x - 2, 128, 4, 1, '#8a8e9e');
        }
        // 断碑
        for (const x of [150, 420]) { R(x, 108, 14, 22, '#70748a'); R(x, 108, 2, 22, '#9498aa'); R(x + 12, 108, 2, 22, '#4e5266'); cut(() => { for (let k = 0; k < 7; k++) R(x + k * 2, 106, 2, 3 + ((k * 5) % 6), '#000'); }); for (let k = 0; k < 4; k++) R(x + 5, 115 + k * 3, 4 - (k % 2), 1, '#4e5266'); R(x - 2, 128, 18, 2, '#4e5266'); }
      }));
      const ground = groundStrip(400, '#767a8c', '#a6aaba', '#40425a', () => {
        const r = seeded(37);
        for (let i = 0; i < 70; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 3 + r() * 7, 1, r() < 0.5 ? '#8a8ea0' : '#5a5e72'); }
        for (let i = 0; i < 20; i++) { const x = r() * 400, y = 16 + r() * 22; line(x, y, x + 5 + r() * 5, y - 1, '#c4d0de'); R(x, y + 1, 5, 1, '#5a5e72'); }
        for (let i = 0; i < 30; i++) { const x = Math.floor(r() * 400); R(x, 10, 1, 3, '#8a9a8a'); R(x + 1, 9, 1, 3, '#6a7a72'); }
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.25 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) { disc(60, 26 - OY * 0.4, 10, '#f6f6f0'); glow(60, 26 - OY * 0.4, 22, '#ffffff', 0.25); },
    fx(t, OY, sc) {
      ctx.globalAlpha = 0.3; for (let k = 0; k < 2; k++) for (let x = -10; x < 210; x += 4) R(x, 100 + k * 14 + Math.sin((x + sc * (0.4 + k * 0.3) + t * 0.008) / 23) * 4, 4, 6, '#e8eef4'); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const ph = (t / 900 + i * 0.37) % 1, x = ((i * 83 - sc * 0.55) % 260 + 260) % 260 - 20, y = 84 + (i * 17) % 30; if (ph < 0.25) { const s = ph < 0.125 ? 1 : 0; R(x, y, 1, 1, '#ffffff'); R(x - 1 - s, y, 3 + s * 2, 1, '#ffffff'); R(x, y - 1 - s, 1, 3 + s * 2, '#ffffff'); } }
    },
  },
  // 九幽魔渊：倒悬的石笋、浮石与魔焰
  abyss: {
    sky: ['#05030c', '#110822', '#2a1048', '#541c70'],
    build() {
      const far = strip(400, w => {
        wrap3(w, () => { const r = seeded(17), c = '#190b2c', l = '#341a56'; // 穹顶垂下的石笋与石柱
          for (let i = 0; i < 16; i++) { const x = i * 25 + r() * 12, h = 30 + r() * 60, ww = 8 + r() * 10; for (let k = 0; k < h + TOPPAD; k++) { const u = Math.max(0, (k - TOPPAD) / h), w2 = Math.max(1, Math.round(ww * (1 - Math.pow(u, 0.7)))); R(x - w2 / 2, -TOPPAD + k, w2, 1, c); R(x - w2 / 2, -TOPPAD + k, 1, 1, l); } }
          for (const x of [90, 300]) { for (let y = -TOPPAD; y < 132; y++) { const w2 = 16 + Math.round(Math.sin(y / 14) * 3 + Math.abs(y - 40) / 12); R(x - w2 / 2, y, w2, 1, c); R(x - w2 / 2, y, 2, 1, l); } }
          for (let i = 0; i < 9; i++) { const x = r() * w, y = 50 + r() * 50; R(x, y, 2, 1, '#ff4a8a'); R(x + 4, y, 2, 1, '#ff4a8a'); }
        });
      });
      const mid = strip(400, w => wrap3(w, () => {
        const r = seeded(29), c = ['#150a26', '#281444', '#4c2a78'];
        for (let i = 0; i < 9; i++) { const x = i * 45 + r() * 20, y = 60 + r() * 50, ww = 14 + Math.floor(r() * 18); floatRock(x, y, ww, c, i + 1); if (i % 2) { crystal(x - 2, y, 6 + r() * 4, ['#7a2ac8', '#c06aff', '#f0d0ff']); crystal(x + 3, y, 4, ['#7a2ac8', '#c06aff', '#f0d0ff']); } if (i % 3 === 0) for (let k = 0; k < 14; k++) R(x + (k % 2), y + ww * 0.4 + k * 2, 1, 2, k % 2 ? '#3a2a50' : '#221630'); }
      }));
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(39), rc = ['#0a0612', '#170c24', '#3a1c5c', '#6a3aa0'];
        for (let i = 0; i < 10; i++) {
          const x = Math.round(i * 60 + r() * 30);
          if (i % 3 === 2) { R(x - 1, 112, 3, 18, rc[1]); R(x - 1, 112, 1, 18, rc[3]); R(x - 5, 108, 11, 4, rc[1]); R(x - 5, 108, 11, 1, rc[3]); R(x - 3, 128, 7, 2, rc[1]); continue; }
          const ww = 18 + Math.floor(r() * 16), tops = []; for (let q = 0; q < ww; q++) { const u = q / (ww - 1); tops.push(Math.round(130 - Math.pow(1 - Math.abs(u * 2 - 1), 0.7) * (16 + r() * 10) * (0.5 + 0.5 * Math.abs(Math.sin(q * 1.3))))); } rock(x, tops, 131, rc, i + 4);
        }
      }));
      const ground = groundStrip(400, '#1e1030', '#50308a', '#06030c', () => {
        const r = seeded(43);
        for (let i = 0; i < 70; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 6, 1, r() < 0.5 ? '#2c1846' : '#100818'); }
        for (let i = 0; i < 8; i++) { let x = r() * 400, y = 16 + r() * 10; for (let k = 0; k < 14; k++) { R(x, y, 2, 1, '#c85aff'); R(x, y + 1, 1, 1, '#5a1e90'); x += 1 + r() * 2; y += r() < 0.5 ? 1 : (r() < 0.3 ? -1 : 0); } }
      });
      return [{ c: far, f: 0.1 }, { c: mid, f: 0.3 }, { c: near, f: 0.6 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) { glow(100, 124, 70, '#7a2ac8', 0.12 + 0.03 * Math.sin(t / 800)); },
    fx(t, OY, sc) {
      // 火盆里的魔焰
      for (let i = 0; i < 18; i++) { const x = ((i * 59 - sc * 0.8 + Math.sin(t / 600 + i) * 6) % 230 + 230) % 230 - 15, y = 132 - ((i * 47 + t * 0.025) % 130); ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t / 240 + i); R(x, y, 1 + (i % 5 === 0 ? 1 : 0), 1 + (i % 5 === 0 ? 1 : 0), i % 3 ? '#c85aff' : '#ff8ae0'); } ctx.globalAlpha = 1;
      ctx.globalAlpha = 0.18; for (let x = -10; x < 210; x += 4) R(x, 118 + Math.sin((x + sc * 0.6 + t * 0.012) / 15) * 3, 4, 8, '#8a3ae0'); ctx.globalAlpha = 1;
    },
  },
  // 东海龙宫：水下，天光、珊瑚与龙宫的剪影
  sea: {
    sky: ['#86e6e6', '#3aa6ca', '#1a6c9e', '#0e4476'],
    build() {
      const far = strip(400, w => {
        paintRidge(ridgeLine(101, w, 104, 14, 5, 1), 132, '#2a7ca6', '#1a6696', {});
        wrap3(w, () => { const c = '#2f84ac', l = '#52a8c8'; // 龙宫
          const hall = (cx, by, ww, hh) => { R(cx - ww / 2, by - hh, ww, hh, c); for (let x = cx - ww / 2 + 2; x < cx + ww / 2 - 1; x += 5) R(x, by - hh + 2, 2, hh - 2, '#236e98'); for (let k = 0; k < 6; k++) { const rw = ww + 10 - k * 4; R(cx - rw / 2, by - hh - k, rw, 1, k === 0 ? l : c); } R(cx - ww / 2 - 7, by - hh - 2, 2, 1, l); R(cx + ww / 2 + 5, by - hh - 2, 2, 1, l); };
          hall(130, 112, 60, 18); hall(130, 88, 40, 12); hall(130, 70, 22, 9); R(129, 52, 2, 8, l); disc(130, 51, 2, '#bff0f0');
          hall(70, 112, 22, 26); hall(70, 80, 14, 10); hall(190, 112, 22, 26); hall(190, 80, 14, 10);
          for (let y = 0; y < 26; y++) { const hw = y < 10 ? Math.round(Math.sqrt(100 - (10 - y) * (10 - y))) : 10; R(300 - hw - 4, 86 + y, hw * 2 + 8, 1, c); } for (let y = 0; y < 20; y++) { const hw = y < 7 ? Math.round(Math.sqrt(49 - (7 - y) * (7 - y))) : 7; R(300 - hw, 92 + y, hw * 2, 1, '#1e6c98'); } R(286, 84, 28, 2, l);
        });
      });
      const mid = strip(400, w => {
        paintRidge(ridgeLine(107, w, 116, 12, 8, 1.3), 132, '#17587e', '#1a6490', {});
        wrap3(w, () => { const r = seeded(45), c = ['#124a6c', '#1c668c', '#2f8aac'];
          for (let i = 0; i < 26; i++) { const x = r() * w, h = 20 + r() * 34; for (let k = 0; k < h; k++) { const sx = Math.round(Math.sin(k / 5 + i) * 2); R(x + sx, 124 - k, 2, 1, c[1]); if (k % 4 === 0) { R(x + sx + 2, 124 - k, 2, 1, c[2]); R(x + sx - 2, 123 - k, 2, 1, c[0]); } } }
          for (let i = 0; i < 8; i++) coral(r() * w, 122, 22 + r() * 10, c, i + 2);
        });
      });
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(49), P = [['#b8486a', '#f07a9a', '#ffc0d0'], ['#c8662a', '#f6a25a', '#ffe0a0'], ['#6a48b8', '#a880e8', '#e0d0ff'], ['#1e8a7a', '#4fd0b0', '#c0fff0']];
        for (let i = 0; i < 16; i++) {
          const x = Math.round(i * 37 + r() * 20), k = i % 5;
          if (k < 2) coral(x, 130, 26 + r() * 14, P[i % 4], i + 7);
          else if (k === 2) { const c = P[(i + 1) % 4]; for (let q = 0; q < 5; q++) { ellipse(x + q * 5 - 10, 125 - (q % 2) * 4 - Math.abs(q - 2), 4, 2, c[1]); R(x + q * 5 - 13, 123 - (q % 2) * 4 - Math.abs(q - 2), 5, 1, c[2]); R(x + q * 5 - 11, 126 - (q % 2) * 4, 2, 5, c[0]); } }
          else if (k === 3) { const tops = [], ww = 20 + Math.floor(r() * 10); for (let q = 0; q < ww; q++) tops.push(Math.round(130 - Math.sin(q / (ww - 1) * Math.PI) * (8 + r() * 3))); rock(x, tops, 131, ['#14506e', '#22708e', '#3a94ac', '#6ac0cc'], i, { moss: ['#2a9a8a', '#5ad0b0'] }); }
          else { ellipse(x, 126, 8, 4, '#d8c8e8'); ellipse(x, 125, 7, 3, '#f4ecff'); for (let q = -6; q <= 6; q += 3) R(x + q, 122, 1, 6, '#b8a4d0'); ellipse(x, 129, 8, 2, '#a890c8'); R(x - 6, 127, 13, 1, '#3a2a50'); disc(x, 127, 1, '#ffffff'); }
        }
      }));
      const ground = groundStrip(400, '#74b0a6', '#bfe6cc', '#2c6e84', () => {
        const r = seeded(51);
        for (let x = 0; x < 400; x += 2) for (let k = 0; k < 5; k++) { const y = 15 + k * 6 + Math.round(Math.sin(x / (9 + k * 2) + k * 2) * 1.5); R(x, y, 2, 1, k % 2 ? '#8cc4b4' : '#5a9a9c'); }
        for (let i = 0; i < 14; i++) { const x = r() * 400, y = 16 + r() * 22; if (i % 3 === 0) { R(x - 2, y, 5, 1, '#f08a7a'); R(x, y - 2, 1, 5, '#f08a7a'); R(x - 1, y - 1, 3, 3, '#ffb0a0'); } else if (i % 3 === 1) { ellipse(x, y, 3, 2, '#f4e8d8'); R(x - 2, y - 2, 4, 1, '#ffffff'); R(x - 2, y + 1, 5, 1, '#c8b0a0'); } else { ellipse(x, y, 2 + r() * 3, 1, '#4a8a94'); } }
      });
      return [{ c: far, f: 0.08 }, { c: mid, f: 0.25 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY, sc) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 5; k++) { ctx.globalAlpha = 0.06 + 0.04 * Math.sin(t / 900 + k * 1.7); const x0 = 20 + k * 44 + Math.sin(t / 2600 + k) * 8, ww = 10 + (k % 3) * 6; for (let y = -OY; y < 120; y += 2) R(x0 - (y + OY) * 0.3 + (y + OY) * 0.02 * k, y, ww + (y + OY) * 0.08, 2, '#c8fff0'); }
      ctx.restore();
      for (let i = 0; i < 7; i++) { const sp = 0.012 + (i % 3) * 0.006, d = i % 2 ? 1 : -1, x = (((i * 71 + t * sp * d - sc * 0.15) % 260) + 260) % 260 - 30, y = 30 + i * 11 + Math.sin(t / 700 + i) * 3, c = '#1e6c96'; R(x, y, 5, 2, c); R(x + 1, y - 1, 3, 1, c); R(x + (d > 0 ? -2 : 5), y - 1 + ((t / 200 + i | 0) % 2), 2, 3, c); }
    },
    fx(t, OY, sc) {
      // 沙地上的水光
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.22;
      for (let k = 0; k < 4; k++) for (let x = 0; x < 200; x += 3) { const y = 131 + k * 7 + Math.sin((x + sc) / 13 + t / 500 + k * 2) * 2 + Math.sin((x + sc) / 5 - t / 700) * 1; if (Math.sin((x + sc) / 9 + t / 400 + k) > 0.2) R(x, y, 3, 1, '#d8fff0'); }
      ctx.restore();
      for (let i = 0; i < 14; i++) { const x = ((i * 47 - sc * 0.8) % 230 + 230) % 230 - 15 + Math.sin(t / 400 + i) * 2, y = 150 - ((i * 53 + t * 0.03) % (150 + OY)); const big = i % 4 === 0; if (big) { R(x, y, 3, 3, '#bff4ff'); R(x + 1, y + 1, 1, 1, '#4aa8c8'); R(x, y, 1, 1, '#ffffff'); } else R(x, y, 1, 1, '#d8fbff'); }
      ctx.globalAlpha = 0.12; R(0, -OY, 200, 160 + OY, '#1a7aa8'); ctx.globalAlpha = 1;
    },
  },
  // 天外星墟：星云、环星与破碎的浮陆
  stars: {
    sky: ['#03030c', '#0a0a28', '#1e1248', '#3c2062'], stars: 2,
    build() {
      const neb = strip(400, w => wrap3(w, () => {
        const r = seeded(55);
        for (const [c, n] of [['#1c1450', 14], ['#2a1a66', 16], ['#0e3450', 12], ['#4a1c5c', 10], ['#3a2a8a', 8]]) for (let i = 0; i < n; i++) { const x = r() * w, y = -40 + r() * 130, rr = 6 + r() * 14; ctx.fillStyle = pat(c, [4, 8, 8, 12, 16][Math.floor(r() * 5)]); for (let yy = -rr; yy <= rr; yy++) { const ww = Math.round(Math.sqrt(rr * rr - yy * yy) * 1.8); ctx.fillRect(Math.round(x - ww), Math.round(y + yy * 0.6), ww * 2, 1); } }
        for (let i = 0; i < 150; i++) { const x = Math.floor(r() * w), y = Math.floor(-TOPPAD + r() * 180), b = r(); R(x, y, 1, 1, b > 0.8 ? '#ffffff' : b > 0.5 ? '#c8d0ff' : '#7a80c0'); if (b > 0.95) { R(x - 1, y, 3, 1, '#c8d0ff'); R(x, y - 1, 1, 3, '#c8d0ff'); } }
      }));
      const mid = strip(400, w => wrap3(w, () => {
        const r = seeded(57), c = ['#221c48', '#3a3270', '#6c60a8'];
        for (let i = 0; i < 8; i++) {
          const x = i * 50 + r() * 22, y = 50 + r() * 56, ww = 18 + Math.floor(r() * 22); floatRock(x, y, ww, c, i + 3);
          if (i % 2 === 0) { for (const dx of [-5, 3]) { const h = 8 + r() * 8; R(x + dx, y - h, 3, h, c[1]); R(x + dx, y - h, 1, h, c[2]); R(x + dx - 1, y - h - 1, 5, 1, c[2]); } if (i % 4 === 0) { R(x - 5, y - 17, 11, 2, c[1]); R(x - 5, y - 17, 11, 1, c[2]); } }
          else crystal(x, y, 7, ['#c8962a', '#ffe28a', '#fffbe0']);
        }
        for (let i = 0; i < 30; i++) { const x = r() * w, y = 20 + r() * 90; R(x, y, 2 + (i % 3), 1 + (i % 2), c[1]); R(x, y, 1, 1, c[2]); }
      }));
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(59), rc = ['#12102a', '#221e44', '#443c7a', '#786cb8'], gd = ['#c8962a', '#ffe28a', '#fffbe0'];
        for (let i = 0; i < 10; i++) {
          const x = Math.round(i * 60 + r() * 30);
          if (i % 3 === 1) { floatRock(x, 84 + r() * 20, 22 + Math.floor(r() * 10), rc.slice(0, 3).concat(), i); continue; }
          const ww = 20 + Math.floor(r() * 14), tops = []; for (let q = 0; q < ww; q++) tops.push(Math.round(130 - Math.sin(q / (ww - 1) * Math.PI) * (9 + r() * 5) - (q % 4 === 0 ? 2 : 0))); rock(x, tops, 131, rc, i + 6);
          crystal(x + ww / 2, tops[ww >> 1] + 1, 12 + r() * 6, gd); crystal(x + ww / 2 - 4, tops[(ww >> 1) - 4] + 1, 6, gd); crystal(x + ww / 2 + 4, tops[(ww >> 1) + 4] + 1, 8, gd);
        }
      }));
      const ground = groundStrip(400, '#2a2648', '#5e5898', '#0c0a1c', () => {
        const r = seeded(61);
        for (let i = 0; i < 70; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 6, 1, r() < 0.5 ? '#38325c' : '#18162c'); }
        for (let i = 0; i < 10; i++) { const x = r() * 400, y = 18 + r() * 18, rr = 4 + r() * 5; ellipse(x, y, rr, 2, '#18162c'); R(x - rr, y + 2, rr * 2, 1, '#5e5898'); R(x - rr + 1, y - 2, rr * 2 - 2, 1, '#100e20'); }
        for (let i = 0; i < 12; i++) { const x = r() * 400, y = 16 + r() * 22; R(x, y, 1, 2, '#ffe28a'); R(x + 1, y + 1, 1, 1, '#c8962a'); }
      });
      return [{ c: neb, f: 0.03, pre: 1 }, { c: mid, f: 0.25 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) {
      const px = 150, py = 30 - OY * 0.3;
      glow(px, py, 22, '#8a6ad8', 0.2);
      for (let x = -19; x <= 19; x++) { const y = Math.round(x * 0.22); if (y < 0 || Math.abs(x) > 12) { R(px + x, py + y - 1, 1, 1, '#b89ae8'); R(px + x, py + y, 1, 1, '#e0ccff'); } }
      disc(px, py, 11, '#5a3e9a'); disc(px - 1, py - 1, 10, '#7a5ac0'); disc(px - 3, py - 3, 6, '#9a7ee0'); R(px - 9, py + 1, 19, 1, '#684aae'); R(px - 8, py + 4, 16, 2, '#4c3288'); R(px - 7, py - 4, 12, 1, '#b094f0');
      for (let x = -19; x <= 19; x++) { const y = Math.round(x * 0.22) + 2; if (x * 0.22 > -1.5 && Math.abs(x) <= 12) { R(px + x, py + y, 1, 1, '#e0ccff'); R(px + x, py + y + 1, 1, 1, '#b89ae8'); } }
      disc(40, 20 - OY * 0.3, 4, '#c8d0e8'); disc(39, 19 - OY * 0.3, 3, '#eef0ff');
    },
    fx(t, OY, sc) {
      const k = (t / 2600 | 0), ph = (t % 2600) / 2600; if (ph < 0.22) { const x0 = 30 + (k * 97) % 150, y0 = -OY + 6 + (k * 41) % 50, d = ph / 0.22 * 70; for (let q = 0; q < 12; q++) { ctx.globalAlpha = 1 - q / 12; R(x0 + d - q * 2, y0 + (d - q * 2) * 0.45, 2, 1, q ? '#c8d0ff' : '#ffffff'); } ctx.globalAlpha = 1; }
      for (let i = 0; i < 10; i++) { const x = ((i * 67 - sc * 0.7) % 230 + 230) % 230 - 15, y = 20 + (i * 31) % 100 + Math.sin(t / 900 + i) * 4; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 350 + i * 1.7); R(x, y, 1, 1, i % 2 ? '#ffe28a' : '#c8d0ff'); } ctx.globalAlpha = 1;
    },
  },
  // 太古仙府：金霞、玉柱、浮空的殿宇
  palace: {
    sky: ['#5446a0', '#c284b6', '#ffcea0', '#fff4d0'],
    build() {
      const far = strip(400, w => wrap3(w, () => {
        const c = ['#c89aa8', '#e4bcb4', '#ffe4c8'], r = seeded(63);
        for (let i = 0; i < 5; i++) { const x = 40 + i * 80 + r() * 20, y = 46 + r() * 40, ww = 30 + Math.floor(r() * 18); floatRock(x, y, ww, c, i + 2); R(x - 8, y - 9, 16, 9, c[1]); R(x - 8, y - 9, 2, 9, c[2]); for (let k = 0; k < 5; k++) R(x - 12 + k * 2, y - 9 - k, 24 - k * 4, 1, k ? c[0] : c[2]); R(x - 1, y - 18, 2, 4, c[2]); if (i % 2) for (let k = 0; k < 30; k++) R(x + ww / 2 - 6, y + 2 + k, 2, 1, k % 3 ? '#ffffff' : '#ffe4c8'); }
      }));
      const mid = strip(400, w => {
        wrap3(w, () => { const P = pavPal(true); // 云上的殿群
          for (const [x, s] of [[80, 1], [250, 0], [350, 1]]) { R(x - 30, 108, 60, 14, '#e8dcc8'); wallBays(x, 96, 48, 12, P, { bays: 5 }); roof(x, 87, 40, 62, 9, ROOF.gold, { big: true }); if (s) { wallBays(x, 78, 30, 9, P, { bays: 3 }); roof(x, 70, 6, 42, 8, ROOF.gold, { big: true }); R(x - 1, 63, 2, 5, '#ecb43c'); } }
        });
        atop(() => { ctx.globalAlpha = 0.5; R(0, -TOPPAD, w, 200, '#ffd0b4'); ctx.globalAlpha = 1; });
        wrap3(w, () => { for (let i = 0; i < 14; i++) ctx.drawImage(cloudSprite(i + 3, 26 + (i * 7) % 22, '#ffffff', '#ffe8d8', '#f4c8c0'), i * 30 - 10, 104 + (i % 3) * 5); });
        R(0, 122, w, 10, '#ffe8d8');
      });
      const near = strip(600, w => wrap3(w, () => {
        const mb = ['#cdbfb4', '#f4ece0', '#ffffff'], gd = ['#ecb43c', '#b87a20', '#fff2a8'];
        for (let x = 0; x < w; x += 4) { R(x, 122, 1, 8, mb[0]); } R(0, 121, w, 1, mb[2]); R(0, 122, w, 1, mb[0]); R(0, 126, w, 1, mb[1]);
        for (let i = 0; i < 6; i++) {
          const x = i * 100 + 20; column(x, 130, 78, mb, gd); R(x - 6, 44, 12, 2, gd[0]); R(x - 6, 44, 12, 1, gd[2]);
          if (i % 2 === 0) { R(x + 5, 56, 1, 30, gd[1]); for (let k = 0; k < 26; k++) { const fw = 9 - (k > 21 ? (k - 21) * 2 : 0); R(x + 6, 57 + k, fw, 1, k % 6 === 5 ? '#a82a26' : '#d8443a'); R(x + 6, 57 + k, 1, 1, '#f07a5a'); } R(x + 9, 64, 3, 3, gd[0]); R(x + 10, 65, 1, 1, gd[2]); }
          else { const bx = x + 50; R(bx - 4, 124, 2, 6, gd[1]); R(bx + 3, 124, 2, 6, gd[1]); ellipse(bx, 120, 6, 4, gd[0]); R(bx - 4, 117, 5, 1, gd[2]); R(bx - 7, 115, 15, 2, gd[1]); R(bx - 7, 115, 15, 1, gd[2]); R(bx - 2, 112, 4, 3, gd[0]); }
        }
      }));
      const ground = groundStrip(400, '#eee4d0', '#ffffff', '#b4a08e', () => {
        for (let k = 0; k < 5; k++) R(0, 14 + k * k * 1.2 + k * 3, 400, 1, '#cdbfa8');
        for (let x = 0; x < 400; x += 20) { line(x, 12, x - 14, 44, '#cdbfa8'); }
        for (let x = 10; x < 400; x += 40) { R(x - 2, 20, 5, 1, '#ecb43c'); R(x, 19, 1, 3, '#ecb43c'); R(x + 14, 31, 7, 1, '#ecb43c'); R(x + 17, 30, 1, 3, '#ecb43c'); }
        for (let x = 20; x < 400; x += 100) { dR(x - 4, 13, 8, 12, '#d8ccbc', 8); dR(x - 3, 25, 6, 8, '#d8ccbc', 4); }
      });
      return [{ c: far, f: 0.06 }, { c: mid, f: 0.2 }, { c: near, f: 0.55 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) { glow(100, 96, 60, '#fff0b0', 0.3); disc(100, 92, 14, '#fff8dc'); },
    fx(t, OY, sc) {
      for (let i = 0; i < 16; i++) { const x = ((i * 59 - sc * 0.7 + Math.sin(t / 800 + i) * 5) % 230 + 230) % 230 - 15, y = 128 - ((i * 37 + t * 0.012) % 120); ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 260 + i * 2); R(x, y, 1, 1, i % 3 ? '#ffe28a' : '#ffffff'); if (i % 5 === 0) { R(x - 1, y, 3, 1, '#ffe28a'); R(x, y - 1, 1, 3, '#ffe28a'); } } ctx.globalAlpha = 1;
    },
  },
  // 混沌裂隙：虚空、漩涡与发光的裂痕
  chaos: {
    sky: ['#020208', '#0a0616', '#1a0a2c', '#2e0e44'], stars: 1,
    build() {
      const far = strip(400, w => wrap3(w, () => {
        const r = seeded(65), c = ['#0e0818', '#1c1030', '#3c2264'];
        for (let i = 0; i < 12; i++) { const x = i * 34 + r() * 16, h = 20 + r() * 50, ww = 10 + r() * 14; for (let k = 0; k < h + TOPPAD; k++) { const u = Math.max(0, (k - TOPPAD) / h), w2 = Math.max(1, Math.round(ww * (1 - u))); R(x - w2 / 2 + Math.round(Math.sin(k / 6 + i)), -TOPPAD + k, w2, 1, c[1]); R(x - w2 / 2 + Math.round(Math.sin(k / 6 + i)), -TOPPAD + k, 1, 1, c[2]); } }
        for (let i = 0; i < 20; i++) { const x = r() * w, y = 20 + r() * 80, s = 2 + Math.floor(r() * 5); for (let k = 0; k < s; k++) R(x + k, y - k, s - k, 1, c[1]); R(x, y, 1, 1, c[2]); }
      }));
      const mid = strip(400, w => wrap3(w, () => {
        const r = seeded(67), c = ['#0c0816', '#1a1030', '#3a2460'];
        for (let i = 0; i < 8; i++) { const x = i * 50 + r() * 22, y = 56 + r() * 52, ww = 16 + Math.floor(r() * 20); floatRock(x, y, ww, c, i + 5); const rc = i % 2 ? '#3ad8c8' : '#c85aff'; for (let k = 0; k < 4; k++) R(x - ww / 4 + k * 3, y + 2 + (k % 2) * 2, 2, 1, rc); if (i % 3 === 0) { R(x - 2, y - 14, 4, 14, c[1]); R(x - 2, y - 14, 1, 14, c[2]); R(x - 1, y - 10, 2, 1, rc); R(x - 1, y - 6, 2, 1, rc); } }
      }));
      const near = strip(600, w => wrap3(w, () => {
        const r = seeded(69);
        for (let i = 0; i < 14; i++) {
          const x = Math.round(i * 43 + r() * 20), h = 16 + r() * 34, tl = (r() - 0.5) * 12, rim = i % 2 ? '#3ad8c8' : '#c85aff';
          for (let a = 0; a < h; a++) { const ww = Math.max(1, Math.round((1 - a / h) * (6 + h / 6))), px = Math.round(x + tl * a / h - ww / 2); R(px, 130 - a, ww, 1, '#08060e'); R(px + ww - 1, 130 - a, 1, 1, '#1c1230'); R(px, 130 - a, 1, 1, a % 5 < 3 ? rim : '#5a2a8a'); }
        }
      }));
      const ground = groundStrip(400, '#150c1e', '#3c2456', '#030206', () => {
        const r = seeded(71);
        for (let i = 0; i < 60; i++) { const x = r() * 400, y = 14 + r() * 26; R(x, y, 2 + r() * 6, 1, r() < 0.5 ? '#22142e' : '#0a0610'); }
        for (let i = 0; i < 12; i++) { let x = r() * 400, y = 14 + r() * 8; const c = i % 2 ? '#3ad8c8' : '#c85aff'; for (let k = 0; k < 20; k++) { R(x, y, 2, 1, c); x += 1 + r() * 2; y += r() < 0.55 ? 1 : (r() < 0.3 ? -1 : 0); } }
      });
      return [{ c: far, f: 0.1 }, { c: mid, f: 0.3 }, { c: near, f: 0.6 }, { c: ground, f: 1, y: 116 }];
    },
    back(t, OY) {
      // 缓缓旋转的漩涡
      const cx = 140, cy = 44 - OY * 0.3, rot = t / 2400;
      glow(cx, cy, 40, '#7a2ae0', 0.22 + 0.05 * Math.sin(t / 500));
      for (let arm = 0; arm < 3; arm++) for (let s = 0; s < 46; s++) { const a = rot + arm * 2.094 + s * 0.16, rr = 3 + s * 0.8, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.55; ctx.globalAlpha = 1 - s / 50; R(x, y, s < 14 ? 2 : 1, 1, arm === 1 ? '#3ad8c8' : s < 12 ? '#f0c8ff' : '#a04af0'); }
      ctx.globalAlpha = 1; disc(cx, cy, 3, '#000000'); R(cx - 4, cy - 1, 9, 1, '#f0c8ff');
      // 天上的裂痕
      for (let i = 0; i < 3; i++) { const fl = Math.sin(t / 170 + i * 2.1) + Math.sin(t / 61 + i); if (fl < 0.2) continue; const r = seeded(i * 7 + 3); let x = 20 + i * 55, y = -OY; ctx.globalAlpha = Math.min(1, fl * 0.6); for (let k = 0; k < 26; k++) { const nx = x + (r() - 0.5) * 7, ny = y + 2 + r() * 3; line(x, y, nx, ny, k % 4 ? '#c85aff' : '#ffffff'); x = nx; y = ny; if (y > 70) break; } } ctx.globalAlpha = 1;
    },
    fx(t, OY, sc) {
      for (let i = 0; i < 16; i++) { const x = ((i * 59 - sc * 0.8 + Math.sin(t / 600 + i) * 6) % 230 + 230) % 230 - 15, y = 132 - ((i * 47 + t * 0.03) % 140); ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t / 240 + i); const c = i % 3 ? '#c85aff' : '#3ad8c8'; R(x, y, 1, 2, c); if (i % 4 === 0) R(x - 1, y + 1, 3, 1, c); } ctx.globalAlpha = 1;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 + 0.05 * Math.sin(t / 500); R(0, -OY, 200, 160 + OY, '#6a1aa0'); ctx.restore();
    },
  },
};
let advCur = null; // 只保留当前地图的图层
ART.drawAdventure = function (bgKey, t, OY, scroll) {
  const key = ADV[bgKey] ? bgKey : 'forest', A = ADV[key];
  if (!advCur || advCur.key !== key || advCur.OY !== OY) {
    const layers = advCur && advCur.key === key ? advCur.layers : A.build();
    const sky = on(mk(200, 160 + OY), () => {
      vgrad(0, 0, 200, OY + 130, ramp(A.sky, 7), 0.34);
      if (A.stars) { const r = seeded(77); for (let i = 0; i < 50 * A.stars; i++) { const x = Math.floor(r() * 200), y = Math.floor(r() * (OY + 100)), b = r(); R(x, y, 1, 1, b > 0.7 ? '#ffffff' : b > 0.4 ? '#c0c8f0' : '#7078b0'); } }
    });
    for (const l of layers) if (l.f >= 0.4) l.c._hdOK = 1;   // 近景与地表升 2 倍密度；远的反正要虚化
    advCur = { key, OY, layers, sky };
  }
  const hd = hdBegin('adv', { key, OY, t, scroll });
  try {
  hdL(hd, 'sky');
  ctx.drawImage(advCur.sky, 0, -OY);
  for (const l of advCur.layers) if (l.pre) drawStrip(l.c, scroll * l.f, -TOPPAD);
  if (A.back) A.back(t, OY, scroll);
  for (const l of advCur.layers) if (!l.pre) { hdL(hd, l.f < 0.15 ? 'far' : l.f < 0.4 ? 'mid' : 'ground'); drawStrip(l.c, scroll * l.f, l.y !== undefined ? l.y : -TOPPAD); }
  hdL(hd, 'ground');
  if (A.fx) A.fx(t, OY, scroll);
  } finally { hdEnd(hd); }
};

// ---------- 灵体（剑灵 / 星兽）与蛟龙 ----------
ART.drawOrb = function (x, y, t, fc, hit) {
  const c0 = hit ? '#ffffff' : fc[0], c1 = hit ? '#ffffff' : fc[1], hi = hit ? '#ffffff' : lerpC(fc[0], '#ffffff', 0.7), dk = hs(fc[1], 0.6);
  glow(x, y, 12, fc[0], 0.45);
  // 向后飘散的灵焰尾
  for (let k = 0; k < 7; k++) { const w = Math.sin(t / 140 + k * 0.9), r = Math.max(1, 4 - Math.floor(k * 0.6)); ctx.globalAlpha = 1 - k * 0.12; disc(x + 3 + k * 3, y + Math.round(w * (1 + k * 0.4)) - (k > 3 ? k - 3 : 0), r, k < 3 ? c1 : dk); } ctx.globalAlpha = 1;
  disc(x, y, 7, dk); disc(x, y, 6, c1); disc(x - 1, y - 1, 5, c0); disc(x - 2, y - 2, 2, hi);
  const f = (t / 120 | 0) % 3; R(x - 2 + f, y - 9, 2, 3, c0); R(x + 2 - f, y - 8, 1, 2, c1); R(x - 5, y - 7 + (f === 1 ? 1 : 0), 1, 2, c1);
  // 怒目
  R(x - 5, y - 2, 3, 3, '#1c1233'); R(x, y - 2, 3, 3, '#1c1233'); R(x - 5, y - 3, 1, 1, '#1c1233'); R(x + 2, y - 3, 1, 1, '#1c1233'); R(x - 4, y - 1, 1, 1, '#ffffff'); R(x + 1, y - 1, 1, 1, '#ffffff'); R(x - 3, y + 3, 4, 1, '#1c1233');
  // 环绕的碎刃 / 星屑
  for (let k = 0; k < 3; k++) { const a = t / 380 + k * 2.094, ox = Math.round(x + Math.cos(a) * 12), oy = Math.round(y + Math.sin(a) * 5); if (Math.sin(a) > -0.2) { R(ox, oy - 2, 1, 5, hi); R(ox - 1, oy - 1, 3, 3, c0); R(ox, oy, 1, 1, '#ffffff'); } }
};
ART.drawSnake = function (x, y, t, fc, hit) {
  const c0 = hit ? '#ffffff' : fc[0], c1 = hit ? '#ffffff' : fc[1], rim = hit ? '#ffffff' : lerpC(fc[0], '#c8f4ff', 0.5), belly = hit ? '#ffffff' : lerpC(fc[0], '#fff4d0', 0.55), ink = hs(fc[1], 0.5);
  const N = 15, P = [];
  for (let k = 0; k < N; k++) P.push([x + 4 + k * 4, y + Math.round(Math.sin(t / 240 - k * 0.55) * (2 + k * 0.28)), Math.max(1, Math.round(4.2 - k * 0.22))]);
  // 尾鳍
  const tl = P[N - 1]; R(tl[0] + 1, tl[1] - 3, 2, 2, rim); R(tl[0] + 2, tl[1] - 1, 3, 2, c0); R(tl[0] + 1, tl[1] + 1, 2, 2, rim);
  for (let k = N - 1; k >= 0; k--) { const p = P[k]; disc(p[0], p[1], p[2] + 1, ink); }
  for (let k = N - 1; k >= 0; k--) { const p = P[k]; disc(p[0], p[1], p[2], k % 2 ? c1 : c0); R(p[0] - p[2] + 1, p[1] + p[2] - 1, p[2] * 2 - 1, 1, belly); R(p[0] - 1, p[1] - p[2], 2, 1, rim); if (k % 2 === 0 && k > 0) { R(p[0], p[1] - p[2] - 2, 1, 2, rim); R(p[0] + 1, p[1] - p[2] - 1, 1, 1, c1); } }
  // 龙首（朝左）
  const hy = P[0][1];
  disc(x, hy, 6, ink); R(x - 10, hy - 2, 8, 6, ink);
  disc(x, hy, 5, c0); R(x - 9, hy - 1, 8, 3, c0); R(x - 9, hy + 2, 7, 1, belly); R(x - 9, hy - 1, 6, 1, rim); R(x - 3, hy - 5, 5, 1, rim);
  R(x - 9, hy, 1, 1, ink); R(x - 8, hy + 2, 6, 1, ink); R(x - 7, hy + 3, 1, 1, '#ffffff'); R(x - 4, hy + 3, 1, 1, '#ffffff');
  R(x - 4, hy - 3, 3, 3, '#fff2a8'); R(x - 3, hy - 3, 1, 3, '#c8242a'); R(x - 5, hy - 4, 4, 1, ink);
  // 角与须
  R(x + 1, hy - 8, 1, 4, '#f4e4b0'); R(x + 2, hy - 10, 1, 3, '#f4e4b0'); R(x + 3, hy - 8, 1, 1, '#f4e4b0'); R(x + 4, hy - 7, 1, 3, '#d8c48a'); R(x + 5, hy - 9, 1, 3, '#d8c48a');
  const wv = Math.round(Math.sin(t / 200) * 1.5); R(x - 11, hy + 1, 2, 1, rim); R(x - 13, hy + 2 + wv, 2, 1, rim); R(x - 14, hy + 3 + wv, 1, 2, rim);
  for (let k = 0; k < 3; k++) R(x + 3 + k * 2, hy - 2 + k * 2, 2, 2, rim);
};

// ---------- 飞剑、剑气、仙鹤 ----------
ART.drawFlyingSword = function (x, y, t, trim) {
  x = Math.round(x); y = Math.round(y);
  const g2 = lerpC(trim, '#ffffff', 0.4);
  // 剑光拖尾
  ctx.globalAlpha = 0.35; R(x - 28, y + 1, 12, 2, trim); ctx.globalAlpha = 0.2; R(x - 38, y + 1, 12, 1, trim); R(x - 20, y, 30, 4, trim); ctx.globalAlpha = 1;
  // 剑穗
  const w = Math.round(Math.sin(t / 130) * 1.2); R(x - 19, y + 1, 2, 1, '#c8342c'); R(x - 22, y + 1 + w, 3, 1, '#e04a3c'); R(x - 25, y + 2 + w, 3, 1, '#c8342c'); R(x - 27, y + 2 - w, 2, 1, '#ff8a6a');
  // 剑柄、护手
  R(x - 17, y + 1, 5, 2, '#5a3a2a'); R(x - 16, y + 1, 1, 2, '#8a5e3c'); R(x - 14, y + 1, 1, 2, '#8a5e3c'); R(x - 18, y, 1, 4, '#c8962a');
  R(x - 12, y - 1, 2, 6, '#c8962a'); R(x - 12, y - 1, 1, 6, '#ffe08a'); R(x - 11, y + 1, 1, 2, trim);
  // 剑身
  R(x - 10, y, 25, 4, '#7a8aa8'); R(x - 10, y, 25, 1, '#ffffff'); R(x - 10, y + 1, 26, 1, '#dfe8f4'); R(x - 10, y + 2, 26, 1, '#aebcd0'); R(x + 15, y + 1, 2, 2, '#dfe8f4'); R(x + 17, y + 1, 1, 1, '#ffffff'); R(x + 15, y, 1, 1, '#dfe8f4');
  R(x - 8, y + 1, 18, 1, g2);
  const gl = (t / 90 | 0) % 34; if (gl < 24) { R(x - 9 + gl, y, 2, 1, '#ffffff'); R(x - 8 + gl, y + 1, 2, 1, '#ffffff'); }
};
ART.drawSwordQi = function (x, y, trim) {
  x = Math.round(x); y = Math.round(y);
  const pale = lerpC(trim, '#ffffff', 0.6);
  ctx.globalAlpha = 0.35; R(x - 9, y - 1, 6, 3, trim); R(x - 13, y, 5, 1, trim); ctx.globalAlpha = 1;
  // 月牙形剑气
  R(x - 4, y - 5, 2, 1, trim); R(x - 2, y - 4, 2, 1, trim); R(x, y - 3, 2, 2, pale); R(x + 1, y - 1, 2, 3, '#ffffff'); R(x, y + 2, 2, 2, pale); R(x - 2, y + 4, 2, 1, trim); R(x - 4, y + 5, 2, 1, trim);
  R(x - 1, y - 2, 1, 1, trim); R(x, y - 1, 1, 3, pale); R(x - 1, y + 2, 1, 1, trim); R(x + 3, y, 1, 1, pale);
};
const CRANE = [
  ['..............................', '..........KKww................', '.........KwwwwW...............', '........KwwwwwwW..............', '.......KwwwwwwwwW.....r.......', 'k.....KwwwwwwwwwwWWKKKwwyy....', '.kkkWWwwwwwwwwwwwwwKK.........', '...kkkWWWwwwwwWWWW............', '......pp......................', '..............................'],
  ['..............................', '..............................', '..............................', '......................r.......', 'k......WWwwwwwwwwWWKKKwwyy....', '.kkkWWwwwwwwwwwwwwwKK.........', '...kkkWWwwwwwwwWWW............', '......ppKwwwwwwW..............', '.........KwwwwW...............', '..........KKwW................'],
];
ART.drawCrane = function (x, y, t) {
  const f = (t / 240 | 0) % 2;
  const spr = cached('crane' + f, () => render(grid(CRANE[f], 30), { w: '#ffffff', W: '#d4dcf0', K: '#2a2438', k: '#3a3448', r: '#e23a3a', y: '#e8b040', p: '#4a4458' }));
  ctx.drawImage(spr, Math.round(x - 18), Math.round(y - 6 + Math.sin(t / 300) * 1.5));
};

// ====================================================================
// 阶段二新增资产：半身像、图标、界面皮肤、对决、过场画（接口见 docs/DESIGN.md §6.1）
// 统一规则：轮廓线深紫 INK，光源左上，每种材质三个色阶（亮 / 中 / 暗），单个精灵不超过 16 色
// ====================================================================
const INK = '#1b1326';
const dnMap = new Map(), upMap = new Map(), upRev = new Map(), derived = new Set();
function dn(c) { let v = dnMap.get(c); if (!v) { v = hs(c, 0.72); dnMap.set(c, v); } derived.add(v); return v; }
function up(c) { let v = upMap.get(c); if (!v) { v = hs(c, 1.25); upMap.set(c, v); } upRev.set(v, c); return v; }
// 登记一种材质的三个色阶，返回中间色
function tone(mid, dark, light) { if (dark) { dnMap.set(mid, dark); derived.add(dark); } if (light) upMap.set(mid, light); return mid; }

// 像素缓冲：先在各图层上画纯色形状，lit() 自动打出左上亮边与右下暗边，over() 叠到底图上并留出分隔线，最后 cv() 描边出图
function Buf(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
Buf.prototype = {
  at(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.d[y * this.w + x] : null; },
  p(x, y, c) { x = Math.round(x); y = Math.round(y); if (c !== undefined && x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; return this; },
  r(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.p(x + i, y + j, c); return this; },
  hl(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.p(x, y, c); return this; },
  e(cx, cy, rx, ry, c) { for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) { const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1) this.p(x, y, c); } return this; },
  l(x0, y0, x1, y1, c, th) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); th = th || 1; for (let i = 0; i <= n; i++) this.r(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), th, th, c); return this; },
  // 字符图：pal 里没有的字符跳过；flip 时以整幅画布中线镜像
  m(x, y, rows, pal, flip) { for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) { const c = pal[rows[j][i]]; if (c) this.p(flip ? this.w - 1 - (x + i) : x + i, y + j, c); } return this; },
  // 左右对称的逐行半宽（36 进制字符串），中线在 cx 左侧
  sy(y0, s, c, cx) { cx = cx || this.w / 2; for (let k = 0; k < s.length; k++) { const hw = parseInt(s[k], 36); if (hw) this.hl(cx - hw, cx + hw - 1, y0 + k, c); } return this; },
  // 以画布中线镜像地画（fn 只画左半边）
  mir(fn) { const t = new Buf(this.w, this.h); fn(t); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const c = t.d[y * this.w + x]; if (c) { this.p(x, y, c); this.p(this.w - 1 - x, y, c); } } return this; },
  lit(noHi) {
    const s = this.d.slice(), w = this.w, h = this.h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = s[i]; if (!c) continue;
      const k = (y > 0 && !s[i - w] ? 1 : 0) + (x > 0 && !s[i - 1] ? 1 : 0) - (y < h - 1 && !s[i + w] ? 1 : 0) - (x < w - 1 && !s[i + 1] ? 1 : 0);
      if (k > 0) { if (!noHi) this.d[i] = up(c); } else if (k < 0) this.d[i] = dn(c);
    }
    return this;
  },
  // 叠加图层。sep：底图上紧贴图层边缘的像素压暗一级（内部分隔线）；cast=[dx,dy]：图层向该方向投影
  over(L, o) {
    o = o || {}; const w = this.w, h = this.h, mark = [], own = new Set(L.d);
    const dark = (x, y) => { const c = this.at(x, y); if (c && !L.at(x, y) && !derived.has(c) && !own.has(c)) mark.push(y * w + x); };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!L.d[y * w + x]) continue;
      if (o.sep) { dark(x - 1, y); dark(x + 1, y); dark(x, y - 1); dark(x, y + 1); }
      if (o.cast) dark(x + o.cast[0], y + o.cast[1]);
    }
    for (const i of mark) { const c = this.d[i]; this.d[i] = upRev.has(c) && upRev.get(c) !== c ? upRev.get(c) : dn(c); }
    for (let i = 0; i < L.d.length; i++) if (L.d[i]) this.d[i] = L.d[i];
    return this;
  },
  // 新开一个图层画完再叠上来
  add(fn, o) { const L = new Buf(this.w, this.h); fn(L); if (!o || !o.flat) L.lit(o && o.noHi); return this.over(L, o || { sep: 1 }); },
  cv(o) {
    o = o || {}; const w = this.w, h = this.h, c = mk(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), d = img.data;
    const ink = hex(o.ink || INK);
    if (o.max) { // 颜色数超限时，把最接近的两种颜色并成一种（保留用得多的）
      const cnt = new Map(); for (const c of this.d) if (c) cnt.set(c, (cnt.get(c) || 0) + 1);
      while (cnt.size > o.max) {
        const ks = [...cnt.keys()]; let best = 1e9, A = null, B = null;
        for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const a = hex(ks[i]), b2 = hex(ks[j]), dd = (a[0] - b2[0]) ** 2 * 0.3 + (a[1] - b2[1]) ** 2 * 0.59 + (a[2] - b2[2]) ** 2 * 0.11; if (dd < best) { best = dd; A = ks[i]; B = ks[j]; } }
        if (cnt.get(A) < cnt.get(B)) { const t = A; A = B; B = t; }
        for (let i = 0; i < this.d.length; i++) if (this.d[i] === B) this.d[i] = A;
        cnt.set(A, cnt.get(A) + cnt.get(B)); cnt.delete(B);
      }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; let col = this.d[i] ? hex(this.d[i]) : null;
      if (!col && !o.noOutline && (this.at(x - 1, y) || this.at(x + 1, y) || this.at(x, y - 1) || this.at(x, y + 1))) col = ink;
      if (col) { d[i * 4] = col[0]; d[i * 4 + 1] = col[1]; d[i * 4 + 2] = col[2]; d[i * 4 + 3] = 255; }
    }
    g.putImageData(img, 0, 0); return c;
  },
};

// ---------- 半身像 48×48 ----------
// 脸型：从 y=11 起逐行半宽。圆（少女）、鹅蛋（青年）、方（赵乾）、尖（魔道）、长（老者）、阔（发福的老人）
const FSHAPE = {
  round: '79abbbbbbbbbbbbbbbaa9864',
  oval: '79abbbbbbbbbbbbbbbaa99875',
  square: '79abbbbbbbbbbbbbbbbbba987',
  sharp: '79aaaaaaaaaaaaaaaa9987653',
  long: '689aaaaaaaaaaaaaaaaa998764',
  wide: '79abbbbbbbbbbbbbcccccba86',
};
function skinTone(skin) {
  const S = lerpC(hs(skin, 0.84), '#d98a86', 0.22);
  tone(skin, S, lerpC(skin, '#fff8e8', 0.4));
  return { s: skin, S, m: lerpC(skin, '#f2777c', 0.42), M: lerpC(skin, '#8a3040', 0.7) };
}
// 眼睛（画的是画面左侧那只，外眼角在左；右眼镜像）。L 睫毛 I 瞳 i 虹膜 h 高光 w 眼白 u 眼睑阴影 r 眼尾妆
const ARC = ['......', '.LLLL.', 'L....L'];
const EYES = {
  f: { n: ['LLLLL.', 'LhIIw.', '.IIIw.', '.iii..'], joy: ARC, ang: ['L.....', '.LLLLL', '.hIIw.', '.iii..'], shock: ['.LLLL.', 'LwwwwL', 'LwIIwL', '.wwww.'], sad: ['......', 'LLLLL.', 'LIIIw.', '.iii..'] },
  m: { n: ['LLLLL.', '.hIIw.', '.iii..'], joy: ARC, ang: ['L.....', '.LLLLL', '.hIIw.'], shock: ['.LLLL.', 'LwIIwL', '.wwww.'], sad: ['......', 'LLLLL.', '.iIIw.'] },
  n: { n: ['......', 'LLLLL.', '..IIw.'], joy: ARC, ang: ['L.....', '.LLLLL', '..II..'], shock: ['.LLLL.', 'LwIIwL', '.wwww.'], sad: ['......', '......', 'LLLLL.', '..ii..'] },
  c: { n: ['......', '......', 'L....L', '.LLLL.'], joy: ARC, ang: ['......', 'LLLLLL', '.wiIw.'], shock: ['.LLLL.', 'LwiiwL', 'LwiiwL', '.wwww.'], sad: ['......', '......', 'L....L', '.LLLL.'] },
  d: { n: ['......', '.LLLLL', 'LhIIw.', '.iii..'], sad: ['......', '......', '.LLLLL', 'LiIIw.'] },
  x: { n: ['r.....', 'LLLLL.', '.hIIw.', '.iIi..'], ang: ['r.....', 'LLL...', '.hILLL', '.iIi..'], sad: ['......', 'rLLLL.', '.IIiw.', '.iIi..'] },
  o: { n: ['......', '......', 'LLLLL.', 'u.....'], joy: ['......', '.LLLL.', 'L....L', 'u.....'], ang: ['......', 'L.....', '.LLLLL', '..II..'], shock: ['.LLLL.', 'LwIIwL', '.wwww.'], sad: ['......', '......', 'LLLLL.', '..ii..'] },
};
const MOUTHS = {
  line: ['MM'], flat: ['MMM'], smile: ['M..M', '.MM.'], smirk: ['...M', 'MMM.'], open: ['MMMM', 'MttM', '.MM.'], grin: ['MMMMM', 'MwwwM', '.MMM.'], frown: ['.MM.', 'M..M'],
  grit: ['MMMMM', 'MwMwM', 'MMMMM'], o: ['.MM.', 'MttM', '.MM.'], pout: ['.M.', 'M.M'], cat: ['M.M.M', '.M.M.'], fang: ['M.....M', '.MwMMwM', '..MMMM.'], fangO: ['MMMMMMM', 'MwMttwM', '.MMMMM.'], lip: ['.tt.', 'tMMt'], none: [],
};
// 五官。F = {eye, iris, lash, ex, ey, brow:{c,len,th,y,in,tilt}, mouth:{n,joy,...}, my, blush, nose, sk}
function feat(b, F, mood) {
  const sk = F.sk, ey = F.ey || 24, ex = F.ex || 17;
  const st = EYES[F.eye] || EYES.m, rows = (F.eyes && F.eyes[mood]) || st[mood] || (F.fem ? EYES.f : EYES.m)[mood];
  const iris = mood === 'shock' && F.eye !== 'c' ? '#2a1a30' : F.iris || '#4a3a5a';
  const pal = { L: F.lash || '#2a1a30', I: F.lash || '#2a1a30', i: iris, h: '#f6f2fa', w: '#f6f2fa', u: sk.S, r: F.tail || F.lash || '#2a1a30' };
  for (const fl of [0, 1]) b.m(ex - 1, ey, rows, pal, fl);
  // 眉：ang 内低外高，sad 内高外低，shock 整体上挑
  const B = F.brow || {}, bl = B.len || 5, by = (B.y || ey - 2) - (mood === 'shock' ? 1 : 0), tilt = (mood === 'ang' ? 1 : mood === 'sad' ? -1 : 0) + (B.tilt || 0);
  if (B.c !== 0) for (let k = 0; k < bl; k++) {
    const x = ex + 4 + (B.in || 0) - k, y = by + Math.round(tilt * (1 - 2 * k / (bl - 1)) * 0.9) + (mood === 'joy' && (k === 0 || k === bl - 1) ? 1 : 0);
    for (let j = 0; j < (B.th || 1); j++) { b.p(x, y - j, B.c || pal.L); b.p(47 - x, y - j, B.c || pal.L); }
  }
  if (F.nose !== 0) { b.p(24, ey + 5, sk.S); if (F.nose !== 1) b.p(24, ey + 4, sk.S); }
  if (F.blush) for (const x of [ex - 1, ex, ex + 1, 46 - ex, 47 - ex, 48 - ex]) b.p(x, ey + 5, sk.m);
  const mk2 = Object.assign({ n: 'line', joy: 'open', ang: 'frown', shock: 'o', sad: 'frown' }, F.mouth)[mood], mr = MOUTHS[mk2] || [];
  if (mr.length) b.m(24 - Math.ceil(mr[0].length / 2), F.my || ey + 7, mr, { M: sk.M, t: F.lip || sk.m, w: '#f6f2fa' });
}
// 肩与交领。robe = [暗, 中, 亮]
function bust(b, robe, trim, o) {
  o = o || {}; const sw = o.sw || 19, top = o.top || 38, hw = [7, 12, 15, 17, 18, 19, 19, 20, 20, 20];
  tone(robe[1], robe[0], robe[2]);
  b.add(L => {
    for (let k = 0; top + k < 48; k++) { const w = Math.min(23, Math.round(hw[Math.min(k, 9)] * sw / 19)); L.hl(24 - w, 23 + w, top + k, robe[1]); }
  });
  for (let y = top + 5; y < 48; y++) { b.p(24 - sw + 5, y, robe[0]); b.p(23 + sw - 5, y, robe[0]); }
  for (let y = top + 3; y < 48; y += 2) b.p(24 - sw + 3 + ((y >> 1) & 1), y, robe[2]);
  if (o.col === 0) return;
  const inner = o.inner || '#f6f2fa', t2 = robe[0];
  for (let k = 0; top + k < 48; k++) {
    const y = top + k, xl = 18 + k, xr = 29 - k;
    for (let x = xl + 2; x <= xr - 2; x++) b.p(x, y, k < 2 ? o.skin : inner);
    if (xl + 1 < xr - 1) { b.p(xl, y, trim); b.p(xl + 1, y, trim); }
    b.p(xr + 1, y, t2); b.p(xr, y, trim); b.p(xr - 1, y, trim);
  }
}
// 发盖：头顶是椭圆，下缘由 fr 逐列给出（y = 10 + 36 进制值；长度为半幅时自动镜像）
function cap(L, c, fr, o) {
  o = o || {}; const full = o.full ? fr : fr + fr.split('').reverse().join(''), n = full.length, x0 = 24 - n / 2, rx = o.rx || n / 2, top = o.top === undefined ? 6 : o.top, ry = o.ry || 11;
  for (let i = 0; i < n; i++) {
    const x = x0 + i, u = Math.min(0.999, Math.abs(x + 0.5 - 24) / rx), yt = Math.round(top + ry - ry * Math.sqrt(1 - u * u)), yb = 10 + parseInt(full[i], 36);
    for (let y = yt; y <= yb; y++) L.p(x, y, c);
  }
}
function face(b, shape, sk, o) {
  o = o || {};
  b.add(L => L.r(21, 32, 6, 8, sk.s), { sep: 1, noHi: 1 });
  b.add(L => { L.sy(11, FSHAPE[shape], sk.s); if (!o.noEar) { const hw = parseInt(FSHAPE[shape][14], 36); L.r(24 - hw - 2, 24, 2, 5, sk.s); L.r(24 + hw, 24, 2, 5, sk.s); } }, { sep: 1, cast: [0, 2], noHi: 1 });
  const fs = FSHAPE[shape]; for (let y = 17; y < 11 + fs.length - 2; y++) b.p(24 + parseInt(fs[y - 11], 36) - 2, y, sk.S);
}

const HAIR_K = '#2a2230';
function hairTone(c) { const dark = lum(c) < 110; tone(c, hs(c, dark ? 0.62 : 0.74), dark ? lerpC(c, '#9aa2dc', 0.42) : lerpC(c, '#ffffff', 0.7)); return c; }
const GOLD = tone('#f4c542', '#a8742a', '#fff2a8'), JADE = tone('#5fd3b0', '#2a8a7a', '#c8fff0'), RED = tone('#d8404a', '#8a1e2e', '#ff8a8a'), WOOD = tone('#8a5c36', '#5a3a26', '#b98a4c'), STEEL = tone('#aeb8c8', '#5a6480', '#eef4ff'), WHITE = tone('#f6f2fa', '#b4b0cc', '#ffffff');
// 斜插在背后的剑柄：从 (x0,y0) 肩后伸到 (x1,y1) 柄端
function hilt(b, x0, y0, x1, y1, o) {
  o = o || {};
  b.add(L => {
    L.l(x0, y0, x1, y1, o.grip || WOOD, 2);
    const n = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / n, uy = (y1 - y0) / n, gx = x0 + ux * (o.g || 3), gy = y0 + uy * (o.g || 3), gw = o.gw || 3;
    L.l(gx + uy * gw, gy - ux * gw, gx - uy * gw, gy + ux * gw, o.guard || GOLD, 2);
    L.r(Math.round(x1), Math.round(y1), 2, 2, o.pommel || GOLD);
    if (o.blade) L.l(x0 - ux * 2, y0 - uy * 2, x0 - ux * o.blade, y0 - uy * o.blade, STEEL, o.bw || 2);
  });
}

// 通用人物：o = {skin, shape, hair, robe, trim, fr, back(L), hairX(L,c), F, bust:{}, pre(b), mid(b), skinX(b), post(b)}
function person(o, mood) {
  const b = new Buf(48, 48), sk = skinTone(o.skin || '#f2c9a0'), hc = hairTone(o.hair || HAIR_K);
  if (o.back) b.add(L => o.back(L, hc));
  if (o.pre) o.pre(b, mood, hc, sk);
  bust(b, o.robe, o.trim, Object.assign({ skin: sk.s }, o.bust));
  if (o.mid) o.mid(b, mood, hc, sk);
  face(b, o.shape || 'oval', sk, o.face);
  feat(b, Object.assign({ sk }, o.F), mood);
  if (o.skinX) o.skinX(b, mood, sk, hc);
  b.add(L => { if (o.fr) cap(L, hc, o.fr, o.cap); if (o.hairX) o.hairX(L, hc); }, { sep: 1, cast: [0, 1] });
  if (!o.noGloss) for (const [x0, x1, y] of [[15, 21, 9], [14, 17, 10], [14, 15, 11], [27, 30, 9]]) for (let x = x0; x <= x1; x++) if (b.at(x, y) === hc && x % 4 !== 0) b.p(x, y, up(hc));
  if (o.post) o.post(b, mood, hc, sk);
  return b;
}

const PINK = tone('#f7a3bd', '#c8607e', '#ffd6e4'), GREEN = tone('#62b25a', '#2f6e4b', '#a8e08a');
// 主角：男女各一，道袍随境界九色，眼神随境界从怯到定，大乘起白发
function meSpec(look, realm) {
  const R0 = L.REALMS[Math.min(realm, 9)], f = look.f, hair = realm >= 7 ? '#e9e8f2' : look.hair || HAIR_K;
  // 男主：俊朗的少年侠客——高马尾、朱红发带、中分碎刘海露出额头、剑眉、眼尾上挑、下颌收窄
  if (!f) return {
    skin: look.skin, hair, shape: 'sharp', robe: R0.robe, trim: R0.trim, bust: { sw: 21 },
    fr: 'hdb98ab97689754567678adh', cap: { full: 1 },
    back: (L, c) => { L.r(17, 26, 14, 7, c); L.l(27, 2, 37, 4, c, 3); L.l(37, 4, 42, 12, c, 3); L.l(42, 12, 43, 21, c, 2); L.l(43, 21, 42, 25, c, 1); },
    hairX: (L, c) => L.e(24, 4, 4, 3.4, c),
    F: { eye: 'x', iris: '#4a5aa8', lip: '#a0605a', brow: { th: 2, len: 5, in: 1, tilt: realm < 2 ? 0.4 : 0.9, c: realm >= 7 ? '#8a88a0' : undefined },
      eyes: { n: ['L.....', 'LLLLL.', '.hIIw.', '.iIi..'], sad: ['......', 'LLLLL.', '.IIiw.', '.iIi..'] }, mouth: { n: realm < 2 ? 'flat' : 'smirk', joy: 'smile', ang: 'frown', shock: 'flat', sad: 'flat' } },
    skinX: (b, m, sk) => { b.p(16, 31, sk.S); b.p(31, 31, sk.S); b.p(17, 32, sk.S); b.p(30, 32, sk.S); },
    post: b => { const c = realm >= 9 ? '#f6f2fa' : '#d8404a', d = realm >= 9 ? '#b4b0cc' : '#8a1e2e'; b.r(21, 6, 6, 2, c); b.hl(21, 26, 7, d); b.l(20, 7, 14, 11, c); b.l(20, 8, 15, 14, d); },
  };
  return {
    skin: look.skin, hair, shape: f ? 'round' : 'oval', robe: R0.robe, trim: R0.trim,
    fr: f ? 'ssba98766667' : 'jkcba9876656',
    back: f ? (L, c) => L.r(12, 15, 24, 24, c) : (L, c) => L.r(16, 26, 16, 10, c),
    hairX: f ? (L, c) => { L.e(17, 4.5, 4.5, 4, c); L.e(31, 4.5, 4.5, 4, c); L.r(16, 4, 2, 2, null); L.r(30, 4, 2, 2, null); } : (L, c) => L.e(24, 3.5, 4, 3.2, c),
    F: { eye: f ? 'f' : 'm', fem: f, iris: '#6a5a9a', blush: f, brow: { tilt: realm < 2 ? -0.6 : realm >= 6 ? 0.6 : 0, c: realm >= 7 ? '#8a88a0' : undefined }, mouth: { n: realm < 2 ? 'line' : 'smile' } },
    post: b => {
      if (f) { b.r(22, 5, 4, 3, PINK); b.r(23, 4, 2, 5, PINK); b.r(23, 6, 2, 1, '#f4c542'); }
      else b.r(21, 6, 6, 2, realm >= 9 ? '#f6f2fa' : '#f4c542');
    },
  };
}
// 药篓与露出来的药草（苏青瑶 / 苏景行）
function suBasket(b) {
  const BK = tone('#b98a4c', '#7a5230', '#e0b878');
  b.add(L => { L.l(37, 27, 36, 18, GREEN); L.l(41, 27, 43, 19, GREEN); L.l(39, 27, 39, 21, GREEN); L.r(35, 17, 2, 2, GREEN); L.r(43, 20, 2, 2, GREEN); L.p(38, 22, GREEN); L.p(40, 23, GREEN); }, { flat: 1, sep: 1 });
  b.p(36, 16, '#f6f2fa'); b.p(43, 18, '#f7a3bd'); b.p(39, 20, '#f4c542');
  b.add(L => { L.r(34, 28, 11, 14, BK); L.r(33, 26, 13, 3, BK); });
  for (let y = 30; y < 42; y++) for (let x = 35; x < 45; x++) if ((x + y * 2) % 4 === 0) b.p(x, y, '#7a5230');
}
const suStrap = b => { b.l(33, 40, 25, 47, '#8a5c36', 2); b.l(34, 40, 26, 47, '#5a3a26'); };
const yeFr = 'mkedccbbaa9988776654579cgj';
function yeRing(b) { b.r(12, 32, 1, 3, '#f4c542'); b.add(L => L.r(11, 35, 3, 3, RED)); b.hl(21, 26, 36, '#1e1430'); b.r(23, 37, 2, 1, '#d8404a'); }

const PEOPLE = {
  // 玄霄：半透明青白残魂，长眉长须，玉冠缺角，下缘散成烟
  elder: {
    skin: '#a6cdee', hair: '#f0f9ff', shape: 'long', robe: ['#3f6aa8', '#7aa8e0', '#c0dcff'], trim: '#e6f6ff', bust: { sw: 17, inner: '#9cc0ec' },
    fr: 'f8765544444', back: (L, c) => L.r(14, 14, 20, 22, c), hairX: (L, c) => L.e(24, 4.5, 3.5, 2.5, c), noGloss: 1,
    F: { eye: 'n', iris: '#27357a', lash: '#27357a', brow: { c: 0 }, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'o', sad: 'none' }, nose: 2 },
    post: (b, mood, W, sk) => {
      const tl = mood === 'ang' ? 1 : mood === 'sad' ? -1 : 0, by = mood === 'shock' ? 20 : 21;
      b.add(L => L.mir(T => { T.l(21, by + tl, 16, by - tl, W); T.l(21, by + tl - 1, 17, by - tl - 1, W); T.l(15, by - tl, 12, by + 3, W); T.l(12, by + 4, 11, by + 10, W); }));
      b.add(L => { L.mir(T => { T.l(23, 31, 20, 32, W); T.l(19, 33, 18, 37, W); }); L.sy(34, '122222221111', W); });
      if (mood === 'joy') b.hl(22, 25, 33, sk.M);
      b.add(L => { L.r(20, 0, 8, 5, JADE); L.r(26, 0, 2, 2, null); L.r(22, 5, 4, 2, JADE); });
      b.hl(16, 31, 3, '#f0f9ff'); b.hl(21, 26, 3, '#2a8a7a');
    },
    fx: 'ghost',
  },
  // 慕容雪：粉衣、高髻金步摇、下巴微抬
  mu: {
    hair: '#3a2630', skin: '#f8d8bc', shape: 'round', robe: ['#b0486e', '#e87aa0', '#ffb4cc'], trim: '#fff0f4',
    fr: 'pp8765444456', back: (L, c) => L.r(11, 14, 26, 27, c),
    hairX: (L, c) => { L.e(24, 4, 7.5, 4.5, c); L.e(15, 7, 3, 3, c); L.e(33, 7, 3, 3, c); },
    F: { eye: 'f', fem: 1, ey: 23, iris: '#a05a3a', blush: 1, brow: { y: 20 }, eyes: { n: ['......', 'LLLLL.', 'LIIIw.', '.iii..'] }, mouth: { n: 'pout', joy: 'smirk', ang: 'frown' } },
    post: b => {
      b.r(23, 17, 2, 1, '#d8404a'); b.p(23, 18, '#d8404a');
      b.add(L => { L.hl(19, 28, 8, GOLD); L.hl(21, 26, 7, GOLD); L.r(23, 5, 2, 2, GOLD); L.l(34, 9, 37, 12, GOLD); L.l(11, 9, 13, 9, GOLD); }, { flat: 1, sep: 1 });
      b.r(23, 7, 2, 1, '#d8404a');
      for (const [x, y, c] of [[37, 13, GOLD], [37, 15, '#d8404a'], [37, 17, GOLD], [37, 19, '#fff2a8'], [35, 12, GOLD], [35, 14, '#fff2a8'], [10, 10, GOLD], [10, 12, '#d8404a'], [10, 14, GOLD]]) b.p(x, y, c);
      b.hl(21, 26, 42, GOLD); b.r(23, 43, 2, 1, '#d8404a');
    },
  },
  // 慕容轩：金冠横簪、两缕龙须、玫红袍
  mu2: {
    hair: '#3a2630', skin: '#f6d6ba', shape: 'oval', robe: ['#a8446a', '#e07a9c', '#ffb4cc'], trim: '#fff0f4',
    fr: 'jj8765444456', back: (L, c) => L.r(13, 14, 22, 22, c), hairX: (L, c) => L.e(24, 3.5, 4, 3.2, c),
    mid: b => b.add(L => { for (let i = 0; i < 4; i++) { L.e(7 + i * 4, 44 - i * 2, 3.5, 3, WHITE); L.e(41 - i * 4, 44 - i * 2, 3.5, 3, WHITE); } }),
    F: { eye: 'm', ey: 23, iris: '#a05a3a', brow: { y: 20 }, eyes: { n: ['......', 'LLLLL.', '.IIIw.'] }, mouth: { n: 'flat', joy: 'smirk', ang: 'frown' } },
    post: b => { b.add(L => { L.r(21, 1, 6, 5, GOLD); L.hl(15, 32, 3, GOLD); }); b.r(23, 3, 2, 2, '#d8404a'); b.hl(21, 26, 42, GOLD); },
  },
  // 赵乾：方脸、蓝袍方巾、背后一柄不出鞘的剑
  zhao: {
    skin: '#e8b88e', shape: 'square', robe: ['#263f7a', '#3f6ec0', '#7aa2e6'], trim: '#d8e4ff', bust: { sw: 21 },
    fr: 'gg8777777777', back: (L, c) => L.r(15, 26, 18, 10, c),
    pre: b => hilt(b, 37, 38, 43, 21, { g: 5, gw: 3 }),
    F: { eye: 'n', iris: '#3a3040', brow: { th: 2, tilt: 0.6 }, mouth: { n: 'smirk', joy: 'grin', ang: 'grit' } },
    skinX: (b, m, sk) => { b.p(17, 31, sk.S); b.p(30, 31, sk.S); },
    post: b => {
      b.add(L => { L.r(15, 2, 18, 8, '#3f6ec0'); L.r(14, 9, 20, 2, '#3f6ec0'); });
      b.hl(15, 32, 8, '#263f7a'); b.r(22, 4, 4, 3, '#d8e4ff'); b.r(23, 5, 2, 1, '#5fd3b0');
      b.r(43, 17, 2, 4, '#3f6ec0'); b.p(44, 21, '#3f6ec0');
    },
  },
  // 楚天阔：白衣金纹、披肩长发、高冠、目光笔直
  tian: {
    skin: '#f6d8bc', shape: 'oval', robe: ['#a8a4bc', '#eeeaf4', '#ffffff'], trim: '#e8b84a', bust: { inner: '#d8d4e4' },
    fr: 'zz9876554445', back: (L, c) => L.r(9, 13, 30, 35, c),
    hairX: (L, c) => { L.e(24, 4, 3, 3.5, c); L.r(10, 16, 2, 32, c); L.r(36, 16, 2, 32, c); },
    F: { eye: 'm', iris: '#4a5a8a', brow: { len: 6, in: 1 }, mouth: { n: 'flat', joy: 'smile', ang: 'frown', sad: 'flat' } },
    post: b => { b.add(L => { L.r(22, 0, 4, 6, GOLD); L.hl(18, 29, 3, GOLD); }); b.mir(T => { T.hl(15, 17, 44, '#e8b84a'); T.p(16, 43, '#e8b84a'); T.p(16, 45, '#e8b84a'); T.p(14, 46, '#e8b84a'); }); },
  },
  // 血无涯：暗红袍立领、一对短角、尖牙笑
  xue: {
    skin: '#ecc6b6', hair: '#4a1420', shape: 'sharp', robe: ['#3e0a14', '#7a1a26', '#b03a40'], trim: '#e8b04a', bust: { inner: '#2a0c12', sw: 20 },
    fr: 'ea7544456789',
    back: (L, c) => { L.r(12, 12, 24, 22, c); L.mir(T => { T.l(12, 20, 7, 17, c, 2); T.l(12, 26, 6, 26, c, 2); T.l(13, 31, 8, 35, c, 2); }); },
    mid: b => b.add(L => L.mir(T => { for (let y = 28; y <= 41; y++) T.hl(9 + (y < 31 ? 1 : 0), 11 + Math.round((y - 28) * 0.55), y, '#7a1a26'); })),
    F: { eye: 'x', iris: '#e8303a', brow: { tilt: 0.6 }, mouth: { n: 'fang', joy: 'fangO', ang: 'grit', shock: 'o', sad: 'flat' } },
    post: b => {
      const H = tone('#e4d6b8', '#9a7a6a', '#fff8e0');
      b.add(L => L.mir(T => { T.r(15, 9, 3, 3, H); T.r(14, 6, 3, 3, H); T.r(13, 3, 2, 3, H); T.p(12, 2, H); T.p(12, 1, H); }));
      b.mir(T => { T.p(12, 1, '#8a1e2e'); T.p(12, 2, '#8a1e2e'); T.p(13, 3, '#8a1e2e'); for (let y = 29; y <= 41; y++) T.p(11 + Math.round((y - 28) * 0.55), y, '#e8b04a'); });
    },
  },
  // 云无极：银发莲冠、淡蓝袍云肩、闭着眼
  yun: {
    skin: '#fae4d6', hair: '#ccd6ee', shape: 'oval', robe: ['#4a74b8', '#86b4ea', '#cfe6ff'], trim: '#ffffff',
    fr: 'zz9865444445', back: (L, c) => { L.e(24, 22, 14, 16, c); L.sy(24, 'eeeeffffffgggggggggggggg', c); },
    pre: b => b.add(L => L.mir(T => { T.l(5, 47, 3, 36, '#8fc8f0'); T.l(3, 35, 5, 27, '#8fc8f0'); T.l(6, 26, 8, 24, '#8fc8f0'); }), { flat: 1 }),
    mid: b => b.add(L => L.mir(T => { T.e(13, 42, 5, 3, WHITE); T.e(20, 44, 4, 3, WHITE); })),
    F: { eye: 'c', iris: '#6ab8f0', lash: '#5a6488', brow: { c: '#9aa8c8' }, mouth: { n: 'line', joy: 'smile', ang: 'flat', shock: 'o', sad: 'line' } },
    post: b => {
      const C = tone('#8fc8f0', '#4a7ab8', '#e8f8ff');
      b.add(L => { L.sy(0, '1122221', C); L.mir(T => { T.l(19, 6, 16, 2, C, 2); T.p(16, 1, C); }); L.hl(19, 28, 7, C); });
      b.r(23, 16, 2, 3, '#4aa8ff');
    },
  },
  // 苏青瑶：杏色衣、药篓、垂眼笑、侧辫
  su: {
    skin: '#f8d8bc', hair: '#6a4630', shape: 'round', robe: ['#b8743e', '#f0b070', '#ffdca8'], trim: '#fff4dc',
    fr: 'kkba9a99a9a9', back: (L, c) => L.r(13, 14, 22, 20, c), hairX: (L, c) => L.e(30, 5, 4, 3.5, c),
    pre: suBasket, mid: suStrap,
    F: { eye: 'd', fem: 1, iris: '#7a5a3a', blush: 1, mouth: { n: 'smile', joy: 'open', ang: 'pout', shock: 'o', sad: 'frown' } },
    post: (b, m, c) => {
      b.add(L => { for (let k = 0; k < 6; k++) L.e(10.5 - (k % 2) * 1 - k * 0.2, 28 + k * 3.2, 2.6, 2.2, c); });
      b.hl(8, 11, 43, '#d8404a'); b.l(27, 3, 35, 7, '#8a5c36'); b.r(13, 16, 3, 1, '#f6f2fa'); b.r(14, 15, 1, 3, '#f6f2fa'); b.p(14, 16, '#f4c542');
    },
  },
  su2: {
    skin: '#f6d6ba', hair: '#6a4630', shape: 'oval', robe: ['#b8743e', '#f0b070', '#ffdca8'], trim: '#fff4dc',
    fr: 'jkcba9876656', back: (L, c) => L.r(15, 24, 18, 12, c), hairX: (L, c) => L.e(24, 3.5, 4, 3.2, c),
    pre: suBasket, mid: suStrap,
    F: { eye: 'd', iris: '#7a5a3a', mouth: { n: 'smile', joy: 'open', ang: 'flat', shock: 'o', sad: 'frown' } },
    post: b => { b.r(21, 6, 6, 2, '#f0b070'); b.l(27, 7, 32, 9, '#f0b070'); b.l(27, 8, 31, 12, '#b8743e'); },
  },
  // 夜璃：紫黑衣、红眼尾、单边耳坠、高侧马尾
  ye: {
    skin: '#f6dcd0', hair: '#34204a', shape: 'sharp', robe: ['#1e1430', '#3e2a5e', '#6a4a94'], trim: '#d8507a', bust: { inner: '#1e1430' },
    fr: yeFr, cap: { full: 1 },
    back: (L, c) => { L.r(12, 13, 24, 20, c); L.e(35, 6, 5, 4, c); L.l(38, 8, 41, 20, c, 4); L.l(41, 20, 40, 34, c, 3); L.l(40, 34, 42, 41, c, 2); },
    F: { eye: 'x', fem: 1, iris: '#a050c8', tail: '#e03a4a', brow: { y: 21 }, lip: '#d8405a', mouth: { n: 'smirk', joy: 'open', ang: 'frown', shock: 'o', sad: 'pout' } },
    post: b => { yeRing(b); b.r(33, 7, 2, 3, '#d8404a'); },
  },
  ye2: {
    skin: '#f4d8c8', hair: '#34204a', shape: 'sharp', robe: ['#1e1430', '#3e2a5e', '#6a4a94'], trim: '#d8507a', bust: { inner: '#8a1e2e', sw: 20 },
    fr: yeFr, cap: { full: 1 },
    back: (L, c) => { L.r(12, 13, 24, 18, c); L.l(26, 3, 36, 7, c, 3); L.l(37, 8, 39, 30, c, 3); L.l(39, 30, 38, 37, c, 2); },
    hairX: (L, c) => L.e(24, 3.5, 3.5, 3.5, c),
    F: { eye: 'x', iris: '#a050c8', tail: '#e03a4a', brow: { y: 21, th: 1 }, mouth: { n: 'smirk', joy: 'grin', ang: 'frown', shock: 'o', sad: 'flat' } },
    post: b => { yeRing(b); b.r(21, 6, 6, 2, '#d8404a'); },
  },
  // 楚狂：灰衣、乱发胡茬、额带、背三把剑
  chu: {
    skin: '#e6b48a', hair: '#33303a', shape: 'oval', robe: ['#44444e', '#72728a', '#a4a4b8'], trim: '#cfcfe0', bust: { sw: 21 },
    fr: 'fgb9a8b89a79',
    back: (L, c) => { L.r(12, 12, 24, 22, c); L.l(13, 11, 9, 9, c, 2); L.l(34, 12, 38, 10, c, 2); L.l(35, 28, 38, 32, c, 2); L.l(12, 28, 9, 31, c, 2); },
    hairX: (L, c) => { L.l(17, 7, 14, 3, c, 2); L.l(27, 6, 30, 2, c, 2); },
    pre: b => { hilt(b, 11, 38, 5, 20, { g: 6 }); hilt(b, 36, 38, 40, 19, { g: 6 }); hilt(b, 40, 41, 46, 28, { g: 6 }); },
    F: { eye: 'm', iris: '#8a5a2a', brow: { th: 2 }, mouth: { n: 'grin', joy: 'open', ang: 'grit', shock: 'o', sad: 'flat' } },
    skinX: (b, m, sk) => { for (let y = 31; y <= 34; y++) for (let x = 15; x <= 32; x++) if ((x + y) % 2 === 0 && (x * 7 + y * 3) % 5 < 3 && b.at(x, y) === sk.s && (y > 33 || x < 20 || x > 27)) b.p(x, y, sk.S); },
    post: b => { const C = tone('#b04a3a', '#6a2a2a', '#e07a5a'); b.add(L => { L.r(13, 15, 22, 2, C); L.l(35, 16, 41, 19, C, 2); L.l(35, 17, 40, 23, C); }); },
  },
  // 葛老：皱纹、酒糟鼻、歪戴的丹师帽、酒葫芦
  ge: {
    skin: '#eab896', hair: '#e8e6ee', shape: 'wide', robe: ['#54402c', '#86694a', '#b8986c'], trim: '#d8c090', bust: { sw: 20, inner: '#c8b890' }, noGloss: 1,
    hairX: (L, c) => L.mir(T => { T.e(11.5, 22, 3, 5, c); T.p(8, 20, c); T.p(8, 24, c); T.p(9, 27, c); }),
    F: { eye: 'o', iris: '#4a3a3a', brow: { c: '#e8e6ee', th: 2, len: 6, y: 21, tilt: -0.5 }, nose: 0, blush: 1, my: 32, mouth: { n: 'smile', joy: 'open', ang: 'frown', shock: 'o', sad: 'flat' } },
    skinX: (b, m, sk) => {
      b.hl(19, 23, 17, sk.S); b.hl(23, 28, 19, sk.S);
      b.mir(T => { T.p(14, 27, sk.S); T.p(13, 28, sk.S); T.l(19, 29, 18, 31, sk.S); });
      b.r(22, 27, 4, 3, '#e0705a'); b.p(22, 27, '#f2a08a'); b.p(25, 29, '#b84a48'); b.p(21, 28, '#e0705a'); b.p(26, 28, '#e0705a');
    },
    post: (b, m, W) => {
      b.add(L => { L.mir(T => { T.hl(19, 22, 30, W); T.p(18, 31, W); }); L.sy(34, '344321', W); });
      const C = tone('#8a3c38', '#52202a', '#c06a5c');
      b.add(L => { for (let k = 0; k <= 12; k++) L.hl(Math.round(13 + k * 0.6), Math.round(34 + k * 0.45), 15 - k, C); L.e(36, 3.5, 4, 2.5, C); });
      b.hl(13, 34, 15, '#d8c090'); b.hl(13, 34, 14, '#52202a');
      b.r(22, 8, 4, 3, '#f4c542'); b.p(22, 11, '#f4c542'); b.p(25, 11, '#f4c542'); b.hl(23, 24, 7, '#f4c542'); b.r(30, 6, 3, 3, '#c06a5c'); b.p(31, 7, '#52202a');
      const G = tone('#d89a4a', '#8a5a2a', '#f8d08a');
      b.add(L => { L.e(7, 42, 4.5, 4.5, G); L.e(7, 35.5, 3, 2.5, G); L.r(6, 31, 2, 2, '#8a5a2a'); });
      b.hl(4, 9, 38, '#d8404a');
    },
  },
  // 白小九：白发狐耳、藏不住的尾巴、毛领铃铛
  bai: {
    skin: '#fbe2d2', hair: '#f4f2fa', shape: 'round', robe: ['#a8323e', '#e05a64', '#ff9a9a'], trim: '#fff0d0',
    fr: 'kjbabaab9aba', back: (L, c) => { L.r(11, 13, 26, 20, c); L.e(12, 30, 3, 4, c); L.e(36, 30, 3, 4, c); },
    hairX: (L, c) => { L.mir(T => { for (let y = 0; y <= 9; y++) T.hl(11 - Math.round(y * 0.25), 11 + Math.round(y * 0.8), y, c); }); L.l(24, 6, 26, 2, c); },
    pre: (b, m, c) => b.add(L => { L.e(41, 36, 5.5, 10, c); L.e(40.5, 25, 4, 5, c); L.e(38.5, 20, 2.5, 3, c); }),
    mid: b => b.add(L => { for (let i = 0; i < 5; i++) L.e(15 + i * 4.5, 40, 3.2, 2.6, WHITE); }),
    F: { eye: 'f', fem: 1, iris: '#f0a020', blush: 1, brow: { c: '#b4b0cc', len: 4 }, mouth: { n: 'cat', joy: 'open', ang: 'pout', shock: 'o', sad: 'frown' } },
    post: (b, m) => {
      b.mir(T => { for (let y = 3; y <= 8; y++) T.hl(11, 11 + Math.round((y - 3) * 0.6), y, '#f7a3bd'); });
      b.r(23, 42, 2, 2, '#f4c542'); b.r(23, 44, 2, 1, '#a8742a'); b.p(39, 19, '#f7a3bd'); b.p(38, 18, '#f7a3bd');
      if (m === 'n' || m === 'joy') b.p(26, 32, '#f6f2fa');
    },
  },
  // 墨无痕：黑衣斗笠、遮半脸的面巾、墨色剑穗
  mo: {
    skin: '#e8c8a8', hair: '#1e1a26', shape: 'oval', robe: ['#17131f', '#2e2838', '#4a4157'], trim: '#6a6088', bust: { inner: '#17131f' }, noGloss: 1,
    fr: 'kkb999999999', back: (L, c) => L.r(14, 24, 20, 14, c),
    pre: b => {
      hilt(b, 11, 38, 5, 23, { grip: '#2e2838', guard: STEEL, pommel: STEEL });
      b.r(4, 25, 1, 3, '#6a6088'); b.r(3, 28, 3, 2, '#5fd3b0'); b.add(L => L.r(3, 30, 3, 8, '#2e2838')); b.p(4, 38, '#2e2838'); b.p(3, 32, '#4a4157'); b.p(3, 35, '#4a4157');
    },
    F: { eye: 'n', iris: '#8a9ab8', nose: 0, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'none', sad: 'none' } },
    skinX: b => {
      const M = tone('#3a3548', '#221e2e', '#5c5674');
      b.add(L => L.sy(28, 'bbaa998754', M));
      b.hl(14, 33, 28, '#5c5674'); b.l(19, 31, 22, 34, '#221e2e'); b.l(29, 31, 26, 35, '#221e2e'); b.p(24, 30, '#5c5674');
    },
    post: b => {
      const H = tone('#4c465c', '#2a2636', '#7c7694');
      b.add(L => { for (let y = 1; y <= 16; y++) { const w = Math.round(2 + (y - 1) * 1.4); L.hl(24 - w, 23 + w, y, H); } }, { sep: 1, cast: [0, 2] });
      for (const k of [-15, -8, 0, 8, 15]) b.l(24 + (k > 0 ? -1 : 0), 3, 24 + k, 15, '#2a2636'); b.r(23, 0, 2, 2, '#7c7694');
    },
  },
  // 凌虚子：白眉、背巨剑、剑簪
  jian: {
    skin: '#eac4a0', hair: '#eeeef6', shape: 'long', robe: ['#24487e', '#3f7ed0', '#7ab4f4'], trim: '#eef6ff', bust: { sw: 20 },
    fr: 'f8765544444', back: (L, c) => L.r(14, 14, 20, 24, c), hairX: (L, c) => L.e(24, 4.5, 3.5, 3, c),
    pre: b => b.add(L => { L.l(35, 28, 29, 41, STEEL, 6); L.l(38, 22, 43, 6, WOOD, 3); L.l(32, 20, 44, 26, GOLD, 3); L.r(43, 2, 4, 4, GOLD); }),
    F: { eye: 'n', iris: '#3a5a8a', brow: { c: '#eeeef6', th: 2, len: 6, tilt: 0.8, y: 22 }, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'o', sad: 'none' } },
    skinX: (b, m, sk) => { b.hl(21, 26, 18, sk.S); b.mir(T => T.l(18, 29, 17, 31, sk.S)); },
    post: (b, m, W) => {
      b.add(L => { L.mir(T => T.l(23, 31, 19, 32, W, 2)); L.sy(34, '2222211', W); });
      b.add(L => L.r(23, 0, 2, 8, STEEL)); b.hl(21, 26, 6, '#3f7ed0');
    },
  },
  // 丹云婆婆：笑眯眯、圆髻横簪、耳坠
  dan: {
    skin: '#f2c8a4', hair: '#d6d2dc', shape: 'wide', robe: ['#a04424', '#e8743c', '#ffa870'], trim: '#ffe8c0', bust: { sw: 20 },
    fr: 'gf9876555555', back: (L, c) => L.r(13, 14, 22, 16, c), hairX: (L, c) => L.e(24, 4, 6.5, 4.5, c),
    F: { eye: 'o', fem: 1, iris: '#5a3a2a', blush: 1, brow: { c: '#a8a4b8', y: 21 }, my: 32, eyes: { n: ARC, joy: ARC, ang: ['......', 'LLLLL.', '.wIIw.'], sad: ['......', '......', 'LLLLL.', '..ii..'] }, mouth: { n: 'smile', joy: 'open', ang: 'flat', shock: 'o', sad: 'frown' } },
    skinX: (b, m, sk) => { b.hl(20, 27, 18, sk.S); b.mir(T => { T.p(14, 26, sk.S); T.p(13, 27, sk.S); T.l(18, 30, 17, 32, sk.S); }); },
    post: b => {
      b.add(L => L.r(12, 3, 24, 2, WOOD)); b.r(11, 3, 2, 2, '#f4c542'); b.r(35, 3, 2, 2, '#f4c542');
      b.r(17, 5, 3, 3, '#d8404a'); b.r(18, 4, 1, 5, '#d8404a'); b.r(16, 6, 5, 1, '#d8404a'); b.p(18, 6, '#f4c542');
      b.mir(T => { T.p(11, 29, '#f4c542'); T.r(11, 30, 1, 3, '#5fd3b0'); });
    },
  },
  // 玄微子：高冠、三绺长须、肩上搭着拂尘
  dao: {
    skin: '#f0cca8', hair: '#2a2630', shape: 'long', robe: ['#54288a', '#8a4ec8', '#c27dff'], trim: '#f0e0ff',
    fr: 'f8765544444', back: (L, c) => L.r(14, 14, 20, 22, c),
    F: { eye: 'n', iris: '#5a3a7a', brow: { y: 21, tilt: -0.3 }, eyes: { n: ['......', '......', 'LLLLL.', '..Iw..'] }, mouth: { n: 'smile', joy: 'smile', ang: 'flat', shock: 'o', sad: 'flat' } },
    post: (b, m, c) => {
      const H = tone('#3e2c62', '#1e1430', '#6e5aa0');
      b.add(L => { L.r(19, 0, 10, 9, H); L.r(18, 8, 12, 2, H); });
      b.hl(18, 29, 8, '#f4c542'); b.hl(14, 33, 5, '#f4c542'); b.r(23, 2, 2, 3, '#5fd3b0');
      b.mir(T => { T.l(22, 31, 20, 32, c); T.l(19, 33, 19, 37, c); }); b.r(23, 35, 2, 8, c); b.p(23, 43, c);
      b.add(L => L.l(8, 47, 6, 27, WOOD, 2)); b.r(5, 25, 4, 2, '#f4c542');
      b.add(L => { L.e(6, 22.5, 4, 3, WHITE); L.l(2, 24, 1, 38, WHITE, 3); L.r(1, 40, 2, 3, WHITE); });
    },
  },
};

// 残魂：整体略透，下缘抖动着散成烟
function ghost(src) {
  const c = mk(48, 48), g = c.getContext('2d');
  g.globalAlpha = 0.93; g.drawImage(src, 0, 0); g.globalAlpha = 1;
  g.globalCompositeOperation = 'destination-out';
  for (let y = 40; y < 48; y++) for (let x = 0; x < 48; x++) {
    const lv = (y - 40) * 2 + Math.abs(x - 23.5) * 0.28 + Math.sin(x * 0.9 + y * 0.5) * 2.5;
    if (BAYER[(x & 3) + (y & 3) * 4] < lv) g.fillRect(x, y, 1, 1);
  }
  return c;
}
const P_ALIAS = { tiankuo: 'tian', 'rival:chu': 'tian', chutiankuo: 'tian', lingxu: 'jian', danyun: 'dan', xuanwei: 'dao', xuanxiao: 'elder' };
const MOODS = ['n', 'joy', 'ang', 'shock', 'sad'];
// 有名人物半身像 48×48。id：elder mu zhao tian xue yun su ye chu ge bai mo jian dan dao；
// alt 为真时取“主角为女”的版本（慕容轩 / 苏景行 / 夜无殇），与 L.npcName 的规则一致
ART.portrait = function (id, mood, alt) {
  id = P_ALIAS[id] || id; if (alt && PEOPLE[id + '2']) id += '2';
  if (!MOODS.includes(mood)) mood = 'n';
  const spec = PEOPLE[id]; if (!spec) return null;
  return cached('pt|' + id + '|' + mood, () => { const c = person(spec, mood).cv({ max: 15 }); return spec.fx === 'ghost' ? ghost(c) : c; });
};
ART.portraitIds = () => Object.keys(PEOPLE);
ART.hasPortrait = id => !!PEOPLE[P_ALIAS[id] || id];
// 主角半身像：look = {hair, skin, f}，realm 0～9
ART.portraitMe = function (look, realm, mood) {
  if (!MOODS.includes(mood)) mood = 'n'; realm = Math.max(0, Math.min(9, realm | 0));
  return cached(['ptme', look.hair, look.skin, look.f ? 1 : 0, realm, mood].join('|'), () => person(meSpec(look, realm), mood).cv({ max: 15 }));
};

// ---------- 图标 16×16（画在 14×14 内，自动描边；底栏五个为 24×24） ----------
const IPAL = {
  K: INK, w: '#ffffff', W: '#c8d0e8', c: '#7fe0f0', C: '#3fa8c8', d: '#1f6e8a', g: '#62d26f', G: '#2f8e4b', l: '#b4f08a',
  y: '#f4c542', Y: '#a8742a', h: '#fff2a8', r: '#d8404a', R: '#8a1e2e', p: '#ff9a8a', j: '#4ccb9f', J: '#2a8a7a',
  b: '#4aa8ff', B: '#24579a', v: '#c27dff', V: '#6a3aa8', s: '#928ea8', S: '#55506e', t: '#c8c4d8',
  o: '#b98a4c', O: '#7a5230', n: '#efe3c4', N: '#c8b48c', e: '#f2c9a0', E: '#d09a7a', k: '#2c2238',
};
const HEART = '..rrr...rrr/.rpprr.rrrrR/rpprrrrrrrrRR/rprrrrrrrrrRR/rrrrrrrrrrrRR/rrrrrrrrrrRRR/.rrrrrrrrrRR/..rrrrrrrRR/...rrrrrRR/....rrrRR/.....rRR/......R';
const PILL = '....aaaa/..aahhaaaa/.aahhaaaaaA/.ahhaaaaaaA/aahaaaaaaaAA/aaaaaaaaaaAA/aaaaaaaaaAAA/aaaaaaaaaAAA/.aaaaaaaAAA/.aaAAAAAAAA/..AAAAAAAA/....AAAA';
const ICONS = {
  stone: '.....ww/....wccC/...wcccCC/...wccCCCd/..wcccCCCd.w/..wcccCCCdwcC/..wccCCCCdwcCd/..wccCCCCd.cCd/..wccCCCddcCCd/...ccCCCd.cCCd/...cCCCdd..Cd/....CCdd/.....dd',
  herb: '......l/.....lgl..l/.....lgG.lgl/..l..lgG.lgG/.lgl.lgGlgG/.lggGlgGgG/..lgGggGG/...gGggG..p/....GgG..prp/.....gG...p/.....gG/....GgGG/...GG..GG',
  treasure: '..........w/...rrrrr.www/..rpprrrR.w/.rpprryrRR/.rprryyrRR/.rrrrrrrRR/..RRnnRRR/....nnN/....nnN..l/...nnN..lg/...nnNN.gG/..ooOOOoo',
  insight: '......w/......w/.....wjw/.....wjw/..w.wjjjw.w/wwwjjjwjjjwww/..w.wjjjw.w/.....wjw/.....wjw/......w/......w',
  contrib: '....yyyyy/...yhhhhyY/...yhyyyyY/...yhRRyyY/...yhRRyyY/...yhRRyyY/...yhyyyyY/...yyyyyyY/....YYYYY/.....rr/.....rr/....rRrR/....r.rR',
  life: '..oooooooo/..OwwwwwwO/...WwwwwW/...WyyyyW/....WyyW/.....Wy/.....yW/....W.yW/...W..y.W/...W.yyyW/..OyyyyyyO/..oooooooo',
  atk: '...........ww/..........wpp/.........wpp/........wpp/.......wpp/......wpp/..y..wpp/..yywpp/...yyp/..oyyy/.oO..yy/oO',
  cult: '......j/.....jj/.....jJj..j/..j.jjJj.jj/..jjjwjJjjJ/..jJjwwjJjJ/.jjJwwwjJJj/.jJjwwwwjJj/.jJjwwwwjJJ/.jJJjwwjJJJ/..JJJjjJJJ/...JJJJJJ',
  cave: '......yy/....rrrrrr/..rrRRRRRRrr/rrRRRRRRRRRRrr/...nnnnnnnn/...nNOOOONn/...nNOyyONn/...nNOyyONn/...nNOOOONn/..ssssssssss/.sSSSSSSSSSSs',
  array: '.....cccc/...cc....cc/..c...jj...c/.c...j..j...c/.c..j.ww.j..c/c..j.wccw.j..c/c..j.wccw.j..c/.c..j.ww.j..c/.c...j..j...c/..c...jj...c/...cc....cc/.....cccc',
  field: '/..l....l....l/.lgl..lgl..lgl/..g....g....g/OOoOOOOoOOOOoO/oooooooooooooo/..l....l....l/.lgl..lgl..lgl/..g....g....g/OOoOOOOoOOOOoO/oooooooooooooo',
  furnace: '.....yy/....yYYy/..ssssssss/.sttttttSs/.StwttttSS/ySttttttSSy/.SttrrttSS/.StryyrtSS/.SSttttSS/..SSSSSS/..S.rr.S/.SS.ryr.SS',
  retreat: '..ssssssssss/.stttttttttSs/.stSSSKSSStSs/.stSttKttStSs/.stSttKttStSs/.stSyyyyyStSs/.stSyrryyStSs/.stSyyyyyStSs/.stSttKttStSs/.stSttKttStSs/.stSttKttStSs/.SSSSSSSSSSSS',
  slay: '.r.........ww/.rr.......wW/..rr.....wW/..rrr...wW/...rrr.wW/....rrwW/.....wWr/....wW.rr/.y.wW...r/.yyW/..yy/.o.yy',
  seek: '..........w/.........www/..ooooooo.w/.oyyyyyyyo/.oyOOOOOyo/.oyyyyyyyo/.OOOOhhOOO/.oyyyhhyyo/.oyyyyyyyo/.oyyyyyyyo/.OOOOOOOOO',
  gather: '....l..l/...lgl.lg/...lgGlgG..p/....gGgG..prp/..oooooooo.p/.oOoOoOoOoo/.OoOoOoOoOo/.oOoOoOoOoo/.OoOoOoOoOo/..OoOoOoOo/..oooooooo',
  best: '....yyyyyy/..yyy....yyy/.yy........yy/.y...yyyy...y/yy..yy..yy..yy/y...y....y...y/y...y....y...y/yy..yy..yy..yy/.y...yyyy...y/.yy........yy/..yyy....yyy/....yyyyyy',
  ok: '....gggggg/..gggggggggg/.ggg......ggg/.gg........gg/gg..........gg/gg..........gg/gg..........gg/gg..........gg/.gg........gg/.ggg......ggg/..gggggggggg/....gggggg',
  bad: '......bb/......bb/.....bbbb/.....b..b/....bb..bb/....b....b/...bb....bb/...b......b/..bb......bb/..b........b/.bbbbbbbbbbbb/.bbbbbbbbbbbb',
  unk: '...vvvvvv/..vvvvvvvv/.vvv....vvv/.vv......vv/.........vv/........vvv/......vvvv/.....vvv/.....vv/....../.....vv/.....vv',
  lock: '....sssss/...st...Ss/...st...Ss/...st...Ss/.yyyyyyyyy/.yhhhhhhyY/.yhyKKyyyY/.yhyKKyyyY/.yhyyKyyyY/.yhyyyyyyY/.yYYYYYYYY',
  badge: '....rrrrr/..rrrrrrrrr/.rrrrwwrrrrR/.rrrrwwrrrrR/rrrrrwwrrrrRR/rrrrrwwrrrrRR/rrrrrwwrrrrRR/rrrrrrrrrrrRR/.rrrrwwrrrRR/.rrrrwwrrRRR/..rrRRRRRRR/....RRRRR',
  up: '......gg/.....gggg/....gggggg/...gggggggg/..gggggggggg/.gggggggggggg/.GGGggggGGGG/....ggggG/....ggggG/....ggggG/....ggggG/....GGGGG',
  hurt: '.ww........ww/wwWw......wwWw/.wwWw....wwWw/..wwWw..wwWw/...wwWwwwWw/....wwrrWw/....wwrrWw/...wwWwwwWw/..wwWw..wwWw/.wwWw....wwWw/wwWw......wwWw/.WW........WW',
  buff: '.....oo/.....rr/....rrrr/...rprrrR/...rprrrR/....rrrR/....yyyy/...rrrrrR/..rprrrrrR/..rprrrrrR/..rrrrrrRR/...rrrrRR/....RRRR',
  buddy: '/...kkk/..kkkkk..kkk/..keeek.kkkkk/..keeek.keeek/...eee..keeek/..bbbbb..eee/.bbbbbbbjjjjj/.bbbbbbjjjjjjj/.bbbbbbjjjjjjj/.BBBBBBJJJJJJJ',
  heart: HEART,
  heart0: HEART.replace(/r/g, 'S').replace(/R/g, 'k').replace(/p/g, 's'),
  gear: '.....ssss/..ss.sttS.ss/.sttsttttSttS/.sStttttttSS/..sttSSSStS/sstS....SttSs/sttS....SttSS/sStS....SttSS/..sttttttSS/.sStttttttSS/.sSSsttSSsSS/..SS.sSSS.SS/.....SSSS',
  pause: '/..nnnn..nnnn/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..nnnN..nnnN/..NNNN..NNNN',
  play: '/...nn/...nnnn/...nnnnnn/...nnnnnnnn/...nnnnnnnnnn/...nnnnnnnnnN/...nnnnnnnNN/...nnnnnNN/...nnnNN/...nNN/...N',
  close: '/..nn......nn/..nnn....nnN/...nnn..nnN/....nnnnnN/.....nnnN/.....nnnn/....nnNnnn/...nnN..nnn/..nnN....nnn/..nN......nN',
  egg: '.....nnnn/....nnnnnn/...nnhnnnnN/...nhnnjnnN/..nnhnnjjnnN/..nnnnnnnnnN/..njjnnnnnnN/..nnjnnnnjNN/..nnnnnnjjNN/...nnnnnnNN/....NNNNNN/.....NNNN',
  daoguo: '.......GG/......Gg.l/.....yG.lgl/...yyyGyy.g/..yhhyyyyyY/.yhhyyyyyyYY/.yhyyyyyyyYY/.yyyyyyyyyYY/.yyyyyyyyYYY/..yyyyyyYYY/...yYYYYYY/.....YYY',
  rank: '.yyyyyyyyyyy/.yhhyyyyyyY/yyhyyyyyyyYyy/y.yhyyyyyyY.y/y.yhyyyyyyY.y/.yyyyyyyyYYy/...yyyyyYY/....yyyYY/.....yyY/.....yyY/...yyyyyYY/...YYYYYYY',
  xp: '......j/.....jjj/....jjwjj/...jjwwjjJ/..jjwwjjjJJ/.jjwjjjjjJJJ/..jjjjjjJJJ/...jjjjJJJ/....jjJJJ/.....jJJ/......J',
  gift: '....rr..rr/...r..rr..r/....rrrrrr/..yyyyrryyyy/..yhhyrryyyY/..YYYYrrYYYY/...yhyrryyY/...yhyrryyY/...yhyrryyY/...yyyrryyY/...YYYRRYYY',
  time: '....oooooo/..ooonnnnooo/.oonnnOnnnnoo/.onnnnOnnnnno/oonnnnOnnnnnoo/onnnnnOnnnnnnO/onnnnnOOOOnnnO/oonnnnnnnnnnOO/.onnnnnnnnnnO/.oonnnnnnnnOO/..OOOnnnnOOO/....OOOOOO',
};
// 六种丹药：同一枚丹丸换色，再点上各自的记号
const PILLS = {
  peiyuan: ['#62d26f', '#2f8e4b', '#d4ffb4', '.../....../....../....ww/...www.w/..wwwww/..wwww/...ww.w/......w'],
  pojing: ['#c27dff', '#6a3aa8', '#f0dcff', '/....../......ww/.....ww/....ww/...wwwww/.....ww/....ww/...ww'],
  juling: ['#4aa8ff', '#24579a', '#d4ecff', '/....../....www/...w...w/..w..w..w/..w.w.w.w/..w..ww.w/...w....w/....wwww'],
  yanshou: ['#ff8a9a', '#b83a5a', '#ffe0e4', '/....../...ww.ww/..wwwwwww/..wwwwwww/...wwwww/....www/.....w'],
  xisui: ['#e8f4f8', '#8aa8c0', '#ffffff', '/....../.....b/.....b/....bbb/...bbbbb/...bbbbb/....bbb'],
  jiuzhuan: ['#f4c542', '#a8742a', '#fff6c8', '/....../....www/...w...w/..w..r..w/..w.rrr.w/..w..r..w/...w...w/....www'],
};
function iconBuf(rows, pal) { const b = new Buf(16, 16); b.m(1, 1, rows.split('/'), pal || IPAL); return b; }
// 底栏图标 24×24
const NAV = {
  exp: b => { // 历练：出鞘的剑与远山
    b.add(L => { L.sy(13, '12345689ab', '#5a82aa', 9); L.sy(15, '1234567a', '#7ca2c8', 17); }); b.p(8, 13, '#ffffff'); b.r(7, 14, 2, 1, '#ffffff'); b.p(16, 15, '#ffffff');
    b.add(L => { L.l(20, 2, 9, 13, STEEL, 3); L.r(20, 1, 2, 2, STEEL); }); b.l(20, 2, 10, 12, '#ffffff');
    b.add(L => { L.l(6, 11, 11, 16, GOLD, 2); L.l(7, 15, 4, 18, WOOD, 2); L.r(2, 19, 2, 2, GOLD); });
  },
  home: b => { // 洞府：飞檐小楼
    b.add(L => { L.r(5, 11, 14, 9, '#efe3c4'); L.r(3, 20, 18, 2, '#928ea8'); });
    b.r(10, 14, 4, 6, '#7a5230'); b.r(11, 15, 2, 5, '#f4c542'); b.r(6, 13, 2, 3, '#7a5230'); b.r(16, 13, 2, 3, '#7a5230'); b.hl(5, 18, 11, '#c8b48c');
    b.add(L => { L.sy(5, '24689b', RED, 12); L.r(1, 10, 2, 1, RED); L.r(21, 10, 2, 1, RED); L.p(0, 9, RED); L.p(23, 9, RED); L.r(11, 2, 2, 3, GOLD); });
  },
  sect: b => { // 宗门：山门牌坊与旗
    b.add(L => { L.r(3, 8, 3, 14, RED); L.r(18, 8, 3, 14, RED); L.r(1, 9, 22, 3, '#3f6ec0'); L.r(8, 13, 8, 2, RED); });
    b.add(L => { L.sy(4, '4abc', '#928ea8', 12); L.r(0, 7, 24, 1, '#928ea8'); L.r(11, 1, 2, 3, GOLD); });
    b.r(9, 9, 6, 3, '#f4c542'); b.r(10, 10, 4, 1, '#a8742a'); b.r(2, 21, 5, 1, '#55506e'); b.r(17, 21, 5, 1, '#55506e');
  },
  market: b => { // 坊市：灵石钱袋
    b.add(L => { L.e(12, 15, 8.5, 7, WOOD); L.r(8, 5, 8, 4, WOOD); L.r(6, 2, 3, 3, WOOD); L.r(15, 2, 3, 3, WOOD); L.r(10, 3, 4, 2, WOOD); });
    b.r(7, 8, 10, 2, '#d8404a'); b.r(11, 10, 2, 3, '#d8404a'); b.r(10, 12, 1, 2, '#d8404a'); b.r(13, 12, 1, 2, '#d8404a');
    b.add(L => L.sy(13, '12332', '#7fe0f0', 12)); b.p(11, 14, '#ffffff'); b.p(11, 15, '#ffffff'); b.p(12, 17, '#3fa8c8'); b.p(13, 16, '#3fa8c8');
  },
  me: b => { // 人物：束发的修士
    const hk = hairTone(HAIR_K), sk = skinTone('#f2c9a0');
    b.add(L => { L.sy(15, '5789aaaaa', '#4ccb9f', 12); }); b.l(9, 16, 12, 20, '#efe3c4'); b.l(14, 16, 12, 19, '#efe3c4');
    b.add(L => L.r(10, 12, 4, 4, sk.s), { noHi: 1, sep: 1 });
    b.add(L => L.sy(5, '3455555543', sk.s, 12), { noHi: 1, sep: 1 });
    b.add(L => { L.sy(3, '34566', hk, 12); L.r(6, 7, 2, 4, hk); L.r(16, 7, 2, 4, hk); L.r(8, 7, 2, 1, hk); L.r(14, 7, 2, 1, hk); L.e(12, 1.5, 2, 1.5, hk); });
    b.r(11, 3, 2, 1, '#f4c542'); b.r(9, 9, 2, 2, INK); b.r(13, 9, 2, 2, INK); b.p(9, 9, '#ffffff'); b.p(13, 9, '#ffffff'); b.r(11, 12, 2, 1, sk.M);
  },
};
// 图标：返回 16×16 画布；exp/home/sect/market/me 这五个底栏图标为 24×24；'atk8' 为小怪头顶用的 8×8 小剑
ART.icon = function (name) {
  return cached('ic|' + name, () => {
    if (NAV[name]) { const b = new Buf(24, 24); NAV[name](b); return b.cv(); }
    if (PILLS[name]) { const P = PILLS[name], b = iconBuf(PILL, { a: P[0], A: P[1], h: P[2] }); b.m(2, 1, P[3].split('/'), { w: P[2], b: '#4aa8ff', r: '#d8404a' }); return b.cv(); }
    if (name === 'atk8') return new Buf(8, 8).m(1, 1, ['....ww', '...wp', '..wp', 'y.p', '.y', 'o.y'], IPAL).cv();
    return ICONS[name] ? iconBuf(ICONS[name]).cv() : null;
  });
};
ART.iconNames = () => Object.keys(ICONS).concat(Object.keys(PILLS));
ART.navIcons = () => Object.keys(NAV);

// ---------- 印章 24×24：天甲乙丙丁、胜、败、完 ----------
const GLYPH = {
  '天': '..XXXXXXXXXX/..XXXXXXXXXX/......XX/......XX/XXXXXXXXXXXXXX/XXXXXXXXXXXXXX/......XX/.....XXXX/.....XXXX/....XX..XX/...XXX..XXX/..XXX....XXX/XXXX......XXXX/XX..........XX',
  '甲': '.XXXXXXXXXXXX/.XXXXXXXXXXXX/.XX...XX...XX/.XX...XX...XX/.XXXXXXXXXXXX/.XXXXXXXXXXXX/.XX...XX...XX/.XX...XX...XX/.XXXXXXXXXXXX/.XXXXXXXXXXXX/......XX/......XX/......XX/......XX',
  '乙': '.XXXXXXXXXXX/.XXXXXXXXXXX/.........XX/........XX/.......XX/......XX/.....XX/....XX/...XX/..XX/..XX........XX/..XX........XX/..XXXXXXXXXXXX/...XXXXXXXXXX',
  '丙': 'XXXXXXXXXXXXXX/XXXXXXXXXXXXXX/......XX/......XX/.XXXXXXXXXXXX/.XXXXXXXXXXXX/.XX...XX...XX/.XX..XXXX..XX/.XX..XXXX..XX/.XX.XX..XX.XX/.XXXX....XXXX/.XX........XX/.XX......XXXX/.XX......XXX',
  '丁': 'XXXXXXXXXXXXXX/XXXXXXXXXXXXXX/......XX/......XX/......XX/......XX/......XX/......XX/......XX/......XX/......XX/..XX..XX/..XXXXXX/...XXXX',
  '胜': '.XXXX....X/.X..X.X..X/.X..X.X..X/.XXXX.XXXXXXX/.X..X.X..X/.X..X....X/.XXXX....X/.X..X.XXXXXX/.X..X....X/.X..X....X/.X..X....X/X...X....X/X..XX.XXXXXXX',
  '败': 'XXXXX...X/X...X..X/X.X.X..XXXXXX/X.X.X.X...X/X.X.X.X...X/X.X.XX.X..X/X.X.X..X.X/X.X.X...XX/X.X.X...XX/.X.X...X..X/.X..X.X....X/X...XX......X',
  '完': '......X/......X/XXXXXXXXXXXXX/X...........X/X..XXXXXXX..X/............./.XXXXXXXXXXX/....X...X/....X...X/....X...X/...X....X...X/..X.....X...X/XX.......XXXX',
};
const STAMP_C = { '天': ['#c8323c', 1], '甲': ['#c8323c', 0], '乙': ['#c8323c', 0], '丙': ['#a8483a', 0], '丁': ['#8a6a62', 0], '胜': ['#c8323c', 1], '败': ['#55506e', 1], '完': ['#c8323c', 0] };
// 印章：rating 为 '天' '甲' '乙' '丙' '丁' '胜' '败' '完'（也接受 0～4 表示 天～丁）。天 / 胜 / 败 为阴刻（实底留白字）
ART.stamp = function (rating) {
  if (typeof rating === 'number') rating = '天甲乙丙丁'[rating];
  const S = STAMP_C[rating]; if (!S) return null;
  return cached('stamp|' + rating, () => {
    const b = new Buf(24, 24), col = S[0], thin = '胜败完'.includes(rating), rows = GLYPH[rating].split('/'), r = seeded(rating.charCodeAt(0));
    b.r(1, 0, 22, 24, col); b.r(0, 1, 24, 22, col);
    if (!S[1]) { b.r(2, 2, 20, 20, null); b.p(2, 2, col); b.p(21, 2, col); b.p(2, 21, col); b.p(21, 21, col); }
    else if (rating === '天') { b.r(2, 2, 20, 1, '#f4c542'); b.r(2, 21, 20, 1, '#f4c542'); b.r(2, 2, 1, 20, '#f4c542'); b.r(21, 2, 1, 20, '#f4c542'); }
    const ink = S[1] ? '#fff6e0' : col, oy = 5 + ((14 - rows.length) >> 1);
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === 'X') { b.p(5 + i, oy + j, ink); if (thin) b.p(6 + i, oy + j, ink); }
    // 印泥不匀：边角随机缺几粒
    for (let k = 0; k < 9; k++) { const x = Math.floor(r() * 24), y = Math.floor(r() * 24); if (x < 3 || x > 20 || y < 3 || y > 20) b.p(x, y, null); }
    return b.cv({ noOutline: 1 });
  });
};

// ---------- 界面皮肤：九宫格边框与按钮（border-image 用，角 6 像素） ----------
const FRAMES = {
  hud: { fill: '#262038', draw: b => { box(b, '#262038', '#3a3155', '#1a1528'); for (const [x, y] of [[2, 2], [17, 2], [2, 17], [17, 17]]) { b.p(x, y, '#4ccb9f'); } b.mir(T => { T.hl(2, 4, 2, '#4ccb9f'); T.r(2, 2, 1, 3, '#4ccb9f'); T.hl(2, 4, 17, '#2a8a7a'); T.r(2, 15, 1, 3, '#2a8a7a'); }); } },
  sheet: { fill: '#efe3c4', draw: b => { box(b, '#efe3c4', '#fff6dc', '#c8b48c'); ring(b, 1, '#8a5c36'); ring(b, 2, '#b98a4c'); b.mir(T => { for (const y of [3, 16]) { T.r(3, y, 2, 1, '#8a5c36'); } T.p(3, 4, '#8a5c36'); T.p(3, 15, '#8a5c36'); }); } },
  card: { fill: '#e6d8b4', draw: b => { box(b, '#e6d8b4', '#f6ecd0', '#c8b48c'); ring(b, 1, '#7a6650'); for (const [x, y] of [[1, 1], [18, 1], [1, 18], [18, 18]]) b.p(x, y, null); b.hl(2, 17, 18, '#5a4a3a'); b.hl(2, 17, 17, '#c8b48c'); for (const [x, y] of [[2, 2], [17, 2], [2, 17], [17, 17]]) b.p(x, y, '#7a6650'); } },
  btnGold: { fill: '#f4c542', ink: '#3b2b1f', draw: b => btn(b, '#f4c542', '#fff2a8', '#a8742a', '#ffe07a') },
  btnAlt: { fill: '#efe3c4', ink: '#3b2b1f', draw: b => btn(b, '#efe3c4', '#fffaf0', '#b8a47c', '#f6ecd4') },
  btnSeal: { fill: '#c8323c', ink: '#fff6e0', draw: b => btn(b, '#c8323c', '#f07a6a', '#7a1a26', '#d8484a') },
  btnOff: { fill: '#55506e', ink: '#a8a4b8', draw: b => btn(b, '#55506e', '#6e6a88', '#3a3650', '#5c5876') },
};
function ring(b, k, c) { const n = b.w - 1 - k; b.hl(k, n, k, c); b.hl(k, n, n, c); for (let y = k; y <= n; y++) { b.p(k, y, c); b.p(n, y, c); } }
function box(b, fill, hi, lo) { b.r(1, 1, 18, 18, fill); ring(b, 1, lo); b.hl(1, 18, 1, hi); b.r(1, 1, 1, 18, hi); }
function btn(b, fill, hi, lo, hi2) {
  b.r(1, 1, 18, 18, fill); b.hl(1, 18, 1, hi); b.hl(1, 18, 2, hi2); b.hl(1, 18, 17, lo); b.hl(1, 18, 18, lo); b.r(18, 2, 1, 16, lo); b.r(1, 2, 1, 15, hi);
  for (const [x, y] of [[1, 1], [18, 1], [1, 18], [18, 18]]) b.p(x, y, null);
  b.p(2, 2, hi); b.p(3, 3, '#ffffff'); b.p(17, 16, lo);
}
// 九宫格皮肤：返回 { url, slice, size, fill, ink, canvas }。kind: hud | sheet | card | btnGold | btnAlt | btnSeal | btnOff
// CSS：border: 6px solid transparent; border-image: url(...) 6 fill / (6×n/dpr)px stretch; image-rendering: pixelated
ART.frame = function (kind) {
  const F = FRAMES[kind]; if (!F) return null;
  return cached('frame|' + kind, () => {
    const b = new Buf(20, 20); F.draw(b); const c = b.cv();
    return { url: root.HD2D && root.HD2D.skinOn() ? root.HD2D.frame(c, kind, F.fill) : c.toDataURL(), slice: 6, size: 20, fill: F.fill, ink: F.ink || (kind === 'hud' ? '#efe3c4' : '#3b2b1f'), canvas: c };
  });
};
ART.frameKinds = () => Object.keys(FRAMES);

// ---------- 九宗徽记 16×16：圆牌 + 宗门色环 + 符号 ----------
const EMBLEMS = {
  kunlun: ['#8fd0ff', '#1f3a6a', '....ww/...wwww/...wwcw/..wwcccw/..wcccccw/.wccc.cccw/.ccc...ccc/ccc.....cc'],
  tianjian: ['#aeb8c8', '#1e2a4a', '....ww/....ww/....ww/....ww/....ww/....ww/.yyyyyyyy/....oo/....oo/....yy'],
  xuesha: ['#d8404a', '#2a0c12', '.r......r/.rr....rr/..r....r/..rrrrrr/.rrwrrwrr/.rrrrrrrr/..rrwwrr/...rrrr/....rr'],
  wanfa: ['#c27dff', '#22143a', '....vv/....vv/.v..vv..v/..v.vv.v/...vwwv/vvvwwwwvvv/...vwwv/..v.vv.v/.v..vv..v/....vv'],
  jingang: ['#f4c542', '#3a2a10', '....yy/...yhhy/.y.yhhy.y/yhyyyyyyhy/yhhyyyyhhy/.yhhyyhhy/..yyyyyy/.yyyyyyyy'],
  jian: ['#4aa8ff', '#102a4a', '....ww/...wwww/....bb/....bb/....bb/....bb/....bb/..bbbbbb/....ww/....ww'],
  dao: ['#c27dff', '#22143a', '...wwww/..wwwwvv/.wwwwvvvv/.wwVVwvvv/wwwVVwvvvv/wwwwvvwwvv/.wwwvvwwv/.wwwwvvvv/..wwvvvv/...vvvv'],
  dan: ['#ff8a5c', '#3a1a10', '....pp/....oo/...pppp/...pwpp/....pp/..pppppp/.pwpppppp/.pwpppppp/.pppppppp/..pppppp'],
  yushou: ['#62d26f', '#12301c', '/.gg....gg/.gg.gg.gg/....gg/..gggggg/.gggggggg/.gggggggg/..gg..gg'],
};
ART.emblem = function (id) {
  const E = EMBLEMS[id]; if (!E) return null;
  return cached('emb|' + id, () => {
    const b = new Buf(16, 16);
    b.e(8, 8, 7, 7, E[0]); b.e(8, 8, 5.6, 5.6, E[1]); b.p(4, 3, '#ffffff'); b.p(3, 4, '#ffffff');
    b.m(3, 3, E[2].split('/'), Object.assign({}, IPAL, { c: '#8fd0ff' }));
    return b.cv();
  });
};
ART.emblemIds = () => Object.keys(EMBLEMS);

// ---------- 物品图 16×16：法宝七阶（一阶一形）、功法六阶；a/A/h 为品阶色的中 / 暗 / 亮 ----------
const QCOL = ['#b8b8b8', '#62d26f', '#4aa8ff', '#c27dff', '#ffb23f', '#ff6b6b'];
const ITEM_W = [
  '..........WW/.........WwW/........WwW/.......WwW/......WwW/.....WwW/..o.WwW/..oOwW/...oO/..OoOO/.oO..O/oO', // 凡器：铁剑
  '..........hh/.........haa/........haa/.......haa/......haa/.....haA/..y.haA/..yyaA/...yy/..oyyy/.oO..y/oO', // 法器：青锋
  '...........h/..........ha/.........haA/....aa..haA/.....aahaA/......aaA/.....o.aa/....o...a/...o/..o/.o/o', // 灵器：长枪
  '....yyyyyy/..yyhhhhhhyy/.yhhaaaaaahY/.yhaaaahaaaY/.yaaaahaaaaY/.yaaahaaaaAY/.yaaaaaaaAAY/.yyaaaaaAAYY/..YYAAAAYY/....YYYY/.....yY/....yyYY', // 法宝：宝镜
  '......yy/......hh/.....haaA/....yyyyyy/.....haaA/...yyyyyyyy/....hhaaAA/..yyyyyyyyyy/...hhaaaAAA/.yyyyyyyyyyyy/..YYYYYYYYYY', // 灵宝：宝塔
  '.....ww/....wwh/....wh..h/.....yy.ha/....haaA.a/...haaaaA/...haaaaA/....yyyy/..hhaaaaAA/.hhaaaaaaAA/.haaaaaaaAA/..aaaaaAAA/...AAAAAA', // 仙器：斩仙葫芦
  '..hhh....o/.haaah..o/haaaaahoO/haaaaaaO/haaaaaoa/.haaaoOaa/..hhoO.aA/....o...A/...oO/..oO/.oO/oO', // 混沌至宝：开天斧
];
const ITEM_A = [
  '/..aaaaaaaaa/..ahhhhhhhA/..ahnnnnnaA/..ahnKKKnaA/..ahnnnnnaA/..ahnKKKnaA/..ahnnnnnaA/..ahhhhhhaA/..aAAAAAAAA/..nnnnnnnnN', // 黄阶：薄册
  '/.aaaaaaaaaa/.ahhhhhhhhAy/.ahnnnnnnaAy/.ahnKKKKnaA/.ahnnnnnnaAy/.ahnKKKKnaAy/.ahnnnnnnaA/.ahhhhhhhhAy/.aAAAAAAAAA/.nnnnnnnnnN/.NNNNNNNNNN', // 玄阶：厚册
  '.oO........oO/.aannnnnnnnaa/.aAnnnnnnnnaA/.oOnKKnKKKnoO/..nnnnnnnnn/..nnKKKnKKn/..nnnnnnnnn/..nnKKnKKKn/.oOnnnnnnnnoO/.aannnnnnnnaa/.aAnnnnnnnnaA/.oO........oO', // 地阶：卷轴
  '..y.y.y.y.y/..aaaaaaaaa/.haAhaAhaAhaA/.haAhaAhaAhaA/.haAhaAhaAhaA/.yyyyyyyyyyyy/.haAhaAhaAhaA/.haAhaAhaAhaA/.yyyyyyyyyyyy/.haAhaAhaAhaA/.haAhaAhaAhaA/..AAAAAAAAA', // 天阶：玉简
  '.....hhhh/..h.haaaah.h/.h.haaaaaah.h/...haahhaaA/h..haahhaaA..h/...haaaaaaA/.h..haaaaA..h/..h..AAAA..h/....yyyyyy/...yhhhhhhY/...YYYYYYYY', // 仙阶：光轮宝卷
  '......hh/..h..haah..h/....haaaah/.h.haahhaaA.h/...hahwwhaA/hh.hahwwhaA.hh/...haahhaaA/.h..haaaaA..h/....haaaA/..h..hAA..h/......AA', // 神阶：鸿蒙道印
];
// 物品图：kind 'w' 法宝（tier 1～7）| 'a' 功法（tier 1～6）
ART.item = function (kind, tier) {
  const list = kind === 'a' ? ITEM_A : ITEM_W; tier = Math.max(1, Math.min(list.length, tier | 0));
  return cached('item|' + kind + tier, () => {
    const q = QCOL[Math.min(5, tier - 1)], b = iconBuf(list[tier - 1], Object.assign({}, IPAL, { a: q, A: hs(q, 0.62), h: lerpC(q, '#ffffff', 0.6) }));
    if (kind !== 'a' && tier === 7) { // 混沌：彩虹色
      const rb = ['#ff6b6b', '#ffb23f', '#f4e04a', '#62d26f', '#4aa8ff', '#c27dff'];
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const c = b.at(x, y); if (c === q || c === hs(q, 0.62)) b.p(x, y, rb[(x + y) % 6 | 0]); }
    }
    return b.cv();
  });
};
ART.qualityColor = t => QCOL[Math.max(0, Math.min(5, t - 1))];

// ---------- 对决小人：六帧 idle0 idle1 windup strike hit down；48×40，面朝右，脚底锚点 (21, 39) ----------
ART.dims.fighter = { w: 48, h: 40, ax: 21, ay: 39 };
const FIGHT_FRAMES = ['idle0', 'idle1', 'windup', 'strike', 'hit', 'down'];
ART.fighterFrames = FIGHT_FRAMES;
// 小人头部的改造（在 30×35 的字符网格上改）
const FMOD = {
  long(g) { for (let y = 12; y <= 27; y++) { put(g, 7, y, 'H'); put(g, 8, y, y % 4 === 1 ? 'j' : 'h'); put(g, 22, y, 'H'); put(g, 21, y, 'h'); } },
  crown(g) { for (let y = 0; y < 3; y++) { put(g, 14, y, 'g'); put(g, 15, y, 'G'); } put(g, 13, 2, 'g'); put(g, 16, 2, 'G'); put(g, 12, 2, 'y'); put(g, 17, 2, 'G'); },
  cap(g) { for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.'; for (let y = 1; y <= 5; y++) for (let x = 9; x <= 20; x++) put(g, x, y, y === 1 ? 'q' : x > 17 ? 'R' : 'r'); for (let x = 8; x <= 21; x++) put(g, x, 6, 'D'); put(g, 14, 3, 't'); put(g, 15, 3, 't'); },
  horns(g) { for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.'; for (let x = 12; x <= 17; x++) put(g, x, 3, x < 15 ? 'H' : 'h'); for (const sx of [0, 1]) { const X = x => sx ? 29 - x : x; put(g, X(10), 4, 'O'); put(g, X(11), 4, 'O'); put(g, X(10), 3, 'o'); put(g, X(9), 3, 'O'); put(g, X(9), 2, 'o'); put(g, X(8), 1, 'o'); put(g, X(9), 1, 'o'); put(g, X(8), 0, 'O'); } },
  shut(g) { for (const x of [11, 17]) for (const y of [12, 14]) { put(g, x, y, 's'); put(g, x + 1, y, 's'); } },
  pins(g) { put(g, 14, 4, 'g'); put(g, 15, 4, 'g'); put(g, 9, 5, 'g'); put(g, 20, 5, 'g'); put(g, 21, 6, 'g'); put(g, 21, 8, 'y'); put(g, 21, 10, 'g'); },
  ears(g) { for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.'; for (const sx of [0, 1]) { const X = x => sx ? 29 - x : x; put(g, X(9), 1, 'h'); put(g, X(9), 2, 'h'); put(g, X(10), 2, 'p'); put(g, X(8), 3, 'H'); put(g, X(9), 3, 'p'); put(g, X(10), 3, 'h'); put(g, X(11), 3, 'h'); } },
  hat(g) { for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.'; for (let y = 1; y <= 8; y++) { const w = Math.round(1 + (y - 1) * 1.7); for (let x = 15 - w; x < 15 + w; x++) put(g, x, y, y === 8 ? 'k' : x < 13 ? 'K' : 'k'); } for (let y = 14; y <= 17; y++) for (let x = 9; x <= 20; x++) if ('sSmMi'.includes(g[y][x])) g[y][x] = 'k'; },
  beard(g) { for (const [x, y] of [[13, 15], [14, 15], [15, 15], [16, 15], [12, 16], [13, 16], [14, 16], [15, 16], [16, 16], [17, 16], [13, 17], [14, 17], [15, 17], [16, 17], [14, 18], [15, 18], [14, 19], [15, 19], [14, 20]]) put(g, x, y, 'u'); },
  basket(g) { for (let y = 19; y <= 25; y++) { put(g, 5, y, 'C'); put(g, 6, y, y % 2 ? 'c' : 'C'); } put(g, 5, 18, 'c'); put(g, 6, 17, 'p'); },
};
const FSPEC = { mu: ['pins'], mu2: ['long', 'crown'], zhao: ['cap'], tian: ['long', 'crown'], xue: ['horns'], yun: ['long', 'crown', 'shut'], bai: ['ears'], mo: ['hat'], ge: ['beard'], jian: ['beard'], dan: [], dao: ['crown'], elder: ['beard', 'crown'], su: ['basket'], su2: ['basket'] };
function swordOn(G, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), flat = Math.abs(x1 - x0) > Math.abs(y1 - y0), ux = (x1 - x0) / n, uy = (y1 - y0) / n;
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + ux * i), y = Math.round(y0 + uy * i); put(G, x, y, i > n - 2 ? 'X' : 'x'); if (i < n - 1) put(G, flat ? x : x - 1, flat ? y - 1 : y, 'X'); }
  for (const k of [-2, -1, 1, 2]) put(G, Math.round(x0 - uy * k), Math.round(y0 + ux * k), 'G'); put(G, x0, y0, 'g');
  put(G, Math.round(x0 - ux), Math.round(y0 - uy), 'n'); put(G, Math.round(x0 - ux * 2), Math.round(y0 - uy * 2), 'n');
}
function fighterGrid(base, frame) {
  const Gd = blank(46, 38), ox = 5, oy = 3;
  if (frame === 'down') {
    for (let y = 0; y < base.length; y++) for (let x = 0; x < 30; x++) { const ch = base[y][x]; if (ch !== '.') put(Gd, y + 1, 41 - x, ch); }
    swordOn(Gd, 36, 36, 45, 37);
    return Gd;
  }
  const lean = { windup: -2, strike: 3, hit: -3 }[frame] || 0, bob = frame === 'idle1' || frame === 'stand1' ? 1 : 0;
  for (let y = 0; y < base.length; y++) {
    const dx = y < 18 ? lean : Math.round(lean * (34 - y) / 17), dy = y < 30 ? bob : 0;
    for (let x = 0; x < 30; x++) { const ch = base[y][x]; if (ch !== '.') put(Gd, ox + x + dx, oy + y + dy, ch); }
  }
  if (frame === 'stand0' || frame === 'stand1') return Gd;
  const S = { idle0: [28, 28, 34, 13], idle1: [28, 29, 34, 14], windup: [30, 21, 27, 1], strike: [33, 26, 45, 26], hit: [24, 31, 32, 37] }[frame];
  if (frame === 'windup' || frame === 'strike') { // 抬起的手臂
    const sx = ox + 20 + lean, sy = oy + 21, n = Math.max(Math.abs(S[0] - sx), Math.abs(S[1] - sy), 1);
    for (let i = 0; i <= n; i++) { const x = Math.round(sx + (S[0] - sx) * i / n), y = Math.round(sy + (S[1] - sy) * i / n); put(Gd, x, y, 'r'); put(Gd, x, y + 1, 'R'); put(Gd, x, y - 1, 'q'); }
  }
  swordOn(Gd, S[0], S[1], S[2], S[3]);
  put(Gd, S[0], S[1] + 1, 's'); put(Gd, S[0] - 1, S[1] + 1, 's');
  return Gd;
}
// 对决小人。who：人物 id（同 ART.portrait）| { look, realm }（主角）| { hair, skin, f, robe, trim }（路人换色）
// frame：'idle0' 'idle1' 'windup' 'strike' 'hit' 'down' 或 0～5（另有不持剑的 'stand0' 'stand1'，访客用）；flip 为真时面朝左（锚点 x 变为 26）
ART.fighter = function (who, frame, flip, alt) {
  if (typeof frame === 'number') frame = FIGHT_FRAMES[frame]; if (!FIGHT_FRAMES.includes(frame) && frame !== 'stand0' && frame !== 'stand1') frame = 'idle0';
  let look, robe, trim, mods = [], pal = {};
  if (typeof who === 'string') {
    let id = P_ALIAS[who] || who; if (alt && PEOPLE[id + '2']) id += '2';
    const S = PEOPLE[id] || PEOPLE.chu;
    look = { hair: S.hair || HAIR_K, skin: S.skin || '#f2c9a0', f: S.F && S.F.fem ? 1 : 0 }; robe = S.robe; trim = S.trim; mods = FSPEC[id] || [];
    if (id === 'xue') pal = { E: '#5a0a10', i: '#ff3a2a', o: '#e4d6b8', O: '#9a7a6a' };
    if (id === 'mo') pal = { K: '#4c465c', k: '#2a2636' };
    if (id === 'elder') pal = { u: '#f0f9ff' };
  } else if (who.look) { const R0 = L.REALMS[Math.min(who.realm | 0, 9)]; look = Object.assign({}, who.look, { hair: who.realm >= 7 ? '#e9e8f2' : who.look.hair, hero: 1 }); robe = R0.robe; trim = R0.trim; }
  else { look = who; robe = who.robe || L.REALMS[0].robe; trim = who.trim || '#dfe7ef'; }
  const key = ['ft', look.hair, look.skin, look.f ? 1 : 0, look.hero ? 1 : 0, robe.join(), trim, mods.join(), frame, flip ? 1 : 0].join('|');
  return cached(key, () => {
    const g = charGrid(STAND_BODY, look.f, look.hero);
    for (const m of mods) FMOD[m](g);
    if (frame === 'hit' || frame === 'down') { for (const x of [11, 12, 17, 18]) for (const y of [12, 13, 14]) put(g, x, y, 's'); for (const [x, y] of frame === 'hit' ? [[11, 12], [12, 13], [11, 14], [18, 12], [17, 13], [18, 14]] : [[11, 13], [12, 13], [17, 13], [18, 13]]) put(g, x, y, 'E'); }
    const c = render(fighterGrid(g, frame), palette(look, robe, trim, Object.assign({ o: '#d8ccb0', O: '#a89878', K: '#2c2a36', x: '#aeb8c8', X: '#e8eef6', n: '#5a4030' }, pal)));
    if (!flip) return c;
    const f = mk(c.width, c.height), fg = f.getContext('2d'); fg.translate(c.width, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); return f;
  });
};

// ---------- 命中火花、血条 ----------
// k: 0～1 的播放进度
ART.drawSpark = function (x, y, k) {
  x = Math.round(x); y = Math.round(y); const r = 3 + k * 9, c = k < 0.35 ? '#ffffff' : k < 0.7 ? '#fff2a8' : '#ff9a8a';
  if (k < 0.4) { disc(x, y, Math.round(3 - k * 5), '#ffffff'); glow(x, y, 9, '#fff2a8', 0.5 - k); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.3, r0 = r * 0.45, len = i % 2 ? r : r * 0.7; line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * len, y + Math.sin(a) * len, c); }
  if (k > 0.3) for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.8; R(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2) + k * 3, 1, 1, '#f4c542'); }
};
// 血条：左上角 (x,y)，宽 w（高 5）。o = { right: 从右往左扣, lag: 白色残影比例, c: 颜色 }
ART.drawHpBar = function (x, y, w, frac, o) {
  o = o || {}; x = Math.round(x); y = Math.round(y); frac = Math.max(0, Math.min(1, frac));
  R(x + 1, y, w - 2, 5, INK); R(x, y + 1, w, 3, INK); R(x + 1, y + 1, w - 2, 3, '#3a2030');
  const iw = w - 2, fw = Math.round(iw * frac), lw = Math.round(iw * Math.max(frac, Math.min(1, o.lag || 0))), c = o.c || (frac < 0.3 ? '#e8483a' : '#ff9a8a');
  if (lw > fw) R(o.right ? x + 1 + iw - lw : x + 1, y + 1, lw, 3, '#ffffff');
  if (fw > 0) { const fx = o.right ? x + 1 + iw - fw : x + 1; R(fx, y + 1, fw, 3, c); R(fx, y + 1, fw, 1, lerpC(c, '#ffffff', 0.5)); R(fx, y + 3, fw, 1, hs(c, 0.7)); }
  R(o.right ? x + w - 1 : x, y + 1, 1, 3, '#f4c542');
};

// ---------- 对决舞台：200 宽，坐标同历练场景（小人脚底 y=128，画布 160 高，OY 为上方加高的天空） ----------
function flag(x, y, t, c, c2, w) { // 旗杆顶在 (x,y)，旗面向右飘
  w = w || 14; R(x, y, 1, 40, '#5a3a2a'); R(x - 1, y - 1, 3, 1, '#f4c542');
  for (let i = 0; i < w; i++) { const dy = Math.round(Math.sin(t / 220 + i * 0.6 + x) * (i / w) * 2); R(x + 1 + i, y + 1 + dy, 1, 9, i % 5 === 4 ? hs(c, 0.8) : c); R(x + 1 + i, y + 1 + dy, 1, 1, c2); R(x + 1 + i, y + 9 + dy, 1, 1, c2); if (i > 3 && i < 9) R(x + 1 + i, y + 4 + dy, 1, 3, c2); }
}
const DUSK_ROOF = { l: '#8a5a78', m: '#6a4464', d: '#4a2e50', e: '#b07a8a', u: '#2a1a36' };
const STAGES = {
  // 落霞城：晚霞里的擂台，城楼、灯笼、看客
  town: {
    sky: ['#2a2456', '#5a3474', '#b8507a', '#ff9a6a', '#ffd89a'],
    build() {
      disc(148, 84, 15, '#fff0b8'); glow(148, 84, 26, '#ffb070', 0.5);
      const far = ridgeLine(21, 200, 92, 22, 4, 1.5); paintRidge(far, 112, '#9a5a86', '#e8a08a');
      // 远处的城郭
      for (let i = 0; i < 12; i++) { const x = i * 18 - 4, h = 8 + (i * 7 % 9); R(x, 100 - h, 15, h + 14, '#6a4470'); R(x, 100 - h, 15, 1, '#a8708a'); R(x - 1, 99 - h, 17, 1, '#4a2e50'); if (i % 3 === 0) R(x + 5, 104 - h, 3, 3, '#ffcf6a'); }
      R(0, 104, 200, 20, '#5a3a62'); for (let x = 0; x < 200; x += 6) R(x, 101, 4, 3, '#5a3a62'); R(0, 104, 200, 1, '#8a5a82'); dR(0, 114, 200, 10, '#3e2848', 6);
      // 城门楼
      R(72, 86, 56, 22, '#6a4470'); wallBays(100, 88, 50, 12, { wall: '#c89a8a', pil: '#8a2c34', pilL: '#c85a52', pilD: '#5a1c2a', beam: '#3a4a6a', beamL: '#f4c542', frame: '#6a2a2a', paper: '#ffd88a', lat: '#c8843c', panel: '#8a3c3a', door: '#6a2428', doorD: '#3a1420', doorL: '#f4c542' }, { bays: 5 });
      roof(100, 76, 44, 70, 9, DUSK_ROOF, { big: true }); R(90, 110, 20, 14, '#2a1a36'); R(92, 112, 16, 12, '#3e2848');
      // 擂台：台面、台裙、红毯
      R(8, 122, 184, 14, '#b8a8a0'); R(8, 122, 184, 1, '#f0e0d0'); R(8, 123, 184, 1, '#d8c8bc');
      for (let x = 12; x < 190; x += 16) R(x, 124, 1, 12, '#9a8a88');
      R(34, 125, 132, 9, '#a8323c'); R(34, 125, 132, 1, '#f4c542'); R(34, 133, 132, 1, '#f4c542'); dR(34, 126, 132, 7, '#7a1a26', 4);
      R(8, 136, 184, 16, '#7a6a72'); R(8, 136, 184, 1, '#55485a'); for (let x = 14; x < 188; x += 22) { R(x, 139, 16, 9, '#8a7a80'); R(x, 139, 16, 1, '#a8989a'); R(x + 5, 142, 6, 3, '#6a5a66'); } R(8, 152, 184, 8, '#3e2848');
      R(0, 136, 8, 24, '#3e2848'); R(192, 136, 8, 24, '#3e2848');
      // 鼓
      R(20, 108, 2, 14, '#5a3a2a'); R(30, 108, 2, 14, '#5a3a2a'); disc(26, 106, 7, '#a8323c'); disc(26, 106, 5, '#f0dcb0'); disc(25, 105, 2, '#fff6dc'); R(19, 105, 1, 3, '#f4c542'); R(33, 105, 1, 3, '#f4c542');
    },
    fx(t) {
      flag(12, 78, t, '#c8323c', '#f4c542'); flag(174, 78, t + 900, '#c8323c', '#f4c542');
      for (const [x, y] of [[64, 96], [136, 96], [46, 104], [154, 104]]) { lantern(x, y, true); glow(x, y + 3, 7, '#ff8a44', 0.35 + Math.sin(t / 400 + x) * 0.08); }
      // 台下看客
      for (let i = 0; i < 17; i++) { const x = 4 + i * 12, y = 153 + (i * 5 % 3) + Math.round(Math.sin(t / 260 + i * 1.7) * 0.8), c = ['#2a1a36', '#3a2440', '#241630'][i % 3]; disc(x, y, 4, c); R(x - 5, y + 3, 11, 8, c); if (i % 4 === 1) R(x - 1, y - 6, 3, 3, '#3a2a30'); }
    },
  },
  // 论道台：云海之上的白玉圆台
  cloud: {
    sky: ['#143a8a', '#2c74c6', '#6cb0e8', '#bfe4f8', '#eefaff'],
    build() {
      disc(40, 30, 9, '#ffffff'); glow(40, 30, 18, '#fff6d0', 0.6);
      paintRidge(ridgeLine(41, 200, 84, 50, 3, 2.4), 118, '#7c9ccc', '#e4f0ff', { snow: 58 });
      paintRidge(ridgeLine(47, 200, 100, 30, 4, 1.8), 120, '#5a7eb0', '#dceaff');
      for (let i = 0; i < 9; i++) ctx.drawImage(cloudSprite(30 + i, 26 + (i * 7 % 18), '#ffffff', '#e4ecfa', '#c0cce8'), i * 26 - 20, 100 + (i * 5 % 9));
      R(0, 114, 200, 46, '#e4ecfa'); dR(0, 112, 200, 3, '#e4ecfa', 8);
      // 玉柱
      for (const x of [22, 58, 142, 178]) { const h = x < 30 || x > 170 ? 46 : 38; column(x, 124, h, ['#8aa8c8', '#c8dcec', '#f4fbff'], true); R(x - 1, 124 - h - 5, 3, 3, '#4ccb9f'); R(x, 124 - h - 6, 1, 1, '#c8fff0'); }
      // 圆台
      ellipse(100, 139, 96, 13, '#7088a8'); ellipse(100, 131, 96, 12, '#93a8c0'); ellipse(100, 129, 96, 12, '#dce6f0'); ellipse(100, 129, 90, 10, '#eef4fa');
      ellipse(100, 129, 30, 5, '#c8d6e6'); ellipse(92, 129, 15, 3, '#93a8c0'); ellipse(108, 129, 15, 3, '#f8fcff'); R(84, 129, 3, 1, '#f8fcff'); R(114, 129, 3, 1, '#7088a8');
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, x = 100 + Math.cos(a) * 78, y = 129 + Math.sin(a) * 8; R(x - 1, y, 3, 1, '#a8bcd0'); }
      for (let x = 10; x < 190; x += 9) R(x, 142 + Math.round(Math.sqrt(Math.max(0, 1 - ((x - 100) / 96) ** 2)) * 7), 1, 3, '#55708e');
    },
    fx(t) {
      for (const x of [22, 58, 142, 178]) glow(x, 124 - (x < 30 || x > 170 ? 46 : 38) - 4, 5, '#8ff5d0', 0.5 + Math.sin(t / 500 + x) * 0.2);
      for (let i = 0; i < 7; i++) { const spr = cached('dcl' + i, () => cloudSprite(60 + i, 30 + (i * 11 % 20), '#ffffff', '#eef2fc', '#ccd6ee')), x = ((i * 43 + t * (0.004 + (i % 3) * 0.002)) % 280) - 60; ctx.drawImage(spr, Math.round(x), 146 + (i % 3) * 4); }
    },
  },
  // 演武场：宗门大殿前的青石广场
  sect: {
    sky: ['#2c74c6', '#6cb0e8', '#a8d4f0', '#d4f0f8', '#eefaff'],
    build() {
      paintRidge(ridgeLine(61, 200, 70, 40, 3, 1.9), 110, '#8fb0d4', '#dcecf8', { snow: 50 });
      paintRidge(ridgeLine(67, 200, 88, 22, 5, 1.4), 112, '#6a94a8', '#cfe4e8', { trees: '#4a7a6a' });
      // 大殿
      const st = ['#8a8498', '#a8a2b4', '#c4bece', '#e0dce8'];
      terrace(100, 112, 150, 6, st); rail(26, 88, 106, st); rail(112, 174, 106, st);
      wallBays(100, 84, 124, 22, pavPal(false), { door: true, bays: 7 });
      roof(100, 68, 84, 150, 14, ROOF.slate, { big: true }); plaque(100, 74, 18, true);
      R(99, 58, 2, 6, '#f4c542'); R(98, 61, 4, 2, '#ffe8a0');
      for (const x of [8, 192]) { pine(x, 114, 34, ['#2a5a46', '#3f7e5a', '#6aa878']); pine(x + (x < 100 ? 12 : -12), 114, 22, ['#2a5a46', '#3f7e5a', '#6aa878']); }
      // 青石地面
      R(0, 112, 200, 48, '#a8a0a8'); R(0, 112, 200, 1, '#d8d0d4');
      for (let k = 0; k < 7; k++) { const y = 114 + Math.round(k * k * 0.9 + k * 2); R(0, y, 200, 1, '#8a8290'); }
      for (let i = -8; i <= 8; i++) line(100 + i * 14, 113, 100 + i * 34, 160, '#8a8290');
      dR(0, 112, 200, 6, '#c4bcc4', 6); dR(0, 150, 200, 10, '#6e667a', 6);
      ellipse(100, 131, 60, 7, '#b8b0b8'); ellipse(100, 131, 56, 6, '#a8a0a8');
      // 兵器架、香炉
      for (const x of [14, 172]) { R(x, 104, 14, 2, '#5a3a2a'); R(x, 118, 14, 2, '#5a3a2a'); R(x, 102, 2, 20, '#7a5230'); R(x + 12, 102, 2, 20, '#7a5230'); for (let k = 0; k < 3; k++) { R(x + 3 + k * 3, 92, 1, 28, '#8a6a4a'); R(x + 2 + k * 3, 90 - k % 2, 3, 3, '#c8d0e0'); R(x + 3 + k * 3, 88 - k % 2, 1, 2, '#ffffff'); R(x + 3 + k * 3, 94, 1, 2, '#c8323c'); } }
      R(96, 106, 8, 2, '#5a5066'); R(94, 100, 12, 6, '#7a7088'); R(94, 100, 12, 1, '#a8a0b8'); R(95, 108, 2, 3, '#5a5066'); R(103, 108, 2, 3, '#5a5066');
    },
    fx(t) {
      flag(44, 66, t, '#3f6ec0', '#eef6ff', 12); flag(144, 66, t + 700, '#3f6ec0', '#eef6ff', 12);
      for (let i = 0; i < 3; i++) { const k = ((t / 60 + i * 9) % 27) | 0; ctx.globalAlpha = 0.5 - k / 60; R(99 + Math.round(Math.sin((t / 300) + k * 0.4 + i) * 2), 98 - k, 2, 2, '#e8e4f0'); } ctx.globalAlpha = 1;
    },
  },
  // 野外：暮色里的林间空地
  wild: {
    sky: ['#101a44', '#2a3a7a', '#5a5a9a', '#b88aa8', '#f8c8a0'],
    stars: 1,
    build() {
      disc(158, 34, 8, '#f4f6ff'); disc(155, 32, 2, '#d4dcf0'); glow(158, 34, 16, '#b8c8ff', 0.45);
      paintRidge(ridgeLine(81, 200, 80, 36, 4, 1.8), 116, '#5a5a92', '#c89ab0');
      paintRidge(ridgeLine(87, 200, 98, 22, 6, 1.3), 120, '#3a4a78', '#8a7aa0', { trees: '#2a3660' });
      for (const [x, h] of [[6, 46], [22, 34], [38, 26], [164, 28], [180, 38], [195, 48]]) pine(x, 124, h, ['#16283e', '#22405a', '#3a6278'], '#1a1a2a');
      deadTree(60, 122, 22, ['#2a2440', '#3a3458', '#5a5478'], 5);
      // 草地与土路
      R(0, 120, 200, 40, '#2e5a52'); R(0, 120, 200, 1, '#6aa878'); dR(0, 121, 200, 3, '#4a8a66', 8);
      ellipse(100, 132, 78, 8, '#6a5a58'); ellipse(100, 131, 74, 6, '#8a7468'); dR(30, 128, 140, 8, '#a08a78', 4);
      dR(0, 140, 200, 20, '#1e3e44', 8); R(0, 152, 200, 8, '#1e3e44');
      const r = seeded(9); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 200), y = 122 + Math.floor(r() * 36); if (Math.abs(x - 100) < 70 && y > 125 && y < 138) continue; R(x, y, 1, 2, '#4a8a66'); R(x + 1, y - 1, 1, 2, '#6aa878'); }
      rock(8, [118, 116, 114, 113, 113, 112, 112, 113, 114, 114, 115, 117, 118, 119], 126, G.r, 4); rock(170, [119, 117, 116, 115, 115, 116, 116, 117, 119], 126, G.r, 7);
      for (const [x, y] of [[40, 143], [150, 146], [112, 150]]) { R(x, y, 5, 2, '#55506e'); R(x + 1, y - 1, 3, 1, '#928ea8'); }
    },
    fx(t) {
      for (let i = 0; i < 9; i++) { const x = (i * 53 + Math.sin(t / 900 + i) * 9) % 200, y = 100 + (i * 17 % 44) + Math.sin(t / 600 + i * 2) * 4, a = 0.5 + Math.sin(t / 250 + i * 1.3) * 0.5; if (a < 0.2) continue; ctx.globalAlpha = a; R(x, y, 1, 1, '#e8ff9a'); ctx.globalAlpha = a * 0.3; R(x - 1, y - 1, 3, 3, '#c8f06a'); ctx.globalAlpha = 1; }
      ctx.globalAlpha = 0.25; for (const [y, sp] of [[112, 0.006], [118, 0.01]]) { const x = -(((t * sp) % 200) | 0); for (const dx of [0, 200]) dR(x + dx, y, 120, 3, '#c8c0e0', 6); } ctx.globalAlpha = 1;
    },
  },
};
let stageCur = null;
// 对决舞台。kind：'town' 落霞城擂台 | 'cloud' 论道台 | 'sect' 演武场 | 'wild' 野外。画满 200×(160+OY)，主体在 y=40～150
ART.drawDuelStage = function (kind, t, OY) {
  const S = STAGES[kind] || STAGES.wild; OY = OY || 0; kind = STAGES[kind] ? kind : 'wild';
  if (!stageCur || stageCur.kind !== kind || stageCur.OY !== OY) {
    const c = on(mk(200, 160 + OY), () => {
      vgrad(0, 0, 200, OY + 122, ramp(S.sky, 7), 0.34);
      if (S.stars) { const r = seeded(77); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 200), y = Math.floor(r() * (OY + 70)); R(x, y, 1, 1, r() > 0.6 ? '#ffffff' : '#9aa2dc'); } }
      ctx.translate(0, OY); S.build();
    });
    c._hdOK = 1; stageCur = { kind, OY, c };
  }
  const hd = hdBegin('duel', { key: kind, OY, t });
  try {
  hdL(hd, 'ground');
  ctx.drawImage(stageCur.c, 0, -OY);
  S.fx(t || 0);
  } finally { hdEnd(hd); }
};
ART.duelStages = () => Object.keys(STAGES);

// ---------- 场景里飘出的老祖：24×28，两帧浮动 ----------
ART.elderSprite = function (frame) {
  frame = frame ? 1 : 0;
  return cached('elderSp' + frame, () => {
    const b = new Buf(24, 28), W = hairTone('#f0f9ff'), sk = skinTone('#a6cdee'), RB = tone('#7aa8e0', '#3f6aa8', '#c0dcff'), dy = frame ? 0 : 1;
    // 烟尾
    b.add(L => { const pts = frame ? [[12, 20], [14, 23], [11, 25], [13, 27]] : [[12, 21], [10, 23], [13, 25], [11, 27]]; for (let i = 0; i < 3; i++) L.l(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], RB, 3 - i); });
    b.add(L => { L.e(12, 17 + dy, 6.5, 4.5, RB); L.r(4, 16 + dy, 3, 3, RB); L.r(17, 16 + dy, 3, 3, RB); });
    b.add(L => L.e(12, 9 + dy, 6, 5.5, sk.s), { noHi: 1, sep: 1 });
    b.add(L => { L.e(12, 6.5 + dy, 6.6, 4, W); L.r(5, 7 + dy, 2, 6, W); L.r(17, 7 + dy, 2, 6, W); L.e(12, 1.8 + dy, 2, 1.6, W); for (let x = 8; x < 16; x++) L.p(x, 9 + dy, null); L.r(9, 8 + dy, 6, 1, null); });
    b.r(11, 2 + dy, 2, 1, '#5fd3b0');
    b.r(8, 10 + dy, 2, 1, '#27357a'); b.r(14, 10 + dy, 2, 1, '#27357a'); b.hl(7, 10, 9 + dy, W); b.hl(13, 16, 9 + dy, W); b.p(6, 10 + dy, W); b.p(17, 10 + dy, W);
    b.add(L => { L.sy(12 + dy, '3432211', W, 12); });
    b.l(9, 16 + dy, 11, 19 + dy, '#e6f6ff'); b.l(14, 16 + dy, 12, 19 + dy, '#e6f6ff');
    const src = b.cv({ ink: '#27357a', max: 12 }), c = mk(24, 28), g = c.getContext('2d');
    g.globalAlpha = 0.94; g.drawImage(src, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'destination-out';
    for (let y = 21; y < 28; y++) for (let x = 0; x < 24; x++) if (BAYER[(x & 3) + (y & 3) * 4] < (y - 20) * 2) g.fillRect(x, y, 1, 1);
    return c;
  });
};

// ---------- 访客：洞府门口的小人 + “！”气泡 ----------
const VISITORS = {
  mortal: [{ hair: '#4a3628', skin: '#e8b68a', f: 0 }, ['#54402c', '#86694a', '#b8986c'], '#d8c090'],
  cult: [{ hair: '#2a2230', skin: '#f2c9a0', f: 0 }, ['#3a5a7a', '#5a84a8', '#8ab0cc'], '#dfe7ef'],
  fem: [{ hair: '#3b2a22', skin: '#f6d3b3', f: 1 }, ['#a04a6a', '#d87a98', '#f8b0c4'], '#fff0f4'],
  dark: [{ hair: '#1d1a24', skin: '#d9a47c', f: 0 }, ['#17131f', '#2e2838', '#4a4157'], '#6a6088', { kind: 'hill', pal: { E: '#1a0c10' } }],
};
// (x,y) 为脚底中心。kind：mortal 凡人 | cult 修士 | fem 女修 | dark 黑衣，或人物 id（画成该人物的小人）。
// o = { bubble: false 不画气泡, shake: 气泡抖动（快走了）, alpha }；返回气泡的点击范围 { x, y, w, h }
ART.drawVisitor = function (x, y, kind, t, o) {
  o = o || {}; x = Math.round(x); y = Math.round(y);
  const V = VISITORS[kind], f = (t / 520 | 0) % 2;
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ellipse(x, y, 8, 2, 'rgba(20,14,40,0.28)');
  let top;
  if (V) { const s = ART.stand(V[0], V[1], V[2], f, V[3]); ctx.drawImage(s, x - (s.width >> 1), y - s.height + 1); top = y - s.height; }
  else { const s = ART.fighter(kind, f ? 'stand1' : 'stand0', true), D2 = ART.dims.fighter; ctx.drawImage(s, x - (D2.w - 1 - D2.ax), y - D2.ay); top = y - 37; }
  ctx.globalAlpha = 1;
  if (o.bubble === false) return null;
  const bx = x - 5 + (o.shake ? Math.round(Math.sin(t / 40) * 1.2) : 0), by = top - 14 + Math.round(Math.sin(t / 300) * 1.5);
  R(bx + 1, by, 9, 12, INK); R(bx, by + 1, 11, 10, INK); R(bx + 4, by + 12, 3, 1, INK); R(bx + 5, by + 13, 1, 1, INK);
  R(bx + 1, by + 1, 9, 10, '#fff6e0'); R(bx + 5, by + 11, 1, 1, '#fff6e0'); R(bx + 1, by + 10, 9, 1, '#dccca4');
  R(bx + 4, by + 2, 3, 5, '#c8323c'); R(bx + 5, by + 7, 1, 1, '#c8323c'); R(bx + 4, by + 9, 3, 1, '#c8323c'); R(bx + 4, by + 2, 1, 1, '#f07a6a');
  return { x: bx - 4, y: by - 4, w: 19, h: 22 };
};
ART.visitorKinds = () => Object.keys(VISITORS);

// ---------- 吐纳环：脚下一圈灵光，fill 0～1 逐段点亮，蓄满后脉动 ----------
// part：'back' 只画人物身后的半圈，'front' 只画身前半圈，省略则整圈
ART.drawTunaRing = function (x, y, fill, t, part) {
  x = Math.round(x); y = Math.round(y); fill = Math.max(0, Math.min(1, fill));
  const N = 28, full = fill >= 1, pulse = full ? 0.5 + Math.sin(t / 160) * 0.5 : 0, rx = 25 + (full ? Math.round(pulse * 2) : 0), ry = 7 + (full ? Math.round(pulse) : 0);
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (i + 0.5) / N * Math.PI * 2, s = Math.sin(a);
    if (part === 'back' ? s > 0 : part === 'front' ? s <= 0 : false) continue;
    const px = x + Math.round(Math.cos(a) * rx), py = y - 2 + Math.round(s * ry), on2 = i / N < fill;
    if (!on2) { R(px, py, 1, 1, '#2a8a7a'); R(px, py - 1, 1, 1, 'rgba(200,255,240,0.35)'); continue; }
    const head = !full && (i + 1) / N >= fill, c = full ? lerpC('#4ccb9f', '#fff2a8', pulse) : '#4ccb9f';
    R(px - 1, py, 3, 1, c); R(px, py - 1, 1, 1, lerpC(c, '#ffffff', 0.6)); if (head || (full && (i + (t / 90 | 0)) % 7 === 0)) { R(px, py - 2, 1, 2, '#ffffff'); glow(px, py, 4, '#8ff5d0', 0.5); }
  }
  if (full && part !== 'back') for (let i = 0; i < 4; i++) { const k = ((t / 70 + i * 13) % 26) | 0, a = i * 1.7 + 0.4; ctx.globalAlpha = 1 - k / 26; R(x + Math.round(Math.cos(a) * 20), y - 4 - k, 1, 2, '#c8fff0'); ctx.globalAlpha = 1; }
};

// ---------- 闭关：身后的封印石门 + 罩住人物的光罩 ----------
// (x,y) 为人物脚底中心，省略时取洞府里主角的位置；part：'back' 石门 | 'front' 光罩 | 省略两者都画
ART.drawRetreat = function (t, x, y, part) {
  x = x === undefined ? 100 : Math.round(x); y = y === undefined ? 136 : Math.round(y);
  if (part !== 'front') {
    const d = cached('retreatDoor', () => on(mk(44, 50), () => {
      R(4, 8, 36, 42, '#55506e'); R(8, 2, 28, 8, '#55506e'); R(6, 4, 32, 6, '#55506e');
      R(7, 10, 30, 40, '#716c8a'); R(10, 5, 24, 6, '#716c8a'); R(7, 10, 1, 40, '#928ea8'); R(10, 5, 24, 1, '#b4b0c8');
      R(10, 13, 24, 37, '#3e3a56'); R(11, 14, 10, 36, '#928ea8'); R(23, 14, 10, 36, '#847f9c'); R(11, 14, 10, 1, '#b4b0c8'); R(11, 14, 1, 36, '#b4b0c8'); R(23, 14, 1, 36, '#a8a4bc'); R(32, 14, 1, 36, '#55506e');
      for (const yy of [22, 34, 44]) { R(12, yy, 8, 1, '#716c8a'); R(24, yy, 8, 1, '#716c8a'); }
      R(18, 30, 2, 3, '#f4c542'); R(24, 30, 2, 3, '#f4c542');
      R(17, 16, 10, 13, '#f4e6b0'); R(17, 16, 10, 1, '#fff6dc'); R(26, 17, 1, 12, '#c8b48c'); for (const [a, b2, w, h] of [[19, 18, 6, 1], [21, 18, 2, 9], [19, 21, 6, 1], [19, 24, 2, 1], [23, 24, 2, 1], [19, 26, 6, 1]]) R(a, b2, w, h, '#c8323c');
      dR(4, 44, 36, 6, '#3e3a56', 6);
    }));
    ctx.drawImage(d, x - 22, y - 62);
    glow(x, y - 40, 8, '#ffcf6a', 0.25 + Math.sin(t / 500) * 0.1);
  }
  if (part === 'back') return;
  const rr = 27, c = '#8ff5d0';
  ctx.save();
  for (let j = -rr; j <= 2; j++) {
    const w = Math.round(Math.sqrt(rr * rr - j * j) * 1.05), yy = y + j;
    ctx.globalAlpha = 0.16 + (j + rr) / rr * 0.1; dR(x - w, yy, w * 2, 1, c, j < -rr * 0.5 ? 6 : 3);
    ctx.globalAlpha = 0.85; R(x - w - 1, yy, 2, 1, c); R(x + w - 1, yy, 2, 1, '#4ccb9f');
  }
  ctx.globalAlpha = 0.85; R(x - 9, y - rr - 1, 18, 1, c);
  ctx.globalAlpha = 0.9; for (let j = -rr + 5; j < -6; j += 2) { const w = Math.round(Math.sqrt(rr * rr - j * j) * 1.05); R(x - w + 3 + Math.round((j + rr) * 0.15), y + j, 1, 1, '#ffffff'); }
  // 绕罩流转的符文
  for (let i = 0; i < 6; i++) { const a = t / 900 + i * Math.PI / 3, s = Math.sin(a); if (s < -0.2) continue; const px = x + Math.round(Math.cos(a) * (rr - 1)), py = y - 12 + Math.round(Math.sin(t / 700 + i) * 2) - (i % 2) * 8; ctx.globalAlpha = 0.5 + s * 0.5; R(px - 1, py, 3, 1, '#fff2a8'); R(px, py - 1, 1, 3, '#fff2a8'); }
  ctx.globalAlpha = 0.9; for (let i = 0; i < 40; i++) { const a = i * Math.PI / 20; R(x + Math.round(Math.cos(a) * (rr + 1)), y + 1 + Math.round(Math.sin(a) * 3), 1, 1, i % 2 ? c : '#c8fff0'); }
  ctx.restore();
};

// ---------- 首领 48×48（顺序同 L.BOSSES） ----------
function spikes(L, cx, cy, r0, r1, n, c, th, a0) { for (let i = 0; i < n; i++) { const a = (a0 || 0) + i * Math.PI * 2 / n; L.l(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, c, th || 2); } }
const BOSS = [
  // 0 独眼狼王：左眼一道疤，右眼通红
  b => {
    const F = tone('#8f8a9e', '#55506e', '#c8c4d8'), D = tone('#5a5572', '#34304a', '#7a7592'), M = tone('#d8d4e4', '#a09cb4', '#ffffff');
    b.add(L => { L.e(24, 28, 19, 18, D); spikes(L, 24, 29, 15, 22, 9, D, 4, 0.9); L.mir(T => { T.l(8, 34, 3, 40, D, 3); T.l(12, 40, 9, 46, D, 3); }); });
    b.add(L => L.mir(T => { for (let y = 1; y <= 15; y++) T.hl(Math.round(9 - (y - 1) * 0.25), Math.round(9 + (y - 1) * 0.65), y, F); }));
    b.mir(T => { for (let y = 6; y <= 13; y++) T.hl(10, Math.round(10 + (y - 6) * 0.4), y, '#c8607e'); }); b.r(6, 7, 3, 2, null);
    b.add(L => { L.e(24, 23, 14, 12, F); L.sy(30, 'a987654', F); });
    b.add(L => L.e(24, 33, 7, 6.5, M));
    b.r(22, 28, 4, 3, INK); b.p(22, 28, '#7a7592'); b.r(23, 31, 2, 3, '#a09cb4');
    b.hl(19, 28, 35, INK); b.r(20, 34, 8, 1, '#8a1e2e'); b.r(19, 35, 2, 3, '#ffffff'); b.r(27, 35, 2, 3, '#ffffff'); b.p(22, 36, '#ffffff'); b.p(25, 36, '#ffffff');
    b.l(26, 19, 34, 17, '#34304a', 2); b.r(28, 21, 5, 3, INK); b.r(29, 21, 3, 2, '#ff3a2a'); b.p(29, 21, '#fff2a8');
    b.l(13, 17, 21, 19, '#34304a', 2); b.hl(15, 19, 22, INK); b.l(14, 14, 20, 28, '#8a1e2e'); b.l(15, 14, 21, 28, '#d8404a');
    b.mir(T => { T.l(10, 27, 7, 30, F); T.l(11, 30, 8, 34, F); });
  },
  // 1 黑风寨主雷彪：络腮胡、红头巾、开山斧
  {
    skin: '#d9a47c', hair: '#1d1a24', shape: 'square', robe: ['#3a2a22', '#5e4836', '#8a6c4c'], trim: '#9a3a34', bust: { sw: 22 }, noGloss: 1,
    fr: 'gg9888888888', back: (L, c) => L.r(14, 24, 20, 12, c),
    pre: b => { b.add(L => { L.l(41, 47, 43, 12, WOOD, 2); L.e(37, 17, 7, 9, STEEL); L.r(39, 8, 4, 18, null); L.l(41, 30, 43, 12, WOOD, 2); }); b.l(31, 12, 31, 22, '#eef4ff'); },
    mid: b => b.add(L => { for (let i = 0; i < 6; i++) L.e(9 + i * 6, 40 + Math.abs(i - 2.5) * 0.8, 4, 3, '#7a5a40'); }),
    F: { eye: 'n', iris: '#3a2a2a', brow: { th: 2, tilt: 0.9, len: 6 }, mouth: { n: 'none' } },
    post: (b, m, c, sk) => {
      b.add(L => { L.sy(29, 'bbbbba9864', c); L.r(20, 30, 8, 2, null); });
      b.m(20, 30, ['MMMMMMMM', 'wMwMwMwM'], { M: sk.M, w: '#f6f2fa' }); b.l(28, 24, 32, 29, '#8a3040');
      b.add(L => { L.r(13, 13, 22, 4, RED); L.l(35, 15, 40, 19, RED, 2); L.l(35, 16, 38, 23, RED, 2); }); b.r(22, 14, 4, 2, '#f4c542');
    },
  },
  // 2 古墓尸王：额头贴着镇尸符
  {
    skin: '#a9c4a2', hair: '#d8d8e2', shape: 'long', robe: ['#24243e', '#42426a', '#6a6a94'], trim: '#c8a84a', bust: { inner: '#8a8ab0' }, noGloss: 1,
    fr: 'zz87655444', back: (L, c) => { L.r(11, 12, 26, 34, c); L.l(11, 40, 8, 47, c, 2); L.l(36, 40, 39, 47, c, 2); },
    F: { eye: 'n', eyes: { n: [] }, brow: { c: 0 }, nose: 0, mouth: { n: 'none' } },
    skinX: (b, m, sk) => {
      b.mir(T => { T.r(16, 23, 6, 4, '#2c3a30'); T.r(18, 24, 2, 2, '#8fffa0'); T.p(18, 24, '#ffffff'); T.l(16, 29, 18, 33, sk.S); });
      b.m(19, 31, ['MMMMMMMMMM', 'wMwMwMwMwM', 'MMMMMMMMMM'], { M: '#2c3a30', w: '#e8f0d8' });
    },
    post: b => {
      b.add(L => { L.r(15, 2, 18, 7, '#42426a'); L.r(13, 8, 22, 2, '#42426a'); L.r(22, 0, 4, 2, '#42426a'); }); b.hl(13, 34, 8, '#c8a84a'); b.r(23, 4, 2, 2, '#d8404a'); b.r(30, 3, 2, 3, null);
      b.add(L => L.r(21, 11, 6, 17, '#f4e08a'), { sep: 1, noHi: 1 }); for (const [x, y, w] of [[22, 13, 4], [23, 15, 2], [22, 17, 4], [22, 19, 1], [25, 19, 1], [22, 21, 4], [23, 23, 2], [22, 25, 4]]) b.r(x, y, w, 1, '#c8323c');
    },
  },
  // 3 赤炎猿王：火焰鬃毛
  b => {
    const F = tone('#d8502a', '#8a2a1a', '#ff9a4a'), S = skinTone('#f0c090');
    b.add(L => { L.e(24, 26, 19, 18, F); for (const [x, y] of [[8, 12], [13, 5], [19, 2], [25, 0], [31, 3], [37, 7], [42, 14], [5, 20], [44, 22]]) L.l(24 + (x - 24) * 0.6, 14, x, y, F, 3); });
    for (const [x, y] of [[13, 5], [19, 2], [25, 0], [31, 3], [37, 7], [8, 12], [42, 14]]) { b.r(x, y, 2, 2, '#f4c542'); b.p(x, y, '#fff2a8'); }
    b.add(L => L.mir(T => T.e(7, 25, 3.5, 4.5, S.s)), { sep: 1, noHi: 1 }); b.mir(T => T.r(7, 24, 1, 3, S.S));
    b.add(L => { L.sy(17, '789aaaa99887', S.s); L.e(24, 33, 10, 7.5, S.s); }, { sep: 1, noHi: 1 });
    b.add(L => { L.r(13, 16, 22, 4, F); L.sy(20, '2', F); });
    b.mir(T => { T.r(16, 21, 5, 3, INK); T.r(17, 22, 3, 2, '#f4c542'); T.p(18, 22, INK); T.l(15, 19, 21, 21, '#8a2a1a'); });
    b.p(22, 28, S.M); b.p(25, 28, S.M); b.hl(22, 25, 27, S.S); b.r(17, 33, 14, 4, '#5a1420'); b.hl(17, 30, 32, INK); b.r(18, 33, 2, 3, '#ffffff'); b.r(28, 33, 2, 3, '#ffffff'); b.r(21, 33, 6, 1, '#ffffff'); b.r(22, 36, 4, 1, '#f6f2fa');
    b.add(L => L.sy(42, '9bdfhj', F)); b.add(L => { for (let i = 0; i < 5; i++) L.e(14 + i * 5, 43.5 + Math.abs(i - 2) * 0.5, 2, 2, WHITE); });
  },
  // 4 血煞老魔：血色兜帽、枯瘦的脸
  {
    skin: '#d8c2c8', hair: '#e8e0e8', shape: 'sharp', robe: ['#2a0810', '#5a1220', '#8a2a34'], trim: '#c8a84a', bust: { inner: '#1a0a10', sw: 21 }, noGloss: 1,
    F: { eye: 'x', iris: '#ff3a2a', tail: '#8a1e2e', brow: { c: '#e8e0e8', len: 6, tilt: 0.8 }, mouth: { n: 'fang' } },
    skinX: (b, m, sk) => { b.mir(T => { T.l(17, 28, 19, 33, sk.S); T.p(15, 27, sk.S); }); b.hl(21, 26, 17, sk.S); b.hl(20, 27, 19, sk.S); },
    post: (b, m, c) => {
      b.add(L => { L.e(24, 20, 17, 19, '#5a1220'); L.sy(0, '1123', '#5a1220'); L.r(8, 36, 32, 4, '#5a1220'); L.e(24, 24, 10.5, 12.5, null); L.r(17, 33, 14, 7, null); });
      b.add(L => L.sy(35, '111111111', c)); b.mir(T => { for (let y = 12; y < 34; y += 3) T.p(13 - (y > 24 ? 1 : 0), y, '#c8a84a'); });
      b.add(L => L.r(22, 43, 4, 4, WHITE)); b.p(22, 44, INK); b.p(25, 44, INK); b.r(23, 46, 2, 1, INK);
    },
  },
  // 5 剑冢守墓人：蒙眼布，背后插满残剑
  {
    skin: '#d8b89a', hair: '#9a98aa', shape: 'long', robe: ['#34343e', '#5a5a68', '#86869a'], trim: '#b0b0c0', noGloss: 1,
    fr: 'zzkf976554', back: (L, c) => L.r(11, 12, 26, 32, c),
    pre: b => { hilt(b, 9, 38, 3, 17, { g: 6, guard: STEEL, pommel: STEEL }); hilt(b, 15, 36, 11, 5, { g: 6 }); hilt(b, 33, 36, 37, 4, { g: 6, guard: STEEL }); hilt(b, 39, 38, 45, 16, { g: 6 }); },
    F: { eye: 'n', eyes: { n: [] }, brow: { c: 0 }, mouth: { n: 'flat' } },
    skinX: (b, m, sk) => { b.mir(T => T.l(18, 29, 17, 32, sk.S)); b.hl(21, 26, 18, sk.S); },
    post: (b, m, c) => {
      b.add(L => { L.r(13, 22, 22, 5, '#e8e4d8'); L.l(35, 23, 41, 27, '#e8e4d8', 2); L.l(35, 25, 39, 32, '#e8e4d8'); }); b.hl(14, 33, 24, '#b8b4a8'); b.l(20, 22, 22, 26, '#b8b4a8');
      b.add(L => { L.mir(T => T.l(22, 31, 19, 32, c)); L.sy(34, '33221', c); });
    },
  },
  // 6 九幽魔将：重盔、巨角、面甲后两点魔火
  b => {
    const H = tone('#4c3c70', '#221a3a', '#8070b0'), B = tone('#b8b0a0', '#6a6258', '#e8e0d0');
    b.add(L => L.mir(T => { T.l(13, 15, 5, 12, B, 3); T.l(5, 12, 3, 4, B, 3); T.l(3, 4, 5, 0, B, 2); }));
    b.add(L => { L.r(10, 38, 28, 10, H); L.mir(T => { T.e(7, 43, 7.5, 6, H); T.l(5, 38, 2, 31, H, 2); T.l(9, 38, 9, 33, H, 2); }); });
    b.add(L => { L.e(24, 18, 13, 13, H); L.sy(22, 'ddddccba98765', H); });
    b.add(L => L.sy(4, '111111222', '#8070b0')); b.r(23, 2, 2, 3, '#e85aff');
    b.r(13, 20, 22, 4, INK); b.mir(T => { T.r(16, 21, 5, 2, '#e85aff'); T.p(17, 21, '#ffd0ff'); T.p(15, 20, '#e85aff'); });
    for (let x = 17; x <= 30; x += 3) b.r(x, 27, 1, 6, INK); b.hl(15, 32, 26, '#221a3a'); b.hl(13, 34, 19, '#8070b0');
    b.add(L => L.sy(40, '234', '#e85aff')); b.p(23, 41, '#ffd0ff'); b.hl(12, 35, 38, '#8070b0');
  },
  // 7 东海蛟皇：鹿角、长须、金瞳
  b => {
    const T0 = tone('#3fb0c8', '#1f6e8a', '#a8ecf4'), A = tone('#e8d49a', '#a88a4a', '#fff6d0'), Bl = tone('#e8f4c8', '#a8c090', '#ffffff');
    b.add(L => L.mir(T => { T.l(16, 14, 10, 6, A, 2); T.l(10, 6, 9, 0, A, 2); T.l(12, 8, 5, 7, A, 2); T.l(5, 7, 3, 3, A); }));
    b.add(L => L.mir(T => { T.e(8, 24, 4, 7, '#1f6e8a'); T.l(5, 20, 2, 16, '#1f6e8a', 2); T.l(5, 27, 1, 28, '#1f6e8a', 2); }));
    b.add(L => { L.e(24, 22, 13, 11, T0); L.e(24, 33, 9.5, 9, T0); L.sy(40, '9abcdeg', T0); });
    b.add(L => L.sy(8, '1122', RED)); for (let y = 14; y < 30; y += 3) for (let x = 14 + (y % 2); x < 34; x += 4) if (b.at(x, y) === T0) b.p(x, y, '#1f6e8a');
    b.add(L => { L.e(24, 37, 6, 4, Bl); L.sy(41, '678', Bl); }, { sep: 1 });
    b.mir(T => { T.l(13, 18, 20, 20, '#1f6e8a', 2); T.r(15, 21, 5, 3, INK); T.r(16, 21, 3, 3, '#f4c542'); T.r(17, 21, 1, 3, INK); T.p(16, 21, '#fff2a8'); });
    b.p(21, 30, INK); b.p(26, 30, INK); b.hl(16, 31, 35, INK); for (let x = 17; x <= 30; x += 3) { b.p(x, 36, '#ffffff'); b.p(x, 34, '#ffffff'); }
    b.add(L => L.mir(T => { T.l(17, 32, 9, 34, WHITE); T.l(9, 34, 4, 39, WHITE); T.l(4, 39, 3, 45, WHITE); }), { flat: 1 });
  },
  // 8 吞星巨兽：一张吞下星辰的巨口
  b => {
    const N = tone('#2a2860', '#141232', '#5a58a8');
    b.add(L => { L.e(24, 25, 21, 21, N); spikes(L, 24, 25, 19, 24, 10, N, 3, 0.3); });
    const r = seeded(8); for (let i = 0; i < 26; i++) { const x = 4 + Math.floor(r() * 40), y = 5 + Math.floor(r() * 40); if (b.at(x, y) === N) b.p(x, y, i % 4 ? '#8a88d8' : '#ffffff'); }
    b.add(L => L.e(24, 29, 14, 12, '#0c0a1a'), { flat: 1, sep: 1 });
    b.e(24, 31, 7, 6, '#6a3aa8'); b.e(24, 31, 5, 4, '#f4c542'); b.e(24, 31, 2.5, 2, '#ffffff'); b.p(18, 27, '#fff2a8'); b.p(30, 34, '#fff2a8'); b.p(29, 26, '#c27dff');
    for (let i = 0; i < 7; i++) { const x = 12 + i * 4; b.r(x, 18 + Math.round(Math.abs(i - 3) * 1.2), 2, 3 + (i % 2), '#ffffff'); b.r(x + 1, 39 - Math.round(Math.abs(i - 3) * 1.2) - (i % 2), 2, 3 + (i % 2), '#e8e4f0'); }
    for (const [x, y, s] of [[13, 11, 3], [22, 7, 4], [32, 10, 3], [38, 16, 2], [8, 17, 2]]) { b.r(x, y, s, s - 1, INK); b.r(x, y, s - 1, s - 1, '#f4c542'); b.p(x, y, '#ffffff'); }
  },
  // 9 仙府傀儡王：金盔红缨、白面蓝瞳、背后的机括光轮
  b => {
    const Gd = tone('#ecb43c', '#a8742a', '#fff2a8');
    b.add(L => { L.e(24, 20, 21, 20, '#a8742a'); L.e(24, 20, 17.5, 16.5, null); spikes(L, 24, 20, 20, 23, 12, '#a8742a', 3); }, { flat: 1 });
    b.add(L => { L.sy(38, 'dgjkllllll', Gd); }); b.mir(T => { T.e(8, 42, 6, 4, '#fff2a8'); T.hl(4, 12, 45, '#a8742a'); });
    b.add(L => L.sy(13, '8abbbbbbbbbbbbbaa98765', WHITE), { sep: 1 });
    b.add(L => { L.e(24, 13, 13, 10, Gd); L.r(11, 13, 4, 14, Gd); L.r(33, 13, 4, 14, Gd); L.r(15, 13, 18, 8, null); L.sy(13, '56789', Gd); L.r(22, 18, 4, 4, Gd); });
    b.add(L => L.sy(0, '1122221', RED)); b.r(23, 9, 2, 3, '#4aa8ff'); b.p(23, 9, '#ffffff');
    b.mir(T => { T.r(15, 23, 6, 2, INK); T.r(16, 23, 4, 2, '#4aa8ff'); T.p(17, 23, '#ffffff'); T.r(18, 25, 1, 7, '#d8404a'); });
    b.hl(21, 26, 31, '#b4b0cc'); b.p(21, 30, '#b4b0cc'); b.p(26, 30, '#b4b0cc'); b.r(23, 32, 2, 3, '#b4b0cc');
    b.add(L => L.sy(41, '234', '#4aa8ff')); b.p(23, 42, '#ffffff');
  },
  // 10 混沌魔神残影：只剩轮廓与一双眼
  b => {
    const K = tone('#221a40', '#0e0a1e', '#5a3a9a');
    b.add(L => { L.e(24, 34, 18, 16, K); L.e(24, 16, 10, 10.5, K); L.mir(T => { T.l(17, 9, 11, 3, K, 3); T.l(11, 3, 12, 0, K, 2); T.l(8, 30, 2, 26, K, 3); T.l(7, 38, 1, 40, K, 3); }); });
    b.mir(T => { T.r(17, 14, 5, 2, '#ffffff'); T.p(16, 13, '#c27dff'); T.p(22, 16, '#c27dff'); });
    for (let x = 18; x <= 29; x++) b.p(x, 21 + (x % 2), x % 3 ? '#ffffff' : '#c27dff');
    b.l(24, 26, 20, 38, '#c27dff'); b.l(20, 38, 22, 47, '#4aa8ff'); b.l(27, 30, 31, 37, '#ff6b6b'); b.l(31, 37, 29, 44, '#ffb23f'); b.l(15, 32, 13, 40, '#62d26f'); b.l(33, 40, 36, 46, '#f4e04a');
  },
];
// 首领半身像：k 为地图序号 0～10
ART.boss = function (k) {
  k = Math.max(0, Math.min(BOSS.length - 1, k | 0));
  return cached('boss|' + k, () => {
    const S = BOSS[k]; let c;
    if (typeof S === 'function') { const b = new Buf(48, 48); S(b); c = b.cv({ max: 15 }); } else c = person(S, 'n').cv({ max: 15 });
    return k === 10 ? ghost(c) : c;
  });
};

// ---------- 开场四格画 200×120 ----------
const ME0 = { hair: '#2a2230', skin: '#f2c9a0', f: 0 };
function frameEdge() { R(0, 0, 200, 1, INK); R(0, 119, 200, 1, INK); R(0, 0, 1, 120, INK); R(199, 0, 1, 120, INK); }
function crowd(xs, y, cols) { xs.forEach((x, i) => { const c = cols[i % cols.length], yy = y + (i * 7 % 4); disc(x, yy, 5, c); R(x - 7, yy + 4, 15, 30, c); R(x - 2, yy - 8, 4, 4, c); }); }
const INTRO = [
  // 一、雨夜，被扔出山门
  look => {
    vgrad(0, 0, 200, 120, ramp(['#070818', '#121a40', '#263466', '#3a4a86'], 6), 0.34);
    paintRidge(ridgeLine(5, 200, 60, 34, 3, 2), 100, '#1c2650', '#34447e');
    // 山门
    R(108, 62, 84, 6, '#4a4a6a'); R(108, 62, 84, 1, '#7a7aa0');
    for (const x of [116, 180]) { R(x, 30, 6, 32, '#5a2430'); R(x, 30, 2, 32, '#8a3a44'); }
    R(124, 34, 54, 28, '#141228'); R(126, 36, 24, 26, '#2a1c2c'); R(152, 36, 24, 26, '#241826'); R(150, 36, 2, 26, '#0a0816');
    roof(151, 18, 56, 96, 10, { l: '#4a5a80', m: '#34446a', d: '#222e50', e: '#7a90b8', u: '#101428' }, { big: true }); plaque(151, 26, 16, true);
    // 长阶
    for (let i = 0; i < 13; i++) { const y = 68 + i * 4, x0 = 104 - i * 6, w = 92 + i * 3; R(x0, y, w, 4, i % 2 ? '#3a3e62' : '#464a72'); R(x0, y, w, 1, '#6a70a0'); }
    R(0, 112, 200, 8, '#1c2040'); dR(0, 108, 60, 4, '#1c2040', 8);
    for (const x of [112, 190]) { lantern(x, 40, true); glow(x, 44, 10, '#ff8a44', 0.5); }
    const z = ART.fighter('zhao', 'idle0', true); ctx.drawImage(z, 150, 26);
    ctx.drawImage(ART.fighter({ look, realm: 0 }, 'down'), 22, 78);
    R(74, 110, 9, 6, '#6a5236'); R(75, 109, 7, 1, '#8a6e48'); R(77, 107, 3, 2, '#8a6e48');
    // 雨
    const r = seeded(3); ctx.globalAlpha = 0.5; for (let i = 0; i < 90; i++) { const x = r() * 220, y = r() * 120, l = 4 + r() * 5; line(x, y, x - l * 0.35, y + l, i % 3 ? '#8fa0d8' : '#c8d4f8'); } ctx.globalAlpha = 1;
    for (let i = 0; i < 9; i++) R(10 + i * 21 + (i * 7 % 9), 114 + (i % 3), 5, 1, '#5a6aa8');
  },
  // 二、当众退婚
  look => {
    R(0, 0, 200, 120, '#3a2030');
    wallBays(100, 14, 204, 58, { wall: '#e0c8a0', pil: '#a8323c', pilL: '#d8605a', pilD: '#6a1c26', beam: '#3a2a3a', beamL: '#f4c542', frame: '#7a2a22', paper: '#f6e4b0', lat: '#c89a5a', panel: '#b85a44', door: '#8a2c24', doorD: '#4f1818', doorL: '#f4c542' }, { bays: 7 });
    R(0, 0, 200, 14, '#2a1826'); for (let x = 4; x < 200; x += 12) { R(x, 10, 8, 3, '#a8323c'); R(x, 13, 8, 1, '#f4c542'); }
    for (const x of [30, 170]) { R(x - 6, 12, 12, 44, '#b02a34'); R(x - 6, 12, 2, 44, '#d8484a'); R(x - 4, 20, 8, 1, '#f4c542'); R(x - 4, 48, 8, 1, '#f4c542'); R(x - 2, 28, 4, 12, '#f4c542'); R(x - 6, 56, 3, 3, '#b02a34'); R(x + 3, 56, 3, 3, '#b02a34'); }
    // 地面与台阶
    R(0, 72, 200, 48, '#b8a48c'); R(0, 72, 200, 1, '#e8d8b8'); for (let k = 0; k < 6; k++) R(0, 76 + k * k * 1.2 + k * 3, 200, 1, '#9a8672'); for (let i = -6; i <= 6; i++) line(100 + i * 16, 73, 100 + i * 40, 120, '#9a8672');
    for (let i = 0; i < 3; i++) { R(112 - i * 5, 80 + i * 4, 70 + i * 10, 4, i % 2 ? '#c8b89c' : '#d8c8ac'); R(112 - i * 5, 80 + i * 4, 70 + i * 10, 1, '#f0e4c8'); }
    R(118, 76, 58, 4, '#a8323c'); R(118, 76, 58, 1, '#f4c542');
    // 光柱
    ctx.globalAlpha = 0.14; for (let k = 0; k < 3; k++) for (let y = 14; y < 120; y++) { const u = (y - 14) / 106; R(44 + k * 8 + u * (12 + k * 4), y, 16 + u * 24, 1, '#fff2c8'); } ctx.globalAlpha = 1;
    const D2 = ART.dims.fighter;
    ctx.drawImage(ART.fighter('mu', 'stand0', true), 148 - (D2.w - 1 - D2.ax), 80 - D2.ay);
    ctx.drawImage(ART.fighter('jian', 'stand0', true), 172 - (D2.w - 1 - D2.ax), 78 - D2.ay);
    const s = ART.sit(look, 0, { gray: false }); ctx.drawImage(s, 62, 104 - s.height);
    // 撕碎的婚书
    for (const [x, y, w] of [[104, 60, 3], [112, 70, 2], [98, 78, 3], [118, 86, 2], [108, 94, 3], [92, 90, 2], [124, 66, 2]]) { R(x, y, w, 2, '#fff6e0'); R(x, y + 1, 1, 1, '#c8323c'); }
    crowd([8, 24, 40, 6, 22], 96, ['#2a1826', '#3a2030', '#241424']); crowd([196, 182, 190], 98, ['#2a1826', '#3a2030']);
  },
  // 三、破庙里，月光照着一枚戒指
  look => {
    R(0, 0, 200, 120, '#12101e'); vgrad(0, 0, 200, 80, ramp(['#0e0c1a', '#1a1830', '#262444'], 5), 0.34);
    // 破屋顶的窟窿与月
    R(84, 0, 46, 16, '#263466'); disc(112, 6, 6, '#f4f6ff'); R(84, 14, 8, 3, '#1a1830'); R(120, 12, 10, 4, '#1a1830'); line(84, 0, 92, 16, '#3a3458', 2); line(130, 0, 122, 14, '#3a3458', 2);
    for (const [x, w] of [[0, 30], [44, 34], [140, 28], [176, 24]]) { R(x, 10 + (x % 7), w, 3, '#2e2a48'); R(x, 10 + (x % 7), w, 1, '#4a4468'); }
    // 柱与残像
    for (const x of [22, 178]) { R(x - 5, 14, 10, 86, '#3a2a34'); R(x - 5, 14, 3, 86, '#5a3e48'); R(x - 7, 96, 14, 5, '#3a3458'); }
    line(150, 16, 168, 98, '#3a2a34', 6); R(60, 44, 34, 42, '#2e2a48'); disc(77, 40, 11, '#2e2a48'); R(64, 50, 4, 30, '#3e3a5c'); disc(74, 37, 8, '#3e3a5c'); R(56, 84, 44, 8, '#3a3458'); R(56, 84, 44, 1, '#55506e');
    // 地面
    R(0, 98, 200, 22, '#221e34'); R(0, 98, 200, 1, '#3e3a5c'); const r = seeded(4); for (let i = 0; i < 26; i++) { const x = r() * 200, y = 101 + r() * 17; R(x, y, 2 + r() * 4, 1, i % 2 ? '#34304a' : '#16142a'); }
    // 月光
    for (let y = 16; y < 110; y++) { const k = (y - 16) / 94, x0 = 88 - k * 14, x1 = 126 + k * 26; ctx.globalAlpha = 0.2; dR(x0, y, x1 - x0, 1, '#b8c8ff', y < 98 ? 6 : 10); } ctx.globalAlpha = 1;
    ellipse(120, 106, 30, 5, '#4a4a78'); ellipse(120, 106, 22, 3, '#6a6aa0');
    // 蛛网
    for (let k = 0; k < 5; k++) line(27, 14, 27 + 18 * Math.cos(k * 0.4), 14 + 18 * Math.sin(k * 0.4), '#55506e'); for (const rr of [7, 13]) for (let k = 0; k < 4; k++) line(27 + rr * Math.cos(k * 0.4), 14 + rr * Math.sin(k * 0.4), 27 + rr * Math.cos((k + 1) * 0.4), 14 + rr * Math.sin((k + 1) * 0.4), '#55506e');
    // 戒指
    glow(120, 103, 16, '#7fe0f0', 0.7); R(117, 101, 6, 1, '#fff2a8'); R(116, 102, 1, 3, '#f4c542'); R(123, 102, 1, 3, '#a8742a'); R(117, 105, 6, 1, '#a8742a'); R(119, 99, 3, 2, '#7fe0f0'); R(119, 99, 1, 1, '#ffffff');
    for (const [x, y] of [[108, 60], [126, 44], [116, 76], [132, 84], [104, 88], [122, 30]]) R(x, y, 1, 1, '#e8f0ff');
    const s = ART.sit(look, 0); ctx.drawImage(s, 60, 110 - s.height);
  },
  // 四、晨光里，老祖现身
  look => {
    vgrad(0, 0, 200, 96, ramp(['#2c3878', '#7a62a4', '#e89a9c', '#ffcf9a', '#fff0c0'], 6), 0.34);
    disc(118, 84, 16, '#fff6d0'); glow(118, 84, 30, '#ffd88a', 0.6);
    paintRidge(ridgeLine(11, 200, 78, 30, 3, 2), 104, '#a48ebc', '#ffdccc');
    paintRidge(ridgeLine(14, 200, 92, 20, 5, 1.5), 112, '#78689e', '#f0c4b8');
    for (let i = 0; i < 7; i++) ctx.drawImage(cloudSprite(20 + i, 24 + (i * 9 % 16), '#fff6e8', '#f8d8cc', '#d8b0c0'), i * 32 - 18, 98 + (i * 5 % 8));
    R(0, 112, 200, 8, '#f8d8cc');
    // 崖
    rock(0, Array.from({ length: 84 }, (_, x) => Math.round(92 + (x > 60 ? (x - 60) * (x - 60) * 0.045 : 0) + Math.sin(x * 0.5) * 1.2)), 120, ['#3e3a5c', '#5a5478', '#7c7698', '#a8a2c0'], 6, { moss: G.moss });
    pine(10, 93, 30, ['#22405a', '#3a6a62', '#6a9a78']);
    const st = ART.standRealm(look, 0, 0); ctx.drawImage(st, 44, 93 - st.height);
    // 戒中飘出的魂烟与老祖
    for (let i = 0; i < 22; i++) { const k = i / 21, x = 66 + k * 56 + Math.sin(k * 7) * 3, y = 78 - k * 30 - Math.sin(k * 3.14) * 6; ctx.globalAlpha = 0.25 + k * 0.4; dR(x - 2 - k * 4, y - 2 - k * 3, 5 + k * 9, 4 + k * 7, '#c0dcff', 8); } ctx.globalAlpha = 1;
    glow(140, 40, 30, '#8fd0ff', 0.45); R(64, 77, 2, 2, '#7fe0f0');
    ctx.drawImage(ART.portrait('elder', 'joy'), 116, 12);
    for (const [x, y] of [[104, 30], [170, 22], [176, 52], [108, 58], [160, 8]]) { R(x, y, 1, 1, '#ffffff'); R(x - 1, y, 3, 1, 'rgba(255,255,255,0.5)'); R(x, y - 1, 1, 3, 'rgba(255,255,255,0.5)'); }
    if (ART.drawCrane) ART.drawCrane(30, 26, 0);
  },
];
// 开场四格画：n = 0～3，200×120。look 可传主角的 { hair, skin, f }
ART.introPanel = function (n, look) {
  n = Math.max(0, Math.min(3, n | 0)); look = look || ME0;
  return cached(['intro', n, look.hair, look.skin, look.f ? 1 : 0].join('|'), () => on(mk(200, 120), () => { INTRO[n](look); frameEdge(); }));
};

// ---------- 章末结算底图、轮回殿背景 200×120 ----------
const BACKDROP = {
  // 宣纸上的淡墨远山与一轮朱日
  chapter: () => {
    R(0, 0, 200, 120, '#efe3c4'); const r = seeded(12); for (let i = 0; i < 160; i++) R(r() * 200, r() * 120, 1 + r() * 3, 1, i % 2 ? '#e6d8b4' : '#f6ecd0');
    disc(160, 30, 13, '#e8a08a'); disc(160, 30, 11, '#d8605a'); dR(146, 30, 30, 14, '#efe3c4', 6);
    paintRidge(ridgeLine(31, 200, 76, 30, 3, 2), 104, '#b8ac98', '#efe3c4', { lit: '#c8bca4', dark: '#a89c88' });
    paintRidge(ridgeLine(37, 200, 92, 22, 5, 1.5), 116, '#8a8478', '#e6d8b4', { lit: '#a8a090', dark: '#6e6860' });
    dR(0, 100, 200, 20, '#efe3c4', 8); R(0, 114, 200, 6, '#e6d8b4');
    for (const [x, y] of [[30, 40], [44, 34], [56, 42]]) { R(x, y, 4, 1, '#7a6650'); R(x + 1, y - 1, 2, 1, '#7a6650'); R(x + 4, y + 1, 3, 1, '#7a6650'); }
    for (const y of [3, 116]) { R(4, y, 192, 1, '#b98a4c'); } R(4, 5, 192, 1, '#dccca4'); R(4, 114, 192, 1, '#dccca4');
  },
  // 轮回殿：幽蓝大殿里一座缓缓转动的命轮
  samsara: () => {
    vgrad(0, 0, 200, 120, ramp(['#060612', '#101030', '#1e1a4a', '#2e2460'], 6), 0.34);
    const r = seeded(21); for (let i = 0; i < 70; i++) { const b = r(); R(r() * 200, r() * 90, 1, 1, b > 0.7 ? '#ffffff' : b > 0.4 ? '#9aa2dc' : '#55508a'); }
    glow(100, 52, 44, '#6a3aa8', 0.5); glow(100, 52, 26, '#f4c542', 0.35);
    for (let i = 0; i < 96; i++) { const a = i * Math.PI / 48; for (const [rr, c] of [[38, '#a8742a'], [37, '#f4c542'], [30, '#6a5aa0'], [14, '#f4c542']]) R(100 + Math.cos(a) * rr, 52 + Math.sin(a) * rr, 1, 1, c); }
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, x = 100 + Math.cos(a) * 34, y = 52 + Math.sin(a) * 34; line(100 + Math.cos(a) * 15, 52 + Math.sin(a) * 15, 100 + Math.cos(a) * 30, 52 + Math.sin(a) * 30, '#4a3e80'); disc(x, y, 3, INK); disc(x, y, 2, i % 3 ? '#8a7ac8' : '#fff2a8'); R(x - 1, y - 1, 1, 1, '#ffffff'); }
    disc(100, 52, 8, '#1e1a4a'); disc(100, 52, 6, '#f4c542'); disc(99, 51, 3, '#fff2a8');
    for (const x of [14, 40, 160, 186]) { const h = x < 30 || x > 170 ? 104 : 86; R(x - 5, 110 - h, 10, h, '#2a2456'); R(x - 5, 110 - h, 3, h, '#4a4488'); R(x + 3, 110 - h, 2, h, '#16122e'); R(x - 7, 106 - h, 14, 4, '#3a3470'); R(x - 7, 106, 14, 4, '#3a3470'); R(x - 1, 114 - h, 2, 10, '#f4c542'); }
    R(0, 110, 200, 10, '#16122e'); R(0, 110, 200, 1, '#4a4488'); for (let i = -7; i <= 7; i++) line(100 + i * 12, 111, 100 + i * 20, 120, '#2a2456'); ctx.globalAlpha = 0.25; dR(70, 111, 60, 9, '#f4c542', 6); ctx.globalAlpha = 1;
    ellipse(100, 108, 26, 4, '#3a3470'); ellipse(100, 107, 22, 3, '#6a5aa0'); for (let i = 0; i < 7; i++) { R(80 + i * 6, 102, 4, 4, '#c27dff'); R(81 + i * 6, 101, 2, 1, '#f0dcff'); }
  },
};
// 结算 / 轮回底图 200×120。kind：'chapter' 章末结算 | 'samsara' 轮回殿
ART.backdrop = function (kind) { return BACKDROP[kind] ? cached('bd|' + kind, () => on(mk(200, 120), BACKDROP[kind])) : null; };

// ---------- 场景两侧延伸：逻辑宽大于 200 时，把 200 宽的场景居中画好后调用，用边缘镜像补满两侧 ----------
// 用法：画布宽 W（200～216，按 1:1 逻辑像素），先 ctx.translate((W-200)/2, 0) 画洞府 / 历练 / 舞台，再 ART.extendSides(W)。
// 宽度不足 200（最少 180）时不需要调用，直接居中裁掉两侧即可。
ART.extendSides = function (W2) {
  const m = Math.ceil((W2 - 200) / 2), c = ctx.canvas; if (m <= 0) return;
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.setTransform(-1, 0, 0, 1, 2 * m, 0); ctx.drawImage(c, m, 0, m, c.height, m, 0, m, c.height);
  ctx.setTransform(-1, 0, 0, 1, 2 * (m + 200), 0); ctx.drawImage(c, 200, 0, m, c.height, 200, 0, m, c.height);
  ctx.restore();
};

// ====================================================================
// 阶段三新增资产（SYSTEMS v2 / CONTENT v2）。规则同阶段二：INK 描边、左上光源、单图 ≤16 色
// ====================================================================
// ---------- 一、法宝 ----------
// ART.item('r', tier 1～7)            → 16×16 法衣（一阶一形：布袍→道袍→广袖→八卦衣→羽衣→披帛仙衣→混沌）
// ART.item('o', tier 1～7, kind)      → 16×16 饰品。kind：0|'cul' 修炼（玉佩）1|'gold' 财运（铜钱）2|'luck' 气运（符）3|'life' 寿元（长命锁）
// ART.item('boss', k 0～10)           → 16×16 首领专属法宝（顺序同 L.BOSSES）
// ART.affix(name)                     → 8×8 词条小记号；name 为词条中文名（锋锐…养气，克金～克土）或 0～15
// ART.icon('ore' | 'gscroll')         → 灵矿、器方
// ART.drawForge(x, y, k, kind)        → 强化特效，画在当前 ctx；k 0～1 进度；kind 'hit' 锤击火星 | 'ok' 成功 | 'fail' 失败
// 均走 cached()，同参数只画一次
const EL_C = { jin: '#f4c542', mu: '#62d26f', shui: '#4aa8ff', huo: '#e8483a', tu: '#b98a4c' };
Object.assign(ICONS, {
  ore: '....sss/...sttts..c/..sttSttswcC/..stSSttScCd/.sttSttSSCd/.stttttSSSs/sttcttSSttSs/stwcCtSttSSS/sSccCdSSSSS/.SSCdSSSSS/..SSSSSS',
  gscroll: '.oO........oO/.yynnnnnnnnyy/.yYnnnnsnnnyY/.oOnnnswnnnoO/..nnnnswnnn/..nnnnswnnn/..nnnyyyynn/..nnnnoOnnn/.oOnnnoOnnnoO/.yynnnnnnnnyy/.yYnnnnnnnnyY/.oO........oO',
  boss0: '.........ww/........wwnw/........wnnW/.......wwnW/.......wnnW/......wwnW/......wnW/..ss.wwW/...sstW/...ost/..oO.ss/.oO/rO',
  boss1: '....tttt/...twwwwt/.ootwttwtts/..oOtttttSs/...oOtttSS/..twoOtSS/..tttoOS/..sSS.oO/.......oO/....rr..oO/....r....oO/....r.....O',
  boss2: '...jjjjjjj/...jwjjjjJ/....JJJJJ/.....jjJ/.....jjJ/...nnnnnnN/...nrrrrnN/...nnrrnnN/.....jjJ/.....jjJ/.....jJ/.....jJ/......J',
  boss3: '.........r.r/........ryyr/.......ryhyyr/........yhyr/........yyR/.......rRy/......rR/.....rR/....rR/...yrR/..yhy/.yhy/..y',
  boss4: '..........R/........RRr/.......Rrpr/......Rrpr.r/.....Rrpr/....Rrpr.r/...Rrpr/.k.Rrr..r/.kkRr/..kk/.kSkk/kS..k/S',
  boss5: '.....yy/.....oO/.....oO/..ssssssss/..SgSttSSS/.....tS/....gtS/....ggS/.....tS/.....tSg/.....tS/.....tS/......S',
  boss6: '.....yy/....y..y/.....yy/....vvvv/...vwvvvV/...vwvvvV/..vvwvvvVV/..vvvvvvVV/.vvvvvvvvVV/.yyhyyyyyYY/.....cc/..c..cC..c',
  boss7: '.bbbbbbbbbbb/bwwbBbbBbbBB/bwbbbBbbBbBB/bbBbbByBbbBB/bbbBbyhyBbBB/bbBbbByBbbBB/bbbBbbBbbBBB/.bBbbBbbBbB/.bbbBbbBbBB/..bBbbBbBB/...bbBbBB/....bBBB/.....BB',
  boss8: '......w/..w..VVVV..w/....VvvvvV/...VvvwvvvV/...VvwhwvvV/..wVwhhhwVw/...VvwhwvvV/...VvvwvvVV/....VvvvVV/..w..VVVV..w/......w',
  boss9: '......w/.....wwt/.s...wt...s/.st..wt..tS/.stt.wt.ttS/..sttwtttS/...ssttSS/.....yY/..rr.oO/..r..oO/.....oO/.....oO/.....oO',
  boss10: '.........v.w/........vvb/.......vbb/......bbc/.....ccg..c/....cgg/...ggy/.k.gyy/.kkyr/..kk/.kSkk/kS..k/S',
});
// 法衣：在 16×16 上按阶叠加
function robeIcon(t) {
  const q = QCOL[Math.min(5, t - 1)], c = tone(q, hs(q, 0.62), lerpC(q, '#ffffff', 0.6)), b = new Buf(16, 16), wide = t >= 3;
  if (t >= 6) b.add(L => L.mir(T => { T.l(1, 9, 0, 5, PINK); T.l(0, 4, 2, 1, PINK); T.l(1, 10, 2, 14, PINK); }), { flat: 1 }); // 披帛
  if (t === 5 || t === 7) b.add(L => L.mir(T => { T.l(4, 3, 1, 0, WHITE, 2); T.l(3, 4, 0, 3, WHITE); })); // 羽肩
  b.add(L => { L.r(wide ? 1 : 2, 3, wide ? 14 : 12, 3, c); L.mir(T => T.r(wide ? 1 : 2, 6, 3, wide ? 4 : 2, c)); L.r(5, 3, 6, 7, c); L.sy(10, wide ? '45566' : '44555', c, 8); });
  b.r(7, 2, 2, 1, '#f6f2fa'); b.p(6, 3, '#f6f2fa'); b.p(9, 3, '#f6f2fa'); b.p(7, 4, '#f6f2fa'); b.p(8, 4, hs(q, 0.62)); b.p(7, 3, '#f2c9a0'); b.p(8, 3, '#f2c9a0');
  b.hl(5, 10, 9, t >= 4 ? '#f4c542' : t >= 2 ? '#f6f2fa' : '#7a5230'); b.p(8, 9, t >= 4 ? '#d8404a' : '#b98a4c');
  if (t === 1) { b.r(9, 11, 2, 2, hs(q, 0.62)); b.p(3, 5, hs(q, 0.62)); }
  if (t >= 2) b.mir(T => T.hl(wide ? 1 : 2, wide ? 3 : 4, wide ? 9 : 7, '#f6f2fa'));
  if (t >= 3) b.mir(T => { T.p(4, 3, '#f4c542'); T.p(5, 3, '#f4c542'); });
  if (t >= 4) { b.hl(4, 11, 14, '#f4c542'); b.r(7, 6, 2, 2, '#f6f2fa'); b.p(8, 6, INK); b.p(7, 7, INK); }
  if (t >= 6) { b.r(7, 6, 2, 2, '#fff2a8'); b.p(7, 5, '#fff2a8'); b.p(8, 8, '#fff2a8'); b.p(6, 7, '#fff2a8'); b.p(9, 6, '#fff2a8'); b.p(7, 12, '#ffffff'); b.p(9, 12, '#ffffff'); }
  return b;
}
// 饰品：四种各一个轮廓，阶数换色并逐级加饰
const ORN_K = { cul: 0, gold: 1, luck: 2, life: 3 };
function ornIcon(t, k) {
  const q = QCOL[Math.min(5, t - 1)], c = tone(q, hs(q, 0.62), lerpC(q, '#ffffff', 0.6)), b = new Buf(16, 16), hi = t >= 4;
  if (k === 0) { // 玉佩：红绳、环形玉、流苏
    b.r(7, 0, 2, 3, '#d8404a'); b.add(L => { L.e(8, 7.5, 5.5, 5, c); L.r(7, 6, 2, 3, null); }); b.r(7, 6, 2, 3, null);
    b.add(L => L.r(7, 12, 2, 4, RED)); b.p(6, 15, '#d8404a'); b.p(9, 15, '#d8404a');
    if (hi) { b.p(4, 5, '#ffffff'); b.r(6, 3, 4, 1, '#f4c542'); b.r(7, 12, 2, 1, '#f4c542'); }
  } else if (k === 1) { // 铜钱：圆钱方孔、红绳结
    b.add(L => { L.e(8, 9, 6, 6, c); L.r(6, 7, 4, 4, null); });
    b.add(L => { L.r(7, 0, 2, 4, RED); L.r(5, 1, 6, 2, RED); }, { sep: 1 });
    if (hi) { b.r(5, 6, 6, 1, '#f4c542'); b.r(5, 11, 6, 1, '#a8742a'); b.r(5, 7, 1, 4, '#f4c542'); b.r(10, 7, 1, 4, '#a8742a'); if (t >= 6) { b.p(8, 4, '#fff2a8'); b.p(7, 13, '#fff2a8'); b.p(3, 9, '#fff2a8'); b.p(12, 8, '#fff2a8'); } }
    else b.p(4, 6, '#ffffff');
  } else if (k === 2) { // 符：黄纸朱字，下端尖，高阶镶边
    b.add(L => { L.r(4, 1, 8, 12, hi ? c : '#f4e08a'); L.sy(13, '321', hi ? c : '#f4e08a', 8); });
    const ink = hi ? '#ffffff' : '#d8404a'; b.hl(6, 9, 3, ink); b.r(7, 4, 2, 7, ink); b.hl(5, 10, 6, ink); b.p(6, 9, ink); b.p(9, 9, ink); b.hl(6, 9, 11, ink);
    if (!hi) b.r(4, 1, 8, 1, c); else { b.r(4, 1, 8, 1, '#f4c542'); b.p(7, 14, '#f4c542'); b.p(8, 14, '#f4c542'); }
  } else { // 长命锁：链、如意形锁身、三枚铃
    b.mir(T => { T.l(7, 0, 3, 4, '#c8c4d8'); T.p(3, 5, '#c8c4d8'); });
    b.add(L => { L.sy(6, '6777652', c, 8); L.mir(T => T.r(1, 6, 2, 2, c)); });
    b.r(7, 7, 2, 3, hi ? '#f4c542' : '#ffffff'); b.hl(6, 9, 8, hi ? '#f4c542' : '#ffffff');
    for (const x of [4, 8, 11]) { b.p(x, 13, '#c8c4d8'); b.r(x - (x === 8 ? 1 : 0), 14, x === 8 ? 2 : 1, 2, '#f4c542'); }
  }
  return b;
}
function rainbow(b, q) { const rb = ['#ff6b6b', '#ffb23f', '#f4e04a', '#62d26f', '#4aa8ff', '#c27dff'], D = hs(q, 0.62), H = lerpC(q, '#ffffff', 0.6); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const c = b.at(x, y); if (c === q || c === D) b.p(x, y, rb[(x + y) % 6]); else if (c === H) b.p(x, y, '#ffffff'); } return b; }
{
  const item0 = ART.item;
  ART.item = function (kind, tier, sub) {
    if (kind === 'boss') return ART.icon('boss' + Math.max(0, Math.min(10, tier | 0)));
    if (kind !== 'r' && kind !== 'o') return item0(kind, tier);
    tier = Math.max(1, Math.min(7, tier | 0)); const k = kind === 'o' ? (typeof sub === 'string' ? ORN_K[sub] | 0 : (sub | 0) & 3) : 0;
    return cached('item|' + kind + tier + k, () => { const b = kind === 'r' ? robeIcon(tier) : ornIcon(tier, k); if (tier === 7) rainbow(b, QCOL[5]); return b.cv(); });
  };
}
ART.ornKinds = ['cul', 'gold', 'luck', 'life'];
// 词条记号 8×8
const AFFIX = {
  '锋锐': '....ww/...wwW/..wwW/.wwW/wwW/wW', '嗜血': '..r/..r/.rrr/rprrR/rrrrR/.rRR',
  '克金': 0, '克木': 0, '克水': 0, '克火': 0, '克土': 0,
  '藏锋': '....oo/...oO/..oO/.oO/yO/.y', '护主': 'bbbbbb/bwbbBB/bbbbBB/bbbbBB/.bbBB/..BB', '镇劫': 'ssssss/...yy/..yy/.yyyy/...yy/..y',
  '轻灵': '....ww/..wwwW/.wwwW/.wwW/wWW/s', '聚财': '.yyyy/yhyyyY/yyKKyY/yyKKyY/yyyyYY/.YYYY', '寻珍': '.cccc/cwccCd/cccCCd/.cCCd/..Cd/..d',
  '采灵': '...ggl/.gglgG/gglgG/ggGG/gG/G', '通灵': '/.vvvv/vwKKwv/vwKKwv/.vvvv', '养气': '.jjjj/j....j/j.jj.j/j.j..j/j..jj/.jj',
};
ART.affixNames = () => Object.keys(AFFIX);
ART.affix = function (name) {
  if (typeof name === 'number') name = Object.keys(AFFIX)[name];
  if (!(name in AFFIX)) return null;
  return cached('affix|' + name, () => {
    const el = { '金': 'jin', '木': 'mu', '水': 'shui', '火': 'huo', '土': 'tu' }[name[1]];
    return new Buf(8, 8).m(1, 1, (AFFIX[name] || '.xxxK/xxxKxx/xxKxxx/xKxxxx/Kxxxxx/.xxxx').split('/'), Object.assign({}, IPAL, { x: EL_C[el], K: name[0] === '克' ? '#ffffff' : INK })).cv();
  });
};
ART.drawForge = function (x, y, k, kind) {
  x = Math.round(x); y = Math.round(y); k = Math.max(0, Math.min(1, k));
  if (kind === 'ok') {
    glow(x, y, 6 + k * 12, '#fff2a8', 0.8 * (1 - k)); const r = 3 + k * 13;
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; R(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8, 1, 1, i % 2 ? '#f4c542' : '#ffffff'); }
    for (let i = 0; i < 5; i++) { const a = i * 1.26 - 1.2, d = 5 + k * 12, px = Math.round(x + Math.cos(a) * d), py = Math.round(y + Math.sin(a) * d - k * 4), s = k < 0.7 ? 2 : 1; R(px - s, py, s * 2 + 1, 1, '#fff2a8'); R(px, py - s, 1, s * 2 + 1, '#fff2a8'); R(px, py, 1, 1, '#ffffff'); }
    if (k < 0.5) { R(x - 3, y - 9 - k * 6, 7, 1, '#62d26f'); R(x, y - 12 - k * 6, 1, 7, '#62d26f'); }
  } else if (kind === 'fail') {
    ctx.globalAlpha = 1 - k; for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.4, d = 2 + k * 9; disc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7 - k * 5, 3 - (k * 2 | 0), i % 2 ? '#928ea8' : '#55506e'); } ctx.globalAlpha = 1;
    if (k < 0.6) for (const [dx, dy] of [[0, -4], [-1, -3], [1, -2], [0, -1], [-1, 0], [0, 1], [1, 2], [0, 3]]) R(x + dx, y + dy, 1, 1, '#d8404a');
  } else {
    if (k < 0.3) { disc(x, y, 2, '#ffffff'); glow(x, y, 7, '#ffb23f', 0.6); }
    for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.1 + i * 0.1), v = 9 + (i * 7 % 5) * 2, px = x + Math.cos(a) * v * k, py = y + Math.sin(a) * v * k + k * k * 9; R(px, py, 1, k < 0.5 ? 2 : 1, k < 0.35 ? '#ffffff' : k < 0.7 ? '#fff2a8' : '#ff8a3a'); }
  }
};

// ---------- 二、历法、天下大势、坊市与拍卖 ----------
// 全部是 ART.icon(name) 的 16×16 图标：
//   四季 s0 春 s1 夏 s2 秋 s3 冬（也可 ART.season(0～3)）
//   天下大势 w_shouchao w_lingchao w_danhui w_kuangmai w_mojie w_liuxing w_dahan w_xianfu w_shanglu w_jiangdao w_tongji w_taiping（id 同 CONTENT §8，ART.worldIds()）
//   坊市 feed 兽粮 token 秘境令 yin_f yin_i yin_t yin_w yin_s 药引（火冰雷木魂）frag 功法残篇
//   拍卖 gavel 拍槌 paddle 号牌 bid1 bid2 bid3 三档出价；行情 down 跌 flat 平（涨用已有的 up）sell 出售
// ART.calStrip(t, marks) → 194×20 年历条：24 格（每格 8 宽，第 i 格左缘 x = 1 + 8i），第 0 格是当前周天，底色按季节；
//   marks = [{ at: 0～23, len: 1, kind: 'dao' 论道 | 'auc' 拍卖 | 'war' 会武 | 'realm' 秘境 | 'world' 大势 }]，不缓存（每次新画）
Object.assign(IPAL, { f: '#f7a3bd', F: '#c8607e', m: '#ffb23f', M: '#c8622a', u: '#b8c0f0', U: '#6a72b8', i: '#d4ecff', q: '#3a2a4a' });
Object.assign(ICONS, {
  s0: '.....fff/....fwfff/.ff.ffffF.ff/fwfffyyFffwff/fffffyyyffffF/.fFFfyyfFfFF/...ffffffff/..fwfff.fwff/..ffffF.fffF/...fFF...FF.g/......G....gG/......GgggG/......G',
  s1: '......y/.y....y....y/..y.......y/....yyyyy/...yhhyyyY/...yhyyyyY/yy.yhyyyyY.yy/...yyyyyyY/...yyyyyYY/....YYYYY/..y.......y/.y....y....y/......y',
  s2: '......m/.....mmm/..m..mmm..m/..mm.mmm.mm/.mmmmmrmmmmm/..mmmmrmmmmM/mmmmmrrrmmmmM/.mmmmmrmmmMM/..mmMmrmMMM/...MM.r.MM/......o/.....o',
  s3: '......w/....w.w.w/.w...www...w/..w...w...w/.www..w..www/....wwiww/wwwwwiiiwwwww/....wwiww/.www..w..www/..w...w...w/.w...www...w/....w.w.w/......w',
  w_shouchao: '...rr....rr/..rrrR..rrrR/..rrRR..rrRR/rr.RR....RR.rr/rrR........rrR/rRR..rrrr..rRR/.R..rrrrrr..R/...rrprrrrR/..rrprrrrrRR/..rrrrrrrrRR/..rrrRRRrrRR/...RR...RRR',
  w_lingchao: '.....w/....www...j/.....w...jjj/..jj....jj.jj/.jjjj..jj...jj/jj..jjjj//..cc....cc/.cccc..cccc..c/cc..cccc..cccc//.CC....CC/CCCC..CCCC..CC',
  w_danhui: '.....rrr/....rprrR/.....rRR/..y........y/.ssssssssssss/..sttttttttS/..stwttttSSS/..sttttyttSS/..stttyyytSS/...sttttSSS/....SSSSSS/...SS....SS',
  w_kuangmai: '...sssss/..stttttss/.st....otts/.......oOts/......oO.tS/.....oO...S/....oO/...oO....cc/..oO....cwcC/.oO....sccCds/.O....sttCdSS/......sSSSSS',
  w_mojie: 'v..........v/vv........vv/vVv......vVv/.vVvvvvvvVv/..vvvvvvvvV/..vKKvvKKvV/..vrKvvrKvV/..vvvvvvvvV/...vvKKvvV/...vwvwvwV/....VVVVV',
  w_liuxing: '..........w/.w......yy/.......yy/......yyh....w/..w..yhh/....yhhyy/...yhwwhy/..yhwwwhyY/..yhwwhyYY..w/..yyhhyYY/...yyyYY/....YYY',
  w_dahan: '....mmmmm/...mhhmmmM/.m.mhmmmmM.m/...mmmmmmM/....MMMMM//oooooooooooooo/oOooooOooooOoo/ooOoooOooooOoo/oOooooOOooOooo/ooOooOooOoOooo/OOOOOOOOOOOOOO',
  w_xianfu: '......yy/....yyyyyy/..yyyYYYYyyy/yyYYYYYYYYYYyy/...nnnnnnnn/...nNrrrrNn/...nNryyrNn/...nNryyrNn/.ww.nnnnnn.ww/wwwwwwwwwwwwww/wWWwwwWWwwwWWw/.WW.WWWWW.WW',
  w_shanglu: 'r...........r/rr..oooo...rr/.rroOooOo.rr/..rr.oo.orr/.oOrr..rrOo/.oo.rrrr.oo/.ooo.rr.ooo/.oo.rrrr.oo/.oOrr.oorrOo/..rroooo.rr/.rr.oooo..rr/rr.........rr',
  w_jiangdao: '......y/..y...y...y/...y.....y//.nnnnn.nnnnn/nnsssnOnsssnN/nnnnnnOnnnnnN/nnsssnOnsssnN/nnnnnnOnnnnnN/nnssnnOnnssnN/nNNNNNONNNNNN/.oooooooooooo',
  w_tongji: '.nnnnnnnnnnn/.nKKKnnKKKnN/.nnnnnnnnnnN/.nnnkkkknnnN/.nnkkkkkknnN/.nnkeeeeknnN/.nnkeKeKknnN/.nnneeeennnN/.nnkkkkkknnN/.nkkkkkkkrrN/.nnnnnnnrRrN/.nNNNNNNNrrN',
  w_taiping: '/.....wwww/....wwwwww/..wwwwWwwwww/.wwwWwwwwWwww/.wwwwwwwwwwww/..WWwwwwwwWW/....WWWWWW//..j...jj...j/.jjj.jjjj.jjj/..J...JJ...J',
  feed: '/.....mm.m/...mmhmmmm/..mhmmmMmmm/.mmmmMmmmhmm/nnnnnnnnnnnnnn/nNNnnnnnnnnNNN/.nnbbnnbbnnNN/.nnnnnnnnnNN/..nnnnnnnNN/...NNNNNNN',
  token: '.....yyyy/....yvvvvy/...yvvvvvvY/..yvvwwwvvvY/..yvwvvvwvvY/..yvvvwwvvvY/..yvvwvvvvvY/..yvvwwwwvvY/..yvvvvvvvvY/...yvvvvvvY/....yyYYYY/.....rr.rr/....rR...rR',
  yin_f: '......r/.....rr/.....rmr/....rmmr..r/...rrmmrr.rr/..rrmmhmrrmr/..rmmhhmmrmr/.rrmhhhhmmrr/.rmmhhwhhmmr/.rmmhwwhhmmR/..rmmhhhmmR/...RRmmmRR',
  yin_i: '......i/.....iwb/....iwwbb/...iwwcbbB/..iwwccbbbB/..iwcccbbbB/..iwccbbbBB/...icbbbBB..i/.i..cbbBB..iwb/iwb..bBB....bB/.bB...B',
  yin_t: '.......yyy/......yhy/.....yhy/....yhyy/...yhhhyyy/..yyyyhhy/.....yhy/....yhy/...yhy...v/...yy...vv/..yy.....v/..y',
  yin_w: '.....gggg/....gl..gg/...gl.gg.gG/...g.gl.g.G/...g.g..g.G/...gG.ggG.G/....gG...GG.l/.....gGGG..lgG/......gG..lgG/......gGggG/......gG/.....GGGG',
  yin_s: '.....uu/....uwwu/....uwwwu/...uwwwwwu/..uwwwwwwwu/..uwKwwKwwu/..uwKwwKwwU/..uwwwwwwwU/...uwwwwwuU/....uwwwuU..u/.....uuuU..uU/......UU',
  frag: '..nnnnnnnn/..nnnnnnnnn/..nKKKnKKnnN/..nnnnnnnnnN/..nKKnKKKnnN/..nnnnnnnnnN/..nKKKKnnn.N/..nnnnnn..n/..nKKnn/..nnn..n/..nn',
  gavel: '...oo/..oOOo/.oOOOOo/..oOOOOo/...oOOOOoo/....oOOo.oo/.....oo...oo/...........oo/............oO/..yyyyyyy/.yhyyyyyyY/.YYYYYYYYY',
  paddle: '....rrrrrr/...rrrrrrrR/..rrrwwrrrrR/..rrwrwrrrrR/..rrrrwrrrrR/..rrrrwrrrrR/..rrrwwwrrRR/...rrrrrrRR/....RRRRRR/......oO/......oO/......oO',
  bid1: '////.....wc/....wccC/....wcCCd/....wcCCd/....cCCdd/.....Cdd',
  bid2: '////..wc....wc/.wccC..wccC/.wcCCd.wcCCd/.wcCCd.wcCCd/.cCCdd.cCCdd/..Cdd...Cdd',
  bid3: '..y...wc...y/.yhy.wccC/..y..wcCCd/.....wcCCd/..wc.cCCdd.wc/.wccC.Cdd.wccC/.wcCCd...wcCCd/.wcCCd...wcCCd/.cCCdd...cCCdd/..Cdd.....Cdd/.yyyyyyyyyyyy/.YYYYYYYYYYYY',
  down: '....rrrrR/....rrrrR/....rrrrR/....rrrrR/....rrrrR/.rrrrrrrrrrR/.RrrrrrrrrrR/..RrrrrrrrR/...RrrrrrR/....RrrrR/.....RrR/......R',
  flat: '///.ssssssssssss/.ssssssssssss/.SSSSSSSSSSSS//.ssssssssssss/.ssssssssssss/.SSSSSSSSSSSS',
  sell: '.........y/.........yy/.....yyyyyyy/.....yyyyyyyy/.....YYYYyyY/..wcc....yY/.wccCd...Y/.wcCCd/wccCCCd/wcCCCdd/.cCCdd/..Cdd',
});
ART.season = k => ART.icon('s' + (((k | 0) % 4 + 4) % 4));
ART.worldIds = () => Object.keys(ICONS).filter(k => k.startsWith('w_'));
const SEASON_C = ['#86d98f', '#f0c86a', '#e8925a', '#b8d4f0'], CAL_C = { dao: '#f4c542', auc: '#c27dff', war: '#d8404a', realm: '#7fe0f0', world: '#4ccb9f' };
ART.seasonColor = k => SEASON_C[k & 3];
ART.seasonOf = t => { const m = ((t % 12) + 12) % 12; return m >= 1 && m <= 3 ? 0 : m <= 6 && m >= 4 ? 1 : m <= 9 && m >= 7 ? 2 : 3; };
ART.dims.cal = { w: 194, h: 20, cw: 8, x0: 1 };
ART.calStrip = function (t, marks) {
  return on(mk(194, 20), () => {
    R(0, 1, 194, 18, INK); R(1, 0, 192, 20, INK);
    for (let i = 0; i < 24; i++) {
      const x = 1 + i * 8, tt = t + i, c = SEASON_C[ART.seasonOf(tt)];
      R(x, 1, 8, 11, c); R(x, 1, 8, 1, lerpC(c, '#ffffff', 0.5)); R(x, 11, 8, 1, hs(c, 0.8)); R(x + 7, 2, 1, 9, hs(c, tt % 12 === 0 ? 0.45 : ART.seasonOf(tt) !== ART.seasonOf(tt + 1) ? 0.62 : 0.86));
      R(x, 12, 8, 7, i % 2 ? '#2e2742' : '#262038');
    }
    R(1, 12, 192, 1, '#1a1528');
    for (const m of marks || []) {
      const c = CAL_C[m.kind] || '#efe3c4', x = 1 + m.at * 8, n = Math.max(1, m.len || 1);
      if (n > 1) { const y = m.kind === 'world' ? 13 : 16, hh = m.kind === 'world' ? 2 : 3; R(x + 1, y, n * 8 - 2, hh, c); R(x + 1, y, n * 8 - 2, 1, lerpC(c, '#ffffff', 0.5)); }
      else { R(x + 2, 3, 4, 7, INK); R(x + 1, 4, 6, 5, INK); R(x + 3, 4, 2, 5, c); R(x + 2, 5, 4, 3, c); R(x + 3, 5, 1, 2, lerpC(c, '#ffffff', 0.6)); R(x + 3, 13, 2, 6, c); }
    }
    R(1, 0, 8, 1, '#f4c542'); R(1, 19, 8, 1, '#f4c542'); R(0, 1, 1, 18, '#f4c542'); R(9, 1, 1, 18, '#a8742a'); R(4, 1, 2, 2, '#f4c542'); R(4, 3, 1, 1, '#f4c542');
  });
};

// ---------- 三、秘境 ----------
// ART.drawRealm(theme, t, OY)      → 秘境背景，画满 200×(160+OY)，小人脚底 y=128（同对决舞台）。theme：'jin' 剑气 | 'mu' 百草 | 'huo' 熔火 | 'shui' 幽泉（ART.realmThemes）
// ART.door(type)                   → 32×40 门卡。type：fight 战 | elite 精英 | chest 宝 | spring 泉 | event 奇 | insight 悟 | shop 商 | boss 守关 | unk ？（也接受这几个汉字；ART.doorTypes）
// ART.drawQiBar(x, y, w, frac, t)  → 气血条（高 7，左端一颗心；低于三成时闪动）
// ART.drawRoomFx(type, x, y, k)    → 进房间后的小动画，k 0～1；type 同门卡，另有 'trap' 陷阱
// ART.icon('spring' | 'wonder' | 'skull') 泉、奇、守关的 16×16 记号
Object.assign(ICONS, {
  spring: '......c/.....cwc/.....cwc/....cwccC/...cwcccCC/...cwccgCC/..ccccgggCC/..cccccgCCC/...cccCCCC/....CCCCC//.cc..ccc..cc/c..cc...cc..c',
  wonder: '......v/......v...w/.....vwv/.....vwv/..vvvwwwvvv/vvwwwwwwwwwvv/..vvvwwwvvv/.....vwv/.w...vwv/www...v/.w....v',
  skull: '.y...yy...y/.yy.yyyy.yy/.yyyyryyyyY/..wwwwwwww/.wwwwwwwwwW/.wKKKwwKKKW/.wKrKwwKrKW/.wwwwKKwwwW/..wwwwwwwW/..wKwKwKwW/...WWWWWW',
});
// 洞顶：两端压低成洞口，垂着钟乳
function caveTop(seed, base, amp, c, rim) {
  const a = ridgeLine(seed, 200, 0, amp, 6, 1.3), r = seeded(seed), hh = x => Math.round(base - a[x] + Math.max(0, 18 - Math.min(x, 199 - x)) * 2.4);
  for (let x = 0; x < 200; x++) { const y = hh(x); R(x, -90, 1, 90 + y, c); R(x, y, 1, 1, rim); dR(x, y - 3, 1, 3, rim, 4); }
  for (let i = 0; i < 11; i++) { const x0 = Math.floor(8 + r() * 184), len = 5 + r() * 15, w = 1 + r() * 2.5, y0 = hh(x0); for (let k = 0; k < len; k++) { const ww = Math.round(w * (1 - k / len)); R(x0 - ww, y0 + k, ww * 2 + 1, 1, c); R(x0 - ww, y0 + k, 1, 1, rim); } }
}
function floorLines(y, c) { for (let k = 0; k < 6; k++) R(0, y + 2 + Math.round(k * k * 0.9 + k * 2), 200, 1, c); for (let i = -8; i <= 8; i++) line(100 + i * 14, y + 1, 100 + i * 34, 160, c); }
Object.assign(STAGES, {
  // 剑气·金：插满巨剑的石窟，尽头一线金光
  r_jin: {
    sky: ['#1a1e3a', '#3a4670', '#8a8aa8', '#e8d8a8', '#fff6d0'],
    build() {
      glow(100, 116, 40, '#fff2a8', 0.5);
      paintRidge(ridgeLine(101, 200, 98, 30, 6, 2.4), 122, '#6a6a90', '#e8d8b0');
      const far = ['#6a7090', '#8a92b0', '#c8d0e8'], near = ['#3a3e5a', '#6a7090', '#b8c0d8'];
      for (const [x, l, tl] of [[34, 44, 0.08], [66, 30, -0.1], [128, 34, 0.12], [160, 50, -0.06], [96, 22, 0.02]]) swordProp(x, 122, l, tl, far, ['#8a7a5a', '#c8b078']);
      caveTop(103, 34, 22, '#1a1830', '#4a4a78');
      R(0, 122, 200, 38, '#8a8aa2'); R(0, 122, 200, 1, '#d8d8e8'); floorLines(122, '#6e6e88'); dR(0, 122, 200, 5, '#b8b8cc', 6); dR(0, 148, 200, 12, '#4a4a68', 6);
      ellipse(100, 133, 58, 7, '#a8a08a'); ellipse(100, 133, 54, 6, '#8a8aa2'); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(100 + Math.cos(a) * 44, 133 + Math.sin(a) * 4.5, 2, 1, '#f4c542'); }
      for (const [x, l, tl] of [[9, 62, 0.1], [24, 34, -0.14], [178, 40, 0.12], [192, 66, -0.08]]) { swordProp(x, 136 + (l > 50 ? 8 : 0), l, tl, near, ['#a8742a', '#f4c542']); ellipse(x, 137 + (l > 50 ? 8 : 0), 5, 1, '#55556e'); }
    },
    fx(t) {
      for (let i = 0; i < 7; i++) { const k = ((t * 0.03 + i * 37) % 150), x = (i * 61 + k * 0.6) % 200, y = 118 - k * 0.6; ctx.globalAlpha = Math.min(1, k / 20) * (1 - k / 150); line(x, y, x + 4, y - 4, i % 2 ? '#fff2a8' : '#ffffff'); } ctx.globalAlpha = 1;
      glow(100, 120, 24, '#fff2a8', 0.25 + Math.sin(t / 600) * 0.08);
    },
  },
  // 百草·木：垂藤、巨蕈与发光的灵草
  r_mu: {
    sky: ['#0e2a2a', '#1e5a4a', '#4a9a6a', '#a8e08a', '#e8ffc0'],
    build() {
      paintRidge(ridgeLine(111, 200, 96, 24, 5, 1.4), 122, '#3a8a6a', '#c8f0a8', { trees: '#2a6e5a' });
      for (const [x, r0] of [[30, 9], [58, 6], [142, 7], [170, 10]]) roundTree(x, 123, r0, ['#2a6a4a', '#3f8a5a', '#7ac870'], '#3a4a44');
      caveTop(113, 30, 20, '#0e2420', '#3a7a4a');
      const r = seeded(31); for (let i = 0; i < 16; i++) { const x = Math.floor(6 + r() * 188), l = 14 + r() * 40; for (let k = 0; k < l; k++) { const px = x + Math.round(Math.sin(k / 6 + i) * 1.5); R(px, 20 + k, 1, 1, k % 5 ? '#2f6e4b' : '#62b25a'); if (k % 7 === 3) R(px + (k % 2 ? 1 : -1), 20 + k, 1, 1, '#a8e08a'); } }
      R(0, 122, 200, 38, '#3a7a4a'); R(0, 122, 200, 1, '#a8e08a'); dR(0, 123, 200, 3, '#62b25a', 8); dR(0, 146, 200, 14, '#1e4a3a', 8);
      ellipse(100, 133, 70, 7, '#6a6a4a'); ellipse(100, 132, 66, 5, '#8a8658'); dR(34, 130, 132, 6, '#a8a070', 4);
      for (let i = 0; i < 40; i++) { const x = r() * 200, y = 124 + r() * 34; if (Math.abs(x - 100) < 64 && y > 127 && y < 139) continue; R(x, y, 1, 2, '#62b25a'); if (i % 4 === 0) R(x, y - 1, 1, 1, ['#f7a3bd', '#fff2a8', '#ffffff'][i % 3]); }
      // 巨蕈与灵芝
      for (const [x, y, w, c] of [[16, 126, 11, '#d8404a'], [186, 128, 13, '#c27dff'], [40, 146, 8, '#4ccb9f'], [164, 148, 7, '#ffb23f']]) { R(x - 1, y - w + 2, 3, w - 2, '#efe3c4'); R(x + 1, y - w + 2, 1, w - 2, '#c8b48c'); ellipse(x, y - w, w, Math.round(w / 2.4), c); ellipse(x - 1, y - w - 1, w - 2, Math.round(w / 3.4), lerpC(c, '#ffffff', 0.3)); R(x - w, y - w + 1, w * 2 + 1, 1, hs(c, 0.6)); R(x - w / 2, y - w - 1, 2, 1, '#ffffff'); R(x + w / 3, y - w, 1, 1, '#ffffff'); }
    },
    fx(t) {
      for (let i = 0; i < 12; i++) { const x = (i * 53 + Math.sin(t / 900 + i) * 9 + 200) % 200, y = 60 + (i * 17 % 70) + Math.sin(t / 600 + i * 2) * 4, a = 0.5 + Math.sin(t / 250 + i * 1.3) * 0.5; if (a < 0.2) continue; ctx.globalAlpha = a; R(x, y, 1, 1, '#eaffb0'); glow(x, y, 3, '#a8e08a', 0.3 * a); } ctx.globalAlpha = 1;
      for (const [x, y, c] of [[16, 112, '#ff8a8a'], [186, 112, '#e0b8ff'], [40, 136, '#8ff5d0']]) glow(x, y, 8, c, 0.22 + Math.sin(t / 500 + x) * 0.08);
    },
  },
  // 熔火·火：岩浆河与垂落的火瀑
  r_huo: {
    sky: ['#1a0808', '#4a1410', '#a8301a', '#ff7a2a', '#ffd060'],
    build() {
      paintRidge(ridgeLine(121, 200, 94, 34, 5, 2.2), 122, '#4a1a1a', '#c8502a');
      for (const x of [46, 150]) { R(x, 40, 5, 82, '#ff8a2a'); R(x + 1, 40, 2, 82, '#ffd060'); R(x + 4, 40, 1, 82, '#c8401a'); }
      caveTop(123, 32, 24, '#140a0e', '#8a2a1a');
      R(0, 122, 200, 38, '#3a2228'); R(0, 122, 200, 1, '#c8502a'); dR(0, 123, 200, 4, '#6a2a24', 8);
      ellipse(100, 132, 66, 6, '#4a2e34'); ellipse(100, 131, 62, 5, '#5a3a40'); R(60, 129, 30, 1, '#7a5258');
      R(0, 142, 200, 9, '#ff7a2a'); R(0, 142, 200, 1, '#ffd060'); dR(0, 143, 200, 3, '#ffd060', 6); dR(0, 148, 200, 3, '#c8401a', 8); R(0, 151, 200, 9, '#2a1418'); R(0, 151, 200, 1, '#8a2a1a');
      const r = seeded(41); for (let i = 0; i < 9; i++) { let x = r() * 200, y = 124 + r() * 4; if (Math.abs(x - 100) < 60) { x = x < 100 ? x - 60 : x + 60; } for (let k = 0; k < 14; k++) { R(x, y, 2, 1, k % 3 ? '#ff8a2a' : '#ffd060'); x += 1 + r() * 2; y += r() < 0.5 ? 1 : 0; if (y > 140) break; } }
      rock(0, [120, 116, 113, 111, 110, 110, 111, 113, 114, 116, 118, 120, 121], 128, ['#1e1014', '#3a2228', '#5a3a40', '#8a5a58'], 5); rock(184, [121, 118, 115, 112, 110, 109, 109, 110, 112, 114, 116, 117, 119, 120, 121, 122], 130, ['#1e1014', '#3a2228', '#5a3a40', '#8a5a58'], 9);
    },
    fx(t) {
      for (let i = 0; i < 14; i++) { const k = (t * 0.04 + i * 29) % 120, x = (i * 47 + Math.sin(t / 400 + i) * 5 + 200) % 200; ctx.globalAlpha = 1 - k / 120; R(x, 142 - k, 1, i % 3 ? 1 : 2, i % 2 ? '#ffd060' : '#ff8a2a'); } ctx.globalAlpha = 1;
      for (let x = 0; x < 200; x += 9) R(x + ((t / 140 | 0) + x) % 9, 144 + (x % 3), 3, 1, '#fff2a8');
      for (const x of [46, 150]) { for (let k = 0; k < 6; k++) R(x + 1 + (k % 2), 40 + ((t / 30 + k * 14) % 82 | 0), 1, 3, '#fff2a8'); glow(x + 2, 122, 9, '#ff8a2a', 0.5); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t / 420); R(0, -90, 200, 250, '#ff5a1a'); ctx.restore();
    },
  },
  // 幽泉·水：钟乳、晶簇与一泓发光的泉
  r_shui: {
    sky: ['#060a20', '#101e48', '#1e4a80', '#3a8ab8', '#8fe0f0'],
    build() {
      paintRidge(ridgeLine(131, 200, 98, 26, 5, 1.8), 122, '#1e3a6a', '#5ab0d0');
      caveTop(133, 36, 26, '#080a1c', '#2a4a88');
      R(0, 122, 200, 38, '#2a3a60'); R(0, 122, 200, 1, '#6a9ad0'); dR(0, 123, 200, 4, '#3a5a8a', 8); dR(0, 150, 200, 10, '#101830', 8);
      ellipse(100, 141, 84, 9, '#16305a'); ellipse(100, 140, 80, 8, '#1e5a90'); ellipse(100, 140, 62, 5, '#2a7ab0'); ellipse(96, 139, 30, 2, '#7fe0f0');
      ellipse(100, 131, 56, 4, '#3a4a72'); ellipse(100, 130, 54, 3, '#4a5e8a');
      const C = ['#2a6aa8', '#5ab8e8', '#d4f4ff'], C2 = ['#5a3aa8', '#a88af0', '#f0e0ff'];
      for (const [x, y, hh, c] of [[10, 128, 22, C], [16, 130, 14, C2], [5, 131, 10, C], [22, 132, 8, C], [188, 128, 26, C], [181, 130, 15, C], [195, 131, 12, C2], [174, 132, 7, C2], [62, 123, 7, C], [140, 123, 9, C2]]) crystal(x, y, hh, c);
      for (const x of [30, 168]) R(x, 44, 3, 80, '#16305a');
    },
    fx(t) {
      for (const x of [30, 168]) { for (let y = 44; y < 124; y++) { const k = ((y * 2 - (t / 45 | 0) * 2 + x) % 9 + 9) % 9; R(x, y, 3, 1, k < 2 ? '#ffffff' : k < 5 ? '#9fcdf0' : '#5a9ad8'); } dR(x - 3, 122, 9, 3, '#ffffff', 8); }
      for (let i = 0; i < 10; i++) { const k = (t * 0.02 + i * 31) % 90, x = 40 + (i * 37 % 120) + Math.sin(t / 500 + i) * 3; ctx.globalAlpha = 0.7 * (1 - k / 90); R(x, 138 - k, 1, 1, '#d4f4ff'); if (i % 3 === 0) R(x - 1, 139 - k, 3, 1, '#7fe0f0'); } ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) R(60 + ((i * 29 + (t / 160 | 0) * 3) % 80), 138 + (i % 4), 5, 1, '#b8f0ff');
      glow(100, 138, 34, '#3ab8e8', 0.2 + Math.sin(t / 700) * 0.06); for (const x of [10, 188]) glow(x, 116, 8, '#8fd0ff', 0.3);
    },
  },
});
ART.duelStages = () => Object.keys(STAGES).filter(k => k[1] !== '_');
ART.realmThemes = ['jin', 'mu', 'huo', 'shui'];
ART.drawRealm = (theme, t, OY) => ART.drawDuelStage(STAGES['r_' + theme] ? 'r_' + theme : 'r_jin', t, OY);

const DOORS = {
  fight: ['#5a1a22', '#d8404a', 'slay'], elite: ['#3a0a14', '#b8202a', 'w_mojie'], chest: ['#6a4a10', '#f4c542', 'seek'], spring: ['#103a5a', '#7fe0f0', 'spring'], event: ['#3a1a5a', '#c27dff', 'wonder'],
  insight: ['#0e3a34', '#4ccb9f', 'insight'], shop: ['#4a3420', '#e0b878', 'stone'], boss: ['#2a0810', '#ff6b3a', 'skull'], unk: ['#2a2838', '#6e6a88', 'unk'],
};
const DOOR_CN = { '战': 'fight', '精': 'elite', '宝': 'chest', '泉': 'spring', '奇': 'event', '悟': 'insight', '商': 'shop', '守': 'boss', '？': 'unk', '?': 'unk' };
ART.doorTypes = Object.keys(DOORS);
ART.door = function (type) {
  type = DOORS[type] ? type : DOOR_CN[String(type)[0]] || 'unk'; const D = DOORS[type];
  return cached('door|' + type, () => {
    const b = new Buf(32, 40), big = type === 'boss' || type === 'elite', S = type === 'boss' ? tone('#b8862a', '#6a4a1a', '#f4d86a') : type === 'elite' ? tone('#6a5a72', '#3e3450', '#9a8aa8') : tone('#8a86a0', '#55506e', '#b8b4cc');
    if (big) b.add(L => L.mir(T => { T.l(6, 5, 2, 0, S, 2); T.l(11, 2, 9, -1, S, 2); }));
    b.add(L => { L.sy(1, '9bdeeff', S, 16); L.r(1, 8, 30, 29, S); L.r(0, 36, 32, 4, S); });
    const hw = y => y < 11 ? [5, 7, 8, 9, 9, 10][y - 5] : 10;
    for (let y = 5; y < 36; y++) for (let x = 16 - hw(y); x < 16 + hw(y); x++) b.p(x, y, BAYER[(x & 3) + (y & 3) * 4] < (y - 12) * 0.6 ? lerpC(D[0], D[1], 0.55) : D[0]);
    for (let y = 5; y < 36; y++) { b.p(15 - hw(y), y, dn(S)); b.p(16 + hw(y), y, up(S)); } b.hl(11, 20, 4, dn(S));
    for (const y of [14, 22, 30]) b.mir(T => { T.hl(1, 4, y, dn(S)); }); b.hl(0, 31, 36, up(S)); b.hl(2, 29, 38, dn(S));
    b.r(14, 1, 4, 3, D[1]); b.p(14, 1, lerpC(D[1], '#ffffff', 0.6)); b.hl(14, 17, 3, hs(D[1], 0.6));
    if (type === 'unk') for (let i = 0; i < 26; i++) b.p(7 + (i * 7) % 18, 26 + (i * 5) % 9, i % 2 ? '#928ea8' : '#55506e');
    const c = b.cv(); on(c, () => { glow(16, 30, 9, D[1], 0.35); ctx.drawImage(ART.icon(D[2]), 8, 13); });
    return c;
  });
};
ART.drawQiBar = function (x, y, w, frac, t) {
  x = Math.round(x); y = Math.round(y); frac = Math.max(0, Math.min(1, frac)); const low = frac < 0.3, c = low && ((t || 0) / 200 | 0) % 2 ? '#ff8a6a' : low ? '#e8483a' : '#e86a6a', bx = x + 8, bw = w - 8, iw = bw - 2, fw = Math.round(iw * frac);
  R(bx + 1, y, bw - 2, 7, INK); R(bx, y + 1, bw, 5, INK); R(bx + 1, y + 1, iw, 5, '#3a2030');
  if (fw > 0) { R(bx + 1, y + 1, fw, 5, c); R(bx + 1, y + 1, fw, 1, lerpC(c, '#ffffff', 0.55)); R(bx + 1, y + 5, fw, 1, hs(c, 0.66)); }
  for (let k = 1; k < 10; k++) R(bx + 1 + Math.round(iw * k / 10), y + 1, 1, k === 5 ? 5 : 2, 'rgba(27,19,38,0.55)');
  const hx = x, hy = y; R(hx + 1, hy, 3, 1, INK); R(hx + 5, hy, 3, 1, INK); R(hx, hy + 1, 9, 3, INK); R(hx + 1, hy + 4, 7, 1, INK); R(hx + 2, hy + 5, 5, 1, INK); R(hx + 3, hy + 6, 3, 1, INK); R(hx + 4, hy + 7, 1, 1, INK);
  R(hx + 1, hy + 1, 3, 1, '#ff8a8a'); R(hx + 5, hy + 1, 3, 1, '#d8404a'); R(hx + 1, hy + 2, 7, 2, '#d8404a'); R(hx + 2, hy + 4, 5, 1, '#d8404a'); R(hx + 3, hy + 5, 3, 1, '#8a1e2e'); R(hx + 4, hy + 6, 1, 1, '#8a1e2e'); R(hx + 2, hy + 2, 1, 1, '#ffffff');
};
const ROOMFX = { fight: ['slash', '#ffffff', '#ff9a8a'], elite: ['slash', '#ff8a8a', '#d8404a', 2], boss: ['slash', '#fff2a8', '#ff6b3a', 3], chest: ['burst', '#fff2a8', '#f4c542'], trap: ['spike', '#d8404a', '#8a1e2e'], spring: ['rise', '#d4f4ff', '#7fe0f0'], event: ['ring', '#f0dcff', '#c27dff'], insight: ['ray', '#c8fff0', '#4ccb9f'], shop: ['rise', '#fff2a8', '#f4c542', 1], unk: ['ring', '#c8c4d8', '#928ea8'] };
ART.drawRoomFx = function (type, x, y, k) {
  const F = ROOMFX[type] || ROOMFX[DOOR_CN[String(type)[0]]] || ROOMFX.unk, a = F[1], b2 = F[2]; x = Math.round(x); y = Math.round(y); k = Math.max(0, Math.min(1, k));
  ctx.save();
  if (F[0] === 'slash') {
    const n = F[3] || 1; for (let i = 0; i < n; i++) { const kk = Math.max(0, Math.min(1, k * 1.4 - i * 0.2)), s = i % 2 ? -1 : 1, L0 = 16 + n * 2; if (kk <= 0 || kk >= 1) continue; ctx.globalAlpha = 1 - kk * kk;
      for (let j = 0; j < L0 * Math.min(1, kk * 2.5); j++) { const u = j / L0 - 0.5, px = x + s * u * L0 * 1.3, py = y + u * L0 - Math.sin((u + 0.5) * Math.PI) * 4 + i * 2 - 2, w = Math.round(Math.sin((u + 0.5) * Math.PI) * 3); R(px, py - w / 2, 2, Math.max(1, w), a); R(px, py + w / 2, 2, 1, b2); } }
    if (n > 2 && k < 0.6) { ctx.globalAlpha = 0.8 - k; const r = 6 + k * 26; for (let i = 0; i < 28; i++) { const an = i * Math.PI / 14; R(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.6, 2, 1, b2); } }
    if (k < 0.3) ART.drawSpark(x, y, k * 2);
  } else if (F[0] === 'burst') {
    glow(x, y, 6 + k * 10, b2, 0.7 * (1 - k)); for (let i = 0; i < 9; i++) { const an = -Math.PI * (0.08 + i * 0.105), v = 12 + (i * 7 % 5) * 3, px = Math.round(x + Math.cos(an) * v * k), py = Math.round(y + Math.sin(an) * v * k + k * k * 8); ctx.globalAlpha = 1 - k * k; R(px - 1, py, 3, 1, i % 2 ? a : b2); R(px, py - 1, 1, 3, i % 2 ? a : b2); }
  } else if (F[0] === 'spike') {
    const hh = Math.round(Math.sin(Math.min(1, k * 2) * Math.PI / 2) * 12 * (k > 0.7 ? (1 - k) / 0.3 : 1)); for (let i = -2; i <= 2; i++) { const h2 = hh - Math.abs(i) * 2; for (let j = 0; j < h2; j++) { const w = Math.max(1, Math.round((1 - j / h2) * 4)); R(x + i * 7 - (w >> 1), y - j, w, 1, j > h2 - 4 ? a : '#c8c4d8'); if (w > 1) R(x + i * 7 + (w >> 1), y - j, 1, 1, '#6e6a88'); } } if (k > 0.2 && k < 0.6) for (let i = 0; i < 4; i++) R(x - 8 + i * 6, y - 14 - k * 8, 1, 2, a);
  } else if (F[0] === 'rise') {
    for (let i = 0; i < 7; i++) { const kk = (k + i * 0.13) % 1, px = x - 12 + (i * 11 % 25), py = Math.round(y - kk * 26); ctx.globalAlpha = Math.sin(kk * Math.PI); if (F[3]) { R(px - 1, py - 1, 3, 3, b2); R(px, py - 1, 1, 1, a); R(px, py, 1, 1, '#a8742a'); } else { R(px - 2, py, 5, 1, i % 2 ? a : b2); R(px, py - 2, 1, 5, i % 2 ? a : b2); } }
    ctx.globalAlpha = 0.5 * (1 - k); glow(x, y - 6, 14, b2, 0.4);
  } else if (F[0] === 'ring') {
    const r = 4 + k * 12; ctx.globalAlpha = 1 - k * k; for (let i = 0; i < 20; i++) { const an = i * Math.PI / 10 + k * 3; R(x + Math.cos(an) * r, y - 8 + Math.sin(an) * r, i % 5 ? 1 : 2, i % 5 ? 1 : 2, i % 2 ? a : b2); } glow(x, y - 8, 8, b2, 0.5 * (1 - k));
  } else {
    ctx.globalAlpha = 1 - k; for (let i = 0; i < 12; i++) { const an = i * Math.PI / 6, r0 = 3 + k * 6, r1 = 6 + k * 16; line(x + Math.cos(an) * r0, y - 10 + Math.sin(an) * r0, x + Math.cos(an) * r1, y - 10 + Math.sin(an) * r1, i % 2 ? a : b2); } disc(x, y - 10, 2, '#ffffff'); glow(x, y - 10, 10, b2, 0.5);
  }
  ctx.restore();
};

// ---------- 四、灵宠 ----------
// ART.petSprite(sp, form, frame, aw) → 32×28 场景精灵，面朝左，脚底在 y=26（ART.dims.pet2；锚点左下角）。
//   sp：CONTENT §4 的 id（p_tu p_hu p_que p_xiong p_gui p_hu2 p_fu p_sun p_he p_jiao p_wu p_ze，另有 p_qilin 麒麟幼崽）
//   form：0 初始 | 1 分支 A | 2 分支 B（也接受 'a' 'b'）；p_hu 另有 3 = 九尾天狐。frame 0/1 两帧呼吸；aw 为真加觉醒光环
// ART.petCard(sp, form, aw)          → 36×36 卡片像：五行底色 + 精灵（进化形态带星点，觉醒带光环）
// ART.petName(sp, form) / ART.petList() → 形态名 / [[sp, form, 名, 五行]…] 共 38 个
// ART.drawEvo(x, y, t, k)            → 进化光效，(x,y) 为灵宠脚底中心；省略 k：可进化时头上冒光（循环）；k 0～1：进化那一下
// ART.icon('job_field' 守田 | 'job_furnace' 看炉 | 'job_array' 护阵 | 'job_forage' 觅食 | 'job_patrol' 巡山 | 'job_out' 出战)
ART.dims.pet2 = { w: 32, h: 28, foot: 26 };
const T3 = c => tone(c, hs(c, 0.66), lerpC(c, '#ffffff', 0.5)), EARIN = '#f7a3bd';
// 四足：兔、狐、熊、虎、白泽、谛听、麒麟
function petQuad(b, P, f) {
  const c = T3(P.c), leg = P.leg || 2, bry = P.bry || 4.5, brx = P.brx || 7, bx = P.bx || 18, by = 27 - leg - bry, hr = P.hr || 5.5, hx = P.hx || 8, hy = Math.round(by - bry * 0.55) + f, tc = T3(P.tc || P.c), tx = bx + brx - 1, tips = [], el = P.el || 6;
  if (P.pre) P.pre(b, f);
  b.add(L => {
    const n = P.tails || 1;
    if (P.tail === 'puff') L.e(tx + 1.5, by - 1, 2.3, 2.3, tc);
    else if (P.tail === 'bushy') for (let i = 0; i < n; i++) { const a = -1.15 + (n > 1 ? (i / (n - 1) - 0.5) * (n > 3 ? 2.6 : 1.5) : 0) - f * 0.07, ll = n > 3 ? 9.5 : n > 1 ? 8 : 6.5, ex = tx + Math.cos(a) * ll * 0.8, ey = by - 1 + Math.sin(a) * ll, cc = i % 2 ? T3(lerpC(tc, '#ffffff', 0.45)) : tc; L.l(tx - 1, by - 1, ex, ey, cc, n > 3 ? 2 : 3); L.e(ex + 0.5, ey + 0.5, n > 1 ? 1.8 : 2.4, n > 1 ? 1.8 : 2.4, cc); tips.push([ex, ey]); }
    else if (P.tail === 'thin') { L.l(tx, by, tx + 3, by - 1, tc, 2); L.l(tx + 3, by - 1, tx + 4 - f, by - 7, tc, 2); tips.push([tx + 4 - f, by - 8]); }
    else if (P.tail === 'stub') L.e(tx + 1, by - 2, 1.7, 1.7, tc);
  });
  if (P.tip) for (const [x, y] of tips) { b.r(Math.round(x), Math.round(y) - 1, 2, 2, P.tip); b.p(Math.round(x), Math.round(y) - 1, lerpC(P.tip, '#ffffff', 0.6)); }
  for (const x of [bx - brx + 4, bx + brx - 5]) b.r(Math.round(x), Math.round(by + bry - 2), 2, leg + 1, dn(c));
  if (P.wing) b.add(L => { for (let i = 0; i < 4; i++) L.l(bx - 2 + i, by - bry + 2, bx + 1 + i * 3, by - bry - 7 + i * 2 - f, T3(P.wing), 2); });
  b.add(L => { L.e(bx, by, brx, bry, c); for (const x of [bx - brx + 1, bx + brx - 2]) L.r(x, Math.round(by + bry - 3), 2, leg + 3, c); L.e(bx - brx + 2.5, by - 0.5, 3.5, bry, c); });
  if (P.hoof) for (const x of [bx - brx + 1, bx + brx - 2, bx - brx + 4, bx + brx - 5]) b.r(x, 26, 2, 1, P.hoof);
  if (P.b) b.hl(Math.round(bx - brx + 3), Math.round(bx + brx - 3), Math.round(by + bry - 1), P.b);
  if (P.stripe) for (let x = bx - brx + 5; x < bx + brx - 1; x += 3) b.l(x, by - bry + 1, x - 1, by + 1, P.stripe);
  if (P.plate) b.add(L => { L.e(bx + 0.5, by - 1, brx - 0.5, bry - 0.5, T3(P.plate)); L.r(0, Math.round(by), 32, 12, null); });
  if (P.spike) for (let x = Math.round(bx - brx + 4); x <= bx + brx - 2; x += 3) { b.r(x, Math.round(by - bry - 2), 2, 3, P.spike); b.p(x, Math.round(by - bry - 3), lerpC(P.spike, '#ffffff', 0.6)); }
  if (P.mane) b.add(L => { L.e(hx + 2.5, hy + 0.5, hr + 1, hr + 1, T3(P.mane)); spikes(L, hx + 2.5, hy + 0.5, hr, hr + 3, 7, P.mane, 2, 0.45 + f * 0.15); });
  b.add(L => {
    if (P.ear === 'long') { L.r(hx - 3, Math.round(hy - hr - el + 2), 2, el + 1, c); L.r(hx + 1, Math.round(hy - hr - el + 3), 2, el, c); }
    else if (P.ear === 'round') { L.e(hx - 3.5, hy - hr + 1.2, 2, 2, c); L.e(hx + 3.5, hy - hr + 1.2, 2, 2, c); }
    else for (let k = 0; k < (P.el || 4); k++) { const y = Math.round(hy - hr - (P.el || 4) + 2 + k); L.hl(hx - 4, hx - 4 + Math.min(3, k), y, c); L.hl(hx + 3 - Math.min(3, k), hx + 3, y, c); }
    L.e(hx, hy, hr, hr - 0.6, c);
  });
  const ei = P.ei || EARIN, et = Math.round(hy - hr);
  if (P.ear === 'long') { b.r(hx - 3, et - el + 4, 1, el - 3, ei); b.r(hx + 1, et - el + 5, 1, el - 4, ei); } else if (P.ear !== 'round') { b.p(hx - 3, et, ei); b.p(hx + 2, et, ei); }
  b.add(L => L.e(hx - 3, hy + 2.2, 2.6, 1.9, T3(P.mz || lerpC(P.c, '#ffffff', 0.7))), { noHi: 1, sep: 0 });
  b.r(hx - 4, hy - 2, 1, 2, INK); b.r(hx - 1, hy - 2, 2, 2, INK); b.p(hx - 1, hy - 2, '#ffffff'); if (P.eye) { b.p(hx, hy - 1, P.eye); b.p(hx - 4, hy - 1, P.eye); }
  b.r(hx - 5, hy + 1, 2, 1, P.nose || '#3a2230');
  if (P.horn) b.add(L => { L.l(hx - 2, et + 1, hx - 3, et - 4, T3(P.horn), 2); if (P.horn2) { L.l(hx + 2, et + 1, hx + 4, et - 4, P.horn, 2); L.p(hx - 5, et - 2, P.horn); L.p(hx + 6, et - 2, P.horn); L.p(hx + 1, et - 3, P.horn); } });
  if (P.mark) b.r(hx - 2, et + 1, 2, 1, P.mark);
  if (P.aura) for (const x of [bx - brx, bx + brx - 3]) { b.r(x, 25, 4, 2, P.aura); b.r(x + 1 + f, 23, 2, 2, P.aura); b.p(x + 1, 25, '#fff2a8'); }
  if (P.post) P.post(b, f, hx, hy, bx, by);
  return [hx, et - (P.ear === 'long' ? el - 1 : P.horn ? 5 : 3)];
}
// 禽：雀、隼、鹤、金乌
function petBird(b, P, f) {
  const c = T3(P.c), wc = T3(P.w || hs(P.c, 0.8)), leg = P.leg || 3, bry = P.bry || 4, brx = P.brx || 5.5, bx = P.bx || 16, by = 27 - leg - bry - (P.fly ? 3 + f : 0), nk = P.neck || 0, hr = P.hr || 3.4, hx = bx - brx + 1 - (nk ? 2 : 0), hy = by - bry + 0.5 - nk + (nk || P.fly ? 0 : f), tcol = T3(P.t || P.w || P.c), tl = P.tl || 4, lc = P.lc || '#e8a040';
  if (P.pre) P.pre(b, f);
  if (P.fly || P.span) b.add(L => { for (let i = 0; i < 5; i++) L.l(bx - 1, by - 1, bx - 6 + i * 2, by - bry - 7 + i + f * 3, dn(wc), 2); }, { flat: 1 });
  b.add(L => { for (let i = 0; i < (P.tn || 2); i++) { if (P.curl) { const y1 = by - 4 - i * 4 + f; L.l(bx + brx - 2, by, bx + brx + 3, y1 + 3, tcol, 2); L.l(bx + brx + 3, y1 + 3, bx + brx + 7, y1, tcol, 2); L.e(bx + brx + 8, y1, 1.6, 1.6, tcol); } else L.l(bx + brx - 2, by + 1, bx + brx - 2 + tl, by + 3 - i * 2, tcol, 2); } });
  if (P.tip) for (let i = 0; i < (P.tn || 2); i++) P.curl ? b.r(Math.round(bx + brx + 8), Math.round(by - 4 - i * 4 + f), 1, 1, P.tip) : b.p(Math.round(bx + brx - 2 + tl), Math.round(by + 3 - i * 2), P.tip);
  if (!P.fly) for (let i = 0; i < (P.legs || 2); i++) { const x = Math.round(bx - 2 + i * 3); b.r(x, Math.round(by + bry - 1), 1, leg + 1, lc); b.r(x - 1, 26, 2, 1, lc); }
  b.add(L => { L.e(bx, by, brx, bry, c); if (nk) L.l(bx - brx + 2, by - 2, hx + 1, hy + 1, c, 3); L.e(hx, hy, hr, hr, c); });
  if (P.b) b.add(L => L.e(bx - 1.5, by + 1.5, brx - 2, bry - 1.8, T3(P.b)), { noHi: 1, sep: 0 });
  b.add(L => {
    if (P.fly || P.span || f) for (let i = 0; i < 5; i++) L.l(bx + 1, by - 1, bx + 3 + i * 2.2, by - bry - (P.span ? 8 : 4) + i * 2 + (P.fly ? f * 4 : 0), wc, 2);
    else { L.e(bx + 1.5, by + 0.3, brx - 1.5, bry - 1.6, wc); L.l(bx + 2, by + 1, bx + brx + 1, by + 2, wc, 2); }
  });
  if (P.edge) for (let i = 0; i < 4; i++) b.p(Math.round(bx + 3 + i * 1.5), Math.round(by + 1 - (P.fly || P.span || f ? i * 1.4 + 2 : 0)), P.edge);
  const bk = P.bk || '#f4c542', ix = Math.round(hx - hr), iy = Math.round(hy);
  b.hl(ix - 1 - (P.bl || 0), ix, iy, bk); b.p(ix, iy + 1, hs(bk, 0.7)); if (P.hook) b.p(ix - 1 - (P.bl || 0), iy + 1, bk);
  b.p(ix + 2, iy - 1, P.eye || INK); if (P.eye) b.p(ix + 2, iy - 2, INK);
  if (P.crest) { b.r(Math.round(hx) - 1, Math.round(hy - hr) - 1, 3, 1, P.crest); if (P.crest2) { b.p(Math.round(hx) + 1, Math.round(hy - hr) - 2, P.crest); b.p(Math.round(hx) + 2, Math.round(hy - hr) - 3, P.crest); } }
  if (P.post) P.post(b, f, hx, hy, bx, by);
  return [Math.round(hx), Math.round(hy - hr) - 2];
}
function petTurtle(b, P, f) {
  const sc = T3(P.c), sk = T3(P.sk || '#9ab078'), hy = 20 + f;
  if (P.pre) P.pre(b, f);
  b.add(L => { L.e(6, hy, 3.4, 3, sk); L.r(7, hy, 5, 3, sk); for (const x of [9, 20]) L.r(x, 23, 4, 4, sk); L.l(25, 22, 28, 24, sk, 2); });
  b.add(L => { L.e(17, 22, 9.5, 9, sc); L.r(0, 23, 32, 6, null); });
  b.add(L => L.r(8, 22, 19, 2, T3(P.rim || lerpC(P.c, '#f4e08a', 0.5))), { sep: 1 });
  const D = dn(sc); for (const [x0, y0, x1, y1] of [[13, 15, 12, 21], [21, 15, 22, 21], [13, 15, 21, 15], [10, 18, 12, 18], [22, 18, 25, 18], [17, 14, 17, 15]]) b.l(x0, y0, x1, y1, D);
  if (P.moss) for (const [x, y] of [[11, 17], [15, 14], [23, 17], [19, 18], [16, 19]]) b.p(x, y, P.moss);
  b.p(4, hy - 1, INK); b.p(4, hy, P.eye || INK);
  if (P.post) P.post(b, f, 6, hy);
  return [6, hy - 5];
}
function petBat(b, P, f) {
  const c = T3(P.c), m = T3(P.w || hs(P.c, 0.8)), big = P.big ? 2 : 0, cy = 13 - f;
  b.add(L => L.mir(T => { for (let x = 3 - big; x <= 13; x++) { const u = (13 - x) / (10 + big), top = cy - 1 - Math.sin(u * 2.2) * (f ? 2 : 6 + big), hh = 4 + Math.abs(Math.sin(u * 3.14 * 1.5)) * 3 + (1 - u) * 2; for (let y = top; y < top + hh; y++) T.p(x, y, m); } }));
  b.mir(T => { const tx = 3 - big, ty = Math.round(cy - 1 - Math.sin(2.2) * (f ? 2 : 6 + big)); T.l(13, cy, tx, ty, dn(c)); T.l(13, cy, 8, ty + 7, dn(m)); T.l(13, cy, 5, ty + 5, dn(m)); });
  b.add(L => { L.e(16, cy + 3, 3.2, 4.2, c); L.e(16, cy - 2, 3.6, 3.2, c); L.mir(T => { for (let k = 0; k < 4 + big; k++) T.hl(12, 12 + Math.min(2, k), cy - 6 - big + k, c); }); });
  b.mir(T => { T.p(14, cy - 3, INK); T.p(14, cy - 2, P.eye || '#ff3a2a'); T.p(15, cy, '#ffffff'); T.p(13, cy - 5, P.ei || EARIN); });
  if (P.b) b.r(15, cy + 2, 2, 4, P.b);
  if (P.post) P.post(b, f, 16, cy);
  return [16, cy - 8 - big];
}
// 蛟：盘身 + 龙首
function petJiao(b, P, f) {
  const c = T3(P.c), bel = P.b || lerpC(P.c, '#ffffff', 0.6), pts = [[10, 14], [13, 18], [10, 23], [17, 25], [24, 23], [25, 17], [21, 13], [24, 8], [27, 6 + f]], hy = 11 + f;
  if (P.wing) b.add(L => { for (let i = 0; i < 5; i++) L.l(17, 14, 14 + i * 3, 3 + i * 1.5 - f, T3(P.wing), 2); });
  const seg = (L2, r0, col, oy) => { for (let k = 0; k < pts.length - 1; k++) for (let i = 0; i <= 8; i++) { const u = (k + i / 8) / (pts.length - 1), x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * i / 8, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * i / 8, r = r0 * (1 - u * 0.7); L2.e(x, y + oy, r, r, col); } };
  b.add(L => { seg(L, 2.9, c, 0); L.e(7, hy, 3.6, 3, c); L.r(2, hy, 5, 3, c); });
  for (let k = 0; k < 7; k++) { const p = pts[Math.min(6, k)], q2 = pts[Math.min(7, k + 1)]; b.p(Math.round((p[0] + q2[0]) / 2), Math.round((p[1] + q2[1]) / 2 + 1), bel); }
  if (P.fin) for (const [x, y] of [[13, 15], [11, 20], [18, 22], [26, 20], [23, 14], [22, 10]]) { b.p(x, y - 3, P.fin); b.p(x + 1, y - 2, P.fin); }
  if (P.spike) for (const [x, y] of [[12, 12], [15, 15], [20, 21], [26, 19], [24, 13], [23, 9]]) { b.r(x, y - 4, 1, 3, P.spike); b.p(x, y - 5, '#ffffff'); }
  if (P.horn) b.add(L => { L.l(8, hy - 2, 11, hy - 6, T3(P.horn), P.horn2 ? 2 : 1); if (P.horn2) { L.l(6, hy - 3, 7, hy - 7, P.horn, 2); L.p(12, hy - 4, P.horn); } });
  b.p(5, hy - 1, INK); b.p(5, hy, P.eye || '#f4c542'); b.hl(2, 5, hy + 2, bel); b.p(2, hy, INK);
  if (P.whisk) { b.l(2, hy + 1, 0, hy + 4, P.whisk); b.l(3, hy + 3, 2, hy + 6, P.whisk); }
  return [8, hy - 8];
}
const moonBack = (b) => b.add(L => { L.e(20, 10, 9, 9, '#fff2a8'); L.e(23, 8, 7.5, 7.5, null); }, { flat: 1 });
const sunBack = (r, c1, rays) => (b, f) => b.add(L => { L.e(18, 11, r, r, c1); if (rays) spikes(L, 18, 11, r, r + 3 + f, 12, c1, 1, 0.2); }, { flat: 1 });
const PLAN = { q: petQuad, b: petBird, t: petTurtle, f: petBat, j: petJiao };
// [名, 五行, 骨架, 参数]；每种三行：初始、分支 A、分支 B
const PETS2 = {
  p_tu: [
    ['月牙兔', 'mu', 'q', { c: '#f2efe6', ear: 'long', tail: 'puff', brx: 5.5, bry: 4.5, hr: 5, bx: 17, leg: 1, eye: '#d8404a', mark: '#f4c542' }],
    ['捣药玉兔', 'mu', 'q', { c: '#dff2e4', ear: 'long', tail: 'puff', brx: 5.5, bry: 4.5, hr: 5, bx: 18, leg: 1, eye: '#2a8a7a', mark: '#4ccb9f', ei: '#8fe0b8', hx: 10, post: (b, f) => { b.add(L => { L.r(1, 22, 7, 5, STEEL); L.r(0, 21, 9, 2, STEEL); }); b.add(L => L.l(4, 20 - f * 2, 6, 13 - f * 2, WOOD, 2)); b.p(3, 20, '#62d26f'); b.p(5, 20, '#a8e08a'); } }],
    ['广寒兔', 'mu', 'q', { c: '#dfe8ff', ear: 'long', el: 8, tail: 'puff', brx: 5.5, bry: 4.5, hr: 5, bx: 17, leg: 1, eye: '#4aa8ff', mark: '#7fe0f0', ei: '#b8c8ff', pre: moonBack, post: b => { b.p(27, 20, '#ffffff'); b.p(2, 6, '#ffffff'); } }],
  ],
  p_hu: [
    ['雪团灵狐', 'shui', 'q', { c: '#f4f2fa', tail: 'bushy', brx: 6, bry: 4, hr: 5.2, eye: '#f4a020', tip: '#8fd0ff' }],
    ['霜月狐', 'shui', 'q', { c: '#cfe4ff', tail: 'bushy', tails: 2, brx: 6.5, bry: 4.2, hr: 5.4, leg: 2, eye: '#4aa8ff', tip: '#7fe0f0', mark: '#4aa8ff', ei: '#7fb8f0', spike: '#b8f0ff' }],
    ['赤尾狐', 'shui', 'q', { c: '#f8f0e8', tc: '#e8483a', tail: 'bushy', tails: 2, brx: 6.5, bry: 4.2, hr: 5.4, leg: 2, eye: '#d8404a', tip: '#ffd060', mark: '#e8483a', ei: '#e8483a' }],
    ['九尾天狐', 'shui', 'q', { c: '#f6e7ff', tc: '#e6ccff', tail: 'bushy', tails: 9, brx: 6.5, bry: 4.2, hr: 5.4, leg: 2, bx: 17, eye: '#c27dff', tip: '#ff9ad8', mark: '#ff5aa8', ei: '#ff9ad8' }],
  ],
  p_que: [
    ['青羽雀', 'mu', 'b', { c: '#6fd8b8', w: '#3fa890', b: '#e8fff0', brx: 4.6, bry: 3.8, hr: 3.2, tl: 4 }],
    ['雷翼隼', 'mu', 'b', { c: '#5a8a9a', w: '#34586e', b: '#d8e8e0', brx: 5.5, bry: 4, hr: 3.2, tl: 5, hook: 1, span: 1, edge: '#f4e04a', eye: '#f4c542', tip: '#f4e04a' }],
    ['青鸾', 'mu', 'b', { c: '#4ab8d8', w: '#2a7ab0', b: '#d4f4ff', t: '#3fd0b0', brx: 5, bry: 4, hr: 3.2, leg: 4, tn: 3, curl: 1, tip: '#fff2a8', crest: '#f4c542', crest2: 1, bx: 13 }],
  ],
  p_xiong: [
    ['铁背熊', 'jin', 'q', { c: '#8a7262', ear: 'round', tail: 'stub', brx: 8, bry: 6.5, hr: 6, leg: 2, nose: '#2a1a26', plate: '#8a8ea8', mz: '#d8c4a8' }],
    ['金刚熊', 'jin', 'q', { c: '#6e5244', ear: 'round', tail: 'stub', brx: 8.5, bry: 7, hr: 6.2, leg: 2, nose: '#2a1a26', plate: '#f4c542', mz: '#e8d0a8', mark: '#f4c542', eye: '#f4c542', spike: '#fff2a8' }],
    ['玄铁熊', 'jin', 'q', { c: '#3e3e52', ear: 'round', tail: 'stub', brx: 8.5, bry: 7, hr: 6.2, leg: 2, nose: '#2a1a26', plate: '#22222e', mz: '#8a8ea8', eye: '#7fe0f0', spike: '#7fe0f0' }],
  ],
  p_gui: [
    ['墓穴玄龟', 'tu', 't', { c: '#8a7a5a', sk: '#a8b080', moss: '#62b25a' }],
    ['负碑灵龟', 'tu', 't', { c: '#6a6252', sk: '#b8b890', rim: '#c8a84a', eye: '#f4c542', pre: b => { b.add(L => { L.r(13, 2, 9, 13, STEEL); L.r(14, 1, 7, 2, STEEL); }); for (const y of [5, 8, 11]) b.hl(15, 19, y, y === 8 ? '#f4c542' : '#5a6480'); } }],
    ['玄武幼龟', 'tu', 't', { c: '#2a5a6a', sk: '#6a9a8a', rim: '#7fe0f0', eye: '#7fe0f0', post: (b, f) => { const S = T3('#3a8a5a'); b.add(L => { L.l(24, 16, 27, 11, S, 2); L.l(27, 11, 24, 6 + f, S, 2); L.l(24, 6 + f, 20, 5 + f, S, 2); }); b.p(20, 5 + f, '#f4c542'); b.p(18, 6 + f, '#d8404a'); for (const [x, y] of [[12, 17], [20, 16], [16, 20]]) b.p(x, y, '#b8f0ff'); } }],
  ],
  p_hu2: [
    ['赤焰虎', 'huo', 'q', { c: '#f08a3c', tail: 'thin', brx: 7.5, bry: 4.5, hr: 5.4, leg: 2, el: 3, stripe: '#5a2a1c', tip: '#ffd060', mz: '#fff0dc', b: '#fff0dc', eye: '#f4c542' }],
    ['炎虎王', 'huo', 'q', { c: '#e8582a', tail: 'thin', brx: 8, bry: 5, hr: 5.8, leg: 3, el: 3, stripe: '#5a1a14', tip: '#fff2a8', mz: '#fff0dc', mane: '#ffb23f', mark: '#5a1a14', aura: '#ff8a2a', eye: '#fff2a8' }],
    ['雷纹虎', 'huo', 'q', { c: '#f4ecd8', tail: 'thin', brx: 8, bry: 4.8, hr: 5.6, leg: 3, el: 3, stripe: '#8a5ae0', tip: '#c27dff', mz: '#ffffff', eye: '#8a5ae0', mark: '#f4e04a', spike: '#f4e04a' }],
  ],
  p_fu: [
    ['血瞳蝠', 'huo', 'f', { c: '#5a3a52', w: '#8a4a5a' }],
    ['噬魂蝠王', 'huo', 'f', { c: '#3a1a2a', w: '#a8202a', big: 1, eye: '#fff2a8', post: (b, f, x, y) => { b.mir(T => { T.p(14, y - 9, '#f4c542'); T.p(14, y - 10, '#f4c542'); }); b.p(15, y - 8, '#f4c542'); b.p(16, y - 8, '#f4c542'); for (const [dx, dy] of [[-9, 9], [9, 10], [0, 11]]) b.p(16 + dx, y + dy + f, '#b8c0f0'); } }],
    ['夜明蝠', 'huo', 'f', { c: '#2a3a6a', w: '#3a5aa0', eye: '#fff2a8', b: '#fff2a8', ei: '#7fe0f0', post: (b, f, x, y) => b.mir(T => { T.p(7, y - 2 - (f ? 0 : 3), '#fff2a8'); T.p(10, y + 1 - (f ? 0 : 2), '#7fe0f0'); T.p(5, y - (f ? 0 : 4), '#ffffff'); }) }],
  ],
  p_sun: [
    ['雷翼隼', 'jin', 'b', { c: '#b8a070', w: '#6a5a48', b: '#f0e4c8', brx: 5.5, bry: 4, hr: 3.2, tl: 5, hook: 1, span: 1, edge: '#f4e04a', eye: '#f4c542' }],
    ['裂空隼', 'jin', 'b', { c: '#e8f4ff', w: '#7fc8f0', b: '#ffffff', brx: 5.5, bry: 3.6, hr: 3, tl: 7, hook: 1, fly: 1, edge: '#ffffff', eye: '#4aa8ff', tip: '#7fe0f0', post: (b, f, hx, hy, bx, by) => { for (let i = 0; i < 3; i++) b.hl(24 + i, 29, by + 3 + i * 2, i % 2 ? '#d4ecff' : '#7fe0f0'); } }],
    ['剑羽隼', 'jin', 'b', { c: '#8a94a8', w: '#c8d0e0', b: '#e8eef6', t: '#eef4ff', brx: 5.5, bry: 4, hr: 3.2, tl: 8, tn: 3, hook: 1, span: 1, edge: '#f4c542', eye: '#f4c542', bk: '#c8d0e0' }],
  ],
  p_he: [
    ['冰羽鹤', 'shui', 'b', { c: '#f4f8ff', w: '#a8d0f0', t: '#5a9ad8', brx: 5.5, bry: 3.6, hr: 2.6, leg: 7, neck: 7, bl: 2, crest: '#d8404a', lc: '#5a6480', bx: 17 }],
    ['玄冰仙鹤', 'shui', 'b', { c: '#bfe4ff', w: '#4a8ad0', t: '#24579a', brx: 5.5, bry: 3.6, hr: 2.6, leg: 7, neck: 7, bl: 2, crest: '#7fe0f0', crest2: 1, lc: '#24579a', bx: 17, tip: '#ffffff', edge: '#ffffff', eye: '#4aa8ff' }],
    ['松鹤', 'shui', 'b', { c: '#fbfaf4', w: '#f0ece0', t: '#2a2630', brx: 5.5, bry: 3.6, hr: 2.6, leg: 7, neck: 7, bl: 2, crest: '#d8404a', lc: '#3a3440', bx: 17, post: (b, f, hx, hy) => { for (const [x, y] of [[-6, 1], [-7, 0], [-8, 1], [-7, 2], [-9, 0]]) b.p(Math.round(hx) + x, Math.round(hy) + y, x % 2 ? '#2f6e4b' : '#62b25a'); b.r(Math.round(hx), Math.round(hy) + 3, 2, 3, '#2a2630'); } }],
  ],
  p_jiao: [
    ['玄水蛟', 'shui', 'j', { c: '#2a6ab0', fin: '#7fe0f0', horn: '#d4ecff', whisk: '#7fe0f0' }],
    ['应龙', 'shui', 'j', { c: '#3a8ad8', b: '#fff2a8', fin: '#f4c542', horn: '#f4c542', horn2: 1, whisk: '#f4c542', wing: '#f4e8c0' }],
    ['冰螭', 'shui', 'j', { c: '#bfe8ff', b: '#ffffff', fin: '#4aa8ff', spike: '#7fe0f0', eye: '#4aa8ff', whisk: '#ffffff' }],
  ],
  p_wu: [
    ['金乌雏', 'huo', 'b', { c: '#f0a82a', w: '#5a3a2a', b: '#fff2a8', brx: 5, bry: 4.6, hr: 3.6, tl: 3, bk: '#d8404a', lc: '#d8404a', eye: '#d8404a' }],
    ['三足金乌', 'huo', 'b', { c: '#3a2a30', w: '#1e1620', t: '#d8404a', brx: 5.5, bry: 4.2, hr: 3.4, tl: 6, tn: 3, legs: 3, bk: '#f4c542', lc: '#f4c542', eye: '#ff6b3a', edge: '#ff8a2a', tip: '#ffd060', pre: sunBack(8, '#ffb23f', 1) }],
    ['大日金乌', 'huo', 'b', { c: '#e8483a', w: '#f4c542', t: '#ff8a2a', b: '#ffd89a', brx: 5.5, bry: 4.2, hr: 3.4, tl: 7, tn: 3, legs: 3, bk: '#f4c542', lc: '#f4c542', eye: '#fff2a8', edge: '#fff2a8', crest: '#f4c542', crest2: 1, pre: sunBack(10, '#fff2a8', 1) }],
  ],
  p_ze: [
    ['白泽幼兽', 'tu', 'q', { c: '#f4f4fa', tail: 'bushy', tc: '#a8d8f0', brx: 6.5, bry: 4.5, hr: 5.4, leg: 2, horn: '#f4c542', mane: '#bfe4ff', eye: '#4aa8ff', mark: '#d8404a' }],
    ['白泽', 'tu', 'q', { c: '#ffffff', tail: 'bushy', tails: 2, tc: '#7fc8f0', brx: 8, bry: 5, hr: 5.8, leg: 3, horn: '#f4c542', horn2: 1, mane: '#8fd0ff', eye: '#f4c542', mark: '#d8404a', tip: '#ffffff', aura: '#8fd0ff', hoof: '#f4c542' }],
    ['谛听', 'tu', 'q', { c: '#7a7a8e', tail: 'thin', brx: 7.5, bry: 4.8, hr: 5.6, leg: 3, el: 6, horn: '#f4c542', eye: '#f4c542', mz: '#c8c4d8', tip: '#f4c542', stripe: '#4a4a5e', ei: '#c8c4d8', post: (b, f, hx, hy) => { b.hl(hx + 3, hx + 6, hy + 4, '#d8404a'); b.r(hx + 4, hy + 5, 2, 2, '#f4c542'); } }],
  ],
  p_qilin: [
    ['麒麟幼崽', 'tu', 'q', { c: '#f0b429', tail: 'bushy', tc: '#e8483a', brx: 7.5, bry: 4.8, hr: 5.6, leg: 3, horn: '#c8fff0', horn2: 1, mane: '#e8483a', eye: '#2a8a7a', mz: '#fff2a8', b: '#fff2a8', tip: '#ffd060', aura: '#ff8a2a', hoof: '#5a3a26', mark: '#4ccb9f', post: (b, f, hx, hy, bx, by) => { for (let y = by - 3; y <= by + 1; y += 2) for (let x = bx - 3 + (y & 1); x <= bx + 5; x += 3) b.p(Math.round(x), Math.round(y), '#4ccb9f'); } }],
  ],
};
const PFORM = { a: 1, b: 2, A: 1, B: 2 };
function petSpec(sp, form) { const S = PETS2[sp] || PETS2.p_tu; form = typeof form === 'string' ? PFORM[form] | 0 : form | 0; return S[Math.max(0, Math.min(S.length - 1, form))]; }
ART.petName = (sp, form) => petSpec(sp, form)[0];
ART.petList = () => { const o = []; for (const k in PETS2) PETS2[k].forEach((s, i) => o.push([k, i, s[0], s[1]])); return o; };
ART.petSprite = function (sp, form, frame, aw) {
  const S = petSpec(sp, form); frame = frame ? 1 : 0;
  return cached(['pet2', sp, S[0], frame, aw ? 1 : 0].join('|'), () => {
    const b = new Buf(32, 28), top = PLAN[S[2]](b, S[3], frame);
    const c = b.cv({ max: 15 });
    if (aw) on(c, () => { const x = top[0], y = Math.max(1, top[1]); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; R(x + Math.round(Math.cos(a) * 4), y + Math.round(Math.sin(a) * 1.4), 1, 1, Math.sin(a) > 0.3 ? '#a8742a' : i % 3 ? '#f4c542' : '#fff2a8'); } });
    return c;
  });
};
const EL_BG = { jin: ['#5a4a1e', '#c8a84a', '#fff2a8'], mu: ['#1e4a34', '#4a9a5a', '#c8f0a8'], shui: ['#16305a', '#3a7ab8', '#bfe4ff'], huo: ['#5a1a1a', '#c8502a', '#ffd89a'], tu: ['#4a3420', '#a8804a', '#f0dcb0'] };
ART.petCard = function (sp, form, aw) {
  const S = petSpec(sp, form), fi = PETS2[sp] ? PETS2[sp].indexOf(S) : 0, E = EL_BG[S[1]] || EL_BG.tu;
  return cached(['petc', sp, S[0], aw ? 1 : 0].join('|'), () => on(mk(36, 36), () => {
    R(1, 0, 34, 36, INK); R(0, 1, 36, 34, INK);
    vgrad(1, 1, 34, 27, ramp([E[0], E[1], E[2]], 3)); disc(18, 17, 11, lerpC(E[1], E[2], 0.6)); disc(18, 17, 9, E[2]);
    R(1, 28, 34, 7, hs(E[0], 0.9)); R(1, 28, 34, 1, E[1]); ellipse(18, 30, 10, 2, E[0]);
    if (fi) for (const [x, y] of [[5, 6], [30, 9], [8, 22], [29, 21], [26, 4]]) { R(x, y, 1, 1, '#ffffff'); if (fi > 1 || x % 2) { R(x - 1, y, 3, 1, 'rgba(255,255,255,0.6)'); R(x, y - 1, 1, 3, 'rgba(255,255,255,0.6)'); } }
    ctx.drawImage(ART.petSprite(sp, form, 0, aw), 2, 4);
    const fc = aw ? '#f4c542' : fi ? '#c8c4d8' : hs(E[1], 0.8); R(1, 1, 34, 1, fc); R(1, 34, 34, 1, hs(fc, 0.7)); R(1, 1, 1, 34, fc); R(34, 1, 1, 34, hs(fc, 0.7));
  }));
};
ART.drawEvo = function (x, y, t, k) {
  x = Math.round(x); y = Math.round(y); ctx.save();
  if (k === undefined) {
    const p = 0.5 + Math.sin(t / 220) * 0.5; glow(x, y - 12, 14, '#fff2a8', 0.25 + p * 0.2);
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + t / 700; ctx.globalAlpha = 0.5 + p * 0.5; R(x + Math.cos(a) * 15, y - 1 + Math.sin(a) * 4, 1, 1, i % 2 ? '#f4c542' : '#fff2a8'); }
    for (let i = 0; i < 5; i++) { const kk = ((t / 26 + i * 9) % 30) / 30, px = x - 10 + (i * 7 % 21); ctx.globalAlpha = 1 - kk; R(px, y - 4 - kk * 26, 1, 3, '#fff2a8'); R(px, y - 5 - kk * 26, 1, 1, '#ffffff'); }
  } else {
    k = Math.max(0, Math.min(1, k)); const r = 4 + k * 22;
    if (k < 0.5) { ctx.globalAlpha = 0.9 * (1 - k * 2); for (let j = -26; j <= 0; j++) R(x - 9 + Math.abs(j + 13) * 0.3, y + j, 18 - Math.abs(j + 13) * 0.6, 1, '#ffffff'); }
    glow(x, y - 12, 10 + k * 16, '#fff2a8', 0.8 * (1 - k)); ctx.globalAlpha = 1 - k * k;
    for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; R(x + Math.cos(a) * r, y - 12 + Math.sin(a) * r * 0.75, i % 3 ? 1 : 2, i % 3 ? 1 : 2, i % 2 ? '#f4c542' : '#ffffff'); }
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, d = 8 + k * 16, px = Math.round(x + Math.cos(a) * d), py = Math.round(y - 12 + Math.sin(a) * d * 0.8); R(px - 2, py, 5, 1, '#fff2a8'); R(px, py - 2, 1, 5, '#fff2a8'); }
  }
  ctx.restore();
};
Object.assign(ICONS, {
  job_field: '.....nnnn/....nnnnnn/...ooeeeeoo/.....eKeK/.....eeee/o.bbbbbbbb.o/oobbbbbbbboo/...bbBBbb/...bbBBbb..l/....o..o..lgl/.l..o..o...g/lgl.o..o.OOOOO/OOOOOOOOOOooo',
  job_furnace: '.......r/......rmr/.....rmhmr/.....rmhmr/......rmr/.nnnn..y/nNnNnn.ssss/nNnNnNsttttS/nNnNnNstwtSS/.nnnNosttSS/...oO..SSS/..oO..S...S',
  job_array: '....cccccc/..cc......cc/.c..bbbbbb..c/.c.bwbbbbBB.c/c..bbbbbbBB..c/c..bbbyybBB..c/c..bbbyybBB..c/.c..bbbbBB..c/.c...bbBB...c/..cc..BB..cc/....cccccc',
  job_forage: '....oooo/...o....o/..o......o/.oooooooooo/.oOoOrrOoOo/.OoOrprrOoO/.oOoOrrgoOo/.OoOoOoglOo/..OoOoOoOo/..oooooooo',
  job_patrol: '.....o/....ooo/.....O.....s/....yyy...sts/...yhyyY.stttS/...yhyyY.sttSS/...yyyyYsttttSS/....YYY.stttSSS/.....o.sttttSSS/....ooosttttSSSS',
  job_out: '..r..r..r/..r..r..r....w/.rr.rr.rr...wW/.rR.rR.rR..wW/..R..R..R.wW/.........wW/...rrrr.wW/..rrrrrrW/..rrprrr.y/..rrrrrR/...RRRR',
});

// ---------- 五、灵田与炼丹 ----------
// 作物 id（顺序同 SYSTEMS §6.2，ART.cropIds；各接口也接受序号 0～7）：herb 灵草 rice 灵稻 grain 灵谷 fire 赤炎果 ice 寒霜莲 bolt 惊雷竹 vine 长生藤 soul 养魂花
// ART.crop(id)                          → 16×16 作物图标
// ART.drawPlot(x, y, id, stage, t)      → 在当前 ctx 画一块田（18×9 的垄，(x,y) 为垄内左上角，同 drawField 的 px,py）；stage 0 芽 | 1 长 | 2 熟；id 为空只画空垄
// ART.icon(丹方 id)                     → 19 种丹药齐全（新增 liaoshang baoqi bingxin cuiti yanghun leihuo baicao wudao pozhang qingdu dingshen huaxing zhuyan）
//   三类一眼可分：修炼类 = 素丸；战斗类 = 两侧带火星；根基类 = 垫金托。ART.pillGroup(id) → 'x' 修 | 'z' 战 | 'g' 根；ART.pillIds()
// ART.yinCell(a, b, pill, sel)          → 22×22 药引格：a、b 为 'f' 'i' 't' 'w' 's'（或 0～4），两色斜分；pill 传丹方 id 则画上丹药，否则画“？”；sel 金框
// ART.toxinGourd(frac)                  → 16×16 丹毒葫芦，frac 0～1（>0.6 变紫冒泡，≥1 变红）
Object.assign(ICONS, {
  c_rice: '.......y/......yyy....y/.....yyY....yy/....yyY....yyY/...yyY.g..yyY/...yY..g.yyY/...Y...gg.Y/..l....gG/..lg...gG..l/...gg..gG.lg/....gG.gGgG/.....gGgGG/......gGG',
  c_grain: '......mm/.....mmmM/.....mhmM/....mmmmM....m/....mhmmM...mmM/.....mmM....mhM/.....mM.g...mmM/......g.g....M/..l...gG....g/..lg..gG...gG/...gg.gG..gG/....gGgGgGG/.....gGGG',
  c_fire: '.....g..r/....gGg.rr/...gg.Grmr/..g...rrmhr/......rmhhr/..rr..rmmrR.g/.rmhr..rRR.gG/.rmmr...G.gG/..rR...gGgG/...g..gGG/...gG.gG/....gGgG/.....GG',
  c_ice: '......i/.....iwi/..i..iwi..i/.iwi.iwb.iwi/.iwbiwwbiwbb/..iwbwwbwbb/...bbwybbb/....bbbbb/.cccc.G.cccc/cccCCcGcCCccc/.CCCC.G.CCCC/......G',
  c_bolt: '....y.....v/...yy....vvV/...yyy...vV.l/..yyy....vV.lg/....y...vvV/....yy..vV/.......vvvV/..vV....vV/..vvV..vvV/..vV...vV/.vvvV..vV/..vV..vvvV/..vV...vV',
  c_vine: '....ggg/...g...g..y/..g..o..g.yg/..g..o.gg/...g.ogg/....gog...l/...ggog..lg/..gg.o.g.g/..g..o..gg/..gy.o.gg/...ggogg/.....o/....ooo',
  c_soul: '....u...w/...uwu.....w/..uuwuu/.uwwywwu..w/..uuwuu/...uwu.g/....u.gG/.....gG/..l..gG/..lg.gG.l/...gggGgg/.....gGG/.....GG',
});
const CROPS = {
  // [茎, 叶, 果/花, 高光, 形]
  herb: ['#3f8a3a', '#6fcf5a', '#9ae06a', '#d6f58a', 0], rice: ['#6a9a3a', '#a8c84a', '#f4c542', '#fff2a8', 1], grain: ['#5a8a3a', '#8ab84a', '#e8925a', '#ffd0a0', 2], fire: ['#2f6e4b', '#3f8a5a', '#e8483a', '#ffb23f', 3],
  ice: ['#3a7ab8', '#7fc8e8', '#d4f4ff', '#ffffff', 4], bolt: ['#6a3aa8', '#a88af0', '#f4e04a', '#ffffff', 5], vine: ['#7a5230', '#2f8e4b', '#62d26f', '#f4c542', 6], soul: ['#4a7a6a', '#6aa88a', '#b8a0f0', '#ffffff', 7],
};
ART.cropIds = Object.keys(CROPS);
const cropId = id => typeof id === 'number' ? ART.cropIds[id] : CROPS[id] ? id : null;
ART.crop = id => ART.icon(cropId(id) === 'herb' ? 'herb' : 'c_' + (cropId(id) || 'rice'));
ART.drawPlot = function (px, py, id, stage, t) {
  px = Math.round(px); py = Math.round(py); t = t || 0;
  R(px - 1, py - 1, 18, 9, '#5a4034'); R(px, py, 16, 7, '#6e4c36'); R(px - 1, py - 1, 18, 1, '#a07a50'); R(px - 1, py + 7, 18, 1, '#3e2a28');
  for (let k = 0; k < 3; k++) { R(px, py + 1 + k * 2, 16, 1, '#825c40'); dR(px, py + 2 + k * 2, 16, 1, '#553a30', 8); }
  const C = CROPS[cropId(id)]; if (!C) return;
  const [s, l, f, h2, sh] = C;
  for (let k = 0; k < 4; k++) {
    const x = px + 2 + k * 4, y = py + 2 + (k % 2), sw = Math.round(Math.sin(t / 700 + px * 0.3 + k) * 0.7), sp = (t / 400 + k * 2 + px | 0) % 5 === 0;
    if (stage <= 0) { R(x, y - 1, 1, 2, s); R(x - 1, y - 2, 1, 1, l); R(x + 1, y - 2, 1, 1, l); continue; }
    const g = stage >= 2;
    if (sh === 0) { R(x, y - 2, 1, 3, s); R(x - 1 + sw, y - 3, 1, 2, l); if (g) { R(x + 1 + sw, y - 4, 1, 2, f); R(x + sw, y - 5, 1, 1, h2); } }
    else if (sh === 1) { R(x, y - (g ? 5 : 3), 1, g ? 6 : 4, s); R(x - 1, y - 2, 1, 2, l); if (g) { R(x + 1 + sw, y - 6, 1, 3, f); R(x + 2 + sw, y - 4, 1, 2, f); R(x + 1 + sw, y - 6, 1, 1, h2); } else R(x + 1, y - 4, 1, 2, l); }
    else if (sh === 2) { R(x, y - (g ? 4 : 3), 1, g ? 5 : 4, s); R(x + 1, y - 2, 1, 1, l); R(x - 1, y - 3, 1, 1, l); if (g) { R(x - 1, y - 7, 2, 4, f); R(x - 1, y - 7, 1, 2, h2); R(x, y - 8, 1, 1, f); } }
    else if (sh === 3) { R(x - 1, y - (g ? 4 : 3), 3, g ? 4 : 3, l); R(x, y - (g ? 5 : 4), 1, 1, s); R(x - 1, y - 1, 3, 1, s); if (g) { R(x - 1 + (k % 2) * 2, y - 4, 1, 1, f); R(x + (k % 2 ? -1 : 1), y - 2, 1, 1, f); R(x, y - 3, 1, 1, sp ? h2 : f); } }
    else if (sh === 4) { R(x - 1, y - 1, 3, 1, s); R(x - 2, y, 2, 1, l); if (g) { R(x - 1, y - 3, 3, 2, f); R(x, y - 4, 1, 1, h2); R(x - 2, y - 2, 1, 1, l); R(x + 2, y - 2, 1, 1, l); R(x, y - 2, 1, 1, '#f4c542'); } else R(x, y - 2, 1, 1, f); }
    else if (sh === 5) { const hh = g ? 8 : 4; R(x, y - hh + 1, 1, hh, l); for (let j = 2; j < hh; j += 3) R(x, y - j, 1, 1, s); R(x + 1, y - hh + 2, 1, 1, l); if (g) { R(x - 1, y - 5, 1, 1, l); R(x + (sp ? 1 : -1), y - 8, 1, 1, sp ? h2 : f); } }
    else if (sh === 6) { const hh = g ? 7 : 4; R(x, y - hh + 1, 1, hh, s); for (let j = 1; j < hh; j += 2) R(x + (j % 4 === 1 ? -1 : 1), y - j, 1, 1, j % 4 === 1 ? l : f); if (g) R(x + 1, y - 7, 1, 1, h2); }
    else { R(x, y - (g ? 4 : 2), 1, g ? 5 : 3, s); R(x - 1, y - 1, 1, 1, l); if (g) { R(x - 1, y - 6, 3, 2, f); R(x, y - 7, 1, 1, f); R(x, y - 5, 1, 1, h2); if (sp) R(x + 1 + sw, y - 9, 1, 1, h2); } else R(x, y - 3, 1, 1, f); }
  }
};
Object.assign(PILLS, {
  liaoshang: ['#f4e8e0', '#b89a94', '#ffffff', '/....../....rr/....rr/..rrrrrr/..rrrrrr/....rr/....rr'],
  baoqi: ['#f0642a', '#a02a1a', '#ffd0a0', '/....../..w..w..w/...w.w.w/....www/..wwwwwww/....www/...w.w.w/..w..w..w'],
  bingxin: ['#8fd8f0', '#3a8ab8', '#ffffff', '/....../.....w/..w..w..w/...w.w.w/.wwwwwwwww/...w.w.w/..w..w..w/.....w'],
  cuiti: ['#c88a4a', '#7a4a26', '#ffe0b0', '/....../...w...w/....w...w/.....w...w/....w...w/...w...w'],
  yanghun: ['#b8a8f0', '#6a5ab0', '#ffffff', '/....../....ww/...wwww/...wwww/....www/.....ww/....ww/...w'],
  leihuo: ['#f4a020', '#a85a10', '#fff6c8', '/....../.....ww/....ww/...wwww/.....ww/....ww/...ww/...w'],
  baicao: ['#a8c83a', '#5a7a1e', '#f0ffb4', '/....../....w/...www/....w...w/.......www/..w.....w/.www/..w'],
  wudao: ['#3a4aa8', '#1e2460', '#d4dcff', '/....../.....w/....www/..wwwwwww/...wwwww/...ww.ww/..ww...ww'],
  pozhang: ['#9aa2b8', '#55607e', '#ffffff', '/....../....w/....ww/.....w/....ww/...ww/....w/....ww'],
  qingdu: ['#8fe8c0', '#3a9a7a', '#ffffff', '/....../.....b/.....b/....bbb/....bbb/...bbbbb/...bbbbb/....bbb'],
  dingshen: ['#2a5a8a', '#12304e', '#bfe4ff', '/....../....www/...w...w/...w.w.w/...w...w/....www//..wwwwwww'],
  huaxing: ['#e8a05a', '#9a5a26', '#fff0d0', '/....../...w.w.w/...w.w.w//....www/...wwwww/...wwwww/....www'],
  zhuyan: ['#e87ac8', '#983a80', '#ffe0f4', '/....../....w.w/...wwwww/....wrw/...wwwww/....w.w'],
});
const PILL_G = { peiyuan: 'x', juling: 'x', yanghun: 'x', baicao: 'x', wudao: 'x', baoqi: 'z', leihuo: 'z' };
ART.pillGroup = id => PILLS[id] ? PILL_G[id] || 'g' : null;
ART.pillIds = () => Object.keys(PILLS);
{
  const icon0 = ART.icon;
  ART.icon = function (name) {
    if (!PILLS[name]) return icon0(name);
    const g = ART.pillGroup(name); if (g === 'x') return icon0(name);
    return cached('ic2|' + name, () => on(mk(16, 16), () => {
      const src = icon0(name);
      if (g === 'g') { ctx.drawImage(src, 0, -1); R(3, 14, 10, 2, INK); R(2, 13, 1, 2, INK); R(13, 13, 1, 2, INK); R(3, 13, 10, 1, '#f4c542'); R(4, 14, 8, 1, '#a8742a'); R(3, 13, 2, 1, '#fff2a8'); }
      else { ctx.drawImage(src, 0, 0); for (const [x, y] of [[0, 3], [14, 2], [1, 11], [14, 12]]) { R(x, y, 2, 2, INK); R(x, y, 1, 1, '#ffb23f'); R(x + 1, y + 1, 1, 1, '#e8483a'); R(x + 1, y, 1, 1, '#fff2a8'); } }
    }));
  };
}
const YIN_C = { f: ['#e8483a', '#ffb23f'], i: ['#4aa8ff', '#d4ecff'], t: ['#f4e04a', '#c27dff'], w: ['#62d26f', '#2f8e4b'], s: ['#b8c0f0', '#6a72b8'] }, YIN_K = 'fitws';
ART.yinKeys = YIN_K.split('');
ART.yinCell = function (a, b, pill, sel) {
  a = typeof a === 'number' ? YIN_K[a] : a; b = typeof b === 'number' ? YIN_K[b] : b; const A = YIN_C[a] || YIN_C.f, B = YIN_C[b] || YIN_C.f;
  return cached(['yin', a, b, pill || '', sel ? 1 : 0].join('|'), () => on(mk(22, 22), () => {
    R(1, 0, 20, 22, INK); R(0, 1, 22, 20, INK);
    for (let y = 1; y < 21; y++) for (let x = 1; x < 21; x++) { const d = x + y - 21, top = d < 0, c = top ? A : B, k = pill ? 0.55 : 0.2; R(x, y, 1, 1, d === 0 || d === -1 ? '#1e1830' : lerpC('#262038', c[0], BAYER[(x & 3) + (y & 3) * 4] < 6 ? k : k * 0.7)); }
    R(2, 2, 3, 3, A[0]); R(2, 2, 1, 1, A[1]); R(17, 17, 3, 3, B[0]); R(17, 17, 1, 1, B[1]);
    const fc = sel ? '#f4c542' : pill ? '#928ea8' : '#55506e'; R(1, 1, 20, 1, fc); R(1, 20, 20, 1, hs(fc, 0.7)); R(1, 1, 1, 20, fc); R(20, 1, 1, 20, hs(fc, 0.7));
    if (pill) ctx.drawImage(ART.icon(pill), 3, 3);
    else for (const [x, y, w, hh] of [[8, 6, 6, 2], [7, 7, 2, 2], [13, 7, 2, 4], [10, 10, 4, 2], [10, 11, 2, 3], [10, 15, 2, 2]]) R(x, y, w, hh, '#928ea8');
  }));
};
ART.toxinGourd = function (frac) {
  const lv = Math.max(0, Math.min(10, Math.round(frac * 10)));
  return cached('toxin|' + lv, () => {
    const b = new Buf(16, 16), G2 = tone('#e0c890', '#a88a52', '#fff6d8'), c = lv >= 10 ? '#d8404a' : lv > 6 ? '#a050c8' : '#62d26f';
    b.add(L => { L.e(8, 10.5, 5, 4.5, G2); L.e(8, 5, 3, 2.8, G2); L.r(7, 7, 2, 2, G2); });
    b.r(7, 0, 2, 2, '#8a5c36'); b.hl(6, 9, 7, '#d8404a');
    const top = 15 - lv * 1.25;
    for (let y = 2; y < 15; y++) for (let x = 3; x < 13; x++) if (y >= top && [G2, up(G2), dn(G2)].includes(b.at(x, y)) && b.at(x - 1, y) && b.at(x + 1, y) && b.at(x, y + 1) && y !== 7) b.p(x, y, y === Math.ceil(top) ? lerpC(c, '#ffffff', 0.5) : x > 9 ? hs(c, 0.7) : c);
    if (lv > 6) { b.p(4, 2, c); b.p(12, 3, c); b.p(11, 1, lerpC(c, '#ffffff', 0.5)); }
    return b.cv();
  });
};

// ---------- 六、洞府：建筑、地块、阵法 ----------
// 建筑 id（ART.buildingIds）：array 聚灵阵 field 灵田 furnace 丹炉 forge 器炉 pen 兽栏 room 静室 library 藏经阁 spring 灵泉 vault 聚宝阁 pavilion 迎客亭 portal 传送阵
// ART.building(id)                         → 16×16 图标（前三个沿用已有的 array / field / furnace）
// ART.buildingSprite(id, tier 0～2)        → 26×26 场景小建筑（底边中点为锚点）；array / field 没有（阵法画在地上，田用 drawPlot）
// ART.drawBuilding(id, lv, x, y, t)        → 画到洞府场景，(x,y) 为底边中点；按等级自动取三档外观并带动画（炉火、泉水、传送门）；返回夜间光源 {x,y,r,c,a} 或 null
// ART.homeSlots                            → 8 个地块在洞府场景里的建议位置 [{x,y}]（第 0 块是聚灵阵 = 主角座下）
// ART.plotTile(state, sel)                 → 26×26 地块格：'empty' 空地 | 'built' 已建（上面再叠建筑图标）| 'locked' 未开；sel 金角
// ART.sigil(id)                            → 16×16 阵图：f_juling f_shengcai f_hushan f_yangshou f_danhuo f_duanhun f_dujie f_mizong（ART.sigilIds）
// ART.drawFormation(id, x, y, t, o)        → 洞府地面上的阵法光圈，(x,y) 为主角脚底；o = { pending: 布阵中, small: 第二阵位, part: 'back' | 'front' }
Object.assign(ICONS, {
  b_forge: '....sss/...sttts..o/....sts..oO/.....oooO/....oO/...oO/.ssssssssss/.sttttttttSs/..SSsttSSS/....sttS/....sttS/...sstSSS/..ssttttSS/..SSSSSSSS',
  b_pen: '.....gg.gg/....ggggggg/.....ggggg/....gg.g.gg/...ggggggggg/....ggggggg//.o...o...o..o/oooooooooooooo/.o...o...o..o/oooooooooooooo/.o...o...o..o/.O...O...O..O',
  b_room: '....ssssss/..sstttttSss/.sttSSSSSStS/.stSkkkkkkStS/.stSkkyykkStS/.stSkyhhykStS/.stSkkyykkStS/.stSkkkkkkStS/.stSkjjjjkStS/.stSjjJJjjStS/.stSJJJJJJStS/.SSSSSSSSSSSS',
  b_lib: '......yy/.....bbbb/...bbbbbbbb/.bbBBBBBBBBbb/...nnnnnnnn/...nNkNNkNn/..bbbbbbbbbb/bbBBBBBBBBBBbb/..nnnnnnnnnn/..nNkNooNkNn/..nNNNooNNNn/.ssssssssssss',
  b_spring: '...w....w/....w....w/...w....w//...ssssssss/.sstccccccSss/stccwwccccccSs/stcccccwwcccSs/sStccccccccSSs/.sSSccccccSSs/..sSSSSSSSSs/....SSSSSS',
  b_vault: '......yy/....rrrrrr/..rrRRRRRRrr/rrRRRRRRRRRRrr/..nnnnnnnnnn/..nNyyyyyyNn/..nNyhYYhyNn/..nNyYkkYyNn/..nNyYkkYyNn/..nNyhYYhyNn/..nNyyyyyyNn/.ssssssssssss',
  b_pav: '......yy/.....gggg/...gggggggg/.ggGGGGGGGGgg/g.GG......GG.g/..rR......rR/..rR..ww..rR/..rR.oooo.rR/..rR.o..o.rR/..rR......rR/.ssssssssssss/.SSSSSSSSSSSS',
  b_gate: '....vvvvvv/..vvsssssSvv/.vss.cccc.sSv/.vs.cwcccc.Sv/vs.cwcccccc.Sv/vs.ccccwccc.Sv/vs.cccwwccc.Sv/vs.ccccccwc.Sv/.vs.cccccc.Sv/.vsS.cccc.SSv/..vvSSSSSSvv/.ssssssssssss',
});
const BLD_ICON = { array: 'array', field: 'field', furnace: 'furnace', forge: 'b_forge', pen: 'b_pen', room: 'b_room', library: 'b_lib', spring: 'b_spring', vault: 'b_vault', pavilion: 'b_pav', portal: 'b_gate' };
const BLD_MAX = { furnace: 20, forge: 15, pen: 12, room: 12, library: 10, spring: 10, vault: 12, pavilion: 8, portal: 9 };
ART.buildingIds = Object.keys(BLD_ICON);
ART.building = id => ART.icon(BLD_ICON[id] || 'cave');
const STONE3 = [tone('#8a86a0', '#55506e', '#b8b4cc'), tone('#a8a2b4', '#6a6480', '#d4d0e0'), tone('#dcd8e8', '#9a94b0', '#ffffff')], PAPERW = tone('#efe3c4', '#c8b48c', '#fffaf0');
const peak = (L, cx, y, hw, hh, c) => { for (let k = 0; k < hh; k++) { const w = Math.round(1 + (hw - 1) * Math.pow((k + 1) / hh, 1.4)); L.hl(cx - w, cx + w - 1, y + k, c); } L.p(cx - hw - 1, y + hh - 1, c); L.p(cx + hw, y + hh - 1, c); };
const BLD = {
  forge(b, t) {
    const K = [tone('#8a5a4a', '#5a3430', '#b8826a'), tone('#6a6a82', '#3e3e56', '#9a9ab0'), tone('#c8963a', '#8a5a1e', '#f4d06a')][t];
    b.add(L => { L.r(3, 12, 13, 12, K); L.e(9.5, 12, 6.5, 4.5, K); L.r(12, 2 - t, 3, 9, K); });
    b.r(6, 16, 7, 7, '#2a1418'); b.r(7, 15, 5, 1, '#2a1418'); b.r(7, 20, 5, 3, '#ff8a2a'); b.r(8, 19, 3, 2, '#ffd060'); b.hl(12, 14, 3 - t, dn(K)); if (t) b.hl(3, 15, 13, '#f4c542');
    b.add(L => { L.r(17, 17, 7, 2, STEEL); L.r(16, 17, 2, 1, STEEL); L.r(19, 19, 3, 2, STEEL); L.r(18, 21, 5, 3, STEEL); });
    if (t > 1) { b.p(13, 0, '#fff2a8'); b.r(20, 14, 2, 3, '#f4c542'); b.l(21, 13, 24, 10, WOOD); }
  },
  pen(b, t) {
    const Wl = [tone('#b98a4c', '#7a5230', '#e0b878'), PAPERW, PAPERW][t], Rf = [tone('#7a5230', '#4a3020', '#a8784a'), RED, JADE][t];
    b.add(L => L.r(3, 13, 12, 11, Wl)); b.add(L => peak(L, 9, 6, 8, 7, Rf));
    b.r(7, 17, 4, 7, '#3a2420'); b.r(8, 16, 2, 1, '#3a2420'); for (const [x, y] of [[8, 13], [10, 13], [9, 14], [8, 15], [9, 15], [10, 15]]) b.p(x, y, '#7a5230'); b.p(7, 14, '#7a5230'); b.p(11, 14, '#7a5230');
    b.add(L => { for (const x of [16, 20, 24]) L.r(x, 16, 1, 8, WOOD); L.r(15, 18, 10, 1, WOOD); L.r(15, 21, 10, 1, WOOD); });
    if (t) { b.r(8, 4, 2, 2, '#f4c542'); b.p(18, 23, '#62d26f'); b.p(22, 23, '#a8e08a'); } if (t > 1) { b.r(20, 14, 1, 2, '#d8404a'); b.r(21, 14, 2, 1, '#d8404a'); }
  },
  room(b, t) {
    const S = STONE3[t], ac = ['#55506e', '#4ccb9f', '#f4c542'][t];
    b.add(L => { L.e(13, 14, 11, 10, S); L.r(2, 14, 22, 10, S); L.r(0, 24, 26, 2, null); });
    for (let y = 12; y < 24; y++) for (let x = 8; x < 18; x++) { const d = Math.hypot(x + 0.5 - 13, (y + 0.5 - 18) * 0.95); if (d < 5 && y < 24) b.p(x, y, d > 4 ? ac : '#2a2238'); }
    b.r(12, 20, 2, 2, '#ffd88a'); b.p(12, 19, '#fff6d0'); b.r(10, 22, 6, 2, '#8a4ec8'); b.hl(4, 21, 23, dn(S)); for (const [x, y] of [[4, 12], [20, 10], [6, 18], [21, 17]]) b.hl(x, x + 1, y, dn(S));
    if (t) { b.r(12, 2, 2, 3, ac); b.p(12, 2, '#ffffff'); } if (t > 1) b.mir(T => T.r(3, 20, 2, 4, '#f4c542'));
  },
  library(b, t) {
    const Rf = [tone('#3a4a6a', '#222e50', '#6a7aa0'), tone('#3f6ec0', '#263f7a', '#7aa2e6'), tone('#6a3aa8', '#3e2068', '#a87ae0')][t], n = t ? 3 : 2;
    for (let k = 0; k < n; k++) { const y = 19 - k * 7, hw = 8 - k * 1.5; b.add(L => L.r(Math.round(13 - hw + 1), y, Math.round(hw * 2 - 2), 5, PAPERW)); b.add(L => peak(L, 13, y - 3, Math.round(hw + 2), 3, Rf)); for (const dx of [-3, 2]) b.r(13 + dx, y + 1, 1, 3, k ? '#7a5230' : '#3a2420'); if (!k) b.r(12, y + 1, 2, 4, '#7a2a22'); }
    b.r(12, 19 - n * 7 + 1, 2, 3, '#f4c542'); b.hl(4, 21, 24, '#928ea8'); if (t > 1) b.mir(T => { T.p(3, 19, '#d8404a'); T.p(3, 20, '#ffb23f'); });
  },
  spring(b, t) {
    const S = STONE3[t];
    b.add(L => { L.e(6, 13, 4, 4, S); L.e(19, 11, 5, 6, S); L.e(12, 12, 3, 3, S); });
    b.add(L => L.e(13, 19, 12, 5.5, S)); for (let y = 15; y < 24; y++) for (let x = 3; x < 23; x++) if (((x + 0.5 - 13) / 9.5) ** 2 + ((y + 0.5 - 19) / 3.6) ** 2 < 1) b.p(x, y, y < 17 ? '#2a8ab0' : '#3fb0d0');
    b.hl(8, 11, 18, '#d4f4ff'); b.hl(14, 18, 20, '#8fe0f0'); b.hl(6, 9, 21, '#8fe0f0');
    if (t) { b.r(17, 10, 2, 7, '#d4f4ff'); b.p(18, 12, '#8fe0f0'); b.p(17, 15, '#8fe0f0'); } if (t > 1) { b.r(7, 19, 3, 1, '#62d26f'); b.r(8, 18, 2, 1, '#f7a3bd'); b.p(8, 17, '#ffd6e4'); b.r(4, 9, 2, 2, '#4ccb9f'); }
  },
  vault(b, t) {
    const Rf = [tone('#8a5c36', '#5a3a26', '#b98a4c'), RED, GOLD][t];
    b.add(L => L.r(3, 13, 20, 11, PAPERW)); b.add(L => { peak(L, 13, 5, 11, 6, Rf); L.r(1, 11, 24, 2, Rf); });
    b.mir(T => T.r(4, 14, 2, 10, '#a8323c')); b.r(9, 15, 8, 9, '#7a2a22'); b.r(12, 15, 2, 9, '#4f1818');
    b.add(L => { L.e(13, 18.5, 3, 3, GOLD); }, { sep: 1 }); b.r(12, 18, 2, 2, '#7a2a22'); b.r(12, 3, 2, 2, '#f4c542');
    if (t) b.mir(T => { T.r(1, 21, 2, 3, '#f4c542'); T.p(1, 20, '#fff2a8'); }); if (t > 1) { b.p(13, 1, '#fff2a8'); b.hl(3, 22, 13, '#d8404a'); }
  },
  pavilion(b, t) {
    const Rf = [tone('#4a7a5a', '#2a4a3a', '#7aa87a'), tone('#2a8a7a', '#1a5a52', '#5fd3b0'), tone('#3f6ec0', '#263f7a', '#7aa2e6')][t];
    b.add(L => { L.mir(T => T.r(4, 11, 2, 12, RED)); L.r(2, 23, 22, 2, STONE3[1]); });
    b.add(L => { peak(L, 13, 4, 11, 7, Rf); L.p(0, 9, Rf); L.p(25, 9, Rf); if (t > 1) peak(L, 13, 0, 6, 4, Rf); });
    b.r(12, t > 1 ? 0 : 2, 2, 2, '#f4c542'); b.add(L => { L.r(10, 19, 6, 1, WOOD); L.r(12, 20, 2, 3, WOOD); }); b.p(11, 18, '#ffffff'); b.p(14, 18, '#ffffff');
    if (t) b.mir(T => { T.r(7, 11, 1, 2, '#f4c542'); T.r(6, 13, 3, 3, '#e8483a'); T.p(7, 16, '#f4c542'); });
  },
  portal(b, t) {
    const S = STONE3[t], ac = ['#7fe0f0', '#4ccb9f', '#f4c542'][t];
    b.add(L => { L.e(13, 13, 10.5, 12, S); L.e(13, 13, 7, 8.5, null); L.r(0, 23, 26, 3, null); L.r(2, 22, 22, 3, S); });
    for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; b.p(Math.round(13 + Math.cos(a) * 8.8), Math.round(13 + Math.sin(a) * 10.2), ac); }
    b.hl(5, 20, 23, dn(S)); if (t) { b.r(12, 0, 2, 2, ac); b.mir(T => T.r(2, 20, 2, 2, ac)); }
  },
};
ART.buildingSprite = function (id, tier) {
  tier = Math.max(0, Math.min(2, tier | 0));
  if (id === 'furnace') return furnaceSprite(tier);
  return BLD[id] ? cached('bld|' + id + tier, () => { const b = new Buf(26, 26); BLD[id](b, tier); return b.cv({ max: 15 }); }) : null;
};
ART.homeSlots = [{ x: 100, y: 136 }, { x: 22, y: 128 }, { x: 166, y: 133 }, { x: 62, y: 127 }, { x: 138, y: 127 }, { x: 60, y: 152 }, { x: 142, y: 153 }, { x: 186, y: 152 }];
ART.drawBuilding = function (id, lv, x, y, t) {
  const mx = BLD_MAX[id] || 12, tier = lv >= mx * 0.66 ? 2 : lv >= mx * 0.33 ? 1 : 0, s = ART.buildingSprite(id, tier); if (!s) return null;
  x = Math.round(x); y = Math.round(y); t = t || 0;
  ellipse(x, y, 12, 2, 'rgba(20,14,40,0.25)');
  if (id === 'furnace') { ctx.drawImage(s, x - 10, y - 15); const fl = (t / 110 | 0) % 4, fc = [['#ff7a2a', '#ffd060'], ['#3ab8ff', '#8fe8ff'], ['#a86aff', '#e0b8ff']][tier]; R(x - 3, y - 2, 6, 2, fc[0]); R(x - 2 + (fl % 2), y - 3, 3, 2, fc[1]); R(x - 4 + fl, y - 3, 1, 1, fc[0]); return { x, y: y - 4, r: 11, c: fc[0], a: 0.55 }; }
  ctx.drawImage(s, x - 13, y - 25);
  const fl = (t / 120 | 0) % 4;
  if (id === 'forge') { R(x - 6 + (fl % 2), y - 6, 3, 2, '#fff2a8'); R(x - 5 + fl % 3, y - 7, 1, 1, '#ffd060'); for (let i = 0; i < 3; i++) { const k = ((t / 70 + i * 9) % 22) | 0; ctx.globalAlpha = 0.5 - k / 44; R(x + Math.round(Math.sin(t / 300 + k * 0.4 + i) * 2), y - 25 - k, 2, 2, '#c8c4d8'); } ctx.globalAlpha = 1; return { x: x - 4, y: y - 4, r: 9, c: '#ff8a2a', a: 0.5 }; }
  if (id === 'spring') { for (let i = 0; i < 4; i++) R(x - 8 + ((i * 5 + (t / 200 | 0) * 2) % 16), y - 7 + (i % 3) * 2, 3, 1, '#d4f4ff'); for (let i = 0; i < 3; i++) { const k = ((t / 90 + i * 8) % 20) | 0; ctx.globalAlpha = 0.45 - k / 44; R(x - 5 + i * 5 + Math.round(Math.sin(t / 400 + k * 0.5 + i) * 1.5), y - 9 - k, 2, 2, '#ffffff'); } ctx.globalAlpha = 1; return { x, y: y - 6, r: 9, c: '#7fe0f0', a: 0.3 }; }
  if (id === 'portal') { const c = ['#7fe0f0', '#4ccb9f', '#f4c542'][tier]; ctx.globalAlpha = 0.55; for (let j = -8; j <= 7; j++) { const w = Math.round(Math.sqrt(1 - (j * j) / 72) * 6.5); dR(x - w, y - 12 + j, w * 2, 1, c, 6 + ((j + (t / 150 | 0)) & 3) * 2); } ctx.globalAlpha = 1; for (let i = 0; i < 9; i++) { const a = t / 500 + i * 0.7, r = 1 + i * 0.6; R(x + Math.cos(a) * r, y - 12 + Math.sin(a) * r * 1.2, 1, 1, i % 2 ? '#ffffff' : c); } return { x, y: y - 12, r: 10, c, a: 0.45 }; }
  if (id === 'room') return { x, y: y - 5, r: 5, c: '#ffcf6a', a: 0.4 };
  if (id === 'pavilion' && tier) return { x, y: y - 11, r: 8, c: '#ff8a44', a: 0.4 };
  return null;
};
ART.plotTile = function (state, sel) {
  return cached('plot|' + state + (sel ? 1 : 0), () => on(mk(26, 26), () => {
    const lk = state === 'locked', bt = state === 'built';
    R(1, 0, 24, 26, INK); R(0, 1, 26, 24, INK);
    R(1, 1, 24, 24, lk ? '#3e3a56' : bt ? '#a8a2b4' : '#6e4c36');
    if (bt) { R(1, 1, 24, 1, '#d4d0e0'); R(1, 1, 1, 24, '#d4d0e0'); R(1, 24, 24, 1, '#6a6480'); R(24, 1, 1, 24, '#6a6480'); for (const [x, y, w] of [[2, 9, 22], [2, 17, 22]]) R(x, y, w, 1, '#8a86a0'); for (const [x, y] of [[9, 2], [17, 2], [5, 10], [13, 10], [21, 10], [9, 18], [17, 18]]) R(x, y, 1, 7, '#8a86a0'); dR(2, 18, 22, 6, '#928ea8', 4); }
    else if (lk) { dR(1, 1, 24, 24, '#2a2638', 8); for (const [x, y, w] of [[4, 6, 7], [14, 4, 6], [8, 15, 9], [17, 18, 5], [3, 20, 4]]) { R(x, y, w, 3, '#55506e'); R(x, y, w, 1, '#716c8a'); } ctx.drawImage(ART.icon('lock'), 5, 5); }
    else { for (let k = 0; k < 6; k++) { R(1, 3 + k * 4, 24, 1, '#825c40'); dR(1, 4 + k * 4, 24, 1, '#553a30', 8); } R(1, 1, 24, 1, '#a07a50'); R(1, 24, 24, 1, '#3e2a28'); for (let i = 3; i < 23; i += 4) { R(i, 2, 2, 1, '#efe3c4'); R(i, 23, 2, 1, '#efe3c4'); R(2, i, 1, 2, '#efe3c4'); R(23, i, 1, 2, '#efe3c4'); } R(10, 12, 6, 2, '#efe3c4'); R(12, 10, 2, 6, '#efe3c4'); }
    if (sel) for (const [x, y, dx, dy] of [[0, 0, 1, 1], [25, 0, -1, 1], [0, 25, 1, -1], [25, 25, -1, -1]]) for (let k = 0; k < 6; k++) { R(x + dx * k, y, 1, 1, '#f4c542'); R(x, y + dy * k, 1, 1, '#f4c542'); R(x + dx * k, y + dy, 1, 1, k ? '#fff2a8' : '#f4c542'); R(x + dx, y + dy * k, 1, 1, k ? '#fff2a8' : '#f4c542'); }
  }));
};
const SIGILS = {
  f_juling: ['#4ccb9f', 'xxxxxx/x/x.xxx/x.x.x/x.xxx.x/x.....x/.xxxxxx'], f_shengcai: ['#f4c542', '.xxxxxx/x.xxxx.x/x.x..x.x/x.x..x.x/x.xxxx.x/.xxxxxx'], f_hushan: ['#4aa8ff', '...x/..xxx/..xwx/.xxxxx/.xxxxxx/xxxxxxxx/xxxxxxxx'],
  f_yangshou: ['#62d26f', '.x.xx.x/.x.xx.x//..xxxx/.xxxxxx/.xxxxxx/..x..x'], f_danhuo: ['#e8483a', '...x/...xx/..xxx.x/.xxwxxx/.xwwwxx/.xwwwxx/..xxxx'], f_duanhun: ['#c27dff', '...xx/...xx/...xx/...xx/.xxxxxx/...xx/...xx'],
  f_dujie: ['#f4e04a', '....xx/...xx/..xx/.xxxxx/...xx/..xx/.xx'], f_mizong: ['#9aa2dc', 'xxxxxx/......x/.xxxx.x/.x....x/.x.xxxx/.x/.xxxxxx'],
};
ART.sigilIds = Object.keys(SIGILS);
ART.sigilColor = id => (SIGILS[id] || SIGILS.f_juling)[0];
ART.sigil = function (id) {
  const S = SIGILS[id] || SIGILS['f_' + id]; if (!S) return null;
  return cached('sigil|' + id, () => { const b = new Buf(16, 16); b.e(8, 8, 7, 7, S[0]); b.e(8, 8, 5.8, 5.8, '#1e1830'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + 0.4; b.p(Math.round(7.5 + Math.cos(a) * 6.4), Math.round(7.5 + Math.sin(a) * 6.4), '#ffffff'); } b.m(4, 4 + (S[1].split('/').length < 7 ? 1 : 0), S[1].split('/'), { x: S[0], w: '#ffffff' }); return b.cv(); });
};
ART.drawFormation = function (id, x, y, t, o) {
  o = o || {}; x = Math.round(x); y = Math.round(y) - 1; const c = ART.sigilColor(SIGILS[id] ? id : 'f_' + id), hi = lerpC(c, '#ffffff', 0.6), rx = o.small ? 24 : 34, ry = o.small ? 6 : 9, N = 44, pend = o.pending;
  ctx.save();
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2 + t / 2600 * (o.small ? -1 : 1), s = Math.sin(a); if (o.part === 'back' ? s > 0 : o.part === 'front' ? s <= 0 : false) continue;
    if (pend && (i + (t / 180 | 0)) % 4 > 1) continue;
    ctx.globalAlpha = pend ? 0.5 : 0.85; R(x + Math.cos(a) * rx, y + s * ry, 2, 1, i % 11 === 0 ? hi : c);
    if (!pend && i % 11 === 0) { ctx.globalAlpha = 1; R(x + Math.cos(a) * rx, y + s * ry - 1, 1, 3, hi); R(x + Math.cos(a) * rx - 1, y + s * ry, 3, 1, hi); }
    if (i % 2 === 0) { ctx.globalAlpha = pend ? 0.25 : 0.5; R(x + Math.cos(-a * 1.0 + 1) * rx * 0.72, y + Math.sin(-a + 1) * ry * 0.72, 1, 1, c); }
  }
  if (o.part !== 'back' && !pend) { for (let i = 0; i < 6; i++) { const k = ((t / 60 + i * 11) % 30) / 30, a = i * 1.05 + 0.3; ctx.globalAlpha = (1 - k) * 0.8; R(x + Math.cos(a) * rx * 0.8, y + Math.sin(a) * ry * 0.8 - k * 18, 1, 2, hi); } ctx.globalAlpha = 0.12 + 0.05 * Math.sin(t / 500); ctx.globalCompositeOperation = 'lighter'; ellipse(x, y, rx - 4, ry - 2, c); }
  ctx.restore();
};

// ---------- 七、天劫与道心 ----------
// ART.drawTribClouds(t, OY, k)                → 劫云压顶，k 0～1 为聚拢程度（画在场景之上、人物之前）
// ART.drawTribBolt(x, yTop, yGround, k, seed, lvl) → 一道雷：k 0～1（0～0.15 先导，0.15～0.5 主击 + 闪屏，之后余辉）；seed 定折线；lvl 0 青白 1 金 2 紫 3 赤
// ART.drawShield(x, y, frac, t, hit)          → 护体光罩，(x,y) 人物脚底；frac 越低越红并出现裂纹；hit 真 = 受击闪白
// ART.drawShieldBar(x, y, w, frac, o)         → 护体条（高 7，左端盾牌）；o = { mark: 0～1 画一道“预计落点”刻线, lag }
// ART.stamp('完美' | '上' | '中' | '下')      → 24×24 道基品级印（完美为金边阴刻，也可写 '美'）
// ART.icon('dao_k' 狂 | 'dao_w' 稳 | 'dao_r' 仁 | 'karma' 因果)
// ART.backdrop('demon')                       → 200×120 心魔劫底图
Object.assign(ICONS, {
  dao_k: '......r/.....rr...w/....rrm..wW/...rrmm.wW/...rmmr.wW/..rrmhrwW/..rmhhmW/..rmhhwr/..rrmwWr/...rwWrR/..yyWRR/.oyy/oO',
  dao_w: '.....sss/....sttS/.....SS/...ssssss/..sttttttS/...SSSSSS/..ssssssss/.sttttttttS/.sttttttttS/..SSSSSSSS/bbbbbbbbbbbbbb/.BBBBBBBBBBBB',
  dao_r: '......f/.....fwf/..f..fwf..f/.fwf.fff.fwf/.fwwfffffwwf/..fwwfrfwwf/..ffwfrfwff/...ffffffF/.gg.FFFFF.gg/.gGg.....gGg/..gGGGGGGGg/....GGGGG',
  karma: '....yyyyy/..yyy.y.yyy/.yy...y...yy/.y.y..y..y.y/yy..y.y.y..yy/y....yyy....y/yyyyyyryyyyyy/y....yyy....y/yy..y.y.y..yy/.y.y..y..y.y/.yy...y...yy/..yyy.y.yyy/....yyyyy',
});
const GLYPH2 = {
  '美': ['...X.....X/....X...X/.XXXXXXXXXXX/......X/..XXXXXXXXX/......X/.XXXXXXXXXXX/......X/XXXXXXXXXXXXX/.....X.X/....X...X/..XX.....XX/XX.........XX', '#c8323c', 1, 1],
  '上': ['......XX/......XX/......XX/......XXXXXXX/......XXXXXXX/......XX/......XX/......XX/......XX/......XX/......XX/XXXXXXXXXXXXXX/XXXXXXXXXXXXXX', '#c8323c', 0, 0],
  '中': ['......XX/......XX/.XXXXXXXXXXXX/.XXXXXXXXXXXX/.XX...XX...XX/.XX...XX...XX/.XX...XX...XX/.XXXXXXXXXXXX/.XXXXXXXXXXXX/......XX/......XX/......XX/......XX', '#a8483a', 0, 0],
  '下': ['XXXXXXXXXXXXXX/XXXXXXXXXXXXXX/......XX/......XX/......XXXX/......XX.XXX/......XX...XX/......XX/......XX/......XX/......XX/......XX', '#8a6a62', 0, 0],
};
{
  const stamp0 = ART.stamp;
  ART.stamp = function (rating) {
    if (rating === '完美') rating = '美'; const S = GLYPH2[rating]; if (!S) return stamp0(rating);
    return cached('stamp|' + rating, () => {
      const b = new Buf(24, 24), col = S[1], rows = S[0].split('/'), r = seeded(rating.charCodeAt(0));
      b.r(1, 0, 22, 24, col); b.r(0, 1, 24, 22, col);
      if (!S[2]) { b.r(2, 2, 20, 20, null); for (const [x, y] of [[2, 2], [21, 2], [2, 21], [21, 21]]) b.p(x, y, col); }
      else { b.r(2, 2, 20, 1, '#f4c542'); b.r(2, 21, 20, 1, '#f4c542'); b.r(2, 2, 1, 20, '#f4c542'); b.r(21, 2, 1, 20, '#f4c542'); }
      const ink = S[2] ? '#fff6e0' : col, oy = 5 + ((14 - rows.length) >> 1);
      for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === 'X') { b.p(5 + i, oy + j, ink); if (S[3]) b.p(6 + i, oy + j, ink); }
      for (let k = 0; k < 9; k++) { const x = Math.floor(r() * 24), y = Math.floor(r() * 24); if (x < 3 || x > 20 || y < 3 || y > 20) b.p(x, y, null); }
      return b.cv({ noOutline: 1 });
    });
  };
}
ART.drawTribClouds = function (t, OY, k) {
  k = Math.max(0, Math.min(1, k)); OY = OY || 0;
  ctx.save(); ctx.globalAlpha = 0.5 * k; R(0, -OY, 200, 160 + OY, '#141028'); ctx.globalAlpha = 1;
  for (let i = 0; i < 12; i++) {
    const far = i % 2, spr = cached('tcl' + (i % 4) + far, () => cloudSprite(80 + i % 4, 34 + (i % 4) * 9, far ? '#4a4468' : '#5a5478', far ? '#2e2a48' : '#3a3458', '#1a1830'));
    const x = ((i * 37 + t * (0.006 + (i % 3) * 0.003)) % 260) - 50, y = -OY - 22 + k * (20 + (i % 3) * 8 + far * 4) + Math.sin(t / 900 + i) * 1.5;
    ctx.drawImage(spr, Math.round(x), Math.round(y));
  }
  R(0, -OY - 40, 200, 40 + k * 8, '#1a1830');
  ctx.restore();
};
const BOLT_C = ['#bfe4ff', '#f4e04a', '#c27dff', '#ff6b6b'];
ART.drawTribBolt = function (x, y0, y1, k, seed, lvl) {
  k = Math.max(0, Math.min(1, k)); const c = BOLT_C[(lvl | 0) & 3], r = seeded((seed | 0) + 5), n = 9, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x + (i === n ? 0 : (r() - 0.5) * 22 * (1 - u * 0.7) + (1 - u) * (((seed | 0) % 2) ? 14 : -14)), y0 + (y1 - y0) * u]); }
  const seg = (a, b2, col, th) => line(a[0], a[1], b2[0], b2[1], col, th);
  ctx.save();
  if (k < 0.15) { ctx.globalAlpha = 0.6; const m = Math.ceil(k / 0.15 * n); for (let i = 0; i < m; i++) seg(pts[i], pts[i + 1], c, 1); ctx.restore(); return; }
  const a = k < 0.5 ? 1 : Math.max(0, (1 - k) * 2), th = k < 0.5 ? 3 : 1;
  if (k < 0.27) { ctx.globalAlpha = 0.4 * (1 - (k - 0.15) / 0.12); R(-20, y0 - 60, 260, y1 - y0 + 140, '#ffffff'); }
  ctx.globalAlpha = a * 0.75; for (let i = 0; i < n; i++) seg([pts[i][0] - 1, pts[i][1]], [pts[i + 1][0] - 1, pts[i + 1][1]], c, th);
  for (const bi of [3, 6]) { let p = pts[bi]; for (let j = 0; j < 4; j++) { const q2 = [p[0] + (bi === 3 ? -1 : 1) * (4 + r() * 5), p[1] + 5 + r() * 6]; seg(p, q2, c, 1); p = q2; } }
  ctx.globalAlpha = a; for (let i = 0; i < n; i++) seg(pts[i], pts[i + 1], '#ffffff', k < 0.5 ? 2 : 1);
  ctx.globalAlpha = 1; glow(x, y1, 12 + (1 - k) * 10, c, 0.8 * a);
  if (k < 0.85) { const kk = (k - 0.15) / 0.7; ART.drawSpark(x, y1 - 1, kk); for (let i = 0; i < 7; i++) { const an = Math.PI * (1.05 + i * 0.15), d = 6 + kk * 18; ctx.globalAlpha = 1 - kk; R(x + Math.cos(an) * d, y1 + Math.sin(an) * d * 0.5 + kk * kk * 6, 2, 1, i % 2 ? c : '#ffffff'); } ellipse(x, y1 + 1, Math.round(4 + kk * 14), 2, 'rgba(255,255,255,' + (0.35 * (1 - kk)).toFixed(2) + ')'); }
  ctx.restore();
};
ART.drawShield = function (x, y, frac, t, hit) {
  x = Math.round(x); y = Math.round(y); frac = Math.max(0, Math.min(1, frac)); if (frac <= 0) return;
  const rr = 26, c = hit ? '#ffffff' : frac > 0.6 ? '#f4c542' : frac > 0.3 ? '#ffb23f' : '#ff6b3a', hi = lerpC(c, '#ffffff', 0.6);
  ctx.save();
  for (let j = -rr; j <= 2; j++) { const w = Math.round(Math.sqrt(rr * rr - j * j) * 0.95), yy = y + j; ctx.globalAlpha = (hit ? 0.3 : 0.1) + (j + rr) / rr * 0.08; dR(x - w, yy, w * 2, 1, c, j < -rr * 0.5 ? 6 : 3); ctx.globalAlpha = 0.5 + frac * 0.4; R(x - w - 1, yy, 2, 1, hi); R(x + w - 1, yy, 2, 1, c); }
  ctx.globalAlpha = 0.9; R(x - 8, y - rr - 1, 16, 1, hi); for (let j = -rr + 5; j < -8; j += 2) R(x - Math.round(Math.sqrt(rr * rr - j * j) * 0.95) + 3, y + j, 1, 1, '#ffffff');
  const r = seeded(7), nc = Math.round((1 - frac) * 7); ctx.globalAlpha = 0.9;
  for (let i = 0; i < nc; i++) { let px = x + (r() - 0.5) * 34, py = y - 6 - r() * 16; for (let s = 0; s < 6; s++) { const nx = px + (r() - 0.5) * 7, ny = py + (r() - 0.3) * 6; line(px, py, nx, ny, s % 2 ? '#ffffff' : hi); px = nx; py = ny; } }
  for (let i = 0; i < 5; i++) { const a = t / 800 + i * 1.26, s = Math.sin(a); if (s < -0.2) continue; ctx.globalAlpha = 0.5 + s * 0.4; R(x + Math.cos(a) * (rr - 2), y - 12 + Math.sin(t / 600 + i) * 7, 2, 2, hi); }
  ctx.restore();
};
ART.drawShieldBar = function (x, y, w, frac, o) {
  o = o || {}; x = Math.round(x); y = Math.round(y); frac = Math.max(0, Math.min(1, frac)); const bx = x + 8, bw = w - 8, iw = bw - 2, fw = Math.round(iw * frac), lw = Math.round(iw * Math.max(frac, Math.min(1, o.lag || 0))), c = frac > 0.6 ? '#f4c542' : frac > 0.3 ? '#ffb23f' : '#ff6b3a';
  R(bx + 1, y, bw - 2, 7, INK); R(bx, y + 1, bw, 5, INK); R(bx + 1, y + 1, iw, 5, '#2e2742');
  if (lw > fw) R(bx + 1, y + 1, lw, 5, '#ffffff');
  if (fw > 0) { R(bx + 1, y + 1, fw, 5, c); R(bx + 1, y + 1, fw, 1, lerpC(c, '#ffffff', 0.6)); R(bx + 1, y + 5, fw, 1, hs(c, 0.66)); for (let i = 2; i < fw - 1; i += 6) R(bx + 1 + i, y + 2, 2, 1, 'rgba(255,255,255,0.45)'); }
  if (o.mark !== undefined) { const mx = bx + 1 + Math.round(iw * Math.max(0, Math.min(1, o.mark))); R(mx - 1, y - 2, 3, 2, '#d8404a'); R(mx, y, 1, 7, '#d8404a'); }
  R(x, y - 1, 9, 1, INK); R(x - 1, y, 11, 5, INK); R(x, y + 5, 9, 1, INK); R(x + 1, y + 6, 7, 1, INK); R(x + 2, y + 7, 5, 1, INK); R(x + 3, y + 8, 3, 1, INK);
  R(x, y, 9, 5, '#f4c542'); R(x, y, 4, 5, '#fff2a8'); R(x + 1, y + 5, 7, 1, '#f4c542'); R(x + 2, y + 6, 5, 1, '#a8742a'); R(x + 3, y + 7, 3, 1, '#a8742a'); R(x + 4, y + 1, 1, 5, '#a8742a'); R(x + 2, y + 2, 5, 1, '#a8742a');
};
// 心魔劫：血色虚空里一面裂开的镜子，镜中是自己的影子，上方一双眼
BACKDROP.demon = () => {
  vgrad(0, 0, 200, 120, ramp(['#08040e', '#1e0a26', '#4a1030', '#7a1a2e'], 6), 0.34);
  const r = seeded(66);
  for (let i = 0; i < 5; i++) for (let s = 0; s < 70; s++) { const a = s * 0.13 + i * 1.26, rr = 14 + s * 1.1 + i * 3, x = 100 + Math.cos(a) * rr * 1.5, y = 56 + Math.sin(a) * rr * 0.62; if (x < 0 || x > 199 || y < 0 || y > 108) continue; ctx.globalAlpha = 0.35 * (1 - s / 80); R(x, y, 2, 1, i % 2 ? '#a8203a' : '#5a1a6a'); }
  ctx.globalAlpha = 1;
  for (const sx of [-1, 1]) { const ex = 100 + sx * 34; glow(ex, 22, 14, '#ff3a2a', 0.5); for (let j = -4; j <= 4; j++) { const w = Math.round(Math.sqrt(1 - (j * j) / 20) * 15); R(ex - w, 22 + j, w * 2, 1, '#12060e'); } for (let j = -2; j <= 2; j++) { const w = Math.round(Math.sqrt(1 - (j * j) / 6) * 11); R(ex - w, 22 + j, w * 2, 1, '#f0d8d0'); } disc(ex - sx * 3, 22, 3, '#d8202a'); R(ex - sx * 3, 19, 1, 7, '#12060e'); R(ex - 12 + (sx > 0 ? 0 : 0), 17 - 0, 26, 1, '#12060e'); line(ex - sx * 15, 15, ex + sx * 13, 19, '#12060e', 2); }
  // 镜
  R(72, 30, 56, 78, '#2a1a36'); R(70, 32, 60, 74, '#2a1a36'); R(74, 34, 52, 70, '#5a4a1e'); R(74, 34, 52, 1, '#c8a84a'); R(74, 34, 1, 70, '#c8a84a'); R(77, 37, 46, 64, '#1a1430');
  vgrad(77, 37, 46, 64, ramp(['#2a2448', '#3a2a5a', '#5a2a4a'], 4), 0.34);
  disc(100, 62, 7, '#0a0612'); R(92, 68, 16, 30, '#0a0612'); R(88, 74, 24, 27, '#0a0612'); R(98, 52, 4, 4, '#0a0612'); R(96, 61, 2, 1, '#ff3a2a'); R(102, 61, 2, 1, '#ff3a2a');
  for (const [x0, y0, x1, y1] of [[100, 37, 94, 58], [94, 58, 104, 70], [104, 70, 96, 101], [94, 58, 77, 66], [104, 70, 123, 62], [100, 84, 123, 92]]) { line(x0, y0, x1, y1, '#e8d8f0'); line(x0 + 1, y0, x1 + 1, y1, '#6a5a8a'); }
  for (let i = 0; i < 7; i++) { const x = 56 + r() * 88, y = 96 + r() * 16; R(x, y, 3 + r() * 3, 1, '#c8b8e0'); R(x + 1, y + 1, 2, 1, '#6a5a8a'); }
  R(0, 108, 200, 12, '#12060e'); R(0, 108, 200, 1, '#7a1a2e'); dR(0, 104, 200, 4, '#12060e', 8); ctx.globalAlpha = 0.3; dR(80, 109, 40, 10, '#5a2a4a', 6); ctx.globalAlpha = 1;
  for (const x of [20, 46, 154, 180]) for (let y = 0; y < 62 + (x * 7 % 20); y += 4) { R(x + Math.round(Math.sin(y / 14 + x) * 2), y, 2, 3, y % 8 ? '#3a2a40' : '#5a4a60'); }
};

// ---------- 八、宗门人物 ----------
// ART.portrait(id, mood, alt) 新增 14 位（规格同阶段二，48×48 五种表情）：
//   长老 tieye 铁冶真人 liu 柳含烟 yaochen 药尘子 chisong 赤松客 shouzhuo 守拙道人 qingxu 清虚真人 xuehe 血河老祖 xue3 鬼医薛三 youji 幽姬
//   圣子 xiao 萧凌风（alt → xiao2 苏清寒）hongxiu 丹红袖 zhibai 陆知白；终局 tianheng 陆天衡
// ART.portraitGen(seed, o, mood) → 48×48 程序生成的门人头像。o = { f: 女, realm: 0～9 定道袍色（或直接给 robe: [暗,中,亮], trim）,
//   temper: 0～7 或 '勤勉' '聪慧' '莽' '滑' '痴' '孤傲' '仁厚' '贪玩'（定眼神眉口）, kind: 'rookie' 新秀（金抹额、红披领、傲气） }；同参数缓存
// ART.icon('post_dan' 丹堂 | 'post_qi' 器堂 | 'post_zhan' 战堂 | 'post_fa' 执法堂 | 'post_wai' 外事堂)
const specs = (b, c) => b.mir(T => { T.hl(15, 22, 22, c); T.hl(15, 22, 28, c); T.r(15, 22, 1, 7, c); T.r(22, 22, 1, 7, c); T.p(23, 24, c); });
const BAND = tone('#b04a3a', '#6a2a2a', '#e07a5a'), ICE = tone('#8fd0ff', '#4a8ad0', '#e8f8ff'), BONE = tone('#e4d6b8', '#9a7a6a', '#fff8e0');
Object.assign(PEOPLE, {
  // 铁冶真人：器堂。方脸络腮胡、红抹额、肩上一柄铁锤
  tieye: {
    skin: '#c88a62', hair: '#55525e', shape: 'square', robe: ['#3a2a22', '#5e4836', '#8a6c4c'], trim: '#3f6ec0', bust: { sw: 22, inner: '#3f6ec0' }, noGloss: 1,
    fr: 'gg9888888888', back: (L, c) => L.r(14, 22, 20, 12, c),
    pre: b => b.add(L => { L.l(40, 47, 42, 16, WOOD, 2); L.r(36, 7, 11, 9, STEEL); }),
    F: { eye: 'n', iris: '#3a2a2a', brow: { th: 2, len: 6, tilt: 0.5 }, mouth: { n: 'flat', joy: 'grin', ang: 'grit' } },
    skinX: (b, m, sk) => { b.l(29, 18, 32, 22, sk.M); b.hl(20, 27, 18, sk.S); },
    post: (b, m, c) => { b.add(L => { L.sy(29, 'bbbbba98642', c); L.r(20, 30, 8, 3, null); }); b.add(L => L.r(13, 13, 22, 3, BAND)); b.r(22, 13, 4, 3, '#f4c542'); },
  },
  // 柳含烟：执法。紧髻银簪、眉眼如刀、高领
  liu: {
    skin: '#f6dcd0', hair: '#1e1a26', shape: 'sharp', robe: ['#263f7a', '#3f6ec0', '#7aa2e6'], trim: '#eef6ff', bust: { inner: '#1e2a4a' },
    fr: 'jj8765444456', back: (L, c) => L.r(14, 14, 20, 18, c), hairX: (L, c) => L.e(24, 3.5, 5.5, 3.5, c),
    F: { eye: 'x', fem: 1, iris: '#4a5a8a', tail: '#1e1a26', brow: { y: 21, tilt: 0.6 }, mouth: { n: 'flat', joy: 'smirk', ang: 'frown', shock: 'o', sad: 'flat' } },
    post: b => { b.add(L => L.l(12, 1, 36, 6, STEEL)); b.r(36, 5, 2, 4, '#4aa8ff'); b.r(23, 16, 2, 2, '#aeb8c8'); b.hl(20, 27, 39, '#1e2a4a'); b.hl(21, 26, 42, '#aeb8c8'); },
  },
  // 药尘子：药园。大草帽、白眉、晒黑的笑脸
  yaochen: {
    skin: '#d8a878', hair: '#e8e6ee', shape: 'wide', robe: ['#2f5e3a', '#4f8a52', '#86b87a'], trim: '#e8f0c8', bust: { sw: 20, inner: '#c8d8a0' }, noGloss: 1,
    hairX: (L, c) => L.mir(T => T.e(11.5, 23, 3, 5, c)),
    F: { eye: 'o', iris: '#4a3a3a', brow: { c: '#e8e6ee', th: 2, len: 6, y: 21, tilt: -0.5 }, blush: 1, my: 32, mouth: { n: 'smile', joy: 'open', ang: 'flat', shock: 'o', sad: 'frown' } },
    skinX: (b, m, sk) => { b.mir(T => { T.p(14, 27, sk.S); T.l(19, 30, 18, 32, sk.S); }); },
    post: (b, m, W) => {
      const H = tone('#d8b86a', '#9a7a3a', '#f8e0a0');
      b.add(L => { for (let y = 3; y <= 16; y++) { const w = Math.round(3 + (y - 3) * 1.75); L.hl(24 - w, 23 + w, y, H); } }, { sep: 1, cast: [0, 2] });
      for (const k of [-16, -8, 0, 8, 16]) b.l(24, 4, 24 + k, 16, '#9a7a3a'); b.add(L => { L.l(34, 8, 37, 1, GREEN); L.r(37, 0, 3, 2, GREEN); L.p(35, 3, GREEN); });
      b.add(L => L.sy(35, '33221', W));
    },
  },
  // 赤松客：外事。小圆帽、八字胡、一脸生意
  chisong: {
    skin: '#f0c8a0', hair: '#5a2a1e', shape: 'oval', robe: ['#8a2a1a', '#d8582a', '#ff9a5a'], trim: '#f4c542', bust: { inner: '#fff0c8' },
    fr: 'jkcba9876656', back: (L, c) => L.r(15, 22, 18, 12, c),
    F: { eye: 'n', iris: '#6a3a1a', brow: { tilt: -0.3 }, eyes: { n: ARC }, mouth: { n: 'smirk', joy: 'grin', ang: 'flat', shock: 'o', sad: 'flat' } },
    post: (b, m, c) => {
      const H = tone('#3a2a3a', '#1e1420', '#5c4a5c');
      b.add(L => { L.e(24, 6, 9.5, 5.5, H); L.r(14, 6, 20, 4, H); }); b.hl(14, 33, 10, '#f4c542'); b.r(22, 4, 4, 3, '#f4c542'); b.r(23, 5, 2, 1, '#d8404a'); b.r(23, 0, 2, 2, '#d8404a');
      b.mir(T => { T.hl(20, 23, 30, c); T.p(19, 31, c); T.p(18, 32, c); }); b.add(L => L.e(24, 44.5, 2.5, 2.5, GOLD)); b.p(24, 44, '#a8742a');
    },
  },
  // 守拙道人：藏经。披散灰发、圆眼镜、怀里一卷书
  shouzhuo: {
    skin: '#ecc8a8', hair: '#b8b4c4', shape: 'long', robe: ['#4a4460', '#7a7494', '#aaa4c0'], trim: '#e8e4f0', noGloss: 1,
    fr: 'f8765544444', back: (L, c) => L.r(11, 14, 26, 32, c), hairX: (L, c) => L.e(24, 4.5, 3.5, 3, c),
    F: { eye: 'o', iris: '#4a4a5a', brow: { c: '#b8b4c4', tilt: -0.6, y: 20 }, mouth: { n: 'line', joy: 'smile', ang: 'flat', shock: 'o', sad: 'frown' } },
    post: (b, m, c) => { specs(b, '#c8a84a'); b.add(L => L.sy(34, '222211', c)); b.add(L => L.r(18, 2, 12, 2, WOOD)); b.add(L => L.r(34, 35, 11, 6, PAPERW)); b.r(33, 34, 2, 8, '#8a5c36'); b.r(44, 34, 2, 8, '#8a5c36'); b.hl(36, 42, 37, '#928ea8'); b.hl(36, 41, 39, '#928ea8'); },
  },
  // 清虚真人：观星。星冠、深蓝星袍、脑后一轮星盘
  qingxu: {
    skin: '#f8e0d0', hair: '#1e2040', shape: 'oval', robe: ['#141a4a', '#2a3a8a', '#5a6ad0'], trim: '#f4e08a', bust: { inner: '#0e1230' },
    fr: 'zz9865444445', back: (L, c) => L.r(10, 13, 28, 35, c),
    pre: b => { for (let i = 0; i < 44; i++) { const a = i * Math.PI / 22; b.p(24 + Math.cos(a) * 22, 19 + Math.sin(a) * 19, i % 11 === 0 ? '#ffffff' : '#f4e08a'); if (i % 11 === 0) b.p(24 + Math.cos(a) * 21, 19 + Math.sin(a) * 18, '#f4e08a'); } },
    F: { eye: 'f', fem: 1, iris: '#8a9af0', brow: { c: '#3a3a6a' }, mouth: { n: 'line', joy: 'smile', ang: 'flat', shock: 'o', sad: 'line' } },
    post: b => { b.add(L => { L.r(23, 0, 2, 8, GOLD); L.l(19, 3, 22, 7, GOLD); L.l(28, 3, 25, 7, GOLD); L.hl(17, 30, 8, GOLD); }); b.r(23, 16, 2, 2, '#f4e08a'); for (const [x, y] of [[9, 44], [14, 42], [35, 43], [39, 45], [31, 46], [12, 46]]) b.p(x, y, '#fff2a8'); },
  },
  // 血河老祖：秃顶血纹、骨冠、长须獠牙
  xuehe: {
    skin: '#d8b0a8', hair: '#e8e0e8', shape: 'long', robe: ['#2a0810', '#5a1220', '#8a2a34'], trim: '#c8a84a', bust: { inner: '#1a0a10', sw: 21 }, noGloss: 1,
    back: (L, c) => L.mir(T => T.r(11, 20, 3, 22, c)),
    F: { eye: 'x', iris: '#ff3a2a', tail: '#8a1e2e', brow: { c: '#e8e0e8', len: 6, th: 2, tilt: 0.8 }, mouth: { n: 'fang', joy: 'fangO', ang: 'grit', shock: 'o', sad: 'flat' } },
    skinX: (b, m, sk) => { b.l(24, 12, 24, 19, '#a8202a'); b.mir(T => { T.l(20, 13, 18, 18, '#a8202a'); T.l(17, 28, 19, 33, sk.S); }); },
    post: (b, m, c) => { b.add(L => { L.mir(T => T.l(22, 34, 19, 35, c)); L.sy(36, '22222111', c); }); b.add(L => L.mir(T => { T.r(15, 8, 3, 3, BONE); T.r(13, 4, 2, 5, BONE); T.r(19, 6, 2, 4, BONE); T.r(22, 3, 2, 7, BONE); })); b.r(23, 10, 2, 2, '#d8404a'); },
  },
  // 鬼医薛三：青白脸、半张白面具、耳后别着银针
  xue3: {
    skin: '#cfe0c8', hair: '#2a4a3a', shape: 'sharp', robe: ['#141e1a', '#2a3e34', '#4a6a58'], trim: '#8fe0b8', bust: { inner: '#0e1410' },
    fr: 'fgb9a8b89a79', back: (L, c) => { L.r(12, 12, 24, 20, c); L.l(13, 11, 9, 8, c, 2); L.l(34, 12, 39, 9, c, 2); },
    F: { eye: 'x', iris: '#3ac86a', tail: '#2a4a3a', brow: { tilt: 0.3 }, mouth: { n: 'grin', joy: 'open', ang: 'frown', shock: 'o', sad: 'flat' } },
    skinX: b => { b.add(L => { for (let y = 19; y <= 30; y++) L.hl(25, 34 - (y > 27 ? y - 27 : 0) - (y < 21 ? 1 : 0), y, WHITE); }, { sep: 1 }); b.r(27, 24, 4, 2, INK); b.p(28, 24, '#3ac86a'); b.l(26, 28, 31, 29, '#b4b0cc'); },
    post: b => { b.l(37, 21, 42, 9, '#aeb8c8'); b.l(39, 23, 45, 12, '#aeb8c8'); b.p(42, 9, '#d8404a'); b.p(45, 12, '#d8404a'); b.add(L => L.r(22, 42, 4, 5, tone('#6ae08a', '#2a8a5a', '#c8ffd8'))); b.r(23, 41, 2, 1, '#8a5c36'); },
  },
  // 幽姬：遮半脸的长发、面纱、蝶形金钗
  youji: {
    skin: '#f6dcd4', hair: '#2a1a3a', shape: 'oval', robe: ['#1e1430', '#4a2a6a', '#7a4aa0'], trim: '#c27dff', bust: { inner: '#f6dcd4' },
    fr: yeFr, cap: { full: 1 }, back: (L, c) => L.r(10, 13, 28, 35, c),
    F: { eye: 'x', fem: 1, iris: '#c27dff', tail: '#c27dff', brow: { y: 21 }, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'none', sad: 'none' } },
    skinX: b => { const V = tone('#8a5ac0', '#5a3a8a', '#b890e8'); b.add(L => L.sy(29, 'baa9987643', V)); b.hl(14, 33, 29, '#f4c542'); for (const x of [17, 24, 30]) b.p(x, 34, '#f4c542'); },
    post: b => { b.add(L => { L.r(31, 8, 3, 3, GOLD); L.r(35, 6, 4, 5, GOLD); }); b.p(34, 9, '#d8404a'); b.r(11, 31, 1, 4, '#f4c542'); b.p(11, 35, '#c27dff'); },
  },
  // 萧凌风：高马尾、蓝抹额、嘴角带笑
  xiao: {
    skin: '#f6d8bc', hair: '#2a2a3a', shape: 'oval', robe: ['#24487e', '#3f7ed0', '#7ab4f4'], trim: '#eef6ff',
    fr: 'jkcba9876656', back: (L, c) => { L.r(15, 24, 18, 10, c); L.l(26, 3, 38, 7, c, 3); L.l(38, 7, 43, 20, c, 3); L.l(43, 20, 41, 30, c, 2); }, hairX: (L, c) => L.e(24, 3.5, 3.5, 3.5, c),
    pre: b => hilt(b, 11, 38, 5, 22, { g: 5 }),
    F: { eye: 'm', iris: '#3a6ab0', brow: { tilt: 0.5, len: 6 }, mouth: { n: 'smirk', joy: 'grin', ang: 'grit', shock: 'o', sad: 'flat' } },
    post: b => { b.add(L => { L.r(13, 14, 22, 2, ICE); L.l(13, 15, 8, 19, ICE, 2); L.l(13, 16, 9, 24, ICE); }); b.r(21, 6, 6, 2, '#eef6ff'); },
  },
  // 苏清寒：冰色发带、直发、神色清冷
  xiao2: {
    skin: '#f8e0d0', hair: '#2a2a3a', shape: 'oval', robe: ['#24487e', '#3f7ed0', '#7ab4f4'], trim: '#eef6ff',
    fr: 'pp8765444456', back: (L, c) => L.r(10, 14, 28, 34, c), hairX: (L, c) => L.e(24, 4, 5, 4, c),
    pre: b => hilt(b, 37, 38, 43, 22, { g: 5 }),
    F: { eye: 'f', fem: 1, iris: '#4a8ad0', brow: { y: 21, tilt: 0.3 }, mouth: { n: 'line', joy: 'smile', ang: 'frown', shock: 'o', sad: 'line' } },
    post: b => { b.add(L => { L.r(19, 1, 10, 2, ICE); L.l(29, 2, 34, 9, ICE, 2); L.l(19, 2, 15, 8, ICE, 2); }); b.r(23, 16, 2, 2, '#7fe0f0'); },
  },
  // 丹红袖：双髻红绸、葫芦耳坠、不服气的嘴
  hongxiu: {
    skin: '#f8d8bc', hair: '#4a1e1a', shape: 'round', robe: ['#a02a1e', '#e8502a', '#ff9a6a'], trim: '#ffe8c0',
    fr: 'ssba98766667', back: (L, c) => L.r(12, 15, 24, 22, c), hairX: (L, c) => { L.e(14, 5, 5, 4.5, c); L.e(34, 5, 5, 4.5, c); },
    F: { eye: 'f', fem: 1, iris: '#c8502a', blush: 1, brow: { tilt: 0.4 }, mouth: { n: 'smirk', joy: 'open', ang: 'pout', shock: 'o', sad: 'frown' } },
    post: b => { b.mir(T => { T.r(12, 8, 5, 2, '#d8404a'); T.l(11, 10, 8, 16, '#d8404a'); T.p(11, 30, '#f4c542'); T.r(10, 31, 2, 2, '#62d26f'); T.r(10, 33, 3, 3, '#62d26f'); }); b.r(23, 42, 2, 2, '#f4c542'); },
  },
  // 陆知白：书生方巾、圆眼镜、耳后夹着笔
  zhibai: {
    skin: '#f4dcc4', hair: '#2a2630', shape: 'oval', robe: ['#54288a', '#8a4ec8', '#c27dff'], trim: '#f0e0ff', bust: { sw: 18 },
    fr: 'jkcba9876656', back: (L, c) => L.r(15, 24, 18, 10, c),
    F: { eye: 'd', iris: '#5a3a7a', brow: { tilt: -0.7, y: 20 }, mouth: { n: 'line', joy: 'smile', ang: 'pout', shock: 'o', sad: 'frown' } },
    post: b => { const H = tone('#2e2838', '#17131f', '#4a4157'); b.add(L => { L.r(15, 3, 18, 7, H); L.r(18, 0, 12, 4, H); L.mir(T => T.l(14, 8, 6, 13, H, 2)); }); b.r(22, 5, 4, 3, '#5fd3b0'); specs(b, '#c8a84a'); b.l(36, 22, 40, 10, '#8a5c36'); b.r(40, 8, 2, 3, '#2a2630'); },
  },
  // 陆天衡：天剑宗主。金冠、鬓边两缕白发、金肩甲、眉心一道朱痕
  tianheng: {
    skin: '#ecd0b8', hair: '#3a3848', shape: 'long', robe: ['#a8a4bc', '#eeeaf4', '#ffffff'], trim: '#f4c542', bust: { sw: 22, inner: '#2a2238' },
    fr: 'zz9876554445', back: (L, c) => L.r(9, 13, 30, 35, c), hairX: (L, c) => L.e(24, 4, 3, 3.5, c),
    mid: b => b.add(L => L.mir(T => { T.e(8, 40, 7, 4, GOLD); T.r(1, 40, 13, 3, GOLD); })),
    F: { eye: 'n', iris: '#8a2a2a', brow: { len: 6, in: 1, tilt: 0.7 }, eyes: { n: ['L.....', '.LLLLL', '..IIw.'] }, mouth: { n: 'flat', joy: 'smirk', ang: 'frown', shock: 'flat', sad: 'flat' } },
    skinX: (b, m, sk) => b.mir(T => T.l(18, 29, 17, 32, sk.S)),
    post: (b, m, c) => { b.mir(T => { T.r(11, 15, 1, 24, '#e8e6ee'); T.r(13, 13, 1, 10, '#e8e6ee'); }); b.add(L => { L.r(21, 0, 6, 7, GOLD); L.hl(16, 31, 4, GOLD); L.r(18, 5, 12, 2, GOLD); L.mir(T => T.l(16, 4, 13, 0, GOLD, 2)); }); b.r(23, 1, 2, 4, '#d8404a'); b.add(L => { L.mir(T => T.hl(20, 22, 30, c)); L.r(23, 34, 2, 4, c); }); b.r(23, 15, 2, 4, '#d8404a'); },
  },
});
Object.assign(P_ALIAS, { xiaolingfeng: 'xiao', danhongxiu: 'hongxiu', luzhibai: 'zhibai', lutianheng: 'tianheng' });
Object.assign(FSPEC, { tieye: ['beard'], liu: ['pins'], xuehe: ['beard', 'horns'], xiao: ['long'], xiao2: ['long'], hongxiu: ['pins'], zhibai: ['cap'], tianheng: ['long', 'crown'], qingxu: ['long', 'crown'], shouzhuo: ['long', 'beard'], chisong: ['cap'], youji: ['long'], yaochen: ['hat'] });
// 程序生成的门人 / 新秀
const TEMPER = ['勤勉', '聪慧', '莽', '滑', '痴', '孤傲', '仁厚', '贪玩'];
const TEMP_F = [{ t: 0.2, m: 'line' }, { e: 'd', t: 0, m: 'smile' }, { e: 'n', t: 0.8, th: 2, m: 'grin' }, { e: 'x', t: -0.2, m: 'smirk' }, { e: 'o', t: -0.6, m: 'line' }, { e: 'n', t: 0.6, m: 'flat' }, { e: 'd', t: -0.4, m: 'smile', bl: 1 }, { t: 0, m: 'cat', bl: 1 }];
function genSpec(seed, o) {
  const r = seeded((seed | 0) * 7 + 3), pk = a => a[Math.floor(r() * a.length)], f = o.f ? 1 : 0, rk = o.kind === 'rookie';
  const ti = typeof o.temper === 'string' ? Math.max(0, TEMPER.indexOf(o.temper)) : rk && o.temper === undefined ? 5 : ((o.temper | 0) % 8 + 8) % 8, TF = TEMP_F[ti], R0 = L.REALMS[Math.max(0, Math.min(9, o.realm | 0))];
  const hair = pk([HAIR_K, '#3a2630', '#4a3628', '#2a2a3a', '#5a2a1e', '#33303a', '#1e1a26']), hsI = Math.floor(r() * 4), acc = Math.floor(r() * 6), ac = pk(['#d8404a', '#4aa8ff', '#62d26f', '#f4c542', '#c27dff', '#eef6ff']);
  const S = {
    skin: pk(['#f2c9a0', '#f6d8bc', '#e8b88e', '#f8e0d0', '#d8a878', '#f0c8a0']), hair, robe: o.robe || R0.robe, trim: o.trim || R0.trim,
    shape: f ? pk(['round', 'oval', 'round', 'sharp']) : pk(['oval', 'square', 'oval', 'long', 'sharp']),
    fr: f ? pk(['ssba98766667', 'pp8765444456', 'kkba9a99a9a9', 'kjbabaab9aba']) : pk(['jkcba9876656', 'gg8777777777', 'fgb9a8b89a79', 'jj8765444456']),
    F: { eye: TF.e || (f ? 'f' : 'm'), fem: f, iris: pk(['#6a5a9a', '#7a5a3a', '#3a6ab0', '#4a3a5a', '#3a7a5a', '#a05a3a']), blush: TF.bl || (f && r() < 0.5), brow: { tilt: TF.t + (rk ? 0.3 : 0), th: TF.th || 1 }, mouth: { n: rk ? 'smirk' : TF.m } },
  };
  if (f) {
    S.back = [(L2, c) => L2.r(11, 14, 26, 30, c), (L2, c) => L2.r(12, 15, 24, 20, c), (L2, c) => L2.r(13, 14, 22, 18, c), (L2, c) => { L2.r(12, 14, 24, 20, c); L2.l(36, 16, 39, 40, c, 4); }][hsI];
    S.hairX = [(L2, c) => L2.e(24, 4, 6, 4, c), (L2, c) => { L2.e(15, 5, 4.5, 4, c); L2.e(33, 5, 4.5, 4, c); }, (L2, c) => L2.e(24, 3.5, 7.5, 4.5, c), (L2, c) => L2.e(31, 5, 4, 3.5, c)][hsI];
  } else {
    S.back = [(L2, c) => L2.r(16, 26, 16, 10, c), (L2, c) => { L2.r(15, 24, 18, 10, c); L2.l(26, 3, 37, 8, c, 3); L2.l(37, 8, 41, 26, c, 3); }, (L2, c) => L2.r(13, 13, 22, 22, c), (L2, c) => L2.r(10, 13, 28, 34, c)][hsI];
    S.hairX = hsI === 2 ? (L2, c) => { L2.l(17, 7, 14, 3, c, 2); L2.l(28, 6, 31, 2, c, 2); } : (L2, c) => L2.e(24, 3.5, 4, 3.2, c);
  }
  S.post = (b, m, c, sk) => {
    if (rk) { b.add(L2 => { L2.r(13, 14, 22, 2, GOLD); L2.r(22, 12, 4, 5, GOLD); }); b.r(23, 14, 2, 2, '#d8404a'); }
    else if (acc === 0) b.add(L2 => L2.r(13, 14, 22, 2, tone(ac, hs(ac, 0.6), lerpC(ac, '#ffffff', 0.5))));
    else if (acc === 1) { b.add(L2 => L2.l(14, 3, 34, 6, f ? GOLD : WOOD)); if (f) b.r(34, 5, 2, 3, ac); }
    else if (acc === 2) b.p(29, 30, '#5a3a30');
    else if (acc === 3 && !f) b.l(29, 19, 31, 24, sk.M);
    else if (acc === 4) for (const x of [16, 19, 28, 31]) b.p(x, 28 + (x & 1), sk.S);
    if (f && hsI !== 3) b.r(23, 6, 2, 2, ac); else if (!f && hsI !== 2) b.r(21, 6, 6, 2, hsI === 1 ? ac : '#f4c542');
  };
  if (rk) S.mid = b => b.add(L2 => L2.mir(T => { for (let y = 34; y <= 43; y++) T.hl(8 + Math.max(0, 38 - y), 13 + Math.round((y - 34) * 0.5), y, RED); }));
  return S;
}
ART.tempers = TEMPER;
ART.portraitGen = function (seed, o, mood) {
  o = o || {}; if (!MOODS.includes(mood)) mood = 'n';
  return cached(['ptg', seed, o.f ? 1 : 0, o.realm | 0, o.temper, o.kind || '', o.robe ? o.robe.join() : '', mood].join('|'), () => person(genSpec(seed, o), mood).cv({ max: 15 }));
};
Object.assign(ICONS, {
  post_dan: '.....rr/....rprR/.....RR/.s........s/.ssssssssss/..sttttttS/..stwtttSS/..sttjjtSS/..sttjjtSS/...sttSSS/..S.rmr.S/.SS.ryr.SS',
  post_qi: '.sss......sss/stttS....stttS/sttSo....osttS/.SSoO....OoSS/....oO..Oo/.....oOOo/......OO/.....oOOo/....oO..Oo/...oO....Oo/..oO......Oo/..O........O',
  post_zhan: 'w..........w/ww........ww/.wW......Ww/..wW....Ww/...wW..Ww/....wWWw/.....rr/....WwwW/.y.Ww..wW.y/.yyW....Wyy/..yy....yy/.o.y....y.o',
  post_fa: '....yyyyyy/...ykkkkkkY/...ykkrrkkY/...ykrrrrkY/...ykkrrkkY/...ykrrrrkY/...ykkrrkkY/...ykkrrkkY/...ykkkkkkY/....YkkkkY/.....YYYY/......rr/.....rRrR',
  post_wai: '..........w/.........wW/.nnnnnnnnwWn/.nNnnnnnwWNn/.nnNnnnwWnnN/.nnnNnwWNnnN/.nnnnNrrnnnN/.nnnnrRRrnnN/.nnnnnrrnnnN/.nNNNNNNNNNN',
});

// ---------- 九、人物与宿敌 ----------
// ART.portrait 再增 5 位：teaman 卖茶翁（链 ch_tea）、出身约战对手 qian 钱通 / lei 雷豹 / lixiao 厉枭 / yutian 驭天风
// 新秀头像：ART.portraitGen(seed, { kind: 'rookie', f, realm | robe }, mood)（见上一节）
// ART.icon('grudge' 恩怨 | 'quest' 委托 | 'like' 喜欢 ♥ | 'dislike' 讨厌 ✕ | 'wine' 酒 | 'tea' 茶 | 'spar' 指点 | 'crush' 打压)
Object.assign(PEOPLE, {
  // 卖茶翁：布头巾、垂到脸颊的白眉、手里一把冒热气的茶壶
  teaman: {
    skin: '#e0b48c', hair: '#e8e6ee', shape: 'oval', robe: ['#4a4438', '#7a7262', '#a8a08c'], trim: '#d8d0b8', bust: { sw: 19, inner: '#c8c0a8' }, noGloss: 1,
    hairX: (L, c) => L.mir(T => T.e(12.5, 24, 2.5, 4, c)),
    F: { eye: 'o', iris: '#4a3a3a', brow: { c: 0 }, my: 32, eyes: { n: ARC, sad: ['......', '......', 'LLLLL.', '..ii..'] }, mouth: { n: 'smile', joy: 'open', ang: 'flat', shock: 'o', sad: 'line' } },
    skinX: (b, m, sk) => { b.hl(20, 27, 19, sk.S); b.mir(T => { T.p(14, 28, sk.S); T.l(19, 30, 18, 32, sk.S); }); },
    post: (b, m, W) => {
      const C = tone('#6a7a8a', '#3e4a5a', '#9aaaba'), tl = m === 'ang' ? 1 : 0;
      b.add(L => { L.e(24, 9, 11.5, 7, C); L.r(13, 10, 22, 6, C); L.l(34, 12, 40, 18, C, 3); }); b.hl(13, 34, 15, '#3e4a5a'); b.l(16, 6, 30, 5, '#9aaaba');
      b.add(L => L.mir(T => { T.l(21, 21 + tl, 16, 21 - tl, W, 2); T.l(15, 22, 13, 29, W); }));
      b.add(L => L.sy(35, '2221', W));
      const P = tone('#8a4a36', '#5a2a22', '#c07a5c'); b.add(L => { L.e(8, 41, 5, 4.5, P); L.l(2, 40, 4, 37, P, 2); L.r(6, 35, 4, 2, P); L.l(12, 39, 14, 36, P); L.l(14, 36, 13, 42, P); });
      b.p(8, 34, '#f4c542'); for (const [x, y] of [[1, 34], [2, 31], [1, 28], [3, 26]]) b.p(x, y, '#f6f2fa');
    },
  },
  // 钱通：坊市恶霸。胖脸、八字胡、金牙、瓜皮帽
  qian: {
    skin: '#f0c098', hair: '#2a2230', shape: 'wide', robe: ['#4a2a6a', '#7a4aa0', '#a87ad0'], trim: '#f4c542', bust: { sw: 23, inner: '#f4e08a' },
    fr: 'gf9876555555', back: (L, c) => L.r(13, 14, 22, 14, c),
    F: { eye: 'n', iris: '#3a2a2a', brow: { th: 2, len: 5, tilt: 0.3 }, my: 32, eyes: { n: ['......', 'LLLLL.', '..II..'] }, mouth: { n: 'grin', joy: 'open', ang: 'grit', shock: 'o', sad: 'frown' } },
    skinX: (b, m, sk) => { b.mir(T => { T.l(16, 34, 20, 36, sk.S); T.p(13, 28, sk.m); T.p(14, 28, sk.m); }); if (m === 'n' || m === 'ang') b.p(25, 33, '#f4c542'); },
    post: (b, m, c) => {
      const H = tone('#2e2838', '#17131f', '#4a4157'); b.add(L => { L.e(24, 7, 10, 6, H); L.r(14, 7, 20, 4, H); }); b.hl(14, 33, 10, '#f4c542'); b.r(23, 0, 2, 2, '#d8404a'); b.r(22, 5, 4, 3, '#5fd3b0');
      b.mir(T => { T.hl(19, 22, 30, c); T.p(18, 31, c); T.p(17, 32, c); }); b.add(L => { L.e(24, 44, 3, 3, GOLD); }); b.r(23, 43, 2, 2, '#a8742a'); b.hl(16, 31, 40, '#f4c542');
    },
  },
  // 雷豹：黑风寨少寨主。刺猬头、红抹额、脸上一道疤、兽牙项链
  lei: {
    skin: '#d9a47c', hair: '#3a2a22', shape: 'square', robe: ['#3a2a22', '#5e4836', '#8a6c4c'], trim: '#9a3a34', bust: { sw: 21, inner: '#d9a47c' },
    fr: 'ea7655666789', back: (L, c) => { L.r(13, 12, 22, 18, c); spikes(L, 24, 14, 10, 16, 9, c, 3, Math.PI + 0.2); },
    mid: b => b.add(L => { for (let i = 0; i < 6; i++) L.e(9 + i * 6, 40 + Math.abs(i - 2.5) * 0.8, 4, 3, '#7a5a40'); }),
    F: { eye: 'm', iris: '#8a5a1a', brow: { th: 2, tilt: 0.8, len: 6 }, mouth: { n: 'grin', joy: 'open', ang: 'grit', shock: 'o', sad: 'flat' } },
    skinX: (b, m, sk) => { b.l(15, 20, 20, 30, sk.M); b.l(16, 20, 21, 30, '#8a3040'); },
    post: b => { b.add(L => { L.r(13, 14, 22, 3, RED); L.l(35, 15, 41, 20, RED, 2); }); b.r(22, 14, 4, 3, '#f4c542'); for (const x of [19, 23, 27]) { b.r(x, 43, 2, 3, '#f6f2fa'); b.p(x, 46, '#b4b0cc'); } },
  },
  // 厉枭：血无涯的跟班。兜帽、独眼罩、羽毛领、冷笑
  lixiao: {
    skin: '#e0c4b8', hair: '#2a1418', shape: 'sharp', robe: ['#2a0c12', '#5a1a22', '#8a3038'], trim: '#c8a84a', bust: { inner: '#1a0a10', sw: 20 }, noGloss: 1,
    mid: b => b.add(L => L.mir(T => { for (let i = 0; i < 4; i++) T.l(6 + i * 4, 44, 3 + i * 4, 37 - (i % 2) * 2, '#3a3448', 3); })),
    F: { eye: 'x', iris: '#f4c542', tail: '#2a1418', brow: { tilt: 0.7, len: 6 }, mouth: { n: 'smirk', joy: 'grin', ang: 'grit', shock: 'o', sad: 'flat' } },
    skinX: (b, m, sk) => { b.add(L => L.r(26, 23, 7, 5, '#1e1420'), { flat: 1 }); b.l(13, 19, 34, 24, '#1e1420'); b.p(29, 25, '#c8a84a'); b.mir(T => T.l(17, 29, 19, 33, sk.S)); },
    post: b => { b.add(L => { L.e(24, 19, 16, 18, '#5a1a22'); L.sy(1, '1234', '#5a1a22'); L.e(24, 24, 10.5, 12.5, null); L.r(17, 32, 14, 8, null); }); b.mir(T => { T.p(12, 14, '#c8a84a'); T.p(11, 20, '#c8a84a'); T.p(11, 26, '#c8a84a'); }); },
  },
  // 驭天风：御兽山少主。发间翎羽、狼毫肩、肩头一只青雀
  yutian: {
    skin: '#f0c8a0', hair: '#4a3020', shape: 'oval', robe: ['#2f6e4b', '#4f9a62', '#8ad08a'], trim: '#f0e8c0',
    fr: 'jkcba9876656', back: (L, c) => { L.r(14, 22, 20, 14, c); }, hairX: (L, c) => L.e(24, 3.5, 4, 3.2, c),
    mid: b => b.add(L => { for (let i = 0; i < 4; i++) L.e(4 + i * 4, 41 - i * 1.5, 3.5, 3, tone('#b8b0a0', '#7a7468', '#e8e4d8')); }),
    F: { eye: 'm', iris: '#3a7a5a', brow: { tilt: 0.4 }, mouth: { n: 'smile', joy: 'grin', ang: 'frown', shock: 'o', sad: 'flat' } },
    post: b => {
      b.add(L => { L.l(28, 6, 37, 0, ICE, 2); L.l(27, 7, 34, 2, JADE, 2); }); b.r(21, 6, 6, 2, '#f4c542');
      const Q = tone('#6fd8b8', '#3fa890', '#c8fff0'); b.add(L => { L.e(40, 33, 4, 3.5, Q); L.e(37.5, 30, 2.6, 2.4, Q); L.l(43, 34, 46, 37, Q, 2); });
      b.p(36, 30, INK); b.r(34, 31, 2, 1, '#f4c542'); b.hl(21, 26, 42, '#8a5c36'); b.r(23, 43, 2, 3, '#f6f2fa');
    },
  },
});
Object.assign(FSPEC, { teaman: ['beard'], qian: ['cap'], lei: [], lixiao: ['hat'], yutian: [] });
Object.assign(ICONS, {
  grudge: '.r.........w/.rr.......wW/..rr.....wW/...rr...wW/....rr.wW/..m..rwW/.mmm.wWr/.mhm.W.rr/mmhmm...rr/mhhhm.y..rr/mmhmm.yy..r/.mmm...y',
  quest: '.oO........oO/.nnnnnnnnnnnn/.nNnnnrrnnnnN/..nnnnrrnnnN/..nnnnrrnnnN/..nnnnrrnnnN/..nnnnnnnnnN/..nnnnrrnnnN/.nnnnnnnnnnnn/.nNNNNNNNNNNN/.oO....rr..oO/......rRrR',
  like: '////...rr.rr/..rprrrrR/..rrrrrrR/...rrrrR/....rrR/.....R',
  dislike: '///..vv....vv/...vv..vV/....vvvV/....vvV/...vv.vV/..vv...vV/..V.....V',
  wine: '.....rrr/.....ooo/....oooo/...oonnoo/..oonrrnoo/..oonrrnoO/..oonnnnoO/..ooooooOO/...ooooOO/....OOOO',
  tea: '.....w..w/....w..w/.....w..w//..jjjjjjjj/.jjwjjjjjJjj/.jjjjjjjjJ.j/.jjjjjjjjJjj/..jjjjjjJJ/...JJJJJJ/.ssssssssss',
  spar: '......y/.....yhy/......y/.....nnn/....nnnnn..w/....nnnnn.wW/.....nnn.wW/....jjjjwW/...jjjjjW/...jjjjjy/...jjjjj.y/...JJJJJ',
  crush: '....sssss/...sttttSs/..stttttSSs/..sttttSSSs/...sSSSSSs/.....ss/..r..ss..r/.rr......rr/rr.kkkkkk.rr/...kekeekk/..kkkkkkkk/..KKKKKKKK',
});

// ---------- 十、图鉴与轮回 ----------
// ART.frame('codex' | 'codexCell' | 'codexCellOff') → 图鉴页九宫格（书页，左侧书脊）与收集格（已得 / 未得），用法同其它 frame
// ART.codexIcon(cat)            → 16×16 分类图标。cat：map 地点相性 art 功法 combo 共鸣 gear 法宝 pet 灵宠 pill 丹方 recipe 器方 sigil 阵图 people 人物喜好 rival 对手属性 chain 奇遇链 event 奇遇 realm 秘境 ending 结局（ART.codexCats）
// ART.icon('codex' 图鉴 | 'cx_map' | 'cx_combo' | 'cx_chain' | 'cx_end' | 'sm_slot' 功法槽 | 'sm_roster' 名册 | 'sm_elem' 识五行 | 'sm_legacy' 传承)
// ART.samsaraNode(icon, state)  → 24×24 轮回殿节点：圆牌 + 任意 ART.icon 名；state 'locked' 未解锁 | 'open' 可买（金环）| 'done' 已点亮（玉色）
// ART.origin(id)                → 64×40 出身小画：qitu 弃徒 dantong 丹童 moyi 魔门遗孤 shoumu 守墓人之后 sanxiu 散修丹师 yushou 御兽遗脉（ART.originIds）
// ART.backdrop(kind) 新增 200×120 结局底图：'ascend' 飞升 | 'rest' 坐化 | 'summit' 登顶（榜首 / 宗主）| 'hermit' 归隐（道侣 / 桃李）
Object.assign(ICONS, {
  codex: '..bbbbbbbbbb/.bBnnnnnnnnnN/.bBnyyyyyynN/.bBnynnnnynN/.bBnynrrnynN/.bBnynrrnynN/.bBnynnnnynN/.bBnyyyyyynN/.bBnnnnnnnnN/.bBnnnnnnnnN/.bBBBBBBBBBB/..NNNNNNNNNN',
  cx_map: '.nnnn....nnnn/.nNNnnnnnnNNn/.nNgGnnNnnrNn/.nNgGnnNnrrNn/.nNnnnnNnnnNn/.nNnccnNnnnNn/.nNcccnNnyynN/.nNnccnNnyynN/.nNnnnnNnnnNn/.nNNnnnnnnNNn/.nnnn....nnnn',
  cx_combo: '..jjjj..vvvv/.jj..jjvv..vv/.j....vj....v/.j...vvjj...v/.j...v..j...v/.j...vvjj...v/.j....vj....v/.jj..jjvv..vv/..jjjj..vvvv/.....yy/....yhhy/.....yy',
  cx_chain: '.yyyy/y....y/y.ss.y/y.s..yss/.yyyy...s/..s..yyyy/..s.y....y/...sy.ss.y/....y.s..yss/.....yyyy..s/.......s...s/........sss',
  cx_end: '......w/.....www/......w/...yyyyyyy/..yhhhhhhhY/..y.......Y/..y..www..Y/..y.wwwww.Y/..y.wwwww.Y/..y..www..Y/.cyccccccccY/ccccccccccccc',
  sm_slot: '/.yyyy.yyyy/.y..y.y..y.ss/.y.jy.y.ry.s.s/.y..y.y..y.s.s/.yyyy.yyyy.sss//.....y/....yyy/...yyyyy/.....y/.....y',
  sm_roster: '/...kkk......y/..kkkkk.....y/..keeek...yyyyy/..keeek.....y/...eee......y/..jjjjj..kkk/.jjjjjjj.kek/.jjjjjjj.bbb/.jjjjjjjbbbbb/.JJJJJJJBBBBB',
  sm_elem: '......y/.....yhy/......y/.g.........b/gGg.......bBb/.g....w....b/.....www/......w/..o.......r/.oOo.....rRr/..o.......r',
  sm_legacy: '..nnnnnn/..nKKKKnN....y/..nnnnnnN...yy/..nKKKnnN.yyyyy/..nnnnnnN...yy/..NNNNNNN....y/.......j/......jjj/.....jjjjj/.......j..nnnn/.......jjjnKKn/..........nnnn',
});
Object.assign(FRAMES, {
  codex: { fill: '#efe3c4', draw: b => { box(b, '#efe3c4', '#fff6dc', '#c8b48c'); ring(b, 1, '#5a4a3a'); b.r(1, 1, 4, 18, '#2a3a6a'); b.r(1, 1, 1, 18, '#4a5a9a'); b.r(4, 1, 1, 18, '#16203e'); for (const y of [2, 17]) { b.r(14, y, 4, 1, '#c8a84a'); b.r(17, y === 2 ? 2 : 14, 1, 4, '#c8a84a'); } b.p(2, 3, '#f4c542'); b.p(2, 16, '#f4c542'); } },
  codexCell: { fill: '#fff6dc', draw: b => { box(b, '#fff6dc', '#ffffff', '#c8b48c'); ring(b, 1, '#2a8a7a'); ring(b, 2, '#8fe0c8'); for (const [x, y] of [[1, 1], [18, 1], [1, 18], [18, 18]]) b.p(x, y, null); } },
  codexCellOff: { fill: '#3a3155', ink: '#928ea8', draw: b => { box(b, '#3a3155', '#4a4168', '#262038'); ring(b, 1, '#1a1528'); for (const [x, y] of [[1, 1], [18, 1], [1, 18], [18, 18]]) b.p(x, y, null); b.hl(3, 5, 3, '#55506e'); b.r(3, 3, 1, 3, '#55506e'); } },
});
const CODEX = { map: 'cx_map', art: () => ART.item('a', 3), combo: 'cx_combo', gear: () => ART.item('w', 2), pet: 'egg', pill: 'juling', recipe: 'gscroll', sigil: () => ART.sigil('f_juling'), people: 'heart', rival: 'post_zhan', chain: 'cx_chain', event: 'wonder', realm: 'token', ending: 'cx_end' };
ART.codexCats = Object.keys(CODEX);
ART.codexIcon = cat => { const v = CODEX[cat] || 'codex'; return typeof v === 'function' ? v() : ART.icon(v); };
ART.samsaraNode = function (icon, state) {
  state = state === 'done' || state === 'open' ? state : 'locked';
  return cached('smn|' + icon + state, () => {
    const b = new Buf(24, 24), rim = state === 'done' ? JADE : state === 'open' ? GOLD : tone('#55506e', '#34304a', '#716c8a');
    b.add(L => L.e(12, 12, 11, 11, rim)); b.e(12, 12, 8.6, 8.6, state === 'done' ? '#1e4a44' : state === 'open' ? '#3a3155' : '#262038');
    if (state === 'open') for (const [x, y] of [[12, 0], [0, 12], [23, 12], [12, 23]]) b.p(x, y, '#fff2a8');
    const c = b.cv(), ic = ART.icon(icon) || ART.icon('unk');
    on(c, () => { if (state === 'locked') ctx.globalAlpha = 0.35; ctx.drawImage(ic, 4, 4); ctx.globalAlpha = 1; if (state === 'done') { R(17, 17, 5, 5, INK); R(18, 18, 3, 3, '#4ccb9f'); R(19, 19, 1, 1, '#ffffff'); } });
    return c;
  });
};
function mini(x, y, robe, hair, kneel) { const hh = kneel ? 3 : 6; R(x - 3, y - hh, 7, hh, robe); R(x - 3, y - hh, 2, hh, lerpC(robe, '#ffffff', 0.3)); R(x - 2, y - hh - 5, 5, 5, '#f2c9a0'); R(x - 2, y - hh - 6, 5, 2, hair); R(x - 1, y - hh - 8, 3, 2, hair); R(x - 1, y - hh - 2, 1, 1, INK); R(x + 1, y - hh - 2, 1, 1, INK); if (kneel) R(x - 4, y - 1, 9, 1, hs(robe, 0.7)); }
const ORIGIN = {
  qitu: () => { // 雨夜山门外
    vgrad(0, 0, 64, 40, ramp(['#070818', '#121a40', '#263466'], 4), 0.34); R(30, 6, 34, 4, '#34446a'); R(28, 9, 36, 2, '#222e50'); for (const x of [34, 58]) R(x, 11, 3, 16, '#5a2430'); R(38, 12, 19, 15, '#141228'); R(47, 12, 1, 15, '#2a1c2c');
    for (let i = 0; i < 5; i++) { R(22 - i * 4, 27 + i * 3, 42 + i * 4, 3, i % 2 ? '#3a3e62' : '#464a72'); R(22 - i * 4, 27 + i * 3, 42 + i * 4, 1, '#6a70a0'); } R(33, 14, 2, 3, '#ff8a44'); R(57, 14, 2, 3, '#ff8a44');
    mini(14, 38, '#8a8e9c', '#2a2230', 1); const r = seeded(3); for (let i = 0; i < 26; i++) { const x = r() * 70, y = r() * 40; line(x, y, x - 2, y + 4, '#8fa0d8'); }
  },
  dantong: () => { // 丹房里守炉的小童
    R(0, 0, 64, 40, '#3a2a26'); R(0, 30, 64, 10, '#5a4034'); R(0, 30, 64, 1, '#8a6a4c'); for (const y of [8, 18]) { R(34, y, 30, 2, '#6e4628'); for (let i = 0; i < 4; i++) { const c = ['#62d26f', '#c27dff', '#4aa8ff', '#f4c542'][(i + y) % 4]; R(37 + i * 7, y - 5, 4, 5, c); R(38 + i * 7, y - 7, 2, 2, '#efe3c4'); R(37 + i * 7, y - 5, 1, 2, lerpC(c, '#ffffff', 0.5)); } }
    ctx.drawImage(furnaceSprite(0), 8, 12); R(15, 26, 6, 2, '#ff7a2a'); R(16, 25, 3, 2, '#ffd060'); glow(18, 26, 12, '#ff8a2a', 0.5); for (let i = 0; i < 4; i++) R(17 + (i % 2) * 2, 8 - i * 2, 2, 2, '#d8d0e4');
    mini(44, 36, '#62d26f', '#2a2230'); R(34, 28, 8, 1, '#d8c090'); R(34, 26, 5, 5, '#efe3c4'); R(34, 26, 1, 5, '#c8b48c');
  },
  moyi: () => { // 血月下的魔门孤儿
    vgrad(0, 0, 64, 40, ramp(['#12060e', '#3e0a14', '#7a1a26'], 4), 0.34); disc(46, 12, 8, '#d8404a'); disc(44, 10, 3, '#ff8a8a'); glow(46, 12, 14, '#ff3a2a', 0.4);
    for (const [x, hh, w] of [[6, 26, 7], [18, 18, 5], [58, 22, 6]]) { for (let k = 0; k < hh; k++) R(x - Math.round(w * (k / hh)) / 2, 34 - hh + k, Math.max(1, Math.round(w * (k / hh))), 1, '#0a0408'); R(x, 34 - hh, 1, hh, '#3e0a14'); }
    R(0, 33, 64, 7, '#0a0408'); R(0, 33, 64, 1, '#5a1220'); mini(32, 36, '#5a1220', '#2a1418'); line(37, 34, 43, 22, '#d8404a'); line(38, 34, 44, 22, '#ff8a8a'); R(36, 33, 3, 1, '#c8a84a');
    for (let i = 0; i < 6; i++) R(8 + i * 9, 6 + (i * 7 % 20), 1, 1, '#ff8a6a');
  },
  shoumu: () => { // 剑冢边的守墓少年
    vgrad(0, 0, 64, 40, ramp(['#2a2e4a', '#5a5a7a', '#a8a0a8'], 4), 0.34); paintRidge(ridgeLine(7, 64, 22, 10, 3, 1.5), 30, '#4a4e6a', '#8a8898');
    R(0, 30, 64, 10, '#5a5a62'); R(0, 30, 64, 1, '#8a8a94'); const sw = ['#4a5068', '#8a92a8', '#c8d0e0'];
    for (const [x, l, tl] of [[8, 18, 0.1], [20, 12, -0.15], [50, 22, -0.08], [60, 11, 0.2], [40, 9, 0.05]]) swordProp(x, 32, l, tl, sw, ['#8a7a5a', '#c8b078']);
    grave(30, 34, 8, 12, ['#55506e', '#716c8a', '#a8a4bc']); mini(18, 38, '#5a5a68', '#2a2230'); R(23, 30, 1, 6, '#5a3a2a'); R(22, 28, 3, 3, '#ffcf6a'); glow(23, 29, 6, '#ffb050', 0.6); dR(0, 26, 64, 4, '#c8c4d8', 4);
  },
  sanxiu: () => { // 坊市里摆摊的散修
    vgrad(0, 0, 64, 20, ramp(['#74bce4', '#d4f0f8'], 3), 0.34); R(0, 20, 64, 20, '#b8a48c'); R(0, 20, 64, 1, '#e8d8b8'); for (const x of [2, 46]) { R(x, 6, 16, 14, '#c89a8a'); R(x - 1, 4, 18, 3, '#6a4464'); R(x + 5, 12, 6, 8, '#4f1818'); }
    R(18, 8, 28, 2, '#5a3a2a'); for (let i = 0; i < 7; i++) R(18 + i * 4, 10, 4, 4, i % 2 ? '#c8323c' : '#fff6e0'); R(19, 10, 1, 22, '#5a3a2a'); R(44, 10, 1, 22, '#5a3a2a');
    R(20, 26, 24, 3, '#8a5c36'); R(20, 26, 24, 1, '#b98a4c'); R(22, 29, 2, 6, '#5a3a2a'); R(40, 29, 2, 6, '#5a3a2a'); for (let i = 0; i < 5; i++) { const c = ['#62d26f', '#c27dff', '#4aa8ff', '#f4c542', '#ff8a9a'][i]; R(22 + i * 4, 23, 3, 3, c); R(22 + i * 4, 23, 1, 1, '#ffffff'); }
    mini(32, 25, '#86694a', '#2a2230'); mini(54, 38, '#3f6ec0', '#3a2630'); R(48, 33, 3, 3, '#7fe0f0'); R(48, 33, 1, 1, '#ffffff');
  },
  yushou: () => { // 草坡上与灵兽为伴
    vgrad(0, 0, 64, 26, ramp(['#3a84c8', '#a8d8f0', '#f0f8d8'], 4), 0.34); paintRidge(ridgeLine(9, 64, 20, 8, 3, 1.2), 28, '#6aa878', '#c8e8b0'); R(0, 27, 64, 13, '#5a9a4a'); R(0, 27, 64, 1, '#92c862'); dR(0, 34, 64, 6, '#356e46', 6);
    roundTree(56, 30, 5, ['#2a6a4a', '#3f8a5a', '#7ac870'], '#4a3428'); mini(12, 37, '#4f9a62', '#4a3020'); ctx.drawImage(ART.petSprite('p_tu', 0, 0), 18, 11); ctx.drawImage(ART.petSprite('p_que', 0, 1), 34, -4);
    for (const [x, y] of [[50, 30], [58, 35], [14, 36], [44, 37]]) { R(x, y, 1, 2, '#92c862'); R(x, y - 1, 1, 1, ['#f7a3bd', '#fff2a8'][x % 2]); }
  },
};
ART.originIds = Object.keys(ORIGIN);
ART.origin = id => cached('origin|' + id, () => on(mk(64, 40), () => { (ORIGIN[id] || ORIGIN.qitu)(); R(0, 0, 64, 1, INK); R(0, 39, 64, 1, INK); R(0, 0, 1, 40, INK); R(63, 0, 1, 40, INK); }));
Object.assign(BACKDROP, {
  // 飞升：云海之上的天门与一道接引金光
  ascend: () => {
    vgrad(0, 0, 200, 120, ramp(['#2c3878', '#6a7ac8', '#f0c890', '#fff6d0'], 6), 0.34); glow(100, 30, 46, '#fff2a8', 0.7);
    for (let y = 0; y < 100; y++) { const w = 6 + y * 0.22; ctx.globalAlpha = 0.35; dR(100 - w, y, w * 2, 1, '#fffbe0', 10); } ctx.globalAlpha = 1; R(98, 0, 4, 96, '#ffffff');
    for (const sx of [-1, 1]) { column(100 + sx * 26, 46, 30, ['#c8a84a', '#f4d86a', '#fff6c8'], ['#a8742a', '#f4c542']); } R(66, 8, 68, 5, '#f4c542'); R(62, 5, 76, 4, '#fff2a8'); R(66, 12, 68, 1, '#a8742a'); R(92, 1, 16, 4, '#f4c542');
    for (let i = 0; i < 10; i++) ctx.drawImage(cloudSprite(40 + i, 30 + (i * 9 % 22), '#ffffff', '#f8e8d0', '#e0c8c0'), i * 24 - 26, 44 + (i * 11 % 14) + (i % 2) * 40);
    R(0, 108, 200, 12, '#fff6e8'); mini(100, 92, '#f6f2fa', '#2a2230'); glow(100, 86, 10, '#ffffff', 0.6); for (let i = 0; i < 14; i++) { const x = 60 + (i * 37 % 80), y = 16 + (i * 23 % 70); R(x, y, 1, 1, '#ffffff'); if (i % 3 === 0) { R(x - 1, y, 3, 1, '#fff2a8'); R(x, y - 1, 1, 3, '#fff2a8'); } }
  },
  // 坐化：暮色、孤松、一方新碑
  rest: () => {
    vgrad(0, 0, 200, 96, ramp(['#2a2456', '#5a3474', '#b8507a', '#ff9a6a', '#ffd89a'], 5), 0.34); disc(52, 80, 14, '#fff0b8'); glow(52, 80, 26, '#ffb070', 0.5);
    paintRidge(ridgeLine(51, 200, 76, 26, 4, 1.6), 100, '#8a5a86', '#e8a08a'); paintRidge(ridgeLine(57, 200, 90, 14, 6, 1.2), 104, '#5a3a62', '#b0708a');
    R(0, 100, 200, 20, '#3e2848'); R(0, 100, 200, 1, '#8a5a82'); dR(0, 108, 200, 12, '#241630', 6); ellipse(130, 104, 44, 5, '#4a3256');
    pine(160, 102, 46, ['#241a36', '#3a2a4e', '#6a4a6a'], '#1a1226'); grave(126, 104, 12, 20, ['#3e3a56', '#5a5478', '#9a94b0']); R(118, 103, 3, 2, '#ff8a44'); R(119, 100, 1, 3, '#d8d0e4'); glow(119, 102, 5, '#ff8a44', 0.5);
    const r = seeded(8); for (let i = 0; i < 16; i++) { const x = 90 + r() * 100, y = 40 + r() * 60; R(x, y, 2, 1, i % 2 ? '#e8925a' : '#ffd89a'); } if (ART.drawCrane) ART.drawCrane(64, 34, 0);
  },
  // 登顶：绝顶大殿与万里云海
  summit: () => {
    vgrad(0, 0, 200, 120, ramp(['#143a8a', '#2c74c6', '#6cb0e8', '#eefaff'], 6), 0.34); disc(160, 24, 9, '#ffffff'); glow(160, 24, 20, '#fff6d0', 0.6);
    paintRidge(ridgeLine(71, 200, 70, 40, 3, 2.4), 104, '#7c9ccc', '#e4f0ff', { snow: 50 });
    rock(60, Array.from({ length: 80 }, (_, x) => Math.round(74 + Math.abs(x - 40) * 0.5 + Math.sin(x * 0.7) * 1.2)), 120, ['#3e4a6c', '#5a6a8e', '#8a9aba', '#c8d4e8'], 4);
    wallBays(100, 56, 44, 16, pavPal(true), { door: true, bays: 3 }); roof(100, 44, 30, 56, 10, ROOF.gold, { big: true }); R(99, 36, 2, 6, '#f4c542');
    for (let i = 0; i < 8; i++) { R(86 + i, 74 + i * 4, 28 - i * 2 + i * 3, 4, i % 2 ? '#a8b4cc' : '#c8d4e8'); }
    for (let i = 0; i < 10; i++) ctx.drawImage(cloudSprite(60 + i, 30 + (i * 11 % 24), '#ffffff', '#e4ecfa', '#c0cce8'), i * 24 - 20, 96 + (i * 5 % 12));
    R(0, 114, 200, 6, '#eef4fc'); for (const x of [70, 128]) { R(x, 46, 1, 28, '#5a3a2a'); for (let k = 0; k < 10; k++) R(x + 1 + k, 47 + Math.round(Math.sin(k * 0.7) * 1.2), 1, 7, k % 4 === 3 ? '#a8742a' : '#f4c542'); } mini(100, 73, '#f4c542', '#e9e8f2');
  },
  // 归隐：山脚小院、炊烟、两个人
  hermit: () => {
    vgrad(0, 0, 200, 90, ramp(['#3a84c8', '#74bce4', '#c4ecdc', '#f0f8d8'], 5), 0.34); paintRidge(ridgeLine(81, 200, 60, 30, 4, 1.5), 96, '#7aaeb6', '#cfead8', { trees: '#6a9ea8' }); paintRidge(ridgeLine(87, 200, 80, 16, 6, 1.2), 100, '#4c8a72', '#a4d2a8', { trees: '#3c7662' });
    R(0, 96, 200, 24, '#5a9a4a'); R(0, 96, 200, 1, '#92c862'); dR(0, 110, 200, 10, '#356e46', 6); for (let x = 20; x < 120; x += 3) dR(x, 104 + Math.round(Math.sin(x / 20) * 3), 3, 4, '#a08a58', 8);
    R(128, 76, 40, 22, '#d8c8a0'); R(128, 76, 40, 1, '#f0e4c8'); R(142, 84, 9, 14, '#6a4a30'); R(156, 82, 7, 6, '#4a3a2a'); roof(148, 66, 30, 52, 10, { l: '#b89a5a', m: '#8a6e3c', d: '#5a4628', e: '#d8c080', u: '#3a2c1c' }, {}); R(160, 54, 4, 10, '#8a8478');
    for (let i = 0; i < 6; i++) { ctx.globalAlpha = 0.6 - i * 0.09; disc(162 + i * 2 + (i % 2), 50 - i * 6, 2 + (i >> 1), '#f6f2fa'); } ctx.globalAlpha = 1;
    bloomTree(108, 100, 1.2, SEASON_TREE[0], 5); for (let i = 0; i < 3; i++) ART.drawPlot(30 + i * 20, 102, ['herb', 'rice', 'fire'][i], 2, 0);
    mini(84, 104, '#f0b070', '#6a4630'); mini(94, 104, '#4ccb9f', '#2a2230'); R(87, 99, 5, 1, '#8a5c36'); for (const [x, y] of [[20, 99], [60, 112], [180, 104], [120, 112]]) { R(x, y, 1, 2, '#92c862'); R(x, y - 1, 1, 1, '#f7a3bd'); }
  },
});
ART.backdropKinds = () => Object.keys(BACKDROP);

// ====================================================================
// 阶段四·界面补缺（接口见 docs/ART_API.md “阶段四·界面补缺”）
// ====================================================================
// ---------- 一、图标：声音三态、速度档、锁碎裂 ----------
// ART.icon('snd_on' 全开 | 'snd_sfx' 仅音效 | 'snd_off' 静音)；ART.icon('spd1' | 'spd2' | 'spd4') 速度档（暂停 / 播放仍用 pause / play）
// ART.lockBreak(f 0～3) → 16×16：0 完好（同 icon('lock')）、1 裂、2 崩开、3 碎屑；ART.lockBreakFrames = 4
{
  const SPK = ['', '.....#', '....##', '...###', '######', '#%####', '#%####', '#%####', '#####%', '...##%', '....#%', '.....%'];
  const spk = (a, b2, ex) => SPK.map((r, i) => (r.replace(/#/g, a).replace(/%/g, b2) + '......').slice(0, 6) + (ex[i] || '')).join('/');
  const DIG = { 1: ['..nn', '.nnn', 'nnnn', '..nn', '..nn', '..nn', '..nn', '..nN', 'nnnnnN'], 2: ['.nnnn', 'nn..nn', '....nn', '....nN', '...nN', '..nN', '.nN', 'nn', 'nnnnnN'], 4: ['...nn', '..nnn', '.nnnn', 'nn.nn', 'nn.nN', 'nnnnnN', '...nN', '...nN', '...nN'] };
  const X5 = ['n...n', '.n.n.', '..n..', '.n.N.', 'n...N'];
  const spd = d => ['', ''].concat(DIG[d].map((r, i) => (i >= 3 && i < 8 ? X5[i - 3] : '.....') + '..' + r)).join('/');
  Object.assign(ICONS, {
    snd_on: spk('n', 'N', { 1: '...n', 2: '....n', 3: '.....n', 4: '.n....n', 5: '..n...n', 6: '..n...n', 7: '..n...N', 8: '.n....N', 9: '.....N', 10: '....N', 11: '...N' }),
    snd_sfx: spk('n', 'N', { 2: '.....y', 3: '....yhy', 4: '.n...y', 5: '..n', 6: '..n', 7: '..n', 8: '.n...y', 9: '....y.y' }),
    snd_off: spk('s', 'S', { 3: '..r...r', 4: '..rr.rr', 5: '...rrr', 6: '...rrR', 7: '..rr.RR', 8: '..r...R' }),
    spd1: spd(1), spd2: spd(2), spd4: spd(4),
  });
}
ART.lockBreakFrames = 4;
ART.lockBreak = function (f) {
  f = Math.max(0, Math.min(3, f | 0)); if (!f) return ART.icon('lock');
  return cached('lkb|' + f, () => {
    const b = new Buf(16, 16), rows = ICONS.lock.split('/');
    if (f === 3) { // 碎屑四散
      for (const [x, y, w, h, c] of [[1, 8, 3, 3, 'y'], [11, 9, 3, 2, 'y'], [3, 12, 2, 2, 'Y'], [9, 12, 2, 2, 'y'], [12, 5, 2, 2, 'Y'], [10, 1, 3, 2, 's'], [2, 3, 2, 2, 's'], [6, 13, 1, 1, 'h']]) b.r(x, y, w, h, IPAL[c]);
      b.p(1, 8, IPAL.h); b.p(11, 9, IPAL.h); b.p(10, 1, IPAL.t);
      const c = b.cv(); on(c, () => { R(7, 4, 1, 7, '#ffffff'); R(4, 7, 7, 1, '#ffffff'); R(6, 6, 3, 3, '#fff2a8'); R(7, 7, 1, 1, '#ffffff'); R(4, 4, 1, 1, '#fff2a8'); R(10, 10, 1, 1, '#fff2a8'); R(10, 4, 1, 1, '#fff2a8'); R(4, 10, 1, 1, '#fff2a8'); });
      return c;
    }
    for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
      const c = IPAL[rows[j][i]]; if (!c) continue; let x = i + 1, y = j + 1;
      if (j < 4) { if (i >= 7) { y -= 1; if (f === 2) x += 3; } }
      else if (f === 2) { x += i <= 5 ? -1 : 2; y += i <= 5 ? 2 : 1 + (j > 7 ? 1 : 0); }
      b.p(x, y, c);
    }
    if (f === 1) { for (const [x, y] of [[7, 5], [6, 6], [6, 7], [7, 8], [6, 9], [5, 10], [6, 11]]) b.p(x, y, IPAL.K); for (const [x, y] of [[8, 5], [7, 7], [7, 9]]) b.p(x, y, '#ffffff'); }
    const c = b.cv();
    on(c, () => { if (f === 1) { R(12, 4, 1, 1, '#ffffff'); R(13, 2, 1, 1, '#fff2a8'); R(1, 8, 1, 1, '#fff2a8'); } else { R(7, 7, 1, 6, '#ffffff'); R(8, 9, 1, 3, '#fff2a8'); R(13, 4, 1, 1, '#fff2a8'); R(2, 4, 1, 1, '#ffffff'); R(14, 9, 1, 1, '#ffffff'); R(0, 10, 1, 1, '#fff2a8'); } });
    return c;
  });
};

// ---------- 二、掉落翻牌的品阶光柱 24×48 ----------
// ART.dropBeam(tier 1～7, frame 0～3) → 24×48 透明底，光柱底心在 (12, 44)；七阶为七彩。ART.beamFrames = 4；ART.beamColor(tier)
const BEAM_C = ['#b8b8b8', '#62d26f', '#4aa8ff', '#c27dff', '#ffb23f', '#ff6b6b', '#fff2a8'], BEAM_RB = ['#ff6b6b', '#ffb23f', '#f4e04a', '#62d26f', '#4aa8ff', '#c27dff'];
ART.beamFrames = 4;
ART.beamColor = t => BEAM_C[Math.max(1, Math.min(7, t | 0)) - 1];
ART.dropBeam = function (tier, frame) {
  tier = Math.max(1, Math.min(7, tier | 0)); frame = ((frame | 0) % 4 + 4) % 4;
  return cached('beam|' + tier + frame, () => on(mk(24, 48), () => {
    const base = BEAM_C[tier - 1], big = tier >= 5 ? 1 : 0, wob = [0, 1, 0, -1][frame], r = seeded(tier * 7 + 3);
    const colAt = y => tier === 7 ? BEAM_RB[(((y + frame * 3) / 6) | 0) % 6] : base;
    for (let y = 0; y < 45; y++) {
      const u = y / 44, c = colAt(y), hw = Math.round(2 + u * (2 + big) + (y % 7 === frame ? wob : 0)), lv = Math.round(2 + u * u * 14);
      ctx.globalAlpha = 0.5; dR(12 - hw - 2, y, hw * 2 + 4, 1, c, Math.max(1, lv - 6));
      ctx.globalAlpha = 0.9; dR(12 - hw, y, hw * 2, 1, c, lv);
      ctx.globalAlpha = 1; const cw = y > 30 ? 2 : 1; dR(12 - cw, y, cw * 2, 1, lerpC(c, '#ffffff', 0.75), Math.min(16, lv + 6)); if (y > 16) R(11 + ((y + frame) % 9 === 0 ? 1 : 0), y, 1, 1, '#ffffff');
    }
    // 底座光圈
    const c0 = colAt(44); ctx.globalAlpha = 0.55; ellipse(12, 44, 11, 3, c0); ctx.globalAlpha = 1; ellipse(12, 44, 8 + (frame & 1), 2, lerpC(c0, '#ffffff', 0.45)); ellipse(12, 44, 4, 1, '#ffffff');
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + frame * 0.26; R(12 + Math.cos(a) * 11, 44 + Math.sin(a) * 3, 1, 1, i % 2 ? '#ffffff' : c0); }
    // 上升的光点
    const n = 3 + tier; for (let i = 0; i < n; i++) { const px = 3 + Math.floor(r() * 18), sp = 5 + r() * 6, py = 42 - ((r() * 44 + frame * sp) % 42), c = i % 3 ? colAt(py | 0) : '#ffffff'; ctx.globalAlpha = Math.min(1, 0.35 + py / 40); R(px, py, 1, i % 4 === 0 ? 2 : 1, c); }
    ctx.globalAlpha = 1;
    if (tier >= 4) for (const [x, y] of [[4, 36], [19, 30], [6, 18], [18, 12]].slice(0, tier - 2)) { const yy = y - frame * 2, s = (frame + x) % 2; R(x - s, yy, 1 + s * 2, 1, '#ffffff'); R(x, yy - s, 1, 1 + s * 2, '#ffffff'); }
    if (tier >= 6) { ctx.globalAlpha = 0.7; for (const s of [-1, 1]) line(12 + s * 3, 43, 12 + s * (9 + (frame & 1)), 20, colAt(30)); ctx.globalAlpha = 1; }
  }));
};

// ---------- 三、空状态淡墨小画 48×48 ----------
// ART.emptyNote('pet' 还没有灵宠 | 'vault' 宝库空 | 'build' 能建的都建了, paper) → 48×48；默认透明底（配暗色面板），paper 为真时画在宣纸底上
const EMPTY = {
  // 空巢、一根落羽、走远的爪印
  pet(I) {
    dR(4, 40, 40, 5, I[3], 6);
    const hwAt = y => Math.round(14 * Math.sqrt(1 - ((y - 30) / 12) ** 2 * 0.9));
    for (let y = 30; y <= 41; y++) { const hw = hwAt(y); R(24 - hw, y, hw * 2, 1, I[2]); for (let x = 24 - hw + 1; x < 23 + hw; x++) if ((x + y * 2) % 5 === 0 || (x - y * 2 + 60) % 7 === 0) R(x, y, 1, 1, I[1]); R(24 - hw, y, 1, 1, I[0]); R(23 + hw, y, 1, 1, I[0]); }
    R(16, 42, 16, 1, I[0]); ellipse(24, 30, 14, 3, I[0]); ellipse(24, 30, 12, 2, I[4]); dR(13, 30, 22, 2, I[3], 8);
    for (const [x0, y0, x1, y1] of [[10, 29, 5, 25], [38, 29, 43, 26], [11, 34, 6, 35], [37, 35, 42, 37], [14, 28, 12, 24], [34, 28, 37, 24]]) line(x0, y0, x1, y1, I[0]);
    [1, 2, 3, 3, 3, 2, 2, 1].forEach((w, k) => { const x = 40 - k, y = 3 + k * 2; R(x - w, y, w * 2 + 1, 1, I[1]); R(x - w + 1, y + 1, w * 2, 1, I[2]); R(x, y, 1, 2, I[0]); }); R(32, 19, 1, 2, I[0]); R(31, 21, 1, 1, I[0]);
    for (const [x, y] of [[20, 29], [21, 28], [22, 27], [23, 28], [24, 27], [25, 28], [26, 29]]) R(x, y, 1, 31 - y, I[0]); R(21, 29, 5, 2, I[4]); R(22, 28, 1, 1, I[4]); R(24, 28, 1, 1, I[4]);
    for (const [x, y] of [[38, 44], [43, 41], [45, 46]]) { R(x, y, 2, 2, I[1]); R(x - 1, y - 2, 1, 1, I[1]); R(x + 1, y - 2, 1, 1, I[1]); R(x + 3, y - 1, 1, 1, I[1]); }
    for (const [x, y] of [[9, 41], [11, 43], [7, 44]]) { R(x, y, 1, 3, I[2]); R(x + 1, y - 1, 1, 2, I[1]); }
  },
  // 敞开的空箱、角上的蛛网
  vault(I) {
    dR(4, 40, 40, 5, I[3], 6);
    R(9, 28, 30, 13, I[1]); R(10, 29, 28, 11, I[4]); dR(10, 29, 28, 11, I[3], 7); R(9, 28, 30, 1, I[0]); R(9, 40, 30, 1, I[0]); R(9, 28, 1, 13, I[0]); R(38, 28, 1, 13, I[0]);
    R(9, 33, 30, 1, I[1]); for (const x of [14, 33]) { R(x, 28, 1, 13, I[1]); R(x, 31, 1, 1, I[0]); R(x, 37, 1, 1, I[0]); } R(22, 32, 4, 4, I[1]); R(23, 33, 2, 2, I[4]);
    line(9, 27, 13, 15, I[0]); line(38, 27, 42, 15, I[0]); R(13, 14, 30, 1, I[0]); line(13, 15, 42, 15, I[1]); dR(13, 16, 28, 11, I[3], 4); line(11, 21, 40, 21, I[2]); R(10, 27, 28, 1, I[4]); dR(12, 23, 26, 4, I[2], 5);
    for (const [x0, y0, x1, y1] of [[1, 1, 16, 4], [1, 1, 12, 11], [1, 1, 4, 16]]) line(x0, y0, x1, y1, I[2]);
    for (const [x0, y0, x1, y1] of [[8, 2, 7, 6], [7, 6, 3, 8], [13, 3, 10, 9], [10, 9, 3, 13]]) line(x0, y0, x1, y1, I[2]);
    R(10, 9, 1, 8, I[2]); R(9, 17, 3, 2, I[0]); R(8, 17, 1, 1, I[1]); R(12, 17, 1, 1, I[1]); R(8, 19, 1, 1, I[1]); R(12, 19, 1, 1, I[1]);
    for (const [x, y] of [[20, 9], [28, 6], [34, 10], [25, 12]]) R(x, y, 1, 1, I[2]);
  },
  // 山上的楼阁都起好了：层檐、松、远山、飞鸟
  build(I) {
    const far = [30, 28, 25, 22, 20, 19, 17, 16, 14, 13, 13, 14, 16, 17, 19, 20, 22, 24, 25, 27, 28, 30, 31, 32]; far.forEach((y, i) => { dR(24 + i, y, 1, 40 - y, I[3], 5); R(24 + i, y, 1, 1, I[2]); });
    for (let x = 2; x < 46; x++) { const y = Math.round(36 - Math.sin((x - 2) / 44 * Math.PI) * 9 + Math.sin(x * 0.9) * 1); dR(x, y, 1, 46 - y, I[3], x < 20 ? 9 : 7); R(x, y, 1, 1 + (x % 3 === 0 ? 1 : 0), I[1]); }
    dR(0, 43, 48, 4, I[3], 4);
    for (const [cx, y, w] of [[26, 10, 5], [26, 15, 8], [26, 21, 11]]) { R(cx - w, y, w * 2, 1, I[0]); R(cx - w + 1, y - 1, w * 2 - 2, 1, I[1]); R(cx - w + 3, y - 2, w * 2 - 6, 1, I[1]); R(cx - w - 1, y - 1, 1, 1, I[0]); R(cx + w, y - 1, 1, 1, I[0]); R(cx - w + 3, y + 1, w * 2 - 6, 4, I[4]); R(cx - w + 3, y + 1, 1, 4, I[1]); R(cx + w - 4, y + 1, 1, 4, I[1]); if (w > 5) R(cx - 1, y + 2, 2, 3, I[2]); }
    R(25, 5, 2, 3, I[0]); R(26, 3, 1, 2, I[5]); R(17, 26, 18, 1, I[0]); R(18, 27, 16, 1, I[2]);
    R(9, 22, 1, 12, I[0]); for (const [y, w] of [[19, 2], [22, 4], [25, 5], [28, 3]]) { R(9 - w, y, w * 2 + 1, 1, I[0]); R(9 - w + 1, y + 1, w * 2 - 1, 1, I[1]); }
    R(39, 28, 1, 8, I[0]); for (const [y, w] of [[26, 2], [29, 3]]) { R(39 - w, y, w * 2 + 1, 1, I[0]); R(39 - w + 1, y + 1, w * 2 - 1, 1, I[1]); }
    for (const [x, y] of [[6, 8], [12, 5]]) { R(x, y, 2, 1, I[0]); R(x + 2, y + 1, 1, 1, I[0]); R(x + 3, y, 2, 1, I[0]); }
    ellipse(41, 8, 3, 3, I[5]);
  },
};
ART.emptyKinds = Object.keys(EMPTY);
ART.emptyNote = function (kind, paper) {
  if (!EMPTY[kind]) kind = 'pet';
  return cached('empty|' + kind + (paper ? 1 : 0), () => on(mk(48, 48), () => {
    // I = [浓墨, 中墨, 淡墨, 水痕, 留白, 朱]
    const I = paper ? ['#5a5248', '#8a8478', '#b8ac98', '#d8ccb0', '#f6ecd0', '#d8605a'] : ['#b8ac98', '#8a8070', '#6a6258', '#4a4450', '#3a3446', '#b8504e'];
    if (paper) { R(0, 0, 48, 48, '#efe3c4'); const r = seeded(4); for (let i = 0; i < 40; i++) R(r() * 48, r() * 48, 1 + r() * 3, 1, i % 2 ? '#e6d8b4' : '#f6ecd0'); }
    EMPTY[kind](I);
    if (kind !== 'build') { const bg = paper ? '#efe3c4' : '#262038'; R(1, 41, 5, 5, I[5]); R(2, 42, 3, 1, bg); R(3, 42, 1, 3, bg); R(2, 44, 3, 1, bg); }
  }));
};
// ---------- 四、九宗代表：诸葛千机 / 慧能大师 / 剑十三 ----------
// ART.portrait('zhuge' | 'huineng' | 'jian13', mood) 48×48 五种表情；ART.fighter(同 id, frame, flip) 六帧。
// L.NINE 的宗门 id → 人物 id：ART.nineChamp('wanfa') → 'zhuge'（九宗齐全，见 NINE_CHAMP）
Object.assign(PEOPLE, {
  // 诸葛千机：万法阁。纶巾、细长眼、八字须山羊胡、手里一柄白羽扇
  zhuge: {
    skin: '#f0d8c0', hair: '#2a2636', shape: 'long', robe: ['#3a2466', '#6a44a8', '#a884e0'], trim: '#e8d8ff', bust: { sw: 18, inner: '#f6f2fa' },
    fr: 'jkdba9876656', back: (L, c) => L.r(15, 22, 18, 12, c),
    F: { eye: 'n', iris: '#4a3a7a', brow: { len: 6, tilt: 0.4, in: 1 }, mouth: { n: 'smirk', joy: 'smile', ang: 'flat', shock: 'o', sad: 'line' } },
    skinX: (b, m, sk) => b.mir(T => T.l(18, 29, 17, 32, sk.S)),
    post: (b, m, c) => {
      const H = tone('#3a3460', '#1e1a3a', '#6a64a0');
      b.add(L => { L.r(17, 1, 14, 8, H); L.r(14, 7, 20, 3, H); L.r(19, 0, 10, 2, H); }); for (const x of [20, 27]) b.r(x, 1, 1, 6, '#1e1a3a'); b.hl(14, 33, 8, '#c27dff'); b.r(23, 3, 2, 3, '#5fd3b0'); b.p(23, 3, '#c8fff0');
      b.add(L => { L.mir(T => { T.hl(20, 22, 30, c); T.p(19, 31, c); }); L.r(23, 34, 2, 5, c); L.p(23, 39, c); });
      b.add(L => { for (let i = 0; i < 5; i++) { const a = -2.5 + i * 0.36; L.l(9, 46, 9 + Math.cos(a) * 13, 46 + Math.sin(a) * 13, WHITE, 3); } });
      for (let i = 0; i < 5; i++) { const a = -2.5 + i * 0.36; b.l(9, 46, 9 + Math.cos(a) * 11, 46 + Math.sin(a) * 11, '#b4b0cc'); } b.add(L => L.r(8, 44, 3, 4, WOOD)); b.p(9, 43, '#f4c542');
    },
  },
  // 慧能大师：金刚寺。光头戒疤、垂到肩下的白长眉、大耳垂、闭目含笑，袈裟佛珠
  huineng: {
    skin: '#e8b88a', hair: '#f0f0f6', shape: 'wide', robe: ['#a85a1e', '#e89a3a', '#ffd07a'], trim: '#8a1e2e', bust: { sw: 21, inner: '#f4e08a' }, noGloss: 1,
    F: { eye: 'o', iris: '#3a2a2a', lash: '#5a3a2a', brow: { c: 0 }, nose: 2, mouth: { n: 'smile', joy: 'open', ang: 'flat', shock: 'o', sad: 'frown' } },
    mid: b => b.add(L => { for (let k = 0; k < 10; k++) L.hl(25 + k, 44, 38 + k, RED); L.hl(30, 44, 38, RED); L.hl(33, 44, 39, RED); }),
    skinX: (b, m, sk) => {
      b.mir(T => { T.r(11, 28, 3, 5, sk.s); T.r(12, 32, 2, 2, sk.S); T.p(12, 26, sk.S); });
      for (const y of [13, 15]) for (const x of [20, 23, 26]) { b.r(x, y, 2, 1, sk.S); }
      b.hl(17, 30, 11, lerpC(sk.s, '#fff8e8', 0.5)); b.hl(19, 26, 12, lerpC(sk.s, '#fff8e8', 0.5)); b.r(23, 19, 2, 2, '#d8404a'); b.mir(T => T.l(17, 30, 19, 33, sk.S));
    },
    post: (b, mood, W) => {
      const tl = mood === 'ang' ? 1 : mood === 'sad' ? -1 : 0, by = mood === 'shock' ? 20 : 21;
      b.add(L => L.mir(T => { T.l(21, by + tl, 15, by - tl, W, 2); T.l(14, by - tl, 11, by + 4, W, 2); T.l(11, by + 5, 10, by + 15, W, 2); T.l(10, by + 15, 11, by + 19, W); }));
      b.add(L => { for (let i = 0; i < 9; i++) { const u = i / 8, x = 15 + u * 17, y = 40 + Math.sin(u * Math.PI) * 6; L.r(Math.round(x), Math.round(y), 2, 2, WOOD); } L.r(23, 46, 3, 2, GOLD); }, { flat: 1, sep: 1 });
      for (let i = 0; i < 9; i += 2) { const u = i / 8; b.p(Math.round(15 + u * 17), Math.round(40 + Math.sin(u * Math.PI) * 6), '#b98a4c'); }
    },
  },
  // 剑十三：太虚剑宗。高马尾、白抹额、脸上一道旧疤，背后两柄剑
  jian13: {
    skin: '#f0d2b4', hair: '#1e1c2a', shape: 'oval', robe: ['#1e3f7a', '#3f7ed0', '#8fc0ff'], trim: '#eef6ff', bust: { sw: 19, inner: '#16203a' },
    fr: 'jkcb98766556', back: (L, c) => { L.r(16, 24, 16, 9, c); L.l(28, 3, 38, 7, c, 4); L.l(38, 7, 41, 20, c, 4); L.l(41, 20, 39, 30, c, 3); L.l(39, 30, 41, 35, c, 2); }, hairX: (L, c) => L.e(25, 3.5, 4.5, 3.2, c),
    pre: b => { hilt(b, 12, 38, 6, 16, { g: 6, guard: STEEL, pommel: '#4aa8ff', grip: '#24487e' }); hilt(b, 8, 40, 1, 24, { g: 6, guard: STEEL, pommel: '#4aa8ff', grip: '#24487e' }); },
    F: { eye: 'x', iris: '#3a5a9a', tail: '#1e1c2a', brow: { len: 6, tilt: 0.8, in: 1 }, mouth: { n: 'flat', joy: 'smirk', ang: 'grit', shock: 'o', sad: 'line' } },
    skinX: (b, m, sk) => { b.l(29, 27, 32, 31, sk.M); b.p(31, 28, sk.S); b.p(29, 30, sk.S); },
    post: b => { b.add(L => { L.r(13, 15, 22, 3, WHITE); L.l(35, 16, 42, 21, WHITE, 2); L.l(35, 17, 40, 26, WHITE, 2); }); b.r(22, 15, 4, 3, '#4aa8ff'); b.p(22, 15, '#d4ecff'); b.r(23, 3, 3, 2, '#4aa8ff'); },
  },
});
Object.assign(P_ALIAS, { zhugeqianji: 'zhuge', qianji: 'zhuge', huinengdashi: 'huineng', jianshisan: 'jian13', shisan: 'jian13' });
Object.assign(FMOD, {
  // 光头：发髻与头发换成肤色，点戒疤，白长眉垂到颊边
  bald(g) {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 30; x++) g[y][x] = '.';
    for (let y = 4; y < 18; y++) for (let x = 0; x < 30; x++) { const ch = g[y][x]; if (ch === 'H') g[y][x] = y < 12 ? 'S' : x === 7 || x === 22 ? '.' : 'S'; else if (ch === 'h' || ch === 'j' || ch === 'g' || ch === 'G' || ch === 'y' || ch === 'Y') g[y][x] = 's'; }
    for (const x of [12, 14, 16]) { put(g, x, 6, 'S'); put(g, x + 1, 6, 'S'); }
    for (const sx of [0, 1]) { const X = x => sx ? 29 - x : x; put(g, X(12), 10, 'u'); put(g, X(11), 10, 'u'); put(g, X(10), 11, 'u'); for (let y = 12; y <= 17; y++) put(g, X(9), y, 'u'); put(g, X(8), 18, 'u'); put(g, X(8), 19, 'u'); }
  },
  // 佛珠与斜披的袈裟
  beads(g) { for (let y = 19; y <= 28; y++) for (let x = 0; x < 30; x++) if ('RrqDtT'.includes(g[y][x]) && x >= 14 + (y - 19) * 0.9 - 2 && x <= 14 + (y - 19) * 0.9 + 2) g[y][x] = x >= 14 + (y - 19) * 0.9 + 2 ? 'G' : 'C'; for (const [x, y] of [[11, 19], [12, 20], [13, 21], [14, 22], [15, 22], [16, 21], [17, 20], [18, 19]]) put(g, x, y, (x + y) % 2 ? 'C' : 'c'); put(g, 14, 23, 'g'); put(g, 15, 23, 'G'); },
  // 抹额（飘带在右）
  band(g) { for (let x = 8; x <= 21; x++) put(g, x, 9, x > 17 ? 'T' : 'u'); put(g, 14, 9, 't'); put(g, 15, 9, 't'); for (const [x, y] of [[22, 10], [23, 11], [23, 12], [22, 13], [24, 12]]) put(g, x, y, 'u'); },
  // 高马尾
  pony(g) { for (const [x, y] of [[18, 1], [19, 1], [20, 2], [21, 2], [21, 3], [22, 3], [22, 4], [23, 4], [23, 5], [23, 6], [24, 6], [24, 7], [24, 8], [23, 9]]) { put(g, x, y, 'h'); put(g, x + 1, y, 'H'); } },
  // 八字须与山羊胡（黑）
  goatee(g) { for (const [x, y] of [[14, 18], [15, 18], [14, 19], [15, 19], [14, 20]]) put(g, x, y, 'H'); put(g, 12, 16, 'S'); put(g, 17, 16, 'S'); },
});
Object.assign(FSPEC, { zhuge: ['cap', 'goatee'], huineng: ['bald', 'beads'], jian13: ['pony', 'band'] });
const NINE_CHAMP = { kunlun: 'yun', tianjian: 'tian', xuesha: 'xue', wanfa: 'zhuge', jingang: 'huineng', jian: 'jian13', dao: 'dao', dan: 'hongxiu', yushou: 'yutian' };
ART.nineChamp = id => NINE_CHAMP[id] || null;

// ---------- 五、魔宗演武场 ----------
// ART.drawDuelStage('sect_mo', t, OY)：血月、黑山、魔殿、绿火盆、血纹阵。坐标同其它舞台（脚底 y = 128）；ART.duelStages() 含 'sect_mo'
STAGES.sect_mo = {
  sky: ['#0c0614', '#24091e', '#551228', '#9a2a34', '#d8603e'],
  build() {
    disc(46, 46, 15, '#ff8a5a'); disc(46, 46, 13, '#e8483a'); for (const [x, y, r] of [[41, 42, 3], [50, 50, 2], [47, 39, 1], [40, 51, 1]]) disc(x, y, r, '#b8303a'); glow(46, 46, 28, '#ff5a3a', 0.4);
    paintRidge(ridgeLine(131, 200, 78, 52, 5, 2.6), 114, '#3a1230', '#8a2a3a', { lit: '#6a2440', dark: '#220a20' });
    paintRidge(ridgeLine(139, 200, 100, 26, 7, 1.7), 116, '#1c0a1c', '#4a1630', { lit: '#3a1430', dark: '#12060e' });
    // 魔殿
    const RF = { l: '#4a2a4e', m: '#34183a', d: '#1e0c24', e: '#8a3a5a', u: '#0c040e' };
    R(50, 84, 100, 28, '#1a0c1e'); R(50, 84, 100, 1, '#3a1a34');
    for (const x of [52, 68, 84, 111, 127, 143]) { R(x, 85, 5, 27, '#3a1a34'); R(x, 85, 1, 27, '#6a2a4c'); R(x + 4, 85, 1, 27, '#1e0c24'); R(x - 1, 108, 7, 4, '#2a1228'); R(x - 1, 108, 7, 1, '#5a2a44'); }
    for (const x of [59, 75, 118, 134]) { R(x, 90, 6, 10, '#0c040e'); R(x + 1, 92, 4, 7, '#7a1a2e'); R(x + 2, 93, 2, 5, '#e8483a'); R(x + 3, 92, 1, 7, '#0c040e'); }
    R(90, 88, 20, 24, '#0c040e'); R(92, 90, 16, 22, '#2a0810'); dR(92, 100, 16, 12, '#7a1a2e', 6); R(99, 90, 2, 22, '#0c040e'); R(90, 88, 20, 1, '#8a3a5a');
    roof(100, 70, 60, 116, 13, RF, { big: true });
    for (const s of [-1, 1]) { line(100 + s * 28, 68, 100 + s * 36, 60, '#d8ccb8', 2); line(100 + s * 36, 60, 100 + s * 37, 53, '#d8ccb8', 2); R(100 + s * 37, 52, 1, 2, '#fff8e0'); }
    disc(100, 80, 5, '#d8ccb8'); R(97, 84, 7, 3, '#d8ccb8'); R(97, 79, 2, 3, '#0c040e'); R(102, 79, 2, 3, '#0c040e'); R(98, 80, 1, 1, '#e8483a'); R(103, 80, 1, 1, '#e8483a'); R(100, 83, 1, 2, '#0c040e'); R(98, 86, 1, 1, '#0c040e'); R(100, 86, 1, 1, '#0c040e'); R(102, 86, 1, 1, '#0c040e'); R(97, 76, 3, 1, '#fff8e0');
    // 黑石地面与血纹阵
    R(0, 112, 200, 48, '#4a3550'); R(0, 112, 200, 1, '#8a5a7a');
    for (let k = 0; k < 7; k++) R(0, 114 + Math.round(k * k * 0.9 + k * 2), 200, 1, '#33223a');
    for (let i = -8; i <= 8; i++) line(100 + i * 14, 113, 100 + i * 34, 160, '#33223a');
    dR(0, 112, 200, 6, '#6a4a68', 6); dR(0, 148, 200, 12, '#1e1024', 8); R(0, 156, 200, 4, '#1e1024');
    ellipse(100, 131, 66, 8, '#8a2434'); ellipse(100, 131, 63, 7, '#4a3550'); ellipse(100, 131, 44, 5, '#7a2030'); ellipse(100, 131, 42, 4, '#4a3550');
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.26; line(100 + Math.cos(a) * 44, 131 + Math.sin(a) * 5, 100 + Math.cos(a) * 62, 131 + Math.sin(a) * 7, '#8a2434'); }
    for (const [x, y] of [[30, 144], [58, 152], [132, 148], [168, 142], [96, 154]]) { line(x, y, x + 7, y + 2, '#2a1830'); line(x + 3, y + 1, x + 5, y + 5, '#2a1830'); }
    // 骨刺、锁链桩、骷髅堆
    for (const [x, h] of [[4, 20], [10, 13], [190, 18], [196, 24], [184, 10]]) { for (let k = 0; k < h; k++) R(x - (k < h / 3 ? 2 : k < h * 0.7 ? 1 : 0), 116 - k, k < h / 3 ? 4 : k < h * 0.7 ? 3 : 1, 1, k % 5 === 4 ? '#8a7a70' : '#b8a898'); R(x - 2, 116 - h + Math.round(h / 3), 1, h - Math.round(h / 3), '#e8dcc8'); }
    for (const x of [32, 164]) { R(x, 100, 4, 18, '#2a1a30'); R(x, 100, 1, 18, '#5a3a56'); R(x - 1, 99, 6, 2, '#5a3a56'); for (let k = 0; k < 6; k++) R(x + (x < 100 ? 4 + k * 2 : -2 - k * 2), 102 + Math.round(Math.sin(k / 5 * Math.PI) * 4), 2, 2, k % 2 ? '#6a6478' : '#928ea8'); }
    for (const [x, y] of [[150, 118], [156, 119], [153, 114], [40, 119], [46, 120]]) { disc(x, y, 3, '#d8ccb8'); R(x - 2, y - 1, 2, 2, '#1e1024'); R(x + 1, y - 1, 2, 2, '#1e1024'); R(x - 1, y + 2, 3, 1, '#8a7a70'); R(x - 2, y - 3, 3, 1, '#fff8e0'); }
    // 火盆
    for (const x of [22, 178]) { R(x - 1, 112, 2, 12, '#2a1a30'); line(x - 5, 124, x - 1, 114, '#2a1a30'); line(x + 5, 124, x + 1, 114, '#2a1a30'); R(x - 6, 108, 12, 4, '#3a2a40'); R(x - 6, 108, 12, 1, '#7a5a7a'); R(x - 5, 112, 10, 1, '#1e1024'); R(x - 6, 108, 1, 3, '#7a5a7a'); }
  },
  fx(t) {
    flag(60, 58, t, '#5a1220', '#c8a84a', 12); flag(126, 58, t + 700, '#5a1220', '#c8a84a', 12);
    for (const x of [22, 178]) {
      const fl = Math.sin(t / 90 + x) * 0.5 + 0.5, h = 7 + Math.round(fl * 3);
      glow(x, 104, 12, '#62ff9a', 0.3 + fl * 0.12);
      for (let k = 0; k < h; k++) { const w = k < 2 ? 4 : k < h - 3 ? 3 : k < h - 1 ? 2 : 1, sx = Math.round(Math.sin(t / 130 + k * 0.9 + x) * (k / h) * 2); R(x - w + sx, 107 - k, w * 2, 1, k < 3 ? '#e8ffc8' : k < h - 3 ? '#8fffa0' : '#2fae6a'); }
      R(x - 1, 106, 2, 2, '#ffffff');
      for (let i = 0; i < 3; i++) { const k = ((t / 50 + i * 11 + x) % 30) / 30; ctx.globalAlpha = 1 - k; R(x - 3 + ((i * 5 + x) % 7) + Math.round(Math.sin(t / 200 + i) * 2), 98 - k * 22, 1, 1, '#8fffa0'); } ctx.globalAlpha = 1;
    }
    const p = 0.5 + Math.sin(t / 600) * 0.5; ctx.globalAlpha = 0.25 + p * 0.3; dR(92, 96, 16, 16, '#e8483a', 6); ctx.globalAlpha = 1; glow(100, 81, 6, '#ff3a2a', 0.2 + p * 0.25);
    ctx.globalAlpha = 0.35 + p * 0.25; for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12 + t / 2400; R(100 + Math.cos(a) * 64, 131 + Math.sin(a) * 7, 2, 1, '#ff6b6b'); } ctx.globalAlpha = 1;
    for (let i = 0; i < 10; i++) { const k = ((t / 70 + i * 13) % 60) / 60, x = (i * 47 + Math.sin(t / 700 + i) * 8) % 200, y = 150 - k * 70; ctx.globalAlpha = (1 - k) * 0.9; R(x, y, 1, 1, i % 3 ? '#ff6b3a' : '#ffb23f'); } ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.22; for (const [y, sp] of [[114, 0.005], [120, 0.009]]) { const x = -(((t * sp) % 200) | 0); for (const dx of [0, 200]) dR(x + dx, y, 130, 3, '#c27dff', 6); } ctx.globalAlpha = 1;
  },
};

// ---------- 六、五行招式特效 ----------
// ART.drawElemQi(x, y, el, t, flip)  → 飞行中的五行剑气，(x, y) 为中心，约 20×14，朝右（flip 朝左）；t 毫秒，带自身抖动
// ART.drawElemHit(x, y, el, k 0～1)   → 命中特效，约 28×28；el = 'jin' 'mu' 'shui' 'huo' 'tu'（也接受 金木水火土 或 0～4），ART.elems、ART.elemColor(el)
const ELS = ['jin', 'mu', 'shui', 'huo', 'tu'], EL_CN = { '金': 'jin', '木': 'mu', '水': 'shui', '火': 'huo', '土': 'tu' };
const EL_FX = { jin: ['#a8742a', '#f4c542', '#fff2a8'], mu: ['#2f8e4b', '#62d26f', '#c8f0a8'], shui: ['#24579a', '#4aa8ff', '#d4ecff'], huo: ['#a8241e', '#ff6b3a', '#ffd86a'], tu: ['#6a4a2e', '#b98a4c', '#e8cc94'] };
const elKey = e => typeof e === 'number' ? ELS[((e | 0) % 5 + 5) % 5] : EL_FX[e] ? e : EL_CN[e] || 'jin';
ART.elems = ELS;
ART.elemColor = e => EL_FX[elKey(e)][1];
ART.drawElemQi = function (x, y, el, t, flip) {
  el = elKey(el); x = Math.round(x); y = Math.round(y); t = t || 0;
  const [D, M, H] = EL_FX[el], s = flip ? -1 : 1, f = Math.floor(t / 80), P = (dx, dy, w, h, c) => R(s > 0 ? x + dx : x - dx - w + 1, y + dy, w, h, c);
  ctx.save();
  if (el === 'jin') { // 金：锐利的月牙刃 + 直线残影
    ctx.globalAlpha = 0.4; for (const [dy, l] of [[-3, 7], [0, 10], [3, 6]]) P(-6 - l - (f + dy & 1), dy, l, 1, M); ctx.globalAlpha = 1;
    for (let dy = -6; dy <= 6; dy++) { const a = Math.abs(dy), xo = Math.round(5 - a * a / 7); P(xo - 2, dy, a > 4 ? 2 : 3, 1, a > 4 ? D : M); P(xo, dy, a > 3 ? 1 : 2, 1, a > 4 ? M : H); if (a < 3) P(xo + 1, dy, 1, 1, '#ffffff'); }
    const sx = -4 + (f % 2) * -3; P(sx, -5 + (f % 3) * 4, 1, 3, '#ffffff'); P(sx - 1, -4 + (f % 3) * 4, 3, 1, '#ffffff');
  } else if (el === 'mu') { // 木：三片叶刃 + 藤蔓残影
    ctx.globalAlpha = 0.6; for (let i = 0; i < 12; i++) P(-14 + i, Math.round(Math.sin(i * 0.8 + t / 120) * 3), 1, 1, i % 3 ? D : M); ctx.globalAlpha = 1;
    for (const [dx, dy, k] of [[3, -4, 0], [5, 1, 1], [0, 5, 2]]) { const w = (f + k) % 3 === 0 ? 1 : 0; P(dx - 3, dy, 2, 1, D); P(dx - 1, dy - 1, 4, 3 - w, M); P(dx, dy - 2 + w, 2, 1, M); P(dx, dy + 2 - w, 2, 1, D); P(dx + 3, dy, 2, 1, H); P(dx - 1, dy, 4, 1, H); P(dx + 5, dy, 1, 1, '#ffffff'); }
    P(-6, -3 + (f % 2) * 5, 1, 1, H); P(-9, 2 - (f % 2) * 4, 1, 1, M);
  } else if (el === 'shui') { // 水：浪形月牙 + 水珠
    ctx.globalAlpha = 0.45; for (const [dy, l] of [[-2, 6], [1, 9], [4, 5]]) dR(s > 0 ? x - 7 - l : x + 7, y + dy, l, 2, M, 8); ctx.globalAlpha = 1;
    for (let dy = -6; dy <= 6; dy++) { const a = Math.abs(dy), xo = Math.round(4 - a * a / 8 + Math.sin(dy * 0.9 + t / 100) * 1); P(xo - 4, dy, 4, 1, a > 4 ? D : M); P(xo - 1, dy, 2, 1, H); P(xo + 1, dy, 1, 1, '#ffffff'); if (a < 5) P(xo - 5, dy, 1, 1, D); }
    for (const [dx, dy, k] of [[-8, -5, 0], [-11, 3, 1], [-5, 6, 2], [7, -5, 1]]) { const o = (f + k) % 2; P(dx - o, dy + o, 2, 2, M); P(dx - o, dy + o, 1, 1, '#ffffff'); }
  } else if (el === 'huo') { // 火：火球 + 火舌
    for (let i = 0; i < 5; i++) { const l = 5 + ((f + i * 2) % 4) * 2, dy = -4 + i * 2; P(-3 - l, dy, l, 2, i % 2 ? D : M); P(-3 - l + 2, dy, Math.max(1, l - 4), 1, M); }
    ctx.fillStyle = D; disc(x + s * 1, y, 6, D); disc(x + s * 2, y, 5, M); disc(x + s * 3, y, 3, H); disc(x + s * 4, y - 1, 1, '#ffffff');
    for (const [dx, dy, k] of [[-12, -6, 0], [-15, 2, 1], [-9, 7, 2]]) { const o = (f + k) % 3; ctx.globalAlpha = 1 - o * 0.3; P(dx - o * 2, dy - o, 1, 1, H); } ctx.globalAlpha = 1;
  } else { // 土：棱角分明的飞石 + 碎砾
    ctx.globalAlpha = 0.5; dR(s > 0 ? x - 17 : x + 7, y - 3, 10, 7, H, 5); ctx.globalAlpha = 1;
    for (const [dy, x0, x1] of [[-5, -1, 3], [-4, -3, 5], [-3, -5, 6], [-2, -6, 7], [-1, -6, 7], [0, -6, 8], [1, -5, 8], [2, -5, 7], [3, -4, 6], [4, -2, 4], [5, 0, 2]]) { P(x0, dy, x1 - x0 + 1, 1, M); P(x0, dy, dy < 0 ? 3 : 1, 1, H); P(x1 - 1, dy, 2, 1, D); if (dy > 2) P(x0, dy, x1 - x0 + 1, 1, D); }
    P(-2, -4, 4, 1, '#fff2d0'); P(0, -1, 1, 4, D); P(1, 2, 3, 1, D); P(-3, 0, 2, 1, D);
    for (const [dx, dy, k] of [[-10, -4, 0], [-13, 3, 1], [-9, 6, 2], [-16, -1, 1]]) { const o = (f + k) % 2; P(dx, dy + o, 2, 2, M); P(dx, dy + o, 1, 1, H); }
  }
  ctx.restore();
};
ART.drawElemHit = function (x, y, el, k) {
  el = elKey(el); x = Math.round(x); y = Math.round(y); k = Math.max(0, Math.min(1, k));
  const [D, M, H] = EL_FX[el], a = 1 - k * k, r = 3 + k * 11;
  ctx.save();
  if (k < 0.3) { disc(x, y, Math.round(4 - k * 8), '#ffffff'); glow(x, y, 11, M, 0.6 - k * 1.5); }
  if (el === 'jin') { // 金：十字金光 + 两道交叉斩痕
    ctx.globalAlpha = a; const L2 = Math.round(4 + k * 12);
    line(x - L2, y - L2, x + L2, y + L2, k < 0.5 ? '#ffffff' : H, k < 0.4 ? 2 : 1); line(x + L2, y - L2 + 2, x - L2, y + L2 - 2, k < 0.5 ? '#ffffff' : M, k < 0.4 ? 2 : 1);
    R(x - L2 - 2, y, L2 * 2 + 5, 1, H); R(x, y - L2 - 2, 1, L2 * 2 + 5, H);
    for (let i = 0; i < 6; i++) { const an = i * 1.05 + 0.5, d = r + 3; R(x + Math.cos(an) * d, y + Math.sin(an) * d, 2, 1, i % 2 ? M : '#ffffff'); R(x + Math.cos(an) * d, y + Math.sin(an) * d - 1, 1, 3, i % 2 ? M : '#ffffff'); }
  } else if (el === 'mu') { // 木：叶片四散 + 青藤圈
    ctx.globalAlpha = a; for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8 + k * 1.2; R(x + Math.cos(an) * r, y + Math.sin(an) * r, i % 4 ? 1 : 2, i % 4 ? 1 : 2, i % 2 ? M : D); }
    for (let i = 0; i < 7; i++) { const an = i * 0.9 + 0.3, d = r + 1 + (i % 3) * 2, px = Math.round(x + Math.cos(an) * d), py = Math.round(y + Math.sin(an) * d * 0.9 + k * k * 5), v = i % 2; R(px - 2, py, 5, 1, v ? M : D); R(px - 1, py - 1, 3, 3, v ? H : M); R(px, py, 1, 1, v ? M : H); }
    if (k < 0.6) for (const s of [-1, 1]) for (let i = 0; i < 6; i++) R(x + s * (2 + i * 2), y - 1 - Math.round(Math.sin(i / 5 * Math.PI) * 4), 2, 1, H);
  } else if (el === 'shui') { // 水：水环 + 抛起又落下的水珠
    ctx.globalAlpha = a * 0.9; for (let i = 0; i < 28; i++) { const an = i * Math.PI / 14; R(x + Math.cos(an) * (r + 2), y + 2 + Math.sin(an) * (r + 2) * 0.45, 1, 1, i % 3 ? M : '#ffffff'); }
    if (k < 0.7) for (let i = 0; i < 20; i++) { const an = i * Math.PI / 10; R(x + Math.cos(an) * r * 0.6, y + 2 + Math.sin(an) * r * 0.27, 1, 1, H); }
    for (let i = 0; i < 8; i++) { const vx = (i - 3.5) * 3.2, px = Math.round(x + vx * k), py = Math.round(y - (9 + (i * 5 % 7)) * k * 2 + 26 * k * k); R(px, py, 2, 2, i % 2 ? M : D); R(px, py, 1, 1, '#ffffff'); if (i % 3 === 0) R(px, py - 1, 1, 1, H); }
    if (k < 0.5) { R(x - 1, y - Math.round(k * 16), 2, Math.round(k * 16) + 2, H); R(x, y - Math.round(k * 16) - 1, 1, 2, '#ffffff'); }
  } else if (el === 'huo') { // 火：爆燃 + 黑烟 + 火星
    const rr = Math.round(3 + Math.sin(Math.min(1, k * 1.6) * Math.PI / 2) * 9);
    if (k < 0.75) { ctx.globalAlpha = a; ctx.fillStyle = pat(D, k < 0.4 ? 16 : 10); disc(x, y, rr, ctx.fillStyle); ctx.fillStyle = pat(M, k < 0.3 ? 16 : k < 0.55 ? 10 : 5); disc(x, y - 1, Math.max(1, rr - 2), ctx.fillStyle); if (k < 0.45) disc(x, y - 1, Math.max(1, rr - 5), H); if (k < 0.25) disc(x, y - 1, Math.max(1, rr - 7), '#ffffff'); }
    if (k > 0.35) { ctx.globalAlpha = (1 - k) * 0.7; for (const [dx, dy, s] of [[-5, -4, 4], [4, -6, 3], [0, -9, 4], [7, -1, 2]]) { ctx.fillStyle = pat('#3a2a34', 9); disc(x + dx, y + dy - Math.round((k - 0.35) * 12), s, ctx.fillStyle); } }
    ctx.globalAlpha = a; for (let i = 0; i < 9; i++) { const an = i * 0.7 + 0.2, d = 4 + k * (12 + (i % 3) * 4); R(x + Math.cos(an) * d, y + Math.sin(an) * d - k * 4, 1, 1 + (i % 2), i % 3 ? H : '#ffffff'); }
  } else { // 土：碎石迸溅 + 尘浪 + 地裂
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = pat(H, 7); ellipse(x, y + 5, Math.round(5 + k * 12), Math.round(2 + k * 3), ctx.fillStyle); ctx.fillStyle = pat(M, 4); ellipse(x, y + 4, Math.round(3 + k * 9), Math.round(2 + k * 4), ctx.fillStyle);
    ctx.globalAlpha = a; for (let i = 0; i < 8; i++) { const vx = (i - 3.5) * 3.6, px = Math.round(x + vx * k), py = Math.round(y - (8 + (i * 5 % 6)) * k * 2 + 24 * k * k), sz = 1 + (i % 3); R(px, py, sz + 1, sz, M); R(px, py, sz, 1, H); R(px + 1, py + sz - 1, sz, 1, D); }
    if (k < 0.6) { line(x, y + 2, x - 6, y + 6, D); line(x, y + 2, x + 7, y + 5, D); line(x - 2, y + 1, x - 1, y - 6, D); for (let i = 0; i < 6; i++) { const an = i * 1.05; line(x + Math.cos(an) * r * 0.4, y + Math.sin(an) * r * 0.4, x + Math.cos(an) * r, y + Math.sin(an) * r, i % 2 ? H : M); } }
  }
  ctx.restore();
};

// ---------- 七、反杀：戒指爆光 ----------
// ART.drawRingBurst(x, y, k 0～1) → 以戒指所在点 (x, y) 为心：0～0.25 金光向内聚拢、0.25～0.5 炸开（白芯、十二道金芒、闪屏）、之后光环扩散与金屑余辉。
// 约 20 帧播完（ART.ringBurstFrames = 20，k = 帧 / 19）；最大半径约 40，要盖过小人
ART.ringBurstFrames = 20;
ART.drawRingBurst = function (x, y, k) {
  x = Math.round(x); y = Math.round(y); k = Math.max(0, Math.min(1, k));
  ctx.save();
  if (k < 0.25) { // 聚拢
    const u = k / 0.25;
    glow(x, y, 4 + u * 8, '#fff2a8', 0.3 + u * 0.5);
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 + u * 1.4, d = 22 * (1 - u) + 3; ctx.globalAlpha = 0.4 + u * 0.6; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; R(px, py, 1, 1, i % 2 ? '#f4c542' : '#ffffff'); line(px, py, x + Math.cos(a) * (d + 4), y + Math.sin(a) * (d + 4), '#f4c542'); }
    ctx.globalAlpha = 1; ellipse(x, y, 3, 2, '#f4c542'); ellipse(x, y, 1, 1, '#fff2a8'); R(x - 1, y - 3 - Math.round(u * 2), 1, 1, '#ffffff'); if (u > 0.5) { R(x - 4, y, 9, 1, '#ffffff'); R(x, y - 4, 1, 9, '#ffffff'); }
    ctx.restore(); return;
  }
  const u = (k - 0.25) / 0.75, burst = k < 0.5, a = burst ? 1 : Math.max(0, 1 - (k - 0.5) * 2);
  if (k < 0.36) { ctx.globalAlpha = 0.45 * (1 - (k - 0.25) / 0.11); R(x - 220, y - 220, 440, 440, '#fff2a8'); }
  ctx.globalAlpha = 1; glow(x, y, 14 + u * 22, '#f4c542', 0.85 * (burst ? 1 : a));
  // 十二道金芒
  const len = burst ? 8 + (k - 0.25) / 0.25 * 30 : 38 + (k - 0.5) * 8;
  for (let i = 0; i < 12; i++) {
    const an = i * Math.PI / 6 + 0.13, big = i % 3 === 0, L2 = len * (big ? 1 : i % 3 === 1 ? 0.72 : 0.55), r0 = burst ? 3 : 3 + (k - 0.5) * 2 * L2 * 0.8, cx = Math.cos(an), sy = Math.sin(an);
    if (r0 >= L2) continue;
    ctx.globalAlpha = a * 0.85; line(x + cx * r0, y + sy * r0, x + cx * L2, y + sy * L2, '#f4c542', burst && big ? 3 : big ? 2 : 1);
    ctx.globalAlpha = a; line(x + cx * r0, y + sy * r0, x + cx * (r0 + (L2 - r0) * 0.6), y + sy * (r0 + (L2 - r0) * 0.6), burst ? '#ffffff' : '#fff2a8', 1);
  }
  // 扩散的光环
  const rr = 4 + u * 36; ctx.globalAlpha = Math.max(0, 1 - u * u);
  for (let i = 0; i < 40; i++) { const an = i * Math.PI / 20; R(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8, i % 4 ? 1 : 2, i % 4 ? 1 : 2, i % 2 ? '#f4c542' : '#fff2a8'); }
  if (u > 0.2) { const r2 = (u - 0.2) * 34; ctx.globalAlpha = Math.max(0, 0.8 - u); for (let i = 0; i < 24; i++) { const an = i * Math.PI / 12 + 0.1; R(x + Math.cos(an) * r2, y + Math.sin(an) * r2 * 0.8, 1, 1, '#ffffff'); } }
  // 白芯
  ctx.globalAlpha = 1; if (burst) { disc(x, y, Math.round(9 - (k - 0.25) * 12), '#fff2a8'); disc(x, y, Math.round(7 - (k - 0.25) * 12), '#ffffff'); } else if (a > 0.1) { const s = Math.round(1 + a * 4); R(x - s * 2, y, s * 4 + 1, 1, '#ffffff'); R(x, y - s * 2, 1, s * 4 + 1, '#ffffff'); disc(x, y, Math.max(1, s - 1), '#fff2a8'); }
  // 金屑：先迸出，再缓缓上浮
  for (let i = 0; i < 14; i++) { const an = i * 2.4 + 0.7, d = 6 + u * (14 + (i * 7 % 16)), px = Math.round(x + Math.cos(an) * d), py = Math.round(y + Math.sin(an) * d * 0.8 - u * u * (6 + i % 5 * 3)); ctx.globalAlpha = Math.max(0, 1 - u * (0.8 + (i % 3) * 0.1)); if (i % 4 === 0 && u < 0.8) { R(px - 1, py, 3, 1, '#fff2a8'); R(px, py - 1, 1, 3, '#fff2a8'); } else R(px, py, 1, 1 + (i % 2), i % 2 ? '#f4c542' : '#ffffff'); }
  ctx.restore();
};
// ---------- 八、首领对决小人 ----------
// ART.bossFighter(k 0～10, frame, flip) → 人形 48×40（锚点 21,39）、兽形 64×40（狼王 0 / 蛟皇 7 / 吞星 8，锚点 28,39）；面朝右，flip 朝左（锚点 x = w - 1 - ax）
// frame 同 ART.fighter：idle0 idle1 windup strike hit down 或 0～5。ART.bossFighterDims(k) → { w, h, ax, ay }
const BF_STEEL = tone('#aeb8c8', '#5a6480', '#eef4ff');
// 把立姿（以 x = 23.5 为中线画的）整体错切：上身随 lean 倾，脚不动；ox 为整体平移
function bfShear(src, lean, bob, ox, hop) {
  const o = new Buf(src.w, src.h);
  for (let y = src.h - 1; y >= 0; y--) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (!c) continue; o.p(x + ox + (y < 20 ? lean : Math.round(lean * (38 - y) / 18)), y + (y < 33 ? bob : 0) - hop, c); }
  return o;
}
// 仰面倒地：立姿逆时针放倒，头朝左
function bfLay(src) {
  const o = new Buf(src.w, src.h); let x0 = 99, y0 = 99;
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) if (src.d[y * src.w + x]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); }
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const c = src.d[y * src.w + x]; if (c) o.p(y - y0 + 2, 38 - (x - x0), c); }
  return o;
}
// 兵器。都画在图层 L 上：(x, y) 握点，(ux, uy) 指向，n 前伸长度
const BF_WPN = {
  sword(L, x, y, ux, uy, n, o) { o = o || {}; L.l(x - ux * 3, y - uy * 3, x, y, o.grip || WOOD, 2); L.l(x + ux * 2, y + uy * 2, x + ux * n, y + uy * n, o.c || BF_STEEL, 2); L.l(x + ux - uy * 3, y + uy + ux * 3, x + ux + uy * 3, y + uy - ux * 3, o.guard || GOLD, 2); },
  axe(L, x, y, ux, uy, n) { const hx = x + ux * (n - 4), hy = y + uy * (n - 4); L.e(hx - uy * 3 + 1, hy + ux * 3 + 1, 6, 6, BF_STEEL); L.e(hx + uy * 3 + 1, hy - ux * 3 + 1, 3, 3, BF_STEEL); L.l(x - ux * 5, y - uy * 5, x + ux * n, y + uy * n, WOOD, 2); },
  staff(L, x, y, ux, uy, n) { const C = tone('#c8323c', '#7a1a26', '#ff8a7a'); L.l(x - ux * 8, y - uy * 8, x + ux * n, y + uy * n, C, 2); for (const d of [-8, -6, n - 2, n]) L.r(Math.round(x + ux * d) - (d === n || d === -8 ? 1 : 0), Math.round(y + uy * d) - (d === n || d === -8 ? 1 : 0), d === n || d === -8 ? 4 : 2, d === n || d === -8 ? 4 : 2, GOLD); },
  halberd(L, x, y, ux, uy, n) { const C = tone('#8a2c34', '#5a1c2a', '#c85a52'), tx = x + ux * (n - 5), ty = y + uy * (n - 5); L.l(x - ux * 9, y - uy * 9, tx, ty, C, 2); L.e(tx - uy * 4 + 1, ty + ux * 4 + 1, 4.5, 4.5, BF_STEEL); L.e(tx - uy * 2 + 1 - ux, ty + ux * 2 + 1 - uy, 2.5, 2.5, null); L.l(tx, ty, x + ux * n, y + uy * n, BF_STEEL, 2); L.r(Math.round(tx - ux * 2), Math.round(ty - uy * 2), 3, 3, RED); },
  saber(L, x, y, ux, uy, n) { const C = tone('#c8323c', '#6a1420', '#ff9a8a'); L.l(x - ux * 3, y - uy * 3, x, y, '#2c2238', 2); for (let i = 2; i <= n; i++) { const k = i * i / 46; L.r(Math.round(x + ux * i - uy * k), Math.round(y + uy * i + ux * k), i > n - 3 ? 2 : 3, i > n - 3 ? 2 : 3, C); } L.l(x + ux - uy * 2, y + uy + ux * 2, x + ux + uy * 2, y + uy - ux * 2, GOLD, 2); },
  great(L, x, y, ux, uy, n) { const C = tone('#5a4a8a', '#221a3a', '#9a8ad0'); L.l(x - ux * 4, y - uy * 4, x, y, '#2c2238', 2); for (let i = 2; i <= n; i++) L.r(Math.round(x + ux * i) - 1, Math.round(y + uy * i) - 1, i > n - 2 ? 2 : 4, i > n - 2 ? 2 : 4, C); L.l(x + ux - uy * 4, y + uy + ux * 4, x + ux + uy * 4, y + uy - ux * 4, tone('#b8b0a0', '#6a6258', '#e8e0d0'), 2); },
  chaos(L, x, y, ux, uy, n) { const C = tone('#221a40', '#0e0a1e', '#5a3a9a'); for (let i = 0; i <= n; i++) { const k = (i % 4 < 2 ? 1 : -1) * (i > 2 && i < n - 1 ? 1 : 0); L.r(Math.round(x + ux * i - uy * k) - 1, Math.round(y + uy * i + ux * k) - 1, i > n - 3 ? 2 : 3, i > n - 3 ? 2 : 3, C); } },
};
const BF_WFX = { // 描完兵器后补的不受光细节
  great(b, x, y, ux, uy, n) { for (let i = 3; i < n - 1; i += 1) b.p(x + ux * i + uy * 0.4, y + uy * i - ux * 0.4, i % 3 ? '#e85aff' : '#ffd0ff'); },
  chaos(b, x, y, ux, uy, n) { const rb = ['#c27dff', '#4aa8ff', '#62d26f', '#f4e04a', '#ffb23f', '#ff6b6b']; for (let i = 2; i < n; i += 2) b.p(x + ux * i, y + uy * i, rb[(i >> 1) % 6]); b.p(x + ux * n, y + uy * n, '#ffffff'); },
  saber(b, x, y, ux, uy, n) { b.p(x + ux * n - uy * n * n / 46, y + uy * n + ux * n * n / 46, '#ffffff'); },
  staff(b, x, y, ux, uy, n) { b.p(x + ux * n, y + uy * n - 1, '#fff2a8'); },
};
// 持械手臂：按帧取握点与指向（已错切后的坐标，中线 x = 21）
function bfWield(b, S, P, lean) {
  const f = P.f, hw = S.hw, sh = S.sh || 21, sx = 20 + hw + lean, sy = sh + 2 + P.bob, len = S.wlen || 16;
  let hx, hy, ux, uy;
  if (f === 'down') { hx = 30; hy = 37; ux = 1; uy = 0; }
  else if (f === 'windup') { hx = sx + 3; hy = sy - 6; ux = -0.33; uy = -0.94; }
  else if (f === 'strike') { hx = sx + 5; hy = sy + 2; ux = 1; uy = 0; }
  else if (f === 'hit') { hx = sx + 1; hy = sh + 12; ux = 0.78; uy = 0.62; }
  else { hx = 21 + hw + 1; hy = sh + 12 + P.bob; ux = 0.26; uy = -0.966; }
  let n = len; if (ux > 0.05) n = Math.min(n, (45 - hx) / ux); if (uy < -0.05) n = Math.min(n, (hy - 2) / -uy); if (uy > 0.05) n = Math.min(n, (37 - hy) / uy); n = Math.floor(n);
  if (f === 'windup' || f === 'strike') b.add(L => L.l(sx - 1, sy - 1, hx - 1, hy - 1, S.sleeve, S.armTh || 3));
  b.add(L => BF_WPN[S.wpn](L, hx, hy, ux, uy, n, S.wopt));
  if (BF_WFX[S.wpn]) BF_WFX[S.wpn](b, hx, hy, ux, uy, n);
  if (f !== 'down') { b.r(Math.round(hx) - 1, Math.round(hy) - 1, 3, 3, S.hand); b.p(Math.round(hx) - 1, Math.round(hy) - 1, lerpC(S.hand, '#ffffff', 0.4)); }
  if (f === 'strike' && S.slash) { for (let i = 0; i < 9; i++) { const a = -1.1 + i * 0.27, r = 13; b.p(hx + 1 + Math.cos(a) * r * 0.9, hy + Math.sin(a) * r, i % 2 ? S.slash : '#ffffff'); } }
}
// 通用小人身：袍身梯形 + 垂手 + 靴
function bfBody(b, o) {
  const sh = o.sh || 21, hw = o.hw, hem = o.hem || hw + 1, bot = o.bot || 36;
  if (!o.noFeet) b.add(L => L.mir(T => T.r(19, 35, 4, 4, o.boot || '#2c2238')));
  b.add(L => { for (let y = sh; y <= bot; y++) { const w = Math.round(hw + (hem - hw) * (y - sh) / (bot - sh)); L.hl(24 - w, 23 + w, y, o.robe); } });
  if (!o.noArms) { b.add(L => L.mir(T => T.r(24 - hw - 2, sh + 1, o.aw || 3, o.al || 10, o.sleeve || o.robe))); b.mir(T => T.r(24 - hw - 2, sh + 1 + (o.al || 10), o.aw || 3, 2, o.hand)); }
}
const bfEyes = (b, y, P, c, x) => { x = x || 20; if (P.hurt) b.mir(T => { T.p(x - 1, y, INK); T.p(x, y + 1, INK); T.p(x + 1, y + 1, INK); T.p(x - 1, y + 2, INK); }); else { b.mir(T => { T.r(x, y, 2, 3, INK); if (c) T.r(x, y + 1, 2, 2, c); }); b.p(x, y, '#ffffff'); b.p(47 - x - 1, y, '#ffffff'); } };
// 沿折线画一条由粗到细的身体（蛟）
function bfTube(L, pts, r0, r1, c) { const n = pts.length - 1; for (let i = 0; i < n; i++) { const A = pts[i], B = pts[i + 1], m = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])); for (let j = 0; j <= m; j++) { const u = (i + j / m) / n, r = r0 + (r1 - r0) * Math.sin(u * Math.PI * 0.9 + 0.2); L.e(A[0] + (B[0] - A[0]) * j / m, A[1] + (B[1] - A[1]) * j / m, r, r, c); } } }
const BOSSF = [
  // 0 独眼狼王（64×40）
  { beast: 1, draw(b, P) {
    const F = tone('#8f8a9e', '#55506e', '#c8c4d8'), D = tone('#5a5572', '#34304a', '#7a7592'), M = tone('#d8d4e4', '#a09cb4', '#ffffff'), f = P.f, dw = f === 'down', st = f === 'strike';
    const ox = { windup: -3, strike: 5, hit: -3 }[f] || 0, cr = f === 'windup' ? 3 : dw ? 8 : st ? -2 : P.bob;
    const Hx = 45 + ox + ({ windup: -1, strike: 3, hit: -3 }[f] || 0), Hy = 18 + cr + ({ windup: 3, strike: 2, hit: -4, down: 6 }[f] || 0), by = 25 + cr;
    b.add(L => { const ty = f === 'windup' ? 30 : st ? 15 : dw ? 35 : 17 + P.bob * 2; L.l(13 + ox, by - 3, 5 + ox, ty, D, 4); L.e(6 + ox, ty + 1, 3, 3, D); });
    if (st) b.add(L => { L.l(17 + ox, by + 2, 9 + ox, 35, hs(F, 0.8), 3); L.l(40 + ox, by + 2, 49 + ox, 33, hs(F, 0.8), 3); });
    else if (!dw) { b.r(18 + ox, by + 3, 3, 35 - by, dn(F)); b.r(37 + ox, by + 3, 3, 35 - by, dn(F)); }
    b.add(L => {
      L.e(27 + ox, by, 13, 6.5, F); L.e(18 + ox, by, 7, 7, F); L.e(37 + ox, by - 1, 7.5, 7.5, F);
      if (st) { L.l(20 + ox, by + 3, 13 + ox, 36, F, 4); L.l(42 + ox, by + 3, 52 + ox, 35, F, 4); }
      else if (dw) { L.l(22, 35, 30, 37, F, 3); L.l(40, 35, 48, 37, F, 3); }
      else { L.r(21 + ox, by + 3, 4, 36 - by, F); L.r(41 + ox, by + 3, 4, 36 - by, F); }
    });
    if (st) { b.r(12 + ox, 36, 4, 2, M); b.r(52 + ox, 35, 4, 2, M); b.p(56 + ox, 35, '#ffffff'); b.p(56 + ox, 37, '#ffffff'); }
    else if (dw) { b.r(30, 37, 3, 2, M); b.r(48, 37, 3, 2, M); }
    else { b.r(21 + ox, 37, 5, 2, M); b.r(41 + ox, 37, 5, 2, M); }
    for (let x = 22; x < 34; x += 2) b.p(x + ox, by + 6, M);
    b.add(L => { L.e(38 + ox, by - 5, 6, 5.5, D); for (let i = 0; i < 6; i++) L.l(23 + ox + i * 3, by - 5, 21 + ox + i * 3, by - 10 - (i % 2) - (i > 3 ? 1 : 0), D, 3); });
    b.add(L => { L.l(Hx - 3, Hy - 4, Hx - 5, Hy - 10, F, 3); L.l(Hx + 1, Hy - 5, Hx + 2, Hy - 10, F, 2); L.e(Hx, Hy, 6.5, 5.5, F); for (let j = 0; j < 5; j++) L.hl(Hx + 3, Hx + 11 - (j === 0 || j === 4 ? 1 : 0), Hy - 1 + j, F); });
    b.hl(Hx + 5, Hx + 10, Hy + 2, M); b.r(Hx + 10, Hy - 1, 2, 2, INK); b.p(Hx - 3, Hy - 7, '#c8607e'); b.p(Hx - 3, Hy - 6, '#c8607e');
    b.l(Hx - 2, Hy - 5, Hx - 1, Hy, '#d8404a'); b.l(Hx - 1, Hy - 4, Hx + 4, Hy - 3, '#34304a');
    if (P.hurt) { b.p(Hx, Hy - 2, INK); b.p(Hx + 1, Hy - 1, INK); b.p(Hx + 2, Hy - 2, INK); } else { b.r(Hx, Hy - 2, 3, 2, INK); b.r(Hx + 1, Hy - 2, 2, 1, '#ff3a2a'); b.p(Hx + 2, Hy - 2, '#fff2a8'); }
    const op = { windup: 1, strike: 3, down: 1 }[f] || 0;
    if (op) { b.add(L => L.r(Hx + 3, Hy + 3 + op, 7, 2, F)); b.r(Hx + 4, Hy + 3, 6, op, '#8a1e2e'); b.p(Hx + 5, Hy + 3, '#ffffff'); b.p(Hx + 9, Hy + 3, '#ffffff'); if (op > 1) { b.p(Hx + 5, Hy + 4, '#ffffff'); b.p(Hx + 8, Hy + 2 + op, '#ffffff'); b.p(Hx + 6, Hy + 2 + op, '#ffffff'); } if (dw) b.r(Hx + 7, Hy + 4, 2, 2, '#f7a3bd'); }
    else { b.hl(Hx + 4, Hx + 10, Hy + 3, '#34304a'); b.p(Hx + 6, Hy + 3, '#ffffff'); b.p(Hx + 9, Hy + 3, '#ffffff'); }
  } },
  // 1 黑风寨主雷彪：红头巾、络腮胡、开山斧
  { hw: 10, wpn: 'axe', wlen: 17, armTh: 4, body(b, P) {
    const V = tone('#5e4836', '#3a2a22', '#8a6c4c'), sk = skinTone('#d9a47c'), K = hairTone('#1d1a24');
    this.sleeve = sk.s; this.hand = sk.s;
    bfBody(b, { hw: 10, hem: 9, robe: V, sleeve: sk.s, hand: sk.s, aw: 4, al: 10, boot: '#2a1c18' });
    b.add(L => L.sy(21, '34322', sk.s), { noHi: 1 }); b.hl(21, 26, 24, sk.S); b.r(14, 30, 20, 2, RED); b.r(22, 30, 4, 2, GOLD); b.add(L => L.mir(T => { T.e(15, 22, 3.5, 2.5, '#7a5a40'); T.e(19, 21.5, 2.5, 2, '#7a5a40'); }));
    b.add(L => L.e(24, 12, 9, 8, K)); b.add(L => L.e(24, 14, 8, 6.5, sk.s), { sep: 1, noHi: 1 });
    b.add(L => { L.sy(15, '8998764', K); L.r(21, 16, 6, 2, null); }); b.r(22, 17, 4, 1, '#f6f2fa'); b.hl(22, 25, 16, sk.M);
    b.mir(T => T.l(18, 11, 22, 12, K, 2)); bfEyes(b, 13, P);
    b.add(L => { L.r(15, 6, 18, 3, RED); L.l(33, 7, 37, 10, RED, 2); L.l(33, 8, 36, 14, RED, 2); }); b.r(22, 6, 4, 3, '#f4c542'); b.l(27, 12, 29, 15, sk.M);
  } },
  // 2 古墓尸王：官帽、镇尸符、平举双臂一跳一跳
  { hw: 8, hop: 1, body(b, P) {
    const Rb = tone('#42426a', '#24243e', '#6a6a94'), Hc = tone('#d8d8e2', '#9a98b0', '#ffffff'), sk = skinTone('#a9c4a2');
    b.add(L => L.r(15, 8, 18, 20, Hc));
    bfBody(b, { hw: 8, hem: 9, robe: Rb, noArms: 1, boot: '#17131f' });
    b.r(23, 21, 2, 16, '#c8a84a'); b.hl(15, 32, 36, '#c8a84a'); b.r(20, 25, 8, 6, '#c8a84a'); b.r(21, 26, 6, 4, '#3f6ec0'); b.r(23, 27, 2, 2, '#d8404a');
    b.add(L => L.e(24, 14, 7.5, 6.5, sk.s), { sep: 1, noHi: 1 });
    b.mir(T => { T.r(18, 13, 3, 3, '#2c3a30'); T.p(19, 14, P.hurt ? '#2c3a30' : '#8fffa0'); T.l(18, 18, 20, 19, sk.S); });
    b.m(21, 18, ['MMMMMM', 'wMwMwM'], { M: '#2c3a30', w: '#e8f0d8' });
    b.add(L => { L.r(16, 2, 16, 6, Rb); L.r(13, 7, 22, 2, Rb); L.r(22, 0, 4, 2, RED); }); b.hl(13, 34, 7, '#c8a84a'); b.r(23, 4, 2, 2, '#d8404a');
    b.add(L => L.r(22, 9, 4, 10, '#f4e08a'), { sep: 1, noHi: 1 }); for (const [x, y, w] of [[22, 10, 4], [23, 12, 2], [22, 14, 4], [23, 16, 2]]) b.r(x, y, w, 1, '#c8323c');
  }, arms(b, P, lean) {
    const f = P.f, Rb = '#42426a', sx = 24 + lean, y0 = 23 + P.bob - (P.f === 'idle1' ? 1 : 0), A = { windup: [-0.9, 10], strike: [0.05, 17], hit: [-1.3, 9] }[f] || [0, 13];
    for (const k of [0, 1]) { const a = A[0] + k * 0.12, n = A[1] - k, x1 = sx + k * 2 + Math.cos(a) * n, y1 = y0 + k * 4 + Math.sin(a) * n; b.add(L => L.l(sx + k * 2 - 1, y0 + k * 4 - 1, x1 - 1, y1 - 1, Rb, 4)); b.r(Math.round(x1), Math.round(y1) - 1, 3, 3, '#a9c4a2'); for (const d of [-1, 1]) b.p(x1 + 3, y1 + d, '#2c3a30'); b.p(x1 + 4, y1, '#2c3a30'); b.hl(Math.round(x1) - 2, Math.round(x1) - 2, Math.round(y1) - 1, '#c8a84a'); }
    if (f === 'strike') for (let i = 0; i < 3; i++) { b.l(41, 20 + i * 4, 46, 23 + i * 4, '#8fffa0'); b.p(46, 23 + i * 4, '#ffffff'); }
  } },
  // 3 赤炎猿王：火鬃、长臂、擎天棍
  { hw: 11, wpn: 'staff', wlen: 17, armTh: 4, body(b, P) {
    const F = tone('#d8502a', '#8a2a1a', '#ff9a4a'), S = skinTone('#f0c090');
    this.sleeve = F; this.hand = S.s;
    b.add(L => L.mir(T => { T.r(16, 32, 6, 5, F); T.r(15, 36, 7, 2, S.s); }));
    b.add(L => { L.e(24, 27, 11.5, 8.5, F); L.mir(T => { T.e(12, 23, 4, 4, F); T.r(9, 23, 5, 13, F); }); });
    b.mir(T => T.r(9, 35, 5, 3, S.s)); b.add(L => L.e(24, 28, 5.5, 5, S.s), { noHi: 1, sep: 1 }); b.hl(21, 26, 27, S.S); b.p(23, 30, S.S); b.p(24, 30, S.S);
    b.add(L => { for (let i = 0; i < 6; i++) L.e(13.5 + i * 4.2, 21 + Math.abs(i - 2.5) * 0.5, 2.6, 2.2, WHITE); });
    b.add(L => { L.e(24, 11, 10, 8.5, F); for (const [x, y] of [[9, 9], [12, 3], [18, 0], [24, -1], [30, 0], [36, 3], [39, 9], [8, 15], [40, 15]]) L.l(24 + (x - 24) * 0.5, 9, x, y + 1, F, 3); });
    for (const [x, y] of [[12, 3], [18, 0], [25, 0], [31, 0], [37, 3], [9, 9], [40, 9]]) { b.r(x, y + 1, 2, 2, '#f4c542'); b.p(x, y + 1, '#fff2a8'); }
    b.add(L => { L.sy(8, '5677776', S.s); L.e(24, 16, 6, 4, S.s); }, { sep: 1, noHi: 1 });
    b.add(L => L.r(17, 7, 14, 3, F)); b.mir(T => T.l(18, 10, 22, 11, '#8a2a1a'));
    if (P.hurt) bfEyes(b, 11, P); else { b.mir(T => { T.r(19, 11, 3, 2, INK); T.p(20, 11, '#f4c542'); }); }
    b.p(22, 14, S.M); b.p(25, 14, S.M); b.r(20, 16, 8, 2, '#5a1420'); b.p(20, 16, '#ffffff'); b.p(27, 16, '#ffffff'); b.r(22, 16, 4, 1, '#ffffff'); if (P.f === 'windup' || P.f === 'strike') b.r(21, 18, 6, 1, '#5a1420');
  } },
  // 4 血煞老魔：血色兜帽、白须、噬魂刃
  { hw: 9, wpn: 'saber', wlen: 16, slash: '#ff6b6b', body(b, P) {
    const Rb = tone('#5a1220', '#2a0810', '#8a2a34'), sk = skinTone('#d8c2c8');
    this.sleeve = Rb; this.hand = sk.s;
    bfBody(b, { hw: 9, hem: 12, bot: 37, robe: Rb, hand: sk.s, noFeet: 1, aw: 4, al: 11 });
    for (let x = 12; x < 36; x += 3) b.r(x + (x % 2), 37, 1, 1, null); b.r(23, 21, 2, 16, '#c8a84a'); b.mir(T => { for (let y = 24; y < 36; y += 3) T.p(15 - Math.round((y - 21) / 6), y, '#c8a84a'); });
    b.add(L => { L.e(24, 12.5, 10, 10, Rb); L.sy(0, '1234', Rb); L.mir(T => T.r(14, 18, 4, 5, Rb)); });
    b.add(L => L.e(24, 14, 7, 7.5, '#1a0a10'), { flat: 1 }); b.add(L => L.sy(9, '4566666665', sk.s), { noHi: 1 });
    b.mir(T => { T.l(19, 12, 22, 13, '#e8e0e8'); T.l(19, 16, 20, 18, sk.S); }); if (P.hurt) bfEyes(b, 13, P); else { b.mir(T => { T.r(20, 14, 2, 2, '#ff3a2a'); T.p(19, 14, INK); }); b.p(20, 14, '#fff2a8'); b.p(26, 14, '#fff2a8'); }
    b.m(21, 17, ['M....M', '.MwwM.'], { M: sk.M, w: '#f6f2fa' });
    b.add(L => L.sy(19, '322211', WHITE)); b.add(L => L.r(22, 28, 4, 4, WHITE)); b.p(22, 29, INK); b.p(25, 29, INK); b.r(23, 31, 2, 1, INK);
  } },
  // 5 剑冢守墓人：蒙眼布、灰发、背后插着残剑
  { hw: 8, wpn: 'sword', wlen: 17, wopt: { guard: tone('#8a7a5a', '#5a4a3a', '#b8a888'), grip: '#3a3440' }, slash: '#eef4ff', body(b, P) {
    const Rb = tone('#5a5a68', '#34343e', '#86869a'), Hc = hairTone('#9a98aa'), sk = skinTone('#d8b89a');
    this.sleeve = Rb; this.hand = sk.s;
    b.add(L => { L.l(15, 26, 9, 6, BF_STEEL, 2); L.l(31, 26, 37, 4, BF_STEEL, 2); L.l(28, 24, 31, 1, BF_STEEL, 2); L.l(6, 10, 12, 8, GOLD, 2); L.l(34, 8, 40, 9, WOOD, 2); L.l(28, 5, 34, 6, GOLD, 2); L.r(9, 3, 2, 4, WOOD); L.r(37, 1, 2, 4, WOOD); });
    b.add(L => { L.e(24, 12, 9, 8, Hc); L.r(15, 12, 18, 17, Hc); });
    bfBody(b, { hw: 8, hem: 9, robe: Rb, hand: sk.s, boot: '#22202a' });
    b.r(15, 30, 18, 2, '#34343e'); b.l(20, 21, 24, 26, '#b0b0c0'); b.l(27, 21, 24, 25, '#b0b0c0'); b.r(23, 26, 2, 4, '#e8e4d8');
    b.add(L => L.e(24, 14.5, 7, 6.5, sk.s), { sep: 1, noHi: 1 });
    b.add(L => { L.r(16, 12, 16, 4, '#e8e4d8'); L.l(32, 13, 38, 16 + P.bob, '#e8e4d8', 2); L.l(32, 14, 36, 21, '#e8e4d8', 2); }); b.hl(17, 30, 14, '#b8b4a8'); b.l(21, 12, 23, 15, '#b8b4a8');
    b.hl(22, 25, 18, sk.M); b.add(L => { L.mir(T => T.l(22, 17, 20, 19, Hc)); L.sy(20, '211', Hc); }); if (P.hurt) b.p(26, 19, '#d8404a');
  } },
  // 6 九幽魔将：重盔巨角、面甲后的魔火、阔刃
  { hw: 11, wpn: 'great', wlen: 18, armTh: 4, slash: '#e85aff', body(b, P) {
    const H = tone('#4c3c70', '#221a3a', '#8070b0'), B = tone('#b8b0a0', '#6a6258', '#e8e0d0'), Cp = tone('#3a1034', '#1e0820', '#6a2a5a');
    this.sleeve = H; this.hand = '#8070b0';
    b.add(L => { for (let y = 22; y <= 37; y++) { const w = Math.round(10 + (y - 22) * 0.35); L.hl(24 - w, 23 + w, y, Cp); } });
    b.add(L => L.mir(T => { T.r(17, 31, 6, 6, H); T.r(16, 36, 7, 2, H); }));
    bfBody(b, { hw: 9, hem: 9, bot: 33, robe: H, sleeve: H, hand: '#8070b0', noFeet: 1, aw: 4, al: 10 });
    b.add(L => L.mir(T => { T.e(12.5, 22.5, 5, 4, H); T.l(10, 20, 7, 15, B, 2); })); b.add(L => L.sy(22, '5665', '#8070b0')); b.r(23, 23, 2, 3, '#e85aff'); b.p(23, 23, '#ffd0ff');
    b.hl(15, 32, 29, '#221a3a'); b.r(22, 29, 4, 2, B); for (const x of [17, 21, 26, 30]) b.r(x, 31, 1, 3, '#221a3a');
    b.add(L => L.mir(T => { T.l(16, 8, 10, 6, B, 3); T.l(10, 6, 8, 0, B, 2); }));
    b.add(L => { L.e(24, 12, 9, 8.5, H); L.sy(16, '9987', H); }); b.add(L => L.sy(2, '1112', '#8070b0')); b.r(23, 1, 2, 3, '#e85aff');
    b.r(16, 12, 16, 3, INK); if (!P.hurt) b.mir(T => { T.r(18, 13, 4, 1, '#e85aff'); T.p(19, 13, '#ffd0ff'); T.p(17, 12, '#e85aff'); }); else b.mir(T => T.r(19, 13, 2, 1, '#8a3a9a'));
    for (let x = 19; x <= 28; x += 3) b.r(x, 16, 1, 4, INK); b.hl(15, 32, 11, '#8070b0');
  } },
  // 7 东海蛟皇（64×40）
  { beast: 1, draw(b, P) {
    const T0 = tone('#3fb0c8', '#1f6e8a', '#a8ecf4'), A = tone('#e8d49a', '#a88a4a', '#fff6d0'), Bl = tone('#e8f4c8', '#a8c090', '#ffffff'), f = P.f, dw = f === 'down';
    const hd = { windup: [-7, -1], strike: [9, 9], hit: [-8, -3] }[f] || [0, P.bob];
    const pts = dw ? [[3, 33], [10, 36], [19, 33], [28, 36], [37, 33], [45, 35]] : [[3, 26], [8, 34], [20, 35], [34, 35], [41, 30], [36, 24], [28, 21 + hd[1] * 0.2], [26 + hd[0] * 0.4, 13 + hd[1] * 0.5], [32 + hd[0] * 0.8, 8 + hd[1] * 0.8], [40 + hd[0], 9 + hd[1]]];
    const Hx = dw ? 51 : 45 + hd[0], Hy = dw ? 34 : 11 + hd[1];
    b.add(L => { for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], q2 = pts[i + 1]; L.l(p[0], p[1] - 4, (p[0] + q2[0]) / 2 - 1, (p[1] + q2[1]) / 2 - 7, RED, 2); L.r(Math.round(p[0]) - 1, Math.round(p[1]) - 5, 3, 3, RED); } L.l(3, pts[0][1], 0, pts[0][1] - 5, RED, 2); L.l(3, pts[0][1], 0, pts[0][1] + 3, RED, 2); });
    if (!dw) b.add(L => { L.l(31, 36, 31, 38, T0, 2); L.l(16, 36, 15, 38, T0, 2); }); if (!dw) { b.r(30, 38, 4, 1, A); b.r(14, 38, 4, 1, A); }
    b.add(L => bfTube(L, pts, 2.2, 4.6, T0));
    for (let y = 0; y < 40; y++) for (let x = 0; x < 64; x++) if (b.at(x, y) === T0 && (x + y * 2) % 5 === 0 && b.at(x, y + 1)) b.p(x, y, '#1f6e8a');
    if (!dw) for (let x = 10; x < 36; x += 2) if (b.at(x, 38)) b.p(x, 38, '#e8f4c8');
    b.add(L => { L.l(Hx - 3, Hy - 4, Hx - 8, Hy - 9, A, 2); L.l(Hx - 6, Hy - 7, Hx - 4, Hy - 11, A); L.l(Hx - 1, Hy - 4, Hx - 2, Hy - 9, A, 2); L.l(Hx - 2, Hy - 8, Hx + 2, Hy - 10, A); });
    b.add(L => { L.l(Hx - 5, Hy - 2, Hx - 9, Hy + 1, RED, 2); L.l(Hx - 5, Hy + 1, Hx - 8, Hy + 5, RED, 2); });
    b.add(L => { L.e(Hx, Hy, 6, 4.5, T0); for (let j = 0; j < 5; j++) L.hl(Hx + 3, Hx + 11 - (j === 0 ? 2 : j === 4 ? 1 : 0), Hy - 2 + j, T0); });
    const op = { windup: 1, strike: 3 }[f] || 0;
    b.add(L => { for (let j = 0; j < 2; j++) L.hl(Hx + 1, Hx + 9 - j, Hy + 3 + op + j, Bl); }); if (op) { b.r(Hx + 3, Hy + 3, 7, op, '#8a1e2e'); for (const dx of [4, 7, 9]) { b.p(Hx + dx, Hy + 3, '#ffffff'); if (op > 1) b.p(Hx + dx - 1, Hy + 2 + op, '#ffffff'); } } else for (const dx of [4, 7, 10]) b.p(Hx + dx, Hy + 3, '#ffffff');
    b.r(Hx + 10, Hy - 1, 1, 1, INK); b.l(Hx - 1, Hy - 3, Hx + 4, Hy - 2, '#1f6e8a');
    if (P.hurt) { b.p(Hx, Hy - 1, INK); b.p(Hx + 1, Hy, INK); b.p(Hx + 2, Hy - 1, INK); } else { b.r(Hx, Hy - 2, 3, 3, INK); b.r(Hx + 1, Hy - 1, 2, 2, '#f4c542'); b.p(Hx + 2, Hy - 1, INK); b.p(Hx + 1, Hy - 2, '#fff2a8'); }
    b.add(L => { L.l(Hx + 10, Hy + 1, Hx + 14, Hy + 4 + (P.bob ? 1 : 0), WHITE); L.l(Hx + 14, Hy + 4, Hx + 13, Hy + 9, WHITE); L.l(Hx + 9, Hy + 2, Hx + 11, Hy + 7, WHITE); }, { flat: 1, sep: 0 });
    if (f === 'strike') for (let i = 0; i < 4; i++) { b.p(Hx + 13 + i, Hy + 4 + (i % 2), '#a8ecf4'); b.p(Hx + 12 + i, Hy + 1 - i, '#ffffff'); }
  } },
  // 8 吞星巨兽（64×40）
  { beast: 1, draw(b, P) {
    const N = tone('#2a2860', '#141232', '#5a58a8'), f = P.f, dw = f === 'down';
    const ox = { windup: -3, strike: 6, hit: -3 }[f] || 0, cx = 27 + ox, ry = dw ? 7 : f === 'windup' ? 12 : 14 + (P.bob ? 0.5 : 0), rx = dw ? 21 : f === 'windup' ? 19 : 17, cy = 36 - ry - (dw ? -1 : 2);
    if (!dw) { b.add(L => { for (const x of [-10, 0, 9]) L.r(cx + x - 2, 34, 5, 4, N); L.l(cx - rx + 2, cy + 4, cx - rx - 5, cy + 8 + P.bob * 2, N, 3); L.l(cx - rx - 5, cy + 8 + P.bob * 2, cx - rx - 7, cy + 3, N, 2); }); for (const x of [-10, 0, 9]) b.r(cx + x - 2, 38, 5, 1, '#8a88d8'); }
    b.add(L => { L.e(cx, cy, rx, ry, N); if (!dw) spikes(L, cx - 2, cy, rx - 3, rx + 4, 9, N, 3, 2.2); for (let i = 0; i < 5; i++) L.l(cx - 10 + i * 4, cy - ry + 2, cx - 12 + i * 4, cy - ry - 3 + (i % 2), N, 3); });
    const r = seeded(8); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 64), y = Math.floor(r() * 40); if (b.at(x, y) === N) b.p(x, y, i % 4 ? '#8a88d8' : '#ffffff'); }
    const mo = { idle0: [9, 8], idle1: [9, 9], windup: [8, 3], strike: [12, 12], hit: [7, 4], down: [10, 1] }[f], mx = cx + rx - mo[0] + 2, my = cy + 2 + (dw ? 1 : 0);
    b.add(L => L.e(mx, my, mo[0], mo[1], '#0c0a1a'), { flat: 1, sep: 1 });
    if (mo[1] > 5) { b.e(mx + 1, my + 1, mo[0] * 0.5, mo[1] * 0.5, '#6a3aa8'); b.e(mx + 1, my + 1, mo[0] * 0.36, mo[1] * 0.36, '#f4c542'); b.e(mx + 1, my + 1, mo[0] * 0.18, mo[1] * 0.18, '#ffffff'); b.p(mx - 4, my - 3, '#fff2a8'); b.p(mx + 5, my + 4, '#c27dff'); }
    for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6 * 2 - 1, x = Math.round(mx + u * (mo[0] - 1.5)), hh = Math.round(Math.sqrt(1 - u * u) * mo[1]), tl = mo[1] > 5 ? 3 + (i % 2) : 2; b.r(x, my - hh, 2, Math.min(tl, hh + 1), '#ffffff'); b.r(x, my + hh - Math.min(tl, hh + 1) + 1, 2, Math.min(tl, hh + 1), '#e8e4f0'); }
    for (const [dx, dy, s] of [[-2, -9, 3], [6, -11, 4], [-9, -7, 2], [12, -8, 2], [-14, -2, 2]]) { const x = cx + dx, y = Math.round(cy + dy * ry / 14); if (P.hurt) b.r(x, y + 1, s, 1, INK); else { b.r(x, y, s, s - 1, INK); b.r(x, y, s - 1, s - 1, '#f4c542'); b.p(x, y, '#ffffff'); } }
    if (f === 'strike') for (const [dx, dy] of [[16, -6], [19, 2], [15, 8], [21, -2]]) { b.p(mx + dx - 6, my + dy, '#ffffff'); b.p(mx + dx - 4, my + dy, '#8a88d8'); }
  } },
  // 9 仙府傀儡王：金盔红缨、白面蓝瞳、机括光轮、天戟
  { hw: 9, wpn: 'halberd', wlen: 19, slash: '#7fe0f0', body(b, P) {
    const Gd = tone('#ecb43c', '#a8742a', '#fff2a8');
    this.sleeve = WHITE; this.hand = Gd;
    b.add(L => { L.e(24, 13, 14, 13, '#a8742a'); L.e(24, 13, 11.5, 10.5, null); spikes(L, 24, 13, 13, 16, 12, '#a8742a', 2, P.bob ? 0.26 : 0); }, { flat: 1 });
    b.add(L => L.mir(T => { T.r(19, 31, 3, 5, WHITE); T.r(18, 35, 5, 3, Gd); })); b.mir(T => T.r(19, 32, 3, 1, '#4aa8ff'));
    bfBody(b, { hw: 8, hem: 6, bot: 30, robe: Gd, sleeve: WHITE, hand: Gd, noFeet: 1, aw: 3, al: 10 });
    b.add(L => L.mir(T => T.e(14.5, 22.5, 3, 3, Gd))); b.add(L => L.sy(29, '79a', Gd)); b.hl(17, 30, 28, '#a8742a'); b.r(23, 23, 2, 2, '#4aa8ff'); b.p(23, 23, '#ffffff'); b.mir(T => { T.p(21, 25, '#a8742a'); T.r(14, 27, 3, 1, '#4aa8ff'); });
    b.add(L => L.sy(10, '566666665', WHITE), { sep: 1 });
    b.add(L => { L.e(24, 9, 8.5, 6.5, Gd); L.mir(T => T.r(15, 9, 3, 8, Gd)); L.r(18, 10, 12, 6, null); L.sy(9, '456', Gd); L.r(23, 12, 2, 2, Gd); });
    b.add(L => L.sy(0, '12221', RED)); b.r(23, 6, 2, 2, '#4aa8ff');
    if (P.hurt) bfEyes(b, 13, P); else b.mir(T => { T.r(19, 14, 3, 2, INK); T.r(20, 14, 2, 1, '#4aa8ff'); }); b.mir(T => T.r(20, 16, 1, 3, '#d8404a')); b.hl(23, 24, 18, '#b4b0cc');
  } },
  // 10 混沌魔神残影：只剩轮廓、一双眼与七色裂痕，下身散成烟
  { hw: 10, wpn: 'chaos', wlen: 17, armTh: 4, ghost: 1, body(b, P) {
    const K = tone('#221a40', '#0e0a1e', '#5a3a9a');
    this.sleeve = K; this.hand = '#5a3a9a';
    b.add(L => { L.e(24, 25, 12, 6.5, K); L.sy(27, 'ccbbaa998765', K); L.e(24, 12, 7.5, 8, K); L.mir(T => { T.l(18, 7, 13, 2, K, 3); T.l(13, 2, 14, 0, K, 2); T.l(12, 22, 6, 17, K, 3); T.r(9, 24, 4, 11, K); T.l(9, 35, 8, 37, K, 2); }); });
    if (P.hurt) b.mir(T => T.r(19, 12, 3, 1, '#c27dff')); else b.mir(T => { T.r(18, 11, 4, 2, '#ffffff'); T.p(17, 10, '#c27dff'); T.p(22, 13, '#c27dff'); });
    for (let x = 20; x <= 27; x++) b.p(x, 16 + (x % 2), x % 3 ? '#ffffff' : '#c27dff');
    b.l(24, 21, 21, 28, '#c27dff'); b.l(21, 28, 23, 35, '#4aa8ff'); b.l(27, 22, 30, 27, '#ff6b6b'); b.l(30, 27, 28, 32, '#ffb23f'); b.l(17, 23, 15, 29, '#62d26f'); b.l(32, 29, 33, 33, '#f4e04a');
  } },
];
// 画首领小人时登记的材质色阶不外泄（免得别的精灵因绘制先后不同而变色）
function bfKeep(fn) {
  const sv = [new Map(dnMap), new Map(upMap), new Map(upRev)], sd = new Set(derived);
  try { return fn(); } finally { [dnMap, upMap, upRev].forEach((m, i) => { m.clear(); sv[i].forEach((v, k2) => m.set(k2, v)); }); derived.clear(); sd.forEach(v => derived.add(v)); }
}
const BF_WIDE = { w: 64, h: 40, ax: 28, ay: 39 }, BF_MAN = { w: 48, h: 40, ax: 21, ay: 39 };
ART.dims.bossFighter = BF_MAN; ART.dims.bossFighterWide = BF_WIDE;
ART.bossFighterDims = k => BOSSF[Math.max(0, Math.min(10, k | 0))].beast ? BF_WIDE : BF_MAN;
ART.bossFighter = function (k, frame, flip) {
  k = Math.max(0, Math.min(BOSSF.length - 1, k | 0));
  if (typeof frame === 'number') frame = FIGHT_FRAMES[frame]; if (!FIGHT_FRAMES.includes(frame)) frame = 'idle0';
  return cached('bf|' + k + frame + (flip ? 1 : 0), () => bfKeep(() => {
    const S = BOSSF[k], P = { f: frame, bob: frame === 'idle1' ? 1 : 0, hurt: frame === 'hit' || frame === 'down' };
    let b;
    if (S.beast) { b = new Buf(64, 40); S.draw(b, P); }
    else {
      const src = new Buf(48, 40), lean = { windup: -2, strike: 3, hit: -3 }[frame] || 0; S.body(src, P);
      if (frame === 'down') { b = bfLay(src); if (S.wpn) bfWield(b, S, P, 0); }
      else { b = bfShear(src, lean, S.hop ? 0 : P.bob, -3, S.hop && P.bob ? 1 : 0); if (S.arms) S.arms(b, P, lean); else bfWield(b, S, P, lean); }
    }
    let c = b.cv(k === 10 ? {} : { max: 16 });
    if (S.ghost) { const g = c.getContext('2d'); g.globalCompositeOperation = 'destination-out'; for (let y = 0; y < 40; y++) for (let x = 0; x < 48; x++) { const lv = frame === 'down' ? 3 + Math.sin(x * 0.7 + y) * 2 + (x > 30 ? (x - 30) * 0.5 : 0) : (y - 29) * 1.5 + Math.sin(x * 0.9 + y * 0.5) * 2.5; if (BAYER[(x & 3) + (y & 3) * 4] < lv) g.fillRect(x, y, 1, 1); } }
    if (!flip) return c;
    const fc = mk(c.width, c.height), fg = fc.getContext('2d'); fg.translate(c.width, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); return fc;
  }));
};

// ====================================================================
// 阶段五·面板补缺（接口见 docs/ART_API.md “阶段五·面板补缺”）
// ====================================================================
{
  const RB5 = ['#ff6b6b', '#ffb23f', '#f4e04a', '#62d26f', '#4aa8ff', '#c27dff'];
  // ---------- 一、首领材料 16×16：ART.bossMat(k 0～10)，顺序同 L.BOSS_MAT ----------
  const BMAT = [
    b => b.m(1, 1, ['....rr.rr', '...r.yyy.r', '....yhyyY', '....nnnnN', '....nwnnN', '....nwnnN', '.....nwnN', '.....nwnN', '......nnN', '......nwN', '.......nN', '.......NN', '........N'], IPAL), // 狼王牙：金箍红绳的獠牙
    b => b.m(1, 1, ['.....oo', '....yyyy', '...ySSSSy', '..ySsssSSY', '..ySsrrsSY', '..ySrrrrSY', '..ySsrrsSY', '..ySsrrsSY', '..ySssssSY', '...YSSSSY', '....YYYY', '.....rr', '....rRrR', '....r.rR'], IPAL), // 寨主令：铁牌朱字红穗
    b => { // 尸王玉：带尸斑的青玉璧
      b.add(L => L.e(8, 8, 6, 6, tone('#8fd8a8', '#3f8a6a', '#d8ffe0'))); b.e(8, 8, 1.6, 1.6, null);
      for (const [x, y] of [[4, 6], [5, 5], [6, 4]]) b.p(x, y, '#ffffff'); for (const [x, y] of [[10, 5], [11, 6], [11, 7], [5, 10], [6, 11], [7, 12]]) b.p(x, y, '#2f8e4b'); for (const [x, y] of [[10, 10], [11, 10], [10, 11], [4, 8]]) b.p(x, y, '#6a3aa8');
    },
    b => { // 猿王心：燃着的赤心
      b.m(2, 4, ['.rrr...rrr', 'rpprr.rrrrR', 'rprrrrrrrrR', 'rrrryrrrrRR', 'rrryyyrrrRR', '.rrryrrrRR', '..rrrrrRR', '...rrrRR', '....rRR', '.....R'], IPAL);
      b.m(2, 1, ['...y....y', '..yo...yoy', '..oyo.oyo', '.o.o...o.o'], Object.assign({}, IPAL, { o: '#ffb23f', y: '#fff2a8' }));
    },
    b => { // 血魔珠：血珠里一道黑旋，底下滴血
      b.add(L => L.e(8, 7, 5.5, 5.5, tone('#c8283a', '#6a0c1e', '#ff8a7a')));
      for (const [x, y] of [[7, 5], [8, 5], [9, 6], [10, 7], [9, 9], [8, 10], [7, 9], [6, 8], [7, 7], [8, 7]]) b.p(x, y, '#4a0814'); b.p(5, 4, '#ffffff'); b.p(6, 4, '#ffffff'); b.p(5, 5, '#ffffff');
      b.r(6, 13, 1, 2, '#c8283a'); b.p(10, 13, '#c8283a'); b.p(8, 14, '#8a1e2e');
    },
    b => b.m(1, 1, ['...........w', '..c.......wc', '.........wcC', '........wcC', '....c..wcC', '......wcC..c', '.....wcC', '..c.wcC', '...dcC...c', '..d.d', '.d...d', 'd..d'], IPAL), // 守墓剑意：一缕青色剑芒
    b => b.m(1, 1, ['......vV', '.......vV', '.......vvV', '........vvV', '........vsvV', '........vsvV', '.......vsvvV', '......yhyyyY', '.....vsvvvVV', '...vvsvvvVV', '..vssvvvVV', '.yhyyyyYY', '.VVVVVV'], IPAL), // 魔将角：箍金环的弯角
    b => { // 蛟皇鳞：扇形青鳞
      b.add(L => L.sy(2, '245666665431', tone('#41aaca', '#1f5e8a', '#a8f0ff'), 8));
      for (let y = 3; y <= 12; y++) b.p(8, y, '#d8fbff'); for (const [x, y] of [[5, 5], [4, 7], [5, 9], [6, 11], [11, 5], [12, 7], [11, 9], [10, 11]]) b.p(x, y, '#1f6e8a'); for (const [x, y] of [[6, 4], [5, 6], [6, 8]]) b.p(x, y, '#ffffff'); b.r(7, 13, 2, 1, '#f4c542');
    },
    b => { // 噬星核：黑核金芯，裂纹透紫
      b.add(L => L.e(8, 8, 5.5, 5.5, tone('#3a2a6a', '#1a1238', '#7a5ac8')));
      b.e(8, 8, 2, 2, '#f4c542'); b.r(7, 7, 2, 2, '#fff2a8'); b.p(7, 7, '#ffffff');
      for (const [x, y] of [[5, 5], [4, 4], [11, 5], [12, 4], [5, 11], [11, 11], [12, 12], [8, 4], [8, 12], [4, 9]]) b.p(x, y, '#c27dff');
    },
    b => { // 傀儡芯：铜齿轮嵌青晶
      b.add(L => { L.e(8, 8, 5, 5, '#b98a4c'); for (const [x, y] of [[7, 1], [7, 13], [1, 7], [13, 7], [3, 3], [11, 3], [3, 11], [11, 11]]) L.r(x, y, 2, 2, '#b98a4c'); });
      b.add(L => L.e(8, 8, 2.6, 2.6, '#1f6e8a'), { flat: 1, sep: 1 }); b.r(7, 7, 2, 2, '#7fe0f0'); b.p(7, 7, '#ffffff'); b.p(5, 4, '#fff2a8'); b.p(4, 5, '#fff2a8');
    },
    b => { // 混沌尘：一撮灰尘，上头旋着七彩微光
      b.add(L => L.sy(9, '235677', tone('#706c8a', '#3a3650', '#a8a4b8'), 8));
      [[5, 12], [8, 10], [10, 13], [6, 14], [11, 11], [8, 13], [3, 13], [12, 13]].forEach(([x, y], i) => b.p(x, y, RB5[i % 6]));
      [[8, 8], [9, 7], [10, 6], [10, 5], [10, 4], [9, 3], [8, 2], [7, 2], [6, 3], [5, 4], [5, 5], [6, 6], [7, 6], [8, 5]].forEach(([x, y], i) => b.p(x, y, i > 11 ? '#ffffff' : lerpC(RB5[(i / 2 | 0) % 6], '#c8c4d8', 0.35)));
    },
  ];
  ART.bossMatCount = BMAT.length;
  ART.bossMat = function (k) { k = Math.max(0, Math.min(BMAT.length - 1, k | 0)); return cached('bmat|' + k, () => { const b = new Buf(16, 16); BMAT[k](b); return b.cv(); }); };

  // ---------- 二、16×16 图标：丹囊 danbag、宗主建设 sb_ward / sb_lib / sb_vein、宗门任务 task ----------
  Object.assign(ICONS, {
    danbag: '....o....o/....oO..oO/.....oooO/....yyhyyY/.....jjjJ/...jjjjjjjJ/..jjljjjjjjJ/..jljjwwjjjJ/..jjjwrrwjJJ/..jjjwrRwjJJ/..jjjjwwjjJJ/...jjjjjjJJ/....JJJJJJ',
    sb_lib: '......yy/.....bbbb/...bbbbbbbb/..bBBBBBBBBb/....nnnnnn/....nOnnOn/..bbbbbbbbbb/.bBBBBBBBBBBb/...nnnnnnnn/...nOnyynOn/...nOnyynOn/..ssssssssss/.SSSSSSSSSSSS',
  });
  const ICON5 = {
    sb_ward: b => { // 护山大阵：青色光罩扣住一座山
      b.add(L => L.sy(6, '123456677', tone('#5c84ac', '#34507a', '#a8c8e8'), 8)); b.p(7, 6, '#ffffff'); b.r(7, 7, 2, 1, '#ffffff'); b.p(6, 8, '#ffffff');
      for (let i = 0; i <= 24; i++) { const a = Math.PI + i * Math.PI / 24, x = Math.round(7.5 + Math.cos(a) * 6.5), y = Math.round(10 + Math.sin(a) * 9); b.p(x, y, i % 4 === 2 ? '#ffffff' : '#7fe0f0'); }
      b.r(1, 10, 1, 4, '#7fe0f0'); b.r(14, 10, 1, 4, '#3fa8c8'); b.p(1, 14, '#f4c542'); b.p(14, 14, '#f4c542'); b.r(7, 1, 2, 1, '#fff2a8');
    },
    sb_vein: b => { // 灵脉：山岩里一道发光的脉，冒出灵晶
      b.add(L => L.sy(5, '2345667777', tone('#706c8a', '#3a3650', '#a8a4b8'), 8));
      b.add(L => { L.r(7, 1, 2, 5, '#7fe0f0'); L.r(9, 3, 1, 3, '#7fe0f0'); L.r(6, 4, 1, 2, '#7fe0f0'); });
      for (const [x0, y0, x1, y1] of [[8, 6, 6, 8], [6, 8, 9, 11], [9, 11, 7, 14]]) { b.l(x0 + 1, y0, x1 + 1, y1, '#3fa8c8'); b.l(x0, y0, x1, y1, '#7fe0f0'); }
      b.p(6, 8, '#ffffff'); b.p(9, 11, '#ffffff'); b.p(7, 2, '#ffffff'); b.p(7, 3, '#ffffff'); b.l(4, 11, 5, 12, '#3fa8c8'); b.l(11, 8, 12, 10, '#3fa8c8');
    },
    task: b => { // 宗门任务：贴着差事的告示牌
      b.add(L => { L.r(3, 10, 2, 5, '#7a5230'); L.r(11, 10, 2, 5, '#7a5230'); });
      b.add(L => L.r(1, 2, 14, 9, '#b98a4c')); b.r(1, 1, 14, 1, '#7a5230'); b.p(1, 1, null); b.p(14, 1, null);
      b.r(3, 4, 5, 6, '#efe3c4'); b.hl(4, 6, 6, '#55506e'); b.hl(4, 5, 8, '#55506e'); b.p(5, 4, '#d8404a'); b.r(7, 9, 1, 1, '#c8b48c');
      b.r(9, 3, 4, 5, '#fff2a8'); b.hl(10, 11, 5, '#a8742a'); b.p(10, 3, '#d8404a'); b.r(10, 6, 2, 2, '#d8404a');
    },
    // 展开箭头 10×10：fold_closed ▶ / fold_open ▼
    fold_closed: b => { for (let i = 0; i < 4; i++) b.r(3 + i, 1 + i, 1, 8 - i * 2, i ? '#f4c542' : '#fff2a8'); b.p(3, 8, '#a8742a'); b.p(4, 7, '#a8742a'); b.p(5, 6, '#a8742a'); b.p(6, 5, '#a8742a'); },
    fold_open: b => { for (let i = 0; i < 4; i++) b.r(1 + i, 3 + i, 8 - i * 2, 1, i ? '#f4c542' : '#fff2a8'); b.p(8, 3, '#a8742a'); b.p(7, 4, '#a8742a'); b.p(6, 5, '#a8742a'); b.p(5, 6, '#a8742a'); },
  };
  const icon4 = ART.icon;
  ART.icon = function (name) {
    if (!ICON5[name]) return icon4(name);
    return cached('ic5|' + name, () => { const s = name.startsWith('fold_') ? 10 : 16, b = new Buf(s, s); ICON5[name](b); return b.cv(); });
  };
  const names4 = ART.iconNames; ART.iconNames = () => names4().concat(['sb_ward', 'sb_vein', 'task']);
  ART.sectBuildIcon = k => ART.icon({ ward: 'sb_ward', lib: 'sb_lib', vein: 'sb_vein' }[k] || 'sb_ward');

  // ---------- 三、“新”角标 10×10：朱印 + 白色叹号 ----------
  ART.newBadge = () => cached('newbadge', () => {
    const b = new Buf(10, 10); b.add(L => L.e(5.5, 4.5, 3.5, 3.5, tone('#da424c', '#8a1e2e', '#ff8a7a')));
    b.r(5, 2, 1, 3, '#ffffff'); b.p(5, 6, '#ffffff'); b.p(6, 2, '#fff2a8');
    return b.cv();
  });

  // ---------- 四、品阶底框：ART.qualityCell(tier 1～7, size 16 | 36) ----------
  // tier 1～6 对应 ART.qualityColor(1～6)，7 为七彩；暗底、品阶色描边、底部一抹品阶色的光
  ART.qualityCell = function (tier, size) {
    tier = Math.max(1, Math.min(7, tier | 0)); const s = size >= 24 ? 36 : 16, big = s === 36;
    return cached('qcell|' + tier + '|' + s, () => on(mk(s, s), () => {
      const n = s - 1, q = i => tier === 7 ? RB5[(((i + s) / (big ? 5 : 3)) | 0) % 6] : QCOL[tier - 1], q0 = tier === 7 ? '#c8a8e8' : QCOL[tier - 1];
      const bg = lerpC('#1a1528', q0, 0.16), k = big ? 2 : 1;
      R(1, 0, s - 2, s, INK); R(0, 1, s, s - 2, INK); R(k, k, s - k * 2, s - k * 2, bg);
      // 底部的光（越靠下越亮）
      if (big) { for (let y = 0; y < 14; y++) for (let x = 3; x < n - 2; x++) dR(x, n - 3 - y, 1, 1, q(x), Math.round((14 - y) / 14 * 7)); }
      else [0.5, 0.3, 0.14].forEach((f, y) => { for (let x = 2; x < n - 1; x++) R(x, n - 2 - y, 1, 1, lerpC(bg, q(x), f)); });
      R(k + 1, k + 1, s - k * 2 - 2, 1, lerpC(bg, '#ffffff', 0.1));
      // 描边：上、左亮，下、右暗
      for (let i = 1; i < n; i++) for (let j = 0; j < k; j++) {
        if (big && j === 0 && (i < 2 || i > n - 2)) continue;
        R(i, 1 + j - (big ? 0 : 0), 1, 1, j || !big ? q(i) : lerpC(q(i), '#ffffff', 0.45)); R(i, n - 1 - j, 1, 1, hs(q(i), j || !big ? 0.8 : 0.6));
        R(1 + j, i, 1, 1, j || !big ? q(i) : lerpC(q(i), '#ffffff', 0.45)); R(n - 1 - j, i, 1, 1, hs(q(i), j || !big ? 0.8 : 0.6));
      }
      for (const [x, y] of [[1, 1], [n - 1, 1], [1, n - 1], [n - 1, n - 1]]) R(x, y, 1, 1, INK);
      if (!big) { for (const [x, y] of [[2, 2], [n - 2, 2], [2, n - 2], [n - 2, n - 2]]) R(x, y, 1, 1, tier >= 4 ? lerpC(q(x), '#ffffff', 0.6) : hs(q(x), 0.8)); return; }
      for (const [x, y] of [[2, 2], [n - 2, 2], [2, n - 2], [n - 2, n - 2]]) R(x, y, 1, 1, INK);
      // 36：内圈细线 + 四角折角；四档起角上嵌钉，五档起四边中点有菱
      R(4, 4, s - 8, 1, hs(q0, 0.45)); R(4, n - 4, s - 8, 1, hs(q0, 0.45)); R(4, 4, 1, s - 8, hs(q0, 0.45)); R(n - 4, 4, 1, s - 8, hs(q0, 0.45));
      for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        const X = sx ? n - 4 : 4, Y = sy ? n - 4 : 4, dx = sx ? -1 : 1, dy = sy ? -1 : 1, c = q(X);
        if (tier >= 2) { R(Math.min(X, X + dx * 4), Y, 5, 1, c); R(X, Math.min(Y, Y + dy * 4), 1, 5, c); }
        if (tier >= 4) { R(X + (sx ? -1 : 0), Y + (sy ? -1 : 0), 2, 2, lerpC(c, '#ffffff', 0.7)); R(X + dx * 2, Y + dy * 2, 1, 1, c); }
      }
      if (tier >= 5) for (const [x, y] of [[18, 3], [18, n - 4], [3, 18], [n - 4, 18]]) { const c = q(x + y); R(x - 2, y, 4, 2, INK); R(x - 1, y - 1, 2, 4, INK); R(x - 1, y, 2, 2, lerpC(c, '#ffffff', 0.6)); }
      if (tier >= 6) for (const [x, y] of [[8, 8], [n - 8, 8], [8, n - 8], [n - 8, n - 8]]) R(x, y, 1, 1, lerpC(q(x), '#ffffff', 0.5));
    }));
  };
  ART.qualityCellSizes = [16, 36];

  // ---------- 五、空状态淡墨小画（追加 kind）：pill 还没有丹方 / scroll 任务都做完了 / gift 没东西可送 / gavel 等下一场拍卖 ----------
  const box5 = (x, y, w, h, I, fill) => { R(x, y, w, h, fill === undefined ? I[4] : fill); R(x, y, w, 1, I[0]); R(x, y + h - 1, w, 1, I[0]); R(x, y, 1, h, I[0]); R(x + w - 1, y, 1, h, I[0]); };
  Object.assign(EMPTY, {
    // 冷掉的丹炉、掀在一旁的炉盖、一张空白的方子
    pill(I) {
      dR(4, 41, 40, 5, I[3], 6);
      for (const x of [12, 28]) { R(x, 36, 2, 7, I[0]); R(x - 1, 42, 4, 1, I[0]); } R(20, 38, 2, 5, I[1]);
      ellipse(21, 30, 11, 8, I[0]); ellipse(21, 30, 10, 7, I[4]); dR(12, 31, 19, 6, I[3], 8); dR(24, 25, 7, 10, I[2], 5);
      R(10, 29, 23, 1, I[1]); for (const x of [13, 17, 21, 25, 29]) R(x, 31, 1, 1, I[0]);
      R(9, 20, 25, 3, I[0]); R(10, 21, 23, 1, I[2]); R(12, 22, 19, 1, I[1]);
      for (const x of [7, 34]) { R(x, 16, 2, 6, I[0]); R(x === 7 ? 9 : 33, 16, 1, 1, I[0]); }
      R(18, 26, 6, 1, I[1]); R(20, 25, 2, 3, I[1]);
      ellipse(39, 42, 6, 2, I[0]); ellipse(39, 41, 5, 1, I[4]); R(38, 38, 3, 2, I[0]); R(39, 37, 1, 1, I[1]);
      for (const [x, y] of [[20, 16], [22, 13], [20, 10], [23, 7]]) R(x, y, 1, 1, I[2]);
      box5(31, 3, 13, 12, I); if (I[4] === '#f6ecd0') R(42, 3, 2, 2, '#efe3c4'); else ctx.clearRect(42, 3, 2, 2); line(41, 3, 43, 5, I[0]); for (const y of [6, 8, 10]) dR(33, y, y === 10 ? 5 : 8, 1, I[2], 6); R(40, 11, 2, 2, I[5]);
    },
    // 告示牌上的差事都揭完了，只剩钉子和一张打了勾的
    scroll(I) {
      dR(3, 42, 42, 4, I[3], 6);
      for (const x of [8, 38]) { R(x, 9, 2, 35, I[0]); R(x - 1, 43, 4, 1, I[1]); }
      R(4, 8, 40, 2, I[0]); R(6, 6, 36, 2, I[1]); R(5, 7, 1, 1, I[0]); R(42, 7, 1, 1, I[0]); R(3, 9, 1, 2, I[0]); R(44, 9, 1, 2, I[0]);
      box5(10, 13, 28, 21, I); dR(11, 14, 26, 19, I[3], 5);
      for (const [x, y] of [[14, 16], [33, 17], [15, 28], [32, 29]]) { R(x, y, 1, 1, I[0]); R(x + 1, y + 1, 1, 1, I[2]); }
      R(13, 17, 4, 1, I[2]); R(13, 18, 2, 1, I[2]); line(31, 30, 34, 32, I[2]);
      box5(20, 17, 10, 12, I, I[4]); R(24, 17, 2, 1, I[5]); for (const y of [20, 26]) R(22, y, 6, 1, I[2]);
      line(22, 23, 24, 25, I[5]); line(24, 25, 28, 21, I[5]); line(22, 24, 24, 26, I[5]);
      for (const [x, y] of [[13, 41], [34, 42], [42, 40]]) { R(x, y, 1, 3, I[2]); R(x + 1, y - 1, 1, 3, I[1]); R(x + 2, y + 1, 1, 2, I[2]); }
      for (const [x, y] of [[40, 3], [45, 15]]) { R(x, y, 2, 1, I[1]); R(x + 2, y + 1, 1, 1, I[1]); R(x + 3, y, 2, 1, I[1]); }
    },
    // 打开的空礼盒、松开的缎带、飞走的蛾子
    gift(I) {
      dR(3, 41, 42, 5, I[3], 6);
      line(11, 27, 15, 21, I[0]); line(34, 27, 38, 21, I[0]); R(15, 21, 24, 1, I[0]); dR(14, 22, 23, 5, I[2], 6); dR(16, 22, 21, 2, I[1], 7);
      box5(11, 27, 24, 15, I); dR(12, 34, 22, 7, I[3], 6); line(35, 27, 38, 21, I[1]); line(35, 41, 38, 35, I[0]); R(38, 21, 1, 15, I[0]); dR(36, 24, 2, 14, I[2], 9);
      R(22, 28, 2, 13, I[5]); R(12, 33, 22, 1, I[5]);
      for (const [x0, y0, x1, y1] of [[22, 27, 18, 24], [18, 24, 14, 26], [24, 27, 29, 23], [29, 23, 32, 25]]) line(x0, y0, x1, y1, I[5]);
      line(7, 39, 3, 36, I[5]); line(3, 36, 6, 33, I[5]); line(7, 39, 10, 41, I[5]);
      box5(38, 38, 9, 4, I); R(37, 37, 11, 2, I[0]); R(38, 38, 9, 1, I[2]); R(42, 37, 2, 5, I[5]);
      for (const [x, y] of [[27, 17], [29, 13], [27, 10], [30, 7]]) R(x, y, 1, 1, I[2]);
      R(32, 4, 1, 2, I[0]); R(30, 2, 2, 2, I[1]); R(33, 2, 2, 2, I[1]); R(29, 3, 1, 2, I[0]); R(35, 3, 1, 2, I[0]); R(31, 4, 1, 1, I[2]); R(33, 4, 1, 1, I[2]);
      for (const [x, y] of [[8, 14], [42, 12], [6, 24]]) R(x, y, 1, 1, I[2]);
    },
    // 搁在醒木上的拍卖槌、还在漏的沙漏
    gavel(I) {
      dR(3, 41, 42, 5, I[3], 6);
      box5(6, 37, 22, 5, I); dR(7, 39, 20, 2, I[3], 8); R(8, 36, 18, 1, I[1]);
      box5(9, 26, 16, 10, I, I[2]); dR(10, 31, 14, 4, I[1], 7); R(11, 26, 2, 10, I[0]); R(21, 26, 2, 10, I[0]); R(10, 27, 14, 1, I[4]);
      line(23, 29, 35, 15, I[0], 2); line(24, 29, 35, 16, I[1]); R(34, 13, 4, 4, I[0]); R(35, 14, 2, 2, I[2]);
      R(32, 26, 13, 2, I[0]); R(32, 42, 13, 2, I[0]); R(33, 28, 1, 14, I[1]); R(43, 28, 1, 14, I[1]);
      for (let i = 0; i < 7; i++) { const w = Math.max(1, 4 - Math.min(i, 3)), wb = Math.max(1, i - 2); R(38 - w, 28 + i, 1, 1, I[0]); R(38 + w, 28 + i, 1, 1, I[0]); R(38 - wb - 1 + (i < 3 ? 0 : 0), 35 + i, 1, 1, I[0]); R(38 + wb + 1, 35 + i, 1, 1, I[0]); }
      R(36, 29, 5, 1, I[2]); R(37, 30, 3, 1, I[2]); R(38, 31, 1, 1, I[2]); R(38, 33, 1, 1, I[5]); R(38, 36, 1, 2, I[5]); R(36, 40, 5, 2, I[2]); R(37, 39, 3, 1, I[2]); R(38, 38, 1, 1, I[2]);
      for (const [x, y] of [[4, 30], [2, 26], [29, 22]]) R(x, y, 2, 1, I[2]);
      for (const [x, y] of [[9, 8], [16, 5]]) { R(x, y, 2, 1, I[1]); R(x + 2, y + 1, 1, 1, I[1]); R(x + 3, y, 2, 1, I[1]); }
    },
  });
  ART.emptyKinds = Object.keys(EMPTY);

  // ---------- 六、未见过人物的剪影半身像 48×48 ----------
  ART.portraitUnknown = () => cached('pt|?unknown', () => {
    const b = new Buf(48, 48), C = tone('#3c3357', '#262038', '#55506e');
    b.add(L => { L.sy(35, 'bdfhijkkkllll', C, 24); L.r(20, 30, 8, 6, C); });
    b.add(L => { L.sy(11, FSHAPE.oval, C, 24); L.e(24, 13, 12.5, 9, C); L.e(24, 4, 3.5, 3.5, C); L.r(22, 6, 4, 3, C); L.r(11, 12, 3, 14, C); L.r(34, 12, 3, 14, C); });
    b.l(24, 44, 18, 36, '#262038'); b.l(24, 44, 30, 36, '#262038'); b.r(24, 44, 1, 4, '#262038');
    b.m(20, 15, ['.XXXXXX', 'XXXXXXXX', 'XX....XX', '......XX', '.....XXX', '....XXX', '...XXX', '...XX', '...XX', '', '...XX', '...XX'], { X: '#928ea8' });
    for (const [x, y] of [[20, 15], [21, 15], [20, 16]]) b.p(x + 1, y, '#c8c4d8');
    return b.cv();
  });

  // ---------- 七、勾选按钮框（九宫格，格式同 ART.frame）：chkOn 已勾 / chkOff 未勾，标记在右上角 ----------
  Object.assign(FRAMES, {
    chkOn: { fill: '#2a8a7a', ink: '#fff6e0', draw: b => { btn(b, '#2a8a7a', '#8fe0c8', '#1a5a52', '#4ccb9f'); b.r(13, 1, 6, 6, '#1a5a52'); b.r(14, 1, 5, 5, '#f4c542'); b.hl(14, 18, 1, '#fff2a8'); b.p(18, 1, null); for (const [x, y] of [[15, 3], [16, 4], [17, 3], [18, 2]]) b.p(x, y, '#3b2b1f'); } },
    chkOff: { fill: '#3a3155', ink: '#a8a4b8', draw: b => { btn(b, '#3a3155', '#55506e', '#1a1528', '#443a60'); b.p(3, 3, '#6e6a88'); b.r(13, 1, 6, 6, '#1a1528'); b.r(14, 1, 5, 5, '#6e6a88'); b.r(15, 2, 3, 3, '#262038'); b.p(18, 1, null); } },
  });
}

// ====================================================================
// 阶段六·开罗式信息架构（接口见 docs/ART_API.md “阶段六·开罗式信息架构”，方案见 docs/KAIRO_PLAN.md）
// ====================================================================
{
  // ---------- 一、底栏新入口 24×24：nav_gear 装备 / nav_world 江湖 / nav_path 仙途 ----------
  const ROBE6 = tone('#5b6fd6', '#34408a', '#9fb0ff');
  const NAV6 = {
    nav_gear: b => { // 装备：一件法衣，旁边立一口剑
      b.add(L => { L.sy(3, '3789', ROBE6, 10); L.r(1, 7, 4, 8, ROBE6); L.r(15, 7, 4, 8, ROBE6); L.sy(7, '5555555666777', ROBE6, 10); });
      b.l(7, 3, 9, 9, '#efe3c4'); b.l(12, 3, 10, 9, '#efe3c4'); b.r(8, 3, 4, 1, '#34408a'); b.r(9, 4, 2, 2, '#34408a');
      b.hl(5, 14, 12, '#f4c542'); b.r(9, 12, 2, 4, '#f4c542'); b.p(9, 12, '#fff2a8'); b.hl(1, 4, 14, '#efe3c4'); b.hl(15, 18, 14, '#efe3c4'); b.hl(3, 16, 19, '#efe3c4');
      b.add(L => { L.r(20, 3, 2, 12, STEEL); L.p(20, 2, STEEL); L.r(20, 17, 2, 4, WOOD); });
      b.r(20, 4, 1, 10, '#ffffff'); b.add(L => { L.r(18, 15, 6, 2, GOLD); L.r(20, 21, 2, 1, GOLD); });
    },
    nav_world: b => { // 江湖：摊开的舆图，一座山、一条路、一面小红旗
      b.add(L => L.r(3, 5, 18, 14, '#efe3c4'));
      b.add(L => { L.r(1, 3, 3, 18, WOOD); L.r(20, 3, 3, 18, WOOD); }); b.r(1, 2, 3, 1, '#f4c542'); b.r(20, 2, 3, 1, '#f4c542'); b.r(1, 21, 3, 1, '#f4c542'); b.r(20, 21, 3, 1, '#f4c542');
      b.add(L => L.sy(9, '1234', '#5a82aa', 9), { flat: 1, sep: 0 }); b.p(8, 9, '#ffffff'); b.r(7, 10, 2, 1, '#ffffff');
      for (const [x, y] of [[7, 16], [9, 15], [11, 15], [13, 14], [15, 12], [16, 10]]) b.p(x, y, '#7a5230');
      b.r(16, 6, 1, 4, '#7a5230'); b.r(17, 6, 2, 2, '#d8404a'); b.p(19, 7, '#d8404a');
      b.r(12, 17, 3, 1, '#4aa8ff'); b.r(14, 16, 3, 1, '#4aa8ff'); b.hl(5, 6, 7, '#c8b48c'); b.hl(14, 17, 17, '#c8b48c');
    },
    nav_path: b => { // 仙途：一级一级往上的石阶，尽头一座金色天门
      for (let i = 0; i < 4; i++) { const w = 20 - i * 4, x = 12 - w / 2, y = 20 - i * 3; b.add(L => L.r(x, y, w, 3, '#928ea8')); b.hl(x, x + w - 1, y, '#c8c4d8'); }
      b.add(L => { L.r(8, 4, 1, 7, GOLD); L.r(15, 4, 1, 7, GOLD); L.r(7, 4, 10, 1, GOLD); L.r(8, 6, 8, 1, GOLD); });
      b.r(10, 7, 4, 4, '#fff2a8'); b.r(11, 8, 2, 3, '#ffffff'); b.p(12, 1, '#fff2a8'); b.r(11, 2, 3, 1, '#fff2a8');
      b.add(L => { L.e(3.5, 9, 3.5, 2, '#dfe7ef'); L.e(5.5, 8, 2, 2, '#dfe7ef'); L.e(20.5, 13, 3.5, 2, '#dfe7ef'); L.e(18.5, 12, 2, 2, '#dfe7ef'); }, { sep: 0 });
    },
  };
  // ---------- 二、16×16 图标：goal 目标旗 / mail 传讯纸鹤 / unlock 开了的锁 / report 年报 ----------
  const ICON6 = {
    goal: b => {
      b.add(L => L.sy(12, '356', '#62d26f', 6)); b.r(5, 2, 1, 11, '#7a5230'); b.p(5, 1, '#f4c542');
      b.add(L => { L.r(6, 2, 6, 1, RED); L.r(6, 3, 7, 1, RED); L.r(6, 4, 6, 1, RED); L.r(6, 5, 4, 1, RED); L.r(6, 6, 2, 1, RED); }, { noHi: 1, sep: 0 }); b.p(7, 3, '#ff9a8a'); b.p(8, 3, '#ff9a8a');
    },
    mail: b => {
      b.m(2, 3, ['..........ww', '.........wwW', 'w.......wwW', 'ww.....wwW', 'wtw...wwwW', '.wtwwwwwwwww', '..wwwwwwwwtW', '...wwwwwwtW', '....wwwwtW', '.....WWWW'], IPAL);
      b.p(7, 9, '#d8404a'); b.p(8, 9, '#d8404a'); b.p(1, 1, '#fff2a8'); b.p(4, 12, '#7fe0f0');
    },
    unlock: b => {
      b.add(L => L.r(3, 8, 10, 7, GOLD)); b.r(7, 10, 2, 2, INK); b.r(7, 12, 2, 1, '#a8742a'); b.p(7, 12, INK);
      b.add(L => { L.r(5, 2, 6, 1, STEEL); L.r(4, 3, 1, 2, STEEL); L.r(11, 3, 1, 5, STEEL); }, { flat: 1, sep: 0 });
      b.p(14, 3, '#ffffff'); b.p(15, 5, '#fff2a8'); b.p(1, 5, '#ffffff'); b.p(2, 3, '#fff2a8'); b.p(14, 1, '#fff2a8');
    },
    report: b => {
      b.add(L => L.r(3, 2, 10, 12, '#efe3c4')); b.add(L => { L.r(2, 1, 12, 2, WOOD); L.r(2, 13, 12, 2, WOOD); });
      b.r(5, 9, 1, 3, '#2a8a7a'); b.r(7, 7, 1, 5, '#2a8a7a'); b.r(9, 5, 1, 7, '#4ccb9f'); b.r(11, 9, 2, 2, '#d8404a'); b.hl(5, 7, 4, '#928ea8');
    },
  };
  const icon5 = ART.icon;
  ART.icon = function (name) {
    if (NAV6[name]) return cached('ic6|' + name, () => { const b = new Buf(24, 24); NAV6[name](b); return b.cv(); });
    if (ICON6[name]) return cached('ic6|' + name, () => { const b = new Buf(16, 16); ICON6[name](b); return b.cv(); });
    return icon5(name);
  };
  const names5 = ART.iconNames; ART.iconNames = () => names5().concat(Object.keys(ICON6));
  const nav5 = ART.navIcons; ART.navIcons = () => nav5().concat(Object.keys(NAV6));

  // ---------- 三、仙途路径节点 12×12：ART.pathNode('done' | 'now' | 'next' | 'lock') ----------
  ART.pathNode = state => cached('pathnode|' + state, () => {
    const b = new Buf(12, 12);
    if (state === 'done') { b.add(L => L.e(6, 6, 4.6, 4.6, tone('#2f9e7e', '#1a5a52', '#8fe0c8')), { noHi: 1 }); b.l(3, 6, 5, 8, '#ffffff'); b.l(5, 8, 9, 4, '#ffffff'); b.l(3, 7, 5, 9, '#c8fff0'); }
    else if (state === 'now') { b.add(L => L.sy(1, '1234554321', GOLD, 6)); b.r(5, 4, 2, 4, '#ffffff'); b.r(4, 5, 4, 2, '#ffffff'); }
    else if (state === 'lock') { b.add(L => L.e(6, 6, 4.6, 4.6, tone('#55506e', '#2c2238', '#706c8a'))); b.r(4, 6, 4, 3, '#c8c4d8'); b.r(5, 4, 2, 1, '#c8c4d8'); b.p(4, 5, '#c8c4d8'); b.p(7, 5, '#c8c4d8'); b.p(5, 7, '#55506e'); }
    else { b.e(6, 6, 4.6, 4.6, '#928ea8'); b.e(6, 6, 2.6, 2.6, null); b.p(4, 3, '#c8c4d8'); }
    return b.cv();
  });
  ART.pathNodeStates = ['done', 'now', 'next', 'lock'];

  // ---------- 四、解锁小庆祝的放射光 48×48，两帧：ART.burst(frame 0 | 1, color?) ----------
  ART.burstFrames = 2;
  ART.burst = (frame, color) => cached('burst|' + (frame & 1) + '|' + (color || ''), () => {
    const b = new Buf(48, 48), c = color || '#f4c542', hi = lerpC(c, '#ffffff', 0.6), off = (frame & 1) ? Math.PI / 12 : 0;
    for (let i = 0; i < 12; i++) {
      const a = off + i * Math.PI / 6, long = i % 2 === 0, r0 = 11, r1 = long ? 23 : 17;
      b.l(24 + Math.cos(a) * r0, 24 + Math.sin(a) * r0, 24 + Math.cos(a) * r1, 24 + Math.sin(a) * r1, long ? c : hi, long ? 2 : 1);
    }
    for (let i = 0; i < 6; i++) { const a = off + Math.PI / 12 + i * Math.PI / 3; b.p(24 + Math.cos(a) * 21, 24 + Math.sin(a) * 21, '#ffffff'); }
    return b.cv({ noOutline: 1 });
  });
}

// ====================================================================
// 阶段七·战斗、刷宝、炼器与高光过场（接口见 docs/ART_API.md “阶段七”，方案见 docs/COMBAT_LOOT.md）
// 只追加，不动已有接口。五行键与配色沿用 EL_FX（jin mu shui huo tu）。
// ====================================================================
{
  const elc = e => EL_FX[elKey(e)];
  // ---------- 一、历练小怪 32×28，面朝左（站在画面右侧），三帧：0 站 / 1 呼吸 / 2 出手；脚底锚点 (16, 27) ----------
  const MOBS = {
    teng: { n: '青藤妖', el: 'mu', draw(b, f) { // 一颗长了眼睛的藤球，顶着一朵食人花
      const bob = f === 1 ? 1 : 0, lx = f === 2 ? -3 : 0, G = tone('#4fae5a', '#2a6e3e', '#9be08a'), V = tone('#2f8e4b', '#1c5a34', '#62d26f'), P = tone('#e0507a', '#8a2648', '#ff9ab8');
      b.add(L => { L.l(9, 24, 3 + lx, 19 - bob, V, 2); L.l(3 + lx, 19 - bob, 5 + lx * 2, 12 - bob, V, 2); L.l(23, 24, 28, 20, V, 2); L.l(28, 20, 27, 13 + bob, V, 2); L.l(11, 26, 8, 27, V, 2); L.l(20, 26, 24, 27, V, 2); });
      b.add(L => L.e(16 + lx / 2, 19 + bob, 8, 7, G));
      b.add(L => { L.r(15 + lx, 8 + bob, 2, 5, V); });
      b.add(L => { L.e(13 + lx, 6 + bob, 4, 3, P); L.e(19 + lx, 6 + bob, 4, 3, P); L.e(16 + lx, 3 + bob, 3, 3, P); L.e(16 + lx, 8 + bob, 3, 2, P); });
      b.e(16 + lx, 6 + bob, 2, 2, f === 2 ? '#2c2238' : '#f4c542'); if (f === 2) { b.p(15 + lx, 5 + bob, '#ffffff'); b.p(17 + lx, 7 + bob, '#ffffff'); }
      const ex = 11 + lx / 2, ey = 17 + bob; b.r(ex, ey, 3, 3, '#fff2a8'); b.r(ex + 5, ey, 3, 3, '#fff2a8'); b.r(ex, ey + 1, 2, 2, '#2c2238'); b.r(ex + 5, ey + 1, 2, 2, '#2c2238'); b.hl(ex, ex + 2, ey - 1, '#1c5a34'); b.hl(ex + 5, ex + 7, ey - 1, '#1c5a34');
      b.hl(ex + 1, ex + 6, ey + 5, '#1c5a34'); b.p(ex + 2, ey + 6, '#ffffff'); b.p(ex + 5, ey + 6, '#ffffff');
      b.p(5 + lx * 2, 11 - bob, '#9be08a'); b.p(27, 12 + bob, '#9be08a'); b.p(21, 15 + bob, '#9be08a'); b.p(22, 21 + bob, '#2a6e3e');
    } },
    xiong: { n: '铁背熊', el: 'tu', draw(b, f) { // 四足着地的大熊，背上一层铁甲
      const bob = f === 1 ? 1 : 0, lx = f === 2 ? -3 : 0, F = tone('#8a5c36', '#5a3a26', '#b98a4c'), S = tone('#8e96a8', '#4e566c', '#d4dcec'), M = tone('#c8a070', '#8a6a48', '#e8cc94');
      b.add(L => { L.r(8, 20, 4, 7, F); L.r(13, 21, 3, 6, F); L.r(21, 20, 4, 7, F); L.r(25, 21, 3, 6, F); });
      b.add(L => { L.e(18, 15 + bob, 11, 7, F); L.e(27, 16 + bob, 4, 5, F); });
      b.add(L => { L.e(8 + lx, 13 + bob, 6, 6, F); L.r(4 + lx, 6 + bob, 3, 3, F); L.r(10 + lx, 5 + bob, 3, 3, F); });
      b.add(L => { L.e(5 + lx, 16 + bob, 3, 3, M); }, { sep: 0 });
      b.add(L => { L.sy(7 + bob, '479aba97', S, 19); }, { sep: 1 }); for (const x of [13, 17, 21, 25]) { b.p(x, 9 + bob, '#4e566c'); b.p(x, 12 + bob, '#eef4ff'); } b.hl(11, 26, 11 + bob, '#4e566c');
      b.r(2 + lx, 15 + bob, 2, 2, '#2c2238'); b.r(6 + lx, 11 + bob, 2, 2, f === 2 ? '#ff6b3a' : '#2c2238'); b.p(6 + lx, 11 + bob, '#ffffff'); b.hl(5 + lx, 8 + lx, 9 + bob, '#5a3a26');
      if (f === 2) { b.r(3 + lx, 18 + bob, 4, 2, '#8a1e2e'); b.p(3 + lx, 18 + bob, '#ffffff'); b.p(6 + lx, 18 + bob, '#ffffff'); b.add(L => { L.l(5, 22, 1, 19, F, 3); }); for (const y of [18, 20, 22]) b.p(0, y, '#ffffff'); }
      for (const x of [8, 10, 21, 23]) b.p(x, 27, '#efe3c4');
    } },
    ya: { n: '火鸦', el: 'huo', draw(b, f) { // 展翅的黑红乌鸦，尾羽是火
      const up2 = f === 1 ? 3 : f === 2 ? -2 : 0, lx = f === 2 ? -4 : 0, K = tone('#4a2a34', '#2a1820', '#7a4a52'), Rr = tone('#d8502a', '#8a241e', '#ffb23f');
      b.add(L => { L.l(18 + lx, 14, 28 + lx, 6 + up2, K, 3); L.l(28 + lx, 6 + up2, 31, 10 + up2, K, 2); L.l(14 + lx, 14, 5 + lx, 5 + up2, K, 3); L.l(5 + lx, 5 + up2, 1 + lx, 9 + up2, K, 2); });
      b.add(L => { L.l(22 + lx, 9 + up2 / 2, 26 + lx, 12 + up2 / 2, Rr, 2); L.l(10 + lx, 9 + up2 / 2, 6 + lx, 12 + up2 / 2, Rr, 2); }, { sep: 0 });
      b.add(L => { L.e(16 + lx, 15, 5, 5, K); L.e(12 + lx, 11, 4, 4, K); });
      b.add(L => { L.l(20 + lx, 18, 26, 22, Rr, 3); L.l(26, 22, 30, 21 + (f & 1), Rr, 2); L.l(20 + lx, 20, 24, 25, Rr, 2); }, { sep: 0 });
      b.p(30, 20 + (f & 1), '#fff2a8'); b.p(25, 26, '#ffd86a'); b.p(28, 24, '#ffd86a'); b.p(27, 18, '#fff2a8');
      b.add(L => { L.r(6 + lx, 11, 4, 2, GOLD); L.p(5 + lx, 12, GOLD); }, { sep: 0 }); b.r(11 + lx, 9, 2, 2, '#ffd86a'); b.p(11 + lx, 10, '#ffffff');
      b.r(14 + lx, 20, 1, 4, '#f4c542'); b.r(18 + lx, 20, 1, 4, '#f4c542'); b.hl(13 + lx, 15 + lx, 24, '#f4c542'); b.hl(17 + lx, 19 + lx, 24, '#f4c542');
    } },
    wa: { n: '寒潭蛙', el: 'shui', draw(b, f) { // 蹲着的蓝蛙，背上三根冰棱
      const bob = f === 1 ? 1 : 0, lx = f === 2 ? -3 : 0, jy = f === 2 ? -4 : 0, B = tone('#3f8fd0', '#24579a', '#9fd4ff'), I = tone('#bfe8ff', '#6fb0e0', '#ffffff'), W2 = tone('#e8f4ff', '#a8c8e8', '#ffffff');
      b.add(L => { L.e(24, 22 + jy / 2, 5, 4, B); L.r(24, 24 + jy / 2, 6, 3, B); L.r(7 + lx, 22 + jy, 4, 5, B); L.r(4 + lx, 26 + jy, 5, 1, B); });
      b.add(L => { L.l(18, 6 + bob + jy, 18, 12 + jy, I, 3); L.l(23, 8 + bob + jy, 22, 13 + jy, I, 2); L.l(13, 8 + bob + jy, 14, 13 + jy, I, 2); });
      b.add(L => L.e(16 + lx / 2, 19 + bob + jy, 10, 7, B));
      b.add(L => L.e(13 + lx / 2, 22 + bob + jy, 6, 3, W2), { sep: 0 });
      b.add(L => { L.e(8 + lx, 12 + bob + jy, 3, 3, B); L.e(15 + lx, 11 + bob + jy, 3, 3, B); });
      b.r(7 + lx, 11 + bob + jy, 2, 3, '#fff2a8'); b.r(14 + lx, 10 + bob + jy, 2, 3, '#fff2a8'); b.p(7 + lx, 12 + bob + jy, '#2c2238'); b.p(14 + lx, 11 + bob + jy, '#2c2238');
      b.hl(6 + lx, 13 + lx, 19 + bob + jy, '#24579a'); if (f === 2) { b.add(L => L.l(5 + lx, 19 + jy, 0, 17 + jy, RED, 2), { sep: 0 }); b.p(0, 17 + jy, '#ff9a8a'); }
      b.p(21, 17 + bob + jy, '#9fd4ff'); b.p(23, 20 + bob + jy, '#9fd4ff'); b.p(18, 5 + bob + jy, '#ffffff');
    } },
    tang: { n: '铁螳螂', el: 'jin', draw(b, f) { // 举着两把镰刀的金螳螂
      const bob = f === 1 ? 1 : 0, lx = f === 2 ? -3 : 0, Y = tone('#c8a23a', '#7a5c1e', '#fff2a8'), S = tone('#dfe7ef', '#8e96a8', '#ffffff');
      b.add(L => { L.l(18, 20, 14, 27, Y, 1); L.l(21, 20, 22, 27, Y, 1); L.l(24, 19, 28, 27, Y, 1); L.hl(12, 14, 27, Y); L.hl(22, 24, 27, Y); L.hl(28, 30, 27, Y); });
      b.add(L => { L.l(17, 17 + bob, 28, 22 + bob, Y, 5); L.l(15, 16 + bob, 12, 9 + bob, Y, 3); });
      b.add(L => { L.sy(4 + bob, '1233321', Y, 11 + lx); });
      b.r(7 + lx, 6 + bob, 2, 2, '#d8404a'); b.r(12 + lx, 6 + bob, 2, 2, '#d8404a'); b.p(7 + lx, 6 + bob, '#ffffff'); b.l(9 + lx, 3 + bob, 6 + lx, 0, '#7a5c1e'); b.l(12 + lx, 3 + bob, 15 + lx, 0, '#7a5c1e');
      const a = f === 2 ? 1 : 0; // 镰刀：出手时向前劈下
      b.add(L => { L.l(14, 13 + bob, 8 + lx, 13 + bob - (a ? 0 : 3), Y, 2); L.l(16, 12 + bob, 20, 6 + bob, Y, 2); });
      b.add(L => { if (a) { L.l(8 + lx, 13 + bob, 1, 20, S, 2); L.l(1, 20, 4, 23, S, 1); } else { L.l(8, 10 + bob, 3, 3 + bob, S, 2); L.l(3, 3 + bob, 1, 7 + bob, S, 1); } L.l(20, 6 + bob, 25, 1 + bob, S, 2); L.l(25, 1 + bob, 28, 5 + bob, S, 1); });
      for (const x of [20, 23, 26]) b.p(x, 19 + bob + (x - 20) / 3, '#7a5c1e');
    } },
  };
  ART.mobIds = Object.keys(MOBS);
  ART.mobInfo = id => { const m = MOBS[id] || MOBS.teng; return { n: m.n, el: m.el }; };
  ART.dims.mob = { w: 32, h: 28, ax: 16, ay: 27 };
  ART.mob = function (id, frame, flip) {
    const m = MOBS[id] || MOBS.teng; frame = Math.max(0, Math.min(2, frame | 0));
    return cached(['mob', id, frame, flip ? 1 : 0].join('|'), () => {
      const b = new Buf(32, 28); m.draw(b, frame); const c = b.cv();
      if (!flip) return c; const f = mk(32, 28), g = f.getContext('2d'); g.translate(32, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f;
    });
  };
  // 精英脚下的光环 40×12，两帧；el 决定颜色
  ART.eliteAura = (el, frame) => cached('aura|' + elKey(el) + (frame & 1), () => on(mk(40, 12), () => {
    const [D, M, H] = elc(el), f = frame & 1; ctx.globalAlpha = 0.45; ellipse(20, 6, 19, 5, D); ctx.globalAlpha = 1;
    for (let i = 0; i < 32; i++) { const a = i * Math.PI / 16 + f * 0.1; R(20 + Math.cos(a) * 18, 6 + Math.sin(a) * 4.5, 1, 1, (i + f) % 4 === 0 ? '#ffffff' : i % 2 ? M : H); }
    for (let i = 0; i < 5; i++) { const x = 5 + i * 7 + f * 2; R(x, 2 - ((i + f) % 3), 1, 2 + ((i + f) % 2), H); }
  }));

  // ---------- 二、招式特效 48×48 四帧（透明底、不描边，脚底线 y = 44，受击者站在 (24, 44)） ----------
  const FXW = 48;
  const FX = {
    slash(k, [D, M, H]) { // 金：三道交错的月牙斩
      const n = Math.min(3, k + 1);
      for (let j = 0; j < n; j++) { const fade = k === 3 ? 0.45 : j < k ? 0.7 : 1, cx = 24 + (j - 1) * 5, cy = 24 + (j % 2 ? 4 : -4), s = j % 2 ? -1 : 1; ctx.globalAlpha = fade;
        for (let i = -15; i <= 15; i++) { const u = i / 15, x = cx + i, y = cy + s * Math.round(u * 9 + (1 - u * u) * -6 * s), th = Math.round((1 - u * u) * 4) + 1; R(x, y - th, 1, th, M); R(x, y - Math.ceil(th / 2), 1, Math.max(1, th - 2), H); if (Math.abs(i) < 9) R(x, y - Math.ceil(th / 2), 1, 1, '#ffffff'); R(x, y, 1, 1, D); } }
      ctx.globalAlpha = 1; if (k < 3) for (const [x, y] of [[8, 10], [40, 14], [36, 38], [10, 34]].slice(0, k + 2)) { R(x - 1, y, 3, 1, '#ffffff'); R(x, y - 1, 1, 3, '#ffffff'); }
    },
    vine(k, [D, M, H]) { // 木：三根藤从地里窜出来缠住
      const hgt = [12, 26, 34, 34][k];
      for (const [x0, ph, s] of [[13, 0, 1], [24, 2, -1], [35, 4, 1]]) for (let y = 0; y < hgt; y++) { const x = x0 + Math.round(Math.sin(y * 0.35 + ph) * 4 * s + (24 - x0) * (y / 40)); R(x, 44 - y, 3, 1, y % 5 === 4 ? D : M); R(x, 44 - y, 1, 1, H); if (y % 7 === 5 && y < hgt - 2) { R(x + 3 * s, 43 - y, 3, 2, H); R(x + 4 * s, 42 - y, 2, 1, M); } }
      if (k >= 2) for (let i = 0; i < 10; i++) { const a = i * 0.63 + k; R(24 + Math.cos(a) * (12 + (k - 2) * 6), 20 + Math.sin(a) * (9 + (k - 2) * 5), 2, 1, i % 2 ? H : M); }
      if (k === 3) { ctx.globalAlpha = 0.5; ellipse(24, 44, 18, 3, M); ctx.globalAlpha = 1; } else ellipse(24, 45, 6 + k * 5, 2, D);
    },
    wave(k, [D, M, H]) { // 水：一道浪头从左拍到右
      const cx = [8, 20, 30, 40][k], top = [30, 16, 12, 26][k];
      for (let x = 0; x < 48; x++) { const u = (x - cx) / 14, hh = Math.max(0, (44 - top) * Math.exp(-u * u) * (u > 0 ? 1 : 0.75)); if (hh < 1 && Math.abs(u) > 1.6) continue; const y0 = Math.round(44 - hh - 2 - Math.sin(x * 0.7 + k) * 1.2);
        for (let y = y0; y <= 44; y++) R(x, y, 1, 1, y - y0 < 2 ? '#ffffff' : y - y0 < 5 ? H : BAYER[(x & 3) + (y & 3) * 4] < 9 ? M : D); }
      for (let i = 0; i < 6 + k * 2; i++) { const x = cx + 4 + (i * 7) % 14, y = top - 3 + (i * 5) % 12 - (k === 3 ? 0 : 3); if (x < 47) { R(x, y, 2, 2, i % 2 ? H : M); R(x, y, 1, 1, '#ffffff'); } }
      if (k === 3) for (let i = 0; i < 9; i++) R(4 + i * 5, 40 + (i % 3), 3, 1, '#ffffff');
    },
    flame(k, [D, M, H]) { // 火：地上窜起一根火柱
      const hgt = [14, 30, 40, 26][k], wd = [9, 11, 12, 8][k];
      for (let y = 0; y < hgt; y++) { const u = y / hgt, w = Math.round(wd * (1 - u * u) + Math.sin(y * 0.9 + k * 2) * 1.6), cx = 24 + Math.round(Math.sin(y * 0.45 + k) * 2 * u);
        dR(cx - w, 44 - y, w * 2, 1, D, k === 3 ? 9 : 16); if (w > 2) dR(cx - w + 2, 44 - y, w * 2 - 4, 1, M, k === 3 ? 10 : 16); if (w > 4) R(cx - w + 4, 44 - y, w * 2 - 8, 1, H); if (w > 6 && u < 0.6) R(cx - 1, 44 - y, 2, 1, '#ffffff'); }
      for (let i = 0; i < 5 + k * 2; i++) { const x = 10 + (i * 11) % 28, y = 44 - hgt - 2 - (i * 5) % 8 + (k === 3 ? -6 : 0); if (y > 0) R(x, y, 1, 1 + (i % 2), i % 3 ? H : '#ffffff'); }
      if (k === 3) { ctx.globalAlpha = 0.6; for (const [x, y, r] of [[18, 12, 4], [28, 8, 5], [24, 2, 3]]) { ctx.fillStyle = pat('#3a2a34', 8); disc(x, y, r, ctx.fillStyle); } ctx.globalAlpha = 1; }
      ctx.globalAlpha = 0.6; ellipse(24, 45, 12 + k * 2, 2, M); ctx.globalAlpha = 1;
    },
    quake(k, [D, M, H]) { // 土：三根岩刺破土
      const hs2 = [[6, 10, 5], [14, 24, 12], [18, 32, 16], [18, 32, 16]][k];
      [[11, 0], [24, 1], [37, 2]].forEach(([cx, j]) => { const hh = hs2[j], w = j === 1 ? 6 : 4; ctx.globalAlpha = k === 3 ? 0.6 : 1;
        for (let y = 0; y < hh; y++) { const ww = Math.max(1, Math.round(w * (1 - y / hh))), lean = Math.round((j - 1) * y * 0.12); R(cx - ww + lean, 44 - y, ww * 2, 1, M); R(cx - ww + lean, 44 - y, Math.max(1, ww - 1), 1, H); R(cx + lean + ww - 1, 44 - y, 1, 1, D); if (y % 6 === 3) R(cx + lean - 1, 44 - y, 2, 1, D); } });
      ctx.globalAlpha = 1; for (let i = 0; i < 4 + k * 3; i++) { const x = 4 + (i * 13) % 40, y = 40 - (i * 7 % 10) - k * (k === 3 ? -2 : 3); R(x, y, 2, 2, i % 2 ? M : D); R(x, y, 1, 1, H); }
      line(2, 45, 46, 45, D); for (const x of [8, 18, 30, 41]) line(x, 45, x + (x % 3) - 1, 47, D);
    },
    brk(k) { // 破罩：六角护罩裂开、碎片飞散
      const C0 = '#7fe0f0', C1 = '#ffffff', r = 17 + (k > 1 ? (k - 1) * 3 : 0);
      if (k < 2) { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + Math.PI / 6, a2 = a + Math.PI / 3; line(24 + Math.cos(a) * r, 24 + Math.sin(a) * r, 24 + Math.cos(a2) * r, 24 + Math.sin(a2) * r, i % 2 ? C0 : C1, 2); } ctx.globalAlpha = 0.25; disc(24, 24, r - 2, C0); ctx.globalAlpha = 1; }
      if (k >= 1) for (const [x0, y0, x1, y1] of [[24, 24, 12, 10], [24, 24, 38, 14], [24, 24, 20, 40], [24, 24, 36, 34], [16, 16, 8, 20], [32, 28, 42, 28]].slice(0, k === 1 ? 4 : 6)) if (k === 1) line(x0, y0, x1, y1, '#ffffff');
      if (k >= 2) { for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + 0.2, d = (k === 2 ? 11 : 19) + (i % 3) * 2, x = 24 + Math.cos(a) * d, y = 24 + Math.sin(a) * d + (k === 3 ? 3 : 0); ctx.globalAlpha = k === 3 ? 0.6 : 1; R(x - 1, y - 1, 3, 2, i % 2 ? C0 : C1); R(x, y + 1, 2, 1, '#3fa8c8'); } ctx.globalAlpha = 1; if (k === 2) { disc(24, 24, 5, '#ffffff'); glow(24, 24, 14, C0, 0.6); } }
    },
    chain(k, [D, M, H], B) { // 相生连携：前一招的颜色（外圈）流进后一招（内芯）
      const [D2, M2, H2] = B || [D, M, H], r = [16, 12, 7, 12][k];
      for (let i = 0; i < 40; i++) { const a = i * Math.PI / 20 + k * 0.5; if ((i + k * 3) % 10 < 6) R(24 + Math.cos(a) * r, 24 + Math.sin(a) * r, 2, 2, i % 3 ? M : H); }
      disc(24, 24, [3, 5, 8, 4][k], k === 2 ? '#ffffff' : M2); disc(24, 24, [1, 3, 5, 2][k], k === 2 ? H2 : '#ffffff');
      if (k >= 2) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, d = k === 2 ? 12 : 19; line(24 + Math.cos(a) * (d - 4), 24 + Math.sin(a) * (d - 4), 24 + Math.cos(a) * d, 24 + Math.sin(a) * d, i % 2 ? H2 : M2); }
    },
  };
  const EL_SKILL = { jin: 'slash', mu: 'vine', shui: 'wave', huo: 'flame', tu: 'quake' };
  ART.skillFxNames = ['slash', 'vine', 'wave', 'flame', 'quake', 'brk', 'chain'];
  ART.skillFxFrames = 4;
  ART.skillFxOf = el => EL_SKILL[elKey(el)];
  // name 也可以直接传五行；color 可改色（例如被灌注了别的五行的器技）；chain 的 el2 是后一招的五行
  ART.skillFx = function (name, frame, el, el2) {
    if (EL_FX[name]) { el = el || name; name = EL_SKILL[name]; }
    if (!FX[name]) name = 'slash'; frame = Math.max(0, Math.min(3, frame | 0));
    const def = { slash: 'jin', vine: 'mu', wave: 'shui', flame: 'huo', quake: 'tu', chain: 'mu' }[name], e = el ? elKey(el) : def;
    return cached(['sfx', name, frame, e, el2 || ''].join('|'), () => on(mk(FXW, FXW), () => FX[name](frame, EL_FX[e] || EL_FX.jin, el2 ? EL_FX[elKey(el2)] : null)));
  };
  // 绝招「戒中剑意」64×96 六帧：戒指上亮起一点 → 巨剑虚影在头顶成形 → 落下 → 砸地金光 → 余辉。受击者站在 (32, 92)
  ART.ultFrames = 6;
  ART.ultFx = frame => cached('ult|' + (frame = Math.max(0, Math.min(5, frame | 0))), () => on(mk(64, 96), () => {
    const k = frame, sword = (ty, a) => { ctx.globalAlpha = a;
      for (let y = 0; y < 52; y++) { const w = y < 6 ? Math.ceil((y + 1) * 0.9) : y < 40 ? 5 : y < 43 ? 10 : 3, Y = ty + 51 - y; if (Y < 0 || Y > 95) continue; R(32 - w, Y, w * 2, 1, y >= 40 && y < 43 ? '#f4c542' : y >= 43 ? '#a8742a' : '#fff2a8'); if (y < 40) { R(32 - w, Y, 1, 1, '#f4c542'); R(31 + w, Y, 1, 1, '#f4c542'); R(31, Y, 2, 1, '#ffffff'); } }
      ctx.globalAlpha = 1; };
    if (k === 0) { glow(32, 20, 10, '#f4c542', 0.7); disc(32, 20, 2, '#ffffff'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; line(32 + Math.cos(a) * 5, 20 + Math.sin(a) * 5, 32 + Math.cos(a) * 9, 20 + Math.sin(a) * 9, '#fff2a8'); } }
    if (k === 1) { glow(32, 26, 22, '#f4c542', 0.45); sword(0, 0.55); for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12; R(32 + Math.cos(a) * 24, 26 + Math.sin(a) * 9, 1, 1, i % 2 ? '#fff2a8' : '#f4c542'); } }
    if (k === 2) { glow(32, 30, 24, '#fff2a8', 0.5); sword(4, 1); for (const x of [14, 20, 44, 50]) { ctx.globalAlpha = 0.6; R(x, 0, 1, 30 + (x % 7), '#fff2a8'); } ctx.globalAlpha = 1; }
    if (k === 3) { ctx.globalAlpha = 0.5; for (const x of [22, 27, 37, 42]) R(x, 0, 2, 60, '#fff2a8'); ctx.globalAlpha = 1; sword(40, 1); glow(32, 90, 26, '#ffffff', 0.9); ellipse(32, 92, 30, 4, '#fff2a8'); ellipse(32, 92, 20, 2, '#ffffff'); for (let i = 0; i < 9; i++) { const x = 4 + i * 7; R(x, 84 - (i * 5) % 9, 2, 3, i % 2 ? '#f4c542' : '#ffffff'); } }
    if (k >= 4) { const a = k === 4 ? 0.7 : 0.35; sword(40, a * 0.8); ctx.globalAlpha = a; ellipse(32, 92, 31, 4, '#f4c542'); ctx.globalAlpha = 1; for (let i = 0; i < 14; i++) { const x = 3 + (i * 9) % 58, y = 86 - (i * 13) % 50 - (k - 4) * 8; if (y > 0) R(x, y, 1, 2, i % 3 ? '#f4c542' : '#ffffff'); } for (const [x, y] of [[20, 93], [44, 94], [32, 95]]) line(x, y, x + (x - 32) / 2, 95, '#a8742a'); }
  }));

  // ---------- 三、战斗界面小件 ----------
  // 五行小徽 10×10：金 剑锋 / 木 叶 / 水 滴 / 火 焰 / 土 山
  const BADGE = {
    jin: ['....w', '...ww', '..wwh', '.wwh', 'wwh', '.h'], mu: ['...ww', '.wwwh', 'wwwhh', 'wwhh', '.wh', 'w'], shui: ['..w', '..w', '.www', 'wwwhh', 'wwhhh', '.hhh'],
    huo: ['..w', '.ww.w', '.wwww', 'wwhww', 'wwhhw', '.whh'], tu: ['......', '..ww', '.wwww', '.wwhh', 'wwwhhh', 'wwhhhh'],
  };
  ART.elemBadge = el => cached('elb|' + (el = elKey(el)), () => {
    const [D, M, H] = EL_FX[el], b = new Buf(10, 10); b.add(L => L.e(5, 5, 4.6, 4.6, tone(M, D, H)), { noHi: 1 }); b.m(2, 2, BADGE[el], { w: '#ffffff', h: H }); return b.cv();
  });
  // 五行克制环 72×72：外圈相生（淡），内里五角星是相克（箭头指向被克的一方）。hl：高亮“克它”的那条边，传被克的五行
  ART.elemWheel = hl => cached('elwheel|' + (hl || ''), () => on(mk(72, 72), () => {
    const ord = ['mu', 'huo', 'tu', 'jin', 'shui'], pos = ord.map((e, i) => { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; return [36 + Math.cos(a) * 27, 36 + Math.sin(a) * 27]; });
    for (let i = 0; i < 60; i++) { const a = i * Math.PI / 30; if (i % 3) R(36 + Math.cos(a) * 27, 36 + Math.sin(a) * 27, 1, 1, '#6e6a88'); }
    const KE2 = { jin: 'mu', mu: 'tu', tu: 'shui', shui: 'huo', huo: 'jin' };
    ord.forEach((e, i) => { const j = ord.indexOf(KE2[e]), [x0, y0] = pos[i], [x1, y1] = pos[j], on2 = hl && elKey(hl) === KE2[e], c = on2 ? '#fff2a8' : '#8a5a62', dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      line(x0 + ux * 8, y0 + uy * 8, x1 - ux * 9, y1 - uy * 9, c, on2 ? 2 : 1); const tx = x1 - ux * 9, ty = y1 - uy * 9; line(tx, ty, tx - ux * 4 - uy * 3, ty - uy * 4 + ux * 3, c, on2 ? 2 : 1); line(tx, ty, tx - ux * 4 + uy * 3, ty - uy * 4 - ux * 3, c, on2 ? 2 : 1); });
    ord.forEach((e, i) => { const bd = ART.elemBadge(e); ctx.drawImage(bd, 0, 0, 10, 10, Math.round(pos[i][0]) - 7, Math.round(pos[i][1]) - 7, 15, 15); });
  }));
  // 护罩格 7×8：on 亮 / off 碎
  ART.shieldPip = on2 => cached('pip|' + (on2 ? 1 : 0), () => { const b = new Buf(7, 8), c = on2 ? tone('#7fe0f0', '#3fa8c8', '#ffffff') : tone('#55506e', '#3a3155', '#6e6a88'); b.add(L => L.sy(0, '3333321', c, 3.5), { noHi: !on2 }); if (on2) b.p(2, 1, '#ffffff'); else { b.p(3, 2, INK); b.p(2, 3, INK); b.p(3, 4, INK); } return b.cv(); });
  // 招式图标 16×16：ART.skillIcon(el, kind)；kind：zhan 战技（斩痕）/ qi 器技（兵刃）/ mi 秘术（符）/ xin 心法（莲）/ ult 绝招（金框剑）；el 空 = 无属性（灰）
  const SKG = {
    zhan: ['..........ww', '.........wwh', '........wwh', '.......wwh', '..w...wwh', '.ww..wwh', '.wwwwwh', '..wwwh', '.wwwh', 'wwh.w', 'wh...w'],
    qi: ['.........ww', '........wwh', '.......wwh', '......wwh', '.....wwh', '.w..wwh', '.wwwwh', '..www', '.wwhww', 'wwh..w', 'wh'],
    mi: ['..wwwwwww', '..whhhhhw', '..wh.w.hw', '..whwwwhw', '..wh.w.hw', '..whwwwhw', '..wh.w.hw', '..whhhhhw', '..wwwwwww', '....www', '.....w'],
    xin: ['.....w', '....www', '.w..www..w', '.ww.whw.ww', '.wwwwhwwww', '..wwhhhww', '...whhhw', '.wwwwwwwww', 'wwhhhhhhhww', '.wwwwwwwww'],
    ult: ['.....w', '.....w', '....www', '....whw', '....whw', '....whw', '....whw', '..wwwwwww', '....whw', '.....w', '.....w'],
  };
  ART.skillKinds = Object.keys(SKG);
  ART.skillIcon = function (el, kind) {
    kind = SKG[kind] ? kind : 'zhan'; const e = el && (EL_FX[el] || EL_CN[el]) ? elKey(el) : '';
    return cached('ski|' + e + kind, () => {
      const [D, M, H] = e ? EL_FX[e] : ['#3a3155', '#6e6a88', '#c8c4d8'], b = new Buf(16, 16), ult = kind === 'ult';
      b.add(L => { L.r(1, 0, 14, 16, ult ? GOLD : D); L.r(0, 1, 16, 14, ult ? GOLD : D); }, { noHi: !ult }); b.r(2, 2, 12, 12, hs(D, 0.7)); b.r(2, 2, 12, 1, D);
      for (let y = 3; y < 14; y++) for (let x = 2; x < 14; x++) if (BAYER[(x & 3) + (y & 3) * 4] < (y - 6)) b.p(x, y, D);
      b.m(2, 2, SKG[kind], { w: '#ffffff', h: H }); if (ult) { b.p(3, 3, '#fff2a8'); b.p(12, 3, '#fff2a8'); b.p(3, 12, '#fff2a8'); b.p(12, 12, '#fff2a8'); }
      return b.cv({ noOutline: 1 });
    });
  };

  // ---------- 四、刷宝：翻牌、器纹（星）、灵核、小图标 ----------
  // 牌 26×34。ART.lootCard('back', 0, frame 0|1)：牌背（第二帧四角闪光，给“有货”的牌轮流播）；ART.lootCard('front', tier 1～7)：牌面底（品阶色边框，中间 (5, 5) 起留 16×16 放物品图，底部 (4, 25) 起一排放三颗星）
  ART.lootCard = function (side, tier, frame) {
    tier = Math.max(1, Math.min(7, tier | 0 || 1)); frame = (frame | 0) & 1;
    return cached(['card', side, tier, frame].join('|'), () => {
      const b = new Buf(26, 34);
      if (side === 'back') {
        const P = tone('#4a3a78', '#2c2250', '#7a68b8'); b.add(L => { L.r(1, 0, 24, 34, P); L.r(0, 1, 26, 32, P); });
        b.add(L => { L.r(2, 2, 22, 1, GOLD); L.r(2, 31, 22, 1, GOLD); L.r(2, 2, 1, 30, GOLD); L.r(23, 2, 1, 30, GOLD); }, { flat: 1, sep: 0 });
        for (let y = 5; y < 29; y++) for (let x = 5; x < 21; x++) if ((x + y) % 6 === 0 || (x - y + 60) % 6 === 0) b.p(x, y, '#5a4a90');
        b.add(L => L.sy(11, '123456654321', GOLD, 13), { sep: 0 }); b.add(L => L.sy(13, '12344321', '#4a3a78', 13), { flat: 1, sep: 0 }); b.r(12, 15, 2, 4, '#fff2a8'); b.r(11, 16, 4, 2, '#fff2a8');
        if (frame) for (const [x, y] of [[4, 4], [21, 4], [4, 29], [21, 29]]) { b.r(x - 1, y, 3, 1, '#ffffff'); b.r(x, y - 1, 1, 3, '#ffffff'); }
        return b.cv();
      }
      const q = BEAM_C[tier - 1], Q = tone(q, hs(q, 0.6), lerpC(q, '#ffffff', 0.6));
      b.add(L => { L.r(1, 0, 24, 34, Q); L.r(0, 1, 26, 32, Q); }); b.r(2, 2, 22, 30, '#efe3c4'); b.r(2, 2, 22, 1, '#fff6e0'); b.r(3, 3, 20, 20, '#2c2238'); b.r(4, 4, 18, 18, '#3a3155');
      b.hl(3, 22, 23, hs(q, 0.6)); if (tier >= 4) for (const [x, y] of [[2, 2], [23, 2], [2, 31], [23, 31]]) b.p(x, y, '#ffffff');
      if (tier === 7) for (let i = 0; i < 26; i++) { b.p(i, 0, BEAM_RB[i % 6]); b.p(i, 33, BEAM_RB[(i + 3) % 6]); }
      return b.cv();
    });
  };
  // 器纹（星）7×7：on 金星 / off 空槽
  ART.star = on2 => cached('star|' + (on2 ? 1 : 0), () => { const b = new Buf(7, 7), rows = ['...x', '...x', 'xxxxxxx', '.xxxxx', '.xxxxx', '.xx.xx', 'x.....x']; b.m(0, 0, rows, { x: on2 ? '#f4c542' : '#8a8478' }); if (on2) { b.p(3, 2, '#fff2a8'); b.p(3, 3, '#ffffff'); b.p(2, 5, '#a8742a'); b.p(5, 5, '#a8742a'); } return b.cv({ noOutline: !on2 }); });
  // 灵核 16×16：精英掉的五行材料（淬灵用）
  ART.core = el => cached('core|' + (el = elKey(el)), () => {
    const [D, M, H] = EL_FX[el], b = new Buf(16, 16); b.add(L => L.sy(2, '245666665421', tone(M, D, H), 8));
    b.l(5, 5, 8, 3, '#ffffff'); b.p(5, 6, '#ffffff'); b.l(8, 8, 11, 11, D); b.l(8, 8, 4, 10, D); b.l(8, 8, 9, 3, H); b.p(8, 8, '#ffffff'); b.p(13, 3, H); b.p(2, 12, H); b.p(14, 12, '#ffffff');
    const bd = BADGE[el]; b.m(6, 9, bd.slice(2, 5).map(r => r.slice(0, 4)), { w: H, h: '#ffffff' });
    return b.cv();
  });
  const ICON7 = {
    rune: b => { b.add(L => L.sy(2, '3566777766653', tone('#8a7ab8', '#4a3a78', '#c8b8f0'), 8)); b.l(8, 4, 5, 8, '#fff2a8'); b.l(5, 8, 10, 8, '#fff2a8'); b.l(10, 8, 7, 12, '#fff2a8'); b.p(3, 3, '#ffffff'); b.p(13, 12, '#ffffff'); },   // 器纹石：熔炼带星法宝所得，洗练用
    wish: b => { b.add(L => { L.r(5, 3, 7, 11, RED); L.p(5, 14, RED); L.p(11, 14, RED); L.p(6, 14, RED); L.p(10, 14, RED); }); b.r(8, 0, 1, 3, '#f4c542'); b.r(7, 1, 3, 1, '#f4c542'); b.r(7, 5, 3, 1, '#fff2a8'); b.r(8, 6, 1, 5, '#fff2a8'); b.r(7, 8, 3, 1, '#fff2a8'); b.p(13, 4, '#fff2a8'); b.p(2, 9, '#fff2a8'); },   // 心愿签
    f_plus: b => { b.add(L => { L.l(3, 13, 9, 7, WOOD, 2); }); b.add(L => { L.r(8, 2, 6, 5, STEEL); L.r(7, 3, 8, 3, STEEL); }); b.p(2, 3, '#fff2a8'); b.r(1, 4, 3, 1, '#f4c542'); b.r(2, 3, 1, 3, '#f4c542'); b.p(13, 11, '#f4c542'); b.p(12, 13, '#fff2a8'); },   // 强化：铁锤与火星
    f_infuse: b => { b.add(L => { L.l(3, 13, 12, 4, STEEL, 2); L.p(13, 3, STEEL); }); b.add(L => { L.l(2, 11, 5, 14, GOLD, 1); }, { sep: 0 }); b.add(L => L.sy(1, '1223321', tone('#4aa8ff', '#24579a', '#d4ecff'), 5), { sep: 0 }); b.p(4, 3, '#ffffff'); b.p(8, 7, '#7fe0f0'); b.p(10, 5, '#7fe0f0'); b.p(12, 9, '#62d26f'); b.p(9, 11, '#ff6b3a'); },   // 淬灵：一滴灵液落在剑上
    f_reroll: b => { const c = '#4ccb9f', d = '#2a8a7a'; for (let i = 0; i < 20; i++) { const a = i * Math.PI / 10; if (i % 10 < 8) b.p(8 + Math.cos(a) * 5.5, 8 + Math.sin(a) * 5.5, i % 10 < 4 ? c : d); } b.r(12, 5, 3, 1, c); b.r(13, 3, 1, 3, c); b.r(1, 10, 3, 1, d); b.r(2, 10, 1, 3, d); b.r(7, 7, 3, 3, '#f4c542'); b.p(8, 8, '#fff2a8'); },   // 洗练：两支回旋箭头绕着一枚词条
    flee: b => { b.add(L => { L.r(2, 7, 8, 3, WHITE); L.sy(4, '1234321', WHITE, 12); }, { sep: 0 }); b.p(2, 12, '#928ea8'); b.p(5, 13, '#928ea8'); b.p(8, 12, '#928ea8'); },   // 撤退
    hp: b => { b.m(2, 3, HEART.split('/'), IPAL); },
    rage: b => { b.add(L => L.sy(1, '12334455554321', tone('#ff6b3a', '#a8241e', '#ffd86a'), 8)); b.add(L => L.sy(6, '12233221', '#ffd86a', 8), { flat: 1, sep: 0 }); b.r(7, 9, 2, 3, '#ffffff'); },   // 怒气（绝招槽）
  };
  { const icon6 = ART.icon; ART.icon = function (name) { if (ICON7[name]) return cached('ic7|' + name, () => { const b = new Buf(16, 16); ICON7[name](b); return b.cv(); }); return icon6(name); };
    const names6 = ART.iconNames; ART.iconNames = () => names6().concat(Object.keys(ICON7)); }

  // ---------- 五、炼器台 64×44 两帧：左边炉火，中间铁砧上一口剑，右上举锤（0）/ 落锤迸火星（1） ----------
  ART.forgeBench = frame => cached('bench|' + (frame & 1), () => {
    const f = frame & 1, b = new Buf(64, 44), ST = tone('#6a6478', '#3e3a4c', '#9a94a8'), IR = tone('#55506e', '#2c2238', '#8a86a0');
    b.add(L => { L.r(2, 12, 18, 30, ST); L.sy(6, '4689', ST, 11); L.r(8, 0, 6, 7, ST); });
    b.r(6, 24, 10, 12, '#2c2238'); b.add(L => { L.sy(27, '2345554', tone('#ff6b3a', '#a8241e', '#ffd86a'), 11); }, { sep: 0 }); b.r(10, 31 - f, 2, 3, '#fff2a8'); b.p(9 + f, 26, '#ffd86a'); b.p(12 - f, 24, '#ff6b3a');
    for (const y of [16, 20]) b.hl(4, 17, y, '#3e3a4c'); b.p(10 + f, 2 - f, '#c8c4d8'); b.p(12, 0, '#928ea8');
    b.add(L => { L.r(30, 34, 12, 8, WOOD); }); b.add(L => { L.r(26, 26, 22, 4, IR); L.r(22, 26, 6, 2, IR); L.r(31, 30, 10, 4, IR); L.r(28, 33, 16, 2, IR); });
    b.add(L => { L.r(24, 24, 20, 2, f ? tone('#ffb23f', '#d8502a', '#fff2a8') : STEEL); L.r(44, 23, 2, 4, GOLD); L.r(46, 24, 5, 2, WOOD); }, { sep: 0 });
    if (f) { b.add(L => { L.l(52, 14, 44, 20, WOOD, 2); }); b.add(L => { L.r(36, 17, 9, 6, IR); }); for (const [x, y] of [[30, 20], [27, 17], [33, 14], [48, 19], [51, 22], [25, 22], [38, 12]]) b.p(x, y, (x + y) % 2 ? '#fff2a8' : '#ffffff'); b.r(33, 21, 3, 1, '#ffffff'); b.r(34, 20, 1, 3, '#ffffff'); }
    else { b.add(L => { L.l(56, 14, 50, 4, WOOD, 2); }); b.add(L => { L.r(44, 0, 10, 6, IR); }); }
    b.add(L => { L.r(56, 30, 7, 12, WOOD); }); b.r(57, 32, 5, 6, '#4aa8ff'); b.hl(57, 61, 32, '#d4ecff'); b.hl(56, 62, 35, '#5a3a26');
    return b.cv();
  });

  // ---------- 六、高光过场 ----------
  // 集中线 200×120 两帧（透明底）：四周向 (cx, cy) 收拢，中间留椭圆空白。color 默认白
  ART.speedLines = function (frame, color, cx, cy) {
    frame = (frame | 0) & 1; color = color || '#ffffff'; cx = cx === undefined ? 100 : cx; cy = cy === undefined ? 60 : cy;
    return cached(['spd', frame, color, cx, cy].join('|'), () => on(mk(200, 120), () => {
      const r = seeded(77 + frame * 13);
      for (let i = 0; i < 54; i++) { const a = (i + r() * 0.8) * Math.PI * 2 / 54 + frame * 0.05, r0 = 46 + r() * 30, r1 = 150, w = r() < 0.3 ? 3 : r() < 0.6 ? 2 : 1; ctx.globalAlpha = 0.5 + r() * 0.5;
        const n = 26; for (let j = 0; j < n; j++) { const u = j / (n - 1), rr = r0 + (r1 - r0) * u, ww = Math.max(1, Math.round(w * (0.4 + u * 1.4))); R(cx + Math.cos(a) * rr * 1.25 - ww / 2, cy + Math.sin(a) * rr * 0.8 - ww / 2, ww + 3, ww, color); } }
      ctx.globalAlpha = 1;
    }));
  };
  // 特写带 200×48：把一张 48×48 的半身像（ART.portrait / portraitMe / portraitGen 的画布）放大两倍、裁到眉眼一带，压在斜切的色带上，带后有横向速度线。
  // color：色带主色（宗门色 / 五行色 / 朱红）；flip：人在右边、脸朝左（对手用）
  ART.cutin = function (src, color, flip, key) {
    color = color || '#d8404a';
    const draw = () => on(mk(200, 48), () => {
      const D = lerpC(color, INK, 0.72), M = lerpC(color, INK, 0.35), r = seeded(5);
      for (let y = 0; y < 48; y++) { const sk = Math.round((47 - y) * 0.25), x0 = flip ? 0 : sk, x1 = flip ? 200 - sk : 200; R(x0, y, x1 - x0, 1, y < 2 || y > 45 ? '#ffffff' : y < 4 || y > 43 ? color : D); }
      for (let i = 0; i < 26; i++) { const y = 5 + Math.floor(r() * 38), x = Math.floor(r() * 200), w = 14 + r() * 50; ctx.globalAlpha = 0.25 + r() * 0.5; R(x, y, w, 1 + (i % 3 === 0 ? 1 : 0), i % 4 ? M : color); } ctx.globalAlpha = 1;
      if (src) { const dx = flip ? 96 : 8; ctx.save(); ctx.imageSmoothingEnabled = false; if (flip) { ctx.translate(dx + 96, 0); ctx.scale(-1, 1); ctx.drawImage(src, 0, 12, 48, 20, 0, 4, 96, 40); } else ctx.drawImage(src, 0, 12, 48, 20, dx, 4, 96, 40); ctx.restore(); }
      for (let i = 0; i < 6; i++) { const x = flip ? 6 + i * 13 : 194 - i * 13 - 30; ctx.globalAlpha = 0.9 - i * 0.13; R(x, 10 + (i * 11) % 28, 30 - i * 3, 1, '#ffffff'); } ctx.globalAlpha = 1;
      for (let y = 0; y < 48; y++) { const sk = Math.round((47 - y) * 0.25); if (sk) ctx.clearRect(flip ? 200 - sk : 0, y, sk, 1); }
    });
    return key ? cached('cutin|' + key + '|' + color + (flip ? 1 : 0), draw) : draw();
  };
  // 过场背景 200×120：gate 宗门山门（入宗、继任宗主）/ clouds 云海金光（筑基、大境界）/ ink 泼墨朱日（定格、打脸、字幕卡）/ dusk 落霞擂台远景（三年之约开打前）
  const CINE_BG = {
    gate: () => {
      vgrad(0, 0, 200, 80, ramp(['#3a5a9a', '#6a8ac8', '#a8c4e8', '#f0e0c0'], 6), 0.4);
      disc(150, 34, 12, '#fff2d0'); glow(150, 34, 30, '#fff2a8', 0.5);
      paintRidge(ridgeLine(51, 200, 58, 26, 4, 2), 96, '#6a7aa8', '#a8b8d8', { lit: '#8a9ac8', dark: '#55648e' });
      paintRidge(ridgeLine(57, 200, 74, 14, 6, 1.5), 104, '#3e5a52', '#6a8a72', { lit: '#5a7a66', dark: '#2a4038' });
      for (let i = 0; i < 9; i++) { const y = 118 - i * 5, w = 78 - i * 6; R(100 - w / 2, y - 5, w, 5, i % 2 ? '#8a8698' : '#9a96a8'); R(100 - w / 2, y - 5, w, 1, '#c8c4d8'); R(100 - w / 2, y - 1, w, 1, '#55506e'); }
      for (const s of [-1, 1]) { const x = 100 + s * 30; R(x - 4, 34, 8, 44, '#a83030'); R(x - 4, 34, 2, 44, '#d8504a'); R(x + 2, 34, 2, 44, '#6a1a20'); R(x - 6, 74, 12, 4, '#8a8698'); }
      R(58, 26, 84, 6, '#3a3155'); R(54, 22, 92, 5, '#55506e'); R(54, 22, 92, 1, '#8a86a0'); for (let x = 56; x < 146; x += 6) R(x, 27, 3, 2, '#2c2238');
      R(50, 20, 6, 3, '#f4c542'); R(144, 20, 6, 3, '#f4c542'); R(84, 33, 32, 10, '#2a2a4a'); R(85, 34, 30, 8, '#f4c542'); R(86, 35, 28, 6, '#2c2238'); for (const x of [90, 97, 104]) { R(x, 36, 4, 1, '#f4c542'); R(x + 1, 36, 1, 4, '#f4c542'); R(x, 39, 4, 1, '#f4c542'); }
      for (const [x, h] of [[18, 40], [36, 30], [170, 44], [186, 28]]) pine(x, 112 - (x > 100 ? 0 : 2), h, ['#1e3a4a', '#2f5a52', '#5a8a68']);
      for (const [x, y, w] of [[10, 52, 40], [130, 62, 56], [60, 70, 30]]) { ctx.globalAlpha = 0.7; dR(x, y, w, 4, '#ffffff', 9); dR(x + 5, y - 2, w - 12, 3, '#ffffff', 7); ctx.globalAlpha = 1; }
    },
    clouds: () => {
      vgrad(0, 0, 200, 120, ramp(['#1e1a4a', '#3a3a8a', '#7a6ab8', '#f0a878', '#ffe8a8'], 6), 0.4);
      disc(100, 74, 20, '#fff6d0'); glow(100, 74, 50, '#fff2a8', 0.7);
      for (let i = 0; i < 13; i++) { const a = -Math.PI + i * Math.PI / 12; ctx.globalAlpha = i % 2 ? 0.22 : 0.4; for (let j = 0; j < 30; j++) { const rr = 26 + j * 4, w = 1 + j * 0.45; R(100 + Math.cos(a) * rr - w / 2, 74 + Math.sin(a) * rr, w, 4, '#fff2a8'); } } ctx.globalAlpha = 1;
      const r = seeded(9); for (let L2 = 0; L2 < 4; L2++) { const yb = 78 + L2 * 11, c = ['#b8a8d8', '#d8c8e8', '#f0e4f4', '#ffffff'][L2]; for (let i = 0; i < 16; i++) { const x = (i * 14 + L2 * 5) % 210 - 6, rr = 6 + r() * 7; disc(x, yb + r() * 4, Math.round(rr), c); } R(0, yb + 5, 200, 44, c); }
      for (let i = 0; i < 12; i++) R(r() * 200, 82 + r() * 34, 6 + r() * 12, 1, '#c8b8e0');
      for (let i = 0; i < 26; i++) { const b2 = r(); R(r() * 200, r() * 40, 1, 1, b2 > 0.6 ? '#ffffff' : '#9aa2dc'); }
    },
    ink: () => {
      R(0, 0, 200, 120, '#efe3c4'); const r = seeded(31); for (let i = 0; i < 140; i++) R(r() * 200, r() * 120, 1 + r() * 3, 1, i % 2 ? '#e6d8b4' : '#f6ecd0');
      disc(150, 36, 22, '#d8404a'); disc(150, 36, 20, '#e8605a'); ctx.globalAlpha = 0.5; disc(144, 30, 9, '#ff9a8a'); ctx.globalAlpha = 1;
      for (let i = 0; i < 46; i++) { const u = i / 45, x = -8 + u * 216, y = 96 - u * 46 + Math.sin(u * 9) * 5, rr = 9 + Math.sin(u * 3.1) * 7 + r() * 3; ctx.fillStyle = pat('#1b1326', rr > 11 ? 16 : 13); disc(x, y, Math.round(rr), ctx.fillStyle); }
      for (let i = 0; i < 30; i++) { const x = r() * 200, y = 40 + r() * 76, s = 1 + Math.floor(r() * 3); disc(x, y, s, '#1b1326'); }
      for (let i = 0; i < 14; i++) { const x = 10 + r() * 180, y = 52 + r() * 50; R(x, y, 8 + r() * 26, 1, '#55506e'); }
    },
    dusk: () => {
      vgrad(0, 0, 200, 86, ramp(['#2a2458', '#6a3a78', '#c8506a', '#f0905a', '#ffd88a'], 6), 0.4);
      disc(100, 78, 26, '#ffe8a8'); disc(100, 78, 22, '#fff6d8'); glow(100, 78, 54, '#ffb23f', 0.6);
      paintRidge(ridgeLine(71, 200, 74, 16, 5, 1.6), 92, '#5a2a4a', '#8a3a5a', { lit: '#a8506a', dark: '#3a1a34' });
      for (const [x, w, h] of [[6, 22, 30], [30, 16, 22], [150, 18, 26], [172, 24, 34]]) { R(x, 92 - h, w, h, '#2a1830'); R(x - 3, 90 - h, w + 6, 3, '#3a2040'); R(x + 2, 86 - h, w - 4, 4, '#2a1830'); for (let i = 0; i < 2; i++) R(x + 4 + i * 8, 98 - h + 4, 3, 4, '#ffd86a'); }
      R(0, 92, 200, 28, '#3a2a40'); R(30, 88, 140, 6, '#6a5a72'); R(30, 88, 140, 1, '#c8a8a0'); R(34, 94, 132, 22, '#4a3a52'); for (let x = 40; x < 166; x += 14) R(x, 94, 1, 22, '#2a1830');
      for (const x of [34, 164]) { R(x - 1, 60, 2, 30, '#2a1830'); R(x + 1, 62, 12, 7, '#d8404a'); R(x + 1, 62, 12, 1, '#ff9a8a'); }
      for (let i = 0; i < 24; i++) { const x = 4 + i * 8.2, h = 4 + (i * 7) % 5; R(x, 116 - h, 5, h + 4, '#1b1326'); disc(x + 2, 114 - h, 2, '#1b1326'); }
    },
  };
  ART.cineBgKinds = Object.keys(CINE_BG);
  ART.cineBg = kind => cached('cinebg|' + (CINE_BG[kind] ? kind : 'ink'), () => on(mk(200, 120), () => { CINE_BG[CINE_BG[kind] ? kind : 'ink'](); frameEdge(); }));
  // 婚书 / 休书 48×36 三帧：0 完整 / 1 撕成两半 / 2 碎片飞散（退婚时她撕，三年之约赢了以后你把休书拍回去——同一张图倒着用）
  ART.tornLetterFrames = 3;
  ART.tornLetter = frame => cached('letter|' + (frame = Math.max(0, Math.min(2, frame | 0))), () => {
    const b = new Buf(48, 36), half = (L, ox, oy, left) => { const x0 = left ? 8 : 24, x1 = left ? 23 : 39; for (let y = 4; y < 32; y++) { const jag = frame ? ((y * 7) % 3) - 1 : 0; for (let x = x0; x <= x1; x++) { if (frame && left && x > 22 + jag) continue; if (frame && !left && x < 24 + jag) continue; L.p(x + ox, y + oy, RED); } } };
    const off = frame === 0 ? [0, 0, 0, 0] : frame === 1 ? [-3, 1, 3, -1] : [-7, 4, 7, -3];
    b.add(L => half(L, off[0], off[1], true)); b.add(L => half(L, off[2], off[3], false));
    for (const [x, left] of [[12, 1], [17, 1], [28, 0], [33, 0]]) { const ox = left ? off[0] : off[2], oy = left ? off[1] : off[3]; for (let y = 8; y < 27; y += 2) b.p(x + ox, y + oy, (y % 6) ? '#fff2a8' : '#f4c542'); }
    b.r(30 + off[2], 24 + off[3], 6, 6, '#fff2a8'); b.r(31 + off[2], 25 + off[3], 4, 4, '#8a1e2e');
    if (frame === 2) for (const [x, y] of [[22, 6], [25, 14], [21, 22], [26, 28], [23, 33], [3, 10], [44, 26]]) { b.r(x, y, 2, 2, '#d8404a'); b.p(x, y, '#ff8a8a'); }
    return b.cv();
  });
}

// ====================================================================
// 阶段八·变强页（接口见 docs/ART_API.md “阶段八·变强页”，方案见 docs/KAIRO_PLAN.md “变强页重做”）
// ====================================================================
{
  const ICON8 = {
    // 荐：最划算的那一条左上角盖的红章（红底金边，中间一个向上的金箭头）
    adv_rec: b => { b.add(L => { L.r(2, 1, 12, 13, RED); L.p(2, 14, RED); L.p(3, 14, RED); L.p(12, 14, RED); L.p(13, 14, RED); L.p(4, 15, RED); L.p(11, 15, RED); }); b.hl(3, 12, 2, '#f4c542'); b.sy(4, '123', '#fff2a8', 8); b.r(7, 7, 2, 5, '#fff2a8'); b.p(7, 4, '#ffffff'); },
    // 还差：一只没装满的口袋，缺的那一块用虚线画出来
    adv_gap: b => { b.add(L => { L.sy(5, '3455554', WOOD, 8); L.r(6, 3, 4, 2, WOOD); }); b.hl(5, 10, 4, '#f4c542'); b.r(5, 9, 6, 3, '#f4c542'); b.hl(5, 10, 9, '#fff2a8'); for (let x = 5; x <= 10; x += 2) b.p(x, 7, '#efe3c4'); b.p(12, 1, '#ff9a8a'); b.r(12, 3, 1, 1, '#ff9a8a'); b.p(13, 2, '#ff9a8a'); b.p(11, 2, '#ff9a8a'); },
    // 换招：一口剑，两边一去一回两支箭头（换克制的战技 / 换上更好的）
    adv_swap: b => { b.add(L => { L.l(5, 11, 11, 5, STEEL, 2); L.p(12, 4, STEEL); }); b.add(L => { L.l(3, 10, 6, 13, GOLD, 1); L.l(3, 13, 4, 12, WOOD, 2); }, { sep: 0 }); b.p(11, 5, '#ffffff'); b.p(9, 7, '#ffffff');
      const g = '#4ccb9f', d = '#2a8a7a'; b.hl(1, 6, 2, g); b.p(5, 1, g); b.p(5, 3, g); b.p(6, 2, '#c8fff0'); b.hl(9, 14, 14, d); b.p(10, 13, d); b.p(10, 15, d); b.p(9, 14, g); },
    // 明细：一本账（纸页上三道长短不一的条）
    adv_ledger: b => { b.add(L => L.r(3, 2, 11, 13, '#efe3c4')); b.add(L => L.r(2, 2, 2, 13, WOOD), { sep: 0 }); b.r(6, 5, 6, 2, '#2a8a7a'); b.r(6, 8, 4, 2, '#f4c542'); b.r(6, 11, 2, 2, '#d8404a'); b.p(12, 5, '#4ccb9f'); },
  };
  const icon7 = ART.icon; ART.icon = function (name) { if (ICON8[name]) return cached('ic8|' + name, () => { const b = new Buf(16, 16); ICON8[name](b); return b.cv(); }); return icon7(name); };
  const names7 = ART.iconNames; ART.iconNames = () => names7().concat(Object.keys(ICON8));
}

// ====================================================================
// 阶段九·剧情（接口见 docs/ART_API.md “阶段九·剧情”，方案见 docs/STORY_PLAN.md）
// 场景底图 ART.storyBg / 关键画面 ART.storyCg / 结局画面 ART.endingPic / 表情叠加 ART.portraitX / 对话框小件
// ====================================================================
{
  const NIGHT = ['#0a0a1e', '#141438', '#232458', '#3a3a7a'];
  const stars = (seed, n, h, w) => { const r = seeded(seed); for (let i = 0; i < n; i++) { const b = r(); R(r() * (w || 200), r() * h, 1, 1, b > 0.7 ? '#ffffff' : b > 0.35 ? '#9aa2dc' : '#55508a'); } };
  const snow = (seed, n) => { const r = seeded(seed); for (let i = 0; i < n; i++) { const x = r() * 200, y = r() * 120; R(x, y, r() < 0.25 ? 2 : 1, 1, r() < 0.5 ? '#ffffff' : '#c8d4f0'); } };
  const rays = (cx, cy, n, len, col, a) => { for (let i = 0; i < n; i++) { const an = -Math.PI + i * Math.PI / (n - 1); ctx.globalAlpha = (i % 2 ? 0.5 : 1) * a; for (let j = 0; j < len; j++) { const rr = 8 + j * 4, w = 1 + j * 0.4; R(cx + Math.cos(an) * rr - w / 2, cy + Math.sin(an) * rr, w, 4, col); } } ctx.globalAlpha = 1; };
  const cloudBand = (seed, y, col, n) => { const r = seeded(seed); for (let i = 0; i < (n || 16); i++) disc((i * 14 + seed * 3) % 212 - 6, y + r() * 4, Math.round(5 + r() * 7), col); R(0, y + 5, 200, 120 - y, col); };
  const dim = (a, col) => { ctx.globalAlpha = a; R(0, 0, 200, 120, col); ctx.globalAlpha = 1; };
  // 小人：脚底 (x, y)，全高 h。o = { robe, trim, hair, skin, face 1 朝右 / -1 朝左, back 背影, long 披发, sword 1 垂剑 / 2 举剑 / 3 背剑 / 4 平刺, kneel, sit, sil 剪影色, sc 剑色 }
  function sFig(x, y, h, o) {
    o = o || {}; x = Math.round(x); y = Math.round(y);
    const S = o.sil, robe = S || o.robe || '#5b6fd6', dark = S || lerpC(shade(robe, 0.62), COOL, 0.25), lit = S || lerpC(robe, '#ffffff', 0.3), skin = S || o.skin || '#f2c9a0', hair = S || o.hair || '#2a2230', f = o.face || 1, low = o.kneel || o.sit;
    const hr = Math.max(2, Math.round(h * 0.12)), bh = Math.round(h * (low ? 0.44 : 0.72)), top = y - bh + 1, sw = Math.max(2, Math.round(h * 0.14)), hw = Math.max(3, Math.round(h * (low ? 0.3 : 0.2)));
    if (o.sword === 3) line(x - f * (sw + 2), top + Math.round(bh * 0.5), x + f * (sw + 1), top - hr - 2, S || o.sc || '#c8d4e8');
    for (let i = 0; i < bh; i++) { const w = Math.round(sw + (hw - sw) * Math.pow(i / Math.max(1, bh - 1), low ? 0.6 : 1.3)); R(x - w, top + i, w * 2 + 1, 1, robe); R(f > 0 ? x - w : x + w - 1, top + i, 2, 1, dark); if (i < bh * 0.5) R(f > 0 ? x + w : x - w, top + i, 1, 1, lit); }
    if (!S) { R(x - sw, top + Math.round(bh * (low ? 0.55 : 0.42)), sw * 2 + 1, 1, o.trim || '#f6ecd0'); if (!o.back) R(x, top, 1, Math.round(bh * 0.4), o.trim || '#f6ecd0'); }
    const hy = top - hr; disc(x, hy, hr, hair);
    if (!o.back && !S) { R(f > 0 ? x - 1 : x - hr + 1, hy - 1, hr, hr + 1, skin); R(x - hr + 1, hy - hr, hr * 2 - 1, Math.max(1, hr - 1), hair); }
    if (o.long) R(f > 0 ? x - hr - 1 : x + hr - 1 - (o.back ? hr : 0), hy, 2 + (o.back ? hr : 0), Math.round(h * 0.34), hair);
    const hx = x + f * (sw + 1), hyy = top + Math.round(bh * (low ? 0.5 : 0.42)), sc = S || o.sc || '#e8f0ff', L = Math.round(h * 0.5);
    if (o.sword === 1) line(hx, hyy, hx + f * Math.round(L * 0.45), Math.min(y, hyy + Math.round(L * 0.9)), sc);
    if (o.sword === 2) line(hx, top + 1, hx + f * Math.round(L * 0.55), top - Math.round(L * 0.95), sc);
    if (o.sword === 4) { line(hx, top + 3, hx + f * L, top + 2, sc); R(hx - (f < 0 ? 1 : 0), top + 2, 2, 3, S || '#f4c542'); }
  }
  const groundMen = (seed, n, y, col, x0, x1) => { const r = seeded(seed); for (let i = 0; i < n; i++) { const x = x0 + (x1 - x0) * (i + r() * 0.6) / n, h = 5 + Math.floor(r() * 3); R(x, y - h, 3, h, col); disc(x + 1, y - h - 1, 1, col); if (r() < 0.4) R(x + 3, y - h - 5, 1, 7, col); } };
  const lamp = (x, y, c) => { glow(x, y, 7, c || '#ffb23f', 0.5); R(x - 1, y - 2, 3, 4, c || '#ffd86a'); R(x - 1, y - 3, 3, 1, '#8a1e2e'); R(x, y - 1, 1, 2, '#fff6d8'); };
  const stoneFloor = (y, c1, c2, cl) => { R(0, y, 200, 120 - y, c1); R(0, y, 200, 1, cl); for (let i = 0; i < 6; i++) { const yy = y + 3 + i * i * 0.9 + i * 2; if (yy < 120) R(0, yy, 200, 1, c2); } for (let i = -8; i <= 8; i++) line(100 + i * 13, y + 1, 100 + i * 24, 119, c2); };
  function steleBase() {
    vgrad(0, 0, 200, 96, ramp(['#1e2a4a', '#3a4a7a', '#6a7aa8', '#a8b4d0'], 6), 0.4);
    paintRidge(ridgeLine(47, 200, 60, 26, 3, 2.2), 96, '#4a5a84', '#8a9ac0', { snow: 46 });
    for (const x of [12, 40, 160, 188]) { const h = x < 30 || x > 170 ? 104 : 80; R(x - 5, 100 - h, 10, h, '#e0e4f0'); R(x - 5, 100 - h, 3, h, '#ffffff'); R(x + 3, 100 - h, 2, h, '#a0a8c0'); R(x - 7, 96 - h, 14, 4, '#aeb8c8'); R(x - 7, 96, 14, 4, '#aeb8c8'); }
    R(0, 0, 200, 6, '#2a3050'); R(0, 6, 200, 2, '#aeb8c8');
    stoneFloor(96, '#7a8098', '#6a7088', '#c8d0e8');
    for (const s of [-1, 1]) { const x = 100 + s * 34; R(x - 1, 70, 2, 26, '#aeb8c8'); R(x - 3, 82, 6, 1, '#5a6480'); }
  }

  const STORY_BG = {
    // 破庙夜：塌了半边的屋顶漏下月光，残佛，一堆将熄的火
    temple: () => {
      vgrad(0, 0, 200, 120, ramp(['#0c0a1c', '#1a1636', '#2a2450'], 6), 0.4); stars(3, 30, 40);
      disc(138, 22, 9, '#e8ecff'); disc(141, 20, 8, '#1a1636'); glow(136, 22, 22, '#9aa8ff', 0.35);
      ctx.globalAlpha = 0.16; for (let i = 0; i < 46; i++) R(96 + i * 0.35, 30 + i * 2, 34 + i * 0.5, 2, '#c8d4ff'); ctx.globalAlpha = 1;
      R(0, 0, 200, 8, '#1a1424'); R(0, 8, 84, 6, '#241a2c'); R(150, 8, 50, 9, '#241a2c'); for (let i = 0; i < 9; i++) R(84 + i * 3, 8 + (i % 3), 3, 5 - (i % 4), '#241a2c');
      line(60, 6, 112, 30, '#3a2a30', 3); line(170, 4, 150, 26, '#3a2a30', 3); R(0, 14, 12, 106, '#2a2030'); R(188, 17, 12, 103, '#2a2030'); R(12, 14, 3, 106, '#1a1424'); R(185, 17, 3, 103, '#1a1424');
      for (const x of [34, 166]) { R(x - 4, 14, 8, 84, '#4a2a2c'); R(x - 4, 14, 2, 84, '#6a3a38'); R(x + 2, 14, 2, 84, '#2a1820'); R(x - 6, 94, 12, 4, '#3a3040'); }
      R(78, 62, 44, 30, '#3a3448'); R(74, 88, 52, 8, '#2e283c'); R(74, 88, 52, 1, '#55506e'); ellipse(100, 60, 15, 12, '#4a445e'); disc(100, 42, 9, '#4a445e'); R(92, 30, 16, 5, '#4a445e'); disc(100, 30, 3, '#4a445e');
      R(92, 40, 9, 12, '#5a5470'); for (let i = 0; i < 10; i++) R(104 + (i % 3), 34 + i * 2, 5 - (i % 3), 2, '#1a1636'); R(86, 58, 28, 1, '#6a6480'); R(93, 43, 3, 1, '#1a1424'); R(99, 43, 3, 1, '#1a1424');
      R(0, 96, 200, 24, '#221c2e'); R(0, 96, 200, 1, '#3a3448'); const r = seeded(8); for (let i = 0; i < 40; i++) R(r() * 200, 98 + r() * 22, 2 + r() * 6, 1, i % 2 ? '#2e283c' : '#1a1424');
      ctx.globalAlpha = 0.3; dR(110, 97, 50, 14, '#c8d4ff', 6); ctx.globalAlpha = 1;
      glow(52, 104, 22, '#ff8a3a', 0.45); R(44, 107, 16, 2, '#3a2a20'); line(44, 108, 58, 104, '#4a3020', 2); R(49, 101, 5, 6, '#ff8a3a'); R(50, 99, 3, 6, '#ffd86a'); R(51, 97, 1, 3, '#fff6d8');
      for (const [x, y] of [[20, 20], [24, 26], [178, 30], [174, 24]]) line(x, y, x + 8, y + 10, '#3a3448');
    },
    // 洞府石室：石壁、蒲团、一盏灯、书架
    cave: () => {
      R(0, 0, 200, 120, '#2a2438'); const r = seeded(4); for (let i = 0; i < 90; i++) { const x = r() * 200, y = r() * 88; R(x, y, 4 + r() * 12, 1 + (i % 3 === 0 ? 1 : 0), i % 2 ? '#342c46' : '#221c30'); }
      for (let x = 0; x < 200; x += 2) { const h = 6 + Math.abs(Math.sin(x * 0.11) * 7 + Math.sin(x * 0.37) * 3); R(x, 0, 2, h, '#16121e'); }
      R(0, 0, 14, 120, '#16121e'); R(186, 0, 14, 120, '#16121e'); for (let y = 0; y < 120; y += 3) { R(14, y, 2 + (y * 7 % 4), 3, '#16121e'); R(184 - (y * 5 % 4), y, 4, 3, '#16121e'); }
      disc(150, 40, 17, '#16121e'); disc(150, 40, 15, '#232458'); disc(155, 35, 5, '#e8ecff'); R(135, 40, 31, 1, '#16121e'); R(150, 25, 1, 31, '#16121e'); glow(150, 40, 26, '#6a7adc', 0.25);
      R(24, 34, 40, 54, '#3a2a24'); for (let k = 0; k < 3; k++) { R(26, 37 + k * 17, 36, 13, '#1e1620'); for (let i = 0; i < 9; i++) R(27 + i * 4, 39 + k * 17 + (i * 3 % 3), 3, 11 - (i * 3 % 3), ['#8a3a3a', '#3a5a8a', '#c8a84a', '#4a7a5a', '#6a4a8a'][(i + k) % 5]); }
      stoneFloor(88, '#3a3448', '#2a2438', '#5a5470');
      ellipse(100, 106, 22, 5, '#5a3a26'); ellipse(100, 105, 20, 4, '#8a5c36'); ellipse(100, 104, 14, 2, '#b98a4c');
      R(170, 74, 2, 16, '#3a2a24'); lamp(171, 72); ctx.globalAlpha = 0.18; dR(140, 88, 50, 14, '#ffb23f', 6); ctx.globalAlpha = 1;
    },
    // 落霞城街巷：白日，屋檐酒旗，远处城楼
    town: () => {
      vgrad(0, 0, 200, 70, ramp(['#5a8ad0', '#8ab4e8', '#c8e0f4', '#f6e8c8'], 6), 0.4);
      for (const [x, y, w] of [[20, 14, 40], [120, 22, 50]]) { ctx.globalAlpha = 0.85; dR(x, y, w, 4, '#ffffff', 10); dR(x + 6, y - 3, w - 16, 3, '#ffffff', 8); ctx.globalAlpha = 1; }
      paintRidge(ridgeLine(91, 200, 56, 18, 4, 1.5), 74, '#8a9ac0', '#c8d4e8');
      R(84, 34, 32, 36, '#8a7a72'); R(80, 30, 40, 5, '#5a3a3a'); R(76, 28, 48, 3, '#3a2a30'); R(88, 20, 24, 9, '#a85a4a'); R(84, 17, 32, 4, '#3a2a30'); R(96, 48, 8, 22, '#2a2030');
      const house = (x, w, h, f) => { R(x, 74 - h, w, h + 22, '#d8c8a8'); R(x, 74 - h, w, 2, '#a89878'); R(x - 4, 68 - h, w + 8, 7, '#4a4a6a'); R(x - 4, 68 - h, w + 8, 1, '#7a7a9a'); for (let i = 0; i < w + 8; i += 3) R(x - 4 + i, 70 - h, 1, 5, '#3a3a56'); R(x + 4, 80 - h, w - 8, 8, '#5a3a26'); R(x + 5, 81 - h, w - 10, 6, '#2a2030'); R(x + (f > 0 ? w - 12 : 4), 76, 9, 20, '#5a3a26'); };
      house(52, 24, 22, 1); house(126, 24, 24, -1); house(0, 46, 40, 1); house(154, 46, 44, -1);
      for (const [x, y, c] of [[48, 44, '#d8404a'], [150, 40, '#2a8a7a']]) { R(x, y, 1, 22, '#3a2a24'); R(x + 1, y, 9, 14, c); R(x + 1, y, 9, 1, lerpC(c, '#ffffff', 0.4)); R(x + 4, y + 3, 3, 8, '#fff6d8'); }
      R(0, 96, 200, 24, '#b8a890'); R(0, 96, 200, 1, '#e6d8b4'); const r = seeded(6); for (let i = 0; i < 50; i++) R(r() * 200, 98 + r() * 22, 5 + r() * 9, 1, i % 2 ? '#a89878' : '#c8b8a0');
      for (const [x, c] of [[62, '#8a3a3a'], [70, '#3a5a8a'], [132, '#4a7a5a'], [140, '#c8a84a']]) sFig(x, 98, 12, { robe: c, face: x < 100 ? 1 : -1 });
    },
    // 灯会夜河：拱桥、河灯、两岸灯笼
    lantern: () => {
      vgrad(0, 0, 200, 70, ramp(NIGHT, 6), 0.4); stars(14, 46, 50); disc(40, 20, 8, '#fff2d0'); glow(40, 20, 20, '#ffe8a8', 0.35);
      for (const [x, w, h] of [[0, 34, 26], [30, 22, 18], [150, 20, 20], [168, 32, 30]]) { R(x, 70 - h, w, h, '#16122e'); R(x - 3, 68 - h, w + 6, 3, '#231c40'); for (let i = 0; i < 3; i++) if ((x + i) % 2) R(x + 4 + i * 8, 76 - h, 3, 4, '#ffd86a'); }
      vgrad(0, 70, 200, 50, ramp(['#141438', '#1e1e52', '#101030'], 6), 0.4);
      for (let i = 0; i < 26; i++) { const x = (i * 37) % 200, y = 74 + (i * 13) % 44; R(x, y, 6 + (i % 5) * 3, 1, '#2e2e6a'); }
      for (let x = 62; x <= 138; x++) { const u = (x - 100) / 38, y = 72 - Math.round((1 - u * u) * 12); R(x, y, 1, 78 - y, x % 2 ? '#141438' : '#101030'); }
      for (let x = 44; x <= 156; x++) { const u = (x - 100) / 56, y = 66 - Math.round((1 - u * u) * 16); R(x, y, 1, 5, '#55506e'); R(x, y, 1, 1, '#8a86a0'); if (x % 8 === 0) R(x, y - 5, 1, 5, '#3a3155'); R(x, y - 5, 1, 1, '#3a3155'); }
      R(44, 68, 18, 10, '#3a3155'); R(138, 68, 18, 10, '#3a3155');
      const r = seeded(19); for (let i = 0; i < 16; i++) { const x = 8 + r() * 184, y = 84 + r() * 26, c = ['#ffb23f', '#ff7a5a', '#ffd86a', '#f6a0c0'][i % 4]; glow(x, y, 5, c, 0.4); R(x - 1, y - 1, 3, 2, c); R(x, y - 2, 1, 1, '#fff6d8'); ctx.globalAlpha = 0.35; R(x - 1, y + 2, 3, 3, c); ctx.globalAlpha = 1; }
      for (let i = 0; i < 9; i++) lamp(48 + i * 13, 50 - Math.round((1 - Math.pow((i - 4) / 4.4, 2)) * 15), i % 2 ? '#ff7a5a' : '#ffd86a');
      R(0, 113, 200, 7, '#16122e'); R(0, 113, 200, 1, '#3a3155');
    },
    // 药庐：草庐、药圃、晒药的匾、远山晨雾
    herb: () => {
      vgrad(0, 0, 200, 70, ramp(['#8ac0c8', '#b8dcd0', '#e8f0d0', '#fff6dc'], 6), 0.4); disc(160, 26, 9, '#fff6d8'); glow(160, 26, 26, '#fff2a8', 0.5);
      paintRidge(ridgeLine(23, 200, 50, 22, 3, 1.6), 78, '#7aa898', '#d8ecd8'); paintRidge(ridgeLine(29, 200, 66, 12, 5, 1.3), 84, '#4a8a6a', '#a8d0a8', { trees: '#2f6a52' });
      ctx.globalAlpha = 0.6; dR(0, 62, 200, 8, '#ffffff', 8); ctx.globalAlpha = 1;
      R(0, 84, 200, 36, '#6a9a5a'); R(0, 84, 200, 1, '#a8d08a');
      R(18, 50, 56, 38, '#d8c8a0'); R(18, 50, 56, 2, '#a89868'); for (let i = 0; i < 16; i++) R(10 + i * 2.2, 50 - i, 72 - i * 4.4, 1, i % 2 ? '#b98a4c' : '#a8742a'); R(36, 62, 14, 26, '#5a3a26'); R(37, 63, 12, 25, '#2a2030'); R(56, 60, 12, 10, '#5a3a26'); R(57, 61, 10, 8, '#f6ecd0'); R(62, 61, 1, 8, '#5a3a26');
      for (let i = 0; i < 4; i++) { const y = 92 + i * 5; R(84, y, 110, 3, '#5a3a26'); for (let x = 86; x < 192; x += 5) { const c = ['#4ccb9f', '#8fe08a', '#f6a0c0', '#ffd86a', '#c27dff'][(x + i * 2) % 5]; R(x, y - 3, 2, 3, '#2f6a52'); R(x, y - 4, 2, 1, c); } }
      for (let x = 0; x < 200; x += 6) { R(x, 110, 1, 10, '#b98a4c'); R(x + 3, 112, 1, 8, '#8a5c36'); } R(0, 113, 200, 1, '#b98a4c'); R(0, 117, 200, 1, '#8a5c36');
      for (const x of [92, 116]) { ellipse(x, 80, 9, 3, '#8a5c36'); ellipse(x, 79, 8, 2, x === 92 ? '#c8a84a' : '#a85a4a'); R(x - 6, 82, 1, 5, '#5a3a26'); R(x + 6, 82, 1, 5, '#5a3a26'); }
    },
    // 天剑宗山门：冷蓝天色，剑一样的山峰，长阶，阶旁巨剑石雕
    tjgate: () => {
      vgrad(0, 0, 200, 90, ramp(['#2a3a6a', '#4a6aa0', '#8aa8d0', '#d0e0f0'], 6), 0.4);
      for (const [x, w, h, c] of [[30, 18, 70, '#5a6a94'], [58, 12, 52, '#6a7aa4'], [150, 20, 76, '#5a6a94'], [176, 14, 56, '#6a7aa4'], [100, 26, 84, '#4a5a84']]) { for (let i = 0; i < h; i++) { const ww = Math.max(1, Math.round(w * (i / h))); R(x - ww / 2, 96 - h + i, ww, 1, c); R(x - ww / 2, 96 - h + i, Math.max(1, ww / 4), 1, lerpC(c, '#ffffff', 0.35)); } R(x - 1, 96 - h, 2, 6, '#f4f6ff'); }
      ctx.globalAlpha = 0.75; dR(0, 70, 200, 8, '#ffffff', 9); dR(20, 64, 90, 5, '#ffffff', 6); ctx.globalAlpha = 1;
      R(0, 96, 200, 24, '#4a5068');
      for (let i = 0; i < 12; i++) { const y = 118 - i * 4, w = 100 - i * 6; R(100 - w / 2, y - 4, w, 4, i % 2 ? '#7a8098' : '#8a90a8'); R(100 - w / 2, y - 4, w, 1, '#c8d0e8'); }
      R(64, 44, 72, 5, '#2a3050'); R(60, 40, 80, 5, '#3a4268'); R(60, 40, 80, 1, '#8a96c8'); for (const s of [-1, 1]) { R(100 + s * 28 - 3, 49, 6, 24, '#e8ecf8'); R(100 + s * 28 - 3, 49, 2, 24, '#ffffff'); R(100 + s * 28 + 1, 49, 2, 24, '#a8b0c8'); } R(86, 50, 28, 8, '#2a3050'); R(88, 52, 24, 4, '#aeb8c8');
      for (const s of [-1, 1]) { const x = 100 + s * 70; R(x - 2, 60, 4, 50, '#aeb8c8'); R(x - 2, 60, 1, 50, '#eef4ff'); R(x - 1, 56, 2, 4, '#eef4ff'); R(x - 6, 96, 12, 3, '#5a6480'); R(x - 1, 99, 2, 8, '#5a6480'); R(x - 8, 108, 16, 12, '#55506e'); R(x - 8, 108, 16, 1, '#8a86a0'); }
    },
    // 天剑宗祖师碑前：廊柱，正中一块高碑
    stele: () => { steleBase(); R(88, 30, 24, 62, '#6a7088'); R(88, 30, 3, 62, '#9aa0b8'); R(109, 30, 3, 62, '#4a5068'); R(86, 26, 28, 5, '#4a5068'); R(90, 22, 20, 5, '#5a6078'); for (let i = 0; i < 9; i++) R(96 + (i % 2) * 5, 38 + i * 5, 3, 3, '#3a4058'); R(82, 90, 36, 6, '#4a5068'); R(82, 90, 36, 1, '#8a90a8'); },
    // 碎碑：碑断成两截，碎石满地（“碎碑正名”之后）
    stele2: () => { steleBase(); R(88, 66, 24, 26, '#6a7088'); R(88, 66, 3, 26, '#9aa0b8'); for (let i = 0; i < 12; i++) R(88 + i * 2, 62 + (i * 5 % 5), 2, 5, '#6a7088'); R(82, 90, 36, 6, '#4a5068'); R(82, 90, 36, 1, '#8a90a8');
      for (let i = 0; i < 12; i++) { R(124 + i, 94 + i * 0.5, 22 - i, 1, '#5a6078'); } R(124, 93, 22, 1, '#8a90a8'); const r = seeded(27); for (let i = 0; i < 22; i++) { const x = 60 + r() * 90, y = 98 + r() * 16, s = 1 + Math.floor(r() * 4); R(x, y, s + 1, s, i % 2 ? '#6a7088' : '#4a5068'); R(x, y, s + 1, 1, '#9aa0b8'); } },
    // 三千年前·渡劫台（回忆，褪色青蓝）：孤台、漩涡劫云
    trib3k: () => {
      vgrad(0, 0, 200, 120, ramp(['#0e1420', '#1c2c40', '#34506a', '#6a8a9a'], 6), 0.4);
      for (let i = 0; i < 150; i++) { const a = i * 0.42, rr = 6 + i * 0.52; ctx.globalAlpha = 0.5; disc(100 + Math.cos(a) * rr * 1.5, 22 + Math.sin(a) * rr * 0.42, 4 + (i % 4), i % 3 ? '#1c2434' : '#3a4a60'); } ctx.globalAlpha = 1;
      disc(100, 22, 6, '#e8f4ff'); glow(100, 22, 22, '#a8d8ff', 0.6);
      paintRidge(ridgeLine(43, 200, 92, 16, 4, 1.4), 120, '#1c2c40', '#34506a');
      for (let i = 0; i < 38; i++) { const w = 26 + i * 1.3; R(100 - w, 82 + i, w * 2, 1, i < 2 ? '#a8c0d0' : i % 6 === 0 ? '#3a5068' : '#4a6a84'); } R(66, 80, 68, 3, '#6a8a9a'); R(66, 80, 68, 1, '#c8e0f0');
      for (const x of [70, 130]) { R(x - 2, 60, 4, 20, '#4a6a84'); R(x - 2, 60, 1, 20, '#8ab0c8'); R(x - 3, 58, 6, 2, '#6a8a9a'); }
      const r = seeded(77); for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.25; R(r() * 200, r() * 120, 1, 3 + r() * 5, '#c8e0f0'); } ctx.globalAlpha = 1;
    },
    // 正魔大战：黄昏的谷地，左蓝右红两军对阵，中间空出一条路
    field: () => {
      vgrad(0, 0, 200, 84, ramp(['#2a1a3a', '#6a2a4a', '#c8503a', '#f0a050', '#ffe0a0'], 6), 0.4); disc(100, 70, 16, '#fff2c8'); glow(100, 70, 44, '#ffb23f', 0.6);
      for (let i = 0; i < 60; i++) { ctx.globalAlpha = 0.5; disc((i * 37) % 70 - 8, 8 + (i * 7) % 24, 5, '#3a4a8a'); disc(138 + (i * 31) % 70, 8 + (i * 11) % 24, 5, '#6a1a2a'); } ctx.globalAlpha = 1;
      paintRidge(ridgeLine(61, 200, 62, 24, 3, 1.8), 84, '#3a2040', '#8a4a50');
      R(0, 84, 200, 36, '#3a2a34'); R(0, 84, 200, 1, '#8a5a50'); const r = seeded(33); for (let i = 0; i < 50; i++) R(r() * 200, 86 + r() * 34, 4 + r() * 10, 1, i % 2 ? '#4a3640' : '#2a1e28');
      ctx.globalAlpha = 0.3; for (let i = 0; i < 36; i++) R(100 - 6 - i * 0.6, 84 + i, 12 + i * 1.2, 1, '#ffd88a'); ctx.globalAlpha = 1;
      for (let k = 0; k < 3; k++) { groundMen(40 + k, 9 + k * 2, 94 + k * 10, ['#2a3a6a', '#22305a', '#1a2648'][k], -4, 78 - k * 8); groundMen(50 + k, 9 + k * 2, 94 + k * 10, ['#6a1a2a', '#5a1420', '#481018'][k], 122 + k * 8, 204); }
      for (const [x, y, h, c, f] of [[18, 94, 24, '#4aa8ff', 1], [52, 104, 28, '#4aa8ff', 1], [182, 94, 24, '#c8323c', -1], [148, 104, 28, '#c8323c', -1]]) { R(x, y - h, 1, h, '#1b1326'); R(f > 0 ? x + 1 : x - 10, y - h, 10, 6, c); R(f > 0 ? x + 1 : x - 10, y - h, 10, 1, lerpC(c, '#ffffff', 0.4)); }
    },
    // 血煞魔宗·血池大殿：黑石柱、血池、骨座、红月
    blood: () => {
      vgrad(0, 0, 200, 120, ramp(['#0e0408', '#2a0a14', '#4a1020', '#2a0a14'], 6), 0.4);
      disc(100, 30, 15, '#8a1020'); disc(100, 30, 13, '#c8323c'); disc(96, 26, 5, '#e8605a'); glow(100, 30, 40, '#c8323c', 0.45);
      for (const x of [16, 46, 154, 184]) { const h = x < 30 || x > 170 ? 108 : 88; R(x - 6, 110 - h, 12, h, '#1a0c14'); R(x - 6, 110 - h, 3, h, '#3a1a26'); R(x + 4, 110 - h, 2, h, '#0a0408'); R(x - 8, 106 - h, 16, 4, '#2a1420'); R(x - 1, 116 - h, 2, 12, '#c8323c'); }
      R(84, 46, 32, 34, '#1a0c14'); R(80, 40, 6, 44, '#2a1420'); R(114, 40, 6, 44, '#2a1420'); for (const x of [80, 114]) { R(x, 36, 2, 5, '#e8e0d0'); R(x + 4, 36, 2, 5, '#e8e0d0'); } R(88, 62, 24, 4, '#4a1020'); R(84, 78, 32, 4, '#2a1420');
      for (let i = 0; i < 5; i++) R(70 - i * 6, 82 + i * 3, 60 + i * 12, 3, i % 2 ? '#2a1420' : '#1a0c14');
      ellipse(100, 108, 78, 11, '#4a0a14'); ellipse(100, 108, 74, 9, '#8a1020'); ellipse(100, 107, 66, 6, '#c8323c'); for (let i = 0; i < 12; i++) R(34 + (i * 29) % 130, 104 + (i * 5) % 8, 8 + (i % 3) * 4, 1, '#e8605a'); for (const [x, y] of [[60, 104], [128, 109], [96, 111]]) { disc(x, y, 2, '#e8605a'); R(x, y - 1, 1, 1, '#ffb0a0'); }
      R(0, 0, 200, 4, '#0a0408');
    },
    // 墨离衣冠冢：老松、无字小碑、细雪
    grave: () => {
      vgrad(0, 0, 200, 86, ramp(['#4a5878', '#7a88a8', '#b0bcd0', '#e0e4ec'], 6), 0.4);
      paintRidge(ridgeLine(83, 200, 58, 24, 3, 1.6), 90, '#6a789a', '#c8d0e0', { snow: 60 }); paintRidge(ridgeLine(87, 200, 78, 10, 5, 1.2), 96, '#8a94ac', '#e0e4ec', { snow: 84 });
      R(0, 90, 200, 30, '#e8ecf4'); R(0, 90, 200, 1, '#ffffff'); const r = seeded(15); for (let i = 0; i < 30; i++) R(r() * 200, 92 + r() * 28, 6 + r() * 14, 1, '#c8d0e0');
      ellipse(110, 96, 22, 7, '#a8aec0'); ellipse(110, 94, 20, 6, '#f4f6ff'); R(102, 70, 16, 24, '#5a6078'); R(102, 70, 3, 24, '#8a90a8'); R(100, 67, 20, 4, '#4a5068'); R(100, 66, 20, 1, '#f4f6ff'); R(98, 94, 24, 3, '#4a5068');
      line(52, 100, 58, 50, '#3a2a28', 3); line(57, 62, 76, 48, '#3a2a28', 2); line(55, 72, 38, 60, '#3a2a28', 2); for (const [x, y, w] of [[60, 42, 24], [78, 46, 16], [34, 56, 18], [52, 34, 16]]) { ellipse(x, y, w / 2, 4, '#1e3a4a'); ellipse(x, y - 1, w / 2 - 1, 3, '#2f5a52'); R(x - w / 2 + 2, y - 4, w - 4, 2, '#f4f6ff'); }
      R(128, 96, 5, 4, '#8a5c36'); R(129, 94, 3, 2, '#d8c8a0'); R(136, 97, 3, 3, '#aeb8c8'); snow(55, 70);
    },
    // 宗门大殿：长阶尽头的宗主座，两排灯
    hall: () => {
      vgrad(0, 0, 200, 120, ramp(['#1a1428', '#2a2040', '#3a2c52'], 6), 0.4);
      R(60, 20, 80, 58, '#2a2040'); R(62, 22, 76, 56, '#3a2c52'); disc(100, 40, 14, '#c8a84a'); disc(100, 40, 12, '#3a2c52'); disc(100, 40, 8, '#f4c542'); disc(100, 40, 6, '#3a2c52'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; R(100 + Math.cos(a) * 10 - 1, 40 + Math.sin(a) * 10 - 1, 2, 2, '#fff2a8'); } glow(100, 40, 26, '#f4c542', 0.3);
      R(86, 56, 28, 22, '#6a2a2c'); R(86, 56, 28, 2, '#c8a84a'); R(82, 50, 5, 28, '#8a3a34'); R(113, 50, 5, 28, '#8a3a34'); R(90, 66, 20, 4, '#a84a40');
      for (let i = 0; i < 7; i++) { const y = 78 + i * 5, w = 56 + i * 16; R(100 - w / 2, y, w, 5, i % 2 ? '#4a4058' : '#55506e'); R(100 - w / 2, y, w, 1, '#8a86a0'); R(100 - 9 - i, y, 18 + i * 2, 5, i % 2 ? '#8a1e2e' : '#a83030'); }
      R(0, 113, 200, 7, '#2a2040');
      for (const x of [14, 44, 156, 186]) { const h = x < 30 || x > 170 ? 110 : 92; R(x - 6, 112 - h, 12, h, '#6a2a2c'); R(x - 6, 112 - h, 3, h, '#a84a40'); R(x + 4, 112 - h, 2, h, '#3a1a20'); R(x - 8, 108 - h, 16, 4, '#c8a84a'); R(x - 8, 108, 16, 4, '#4a4058'); }
      for (const s of [-1, 1]) for (let i = 0; i < 2; i++) lamp(100 + s * (62 + i * 22), 90 + i * 12);
    },
    // 天门：云海之上两扇巨门，门缝漏光
    heaven: () => {
      vgrad(0, 0, 200, 120, ramp(['#141040', '#2a2a7a', '#6a6ac0', '#c8b8e8', '#fff2d0'], 6), 0.4); stars(71, 50, 46);
      rays(100, 62, 15, 26, '#fff2a8', 0.3); glow(100, 60, 46, '#fff2a8', 0.6);
      for (const s of [-1, 1]) { const x = s < 0 ? 62 : 104; R(x, 14, 34, 86, '#c8a84a'); R(x + 2, 16, 30, 84, '#8a6a2a'); R(x + 4, 18, 26, 82, '#a8842e'); for (let k = 0; k < 3; k++) { R(x + 7, 24 + k * 26, 20, 18, '#c8a84a'); R(x + 9, 26 + k * 26, 16, 14, '#8a6a2a'); disc(x + 17, 33 + k * 26, 3, '#f4c542'); } R(s < 0 ? x + 30 : x + 2, 54, 3, 10, '#fff2a8'); }
      R(96, 14, 8, 86, '#fffbe8'); R(98, 14, 4, 86, '#ffffff'); glow(100, 56, 14, '#ffffff', 0.7);
      R(54, 6, 92, 9, '#8a6a2a'); R(50, 2, 100, 6, '#c8a84a'); R(50, 2, 100, 1, '#fff2a8'); for (const x of [54, 142]) { R(x - 4, 8, 8, 92, '#e8e0d0'); R(x - 4, 8, 2, 92, '#ffffff'); R(x + 2, 8, 2, 92, '#a8a0b0'); }
      cloudBand(5, 92, '#b8a8d8'); cloudBand(9, 100, '#e0d4f0'); cloudBand(13, 108, '#ffffff', 18);
    },
    // 天外：门后没有仙宫，只有一片星海，悬着数不清的卷——“它们出题，从不改卷”
    void: () => {
      vgrad(0, 0, 200, 120, ramp(['#04040c', '#0a0a22', '#16103a', '#0a0a22'], 6), 0.4); stars(101, 150, 120);
      for (let i = 0; i < 80; i++) { const a = i * 0.5, rr = 10 + i * 1.1; ctx.globalAlpha = 0.25; R(100 + Math.cos(a) * rr * 1.5, 50 + Math.sin(a) * rr * 0.5, 2, 1, i % 2 ? '#6a5ac0' : '#c27dff'); } ctx.globalAlpha = 1;
      const r = seeded(64); for (let i = 0; i < 17; i++) { const x = 10 + r() * 180, y = 8 + r() * 84, w = 7 + Math.floor(r() * 9), d = r() < 0.5; if (x > 64 && x < 128 && y > 16 && y < 80) continue; ctx.globalAlpha = 0.45 + r() * 0.55; R(x, y, w, 2, '#c8a84a'); R(x + 1, y + 2, w - 2, d ? 12 : 7, '#efe3c4'); for (let k = 0; k < (d ? 4 : 2); k++) R(x + 2, y + 4 + k * 2, w - 4 - (k % 2) * 2, 1, '#8a7a5a'); R(x, y + (d ? 14 : 9), w, 1, '#c8a84a'); } ctx.globalAlpha = 1;
      glow(100, 54, 40, '#c27dff', 0.3);
      R(74, 30, 52, 3, '#f4c542'); R(76, 33, 48, 44, '#fff6dc'); R(74, 77, 52, 3, '#f4c542'); for (let k = 0; k < 6; k++) R(82, 39 + k * 5, 36 - (k * 7) % 12, 1, '#c8b48c'); R(106, 62, 12, 10, '#d8404a'); R(108, 64, 8, 6, '#fff6dc'); R(110, 66, 4, 2, '#d8404a');
      cloudBand(21, 110, '#16103a', 14);
    },
  };
  ART.storyBgKinds = Object.keys(STORY_BG);
  ART.storyBg = kind => (STORY_BG[kind] ? cached('sbg|' + kind, () => on(mk(200, 120), () => { STORY_BG[kind](); frameEdge(); })) : ART.cineBg(kind));

  // ---------- 关键画面（大特写 / 定格）200×120 ----------
  const ME_ROBE = '#5b6fd6', ELDER = { robe: '#7aa8e0', hair: '#f0f9ff', skin: '#a6cdee', trim: '#e6f6ff', long: 1 };
  const bigRing = (cx, cy, f) => {
    const jade = ['#2a8a7a', '#5fd3b0', '#c8fff0'], rust = ['#4a2a20', '#8a5030', '#b87a4a'];
    const isJ = a => f === 2 || (f === 1 && (a > 200 || a < 40));
    for (let a = 0; a < 360; a += 1) { const t = a * Math.PI / 180, P = isJ(a) ? jade : rust;
      for (let rr = 22; rr <= 33; rr++) R(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.62, 2, 2, rr < 25 ? P[0] : rr > 30 ? (Math.sin(t) < -0.2 ? P[2] : P[1]) : P[1]); }
    const r = seeded(12 + f); if (f < 2) for (let i = 0; i < 46; i++) { const t = r() * 6.28, rr = 23 + r() * 9; if (isJ((t * 180 / Math.PI) % 360)) continue; R(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.62, 2, 1, i % 3 ? '#3a2018' : '#c88a50'); }
    R(cx - 12, cy - 30, 24, 12, f === 2 ? jade[0] : rust[0]); R(cx - 10, cy - 28, 20, 8, f === 2 ? jade[1] : f === 1 ? '#6a9a80' : rust[1]); R(cx - 10, cy - 28, 20, 1, f === 2 ? jade[2] : rust[2]); R(cx - 2, cy - 27, 4, 6, f ? '#e8fff8' : '#3a2018'); R(cx - 6, cy - 25, 12, 2, f ? '#e8fff8' : '#3a2018');
    if (f) { glow(cx, cy - 24, f === 2 ? 26 : 12, '#8ff0d0', f === 2 ? 0.6 : 0.35); for (let i = 0; i < (f === 2 ? 16 : 6); i++) { const t = r() * 6.28, rr = 36 + r() * 16; R(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr * 0.7, 1, 1, '#c8fff0'); } }
    if (f === 1) for (let i = 0; i < 9; i++) R(cx + 20 + r() * 26, cy - 6 + i * 4 + r() * 3, 2, 2, rust[i % 3]);
  };
  const STORY_CG = {
    // 锈戒大特写：三帧（满锈 / 剥落一半 / 玉色）
    ring: f => { vgrad(0, 0, 200, 120, ramp(f === 2 ? ['#0e2a30', '#1a4a4a', '#2a6a5a'] : ['#141020', '#241a30', '#3a2a40'], 6), 0.4); ellipse(100, 100, 50, 7, '#0a0810'); bigRing(100, 66, f); },
    // 三千年前那一剑。0 = 老祖记得的：墨离持剑刺来；1 = 真相：剑越过师父肩头，刺的是他背后举剑的陆天衡
    stab: f => {
      STORY_BG.trib3k(); dim(0.25, '#0a1018');
      const S = '#060a12', rim = (x, y, h, o) => { sFig(x - 1, y, h, Object.assign({}, o, { sil: '#6a8aa8' })); sFig(x, y, h, o); };
      if (f) { rim(136, 83, 44, { sil: S, face: -1, sword: 2, long: 1 }); glow(124, 30, 6, '#ff5a4a', 0.6); }
      sFig(100, 83, 46, { robe: '#a8c4d8', hair: '#e8f4ff', trim: '#e8f4ff', sc: '#e8f4ff', back: 1, long: 1 });
      rim(54, 83, 42, { sil: S, face: 1 });
      const tx = f ? 130 : 93, ty = f ? 44 : 60; line(64, 58, tx, ty, '#e8f4ff'); line(64, 59, tx, ty + 1, '#a8d8ff');
      if (f) { glow(tx, ty, 9, '#ffffff', 0.7); for (let i = 0; i < 7; i++) line(tx, ty, tx + Math.cos(i) * 12, ty + Math.sin(i * 1.7) * 9, '#ffffff'); } else glow(tx, ty, 7, '#ffffff', 0.5);
      glow(100, 22, 30, '#a8d8ff', 0.5); for (const x of [92, 104, 110]) line(100, 24, x, 44, '#e8f4ff');
    },
    // 陆天衡跪在碑前，腰间那截断剑解下来横在地上（f = 1 用碎碑底）
    kneel: f => { (f ? STORY_BG.stele2 : STORY_BG.stele)(); dim(0.3, '#0a1020'); sFig(100, 114, 44, { robe: '#e8ecf8', hair: '#3a3a52', skin: '#e8c8a8', trim: '#aeb8c8', back: 1, kneel: 1, long: 1 }); R(56, 112, 22, 2, '#8a5030'); R(56, 112, 22, 1, '#b87a4a'); R(52, 111, 5, 4, '#4a2a20'); glow(66, 112, 8, '#8ff0d0', 0.3); },
    // 玄霄三截：0 三截排开 / 1 合一、通体青光
    sword: f => {
      vgrad(0, 0, 200, 120, ramp(['#101428', '#1c2444', '#2c3866'], 6), 0.4); if (f) { rays(100, 60, 17, 24, '#8ff0d0', 0.25); glow(100, 60, 50, '#8ff0d0', 0.5); }
      const seg = (x0, x1, y, rusty) => { for (let x = x0; x <= x1; x++) { R(x, y - 3, 1, 7, rusty ? '#8a5030' : '#c8fff0'); R(x, y - 3, 1, 2, rusty ? '#b87a4a' : '#ffffff'); R(x, y + 3, 1, 1, rusty ? '#4a2a20' : '#5fd3b0'); R(x, y, 1, 1, rusty ? '#6a3a26' : '#8ff0d0'); } };
      if (f) { seg(52, 164, 60, 0); for (let i = 0; i < 8; i++) R(164 + i, 60 - 3 + Math.ceil(i / 2), 1, 7 - i, '#c8fff0'); R(44, 52, 8, 17, '#2a8a7a'); R(46, 54, 4, 13, '#5fd3b0'); R(22, 58, 22, 5, '#3a2a24'); for (let i = 0; i < 5; i++) R(24 + i * 4, 58, 2, 5, '#c8a84a'); R(18, 57, 4, 7, '#f4c542'); }
      else { seg(30, 66, 40, 1); R(22, 34, 8, 13, '#4a2a20'); R(8, 38, 14, 5, '#3a2a24'); for (let i = 0; i < 6; i++) R(66 + i, 40 - 3 + i, 1, 7 - i, '#8a5030');
        seg(82, 124, 62, 1); for (let i = 0; i < 5; i++) { R(77 + i, 62 + 1 - i, 1, i + 2, '#8a5030'); R(124 + i, 62 - 3 + i, 1, 6 - i, '#8a5030'); }
        seg(136, 176, 84, 1); for (let i = 0; i < 6; i++) R(130 + i, 84 + 3 - i, 1, i + 1, '#8a5030'); for (let i = 0; i < 8; i++) R(176 + i, 84 - 3 + Math.ceil(i / 2), 1, 7 - i, '#8a5030');
        for (const [x, y] of [[48, 40], [102, 62], [156, 84]]) glow(x, y, 10, '#8ff0d0', 0.22); }
    },
    // 两块玉简：0 分开 / 1 合上，裂缝里漏光
    jade: f => { vgrad(0, 0, 200, 120, ramp(['#141020', '#1e2a3a', '#2a4a4a'], 6), 0.4); const d = f ? 0 : 14; if (f) { rays(100, 60, 13, 22, '#c8fff0', 0.3); glow(100, 60, 40, '#8ff0d0', 0.6); }
      for (const s of [-1, 1]) { const x0 = s < 0 ? 62 - d : 100 + d; R(x0, 30, 38, 60, '#2a8a7a'); R(x0 + 2, 32, 34, 56, '#5fd3b0'); R(x0 + 2, 32, 34, 2, '#c8fff0'); for (let k = 0; k < 9; k++) R(x0 + 6, 38 + k * 5, 26 - (k * 5 + (s > 0 ? 3 : 0)) % 9, 1, '#2a6a5a'); for (let y = 30; y < 90; y += 3) { const j = (y * 7) % 5; if (s < 0) R(x0 + 38 - j, y, j, 3, f ? '#c8fff0' : '#1a2434'); else R(x0, y, 4 - j, 3, f ? '#c8fff0' : '#1a2434'); } }
      if (f) R(99, 30, 2, 60, '#ffffff'); },
    // 最后的访客：门缝漏进一线光（0 门掩着 / 1 门开了，门外一个人影）
    door: f => { R(0, 0, 200, 120, '#120e1c'); R(40, 10, 120, 104, '#241a2c'); const gap = f ? 44 : 6; R(100 - gap / 2, 14, gap, 100, '#ffe8b0'); glow(100, 64, f ? 50 : 22, '#ffb23f', 0.5);
      for (const s of [-1, 1]) { const w = 56 - gap / 2, x = s < 0 ? 44 : 100 + gap / 2; R(x, 14, w, 100, '#3a2a30'); for (let k = 0; k < 4; k++) R(x + 4, 20 + k * 24, w - 8, 18, '#2a1e26'); R(s < 0 ? x + w - 5 : x + 2, 60, 3, 8, '#c8a84a'); }
      if (f) sFig(100, 114, 50, { sil: '#1a1020', long: 1 });
      R(0, 114, 200, 6, '#0a0810'); ctx.globalAlpha = 0.5; for (let i = 0; i < 6; i++) R(100 - gap / 2 - i * 5, 114 + i, gap + i * 10, 1, '#ffb23f'); ctx.globalAlpha = 1; },
    // 老祖消散：背影自下而上化成光点（0 完整 / 1 半身 / 2 只剩光，地上一枚玉戒）
    fade: f => { STORY_BG.temple(); dim(0.35, '#0a0a1e'); glow(100, 70, 40, '#a8d8ff', 0.4);
      if (f < 2) { const c = on(mk(200, 120), () => sFig(100, 104, 52, Object.assign({ back: 1 }, ELDER))), g2 = c.getContext('2d'); g2.globalCompositeOperation = 'destination-out'; if (f) for (let y = 60; y < 120; y++) for (let x = 60; x < 140; x++) if (BAYER[(x & 3) + (y & 3) * 4] < (y - 62) * 0.7) g2.fillRect(x, y, 1, 1); ctx.globalAlpha = 0.9; ctx.drawImage(c, 0, 0); ctx.globalAlpha = 1; }
      const r = seeded(90 + f); for (let i = 0; i < 30 + f * 40; i++) { const x = 100 + (r() - 0.5) * (50 + f * 30), y = 104 - r() * (30 + f * 36); R(x, y, r() < 0.2 ? 2 : 1, 1, r() < 0.5 ? '#ffffff' : '#a8d8ff'); }
      if (f === 2) { R(98, 100, 5, 3, '#5fd3b0'); R(99, 99, 3, 1, '#c8fff0'); glow(100, 101, 10, '#8ff0d0', 0.6); } },
    // 并肩：山巅两个背影看日出。f 传颜色串 = 同行者的道袍色（缺省是老祖）
    two: f => { vgrad(0, 0, 200, 90, ramp(['#2a2458', '#6a4a8a', '#e88a6a', '#ffd88a', '#fff6d8'], 6), 0.4); disc(100, 74, 20, '#fff6d8'); glow(100, 74, 50, '#ffb23f', 0.6); rays(100, 74, 13, 22, '#fff2a8', 0.2);
      cloudBand(31, 80, '#e8a8a0'); cloudBand(35, 90, '#f6d0c0'); for (let i = 0; i < 40; i++) { const w = 30 + i * 2.6; R(100 - w, 96 + i * 0.6, w * 2, 2, i < 2 ? '#8a6a8a' : '#3a2a44'); } R(0, 112, 200, 8, '#2a1e34');
      const other = typeof f === 'string'; sFig(86, 98, 34, { robe: ME_ROBE, back: 1, sword: 3 }); sFig(114, 98, 36, { robe: other ? f : ELDER.robe, hair: other ? '#2a2230' : ELDER.hair, trim: other ? '#f6ecd0' : ELDER.trim, back: 1, long: 1 }); },
  };
  ART.storyCgIds = Object.keys(STORY_CG);
  ART.storyCgFrames = { ring: 3, stab: 2, kneel: 2, sword: 2, jade: 2, door: 2, fade: 3, two: 1 };
  ART.storyCg = (id, f) => (STORY_CG[id] ? cached('scg|' + id + '|' + (f || 0), () => on(mk(200, 120), () => { STORY_CG[id](f || 0); frameEdge(); })) : null);

  // ---------- 结局画面 200×120 ----------
  const ENDING = {
    // 师徒同归：天门前一高一矮两道身影，白发的那位回头
    shitu: () => { STORY_BG.heaven(); sFig(90, 102, 26, { robe: ME_ROBE, back: 1, sword: 3 }); ctx.globalAlpha = 0.88; sFig(110, 101, 30, Object.assign({ face: -1 }, ELDER)); ctx.globalAlpha = 1; glow(110, 84, 14, '#a8d8ff', 0.4); },
    // 问天：一人一剑斩向那张最大的卷，卷从中裂开
    wentian: () => { STORY_BG.void(); for (let i = 0; i < 50; i++) { const dx = Math.round(Math.sin(i * 0.9) * 2); R(99 + dx, 30 + i, 3, 1, '#04040c'); R(100 + dx, 30 + i, 1, 1, '#ff5a4a'); } glow(100, 52, 16, '#ff5a4a', 0.5);
      for (let i = 0; i < 14; i++) R(72 + i * 2, 96 - i * 2, 3, 1, i % 2 ? '#c8fff0' : '#ffffff'); sFig(58, 118, 28, { robe: ME_ROBE, face: 1, sword: 2, sc: '#c8fff0' }); },
    // 地仙·守人间：破庙修好了屋顶，窗里有灯，檐下挂剑，一路的灯点到庙门口
    dixian: () => { vgrad(0, 0, 200, 84, ramp(['#3a4a8a', '#8a7ab0', '#f0a890', '#ffe0a8'], 6), 0.4); disc(40, 62, 12, '#fff2c8'); glow(40, 62, 30, '#ffb23f', 0.5);
      paintRidge(ridgeLine(53, 200, 60, 20, 4, 1.5), 86, '#5a5a8a', '#c8a8b0'); R(0, 84, 200, 36, '#5a7a4a'); R(0, 84, 200, 1, '#a8c880');
      for (let i = 0; i < 12; i++) R(160 - i * 0.3, 38 - i * 2.4, 3 + (i % 3), 2, '#e8e0e8');
      R(70, 50, 84, 40, '#d8c8a0'); R(70, 50, 84, 2, '#a89868'); for (let i = 0; i < 18; i++) R(60 + i * 2.6, 50 - i, 104 - i * 5.2, 1, i % 2 ? '#4a4a6a' : '#3a3a56'); R(60, 49, 104, 2, '#7a7a9a');
      R(102, 62, 18, 28, '#5a3a26'); R(104, 64, 14, 26, '#ffd88a'); R(110, 64, 1, 26, '#5a3a26'); glow(111, 76, 16, '#ffb23f', 0.5); for (const x of [80, 130]) { R(x, 62, 14, 12, '#5a3a26'); R(x + 1, 63, 12, 10, '#ffd88a'); R(x + 7, 63, 1, 10, '#5a3a26'); }
      line(148, 54, 148, 72, '#e8f0ff'); R(146, 52, 5, 2, '#5fd3b0');
      ellipse(52, 96, 10, 3, '#8a5c36'); ellipse(52, 95, 9, 2, '#c8a84a'); sFig(126, 98, 18, { robe: ME_ROBE, sit: 1, face: -1 }); for (let x = 4; x < 200; x += 9) { R(x, 104 + (x % 4), 2, 3, '#2f6a52'); R(x, 103 + (x % 4), 2, 1, x % 3 ? '#f6a0c0' : '#ffd86a'); }
      for (let i = 0; i < 9; i++) lamp(8 + i * 23, 114 - (i % 2) * 3); },
    // 孤峰：雪峰之巅一人独坐，身后一把空着的高座
    gufeng: () => { vgrad(0, 0, 200, 120, ramp(['#0a0c1c', '#1a2040', '#3a4a70', '#8a94b0'], 6), 0.4); stars(44, 40, 50); disc(150, 24, 10, '#e8ecff'); glow(150, 24, 26, '#9aa8ff', 0.3);
      paintRidge(ridgeLine(73, 200, 84, 20, 4, 1.8), 120, '#2a3458', '#5a6890', { snow: 80 });
      for (let i = 0; i < 62; i++) { const w = 16 + i * 1.1 + Math.round(Math.sin(i * 0.8) * 2); R(100 - w, 58 + i, w * 2, 1, '#2e3858'); R(100 - w, 58 + i, Math.max(1, w * 0.35), 1, '#4a5880'); if (i < 5 + (i % 2)) R(100 - w, 58 + i, w * 2, 1, '#f4f6ff'); else if (i < 12) dR(100 - w, 58 + i, w * 2, 1, '#f4f6ff', 14 - i); }
      R(90, 24, 20, 34, '#2a2a4a'); R(90, 24, 3, 34, '#4a4a80'); R(88, 18, 24, 7, '#3a3a66'); R(88, 18, 24, 1, '#8a8ac0'); R(93, 44, 14, 14, '#4a1a2a'); R(93, 44, 14, 1, '#8a3a4a');
      sFig(100, 70, 24, { robe: '#c8d0e8', hair: '#1a1a2a', trim: '#8a94b0', sit: 1, back: 1, long: 1 }); snow(88, 60); },
    // 魔尊：红月下的骨座，一人独坐，阶下万魔俯首
    mozun: () => { STORY_BG.blood(); sFig(100, 78, 30, { robe: '#5a0a1c', hair: '#1a0c14', skin: '#e8c8b8', trim: '#f4c542', sit: 1, long: 1 }); groundMen(81, 16, 100, '#0a0408', 20, 180); glow(100, 30, 30, '#ff5a4a', 0.4); },
    // 道侣·苏：药圃边并肩两个背影
    daolv_su: () => { STORY_BG.herb(); sFig(124, 106, 28, { robe: ME_ROBE, back: 1, sword: 3 }); sFig(144, 106, 26, { robe: '#7fd8b0', hair: '#3a2a24', back: 1, long: 1, trim: '#ffffff' }); },
    // 道侣·夜：屋顶对坐，中间一坛酒，一轮红月
    daolv_ye: () => { vgrad(0, 0, 200, 120, ramp(NIGHT, 6), 0.4); stars(52, 60, 80); disc(150, 30, 16, '#c8323c'); disc(150, 30, 14, '#e8605a'); glow(150, 30, 36, '#c8323c', 0.4);
      for (let i = 0; i < 40; i++) { const w = 20 + i * 2.6; R(100 - w, 80 + i, w * 2, 1, i % 4 === 0 ? '#2a2456' : '#3a3470'); } for (let x = 20; x < 180; x += 6) R(x, 96 + (x % 4), 4, 2, '#4a4488'); R(60, 78, 80, 3, '#55508a');
      sFig(82, 79, 24, { robe: ME_ROBE, sit: 1, face: 1 }); sFig(118, 79, 24, { robe: '#a81e3a', hair: '#1a0c14', sit: 1, face: -1, long: 1, trim: '#f4c542' }); R(97, 72, 6, 6, '#8a5c36'); R(98, 70, 4, 2, '#d8404a'); },
    // 止戈：两面旗插在一处，兵器堆上长了草，远处炊烟
    zhige: () => { vgrad(0, 0, 200, 86, ramp(['#6a9ad0', '#a8c8e8', '#e8f0e0', '#fff6dc'], 6), 0.4); disc(150, 28, 10, '#fff6d8'); glow(150, 28, 28, '#fff2a8', 0.5);
      paintRidge(ridgeLine(61, 200, 62, 24, 3, 1.8), 88, '#6a9a8a', '#c8e0c8'); R(0, 86, 200, 34, '#7aa85a'); R(0, 86, 200, 1, '#b8e08a');
      for (const [x, c, f] of [[94, '#4aa8ff', -1], [106, '#c8323c', 1]]) { line(x, 100, x - f * 4, 40, '#3a2a24', 2); R(f > 0 ? x - 3 : x - 9, 40, 14, 9, c); R(f > 0 ? x - 3 : x - 9, 40, 14, 1, lerpC(c, '#ffffff', 0.4)); }
      ellipse(100, 102, 26, 6, '#5a6480'); for (const [a, b2] of [[84, 92], [96, 88], [110, 90], [118, 94]]) line(a, 104, a + (a < 100 ? -6 : 6), b2, '#aeb8c8'); for (let x = 78; x < 124; x += 4) { R(x, 96 + (x % 5), 1, 4, '#2f6a52'); if (x % 3 === 0) R(x, 95 + (x % 5), 1, 1, '#ffd86a'); }
      for (let i = 0; i < 10; i++) R(30 - i * 0.4, 66 - i * 3, 3 + (i % 3), 2, '#f4f6ff'); R(22, 72, 18, 14, '#d8c8a0'); R(20, 68, 22, 5, '#8a5c36'); for (let x = 4; x < 200; x += 11) { R(x, 108 + (x % 6), 2, 3, '#2f6a52'); R(x, 107 + (x % 6), 2, 1, x % 2 ? '#f6a0c0' : '#ffffff'); } },
  };
  ART.endingPicIds = Object.keys(ENDING);
  // 没有专图的结局落到原有的 ART.backdrop（ascend / rest / summit / hermit）
  ART.endingPic = id => (ENDING[id] ? cached('endpic|' + id, () => on(mk(200, 120), () => { ENDING[id](); frameEdge(); })) : (ART.backdrop(id) || ART.backdrop('ascend')));

  // ---------- 表情叠加：在原有五种表情上再叠一层 ----------
  // ART.portraitX(id | 画布, mood, fx, alt)。fx（可用空格连写）：tear 泪 / shade 眉眼压一层阴影（决绝、黑化）/ blush 脸红 / blood 嘴角血 / sweat 冷汗 / mono 回忆（褪成青蓝）/ fade 余音（半透明、下半身化成光点）
  ART.portraitFxNames = ['tear', 'shade', 'blush', 'blood', 'sweat', 'mono', 'fade'];
  ART.portraitX = function (id, mood, fx, alt) {
    const isCv = id && typeof id !== 'string', src = isCv ? id : ART.portrait(id, mood, alt); if (!src) return null; if (!fx) return src;
    const key = isCv ? '' : (P_ALIAS[id] || id), spec = isCv ? null : (alt && PEOPLE[key + '2']) || PEOPLE[key], F = (spec && spec.F) || {}, ey = F.ey || 24, ex = F.ex || 17;
    const make = () => {
      const c = mk(48, 48), g = c.getContext('2d'), has = k => (' ' + fx + ' ').includes(' ' + k + ' '); g.drawImage(src, 0, 0);
      const px = (x, y, col, a) => { if (!g.getImageData(x, y, 1, 1).data[3]) return; g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = col; g.fillRect(x, y, 1, 1); g.globalAlpha = 1; };
      if (has('shade')) { const d = g.getImageData(0, 0, 48, 48).data; for (let y = ey - 8; y <= ey + 4; y++) for (let x = 6; x < 42; x++) { const i = (y * 48 + x) * 4; if (d[i + 3] && d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 > 120) px(x, y, '#1b1326', y <= ey + 1 ? 0.5 : y === ey + 2 ? 0.34 : (x + y) % 2 ? 0.3 : 0.12); } }
      if (has('blush')) for (const sx of [ex - 2, 46 - ex]) for (let k = 0; k < 4; k++) { px(sx + k, ey + 5, '#ff8a8a', 0.75); if (k % 2) px(sx + k, ey + 6, '#ff8a8a', 0.5); }
      if (has('tear')) for (const sx of [ex + 1, 46 - ex]) { px(sx, ey + 3, '#c8f0ff'); px(sx, ey + 4, '#8ad0ff'); px(sx, ey + 5, '#8ad0ff'); px(sx, ey + 6, '#c8f0ff'); px(sx, ey + 8, '#8ad0ff', 0.8); }
      if (has('sweat')) { px(36, ey - 5, '#c8f0ff'); px(36, ey - 4, '#8ad0ff'); px(36, ey - 3, '#8ad0ff'); px(35, ey - 3, '#c8f0ff'); px(37, ey - 3, '#8ad0ff'); }
      if (has('blood')) { const my = F.my || ey + 7; px(27, my, '#c8323c'); px(27, my + 1, '#c8323c'); px(28, my + 2, '#8a1020'); px(28, my + 3, '#c8323c', 0.8); }
      if (has('mono')) { const d = g.getImageData(0, 0, 48, 48), p = d.data; for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255; p[i] = Math.round(20 + l * 170); p[i + 1] = Math.round(34 + l * 196); p[i + 2] = Math.round(56 + l * 190); } g.putImageData(d, 0, 0); }
      if (has('fade')) { const d = g.getImageData(0, 0, 48, 48), p = d.data; for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) { const i = (y * 48 + x) * 4; if (!p[i + 3]) continue; const lv = (y - 28) * 0.8 + Math.sin(x * 0.9 + y * 0.5) * 2; if (BAYER[(x & 3) + (y & 3) * 4] < lv) p[i + 3] = 0; else { p[i + 3] = Math.round(p[i + 3] * 0.82); p[i] = Math.min(255, p[i] + 24); p[i + 1] = Math.min(255, p[i + 1] + 30); p[i + 2] = Math.min(255, p[i + 2] + 36); } } g.putImageData(d, 0, 0);
        const r = seeded(7); g.fillStyle = '#c8f0ff'; for (let i = 0; i < 16; i++) g.fillRect(4 + Math.floor(r() * 40), 30 + Math.floor(r() * 18), 1, 1); }
      return c;
    };
    return isCv ? make() : cached(['ptx', id, mood, fx, alt ? 1 : 0].join('|'), make);
  };

  // ---------- 对话场景小件 ----------
  Object.assign(FRAMES, {
    // 对话框：深墨底、金角（字用米白）
    talk: { fill: '#1e1830', ink: '#f6ecd0', draw: b => { box(b, '#1e1830', '#3a3155', '#0e0a18'); ring(b, 0, '#0e0a18'); ring(b, 1, '#55506e'); for (const [x, y, dx, dy] of [[1, 1, 1, 1], [18, 1, -1, 1], [1, 18, 1, -1], [18, 18, -1, -1]]) { b.p(x, y, '#f4c542'); b.p(x + dx, y, '#f4c542'); b.p(x, y + dy, '#f4c542'); b.p(x + dx * 2, y, '#a8742a'); b.p(x, y + dy * 2, '#a8742a'); } } },
    // 名牌：朱红小签（说话的人）；talkNameMe：主角用青色
    talkName: { fill: '#a8303a', ink: '#fff6e0', draw: b => { box(b, '#a8303a', '#d8504a', '#6a1a20'); ring(b, 0, '#1b1326'); b.hl(3, 16, 17, '#f4c542'); } },
    talkNameMe: { fill: '#2a6a7a', ink: '#eafff8', draw: b => { box(b, '#2a6a7a', '#4a9aa8', '#16404a'); ring(b, 0, '#1b1326'); b.hl(3, 16, 17, '#8ff0d0'); } },
    // 抉择选项：米纸底、左边一道朱红竖条（“这一句会改变后面的故事”）
    talkPick: { fill: '#efe3c4', ink: '#3b2b1f', draw: b => { box(b, '#efe3c4', '#fff6dc', '#c8b48c'); ring(b, 0, '#1b1326'); b.r(1, 1, 3, 18, '#d8404a'); b.r(1, 1, 1, 18, '#ff8a8a'); } },
  });
  // “下一句”小三角 9×8，两帧（上下跳 1 像素）
  ART.talkNext = frame => cached('talknext|' + (frame & 1), () => { const b = new Buf(9, 8), y = frame & 1; for (let i = 0; i < 4; i++) b.hl(1 + i, 7 - i, 1 + y + i, i ? '#f4c542' : '#fff2a8'); return b.cv(); });
  const ICON9 = {
    // 抉择：岔路（一条路分成两条，路口一块小牌）
    branch: b => { b.add(L => { L.l(8, 14, 8, 8, WOOD, 2); L.l(8, 8, 3, 3, WOOD, 2); L.l(9, 8, 13, 3, WOOD, 2); }); b.r(2, 1, 3, 2, '#4ccb9f'); b.r(12, 1, 3, 2, '#d8404a'); b.r(6, 10, 6, 3, '#f4c542'); b.hl(6, 11, 10, '#fff2a8'); },
    // 回响：一圈圈荡开的涟漪（“先前的选择在这里起了作用”）
    echo: b => { b.add(L => { for (const [r, c] of [[6, '#2a8a7a'], [4, '#5fd3b0']]) for (let a = 0; a < 32; a++) { if (r === 6 && a % 8 === 0) continue; const t = a * Math.PI / 16; L.p(Math.round(8 + Math.cos(t) * r), Math.round(8 + Math.sin(t) * r * 0.8), c); } }); b.r(7, 7, 2, 2, '#c8fff0'); },
    // 结局：一扇半开的门里透出光
    ending: b => { b.add(L => L.r(3, 2, 10, 13, '#8a6a2a')); b.r(5, 4, 6, 11, '#fff2a8'); b.r(5, 4, 3, 11, '#c8a84a'); b.p(7, 9, '#fff2a8'); b.r(9, 6, 1, 7, '#ffffff'); },
  };
  const icon8 = ART.icon; ART.icon = function (name) { if (ICON9[name]) return cached('ic9|' + name, () => { const b = new Buf(16, 16); ICON9[name](b); return b.cv(); }); return icon8(name); };
  const names8 = ART.iconNames; ART.iconNames = () => names8().concat(Object.keys(ICON9));
}

// ====================================================================
// 阶段十·剧情立绘（接口见 docs/ART_API.md “阶段十·立绘”）
// 关键人物的大立绘 96×128（腰以上）：老祖 / 苏 / 夜 / 慕容（各带男版）/ 楚天阔 / 赵乾 / 血无涯 / 陆天衡 / 云无极 / 主角（发色、肤色、男女、道袍随境界）。
// 六种表情（n joy ang shock sad cold）是眉、眼、口三层差分；七种叠加（tear shade blush blood sweat mono fade）和 48×48 的 portraitX 同名同义。
// 没有立绘的人物：ART.tachie 返回 null，调用方退回 ART.portrait / portraitX 的小像。
// ====================================================================
{
  const TW = 96, TH = 128, T_MOODS = ['n', 'joy', 'ang', 'shock', 'sad', 'cold'];
  // 脸型：chin 下巴尖的 y，wj 下巴半宽，a 收的快慢
  const tShape = (chin, wj, a) => ({ chin, W: 16, hw(y) { if (y < 26) return Math.round(16 - (26 - y) * (26 - y) * 0.09); if (y <= 44) return 16; const t = (y - 44) / (chin - 44); return Math.max(2, Math.round(wj + (16 - wj) * (1 - Math.pow(t, a))) - (y === chin ? 1 : 0)); } });
  const T_SHAPE = { round: tShape(59, 6, 1.9), oval: tShape(60, 5, 1.6), sharp: tShape(61, 3, 1.35), square: tShape(60, 10, 2.6), long: tShape(63, 5, 1.6), wide: tShape(59, 9, 2.3) };
  // 眼睛 9 列（画面左边那只，外眼角在左；右眼镜像）。L 睫 I 瞳 i 虹膜 j 虹膜亮部 h 高光 w 眼白 u 下睑阴影
  const T_EYES = {
    f: {
      n: ['.LLLLLLL.', 'LLIIIIILL', 'LwhhIiiw.', '.whIIiiw.', '.wiIIijw.', '..ijjjj..', '...uuu...'],
      joy: ['.........', '.........', '..LLLLL..', '.LL...LL.', 'LL.....LL', '.........'],
      ang: ['LL.......', 'LLLLL....', '.LLLLLLLL', '.whIIiiw.', '.wiIIijw.', '..ijjjj..'],
      shock: ['..LLLLL..', '.LwwwwwL.', 'LwwhIiwwL', 'LwwIIiwwL', 'LwwwijwwL', '.uwwwwwu.', '..uuuuu..'],
      sad: ['.........', '...LLLLL.', 'LLLLIIILL', 'LwhIIiiw.', '.wiIIijw.', '..ijjjj..', '...uuu...'],
      cold: ['.........', '.........', 'LLLLLLLLL', '.LIIIIIL.', '.whIIijw.', '..ijjjj..'],
    },
    m: {
      n: ['.........', '.LLLLLLL.', 'LLIIIIiLL', '.whIIiiw.', '.wiIIijw.', '..ijjjj..', '...uuu...'],
      joy: ['.........', '.........', '..LLLLL..', '.LL...LL.', 'L.......L', '.........'],
      ang: ['L........', 'LLLL.....', '.LLLLLLLL', '.whIIiiw.', '.wiIIijw.', '...jjj...'],
      shock: ['..LLLLL..', '.LwwwwwL.', 'LwwhIiwwL', 'LwwIIiwwL', 'LwwwwwwwL', '.uuuuuuu.'],
      sad: ['.........', '..LLLLLL.', 'LLLIIIiLL', '.whIIiiw.', '.wiIIijw.', '...ujj...'],
      cold: ['.........', '.........', 'LLLLLLLLL', '.wIIIIiw.', '..hIIij..', '...uuu...'],
    },
    // 窄长的眼（老者、宗主）
    n: {
      n: ['.........', '.........', '.LLLLLLL.', 'L.wIIiw..', '..uuuuu..', '.........'],
      joy: ['.........', '.........', '..LLLLL..', '.L.....L.', 'L.......L', '.........'],
      ang: ['.........', 'L........', '.LLLLLLLL', '..wIIiw..', '.........', '.........'],
      shock: ['.........', '..LLLLL..', '.LwwwwwL.', 'LwwIIiwwL', '.uwwwwwu.', '.........'],
      sad: ['.........', '.........', '.........', 'LLLLLLLL.', '..wiIiw..', '..uuuu...'],
      cold: ['.........', '.........', '.........', 'LLLLLLLLL', '...IIi...', '.........'],
    },
    // 平时闭着的眼（云无极）：怒 / 惊才睁开
    c: {
      n: ['.........', '.........', '.........', 'L.......L', '.LLLLLLL.', '.........'],
      joy: ['.........', '.........', '..LLLLL..', '.LL...LL.', 'L.......L', '.........'],
      ang: ['.........', '.........', 'LLLLLLLLL', '.wjiIijw.', '..jjjjj..', '.........'],
      shock: ['..LLLLL..', '.LwwwwwL.', 'LwwjIjwwL', 'LwwiIiwwL', 'LwwjjjwwL', '.uwwwwwu.'],
      sad: ['.........', '.........', '.........', 'LL......L', '.LLLLLLL.', '..u......'],
      cold: ['.........', '.........', '.........', 'LLLLLLLLL', '..jiIij..', '.........'],
    },
  };
  // 口：M 线 t 口腔 / 唇 w 牙
  const T_MOUTH = {
    line: ['MMMM'], flat: ['MMMMMM'], smile: ['M.....M', '.MMMMM.'], smirk: ['......M', '.MMMMM.', 'M......'], open: ['MMMMMMM', 'MwwwwwM', '.MtttM.', '..MMM..'], grin: ['MMMMMMMM', 'MwwMwwMw', '.MMMMMM.'],
    frown: ['..MMM..', '.M...M.'], grit: ['MMMMMMMM', 'MwMwMwMM', 'MMMMMMMM'], o: ['.MMM.', 'MtttM', 'MtttM', '.MMM.'], pout: ['.MM.', 'M..M'], tight: ['.MMMM.', 'M....M'],
    fang: ['M.......M', '.MwMMMwM.', '..MMMMM..'], fangO: ['MMMMMMMMM', 'MwMtttMwM', '.MtttttM.', '..MMMMM..'], lip: ['.MMMM.', '.tttt.'], lipS: ['.....M', 'MMMMM.', '.ttt..'], lipO: ['.MMM.', 'MtttM', '.ttt.'], cat: ['M..M..M', '.MM.MM.'], none: [],
  };
  const T_MOUTH_DEF = { n: 'line', joy: 'smile', ang: 'frown', shock: 'o', sad: 'tight', cold: 'flat' };

  // ---- 身体：肩、交领、腰带 ----
  function tBody(b, o, E) {
    const robe = o.robe, SW = E.SW;
    tone(robe[1], robe[0], robe[2]);
    const hw = y => { const t = y - 64; return t < 12 ? Math.round(7 + (SW - 7) * Math.sqrt(1 - Math.pow(1 - t / 12, 2))) : Math.min(46, SW + Math.round((t - 12) * 0.06)); };
    b.add(L => { for (let y = 64; y < TH; y++) { const w = hw(y); L.hl(48 - w, 47 + w, y, robe[1]); } });
    const ax = SW - 11;
    // 袖与身的分界、袖上的褶
    for (let y = 88; y < TH; y++) { const d = Math.round((y - 88) * 0.06); b.p(48 - ax - d, y, robe[0]); b.p(47 + ax + d, y, robe[0]); if (y > 92) b.p(47 + ax + d - 1, y, dn(robe[1])); }
    const fd = dn(robe[1]);
    for (const [x0, y0, n] of [[SW - 4, 82, 14], [SW - 7, 98, 12]]) for (let k = 0; k < n; k++) { const y = y0 + Math.round(k * 1.6), dx = Math.round(k * 0.45); b.p(48 - x0 + dx, y, fd); b.p(48 - x0 + dx, y + 1, fd); b.p(47 + x0 - dx, y, fd); b.p(47 + x0 - dx, y + 1, fd); }
    // 右半身压一层暗（光从左上来）
    for (let y = 78; y < TH; y++) { const w = hw(y); for (let x = 47 + w - 3; x <= 47 + w; x++) if (b.at(x, y) === robe[1]) b.p(x, y, fd); const xi = 47 + ax + Math.round(Math.max(0, y - 88) * 0.06); if (y > 88) for (let x = xi - 3; x < xi; x++) if (b.at(x, y) === robe[1]) b.p(x, y, fd); }
    if (o.collar === 0) return;
    const trim = o.trim, inner = o.inner || '#f6f2fa', cw = o.cw || 4, belt = o.belt || robe[0], by = o.beltY || 111;
    tone(trim, lerpC(trim, robe[0], 0.45));
    // 交领：左襟压右襟。襟内是里衣，最上面露一点颈
    const Lx = y => 35 + Math.round((y - 62) * 0.5), Rx = y => 60 - Math.round((y - 62) * 0.5);
    for (let y = 64; y < by; y++) { const l = Lx(y) + cw, r = Rx(y) - cw; for (let x = l; x <= r; x++) b.p(x, y, y < 70 ? E.sk.s : (x + y) % 9 === 0 ? dn(inner) : inner); if (l <= r && y >= 70) { b.p(l, y, dn(inner)); } }
    b.add(L => { for (let y = 64; y < by; y++) { const l = Lx(y), r = Rx(y); if (r > l + cw) for (let x = Math.max(l + cw, r - cw + 1); x <= r; x++) L.p(x, y, trim); } }, { sep: 1 });
    b.add(L => { for (let y = 64; y < by; y++) for (let x = Lx(y); x < Lx(y) + cw; x++) L.p(x, y, trim); }, { sep: 1, cast: [1, 1] });
    // 腰带与结
    tone(belt, hs(belt, 0.7), hs(belt, 1.3));
    b.add(L => { L.r(48 - ax + 2, by, ax * 2 - 4, 6, belt); }, { sep: 1 });
    if (o.knot !== 0) { const kc = o.knot || trim; b.add(L => { L.r(55, by - 1, 6, 8, kc); L.r(56, by + 7, 2, TH - by - 7, kc); L.r(59, by + 7, 2, TH - by - 9, kc); }, { sep: 1 }); }
  }
  // ---- 头：颈、脸、耳 ----
  function tHead(b, o, E) {
    const sk = E.sk, S = E.S, nw = E.fem ? 5 : 6;
    b.add(L => L.r(48 - nw, 50, nw * 2, 19, sk.s), { sep: 1, noHi: 1 });
    for (let y = 64; y < 69; y++) b.p(47 + nw - 1, y, sk.S);
    b.add(L => { for (let y = 20; y <= S.chin; y++) { const w = S.hw(y); L.hl(48 - w, 47 + w, y, sk.s); } if (!o.noEar) L.mir(T => { T.r(29, 38, 4, 7, sk.s); T.p(29, 38, null); T.p(29, 44, null); }); }, { sep: 1, cast: [0, 3], noHi: 1 });
    // 右颊与下颌的体积
    for (let y = 30; y <= S.chin - 2; y++) { const w = S.hw(y); b.p(47 + w - 1, y, sk.S); if (y > 46) b.p(47 + w - 2, y, sk.S); }
    if (!o.noEar) b.mir(T => { T.p(30, 40, sk.S); T.p(30, 41, sk.S); T.p(31, 42, sk.S); });
  }
  // ---- 五官 ----
  function tFeat(b, o, E) {
    const F = o.F || {}, sk = E.sk, mood = E.mood, ey = E.ey, fem = E.fem;
    const set = T_EYES[F.eye || (fem ? 'f' : 'm')], rows = (F.eyes && F.eyes[mood]) || set[mood] || set.n;
    const iris = F.iris || '#4a3a5a', lash = F.lash || '#2a1a30';
    const pal = { L: lash, I: lerpC(iris, '#120a1c', 0.72), i: iris, j: lerpC(iris, '#ffffff', 0.38), h: '#ffffff', w: F.white || '#f6f2fa', u: sk.S };
    const slant = F.slant && mood !== 'joy' ? 1 : 0;
    for (const fl of [0, 1]) for (let j = 0; j < rows.length; j++) for (let i = 0; i < 9; i++) { const c = pal[rows[j][i]]; if (!c) continue; const x = 34 + i, y = ey + j - (slant && i < 3 ? 1 : 0); b.p(fl ? 95 - x : x, y, c); }
    if (F.tail && mood !== 'joy') b.mir(T => { const ty = ey + (rows[0].trim().replace(/\./g, '') ? 0 : rows[1].replace(/\./g, '') ? 1 : 2) - slant; T.p(33, ty, F.tail); T.p(32, ty - 1, F.tail); T.p(33, ty + 1, F.tail); });
    // 眉：怒 = 内低外高，伤 = 内高外低，惊 = 整体上挑，冷 = 压平压低
    const B = F.brow || {};
    if (B.c !== 0) {
      const th = B.th || (fem ? 1 : 2), len = B.len || 9, by = (B.y || ey - 4) + (mood === 'shock' ? -2 : mood === 'cold' ? 1 : mood === 'joy' ? -1 : 0), tilt = (mood === 'ang' ? 3.2 : mood === 'sad' ? -3 : 0) + (B.tilt || 0);
      const col = B.c || (lum(E.hc) > 150 ? dn(E.hc) : lerpC(E.hc, '#1b1326', 0.35));
      b.mir(T => { for (let k = 0; k < len; k++) { const u = k / (len - 1), y = by + Math.round(tilt * (0.5 - u) - (mood === 'ang' || mood === 'sad' || mood === 'cold' ? 0 : Math.sin(u * Math.PI) * 1.2)); for (let j = 0; j < (k >= len - 2 ? 1 : th); j++) T.p(44 - k, y - j, col); } });
    }
    if (F.nose !== 0) { b.p(48, ey + 8, sk.S); b.p(48, ey + 9, sk.S); b.p(47, ey + 10, sk.S); if (!fem) b.p(49, ey + 10, sk.S); }
    if (F.blush || (fem && mood === 'joy')) b.mir(T => { for (let i = 0; i < 6; i++) { if (i % 2 === 0) T.p(34 + i, ey + 9, sk.m); else T.p(34 + i, ey + 10, sk.m); } });
    const name = Object.assign({}, T_MOUTH_DEF, F.mouth)[mood], mr = T_MOUTH[name] || [];
    if (mr.length) b.m(48 - Math.ceil(mr[0].length / 2), F.my || ey + 14, mr, { M: sk.M, t: F.lip || '#b84a5a', w: '#f6f2fa' });
  }
  // ---- 发：头顶一个椭圆盖到发际线（hairline: x → 下缘 y），再加各人的发式 ----
  const tTop = x => { const u = Math.min(0.999, Math.abs(x + 0.5 - 48) / 19.5); return Math.round(12 + 18 - 18 * Math.sqrt(1 - u * u)); };
  function tHair(b, o, E) {
    const hc = E.hc, H = o.hairline;
    b.add(L => {
      if (H) for (let x = 29; x <= 66; x++) { const yb = Math.round(H(x, Math.abs(x - 47.5))); for (let y = tTop(x); y <= yb; y++) L.p(x, y, hc); }
      if (o.hairF) o.hairF(L, hc, E);
    }, { sep: 1, cast: [0, 2] });
    if (o.noGloss) return;
    // 发丝与一道高光
    const d = dn(hc), u = up(hc);
    for (let x = 32; x <= 64; x += 5) { const y0 = tTop(x) + 8, y1 = Math.round(H ? H(x, Math.abs(x - 47.5)) : 24) - 1; for (let y = y0; y <= Math.min(y1, y0 + 9); y++) if (b.at(x, y) === hc) b.p(x, y, d); }
    for (let x = 33; x <= 62; x++) { const y = tTop(x) + 5 + (Math.abs(x - 47.5) < 6 ? 1 : 0); if (x % 7 < 5 && b.at(x, y) !== null && (b.at(x, y) === hc || b.at(x, y) === d)) { b.p(x, y, u); if (x % 7 < 3 && (b.at(x, y + 1) === hc || b.at(x, y + 1) === d)) b.p(x, y + 1, u); } }
  }
  function tPerson(o, mood) {
    const b = new Buf(TW, TH), sk = skinTone(o.skin || '#f2c9a0'), hc = hairTone(o.hair || HAIR_K), fem = !!o.fem;
    const E = { b, sk, hc, mood, fem, SW: o.sw || (fem ? 30 : 35), ey: 39, S: T_SHAPE[o.shape || (fem ? 'round' : 'oval')], o };
    if (o.back) b.add(L => o.back(L, hc, E));
    if (o.pre) o.pre(b, E);
    tBody(b, o, E);
    if (o.mid) o.mid(b, E);
    tHead(b, o, E);
    tFeat(b, o, E);
    if (o.skinX) o.skinX(b, E);
    tHair(b, o, E);
    if (o.post) o.post(b, E);
    return b;
  }
  // ---- 发式的积木 ----
  // 身后的头发：半宽 w，垂到 y1，44 行以下每行收 taper
  const tBack = (w, y1, taper) => (L, c) => { for (let y = 15; y <= y1; y++) { const hw = Math.round(y < 22 ? w - (22 - y) * 1.2 : y < 44 ? w : w - (y - 44) * (taper || 0)); if (hw > 0) L.hl(48 - hw, 47 + hw, y, c); } };
  // 发际线：中分（两侧鬓发垂到 lock）、齐刘海、斜刘海、露额
  const tPart = (lock, k, off) => (x, d) => { const dd = Math.abs(x - 47.5 - (off || 0)); return d > 14.5 ? lock - (d - 14.5) * 1.5 : 22.5 + dd * (k || 0.55); };
  const tBangs = (lock, y0) => (x, d) => (d > 13.5 ? lock - (d - 13.5) * 2 : (y0 || 31) + (x % 5 === 0 ? -2 : x % 5 === 3 ? 1 : 0) - (d < 2 ? 2 : 0));
  const tSwept = (lockL, lockR) => (x, d) => (x < 33 ? lockL - (33 - x) * 1.5 : x > 62 ? lockR - (x - 62) * 2 : 24 + (62 - x) * 0.4 + (x % 6 === 0 ? 1.5 : 0));
  const tHigh = lock => (x, d) => (d > 15.5 ? lock : 21 + d * d * 0.014);
  // 一缕收尖的头发：从 (x0, y0) 粗 w 画到 (x1, y1) 收成 1
  const tLock = (T, x0, y0, x1, y1, w, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) { const th = Math.max(1, Math.round(w * (1 - i / n * 0.85))); T.r(Math.round(x0 + (x1 - x0) * i / n - th / 2), Math.round(y0 + (y1 - y0) * i / n), th, 1 + (Math.abs(x1 - x0) > Math.abs(y1 - y0) ? th : 0), c); } };
  // 背后斜插的剑柄（右肩后）
  const tHilt = (b, o) => { o = o || {}; b.add(L => { L.l(70, 74, 82, 40, o.grip || WOOD, 3); L.l(73, 52, 85, 56, o.guard || GOLD, 3); L.r(82, 36, 4, 4, o.pommel || GOLD); for (let k = 0; k < 4; k++) L.r(73 + k * 2, 62 - k * 6, 3, 1, hs(o.grip || WOOD, 0.7)); }); };
  // 药篓与药草（苏青瑶 / 苏景行）
  function tBasket(b) {
    const BK = tone('#b98a4c', '#7a5230', '#e0b878');
    b.add(L => { for (const [x0, y0, x1, y1] of [[70, 56, 67, 34], [75, 56, 76, 30], [80, 56, 84, 36], [85, 56, 90, 42]]) L.l(x0, y0, x1, y1, GREEN, 2); L.r(64, 32, 5, 3, GREEN); L.r(77, 27, 4, 3, GREEN); L.r(84, 33, 5, 3, GREEN); L.r(71, 40, 3, 2, GREEN); L.r(88, 44, 4, 2, GREEN); }, { flat: 1, sep: 1 });
    for (const [x, y, c] of [[66, 31, '#f6f2fa'], [67, 31, '#f6f2fa'], [78, 26, '#f7a3bd'], [79, 26, '#f7a3bd'], [86, 32, '#f4c542'], [87, 32, '#f4c542'], [90, 41, '#f6f2fa']]) b.p(x, y, c);
    b.add(L => { L.r(64, 58, 28, 40, BK); L.r(62, 54, 32, 6, BK); });
    for (let y = 61; y < 98; y++) for (let x = 65; x < 91; x++) if ((x + y * 2) % 6 < 2) b.p(x, y, '#7a5230'); else if ((x * 2 + y) % 6 === 0) b.p(x, y, '#e0b878');
  }
  const tStrap = b => b.add(L => { for (let k = 0; k <= 44; k++) L.r(64 - Math.round(k * 0.62), 66 + k, 5, 1, '#8a5c36'); }, { sep: 1 });
  const tGem = (b, x, y, c, w, h) => { b.r(x, y, w || 2, h || 3, c); b.p(x, y, '#ffffff'); };

  const TACHIE = {
    // 玄霄：青白的残魂。长眉垂到颧下、长须、缺了一角的玉冠，腰以下散成烟
    elder: {
      skin: '#a6cdee', hair: '#f0f9ff', shape: 'long', robe: ['#3f6aa8', '#7aa8e0', '#c0dcff'], trim: '#e6f6ff', inner: '#9cc0ec', sw: 33, noGloss: 1, ghost: 1, belt: '#3f6aa8', knot: '#c0dcff',
      back: tBack(22, 100, 0.1), hairline: tHigh(72),
      F: { eye: 'n', iris: '#27357a', lash: '#27357a', white: '#e6f6ff', brow: { c: 0 }, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'o', sad: 'none', cold: 'none' } },
      post: (b, E) => {
        const W = E.hc, m = E.mood, tl = m === 'ang' ? 2 : m === 'sad' ? -2 : 0, by = m === 'shock' ? 33 : m === 'cold' ? 36 : 35;
        // 长眉：从眉心挑出去，过了眼尾往下垂
        b.add(L => L.mir(T => { T.l(44, by + tl, 34, by - tl, W, 2); T.l(33, by - tl, 28, by + 3, W, 2); T.l(28, by + 4, 26, by + 18, W, 2); T.l(26, by + 18, 27, by + 26, W, 1); }));
        // 须：两撇垂下来，下巴一缕长须
        b.add(L => { L.mir(T => { T.l(46, 52, 41, 54, W, 2); T.l(40, 55, 37, 66, W, 2); T.l(37, 66, 38, 74, W, 1); }); for (let k = 0; k < 30; k++) { const w = k < 4 ? 3 + k : k < 12 ? 6 : Math.max(1, 6 - Math.round((k - 12) * 0.3)); L.hl(48 - w, 47 + w, 57 + k, W); } });
        for (let y = 60; y < 84; y += 2) { b.p(46, y, '#c0dcff'); b.p(50, y + 1, '#c0dcff'); }
        if (m === 'joy') b.hl(45, 50, 55, E.sk.M);
        // 玉冠（右上缺一角）与横簪
        b.add(L => { L.r(41, 1, 14, 10, JADE); L.r(39, 10, 18, 4, JADE); L.r(52, 1, 3, 4, null); L.p(51, 1, null); L.r(45, 14, 6, 3, JADE); });
        b.hl(31, 64, 7, '#f0f9ff'); b.hl(31, 64, 8, '#c0dcff'); b.r(43, 6, 10, 3, '#2a8a7a'); b.r(46, 4, 4, 2, '#c8fff0');
      },
    },
    // 苏青瑶：杏衣、侧辫、鬓边一朵小白花、背着药篓
    su: {
      fem: 1, skin: '#f8d8bc', hair: '#6a4630', shape: 'round', robe: ['#b8743e', '#f0b070', '#ffdca8'], trim: '#fff4dc', belt: '#8a5c36', knot: '#5fd3b0',
      back: tBack(20, 60, 0.6), pre: tBasket, mid: tStrap, hairline: tBangs(56, 30),
      hairF: (L, c) => { L.e(59, 9, 8, 6.5, c); },
      F: { iris: '#8a5a2a', blush: 1, eyes: { n: ['.........', '.LLLLLLL.', 'LLIIIIILL', 'LwhhIiiw.', '.whIIijw.', '..ijjjj..', '...uuu...'] }, mouth: { n: 'smile', joy: 'open', ang: 'pout', sad: 'frown', cold: 'line' } },
      post: (b, E) => {
        const c = E.hc;
        b.add(L => { for (let k = 0; k < 9; k++) L.e(27 - (k % 2) * 2 - k * 0.25, 52 + k * 5.6, 4.4, 3.6, c); });
        for (let k = 0; k < 9; k++) b.p(Math.round(27 - (k % 2) * 2 - k * 0.25), Math.round(52 + k * 5.6) - 2, up(c));
        b.r(21, 101, 8, 2, '#d8404a'); b.add(L => { L.r(22, 103, 6, 6, c); L.r(23, 109, 4, 3, c); });
        b.add(L => L.l(50, 3, 70, 13, WOOD, 2)); b.r(69, 12, 3, 3, '#5fd3b0');
        for (const [x, y] of [[31, 28], [33, 26], [35, 28], [33, 30], [32, 27], [34, 27], [32, 29], [34, 29]]) b.r(x, y, 2, 2, '#f6f2fa'); b.r(33, 28, 2, 2, '#f4c542');
      },
    },
    su2: {
      skin: '#f6d6ba', hair: '#6a4630', shape: 'oval', robe: ['#b8743e', '#f0b070', '#ffdca8'], trim: '#fff4dc', belt: '#8a5c36', knot: '#5fd3b0', sw: 34,
      back: tBack(19, 62, 0.5), pre: tBasket, mid: tStrap, hairline: tPart(44, 0.5, -3),
      hairF: (L, c) => L.e(48, 9, 6, 5.5, c),
      F: { iris: '#8a5a2a', brow: { th: 1 }, mouth: { n: 'smile', joy: 'open', ang: 'flat', sad: 'frown', cold: 'line' } },
      post: b => { b.r(42, 12, 12, 3, '#f0b070'); b.add(L => { L.l(54, 13, 64, 18, '#f0b070', 2); L.l(54, 14, 62, 26, '#b8743e', 2); }); },
    },
    // 夜璃：紫黑衣、红眼尾、单边耳坠、高侧马尾搭在肩前
    ye: {
      fem: 1, skin: '#f6dcd0', hair: '#34204a', shape: 'sharp', robe: ['#1e1430', '#3e2a5e', '#6a4a94'], trim: '#d8507a', inner: '#1e1430', belt: '#8a1e2e', knot: '#d8404a',
      back: (L, c) => { tBack(20, 62, 0.6)(L, c); L.e(64, 10, 7, 6, c); L.l(66, 12, 75, 30, c, 7); L.l(75, 30, 76, 62, c, 6); },
      hairline: tSwept(60, 52),
      F: { iris: '#a050c8', slant: 1, tail: '#e03a4a', lip: '#d8405a', brow: { y: 34 }, mouth: { n: 'lipS', joy: 'open', ang: 'frown', shock: 'lipO', sad: 'pout', cold: 'lip' } },
      post: (b, E) => {
        const c = E.hc;
        b.add(L => { L.l(74, 60, 72, 84, c, 6); L.l(72, 84, 68, 100, c, 4); L.l(68, 100, 69, 108, c, 2); });
        for (let y = 34; y < 100; y += 3) b.p(77 - (y > 84 ? Math.round((y - 84) * 0.3) : 0), y, up(c));
        b.r(61, 14, 8, 3, '#d8404a'); b.add(L => { L.l(68, 15, 72, 22, '#d8404a', 2); });
        b.r(30, 45, 1, 3, '#f4c542'); b.add(L => { L.r(29, 48, 3, 5, RED); L.p(29, 48, null); L.p(31, 48, null); });
        b.r(43, 62, 10, 2, '#1e1430'); tGem(b, 47, 62, '#d8404a', 2, 3);
      },
    },
    ye2: {
      skin: '#f4d8c8', hair: '#34204a', shape: 'sharp', robe: ['#1e1430', '#3e2a5e', '#6a4a94'], trim: '#d8507a', inner: '#8a1e2e', belt: '#8a1e2e', knot: '#d8404a', sw: 35,
      back: (L, c) => { tBack(20, 60, 0.6)(L, c); L.l(60, 8, 74, 16, c, 6); L.l(74, 16, 77, 64, c, 6); },
      hairline: tSwept(50, 46), hairF: (L, c) => L.e(50, 9, 6, 5.5, c),
      F: { iris: '#a050c8', slant: 1, tail: '#e03a4a', brow: { y: 34, th: 1 }, mouth: { n: 'smirk', joy: 'grin', ang: 'frown', sad: 'flat', cold: 'flat' } },
      post: (b, E) => {
        const c = E.hc; b.add(L => { L.l(75, 62, 73, 84, c, 5); L.l(73, 84, 70, 96, c, 3); });
        b.r(44, 12, 12, 3, '#d8404a'); b.r(30, 45, 1, 3, '#f4c542'); b.add(L => { L.r(29, 48, 3, 5, RED); L.p(29, 48, null); L.p(31, 48, null); });
        b.r(43, 62, 10, 2, '#1e1430');
      },
    },
    // 慕容雪：粉衣、高髻、金步摇、眉心花钿
    mu: {
      fem: 1, skin: '#f8d8bc', hair: '#3a2630', shape: 'round', robe: ['#b0486e', '#e87aa0', '#ffb4cc'], trim: '#fff0f4', belt: '#b0486e', knot: '#f4c542',
      back: tBack(21, 104, 0.12), hairline: tPart(66, 0.5),
      hairF: (L, c) => { L.e(48, 8, 12, 7.5, c); L.e(33, 13, 6, 6, c); L.e(62, 13, 6, 6, c); L.e(33, 13, 2, 2.5, null); L.e(62, 13, 2, 2.5, null); },
      F: { iris: '#a05a3a', blush: 1, brow: { y: 34 }, mouth: { n: 'pout', joy: 'smirk', ang: 'frown', sad: 'tight', cold: 'lip' }, lip: '#d8607a' },
      post: b => {
        b.add(L => { L.r(38, 15, 20, 2, GOLD); L.r(44, 8, 8, 7, GOLD); L.r(46, 5, 4, 3, GOLD); L.l(66, 16, 75, 20, GOLD, 2); L.l(29, 16, 21, 19, GOLD, 2); }, { sep: 1 });
        tGem(b, 47, 10, '#d8404a', 2, 3);
        for (let k = 0; k < 9; k++) b.r(75, 22 + k * 3, 2, 2, [GOLD, '#d8404a', '#fff2a8'][k % 3]);
        for (let k = 0; k < 7; k++) b.r(72, 22 + k * 3, 2, 2, ['#fff2a8', GOLD, '#d8404a'][k % 3]);
        for (let k = 0; k < 5; k++) b.r(21, 21 + k * 3, 2, 2, [GOLD, '#d8404a', '#fff2a8'][k % 3]);
        b.r(47, 27, 2, 3, '#d8404a'); b.p(46, 28, '#d8404a'); b.p(49, 28, '#d8404a');
        b.add(L => L.r(45, 79, 5, 4, GOLD), { sep: 1 }); b.r(47, 80, 1, 2, '#d8404a');
      },
    },
    // 慕容轩：金冠横簪、两缕龙须、玫红袍、白狐领
    mu2: {
      skin: '#f6d6ba', hair: '#3a2630', shape: 'oval', robe: ['#a8446a', '#e07a9c', '#ffb4cc'], trim: '#fff0f4', belt: '#a8446a', knot: '#f4c542',
      back: tBack(21, 70, 0.4), hairline: tPart(58, 0.6), hairF: (L, c) => L.e(48, 9, 6.5, 6, c),
      mid: b => b.add(L => L.mir(T => { for (let i = 0; i < 5; i++) T.e(12 + i * 7, 86 - i * 4.4, 6.5, 5, WHITE); })),
      F: { iris: '#a05a3a', brow: { y: 34 }, mouth: { n: 'flat', joy: 'smirk', ang: 'frown', sad: 'flat', cold: 'flat' } },
      post: b => { b.add(L => { L.r(42, 3, 12, 10, GOLD); L.r(31, 7, 34, 2, GOLD); }); tGem(b, 47, 6, '#d8404a', 2, 4); b.add(L => L.r(45, 79, 5, 4, GOLD), { sep: 1 }); },
    },
    // 楚天阔：白衣金纹、披肩长发、高冠、背剑
    tian: {
      skin: '#f6d8bc', shape: 'oval', robe: ['#a8a4bc', '#eeeaf4', '#ffffff'], trim: '#e8b84a', inner: '#d8d4e4', belt: '#e8b84a', knot: '#a8a4bc',
      back: tBack(23, 127, 0.02), pre: b => tHilt(b, { grip: '#5a6480', guard: GOLD }), hairline: tPart(60, 0.5),
      hairF: (L, c) => L.e(48, 10, 5, 6, c),
      F: { iris: '#4a5a8a', brow: { len: 10 }, mouth: { n: 'flat', joy: 'smile', ang: 'frown', sad: 'flat', cold: 'flat' } },
      post: (b, E) => {
        const c = E.hc;
        b.add(L => L.mir(T => { T.r(28, 40, 5, 30, c); tLock(T, 30, 70, 29, 114, 6, c); }));
        b.mir(T => { for (let y = 46; y < 96; y++) if (y % 9 < 7) T.p(29, y, up(c)); });
        b.add(L => { L.r(44, 0, 8, 12, GOLD); L.r(40, 12, 16, 3, GOLD); L.r(34, 6, 28, 2, GOLD); }); tGem(b, 47, 3, '#4aa8ff', 2, 5);
        // 肩上的金线云纹
        b.mir(T => { for (const [x, y] of [[14, 86], [15, 85], [16, 85], [17, 86], [17, 87], [16, 88], [15, 88], [18, 88], [19, 87], [20, 86], [13, 88], [12, 89]]) T.p(x, y, '#e8b84a'); T.hl(8, 22, 124, '#e8b84a'); });
      },
    },
    // 赵乾：方脸、蓝袍方巾、背后一柄不出鞘的剑
    zhao: {
      skin: '#e8b88e', shape: 'square', robe: ['#263f7a', '#3f6ec0', '#7aa2e6'], trim: '#d8e4ff', sw: 38, belt: '#263f7a', knot: '#d8e4ff',
      back: tBack(19, 58, 0.5), pre: b => tHilt(b), hairline: (x, d) => (d > 14.5 ? 44 - (d - 14.5) * 2 : 25),
      F: { iris: '#3a3040', brow: { th: 3, tilt: 1.2, len: 10 }, eyes: { n: ['.........', '.........', '.LLLLLLL.', 'LLwIIiwLL', '..wiIjw..', '...uuu...'] }, mouth: { n: 'smirk', joy: 'grin', ang: 'grit', sad: 'frown', cold: 'flat' } },
      skinX: (b, E) => b.mir(T => { T.p(35, 52, E.sk.S); T.p(36, 53, E.sk.S); T.p(36, 54, E.sk.S); }),
      post: b => {
        const C = tone('#3f6ec0', '#263f7a', '#7aa2e6');
        b.add(L => { L.r(31, 3, 34, 17, C); L.r(29, 19, 38, 5, C); L.l(66, 22, 73, 44, C, 3); });
        b.hl(31, 64, 18, '#263f7a'); b.hl(33, 62, 6, '#7aa2e6');
        b.add(L => L.r(43, 8, 10, 8, '#d8e4ff'), { sep: 1 }); b.r(46, 10, 4, 4, '#5fd3b0'); b.p(46, 10, '#c8fff0');
      },
    },
    // 血无涯：暗红袍立领、一对骨角、尖牙笑
    xue: {
      skin: '#ecc6b6', hair: '#4a1420', shape: 'sharp', robe: ['#3e0a14', '#7a1a26', '#b03a40'], trim: '#e8b04a', inner: '#2a0c12', sw: 37, belt: '#2a0c12', knot: '#e8b04a',
      back: (L, c) => { tBack(21, 66, 0.5)(L, c); L.mir(T => { tLock(T, 30, 16, 16, 9, 9, c); tLock(T, 28, 26, 11, 24, 10, c); tLock(T, 28, 38, 10, 42, 10, c); tLock(T, 29, 50, 14, 60, 9, c); tLock(T, 31, 60, 21, 72, 7, c); }); },
      hairline: (x, d) => (d > 13.5 ? 50 - (d - 13.5) * 3 : 21 + Math.max(0, 9 - d * 1.5) + (x % 4 === 0 ? 2 : 0)),
      mid: b => { const C = tone('#7a1a26', '#3e0a14', '#b03a40'); b.add(L => L.mir(T => { for (let y = 48; y <= 80; y++) T.hl(27 + Math.round((y - 48) * 0.1), 33 + Math.round((y - 48) * 0.42), y, C); })); b.mir(T => { for (let y = 48; y <= 80; y++) T.p(34 + Math.round((y - 48) * 0.42), y, '#e8b04a'); }); },
      F: { iris: '#e8303a', slant: 1, tail: '#8a1e2e', brow: { tilt: 1.5, th: 2 }, mouth: { n: 'fang', joy: 'fangO', ang: 'grit', sad: 'flat', cold: 'flat' } },
      post: b => {
        const H = tone('#e4d6b8', '#9a7a6a', '#fff8e0');
        b.add(L => L.mir(T => { T.r(35, 15, 6, 6, H); T.r(33, 10, 5, 6, H); T.r(31, 5, 4, 6, H); T.r(30, 1, 3, 5, H); }));
        b.mir(T => { T.r(30, 1, 2, 3, '#8a1e2e'); T.p(36, 19, '#9a7a6a'); T.p(34, 14, '#9a7a6a'); });
      },
    },
    // 陆天衡：天剑宗主。金冠、鬓边两缕白发、金肩甲、眉心一道朱痕
    tianheng: {
      skin: '#ecd0b8', hair: '#3a3848', shape: 'long', robe: ['#a8a4bc', '#eeeaf4', '#ffffff'], trim: '#f4c542', inner: '#2a2238', sw: 37, belt: '#f4c542', knot: '#a8742a',
      back: tBack(23, 127, 0.02), hairline: tPart(62, 0.5),
      hairF: (L, c) => L.e(48, 10, 5, 6, c),
      mid: b => { b.add(L => L.mir(T => { T.e(17, 80, 12, 6, GOLD); T.r(6, 80, 22, 6, GOLD); T.r(8, 86, 18, 3, GOLD); })); b.mir(T => { T.hl(8, 25, 85, '#a8742a'); for (let x = 9; x < 26; x += 5) T.r(x, 82, 2, 2, '#fff2a8'); T.r(15, 76, 4, 3, '#d8404a'); }); },
      F: { eye: 'n', iris: '#8a2a2a', brow: { len: 10, tilt: 1.4 }, mouth: { n: 'flat', joy: 'smirk', ang: 'frown', shock: 'flat', sad: 'flat', cold: 'flat' } },
      skinX: (b, E) => b.mir(T => { T.l(42, 48, 40, 53, E.sk.S); }),
      post: (b, E) => {
        const c = E.hc;
        b.add(L => L.mir(T => { T.r(28, 40, 5, 28, c); tLock(T, 30, 68, 29, 106, 6, c); }));
        b.mir(T => { T.r(29, 26, 2, 50, '#e8e6ee'); T.r(31, 24, 1, 22, '#e8e6ee'); for (let y = 76; y < 100; y++) T.p(29, y, '#e8e6ee'); });
        b.add(L => { L.r(42, 0, 12, 13, GOLD); L.r(37, 11, 22, 4, GOLD); L.mir(T => T.l(39, 10, 31, 0, GOLD, 3)); L.r(33, 7, 30, 2, GOLD); });
        tGem(b, 47, 2, '#d8404a', 2, 7);
        b.add(L => { L.mir(T => { T.l(46, 52, 41, 53, c, 1); T.l(40, 54, 39, 59, c, 1); }); L.r(46, 58, 4, 7, c); L.r(47, 65, 2, 3, c); });
        b.r(47, 25, 2, 7, '#d8404a'); b.p(47, 25, '#ff8a8a');
      },
    },
    // 云无极：银发莲冠、淡蓝袍云肩、闭着眼
    yun: {
      skin: '#fae4d6', hair: '#ccd6ee', shape: 'oval', robe: ['#4a74b8', '#86b4ea', '#cfe6ff'], trim: '#ffffff', sw: 33, belt: '#4a74b8', knot: '#ffffff',
      back: (L, c) => { L.e(48, 38, 27, 28, c); for (let y = 38; y < TH; y++) L.hl(48 - 27 - Math.round((y - 38) * 0.04), 47 + 27 + Math.round((y - 38) * 0.04), y, c); },
      mid: b => b.add(L => L.mir(T => { T.e(25, 84, 11, 7, WHITE); T.e(38, 89, 8, 6, WHITE); T.e(13, 86, 8, 6, WHITE); })),
      hairline: tPart(100, 0.5),
      F: { eye: 'c', iris: '#6ab8f0', lash: '#5a6488', brow: { c: '#9aa8c8', th: 1 }, mouth: { n: 'line', joy: 'smile', ang: 'flat', sad: 'line', cold: 'line' } },
      post: (b, E) => {
        const C = tone('#8fc8f0', '#4a7ab8', '#e8f8ff'), c = E.hc;
        b.add(L => L.mir(T => { T.r(27, 40, 6, 36, c); tLock(T, 30, 76, 28, 122, 7, c); }));
        b.mir(T => { for (let y = 46; y < 104; y++) if (y % 11 < 8) T.p(28, y, '#ffffff'); });
        b.add(L => { for (let k = 0; k < 13; k++) { const w = k < 2 ? 1 : k < 6 ? 2 : k < 10 ? 3 : 2; L.hl(48 - w, 47 + w, k, C); } L.mir(T => { T.l(41, 12, 35, 3, C, 3); T.l(37, 13, 30, 8, C, 2); }); L.r(37, 13, 22, 3, C); });
        tGem(b, 47, 27, '#4aa8ff', 2, 4);
      },
    },
    // 墨无痕：黑衣斗笠、遮半脸的面巾、背后的剑
    mo: {
      skin: '#e8c8a8', hair: '#1e1a26', shape: 'oval', robe: ['#17131f', '#2e2838', '#4a4157'], trim: '#6a6088', inner: '#17131f', noGloss: 1, belt: '#17131f', knot: '#6a6088',
      back: tBack(19, 64, 0.5), pre: b => tHilt(b, { grip: '#2e2838', guard: STEEL, pommel: '#5fd3b0' }),
      hairline: (x, d) => (d > 14.5 ? 46 - (d - 14.5) * 2 : 30),
      F: { eye: 'n', iris: '#8a9ab8', nose: 0, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'none', sad: 'none', cold: 'none' } },
      skinX: (b, E) => {
        const M = tone('#3a3548', '#221e2e', '#5c5674');
        b.add(L => { for (let y = 47; y <= E.S.chin + 2; y++) { const w = E.S.hw(Math.min(y, E.S.chin)) + (y < 52 ? 1 : 0); L.hl(48 - w, 47 + w, y, M); } });
        b.hl(33, 62, 47, '#5c5674'); b.l(40, 51, 45, 57, '#221e2e'); b.l(55, 51, 51, 58, '#221e2e'); b.p(48, 50, '#5c5674'); b.p(48, 51, '#5c5674');
      },
      post: b => {
        const H = tone('#4c465c', '#2a2636', '#7c7694');
        b.add(L => { for (let y = 2; y <= 30; y++) { const w = Math.round(3 + (y - 2) * 1.5); L.hl(48 - w, 47 + w, y, H); } }, { sep: 1, cast: [0, 3] });
        for (const k of [-36, -24, -12, 0, 12, 24, 36]) b.l(48 + (k > 0 ? -1 : 0), 4, 48 + k, 29, '#2a2636'); b.r(47, 0, 2, 3, '#7c7694'); b.hl(4, 91, 30, '#2a2636');
      },
    },
    // 楚狂：灰衣、乱发胡茬、朱红额带、背三把剑
    chu: {
      skin: '#e6b48a', hair: '#33303a', shape: 'oval', robe: ['#44444e', '#72728a', '#a4a4b8'], trim: '#cfcfe0', sw: 38, belt: '#44444e', knot: '#b04a3a',
      back: (L, c) => { tBack(21, 66, 0.5)(L, c); L.mir(T => { tLock(T, 30, 18, 18, 10, 8, c); tLock(T, 28, 30, 14, 30, 8, c); tLock(T, 29, 46, 17, 56, 8, c); }); },
      pre: b => { tHilt(b); b.add(L => { L.l(24, 76, 10, 40, WOOD, 3); L.l(3, 54, 18, 48, GOLD, 3); L.r(8, 35, 4, 4, GOLD); L.l(84, 80, 92, 52, WOOD, 3); L.l(84, 62, 95, 66, GOLD, 3); }); },
      hairline: (x, d) => (d > 14.5 ? 48 - (d - 14.5) * 2 : 25 + ((x * 7) % 5) + (x % 4 === 0 ? 3 : 0)),
      hairF: (L, c) => { L.l(34, 15, 27, 5, c, 3); L.l(56, 13, 62, 3, c, 3); L.l(45, 13, 42, 5, c, 2); },
      F: { iris: '#8a5a2a', brow: { th: 3, len: 10 }, mouth: { n: 'grin', joy: 'open', ang: 'grit', sad: 'flat', cold: 'flat' } },
      skinX: (b, E) => { for (let y = 50; y < E.S.chin; y++) for (let x = 34; x <= 61; x++) if ((x + y) % 2 === 0 && (x * 7 + y * 3) % 5 < 3 && b.at(x, y) === E.sk.s && (y > 56 || x < 42 || x > 53)) b.p(x, y, E.sk.S); },
      post: b => { const C = tone('#b04a3a', '#6a2a2a', '#e07a5a'); b.add(L => { L.r(30, 27, 36, 4, C); L.l(66, 28, 78, 35, C, 3); L.l(66, 30, 75, 46, C, 2); }); },
    },
    // 葛老：皱纹、酒糟鼻、歪戴的丹师帽、酒葫芦
    ge: {
      skin: '#eab896', hair: '#e8e6ee', shape: 'wide', robe: ['#54402c', '#86694a', '#b8986c'], trim: '#d8c090', inner: '#c8b890', sw: 36, noGloss: 1, belt: '#54402c', knot: '#d89a4a',
      back: (L, c) => L.mir(T => T.e(27, 42, 6, 11, c)),
      F: { eye: 'n', iris: '#4a3a3a', brow: { c: '#e8e6ee', th: 3, len: 11, y: 35, tilt: -1 }, nose: 0, blush: 1, my: 55, mouth: { n: 'smile', joy: 'open', ang: 'frown', sad: 'flat', cold: 'flat' } },
      skinX: (b, E) => {
        const S = E.sk.S; b.hl(41, 54, 28, S); b.hl(43, 52, 31, S);
        b.mir(T => { T.p(31, 45, S); T.p(30, 47, S); T.l(40, 50, 38, 55, S); });
        b.r(45, 45, 6, 5, '#e0705a'); b.r(46, 44, 4, 1, '#e0705a'); b.p(45, 45, '#f2a08a'); b.p(46, 45, '#f2a08a'); b.p(50, 49, '#b84a48');
      },
      post: (b, E) => {
        const W = E.hc;
        b.add(L => { L.mir(T => T.l(46, 52, 39, 54, W, 2)); for (let k = 0; k < 11; k++) { const w = k < 3 ? 5 : k < 7 ? 4 : 2; L.hl(48 - w, 47 + w, 58 + k, W); } });
        const C = tone('#8a3c38', '#52202a', '#c06a5c');
        b.add(L => { for (let k = 0; k <= 20; k++) L.hl(Math.round(29 + k * 0.7), Math.round(67 + k * 0.35), 26 - k, C); L.e(73, 5, 6, 4, C); });
        b.hl(29, 67, 26, '#d8c090'); b.hl(29, 67, 25, '#52202a'); b.r(47, 13, 6, 6, '#f4c542'); b.r(49, 15, 2, 2, '#a8742a');
        const G = tone('#d89a4a', '#8a5a2a', '#f8d08a');
        b.add(L => { L.e(15, 101, 9, 9, G); L.e(15, 88, 6, 5, G); L.r(13, 80, 4, 4, '#8a5a2a'); }); b.hl(9, 21, 94, '#d8404a');
      },
    },
    // 白小九：白发狐耳、藏不住的尾巴、毛领铃铛
    bai: {
      fem: 1, skin: '#fbe2d2', hair: '#f4f2fa', shape: 'round', robe: ['#a8323e', '#e05a64', '#ff9a9a'], trim: '#fff0d0', belt: '#a8323e', knot: '#f4c542', noGloss: 1,
      back: (L, c) => { tBack(22, 72, 0.5)(L, c); L.e(81, 94, 12, 22, c); L.e(83, 68, 9, 12, c); L.e(80, 53, 6, 7, c); },
      hairline: tBangs(62, 31),
      hairF: (L, c) => L.mir(T => { for (let y = 0; y <= 19; y++) T.hl(22 - Math.round(y * 0.15), 22 + Math.round(y * 0.85), y, c); }),
      mid: b => b.add(L => { for (let i = 0; i < 9; i++) L.e(24 + i * 6, 73 + (4 - Math.abs(i - 4)) * 2.2, 6.5, 5, WHITE); }),
      F: { iris: '#f0a020', blush: 1, brow: { c: '#b4b0cc', len: 7 }, mouth: { n: 'cat', joy: 'open', ang: 'pout', sad: 'frown', cold: 'line' } },
      post: (b, E) => {
        b.mir(T => { for (let y = 6; y <= 16; y++) T.hl(24, 24 + Math.round((y - 6) * 0.6), y, '#f7a3bd'); });
        b.add(L => L.e(48, 87, 4, 4, GOLD), { sep: 1 }); b.r(47, 88, 2, 2, '#a8742a'); b.r(79, 46, 3, 3, '#f7a3bd');
        if (E.mood === 'n' || E.mood === 'joy') b.p(52, 55, '#f6f2fa');
        b.mir(T => { for (let y = 40; y < 68; y += 5) T.p(28, y, '#c8c4dc'); });
      },
    },
    // 凌虚子：白眉白须、背一口巨剑、剑簪
    jian: {
      skin: '#eac4a0', hair: '#eeeef6', shape: 'long', robe: ['#24487e', '#3f7ed0', '#7ab4f4'], trim: '#eef6ff', sw: 37, noGloss: 1, belt: '#24487e', knot: '#eef6ff',
      back: tBack(21, 92, 0.14),
      pre: b => b.add(L => { L.l(70, 60, 66, 76, STEEL, 12); L.l(73, 70, 86, 26, WOOD, 5); L.l(62, 40, 92, 52, GOLD, 5); L.r(84, 17, 7, 7, GOLD); }),
      hairline: tHigh(72), hairF: (L, c) => L.e(48, 10, 6, 5, c),
      F: { eye: 'n', iris: '#3a5a8a', brow: { c: '#eeeef6', th: 3, len: 11, tilt: 1.6, y: 35 }, mouth: { n: 'none', joy: 'none', ang: 'none', shock: 'o', sad: 'none', cold: 'none' } },
      skinX: (b, E) => { b.hl(42, 53, 28, E.sk.S); b.mir(T => T.l(41, 49, 39, 54, E.sk.S)); },
      post: (b, E) => {
        const W = E.hc;
        b.add(L => { L.mir(T => T.l(46, 52, 38, 55, W, 3)); for (let k = 0; k < 18; k++) { const w = k < 10 ? 4 : Math.max(1, 4 - ((k - 10) >> 1)); L.hl(48 - w, 47 + w, 57 + k, W); } });
        b.add(L => L.r(46, 0, 4, 17, STEEL)); b.r(42, 12, 12, 2, '#3f7ed0');
      },
    },
    // 丹云婆婆：笑眯眯、圆髻横簪、耳坠
    dan: {
      fem: 1, skin: '#f2c8a4', hair: '#d6d2dc', shape: 'wide', robe: ['#a04424', '#e8743c', '#ffa870'], trim: '#ffe8c0', sw: 34, belt: '#a04424', knot: '#5fd3b0', noGloss: 1,
      back: tBack(20, 56, 0.6), hairline: tHigh(46), hairF: (L, c) => L.e(48, 8, 13, 8, c),
      F: { eye: 'n', iris: '#5a3a2a', blush: 1, brow: { c: '#a8a4b8', y: 34, len: 8 }, my: 54, eyes: { n: T_EYES.n.joy, cold: T_EYES.n.n }, mouth: { n: 'smile', joy: 'open', ang: 'flat', sad: 'frown', cold: 'flat' } },
      skinX: (b, E) => { const S = E.sk.S; b.hl(41, 54, 28, S); b.mir(T => { T.p(31, 45, S); T.p(30, 47, S); T.l(40, 49, 38, 54, S); }); },
      post: b => {
        b.add(L => L.r(26, 6, 44, 3, WOOD)); b.r(24, 5, 4, 4, '#f4c542'); b.r(68, 5, 4, 4, '#f4c542');
        b.r(36, 9, 5, 5, '#d8404a'); b.r(37, 8, 3, 7, '#d8404a'); b.r(38, 11, 1, 1, '#f4c542');
        b.mir(T => { T.p(30, 46, '#f4c542'); T.r(29, 47, 2, 5, '#5fd3b0'); });
      },
    },
    // 玄微子：高冠、三绺长须、肩上搭着拂尘
    dao: {
      skin: '#f0cca8', hair: '#2a2630', shape: 'long', robe: ['#54288a', '#8a4ec8', '#c27dff'], trim: '#f0e0ff', sw: 35, belt: '#54288a', knot: '#f4c542',
      back: tBack(20, 80, 0.2), hairline: tHigh(60),
      pre: b => { b.add(L => L.l(18, 127, 12, 58, WOOD, 3)); b.add(L => { L.e(13, 50, 8, 6, WHITE); L.l(6, 54, 3, 96, WHITE, 6); L.r(2, 96, 5, 8, WHITE); }); b.r(9, 56, 8, 3, '#f4c542'); },
      F: { eye: 'n', iris: '#5a3a7a', brow: { y: 34, tilt: -0.6, len: 10 }, mouth: { n: 'smile', joy: 'smile', ang: 'flat', sad: 'flat', cold: 'flat' } },
      post: (b, E) => {
        const H = tone('#3e2c62', '#1e1430', '#6e5aa0'), c = E.hc;
        b.add(L => { L.r(38, 0, 20, 18, H); L.r(36, 16, 24, 4, H); });
        b.hl(36, 59, 16, '#f4c542'); b.hl(28, 67, 10, '#f4c542'); b.hl(28, 67, 11, '#a8742a'); tGem(b, 47, 4, '#5fd3b0', 2, 6);
        b.add(L => { L.mir(T => { T.l(46, 52, 40, 54, c, 2); T.l(40, 55, 38, 76, c, 2); }); L.r(46, 58, 4, 26, c); L.r(47, 84, 2, 6, c); });
      },
    },
    // 血河老祖：秃顶血纹、骨冠、长须獠牙
    xuehe: {
      skin: '#d8b0a8', hair: '#e8e0e8', shape: 'long', robe: ['#2a0810', '#5a1220', '#8a2a34'], trim: '#c8a84a', inner: '#1a0a10', sw: 38, noGloss: 1, belt: '#1a0a10', knot: '#c8a84a',
      back: (L, c) => L.mir(T => T.r(25, 36, 6, 52, c)),
      F: { iris: '#ff3a2a', slant: 1, tail: '#8a1e2e', brow: { c: '#e8e0e8', len: 11, th: 3, tilt: 1.6 }, mouth: { n: 'fang', joy: 'fangO', ang: 'grit', sad: 'flat', cold: 'flat' } },
      skinX: (b, E) => {
        b.add(L => L.e(48, 25, 15.5, 12, E.sk.s), { noHi: 1 });
        b.l(48, 16, 48, 31, '#a8202a', 2); b.mir(T => { T.l(40, 18, 36, 30, '#a8202a'); T.l(41, 49, 39, 55, E.sk.S); });
      },
      post: (b, E) => {
        const c = E.hc, BN = tone('#e4d6b8', '#9a7a6a', '#fff8e0');
        b.add(L => { L.mir(T => T.l(45, 58, 39, 60, c, 2)); for (let k = 0; k < 26; k++) { const w = k < 8 ? 4 : Math.max(1, 4 - ((k - 8) / 5 | 0)); L.hl(48 - w, 47 + w, 61 + k, c); } });
        b.add(L => L.mir(T => { T.r(30, 14, 6, 6, BN); T.r(26, 5, 4, 11, BN); T.r(37, 9, 4, 9, BN); T.r(44, 2, 4, 15, BN); }));
        b.r(46, 18, 4, 4, '#d8404a'); b.p(46, 18, '#ff8a8a');
      },
    },
  };
  // 主角：男束发金环，女双髻粉带；道袍随境界九色，大乘起白发
  function tMeSpec(look, realm) {
    const R0 = L.REALMS[Math.min(realm, 9)], f = !!look.f, hair = realm >= 7 ? '#e9e8f2' : look.hair || HAIR_K;
    const F = { iris: '#6a5a9a', blush: f, brow: { tilt: realm < 2 ? -1 : realm >= 6 ? 1 : 0, c: realm >= 7 ? '#8a88a0' : undefined }, mouth: { n: realm < 2 ? 'line' : 'smile', joy: 'open', cold: 'flat' } };
    if (f) return {
      fem: 1, skin: look.skin, hair, shape: 'round', robe: R0.robe, trim: R0.trim, F, knot: R0.trim,
      back: tBack(21, 108, 0.14), hairline: tBangs(64, 30),
      hairF: (L, c) => { L.e(35, 9.5, 7, 6.5, c); L.e(61, 9.5, 7, 6.5, c); },
      post: (b, E) => { for (const x of [33, 59]) { b.add(L => { L.r(x - 1, 13, 7, 3, PINK); L.l(x + 1, 15, x - 2, 22, PINK, 2); L.l(x + 4, 15, x + 6, 21, PINK, 2); }, { sep: 1 }); b.r(x + 1, 13, 2, 2, '#f4c542'); } b.mir(T => { for (let y = 50; y < 104; y += 4) T.p(27, y, up(E.hc)); }); },
    };
    // 男主：俊朗的少年侠客——高马尾甩在左肩后、朱红发带、中分碎刘海、剑眉、眼尾上挑、肩宽、背后一柄剑
    const rc = realm >= 9 ? '#f6f2fa' : '#d8404a', rd = realm >= 9 ? '#b4b0cc' : '#8a1e2e';
    return {
      skin: look.skin, hair, shape: 'sharp', sw: 36, robe: R0.robe, trim: R0.trim, knot: R0.trim,
      F: { iris: '#4a5aa8', slant: 1, brow: { th: 2, len: 11, y: 35, tilt: realm < 2 ? 0.8 : 1.8, c: realm >= 7 ? '#8a88a0' : undefined },
        eyes: { n: ['.........', 'LLLLLLLL.', '.LIIIIiLL', '.whIIiiw.', '..iIIjj..', '...uuu...'], cold: ['.........', '.........', 'LLLLLLLLL', '.wIIIIiL.', '..hIIij..', '.........'] },
        lip: '#9a5a56', mouth: { n: realm < 2 ? 'line' : 'smirk', joy: 'smile', ang: 'frown', shock: 'pout', sad: 'tight', cold: 'flat' } },
      back: (L, c) => { tBack(19, 62, 0.6)(L, c); L.l(40, 7, 24, 14, c, 8); L.l(24, 14, 15, 44, c, 8); tLock(L, 19, 44, 22, 82, 9, c); },
      pre: b => tHilt(b, { grip: '#3a3155', guard: GOLD, pommel: rc }),
      hairline: (x, d) => (d > 14.5 ? 50 - (d - 14.5) * 2.5 : Math.min(32, 22 + Math.abs(x - 53) * 0.42 + (x % 6 === 1 ? 4 : x % 6 === 4 ? -1 : 0))),
      hairF: (L, c) => { L.e(46, 8.5, 7, 6, c); L.mir(T => tLock(T, 32, 30, 31, 58, 4, c)); },
      skinX: (b, E) => b.mir(T => { T.p(36, 55, E.sk.S); T.p(37, 56, E.sk.S); T.p(38, 57, E.sk.S); }),
      post: (b, E) => {
        b.add(L => L.r(40, 12, 13, 3, rc), { sep: 1 }); b.hl(40, 52, 14, rd);
        b.add(L => { L.l(40, 13, 33, 16, rc, 2); L.l(33, 16, 29, 23, rc, 2); L.l(39, 15, 35, 22, rd, 2); }, { sep: 1 });
        for (let y = 18; y < 78; y += 2) { const x = y < 44 ? 19 - Math.round((y - 14) * 0.2) : 16 + Math.round((y - 44) * 0.08); if (b.at(x, y) === E.hc) b.p(x, y, up(E.hc)); }
      },
    };
  }

  // ---- 出图：残魂、表情叠加 ----
  function tGhost(src) {
    const c = mk(TW, TH), g = c.getContext('2d');
    g.globalAlpha = 0.93; g.drawImage(src, 0, 0); g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    for (let y = 98; y < TH; y++) for (let x = 0; x < TW; x++) { const lv = (y - 98) * 0.56 + Math.abs(x - 47.5) * 0.08 + Math.sin(x * 0.45 + y * 0.25) * 2.5; if (BAYER[((x >> 1) & 3) + ((y >> 1) & 3) * 4] < lv) g.fillRect(x, y, 1, 1); }
    return c;
  }
  function tFx(src, fx) {
    const c = mk(TW, TH), g = c.getContext('2d'), has = k => (' ' + fx + ' ').includes(' ' + k + ' '), ey = 39; g.drawImage(src, 0, 0);
    const solid = g.getImageData(0, 0, TW, TH).data, px = (x, y, col, a, w, h) => { if (!solid[(y * TW + x) * 4 + 3]) return; g.globalAlpha = a === undefined ? 1 : a; g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); g.globalAlpha = 1; };
    if (has('shade') || has('cold')) { const k = has('shade') ? 1 : 0.42, y1 = has('shade') ? ey + 9 : ey + 3; for (let y = ey - 16; y <= y1; y++) for (let x = 32; x < 64; x++) { const i = (y * TW + x) * 4; if (y >= 22 && solid[i + 3] && solid[i] * 0.3 + solid[i + 1] * 0.59 + solid[i + 2] * 0.11 > 120) px(x, y, '#1b1326', k * (y <= ey + 4 ? 0.5 : y <= ey + 6 ? 0.34 : ((x >> 1) + (y >> 1)) % 2 ? 0.3 : 0.12)); } }
    if (has('blush')) for (const sx of [33, 57]) for (let k = 0; k < 7; k++) { px(sx + k, ey + 9 + (k % 2), '#ff8a8a', 0.8); if (k > 0 && k < 6) px(sx + k, ey + 10 - (k % 2), '#ff8a8a', 0.45); }
    if (has('tear')) for (const sx of [37, 57]) { px(sx, ey + 6, '#e8f8ff', 1, 2, 1); px(sx, ey + 7, '#8ad0ff', 1, 2, 5); px(sx, ey + 8, '#c8f0ff'); px(sx, ey + 12, '#c8f0ff', 1, 2, 2); px(sx, ey + 16, '#8ad0ff', 0.85, 2, 2); px(sx + (sx < 48 ? -1 : 1), ey + 19, '#c8f0ff', 0.7); }
    if (has('sweat')) { px(67, ey - 12, '#c8f0ff'); px(66, ey - 11, '#c8f0ff', 1, 3, 1); px(66, ey - 10, '#8ad0ff', 1, 3, 3); px(67, ey - 7, '#8ad0ff'); px(66, ey - 10, '#ffffff'); g.fillStyle = '#c8f0ff'; g.fillRect(70, ey - 4, 1, 2); g.fillRect(70, ey - 1, 1, 1); }
    if (has('blood')) { const my = ey + 14; px(53, my, '#c8323c', 1, 2, 2); px(54, my + 2, '#c8323c', 1, 2, 3); px(54, my + 5, '#8a1020', 1, 1, 2); px(55, my + 5, '#c8323c'); px(54, my + 8, '#c8323c', 0.8); }
    if (has('mono')) { const d = g.getImageData(0, 0, TW, TH), p = d.data; for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const l = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / 255; p[i] = Math.round(20 + l * 170); p[i + 1] = Math.round(34 + l * 196); p[i + 2] = Math.round(56 + l * 190); } g.putImageData(d, 0, 0); }
    if (has('fade')) {
      const d = g.getImageData(0, 0, TW, TH), p = d.data;
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) { const i = (y * TW + x) * 4; if (!p[i + 3]) continue; const lv = (y - 62) * 0.36 + Math.sin(x * 0.45 + y * 0.25) * 2; if (BAYER[((x >> 1) & 3) + ((y >> 1) & 3) * 4] < lv) p[i + 3] = 0; else { p[i + 3] = Math.round(p[i + 3] * 0.82); p[i] = Math.min(255, p[i] + 24); p[i + 1] = Math.min(255, p[i + 1] + 30); p[i + 2] = Math.min(255, p[i + 2] + 36); } }
      g.putImageData(d, 0, 0);
      const r = seeded(7); g.fillStyle = '#c8f0ff'; for (let i = 0; i < 40; i++) g.fillRect(8 + Math.floor(r() * 80), 66 + Math.floor(r() * 60), 1 + (i % 3 === 0 ? 1 : 0), 1 + (i % 3 === 0 ? 1 : 0));
    }
    return c;
  }
  const tKey = (id, alt) => { id = P_ALIAS[id] || id; return alt && TACHIE[id + '2'] ? id + '2' : id; };
  const tMood = m => (T_MOODS.includes(m) ? m : 'n');
  const tOut = (spec, mood) => { const c = tPerson(spec, mood).cv({ max: 30 }); return spec.ghost ? tGhost(c) : c; };
  ART.tachieDims = { w: TW, h: TH, eyeY: 39, faceX: 48 };
  ART.tachieMoods = T_MOODS;
  ART.tachieIds = () => Object.keys(TACHIE);
  ART.hasTachie = (id, alt) => !!TACHIE[tKey(id, alt)];
  // ART.tachie(id, mood, fx, alt) → 96×128 画布；没有立绘返回 null。mood 六种（含 cold）；fx 同 portraitX，可空格连写
  ART.tachie = function (id, mood, fx, alt) {
    const key = tKey(id, alt), spec = TACHIE[key]; if (!spec) return null; mood = tMood(mood); fx = (fx || '').trim();
    const base = cached('tch|' + key + '|' + mood, () => tOut(spec, mood));
    const f = (mood === 'cold' ? 'cold ' : '') + fx;
    return f ? cached('tchx|' + key + '|' + mood + '|' + fx, () => tFx(base, f)) : base;
  };
  // 主角立绘：look = { hair, skin, f }，realm 0～9
  ART.tachieMe = function (look, realm, mood, fx) {
    mood = tMood(mood); realm = Math.max(0, Math.min(9, realm | 0)); fx = (fx || '').trim();
    const k = [look.hair, look.skin, look.f ? 1 : 0, realm, mood].join('|');
    const base = cached('tchme|' + k, () => tOut(tMeSpec(look, realm), mood));
    const f = (mood === 'cold' ? 'cold ' : '') + fx;
    return f ? cached('tchmex|' + k + '|' + fx, () => tFx(base, f)) : base;
  };

  // ---- 特写带用立绘：小像的画布记下自己是谁，ART.cutin 见到有立绘的就按原分辨率裁眉眼（不再把 48 像素放大两倍） ----
  const tag = (c, t) => { if (c && !c._tk) { try { c._tk = t; } catch (e) { /* 只是个记号 */ } } return c; };
  { const p0 = ART.portrait; ART.portrait = function (id, mood, alt) { return tag(p0.apply(this, arguments), { id, mood, alt: !!alt }); }; }
  { const p0 = ART.portraitMe; ART.portraitMe = function (look, realm, mood) { return tag(p0.apply(this, arguments), { me: look, realm, mood }); }; }
  { const p0 = ART.portraitX; ART.portraitX = function (id, mood, fx, alt) { const c = p0.apply(this, arguments); if (!c || c._tk) return c; if (typeof id === 'string') return tag(c, { id, mood, alt: !!alt, fx }); return id && id._tk ? tag(c, Object.assign({}, id._tk, { fx: ((id._tk.fx || '') + ' ' + (fx || '')).trim() })) : c; }; }
  ART.tachieOf = src => { const t = src && src._tk; if (!t) return null; return t.me ? ART.tachieMe(t.me, t.realm, t.mood, t.fx) : ART.tachie(t.id, t.mood, t.fx, t.alt); };
  { const c0 = ART.cutin; ART.cutin = function (src, color, flip, key) {
    const big = ART.tachieOf(src); if (!big) return c0.apply(this, arguments);
    const draw = () => { const band = c0.call(this, null, color, flip), c = mk(200, 48), g = c.getContext('2d'); g.drawImage(band, 0, 0);
      const dx = flip ? 96 : 8; g.save(); if (flip) { g.translate(dx + 96, 0); g.scale(-1, 1); g.drawImage(big, 0, 22, 96, 40, 0, 4, 96, 40); } else g.drawImage(big, 0, 22, 96, 40, dx, 4, 96, 40); g.restore();
      g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const x = flip ? 6 + i * 13 : 194 - i * 13 - 30; g.globalAlpha = 0.9 - i * 0.13; g.fillRect(x, 10 + (i * 11) % 28, 30 - i * 3, 1); } g.globalAlpha = 1;
      for (let y = 0; y < 48; y++) { const sk = Math.round((47 - y) * 0.25); if (sk) g.clearRect(flip ? 200 - sk : 0, y, sk, 1); }
      return c; };
    return key ? cached('cutinB|' + key + '|' + (color || '') + (flip ? 1 : 0), draw) : draw();
  }; }
}

root.ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
