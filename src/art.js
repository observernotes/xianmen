/* 废柴仙途 · 像素美术：精灵、洞府场景、历练场景（全部用代码逐像素绘制） */
(function (root) {
'use strict';
const ART = {};
// 精灵尺寸与锚点（ui.js 按这些数值摆放，改精灵尺寸时同步修改）
// sit: 打坐像，脚底中心为锚点，split 以上为随呼吸起伏的上半身
// stand: 站姿（御剑、敌人），脚底中心为锚点；pet: 灵宠，左下角为锚点，tail 表示由界面补画尾巴
ART.dims = { sit: { w: 24, h: 28, split: 19 }, stand: { w: 18, h: 29 }, pet: { w: 13, h: 11, tail: true }, wolf: { w: 20, h: 11 } };

// ---------- 颜色工具 ----------
function hex(c) { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function toHex(r, g, b) { return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1); }
function lerpC(a, b, t) { const A = hex(a), B = hex(b); return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function shade(c, f) { const A = hex(c); return toHex(Math.min(255, A[0] * f), Math.min(255, A[1] * f), Math.min(255, A[2] * f)); }
ART.lerpC = lerpC; ART.shade = shade;

function pix(map, pal) {
  const h = map.length, w = Math.max(...map.map(r => r.length));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < map[y].length; x++) {
    const ch = map[y][x]; const col = pal[ch];
    if (!col) continue;
    g.fillStyle = col; g.fillRect(x, y, 1, 1);
  }
  return c;
}
ART.pix = pix;

// ---------- 主角：打坐（24×28） ----------
const SIT = [
  '..........oooo..........',
  '.........ojjhho.........',
  '.........ohjhHo.........',
  '........oogggGoo........',
  '......ooHhhjjhhHoo......',
  '.....oHhhjjjhhhhHHo.....',
  '....oHhhjjhhhhhhhhHo....',
  '....oHhjhhhhhhhhhhHo....',
  '....oHhhHsssssssHhHo....',
  '....oHhSsssssssssSHo....',
  '....oHSseesssseesSHo....',
  '....oHSsmssssssmsSHo....',
  '.....oHSsssSSsssSHo.....',
  '......oHSssssssSHo......',
  '.......ooSSssSSoo.......',
  '......oqqtTssTtrRo......',
  '.....oqqqrtTTtrrRRo.....',
  '....oqqrrrrtTrrrrRRo....',
  '...oqqrrrrrtTrrrrrRRo...',
  '..oqqrrrRsssssSRrrrRRo..',
  '.oqqrrrRRbbbbbbRRrrrRRo.',
  'oqqqrrrrrrrrrrrrrrrRRRRo',
  'oqrrrrrrrRRRRRRrrrrrRRRo',
  '.oRRRRRRRRRRRRRRRRRRRRo.',
  'oCvvvvvvvvvvvvvvvvvvvvCo',
  'oCccccccccccccccccccccCo',
  '.oCCCCCCCCCCCCCCCCCCCCo.',
  '..oooooooooooooooooooo..',
];
// ---------- 主角：站立（18×29），两帧衣摆 ----------
const STAND = [
  '.......oooo.......',
  '......ojjhho......',
  '......oggGGo......',
  '....ooHhjjhHoo....',
  '...oHhhjjhhhhHo...',
  '...oHhjhhhhhhHo...',
  '...oHhHssssHhHo...',
  '...oHSssssssSHo...',
  '...oHSeesseeSHo...',
  '...oHSmssssmSHo...',
  '....oHSsSSsSHo....',
  '.....oSssssSo.....',
  '......oSSSSo......',
  '....ooqtTTtroo....',
  '...oqqrtTTtrRRo...',
  '..oqqrrrtTrrrRRo..',
  '..oqsrrrtTrrrRso..',
  '..oqsrrbbbbrrRso..',
  '...oqrrrtTrrRRo...',
  '...oqrrrtTrrRRo...',
  '..oqqrrrtTrrrRRo..',
  '..oqrrrrtTrrrRRo..',
  '.oqqrrrrtTrrrrRRo.',
  '.oqrrrrrtTrrrrRRo.',
  'oqqrrrrrtTrrrrrRRo',
  'oRRRRRRRRRRRRRRRRo',
  '.oooooooooooooooo.',
  '....oko....oko....',
  '....ooo....ooo....',
];
function femaleSit(m) {
  m = m.map(r => r.split(''));
  for (let y = 9; y <= 18; y++) {
    m[y][3] = 'o'; m[y][4] = 'H'; m[y][5] = y >= 12 ? 'h' : m[y][5];
    m[y][20] = 'o'; m[y][19] = 'H'; m[y][18] = y >= 12 ? 'H' : m[y][18];
  }
  m[3] = '........oopppPoo........'.split('');
  return m.map(r => r.join(''));
}
function femaleStand(m) {
  m = m.map(r => r.split(''));
  for (let y = 7; y <= 17; y++) { m[y][1] = 'o'; m[y][2] = 'H'; m[y][16] = 'o'; m[y][15] = 'H'; }
  m[2] = '......opppPo......'.split('');
  return m.map(r => r.join(''));
}
function flutter(m) {
  return m.map((r, y) => (y >= 20 && y <= 26) ? ('.' + r.slice(0, r.length - 1)) : r);
}
// 调色板：look = {hair, skin, f}, robe = [暗, 中, 亮], trim
function palette(look, robe, trim, extra) {
  const hair = look.hair || '#2a2230';
  const skin = look.skin || '#f2c9a0';
  return Object.assign({
    o: '#1b1326', H: shade(hair, 0.7), h: hair, j: shade(hair, 1.9),
    g: '#f4c542', G: '#b8862a', p: '#f59ab5', P: '#c8607e',
    S: shade(skin, 0.82), s: skin, e: '#1b1326', m: '#f4a0a0',
    R: robe[0], r: robe[1], q: robe[2], T: shade(trim, 0.75), t: trim,
    b: '#3a2a1e', k: '#2a2030',
    C: '#6a3628', c: '#a4503a', v: '#c97a58',
  }, extra || {});
}
const cache = new Map();
function cached(key, fn) { let c = cache.get(key); if (!c) { c = fn(); cache.set(key, c); } return c; }
ART.clearCache = () => cache.clear();
ART.sit = function (look, realm, opts) {
  const R0 = L.REALMS[Math.min(realm, 9)];
  const hair = realm >= 7 ? '#e9e8f2' : look.hair;
  const key = ['sit', hair, look.skin, look.f, realm, opts && opts.gray ? 1 : 0].join('|');
  return cached(key, () => {
    const map = look.f ? femaleSit(SIT) : SIT;
    const pal = palette({ ...look, hair }, R0.robe, R0.trim);
    if (opts && opts.gray) for (const k in pal) if (k !== 'o') { const A = hex(pal[k]); const v = (A[0] + A[1] + A[2]) / 3; pal[k] = toHex(v, v, v); }
    return pix(map, pal);
  });
};
ART.stand = function (look, robe, trim, frame, extra) {
  const key = ['st', look.hair, look.skin, look.f, robe.join(), trim, frame, extra ? JSON.stringify(extra) : ''].join('|');
  return cached(key, () => {
    let map = look.f ? femaleStand(STAND) : STAND;
    if (frame) map = flutter(map);
    const pal = palette(look, robe, trim, extra && extra.pal);
    const c = pix(map, pal);
    if (extra && extra.horns) { const g = c.getContext('2d'); g.fillStyle = '#e8dcc8'; g.fillRect(4, 1, 1, 3); g.fillRect(13, 1, 1, 3); g.fillRect(3, 0, 1, 1); g.fillRect(14, 0, 1, 1); }
    return c;
  });
};
ART.standRealm = function (look, realm, frame) {
  const R0 = L.REALMS[Math.min(realm, 9)];
  const hair = realm >= 7 ? '#e9e8f2' : look.hair;
  return ART.stand({ ...look, hair }, R0.robe, R0.trim, frame);
};

// ---------- 灵宠（13×11） ----------
const PET = [
  '.oo.......oo.',
  '.obo.....obo.',
  '.obbooooobbo.',
  'obaaaaaaaaabo',
  'obaeaaaaaeabo',
  'obaaaanaaaabo',
  '.obwwwwwwwbo.',
  '.obwwwwwwwbo.',
  '.obbwwwwwbbo.',
  '.obooooooobo.',
  '..oo.....oo..',
];
ART.pet = function (tier) {
  return cached('pet' + tier, () => {
    const c3 = L.PETS[tier].c;
    const c = pix(PET, { o: shade(c3[2], 0.6), a: c3[0], b: c3[1], e: '#1b1326', n: '#e87a8a', w: lerpC(c3[0], '#ffffff', 0.6) });
    const g = c.getContext('2d');
    if (tier === 6) { g.fillStyle = '#fff2a8'; g.fillRect(2, 0, 1, 1); g.fillRect(10, 0, 1, 1); }
    if (tier === 3) { g.fillStyle = shade(c3[1], 1.2); g.fillRect(0, 6, 1, 2); g.fillRect(12, 6, 1, 2); }
    return c;
  });
};

// ---------- 怪物 ----------
const WOLF = [
  '...oo...............',
  '..obbo..............',
  '.obbbboooooooooo....',
  'oebbbbbbbbbbbbbbo...',
  'obbbbbbbbbbbbbbbbo.o',
  '.onbbbbbbbbbbbbbbbob',
  '..ooaaaaaaaaaabbboo.',
  '....oaaaaaaaaaabbo..',
  '....obbo....obbo....',
  '....obbo....obbo....',
  '....ooo.....ooo.....',
];
ART.wolf = function (fc) {
  return cached('wolf' + fc.join(), () => pix(WOLF, { o: shade(fc[1], 0.5), b: fc[0], a: lerpC(fc[0], '#ffffff', 0.35), e: '#ff4040', n: '#1b1326' }));
};
ART.foeMan = function (fc, kind) {
  const look = { hair: kind === 'tomb' ? '#d8d0b8' : kind === 'blood' ? '#2a0c10' : '#1d1a24', skin: kind === 'tomb' ? '#c8c0a8' : kind === 'abyss' ? '#b89ad0' : kind === 'blood' ? '#e08a7a' : '#e8b68a', f: 0 };
  return ART.stand(look, [shade(fc[1], 0.8), fc[1], fc[0]], shade(fc[0], 1.2), 0, { horns: kind === 'blood' || kind === 'abyss', pal: kind === 'tomb' ? { e: '#ff3030' } : null });
};

// ---------- 戒中老祖头像（16×16） ----------
ART.elder = () => cached('elder', () => pix([
  '.....oooooo.....',
  '....owwwwwwo....',
  '...owwwwwwwwo...',
  '..owwWWWWWWwwo..',
  '..owWssssssWwo..',
  '..oWWwwsswwWWo..',
  '..oWseesseesWo..',
  '..oWssssssssWo..',
  '..owWsswwssWwo..',
  '.owwwwwwwwwwwwo.',
  '.owwwwWwwWwwwwo.',
  '..owwwwwwwwwwo..',
  '...owwwWWwwwo...',
  '....owwwwwwo....',
  '.....owwwwo.....',
  '......oooo......',
], { o: '#2a3a68', w: '#eef4ff', W: '#b8c8ea', s: '#c4d8ff', e: '#2a3a68' }));

// ---------- 头像（带背景，用于界面） ----------
ART.avatar = function (look, realm, bg, opts) {
  const key = ['av', look.hair, look.skin, look.f, realm, bg, opts ? JSON.stringify(opts) : ''].join('|');
  return cached(key, () => {
    const c = document.createElement('canvas'); c.width = 26; c.height = 30;
    const g = c.getContext('2d');
    g.fillStyle = '#231d36'; g.fillRect(0, 0, 26, 30);
    g.fillStyle = bg || '#3a3155'; g.globalAlpha = 0.55; g.fillRect(1, 6, 24, 24); g.globalAlpha = 1;
    for (let y = 0; y < 30; y += 2) { g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(0, y, 26, 1); }
    let spr;
    if (opts && opts.robe) spr = ART.stand(look, opts.robe, opts.trim || '#ffffff', 0, opts.extra);
    else spr = ART.sit(look, realm, opts);
    if (opts && opts.robe) g.drawImage(spr, 4, 3);
    else g.drawImage(spr, 1, 2);
    return c;
  });
};

// ---------- 昼夜调色 ----------
const SKY = {
  night: { top: '#0b0e2a', mid: '#18204a', hor: '#2b3768', far: '#2a3464', mid2: '#1f2850', near: '#161e3a', mist: '#3a4680', light: 0.42 },
  dawn: { top: '#2a3170', mid: '#7a68a6', hor: '#f4a98a', far: '#8a7cae', mid2: '#5c5888', near: '#3c446c', mist: '#f6c8b8', light: 0.8 },
  day: { top: '#3a7ccc', mid: '#6aa6e4', hor: '#c4e6f6', far: '#93b6da', mid2: '#6e92b6', near: '#4d7092', mist: '#eef6ff', light: 1 },
  dusk: { top: '#352865', mid: '#a95278', hor: '#ffb070', far: '#986a8e', mid2: '#684a76', near: '#42375c', mist: '#ffd2b2', light: 0.74 },
};
const KEYS = [[0, 'night'], [0.16, 'night'], [0.27, 'dawn'], [0.37, 'day'], [0.63, 'day'], [0.73, 'dusk'], [0.84, 'night'], [1, 'night']];
ART.skyAt = function (ph) {
  for (let i = 0; i < KEYS.length - 1; i++) {
    const [a, ka] = KEYS[i], [b, kb] = KEYS[i + 1];
    if (ph >= a && ph <= b) {
      const t = b === a ? 0 : (ph - a) / (b - a);
      const A = SKY[ka], B = SKY[kb], o = {};
      for (const k in A) o[k] = typeof A[k] === 'number' ? A[k] + (B[k] - A[k]) * t : lerpC(A[k], B[k], t);
      return o;
    }
  }
  return SKY.night;
};

// ---------- 场景基础绘制 ----------
let ctx = null, W = 200;
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx, cy, r, c) { ctx.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
function ellipse(cx, cy, rx, ry, c) { ctx.fillStyle = c; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
ART.R = R; ART.disc = disc;
ART.setCtx = (c, w) => { ctx = c; W = w; };

// 固定随机：山形与装饰
function seeded(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
function ridge(seed, base, amp, rough, len) {
  const rr = seeded(seed); const out = []; let y = base, v = 0;
  for (let x = 0; x < len; x++) { v += (rr() - 0.5) * rough; v *= 0.92; y += v; if (y < base - amp) { y = base - amp; v = Math.abs(v); } if (y > base + amp) { y = base + amp; v = -Math.abs(v); } out.push(y); }
  return out;
}
const HOME_RIDGE = { far: ridge(3, 52, 16, 1.6, 400), mid: ridge(11, 66, 10, 1.2, 400), near: ridge(29, 82, 6, 0.9, 400) };
const CLOUDS = (() => { const rr = seeded(5); const a = []; for (let i = 0; i < 6; i++) a.push({ x: rr() * 260, y: 6 + rr() * 34, s: 0.003 + rr() * 0.004, w: 3 + Math.floor(rr() * 3) }); return a; })();
const STARS = (() => { const rr = seeded(17); const a = []; for (let i = 0; i < 46; i++) a.push({ x: Math.floor(rr() * 200), y: Math.floor(rr() * 70) - 60, b: rr() }); return a; })();

function skyBands(top, mid, hor, y0, y1) {
  const n = 12, h = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = t < 0.55 ? lerpC(top, mid, t / 0.55) : lerpC(mid, hor, (t - 0.55) / 0.45);
    R(0, y0 + i * h, W, h + 1, c);
    if (i < n - 1) { // 交界处的棋盘抖动
      const t2 = (i + 1) / (n - 1);
      const c2 = t2 < 0.55 ? lerpC(top, mid, t2 / 0.55) : lerpC(mid, hor, (t2 - 0.55) / 0.45);
      ctx.fillStyle = c2; const yy = Math.round(y0 + (i + 1) * h) - 1;
      for (let x = (i % 2); x < W; x += 2) ctx.fillRect(x, yy, 1, 1);
    }
  }
}
function drawCloud(x, y, w, light, dark) {
  for (let k = 0; k < w; k++) disc(x + k * 6, y + (k % 2 ? 1 : 0), 4 + (k % 2), light);
  R(x - 3, y + 2, w * 6 + 5, 3, light);
  R(x - 2, y + 4, w * 6 + 3, 1, dark);
}
function mountains(arr, scroll, color, rim, snow) {
  for (let x = 0; x < W; x++) {
    const y = Math.round(arr[Math.floor((x + scroll) % arr.length)]);
    R(x, y, 1, 200 - y, color);
    if (rim) R(x, y, 1, 1, rim);
    if (snow && y < snow) R(x, y, 1, Math.min(3, snow - y), '#eef2ff');
  }
}
function mist(y, color, alpha, t, speed) {
  ctx.globalAlpha = alpha;
  for (let x = -20; x < W + 20; x += 2) {
    const yy = y + Math.round(Math.sin((x + t * speed) / 23) * 2 + Math.sin((x - t * speed * 0.7) / 11));
    R(x, yy, 2, 3, color);
  }
  ctx.globalAlpha = 1;
}
function pine(x, y, s, c0, c1, c2) {
  R(x - 1, y - 2, 2, 3, '#4a3020');
  for (let i = 0; i < 3; i++) {
    const w = (6 - i * 1.6) * s, yy = y - 2 - i * 4 * s;
    for (let r = 0; r < 4 * s; r++) {
      const ww = Math.max(1, Math.round(w * (r + 1) / (4 * s)));
      R(x - ww, yy - 4 * s + r + 1, ww, 1, c1);
      R(x, yy - 4 * s + r + 1, ww, 1, c2);
      if (r % 2 === 0) R(x - ww, yy - 4 * s + r + 1, 1, 1, c0);
    }
  }
}
function lantern(x, y, t, lit) {
  R(x, y - 3, 1, 3, '#2a1a14');
  R(x - 2, y, 5, 1, '#3a1a10');
  R(x - 2, y + 1, 5, 4, lit ? '#e8483a' : '#9a3028'); R(x - 1, y + 2, 3, 2, lit ? '#ffb070' : '#c85a40');
  R(x - 2, y + 5, 5, 1, '#3a1a10'); R(x, y + 6, 1, 2, '#f4c542');
}
function glow(x, y, r, c, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 3; i >= 1; i--) { ctx.globalAlpha = a * (0.22 + (3 - i) * 0.18); disc(x, y, Math.round(r * i / 3), c); }
  ctx.restore();
}
ART.glow = glow;

// ---------- 洞府 ----------
function drawCaveHome(st, t, night) {
  const lv = st.home.cave, cx = 100, base = 104;
  if (lv <= 0) { // 荒山破庙
    R(cx - 22, base - 20, 44, 20, '#7a6a5c'); R(cx - 22, base - 20, 44, 2, '#8e7e6e');
    for (let i = 0; i < 6; i++) R(cx - 20 + i * 7, base - 14 + (i % 2) * 5, 3, 1, '#5e5046');
    R(cx - 5, base - 13, 10, 13, '#2a201c'); R(cx - 4, base - 12, 8, 1, '#3a2e28');
    R(cx + 10, base - 16, 6, 5, '#3a302a'); // 破洞
    for (let r = 0; r < 9; r++) { const w = 22 + r * 3; R(cx - w / 2 - 6, base - 30 + r, r < 3 ? w - 14 : w, 1, r % 3 === 2 ? '#3e3a44' : '#55505c'); }
    R(cx + 14, base - 30, 8, 3, '#8fb3d9'); // 屋顶塌了一角
    R(cx - 26, base - 4, 6, 4, '#6a5e52'); R(cx + 20, base - 3, 7, 3, '#6a5e52');
    return;
  }
  if (lv <= 2) { // 竹林小筑
    for (let i = 0; i < 4; i++) { const bx = cx - 44 + i * 5; R(bx, base - 44 + (i % 2) * 4, 2, 44, i % 2 ? '#4f8a3a' : '#6fae4a'); for (let y = base - 40; y < base; y += 8) R(bx, y, 2, 1, '#2f5a22'); }
    R(cx - 20, base - 18, 40, 18, '#c9a66a');
    for (let x = cx - 20; x < cx + 20; x += 3) R(x, base - 18, 1, 18, '#a8854a');
    R(cx - 4, base - 12, 8, 12, '#4a3020'); R(cx + 8, base - 13, 6, 5, '#f6e2a8'); R(cx + 10, base - 13, 1, 5, '#a8854a');
    for (let r = 0; r < 10; r++) { const w = 30 + r * 3.4; R(cx - w / 2, base - 28 + r, w, 1, r % 2 ? '#b89048' : '#d4ad5c'); }
    R(cx - 26, base - 19, 52, 1, '#8a6a30');
    return;
  }
  if (lv <= 5) { // 石壁洞府
    for (let x = cx - 50; x < cx + 50; x++) {
      const hgt = 46 + Math.round(Math.sin(x / 9) * 4 + Math.sin(x / 4) * 2);
      R(x, base - hgt, 1, hgt, x % 7 === 0 ? '#5e5a6e' : '#6e6a80');
      R(x, base - hgt, 1, 2, '#8c88a0');
    }
    for (let i = 0; i < 18; i++) R(cx - 46 + (i * 13) % 92, base - 40 + (i * 7) % 36, 4, 1, '#55526a');
    // 拱门
    for (let y = 0; y < 26; y++) { const w = y < 8 ? Math.round(Math.sqrt(64 - (8 - y) * (8 - y)) * 1.4) : 11; R(cx - w, base - 26 + y, w * 2, 1, '#1a1622'); }
    R(cx - 14, base - 28, 28, 3, '#8a8296'); R(cx - 12, base - 31, 24, 3, '#a39cb0');
    R(cx - 7, base - 37, 14, 6, '#3a2418'); R(cx - 6, base - 36, 12, 4, '#f4c542'); R(cx - 4, base - 35, 8, 2, '#a8740b');
    R(cx - 16, base - 26, 3, 26, '#7a7290'); R(cx + 13, base - 26, 3, 26, '#7a7290');
    lantern(cx - 20, base - 24, t, night); lantern(cx + 20, base - 24, t, night);
    return;
  }
  // 楼阁 / 仙宫
  const palace = lv >= 9;
  const wall = palace ? '#f2eee6' : '#b5452f', pillar = palace ? '#d8cfbc' : '#7a2a1c';
  const roofC = palace ? '#e8b23c' : '#353a58', roofD = palace ? '#a8761a' : '#22263c', roofL = palace ? '#ffe08a' : '#4a5078';
  const w = palace ? 72 : 60;
  R(cx - w / 2 - 8, base - 4, w + 16, 4, palace ? '#ffffff' : '#9a94a6'); R(cx - w / 2 - 6, base - 6, w + 12, 2, palace ? '#e6e2ee' : '#b6b0c0');
  R(cx - w / 2, base - 22, w, 16, wall);
  for (let x = cx - w / 2 + 2; x < cx + w / 2 - 1; x += 9) { R(x, base - 22, 2, 16, pillar); R(x, base - 22, 1, 16, shade(pillar, 1.25)); }
  R(cx - 6, base - 18, 12, 12, palace ? '#c89a3a' : '#4a2a18'); R(cx - 1, base - 18, 1, 12, '#2a160c');
  for (const sx of [-1, 1]) { R(cx + sx * 18 - 3, base - 17, 6, 6, '#f6dca0'); R(cx + sx * 18, base - 17, 1, 6, pillar); R(cx + sx * 18 - 3, base - 14, 6, 1, pillar); }
  const roof = (y, ww, h) => {
    for (let r = 0; r < h; r++) { const rw = ww - (h - 1 - r) * 4; R(cx - rw / 2, y + r, rw, 1, r === h - 1 ? roofD : r % 2 ? roofC : roofL); }
    for (let x = cx - ww / 2 + 2; x < cx + ww / 2 - 2; x += 3) R(x, y + h - 2, 1, 1, roofD);
    R(cx - ww / 2 - 2, y + h - 3, 3, 1, roofC); R(cx + ww / 2 - 1, y + h - 3, 3, 1, roofC);
    R(cx - ww / 2 - 3, y + h - 4, 1, 1, roofL); R(cx + ww / 2 + 2, y + h - 4, 1, 1, roofL);
  };
  roof(base - 33, w + 16, 11);
  R(cx - 7, base - 30, 14, 6, '#3a1a10'); R(cx - 6, base - 29, 12, 4, '#f4c542');
  R(cx - w / 2 + 10, base - 44, w - 20, 11, wall);
  for (let x = cx - w / 2 + 12; x < cx + w / 2 - 11; x += 8) R(x, base - 44, 2, 11, pillar);
  roof(base - 53, w - 4, 9);
  if (palace) { R(cx - w / 2 + 20, base - 61, w - 40, 8, wall); roof(base - 69, w - 26, 8); R(cx - 1, base - 75, 2, 6, '#ffe08a'); R(cx - 2, base - 77, 4, 2, '#fff6c0'); }
  lantern(cx - w / 2 - 2, base - 21, t, night); lantern(cx + w / 2 + 2, base - 21, t, night);
}
function drawField(st, t) {
  const lv = st.home.field; if (!lv) return;
  const plots = Math.min(6, 1 + Math.floor(lv / 3));
  for (let i = 0; i < plots; i++) {
    const px = 8 + (i % 3) * 18, py = 118 + Math.floor(i / 3) * 14;
    R(px, py, 16, 8, '#6a4a32'); R(px, py, 16, 1, '#8a6444'); R(px, py + 7, 16, 1, '#4a3222');
    for (let k = 0; k < 4; k++) {
      const x = px + 2 + k * 4, sway = Math.round(Math.sin(t / 600 + i + k) * 0.6);
      R(x + sway, py - 3, 1, 4, '#3f8a3a'); R(x - 1 + sway, py - 3, 1, 1, '#6fcf5a'); R(x + 1 + sway, py - 2, 1, 1, '#6fcf5a');
      const herb = lv >= 12 ? '#ffd76a' : lv >= 6 ? '#8ff5d0' : '#c9f07a';
      R(x + sway, py - 4, 1, 1, herb);
    }
  }
}
function drawFurnace(st, t) {
  const lv = st.home.furnace; if (!lv) return;
  const s = lv >= 15 ? 1.4 : lv >= 7 ? 1.2 : 1;
  const fx = 166, fy = 132;
  const w = Math.round(14 * s), h = Math.round(10 * s);
  R(fx - w / 2 + 1, fy, 2, 3, '#5a3a18'); R(fx + w / 2 - 3, fy, 2, 3, '#5a3a18'); R(fx - 1, fy, 2, 3, '#5a3a18');
  ellipse(fx, fy - h / 2, w / 2, h / 2, '#a8702e');
  ellipse(fx - 1, fy - h / 2 - 1, w / 2 - 2, h / 2 - 2, '#c88a3e');
  R(fx - w / 2 - 1, fy - h, w + 2, 2, '#d8a050'); R(fx - w / 2 - 2, fy - h + 1, 2, 3, '#a8702e'); R(fx + w / 2, fy - h + 1, 2, 3, '#a8702e');
  R(fx - 3, fy - h / 2 - 1, 6, 2, '#7a4a18');
  const fl = (t / 120 | 0) % 3;
  R(fx - 3, fy + 1, 6, 2, ['#ff7a2a', '#ffb03a', '#ff5a1a'][fl]); R(fx - 1, fy, 2, 1, '#ffe07a');
  return { x: fx, y: fy - h };
}

// 洞府场景主绘制。返回需要叠加光照的点
ART.drawHome = function (st, t, OY, parts, opts) {
  const ph = opts.phase, sky = ART.skyAt(ph), night = sky.light < 0.6;
  // 天空（含额外高度）
  skyBands(sky.top, sky.mid, sky.hor, -OY, 92);
  // 星星
  if (sky.light < 0.75) { const a = (0.75 - sky.light) / 0.33; for (const s of STARS) { if ((t / 400 + s.b * 10) % 6 < 0.6) continue; ctx.globalAlpha = Math.min(1, a) * (0.5 + s.b * 0.5); R(s.x, s.y - OY * 0.2, 1, 1, '#e8ecff'); } ctx.globalAlpha = 1; }
  // 日月
  const ang = ph * Math.PI * 2;
  const sunX = 100 - Math.sin(ang) * 80, sunY = 60 + Math.cos(ang) * 55;
  if (sunY < 70) { disc(sunX, sunY, 6, '#fff3c4'); disc(sunX, sunY, 4, '#ffe08a'); }
  const moonX = 100 + Math.sin(ang) * 80, moonY = 60 - Math.cos(ang) * 55;
  if (moonY < 70) { disc(moonX, moonY, 5, '#eef0ff'); disc(moonX + 2, moonY - 1, 4, sky.top); }
  // 云
  for (const c of CLOUDS) { const x = ((c.x + t * c.s) % 280) - 40; drawCloud(x, c.y, c.w, lerpC(sky.mist, '#ffffff', 0.4), lerpC(sky.mid, sky.mist, 0.5)); }
  // 远山三层 + 雾
  mountains(HOME_RIDGE.far, t * 0.002, sky.far, lerpC(sky.far, '#ffffff', 0.25), 44);
  // 远处浮岛与小塔
  R(150, 40, 16, 3, sky.mid2); R(152, 43, 12, 2, sky.mid2); R(156, 31, 3, 9, sky.mid2); R(155, 30, 5, 1, sky.mid2); R(157, 28, 1, 2, sky.mid2);
  mist(56, sky.mist, 0.35, t, 0.01);
  mountains(HOME_RIDGE.mid, t * 0.004, sky.mid2, lerpC(sky.mid2, '#ffffff', 0.15));
  mist(70, sky.mist, 0.3, t, 0.02);
  // 左侧崖与瀑布
  for (let x = 0; x < 30; x++) { const y = 46 + Math.round(Math.abs(x - 12) * 0.6 + Math.sin(x) * 1.5); R(x, y, 1, 100, sky.near); R(x, y, 1, 1, lerpC(sky.near, '#ffffff', 0.2)); }
  for (let y = 52; y < 100; y++) { const k = ((y + Math.floor(t / 60)) % 6); R(14, y, 3, 1, k < 2 ? '#ffffff' : k < 4 ? '#cfe8ff' : '#9cc8ee'); }
  mountains(HOME_RIDGE.near, 0, sky.near, lerpC(sky.near, '#ffffff', 0.12));
  // 松树（崖上）
  const pc = [lerpC('#2f5a3a', sky.near, 0.3), lerpC('#3f7a4a', sky.near, 0.25), lerpC('#58a05a', sky.near, 0.25)];
  pine(8, 50, 1, pc[2], pc[1], pc[0]); pine(24, 56, 1.2, pc[2], pc[1], pc[0]); pine(186, 80, 1.3, pc[2], pc[1], pc[0]); pine(176, 84, 1, pc[2], pc[1], pc[0]);
  // 平台：草地（带纹理与小花）
  const g0 = '#6f9a4a', g1 = '#4f7a3a', g2 = '#86b25a', stone = '#b4a88e';
  R(0, 100, W, 60, g0);
  for (let y = 102; y < 156; y += 2) for (let x = (y / 2) % 2 ? 0 : 3; x < W; x += 6) R(x, y, 1, 1, (x + y) % 4 ? g1 : g2);
  for (let x = 0; x < W; x += 1) { const y = 100 + Math.round(Math.sin(x / 7) * 1); R(x, y - 1, 1, 2, g2); if (x % 3 === 0) R(x, y - 2, 1, 1, g1); }
  for (let i = 0; i < 10; i++) { const x = (i * 53 + 11) % 200, y = 104 + (i * 29) % 44; if (x > 32 && x < 168) continue; R(x, y, 1, 1, ['#f6e7a0', '#f59ab5', '#ffffff'][i % 3]); }
  // 石径
  for (let y = 146; y < 157; y += 3) R(92 + (y % 2), y, 16, 2, '#a0947a');
  // 石板院子
  R(36, 106, 128, 40, stone);
  for (let y = 106; y < 146; y += 6) R(36, y, 128, 1, '#a0947a');
  for (let y = 106; y < 146; y += 6) for (let x = 36 + ((y / 6) % 2) * 6; x < 164; x += 12) R(x, y, 1, 6, '#a0947a');
  R(36, 106, 128, 1, '#d2c8b0');
  // 石头与草丛
  for (const [x, y, w] of [[30, 140, 6], [170, 144, 8], [12, 146, 5], [186, 120, 6]]) { ellipse(x, y, w / 2, 2, '#6e6a7a'); R(x - w / 2 + 1, y - 2, w - 2, 1, '#8e8a9a'); }
  for (let i = 0; i < 14; i++) { const x = (i * 37) % 200, y = 102 + (i * 13) % 46; if (x > 34 && x < 166 && y < 146) continue; R(x, y, 1, 2, g1); R(x + 1, y - 1, 1, 3, g0); R(x + 2, y, 1, 2, g1); }
  // 前沿云海
  for (let i = 0; i < 16; i++) { const x = ((i * 23 + t * (0.002 + (i % 3) * 0.001)) % 230) - 15; disc(x, 154 + (i % 3) * 2, 4 + (i % 3), lerpC(sky.mist, '#ffffff', 0.6)); }
  R(0, 157, W, 4, lerpC(sky.mist, '#ffffff', 0.6));
  // 洞府、灵田、丹炉
  drawCaveHome(st, t, night);
  drawField(st, t);
  const furnaceTop = drawFurnace(st, t);
  if (furnaceTop && Math.random() < 0.05) parts.push({ x: furnaceTop.x + (Math.random() - 0.5) * 4, y: furnaceTop.y - 1, vx: 0.002, vy: -0.01, life: 2600, max: 2600, c: '#cfc6d8', s: 2 });
  // 光源（夜里会被 nightOverlay 点亮）
  const lights = [];
  const lv = st.home.cave;
  if (lv >= 3 && lv <= 5) lights.push({ x: 80, y: 82, r: 8, c: '#ff9a4a', a: 0.6 }, { x: 120, y: 82, r: 8, c: '#ff9a4a', a: 0.6 });
  if (lv >= 6) { const w = lv >= 9 ? 72 : 60; lights.push({ x: 100 - w / 2 - 2, y: 85, r: 8, c: '#ff9a4a', a: 0.6 }, { x: 100 + w / 2 + 2, y: 85, r: 8, c: '#ff9a4a', a: 0.6 }); }
  if (furnaceTop) lights.push({ x: 166, y: 133, r: 10, c: '#ff7a2a', a: 0.6 });
  return { sky, night, furnaceTop, lights };
};

// 夜间暗化 + 光源
ART.nightOverlay = function (sky, OY, H, lights) {
  const dark = 1 - sky.light;
  if (dark > 0.02) { ctx.globalAlpha = dark * 0.62; R(0, -OY, W, H, '#080a24'); ctx.globalAlpha = 1; }
  for (const l of lights) glow(l.x, l.y, l.r, l.c, l.a * (0.35 + dark));
};

// ---------- 历练场景 ----------
const RG = {
  forest: { top: '#2e5a8a', mid: '#6aa0c8', hor: '#c8e6c0', far: '#4a7a5a', near: '#2f5a3a', ground: '#4f7a3a', g2: '#6f9a4a', deco: 'pine' },
  hill: { top: '#3a3a5a', mid: '#7a6a7a', hor: '#d0a890', far: '#6a5a62', near: '#4a3e46', ground: '#6a5a4a', g2: '#8a7a62', deco: 'rock' },
  tomb: { top: '#120e22', mid: '#2a2244', hor: '#4a3a6a', far: '#2a2440', near: '#1a1628', ground: '#3a3448', g2: '#4a4458', deco: 'grave' },
  blood: { top: '#2a0810', mid: '#6a1420', hor: '#c83a30', far: '#4a1018', near: '#2a080c', ground: '#3a1418', g2: '#5a1a20', deco: 'spike' },
  swords: { top: '#4a5a7a', mid: '#8a9ab0', hor: '#dfe6ee', far: '#7a8698', near: '#5a6274', ground: '#6a6a74', g2: '#8a8a94', deco: 'sword' },
  abyss: { top: '#0a0612', mid: '#2a0e3a', hor: '#5a2a7a', far: '#24102e', near: '#140818', ground: '#1e1028', g2: '#2e1a3a', deco: 'float' },
  sea: { top: '#1a4a7a', mid: '#3a8ab8', hor: '#9ad8ee', far: '#2a6a8a', near: '#1a4a6a', ground: '#2a7aa0', g2: '#4aa8c8', deco: 'coral' },
  stars: { top: '#04040e', mid: '#0e0e2a', hor: '#2a1a4a', far: '#1a1430', near: '#100c20', ground: '#1a1430', g2: '#2a2244', deco: 'star' },
  palace: { top: '#6a4a8a', mid: '#c88aa0', hor: '#ffe0b0', far: '#d8b890', near: '#a88a60', ground: '#e8dcc0', g2: '#fff2d8', deco: 'pillar' },
  chaos: { top: '#000000', mid: '#1a0a1a', hor: '#3a1a3a', far: '#1a101e', near: '#0c060e', ground: '#140a16', g2: '#24142a', deco: 'crack' },
};
ART.drawAdventure = function (bgKey, t, OY, scroll) {
  const p = RG[bgKey] || RG.forest;
  skyBands(p.top, p.mid, p.hor, -OY, 100);
  if (bgKey === 'stars' || bgKey === 'chaos' || bgKey === 'tomb' || bgKey === 'abyss') for (const s of STARS) { ctx.globalAlpha = 0.4 + s.b * 0.6; R((s.x - scroll * 0.05 + 400) % 200, s.y + 50, 1, 1, '#e8ecff'); }
  ctx.globalAlpha = 1;
  if (bgKey === 'blood') { disc(150, 30, 10, '#ff5a4a'); disc(150, 30, 8, '#ff8a6a'); }
  if (bgKey === 'stars') { disc(160, 24, 9, '#7a5ab0'); disc(156, 22, 9, '#9a7ad0'); R(140, 23, 40, 2, '#c8a0ff'); }
  mountains(HOME_RIDGE.far, scroll * 0.15, p.far, lerpC(p.far, '#ffffff', 0.15));
  mist(70, p.hor, 0.25, t, 0.02);
  mountains(HOME_RIDGE.mid, scroll * 0.3, p.near, lerpC(p.near, '#ffffff', 0.1));
  // 地面
  R(0, 128, W, 40, p.ground);
  for (let x = 0; x < W; x++) { const k = Math.floor((x + scroll) / 3) % 5; if (k === 0) R(x, 128, 1, 2, p.g2); }
  for (let i = 0; i < 18; i++) { const x = ((i * 47 - scroll) % 240 + 240) % 240 - 20; R(x, 136 + (i * 7) % 20, 3, 1, p.g2); }
  // 前景装饰
  for (let i = 0; i < 6; i++) {
    const x = ((i * 71 - scroll * 0.9) % 300 + 300) % 300 - 40, y = 129;
    switch (p.deco) {
      case 'pine': pine(x, y, 1.4, '#6fae5a', '#3f7a3a', '#2a5a2a'); break;
      case 'rock': ellipse(x, y - 3, 7, 4, '#5a4a44'); R(x - 5, y - 6, 8, 1, '#7a6a62'); break;
      case 'grave': R(x - 3, y - 10, 7, 10, '#5a5468'); R(x - 2, y - 11, 5, 1, '#5a5468'); R(x - 1, y - 8, 3, 1, '#3a3448'); R(x, y - 9, 1, 3, '#3a3448'); break;
      case 'spike': for (let k = 0; k < 8; k++) R(x - k / 2, y - 12 + k, k + 1, 1, '#4a0c14'); break;
      case 'sword': R(x, y - 16, 2, 14, '#c8d0dc'); R(x, y - 16, 1, 14, '#ffffff'); R(x - 2, y - 4, 6, 1, '#8a7040'); R(x, y - 3, 2, 3, '#5a4020'); break;
      case 'float': { const yy = 90 + Math.sin(t / 900 + i) * 4; ellipse(x, yy, 8, 3, '#2e1a3a'); R(x - 6, yy - 3, 12, 1, '#4a2a5a'); break; }
      case 'coral': for (let k = 0; k < 4; k++) R(x + k * 2 - 3, y - 4 - (k % 2) * 4, 1, 6, k % 2 ? '#ff7a8a' : '#ffa07a'); break;
      case 'star': R(x, 60 + (i * 13) % 40, 1, 1, '#ffffff'); ellipse(x + 10, 110 + (i % 2) * 8, 6, 3, '#2a2244'); break;
      case 'pillar': R(x - 3, y - 40, 6, 40, '#f6ecd8'); R(x - 3, y - 40, 2, 40, '#ffffff'); R(x - 5, y - 42, 10, 3, '#e8b23c'); break;
      case 'crack': ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 300 + i); for (let k = 0; k < 10; k++) R(x + Math.sin(k * 1.7 + i) * 3, 40 + k * 6, 2, 6, '#c048ff'); ctx.globalAlpha = 1; break;
    }
  }
  if (bgKey === 'sea') { ctx.globalAlpha = 0.25; R(0, -OY, W, 200, '#1a6a9a'); ctx.globalAlpha = 1; for (let i = 0; i < 10; i++) { const x = (i * 37 + t * 0.01) % 200; R(x, 140 - ((t / 20 + i * 30) % 120), 1, 1, '#bff0ff'); } }
  if (bgKey === 'chaos') { ctx.globalAlpha = 0.18 + 0.1 * Math.sin(t / 500); R(0, -OY, W, 200, '#6a1aa0'); ctx.globalAlpha = 1; }
};

// 灵体与蛇形怪
ART.drawOrb = function (x, y, t, fc, hit) {
  glow(x, y, 9, fc[0], 0.6);
  disc(x, y, 5, hit ? '#ffffff' : fc[1]); disc(x - 1, y - 1, 3, hit ? '#ffffff' : fc[0]);
  R(x - 3, y - 1, 1, 2, '#1b1326'); R(x + 1, y - 1, 1, 2, '#1b1326');
  for (let k = 1; k <= 3; k++) R(x + 4 + k * 2, y + Math.round(Math.sin(t / 150 + k) * 2), 2, 1, fc[0]);
};
ART.drawSnake = function (x, y, t, fc, hit) {
  for (let k = 7; k >= 0; k--) {
    const sx = x + k * 5, sy = y + Math.round(Math.sin(t / 220 + k * 0.8) * 3);
    disc(sx, sy, k === 0 ? 4 : 3, hit ? '#ffffff' : (k % 2 ? fc[1] : fc[0]));
    R(sx - 1, sy - 3, 2, 1, shade(fc[0], 1.3));
  }
  R(x - 3, y - 2, 1, 1, '#ffe040'); R(x - 4, y + 1, 3, 1, '#ff4040');
  R(x - 1, y - 6, 1, 3, '#f4e0a0'); R(x + 2, y - 6, 1, 3, '#f4e0a0');
};

root.ART = ART;
})(typeof window !== 'undefined' ? window : globalThis);
