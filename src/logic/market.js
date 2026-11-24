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
  { k: 'box', n: '寻宝', d: '随机得到一件法宝或一部功法；连续两次没提升，第三次必出更高一阶', base: 150 },
  { k: 'egg', n: '灵兽蛋', d: '孵化一只灵宠，品阶随机', base: 400, minR: 1 },
];
L.price = (st, k) => Math.floor(L.MARKET.find(m => m.k === k).base * Math.pow(2.6, Math.min(st.p.r, 8)));
L.marketOpen = (st, k) => { const m = L.MARKET.find(x => x.k === k); return !m.minR || st.p.r >= m.minR || (st.flags.maxR || 0) >= m.minR; };

// 寻宝保底能补到的最高阶：L.BOX_CAP + 境界（法宝至多 7 阶、功法至多 6 阶）
L.BOX_CAP = 2;
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
  if (k === 'box') {
    // 保底：连续两次没带来提升，第三次必得“当前最高阶 +1”（上限见 L.boxCap）
    const capW = L.boxCap(st, 'w'), capA = L.boxCap(st, 'a');
    let it;
    if ((st.boxMiss || 0) >= 2 && (p.w < capW || p.a < capA)) {
      const kind = p.w < capW && (p.a >= capA || p.w <= p.a) ? 'w' : 'a';
      it = L.giveItem(st, kind, p[kind] + 1); it.pity = true;
    } else {
      const kind = R() < 0.55 ? 'w' : 'a';
      it = L.giveItem(st, kind, L.rollTier(st, 1 + Math.floor(r * (kind === 'w' ? 0.75 : 0.6)), kind === 'w' ? 7 : 6));
    }
    st.boxMiss = it.equip ? 0 : (st.boxMiss || 0) + 1;
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
  // 高一阶的法宝功法，但不超过本境界的寻宝上限（L.boxCap），免得拍卖把装备拉到境界前头
  if (p.w < L.boxCap(st, 'w')) pool.push({ k: 'w', tier: p.w + 1, n: L.WEAPONS[p.w + 1].n + '一件', m: 1.2 });
  if (p.a < L.boxCap(st, 'a')) pool.push({ k: 'a', tier: p.a + 1, n: L.ARTS[p.a + 1].n + '功法一部', m: 1.2 });
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
  if (it.k === 'w' || it.k === 'a') res.it = L.giveItem(st, it.k, it.tier);
  else if (it.k === 'treasure') st.treasure++;
  else if (it.k === 'xisui') { const from = st.p.t; st.p.t = Math.min(6, st.p.t + 1); res.talent = [from, st.p.t]; }
  else if (it.k === 'pack') { st.treasure += 2; st.herbs += L.herbCost(st, L.RECIPES.find(x => x.k === 'jiuzhuan')); }
  else if (it.k === 'pills') st.pills += 3;
  L.log(st, `拍卖会上拍下【${it.n}】，花去灵石 ${L.fmt(it.price)}`, 'gold');
  L.checkQuests(st);
  return res;
};
});
