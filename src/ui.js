/* 仙门崛起 · 界面、像素场景、音效与流程 */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = L.fmt;
const MONTH_MS = 5000;
const SPEEDS = [1, 2, 4, 0];
let st = null;
let speedIdx = 0;
let cine = null;           // 正在播放的过场
const queue = [];          // 待弹出的窗口
let soundMode = 0;         // 0 全开 1 仅音效 2 静音
let cloudStatus = '未连接';
let rankShown = 0;        // 大比演出期间显示的排名

// ---------- 像素字号：让字体像素对齐设备像素 ----------
function setFontSize() {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.round(dpr * 1.2));
  let fs = 12 * k / dpr;
  if (fs < 12) fs = 12;
  if (fs > 16) fs = 16;
  const root = document.documentElement;
  root.style.setProperty('--fs', fs.toFixed(3) + 'px');
  // 大屏（电脑）整体放大，竖屏手机保持原尺寸
  root.style.zoom = '';
  const z = Math.min(window.innerWidth / 500, window.innerHeight / 600);
  const q = Math.max(1, Math.min(2, Math.floor(z * 4) / 4));
  if (q > 1) root.style.zoom = q;
}
setFontSize();

// ---------- 像素图 ----------
function pixCanvas(map, pal, scale) {
  scale = scale || 1;
  const h = map.length, w = Math.max(...map.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = map[y][x];
    if (!ch || ch === '.' || !pal[ch]) continue;
    g.fillStyle = pal[ch];
    g.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}
const ICONS = {
  stone: [['....oo....', '...oaao...', '..oabbao..', '.oabbbbao.', '.oabbbcbo.', '.oabbbbbo.', '..obbbbo..', '...obbo...', '....oo....', '..........'], { o: '#0b0912', a: '#d4fbff', b: '#4fd0e6', c: '#ffffff' }],
  rep: [['..oooooo..', '.oyyyyyyo.', '.oyrrrryo.', '.oyryyryo.', '.oyrrrryo.', '.oyyyyyyo.', '.oyyyyyyo.', '..oyyyyo..', '...oyyo...', '....oo....'], { o: '#0b0912', y: '#f4c542', r: '#c8323c' }],
  pill: [['..........', '...oooo...', '..orrrro..', '.orwrrrro.', '.orrrrrro.', '.orrrrrro.', '.orrrrrdo.', '..orrddo..', '...oooo...', '..........'], { o: '#0b0912', r: '#f08a3c', w: '#fff3c8', d: '#b0521c' }],
  flag: [['oo........', 'oyooooooo.', 'oyrrrrrro.', 'oyrryyrro.', 'oyrrrrrro.', 'oyooooooo.', 'oyo.......', 'oyo.......', 'oyo.......', 'ooo.......'], { o: '#0b0912', y: '#c9a35a', r: '#c8323c' }],
  disc: [['....oo....', '...ohho...', '..oohhoo..', '.ohhhhhho.', '.ohssssho.', '.osesseso.', '..osssso..', '.oorrrroo.', 'orrrttrrro', 'orrrttrrro'], { o: '#0b0912', h: '#2a2030', s: '#f2c9a0', e: '#0b0912', r: '#4f9e68', t: '#a9e2b8' }],
  recruit: [['...oo.....', '..ohho....', '.ohhhho...', '.osssso..y', '.osesso.yyy', '..osso...y', '.orrrro...', 'orrrrrro..', 'orrrrrro..', '..........'], { o: '#0b0912', h: '#2a2030', s: '#f2c9a0', e: '#0b0912', r: '#7f93ab', y: '#f4c542' }],
  sword: [['........oo', '.......owo', '......owo.', '.....owo..', '..o.owo...', '...owo....', '..oyo.....', '.oyoo.....', 'oyo.......', 'oo........'], { o: '#0b0912', w: '#dfe8f2', y: '#f4c542' }],
  build: [['....oo....', '...oyyo...', '.oorrrroo.', 'orrrrrrrro', '..owwwwo..', '..owddwo..', '.oooooooo.', 'orrrrrrrro', '.owwddwwo.', '.owwddwwo.'], { o: '#0b0912', y: '#f4c542', r: '#3a3d5c', w: '#c8503a', d: '#3b2015' }],
  sound: [['..........', '....o.....', '...oo..o..', 'oooyo...o.', 'oyyyo.o.o.', 'oyyyo.o.o.', 'oooyo...o.', '...oo..o..', '....o.....', '..........'], { o: '#0b0912', y: '#f3ecdc' }],
  note: [['..........', '.....ooo..', '.....oyyo.', '.....o.yo.', '.....o....', '.....o....', '..ooo.....', '.oyyo.....', '.oyyo.....', '..oo......'], { o: '#f3ecdc', y: '#f4c542' }],
  mute: [['..........', '....o.....', '...oo.....', 'oooyo.o.o.', 'oyyyo..o..', 'oyyyo..o..', 'oooyo.o.o.', '...oo.....', '....o.....', '..........'], { o: '#0b0912', y: '#9d93b8' }],
};
const iconURL = {};
for (const k in ICONS) iconURL[k] = pixCanvas(ICONS[k][0], ICONS[k][1], 1).toDataURL();
function iconHTML(k, size) { return `<img class="px" src="${iconURL[k]}" width="${size || 16}" height="${size || 16}" alt="">`; }
$$('img[data-icon]').forEach(img => { img.src = iconURL[img.dataset.icon]; });

// 戒灵老祖头像
const ELDER = pixCanvas([
  '....oooooo....', '...owwwwwwo...', '..owwwwwwwwo..', '..owssssssso..', '..oseesseeso..', '..ossssssssо..'.replace(/о/g, 'o'),
  '..owssssssswo.', '.owwwwssswwwo.', '.owwwwwwwwwwo.', '..owwwwwwwwo..', '...owwwwwwo...', '....owwwwo....', '.....owwo.....', '......oo......'
], { o: '#24304f', w: '#e9f1ff', s: '#b9d4ff', e: '#24304f' }, 1).toDataURL();

// ---------- 弟子精灵 ----------
const SIT = [
  '.....ooo.....',
  '....ohhho....',
  '...oohhhoo...',
  '..ohhhhhhho..',
  '..ohsssssho..',
  '..osessseso..',
  '',
  '...osssss' + 'o...',
  '..otrrtrrto..',
  '.orrrrtrrrro.',
  '.orrrsssrrro.',
  'orrrrrrrrrrro',
  'odddddddddddo',
  '.okkkkkkkkko.',
  '..ooooooooo..',
];
SIT[6] = '..osssssss' + 'o..';
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}
function spriteMap(look) {
  const m = SIT.map(r => r.split(''));
  if (look.style === 1) { m[0] = '...oo...oo...'.split(''); m[1] = '..ohho.ohho..'.split(''); }
  if (look.style === 2) { m[0] = '....ogggo....'.split(''); m[1] = '....ogygo....'.split(''); }
  if (look.f) {
    for (let y = 4; y <= 7; y++) { m[y][1] = 'o'; m[y][2] = 'h'; m[y][10] = 'h'; m[y][11] = 'o'; }
    m[8][2] = 'h'; m[8][10] = 'h';
  }
  return m.map(r => r.join(''));
}
const sprCache = new Map();
function sprite(d, realmOverride) {
  const r = realmOverride !== undefined ? realmOverride : d.r;
  const R = L.REALMS[Math.min(r, 9)];
  const look = d.look || { hair: '#1d1a24', skin: '#f2c9a0', f: 0, style: 0 };
  const style = d.master ? 2 : look.style;
  const hair = r >= 7 ? '#e6e6f0' : look.hair;
  const key = [hair, look.skin, look.f, style, R.robe, d.inj > 0 ? 1 : 0].join('|');
  let c = sprCache.get(key);
  if (!c) {
    const robe = R.robe;
    const pal = { o: '#1a1424', h: hair, s: look.skin, e: '#1a1424', r: robe, t: R.trim, d: shade(robe, 0.72), k: '#8a4f3a', g: '#f4c542', y: '#c8323c' };
    c = pixCanvas(spriteMap({ ...look, style }), pal, 1);
    sprCache.set(key, c);
  }
  return c;
}
const avCache = new Map();
function avatarURL(d, realmOverride) {
  const r = realmOverride !== undefined ? realmOverride : d.r;
  const key = d.id + '|' + r + '|' + d.t + '|' + (d.inj > 0 ? 1 : 0);
  if (avCache.has(key)) return avCache.get(key);
  const c = document.createElement('canvas'); c.width = 15; c.height = 17;
  const g = c.getContext('2d');
  g.fillStyle = '#2a2340'; g.fillRect(0, 0, 15, 17);
  const tc = L.TALENTS[d.t].c;
  g.fillStyle = tc === 'rainbow' ? '#c48bff' : tc; g.globalAlpha = 0.35; g.fillRect(1, 3, 13, 14); g.globalAlpha = 1;
  g.drawImage(sprite(d, r), 1, 1);
  const url = c.toDataURL();
  avCache.set(key, url);
  return url;
}
function talentTag(t) {
  const T = L.TALENTS[t];
  return T.c === 'rainbow' ? `<span class="tag rainbow">${T.n}</span>` : `<span class="tag" style="background:${T.c}">${T.n}</span>`;
}

// ---------- 场景 ----------
const cvs = $('#scene');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = 200; let H = 160, OY = 0;
const SLOTS = [[100, 124], [74, 111], [126, 111], [50, 123], [150, 123], [76, 138], [124, 138], [27, 133], [173, 133], [50, 149], [150, 149], [100, 150]];
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disc(cx, cy, r, c) { ctx.fillStyle = c; for (let y = -r; y <= r; y++) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2 + 1, 1); } }
let T = 0; // 场景时间（毫秒）
const parts = [];
const anims = [];  // 弟子飞行动画
let crane = null, craneTimer = 45000;
// 远山轮廓（固定种子）
const HILLS = (() => {
  let s = 7; const rr = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const far = [], mid = [];
  let y = 48; for (let x = 0; x < W; x++) { y += (rr() - 0.5) * 3 + (x % 37 < 18 ? -0.25 : 0.28); y = Math.max(30, Math.min(58, y)); far.push(y); }
  y = 62; for (let x = 0; x < W; x++) { y += (rr() - 0.5) * 2.4 + (x % 53 < 26 ? -0.3 : 0.3); y = Math.max(50, Math.min(72, y)); mid.push(y); }
  const clouds = []; for (let i = 0; i < 5; i++) clouds.push({ x: rr() * W, y: 6 + rr() * 26, s: 0.004 + rr() * 0.006, w: 2 + Math.floor(rr() * 3) });
  const sea = []; for (let i = 0; i < 14; i++) sea.push({ x: rr() * W, y: 151 + rr() * 8, r: 3 + Math.floor(rr() * 4), s: 0.002 + rr() * 0.004 });
  return { far, mid, clouds, sea };
})();
function season() { const m = st ? st.month : 1; return m <= 3 ? 0 : m <= 6 ? 1 : m <= 9 ? 2 : 3; }
function drawSky() {
  const bands = ['#2c3470', '#36428a', '#4456a0', '#5a6fb5', '#7a8cc4', '#a59bc8', '#d6a9b4', '#f0c4a6'];
  const bh = 70 / bands.length;
  for (let i = 0; i < bands.length; i++) {
    R(0, i * bh, W, bh + 1, bands[i]);
    if (i < bands.length - 1) { ctx.fillStyle = bands[i + 1]; for (let x = (i % 2); x < W; x += 2) ctx.fillRect(x, Math.round((i + 1) * bh) - 1, 1, 1); }
  }
  // 太阳/月
  disc(162, 22, 7, '#fff1c9'); disc(162, 22, 5, '#ffe6a0');
  // 远山
  for (let x = 0; x < W; x++) R(x, HILLS.far[x], 1, 80 - HILLS.far[x], '#7083bb');
  for (let x = 0; x < W; x++) { const y = HILLS.far[x]; R(x, y, 1, 1, '#9aa9d6'); }
  for (let x = 0; x < W; x++) R(x, HILLS.mid[x], 1, 90 - HILLS.mid[x], '#4c6390');
  // 浮云
  for (const c of HILLS.clouds) {
    const x = ((c.x + T * c.s) % (W + 40)) - 20;
    for (let k = 0; k < c.w; k++) disc(x + k * 6, c.y + (k % 2), 4, '#f3efff');
    R(x - 3, c.y + 2, c.w * 6 + 4, 3, '#f3efff');
  }
}
function drawPlatform() {
  // 悬浮山台
  const top = 82;
  R(0, top, W, 70, '#b9ad96');
  for (let y = top + 6; y < 152; y += 8) R(0, y, W, 1, '#a99d86');
  for (let y = top; y < 152; y += 8) { const off = ((y / 8) % 2) * 8; for (let x = off; x < W; x += 16) R(x, y, 1, 8, '#a99d86'); }
  R(0, top, W, 2, '#d5cab3');
  // 前沿云海
  for (const c of HILLS.sea) { const x = ((c.x + T * c.s) % (W + 20)) - 10; disc(x, c.y, c.r, '#eef0ff'); }
  R(0, 155, W, 5, '#eef0ff');
  // 季节点缀
  const s = season();
  if (s === 0) { for (let i = 0; i < 3; i++) R(6 + i * 3, top - 4 - i, 2, 2, '#f7a8c4'); }
}
function roof(cx, y, w, h, c, cd, tip) {
  for (let r = 0; r < h; r++) { const ww = w - (h - 1 - r) * 4; R(cx - ww / 2, y + r, ww, 1, r === h - 1 ? cd : c); }
  if (tip) { R(cx - w / 2 - 1, y + h - 3, 2, 2, c); R(cx + w / 2 - 1, y + h - 3, 2, 2, c); R(cx - w / 2 - 2, y + h - 4, 1, 1, cd); R(cx + w / 2 + 1, y + h - 4, 1, 1, cd); }
}
function drawHall() {
  const lv = st.b.gate, cx = 100, base = 84;
  if (lv === 0) {
    R(cx - 16, base - 14, 32, 14, '#8b6a4a'); R(cx - 16, base - 14, 32, 1, '#6e523a');
    R(cx - 3, base - 9, 6, 9, '#3b2a20');
    for (let r = 0; r < 9; r++) R(cx - 6 - r * 1.6, base - 23 + r, 12 + r * 3.2, 1, r % 3 === 2 ? '#a88540' : '#c9a35a');
    return;
  }
  const tier = lv <= 3 ? 1 : lv <= 6 ? 2 : 3;
  const w = tier === 1 ? 46 : tier === 2 ? 58 : 70;
  const wall = tier === 3 ? '#c8503a' : '#b5452f';
  const rc = tier === 3 ? '#e2b23c' : '#3a3d5c', rd = tier === 3 ? '#a77a1c' : '#25273d';
  R(cx - w / 2 - 6, base - 4, w + 12, 4, tier === 3 ? '#efeaf6' : '#8f8a99');
  R(cx - w / 2 - 4, base - 6, w + 8, 2, tier === 3 ? '#ffffff' : '#a5a0ae');
  R(cx - w / 2, base - 20, w, 14, wall);
  for (let x = cx - w / 2 + 2; x < cx + w / 2 - 1; x += 8) R(x, base - 20, 2, 14, '#7a2a1c');
  R(cx - 5, base - 15, 10, 9, '#4a2a18'); R(cx - 1, base - 15, 1, 9, '#2a160c');
  roof(cx, base - 30, w + 14, 10, rc, rd, true);
  R(cx - 6, base - 27, 12, 5, '#f4c542'); R(cx - 5, base - 26, 10, 3, '#c8323c');
  if (tier >= 2) {
    R(cx - w / 2 + 8, base - 38, w - 16, 8, wall);
    roof(cx, base - 46, w - 2, 8, rc, rd, true);
  }
  if (tier >= 3) {
    R(cx - w / 2 + 16, base - 52, w - 32, 6, wall);
    roof(cx, base - 59, w - 20, 7, rc, rd, true);
    R(cx - 1, base - 64, 2, 5, '#f4c542');
    if ((T / 300 | 0) % 2) R(cx - 2, base - 66, 4, 2, '#fff6c0');
  }
}
function drawLibrary() {
  const lv = st.b.library; if (!lv) return;
  const cx = 22, base = 86;
  const floors = Math.min(5, 1 + Math.floor(lv / 4));
  let y = base;
  for (let f = 0; f < floors; f++) {
    const w = 18 - f * 2;
    R(cx - w / 2, y - 8, w, 8, '#8a3b2c'); R(cx - 1, y - 6, 2, 4, '#f4d28a');
    roof(cx, y - 11, w + 8, 3, '#2f3f5c', '#1e2a40', true);
    y -= 11;
  }
  R(cx - 1, y - 4, 2, 4, '#f4c542');
}
function drawAlchemy() {
  const lv = st.b.alchemy; if (!lv) return;
  const cx = 176, base = 86;
  R(cx - 13, base - 14, 26, 14, '#6b5446'); R(cx - 4, base - 9, 8, 9, '#2b1e18');
  roof(cx, base - 21, 34, 7, '#43384f', '#2a2234', true);
  R(cx + 7, base - 27, 4, 8, '#5d5160');
  // 丹炉
  const fx = 158, fy = 94;
  R(fx - 5, fy - 7, 10, 7, '#b07a3a'); R(fx - 6, fy - 8, 12, 2, '#d39a52'); R(fx - 4, fy, 2, 2, '#7a4f22'); R(fx + 2, fy, 2, 2, '#7a4f22');
  const glow = (T / 160 | 0) % 3;
  R(fx - 2, fy - 4, 4, 2, ['#ff8a3c', '#ffc04a', '#ff6b2c'][glow]);
  if (Math.random() < 0.06) parts.push({ x: cx + 9, y: base - 28, vx: 0.004, vy: -0.012, life: 2400, max: 2400, c: '#cfc6d8', s: 2 });
  if (Math.random() < 0.04) parts.push({ x: fx, y: fy - 9, vx: (Math.random() - 0.5) * 0.004, vy: -0.01, life: 1400, max: 1400, c: '#ffb04a', s: 1 });
}
function drawMine() {
  const lv = st.b.mine; if (!lv) return;
  const n = Math.min(9, 1 + Math.floor(lv / 2));
  const spots = [[8, 150], [14, 146], [5, 143], [18, 151], [11, 139], [22, 147], [4, 135], [16, 136], [25, 152]];
  for (let i = 0; i < n; i++) {
    const [x, y] = spots[i];
    const h = 4 + (i % 3);
    R(x - 1, y - h, 3, h, '#4fd0e6'); R(x, y - h - 1, 1, 1, '#4fd0e6'); R(x - 1, y - h, 1, h, '#d4fbff'); R(x + 1, y - h + 1, 1, h - 1, '#2a8aa8');
  }
  if (Math.random() < 0.05) { const [x, y] = spots[Math.floor(Math.random() * n)]; parts.push({ x, y: y - 6, vx: 0, vy: -0.004, life: 600, max: 600, c: '#ffffff', s: 1 }); }
}
function drawArray() {
  const lv = st.b.array; if (!lv) return;
  const [cx, cy] = [SLOTS[0][0], SLOTS[0][1] - 1];
  const rx = 16 + Math.min(lv, 24), ry = Math.round(rx * 0.32);
  const pulse = 0.55 + 0.25 * Math.sin(T / 500);
  ctx.globalAlpha = Math.min(1, 0.35 + lv * 0.03) * pulse + 0.2;
  const col = lv >= 20 ? '#ffd76a' : lv >= 10 ? '#8ff5d0' : '#4ccb9f';
  for (let a = 0; a < 360; a += 4) { const t = a * Math.PI / 180; R(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, 1, 1, col); }
  if (lv >= 8) for (let a = 0; a < 360; a += 6) { const t = a * Math.PI / 180; R(cx + Math.cos(t) * rx * 0.62, cy + Math.sin(t) * ry * 0.62, 1, 1, col); }
  const nr = 6 + Math.min(6, Math.floor(lv / 4));
  for (let i = 0; i < nr; i++) { const t = T / 2200 + i * Math.PI * 2 / nr; R(cx + Math.cos(t) * rx - 1, cy + Math.sin(t) * ry - 1, 2, 2, '#ffffff'); }
  ctx.globalAlpha = 1;
  if (Math.random() < 0.08 + lv * 0.01) { const t = Math.random() * Math.PI * 2; parts.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry, vx: 0, vy: -0.01, life: 1600, max: 1600, c: col, s: 1 }); }
}
function slotPos(d) { const s = SLOTS[d.slot] || SLOTS[0]; return s; }
function drawDisciple(d, x, y, realm) {
  const r = realm !== undefined ? realm : d.r;
  const bob = r >= 7 ? Math.round(Math.sin(T / 600 + d.id) * 1.5) - 2 : 0;
  y += bob;
  if (r >= 2) { // 光晕
    const ac = L.REALMS[Math.min(r, 9)].trim;
    ctx.globalAlpha = 0.18 + 0.08 * Math.sin(T / 400 + d.id);
    disc(x, y - 8, 9 + Math.min(r, 8), ac);
    ctx.globalAlpha = 1;
  }
  ctx.drawImage(sprite(d, r), Math.round(x - 6), Math.round(y - 15));
  if (r >= 3) { // 元婴小人
    const yy = y - 21 + Math.round(Math.sin(T / 500 + d.id) * 1.5);
    R(x - 1, yy, 3, 2, '#ffe39a'); R(x - 2, yy + 2, 5, 2, L.REALMS[r].trim);
  }
  if (r >= 4) { // 环绕灵珠
    for (let i = 0; i < 3; i++) { const t = T / 700 + i * 2.09 + d.id; R(x + Math.cos(t) * 9 - 1, y - 8 + Math.sin(t) * 3, 2, 2, L.REALMS[Math.min(r, 9)].trim); }
  }
  if (r >= 8 && Math.random() < 0.03) parts.push({ x: x + (Math.random() - 0.5) * 14, y: y - 6 - Math.random() * 10, vx: 0, vy: 0, life: 120, max: 120, c: '#ffe766', s: 1 });
  if (d.inj > 0) { R(x + 4, y - 15, 3, 1, '#ff4d4d'); R(x + 5, y - 16, 1, 3, '#ff4d4d'); }
  if (L.isReady(d) && !cine) {
    const by = y - 25 + Math.round(Math.abs(Math.sin(T / 250)) * -3);
    R(x - 3, by, 7, 8, '#1a1424'); R(x - 2, by + 1, 5, 6, '#fff6dc'); R(x, by + 2, 1, 3, '#c8323c'); R(x, by + 6, 1, 1, '#c8323c'); R(x, by + 8, 1, 1, '#1a1424');
  }
}
function drawCushion(x, y) { R(x - 5, y - 2, 11, 2, '#8a4f3a'); R(x - 4, y - 3, 9, 1, '#a8644a'); }
function drawCrane() {
  if (!crane) return;
  const x = crane.x, y = crane.y + Math.sin(T / 200) * 1.5;
  const wing = (T / 180 | 0) % 2;
  R(x - 5, y, 10, 2, '#ffffff'); R(x + 4, y - 2, 2, 2, '#ffffff'); R(x + 5, y - 3, 1, 1, '#e23a3a'); R(x + 6, y - 1, 2, 1, '#2a2030');
  R(x - 7, y + 1, 2, 1, '#2a2030');
  if (wing) { R(x - 3, y - 4, 5, 4, '#f3efff'); R(x - 3, y - 4, 2, 1, '#2a2030'); }
  else { R(x - 3, y + 2, 5, 3, '#f3efff'); R(x - 3, y + 4, 2, 1, '#2a2030'); }
  if (Math.random() < 0.3) parts.push({ x: x - 6, y: y + 1, vx: -0.01, vy: 0.002, life: 500, max: 500, c: '#ffe39a', s: 1 });
}
function drawParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.g) p.vy += p.g * dt;
    ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5);
    R(p.x, p.y, p.s, p.s, p.c);
  }
  ctx.globalAlpha = 1;
  if (parts.length > 400) parts.splice(0, parts.length - 400);
}
function seasonFx() {
  const s = season();
  const ch = [0.05, 0, 0.04, 0.07][s];
  if (Math.random() < ch) {
    const c = s === 0 ? '#f7a8c4' : s === 2 ? (Math.random() < .5 ? '#e8873a' : '#d6b13a') : '#ffffff';
    parts.push({ x: Math.random() * W, y: -OY - 2, vx: (s === 3 ? 0.003 : 0.008) * (0.5 + Math.random()), vy: 0.012 + Math.random() * 0.01, life: 12000, max: 12000, c, s: 1 });
  }
}
function drawAnims(dt) {
  for (let i = anims.length - 1; i >= 0; i--) {
    const a = anims[i];
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    const [sx, sy] = slotPos(a.d);
    let x, y, alpha = 1;
    if (a.type === 'leave') { const e = k * k; x = sx + e * 90; y = sy - e * 140; alpha = 1 - Math.max(0, k - 0.7) / 0.3; }
    else { const e = 1 - (1 - k) * (1 - k); x = sx + (1 - e) * -90; y = sy - (1 - e) * 140; }
    ctx.globalAlpha = alpha;
    R(x - 8, y, 17, 1, '#dfe8f2'); R(x - 9, y, 1, 1, '#f4c542');
    ctx.drawImage(sprite(a.d), Math.round(x - 6), Math.round(y - 15));
    if (Math.random() < 0.6) parts.push({ x: x - 8, y, vx: 0, vy: 0, life: 300, max: 300, c: '#bfe9ff', s: 1 });
    ctx.globalAlpha = 1;
    if (a.t >= a.dur) anims.splice(i, 1);
  }
}
function flyingIds() { const s = new Set(); for (const a of anims) s.add(a.d.id); return s; }
function fitScene() {
  const app = $('#app'), wrap = $('#sceneWrap');
  const others = ['#top', '#goal', '#nav'].reduce((s, q) => s + $(q).offsetHeight, 0) + 6 * 5 + 16;
  const avail = app.clientHeight - others - 96;
  const w = wrap.clientWidth || 300;
  const h = Math.max(160, Math.min(210, Math.floor(avail / w * W)));
  if (h !== H) { H = h; OY = H - 160; cvs.height = H; ctx.imageSmoothingEnabled = false; wrap.style.aspectRatio = `${W} / ${H}`; }
}
function drawScene(dt) {
  T += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (OY) { R(0, 0, W, OY + 1, '#252b62'); for (let i = 0; i < 18; i++) { const sx = (i * 47) % W, sy = (i * 29) % Math.max(1, OY); if ((T / 700 + i) % 5 > 1) R(sx, sy, 1, 1, '#c9d2ff'); } }
  ctx.setTransform(1, 0, 0, 1, 0, OY);
  drawSky();
  drawPlatform();
  if (!st) return;
  drawLibrary(); drawHall(); drawAlchemy(); drawMine(); drawArray();
  seasonFx();
  const flying = flyingIds();
  const list = [];
  for (let i = 0; i < SLOTS.length; i++) list.push({ slot: i });
  const bySlot = {};
  for (const d of st.ds) bySlot[d.slot] = d;
  if (cine && cine.d && !bySlot[cine.d.slot]) bySlot[cine.d.slot] = cine.d;
  const order = SLOTS.map((s, i) => i).sort((a, b) => SLOTS[a][1] - SLOTS[b][1]);
  for (const i of order) {
    const d = bySlot[i]; const [x, y] = SLOTS[i];
    if (!d) continue;
    drawCushion(x, y);
    if (d.away || flying.has(d.id)) continue;
    if (cine && cine.d === d) { drawCineTarget(x, y); continue; }
    drawDisciple(d, x, y);
  }
  drawAnims(dt);
  drawCrane();
  drawParts(dt);
  if (cine) drawCine(dt);
}
function floatText(x, y, text, color, big) {
  const el = document.createElement('div');
  el.className = 'float' + (big ? ' big' : '');
  el.style.left = (x / W * 100).toFixed(2) + '%'; el.style.top = ((y + OY) / H * 100).toFixed(2) + '%'; el.style.color = color || '#fff';
  el.textContent = text;
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
function banner(text, sub, color) {
  const b = $('#banner');
  b.innerHTML = esc(text) + (sub ? `<small>${esc(sub)}</small>` : '');
  b.style.color = color || 'var(--gold)';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function flash(op) { const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = op || 0.9; requestAnimationFrame(() => { f.style.transition = 'opacity .35s steps(4)'; f.style.opacity = 0; }); }
function shake() { const w = $('#sceneWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }

// ---------- 过场：突破 / 天劫 / 飞升 ----------
function startCine(d, res) {
  const strikes = res.ascend ? 9 : res.trib;
  const gather = strikes ? 1100 : 1500;
  const gap = res.ascend ? 380 : 430;
  const end = gather + strikes * gap + (res.ascend ? 2600 : 900);
  cine = { d, res, t: 0, strikes, gather, gap, end, fired: 0, done: false, fromR: res.from, rise: 0 };
  if (strikes) SFX.rumble(); else SFX.gather();
}
function drawCineTarget(x, y) {
  const c = cine;
  const showR = c.t > c.gather + c.strikes * c.gap && c.res.ok ? Math.min(c.res.to, 9) : c.fromR;
  let yy = y;
  if (c.res.ascend && c.res.ok && c.t > c.gather + c.strikes * c.gap + 300) { c.rise = (c.t - (c.gather + c.strikes * c.gap + 300)) / 2000; yy = y - c.rise * c.rise * 150; }
  drawDisciple(c.d, x, yy, showR);
}
function drawCine(dt) {
  const c = cine;
  c.t += dt;
  const [x, y] = slotPos(c.d);
  const strikeEnd = c.gather + c.strikes * c.gap;
  // 天色变暗
  const dark = c.strikes ? Math.min(0.55, c.t / c.gather * 0.55) * (c.t > strikeEnd + 400 ? Math.max(0, 1 - (c.t - strikeEnd - 400) / 500) : 1) : 0.25 * Math.min(1, c.t / 600) * (c.t > strikeEnd ? Math.max(0, 1 - (c.t - strikeEnd) / 400) : 1);
  ctx.globalAlpha = dark; R(0, -OY, W, H, '#0a0818'); ctx.globalAlpha = 1;
  if (c.strikes) {
    // 劫云
    const ca = Math.min(1, c.t / c.gather);
    ctx.globalAlpha = ca * (c.t > strikeEnd + 300 ? Math.max(0, 1 - (c.t - strikeEnd - 300) / 600) : 1);
    for (let k = 0; k < 7; k++) disc(x - 30 + k * 10, 12 + (k % 2) * 3 + Math.sin(T / 300 + k) * 1.5, 7, k % 2 ? '#2a2440' : '#3a3358');
    ctx.globalAlpha = 1;
    // 雷
    const n = Math.floor((c.t - c.gather) / c.gap) + 1;
    if (c.t >= c.gather && n > c.fired && c.fired < c.strikes) { c.fired = n; flash(0.75); shake(); SFX.thunder(); c.bolt = { t: 140, seed: Math.random() * 1000 }; }
    if (c.bolt && c.bolt.t > 0) {
      c.bolt.t -= dt;
      let bx = x + (Math.sin(c.bolt.seed) * 6), by = 16;
      const col = c.fired >= 9 ? '#e9c9ff' : '#fff6a8';
      while (by < y - 6) { const nx = bx + (Math.random() - 0.5) * 8, ny = by + 4 + Math.random() * 4; for (let s = 0; s <= 6; s++) { R(bx + (nx - bx) * s / 6 - 1, by + (ny - by) * s / 6, 3, 2, col); } bx = nx; by = ny; }
      for (let k = 0; k < 6; k++) parts.push({ x: x + (Math.random() - .5) * 8, y: y - 4, vx: (Math.random() - .5) * 0.08, vy: -Math.random() * 0.08, g: 0.0002, life: 500, max: 500, c: col, s: 1 });
    }
  } else if (c.t < strikeEnd) {
    // 灵气汇聚
    for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 20; parts.push({ x: x + Math.cos(a) * r, y: y - 8 + Math.sin(a) * r * 0.5, vx: -Math.cos(a) * r / 600, vy: -Math.sin(a) * r * 0.5 / 600, life: 600, max: 600, c: '#9ff5d8', s: 1 }); }
  }
  // 结果
  if (c.t >= strikeEnd && !c.resolved) {
    c.resolved = true;
    if (c.res.ok) {
      flash(1); SFX.win();
      for (let k = 0; k < 60; k++) { const a = Math.random() * Math.PI * 2, v = 0.02 + Math.random() * 0.06; parts.push({ x, y: y - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, g: 0.00005, life: 1200, max: 1200, c: k % 3 ? '#ffe39a' : '#ffffff', s: k % 4 ? 1 : 2 }); }
      if (c.res.ascend) { SFX.gong(); banner('白日飞升', c.d.name + ' 渡过九九天劫！', '#fff6c0'); }
      else banner('突破成功', `${c.d.name} · ${L.REALMS[c.res.to].n}期`);
    } else {
      SFX.fail();
      for (let k = 0; k < 30; k++) parts.push({ x: x + (Math.random() - .5) * 10, y: y - 6, vx: (Math.random() - .5) * 0.02, vy: -0.01 - Math.random() * 0.02, life: 1400, max: 1400, c: '#8a8496', s: 2 });
      banner('突破失败', '道心受损，来日再战', '#ff8a8a');
    }
  }
  if (c.res.ok && c.t >= strikeEnd) {
    // 金色光柱
    const k = Math.min(1, (c.t - strikeEnd) / 300) * Math.max(0, 1 - (c.t - strikeEnd - (c.res.ascend ? 2200 : 500)) / 400);
    const w = (c.res.ascend ? 16 : 8) * k;
    ctx.globalAlpha = 0.55 * k; R(x - w / 2, -OY, w, y + 2 + OY, '#fff1a8'); ctx.globalAlpha = 0.9 * k; R(x - w / 6, -OY, w / 3, y + 2 + OY, '#ffffff'); ctx.globalAlpha = 1;
  }
  if (c.t >= c.end) {
    const done = cine; cine = null;
    afterBreakthrough(done.res);
  }
}

// ---------- 音效（WebAudio 合成） ----------
let AC = null, master = null, musicGain = null;
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.22; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
function tone(f, t0, dur, type, vol, dest) {
  if (soundMode === 2 && dest !== 'music') return;
  const a = AC; if (!a || a.state !== 'running') return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square';
  const t = a.currentTime + (t0 || 0);
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest === 'music' ? musicGain : master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t0, dur, vol, cutoff) {
  if (soundMode === 2) return;
  const a = AC; if (!a || a.state !== 'running') return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
  const g = a.createGain(); g.gain.value = vol || 0.4;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(a.currentTime + (t0 || 0));
}
const SFX = {
  tap() { tone(740, 0, 0.05, 'square', 0.08); },
  coin() { tone(988, 0, 0.06, 'square', 0.12); tone(1318, 0.06, 0.12, 'square', 0.12); },
  up() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.06, 0.1, 'square', 0.1)); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.2, 'square', 0.16)); tone(1046, 0.38, 0.6, 'triangle', 0.2); tone(1568, 0.38, 0.6, 'triangle', 0.1); },
  fail() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.22)); },
  thunder() { noise(0, 0.9, 0.7, 700); tone(48, 0, 0.6, 'sawtooth', 0.18); },
  rumble() { noise(0, 1.2, 0.25, 220); },
  gather() { [392, 440, 523, 587, 659].forEach((f, i) => tone(f, i * 0.15, 0.25, 'triangle', 0.1)); },
  gong() { tone(98, 0, 2.2, 'triangle', 0.4); tone(196, 0, 1.6, 'sine', 0.2); tone(293, 0.05, 1.2, 'sine', 0.1); },
  reveal(t) { const base = [330, 392, 440, 523, 659, 784, 988][t]; tone(base, 0, 0.15, 'square', 0.12); if (t >= 3) tone(base * 1.5, 0.1, 0.3, 'triangle', 0.14); if (t >= 5) { [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.2 + i * 0.08, 0.3, 'triangle', 0.12)); } },
  goal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.14, 'square', 0.1)); },
  hit() { noise(0, 0.15, 0.4, 2400); tone(160, 0, 0.12, 'square', 0.15); },
};
// 背景乐：五声音阶慢板
const SCALE = [0, 2, 4, 7, 9];
const MELODY = (() => {
  let s = 11; const rr = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let p = 7;
  for (let i = 0; i < 64; i++) {
    if (i % 8 === 7) { out.push(-1); continue; }
    p += Math.round((rr() - 0.5) * 4); p = Math.max(3, Math.min(12, p));
    out.push(rr() < 0.18 ? -1 : p);
  }
  return out;
})();
let musicStep = 0, musicNext = 0;
function musicTick() {
  if (soundMode !== 0 || !AC || AC.state !== 'running') return;
  const a = AC;
  if (musicNext < a.currentTime) musicNext = a.currentTime + 0.05;
  while (musicNext < a.currentTime + 0.4) {
    const n = MELODY[musicStep % MELODY.length];
    const t0 = musicNext - a.currentTime;
    if (n >= 0) {
      const midi = 60 + 12 * Math.floor(n / 5) + SCALE[n % 5];
      const f = 440 * Math.pow(2, (midi - 69) / 12);
      tone(f, t0, 0.9, 'triangle', 0.07, 'music');
      tone(f * 2, t0, 0.25, 'sine', 0.02, 'music');
    }
    if (musicStep % 8 === 0) { const root = [48, 45, 43, 50][(musicStep / 16 | 0) % 4]; tone(440 * Math.pow(2, (root - 69) / 12), t0, 2.4, 'sine', 0.06, 'music'); }
    musicStep++;
    musicNext += 0.42;
  }
}
setInterval(musicTick, 120);
document.addEventListener('pointerdown', () => ac(), true);
function setSoundIcon() {
  const b = $('#btnSound');
  b.innerHTML = iconHTML(['note', 'sound', 'mute'][soundMode]);
  b.setAttribute('aria-label', ['声音：音乐与音效', '声音：仅音效', '声音：静音'][soundMode]);
}

// ---------- 存档 ----------
const SAVE_KEY = 'xianmen_save_v1';
const PREF_KEY = 'xianmen_pref_v1';
function saveLocal() { if (!st) return; try { st.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* 无痕模式等 */ } }
function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearLocal() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function savePref() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ soundMode, speedIdx })); } catch (e) { /* ignore */ } }
function loadPref() { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (p.soundMode >= 0) soundMode = p.soundMode; if (p.speedIdx >= 0 && p.speedIdx < 3) speedIdx = p.speedIdx; } catch (e) { /* ignore */ } }
const cloud = { ref: null, busy: false, lastMonths: -1, lastAt: 0 };
async function initCloud() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const db = await window.claude.use('db');
    const user = await window.claude.use('user');
    if (!db || !user) { cloudStatus = '当前环境不可用'; return; }
    const uid = await user.id();
    if (!uid) { cloudStatus = '登录后可用'; return; }
    cloud.ref = db.doc('data/users/' + uid + '/save');
    cloudStatus = '已连接';
    const snap = await cloud.ref.get();
    if (snap.exists) {
      const data = snap.data();
      let remote = null;
      try { remote = data && typeof data.json === 'string' ? JSON.parse(data.json) : null; } catch (e) { remote = null; }
      if (remote && remote.v === 1 && (!st || (remote.savedAt || 0) > (st.savedAt || 0) + 5000) && (!st || remote.totalMonths !== st.totalMonths)) offerCloud(remote);
    }
  } catch (e) { cloudStatus = '暂时无法连接'; }
}
async function saveCloud(force) {
  if (!cloud.ref || cloud.busy || !st) return;
  if (!force && st.totalMonths === cloud.lastMonths) return;
  cloud.busy = true;
  try {
    st.savedAt = Date.now();
    await cloud.ref.set({ json: JSON.stringify(st), year: st.year, savedAt: st.savedAt, v: 1 });
    cloud.lastMonths = st.totalMonths; cloud.lastAt = Date.now();
    cloudStatus = '已同步';
  } catch (e) {
    cloudStatus = e && e.code === 'invalid_argument' ? '当前权限无法云存档' : '同步失败，稍后重试';
    if (e && e.code === 'invalid_argument') cloud.ref = null;
  }
  cloud.busy = false;
}
function offerCloud(remote) {
  const intro = !$('#intro').hidden;
  const go = () => sheet({
    title: '发现云端存档', center: true,
    body: `<p>云端有一份更新的存档：<br><b>${esc(remote.sect)}</b> · 第 ${remote.year} 年 · 天下第 ${remote.rank} 名</p><p class="muted">读取后会替换当前进度。</p>`,
    foot: [{ t: '保留当前', alt: true, fn: closeModal }, { t: '读取云存档', fn: () => { closeModal(); loadState(remote); $('#intro').hidden = true; } }],
  });
  if (intro) go(); else pushPopup(go);
}
function migrate(s) {
  if (!s || s.v !== 1) return null;
  s.flags = s.flags || {}; s.seenTips = s.seenTips || {}; s.stats = s.stats || { exp: 0, expWin: 0, bt: 0, events: 0, maxPower: 0 };
  let used = new Set();
  for (const d of s.ds) { if (d.slot === undefined || used.has(d.slot)) d.slot = freeSlot(s, used); used.add(d.slot); }
  for (const d of s.ds) if (!d.master && d.look && d.look.style === 2) d.look.style = 0;
  return s;
}
function freeSlot(s, used) {
  used = used || new Set(s.ds.map(d => d.slot));
  for (let i = 1; i < SLOTS.length; i++) if (!used.has(i)) return i;
  return SLOTS.length - 1;
}
function loadState(s) {
  st = migrate(s);
  L.hook = onHook;
  sprCache.clear(); avCache.clear();
  renderFeed(); updateHUD(true);
}

// ---------- 逻辑事件 ----------
function onHook(type, data) {
  if (!st) return;
  if (type === 'log') { feedDirty = true; }
  else if (type === 'stageUp') {
    const d = data.d; if (d.away || !st.ds.includes(d)) return;
    const [x, y] = slotPos(d);
    floatText(x, y - 16, L.STAGES[d.s] + '↑', '#8ff5d0');
    SFX.up();
  } else if (type === 'ready') {
    const d = data; if (!st.ds.includes(d)) return;
    const nxt = d.r >= L.MAXR ? '飞升' : L.REALMS[d.r + 1].n;
    toast(`${d.name} 修为圆满，可冲击${nxt}！`, 'gold');
    tip('ready', `看到${d.name}头顶的【！】了吗？点他，冲击${nxt}！大境界突破有天劫，成功了战力暴涨。`);
  } else if (type === 'goal') {
    SFX.goal();
    floatText(100, 60, `目标达成 灵石+${fmt(data.rw)}`, '#ffe39a', false);
  }
}
let feedDirty = true;
function toast(text, cls) { L.log(st, text, cls); }

// ---------- 顶栏与底栏 ----------
let hudTimer = 0;
function updateHUD(force) {
  if (!st) return;
  $('#sectName').textContent = st.sect;
  $('#date').textContent = `第${st.year}年 ${st.month}月`;
  $('#vStone').textContent = fmt(st.stones);
  $('#vInc').textContent = '+' + fmt(L.income(st)) + '/月';
  $('#vRep').textContent = fmt(st.rep);
  $('#vPill').textContent = st.pills;
  $('#vRank').textContent = '第' + (rankShown || st.rank);
  $('#btnSpeed').textContent = SPEEDS[speedIdx] ? '×' + SPEEDS[speedIdx] : '暂停';
  $('#btnSpeed').classList.toggle('on', SPEEDS[speedIdx] === 0);
  const g = L.GOALS[st.goal];
  $('#goalTxt').textContent = g ? g.t : (st.ascended ? '继续经营，让更多弟子飞升' : '');
  $('#goalRw').textContent = g ? '灵石+' + fmt(g.rw) : '';
  // 徽标
  const ready = st.ds.filter(L.isReady).length;
  setBadge('disciples', ready ? String(ready) : '');
  const canRec = st.ds.length < L.cap(st) && st.stones >= L.recruitCost(st);
  setBadge('recruit', canRec ? '+' : '');
  const idle = !st.exps.length && L.available(st).length > 0;
  setBadge('dungeon', idle ? '闲' : '');
  const canBuild = L.BUILD.some(b => st.b[b.k] < b.max && st.stones >= L.bCost(b.k, st.b[b.k]));
  setBadge('build', canBuild ? '↑' : '');
  if (feedDirty) renderFeed();
}
function setBadge(nav, text) {
  const btn = document.querySelector(`[data-nav="${nav}"]`);
  let b = btn.querySelector('.badge');
  if (!text) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement('span'); b.className = 'badge'; btn.appendChild(b); }
  if (b.textContent !== text) b.textContent = text;
}
function renderFeed() {
  if (!st || cine) return;
  feedDirty = false;
  $('#feed').innerHTML = st.log.slice(0, 8).map(l => `<div class="${esc(l.cls)}"><span>${esc(l.t)}</span>${esc(l.text)}</div>`).join('');
}

// ---------- 弹窗 ----------
let modalOnClose = null;
function sheet(o) {
  const m = $('#modal');
  m.classList.toggle('mid', !!o.center);
  const foot = (o.foot || []).map((b, i) => `<button class="btn ${b.alt ? 'alt' : ''} ${b.gold ? 'gold' : ''}" data-fi="${i}" ${b.disabled ? 'disabled' : ''}>${b.t}</button>`).join('');
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="rod"></div>
    <header><h2>${o.title}</h2>${o.noClose ? '' : '<button class="close" aria-label="关闭">×</button>'}</header>
    ${o.sub ? `<div class="sub" style="padding:0 12px">${o.sub}</div>` : ''}
    <div class="body">${o.body || ''}</div>
    ${foot ? `<div class="foot">${foot}</div>` : ''}<div class="rod"></div></div>`;
  m.hidden = false;
  modalOnClose = o.onClose || null;
  const c = m.querySelector('.close'); if (c) c.onclick = () => { SFX.tap(); closeModal(); };
  m.querySelectorAll('[data-fi]').forEach(b => { b.onclick = () => { SFX.tap(); o.foot[+b.dataset.fi].fn(); }; });
  m.onclick = e => { if (e.target === m && !o.noClose) closeModal(); };
  return m.querySelector('.sheet');
}
function closeModal() {
  const m = $('#modal');
  m.hidden = true; m.innerHTML = '';
  const f = modalOnClose; modalOnClose = null;
  if (f) f();
  setTimeout(processQueue, 120);
  updateHUD(true);
}
function pushPopup(fn) { queue.push(fn); processQueue(); }
function processQueue() {
  if (!$('#modal').hidden || cine || !$('#intro').hidden) return;
  const fn = queue.shift();
  if (fn) fn();
}

// ---------- 弟子 ----------
function statusChip(d) {
  if (d.away) return '<span class="chip warn">历练中</span>';
  if (L.isReady(d)) return '<span class="chip ready">可突破</span>';
  if (d.inj > 0) return `<span class="chip bad">负伤 ${d.inj}月</span>`;
  return '<span class="chip ok">修炼中</span>';
}
function xpBar(d) {
  const p = Math.min(100, d.xp / L.dNeed(d) * 100);
  return `<div class="bar ${d.s === 3 ? 'gold' : ''}"><i style="width:${p.toFixed(1)}%"></i></div>`;
}
function showDisciples() {
  const list = st.ds.slice().sort((a, b) => (L.isReady(b) - L.isReady(a)) || (b.master - a.master) || (L.power(st, b) - L.power(st, a)));
  const body = list.map(d => `<div class="card" data-id="${d.id}">
      <img class="px av" src="${avatarURL(d)}" alt="">
      <div class="main">
        <div class="line"><span class="name">${esc(d.name)}</span>${d.master ? '<span class="chip">掌门</span>' : ''}${talentTag(d.t)}</div>
        <div class="line"><span>${L.stageName(d)}</span><span class="muted num">战力 ${fmt(L.power(st, d))}</span></div>
        ${xpBar(d)}
      </div>
      <div class="right">${statusChip(d)}</div></div>`).join('');
  const s = sheet({ title: '门下弟子', sub: `${st.ds.length} / ${L.cap(st)} 人 · 点弟子查看详情`, body });
  s.querySelectorAll('.card').forEach(c => c.onclick = () => { SFX.tap(); const d = st.ds.find(x => x.id === +c.dataset.id); if (d) showDisciple(d); });
}
function showDisciple(d) {
  const tr = d.tr ? L.TRAITS[d.tr] : null;
  const g = L.gain(st, d);
  const nxt = d.r >= L.MAXR ? '飞升' : L.REALMS[d.r + 1].n;
  const body = `<div class="row"><img class="px" src="${avatarURL(d)}" style="width:90px;height:102px" alt="">
      <div class="grow"><div class="big">${esc(d.name)}</div><div class="line" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${talentTag(d.t)}${d.master ? '<span class="chip">掌门</span>' : ''}${statusChip(d)}</div>
      <div style="margin-top:6px">${L.stageName(d)}</div></div></div>
    <div>修为 <span class="num">${fmt(d.xp)} / ${fmt(L.dNeed(d))}</span>${xpBar(d)}</div>
    <dl class="grid2">
      <dt>修炼速度</dt><dd class="num">+${fmt(g)} / 月</dd>
      <dt>战力</dt><dd class="num">${fmt(L.power(st, d))}</dd>
      <dt>特质</dt><dd>${tr ? `${tr.n}<br><span class="muted">${tr.d}</span>` : '<span class="muted">无</span>'}</dd>
      <dt>法宝</dt><dd>${d.w ? `${esc(d.wn)}<span class="muted">（${L.WEAPONS[d.w].n} 战力×${L.WEAPONS[d.w].m}）</span>` : '<span class="muted">无</span>'}</dd>
      <dt>功法</dt><dd>${d.a ? `《${esc(d.an)}》<span class="muted">（${L.ARTS[d.a].n} 修炼×${L.ARTS[d.a].m}）</span>` : '<span class="muted">基础吐纳</span>'}</dd>
      <dt>入门</dt><dd>第 ${d.joined} 年${d.fails ? ` · 突破失败 ${d.fails} 次` : ''}</dd>
    </dl>`;
  const foot = [];
  if (L.isReady(d)) foot.push({ t: `冲击${nxt}`, gold: true, fn: () => showBreakthrough(d) });
  if (!d.master && !d.away) foot.push({ t: '逐出师门', alt: true, fn: () => confirmDismiss(d) });
  foot.push({ t: '返回', alt: true, fn: showDisciples });
  sheet({ title: '弟子详情', body, foot });
}
function confirmDismiss(d) {
  sheet({
    title: '逐出师门', center: true,
    body: `<p>确定让 <b>${esc(d.name)}</b>（${L.TALENTS[d.t].n} · ${L.stageName(d)}）下山吗？此举不可撤销。</p>`,
    foot: [{ t: '再想想', alt: true, fn: () => showDisciple(d) }, { t: '确定', fn: () => { L.dismiss(st, d); closeModal(); } }],
  });
}
let usePill = true;
function showBreakthrough(d) {
  const nxt = d.r >= L.MAXR ? '飞升' : L.REALMS[d.r + 1].n;
  const trib = d.r >= L.MAXR ? 9 : L.REALMS[d.r + 1].trib;
  const render = () => {
    const pill = usePill && st.pills > 0;
    const p = L.btRate(st, d, pill);
    const bits = [`基础 ${L.pct(L.REALMS[d.r].rate)}`];
    if (st.b.alchemy) bits.push(`丹房 +${st.b.alchemy * 2}%`);
    if (d.fails) bits.push(`屡败屡战 +${d.fails * 12}%`);
    if (d.tr === 'hero') bits.push('主角光环 +10%');
    if (d.tr === 'alch') bits.push('丹道奇才 +15%');
    if (pill) bits.push('破境丹 +20%');
    const body = `<div class="row"><img class="px" src="${avatarURL(d)}" style="width:66px;height:75px" alt=""><div class="grow">
        <div>${esc(d.name)} · ${L.stageName(d)}</div>
        <div class="big seal">冲击${nxt}</div>
        <div class="muted">${trib ? `需渡 ${trib} 道雷劫` : '水到渠成，无需渡劫'}</div></div></div>
      <div class="center"><div class="muted">成功率</div><div class="big ${p >= 0.7 ? 'jadet' : p >= 0.4 ? 'goldt' : 'seal'}" style="font-size:calc(var(--fs)*3)">${L.pct(p)}</div><div class="muted">${bits.join(' · ')}</div></div>
      <div class="check ${pill ? 'on' : ''}" id="pillChk" role="checkbox" aria-checked="${pill}"><span class="box"></span><span class="grow">服用破境丹 +20%</span><span class="muted">剩余 ${st.pills}</span></div>
      <div class="muted">失败不会陨落：修为倒退三成、负伤两月，下次成功率 +12%。</div>`;
    const s = sheet({ title: d.r >= L.MAXR ? '飞升天劫' : '境界突破', body, foot: [{ t: '再准备一下', alt: true, fn: () => showDisciple(d) }, { t: trib ? '引动天劫' : '开始突破', gold: true, fn: go }] });
    const chk = s.querySelector('#pillChk');
    if (chk) chk.onclick = () => { if (st.pills <= 0) return; usePill = !usePill; SFX.tap(); render(); };
  };
  const go = () => {
    const pill = usePill && st.pills > 0;
    const res = L.breakthrough(st, d, pill);
    if (res) { startCine(d, res); $('#tip').hidden = true; }
    closeModal();
  };
  render();
}
function afterBreakthrough(res) {
  const d = res.d;
  renderFeed();
  if (res.ascend && res.ok) { showAscension(res); return; }
  if (res.ok) {
    const lines = [];
    lines.push(`<div class="center"><img class="px" src="${avatarURL(d)}" style="width:90px;height:102px" alt=""></div>`);
    lines.push(`<div class="center big goldt">${L.REALMS[d.r].n}期！</div>`);
    lines.push(`<div class="center num">战力 ${fmt(res.before)} → <span class="seal">${fmt(res.after)}</span>（×${(res.after / res.before).toFixed(1)}）</div>`);
    lines.push(`<div class="center muted">天下震动，声望 +${fmt(res.repGain)}</div>`);
    if (res.awaken) {
      const masterLine = d.master ? `<div class="quote">戒中老祖：“小子，你以为你真是杂灵根？老夫封住你的灵根，就是为了今天！”</div>` : `<div class="quote">${esc(d.name)}体内沉睡的上古血脉轰然苏醒！</div>`;
      lines.push(masterLine);
      lines.push(`<div class="center">灵根蜕变：${talentTag(res.awaken.from)} → ${talentTag(res.awaken.to)}</div>`);
      lines.push('<div class="center muted">修炼速度与战力大幅提升！</div>');
      SFX.reveal(6);
    }
    if (res.revenge) lines.push(`<div class="quote">当年退婚的那户人家闻讯，提着厚礼登门谢罪。${esc(d.name)}淡淡一笑：“三十年河东，三十年河西。”<br>声望 +50，灵石 +2000</div>`);
    sheet({ title: '突破成功', center: true, body: lines.join(''), foot: [{ t: '道法自然', gold: true, fn: closeModal }] });
    if (d.r === 1 && !st.seenTips.exp) tip('exp', '筑基之后实力大增。去【秘境】历练吧，能拿灵石、法宝、功法和破境丹。');
  } else {
    sheet({
      title: '突破失败', center: true,
      body: `<div class="center"><img class="px" src="${avatarURL(d)}" style="width:90px;height:102px;filter:grayscale(.6)" alt=""></div>
        <p class="center">${esc(d.name)} 冲击${res.ascend ? '飞升' : L.REALMS[res.from + 1].n}失败${d.tr === 'steady' ? '，好在道心坚定，毫发无伤' : '，修为倒退，需静养两月'}。</p>
        <p class="center seal">屡败屡战：下次成功率 +12%</p>`,
      foot: [{ t: '再接再厉', fn: closeModal }],
    });
  }
}

// ---------- 收徒 ----------
function showRecruit() {
  const c = L.recruitCost(st);
  const full = st.ds.length >= L.cap(st);
  const pity = 10 - (st.recruits % 10);
  const body = `<p>大开山门，广纳天下英才。每次会有三名弟子前来拜师，从中挑选一人收入门下。</p>
    <dl class="grid2"><dt>门下弟子</dt><dd>${st.ds.length} / ${L.cap(st)} 人</dd><dt>收徒花费</dt><dd class="num">${iconHTML('stone', 12)} ${fmt(c)}</dd><dt>保底</dt><dd>再招 ${pity} 次必出单灵根以上</dd></dl>
    <div class="sep"></div>
    <div class="muted">灵根品级：${[0, 1, 2, 3, 4, 5, 6].map(talentTag).join(' ')}</div>
    <div class="muted">提升山门等级与宗门声望，天才弟子更容易出现。</div>
    ${full ? '<p class="seal">弟子已满。升级【山门】可增加上限，或在弟子详情中逐出弟子。</p>' : ''}`;
  sheet({ title: '开山收徒', body, foot: [{ t: `收徒 · 灵石 ${fmt(c)}`, gold: true, disabled: full || st.stones < c, fn: doRecruit }] });
}
function doRecruit() {
  const cands = L.recruit(st);
  if (!cands) return;
  showCandidates(cands, '开山收徒');
}
function candHTML(d, i) {
  const T = L.TALENTS[d.t];
  const tr = d.tr ? L.TRAITS[d.tr] : null;
  const beam = T.c === 'rainbow' ? 'linear-gradient(#ff7a7a,#ffd36b,#7dff9a,#7ad7ff,#c48bff)' : T.c;
  return `<div class="cand hide" data-i="${i}"><div class="beam" style="background:${beam}"></div>
    <img class="px" src="${avatarURL(d)}" style="width:44px;height:50px" alt="">
    <div class="nm">${esc(d.name)}</div>${talentTag(d.t)}
    <div class="tr">${tr ? tr.n : ''}</div><div class="cover">？</div></div>`;
}
function showCandidates(cands, title, single) {
  let sel = -1;
  const body = `<div class="cands" style="${single ? 'grid-template-columns:1fr;max-width:140px;margin:0 auto' : ''}">${cands.map(candHTML).join('')}</div>
    <div id="candInfo" class="muted center">点选一名弟子</div>`;
  const s = sheet({
    title, noClose: true, body,
    foot: [{ t: single ? '婉拒' : '都不要', alt: true, fn: closeModal }, { t: '收入门下', gold: true, disabled: true, fn: () => {
      if (sel < 0) return;
      const d = cands[sel];
      if (st.ds.length >= L.cap(st)) { s.querySelector('#candInfo').textContent = '弟子已满，请先升级山门'; return; }
      d.slot = freeSlot(st);
      L.accept(st, d);
      closeModal();
      const [x, y] = slotPos(d);
      floatText(x, y - 18, '入门', L.TALENTS[d.t].c === 'rainbow' ? '#ffe39a' : L.TALENTS[d.t].c, true);
      if (st.ds.length === 2) tip('flow', '弟子会自己打坐修炼。灵石不够花？去【建设】升级灵脉和聚灵阵。');
      if (st.ds.length >= L.cap(st)) tip('gate', '弟子满了？升级【建设】里的山门，可以收更多弟子。');
    } }],
  });
  const okBtn = s.querySelector('[data-fi="1"]');
  const cards = s.querySelectorAll('.cand');
  cards.forEach((c, i) => {
    setTimeout(() => { c.classList.remove('hide'); c.querySelector('.cover').remove(); c.classList.add('reveal'); SFX.reveal(cands[i].t); if (cands[i].t >= 5) flash(0.4); }, 350 + i * 450);
    c.onclick = () => {
      if (c.classList.contains('hide')) return;
      sel = i; SFX.tap();
      cards.forEach(x => x.classList.toggle('sel', x === c));
      okBtn.disabled = false;
      const d = cands[i]; const tr = d.tr ? L.TRAITS[d.tr] : null;
      s.querySelector('#candInfo').innerHTML = `${esc(d.name)}：${L.TALENTS[d.t].n}，修炼速度×${L.TALENTS[d.t].cul}${tr ? `<br>${tr.n}：${tr.d}` : ''}`;
    };
  });
}

// ---------- 秘境 ----------
function showDungeons() {
  const team = L.autoTeam(st);
  const exps = st.exps.map(e => {
    const names = e.ids.map(id => (st.ds.find(d => d.id === id) || {}).name).filter(Boolean).join('、');
    const p = (e.total - e.left) / e.total * 100;
    return `<div class="card flat"><div class="main"><div class="line"><span>【${L.DUNGEONS[e.k].n}】</span><span class="muted">${esc(names)}</span></div><div class="bar gold"><i style="width:${p}%"></i></div><div class="muted">还需 ${e.left} 个月归来</div></div></div>`;
  }).join('');
  const rows = L.DUNGEONS.map((dg, k) => {
    const un = L.unlocked(st, k);
    if (!un) return `<div class="card flat" style="opacity:.6"><div class="main"><div class="line"><span>${dg.n}</span></div><div class="muted">声望达到 ${fmt(dg.rep)} 解锁</div></div><div class="right"><span class="chip">未解锁</span></div></div>`;
    const ch = team.length ? L.expChance(st, k, team) : { p: 0 };
    const cls = ch.p >= 0.75 ? 'ok' : ch.p >= 0.4 ? 'warn' : 'bad';
    return `<div class="card" data-k="${k}"><div class="main"><div class="line"><span>${dg.n}</span><span class="muted">${dg.mon} 个月</span></div>
      <div class="muted">${dg.desc}</div><div class="muted num">推荐战力 ${fmt(L.DREC[k])} · 灵石约 ${fmt(L.DREW[k])}</div></div>
      <div class="right">${team.length ? `<span class="chip ${cls}">${L.pct(ch.p)}</span>${ch.ratio < 0.6 ? '<span class="seal">越级</span>' : ''}` : ''}</div></div>`;
  }).reverse();
  // 只显示最多两个未解锁
  let locked = 0; const shown = rows.filter((r, i) => { const k = L.DUNGEONS.length - 1 - i; if (!L.unlocked(st, k)) { locked++; return locked <= 1; } return true; });
  const avail = L.available(st).length;
  const body = `${exps ? `<div class="muted">历练中</div>${exps}<div class="sep"></div>` : ''}
    <div class="muted">${avail ? `可出战弟子 ${avail} 人 · 成功率按最强三人计算` : '暂无可出战的弟子'}</div>${shown.join('')}`;
  const s = sheet({ title: '秘境历练', sub: '成功率低于四成时冒险越级：赢了奖励翻倍，输了负伤三月', body });
  s.querySelectorAll('.card[data-k]').forEach(c => c.onclick = () => { SFX.tap(); if (!avail) return; showTeam(+c.dataset.k); });
}
function showTeam(k) {
  const dg = L.DUNGEONS[k];
  const avail = L.available(st).sort((a, b) => L.power(st, b) - L.power(st, a));
  let picked = new Set(avail.slice(0, 3).map(d => d.id));
  const render = () => {
    const team = avail.filter(d => picked.has(d.id));
    const ch = team.length ? L.expChance(st, k, team) : { p: 0, T: 0, ratio: 0 };
    const cls = ch.p >= 0.75 ? 'jadet' : ch.p >= 0.4 ? 'goldt' : 'seal';
    const body = `<div class="muted">${dg.desc} · 往返 ${dg.mon} 个月</div>
      <div class="center"><div class="muted">队伍战力 ${fmt(ch.T)} / 推荐 ${fmt(L.DREC[k])}</div><div class="big ${cls}" style="font-size:calc(var(--fs)*3)">${L.pct(ch.p)}</div>${ch.ratio && ch.ratio < 0.6 ? '<div class="seal">越级挑战！成功则奖励翻倍</div>' : '<div class="muted">成功率</div>'}</div>
      <div class="muted">选择出战弟子（最多 3 人）</div>
      ${avail.map(d => `<div class="check ${picked.has(d.id) ? 'on' : ''}" data-id="${d.id}"><span class="box"></span><img class="px" src="${avatarURL(d)}" style="width:22px;height:25px" alt=""><span class="grow">${esc(d.name)} <span class="muted">${L.stageName(d)}</span></span><span class="num">${fmt(L.power(st, d))}</span></div>`).join('')}`;
    const s = sheet({ title: dg.n, body, foot: [{ t: '返回', alt: true, fn: showDungeons }, { t: '出发', gold: true, disabled: !team.length, fn: () => {
      L.startExp(st, k, team);
      for (const d of team) anims.push({ d, type: 'leave', t: 0, dur: 1400 });
      SFX.coin();
      closeModal();
    } }] });
    s.querySelectorAll('.check[data-id]').forEach(c => c.onclick = () => {
      const id = +c.dataset.id; SFX.tap();
      if (picked.has(id)) picked.delete(id); else if (picked.size < 3) picked.add(id);
      render();
    });
  };
  render();
}
function showExpResult(res) {
  const dg = L.DUNGEONS[res.k];
  for (const d of res.team) if (st.ds.includes(d)) anims.push({ d, type: 'return', t: 0, dur: 1300 });
  const lines = [];
  lines.push(`<div class="row" style="justify-content:center;gap:6px">${res.team.map(d => `<img class="px" src="${avatarURL(d)}" style="width:44px;height:50px" alt="">`).join('')}</div>`);
  if (res.ok) {
    lines.push(`<div class="center big ${res.leap ? 'seal' : 'goldt'}">${res.leap ? '越级挑战成功！' : '满载而归'}</div>`);
    lines.push(`<dl class="grid2"><dt>灵石</dt><dd class="num">+${fmt(res.stones)}${res.leap ? '（翻倍）' : ''}</dd><dt>声望</dt><dd class="num">+${fmt(res.rep)}</dd>${res.pills ? `<dt>破境丹</dt><dd>+${res.pills}</dd>` : ''}<dt>修为</dt><dd>众弟子历练有成</dd></dl>`);
    for (const it of res.items) {
      const tierName = it.kind === 'w' ? L.WEAPONS[it.tier].n : L.ARTS[it.tier].n;
      const nm = it.kind === 'w' ? `${tierName}【${esc(it.name)}】` : `${tierName}功法《${esc(it.name)}》`;
      if (it.sold) lines.push(`<div class="quote">得到${nm}，众人已有更好的，换得灵石 ${fmt(it.value)}</div>`);
      else lines.push(`<div class="quote"><b>${esc(it.d.name)}</b> 获得${nm}！${it.kind === 'w' ? `战力×${L.WEAPONS[it.tier].m}` : `修炼速度×${L.ARTS[it.tier].m}`}</div>`);
    }
    if (res.fortune) lines.push(`<div class="quote seal">奇遇！${esc(res.fortune)}</div>`);
    SFX.coin();
  } else {
    lines.push('<div class="center big seal">铩羽而归</div>');
    lines.push(`<p class="center">秘境凶险，众弟子负伤三月。带回灵石 ${fmt(res.stones)}。</p><p class="center muted">提升战力后再来，或选更稳妥的秘境。</p>`);
    SFX.fail();
  }
  sheet({ title: `历练归来 · ${dg.n}`, center: true, body: lines.join(''), foot: [{ t: res.ok ? '好！' : '知道了', gold: res.ok, fn: closeModal }] });
}

// ---------- 建设 ----------
const BUILD_ICON = { gate: 'flag', array: 'stone', mine: 'stone', library: 'build', alchemy: 'pill' };
function showBuild() {
  const body = L.BUILD.map(b => {
    const lv = st.b[b.k];
    const max = lv >= b.max;
    const c = max ? 0 : L.bCost(b.k, lv);
    return `<div class="card flat"><div style="flex:none">${iconHTML(BUILD_ICON[b.k], 30)}</div><div class="main">
      <div class="line"><span>${b.n}</span><span class="chip">Lv ${lv}</span></div>
      <div class="muted">${b.d(lv)}</div>${max ? '' : `<div class="jadet">下一级：${b.d(lv + 1)}</div>`}</div>
      <div class="right"><button class="btn sm ${st.stones >= c && !max ? 'gold' : 'alt'}" data-k="${b.k}" ${max || st.stones < c ? 'disabled' : ''}>${max ? '已满级' : `${iconHTML('stone', 12)} ${fmt(c)}`}</button></div></div>`;
  }).join('');
  const s = sheet({ title: '宗门建设', sub: `灵石 ${fmt(st.stones)} · 每月 +${fmt(L.income(st))}`, body });
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    if (L.upgrade(st, btn.dataset.k)) {
      SFX.coin();
      const lv = st.b[btn.dataset.k];
      const pos = { gate: [100, 50], array: [100, 120], mine: [14, 136], library: [22, 50], alchemy: [176, 62] }[btn.dataset.k];
      floatText(pos[0], pos[1], `Lv${lv}`, '#ffe39a');
      showBuild();
    }
  });
}

// ---------- 宗门 ----------
function ladderHTML() {
  const rows = [];
  const add = q => rows.push(`<div class="${q === st.rank ? 'me' : ''}"><b>第${q}</b><span>${esc(L.rivalName(st, q))}</span><span class="num">${fmt(q === st.rank ? L.sectPower(st) : L.rivalPower(st, q))}</span></div>`);
  const qs = new Set([1, 2, 3]);
  for (let q = st.rank - 2; q <= st.rank + 2; q++) if (q >= 1 && q <= 100) qs.add(q);
  const rq = st.ladder.indexOf(L.RIVAL);
  const rivalRank = rq + 1 < st.rank ? rq + 1 : rq + 2;
  qs.add(rivalRank);
  let prev = 0;
  for (const q of [...qs].sort((a, b) => a - b)) { if (q - prev > 1) rows.push('<div class="muted"><b>…</b></div>'); add(q); prev = q; }
  return `<div class="ladder">${rows.join('')}</div>`;
}
function showSect() {
  const body = `<dl class="grid2">
      <dt>宗门</dt><dd>${esc(st.sect)}</dd><dt>掌门</dt><dd>${esc(st.masterName)}</dd>
      <dt>立派</dt><dd>第 ${st.year} 年${st.rebirth ? ` · 第 ${st.rebirth + 1} 世` : ''}</dd>
      <dt>宗门战力</dt><dd class="num">${fmt(L.sectPower(st))}（最强三人）</dd>
      <dt>最高排名</dt><dd>天下第 ${st.bestRank}</dd>
      <dt>飞升弟子</dt><dd>${st.ascendedList.length ? st.ascendedList.map(a => esc(a.name)).join('、') : '尚无'}</dd>
      <dt>历练</dt><dd>${st.stats.expWin} 胜 / ${st.stats.exp} 次</dd></dl>
    <div class="sep"></div><div class="muted">天下宗门榜（年末大比决定排名）</div>${ladderHTML()}
    <div class="sep"></div>
    <dl class="grid2"><dt>存档</dt><dd>本机自动保存 · 云存档：${esc(cloudStatus)}</dd></dl>
    <div class="row"><button class="btn sm alt" id="btnReset">重新开始</button>${st.ascended ? '<button class="btn sm gold" id="btnRebirth">转世重修</button>' : ''}</div>
    <div class="muted">字体：Fusion Pixel（TakWolf，SIL OFL 1.1）</div>`;
  const s = sheet({ title: '宗门', body });
  s.querySelector('#btnReset').onclick = () => sheet({
    title: '重新开始', center: true, body: '<p>放弃当前进度，从头开宗立派？这会清除本机与云端存档。</p>',
    foot: [{ t: '取消', alt: true, fn: showSect }, { t: '确定重来', fn: () => { closeModal(); resetGame(0); } }],
  });
  const rb = s.querySelector('#btnRebirth');
  if (rb) rb.onclick = () => confirmRebirth();
}
function confirmRebirth() {
  sheet({
    title: '转世重修', center: true,
    body: `<p>带着仙缘重入轮回。新的一世：</p><dl class="grid2"><dt>修炼速度</dt><dd>×${(1 + 0.5 * (st.rebirth + 1)).toFixed(1)}</dd><dt>初始灵石</dt><dd>${fmt(300 + 600 * (st.rebirth + 1))}</dd><dt>收徒运势</dt><dd>天才弟子更多</dd></dl>`,
    foot: [{ t: '再想想', alt: true, fn: closeModal }, { t: '踏入轮回', gold: true, fn: () => { const n = st.rebirth + 1; closeModal(); resetGame(n); } }],
  });
}
function resetGame(rebirth) {
  const old = st;
  st = null; clearLocal();
  if (cloud.ref) { cloud.ref.delete().catch(() => {}); }
  queue.length = 0; anims.length = 0; parts.length = 0; cine = null;
  showIntro(rebirth ? { rebirth, sect: old.sect, master: old.masterName, female: old.ds.find(d => d.master)?.look?.f } : null);
}

// ---------- 随机事件 ----------
function showEvent(ev) {
  if (ev.kind === 'wander') {
    if (st.ds.length >= L.cap(st)) { L.log(st, '一名散修慕名而来，可惜门下弟子已满，只得婉拒'); return; }
    showCandidates([ev.cand], '散修拜山', true);
    return;
  }
  const title = { ring: '奇遇 · 戒中老祖', mock: '退婚之辱' }[ev.kind] || '奇遇';
  sheet({
    title, center: true,
    body: `<div class="row"><img class="px" src="${ev.kind === 'ring' ? ELDER : avatarURL(ev.d)}" style="width:56px;height:56px" alt=""><p class="grow">${esc(ev.text)}</p></div>`,
    foot: [{ t: ev.kind === 'mock' ? '莫欺少年穷！' : '妙啊', gold: true, fn: closeModal }],
  });
  if (ev.kind === 'ring') SFX.reveal(5); else SFX.fail();
}

// ---------- 宗门大比 ----------
const TAUNTS = ['区区小宗，也敢来大比？', '今日便让你们知道天高地厚！', '哼，乡下宗门，不自量力。', '我宗弟子，岂是你等能比？', '早点认输，免得丢人现眼。'];
const SHOCK = ['这……这不可能！', '他们竟强到如此地步？！', '全场哗然！', '对面长老脸色铁青。', '观战众人倒吸一口凉气！'];
function runTournament() {
  const lineup = st.ds.slice().sort((a, b) => L.power(st, b) - L.power(st, a)).slice(0, 3);
  const res = L.tournament(st);
  rankShown = res.startRank;
  let step = -1;
  const myAv = lineup[0] ? avatarURL(lineup[0]) : '';
  const enemyCache = {};
  const enemyAv = (q, name) => {
    if (enemyCache[q]) return enemyCache[q];
    let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const fake = { id: 9000 + q, r: Math.max(0, Math.min(8, Math.floor(Math.log(L.rivalPower(st, q) / 30) / Math.log(9.1)))), t: 2, inj: 0, look: { hair: ['#1d1a24', '#3a2a22', '#5a2a2a'][h % 3], skin: '#e8b68a', f: h % 2, style: h % 3 } };
    enemyCache[q] = avatarURL(fake);
    return enemyCache[q];
  };
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({
        title: `第${res.n}届 天下宗门大比`, center: true, noClose: true,
        body: `<p class="center">天下百宗齐聚，论道争锋！</p>
          <div class="center">本届出战：${lineup.map(d => `<img class="px" src="${avatarURL(d)}" style="width:40px;height:45px" alt="">`).join(' ')}</div>
          <p class="center num">我方战力 ${fmt(res.S)} · 当前天下第 ${res.startRank}</p>`,
        foot: [{ t: '出战！', gold: true, fn: next }],
      });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const rival = rd.name === L.RIVAL;
    const taunt = rival ? (st.beatRival > 1 ? '这次……这次一定！' : `当年被我宗逐出门墙的杂灵根，也配站在这里？`) : TAUNTS[(step + res.year) % TAUNTS.length];
    const s = sheet({
      title: `第 ${step} 战`, center: true, noClose: true,
      body: `<div class="vs"><div class="side"><img class="px" id="vsL" src="${myAv}" style="width:66px;height:75px" alt=""><div>${esc(st.sect)}</div><div class="muted num">${fmt(res.S)}</div></div>
          <div class="vsx">VS</div>
          <div class="side"><img class="px" id="vsR" src="${enemyAv(rd.q, rd.name)}" style="width:66px;height:75px" alt=""><div>${esc(rd.name)}</div><div class="muted num">第${rd.q}名 · ${fmt(rd.P)}</div></div></div>
        <div class="quote">${esc(rd.name)}弟子：“${esc(taunt)}”</div>
        <div id="vsRes" class="center big" style="min-height:2.6em"></div>`,
      foot: [{ t: '……', alt: true, disabled: true, fn: next }],
    });
    const L1 = s.querySelector('#vsL'), R1 = s.querySelector('#vsR');
    L1.classList.add('clashL'); R1.classList.add('clashR');
    let hits = 0; const hi = setInterval(() => { SFX.hit(); if (++hits >= 3) clearInterval(hi); }, 330);
    setTimeout(() => {
      const box = s.querySelector('#vsRes'); const btn = s.querySelector('[data-fi="0"]');
      if (!box) return;
      if (rd.win) {
        if (!rd.defend) rankShown = rd.q;
        box.innerHTML = `<span class="goldt">胜！</span><div class="muted" style="font-size:var(--fs)">${rd.defend ? '卫冕天下第一' : `排名升至第 ${rd.q}`} · 灵石+${fmt(rd.stones)} 声望+${fmt(rd.rep)}</div>`;
        if (rival && st.beatRival === 1) box.innerHTML += `<div class="quote" style="font-size:var(--fs)">天剑宗长老颤声道：“当年……是我们看走了眼。”<br>${esc(st.masterName)}：“三十年河东，三十年河西，莫欺少年穷！”</div>`;
        else if (rd.P > res.S * 0.9) box.innerHTML += `<div class="muted" style="font-size:var(--fs)">${SHOCK[step % SHOCK.length]}</div>`;
        SFX.win();
      } else {
        box.innerHTML = `<span class="seal">惜败</span><div class="muted" style="font-size:var(--fs)">对手底蕴深厚，来年再战</div>`;
        SFX.fail();
      }
      btn.disabled = false; btn.textContent = res.rounds[step] ? '下一战' : '大比落幕'; btn.classList.remove('alt'); btn.classList.add('gold');
    }, 1150);
  };
  const summary = () => {
    const up = res.startRank - res.endRank;
    const stones = res.rounds.reduce((s, r) => s + (r.stones || 0), 0), rep = res.rounds.reduce((s, r) => s + (r.rep || 0), 0);
    rankShown = 0;
    if (up > 0) banner(`排名 ↑${up}`, `天下第 ${res.endRank}`);
    sheet({
      title: '大比落幕', center: true,
      body: `<div class="center big ${up > 0 ? 'goldt' : ''}">天下第 ${res.endRank}</div>
        <p class="center">${up > 0 ? `排名 ${res.startRank} → ${res.endRank}，上升 ${up} 位！` : res.endRank === 1 ? '稳坐天下第一！' : '排名未变，来年再战。'}</p>
        ${stones ? `<p class="center num">灵石 +${fmt(stones)} · 声望 +${fmt(rep)}</p>` : ''}
        ${res.endRank === 1 && res.startRank > 1 ? `<div class="quote">四海宗门俯首，${esc(st.sect)}，天下第一！</div>` : ''}`,
      foot: [{ t: '回山', gold: true, fn: closeModal }],
    });
  };
  next();
}

// ---------- 飞升 ----------
function showAscension(res) {
  const d = res.d;
  const first = st.ascended === 1;
  const body = `<div class="center"><img class="px" src="${avatarURL(d, 9)}" style="width:66px;height:75px" alt=""></div>
    <div class="center big goldt">${esc(d.name)} 白日飞升</div>
    <p class="center">九九天劫散尽，仙门大开，金光铺满${esc(st.sect)}。${d.master ? '掌门' : '弟子'}${esc(d.name)}踏云而去，位列仙班。</p>
    <dl class="grid2"><dt>用时</dt><dd>${st.year} 年</dd><dt>宗门排名</dt><dd>天下第 ${st.rank}</dd><dt>门下弟子</dt><dd>${st.ds.length} 人</dd><dt>仙界馈赠</dt><dd>全宗修炼速度 ×${(1 + 0.25 * st.ascended).toFixed(2)}</dd></dl>
    ${first ? '<div class="quote">恭喜通关！你可以继续经营宗门，让更多弟子飞升；也可以转世重修，带着仙缘开启更快的一世。</div>' : ''}`;
  sheet({ title: '飞升', center: true, noClose: true, body, foot: [{ t: '转世重修', alt: true, fn: () => confirmRebirth() }, { t: '继续经营', gold: true, fn: closeModal }] });
}

// ---------- 戒灵提示 ----------
let tipShown = null;
function tip(key, text) {
  if (!st || st.seenTips[key]) return;
  st.seenTips[key] = 1;
  const el = $('#tip');
  el.innerHTML = `<img class="px" src="${ELDER}" alt=""><div class="grow"><span class="who">戒中老祖：</span>${esc(text)}</div><span class="x">×</span>`;
  el.hidden = false;
  tipShown = key;
  el.onclick = () => { el.hidden = true; tipShown = null; SFX.tap(); };
}

// ---------- 每月 ----------
let monthAcc = 0;
function onMonth() {
  const out = L.monthTick(st, true);
  for (const r of out.exps) pushPopup(() => showExpResult(r));
  if (out.event) {
    const ev = out.event;
    if (ev.big) pushPopup(() => showEvent(ev));
    else if (ev.d && st.ds.includes(ev.d) && !ev.d.away) { const [x, y] = slotPos(ev.d); floatText(x, y - 18, { enl: '顿悟！', cave: '洞府！', rain: '灵雨', pill: '赠丹', demon: '退敌', taunt: '打脸！' }[ev.kind] || '奇遇', ev.cls === 'red' ? '#ff8a8a' : '#ffe39a'); }
  }
  if (out.tourney) pushPopup(runTournament);
  if (st.year === 1 && st.month === 10) tip('tour', '年末有天下宗门大比，最强的三名弟子出战。打赢了排名飙升，灵石声望滚滚来！');
  if (st.totalMonths === 2 && st.ds.length <= 1) tip('rec', '光杆掌门可不行。先点【收徒】招几个弟子吧！');
  if (st.ds.some(d => d.inj > 0)) tip('inj', '负伤的弟子修炼减半，几个月就好。突破失败也会负伤，但下次成功率会提高。');
  if (st.ds.length >= 2 && st.stats.exp === 0 && st.rep >= 0 && st.totalMonths > 10) tip('exp', '别闷头修炼了！去【秘境】历练，能拿灵石、法宝、功法和破境丹。');
  saveLocal();
}

// ---------- 主循环 ----------
let last = performance.now(), cloudAcc = 0;
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  const sp = SPEEDS[speedIdx];
  const running = st && sp > 0 && $('#modal').hidden && !cine && $('#intro').hidden;
  if (running) {
    L.flow(st, dt * sp / MONTH_MS);
    monthAcc += dt * sp;
    if (monthAcc >= MONTH_MS) { monthAcc -= MONTH_MS; onMonth(); }
    // 仙鹤
    craneTimer -= dt;
    if (craneTimer <= 0 && !crane) { crane = { x: -12, y: 14 + Math.random() * 22, v: 0.02 }; craneTimer = 70000 + Math.random() * 60000; }
  }
  if (crane) { crane.x += crane.v * dt; if (crane.x > W + 14) crane = null; }
  drawScene(dt);
  hudTimer += dt;
  if (hudTimer > 200) { hudTimer = 0; updateHUD(); }
  cloudAcc += dt;
  if (cloudAcc > 60000) { cloudAcc = 0; saveCloud(); }
  requestAnimationFrame(frame);
}
function sceneClick(e) {
  if (!st || cine) return;
  ac();
  const r = cvs.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H - OY;
  if (crane && Math.abs(x - crane.x) < 10 && Math.abs(y - crane.y) < 8) {
    const pill = Math.random() < 0.3;
    if (pill) { st.pills++; floatText(crane.x, crane.y, '仙鹤衔丹 破境丹+1', '#ffe39a'); }
    else { const v = Math.floor(L.income(st) * 15 + 100); st.stones += v; floatText(crane.x, crane.y, '仙鹤献瑞 灵石+' + fmt(v), '#ffe39a'); }
    for (let k = 0; k < 24; k++) { const a = Math.random() * 6.28; parts.push({ x: crane.x, y: crane.y, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, life: 700, max: 700, c: '#ffe39a', s: 1 }); }
    SFX.coin(); crane = null; return;
  }
  let best = null, bd = 1e9;
  for (const d of st.ds) {
    if (d.away) continue;
    const [sx, sy] = slotPos(d);
    if (x > sx - 9 && x < sx + 9 && y > sy - 26 && y < sy + 2) { const dd = Math.abs(x - sx) + Math.abs(y - sy + 8); if (dd < bd) { bd = dd; best = d; } }
  }
  if (best) { SFX.tap(); if (L.isReady(best)) showBreakthrough(best); else showDisciple(best); return; }
  if (y > 34 && y < 86 && x > 60 && x < 140) { SFX.tap(); showBuild(); }
}
cvs.addEventListener('click', sceneClick);
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-nav]'); if (!b || !st || cine) return;
  ac(); SFX.tap();
  ({ disciples: showDisciples, recruit: showRecruit, dungeon: showDungeons, build: showBuild, sect: showSect })[b.dataset.nav]();
});
$('#btnSpeed').onclick = () => { ac(); speedIdx = (speedIdx + 1) % SPEEDS.length; SFX.tap(); savePref(); updateHUD(); };
$('#btnSound').onclick = () => { soundMode = (soundMode + 1) % 3; ac(); SFX.tap(); setSoundIcon(); savePref(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveCloud(); } });
window.addEventListener('pagehide', saveLocal);
window.addEventListener('resize', () => { setFontSize(); fitScene(); });

// ---------- 开场 ----------
const SECTS = ['青岚宗', '太微宗', '归云门', '凌霄阁', '玄真观', '紫阳宗', '落霞山', '问道宗', '无涯阁', '星河派'];
const MASTERS = ['林逸尘', '沈青川', '陆长风', '叶知秋', '苏念白', '顾清寒', '江离', '温如玉', '秦慕白', '萧云舟'];
function showIntro(re) {
  const box = $('#intro');
  box.hidden = false;
  $('#modal').hidden = true;
  if (re) { setupForm(re); return; }
  const lines = [
    ['天剑宗外门。', '“杂灵根也配修仙？滚出山门！”', '少年被当众逐出师门，扔下了山。'],
    ['他流落荒山，在破庙里捡到一枚生锈的戒指。', '“小子……老夫在戒中等了你三千年。”'],
    ['三月之后，荒山之巅，一座小小的宗门悄然立起。', '目标：收徒、炼丹、闯秘境、争排名——', '击败天剑宗，登顶天下，白日飞升！'],
  ];
  let page = 0, typing = null;
  const render = () => {
    const ls = lines[page];
    box.innerHTML = `<div class="story">${page === 0 ? '<h1>仙门崛起</h1>' : ''}${ls.map(() => '<p></p>').join('')}<p class="hint">点击继续 ▸</p></div>`;
    const ps = box.querySelectorAll('p:not(.hint)');
    let li = 0, ci = 0;
    clearInterval(typing);
    typing = setInterval(() => {
      if (li >= ls.length) { clearInterval(typing); typing = null; return; }
      ps[li].textContent = ls[li].slice(0, ++ci);
      if (ci % 2) tone(880, 0, 0.02, 'square', 0.03);
      if (ci >= ls[li].length) { li++; ci = 0; }
    }, 45);
    box.querySelector('.story').onclick = () => {
      ac();
      if (typing) { clearInterval(typing); typing = null; ps.forEach((p, i) => p.textContent = ls[i]); return; }
      page++;
      if (page >= lines.length) setupForm(null); else render();
    };
  };
  render();
}
function setupForm(re) {
  const box = $('#intro');
  let female = re && re.female ? 1 : 0;
  const sect = (re && re.sect) || SECTS[Math.floor(Math.random() * SECTS.length)];
  const master = (re && re.master) || MASTERS[Math.floor(Math.random() * MASTERS.length)];
  box.innerHTML = `<div class="setup sheet" style="margin:0"><div class="rod"></div><header><h2>${re ? `第 ${re.rebirth + 1} 世 · 转世重修` : '开宗立派'}</h2></header>
    <div class="body">
      <label for="inSect">宗门名号</label><div class="row"><input class="txt grow" id="inSect" maxlength="8" value="${esc(sect)}"><button class="btn sm alt" id="rdSect" aria-label="随机宗门名">换</button></div>
      <label for="inMaster">掌门姓名</label><div class="row"><input class="txt grow" id="inMaster" maxlength="6" value="${esc(master)}"><button class="btn sm alt" id="rdMaster" aria-label="随机姓名">换</button></div>
      <div class="row"><span>掌门形象</span><button class="btn sm ${female ? 'alt' : 'gold'}" id="gM">男</button><button class="btn sm ${female ? 'gold' : 'alt'}" id="gF">女</button></div>
      ${re ? `<div class="quote">仙缘加身：修炼速度 ×${(1 + 0.5 * re.rebirth).toFixed(1)}，初始灵石更多，天才弟子更易出现。</div>` : '<div class="muted">操作很简单：收徒 → 升级建筑 → 派弟子历练 → 点头顶有【！】的弟子突破。其余交给时间。</div>'}
    </div><div class="foot"><button class="btn gold" id="goStart">开宗立派</button></div><div class="rod"></div></div>`;
  const inS = box.querySelector('#inSect'), inM = box.querySelector('#inMaster');
  box.querySelector('#rdSect').onclick = () => { inS.value = SECTS[Math.floor(Math.random() * SECTS.length)]; SFX.tap(); };
  box.querySelector('#rdMaster').onclick = () => { inM.value = MASTERS[Math.floor(Math.random() * MASTERS.length)]; SFX.tap(); };
  const setG = f => { female = f; box.querySelector('#gM').className = 'btn sm ' + (f ? 'alt' : 'gold'); box.querySelector('#gF').className = 'btn sm ' + (f ? 'gold' : 'alt'); SFX.tap(); };
  box.querySelector('#gM').onclick = () => setG(0);
  box.querySelector('#gF').onclick = () => setG(1);
  box.querySelector('#goStart').onclick = () => {
    ac();
    const s = L.newState({ sect: inS.value.trim() || sect, master: inM.value.trim() || master, female, rebirth: re ? re.rebirth : 0 });
    s.ds[0].slot = 0;
    L.log(s, `${s.masterName}于荒山之巅立下${s.sect}，誓要登顶天下！`, 'gold');
    loadState(s);
    box.hidden = true;
    monthAcc = 0;
    SFX.gong();
    banner(s.sect, '开宗立派');
    setTimeout(() => tip('rec', '小子，光杆掌门可不行。先点下面的【收徒】，招几个弟子吧！'), 1800);
    saveLocal();
  };
}

// ---------- 启动 ----------
function start(data) {
  loadPref();
  setSoundIcon();
  const hotSt = data && data.st ? migrate(data.st) : null;
  const local = hotSt || migrate(loadLocal());
  if (local) { loadState(local); $('#intro').hidden = true; }
  else showIntro(null);
  updateHUD(true);
  fitScene();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  initCloud();
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ st })); } catch (e) { /* ignore */ }
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
// 调试与测试入口
window.__xm = { get st() { return st; }, L, setSpeed: i => { speedIdx = i; }, onMonth, showBreakthrough, closeModal, showEvent, get cine() { return !!cine; }, freeSlot: () => freeSlot(st) };
})();
