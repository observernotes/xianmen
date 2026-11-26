/* 废柴仙途 · 逻辑模块 mainline：主线保底——任何出身、试炼、选择、任何时候，九章主线都走得完（docs/STORY_PLAN.md §13、docs/AP_PLAN.md §5）
 * 模块写法见 src/logic.js 顶部说明。排在 storyline 之后（改写各章 main.c / prog，包 L.tick / L.promoteNeeds / L.heirPower / L.rivalPower / L.warPower / L.sectWar / L.migrate）。
 *
 *   一张表 L.mainReqs(st, ch)：这一章（这条路）的主线由哪几项组成——rival 击败某位宿敌、srank 宗门身份、rank 天骄榜名次、boss 击败首领数、meet 会武压过天剑宗、
 *     war 击退来犯、flag 某个剧情标志位、beat 某个高潮节拍里的抉择（pre：这场戏要等的前置）、asc 渡过飞升天劫。
 *     各章 main.c、目标卡进度（ch.prog）、【去】（main.goOf）、老祖的提示、L.mainActs、tools/main_check.js 的静态检查都读这一张表。
 *   路线（AP_PLAN §5.3）：没入宗就是散修（L.loneRoute = !st.sect）；入了宗就按入宗的那条算（已经做完的章不退）。
 *   主线行动（AP_PLAN §5.2，花点的事走 L.act，登记在 blocks.js）：
 *     下战帖 L.challenge(st, { id } | { q })：这一章点名、还没打赢的人（慕容——约战输了以后、赵乾、楚天阔、血无涯），或名次门槛前方的一位（{ q }：天骄榜第 q 名）。
 *       点名的人永远应战（不看境界、名次、L.rivalRefuses）；战力照旧（卡位 L.RIVAL_WALL 照算），打不打得过由战力说话。
 *       赢：击败、名次升到他那一名（最多 L.TOUR_STEP 名、不越过没打赢的卡位宿敌）；输：负伤到下季末、这个人 4 季内不再接帖（降过级的章 1 季）。
 *     拜山门 L.knock(st, id)：三年之约了结、没宗门、不是无宗试炼就能拜，不看境界（血煞魔宗仍要 L.sectJoinable）。
 *     主线最后一仗 L.finalFight(st)：第四章圣子之战（晋升圣子要当众击败原圣子）、第六章讨回山门（来犯输了以后提前打）。
 *       第七章阵前、第八章问剑是剧情里的抉择（s7_war / tianheng_2）：前置一满足当场放（结算链），输了按 fx.retry 向上取到季、到时候季初再放。
 *     L.mainActs(st) → [{ id, t, ap, ok, why, do: { id, args }, p?, grow? }]：这一章的主动行动（AP_PLAN §5.3 的表）；做不了时 why 写差什么，表尾跟一条能补差距的“变强”行动。
 *   兜底（L.MAIN_V，单位季，L.MAIN_V_S；L.MAIN_V 里是换算成的月）：这一章“没进展”（下面的进度分不涨）满 hint 季，老祖说一句明确的下一步；
 *     满 ease 季起每 step 季降一级要求（最多 3 级；在这一章累计满 inCh 季也降，每 inStep 季一级）：
 *       宿敌 / 原圣子 / 来犯 / 名次门槛前那一位的战力封顶为你的 ×1.6 → ×1.15 → ×0.8（胜算约 13% → 39% → 68%）——对手不再随日历变强（STORY_ACCEPTANCE R2）；
 *       天骄榜名次放宽（×1.5+5 → ×2.5+10 → 不再要求）；首领少 1 → 2 → 不再要求；晋升要的贡献 ×0.7 → ×0.45 → ×0.25，二级起长老人脉不再卡；
 *       二级起会武那一条由“击败楚天阔”顶替；降级只在这一章内有效，过章清零。
 *   境界与主线不挂钩：内门 / 真传 / 圣子不看境界；点名的人不看境界上台；首领要的地图开放写明“先突破到 X”（地图本来就按境界开）。
 *   旧存档：读档时按“这一章是哪个月进的”（st.path.at）补算卡了多久；要打的宿敌立刻上门一回；2.3.1 的旧成绩（按境界算的第七、八、九章主线）与新条件不符的清掉（R4）。
 * 存档：st.mainG = { ch, in 进这一章的月, at 上次有进展的月, sig 进度分, e 降了几级, hint 上次提示的月, cd: { 宿敌或路人名: 可再战的月 }, visit: { 宿敌: 下次上门的月 }, rescue }；
 *   不升版本，L.migrateMainline 幂等。sim 对照：L.MAIN_EASE_ON = false（不降要求、不上门）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const E = st => (st && st.eflags) || {};
const fmt = v => L.fmt(v), pct = p => Math.round(p * 100) + '%';
const SL = 3;   // 一季 = 3 个月（ap.js 的 L.SEASON_LEN；这里加载得早，先写死）
const up3 = v => Math.ceil(v / SL) * SL;
const sn = m => Math.max(0, Math.ceil(m / SL));   // 月 → 季（“还有 N 季”）
// 兜底的各档（单位：季）。L.MAIN_V 是换算成月的同一组数（逻辑里按 st.tick 比）
L.MAIN_V_S = { hint: 8, ease: 12, step: 4, inCh: 30, inStep: 8, max: 3, cd: 4, cdEase: 1, pactCd: 1, visit: 2, warRe: 4 };
L.MAIN_V = { max: 3, cap: [0, 1.6, 1.15, 0.8], rk: [1, 1.5, 2.5], rkAdd: [0, 5, 10], contrib: [1, 0.7, 0.45, 0.25] };
for (const k of ['hint', 'ease', 'step', 'inCh', 'inStep', 'cd', 'cdEase', 'pactCd', 'visit', 'warRe']) L.MAIN_V[k] = L.MAIN_V_S[k] * SL;
L.MAIN_EASE_ON = true;
const V = L.MAIN_V;
const wuzong = st => !!(L.trialOn && L.trialOn(st, 'wuzong'));
L.sectBanned = wuzong;

// ---------- 路线：没入宗就是散修 ----------
L.loneRoute = st => !!st && !!st.p && !st.sect;

// ---------- 主线的组成 ----------
const R = {
  rival: id => ({ k: 'rival', id }), srank: n => ({ k: 'srank', n }), rank: n => ({ k: 'rank', n }), boss: n => ({ k: 'boss', n }),
  meet: () => ({ k: 'meet' }), war: () => ({ k: 'war' }), flag: (f, beat) => ({ k: 'flag', f, beat }), asc: () => ({ k: 'asc' }),
  beat: (beat, flags, pre) => ({ k: 'beat', beat, flags, pre }),
};
L.mainReqs = function (st, ch) {
  const lone = L.loneRoute(st);
  switch (ch) {
    case 0: return [R.rival('mu')];
    case 1: return lone ? [R.rank(60), R.boss(2)] : [R.srank(1), R.rank(60)];
    case 2: return lone ? [R.rival('zhao'), R.boss(3)] : [R.srank(2), R.rival('zhao')];
    case 3: return lone ? [R.rank(20), R.boss(4)] : [R.srank(3)];
    case 4: return lone ? [R.rival('chu'), R.boss(5)] : [R.rival('chu'), R.meet()];
    case 5: return [R.war()];
    case 6: return [R.flag('st_truth', 'c7_open'), R.beat('c7_climax', L.STORY_WAR, [R.flag('st_truth', 'c7_open'), R.rival('xue')])];
    case 7: return [R.beat('c8_climax', L.STORY_LU, [R.flag('st_justice', 'c8_open'), R.rank(2)])];
    case 8: return [R.beat('c9_climax', L.STORY_ASC, [R.asc()])];
  }
  return [];
};
// 这一项怎么做（tools/main_check.js 的静态检查读它：靠哪个系统、哪个函数、界面哪个入口、能不能主动去做）
L.MAIN_HOW = {
  rival: { sys: ['天骄榜', '下战帖'], fn: ['challenge', 'challengeWhy', 'challengeInfo', 'tournament'], ui: ['showRivalCard'], act: '【下战帖 ◆1】（江湖·天骄榜点开他）；论道上碰到也算' },
  srank: { sys: ['宗门', '任务板', '晋升'], fn: ['knock', 'promote', 'promoteNeeds', 'taskTake'], ui: ['showSect', 'doPromote'], act: '【拜山门 ◆1】入宗，做任务攒贡献，身份页点【晋升】（不花点）；圣子要【圣子之战 ◆1】' },
  rank: { sys: ['天骄榜', '下战帖', '天骄论道'], fn: ['challenge', 'challengeTargets', 'tournament'], ui: ['runTournament'], act: '【下战帖 ◆1】打名次门槛前方的一位；每年冬季末天骄论道也往上打' },
  boss: { sys: ['历练', '首领'], fn: ['bossReady', 'fightBoss'], ui: ['fightBossUI', 'showExp'], act: '【历练】那张图的禁地评价打到乙，首领现身后【讨伐首领 ◆1】' },
  meet: { sys: ['九宗会武'], fn: ['sectMeet', 'nextMeet'], ui: ['runSectMeet'], act: '入宗满 4 季后隔年夏季末一届九宗会武，自动登台' },
  war: { sys: ['天剑宗来犯'], fn: ['sectWar', 'warChapter', 'finalFight'], ui: ['runWar'], act: '第六章进来第 2～3 季的季末来犯（固定日子）；输了 4 季后再来，或【讨回山门 ◆1】提前打' },
  flag: { sys: ['剧情节拍'], fn: ['storyTick', 'nextBlock'], ui: ['showChoice'], act: '开章那场戏：上一章章末卡关掉当场接着放' },
  beat: { sys: ['剧情节拍'], fn: ['storyKick', 'nextBlock'], ui: ['showChoice'], act: '高潮那场戏：前置做完当场放（同一条结算链）' },
  asc: { sys: ['突破', '天劫'], fn: ['tribStart', 'tribFinish', 'breakthrough'], ui: ['showBreakthrough'], act: '修到渡劫圆满，点【渡劫】（不花点）' },
};
const bossN = st => Object.keys(st.bosses || {}).filter(k => st.bosses[k]).length;
L.bossN = bossN;
const G = st => {
  let g = st.mainG;
  if (!g || typeof g !== 'object') g = st.mainG = { ch: -1, in: st.tick, at: st.tick, sig: -1, e: 0, hint: st.tick, cd: {}, visit: {}, rescue: 0 };
  if (!g.cd || typeof g.cd !== 'object') g.cd = {};
  if (!g.visit || typeof g.visit !== 'object') g.visit = {};
  return g;
};
L.mainState = G;
// 这一章降了几级（只有当前章有；别的章 0）
const easeOf = (st, ch) => { if (L.MAIN_EASE_ON === false || !st || !st.mainG) return 0; const g = st.mainG; return g.ch === ch && ch === L.chapterNow(st) ? g.e || 0 : 0; };
L.mainEase = st => easeOf(st, L.chapterNow(st));
const rankLim = (n, e) => (e >= 3 ? 100 : Math.min(99, Math.round(n * V.rk[e] + V.rkAdd[e])));
const bossLim = (n, e) => (e >= 3 ? 0 : Math.max(0, n - e));
L.mainRankLim = (st, n, ch) => rankLim(n, easeOf(st, ch === undefined ? L.chapterNow(st) : ch));
L.mainRankOk = (st, n, ch) => (st.bestRank || 100) <= L.mainRankLim(st, n, ch);
function ok(st, x, e) {
  switch (x.k) {
    case 'rival': return !!(st.beaten && st.beaten[x.id]);
    case 'srank': return !!st.sect && st.sect.rank >= x.n;
    case 'rank': return (st.bestRank || 100) <= rankLim(x.n, e);
    case 'boss': return bossN(st) >= bossLim(x.n, e);
    case 'meet': return !!st.flags.beatTianjian || (e >= 2 && !!st.beaten.chu);
    case 'war': return !!st.flags.warWon;
    case 'flag': return !!E(st)[x.f];
    case 'beat': return (x.flags || []).some(f => E(st)[f]);
    case 'asc': return st.p.r >= 9;
  }
  return false;
}
L.mainReqOk = (st, x, ch) => ok(st, x, easeOf(st, ch === undefined ? L.chapterNow(st) : ch));
// 这一章还没做完的项（beat 没做完时，展开成它还没做完的前置；前置都做完了就是那场戏本身）
function pending(st, ch) {
  const e = easeOf(st, ch), out = [];
  for (const x of L.mainReqs(st, ch)) {
    if (ok(st, x, e)) continue;
    if (x.k === 'beat') { const pre = (x.pre || []).filter(y => !ok(st, y, e)); if (pre.length) { for (const y of pre) if (!out.some(z => z.k === y.k && z.id === y.id && z.f === y.f)) out.push(y); continue; } }
    if (!out.some(z => z.k === x.k && z.id === x.id && z.f === x.f)) out.push(x);
  }
  return out;
}
L.mainPending = (st, ch) => pending(st, ch === undefined ? L.chapterNow(st) : ch);
// 这一章要打、还没打赢的宿敌
L.mainFoes = st => (st && st.p ? pending(st, L.chapterNow(st)).filter(x => x.k === 'rival').map(x => x.id) : []);
// 这一章还差的名次门槛（没有给 0）
const rankNeed = st => { const ch = L.chapterNow(st), x = pending(st, ch).find(y => y.k === 'rank'); return x ? rankLim(x.n, easeOf(st, ch)) : 0; };
L.mainRankNeed = rankNeed;

// ---------- 进度分（只用来判“有没有进展”；境界只在第九章算） ----------
function score(st, x, ch) {
  switch (x.k) {
    case 'rival': return st.beaten[x.id] ? 10 : 0;
    case 'srank': { if (!st.sect) return 0; if (st.sect.rank >= x.n) return 100; const nx = L.SRANKS[st.sect.rank + 1]; return 5 + st.sect.rank * 12 + (nx ? Math.floor(10 * Math.min(1, st.sect.total / Math.max(1, nx.c))) : 0); }
    case 'rank': return Math.floor((100 - Math.min(100, st.bestRank || 100)) / 3);
    case 'boss': return bossN(st) * 3;
    case 'meet': return (st.flags.beatTianjian ? 20 : 0) + (st.sect ? 9 - (st.sect.best || 9) : 0);
    case 'war': { if (st.flags.warWon) return 20; let S = 0, Q = 1; try { const foe = { kind: 'war', id: 'tianjian' }; S = L.duelPower(st, foe) * L.wardMult(st); Q = L.warPower(st); } catch (err) { return 0; } return Math.floor(10 * Math.min(1, S / Q)); }
    case 'flag': return E(st)[x.f] ? 10 : 0;
    case 'beat': return ok(st, x, 0) ? 50 : (x.pre || []).reduce((s, y) => s + score(st, y, ch), 0);
    case 'asc': return st.p.r >= 9 ? 50 : L.si(st.p);
  }
  return 0;
}
const sigOf = (st, ch) => L.mainReqs(st, ch).reduce((s, x) => s + score(st, x, ch), 0) + (st.sect ? 1 : 0);

// ---------- 下战帖 ----------
const NAME = (st, id) => L.rivalName(st, id);
const foeOf = (st, id) => ({ kind: 'rival', q: L.rivalRank(st, id), id, streak: 0 });
let capping = 0;
// 降级后的战力封顶：你对他的对决战力 × cap
const capQ = (st, foe, e, Q) => { if (!(e > 0) || capping) return Q; capping++; try { return Math.min(Q, L.duelPower(st, foe) * V.cap[e]); } finally { capping--; } };
{ const rp0 = L.rivalPower; L.rivalPower = function (st, q) {
  const Q = rp0.apply(this, arguments);
  if (capping || !st || !st.p || L.MAIN_EASE_ON === false || !st.mainG || !(st.mainG.e > 0)) return Q;
  const rv = L.rivalAt(st, q); if (!rv || !rv.id || rv.rk || !L.mainFoes(st).includes(rv.id)) return Q;
  return capQ(st, { kind: 'rival', q, id: rv.id, streak: 0 }, L.mainEase(st), Q);
}; }
const cdOf = st => (L.mainEase(st) >= 1 ? V.cdEase : V.cd);
L.chalCd = st => cdOf(st);   // 输了以后几个月才肯再接帖（界面写“N 季后”用 Math.ceil(月 / 3)）
// 名次门槛前方可以下帖的一位：前方 L.TOUR_STEP 名以内、不越过没打赢的卡位宿敌；挑胜算 ≥ 60% 里名次最高的，没有就挑胜算最高的；冷却中的跳过
function rankTarget(st) {
  const need = rankNeed(st); if (!need || st.rank <= 1) return null;
  const blk = L.rivalBlock(st, Math.max(1, st.rank - L.TOUR_STEP));
  const lim = Math.max(1, st.rank - L.TOUR_STEP, blk || 0), g = G(st);
  let best = null, sure = null;
  for (let q = st.rank - 1; q >= lim; q--) {
    const I = duelInfo(st, { q }); if (!I || I.why) continue;
    if (!best || I.p > best.p + 1e-9) best = I;
    if (I.p >= 0.6) sure = I;
  }
  void g;
  return sure || best;
}
// 一场下战帖的对手：args = { id }（点名的人）或 { q }（天骄榜第 q 名）
function duelInfo(st, args) {
  if (!st || !st.p) return null;
  const a = typeof args === 'string' ? { id: args } : args || {};
  let id = a.id, q = a.q;
  if (id && !L.RIVAL_INFO[id]) return null;
  if (id) q = L.rivalRank(st, id);
  const g = G(st), rv = q ? L.rivalAt(st, q) : null;
  if (!id && rv && rv.id) id = rv.id;
  const n = id ? NAME(st, id) : rv ? rv.n : '';
  const foe = { kind: 'rival', q, id: id || undefined, streak: 0 };
  const I = { id, q, n, key: id || (rv ? 'q:' + rv.n : ''), foe, S: 0, Q: 0, p: 0, why: '', cd: 0, main: !!id && L.mainFoes(st).includes(id), rankDuel: !a.id };
  if (!q || (!rv && !id)) { I.why = id ? `${n}不在天骄榜上` : '这一名没有人'; return I; }
  try { I.Q = L.rivalPower(st, q); I.S = L.duelPower(st, foe); } catch (err) { I.why = `${n}不在榜上`; return I; }
  // 名次门槛前那一位：降过级的章同样封顶（对手不随日历变强）
  if (I.rankDuel && !I.main) { const e = L.mainEase(st); if (e > 0) I.Q = capQ(st, foe, e, I.Q); }
  I.p = L.duelP(st, I.S, I.Q, foe);
  if (st.p.r > L.MAXR) I.why = '已飞升';
  else if (a.id) {
    if (st.beaten[id]) I.why = `已经击败过${n}`;
    else if (!I.main) I.why = `这一章不找${n}`;
    else if (id === 'mu' && !st.pact) I.why = '三年之约那天当众了结（第 12 季末）';
  } else {
    const need = rankNeed(st);
    if (!need) I.why = '这一章不看名次';
    else if (q >= st.rank) I.why = '他在你身后';
    else if (st.rank - q > L.TOUR_STEP) I.why = `一次最多往上挑 ${L.TOUR_STEP} 名`;
    else { const blk = L.rivalBlock(st, q); if (blk && blk > q) I.why = `${L.rivalAt(st, blk).n}挡在前面：先打赢他`; }
  }
  if (!I.why && L.busy(st)) I.why = st.run ? '人在秘境里' : '眼下有事在身';
  if (!I.why && I.key && (g.cd[I.key] || 0) > st.tick) { I.cd = g.cd[I.key] - st.tick; I.why = `${n}说：${sn(I.cd)} 季后再来`; }
  return I;
}
L.duelInfo = duelInfo;
// 旧接口（界面 src/ui/mainline.js、sim）：点名的人
L.challengeInfo = (st, id) => duelInfo(st, { id });
// 能下帖的对象：这一章点名的人 + 名次门槛前方的一位
L.challengeTargets = function (st) {
  if (!st || !st.p) return [];
  const a = L.mainFoes(st).filter(id => id !== 'mu' || st.pact).map(id => duelInfo(st, { id })).filter(Boolean);
  const r = rankTarget(st); if (r && !a.some(x => x.q === r.q)) a.push(r);
  return a;
};
L.challengeWhy = function (st, args) {
  const I = duelInfo(st, args && typeof args === 'object' && !Array.isArray(args) ? args : { id: args });
  return !I ? '没有这个人' : I.why;
};
// 打一场（结果对象；输赢都返回，没打成返回 null）
L.challenge = function (st, args) {
  const I = duelInfo(st, args && typeof args === 'object' && !Array.isArray(args) ? args : { id: args });
  if (!I || I.why) return null;
  const g = G(st), rank0 = st.rank;
  let win = L.duelWin(st, I.S, I.Q, I.foe, I.p), xx = false;
  if (I.id && L.revealFoe) L.revealFoe(st, I.foe);
  st.stats.chal = (st.stats.chal || 0) + 1;
  const res = { id: I.id, n: I.n, q: I.q, S: I.S, Q: I.Q, p: I.p, win, rank0, e: L.mainEase(st), main: I.main, rankDuel: I.rankDuel, xx };
  if (win) {
    if (I.id) { res.first = !st.beaten[I.id]; st.beaten[I.id] = (st.beaten[I.id] || 0) + 1; L.markBeat(st, I.id); if (L.addGrudge) res.grudge = L.addGrudge(st, I.id, L.GRUDGE.win); }
    if (I.q && I.q < st.rank) { st.rank = I.q; }
    st.bestRank = Math.min(st.bestRank, st.rank);
    if (st.rank <= 12) L.fireTrigger(st, 'rank:12');
    res.stones = Math.floor(L.income(st) * 4 + 50); st.stones += res.stones;
    if (st.sect && L.addContrib && L.contribFor) { res.contrib = L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.tour); }
    L.log(st, `${I.n}应了你的战帖，当众落败！天骄榜第 ${st.rank}`, 'gold');
  } else {
    if (I.key) g.cd[I.key] = st.tick + cdOf(st);
    const inj = L.AP_ON === false ? 3 : 4;
    st.p.inj = Math.max(st.p.inj || 0, inj); res.inj = inj;
    L.log(st, `向${I.n}下战帖，惜败。${sn(cdOf(st))} 季后再战`, 'red');
  }
  res.rank1 = st.rank;
  L.checkQuests(st);
  return res;
};
// 旧接口：点名的人
L.challengeRival = (st, id) => L.challenge(st, { id });
// 约战输了：下一季就能下帖补回
{ const pd0 = L.pactDuel; L.pactDuel = function (st) { const r = pd0.apply(this, arguments); if (r && !r.win) G(st).cd.mu = st.tick + V.pactCd; return r; }; }
// 上门的那一回：改日再说（冷却同输一场）
L.mainFoeLater = function (st, id) { const g = G(st); g.cd[id] = Math.max(g.cd[id] || 0, st.tick + cdOf(st)); };

// ---------- 晋升：内门 / 真传 / 圣子不看境界；降级时贡献、人脉、原圣子跟着降 ----------
const srankEase = (st, to) => { if (!st.sect) return 0; const e = L.mainEase(st); return e > 0 && pending(st, L.chapterNow(st)).some(x => x.k === 'srank' && x.n >= to) ? e : 0; };
L.mainSrankEase = srankEase;
{ const pn0 = L.promoteNeeds; L.promoteNeeds = function (st) {
  let a = pn0.apply(this, arguments);
  if (!st || !st.sect) return a;
  const to = st.sect.rank + 1;
  if (to <= 3) a = a.filter(x => x.k !== 'realm');
  const e = srankEase(st, to);
  if (e > 0) a = a.map(x => {
    if (x.k === 'contrib' || x.k === 'heirNone') {
      const base = x.k === 'contrib' ? L.SRANKS[to].c : Math.ceil(L.SRANKS[3].c * L.HEIR_NONE), need = Math.ceil(base * V.contrib[e]);
      return Object.assign({}, x, { t: `累计贡献 ${fmt(st.sect.total)} / ${fmt(need)}（宗门破格，原要 ${fmt(base)}）`, ok: st.sect.total >= need, v: Math.min(1, st.sect.total / need) });
    }
    if (x.k === 'elders' && e >= 2) return Object.assign({}, x, { ok: true, t: x.t + '（宗主破格，不再卡）' });
    return x;
  });
  return a;
}; }
{ const hp0 = L.heirPower; L.heirPower = function (st) { const Q = hp0(); if (!st || !st.sect) return Q; const e = srankEase(st, 3); return e > 0 ? capQ(st, { kind: 'heir', sect: st.sect.id }, e, Q) : Q; }; }

// ---------- 来犯：降级时战力封顶；输了 4 季后再来（或【讨回山门】提前打） ----------
const warDue = st => pending(st, L.chapterNow(st)).some(x => x.k === 'war');
{ const wp0 = L.warPower; L.warPower = function (st) {
  const Q = wp0(); if (!st || !st.p || capping) return Q;
  const e = warDue(st) ? L.mainEase(st) : 0; if (!(e > 0)) return Q;
  capping++; try { return Math.min(Q, L.duelPower(st, { kind: 'war', id: 'tianjian' }) * L.wardMult(st) * V.cap[e]); } finally { capping--; }
}; }
{ const sw0 = L.sectWar; L.sectWar = function (st) {
  const r = sw0.apply(this, arguments);
  if (r && !r.win && !st.flags.warWon) { st.flags.war = up3(st.tick + V.warRe); st.flags.warLost = (st.flags.warLost || 0) + 1; }
  return r;
}; }

// ---------- 入宗：不看境界，随时【拜山门】 ----------
// 头一回是第二章开章那条链末尾的“三张帖子”（storyline 的 c2_mid1）；之后不再有人上门来请（AP_PLAN §4.7），没宗门的随时【拜山门 ◆1】。
L.inviteDue = () => false;   // 三宗争徒的弹窗不再由 tick 触发（旧接口留着）
// 三张帖子还在路上（节拍没放、或放了还排着没看）
const invitePending = st => { if (L.STORYLINE === false || !L.eventById('s2_invite') || (st.evDone && st.evDone.s2_invite)) return false; const b = st.story && st.story.beat && st.story.beat.c2_mid1; return b === undefined ? L.chapterNow(st) >= 1 && !st.sect : b >= 0 && (st.storyQ || []).includes('s2_invite'); };
L.invitePending = invitePending;
L.inviteNext = () => 0;           // 旧接口：宗门不再来请，随时可以自己拜
L.inviteDecline = () => {};       // 旧接口
L.knockWhy = function (st, id) {
  if (!st || !st.p) return '没有这个人';
  if (st.sect) return '已有宗门';
  if (wuzong(st)) return '天道试炼·无宗：这一世拜不进任何宗门';
  if (!st.pact) return '三年之约之后再说';
  if (st.p.r > L.MAXR) return '已飞升';
  if (id !== undefined && !L.SECTS.some(s => s.id === id)) return '没有这个宗门';
  if (id !== undefined && !L.sectJoinable(st, id)) return '魔门没有人认得你';
  if (L.busy(st)) return '眼下有事在身';
  return '';
};
L.knock = function (st, id) {
  if (L.knockWhy(st, id)) return null;
  if (!L.joinSect(st, id)) return null;
  return { id, sect: st.sect, n: L.sectOf(st).n };
};
// 旧接口（宗门页的【投帖】）
L.sectApplyWhy = (st, id) => L.knockWhy(st, id);
L.sectApply = (st, id) => !!L.knock(st, id);

// ---------- 主线的最后一仗（AP_PLAN §5.2）：第四章圣子之战、第六章讨回山门 ----------
const heirDue = st => !!st.sect && st.sect.rank === 2 && !!L.SRANKS[3] && !!L.SRANKS[3].duel && pending(st, L.chapterNow(st)).some(x => x.k === 'srank' && x.n >= 3);
L.finalKind = function (st) {
  if (!st || !st.p) return '';
  const ch = L.chapterNow(st);
  if (heirDue(st)) return 'heir';
  if (ch === 5 && pending(st, ch).some(x => x.k === 'war') && st.flags.warLost && st.flags.war > st.tick) return 'war';
  return '';
};
L.finalWhy = function (st) {
  const k = L.finalKind(st), ch = L.chapterNow(st);
  if (st.p.r > L.MAXR) return '已飞升';
  if (L.busy(st)) return '眼下有事在身';
  if (k === 'heir') {
    const nd = L.promoteNeeds(st).find(y => !y.ok);
    if (nd) return `圣子之战之前：${nd.t.replace(/（.*$/, '')}`;
    if (st.tick - (st.flags.promoFail === undefined ? -99 : st.flags.promoFail) < SL) return `${L.heirName(st)}说：下一季再来`;
    return '';
  }
  if (k === 'war') return '';
  if (ch === 5 && !st.flags.warWon) { const left = (st.flags.war || 0) - st.tick; return left > 0 && left < 9000 ? `天剑宗 ${sn(left)} 季后的季末来犯（到日子自动迎战）` : '天剑宗就要来了（到日子自动迎战）'; }
  return '这一章没有最后一仗';
};
L.finalFight = function (st) {
  if (L.finalWhy(st)) return null;
  const k = L.finalKind(st);
  if (k === 'heir') { const r = L.promote(st); return r ? Object.assign({ final: 'heir', win: !!r.ok }, r) : null; }
  if (k === 'war') { const r = L.sectWar(st); return r ? Object.assign({ final: 'war' }, r) : null; }
  return null;
};
// 第四章（入宗）：晋升圣子要当众击败原圣子——用【圣子之战 ◆1】打；L.promote 本身照旧（sim、旧界面直接点也行）
L.finalP = function (st) {
  const k = L.finalKind(st);
  try {
    if (k === 'heir') { const foe = { kind: 'heir', sect: st.sect.id }; return L.duelP(st, L.duelPower(st, foe), L.heirPower(st), foe); }
    if (k === 'war') { const foe = { kind: 'war', id: 'tianjian' }; return L.duelP(st, L.duelPower(st, foe) * L.wardMult(st), L.warPower(st), foe); }
  } catch (err) { return 0; }
  return 0;
};

// ---------- 这一章的主动行动（AP_PLAN §5.3） ----------
const apWhy = (st, id, args) => (L.apWhy ? L.apWhy(st, id, args) : '');
const apCost = (st, id, args) => (L.apCost ? L.apCost(st, id, args) : 0);
const mk = (st, o) => { const d = o.do; o.ap = d ? apCost(st, d.id, d.args) : 0; if (o.ok === undefined) o.ok = !!d && !apWhy(st, d.id, d.args); if (!o.ok && !o.why) o.why = d ? apWhy(st, d.id, d.args) || '眼下做不了' : '眼下做不了'; if (o.ok) o.why = ''; return o; };
const regName = k => (L.REGIONS[k] ? L.REGIONS[k].n : '');
// 首领：现身了就讨伐；没现身就指向那张图要打的那一格（禁地评价乙）
function bossActs(st) {
  const a = [];
  for (let k = 0; k < L.REGIONS.length; k++) if (!st.bosses[k] && L.bossReady(st, k)) {
    let p; try { p = L.bossP ? L.bossP(st, k) : undefined; } catch (err) { p = undefined; }
    a.push(mk(st, { id: 'boss:' + k, t: `讨伐首领 · ${L.BOSSES[k] ? L.BOSSES[k].n : regName(k)}`, p, do: { id: 'boss', args: { k } } }));
  }
  if (a.length) return a;
  for (let k = 0; k < L.REGIONS.length; k++) {
    if (st.bosses[k]) continue;
    if (!L.regionOpen(st, k)) return [mk(st, { id: 'boss:open:' + k, t: `首领：${regName(k)}`, ok: false, why: `${regName(k)}要${L.regionLock(st, k)}（先突破 / 先把上一张图打到乙）`, do: null })];
    let d = 0; while (d < 2 && L.bestOf(st, k, d) >= 2) d++;
    if (!L.depthOpen(st, k, d)) d = Math.max(0, d - 1);
    return [mk(st, { id: 'boss:exp:' + k, t: `历练【${regName(k)}·${L.DEPTHS[d]}】评价乙（首领现身）`, do: { id: 'exp', args: { k, d, a: 0 } } })];
  }
  return [];
}
const grow = st => {
  const a = [];
  let c = null; try { c = L.expBest(st, 0); } catch (err) { c = null; }
  if (c) a.push(mk(st, { id: 'grow:exp', t: `历练变强 · ${regName(c.k)}`, grow: true, do: { id: 'exp', args: { k: c.k, d: c.d, a: c.a } } }));
  if (L.ACTS && L.ACTS.retreat && !apWhy(st, 'retreat')) a.push(mk(st, { id: 'grow:retreat', t: '闭关', grow: true, do: { id: 'retreat' } }));
  a.push(mk(st, { id: 'grow:sit', t: '打坐', grow: true, do: { id: 'sit' } }));
  return a;
};
L.mainActs = function (st, opt) {
  if (!st || !st.p) return [];
  opt = opt || {};
  if (st.p.r > L.MAXR) return [{ id: 'done', t: '已飞升', ap: 0, ok: false, why: '已证大道', do: null }];
  const ch = L.chapterNow(st), e = easeOf(st, ch), out = [];
  const seen = {};
  const push = o => { if (o && !seen[o.id]) { seen[o.id] = 1; out.push(o); } };
  for (const x of pending(st, ch)) {
    switch (x.k) {
      case 'rival': {
        if (x.id === 'mu' && !st.pact) { const left = Math.max(0, L.PACT_TICK - st.tick); push({ id: 'pact', t: `三年之约（${left <= SL ? '本季末' : '还有 ' + sn(left) + ' 季'}）`, ap: 0, ok: false, why: `到日子当众开打：第 12 季末，眼下胜算 ${pct(L.pactInfo(st).p)}`, do: null, wait: true }); break; }
        const I = duelInfo(st, { id: x.id });
        push(mk(st, { id: 'duel:' + x.id, t: `下战帖 · ${I ? I.n : NAME(st, x.id)}`, p: I ? I.p : 0, why: I ? I.why : '', ok: !!I && !I.why ? undefined : false, do: { id: 'duel', args: { id: x.id } } }));
        break;
      }
      case 'srank': {
        if (!st.sect) { for (const sc of L.sectsFor(st)) push(mk(st, { id: 'join:' + sc.id, t: `拜山门 · ${sc.n}`, do: { id: 'join', args: { id: sc.id } } })); break; }
        const to = st.sect.rank + 1;
        if (heirDue(st)) { const fw = L.finalWhy(st); push(mk(st, { id: 'final:heir', t: `圣子之战 · ${L.heirName(st)}`, p: L.finalP(st), why: fw, ok: fw ? false : undefined, do: { id: 'final' } })); break; }
        const nd = L.promoteNeeds(st).find(y => !y.ok);
        push(mk(st, { id: 'promote', t: `晋升${L.srankName(st, to)}`, why: nd ? `${nd.t.replace(/（.*$/, '')}：接任务板上的任务、去历练攒贡献` : '', ok: nd ? false : undefined, do: { id: 'promote' } }));
        break;
      }
      case 'rank': {
        const T = rankTarget(st), lim = rankLim(x.n, e);
        if (T) push(mk(st, { id: 'duel:q', t: `下战帖 · 第 ${T.q} 名 ${T.n}（名次 → 前 ${lim}）`, p: T.p, do: { id: 'duel', args: { q: T.q } } }));
        else { const blk = L.rivalBlock(st, Math.max(1, st.rank - L.TOUR_STEP)); push({ id: 'duel:q', t: `天骄榜 第 ${st.rank} → 前 ${lim}`, ap: 1, ok: false, why: blk ? `${L.rivalAt(st, blk).n}挡在前面，前方的人都说“改日再来”：${sn(Math.max(1, (G(st).cd['q:' + L.rivalAt(st, blk).n] || st.tick + SL) - st.tick))} 季后再挑` : '前方的人都在冷却：下一季再挑', do: null }); }
        break;
      }
      case 'boss': for (const b of bossActs(st)) push(b); break;
      case 'meet': {
        if (!st.sect) break;
        const m = L.nextMeet(st);
        push({ id: 'meet', t: `九宗会武（${m <= SL ? '本季末' : '还有 ' + sn(m) + ' 季'}）`, ap: 0, ok: false, why: '固定日子：隔年夏季末自动登台；先把宗门名次、自己的战力抬上去', do: null, wait: true });
        if (e >= 2 && !st.beaten.chu) push(mk(st, { id: 'duel:chu', t: `下战帖 · ${NAME(st, 'chu')}（顶替会武）`, do: { id: 'duel', args: { id: 'chu' } } }));
        break;
      }
      case 'war': {
        if (L.finalKind(st) === 'war') { push(mk(st, { id: 'final:war', t: '讨回山门 · 天剑宗', p: L.finalP(st), do: { id: 'final' } })); break; }
        const left = (st.flags.war || 0) - st.tick;
        push({ id: 'war', t: `天剑来犯（${left > 0 && left < 9000 ? (left <= SL ? '本季末' : '还有 ' + sn(left) + ' 季') : '就要来了'}）`, ap: 0, ok: false, why: `固定日子，到那一季季末自动迎战；眼下胜算 ${pct(L.finalP(st) || warP(st))}：护山阵、法宝、克他们的战技`, do: null, wait: true });
        break;
      }
      case 'flag': push({ id: 'story:' + x.f, t: '剧情将至', ap: 0, ok: false, why: `这一章开章那场戏（${x.beat}）在下一条结算链里出`, do: null, wait: true }); break;
      case 'beat': {
        const ev = L.events().find(v => v.where === 'story' && v.trigger === 'sb:' + x.beat && !st.evDone[v.id]);
        const rt = ev && st.story && st.story.retry && st.story.retry[ev.id];
        push({ id: 'story:' + x.beat, t: rt ? '再战（那一场戏）' : '那一场戏', ap: 0, ok: false, why: rt && rt > st.tick ? `两军各退三十里：${sn(rt - st.tick)} 季后（季初）再对阵` : '前置都齐了：这一条结算链里就放', do: null, wait: true });
        break;
      }
      case 'asc': push({ id: 'asc', t: '渡飞升天劫', ap: 0, ok: false, why: L.isReady && L.isReady(st) ? '修为圆满：点修为条上的【渡劫】（不花点）' : `修为还差：渡劫圆满才能引动九九天劫（闭关 / 打坐）`, do: null, wait: true }); break;
    }
  }
  // 拜山门（opt.side：路线的选择，不是这一条路的进度；江湖·宗门、目标卡的第二行用）
  if (opt.side && !st.sect && !L.knockWhy(st)) for (const sc of L.sectsFor(st)) push(mk(st, { id: 'join:' + sc.id, t: `拜山门 · ${sc.n}`, side: true, do: { id: 'join', args: { id: sc.id } } }));
  // 差什么时：表尾跟能补差距的行动（主线行动都做不了，或胜算不到六成）
  const good = out.some(o => o.ok && !o.grow && !o.side && (o.p === undefined || o.p >= 0.6));
  if (!good) for (const g of grow(st)) push(g);
  return out;
};
const warP = st => { try { const foe = { kind: 'war', id: 'tianjian' }; return L.duelP(st, L.duelPower(st, foe) * L.wardMult(st), L.warPower(st), foe); } catch (err) { return 0; } };
// 目标卡“下一步”：主线差的那一步（能做、胜算够的主线行动；不然是补差距的那一条）
L.mainNext = function (st) {
  const a = L.mainActs(st); if (!a.length) return null;
  return a.find(o => o.ok && !o.grow && (o.p === undefined || o.p >= 0.5)) || a.find(o => o.ok && o.grow) || a.find(o => o.ok) || a[0];
};
// 主线进度条的 k → 行动 id 的前缀（目标卡【去】用；AP_PLAN §5.4 的 L.GOAL_ACT）
L.GOAL_ACT = { pact: 'pact', rank: 'duel', mu: 'duel', zhao: 'duel', chu: 'duel', xue: 'duel', yun: 'duel', contrib: 'promote', promo: 'promote', sect: 'join', boss: 'boss', war: 'final', meet: 'meet', story: 'story', trib: 'asc' };

// ---------- 各章 main.c / prog / 【去】改读这张表 ----------
const promoName = (st, n) => L.srankName(st, n);
function progItem(st, x, ch, e) {
  const done = ok(st, x, e);
  switch (x.k) {
    case 'rival': {
      const n = NAME(st, x.id);
      if (done) return { k: x.id, t: n, v: 1, max: 1, text: `已击败${n}` };
      if (x.id === 'mu' && !st.pact) { const p = L.pactInfo(st).p; return { k: 'pact', t: '胜算', v: Math.min(p, 0.8), max: 0.8, text: `胜算 ${pct(p)} → 目标 80%` }; }
      const I = duelInfo(st, { id: x.id }), p = I ? I.p : 0;
      const how = I && I.cd ? `${sn(I.cd)} 季后再战` : '下战帖';
      return { k: x.id, t: '对' + n + '胜算', v: Math.min(p, 0.8), max: 0.8, text: `对${n} ${pct(p)} · ${how}` };
    }
    case 'srank': {
      if (done) return { k: 'contrib', t: '身份', v: 1, max: 1, text: `已是${promoName(st, x.n)}` };
      if (!st.sect) return { k: 'sect', t: '入宗', v: 0, max: 1, text: '先入宗 · 拜山门' };
      const to = st.sect.rank + 1, R0 = L.SRANKS[to];
      if (L.canPromote(st)) return { k: 'promo', t: '晋升', v: 0.95, max: 1, text: heirDue(st) ? `圣子之战 · 胜算 ${pct(L.finalP(st))}` : `可以晋升${promoName(st, to)}了` };
      const nd = L.promoteNeeds(st).find(y => !y.ok);
      const cv = Math.min(1, st.sect.total / Math.max(1, R0.c));
      if (nd && nd.k === 'contrib') return { k: 'contrib', t: '贡献', v: Math.min(st.sect.total, R0.c), max: R0.c, text: `${promoName(st, to)}：贡献 ${fmt(st.sect.total)} → ${fmt(Math.ceil(R0.c * V.contrib[srankEase(st, to)]))}` };
      return { k: 'promo', t: '晋升', v: cv * 0.9, max: 1, text: `${promoName(st, to)}：${nd ? nd.t.replace(/（.*$/, '') : '晋升'}` };
    }
    case 'rank': {
      const lim = rankLim(x.n, e), r = st.bestRank || 100;
      if (done) return { k: 'rank', t: '天骄榜', v: 1, max: 1, text: `天骄榜最高第 ${r}` };
      return { k: 'rank', t: '天骄榜', v: Math.max(0, 100 - Math.max(r, lim)), max: 100 - lim, text: `天骄榜 第 ${st.rank} → 前 ${lim} · 下战帖` };
    }
    case 'boss': { const v = bossN(st), n = bossLim(x.n, e); return { k: 'boss', t: '首领', v: Math.min(v, n), max: Math.max(1, n), text: v >= n ? `已击败首领 ${v} 个` : `首领 ${v} → ${n} 个 · 去历练` }; }
    case 'meet': {
      if (done) return { k: 'meet', t: '会武', v: 1, max: 1, text: st.flags.beatTianjian ? '会武压过天剑宗' : '天剑宗会武弃权' };
      if (!st.sect) return { k: 'sect', t: '入宗', v: 0, max: 1, text: '先入宗 · 会武要宗门' };
      const pos = L.sectPos(st) || 9, best = st.sect.best || pos;
      return { k: 'meet', t: '会武', v: Math.max(0, 9 - Math.max(best, 2)), max: 7, text: `宗门 第 ${pos} · 压过天剑宗` };
    }
    case 'war': {
      if (done) return { k: 'war', t: '守山', v: 1, max: 1, text: '已击退天剑宗' };
      const foe = { kind: 'war', id: 'tianjian' }; let S = 0, Q = 1;
      try { S = L.duelPower(st, foe) * L.wardMult(st); Q = L.warPower(st); } catch (err) { /* */ }
      const left = (st.flags.war || 0) - st.tick;
      return { k: 'war', t: '守山', v: Math.min(S, Q), max: Q, text: `战力 ${fmt(S)} → 来犯 ${fmt(Q)}${left > 0 && left < 9000 ? ` · ${left <= SL ? '本季末' : sn(left) + ' 季后'}来犯` : ''}` };
    }
    case 'flag': return { k: 'story', t: '主线', v: done ? 1 : 0, max: 1, text: done ? '剧情已到' : '剧情将至' };
    case 'beat': return { k: 'story', t: '主线', v: done ? 1 : 0, max: 1, text: done ? '已作出选择' : '那一场戏就要来了' };
    case 'asc': { let p = 0; try { p = st.p.r >= 9 ? 1 : L.tribRate(st); } catch (err) { p = 0; } return { k: 'trib', t: '天劫', v: Math.min(1, p), max: 1, text: st.p.r >= 8 ? `飞升天劫 成功率 ${pct(p)}` : '修到渡劫圆满，引动九九天劫' }; }
  }
  return null;
}
// 进度项 → 界面跳转键（goalcard.js 的 GO_K；mainfoe = 这一章要打的宿敌的宿敌卡）
const GO_OF = { pact: 'big', sect: 'sect', contrib: 'sect', promo: 'sectid', meet: 'sect', rank: 'rivals', boss: 'exp', war: 'prep', story: 'home', trib: 'cult' };
const goKey = pr => (pr ? GO_OF[pr.k] || (L.RIVAL_INFO[pr.k] ? 'mainfoe' : '') : '');
L.mainGoKey = goKey;
const sortP = a => a.filter(Boolean).sort((x, y) => Math.min(1, x.v / (x.max || 1)) - Math.min(1, y.v / (y.max || 1)));
L.CHAPTERS.forEach((C, i) => {
  const m = C.main;
  m.c = st => { const e = easeOf(st, i); return L.mainReqs(st, i).every(x => ok(st, x, e)); };
  m.goOf = st => { let pr = null; try { pr = (C.prog(st) || [])[0]; } catch (err) { pr = null; } return goKey(pr) || m.go; };
  // 第一章约战之前、第九章：原来的进度条照旧（约战胜算、天劫成功率）；其余章读表
  if (i === 0 || i === 8) return;
  C.prog = st => { const e = easeOf(st, i); const a = []; for (const x of pending(st, i)) a.push(progItem(st, x, i, e)); for (const x of L.mainReqs(st, i)) if (ok(st, x, e) && x.k !== 'beat') a.push(progItem(st, x, i, e)); return sortP(a); };
});
{ const p0 = L.CHAPTERS[0].prog; L.CHAPTERS[0].prog = st => (st.pact < 0 && !st.beaten.mu ? [progItem(st, R.rival('mu'), 0, easeOf(st, 0))] : p0(st)); }
// 散修之路的主线文字（path.js 的 L.LONE 按 L.loneRoute 切换，这里只是让它读新的路线判定）
// 【去】：进度项 → 界面
{ const lg0 = L.lockGo; L.lockGo = (st, pr, ch) => goKey(pr) || lg0(st, pr, ch); }

// ---------- 下一步（目标卡【去】、老祖的提示共用） ----------
// 旧接口（sim、界面）：眼下就能做、做了主线就往前走的一步
L.mainStep = function (st) {
  if (!st || !st.p || st.p.r > L.MAXR || L.busy(st)) return null;
  const a = L.mainNext(st); if (!a || !a.ok || a.grow) return null;
  const d = a.do || {};
  const go = d.id === 'join' ? 'sect' : d.id === 'promote' ? 'sectid' : d.id === 'final' ? (L.finalKind(st) === 'heir' ? 'sectid' : 'prep') : d.id === 'boss' ? 'exp' : d.id === 'exp' ? 'exp' : d.id === 'duel' ? (d.args && d.args.id ? 'mainfoe' : 'rivals') : 'path';
  const must = d.id === 'join' || d.id === 'promote' || d.id === 'final' || (d.id === 'duel' && (a.p >= 0.5 || L.mainEase(st) >= 2)) ? 1 : 0;
  return { id: 'main:' + a.id, t: a.t, say: a.t, go, hl: d.id === 'promote' ? '#btnPromo' : d.id === 'duel' && d.args && d.args.id ? '#btnChal' : null, must, foe: d.id === 'duel' && d.args ? d.args.id : undefined, q: d.id === 'duel' && d.args ? d.args.q : undefined, ap: a.ap, do: a.do, act: a };
};
// 一句话：下一步做什么（老祖的提示、路径页）
L.mainAdvice = function (st) {
  const ch = L.chapterNow(st), e = easeOf(st, ch), x = pending(st, ch)[0];
  if (!x) return { t: '这一章的事都做完了，静候下文。', go: 'path' };
  switch (x.k) {
    case 'rival': {
      const n = NAME(st, x.id);
      if (x.id === 'mu' && !st.pact) return { t: `三年之约那天当众打回去：眼下胜算 ${pct(L.pactInfo(st).p)}。`, go: 'big' };
      const I = duelInfo(st, { id: x.id });
      return { t: `去【江湖·天骄榜】点开${n}，下战帖（1 点）。眼下胜算 ${pct(I ? I.p : 0)}${I && I.cd ? `，${sn(I.cd)} 季后他才肯再打` : ''}；换克他的战技、强化兵器、服爆气丹都能抬一截。`, go: 'mainfoe' };
    }
    case 'srank': {
      if (!st.sect) return { t: wuzong(st) ? '这一世拜不进宗门，走散修的路。' : '去【江湖·宗门】挑一家【拜山门】（1 点）。不想入宗也行：没入宗就是散修。', go: 'sect' };
      if (heirDue(st) && L.canPromote(st)) return { t: `贡献够了：去【江湖·宗门】打【圣子之战】（1 点），胜算 ${pct(L.finalP(st))}。`, go: 'sectid' };
      const nd = L.promoteNeeds(st).find(y => !y.ok);
      if (!nd) return { t: `可以晋升${promoName(st, st.sect.rank + 1)}了：【江湖·宗门】点【晋升】（不花点）。`, go: 'sect' };
      return { t: `晋升${promoName(st, st.sect.rank + 1)}还差：${nd.t}。接任务板上的任务、去历练，都攒贡献。`, go: 'sect' };
    }
    case 'rank': { const T = rankTarget(st); return { t: `天骄榜要进前 ${rankLim(x.n, e)}：${T ? `向第 ${T.q} 名${T.n}下战帖（1 点，胜算 ${pct(T.p)}）` : '前方的人都在冷却，下一季再挑'}；每年冬季末的天骄论道也往上打。`, go: 'rivals' }; }
    case 'boss': { const b = bossActs(st)[0]; return { t: `还要击败 ${Math.max(0, bossLim(x.n, e) - bossN(st))} 个首领：${b ? b.t + (b.ok ? '' : '（' + b.why + '）') : '【历练】里禁地评价打到乙，首领就会出来'}。`, go: 'exp' }; }
    case 'meet': return st.sect ? { t: `九宗会武还有 ${sn(L.nextMeet(st))} 季：一路打上去，压过天剑宗。`, go: 'sect' } : { t: '会武要宗门：去【江湖·宗门】拜山门。', go: 'sect' };
    case 'war': { const left = (st.flags.war || 0) - st.tick; return { t: left > 0 && left < 9000 ? `天剑宗 ${sn(left)} 季后的季末来犯。备战：护山阵、法宝、克他们的战技。` : '天剑宗就要来了。备好了等着。', go: 'prep' }; }
    case 'flag': case 'beat': return { t: '下一场戏就要来了。', go: 'home' };
    case 'asc': return { t: '修到渡劫圆满，引动九九天劫。', go: 'cult' };
  }
  return { t: '', go: 'path' };
};
const EASE_T = {
  rival: (st, x, e) => `${NAME(st, x.id)}这些年心魔缠身，剑不比当年了（他的战力封顶为你的 ×${V.cap[e]}）。`,
  srank: (st, x, e) => `宗门有意破格提拔你（晋升要的贡献 ×${V.contrib[e]}${e >= 2 ? '，长老人脉不再卡' : ''}）。`,
  rank: (st, x, e) => (e >= 3 ? '天骄榜名次不再要求。' : `天骄榜名次放宽到前 ${rankLim(x.n, e)}；前方那几位也不比从前（战力封顶为你的 ×${V.cap[e]}）。`),
  boss: (st, x, e) => (bossLim(x.n, e) ? `首领少打一个：${bossLim(x.n, e)} 个就够。` : '首领不再要求。'),
  meet: (st, x, e) => (e >= 2 ? '天剑宗放话：楚天阔一败，会武上就弃权。' : ''),
  war: (st, x, e) => `天剑宗内乱，来犯的人马少了（战力封顶为你的 ×${V.cap[e]}）。`,
};

// ---------- 每月 ----------
function track(st, out) {
  if (!st || !st.p || st.p.r > L.MAXR) return;
  const g = G(st), ch = L.chapterNow(st);
  if (g.ch !== ch) { g.ch = ch; g.in = st.tick; g.at = st.tick; g.e = 0; g.hint = st.tick; g.sig = sigOf(st, ch); g.visit = {}; g.vOnly = {}; return; }
  if (ch === 0 && !st.pact) { g.in = g.at = st.tick; return; }   // 约战之前不算卡
  const s = sigOf(st, ch);
  if (s > g.sig) { g.sig = s; g.at = st.tick; }
  if (L.MAIN_EASE_ON === false) return;
  const stuck = st.tick - g.at, inCh = st.tick - g.in;
  let e = stuck >= V.ease ? 1 + Math.floor((stuck - V.ease) / V.step) : 0;
  if (inCh >= V.inCh) e = Math.max(e, 1 + Math.floor((inCh - V.inCh) / V.inStep));
  e = Math.min(V.max, e);
  if (e > (g.e || 0)) {
    g.e = e;
    const lines = L.mainReqs(st, ch).concat(...L.mainReqs(st, ch).filter(x => x.k === 'beat').map(x => x.pre || [])).filter(x => !ok(st, x, e - 1) && EASE_T[x.k]).map(x => EASE_T[x.k](st, x, e)).filter(Boolean);
    const uniq = lines.filter((t, j) => lines.indexOf(t) === j);
    if (uniq.length) { out.mainEase = { e, ch, lines: uniq, next: L.mainAdvice(st) }; L.log(st, `老祖：“${uniq.join('')}”`, 'gold'); }
    L.checkQuests(st);
  }
  if (stuck >= V.hint && st.tick - g.hint >= V.hint) { g.hint = st.tick; const a = L.mainAdvice(st); out.mainHint = { ch, t: a.t, go: a.go, stuck }; }
}
// 宿敌上门：只剩他一个没打的时候来一回；降过级以后每 2 季一回；旧档救场立刻来（输了、改日的冷却期里不来）
function foeVisit(st, out) {
  if (L.MAIN_EASE_ON === false || !st || !st.p || st.p.r > L.MAXR || out.pact || out.tourney || out.war || out.meet || out.rookie || out.mainHint) return;
  if (st.guide && !st.guide.done) return;
  const g = G(st), pend = pending(st, L.chapterNow(st)), only = pend.every(x => x.k === 'rival');
  if (!g.vOnly || typeof g.vOnly !== 'object') g.vOnly = {};
  for (const id of L.mainFoes(st)) {
    const I = duelInfo(st, { id }); if (!I || I.why) continue;
    const due = g.rescue || (only && !g.vOnly[id]) || (L.mainEase(st) >= 1 && st.tick >= (g.visit[id] || 0));
    if (!due) continue;
    g.vOnly[id] = 1; g.rescue = 0; g.visit[id] = st.tick + V.visit;
    out.mainFoe = id;
    return;
  }
}
{ const tk0 = L.tick; L.tick = function (st, cont) {
  const out = tk0.apply(this, arguments);
  if (st && st.p) { track(st, out); foeVisit(st, out); }
  return out;
}; }
// 入了宗（帖子、拜山门都算）就不再是散修
{ const js0 = L.joinSect; L.joinSect = function (st) { const r = js0.apply(this, arguments); if (r && st.eflags && st.eflags.path_san) st.eflags.path_san = 0; return r; }; }

// 关键事件一结算，对应的剧情当场进队（storyline.js 的 L.storyKick：不看在外、不看间隔）
{ const cq0 = L.checkQuests; L.checkQuests = function (st) { const r = cq0.apply(this, arguments); if (L.storyKick) L.storyKick(st); return r; }; }
{ const mb0 = L.markBeat; L.markBeat = function (st) { const r = mb0.apply(this, arguments); if (st && L.storySort) L.storySort(st); return r; }; }
{ const ft0 = L.fireTrigger; L.fireTrigger = function (st) { const r = ft0.apply(this, arguments); if (st && st.storyQ && L.storySort) L.storySort(st); return r; }; }

// ---------- 旧存档 ----------
// 2.3.1 的章按境界推：旧档里可能记着“第七章主线完成”（当时是击败血无涯）。第七、八、九章的主线现在是剧情抉择，
// 旧成绩与新条件不符的清掉，那几章的节拍重新算（不然走到那里直接跳过、抉择六不出）——STORY_ACCEPTANCE R4
function fixOldDone(s) {
  if (!s.quest || !s.quest.done) return 0;
  let n = 0;
  for (const i of [6, 7, 8]) { const k = 'c' + i + '_m'; if (s.quest.done[k] && !L.CHAPTERS[i].main.c(s)) { delete s.quest.done[k]; n++; } }
  if (!n) return 0;
  const now = L.chapterNow(s);
  for (let i = now + 1; i < 9; i++) delete s.quest.done['c' + i + '_m'];   // 做完的主线永远是从第一章起连续的一段
  if (s.story && s.story.beat) for (const b of L.STORY_BEATS) if (b.ch >= now && s.story.beat[b.id] === -1) delete s.story.beat[b.id];
  if (s.story && s.story.chAt) for (const c in s.story.chAt) if (+c > now) delete s.story.chAt[c];
  if (s.path && s.path.ch > now) s.path.ch = now;
  return n;
}
L.migrateMainline = function (s) {
  if (!s || !s.p || !s.quest || !s.flags) return s;
  if (s.mainG && typeof s.mainG === 'object') { G(s); return s; }
  fixOldDone(s);
  const ch = L.chapterNow(s), at = s.path && Array.isArray(s.path.at) && s.path.at[ch] && typeof s.path.at[ch].t === 'number' ? s.path.at[ch].t : s.tick;
  const g = G(s);
  Object.assign(g, { ch, in: Math.min(at, s.tick), at: Math.min(at, s.tick), sig: sigOf(s, ch), e: 0, hint: s.tick - V.hint });
  if ((s.tick || 0) > 0 && ch >= 1 && s.p.r <= L.MAXR) g.rescue = 1;
  return s;
};
L.mainFixOld = fixOldDone;
{ const mg0 = L.migrate; L.migrate = function (s) { const r = mg0.apply(this, arguments); if (r) L.migrateMainline(r); return r; }; }
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); G(st); st.mainG.ch = 0; return st; }; }
});
