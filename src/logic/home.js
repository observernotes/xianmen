/* 废柴仙途 · 逻辑模块 home：洞府（docs/SYSTEMS.md §6.1，CONTENT §7）——地块、十一种建筑、建造 / 升级 / 拆除、价格与“值不值”
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   地块数 = 3 + floor(洞府等级 × 5 / 12)（0 级 3 块，12 级 8 块）。第 0 块固定是聚灵阵（不可拆，阵法布在它上面，见 formation.js）。
 *   st.home = { cave 洞府本体等级, array / field / furnace / forge / pen / room / library / spring / vault / pavilion / portal 各建筑等级（0 = 没建）,
 *               plots ['array', 'field', null, …] 地块上建的是什么（长度 ≥ 地块数；旧档地块不够时超额保留，直到拆掉）,
 *               rec { 建筑: 拆掉时记下的一半等级（重建从这一级起）}, spent { 建筑: 累计花了多少灵石（拆除返还一半）},
 *               disc { 建筑: 下一次建造 / 升级的价格倍数（pen_discount 兽栏七折）}, zhen 阵法（formation.js）, full 地块满了从哪个周天起, inj0 上周天的负伤 }
 *   建造 = 点空地块 → 点建筑：付 base × grow^0，等级 = max(1, 记下的一半等级)；升级付 base × grow^lv；拆除返还累计花费的 50%。
 *   L.upgrade(st, k) 对还没建的建筑 = 建在第一块空地上（札记、老祖讲解、旧调用都走它）。
 *   建筑效果（每级，L.HV）：器炉 强化成功率 +2%、强化灵矿 −3%、5 级开打造（gear.js 的 L.forgeLv）；兽栏 喂养 +8%、岗位 +5%（pets.js）；
 *     静室 闭关倍率 +0.05（原洞府本体的 +0.05/级挪到这里，SYSTEMS 写 +0.08，见 BALANCE_TODO）、顿悟 +2%；藏经阁 熟练 +10%、每级揭示一条共鸣提示（arts.js 的 L.libraryLv / L.comboHint）；
 *     灵泉 负伤每 2 级少养 1 周天、丹毒消退 +0.5（alchemy.js 早就读 st.home.spring）、寿元流逝 −1%；聚宝阁 被动灵石 +6%、出售价 +3%；
 *     迎客亭 访客 +10%、来访好感 +1；传送阵 3 级历练时长 −1、6 级已通关地图的禁地直接开、9 级秘境不耗周天（realm.js 读 st.home.portal）。
 *   加载早于 calendar / market / realm / alchemy / pets 的那些接入点在 buildings.js（排在后面，包一层）。
 *   L.HOME2_ON = false（sim 的 nohome2）：回到地块之前——只有聚灵阵、灵田、丹炉、洞府四项，闭关仍按洞府等级、器炉借丹炉等级、阵法只有聚灵。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
L.HOME2_ON = true;
const ON = () => L.HOME2_ON !== false;
L.home2On = ON;

// 每级效果（SYSTEMS §6.1 的表；静室按“替换洞府本体的闭关加成”取 0.05）
L.HV = { forgeRate: 0.02, forgeOre: 0.03, forgeOreCap: 0.45, penFeed: 0.08, penJob: 0.05, roomRet: 0.05, roomEpi: 0.02, lib: 0.10,
  springInj: 2, springTox: 0.5, springAge: 0.01, vaultInc: 0.06, vaultSell: 0.03, pavVisit: 0.10, pavAff: 1,
  portalLen: 3, portalDeep: 6, portalRealm: 9, refund: 0.5, keep: 0.5, caveRet: 0.05 };
const pc = v => Math.round(v * 100) + '%';
const x2 = v => (Math.round(v * 100) / 100).toString();

// 建筑表（顺序同 CONTENT §7；最后一项是洞府本体，不占地块）。价格 = base × grow^lv（聚灵阵 40 × 1.62^lv，SYSTEMS §18；原 1.5）
// open：解锁（SYSTEMS §0 的时点，转世后全开）；nu：地块制之后才有的新建筑（nohome2 时不能建）
L.HOME = [
  { k: 'array', n: '聚灵阵', base: 40, grow: 1.62, max: 30, fixed: true, unlock: '先出去历练一趟', d: lv => `阵法强度 Lv${lv} · 聚灵：修炼 ×${L.arrayMult(lv).toFixed(2)}` },
  // 灵田：田数 1 + floor(lv/4)（至多 6 块），每块种一种作物（crops.js）；全种灵稻时每周天灵石 = L.fieldInc(lv)
  { k: 'field', n: '灵田', base: 50, grow: 1.6, max: 30, unlock: '历练两趟后可开垦', d: lv => (lv ? `田 ${Math.min(6, 1 + Math.floor(lv / 4))} 块 · 全种灵稻每周天灵石 ${L.fmt(L.fieldInc(lv))} · 作物产量 +${lv * 8}%` : '开垦后种灵稻（灵石）或灵草，筑基后还有灵谷与药引') },
  { k: 'furnace', n: '丹炉', base: 120, grow: 1.75, max: 20, unlock: '炼气后期可建', d: lv => (lv ? `成丹率 ${60 + lv * 3}% · 突破成功率 +${lv}%` : '建成后开启炼丹房，并提升突破成功率') },
  { k: 'forge', n: '器炉', base: 150, grow: 1.8, max: 15, nu: true, unlock: '炼气圆满可建', d: lv => (lv ? `强化成功率 +${pc(lv * L.HV.forgeRate)} · 强化灵矿 −${pc(Math.min(L.HV.forgeOreCap, lv * L.HV.forgeOre))}${lv >= L.FORGE_LV ? ' · 能打造' : ` · ${L.FORGE_LV} 级开打造`}` : `强化更稳更省矿，${L.FORGE_LV} 级起按器方打造专属法宝`) },
  { k: 'pen', n: '兽栏', base: 200, grow: 1.9, max: 12, nu: true, unlock: '筑基后可建', d: lv => (lv ? `喂养效率 +${pc(lv * L.HV.penFeed)} · 岗位效果 +${pc(lv * L.HV.penJob)}` : '灵宠喂得更快、岗位干得更好') },
  { k: 'room', n: '静室', base: 300, grow: 1.9, max: 12, nu: true, unlock: '筑基后期可建', d: lv => (lv ? `闭关倍率 +${x2(lv * L.HV.roomRet)} · 顿悟 +${pc(lv * L.HV.roomEpi)}` : '闭关倍率与顿悟') },
  { k: 'library', n: '藏经阁', base: 3000, grow: 2.1, max: 10, nu: true, unlock: '金丹可建', d: lv => (lv ? `功法熟练 +${pc(lv * L.HV.lib)} · 已揭示共鸣提示 ${lv} 条` : '功法熟练更快，每级揭示一条共鸣提示') },
  { k: 'spring', n: '灵泉', base: 3000, grow: 2.1, max: 10, nu: true, unlock: '金丹可建', d: lv => (lv ? `负伤少养 ${Math.floor(lv / L.HV.springInj)} 周天 · 丹毒每周天多退 ${x2(lv * L.HV.springTox)} · 寿元流逝 −${pc(lv * L.HV.springAge)}` : '养伤、退丹毒、延缓寿元流逝') },
  { k: 'vault', n: '聚宝阁', base: 400, grow: 1.85, max: 12, nu: true, unlock: '筑基后期可建', d: lv => (lv ? `被动灵石 +${pc(lv * L.HV.vaultInc)} · 出售价 +${pc(lv * L.HV.vaultSell)}` : '被动灵石与坊市出售价') },
  { k: 'pavilion', n: '迎客亭', base: 20000, grow: 2.2, max: 8, nu: true, unlock: '元婴可建', d: lv => (lv ? `访客 +${pc(lv * L.HV.pavVisit)} · 来访好感 +${L.HV.pavAff}` : '访客来得更勤，来访的人好感多给') },
  { k: 'portal', n: '传送阵', base: 300000, grow: 4, max: 9, nu: true, unlock: '化神可建', d: lv => (lv ? [`${lv >= 3 ? '✓' : '3 级'} 历练时长 −1`, `${lv >= 6 ? '✓' : '6 级'} 已通关地图的禁地直接去`, `${lv >= 9 ? '✓' : '9 级'} 秘境不耗周天`].join(' · ') : '3 级历练时长 −1；6 级直达禁地；9 级秘境不耗周天') },
  { k: 'cave', n: '洞府', base: 200, grow: 2.2, max: 12, body: true, unlock: '炼气后期可扩建', d: lv => `寿元 +${lv * 5}% · 地块 ${L.homePlotMaxAt(lv)} 块 · ${caveName(lv)}${ON() ? '' : ` · 闭关 ×${(2 + 0.05 * lv).toFixed(2)}`}` },
];
const B = {}; for (const b of L.HOME) B[b.k] = b;
L.HOME_B = B;
// 地块上能建的十一种（不含洞府本体）
L.BLD_KEYS = L.HOME.filter(b => !b.body).map(b => b.k);
L.homeIsNew = k => !!(B[k] && B[k].nu);
function caveName(lv) { return lv <= 0 ? '荒山破庙' : lv <= 2 ? '竹林小筑' : lv <= 5 ? '石壁洞府' : lv <= 8 ? '云中楼阁' : '琼楼仙宫'; }
L.caveName = caveName;
L.arrayMult = lv => Math.pow(1.08, lv);
L.fieldInc = lv => (lv > 0 ? 6 * Math.pow(1.42, lv) : 0);
L.vein = r => 4 * Math.pow(2.5, Math.min(r, 8));
// 聚灵阵的修炼加成随阵法走：布着聚灵阵才有 ×1.08^lv（formation.js 重新登记这一项；这里是阵法模块没装时的兜底）
L.addCulMod('array', 30, st => (L.arrayPaused(st) ? [`聚灵阵 Lv${st.home.array}（停阵求雨，剩 ${st.cal.pause - st.tick} 周天）`, 1, 'array'] : ['聚灵阵 Lv' + st.home.array, L.arrayMult(st.home.array), 'array']));
// 灵田的灵石只来自灵稻（crops.js 的 L.fieldStoneInc = L.fieldInc × 灵稻块数 / 田数；全种灵稻 = 旧公式）
L.addIncSrc('field', 10, st => [`灵田 Lv${st.home.field}${L.plotCount(st) && L.riceCount(st) < L.plotCount(st) ? `·灵稻 ${L.riceCount(st)}/${L.plotCount(st)} 块` : ''}`, L.fieldStoneInc(st), 'field']);
// 聚宝阁：被动灵石（灵田、灵脉、俸禄……整个每周天收入）+6%/级
L.addIncMul('vault', 47, st => (ON() && st.home.vault ? [`聚宝阁 Lv${st.home.vault}`, 1 + L.HV.vaultInc * st.home.vault, 'home'] : null));

// ---------- 解锁 ----------
// 聚灵阵要先历练一趟，灵田两趟，丹炉和洞府扩建要炼气后期；新建筑按 SYSTEMS §0 的时点。转世后全开
L.homeUnlocked = function (st, k) {
  const b = B[k]; if (!b) return false;
  if (b.nu && !ON()) return false;
  if (st.rebirth > 0) return true;
  if (!b.nu && (st.flags.maxR || 0) >= 1) return true;
  if (k === 'array') return st.stats.exp >= 1;
  if (k === 'field') return st.stats.exp >= 2;
  if (k === 'furnace' || k === 'cave') return L.si(st.p) >= 2;
  if (k === 'forge') return mi(st) >= 3;
  if (k === 'pen') return mr(st) >= 1;
  if (k === 'room' || k === 'vault') return mi(st) >= 6;
  if (k === 'library' || k === 'spring') return mr(st) >= 2;
  if (k === 'pavilion') return mr(st) >= 3;
  if (k === 'portal') return mr(st) >= 4;
  return false;
};
const built = (st, k) => (st.home[k] || 0) > 0;
L.homeBuilt = (st, k) => k === 'array' || k === 'cave' || built(st, k);
// 能不能点“升级”：解锁了，且已建（或还有空地块，升 0 级 = 建在第一块空地上）
L.homeOpen = function (st, k) {
  if (!L.homeUnlocked(st, k)) return false;
  if (k === 'array' || k === 'cave' || built(st, k)) return true;
  return L.homePlotFree(st) > 0;
};
L.homeLock = function (st, k) {
  if (!L.homeUnlocked(st, k)) return B[k] ? (B[k].nu && !ON() ? '没有地块' : B[k].unlock) : '';
  if (!L.homeOpen(st, k)) return `地块满了（${L.homePlotMax(st)} 块）：扩建洞府或拆掉一样`;
  return '';
};

// ---------- 地块 ----------
L.homePlotMaxAt = cave => 3 + Math.floor(Math.max(0, cave) * 5 / 12);
L.homePlotMax = st => L.homePlotMaxAt(st.home.cave || 0);
// 地块表：第 0 块聚灵阵；已建的每种恰好占一块；没建的、重复的清掉；地块多了补空地，旧档放不下的排到后面（超额保留）
L.homePlots = function (st) {
  const h = st.home, max = L.homePlotMax(st);
  let a = Array.isArray(h.plots) ? h.plots : [];
  const seen = { array: 1 }, out = ['array'];
  for (let i = 1; i < a.length; i++) { const k = a[i]; out.push(k && B[k] && !B[k].body && !seen[k] && built(st, k) ? (seen[k] = 1, k) : null); }
  const extra = [];
  for (let i = max; i < out.length; i++) if (out[i]) extra.push(out[i]);
  out.length = Math.min(out.length, max);
  while (out.length < max) out.push(null);
  for (const k of L.BLD_KEYS) if (k !== 'array' && built(st, k) && !seen[k]) { seen[k] = 1; extra.push(k); }
  for (const k of extra) { const i = out.indexOf(null, 1); if (i > 0) out[i] = k; else out.push(k); }
  if (a.length !== out.length || out.some((k, i) => a[i] !== k)) h.plots = out;
  return h.plots;
};
L.homePlotFree = st => L.homePlots(st).filter((k, i) => i > 0 && !k).length;
L.homeOver = st => Math.max(0, L.homePlots(st).length - L.homePlotMax(st));
// 解锁了、还没建的建筑（地块比建筑少：取舍就在这里）
L.homeUnbuilt = st => L.BLD_KEYS.filter(k => k !== 'array' && !built(st, k) && L.homeUnlocked(st, k));
// 洞府还要升到几级才多一块地
L.homeNextPlotCave = st => { const m = L.homePlotMax(st); for (let c = (st.home.cave || 0) + 1; c <= B.cave.max; c++) if (L.homePlotMaxAt(c) > m) return c; return 0; };

// ---------- 价格 ----------
L.hCost = (k, lv) => { const b = B[k]; return Math.floor(b.base * Math.pow(b.grow, lv)); };
// 实际要付的：建造付 0 级的价，升级付当前级的价；兽栏七折（pen_discount）之类的一次性折扣
L.homeCost = function (st, k) {
  const lv = st.home[k] || 0, base = L.hCost(k, built(st, k) || k === 'array' || k === 'cave' ? lv : 0);
  const d = st.home.disc && st.home.disc[k];
  return Math.floor(base * (d > 0 && d < 1 ? d : 1));
};
// 到第 lv 级为止按公式算的累计花费（旧档没记 spent 时用）
L.homeSum = (k, lv) => { let s = 0; for (let i = 0; i < lv; i++) s += L.hCost(k, i); return s; };
L.homeRefund = (st, k) => Math.floor(((st.home.spent && st.home.spent[k]) || 0) * L.HV.refund);
// 重建从几级起
L.homeRebuildLv = (st, k) => Math.max(1, (st.home.rec && st.home.rec[k]) || 0);

// ---------- 建造 / 升级 / 拆除 ----------
const spend = (st, k, c) => { st.stones -= c; st.flags.spentAt = st.tick; const h = st.home; h.spent = h.spent || {}; h.spent[k] = (h.spent[k] || 0) + c; if (h.disc && h.disc[k]) delete h.disc[k]; };
// 建在第 i 块（省略 = 第一块空地）；返回 '' 表示能建
L.buildWhy = function (st, k, i) {
  const b = B[k];
  if (!b || b.body || k === 'array') return '没有这种建筑';
  if (!L.homeUnlocked(st, k)) return L.homeLock(st, k);
  if (built(st, k)) return '已经建了';
  const pl = L.homePlots(st);
  if (i === undefined) i = pl.indexOf(null, 1);
  if (!(i > 0) || i >= pl.length || pl[i]) return pl.indexOf(null, 1) > 0 ? '这块地上有建筑' : `地块满了（${L.homePlotMax(st)} 块）：扩建洞府或拆掉一样`;
  const c = L.homeCost(st, k);
  if (st.stones < c) return `还差 ${L.fmt(c - st.stones)} 灵石`;
  return '';
};
L.build = function (st, k, i) {
  if (L.buildWhy(st, k, i)) return null;
  const pl = L.homePlots(st);
  if (i === undefined) i = pl.indexOf(null, 1);
  const c = L.homeCost(st, k), lv = L.homeRebuildLv(st, k);
  spend(st, k, c);
  st.home[k] = lv; if (st.home.rec) delete st.home.rec[k];
  pl[i] = k;
  st.stats.builds = (st.stats.builds || 0) + 1;
  L.log(st, `${B[k].n}建成${lv > 1 ? `（重建，从 ${lv} 级起）` : ''}`, 'jade');
  const res = { k, i, lv, cost: c, hints: [] };
  afterLevel(st, k, 0, lv, res);
  L.fireTrigger(st, 'build:' + k);
  L.checkQuests(st);
  emit('build', res);
  return res;
};
// 升级（没建的 = 建在第一块空地上）
L.upgrade = function (st, k) {
  const b = B[k];
  if (!b) return false;
  if (!b.body && k !== 'array' && !built(st, k)) return !!L.build(st, k);
  const lv = st.home[k] || 0;
  if (lv >= b.max || !L.homeOpen(st, k)) return false;
  const c = L.homeCost(st, k);
  if (st.stones < c) return false;
  spend(st, k, c);
  st.home[k] = lv + 1;
  L.log(st, `${b.n}升至 ${st.home[k]} 级${k === 'cave' ? '：' + caveName(st.home[k]) + (L.homePlotMaxAt(st.home[k]) > L.homePlotMaxAt(lv) ? `，多出一块地（${L.homePlotMaxAt(st.home[k])} 块）` : '') : ''}`);
  if (k === 'cave') L.homePlots(st);
  const res = { k, lv: st.home[k], hints: [] };
  afterLevel(st, k, lv, st.home[k], res);
  if (k === 'library') L.fireTrigger(st, 'build:library');
  L.checkQuests(st);
  return true;
};
// 藏经阁：每升一级（含建成、重建跳过的级）揭示一条共鸣提示
function afterLevel(st, k, lv0, lv1, res) {
  if (k === 'library' && ON() && L.comboHint) for (let i = lv0; i < lv1; i++) { const id = L.comboHint(st); if (!id) break; res.hints.push(id); L.log(st, '藏经阁里翻出一条共鸣提示：' + L.comboHintText(id), 'gold'); }
}
L.demolishWhy = function (st, k) {
  if (!B[k] || B[k].body) return '没有这种建筑';
  if (k === 'array') return '聚灵阵是洞府的根基，拆不得';
  if (!built(st, k)) return '还没建';
  return '';
};
L.demolish = function (st, k) {
  if (L.demolishWhy(st, k)) return null;
  const lv = st.home[k], back = L.homeRefund(st, k), keep = Math.floor(lv * L.HV.keep);
  const pl = L.homePlots(st), i = pl.indexOf(k);
  st.stones += back;
  st.home[k] = 0;
  st.home.rec = st.home.rec || {}; if (keep >= 1) st.home.rec[k] = Math.max(st.home.rec[k] || 0, keep);
  (st.home.spent = st.home.spent || {})[k] = 0;
  if (i > 0) pl[i] = null;
  L.homePlots(st);
  if (k === 'furnace' && st.dan) st.dan.auto = [];   // 丹炉拆了，续炼停下
  L.log(st, `拆了${B[k].n}（Lv${lv}）：返还灵石 ${L.fmt(back)}${keep >= 1 ? `，等级记着，重建从 ${keep} 级起` : ''}`);
  L.checkQuests(st);
  return { k, lv, back, keep, i };
};

// ---------- 升级值不值：聚灵阵看“每周天多多少修为、这一层提前几周天”，灵田看“几周天回本”，其余写“前 → 后” ----------
L.upInfo = function (st, k) {
  const b = B[k], lv = st.home[k] || 0, isB = b.body || k === 'array' || built(st, k);
  const o = { k, lv, built: isB, max: isB && lv >= b.max, cost: 0, lock: L.homeLock(st, k), note: '' };
  if (o.max) return o;
  o.cost = L.homeCost(st, k);
  const nx = isB ? lv + 1 : L.homeRebuildLv(st, k);
  o.next = nx;
  if (k === 'array') {
    const g = L.gainCalm(st), on = L.zhenK ? L.zhenK(st, 'f_juling') : 1, g1 = g * (1 + (L.arrayMult(lv + 1) / L.arrayMult(lv) - 1) * (on > 0 ? 1 : 0)), left = Math.max(0, L.pNeed(st.p) - st.p.xp);
    o.d0 = g; o.d1 = g1;
    const save = g > 0 && !L.isFull(st) ? left / g - left / g1 : 0;
    o.note = on > 0 ? `修炼 +${L.fmt1(g1 - g)}/周天` + (save >= 0.5 ? `，本层提前 ${Math.round(save)} 周天` : '') : '阵法强度 +1（现在没布聚灵阵）';
  } else if (k === 'field') {
    // 按现在的灵稻份额算（全种灵稻 = 旧公式）；多开一块田时新田默认灵稻
    const n0 = L.plotCount(st), n1 = Math.min(L.CROP_V.plotMax, 1 + Math.floor(nx / L.CROP_V.plotEvery)), rice = L.riceCount(st);
    const s0 = n0 ? rice / n0 : 0, s1 = n1 ? (rice + (n1 - n0)) / n1 : 0;
    const d = L.fieldInc(nx) * s1 - L.fieldInc(lv) * s0;
    o.d0 = L.fieldInc(lv) * s0; o.d1 = L.fieldInc(nx) * s1; o.payback = d > 0 ? Math.ceil(o.cost / d) : Infinity;
    o.note = (d > 0 ? `灵石 +${L.fmt1(d)}/周天，${o.payback} 周天回本` : '田里没种灵稻：只加作物产量') + (n1 > n0 ? '；多开一块田' : '') + (lv ? `；作物产量 +${Math.round(L.CROP_V.lvYield * 100)}%` : '');
    const nb = L.nextBig(st);
    if (nb && nb.left < o.payback && nb.left <= 12) o.note += '（赶不上这一届）';
  } else if (k === 'furnace') o.note = lv ? '成丹率 +3%，突破 +1%' : '开启炼丹房：培元丹、破境丹、疗伤丹';
  else if (k === 'cave') { const m0 = L.homePlotMaxAt(lv), m1 = L.homePlotMaxAt(lv + 1); o.note = `寿元 +5%${m1 > m0 ? `，多一块地（${m0} → ${m1} 块）` : ''}${ON() ? '' : '，闭关倍率 +0.05'}`; }
  else o.note = L.homeDelta(st, k, lv, nx);
  return o;
};
// 新建筑升一级（或建成）前后的数：写成“闭关 ×2.25 → ×2.30”这样
L.homeDelta = function (st, k, a, b) {
  const H = L.HV;
  if (k === 'forge') return `强化成功率 +${pc(a * H.forgeRate)} → +${pc(b * H.forgeRate)}，强化灵矿 −${pc(Math.min(H.forgeOreCap, a * H.forgeOre))} → −${pc(Math.min(H.forgeOreCap, b * H.forgeOre))}${a < L.FORGE_LV && b >= L.FORGE_LV ? '；开打造' : ''}`;
  if (k === 'pen') return `喂养 +${pc(a * H.penFeed)} → +${pc(b * H.penFeed)}，岗位 +${pc(a * H.penJob)} → +${pc(b * H.penJob)}`;
  if (k === 'room') { const m = L.retBaseMult(st), d = (b - a) * H.roomRet; return `闭关倍率 ×${m.toFixed(2)} → ×${(m + d).toFixed(2)}，顿悟 +${pc(a * H.roomEpi)} → +${pc(b * H.roomEpi)}`; }
  if (k === 'library') return `功法熟练 +${pc(a * H.lib)} → +${pc(b * H.lib)}，再揭示 ${b - a} 条共鸣提示`;
  if (k === 'spring') return `丹毒每周天退 ${x2(L.toxDecay(st))} → ${x2(L.toxDecay(st) + (b - a) * H.springTox)}，寿元流逝 −${pc(a * H.springAge)} → −${pc(b * H.springAge)}${Math.floor(b / H.springInj) > Math.floor(a / H.springInj) ? '，负伤少养 1 周天' : ''}`;
  if (k === 'vault') { const v = L.income(st), m = 1 + a * H.vaultInc; return `灵石 +${L.fmt1(v)} → +${L.fmt1(v / m * (1 + b * H.vaultInc))}/周天，出售价 +${pc(a * H.vaultSell)} → +${pc(b * H.vaultSell)}`; }
  if (k === 'pavilion') return `访客 +${pc(a * H.pavVisit)} → +${pc(b * H.pavVisit)}${a ? '' : '，来访好感 +1'}`;
  if (k === 'portal') { const s = [[H.portalLen, '历练时长 −1'], [H.portalDeep, '禁地直达'], [H.portalRealm, '秘境不耗周天']].find(x => a < x[0] && b >= x[0]); const n = [[H.portalLen, '历练时长 −1'], [H.portalDeep, '禁地直达'], [H.portalRealm, '秘境不耗周天']].find(x => b < x[0]); return s ? `开：${s[1]}` : n ? `${n[0]} 级开${n[1]}` : '已全开'; }
  return '';
};

// ---------- 效果（读 st.home；加载在 gear / arts 之后，所以这两处直接接上）----------
// 器炉（SYSTEMS §6.1）：等级接进 gear.js 的 L.forgeLv（器炉 5 级开打造）。nohome2 时照旧借丹炉等级
L.forgeLv = st => (ON() ? (st.home && st.home.forge) || 0 : (st.home && st.home.furnace) || 0);
{ const why0 = L.gearOpenWhy; L.gearOpenWhy = function (st, w) { if (w !== 'forge' || !ON()) return why0(st, w); const a = st && !(st.rebirth > 0 || mr(st) >= 4) ? '化神开放' : ''; const b = st && L.forgeLv(st) < L.FORGE_LV ? `器炉 ${L.FORGE_LV} 级（${st.home.forge ? `现在 ${st.home.forge} 级` : '【洞府】空地块上建一座'}）` : ''; return [a, b].filter(Boolean).join('，且') || `化神开放，且器炉 ${L.FORGE_LV} 级`; }; }
{ const rate0 = L.gearPlusRate; L.gearPlusRate = (st, x) => { const v = rate0(st, x); return v > 0 && ON() && st.home.forge ? Math.min(1, v + L.HV.forgeRate * st.home.forge) : v; }; }
{ const cost0 = L.gearPlusCost; L.gearPlusCost = (st, x) => { const c = cost0(st, x); if (!ON() || !st.home.forge) return c; const o = Math.max(1, Math.ceil(c.ore * (1 - Math.min(L.HV.forgeOreCap, L.HV.forgeOre * st.home.forge)))); return { ore: o, stones: c.stones }; }; }
// 藏经阁：arts.js 的 L.artRate 已经乘了 (1 + 0.1 × L.libraryLv)
L.libraryLv = st => (ON() && st && st.home ? st.home.library || 0 : 0);
// 静室：闭关倍率（cultivation.js 的 L.retBaseMult 读 L.roomRet；nohome2 时还是洞府本体 +0.05/级）、顿悟（包 arts.js 的 L.artEpi）
L.roomRet = st => (ON() ? L.HV.roomRet * (st.home.room || 0) : L.HV.caveRet * (st.home.cave || 0));
{ const epi0 = L.artEpi; L.artEpi = st => epi0(st) + (ON() ? L.HV.roomEpi * (st.home.room || 0) : 0); }
// 灵泉：寿元流逝 −1%/级（包 arts.js 的 L.ageRate；丹毒消退在 alchemy.js 的 L.toxDecay，它本来就读 st.home.spring）
{ const age0 = L.ageRate; L.ageRate = st => age0(st) * (ON() && st.home.spring ? 1 - L.HV.springAge * st.home.spring : 1); }
});
