/* 废柴仙途 · 逻辑模块 time：时间流逝（docs/KAIRO_PLAN.md §3）——一个“月”、三态时钟、大节点预告与备战、出发拦截、纸鹤消息匣、打断节流
 * 模块写法见 src/logic.js 顶部说明。排在 path 之后（包 L.tick、L.startExp、L.startRetreat、L.startBusy、L.startTrain、L.flow）。
 *
 *   单位：界面上的“月”都叫“月”（L.UNIT）；3 月一季、12 月一年；日历年 = floor(tick / 12) + 1。逻辑层的 tick 不改名、不改数值。
 *   三态：L.clockMode(st) → 'idle'（打坐）| 'trip'（历练）| 'away'（闭关、特训、讲道……）；“停”由界面判（面板、聚光、秘境、自动停）。
 *         ×1 一月多少秒：L.monthSec(st)（onboard.js 的 L.TIME）。
 *   大节点：L.bigList(st) → 三年之约、天骄论道（每 12 月）、九宗会武（每 24 月）、天剑宗来犯（排上日子以后）。
 *         L.tick 产出 out.warns / out.warn（还有 12 / 6 / 3 月；同一个月两个节点都报；论道每年一届，12 月那次与上一届同月，不报）、out.prep（还有 1 月：备战卡，自动停）。
 *   出发拦截：L.expBlock(st, k) / L.retBlock(st, n)：行程比离大节点的月数还长 → 拒绝（“来不及了：还有 N 月”）；正好等长的历练放行，
 *         节点前 1 月提前归来，收获按走过的月数折算（out.exp.cut）。闭关类等长也拒绝（闭关没法折一半）。
 *   访客：在外（历练 / 闭关）时访客的等待不减（tick.js），从你回到洞府起算 L.VISIT.stay 月。
 *   纸鹤：st.inbox，L.mailPush / L.mailbox / L.mailTake / L.mailAway；界面 notify() 在外一律投进来，打坐时两次主动打断至少隔 L.TIME.interruptGapMonths 月。
 *         L.notifyGate(st, kind) 是 notify 的规则本身（界面和 tools/onboard.js 的手表机器人共用）。
 *   空转：在洞府连续打坐满 3 月、没负伤、能去历练 → out.idle（界面闪历练格 + 传讯“闲了 3 月”）。
 *   存档 st.clk = { last: 上次主动打断的月, idle: 连续打坐月数, awayAt: 这一趟出发的月, prepSeen: 看过备战卡的月, lifeRed: 寿元第一次变红的月 }；st.inbox；L.migrateTime 幂等
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { emit } = L.U;
L.UNIT = '月';
L.clockMode = st => (!st ? 'idle' : st.exp ? 'trip' : st.retreat ? 'away' : 'idle');
L.calYear = st => Math.floor(st.tick / 12) + 1;
L.calMonth = st => (st.tick % 12) + 1;

// ---------- 寿元：还够几个月 ----------
L.lifeMonths = function (st) {
  if (!st || st.p.r > L.MAXR) return { m: Infinity, text: '寿元无尽', red: false };
  const per = L.REALMS[st.p.r].mpt * Math.max(0.05, L.ageRate(st));
  const m = Math.max(0, Math.floor(L.lifeLeft(st) / per));
  return { m, text: m >= 120 ? '寿元足' : `寿元 ${m} 月`, red: m <= 60 };
};

// ---------- 大节点 ----------
const WARN_AT = [12, 6, 3];
L.BIG_WARN = WARN_AT;
const warOn = st => !st.flags.warWon && L.warChapter(st) && ((!!st.sect && st.sect.rank >= 2) || (!!L.loneRoute && L.loneRoute(st)));   // 按章来（tick.js 的 L.warChapter）；散修之路：来犯的是你的洞府（story.js）
L.bigList = function (st) {
  if (!st || !st.p || st.p.r > L.MAXR) return [];
  const a = [];
  if (!st.pact) { const pi = L.pactInfo(st); a.push({ k: 'pact', n: '三年之约', left: pi.left, foe: { n: st.exName, pw: pi.Q }, p: pi.p, S: pi.S, Q: pi.Q }); }
  else a.push({ k: 'tour', n: '天骄论道', left: L.nextTour(st) });
  if (st.sect && st.sect.order) { const m = L.nextMeet(st); if (m > 0) a.push({ k: 'meet', n: '九宗会武', left: m }); }
  if (warOn(st) && st.flags.war > st.tick && st.flags.war - st.tick < 999) a.push({ k: 'war', n: '天剑来犯', left: st.flags.war - st.tick });
  return a.sort((x, y) => x.left - y.left);
};
L.bigNext = st => L.bigList(st)[0] || null;
// 时间条（主画面顶部第二行）：第一章是 36 格（到三年之约），之后每年一条 12 格；过去的月 past、这个月 now、大节点所在的月 big
L.timeBar = function (st) {
  const t = st.tick, list = L.bigList(st), big = list[0] || null;
  const pre = !st.pact, n = pre ? L.PACT_TICK : 12, y0 = pre ? 0 : Math.floor(t / 12) * 12;
  const cells = [];
  for (let i = 0; i < n; i++) cells.push({ s: y0 + i < t ? 'past' : y0 + i === t ? 'now' : 'future' });
  for (const b of list) { const at = t + b.left - 1 - y0; if (at >= 0 && at < n) { cells[at].s = 'big'; cells[at].k = b.k; } }
  return { y: L.calYear(st), m: L.calMonth(st), season: L.season ? L.season(st) : 0, n, cur: t - y0, cells, big: big ? { k: big.k, n: big.n, left: big.left } : null, label: big ? `${big.n} 还有 ${big.left} ${L.UNIT}` : '' };
};
// 备战卡的数据：对手、战力、胜算（三年之约直接算；论道取本届第一场会碰上的宿敌；会武取前一名宗门；来犯取天剑宗长老团）
L.bigInfo = function (st, b) {
  b = b || L.bigNext(st); if (!b) return null;
  const o = Object.assign({}, b);
  try {
    if (b.k === 'pact') { const pi = L.pactInfo(st); Object.assign(o, { S: pi.S, Q: pi.Q, p: pi.p, foe: { n: st.exName, pw: pi.Q } }); }
    else if (b.k === 'tour') { const f = L.tourFoe && L.tourFoe(st); if (f) { const S = L.duelPower(st, f.foe); Object.assign(o, { S, Q: f.Q, p: L.duelP(st, S, f.Q, f.foe), foe: { n: L.rivalName ? L.rivalName(st, f.id) : f.id, pw: f.Q, id: f.id } }); } else o.S = L.power(st); }
    else if (b.k === 'war') { const foe = { kind: 'war', id: 'tianjian' }, S = L.duelPower(st, foe) * L.wardMult(st), Q = L.warPower(); Object.assign(o, { S, Q, p: L.duelP(st, S, Q, foe), foe: { n: '天剑宗长老团', pw: Q } }); }
    else o.S = L.power(st);
  } catch (e) { /* 缺模块时只给名字与月数 */ }
  return o;
};
// 行程会不会撞上大节点：n 是这一趟要走几个月；strict（闭关类）等长也算撞上
L.tripBlock = function (st, n, strict) {
  if (!st || (st.rebirth || 0) < 0) return null;
  for (const b of L.bigList(st)) if (n > b.left || (strict && n >= b.left)) return { why: `来不及了：还有 ${b.left} 月`, left: b.left, big: b };
  return null;
};
L.expBlock = (st, k) => L.tripBlock(st, L.expLen(k, st), false);
L.retBlock = (st, n) => L.tripBlock(st, n || L.RET.len, true);
// 这一趟会不会在节点前被叫回来（出发页写“约战前会赶回来”）
L.expCut = function (st, k) { const n = L.expLen(k, st); const b = L.bigList(st).find(x => x.left === n); return b ? { left: b.left, big: b, months: n - 1 } : null; };
L.KAIRO_ON = L.KAIRO_ON === undefined ? true : L.KAIRO_ON;   // sim 对照：nokairo 关掉出发拦截与节点前提前归来
const KON = () => L.KAIRO_ON !== false;
{ const f0 = L.startExp; L.startExp = function (st, k, d, a, opt) {
  if (KON() && st && !L.busy(st) && L.expBlock(st, k)) return false;
  const ok = f0.apply(this, arguments);
  if (ok) { const c = clk(st); c.awayAt = st.tick; c.idle = 0; }
  return ok;
}; }
{ const f0 = L.startRetreat; L.startRetreat = function (st, opt) {
  if (KON() && st && !L.busy(st) && L.retBlock(st, L.RET.len)) return false;
  const ok = f0.apply(this, arguments);
  if (ok) { const c = clk(st); c.awayAt = st.tick; c.idle = 0; }
  return ok;
}; }
if (L.startBusy) { const f0 = L.startBusy; L.startBusy = function (st, n) {
  if (KON() && st && !L.busy(st) && arguments[2] !== 'event' && L.retBlock(st, n)) return false;   // 讲道、传授等差事也不能拖过大节点（过了节点再接着办；事件占住的几个月照旧）
  const ok = f0.apply(this, arguments);
  if (ok) { const c = clk(st); c.awayAt = st.tick; c.idle = 0; }
  return ok;
}; }
// 推荐格：原来那一格回不来时，改荐赶得回来的最好一格（同样“预计至少乙、不负伤”）；都不行就照旧给原来那格（出发键会写“来不及了”）
{ const f0 = L.expBest; L.expBest = function (st, a) {
  const b = f0.apply(this, arguments);
  if (!KON() || !b || !L.expBlock(st, b.k)) return b;
  let best = null; const aa = a === undefined ? 0 : a;
  for (let k = 0; k < L.REGIONS.length; k++) {
    if (L.expBlock(st, k)) continue;
    for (let d = 0; d < 3; d++) {
      if (!L.expOpen(st, k, d, aa)) continue;
      const f = L.expForecast(st, k, d, aa);
      if (f.first || (f.risk <= 0 && f.pOk >= 0.8)) { if (!best || L.rew(k, d) > L.rew(best.k, best.d)) best = { k, d, a: aa, f, fit: true }; }
    }
  }
  return best || b;
}; }
// 闭关按钮上写为什么不能闭关（L.canRetreat 读它）
{ const f0 = L.retWhy; L.retWhy = function (st) { const w = f0(st); if (w || !KON()) return w; const b = L.retBlock(st, L.RET.len); return b ? b.why : ''; }; }
// 老祖特训：约战前 8 月内才有，特训 4 月；撞上就不给
{ const f0 = L.canTrain; L.canTrain = st => f0(st) && !(KON() && L.retBlock(st, L.RET.len)); }

// ---------- 打断节流与纸鹤 ----------
const clk = st => st.clk || (st.clk = { last: -99, idle: 0, awayAt: 0, prepSeen: -1, lifeRed: -1 });
L.clk = clk;
L.awayNow = st => !!(st && (st.exp || st.retreat || st.run));
// kind：'active'（解锁卡、事件、老祖一句、气泡……要占屏或要你决定的）| 'tick'（传讯行、飘字、横幅这类不停表的）| 'block'（结算、对决、年报、章末……清单里的，永远放行）
// 返回 'now'（现在就出）| 'mail'（进纸鹤）
L.notifyGate = function (st, kind) {
  if (kind === 'block') return 'now';
  if (L.awayNow(st)) return 'mail';
  if (kind === 'tick') return 'now';
  return st.tick - clk(st).last >= L.TIME.interruptGapMonths ? 'now' : 'mail';
};
L.canInterrupt = st => L.notifyGate(st, 'active') === 'now';
L.markInterrupt = st => { clk(st).last = st.tick; };
const MAIL_MAX = 20;
let mailU = 0;
// item：{ k, ic, t（≤ 14 字）, left（剩几个月，null 不过期，默认 12）, go, data }
L.mailPush = function (st, it) {
  if (!st) return null;
  if (!Array.isArray(st.inbox)) st.inbox = [];
  if (it.k === 'visitor' && st.inbox.some(x => x.k === 'visitor' && x.data && it.data && x.data.id === it.data.id)) return null;
  const x = { id: 'm' + st.tick + '_' + (++mailU % 1000) + '_' + st.inbox.length, k: it.k || 'misc', ic: it.ic || it.k || 'mail', t: String(it.t || ''), at: st.tick, left: it.left === undefined ? 12 : it.left, go: it.go || null, data: it.data || null, away: L.awayNow(st) };
  st.inbox.unshift(x);
  if (st.inbox.length > MAIL_MAX) st.inbox.length = MAIL_MAX;
  emit('mail', x);
  return x;
};
const mailLive = (st, x) => (x.k === 'visitor' ? !!(st.visitor && x.data && st.visitor.id === x.data.id) : x.left === null || x.left > 0);
L.mailbox = function (st) {
  if (!st || !Array.isArray(st.inbox)) return [];
  st.inbox = st.inbox.filter(x => mailLive(st, x));
  for (const x of st.inbox) if (x.k === 'visitor' && st.visitor) x.left = st.visitor.left;
  return st.inbox;
};
L.mailCount = st => L.mailbox(st).length;
L.mailTake = function (st, id) { const box = L.mailbox(st), i = box.findIndex(x => x.id === id); if (i < 0) return null; const [x] = box.splice(i, 1); return x; };
L.mailAway = st => L.mailbox(st).filter(x => x.away);
L.mailAwayClear = st => { for (const x of L.mailbox(st)) x.away = false; };
// 归来结算卡最后一行：“你不在时：入秋了 · 有人来访（等你 6 月）”
L.mailAwayText = function (st) {
  const a = L.mailAway(st); if (!a.length) return '';
  const t = a.slice(0, 3).map(x => (x.k === 'visitor' && st.visitor ? `${x.t}（等你 ${st.visitor.left} 月）` : x.t));
  return '你不在时：' + t.join(' · ') + (a.length > 3 ? ` 等 ${a.length} 件` : '');
};

// ---------- 每月：预告、备战、空转、寿元、节点前提前归来、纸鹤过期 ----------
// 节点前 1 月还在外面（正好等长的那一趟）：提前归来，收获按走过的月数折算
{ const re0 = L.resolveExp; L.resolveExp = function (st) {
  const e = st.exp, f = e && e.cutF;
  const r = re0.apply(this, arguments);
  if (r && f > 0 && f < 1) { for (const k of ['stones', 'herbs', 'ore', 'contrib']) if (typeof r[k] === 'number') r[k] = Math.floor(r[k] * f); r.cut = true; }
  return r;
}; }
function cutTrip(st, out) {
  const e = st.exp; if (!e || !KON()) return;
  const b = L.bigNext(st); if (!b || b.left > 1) return;
  // 已经发生的收获按比例扣回来不方便，所以在 resolveExp 里直接按 cutF 折算（见上）；这里提前把这一趟结掉
  e.cutF = (e.total - e.left) / e.total; e.chain = 0;
  const r = L.resolveExp(st);
  st.expSum = null;
  out.exp = r;
}
{ const tick0 = L.tick; L.tick = function (st, cont) {
  const was = { exp: !!st.exp, ret: !!st.retreat };
  const out = tick0.apply(this, arguments);
  const c = clk(st);
  if (st.p.r > L.MAXR) return out;
  if (was.exp && !out.exp && st.exp) cutTrip(st, out);
  // 纸鹤过期
  if (Array.isArray(st.inbox)) for (const x of st.inbox) if (x.k !== 'visitor' && typeof x.left === 'number') x.left--;
  // 预告与备战（最近的那一个节点；两个节点同月时都报）
  for (const b of L.bigList(st)) {
    if (b.left === 1 && !out.prep) out.prep = L.bigInfo(st, b);
    else if (WARN_AT.includes(b.left) && !(b.k === 'tour' && b.left === 12)) (out.warns = out.warns || []).push({ k: b.k, n: b.n, left: b.left, p: b.p });
  }
  if (out.warns) out.warn = out.warns[0];
  // 空转：在洞府连续打坐满 3 月
  if (!L.busy(st) && !out.exp && !out.retreat) {
    c.idle = (c.idle || 0) + 1;
    if (c.idle === 3 && st.p.inj <= 0 && !L.isFull(st) && !L.expBlock(st, (L.expBest ? L.expBest(st).k : 0))) out.idle = 3;
  } else c.idle = 0;
  // 寿元第一次变红（自动停）
  const lm = L.lifeMonths(st);
  if (lm.red && c.lifeRed < 0) { c.lifeRed = st.tick; out.lifeRed = lm; }
  return out;
}; }
// 备战卡看过了（界面点【就这样上】/【再准备一下】时调；目标卡“下一步”不再指向备战）
L.prepSeen = st => { clk(st).prepSeen = st.tick; };

L.migrateTime = function (st) {
  if (!st || !st.p) return st;
  const c = clk(st);
  for (const [k, v] of [['last', -99], ['idle', 0], ['awayAt', 0], ['prepSeen', -1], ['lifeRed', -1]]) if (typeof c[k] !== 'number') c[k] = v;
  if (!Array.isArray(st.inbox)) st.inbox = [];
  st.inbox = st.inbox.filter(x => x && typeof x === 'object' && x.id);
  return st;
};
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); st.clk = { last: -99, idle: 0, awayAt: 0, prepSeen: -1, lifeRed: -1 }; st.inbox = []; return st; }; }
});
