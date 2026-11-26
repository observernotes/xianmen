/* 废柴仙途 · 逻辑模块 artrec：功法推荐的唯一口径（docs/SYSTEMS.md §2.6）
 * 模块写法见 src/logic.js 顶部说明。排在 advise 后面（读 L.adviseBigP）。
 *
 *   L.artRecommend(st, slot, ctx) → null | { id, cur, same, why, ctx, … }
 *     slot：0 心法 / 1 战技（秘术没有裸倍率，功法页仍按 L.artList 的阶与共鸣排）
 *     ctx：省略 = 平时（功法页“荐”、【人物】角标、老祖气泡、变强页与锦囊 / 备战卡的动作卡、掉落卡【换上】都用这个）；
 *          { k, d } = 指定某一格（近期大节点仍优先，{ k, d, force } 才只看这一格）；出发页不传 ctx，先 L.artRecSelect 选中这一格再问平时的推荐；{ foe, Q, scale, n } = 正要打的这个人（论道准备、新秀挑战、宿敌卡、约战）
 *     平时的情境（L.artCtx）按优先级取第一个成立的：
 *       1. 近期大节点：L.bigNext 还有 ≤ L.ART_REC.big 月、对手算得出（三年之约 / 论道第一场的宿敌 / 天剑来犯）→ 比对决胜算
 *       2. 历练图：最近打开出发页选中的那一格，或最近一次出发的那一格（L.artRecMap，存 st.flags.recMap，没有字段时退回 st.exp / lastExp）。精英（回合战）或地图（旧分数制）的五行见过才算克制
 *       3. 通用：战力与修炼（对数相加）
 *     情境只看“接下来要做的事”，和你装着哪一门无关，所以换上推荐的那门之后不会再推回去；
 *     同分时现在装着的优先（滞后：胜算差 < 0.5%、分数差 < 1%（心法 2%，换心法要转修）不换）。
 *   L.artCtx(st, ctx) → 规整后的情境 { kind: 'duel' | 'map' | 'gen', label, … }
 *   L.artRecWhy(st, id) → 这门是平时的推荐就给原因，否则 ''；L.artRecIf(st, id) 同上，没到手的按“拿到以后”算（秘境宝箱）
 * 不改存档，不消耗随机数（只用 L.artTry 试算）。
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
L.ART_REC = { big: 3, pEps: 0.005, mapEps: 0.01, zMin: 0.01, xMin: 0.02, ke: 0.45, bk: 0.3, mapV: 0.028 };
const pc = p => Math.round(p * 100) + '%';
const lg = v => Math.log(Math.max(1e-9, v));

// 一格的“对手五行”：回合战看这一格的精英，旧分数制看地图；没见过不算
function cellEl(st, k, d) {
  const R0 = L.REGIONS[k]; if (!R0) return { el: '', known: false };
  if (L.TRIP_ON !== false && L.cellFoes && L.FOES) {
    const row = L.cellFoes(k, d), F = row && L.FOES[row.elite];
    const el = F && F.el ? F.el : R0.el || '';
    return { el, known: !!el && (!!(F && st.meta && st.meta.foes && st.meta.foes[row.elite]) || L.elemKnown(st, k) && el === R0.el), elite: F ? F.n : '' };
  }
  return { el: R0.el || '', known: !!R0.el && L.elemKnown(st, k) };
}
function foeName(st, foe, n) {
  if (n) return n;
  if (!foe) return '';
  if (foe.kind === 'rival') return L.rivalName ? L.rivalName(st, foe.id) : foe.id;
  if (foe.kind === 'war') return '天剑宗';
  return '';
}
L.artCtx = function (st, ctx) {
  if (ctx && ctx.kind) return ctx;
  if (ctx && ctx.foe) {
    const fe = L.foeEl(ctx.foe), known = !!fe && (!L.foeElKnown || L.foeElKnown(st, ctx.foe));
    return { kind: 'duel', foe: ctx.foe, Q: ctx.Q, scale: ctx.scale || (S => S), fe: known ? fe : '', who: foeName(st, ctx.foe, ctx.n), label: ctx.label || '', left: ctx.left };
  }
  // 正要去的这一格：近期大节点优先（同一时刻只有一个答案），只有 force 时才只看这一格（出发页“克这一格的是哪门”的小字用）
  if (ctx && ctx.k !== undefined && !ctx.force) { const b = bigCtx(st); if (b) return Object.assign(b, { at: { k: ctx.k, d: ctx.d || 0 } }); }
  if (ctx && ctx.k !== undefined) {
    const c = cellEl(st, ctx.k, ctx.d || 0);
    return { kind: 'map', k: ctx.k, d: ctx.d || 0, fe: c.known ? c.el : '', here: !!ctx.here, label: ctx.here ? '这张图' : L.REGIONS[ctx.k].n + L.DEPTHS[ctx.d || 0] };
  }
  // 平时：1. 近期大节点
  const bc = bigCtx(st); if (bc) return bc;
  // 2. 正在走 / 上一趟的历练图
  const e = L.artRecMap(st);
  if (e && L.REGIONS[e.k]) return L.artCtx(st, { k: e.k, d: e.d || 0 });
  return { kind: 'gen', label: '' };
};
function bigCtx(st) {
  const b = L.bigNext && L.bigNext(st);
  if (!b || b.left > L.ART_REC.big || !L.adviseBigP) return null;
  // 论道第一场碰谁（L.tourFoe）看你的战力（宿敌战力 < 你的 1.6 倍才上台），会随装哪门战技变；
  // 这里一律按手里战力最高的那门算对手，情境就与装着哪门无关（否则换上推荐的那门，对手一变又推别的）
  let P = null;
  try {
    if (b.k === 'tour' && st.arts) {
      const zs = Object.keys(st.arts.own).filter(id => L.art(id) && L.art(id).k === 'z' && !(L.artSealed && L.artSealed(st, id)));
      let top = null, tp = -1; for (const id of zs) { const pw = L.artTry(st, id, () => L.power(st)); if (pw > tp + 1e-9 || (Math.abs(pw - tp) <= 1e-9 && id < top)) { tp = pw; top = id; } }
      P = top ? L.artTry(st, top, () => L.adviseBigP(st, b)) : L.adviseBigP(st, b);
    } else P = L.adviseBigP(st, b);
  } catch (e) { P = null; }
  if (!P || !P.foe) return null;
  const who = b.k === 'pact' ? st.exName : b.k === 'war' ? '天剑宗' : foeName(st, P.foe);
  return Object.assign(L.artCtx(st, { foe: P.foe, Q: P.Q, scale: P.scale, n: who }), { label: b.n, left: b.left, big: b.k });
}
// 推荐看的那一格：最近一次打开出发页选中的格（L.artRecSelect），或最近一次出发的格（L.startExp 时记下）；都没有时退回 st.exp / st.lastExp。
// 行动点制下历练是一下子走完的，没有“正在走”；出发页、功法页、变强页都看这同一格，所以同一时刻只有一个答案
L.artRecSelect = function (st, k, d) {
  if (!st || !st.flags || !L.REGIONS[k]) return;
  const m = st.flags.recMap;
  if (!m || m.k !== k || m.d !== (d || 0)) st.flags.recMap = { k, d: d || 0 };
};
L.artRecMap = st => (st.flags && st.flags.recMap) || st.exp || st.lastExp || null;
{ const f0 = L.startExp; L.startExp = function (st, k, d) { const ok = f0.apply(this, arguments); if (ok) L.artRecSelect(st, k, d || 0); return ok; }; }
const ctxKey = c => (c.kind === 'duel' ? `duel|${c.foe.kind}|${c.foe.id || ''}|${c.foe.k === undefined ? '' : c.foe.k}|${Math.round(c.Q || 0)}|${c.fe}` : c.kind === 'map' ? `map|${c.k}|${c.d}|${c.fe}` : 'gen');

// 一门（id 可为 null = 空着）在这个情境里的分：pri 主分（情境的目标），g 通用分（战力 + 修炼的对数；心法只看修炼）
function scoreOf(st, slot, id, c) {
  const run = fn => (id ? L.artTry(st, id, fn) : withEmpty(st, slot, fn));
  return run(() => {
    const pw = L.power(st), gb = L.gainBase(st);
    const g = slot === 0 ? lg(gb) : lg(pw) + lg(gb);
    let pri = g, p, ke = false, bk = false, me = '';
    if (slot === 1 && c.kind === 'duel') {
      p = L.duelP(st, c.scale(L.duelPower(st, c.foe)), c.Q, c.foe); pri = p;
      if (c.fe) { me = L.atkEl(st, c.fe); ke = L.elKe(me, c.fe); bk = L.elKe(c.fe, me); }
    } else if (slot === 1 && c.kind === 'map' && c.fe) {
      me = L.atkEl(st, c.fe); ke = L.elKe(me, c.fe); bk = L.elKe(c.fe, me);
      if (L.TRIP_ON !== false) pri = g + (ke ? L.ART_REC.ke : bk ? -L.ART_REC.bk : 0);
      else pri = g + L.expElem(st, c.k).v * L.ART_REC.mapV;
    }
    return { id, pri, g, p, pw, gb, ke, bk, me };
  });
}
function withEmpty(st, slot, fn) { const a = st.arts, prev = a.slot[slot]; a.slot[slot] = null; try { return fn(); } finally { a.slot[slot] = prev; } }

let cache = { st: null, key: '', v: {} };
L.artRecommend = function (st, slot, ctx) {
  if (!st || !st.arts || L.ARTS_ON === false || (slot !== 0 && slot !== 1) || !L.artSlotOpen(st, slot)) return null;
  const c = L.artCtx(st, ctx);
  const k = L.ART_SLOTS[slot], cur = L.artSlots(st)[slot];
  const own = Object.keys(st.arts.own).filter(id => L.art(id) && L.art(id).k === k && !(L.artSealed && L.artSealed(st, id)));
  const base = (L.adviseKey ? L.adviseKey(st) : st.tick) + '|' + own.map(id => id + L.artLv(st, id)).join() + '|' + L.artSlots(st).join() + '|' + (st.trialEl || '') + '|' + JSON.stringify(L.artRecMap(st)), key = slot + '|' + ctxKey(c);
  if (cache.st !== st || cache.key !== base) cache = { st, key: base, v: {} };
  if (key in cache.v) return cache.v[key];
  const rows = own.map(id => scoreOf(st, slot, id, c));
  const curRow = rows.find(r => r.id === cur) || scoreOf(st, slot, null, c);
  if (!rows.length) { cache.v[key] = null; return null; }
  // 主分最高的一档（差 eps 以内算同档），档里比通用分；现在装着的在档里、通用分差不到 gMin 就不换
  const eps = slot === 1 && c.kind === 'duel' ? L.ART_REC.pEps : slot === 1 && c.kind === 'map' && c.fe ? L.ART_REC.mapEps : 0;
  const gMin = slot === 0 ? L.ART_REC.xMin : L.ART_REC.zMin;
  const top = Math.max(...rows.map(r => r.pri), curRow.pri);
  const band = rows.filter(r => r.pri >= top - eps - 1e-12);
  band.sort((a, b) => b.g - a.g || L.art(b.id).t - L.art(a.id).t || (a.id < b.id ? -1 : 1));
  let pick = band[0];
  const curIn = cur && curRow.pri >= top - eps - 1e-12;
  if (curIn && (c.kind === 'duel' && slot === 1 || curRow.g >= pick.g - gMin)) pick = curRow;   // 对决：胜算同档就不换（与论道准备页、新秀挑战的 0.5% 门槛一致）
  else if (!curIn && cur && eps === 0 && pick.pri - curRow.pri < gMin) pick = curRow;   // 通用 / 不知五行：分数差不到门槛不换
  const same = !cur ? false : pick.id === cur;
  const v = { id: pick.id, cur, same, slot, ctx: c, kind: c.kind, why: same ? '' : whyOf(st, slot, c, pick, curRow), p0: curRow.p, p1: pick.p, pw0: curRow.pw, pw1: pick.pw, g0: curRow.gb, g1: pick.gb, ke: pick.ke, ke0: curRow.ke, bk0: curRow.bk, me: pick.me, me0: curRow.me, fe: c.fe || '' };
  cache.v[key] = v;
  return v;
};
// 原因（一句，≤ 16 字左右）：克谁 / 胜算 / 战力 / 修炼
function whyOf(st, slot, c, a, b) {
  if (slot === 0) return `修炼 +${L.fmt1(a.gb - b.gb)}/月`;
  const el = L.elName;
  if (c.kind === 'duel') {
    const who = c.label ? `${c.label}的${c.who}` : c.who;
    if (c.fe && a.ke) return `克${who}（${el(c.fe)}）`;
    if (c.fe && b.bk && !a.bk) return `不被${who}（${el(c.fe)}）克`;
    if (a.p - b.p >= L.ART_REC.pEps) return `${c.label || who}胜算 ${pc(b.p)} → ${pc(a.p)}`;
  }
  if (c.kind === 'map' && c.fe && (a.ke || (b.bk && !a.bk))) return a.ke ? `克${c.label}（${el(c.fe)}）` : `不被${c.label}（${el(c.fe)}）克`;
  if (a.pw > b.pw * 1.0005) return `战力更高 +${L.fmt(a.pw - b.pw)}`;
  return `修炼 +${L.fmt1(a.gb - b.gb)}/月`;
}
// 还没到手的一门：拿到以后会不会是平时的推荐（秘境宝箱“拿了就能换上”用，与之后掉落卡的【换上】一致）
L.artRecIf = function (st, id) {
  if (!st || !st.arts || L.artOwned(st, id)) return L.artRecWhy(st, id);
  st.arts.own[id] = 0;
  try { return L.artRecWhy(st, id); } finally { delete st.arts.own[id]; }
};
L.artRecWhy = function (st, id) {
  const A = L.art(id); if (!A || A.k === 'm') return '';
  const r = L.artRecommend(st, A.k === 'x' ? 0 : 1);
  return r && !r.same && r.id === id ? r.why : '';
};
});
