/* 废柴仙途 · 界面片段 duel-scene：场景内的对决演出（DESIGN §5.3“对决”、§5.4 对决命中；ART_API 阶段二对决部分）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * duels.js 的 duel(o) 调 duelStage()：场景换成擂台（ART.drawDuelStage：town 落霞城 / cloud 论道台 / sect 演武场 / wild 野外），
 * 双方 ART.fighter 小人、头顶 ART.drawHpBar、命中 ART.drawSpark、宿敌开场 ART.portrait 对视、结束盖 ART.stamp('胜'|'败')。
 * 胜负由逻辑层预先掷好（o.win），这里只演：四下互攻（约 2.1 秒）+ 开场 0.5～1.4 秒 + 收尾 0.6 秒，点画面或【跳过】直接到结果。
 * 越级取胜（胜算 < 45%）演“血条见底 → 戒指发光 → 反杀”；三人会武（rd.trio）连演三局，每局两下。 */
let duelFx = null;
// 版面（场景坐标，脚底 y = 128）：名字 y 57、血条 y 70、印章中心 y 34、对视条 40～110——都贴着人，场景再高也不会离得太远
const DUEL = { nameY: 57, barY: 70, stampY: 34, labY: 44, faceY: 40, slide: 420, face: 1150, hit: 520, trioHit: 400, ring: 520, endPad: 260, foot: 128, xL: 72, xR: 128 };
// ---------- 对决小人的来源 ----------
// spec：{ who（ART.fighter 的第一个参数）, alt, pt（开场对视的半身像画布）, boss（首领 k，画 ART.boss）, extra（身后再站几个同门） }
const ftMe = () => ({ who: { look: st.p.look, realm: Math.min(st.p.r, 9) }, pt: ART.portraitMe ? ART.portraitMe(st.p.look, Math.min(st.p.r, 9), 'ang') : null });
function ftPeople(id, alt) {
  if (!id || !ART.hasPortrait || !ART.hasPortrait(id)) return null;
  return { who: id, alt: !!alt, pt: ART.portrait(id, 'ang', !!alt) };
}
// 宿敌：逻辑里的楚天阔是 chu，美术里是 tian（RV_PT 在 panel-rivals.js）；女主时慕容雪换成慕容轩
const ftRival = id => ftPeople((typeof RV_PT !== 'undefined' && RV_PT[id]) || id, id === 'mu' && !!st.p.look.f) || ftGen(L.rivalName ? L.rivalName(st, id) : id);
const FT_HAIR = ['#1d1a24', '#3a2a22', '#4a3328', '#2a2230', '#5a4030'], FT_SKIN = ['#f2c9a0', '#e8b68a', '#f6d3b3', '#e0b088'];
const FT_ROBE = [['#3a5a3a', '#5a8a4a', '#8ab86a'], ['#5a3a6a', '#8a5aa0', '#b88ad0'], ['#6a4a2a', '#9a7040', '#c8a060'], ['#2a4a6a', '#4a7aa0', '#7aa8d0'], ['#6a2a2a', '#9a4040', '#c87070'], ['#3a3a4a', '#5a5a70', '#8a8aa0']];
// 路人：按名字散列出发色、肤色、道袍（同名恒定）；o.robe 指定道袍（宗门色），o.f 指定男女
function ftGen(name, o) {
  o = o || {}; let h = 7; for (const ch of String(name || '?')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const who = { hair: FT_HAIR[h % FT_HAIR.length], skin: FT_SKIN[(h >> 4) % FT_SKIN.length], f: o.f !== undefined ? (o.f ? 1 : 0) : (h >> 7) % 2, robe: o.robe || FT_ROBE[(h >> 9) % FT_ROBE.length], trim: o.trim || '#f3ecdc' };
  return { who, pt: o.pt || null, extra: o.extra || 0 };
}
const ftBoss = k => ({ boss: k });
// 宗门会武的代表：有画像的用画像（云无极 / 楚天阔 / 血无涯 / 丹红袖 / 玄微子 / 驭天风），其余按宗门换色
const CHAMP_PT = { kunlun: 'yun', tianjian: 'tian', xuesha: 'xue', dan: 'hongxiu', dao: 'dao', yushou: 'yutian' };
function ftChamp(foe) {
  const sp = ftPeople(CHAMP_PT[foe.id]);
  if (sp) return sp;
  const S0 = (L.SECTS || []).find(x => x.id === foe.id), c = S0 && S0.color;   // 九宗里三大正宗有宗门色，其余按名字散列
  return ftGen(foe.champ, c ? { robe: [hexMix(c, '#1b1326', 0.45), c, hexMix(c, '#ffffff', 0.4)] } : {});
}
function hexMix(a, b, k) {
  const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
// 徒弟（三人会武）：按徒弟的境界穿道袍
function ftDisc(u, n) {
  const x = L.discByU ? L.discByU(st, u) : null;
  const realm = x && L.discRealm ? Math.min(9, L.discRealm(x)) : Math.max(0, st.p.r - 2);
  return ftGen(n || (x && x.n), { f: x ? x.f : undefined, robe: L.REALMS[realm].robe, trim: L.REALMS[realm].trim });
}
function ftCanvas(sp, frame, flip) {
  if (sp.boss !== undefined) return ART.boss(sp.boss);
  return ART.fighter(sp.who, frame, flip, sp.alt);
}

// ---------- 剧本：每一下是谁打谁、打完血条落到哪 ----------
// 单场四下：赢 = 我、他、我、我（收尾）；越级赢 = 我、他、他（见底）、戒指发光、我（反杀）；输反过来。血条落点随胜算略有起伏
function duelPlan(win, p) {
  const r = Math.max(0.03, Math.min(0.97, p));
  if (win && r < 0.45) return [{ by: 'L', R: 0.82 }, { by: 'R', L: 0.38 }, { by: 'R', L: 0.07 }, { ring: true }, { by: 'L', R: 0, ko: true, big: true }];
  if (win) return [{ by: 'L', R: 0.72 - 0.2 * r }, { by: 'R', L: 0.55 + 0.35 * r }, { by: 'L', R: 0.34 - 0.18 * r }, { by: 'L', R: 0, ko: true }];
  if (r > 0.6) return [{ by: 'L', R: 0.55 }, { by: 'R', L: 0.58 }, { by: 'L', R: 0.14 }, { by: 'R', L: 0, ko: true }];
  return [{ by: 'R', L: 0.5 + 0.3 * r }, { by: 'L', R: 0.82 - 0.2 * r }, { by: 'R', L: 0.24 }, { by: 'R', L: 0, ko: true }];
}
// o: { stage, L, R（spec）, win, p, S, Q, face（开场对视）, trio: [{ who:'me'|'disc', u, n, win, p, S, Q }], foeName, onEnd }
function duelStage(o) {
  const cont = !!duelFx;   // 连着上一场（论道、会武的下一战）：舞台不换、不再对视太久
  const face = o.face && o.L.pt && o.R.pt && !cont ? DUEL.face : 0;
  const bouts = [];
  let t = face;
  const mk = (Ls, Rs, plan, hit, label, S, Q, nL, nR) => {
    const b = { L: Ls, R: Rs, t0: t, ev: [], label, S, Q, nL, nR };
    t += DUEL.slide;
    for (const e of plan) { b.ev.push(Object.assign({ t0: t }, e)); t += e.ring ? DUEL.ring : hit; }
    t += 120; b.t1 = t;
    bouts.push(b);
  };
  if (o.trio && o.trio.length) {
    o.trio.forEach((x, i) => {
      const Ls = x.who === 'me' ? o.L : ftDisc(x.u, x.n), Rs = i === 0 ? o.R : ftGen((o.foeName || '') + i, { robe: o.R.who && o.R.who.robe });
      mk(Ls, Rs, x.win ? [{ by: 'R', L: 0.45 }, { by: 'L', R: 0, ko: true }] : [{ by: 'L', R: 0.45 }, { by: 'R', L: 0, ko: true }], DUEL.trioHit,
        `第${'一二三'[i]}局 · ${x.who === 'me' ? '你' : x.n} ${x.win ? '胜' : '败'}`, x.S, x.Q, x.who === 'me' ? st.p.name : x.n, i === 0 ? o.foeName : (o.foeName ? o.foeName.replace(/^.*·/, '') + '门下' : '对手'));
    });
  } else mk(o.L, o.R, duelPlan(o.win, o.p), DUEL.hit, '', o.S, o.Q, st.p.name, o.foeName);
  duelFx = { stage: o.stage || 'wild', bouts, bi: -1, t: 0, face, endAt: t + DUEL.endPad, win: o.win, onEnd: o.onEnd, ended: false, hp: { L: 1, R: 1 }, show: { L: 1, R: 1 }, lag: { L: 1, R: 1 }, fired: 0, ringT: -1, stampT: -1, uiKey: '' };
  const me = duelFx;
  SFX.gong();
  // 保险：页面在后台没有逐帧绘制时，到点也把结果给出来
  setTimeout(() => { if (duelFx === me && !me.ended) duelSkip(); }, me.endAt + 2500);
}
// 跳过：剩下的几下一次结算（不放音效、不飘字），直接盖印
function duelSkip() {
  const d = duelFx; if (!d || d.ended) return;
  if (d.t < d.endAt - DUEL.endPad) { d.quick = true; d.t = d.endAt - DUEL.endPad; }
}
function duelFinish(d) {
  if (d.ended) return;
  d.ended = true;
  if (d.win) SFX.win(); else SFX.fail();
  if (d.onEnd) d.onEnd();
}
// ---------- 每帧（scene.js 的 drawScene 在对决时调这里） ----------
function drawDuelScene(dt) {
  const d = duelFx, FD = ART.dims.fighter, foot = DUEL.foot;
  d.t += dt;
  ART.drawDuelStage(d.stage, T, OY);
  // 当前一局
  let bi = 0; for (let i = 0; i < d.bouts.length; i++) if (d.t >= d.bouts[i].t0) bi = i;
  const b = d.bouts[bi];
  if (bi !== d.bi) { d.bi = bi; d.hp = { L: 1, R: 1 }; d.show = { L: 1, R: 1 }; d.lag = { L: 1, R: 1 }; d.ko = null; }
  // 到点的每一下：落血、火花、飘字（跳过时一口气结算）
  for (const e of b.ev) {
    if (e.done || d.t < e.t0 + (e.ring ? 0 : (bi ? DUEL.trioHit : DUEL.hit) * 0.45)) continue;
    e.done = true;
    if (e.ring) { d.ringT = d.t; if (!d.quick) { floatText(DUEL.xL, foot - 46, '戒指发光！', '#ffe39a'); SFX.reveal(3); } continue; }
    const tgt = e.by === 'L' ? 'R' : 'L';
    d.hp[tgt] = e[tgt];
    if (e.ko) d.ko = tgt;
    if (!d.quick) {
      const pw = e.by === 'L' ? b.S : b.Q, hx = tgt === 'R' ? DUEL.xR - 6 : DUEL.xL + 6;
      e.spark = d.t;
      if (pw) floatText(hx, foot - 40, fmt(pw * (e.big ? 0.9 : 0.22 + 0.16 * ((d.t | 0) % 7) / 7)), e.big ? '#ffe39a' : '#ffffff', !!e.big, !e.big);
      SFX.hit(); if (e.ko || e.big) shake();
    } else { d.show[tgt] = d.hp[tgt]; d.lag[tgt] = d.hp[tgt]; }
  }
  for (const s of ['L', 'R']) {
    d.show[s] += (d.hp[s] - d.show[s]) * Math.min(1, dt / 90);
    d.lag[s] = Math.max(d.show[s], d.lag[s] - dt * 0.0007);
  }
  // 两个小人：入场滑进来；出手 = 蓄力 → 冲上去 → 收回；挨打后仰；输的那个倒下
  const hitMs = bi ? DUEL.trioHit : DUEL.hit;
  const act = b.ev.find(e => !e.ring && d.t >= e.t0 && d.t < e.t0 + hitMs);
  const pose = s => {
    const base = s === 'L' ? DUEL.xL : DUEL.xR, dir = s === 'L' ? 1 : -1;
    const ks = Math.min(1, Math.max(0, (d.t - b.t0 - (bi === 0 ? 0 : 0)) / DUEL.slide));
    let x = base - dir * (1 - ks * (2 - ks)) * 100, frame = (T / 420 | 0) % 2 ? 'idle1' : 'idle0';
    if (d.ko === s && !act) return { x: base - dir * 6, frame: 'down' };
    if (act && ks >= 1) {
      const k = (d.t - act.t0) / hitMs;
      if (act.by === s) {
        if (k < 0.3) { frame = 'windup'; x -= dir * 3; }
        else if (k < 0.62) { frame = 'strike'; x += dir * Math.min(1, (k - 0.3) / 0.15) * 30; }
        else x += dir * 30 * (1 - (k - 0.62) / 0.38);
      } else if (k >= 0.45) {
        frame = act.ko && k > 0.7 ? 'down' : 'hit'; x -= dir * Math.min(1, (k - 0.45) / 0.15) * 5;
      }
    }
    return { x: Math.round(x), frame };
  };
  const pl = pose('L'), pr = pose('R');
  // 越级取胜：戒指发光（金光一圈）
  if (d.ringT >= 0 && d.t - d.ringT < DUEL.ring + 300) { const k = (d.t - d.ringT) / (DUEL.ring + 300); ART.glow(pl.x, foot - 18, 10 + k * 26, '#ffe39a', 0.7 * (1 - k)); }
  // 身后的同门（天剑宗来犯）
  if (b.R.extra) for (let i = b.R.extra; i >= 1; i--) { ctx.globalAlpha = 0.85; ctx.drawImage(ftCanvas(b.R, (T / 500 + i | 0) % 2 ? 'idle1' : 'idle0', true), pr.x + 14 * i - (FD.w - 1 - FD.ax), foot - 4 * i - FD.ay); ctx.globalAlpha = 1; }
  ctx.drawImage(ftCanvas(b.L, pl.frame, false), pl.x - FD.ax, foot - FD.ay);
  if (b.R.boss !== undefined) {
    const c = ftCanvas(b.R), down = pr.frame === 'down', hit = pr.frame === 'hit';
    ctx.globalAlpha = down ? 0.45 : hit && (T / 60 | 0) % 2 ? 0.5 : 1;
    ctx.drawImage(c, pr.x - 22, foot - 46 + (down ? 8 : Math.round(Math.sin(T / 300) * 1.5)));
    ctx.globalAlpha = 1;
  } else ctx.drawImage(ftCanvas(b.R, pr.frame, true), pr.x - (FD.w - 1 - FD.ax), foot - FD.ay);
  // 命中火花
  for (const e of b.ev) if (e.spark !== undefined && d.t - e.spark < 260) { const tg = e.by === 'L' ? pr : pl; ART.drawSpark(tg.x + (e.by === 'L' ? -6 : 6), foot - 22, (d.t - e.spark) / 260); }
  drawParts(dt);
  // 血条（名字与战力是 DOM，见 syncDuelUI）
  if (d.t >= b.t0) {
    ART.drawHpBar(6, DUEL.barY, 84, d.show.L, { lag: d.lag.L });
    ART.drawHpBar(110, DUEL.barY, 84, d.show.R, { lag: d.lag.R, right: true });
  }
  // 开场对视：两张半身像从两边推进来
  if (d.face && d.t < d.face) {
    const k = d.t / d.face, e = Math.min(1, k / 0.35), out = k > 0.82 ? (k - 0.82) / 0.18 : 0;
    ctx.globalAlpha = 0.78 * (1 - out); R(0, DUEL.faceY, W, 70, '#0b0912'); R(0, DUEL.faceY, W, 1, '#f4c542'); R(0, DUEL.faceY + 69, W, 1, '#f4c542');
    ctx.globalAlpha = 1 - out;
    const pL = b.L.pt, pR = b.R.pt, ease = 1 - (1 - e) * (1 - e);
    if (pL) ctx.drawImage(pL, Math.round(-50 + ease * 78), DUEL.faceY + 11);
    if (pR) { ctx.save(); ctx.translate(Math.round(250 - ease * 78), DUEL.faceY + 11); ctx.scale(-1, 1); ctx.drawImage(pR, 0, 0); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  // 收尾：印章砸下（3 倍 → 1 倍，落地震一下）
  const last = d.bouts[d.bouts.length - 1], tEnd = last.t1;
  if (d.t >= tEnd) {
    if (d.stampT < 0) d.stampT = d.t;
    const sc = d.t - d.stampT, S = ART.stamp(d.win ? '胜' : '败');
    if (S) {
      const z = sc < 180 ? 3 - 2 * sc / 180 : 1, w = Math.round(24 * z);
      if (sc >= 180 && !d.landed) { d.landed = true; shake(); }
      ctx.globalAlpha = Math.min(1, sc / 120); ctx.drawImage(S, Math.round(100 - w / 2), Math.round(DUEL.stampY - w / 2), w, w); ctx.globalAlpha = 1;
    }
    if (!d.ended && d.t >= d.endAt) duelFinish(d);
  }
  syncDuelUI();
}
// 场景上的 DOM 层：双方名字与战力、对视时的“VS”、三人会武的局数。状态变了才重画
function syncDuelUI() {
  const wrap = $('#sceneWrap'); if (!wrap) return;
  let ui = $('#duelUI');
  const d = duelFx;
  if (!d) { if (ui) ui.remove(); return; }
  if (!ui) { ui = document.createElement('div'); ui.id = 'duelUI'; wrap.appendChild(ui); }
  const b = d.bouts[Math.max(0, d.bi)], facing = d.face && d.t < d.face * 0.82;
  const nm = s => (s === 'L' ? b.nL : b.nR) || '';
  const key = [d.bi, facing, H, nm('L'), nm('R')].join('|');
  if (key === d.uiKey) return;
  d.uiKey = key;
  const pt = y => ((y + OY) / H * 100).toFixed(2) + '%';
  const side = (s, cls) => `<div class="duel-nm ${cls}" style="top:${pt(DUEL.nameY)}">${esc(nm(s))} <b>${b[s === 'L' ? 'S' : 'Q'] ? fmt(b[s === 'L' ? 'S' : 'Q']) : ''}</b></div>`;
  ui.innerHTML = side('L', 'l') + side('R', 'r') + (facing ? `<div class="duel-vs" style="top:${pt(DUEL.faceY + 35)}">VS</div>` : '') + (b.label ? `<div class="duel-lab" style="top:${pt(DUEL.labY)}">${esc(b.label)}</div>` : '');
}
// 新秀：门人头像做对视，小人按种子换色
function ftRookie(rk) {
  if (!rk) return ftGen('新秀');
  const pt = ART.portraitGen ? ART.portraitGen(rk.seed, { kind: 'rookie', f: rk.fem, realm: Math.min(8, st.p.r) }, 'ang') : null;
  return ftGen(rk.n, { f: rk.fem, pt });
}
// 奇遇里的交手：宿敌用他的小人，新秀用新秀，事件人物有画像的用画像，其余按事件散列一个路人
function duelFoeFt(d, ev) {
  const f = d && d.foe;
  if (f && f.kind === 'rival' && f.id) return ftRival(f.id);
  if (f && f.kind === 'rookie') return ftRookie(L.rookie(st) || (st.rv2 && st.rv2.pool.find(x => x.id === f.id)));
  return ftGen(ev ? ev.id : '对手');
}
