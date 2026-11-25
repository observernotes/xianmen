/* 废柴仙途 · 逻辑模块 home：洞府设施、升级价格与收益说明
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 洞府四项。价格 = base × grow^lv（聚灵阵 40 × 1.62^lv，SYSTEMS §18；原 1.5）
L.HOME = [
  { k: 'array', n: '聚灵阵', base: 40, grow: 1.62, max: 30, d: lv => `修炼速度 ×${L.arrayMult(lv).toFixed(2)}` },
  // 灵田：田数 1 + floor(lv/4)（至多 6 块），每块种一种作物（crops.js）；全种灵稻时每周天灵石 = L.fieldInc(lv)
  { k: 'field', n: '灵田', base: 50, grow: 1.6, max: 30, d: lv => (lv ? `田 ${Math.min(6, 1 + Math.floor(lv / 4))} 块 · 全种灵稻每周天灵石 ${L.fmt(L.fieldInc(lv))}` : '开垦后种灵稻（灵石）或灵草，筑基后还有灵谷与药引') },
  { k: 'furnace', n: '丹炉', base: 120, grow: 1.75, max: 20, d: lv => (lv ? `成丹率 ${60 + lv * 3}% · 突破成功率 +${lv}%` : '建成后开启炼丹房，并提升突破成功率') },
  { k: 'cave', n: '洞府', base: 200, grow: 2.2, max: 12, d: lv => `寿元 +${lv * 5}% · 闭关 ×${(2 + 0.05 * lv).toFixed(2)} · ${caveName(lv)}` },
];
function caveName(lv) { return lv <= 0 ? '荒山破庙' : lv <= 2 ? '竹林小筑' : lv <= 5 ? '石壁洞府' : lv <= 8 ? '云中楼阁' : '琼楼仙宫'; }
L.caveName = caveName;
L.arrayMult = lv => Math.pow(1.08, lv);
L.fieldInc = lv => (lv > 0 ? 6 * Math.pow(1.42, lv) : 0);
L.vein = r => 4 * Math.pow(2.5, Math.min(r, 8));
// world_dahan「布阵求雨」：聚灵阵停 3 周天（calendar.js 的 L.arrayPaused）
L.addCulMod('array', 30, st => (L.arrayPaused(st) ? [`聚灵阵 Lv${st.home.array}（停阵求雨，剩 ${st.cal.pause - st.tick} 周天）`, 1, 'array'] : ['聚灵阵 Lv' + st.home.array, L.arrayMult(st.home.array), 'array']));
// 灵田的灵石只来自灵稻（crops.js 的 L.fieldStoneInc = L.fieldInc × 灵稻块数 / 田数；全种灵稻 = 旧公式）
L.addIncSrc('field', 10, st => [`灵田 Lv${st.home.field}${L.plotCount(st) && L.riceCount(st) < L.plotCount(st) ? `·灵稻 ${L.riceCount(st)}/${L.plotCount(st)} 块` : ''}`, L.fieldStoneInc(st), 'field']);
// 设施解锁：聚灵阵要先历练一趟，灵田两趟，丹炉和洞府扩建要炼气后期
L.homeOpen = function (st, k) {
  if (st.rebirth > 0 || (st.flags.maxR || 0) >= 1) return true;
  if (k === 'array') return st.stats.exp >= 1;
  if (k === 'field') return st.stats.exp >= 2;
  return L.si(st.p) >= 2;
};
L.homeLock = (st, k) => (L.homeOpen(st, k) ? '' : k === 'array' ? '先出去历练一趟' : k === 'field' ? '历练两趟后可开垦' : '炼气后期可建');

L.hCost = (k, lv) => { const b = L.HOME.find(x => x.k === k); return Math.floor(b.base * Math.pow(b.grow, lv)); };
// 升级值不值：聚灵阵看“每周天多多少修为、这一层提前几周天”，灵田看“几周天回本”
L.upInfo = function (st, k) {
  const b = L.HOME.find(x => x.k === k), lv = st.home[k];
  const o = { k, lv, max: lv >= b.max, cost: lv >= b.max ? 0 : L.hCost(k, lv), lock: L.homeLock(st, k), note: '' };
  if (o.max) return o;
  if (k === 'array') {
    const g = L.gainCalm(st), g1 = g * 1.08, left = Math.max(0, L.pNeed(st.p) - st.p.xp);
    o.d0 = g; o.d1 = g1;
    const save = g > 0 && !L.isFull(st) ? left / g - left / g1 : 0;
    o.note = `修炼 +${L.fmt1(g1 - g)}/周天` + (save >= 0.5 ? `，本层提前 ${Math.round(save)} 周天` : '');
  } else if (k === 'field') {
    // 按现在的灵稻份额算（全种灵稻 = 旧公式）；多开一块田时新田默认灵稻
    const n0 = L.plotCount(st), n1 = Math.min(L.CROP_V.plotMax, 1 + Math.floor((lv + 1) / L.CROP_V.plotEvery)), rice = L.riceCount(st);
    const s0 = n0 ? rice / n0 : 0, s1 = n1 ? (rice + (n1 - n0)) / n1 : 0;
    const d = L.fieldInc(lv + 1) * s1 - L.fieldInc(lv) * s0;
    o.d0 = L.fieldInc(lv) * s0; o.d1 = L.fieldInc(lv + 1) * s1; o.payback = d > 0 ? Math.ceil(o.cost / d) : Infinity;
    o.note = (d > 0 ? `灵石 +${L.fmt1(d)}/周天，${o.payback} 周天回本` : '田里没种灵稻：只加作物产量') + (n1 > n0 ? '；多开一块田' : '') + (lv ? `；作物产量 +${Math.round(L.CROP_V.lvYield * 100)}%` : '');
    const nb = L.nextBig(st);
    if (nb && nb.left < o.payback && nb.left <= 12) o.note += '（赶不上这一届）';
  } else if (k === 'furnace') o.note = lv ? '成丹率 +3%，突破 +1%' : '开启炼丹房：培元丹、破境丹、疗伤丹';
  else o.note = '寿元 +5%，闭关倍率 +0.05';
  return o;
};

// ---------- 洞府 ----------
L.upgrade = function (st, k) {
  const b = L.HOME.find(x => x.k === k);
  const lv = st.home[k];
  if (lv >= b.max || !L.homeOpen(st, k)) return false;
  const c = L.hCost(k, lv);
  if (st.stones < c) return false;
  st.stones -= c;
  st.home[k]++;
  st.flags.spentAt = st.tick;
  L.log(st, `${b.n}升至 ${st.home[k]} 级${k === 'cave' ? '：' + caveName(st.home[k]) : ''}`);
  L.checkQuests(st);
  return true;
};
});
