/* 废柴仙途 · 逻辑模块 expedition：历练（地点×深度×行事、评价预掷、结算）与地图首领
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 历练：地点 k × 深度 d × 行事 a。el：地图五行（SYSTEMS §1；第一次去过之后显示；克制 ±8 分见 arts.js 的 L.expElem）
L.REGIONS = [
  { el: 'mu', n: '后山野林', mon: 2, foe: 'beast', fc: ['#8a7a66', '#5f5244'], bg: 'forest', desc: '野狼出没，适合初入仙途' },
  { el: 'jin', n: '黑风岭', mon: 2, foe: 'man', fc: ['#4a4a52', '#2c2c34'], bg: 'hill', desc: '一伙劫道的散修匪寇' },
  { el: 'tu', n: '落日古墓', mon: 2, foe: 'man', fc: ['#cfc8b0', '#8f876c'], bg: 'tomb', desc: '筑基老祖的埋骨之地，尸骨成精' },
  { el: 'mu', n: '万妖山脉', mon: 3, foe: 'beast', fc: ['#6a8f3a', '#3f5e22'], bg: 'forest', desc: '妖兽成群，凶险异常' },
  { el: 'huo', n: '血煞秘境', mon: 3, foe: 'man', fc: ['#b0303c', '#6a1820'], bg: 'blood', desc: '魔道遗留的小世界，血气冲天' },
  { el: 'jin', n: '上古剑冢', mon: 3, foe: 'orb', fc: ['#d8f0ff', '#7fb8e0'], bg: 'swords', desc: '万剑埋骨之地，剑灵游荡' },
  { el: 'shui', n: '九幽魔渊', mon: 3, foe: 'man', fc: ['#6a2a8a', '#3a1450'], bg: 'abyss', desc: '深不见底，魔气翻涌' },
  { el: 'shui', n: '东海龙宫', mon: 4, foe: 'snake', fc: ['#3fb0c8', '#1f6e8a'], bg: 'sea', desc: '龙族秘藏，宝光冲霄' },
  { el: 'huo', n: '天外星墟', mon: 4, foe: 'orb', fc: ['#ffe28a', '#c9a032'], bg: 'stars', desc: '破碎星辰的残骸，藏有仙人遗物' },
  { el: 'tu', n: '太古仙府', mon: 4, foe: 'man', fc: ['#e0c070', '#9a7a30'], bg: 'palace', desc: '上古大能的洞府，傀儡守卫森严' },
  { el: '', n: '混沌裂隙', mon: 5, foe: 'snake', fc: ['#2a2a3a', '#0e0e18'], bg: 'chaos', desc: '天地初开时留下的伤痕' },
];
L.DEPTHS = ['外围', '腹地', '禁地'];
// stone/herb/item：灵石、灵草、法宝功法掉率的倍率
L.APPR = [
  { k: 'slay', n: '斩妖', stone: 1.3, herb: 1, item: 1, d: '灵石多，归来另得战斗感悟' },
  { k: 'seek', n: '寻宝', stone: 0.7, herb: 1, item: 2, d: '法宝功法掉率翻倍，天材地宝更多' },
  { k: 'herb', n: '采药', stone: 0.8, herb: 3, item: 0.5, d: '灵草三倍，风险低，易遇灵兽' },
];
// 相性（斩妖/寻宝/采药）：2 = ◎，1 = ○，0 = △。每张图恰好各一个
L.AFF = [[1, 0, 2], [2, 1, 0], [0, 2, 1], [2, 0, 1], [1, 2, 0], [0, 2, 1], [2, 1, 0], [1, 0, 2], [0, 2, 1], [1, 2, 0], [2, 0, 1]];
L.AFF_SYM = ['△', '○', '◎'];
L.RATINGS = ['丁', '丙', '乙', '甲', '天'];
L.RATE_TH = [48, 66, 88, 105];           // 丙、乙、甲、天 的分数线
L.RATE_M = [0.15, 0.6, 1.0, 1.5, 2.0];   // 各评价的奖励倍率
L.ratingOf = s => (s >= L.RATE_TH[3] ? 4 : s >= L.RATE_TH[2] ? 3 : s >= L.RATE_TH[1] ? 2 : s >= L.RATE_TH[0] ? 1 : 0);
// 推荐战力：每张图 ×13.4、每深一层 ×2.37（SYSTEMS §18）；基础灵石 80 × 2.9^k × 1.35^d（§18：55 → 80）
L.REC = { base: 6, k: 13.4, d: 2.37 };
L.REW = { base: 80, k: 2.9, d: 1.35 };
L.rec = (k, d) => L.REC.base * Math.pow(L.REC.k, k) * Math.pow(L.REC.d, d || 0);
L.rew = (k, d) => L.REW.base * Math.pow(L.REW.k, k) * Math.pow(L.REW.d, d || 0);
// 破境丹掉率（§18：40% → 25%）
L.EXP_PILL = 0.25;
// 时长：传 st 时算上御风诀、风行水上（arts.js 的 L.artExpLen）与法宝词条「轻灵」（gear.js 的 L.gearExpLen）
L.expLen = (k, st) => L.gearExpLen(st, L.artExpLen(st, 4 + (k >= 3 ? 1 : 0) + (k >= 7 ? 1 : 0)));
// 地点需要的境界（小层序号）：黑风岭筑基，落日古墓筑基后期，之后每个大境界一张，混沌裂隙要渡劫圆满
const REG_SI = [0, 4, 6, 8, 12, 16, 20, 24, 28, 32, 35];
L.regionNeed = k => { const i = REG_SI[k]; return L.REALMS[i >> 2].n + L.STAGES[i & 3]; };

// ---------- 历练 ----------
L.bestOf = (st, k, d) => (st.best && st.best[k + '_' + d]) || 0;
// 地点解锁：境界够，且上一张图的外围评价过乙（黑风岭：筑基，或后山野林腹地评价乙）
L.regionOpen = function (st, k) {
  if (k <= 0) return true;
  if (k >= L.REGIONS.length) return false;
  const i = Math.max(L.si(st.p), st.flags.maxI || 0);
  if (k === 1) return i >= REG_SI[1] || L.bestOf(st, 0, 1) >= 2;
  return i >= REG_SI[k] && L.bestOf(st, k - 1, 0) >= 2;
};
L.regionLock = function (st, k) {
  if (L.regionOpen(st, k)) return '';
  const i = Math.max(L.si(st.p), st.flags.maxI || 0);
  if (k === 1) return '筑基后开放，或后山野林腹地评价乙';
  if (i < REG_SI[k]) return `${L.regionNeed(k)}后开放`;
  return `${L.REGIONS[k - 1].n}外围评价乙后开放`;
};
L.depthOpen = (st, k, d) => d <= 0 || L.bestOf(st, k, d - 1) >= 2;
// 行事：第二趟解锁采药，第四趟解锁寻宝
L.apprOpen = (st, a) => a === 0 || st.rebirth > 0 || st.stats.exp >= (a === 2 ? 1 : 3);
L.firstTrip = st => st.rebirth === 0 && st.stats.exp === 0;
// 第一世第一趟只能去后山野林外围斩妖（保底评价甲、掉一把凡器）
L.expOpen = function (st, k, d, a) {
  if (L.firstTrip(st) && (k || d || a)) return false;
  return L.regionOpen(st, k) && L.depthOpen(st, k, d) && L.apprOpen(st, a);
};
L.homeRegion = function (st) { let k = 0; for (let j = 1; j < L.REGIONS.length; j++) if (L.regionOpen(st, j)) k = j; else break; return k; };
// 相性：太虚剑宗的斩妖高一档
L.affOf = function (st, k, a) { let v = L.AFF[k][a]; if (a === 0 && st.sect && st.sect.id === 'jian') v = Math.min(2, v + 1); return v; };
// 已知：试过一次（记入图鉴），或装着天眼通
L.affKnown = (st, k, a) => !!(st.meta && st.meta.aff && st.meta.aff[k * 3 + a]) || L.artOn(st, 'm_tianyan');
L.affSym = (st, k, a) => (L.affKnown(st, k, a) ? L.AFF_SYM[L.affOf(st, k, a)] : '？');
L.elemKnown = (st, k) => !!(st.meta && st.meta.elem && st.meta.elem[k]) || L.artOn(st, 'm_tianyan');
L.elemName = k => (L.REGIONS[k].el ? L.ELEM[L.REGIONS[k].el] : '无');
// 分数里确定的三项：斩获（战力比）、身法（相性，采药 +6）、胆魄（禁地 +3，加上 L.addExpMod 登记的各项）
// 五行克制（克 +8 / 被克 −8）与功法项由 arts.js、法衣与词条由 gear.js 登记；TODO：同伴（§7.4）、道心也用 L.addExpMod 接进来
L.expExtraParts = (st, k, d, a) => L.modParts('exp', st, k, d, a);
L.expExtra = (st, k, d, a) => L.modSum(L.expExtraParts(st, k, d, a));
// 推荐战力另乘大势（魔劫：火、水属性地图 ×1.3，calendar.js 的 L.calExp）
L.expParts = function (st, k, d, a) {
  const T = L.power(st), rec = L.rec(k, d) * L.calExp(st, k, d, a).rec, ratio = T / rec;
  return { T, rec, ratio, pow: 70 + 25 * Math.log2(Math.max(ratio, 1e-9)), aff: (L.affOf(st, k, a) - 1) * 12 + (a === 2 ? 6 : 0), guts: (d === 2 ? 3 : 0) + L.expExtra(st, k, d, a), extra: L.expExtraParts(st, k, d, a) };
};
// 历练灵石倍率：锦鲤 ×1.5、夜璃知己 ×1.2；功法（烈火刀、烈火燎原）按行事另乘；法宝（聚财词条、财运饰品）见 gear.js（TODO：同伴）
L.expStoneMult = (st, a) => (L.has(st, 'koi') ? 1.5 : 1) * (L.friend(st, 'ye') ? 1.2 : 1) * L.gearExp(st).stone * (a === undefined ? 1 : L.artExp(st, 0, 0, a).stone);
// 越级时灵石、贡献 ×2（嗜血词条每条再 +25%）
L.leapMult = st => 2 * L.gearExp(st).leap;
// 出发确认页用：预计评价区间、负伤风险、灵石大约多少。没试过的相性按 ○ 估，并标 unknown
L.expForecast = function (st, k, d, a) {
  const pt = L.expParts(st, k, d, a), known = L.affKnown(st, k, a), ax = L.artExp(st, k, d, a);
  // 地图五行没去过：克制那 ±8 不算进预计（确认页写“？”）
  const ep = pt.extra.find(x => x[2] === 'elem'), elemUnknown = !!ep && !L.elemKnown(st, k);
  const base = pt.pow + (known ? pt.aff : (a === 2 ? 6 : 0)) + pt.guts - (elemUnknown ? ep[1] : 0);
  const first = L.firstTrip(st) && !k && !d && !a;
  const pGE = th => clamp((base + 12 - th) / 24, 0, 1);
  const dist = [1 - pGE(L.RATE_TH[0]), pGE(L.RATE_TH[0]) - pGE(L.RATE_TH[1]), pGE(L.RATE_TH[1]) - pGE(L.RATE_TH[2]), pGE(L.RATE_TH[2]) - pGE(L.RATE_TH[3]), pGE(L.RATE_TH[3])];
  // 六阶法衣：丁等 30% 改判丙
  const ds = L.gearDingSave(st); if (ds) { dist[1] += dist[0] * ds; dist[0] *= 1 - ds; }
  // 负伤风险：丁等的概率 × 没躲过的份（敛息术）；血遁、潜渊（禁地）、护主（每 12 月一次）丁等不负伤
  const injP = ax.xuedun || ax.c18 || L.gearHuzhuReady(st) ? 0 : 1 - ax.injAvoid;
  let lo = L.ratingOf(base - 12), hi = L.ratingOf(base + 12 - 1e-9), risk = dist[0] * injP, em = 0;
  if (first) { lo = hi = 3; risk = 0; em = L.RATE_M[3]; }
  else for (let j = 0; j < 5; j++) em += dist[j] * L.RATE_M[j];
  const leap = pt.ratio < ax.leap;
  // 灵石期望：越级时乙以上再 ×2（与 expCalc 一致）
  let emL = em;
  if (leap && !first) { emL = 0; for (let j = 0; j < 5; j++) emL += dist[j] * L.RATE_M[j] * (j >= 2 ? L.leapMult(st) : 1); }
  // 季节与大势（calendar.js 的 L.calExp）：夏兽类地图、兽潮、魔劫的灵石，矿脉、魔劫的灵矿
  const cx = L.calExp(st, k, d, a);
  let stones = L.rew(k, d) * emL * L.APPR[a].stone * L.expStoneMult(st, a) * cx.stone;
  const ore = Math.round(L.expOre(st, k, d, a, em) * cx.ore);
  return { k, d, a, T: pt.T, rec: pt.rec, ratio: pt.ratio, base, lo, hi, risk, ding: dist[0], dist, pOk: dist[2] + dist[3] + dist[4], leap, unknown: !known || elemUnknown, affUnknown: !known, elemUnknown, first, cal: cx.notes,
    elem: L.expElem(st, k), text: lo === hi ? L.RATINGS[lo] : L.RATINGS[lo] + '～' + L.RATINGS[hi], stones: Math.floor(stones), ore, len: L.expLen(k, st),
    warnFull: L.isFull(st), warnInj: st.p.inj > 0 ? st.p.inj : 0 };
};
// 推荐格：“预计评价至少乙”（负伤风险为 0 且八成以上乙）的最高一格
L.expBest = function (st, a) {
  let best = null;
  for (let k = 0; k < L.REGIONS.length; k++) for (let d = 0; d < 3; d++) {
    const aa = a === undefined ? 0 : a;
    if (!L.expOpen(st, k, d, aa)) continue;
    const f = L.expForecast(st, k, d, aa);
    if (f.first || (f.risk <= 0 && f.pOk >= 0.8)) { if (!best || L.rew(k, d) > L.rew(best.k, best.d)) best = { k, d, a: aa, f }; }
  }
  return best || { k: 0, d: 0, a: 0, f: L.expForecast(st, 0, 0, 0) };
};
L.chainOpen = st => st.rebirth > 0 || (st.flags.maxR || 0) >= 2;
// opt.chain：连续几趟（金丹解锁，最多 3）；opt.escort：护送任务的序号（本趟灵石归宗门，贡献 ×3）
L.startExp = function (st, k, d, a, opt) {
  d = d || 0; a = a || 0; opt = opt || {};
  if (L.busy(st) || st.p.r > L.MAXR || !L.expOpen(st, k, d, a)) return false;
  const rg = L.REGIONS[k], len = opt.len || L.expLen(k, st), pt = L.expParts(st, k, d, a);
  // 出发时把评价和掉落的随机数都掷好，途中逐步揭示，读档不会变（u[7]：敛息术躲不躲得过负伤；u[8]：六阶法衣丁等改判丙；u[9]：器方掉落）
  // cx：出发时的季节与大势加成（途中大势结束也照出发时的算）
  const plan = { pow: pt.pow, aff: pt.aff, guts: pt.guts, ratio: pt.ratio, rnd: -12 + 24 * R(), adj: 0, u: [R(), R(), R(), R(), R(), R(), R(), R(), R(), R()], enc: R(), cx: L.calExp(st, k, d, a) };
  if (L.firstTrip(st)) { plan.fix = 3; plan.gift = 1; }
  let chain = 0;
  if (opt.chain > 1 && L.chainOpen(st)) chain = Math.min(3, Math.floor(opt.chain)) - 1;
  st.exp = { k, d, a, left: len, total: len, plan, chain };
  if (opt.deeper) st.exp.deeper = opt.deeper;   // 趁势深入（loot.js 的 L.startDeeper）：只打下一层的精英，2 月
  if (opt.escort !== undefined && st.sect && st.sect.tasks) { const t = st.sect.tasks[opt.escort]; if (t && t.ty === 'escort' && t.taken && !t.done && t.k === k) st.exp.escort = opt.escort; }
  st.lastExp = { k, d, a };
  st.tuna = 0;
  if (!opt.quiet) L.log(st, `御剑出发，前往【${rg.n}·${L.DEPTHS[d]}】${L.APPR[a].n}`);
  return true;
};
// 按预掷的随机数算出这一趟的评价与收获（纯计算，不改存档）
// 法宝掉率：每多开一槽 ×1.35（三槽分一份掉落太稀）；器方：九幽魔渊禁地掉魔角冠（秘境上线前）、混沌裂隙禁地掉混沌珠
L.GEAR_DROP = { base: 0.30, slot: 0.35 };
const DEEP_PLAN = { 6: 'g_mojiao', 10: 'g_hundun' };
function expCalc(st, e) {
  const pl = e.plan, k = e.k, d = e.d, a = e.a, A = L.APPR[a], u = pl.u, ax = L.artExp(st, k, d, a), gx = L.gearExp(st);
  const cx = pl.cx || { stone: 1, herb: 1, ore: 1, tier: 1, treasure: 1 };
  const score = pl.pow + pl.aff + pl.guts + pl.rnd + (pl.adj || 0);
  let rating = pl.fix !== undefined ? pl.fix : L.ratingOf(score);
  const o = { k, d, a, score, rating, ratio: pl.ratio, parts: { pow: pl.pow, luck: pl.rnd + (pl.adj || 0), aff: pl.aff, guts: pl.guts } };
  // 六阶法衣：丁等 30% 改判丙（u[8]；旧档没有就从 u[0] 派生一个）
  if (rating === 0) { const u8 = u[8] === undefined ? (u[0] * 977) % 1 : u[8]; if (u8 < L.gearDingSave(st)) { rating = 1; o.robeSave = true; } }
  // 道心·狂三级：丁等“以伤换命”再战一次（dao.js 的 L.expRefight 按预掷的数重掷运气分），翻到丙以上就算数、换一月轻伤
  if (rating === 0 && pl.fix === undefined && L.expRefight) { const r2 = L.expRefight(st, pl, score); if (r2 !== null) { o.refight = r2 > 0 ? 'win' : 'lose'; if (r2 > 0) rating = r2; } }
  const m = L.RATE_M[rating];
  const leap = pl.ratio < ax.leap && rating >= 2;
  Object.assign(o, { rating, m, leap });
  let stones = L.rew(k, d) * m * A.stone * (0.9 + 0.2 * u[0]) * (leap ? L.leapMult(st) : 1) * L.expStoneMult(st, a) * cx.stone;
  if (e.escort !== undefined) stones = 0;
  o.stones = Math.floor(stones);
  o.herbs = Math.round((2 + k) * (1 + 0.5 * d) * A.herb * m * ax.herb * gx.herb * cx.herb);
  o.ore = Math.round(L.expOre(st, k, d, a, m) * cx.ore);
  o.pills = rating >= 1 && u[1] < L.EXP_PILL ? 1 : 0;
  o.drops = [];
  if (pl.gift) o.drops.push(['w', 1]);
  else {
    const slots = Math.max(1, L.gearOpenSlots(st).length);
    if (u[2] < L.GEAR_DROP.base * (1 + L.GEAR_DROP.slot * (slots - 1)) * m * A.item * ax.item * gx.item) o.drops.push(['g', 1 + Math.floor((3 * k + d) * 0.21) + (u[3] < 0.15 * cx.tier ? 1 : 0)]);
    if (u[4] < 0.25 * m * A.item * ax.item * gx.item) o.drops.push(['a', 1 + Math.floor((3 * k + d) * 0.18)]);
  }
  const dp = DEEP_PLAN[k];
  if (dp && d === 2 && rating >= 2 && !L.planOwned(st, dp) && (u[9] === undefined ? 1 : u[9]) < 0.35) o.plan = dp;
  if (rating >= 1 && st.p.r >= 1 && u[5] < 0.06 * (a === 2 ? 2.5 : 1) * ax.pet) o.drops.push(['pet', 1 + Math.floor(k * 0.5)]);
  o.treasure = rating >= 1 && u[6] < (0.03 + 0.01 * k) * (a === 1 ? (d === 2 ? 4 : 2) : 1) * ax.treasure ? cx.treasure : 0;   // 流星雨：天材地宝 ×2
  // 丁等：潜渊（禁地）空手而归、不负伤；血遁不负伤改折寿元；敛息术按 u[7] 躲开
  o.injury = 0;
  if (o.refight === 'win') o.injury = L.DAO_V.refightInj;
  if (rating === 0) {
    if (ax.c18) { o.qianyuan = true; o.stones = 0; o.herbs = 0; o.ore = 0; o.pills = 0; o.drops = []; o.treasure = 0; o.plan = null; }
    else if (ax.xuedun) o.xuedun = ax.xuedun;
    else if ((u[7] === undefined ? R() : u[7]) < ax.injAvoid) o.dodged = true;
    else if (L.gearHuzhuReady(st)) o.huzhu = true;
    else o.injury = Math.max(1, Math.round(3 * ax.injMul) - L.gearInjCut(st));
  }
  o.contrib = st.sect ? Math.floor(L.contribFor(k) * m * (leap ? L.leapMult(st) : 1) * (e.escort !== undefined ? 3 : 1)) : 0;
  o.xpTicks = a === 0 ? m : 0;   // 斩妖：归来得 1 月修为 × 奖励倍率（战斗感悟）
  return o;
}
// 途中 HUD 用：这一趟到目前为止“看得见”的收获
L.expPreview = function (st, frac) {
  if (!st.exp) return null;
  const e = st.exp, o = expCalc(st, e);
  const f = frac === undefined ? (e.total - e.left) / e.total : frac;
  return { k: e.k, d: e.d, a: e.a, left: e.left, total: e.total, stones: Math.floor(o.stones * f), herbs: Math.floor(o.herbs * f), ore: Math.floor(o.ore * f), finds: Math.floor((o.drops.length + o.treasure + o.pills + (o.plan ? 1 : 0)) * f + 1e-9), xp: L.gainBase(st) * o.xpTicks * f };
};
// 撤回：收获减半立即回家
L.recallExp = function (st) {
  if (!st.exp) return null;
  st.exp.recall = 1; st.exp.chain = 0;
  return L.resolveExp(st);
};
L.resolveExp = function (st) {
  const e = st.exp; if (!e) return null;
  st.exp = null;
  const k = e.k, d = e.d, a = e.a;
  if (!e.plan) return legacyExp(st, e);
  const pw0 = L.power(st), gain0 = L.gain(st);
  const res = expCalc(st, e);
  res.items = []; res.first = !!e.plan.gift; res.ok = res.rating >= 2; res.unlock = [];
  if (e.recall) { res.recall = true; res.stones = Math.floor(res.stones / 2); res.herbs = Math.floor(res.herbs / 2); res.ore = Math.floor(res.ore / 2); res.pills = 0; res.drops = []; res.plan = null; res.treasure = 0; res.contrib = Math.floor(res.contrib / 2); res.xpTicks = 0; res.rating = Math.min(res.rating, 1); res.ok = false; res.leap = false; }
  st.stats.exp++;
  st.stats[['slayExp', 'seekExp', 'herbExp'][a]] = (st.stats[['slayExp', 'seekExp', 'herbExp'][a]] || 0) + 1;
  // 相性第一次用才揭晓，记入图鉴（跨世保留）
  const akey = k * 3 + a;
  res.affV = L.affOf(st, k, a);
  if (!st.meta.aff[akey]) { st.meta.aff[akey] = 1; res.affNew = true; }
  if (!st.meta.elem) st.meta.elem = {};
  if (!st.meta.elem[k]) { st.meta.elem[k] = 1; res.elemNew = true; }
  st.flags.retStreak = 0;   // 出门一趟，闭关疲劳清零
  if (!e.recall) {
    const bkey = k + '_' + d, prev = st.best[bkey] || 0;
    if (res.rating > prev) st.best[bkey] = res.rating;
    if (res.rating >= 2 && prev < 2) {
      if (d < 2) res.unlock.push(`${L.REGIONS[k].n}·${L.DEPTHS[d + 1]} 开放`);
      else if (!st.bosses[k]) res.unlock.push(`首领【${L.BOSSES[k].n}】现身`);
      if (d === 0 && k + 1 < L.REGIONS.length && L.regionOpen(st, k + 1) && !(st.flags.regSeen || {})[k + 1]) res.unlock.push(`新地点【${L.REGIONS[k + 1].n}】开放`);
      if (k === 0 && d === 1 && L.si(st.p) < REG_SI[1]) res.unlock.push('新地点【黑风岭】开放');
    }
    // 同一格连续丁等，给老祖的“卡住检测”用
    const ds = st.flags.dingStreak;
    if (res.rating === 0) st.flags.dingStreak = { key: bkey, n: ds && ds.key === bkey ? ds.n + 1 : 1 };
    else st.flags.dingStreak = null;
  }
  if (res.ok) { st.stats.expWin++; st.regionWins[k] = (st.regionWins[k] || 0) + 1; }
  if (res.leap) st.stats.leapWins++;
  if (res.rating === 0 && !e.recall) st.stats.dings = (st.stats.dings || 0) + 1;
  if (res.rating === 4) st.stats.tians = (st.stats.tians || 0) + 1;
  st.stones += res.stones; st.stats.expStones = (st.stats.expStones || 0) + res.stones;
  st.herbs += res.herbs;
  st.pills += res.pills;
  st.treasure += res.treasure;
  L.addOre(st, res.ore);
  if (res.huzhu) st.gear.huzhu = st.tick;
  // 归途翻牌（loot.js 的 L.tripLoot：法宝、功法、灵核、灵矿堆……都在牌里，保底与心愿也在那里）；灵宠偶遇不占牌，照旧
  // TODO（C1 合并后删）：C1 的节点流程接上后由“归途”节点调 L.tripLoot，这里的兜底用评价推“打赢精英”（斩妖、寻宝乙以上）与宝节点（寻宝）
  if (L.tripLoot) {
    res.cards = L.tripLoot(st, { k, d, a, rating: res.rating, won: res.rating >= 2, eliteWin: a !== 2 && res.rating >= 2, treasure: a === 1 && res.rating >= 1 && !e.recall ? 1 : 0, seq: st.stats.exp, recall: !!e.recall, hp: res.rating >= 4 ? 0.8 : res.rating >= 3 ? 0.55 : 0.3,
      deeper: e.deeper ? (res.rating >= 2 && !e.recall ? 'win' : 'lose') : undefined, deeperOnly: !!e.deeper });
    if (e.deeper) { res.deeper = res.cards.n.deeper ? 'win' : 'lose'; if (res.deeper === 'lose') res.deeperLost = L.lootHalveU(st, e.deeper.prevU || []); }
    for (const c of res.cards) if (c.item && (c.kind === 'gear' || c.kind === 'art' || c.kind === 'frag')) res.items.push(c.item);
  }
  for (const dr of res.drops) { if (L.tripLoot && dr[0] !== 'pet') continue; const it = L.giveItem(st, dr[0], dr[1], undefined, { k, d, src: 'exp' }); if (it.value) st.stats.expStones += it.value; res.items.push(it); }
  if (res.plan) res.planText = L.givePlan(st, res.plan);
  // 仙府现世（秘境上线前的折算）：评价甲以上一半机会带回一件仙府秘藏
  if (!e.recall) { const xf = L.calXianfu(st, res.rating); if (xf) { res.xianfu = xf; if (xf.it) res.items.push(xf.it); } }
  // 战技每趟斩妖历练另 +2 熟练
  const sl = L.artSlots(st);
  if (!e.recall && a === 0 && sl[1] && L.ARTS_ON !== false) L.addMastery(st, sl[1], L.MAST.slay * L.artRate(st));
  res.xp = L.gainBase(st) * res.xpTicks;
  if (res.xp > 0) L.addXp(st, res.xp);
  if (res.contrib) L.addContrib(st, res.contrib);
  if (res.refight === 'win' && res.injury && !e.recall) { st.p.inj = Math.max(st.p.inj, res.injury); res.inj = res.injury; }
  if (res.rating === 0 && !e.recall) {
    if (res.injury) { st.p.inj = Math.max(st.p.inj, res.injury); res.inj = res.injury; }
    if (res.xuedun && st.p.r <= L.MAXR) { const y = L.lifespan(st) * res.xuedun; st.p.age += y; res.lifeCost = y; }
  }
  // 回春剑诀：每趟归来负伤 −1 月
  const heal = L.artExp(st, k, d, a).heal;
  if (heal && st.p.inj > 0) { const n = L.probRound(heal); st.p.inj = Math.max(0, st.p.inj - n); res.healed = n; }
  if (e.encEv) res.enc = true;
  if (st.sect && !e.recall) {
    L.taskHit(st, 'exp', t => t.k === k && t.a === a && res.rating >= 2);
    if (res.leap) L.taskHit(st, 'act', t => t.sub === 'leap');
    if (e.escort !== undefined && res.rating >= 1) { const t = st.sect.tasks && st.sect.tasks[e.escort]; if (t && t.ty === 'escort' && !t.done) L.taskDone(st, t); res.escort = true; }
  }
  const tag = `${L.REGIONS[k].n}·${L.DEPTHS[d]}`;
  if (e.recall) L.log(st, `【${tag}】中途折返，收获减半`);
  else L.log(st, `【${tag}】${L.APPR[a].n}归来，评价「${L.RATINGS[res.rating]}」${res.leap ? '（越级）' : ''}，灵石+${L.fmt(res.stones)}${res.inj ? `，负伤 ${res.inj} 月` : ''}`, res.rating >= 3 ? 'gold' : res.rating >= 2 ? 'jade' : res.rating === 0 ? 'red' : '');
  res.pw0 = pw0; res.pw1 = L.power(st); res.gain0 = gain0; res.gain1 = L.gain(st);
  res.chain = e.chain || 0;
  L.checkQuests(st);
  return res;
};
// 旧版存档里走到一半的历练：按旧规则（成功率 0.75 + 0.3·log2(战力/推荐)）结算一次
const OLD_DREC = [6, 200, 2600, 4e4, 4.5e5, 6e6, 9e7, 1e9, 1.3e10, 1.4e11, 1e12];
const OLD_DREW = [60, 170, 450, 1200, 3200, 8500, 22000, 58000, 1.5e5, 4e5, 1.1e6];
function legacyExp(st, e) {
  const k = clamp(e.k || 0, 0, 10), ratio = L.power(st) / OLD_DREC[k];
  const ok = R() < clamp(0.75 + 0.3 * Math.log2(Math.max(ratio, 1e-9)), 0.05, 0.98);
  const res = { k, d: 0, a: 0, legacy: true, ok, rating: ok ? 2 : 0, m: ok ? 1 : 0.15, score: ok ? 70 : 40, parts: { pow: ok ? 70 : 40, luck: 0, aff: 0, guts: 0 }, items: [], unlock: [], pills: 0, herbs: 0, treasure: 0, contrib: 0, xp: 0, leap: false, ratio, pw0: L.power(st), gain0: L.gain(st) };
  res.stones = Math.floor(OLD_DREW[k] * (ok ? 0.85 + R() * 0.3 : 0.1));
  st.stones += res.stones; st.stats.exp++;
  if (ok) { st.stats.expWin++; st.regionWins[k] = (st.regionWins[k] || 0) + 1; st.best[k + '_0'] = Math.max(st.best[k + '_0'] || 0, 2); }
  else { st.p.inj = Math.max(st.p.inj, 3); res.inj = 3; }
  L.log(st, `【${L.REGIONS[k].n}】历练${ok ? '归来' : '失利，负伤而归'}，灵石+${L.fmt(res.stones)}`, ok ? 'jade' : 'red');
  res.pw1 = L.power(st); res.gain1 = L.gain(st); res.chain = 0;
  L.checkQuests(st);
  return res;
}

// ---------- 地图首领 ----------
L.BOSSES = [
  { n: '独眼狼王', line: '嗷呜——！', t: '狼王克星', drop: '狼王獠牙匕' },
  { n: '黑风寨主雷彪', line: '敢在老子地盘撒野？', t: '黑风克星', drop: '开山宣花斧' },
  { n: '古墓尸王', line: '……活人的气息……', t: '镇尸道人', drop: '玉棺镇魂钉' },
  { n: '赤炎猿王', line: '万妖山是俺的山！', t: '万妖山主', drop: '赤炎擎天棍' },
  { n: '血煞老魔', line: '桀桀桀，又来一个送死的。', t: '诛魔者', drop: '血煞噬魂刃' },
  { n: '剑冢守墓人', line: '拔剑吧。让老夫看看你的剑。', t: '剑冢新主', drop: '守墓古剑' },
  { n: '九幽魔将', line: '九幽之下，皆为蝼蚁。', t: '九幽镇魔', drop: '九幽镇魂铃' },
  { n: '东海蛟皇', line: '人族小儿，也敢闯我龙宫？', t: '屠蛟者', drop: '蛟皇逆鳞盾' },
  { n: '吞星巨兽', line: '（星辰在它口中碎裂）', t: '摘星客', drop: '吞星之核' },
  { n: '仙府傀儡王', line: '擅闯仙府者，诛。', t: '仙府之主', drop: '傀儡王天戟' },
  { n: '混沌魔神残影', line: '……天地未开时，吾已在此。', t: '开天之人', drop: '混沌残刃' },
];
// 某张图禁地评价乙以上一次后，首领现身。战力 = 禁地推荐 × 1.6
// 首领每 12 月可再战一次（COMBAT_LOOT §5.7：第一章起；原来金丹后每 48 月）：首领材料 ×1、灵石，掉落见 loot.js 的 L.bossLoot
L.BOSS_AGAIN = 12;
L.bossAgain = (st, k) => !!st.bosses[k] && st.tick - ((st.bossAt || {})[k] === undefined ? -999 : st.bossAt[k]) >= L.BOSS_AGAIN;
L.bossReady = (st, k) => L.bestOf(st, k, 2) >= 2 && (!st.bosses[k] || L.bossAgain(st, k));
L.bossPower = k => L.rec(k, 2) * 1.6;
L.fightBoss = function (st, k) {
  if (!L.bossReady(st, k) || L.busy(st)) return null;
  const B = L.BOSSES[k], again = !!st.bosses[k];
  const foe = { kind: 'boss', k };
  const S = L.duelPower(st, foe), Q = L.bossPower(k);
  const p = L.duelP(st, S, Q, foe);
  if (L.revealFoe) L.revealFoe(st, foe);
  const win = R() < p;
  const res = { k, S, Q, p, win, B, again };
  st.bossAt = st.bossAt || {};
  if (win && again) {
    // 再战：首领材料 ×1、灵石；翻 1 张牌（loot.js 的 L.bossLoot：35% 专属，第 3 次必出）
    st.bossAt[k] = st.tick;
    res.mat = L.giveMat(st, k, 1);
    if (L.bossLoot) { res.cards = L.bossLoot(st, k, false); const g = res.cards.find(c => c.kind === 'gear'); if (g) res.item = g.item; }
    res.stones = Math.floor(L.rew(k, 2)); st.stones += res.stones;
    if (st.sect) L.taskHit(st, 'boss', x => x.k === k);
    L.log(st, `再战【${B.n}】得胜，取得${L.BOSS_MAT[k]} ×1`, 'jade');
  } else if (win) {
    st.bosses[k] = 1; st.stats.bosses++; st.bossAt[k] = st.tick;
    const t = k >= 5 ? 2 : 1; st.treasure += t; res.treasure = t;
    res.stones = Math.floor(L.rew(k, 2) * 3); st.stones += res.stones;
    res.herbs = Math.round((6 + k * 2) * (1 + st.p.r * 0.5)); st.herbs += res.herbs;
    // 首领专属法宝（固定词条，走对比卡）、首领材料 ×2、器方（gear.js）
    res.mat = L.giveMat(st, k, 2);
    if (L.bossLoot) {
      // 首杀 3 张固定牌（loot.js 的 L.bossLoot：专属 ★★、功法、器方）
      res.cards = L.bossLoot(st, k, true);
      for (const c of res.cards) { if (c.kind === 'gear') res.item = c.item; else if (c.kind === 'art' || c.kind === 'frag') res.art = c.item; else if (c.kind === 'plan') res.planText = c.item.text; }
    } else {
      res.item = L.gearDrop(st, L.gearBase('b' + k).slot, 0, { base: 'b' + k, src: 'boss' });
      if (L.BOSS_PLAN[k]) res.planText = L.givePlan(st, L.BOSS_PLAN[k]);
      // 首领首杀另掉一门功法（按首领五行，见 arts.js 的 L.bossArt）
      const aid = L.bossArt(st, k);
      if (aid) res.art = L.giveArt(st, aid, { src: 'boss' });
    }
    L.grantTitle(st, B.t);
    if (st.sect) L.taskHit(st, 'boss', x => x.k === k);
    L.log(st, `斩杀【${B.n}】！获得称号「${B.t}」`, 'gold');
    L.fireTrigger(st, 'boss:' + k);
  } else {
    st.p.inj = Math.max(st.p.inj, 4);
    L.log(st, `挑战【${B.n}】失利，重伤而归`, 'red');
  }
  L.checkQuests(st);
  return res;
};
});
