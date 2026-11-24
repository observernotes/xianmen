/* 废柴仙途 · 核心逻辑（浏览器与 node 模拟共用）
 * 时间单位是“周天”（tick）。境界越高，一个周天在凡间流逝的年数越多。 */
(function (root) {
'use strict';
const L = {};
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
L.WEAPONS = [
  { n: '赤手空拳', m: 1 },
  { n: '凡器', m: 1.3, names: ['精钢剑', '铁木棍', '柳叶刀', '青竹笛'] },
  { n: '法器', m: 1.7, names: ['青锋剑', '玄铁剑', '寒光扇', '流云袖'] },
  { n: '灵器', m: 2.3, names: ['紫电锤', '寒冰枪', '碧落伞', '赤炎剑'] },
  { n: '法宝', m: 3.1, names: ['九龙鼎', '乾坤镜', '缚龙索', '紫金钵'] },
  { n: '灵宝', m: 4.2, names: ['诛邪剑', '昊天塔', '定海珠', '太阴镜'] },
  { n: '仙器', m: 5.7, names: ['斩仙飞刀', '山河社稷图', '混元金斗', '落星剑'] },
  { n: '混沌至宝', m: 8, names: ['开天神斧', '鸿蒙紫气', '造化玉碟'] },
];
L.ARTS = [
  { n: '基础吐纳', m: 1 },
  { n: '黄阶', m: 1.15, names: ['长春功', '引气诀', '五行拳经'] },
  { n: '玄阶', m: 1.35, names: ['太虚引气诀', '青木长生功', '烈阳诀'] },
  { n: '地阶', m: 1.6, names: ['九转玄功', '大衍诀', '星辰炼体术'] },
  { n: '天阶', m: 1.9, names: ['太乙真经', '紫府天书', '万剑归宗'] },
  { n: '仙阶', m: 2.25, names: ['混元道经', '太上忘情录', '周天星斗大法'] },
  { n: '神阶', m: 2.7, names: ['鸿蒙造化经', '大道无极篇'] },
];
L.PETS = [
  { n: '无', m: 1 },
  { n: '灵兽', m: 1.2, c: ['#f2f0ea', '#cfcbbf', '#a39e90'], names: ['雪团灵狐', '月牙兔', '青羽雀'] },
  { n: '妖兽', m: 1.45, c: ['#f08a3c', '#c8622a', '#8e3f19'], names: ['赤焰虎', '火鬃狮', '铁背熊'] },
  { n: '灵禽', m: 1.75, c: ['#6fd0e8', '#3f9fc4', '#2a6e91'], names: ['青鸾', '冰羽鹤', '雷翼隼'] },
  { n: '神兽幼崽', m: 2.1, c: ['#9fe08a', '#5fae52', '#3a7a36'], names: ['玄武幼龟', '青麟兽', '白泽'] },
  { n: '上古神兽', m: 2.5, c: ['#f6e7ff', '#d6b8ff', '#a67ee6'], names: ['九尾天狐', '冰凰', '貔貅'] },
  { n: '太古真灵', m: 3.0, c: ['#ffe27a', '#f0b429', '#b87b10'], names: ['太古金龙', '麒麟', '金乌'] },
];
// 洞府四项。价格 = base × grow^lv
L.HOME = [
  { k: 'array', n: '聚灵阵', base: 40, grow: 1.5, max: 30, d: lv => `修炼速度 ×${L.arrayMult(lv).toFixed(2)}` },
  { k: 'field', n: '灵田', base: 50, grow: 1.6, max: 30, d: lv => (lv ? `每周天灵石 ${L.fmt(L.fieldInc(lv))}、灵草 ${(L.fieldHerb(lv)).toFixed(1)}` : '开垦后每周天自己长灵石和灵草') },
  { k: 'furnace', n: '丹炉', base: 120, grow: 1.75, max: 20, d: lv => (lv ? `成丹率 ${60 + lv * 3}% · 突破成功率 +${lv}%` : '建成后开启炼丹房，并提升突破成功率') },
  { k: 'cave', n: '洞府', base: 200, grow: 2.2, max: 12, d: lv => `寿元 +${lv * 5}% · 闭关 ×${(2 + 0.05 * lv).toFixed(2)} · ${caveName(lv)}` },
];
function caveName(lv) { return lv <= 0 ? '荒山破庙' : lv <= 2 ? '竹林小筑' : lv <= 5 ? '石壁洞府' : lv <= 8 ? '云中楼阁' : '琼楼仙宫'; }
L.caveName = caveName;
L.arrayMult = lv => Math.pow(1.08, lv);
L.fieldInc = lv => (lv > 0 ? 6 * Math.pow(1.42, lv) : 0);
L.fieldHerb = lv => 0.1 * lv;
L.vein = r => 4 * Math.pow(2.5, Math.min(r, 8));
// 设施解锁：聚灵阵要先历练一趟，灵田两趟，丹炉和洞府扩建要炼气后期
L.homeOpen = function (st, k) {
  if (st.rebirth > 0 || (st.flags.maxR || 0) >= 1) return true;
  if (k === 'array') return st.stats.exp >= 1;
  if (k === 'field') return st.stats.exp >= 2;
  return L.si(st.p) >= 2;
};
L.homeLock = (st, k) => (L.homeOpen(st, k) ? '' : k === 'array' ? '先出去历练一趟' : k === 'field' ? '历练两趟后可开垦' : '炼气后期可建');

// 历练：地点 k × 深度 d × 行事 a
L.REGIONS = [
  { n: '后山野林', mon: 2, foe: 'beast', fc: ['#8a7a66', '#5f5244'], bg: 'forest', desc: '野狼出没，适合初入仙途' },
  { n: '黑风岭', mon: 2, foe: 'man', fc: ['#4a4a52', '#2c2c34'], bg: 'hill', desc: '一伙劫道的散修匪寇' },
  { n: '落日古墓', mon: 2, foe: 'man', fc: ['#cfc8b0', '#8f876c'], bg: 'tomb', desc: '筑基老祖的埋骨之地，尸骨成精' },
  { n: '万妖山脉', mon: 3, foe: 'beast', fc: ['#6a8f3a', '#3f5e22'], bg: 'forest', desc: '妖兽成群，凶险异常' },
  { n: '血煞秘境', mon: 3, foe: 'man', fc: ['#b0303c', '#6a1820'], bg: 'blood', desc: '魔道遗留的小世界，血气冲天' },
  { n: '上古剑冢', mon: 3, foe: 'orb', fc: ['#d8f0ff', '#7fb8e0'], bg: 'swords', desc: '万剑埋骨之地，剑灵游荡' },
  { n: '九幽魔渊', mon: 3, foe: 'man', fc: ['#6a2a8a', '#3a1450'], bg: 'abyss', desc: '深不见底，魔气翻涌' },
  { n: '东海龙宫', mon: 4, foe: 'snake', fc: ['#3fb0c8', '#1f6e8a'], bg: 'sea', desc: '龙族秘藏，宝光冲霄' },
  { n: '天外星墟', mon: 4, foe: 'orb', fc: ['#ffe28a', '#c9a032'], bg: 'stars', desc: '破碎星辰的残骸，藏有仙人遗物' },
  { n: '太古仙府', mon: 4, foe: 'man', fc: ['#e0c070', '#9a7a30'], bg: 'palace', desc: '上古大能的洞府，傀儡守卫森严' },
  { n: '混沌裂隙', mon: 5, foe: 'snake', fc: ['#2a2a3a', '#0e0e18'], bg: 'chaos', desc: '天地初开时留下的伤痕' },
];
L.DEPTHS = ['外围', '腹地', '禁地'];
// stone/herb/item：灵石、灵草、法宝功法掉率的倍率
L.APPR = [
  { k: 'slay', n: '斩妖', stone: 1.3, herb: 1, item: 1, d: '灵石多，归来另得战斗感悟' },
  { k: 'seek', n: '寻宝', stone: 0.7, herb: 1, item: 2, d: '法宝功法掉率翻倍，天材地宝更多' },
  { k: 'herb', n: '采药', stone: 0.8, herb: 3, item: 0.5, d: '灵草三倍，风险低，易遇灵兽' },
];
// 相性（斩妖/寻宝/采药）：2 = ◎，1 = ○，0 = △。每张图恰好各一个
L.AFF = [[1, 0, 2], [2, 1, 0], [0, 2, 1], [2, 0, 1], [1, 2, 0], [0, 2, 1], [2, 1, 0], [1, 0, 2], [0, 2, 1], [1, 2, 0], [2, 0, 1]];
L.AFF_SYM = ['△', '○', '◎'];
L.RATINGS = ['丁', '丙', '乙', '甲', '天'];
L.RATE_TH = [48, 66, 88, 105];           // 丙、乙、甲、天 的分数线
L.RATE_M = [0.15, 0.6, 1.0, 1.5, 2.0];   // 各评价的奖励倍率
L.ratingOf = s => (s >= L.RATE_TH[3] ? 4 : s >= L.RATE_TH[2] ? 3 : s >= L.RATE_TH[1] ? 2 : s >= L.RATE_TH[0] ? 1 : 0);
L.rec = (k, d) => 6 * Math.pow(12, k) * Math.pow(2.3, d || 0);
L.rew = (k, d) => 55 * Math.pow(2.9, k) * Math.pow(1.35, d || 0);
L.expLen = k => 4 + (k >= 3 ? 1 : 0) + (k >= 7 ? 1 : 0);
// 地点需要的境界（小层序号）：黑风岭筑基，落日古墓筑基后期，之后每个大境界一张，混沌裂隙要渡劫圆满
const REG_SI = [0, 4, 6, 8, 12, 16, 20, 24, 28, 32, 35];
L.regionNeed = k => { const i = REG_SI[k]; return L.REALMS[i >> 2].n + L.STAGES[i & 3]; };

// 坊市：价格 = base × 2.6^r
L.MARKET = [
  { k: 'pill', n: '破境丹', d: '突破时服用，每枚成功率 +15%（一次最多三枚）；负伤时可服一枚疗伤', base: 60 },
  { k: 'life', n: '延寿丹', d: '寿元 +10%，每个大境界最多服用三枚', base: 250, minR: 1 },
  { k: 'box', n: '寻宝', d: '随机得到一件法宝或一部功法；连续两次没提升，第三次必出更高一阶', base: 150 },
  { k: 'egg', n: '灵兽蛋', d: '孵化一只灵宠，品阶随机', base: 400, minR: 1 },
];
L.price = (st, k) => Math.floor(L.MARKET.find(m => m.k === k).base * Math.pow(2.6, Math.min(st.p.r, 8)));
L.marketOpen = (st, k) => { const m = L.MARKET.find(x => x.k === k); return !m.minR || st.p.r >= m.minR || (st.flags.maxR || 0) >= m.minR; };

// 宗门
L.SECTS = [
  { id: 'jian', n: '太虚剑宗', d: '天下剑修圣地', perk: '战力 ×1.2；斩妖相性高一档；宝库法宝便宜三成', fit: '适合：爱历练', atk: 1.2, cul: 1, bt: 0, color: '#4aa8ff' },
  { id: 'dan', n: '丹霞谷', d: '丹道第一宗门', perk: '突破 +10%；成丹率 +15%、丹效 ×1.3；每 6 周天俸禄附一枚破境丹', fit: '适合：爱炼丹', atk: 1, cul: 1, bt: 0.1, pill: true, color: '#ff8a5c' },
  { id: 'dao', n: '玄天道宗', d: '传承万年的道法正宗', perk: '修炼 ×1.2；闭关花费 −30%，顿悟概率 30%→45%', fit: '适合：爱闭关', atk: 1, cul: 1.2, bt: 0, color: '#c27dff' },
];
// 宗门身份：r 需要的境界，c 需要的累计贡献（60 × 4.2^(k−1)），pay 俸禄倍率
L.SRANKS = [
  { n: '外门弟子', r: 0, c: 0, pay: 0.5 },
  { n: '内门弟子', r: 1, c: 60, pay: 1 },
  { n: '真传弟子', r: 2, c: 252, pay: 1.5 },
  { n: '圣子', nf: '圣女', r: 3, c: 1058, pay: 2.5, duel: true },
  { n: '长老', r: 4, c: 4445, pay: 4 },
  { n: '太上长老', r: 6, c: 18670, pay: 6 },
  { n: '宗主', r: 7, c: 78415, pay: 10 },
];
L.sectOf = st => { if (!st.sect) return null; if (!st.sect.order) { st.sect.order = L.NINE.map(x => x.id); st.sect.veins = st.sect.veins || 0; st.sect.meets = st.sect.meets || 0; st.sect.best = st.sect.order.indexOf(st.sect.id) + 1; } return L.SECTS.find(x => x.id === st.sect.id); };
L.srankName = (st, i) => { const R0 = L.SRANKS[i]; return st.p.look.f && R0.nf ? R0.nf : R0.n; };
L.pay = st => (st.sect ? L.vein(st.p.r) * L.SRANKS[st.sect.rank].pay * L.sectPayMult(st) : 0);
// ---------- 九大宗门（宗门榜） ----------
// pos: 初始排名；champ: 会武代表；eq: 该名次代表相当于天骄榜第几名
L.NINE = [
  { id: 'kunlun', n: '昆仑仙宫', champ: '云无极', line: '昆仑之巅，从不为谁让路。' },
  { id: 'tianjian', n: '天剑宗', champ: '楚天阔', line: '当年的弃徒，也配代表一宗？' },
  { id: 'xuesha', n: '血煞魔宗', champ: '血无涯', line: '正道宗门？不过是待宰的羔羊。' },
  { id: 'wanfa', n: '万法阁', champ: '诸葛千机', line: '你的每一招，我都算到了。' },
  { id: 'jingang', n: '金刚寺', champ: '慧能大师', line: '阿弥陀佛，施主请回吧。' },
  { id: 'jian', n: '太虚剑宗', champ: '剑十三', line: '我这一剑，你接不住。' },
  { id: 'dao', n: '玄天道宗', champ: '玄微子', line: '道法自然，胜负亦然。请。' },
  { id: 'dan', n: '丹霞谷', champ: '丹红袖', line: '丹修也能打，你信不信？' },
  { id: 'yushou', n: '御兽山', champ: '驭天风', line: '我的兽群，会把你撕成碎片。' },
];
const NINE_EQ = [3, 9, 16, 26, 38, 50, 62, 74, 88];
L.ninePower = (st, pos) => L.rivalPower(st, NINE_EQ[pos - 1]);
L.sectOrder = st => (st.sect ? st.sect.order : null);
L.sectPos = st => (st.sect ? st.sect.order.indexOf(st.sect.id) + 1 : 0);
L.sectPayMult = st => { if (!st.sect || !st.sect.order) return 1; const b = st.sect.build || {}; return (1 + 0.08 * (9 - L.sectPos(st))) * (1 + 0.25 * (st.sect.veins || 0)) * (1 + 0.25 * (b.vein || 0)); };
L.nineAt = (st, pos) => L.NINE.find(x => x.id === st.sect.order[pos - 1]);
L.canPromote = function (st) {
  if (!st.sect) return false;
  const nx = L.SRANKS[st.sect.rank + 1];
  return !!nx && st.p.r >= nx.r && st.sect.total >= nx.c;
};
// 一趟 k 号地点乙等历练的贡献；任务、论道、会武的贡献都以它为单位
L.CONTRIB = { base: 10, grow: 2.3, tour: 1, meet: 2, task: 2 };
L.contribFor = k => Math.floor(L.CONTRIB.base * Math.pow(L.CONTRIB.grow, k));
function addContrib(st, v) { v = Math.floor(v); if (!st.sect || v <= 0) return 0; st.sect.total += v; st.sect.pts += v; return v; }
// 宗门宝库（贡献兑换）
L.VAULT = [
  { k: 'vart', n: '秘传功法', d: '本宗不传之秘' },
  { k: 'vwep', n: '镇宗法宝', d: '借出镇宗之宝，归你所有' },
  { k: 'vpill', n: '破境丹 ×2', d: '宗门丹房特供' },
];
L.vaultTier = (st, k) => { const up = Math.floor(((st.sect.build || {}).lib || 0) / 2); return k === 'vart' ? Math.min(6, st.sect.rank + 1 + up) : k === 'vwep' ? Math.min(7, st.sect.rank + 2 + up) : 0; };
L.vaultCost = function (st, k) {
  if (k === 'vpill') return Math.floor(15 * Math.pow(2.3, st.p.r));
  if (st.sect.freePick > 0) return 0;   // 札记奖励：宝库任选一件
  return Math.floor((k === 'vart' ? 40 : 60) * Math.pow(3.2, st.sect.rank) * (k === 'vwep' && st.sect.id === 'jian' ? 0.7 : 1));
};
// 宗主建设：成为宗主后灵石的去处
L.BUILDS = [
  { k: 'ward', n: '护山大阵', d: '宗门战事按战力 ×1.15/级 计算' },
  { k: 'lib', n: '藏经阁', d: '每 2 级宝库兑换阶 +1' },
  { k: 'vein', n: '灵脉', d: '俸禄 +25%/级' },
];
L.buildCost = lv => 2e6 * Math.pow(3, lv);
L.sectBuild = function (st, k) {
  if (!st.sect || st.sect.rank < 6 || !L.BUILDS.some(b => b.k === k)) return false;
  const b = st.sect.build || (st.sect.build = { ward: 0, lib: 0, vein: 0 });
  if (b[k] >= 5 || st.stones < L.buildCost(b[k])) return false;
  st.stones -= L.buildCost(b[k]); b[k]++; st.flags.spentAt = st.tick;
  L.log(st, `宗门建设：${L.BUILDS.find(x => x.k === k).n}升至 ${b[k]} 级`, 'gold');
  L.checkQuests(st);
  return true;
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
// 状态倍率：打坐 ×1；闭关 ×(2 + 0.05×洞府等级)；历练中 ×0.5
L.retMult = st => 2 + 0.05 * st.home.cave;
L.statusMult = st => (st.exp ? 0.5 : st.retreat ? st.retreat.m : 1);
// 不含“状态”和负伤的修炼速度（吐纳、顿悟、培元丹按它结算）
L.gainBase = function (st) {
  const p = st.p, i = Math.min(L.si(p), 35);
  let m = L.TALENTS[p.t].cul * L.ARTS[p.a].m * L.arrayMult(st.home.array) * L.rebCul(st);
  const sc = L.sectOf(st); if (sc) m *= sc.cul;
  if (L.has(st, 'wise')) m *= 1.3;
  m *= L.culMult(st);
  return L.g0(i) * m;
};
L.gain = function (st) {
  let g = L.gainBase(st) * L.statusMult(st);
  if (st.p.inj > 0) g *= 0.5;
  return g;
};
L.power = function (st) {
  const p = st.p, i = L.si(p);
  let v = P.pw0 * Math.pow(P.pwStage, i) * Math.pow(P.pwRealm, p.r);
  v *= L.TALENTS[p.t].atk * L.WEAPONS[p.w].m * L.PETS[p.pet ? p.pet.tier : 0].m * L.rebAtk(st);
  if (L.has(st, 'sword')) v *= 1.5;
  const sc = L.sectOf(st); if (sc) v *= sc.atk;
  v *= L.atkMult(st);
  if (p.inj > 0) v *= 0.6;
  return v;
};
L.income = function (st) {
  let s = L.fieldInc(st.home.field) + L.vein(st.p.r) + L.pay(st);
  if (L.has(st, 'koi')) s *= 1.5;
  return s;
};
// 升到下一小层（或圆满）还要几个周天，按当前速度
L.ticksToNext = st => { const g = L.gain(st); return g > 0 ? Math.max(0, Math.ceil((L.pNeed(st.p) - st.p.xp) / g)) : Infinity; };
// 数值拆解：给“变强”面板展示每一项数值从哪来
L.breakdown = function (st) {
  const p = st.p, i = Math.min(L.si(p), 35), sc = L.sectOf(st), TI = L.talentInfo(st);
  const cul = [], atk = [], inc = [];
  const baseCul = L.g0(i);
  cul.push(['灵根·' + TI.n, TI.cul, 'talent']);
  cul.push(['功法·' + (p.a ? p.an : '基础吐纳'), L.ARTS[p.a].m, 'art']);
  cul.push(['聚灵阵 Lv' + st.home.array, L.arrayMult(st.home.array), 'array']);
  if (L.rebCul(st) > 1) cul.push(['宿慧（轮回）', L.rebCul(st), '']);
  if (sc && sc.cul !== 1) cul.push(['宗门·' + sc.n, sc.cul, 'sect']);
  if (L.has(st, 'wise')) cul.push(['天赋·悟性超群', 1.3, '']);
  if (st.bonus.cul) cul.push(['机缘加成', 1 + st.bonus.cul, '']);
  if (L.friend(st, 'su')) cul.push(['知己·' + L.npcName(st, 'su'), 1.1, '']);
  if (st.daolv) cul.push(['道侣双修', 1.25, '']);
  for (const b of st.buffs || []) if (b.cul) cul.push(['丹药增益（剩' + b.left + '周天）', b.cul, '']);
  if (st.exp) cul.push(['历练途中', 0.5, '']);
  if (st.retreat) cul.push([(st.retreat.kind === 'train' ? '老祖特训' : st.retreat.kind === 'teach' ? '指点师弟' : '闭关') + '（剩' + st.retreat.left + '周天）', st.retreat.m, '']);
  if (p.inj > 0) cul.push(['负伤（剩' + p.inj + '周天）', 0.5, '']);
  const baseAtk = P.pw0 * Math.pow(P.pwStage, i) * Math.pow(P.pwRealm, p.r);
  atk.push(['灵根·' + TI.n, TI.atk, 'talent']);
  atk.push(['法宝·' + (p.w ? p.wn : '赤手空拳'), L.WEAPONS[p.w].m, 'weapon']);
  atk.push(['灵宠·' + (p.pet ? p.pet.name : '无'), L.PETS[p.pet ? p.pet.tier : 0].m, 'pet']);
  if (L.rebAtk(st) > 1) atk.push(['根骨（轮回）', L.rebAtk(st), '']);
  if (L.has(st, 'sword')) atk.push(['天赋·先天剑骨', 1.5, '']);
  if (sc && sc.atk !== 1) atk.push(['宗门·' + sc.n, sc.atk, 'sect']);
  if (st.bonus.atk) atk.push(['机缘加成', 1 + st.bonus.atk, '']);
  if (L.friend(st, 'ye')) atk.push(['知己·' + L.npcName(st, 'ye'), 1.1, '']);
  if (L.friend(st, 'chu')) atk.push(['知己·楚狂', 1.15, '']);
  for (const b of st.buffs || []) if (b.atk) atk.push(['增益（剩' + b.left + '周天）', b.atk, '']);
  if (p.inj > 0) atk.push(['负伤', 0.6, '']);
  const koi = L.has(st, 'koi') ? 1.5 : 1;
  inc.push(['灵田 Lv' + st.home.field, L.fieldInc(st.home.field) * koi, 'field']);
  inc.push(['灵脉（' + L.REALMS[Math.min(p.r, 8)].n + '）', L.vein(p.r) * koi, '']);
  if (st.sect) inc.push(['宗门俸禄·' + L.srankName(st, st.sect.rank), L.pay(st) * koi, 'sect']);
  return { baseCul, cul, gain: L.gain(st), baseAtk, atk, power: L.power(st), inc, income: L.income(st) };
};
// 吐纳：在洞府打坐时每周天蓄 1/6，蓄满后点自己，立得 1 周天修为
L.TUNA_FULL = 6;
L.tunaReady = st => (st.tuna || 0) >= L.TUNA_FULL && !L.busy(st) && !L.isFull(st) && st.p.r <= L.MAXR;
L.tuna = function (st) {
  if (!L.tunaReady(st)) return 0;
  st.tuna = 0;
  st.stats.tuna = (st.stats.tuna || 0) + 1;
  const g = L.gainBase(st) * (st.p.inj > 0 ? 0.5 : 1);
  addXp(st, g);
  L.checkQuests(st);
  return g;
};
L.hCost = (k, lv) => { const b = L.HOME.find(x => x.k === k); return Math.floor(b.base * Math.pow(b.grow, lv)); };
// 升级值不值：聚灵阵看“每周天多多少修为、这一层提前几周天”，灵田看“几周天回本”
L.upInfo = function (st, k) {
  const b = L.HOME.find(x => x.k === k), lv = st.home[k];
  const o = { k, lv, max: lv >= b.max, cost: lv >= b.max ? 0 : L.hCost(k, lv), lock: L.homeLock(st, k), note: '' };
  if (o.max) return o;
  if (k === 'array') {
    const g = L.gain(st), g1 = g * 1.08, left = Math.max(0, L.pNeed(st.p) - st.p.xp);
    o.d0 = g; o.d1 = g1;
    const save = g > 0 && !L.isFull(st) ? left / g - left / g1 : 0;
    o.note = `修炼 +${L.fmt1(g1 - g)}/周天` + (save >= 0.5 ? `，本层提前 ${Math.round(save)} 周天` : '');
  } else if (k === 'field') {
    const d = L.fieldInc(lv + 1) - L.fieldInc(lv);
    o.d0 = L.fieldInc(lv); o.d1 = L.fieldInc(lv + 1); o.payback = Math.ceil(o.cost / d);
    o.note = `灵石 +${L.fmt1(d)}/周天，${o.payback} 周天回本`;
    const nb = L.nextBig(st);
    if (nb && nb.left < o.payback && nb.left <= 12) o.note += '（赶不上这一届）';
  } else if (k === 'furnace') o.note = lv ? '成丹率 +3%，突破 +1%' : '开启炼丹房：培元丹、破境丹';
  else o.note = '寿元 +5%，闭关倍率 +0.05';
  return o;
};
L.fmt1 = v => (v < 100 ? (Math.round(v * 10) / 10).toString() : L.fmt(v));
// 突破成功率。n = 服几枚破境丹（true 表示尽量多，最多三枚）
L.BT = { pill: 0.15, maxPills: 3, furnace: 0.01, fail: 0.10, desperate: 0.25 };
L.btPills = (st, n) => (n === true ? Math.min(L.BT.maxPills, st.pills) : clamp(Math.floor(n || 0), 0, Math.min(L.BT.maxPills, st.pills)));
// 老祖护法：第一世第一次冲击筑基必成
L.btGuard = st => st.rebirth === 0 && st.p.r === 0 && !st.flags.guardUsed;
L.btParts = function (st, n) {
  const p = st.p; n = L.btPills(st, n);
  const a = [['基础', L.REALMS[Math.min(p.r, 8)].rate]];
  if (n) a.push([`破境丹 ×${n}`, n * L.BT.pill]);
  if (st.home.furnace) a.push(['丹炉 Lv' + st.home.furnace, st.home.furnace * L.BT.furnace]);
  if (p.fails) a.push([`屡败屡战 ×${p.fails}`, p.fails * L.BT.fail]);
  if (L.has(st, 'alch')) a.push(['丹道奇才', 0.15]);
  const sc = L.sectOf(st); if (sc && sc.bt) a.push([sc.n, sc.bt]);
  if (L.desperate(st)) a.push(['绝境', L.BT.desperate]);
  return a;
};
L.btRate = function (st, n) {
  if (st.flags.sureBt || L.btGuard(st)) return 1;
  let v = 0; for (const x of L.btParts(st, n)) v += x[1];
  return clamp(v, 0.05, 1);
};

// 天骄榜对手战力 = exp(A(名次) + 0.016 × 周天)。A 的锚点线性插值；
// 对手涨得比玩家慢，每位宿敌卡在设计好的时间段（见 §3.10）
const RA = [[1, 14.6], [4, 12.2], [12, 8.9], [45, 5.7], [72, 3.3], [100, 1.6]];
L.RIVAL_SLOPE = 0.016;
L.rivalA = function (q) {
  for (let j = 0; j < RA.length - 1; j++) {
    const [q0, a0] = RA[j], [q1, a1] = RA[j + 1];
    if (q >= q0 && q <= q1) return a0 + (a1 - a0) * (q - q0) / (q1 - q0);
  }
  return RA[RA.length - 1][1];
};
L.rivalPower = (st, q) => Math.exp(L.rivalA(q) + L.RIVAL_SLOPE * st.tick);
L.rivalAt = function (st, q) { if (q === st.rank) return null; return st.ladder[q < st.rank ? q - 1 : q - 2]; };
L.rivalRank = function (st, id) { const i = st.ladder.findIndex(x => x.id === id); if (i < 0) return 0; return i + 1 < st.rank ? i + 1 : i + 2; };

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

// ---------- 札记：每个大境界一章（一个主线目标 + 一串小任务） ----------
// c: 完成条件；rw: 奖励 { stones, inc（×当时每周天收入）, pills, herbs, treasure, contrib, title, vault }；go: 界面【前往】去哪
const mr = st => st.flags.maxR || 0;
const maxI = st => Math.max(st.flags.maxI || 0, L.si(st.p));
const fullAt = r => st => mr(st) > r || (st.p.r === r && L.isFull(st));
const bestGE = (k, d, v) => st => (st.best[k + '_' + d] || 0) >= v;
const srank = n => st => !!st.sect && st.sect.rank >= n;
const affMax = st => Math.max(0, ...Object.keys(st.npc || {}).map(id => st.npc[id].aff || 0));
L.affFound = st => { let n = 0; for (const key in st.meta.aff) if (L.AFF[Math.floor(key / 3)][key % 3] === 2) n++; return n; };
L.CHAPTERS = [
  { n: '废柴', realm: '炼气',
    main: { t: st => (st.pact < 0 ? '论道上击败{EX}' : '赢下三年之约'), c: st => !!st.beaten.mu, rw: { stones: 800 }, go: 'big' },
    tasks: [
      { t: '外出历练一次', c: st => st.stats.exp >= 1, rw: { stones: 150 }, go: 'exp' },
      { t: '聚灵阵升到 1 级', c: st => st.home.array >= 1, rw: { pills: 1 }, go: 'home' },
      { t: '用【采药】历练一次', c: st => st.stats.herbExp >= 1, rw: { stones: 100 }, go: 'exp' },
      { t: '修到炼气中期', c: st => maxI(st) >= 1, rw: { stones: 60 }, go: 'cult' },
      { t: '闭关一次', c: st => st.stats.retreat >= 1, rw: { stones: 80 }, go: 'home' },
      { t: '开一块灵田', c: st => st.home.field >= 1, rw: { herbs: 5 }, go: 'home' },
      { t: '见一位访客', c: st => st.stats.visits >= 1, rw: { pills: 1 }, go: 'cult' },
      { t: '后山野林腹地评价乙以上', c: bestGE(0, 1, 2), rw: { stones: 200 }, go: 'exp' },
      { t: '吐纳 3 次', c: st => st.stats.tuna >= 3, rw: { stones: 60 }, go: 'cult' },
      { t: '修到炼气圆满', c: fullAt(0), rw: { stones: 200 }, go: 'cult' },
      { t: '突破筑基', c: st => mr(st) >= 1, rw: { stones: 400 }, go: 'cult' },
    ] },
  { n: '入宗', realm: '筑基',
    main: { t: '晋升内门弟子，并进入天骄榜前 60', c: st => srank(1)(st) && st.bestRank <= 60, rw: { stones: 1500, pills: 2 }, go: 'sect' },
    tasks: [
      { t: '拜入一方宗门', c: st => !!st.sect, rw: { stones: 500 }, go: 'sect' },
      { t: '完成 1 个宗门任务', c: st => st.stats.sectTasks >= 1, rw: { contrib: 30 }, go: 'sect' },
      { t: '黑风岭外围评价乙以上', c: bestGE(1, 0, 2), rw: { stones: 300 }, go: 'exp' },
      { t: '收服一只灵宠', c: st => !!st.p.pet, rw: { stones: 600 }, go: 'market' },
      { t: '炼一炉丹', c: st => st.stats.crafts >= 1, rw: { herbs: 10 }, go: 'home' },
      { t: '击败独眼狼王', c: st => !!st.bosses[0], rw: { treasure: 1 }, go: 'exp' },
      { t: '论道赢一场', c: st => st.stats.tourWins >= 1, rw: { stones: 400 }, go: 'me' },
      { t: '发现 3 个 ◎ 相性', c: st => L.affFound(st) >= 3, rw: { stones: 500 }, go: 'exp' },
      { t: '修到筑基圆满', c: fullAt(1), rw: { stones: 1000 }, go: 'cult' },
    ] },
  { n: '金丹', realm: '金丹',
    main: { t: '晋升真传弟子，并击败赵乾', c: st => srank(2)(st) && !!st.beaten.zhao, rw: { inc: 10, treasure: 1 }, go: 'sect' },
    tasks: [
      { t: '渡过金丹雷劫', c: st => mr(st) >= 2, rw: { stones: 2500 }, go: 'cult' },
      { t: '落日古墓禁地评价乙以上', c: bestGE(2, 2, 2), rw: { inc: 8 }, go: 'exp' },
      { t: '与一人结为知己', c: st => affMax(st) >= 60, rw: { inc: 8 }, go: 'me' },
      { t: '在拍卖会买一件', c: st => st.stats.auction >= 1, rw: { pills: 2 }, go: 'market' },
      { t: '九宗会武赢一场', c: st => st.stats.meetWins >= 1, rw: { inc: 10 }, go: 'sect' },
      { t: '得到一件灵器', c: st => st.p.w >= 3, rw: { inc: 8 }, go: 'market' },
      { t: '击败两个首领', c: st => st.stats.bosses >= 2, rw: { treasure: 1 }, go: 'exp' },
      { t: '修到金丹圆满', c: fullAt(2), rw: { inc: 12 }, go: 'cult' },
    ] },
  { n: '元婴', realm: '元婴',
    main: { t: st => `成为${st.p.look.f ? '圣女' : '圣子'}`, c: srank(3), rw: { inc: 15, vault: 1 }, go: 'sect' },
    tasks: [
      { t: '修成元婴', c: st => mr(st) >= 3, rw: { inc: 10 }, go: 'cult' },
      { t: '带同伴历练一次', c: st => st.stats.compExp >= 1, rw: { inc: 8 }, go: 'exp' },
      { t: '炼出上品丹', c: st => st.stats.goodPill >= 1, rw: { herbs: 30 }, go: 'home' },
      { t: '天骄榜进入前 20', c: st => st.bestRank <= 20, rw: { inc: 12 }, go: 'me' },
      { t: '结为道侣，或与一人到四心', c: st => !!st.daolv || affMax(st) >= 80, rw: { inc: 12 }, go: 'me' },
      { t: '万妖山脉禁地评价乙以上', c: bestGE(3, 2, 2), rw: { inc: 10 }, go: 'exp' },
      { t: '修到元婴圆满', c: fullAt(3), rw: { inc: 15 }, go: 'cult' },
    ] },
  { n: '化神', realm: '化神',
    main: { t: '击败楚天阔，并在九宗会武压过天剑宗', c: st => !!st.beaten.chu && !!st.flags.beatTianjian, rw: { inc: 20, title: '剑压天剑' }, go: 'me' },
    tasks: [
      { t: '踏入化神', c: st => mr(st) >= 4, rw: { inc: 12 }, go: 'cult' },
      { t: '晋升长老', c: srank(4), rw: { inc: 15 }, go: 'sect' },
      { t: '击败剑冢守墓人', c: st => !!st.bosses[5], rw: { treasure: 2 }, go: 'exp' },
      { t: '炼成九转金丹', c: st => st.stats.jiuzhuan >= 1, rw: { inc: 12 }, go: 'home' },
      { t: '宗门榜进入前五', c: st => !!st.sect && st.sect.best <= 5, rw: { inc: 15 }, go: 'sect' },
      { t: '修到化神圆满', c: fullAt(4), rw: { inc: 18 }, go: 'cult' },
    ] },
  { n: '炼虚', realm: '炼虚',
    main: { t: '击退来犯的天剑宗', c: st => !!st.flags.warWon, rw: { inc: 25, title: '山门之盾' }, go: 'sect' },
    tasks: [
      { t: '踏入炼虚', c: st => mr(st) >= 5, rw: { inc: 15 }, go: 'cult' },
      { t: '为宗门夺 2 条灵脉', c: st => !!st.sect && (st.sect.veins || 0) >= 2, rw: { inc: 15 }, go: 'sect' },
      { t: '天骄榜进入前 8', c: st => st.bestRank <= 8, rw: { inc: 18 }, go: 'me' },
      { t: '九幽魔渊禁地评价乙以上', c: bestGE(6, 2, 2), rw: { inc: 15 }, go: 'exp' },
      { t: '与一人到五心', c: st => affMax(st) >= 100, rw: { inc: 18 }, go: 'me' },
      { t: '修到炼虚圆满', c: fullAt(5), rw: { inc: 20 }, go: 'cult' },
    ] },
  { n: '合体', realm: '合体',
    main: { t: '击败血无涯', c: st => !!st.beaten.xue, rw: { inc: 30, title: '魔道克星' }, go: 'me' },
    tasks: [
      { t: '踏入合体', c: st => mr(st) >= 6, rw: { inc: 18 }, go: 'cult' },
      { t: '晋升太上长老', c: srank(5), rw: { inc: 20 }, go: 'sect' },
      { t: '宗门榜进入前三', c: st => !!st.sect && st.sect.best <= 3, rw: { inc: 20 }, go: 'sect' },
      { t: '击败东海蛟皇', c: st => !!st.bosses[7], rw: { treasure: 2 }, go: 'exp' },
      { t: '修到合体圆满', c: fullAt(6), rw: { inc: 25 }, go: 'cult' },
    ] },
  { n: '大乘', realm: '大乘',
    main: { t: '成为宗主，并带宗门登顶', c: st => srank(6)(st) && st.sect.best <= 1, rw: { inc: 40, title: '万宗之主' }, go: 'sect' },
    tasks: [
      { t: '踏入大乘', c: st => mr(st) >= 7, rw: { inc: 20 }, go: 'cult' },
      { t: '宗门建设任一项 3 级', c: st => !!st.sect && L.BUILDS.some(b => ((st.sect.build || {})[b.k] || 0) >= 3), rw: { inc: 20 }, go: 'sect' },
      { t: '天骄榜进入前 2', c: st => st.bestRank <= 2, rw: { inc: 25 }, go: 'me' },
      { t: '击败仙府傀儡王', c: st => !!st.bosses[9], rw: { treasure: 3 }, go: 'exp' },
      { t: '修到大乘圆满', c: fullAt(7), rw: { inc: 30 }, go: 'cult' },
    ] },
  { n: '渡劫', realm: '渡劫',
    main: { t: '渡过飞升天劫，白日飞升', c: st => st.p.r >= 9, rw: {}, go: 'cult' },
    tasks: [
      { t: '踏入渡劫', c: st => mr(st) >= 8, rw: { inc: 25 }, go: 'cult' },
      { t: '登顶天骄榜', c: st => st.bestRank <= 1, rw: { inc: 40 }, go: 'me' },
      { t: '备好一枚九转金丹', c: st => !!st.flags.sureBt, rw: { inc: 20 }, go: 'home' },
      { t: '听完老祖的诀别', c: st => !!st.eflags.st_farewell, rw: { title: '戒中余音' }, go: 'cult' },
      { t: '修到渡劫圆满', c: fullAt(8), rw: { inc: 30 }, go: 'cult' },
    ] },
];
L.CHAPTERS.forEach((ch, r) => { ch.main.id = 'c' + r + '_m'; ch.main.main = true; ch.main.ch = r; ch.tasks.forEach((t, j) => { t.id = 'c' + r + '_' + j; t.ch = r; }); });
L.questText = (st, q) => (typeof q.t === 'function' ? q.t(st) : q.t).replace('{EX}', st.exName);
L.rewardText = function (st, rw) {
  const a = [];
  if (!rw) return '';
  if (rw.stones) a.push('灵石+' + L.fmt(rw.stones));
  if (rw.inc) a.push('灵石+' + L.fmt(Math.floor(rw.inc * Math.max(L.income(st), 20))));
  if (rw.pills) a.push('破境丹+' + rw.pills);
  if (rw.herbs) a.push('灵草+' + rw.herbs);
  if (rw.treasure) a.push('天材地宝+' + rw.treasure);
  if (rw.contrib) a.push('贡献+' + rw.contrib);
  if (rw.vault) a.push('宝库任选一件');
  if (rw.title) a.push('称号「' + rw.title + '」');
  return a.join(' ');
};
function grantReward(st, rw) {
  const text = L.rewardText(st, rw);
  if (!rw) return text;
  if (rw.stones) st.stones += rw.stones;
  if (rw.inc) st.stones += Math.floor(rw.inc * Math.max(L.income(st), 20));
  if (rw.pills) st.pills += rw.pills;
  if (rw.herbs) st.herbs += rw.herbs;
  if (rw.treasure) st.treasure += rw.treasure;
  if (rw.contrib) addContrib(st, rw.contrib);
  if (rw.vault && st.sect) st.sect.freePick = (st.sect.freePick || 0) + 1;
  if (rw.title) L.grantTitle(st, rw.title);
  return text;
}
// 完成即领。只检查已经到过的境界对应的章节；上一章没做完的主线仍然可以完成
L.checkQuests = function (st) {
  if (!st.quest) st.quest = { done: {} };
  st.flags.maxI = maxI(st);
  const top = Math.min(8, Math.max(mr(st), st.p.r));
  for (let r = 0; r <= top; r++) {
    const ch = L.CHAPTERS[r];
    for (const q of ch.tasks.concat([ch.main])) {
      if (st.quest.done[q.id] || !q.c(st)) continue;
      st.quest.done[q.id] = 1;
      const text = grantReward(st, q.rw);
      emit('quest', { id: q.id, t: L.questText(st, q), rw: text, main: !!q.main, ch: r });
      L.log(st, `【${q.main ? '第' + '一二三四五六七八九'[r] + '章·完' : '札记'}】${L.questText(st, q)}${text ? '，' + text : ''}`, 'gold');
    }
  }
};
// 界面用：当前章节、主线、前三条未完成的小任务、以前章节没做完的主线
L.questView = function (st) {
  const r = Math.min(8, st.p.r), ch = L.CHAPTERS[r], done = (st.quest && st.quest.done) || {};
  const list = ch.tasks.filter(q => !done[q.id]).slice(0, 3);
  const old = [];
  for (let j = 0; j < r; j++) if (!done[L.CHAPTERS[j].main.id]) old.push(L.CHAPTERS[j].main);
  const main = done[ch.main.id] ? null : ch.main;
  return { r, ch, main, list, old, first: list[0] || main || old[0] || null, doneN: ch.tasks.filter(q => done[q.id]).length, total: ch.tasks.length };
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

// ---------- 宝物 ----------
function rollTier(st, base, max) {
  const lucky = L.has(st, 'lucky') ? 2 : L.has(st, 'hero') ? 1.4 : 1;
  let t = base;
  if (R() < 0.2 * lucky) t++;
  if (R() < 0.05 * lucky) t++;
  if (R() < 0.15) t--;
  return clamp(t, 1, max);
}
L.giveItem = function (st, kind, tier, name) {
  const p = st.p;
  if (kind === 'pet') {
    tier = clamp(tier, 1, L.PETS.length - 1);
    const T = L.PETS[tier];
    const it = { kind, tier, name: name || pick(T.names) };
    if (!p.pet || p.pet.tier < tier) { const first = !p.pet; p.pet = { tier, name: it.name }; it.equip = true; if (first) L.fireTrigger(st, 'pet'); }
    else { it.value = Math.floor(L.price(st, 'egg') * 0.3); st.stones += it.value; }
    return it;
  }
  const list = kind === 'w' ? L.WEAPONS : L.ARTS;
  tier = clamp(tier, 1, list.length - 1);
  const it = { kind, tier, name: name || pick(list[tier].names) };
  if (p[kind] < tier) { p[kind] = tier; p[kind + 'n'] = it.name; it.equip = true; }
  else { it.value = Math.floor(L.price(st, 'box') * 0.3); st.stones += it.value; }
  return it;
};
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
    // 保底：连续两次没带来提升，第三次必得“当前最高阶 +1”（上限 2 + r 阶）
    const capW = Math.min(7, 2 + r), capA = Math.min(6, 2 + r);
    let it;
    if ((st.boxMiss || 0) >= 2 && (p.w < capW || p.a < capA)) {
      const kind = p.w < capW && (p.a >= capA || p.w <= p.a) ? 'w' : 'a';
      it = L.giveItem(st, kind, p[kind] + 1); it.pity = true;
    } else {
      const kind = R() < 0.55 ? 'w' : 'a';
      it = L.giveItem(st, kind, rollTier(st, 1 + Math.floor(r * (kind === 'w' ? 0.75 : 0.6)), kind === 'w' ? 7 : 6));
    }
    st.boxMiss = it.equip ? 0 : (st.boxMiss || 0) + 1;
    L.checkQuests(st);
    return { k, it };
  }
  if (k === 'egg') {
    const it = L.giveItem(st, 'pet', rollTier(st, 1 + Math.floor(r * 0.6), 6));
    L.checkQuests(st);
    return { k, it };
  }
  return null;
};
// 拍卖会（金丹解锁）：每 24 周天一次，开 6 周天，三件一口价的拍品，各约 20 周天的收入
L.AUCTION = { every: 24, at: 8, len: 6, price: 20 };
L.auctionOpen = st => !!st.auction && st.tick < st.auction.until;
function rollAuction(st) {
  const p = st.p, inc = Math.max(L.income(st), 20), pool = [];
  if (p.w < 7) pool.push({ k: 'w', tier: p.w + 1, n: L.WEAPONS[p.w + 1].n + '一件', m: 1.2 });
  if (p.a < 6) pool.push({ k: 'a', tier: p.a + 1, n: L.ARTS[p.a + 1].n + '功法一部', m: 1.2 });
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

// ---------- 突破 ----------
// n：服几枚破境丹（0～3；true 表示尽量多）。失败：修为退到 70%，负伤 3 周天，下次 +10%
L.breakthrough = function (st, n) {
  if (!L.isReady(st)) return null;
  const p = st.p;
  n = L.btPills(st, n);
  const guard = L.btGuard(st), sure = !!st.flags.sureBt;
  const rate = L.btRate(st, n);
  if (guard || sure) n = 0;            // 必成的时候不浪费丹药
  st.pills -= n;
  if (st.retreat) st.retreat = null;
  const ok = R() < rate;
  if (!guard && sure) st.flags.sureBt = 0;
  const desp = L.desperate(st);
  const from = p.r;
  const before = L.power(st);
  const res = { ok, from, to: from + 1, rate, usedPill: n > 0, pills: n, guard, before, trib: L.REALMS[Math.min(from + 1, 8)].trib, ascend: from === L.MAXR, lifeBefore: L.lifespan(st) };
  st.stats.bt++;
  if (ok) {
    if (guard) st.flags.guardUsed = 1;
    const carry = Math.min(p.over || 0, L.overCap(p));
    p.r++; p.s = 0; p.xp = 0; p.over = 0; p.fails = 0; st.flags.readyNotified = 0;
    st.flags.guardUsed = 1;
    st.flags.maxR = Math.max(st.flags.maxR || 0, p.r);
    if (L.awakens(st)) {
      const aw = L.AWAKE.find(a => a.r === p.r);
      if (aw) {
        st.flags.awoke = L.AWAKE.indexOf(aw) + 1;
        res.awaken = { from: p.t, to: Math.max(p.t, aw.t), n: aw.n, stage: st.flags.awoke };
        p.t = res.awaken.to;
      }
    }
    if (desp) st.stats.despWin++;
    res.sure = sure;
    L.fireTrigger(st, 'realm:' + p.r);
    if (p.r >= 9) { res.ascend = true; st.flags.ascended = 1; L.log(st, `★ ${p.name} 渡过九九天劫，白日飞升！`, 'gold'); }
    else { if (carry > 0) { res.carry = carry; addXp(st, carry); } L.log(st, `突破成功，踏入${L.REALMS[p.r].n}期！寿元增至 ${L.fmt(L.lifespan(st))} 年`, p.r >= 2 ? 'gold' : 'jade'); }
    res.after = L.power(st);
    res.lifeAfter = L.lifespan(st);
  } else {
    p.fails++; st.stats.btFails++;
    if (!L.has(st, 'steady')) { p.xp = Math.floor(L.pNeed(p) * 0.7); p.inj = Math.max(p.inj, 3); }
    else p.xp = Math.floor(L.pNeed(p) * 0.95);
    p.over = 0;
    st.flags.readyNotified = 0;
    res.after = L.power(st);
    L.log(st, `冲击${from >= L.MAXR ? '飞升' : L.REALMS[from + 1].n}失败……下次成功率 +${Math.round(L.BT.fail * 100)}%`, 'red');
  }
  L.checkQuests(st);
  return res;
};

// ---------- 历练 ----------
L.bestOf = (st, k, d) => (st.best && st.best[k + '_' + d]) || 0;
// 地点解锁：境界够，且上一张图的外围评价过乙（黑风岭：筑基，或后山野林腹地评价乙）
L.regionOpen = function (st, k) {
  if (k <= 0) return true;
  if (k >= L.REGIONS.length) return false;
  const i = Math.max(L.si(st.p), st.flags.maxI || 0);
  if (k === 1) return i >= REG_SI[1] || L.bestOf(st, 0, 1) >= 2;
  return i >= REG_SI[k] && L.bestOf(st, k - 1, 0) >= 2;
};
L.regionLock = function (st, k) {
  if (L.regionOpen(st, k)) return '';
  const i = Math.max(L.si(st.p), st.flags.maxI || 0);
  if (k === 1) return '筑基后开放，或后山野林腹地评价乙';
  if (i < REG_SI[k]) return `${L.regionNeed(k)}后开放`;
  return `${L.REGIONS[k - 1].n}外围评价乙后开放`;
};
L.depthOpen = (st, k, d) => d <= 0 || L.bestOf(st, k, d - 1) >= 2;
// 行事：第二趟解锁采药，第四趟解锁寻宝
L.apprOpen = (st, a) => a === 0 || st.rebirth > 0 || st.stats.exp >= (a === 2 ? 1 : 3);
L.firstTrip = st => st.rebirth === 0 && st.stats.exp === 0;
// 第一世第一趟只能去后山野林外围斩妖（保底评价甲、掉一把凡器）
L.expOpen = function (st, k, d, a) {
  if (L.firstTrip(st) && (k || d || a)) return false;
  return L.regionOpen(st, k) && L.depthOpen(st, k, d) && L.apprOpen(st, a);
};
L.homeRegion = function (st) { let k = 0; for (let j = 1; j < L.REGIONS.length; j++) if (L.regionOpen(st, j)) k = j; else break; return k; };
// 相性：太虚剑宗的斩妖高一档
L.affOf = function (st, k, a) { let v = L.AFF[k][a]; if (a === 0 && st.sect && st.sect.id === 'jian') v = Math.min(2, v + 1); return v; };
L.affKnown = (st, k, a) => !!(st.meta && st.meta.aff && st.meta.aff[k * 3 + a]);
L.affSym = (st, k, a) => (L.affKnown(st, k, a) ? L.AFF_SYM[L.affOf(st, k, a)] : '？');
// 分数里确定的三项：斩获（战力比）、身法（相性，采药 +6）、胆魄（禁地 +3、同伴与称号）
L.expExtra = () => 0;   // 同伴与称号加成，阶段四接入
L.expParts = function (st, k, d, a) {
  const T = L.power(st), rec = L.rec(k, d), ratio = T / rec;
  return { T, rec, ratio, pow: 70 + 25 * Math.log2(Math.max(ratio, 1e-9)), aff: (L.affOf(st, k, a) - 1) * 12 + (a === 2 ? 6 : 0), guts: (d === 2 ? 3 : 0) + L.expExtra(st, k, d, a) };
};
// 出发确认页用：预计评价区间、负伤风险、灵石大约多少。没试过的相性按 ○ 估，并标 unknown
L.expForecast = function (st, k, d, a) {
  const pt = L.expParts(st, k, d, a), known = L.affKnown(st, k, a);
  const base = pt.pow + (known ? pt.aff : (a === 2 ? 6 : 0)) + pt.guts;
  const first = L.firstTrip(st) && !k && !d && !a;
  const pGE = th => clamp((base + 12 - th) / 24, 0, 1);
  const dist = [1 - pGE(L.RATE_TH[0]), pGE(L.RATE_TH[0]) - pGE(L.RATE_TH[1]), pGE(L.RATE_TH[1]) - pGE(L.RATE_TH[2]), pGE(L.RATE_TH[2]) - pGE(L.RATE_TH[3]), pGE(L.RATE_TH[3])];
  let lo = L.ratingOf(base - 12), hi = L.ratingOf(base + 12 - 1e-9), risk = dist[0], em = 0;
  if (first) { lo = hi = 3; risk = 0; em = L.RATE_M[3]; }
  else for (let j = 0; j < 5; j++) em += dist[j] * L.RATE_M[j];
  const leap = pt.ratio < 0.6;
  let stones = L.rew(k, d) * em * L.APPR[a].stone * (leap ? (dist[2] + dist[3] + dist[4] > 0 ? 1.5 : 1) : 1);
  if (L.has(st, 'koi')) stones *= 1.5;
  if (L.friend(st, 'ye')) stones *= 1.2;
  return { k, d, a, T: pt.T, rec: pt.rec, ratio: pt.ratio, base, lo, hi, risk, dist, pOk: dist[2] + dist[3] + dist[4], leap, unknown: !known, first,
    text: lo === hi ? L.RATINGS[lo] : L.RATINGS[lo] + '～' + L.RATINGS[hi], stones: Math.floor(stones), len: L.expLen(k),
    warnFull: L.isFull(st), warnInj: st.p.inj > 0 ? st.p.inj : 0 };
};
// 推荐格：“预计评价至少乙”（负伤风险为 0 且八成以上乙）的最高一格
L.expBest = function (st, a) {
  let best = null;
  for (let k = 0; k < L.REGIONS.length; k++) for (let d = 0; d < 3; d++) {
    const aa = a === undefined ? 0 : a;
    if (!L.expOpen(st, k, d, aa)) continue;
    const f = L.expForecast(st, k, d, aa);
    if (f.first || (f.risk <= 0 && f.pOk >= 0.8)) { if (!best || L.rew(k, d) > L.rew(best.k, best.d)) best = { k, d, a: aa, f }; }
  }
  return best || { k: 0, d: 0, a: 0, f: L.expForecast(st, 0, 0, 0) };
};
L.chainOpen = st => st.rebirth > 0 || (st.flags.maxR || 0) >= 2;
// opt.chain：连续几趟（金丹解锁，最多 3）；opt.escort：护送任务的序号（本趟灵石归宗门，贡献 ×3）
L.startExp = function (st, k, d, a, opt) {
  d = d || 0; a = a || 0; opt = opt || {};
  if (L.busy(st) || st.p.r > L.MAXR || !L.expOpen(st, k, d, a)) return false;
  const rg = L.REGIONS[k], len = L.expLen(k), pt = L.expParts(st, k, d, a);
  // 出发时把评价和掉落的随机数都掷好，途中逐步揭示，读档不会变
  const plan = { pow: pt.pow, aff: pt.aff, guts: pt.guts, ratio: pt.ratio, rnd: -12 + 24 * R(), adj: 0, u: [R(), R(), R(), R(), R(), R(), R()], enc: R() };
  if (L.firstTrip(st)) { plan.fix = 3; plan.gift = 1; }
  let chain = 0;
  if (opt.chain > 1 && L.chainOpen(st)) chain = Math.min(3, Math.floor(opt.chain)) - 1;
  st.exp = { k, d, a, left: len, total: len, plan, chain };
  if (opt.escort !== undefined && st.sect && st.sect.tasks) { const t = st.sect.tasks[opt.escort]; if (t && t.ty === 'escort' && t.taken && !t.done && t.k === k) st.exp.escort = opt.escort; }
  st.lastExp = { k, d, a };
  st.tuna = 0;
  if (!opt.quiet) L.log(st, `御剑出发，前往【${rg.n}·${L.DEPTHS[d]}】${L.APPR[a].n}`);
  return true;
};
// 按预掷的随机数算出这一趟的评价与收获（纯计算，不改存档）
function expCalc(st, e) {
  const pl = e.plan, k = e.k, d = e.d, a = e.a, A = L.APPR[a], u = pl.u;
  const score = pl.pow + pl.aff + pl.guts + pl.rnd + (pl.adj || 0);
  const rating = pl.fix !== undefined ? pl.fix : L.ratingOf(score);
  const m = L.RATE_M[rating];
  const leap = pl.ratio < 0.6 && rating >= 2;
  const o = { k, d, a, score, rating, m, leap, ratio: pl.ratio, parts: { pow: pl.pow, luck: pl.rnd + (pl.adj || 0), aff: pl.aff, guts: pl.guts } };
  let stones = L.rew(k, d) * m * A.stone * (0.9 + 0.2 * u[0]) * (leap ? 2 : 1);
  if (L.has(st, 'koi')) stones *= 1.5;
  if (L.friend(st, 'ye')) stones *= 1.2;
  if (e.escort !== undefined) stones = 0;
  o.stones = Math.floor(stones);
  o.herbs = Math.round((2 + k) * (1 + 0.5 * d) * A.herb * m);
  o.pills = rating >= 1 && u[1] < 0.4 ? 1 : 0;
  o.drops = [];
  if (pl.gift) o.drops.push(['w', 1]);
  else {
    if (u[2] < 0.30 * m * A.item) o.drops.push(['w', 1 + Math.floor((3 * k + d) * 0.21) + (u[3] < 0.15 ? 1 : 0)]);
    if (u[4] < 0.25 * m * A.item) o.drops.push(['a', 1 + Math.floor((3 * k + d) * 0.18)]);
  }
  if (rating >= 1 && st.p.r >= 1 && u[5] < 0.06 * (a === 2 ? 2.5 : 1)) o.drops.push(['pet', 1 + Math.floor(k * 0.5)]);
  o.treasure = rating >= 1 && u[6] < (0.03 + 0.01 * k) * (a === 1 ? (d === 2 ? 4 : 2) : 1) ? 1 : 0;
  o.contrib = st.sect ? Math.floor(L.contribFor(k) * m * (leap ? 2 : 1) * (e.escort !== undefined ? 3 : 1)) : 0;
  o.xpTicks = a === 0 ? m : 0;   // 斩妖：归来得 1 周天修为 × 奖励倍率（战斗感悟）
  return o;
}
// 途中 HUD 用：这一趟到目前为止“看得见”的收获
L.expPreview = function (st, frac) {
  if (!st.exp) return null;
  const e = st.exp, o = expCalc(st, e);
  const f = frac === undefined ? (e.total - e.left) / e.total : frac;
  return { k: e.k, d: e.d, a: e.a, left: e.left, total: e.total, stones: Math.floor(o.stones * f), herbs: Math.floor(o.herbs * f), finds: Math.floor((o.drops.length + o.treasure + o.pills) * f + 1e-9), xp: L.gainBase(st) * o.xpTicks * f };
};
// 撤回：收获减半立即回家
L.recallExp = function (st) {
  if (!st.exp) return null;
  st.exp.recall = 1; st.exp.chain = 0;
  return L.resolveExp(st);
};
L.resolveExp = function (st) {
  const e = st.exp; if (!e) return null;
  st.exp = null;
  const k = e.k, d = e.d, a = e.a;
  if (!e.plan) return legacyExp(st, e);
  const pw0 = L.power(st), gain0 = L.gain(st);
  const res = expCalc(st, e);
  res.items = []; res.first = !!e.plan.gift; res.ok = res.rating >= 2; res.unlock = [];
  if (e.recall) { res.recall = true; res.stones = Math.floor(res.stones / 2); res.herbs = Math.floor(res.herbs / 2); res.pills = 0; res.drops = []; res.treasure = 0; res.contrib = Math.floor(res.contrib / 2); res.xpTicks = 0; res.rating = Math.min(res.rating, 1); res.ok = false; res.leap = false; }
  st.stats.exp++;
  st.stats[['slayExp', 'seekExp', 'herbExp'][a]] = (st.stats[['slayExp', 'seekExp', 'herbExp'][a]] || 0) + 1;
  // 相性第一次用才揭晓，记入图鉴（跨世保留）
  const akey = k * 3 + a;
  res.affV = L.affOf(st, k, a);
  if (!st.meta.aff[akey]) { st.meta.aff[akey] = 1; res.affNew = true; }
  if (!e.recall) {
    const bkey = k + '_' + d, prev = st.best[bkey] || 0;
    if (res.rating > prev) st.best[bkey] = res.rating;
    if (res.rating >= 2 && prev < 2) {
      if (d < 2) res.unlock.push(`${L.REGIONS[k].n}·${L.DEPTHS[d + 1]} 开放`);
      else if (!st.bosses[k]) res.unlock.push(`首领【${L.BOSSES[k].n}】现身`);
      if (d === 0 && k + 1 < L.REGIONS.length && L.regionOpen(st, k + 1) && !(st.flags.regSeen || {})[k + 1]) res.unlock.push(`新地点【${L.REGIONS[k + 1].n}】开放`);
      if (k === 0 && d === 1 && L.si(st.p) < REG_SI[1]) res.unlock.push('新地点【黑风岭】开放');
    }
    // 同一格连续丁等，给老祖的“卡住检测”用
    const ds = st.flags.dingStreak;
    if (res.rating === 0) st.flags.dingStreak = { key: bkey, n: ds && ds.key === bkey ? ds.n + 1 : 1 };
    else st.flags.dingStreak = null;
  }
  if (res.ok) { st.stats.expWin++; st.regionWins[k] = (st.regionWins[k] || 0) + 1; }
  if (res.leap) st.stats.leapWins++;
  if (res.rating === 0 && !e.recall) st.stats.dings = (st.stats.dings || 0) + 1;
  if (res.rating === 4) st.stats.tians = (st.stats.tians || 0) + 1;
  st.stones += res.stones; st.stats.expStones = (st.stats.expStones || 0) + res.stones;
  st.herbs += res.herbs;
  st.pills += res.pills;
  st.treasure += res.treasure;
  for (const dr of res.drops) { const it = L.giveItem(st, dr[0], dr[1]); if (it.value) st.stats.expStones += it.value; res.items.push(it); }
  res.xp = L.gainBase(st) * res.xpTicks;
  if (res.xp > 0) addXp(st, res.xp);
  if (res.contrib) addContrib(st, res.contrib);
  if (res.rating === 0 && !e.recall) { st.p.inj = Math.max(st.p.inj, 3); res.inj = 3; }
  if (e.encEv) res.enc = true;
  if (st.sect && !e.recall) {
    taskHit(st, 'exp', t => t.k === k && t.a === a && res.rating >= 2);
    if (res.leap) taskHit(st, 'act', t => t.sub === 'leap');
    if (e.escort !== undefined && res.rating >= 1) { const t = st.sect.tasks && st.sect.tasks[e.escort]; if (t && t.ty === 'escort' && !t.done) taskDone(st, t); res.escort = true; }
  }
  const tag = `${L.REGIONS[k].n}·${L.DEPTHS[d]}`;
  if (e.recall) L.log(st, `【${tag}】中途折返，收获减半`);
  else L.log(st, `【${tag}】${L.APPR[a].n}归来，评价「${L.RATINGS[res.rating]}」${res.leap ? '（越级）' : ''}，灵石+${L.fmt(res.stones)}${res.inj ? '，负伤 3 周天' : ''}`, res.rating >= 3 ? 'gold' : res.rating >= 2 ? 'jade' : res.rating === 0 ? 'red' : '');
  res.pw0 = pw0; res.pw1 = L.power(st); res.gain0 = gain0; res.gain1 = L.gain(st);
  res.chain = e.chain || 0;
  L.checkQuests(st);
  return res;
};
// 旧版存档里走到一半的历练：按旧规则（成功率 0.75 + 0.3·log2(战力/推荐)）结算一次
const OLD_DREC = [6, 200, 2600, 4e4, 4.5e5, 6e6, 9e7, 1e9, 1.3e10, 1.4e11, 1e12];
const OLD_DREW = [60, 170, 450, 1200, 3200, 8500, 22000, 58000, 1.5e5, 4e5, 1.1e6];
function legacyExp(st, e) {
  const k = clamp(e.k || 0, 0, 10), ratio = L.power(st) / OLD_DREC[k];
  const ok = R() < clamp(0.75 + 0.3 * Math.log2(Math.max(ratio, 1e-9)), 0.05, 0.98);
  const res = { k, d: 0, a: 0, legacy: true, ok, rating: ok ? 2 : 0, m: ok ? 1 : 0.15, score: ok ? 70 : 40, parts: { pow: ok ? 70 : 40, luck: 0, aff: 0, guts: 0 }, items: [], unlock: [], pills: 0, herbs: 0, treasure: 0, contrib: 0, xp: 0, leap: false, ratio, pw0: L.power(st), gain0: L.gain(st) };
  res.stones = Math.floor(OLD_DREW[k] * (ok ? 0.85 + R() * 0.3 : 0.1));
  st.stones += res.stones; st.stats.exp++;
  if (ok) { st.stats.expWin++; st.regionWins[k] = (st.regionWins[k] || 0) + 1; st.best[k + '_0'] = Math.max(st.best[k + '_0'] || 0, 2); }
  else { st.p.inj = Math.max(st.p.inj, 3); res.inj = 3; }
  L.log(st, `【${L.REGIONS[k].n}】历练${ok ? '归来' : '失利，负伤而归'}，灵石+${L.fmt(res.stones)}`, ok ? 'jade' : 'red');
  res.pw1 = L.power(st); res.gain1 = L.gain(st); res.chain = 0;
  L.checkQuests(st);
  return res;
}

// ---------- 闭关与疗伤 ----------
// 4 周天，修炼 ×(2 + 0.05×洞府等级)；花费 25 × 1.27^i 灵石（第一次免费）；出关 30% 概率顿悟，再得 2 周天修为
L.RET = { len: 4, base: 25, grow: 1.27, epi: 0.30, epiDao: 0.45, epiTicks: 2 };
L.retOpen = st => st.rebirth > 0 || Math.max(L.si(st.p), st.flags.maxI || 0) >= 1;
L.retCost = function (st) {
  if (!st.flags.retFree) return 0;
  let c = L.RET.base * Math.pow(L.RET.grow, Math.min(L.si(st.p), 35));
  if (st.sect && st.sect.id === 'dao') c *= 0.7;
  return Math.floor(c);
};
L.retWhy = function (st) {
  if (!L.retOpen(st)) return '炼气中期后可闭关';
  if (st.p.r > L.MAXR) return '已证大道';
  if (st.exp) return '历练途中';
  if (st.retreat) return '正在闭关';
  if (L.isFull(st)) return '修为已圆满，先去突破';
  if (st.stones < L.retCost(st)) return `还差 ${L.fmt(L.retCost(st) - st.stones)} 灵石`;
  return '';
};
L.canRetreat = st => !L.retWhy(st);
// 闭关值不值：多得多少修为、提前几周天升层
L.retInfo = function (st) {
  const m = L.retMult(st), base = L.gainBase(st) * (st.p.inj > 0 ? 0.5 : 1);
  const extra = base * (m - 1) * L.RET.len;
  const left = Math.max(0, L.pNeed(st.p) - st.p.xp);
  const t0 = left / base, t1 = left <= base * m * L.RET.len ? left / (base * m) : L.RET.len + (left - base * m * L.RET.len) / base;
  return { cost: L.retCost(st), m, len: L.RET.len, extra, save: Math.max(0, Math.round(t0 - t1)), why: L.retWhy(st), free: !st.flags.retFree };
};
L.startRetreat = function (st, opt) {
  opt = opt || {};
  const special = opt.kind === 'train' || opt.kind === 'teach';
  if (special) { if (L.busy(st) || st.p.r > L.MAXR) return false; }
  else {
    if (!L.canRetreat(st)) return false;
    st.stones -= L.retCost(st); st.flags.retFree = 1; st.flags.spentAt = st.tick;
  }
  st.retreat = { left: L.RET.len, total: L.RET.len, m: opt.m !== undefined ? opt.m : L.retMult(st), kind: opt.kind || 'ret', got: 0 };
  if (opt.task !== undefined) st.retreat.task = opt.task;
  st.tuna = 0;
  L.log(st, opt.kind === 'train' ? '老祖亲自特训：4 周天，修炼 ×3' : opt.kind === 'teach' ? '应宗门之命，指点师弟 4 周天' : `闭关 ${L.RET.len} 周天，修炼 ×${st.retreat.m.toFixed(2)}`, 'jade');
  return true;
};
// done = 坐满了；提前出关不退灵石，也没有顿悟
L.endRetreat = function (st, done) {
  const r = st.retreat; if (!r) return null;
  st.retreat = null;
  const res = { kind: r.kind, got: r.got, done: !!done, epi: 0 };
  if (r.kind === 'teach') {
    if (done && st.sect && st.sect.tasks) { const t = st.sect.tasks[r.task]; if (t && t.ty === 'teach' && !t.done) taskDone(st, t); }
    L.log(st, done ? '指点师弟归来，宗门记你一功' : '中途离开，师弟们一脸茫然');
  } else {
    if (done) {
      const first = !st.stats.retreat;
      st.stats.retreat = (st.stats.retreat || 0) + 1;
      const pe = st.sect && st.sect.id === 'dao' ? L.RET.epiDao : L.RET.epi;
      if (r.kind === 'ret' && (first || R() < pe)) { res.epi = L.gainBase(st) * L.RET.epiTicks; addXp(st, res.epi); }
      if (st.sect) taskHit(st, 'act', t => t.sub === 'retreat');
      if (first && !st.visitor && !st.stats.visits) res.visitor = L.spawnVisitor(st);   // 第一位访客固定在首次出关时上门
    }
    L.log(st, done ? `出关！修为 +${L.fmt(r.got)}${res.epi ? '，顿悟再得 ' + L.fmt(res.epi) : ''}` : '提前出关', res.epi ? 'gold' : 'jade');
  }
  L.checkQuests(st);
  return res;
};
// 老祖特训（E17）：约战剩余 ≤ 8 周天、胜算 < 60%、未筑基未圆满、人在洞府，第一世只此一次，不收灵石
L.canTrain = function (st) {
  if (st.rebirth > 0 || st.pact || st.flags.trained || st.p.r > 0 || L.busy(st) || L.isFull(st)) return false;
  const pi = L.pactInfo(st);
  return pi.left <= 8 && pi.left >= 1 && pi.p < 0.6;
};
L.startTrain = function (st) {
  if (!L.canTrain(st)) return false;
  st.flags.trained = 1;
  return L.startRetreat(st, { kind: 'train', m: 3 });
};
// 服丹疗伤：一枚破境丹，立刻痊愈
L.canHeal = st => st.p.inj > 0 && st.pills > 0;
L.heal = function (st) {
  if (!L.canHeal(st)) return false;
  st.pills--; st.p.inj = 0;
  L.log(st, '服下一枚破境丹，伤势痊愈', 'jade');
  return true;
};

// ---------- 对决 ----------
L.duelChance = (P1, P2) => clamp(0.5 + 0.55 * Math.log2(P1 / P2), 0.03, 0.97);
// 胜率曲线很陡：稳赢线 = 敌 × 1.8（97%），五五线 = 敌 × 1.0
L.duelLines = Q => ({ even: Q, sure: Q * 1.8 });
// 三年之约：第 36 周天（炼气期 12 周天一年）。第一世未筑基时老祖借力 ×2
L.PACT_TICK = 36;
L.PACT_POWER = 90;
L.PACT_ASSIST = 2;
L.pactPower = () => L.PACT_POWER;
L.pactAssist = st => (st.rebirth === 0 && st.p.r === 0 ? L.PACT_ASSIST : 1);
L.pactInfo = function (st) {
  const left = Math.max(0, L.PACT_TICK - st.tick);
  const base = L.power(st), assist = L.pactAssist(st), S = base * assist, Q = L.PACT_POWER;
  return { left, base, assist, S, Q, p: L.duelChance(S, Q), done: !!st.pact };
};
const TOUR_EVERY = 12, MEET_EVERY = 24, MEET_AT = 18;
L.nextTour = st => { const t0 = Math.max(st.tick, L.PACT_TICK); return (Math.floor(t0 / TOUR_EVERY) + 1) * TOUR_EVERY - st.tick; };
L.nextMeet = function (st) {
  if (!st.sect) return 0;
  let m = ((MEET_AT - (st.tick % MEET_EVERY)) + MEET_EVERY) % MEET_EVERY; if (m === 0) m = MEET_EVERY;
  while (st.tick + m - st.sect.joined < 12) m += MEET_EVERY;
  return m;
};
// 下一件大事（三年之约 / 天骄论道 / 九宗会武），给界面倒计时用
L.nextBig = function (st) {
  if (!st.pact) { const pi = L.pactInfo(st); return { k: 'pact', n: '三年之约', left: pi.left, info: pi }; }
  const tour = L.nextTour(st);
  if (st.sect && st.sect.order) { const m = L.nextMeet(st); if (m < tour) return { k: 'meet', n: '九宗会武', left: m }; }
  return { k: 'tour', n: '天骄论道', left: tour };
};
L.pactDuel = function (st) {
  const assist = L.pactAssist(st) > 1;
  const S = L.power(st) * L.pactAssist(st);
  const Q = L.pactPower();
  const p = L.duelChance(S, Q);
  const win = R() < p;
  st.pact = win ? 1 : -1;
  const res = { S, Q, p, win, assist, base: S / L.pactAssist(st), rank0: st.rank };
  if (win) {
    st.beaten.mu = 1;
    const q = L.rivalRank(st, 'mu');
    if (q && q < st.rank) { st.rank = q; st.bestRank = Math.min(st.bestRank, q); }
    res.rank1 = st.rank;
    res.stones = 600; st.stones += 600;
    L.log(st, `三年之约，${st.p.name}当众击败${st.exName}！满城哗然，天骄榜第 ${st.rank}`, 'gold');
  } else L.log(st, `三年之约惜败于${st.exName}……第 1 届论道第一场再会`, 'red');
  L.checkQuests(st);
  return res;
};
// 两届之间榜单也在动：路人各自有小幅起伏（宿敌不动，战力仍按公式）
function ladderDrift(st) {
  for (let n = 0; n < 8; n++) {
    const i = Math.floor(R() * 98), a = st.ladder[i], b = st.ladder[i + 1];
    if (a && b && !a.id && !b.id) { st.ladder[i] = b; st.ladder[i + 1] = a; }
  }
}
// 天骄论道：三场，目标依次是战力约为自己 0.6 / 0.9 / 1.2 倍的名次，单场最多上升 15 名
L.TOUR_STEP = 15;
L.tournament = function (st) {
  const S = L.power(st);
  st.stats.tour++;
  ladderDrift(st);
  const res = { n: st.stats.tour, startRank: st.rank, rounds: [], S };
  const mults = [0.6, 0.9, 1.2];
  for (let j = 0; j < 3; j++) {
    let q;
    if (st.rank === 1) q = 2;
    else {
      const lim = Math.max(1, st.rank - L.TOUR_STEP);
      const target = S * mults[j];
      q = st.rank - 1; let best = Infinity;
      for (let x = st.rank - 1; x >= lim; x--) {
        const dlt = Math.abs(Math.log(L.rivalPower(st, x) / target));
        if (dlt < best) { best = dlt; q = x; }
      }
      // 宿敌优先：前方 15 名内有没打赢过的宿敌，且打得过，就打他
      for (let x = st.rank - 1; x >= lim; x--) { const rv = L.rivalAt(st, x); if (rv && rv.id && !st.beaten[rv.id] && L.rivalPower(st, x) < S * 1.6) { q = x; break; } }
      // 三年之约输了：第 1 届第一场固定是退婚的那位
      if (j === 0 && st.pact < 0 && !st.beaten.mu) { const mq = L.rivalRank(st, 'mu'); if (mq && mq < st.rank) q = mq; }
    }
    const rv = L.rivalAt(st, q);
    const Q = L.rivalPower(st, q);
    const p = L.duelChance(S, Q);
    const win = R() < p;
    const round = { q, rv, P: Q, p, win };
    if (win) {
      st.stats.tourWins = (st.stats.tourWins || 0) + 1;
      if (st.rank === 1) round.defend = true; else st.rank = q;
      const rw = Math.floor(L.income(st) * 4 + 50);
      round.stones = rw; st.stones += rw;
      if (st.sect) { round.contrib = addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.tour); taskHit(st, 'tour'); }
      if (rv && rv.id) { round.first = !st.beaten[rv.id]; st.beaten[rv.id] = (st.beaten[rv.id] || 0) + 1; }
    }
    res.rounds.push(round);
    if (!win) break;
  }
  st.bestRank = Math.min(st.bestRank, st.rank);
  if (st.rank <= 12) L.fireTrigger(st, 'rank:12');
  res.endRank = st.rank;
  L.log(st, `第${res.n}届天骄论道落幕，${st.p.name}位列天骄榜第 ${st.rank}`, st.rank < res.startRank ? 'gold' : '');
  L.checkQuests(st);
  return res;
};
// 宿敌的消息（只是传讯，战力仍按公式）
L.RIVAL_NEWS = [
  [60, 'zhao', '天骄榜快讯：赵乾闭关三年，结丹而出'],
  [150, 'chu', '天骄榜快讯：天剑宗圣子楚天阔一剑败三位元婴'],
  [260, 'xue', '天骄榜快讯：魔道圣子血无涯屠尽一座秘境，无人敢拦'],
  [330, 'chu', '天骄榜快讯：楚天阔踏入炼虚，放言“弃徒不过如此”'],
  [430, 'yun', '天骄榜快讯：昆仑云无极闭目三十年，一朝睁眼，万剑齐鸣'],
];

// ---------- 宗门 ----------
L.joinSect = function (st, id) {
  const sc = L.SECTS.find(x => x.id === id); if (!sc || st.sect) return false;
  st.sect = { id, rank: 0, total: 0, pts: 0, joined: st.tick, veins: 0, order: L.NINE.map(x => x.id), meets: 0, best: 9, tasks: [], build: { ward: 0, lib: 0, vein: 0 }, freePick: 0 };
  st.sect.best = L.sectPos(st);
  L.rollTasks(st);
  L.log(st, `拜入${sc.n}，成为外门弟子`, 'gold');
  L.fireTrigger(st, 'sect');
  L.checkQuests(st);
  return true;
};
// 原圣子（或圣女）的战力：元婴中期裸装 × 2.3
L.heirPower = () => P.pw0 * Math.pow(P.pwStage, 13) * Math.pow(P.pwRealm, 3) * 2.3;
L.promote = function (st) {
  if (!L.canPromote(st)) return null;
  const nx = L.SRANKS[st.sect.rank + 1];
  const res = { from: st.sect.rank, to: st.sect.rank + 1 };
  if (nx.duel) {
    const S = L.power(st), Q = L.heirPower();
    const p = L.duelChance(S, Q);
    res.duel = { S, Q, p, win: R() < p };
    if (!res.duel.win) { st.flags.promoFail = st.tick; L.log(st, `挑战原${L.srankName(st, st.sect.rank + 1)}失利，来日再战`, 'red'); return res; }
  }
  st.sect.rank++;
  res.ok = true;
  L.log(st, `全宗震动！晋升${L.SECTS.find(x => x.id === st.sect.id).n}${L.srankName(st, st.sect.rank)}`, 'gold');
  L.checkQuests(st);
  return res;
};
L.vaultBuy = function (st, k) {
  if (!st.sect) return null;
  const c = L.vaultCost(st, k);
  if (st.sect.pts < c) return null;
  if (k === 'vpill') { st.sect.pts -= c; st.pills += 2; return { k }; }
  const tier = L.vaultTier(st, k);
  const key = k === 'vart' ? 'a' : 'w';
  if (st.p[key] >= tier) return null;
  if (st.sect.freePick > 0) st.sect.freePick--; else st.sect.pts -= c;
  const out = { k, it: L.giveItem(st, key, tier) };
  L.checkQuests(st);
  return out;
};
// 天剑宗来犯：对手是天剑宗长老团（约等于炼虚中期的强者）
L.warPower = () => P.pw0 * Math.pow(P.pwStage, 21) * Math.pow(P.pwRealm, 5) * 7;
L.sectWar = function (st) {
  const S = L.power(st) * Math.pow(1.15, (st.sect.build || {}).ward || 0), Q = L.warPower();
  const p = L.duelChance(S, Q);
  const win = R() < p;
  const res = { S, Q, p, win };
  if (win) {
    st.flags.warWon = 1;
    res.contrib = addContrib(st, L.contribFor(L.homeRegion(st)) * 3);
    res.stones = Math.floor(L.income(st) * 10 + 500);
    st.stones += res.stones;
    L.log(st, '天剑宗大举来犯，你一人一剑立于山门，杀退来敌！', 'gold');
  } else {
    st.flags.war = st.tick + 24;
    L.log(st, '天剑宗来犯，宗门苦战方才退敌……此仇必报', 'red');
  }
  L.checkQuests(st);
  return res;
};

// 九宗会武：你作为本宗代表，挑战排名更高的宗门
L.sectMeet = function (st) {
  if (!st.sect) return null;
  st.sect.meets++;
  const S = L.power(st);
  const res = { n: st.sect.meets, start: L.sectPos(st), rounds: [], S };
  for (let j = 0; j < 3; j++) {
    const pos = L.sectPos(st);
    const q = pos === 1 ? 2 : pos - 1;
    const foe = L.nineAt(st, q);
    const Q = L.ninePower(st, q);
    const p = L.duelChance(S, Q);
    const win = R() < p;
    const rd = { q, foe, Q, p, win, defend: pos === 1 };
    if (win) {
      if (pos > 1) { const o = st.sect.order; [o[pos - 1], o[q - 1]] = [o[q - 1], o[pos - 1]]; }
      st.stats.meetWins = (st.stats.meetWins || 0) + 1;
      rd.contrib = addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.meet);
      rd.stones = Math.floor(L.income(st) * 5 + 100); st.stones += rd.stones;
      if (foe.id === 'tianjian') st.flags.beatTianjian = (st.flags.beatTianjian || 0) + 1;
    }
    res.rounds.push(rd);
    if (!win || rd.defend) break;
  }
  res.end = L.sectPos(st);
  st.sect.best = Math.min(st.sect.best, res.end);
  L.log(st, `第${res.n}届九宗会武落幕，${L.sectOf(st).n}位列天下第 ${res.end} 宗`, res.end < res.start ? 'gold' : '');
  L.checkQuests(st);
  return res;
};

// ---------- 宗门任务板：每届论道（12 周天）刷新 3 个，可同时接 ----------
// ty: exp 指定地点行事评价乙 / herbs 上交灵草 / pill 上交破境丹 / tour 论道赢一场 / boss 击败首领
//     act 闭关·炼丹两次·越级一次 / escort 护送同门（本趟灵石归宗门，贡献 ×3）/ teach 指点师弟（4 周天，贡献 ×2）
L.TASK_N = { exp: '历练', herbs: '上交灵草', pill: '上交丹药', tour: '论道', boss: '讨伐首领', act: '修行', escort: '护送同门', teach: '指点师弟' };
L.rollTasks = function (st) {
  const sc = st.sect; if (!sc) return;
  const home = L.homeRegion(st), r = Math.min(st.p.r, 8), std = Math.floor(L.contribFor(home) * L.CONTRIB.task);
  const bossK = []; for (let k = 0; k <= home; k++) if (L.bossReady(st, k)) bossK.push(k);
  const pool = [['exp', 3], ['herbs', 2], ['pill', 2], ['tour', st.pact ? 2 : 0], ['act', 3], ['escort', 1.5], ['teach', 1.5], ['boss', bossK.length ? 2 : 0]].filter(x => x[1] > 0);
  const tasks = [];
  while (tasks.length < 3 && pool.length) {
    const ty = wpick(pool); pool.splice(pool.findIndex(x => x[0] === ty), 1);
    const t = { ty, need: 1, prog: 0, taken: 0, done: 0, rw: std };
    if (ty === 'exp' || ty === 'escort') {
      t.k = home > 0 && R() < 0.4 ? home - 1 : home;
      const as = [0, 1, 2].filter(a => L.apprOpen(st, a));
      t.a = ty === 'exp' ? pick(as) : 0;
      if (ty === 'escort') t.rw = 0;
    } else if (ty === 'herbs') t.n = 6 * (1 + r);
    else if (ty === 'pill') t.n = 1;
    else if (ty === 'boss') { t.k = pick(bossK); t.rw = Math.floor(std * 1.5); }
    else if (ty === 'teach') t.rw = std * 2;
    else if (ty === 'act') {
      const fav = { dao: 'retreat', dan: 'craft', jian: 'leap' }[sc.id];
      t.sub = R() < 0.6 ? fav : pick(['retreat', 'craft', 'leap']);
      if (t.sub === 'craft' && st.home.furnace < 1) t.sub = 'retreat';
      if (t.sub === 'craft') t.need = 2;
    }
    t.bonus = pick([{ pills: 1 }, { herbs: 4 * (1 + r) }, { inc: 3 }]);
    tasks.push(t);
  }
  sc.tasks = tasks; sc.taskAt = st.tick;
};
L.taskText = function (st, t) {
  switch (t.ty) {
    case 'exp': return `去【${L.REGIONS[t.k].n}】${L.APPR[t.a].n}，评价乙以上`;
    case 'herbs': return `上交灵草 ${t.n} 株`;
    case 'pill': return '上交破境丹 1 枚';
    case 'tour': return '本届论道至少赢 1 场';
    case 'boss': return `击败【${L.REGIONS[t.k].n}】首领${L.BOSSES[t.k].n}`;
    case 'act': return t.sub === 'retreat' ? '闭关 1 次' : t.sub === 'craft' ? `炼丹 2 次（${t.prog}/2）` : '越级历练成功 1 次';
    case 'escort': return `护送同门去【${L.REGIONS[t.k].n}】（本趟灵石归宗门，贡献 ×3）`;
    case 'teach': return '指点师弟（4 周天不涨修为，贡献 ×2）';
  }
  return '';
};
L.taskReward = (st, t) => (t.ty === 'escort' ? '贡献 ×3（随本趟历练结算）' : '贡献+' + L.fmt(t.rw)) + ' ' + L.rewardText(st, t.bonus);
function taskDone(st, t) {
  if (t.done) return;
  t.done = 1; t.taken = 1;
  addContrib(st, t.rw);
  grantReward(st, t.bonus);
  st.stats.sectTasks = (st.stats.sectTasks || 0) + 1;
  L.log(st, `【宗门任务】${L.TASK_N[t.ty]}完成，${L.taskReward(st, t)}`, 'jade');
  emit('task', t);
}
function taskHit(st, ty, test) {
  if (!st.sect || !st.sect.tasks) return;
  for (const t of st.sect.tasks) if (t.ty === ty && t.taken && !t.done && (!test || test(t))) { t.prog++; if (t.prog >= t.need) taskDone(st, t); }
}
L.taskHit = taskHit;
// 接取。指点师弟接下就开始（要人在洞府且空闲）
L.taskTake = function (st, i) {
  const t = st.sect && st.sect.tasks && st.sect.tasks[i];
  if (!t || t.taken || t.done) return false;
  if (t.ty === 'teach') { if (!L.startRetreat(st, { kind: 'teach', m: 0, task: i })) return false; }
  t.taken = 1;
  return true;
};
// 上交类任务（灵草 / 破境丹）
L.taskCanDeliver = (st, t) => !!t && t.taken && !t.done && ((t.ty === 'herbs' && st.herbs >= t.n) || (t.ty === 'pill' && st.pills >= t.n));
L.taskDeliver = function (st, i) {
  const t = st.sect && st.sect.tasks && st.sect.tasks[i];
  if (!L.taskCanDeliver(st, t)) return false;
  if (t.ty === 'herbs') st.herbs -= t.n; else st.pills -= t.n;
  taskDone(st, t);
  L.checkQuests(st);
  return true;
};
// ---------- 人物羁绊 ----------
// 名字是数组时：[主角为男时, 主角为女时]
L.NPCS = {
  su: { n: ['苏青瑶', '苏景行'], title: '丹霞谷医修', bonus: '修炼速度 ×1.1', daolv: true },
  ye: { n: ['夜璃', '夜无殇'], title: '魔门圣宗', bonus: '战力 ×1.1，历练灵石 ×1.2', daolv: true },
  chu: { n: '楚狂', title: '剑痴散修', bonus: '战力 ×1.15' },
  ge: { n: '葛老', title: '落魄丹师', bonus: '炼丹成功率 +15%，可炼洗髓丹' },
  bai: { n: '白小九', title: '化形灵狐', bonus: '奇遇概率 ×1.5' },
  mo: { n: '墨无痕', title: '神秘黑衣人', bonus: '寿元 ×1.1' },
};
L.npcName = (st, id) => { const n = L.NPCS[id] ? L.NPCS[id].n : id; return Array.isArray(n) ? n[st.p.look.f ? 1 : 0] : n; };
L.aff = (st, id) => (st.npc && st.npc[id]) ? st.npc[id].aff : 0;
L.met = (st, id) => !!(st.npc && st.npc[id]);
L.friend = (st, id) => L.aff(st, id) >= 60;
L.hearts = (st, id) => Math.floor(L.aff(st, id) / 20);   // 五颗心：每 20 好感一颗，三心知己
L.addAff = function (st, id, d) {
  if (!L.NPCS[id]) return 0;
  st.npc = st.npc || {};
  const o = st.npc[id] || (st.npc[id] = { aff: 0 });
  const before = o.aff;
  o.aff = clamp(o.aff + d, 0, 100);
  if (before < 60 && o.aff >= 60 && !o.f60) { o.f60 = 1; L.log(st, `与${L.npcName(st, id)}结为知己：${L.NPCS[id].bonus}`, 'gold'); L.fireTrigger(st, 'npc:' + id + ':60'); }
  return o.aff - before;
};
L.culMult = function (st) {
  let m = 1 + ((st.bonus && st.bonus.cul) || 0);
  if (L.friend(st, 'su')) m *= 1.1;
  if (st.daolv) m *= 1.25;
  for (const b of st.buffs || []) if (b.cul) m *= b.cul;
  return m;
};
L.atkMult = function (st) {
  let m = 1 + ((st.bonus && st.bonus.atk) || 0);
  if (L.friend(st, 'ye')) m *= 1.1;
  if (L.friend(st, 'chu')) m *= 1.15;
  for (const b of st.buffs || []) if (b.atk) m *= b.atk;
  return m;
};

// ---------- 事件引擎（数据见 events.js） ----------
L.events = () => (root.EVENTS || (typeof require === 'function' ? (() => { try { return require('./events.js'); } catch (e) { return []; } })() : []));
L.fill = function (st, text) {
  const sc = L.sectOf(st);
  return String(text || '').replace(/\{su\}/g, L.npcName(st, 'su')).replace(/\{ye\}/g, L.npcName(st, 'ye')).replace(/\{ex\}/g, st.exName)
    .replace(/\{sect\}/g, sc ? sc.n : '宗门').replace(/\{name\}/g, st.p.name);
};
function flagOn(st, f) { return !!(st.eflags && st.eflags[f]); }
L.eligible = function (st, ev, where, ctx) {
  ctx = ctx || {};
  if (ev.where !== where) return false;
  const r = st.p.r;
  if (where === 'story') { if (ev.trigger !== ctx.trigger) return false; if (st.evDone[ev.id]) return false; }
  if (ev.once && st.evDone[ev.id]) return false;
  if (ev.minR !== undefined && r < ev.minR) return false;
  if (ev.maxR !== undefined && r > ev.maxR) return false;
  if (ev.need && !ev.need.every(f => flagOn(st, f))) return false;
  if (ev.not && ev.not.some(f => flagOn(st, f))) return false;
  if (ev.npc && ev.aff) { const a = L.aff(st, ev.npc); if (a < ev.aff[0] || a > ev.aff[1]) return false; }
  if (ev.sect === true && !st.sect) return false;
  if (ev.sect === false && st.sect) return false;
  if (ev.daolv === true && !st.daolv) return false;
  if (ev.daolv === false && st.daolv) return false;
  if (where === 'exp' && ev.bg && ctx.bg && !ev.bg.includes(ctx.bg)) return false;
  if (where !== 'story' && st.evLast[ev.id] !== undefined && st.tick - st.evLast[ev.id] < 40) return false;
  // 一个选项都付不起的奇遇不要弹出来（否则玩家只能干看着）
  if (where !== 'story' && !ev.choices.some(c => L.costOk(st, c.cost))) return false;
  if (where === 'home' && ctx.visit && !ev.visit) return false;
  return true;
};
L.pickEvent = function (st, where, ctx) {
  const list = L.events().filter(ev => L.eligible(st, ev, where, ctx));
  if (!list.length) return null;
  // 尚未出现过的事件优先
  const fresh = list.filter(ev => st.evLast[ev.id] === undefined);
  const pool = fresh.length && R() < 0.75 ? fresh : list;
  return wpick(pool.map(ev => [ev, (ev.weight || 1) * (ev.npc ? 2.5 : 1)]));
};
L.fireTrigger = function (st, key) {
  for (const ev of L.events()) if (ev.where === 'story' && ev.trigger === key && !st.evDone[ev.id] && !st.storyQ.includes(ev.id) && L.eligible(st, ev, 'story', { trigger: key })) st.storyQ.push(ev.id);
};
L.eventById = id => L.events().find(e => e.id === id);
L.herbScale = st => 1 + st.p.r;
L.costOk = function (st, cost) {
  if (!cost) return true;
  if (cost.stones && st.stones < cost.stones * Math.max(L.income(st), 20)) return false;
  if (cost.pills && st.pills < cost.pills) return false;
  if (cost.herbs && st.herbs < cost.herbs * L.herbScale(st)) return false;
  return true;
};
L.costText = function (st, cost) {
  const a = [];
  if (cost.stones) a.push('灵石 ' + L.fmt(cost.stones * Math.max(L.income(st), 20)));
  if (cost.pills) a.push('破境丹 ' + cost.pills);
  if (cost.herbs) a.push('灵草 ' + L.fmt(cost.herbs * L.herbScale(st)));
  return a.join('、');
};
L.applyFx = function (st, fx) {
  const out = [];
  if (!fx) return out;
  const p = st.p, f = L.fmt;
  if (fx.xp) { const g = L.gain(st) * fx.xp; addXp(st, g); out.push('修为 +' + f(g)); }
  if (fx.stones) { const v = Math.round(fx.stones * Math.max(L.income(st), 20)); st.stones = Math.max(0, st.stones + v); out.push('灵石 ' + (v >= 0 ? '+' : '') + f(v)); }
  if (fx.pills) { st.pills = Math.max(0, st.pills + fx.pills); out.push('破境丹 ' + (fx.pills > 0 ? '+' : '') + fx.pills); }
  if (fx.herbs) { const v = Math.round(fx.herbs * L.herbScale(st)); st.herbs = Math.max(0, st.herbs + v); out.push('灵草 ' + (v > 0 ? '+' : '') + f(v)); }
  if (fx.treasure) { st.treasure = Math.max(0, st.treasure + fx.treasure); out.push('天材地宝 ' + (fx.treasure > 0 ? '+' : '') + fx.treasure); }
  if (fx.life && p.r <= L.MAXR) { const v = Math.round(L.REALMS[p.r].life * fx.life / 100); st.lifeBonus += v; out.push('寿元 ' + (v >= 0 ? '+' : '') + f(v) + ' 年'); }
  if (fx.inj) { p.inj = Math.max(p.inj, fx.inj); out.push('负伤 ' + fx.inj + ' 周天'); }
  if (fx.item) {
    const kind = fx.item, up = fx.itemUp || 0;
    const base = kind === 'w' ? 1 + Math.floor(p.r * 0.75) : kind === 'a' ? 1 + Math.floor(p.r * 0.6) : 1 + Math.floor(p.r * 0.6);
    const it = L.giveItem(st, kind, base + up);
    const tn = kind === 'w' ? L.WEAPONS[it.tier].n : kind === 'a' ? L.ARTS[it.tier].n : L.PETS[it.tier].n;
    out.push((it.equip ? '获得' : '得到（已有更好的，换成灵石）') + tn + (kind === 'a' ? '《' + it.name + '》' : '【' + it.name + '】'));
    out.item = it;
  }
  if (fx.aff) for (const id in fx.aff) { const d = L.addAff(st, id, fx.aff[id]); if (d) out.push(`好感 ${L.npcName(st, id)} ${d > 0 ? '+' : ''}${d}`); }
  if (fx.flag) for (const fl of [].concat(fx.flag)) st.eflags[fl] = 1;
  if (fx.unflag) for (const fl of [].concat(fx.unflag)) delete st.eflags[fl];
  if (fx.buff) { st.buffs.push({ cul: fx.buff.cul, atk: fx.buff.atk, left: fx.buff.ticks || 6 }); out.push(fx.buff.cul ? `修炼速度 ×${fx.buff.cul}（${fx.buff.ticks || 6} 周天）` : `战力 ×${fx.buff.atk}（${fx.buff.ticks || 6} 周天）`); }
  if (fx.cul) { st.bonus.cul += fx.cul; out.push(`永久修炼速度 +${Math.round(fx.cul * 100)}%`); }
  if (fx.power) { st.bonus.atk += fx.power; out.push(`永久战力 +${Math.round(fx.power * 100)}%`); }
  if (fx.vein && st.sect) { st.sect.veins = (st.sect.veins || 0) + fx.vein; out.push(`宗门灵脉 +${fx.vein}（俸禄 +${fx.vein * 25}%）`); }
  if (fx.contrib && st.sect) { const v = L.contribFor(Math.min(10, p.r + 1)) * fx.contrib; st.sect.total += v; st.sect.pts += v; out.push('宗门贡献 +' + f(v)); }
  if (fx.talent && p.t < 6) { const from = p.t; p.t = Math.min(6, p.t + fx.talent); out.push(`灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`); out.talent = true; }
  if (fx.trait && L.TRAITS[fx.trait] && !p.tr.includes(fx.trait)) { p.tr.push(fx.trait); out.push('获得天赋【' + L.TRAITS[fx.trait].n + '】'); }
  if (fx.title) { L.grantTitle(st, fx.title); out.push('获得称号「' + fx.title + '」'); }
  if (fx.daolv && !st.daolv) { st.daolv = fx.daolv; out.push(`与${L.npcName(st, fx.daolv)}结为道侣：双修，修炼速度 ×1.25`); L.log(st, `与${L.npcName(st, fx.daolv)}结为道侣`, 'gold'); L.fireTrigger(st, 'daolv'); }
  return out;
};
L.choiceLuck = st => (L.has(st, 'lucky') ? 0.1 : 0) + (L.has(st, 'hero') ? 0.05 : 0) + (L.friend(st, 'bai') ? 0.05 : 0);
L.resolveChoice = function (st, ev, idx) {
  const ch = ev.choices[idx];
  if (!ch || !L.costOk(st, ch.cost)) return null;
  if (ch.cost) L.applyFx(st, { stones: -(ch.cost.stones || 0), pills: -(ch.cost.pills || 0), herbs: -(ch.cost.herbs || 0) });
  let ok = true, duel = null;
  if (ch.duel) { const S = L.power(st), Q = S * ch.duel; const p = L.duelChance(S, Q); ok = R() < p; duel = { S, Q, p, win: ok }; }
  else if (ch.p !== undefined) ok = R() < Math.min(0.95, ch.p + L.choiceLuck(st));
  const br = ok ? ch.ok : (ch.fail || ch.ok);
  if (ev.npc) { st.npc = st.npc || {}; if (!st.npc[ev.npc]) st.npc[ev.npc] = { aff: 0 }; }
  st.evLast[ev.id] = st.tick;
  if (ev.once || ev.where === 'story') st.evDone[ev.id] = 1;
  st.stats.events++;
  // 访客：见过就算数；途中遭遇：成了本趟分数 +5，砸了 −5
  if (st.visitor && st.visitor.id === ev.id) { st.visitor = null; st.stats.visits = (st.stats.visits || 0) + 1; }
  if (st.exp && st.exp.plan && st.exp.encEv === ev.id && !st.exp.encDone) { st.exp.encDone = 1; st.exp.plan.adj = (st.exp.plan.adj || 0) + (ok ? 5 : -5); }
  const fx = L.applyFx(st, br && br.fx);
  const text = L.fill(st, br ? br.text : '');
  L.log(st, `【${L.fill(st, ev.title)}】${text}`.slice(0, 60), ok ? 'jade' : 'red');
  L.checkQuests(st);
  return { ok, duel, text, fx, hasRisk: ch.p !== undefined || !!ch.duel };
};

// ---------- 炼丹 ----------
L.RECIPES = [
  { k: 'peiyuan', n: '培元丹', d: '服下立得 4 周天修为', herbs: 10, lv: 1 },
  { k: 'pojing', n: '破境丹', d: '突破时每枚成功率 +15%，也可疗伤', herbs: 8, lv: 1 },
  { k: 'juling', n: '聚灵丹', d: '接下来 6 周天修炼速度 ×1.5', herbs: 16, lv: 3 },
  { k: 'yanshou', n: '延寿丹', d: '寿元 +8%（与坊市共用每境界三枚上限）', herbs: 12, lv: 5 },
  { k: 'xisui', n: '洗髓丹', d: '灵根提升一档，可以比剧情觉醒提前一档（需葛老为知己或丹炉 8 级）', herbs: 30, treasure: 1, lv: 8 },
  { k: 'jiuzhuan', n: '九转金丹', d: '下一次大境界突破必定成功', herbs: 40, treasure: 2, lv: 12 },
];
L.QUAL = [{ n: '下品', m: 0.7 }, { n: '中品', m: 1 }, { n: '上品', m: 1.3 }, { n: '极品', m: 1.8 }];
L.herbCost = (st, rc) => Math.ceil(rc.herbs * L.herbScale(st));
L.alchRate = st => clamp(0.6 + 0.03 * st.home.furnace + (L.friend(st, 'ge') ? 0.15 : 0) + (L.has(st, 'alch') ? 0.15 : 0) + (st.sect && st.sect.id === 'dan' ? 0.15 : 0), 0.1, 0.97);
L.pillPower = st => (st.sect && st.sect.id === 'dan' ? 1.3 : 1);   // 丹霞谷：丹药效果 ×1.3
L.canCraft = function (st, k) {
  const rc = L.RECIPES.find(x => x.k === k);
  if (!rc || st.home.furnace < 1) return '需要先建丹炉';
  if (k === 'xisui') { if (!(L.friend(st, 'ge') || st.home.furnace >= 8)) return '需葛老为知己或丹炉 8 级'; }
  else if (st.home.furnace < rc.lv) return `丹炉 ${rc.lv} 级解锁`;
  if (k === 'xisui' && st.p.t >= 6) return '灵根已至巅峰';
  if (k === 'xisui' && st.p.t >= L.talentCap(st)) return '灵根已到此境界的极限，突破后再炼';
  if (k === 'yanshou' && (st.lifePills[st.p.r] || 0) >= 3) return '本境界延寿丹已服满';
  if (k === 'jiuzhuan' && st.flags.sureBt) return '已有一枚九转金丹';
  if (st.herbs < L.herbCost(st, rc)) return '灵草不足';
  if ((rc.treasure || 0) > st.treasure) return '天材地宝不足';
  return '';
};
L.craft = function (st, k) {
  if (L.canCraft(st, k)) return null;
  const rc = L.RECIPES.find(x => x.k === k), p = st.p;
  st.herbs -= L.herbCost(st, rc);
  st.treasure -= rc.treasure || 0;
  st.stats.crafts++;
  if (st.sect) taskHit(st, 'act', t => t.sub === 'craft');
  const res = { k, n: rc.n };
  if (R() >= L.alchRate(st)) { res.ok = false; L.log(st, `炼制${rc.n}时炸炉了……灵草化为飞灰`, 'red'); return res; }
  res.ok = true;
  const pPerfect = 0.05 + st.home.furnace * 0.006 + (L.friend(st, 'ge') ? 0.05 : 0) + (L.has(st, 'alch') ? 0.05 : 0);
  const x = R();
  const q = x < pPerfect ? 3 : x < pPerfect + 0.25 ? 2 : x < pPerfect + 0.75 ? 1 : 0;
  res.q = q; const m = L.QUAL[q].m * L.pillPower(st);
  if (q >= 2) st.stats.goodPill = (st.stats.goodPill || 0) + 1;
  if (q === 3) st.stats.perfect++;
  if (k === 'peiyuan') { const g = L.gain(st) * 4 * m; addXp(st, g); res.fx = '修为 +' + L.fmt(g); }
  else if (k === 'pojing') { const n = q === 3 ? 2 : 1; st.pills += n; res.fx = '破境丹 +' + n; }
  else if (k === 'juling') { const t = Math.round(6 * m); const c = q === 3 ? 2 : 1.5; st.buffs.push({ cul: c, left: t }); res.fx = `修炼速度 ×${c}（${t} 周天）`; }
  else if (k === 'yanshou') { st.lifePills[p.r] = (st.lifePills[p.r] || 0) + 1; const v = Math.round(L.REALMS[p.r].life * 0.08 * m); st.lifeBonus += v; res.fx = `寿元 +${L.fmt(v)} 年`; }
  else if (k === 'xisui') { const from = p.t; p.t = Math.min(6, p.t + 1); res.fx = `灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`; res.talent = true; if (q === 3) { st.bonus.cul += 0.03; res.fx += '，极品药力再增修炼 3%'; } }
  else if (k === 'jiuzhuan') { st.flags.sureBt = 1; st.stats.jiuzhuan = (st.stats.jiuzhuan || 0) + 1; res.fx = '下一次突破必定成功'; }
  L.log(st, `丹成！${L.QUAL[q].n}${rc.n}：${res.fx}`, q === 3 ? 'gold' : 'jade');
  L.checkQuests(st);
  return res;
};

// ---------- 地图首领 ----------
L.BOSSES = [
  { n: '独眼狼王', line: '嗷呜——！', t: '狼王克星', drop: '狼王獠牙匕' },
  { n: '黑风寨主雷彪', line: '敢在老子地盘撒野？', t: '黑风克星', drop: '开山宣花斧' },
  { n: '古墓尸王', line: '……活人的气息……', t: '镇尸道人', drop: '玉棺镇魂钉' },
  { n: '赤炎猿王', line: '万妖山是俺的山！', t: '万妖山主', drop: '赤炎擎天棍' },
  { n: '血煞老魔', line: '桀桀桀，又来一个送死的。', t: '诛魔者', drop: '血煞噬魂刃' },
  { n: '剑冢守墓人', line: '拔剑吧。让老夫看看你的剑。', t: '剑冢新主', drop: '守墓古剑' },
  { n: '九幽魔将', line: '九幽之下，皆为蝼蚁。', t: '九幽镇魔', drop: '九幽镇魂铃' },
  { n: '东海蛟皇', line: '人族小儿，也敢闯我龙宫？', t: '屠蛟者', drop: '蛟皇逆鳞盾' },
  { n: '吞星巨兽', line: '（星辰在它口中碎裂）', t: '摘星客', drop: '吞星之核' },
  { n: '仙府傀儡王', line: '擅闯仙府者，诛。', t: '仙府之主', drop: '傀儡王天戟' },
  { n: '混沌魔神残影', line: '……天地未开时，吾已在此。', t: '开天之人', drop: '混沌残刃' },
];
// 某张图禁地评价乙以上一次后，首领现身。战力 = 禁地推荐 × 1.6
L.bossReady = (st, k) => L.bestOf(st, k, 2) >= 2 && !st.bosses[k];
L.bossPower = k => L.rec(k, 2) * 1.6;
L.fightBoss = function (st, k) {
  if (!L.bossReady(st, k) || L.busy(st)) return null;
  const B = L.BOSSES[k];
  const S = L.power(st), Q = L.bossPower(k);
  const p = L.duelChance(S, Q);
  const win = R() < p;
  const res = { k, S, Q, p, win, B };
  if (win) {
    st.bosses[k] = 1; st.stats.bosses++;
    const t = k >= 5 ? 2 : 1; st.treasure += t; res.treasure = t;
    res.stones = Math.floor(L.rew(k, 2) * 3); st.stones += res.stones;
    res.herbs = Math.round((6 + k * 2) * (1 + st.p.r * 0.5)); st.herbs += res.herbs;
    const tier = clamp(2 + Math.floor(k * 0.62), 1, 7);
    if (st.p.w < tier) { st.p.w = tier; st.p.wn = B.drop; res.item = { kind: 'w', tier, name: B.drop, equip: true }; }
    else { const v = Math.floor(L.rew(k, 2)); st.stones += v; res.item = { kind: 'w', tier, name: B.drop, value: v }; }
    L.grantTitle(st, B.t);
    if (st.sect) taskHit(st, 'boss', x => x.k === k);
    L.log(st, `斩杀【${B.n}】！获得称号「${B.t}」`, 'gold');
    L.fireTrigger(st, 'boss:' + k);
  } else {
    st.p.inj = Math.max(st.p.inj, 4);
    L.log(st, `挑战【${B.n}】失利，重伤而归`, 'red');
  }
  L.checkQuests(st);
  return res;
};

// ---------- 成就与称号 ----------
L.grantTitle = function (st, t) { if (!st.titles.includes(t)) st.titles.push(t); st.title = t; };
L.ACHS = [
  { id: 'r1', n: '筑基', d: '突破至筑基期', c: st => mr(st) >= 1, t: '筑基修士' },
  { id: 'r2', n: '结丹', d: '结成金丹', c: st => mr(st) >= 2, t: '金丹真人' },
  { id: 'r3', n: '元婴', d: '修成元婴', c: st => mr(st) >= 3, t: '元婴老祖' },
  { id: 'r4', n: '化神', d: '踏入化神', c: st => mr(st) >= 4, t: '化神尊者' },
  { id: 'r6', n: '合体', d: '踏入合体', c: st => mr(st) >= 6, t: '合体大能' },
  { id: 'r7', n: '大乘', d: '踏入大乘', c: st => mr(st) >= 7, t: '大乘真君' },
  { id: 'r8', n: '渡劫', d: '踏入渡劫', c: st => mr(st) >= 8, t: '渡劫天尊' },
  { id: 'r9', n: '飞升', d: '白日飞升', c: st => st.p.r >= 9, t: '真仙' },
  { id: 'pact', n: '莫欺少年穷', d: '赢下三年之约', c: st => !!st.beaten.mu, t: '莫欺少年穷' },
  { id: 'awake', n: '混沌现世', d: '灵根觉醒', c: st => (st.flags.awoke || 0) >= 1, t: '混沌灵根' },
  { id: 'awake4', n: '圣体大成', d: '混沌圣体大成', c: st => (st.flags.awoke || 0) >= 4, t: '混沌圣体' },
  { id: 'sect', n: '名门弟子', d: '拜入宗门', c: st => !!st.sect, t: '名门弟子' },
  { id: 'heir', n: '一代天骄', d: '成为宗门圣子或圣女', c: st => st.sect && st.sect.rank >= 3, t: '宗门圣子' },
  { id: 'lord', n: '一宗之主', d: '成为宗主', c: st => st.sect && st.sect.rank >= 6, t: '一宗之主' },
  { id: 'top10', n: '天骄', d: '天骄榜进入前 10', c: st => st.bestRank <= 10, t: '绝代天骄' },
  { id: 'top1', n: '天下第一', d: '登顶天骄榜', c: st => st.bestRank <= 1, t: '天下第一' },
  { id: 'zhao', n: '师兄也不过如此', d: '击败赵乾', c: st => !!st.beaten.zhao, t: '弃徒归来' },
  { id: 'chu', n: '剑压圣子', d: '击败楚天阔', c: st => !!st.beaten.chu, t: '剑压圣子' },
  { id: 'xue', n: '斩魔', d: '击败血无涯', c: st => !!st.beaten.xue, t: '斩魔圣手' },
  { id: 'war', n: '一人守山门', d: '击退天剑宗来犯', c: st => !!st.flags.warWon, t: '一剑守山' },
  { id: 'sect3', n: '名门大派', d: '带领宗门进入宗门榜前三', c: st => st.sect && st.sect.best <= 3, t: '宗门砥柱' },
  { id: 'sect1', n: '天下第一宗', d: '带领宗门登顶宗门榜', c: st => st.sect && st.sect.best <= 1, t: '天下第一宗' },
  { id: 'tianjian', n: '弃徒压宗', d: '九宗会武中击败天剑宗', c: st => !!st.flags.beatTianjian, t: '弃徒压宗' },
  { id: 'veins', n: '灵脉之主', d: '为宗门夺得 3 条灵脉', c: st => st.sect && (st.sect.veins || 0) >= 3, t: '灵脉之主' },
  { id: 'exp10', n: '行走江湖', d: '历练 10 次', c: st => st.stats.exp >= 10, t: '江湖客' },
  { id: 'exp50', n: '踏遍山河', d: '历练 50 次', c: st => st.stats.exp >= 50, t: '踏遍山河' },
  { id: 'leap', n: '越级而战', d: '越级历练评价乙以上', c: st => st.stats.leapWins >= 1, t: '越级而战' },
  { id: 'tian', n: '天字评价', d: '历练拿到“天”等评价', c: st => (st.stats.tians || 0) >= 1, t: '天选之人' },
  { id: 'pet', n: '灵宠主人', d: '收服一只灵宠', c: st => !!st.p.pet, t: '灵宠之主' },
  { id: 'dragon', n: '御龙者', d: '拥有太古真灵', c: st => st.p.pet && st.p.pet.tier >= 6, t: '御龙者' },
  { id: 'craft', n: '丹道入门', d: '第一次炼丹', c: st => st.stats.crafts >= 1, t: '丹道学徒' },
  { id: 'perfect', n: '丹纹九现', d: '炼出极品丹', c: st => st.stats.perfect >= 1, t: '丹道宗师' },
  { id: 'boss3', n: '猎首者', d: '击败 3 个地图首领', c: st => st.stats.bosses >= 3, t: '猎首者' },
  { id: 'bossAll', n: '万界无敌', d: '击败全部 11 个地图首领', c: st => st.stats.bosses >= 11, t: '万界无敌' },
  { id: 'daolv', n: '神仙眷侣', d: '结为道侣', c: st => !!st.daolv, t: '神仙眷侣' },
  { id: 'friends', n: '知己满天下', d: '与 3 位 NPC 结为知己', c: st => Object.keys(L.NPCS).filter(id => L.friend(st, id)).length >= 3, t: '知己满天下' },
  { id: 'chaos', n: '手握至宝', d: '得到混沌至宝', c: st => st.p.w >= 7, t: '至宝之主' },
  { id: 'fails', n: '屡败屡战', d: '突破失败 5 次', c: st => st.stats.btFails >= 5, t: '屡败屡战' },
  { id: 'desp', n: '绝境逢生', d: '寿元将尽时突破成功', c: st => st.stats.despWin >= 1, t: '绝境逢生' },
  { id: 'rebirth', n: '轮回者', d: '转世重修', c: st => st.rebirth >= 1, t: '轮回者' },
  { id: 'events', n: '机缘深厚', d: '经历 40 次奇遇', c: st => st.stats.events >= 40, t: '机缘深厚' },
];
L.checkAchs = function (st) {
  for (const a of L.ACHS) if (!st.ach[a.id] && a.c(st)) {
    st.ach[a.id] = 1;
    L.grantTitle(st, a.t);
    const rw = Math.floor(Math.max(L.income(st), 20) * 5);
    st.stones += rw;
    st.achQ.push({ n: a.n, t: a.t, rw });
    L.log(st, `【成就】${a.n}：获得称号「${a.t}」，灵石 +${L.fmt(rw)}`, 'gold');
  }
};


// ---------- 访客（洞府奇遇） ----------
// 每周天 10% 概率来一位，停留 6 周天，同时最多一位；过期按不花钱的选项自动结算
L.VISIT = { p: 0.10, stay: 6 };
L.spawnVisitor = function (st) {
  if (st.visitor) return null;
  const ev = L.pickEvent(st, 'home', { visit: true });
  if (!ev) return null;
  st.visitor = { id: ev.id, left: L.VISIT.stay };
  return ev;
};
L.visitorEvent = st => (st.visitor ? L.eventById(st.visitor.id) : null);
function visitorLeave(st) {
  const ev = L.visitorEvent(st);
  st.visitor = null;
  if (!ev) return null;
  let idx = ev.choices.findIndex(c => !c.cost && c.p === undefined && !c.duel);
  if (idx < 0) idx = ev.choices.findIndex(c => !c.cost);
  if (idx < 0) return null;
  const visits = st.stats.visits;
  st.visitor = { id: ev.id, left: 0 };
  const res = L.resolveChoice(st, ev, idx);
  st.visitor = null; st.stats.visits = visits;   // 没见着，不算“见过访客”
  if (res) L.log(st, `访客久候不至，自行离去（${L.fill(st, ev.title)}）`);
  return { ev, res };
}

// ---------- 推进 ----------
L.flow = function (st, f) {
  const g = L.gain(st) * f;
  if (st.retreat) st.retreat.got += g;
  addXp(st, g);
  st.stones += L.income(st) * f;
  if (st.p.r <= L.MAXR) st.p.age += L.REALMS[st.p.r].mpt * f;
  st.year += L.REALMS[Math.min(st.p.r, 8)].mpt * f;
};
// 一趟历练中途的遭遇：第 ceil(len/2) 周天，60% 概率，前两趟不触发
L.ENC_P = 0.6;
L.tick = function (st, cont) {
  const out = { exp: null, event: null, tourney: false, pact: false, death: false, invite: false, war: false };
  if (!cont) L.flow(st, 1);
  st.tick++;
  const p = st.p;
  if (p.inj > 0) p.inj--;
  // 增益与灵草
  for (const bf of st.buffs) bf.left--;
  st.buffs = st.buffs.filter(bf => bf.left > 0);
  if (st.home.field > 0) { st.herbProg += L.fieldHerb(st.home.field); const n = Math.floor(st.herbProg); if (n > 0) { st.herbs += n; st.herbProg -= n; } }
  // 吐纳环：在洞府打坐才蓄
  if (!L.busy(st) && !L.isFull(st) && p.r <= L.MAXR) st.tuna = Math.min(L.TUNA_FULL, (st.tuna || 0) + 1);
  const evMul = L.friend(st, 'bai') ? 1.5 : 1;
  if (st.exp) {
    const e = st.exp;
    e.left--;
    if (e.left > 0 && e.plan && !e.encEv && e.total - e.left === Math.ceil(e.total / 2) && st.stats.exp >= 2 && e.plan.enc < L.ENC_P * evMul) {
      const ev = L.pickEvent(st, 'exp', { bg: L.REGIONS[e.k].bg });
      if (ev) { e.encEv = ev.id; e.chain = 0; out.choice = ev; }
    }
    if (e.left <= 0) {
      const r = L.resolveExp(st);
      // 连续历练：三趟合并成一张结算；丁等、遭遇、修为圆满时中断
      const sum = st.expSum || { n: 0, stones: 0, herbs: 0, pills: 0, treasure: 0, contrib: 0, xp: 0, items: [], ratings: [] };
      sum.n++; sum.stones += r.stones; sum.herbs += r.herbs; sum.pills += r.pills; sum.treasure += r.treasure; sum.contrib += r.contrib; sum.xp += r.xp; sum.items = sum.items.concat(r.items); sum.ratings.push(r.rating);
      if (r.chain > 0 && r.rating > 0 && !r.enc && !L.isFull(st) && L.startExp(st, r.k, r.d, r.a, { chain: r.chain, quiet: true })) st.expSum = sum;
      else { st.expSum = null; if (sum.n > 1) r.sum = sum; out.exp = r; }
    }
  }
  if (st.retreat) {
    st.retreat.left--;
    if (st.retreat.left <= 0) { out.retreat = L.endRetreat(st, true); if (out.retreat.visitor) out.visitor = out.retreat.visitor; }
  }
  // 访客：闭关时顺延；新手期等第一次闭关出关（或第 20 周天后）才开始有人上门
  if (st.visitor) {
    if (--st.visitor.left <= 0) out.visitorGone = visitorLeave(st);
  } else if (!st.retreat && !out.visitor && (st.rebirth > 0 || st.stats.visits > 0 || st.stats.retreat > 0 || st.tick >= 20) && R() < L.VISIT.p * evMul) {
    out.visitor = L.spawnVisitor(st);
  }
  if (!st.pact && st.tick >= L.PACT_TICK) out.pact = true;
  if (!out.pact && L.canTrain(st) && !st.flags.trainOffered) { st.flags.trainOffered = 1; out.train = true; }
  if (!st.sect && p.r >= 1 && st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick >= (st.flags.inviteAt || 0)) { out.invite = true; st.flags.inviteAt = st.tick + 12; }
  if (st.sect) {
    const sc = L.sectOf(st);
    if (sc.pill && st.tick % 6 === 0) st.pills++;
    if (!st.flags.warWon && st.sect.rank >= 2 && p.r >= 5 && st.tick >= (st.flags.war || 0) && !L.busy(st)) { out.war = true; st.flags.war = st.tick + 9999; }
    if (L.canPromote(st) && !st.flags.promoNote) { st.flags.promoNote = 1; emit('promote', st.sect.rank + 1); }
    if (!L.canPromote(st)) st.flags.promoNote = 0;
  }
  if (st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick % TOUR_EVERY === 0) { out.tourney = true; if (st.sect) L.rollTasks(st); }
  if (st.sect && st.sect.order && st.tick - st.sect.joined >= 12 && st.tick % MEET_EVERY === MEET_AT) out.meet = true;
  // 拍卖会
  if (st.auction && st.tick >= st.auction.until) st.auction = null;
  if (mr(st) >= 2 && p.r <= L.MAXR && st.tick % L.AUCTION.every === L.AUCTION.at) { rollAuction(st); out.auction = true; L.log(st, '坊市拍卖会开槌，为期 6 周天', 'gold'); }
  for (const nw of L.RIVAL_NEWS) if (nw[0] === st.tick && !st.beaten[nw[1]]) L.log(st, nw[2]);
  if (p.r <= L.MAXR && p.age >= L.lifespan(st)) out.death = true;
  if (L.desperate(st) && !st.flags.warnLife) { st.flags.warnLife = 1; L.log(st, '寿元将尽！突破时将获得绝境加成', 'red'); }
  if (!L.desperate(st)) st.flags.warnLife = 0;
  L.checkQuests(st);
  L.checkAchs(st);
  return out;
};

// ---------- 存档迁移（v2 → v3） ----------
// 缺的字段补默认值；旧数值体系下的修为按比例折算；走到一半的旧历练按旧规则结算一次；st.meta 不存在则新建
L.SAVE_V = 3;
L.migrate = function (s) {
  if (!s || !s.p || !s.home) return null;
  if (s.v !== 2 && s.v !== 3) return null;
  const old = s.v === 2;
  const p = s.p;
  s.flags = s.flags || {}; s.seenTips = s.seenTips || {}; s.beaten = s.beaten || {}; s.lifePills = s.lifePills || {}; s.lives = s.lives || [];
  s.stats = Object.assign(L.newStats(), s.stats || {});
  s.meta = s.meta || L.newMeta(); s.meta.aff = s.meta.aff || {}; s.meta.perk = s.meta.perk || {}; s.meta.seen = s.meta.seen || {};
  s.quest = s.quest || { done: {} }; s.quest.done = s.quest.done || {};
  s.best = s.best || {}; s.regionWins = s.regionWins || {}; s.bosses = s.bosses || {};
  s.npc = s.npc || {}; s.eflags = s.eflags || {}; s.evDone = s.evDone || {}; s.evLast = s.evLast || {}; s.storyQ = s.storyQ || []; s.buffs = s.buffs || [];
  s.bonus = s.bonus || { cul: 0, atk: 0 }; s.ach = s.ach || {}; s.titles = s.titles || []; s.achQ = s.achQ || []; s.log = s.log || [];
  for (const k of ['herbs', 'herbProg', 'treasure', 'lifeBonus', 'tuna', 'boxMiss', 'pills', 'stones', 'rebirth', 'tick', 'year']) if (typeof s[k] !== 'number' || !isFinite(s[k])) s[k] = 0;
  if (s.retreat === undefined) s.retreat = null;
  if (s.visitor === undefined) s.visitor = null;
  if (s.auction === undefined) s.auction = null;
  if (s.lastExp === undefined) s.lastExp = null;
  s.origin = s.origin || 'qitu';
  if (typeof p.over !== 'number') p.over = 0;
  if (typeof p.inj !== 'number') p.inj = 0;
  if (typeof p.fails !== 'number') p.fails = 0;
  p.tr = p.tr || [];
  if (old) {
    const st = s;
    // 修为：旧需求 300 × 1.55^i（更早的档还要 ×10），按进度比例折成新数值
    const i = Math.min(L.si(p), 35);
    const oldNeed = 300 * Math.pow(1.55, i) / (s.xs ? 1 : 10);
    if (p.r <= L.MAXR) p.xp = Math.min(1, Math.max(0, p.xp / oldNeed)) * L.need(i);
    delete s.xs; delete s.pillProg; delete s.tunaLeft; delete s.goal;
    // 洞府等级上限变了
    for (const b of L.HOME) s.home[b.k] = clamp(Math.floor(s.home[b.k] || 0), 0, b.max);
    s.flags.maxR = Math.max(s.flags.maxR || 0, Math.min(p.r, 9));
    s.flags.maxI = Math.max(s.flags.maxI || 0, Math.min(L.si(p), 35));
    if (p.r >= 1) { s.flags.guardUsed = 1; s.flags.retFree = 1; }
    // 灵根：旧版筑基一步到位觉醒成满档，新版分四次
    if (s.flags.awoke) {
      let stage = 0, t = 1;
      L.AWAKE.forEach((a, j) => { if (p.r >= a.r) { stage = j + 1; t = a.t; } });
      s.flags.awoke = stage; p.t = Math.min(p.t, Math.max(t, 1));
    }
    p.t = clamp(p.t | 0, 0, 6);
    // 历练进度：打赢过的图视为外围评价乙；打赢三次以上的，腹地、禁地也算（首领照旧可打）
    for (const k in s.regionWins) if (s.regionWins[k] > 0) { s.best[k + '_0'] = 2; if (s.regionWins[k] >= 3) { s.best[k + '_1'] = 2; s.best[k + '_2'] = 2; } }
    // 以前的章节直接记为已完成（不补发奖励）；当前章节照常结算
    for (let r = 0; r < Math.min(p.r, 9); r++) { const ch = L.CHAPTERS[r]; for (const q of ch.tasks.concat([ch.main])) if (q.c(st)) s.quest.done[q.id] = 1; }
    if (s.sect) { s.sect.tasks = s.sect.tasks || []; s.sect.build = s.sect.build || { ward: 0, lib: 0, vein: 0 }; s.sect.freePick = s.sect.freePick || 0; L.sectOf(s); }
    // 时间线：新版一个周天流逝的年数变了，别让人一读档就坐化
    if (p.r <= L.MAXR && p.age > L.lifespan(s) * 0.85) p.age = L.lifespan(s) * 0.85;
    if (s.pact && s.rank > 72 && s.beaten.mu) { /* 名次照旧 */ }
    s.v = 3;
    // 走到一半的旧历练：按旧规则结算一次
    if (s.exp && !s.exp.plan) s.migratedExp = L.resolveExp(s);
    L.log(s, '洞天重整：修为、历练与洞府换了新章法，旧日积累已按比例折算', 'gold');
  }
  if (s.sect) { s.sect.tasks = s.sect.tasks || []; s.sect.build = s.sect.build || { ward: 0, lib: 0, vein: 0 }; }
  if (s.exp && !s.exp.plan) s.exp = null;
  s.v = 3;
  return s;
};

// ---------- 转世 ----------
L.rebirthCards = function (st, n) {
  const k = (st ? st.rebirth : 0) + 1;
  const q = 0.25 + 0.15 * k;
  const base = [10, 30, 30, 18, 8, 3, 0.8];
  const keys = Object.keys(L.TRAITS).filter(x => x !== 'hero');
  const out = [];
  for (let i = 0; i < (n || 3); i++) {
    const t = wpick(base.map((v, j) => [j, v * Math.pow(1 + q, j)]));
    out.push({ t, tr: [pick(keys)] });
  }
  return out;
};
L.lifeSummary = function (st) {
  return { name: st.p.name, r: st.p.r, s: st.p.s, age: Math.floor(st.p.age), rank: st.bestRank, ascended: st.p.r >= 9, ticks: st.tick };
};

if (typeof module !== 'undefined' && module.exports) module.exports = L;
else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
