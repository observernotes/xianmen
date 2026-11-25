/* 废柴仙途 · 逻辑模块 calendar：历法（四季、固定历）与天下大势（docs/SYSTEMS.md §7，docs/CONTENT.md §8）
 * 模块写法见 src/logic.js 顶部说明。
 *   四季：12 周天一轮，t % 12：1～3 春、4～6 夏、7～9 秋、10～0 冬（与 ART.seasonOf 一致，场景美术按它画）。
 *     春：灵田灵草 +50%、访客 +30%；夏：秘境开放（4～9）、兽类地图斩妖灵石 +15%；秋：灵田灵石 +50%、行情 +0.2；冬：闭关倍率 +0.2，年末论道。
 *     灵田作物各有旺季（SYSTEMS §6.2，crops.js 的 L.cropSeason）：春 灵草、惊雷竹、长生藤；夏 灵谷、赤炎果；秋 灵稻（灵石）；冬 寒霜莲、养魂花，旺季产量 +50%。
 *     周天星斗大法（m_xingdou）：季节加成翻倍。星河倒悬（共鸣 c12）：冬季闭关再 +0.5。
 *   固定历（24 周天一个大周期）：论道 t%12 = 0；拍卖会 t%24 = 8 起 6 周天；九宗会武 t%24 = 18；货架与任务板每届论道后刷新；秘境每个夏季开放。
 *   天下大势：每轮 t%12 = 2 掷一次，60% 发生一件（权重见 L.WORLDS），持续 6～10 周天；存在 st.cal = { w 当前大势, prev 上一件, n {id: 本世次数}, seen {季节: 1} }。
 *     一件大势 = { id, at 开始, until 结束（不含）, k 矿脉现世的地图, who / q 通缉令的路人与名次, tourAt 通缉令认到哪届论道, share 灵气潮汐合用, got 仙府秘藏已得 }
 *   历法与大势在筑基、且三年之约打完后（或转世后）生效（SYSTEMS §0 解锁表“筑基初期：历法与天下大势”；约战前“大事”牌仍是约战锦囊）；
 *   在那之前场景照样有四季，只是不结算。
 *   各项效果用 stats 的登记（L.addCulMod / L.addIncSrc / L.addExpMod）或下面的 L.cal* 函数接进历练、闭关、炼丹、坊市，界面拆解与结算用同一份。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);

// ---------- 四季 ----------
L.SEASONS = [
  { id: 'spring', n: '春', d: '灵草、惊雷竹、长生藤 +50%，访客多三成' },
  { id: 'summer', n: '夏', d: '秘境开放，兽类地图斩妖灵石 +15%，灵谷、赤炎果 +50%' },
  { id: 'autumn', n: '秋', d: '灵田灵石（灵稻）+50%，行情 +0.2' },
  { id: 'winter', n: '冬', d: '闭关倍率 +0.2，年末天骄论道，寒霜莲、养魂花 +50%' },
];
L.SEASON_V = { herb: 0.5, visit: 0.3, beast: 0.15, rice: 0.5, price: 0.2, ret: 0.2, xingheRet: 0.5 };
L.seasonOf = t => { const m = ((t % 12) + 12) % 12; return m >= 1 && m <= 3 ? 0 : m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : 3; };
L.season = st => L.seasonOf(st.tick);
L.seasonKey = st => L.SEASONS[L.season(st)].id;
// 本季还剩几个周天（含本周天）；下一季从哪个周天开始
L.seasonLeft = st => { const m = ((st.tick % 12) + 12) % 12; const end = m === 0 ? 0 : Math.ceil(m / 3) * 3; return (end === 0 ? 0 : end - m) + 1; };
// 第一世要筑基、并且三年之约打完（之前“大事”牌还是约战的锦囊，老祖也只顾着约战）；转世后一开始就有
// L.CAL_ON = false：四季与大势全关（tools/sim.js 的 nocal 用它量这一刀的影响）
L.CAL_ON = true;
L.calOpen = st => L.CAL_ON !== false && (st.rebirth > 0 || (mr(st) >= 1 && !!st.pact));
// 周天星斗大法：季节加成翻倍
L.seasonAmp = st => (L.artOn(st, 'm_xingdou') ? 2 : 1);
const sOn = (st, k) => L.calOpen(st) && L.season(st) === k;
L.seasonFx = function (st) {
  const s = L.calOpen(st) ? L.season(st) : -1, a = L.seasonAmp(st), V = L.SEASON_V;
  return { s, amp: a, herb: s === 0 ? V.herb * a : 0, visit: s === 0 ? V.visit * a : 0, beast: s === 1 ? V.beast * a : 0, rice: s === 2 ? V.rice * a : 0, price: s === 2 ? V.price * a : 0, ret: s === 3 ? V.ret * a : 0 };
};
// 兽类地图：敌人是野兽或蛟蛇（后山野林、万妖山脉、东海龙宫、混沌裂隙）
L.beastMap = k => ['beast', 'snake'].includes(L.REGIONS[k].foe);

// ---------- 天下大势（CONTENT §8） ----------
// len 持续周天；w 权重；open(st) 出现条件；max 每世最多几次
L.CAL = { every: 12, worldAt: 2, worldP: 0.6, bounty: 20 };
L.WORLDS = [
  { id: 'w_shouchao', n: '兽潮', len: 8, w: 1, open: st => mr(st) >= 1, d: '木属性地图斩妖：灵石 ×1.8，评价分数 −8' },
  { id: 'w_lingchao', n: '灵气潮汐', len: 6, w: 1, d: '修炼 +30%，闭关顿悟概率 ×2' },
  { id: 'w_danhui', n: '丹道大会', len: 6, w: 1, open: st => mr(st) >= 1, d: '行情里破境丹卖价 ×2，成丹率 +10%' },
  { id: 'w_kuangmai', n: '矿脉现世', len: 8, w: 1, open: st => mi(st) >= 3, d: '一张已开的地图灵矿 ×3' },
  { id: 'w_mojie', n: '魔劫', len: 10, w: 1, open: st => mr(st) >= 2, d: '火、水属性地图：推荐战力 ×1.3，灵石灵草灵矿 ×1.6' },
  { id: 'w_liuxing', n: '流星雨', len: 6, w: 1, d: '寻宝掉落高一阶的概率翻倍，天材地宝 ×2' },
  { id: 'w_dahan', n: '大旱', len: 8, w: 1, open: st => mr(st) >= 1, d: '灵田产量 −40%，灵草卖价 ×1.6' },
  // 仙府现世：期间免令进一次特殊秘境（8 层，秘藏四选一，realm.js 的 L.mjXianfu）；秘境没开（L.MJ_ON = false）时折成历练带回仙府秘藏
  { id: 'w_xianfu', n: '仙府现世', len: 6, w: 1, max: 3, open: st => mr(st) >= 2, d: '开放一次不耗令的特殊秘境：8 层，秘藏四选一' },
  { id: 'w_shanglu', n: '商路断绝', len: 8, w: 1, open: st => mr(st) >= 1, d: '坊市买价 +30%，行情全部 ×1.3' },
  { id: 'w_jiangdao', n: '名师讲道', len: 6, w: 1, d: '闭关倍率 +0.5；入宗者每次出关另得贡献' },
  { id: 'w_tongji', n: '通缉令', len: 10, w: 1, open: st => mr(st) >= 1 && !!st.pact, d: '天骄榜上一名路人被通缉：论道击败他得 20×收入' },
  { id: 'w_taiping', n: '太平无事', len: 10, w: 3, d: '无事，照常修炼' },
];
L.WORLD = {}; for (const W of L.WORLDS) L.WORLD[W.id] = W;
L.WORLD_V = { shouchao: 1.8, shouchaoScore: -8, lingchao: 0.30, lingchaoShare: 0.15, danhuiSell: 2, danhuiAlch: 0.10, kuangmai: 3, mojieRec: 1.3, mojieRew: 1.6, liuxingTier: 2, liuxingTreasure: 2,
  dahan: 0.4, dahanSell: 1.6, shanglu: 1.3, jiangdao: 0.5, jiangdaoContrib: 2, xianfuP: 0.5 };
L.newCal = () => ({ w: null, prev: null, n: {}, seen: {}, pause: -1 });
const cal = st => st.cal || (st.cal = L.newCal());
L.world = st => { const w = st.cal && st.cal.w; return w && st.tick < w.until ? w : null; };
L.worldOn = (st, id) => { const w = L.world(st); return !!w && w.id === id; };
L.worldLeft = st => { const w = L.world(st); return w ? w.until - st.tick : 0; };
// 大势的效果说明（带上具体的地图 / 人名）
L.worldDesc = function (st, w) {
  w = w || L.world(st); if (!w) return '';
  const W = L.WORLD[w.id];
  if (w.id === 'w_kuangmai') return `${L.REGIONS[w.k].n}灵矿 ×${L.WORLD_V.kuangmai}`;
  if (w.id === 'w_tongji') return `天骄榜第 ${L.wantedRank(st) || '?'} 名「${w.who}」被通缉：下届论道击败他得 ${L.CAL.bounty}×收入`;
  if (w.id === 'w_lingchao' && w.share) return '修炼 +15%（灵眼与人合用），闭关顿悟概率 ×2';
  return W.d;
};
function rollWorld(st) {
  const c = cal(st);
  const list = L.WORLDS.filter(W => (!W.open || W.open(st)) && (!W.max || (c.n[W.id] || 0) < W.max)).map(W => [W, W.w]);
  const W = wpick(list);
  const w = { id: W.id, at: st.tick, until: st.tick + W.len };
  if (W.id === 'w_kuangmai') {
    // 已开的地图里挑一张（家门口那几张更可能）
    const open = []; for (let k = 0; k < L.REGIONS.length; k++) if (L.regionOpen(st, k)) open.push(k);
    w.k = wpick(open.map(k => [k, 1 + k]));
  }
  if (W.id === 'w_tongji') {
    // 天骄榜上排在你前面 1～15 名的一位路人（你是榜首时挑第 2 名）；认到这一轮末的那届论道
    const qs = []; for (let q = Math.max(2, st.rank - 15); q <= Math.max(2, st.rank - 1); q++) { const rv = L.rivalAt(st, q); if (rv && !rv.id) qs.push(q); }
    if (!qs.length) return rollWorld(st);
    const S = L.power(st);
    qs.sort((a, b) => Math.abs(Math.log(L.rivalPower(st, a) / S)) - Math.abs(Math.log(L.rivalPower(st, b) / S)));
    const q = qs[Math.floor(R() * Math.min(3, qs.length))];
    w.who = L.rivalAt(st, q).n; w.tourAt = (Math.floor(st.tick / L.TOUR_EVERY) + 1) * L.TOUR_EVERY;
  }
  c.w = w; c.n[W.id] = (c.n[W.id] || 0) + 1;
  L.log(st, `天下大势：【${W.n}】，${W.len} 个周天——${L.worldDesc(st, w)}`, 'gold');
  return w;
}
L.rollWorld = rollWorld;
// 每周天（tick.js 在 L.gearTick 之后调）：大势到期、t%12 = 2 掷新的一件、换季
L.calTick = function (st, out) {
  const c = cal(st);
  if (c.w && st.tick >= c.w.until) { c.prev = c.w; c.w = null; out.worldEnd = c.prev.id; }
  if (!L.calOpen(st) || st.p.r > L.MAXR) return;
  if (!c.w && st.tick % L.CAL.every === L.CAL.worldAt && R() < L.CAL.worldP) { const w = rollWorld(st); out.world = w.id; }
  // 换季：1 春、4 夏、7 秋、10 冬
  const m = st.tick % 12;
  if (m === 1 || m === 4 || m === 7 || m === 10) out.season = L.season(st);
};

// ---------- 效果 ----------
// 修炼：灵气潮汐 +30%（与人合用 +15%）
L.addCulMod('world', 75, st => {
  if (!L.worldOn(st, 'w_lingchao')) return null;
  const w = L.world(st);
  return ['大势·灵气潮汐' + (w.share ? '（合用）' : ''), 1 + (w.share ? L.WORLD_V.lingchaoShare : L.WORLD_V.lingchao), ''];
});
// 灵田：秋灵稻（灵石）+50%；大旱 −40%（周天星斗翻倍季节项）。只算种灵稻的那几块（crops.js 的 L.fieldStoneInc）；
// 其余作物的旺季与大旱在 crops.js 的产量里（L.cropParts）
L.addIncSrc('season_field', 11, st => {
  if (!st.home.field || !L.riceCount(st)) return null;
  const f = L.seasonFx(st), base = L.fieldStoneInc(st), out = [];
  if (f.rice) out.push(['秋·灵稻旺（灵田 +' + Math.round(f.rice * 100) + '%）', base * f.rice, 'field']);
  if (L.worldOn(st, 'w_dahan')) out.push(['大势·大旱（灵田 −40%）', -base * L.WORLD_V.dahan, 'field']);
  return out;
});
// 灵草作物的季节与大旱倍率（= crops.js 里灵草的旺季项 × 大旱项）
L.calFieldHerb = st => (1 + L.seasonFx(st).herb) * (L.worldOn(st, 'w_dahan') ? 1 - L.WORLD_V.dahan : 1);
// 访客：春天多三成
L.calVisitMult = st => 1 + L.seasonFx(st).visit;
// 闭关倍率：冬 +0.2、星河倒悬冬季再 +0.5、名师讲道 +0.5
L.calRetParts = function (st) {
  const out = [], f = L.seasonFx(st);
  if (f.ret) out.push(['冬', f.ret]);
  if (f.s === 3 && L.comboOn(st, 'c12')) out.push(['星河倒悬', L.SEASON_V.xingheRet]);
  if (L.worldOn(st, 'w_jiangdao')) out.push(['名师讲道', L.WORLD_V.jiangdao]);
  return out;
};
L.calRetBonus = st => L.calRetParts(st).reduce((a, x) => a + x[1], 0);
// 闭关顿悟：灵气潮汐 ×2
L.calEpiMult = st => (L.worldOn(st, 'w_lingchao') ? 2 : 1);
// 名师讲道：入宗者每次坐满闭关另得贡献（家门口地图的贡献 ×2）
L.calRetDone = function (st) {
  if (!st.sect || !L.worldOn(st, 'w_jiangdao')) return 0;
  return L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.WORLD_V.jiangdaoContrib);
};
// 炼丹：丹道大会成丹率 +10%
L.calAlch = st => (L.worldOn(st, 'w_danhui') ? L.WORLD_V.danhuiAlch : 0);
// 聚灵阵停阵（world_dahan「布阵求雨」：聚灵阵停 3 周天）
L.arrayPaused = st => !!st.cal && st.tick < (st.cal.pause || -1);
// 历练：出发时算好（存进 plan.cx，途中大势结束也按出发时的算）
// stone / herb / ore 收获倍率，rec 推荐战力倍率，tier 寻宝掉落 +1 阶的概率倍率，treasure 天材地宝个数倍率，notes 说明
L.calExp = function (st, k, d, a) {
  const o = { stone: 1, herb: 1, ore: 1, rec: 1, tier: 1, treasure: 1, notes: [] };
  if (!L.calOpen(st)) return o;
  const f = L.seasonFx(st), V = L.WORLD_V, el = L.REGIONS[k].el, w = L.world(st);
  if (f.beast && a === 0 && L.beastMap(k)) { o.stone *= 1 + f.beast; o.notes.push(`夏·兽类地图斩妖灵石 +${Math.round(f.beast * 100)}%`); }
  if (!w) return o;
  if (w.id === 'w_shouchao' && el === 'mu' && a === 0) { o.stone *= V.shouchao; o.notes.push(`兽潮：斩妖灵石 ×${V.shouchao}，分数 ${V.shouchaoScore}`); }
  if (w.id === 'w_kuangmai' && w.k === k) { o.ore *= V.kuangmai; o.notes.push(`矿脉现世：灵矿 ×${V.kuangmai}`); }
  if (w.id === 'w_mojie' && (el === 'huo' || el === 'shui')) { o.rec *= V.mojieRec; o.stone *= V.mojieRew; o.herb *= V.mojieRew; o.ore *= V.mojieRew; o.notes.push(`魔劫：推荐战力 ×${V.mojieRec}，收获 ×${V.mojieRew}`); }
  if (w.id === 'w_liuxing') { if (a === 1) o.tier *= V.liuxingTier; o.treasure *= V.liuxingTreasure; o.notes.push(a === 1 ? '流星雨：掉落高一阶的概率翻倍，天材地宝 ×2' : '流星雨：天材地宝 ×2'); }
  if (w.id === 'w_xianfu' && !(L.mjUnlocked && L.mjUnlocked(st))) o.notes.push('仙府现世：评价甲以上一半机会带回仙府秘藏');
  return o;
};
// 兽潮：木属性地图斩妖分数 −8（进历练分数拆解）
L.addExpMod('world', 75, (st, k, d, a) => (L.worldOn(st, 'w_shouchao') && L.REGIONS[k].el === 'mu' && a === 0 ? ['大势·兽潮', L.WORLD_V.shouchaoScore, 'world'] : null));
// 仙府现世（秘境上线前的折算）：评价甲以上 50% 带回一件仙府秘藏（四选一随机：功法 / 法宝 / 天材地宝 ×2 / 灵石 12×收入），每次大势至多一件
L.calXianfu = function (st, rating) {
  const w = L.world(st);
  if (!w || w.id !== 'w_xianfu' || w.got || rating < 3 || R() >= L.WORLD_V.xianfuP) return null;
  if (L.mjUnlocked && L.mjUnlocked(st)) return null;   // 秘境开着：仙府是一次免令的秘境（realm.js），不再从历练里折
  w.got = 1;
  const opts = [];
  const pa = L.artPity(st, L.boxCap(st, 'a')); if (pa) opts.push('a');
  const pg = L.gearPity(st); if (pg) opts.push('g');
  opts.push('t', 's');
  const k = pick(opts), res = { k };
  if (k === 'a') res.it = L.giveArt(st, pa, { src: 'xianfu' });
  else if (k === 'g') res.it = L.gearDrop(st, pg.s, pg.t, { src: 'xianfu' });
  else if (k === 't') { st.treasure += 2; res.text = '天材地宝 +2'; }
  else { const v = Math.floor(Math.max(L.income(st), 20) * 12); st.stones += v; res.text = '灵石 +' + L.fmt(v); }
  L.log(st, '仙府现世：带回一件仙府秘藏' + (res.text ? '（' + res.text + '）' : ''), 'gold');
  return res;
};
// 通缉令：被通缉的路人现在排第几（论道前后都认：tourAt 那届论道打完为止）
L.wanted = function (st) {
  const c = st.cal; if (!c) return null;
  for (const w of [c.w, c.prev]) if (w && w.id === 'w_tongji' && !w.paid && st.tick <= w.tourAt) return w;
  return null;
};
L.wantedRank = function (st) {
  const w = L.wanted(st); if (!w) return 0;
  const i = st.ladder.findIndex(x => x.n === w.who); if (i < 0) return 0;
  return i + 1 < st.rank ? i + 1 : i + 2;
};
// 论道里击败了被通缉的那位：赏金 20×收入（rivals.js 的 L.tournament 调）
L.wantedPay = function (st, rv) {
  const w = L.wanted(st);
  if (!w || !rv || rv.n !== w.who) return 0;
  w.paid = 1;
  const v = Math.floor(Math.max(L.income(st), 20) * L.CAL.bounty);
  st.stones += v;
  L.log(st, `论道上擒下通缉犯「${w.who}」，领赏灵石 ${L.fmt(v)}`, 'gold');
  return v;
};

// ---------- 年历：24 格时间轴上的记号（ART.calStrip 的 marks）与倒计时 ----------
L.nextAuction = st => { if (L.auctionOpen && L.auctionOpen(st)) return 0; const e = L.AUCTION.every, a = L.AUCTION.at; return ((a - st.tick % e) + e) % e || e; };
L.calMarks = function (st, n) {
  n = n || 24;
  const t = st.tick, out = [];
  // 论道（三年之约之前标约战那一格）
  for (let i = 0; i < n; i++) { const tt = t + i; if (!st.pact && tt === L.PACT_TICK) out.push({ at: i, len: 1, kind: 'dao' }); else if (tt % L.TOUR_EVERY === 0 && tt > L.PACT_TICK && i > 0) out.push({ at: i, len: 1, kind: 'dao' }); }
  // 拍卖会（金丹后）：开 6 周天
  if (st.rebirth > 0 || mr(st) >= 2) {
    if (L.auctionOpen(st)) out.push({ at: 0, len: Math.min(n, st.auction.until - t), kind: 'auc' });
    for (let i = 1; i < n; i++) if ((t + i) % L.AUCTION.every === L.AUCTION.at) out.push({ at: i, len: Math.min(L.AUCTION.len, n - i), kind: 'auc' });
  }
  // 九宗会武（入宗后）
  if (st.sect && st.sect.order) { for (let m = L.nextMeet(st); m < n; m += L.MEET_EVERY) out.push({ at: m, len: 1, kind: 'war' }); }
  // 秘境：每个夏季（t%12 = 4～9）
  for (let i = 0; i < n; i++) { const m = (t + i) % 12; if (m === 4 || (i === 0 && m > 4 && m <= 9)) { const len = Math.min(10 - m, n - i); out.push({ at: i, len, kind: 'realm' }); } }
  // 当前大势
  const w = L.world(st); if (w) out.push({ at: 0, len: Math.min(n, w.until - t), kind: 'world' });
  return out;
};
// 秘境的夏季窗口：还有几个周天开（0 = 正开着）、开着的话还剩几个周天
L.realmWindow = function (st) {
  const m = ((st.tick % 12) + 12) % 12;
  if (m >= 4 && m <= 9) return { open: true, left: 10 - m };
  return { open: false, in: m < 4 ? 4 - m : 16 - m };
};
// 下一次掷大势还有几个周天
L.nextWorldRoll = st => { const m = ((st.tick % 12) + 12) % 12; return m < L.CAL.worldAt ? L.CAL.worldAt - m : 12 + L.CAL.worldAt - m; };

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：季节、大势 ----------
// elig.season：只在该季节出现；elig.world：只在该大势期间出现（events-engine 的 L.eligible 调 test）
L.supportElig('season', { ok: v => L.SEASONS.some(s => s.id === v), test: (st, v) => L.seasonKey(st) === v });
L.supportElig('world', { ok: v => !!L.WORLD[v], test: (st, v) => L.worldOn(st, v) });
// 一次性钩子 flag：lingchao_share 本次潮汐修炼加成 30% → 15%；array_pause3 聚灵阵停 3 周天（本次仁记 2 次）
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of [].concat(v)) {
    if (f === 'lingchao_share') { delete st.eflags.lingchao_share; const w = L.world(st); if (w && w.id === 'w_lingchao') { w.share = 1; out.push('灵气潮汐加成 30% → 15%（与人合用）'); } }
    if (f === 'array_pause3') { delete st.eflags.array_pause3; cal(st).pause = st.tick + 3; st.dao = st.dao || { k: 0, w: 0, r: 0 }; st.dao.r = (st.dao.r || 0) + 1; out.push('聚灵阵停阵 3 周天'); }
  }
} });
});
