/* 废柴仙途 · 逻辑模块 rivals：天骄榜曲线、对决、三年之约、论道
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 天骄榜对手战力 = exp(A(名次) + 0.0185 × 周天)（SYSTEMS §18：斜率 0.016 → 0.0185）。A 的锚点线性插值；
// 对手涨得比玩家慢，每位宿敌卡在设计好的时间段（见 §3.10）。
// 法宝系统（强化 ×1.3、词条 ×1.15）接入后，前 4 名 A +0.4（≈ ×1.5）、第 12 名 +0.2、第 45 名起不动（tools/sim.js 校准：天骄榜第一中位数 312 → 348）
const RA = [[1, 15.0], [4, 12.6], [12, 9.1], [45, 5.7], [72, 3.3], [100, 1.6]];
L.RIVAL_SLOPE = 0.0185;
L.rivalA = function (q) {
  for (let j = 0; j < RA.length - 1; j++) {
    const [q0, a0] = RA[j], [q1, a1] = RA[j + 1];
    if (q >= q0 && q <= q1) return a0 + (a1 - a0) * (q - q0) / (q1 - q0);
  }
  return RA[RA.length - 1][1];
};
// 名次曲线本身（九宗会武的宗门战力也按它）；L.rivalPower 另乘这位天骄自己的永久加成 pw（拍卖会拍到东西 ×1.04，market.js；宿敌的奇遇 ×1.05，rivals2.js），
// 每人合计上限 ×1.3（SYSTEMS §13，L.rivalBoost）；新秀（rv.rk）的战力另算（rivals2.js 的 L.rookiePower）
L.rivalCurve = (st, q) => Math.exp(L.rivalA(q) + L.RIVAL_SLOPE * st.tick);
// 宿敌卡位（数值校准，docs/BALANCE_TODO.md）：赵乾 / 楚天阔 / 血无涯各守一道境界关 i（小层序号 4r + s：金丹中期 9、化神中期 17、合体后期 26）。
// 没打赢他之前，他的战力至少是“同样的家底修到 i 那一层”——你的常驻战力（不算爆气丹、负伤这些一时的）× 1.5^(i − 你的小层) × 1.8^(大境界差) × c，
// 再乘他自己的永久系数 pw（拍卖、宿敌的奇遇）。修到他那一层时约五五开，之后每高一层胜算约 +30%；与新秀“按你的战力追”是同一个思路（rivals2.js）。
// 云无极（k = 0）不看层数：渡劫初期（from）起才肯上台，之后永远压你一头（你的常驻战力 × c），靠克制、爆气丹、玄霄重来去搏——约六成种子在飞升前拿到榜首。
// 论道越不过没打赢的卡位宿敌（L.rivalBlock）；你的小层还不到 from 时他不上台（L.rivalRefuses）。
// 天骄榜曲线照旧是下限：懒散玩家家底薄，曲线比卡位高，赵乾对他仍按曲线打。按曲线涨的天骄榜追不上勤快玩家：guided 第 90 周天约是第 45 名曲线的 19 倍。
L.RIVAL_WALL = { zhao: { i: 9, c: 0.85, k: 1, from: 8 }, chu: { i: 17, c: 1, k: 1, from: 16 }, xue: { i: 26, c: 1, k: 1, from: 25 }, yun: { i: 32, c: 1.45, k: 0, from: 32 } };
const WALL_SKIP = { buffs: 1, inj: 1 };
L.rivalWall = function (st, id) {
  const W = L.RIVAL_WALL[id]; if (!W || !(W.c > 0) || !st || st.p.r > L.MAXR || (st.beaten && st.beaten[id])) return 0;
  let m = 1; for (const md of L.MODS.atk) { if (WALL_SKIP[md.id]) continue; const r = md.fn(st); if (!r) continue; for (const x of (!r.length || Array.isArray(r[0]) ? r : [r])) if (x) m *= x[1]; }
  const i = L.si(st.p), k = W.k === undefined ? 1 : W.k;
  return L.baseAtk(st) * m * Math.pow(P.pwStage, (W.i - i) * k) * Math.pow(P.pwRealm, ((W.i >> 2) - st.p.r) * k) * W.c;
};
L.rivalPower = (st, q) => { const rv = L.rivalAt(st, q); if (rv && rv.rk && L.rookiePower) return L.rookiePower(st, rv, q); return Math.max(L.rivalCurve(st, q), rv && rv.id ? L.rivalWall(st, rv.id) : 0) * ((rv && rv.pw) || 1); };
// 论道往上打时挡在前面、还没打赢过的卡位宿敌的名次（lim 以内；没有给 0）：越不过他，排到他身后就得先打他
L.rivalBlock = function (st, lim) {
  for (let x = st.rank - 1; x >= lim; x--) { const rv = L.rivalAt(st, x); if (rv && rv.id && L.rivalWall(st, rv.id) > 0) return x; }
  return 0;
};
// 你的小层还不到卡位的 from，他不上台：你守在他身后，这一届不再往上打（不然每届白挨一场，攒着运气也能蒙过去）
L.rivalRefuses = function (st, q) {
  const rv = L.rivalAt(st, q); if (!rv || !rv.id || !(L.rivalWall(st, rv.id) > 0)) return false;
  return L.si(st.p) < L.RIVAL_WALL[rv.id].from;
};
// 他肯上台的那一层的名字（论道结算上写“修到 X 再来”）
L.rivalWallStage = id => { const W = L.RIVAL_WALL[id]; return W ? L.REALMS[W.from >> 2].n + L.STAGES[W.from & 3] : ''; };
// 永久系数：x 是 st.ladder 里的一项；m 是这一次的倍率；返回实际乘上的倍率（到顶了就是 1）。why 给了就进天骄榜快讯
L.RIVAL_PW_CAP = 1.3;
L.rivalBoost = function (st, x, m, why) {
  if (!x || !(m > 0)) return 1;
  const p0 = x.pw || 1, p1 = Math.min(L.RIVAL_PW_CAP, p0 * m);
  if (p1 <= p0 + 1e-12) return 1;
  x.pw = Math.round(p1 * 1e6) / 1e6;
  if (why && x.id) L.log(st, `天骄榜快讯：${x.n}${why}，战力 ×${(Math.round(x.pw / p0 * 100) / 100)}（累计 ×${(Math.round(x.pw * 100) / 100)}${x.pw >= L.RIVAL_PW_CAP - 1e-9 ? '，到顶' : ''}）`);
  return x.pw / p0;
};

// ---------- 宿敌资料（CONTENT §10：五行；看家战技与法宝本线定）：交手后记入图鉴 st.meta.rival（跨世保留），见 L.rivalKnow ----------
// art：看家战技（L.ARTL 里的战技，五行与 L.RIVAL_EL 一致）；gear：一件法宝，带一条“克 X”词条——你的攻击属性是 X 时他对决战力 ×1.1（rivals2.js 登记）。
// 选法：克他的那一系（土克水、火克金、水克火）永远不被他的法宝克，所以“换成克他的战技”始终是对的
L.RIVAL_INFO = {
  mu: { art: 'z_liuyun', gear: { n: '霜华簪', ke: 'jin' } },
  zhao: { art: 'z_gengjin', gear: { n: '镇岳剑', ke: 'tu' } },
  chu: { art: 'z_wanjian', gear: { n: '问心剑', ke: 'shui' } },
  xue: { art: 'z_fentian', gear: { n: '噬魂血刃', ke: 'mu' } },
  yun: { art: 'z_canghai', gear: { n: '星河棋盘', ke: 'jin' } },
};
L.RIVAL_GEAR_M = 1.10;
L.rivalName = (st, id) => (id === 'mu' ? st.exName : (L.RIVALS.find(r => r.id === id) || {}).name || id);
// 知道多少：五行（第一次交手，st.meta.elem 的 rv_<id>，战技槽一开就知道慕容的）、看家战技（第一次交手）、法宝（第一次击败他）
L.rivalKnow = function (st, id) {
  const m = (st.meta && st.meta.rival && st.meta.rival[id]) || {};
  return { el: L.foeElKnown(st, { kind: 'rival', id }), art: !!m.art, gear: !!m.gear };
};
// 图鉴读的：已知的宿敌（至少知道一项），未知的项为 null
L.rivalKnown = function (st) {
  const out = [];
  for (const rv of L.RIVALS) {
    const k = L.rivalKnow(st, rv.id), I = L.RIVAL_INFO[rv.id];
    if (!k.el && !k.art && !k.gear) continue;
    out.push({ id: rv.id, n: L.rivalName(st, rv.id), el: k.el ? L.RIVAL_EL[rv.id] : null, art: k.art ? I.art : null, gear: k.gear ? { n: I.gear.n, ke: I.gear.ke } : null });
  }
  return out;
};
const revealFoe0 = L.revealFoe;
L.revealFoe = function (st, foe) {
  if (revealFoe0) revealFoe0(st, foe);
  if (foe && foe.kind === 'rival' && foe.id && L.RIVAL_INFO[foe.id]) { const m = st.meta.rival || (st.meta.rival = {}); (m[foe.id] = m[foe.id] || {}).art = 1; }
  if (foe && foe.kind === 'rookie' && L.rookieReveal) L.rookieReveal(st);
};
L.rivalAt = function (st, q) { if (q === st.rank) return null; return st.ladder[q < st.rank ? q - 1 : q - 2]; };
L.rivalRank = function (st, id) { const i = st.ladder.findIndex(x => x.id === id); if (i < 0) return 0; return i + 1 < st.rank ? i + 1 : i + 2; };

// ---------- 对决 ----------
L.duelChance = (P1, P2) => clamp(0.5 + 0.55 * Math.log2(P1 / P2), 0.03, 0.97);
// 带上下文的胜算：功法与共鸣可以抬上限（玄霄剑卷 97% → 99%）、垫下限（天河倒悬对天剑宗 50%）、直接加减（剑心通明 +3%）。
// 用 L.addDuelPMod(id, order, fn(st, foe) → { hi, lo, add, n } | null) 登记；逻辑里所有对决都用它，界面显示的胜算也用它
L.duelPParts = (st, foe) => { const a = []; for (const m of L.MODS.duelp) { const r = m.fn(st, foe || {}); if (r) a.push(r); } return a; };
L.duelP = function (st, S, Q, foe) {
  let lo = 0.03, hi = 0.97, add = 0;
  if (st) for (const r of L.duelPParts(st, foe)) { if (r.hi) hi = Math.max(hi, r.hi); if (r.lo) lo = Math.max(lo, r.lo); if (r.add) add += r.add; }
  return clamp(0.5 + 0.55 * Math.log2(S / Q) + add, lo, hi);
};
// 第一次击败宿敌：置 beat_<id>（新事件用作 need），触发 beat:<id>
L.markBeat = function (st, id) {
  if (id && L.RIVAL_INFO[id]) { const m = st.meta.rival || (st.meta.rival = {}); (m[id] = m[id] || {}).gear = 1; m[id].art = 1; }
  if (!id || (st.eflags && st.eflags['beat_' + id])) return;
  st.eflags['beat_' + id] = 1;
  L.fireTrigger(st, 'beat:' + id);
};
// 胜率曲线很陡：稳赢线 = 敌 × 1.8（97%），五五线 = 敌 × 1.0
L.duelLines = Q => ({ even: Q, sure: Q * 1.8 });
// 三年之约：第 36 周天（炼气期 12 周天一年）。第一世未筑基时老祖借力 ×2
L.PACT_TICK = 36;
L.PACT_POWER = 140;   // SYSTEMS §18：90 → 100；功法战技与五行克制接入后 → 125；最终校准 → 140（guided 95% → 92%，贴上沿太紧），借力 2.5 → 2.8 把 idle 抬回 17%
L.PACT_ASSIST = 2.8;
L.pactPower = () => L.PACT_POWER;
// 对手描述（给对决倍率用；五行等属性随宿敌资料接入，见 CONTENT §10）
L.PACT_FOE = { kind: 'rival', id: 'mu' };
L.pactAssist = st => (st.rebirth === 0 && st.p.r === 0 ? L.PACT_ASSIST : 1);
L.pactInfo = function (st) {
  const left = Math.max(0, L.PACT_TICK - st.tick);
  const base = L.duelPower(st, L.PACT_FOE), assist = L.pactAssist(st), S = base * assist, Q = L.PACT_POWER;
  return { left, base, assist, S, Q, p: L.duelP(st, S, Q, L.PACT_FOE), done: !!st.pact };
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
  const p = L.duelP(st, S, Q, L.PACT_FOE);
  const win = R() < p;
  st.pact = win ? 1 : -1;
  if (L.revealFoe) L.revealFoe(st, L.PACT_FOE);
  const res = { S, Q, p, win, assist, base: S / L.pactAssist(st), rank0: st.rank };
  st.stats.pactP = p;
  if (win) {
    st.beaten.mu = 1;
    L.markBeat(st, 'mu');
    if (L.addGrudge) res.grudge = L.addGrudge(st, 'mu', L.GRUDGE.win);   // 赢他 +20（rivals2.js）
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
    if (a && b && !a.id && !b.id && !a.rk && !b.rk) { st.ladder[i] = b; st.ladder[i + 1] = a; }   // 新秀不随路人起伏（他自己每届追 8 名）
  }
}
// 天骄论道：三场，目标依次是战力约为自己 0.6 / 0.9 / 1.2 倍的名次，单场最多上升 15 名
L.TOUR_STEP = 15;
L.tournament = function (st) {
  const S = L.power(st);
  st.stats.tour++;
  ladderDrift(st);
  const res = { n: st.stats.tour, startRank: st.rank, rounds: [], S };
  // 上回拍卖会上被天骄拍走的东西：论道开场提一句（台词里也提），提过就清掉
  res.aucNews = st.ladder.filter(x => x.aucNote).map(x => ({ n: x.n, id: x.id, item: x.aucNote, pw: x.pw || 1 }));
  const aucNote = new Map(st.ladder.filter(x => x.aucNote).map(x => [x.n, x.aucNote]));
  for (const x of st.ladder) delete x.aucNote;
  const mults = [0.6, 0.9, 1.2];
  for (let j = 0; j < 3; j++) {
    let q;
    if (st.rank === 1) q = 2;
    else {
      const blk = L.rivalBlock(st, Math.max(1, st.rank - L.TOUR_STEP));
      if (blk && blk === st.rank - 1 && L.rivalRefuses(st, blk)) { const hv = L.rivalAt(st, blk); res.hold = { id: hv.id, n: hv.n, q: blk, need: L.rivalWallStage(hv.id) }; break; }
      const lim = Math.max(1, st.rank - L.TOUR_STEP, blk);
      const target = S * mults[j];
      q = st.rank - 1; let best = Infinity;
      for (let x = st.rank - 1; x >= lim; x--) {
        const dlt = Math.abs(Math.log(L.rivalPower(st, x) / target));
        if (dlt < best) { best = dlt; q = x; }
      }
      // 宿敌优先：前方 15 名内有没打赢过的宿敌，且打得过，就打他
      for (let x = st.rank - 1; x >= lim; x--) { const rv = L.rivalAt(st, x); if (rv && rv.id && !st.beaten[rv.id] && L.rivalPower(st, x) < S * 1.6) { q = x; break; } }
      // 卡位宿敌就在身前：只能打他
      if (blk && blk === st.rank - 1) q = blk;
      // 通缉令（calendar.js）：被通缉的路人在 15 名以内、打得过，第一场就打他
      const wq = L.wantedRank(st), rq = L.rivalAt(st, q);
      if (j === 0 && wq && wq < st.rank && wq >= lim && !(rq && rq.id) && L.rivalPower(st, wq) < S * 1.6) q = wq;
      // 三年之约输了：第 1 届第一场固定是退婚的那位
      if (j === 0 && st.pact < 0 && !st.beaten.mu) { const mq = L.rivalRank(st, 'mu'); if (mq && mq < st.rank) q = mq; }
    }
    const rv = L.rivalAt(st, q);
    const Q = L.rivalPower(st, q);
    const foe = { kind: 'rival', q, id: rv && rv.id, streak: j };
    const Sr = L.duelPower(st, foe);
    const p = L.duelP(st, Sr, Q, foe);
    let win = R() < p, xx = false;
    // 玄霄在手：老祖“请出手”，每届 2 次，输掉的一场重掷（gear.js）
    if (!win && L.gearXuanxiao(st) && (res.xx || 0) < L.XX_TIMES) { res.xx = (res.xx || 0) + 1; xx = true; win = R() < p; }
    if (L.revealFoe && rv && rv.id) L.revealFoe(st, foe);
    const round = { q, rv, P: Q, S: Sr, p, win, xx, auc: rv ? aucNote.get(rv.n) : undefined, wanted: !!(rv && L.wanted(st) && L.wanted(st).who === rv.n) };
    if (win) {
      st.stats.tourWins = (st.stats.tourWins || 0) + 1;
      if (st.rank === 1) round.defend = true; else st.rank = q;
      const rw = Math.floor(L.income(st) * 4 + 50);
      round.stones = rw; st.stones += rw;
      if (st.sect) { round.contrib = L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.tour); L.taskHit(st, 'tour'); }
      if (rv && rv.id) { round.first = !st.beaten[rv.id]; st.beaten[rv.id] = (st.beaten[rv.id] || 0) + 1; L.markBeat(st, rv.id); if (L.addGrudge) round.grudge = L.addGrudge(st, rv.id, L.GRUDGE.win); }
      if (round.wanted) round.bounty = L.wantedPay(st, rv);
    }
    res.rounds.push(round);
    if (!win) break;
  }
  st.bestRank = Math.min(st.bestRank, st.rank);
  if (st.rank <= 12) L.fireTrigger(st, 'rank:12');
  // 新秀：每届往上追 8 名，追到身后就要打一场（rivals2.js）；参考战力记下本届的你
  if (L.rookieTour) res.rookie = L.rookieTour(st, S);
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
