/* 废柴仙途 · 逻辑模块 formation：阵法（docs/SYSTEMS.md §6.3，CONTENT §6）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   聚灵阵地块上布一种阵法（炼虚起第二阵位，效果 ×0.5）；强度 L = 聚灵阵等级。切换免费，3 月后生效（这 3 月里旧阵照常管用，界面写“布阵中”）。
 *   阵法筑基后期开放（转世后全开；第二阵位始终要炼虚）。阵图存在 st.gear.zhentu（法宝那一刀起事件 fx.plan 就记在这里，story_trib1 给渡劫阵）；聚灵阵自带。
 *   st.home.zhen = [{ id 正在生效的, nx 布阵中的, at 哪个月生效 }, { 第二阵位 }]；st.home.zlast 最近换过的阵位；st.home.zboost { id, until } 阵势 +20%（formation_boost）
 *   效果（L = 聚灵阵等级，k = 1 主阵位 / 0.5 第二阵位，阵势 +20% 时再 ×1.2；求雨停阵时全部失效）：
 *     聚灵 修炼 ×(1 + (1.08^L − 1) × k)；生财 被动灵石 +3%×L（≤ 60%）、出售价 +10%；护山 盗贼 / 寻仇上门 −5%×L（≤ 80%）、宗门战事战力 ×(1 + 1%×L)；
 *     养兽 灵宠经验 +4%×L、岗位 +1%×L；丹火 成丹率 +1%×L（≤ 15%）、上品以上 +0.5%×L；锻魂 功法熟练 +3%×L；渡劫 天劫承劫 +1%×L（≤ 15%，trib.js 的护劫手段）；
 *     迷踪 访客 −50%、奇遇把握 +10%、秘境陷阱减半。
 *   trib.js 调 L.formationReady(st, 'f_dujie') / L.formationVal / L.formationWhy。切阵时 5% 触发 formation_fail（home_formation_fail）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, clamp, emit } = L.U;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const ON = () => L.HOME2_ON !== false;
const pc = v => Math.round(v * 1000) / 10 + '%';

L.ZV = { switch: 3, second: 0.5, failP: 0.05, boost: 0.2, boostLen: 12, openI: 6, slot2R: 5,
  shengcai: 0.03, shengcaiCap: 0.6, shengcaiSell: 0.10, hushan: 0.05, hushanCap: 0.8, hushanWar: 0.01,
  yangXp: 0.04, yangJob: 0.01, danhuo: 0.01, danhuoCap: 0.15, danhuoQ: 0.005, duanhun: 0.03, mizongVisit: 0.5, mizongLuck: 0.10 };
// 八张阵图（id 同 L.ZHENTU、ART.sigil）：名字、来源、一句用途
L.ZHEN = [
  { id: 'f_juling', short: '聚灵', src: '自带', use: '平时布着：修炼' },
  { id: 'f_shengcai', short: '生财', src: '坊市轮换货（筑基起）', use: '攒钱：被动灵石、出售价' },
  { id: 'f_hushan', short: '护山', src: '宗门执法长老、太古仙府、拍卖', use: '挡盗贼寻仇、宗门战事' },
  { id: 'f_yangshou', short: '养兽', src: '万妖山脉·妖市（腹地）、拍卖', use: '灵宠经验与岗位' },
  { id: 'f_danhuo', short: '丹火', src: '葛老三心、丹经旧事', use: '大量炼丹前：成丹率与品质' },
  { id: 'f_duanhun', short: '锻魂', src: '剑气秘境', use: '功法熟练' },
  { id: 'f_dujie', short: '渡劫', src: '第一次雷劫后老祖传授', use: '渡劫前 3 月：天劫承劫' },
  { id: 'f_mizong', short: '迷踪', src: '仙府秘藏、太古仙府、拍卖', use: '访客少、奇遇把握、秘境陷阱减半' },
];
const Z = {}; for (const x of L.ZHEN) Z[x.id] = x;
L.ZHEN_ONE = Z;
L.zhenName = id => (L.ZHENTU && L.ZHENTU[id]) || '';

// ---------- 状态 ----------
const blank = () => ({ id: '', nx: '', at: 0 });
L.newZhen = () => [{ id: 'f_juling', nx: '', at: 0 }, blank()];
const zs = st => {
  const h = st.home;
  if (!Array.isArray(h.zhen) || h.zhen.length !== 2) h.zhen = L.newZhen();
  for (let i = 0; i < 2; i++) { let s = h.zhen[i]; if (!s || typeof s !== 'object') s = h.zhen[i] = blank(); if (s.id && !Z[s.id]) s.id = ''; if (s.nx && !Z[s.nx]) s.nx = ''; if (!(s.at >= 0)) s.at = 0; }
  if (!h.zhen[0].id && !h.zhen[0].nx) h.zhen[0].id = 'f_juling';
  return h.zhen;
};
L.zhenState = zs;
L.zhenOpen = st => ON() && (st.rebirth > 0 || mi(st) >= L.ZV.openI);
L.zhenSlots = st => (L.zhenOpen(st) && mr(st) >= L.ZV.slot2R ? 2 : 1);
L.zhenOwned = (st, id) => id === 'f_juling' || !!(st.gear && st.gear.zhentu && st.gear.zhentu[id]);
L.zhenOwnList = st => L.ZHEN.filter(x => L.zhenOwned(st, x.id)).map(x => x.id);
L.zhenLv = st => st.home.array || 0;
// 这种阵法现在的效果倍数：0 没布 / 1 主阵位 / 0.5 第二阵位（阵势 +20% 再 ×1.2）
L.zhenK = function (st, id) {
  if (!Z[id]) return 0;
  if (L.arrayPaused && L.arrayPaused(st)) return 0;
  if (!ON()) return id === 'f_juling' ? 1 : 0;
  const z = zs(st);
  let k = z[0].id === id ? 1 : L.zhenSlots(st) >= 2 && z[1].id === id ? L.ZV.second : 0;
  if (!k) return 0;
  const b = st.home.zboost; if (b && b.id === id && st.tick < b.until) k *= 1 + L.ZV.boost;
  return k;
};
L.formationReady = (st, id) => L.zhenK(st, id) > 0;
// 布在哪个阵位、生效没有：{ slot, on 生效中, pend 布阵中（还剩几月）}
L.zhenWhere = function (st, id) {
  const z = zs(st);
  for (let i = 0; i < 2; i++) { if (z[i].id === id && (i === 0 || L.zhenSlots(st) >= 2)) return { slot: i, on: true, pend: 0 }; if (z[i].nx === id) return { slot: i, on: false, pend: Math.max(1, z[i].at - st.tick) }; }
  return null;
};

// ---------- 效果的数（界面、老祖讲解、各接入点共用） ----------
const lvOf = st => st.home.array || 0;
L.zhenNum = function (st, id, k) {
  const lv = lvOf(st), V = L.ZV;
  if (k === undefined) k = L.zhenK(st, id);
  switch (id) {
    case 'f_juling': return { cul: 1 + (L.arrayMult(lv) - 1) * k };
    case 'f_shengcai': return { inc: Math.min(V.shengcaiCap, V.shengcai * lv) * k, sell: V.shengcaiSell * k };
    case 'f_hushan': return { bad: Math.min(V.hushanCap, V.hushan * lv) * k, war: 1 + V.hushanWar * lv * k };
    case 'f_yangshou': return { xp: V.yangXp * lv * k, job: V.yangJob * lv * k };
    case 'f_danhuo': return { alch: Math.min(V.danhuoCap, V.danhuo * lv) * k, q: V.danhuoQ * lv * k };
    case 'f_duanhun': return { mast: V.duanhun * lv * k };
    case 'f_dujie': return { trib: Math.min(L.TRIB.zhenCap, L.TRIB.zhen * lv) * k };
    case 'f_mizong': return { visit: 1 - V.mizongVisit * Math.min(1, k), luck: V.mizongLuck * k, trap: k > 0 };
  }
  return {};
};
// 效果写成一句（k 省略 = 布在主阵位时）
L.zhenEffect = function (st, id, k) {
  const n = L.zhenNum(st, id, k === undefined ? 1 : k);
  switch (id) {
    case 'f_juling': return `修炼 ×${n.cul.toFixed(2)}`;
    case 'f_shengcai': return `被动灵石 +${pc(n.inc)}，出售价 +${pc(n.sell)}`;
    case 'f_hushan': return `盗贼、寻仇上门少 ${pc(n.bad)}，宗门战事战力 ×${n.war.toFixed(2)}`;
    case 'f_yangshou': return `灵宠经验 +${pc(n.xp)}，岗位效果 +${pc(n.job)}`;
    case 'f_danhuo': return `成丹率 +${pc(n.alch)}，上品以上 +${pc(n.q)}`;
    case 'f_duanhun': return `功法熟练 +${pc(n.mast)}`;
    case 'f_dujie': return `天劫承劫 +${pc(n.trib)}`;
    case 'f_mizong': return `访客 −${pc(1 - n.visit)}，奇遇把握 +${pc(n.luck)}，秘境陷阱减半`;
  }
  return '';
};
// trib.js：渡劫阵这一样护劫手段加多少（布着按实际；没布按“布在主阵位”时的值给准备页看）
L.formationVal = (st, id) => { const k = L.zhenK(st, id); return L.zhenNum(st, id, k > 0 ? k : 1).trib || 0; };
L.formationWhy = function (st, id) {
  if (L.formationReady(st, id)) return '';
  if (!L.zhenOpen(st)) return '筑基后期开放阵法';
  const w = L.zhenWhere(st, id);
  if (w) return `布阵中，还要 ${w.pend} 月`;
  return `【洞府】聚灵阵上布${L.zhenName(id)}（${L.ZV.switch} 月后生效）`;
};

// ---------- 换阵 ----------
L.zhenSetWhy = function (st, slot, id) {
  if (!ON() || !L.zhenOpen(st)) return '筑基后期开放阵法';
  if (slot >= L.zhenSlots(st)) return '炼虚后开第二阵位';
  if (!id) return slot === 0 ? '主阵位不能空着' : '';
  if (!Z[id]) return '没有这种阵法';
  if (!L.zhenOwned(st, id)) return '还没有这张阵图';
  const z = zs(st), s = z[slot], o = z[1 - slot];
  if (o.id === id || o.nx === id) return '另一个阵位布着它';
  if (s.nx === id) return `正在布，还要 ${Math.max(1, s.at - st.tick)} 月`;
  if (s.id === id && !s.nx) return '已经布着';
  return '';
};
L.zhenSet = function (st, slot, id) {
  if (L.zhenSetWhy(st, slot, id)) return null;
  const z = zs(st), s = z[slot];
  if (!id) { const from = s.id || s.nx; s.id = ''; s.nx = ''; s.at = 0; L.log(st, `撤下第二阵位的${L.zhenName(from)}`); return { slot, id: '', from }; }
  if (s.id === id && s.nx) { const was = s.nx; s.nx = ''; s.at = 0; L.log(st, `不布${L.zhenName(was)}了，接着用${L.zhenName(id)}`); return { slot, id, cancel: true }; }
  const from = s.id;
  s.nx = id; s.at = st.tick + L.ZV.switch;
  st.home.zlast = slot;
  st.stats.zhenSet = (st.stats.zhenSet || 0) + 1;
  L.log(st, `聚灵阵上改布${L.zhenName(id)}：${L.ZV.switch} 月后生效（${L.zhenEffect(st, id, slot ? L.ZV.second : 1)}）${from ? `，在那之前${L.zhenName(from)}照常` : ''}`, 'jade');
  if (R() < L.ZV.failP) L.fireTrigger(st, 'formation_fail');
  return { slot, id, at: s.at, from };
};
// 每月（buildings.js 的 L.homeTick 调）：布阵到时生效
L.zhenTick = function (st, out) {
  if (!ON()) return;
  const z = zs(st);
  for (let i = 0; i < 2; i++) {
    const s = z[i];
    if (!s.nx || st.tick < s.at) continue;
    const from = s.id; s.id = s.nx; s.nx = ''; s.at = 0;
    L.log(st, `${L.zhenName(s.id)}布成：${L.zhenEffect(st, s.id, i ? L.ZV.second : 1)}`, 'gold');
    if (out) (out.zhen = out.zhen || []).push({ slot: i, id: s.id, from });
    emit('zhen', { slot: i, id: s.id, from });
  }
};

// ---------- 接进各系统（本模块排在它们后面，包一层） ----------
// 聚灵：重新登记聚灵阵那一项（同 id 覆盖 home.js 的兜底）
L.addCulMod('array', 30, st => {
  const lv = st.home.array;
  if (L.arrayPaused(st)) return [`聚灵阵 Lv${lv}（停阵求雨，剩 ${st.cal.pause - st.tick} 月）`, 1, 'array'];
  const k = L.zhenK(st, 'f_juling');
  if (!k) { const z = zs(st); return [`聚灵阵 Lv${lv}（布着${L.zhenName(z[0].id) || '别的阵'}，不聚灵）`, 1, 'array']; }
  return [`聚灵阵 Lv${lv}${k < 1 ? '（第二阵位）' : k > 1 ? '（阵势 +20%）' : ''}`, L.zhenNum(st, 'f_juling', k).cul, 'array'];
});
// 生财：被动灵石
L.addIncMul('f_shengcai', 48, st => { const k = L.zhenK(st, 'f_shengcai'); return k ? [`生财阵（聚灵阵 Lv${st.home.array}）`, 1 + L.zhenNum(st, 'f_shengcai', k).inc, 'array'] : null; });
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };
// 生财：出售价（market.js 的 L.sellParts）
wrap('sellParts', b => (st, k) => { const a = b(st, k), z = L.zhenK(st, 'f_shengcai'); if (z) a.push(['生财阵', 1 + L.zhenNum(st, 'f_shengcai', z).sell, 'mul']); return a; });
// 护山：坏访客、寻仇上门按概率挡在山门外（与巡山的灵宠各算各的）；宗门战事（天剑宗来犯、九宗会武）战力
wrap('spawnVisitor', b => st => {
  const ev = b(st), k = L.zhenK(st, 'f_hushan');
  if (!ev || !k || !(ev.karma !== undefined || (L.petBadVisitor && L.petBadVisitor(ev))) || R() >= L.zhenNum(st, 'f_hushan', k).bad) return ev;
  st.visitor = null; st.evLast[ev.id] = st.tick;
  st.stats.zhenGuard = (st.stats.zhenGuard || 0) + 1;
  L.log(st, `护山阵起了一层雾，门口的不速之客（${L.fill(st, ev.title)}）转了半天没找着门`, 'jade');
  return null;
});
L.addDuelMod('f_hushan', 17, (st, foe) => { const k = (foe.kind === 'war' || foe.kind === 'sect') && L.zhenK(st, 'f_hushan'); return k ? ['护山阵', L.zhenNum(st, 'f_hushan', k).war, 'array'] : null; });
// 丹火：成丹率与品质（alchemy.js 的 L.alchRate；品质借 arts.js 的 L.artAlchQual 那一项，alchemy.js 里“上品以上”加的就是它）
wrap('alchRate', b => st => { const k = L.zhenK(st, 'f_danhuo'); return k ? clamp(b(st) + L.zhenNum(st, 'f_danhuo', k).alch, 0.1, 0.97) : b(st); });
wrap('artAlchQual', b => st => { const k = L.zhenK(st, 'f_danhuo'); return b(st) + (k ? L.zhenNum(st, 'f_danhuo', k).q : 0); });
// 锻魂：功法熟练（arts.js 的 L.artRate）
wrap('artRate', b => st => { const k = L.zhenK(st, 'f_duanhun'); return b(st) * (k ? 1 + L.zhenNum(st, 'f_duanhun', k).mast : 1); });
// 迷踪：访客少、奇遇把握、秘境陷阱减半（realm.js 的 L.mjTrapHalf 原来看“有没有阵图”，现在要布着）
wrap('calVisitMult', b => st => { const k = L.zhenK(st, 'f_mizong'); return b(st) * (k ? L.zhenNum(st, 'f_mizong', k).visit : 1); });
wrap('choiceLuck', b => st => { const k = L.zhenK(st, 'f_mizong'); return b(st) + (k ? L.zhenNum(st, 'f_mizong', k).luck : 0); });
L.mjTrapHalf = st => (ON() ? L.zhenK(st, 'f_mizong') > 0 : !!(st.gear && st.gear.zhentu && st.gear.zhentu.f_mizong));
// 得到阵图时的那句话：写上布了能干什么（gear.js 的 L.givePlan 原来写“阵法上线后可用”）
wrap('givePlan', b => (st, id) => {
  if (!Z[id] || !ON()) return b(st, id);
  const had = L.zhenOwned(st, id);
  b(st, id);
  if (had) return `阵图《${L.zhenName(id)}》已有`;
  L.log(st, `得到阵图《${L.zhenName(id)}》：${L.zhenEffect(st, id)}`, 'gold');
  emit('zhentu', id);
  return `得到阵图《${L.zhenName(id)}》（【洞府】聚灵阵上布阵：${L.zhenEffect(st, id)}）`;
});
// 别的线要发阵图时用（宗门执法长老、宝库……）
L.zhenGive = (st, id) => L.givePlan(st, id);

// ---------- 事件能力：切阵出岔子（home_formation_fail）；formation_boost 阵势 +20%（12 月）、formation_redo 再多布 3 月 ----------
L.supportTrigger('formation_fail');
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of [].concat(v)) {
    if (f !== 'formation_boost' && f !== 'formation_redo') continue;
    delete st.eflags[f];
    const z = zs(st), i = st.home.zlast || 0, s = z[i], id = s.nx || s.id;
    if (!id) continue;
    if (f === 'formation_boost') { const from = s.nx ? s.at : st.tick; st.home.zboost = { id, until: from + L.ZV.boostLen }; out.push(`${L.zhenName(id)}阵势 +${Math.round(L.ZV.boost * 100)}%（生效后 ${L.ZV.boostLen} 月）`); }
    else if (s.nx) { s.at = Math.max(s.at, st.tick) + L.ZV.switch; out.push(`${L.zhenName(id)}要再布 ${L.ZV.switch} 月（${Math.max(1, s.at - st.tick)} 月后生效）`); }
    else { s.nx = s.id; s.id = ''; s.at = st.tick + L.ZV.switch; out.push(`${L.zhenName(id)}撤了重布，${L.ZV.switch} 月后生效`); }
  }
} });
});
