/* 废柴仙途 · 界面片段 scene：场景：洞府、历练动画、飘字、横幅、闪屏
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
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
const VISIT_POS = { x: 36, y: 138 };  // 访客站的位置（洞府门口，脚底中心）
let adv = null;
let wipe = 0;
let lastMode = 'home';
const D = () => ART.dims;
// 场景按整数倍放大（DESIGN §5.1）：每个逻辑像素 UPX = round(dpr×2) 个设备像素；宽固定 200，屏幕不足时居中裁到最少 180；
// 高 160～250 自适应，多出的在天空。矮屏（<760）不显示传讯条。
function fitScene() {
  const app = $('#app'), outer = $('#sceneOuter'), wrap = $('#sceneWrap');
  if (!outer) return;
  const dpr = window.devicePixelRatio || 1;
  const short = app.clientHeight < 760;
  app.classList.toggle('short', short);
  const cs = getComputedStyle(app), gap = parseFloat(cs.rowGap) || 6;
  const others = ['#top', '#cult', '#stats', '#goal', '#nav'].reduce((s, q) => s + $(q).offsetHeight, 0);
  const avail = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - others - gap * (short ? 5 : 6) - (short ? 0 : 52);
  let n = UPX;
  const ow = outer.clientWidth || window.innerWidth;
  while (n > 1 && 180 * n / dpr > ow + 0.5) n--;
  const h = Math.max(160, Math.min(250, Math.floor(avail * dpr / n)));
  const u = n / dpr;
  if (h !== H) { H = h; OY = H - 160; cvs.height = H; ctx.imageSmoothingEnabled = false; }
  wrap.style.width = (W * u) + 'px'; wrap.style.height = (H * u) + 'px';
  sceneU = u; sceneCrop = Math.max(0, Math.floor((W * u - ow) / 2 / u));   // 窄屏上场景左右各被裁掉的逻辑像素（对决的血条、名字要躲开）
}
let sceneU = 2, sceneCrop = 0;
function phase() { return ((T / 120000) + 0.42) % 1; }
// 四季按周天（t % 12：1～3 春、4～6 夏、7～9 秋、10～0 冬，calendar.js 的 L.seasonOf），与年历、季节加成一致
function season() { return st ? L.season(st) : 0; }
// ART.drawHome 按 st.year 的小数部分画四季：给它一个只改了 year 的视图，让画面的季节对上 L.season；
// 灵田等级给 0（田改成作物制，由 panel-field.js 的 drawPlots 逐块画 ART.drawPlot）；丹炉也给 0（洞府分地块后丹炉和别的建筑一样由 panel-home.js 的 drawBuildings 摆，ART_API 阶段三·批次六）
function homeView() { return Object.create(st, { year: { value: Math.floor(st.year || 0) + (season() + 0.5) / 4 }, home: { value: Object.assign({}, st.home, { field: 0, furnace: 0 }) } }); }
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
// 吐纳环（DESIGN §3.2）：在洞府打坐时每周天蓄 1/6，蓄满发光，点自己释放。场景内的简画，美术接口到位后可换 ART.drawTunaRing
function drawTunaRing(x, y, part) {
  if (st.p.r > L.MAXR || L.busy(st) || L.isFull(st)) return;
  if (ART.drawTunaRing) { ART.drawTunaRing(x, y, Math.min(1, (st.tuna || 0) / L.TUNA_FULL), T, part); return; }
  if (part === 'front') return;
  const f = Math.min(1, (st.tuna || 0) / L.TUNA_FULL), full = L.tunaReady(st);
  const rx = 17, ry = 4, n = 40, lit = full ? (Math.sin(T / 160) > 0 ? '#fff1a8' : '#8ff5d0') : '#4ccb9f';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 - Math.PI / 2;
    ctx.globalAlpha = i / n < f ? 0.95 : 0.35;
    R(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), 1, 1, i / n < f ? lit : '#5a5280');
  }
  ctx.globalAlpha = 1;
  if (full && Math.random() < 0.15) { const a = Math.random() * 6.28; parts.push({ x: x + Math.cos(a) * rx, y: y + Math.sin(a) * ry, vx: 0, vy: -0.015, life: 700, max: 700, c: '#fff1a8', s: 1 }); }
}
// 闭关：主角身上一层光罩
function drawRetreatFx(x, y) {
  if (!st.retreat) return;
  const S = D().sit, col = st.retreat.kind === 'train' ? '#ffe39a' : '#8ff5d0';
  ART.glow(x, y - S.h / 2, Math.round(S.w * 0.75), col, 0.25 + 0.08 * Math.sin(T / 300));
  if (Math.random() < 0.2) { const a = Math.random() * 6.28, r = 22; parts.push({ x: x + Math.cos(a) * r, y: y - S.h / 2 + Math.sin(a) * r * 0.5, vx: -Math.cos(a) * 0.02, vy: -Math.sin(a) * 0.01, life: 900, max: 900, c: col, s: 1 }); }
}
// 访客：门口一个人（ART.drawVisitor：有半身像的人物画成本人，否则按事件挑凡人 / 修士 / 女修 / 黑衣），头上一个跳动的“！”（点它见访客）
const VISIT_KINDS = ['mortal', 'cult', 'fem', 'dark'];
function visitorKind() {
  const ev = L.visitorEvent(st), who = ev && (ev.npc || ev.speaker);
  if (who && who !== 'elder' && ART.hasPortrait && ART.hasPortrait(who)) return who;
  let h = 0; for (const ch of (st.visitor.id || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return VISIT_KINDS[h % VISIT_KINDS.length];
}
function drawVisitor() {
  if (!st.visitor || st.retreat) return;
  const x = VISIT_POS.x, y = VISIT_POS.y;
  if (ART.drawVisitor) { try { ART.drawVisitor(x, y, visitorKind(), T, { shake: st.visitor.left <= 1 }); return; } catch (e) { /* 退回简画 */ } }
  R(x - 3, y - 15, 6, 6, '#f2c9a0'); R(x - 3, y - 16, 6, 2, '#2a2230');
  R(x - 4, y - 9, 8, 9, '#6a5a8a'); R(x - 4, y - 9, 8, 1, '#8a7aa8'); R(x - 3, y, 2, 1, '#1b1326'); R(x + 1, y, 2, 1, '#1b1326');
  const by = y - 27 + Math.round(Math.abs(Math.sin(T / 260)) * -3);
  R(x - 4, by, 9, 10, '#1b1326'); R(x - 3, by + 1, 7, 8, st.visitor.left <= 1 ? '#ff8a8a' : '#ffe39a'); R(x, by + 2, 1, 4, '#c8323c'); R(x, by + 7, 1, 1, '#c8323c'); R(x - 1, by + 10, 2, 2, '#1b1326');
}
// 戒中老祖说话（提示气泡、引导框）时从戒指里飘出来，停在主角右上方（ART.elderSprite 两帧）
let elderA = 0;
function drawElder(dt) {
  const on = !!st && (!$('#tip').hidden || !$('#guide').hidden) && !cine && !(st.eflags && st.eflags.st_farewell);
  elderA = Math.max(0, Math.min(1, elderA + (on ? dt : -dt) / 400));
  if (!elderA || !ART.elderSprite) return;
  const S = D().sit, x = HOMEPOS.x + S.w / 2 + 10, y = HOMEPOS.y - S.h - 26 + Math.round(Math.sin(T / 500) * 2) + Math.round((1 - elderA) * 10);
  ctx.globalAlpha = elderA;
  ART.glow(x + 12, y + 12, 14, '#a6cdee', 0.25 * elderA);
  ctx.drawImage(ART.elderSprite((T / 600 | 0) % 2), Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
  if (on && Math.random() < 0.05) parts.push({ x: x + 4 + Math.random() * 16, y: y + 24, vx: 0, vy: -0.01, life: 800, max: 800, c: '#c0dcff', s: 1 });
}
// 灵宠：出战的在主角身边、干活的在岗位上（panel-pets.js 的 drawPets）
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
  const r = ART.drawHome(homeView(), T, OY, parts, { phase: phase() });
  drawPlots();
  // 洞府建筑（主角身后的先画）与阵法光圈（后半圈在主角身后、前半圈在前）；没有阵法美术时退回原来的聚灵阵圈
  const bl = drawBuildings('back');
  const zc = ART.drawFormation ? drawZhen('back') : null, col = ART.drawFormation ? zc : drawArray(HOMEPOS.x, HOMEPOS.y - 1);
  seasonFx(r.night);
  if (!cine) drawTunaRing(HOMEPOS.x, HOMEPOS.y, 'back');
  const retArt = !!(st.retreat && ART.drawRetreat && !cine && st.retreat.kind !== 'busy' && st.retreat.kind !== 'teach');
  if (retArt) ART.drawRetreat(T, HOMEPOS.x, HOMEPOS.y, 'back');   // 闭关：身后封印石门
  if (cine) drawCineTarget(); else { if (!retArt) drawRetreatFx(HOMEPOS.x, HOMEPOS.y); drawMeHome(HOMEPOS.x, HOMEPOS.y); }
  if (!cine) drawTunaRing(HOMEPOS.x, HOMEPOS.y, 'front');
  if (retArt) { ART.drawRetreat(T, HOMEPOS.x, HOMEPOS.y, 'front'); if (Math.random() < 0.12) { const a = Math.random() * 6.28; parts.push({ x: HOMEPOS.x + Math.cos(a) * 26, y: HOMEPOS.y - 12 + Math.sin(a) * 12, vx: -Math.cos(a) * 0.01, vy: -0.01, life: 900, max: 900, c: st.retreat.kind === 'train' ? '#ffe39a' : '#8ff5d0', s: 1 }); } }
  if (ART.drawFormation) drawZhen('front');
  bl.push(...drawBuildings('front'));
  drawVisitor();
  drawPets();
  drawElder(dt);
  drawCrane();
  drawParts(dt);
  const lights = (r.lights || []).slice().concat(bl);
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
  const op = L.petOut(st); if (op) ctx.drawImage(ART.petSprite(op.sp, op.form || 0, (T / 400 | 0) % 2, op.aw), px - 16 - 32, py - 26 - 8 + Math.round(Math.sin(T / 300) * 3));
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
  if (e) { const k = Math.min(1, (e.total - e.left + monthAcc / tickMs()) / e.total); R(50, 151, 100, 6, '#1b1326'); R(51, 152, 98 * k, 4, '#f4c542'); R(51, 152, 98 * k, 1, '#fff2a8'); for (let i = 1; i < e.total; i++) R(50 + Math.round(100 * i / e.total), 152, 1, 4, '#1b1326'); }
}

// ---------- 主绘制 ----------
function drawScene(dt) {
  T += dt;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  if (!st) { R(0, 0, W, H, '#120f1c'); return; }
  ctx.setTransform(1, 0, 0, 1, 0, OY);
  const mode = duelFx ? 'duel' : st.run ? 'realm' : st.exp ? 'adv' : 'home';   // duelFx：场景内对决（duel-scene.js）；st.run：秘境（panel-realm.js）
  if (mode !== lastMode) { wipe = mode === 'duel' ? 240 : 700; lastMode = mode; parts.length = 0; adv = mode === 'adv' ? newAdv(st.exp.k) : null; }
  if (mode === 'adv' && !adv) adv = newAdv(st.exp.k);
  if (mode === 'duel') drawDuelScene(dt); else if (mode === 'realm') drawRealmScene(dt); else if (mode === 'adv') drawAdvScene(dt); else drawHomeScene(dt);
  if (wipe > 0) {
    wipe -= dt;
    const cols = Math.ceil(10 * wipe / 700);
    for (let i = 0; i < 10; i++) R(i * 20, -OY, cols * 2, H, '#0b0912');
  }
}
let floatBusy = 0;
const floatQ = [];
function floatText(x, y, text, color, big, small) {
  const now = performance.now();
  if (small && (now < floatBusy || bannerBusy)) return;   // 小浮字让路
  if (!small && now < floatBusy) { if (floatQ.length < 4 && !floatQ.some(f => f[2] === text)) { floatQ.push([x, y, text, color, big, small]); if (floatQ.length === 1) setTimeout(floatNext, floatBusy - now + 20); } return; }
  if (!small) floatBusy = now + 1100;
  floatRaw(x, y, text, color, big, small);
}
function floatNext() { const f = floatQ.shift(); if (!f) return; floatBusy = 0; floatText(...f); if (floatQ.length) setTimeout(floatNext, 1120); }
function floatRaw(x, y, text, color, big, small) {
  const el = document.createElement('div');
  el.className = 'float' + (big ? ' big' : '');
  el.style.left = (x / W * 100).toFixed(2) + '%'; el.style.top = ((y + OY) / H * 100).toFixed(2) + '%'; el.style.color = color || '#fff';
  if (small) el.style.animationDuration = '0.9s';
  el.textContent = text;
  $('#fx').appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
function ringBurst(x, y, c, n) {
  n = n || 28;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; parts.push({ x: x + Math.cos(a) * 6, y: y - 2 + Math.sin(a) * 2, vx: Math.cos(a) * 0.045, vy: Math.sin(a) * 0.012 - 0.004, life: 650, max: 650, c: i % 3 ? c : '#ffffff', s: 1 }); }
}
// 场景顶部的小横幅：一次一条、排队、每条约 1.8 秒（DESIGN §5.2）；同一句话排着的不再重复
const bannerQ = [];
let bannerBusy = false;
function banner(text, sub, color, lock) {
  const key = text + '|' + (sub || '');
  if (bannerQ.some(b => b.key === key)) return;
  bannerQ.push({ key, text, sub, color, lock });
  if (bannerQ.length > 4) bannerQ.splice(0, bannerQ.length - 4);
  if (!bannerBusy) nextBanner();
}
function nextBanner() {
  const o = bannerQ.shift();
  if (!o) { bannerBusy = false; return; }
  bannerBusy = true;
  const b = $('#banner');
  const lk = o.lock && ART.lockBreak ? `<img class="px bnlk" src="${urlOf(ART.lockBreak(0), 'lkb|0')}" style="width:${pxFit(16, 24)}px;height:${pxFit(16, 24)}px" alt="">` : '';
  b.innerHTML = '<span>' + lk + esc(o.text) + '</span>' + (o.sub ? `<small>${esc(o.sub)}</small>` : '');
  b.style.color = o.color || 'var(--gold)';
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  // 碎锁：0 → 1 → 2 → 3（每帧 120 毫秒，横幅飞入后开始），停在碎屑帧
  if (lk) { const im = b.querySelector('.bnlk'), n = ART.lockBreakFrames || 4; for (let f = 1; f < n; f++) setTimeout(() => { if (im.isConnected) im.src = urlOf(ART.lockBreak(f), 'lkb|' + f); }, 300 + f * 120); }
  setTimeout(nextBanner, 1800);
}
// 场景里盖一枚印章（ART.stamp：天甲乙丙丁胜败完 / 完美上中下），在 (x, y) 逻辑坐标处砸下
function stampFx(r, x, y) {
  const c = ART.stamp && ART.stamp(r); if (!c) return;
  const el = document.createElement('img'); el.className = 'px fxstamp'; el.src = urlOf(c, 'stamp|' + r);
  const s = pxFit(24, 48); el.style.width = el.style.height = s + 'px';
  el.style.left = (x / W * 100).toFixed(2) + '%'; el.style.top = ((y + OY) / H * 100).toFixed(2) + '%';
  $('#fx').appendChild(el); shake(); setTimeout(() => el.remove(), 1500);
}
function flash(op) { const f = $('#flash'); f.style.transition = 'none'; f.style.opacity = op || 0.9; requestAnimationFrame(() => { f.style.transition = 'opacity .35s steps(4)'; f.style.opacity = 0; }); }
function shake() { const w = $('#sceneWrap'); w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake'); }
