/* 废柴仙途 · 逻辑模块 core：工具、参数、境界与灵根表、名字、基础公式、新档、日志、修为累加
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
L.rng = Math.random;
L.hook = null;
function emit(type, data) { if (L.hook) L.hook(type, data); }
L.emit = emit;

// ---------- 工具 ----------
const R = () => L.rng();
function ri(a, b) { return a + Math.floor(R() * (b - a + 1)); }
function pick(a) { return a[Math.floor(R() * a.length)]; }
function wpick(list) { let t = 0; for (const x of list) t += x[1]; let v = R() * t; for (const x of list) { if ((v -= x[1]) < 0) return x[0]; } return list[list.length - 1][0]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
L.ri = ri; L.pick = pick; L.clamp = clamp;
L.U = { R, ri, pick, wpick, clamp, emit };
L.fmt = function (n) {
  n = Math.floor(n);
  const neg = n < 0; if (neg) n = -n;
  let s;
  if (n < 1e4) s = String(n);
  else if (n < 1e8) s = trim(n / 1e4) + '万';
  else if (n < 1e12) s = trim(n / 1e8) + '亿';
  else if (n < 1e16) s = trim(n / 1e12) + '万亿';
  else s = trim(n / 1e16) + '京';
  return neg ? '-' + s : s;
  function trim(x) { return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1).replace(/\.0$/, '') : x.toFixed(2).replace(/0$/, '').replace(/\.$/, ''); }
};
L.pct = p => Math.round(p * 100) + '%';

L.fmt1 = v => (v < 100 ? (Math.round(v * 10) / 10).toString() : L.fmt(v));

// ---------- 数值参数（模型见 docs/DESIGN.md §3；常数由 tools/sim.js 校准） ----------
// g0/gGrow：倍率为 1 时每周天修为 = g0 × gGrow^i；pw*：战力 = pw0 × pwStage^i × pwRealm^r
const P = L.P = { g0: 10, gGrow: 1.30, pw0: 10, pwStage: 1.5, pwRealm: 1.8 };
// TR：该境界在倍率 1 下的总周天；SW：四个小层各占的比例
L.TR = [50, 150, 400, 820, 1500, 2500, 4200, 6800, 10000];
L.SW = [0.19, 0.23, 0.27, 0.31];

// ---------- 静态数据 ----------
// rate: 冲击下一境界的基础成功率；life: 该境界寿元（年）；mpt: 一个周天流逝的年数（炼气期 12 周天一年）
L.REALMS = [
  { n: '炼气', robe: ['#5d6f8a', '#7f93ab', '#a9bacb'], trim: '#dfe7ef', rate: 0.85, trib: 0, life: 100, mpt: 1 / 12 },
  { n: '筑基', robe: ['#2f6e4b', '#4f9e68', '#7cc792'], trim: '#c9f0d4', rate: 0.60, trib: 0, life: 200, mpt: 1.6 },
  { n: '金丹', robe: ['#9a6a1c', '#d6a032', '#f2cc6a'], trim: '#fff0bd', rate: 0.50, trib: 3, life: 400, mpt: 2 },
  { n: '元婴', robe: ['#4f3a9e', '#7d5bd6', '#a98af0'], trim: '#e2d8ff', rate: 0.45, trib: 4, life: 800, mpt: 3 },
  { n: '化神', robe: ['#8e2a35', '#c8434e', '#ea7a80'], trim: '#ffd3d5', rate: 0.40, trib: 5, life: 1500, mpt: 5.5 },
  { n: '炼虚', robe: ['#24579a', '#3c84d6', '#76b0ee'], trim: '#d3e8ff', rate: 0.35, trib: 6, life: 3000, mpt: 11 },
  { n: '合体', robe: ['#18756c', '#2aa79b', '#5fd3c4'], trim: '#cff8f2', rate: 0.30, trib: 7, life: 6000, mpt: 20 },
  { n: '大乘', robe: ['#b9b3a5', '#e9e6dc', '#ffffff'], trim: '#ffd76a', rate: 0.25, trib: 8, life: 12000, mpt: 42 },
  { n: '渡劫', robe: ['#17131f', '#2e2838', '#4a4157'], trim: '#ffcc44', rate: 0.20, trib: 9, life: 24000, mpt: 80 },
  { n: '真仙', robe: ['#e8d48a', '#fff4c2', '#ffffff'], trim: '#ffffff', rate: 0, trib: 0, life: Infinity, mpt: 0 },
];
L.STAGES = ['初期', '中期', '后期', '圆满'];
L.MAXR = 8;

// 灵根七档。第一世（出身“弃徒”）的灵根靠四次觉醒一路抬上去，洗髓丹可以比剧情提前一档
L.TALENTS = [
  { n: '伪灵根', c: '#9aa0a6', cul: 0.7, atk: 0.85 },
  { n: '杂灵根', c: '#e6e1d3', cul: 1.0, atk: 1.0 },
  { n: '双灵根', c: '#62d26f', cul: 1.25, atk: 1.1 },
  { n: '单灵根', c: '#4aa8ff', cul: 1.5, atk: 1.2 },
  { n: '天灵根', c: '#c27dff', cul: 1.8, atk: 1.35 },
  { n: '先天道体', c: '#ffcf3f', cul: 2.1, atk: 1.5 },
  { n: '先天圣体', c: '#ff6b6b', cul: 2.5, atk: 1.7 },
];
// 觉醒：踏入 r 境界时把灵根抬到“至少 t 档”
L.AWAKE = [
  { r: 1, t: 3, n: '混沌灵根·初醒' },
  { r: 3, t: 4, n: '混沌灵根·二醒' },
  { r: 5, t: 5, n: '混沌道体·三醒' },
  { r: 7, t: 6, n: '混沌圣体·大成' },
];
// 灵根的显示信息：觉醒过的角色，档 3 以上用“混沌…”的名字和彩虹色
L.talentInfo = function (st, t) {
  if (t === undefined) t = st.p.t;
  const T0 = L.TALENTS[t];
  if (st && st.flags && st.flags.awoke && t >= 3) return { n: L.AWAKE[t - 3].n, c: 'rainbow', cul: T0.cul, atk: T0.atk };
  return T0;
};
L.awakens = st => (st.origin || 'qitu') === 'qitu';
// 洗髓丹的上限：比剧情觉醒高一档（没有剧情觉醒的出身不设限）
L.talentCap = function (st) {
  if (!L.awakens(st)) return 6;
  let t = 1;
  for (const a of L.AWAKE) if (st.p.r >= a.r) t = a.t;
  return Math.min(6, t + 1);
};
L.TRAITS = {
  hero:   { n: '主角光环', d: '奇遇把握 +5%，寻宝更容易出高阶' },
  sword:  { n: '先天剑骨', d: '战力×1.5' },
  wise:   { n: '悟性超群', d: '修炼速度×1.3' },
  alch:   { n: '丹道奇才', d: '突破成功率+15%，成丹率+15%' },
  lucky:  { n: '气运之子', d: '奇遇把握 +10%，宝物品质更高' },
  longev: { n: '长生之体', d: '寿元×1.5' },
  steady: { n: '道心坚定', d: '突破失败不受伤，修为只退半成' },
  koi:    { n: '锦鲤附体', d: '灵石收获×1.5' },
};

// ---------- 名字 ----------
const SUR = '李王张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文'.split('');
const SUR2 = ['慕容', '上官', '欧阳', '司马', '南宫', '独孤', '令狐', '东方', '西门', '公孙'];
const G1 = '清明子若无长玄凌紫寒星天云逸问浩景墨剑灵婉雪月风尘羽霜静素晴青轩昊沐辰瑶念知守怀承仲锦'.split('');
const G2 = '风云尘心玄渊河行遥霄羽霜烟月瑶儿宁澜歌舟白川竹秋书影然鸿野衡离渡宸璃笙岚溪'.split('');
L.randName = () => (R() < 0.08 ? pick(SUR2) : pick(SUR)) + pick(G1) + (R() < 0.85 ? pick(G2) : '');
const SECT_A = '青玄紫太灵万九赤寒落星凌归无金碧幽云烈苍昆神浩元'.split('');
const SECT_B = ['剑宗', '法阁', '虚宫', '霄宫', '机阁', '极殿', '霞宗', '元宗', '炎门', '冰谷', '灵宗', '华派', '兽山', '鼎派', '花谷', '刚寺', '阳宗', '月宫', '雷殿', '道院', '仙府', '剑阁', '魔宗'];
L.RIVALS = [
  { id: 'mu', q: 72, sect: '慕容家', title: '退婚之人' },
  { id: 'zhao', q: 45, name: '赵乾', sect: '天剑宗', title: '天剑宗大师兄' },
  { id: 'chu', q: 12, name: '楚天阔', sect: '天剑宗', title: '天剑宗圣子' },
  { id: 'xue', q: 4, name: '血无涯', sect: '血煞魔宗', title: '魔道圣子' },
  { id: 'yun', q: 1, name: '云无极', sect: '昆仑仙宫', title: '天下第一天骄' },
];

// ---------- 公式 ----------
L.si = p => p.r * 4 + p.s;
L.g0 = i => P.g0 * Math.pow(P.gGrow, i);
function sig2(x) { if (x <= 0) return 0; const e = Math.pow(10, Math.floor(Math.log10(x)) - 1); return Math.round(x / e) * e; }
L.need = i => { i = Math.min(i, 35); return sig2(L.g0(i) * L.TR[i >> 2] * L.SW[i & 3]); };
L.pNeed = p => L.need(L.si(p));
L.stageName = p => (p.r >= 9 ? '真仙' : L.REALMS[p.r].n + L.STAGES[p.s]);
// 修为圆满（不管人在哪）；isReady = 圆满且人在洞府，可以冲击大境界
L.isFull = st => st.p.r <= L.MAXR && st.p.s === 3 && st.p.xp >= L.pNeed(st.p);
L.isReady = st => !st.exp && L.isFull(st);
L.busy = st => !!(st.exp || st.retreat);
L.has = (st, k) => st.p.tr.includes(k);
L.lifespan = function (st) {
  const p = st.p;
  if (p.r >= 9) return Infinity;
  let y = L.REALMS[p.r].life * (1 + 0.05 * st.home.cave);
  if (L.has(st, 'longev')) y *= 1.5;
  if (L.friend(st, 'mo')) y *= 1.1;
  return y + (st.lifeBonus || 0);
};
L.lifeLeft = st => L.lifespan(st) - st.p.age;
L.lifeTicks = st => (st.p.r > L.MAXR ? Infinity : Math.max(0, Math.floor(L.lifeLeft(st) / L.REALMS[st.p.r].mpt)));
L.desperate = st => st.p.r <= L.MAXR && L.lifeLeft(st) < L.lifespan(st) * 0.12;
L.lifeLow = st => st.p.r <= L.MAXR && L.lifeLeft(st) < L.lifespan(st) * 0.30;
// 轮回加成：宿慧（修炼 +15%/级）与根骨（战力 +10%/级），各 5 级，存在 st.meta.perk
const perk = (st, k) => Math.min(5, ((st.meta && st.meta.perk) || {})[k] || 0);
L.rebCul = st => 1 + 0.15 * perk(st, 'wis');
L.rebAtk = st => 1 + 0.10 * perk(st, 'bone');

// ---------- 新档 ----------
L.newStats = () => ({ exp: 0, expWin: 0, bt: 0, events: 0, tour: 0, tourWins: 0, leapWins: 0, crafts: 0, perfect: 0, goodPill: 0, jiuzhuan: 0, btFails: 0, bosses: 0, despWin: 0,
  retreat: 0, tuna: 0, visits: 0, herbExp: 0, seekExp: 0, slayExp: 0, sectTasks: 0, auction: 0, meetWins: 0, compExp: 0, dings: 0, tians: 0, expStones: 0 });
L.newMeta = () => ({ aff: {}, perk: {}, seen: {} });
L.newState = function (o) {
  o = o || {};
  const female = !!o.female;
  const meta = o.meta || L.newMeta();
  meta.aff = meta.aff || {}; meta.perk = meta.perk || {}; meta.seen = meta.seen || {};
  const st = {
    v: 3, tick: 0, year: 0, stones: 20 + 500 * (meta.perk.purse || 0), pills: 0, lifeBonus: 0, lifePills: {},
    home: { cave: 0, array: 0, field: 0, furnace: 0 },
    exp: null, retreat: null, visitor: null, auction: null, tuna: 0, boxMiss: 0, lastExp: null, best: {},
    rank: 100, bestRank: 100, ladder: [], beaten: {}, pact: 0, sect: null,
    quest: { done: {} }, log: [], rebirth: o.rebirth || 0, lives: o.lives || [], flags: {}, seenTips: {}, origin: o.origin || 'qitu', meta,
    stats: L.newStats(),
    npc: {}, daolv: null, eflags: {}, evDone: {}, evLast: {}, storyQ: [], buffs: [], bonus: { cul: 0, atk: 0 },
    herbs: 0, herbProg: 0, treasure: 0, regionWins: {}, bosses: {}, ach: {}, titles: [], title: '', achQ: [],
    p: {
      name: o.name || '林逸尘', look: { hair: '#2a2230', skin: '#f2c9a0', f: female ? 1 : 0 },
      t: o.t !== undefined ? o.t : 1, tr: o.tr || ['hero'], r: 0, s: 0, xp: 0, over: 0, age: 16,
      w: 0, wn: '', a: 0, an: '', pet: null, inj: 0, fails: 0,
    },
    exName: female ? '慕容轩' : '慕容雪',
  };
  // 天骄榜
  const used = new Set([st.p.name]);
  const ladder = [];
  while (ladder.length < 99) {
    const n = L.randName();
    if (used.has(n)) continue;
    used.add(n);
    ladder.push({ n, s: pick(SECT_A) + pick(SECT_B) });
  }
  for (const rv of L.RIVALS) ladder[rv.q - 1] = { n: rv.id === 'mu' ? st.exName : rv.name, s: rv.sect, id: rv.id };
  st.ladder = ladder;
  return st;
};

L.log = function (st, text, cls) {
  st.log.unshift({ t: `第${Math.floor(st.year) + 1}年`, text, cls: cls || '' });
  if (st.log.length > 60) st.log.length = 60;
  emit('log', { text, cls });
};

// ---------- 修为 ----------
// 圆满之后多出来的修为记入 p.over（至多下一境界初期所需的 20%），突破成功后带过去，不再白白浪费
L.overCap = p => (p.r >= L.MAXR ? 0 : 0.2 * L.need(L.si(p) + 1));
function addXp(st, g) {
  const p = st.p;
  if (p.r > L.MAXR || !(g > 0)) return;
  p.xp += g;
  let ups = 0;
  while (p.s < 3 && p.xp >= L.pNeed(p)) { p.xp -= L.pNeed(p); p.s++; ups++; }
  if (p.s === 3 && p.xp >= L.pNeed(p)) {
    const extra = p.xp - L.pNeed(p);
    p.xp = L.pNeed(p);
    if (extra > 0) p.over = Math.min((p.over || 0) + extra, L.overCap(p));
    if (!st.flags.readyNotified) { st.flags.readyNotified = 1; emit('ready', p); }
  } else st.flags.readyNotified = 0;
  if (ups) emit('stageUp', { ups });
}
L.addXp = addXp;
});
