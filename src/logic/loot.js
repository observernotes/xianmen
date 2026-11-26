/* 废柴仙途 · 逻辑模块 loot：刷宝——归途翻牌、掉落表与地点图鉴、心愿、保底、首领掉落（docs/COMBAT_LOOT.md §5、§5.6、§5.7；接口见该文末“接口”一节）
 * 模块写法见 src/logic.js 顶部说明。排在 expedition 后面（读 L.REGIONS、L.rec、L.BOSSES；C1 的怪物表 L.CELL_FOES 在的话读它的招牌与灵核）。
 *
 *   L.tripLoot(st, trip) → cards：一趟历练归来时调（C1 的“归途”节点；C1 没接上之前由 expedition.js 的 L.resolveExp 调）。算牌数、每张的内容、保底、心愿，
 *     并且直接发放（法宝进 st.gear.pend 或直接戴上、功法进 st.arts、灵核 / 器纹石进 st.mats、灵矿灵草丹药入库），返回按价值从低到高排好的牌：
 *     cards[i] = { kind: 'gear'|'art'|'frag'|'core'|'ore'|'pill'|'herb'|'treasure'|'rune'|'plan'|'mat', item, tier, stars, el, gold, n, name, wish, sig, slot, first, value }
 *     trip = { k, d, a, rating, won, eliteWin, eliteId, eliteEl, boss, bossFirst, treasure（宝节点数）, seq（第一世第几趟）, must（第一章保底）, recall, deeper（'win'|'lose'，趁势深入） }
 *   L.bossLoot(st, k, first) → cards：首领首杀 3 张固定（专属 ★★、功法、器方）、再战 1 张（35%，第 3 次必出专属；星另掷）
 *   掉落表 L.dropTable(st, k, d)：每个地点 × 深度一行（外围 / 腹地 4 格，禁地 5 格）：本地兵器、本地招牌、本地灵核、稀有功法、首领专属；
 *     掉过的记进图鉴 st.meta.drop['k_d']（位掩码，跨世保留）。
 *   心愿 st.wish = { k, d, i, n }：钉一格，掉率 ×2，第 8 趟（第一章 5 趟）还没出就必出；同一时刻只能钉一件。
 *   保底计数：st.gear.pity = { star, tm }（gear.js 的 L.rollStar）、st.gear.sigN['k_d']（精英连赢几次没出招牌）、st.gear.bossRe[k]（首领再战几次没出专属）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, pick, wpick, clamp, emit } = L.U;

// ---------- 存档字段 ----------
{ const nm = L.newMeta; L.newMeta = () => Object.assign(nm(), { drop: {} }); }
{ const ns = L.newState; L.newState = function (o) { const st = ns(o); L.matsOf(st); st.wish = null; if (st.meta && !st.meta.drop) st.meta.drop = {}; return st; }; }

// ---------- 每一格的精英五行、灵核、招牌（C1 的 L.CELL_FOES 在就读它；没有时用下面的兜底：第一章照 §7.2，其余按地图五行推） ----------
const KE_OF = el => L.ELEM_KEYS.find(x => L.elKe(el, x)) || '';      // el 克的那一系
const SHENG_OF = el => L.ELEM_KEYS.find(x => L.elSheng(el, x)) || '';
const KE_BY = el => L.ELEM_KEYS.find(x => L.elKe(x, el)) || '';      // 克 el 的那一系
const CH1 = {   // 兜底（C1 合并后以 L.CELL_FOES 为准）
  '0_0': { el: 'mu', sig: { kind: 'art', id: 'z_qingteng', alt: ['z_huichun'] }, elite: '老藤王' },
  '0_1': { el: 'tu', sig: { kind: 'art', id: 'z_wuxing' }, elite: '铁背熊', rare: 'z_liuyun' },
  '0_2': { el: 'huo', sig: { kind: 'art', id: 'z_liaoyuan', alt: ['z_liehuo'] }, elite: '赤瞳头狼' },
  '1_0': { el: 'jin', sig: { kind: 'gear', base: 'w1_2', el: 'jin', star: 1 }, elite: '刀疤头目' },
};
// 某五行、某阶附近的一门战技（招牌兜底）：同系掉落池里阶最接近的
function zhanOf(el, t) {
  const c = L.ARTL.filter(A => A.k === 'z' && (A.pool === 'drop' || A.pool === 'mo') && A.el === el);
  if (!c.length) return null;
  return c.sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0].id;
}
const artOk = id => !!(id && L.art(id));
L.gearTierAt = (k, d) => clamp(1 + Math.floor((3 * k + (d || 0)) * 0.21), 1, 7);
L.artTierAt = (k, d) => clamp(1 + Math.floor((3 * k + (d || 0)) * 0.18), 1, 6);
L.cellInfo = function (k, d) {
  const key = k + '_' + d, cf = L.CELL_FOES && L.CELL_FOES[k] && L.CELL_FOES[k][d];
  const F = cf && L.FOES ? L.FOES[cf.elite] : null;
  const fb = CH1[key];
  const base = (L.REGIONS[k] && L.REGIONS[k].el) || L.ELEM_KEYS[(k + d) % 5];
  const el = (F && F.el) || (cf && cf.core) || (fb && fb.el) || [base, KE_OF(base), SHENG_OF(base)][d] || base;
  const core = (cf && cf.core) || el;
  let sig = (cf && cf.sig) || (fb && fb.sig) || null;
  if (!sig) {
    if (d === 1 && zhanOf(el, L.artTierAt(k, d))) sig = { kind: 'art', id: zhanOf(el, L.artTierAt(k, d)) };
    else { const t = clamp(L.gearTierAt(k, d) + (d === 2 ? 1 : 0), 1, 7); sig = { kind: 'gear', base: weaponOf(t, el), el, star: 1 }; }
  }
  if (sig.kind === 'art' && !artOk(sig.id)) {   // 招牌功法还没进 L.ARTL（C1 的新战技）：换同系最接近的一门
    const alt = (sig.alt || []).find(artOk) || zhanOf(el, L.artTierAt(k, d)) || zhanOf(core, 1);
    sig = alt ? Object.assign({}, sig, { id: alt }) : null;
  }
  if (!sig) { const t = clamp(L.gearTierAt(k, d) + (d === 2 ? 1 : 0), 1, 7); sig = { kind: 'gear', base: weaponOf(t, el), el, star: 1 }; }   // 这一系没有可掉的战技：招牌换成一件固定五行的兵器
  return { k, d, el, core, sig, elite: (F && F.n) || (fb && fb.elite) || '', rare: fb && fb.rare };
};
// 某阶里五行为 el 的一件兵器（没有就按序号取一件）
function weaponOf(t, el, salt) {
  const names = L.WEAPONS[t].names, i = names.findIndex((n, j) => (L.gearBase(`w${t}_${j}`) || {}).el === el);
  return `w${t}_${i >= 0 ? i : (salt || 0) % names.length}`;
}
// 本地兵器：这一格阶的、克这一格精英的那一系（第一章：外围精钢剑克木、腹地铁木棍克土）
L.localWeapon = function (k, d) { const info = L.cellInfo(k, d); return weaponOf(L.gearTierAt(k, d), KE_BY(info.el), k + d); };

// ---------- 掉落表（出发页“这里掉什么”、图鉴“掉落”页） ----------
L.DROP_N = d => (d === 2 ? 5 : 4);
L.dropTable = function (st, k, d) {
  const info = L.cellInfo(k, d), key = k + '_' + d, seen = (st && st.meta && st.meta.drop && st.meta.drop[key]) || 0;
  const tW = L.gearTierAt(k, d), tA = L.artTierAt(k, d), out = [];
  const lb = L.localWeapon(k, d), LB = L.gearBase(lb);
  out.push({ i: 0, kind: 'gear', base: lb, tier: tW, el: LB.el, n: LB.n, d: `本地兵器 · ${L.WEAPONS[tW].n}，星随机`, who: '翻牌', every: 6 });
  const sg = info.sig;
  if (sg.kind === 'art') { const A = L.art(sg.id); out.push({ i: 1, kind: 'art', art: sg.id, tier: A ? A.t : 1, el: A ? A.el : info.el, n: A ? A.n : '？', d: `本地招牌 · ${A && L.ART_CAT ? L.ART_CAT[A.k] || '' : ''}`, who: `精英${info.elite ? '「' + info.elite + '」' : ''}`, every: 3, sig: true }); }
  else { const B = L.gearBase(sg.base); out.push({ i: 1, kind: 'gear', base: sg.base, tier: B.t, el: sg.el || B.el, star: sg.star, n: B.n, d: `本地招牌 · ${L.ELEM[sg.el || B.el] || ''}系兵器`, who: `精英${info.elite ? '「' + info.elite + '」' : ''}`, every: 3, sig: true }); }
  out.push({ i: 2, kind: 'core', el: info.core, tier: 2, n: `${L.ELEM[info.core]}灵核`, d: '三枚淬灵一次', who: '精英、翻牌', every: 1 });
  const rid = info.rare && artOk(info.rare) ? info.rare : null, RA = rid ? L.art(rid) : null;
  out.push({ i: 3, kind: 'art', art: rid, tier: RA ? RA.t : Math.min(6, tA + 1), n: RA ? RA.n : `${L.artTierName(Math.min(6, tA + 1))}功法`, d: RA ? `${L.artTierName(RA.t)}${L.ART_CAT[RA.k]}` : '稀有功法或残篇', who: '翻牌', every: 12, rare: true });
  if (d === 2 && L.BOSSES[k]) { const B = L.gearBase('b' + k); out.push({ i: 4, kind: 'gear', base: 'b' + k, tier: B.t, el: B.el, star: 2, n: B.n, d: `首领专属`, who: `首领「${L.BOSSES[k].n}」`, every: 1, boss: true }); }
  for (const c of out) { c.seen = !!(seen & (1 << c.i)); c.wish = !!(st && st.wish && st.wish.k === k && st.wish.d === d && st.wish.i === c.i); }
  return out;
};
L.dropSeenN = (st, k, d) => L.dropTable(st, k, d).filter(c => c.seen).length;
function markSeen(st, k, d, i) {
  if (!st.meta.drop) st.meta.drop = {};
  const key = k + '_' + d, v = st.meta.drop[key] || 0, b = 1 << i;
  if (v & b) return false;
  st.meta.drop[key] = v | b;
  emit('dropSeen', { k, d, i });
  return true;
}

// ---------- 心愿 ----------
L.WISH = { n: 8, ch1: 5, mul: 2 };
L.wishLimit = st => (st && st.rebirth === 0 && !st.pact ? L.WISH.ch1 : L.WISH.n);
// 开：历练 ≥ 4 趟，且图鉴里有没掉过的格（§7.4）；钉过就一直开
L.wishOpen = st => !!st && (st.rebirth > 0 || (st.stats.exp || 0) >= 4 || !!st.wish || (st.stats.wishSet || 0) > 0);
L.setWish = function (st, k, d, i) {
  if (k === null || k === undefined) { st.wish = null; return null; }
  const row = L.dropTable(st, k, d), c = row[i];
  if (!c) return null;
  if (st.wish && st.wish.k === k && st.wish.d === d && st.wish.i === i) return st.wish;
  st.wish = { k, d, i, n: 0 };
  st.stats.wishSet = (st.stats.wishSet || 0) + 1;
  return st.wish;
};
L.wishInfo = function (st) {
  const w = st.wish; if (!w) return null;
  const c = L.dropTable(st, w.k, w.d)[w.i]; if (!c) return null;
  return { k: w.k, d: w.d, i: w.i, n: w.n, max: c.boss ? 3 : L.wishLimit(st), c };
};

// ---------- 一趟能翻几张牌（§5.4）与每张的内容 ----------
// 评价 丁 1（每趟至少 1 张）/ 丙 1 / 乙 2 / 甲 3 / 天 4；打赢精英 +1（招牌 40% / 灵核 60%，钉了招牌 80%）；寻宝 +1、宝节点各 +1；趁势深入赢了 +2；上限 6
L.LOOT = { rate: [1, 1, 2, 3, 4], cap: 6, w: { gear: 30, art: 12, core: 18, ore: 20, cons: 20 }, sig: 0.4, sigWish: 0.8, sigPity: 3, bossRe: 0.35, bossPity: 3, upTier: 0.15, rare: 0.25, deeperStar: 1.5 };
const TIER_V = { ore: 3, herb: 2, pill: 7, treasure: 14, rune: 8, mat: 12 };
function cardValue(c) {
  if (c.kind === 'gear') return 10 * c.tier + 4 * (c.stars || 0) + (c.gold ? 6 : 0) + (c.sig ? 2 : 0);
  if (c.kind === 'art' || c.kind === 'frag') return 10 * c.tier + 3 + (c.kind === 'art' && !(c.item && c.item.dup) ? 2 : 0);
  if (c.kind === 'core') return 9 + (c.n || 1);
  if (c.kind === 'plan') return 10 * (c.tier || 1) + 5;
  return TIER_V[c.kind] || 1;
}
function gearCard(st, ctx, o) {
  const it = L.gearDrop(st, o.slot || 'w', o.tier || 1, { base: o.base, star: o.star, el: o.el, src: o.src || 'exp', k: ctx.k, d: ctx.d });
  const x = it.gear, B = L.gearBase(x.id);
  return { kind: 'gear', item: it, tier: x.t, stars: x.star || 0, el: L.gearEl(x), gold: x.gold || '', name: B.n, slot: o.slotI, sig: !!o.sig };
}
function artCard(st, ctx, id, o) {
  const it = L.giveArt(st, id, { src: (o && o.src) || 'exp', k: ctx.k, d: ctx.d });
  if (!it) return null;
  const A = L.art(id);
  return { kind: it.frag && !it.fragDone ? 'frag' : 'art', item: it, tier: A.t, el: A.el, name: A.n, slot: o && o.slotI, sig: !!(o && o.sig) };
}
function coreCard(st, el, n, slotI) { L.matsAdd(st, { core: { [el]: n } }); return { kind: 'core', el, n, tier: 2, name: `${L.ELEM[el]}灵核`, slot: slotI }; }
function resCard(st, ctx, kind) {
  const k = ctx.k, d = ctx.d;
  if (kind === 'ore') { const n = L.addOre(st, Math.max(3, Math.round(L.expOre(st, k, d, ctx.a, 1) * 0.8))); return { kind, n, tier: 1, name: '灵矿' }; }
  if (kind === 'herb') { const n = Math.round((2 + k) * (1 + 0.5 * d) * 2); st.herbs += n; return { kind, n, tier: 1, name: '灵草' }; }
  if (kind === 'pill') { st.pills += 1; return { kind, n: 1, tier: 2, name: '破境丹' }; }
  if (kind === 'treasure') { st.treasure += 1; return { kind, n: 1, tier: 4, name: '天材地宝' }; }
  if (kind === 'rune') { L.matsAdd(st, { rune: 1 }); return { kind, n: 1, tier: 3, name: '器纹石' }; }
  return null;
}
// 掉落表上第 i 格的东西（心愿、招牌保底、第一章脚本用）
function slotCard(st, ctx, i, opt) {
  const row = L.dropTable(st, ctx.k, ctx.d), c = row[i]; if (!c) return null;
  opt = opt || {};
  if (i === 2) return coreCard(st, c.el, 1, 2);
  if (c.kind === 'art') { const id = c.art || L.rollArt(st, c.tier, { k: ctx.k, d: ctx.d, src: 'exp' }); return artCard(st, ctx, id, { slotI: i, sig: c.sig }); }
  if (c.boss) return gearCard(st, ctx, { base: c.base, star: opt.star !== undefined ? opt.star : 2, slotI: 4, src: 'boss' });
  const star = c.sig && c.star !== undefined ? Math.max(c.star, L.rollStar(st, ctx.d, ctx.starMul, { noPity: true })) : L.rollStar(st, ctx.d, ctx.starMul);
  return gearCard(st, ctx, { base: c.base, star, el: c.sig ? c.el : undefined, slotI: i, sig: c.sig });
}
// 每张“评价牌”掷一次：先看心愿（这一格的那件 ×2：另加一次同样的机会），再按 法宝 30 / 功法 12 / 灵核 18 / 灵矿 20 / 丹草宝 20 抽
const slotP = (st, i) => [0.3 * 0.5 / Math.max(1, L.gearOpenSlots(st).length), 0, 0.18 * 0.7, 0.12 * L.LOOT.rare, 0][i] || 0;
function rateCard(st, ctx, info) {
  const gx = L.gearExp(st), W = L.LOOT.w, kind = wpick([['gear', W.gear * gx.item], ['art', W.art * gx.item], ['core', W.core], ['ore', W.ore], ['cons', W.cons]]);
  if (kind === 'gear') {
    const slot = L.gearPickSlot(st, ctx.k), t0 = L.gearTierAt(ctx.k, ctx.d), up = R() < L.LOOT.upTier;
    const tier = clamp(t0 + (up ? 1 : 0), 1, L.GEAR_TMAX[slot] || 7);
    const local = slot === 'w' && !up && R() < 0.5;
    return gearCard(st, ctx, { slot, tier, base: local ? L.localWeapon(ctx.k, ctx.d) : undefined, star: L.rollStar(st, ctx.d, ctx.starMul), slotI: local ? 0 : undefined });
  }
  if (kind === 'art') {
    const rare = R() < L.LOOT.rare, t = L.artTierAt(ctx.k, ctx.d) + (rare ? 1 : 0);
    const id = rare && info.rare && artOk(info.rare) && R() < 0.5 ? info.rare : L.rollArt(st, t, { k: ctx.k, d: ctx.d, src: 'exp' });
    return artCard(st, ctx, id, { slotI: rare ? 3 : undefined });
  }
  if (kind === 'core') { const el = R() < 0.7 ? info.core : pick(L.CORE_EL); return coreCard(st, el, 1, el === info.core ? 2 : undefined); }
  if (kind === 'ore') return resCard(st, ctx, 'ore');
  const r = R();
  return resCard(st, ctx, r < 0.6 ? 'herb' : r < 0.92 ? 'pill' : 'treasure');
}
// 第一章保底（§5.6 / §7.3；C1 的 trip.must 优先）：第 1 趟精钢剑、第 2 趟《裂金斩》、第 3 趟第一件 ★
function defaultMust(st, trip) {
  if (st.rebirth > 0) return [];
  const n = trip.seq;
  if (n === 1) return [{ kind: 'gear', base: 'w1_0' }];
  if (n === 2) { const id = ['z_liejin', 'z_wuxing', 'z_liuyun'].find(a => artOk(a) && !L.artOwned(st, a)); return id ? [{ kind: 'art', id }] : []; }
  if (n === 3) return [{ kind: 'gear', minStar: 1 }];
  return [];
}
function mustCard(st, ctx, m) {
  if (m.kind === 'art') return artOk(m.id) ? artCard(st, ctx, m.id, {}) : null;
  if (m.kind === 'gear') {
    if (m.base) { const B = L.gearBase(m.base); if (!B) return null; return gearCard(st, ctx, { base: m.base, star: m.star !== undefined ? m.star : 0, el: m.el, slotI: m.base === L.localWeapon(ctx.k, ctx.d) ? 0 : undefined }); }
    const lb = L.localWeapon(ctx.k, ctx.d);
    return gearCard(st, ctx, { base: lb, star: L.rollStar(st, ctx.d, ctx.starMul, { minStar: m.minStar || 0 }), slotI: 0 });
  }
  if (m.kind === 'core') return coreCard(st, m.el, m.n || 1);
  return null;
}
L.tripCardN = function (trip) {
  const r = trip.recall ? Math.min(1, trip.rating | 0) : clamp(trip.rating | 0, 0, 4);
  const n = { rate: L.LOOT.rate[r], elite: trip.eliteWin && !trip.recall ? 1 : 0, seek: trip.a === 1 && !trip.recall && r >= 1 ? 1 : 0, node: trip.recall ? 0 : trip.treasure | 0, deeper: trip.deeper === 'win' ? 2 : 0 };
  n.total = Math.min(L.LOOT.cap, n.rate + n.elite + n.seek + n.node + n.deeper);
  return n;
};
L.tripLoot = function (st, trip) {
  trip = trip || {};
  const k = trip.k | 0, d = trip.d | 0, a = trip.a | 0, key = k + '_' + d, info = L.cellInfo(k, d);
  const ctx = { k, d, a, starMul: (a === 1 ? L.STAR.seek : 1) * (trip.deeper === 'win' ? L.LOOT.deeperStar : 1) };
  if (trip.seq === undefined) trip.seq = (st.stats.exp || 0);
  const N = L.tripCardN(trip);
  const cards = [], push = c => { if (c) cards.push(c); };
  let left = N.total;
  // 心愿：这一格的（首领那格另算，见 L.bossLoot）
  const w = st.wish && st.wish.k === k && st.wish.d === d && st.wish.i !== 4 ? st.wish : null;
  let wishHit = false;
  const take = c => { if (!c) return; if (w && c.slot === w.i) { c.wish = true; wishHit = true; } push(c); };
  // ① 第一章保底脚本
  const must = Array.isArray(trip.must) ? trip.must : defaultMust(st, trip);
  for (const m of must) { if (left <= 0) break; const c = mustCard(st, ctx, m); if (c) { c.must = true; take(c); left--; } }
  // ② 首领（历练里的首领节点）
  if (trip.boss && !trip.recall) for (const c of L.bossLoot(st, k, !!trip.bossFirst, { inTrip: true })) { take(c); left--; }
  // ③ 心愿到期：这一趟必出
  if (w && !wishHit && left > 0 && w.n + 1 >= L.wishLimit(st)) { take(slotCard(st, ctx, w.i)); left--; }
  // ④ 精英牌：招牌 / 灵核（招牌保底：同一格连赢 3 次没出 → 第 4 次必出）
  if (N.elite && left > 0) {
    const g = st.gear; if (!g.sigN) g.sigN = {};
    const pSig = w && w.i === 1 && !wishHit ? L.LOOT.sigWish : L.LOOT.sig;
    const sigNow = (g.sigN[key] || 0) >= L.LOOT.sigPity || R() < pSig;
    const c = sigNow ? slotCard(st, ctx, 1) : coreCard(st, info.core, 1, 2);
    if (c) { c.src = 'elite'; take(c); left--; }
    if (cards.some(x => x.slot === 1)) g.sigN[key] = 0; else g.sigN[key] = (g.sigN[key] || 0) + 1;
  }
  // ⑤ 其余的牌（评价、寻宝、宝节点、趁势深入）
  while (left > 0) {
    let c = null;
    if (w && !wishHit && R() < slotP(st, w.i)) c = slotCard(st, ctx, w.i);
    if (!c) c = rateCard(st, ctx, info);
    take(c); left--;
  }
  if (!cards.length) push(resCard(st, ctx, 'ore'));   // 每趟至少 1 张
  // 记图鉴、心愿进度、星数统计
  for (const c of cards) {
    if (c.slot !== undefined) c.first = markSeen(st, k, d, c.slot);
    c.value = cardValue(c);
    if (c.kind === 'gear') { st.stats.lootGear = (st.stats.lootGear || 0) + 1; if (c.stars >= 2) st.stats.loot2 = (st.stats.loot2 || 0) + 1; if (c.stars >= 3) st.stats.loot3 = (st.stats.loot3 || 0) + 1; }
  }
  if (w) {
    if (wishHit) { st.stats.wishHit = (st.stats.wishHit || 0) + 1; st.wishDone = { k, d, i: w.i, at: st.tick }; st.wish = null; }
    else w.n++;
  }
  cards.sort((x, y) => x.value - y.value);
  cards.wishHit = wishHit;
  cards.n = N;
  emit('tripLoot', cards);
  return cards;
};
// 趁势深入输了：牌丢一半（按价值从高到低隔一张丢，丢掉的法宝熔掉、功法不收回——发放已经发生，只收回能收回的：法宝熔成灵矿）
L.lootHalve = function (st, cards) {
  const keep = [], lost = [];
  cards.slice().sort((x, y) => y.value - x.value).forEach((c, i) => (i % 2 ? lost : keep).push(c));
  for (const c of lost) if (c.kind === 'gear' && c.item && L.gearPend(st, c.item.u)) L.gearDecide(st, c.item.u, 'smelt');
  return keep.sort((x, y) => x.value - y.value);
};

// ---------- 首领（§5.6）：首杀 3 张固定（专属 ★★、功法、器方）；再战 35% 出专属（第 3 次必出，星另掷：★★ 60% / ★★★ 12% / 其余 ★），否则 2 枚它那一系的灵核 ----------
L.bossLoot = function (st, k, first, opt) {
  opt = opt || {};
  const ctx = { k, d: 2, a: 0, starMul: 1 }, out = [], el = L.BOSS_EL[k] || pick(L.CORE_EL);
  const w = st.wish && st.wish.k === k && st.wish.d === 2 && st.wish.i === 4 ? st.wish : null;
  const g = st.gear; if (!g.bossRe) g.bossRe = {};
  if (first) {
    const c = slotCard(st, ctx, 4, { star: 2 }); if (c) out.push(c);
    const aid = L.bossArt(st, k);
    if (aid) { const a = artCard(st, ctx, aid, { src: 'boss' }); if (a) out.push(a); }
    if (L.BOSS_PLAN[k] && !L.planOwned(st, L.BOSS_PLAN[k])) { const P = L.PLAN[L.BOSS_PLAN[k]]; const t = L.givePlan(st, P.id); out.push({ kind: 'plan', item: { plan: P.id, text: t }, tier: P.t, name: P.n, n: 1 }); }
    else out.push(coreCard(st, el, 2));
    L.matsAdd(st, { rune: 1 });
  } else {
    const n = (g.bossRe[k] || 0) + 1, p = L.LOOT.bossRe * (w ? L.WISH.mul : 1);
    if (n >= L.LOOT.bossPity || R() < p) {
      const r = R(), star = r < 0.12 ? 3 : r < 0.72 ? 2 : 1;
      const c = slotCard(st, ctx, 4, { star }); if (c) out.push(c);
      g.bossRe[k] = 0;
    } else { out.push(coreCard(st, el, 2)); g.bossRe[k] = n; }
    L.matsAdd(st, { rune: 1 });
  }
  for (const c of out) {
    if (c.slot !== undefined) c.first = markSeen(st, k, 2, c.slot);
    c.value = cardValue(c); c.src = 'boss';
    if (w && c.slot === 4) { c.wish = true; st.stats.wishHit = (st.stats.wishHit || 0) + 1; st.wishDone = { k, d: 2, i: 4, at: st.tick }; st.wish = null; }
  }
  if (w && st.wish === w) w.n++;
  if (!opt.inTrip) out.sort((x, y) => x.value - y.value);
  return out;
};
// ---------- 趁势深入（§5.7，P1）：三场全胜且气血 ≥ 50% 时，归途多一个【再深一层 +2 月】 ----------
// 不回家、气血不回、直接打下一个深度的精英：赢了多翻 2 张、星率 ×1.5；输了这一趟的牌丢一半。
// C1 的战斗流程接上之前（没有 L.battleNew）按战力比估一个胜率：0.5 + 0.55·log2(战力 / 下一层推荐 × 剩余气血)
L.deeperOk = (st, trip) => !!trip && !trip.recall && trip.rating >= 3 && (trip.hp === undefined || trip.hp >= 0.5) && trip.d < 2 && trip.a !== 2 && !st.exp && st.p.r <= L.MAXR;
L.deeperP = function (st, k, d, hp) {
  const r = L.power(st) / L.rec(k, Math.min(2, d + 1)) * (hp === undefined ? 0.75 : hp);
  return clamp(0.5 + 0.55 * Math.log2(Math.max(r, 1e-9)), 0.05, 0.95);
};
});
