/* 废柴仙途 · 逻辑模块 ap：行动点与季度回合（docs/AP_PLAN.md，A1 内核骨架；接口见 AP_PLAN §10）
 * 模块写法见 src/logic.js 顶部说明。排在 time 之后、report 之前（包 L.newState、L.tick、L.startBusy、L.retInfo）。
 *
 *   一回合 = 一季：每季 L.AP.per = 3 点。底层 st.tick 仍按月计；点【下一季】= L.seasonEnd(st)：剩下的点自动打坐 → 连推 3 个 L.tick → 合并成一张季末卡 S。
 *   回合之间 st.tick % 3 === 0（季界）。回合进行中“本季”是 L.seasonNow(st) = L.seasonOf(st.tick + 1)。
 *   花点的事一律 L.act(st, id, args)：检查（L.apWhy）→ 执行（登记表里的 run）→ 扣点（L.apSpend）→ st.ap.seq++ → 返回结果（null = 没做成）。
 *   历练当场打完：L.act(st, 'exp', …) 只出发（扣 2 点）；之后界面一个节点一个节点 L.tripStep，走完 L.tripEnd（结算 + 脚力）。
 *   闭关、特训、讲法、传授、双修当场结算（L.retreatNow 等），不再有“在外 / 闭关中”这一段时间。
 *   结算链：L.chainOpen(st, why) 开一条链；界面循环 L.nextBlock(st) → 出一张 → L.blockDone(st, x)，到 null 为止。
 *         这里是缺省实现（行动结果卡 → 季末卡 / 年报 → storyQ 的第一条 → 迁移时压着的大事）；线 B 在 storyline.js 里包成完整的八级优先级。
 *   存档 st.ap = { left, stride, debt, seq, pend: [], log: {} }；L.migrateAp 幂等（AP_PLAN §7）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R } = L.U;

// ---------- 常量 ----------
L.SEASON_LEN = 3;
L.AP = { per: 3, exp: 2, deeper: 1, sweep: 1, boss: 1, retreat: 2, train: 2, sit: 1, realm: 2, realmPortal: 1, duel: 1, join: 1, errand: 1, final: 1,
  sitTicks: 1, retTicks: 4, expRew: 0.65, lootRew: 1, stride: 0.25, strideCap: 0.75 };
L.AP_ON = L.AP_ON === undefined ? true : L.AP_ON;   // sim 对照（noap）：false = expRew 1、lootRew 1、负伤回到旧的 3 / 4 月
const LOG_KEEP = 8;
// ---------- 数值折算（AP_PLAN §3.4、§2.4；各模块调用时才来取，所以排在它们后面也没关系） ----------
// 历练的灵石、灵草、灵矿、贡献，破境丹 / 天材地宝 / 灵宠的掉率 × expRew（expedition.js 的 expCalc）；归途翻牌 × lootRew（loot.js）
L.apExpRew = () => (L.AP_ON === false ? 1 : L.AP.expRew);
L.apLootRew = () => (L.AP_ON === false ? 1 : L.AP.lootRew);
// §3.5 里定义在别的模块、跟着回合制改的常量：[旧值, 回合制的值]。rivals.js 归线 B，这里加载时覆盖（ap.js 排在它后面）；
// L.AP_ON = false 后调 L.apConst() 换回旧值（sim 的 noap）。
//   PACT_POWER 125 → 250：回合制下只打坐的人每季也有 6 月修为，约战前都已筑基（PACT_ASSIST 只在炼气生效，管不着了），只能靠对手战力把“只打坐”压到 15%～25%
//     （tools/sim.js 20 种子：PACT_POWER 150 时 idle 57%、250 时 17%，guided 97%、goalcard 97%、lazy 58%）；§3.5 的初值 150 过不了 idle 的门槛
//   RIVAL_SLOPE 0.0185 → 0.022（§3.5 初值）
L.AP_CONST = { PACT_POWER: [125, 250], RIVAL_SLOPE: [0.0185, 0.029] };
L.apConst = function () { for (const k in L.AP_CONST) L[k] = L.AP_CONST[k][L.AP_ON === false ? 0 : 1]; };
L.apConst();
// 负伤月数：一回合 3 个月，负伤 = 带伤到下季末（设 4：本季末 −3 剩 1，下季末清零）；首领战败两季（7）
L.INJ = { base: 4, boss: 7, base0: 3, boss0: 4 };
L.injMonths = k => (L.AP_ON === false ? (k === 'boss' ? L.INJ.boss0 : L.INJ.base0) : k === 'boss' ? L.INJ.boss : L.INJ.base);
// 负伤 n 月在回合里怎么说：季末连推 3 个月，所以 ≤ 3 = 本季末痊愈，≤ 6 = 下季末，再多写几季
L.injText = function (n) {
  n = Math.max(0, Math.ceil(n || 0));
  if (!n) return '';
  if (n <= 3) return '负伤（本季末痊愈）';
  if (n <= 6) return '负伤（下季末痊愈）';
  return `负伤（${Math.ceil(n / 3)} 季）`;
};
// 时长（月）写成季：≤ 3 月“本季”，其余“N 季”（界面统一过 seasons()，逻辑层的日志与文案用它）
L.seasonsText = m => { m = Math.max(0, Math.ceil(m || 0)); return m <= 3 ? '本季' : `${Math.ceil(m / 3)} 季`; };
// 事件效果“占住 v 个月”：不再占时间，下一季行动点 −1（v ≥ 4 时 −2），记在 st.ap.debt → 返回这次扣了几点
L.apDebtOf = v => (v >= 4 ? 2 : 1);
L.apDebt = function (st, v) {
  if (!st || !st.p || st.p.r > L.MAXR || !(v > 0)) return 0;
  const a = ap(st), d = Math.min(L.AP.per - a.debt, L.apDebtOf(v));
  a.debt += Math.max(0, d);
  return Math.max(0, d);
};

// ---------- 存档 ----------
const newAp = () => ({ left: L.AP.per, stride: 0, debt: 0, seq: 0, pend: [], log: {} });
const ap = st => {
  let a = st.ap;
  if (!a || typeof a !== 'object') a = st.ap = newAp();
  if (typeof a.left !== 'number' || !isFinite(a.left)) a.left = L.AP.per;
  for (const k of ['stride', 'debt', 'seq']) if (typeof a[k] !== 'number' || !isFinite(a[k])) a[k] = 0;
  if (!Array.isArray(a.pend)) a.pend = [];
  if (!a.log || typeof a.log !== 'object') a.log = {};
  return a;
};
L.apState = ap;
// 不进存档的东西（这一条链里排着的结算卡、链内计数）：挂在不可枚举的属性上，JSON.stringify 不会带走
const hid = (st, k, v) => { if (!Object.prototype.hasOwnProperty.call(st, k)) Object.defineProperty(st, k, { value: v(), enumerable: false, writable: true, configurable: true }); return st[k]; };
const blk = st => hid(st, '_apBlk', () => []);
const chn = st => hid(st, '_apChain', () => ({ why: '', n: 0, story: 0, at: -1 }));

// ---------- 日历 ----------
const SN = ['春', '夏', '秋', '冬'];
L.seasonNo = st => Math.floor(st.tick / L.SEASON_LEN);
L.seasonNow = st => L.seasonOf(st.tick + 1);
L.seasonsLeft = m => Math.max(0, Math.ceil(m / L.SEASON_LEN));
L.yearNo = st => Math.floor(st.tick / 12) + 1;
L.dateText = st => `第 ${L.yearNo(st)} 年 · ${SN[L.seasonNow(st)]}`;
L.seasonName = i => SN[((i % 4) + 4) % 4];

// ---------- 行动登记表 ----------
const ACTS = {};
L.ACTS = ACTS;
// spec = { ap: 数字或 (st, args) => 数字, why: (st, args) => '' | 原因, run: (st, args) => 结果对象 | null/false, label? }
L.regAct = function (id, spec) { ACTS[id] = Object.assign({ ap: 1, why: () => '', run: () => null }, ACTS[id] || {}, spec); return ACTS[id]; };
// args 既可以是数组（按位置：'exp' 的 [k, d, a, opt]），也可以是对象（{ k, d, a, opt }）
const arg = (args, i, name) => (Array.isArray(args) ? args[i] : args && typeof args === 'object' ? args[name] : i === 0 ? args : undefined);
L.actArg = arg;
L.apLeft = st => (st ? ap(st).left : 0);
L.apCost = function (st, id, args) {
  const a = ACTS[id]; if (!a) return 0;
  const c = typeof a.ap === 'function' ? a.ap(st, args) : a.ap;
  return Math.max(0, Math.floor(c || 0));
};
L.apWhy = function (st, id, args) {
  const a = ACTS[id];
  if (!st || !a) return '没有这个行动';
  if (st.p && st.p.r > L.MAXR) return '已证大道';
  const c = L.apCost(st, id, args);
  if (c > L.apLeft(st)) return '点不够（下一季）';
  return (a.why && a.why(st, args)) || '';
};
// 扣点并记账：st.ap.log[季序号] = { spent, acts }
L.apSpend = function (st, n, id) {
  const a = ap(st); n = Math.max(0, Math.floor(n || 0));
  const used = Math.min(n, a.left);
  a.left -= used;
  const s = L.seasonNo(st), lg = a.log[s] || (a.log[s] = { spent: 0, acts: [] });
  lg.spent += used; if (id) lg.acts.push(id);
  return used;
};
let acting = 0;   // L.act 进行中：里面调到的 L.tripEnd 等不再自己扣点
// 这一季做了什么（季末卡“这一季：历练 1 趟 · 乙 ｜ 首领 ✓”）：st.ap.log[季].res
function logNote(st, t) { const a = ap(st), s = L.seasonNo(st), lg = a.log[s] || (a.log[s] = { spent: 0, acts: [] }); (lg.res || (lg.res = [])).push(t); }
L.act = function (st, id, args) {
  const why = L.apWhy(st, id, args);
  if (why) { L.actLastWhy = why; return null; }
  const a = ACTS[id], cost = L.apCost(st, id, args);
  let res;
  acting++;
  try { res = a.run(st, args); } finally { acting--; }
  if (!res) { L.actLastWhy = '没做成'; return null; }
  L.actLastWhy = '';
  L.apSpend(st, cost, id);
  ap(st).seq++;
  if (id === 'boss') logNote(st, res.win ? '首领 ✓' : '首领 ✗');
  else if (id === 'retreat' || id === 'train') logNote(st, res.epi ? '闭关 · 顿悟' : id === 'train' ? '特训' : '闭关');
  else if (id === 'realm') logNote(st, '秘境');
  else if (id === 'duel') logNote(st, res.win ? '下战帖 ✓' : res.win === false ? '下战帖 ✗' : '下战帖');
  else if (id === 'errand') logNote(st, '差事');
  if (a.card !== false && !(st.exp && res === st.exp)) pushBlk(st, { kind: 'result', id, data: res, lv: 1 });
  return res;
};

// ---------- 修炼：打坐、闭关、特训、差事 ----------
if (!L.sitMult) L.sitMult = () => 1;   // arts.js 定义（引气诀让打坐多得）
L.sitGain = (st, n) => (n === undefined ? 1 : n) * L.AP.sitTicks * L.gainCalm(st) * L.sitMult(st);
L.sit = function (st) {
  if (!st || st.p.r > L.MAXR) return 0;
  const g = L.sitGain(st, 1);
  L.addXp(st, g);
  st.stats.sit = (st.stats.sit || 0) + 1;
  return g;
};
// 闭关这次当场能得多少：gainCalm × retTicks × (m − 1)（自然修炼另在季末给，所以只给“多出来的那一截”）
L.retGotNow = (st, m) => L.gainCalm(st) * L.AP.retTicks * Math.max(0, (m === undefined ? L.retMult(st) : m) - 1);
{ const ri0 = L.retInfo; L.retInfo = function (st) { const o = ri0.apply(this, arguments); o.gotNow = L.retGotNow(st); return o; }; }
// 把 st.retreat（闭关、特训、双修、指点师弟、讲法、传授、事件占住）当场结掉；left 是还没坐的月数（旧档迁移时 < total）
function finishRetreat(st, frac) {
  const r = st.retreat; if (!r) return null;
  if (r.kind !== 'busy' && r.kind !== 'teach' && r.m > 1) {
    const g = L.retGotNow(st, r.m) * (frac === undefined ? 1 : frac);
    if (g > 0) { L.addXp(st, g); r.got = (r.got || 0) + g; }
  }
  r.left = 0;
  return L.endRetreat(st, true) || { kind: r.kind, got: r.got || 0, done: true, epi: 0 };
}
L.retFinish = finishRetreat;
// 闭关（opt.sx：与道侣双修，不花灵石；opt.kind 'train'：老祖特训）→ { got, epi, fenshen, contrib, visitor, … }
L.retreatNow = function (st, opt) {
  opt = opt || {};
  let ok;
  if (opt.sx) ok = !!L.shuangxiu(st);
  else if (opt.kind === 'train') ok = L.startTrain(st);
  else ok = L.startRetreat(st, opt);
  if (!ok || !st.retreat) return null;
  return finishRetreat(st);
};
// 差事（讲法 / 指点师弟：宗门任务序号 task；传授：{ u, art }）当场办完
L.errandNow = function (st, args) {
  const u = arg(args, 0, 'u'), art = arg(args, 1, 'art'), task = arg(args, 0, 'task');
  let ok = false;
  if (art !== undefined && L.discTeach) ok = L.discTeach(st, u, art);
  else if (task !== undefined && st.sect && st.sect.tasks) ok = L.taskTake(st, task);
  if (!ok) return null;
  return st.retreat ? finishRetreat(st) : { kind: 'errand', done: true };
};
// 事件效果“占住 v 个月”（sect2.js 的 fx.busy）：不再占时间，改成下一季少 1 点（v ≥ 4 少 2 点），记在 st.ap.debt
// （sect2.js 的 fx.busy 直接调 L.apDebt；这里接住别处还在用 startBusy(…, 'event') 的旧调用）
if (L.startBusy) { const sb0 = L.startBusy; L.startBusy = function (st, n, what) {
  if (what === 'event' && st && st.p && st.p.r <= L.MAXR && n > 0) { L.apDebt(st, n); return true; }
  return sb0.apply(this, arguments);
}; }

// ---------- 历练（当场） ----------
const busyWhy = st => (st.exp ? '历练途中' : st.run ? '秘境里' : st.retreat ? '眼下有事在身' : '');
// 脚力（AP_PLAN §2.3）：原来“历练时长 −1 月”的效果，现在每个来源每趟攒 L.AP.stride（0.25），合计上限 strideCap，攒满 1 返还 1 点。
// 来源：御风诀、风行水上（arts.js 的 L.artExpLen）、轻灵词条（gear.js 的 L.gearExpLen）、传送阵 3 级（buildings.js）、灵宠天赋（pets.js）
// 这几处都包在 L.strideParts 上（expedition.js 定义，返回 [[名字, 来源数]]）；L.strideSrcN 是来源数之和
L.strideSrcN = (st, k) => (st ? L.strideParts(st, k).reduce((v, x) => v + x[1], 0) : 0);
L.strideSrc = (st, k) => L.strideSrcN(st, k);
L.strideGain = (st, k) => Math.min(L.AP.strideCap, L.strideSrc(st, k) * L.AP.stride);
// 一趟（2 点的那种）走完：攒脚力，满 1 返还 1 点。扫荡、趁势深入只花 1 点，不攒（不然扫荡几乎白送）
function strideAdd(st, k, r) {
  const a = ap(st), g = L.strideGain(st, k);
  if (!(g > 0)) return 0;
  a.stride = Math.round((a.stride + g) * 1e6) / 1e6;
  if (r) { r.stride = g; r.strideNow = a.stride; r.strideSrc = L.strideParts(st, k).map(x => x[0]); }
  if (a.stride >= 1) { a.stride = Math.round((a.stride - 1) * 1e6) / 1e6; a.left = Math.min(L.AP.per, a.left + 1); if (r) r.strideNow = a.stride; return 1; }
  return 0;
}
const tripDone = e => !e || (e.nodes ? e.ni >= e.nodes.length || !!(e.bt && (e.bt.dead || e.bt.fled)) : e.left <= 0);
L.tripDone = st => tripDone(st.exp);
// 推一个节点：res 是界面打完这一场的结果（L.expNodeDone 的那个）；不传 res 时按 e.pol 自动打（非战斗节点直接走过）
// → { done: 这一趟是否走完, enc: 途中遭遇（事件对象）或 null, res }
L.tripStep = function (st, res) {
  const e = st.exp; if (!e) return { done: true, enc: null, res: null };
  if (tripDone(e)) return { done: true, enc: null, res: null };
  let r = res;
  if (e.nodes) {
    if (res === undefined) r = L.expNodeRun(st, e.pol);
    else L.expNodeDone(st, res);
    e.left = Math.max(0, e.nodes.length - e.ni);
  } else e.left = Math.max(0, e.left - 1);
  // 途中遭遇：走过一半那个节点之后，60%（白小九同行 ×1.5），前两趟不出，扫荡不出
  let enc = null;
  const half = Math.ceil(e.total / 2), at = e.nodes ? e.ni : e.total - e.left;
  const evMul = L.friend(st, 'bai') ? 1.5 : 1;
  if (!e.quick && !e.encEv && e.plan && at === half && !tripDone(e) && st.stats.exp >= 2 && e.plan.enc < L.ENC_P * evMul) {
    const ev = L.pickEvent(st, 'exp', { bg: L.REGIONS[e.k].bg });
    if (ev) { e.encEv = ev.id; e.chain = 0; enc = ev; }
  }
  return { done: tripDone(e), enc, res: r };
};
// 剩下的节点一口气自动打完（sim、读档、旧档迁移）；途中遭遇交给 onEnc(ev)（不给就照默认不选，事件留在 e.encEv）
L.tripAuto = function (st, onEnc) {
  let enc = null;
  for (let g = 0; g < 24 && st.exp && !tripDone(st.exp); g++) { const x = L.tripStep(st); if (x.enc) { enc = x.enc; if (onEnc) onEnc(x.enc); } }
  return enc;
};
// 结算（原 L.resolveExp）+ 扣点（没经 L.act 出发的）+ 脚力 → 结算对象（多 refund: 0 | 1）
L.tripEnd = function (st) {
  const e = st.exp; if (!e) return null;
  const k = e.k, paid = !!e.apPaid, id = e.quick ? 'sweep' : e.deeper ? 'deeper' : 'exp';
  const r = L.resolveExp(st);
  if (!r) return null;
  if (!paid && !acting) { L.apSpend(st, L.apCost(st, id), id); ap(st).seq++; }
  r.refund = id === 'exp' && !e.old ? strideAdd(st, k, r) : 0;
  logNote(st, (id === 'sweep' ? '扫荡 · ' : id === 'deeper' ? '深入 · ' : '历练 · ') + (L.RATINGS[r.rating] || '—'));
  if (!acting) pushBlk(st, { kind: 'result', id, data: r, lv: 1 });
  return r;
};
// 扫荡：已拿过甲、战力 ≥ 推荐 × 1.8 的格子，不播战斗、不出途中遭遇，直接出结算
L.sweepWhy = function (st, k, d, a) {
  const b = busyWhy(st); if (b) return b;
  if (L.sweepOpen && !L.sweepOpen(st)) return '还没学会扫荡';
  if (!L.expOpen(st, k, d || 0, a || 0)) return '这一格还没开放';
  if (L.quickOk && !L.quickOk(st, k, d || 0, a || 0)) return '要这一格拿过甲、战力到推荐 ×1.8';
  return '';
};
L.sweep = function (st, k, d, a) {
  if (L.sweepWhy(st, k, d, a)) return null;
  if (!L.startExp(st, k, d || 0, a || 0, { quick: true, quiet: true })) return null;
  st.exp.quick = 1;
  L.tripAuto(st);
  const r = L.tripEnd(st);
  if (r) r.sweep = true;
  return r;
};
// 扫荡哪一格：能扫的格子里灵石最多的（斩妖；变强建议、sim 用）→ { k, d, a, f } | null
L.sweepBest = function (st, a) {
  if (!st || (L.sweepOpen && !L.sweepOpen(st))) return null;
  a = a || 0; let best = null;
  for (let k = 0; k < L.REGIONS.length; k++) for (let d = 0; d < 3; d++) {
    if (!L.expOpen(st, k, d, a) || (L.quickOk && !L.quickOk(st, k, d, a))) continue;
    if (!best || L.rew(k, d) > L.rew(best.k, best.d)) best = { k, d, a };
  }
  if (best) best.f = L.expForecast(st, best.k, best.d, best.a);
  return best;
};
L.expWhy = function (st, k, d, a) {
  const b = busyWhy(st); if (b) return b;
  if (!L.expOpen(st, k, d || 0, a || 0)) return '这一格还没开放';
  return '';
};

// ---------- 登记 AP_PLAN §10 的行动 ----------
L.regAct('exp', { ap: () => L.AP.exp, label: '历练',
  why: (st, x) => L.expWhy(st, arg(x, 0, 'k'), arg(x, 1, 'd'), arg(x, 2, 'a')),
  run: (st, x) => { if (!L.startExp(st, arg(x, 0, 'k'), arg(x, 1, 'd') || 0, arg(x, 2, 'a') || 0, arg(x, 3, 'opt'))) return null; st.exp.apPaid = 1; return st.exp; } });
L.regAct('deeper', { ap: () => L.AP.deeper, label: '趁势深入',
  why: (st, x) => { const b = busyWhy(st); if (b) return b; const res = arg(x, 0, 'res'); return res && L.deeperOk && L.deeperOk(st, L.tripOf(res)) ? '' : '这一趟不能再深入'; },
  run: (st, x) => { if (!L.startDeeper(st, arg(x, 0, 'res'))) return null; st.exp.apPaid = 1; return st.exp; } });
L.regAct('sweep', { ap: () => L.AP.sweep, label: '扫荡',
  why: (st, x) => L.sweepWhy(st, arg(x, 0, 'k'), arg(x, 1, 'd'), arg(x, 2, 'a')),
  run: (st, x) => L.sweep(st, arg(x, 0, 'k'), arg(x, 1, 'd'), arg(x, 2, 'a')) });
L.regAct('boss', { ap: () => L.AP.boss, label: '讨伐首领',
  why: (st, x) => { const b = busyWhy(st); if (b) return b; return L.bossReady(st, arg(x, 0, 'k')) ? '' : '首领还没现身'; },
  // 界面打出来的回合战结果（args.res）原样透传给 L.fightBoss；没有就由逻辑层自己打
  run: (st, x) => L.fightBoss(st, arg(x, 0, 'k'), x && typeof x === 'object' && !Array.isArray(x) && x.res ? { res: x.res } : undefined) });
L.regAct('retreat', { ap: () => L.AP.retreat, label: '闭关',
  why: (st, x) => (x && arg(x, 0, 'sx') ? (L.sxWhy ? L.sxWhy(st) : '还没开放') : L.retWhy(st)),
  run: (st, x) => L.retreatNow(st, x && arg(x, 0, 'sx') ? { sx: true } : undefined) });
L.regAct('train', { ap: () => L.AP.train, label: '老祖特训',
  why: st => (L.canTrain(st) ? '' : '眼下不能特训'),
  run: st => L.retreatNow(st, { kind: 'train' }) });
L.regAct('sit', { ap: () => L.AP.sit, label: '打坐',
  why: st => busyWhy(st),
  run: st => { const g = L.sit(st); return { got: g }; } });
L.regAct('realm', { ap: st => (L.mjAp ? L.mjAp(st) : L.AP.realm), label: '秘境', card: false,
  why: (st, x) => (L.mjWhy ? L.mjWhy(st, arg(x, 0, 'xf')) : '秘境还没开放'),
  run: (st, x) => (L.mjEnter && L.mjEnter(st, { xf: arg(x, 0, 'xf') }) ? st.run : null) });
L.regAct('errand', { ap: () => L.AP.errand, label: '宗门差事',
  why: st => busyWhy(st),
  run: (st, x) => L.errandNow(st, x) });
// 下战帖、拜山门、主线最后一仗：线 B（mainline.js）用 L.regAct 换成完整实现；这里是缺省（有 L.challenge / L.knock / L.finalFight 就转调）
L.regAct('duel', { ap: () => L.AP.duel, label: '下战帖',
  why: (st, x) => (L.challengeWhy ? L.challengeWhy(st, arg(x, 0, 'id')) : L.challenge ? '' : '下战帖还没开放'),
  run: (st, x) => (L.challenge ? L.challenge(st, arg(x, 0, 'id')) : null) });
L.regAct('join', { ap: () => L.AP.join, label: '拜山门',
  why: (st, x) => {
    if (L.knockWhy) return L.knockWhy(st, arg(x, 0, 'id'));
    const id = arg(x, 0, 'id');
    if (st.sect) return '已有宗门';
    if (!st.pact) return '三年之约还没了结';
    if (!L.SECTS || !L.SECTS.some(s => s.id === id)) return '没有这个宗门';
    if (L.sectJoinable && !L.sectJoinable(st, id)) return '血煞魔宗不收你';
    return '';
  },
  run: (st, x) => { const id = arg(x, 0, 'id'); if (L.knock) return L.knock(st, id); L.joinSect(st, id); return st.sect ? { id, sect: st.sect } : null; } });
L.regAct('final', { ap: () => L.AP.final, label: '主线一战',
  why: st => (L.finalWhy ? L.finalWhy(st) : L.finalFight ? '' : '还没到最后一仗'),
  run: (st, x) => (L.finalFight ? L.finalFight(st, x) : null) });

// ---------- 回合：季末结算 ----------
const OBJ_SUM = { harvest: 1, mats: 1 };
function mergeOut(S, out) {
  for (const k in out) {
    const v = out[k];
    if (v === undefined || v === null || v === false) continue;
    const o = S[k];
    if (typeof v === 'number' && (typeof o === 'number' || o === undefined)) S[k] = (o || 0) + v;
    else if (Array.isArray(v)) S[k] = (Array.isArray(o) ? o : []).concat(v);
    else if (OBJ_SUM[k] && v && typeof v === 'object') { const t = S[k] && typeof S[k] === 'object' ? S[k] : (S[k] = {}); for (const j in v) t[j] = (typeof t[j] === 'number' ? t[j] : 0) + (+v[j] || 0); }
    else if (!o) S[k] = v;
  }
}
const BIG = [['pact', 'pact'], ['tourney', 'tour'], ['meet', 'meet'], ['war', 'war'], ['rookie', 'rookie'], ['death', 'death']];
// 季末：（先结掉还挂着的历练 / 闭关）→ 剩余的点自动打坐 → 3 个 L.tick → 合并
L.seasonEnd = function (st) {
  const a = ap(st), p = st.p;
  const S = { season: L.seasonNow(st), seasonNo: L.seasonNo(st), tick: st.tick, sat: 0, xp: { flow: 0, sit: 0, pre: 0 }, stones: 0, crops: null, pay: 0, notes: [], big: [], visitor: null, year: false, next: null, outs: [], out: {}, pre: {} };
  // 0. 历练演出还没打完（读档后接着打的那一趟）、差事还挂着：不过季（界面的【下一季】这时本来就是灰的），返回 null
  if (st.exp || st.retreat) return null;
  // 1. 剩余行动点自动打坐
  if (a.left > 0 && p.r <= L.MAXR) { S.sat = a.left; S.xp.sit = L.sitGain(st, a.left); L.addXp(st, S.xp.sit); st.stats.sit = (st.stats.sit || 0) + a.left; }
  if (a.left > 0) L.apSpend(st, a.left, 'sit*');
  const s0 = L.seasonNo(st), stones0 = st.stones;
  // 2. 连推 3 个月（每次 L.tick 里先 L.flow(st, 1)）；旧界面逐月推过、不在季界时只推到下一个季界
  const nT = L.SEASON_LEN - (((st.tick % L.SEASON_LEN) + L.SEASON_LEN) % L.SEASON_LEN);
  for (let i = 0; i < nT; i++) {
    S.xp.flow += p.r <= L.MAXR ? L.gain(st) : 0;
    const out = L.tick(st);
    S.outs.push(out);
    mergeOut(S.out, out);
    if (out.death) break;
    if (p.r > L.MAXR) break;
  }
  S.stones = Math.floor(st.stones - stones0);
  S.crops = S.out.harvest || null;
  S.pay = S.out.pay || 0;
  S.visitor = S.out.visitor || null;
  // 3. 一次性的大事记进 S.big；迁移时压着的也并进来
  for (const [k, n] of BIG) if (S.out[k]) S.big.push({ k: n, data: S.out[k] });
  if (a.pend.length) { for (const x of a.pend) if (x && x.k !== 'exp') S.big.push(x); a.pend = a.pend.filter(x => x && x.k === 'exp'); }
  if (S.visitor) S.notes.push('有人来访');
  if (S.out.world) S.notes.push('天下大势起');
  if (S.out.auction) S.notes.push('拍卖会开槌');
  if (S.out.rookieNew) S.notes.push('新秀出世');
  // 4. 季数 +1（tick 已推 3），行动点回满（扣掉事件占的点），脚力不清
  a.seq++;
  a.left = Math.max(0, L.AP.per - a.debt); S.debt = a.debt; a.debt = 0;
  const keys = Object.keys(a.log).map(Number).sort((x, y) => x - y);
  while (keys.length > LOG_KEEP) delete a.log[keys.shift()];
  S.year = st.tick % 12 === 0;
  const big = L.bigNext ? L.bigNext(st) : null;
  S.next = { season: L.seasonNow(st), name: SN[L.seasonNow(st)], cal: L.SEASONS ? L.SEASONS[L.seasonNow(st)] : null, bigSoon: big ? { k: big.k, n: big.n, left: big.left, seasons: L.seasonsLeft(big.left) } : null };
  S.spent = (a.log[s0] || { spent: 0 }).spent;
  pushBlk(st, { kind: S.year ? 'year' : 'season', id: 'season:' + s0, data: S, lv: 1 });
  for (const b of S.big) pushBlk(st, { kind: 'big', id: b.k, data: b, lv: 7 });
  return S;
};
// 季末卡的显示数据（AP_PLAN §2.5；冬季的季末卡由界面换成年报 L.yearReport，这份数据照给）
// → { title, lines: [字符串…], acts: '这一季：…' | '', xp: { all, flow, sit }, stones, crops: [[名字, 数]…], next: '下一季：…' | '', btn, year, big }
// 行顺序：修为一行 → 灵石 / 收成 / 俸禄一行 → 这一季做了什么 → 非阻塞的消息（访客、大势、拍卖、新秀）→ 下一季（换季加成或大事预告）
const CROP_N = { herbs: '灵草', fire: '火引', ice: '冰引', thunder: '雷引', wood: '木引', soul: '魂引' };
const NEXT_CAL = ['采药灵草 +50%', '秘境开放', '灵稻灵石 +50%', '闭关倍率 +0.2'];
L.seasonReport = function (st, S) {
  if (!S) return null;
  const fmt = L.fmt, xpAll = S.xp.flow + S.xp.sit + S.xp.pre;
  const parts = [`自然 +${fmt(S.xp.flow)}`]; if (S.xp.sit) parts.push(`打坐 +${fmt(S.xp.sit)}`); if (S.xp.pre) parts.push(`出关 +${fmt(S.xp.pre)}`);
  const lines = [`修为 +${fmt(xpAll)}（${parts.join(' · ')}）`];
  const crops = []; if (S.crops) for (const k in S.crops) if (S.crops[k] > 0) crops.push([CROP_N[k] || (L.YIN_N && L.YIN_N[k]) || k, S.crops[k]]);
  const row = [];
  if (S.stones) row.push(`灵石 ${S.stones > 0 ? '+' : ''}${fmt(S.stones)}`);
  if (crops.length) row.push('灵田 收' + crops.map(c => c[0] + ' ' + fmt(c[1])).join('、'));
  if (S.pay) row.push(`俸禄 ${fmt(S.pay)}`);
  if (row.length) lines.push(row.join('   '));
  const lg = (st && st.ap && st.ap.log[S.seasonNo]) || null, res = (lg && lg.res) || [];
  // 同类合并：“历练 2 趟 · 甲 乙”
  let acts = '';
  if (res.length || S.sat) {
    const trips = res.filter(t => /^历练 · /.test(t)).map(t => t.slice(5)), other = res.filter(t => !/^历练 · /.test(t));
    const segs = []; if (trips.length) segs.push(`历练 ${trips.length} 趟 · ${trips.join(' ')}`);
    segs.push(...other);
    if (S.sat) segs.push(`打坐 ${S.sat} 点`);
    acts = '这一季：' + segs.join(' ｜ ');
    lines.push(acts);
  }
  if (S.debt) lines.push(`为事奔忙：这一季少了 ${S.debt} 点`);
  if (S.notes.length) lines.push(S.notes.join(' · '));
  let next = '';
  const bs = S.next && S.next.bigSoon, nm = S.next ? S.next.name : '';
  if (bs && bs.seasons <= 4) next = bs.seasons <= 1 ? `下一季：${bs.n} 本季末` : `下一季：${bs.n} 还有 ${bs.seasons} 季`;
  else if (S.next && st && L.calOpen && L.calOpen(st)) next = `下一季：入${nm} · ${NEXT_CAL[S.next.season]}`;
  else if (nm) next = `下一季：入${nm}`;
  if (next) lines.push(next);
  const bigBtn = bs && bs.seasons <= 1 ? { pact: '赴约 ▸', tour: '论道 ▸', war: '迎战 ▸', meet: '会武 ▸' }[bs.k] : '';
  return { title: `第 ${Math.floor(S.tick / 12) + 1} 年 · ${SN[S.season]}  结束`, lines, acts, xp: { all: xpAll, flow: S.xp.flow, sit: S.xp.sit, pre: S.xp.pre }, stones: S.stones, crops, next,
    btn: `入${nm} ▸`, nextBtn: bigBtn || '', year: S.year, big: S.big.map(b => b.k) };
};

// ---------- 结算链（缺省实现；线 B 在 storyline.js 包成完整版） ----------
function pushBlk(st, x) { const q = blk(st); q.push(x); if (q.length > 40) q.splice(0, q.length - 40); }
L.blockPush = pushBlk;
L.chainOpen = function (st, why) {
  const c = chn(st); c.why = why; c.n = 0; c.story = 0; c.at = ap(st).seq;
  return c;
};
L.chainInfo = st => chn(st);
L.nextBlock = function (st) {
  if (!st) return null;
  const q = blk(st);
  if (q.length) return q[0];
  const a = ap(st);
  const ex = a.pend.find(x => x && x.k === 'exp');
  if (ex) return { kind: 'result', id: 'exp', data: ex.res, lv: 1, old: true, pend: ex };
  if (st.storyQ && st.storyQ.length) { const id = st.storyQ[0]; return { kind: 'story', id, data: L.eventById ? L.eventById(id) : null, lv: 2 }; }
  const bg = a.pend.find(x => x && x.k !== 'exp');
  if (bg) return { kind: 'big', id: bg.k, data: bg, lv: 7, pend: bg };
  return null;
};
L.blockDone = function (st, x) {
  if (!st || !x) return;
  const q = blk(st), i = q.indexOf(x);
  if (i >= 0) q.splice(i, 1);
  else if (x.kind === 'story' && st.storyQ && st.storyQ[0] === x.id) st.storyQ.shift();
  if (x.pend) { const a = ap(st), j = a.pend.indexOf(x.pend); if (j >= 0) a.pend.splice(j, 1); }
  chn(st).n++; if (x.kind === 'story') chn(st).story++;
};

// L.tick 外面包一层只为两件事：L.ticking()（季末推月的过程中为真），以及推完把 L._inMonth 复原
// （tick.js 推过月后把 L._inMonth 设成 st，这个月的结算里 L.season 取 st.tick；里面各层包装都跑完再复原）
let ticking = 0;
{ const t0 = L.tick; L.tick = function (st, cont) {
  ticking++;
  const mon0 = L._inMonth;
  try { return t0.apply(this, arguments); } finally { ticking--; L._inMonth = mon0; }
}; }
L.ticking = () => ticking > 0;

// ---------- 新档与迁移（AP_PLAN §7） ----------
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); st.ap = newAp(); return st; }; }
const up3 = v => (typeof v === 'number' && isFinite(v) ? Math.ceil(v / 3) * 3 : v);
L.migrateAp = function (st) {
  if (!st || !st.p) return st;
  if (st.ap && typeof st.ap === 'object') { ap(st); return st; }   // 迁过了：只补字段
  const a = ap(st);
  // 历练在外：没打的节点按 e.pol 自动打完，结算（旧规则下出发的，收获全给）；第一条结算链的第一张就是它
  if (st.exp) {
    st.exp.apPaid = 1; st.exp.chain = 0; st.exp.old = 1; st.expSum = null;   // e.old：旧规则下出发的，收获不乘 expRew（expedition.js）
    acting++;
    let r = null;
    try { L.tripAuto(st); r = L.resolveExp(st); } finally { acting--; }
    if (r) { r.old = true; a.pend.push({ k: 'exp', res: r }); }
    st.exp = null;
  }
  // 闭关中：已得的 got 留着，再补 left × gainCalm × (m − 1)；按坐满算
  if (st.retreat) { const r = st.retreat, f = r.total > 0 ? Math.max(0, r.left) / L.AP.retTicks : 1; finishRetreat(st, f); }
  // 补齐到季界：静默连推，期间到期的大事记进 pend
  for (let g = 0; g < 2 && st.tick % L.SEASON_LEN !== 0 && st.p.r <= L.MAXR; g++) {
    const out = L.tick(st);
    for (const [k, n] of BIG) if (out[k]) a.pend.push({ k: n, data: typeof out[k] === 'object' ? out[k] : true });
    if (out.exp) a.pend.push({ k: 'exp', res: out.exp });
  }
  // 吐纳环：满 6 的部分折成修为
  if (typeof st.tuna === 'number' && st.tuna > 0) { const n = Math.floor(st.tuna / 6); if (n > 0 && st.p.r <= L.MAXR) L.addXp(st, L.gainCalm(st) * n); }
  delete st.tuna;
  if (st.flags) { if (st.flags.war > 0 && st.flags.war < 1e6) st.flags.war = up3(st.flags.war); }
  if (st.story && st.story.retry) for (const id in st.story.retry) st.story.retry[id] = up3(st.story.retry[id]);
  if (Array.isArray(st.inbox)) for (const x of st.inbox) if (x) x.away = false;
  a.left = L.AP.per;
  st.ap.migrated = 1;
  return st;
};
});
