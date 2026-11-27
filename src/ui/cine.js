/* 废柴仙途 · 界面片段 cine：过场：突破 / 天劫 / 飞升
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 金丹起的天劫（startTribCine）：劫云聚拢 → 一道道雷按 L.tribView 的护体曲线落下（护体条、光罩）→ 倒数第二道之前停一下（panel-trib.js 的停顿卡）
 * → L.tribFinish 之后按补完的曲线落最后两道 → 成：光柱与道基印；败：光罩碎裂。筑基仍是旧的聚气动画（startCine）。 */
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
  const c = cine;
  if (c.trib) {
    const showR = c.done && c.res && c.res.ok ? Math.min(c.res.to, 9) : c.fromR;
    let y = HOMEPOS.y;
    if (c.ascend && c.done && c.res && c.res.ok && c.t > c.doneAt + 300) { const k = (c.t - c.doneAt - 300) / 2000; y -= k * k * 170; }
    drawMeHome(HOMEPOS.x, y, showR);
    return;
  }
  const strikeEnd = c.gather + c.strikes * c.gap;
  const showR = c.t > strikeEnd && c.res.ok ? Math.min(c.res.to, 9) : c.fromR;
  let y = HOMEPOS.y;
  if (c.res.ascend && c.res.ok && c.t > strikeEnd + 300) { const k = (c.t - strikeEnd - 300) / 2000; y -= k * k * 170; }
  drawMeHome(HOMEPOS.x, y, showR);
}
// ---------- 天劫过场 ----------
// v = L.tribView：N 道雷、停顿前的护体曲线、停在第 pauseAfter 道之后、老祖的提示与红线
function startTribCine(v) {
  cine = { trib: true, v, t: 0, N: v.N, fromR: v.from, ascend: v.ascend, gather: 1500, gap: 900, idx: 0, next: 1500, curve: v.curve, shield: 1, lag: 1, hitT: 0,
    paused: false, pauseAt: 0, res: null, bolt: null, done: false, doneAt: 0, end: 0, mark: null };
  $('#tip').hidden = true;
  SFX.rumble();
}
const BOLT_MS = 560, BOLT_HIT = 0.15 * BOLT_MS;
function drawTribCine(dt) {
  const c = cine, x = HOMEPOS.x, feet = HOMEPOS.y;
  if (!c.paused) c.t += dt;
  // 劫云：开渡时聚拢，结束后散开（画在场景之上，人物再画一遍盖在云的暗影上）
  const kc = Math.min(1, c.t / c.gather) * (c.done ? Math.max(0, 1 - (c.t - c.doneAt - 400) / 900) : 1);
  ART.drawTribClouds(T, OY, kc);
  drawCineTarget();
  // 落雷：第 idx+1 道到点就劈；停顿前最后一道劈完 0.75 秒停下等停顿卡
  if (!c.paused && !c.done && c.idx < c.N && c.t >= c.next && !(c.idx === c.v.pauseAfter && !c.out)) {
    c.idx++;
    const last = c.idx === c.N;
    c.bolt = { t0: c.t, seed: c.v.seed + c.idx * 7, lvl: last ? 3 : Math.min(2, Math.floor((c.idx - 1) * 3 / Math.max(1, c.N - 1))), hit: false, i: c.idx, last };
    if (c.idx === c.v.pauseAfter && !c.out) c.pauseAt = c.t + 750;
    else c.next = c.t + (c.idx === c.N - 1 ? c.gap * 1.35 : c.gap);
  }
  if (c.bolt) {
    const b = c.bolt, k = (c.t - b.t0) / BOLT_MS;
    if (!b.hit && c.t - b.t0 >= BOLT_HIT) {
      b.hit = true; c.lag = Math.max(c.lag, c.shield); c.shield = c.curve[b.i]; c.hitT = 180;
      shake(); SFX.thunder(); if (b.last) flash(0.5);
      floatText(x, -OY + 40, `第 ${b.i} / ${c.N} 道`, b.last ? '#ff9a8a' : '#e9e3ff', b.last, !b.last);
      for (let j = 0; j < 10; j++) { const a = Math.random() * Math.PI, v = 0.03 + Math.random() * 0.05; parts.push({ x: x + (Math.random() - 0.5) * 20, y: feet - 28, vx: Math.cos(a) * v * (Math.random() < 0.5 ? -1 : 1), vy: -Math.sin(a) * v, g: 0.0002, life: 500, max: 500, c: j % 2 ? '#ffffff' : '#fff6a8', s: 1, glow: 1 }); }
      if (b.last) c.resolveAt = c.t + 520;
    }
    const broke = b.last && b.hit && c.out && !c.out.ok;
    if (k < 1) ART.drawTribBolt(x + ((b.seed % 5) - 2), -OY + 6, broke ? feet - 10 : feet - 28, k, b.seed, b.lvl);
    else c.bolt = null;
  }
  if (c.hitT > 0) c.hitT -= dt;
  if (c.lag > c.shield) c.lag = Math.max(c.shield, c.lag - dt * 0.0005);
  // 护体光罩（人物脚底为圆心）与护体条（场景顶部；停顿之后画上老祖估的红线）
  if (c.t > 500 && (!c.done || (c.res && c.res.ok && c.t < c.doneAt + 900))) ART.drawShield(x, feet, c.shield, T, c.hitT > 0);
  if (c.t > 300 && !(c.done && c.t > c.doneAt + 1400)) ART.drawShieldBar(52, -OY + 4, 96, c.shield, Object.assign({ lag: c.lag }, c.idx >= c.v.pauseAfter && (c.paused || c.out) ? { mark: c.v.hint.mark } : {}));
  // 停顿
  if (!c.paused && !c.out && c.pauseAt && c.t >= c.pauseAt) { c.paused = true; c.pauseAt = 0; pushPauseCard(); }
  // 结果
  if (c.resolveAt && c.t >= c.resolveAt && !c.done) {
    // 最后一道落下才真正结算（与停顿时看到的 L.tribPreview 一致）
    c.res = L.tribFinish(st, c.ex || {});
    if (!c.res) { cine = null; return; }
    saveLocal();
    c.done = true; c.doneAt = c.t; c.end = c.t + (c.ascend && c.res.ok ? 3000 : 2100);
    const y = feet - D().sit.h / 2;
    if (c.res.ok) {
      flash(1); SFX.btOk();
      for (let k = 0; k < 70; k++) { const a = Math.random() * Math.PI * 2, v = 0.02 + Math.random() * 0.06; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, g: 0.00005, life: 1300, max: 1300, c: k % 3 ? '#ffe39a' : '#ffffff', s: k % 4 ? 1 : 2, glow: 1 }); }
      if (c.ascend) { SFX.gong(); banner('白日飞升', st.p.name + ' 渡过九九天劫！', '#fff6c0'); }
      else banner('渡劫成功', `${L.REALMS[c.res.to].n}期 · 评价「${c.res.tb.grade}」${c.res.dan ? ' · ' + c.res.dan : ''}`);
    } else {
      SFX.btFail();
      for (let k = 0; k < 40; k++) { const a = Math.random() * Math.PI * 2, v = 0.02 + Math.random() * 0.05; parts.push({ x: x + Math.cos(a) * 20, y: feet - 12 + Math.sin(a) * 10, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.01, g: 0.0002, life: 900, max: 900, c: k % 2 ? '#ffb23f' : '#ff6b3a', s: 1, glow: 1 }); }
      banner('渡劫失败', '护体碎了，来日再战', '#ff8a8a');
    }
  }
  if (c.done && c.res.ok) {
    // 光柱，然后是道基印
    const k = Math.min(1, (c.t - c.doneAt) / 300) * Math.max(0, 1 - (c.t - c.doneAt - (c.ascend ? 2400 : 900)) / 400);
    const w = (c.ascend ? 18 : 10) * k;
    ctx.globalAlpha = 0.55 * k; R(x - w / 2, -OY, w, feet + 16 + OY, '#fff1a8'); ctx.globalAlpha = 0.9 * k; R(x - w / 6, -OY, w / 3, feet + 16 + OY, '#ffffff'); ctx.globalAlpha = 1;
    const g = c.res.tb.grade, sc = c.t - c.doneAt - 500;
    if (g && sc > 0 && !c.ascend) { const z = sc < 200 ? 3 - sc / 100 : 1; const S = ART.stamp(g); if (S) { const sw = Math.round(24 * z); ctx.globalAlpha = Math.min(1, sc / 150); ctx.drawImage(S, Math.round(x + 18 - sw / 2), Math.round(feet - 62 - sw / 2), sw, sw); ctx.globalAlpha = 1; } }
  }
  if (c.done && c.t >= c.end) { const done = cine; cine = null; afterBreakthrough(done.res); }
}
// 停顿卡要等弹窗空出来再弹（老祖的讲解在它之后）
function pushPauseCard() { if ($('#modal').hidden) showTribPause(); else setTimeout(pushPauseCard, 200); }
function drawCine(dt) {
  if (cine.trib) { drawTribCine(dt); return; }
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
    for (let k = 0; k < 3; k++) { const a = Math.random() * Math.PI * 2, r = 34 + Math.random() * 20; parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.5, vx: -Math.cos(a) * r / 600, vy: -Math.sin(a) * r * 0.5 / 600, life: 600, max: 600, c: '#9ff5d8', s: 1, glow: 1 }); }
  }
  if (c.t >= strikeEnd && !c.resolved) {
    c.resolved = true;
    if (c.res.ok) {
      flash(1); SFX.btOk();
      for (let k = 0; k < 70; k++) { const a = Math.random() * Math.PI * 2, v = 0.02 + Math.random() * 0.06; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.02, g: 0.00005, life: 1300, max: 1300, c: k % 3 ? '#ffe39a' : '#ffffff', s: k % 4 ? 1 : 2, glow: 1 }); }
      if (c.res.ascend) { SFX.gong(); banner('白日飞升', st.p.name + ' 渡过九九天劫！', '#fff6c0'); }
      else banner('突破成功', `${L.REALMS[c.res.to].n}期 · 寿元 ${fmt(c.res.lifeAfter)} 年`);
    } else {
      SFX.btFail();
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
