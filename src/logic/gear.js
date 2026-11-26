/* 废柴仙途 · 逻辑模块 gear：法宝三槽、词条、强化、重铸、打造、熔炼与灵矿（docs/SYSTEMS.md §3，docs/CONTENT.md §3、§5.2）
 * 模块写法见 src/logic.js 顶部说明。
 *   st.gear = { w 兵器, r 法衣, o 饰品（各为一件或 null）, pend 待决定的掉落, lock 锁定当前（更低阶的掉落自动熔炼）,
 *               plans 器方, zhentu 阵图（阵法系统上线前先收着）, mats 首领材料 { 首领序号: 件数 }, uid, huzhu 护主上次生效的月,
 *               rf 重铸的二选一（待定）, last 最近一次强化的花费（forge_refund2 返还用）, vaultU 宝库镇宗法宝已领 }
 *   一件法宝 = { u 编号, id 底子（L.gearBase(id)：名字、槽、阶、五行、固定词条）, slot, t 阶, plus 强化 0～9, aff 词条 id 数组, fail 连续强化失败次数（保底） }
 *   st.ore 灵矿（强化、打造用）：历练（斩妖 ×1.5，黑风岭 ×2、剑冢 ×3、星墟 ×4）、熔炼 4 × 2^阶、首领、事件、坊市一筐、宗门器堂。
 *   不做背包：新掉落进 st.gear.pend，界面弹对比卡【换上】/【熔炼】/【锁定当前】（不选 = 熔炼）；换上时旧的那件自动熔成灵矿、强化继承一半。
 *   tools/sim.js 用 L.gearAuto（主属性更高就换）。L.GEAR_ON = false：法衣、饰品、强化、词条全关，只剩兵器的阶倍率（与旧版单件法宝相当），
 *   sim 的 nogear 用它量 SYSTEMS §18 的预算。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
L.GEAR_ON = true;
const ON = () => L.GEAR_ON !== false;
const asArr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const pc = v => { const x = Math.round(v * 1000) / 10; return (Number.isInteger(x) ? x : x.toFixed(1)) + '%'; };
const n1 = v => String(Math.round(v * 10) / 10);
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);

L.GEAR_SLOTS = ['w', 'r', 'o'];   // 兵器 / 法衣（robe）/ 饰品（ornament）：与事件 item: 'r' | 'o'、ART.item('r' | 'o') 同名
L.GEAR_N = { w: '兵器', r: '法衣', o: '饰品' };
// 法衣、饰品的阶名（兵器沿用 L.WEAPONS 的凡器 / 法器 …）；品阶色同功法（ART.qualityColor），七阶为混沌彩虹
L.GEAR_TIER = ['', '凡品', '法品', '灵品', '宝品', '灵宝', '仙品', '混沌'];
L.gearTierName = (slot, t) => (slot === 'w' ? L.WEAPONS[t].n : L.GEAR_TIER[t]);
L.GEAR_TMAX = { w: 7, r: 6, o: 6 };

// ---------- 词条（docs/COMBAT_LOOT.md §5.2：30 条 = 战斗 14 + 五行 5 + 经营 10 + 锋锐并入会心；数值固定，不随强化） ----------
// slots：可出现在哪些槽（随机掉落用；首领专属与打造品固定，不受此限）；minT：阶不够不出；b：战斗类（C1 的引擎 src/logic/battle.js 按 id 生效）
// 战斗类与五行类的“打 X 系 +20%”、藏锋“被克不减伤”都在引擎里生效；经营类照旧接各系统的倍率
L.AFFIX = {
  huixin: { n: '会心', d: '暴击率 15% → 25%', slots: 'w', b: 1 },
  lianji: { n: '连击', d: '普攻 20% 再打一下', slots: 'w', b: 1 },
  xixue: { n: '吸血', d: '伤害的 6% 回血', slots: 'w', b: 1 },
  pozhao: { n: '破罩', d: '削罩时多削 1 格（每场一次）', slots: 'w', b: 1 },
  xiansheng: { n: '先声', d: '开场怒气 +30', slots: 'wo', b: 1 },
  xushi: { n: '蓄势', d: '绝招 ×3 → ×3.6', slots: 'w', b: 1 },
  fengsheng: { n: '逢生', d: '气血低于三成时伤害 +30%', slots: 'wr', b: 1 },
  yinbao: { n: '引爆', d: '打带状态的目标 +20%', slots: 'w', b: 1 },
  jianren: { n: '坚韧', d: '气血 +12%', slots: 'r', b: 1 },
  fanzhen: { n: '反震', d: '挨打时 15% 弹回去', slots: 'r', b: 1 },
  tiebi: { n: '铁壁', d: '重击伤害 −25%', slots: 'r', b: 1 },
  huiqi: { n: '回气', d: '每轮怒气 +4', slots: 'ro', b: 1 },
  jixing: { n: '疾行', d: '每场第一轮先出两下', slots: 'ro', b: 1 },
  yangshang: { n: '养伤', d: '场间回血 12% → 20%', slots: 'o', b: 1 },
  ke_jin: { n: '克金', el: 'jin', slots: 'w' }, ke_mu: { n: '克木', el: 'mu', slots: 'w' }, ke_shui: { n: '克水', el: 'shui', slots: 'w' },
  ke_huo: { n: '克火', el: 'huo', slots: 'w' }, ke_tu: { n: '克土', el: 'tu', slots: 'w' },
  shixue: { n: '嗜血', d: '越级奖励 +25%（越级时灵石、贡献 ×2 → ×2.5）', slots: 'w' },
  cangfeng: { n: '藏锋', d: '被克时不减伤害', slots: 'wr' },
  huzhu: { n: '护主', d: '丁等不负伤（每 12 月一次）', slots: 'ro' },
  zhenjie: { n: '镇劫', d: '天劫承劫 +5%', slots: 'ro' },
  qingling: { n: '轻灵', d: '脚力 +25%（每趟历练；攒满返还 1 点行动点）', slots: 'wr', minT: 3 },
  jucai: { n: '聚财', d: '历练灵石 +12%', slots: 'wro' },
  xunzhen: { n: '寻珍', d: '历练法宝功法掉率 +15%', slots: 'wro' },
  cailing: { n: '采灵', d: '历练灵草 +30%', slots: 'ro' },
  tongling: { n: '通灵', d: '功法熟练速度 +15%', slots: 'wro' },
  yangqi: { n: '养气', d: '修炼 +4%', slots: 'ro' },
};
for (const id in L.AFFIX) { const A = L.AFFIX[id]; A.id = id; if (A.el) A.d = `打${L.ELEM[A.el]}系 +20%`; }
L.AFFIX_IDS = Object.keys(L.AFFIX);
L.AFF_OLD = { fengrui: 'huixin' };   // 旧档的词条 id → 新 id（L.migrateGear）
// 会心另带旧“锋锐”的斩妖分数 +5（评价改成按战斗结果定之前还在用）；克 X：对决战力 +10%、历练分数 +4（对决换引擎之前）
L.AFF_V = { huixin: 5, shixue: 0.25, ke: [0.10, 4], zhenjie: 5, jucai: 0.12, xunzhen: 0.15, cailing: 0.30, tongling: 0.15, yangqi: 0.04, huzhuCd: 12 };
// 金词条（§5.2）：只出在 ★★★ 上（首领专属、打造品另定），一件最多一条，改的是招式的行为；P0 掉前 4 条，后 4 条 P1 才进池子
L.GOLD_AFFIX = {
  fenguang: { n: '分光', d: '器技多打一段' },
  huixiang: { n: '回响', d: '绝招放完，三成机会怒气还一半' },
  budong: { n: '不动', d: '第一次致命伤留 1 点血（每趟一次）' },
  jieshi: { n: '借势', d: '破招后，下一招必暴击且 ×1.5' },
  shisha: { n: '嗜杀', d: '击杀后怒气 +50', p1: true },
  liaoyuan: { n: '燎原', d: '灼烧会传给下一只', p1: true },
  guiyi: { n: '归一', d: '战技和器技同属性时，两招各 +20%', p1: true },
  huajin: { n: '化劲', d: '被克时也能削罩', p1: true },
};
for (const id in L.GOLD_AFFIX) L.GOLD_AFFIX[id].id = id;
L.GOLD_IDS = Object.keys(L.GOLD_AFFIX);
L.goldPool = () => L.GOLD_IDS.filter(id => !L.GOLD_AFFIX[id].p1 || L.GOLD_P1);
const keOf = el => L.ELEM_KEYS.find(x => L.elKe(el, x)) || '';   // el 克的那一系

// ---------- 底子（CONTENT §3.1～§3.3、§5.2、§9） ----------
// 兵器 7 阶（五行只影响词条倾向：掉落时 40% 带“克〈该属性所克〉”）；法衣 6 阶；饰品按种类 2 / 4 / 6 阶
const W_EL = [null, ['jin', 'mu', 'jin', 'mu'], ['jin', 'tu', 'shui', 'shui'], ['huo', 'shui', 'mu', 'huo'], ['huo', 'tu', 'mu', 'jin'], ['jin', 'tu', 'shui', 'shui'], ['jin', 'tu', 'huo', 'huo'], ['', '', '']];
const ROBES = [null, ['粗布道袍', '兽皮甲'], ['青云道袍', '玄铁软甲'], ['冰蚕法衣', '金缕衣'], ['八卦紫绶衣', '赤霄战甲'], ['霓裳羽衣', '玄武重甲'], ['太虚法袍', '混元仙衣']];
// 饰品种类：v = 每阶给多少（修炼 +3%×阶 / 灵石收入 +4%×阶 / 奇遇把握 +1%×阶 / 寿元 +2%×阶）
L.ACC_KIND = {
  cul: { n: '修炼', v: 0.03, names: ['聚灵玉佩', '紫府玉简', '鸿蒙道珠'] },
  gold: { n: '财运', v: 0.04, names: ['招财铜钱', '貔貅玉坠', '聚宝盆'] },
  luck: { n: '气运', v: 0.01, names: ['平安符', '气运金锁', '天机罗盘'] },
  life: { n: '寿元', v: 0.02, names: ['长命锁', '续命灯', '不老松枝'] },
};
L.ACC_KINDS = Object.keys(L.ACC_KIND);
const BASE = {};
const addB = b => { BASE[b.id] = b; return b; };
for (let t = 1; t <= 7; t++) L.WEAPONS[t].names.forEach((n, i) => addB({ id: `w${t}_${i}`, slot: 'w', t, n, el: W_EL[t][i] }));
for (let t = 1; t <= 6; t++) ROBES[t].forEach((n, i) => addB({ id: `r${t}_${i}`, slot: 'r', t, n }));
for (const k of L.ACC_KINDS) L.ACC_KIND[k].names.forEach((n, i) => addB({ id: `o_${k}${2 + 2 * i}`, slot: 'o', t: 2 + 2 * i, n, kind: k }));
// 首领专属（阶 = 2 + floor(0.62k)，固定词条）
L.BOSS_GEAR = [
  ['狼王獠牙匕', 'w', '', ['huixin', 'ke_tu']], ['开山宣花斧', 'w', '', ['shixue']], ['玉棺镇魂钉', 'o', 'luck', ['zhenjie']],
  ['赤炎擎天棍', 'w', '', ['ke_jin', 'huixin']], ['血煞噬魂刃', 'w', '', ['shixue', 'jucai']], ['守墓古剑', 'w', '', ['tongling', 'cangfeng']],
  ['九幽镇魂铃', 'o', 'life', ['zhenjie', 'huzhu']], ['蛟皇逆鳞盾', 'r', '', ['huzhu', 'ke_huo']], ['吞星之核', 'o', 'cul', ['yangqi', 'tongling']],
  ['傀儡王天戟', 'w', '', ['huixin', 'ke_shui', 'qingling']], ['混沌残刃', 'w', '', ['shixue', 'cangfeng', 'yangqi']],
].map(([n, slot, kind, aff], k) => addB({ id: 'b' + k, slot, t: Math.min(slot === 'r' ? 6 : 7, 2 + Math.floor(0.62 * k)), n, kind: kind || undefined, el: slot === 'w' ? L.BOSS_EL[k] : undefined, fixed: aff, boss: k }));
// 宗门镇宗法宝（CONTENT §9；宝库按身份兑换到 5 阶时给）
L.VAULT_GEAR = { jian: 'v_jian', dan: 'v_dan', dao: 'v_dao' };
addB({ id: 'v_jian', slot: 'w', t: 5, n: '太虚剑', el: 'jin', fixed: ['huixin', 'ke_mu'], vault: 'jian' });
addB({ id: 'v_dan', slot: 'o', t: 5, n: '丹霞鼎', kind: 'cul', fixed: ['yangqi'], vault: 'dan', noBoom: true, note: '炼丹不炸炉' });
addB({ id: 'v_dao', slot: 'w', t: 5, n: '玄天拂尘', el: 'shui', fixed: ['tongling', 'cangfeng'], vault: 'dao' });
// 器方（CONTENT §5.2；灵矿数为 基数 × 1.5^阶；mats 首领材料；yin 药引（crops.js 的 st.mats.yin）；sword 老祖旧剑残片）
L.BOSS_MAT = ['狼王牙', '寨主令', '尸王玉', '猿王心', '血魔珠', '守墓剑意', '魔将角', '蛟皇鳞', '噬星核', '傀儡芯', '混沌尘'];
L.YIN_N = { fire: '火引', ice: '冰引', thunder: '雷引', wood: '木引', soul: '魂引' };
L.PLANS = [
  { id: 'g_langya', n: '狼牙项链', slot: 'o', kind: 'luck', t: 2, aff: ['xunzhen'], mats: { 0: 2 }, ore: 20, src: '独眼狼王首杀' },
  { id: 'g_heifeng', n: '黑风重甲', slot: 'r', t: 3, aff: ['huzhu'], mats: { 1: 1 }, ore: 40, src: '黑风寨主首杀' },
  { id: 'g_zhenhun', n: '镇魂法袍', slot: 'r', t: 4, aff: ['zhenjie', 'yangqi'], mats: { 2: 2 }, ore: 60, src: '古墓尸王首杀' },
  { id: 'g_chiyan', n: '赤炎双刃', slot: 'w', t: 4, el: 'huo', aff: ['ke_jin', 'shixue'], mats: { 3: 2 }, yin: { fire: 3 }, src: '拍卖' },
  { id: 'g_xuesha', n: '血河幡', slot: 'w', t: 5, el: 'huo', aff: ['jucai', 'shixue'], mats: { 4: 2 }, yin: { soul: 2 }, src: '血煞老魔首杀' },
  { id: 'g_jianyi', n: '万剑匣', slot: 'w', t: 5, el: 'jin', aff: ['huixin', 'tongling'], mats: { 5: 2 }, ore: 150, src: '太虚剑宗宝库（长老）' },
  { id: 'g_mojiao', n: '魔角冠', slot: 'o', kind: 'cul', t: 5, aff: ['yangqi', 'cangfeng'], mats: { 6: 1 }, yin: { ice: 3 }, src: '秘境·幽泉（秘境上线前：九幽魔渊禁地、拍卖）' },
  { id: 'g_longlin', n: '龙鳞宝衣', slot: 'r', t: 6, aff: ['huzhu', 'ke_huo', 'qingling'], mats: { 7: 2 }, ore: 250, src: '东海借宝链' },
  { id: 'g_xinghe', n: '星核剑', slot: 'w', t: 6, el: 'huo', aff: ['huixin', 'ke_mu', 'tongling'], mats: { 8: 2 }, yin: { thunder: 4 }, src: '星墟仙人链' },
  { id: 'g_kuilei', n: '傀儡臂铠', slot: 'r', t: 6, aff: ['zhenjie', 'jucai'], mats: { 9: 2 }, ore: 300, src: '仙府傀儡王首杀' },
  { id: 'g_hundun', n: '混沌珠', slot: 'o', kind: 'cul', t: 6, aff: ['yangqi', 'tongling', 'zhenjie'], mats: { 10: 2 }, yin: { fire: 2, ice: 2, thunder: 2, wood: 2, soul: 2 }, src: '混沌裂隙禁地' },
  { id: 'g_xuanxiao', n: '玄霄', slot: 'w', t: 7, el: 'jin', aff: ['huixin', 'cangfeng', 'shixue'], mats: { 5: 1, 8: 1 }, sword: 3, xx: true, src: '老祖旧剑链' },
];
for (const P of L.PLANS) addB({ id: P.id, slot: P.slot, t: P.t, n: P.n, el: P.el, kind: P.kind, fixed: P.aff, plan: true, xx: P.xx });
L.PLAN = {}; for (const P of L.PLANS) L.PLAN[P.id] = P;
// 首领首杀给的器方
L.BOSS_PLAN = { 0: 'g_langya', 1: 'g_heifeng', 2: 'g_zhenhun', 4: 'g_xuesha', 9: 'g_kuilei' };
// 阵图（CONTENT §6；阵法系统上线前只收着，事件 fx.plan 给 f_* 时记进 st.gear.zhentu）
L.ZHENTU = { f_juling: '聚灵阵', f_shengcai: '生财阵', f_hushan: '护山阵', f_yangshou: '养兽阵', f_danhuo: '丹火阵', f_duanhun: '锻魂阵', f_dujie: '渡劫阵', f_mizong: '迷踪阵' };
L.gearBase = id => BASE[id] || null;
L.gearBases = () => Object.values(BASE);

// ---------- 存档结构 ----------
L.newGear = () => ({ w: null, o: null, r: null, pend: [], lock: { w: false, r: false, o: false }, plans: {}, zhentu: {}, mats: {}, uid: 0, huzhu: -99, rf: null, last: null, vaultU: {}, pity: { star: 0, tm: 0 }, sigN: {}, bossRe: {} });
// ---------- 星（器纹，COMBAT_LOOT §5.1）：0～3 颗，每颗多一条词条、主属性 +4%；★★★ 的第三条是金词条 ----------
// p[深度] = [无星, ★, ★★, ★★★]；寻宝行事（与趁势深入）把带星的几档 ×1.5；保底：连续 4 件无星 → 下一件至少 ★；连续 25 件没出 ★★★ → 下一件必 ★★★
L.STAR = { p: [[0.60, 0.28, 0.10, 0.02], [0.52, 0.32, 0.13, 0.03], [0.40, 0.36, 0.19, 0.05]], main: 0.04, seek: 1.5, pityStar: 4, pityTm: 25 };
L.starM = x => (ON() && x ? 1 + L.STAR.main * (x.star || 0) : 1);
const pityOf = st => { const g = st.gear; if (!g.pity || typeof g.pity !== 'object') g.pity = { star: 0, tm: 0 }; return g.pity; };
// 掷一件的星数。noPity：奇遇、坊市等不走保底计数（也不推进它）；mult：带星几档的倍率；minStar：至少几颗
L.rollStar = function (st, d, mult, opt) {
  opt = opt || {};
  const P = L.STAR.p[clamp(d | 0, 0, 2)], m = mult || 1;
  const q = [0, P[1] * m, P[2] * m, P[3] * m], up = q[1] + q[2] + q[3], sc = up > 0.95 ? 0.95 / up : 1;
  let r = R(), s = 0;
  for (let i = 3; i >= 1; i--) { if (r < q[i] * sc) { s = i; break; } r -= q[i] * sc; }
  if (opt.minStar) s = Math.max(s, opt.minStar);
  if (st && st.gear && !opt.noPity) {
    const g = pityOf(st);
    if (g.tm + 1 >= L.STAR.pityTm) s = 3;
    else if (s === 0 && g.star + 1 >= L.STAR.pityStar) s = 1;
    g.star = s === 0 ? g.star + 1 : 0;
    g.tm = s === 3 ? 0 : g.tm + 1;
  }
  return s;
};
L.starPity = st => { const g = st && st.gear ? pityOf(st) : { star: 0, tm: 0 }; return { star: L.STAR.pityStar - g.star, tm: L.STAR.pityTm - g.tm }; };
// opt：{ plus, star（不给就按外围的星率掷、不走保底）, el（固定五行 / 淬过灵）, gold（指定金词条） }
L.gearMake = function (st, id, opt) {
  const B = BASE[id]; if (!B) return null;
  opt = opt || {};
  const g = st.gear;
  const star = clamp(opt.star !== undefined ? opt.star | 0 : B.fixed ? (B.boss !== undefined ? 2 : 1) : L.rollStar(st, 0, 1, { noPity: true }), 0, 3);
  const x = { u: ++g.uid, id, slot: B.slot, t: B.t, plus: opt.plus || 0, aff: B.fixed ? B.fixed.slice() : rollAff(B.slot, B.t, opt.el || B.el, star), fail: 0, star, edge: [] };
  if (opt.el && opt.el !== B.el && B.slot === 'w') x.el = opt.el;
  if (opt.gold || (star >= 3 && !B.fixed)) x.gold = opt.gold || pick(L.goldPool());
  return x;
};
// 随机词条：无星 1 条、★ 2 条、★★ 3 条、★★★ 2 条 + 金词条；兵器 40% 带“克〈它所克〉”；克 X 五条合起来的权重约等于两条普通词条，一件最多一条
const AFF_N = [1, 2, 3, 2];
function rollAff(slot, t, el, star) {
  const n = star === undefined ? (t >= 4 ? 2 : 1) : AFF_N[clamp(star | 0, 0, 3)], out = [];
  if (slot === 'w' && el && R() < 0.4) out.push('ke_' + keOf(el));
  while (out.length < n) {
    const hasKe = out.some(a => a.startsWith('ke_'));
    const pool = L.AFFIX_IDS.filter(a => L.AFFIX[a].slots.includes(slot) && !(L.AFFIX[a].minT > t) && !out.includes(a) && !(hasKe && a.startsWith('ke_')));
    if (!pool.length) break;
    out.push(wpick(pool.map(a => [a, a.startsWith('ke_') ? 0.4 : 1])));
  }
  return out;
}
L.gearRollAff = rollAff;
// 按槽与阶抽一件底子（饰品只有 2 / 4 / 6 阶：向下取到最近的一档，至少 2）
function rollBase(slot, tier) {
  if (slot === 'w') { const t = clamp(Math.round(tier), 1, 7); return `w${t}_${ri(0, L.WEAPONS[t].names.length - 1)}`; }
  if (slot === 'r') { const t = clamp(Math.round(tier), 1, 6); return `r${t}_${ri(0, 1)}`; }
  const t = tier >= 6 ? 6 : tier >= 4 ? 4 : 2;
  return `o_${pick(L.ACC_KINDS)}${t}`;
}
L.gearRollBase = rollBase;

// ---------- 解锁（SYSTEMS §0：兵器开局、强化熔过一件就开（COMBAT_LOOT §6.1）、淬灵攒够灵核、洗练筑基、法衣筑基中期、饰品元婴、打造化神且器炉 5 级；转世后全开） ----------
// TODO SYSTEMS §6.1：洞府的器炉建成后把等级接进 L.forgeLv；现在借用丹炉等级（器炉 = 丹炉，界面上写明）
L.forgeLv = st => (st.home && st.home.furnace) || 0;
L.FORGE_LV = 5;
L.gearOpen = function (st, w) {
  if (w === 'w') return true;
  if (!ON()) return false;
  if (w === 'forge') return (st.rebirth > 0 || mr(st) >= 4) && L.forgeLv(st) >= L.FORGE_LV;
  if (w === 'infuse') return st.rebirth > 0 || L.coreMax(st) >= L.INFUSE.n || !!(st.stats && st.stats.infuse);   // 淬灵：任一系灵核攒到 3 枚（COMBAT_LOOT §6.2）
  if (w === 'reroll') return st.rebirth > 0 || mr(st) >= 1;   // 洗练：筑基（§6.3）
  if (st.rebirth > 0) return true;
  if (w === 'plus') return mi(st) >= 3 || ((st.stats && st.stats.smelt) || 0) >= 1;   // 强化：熔过第一件法宝就开（§6.1；原来炼气圆满）
  if (w === 'r') return mi(st) >= 5;
  if (w === 'o') return mr(st) >= 3;
  return false;
};
L.gearOpenWhy = function (st, w) {
  if (w === 'forge') { const a = st && !(st.rebirth > 0 || mr(st) >= 4) ? '化神开放' : ''; const b = st && L.forgeLv(st) < L.FORGE_LV ? `器炉 ${L.FORGE_LV} 级（器炉建成前借用丹炉，现在 ${L.forgeLv(st)} 级）` : ''; return [a, b].filter(Boolean).join('，且') || '化神开放，且器炉 5 级'; }
  return { plus: '熔一件法宝后开放', r: '筑基中期开放', o: '元婴开放', infuse: '攒 3 枚同系灵核后开放', reroll: '筑基开放' }[w] || '';
};
// 装备着、且槽已开的那一件（GEAR_ON = false 时只认兵器）
function eq(st, s) { const g = st.gear; if (!g) return null; const x = g[s]; if (!x) return null; if (s !== 'w' && !L.gearOpen(st, s)) return null; return x; }
L.gearEq = eq;
L.gearEqList = st => L.GEAR_SLOTS.map(s => eq(st, s)).filter(Boolean);
L.gearAffN = function (st, id) {
  if (!ON() || !st.gear) return 0;
  let n = 0;
  for (const s of L.GEAR_SLOTS) { const x = eq(st, s); if (x) for (const a of x.aff) if (a === id) n++; }
  return n;
};
L.gearHas = (st, id) => L.GEAR_SLOTS.some(s => { const x = eq(st, s); return !!x && x.id === id; });
L.gearName = x => (x ? BASE[x.id].n + (x.plus > 0 ? ' +' + x.plus : '') : '');
L.gearEl = x => (x ? x.el || BASE[x.id].el || '' : '');   // 兵器的五行：淬过灵的读 x.el，否则底子的
L.gearStars = x => (x && x.star > 0 ? '★'.repeat(x.star) : '');
L.gearTier = (st, s) => { const x = st.gear && st.gear[s]; return x ? x.t : 0; };
L.gearMaxTier = (st, s) => { let t = 0; for (const k of s ? [s] : L.GEAR_SLOTS) t = Math.max(t, L.gearTier(st, k)); return t; };

// ---------- 主属性（强化：每级使“超出部分” +6%） ----------
L.PLUS = { max: 9, step: 0.06, rate: [1, 1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4], pity: 0.10, ore: 8, g: 1.6, tg: 1.5, stone: 5, boom: 0.10 };
const plusOf = x => (ON() ? x.plus || 0 : 0);
const pm = x => (1 + L.PLUS.step * plusOf(x)) * L.starM(x);
// 兵器：战力 1 + (阶倍率 − 1) × (1 + 6% × 强化)
L.gearWM = (x, plus) => { if (!x) return 1; const m = L.WEAPONS[x.t].m; return (1 + (m - 1) * (1 + L.PLUS.step * (plus === undefined ? plusOf(x) : plus))) * L.starM(x); };
// 法衣：历练分数 +1.5×阶、负伤月 −1（阶 ≥ 3）、天劫承劫 +3%×阶（阶 ≥ 5 再 +5%）、六阶丁等 30% 改判丙；厚德载物（c5）全部效果 ×1.5
const c5 = st => (L.comboOn(st, 'c5') ? 1.5 : 1);
L.gearOScore = (st, x) => (x ? 1.5 * x.t * pm(x) * c5(st) : 0);
L.gearOTrib = (st, x) => (x ? (3 * x.t * pm(x) + (x.t >= 5 ? 5 : 0)) * c5(st) : 0);
L.gearOInj = x => (x && x.t >= 3 ? 1 : 0);
// 饰品：按种类 修炼 / 灵石收入 / 奇遇把握 / 寿元 +v×阶，× (1 + 6% × 强化)
L.gearRKind = x => (x ? BASE[x.id].kind : '');
L.gearRV = x => (x ? L.ACC_KIND[BASE[x.id].kind].v * x.t * pm(x) : 0);
const accV = (st, kind) => { const x = eq(st, 'o'); return x && BASE[x.id].kind === kind ? L.gearRV(x) : 0; };
// 天劫承劫（%）：法衣 + 镇劫 ×5。天劫系统（SYSTEMS §9）上线前按 L.TRIB_BT 折成金丹起的突破成功率
L.TRIB_BT = 0.25;
L.gearTrib = st => (ON() ? L.gearOTrib(st, eq(st, 'r')) + L.AFF_V.zhenjie * L.gearAffN(st, 'zhenjie') : 0);
// 一件的主属性写成一句话（界面、对比卡用）
L.gearMainText = function (st, x, plus) {
  if (!x) return '';
  const y = plus === undefined ? x : Object.assign({}, x, { plus });
  if (x.slot === 'w') return `战力 ×${(Math.round(L.gearWM(y) * 100) / 100)}`;
  if (x.slot === 'r') {
    const a = [`历练分数 +${n1(L.gearOScore(st, y))}`];
    if (L.gearOInj(y)) a.push('负伤 −1 月');
    a.push(`承劫 +${n1(L.gearOTrib(st, y))}%`);
    if (x.t >= 6) a.push('丁等 30% 改判丙');
    return a.join(' · ');
  }
  const k = BASE[x.id].kind, v = L.gearRV(y);
  return k === 'cul' ? `修炼 +${pc(v)}` : k === 'gold' ? `灵石收入 +${pc(v)}` : k === 'luck' ? `奇遇把握 +${pc(v)}` : `寿元 +${pc(v)}`;
};
L.gearAffText = id => `${L.AFFIX[id].n}：${L.AFFIX[id].d}`;

// ---------- 接进各系统的倍率 ----------
L.addAtkMod('weapon', 20, st => { const x = eq(st, 'w'); return ['兵器·' + (x ? L.gearName(x) : '赤手空拳'), L.gearWM(x), 'gear']; });
L.addCulMod('gear', 25, st => {
  if (!ON()) return null;
  const a = [], x = eq(st, 'o');
  if (x && BASE[x.id].kind === 'cul') a.push(['饰品·' + L.gearName(x), 1 + L.gearRV(x), 'gear']);
  const n = L.gearAffN(st, 'yangqi'); if (n) a.push([`词条·养气${n > 1 ? ' ×' + n : ''}`, 1 + L.AFF_V.yangqi * n, 'gear']);
  return a.length ? a : null;
});
L.addIncMul('gear', 45, st => { const v = accV(st, 'gold'); return v ? ['饰品·' + L.gearName(eq(st, 'o')), 1 + v, 'gear'] : null; });
// 历练分数：法衣 +1.5×阶；锋锐斩妖 +5；克 X 在该属性的地图 +4
L.addExpMod('gear', 17, (st, k, d, a) => {
  if (!ON()) return null;
  const out = [], o = eq(st, 'r');
  if (o) out.push(['法衣·' + L.gearName(o), L.gearOScore(st, o), 'gear']);
  const f = L.gearAffN(st, 'huixin'); if (f && a === 0) out.push([`词条·会心${f > 1 ? ' ×' + f : ''}`, L.AFF_V.huixin * f, 'gear']);
  const el = L.REGIONS[k] && L.REGIONS[k].el;
  if (el) { const n = L.gearAffN(st, 'ke_' + el); if (n) out.push([`词条·克${L.ELEM[el]}${n > 1 ? ' ×' + n : ''}`, L.AFF_V.ke[1] * n, 'gear']); }
  return out.length ? out : null;
});
// 对决：克 X 对该属性的对手 +10%
L.addDuelMod('gear', 15, (st, foe) => {
  const fe = L.foeEl(foe); if (!fe) return null;
  const n = L.gearAffN(st, 'ke_' + fe);
  return n ? [`词条·克${L.ELEM[fe]}${n > 1 ? ' ×' + n : ''}`, 1 + L.AFF_V.ke[0] * n, 'gear'] : null;
});
// 突破（金丹起）：承劫折算
L.addBtMod('gear', 56, st => { if (st.p.r < 1) return null; const tr = L.gearTrib(st); return tr > 0 ? [`法宝·承劫 ${n1(tr)}%（天劫上线前折算）`, tr / 100 * L.TRIB_BT] : null; });
// 寿元、奇遇把握（core.js 的 L.lifespan、events-engine 的 L.choiceLuck 读）
L.gearLifeMult = st => 1 + accV(st, 'life');
L.gearLuck = st => accV(st, 'luck');
// 历练里的一组（expedition.js 的 L.expCalc / L.expForecast 读）：灵石（聚财、财运饰品）、掉率（寻珍）、灵草（采灵）、越级奖励（嗜血）
L.gearExp = function (st) {
  if (!ON()) return { stone: 1, item: 1, herb: 1, leap: 1 };
  return { stone: (1 + L.AFF_V.jucai * L.gearAffN(st, 'jucai')) * (1 + accV(st, 'gold')), item: 1 + L.AFF_V.xunzhen * L.gearAffN(st, 'xunzhen'), herb: 1 + L.AFF_V.cailing * L.gearAffN(st, 'cailing'), leap: 1 + L.AFF_V.shixue * L.gearAffN(st, 'shixue') };
};
// 脚力来源数（AP_PLAN §2.3，原“历练时长 −1”）：身上有轻灵词条算 1 个来源（两件都有也只算 1，和原来一样不叠）
L.gearExpLen = st => (st && L.gearAffN(st, 'qingling') ? 1 : 0);
// 负伤：法衣三阶起少 1 月；护主每 12 月挡一次丁等负伤；六阶法衣丁等 30% 改判丙
L.gearInjCut = st => L.gearOInj(eq(st, 'r'));
L.gearHuzhuReady = st => L.gearAffN(st, 'huzhu') > 0 && st.tick - (st.gear.huzhu === undefined ? -99 : st.gear.huzhu) >= L.AFF_V.huzhuCd;
L.gearDingSave = st => { const o = ON() && eq(st, 'r'); return o && o.t >= 6 ? 0.3 : 0; };
// 炼丹不炸炉（丹霞鼎）
L.gearNoBoom = st => L.GEAR_SLOTS.some(s => { const x = eq(st, s); return !!x && !!BASE[x.id].noBoom; });
// 玄霄装备时，老祖“请出手”：每届论道 / 会武 2 次，输掉的一场重掷（老祖诀别后只是一柄好剑）
L.gearXuanxiao = st => ON() && !!eq(st, 'w') && !!BASE[eq(st, 'w').id].xx && !(st.eflags && st.eflags.st_farewell);
L.XX_TIMES = 2;

// ---------- 灵矿 ----------
// 每趟：L.ORE.trip × (1 + k) × (1 + 0.5d) × 评价倍率；斩妖 ×1.5；黑风岭 ×2、上古剑冢 ×3、天外星墟 ×4（CONTENT §1）；寻龙点穴（c7）×1.5
L.ORE = { trip: 2, slay: 1.5, map: [1, 2, 1, 1, 1, 3, 1, 1, 4, 1, 1], smelt: 4 };
L.expOre = (st, k, d, a, m) => Math.round(L.ORE.trip * (1 + k) * (1 + 0.5 * (d || 0)) * m * (a === 0 ? L.ORE.slay : 1) * (L.ORE.map[k] || 1) * (L.comboOn(st, 'c7') ? 1.5 : 1));
L.gearSmeltOre = x => (x ? L.ORE.smelt * Math.pow(2, x.t) : 0);
// 事件里的灵矿（fx.ore、cost.ore）是“一筐”的筐数：一筐 = 1.5^境界（与器方“基数 × 1.5^阶”同口径），免得后期一筐灵矿不值一提
L.oreUnit = st => Math.max(1, Math.round(Math.pow(1.5, Math.min(st.p.r, 8))));
L.addOre = function (st, n) { n = Math.max(0, Math.round(n)); st.ore = (st.ore || 0) + n; return n; };

// ---------- 材料：灵核（五系，淬灵用）、器纹石（洗练用）；收在 st.mats（crops.js 的药引也在这里） ----------
L.CORE_EL = ['jin', 'mu', 'shui', 'huo', 'tu'];
L.matsOf = function (st) {
  if (!st.mats || typeof st.mats !== 'object') st.mats = L.newMats ? L.newMats() : {};
  const m = st.mats;
  if (!m.core || typeof m.core !== 'object') m.core = {};
  for (const e of L.CORE_EL) if (!(m.core[e] >= 0)) m.core[e] = 0;
  if (!(m.rune >= 0)) m.rune = 0;
  return m;
};
L.coreN = (st, el) => (st.mats && st.mats.core && st.mats.core[el]) || 0;
L.coreMax = st => Math.max(0, ...L.CORE_EL.map(e => L.coreN(st, e)));
L.runeN = st => (st.mats && st.mats.rune) || 0;
// 战斗、事件掉的材料入库：mats = { core: { mu: 1 }, rune: n, ore: n }（C1 的战斗结果 res.mats 直接交给它）；返回加了什么（界面飘字用）
L.matsAdd = function (st, mats) {
  const m = L.matsOf(st), out = [];
  if (!mats) return out;
  for (const e in mats.core || {}) { const n = Math.max(0, Math.round(mats.core[e] || 0)); if (n && m.core[e] !== undefined) { m.core[e] += n; out.push({ k: 'core', el: e, n }); } }
  if (mats.rune > 0) { m.rune += Math.round(mats.rune); out.push({ k: 'rune', n: Math.round(mats.rune) }); }
  if (mats.ore > 0) out.push({ k: 'ore', n: L.addOre(st, mats.ore) });
  return out;
};
// 熔掉一件：灵矿 4 × 2^阶；带星的另给“星数”颗器纹石（§6.3）；记熔炼次数（强化在“熔过 ≥ 1 件”后开）
L.gearSmelt = function (st, x) {
  if (!x) return 0;
  st.stats.smelt = (st.stats.smelt || 0) + 1;
  if (x.star > 0 && ON()) L.matsOf(st).rune += x.star;
  return L.addOre(st, L.gearSmeltOre(x));
};

// ---------- 掉落：对比卡（换上 / 熔炼 / 锁定当前） ----------
// 槽的权重：落日古墓法衣 ×2、上古剑冢兵器 ×2、东海龙宫饰品 ×2（CONTENT §1）；只在开了的槽里挑
const SLOT_W = { 2: { r: 2 }, 5: { w: 2 }, 7: { o: 2 } };
L.gearOpenSlots = st => L.GEAR_SLOTS.filter(s => L.gearOpen(st, s));
L.gearPickSlot = function (st, k) {
  const open = L.gearOpenSlots(st), w = SLOT_W[k] || {};
  return wpick(open.map(s => [s, w[s] || 1]));
};
// 最弱的一槽（item: 'need'、寻宝保底、拍卖）：空槽优先，再看阶（饰品按 2 / 4 / 6 档折成 1～6）
L.gearWeakest = function (st) {
  let best = null;
  for (const s of L.gearOpenSlots(st)) { const t = L.gearTier(st, s); if (!best || t < best.t) best = { s, t }; }
  return best || { s: 'w', t: L.gearTier(st, 'w') };
};
// kind：'w' | 'o' | 'r' 指定槽，'g' 按地图权重挑一槽，'need' 最弱的一槽；ctx = { k, d, src, base 指定底子 }
L.gearGive = function (st, kind, tier, ctx) {
  ctx = ctx || {};
  let slot = kind;
  if (ctx.base) slot = BASE[ctx.base].slot;
  else if (kind === 'g') slot = L.gearPickSlot(st, ctx.k);
  else if (kind === 'need') slot = L.gearWeakest(st).s;
  return L.gearDrop(st, slot, tier, ctx);
};
L.gearDrop = function (st, slot, tier, ctx) {
  ctx = ctx || {};
  const g = st.gear;
  const x = L.gearMake(st, ctx.base || rollBase(slot, tier), { plus: ctx.plus, star: ctx.star, el: ctx.el, gold: ctx.gold });
  const B = BASE[x.id];
  const it = { kind: x.slot, gear: x, u: x.u, tier: x.t, star: x.star || 0, name: B.n, src: ctx.src || '' };
  slot = x.slot;
  if (!L.gearOpen(st, slot)) {
    // 首领专属、器方、镇宗法宝（固定词条、独一份）先收着，槽一开就戴上；随手掉的熔成灵矿
    if (B.fixed && ON()) { x.hold = true; g.pend.push(x); it.hold = true; L.log(st, `【${B.n}】先收着：${L.GEAR_N[slot]}槽${L.gearOpenWhy(st, slot)}，到时自动戴上`, 'jade'); return it; }
    it.smelt = L.gearSmelt(st, x); it.closed = true; L.log(st, `【${B.n}】（${L.GEAR_N[slot]}槽${L.gearOpenWhy(st, slot)}），先熔成灵矿 +${it.smelt}`); return it;
  }
  const cur = g[slot];
  if (!cur) { L.gearEquip(st, x); it.equip = true; L.log(st, `获得${L.gearTierName(slot, x.t)}${L.GEAR_N[slot]}【${B.n}】，已装上`, x.t >= 4 ? 'gold' : 'jade'); emit('gearNew', it); return it; }
  if (g.lock[slot] && x.t < cur.t) { it.smelt = L.gearSmelt(st, x); it.auto = true; L.log(st, `【${B.n}】阶低于锁定的${L.GEAR_N[slot]}，自动熔成灵矿 +${it.smelt}`); return it; }
  it.better = L.gearBetter(st, x);
  x.at = st.tick;
  g.pend.push(x);
  it.pend = true;
  L.log(st, `得到${L.gearTierName(slot, x.t)}${L.GEAR_N[slot]}【${B.n}】${x.aff.length ? '（' + x.aff.map(a => L.AFFIX[a].n).join('、') + '）' : ''}`, x.t >= 4 ? 'gold' : '');
  emit('gearNew', it);
  return it;
};
L.gearPend = (st, u) => st.gear.pend.find(x => x.u === u && !x.hold) || null;
L.gearHeld = st => st.gear.pend.filter(x => x.hold);
// 换上：强化继承一半（向下取整），旧的那件熔成灵矿
L.gearInherit = (st, x) => { const cur = st.gear[x.slot]; return Math.max(x.plus || 0, cur ? Math.floor((cur.plus || 0) / 2) : 0); };
L.gearEquip = function (st, x) {
  const g = st.gear, slot = x.slot, prev = g[slot];
  const inh = L.gearInherit(st, x);
  x.plus = inh; x.fail = 0; delete x.at;
  g.pend = g.pend.filter(y => y.u !== x.u);
  g[slot] = x;
  const res = { slot, x, prev, plus: inh, smelt: 0 };
  if (prev) res.smelt = L.gearSmelt(st, prev);
  L.checkQuests(st);
  return res;
};
// 对比卡上的决定：equip 换上 / smelt 熔炼 / lock 熔炼并锁定当前（以后更低阶的自动熔炼）
L.gearDecide = function (st, u, how) {
  const x = L.gearPend(st, u); if (!x) return null;
  if (how === 'equip') { const r = L.gearEquip(st, x); L.log(st, `换上【${BASE[x.id].n}】${r.plus ? `（强化继承 +${r.plus}）` : ''}${r.prev ? `，旧的【${BASE[r.prev.id].n}】熔成灵矿 +${r.smelt}` : ''}`, 'jade'); emit('gearEquip', r); return Object.assign({ how }, r); }
  st.gear.pend = st.gear.pend.filter(y => y.u !== u);
  const ore = L.gearSmelt(st, x);
  if (how === 'lock') st.gear.lock[x.slot] = true;
  return { how, x, slot: x.slot, smelt: ore };
};
L.gearLock = (st, slot, on) => { st.gear.lock[slot] = !!on; return st.gear.lock[slot]; };
// 假设换上 x（带继承的强化），看 fn() 变成多少（不改存档）
L.gearTry = function (st, x, fn) {
  const g = st.gear, slot = x.slot, prev = g[slot];
  g[slot] = Object.assign({}, x, { plus: L.gearInherit(st, x) });
  try { return fn(); } finally { g[slot] = prev; }
};
// 一件的“总价值”（对数）：战力、修炼、家门地图斩妖分数（每分折战力 ×1.028）、收入、寿元、奇遇把握。比较掉落用
L.gearValue = function (st) {
  const k = L.homeRegion ? L.homeRegion(st) : 0;
  return Math.log(L.power(st)) + Math.log(L.gainBase(st)) + 0.028 * L.expExtra(st, k, 0, 0) + 0.3 * Math.log(L.gearExp(st).stone) + 0.15 * Math.log(L.gearLifeMult(st)) + L.gearLuck(st) + 0.002 * L.gearTrib(st);
};
L.gearDelta = function (st, x) {
  const k = L.homeRegion(st);
  const snap = () => ({ p: L.power(st), g: L.gainBase(st), s: L.expExtra(st, k, 0, 0), v: L.gearValue(st), inc: L.gearExp(st).stone, life: L.lifespan(st), luck: L.gearLuck(st), trib: L.gearTrib(st) });
  const a = snap(), b = L.gearTry(st, x, snap);
  const cur = st.gear[x.slot];
  return { a, b, k, inh: [cur ? cur.plus : 0, L.gearInherit(st, x)], smelt: L.gearSmeltOre(x), smeltCur: L.gearSmeltOre(cur), better: b.v > a.v + 1e-6 };
};
L.gearBetter = (st, x) => L.gearDelta(st, x).better;
// sim 与“过期没决定的”用：更好就换，否则熔炼
L.gearAuto = function (st, x) { if (!x) return null; return L.gearDecide(st, x.u, L.gearBetter(st, x) ? 'equip' : 'smelt'); };
L.gearAutoAll = st => { const out = []; for (const x of st.gear.pend.slice()) if (!x.hold) out.push(L.gearAuto(st, x)); return out; };
L.gearItemText = function (st, it) {
  const B = BASE[it.gear.id], nm = `${L.gearTierName(it.kind, it.tier)}${L.GEAR_N[it.kind]}【${B.n}】`;
  if (it.closed) return `${nm}（${L.GEAR_N[it.kind]}槽${L.gearOpenWhy(st, it.kind)}），熔成灵矿 +${it.smelt}`;
  if (it.hold) return `${nm}先收着（${L.GEAR_N[it.kind]}槽${L.gearOpenWhy(st, it.kind)}，到时自动戴上）`;
  if (it.auto) return `${nm}阶低于锁定的${L.GEAR_N[it.kind]}，自动熔成灵矿 +${it.smelt}`;
  if (it.equip) return `获得${nm}，已装上`;
  return `得到${nm}${L.gearStars(it.gear)}${it.gear.aff.length ? '（' + it.gear.aff.map(a => L.AFFIX[a].n).concat(it.gear.gold ? [L.GOLD_AFFIX[it.gear.gold].n] : []).join('、') + '）' : ''}${it.better ? '，比身上的强' : ''}`;
};

// ---------- 强化 +0～+9 ----------
// 花费：灵矿 8 × 1.6^级 × 1.5^阶，灵石同数 ×5；成功率 [100,100,100,90,80,70,60,50,40]%，失败不掉级不碎，下次 +10%（保底）
// 铸剑谱 +10%（×熟练）、炉火纯青（c17）+10%；neighbor_smith（事件常驻 flag）灵矿 −20%
L.gearPlusCost = function (st, x) {
  let o = Math.ceil(L.PLUS.ore * Math.pow(L.PLUS.g, x.plus) * Math.pow(L.PLUS.tg, x.t));
  if (st.eflags && st.eflags.neighbor_smith) o = Math.ceil(o * 0.8);
  return { ore: o, stones: o * L.PLUS.stone };
};
L.gearPlusRate = (st, x) => (x.plus >= L.PLUS.max ? 0 : Math.min(1, L.PLUS.rate[x.plus] + L.PLUS.pity * (x.fail || 0) + L.artV(st, 'm_zhujian') + (L.comboOn(st, 'c17') ? 0.10 : 0)));
L.gearPlusWhy = function (st, slot) {
  const x = eq(st, slot);
  if (!L.gearOpen(st, 'plus')) return L.gearOpenWhy(st, 'plus');
  if (!x) return `还没有${L.GEAR_N[slot]}`;
  if (x.plus >= L.PLUS.max) return '已强化到 +9';
  const c = L.gearPlusCost(st, x);
  if ((st.ore || 0) < c.ore) return `灵矿还差 ${L.fmt(c.ore - (st.ore || 0))}`;
  if (st.stones < c.stones) return `灵石还差 ${L.fmt(c.stones - st.stones)}`;
  return '';
};
// 强化前后的数（界面的预览、老祖的讲解、锦囊共用）
L.gearPlusInfo = function (st, slot) {
  const x = eq(st, slot);
  if (!x) return null;
  const k = L.homeRegion(st);
  const snap = () => ({ p: L.power(st), g: L.gainBase(st), s: L.expExtra(st, k, 0, 0), pact: st.pact ? null : L.pactInfo(st).p, trib: L.gearTrib(st) });
  const a = snap();
  let b = a;
  if (x.plus < L.PLUS.max) { x.plus++; try { b = snap(); } finally { x.plus--; } }
  return { x, slot, cost: L.gearPlusCost(st, x), rate: L.gearPlusRate(st, x), why: L.gearPlusWhy(st, slot), a, b, k, max: x.plus >= L.PLUS.max };
};
L.gearPlus = function (st, slot) {
  if (L.gearPlusWhy(st, slot)) return null;
  const x = eq(st, slot), c = L.gearPlusCost(st, x), rate = L.gearPlusRate(st, x);
  const p0 = L.power(st);
  st.ore -= c.ore; st.stones -= c.stones; st.flags.spentAt = st.tick;
  st.gear.last = { ore: c.ore, stones: c.stones, slot };
  st.stats.plus = (st.stats.plus || 0) + 1;
  const res = { slot, x, from: x.plus, rate, cost: c, ok: R() < rate };
  if (res.ok) { x.plus++; x.fail = 0; L.log(st, `${L.GEAR_N[slot]}【${BASE[x.id].n}】强化至 +${x.plus}`, x.plus >= 6 ? 'gold' : 'jade'); }
  else {
    x.fail = (x.fail || 0) + 1;
    L.log(st, `强化${L.GEAR_N[slot]}失败（灵矿 ${L.fmt(c.ore)} 打了水漂），下次成功率 +${Math.round(L.PLUS.pity * 100)}%`, 'red');
    if (R() < L.PLUS.boom) L.fireTrigger(st, 'forge_fail');
  }
  res.to = x.plus; res.p0 = p0; res.p1 = L.power(st);
  L.checkQuests(st);
  emit('gearPlus', res);
  return res;
};
// 有能强化、且成功率 ≥ minRate 的一槽（兵器优先；老祖问答 / 气泡、【人物】角标用）
L.gearPlusHint = function (st, minRate) {
  for (const s of L.GEAR_SLOTS) { const x = eq(st, s); if (x && !L.gearPlusWhy(st, s) && L.gearPlusRate(st, x) >= (minRate === undefined ? 0.8 : minRate)) return s; }
  return null;
};
// 事件 fx.plus：当前兵器强化 +n（不掷，不花）
L.gearPlusFree = function (st, n, slot) {
  const x = eq(st, slot || 'w'); if (!x) return 0;
  const from = x.plus; x.plus = clamp(x.plus + n, 0, L.PLUS.max); x.fail = 0;
  return x.plus - from;
};

// ---------- 洗练（原“重铸”，COMBAT_LOOT §6.3）：花 1 枚器纹石重抽一条词条（二选一保留）；首领专属、打造品、镇宗法宝的词条固定 ----------
// 其余词条不动（天然锁定）；金词条洗不掉也洗不出；同一件第 6 次洗练必出这件没出过的“战斗类”词条（保底，x.rr 计次、x.seen 记出过的）
L.REROLL = { cost: 1, pity: 6 };
L.gearReforgeWhy = function (st, slot, i) {
  const x = eq(st, slot);
  if (!x) return `还没有${L.GEAR_N[slot]}`;
  if (!L.gearOpen(st, 'reroll')) return L.gearOpenWhy(st, 'reroll');
  if (BASE[x.id].fixed) return '固定词条，不能洗练';
  if (!x.aff[i]) return '没有这条词条';
  if (L.runeN(st) < L.REROLL.cost) return `需要器纹石 ${L.REROLL.cost}`;
  return '';
};
L.gearRerollLeft = x => Math.max(1, L.REROLL.pity - ((x && x.rr) || 0) % L.REROLL.pity);   // 再洗几次触发保底
L.gearReforge = function (st, slot, i) {
  if (L.gearReforgeWhy(st, slot, i) || st.gear.rf) return null;
  const x = eq(st, slot), old = x.aff[i];
  const pool = L.AFFIX_IDS.filter(a => L.AFFIX[a].slots.includes(slot) && !(L.AFFIX[a].minT > x.t) && !x.aff.includes(a) && !(a.startsWith('ke_') && x.aff.some((b, j) => j !== i && b.startsWith('ke_'))));
  if (!pool.length) return null;
  L.matsOf(st).rune -= L.REROLL.cost;
  x.rr = (x.rr || 0) + 1;
  x.seen = Array.isArray(x.seen) ? x.seen : x.aff.slice();
  let neu = null, pity = false;
  if (x.rr % L.REROLL.pity === 0) { const fresh = pool.filter(a => L.AFFIX[a].b && !x.seen.includes(a)); if (fresh.length) { neu = pick(fresh); pity = true; } }
  if (!neu) neu = wpick(pool.map(a => [a, a.startsWith('ke_') ? 0.4 : 1]));
  if (!x.seen.includes(neu)) x.seen.push(neu);
  st.stats.reroll = (st.stats.reroll || 0) + 1;
  st.gear.rf = { slot, u: x.u, i, old, neu, pity };
  return st.gear.rf;
};
L.gearReforgeKeep = function (st, keepNew) {
  const rf = st.gear.rf; if (!rf) return null;
  st.gear.rf = null;
  const x = st.gear[rf.slot];
  if (keepNew && x && x.u === rf.u) { x.aff[rf.i] = rf.neu; L.log(st, `洗练【${BASE[x.id].n}】：「${L.AFFIX[rf.old].n}」→「${L.AFFIX[rf.neu].n}」`, 'jade'); }
  return Object.assign({ keep: keepNew ? rf.neu : rf.old }, rf);
};

// ---------- 开锋（§6.1，P1）：强化到 +3 / +6 / +9 时三选一，选了不能改（换一件新的重新选） ----------
// 锋：这件的伤害 +6% · 灵：器技冷却 −1（一件只能选一次）· 韧：气血 +8%。都在战斗引擎里生效（L.gearBattle 汇总给 C1）
L.EDGE = { feng: { n: '锋', d: '伤害 +6%', v: 0.06 }, ling: { n: '灵', d: '器技冷却 −1', v: 1, once: true }, ren: { n: '韧', d: '气血 +8%', v: 0.08 } };
L.EDGE_AT = [3, 6, 9];
L.gearEdgeDue = x => !!x && ON() && x.slot === 'w' && (x.edge || []).length < L.EDGE_AT.length && (x.plus || 0) >= L.EDGE_AT[(x.edge || []).length];
L.gearEdgeOpts = x => Object.keys(L.EDGE).filter(k => !(L.EDGE[k].once && (x.edge || []).includes(k)));
L.gearEdge = function (st, slot, k) {
  const x = eq(st, slot || 'w');
  if (!x || !L.gearEdgeDue(x) || !L.gearEdgeOpts(x).includes(k)) return null;
  x.edge = (x.edge || []).concat(k);
  L.log(st, `【${BASE[x.id].n}】开锋 · ${L.EDGE[k].n}：${L.EDGE[k].d}`, 'jade');
  emit('gearEdge', { x, k });
  return x.edge;
};

// ---------- 淬灵（§6.2）：3 枚同系灵核 + 灵矿 10 × 阶 → 把一件兵器淬成那一系（器技五行、特效颜色跟着变；可以反复淬） ----------
L.INFUSE = { n: 3, ore: 10 };
L.gearInfuseCost = x => ({ core: L.INFUSE.n, ore: L.INFUSE.ore * ((x && x.t) || 1) });
L.gearInfuseWhy = function (st, u, el) {
  const x = typeof u === 'object' ? u : L.GEAR_SLOTS.map(s => st.gear[s]).find(y => y && y.u === u);
  if (!x) return '没有这件';
  if (x.slot !== 'w') return '只有兵器能淬灵';
  if (!L.gearOpen(st, 'infuse')) return L.gearOpenWhy(st, 'infuse');
  if (!L.ELEM[el]) return '选一系';
  if (L.gearEl(x) === el) return `已经是${L.ELEM[el]}`;
  const c = L.gearInfuseCost(x);
  if (L.coreN(st, el) < c.core) return `${L.ELEM[el]}灵核 ${L.coreN(st, el)}/${c.core}`;
  if ((st.ore || 0) < c.ore) return `灵矿还差 ${L.fmt(c.ore - (st.ore || 0))}`;
  return '';
};
L.gearInfuse = function (st, u, el) {
  const x = typeof u === 'object' ? u : L.GEAR_SLOTS.map(s => st.gear[s]).find(y => y && y.u === u);
  if (!x || L.gearInfuseWhy(st, x, el)) return null;
  const c = L.gearInfuseCost(x), from = L.gearEl(x);
  L.matsOf(st).core[el] -= c.core; st.ore -= c.ore;
  if (el === BASE[x.id].el) delete x.el; else x.el = el;
  st.stats.infuse = (st.stats.infuse || 0) + 1;
  L.log(st, `【${BASE[x.id].n}】淬成${L.ELEM[el]}系${from ? `（原来${L.ELEM[from]}）` : ''}`, 'jade');
  L.checkQuests(st);
  emit('gearInfuse', { x, el, from });
  return { x, el, from, cost: c };
};

// ---------- 给战斗引擎（C1 的 src/logic/battle.js）的一张表：身上法宝的词条、金词条、开锋、兵器五行与星 ----------
L.gearBattle = function (st) {
  const o = { aff: {}, gold: [], edge: { feng: 0, ling: 0, ren: 0 }, el: '', star: 0 };
  if (!ON() || !st.gear) return o;
  for (const s of L.GEAR_SLOTS) {
    const x = eq(st, s); if (!x) continue;
    for (const a of x.aff) o.aff[a] = (o.aff[a] || 0) + 1;
    if (x.gold) o.gold.push(x.gold);
    for (const k of x.edge || []) o.edge[k]++;
    o.star += x.star || 0;
  }
  o.el = L.gearEl(eq(st, 'w'));
  return o;
};

// ---------- 器方与打造（化神，器炉 5 级） ----------
const SWORD_FR = ['sword_3', 'sword_4', 'sword_5'];   // 老祖旧剑的三截残剑（ch_sword 第 3、4、5 步）
L.swordFrags = st => SWORD_FR.filter(f => st.eflags && st.eflags[f]).length;
L.planOwned = (st, id) => !!(st.gear && st.gear.plans[id]);
L.planOre = P => (P.ore ? Math.ceil(P.ore * Math.pow(1.5, P.t)) : 0);
L.planNeeds = function (st, id) {
  const P = L.PLAN[id], g = st.gear, out = [];
  for (const k in P.mats) out.push({ t: `${L.BOSS_MAT[k]} ×${P.mats[k]}`, have: g.mats[k] || 0, need: P.mats[k], ok: (g.mats[k] || 0) >= P.mats[k], src: `${L.BOSSES[k].n}（首杀 ×2，之后每 48 月再战 ×1）` });
  const o = L.planOre(P); if (o) out.push({ t: `灵矿 ${L.fmt(o)}`, have: st.ore || 0, need: o, ok: (st.ore || 0) >= o });
  for (const y in P.yin || {}) out.push({ t: `${L.YIN_N[y]} ×${P.yin[y]}`, have: L.yinHave(st, y), need: P.yin[y], ok: L.yinHave(st, y) >= P.yin[y], src: '灵田药引作物、坊市、觅食的灵宠' });
  if (P.sword) out.push({ t: `老祖旧剑残片 ×${P.sword}`, have: L.swordFrags(st), need: P.sword, ok: L.swordFrags(st) >= P.sword, src: '老祖的旧剑链' });
  return out;
};
L.canForge = function (st, id) {
  const P = L.PLAN[id];
  if (!P) return '没有这张器方';
  if (!L.gearOpen(st, 'forge')) return L.gearOpenWhy(st, 'forge');
  if (!L.planOwned(st, id)) return '还没有这张器方';
  const miss = L.planNeeds(st, id).filter(x => !x.ok);
  return miss.length ? '材料不足：' + miss.map(x => x.t.replace(/（.*）/, '')).join('、') : '';
};
L.forge = function (st, id) {
  if (L.canForge(st, id)) return null;
  const P = L.PLAN[id], g = st.gear;
  for (const k in P.mats) g.mats[k] -= P.mats[k];
  st.ore -= L.planOre(P);
  if (P.yin) L.yinPay(st, P.yin);
  st.stats.forged = (st.stats.forged || 0) + 1;
  const it = L.gearDrop(st, P.slot, P.t, { base: id, src: 'forge' });
  L.log(st, `器炉开火，打成${L.GEAR_N[P.slot]}【${P.n}】（${P.aff.map(a => L.AFFIX[a].n).join('、')}）`, 'gold');
  L.checkQuests(st);
  return it;
};
// 得到一张器方（g_*）或阵图（f_*，阵法上线前先收着）
L.givePlan = function (st, id) {
  const g = st.gear;
  if (L.PLAN[id]) {
    if (g.plans[id]) return `器方《${L.PLAN[id].n}》已有`;
    g.plans[id] = 1; L.log(st, `得到器方《${L.PLAN[id].n}》：${L.GEAR_N[L.PLAN[id].slot]}，${L.PLAN[id].aff.map(a => L.AFFIX[a].n).join('、')}`, 'gold');
    emit('plan', id);
    return `得到器方《${L.PLAN[id].n}》（${L.gearOpen(st, 'forge') ? '【洞府】器炉里能打' : '化神后器炉能打'}）`;
  }
  if (L.ZHENTU[id]) { g.zhentu[id] = 1; return `得到阵图《${L.ZHENTU[id]}》（阵法上线后可用）`; }
  return '';
};
L.giveMat = (st, k, n) => { st.gear.mats[k] = (st.gear.mats[k] || 0) + n; return n; };

// ---------- 每月：过期没决定的掉落按“更好就换、否则熔炼”结清（正常游玩里对比卡关掉就熔炼，这里只是兜底） ----------
L.GEAR_PEND_TTL = 40;
// 收着的（槽没开时得到的首领专属等）：槽一开，空着就直接戴上，否则转成一张普通的对比卡
L.gearTick = function (st) {
  const g = st.gear; if (!g || !g.pend.length) return;
  for (const x of g.pend.slice()) if (x.hold && L.gearOpen(st, x.slot)) {
    delete x.hold; x.at = st.tick;
    if (!g[x.slot]) { L.gearEquip(st, x); L.log(st, `${L.GEAR_N[x.slot]}槽开了，戴上收着的【${BASE[x.id].n}】`, 'gold'); emit('gearNew', { kind: x.slot, gear: x, equip: true }); }
  }
  if (st.expSum) return;
  for (const x of g.pend.slice()) if (!x.hold && st.tick - (x.at || 0) > L.GEAR_PEND_TTL) L.gearAuto(st, x);
};

// ---------- 存档迁移（v4 → v5）：旧法宝阶 → 该阶同名兵器 +0 无词条（找不到同名的取该阶第一件）；已斩首领补发材料 ----------
L.migrateGear = function (s) {
  const d = L.newGear();
  const g = s.gear && typeof s.gear === 'object' ? s.gear : d;
  for (const k in d) if (g[k] === undefined || g[k] === null && k !== 'w' && k !== 'o' && k !== 'r' && k !== 'rf' && k !== 'last') g[k] = d[k];
  for (const k of ['lock', 'plans', 'zhentu', 'mats', 'vaultU', 'pity', 'sigN', 'bossRe']) if (!g[k] || typeof g[k] !== 'object') g[k] = d[k];
  if (!Array.isArray(g.pend)) g.pend = [];
  // 词条改名（锋锐 → 会心）；没有星的旧法宝按词条数折成星（1 条 = 无星，2 条 = ★，3 条 = ★★；固定词条的首领专属 ★★、打造品 / 镇宗 ★）（COMBAT_LOOT §5.1）
  const fix = x => {
    if (!x || !BASE[x.id]) return null;
    const B = BASE[x.id], aff = Array.isArray(x.aff) ? x.aff.map(a => L.AFF_OLD[a] || a).filter(a => L.AFFIX[a]) : [];
    Object.assign(x, { slot: B.slot, t: B.t, plus: clamp(x.plus | 0, 0, 9), aff, fail: x.fail | 0, u: x.u || ++g.uid });
    if (!(x.star >= 0 && x.star <= 3)) x.star = B.fixed ? (B.boss !== undefined ? 2 : 1) : clamp(aff.length - 1, 0, 2);
    if (!Array.isArray(x.edge)) x.edge = [];
    if (x.gold && !L.GOLD_AFFIX[x.gold]) delete x.gold;
    if (x.el && !L.ELEM[x.el]) delete x.el;
    return x;
  };
  for (const sl of L.GEAR_SLOTS) g[sl] = fix(g[sl]);
  g.pend = g.pend.map(fix).filter(Boolean);
  let note = '';
  const p = s.p;
  if (typeof p.w === 'number' && p.w > 0 && !g.w) {
    const t = clamp(Math.floor(p.w), 1, 7), names = L.WEAPONS[t].names, i = Math.max(0, names.indexOf(p.wn));
    g.w = { u: ++g.uid, id: `w${t}_${i}`, slot: 'w', t, plus: 0, aff: [], fail: 0 };
    note = `旧法宝${p.wn ? '【' + p.wn + '】' : ''}（${L.WEAPONS[t].n}）折成同阶兵器【${names[i]}】+0`;
    for (const k in s.bosses || {}) if (s.bosses[k]) { g.mats[k] = Math.max(g.mats[k] || 0, 2); if (L.BOSS_PLAN[k]) g.plans[L.BOSS_PLAN[k]] = 1; }
  }
  delete p.w; delete p.wn;
  s.gear = g;
  if (typeof s.ore !== 'number' || !isFinite(s.ore)) s.ore = 0;
  s.bossAt = s.bossAt || {};
  if (s.stats && !(s.stats.smelt >= 0)) s.stats.smelt = 0;
  L.matsOf(s);
  if (s.wish !== null && (typeof s.wish !== 'object' || Array.isArray(s.wish))) s.wish = null;
  return note;
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md） ----------
// item: 'w' 兵器 / 'r' 法衣 / 'o' 饰品 / 'need' 最弱的一槽（events-engine 的 L.applyFx 统一走 L.giveItem）
// fx.plus 当前兵器强化 +n；fx.affix ±n 当前兵器随机去掉 / 添一条词条；fx.ore n 筐灵矿（1 筐 = L.oreUnit）；cost.ore 同单位；
// fx.plan 器方（g_*）或阵图（f_*，先收着）；fx.gear 一件指定底子的法宝（走对比卡）
L.supportFx('plus', { ok: v => Number.isInteger(v) && v > 0, apply: (st, v, out) => { const n = L.gearPlusFree(st, v); const x = eq(st, 'w'); out.push(x ? (n ? `兵器【${BASE[x.id].n}】强化 +${n}（现在 +${x.plus}）` : `兵器【${BASE[x.id].n}】已是 +9`) : '（手里没有兵器，这一炉白烧了）'); } });
L.supportFx('affix', { ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => {
  const x = eq(st, 'w');
  if (!x) { out.push('（手里没有兵器）'); return; }
  if (v < 0) for (let i = 0; i < -v && x.aff.length; i++) { const j = ri(0, x.aff.length - 1); const a = x.aff.splice(j, 1)[0]; out.push(`兵器失去词条「${L.AFFIX[a].n}」`); }
  else for (let i = 0; i < v && x.aff.length < 3; i++) { const a = rollAff('w', 9, '', 2).find(y => !x.aff.includes(y)); if (a) { x.aff.push(a); out.push(`兵器多了词条「${L.AFFIX[a].n}」`); } }
} });
L.supportFx('ore', { ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => {
  const n = Math.round(v * L.oreUnit(st) * (v > 0 && L.comboOn(st, 'c7') ? 1.5 : 1));
  if (n >= 0) L.addOre(st, n); else st.ore = Math.max(0, (st.ore || 0) + n);
  out.push(`灵矿 ${n >= 0 ? '+' : '−'}${L.fmt(Math.abs(n))}`);
} });
L.supportCost('ore', { ok: (st, v) => (st.ore || 0) >= v * L.oreUnit(st), pay: (st, v) => { st.ore = Math.max(0, (st.ore || 0) - v * L.oreUnit(st)); }, text: (st, v) => '灵矿 ' + L.fmt(v * L.oreUnit(st)) });
L.supportFx('plan', { ok: v => asArr(v).length > 0 && asArr(v).every(id => !!L.PLAN[id] || !!L.ZHENTU[id]), apply: (st, v, out) => { for (const id of asArr(v)) { const t = L.givePlan(st, id); if (t) out.push(t); } } });
L.supportFx('gear', { ok: v => !!BASE[v], apply: (st, v, out) => { const it = L.gearDrop(st, BASE[v].slot, BASE[v].t, { base: v, src: 'event' }); const t = L.gearItemText(st, it); out.push(t); (out.gearTexts = out.gearTexts || []).push(t); (out.items = out.items || []).push(it); if (!out.item) out.item = it; } });
// 强化失败时 10% 触发“炉中异物”（home_forge_boom）；它的 forge_refund2 返还本次强化灵矿 ×2
L.supportTrigger('forge_fail');
const flagPrev = L.CAPS.fx.flag;   // arts.js 已登记过 flag 的钩子（combo_hint），这里接在它后面
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of asArr(v)) if (f === 'forge_refund2') { delete st.eflags.forge_refund2; const c = st.gear.last; if (c) out.push('灵矿 +' + L.fmt(L.addOre(st, c.ore * 2)) + '（返还这回强化的两倍）'); }
} });
});
