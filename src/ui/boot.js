/* 废柴仙途 · 界面片段 boot：每周天、主循环、输入、启动
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
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
