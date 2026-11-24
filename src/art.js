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


root.ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
