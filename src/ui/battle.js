/* 废柴仙途 · 界面片段 battle：历练的节点与战斗画面（docs/COMBAT_LOOT.md §2；示意图 docs/combat_mock/02_battle.png、03_battle_ult.png）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 *   主循环（boot.js 的 frame）在历练有节点表时调 btDrive(ms)：一趟当场打完，不占时间（docs/AP_PLAN.md §2.3）——走路 1.5 秒 → 战斗（每轮 1.0 秒 ÷ 战斗速度 ×1 / ×2）→ L.tripStep 推一个节点；
 *   途中遭遇（L.tripStep 给的 enc）当场出抉择；最后一个节点打完 L.tripEnd 结算，结算卡、翻牌和它引出的戏由结算链（settle.js 的 settle）一张接一张出。
 *   引擎是逻辑层的 L.battleStep（src/logic/battle.js）；这里只把事件数组演出来：小人帧、ART.skillFx / ultFx、飘字、血条与罩格、冷却、怒气。
 *   输入三个：大按钮（绝招）、丹、撤。关键时刻（怒气满且对面在蓄力）：第一章停住等你，之后 2.5 秒慢镜头。
 *   第一次看到蓄力 / 罩 / 克制 / 怒气满，各停一次、屏幕中央一行字（st.flags.btSeen），不出老祖对话框。
 *   画面下方 #bt（样式前缀 .bt-，追加在 template.html 末尾）在战斗时顶替修为条与数值格（body.bt-on）。 */
const BTS = { round: 1000, first: 1400, walk: 1500, gather: 2400, end: 650, slow: 2500, hint: 2600, xMe: 56, foot: 128, xFoe: 134, gapFoe: 32 };
let btv = null;
const battleRunning = () => !!(st && (st.exp || (btv && btv.mode === 'boss')));
const btOn = () => !!(st && ((st.exp && st.exp.nodes && L.TRIP_ON !== false && !st.run) || (btv && btv.mode === 'boss')));
// 首领战（§8.4 P0）：花 1 点（AP_PLAN §2.2）；打完把结果交给 L.act(st, 'boss', { k, res })（settle.js 让 'boss' 透传 res 给 L.fightBoss）
function btBossStart(k) {
  if (!st || L.busy(st) || !L.bossReady(st, k) || chainOn) return false;
  const why = L.apWhy(st, 'boss', { k }); if (why) { sayLine(why); SFX.fail(); return false; }
  btv = { mode: 'boss', k, e: null, ph: 'fight', t: 0, acc: BTS.round * 0.5, B: L.bossBattle(st, k), fx: [], hold: null, q: {}, meAct: -1e9, meHit: -1e9, foeAct: {}, foeHit: {}, deadAt: {}, scroll: 0, log: '' };
  btv.B.foes.forEach(f => { (st.meta.foes || (st.meta.foes = {}))[f.id] = 1; });
  btLog(`${L.BOSSES[k].n}：“${L.BOSSES[k].line}”`);
  SFX.gong(); shake();
  if (btv.B.foes[0].sh > 0 && btFirst('shield')) btHold('克制的招才能削罩', BTS.hint);
  btShow(true);
  updateHUD();
  return true;
}
function btBossEnd() {
  const v = btv, k = v.k, res = L.battleResult(v.B);
  btStop();
  const out = L.act(st, 'boss', { k, res });
  if (!out) { const o2 = L.fightBoss(st, k, { res }); if (o2 && typeof bossResultUI === 'function') bossResultUI(k, o2); updateHUD(); return; }   // 点不够等（出发前判过，不该走到这里）
  updateHUD();
  settle('act');   // 首领结果卡（L.act 排进结算链）→ 它引出的戏（boss:N）
}
const btRegion = () => (btv && btv.mode === 'boss' ? btv.k : st.exp ? st.exp.k : 0);
const btSeenMap = () => (st.flags.btSeen || (st.flags.btSeen = {}));
function btFirst(k) { const m = btSeenMap(); if (m[k]) return false; m[k] = 1; return true; }
const btCh1 = () => !st.pact && (st.rebirth || 0) === 0;
const btAutoUlt = () => !btCh1() && !!st.flags.autoUlt;
function btReset() { btv = { e: st.exp, ph: 'walk', t: 0, acc: 0, B: null, fx: [], hold: null, q: {}, meAct: -1e9, meHit: -1e9, foeAct: {}, foeHit: {}, deadAt: {}, scroll: 0, log: '', key: '' }; }
// 主循环：返回 true = 这一帧的时间被历练节点吃掉了（不按秒走月）
function btDrive(ms) {
  if (!btOn()) { if (btv) btStop(); return false; }
  if (btv && btv.mode === 'boss') {
    const v = btv;
    if (v.hold) { if (v.hold.auto) { v.hold.left -= ms; if (v.hold.left <= 0) btRelease(); } btPaint(); return true; }
    v.t += ms;
    if (v.ph === 'fight') { v.acc += ms; if (v.acc >= BTS.round) { v.acc = 0; btRound(); } }
    else if (v.ph === 'end' && v.t >= BTS.end + 400) btBossEnd();
    btPaint();
    return true;
  }
  if (!btv || btv.e !== st.exp) { btReset(); btShow(true); }
  const v = btv, e = st.exp;
  if (v.hold) { if (v.hold.auto) { v.hold.left -= ms; if (v.hold.left <= 0) btRelease(); } btPaint(); return true; }
  v.t += ms;
  const n = e.nodes[e.ni];
  if (!n) { btNode(undefined); return true; }
  if (v.ph === 'walk') {
    v.scroll += ms * 0.035;
    const dur = e.quick ? 250 : L.nodeIsFight(n) || n.t === 'home' ? BTS.walk : BTS.gather;
    if (v.t >= dur) {
      if (L.nodeIsFight(n)) btBegin();
      else {
        if (n.t === 'treasure') { floatRaw(BTS.xMe + 30, 92, '宝箱！归来多翻一张牌', '#ffe39a'); SFX.reveal(2); }
        else if (n.t === 'herb') { floatRaw(BTS.xMe + 20, 92, '采得灵草', '#8ff5d0'); SFX.coin(); }
        btNode(null);
      }
    }
  } else if (v.ph === 'fight') {
    v.acc += ms;
    if (v.acc >= (v.first ? BTS.first : BTS.round)) { v.acc = 0; btRound(); }
  } else if (v.ph === 'end') {
    if (v.t >= BTS.end) btNode(L.battleResult(v.B));
  }
  btPaint();
  return true;
}
// 一个节点打完（res：这一场的结果；非战斗节点 null）：L.tripStep 推进。途中遭遇当场出抉择（弹窗开着时主循环不推，选完接着走）；走完就结算
function btNode(res) {
  if (btv) { btv.ph = 'walk'; btv.t = 0; btv.B = null; }
  const x = L.tripStep(st, res);
  if (x.enc) {
    if (st.guide && !st.guide.done) st.exp.encDone = 1;
    else { saveLocal(); showTripEncounter(x.enc); }
  }
  if (x.done || !st.exp || L.tripDone(st)) { tripFinish(); return; }
  if (!btOn()) btStop(); else btShow();
}
function showTripEncounter(ev) {
  showChoice(ev, () => {
    // “作罢”也已经处理完。选过的奇遇由 L.resolveChoice 记 encDone。
    if (st.exp && st.exp.encEv === ev.id && !st.exp.encDone) {
      st.exp.encDone = 1;
      saveLocal();
    }
    closeModal();
  });
}
// 这一趟走完：结算（L.tripEnd：结算对象排进结算链）→ 结算链（结算卡 + 翻牌 → 它引出的戏 → 解锁卡）
function tripFinish() {
  btStop();
  if (!st.exp) return;
  const r = L.tripEnd(st);
  if (r) seasonLog.push(r.sweep ? '扫荡' : '历练 · ' + L.RATINGS[r.rating]);
  updateHUD();
  settle('act');
}
function btBegin() {
  const v = btv, e = st.exp;
  v.B = L.expBattle(st);
  if (!v.B) { btNode(null); return; }
  v.ph = 'fight'; v.t = 0; v.acc = BTS.round * 0.5; v.deadAt = {}; v.foeAct = {}; v.foeHit = {}; v.fx = [];
  v.first = L.tripSeq(st) === 1 && e.ni === 0;
  // 速战（§2.2）：同一套引擎瞬间算完，只给这一场 1 秒的结果条
  if (e.quick) {
    const r = L.battleAuto(v.B, 'smart');
    v.ph = 'end'; v.t = -350;
    btLog(`第 ${e.nodes.slice(0, e.ni + 1).filter(L.nodeIsFight).length} 场 ${r.win ? '胜' : r.dead ? '败' : '撤'} · 剩气血 ${Math.round(r.hp * 100)}%${r.brk ? ' · 破招' : ''}`);
    if (r.win) SFX.coin(); else SFX.fail();
    btShow(); return;
  }
  const f0 = v.B.foes[0];
  if (f0.kind !== 'mob') { floatRaw(BTS.xFoe, 64, `${f0.kind === 'boss' ? '首领' : '精英'} · ${f0.n}`, '#ff9a8a', true); shake(); }
  btLog(`${v.B.foes.map(f => f.n).join('、')}${v.B.foes.length > 1 ? '' : ''}拦路 · ${v.B.momText}`);
  SFX.gong();
  // 第一次见罩：停一次
  if (v.B.foes.some(f => f.sh > 0) && btFirst('shield')) btHold('克制的招才能削罩', BTS.hint);
  void f0;
  btShow();
}
function btRound() {
  const v = btv, B = v.B;
  if (!B || B.done) return;
  const charging = B.foes.some(f => f.hp > 0 && f.charge);
  // 怒气第一次满：停住等你按（人生第一场）
  if (B.rage >= 100 && !v.q.ult && !btAutoUlt() && btFirst('rage')) { btHold(BT_RAGE, 0); return; }
  // 关键时刻：对面蓄力、你的怒气满着
  if (B.rage >= 100 && charging && !v.q.ult && !btAutoUlt() && !v.keyDone) {
    v.keyDone = true;
    if (btCh1()) { btHold('放绝招，或者硬吃这一下', 0); return; }
    btHold('它在蓄力！', BTS.slow); return;
  }
  const inp = { ult: !!v.q.ult || (btAutoUlt() && B.rage >= 100), pill: !!v.q.pill, flee: !!v.q.flee };
  v.q = {};
  if (!charging) v.keyDone = false;
  const ev = L.battleStep(B, inp);
  btPlay(ev);
  if (B.done) { v.ph = 'end'; v.t = 0; if (B.win) { if (v.mode === 'boss') SFX.victory(); else SFX.win(); } else if (B.dead) { SFX.defeat(); shake(); } }
}
const BT_RAGE = '怒气满了：按大按钮';
// 点停顿那一行（或点画面）：放过去；“怒气满了”那一次只能按大按钮
function btTapHold() { if (btv && btv.hold && btv.hold.text && btv.hold.text !== BT_RAGE) { btRelease(); SFX.tap(); return true; } return !!(btv && btv.hold); }
function btHold(text, auto) { btv.hold = { text, auto, left: auto }; btShow(); btCenter(text); SFX.reveal(1); }
function btRelease() { if (!btv || !btv.hold) return; btv.hold = null; btv.acc = 1e9; btShow(); btCenter(''); }
// 停顿时屏幕中央的一行字（≤ 12 字，§2.2“第一次看得懂”）：盖在场景上，点画面或点下面那一行放过去
function btCenter(t) {
  let el = $('#btCenter');
  if (!el) { el = document.createElement('div'); el.id = 'btCenter'; el.className = 'bt-center'; $('#sceneWrap').appendChild(el); }
  el.textContent = t || ''; el.hidden = !t;
}
// 输入
function btUlt() {
  const v = btv; if (!v || !v.B || v.ph !== 'fight' || v.B.rage < 100) return;
  const go = () => { v.q.ult = true; btRelease(); v.acc = 1e9; };
  // 人生第一次放绝招：线 C3 的过场②（有就播，播完再出招）
  if (btFirst('ultCine') && typeof playCine === 'function') {
    v.hold = { text: '', auto: 0 };
    try { Promise.resolve(playCine('ult', {})).then(go, go); } catch (err) { go(); }
    return;
  }
  go();
}
function btPill() { const v = btv; if (!v || !v.B || v.B.pillUsed || v.B.pills <= 0) return; v.q.pill = true; btRelease(); SFX.tap(); }
function btFlee() { const v = btv; if (!v || !v.B || v.ph !== 'fight') return; v.q.flee = true; btRelease(); SFX.tap(); }
// ---------- 事件演出 ----------
function btFoeX(B, i) { return BTS.xFoe + i * BTS.gapFoe - (B.foes.length > 2 ? 22 : 0); }
function btPlay(ev) {
  const v = btv, B = v.B, now = T;
  let line = '';
  for (const x of ev) {
    const fi = typeof x.who === 'number' ? x.who : -1, fx = fi >= 0 ? btFoeX(B, fi) : BTS.xMe, fy = BTS.foot - 34;
    switch (x.t) {
      case 'hit': case 'skill': case 'ult': {
        v.meAct = now;
        const tx = btFoeX(B, x.tgt >= 0 ? x.tgt : 0);
        if (x.t === 'ult') { v.fx.push({ ult: true, x: tx, t0: now }); flash(0.5); shake(); SFX.ult(); }
        else if (x.t === 'skill') { v.fx.push({ name: x.fx || (ART.skillFxOf ? ART.skillFxOf(x.el) : 'slash'), el: x.el, x: tx, t0: now }); SFX.skill(x.el); }
        else SFX.hit();
        if (x.crit) SFX.crit();
        v.foeHit[x.tgt] = now;
        floatRaw(tx, fy - 6, (x.crit ? '暴 ' : '') + fmt(x.dmg), x.crit ? '#ffe39a' : '#ffffff', x.t === 'ult' || x.crit, x.t === 'hit');
        if (x.t !== 'hit') { line = `${x.n} ${fmt(x.dmg)}`; floatRaw(BTS.xMe + 4, fy - 30, x.n, x.t === 'ult' ? '#ffe39a' : '#fff2a8', x.t === 'ult', x.t !== 'ult'); btFire(x.id); }
        break;
      }
      case 'ke': SFX.ke(); floatRaw(fx + 8, fy - 22, '克', '#ffe39a', true); line += ` · 克${L.elName(B.foes[fi].el)} ×1.3`; if (btFirst('ke')) btHold('克！伤害 ×1.3', BTS.hint); break;
      case 'beike': SFX.beike(); floatRaw(fx + 8, fy - 18, '打不动', '#9d93b8', false, true); line += ' · 打不动'; break;
      case 'chain': floatRaw(BTS.xMe + 10, fy - 26, '连携', '#8ff5d0', true); line += ' · 连携'; if (st.pact && btFirst('chain')) btHold(`相生连携：${L.elName(x.el)}招 ×1.3`, BTS.hint); break;
      case 'shield': SFX.shieldCut(); line += ` · 削罩 ${x.cut} 格（还剩 ${x.sh}）`; break;
      case 'break': v.fx.push({ name: 'brk', el: '', x: fx, t0: now }); floatRaw(fx, fy - 28, '罩碎', '#7fe0f0', true); shake(); SFX.shieldBreak(); break;
      case 'brk': floatRaw(fx, fy - 30, '破招', '#ffe39a', true); flash(0.7); SFX.brk(); line = '破招！重击被打断'; break;
      case 'charge': SFX.charge(); floatRaw(fx, fy - 26, x.n || '蓄力！', '#ff6a5a', true); v.foeAct[fi] = now; if (btFirst('charge')) btHold('它在蓄力：放绝招打断它', BTS.hint); line = `${B.foes[fi].n}在蓄力`; break;
      case 'fhit': case 'heavy': v.foeAct[fi] = now; v.meHit = now; if (x.ke) { const hb = $('#btHp'); if (hb && hb.parentNode) { hb.parentNode.classList.remove('kehit'); void hb.parentNode.offsetWidth; hb.parentNode.classList.add('kehit'); } } floatRaw(BTS.xMe, fy - 4, '−' + fmt(x.dmg), x.t === 'heavy' ? '#ff6a5a' : '#ffb0a8', x.t === 'heavy', x.t !== 'heavy'); if (x.t !== 'heavy') SFX.hurt(); if (x.t === 'heavy') { shake(); SFX.heavy(); line = `重击 −${fmt(x.dmg)}`; } break;
      case 'dot': floatRaw(fx, fy, fmt(x.dmg), '#ff9a4a', false, true); break;
      case 'dead': if (x.who === 'me') { line = '你倒下了'; } else { v.deadAt[fi] = now; SFX.kill(); } break;
      case 'pill': SFX.heal(); floatRaw(BTS.xMe, fy - 10, '+' + fmt(x.dmg), '#8ff5d0', true); line = `吞下疗伤丹 +${fmt(x.dmg)}`; break;
      case 'heal': floatRaw(BTS.xMe, fy - 10, '+' + fmt(x.dmg), '#8ff5d0', false, true); break;
      case 'summon': line = x.n; break;
      case 'miss': case 'guard': case 'budong': case 'escape': case 'exec': case 'root': case 'stun': case 'spread': floatRaw(fi >= 0 ? fx : BTS.xMe, fy - 20, x.n || { root: '缠住', stun: '晕', exec: '斩杀' }[x.t] || '', '#fff2a8', false, true); break;
      case 'burst': floatRaw(fx, fy - 24, '引爆 ' + fmt(x.dmg), '#ffe39a', true); break;
      case 'flee': SFX.flee(); line = '撤！带着到手的东西回去'; break;
      case 'timeout': line = '久战不下，撤了'; break;
      case 'win': line = line || '赢了'; break;
    }
  }
  if (line) btLog(line.replace(/^ · /, ''));
}
function btLog(t) { if (btv) btv.log = t; const el = $('#btLog'); if (el) el.textContent = t; }
// ---------- 场景（scene.js 的 drawAdvScene 在有节点表时调这里） ----------
function btFoeSprite(f, frame, rg) {
  const fc = f.tint ? [f.tint, hexMix(f.tint, '#1b1326', 0.4)] : rg.fc;
  const a = f.art || 'man';
  if (a === 'wolf') return { c: ART.wolf(fc), ax: 14, ay: 16 };
  if (a.startsWith('mob:') && ART.mob) { const D0 = ART.dims.mob; return { c: ART.mob(a.slice(4), frame), ax: D0.ax, ay: D0.ay }; }
  if (a.startsWith('boss:') && ART.bossFighter) { const k = +a.slice(5), sp = { boss: k }, Dm = ftDims(sp); return { c: ftCanvas(sp, frame ? 'idle1' : 'idle0', true), ax: Dm.w - 1 - Dm.ax, ay: Dm.ay }; }
  if (a === 'orb' || a === 'snake') return { draw: a, fc };
  return { c: ART.foeMan(fc, rg.bg), ax: 12, ay: 37 };
}
function drawBtScene(dt) {
  const v = btv, rg = L.REGIONS[btRegion()], foot = BTS.foot, now = T;
  ART.drawAdventure(rg.bg, T, OY, v.scroll);
  const fight = v.ph !== 'walk' && v.B;
  // 我
  const FD = ART.dims.fighter, sp = ftMe();
  let frame = (T / 420 | 0) % 2 ? 'idle1' : 'idle0', mx = BTS.xMe;
  if (fight) {
    const ka = (now - v.meAct) / 380, kh = (now - v.meHit) / 300;
    if (v.B.dead && v.ph === 'end') frame = 'down';
    else if (ka >= 0 && ka < 1) { frame = ka < 0.3 ? 'windup' : 'strike'; mx += ka < 0.3 ? -3 : Math.round(18 * Math.sin(Math.PI * Math.min(1, (ka - 0.3) / 0.7))); }
    else if (kh >= 0 && kh < 1) { frame = 'hit'; mx -= 4; }
  } else mx += Math.round(Math.sin(T / 180) * 1);
  ctx.drawImage(ftCanvas(sp, frame, false), mx - FD.ax, foot - FD.ay);
  if (!fight) { drawParts(dt); btPathOnScene(); return; }
  // 敌人
  const B = v.B, fr = (T / 400 | 0) % 2;
  B.foes.forEach((f, i) => {
    const dAt = v.deadAt[i];
    if (f.hp <= 0 && dAt !== undefined && now - dAt > 500) return;
    let x = btFoeX(B, i);
    const ka = (now - (v.foeAct[i] || -1e9)) / 380, kh = (now - (v.foeHit[i] || -1e9)) / 260;
    if (ka >= 0 && ka < 1 && !f.charge) x -= Math.round(14 * Math.sin(Math.PI * ka));
    if (f.aura && ART.eliteAura) ctx.drawImage(ART.eliteAura(f.el, fr), x - 20, foot - 4);
    ctx.globalAlpha = f.hp <= 0 ? Math.max(0, 1 - (now - dAt) / 500) : kh >= 0 && kh < 1 && (T / 60 | 0) % 2 ? 0.5 : 1;
    const S = btFoeSprite(f, fr, rg);
    if (S.draw === 'orb') ART.drawOrb(x, foot - 18, T, S.fc, kh >= 0 && kh < 1);
    else if (S.draw === 'snake') ART.drawSnake(x, foot - 8, T, S.fc, kh >= 0 && kh < 1);
    else ctx.drawImage(S.c, Math.round(x - S.ax), Math.round(foot - S.ay + (f.charge && fr ? -1 : 0)));
    ctx.globalAlpha = 1;
    if (f.hp <= 0) return;
    // 血条、罩格、五行徽、蓄力
    const top = foot - (S.ay || 24) - 10, bw = B.foes.length > 1 ? 20 : 26, bx = Math.round(x - bw / 2);
    R(bx - 1, top - 1, bw + 2, 5, '#1b1326'); R(bx, top, bw, 3, '#3a3155'); R(bx, top, Math.max(0, Math.round(bw * f.hp / f.max)), 3, f.kind === 'mob' ? '#e06a5a' : '#ff4a4a');
    hdBarFx(bx, top, Math.round(bw * f.hp / f.max), 3, '#ffc8b8', '#5a1020');   // 高清：上沿受光、下沿压暗（scene.js）
    if (ART.elemBadge && f.el) ctx.drawImage(ART.elemBadge(f.el), bx - 11, top - 4);
    if (ART.shieldPip && f.shMax) for (let j = 0; j < f.shMax; j++) ctx.drawImage(ART.shieldPip(j < f.sh), bx + j * 8, top - 10);
    if (f.charge) { R(x + 12, top - 12, 3, 7, '#ff4a4a'); R(x + 12, top - 4, 3, 2, '#ff4a4a'); }
  });
  // 招式特效
  for (let i = v.fx.length - 1; i >= 0; i--) {
    const z = v.fx[i], k = now - z.t0;
    if (z.ult) { const f = k / 110 | 0; if (f >= 6 || !ART.ultFx) { v.fx.splice(i, 1); continue; } ctx.drawImage(ART.ultFx(f), z.x - 32, foot - 92); continue; }
    const f = k / 90 | 0; if (f >= 4 || !ART.skillFx) { v.fx.splice(i, 1); continue; }
    ctx.drawImage(ART.skillFx(z.name, f, z.el || undefined), z.x - 24, foot - 44);
  }
  drawParts(dt);
  btPathOnScene();
}
// 场景底部：行程条的小版（DOM 里另有一条大的）
function btPathOnScene() {
  const e = st.exp; if (!e || !e.nodes || !e.nodes.length) return;
  const n = e.nodes.length;
  const x0 = 50, w = 100;
  R(x0, 151, w, 6, '#1b1326');
  for (let i = 0; i < n; i++) { const x = x0 + Math.round(w * i / n) + 1, ww = Math.round(w / n) - 2; R(x, 152, ww, 4, i < e.ni ? '#4ccb9f' : i === e.ni ? '#f4c542' : '#3a3155'); hdBarFx(x, 152, ww, 4, i < e.ni ? '#d8fff0' : i === e.ni ? '#fffbe0' : '#55506e', '#0b0912'); if (i === e.ni) hdLit(x + ww / 2, 154, 5, '#ffe39a', 0.4 + 0.15 * Math.sin(T / 300)); }   // 高清：每格补受光 / 暗线，走到的那一格亮一盏灯
}
// ---------- 画面下方的 #bt ----------
function btEl() {
  let el = $('#bt');
  if (!el) {
    el = document.createElement('div'); el.id = 'bt'; el.hidden = true;
    const after = $('#cult'); after.parentNode.insertBefore(el, after);
    if (sceneRO) sceneRO.observe(el);   // 战斗条高度变了（换行、出“点一下继续”）场景跟着排（scene.js）
    el.addEventListener('click', ev => {
      const b = ev.target.closest('[data-bt]'); if (!b || b.disabled) return;
      ac(); const k = b.dataset.bt;
      if (k === 'ult') btUlt(); else if (k === 'pill') btPill(); else if (k === 'flee') btFlee(); else if (k === 'auto') { st.flags.autoUlt = st.flags.autoUlt ? 0 : 1; btShow(true); }
      else if (k === 'spd') { btSpeed = btSpeed > 1 ? 1 : 2; savePref(); btShow(true); }   // 战斗速度 ×1 / ×2（只影响演出；第一章不显示）
      else if (k === 'go') btTapHold();
    });
  }
  return el;
}
function btStop() {
  btv = null; btCenter('');
  const el = $('#bt'); if (el && !el.hidden) { el.hidden = true; document.body.classList.remove('bt-on'); fitScene(); }
}
const BT_SK_KIND = { z: 'zhan', w: 'qi', mi: 'mi' };
function btSkillIcon(s) {
  if (!ART.skillIcon) return '';
  const c = ART.skillIcon(s.el || '', s.kind === 'ult' ? 'ult' : BT_SK_KIND[s.kind] || 'zhan'), z = pxFit(16, 32);
  return `<img class="px" src="${urlOf(c, 'sk|' + (s.el || '') + s.kind)}" style="width:${z}px;height:${z}px" alt="">`;
}
// 整块重画（节点、技能格变了才重画；血条、怒气、冷却每帧只改宽度和数字）
function btShow(force) {
  if (!btOn()) return;
  const el = btEl(), v = btv, B = v && v.B;
  const e = v && v.mode === 'boss' ? { ni: 0, nodes: [{ t: 'boss' }], hp: 1, rage: 0 } : st.exp;
  const fresh = el.hidden;
  if (fresh) { el.hidden = false; document.body.classList.add('bt-on'); }
  const me = B ? B.me : L.btMe(st);
  const key = [e.ni, v && v.ph, B ? 1 : 0, me.skills.map(s => s.id).join(), v && v.hold ? v.hold.text : '', st.flags.autoUlt, btCh1(), B ? B.pills : 0, btSpeed].join('|');
  if (!force && el._k === key) { btPaint(); return; }
  el._k = key;
  const path = e.nodes.map((n, i) => `${i ? `<i class="bt-ln${i <= e.ni ? ' ok' : ''}"></i>` : ''}<b class="bt-nd${i < e.ni ? ' ok' : i === e.ni ? ' now' : ''}${n.t === 'elite' || n.t === 'boss' ? ' el' : ''}">${L.NODE_N[n.t]}</b>`).join('');
  const slots = [['z', '战技'], ['w', '器技'], ['mi', '秘术']].map(([k, nm]) => {
    const s = me.skills.find(x => x.kind === k);
    if (!s) return `<div class="bt-sk lk"><span class="bt-ic"></span><span>${nm}</span><small>${k === 'mi' ? '金丹开' : k === 'w' ? '没有兵器' : '还没有'}</small></div>`;
    return `<div class="bt-sk" data-sk="${s.id}"><span class="bt-ic">${btSkillIcon(s)}<em class="bt-cd"></em></span><span>${esc(s.n.length > 4 ? s.n.slice(0, 4) : s.n)}${s.plus ? '+' : ''}</span><small>${L.elName(s.el)}${s.line ? '' : ''}</small></div>`;
  }).join('');
  const hold = v && v.hold && v.hold.text ? `<div class="bt-hold" data-bt="go">${esc(v.hold.text)}</div>` : '';
  const pills = B ? B.pills : (L.bagN ? L.bagN(st, 'liaoshang') : 0);
  el.innerHTML = `<div class="bt-path">${path}</div>
    <div class="bt-me"><div class="bt-bar"><i id="btHp"></i><em><span>气血</span><span id="btHpT"></span></em></div><div class="bt-bar rg"><i id="btRg"></i><em><span>怒气</span><span id="btRgT"></span></em></div></div>
    <div class="bt-sks">${slots}</div>
    <div class="bt-ult"><button class="bt-big" data-bt="ult" id="btUlt">${esc(me.ult.n)}<small id="btUltS">怒气满了才能放</small></button>${pills > 0 ? `<button class="bt-sm" data-bt="pill" id="btPill">${artIcon('liaoshang', 24) || '丹'}<span>丹 ×${pills}</span></button>` : ''}<button class="bt-sm" data-bt="flee">${artIcon('flee', 24)}<span>撤</span></button>${btCh1() ? '' : `<button class="bt-sm${st.flags.autoUlt ? ' on' : ''}" data-bt="auto"><span>自动</span><span>${st.flags.autoUlt ? '开' : '关'}</span></button><button class="bt-sm${btSpeed > 1 ? ' on' : ''}" data-bt="spd"><span>速度</span><span>×${btSpeed}</span></button>`}</div>
    ${hold || `<div class="bt-log" id="btLog">${esc((v && v.log) || '')}</div>`}`;
  if (fresh) fitScene();
  btPaint();
}
function btPaint() {
  const v = btv, el = $('#bt'); if (!v || !el || el.hidden) return;
  const e = v.mode === 'boss' ? { hp: 1, rage: 0 } : st.exp, B = v.B;
  const hp = B ? B.hp : e.hp * L.btMe(st).hpMax, max = B ? B.max : L.btMe(st).hpMax, rage = B ? B.rage : e.rage;
  const set = (id, w, t) => { const a = document.getElementById(id); if (a) a.style.width = (Math.max(0, Math.min(1, w)) * 100).toFixed(1) + '%'; const b = document.getElementById(id + 'T'); if (b && b.textContent !== t) b.textContent = t; };
  set('btHp', hp / max, `${Math.max(0, Math.ceil(hp))} / ${Math.round(max)}`);
  set('btRg', rage / 100, rage >= 100 ? '满' : `${Math.floor(rage)} / 100`);
  const u = document.getElementById('btUlt');
  if (u) {
    const on = !!B && v.ph === 'fight' && rage >= 100, brk = on && B.foes.some(f => f.hp > 0 && f.charge);
    u.classList.toggle('on', on); u.disabled = !on;
    const s = document.getElementById('btUltS'), t = !B ? (v.ph === 'walk' ? '赶路中' : '') : on ? (brk ? '现在放 = 破招' : '按下：×3') : '怒气满了才能放';
    if (s && s.textContent !== t) s.textContent = t;
  }
  if (B) el.querySelectorAll('[data-sk]').forEach(c => { const n = B.cds[c.dataset.sk], cd = c.querySelector('.bt-cd'); const t = n > 0 ? String(n) : ''; if (cd && cd.textContent !== t) { cd.textContent = t; cd.hidden = !t; } });
}
// ---------- 出发页：这一趟会遇到、克制条与【换 ▸】（§2.4、§4.2；panel-exp.js 的 confirmExp 调） ----------
let btSwapOpen = false;
function btFoeChip(id) {
  const F0 = L.FOES[id]; if (!F0) return '';
  const seen = !!(st.meta.foes && st.meta.foes[id]), elite = F0.kind !== 'mob';
  const badge = seen && ART.elemBadge && F0.el ? `<img class="px" src="${urlOf(ART.elemBadge(F0.el), 'elb|' + F0.el)}" style="width:${pxFit(10, 20)}px;height:${pxFit(10, 20)}px" alt="">` : '';
  const tr = seen && F0.trait && L.FOE_TRAITS[F0.trait] ? `<small>${L.FOE_TRAITS[F0.trait].n}</small>` : '';
  return `<span class="bt-foe${elite ? ' el' : ''}">${badge}<span>${seen ? esc(F0.n) : '？'}</span>${tr}</span>`;
}
function btPrepHTML(k, d, a) {
  const row = L.cellFoes(k, d), nodes = L.expNodes(st, k, d, a, L.expLen(k, st));
  const hasElite = nodes.some(n => n.t === 'elite');
  const ids = row.mobs.slice(0, 2).concat(hasElite ? [row.elite] : []);
  const foes = `<div class="bt-foes"><span class="muted">会遇到</span>${ids.map(btFoeChip).join('')}</div>`;
  const me = L.btMe(st), moves = me.skills.filter(s => s.kind === 'z' || s.kind === 'w');
  if (!moves.length) return foes;
  // 克制条：精英（有罩）克不动就是红的；对这一格出现过的每一系写“克 X ✓ / 打不动 X ✗”
  const els = [...new Set(ids.map(id => L.FOES[id] && L.FOES[id].el).filter(Boolean))];
  const eliteEl = hasElite && L.FOES[row.elite] ? L.FOES[row.elite].el : '';
  const ke = el => moves.some(s => L.elKe(s.el, el)), bk = el => moves.every(s => L.elKe(el, s.el));
  const seenEl = el => ids.some(id => L.FOES[id] && L.FOES[id].el === el && st.meta.foes && st.meta.foes[id]);
  const known = els.filter(seenEl);
  const bits = known.map(el => (ke(el) ? `<span class="jadet">克${L.elName(el)} ✓</span>` : bk(el) || el === eliteEl ? `<span class="seal">打不动${L.elName(el)} ✗</span>` : '')).filter(Boolean);
  const red = !!eliteEl && seenEl(eliteEl) && !ke(eliteEl);
  const icons = moves.map(s => btSkillIcon(s)).join('');
  // 推荐换哪门：L.artRecommend 按这一格（artrec.js；与功法页“荐”、变强页同一套打分），一键换上，写原因
  const rc = L.artRecommend ? (L.artRecSelect(st, k, d), L.artRecommend(st, 1)) : null, recId = rc && !rc.same && rc.id ? rc.id : '';
  // 近期大节点优先：克这一格的另有一门时只提一句，不给按钮（免得回来又叫你换回去）
  const alt = rc && rc.ctx.kind === 'duel' ? L.artRecommend(st, 1, { k, d, here: true, force: true }) : null, altId = alt && alt.id !== (recId || rc.cur) && alt.ke ? alt.id : '';
  const recBtn = (recId ? `<div class="row bt-rec"><button class="btn sm alt eq grow" data-swapz="${recId}">荐 换上《${esc(L.art(recId).n)}》：${esc(rc.why)}</button></div>` : '')
    + (altId ? `<div class="muted bt-alt">克这一格的是《${esc(L.art(altId).n)}》；${esc(rc.ctx.label)}还有 ${seasons(rc.ctx.left)} 季，先按它配</div>` : '');
  if (!red) return foes + `<div class="bt-kebar ok">${icons}<span class="grow">${known.length && known.every(ke) ? '都克得动 ✓' : bits.join(' ') || (known.length ? '不相克' : '这里的五行：去过才知道')}</span></div>` + recBtn;
  // 【换 ▸】：手里的战技（≤ 4 行，每行写克谁），点一下换好回到出发页
  const zs = Object.keys(st.arts.own).filter(id => L.art(id) && L.art(id).k === 'z').map(id => ({ id, A: L.art(id) })).sort((x, y) => ((y.id === recId) - (x.id === recId)) || (L.elKe(y.A.el, eliteEl) - L.elKe(x.A.el, eliteEl)) || y.A.t - x.A.t).slice(0, 4);
  const list = btSwapOpen ? `<div class="bt-swap">${zs.map(z => `<button class="bt-swr${L.elKe(z.A.el, eliteEl) ? ' hot' : ''}" data-swapz="${z.id}">${btSkillIcon({ el: z.A.el, kind: 'z' })}<span class="grow">${z.id === recId ? '荐 ' : ''}《${esc(z.A.n)}》${L.elName(z.A.el)}</span><span>${L.ELEM_KEYS.filter(e => L.elKe(z.A.el, e)).map(e => '克' + L.elName(e)).join('')}</span></button>`).join('') || '<div class="muted">手里还没有别的战技</div>'}</div>` : '';
  return foes + `<div class="bt-kebar bad">${icons}<span class="grow">${bits.join(' ')}</span><button class="bt-swb" data-btswap="1">换 ▸</button></div>${recBtn}${list}`;
}
// 招式格出手时亮一下
function btFire(id) { const c = document.querySelector(`#bt [data-sk="${id}"]`); if (!c) return; c.classList.remove('fire'); void c.offsetWidth; c.classList.add('fire'); }
// 测试脚本用：把正在打的这一场按 'smart' 一口气打完（首领战直接出结果卡；历练节点记下结果、推到下一个节点）；all() = 这一趟剩下的全部自动打完并结算
window.__xm_bt = {
  get on() { return !!btv; }, get ph() { return btv ? btv.ph : ''; },
  finish() {
    const v = btv; if (!v) return false;
    if (v.B && !v.B.done) L.battleAuto(v.B, 'smart');
    if (v.mode === 'boss') { btBossEnd(); return true; }
    if (v.B) btNode(L.battleResult(v.B));
    return true;
  },
  all() { if (!st || !st.exp) return false; L.tripAuto(st, ev => { if (L.resolveChoice) { const i = ev.choices.findIndex(c => L.choiceShown(st, c) && L.costOk(st, c.cost)); if (i >= 0) L.resolveChoice(st, ev, i); } }); tripFinish(); return true; },
};
