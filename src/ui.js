/* 废柴仙途 · 界面、场景动画、音效与流程（美术由 art.js 提供，接口见 ART.dims 与各 draw 函数） */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = L.fmt;
const TICK_MS = 5000;
const SPEEDS = [1, 2, 4, 0];
let st = null;
let speedIdx = 0;
let cine = null;
const queue = [];
let soundMode = 0;
let cloudStatus = '未连接';
let rankShown = 0;

// ---------- 字号与缩放 ----------
function setFontSize() {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.round(dpr * 1.2));
  let fs = 12 * k / dpr;
  if (fs < 12) fs = 12;
  if (fs > 16) fs = 16;
  const root = document.documentElement;
  root.style.setProperty('--fs', fs.toFixed(3) + 'px');
  root.style.zoom = '';
  const z = Math.min(window.innerWidth / 500, window.innerHeight / 600);
  const q = Math.max(1, Math.min(2, Math.floor(z * 4) / 4));
  if (q > 1) root.style.zoom = q;
}
setFontSize();

// ---------- 图标 ----------
const ICONS = {
  stone: [['....oo....', '...oaao...', '..oabbao..', '.oabbbbao.', '.oabbbcbo.', '.oabbbbbo.', '..obbbbo..', '...obbo...', '....oo....', '..........'], { o: '#0b0912', a: '#d4fbff', b: '#4fd0e6', c: '#ffffff' }],
  pill: [['..........', '...oooo...', '..orrrro..', '.orwrrrro.', '.orrrrrro.', '.orrrrrro.', '.orrrrrdo.', '..orrddo..', '...oooo...', '..........'], { o: '#0b0912', r: '#f08a3c', w: '#fff3c8', d: '#b0521c' }],
  life: [['.oooooooo.', '.oyyyyyyo.', '..oaaaao..', '...oaao...', '....oo....', '....oo....', '...obbo...', '..obbbbo..', '.oyyyyyyo.', '.oooooooo.'], { o: '#0b0912', y: '#c9a35a', a: '#e8f4ff', b: '#f4d27a' }],
  flag: [['oo........', 'oyooooooo.', 'oyrrrrrro.', 'oyrryyrro.', 'oyrrrrrro.', 'oyooooooo.', 'oyo.......', 'oyo.......', 'oyo.......', 'ooo.......'], { o: '#0b0912', y: '#c9a35a', r: '#c8323c' }],
  disc: [['....oo....', '...ohho...', '..oohhoo..', '.ohhhhhho.', '.ohssssho.', '.osesseso.', '..osssso..', '.oorrrroo.', 'orrrttrrro', 'orrrttrrro'], { o: '#0b0912', h: '#2a2030', s: '#f2c9a0', e: '#0b0912', r: '#7f93ab', t: '#dfe7ef' }],
  sword: [['........oo', '.......owo', '......owo.', '.....owo..', '..o.owo...', '...owo....', '..oyo.....', '.oyoo.....', 'oyo.......', 'oo........'], { o: '#0b0912', w: '#dfe8f2', y: '#f4c542' }],
  build: [['....oo....', '...oyyo...', '.oorrrroo.', 'orrrrrrrro', '..owwwwo..', '..owddwo..', '.oooooooo.', 'orrrrrrrro', '.owwddwwo.', '.owwddwwo.'], { o: '#0b0912', y: '#f4c542', r: '#3a3d5c', w: '#c8503a', d: '#3b2015' }],
  bag: [['...oooo...', '..oyooyo..', '...oyyo...', '..oooooo..', '.obbbbbbo.', 'obbbyybbbo', 'obbbyybbbo', 'obbbbbbbbo', 'oBbbbbbbBo', '.oooooooo.'], { o: '#0b0912', y: '#f4c542', b: '#b0703a', B: '#7a4a22' }],
  sound: [['..........', '....o.....', '...oo..o..', 'oooyo...o.', 'oyyyo.o.o.', 'oyyyo.o.o.', 'oooyo...o.', '...oo..o..', '....o.....', '..........'], { o: '#0b0912', y: '#f3ecdc' }],
  note: [['..........', '.....ooo..', '.....oyyo.', '.....o.yo.', '.....o....', '.....o....', '..ooo.....', '.oyyo.....', '.oyyo.....', '..oo......'], { o: '#f3ecdc', y: '#f4c542' }],
  mute: [['..........', '....o.....', '...oo.....', 'oooyo.o.o.', 'oyyyo..o..', 'oyyyo..o..', 'oooyo.o.o.', '...oo.....', '....o.....', '..........'], { o: '#0b0912', y: '#9d93b8' }],
  pet: [['.o......o.', '.oo....oo.', '.oaooooao.', 'oaaaaaaaao', 'oaeaaaaeao', 'oaaaaaaaao', '.oawwwwao.', '.oawwwwao.', '..oo..oo..', '..........'], { o: '#0b0912', a: '#f2f0ea', e: '#0b0912', w: '#ffffff' }],
};
const iconURL = {};
for (const k in ICONS) iconURL[k] = ART.pix(ICONS[k][0], ICONS[k][1]).toDataURL();
function iconHTML(k, size) { return `<img class="px" src="${iconURL[k]}" width="${size || 16}" height="${size || 16}" alt="">`; }
$$('img[data-icon]').forEach(img => { img.src = iconURL[img.dataset.icon]; });
const ELDER = ART.elder().toDataURL();

// ---------- 头像 ----------
const avCache = new Map();
function urlOf(canvas, key) { if (avCache.has(key)) return avCache.get(key); const u = canvas.toDataURL(); avCache.set(key, u); return u; }
function avStyle(c, w) { return `width:${w}px;height:${Math.round(w * c.height / c.width)}px`; }
function myAvCanvas(realm) { const p = st.p, r = realm !== undefined ? realm : p.r; const tc = L.TALENTS[p.t].c; return ART.avatar(p.look, r, tc === 'rainbow' ? '#c48bff' : tc); }
function myAv(realm) { const p = st.p, r = realm !== undefined ? realm : p.r; return urlOf(myAvCanvas(r), ['me', p.look.hair, p.look.f, r, p.t].join('|')); }
function myAvImg(w, realm, extraStyle) { const c = myAvCanvas(realm); return `<img class="px" src="${myAv(realm)}" style="${avStyle(c, w)};${extraStyle || ''}" alt="">`; }
const RIVAL_LOOK = {
  mu: f => ({ look: { hair: '#3b2a22', skin: '#f6d3b3', f: f ? 0 : 1 }, robe: ['#a8405a', '#d86a88', '#f4a0b8'], trim: '#ffffff' }),
  zhao: () => ({ look: { hair: '#2a2230', skin: '#e8b68a', f: 0 }, robe: ['#3a5a8a', '#5a7ab0', '#8aa8d8'], trim: '#dfe7ef' }),
  chu: () => ({ look: { hair: '#1d1a24', skin: '#f2c9a0', f: 0 }, robe: ['#b9b3a5', '#ecebe4', '#ffffff'], trim: '#f4c542' }),
  xue: () => ({ look: { hair: '#2a0c10', skin: '#e0b0a0', f: 0 }, robe: ['#5a0c14', '#8e1a24', '#c83a40'], trim: '#1b1326', extra: { horns: true } }),
  yun: () => ({ look: { hair: '#e9e8f2', skin: '#f6d3b3', f: 0 }, robe: ['#8a92a8', '#c8d0e0', '#ffffff'], trim: '#a8d8ff' }),
};
const ROBES = [['#3a5a3a', '#5a8a4a', '#8ab86a'], ['#5a3a6a', '#8a5aa0', '#b88ad0'], ['#6a4a2a', '#9a7040', '#c8a060'], ['#2a4a6a', '#4a7aa0', '#7aa8d0'], ['#6a2a2a', '#9a4040', '#c87070']];
function rivalAvImg(rv, w) {
  let o;
  if (rv.id && RIVAL_LOOK[rv.id]) o = RIVAL_LOOK[rv.id](st.p.look.f);
  else { let h = 0; for (const ch of rv.n) h = (h * 31 + ch.charCodeAt(0)) >>> 0; o = { look: { hair: ['#1d1a24', '#3a2a22', '#4a3328'][h % 3], skin: '#e8b68a', f: (h >> 3) % 2 }, robe: ROBES[h % ROBES.length], trim: '#f3ecdc' }; }
  const c = ART.avatar(o.look, 0, '#5a3a3a', { robe: o.robe, trim: o.trim, extra: o.extra });
  return `<img class="px" id="vsR" src="${urlOf(c, 'rv|' + rv.n)}" style="${avStyle(c, w)}" alt="">`;
}
const NPC_LOOK = {
  su: f => ({ look: { hair: '#3b2a22', skin: '#f6d3b3', f: f ? 0 : 1 }, robe: ['#b0603a', '#e8905a', '#ffc08a'], trim: '#fff3d8' }),
  ye: f => ({ look: { hair: '#1a1424', skin: '#f2d2c8', f: f ? 0 : 1 }, robe: ['#2a1630', '#4a2450', '#7a3a7a'], trim: '#e8485a' }),
  chu: () => ({ look: { hair: '#2a2230', skin: '#e0b088', f: 0 }, robe: ['#3a4250', '#5a6474', '#8a94a4'], trim: '#c8d0dc' }),
  ge: () => ({ look: { hair: '#dcdce6', skin: '#e8c0a0', f: 0 }, robe: ['#5a4030', '#8a6448', '#b08a68'], trim: '#e8d0a0' }),
  bai: () => ({ look: { hair: '#f4f0f6', skin: '#fbe2d4', f: 1 }, robe: ['#c87a9a', '#f0a8c4', '#ffd8e8'], trim: '#ffffff' }),
  mo: () => ({ look: { hair: '#0e0c14', skin: '#d8c0b0', f: 0 }, robe: ['#0e0c14', '#1e1a26', '#34303e'], trim: '#6a5a8a' }),
};
function npcAvImg(id, w) {
  const o = NPC_LOOK[id] ? NPC_LOOK[id](st.p.look.f) : NPC_LOOK.chu();
  const c = ART.avatar(o.look, 0, '#3a4a6a', { robe: o.robe, trim: o.trim });
  return `<img class="px" src="${urlOf(c, 'npc|' + id + '|' + st.p.look.f)}" style="${avStyle(c, w)}" alt="">`;
}
function bossImg(k, w) {
  const key = 'boss|' + k;
  if (!avCache.has(key)) {
    const rg = L.REGIONS[k];
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#3a1a24'; g.fillRect(0, 0, 40, 40);
    if (rg.foe === 'beast') { const s = ART.wolf(rg.fc); g.drawImage(s, Math.round(20 - s.width / 2), Math.round(34 - s.height)); }
    else if (rg.foe === 'man') { const s = ART.foeMan(rg.fc, rg.bg); g.drawImage(s, Math.round(20 - s.width / 2), Math.max(0, 40 - s.height)); }
    else { ART.setCtx(g, 40); g.setTransform(1, 0, 0, 1, 0, 0); if (rg.foe === 'orb') ART.drawOrb(20, 20, 0, rg.fc, false); else ART.drawSnake(6, 22, 0, rg.fc, false); ART.setCtx(ctx, W); }
    avCache.set(key, c.toDataURL());
  }
  return `<img class="px" id="vsR" src="${avCache.get(key)}" style="width:${w}px;height:${w}px" alt="">`;
}
function talentTag(t) {
  const T0 = L.TALENTS[t];
  return T0.c === 'rainbow' ? `<span class="tag rainbow">${T0.n}</span>` : `<span class="tag" style="background:${T0.c}">${T0.n}</span>`;
}
function petImg(tier, w) { const c = ART.pet(tier); return `<img class="px" src="${urlOf(c, 'pet' + tier)}" style="${avStyle(c, w)};vertical-align:middle" alt="">`; }

// ---------- 场景 ----------
const cvs = $('#scene');
const ctx = cvs.getContext('2d');
ctx.imageSmoothingEnabled = false;
const W = 200; let H = 160, OY = 0;
ART.setCtx(ctx, W);
const R = ART.R, disc = ART.disc;
let T = 0;
const parts = [];
let crane = null, craneTimer = 50000;
const HOMEPOS = { x: 100, y: 136 };   // 主角打坐脚底中心
let adv = null;
let wipe = 0;
let lastMode = 'home';
const D = () => ART.dims;
function fitScene() {
  const app = $('#app'), wrap = $('#sceneWrap');
  const others = ['#top', '#cult', '#stats', '#goal', '#nav'].reduce((s, q) => s + $(q).offsetHeight, 0) + 6 * 7 + 16;
  const avail = app.clientHeight - others - 70;
  const w = wrap.clientWidth || 300;
  const h = Math.max(160, Math.min(250, Math.floor(avail / w * W)));
  if (h !== H) { H = h; OY = H - 160; cvs.height = H; ctx.imageSmoothingEnabled = false; wrap.style.aspectRatio = `${W} / ${H}`; }
}
function phase() { return ((T / 120000) + 0.42) % 1; }
function season() { return Math.floor(((st ? st.year : 0) % 1) * 4); }
function drawArray(x, y) {
  const lv = st.home.array; if (!lv) return null;
  const rx = 22 + Math.min(lv, 12), ry = Math.round(rx * 0.3);
  const col = lv >= 20 ? '#ffd76a' : lv >= 10 ? '#8ff5d0' : '#4ccb9f';
  const pulse = 0.55 + 0.3 * Math.sin(T / 500);
  ctx.globalAlpha = Math.min(1, 0.4 + lv * 0.03) * pulse + 0.15;
  for (let a = 0; a < 360; a += 3) { const t = a * Math.PI / 180; R(x + Math.cos(t) * rx, y + Math.sin(t) * ry, 1, 1, col); }
  if (lv >= 8) for (let a = 0; a < 360; a += 5) { const t = a * Math.PI / 180; R(x + Math.cos(t) * rx * 0.65, y + Math.sin(t) * ry * 0.65, 1, 1, col); }
  const nr = 6 + Math.min(6, Math.floor(lv / 4));
  for (let i = 0; i < nr; i++) { const t = T / 2400 + i * Math.PI * 2 / nr; R(x + Math.cos(t) * rx - 1, y + Math.sin(t) * ry - 1, 2, 2, '#ffffff'); }
  ctx.globalAlpha = 1;
  if (Math.random() < 0.08 + lv * 0.008) { const t = Math.random() * Math.PI * 2; parts.push({ x: x + Math.cos(t) * rx, y: y + Math.sin(t) * ry, vx: -Math.cos(t) * 0.004, vy: -0.012, life: 1700, max: 1700, c: col, s: 1 }); }
  return col;
}
function drawMeHome(x, y, realm) {
  const p = st.p, S = D().sit;
  const r = realm !== undefined ? realm : p.r;
  const trim = L.REALMS[Math.min(r, 9)].trim;
  y += r >= 7 ? Math.round(Math.sin(T / 600) * 1.5) - 2 : 0;
  if (r >= 2) ART.glow(x, y - S.h / 2, Math.round(S.w * 0.45) + Math.min(r, 8), trim, 0.22 + 0.06 * Math.sin(T / 400));
  const spr = ART.sit(p.look, r, p.inj > 0 ? { gray: true } : null);
  const sx = Math.round(x - S.w / 2), sy = Math.round(y - S.h);
  ctx.drawImage(spr, sx, sy);
  if ((T / 1400 | 0) % 2) ctx.drawImage(spr, 0, 0, S.w, S.split, sx, sy - 1, S.w, S.split); // 呼吸
  if (r >= 3) { const yx = x - S.w / 2 - 5, yy = sy + 4 + Math.round(Math.sin(T / 500) * 1.5); R(yx - 1, yy, 3, 2, '#ffe39a'); R(yx - 2, yy + 2, 5, 2, trim); R(yx - 1, yy + 4, 3, 1, L.REALMS[Math.min(r, 9)].robe[1]); }
  if (r >= 4) for (let i = 0; i < 3; i++) { const t = T / 700 + i * 2.09; R(x + Math.cos(t) * (S.w * 0.65) - 1, y - S.h / 2 + Math.sin(t) * 4, 2, 2, trim); }
  if (r >= 8 && Math.random() < 0.04) parts.push({ x: x + (Math.random() - 0.5) * S.w, y: y - Math.random() * S.h, vx: 0, vy: 0, life: 120, max: 120, c: '#ffe766', s: 1 });
  if (p.inj > 0) { R(sx + S.w - 4, sy + 2, 3, 1, '#ff4d4d'); R(sx + S.w - 3, sy + 1, 1, 3, '#ff4d4d'); }
  if (L.isReady(st) && !cine) {
    const bx = x + S.w / 2 + 3, by = sy + 2 + Math.round(Math.abs(Math.sin(T / 250)) * -3);
    R(bx - 3, by, 7, 9, '#3a1a14'); R(bx - 2, by + 1, 5, 7, '#fff6dc'); R(bx, by + 2, 1, 4, '#c8323c'); R(bx, by + 7, 1, 1, '#c8323c'); R(bx - 4, by + 7, 2, 2, '#3a1a14');
  }
}
function drawPet(x, y) {
  const p = st.p; if (!p.pet) return;
  const spr = ART.pet(p.pet.tier), P = D().pet;
  const hop = Math.abs(Math.sin(T / 700)) > 0.95 ? -1 : 0;
  ctx.drawImage(spr, Math.round(x), Math.round(y - P.h + hop));
  if (P.tail) { const c = L.PETS[p.pet.tier].c; for (let k = 0; k < 4; k++) R(x + P.w - 1 + Math.round(Math.sin(T / 300 + k * 0.6)), y - 4 - k, 2, 1, k === 3 ? '#ffffff' : c[1]); }
  if (p.pet.tier >= 5 && Math.random() < 0.05) parts.push({ x: x + P.w / 2, y: y - P.h, vx: 0, vy: -0.01, life: 800, max: 800, c: L.PETS[p.pet.tier].c[0], s: 1 });
}
function drawCrane() {
  if (!crane) return;
  if (ART.drawCrane) { ART.drawCrane(crane.x, crane.y, T); return; }
  const x = crane.x, y = crane.y + Math.sin(T / 200) * 1.5;
  const wing = (T / 180 | 0) % 2;
  R(x - 5, y, 10, 2, '#ffffff'); R(x + 4, y - 2, 2, 2, '#ffffff'); R(x + 5, y - 3, 1, 1, '#e23a3a'); R(x + 6, y - 1, 2, 1, '#2a2030');
  R(x - 7, y + 1, 2, 1, '#2a2030');
  if (wing) { R(x - 3, y - 4, 5, 4, '#f3efff'); R(x - 3, y - 4, 2, 1, '#2a2030'); } else { R(x - 3, y + 2, 5, 3, '#f3efff'); R(x - 3, y + 4, 2, 1, '#2a2030'); }
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
  if (parts.length > 500) parts.splice(0, parts.length - 500);
}
function seasonFx(night) {
  const s = season();
  if (Math.random() < [0.05, 0, 0.04, 0.07][s]) {
    const c = s === 0 ? '#f7a8c4' : s === 2 ? (Math.random() < .5 ? '#e8873a' : '#d6b13a') : '#ffffff';
    parts.push({ x: Math.random() * W, y: -OY - 2, vx: (s === 3 ? 0.003 : 0.008) * (0.5 + Math.random()), vy: 0.012 + Math.random() * 0.01, life: 14000, max: 14000, c, s: 1 });
  }
  if (night && s === 1 && Math.random() < 0.05) parts.push({ x: 20 + Math.random() * 160, y: 100 + Math.random() * 40, vx: (Math.random() - 0.5) * 0.01, vy: -0.004, life: 3000, max: 3000, c: '#e8ff7a', s: 1, fly: 1 });
}
function drawHomeScene(dt) {
  const r = ART.drawHome(st, T, OY, parts, { phase: phase() });
  const col = drawArray(HOMEPOS.x, HOMEPOS.y - 1);
  seasonFx(r.night);
  if (cine) drawCineTarget(); else drawMeHome(HOMEPOS.x, HOMEPOS.y);
  drawPet(HOMEPOS.x + D().sit.w / 2 + 4, HOMEPOS.y);
  drawCrane();
  drawParts(dt);
  const lights = (r.lights || []).slice();
  if (col) lights.push({ x: HOMEPOS.x, y: HOMEPOS.y - 2, r: 18, c: col, a: 0.35 });
  if (st.p.r >= 2) lights.push({ x: HOMEPOS.x, y: HOMEPOS.y - D().sit.h / 2, r: 14, c: L.REALMS[Math.min(st.p.r, 9)].trim, a: 0.3 });
  for (const p of parts) if (p.fly) lights.push({ x: p.x, y: p.y, r: 2, c: '#e8ff7a', a: 0.5 });
  ART.nightOverlay(r.sky, OY, H, lights);
  if (cine) drawCine(dt);
}

// ---------- 历练动画 ----------
function newAdv(k) { return { k, scroll: 0, foes: [], shots: [], spawn: 600, fire: 500, kills: 0 }; }
function foeHitY(f) { if (f.kind === 'man') return f.y - D().stand.h * 0.55; if (f.kind === 'beast') return f.y - D().wolf.h / 2; return f.y; }
function drawAdvScene(dt) {
  const rg = L.REGIONS[adv.k], p = st.p, SD = D().stand;
  adv.scroll += dt * 0.035;
  ART.drawAdventure(rg.bg, T, OY, adv.scroll);
  const px = 58, py = 114 + Math.round(Math.sin(T / 380) * 2);
  const frame = (T / 260 | 0) % 2;
  const trim = L.REALMS[Math.min(p.r, 9)].trim;
  if (ART.drawFlyingSword) ART.drawFlyingSword(px, py, T, trim);
  else { R(px - 13, py + 1, 26, 2, '#dfe8f2'); R(px - 13, py + 1, 26, 1, '#ffffff'); R(px - 16, py, 3, 4, '#c8a050'); }
  for (let k = 0; k < 2; k++) parts.push({ x: px - 15, y: py + 1 + k, vx: -0.03, vy: 0, life: 260, max: 260, c: trim, s: 1 });
  ctx.drawImage(ART.standRealm(p.look, p.r, frame), Math.round(px - SD.w / 2), Math.round(py - SD.h + 1));
  if (p.pet) { const P = D().pet; ctx.drawImage(ART.pet(p.pet.tier), px - 16 - P.w, py - P.h - 8 + Math.round(Math.sin(T / 300) * 3)); }
  adv.spawn -= dt;
  if (adv.spawn <= 0 && adv.foes.length < 3) {
    const foe = rg.foe;
    adv.foes.push({ x: W + 16, y: foe === 'orb' ? 96 + Math.random() * 16 : foe === 'snake' ? 104 + Math.random() * 10 : 128, hp: 2 + Math.floor(Math.random() * 3), hit: 0, t: 0, kind: foe });
    adv.spawn = 1300 + Math.random() * 1200;
  }
  adv.fire -= dt;
  const target = adv.foes.find(f => f.x < 196 && f.hp > 0);
  const handY = py - SD.h * 0.55;
  if (adv.fire <= 0 && target) {
    adv.fire = 520;
    adv.shots.push({ x: px + SD.w / 2, y: handY, tx: target, vy: (foeHitY(target) - handY) / Math.max(20, target.x - px) * 0.22, vx: 0.22 });
    SFX.slash();
  }
  for (let i = adv.shots.length - 1; i >= 0; i--) {
    const s = adv.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (ART.drawSwordQi) ART.drawSwordQi(s.x, s.y, trim);
    else { R(s.x - 3, s.y - 3, 2, 1, trim); R(s.x - 1, s.y - 2, 2, 1, trim); R(s.x, s.y - 1, 2, 3, '#ffffff'); R(s.x - 1, s.y + 2, 2, 1, trim); R(s.x - 3, s.y + 3, 2, 1, trim); }
    if (Math.random() < 0.5) parts.push({ x: s.x - 4, y: s.y, vx: 0, vy: 0, life: 160, max: 160, c: trim, s: 1 });
    const f = s.tx;
    if (f && f.hp > 0 && s.x >= f.x - 6) {
      f.hp--; f.hit = 120;
      const dmg = L.power(st) * (0.6 + Math.random() * 0.8);
      floatText(f.x, foeHitY(f) - 10, fmt(dmg), Math.random() < 0.2 ? '#ffe39a' : '#ffffff', false, true);
      for (let k = 0; k < 6; k++) parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 0.08, vy: (Math.random() - 0.5) * 0.08, life: 300, max: 300, c: '#ffffff', s: 1 });
      SFX.hit();
      adv.shots.splice(i, 1);
      if (f.hp <= 0) {
        adv.kills++;
        const fc = rg.fc, cy = foeHitY(f);
        for (let k = 0; k < 18; k++) { const a = Math.random() * 6.28, v = 0.02 + Math.random() * 0.05; parts.push({ x: f.x, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.0001, life: 600, max: 600, c: k % 2 ? fc[0] : fc[1], s: 2 }); }
        if (Math.random() < 0.45) floatText(f.x, cy - 12, Math.random() < 0.15 ? '宝光!' : '灵石', '#8ff5d0');
      }
      continue;
    }
    if (s.x > W + 10) adv.shots.splice(i, 1);
  }
  for (let i = adv.foes.length - 1; i >= 0; i--) {
    const f = adv.foes[i];
    f.t += dt;
    if (f.hp <= 0) { adv.foes.splice(i, 1); continue; }
    if (f.x > 104 + i * 22) f.x -= dt * 0.03;
    if (f.hit > 0) f.hit -= dt;
    const fc = rg.fc, hit = f.hit > 0;
    if (f.kind === 'beast') { const spr = ART.wolf(fc), WD = D().wolf; if (hit) ctx.globalAlpha = 0.5; ctx.drawImage(spr, Math.round(f.x - WD.w / 2), Math.round(f.y - WD.h + (Math.sin(f.t / 120) > 0 ? 0 : -1))); ctx.globalAlpha = 1; }
    else if (f.kind === 'man') { const spr = ART.foeMan(fc, rg.bg); if (hit) ctx.globalAlpha = 0.5; ctx.drawImage(spr, Math.round(f.x - SD.w / 2), Math.round(f.y - SD.h)); ctx.globalAlpha = 1; }
    else if (f.kind === 'orb') ART.drawOrb(Math.round(f.x), Math.round(f.y + Math.sin(f.t / 300) * 3), T, fc, hit);
    else ART.drawSnake(Math.round(f.x), Math.round(f.y), T, fc, hit);
  }
  drawParts(dt);
  const e = st.exp;
  if (e) { const k = Math.min(1, (e.total - e.left + monthAcc / TICK_MS) / e.total); R(4, -OY + 4, 60, 4, '#1b1326'); R(5, -OY + 5, 58 * k, 2, '#f4c542'); }
}

// ---------- 主绘制 ----------
function drawScene(dt) {
  T += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (!st) { R(0, 0, W, H, '#120f1c'); return; }
  ctx.setTransform(1, 0, 0, 1, 0, OY);
  const mode = st.exp ? 'adv' : 'home';
  if (mode !== lastMode) { wipe = 700; lastMode = mode; parts.length = 0; adv = mode === 'adv' ? newAdv(st.exp.k) : null; }
  if (mode === 'adv' && !adv) adv = newAdv(st.exp.k);
  if (mode === 'adv') drawAdvScene(dt); else drawHomeScene(dt);
  if (wipe > 0) {
    wipe -= dt;
    const cols = Math.ceil(10 * wipe / 700);
    for (let i = 0; i < 10; i++) R(i * 20, -OY, cols * 2, H, '#0b0912');
  }
}
function floatText(x, y, text, color, big, small) {
  const el = document.createElement('div');
  el.className = 'float' + (big ? ' big' : '');
  el.style.left = (x / W * 100).toFixed(2) + '%'; el.style.top = ((y + OY) / H * 100).toFixed(2) + '%'; el.style.color = color || '#fff';
  if (small) el.style.animationDuration = '0.9s';
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
function startCine(res) {
  const strikes = res.ascend ? 9 : res.trib;
  const gather = strikes ? 1100 : 1500;
  const gap = res.ascend ? 380 : 430;
  const end = gather + strikes * gap + (res.ascend ? 2600 : 900);
  cine = { res, t: 0, strikes, gather, gap, end, fired: 0, fromR: res.from };
  $('#tip').hidden = true;
  if (strikes) SFX.rumble(); else SFX.gather();
}
function drawCineTarget() {
  const c = cine, strikeEnd = c.gather + c.strikes * c.gap;
  const showR = c.t > strikeEnd && c.res.ok ? Math.min(c.res.to, 9) : c.fromR;
  let y = HOMEPOS.y;
  if (c.res.ascend && c.res.ok && c.t > strikeEnd + 300) { const k = (c.t - strikeEnd - 300) / 2000; y -= k * k * 170; }
  drawMeHome(HOMEPOS.x, y, showR);
}
function drawCine(dt) {
  const c = cine;
  c.t += dt;
  const x = HOMEPOS.x, y = HOMEPOS.y - D().sit.h / 2;
  const strikeEnd = c.gather + c.strikes * c.gap;
  const dark = c.strikes ? Math.min(0.6, c.t / c.gather * 0.6) * (c.t > strikeEnd + 400 ? Math.max(0, 1 - (c.t - strikeEnd - 400) / 500) : 1) : 0.25 * Math.min(1, c.t / 600) * (c.t > strikeEnd ? Math.max(0, 1 - (c.t - strikeEnd) / 400) : 1);
  ctx.globalAlpha = dark; R(0, -OY, W, H, '#0a0818'); ctx.globalAlpha = 1;
  if (c.strikes) {
    const ca = Math.min(1, c.t / c.gather) * (c.t > strikeEnd + 300 ? Math.max(0, 1 - (c.t - strikeEnd - 300) / 600) : 1);
    ctx.globalAlpha = ca;
    for (let k = 0; k < 9; k++) disc(x - 40 + k * 10, -OY * 0.3 + 10 + (k % 2) * 3 + Math.sin(T / 300 + k) * 1.5, 8, k % 2 ? '#241f38' : '#3a3358');
    for (let k = 0; k < 9; k++) R(x - 42 + k * 10, -OY * 0.3 + 4 + (k % 3), 6, 1, '#5a5280');
    ctx.globalAlpha = 1;
    const n = Math.floor((c.t - c.gather) / c.gap) + 1;
    if (c.t >= c.gather && n > c.fired && c.fired < c.strikes) { c.fired = n; flash(0.75); shake(); SFX.thunder(); c.bolt = { t: 140 }; }
    if (c.bolt && c.bolt.t > 0) {
      c.bolt.t -= dt;
      let bx = x + (Math.random() - 0.5) * 10, by = -OY * 0.3 + 16;
      const col = c.fired >= 9 ? '#e9c9ff' : '#fff6a8';
      while (by < y - 2) { const nx = bx + (Math.random() - 0.5) * 9, ny = by + 4 + Math.random() * 5; for (let s = 0; s <= 6; s++) { R(bx + (nx - bx) * s / 6 - 1, by + (ny - by) * s / 6, 3, 2, col); R(bx + (nx - bx) * s / 6, by + (ny - by) * s / 6, 1, 2, '#ffffff'); } bx = nx; by = ny; }
      ART.glow(x, y, 20, col, 0.6);
      for (let k = 0; k < 6; k++) parts.push({ x: x + (Math.random() - .5) * 14, y: y + 8, vx: (Math.random() - .5) * 0.08, vy: -Math.random() * 0.08, g: 0.0002, life: 500, max: 500, c: col, s: 1 });
    }
  } else if (c.t < strikeEnd) {
    for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 20; parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.5, vx: -Math.cos(a) * r / 600, vy: -Math.sin(a) * r * 0.5 / 600, life: 600, max: 600, c: '#9ff5d8', s: 1 }); }
  }
  if (c.t >= strikeEnd && !c.resolved) {
    c.resolved = true;
    if (c.res.ok) {
      flash(1); SFX.win();
      for (let k = 0; k < 70; k++) { const a = Math.random() * Math.PI * 2, v = 0.02 + Math.random() * 0.06; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, g: 0.00005, life: 1300, max: 1300, c: k % 3 ? '#ffe39a' : '#ffffff', s: k % 4 ? 1 : 2 }); }
      if (c.res.ascend) { SFX.gong(); banner('白日飞升', st.p.name + ' 渡过九九天劫！', '#fff6c0'); }
      else banner('突破成功', `${L.REALMS[c.res.to].n}期 · 寿元 ${fmt(c.res.lifeAfter)} 年`);
    } else {
      SFX.fail();
      for (let k = 0; k < 30; k++) parts.push({ x: x + (Math.random() - .5) * 14, y: y + 6, vx: (Math.random() - .5) * 0.02, vy: -0.01 - Math.random() * 0.02, life: 1400, max: 1400, c: '#8a8496', s: 2 });
      banner('突破失败', '道心受损，来日再战', '#ff8a8a');
    }
  }
  if (c.res.ok && c.t >= strikeEnd) {
    const k = Math.min(1, (c.t - strikeEnd) / 300) * Math.max(0, 1 - (c.t - strikeEnd - (c.res.ascend ? 2200 : 500)) / 400);
    const w = (c.res.ascend ? 18 : 10) * k;
    ctx.globalAlpha = 0.55 * k; R(x - w / 2, -OY, w, y + 16 + OY, '#fff1a8'); ctx.globalAlpha = 0.9 * k; R(x - w / 6, -OY, w / 3, y + 16 + OY, '#ffffff'); ctx.globalAlpha = 1;
  }
  if (c.t >= c.end) { const done = cine; cine = null; afterBreakthrough(done.res); }
}

// ---------- 音效 ----------
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
  reveal(t) { const base = [330, 392, 440, 523, 659, 784, 988][Math.max(0, Math.min(6, t))]; tone(base, 0, 0.15, 'square', 0.12); if (t >= 3) tone(base * 1.5, 0.1, 0.3, 'triangle', 0.14); if (t >= 5) [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.2 + i * 0.08, 0.3, 'triangle', 0.12)); },
  goal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.14, 'square', 0.1)); },
  hit() { noise(0, 0.08, 0.25, 2600); tone(180, 0, 0.06, 'square', 0.08); },
  slash() { tone(1400, 0, 0.05, 'sawtooth', 0.03); },
};
const SCALE = [0, 2, 4, 7, 9];
const MELODY = (() => {
  let s = 11; const rr = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let p = 7;
  for (let i = 0; i < 64; i++) { if (i % 8 === 7) { out.push(-1); continue; } p += Math.round((rr() - 0.5) * 4); p = Math.max(3, Math.min(12, p)); out.push(rr() < 0.18 ? -1 : p); }
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
    if (n >= 0) { const midi = 60 + 12 * Math.floor(n / 5) + SCALE[n % 5]; const f = 440 * Math.pow(2, (midi - 69) / 12); tone(f, t0, 0.9, 'triangle', 0.07, 'music'); tone(f * 2, t0, 0.25, 'sine', 0.02, 'music'); }
    if (musicStep % 8 === 0) { const root = [48, 45, 43, 50][(musicStep / 16 | 0) % 4]; tone(440 * Math.pow(2, (root - 69) / 12), t0, 2.4, 'sine', 0.06, 'music'); }
    musicStep++; musicNext += 0.42;
  }
}
setInterval(musicTick, 120);
document.addEventListener('pointerdown', () => ac(), true);
function setSoundIcon() { const b = $('#btnSound'); b.innerHTML = iconHTML(['note', 'sound', 'mute'][soundMode]); b.setAttribute('aria-label', ['声音：音乐与音效', '声音：仅音效', '声音：静音'][soundMode]); }

// ---------- 存档 ----------
const SAVE_KEY = 'xiantu_save_v2';
const PREF_KEY = 'xianmen_pref_v1';
function saveLocal() { if (!st) return; try { st.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* 无痕模式等 */ } }
function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearLocal() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function savePref() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ soundMode, speedIdx })); } catch (e) { /* ignore */ } }
function loadPref() { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (p.soundMode >= 0) soundMode = p.soundMode; if (p.speedIdx >= 0 && p.speedIdx < 3) speedIdx = p.speedIdx; } catch (e) { /* ignore */ } }
const cloud = { ref: null, busy: false, lastTick: -1 };
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
      if (remote && remote.v === 2 && (!st || ((remote.savedAt || 0) > (st.savedAt || 0) + 5000 && remote.tick !== st.tick))) offerCloud(remote);
    }
  } catch (e) { cloudStatus = '暂时无法连接'; }
}
async function saveCloud(force) {
  if (!cloud.ref || cloud.busy || !st) return;
  if (!force && st.tick === cloud.lastTick) return;
  cloud.busy = true;
  try {
    st.savedAt = Date.now();
    await cloud.ref.set({ json: JSON.stringify(st), savedAt: st.savedAt, v: 2 });
    cloud.lastTick = st.tick; cloudStatus = '已同步';
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
    body: `<p>云端有一份更新的存档：<br><b>${esc(remote.p.name)}</b> · ${esc(L.stageName(remote.p))} · 修仙第 ${Math.floor(remote.year) + 1} 年</p><p class="muted">读取后会替换当前进度。</p>`,
    foot: [{ t: '保留当前', alt: true, fn: closeModal }, { t: '读取云存档', fn: () => { closeModal(); loadState(remote); $('#intro').hidden = true; } }],
  });
  if (intro) go(); else pushPopup(go);
}
function loadState(s) {
  if (!s || s.v !== 2) return;
  st = s;
  st.flags = st.flags || {}; st.seenTips = st.seenTips || {}; st.beaten = st.beaten || {}; st.lifePills = st.lifePills || {}; st.lives = st.lives || [];
  if (!st.xs) { st.p.xp *= 10; st.xs = 10; } // 旧存档：修为数值放大了 10 倍
  lastExp = null;
  L.hook = onHook;
  ART.clearCache(); avCache.clear();
  adv = null; lastMode = st.exp ? 'adv' : 'home';
  renderFeed(); updateHUD();
}

// ---------- 逻辑事件 ----------
let feedDirty = true;
function onHook(type, data) {
  if (!st) return;
  if (type === 'log') feedDirty = true;
  else if (type === 'stageUp') { if (!st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 6, L.STAGES[st.p.s] + '↑', '#8ff5d0'); SFX.up(); }
  else if (type === 'ready') {
    const nxt = st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n;
    L.log(st, `修为圆满，可冲击${nxt}！`, 'gold');
  } else if (type === 'goal') { SFX.goal(); floatText(100, 60, data.rw ? `目标达成 灵石+${fmt(data.rw)}` : '目标达成', '#ffe39a'); }
  else if (type === 'promote') { L.log(st, `宗门贡献已足，可晋升${L.srankName(st, data)}！`, 'gold'); tip('promote', '宗门贡献够了，去【宗门】晋升身份吧！身份越高，俸禄越多，宝库能换的东西越好。'); }
}

// ---------- HUD ----------
let hudTimer = 0, achBusy = false;
function updateHUD() {
  if (!st) return;
  const p = st.p;
  $('#pName').textContent = (st.title ? '「' + st.title + '」' : '') + p.name + (st.sect ? ' · ' + L.srankName(st, st.sect.rank) : '');
  L.checkAchs(st);
  if (st.achQ.length && !achBusy) { const a = st.achQ.shift(); achBusy = true; banner('成就 · ' + a.n, '称号「' + a.t + '」'); SFX.goal(); setTimeout(() => { achBusy = false; }, 2600); }
  $('#date').textContent = `第${Math.floor(st.year) + 1}年`;
  $('#vStone').textContent = fmt(st.stones);
  $('#vPill').textContent = st.pills;
  $('#vLife').textContent = p.r >= 9 ? '不朽' : `${Math.floor(p.age)}/${fmt(L.lifespan(st))}`;
  $('#lifeBox').classList.toggle('low', p.r <= L.MAXR && L.desperate(st));
  $('#vRank').textContent = '第' + (rankShown || st.rank);
  $('#btnSpeed').textContent = SPEEDS[speedIdx] ? '×' + SPEEDS[speedIdx] : '暂停';
  $('#btnSpeed').classList.toggle('on', SPEEDS[speedIdx] === 0);
  const ready = L.isReady(st);
  $('#realm').textContent = L.stageName(p);
  const need = L.pNeed(p);
  if (p.r >= 9) $('#xpTxt').textContent = '已证大道';
  else if (ready) $('#xpTxt').textContent = `修为圆满 · 点此冲击${p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n}`;
  else if (st.exp) $('#xpTxt').textContent = `历练中 · ${L.REGIONS[st.exp.k].n}`;
  else $('#xpTxt').textContent = `修为 ${fmt(p.xp)} / ${fmt(need)}`;
  $('#sCul').textContent = '+' + fmt(L.gain(st));
  $('#sAtk').textContent = fmt(L.power(st));
  $('#sInc').textContent = '+' + fmt(L.income(st));
  const nb = L.nextBig(st), bb = $('#sBig');
  if (nb.k === 'pact') {
    $('#sBigK').textContent = `约战${nb.left}周天`;
    bb.textContent = '胜算 ' + L.pct(nb.info.p);
    bb.className = nb.info.p < 0.45 ? 'lo' : nb.info.p < 0.8 ? 'md' : 'hi';
  } else {
    $('#sBigK').textContent = nb.n;
    bb.textContent = nb.left + '周天后';
    bb.className = 'md';
  }
  $('#sBigBtn').classList.toggle('soon', nb.left <= 2);
  $$('#nav button').forEach(b => b.classList.toggle('locked', !!navLock(b.dataset.nav)));
  $('#xpFill').style.width = (p.r >= 9 ? 100 : Math.min(100, p.xp / need * 100)).toFixed(1) + '%';
  $('#cult').classList.toggle('ready', ready);
  $('#cult').classList.toggle('away', !!st.exp);
  const g = L.GOALS[st.goal];
  $('#goalTxt').textContent = g ? L.goalText(st, g) : '大道已成';
  $('#goalRw').textContent = g && g.rw ? '灵石+' + fmt(g.rw) : '';
  setBadge('exp', !st.exp && !ready && p.r < 9 ? '闲' : '');
  const gd = st.guide && st.guide.done;
  const rec = !gd || ready || p.r >= 9 ? '' : !st.exp ? 'exp' : st.stones >= L.hCost('array', st.home.array) ? 'home' : '';
  $$('#nav button').forEach(b => b.classList.toggle('hint', b.dataset.nav === rec));
  setBadge('home', L.HOME.some(b => st.home[b.k] < b.max && st.stones >= L.hCost(b.k, st.home[b.k])) ? '↑' : '');
  setBadge('sect', L.canPromote(st) ? '升' : '');
  setBadge('market', L.desperate(st) && (st.lifePills[p.r] || 0) < 3 ? '!' : '');
  if (feedDirty) renderFeed();
}
// 渐进解锁：一开始只给历练、洞府、人物，免得一上来不知道点哪
function navLock(nav) {
  if (!st || st.rebirth) return '';
  if (nav === 'market' && st.stats.exp < 1) return '坊市要等你先出去历练一趟、见过世面再说。先点【历练】。';
  if (nav === 'sect' && !st.sect && st.p.r < 1) return '宗门只收筑基修士。修为圆满后突破到筑基，三大宗门会上门抢人。';
  return '';
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
  updateHUD();
}
function pushPopup(fn) { queue.push(fn); processQueue(); }
function processQueue() {
  if (!$('#modal').hidden || cine || !$('#intro').hidden) return;
  const fn = queue.shift();
  if (fn) { fn(); return; }
  if (st && st.storyQ && st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) showChoice(ev); }
}
const bar = (v, gold) => `<div class="bar ${gold ? 'gold' : ''}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;

// ---------- 突破 ----------
let usePill = true;
function nextLife() { const p = st.p; return p.r < L.MAXR ? L.REALMS[p.r + 1].life * (1 + 0.05 * st.home.cave) * (L.has(st, 'longev') ? 1.5 : 1) + st.lifeBonus : 0; }
function showBreakthrough() {
  const p = st.p;
  if (!L.isReady(st)) return;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const trib = p.r >= L.MAXR ? 9 : L.REALMS[p.r + 1].trib;
  const render = () => {
    const pill = usePill && st.pills > 0;
    const rate = L.btRate(st, pill);
    const bits = [`基础 ${L.pct(L.REALMS[p.r].rate)}`];
    if (st.home.furnace) bits.push(`丹炉 +${st.home.furnace * 2}%`);
    if (p.fails) bits.push(`屡败屡战 +${p.fails * 12}%`);
    if (L.has(st, 'hero')) bits.push('主角光环 +10%');
    if (L.has(st, 'alch')) bits.push('丹道奇才 +15%');
    const sc = L.sectOf(st); if (sc && sc.bt) bits.push(`${sc.n} +${Math.round(sc.bt * 100)}%`);
    if (L.desperate(st)) bits.push('<span class="seal">绝境 +25%</span>');
    if (pill) bits.push('破境丹 +20%');
    if (st.flags.sureBt) bits.push('<span class="jadet">九转金丹：必定成功</span>');
    const body = `<div class="row">${myAvImg(66)}<div class="grow">
        <div>${esc(p.name)} · ${L.stageName(p)}</div>
        <div class="big seal">冲击${nxt}</div>
        <div class="muted">${trib ? `需渡 ${trib} 道雷劫` : '水到渠成，无需渡劫'}</div></div></div>
      <div class="center"><div class="muted">成功率</div><div class="big ${rate >= 0.7 ? 'jadet' : rate >= 0.4 ? 'goldt' : 'seal'}" style="font-size:calc(var(--fs)*3)">${L.pct(rate)}</div><div class="muted">${bits.join(' · ')}</div></div>
      <div class="check ${pill ? 'on' : ''}" id="pillChk" role="checkbox" aria-checked="${pill}"><span class="box"></span><span class="grow">服用破境丹 +20%</span><span class="muted">剩余 ${st.pills}</span></div>
      <div class="muted">失败不会身死：修为倒退三成、负伤两周天，下次成功率 +12%。${p.r < L.MAXR ? `成功后寿元增至 ${fmt(nextLife())} 年。` : ''}</div>`;
    const s = sheet({ title: p.r >= L.MAXR ? '飞升天劫' : '境界突破', body, foot: [{ t: '再准备一下', alt: true, fn: closeModal }, { t: trib ? '引动天劫' : '开始突破', gold: true, fn: go }] });
    const chk = s.querySelector('#pillChk');
    if (chk) chk.onclick = () => { if (st.pills <= 0) return; usePill = !usePill; SFX.tap(); render(); };
  };
  const go = () => {
    const res = L.breakthrough(st, usePill && st.pills > 0);
    if (res) startCine(res);
    closeModal();
  };
  render();
}
function afterBreakthrough(res) {
  const p = st.p;
  renderFeed();
  if (res.ascend && res.ok) { showAscension(); return; }
  if (res.ok) {
    const lines = [];
    lines.push(`<div class="center">${myAvImg(78)}</div>`);
    lines.push(`<div class="center big goldt">${L.REALMS[p.r].n}期！</div>`);
    lines.push(`<div class="center num">战力 ${fmt(res.before)} → <span class="seal">${fmt(res.after)}</span>（×${(res.after / res.before).toFixed(1)}）</div>`);
    lines.push(`<div class="center num">寿元 ${fmt(res.lifeBefore)} → <span class="jadet">${fmt(res.lifeAfter)}</span> 年</div>`);
    if (res.awaken) {
      lines.push('<div class="quote">戒中老祖：“小子，你以为你真是杂灵根？老夫封住你的灵根，就是为了今天！”</div>');
      lines.push(`<div class="center">灵根蜕变：${talentTag(res.awaken.from)} → ${talentTag(res.awaken.to)}</div>`);
      lines.push('<div class="center muted">修炼速度与战力暴涨！</div>');
      SFX.reveal(6);
    }
    sheet({ title: '突破成功', center: true, body: lines.join(''), foot: [{ t: '道法自然', gold: true, fn: closeModal }] });
  } else {
    sheet({
      title: '突破失败', center: true,
      body: `<div class="center">${myAvImg(78, undefined, 'filter:grayscale(.6)')}</div>
        <p class="center">冲击${res.ascend ? '飞升' : L.REALMS[res.from + 1].n}失败${L.has(st, 'steady') ? '，好在道心坚定，毫发无伤' : '，修为倒退，需静养两周天'}。</p>
        <p class="center seal">屡败屡战：下次成功率 +12%</p>`,
      foot: [{ t: '再接再厉', fn: closeModal }],
    });
  }
}

// ---------- 历练 ----------
function chipFor(p) { return `<span class="chip ${p >= 0.75 ? 'ok' : p >= 0.4 ? 'warn' : 'bad'}">${L.pct(p)}</span>`; }
function showExp() {
  const p = st.p;
  if (st.exp) {
    const e = st.exp, rg = L.REGIONS[e.k];
    sheet({ title: '历练中', body: `<div class="card flat"><div class="main"><div>【${rg.n}】</div><div class="muted">${rg.desc}</div>${bar((e.total - e.left) / e.total, true)}<div class="muted">还需 ${e.left} 周天归来</div></div></div><p class="muted">历练途中修炼减半，归来时结算收获。</p>` });
    return;
  }
  const rows = [];
  for (let k = L.REGIONS.length - 1; k >= 0; k--) {
    const rg = L.REGIONS[k];
    if (!L.unlocked(st, k)) { if (k === p.r + 3) rows.push(`<div class="card flat" style="opacity:.6"><div class="main"><div>${rg.n}</div><div class="muted">踏入${L.REALMS[Math.max(0, k - 2)].n}期后可前往</div></div><div class="right"><span class="chip">未解锁</span></div></div>`); continue; }
    const ch = L.expChance(st, k);
    if (L.bossReady(st, k)) { const B = L.BOSSES[k], bp = L.duelChance(L.power(st), L.bossPower(k)); rows.push(`<div class="card" data-boss="${k}" style="box-shadow:0 0 0 2px var(--seal)">${bossImg(k, 36)}<div class="main"><div class="seal">首领现身：${B.n}</div><div class="muted">“${B.line}” · 战力 ${fmt(L.bossPower(k))}</div><div class="muted">击败可得天材地宝、首领掉落【${B.drop}】与称号「${B.t}」</div></div><div class="right">${chipFor(bp)}</div></div>`); }
    const wins = st.regionWins[k] || 0;
    const prog = st.bosses[k] ? '<span class="chip ok">首领已斩</span>' : `<span class="chip">探索 ${Math.min(3, wins)}/3</span>`;
    rows.push(`<div class="card" data-k="${k}"><div class="main"><div class="line"><span>${rg.n}</span><span class="muted">${rg.mon} 周天</span>${prog}</div>
      <div class="muted">${rg.desc}</div><div class="muted num">推荐战力 ${fmt(L.DREC[k])} · 灵石约 ${fmt(L.DREW[k])}</div></div>
      <div class="right">${chipFor(ch.p)}${ch.ratio < 0.6 ? '<span class="seal">越级</span>' : ''}</div></div>`);
  }
  const s = sheet({ title: '外出历练', sub: `你的战力 ${fmt(L.power(st))} · 越级挑战成功奖励翻倍，失败负伤三周天`, body: rows.join('') });
  s.querySelectorAll('.card[data-k]').forEach(c => c.onclick = () => { SFX.tap(); confirmExp(+c.dataset.k); });
  s.querySelectorAll('.card[data-boss]').forEach(c => c.onclick = () => { SFX.tap(); fightBossUI(+c.dataset.boss); });
}
function fightBossUI(k) {
  const res = L.fightBoss(st, k);
  if (!res) return;
  const B = res.B;
  const it = res.item;
  duel({
    title: '首领 · ' + B.n, intro: `【${L.REGIONS[k].n}】深处，${B.n}挡住了去路。`,
    right: { img: bossImg(k, 66), name: B.n, sub: fmt(res.Q) }, Q: res.Q, S: res.S, win: res.win,
    quote: `${B.n}：“${B.line}”`,
    winText: res.win ? `斩杀${esc(B.n)}！获得称号「${esc(B.t)}」<div class="fxlist"><span>天材地宝 +${res.treasure}</span><span>灵石 +${fmt(res.stones)}</span><span>灵草 +${fmt(res.herbs)}</span><span>${it.equip ? '获得' : '已有更好法宝，换得灵石'}【${esc(it.name)}】</span></div>` : '',
    loseText: '首领太强，重伤而归（负伤 4 周天）。变强之后再来！',
    done: closeModal,
  });
}
function confirmExp(k) {
  const rg = L.REGIONS[k], ch = L.expChance(st, k);
  const yrs = rg.mon * L.REALMS[st.p.r].mpt;
  sheet({
    title: rg.n, center: true,
    body: `<p class="muted">${rg.desc}</p>
      <div class="center"><div class="muted">战力 ${fmt(ch.T)} / 推荐 ${fmt(L.DREC[k])}</div><div class="big ${ch.p >= 0.75 ? 'jadet' : ch.p >= 0.4 ? 'goldt' : 'seal'}" style="font-size:calc(var(--fs)*3)">${L.pct(ch.p)}</div>${ch.ratio < 0.6 ? '<div class="seal">越级挑战！成功则灵石翻倍</div>' : '<div class="muted">成功率</div>'}</div>
      <dl class="grid2"><dt>耗时</dt><dd>${rg.mon} 周天（约 ${yrs < 1 ? Math.round(yrs * 12) + ' 个月' : fmt(yrs) + ' 年'}）</dd><dt>可能收获</dt><dd>灵石、修为、破境丹、法宝、功法，运气好还能收服灵宠${st.sect ? '；并为宗门挣得贡献' : ''}</dd></dl>`,
    foot: [{ t: '返回', alt: true, fn: showExp }, { t: '御剑出发', gold: true, fn: () => { L.startExp(st, k); SFX.coin(); closeModal(); } }],
  });
}
function itemLine(it) {
  if (it.kind === 'pet') {
    const T0 = L.PETS[it.tier];
    return it.equip ? `<div class="quote">${petImg(it.tier, 26)} 收服${T0.n}【${esc(it.name)}】！战力 ×${T0.m}</div>` : `<div class="quote">遇到一只${esc(it.name)}，不如你的灵宠，放它归山，换得灵石 ${fmt(it.value)}</div>`;
  }
  const tierName = it.kind === 'w' ? L.WEAPONS[it.tier].n : L.ARTS[it.tier].n;
  const nm = it.kind === 'w' ? `${tierName}【${esc(it.name)}】` : `${tierName}功法《${esc(it.name)}》`;
  if (!it.equip) return `<div class="quote">得到${nm}，不如身上的，卖得灵石 ${fmt(it.value)}</div>`;
  return `<div class="quote">获得${nm}！${it.kind === 'w' ? `战力 ×${L.WEAPONS[it.tier].m}` : `修炼速度 ×${L.ARTS[it.tier].m}`}</div>`;
}
function deltaHTML(res) {
  const d = [];
  const arrow = (a, b) => (b > a ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (res.pw1 !== undefined && fmt(res.pw1) !== fmt(res.pw0)) d.push(`<dt>战力</dt><dd class="num">${fmt(res.pw0)} → <b>${fmt(res.pw1)}</b> ${arrow(res.pw0, res.pw1)}</dd>`);
  if (res.gain1 !== undefined && dec(res.gain1) !== dec(res.gain0)) d.push(`<dt>修炼/周天</dt><dd class="num">+${dec(res.gain0)} → <b>+${dec(res.gain1)}</b> ${arrow(res.gain0, res.gain1)}</dd>`);
  if (!st.pact && res.pw1 !== undefined) {
    const a = L.pactAssist(st), p0 = L.duelChance(res.pw0 * a, L.PACT_POWER), p1 = L.duelChance(res.pw1 * a, L.PACT_POWER);
    if (L.pct(p0) !== L.pct(p1)) d.push(`<dt>约战胜算</dt><dd class="num">${L.pct(p0)} → <b>${L.pct(p1)}</b> ${arrow(p0, p1)}</dd>`);
  }
  return d.length ? `<dl class="grid2 delta">${d.join('')}</dl>` : '';
}
function showExpResult(res) {
  lastExp = res;
  const rg = L.REGIONS[res.k];
  const lines = [`<div class="center">${myAvImg(52)}</div>`];
  if (res.ok) {
    lines.push(`<div class="center big ${res.leap ? 'seal' : 'goldt'}">${res.leap ? '越级挑战成功！' : '满载而归'}</div>`);
    lines.push(`<dl class="grid2"><dt>灵石</dt><dd class="num">+${fmt(res.stones)}${res.leap ? '（翻倍）' : ''}</dd><dt>修为</dt><dd class="num">+${fmt(res.xp)}</dd>${res.pills ? `<dt>破境丹</dt><dd>+${res.pills}</dd>` : ''}${res.herbs ? `<dt>灵草</dt><dd class="num">+${fmt(res.herbs)}</dd>` : ''}${res.treasure ? `<dt>天材地宝</dt><dd class="seal">+${res.treasure}</dd>` : ''}${res.contrib ? `<dt>宗门贡献</dt><dd class="num">+${fmt(res.contrib)}</dd>` : ''}</dl>`);
    for (const it of res.items) lines.push(itemLine(it));
    if (res.fortune) lines.push(`<div class="quote seal">奇遇！${esc(res.fortune)}</div>`);
    if (res.first) lines.push('<div class="quote">戒中老祖：“第一趟，老夫暗中替你挡了两爪子。以后可得靠你自己了。”</div>');
    lines.push(deltaHTML(res));
    SFX.coin();
  } else {
    lines.push('<div class="center big seal">铩羽而归</div>');
    lines.push(`<p class="center">敌人太强，负伤三周天（修炼减半、战力 ×0.6）。带回灵石 ${fmt(res.stones)}。</p><p class="center muted">提升战力后再来，或选更稳妥的地方。</p>`);
    SFX.fail();
  }
  const again = L.unlocked(st, res.k) && !L.isReady(st);
  sheet({ title: `历练归来 · ${rg.n}`, center: true, body: lines.join(''), foot: [{ t: '回洞府', alt: !!again, gold: !again, fn: closeModal }].concat(again ? [{ t: '再去一次', gold: true, fn: () => { L.startExp(st, res.k); closeModal(); } }] : []) });
}

// ---------- 洞府 ----------
const HOME_ICON = { cave: 'build', array: 'stone', field: 'stone', furnace: 'pill' };
function showHome() {
  const body = L.HOME.map(b => {
    const lv = st.home[b.k], max = lv >= b.max, c = max ? 0 : L.hCost(b.k, lv);
    return `<div class="card flat"><div style="flex:none">${iconHTML(HOME_ICON[b.k], 30)}</div><div class="main">
      <div class="line"><span>${b.n}</span><span class="chip">Lv ${lv}</span></div>
      <div class="muted">${b.d(lv)}</div>${max ? '' : `<div class="jadet">下一级：${b.d(lv + 1)}</div>`}</div>
      <div class="right"><button class="btn sm ${st.stones >= c && !max ? 'gold' : 'alt'}" data-k="${b.k}" ${max || st.stones < c ? 'disabled' : ''}>${max ? '已满级' : `${iconHTML('stone', 12)} ${fmt(c)}`}</button></div></div>`;
  }).join('');
  const alch = st.home.furnace ? `<button class="btn gold" id="btnAlch">炼丹房 · 灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure}</button>` : '<div class="muted">建造丹炉后可以炼丹（灵田和历练产出灵草）。</div>';
  const s = sheet({ title: '洞府', sub: `${L.caveName(st.home.cave)} · 灵石 ${fmt(st.stones)} · 每周天 +${fmt(L.income(st))}<br>灵石花在这里最值：聚灵阵加修炼速度，灵田产灵石灵草，丹炉出丹药，洞府加寿元。`, body: alch + body });
  const ab = s.querySelector('#btnAlch'); if (ab) ab.onclick = () => { SFX.tap(); showAlchemy(); };
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    if (L.upgrade(st, btn.dataset.k)) {
      SFX.coin();
      const pos = { cave: [100, 60], array: [100, 128], field: [22, 110], furnace: [166, 112] }[btn.dataset.k];
      floatText(pos[0], pos[1], `Lv${st.home[btn.dataset.k]}`, '#ffe39a');
      showHome();
    }
  });
}

// ---------- 坊市 ----------
function showMarket() {
  const p = st.p;
  const body = L.MARKET.map(m => {
    const c = L.price(st, m.k);
    const note = m.k === 'life' ? ` · 本境界已服 ${st.lifePills[p.r] || 0}/3` : '';
    const dis = st.stones < c || (m.k === 'life' && (st.lifePills[p.r] || 0) >= 3);
    const ic = { pill: 'pill', life: 'life', box: 'bag', egg: 'pet' }[m.k];
    return `<div class="card flat"><div style="flex:none">${iconHTML(ic, 30)}</div><div class="main"><div>${m.n}</div><div class="muted">${m.d}${note}</div></div>
      <div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-k="${m.k}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(c)}</button></div></div>`;
  }).join('');
  const s = sheet({ title: '坊市', sub: `灵石 ${fmt(st.stones)} · 价格随境界上涨`, body: body + `<div class="muted">当前：法宝 ${p.w ? L.WEAPONS[p.w].n : '无'} · 功法 ${L.ARTS[p.a].n} · 灵宠 ${p.pet ? L.PETS[p.pet.tier].n : '无'}</div>` });
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    const r = L.buy(st, btn.dataset.k);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, showMarket);
    else { floatText(100, 80, r.k === 'life' ? `寿元 +${r.add} 年` : '破境丹 +1', r.k === 'life' ? '#8ff5d0' : '#ffe39a'); showMarket(); }
  });
}
function revealItem(it, back) {
  const tierOf = it.kind === 'pet' ? it.tier : it.kind === 'w' ? Math.min(6, it.tier - 1) : it.tier;
  const colors = ['#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff', '#ffcf3f', '#ff7a7a'];
  const col = colors[Math.max(0, Math.min(6, tierOf))];
  const img = it.kind === 'pet' ? petImg(it.tier, 44) : `<img class="px" src="${iconURL[it.kind === 'w' ? 'sword' : 'bag']}" style="width:44px;height:44px" alt="">`;
  const s = sheet({
    title: it.kind === 'pet' ? '灵兽破壳' : '寻宝', center: true, noClose: true,
    body: `<div class="cands" style="grid-template-columns:1fr;max-width:160px;margin:0 auto"><div class="cand hide"><div class="beam" style="background:${col}"></div>${img}<div class="cover">？</div></div></div>${itemLine(it)}`,
    foot: [{ t: '收下', gold: true, fn: back || closeModal }],
  });
  setTimeout(() => { const c = s.querySelector('.cand'); if (!c) return; c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(tierOf); if (tierOf >= 5) flash(0.4); }, 450);
}

// ---------- 宗门 ----------
function showSect() {
  const p = st.p;
  if (!st.sect) {
    sheet({ title: '宗门', body: `<p>你如今是一介散修。当年被天剑宗逐出山门，天下宗门都瞧不上一个杂灵根。</p>
      <div class="quote">戒中老祖：“急什么。等你筑基，那些宗门自会八抬大轿来请你。”</div>
      <p class="muted">${p.r >= 1 ? `下一次宗门招揽：约 ${Math.max(0, (st.flags.inviteAt || 0) - st.tick)} 周天后` : '突破至筑基期后，三大宗门会前来招揽。'}</p>` });
    return;
  }
  const sc = L.sectOf(st), sr = st.sect.rank, nx = L.SRANKS[sr + 1];
  let promo;
  if (nx) {
    const okR = p.r >= nx.r, okC = st.sect.total >= nx.c;
    promo = `<div class="card flat"><div class="main"><div>晋升 ${L.srankName(st, sr + 1)}</div>
      <div class="${okR ? 'jadet' : 'muted'}">${okR ? '✓' : '·'} 境界达到${L.REALMS[nx.r].n}期</div>
      <div class="${okC ? 'jadet' : 'muted'}">${okC ? '✓' : '·'} 累计贡献 ${fmt(st.sect.total)} / ${fmt(nx.c)}</div>${bar(st.sect.total / nx.c, okC)}
      ${nx.duel ? `<div class="seal">需当众击败原${L.srankName(st, sr + 1)}</div>` : ''}</div>
      <div class="right"><button class="btn sm ${L.canPromote(st) ? 'gold' : 'alt'}" id="btnPromo" ${L.canPromote(st) ? '' : 'disabled'}>晋升</button></div></div>`;
  } else promo = '<div class="quote">你已是一宗之主，号令一方。</div>';
  const vault = L.VAULT.map(v => {
    const c = L.vaultCost(st, v.k), tier = L.vaultTier(st, v.k);
    const desc = v.k === 'vart' ? `${L.ARTS[tier].n}功法 · 修炼×${L.ARTS[tier].m}` : v.k === 'vwep' ? `${L.WEAPONS[tier].n} · 战力×${L.WEAPONS[tier].m}` : v.d;
    const owned = (v.k === 'vart' && p.a >= tier) || (v.k === 'vwep' && p.w >= tier);
    const dis = owned || st.sect.pts < c;
    return `<div class="card flat"><div class="main"><div>${v.n}</div><div class="muted">${desc}${owned ? '（已有更好的）' : ''}</div></div><div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-v="${v.k}" ${dis ? 'disabled' : ''}>贡献 ${fmt(c)}</button></div></div>`;
  }).join('');
  const ranks = L.SRANKS.map((r0, i) => `<span class="chip ${i === sr ? 'ok' : ''}" style="${i > sr ? 'opacity:.5' : ''}">${L.srankName(st, i)}</span>`).join(' ');
  const s = sheet({
    title: sc.n, sub: `${sc.d} · 宗门加成：${sc.perk}`,
    body: `<div style="display:flex;flex-wrap:wrap;gap:4px">${ranks}</div>
      <dl class="grid2"><dt>身份</dt><dd>${L.srankName(st, sr)}</dd><dt>俸禄</dt><dd class="num">每周天 ${fmt(L.pay(st))} 灵石${sc.pill ? '，每 6 周天一枚破境丹' : ''}</dd><dt>可用贡献</dt><dd class="num">${fmt(st.sect.pts)}</dd></dl>
      ${promo}<div class="sep"></div>${nineHTML()}<div class="sep"></div><div class="muted">宗门宝库（用贡献兑换）</div>${vault}
      <div class="muted">历练成功、天骄论道获胜都能为宗门挣得贡献。${st.flags.warWon ? '你曾一人一剑击退天剑宗，威震四方。' : ''}</div>`,
  });
  const pb = s.querySelector('#btnPromo');
  if (pb) pb.onclick = () => { SFX.tap(); doPromote(); };
  s.querySelectorAll('button[data-v]').forEach(btn => btn.onclick = () => { const r = L.vaultBuy(st, btn.dataset.v); if (!r) return; SFX.coin(); if (r.it) revealItem(r.it, showSect); else { floatText(100, 80, '破境丹 +2', '#ffe39a'); showSect(); } });
}
function nineHTML() {
  const pos = L.sectPos(st);
  const next = 24 - ((st.tick - 6) % 24 + 24) % 24 || 24;
  const rows = st.sect.order.map((id, i) => {
    const N = L.NINE.find(x => x.id === id), me = id === st.sect.id;
    return `<div class="${me ? 'me' : ''}"><b>第${i + 1}</b><span>${N.n}${me ? '（本宗）' : ` · ${N.champ}`}</span><span class="num">${me ? fmt(L.power(st)) : fmt(L.ninePower(st, i + 1))}</span></div>`;
  }).join('');
  return `<div class="muted">天下九宗（九宗会武每 24 周天一届，你代表本宗出战）</div>
    <dl class="grid2"><dt>宗门排名</dt><dd>天下第 ${pos} 宗 · 最高第 ${st.sect.best}</dd><dt>灵脉</dt><dd>${st.sect.veins || 0} 条（俸禄 +${(st.sect.veins || 0) * 25}%）</dd><dt>下届会武</dt><dd>约 ${next} 周天后</dd></dl>
    <div class="ladder">${rows}</div>`;
}
const NINE_LOOK = { kunlun: 'yun', tianjian: 'chu', xuesha: 'xue' };
function runSectMeet() {
  const res = L.sectMeet(st);
  if (!res) return;
  const sc = L.sectOf(st);
  let step = -1;
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({ title: `第${res.n}届 九宗会武`, center: true, noClose: true,
        body: `<p class="center">天下九宗齐聚问剑台，以武论高下，排定宗门座次！</p><div class="center">${myAvImg(52)}</div><p class="center">你代表 <b>${sc.n}</b> 出战 · 当前天下第 ${res.start} 宗</p>`,
        foot: [{ t: '为宗门而战！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const look = NINE_LOOK[rd.foe.id];
    const tj = rd.foe.id === 'tianjian';
    duel({
      title: `会武 · 对阵${rd.foe.n}`,
      right: { img: rivalAvImg(look ? { n: rd.foe.champ, id: look } : { n: rd.foe.champ }, 66), name: rd.foe.champ, sub: `${rd.foe.n} · 天下第${rd.q}宗 · ${fmt(rd.Q)}` }, Q: rd.Q, S: res.S, win: rd.win,
      quote: `${rd.foe.champ}：“${rd.foe.line}”`,
      winText: `${rd.defend ? '卫冕天下第一宗' : `${esc(sc.n)}升至天下第 ${rd.q} 宗`} · 贡献 +${fmt(rd.contrib || 0)} · 灵石 +${fmt(rd.stones || 0)}${tj && st.flags.beatTianjian === 1 ? '<div class="quote">天剑宗众长老面如土色——当年被一脚踢下山的弃徒，如今代表' + esc(sc.n) + '把天剑宗踩在了脚下！</div>' : ''}`,
      loseText: '对方底蕴深厚，下届会武再来！',
      btn: res.rounds[step] ? '下一场' : '会武落幕',
      done: next,
    });
  };
  const summary = () => {
    const up = res.start - res.end;
    if (res.end === 1 && res.start > 1) banner('天下第一宗', sc.n);
    else if (up > 0) banner(`宗门 ↑${up}`, `天下第 ${res.end} 宗`);
    sheet({ title: '会武落幕', center: true,
      body: `<div class="center big ${up > 0 ? 'goldt' : ''}">天下第 ${res.end} 宗</div><p class="center">${up > 0 ? `${esc(sc.n)}从第 ${res.start} 升至第 ${res.end}！` : res.end === 1 ? `${esc(sc.n)}稳坐天下第一宗！` : '座次未变，下届再战。'}</p>${res.end === 1 && res.start > 1 ? `<div class="quote">九宗俯首。从今日起，${esc(sc.n)}便是天下第一宗！</div>` : ''}<p class="center muted">宗门排名越高，俸禄越多。</p>`,
      foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
  };
  next();
}
function doPromote() {
  const sc = L.sectOf(st);
  const before = st.sect.rank;
  const res = L.promote(st);
  if (!res) return;
  const title = L.srankName(st, before + 1);
  const celebrate = () => {
    banner('晋升' + title, sc.n);
    SFX.win();
    sheet({ title: '晋升', center: true, body: `<div class="center">${myAvImg(66)}</div><div class="center big goldt">${title}</div>
      <p class="center">${sc.n}钟声九响，全宗弟子齐聚广场。从今日起，你便是${sc.n}${title}！</p><p class="center muted">俸禄提升至每周天 ${fmt(L.pay(st))} 灵石，宗门宝库开放更高品阶。</p>`,
      foot: [{ t: '谢宗门栽培', gold: true, fn: closeModal }] });
  };
  if (res.duel) {
    const heir = { n: st.p.look.f ? '原圣女·苏清寒' : '原圣子·萧凌风' };
    duel({
      title: `${title}之争`, intro: `你要晋升${title}的消息传出，原${title}当众拦下：“想坐我的位置？先过我这一关！”`,
      right: { img: rivalAvImg(heir, 66), name: heir.n, sub: fmt(res.duel.Q) }, Q: res.duel.Q, win: res.duel.win,
      quote: `${heir.n}：“一个半路入门的散修，也配当${title}？”`,
      winText: `${esc(heir.n)}面如死灰，长剑落地。全场鸦雀无声，随后掌声雷动！`, loseText: '你惜败一招。来日修为更进一步，再来挑战！',
      done: () => { if (res.ok) celebrate(); else closeModal(); },
    });
  } else celebrate();
}
function showInvite() {
  const s = sheet({
    title: '三宗争徒', center: true, noClose: true,
    body: `<p>筑基消息传出，天下震动！三大宗门的长老同时登门，争相招揽：</p>
      <div class="cands">${L.SECTS.map((sc, i) => `<div class="cand" data-i="${i}" style="padding:10px 6px"><div class="beam" style="background:${sc.color}"></div><div class="nm" style="color:${sc.color}">${sc.n}</div><div class="tr">${sc.perk}</div></div>`).join('')}</div>
      <div id="inv" class="muted center">点选一个宗门</div>
      <div class="quote">戒中老祖：“当年天剑宗把你踢下山，如今人家抢着要你。痛快不痛快？”</div>`,
    foot: [{ t: '暂不入宗', alt: true, fn: () => { L.log(st, '婉拒了三大宗门的招揽，继续做逍遥散修'); closeModal(); } }, { t: '拜入此宗', gold: true, disabled: true, fn: () => {} }],
  });
  const ok = s.querySelector('[data-fi="1"]');
  s.querySelectorAll('.cand').forEach(c => c.onclick = () => {
    const sc = L.SECTS[+c.dataset.i]; SFX.tap();
    s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', x === c));
    s.querySelector('#inv').textContent = `${sc.n}：${sc.d}。加成：${sc.perk}`;
    ok.disabled = false;
    ok.onclick = () => { SFX.win(); L.joinSect(st, sc.id); closeModal(); banner('拜入' + sc.n, '外门弟子'); };
  });
}
function runWar() {
  const res = L.sectWar(st);
  const sc = L.sectOf(st);
  duel({
    title: '天剑宗来犯', intro: `天剑宗长老率众杀上${sc.n}山门，扬言要讨回当年那个弃徒！`,
    right: { img: rivalAvImg({ n: '天剑宗长老团', id: 'zhao' }, 66), name: '天剑宗长老团', sub: fmt(res.Q) }, Q: res.Q, win: res.win,
    quote: '天剑宗长老：“交出那个弃徒，饶你们满门不死！”',
    winText: `你一人一剑立于山门之前，剑光过处，天剑宗众人倒飞而出！<br>宗门贡献 +${fmt(res.contrib || 0)}，灵石 +${fmt(res.stones || 0)}`,
    loseText: '宗门众长老联手苦战，方才逼退来敌。天剑宗扬言还会再来……',
    done: closeModal,
  });
}

// ---------- 对决（通用） ----------
function duel(o) {
  const S = o.S || L.power(st);
  const p = L.duelChance(S, o.Q);
  const s = sheet({
    title: o.title, center: true, noClose: true,
    body: `${o.intro ? `<p>${o.intro}</p>` : ''}<div class="vs"><div class="side">${myAvImg(66).replace('<img ', '<img id="vsL" ')}<div>${esc(st.p.name)}</div><div class="muted num">${fmt(S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${o.right.img}<div>${esc(o.right.name)}</div><div class="muted num">${esc(o.right.sub)}</div></div></div>
      ${o.quote ? `<div class="quote">${esc(o.quote)}</div>` : ''}
      <div class="muted center">胜算 ${L.pct(p)}</div>
      <div id="vsRes" class="center" style="min-height:3em"></div>`,
    foot: [{ t: '……', alt: true, disabled: true, fn: () => o.done() }],
  });
  const l = s.querySelector('#vsL'), r = s.querySelector('#vsR');
  if (l) l.classList.add('clashL'); if (r) r.classList.add('clashR');
  let hits = 0; const hi = setInterval(() => { SFX.hit(); if (++hits >= 3) clearInterval(hi); }, 330);
  setTimeout(() => {
    const box = s.querySelector('#vsRes'), btn = s.querySelector('[data-fi="0"]');
    if (!box) return;
    box.innerHTML = o.win ? `<div class="big goldt">胜！</div><div>${o.winText}</div>` : `<div class="big seal">败</div><div>${o.loseText}</div>`;
    if (o.win) SFX.win(); else SFX.fail();
    btn.disabled = false; btn.textContent = o.btn || '继续'; btn.classList.remove('alt'); btn.classList.add('gold');
  }, 1150);
}

// ---------- 三年之约 ----------
function runPact() {
  const res = L.pactDuel(st);
  const ex = st.exName;
  duel({
    title: '三年之约', intro: '三年之期已到。落霞城擂台下人山人海，都来看那个被退婚的“废物”如何收场。' + (res.assist ? `<br><span class="jadet">戒中老祖借你一缕神魂：战力 ${fmt(res.base)} ×${L.PACT_ASSIST} = ${fmt(res.S)}</span>` : ''),
    right: { img: rivalAvImg({ n: ex, id: 'mu' }, 66), name: ex, sub: fmt(res.Q) }, Q: res.Q, S: res.S, win: res.win,
    quote: `${ex}：“三年了，废物终究是废物。现在认输，我还能给你留几分颜面。”`,
    winText: `${res.assist ? '危急关头，戒指中涌出一股浩瀚之力！<br>' : ''}一招落定，${esc(ex)}倒退十余步，满城哗然！<br>“莫欺少年穷！今日之后，你我再无瓜葛。”<br>灵石 +${fmt(res.stones || 0)}`,
    loseText: `${esc(ex)}冷笑离去。你攥紧拳头：天骄榜上，我们再见分晓！`,
    done: closeModal,
  });
}

// ---------- 天骄论道 ----------
const TAUNTS = ['区区散修，也敢上论道台？', '今日便让你知道天高地厚！', '哼，不自量力。', '我宗天骄，岂是你能比的？', '早点认输，免得丢人现眼。'];
const SHOCK = ['这……这不可能！', '台下一片哗然！', '对面师长脸色铁青。', '观战众人倒吸一口凉气！'];
const RIVAL_LINES = {
  mu: ['废物，三年过去，你还是废物。', '怎……怎么可能？当年那个废物……'],
  zhao: ['当年一脚把你踢下山，今天照样！', '师……师弟，当年是师兄有眼无珠！'],
  chu: ['天剑宗圣子，岂是你这弃徒能挑战的？', '我楚天阔……竟输给一个弃徒？！'],
  xue: ['正道蝼蚁，也配让本圣子出手？', '此人……不可力敌，撤！'],
  yun: ['我在榜首等你很久了。来吧。', '好剑。天下第一，是你的了。'],
};
function runTournament() {
  const res = L.tournament(st);
  rankShown = res.startRank;
  let step = -1;
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({ title: `第${res.n}届 天骄论道`, center: true, noClose: true,
        body: `<p class="center">天下天骄齐聚论道台，以战论道，排定天骄榜！</p>${res.n === 1 ? '<div class="quote">天骄论道每 12 周天一届，会自动开打：你按战力去挑战榜上的对手，赢了就顶替对方的名次。宿敌们都在榜上。</div>' : ''}<div class="center">${myAvImg(52)}</div><p class="center num">战力 ${fmt(res.S)} · 当前天骄榜第 ${res.startRank}</p>`,
        foot: [{ t: '登台！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const rv = rd.rv || { n: '无名', s: '' };
    const lines = rv.id ? RIVAL_LINES[rv.id] : null;
    duel({
      title: `第 ${step} 战`,
      right: { img: rivalAvImg(rv, 66), name: rv.n, sub: `${rv.s} · 第${rd.q}名 · ${fmt(rd.P)}` }, Q: rd.P, S: res.S, win: rd.win,
      quote: `${rv.n}：“${lines ? lines[0] : TAUNTS[(step + res.n) % TAUNTS.length]}”`,
      winText: `${rd.defend ? '卫冕天骄榜第一' : `排名升至第 ${rd.q}`} · 灵石+${fmt(rd.stones || 0)}${rd.contrib ? ` · 贡献+${fmt(rd.contrib)}` : ''}${lines && rd.first ? `<div class="quote">${esc(rv.n)}：“${esc(lines[1])}”</div>` : rd.P > res.S * 0.9 ? `<div class="muted">${SHOCK[step % SHOCK.length]}</div>` : ''}`,
      loseText: '对手底蕴深厚，来日再战。',
      btn: res.rounds[step] ? '下一战' : '论道落幕',
      done: () => { if (rd.win && !rd.defend) rankShown = rd.q; next(); },
    });
  };
  const summary = () => {
    const up = res.startRank - res.endRank;
    rankShown = 0;
    if (up > 0) banner(`天骄榜 ↑${up}`, `第 ${res.endRank} 名`);
    sheet({ title: '论道落幕', center: true,
      body: `<div class="center big ${up > 0 ? 'goldt' : ''}">天骄榜第 ${res.endRank}</div><p class="center">${up > 0 ? `排名 ${res.startRank} → ${res.endRank}，上升 ${up} 位！` : res.endRank === 1 ? '稳坐天骄榜第一！' : '排名未变，下届再战。'}</p>
        ${res.endRank === 1 && res.startRank > 1 ? `<div class="quote">四海天骄俯首，${esc(st.p.name)}，天下第一！</div>` : ''}`,
      foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
  };
  next();
}

// ---------- 奇遇事件（选项） ----------
function speakerImg(ev, w) {
  const spk = ev.speaker || ev.npc;
  if (spk === 'elder') return `<img class="px" src="${ELDER}" style="width:${w}px;height:${w}px" alt="">`;
  if (spk && L.NPCS[spk]) return npcAvImg(spk, w);
  return myAvImg(w);
}
function showChoice(ev) {
  if (!ev || !st) return;
  const spk = ev.speaker || ev.npc;
  const who = spk && L.NPCS[spk] ? `<div class="seal">${esc(L.npcName(st, spk))} <span class="muted">${L.NPCS[spk].title}${L.met(st, spk) ? ' · 好感 ' + L.aff(st, spk) : ''}</span></div>` : spk === 'elder' ? '<div class="seal">戒中老祖</div>' : '';
  const luck = L.choiceLuck(st);
  const btns = ev.choices.map((c, i) => {
    const can = L.costOk(st, c.cost);
    const bits = [];
    if (c.cost) bits.push(L.costText(st, c.cost));
    if (c.duel) bits.push('胜算 ' + L.pct(L.duelChance(1, c.duel)));
    else if (c.p !== undefined) bits.push('把握 ' + L.pct(Math.min(0.95, c.p + luck)));
    return `<button class="btn ${i === 0 ? 'gold' : 'alt'}" data-c="${i}" ${can ? '' : 'disabled'}><span>${esc(L.fill(st, c.t))}</span><small>${esc(bits.join(' · '))}</small></button>`;
  }).join('');
  const s = sheet({
    title: (ev.where === 'story' ? '<span class="story-tag">主线</span>' : '') + esc(L.fill(st, ev.title)), center: true, noClose: true,
    body: `<div class="speaker">${speakerImg(ev, 56)}<div class="grow">${who}<p style="margin:4px 0 0">${esc(L.fill(st, ev.text))}</p></div></div><div class="choices">${btns}</div>`,
  });
  SFX.reveal(ev.where === 'story' ? 4 : 2);
  s.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => {
    SFX.tap();
    const res = L.resolveChoice(st, ev, +b.dataset.c);
    if (!res) return;
    const chips = res.fx.length ? `<div class="fxlist">${res.fx.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : '';
    if (res.fx.talent) { flash(0.6); SFX.reveal(6); }
    if (res.duel) {
      duel({ title: L.fill(st, ev.title), right: { img: rivalAvImg({ n: ev.id }, 66), name: '对手', sub: fmt(res.duel.Q) }, Q: res.duel.Q, S: res.duel.S, win: res.duel.win,
        winText: esc(res.text) + chips, loseText: esc(res.text) + chips, done: closeModal });
      return;
    }
    if (res.hasRisk) { if (res.ok) SFX.win(); else SFX.fail(); } else SFX.coin();
    sheet({ title: esc(L.fill(st, ev.title)), center: true, noClose: true,
      body: `<div class="speaker">${speakerImg(ev, 44)}<p class="grow" style="margin:0">${esc(res.text)}</p></div>${chips}`,
      foot: [{ t: '继续', gold: true, fn: closeModal }] });
  });
}

// ---------- 炼丹 ----------
function showAlchemy() {
  const rate = L.alchRate(st);
  const body = L.RECIPES.map(rc => {
    const why = L.canCraft(st, rc.k);
    const cost = `灵草 ${fmt(L.herbCost(st, rc))}${rc.treasure ? ` · 天材地宝 ${rc.treasure}` : ''}`;
    return `<div class="card flat"><div style="flex:none">${iconHTML('pill', 28)}</div><div class="main"><div>${rc.n}</div><div class="muted">${rc.d}</div><div class="muted">${cost}${why ? ` · <span class="seal">${why}</span>` : ''}</div></div>
      <div class="right"><button class="btn sm ${why ? 'alt' : 'gold'}" data-r="${rc.k}" ${why ? 'disabled' : ''}>炼制</button></div></div>`;
  }).join('');
  const s = sheet({ title: '炼丹房', sub: `灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure} · 成丹率 ${L.pct(rate)}${L.friend(st, 'ge') ? '（葛老指点）' : ''}`, body: body + '<div class="muted">灵田每周天产灵草，历练和奇遇也能得到。天材地宝来自地图首领与稀有机缘。成丹分下、中、上、极品四等。</div>' });
  s.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => {
    const res = L.craft(st, b.dataset.r);
    if (!res) return;
    SFX.gather();
    const s2 = sheet({ title: '开炉炼丹', center: true, noClose: true, body: `<div class="center"><div class="clashL" style="display:inline-block">${iconHTML('pill', 56)}</div></div><p class="center muted">丹炉火起，药香弥漫……</p>` });
    setTimeout(() => {
      if (!res.ok) { SFX.fail(); sheet({ title: '炸炉了', center: true, body: `<p class="center">轰的一声，${res.n}没炼成，灵草化为飞灰。</p><p class="center muted">提升丹炉等级、与葛老交好，成丹率更高。</p>`, foot: [{ t: '再来', gold: true, fn: showAlchemy }] }); return; }
      const q = L.QUAL[res.q];
      if (res.q === 3) { flash(0.6); SFX.reveal(6); banner('丹纹九现', '极品' + res.n); } else SFX.win();
      sheet({ title: '丹成', center: true, body: `<div class="center">${iconHTML('pill', 44)}</div><div class="center big ${res.q === 3 ? 'goldt' : res.q === 2 ? 'jadet' : ''}">${q.n}${res.n}</div>${res.q === 3 ? '<p class="center seal">丹成之时，九道丹纹浮现，异香百里！</p>' : ''}<div class="fxlist"><span>${esc(res.fx)}</span></div>`, foot: [{ t: '继续炼丹', gold: true, fn: showAlchemy }] });
    }, 1100);
    void s2;
  });
}

// ---------- 变强之道（数值拆解） ----------
function showGrowth(focus) {
  const p = st.p, B = L.breakdown(st);
  const mx = v => (v >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, '');
  const upBtn = k => { const b = L.HOME.find(x => x.k === k), lv = st.home[k]; if (lv >= b.max) return '<span class="muted">满级</span>'; const c = L.hCost(k, lv); return `<button class="btn sm ${st.stones >= c ? 'gold' : 'alt'}" data-up="${k}" ${st.stones >= c ? '' : 'disabled'}>升级 ${fmt(c)}</button>`; };
  const goBtn = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const row = (n, m, act, tip) => `<div class="grow-row"><span class="gn">${esc(n)}</span><span class="gm ${m < 1 ? 'low' : ''}">${typeof m === 'number' ? '×' + mx(m) : m}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const act = { talent: () => goBtn('洗髓丹', 'alch'), art: () => goBtn('去寻宝', 'market'), array: () => upBtn('array'), weapon: () => goBtn('去历练', 'exp'), pet: () => goBtn('灵兽蛋', 'market'), field: () => upBtn('field'), sect: () => goBtn('宗门', 'sect') };
  const tips = {
    talent: '灵根是天生的，炼丹房的洗髓丹能提升一品（需要天材地宝）。',
    art: '功法来自历练掉落、坊市寻宝、宗门宝库，越高阶修炼越快。',
    array: `下一级 ×${mx(L.arrayMult(st.home.array + 1))}，灵石最该花在这里。`,
    weapon: '法宝来自历练掉落、首领、坊市寻宝、宗门宝库。',
    pet: '灵宠来自坊市灵兽蛋、历练与奇遇。',
    field: `下一级每周天 ${fmt(L.fieldInc(st.home.field + 1))} 灵石，还产灵草。`,
  };
  const sec = (key, title, total, baseName, base, parts, extra) => `<div class="grow-sec" id="g-${key}"><h3>${title}<span>${total}</span></h3>
    ${baseName ? row(baseName, fmt(base), '', '') : ''}${parts.map(([n, m, k]) => row(n, m, k && act[k] ? act[k]() : '', k && tips[k] ? tips[k] : '')).join('')}${extra || ''}</div>`;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const bt = L.btRate(st, st.pills > 0);
  const body = [
    `<div class="muted">每项数值 = 基础 × 各项加成。点右边的按钮直接去提升。</div>`,
    sec('cul', '修炼速度', '+' + fmt(B.gain) + ' /周天', '境界基础（' + L.stageName(p) + '）', B.baseCul, B.cul,
      row('运功吐纳', `${st.tunaLeft === undefined ? L.TUNA_MAX : st.tunaLeft}/${L.TUNA_MAX}`, '', '点画面里的自己，每次额外 +10% 周天修为，每周天 12 次。')),
    sec('atk', '战力', fmt(B.power), '境界基础（' + L.stageName(p) + '）', B.baseAtk, B.atk,
      row('突破大境界', '大幅', '', '每升一个大境界，战力翻好几倍。战力决定历练成功率、论道和会武胜负。')),
    sec('inc', '灵石收入', '+' + fmt(B.income) + ' /周天', '', 0, B.inc.map(([n, v, k]) => [n, '+' + fmt(v), k]),
      row('历练', '大头', goBtn('去历练', 'exp'), '历练带回的灵石远比每周天收入多。') + (st.sect ? '' : row('宗门俸禄', '未入宗', '', '筑基后拜入宗门，每周天领俸禄。'))),
    `<div class="grow-sec" id="g-bt"><h3>冲击${nxt}成功率<span>${L.pct(bt)}</span></h3>
      ${row('境界基础', L.pct(L.REALMS[Math.min(p.r, 8)].rate), '', '')}
      ${row('丹炉 Lv' + st.home.furnace, '+' + st.home.furnace * 2 + '%', upBtn('furnace'), '每级 +2%，还会自动炼出破境丹。')}
      ${row('破境丹 ×' + st.pills, st.pills ? '+20%' : '无', goBtn('去买', 'market'), '突破时服一枚 +20%。坊市、历练、丹炉都能得到。')}
      ${p.fails ? row('屡败屡战', '+' + p.fails * 12 + '%', '', '') : ''}</div>`,
    `<div class="grow-sec" id="g-life"><h3>寿元<span>${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</span></h3>
      ${row('洞府 Lv' + st.home.cave, '+' + st.home.cave * 5 + '%', upBtn('cave'), '洞府每级寿元 +5%。')}
      ${row('延寿丹', '+10%', goBtn('去买', 'market'), '每个大境界最多三枚。')}
      ${row('突破大境界', '翻倍', '', '境界越高寿元越长。寿元耗尽会坐化转世。')}</div>`,
  ].join('<div class="sep"></div>');
  const s = sheet({ title: '变强之道', sub: `灵石 ${fmt(st.stones)} · 破境丹 ${st.pills} · 灵草 ${fmt(st.herbs)}`, body });
  s.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { if (L.upgrade(st, b.dataset.up)) { SFX.coin(); showGrowth(focus); } });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.go; if (k === 'alch') { if (st.home.furnace) showAlchemy(); else showHome(); } else GO[k](); });
  if (focus && focus !== 'all') { const el = s.querySelector('#g-' + focus); if (el) el.scrollIntoView({ block: 'start' }); }
}
$('#stats').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b || !st || cine) return; ac(); SFX.tap(); if (b.dataset.s === 'big') showBig(); else showGrowth(b.dataset.s); });
function showBig() {
  const nb = L.nextBig(st);
  if (nb.k === 'tour') { showMe('rank'); return; }
  if (nb.k === 'meet') { showSect(); return; }
  showPact();
}
// 三年之约：双方数值摆在明面上，外加老祖锦囊（每条都写清楚能涨多少）
function showPact() {
  const pi = L.pactInfo(st), p = st.p;
  const row = (n, eff, act, tip) => `<div class="grow-row"><span class="gn">${n}</span><span class="gm">${eff}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const go = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const with_ = m => L.pct(L.duelChance(pi.S * m, pi.Q));
  const tips = [];
  if (p.w < 2) tips.push(row('历练捡法宝', p.w ? '×1.3→×1.7' : '×1.3 起', go('去历练', 'exp'), `凡器 ×1.3、法器 ×1.7，后山野林、黑风岭都会掉。换上法器胜算 → <b>${with_(L.WEAPONS[2].m / L.WEAPONS[p.w].m)}</b>。`));
  if (p.r === 0 && p.s < 3) {
    const need = Math.max(0, L.pNeed(p) - p.xp), t = Math.ceil(need / Math.max(L.gain(st), 1e-9));
    tips.push(row('修为再升一层', '×1.5', go('聚灵阵', 'home'), `还差 ${fmt(need)} 修为，照现在约 ${t} 周天。升一层胜算 → <b>${with_(1.5)}</b>。聚灵阵、运功吐纳都能加快。`));
  } else if (p.r === 0) tips.push(row('突破筑基', '暴涨', '', '修为条变金色就点它。筑基后不光境界涨，还会有大机缘——到时她根本不是对手。'));
  if (!p.pet) tips.push(row('收服灵宠', '×1.2 起', navLock('market') ? go('去历练', 'exp') : go('去坊市', 'market'), '历练时偶尔能收服，坊市也能买灵兽蛋。'));
  if (p.inj > 0) tips.push(row('养伤', '负伤 ×0.6', '', `还要 ${p.inj} 周天才好，别赶在开打前受伤。`));
  const body = `<p class="center">还剩 <b>${pi.left} 个周天</b>，${esc(st.exName)}在落霞城擂台等你。</p>
    <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(p.name)}</div><div class="num">${fmt(pi.base)}${pi.assist > 1 ? ` ×${pi.assist}` : ''}</div><div class="num jadet">= ${fmt(pi.S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${rivalAvImg({ n: st.exName, id: 'mu' }, 56)}<div>${esc(st.exName)}</div><div class="muted">单灵根·炼气后期·法器</div><div class="num seal">${fmt(pi.Q)}</div></div></div>
    <div class="center big ${pi.p < 0.45 ? 'seal' : pi.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(pi.p)}</div>
    ${pi.assist > 1 ? '<p class="muted center">×3 是老夫借你的神魂之力，只在你筑基之前有效。</p>' : ''}
    <div class="grow-sec"><h3>老祖锦囊<span>怎么提高胜算</span></h3>${tips.join('') || '<p class="muted">已经稳了，安心等着打脸吧。</p>'}</div>`;
  const s = sheet({ title: '三年之约', body });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); GO[b.dataset.go](); });
}

// ---------- 人物 ----------
function ladderHTML() {
  const rows = [];
  const add = q => { const rv = L.rivalAt(st, q); rows.push(`<div class="${q === st.rank ? 'me' : ''}"><b>第${q}</b><span>${esc(rv ? rv.n : st.p.name)}${rv && rv.id ? ' <span class="seal">宿敌</span>' : ''}</span><span class="num">${fmt(q === st.rank ? L.power(st) : L.rivalPower(st, q))}</span></div>`); };
  const qs = new Set([1, 2, 3]);
  for (let q = st.rank - 2; q <= st.rank + 2; q++) if (q >= 1 && q <= 100) qs.add(q);
  let prev = 0;
  for (const q of [...qs].sort((a, b) => a - b)) { if (q - prev > 1) rows.push('<div class="muted"><b>…</b></div>'); add(q); prev = q; }
  return `<div class="ladder">${rows.join('')}</div>`;
}
function showMe(tab) {
  tab = tab || 'attr';
  const p = st.p;
  const tabs = [['attr', '属性'], ['bond', '羁绊'], ['ach', '成就'], ['rank', '天骄榜']].map(([k, n]) => `<button data-t="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('');
  let body = '';
  if (tab === 'attr') {
    const trs = p.tr.map(k => `${L.TRAITS[k].n}<span class="muted">（${L.TRAITS[k].d}）</span>`).join('<br>') || '无';
    const buffs = (st.buffs || []).map(b => b.cul ? `修炼×${b.cul}（${b.left}周天）` : `战力×${b.atk}（${b.left}周天）`).join('、');
    body = `<div class="row">${myAvImg(78)}
      <div class="grow"><div class="big">${esc(p.name)}</div>${st.title ? `<div class="seal">「${esc(st.title)}」</div>` : ''}<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">${talentTag(p.t)}${st.sect ? `<span class="chip">${L.sectOf(st).n}·${L.srankName(st, st.sect.rank)}</span>` : '<span class="chip">散修</span>'}${st.daolv ? `<span class="chip ok">道侣 ${esc(L.npcName(st, st.daolv))}</span>` : ''}</div>
      <div style="margin-top:4px">${L.stageName(p)}${st.rebirth ? ` · 第 ${st.rebirth + 1} 世` : ''}</div></div></div>
    <button class="btn gold" id="btnGrow" style="width:100%">查看每项数值怎么来、怎么提升 ▸</button>
    <dl class="grid2">
      <dt>修为</dt><dd class="num">${fmt(p.xp)} / ${fmt(L.pNeed(p))}</dd>
      <dt>修炼速度</dt><dd class="num">+${fmt(L.gain(st))} / 周天</dd>
      <dt>战力</dt><dd class="num">${fmt(L.power(st))}</dd>
      <dt>寿元</dt><dd class="num ${L.desperate(st) ? 'seal' : ''}">${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</dd>
      <dt>天赋</dt><dd>${trs}</dd>
      <dt>法宝</dt><dd>${p.w ? `${esc(p.wn)}<span class="muted">（${L.WEAPONS[p.w].n} 战力×${L.WEAPONS[p.w].m}）</span>` : '<span class="muted">赤手空拳</span>'}</dd>
      <dt>功法</dt><dd>${p.a ? `《${esc(p.an)}》<span class="muted">（${L.ARTS[p.a].n} 修炼×${L.ARTS[p.a].m}）</span>` : '<span class="muted">基础吐纳</span>'}</dd>
      <dt>灵宠</dt><dd>${p.pet ? `${petImg(p.pet.tier, 26)} ${esc(p.pet.name)}<span class="muted">（${L.PETS[p.pet.tier].n} 战力×${L.PETS[p.pet.tier].m}）</span>` : '<span class="muted">尚无</span>'}</dd>
      <dt>库存</dt><dd>灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure} · 破境丹 ${st.pills}</dd>
      ${buffs ? `<dt>增益</dt><dd class="jadet">${buffs}</dd>` : ''}
      ${st.bonus.cul || st.bonus.atk ? `<dt>机缘加成</dt><dd>修炼 +${Math.round(st.bonus.cul * 100)}% · 战力 +${Math.round(st.bonus.atk * 100)}%</dd>` : ''}
    </dl>
    ${st.lives.length ? `<div class="sep"></div><div class="muted">前世</div>${st.lives.map((l, i) => `<div>第 ${i + 1} 世 · ${esc(l.name)} · ${l.ascended ? '白日飞升' : L.REALMS[Math.min(l.r, 8)].n + '期坐化'} · ${l.age} 岁</div>`).join('')}` : ''}
    <div class="sep"></div><dl class="grid2"><dt>存档</dt><dd>本机自动保存 · 云存档：${esc(cloudStatus)}</dd></dl>
    <div class="row"><button class="btn sm alt" id="btnReset">重新开始</button></div>
    <div class="muted">字体：Fusion Pixel（TakWolf，SIL OFL 1.1）</div>`;
  } else if (tab === 'bond') {
    body = Object.keys(L.NPCS).map(id => {
      const N = L.NPCS[id];
      if (!L.met(st, id)) return `<div class="card flat" style="opacity:.55"><div class="av" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted)">？</div><div class="main"><div>？？？</div><div class="muted">${N.title} · 尚未相识</div></div></div>`;
      const a = L.aff(st, id);
      const tag = st.daolv === id ? '<span class="chip ok">道侣</span>' : a >= 60 ? '<span class="chip ok">知己</span>' : a >= 30 ? '<span class="chip">熟识</span>' : '<span class="chip">初识</span>';
      return `<div class="card flat">${npcAvImg(id, 44)}<div class="main"><div class="line"><span>${esc(L.npcName(st, id))}</span>${tag}</div><div class="muted">${N.title}</div>${bar(a / 100, a >= 60)}<div class="${a >= 60 ? 'jadet' : 'muted'}">知己加成：${N.bonus}${N.daolv ? ' · 可结为道侣（双修 修炼×1.3）' : ''}</div></div><div class="right num">${a}</div></div>`;
    }).join('') + '<div class="muted">好感来自奇遇中的选择。好感 60 结为知己获得永久加成；医修与魔门圣女二人中可择一结为道侣。</div>';
  } else if (tab === 'ach') {
    const got = L.ACHS.filter(a => st.ach[a.id]).length;
    body = `<div class="muted">已达成 ${got} / ${L.ACHS.length} · 点已获得的称号可佩戴</div>` + L.ACHS.map(a => `<div class="ach ${st.ach[a.id] ? '' : 'off'}" data-title="${st.ach[a.id] ? esc(a.t) : ''}"><b>${a.n}<br><span class="muted">${a.d}</span></b><span class="${st.title === a.t ? 'chip ok' : 'chip'}">「${a.t}」</span></div>`).join('')
      + (st.titles.filter(t => !L.ACHS.some(a => a.t === t)).length ? `<div class="sep"></div><div class="muted">其他称号</div>` + st.titles.filter(t => !L.ACHS.some(a => a.t === t)).map(t => `<div class="ach" data-title="${esc(t)}"><b>${esc(t)}</b><span class="${st.title === t ? 'chip ok' : 'chip'}">${st.title === t ? '佩戴中' : '佩戴'}</span></div>`).join('') : '');
  } else {
    const rivals = L.RIVALS.map(rv => { const name = rv.id === 'mu' ? st.exName : rv.name; return `<div class="row"><span class="grow">${esc(name)} <span class="muted">${rv.title}</span></span>${st.beaten[rv.id] ? '<span class="chip ok">已击败</span>' : `<span class="chip">第${L.rivalRank(st, rv.id) || '?'}名</span>`}</div>`; }).join('');
    const bosses = L.BOSSES.map((B, k) => `<span class="chip ${st.bosses[k] ? 'ok' : ''}" style="${st.bosses[k] ? '' : 'opacity:.5'}">${B.n}</span>`).join(' ');
    body = `<div class="muted">宿敌</div>${rivals}<div class="sep"></div><div class="muted">天骄榜（每 12 周天举行一届论道）</div>${ladderHTML()}<div class="sep"></div><div class="muted">地图首领</div><div style="display:flex;flex-wrap:wrap;gap:4px">${bosses}</div>`;
  }
  const s = sheet({ title: '人物', body: `<div class="tabs">${tabs}</div>` + body });
  s.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { SFX.tap(); showMe(b.dataset.t); });
  s.querySelectorAll('.ach[data-title]').forEach(el => { if (el.dataset.title) el.onclick = () => { st.title = el.dataset.title; SFX.tap(); showMe('ach'); }; });
  const gb = s.querySelector('#btnGrow'); if (gb) gb.onclick = () => { SFX.tap(); showGrowth('all'); };
  const rb = s.querySelector('#btnReset');
  if (rb) rb.onclick = () => sheet({
    title: '重新开始', center: true, body: '<p>放弃当前进度，从头开始？这会清除本机与云端存档。</p>',
    foot: [{ t: '取消', alt: true, fn: () => showMe() }, { t: '确定重来', fn: () => { closeModal(); resetGame(); } }],
  });
}
function resetGame() {
  st = null; clearLocal();
  if (cloud.ref) cloud.ref.delete().catch(() => {});
  queue.length = 0; parts.length = 0; cine = null; adv = null;
  showIntro();
}

// ---------- 随机事件 ----------
function showEvent(ev) {
  const title = ev.kind === 'ring' ? '奇遇 · 戒中老祖' : ev.kind === 'beast' ? '灵兽认主' : '奇遇';
  const img = ev.kind === 'ring' ? `<img class="px" src="${ELDER}" style="width:52px;height:52px" alt="">` : ev.item && ev.item.kind === 'pet' ? petImg(ev.item.tier, 52) : myAvImg(52);
  sheet({ title, center: true, body: `<div class="row">${img}<p class="grow">${esc(ev.text)}</p></div>`, foot: [{ t: '妙啊', gold: true, fn: closeModal }] });
  SFX.reveal(5);
}

// ---------- 飞升 / 坐化 / 转世 ----------
function showAscension() {
  const p = st.p;
  st.lives.push(L.lifeSummary(st));
  saveLocal();
  sheet({ title: '飞升', center: true, noClose: true,
    body: `<div class="center">${myAvImg(66, 9)}</div>
      <div class="center big goldt">${esc(p.name)} 白日飞升</div>
      <p class="center">九九天劫散尽，仙门大开。当年被逐出山门、被当众退婚的废柴，踏云而去，位列仙班。</p>
      <dl class="grid2"><dt>修仙</dt><dd>${Math.floor(st.year) + 1} 年 · ${fmt(p.age)} 岁</dd><dt>天骄榜</dt><dd>最高第 ${st.bestRank}</dd><dt>宗门</dt><dd>${st.sect ? L.sectOf(st).n + L.srankName(st, st.sect.rank) : '散修'}</dd></dl>
      <div class="quote">恭喜通关！转世重修可以带着仙缘开启新的一世：修炼更快，天赋三选一。</div>`,
    foot: [{ t: '留在此世', alt: true, fn: closeModal }, { t: '再入轮回', gold: true, fn: () => rebirthPick() }] });
}
function showDeath() {
  const p = st.p;
  st.lives.push(L.lifeSummary(st));
  saveLocal();
  sheet({ title: '坐化', center: true, noClose: true,
    body: `<div class="center">${myAvImg(66, undefined, 'filter:grayscale(1)')}</div>
      <p class="center">寿元耗尽。${esc(p.name)}于洞府中静静坐化，享年 ${Math.floor(p.age)} 岁，止步${L.stageName(p)}。</p>
      <div class="quote">戒中老祖：“别灰心。老夫护住你一缕真灵，带着这一世的感悟，再来一次！”</div>`,
    foot: [{ t: '转世重修', gold: true, fn: () => rebirthPick() }] });
}
function rebirthPick() {
  const cards = L.rebirthCards(st, 3);
  const n = st.rebirth + 1;
  const s = sheet({ title: `第 ${n + 1} 世 · 选择天赋`, center: true, noClose: true,
    body: `<p>轮回之中，三道命格浮现。选择你下一世的根骨：</p>
      <div class="cands">${cards.map((c, i) => { const T0 = L.TALENTS[c.t]; const tr = L.TRAITS[c.tr[0]]; const beam = T0.c === 'rainbow' ? 'linear-gradient(#ff7a7a,#ffd36b,#7dff9a,#7ad7ff,#c48bff)' : T0.c; return `<div class="cand hide" data-i="${i}"><div class="beam" style="background:${beam}"></div>${talentTag(c.t)}<div class="tr" style="color:var(--text)">${tr.n}</div><div class="tr">${tr.d}</div><div class="cover">？</div></div>`; }).join('')}</div>
      <p class="muted center">仙缘加身：修炼速度 ×${(1 + 0.5 * n).toFixed(1)}，战力 ×${(1 + 0.25 * n).toFixed(2)}，初始灵石更多</p>`,
    foot: [{ t: '投胎转世', gold: true, disabled: true, fn: () => {} }] });
  const ok = s.querySelector('[data-fi="0"]');
  s.querySelectorAll('.cand').forEach((c, i) => {
    setTimeout(() => { c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(cards[i].t); }, 350 + i * 450);
    c.onclick = () => {
      if (c.classList.contains('hide')) return;
      SFX.tap();
      s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', x === c));
      ok.disabled = false;
      ok.onclick = () => {
        const old = st, card = cards[i];
        const ns = L.newState({ name: old.p.name, female: old.p.look.f, rebirth: n, t: card.t, tr: card.tr, lives: old.lives });
        ns.guide = { step: GUIDE.length, done: true };
        ns.hintSeen = Object.assign({}, old.hintSeen || {}, { pactSoon: 0, afterPact: 0 });
        closeModal();
        loadState(ns);
        L.log(st, `第 ${n + 1} 世，${st.p.name}再踏仙途`, 'gold');
        banner(`第 ${n + 1} 世`, L.TALENTS[card.t].n + ' · ' + L.TRAITS[card.tr[0]].n);
        SFX.gong();
        saveLocal();
      };
    };
  });
}

// ---------- 戒中老祖提示 ----------
function tip(key, text) {
  if (!st || st.seenTips[key]) return;
  st.seenTips[key] = 1;
  const el = $('#tip');
  const gone = st.eflags && st.eflags.st_farewell;
  el.innerHTML = `<img class="px" src="${ELDER}" alt=""${gone ? ' style="opacity:.4"' : ''}><div class="grow"><span class="who">${gone ? '戒中余音' : '戒中老祖'}：</span>${esc(text)}</div><span class="x">×</span>`;
  el.hidden = false;
  el.onclick = () => { el.hidden = true; SFX.tap(); };
}

// ---------- 新手引导 ----------
const modalTitle = () => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent.replace(/^主线/, '').trim() : ''; };
const modalOpen = () => !$('#modal').hidden;
const PI = () => L.pactInfo(st);
const BIG = '#stats button[data-s="big"]';
const dec = v => (v < 10 ? (Math.round(v * 10) / 10).toString() : fmt(v));
let lastExp = null;
// 新手引导：学游戏发展国的秘书——一次只说一两句、说话时暂停、句句带数字，说完立刻让你动手
const GUIDE = [
  { id: 'welcome', text: () => `小子，我是住在你戒指里的老祖。<b>三年之约</b>还剩 <b>${PI().left} 个周天</b>（一周天约 5 秒），到时${esc(st.exName)}要在擂台上当众羞辱你。`, btn: '然后呢' },
  { id: 'stakes', target: BIG, text: () => `她战力 <b>${L.PACT_POWER}</b>，你只有 <b>${fmt(L.power(st))}</b>。老夫借你神魂之力能翻 <b>3 倍</b>，胜算也才 <b>${L.pct(PI().p)}</b>。光打坐，必输。`, btn: '那怎么办？' },
  { id: 'expNav', show: () => !modalOpen() && !st.exp, target: '[data-nav="exp"]', text: '出去<b>【历练】</b>！打妖兽能捡<b>法宝</b>，战力直接 ×1.3 起，还能带回灵石。', until: () => modalTitle() === '外出历练' || !!st.exp },
  { id: 'expPick', show: () => modalTitle() === '外出历练', target: '#modal .card[data-k="0"]', text: () => `先去最近的<b>后山野林</b>，成功率 <b>${L.pct(L.expChance(st, 0).p)}</b>，稳。`, until: () => modalTitle() === '后山野林' || !!st.exp, back: () => (!modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'expGo', show: () => modalTitle() === '后山野林', target: '#modal .foot .btn.gold', text: '点<b>【御剑出发】</b>。', until: () => !!st.exp, back: () => (modalTitle() === '外出历练' ? 'expPick' : !modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'speed', show: () => !modalOpen(), target: '#btnSpeed', text: () => `路上会自动打怪，${L.REGIONS[st.exp ? st.exp.k : 0].mon} 个周天后回来。嫌慢就点这里<b>加速</b>。`, btn: '好' },
  { id: 'waitExp', silent: true, until: () => st.stats.exp >= 1 && !modalOpen() && !st.exp },
  { id: 'afterExp', show: () => !modalOpen() && !!lastExp, target: '#stats button[data-s="atk"]', text: () => {
      const e = lastExp, a = L.pactAssist(st), it = e.items.find(x => x.kind === 'w' && x.equip);
      const p0 = L.duelChance(e.pw0 * a, L.PACT_POWER), p1 = L.duelChance(e.pw1 * a, L.PACT_POWER);
      return `看见没？${it ? `捡了把<b>${esc(it.name)}</b>，` : ''}战力 <b>${fmt(e.pw0)} → ${fmt(e.pw1)}</b>，胜算 <b>${L.pct(p0)} → ${L.pct(p1)}</b>。`;
    }, btn: '再接再厉', until: () => !lastExp },
  { id: 'homeNav', show: () => !modalOpen(), target: '[data-nav="home"]', text: '灵石要花出去才有用。去<b>【洞府】</b>升级聚灵阵——修炼越快升层越快，<b>每升一层战力 ×1.5</b>。', until: () => modalTitle() === '洞府' || st.home.array >= 1 },
  { id: 'homeArray', show: () => modalTitle() === '洞府', target: '#modal button[data-k="array"]', text: () => `点这里升级<b>聚灵阵</b>：修炼 <b>+${dec(L.gain(st))} → +${dec(L.gain(st) * 1.11)}</b> /周天。`, until: () => st.home.array >= 1, back: () => (!modalOpen() && st.home.array < 1 ? 'homeNav' : null) },
  { id: 'loop', show: () => !modalOpen(), target: BIG, text: () => `就这么循环：<b>历练 → 花灵石升级 → 再历练</b>。现在胜算 <b>${L.pct(PI().p)}</b>，随时看这一格，点开有老夫的锦囊。不知道干嘛就点下面的<b>目标</b>栏。`, btn: '明白了' },
];
const nextName = () => (st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n);
const HINTS = [
  { id: 'ready', urgent: true, when: () => L.isReady(st) && !modalOpen(), target: '#cult', text: () => `修为圆满了！点这个<b>金色的修为条</b>冲击${nextName()}，成功率 <b>${L.pct(L.btRate(st, st.pills > 0))}</b>${st.pills ? '（已算上破境丹）' : ''}。突破后战力、寿元大涨。`, until: () => /突破|天劫/.test(modalTitle()) || !!cine },
  { id: 'btGo', urgent: true, when: () => /境界突破|飞升天劫/.test(modalTitle()), target: '#modal .foot .btn.gold', text: '有破境丹就勾上，<b>成功率 +20%</b>。准备好了点<b>开始突破</b>。失败不会死，下次成功率 +12%。', until: () => !!cine || !modalOpen() },
  { id: 'afterPact', urgent: true, when: () => !!st.pact && !modalOpen(), target: BIG, btn: '好', text: () => (st.pact > 0 ? '痛快！满城都知道你不是废物了。' : '输了不丢人，她就在天骄榜上。') +
      `每 <b>12 周天</b>一届<b>天骄论道</b>，看这一格倒计时${st.pact > 0 ? '' : '，到时再找她算账'}。` + (st.p.r < 1 ? '眼下先冲<b>筑基</b>：战力暴涨，宗门也会来抢你。' : '你已筑基，宗门很快会来招揽。') },
  { id: 'pactSoon', urgent: true, when: () => !st.pact && st.guide.done && !modalOpen() && PI().left <= 6, target: BIG, btn: '好', text: () => {
      const pi = PI();
      return `还剩 <b>${pi.left} 个周天</b>就是三年之约！你 ${fmt(pi.base)}×${pi.assist} = <b>${fmt(pi.S)}</b>，她 <b>${pi.Q}</b>，胜算 <b>${L.pct(pi.p)}</b>。` +
        (pi.p < 0.5 ? '不够稳：再历练捡件法器（×1.7），或者让修为再升一层（×1.5）。点这一格看锦囊。' : pi.p < 0.85 ? '还差一口气，再历练两趟。' : '稳了。到时候让全城看看谁是废物。');
    } },
  { id: 'market', when: () => st.guide.done && st.stats.exp >= 2 && !modalOpen() && st.stones >= L.price(st, 'pill'), target: '[data-nav="market"]', text: () => `<b>【坊市】</b>开张了：破境丹 <b>${fmt(L.price(st, 'pill'))}</b> 灵石一枚（突破成功率 +20%），“寻宝”能抽法宝功法，还能孵灵兽蛋。`, btn: '记住了' },
  { id: 'tuna', when: () => st.guide.done && !st.exp && !modalOpen() && st.tick >= 6 && !L.isReady(st) && st.p.r <= L.MAXR && (st.tunaLeft === undefined || st.tunaLeft === L.TUNA_MAX), target: '#sceneWrap', text: () => `在洞府的空当，<b>点画面里的你</b>能运功吐纳：每次 <b>+${dec(L.gain(st) * 0.1)}</b> 修为，每周天 ${L.TUNA_MAX} 次。点一下试试！`, btn: '下次再说', until: () => st.tunaLeft !== undefined && st.tunaLeft < L.TUNA_MAX },
  { id: 'sect', when: () => !!st.sect && !modalOpen(), target: '[data-nav="sect"]', text: '入宗了！历练、论道都能挣<b>宗门贡献</b>，攒够了来<b>【宗门】</b>晋升身份；宝库能用贡献换功法法宝；每 24 周天还有九宗会武。', btn: '好' },
  { id: 'me', when: () => st.stats.tour >= 1 && !modalOpen(), target: '[data-nav="me"]', text: '论道排名、宿敌都在<b>【人物】→ 天骄榜</b>。那里还有属性、人物好感和成就称号。', btn: '好' },
  { id: 'alch', when: () => st.home.furnace >= 1 && !modalOpen() && st.herbs >= L.herbCost(st, L.RECIPES[0]), target: '[data-nav="home"]', text: '丹炉有了，灵草也够了。去<b>【洞府】→ 炼丹房</b>：聚灵丹加速修炼，延寿丹续命，洗髓丹还能提升灵根！', btn: '好' },
  { id: 'boss', when: () => !modalOpen() && L.REGIONS.some((r, k) => L.bossReady(st, k)), target: '[data-nav="exp"]', text: '有张地图的<b>首领</b>现身了！去<b>【历练】</b>里挑战它，掉落天材地宝和专属法宝。', btn: '好' },
  { id: 'life', when: () => L.desperate(st) && !modalOpen(), target: '#lifeBox', text: '<b>寿元</b>快到头了！去坊市买延寿丹，或者赶紧突破——寿元将尽时突破有绝境加成。', btn: '知道了' },
];
let activeHint = null, tempHint = null, guideShownId = '', guideHold = false, hintCool = 0;
function ensureGuide() {
  if (!st.guide) st.guide = { step: 0, done: st.tick > 3 || st.stats.exp > 0 || st.rebirth > 0 };
  if (!st.hintSeen) st.hintSeen = {};
}
function currentGuide() {
  if (!st || !$('#intro').hidden || cine) return null;
  ensureGuide();
  if (tempHint) return tempHint;
  const g = st.guide;
  if (!g.done) {
    for (let guard = 0; guard < 20 && g.step < GUIDE.length; guard++) {
      const s0 = GUIDE[g.step];
      if (s0.until && s0.until()) { g.step++; continue; }
      const b = s0.back && s0.back();
      if (b) { g.step = GUIDE.findIndex(x => x.id === b); continue; }
      break;
    }
    if (g.step >= GUIDE.length) g.done = true;
    else { const s0 = GUIDE[g.step]; return !s0.silent && (!s0.show || s0.show()) ? s0 : null; }
  }
  if (activeHint && activeHint.until && activeHint.until()) { st.hintSeen[activeHint.id] = 1; activeHint = null; }
  if (activeHint && !activeHint.until && !activeHint.when()) activeHint = null;
  if (!activeHint) activeHint = HINTS.find(h => !st.hintSeen[h.id] && (h.urgent || st.tick >= hintCool) && h.when()) || null;
  if (activeHint && activeHint.until && !activeHint.when() && !activeHint.until()) return null;
  return activeHint;
}
function advanceGuide(cur) {
  SFX.tap();
  if (cur === tempHint) { tempHint = null; return; }
  hintCool = st.tick + 2; // 两条提示之间至少隔两个周天，别连珠炮
  if (GUIDE.includes(cur)) { st.guide.step = GUIDE.indexOf(cur) + 1; return; }
  st.hintSeen[cur.id] = 1; activeHint = null;
}
function updateGuide() {
  const el = $('#guide');
  const cur = currentGuide();
  guideHold = false;
  if (!cur) { if (!el.hidden) el.hidden = true; guideShownId = ''; return; }
  const tgt = cur.target ? document.querySelector(cur.target) : null;
  if (cur.target && (!tgt || !tgt.offsetParent)) { el.hidden = true; return; }
  el.hidden = false;
  guideHold = !!cur.btn; // 老祖说话时时间暂停
  const id = cur.id + (GUIDE.includes(cur) ? '' : '_h');
  if (guideShownId !== id) {
    guideShownId = id;
    el.querySelector('.gav').src = ELDER;
    el.querySelector('.gtext').innerHTML = typeof cur.text === 'function' ? cur.text() : cur.text;
    const bt = el.querySelector('.gbtns');
    bt.innerHTML = (GUIDE.includes(cur) ? '<button class="skip" data-g="skip">跳过教程</button>' : '') + (cur.btn ? `<button class="btn gold" data-g="ok">${cur.btn}</button>` : '');
    const ok = bt.querySelector('[data-g="ok"]'); if (ok) ok.onclick = () => { ac(); advanceGuide(cur); updateGuide(); };
    const sk = bt.querySelector('[data-g="skip"]'); if (sk) sk.onclick = () => { SFX.tap(); st.guide.done = true; updateGuide(); };
  }
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  const spot = el.querySelector('.spot'), arrow = el.querySelector('.garrow'), box = el.querySelector('.gbox');
  const vh = window.innerHeight / z;
  if (tgt) {
    const r = tgt.getBoundingClientRect();
    const k = /Chrome\/(\d+)/.test(navigator.userAgent) && +RegExp.$1 >= 128 ? 1 : z; // 新版浏览器的 rect 已含缩放
    const L0 = r.left / k, T0 = r.top / k, W0 = r.width / k, H0 = r.height / k;
    spot.className = 'spot';
    Object.assign(spot.style, { left: (L0 - 4) + 'px', top: (T0 - 4) + 'px', width: (W0 + 8) + 'px', height: (H0 + 8) + 'px' });
    const below = T0 + H0 / 2 < vh / 2;
    arrow.hidden = false;
    arrow.className = 'garrow' + (below ? ' up' : '');
    arrow.textContent = below ? '▲' : '▼';
    arrow.style.left = (L0 + W0 / 2) + 'px';
    arrow.style.top = (below ? T0 + H0 + 8 : T0 - 8 - 24) + 'px';
    if (below) { box.style.top = ''; box.style.bottom = '16px'; } else { box.style.bottom = ''; box.style.top = '16px'; }
  } else {
    spot.className = 'spot none'; spot.removeAttribute('style');
    arrow.hidden = true;
    box.style.bottom = ''; box.style.top = '34%';
  }
}
function showHelp() {
  const sec = (ic, t, d) => `<div class="guide-sec">${iconHTML(ic, 24)}<div><b>${t}</b><br>${d}</div></div>`;
  const body = [
    sec('disc', '先看懂这四个数', '修为条下面一排：<b>修炼/周天</b>（每 5 秒涨多少修为）、<b>战力</b>（打架全看它）、<b>灵石/周天</b>、最右边是<b>下一件大事</b>的倒计时和胜算。点任意一格都能看到它由哪些加成组成、怎么提升。'),
    sec('disc', '修炼与突破', '打坐自动涨修为，涨满自动升一层小境界（战力 ×1.5）。修为条变<b>金色</b>时点它冲击大境界，金丹起要渡雷劫。失败不会死，下次成功率 +12%。在洞府时点画面里的自己能运功吐纳，额外涨修为。'),
    sec('flag', '三年之约', '开局第 3 年要和退婚的人比武。最右边那格显示还剩几个周天和你的胜算；点开有提高胜算的办法。筑基前老祖会借你 3 倍战力。'),
    sec('sword', '历练', '点【历练】选地图出发，路上自动打怪，带回灵石、修为、破境丹，有机会掉法宝、功法、灵宠。成功率越绿越稳；越级挑战成功奖励翻倍。每张地图赢 3 次会出现首领。'),
    sec('build', '洞府', '灵石主要花在这里：聚灵阵加修炼速度，灵田产灵石和灵草，丹炉自动出破境丹并开启炼丹房，洞府加寿元。'),
    sec('bag', '坊市', '买破境丹、延寿丹；寻宝抽法宝功法；孵灵兽蛋得灵宠。价格随境界上涨。'),
    sec('flag', '宗门', '筑基后三大宗门来招揽。历练、论道挣贡献，在【宗门】晋升身份、用宝库换东西。每 24 周天九宗会武，你代表本宗往上打。'),
    sec('flag', '天骄论道', '每 12 周天自动举行，按战力挑战天骄榜上的对手，宿敌都在榜上等你。'),
    sec('disc', '奇遇与人物', '随时会遇到奇遇，按你的选择给奖励、改变人物好感。好感 60 成为知己有永久加成，医修和魔门圣女可结为道侣。'),
    sec('pill', '炼丹', '【洞府】→ 炼丹房，用灵草和天材地宝炼丹：培元、聚灵、延寿、洗髓（提升灵根）、九转金丹（突破必成）。'),
    sec('life', '寿元与转世', '右上角沙漏是年龄/寿元。突破能大幅延寿；寿元耗尽会坐化，转世后天赋三选一、修炼更快。'),
    sec('sound', '其他', '右上角【×1】切换速度（×2、×4、暂停），音符按钮切换声音。底部目标栏可以点，告诉你下一步怎么做。'),
  ].join('');
  sheet({ title: '玩法指南', body, foot: [{ t: '重看新手教程', alt: true, fn: () => { st.guide = { step: 0, done: false }; st.hintSeen = {}; activeHint = null; closeModal(); } }, { t: '知道了', gold: true, fn: closeModal }] });
}
const GO = { exp: () => showExp(), home: () => showHome(), sect: () => showSect(), market: () => showMarket(), me: () => showMe('rank') };
function showGoal() {
  const g = L.GOALS[st.goal];
  if (!g) { sheet({ title: '目标', center: true, body: '<p>大道已成。可以继续在此世逍遥，或去【人物】查看成就。</p>', foot: [{ t: '好', gold: true, fn: closeModal }] }); return; }
  const go = () => {
    closeModal();
    if (g.go === 'cult') { if (L.isReady(st)) showBreakthrough(); else tempHint = { id: 'tmp', target: '#cult', text: g.how, btn: '好' }; }
    else if (g.go === 'sect' && !st.sect) tempHint = { id: 'tmp', target: '#cult', text: '你还没有宗门。突破到筑基期后，宗门会来招揽你。', btn: '好' };
    else if (GO[g.go]) GO[g.go]();
  };
  sheet({ title: '当前目标', center: true,
    body: `<div class="big">${esc(L.goalText(st, g))}</div><div class="quote">${esc(g.how || '')}</div>${g.rw ? `<p class="muted">完成奖励：灵石 ${fmt(g.rw)}</p>` : ''}`,
    foot: [{ t: '关闭', alt: true, fn: closeModal }, { t: '带我去', gold: true, fn: go }] });
}
$('#goal').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showGoal(); });
$('#btnHelp').onclick = () => { if (!st || cine) return; ac(); SFX.tap(); showHelp(); };

// ---------- 每周天 ----------
let monthAcc = 0;
function onTick() {
  const xpBefore = st.p.xp, stBefore = st.stones;
  const out = L.tick(st, true);
  if (!st.exp && !cine && $('#modal').hidden) {
    const g = L.gain(st), inc = L.income(st);
    if (st.p.r <= L.MAXR && !L.isReady(st)) floatText(HOMEPOS.x + 14, HOMEPOS.y - D().sit.h + 2, '+' + fmt(g), '#8ff5d0', false, true);
    floatText(30, 108, '+' + fmt(inc), '#ffe39a', false, true);
  }
  void xpBefore; void stBefore;
  if (out.exp) { const r = out.exp; pushPopup(() => showExpResult(r)); }
  if (out.choice && !(st.guide && !st.guide.done)) { const ce = out.choice; pushPopup(() => showChoice(ce)); }
  if (out.event) {
    const ev = out.event;
    if (ev.big) pushPopup(() => showEvent(ev));
    else if (ev.pop && !st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 10, ev.pop, ev.cls === 'red' ? '#ff8a8a' : '#ffe39a');
  }
  if (out.pact) pushPopup(runPact);
  if (out.invite) pushPopup(showInvite);
  if (out.war) pushPopup(runWar);
  if (out.tourney) pushPopup(runTournament);
  if (out.meet) pushPopup(runSectMeet);
  if (out.death) pushPopup(showDeath);
  saveLocal();
}

// ---------- 主循环 ----------
let last = performance.now(), cloudAcc = 0;
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  const sp = SPEEDS[speedIdx];
  const running = st && sp > 0 && $('#modal').hidden && !cine && $('#intro').hidden && st.p.r < 9 && !guideHold;
  if (running) {
    L.flow(st, dt * sp / TICK_MS);
    monthAcc += dt * sp;
    if (monthAcc >= TICK_MS) { monthAcc -= TICK_MS; onTick(); }
    craneTimer -= dt;
    if (craneTimer <= 0 && !crane && !st.exp) { crane = { x: -12, y: 14 + Math.random() * 22, v: 0.02 }; craneTimer = 70000 + Math.random() * 60000; }
  }
  if (crane) { crane.x += crane.v * dt; if (crane.x > W + 14) crane = null; }
  drawScene(dt);
  if (st) updateGuide();
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
  if (crane && Math.abs(x - crane.x + 3) < 14 && Math.abs(y - crane.y) < 8) {
    if (Math.random() < 0.3) { st.pills++; floatText(crane.x, crane.y, '仙鹤衔丹 破境丹+1', '#ffe39a'); }
    else { const v = Math.floor(L.income(st) * 15 + 60); st.stones += v; floatText(crane.x, crane.y, '仙鹤献瑞 灵石+' + fmt(v), '#ffe39a'); }
    for (let k = 0; k < 24; k++) { const a = Math.random() * 6.28; parts.push({ x: crane.x, y: crane.y, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, life: 700, max: 700, c: '#ffe39a', s: 1 }); }
    SFX.coin(); crane = null; return;
  }
  if (st.exp) { SFX.tap(); showExp(); return; }
  const S = D().sit;
  if (Math.abs(x - HOMEPOS.x) < S.w / 2 + 6 && y > HOMEPOS.y - S.h - 16 && y < HOMEPOS.y + 6) {
    if (L.isReady(st)) { SFX.tap(); showBreakthrough(); return; }
    const g = L.tuna(st);
    if (g > 0) {
      tone(523 + (L.TUNA_MAX - st.tunaLeft) * 40, 0, 0.08, 'triangle', 0.1);
      floatText(HOMEPOS.x + (Math.random() - 0.5) * 20, HOMEPOS.y - S.h - 4 - Math.random() * 12, `吐纳 +${dec(g)}`, '#8ff5d0', false, true);
      for (let k = 0; k < 8; k++) { const a = Math.random() * 6.28, r = 18; parts.push({ x: HOMEPOS.x + Math.cos(a) * r, y: HOMEPOS.y - S.h / 2 + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * 0.03, vy: -Math.sin(a) * 0.018, life: 500, max: 500, c: '#9ff5d8', s: 1 }); }
    } else floatText(HOMEPOS.x, HOMEPOS.y - S.h - 4, '气息已尽，下个周天再来', '#9d93b8', false, true);
    return;
  }
  if (y > 30 && y < 104 && x > 50 && x < 150) { SFX.tap(); showHome(); }
}
cvs.addEventListener('click', sceneClick);
$('#cult').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); if (L.isReady(st)) showBreakthrough(); else showMe(); });
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-nav]'); if (!b || !st || cine) return;
  ac(); SFX.tap();
  const lk = navLock(b.dataset.nav);
  if (lk) { tempHint = { id: 'tmp', target: `[data-nav="${b.dataset.nav}"]`, text: lk, btn: '好' }; return; }
  ({ exp: showExp, home: showHome, sect: showSect, market: showMarket, me: showMe })[b.dataset.nav]();
});
$('#btnSpeed').onclick = () => { ac(); speedIdx = (speedIdx + 1) % SPEEDS.length; SFX.tap(); savePref(); updateHUD(); };
$('#btnSound').onclick = () => { soundMode = (soundMode + 1) % 3; ac(); SFX.tap(); setSoundIcon(); savePref(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveCloud(); } });
window.addEventListener('pagehide', saveLocal);
window.addEventListener('resize', () => { setFontSize(); fitScene(); });

// ---------- 开场 ----------
const NAMES_M = ['林逸尘', '沈青川', '陆长风', '叶知秋', '苏念白', '顾清寒', '江离', '温如玉', '秦慕白', '萧云舟'];
const NAMES_F = ['苏清歌', '林晚照', '沈月白', '叶轻舟', '顾念安', '温若雪', '江明月', '秦挽歌'];
function showIntro() {
  const box = $('#intro');
  box.hidden = false;
  $('#modal').hidden = true;
  const lines = [
    ['天剑宗外门。', '“杂灵根也配修仙？滚出山门！”', '你被大师兄赵乾一脚踢下了山。'],
    ['同一天，婚约也被当众撕毁：', '“废物，你配不上慕容家。三年后落霞城论剑，你若敢来，我便让你输得心服口服。”', '“莫欺少年穷！三年之后，我必登台！”'],
    ['当夜，荒山破庙。', '一枚生锈的戒指在月光下微微发烫……', '“小家伙，老夫在戒中等了你三千年。”'],
    ['一个废柴的逆天仙途，从此开始。', '三年之约、天剑宗、天骄榜、宗门之巅——', '还有那九九天劫之后的，白日飞升。'],
  ];
  let page = 0, typing = null;
  const render = () => {
    const ls = lines[page];
    box.innerHTML = `<div class="story">${page === 0 ? '<h1>废柴仙途</h1>' : ''}${ls.map(() => '<p></p>').join('')}<p class="hint">点击继续 ▸</p></div>`;
    const ps = box.querySelectorAll('p:not(.hint)');
    let li = 0, ci = 0;
    clearInterval(typing);
    typing = setInterval(() => {
      if (li >= ls.length) { clearInterval(typing); typing = null; return; }
      ps[li].textContent = ls[li].slice(0, ++ci);
      if (ci % 2) tone(880, 0, 0.02, 'square', 0.03);
      if (ci >= ls[li].length) { li++; ci = 0; }
    }, 40);
    box.querySelector('.story').onclick = () => {
      ac();
      if (typing) { clearInterval(typing); typing = null; ps.forEach((p, i) => p.textContent = ls[i]); return; }
      page++;
      if (page >= lines.length) setupForm(); else render();
    };
  };
  render();
}
function setupForm() {
  const box = $('#intro');
  let female = 0;
  const pickName = () => { const a = female ? NAMES_F : NAMES_M; return a[Math.floor(Math.random() * a.length)]; };
  box.innerHTML = `<div class="setup sheet" style="margin:0"><div class="rod"></div><header><h2>踏上仙途</h2></header>
    <div class="body">
      <div class="center"><img class="px" id="setupAv" alt=""></div>
      <label for="inName">姓名</label><div class="row"><input class="txt grow" id="inName" maxlength="6" value="${esc(pickName())}"><button class="btn sm alt" id="rdName" aria-label="随机姓名">换</button></div>
      <div class="row"><span>性别</span><button class="btn sm gold" id="gM">少年</button><button class="btn sm alt" id="gF">少女</button></div>
      <div class="muted">操作很简单：打坐自动涨修为 → 点【历练】打怪拿资源 → 升级洞府、买丹药 → 修为条变金时点它突破。</div>
    </div><div class="foot"><button class="btn gold" id="goStart">踏入仙途</button></div><div class="rod"></div></div>`;
  const inN = box.querySelector('#inName');
  const av = () => { const c = ART.avatar({ hair: '#2a2230', skin: '#f2c9a0', f: female }, 0, '#e6e1d3'); const img = box.querySelector('#setupAv'); img.src = c.toDataURL(); img.style.cssText = avStyle(c, 78); };
  av();
  box.querySelector('#rdName').onclick = () => { inN.value = pickName(); SFX.tap(); };
  const setG = f => { female = f; box.querySelector('#gM').className = 'btn sm ' + (f ? 'alt' : 'gold'); box.querySelector('#gF').className = 'btn sm ' + (f ? 'gold' : 'alt'); if ((f ? NAMES_M : NAMES_F).includes(inN.value)) inN.value = pickName(); av(); SFX.tap(); };
  box.querySelector('#gM').onclick = () => setG(0);
  box.querySelector('#gF').onclick = () => setG(1);
  box.querySelector('#goStart').onclick = () => {
    ac();
    const s = L.newState({ name: inN.value.trim() || pickName(), female });
    L.log(s, `${s.p.name}在荒山破庙中盘膝坐下，仙途由此开始`, 'gold');
    loadState(s);
    box.hidden = true;
    monthAcc = 0;
    SFX.gong();
    banner('废柴仙途', '三年之约 · 倒计时');
    st.guide = { step: 0, done: false }; st.hintSeen = {};
    saveLocal();
  };
}

// ---------- 启动 ----------
function start(data) {
  loadPref();
  setSoundIcon();
  const saved = (data && data.st && data.st.v === 2) ? data.st : loadLocal();
  if (saved && saved.v === 2) { loadState(saved); $('#intro').hidden = true; }
  else showIntro();
  updateHUD();
  fitScene();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  initCloud();
}
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ st })); } catch (e) { /* ignore */ }
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
window.__xm = { get st() { return st; }, L, ART, setSpeed: i => { speedIdx = i; }, onTick, showBreakthrough, closeModal, showEvent, showInvite, runTournament, runPact, runWar, doPromote, showDeath, rebirthPick, showChoice, showAlchemy, fightBossUI, showMe, runSectMeet, showGrowth, get cine() { return !!cine; } };
})();
