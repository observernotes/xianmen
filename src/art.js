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
function charGrid(body, female) {
  const g = grid(HEAD.concat(body), 30);
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
    g: '#f4c542', G: '#a8742a', y: '#fff2a8', Y: '#fff2a8', p: '#f7a3bd', P: '#c8607e',
    s: skin, S: lerpC(hs(skin, 0.84), '#d98a86', 0.22), m: lerpC(skin, '#f2777c', 0.42), M: lerpC(skin, '#a8444c', 0.62),
    E: '#2a1a30', i: '#6a4a52', w: '#ffffff', u: '#f6f2fa',
    D: hs(robe[0], 0.68), R: robe[0], r: robe[1], q: robe[2],
    t: trim, T: hs(trim, 0.74), b: hs(robe[0], 0.5),
    k: '#2c2238', c: '#b98a4c', C: '#8a5c36', v: '#dcb56e', V: '#f0d08a',
  }, extra || {});
}
const cache = new Map();
function cached(key, fn) { let c = cache.get(key); if (!c) { c = fn(); cache.set(key, c); } return c; }
ART.clearCache = () => { cache.clear(); layerCache.clear(); };
const layerCache = new Map();

ART.sit = function (look, realm, opts) {
  const R0 = L.REALMS[Math.min(realm, 9)];
  const hair = realm >= 7 ? '#e9e8f2' : look.hair;
  const gray = opts && opts.gray ? 1 : 0;
  const key = ['sit', hair, look.skin, look.f, realm, gray].join('|');
  return cached(key, () => {
    const g = charGrid(SIT_BODY, look.f);
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
  const key = ['st', look.hair, look.skin, look.f, robe.join(), trim, frame, extra ? JSON.stringify(extra) : ''].join('|');
  return cached(key, () => {
    const g = charGrid(STAND_BODY, look.f);
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
  return ART.stand({ ...look, hair }, R0.robe, R0.trim, frame);
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
ART.setCtx = (c, w) => { ctx = c; W = w; };
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

// 洞府场景主绘制。返回需要叠加光照的点
ART.drawHome = function (st, t, OY, parts, opts) {
  const ph = opts.phase, skyNow = ART.skyAt(ph), night = skyNow.light < 0.6, dark = 1 - skyNow.light;
  const sky = ART.skyAt(Math.round(ph * 240) / 240);
  const season = Math.floor(((st.year || 0) % 1) * 4);
  const f = homeLayers(st, sky, OY, season), info = f.terr.info, amb = f.amb;
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
  // 云
  for (const c of CLOUDS) { const spr = f.clouds[c.k], x = ((c.x + t * c.s) % 290) - 50; ctx.drawImage(spr, Math.round(x), Math.round(c.y - OY * (c.far ? 0.5 : 0.25))); }
  ctx.drawImage(f.mount, 0, 0);
  // 流动的山岚
  ctx.globalAlpha = 0.45; for (const [y, sp, o] of [[58, 0.004, 0], [74, 0.007, 90], [90, 0.011, 170]]) { const x = -(((t * sp + o) % 260) | 0); ctx.drawImage(f.mist, x, y); ctx.drawImage(f.mist, x + 260, y); } ctx.globalAlpha = 1;
  ctx.drawImage(f.terrT, 0, 0);
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
  for (let i = 0; i < 9; i++) { const spr = f.sea[i % 3], sp2 = 0.0018 + (i % 3) * 0.0012, x = ((i * 41 + t * sp2) % 290) - 60; ctx.drawImage(spr, Math.round(x), 146 + (i % 3) * 3 + Math.round(Math.sin(t / 1900 + i) * 1)); }
  R(0, 158, 200, 3, f.seaC);
  lastHome = { sky: skyNow };
  return { sky: skyNow, night, furnaceTop, lights };
};

// 夜间：地面以环境光正片叠底（保留色彩，偏蓝），再点亮光源
ART.nightOverlay = function (sky, OY, H, lights) {
  const dark = 1 - sky.light;
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
    advCur = { key, OY, layers, sky };
  }
  ctx.drawImage(advCur.sky, 0, -OY);
  for (const l of advCur.layers) if (l.pre) drawStrip(l.c, scroll * l.f, -TOPPAD);
  if (A.back) A.back(t, OY, scroll);
  for (const l of advCur.layers) if (!l.pre) drawStrip(l.c, scroll * l.f, l.y !== undefined ? l.y : -TOPPAD);
  if (A.fx) A.fx(t, OY, scroll);
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
    return { url: c.toDataURL(), slice: 6, size: 20, fill: F.fill, ink: F.ink || (kind === 'hud' ? '#efe3c4' : '#3b2b1f'), canvas: c };
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
  } else if (who.look) { const R0 = L.REALMS[Math.min(who.realm | 0, 9)]; look = Object.assign({}, who.look, { hair: who.realm >= 7 ? '#e9e8f2' : who.look.hair }); robe = R0.robe; trim = R0.trim; }
  else { look = who; robe = who.robe || L.REALMS[0].robe; trim = who.trim || '#dfe7ef'; }
  const key = ['ft', look.hair, look.skin, look.f ? 1 : 0, robe.join(), trim, mods.join(), frame, flip ? 1 : 0].join('|');
  return cached(key, () => {
    const g = charGrid(STAND_BODY, look.f);
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
    stageCur = { kind, OY, c };
  }
  ctx.drawImage(stageCur.c, 0, -OY);
  S.fx(t || 0);
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

root.ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
