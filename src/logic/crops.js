/* 废柴仙途 · 逻辑模块 crops：灵田作物（docs/SYSTEMS.md §6.2）与药引库存（§5）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   田数 = 1 + floor(灵田等级 / 4)，至多 6 块（灵田 0 级没有田）。每块种一种作物，成熟自动收、续种同一种；点田 → 点作物；【全部改种】一键。
 *   st.crops = { plots [{ c 作物 id, g 这一茬长了几个月 }]（按田数补齐，新开的田默认灵稻），prog { 收成的零头 }, seed { 提前解锁的作物 }, boost { 留种的作物 ×1.2 },
 *                half 本季减半到哪个月（虫灾 field_half）, mut 刚长出变种的作物（field_mutant） }
 *   st.mats.yin = { fire, ice, thunder, wood, soul } 药引（火 / 冰 / 雷 / 木 / 魂，炼丹、灵宠进化、器方、事件都用它）。
 *
 *   灵稻：灵石按月结算——home.js 的“灵田”收入 = L.fieldInc(lv) × 灵稻块数 / 田数，所以全种灵稻（默认）与旧公式完全等价；
 *         秋季 +50%、守田灵宠、大旱也都按灵稻的份额算（calendar.js、pets.js）。成熟只是换一茬（界面上冒一个“灵稻 +N”）。
 *   其余作物成熟时一次收（× 产量）：灵草 3 × (1 + 0.5r)、灵谷 兽粮 4、五种药引作物各 1 枚药引。
 *   产量 = (1 + 8% × 灵田等级) × 旺季 1.5（月星斗：季节项翻倍）× (1 + 守田) × 百草回春（灵草与药引作物 ×1.3）× 百草丹 ×2 × 留种 ×1.2 × 大旱 0.6 × 虫灾 0.5
 *   改种：那块田从头长；种药引就是放弃那块田的灵石。
 *   解锁（SYSTEMS §6.2；转世后全开；坊市“灵种”、春集“买灵种”提前一种）：灵草 / 灵稻 开田即有，灵谷 筑基，赤炎果 / 寒霜莲 筑基中期，惊雷竹 / 长生藤 金丹，养魂花 元婴。
 *   药引作物成熟时 3%：变种（剧情触发键 field_mutant）。
 *   L.CROPS_ON = false（sim 的 nocrops）：田里只有灵稻、不能改种（量这一刀的影响）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const rr = st => Math.min(st.p.r, 8);

// ---------- 药引 ----------
// 五种药引：逻辑里的键与 ART 的单字母（ART.yinCell / ART.icon('yin_f')）
L.YIN_KEYS = ['fire', 'ice', 'thunder', 'wood', 'soul'];
L.YIN_LETTER = { fire: 'f', ice: 'i', thunder: 't', wood: 'w', soul: 's' };
// 名字 L.YIN_N 在 gear.js（器方先用到）
L.newMats = () => ({ yin: { fire: 0, ice: 0, thunder: 0, wood: 0, soul: 0 } });
const mats = st => {
  if (!st.mats || typeof st.mats !== 'object') st.mats = L.newMats();
  if (!st.mats.yin || typeof st.mats.yin !== 'object') st.mats.yin = L.newMats().yin;
  for (const k of L.YIN_KEYS) if (!(st.mats.yin[k] >= 0)) st.mats.yin[k] = 0;
  return st.mats;
};
L.yinHave = (st, k) => Math.floor(mats(st).yin[k] || 0);
L.yinTotal = st => L.YIN_KEYS.reduce((a, k) => a + L.yinHave(st, k), 0);
L.addYin = function (st, k, n) {
  if (!L.YIN_N[k] || !n) return 0;
  const y = mats(st).yin;
  y[k] = Math.max(0, (y[k] || 0) + n);
  return n;
};
// 一组药引 { fire: 2, … } 够不够、付掉、写成文字
L.yinOk = (st, need) => Object.keys(need || {}).every(k => L.yinHave(st, k) >= need[k]);
L.yinPay = function (st, need) { if (!L.yinOk(st, need)) return false; for (const k in need) L.addYin(st, k, -need[k]); return true; };
L.yinText = need => Object.keys(need || {}).map(k => L.YIN_N[k] + ' ×' + need[k]).join('、');

// ---------- 作物（SYSTEMS §6.2；顺序同 ART.cropIds） ----------
// cyc 周期（月）；out 产出：stones 灵石（按月结算）/ herbs 灵草 / feed 兽粮 / 药引键；n 每收基数；s 旺季（0 春 1 夏 2 秋 3 冬）；open 解锁
L.CROPS = [
  { id: 'herb', n: '灵草', cyc: 3, out: 'herbs', n0: 3, s: 0, open: () => true, lock: '' },
  { id: 'rice', n: '灵稻', cyc: 3, out: 'stones', s: 2, open: () => true, lock: '' },
  { id: 'grain', n: '灵谷', cyc: 4, out: 'feed', n0: 4, s: 1, open: st => mr(st) >= 1, lock: '筑基解锁' },
  { id: 'fire', n: '赤炎果', cyc: 6, out: 'fire', n0: 1, s: 1, open: st => mi(st) >= 5, lock: '筑基中期解锁' },
  { id: 'ice', n: '寒霜莲', cyc: 6, out: 'ice', n0: 1, s: 3, open: st => mi(st) >= 5, lock: '筑基中期解锁' },
  { id: 'bolt', n: '惊雷竹', cyc: 6, out: 'thunder', n0: 1, s: 0, open: st => mr(st) >= 2, lock: '金丹解锁' },
  { id: 'vine', n: '长生藤', cyc: 6, out: 'wood', n0: 1, s: 0, open: st => mr(st) >= 2, lock: '金丹解锁' },
  { id: 'soul', n: '养魂花', cyc: 8, out: 'soul', n0: 1, s: 3, open: st => mr(st) >= 3, lock: '元婴解锁' },
];
const CROP = {}; for (const C of L.CROPS) CROP[C.id] = C;
L.CROP = CROP;
L.CROP_V = { plotEvery: 4, plotMax: 6, lvYield: 0.08, season: 0.5, baicao: 2, boost: 1.2, half: 0.5, mutant: 0.03 };
L.CROPS_ON = true;
const ON = () => L.CROPS_ON !== false;
L.isYinCrop = C => !!L.YIN_N[(typeof C === 'string' ? CROP[C] : C).out];
// 作物的产出写成文字：“灵草”“兽粮”“火引”“灵石”
L.cropOutN = C => (C.out === 'stones' ? '灵石' : C.out === 'herbs' ? '灵草' : C.out === 'feed' ? '兽粮' : L.YIN_N[C.out]);

// ---------- 田 ----------
L.plotCount = st => (st.home.field > 0 ? Math.min(L.CROP_V.plotMax, 1 + Math.floor(st.home.field / L.CROP_V.plotEvery)) : 0);
L.newCrops = () => ({ plots: [], prog: {}, seed: {}, boost: {}, half: -1, mut: '' });
// 田数按灵田等级补齐（新开的田默认灵稻，等价于旧的被动灵石）
L.cropsOf = function (st) {
  let c = st.crops;
  if (!c || typeof c !== 'object') c = st.crops = L.newCrops();
  const d = L.newCrops();
  for (const k in d) if (c[k] === undefined || c[k] === null) c[k] = d[k];
  if (!Array.isArray(c.plots)) c.plots = [];
  // 就地修（cropTick 正拿着这些对象长月，不能换成新的）
  for (let i = 0; i < c.plots.length; i++) { const x = c.plots[i]; if (!x || !CROP[x.c]) c.plots[i] = { c: 'rice', g: 0 }; else if (!(x.g >= 0)) x.g = 0; }
  const n = L.plotCount(st);
  while (c.plots.length < n) c.plots.push({ c: 'rice', g: 0 });
  if (c.plots.length > n) c.plots.length = n;
  if (!ON()) for (const x of c.plots) x.c = 'rice';
  return c;
};
L.plots = st => L.cropsOf(st).plots;
L.cropOpen = (st, id) => { const C = CROP[id]; if (!C) return false; if (!ON()) return id === 'rice'; return st.rebirth > 0 || C.open(st) || !!(st.crops && st.crops.seed && st.crops.seed[id]); };
L.cropLock = (st, id) => (L.cropOpen(st, id) ? '' : ON() ? CROP[id].lock : '');
// 灵田能不能改种（有田、且不止一种作物可种）
L.cropsOpen = st => ON() && L.plotCount(st) > 0 && L.CROPS.filter(C => L.cropOpen(st, C.id)).length > 1;
// 下一种还没解锁的作物（坊市“灵种”、春集“买灵种”给它）
L.nextLockedCrop = st => L.CROPS.find(C => !L.cropOpen(st, C.id)) || null;
L.riceCount = st => L.plots(st).filter(x => x.c === 'rice').length;
// 灵稻的份额：home.js 的“灵田”收入、秋季加成、守田灵宠、大旱都乘它（全种灵稻 = 1）
L.riceShare = st => { const n = L.plotCount(st); return n ? L.riceCount(st) / n : 0; };
L.fieldStoneInc = st => L.fieldInc(st.home.field) * L.riceShare(st);

// ---------- 产量 ----------
// 旺季：作物自己的季节 +50%（历法开放后；月星斗翻倍）
L.cropSeason = (st, C) => (L.calOpen(st) && L.season(st) === C.s ? L.CROP_V.season * L.seasonAmp(st) : 0);
// 产量拆解（灵稻不走这里：它的灵石按月走收入）：[[名, 倍率]…]
L.cropParts = function (st, id) {
  const C = CROP[id], V = L.CROP_V, c = L.cropsOf(st), out = [];
  const lv = st.home.field; if (lv > 0) out.push([`灵田 Lv${lv}`, 1 + V.lvYield * lv]);
  const s = L.cropSeason(st, C); if (s) out.push([`旺季·${L.SEASONS[C.s].n}`, 1 + s]);
  const pj = L.petJobVal ? L.petJobVal(st, 'field') : 0; if (pj) out.push(['灵宠守田', 1 + pj]);
  if ((C.out === 'herbs' || L.isYinCrop(C)) && L.fieldHerbMult(st) > 1) out.push(['百草回春', L.fieldHerbMult(st)]);   // 功法共鸣 c16（arts.js）
  if ((st.buffs || []).some(b => b.field)) out.push(['百草丹', V.baicao]);
  if (c.boost[id]) out.push(['留种', V.boost]);
  if (L.worldOn(st, 'w_dahan')) out.push(['大旱', 1 - L.WORLD_V.dahan]);
  if (st.tick < c.half) out.push(['虫灾（本季）', V.half]);
  return out;
};
L.cropYield = (st, id) => L.modProd(L.cropParts(st, id));
// 一茬收多少（灵稻：这一茬结的灵石 = cyc × 每块每月）
L.cropBase = (st, C) => (C.out === 'herbs' ? C.n0 * (1 + 0.5 * rr(st)) : C.n0 || 0);
L.cropHarvest = function (st, id) {
  const C = CROP[id];
  if (C.out === 'stones') { const n = L.plotCount(st); return n ? C.cyc * L.fieldInc(st.home.field) / n : 0; }
  return L.cropBase(st, C) * L.cropYield(st, id);
};
// 每月的平均产出（界面比较用）
L.cropPerTick = (st, id) => L.cropHarvest(st, id) / CROP[id].cyc;
// 田的生长阶段：0 芽 / 1 长 / 2 熟（ART.drawPlot）
L.plotStage = x => { const C = CROP[x.c]; const f = (x.g + 1) / C.cyc; return f >= 1 ? 2 : f > 0.4 ? 1 : 0; };
L.plotLeft = x => CROP[x.c].cyc - x.g;

// ---------- 改种 ----------
L.plantWhy = (st, i, id) => {
  if (!ON()) return '灵田只种灵稻';
  if (!L.plots(st)[i]) return '没有这块田';
  if (!CROP[id]) return '没有这种作物';
  if (!L.cropOpen(st, id)) return L.cropLock(st, id);
  return '';
};
L.plant = function (st, i, id) {
  if (L.plantWhy(st, i, id)) return false;
  const x = L.plots(st)[i];
  if (x.c === id) return true;
  x.c = id; x.g = 0;
  st.stats.plant = (st.stats.plant || 0) + 1;
  return true;
};
L.plantAll = function (st, id) {
  if (L.plantWhy(st, 0, id)) return 0;
  let n = 0;
  L.plots(st).forEach((x, i) => { if (x.c !== id) { L.plant(st, i, id); n++; } });
  if (n) L.log(st, `灵田全部改种${CROP[id].n}`);
  return n;
};

// ---------- 每月（tick.js 调）：各块长一月，成熟的自动收并续种 ----------
function give(st, C, v) {
  const c = st.crops, k = C.out;
  if (k === 'stones') return v;   // 灵稻的灵石已经按月进了收入
  if (k === 'feed') { st.feed = (st.feed || 0) + v; return v; }   // 兽粮本来就有零头（觅食 0.5/月）
  c.prog[k] = (c.prog[k] || 0) + v;
  const n = Math.floor(c.prog[k] + 1e-9);
  if (n <= 0) return 0;
  c.prog[k] -= n;
  if (k === 'herbs') st.herbs += n;
  else L.addYin(st, k, n);
  return n;
}
L.cropTick = function (st, out) {
  const c = L.cropsOf(st);
  if (!c.plots.length) return;
  const got = {};
  for (const x of c.plots) {
    const C = CROP[x.c];
    x.g++;
    if (x.g < C.cyc) continue;
    x.g = 0;
    const n = give(st, C, L.cropHarvest(st, x.c));
    if (n > 0) got[C.out] = (got[C.out] || 0) + n;
    st.stats.harvest = (st.stats.harvest || 0) + 1;
    // 变种：药引作物成熟时 3%（每世一次的剧情 home_field_mutant）
    if (L.isYinCrop(C) && !st.evDone.home_field_mutant && !st.storyQ.includes('home_field_mutant') && R() < L.CROP_V.mutant) { c.mut = x.c; L.fireTrigger(st, 'field_mutant'); }
  }
  if (out && Object.keys(got).length) out.harvest = got;
};

// ---------- 新档：core.js 的 L.newState 包一层，加上灵田、药引、丹囊与丹毒（alchemy.js 的 L.newDan） ----------
{ const ns = L.newState; L.newState = function (o) { const st = ns(o); st.crops = L.newCrops(); st.mats = L.newMats(); st.dan = L.newDan(); st.toxin = 0; L.cropsOf(st); return st; }; }

// ---------- 存档（可重复调用，不升版本） ----------
L.migrateCrops = function (s) {
  mats(s);
  // 秘境先上线时（realm.js 的占位登记）药引收在 st.yin：折进 st.mats.yin
  if (s.yin && typeof s.yin === 'object') { for (const k of L.YIN_KEYS) if (s.yin[k] > 0) s.mats.yin[k] += Math.floor(s.yin[k]); delete s.yin; }
  L.cropsOf(s);
  if (typeof s.toxin !== 'number' || !isFinite(s.toxin)) s.toxin = 0;
  return '';
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：fx.yin / cost.yin 换成真的药引；剧情触发键 field_mutant；一次性 flag field_half / mutant_seed / seed_early ----------
const yinOk = v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => L.YIN_KEYS.includes(k) && Number.isInteger(v[k]) && v[k] !== 0);
L.supportFx('yin', { ok: yinOk, apply: (st, v, out) => {
  const a = [];
  for (const k in v) { const n = v[k] > 0 ? v[k] : -Math.min(L.yinHave(st, k), -v[k]); L.addYin(st, k, n); if (n) a.push(`${L.YIN_N[k]} ${n > 0 ? '+' : '−'}${Math.abs(n)}`); }
  if (a.length) out.push(a.join('、'));
} });
L.supportCost('yin', { ok: (st, v) => L.yinOk(st, v), pay: (st, v) => { L.yinPay(st, v); }, text: (st, v) => L.yinText(v) });
L.supportTrigger('field_mutant');
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of [].concat(v)) {
    if (!/^(field_half|mutant_seed|seed_early)$/.test(f)) continue;
    delete st.eflags[f];
    const c = L.cropsOf(st);
    if (f === 'field_half') { c.half = L.monthNow(st) + L.seasonLeft(st); out.push('这一季灵田产量减半'); }
    if (f === 'mutant_seed') { const id = CROP[c.mut] ? c.mut : 'fire'; c.boost[id] = 1; out.push(`${CROP[id].n}留了种：以后产量 ×${L.CROP_V.boost}`); }
    if (f === 'seed_early') { const C = L.nextLockedCrop(st); if (C) { c.seed[C.id] = 1; out.push(`得了${C.n}的种子：提前能种（产出${L.cropOutN(C)}）`); } else out.push('（作物都能种了，种子收着当个念想）'); }
  }
} });
});
