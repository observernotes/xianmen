/* 废柴仙途 · 逻辑模块 mainline：主线保底——任何出身、试炼、选择、任何时候，九章主线都走得完（docs/STORY_PLAN.md §12）
 * 模块写法见 src/logic.js 顶部说明。排在 storyline 之后（改写各章 main.c / prog，包 L.tick / L.promoteNeeds / L.heirPower / L.rivalPower / L.warPower / L.sectWar / L.migrate）。
 *
 *   一张表 L.mainReqs(st, ch)：这一章（这条路）的主线由哪几项组成——rival 击败某位宿敌、srank 宗门身份、rank 天骄榜名次、boss 击败首领数、meet 会武压过天剑宗、
 *     war 击退来犯、flag 某个剧情标志位、beat 某个高潮节拍里的抉择（pre：这场戏要等的前置）、asc 渡过飞升天劫。
 *     各章 main.c、目标卡进度（ch.prog）、【去】（main.goOf）、老祖的提示、tools/main_check.js 的静态检查都读这一张表。
 *   路线：入宗（有宗门）/ 散修之路（L.loneRoute：没有宗门，且试炼无宗、散修丹师、三张帖子选了“哪家也不去”、被除名、已经过了第二章或已经接过帖子）。
 *     散修随时可以改主意：江湖 → 宗门里永远有【投帖】；入了宗就按入宗的那条算（已经做完的章不退）。
 *   入宗不看境界：第二章一开就是“三张帖子”那场戏；拒了、错过了，宗门 12 月（选了散修 36 月）后再来请；宗门页随时可投帖。
 *   宿敌打得到：这一章要击败的具名人物（慕容 / 赵乾 / 楚天阔 / 血无涯），在【江湖·天骄榜】点开他就能【下战书】（L.challengeRival；不看境界、不看名次，输了 6 月后再来）；
 *     只剩他没打时，他自己上门下战书一回（out.mainFoe）。
 *   兜底（L.MAIN_V）：这一章“没进展”（下面的进度分不涨）满 hint 月，老祖说一句明确的下一步（out.mainHint，之后每 hint 月一次）；
 *     满 ease 月起每 step 月降一级要求（out.mainEase，最多 3 级；在这一章累计满 inCh 月也降，每 inStep 月一级）：
 *       宿敌 / 原圣子 / 来犯的战力封顶为你的 ×1.6 → ×1.15 → ×0.8（胜算约 13% → 39% → 68%，降过一级的宿敌每 3 月上门一回）；
 *       天骄榜名次放宽（×1.5+5 → ×2.5+10 → 不再要求）；首领少 1 → 2 → 不再要求；晋升要的贡献 ×0.7 → ×0.45 → ×0.25，二级起长老人脉不再卡；
 *       二级起会武那一条由“击败楚天阔”顶替；来犯输了 6 月后再来。降级只在这一章内有效，过章清零。
 *   旧存档：读档时按“这一章是哪个月进的”（st.path.at）补算卡了多久；没宗门的立刻补一封入宗帖；要打的宿敌立刻上门一回。
 * 存档：st.mainG = { ch, in 进这一章的月, at 上次有进展的月, sig 进度分, e 降了几级, hint 上次提示的月, cd: { 宿敌: 可再战的月 }, visit: { 宿敌: 下次上门的月 }, rescue }；
 *   不升版本，L.migrateMainline 幂等。sim 对照：L.MAIN_EASE_ON = false（不降要求、不上门；入宗不看境界、下战书照旧）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const E = st => (st && st.eflags) || {};
const fmt = v => L.fmt(v), pct = p => Math.round(p * 100) + '%';
const CN = '一二三四五六七八九';
L.MAIN_V = { hint: 24, ease: 36, step: 12, inCh: 120, inStep: 24, max: 3, cd: 6, cdEase: 3, cap: [0, 1.6, 1.15, 0.8], visit: 6, rk: [1, 1.5, 2.5], rkAdd: [0, 5, 10], contrib: [1, 0.7, 0.45, 0.25], invite: 12, inviteSan: 36 };
L.MAIN_EASE_ON = true;
const V = L.MAIN_V;
const wuzong = st => !!(L.trialOn && L.trialOn(st, 'wuzong'));
L.sectBanned = wuzong;

// ---------- 路线 ----------
L.loneRoute = st => !!st && !!st.p && !st.sect && (wuzong(st) || st.origin === 'sanxiu' || !!E(st).path_san || !!E(st).sect_expelled || !!(st.evDone && st.evDone.s2_invite) || L.chapterNow(st) >= 2);

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
  rival: { sys: ['天骄榜', '下战书'], fn: ['challengeRival', 'challengeInfo', 'tournament'], ui: ['showRivalCard', 'runMainFoe'], act: '【江湖·天骄榜】点开他下战书；论道上碰到也算' },
  srank: { sys: ['宗门', '任务板', '晋升'], fn: ['joinSect', 'promote', 'promoteNeeds', 'taskTake'], ui: ['showSect', 'doPromote'], act: '【江湖·宗门】投帖入宗，做任务攒贡献，身份页点【晋升】' },
  rank: { sys: ['天骄论道'], fn: ['tournament', 'nextTour'], ui: ['runTournament'], act: '每 12 月一届天骄论道，自动登台' },
  boss: { sys: ['历练', '首领'], fn: ['bossReady', 'fightBoss'], ui: ['fightBossUI', 'showExp'], act: '【历练】挑有首领的图，评价打到乙以上首领就出来' },
  meet: { sys: ['九宗会武'], fn: ['sectMeet', 'nextMeet'], ui: ['runSectMeet'], act: '入宗满 12 月后每 24 月一届九宗会武，自动登台' },
  war: { sys: ['天剑宗来犯'], fn: ['sectWar', 'warChapter'], ui: ['runWar'], act: '第六章起天剑宗按日子来犯，备战卡提前一月提醒' },
  flag: { sys: ['剧情节拍'], fn: ['storyTick'], ui: ['showChoice'], act: '剧情自己找上门：在洞府歇一个月就放' },
  beat: { sys: ['剧情节拍'], fn: ['storyTick'], ui: ['showChoice'], act: '高潮那场戏：前置做完就放' },
  asc: { sys: ['突破', '天劫'], fn: ['tribStart', 'tribFinish', 'breakthrough'], ui: ['showBreakthrough'], act: '修到渡劫圆满，引动九九天劫' },
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

// ---------- 下战书 ----------
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
L.challengeInfo = function (st, id) {
  if (!st || !st.p || !L.RIVAL_INFO[id]) return null;
  const n = NAME(st, id), q = L.rivalRank(st, id), g = G(st);
  const I = { id, n, q, foe: foeOf(st, id), S: 0, Q: 0, p: 0, why: '', cd: 0, main: L.mainFoes(st).includes(id) };
  try { I.Q = L.rivalPower(st, q); I.S = L.duelPower(st, I.foe); I.p = L.duelP(st, I.S, I.Q, I.foe); } catch (err) { I.why = '他不在榜上'; return I; }
  if (st.beaten[id]) I.why = `已经击败过${n}`;
  else if (!I.main) I.why = `这一章不找${n}`;
  else if (id === 'mu' && !st.pact) I.why = '三年之约那天当众了结';
  else if (st.p.r > L.MAXR) I.why = '已飞升';
  else if (L.busy(st)) I.why = '人在外头，回洞府再说';
  else if ((g.cd[id] || 0) > st.tick) { I.cd = g.cd[id] - st.tick; I.why = `${n}说：${I.cd} 月后再来`; }
  return I;
};
L.challengeRival = function (st, id) {
  const I = L.challengeInfo(st, id); if (!I || I.why) return null;
  const g = G(st), rank0 = st.rank;
  const win = L.duelWin(st, I.S, I.Q, I.foe, I.p);
  if (L.revealFoe) L.revealFoe(st, I.foe);
  st.stats.chal = (st.stats.chal || 0) + 1;
  const res = { id, n: I.n, q: I.q, S: I.S, Q: I.Q, p: I.p, win, rank0, e: L.mainEase(st) };
  if (win) {
    res.first = !st.beaten[id];
    st.beaten[id] = (st.beaten[id] || 0) + 1;
    L.markBeat(st, id);
    if (L.addGrudge) res.grudge = L.addGrudge(st, id, L.GRUDGE.win);
    if (I.q && I.q < st.rank) { st.rank = I.q; st.bestRank = Math.min(st.bestRank, st.rank); }
    if (st.rank <= 12) L.fireTrigger(st, 'rank:12');
    res.stones = Math.floor(L.income(st) * 4 + 50); st.stones += res.stones;
    L.log(st, `${I.n}应了你的战书，当众落败！天骄榜第 ${st.rank}`, 'gold');
  } else {
    g.cd[id] = st.tick + (L.mainEase(st) >= 1 ? V.cdEase : V.cd);
    L.log(st, `向${I.n}下战书，惜败。${g.cd[id] - st.tick} 月后再战`, 'red');
  }
  res.rank1 = st.rank;
  L.checkQuests(st);
  return res;
};
// 约战输了：半年后才肯再比（第一届论道正好在那之后）
{ const pd0 = L.pactDuel; L.pactDuel = function (st) { const r = pd0.apply(this, arguments); if (r && !r.win) G(st).cd.mu = st.tick + V.cd; return r; }; }
// 上门的那一回：改日再说（冷却同输一场）
L.mainFoeLater = function (st, id) { const g = G(st); g.cd[id] = Math.max(g.cd[id] || 0, st.tick + (L.mainEase(st) >= 1 ? V.cdEase : V.cd)); };

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

// ---------- 来犯：降级时战力封顶、输了 6 月后再来 ----------
const warDue = st => pending(st, L.chapterNow(st)).some(x => x.k === 'war');
{ const wp0 = L.warPower; L.warPower = function (st) {
  const Q = wp0(); if (!st || !st.p || capping) return Q;
  const e = warDue(st) ? L.mainEase(st) : 0; if (!(e > 0)) return Q;
  capping++; try { return Math.min(Q, L.duelPower(st, { kind: 'war', id: 'tianjian' }) * L.wardMult(st) * V.cap[e]); } finally { capping--; }
}; }
{ const sw0 = L.sectWar; L.sectWar = function (st) {
  const r = sw0.apply(this, arguments);
  if (r && !r.win && L.mainEase(st) >= 1 && st.flags.war > st.tick + V.cd) st.flags.war = st.tick + V.cd;
  return r;
}; }

// ---------- 入宗：不看境界 ----------
// 头一回是第二章的“三张帖子”（storyline 的 c2_mid1，第二章一开就放）；那场戏结过了、还没宗门的，过 12 月（选了散修 36 月）宗门再来请（tick.js 的 out.invite → 界面三宗争徒）
L.inviteDue = function (st) {
  if (st.sect || !st.pact || wuzong(st) || L.busy(st) || st.tick <= L.PACT_TICK || L.chapterNow(st) < 1) return false;
  if (st.tick < (st.flags.inviteAt || 0)) return false;
  const s = st.story && st.story.beat;
  return !!(st.evDone && st.evDone.s2_invite) || !!(s && s.c2_mid1 === -1) || L.STORYLINE === false || !L.eventById('s2_invite');
};
// 三张帖子还在路上（节拍没放、或放了还排着没看）
const invitePending = st => { if (L.STORYLINE === false || !L.eventById('s2_invite') || (st.evDone && st.evDone.s2_invite)) return false; const b = st.story && st.story.beat && st.story.beat.c2_mid1; return b === undefined || (b >= 0 && ((st.storyQ || []).includes('s2_invite') || st.tick - b < 3)); };
L.invitePending = invitePending;
L.inviteNext = st => (st.flags.inviteAt || 0) - st.tick;
L.inviteDecline = function (st) { st.flags.inviteAt = Math.max(st.flags.inviteAt || 0, st.tick + (E(st).path_san ? V.inviteSan : V.invite)); };
// 宗门页的【投帖】：随时可以（无宗试炼除外）
L.sectApplyWhy = (st, id) => (st.sect ? '已有宗门' : wuzong(st) ? '天道试炼·无宗：这一世拜不进任何宗门' : !L.sectJoinable(st, id) ? '魔门没有人认得你' : !st.pact ? '三年之约之后再说' : '');
L.sectApply = (st, id) => !L.sectApplyWhy(st, id) && L.joinSect(st, id);

// ---------- 各章 main.c / prog / 【去】改读这张表 ----------
const promoName = (st, n) => L.srankName(st, n);
function progItem(st, x, ch, e) {
  const done = ok(st, x, e);
  switch (x.k) {
    case 'rival': {
      const n = NAME(st, x.id);
      if (done) return { k: x.id, t: n, v: 1, max: 1, text: `已击败${n}` };
      if (x.id === 'mu' && !st.pact) { const p = L.pactInfo(st).p; return { k: 'pact', t: '胜算', v: Math.min(p, 0.8), max: 0.8, text: `胜算 ${pct(p)} → 目标 80%` }; }
      const I = L.challengeInfo(st, x.id), p = I ? I.p : 0;
      const how = I && I.cd ? `${I.cd} 月后再战` : '去下战书';
      return { k: x.id, t: '对' + n + '胜算', v: Math.min(p, 0.8), max: 0.8, text: `对${n} ${pct(p)} · ${how}` };
    }
    case 'srank': {
      if (done) return { k: 'contrib', t: '身份', v: 1, max: 1, text: `已是${promoName(st, x.n)}` };
      if (!st.sect) return { k: 'sect', t: '入宗', v: 0, max: 1, text: '先入宗 · 去宗门投帖' };
      const to = st.sect.rank + 1, R0 = L.SRANKS[to];
      if (L.canPromote(st)) return { k: 'promo', t: '晋升', v: 0.95, max: 1, text: `可以晋升${promoName(st, to)}了` };
      const nd = L.promoteNeeds(st).find(y => !y.ok);
      const cv = Math.min(1, st.sect.total / Math.max(1, R0.c));
      if (nd && nd.k === 'contrib') return { k: 'contrib', t: '贡献', v: Math.min(st.sect.total, R0.c), max: R0.c, text: `${promoName(st, to)}：贡献 ${fmt(st.sect.total)} → ${fmt(Math.ceil(R0.c * V.contrib[srankEase(st, to)]))}` };
      return { k: 'promo', t: '晋升', v: cv * 0.9, max: 1, text: `${promoName(st, to)}：${nd ? nd.t.replace(/（.*$/, '') : '晋升'}` };
    }
    case 'rank': {
      const lim = rankLim(x.n, e), r = st.bestRank || 100;
      if (done) return { k: 'rank', t: '天骄榜', v: 1, max: 1, text: `天骄榜最高第 ${r}` };
      return { k: 'rank', t: '天骄榜', v: Math.max(0, 100 - Math.max(r, lim)), max: 100 - lim, text: `天骄榜 第 ${st.rank} → 前 ${lim}` };
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
      return { k: 'war', t: '守山', v: Math.min(S, Q), max: Q, text: `战力 ${fmt(S)} → 来犯 ${fmt(Q)}${left > 0 && left < 9000 ? ` · ${left} 月后来犯` : ''}` };
    }
    case 'flag': return { k: 'story', t: '主线', v: done ? 1 : 0, max: 1, text: done ? '剧情已到' : '剧情将至 · 回洞府' };
    case 'beat': return { k: 'story', t: '主线', v: done ? 1 : 0, max: 1, text: done ? '已作出选择' : '那一场戏就要来了' };
    case 'asc': { let p = 0; try { p = st.p.r >= 9 ? 1 : L.tribRate(st); } catch (err) { p = 0; } return { k: 'trib', t: '天劫', v: Math.min(1, p), max: 1, text: st.p.r >= 8 ? `飞升天劫 成功率 ${pct(p)}` : '修到渡劫圆满，引动九九天劫' }; }
  }
  return null;
}
// 进度项 → 界面跳转键（goalcard.js 的 GO_K；mainfoe = 这一章要打的宿敌的宿敌卡）
const GO_OF = { pact: 'big', sect: 'sect', contrib: 'sect', promo: 'sect', meet: 'sect', rank: 'rivals', boss: 'exp', war: 'prep', story: 'home', trib: 'cult' };
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
// 【去】：进度项 → 界面
{ const lg0 = L.lockGo; L.lockGo = (st, pr, ch) => goKey(pr) || lg0(st, pr, ch); }

// ---------- 下一步（目标卡【去】、老祖的提示共用） ----------
// must：眼下就能做、做了主线就往前走（投帖、晋升、胜算过半的下战书）——目标卡把它排在变强建议前面
L.mainStep = function (st) {
  if (!st || !st.p || st.p.r > L.MAXR || L.busy(st)) return null;
  const ch = L.chapterNow(st), e = easeOf(st, ch);
  for (const x of pending(st, ch)) {
    if (x.k === 'srank') {
      // 三张帖子那场戏还没来（第二章开头一两个月）：等它；没有那场戏的局面（旧档错过了、剧情关着）才直接去投帖
      if (!st.sect && !L.loneRoute(st) && !wuzong(st) && st.pact && L.chapterNow(st) >= 1 && !invitePending(st)) return { id: 'main:join', t: '投帖入宗', say: '去宗门投帖', go: 'sect', hl: '#modal [data-join]', must: 1 };
      if (st.sect && L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 1) return { id: 'main:promo', t: '晋升' + promoName(st, st.sect.rank + 1), say: '去宗门晋升', go: 'sect', hl: '#btnPromo', must: 1 };
    }
    if (x.k === 'rival') { const I = L.challengeInfo(st, x.id); if (I && !I.why && (I.p >= 0.5 || e >= 2)) return { id: 'main:chal:' + x.id, t: '向' + I.n + '下战书', say: `向${I.n}下战书（${pct(I.p)}）`, go: 'mainfoe', hl: '#btnChal', must: 1, foe: x.id }; }
  }
  return null;
};
// 一句话：下一步做什么（老祖的提示、路径页）
L.mainAdvice = function (st) {
  const ch = L.chapterNow(st), e = easeOf(st, ch), x = pending(st, ch)[0];
  if (!x) return { t: '这一章的事都做完了，静候下文。', go: 'path' };
  switch (x.k) {
    case 'rival': {
      const n = NAME(st, x.id);
      if (x.id === 'mu' && !st.pact) return { t: `三年之约那天当众打回去：眼下胜算 ${pct(L.pactInfo(st).p)}。`, go: 'big' };
      const I = L.challengeInfo(st, x.id);
      return { t: `去【江湖·天骄榜】点开${n}，下战书。眼下胜算 ${pct(I ? I.p : 0)}${I && I.cd ? `，${I.cd} 月后他才肯再打` : ''}；换克他的战技、强化兵器、服爆气丹都能抬一截。`, go: 'mainfoe' };
    }
    case 'srank': {
      if (!st.sect && invitePending(st)) return { t: '三大宗门的人这几天就到。在洞府等等，看他们开什么条件。', go: 'home' };
      if (!st.sect) return { t: wuzong(st) ? '这一世拜不进宗门，走散修的路。' : '去【江湖·宗门】挑一家投帖。不想入宗也行：哪家也不去，就走散修之路。', go: 'sect' };
      const nd = L.promoteNeeds(st).find(y => !y.ok);
      if (!nd) return { t: `可以晋升${promoName(st, st.sect.rank + 1)}了：【江湖·宗门】点【晋升】。`, go: 'sect' };
      return { t: `晋升${promoName(st, st.sect.rank + 1)}还差：${nd.t}。接任务板上的任务、去历练，都攒贡献。`, go: 'sect' };
    }
    case 'rank': return { t: `天骄榜要进前 ${rankLim(x.n, e)}：天骄论道每 12 月一届（还有 ${L.nextTour(st)} 月），每赢一场往上爬。`, go: 'rivals' };
    case 'boss': return { t: `还要击败 ${Math.max(0, bossLim(x.n, e) - bossN(st))} 个首领：【历练】里评价打到乙以上，首领就会出来。`, go: 'exp' };
    case 'meet': return st.sect ? { t: `九宗会武还有 ${L.nextMeet(st)} 月：一路打上去，压过天剑宗。`, go: 'sect' } : { t: '会武要宗门：去【江湖·宗门】投帖。', go: 'sect' };
    case 'war': { const left = (st.flags.war || 0) - st.tick; return { t: left > 0 && left < 9000 ? `天剑宗 ${left} 月后来犯。备战：护山阵、法宝、克他们的战技。` : '天剑宗就要来了。备好了等着。', go: 'prep' }; }
    case 'flag': case 'beat': return { t: '下一场戏就要来了：回洞府歇一个月。', go: 'home' };
    case 'asc': return { t: '修到渡劫圆满，引动九九天劫。', go: 'cult' };
  }
  return { t: '', go: 'path' };
};
const EASE_T = {
  rival: (st, x, e) => `${NAME(st, x.id)}这些年心魔缠身，剑不比当年了（他的战力封顶为你的 ×${V.cap[e]}）。`,
  srank: (st, x, e) => `宗门有意破格提拔你（晋升要的贡献 ×${V.contrib[e]}${e >= 2 ? '，长老人脉不再卡' : ''}）。`,
  rank: (st, x, e) => (e >= 3 ? '天骄榜名次不再要求。' : `天骄榜名次放宽到前 ${rankLim(x.n, e)}。`),
  boss: (st, x, e) => (bossLim(x.n, e) ? `首领少打一个：${bossLim(x.n, e)} 个就够。` : '首领不再要求。'),
  meet: (st, x, e) => (e >= 2 ? '天剑宗放话：楚天阔一败，会武上就弃权。' : ''),
  war: (st, x, e) => `天剑宗内乱，来犯的人马少了（战力封顶为你的 ×${V.cap[e]}，输了 ${V.cd} 月后再来）。`,
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
  if (stuck >= V.hint && st.tick - g.hint >= V.hint && !L.busy(st)) { g.hint = st.tick; const a = L.mainAdvice(st); out.mainHint = { ch, t: a.t, go: a.go, stuck }; }
}
// 宿敌上门：只剩他一个没打的时候来一回；降过级以后每 6 月一回；旧档救场立刻来（输了、改日的冷却期里不来）
function foeVisit(st, out) {
  if (L.MAIN_EASE_ON === false || !st || !st.p || st.p.r > L.MAXR || L.busy(st) || out.pact || out.tourney || out.war || out.meet || out.invite || out.rookie || out.mainHint) return;
  if (st.guide && !st.guide.done) return;
  const g = G(st), pend = pending(st, L.chapterNow(st)), only = pend.every(x => x.k === 'rival');
  if (!g.vOnly || typeof g.vOnly !== 'object') g.vOnly = {};
  for (const id of L.mainFoes(st)) {
    const I = L.challengeInfo(st, id); if (!I || I.why) continue;
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
// 三张帖子选了“哪家也不去”：宗门 36 月后再来请；入了宗（帖子、投帖都算）就不再是散修
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev) { const r = rc0.apply(this, arguments); if (r && ev && ev.id === 's2_invite' && st && !st.sect) L.inviteDecline(st); return r; }; }
{ const js0 = L.joinSect; L.joinSect = function (st) { const r = js0.apply(this, arguments); if (r && st.eflags && st.eflags.path_san) st.eflags.path_san = 0; return r; }; }

// 关键事件一结算，对应的剧情当场进队（storyline.js 的 L.storyKick：不看在外、不看间隔）
{ const cq0 = L.checkQuests; L.checkQuests = function (st) { const r = cq0.apply(this, arguments); if (L.storyKick) L.storyKick(st); return r; }; }
{ const mb0 = L.markBeat; L.markBeat = function (st) { const r = mb0.apply(this, arguments); if (st && L.storySort) L.storySort(st); return r; }; }
{ const ft0 = L.fireTrigger; L.fireTrigger = function (st) { const r = ft0.apply(this, arguments); if (st && st.storyQ && L.storySort) L.storySort(st); return r; }; }

// ---------- 旧存档 ----------
L.migrateMainline = function (s) {
  if (!s || !s.p || !s.quest || !s.flags) return s;
  if (s.mainG && typeof s.mainG === 'object') { G(s); return s; }
  const ch = L.chapterNow(s), at = s.path && Array.isArray(s.path.at) && s.path.at[ch] && typeof s.path.at[ch].t === 'number' ? s.path.at[ch].t : s.tick;
  const g = G(s);
  Object.assign(g, { ch, in: Math.min(at, s.tick), at: Math.min(at, s.tick), sig: sigOf(s, ch), e: 0, hint: s.tick - V.hint });
  if ((s.tick || 0) > 0 && ch >= 1 && s.p.r <= L.MAXR) {
    g.rescue = 1;
    // 没宗门、能入宗：马上补一封帖子（散修照样走得通；想入宗点了就入）
    if (!s.sect && !wuzong(s) && s.pact) s.flags.inviteAt = Math.min(s.flags.inviteAt || 0, s.tick);
  }
  return s;
};
{ const mg0 = L.migrate; L.migrate = function (s) { const r = mg0.apply(this, arguments); if (r) L.migrateMainline(r); return r; }; }
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); G(st); st.mainG.ch = 0; return st; }; }
});
