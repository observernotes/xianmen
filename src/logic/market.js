/* 废柴仙途 · 逻辑模块 market：坊市货架、行情（出售）、拍卖竞价、坊市事件（docs/SYSTEMS.md §10，docs/CONTENT.md §14.7）
 * 模块写法见 src/logic.js 顶部说明。
 *   货架 6 格：3 格常驻（破境丹、寻宝、灵兽蛋），3 格每届论道（t%12 = 0）从池子里轮换，各限购 1～3 件；寿元不足三成时老板另备一枚“加急”延寿丹。
 *   行情（筑基）：灵草、灵矿、破境丹可卖，各有指数 0.6～1.6，每 6 周天游走一步（±0.2），秋季 +0.2、大势另乘；【卖一半】【全卖】。
 *   拍卖（金丹）：每 24 周天（t%24 = 8 起 6 周天）一场 3 件，起拍价约 12 周天收入；60% 的拍品有一位有名字的竞拍者；
 *     出价三档：跟一口 ×1.0 / 35%，加价 ×1.4 / 70%，豪掷 ×2.0 / 97%，有竞拍者各 −15%；没拿下不花钱；一场只能出手两次。
 *     竞拍者拿走的（你没拿下、或到散场也没人出手）：宿敌与天骄榜上的人战力永久 ×1.04，下届论道的台词里会提起（rivals.js）。
 *   st.market = { cyc 本届货架是第几届, rot 轮换格 [{ k, lim, sold, off 折扣, tier / art / plan }], disc 本届折扣（mkt_discount 的九折）, discNext, extra 下一届多一格,
 *                 idx { herb, ore, pill } 行情指数, evQ 待处理的坊市事件 [{ id, until }], last 最近一次买轮换货 { price, cyc }, urgent 本届加急延寿丹已买, sold 累计卖出灵石 }
 *   st.auction = { at, until, items: [{ k, n, m, price 起拍价, comp 竞拍者 { kind: 'rival' | 'ladder' | 'npc', id, n } | null, res: null | 'won' | 'comp' | 'gone', paid }], bids 本场已出手次数 } */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const rr = st => Math.min(st.p.r, 8);

// ---------- 货品与基础价：价格 = base × 2.6^r ----------
L.MARKET = [
  { k: 'pill', n: '破境丹', d: '突破时服用，每枚成功率 +15%（一次最多三枚）；负伤时可服一枚疗伤', base: 60 },
  { k: 'box', n: '寻宝', d: '随机得到一件法宝或一门具体的功法（已会的熟练 +20）；连续两次没提升，第三次必出更高一阶', base: 150 },
  { k: 'egg', n: '灵兽蛋', d: '孵化一只灵宠，种按蛋的属性随机（每届论道换一种属性）', base: 400, minR: 1 },
  { k: 'life', n: '延寿丹', d: '寿元 +10%，每个大境界最多服用三枚', base: 250, minR: 1 },
  { k: 'ore', n: '灵矿一筐', d: '强化、打造用', base: 50 },
  { k: 'robe', n: '法衣', d: '随机词条，走对比卡', base: 300 },
  { k: 'frag', n: '功法残篇', d: '三片合成一门神阶功法', base: 800 },
  { k: 'plan', n: '器方', d: '化神后器炉按方打造专属法宝', base: 1000 },
  { k: 'token', n: '秘境令', d: '夏季进秘境用，最多持 3 枚（每个夏季另送一枚）', base: 500 },
  { k: 'feed', n: '兽粮一袋', d: '喂灵宠升级（pets.js）', base: 40 },
  { k: 'yin', n: '药引一包', d: '两枚同种药引：炼丹、灵宠进化、打造用（crops.js）', base: 100 },
  { k: 'seed', n: '灵种', d: '一种还没解锁的灵田作物，买下就能种（crops.js）', base: 150 },
];
const MK = {}; for (const M of L.MARKET) MK[M.k] = M;
L.price = (st, k) => Math.floor(MK[k].base * Math.pow(2.6, rr(st)));
L.SHELF_FIXED = ['pill', 'box', 'egg'];
L.SHELF = { rot: 3, every: 12, urgent: 1.2, haggle: 0.10, fake: 0.05, cut: 0.30, disc: 0.9 };
// 一筐 = 10 × L.oreUnit（1.5^境界）
L.ORE_BUY = { n: 10 };
L.YIN_PACK = 2;   // 药引一包两枚
L.oreBasket = st => L.ORE_BUY.n * L.oreUnit(st);
L.newMarket = () => ({ cyc: -1, rot: [], disc: 1, discNext: 0, extra: 0, idx: { herb: 1, ore: 1, pill: 1 }, evQ: [], last: null, urgent: -1, sold: 0 });
const mk = st => st.market || (st.market = L.newMarket());
L.shelfOpen = st => st.rebirth > 0 || mi(st) >= 1;   // 炼气中期：轮换货架
L.restockIn = st => L.SHELF.every - (((st.tick % L.SHELF.every) + L.SHELF.every) % L.SHELF.every);

// ---------- 轮换池（SYSTEMS §10）。等系统接入的：秘境令 token、阵图 zhentu（生财阵）—— 系统上线时在这里加一行 ----------
const lifeUsed = st => st.lifePills[rr(st)] || 0;
const robeTier = st => L.gearNextTier('r', L.gearTier(st, 'r'), L.boxCap(st, 'w'));
const fragIds = st => ['x_hongmeng', 'm_xingdou'].filter(id => !L.artOwned(st, id));
const shopPlans = st => ['g_chiyan', 'g_mojiao'].filter(id => !L.planOwned(st, id));
const OFF = [0.2, 0.3, 0.4];
L.SHELF_POOL = [
  { k: 'ore', w: 3, ok: st => L.gearOpen(st, 'plus'), lim: () => 3, lock: '炼气圆满后上架' },
  { k: 'life', w: st => (L.lifeLow(st) ? 8 : 1), ok: st => (st.rebirth > 0 || mr(st) >= 1) && lifeUsed(st) < 3, lim: st => Math.min(2, 3 - lifeUsed(st)), lock: '筑基后上架' },
  { k: 'robe', w: 2, ok: st => L.gearOpen(st, 'r') && !!robeTier(st), make: st => ({ tier: robeTier(st) }), lim: () => 1, lock: '筑基中期后上架' },
  { k: 'frag', w: 1.5, ok: st => mr(st) >= 4 && fragIds(st).length > 0, make: st => ({ art: pick(fragIds(st)) }), lim: () => 1 },
  { k: 'plan', w: 1, ok: st => mr(st) >= 4 && shopPlans(st).length > 0, make: st => ({ plan: pick(shopPlans(st)) }), lim: () => 1 },
  { k: 'pill', off: true, w: 2, ok: () => true, lim: () => 3 },
  { k: 'box', off: true, w: 2, ok: st => st.stats.exp >= 1, lim: () => 2 },
  { k: 'egg', off: true, w: 1, ok: st => st.rebirth > 0 || mr(st) >= 1, lim: () => 1 },
  { k: 'token', w: 1.5, ok: st => !!L.mjUnlocked && L.mjUnlocked(st) && L.mjTokens(st) < L.MJ.tokenMax, lim: () => 1, lock: '筑基中期后上架' },   // 秘境令（realm.js）
  { k: 'feed', w: st => (L.petCount(st) ? 4 : 0.5), ok: st => (st.rebirth > 0 || mr(st) >= 1) && L.petCount(st) > 0, lim: () => 3, lock: '有灵宠后上架' },
  // 药引一包（两枚同种，手里最少的那种更常上）；灵种（下一种没解锁的作物）
  { k: 'yin', w: 3, ok: st => L.yinOpen(st), make: st => ({ yin: wpick(L.YIN_KEYS.map(y => [y, 1 / (1 + L.yinHave(st, y))])) }), lim: () => 2, lock: '筑基中期后上架' },
  { k: 'seed', w: 1.5, ok: st => (st.rebirth > 0 || mr(st) >= 1) && st.home.field > 0 && L.cropsOpen(st) && !!L.nextLockedCrop(st), make: st => ({ crop: L.nextLockedCrop(st).id }), lim: () => 1 },
];
L.restock = function (st, quiet) {
  const m = mk(st);
  const n = L.SHELF.rot + (m.extra ? 1 : 0);
  m.extra = 0; m.disc = m.discNext || 1; m.discNext = 0;
  const pool = L.SHELF_POOL.filter(x => x.ok(st)).map(x => [x, typeof x.w === 'function' ? x.w(st) : x.w]);
  const rot = [];
  while (rot.length < n && pool.length) {
    const x = wpick(pool); pool.splice(pool.findIndex(y => y[0] === x), 1);
    const s = Object.assign({ k: x.k, lim: x.lim(st), sold: 0, off: x.off ? pick(OFF) : 0 }, x.make ? x.make(st) : {});
    rot.push(s);
  }
  m.rot = rot; m.cyc = Math.floor(st.tick / L.SHELF.every); m.at = st.tick;
  if (!quiet && L.shelfOpen(st)) L.marketTrigger(st, 'market:restock', L.SHELF.fake);   // mkt_fake（5%）、mkt_black（魔劫）
  return rot;
};
const ensure = st => { const m = mk(st); if (m.cyc !== Math.floor(st.tick / L.SHELF.every)) L.restock(st, true); return m; };
// 一格货的名字与说明
function rowName(st, s) {
  const M = MK[s.k];
  if (s.k === 'robe') return `${L.gearTierName('r', s.tier)}法衣`;
  if (s.k === 'frag') return `《${L.art(s.art).n}》残篇`;
  if (s.k === 'plan') return `器方《${L.PLAN[s.plan].n}》`;
  if (s.k === 'egg') return L.eggName(st);
  if (s.k === 'yin' && s.yin) return `${L.YIN_N[s.yin]}一包`;
  if (s.k === 'seed' && s.crop) return `${L.CROP[s.crop].n}灵种`;
  return M.n;
}
function rowDesc(st, s) {
  if (s.k === 'ore') return `一筐 ${L.fmt(L.oreBasket(st))} · 手里 ${L.fmt(st.ore || 0)}`;
  if (s.k === 'feed') return `一袋 ${L.feedSack(st)} · 手里 ${L.fmt(st.feed || 0)}`;
  if (s.k === 'yin' && s.yin) return `${L.YIN_N[s.yin]} ×${L.YIN_PACK} · 手里 ${L.yinHave(st, s.yin)}`;
  if (s.k === 'seed' && s.crop) { const C = L.CROP[s.crop]; return L.cropOpen(st, s.crop) ? '已经能种了' : `提前解锁（本来${C.lock.replace('解锁', '')}）：${C.cyc} 周天一收，产${L.cropOutN(C)}`; }
  if (s.k === 'egg') return L.eggDesc(st);
  if (s.k === 'life') return `寿元 +10% · 本境界已服 ${lifeUsed(st)}/3`;
  if (s.k === 'robe') return `现在 ${L.gearTier(st, 'r') ? L.gearTierName('r', L.gearTier(st, 'r')) : '空'}；随机词条，走对比卡`;
  if (s.k === 'frag') return `${(st.arts.frag[s.art] || 0)}/3 片，集齐三片得这门神阶功法`;
  if (s.k === 'plan') { const P = L.PLAN[s.plan]; return `${L.GEAR_N[P.slot]} ${L.gearTierName(P.slot, P.t)}，${P.aff.map(a => L.AFFIX[a].n).join('、')}（化神后器炉打造）`; }
  if (s.k === 'token') return `手里 ${L.mjTokens(st)}/${L.MJ.tokenMax} 枚 · 夏季进秘境用`;
  return MK[s.k].d;
}
// 买价的组成：折扣、本届九折、商路断绝 +30%
L.buyMult = function (st, off) {
  const m = mk(st);
  return (1 - (off || 0)) * (m.disc || 1) * (L.worldOn(st, 'w_shanglu') ? L.WORLD_V.shanglu : 1);
};
// 货架视图：0～2 常驻，3 起轮换（+ 加急延寿丹）。每行 { i, k, n, d, price, lim, left, off, fixed, urgent, lock, s 轮换格 }
L.shelf = function (st) {
  const m = ensure(st), out = [];
  for (const k of L.SHELF_FIXED) {
    const M = MK[k], lock = M.minR && !(st.rebirth > 0 || mr(st) >= M.minR) ? '筑基后上架' : '';
    out.push({ i: out.length, k, n: rowName(st, { k }), d: k === 'egg' ? L.eggDesc(st) : M.d, price: Math.floor(L.price(st, k) * L.buyMult(st, 0)), base: L.price(st, k), lim: Infinity, left: Infinity, off: 0, fixed: true, lock });
  }
  if (!L.shelfOpen(st)) {
    for (let j = 0; j < L.SHELF.rot; j++) out.push({ i: out.length, k: '', n: '轮换货', d: '', lock: '炼气中期开放', left: 0, lim: 0 });
    return out;
  }
  for (const s of m.rot) out.push({ i: out.length, k: s.k, n: rowName(st, s) + (s.off ? `（${Math.round((1 - s.off) * 10)}折）` : ''), d: rowDesc(st, s), price: Math.floor(L.price(st, s.k) * L.buyMult(st, s.off)), base: L.price(st, s.k), lim: s.lim, left: s.lim - s.sold, off: s.off, s });
  // 空着的格：写上要等到什么时候才上（还没解锁的货）
  const teas = L.SHELF_POOL.filter(x => x.lock && !x.ok(st) && !m.rot.some(s => s.k === x.k));
  for (let j = m.rot.length; j < L.SHELF.rot; j++) { const x = teas.shift(); out.push({ i: out.length, k: x ? x.k : '', n: x ? MK[x.k].n : '空格', d: '', lock: x ? x.lock : '下一届上新', left: 0, lim: 0 }); }
  // 加急：寿元不足三成、货架上没有延寿丹时，老板从柜台底下摸出一枚（每届一枚，价 ×1.2）
  if (L.lifeLow(st) && (st.rebirth > 0 || mr(st) >= 1) && lifeUsed(st) < 3 && !out.some(r => r.k === 'life' && r.left > 0)) {
    const used = m.urgent === m.cyc;
    out.push({ i: out.length, k: 'life', n: '延寿丹（加急）', d: `老板见你气色不对，从柜台底下摸出一枚 · 本境界已服 ${lifeUsed(st)}/3`, price: Math.floor(L.price(st, 'life') * L.SHELF.urgent * L.buyMult(st, 0)), base: L.price(st, 'life'), lim: 1, left: used ? 0 : 1, off: 0, urgent: true });
  }
  return out;
};
L.shelfWhy = function (st, row) {
  if (!row) return '没有这件货';
  if (row.lock) return row.lock;
  if (row.left <= 0) return '本届已售罄';
  if (row.k === 'life' && lifeUsed(st) >= 3) return '本境界已服满';
  if (st.stones < row.price) return `还差 ${L.fmt(row.price - st.stones)} 灵石`;
  return '';
};
L.marketOpen = (st, k) => L.shelf(st).some(r => r.k === k && !r.lock && r.left > 0 && !(k === 'life' && lifeUsed(st) >= 3));
L.oreBuyLeft = st => L.shelf(st).filter(r => r.k === 'ore' && !r.lock).reduce((a, r) => a + Math.max(0, r.left), 0);

// ---------- 买 ----------
// 寻宝保底（和拍卖）能补到的最高阶：L.BOX_CAP + 境界（法宝至多 7 阶、功法至多 6 阶）。
// v1 写的是 2 + r；寻宝便宜、拍卖每 24 周天一次，按 2 算时功法化神就满、法宝炼虚就满，改 1（tools/sim.js 校准）
// 功法按阶抽一门具体的（arts.js 的 L.rollArt）；保底给最落后的已开槽补高一阶的一门（L.artPity）。
// 法宝：随机给一件开了的槽（按阶抽一件，带词条，走对比卡）；保底给最弱的一槽补下一阶（L.gearWeakest / L.gearNextTier）
L.BOX_CAP = 1;
// 某槽的下一阶（饰品只有 2 / 4 / 6）；cap 封顶，返回 0 表示补不了
L.gearNextTier = (slot, t, cap) => { const n = slot === 'o' ? (t < 2 ? 2 : t < 4 ? 4 : 6) : t + 1; return n > t && n <= Math.min(cap === undefined ? 7 : cap, L.GEAR_TMAX[slot]) ? n : 0; };
L.gearPity = st => { const wk = L.gearWeakest(st), n = L.gearNextTier(wk.s, wk.t, L.boxCap(st, 'w')); return n ? { s: wk.s, t: n, from: wk.t } : null; };
L.boxCap = (st, kind) => Math.min(kind === 'w' ? 7 : 6, L.BOX_CAP + Math.min(st.p.r, 8));
function giveGood(st, row) {
  const r = rr(st), s = row.s || {};
  if (row.k === 'pill') { st.pills++; return { k: 'pill' }; }
  if (row.k === 'life') {
    if (lifeUsed(st) >= 3) return null;
    st.lifePills[r] = lifeUsed(st) + 1;
    const add = Math.floor(L.REALMS[r].life * 0.1);
    st.lifeBonus += add;
    L.log(st, `服下延寿丹，寿元增加 ${add} 年`, 'jade');
    return { k: 'life', add };
  }
  if (row.k === 'ore') { const n = L.addOre(st, L.oreBasket(st)); L.log(st, `坊市买下一筐灵矿：+${L.fmt(n)}`); return { k: 'ore', ore: n }; }
  if (row.k === 'robe') return { k: 'robe', it: L.gearDrop(st, 'r', s.tier, { src: 'shop' }) };
  if (row.k === 'frag') return { k: 'frag', it: L.giveArt(st, s.art, { src: 'shop' }) };
  if (row.k === 'plan') return { k: 'plan', planText: L.givePlan(st, s.plan) };
  if (row.k === 'box') {
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
    return { k: 'box', it };
  }
  if (row.k === 'egg') return { k: 'egg', it: L.petEgg(st, L.eggEl(st), 'shop') };
  if (row.k === 'feed') { const n = L.feedSack(st); st.feed = (st.feed || 0) + n; L.log(st, `坊市买下兽粮一袋：+${n}`); return { k: 'feed', feed: n }; }
  if (row.k === 'yin' && s.yin) { L.addYin(st, s.yin, L.YIN_PACK); L.log(st, `坊市买下${L.YIN_N[s.yin]} ×${L.YIN_PACK}`); return { k: 'yin', yin: s.yin, n: L.YIN_PACK }; }
  if (row.k === 'seed' && s.crop) { if (L.cropOpen(st, s.crop)) return null; L.cropsOf(st).seed[s.crop] = 1; L.log(st, `坊市买下${L.CROP[s.crop].n}的灵种：现在就能种`, 'jade'); return { k: 'seed', crop: s.crop }; }
  if (row.k === 'token') { if (!L.mjAddToken(st, 1)) return null; L.log(st, `坊市买下一枚秘境令（${L.mjTokens(st)}/${L.MJ.tokenMax}）`); return { k: 'token' }; }
  return null;
}
// 买第 i 格（L.shelf 的序号）
L.shelfBuy = function (st, i) {
  const rows = L.shelf(st), row = rows[i];
  if (L.shelfWhy(st, row)) return null;
  const c = row.price, m = mk(st);
  const res = giveGood(st, row);
  if (!res) return null;
  st.stones -= c; st.flags.spentAt = st.tick;
  st.stats.shop = (st.stats.shop || 0) + 1;
  res.price = c; res.i = i;
  if (row.s) { row.s.sold++; m.last = { price: c, cyc: m.cyc, n: row.n }; L.marketTrigger(st, 'market:buy', L.SHELF.haggle, 1); }   // mkt_haggle：买轮换货时 10%
  if (row.urgent) m.urgent = m.cyc;
  L.checkQuests(st);
  return res;
};
// 按货名买（常驻、轮换、加急都算；有折扣的先买折扣的）
L.buy = function (st, k) {
  const rows = L.shelf(st).filter(r => r.k === k && !L.shelfWhy(st, r)).sort((a, b) => a.price - b.price);
  return rows.length ? L.shelfBuy(st, rows[0].i) : null;
};

// ---------- 行情（出售，筑基） ----------
// 基准价：灵草 2 × 2.6^r；破境丹 = 买价的 40%；灵矿 = 货架上一筐的价摊到每块的 40%。丹霞谷卖丹 ×1.3。
// 灵矿没按 SYSTEMS 写的“灵草 ×3”：灵矿按筐计（1 筐 = 1.5^境界块，gear.js 的 L.oreUnit），照“灵草 ×3”卖，化神时一块卖 270、货架上一块只要 45，买了就能倒卖。
// 能在货架上买到的（灵矿、破境丹）卖价封顶在买价的 95%（cap），各种加成叠满也倒卖不出钱。
L.SELL = {
  herb: { n: '灵草', unit: st => 2 * Math.pow(2.6, rr(st)) },
  ore: { n: '灵矿', unit: st => 0.4 * L.price(st, 'ore') / L.oreBasket(st), cap: st => 0.95 * L.price(st, 'ore') / L.oreBasket(st) },
  pill: { n: '破境丹', unit: st => 0.4 * L.price(st, 'pill'), cap: st => 0.95 * L.price(st, 'pill') },
};
L.SELL_KEYS = Object.keys(L.SELL);
L.IDX = { lo: 0.6, hi: 1.6, step: 0.2, every: 6 };
L.sellOpen = st => st.rebirth > 0 || mr(st) >= 1;
L.sellHave = (st, k) => (k === 'herb' ? Math.floor(st.herbs || 0) : k === 'ore' ? Math.floor(st.ore || 0) : st.pills || 0);
// 价格倍率的组成：[名字, 值, 'add' | 'mul']
L.sellParts = function (st, k) {
  const m = mk(st), out = [['行情', m.idx[k] || 1, 'base']];
  const f = L.seasonFx(st);
  if (f.price) out.push(['秋', f.price, 'add']);
  if (k === 'herb' && L.worldOn(st, 'w_dahan')) out.push(['大旱', L.WORLD_V.dahanSell, 'mul']);
  if (k === 'pill' && L.worldOn(st, 'w_danhui')) out.push(['丹道大会', L.WORLD_V.danhuiSell, 'mul']);
  if (L.worldOn(st, 'w_shanglu')) out.push(['商路断绝', L.WORLD_V.shanglu, 'mul']);
  if (k === 'pill' && st.sect && st.sect.id === 'dan') out.push(['丹霞谷', 1.3, 'mul']);
  return out;
};
L.sellMult = function (st, k) {
  let v = 0, mul = 1;
  for (const [, x, how] of L.sellParts(st, k)) { if (how === 'mul') mul *= x; else v += x; }
  return clamp(v, L.IDX.lo, L.IDX.hi + 0.4) * mul;
};
L.sellPrice = (st, k) => { const G = L.SELL[k], v = G.unit(st) * L.sellMult(st, k); return G.cap ? Math.min(v, G.cap(st)) : v; };
L.sellCapped = (st, k) => { const G = L.SELL[k]; return !!G.cap && G.unit(st) * L.sellMult(st, k) > G.cap(st); };
// 涨跌：比平时（×1）高还是低
L.sellTrend = function (st, k) { const v = L.sellMult(st, k); return v >= 1.15 ? { d: 'up', t: '高于平时' } : v <= 0.85 ? { d: 'down', t: '低于平时' } : { d: 'flat', t: '与平时相当' }; };
L.sellCount = (st, k, frac) => { const h = L.sellHave(st, k); return frac >= 1 ? h : h > 0 ? Math.max(1, Math.floor(h / 2)) : 0; };
L.sellValue = (st, k, n) => Math.floor(n * L.sellPrice(st, k));
// 卖：frac = 1 全卖，0.5 卖一半
L.sell = function (st, k, frac) {
  if (!L.sellOpen(st) || !L.SELL[k]) return null;
  const n = L.sellCount(st, k, frac === undefined ? 1 : frac);
  if (n <= 0) return null;
  const v = L.sellValue(st, k, n);
  if (k === 'herb') st.herbs -= n; else if (k === 'ore') st.ore -= n; else st.pills -= n;
  st.stones += v;
  const m = mk(st); m.sold = (m.sold || 0) + v;
  st.stats.sold = (st.stats.sold || 0) + v;
  L.log(st, `坊市卖出${L.SELL[k].n} ${L.fmt(n)}，得灵石 ${L.fmt(v)}（×${L.sellMult(st, k).toFixed(2)}）`);
  L.checkQuests(st);
  return { k, n, stones: v, mult: L.sellMult(st, k) };
};
// 行情每 6 周天游走一步：±0.2，越偏离 1 越容易往回走
function walk(st) {
  const m = mk(st);
  for (const k of L.SELL_KEYS) {
    const v = m.idx[k] || 1, up = v > 1.15 ? 0.35 : v < 0.85 ? 0.65 : 0.5;
    m.idx[k] = Math.round(clamp(v + (R() < up ? L.IDX.step : -L.IDX.step), L.IDX.lo, L.IDX.hi) * 10) / 10;
  }
}

// ---------- 拍卖会（金丹解锁）：每 24 周天一次，开 6 周天，三件，竞价 ----------
L.AUCTION = { every: 24, at: 8, len: 6, price: 12, bids: 2, compP: 0.6, compCut: 0.15, boost: 1.04, consign: 8,
  tiers: [{ n: '跟一口', m: 1.0, p: 0.35, icon: 'bid1' }, { n: '加价', m: 1.4, p: 0.70, icon: 'bid2' }, { n: '豪掷', m: 2.0, p: 0.97, icon: 'bid3' }] };
L.auctionOpen = st => !!st.auction && st.tick < st.auction.until;
L.auctionBidsLeft = st => (st.auction ? L.AUCTION.bids - (st.auction.bids || 0) : 0);
// 竞拍者：还没打赢过、排在你前面的宿敌（权重 3）、天骄榜上排在你前面 1～20 名的路人、认识的人物
function rollComp(st, used) {
  if (R() >= L.AUCTION.compP) return null;
  const c = [];
  st.ladder.forEach((x, i) => {
    const q = i + 1 < st.rank ? i + 1 : i + 2;
    if (used.has(x.n)) return;
    if (x.id && L.rivalBid && L.rivalBid(st, { kind: 'rival', id: x.id })) c.push([{ kind: 'rival', id: x.id, n: x.n, q }, 3]);   // 恩怨 ≥ 60 的宿敌不管名次都来抬价（rivals2.js）
    else if (q >= st.rank) return;
    else if (x.id && !st.beaten[x.id]) c.push([{ kind: 'rival', id: x.id, n: x.n, q }, 3]);
    else if (!x.id && q >= st.rank - 20) c.push([{ kind: 'ladder', n: x.n, q }, 0.25]);
  });
  for (const id in L.NPCS) if (L.met(st, id) && !used.has('npc:' + id)) c.push([{ kind: 'npc', id, n: L.npcName(st, id) }, 1]);
  if (!c.length) return null;
  const x = wpick(c); used.add(x.kind === 'npc' ? 'npc:' + x.id : x.n);
  return x;
}
L.rollAuction = rollAuction;
function rollAuction(st) {
  const p = st.p, inc = Math.max(L.income(st), 20), pool = [];
  // 最弱一槽的下一阶法宝、一门具体的功法，但不超过本境界的寻宝上限（L.boxCap），免得拍卖把装备拉到境界前头
  const pg = L.gearPity(st);
  if (pg) pool.push({ k: 'g', slot: pg.s, tier: pg.t, n: `${L.gearTierName(pg.s, pg.t)}${L.GEAR_N[pg.s]}一件`, m: 1.2 });
  // 器方：赤炎双刃（拍卖）；秘境上线前魔角冠也在拍卖。化神起
  const ap = shopPlans(st);
  if (p.r >= 4 && ap.length) { const id = pick(ap); pool.push({ k: 'plan', plan: id, n: `器方《${L.PLAN[id].n}》`, m: 0.9 }); }
  const pa = L.artPity(st, L.boxCap(st, 'a'));
  if (pa) { const A = L.art(pa); pool.push({ k: 'a', art: pa, tier: A.t, n: `${L.artTierName(A.t)}${L.ART_CAT[A.k]}《${A.n}》`, m: 1.2 }); }
  // 化神起偶有神阶残篇（鸿蒙造化经、周天星斗大法，三片合一）
  const fr = fragIds(st);
  if (p.r >= 4 && fr.length) { const id = pick(fr); pool.push({ k: 'frag', art: id, tier: 6, n: `《${L.art(id).n}》残篇（${(st.arts.frag[id] || 0)}/3）`, m: 1.4 }); }
  if (L.petCount(st) < L.petCap(st)) { const el = pick(L.PET_EGG_ELS); pool.push({ k: 'egg', el, n: `${L.eggName(st, el)}（品阶高一档）`, m: 1 }); }
  pool.push({ k: 'treasure', n: '天材地宝', m: 0.8 });
  if (p.t < L.talentCap(st)) pool.push({ k: 'xisui', n: '洗髓丹', m: 1.5 });
  pool.push({ k: 'pack', n: '九转金丹材料包', m: 1.1 });
  pool.push({ k: 'pills', n: '破境丹 ×3', m: 0.5 });
  const items = [], used = new Set();
  while (items.length < 3 && pool.length) {
    const it = pool.splice(Math.floor(R() * pool.length), 1)[0];
    it.price = Math.floor(inc * L.AUCTION.price * it.m * (0.9 + R() * 0.2));
    it.comp = rollComp(st, used); it.res = null;
    items.push(it);
  }
  st.auction = { at: st.tick, until: st.tick + L.AUCTION.len, items, bids: 0 };
  // 送拍（auc_sell 的 auc_consign）：上一场交给拍卖行的东西这一场落槌，价随行情
  if (st.eflags && st.eflags.auc_consign) {
    delete st.eflags.auc_consign;
    const avg = L.SELL_KEYS.reduce((a, k) => a + L.sellMult(st, k), 0) / L.SELL_KEYS.length;
    const v = Math.floor(inc * L.AUCTION.consign * avg); st.stones += v; st.auction.consign = v;
    L.log(st, `送拍的东西落槌，拍卖行送来灵石 ${L.fmt(v)}`, 'gold');
  }
  // 拍卖事件：开拍时（auc_mystery）、宿敌在场（auc_rival）、身上有 +5 以上或 5 阶以上的好货（auc_sell）
  L.marketTrigger(st, 'auction:open', 0.35, L.AUCTION.len);
  if (items.some(it => it.comp && it.comp.kind === 'rival')) L.marketTrigger(st, 'auction:rival', 0.5, L.AUCTION.len);
  if (L.gearEqList(st).some(x => x.plus >= 5 || x.t >= 5)) L.marketTrigger(st, 'auction:sell', 0.3, L.AUCTION.len);
  return st.auction;
}
// 某件拍品第 t 档出价：价钱、拿下的概率、为什么不能出
L.bidInfo = function (st, i, t) {
  const A = st.auction, it = A && A.items[i], T = L.AUCTION.tiers[t];
  if (!it || !T) return null;
  // 恩怨 ≥ 60 的宿敌在场：他抬价，你的出价 ×1.2、拿下概率再 −10%（rivals2.js 的 L.rivalBid）
  const rb = L.rivalBid ? L.rivalBid(st, it.comp) : null;
  const price = Math.floor(it.price * T.m * (rb ? rb.m : 1)), p = Math.max(0.05, T.p - (it.comp ? L.AUCTION.compCut : 0) - (rb ? rb.cut : 0));
  let why = '';
  if (!L.auctionOpen(st)) why = '拍卖会已散';
  else if (it.res) why = it.res === 'won' ? '已拍下' : '已落槌';
  else if ((A.bids || 0) >= L.AUCTION.bids) why = `本场已出手 ${L.AUCTION.bids} 次`;
  else if (st.stones < price) why = `还差 ${L.fmt(price - st.stones)} 灵石`;
  return { price, p, why, T, comp: it.comp, raise: rb };
};
function giveLot(st, it) {
  const res = {};
  if (it.k === 'w' || it.k === 'g') res.it = L.gearDrop(st, it.slot || 'w', it.tier, { src: 'auction' });
  else if (it.k === 'plan') res.planText = L.givePlan(st, it.plan);
  else if (it.k === 'a' || it.k === 'frag') res.it = L.giveArt(st, it.art, { src: 'auction' });
  else if (it.k === 'egg') res.it = L.petEgg(st, it.el, 'auction', 1);
  else if (it.k === 'treasure') st.treasure++;
  else if (it.k === 'xisui') { const from = st.p.t; st.p.t = Math.min(6, st.p.t + 1); res.talent = [from, st.p.t]; }
  else if (it.k === 'pack') { st.treasure += 2; st.herbs += L.herbCost(st, L.RECIPES.find(x => x.k === 'jiuzhuan')); }
  else if (it.k === 'pills') st.pills += 3;
  return res;
}
// 竞拍者拿走：宿敌、天骄榜上的人战力永久 ×1.04（L.rivalPower 读 ladder 里的 pw），记下拍品名，下届论道提起
function compTakes(st, it) {
  const c = it.comp;
  if (!c) { it.res = 'gone'; return null; }
  it.res = 'comp';
  const out = { n: c.n, kind: c.kind, item: it.n, boost: false };
  if (c.kind !== 'npc') {
    const x = st.ladder.find(y => y.n === c.n);
    if (c.id === 'mu' && st.eflags && st.eflags.mu_overpaid) delete st.eflags.mu_overpaid;   // auc_rival：慕容这场多花了钱，拍到的东西不生效
    else if (x) { const m = L.rivalBoost(st, x, L.AUCTION.boost, `在拍卖会上拍得【${it.n}】`); x.aucNote = it.n; x.aucN = (x.aucN || 0) + 1; out.boost = m > 1; out.m = m; }   // 每人上限 ×1.3（rivals.js）
  }
  L.log(st, `拍卖会：${c.n}拍走了【${it.n}】${out.boost ? `，战力 ×${L.AUCTION.boost}` : ''}`, out.boost ? 'red' : '');
  st.stats.aucLost = (st.stats.aucLost || 0) + 1;
  return out;
}
L.auctionBid = function (st, i, t) {
  const b = L.bidInfo(st, i, t);
  if (!b || b.why) return null;
  const A = st.auction, it = A.items[i];
  A.bids = (A.bids || 0) + 1;
  st.stats.bids = (st.stats.bids || 0) + 1;
  const win = R() < b.p;
  const res = { i, t, win, price: b.price, p: b.p, n: it.n, k: it.k, comp: it.comp };
  if (win) {
    st.stones -= b.price; it.res = 'won'; it.paid = b.price; st.flags.spentAt = st.tick;
    st.stats.auction = (st.stats.auction || 0) + 1;
    Object.assign(res, giveLot(st, it));
    L.log(st, `拍卖会上${b.T.n}拍下【${it.n}】，花去灵石 ${L.fmt(b.price)}`, 'gold');
    L.checkQuests(st);
  } else {
    res.lost = compTakes(st, it);
    L.log(st, `【${it.n}】${b.T.n}没能拿下${it.comp ? '，被' + it.comp.n + '压了一口' : ''}，灵石没花`);
  }
  return res;
};
// 散场：还没落槌的拍品，有竞拍者的归竞拍者
L.auctionClose = function (st) {
  const A = st.auction; if (!A) return [];
  const out = [];
  for (const it of A.items) if (!it.res) { const r = compTakes(st, it); if (r) out.push(r); }
  return out;
};

// ---------- 坊市事件（where: 'market'）：换货、买轮换货、开拍、宿敌在场、送拍。排进 st.market.evQ，坊市界面打开时弹 ----------
// p：触发概率；life：在队里留几个周天（默认到下一次换货）
L.marketTrigger = function (st, key, p, life) {
  if (p !== undefined && R() >= p) return null;
  const m = mk(st);
  m.evQ = (m.evQ || []).filter(x => st.tick < x.until);
  if (m.evQ.length >= 3) return null;
  const ev = L.pickEvent(st, 'market', { trigger: key });
  if (!ev || m.evQ.some(x => x.id === ev.id)) return null;
  m.evQ.push({ id: ev.id, until: st.tick + (life || L.restockIn(st)) });
  return ev;
};
// 下一个待处理的坊市事件（过期的丢掉）
L.marketEvent = function (st) {
  const m = mk(st);
  m.evQ = (m.evQ || []).filter(x => st.tick < x.until);
  for (const x of m.evQ) { const ev = L.eventById(x.id); if (ev) return ev; }
  return null;
};
L.marketEventDone = (st, id) => { const m = mk(st); m.evQ = (m.evQ || []).filter(x => x.id !== id); };

// ---------- 每周天（tick.js 调）：行情游走、换货、拍卖散场与开槌 ----------
L.marketTick = function (st, out) {
  const m = mk(st);
  if (st.tick % L.IDX.every === 0) walk(st);
  if (st.tick % L.SHELF.every === 0) { L.restock(st); out.restock = true; }
  if (st.auction && st.tick >= st.auction.until) { out.aucEnd = L.auctionClose(st); st.auction = null; }
  if (L.mr(st) >= 2 && st.p.r <= L.MAXR && st.tick % L.AUCTION.every === L.AUCTION.at) {
    rollAuction(st); out.auction = true;
    L.log(st, `坊市拍卖会开槌，为期 ${L.AUCTION.len} 周天`, 'gold');
  }
  void m;
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：坊市事件 ----------
L.supportWhere('market');
L.supportTrigger('market:'); L.supportTrigger('auction:');
// 一次性钩子 flag：mkt_discount 下一届货架九折；mkt_cut30 本次购买七折（退三成）；mkt_extra_slot 下一届货架多一格；auc_consign 下一场拍卖代卖（rollAuction 结）
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  const m = mk(st);
  for (const f of [].concat(v)) {
    if (f === 'mkt_discount') { delete st.eflags.mkt_discount; m.discNext = L.SHELF.disc; out.push('下一届货架九折'); }
    if (f === 'mkt_cut30') { delete st.eflags.mkt_cut30; if (m.last && m.last.cyc === m.cyc) { const v2 = Math.floor(m.last.price * L.SHELF.cut); st.stones += v2; m.last = null; out.push(`老板退回灵石 ${L.fmt(v2)}（七折）`); } }
    if (f === 'mkt_extra_slot') { delete st.eflags.mkt_extra_slot; m.extra = 1; out.push('下一届货架多一格'); }
    if (f === 'auc_consign') out.push('下一场拍卖会落槌后结账');
  }
} });
});
