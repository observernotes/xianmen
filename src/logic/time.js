/* 废柴仙途 · 逻辑模块 time：时间流逝（docs/KAIRO_PLAN.md §3，已被 docs/AP_PLAN.md 改写：回合 = 季，见 ap.js）——一个“月”、大节点预告与备战、纸鹤消息匣
 * 模块写法见 src/logic.js 顶部说明。排在 path 之后（包 L.tick、L.startExp、L.startRetreat、L.startBusy、L.startTrain、L.flow）。
 *
 *   单位：界面上的“月”都叫“月”（L.UNIT）；3 月一季、12 月一年；日历年 = floor(tick / 12) + 1。逻辑层的 tick 不改名、不改数值。
 *   三态：L.clockMode(st) → 'idle'（打坐）| 'trip'（历练）| 'away'（闭关、特训、讲道……）；“停”由界面判（面板、聚光、秘境、自动停）。
 *         （×1 一月多少秒的 L.monthSec / L.TIME 时钟旋钮已删：时间不再自己走，AP_PLAN §1）
 *   回合（AP_PLAN）：出发拦截、节点前提前归来、空转提醒、“在外 / 两次打断之间”的节流都已删；时间条一格一季，bigList 每项带 seasons（还有几季）。
 *   大节点：L.bigList(st) → 三年之约、天骄论道（每 12 月）、九宗会武（每 24 月）、天剑宗来犯（排上日子以后）。
 *         L.tick 产出 out.warns / out.warn（还有 12 / 6 / 3 月；同一个月两个节点都报；论道每年一届，12 月那次与上一届同月，不报）、out.prep（还有 1 月：备战卡，自动停）。
 *   访客：没有“在外”了，等待每月照减（tick.js），L.VISIT.stay 月 = 2 季。
 *   纸鹤：st.inbox，L.mailPush / L.mailbox / L.mailTake / L.mailAway；只收非阻塞消息（访客、大势、拍卖、宿敌消息）。
 *         L.notifyGate(st, kind) 是 notify 的规则本身（界面和 tools/onboard.js 的手表机器人共用）。
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
  if (!st.pact) { const pi = L.pactInfo(st); a.push({ k: 'pact', n: L.pactText?.(st)?.title || '三年之约', left: pi.left, foe: { n: st.exName, pw: pi.Q }, p: pi.p, S: pi.S, Q: pi.Q }); }
  else a.push({ k: 'tour', n: '天骄论道', left: L.nextTour(st) });
  if (st.sect && st.sect.order) { const m = L.nextMeet(st); if (m > 0) a.push({ k: 'meet', n: '九宗会武', left: m }); }
  if (warOn(st) && st.flags.war > st.tick && st.flags.war - st.tick < 999) a.push({ k: 'war', n: '天剑来犯', left: st.flags.war - st.tick });
  for (const b of a) b.seasons = Math.max(0, Math.ceil(b.left / 3));   // 还有几季（1 = 本季末）
  return a.sort((x, y) => x.left - y.left);
};
L.bigNext = st => L.bigList(st)[0] || null;
// 时间条（主画面顶部第二行）：一格一季（AP_PLAN §6.1）。第一章 12 格（到三年之约），之后每年一条 4 格；
// 过去的季 past、这一季 now、大节点落在的那一季 big（大节点在第 T 月 → 落在第 floor((T − 1) / 3) 季的季末）
L.timeBar = function (st) {
  const t = st.tick, list = L.bigList(st), big = list[0] || null, cur = Math.floor(t / 3);
  const pre = !st.pact, n = pre ? Math.ceil(L.PACT_TICK / 3) : 4, y0 = pre ? 0 : Math.floor(t / 12) * 4;
  const cells = [];
  for (let i = 0; i < n; i++) cells.push({ s: y0 + i < cur ? 'past' : y0 + i === cur ? 'now' : 'future' });
  for (const b of list) { const at = Math.floor((t + b.left - 1) / 3) - y0; if (at >= 0 && at < n) { cells[at].s = 'big'; cells[at].k = b.k; } }
  const sn = L.seasonNow ? L.seasonNow(st) : (L.season ? L.season(st) : 0), bs = big ? Math.max(0, Math.ceil(big.left / 3)) : 0;
  return { y: L.calYear(st), m: L.calMonth(st), season: sn, n, cur: cur - y0, cells, unit: '季', big: big ? { k: big.k, n: big.n, left: big.left, seasons: bs } : null, label: big ? (bs <= 1 ? `${big.n} 本季末` : `${big.n} 还有 ${bs} 季`) : '' };
};
// 备战卡的数据：对手、战力、胜算（三年之约直接算；论道取本届第一场会碰上的宿敌；会武取前一名宗门；来犯取天剑宗长老团）
L.bigInfo = function (st, b) {
  b = b || L.bigNext(st); if (!b) return null;
  const o = Object.assign({}, b);
  try {
    if (b.k === 'pact') { const pi = L.pactInfo(st); Object.assign(o, { S: pi.S, Q: pi.Q, p: pi.p, foe: { n: st.exName, pw: pi.Q } }); }
    else if (b.k === 'tour') { const f = L.tourFoe && L.tourFoe(st); if (f) { const S = L.duelPower(st, f.foe); Object.assign(o, { S, Q: f.Q, p: L.duelP(st, S, f.Q, f.foe), foe: { n: L.rivalName ? L.rivalName(st, f.id) : f.id, pw: f.Q, id: f.id } }); } else o.S = L.power(st); }
    else if (b.k === 'war') { const { S, Q, p, lead } = L.sectWarInfo(st); Object.assign(o, { S, Q, p, foe: { n: lead ? lead.n : '天剑宗长老团', pw: Q } }); }
    else if (b.k === 'meet' && st.sect) {
      const pos = L.sectPos(st), q = pos === 1 ? 2 : pos - 1, target = L.nineAt(st, q);
      const foe = { kind: 'sect', id: target.id }, S = L.duelPower(st, foe), Q = L.ninePower(st, q);
      Object.assign(o, { S, Q, p: L.duelP(st, S, Q, foe), foe: { n: target.n, pw: Q } });
    }
    else o.S = L.power(st);
  } catch (e) { /* 缺模块时只给名字与月数 */ }
  return o;
};
// 出发拦截（tripBlock / expBlock / retBlock / expCut）、节点前提前归来（cutTrip）已删：历练、闭关当场结算，不占时间（docs/AP_PLAN.md §2.3、§4.7）
L.KAIRO_ON = L.KAIRO_ON === undefined ? true : L.KAIRO_ON;   // 旧的 sim 对照开关（nokairo），已经不起作用

// ---------- 打断节流与纸鹤 ----------
const clk = st => st.clk || (st.clk = { last: -99, idle: 0, awayAt: 0, prepSeen: -1, lifeRed: -1 });
L.clk = clk;
L.awayNow = st => !!(st && (st.exp || st.retreat || st.run));
// kind：'active'（解锁卡、事件、老祖一句、气泡……要占屏或要你决定的）| 'tick'（传讯行、飘字、横幅这类不停表的）| 'block'（结算、对决、年报、章末……清单里的，永远放行）
// 返回 'now'（现在就出）| 'mail'（进纸鹤）
// AP_PLAN §4.7：在外与“两次打断之间隔一季”两支已删，只剩 'now'（季初槽位由结算链 L.nextBlock 管）
L.notifyGate = function () { return 'now'; };
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

// ---------- 每月：预告、备战、寿元、纸鹤过期（空转提醒与节点前提前归来已删） ----------
{ const tick0 = L.tick; L.tick = function (st, cont) {
  const out = tick0.apply(this, arguments);
  const c = clk(st);
  if (st.p.r > L.MAXR) return out;
  // 纸鹤过期
  if (Array.isArray(st.inbox)) for (const x of st.inbox) if (x.k !== 'visitor' && typeof x.left === 'number') x.left--;
  // 预告与备战（最近的那一个节点；两个节点同月时都报）
  for (const b of L.bigList(st)) {
    if (b.left === 3 && !out.prep) out.prep = L.bigInfo(st, b);   // 下一季季末就是它（AP_PLAN §2.6：本季末）
    else if (WARN_AT.includes(b.left) && !(b.k === 'tour' && b.left === 12)) (out.warns = out.warns || []).push({ k: b.k, n: b.n, left: b.left, p: b.p });
  }
  if (out.warns) out.warn = out.warns[0];
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
