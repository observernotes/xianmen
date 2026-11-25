/* 废柴仙途 · 逻辑模块 buildings：洞府建筑接进别的系统、每周天的洞府事、阵图的来源、旧档迁移、洞府事件（docs/SYSTEMS.md §6.1、§6.3，CONTENT §14.5）
 * 模块写法见 src/logic.js 顶部说明。数据与建造 / 拆除在 home.js，阵法在 formation.js；这里排在各系统后面，只包一层、不改它们的内部。
 *
 *   兽栏 喂养 +8%/级（pets.js 的 L.petFeedEff）、岗位 +5%/级（pets.js 的 jobV 读 L.penJobMult）；养兽阵也走这两处。
 *   聚宝阁 出售价 +3%/级（market.js 的 L.sellParts；被动灵石在 home.js 的 incMul）。
 *   迎客亭 访客 +10%/级（calendar.js 的 L.calVisitMult）、来访好感 +1（L.visitFavorBonus，fx.aff 的钩子；人物线读它）。
 *   传送阵 3 级历练时长 −1（L.expLen）、6 级已通关地图（外围评价乙）的禁地直接开（L.depthOpen）、9 级秘境不耗周天（realm.js 读 st.home.portal）。
 *   灵泉 新添的伤每 2 级少养 1 周天（L.homeTick）；泉中鱼 spring_fish 丹毒每周天多退 0.5。
 *   阵图来源：生财阵 坊市轮换货（market.js 的 L.zhenShopOk）；迷踪 / 护山 / 养兽 拍卖（L.zhenAucLot）；迷踪 仙府秘藏（realm.js 的 L.mjChestExtra）；
 *            养兽 万妖山脉腹地（妖市）、太古仙府任一深度评价乙以上时偶得（L.resolveExp）；丹火 葛老三心；锻魂 剑气秘境；渡劫 story_trib1。
 *   事件：plot_full（地块满了又有新建筑能建，12 周天后，home_plot_full）、build:<建筑>（建成 / 藏经阁升级：home_spring、home_library_note）；
 *        一次性 flag tut_rebuild（界面打开拆建）、pen_discount（下一次兽栏七折，替掉灵宠那一刀先收着的“喂养 +8%”）；常驻 flag spring_fish；home_neighbor 要洞府 ≥ 4 级。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, pick, clamp, emit } = L.U;
const ON = () => L.HOME2_ON !== false;
const V = () => L.HV;
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };

// ---------- 兽栏、养兽阵 ----------
L.penJobMult = st => (ON() ? (1 + V().penJob * (st.home.pen || 0)) * (1 + (L.zhenK(st, 'f_yangshou') ? L.zhenNum(st, 'f_yangshou').job : 0)) : 1);
wrap('petFeedEff', b => st => b(st) * (ON() ? (1 + V().penFeed * (st.home.pen || 0)) * (1 + (L.zhenK(st, 'f_yangshou') ? L.zhenNum(st, 'f_yangshou').xp : 0)) : 1));
// ---------- 聚宝阁：出售价 ----------
wrap('sellParts', b => (st, k) => { const a = b(st, k); if (ON() && st.home.vault) a.push([`聚宝阁 Lv${st.home.vault}`, 1 + V().vaultSell * st.home.vault, 'mul']); return a; });
// ---------- 迎客亭：访客、来访好感 ----------
L.visitFavorBonus = st => (ON() && st.home && st.home.pavilion > 0 ? V().pavAff : 0);
wrap('calVisitMult', b => st => b(st) * (ON() && st.home.pavilion ? 1 + V().pavVisit * st.home.pavilion : 1));
{ const affPrev = L.CAPS.fx.aff;
  L.supportFx('aff', { apply: function (st, v, out, fx, ctx) {
    if (affPrev && affPrev.apply) affPrev.apply(st, v, out, fx, ctx);
    const n = L.visitFavorBonus(st);
    if (!n || !ctx || !ctx.ev || !ctx.ev.visit || !v) return;
    for (const id in v) if (v[id] > 0 && L.NPCS && L.NPCS[id]) { const d = L.addAff(st, id, n); if (d) out.push(`迎客亭·好感 ${L.npcName(st, id)} 再 +${d}`); }
  } }); }
// ---------- 灵泉：泉中鱼（spring_fish）丹毒消退 +0.5 ----------
wrap('toxDecay', b => st => b(st) + (st.eflags && st.eflags.spring_fish ? V().springTox : 0));
// ---------- 传送阵 ----------
L.portalLv = st => (ON() ? (st && st.home && st.home.portal) || 0 : 0);
wrap('expLen', b => (k, st) => { const n = b(k, st); return st && L.portalLv(st) >= V().portalLen ? Math.max(2, Math.min(n, n - 1)) : n; });
wrap('depthOpen', b => (st, k, d) => b(st, k, d) || (d === 2 && L.portalLv(st) >= V().portalDeep && L.bestOf(st, k, 0) >= 2));

// ---------- 阵图来源 ----------
const owned = (st, id) => L.zhenOwned(st, id);
// 坊市轮换货：生财阵（筑基起）
L.zhenShopOk = st => ON() && (st.rebirth > 0 || Math.max(st.p.r, st.flags.maxR || 0) >= 1) && !owned(st, 'f_shengcai');
L.zhenShopPick = () => 'f_shengcai';
// 拍卖：元婴起，迷踪 / 护山 / 养兽里没有的一张
L.zhenAucLot = function (st) {
  if (!ON() || st.p.r < 3) return null;
  const left = ['f_mizong', 'f_hushan', 'f_yangshou'].filter(id => !owned(st, id));
  if (!left.length) return null;
  const id = pick(left);
  return { k: 'zhentu', zt: id, n: `阵图《${L.zhenName(id)}》`, m: 0.8 };
};
// 仙府秘藏：迷踪阵
L.mjChestExtra = (st, run) => (ON() && run && run.xf && !owned(st, 'f_mizong') ? [{ k: 'plan', id: 'f_mizong' }] : []);
// 历练：万妖山脉腹地（妖市）评价乙以上 10% 养兽阵；太古仙府评价乙以上 8% 一张没有的阵图
L.ZHEN_DROP = { yang: 0.10, xianfu: 0.08 };
wrap('resolveExp', b => st => {
  const e = st.exp, res = b(st);
  if (!res || !e || !ON() || res.recall || !(res.rating >= 2)) return res;
  let id = null;
  if (e.k === 3 && e.d === 1 && !owned(st, 'f_yangshou') && R() < L.ZHEN_DROP.yang) id = 'f_yangshou';
  else if (e.k === 9) { const left = ['f_mizong', 'f_hushan', 'f_yangshou', 'f_shengcai', 'f_danhuo', 'f_duanhun'].filter(x => !owned(st, x)); if (left.length && R() < L.ZHEN_DROP.xianfu) id = pick(left); }
  if (id) { const t = L.givePlan(st, id); res.planText = res.planText ? res.planText + '；' + t : t; res.zhentu = id; }
  return res;
});

// ---------- 每周天（tick.js 调） ----------
L.homeTick = function (st, out) {
  const h = st.home, p = st.p;
  L.homePlots(st);
  L.zhenTick(st, out);
  if (!ON()) return;
  // 灵泉：新添的伤每 2 级少养 1 周天（至少养 1 周天）
  const cut = Math.floor((h.spring || 0) / V().springInj);
  if (cut > 0 && p.inj > (h.inj0 || 0)) { const v = Math.max(1, p.inj - cut); if (v < p.inj) { if (out) out.springHeal = p.inj - v; p.inj = v; } }
  h.inj0 = p.inj;
  // 地块满了、又有解锁了没建的：满 12 周天后老祖吐槽一次（home_plot_full，每世一次）
  const full = L.homePlotFree(st) === 0 && L.homeUnbuilt(st).length > 0;
  if (!full) h.full = -1;
  else if (!(h.full >= 0)) h.full = st.tick;
  else if (st.tick - h.full >= 12 && !st.evDone.home_plot_full) L.fireTrigger(st, 'plot_full');
  // 葛老三心：送一张丹火阵图
  if (!owned(st, 'f_danhuo') && !st.flags.geZhen && L.hearts && L.hearts(st, 'ge') >= 3) {
    st.flags.geZhen = 1;
    const t = L.givePlan(st, 'f_danhuo');
    if (out) (out.zhentu = out.zhentu || []).push({ id: 'f_danhuo', who: 'ge', t });
  }
};

// ---------- 新档、旧档 ----------
const KEYS = () => L.HOME.map(b => b.k);
function fillHome(h) {
  for (const k of KEYS()) h[k] = clamp(Math.floor(+h[k] || 0), 0, L.HOME_B[k].max);
  for (const k of ['rec', 'spent', 'disc']) if (!h[k] || typeof h[k] !== 'object' || Array.isArray(h[k])) h[k] = {};
  if (!(h.full >= -1)) h.full = -1;
  if (!(h.inj0 >= 0)) h.inj0 = 0;
  h.libMax = Math.max(Math.floor(+h.libMax || 0), h.library);
}
{ const ns = L.newState; L.newState = function (o) { const st = ns(o); fillHome(st.home); st.home.plots = []; st.home.zhen = L.newZhen(); L.homePlots(st); return st; }; }
// 存档（可重复调用，不升版本）：地块制之前的档——已有的聚灵阵、灵田、丹炉照原等级建在地块上（3 块地永远放得下这三样）；
// 累计花费按公式补记（拆了照样返还一半）；原来洞府本体给的闭关 +0.05/级挪到静室：记成“静室从洞府等级起建”；
// 原来借丹炉等级的器炉：丹炉 ≥ 5 级的记成“器炉从 5 级起建”，建一座就能接着打造。
L.migrateHome = function (s) {
  const h = s.home = s.home && typeof s.home === 'object' ? s.home : {};
  const fresh = !Array.isArray(h.plots);
  fillHome(h);
  if (fresh) {
    h.plots = [];
    for (const k of L.BLD_KEYS) if (h[k] > 0) h.spent[k] = L.homeSum(k, h[k]);
    if (h.cave > 0 && !h.room) h.rec.room = Math.max(h.rec.room || 0, Math.min(L.HOME_B.room.max, h.cave));
    if (h.furnace >= L.FORGE_LV && !h.forge) h.rec.forge = Math.max(h.rec.forge || 0, L.FORGE_LV);
  }
  L.homePlots(s);
  L.zhenState(s);
  for (const k of L.BLD_KEYS) if (!(h.spent[k] >= 0)) h.spent[k] = h[k] > 0 ? L.homeSum(k, h[k]) : 0;
  if (h.zboost && !(h.zboost.until > 0)) delete h.zboost;
  return fresh ? '洞府分了地块：聚灵阵、灵田、丹炉照原等级建在地块上' : '';
};

// ---------- 事件能力 ----------
L.supportTrigger('plot_full');
L.supportTrigger('build:');
// home_neighbor：洞府 ≥ 4 级（CONTENT §14.5 的触发条件）
const HOME_EV_REQ = { home_neighbor: st => (st.home.cave || 0) >= 4 };
wrap('eligible', b => (st, ev, where, ctx) => { if (!b(st, ev, where, ctx)) return false; const f = HOME_EV_REQ[ev.id]; return !f || f(st); });
// 一次性 flag：tut_rebuild（界面打开【洞府】的拆建，st.home.tut）、pen_discount（下一次兽栏建造 / 升级七折）；常驻 spring_fish
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  const all = [].concat(v), mine = ON() ? all.filter(f => f === 'pen_discount') : [], rest = all.filter(f => !mine.includes(f));
  if (flagPrev && flagPrev.apply && rest.length) flagPrev.apply(st, rest.length === 1 ? rest[0] : rest, out, fx, ctx);
  for (const f of all) {
    if (f === 'pen_discount' && mine.length) { delete st.eflags[f]; st.home.disc.pen = 0.7; out.push(`兽栏下一次${st.home.pen ? '升级' : '建造'}七折（${L.fmt(L.homeCost(st, 'pen'))} 灵石）`); }
    else if (f === 'tut_rebuild') { delete st.eflags[f]; st.home.tut = 1; out.push('【洞府】里点一块地，能拆能建'); }
    else if (f === 'spring_fish') out.push(`丹毒每周天多退 ${V().springTox}`);
  }
} });
});
