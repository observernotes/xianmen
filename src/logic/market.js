/* 废柴仙途 · 逻辑模块 market：坊市与拍卖会
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 坊市：价格 = base × 2.6^r
L.MARKET = [
  { k: 'pill', n: '破境丹', d: '突破时服用，每枚成功率 +15%（一次最多三枚）；负伤时可服一枚疗伤', base: 60 },
  { k: 'life', n: '延寿丹', d: '寿元 +10%，每个大境界最多服用三枚', base: 250, minR: 1 },
  { k: 'box', n: '寻宝', d: '随机得到一件法宝或一门具体的功法（已会的熟练 +20）；连续两次没提升，第三次必出更高一阶', base: 150 },
  { k: 'egg', n: '灵兽蛋', d: '孵化一只灵宠，品阶随机', base: 400, minR: 1 },
  // TODO SYSTEMS §10：坊市货架上线后，灵矿挪进轮换货架（行情随大势浮动）
  { k: 'ore', n: '灵矿一筐', d: '强化、打造用；每届论道（12 周天）最多三筐', base: 50, gear: 'plus' },
];
L.price = (st, k) => Math.floor(L.MARKET.find(m => m.k === k).base * Math.pow(2.6, Math.min(st.p.r, 8)));
L.marketOpen = (st, k) => { const m = L.MARKET.find(x => x.k === k); if (m.gear) return L.gearOpen(st, m.gear); return !m.minR || st.p.r >= m.minR || (st.flags.maxR || 0) >= m.minR; };
// 一筐 = 10 × L.oreUnit（1.5^境界）；本届还能买几筐
L.ORE_BUY = { n: 10, per: 3 };
L.oreBasket = st => L.ORE_BUY.n * L.oreUnit(st);
L.oreBuyLeft = st => { const b = st.gear.oreBuy, cyc = Math.floor(st.tick / L.TOUR_EVERY); return L.ORE_BUY.per - (b && b.cyc === cyc ? b.n : 0); };

// 寻宝保底（和拍卖）能补到的最高阶：L.BOX_CAP + 境界（法宝至多 7 阶、功法至多 6 阶）。
// v1 写的是 2 + r；寻宝便宜、拍卖每 24 周天一次，按 2 算时功法化神就满、法宝炼虚就满，改 1（tools/sim.js 校准）
// 功法按阶抽一门具体的（arts.js 的 L.rollArt）；保底给最落后的已开槽补高一阶的一门（L.artPity）。
// 法宝：随机给一件开了的槽（按阶抽一件，带词条，走对比卡）；保底给最弱的一槽补下一阶（L.gearWeakest / L.gearNextTier）
L.BOX_CAP = 1;
// 某槽的下一阶（饰品只有 2 / 4 / 6）；cap 封顶，返回 0 表示补不了
L.gearNextTier = (slot, t, cap) => { const n = slot === 'o' ? (t < 2 ? 2 : t < 4 ? 4 : 6) : t + 1; return n > t && n <= Math.min(cap === undefined ? 7 : cap, L.GEAR_TMAX[slot]) ? n : 0; };
L.gearPity = st => { const wk = L.gearWeakest(st), n = L.gearNextTier(wk.s, wk.t, L.boxCap(st, 'w')); return n ? { s: wk.s, t: n, from: wk.t } : null; };
L.boxCap = (st, kind) => Math.min(kind === 'w' ? 7 : 6, L.BOX_CAP + Math.min(st.p.r, 8));
L.buy = function (st, k) {
  if (!L.marketOpen(st, k)) return null;
  const c = L.price(st, k);
  if (st.stones < c) return null;
  const r = Math.min(st.p.r, 8), p = st.p;
  if (k === 'life') {
    const used = st.lifePills[r] || 0;
    if (used >= 3) return null;
    st.lifePills[r] = used + 1;
    const add = Math.floor(L.REALMS[r].life * 0.1);
    st.lifeBonus += add;
    st.stones -= c; st.flags.spentAt = st.tick;
    L.log(st, `服下延寿丹，寿元增加 ${add} 年`, 'jade');
    return { k, add };
  }
  st.stones -= c; st.flags.spentAt = st.tick;
  if (k === 'pill') { st.pills++; return { k }; }
  if (k === 'ore') {
    if (L.oreBuyLeft(st) <= 0) { st.stones += c; return null; }
    const cyc = Math.floor(st.tick / L.TOUR_EVERY), b = st.gear.oreBuy;
    st.gear.oreBuy = { cyc, n: (b && b.cyc === cyc ? b.n : 0) + 1 };
    const n = L.addOre(st, L.oreBasket(st));
    L.log(st, `坊市买下一筐灵矿：+${L.fmt(n)}`);
    return { k, ore: n };
  }
  if (k === 'box') {
    // 第一次寻宝保底《引气诀》；连续两次没带来提升，第三次必得“最弱一槽的下一阶法宝”或高一阶的功法（上限见 L.boxCap）
    const capA = L.boxCap(st, 'a'), pityArt = L.artPity(st, capA), pg = L.gearPity(st);
    let it;
    if (!st.arts.firstBox) it = L.giveItem(st, 'a', 1, undefined, { src: 'box' });
    else if ((st.boxMiss || 0) >= 2 && (pg || pityArt)) {
      const kind = pg && (!pityArt || pg.from <= L.artBestTier(st)) ? 'g' : 'a';
      it = kind === 'g' ? L.gearDrop(st, pg.s, pg.t, { src: 'box' }) : L.giveArt(st, pityArt, { src: 'box' }); it.pity = true;
    } else {
      const kind = R() < 0.55 ? 'g' : 'a';
      it = L.giveItem(st, kind, L.rollTier(st, 1 + Math.floor(r * (kind === 'g' ? 0.75 : 0.6)), kind === 'g' ? 7 : 6), undefined, { src: 'box' });
    }
    st.boxMiss = it.equip || it.better ? 0 : (st.boxMiss || 0) + 1;
    L.checkQuests(st);
    return { k, it };
  }
  if (k === 'egg') {
    const it = L.giveItem(st, 'pet', L.rollTier(st, 1 + Math.floor(r * 0.6), 6));
    L.checkQuests(st);
    return { k, it };
  }
  return null;
};

// 拍卖会（金丹解锁）：每 24 周天一次，开 6 周天，三件一口价的拍品，各约 20 周天的收入
L.AUCTION = { every: 24, at: 8, len: 6, price: 20 };
L.auctionOpen = st => !!st.auction && st.tick < st.auction.until;
L.rollAuction = rollAuction;
function rollAuction(st) {
  const p = st.p, inc = Math.max(L.income(st), 20), pool = [];
  // 最弱一槽的下一阶法宝、一门具体的功法，但不超过本境界的寻宝上限（L.boxCap），免得拍卖把装备拉到境界前头
  const pg = L.gearPity(st);
  if (pg) pool.push({ k: 'g', slot: pg.s, tier: pg.t, n: `${L.gearTierName(pg.s, pg.t)}${L.GEAR_N[pg.s]}一件`, m: 1.2 });
  // 器方：赤炎双刃（拍卖）；秘境上线前魔角冠也在拍卖。化神起
  const ap = ['g_chiyan', 'g_mojiao'].filter(id => !L.planOwned(st, id));
  if (p.r >= 4 && ap.length) { const id = pick(ap); pool.push({ k: 'plan', plan: id, n: `器方《${L.PLAN[id].n}》`, m: 0.9 }); }
  const pa = L.artPity(st, L.boxCap(st, 'a'));
  if (pa) { const A = L.art(pa); pool.push({ k: 'a', art: pa, tier: A.t, n: `${L.artTierName(A.t)}${L.ART_CAT[A.k]}《${A.n}》`, m: 1.2 }); }
  // 化神起偶有神阶残篇（鸿蒙造化经、周天星斗大法，三片合一）
  const fr = ['x_hongmeng', 'm_xingdou'].filter(id => !L.artOwned(st, id));
  if (p.r >= 4 && fr.length) { const id = pick(fr); pool.push({ k: 'frag', art: id, tier: 6, n: `《${L.art(id).n}》残篇（${(st.arts.frag[id] || 0)}/3）`, m: 1.4 }); }
  pool.push({ k: 'treasure', n: '天材地宝', m: 0.8 });
  if (p.t < L.talentCap(st)) pool.push({ k: 'xisui', n: '洗髓丹', m: 1.5 });
  pool.push({ k: 'pack', n: '九转金丹材料包', m: 1.1 });
  pool.push({ k: 'pills', n: '破境丹 ×3', m: 0.5 });
  const items = [];
  while (items.length < 3 && pool.length) { const it = pool.splice(Math.floor(R() * pool.length), 1)[0]; it.price = Math.floor(inc * L.AUCTION.price * it.m * (0.9 + R() * 0.2)); items.push(it); }
  st.auction = { until: st.tick + L.AUCTION.len, items };
}
L.auctionBuy = function (st, i) {
  if (!L.auctionOpen(st)) return null;
  const it = st.auction.items[i];
  if (!it || it.sold || st.stones < it.price) return null;
  st.stones -= it.price; it.sold = 1; st.flags.spentAt = st.tick;
  st.stats.auction = (st.stats.auction || 0) + 1;
  const res = { k: it.k, n: it.n };
  if (it.k === 'w' || it.k === 'g') res.it = L.gearDrop(st, it.slot || 'w', it.tier, { src: 'auction' });
  else if (it.k === 'plan') res.planText = L.givePlan(st, it.plan);
  else if (it.k === 'a' || it.k === 'frag') res.it = L.giveArt(st, it.art, { src: 'auction' });
  else if (it.k === 'treasure') st.treasure++;
  else if (it.k === 'xisui') { const from = st.p.t; st.p.t = Math.min(6, st.p.t + 1); res.talent = [from, st.p.t]; }
  else if (it.k === 'pack') { st.treasure += 2; st.herbs += L.herbCost(st, L.RECIPES.find(x => x.k === 'jiuzhuan')); }
  else if (it.k === 'pills') st.pills += 3;
  L.log(st, `拍卖会上拍下【${it.n}】，花去灵石 ${L.fmt(it.price)}`, 'gold');
  L.checkQuests(st);
  return res;
};
});
