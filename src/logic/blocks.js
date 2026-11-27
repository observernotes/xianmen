/* 废柴仙途 · 逻辑模块 blocks：结算链的完整实现（docs/AP_PLAN.md §4.2～§4.6、§5.2、§8.3）
 * 模块写法见 src/logic.js 顶部说明。排在 ap 之后（包 L.nextBlock / L.blockDone / L.chainOpen / L.act / L.seasonEnd / L.fireTrigger / L.resolveChoice；用 L.regAct 登记下战帖、拜山门、最后一仗、晋升）。
 *
 *   一句话：一件事结算完，它引出的所有阻塞内容当场连着出完，然后才回到主界面。界面循环 L.nextBlock(st) → 出一张 → L.blockDone(st, x)，到 null 为止。
 *   L.nextBlock 的顺序（每次现算，出完一类再出下一类）：
 *     1 这个行动自己的结算卡 / 季末卡、年报（kind 'result' | 'season' | 'year'，ap.js 排进来的）
 *     2～5 按章排：同一章里 开章 → 三张帖子 → 补发的系统剧情（realm:N）→ 这件事直接触发的系统剧情 → pre → 推迟到 pre 之后的那一仗（kind 'act'）→ 高潮 → 收尾 → 章末卡（kind 'chapter'）；
 *         再下一章（一口气跨两章时：第三章的收尾、章末卡、第四章开章、第四章的高潮……照章序连着出）
 *     6 这件事“已经发生”所以必须立刻开的解锁卡（kind 'unlock'，force 类）
 *     7 固定日子的大事（kind 'big'：pact / tour / meet / war / rookie / death，另加宿敌上门 foe）——界面演出时调 L.blockRun(st, x) 拿结果；不调的话 L.blockDone 代为执行
 *     8 季初（只在季末那条链里、链尾）：一场闲戏（中段主线戏优先，其次人物戏）、一张排队的解锁卡（各至多一件）
 *   闲戏（中段节拍、人物戏 sb:mid）与主线戏分两类：闲戏只在季初出，永远不挡主线戏；主线戏、系统剧情随时当场出。
 *   pre（高潮前那场铺垫）：玩家点了这一章的最后一仗（下战帖点名的人 / 名次门槛那一场 / 圣子之战）——先放 pre，那一仗推迟到 pre 结算完再打（kind 'act'）；没有可放的 pre 就当场打。
 *   补发（st.path.hold）：章一变，按章序连着放；一条链里因补发连播的最多 3 场，超出的留到下一季。
 *   延迟打点（§8.3）：st.story.lag[事件 id] = { due: 条件成立（进队）时的 seq, shown: 出链时的 seq, via: 'chain' | 'resolve' }；
 *     seq 是 st.ap.seq（行动、季末结算各 +1）；行动、季末结算进行中进队的，due 记成结算完以后的 seq（和出链时同一个口径）。
 * 存档：st.story.qm（队列里每场戏的章与 due）、lag、chCard（章末卡出到第几章）、ucard（出过卡的解锁项）、bigQ（还没出的大事，链断在半路读档后接着出）、defer（推迟到 pre 之后的那一仗）。
 *   新档与旧档都由 L.newState / L.migrate 的包装补齐（旧档：已过的章末卡、已开的解锁项算出过）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const SL = L.SEASON_LEN;
// ---------- 存档与不进存档的链内计数 ----------
const hid = (st, k, v) => { if (!Object.prototype.hasOwnProperty.call(st, k)) Object.defineProperty(st, k, { value: v(), enumerable: false, writable: true, configurable: true }); return st[k]; };
const C = st => hid(st, '_bkChain', () => ({ why: '', rel: 0, idle: 0, unl: 0, n: 0 }));
const blk = st => hid(st, '_apBlk', () => []);   // ap.js 的同一个队列
const S = st => {
  const s = L.storyState(st);
  if (!s.qm || typeof s.qm !== 'object') s.qm = {};
  if (!s.lag || typeof s.lag !== 'object') s.lag = {};
  if (typeof s.chCard !== 'number') s.chCard = L.chapterNow(st) - 1;
  if (!s.ucard || typeof s.ucard !== 'object') { s.ucard = {}; const at = (st.onb && st.onb.at) || {}; for (const k in at) s.ucard[k] = at[k]; }
  if (!Array.isArray(s.bigQ)) s.bigQ = [];
  return s;
};
L.chainState = S;
let inAct = 0, inSeason = 0;
// 这件事结算完以后的 seq（行动、季末结算进行中进队的戏，和出链时同一个口径）
const seqNow = st => L.apState(st).seq + (inAct || inSeason ? 1 : 0);
L.chainSeq = seqNow;

// ---------- 队列里每场戏的章与 due ----------
const stamp = st => {
  if (!st || !st.p || !Array.isArray(st.storyQ) || !st.storyQ.length) return;
  const s = S(st), q = seqNow(st), ch = L.chapterNow(st);
  for (const id of st.storyQ) {
    if (!s.qm[id]) s.qm[id] = { ch, due: q, t: st.tick };
    if (!s.lag[id]) s.lag[id] = { due: q };
  }
};
{ const ft0 = L.fireTrigger; L.fireTrigger = function (st) { const r = ft0.apply(this, arguments); stamp(st); return r; }; }
const evChapter = (st, ev, m) => {
  const t = (ev && ev.trigger) || '';
  const mm = /^sb:c(\d)_/.exec(t); if (mm) return +mm[1] - 1;
  const c = L.STORY_CH ? L.STORY_CH(t) : -1; if (c >= 0) return Math.floor(c);
  return m && typeof m.ch === 'number' ? m.ch : L.chapterNow(st);
};
// 同一章里的先后：开章 1 → 三张帖子 1.5 → 补发的 realm:N 1.2 → 系统剧情 2 → 过了章补放的中段 2.5 → pre 3 → 推迟的那一仗 3.5 → 高潮 4 → 收尾 5 → 章末卡 6
const SLOT_LOC = { open: 1, mid1: 2.5, mid2: 2.5, mid3: 2.5, pre: 3, climax: 4, end: 5 };
const evLoc = ev => {
  const t = (ev && ev.trigger) || '';
  if (t === 'sb:c2_mid1') return 1.5;
  const m = /^sb:c\d_(\w+)$/.exec(t); if (m) return SLOT_LOC[m[1]] || 2;
  if (/^realm:/.test(t)) return 1.2;
  return 2;
};
const LV = loc => (loc <= 1.5 ? 5 : loc < 3 ? 2 : loc < 6 ? 3 : 4);
// 闲戏：这一章的中段戏、人物戏（过了章还没放的带抉择中段戏算主线戏，按它那一章排）
const isIdle = (st, ev) => !!ev && L.storyIdle && L.storyIdle(ev) && (ev.trigger === 'sb:mid' || evChapter(st, ev) >= L.chapterNow(st));

// ---------- 链 ----------
const chainOpen0 = L.chainOpen;
L.chainOpen = function (st, why) {
  const r = chainOpen0.apply(this, arguments);
  if (why === undefined || !st) return r;
  Object.assign(C(st), { why, rel: 0, idle: 0, unl: 0, n: 0 });
  housekeep(st, true);
  return r;
};
// 每出一张之前：补发、补放、关键戏补进队列、给新进队的戏打点
function housekeep(st, open) {
  if (!st || !st.p || !st.storyQ) return;
  const c = C(st);
  if (L.storyGuideHold && L.storyGuideHold(st)) { stamp(st); return; }
  if (open && L.storyKick) L.storyKick(st);
  if (L.storyRepush) L.storyRepush(st);
  if (L.storyCatchUp) L.storyCatchUp(st);
  if (L.storyRelease && c.rel < 3) c.rel += L.storyRelease(st, 3 - c.rel) || 0;
  stamp(st);
  // 出过链、已经不在队列里的打点：清掉
  const s = S(st); for (const id in s.qm) if (!st.storyQ.includes(id)) delete s.qm[id];
}
const storyBlock = (st, id, o) => ({ kind: 'story', id, data: L.eventById(id), lv: o.lv, ch: o.ch, loc: o.loc });
// 解锁卡：已开、还没出过卡的系统项（第一世；入口的第一张历练卡、突破卡由新手引导自己讲）
const NO_CARD = { exp: 1, bt: 1 };
// 开局就开着的不出卡。“开局”不看月份（洞府在第一趟历练回来、还是第 0 月时就开）：和界面 src/ui/onboard.js 的 begun() 同一口径——
// 开局自带的（start）不算；第 0 月开的，只要已经做过第一件事（出过一趟历练）就算后来开的
const begun = st => st.tick > 0 || ((st.stats && st.stats.exp) || 0) > 0;
function unlockDue(st) {
  if (!st.onb || !st.onb.at || (st.rebirth || 0) > 0 || L.ONB_ON === false) return [];
  const s = S(st), a = [];
  for (const e of L.ONB || []) {
    const t = st.onb.at[e.k];
    if (t === undefined || e.start || (!(t > 0) && !begun(st)) || s.ucard[e.k] !== undefined || !e.sys || NO_CARD[e.k]) continue;
    let force = false; try { force = !!(e.force && e.force(st)); } catch (err) { force = false; }
    a.push({ k: e.k, force });
  }
  return a;
}
const BIG_KS = { pact: 1, tour: 1, meet: 1, war: 1, rookie: 1, death: 1, foe: 1 };
L.nextBlock = function (st) {
  if (!st || !st.p) return null;
  const c = C(st), s = S(st);
  housekeep(st, false);
  const q = blk(st), a = L.apState(st);
  // 1 结算卡 / 季末卡
  const r1 = q.find(x => x.kind === 'result' || x.kind === 'season' || x.kind === 'year');
  if (r1) return r1;
  const ex = a.pend.find(x => x && x.k === 'exp');
  if (ex) return { kind: 'result', id: 'exp', data: ex.res, lv: 1, old: true, pend: ex };
  // 2～5 按章：剧情、推迟的那一仗、章末卡
  const now = L.chapterNow(st), items = [];
  st.storyQ.forEach((id, i) => {
    const ev = L.eventById(id); if (!ev) { items.push({ ch: -1, loc: 0, i, id, bad: 1 }); return; }
    if (isIdle(st, ev)) return;
    const m = s.qm[id], ch = evChapter(st, ev, m), loc = evLoc(ev);
    items.push({ ch, loc, i, id });
  });
  for (let i = s.chCard + 1; i < 9 && i <= now; i++) if (st.quest.done['c' + i + '_m']) items.push({ ch: i, loc: 6, i: 0, card: i });
  if (s.defer) items.push({ ch: typeof s.defer.ch === 'number' ? s.defer.ch : now, loc: 3.5, i: 0, act: 1 });
  if (items.length) {
    items.sort((x, y) => x.ch - y.ch || x.loc - y.loc || x.i - y.i);
    const it = items[0];
    if (it.bad) return { kind: 'story', id: it.id, data: null, lv: 2 };
    if (it.card !== undefined) { const k = 'chapter:' + it.card; if (!s.lag[k]) s.lag[k] = { due: seqNow(st) }; return { kind: 'chapter', id: k, ch: it.card, data: L.chapterSummary(st, it.card), lv: 4 }; }
    if (it.act) return { kind: 'act', id: s.defer.id, data: s.defer, lv: 3, ch: it.ch };
    return storyBlock(st, it.id, { lv: LV(it.loc), ch: it.ch, loc: it.loc });
  }
  // 6 已经发生的解锁卡
  const ud = unlockDue(st), uf = ud.find(x => x.force);
  if (uf) return { kind: 'unlock', id: uf.k, data: { k: uf.k, force: true }, lv: 6 };
  // 7 固定日子的大事
  const b = q.find(x => x.kind === 'big');
  if (b) return b;
  const pb = a.pend.find(x => x && x.k !== 'exp');
  if (pb) return { kind: 'big', id: pb.k, data: pb, lv: 7, pend: pb };
  if (s.bigQ.length) { const k = s.bigQ[0]; return { kind: 'big', id: k.k, data: { k: k.k, data: k.data === undefined ? true : k.data }, lv: 7, saved: k }; }
  // 8 季初（季末那条链的最后）：一场闲戏、一张排队的解锁卡
  if (c.why === 'season') {
    if (!c.idle) {
      const id = st.storyQ.find(x => { const ev = L.eventById(x); return isIdle(st, ev) && !/^sb:mid$/.test(ev.trigger); }) || st.storyQ.find(x => isIdle(st, L.eventById(x)));
      if (id) { const ev = L.eventById(id); return storyBlock(st, id, { lv: 8, ch: evChapter(st, ev, s.qm[id]), loc: 2.5 }); }
    }
    if (!c.unl) { const u = ud[0]; if (u) return { kind: 'unlock', id: u.k, data: { k: u.k, force: false }, lv: 8 }; }
  }
  return null;
};
// 出过一场戏（或结算卡、大事）：记 shown
function markShown(st, x) {
  if (!x || x.kind !== 'story') return;
  const s = S(st), l = s.lag[x.id] || (s.lag[x.id] = { due: seqNow(st) });
  if (l.shown === undefined) { l.shown = L.apState(st).seq; l.via = 'chain'; l.t = st.tick; }
}
// 执行一张“要打的”块（大事、推迟到 pre 之后的那一仗）→ 结果；界面演出时先调它拿结果（不调的话 L.blockDone 代为执行）
L.blockRun = function (st, x) {
  if (!st || !x) return null;
  if (x.ran) return x.res;
  x.ran = true;
  let res = null;
  if (x.kind === 'act') {
    const s = S(st), d = s.defer; delete s.defer;
    if (d) {
      res = d.id === 'final' ? L.finalFight(st) : L.challenge(st, d.args);
      if (res) L.blockPush(st, { kind: 'result', id: d.id, data: res, lv: 1 });
      else { const a = L.apState(st); a.left = Math.min(L.AP.per, a.left + (d.ap || 0)); }   // 推迟的这一仗打不成了（pre 里负了伤……）：点数退回
    }
  } else if (x.kind === 'big') {
    const k = x.id, d = x.data && x.data.data;
    if (k === 'pact') res = st.pact ? null : L.pactDuel(st);
    else if (k === 'tour') res = L.tournament(st);
    else if (k === 'meet') res = st.sect ? L.sectMeet(st) : null;
    else if (k === 'war') res = st.flags.warWon ? null : L.sectWar(st);
    else if (k === 'rookie') res = L.rookie && L.rookie(st) ? L.rookieResolve(st, 'teach') : null;
    else if (k === 'foe') { if (typeof d === 'string') L.mainFoeLater(st, d); res = { later: true, id: d }; }
  }
  x.res = res;
  return res;
};
const blockDone0 = L.blockDone;
L.blockDone = function (st, x) {
  if (!st || !x) return;
  const s = S(st), c = C(st);
  if ((x.kind === 'big' || x.kind === 'act') && !x.ran) L.blockRun(st, x);
  c.n++;
  if (x.kind === 'story') {
    markShown(st, x);
    const i = st.storyQ.indexOf(x.id); if (i >= 0) st.storyQ.splice(i, 1);
    delete s.qm[x.id];
    if (x.lv === 8) c.idle++;
    return;
  }
  if (x.kind === 'chapter') { s.chCard = Math.max(s.chCard, x.ch); const l = s.lag[x.id]; if (l && l.shown === undefined) l.shown = L.apState(st).seq; return; }
  if (x.kind === 'unlock') { s.ucard[x.id] = st.tick; if (!x.data || !x.data.force) c.unl++; return; }
  if (x.kind === 'act') return;
  if (x.kind === 'big') {
    if (x.saved) { const j = s.bigQ.indexOf(x.saved); if (j >= 0) s.bigQ.splice(j, 1); }
    else { const j = s.bigQ.findIndex(y => y.k === x.id); if (j >= 0) s.bigQ.splice(j, 1); }
  }
  return blockDone0.apply(this, arguments);
};
L.chainOpenNow = st => C(st);

// ---------- 季末：链从季末卡开始；大事另记一份进存档（读档后接着出）；宿敌上门也是一张大事 ----------
// 推迟到 pre 之后的那一仗，没有人走结算链（sim、旧界面直接从 storyQ 里取戏）：下一个行动或季末之前当场打掉，不让它一直挂着
function flushDefer(st) {
  if (!st || !st.story || !st.story.defer) return null;
  const x = { kind: 'act', id: st.story.defer.id, data: st.story.defer, lv: 3 };
  return L.blockRun(st, x);
}
L.chainFlush = flushDefer;
{ const se0 = L.seasonEnd; L.seasonEnd = function (st) {
  flushDefer(st);
  inSeason++;
  let S0;
  try { S0 = se0.apply(this, arguments); } finally { inSeason--; }
  const s = S(st);
  if (S0 && S0.out && S0.out.mainFoe) { S0.big.push({ k: 'foe', data: S0.out.mainFoe }); L.blockPush(st, { kind: 'big', id: 'foe', data: { k: 'foe', data: S0.out.mainFoe }, lv: 7 }); }
  if (S0) for (const b of S0.big) if (BIG_KS[b.k]) s.bigQ.push({ k: b.k, data: typeof b.data === 'object' || typeof b.data === 'string' ? b.data : true });
  if (s.bigQ.length > 12) s.bigQ.splice(0, s.bigQ.length - 12);
  L.chainOpen(st, 'season');
  stamp(st);
  return S0;
}; }
{ const act0 = L.act; L.act = function (st, id) {
  if (st && st.p) { flushDefer(st); const c = C(st); if (c.why !== 'act') L.chainOpen(st, 'act'); }
  inAct++;
  try { return act0.apply(this, arguments); } finally { inAct--; stamp(st); }
}; }
// 没走结算链就结算掉的剧情（sim、旧界面直接从 storyQ 里取）：也记一笔 shown（via 'resolve'）
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev) {
  const r = rc0.apply(this, arguments);
  if (r && st && st.p && ev && ev.where === 'story' && st.story) { const s = S(st), l = s.lag[ev.id]; if (l && l.shown === undefined) { l.shown = L.apState(st).seq; l.via = 'resolve'; l.t = st.tick; } }
  return r;
}; }

// ---------- 主线行动：下战帖、拜山门、最后一仗、晋升（AP_PLAN §2.2 的价目：下战帖 1、拜山门 1、最后一仗 1、晋升 0） ----------
const duelArgs = x => {
  if (Array.isArray(x)) x = x[0];
  if (typeof x === 'string') return { id: x };
  if (typeof x === 'number') return { q: x };
  return x && typeof x === 'object' ? (x.id !== undefined || x.q !== undefined ? { id: x.id, q: x.q } : {}) : {};
};
L.duelArgs = duelArgs;
// 这一仗是不是这一章的最后一仗（打完就到高潮）：点名的人（赵乾、楚天阔、血无涯）、正好够上名次门槛的那一场、圣子之战
const lastFight = (st, id, a) => {
  if (id === 'final') return L.finalKind(st) === 'heir';
  const I = L.duelInfo(st, a); if (!I || I.why) return false;
  if (I.main && I.id !== 'mu') return true;
  if (I.rankDuel) { const need = L.mainRankNeed(st); return !!need && I.q <= need; }
  return false;
};
const deferWhy = st => (S(st).defer ? '上一仗还没打完' : '');
function runFight(st, id, a) {
  if (lastFight(st, id, a) && L.storyPreFire) {
    const ids = L.storyPreFire(st);
    if (ids.length) { S(st).defer = { id, args: a, ch: L.chapterNow(st), ap: L.apCost(st, id, a), seq: seqNow(st) }; stamp(st); return { deferred: true, pre: ids, id, args: a }; }
  }
  const r = id === 'final' ? L.finalFight(st) : L.challenge(st, a);
  if (r) L.blockPush(st, { kind: 'result', id, data: r, lv: 1 });
  return r;
}
L.regAct('duel', { ap: () => L.AP.duel, label: '下战帖', card: false,
  why: (st, x) => deferWhy(st) || L.challengeWhy(st, duelArgs(x)),
  run: (st, x) => runFight(st, 'duel', duelArgs(x)) });
L.regAct('final', { ap: () => L.AP.final, label: '主线一战', card: false,
  why: st => deferWhy(st) || L.finalWhy(st),
  run: st => runFight(st, 'final', {}) });
L.regAct('join', { ap: () => L.AP.join, label: '拜山门',
  why: (st, x) => L.knockWhy(st, L.actArg(x, 0, 'id')),
  run: (st, x) => L.knock(st, L.actArg(x, 0, 'id')) });
L.regAct('promote', { ap: 0, label: '晋升',
  why: st => { if (!st.sect) return '没有宗门'; if (L.finalKind(st) === 'heir') return '要当众击败原圣子：【圣子之战】'; const nd = L.promoteNeeds(st).find(y => !y.ok); return nd ? nd.t : L.canPromote(st) ? '' : '已到顶'; },
  run: st => L.promote(st) });

// ---------- 新档、旧档 ----------
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); const s = L.storyState(st); s.chCard = -1; s.ucard = {}; const at = (st.onb && st.onb.at) || {}; for (const k in at) s.ucard[k] = at[k]; S(st); return st; }; }
{ const mg0 = L.migrate; L.migrate = function (s0) { const r = mg0.apply(this, arguments); if (r && r.p && r.quest) S(r); return r; }; }
});
