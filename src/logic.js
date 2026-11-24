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

// ---------- 数值参数 ----------
const P = L.P = { needBase: 30, needGrow: 1.55, monBase: 12, monGrow: 1.19, pw0: 10, pwStage: 1.5, pwRealm: 1.8 };

// ---------- 静态数据 ----------
// life: 该境界寿元（年）；mpt: 一个周天流逝的年数
L.REALMS = [
  { n: '炼气', robe: ['#5d6f8a', '#7f93ab', '#a9bacb'], trim: '#dfe7ef', rate: 0.92, trib: 0, life: 100, mpt: 1 / 6 },
  { n: '筑基', robe: ['#2f6e4b', '#4f9e68', '#7cc792'], trim: '#c9f0d4', rate: 0.80, trib: 0, life: 200, mpt: 0.5 },
  { n: '金丹', robe: ['#9a6a1c', '#d6a032', '#f2cc6a'], trim: '#fff0bd', rate: 0.70, trib: 3, life: 400, mpt: 1 },
  { n: '元婴', robe: ['#4f3a9e', '#7d5bd6', '#a98af0'], trim: '#e2d8ff', rate: 0.60, trib: 4, life: 800, mpt: 2.5 },
  { n: '化神', robe: ['#8e2a35', '#c8434e', '#ea7a80'], trim: '#ffd3d5', rate: 0.52, trib: 5, life: 1500, mpt: 5 },
  { n: '炼虚', robe: ['#24579a', '#3c84d6', '#76b0ee'], trim: '#d3e8ff', rate: 0.46, trib: 6, life: 3000, mpt: 10 },
  { n: '合体', robe: ['#18756c', '#2aa79b', '#5fd3c4'], trim: '#cff8f2', rate: 0.40, trib: 7, life: 6000, mpt: 20 },
  { n: '大乘', robe: ['#b9b3a5', '#e9e6dc', '#ffffff'], trim: '#ffd76a', rate: 0.35, trib: 8, life: 12000, mpt: 40 },
  { n: '渡劫', robe: ['#17131f', '#2e2838', '#4a4157'], trim: '#ffcc44', rate: 0.30, trib: 9, life: 24000, mpt: 80 },
  { n: '真仙', robe: ['#e8d48a', '#fff4c2', '#ffffff'], trim: '#ffffff', rate: 0, trib: 0, life: Infinity, mpt: 0 },
];
L.STAGES = ['初期', '中期', '后期', '圆满'];
L.MAXR = 8;

L.TALENTS = [
  { n: '伪灵根', c: '#9aa0a6', cul: 0.7, atk: 0.85 },
  { n: '杂灵根', c: '#e6e1d3', cul: 1.0, atk: 1.0 },
  { n: '双灵根', c: '#62d26f', cul: 1.3, atk: 1.15 },
  { n: '单灵根', c: '#4aa8ff', cul: 1.65, atk: 1.3 },
  { n: '天灵根', c: '#c27dff', cul: 2.1, atk: 1.5 },
  { n: '先天道体', c: '#ffcf3f', cul: 2.6, atk: 1.75 },
  { n: '混沌圣体', c: 'rainbow', cul: 3.2, atk: 2.0 },
];
L.TRAITS = {
  hero:   { n: '主角光环', d: '奇遇概率×2，突破成功率+10%' },
  sword:  { n: '先天剑骨', d: '战力×1.5' },
  wise:   { n: '悟性超群', d: '修炼速度×1.3' },
  alch:   { n: '丹道奇才', d: '突破成功率+15%' },
  lucky:  { n: '气运之子', d: '奇遇概率×3，宝物品质更高' },
  longev: { n: '长生之体', d: '寿元×1.5' },
  steady: { n: '道心坚定', d: '突破失败不受伤、不掉修为' },
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
L.HOME = [
  { k: 'cave', n: '洞府', base: 150, grow: 2.1, max: 12, d: lv => `寿元 +${lv * 5}% · ${caveName(lv)}` },
  { k: 'array', n: '聚灵阵', base: 60, grow: 1.75, max: 40, d: lv => `修炼速度 ×${L.arrayMult(lv).toFixed(2)}` },
  { k: 'field', n: '灵田', base: 50, grow: 1.75, max: 40, d: lv => `每周天产出灵石 ${L.fmt(L.fieldInc(lv))}` },
  { k: 'furnace', n: '丹炉', base: 150, grow: 1.8, max: 25, d: lv => lv ? `突破成功率 +${lv * 2}% · 每周天炼丹 ${(lv * 2.5).toFixed(1).replace('.0', '')}%` : '自动炼制破境丹，提升突破成功率' },
];
function caveName(lv) { return lv <= 0 ? '荒山破庙' : lv <= 2 ? '竹林小筑' : lv <= 5 ? '石壁洞府' : lv <= 8 ? '云中楼阁' : '琼楼仙宫'; }
L.caveName = caveName;
L.arrayMult = lv => Math.pow(1.11, lv);
L.fieldInc = lv => 8 * Math.pow(1.62, lv);

// 历练地图
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
// 推荐战力（个人），由模拟校准
L.DREC = [20, 200, 2600, 4e4, 4.5e5, 6e6, 9e7, 1e9, 1.3e10, 1.4e11, 1e12];
L.DREW = [60, 170, 450, 1200, 3200, 8500, 22000, 58000, 1.5e5, 4e5, 1.1e6];

// 坊市
L.MARKET = [
  { k: 'pill', n: '破境丹', d: '突破成功率 +20%', base: 50 },
  { k: 'life', n: '延寿丹', d: '寿元 +10%，每个大境界最多服用三枚', base: 260 },
  { k: 'box', n: '寻宝', d: '随机得到一件法宝或一部功法', base: 160 },
  { k: 'egg', n: '灵兽蛋', d: '孵化一只灵宠，品阶随机', base: 420 },
];
L.price = (st, k) => Math.floor(L.MARKET.find(m => m.k === k).base * Math.pow(2.55, st.p.r));

// 宗门
L.SECTS = [
  { id: 'jian', n: '太虚剑宗', d: '天下剑修圣地', perk: '战力 ×1.25', atk: 1.25, cul: 1, bt: 0, color: '#4aa8ff' },
  { id: 'dan', n: '丹霞谷', d: '丹道第一宗门', perk: '突破成功率 +10%，俸禄附赠破境丹', atk: 1, cul: 1, bt: 0.1, pill: true, color: '#ff8a5c' },
  { id: 'dao', n: '玄天道宗', d: '传承万年的道法正宗', perk: '修炼速度 ×1.25', atk: 1, cul: 1.25, bt: 0, color: '#c27dff' },
];
// 宗门身份：r 需要的境界，c 需要的累计贡献，pay 俸禄倍率
L.SRANKS = [
  { n: '外门弟子', r: 0, c: 0, pay: 1 },
  { n: '内门弟子', r: 1, c: 60, pay: 2 },
  { n: '真传弟子', r: 2, c: 400, pay: 4 },
  { n: '圣子', nf: '圣女', r: 3, c: 2500, pay: 8, duel: true },
  { n: '长老', r: 4, c: 1.5e4, pay: 16 },
  { n: '太上长老', r: 6, c: 1e5, pay: 32 },
  { n: '宗主', r: 7, c: 4e5, pay: 64 },
];
L.sectOf = st => st.sect ? L.SECTS.find(x => x.id === st.sect.id) : null;
L.srankName = (st, i) => { const R0 = L.SRANKS[i]; return st.p.look.f && R0.nf ? R0.nf : R0.n; };
L.pay = st => st.sect ? 2 * Math.pow(2, st.p.r) * L.SRANKS[st.sect.rank].pay : 0;
L.canPromote = function (st) {
  if (!st.sect) return false;
  const nx = L.SRANKS[st.sect.rank + 1];
  return !!nx && st.p.r >= nx.r && st.sect.total >= nx.c;
};
L.contribFor = k => Math.floor(12 * Math.pow(2.3, k));
// 宗门宝库（贡献兑换）
L.VAULT = [
  { k: 'vart', n: '秘传功法', d: '本宗不传之秘' },
  { k: 'vwep', n: '镇宗法宝', d: '借出镇宗之宝，归你所有' },
  { k: 'vpill', n: '破境丹 ×2', d: '宗门丹房特供' },
];
L.vaultTier = (st, k) => k === 'vart' ? Math.min(6, st.sect.rank + 1) : k === 'vwep' ? Math.min(7, st.sect.rank + 2) : 0;
L.vaultCost = (st, k) => k === 'vpill' ? Math.floor(15 * Math.pow(2.3, st.p.r)) : Math.floor((k === 'vart' ? 40 : 60) * Math.pow(3.2, st.sect.rank));

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
  { id: 'yun', q: 1, name: '云无极', sect: '太虚宫', title: '天下第一天骄' },
];

// ---------- 公式 ----------
L.si = p => p.r * 4 + p.s;
L.need = i => Math.floor(P.needBase * Math.pow(P.needGrow, i));
L.pNeed = p => L.need(L.si(p));
L.stageName = p => p.r >= 9 ? '真仙' : L.REALMS[p.r].n + L.STAGES[p.s];
L.isReady = st => !st.exp && st.p.s === 3 && st.p.xp >= L.pNeed(st.p) && st.p.r <= L.MAXR;
L.has = (st, k) => st.p.tr.includes(k);
L.lifespan = function (st) {
  const p = st.p;
  if (p.r >= 9) return Infinity;
  let y = L.REALMS[p.r].life * (1 + 0.05 * st.home.cave);
  if (L.has(st, 'longev')) y *= 1.5;
  return y + (st.lifeBonus || 0);
};
L.lifeLeft = st => L.lifespan(st) - st.p.age;
L.desperate = st => st.p.r <= L.MAXR && L.lifeLeft(st) < L.lifespan(st) * 0.12;
L.gain = function (st) {
  const p = st.p, i = L.si(p);
  const base = L.need(i) / (P.monBase * Math.pow(P.monGrow, i));
  let m = L.TALENTS[p.t].cul * L.ARTS[p.a].m * L.arrayMult(st.home.array) * (1 + 0.5 * st.rebirth);
  const sc = L.sectOf(st); if (sc) m *= sc.cul;
  if (L.has(st, 'wise')) m *= 1.3;
  if (p.inj > 0) m *= 0.5;
  if (st.exp) m *= 0.5;
  return base * m;
};
L.power = function (st) {
  const p = st.p, i = L.si(p);
  let v = P.pw0 * Math.pow(P.pwStage, i) * Math.pow(P.pwRealm, p.r);
  v *= L.TALENTS[p.t].atk * L.WEAPONS[p.w].m * L.PETS[p.pet ? p.pet.tier : 0].m * (1 + 0.25 * st.rebirth);
  if (L.has(st, 'sword')) v *= 1.5;
  const sc = L.sectOf(st); if (sc) v *= sc.atk;
  if (p.inj > 0) v *= 0.6;
  return v;
};
L.income = function (st) {
  let s = L.fieldInc(st.home.field) + 3 * Math.pow(2.1, st.p.r) + L.pay(st);
  if (L.has(st, 'koi')) s *= 1.5;
  return s;
};
L.hCost = (k, lv) => { const b = L.HOME.find(x => x.k === k); return Math.floor(b.base * Math.pow(b.grow, lv)); };
L.btRate = function (st, usePill) {
  const p = st.p;
  let v = L.REALMS[p.r].rate + st.home.furnace * 0.02 + p.fails * 0.12;
  if (usePill) v += 0.2;
  if (L.has(st, 'hero')) v += 0.1;
  if (L.has(st, 'alch')) v += 0.15;
  if (L.desperate(st)) v += 0.25;
  const sc = L.sectOf(st); if (sc) v += sc.bt;
  return clamp(v, 0.05, 1);
};
L.expChance = function (st, k) {
  const T = L.power(st);
  const ratio = T / L.DREC[k];
  return { T, ratio, p: clamp(0.75 + 0.3 * Math.log2(Math.max(ratio, 1e-9)), 0.05, 0.98) };
};
L.unlocked = (st, k) => k <= st.p.r + 2;

// 天骄榜对手战力（按排名与周天数插值，由模拟校准）
const RA = [[1, 18.39], [2, 17.9], [4, 16.52], [12, 14.14], [30, 12.62], [45, 9.71], [60, 6.9], [72, 5.08], [85, 3.78], [100, 2.08]];
L.rivalPower = function (st, q) {
  const t = st.tick;
  let a = RA[RA.length - 1][1];
  for (let j = 0; j < RA.length - 1; j++) {
    const [q0, a0] = RA[j], [q1, a1] = RA[j + 1];
    if (q >= q0 && q <= q1) { a = a0 + (a1 - a0) * (q - q0) / (q1 - q0); break; }
  }
  const G = 0.026 * Math.min(t, 180) + 0.012 * Math.max(0, t - 180);
  return Math.exp(a + G);
};
L.rivalAt = function (st, q) { if (q === st.rank) return null; return st.ladder[q < st.rank ? q - 1 : q - 2]; };
L.rivalRank = function (st, id) { const i = st.ladder.findIndex(x => x.id === id); if (i < 0) return 0; return i + 1 < st.rank ? i + 1 : i + 2; };

// ---------- 新档 ----------
function randLook(female) {
  return { hair: pick(['#2a2230', '#3b2a22', '#4a3328', '#262a3a']), skin: pick(['#f2c9a0', '#e8b68a', '#f6d3b3']), f: female ? 1 : 0 };
}
L.newState = function (o) {
  o = o || {};
  const female = !!o.female;
  const st = {
    v: 2, tick: 0, year: 0, stones: 120 + 500 * (o.rebirth || 0), pills: 1, pillProg: 0, lifeBonus: 0, lifePills: {},
    home: { cave: 0, array: 0, field: 0, furnace: 0 },
    exp: null, rank: 100, bestRank: 100, ladder: [], beaten: {}, pact: 0, sect: null,
    goal: 0, log: [], rebirth: o.rebirth || 0, lives: o.lives || [], flags: {}, seenTips: {},
    stats: { exp: 0, expWin: 0, bt: 0, events: 0, tour: 0 },
    p: {
      name: o.name || '林逸尘', look: { hair: '#2a2230', skin: '#f2c9a0', f: female ? 1 : 0 },
      t: o.t !== undefined ? o.t : 1, tr: o.tr || ['hero'], r: 0, s: 0, xp: 0, age: 16,
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
  void randLook;
  return st;
};

L.log = function (st, text, cls) {
  st.log.unshift({ t: `第${Math.floor(st.year) + 1}年`, text, cls: cls || '' });
  if (st.log.length > 60) st.log.length = 60;
  emit('log', { text, cls });
};

// ---------- 目标 ----------
L.GOALS = [
  { t: '修为精进至炼气中期', c: st => L.si(st.p) >= 1, rw: 60 },
  { t: '将聚灵阵升到 1 级', c: st => st.home.array >= 1, rw: 100 },
  { t: '外出历练一次', c: st => st.stats.exp >= 1, rw: 150 },
  { t: '突破至筑基期', c: st => st.p.r >= 1 || st.flags.maxR >= 1, rw: 400 },
  { t: '三年之约：击败{EX}', c: st => !!st.beaten.mu, rw: 800 },
  { t: '拜入一方宗门', c: st => !!st.sect, rw: 500 },
  { t: '晋升真传弟子', c: st => st.sect && st.sect.rank >= 2, rw: 2000 },
  { t: '结成金丹', c: st => (st.flags.maxR || 0) >= 2, rw: 2500 },
  { t: '收服一只灵宠', c: st => !!st.p.pet, rw: 3000 },
  { t: '天骄榜进入前 50', c: st => st.bestRank <= 50, rw: 6000 },
  { t: '击败天剑宗大师兄赵乾', c: st => !!st.beaten.zhao, rw: 1.2e4 },
  { t: '修成元婴', c: st => (st.flags.maxR || 0) >= 3, rw: 2e4 },
  { t: '成为宗门圣子', c: st => st.sect && st.sect.rank >= 3, rw: 5e4 },
  { t: '踏入化神', c: st => (st.flags.maxR || 0) >= 4, rw: 1e5 },
  { t: '击败天剑宗圣子楚天阔', c: st => !!st.beaten.chu, rw: 3e5 },
  { t: '击退来犯的天剑宗', c: st => !!st.flags.warWon, rw: 5e5 },
  { t: '踏入合体', c: st => (st.flags.maxR || 0) >= 6, rw: 1.5e6 },
  { t: '执掌宗门，成为宗主', c: st => st.sect && st.sect.rank >= 6, rw: 6e6 },
  { t: '击败魔道圣子血无涯', c: st => !!st.beaten.xue, rw: 4e6 },
  { t: '登顶天骄榜第一', c: st => st.bestRank <= 1, rw: 1e7 },
  { t: '踏入渡劫', c: st => (st.flags.maxR || 0) >= 8, rw: 2e7 },
  { t: '渡过飞升天劫，白日飞升', c: st => st.p.r >= 9, rw: 0 },
];
L.goalText = (st, g) => g.t.replace('{EX}', st.exName);
L.checkGoals = function (st) {
  while (st.goal < L.GOALS.length && L.GOALS[st.goal].c(st)) {
    const g = L.GOALS[st.goal];
    st.stones += g.rw;
    st.goal++;
    emit('goal', { t: L.goalText(st, g), rw: g.rw });
    if (g.rw) L.log(st, `【目标达成】${L.goalText(st, g)}，奖励灵石 ${L.fmt(g.rw)}`, 'gold');
  }
};

// ---------- 修为 ----------
function addXp(st, g) {
  const p = st.p;
  if (p.r > L.MAXR) return;
  p.xp += g;
  let ups = 0;
  while (p.s < 3 && p.xp >= L.pNeed(p)) { p.xp -= L.pNeed(p); p.s++; ups++; }
  if (p.s === 3 && p.xp >= L.pNeed(p)) {
    p.xp = L.pNeed(p);
    if (!st.flags.readyNotified && !st.exp) { st.flags.readyNotified = 1; emit('ready', p); }
  } else st.flags.readyNotified = 0;
  if (ups) emit('stageUp', { ups });
}
L.addXp = addXp;

// ---------- 洞府 ----------
L.upgrade = function (st, k) {
  const b = L.HOME.find(x => x.k === k);
  const lv = st.home[k];
  if (lv >= b.max) return false;
  const c = L.hCost(k, lv);
  if (st.stones < c) return false;
  st.stones -= c;
  st.home[k]++;
  L.log(st, `${b.n}升至 ${st.home[k]} 级${k === 'cave' ? '：' + caveName(st.home[k]) : ''}`);
  L.checkGoals(st);
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
L.giveItem = function (st, kind, tier) {
  const p = st.p;
  if (kind === 'pet') {
    const T = L.PETS[tier];
    const it = { kind, tier, name: pick(T.names) };
    if (!p.pet || p.pet.tier < tier) { p.pet = { tier, name: it.name }; it.equip = true; }
    else { it.value = Math.floor(L.price(st, 'egg') * 0.3); st.stones += it.value; }
    return it;
  }
  const list = kind === 'w' ? L.WEAPONS : L.ARTS;
  tier = clamp(tier, 1, list.length - 1);
  const it = { kind, tier, name: pick(list[tier].names) };
  if (p[kind] < tier) { p[kind] = tier; p[kind + 'n'] = it.name; it.equip = true; }
  else { it.value = Math.floor(L.price(st, 'box') * 0.3); st.stones += it.value; }
  return it;
};
L.buy = function (st, k) {
  const c = L.price(st, k);
  if (st.stones < c) return null;
  const r = st.p.r;
  if (k === 'life') {
    const used = st.lifePills[r] || 0;
    if (used >= 3) return null;
    st.lifePills[r] = used + 1;
    const add = Math.floor(L.REALMS[r].life * 0.1);
    st.lifeBonus += add;
    st.stones -= c;
    L.log(st, `服下延寿丹，寿元增加 ${add} 年`, 'jade');
    return { k, add };
  }
  st.stones -= c;
  if (k === 'pill') { st.pills++; return { k }; }
  if (k === 'box') {
    const kind = R() < 0.55 ? 'w' : 'a';
    const it = L.giveItem(st, kind, rollTier(st, 1 + Math.floor(r * (kind === 'w' ? 0.75 : 0.6)), kind === 'w' ? 7 : 6));
    return { k, it };
  }
  if (k === 'egg') {
    const it = L.giveItem(st, 'pet', rollTier(st, 1 + Math.floor(r * 0.6), 6));
    L.checkGoals(st);
    return { k, it };
  }
  return null;
};

// ---------- 突破 ----------
L.breakthrough = function (st, usePill) {
  if (!L.isReady(st)) return null;
  const p = st.p;
  if (usePill && st.pills <= 0) usePill = false;
  const rate = L.btRate(st, usePill);
  if (usePill) st.pills--;
  const ok = R() < rate;
  const from = p.r;
  const before = L.power(st);
  const res = { ok, from, to: from + 1, rate, usedPill: usePill, before, trib: L.REALMS[Math.min(from + 1, 8)].trib, ascend: from === L.MAXR, lifeBefore: L.lifespan(st) };
  st.stats.bt++;
  if (ok) {
    p.r++; p.s = 0; p.xp = 0; p.fails = 0; st.flags.readyNotified = 0;
    st.flags.maxR = Math.max(st.flags.maxR || 0, p.r);
    if (p.r === 1 && !st.flags.awoke && st.rebirth === 0) { st.flags.awoke = 1; res.awaken = { from: p.t, to: 6 }; p.t = 6; }
    if (p.r >= 9) { res.ascend = true; st.flags.ascended = 1; L.log(st, `★ ${p.name} 渡过九九天劫，白日飞升！`, 'gold'); }
    else L.log(st, `突破成功，踏入${L.REALMS[p.r].n}期！寿元增至 ${L.fmt(L.lifespan(st))} 年`, p.r >= 2 ? 'gold' : 'jade');
    res.after = L.power(st);
    res.lifeAfter = L.lifespan(st);
  } else {
    p.fails++;
    if (!L.has(st, 'steady')) { p.xp = Math.floor(L.pNeed(p) * 0.7); p.inj = Math.max(p.inj, 2); }
    else p.xp = Math.floor(L.pNeed(p) * 0.95);
    st.flags.readyNotified = 0;
    res.after = L.power(st);
    L.log(st, `冲击${from >= L.MAXR ? '飞升' : L.REALMS[from + 1].n}失败……下次成功率 +12%`, 'red');
  }
  L.checkGoals(st);
  return res;
};

// ---------- 历练 ----------
L.startExp = function (st, k) {
  if (st.exp || !L.unlocked(st, k)) return false;
  const rg = L.REGIONS[k];
  st.exp = { k, left: rg.mon, total: rg.mon };
  L.log(st, `御剑出发，前往【${rg.n}】历练`);
  return true;
};
L.resolveExp = function (st) {
  const e = st.exp; if (!e) return null;
  st.exp = null;
  const k = e.k;
  const ch = L.expChance(st, k);
  const ok = R() < ch.p;
  const res = { k, ok, ratio: ch.ratio, p: ch.p, items: [], stones: 0, pills: 0 };
  st.stats.exp++;
  const luck = L.has(st, 'lucky') ? 3 : L.has(st, 'hero') ? 2 : 1;
  if (ok) {
    st.stats.expWin++;
    const leap = ch.ratio < 0.6;
    res.leap = leap;
    let stones = L.DREW[k] * (0.85 + R() * 0.3);
    if (L.has(st, 'koi')) stones *= 1.5;
    if (leap) stones *= 2;
    res.stones = Math.floor(stones);
    st.stones += res.stones;
    res.xp = L.gain(st) * 2 * L.REGIONS[k].mon * 0.75; // gain 已按历练减半，这里折回
    addXp(st, res.xp);
    if (R() < 0.6) res.pills++;
    if (k >= 4 && R() < 0.5) res.pills++;
    st.pills += res.pills;
    if (R() < 0.38) res.items.push(L.giveItem(st, 'w', rollTier(st, 1 + Math.floor(k * 0.62), 7)));
    if (R() < 0.32) res.items.push(L.giveItem(st, 'a', rollTier(st, 1 + Math.floor(k * 0.5), 6)));
    if (R() < 0.12 * luck) res.items.push(L.giveItem(st, 'pet', rollTier(st, 1 + Math.floor(k * 0.5), 6)));
    if (R() < 0.08 * luck) {
      const g = L.gain(st) * 2 * 12;
      addXp(st, g);
      res.fortune = pick(['坠落山崖，误入上古传承之地，得前辈遗泽，修为暴涨！', '于瀑布后发现一处洞天，内有千年灵乳，饮之修为大进！', '救下一位重伤的老者，老者临终传你毕生感悟！']);
    }
    if (st.sect) { res.contrib = L.contribFor(k) * (leap ? 2 : 1); st.sect.total += res.contrib; st.sect.pts += res.contrib; }
    L.log(st, `【${L.REGIONS[k].n}】历练${leap ? '越级' : ''}成功！灵石+${L.fmt(res.stones)}`, leap ? 'gold' : 'jade');
  } else {
    res.stones = Math.floor(L.DREW[k] * 0.1);
    st.stones += res.stones;
    st.p.inj = Math.max(st.p.inj, 3);
    L.log(st, `【${L.REGIONS[k].n}】历练失利，负伤而归`, 'red');
  }
  L.checkGoals(st);
  return res;
};

// ---------- 对决 ----------
L.duelChance = (P1, P2) => clamp(0.5 + 0.55 * Math.log2(P1 / P2), 0.03, 0.97);
// 三年之约：对手战力（约等于炼气圆满、带一件法器）
L.pactPower = () => P.pw0 * Math.pow(P.pwStage, 3.4) * 1.3 * 1.7;
L.pactDuel = function (st) {
  let S = L.power(st);
  const Q = L.pactPower();
  // 第一世尚未筑基时，戒中老祖借你一缕神魂之力
  const assist = st.rebirth === 0 && st.p.r === 0;
  if (assist) S *= 2.5;
  const p = L.duelChance(S, Q);
  const win = R() < p;
  st.pact = win ? 1 : -1;
  const res = { S, Q, p, win, assist };
  if (win) {
    st.beaten.mu = 1;
    res.stones = 600; st.stones += 600;
    L.log(st, `三年之约，${st.p.name}当众击败${st.exName}！满城哗然`, 'gold');
  } else L.log(st, `三年之约惜败于${st.exName}……来日天骄榜上再见分晓`, 'red');
  L.checkGoals(st);
  return res;
};
L.tournament = function (st) {
  const S = L.power(st);
  st.stats.tour++;
  const res = { n: st.stats.tour, startRank: st.rank, rounds: [], S };
  const mults = [0.5, 0.85, 1.2];
  for (let j = 0; j < 3; j++) {
    let q;
    if (st.rank === 1) q = 2;
    else {
      const target = S * mults[j];
      q = st.rank - 1; let best = Infinity;
      for (let x = st.rank - 1; x >= 1; x--) {
        const pw = L.rivalPower(st, x);
        const dlt = Math.abs(Math.log(pw / target));
        if (dlt < best) { best = dlt; q = x; }
        if (pw > target * 3) break;
      }
      // 宿敌优先：若范围内有宿敌，则挑战宿敌
      for (let x = st.rank - 1; x >= Math.max(1, q - 6); x--) { const rv = L.rivalAt(st, x); if (rv && rv.id && !st.beaten[rv.id] && L.rivalPower(st, x) < S * 1.6) { q = x; break; } }
    }
    const rv = L.rivalAt(st, q);
    const Q = L.rivalPower(st, q);
    const p = L.duelChance(S, Q);
    const win = R() < p;
    const round = { q, rv, P: Q, p, win };
    if (win) {
      if (st.rank === 1) round.defend = true; else st.rank = q;
      const rw = Math.floor(L.income(st) * 4 + L.DREW[Math.min(10, st.p.r + 1)] * 0.4 + 50);
      round.stones = rw; st.stones += rw;
      if (st.sect) { round.contrib = L.contribFor(Math.min(10, st.p.r + 1)); st.sect.total += round.contrib; st.sect.pts += round.contrib; }
      if (rv && rv.id) { round.first = !st.beaten[rv.id]; st.beaten[rv.id] = (st.beaten[rv.id] || 0) + 1; }
    }
    res.rounds.push(round);
    if (!win) break;
  }
  st.bestRank = Math.min(st.bestRank, st.rank);
  res.endRank = st.rank;
  L.log(st, `第${res.n}届天骄论道落幕，${st.p.name}位列天骄榜第 ${st.rank}`, st.rank < res.startRank ? 'gold' : '');
  L.checkGoals(st);
  return res;
};

// ---------- 宗门 ----------
L.joinSect = function (st, id) {
  const sc = L.SECTS.find(x => x.id === id); if (!sc || st.sect) return false;
  st.sect = { id, rank: 0, total: 0, pts: 0, joined: st.tick };
  L.log(st, `拜入${sc.n}，成为外门弟子`, 'gold');
  L.checkGoals(st);
  return true;
};
// 原圣子（或圣女）的战力：约等于元婴初期、灵器加身
L.heirPower = () => P.pw0 * Math.pow(P.pwStage, 12) * Math.pow(P.pwRealm, 3) * 1.5 * 2.3;
L.promote = function (st) {
  if (!L.canPromote(st)) return null;
  const nx = L.SRANKS[st.sect.rank + 1];
  const res = { from: st.sect.rank, to: st.sect.rank + 1 };
  if (nx.duel) {
    const S = L.power(st), Q = L.heirPower();
    const p = L.duelChance(S, Q);
    res.duel = { S, Q, p, win: R() < p };
    if (!res.duel.win) { L.log(st, `挑战原${L.srankName(st, st.sect.rank + 1)}失利，来日再战`, 'red'); return res; }
  }
  st.sect.rank++;
  res.ok = true;
  L.log(st, `全宗震动！晋升${L.SECTS.find(x => x.id === st.sect.id).n}${L.srankName(st, st.sect.rank)}`, 'gold');
  L.checkGoals(st);
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
  st.sect.pts -= c;
  return { k, it: L.giveItem(st, key, tier) };
};
// 天剑宗来犯：对手是天剑宗长老团（约等于炼虚中期的强者）
L.warPower = () => P.pw0 * Math.pow(P.pwStage, 21) * Math.pow(P.pwRealm, 5) * 7;
L.sectWar = function (st) {
  const S = L.power(st), Q = L.warPower();
  const p = L.duelChance(S, Q);
  const win = R() < p;
  const res = { S, Q, p, win };
  if (win) {
    st.flags.warWon = 1;
    res.contrib = L.contribFor(Math.min(10, st.p.r + 2)) * 3;
    res.stones = Math.floor(L.DREW[Math.min(10, st.p.r + 1)] * 2);
    st.sect.total += res.contrib; st.sect.pts += res.contrib; st.stones += res.stones;
    L.log(st, '天剑宗大举来犯，你一人一剑立于山门，杀退来敌！', 'gold');
  } else {
    st.flags.war = st.tick + 24;
    L.log(st, '天剑宗来犯，宗门苦战方才退敌……此仇必报', 'red');
  }
  L.checkGoals(st);
  return res;
};

// ---------- 随机事件 ----------
L.randomEvent = function (st) {
  const p = st.p;
  const inc = L.income(st);
  const opts = [['enl', 22], ['cave', 18], ['rain', 10], ['pill', 8], ['bandit', 10], ['taunt', 9], ['fairy', 6], ['recruit', 6], ['ring', 3]];
  if (!p.pet || p.pet.tier < 3) opts.push(['beast', 5]);
  const kind = wpick(opts);
  const ev = { kind };
  switch (kind) {
    case 'enl': addXp(st, L.gain(st) * 6); ev.text = '观云海翻涌，忽有所悟——顿悟！修为大涨'; ev.cls = 'jade'; ev.pop = '顿悟！'; break;
    case 'cave': { const v = Math.floor(inc * 8 + 40); st.stones += v; ev.text = `于后山寻得一处古修洞府，得灵石 ${L.fmt(v)}`; ev.cls = 'gold'; ev.pop = '洞府！'; break; }
    case 'rain': addXp(st, L.gain(st) * 3); ev.text = '天降灵雨，修为精进'; ev.cls = 'jade'; ev.pop = '灵雨'; break;
    case 'pill': { const n = 1 + (R() < 0.3 ? 1 : 0); st.pills += n; ev.text = `游方丹师路过洞府，赠下破境丹 ×${n}`; ev.cls = 'jade'; ev.pop = '赠丹'; break; }
    case 'bandit': {
      const S = L.power(st), Q = S * (0.45 + R() * 0.8);
      if (S >= Q * (0.8 + R() * 0.4)) { const v = Math.floor(inc * 5 + 60); st.stones += v; ev.text = `劫修夜闯洞府，被一剑斩退！缴获灵石 ${L.fmt(v)}`; ev.cls = 'gold'; ev.pop = '斩敌'; }
      else { const v = Math.floor(st.stones * 0.1); st.stones -= v; ev.text = `劫修夜闯洞府，抢走灵石 ${L.fmt(v)}……此仇必报！`; ev.cls = 'red'; ev.pop = '被劫'; }
      break;
    }
    case 'taunt': ev.text = pick(['天剑宗弟子路过：“哟，这不是当年被逐出师门的废物吗？”——一指点出，那人倒飞三里。', '某世家少爷当街拦路：“乡下散修，见了本少爷还不让路？”——随手一挥，少爷跪地求饶。', '有人在酒楼嘲笑“杂灵根也想修仙”，看清你的修为后，吓得连杯子都摔了。']); ev.cls = 'gold'; ev.pop = '打脸！'; ev.stones = Math.floor(inc * 2 + 30); st.stones += ev.stones; break;
    case 'fairy': { const v = Math.floor(inc * 10 + 100); st.stones += v; ev.text = `救下一位被妖兽追杀的仙子，她临走时留下一只储物袋，内有灵石 ${L.fmt(v)}`; ev.cls = 'gold'; ev.pop = '仙缘'; break; }
    case 'recruit': { const v = Math.floor(inc * 6 + 80); st.stones += v; ev.text = `某大宗长老亲自登门，欲收你为亲传弟子，被你婉拒。长老留下见面礼灵石 ${L.fmt(v)}`; ev.cls = 'gold'; ev.pop = '招揽'; break; }
    case 'ring': {
      if (p.a < L.ARTS.length - 2) { p.a++; p.an = pick(L.ARTS[p.a].names); ev.text = `夜深人静，戒指微微发烫……“小子，你的根基够了，老夫传你《${p.an}》！”`; ev.cls = 'gold'; ev.big = true; }
      else { addXp(st, L.gain(st) * 10); ev.text = '戒中老祖为你讲道一夜，修为大进'; ev.cls = 'jade'; ev.pop = '讲道'; }
      break;
    }
    case 'beast': {
      const it = L.giveItem(st, 'pet', rollTier(st, 1 + Math.floor(p.r * 0.5), 6));
      ev.item = it; ev.big = true;
      ev.text = it.equip ? `一只受伤的${L.PETS[it.tier].n}倒在洞府门口，你为它疗伤后，它认你为主——【${it.name}】！` : `一只${it.name}在洞府外徘徊，你喂了些灵果，它心满意足地离开了。`;
      ev.cls = 'gold';
      L.checkGoals(st);
      break;
    }
  }
  st.stats.events++;
  if (ev.text) L.log(st, ev.text, ev.cls);
  return ev;
};

// ---------- 推进 ----------
L.flow = function (st, f) {
  addXp(st, L.gain(st) * f);
  st.stones += L.income(st) * f;
  if (st.p.r <= L.MAXR) st.p.age += L.REALMS[st.p.r].mpt * f;
  st.year += L.REALMS[Math.min(st.p.r, 8)].mpt * f;
};
L.tick = function (st, cont) {
  const out = { exp: null, event: null, tourney: false, pact: false, death: false, invite: false, war: false };
  if (!cont) L.flow(st, 1);
  st.tick++;
  const p = st.p;
  if (p.inj > 0) p.inj--;
  if (st.home.furnace > 0) {
    st.pillProg += st.home.furnace * 0.025;
    while (st.pillProg >= 1) { st.pillProg -= 1; st.pills++; }
  }
  if (st.exp) { st.exp.left--; if (st.exp.left <= 0) out.exp = L.resolveExp(st); }
  else if (st.tick > 3 && R() < 0.08) out.event = L.randomEvent(st);
  if (!st.pact && st.year >= 3) out.pact = true;
  if (!st.sect && p.r >= 1 && st.tick >= (st.flags.inviteAt || 0)) { out.invite = true; st.flags.inviteAt = st.tick + 24; }
  if (st.sect) {
    const sc = L.sectOf(st);
    if (sc.pill && st.tick % 6 === 0) st.pills++;
    if (!st.flags.warWon && st.sect.rank >= 2 && p.r >= 5 && st.tick >= (st.flags.war || 0) && !st.exp) { out.war = true; st.flags.war = st.tick + 9999; }
    if (L.canPromote(st) && !st.flags.promoNote) { st.flags.promoNote = 1; emit('promote', st.sect.rank + 1); }
    if (!L.canPromote(st)) st.flags.promoNote = 0;
  }
  if (st.tick % 12 === 0 && st.tick >= 12) out.tourney = true;
  if (p.r <= L.MAXR && p.age >= L.lifespan(st)) out.death = true;
  if (L.desperate(st) && !st.flags.warnLife) { st.flags.warnLife = 1; L.log(st, '寿元将尽！突破时将获得绝境加成', 'red'); }
  if (!L.desperate(st)) st.flags.warnLife = 0;
  L.checkGoals(st);
  return out;
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
  return { name: st.p.name, r: st.p.r, s: st.p.s, age: Math.floor(st.p.age), rank: st.bestRank, ascended: st.p.r >= 9 };
};

if (typeof module !== 'undefined' && module.exports) module.exports = L;
else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
