/* 废柴仙途 · 界面片段 core：工具、全局状态、字号、图标、头像
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = L.fmt;
// ×1 时一周天的真实毫秒数：第一世元婴之前 6 秒，其余 5 秒（docs/ONBOARDING.md §5：上手期慢一点，留出“练手”的时间）
const TICK_MS_BASE = 5000;
const tickMs = () => (st && L.TICK_SEC ? L.TICK_SEC(st) * 1000 : TICK_MS_BASE);
const SPEEDS = [1, 2, 4, 0];
let st = null;
let speedIdx = 0;
let cine = null;
const queue = [];
let soundMode = 0;
let cloudStatus = '未连接';
let rankShown = 0;

// ---------- 字号与缩放（DESIGN §5.1：字号三档、像素图整数倍） ----------
// --fs 小（说明、标签）、--fs-m 中（数值、按钮、人名）、--fs-l 大（标题、境界名）；都是 12 像素字模的整数倍设备像素
// --u1 / --u2：一个美术像素按 1×、2× 放大时占多少 CSS 像素（整数个设备像素），九宫格边框与图标都按它取尺寸
let UPX = 2;   // 场景每个逻辑像素占几个设备像素（fitScene 用）
function pxN(k) { const d = window.devicePixelRatio || 1; return Math.max(1, Math.round(d * k)); }
function setFontSize() {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.round(dpr * 1.2));
  let fs = 12 * k / dpr;
  if (fs < 12) fs = 12;
  if (fs > 16) fs = 16;
  const fm = dpr < 1.5 ? fs : Math.min(18, 12 * (k + 1) / dpr), fl = Math.max(24, 24 * k / dpr);
  const root = document.documentElement;
  root.style.setProperty('--fs', fs.toFixed(3) + 'px');
  root.style.setProperty('--fs-m', fm.toFixed(3) + 'px');
  root.style.setProperty('--fs-l', Math.min(32, fl).toFixed(3) + 'px');
  root.style.setProperty('--u1', (pxN(1) / dpr).toFixed(4) + 'px');
  root.style.setProperty('--u2', (pxN(2) / dpr).toFixed(4) + 'px');
  UPX = pxN(2);
  root.style.zoom = '';
  const z = Math.min(window.innerWidth / 500, window.innerHeight / 600);
  const q = Math.max(1, Math.min(2, Math.floor(z * 4) / 4));
  if (q > 1) root.style.zoom = q;
}
setFontSize();
// 界面皮肤：ART.frame 的九宫格（border-image），做成 CSS 变量 --fr-<kind>
(function () {
  if (!ART.frame) return;
  const root = document.documentElement;
  for (const k of ['hud', 'sheet', 'card', 'btnGold', 'btnAlt', 'btnSeal', 'btnOff']) { const f = ART.frame(k); if (f) root.style.setProperty('--fr-' + k, `url(${f.url})`); }
  const lk = ART.icon && ART.icon('lock'); if (lk) root.style.setProperty('--ic-lock', `url(${lk.toDataURL()})`);
})();
// 像素图按整数倍显示：n 逻辑像素宽的图、想要大约 want CSS 像素宽 → 实际 CSS 宽（每个美术像素占整数个设备像素）
function pxFit(n, want) { const d = window.devicePixelRatio || 1; return n * Math.max(1, Math.round(want * d / n)) / d; }

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
// 旧 10×10 图标名 → 新 16×16 美术（ART.icon）；声音三态仍用旧图
const ICON_ART = { stone: 'stone', pill: 'pojing', life: 'life', flag: 'rank', disc: 'cult', sword: 'atk', build: 'cave', bag: 'gift', pet: 'egg' };
function iconHTML(k, size) {
  const a = ICON_ART[k] && ART.icon && ART.icon(ICON_ART[k]);
  if (a) { const s = pxFit(a.width, size || 16); return `<img class="px" src="${urlOf(a, 'ic|' + ICON_ART[k])}" width="${s}" height="${s}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
  return `<img class="px" src="${iconURL[k]}" width="${size || 16}" height="${size || 16}" alt="">`;
}
// 新图标（ART.icon 名）按整数倍：artIcon('stone', 16)
function artIcon(name, want, cls) { const c = ART.icon && ART.icon(name); if (!c) return ''; const s = pxFit(c.width, want || c.width); return `<img class="px${cls ? ' ' + cls : ''}" src="${urlOf(c, 'ic|' + name)}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
// 空状态（.empty-note）：ART.emptyNote('pet' | 'vault' | 'build', paper) 48×48 淡墨小画按整数倍约 2 倍 + 一句话；纸卷上用宣纸底版
function emptyNoteHTML(kind, text, dark) {
  const c = ART.emptyNote && ART.emptyNote(kind, !dark), s = c ? pxFit(48, 96) : 0;
  return `<div class="empty-note">${c ? `<img class="px" src="${urlOf(c, 'empty|' + kind + (dark ? 0 : 1))}" style="width:${s}px;height:${s}px;flex:none" alt="">` : ''}<div>${text}</div></div>`;
}
document.querySelectorAll('img[data-art]').forEach(img => { const c = ART.icon(img.dataset.art); if (!c) return; img.src = c.toDataURL(); const s = pxFit(c.width, +img.dataset.sz || c.width); img.style.width = img.style.height = s + 'px'; });
// 戒中老祖：48×48 半身像（提示气泡、引导框、事件立绘都用它）；没有新美术时退回旧的水滴
const ELDER = (ART.portrait && ART.portrait('elder', 'n') || ART.elder()).toDataURL();
function elderImg(w, mood) { const c = ART.portrait && ART.portrait('elder', mood || 'n'); const s = pxFit(48, w); return c ? `<img class="px pt" src="${urlOf(c, 'pt|elder|' + (mood || 'n'))}" style="width:${s}px;height:${s}px;flex:none" alt="">` : `<img class="px" src="${ELDER}" style="width:${w}px;height:${w}px" alt="">`; }

// ---------- 头像 ----------
const avCache = new Map();
function urlOf(canvas, key) { if (avCache.has(key)) return avCache.get(key); const u = canvas.toDataURL(); avCache.set(key, u); return u; }
function avStyle(c, w) { return `width:${w}px;height:${Math.round(w * c.height / c.width)}px`; }
function myAvCanvas(realm, mood) { const p = st.p, r = realm !== undefined ? realm : p.r; if (ART.portraitMe) return ART.portraitMe(p.look, Math.min(r, 9), mood || 'n'); const tc = L.TALENTS[p.t].c; return ART.avatar(p.look, r, tc === 'rainbow' ? '#c48bff' : tc); }
function myAv(realm, mood) { const p = st.p, r = realm !== undefined ? realm : p.r; return urlOf(myAvCanvas(r, mood), ['me', p.look.hair, p.look.skin, p.look.f, r, p.t, mood || 'n'].join('|')); }
// 主角半身像（ART.portraitMe 48×48，整数倍）；w 是想要的大约宽度
function myAvImg(w, realm, extraStyle, mood) { const c = myAvCanvas(realm, mood); const s = pxFit(c.width, w); return `<img class="px pt" src="${myAv(realm, mood)}" style="width:${s}px;height:${s * c.height / c.width}px;flex:none;${extraStyle || ''}" alt="">`; }
// 半身像通用：画布 → 整数倍 img
function ptHTML(c, key, w, id, extra) { const s = pxFit(c.width, w); return `<img class="px pt"${id ? ` id="${id}"` : ''} src="${urlOf(c, key)}" style="width:${s}px;height:${s}px;flex:none;${extra || ''}" alt="">`; }
const RIVAL_LOOK = {
  mu: f => ({ look: { hair: '#3b2a22', skin: '#f6d3b3', f: f ? 0 : 1 }, robe: ['#a8405a', '#d86a88', '#f4a0b8'], trim: '#ffffff' }),
  zhao: () => ({ look: { hair: '#2a2230', skin: '#e8b68a', f: 0 }, robe: ['#3a5a8a', '#5a7ab0', '#8aa8d8'], trim: '#dfe7ef' }),
  chu: () => ({ look: { hair: '#1d1a24', skin: '#f2c9a0', f: 0 }, robe: ['#b9b3a5', '#ecebe4', '#ffffff'], trim: '#f4c542' }),
  xue: () => ({ look: { hair: '#2a0c10', skin: '#e0b0a0', f: 0 }, robe: ['#5a0c14', '#8e1a24', '#c83a40'], trim: '#1b1326', extra: { horns: true } }),
  yun: () => ({ look: { hair: '#e9e8f2', skin: '#f6d3b3', f: 0 }, robe: ['#8a92a8', '#c8d0e0', '#ffffff'], trim: '#a8d8ff' }),
};
const ROBES = [['#3a5a3a', '#5a8a4a', '#8ab86a'], ['#5a3a6a', '#8a5aa0', '#b88ad0'], ['#6a4a2a', '#9a7040', '#c8a060'], ['#2a4a6a', '#4a7aa0', '#7aa8d0'], ['#6a2a2a', '#9a4040', '#c87070']];
const RIVAL_PT = { mu: 'mu', zhao: 'zhao', chu: 'tian', xue: 'xue', yun: 'yun' };
function rivalAvImg(rv, w) {
  if (rv.id && RIVAL_PT[rv.id] && ART.portrait) { const alt = rv.id === 'mu' && !!st.p.look.f; return ptHTML(ART.portrait(RIVAL_PT[rv.id], 'n', alt), ['pt', RIVAL_PT[rv.id], 'n', alt ? 1 : 0].join('|'), w, 'vsR'); }
  let h = 0; for (const ch of rv.n) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  if (ART.portraitGen) return ptHTML(ART.portraitGen(h, { f: (h >> 3) % 2, realm: Math.min(8, st.p.r) }, 'n'), 'pg|' + h + '|' + Math.min(8, st.p.r), w, 'vsR');
  let o;
  if (rv.id && RIVAL_LOOK[rv.id]) o = RIVAL_LOOK[rv.id](st.p.look.f);
  else o = { look: { hair: ['#1d1a24', '#3a2a22', '#4a3328'][h % 3], skin: '#e8b68a', f: (h >> 3) % 2 }, robe: ROBES[h % ROBES.length], trim: '#f3ecdc' };
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
function npcAvImg(id, w, mood) {
  if (ART.hasPortrait && ART.hasPortrait(id)) { const alt = (id === 'su' || id === 'ye') && !!st.p.look.f; return ptHTML(ART.portrait(id, mood || 'n', alt), ['pt', id, mood || 'n', alt ? 1 : 0].join('|'), w); }
  const o = NPC_LOOK[id] ? NPC_LOOK[id](st.p.look.f) : NPC_LOOK.chu();
  const c = ART.avatar(o.look, 0, '#3a4a6a', { robe: o.robe, trim: o.trim });
  return `<img class="px" src="${urlOf(c, 'npc|' + id + '|' + st.p.look.f)}" style="${avStyle(c, w)}" alt="">`;
}
function bossImg(k, w) {
  if (ART.boss) { const c = ART.boss(k); if (c) return ptHTML(c, 'bossP|' + k, w, 'vsR', 'background:#2a1420'); }
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
// 灵宠头像：传名册里的一只（或掉落卡的 it：{ sp, form, aw }）画 ART.petCard；传数字是旧的阶图
function petImg(x, w) {
  if (x && typeof x === 'object' && x.sp) { const c = ART.petCard(x.sp, x.form || 0, x.aw); return `<img class="px" src="${urlOf(c, ['pc', x.sp, x.form || 0, x.aw ? 1 : 0].join('|'))}" style="width:${w}px;height:${w}px;vertical-align:middle" alt="">`; }
  const c = ART.pet(x); return `<img class="px" src="${urlOf(c, 'pet' + x)}" style="${avStyle(c, w)};vertical-align:middle" alt="">`;
}
