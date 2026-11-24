/* 废柴仙途 · 界面片段 cine：过场：突破 / 天劫 / 飞升
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
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
