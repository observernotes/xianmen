/* 废柴仙途 · 逻辑模块 rivals：天骄榜曲线、对决、三年之约、论道
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 天骄榜对手战力 = exp(A(名次) + 0.0185 × 周天)（SYSTEMS §18：斜率 0.016 → 0.0185）。A 的锚点线性插值；
// 对手涨得比玩家慢，每位宿敌卡在设计好的时间段（见 §3.10）
const RA = [[1, 14.6], [4, 12.2], [12, 8.9], [45, 5.7], [72, 3.3], [100, 1.6]];
L.RIVAL_SLOPE = 0.0185;
L.rivalA = function (q) {
  for (let j = 0; j < RA.length - 1; j++) {
    const [q0, a0] = RA[j], [q1, a1] = RA[j + 1];
    if (q >= q0 && q <= q1) return a0 + (a1 - a0) * (q - q0) / (q1 - q0);
  }
  return RA[RA.length - 1][1];
};
L.rivalPower = (st, q) => Math.exp(L.rivalA(q) + L.RIVAL_SLOPE * st.tick);
L.rivalAt = function (st, q) { if (q === st.rank) return null; return st.ladder[q < st.rank ? q - 1 : q - 2]; };
L.rivalRank = function (st, id) { const i = st.ladder.findIndex(x => x.id === id); if (i < 0) return 0; return i + 1 < st.rank ? i + 1 : i + 2; };

// ---------- 对决 ----------
L.duelChance = (P1, P2) => clamp(0.5 + 0.55 * Math.log2(P1 / P2), 0.03, 0.97);
// 胜率曲线很陡：稳赢线 = 敌 × 1.8（97%），五五线 = 敌 × 1.0
L.duelLines = Q => ({ even: Q, sure: Q * 1.8 });
// 三年之约：第 36 周天（炼气期 12 周天一年）。第一世未筑基时老祖借力 ×2
L.PACT_TICK = 36;
L.PACT_POWER = 100;   // SYSTEMS §18：90 → 100
L.PACT_ASSIST = 2;
L.pactPower = () => L.PACT_POWER;
// 对手描述（给对决倍率用；五行等属性随宿敌资料接入，见 CONTENT §10）
L.PACT_FOE = { kind: 'rival', id: 'mu' };
L.pactAssist = st => (st.rebirth === 0 && st.p.r === 0 ? L.PACT_ASSIST : 1);
L.pactInfo = function (st) {
  const left = Math.max(0, L.PACT_TICK - st.tick);
  const base = L.duelPower(st, L.PACT_FOE), assist = L.pactAssist(st), S = base * assist, Q = L.PACT_POWER;
  return { left, base, assist, S, Q, p: L.duelChance(S, Q), done: !!st.pact };
};
const TOUR_EVERY = 12, MEET_EVERY = 24, MEET_AT = 18;
L.TOUR_EVERY = TOUR_EVERY; L.MEET_EVERY = MEET_EVERY; L.MEET_AT = MEET_AT;
L.nextTour = st => { const t0 = Math.max(st.tick, L.PACT_TICK); return (Math.floor(t0 / TOUR_EVERY) + 1) * TOUR_EVERY - st.tick; };
L.nextMeet = function (st) {
  if (!st.sect) return 0;
  let m = ((MEET_AT - (st.tick % MEET_EVERY)) + MEET_EVERY) % MEET_EVERY; if (m === 0) m = MEET_EVERY;
  while (st.tick + m - st.sect.joined < 12) m += MEET_EVERY;
  return m;
};
// 下一件大事（三年之约 / 天骄论道 / 九宗会武），给界面倒计时用
L.nextBig = function (st) {
  if (!st.pact) { const pi = L.pactInfo(st); return { k: 'pact', n: '三年之约', left: pi.left, info: pi }; }
  const tour = L.nextTour(st);
  if (st.sect && st.sect.order) { const m = L.nextMeet(st); if (m < tour) return { k: 'meet', n: '九宗会武', left: m }; }
  return { k: 'tour', n: '天骄论道', left: tour };
};
L.pactDuel = function (st) {
  const assist = L.pactAssist(st) > 1;
  const S = L.duelPower(st, L.PACT_FOE) * L.pactAssist(st);
  const Q = L.pactPower();
  const p = L.duelChance(S, Q);
  const win = R() < p;
  st.pact = win ? 1 : -1;
  const res = { S, Q, p, win, assist, base: S / L.pactAssist(st), rank0: st.rank };
  st.stats.pactP = p;
  if (win) {
    st.beaten.mu = 1;
    const q = L.rivalRank(st, 'mu');
    if (q && q < st.rank) { st.rank = q; st.bestRank = Math.min(st.bestRank, q); }
    res.rank1 = st.rank;
    res.stones = 600; st.stones += 600;
    L.log(st, `三年之约，${st.p.name}当众击败${st.exName}！满城哗然，天骄榜第 ${st.rank}`, 'gold');
  } else L.log(st, `三年之约惜败于${st.exName}……第 1 届论道第一场再会`, 'red');
  L.checkQuests(st);
  return res;
};
// 两届之间榜单也在动：路人各自有小幅起伏（宿敌不动，战力仍按公式）
function ladderDrift(st) {
  for (let n = 0; n < 8; n++) {
    const i = Math.floor(R() * 98), a = st.ladder[i], b = st.ladder[i + 1];
    if (a && b && !a.id && !b.id) { st.ladder[i] = b; st.ladder[i + 1] = a; }
  }
}
// 天骄论道：三场，目标依次是战力约为自己 0.6 / 0.9 / 1.2 倍的名次，单场最多上升 15 名
L.TOUR_STEP = 15;
L.tournament = function (st) {
  const S = L.power(st);
  st.stats.tour++;
  ladderDrift(st);
  const res = { n: st.stats.tour, startRank: st.rank, rounds: [], S };
  const mults = [0.6, 0.9, 1.2];
  for (let j = 0; j < 3; j++) {
    let q;
    if (st.rank === 1) q = 2;
    else {
      const lim = Math.max(1, st.rank - L.TOUR_STEP);
      const target = S * mults[j];
      q = st.rank - 1; let best = Infinity;
      for (let x = st.rank - 1; x >= lim; x--) {
        const dlt = Math.abs(Math.log(L.rivalPower(st, x) / target));
        if (dlt < best) { best = dlt; q = x; }
      }
      // 宿敌优先：前方 15 名内有没打赢过的宿敌，且打得过，就打他
      for (let x = st.rank - 1; x >= lim; x--) { const rv = L.rivalAt(st, x); if (rv && rv.id && !st.beaten[rv.id] && L.rivalPower(st, x) < S * 1.6) { q = x; break; } }
      // 三年之约输了：第 1 届第一场固定是退婚的那位
      if (j === 0 && st.pact < 0 && !st.beaten.mu) { const mq = L.rivalRank(st, 'mu'); if (mq && mq < st.rank) q = mq; }
    }
    const rv = L.rivalAt(st, q);
    const Q = L.rivalPower(st, q);
    const Sr = L.duelPower(st, { kind: 'rival', q, id: rv && rv.id });
    const p = L.duelChance(Sr, Q);
    const win = R() < p;
    const round = { q, rv, P: Q, S: Sr, p, win };
    if (win) {
      st.stats.tourWins = (st.stats.tourWins || 0) + 1;
      if (st.rank === 1) round.defend = true; else st.rank = q;
      const rw = Math.floor(L.income(st) * 4 + 50);
      round.stones = rw; st.stones += rw;
      if (st.sect) { round.contrib = L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.tour); L.taskHit(st, 'tour'); }
      if (rv && rv.id) { round.first = !st.beaten[rv.id]; st.beaten[rv.id] = (st.beaten[rv.id] || 0) + 1; }
    }
    res.rounds.push(round);
    if (!win) break;
  }
  st.bestRank = Math.min(st.bestRank, st.rank);
  if (st.rank <= 12) L.fireTrigger(st, 'rank:12');
  res.endRank = st.rank;
  L.log(st, `第${res.n}届天骄论道落幕，${st.p.name}位列天骄榜第 ${st.rank}`, st.rank < res.startRank ? 'gold' : '');
  L.checkQuests(st);
  return res;
};
// 宿敌的消息（只是传讯，战力仍按公式）
L.RIVAL_NEWS = [
  [60, 'zhao', '天骄榜快讯：赵乾闭关三年，结丹而出'],
  [150, 'chu', '天骄榜快讯：天剑宗圣子楚天阔一剑败三位元婴'],
  [260, 'xue', '天骄榜快讯：魔道圣子血无涯屠尽一座秘境，无人敢拦'],
  [330, 'chu', '天骄榜快讯：楚天阔踏入炼虚，放言“弃徒不过如此”'],
  [430, 'yun', '天骄榜快讯：昆仑云无极闭目三十年，一朝睁眼，万剑齐鸣'],
];
});
