/* 废柴仙途 · 逻辑模块 arts：五行与功法（docs/SYSTEMS.md §1～§2，docs/CONTENT.md §2）
 * 模块写法见 src/logic.js 顶部说明。
 *   功法三槽 st.arts.slot = [心法, 战技, 秘术]，拥有的功法与熟练点 st.arts.own = { id: 点数 }，残篇 st.arts.frag，融会 st.arts.rong；
 *   发现过的共鸣 st.meta.combo（跨世保留）。心法 / 战技的倍率经 L.addCulMod / L.addAtkMod 登记；五行克制经 L.addExpMod / L.addDuelMod；
 *   其余系统里的小效果（秘术、心法特效、共鸣）由各系统调 L.artV(st, id)（装备着时的特效数值，已乘熟练）与 L.comboOn(st, 'c1')。
 *   L.ARTS_ON = false：只剩“心法的裸倍率”（与旧版单一功法相当），tools/sim.js 的 noarts 用它量 SYSTEMS §18 的预算。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
L.ARTS_ON = true;
const ON = () => L.ARTS_ON !== false;
const asArr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);

// ---------- 五行（SYSTEMS §1） ----------
// 相克 金→木→土→水→火→金；相生 木→火→土→金→水→木。'' = 无（不参与）
L.ELEM = { jin: '金', mu: '木', shui: '水', huo: '火', tu: '土' };
L.ELEM_KEYS = ['jin', 'mu', 'shui', 'huo', 'tu'];
const KE = { jin: 'mu', mu: 'tu', tu: 'shui', shui: 'huo', huo: 'jin' };
const SHENG = { mu: 'huo', huo: 'tu', tu: 'jin', jin: 'shui', shui: 'mu' };
L.elKe = (a, b) => !!a && !!b && KE[a] === b;
L.elSheng = (a, b) => !!a && !!b && SHENG[a] === b;
L.elName = e => (e ? L.ELEM[e] : '无');
L.elCounter = e => Object.keys(KE).find(x => KE[x] === e) || '';   // 克 e 的那一系
L.EL_EXP = 8;                 // 历练分数：克制 +8 / 被克 −8
L.EL_DUEL = [1.15, 0.87];     // 对决战力：克制 ×1.15 / 被克 ×0.87
// 对手的五行（CONTENT §1 首领、§10 人物）；九宗与原圣子 CONTENT 没写，按门风定
L.RIVAL_EL = { mu: 'shui', zhao: 'jin', chu: 'jin', xue: 'huo', yun: 'shui' };
L.BOSS_EL = ['mu', 'jin', 'tu', 'huo', 'huo', 'jin', 'shui', 'shui', 'huo', 'tu', ''];
L.NINE_EL = { kunlun: 'shui', tianjian: 'jin', xuesha: 'huo', wanfa: 'shui', jingang: 'tu', jian: 'jin', dao: 'mu', dan: 'huo', yushou: 'mu' };
L.HEIR_EL = { jian: 'jin', dan: 'huo', dao: 'shui' };
L.foeEl = function (foe) {
  if (!foe) return '';
  if (foe.el !== undefined) return foe.el;
  switch (foe.kind) {
    case 'rival': return L.RIVAL_EL[foe.id] || '';
    case 'boss': return L.BOSS_EL[foe.k] || '';
    case 'sect': return L.NINE_EL[foe.id] || '';
    case 'heir': return L.HEIR_EL[foe.sect] || '';
    case 'war': return 'jin';
  }
  return '';
};
// 对手属性第一次交手后显示（st.meta.elem 里记 rv_mu / boss_3 / sect_tianjian / heir_jian / war）
L.foeKey = function (foe) {
  if (!foe) return '';
  switch (foe.kind) {
    case 'rival': return foe.id ? 'rv_' + foe.id : '';
    case 'boss': return 'boss_' + foe.k;
    case 'sect': return 'sect_' + foe.id;
    case 'heir': return 'heir_' + (foe.sect || '');
    case 'war': return 'war';
  }
  return '';
};
// 例外：战技槽一开，老祖就告诉你退婚那位练的是哪一系（约战前的锦囊要用）
L.foeElKnown = (st, foe) => { const k = L.foeKey(foe); return !!k && (!!(st.meta && st.meta.elem && st.meta.elem[k]) || (k === 'rv_mu' && L.artSlotOpen(st, 1))); };
L.revealFoe = function (st, foe) { const k = L.foeKey(foe); if (k && L.foeEl(foe)) { st.meta.elem = st.meta.elem || {}; st.meta.elem[k] = 1; } };

// ---------- 功法表（CONTENT §2） ----------
// k：x 心法 / z 战技 / m 秘术；t：阶 1～6；v：特效的入门值（随熟练 ×1～1.45）；d(v)：特效说明；
// src：来源（显示用）；pool：drop 寻宝·历练·奇遇·拍卖的随机池 / vault 宗门宝库（sect、rank 开放身份）/ mo 血煞秘境特产 / frag 残篇 ×3 / story 主线与奇遇链
const pc = v => { const x = Math.round(v * 1000) / 10; return (Number.isInteger(x) ? x : x.toFixed(1)) + '%'; };
const n2 = v => String(Math.round(v * 100) / 100);
L.ARTL = [
  // 心法（修炼倍率按阶 L.ARTS[t].m）
  { id: 'x_changchun', n: '长春功', k: 'x', t: 1, el: 'mu', v: 1, d: v => `负伤每月多恢复 ${n2(v)} 月`, src: '寻宝·历练', pool: 'drop' },
  { id: 'x_yinqi', n: '引气诀', k: 'x', t: 1, el: '', v: 1, d: v => `吐纳环蓄满快 ${n2(v)} 月（6 → ${n2(6 - v)}）`, src: '开局后首次寻宝保底', pool: 'drop' },
  { id: 'x_qingmu', n: '青木长生功', k: 'x', t: 2, el: 'mu', v: 0.08, d: v => `寿元流逝 −${pc(v)}`, src: '寻宝·历练', pool: 'drop' },
  { id: 'x_lieyang', n: '烈阳诀', k: 'x', t: 2, el: 'huo', v: 0.2, d: v => `闭关倍率 +${n2(v)}`, src: '丹霞谷宝库（内门）', pool: 'vault', sect: 'dan', rank: 1 },
  { id: 'x_houtu', n: '厚土载物经', k: 'x', t: 3, el: 'tu', v: 0.15, d: v => `突破失败修为只退到 ${pc(Math.min(0.95, 0.7 + v))}`, src: '寻宝·历练', pool: 'drop' },
  { id: 'x_taixu', n: '太虚引气诀', k: 'x', t: 3, el: 'shui', v: 0.2, d: v => `历练途中修炼 ×0.5 → ×${n2(Math.min(1, 0.5 + v))}`, src: '玄天道宗宝库（内门）', pool: 'vault', sect: 'dao', rank: 1 },
  // 天劫系统（SYSTEMS §9）上线前：“承劫 +6%”先折成金丹起的突破成功率
  { id: 'x_jiuzhuan', n: '九转玄功', k: 'x', t: 4, el: 'jin', v: 0.06, d: v => `冲击金丹及以上 +${pc(v)}（天劫上线后改为承劫）`, src: '太虚剑宗宝库（长老）', pool: 'vault', sect: 'jian', rank: 4 },
  { id: 'x_zifu', n: '紫府天书', k: 'x', t: 4, el: 'huo', v: 0.15, d: v => `闭关顿悟概率 +${pc(v)}`, src: '丹霞谷宝库（长老）', pool: 'vault', sect: 'dan', rank: 4 },
  // 丹毒（SYSTEMS §5）上线前：“丹毒每月多消 2”先折成炼丹省灵草
  { id: 'x_taiyi', n: '太乙真经', k: 'x', t: 5, el: 'shui', v: 0.10, d: v => `炼丹灵草 −${pc(v)}（丹毒上线后改为每月多消 2 点）`, src: '玄天道宗宝库（圣子）', pool: 'vault', sect: 'dao', rank: 3 },
  // 秘境独有（realm.js）：任意主题合计通关 3 次后进秘藏
  { id: 'x_hunyuan', n: '混元道经', k: 'x', t: 5, el: 'tu', v: 1, d: () => '三槽视为同属性：必得通用共鸣 +10%', src: '秘境秘藏（任意主题合计通关 3 次后）', pool: 'realm' },
  { id: 'x_hongmeng', n: '鸿蒙造化经', k: 'x', t: 6, el: '', v: 1, d: v => `全部功法熟练速度 ×${n2(1 + v)}`, src: '残篇 ×3：混沌裂隙、拍卖、星墟仙人链', pool: 'frag' },
  { id: 'x_xuanxiao_xin', n: '玄霄剑典·心卷', k: 'x', t: 6, el: 'jin', v: 0.15, d: v => `战技倍率部分 +${pc(v)}`, src: '主线（合体真相后老祖传授）', pool: 'story' },
  // 战技（战力倍率 L.ZHAN_M[t-1]，并决定攻击属性）
  { id: 'z_wuxing', n: '五行拳经', k: 'z', t: 1, el: 'tu', v: 0, d: () => '无特效', src: '寻宝·历练', pool: 'drop' },
  { id: 'z_liuyun', n: '流云剑法', k: 'z', t: 1, el: 'shui', v: 2, d: v => `历练分数 +${n2(v)}`, src: '寻宝·历练', pool: 'drop' },
  // 黄阶五行各一门（COMBAT_LOOT §3.2 新增三门：裂金斩、青藤缚、燎原式）
  { id: 'z_liejin', n: '裂金斩', k: 'z', t: 1, el: 'jin', v: 0.10, d: v => `历练灵矿 +${pc(v)}`, src: '第一章第 2 趟历练', pool: 'drop' },
  { id: 'z_qingteng', n: '青藤缚', k: 'z', t: 1, el: 'mu', v: 0.15, d: v => `采药灵草 +${pc(v)}`, src: '后山野林外围精英·老藤王', pool: 'drop' },
  { id: 'z_liaoyuan', n: '燎原式', k: 'z', t: 1, el: 'huo', v: 0.06, d: v => `斩妖灵石 +${pc(v)}`, src: '后山野林禁地精英·赤瞳头狼', pool: 'drop' },
  { id: 'z_huichun', n: '回春剑诀', k: 'z', t: 2, el: 'mu', v: 1, d: v => `每趟历练归来负伤 −${n2(v)} 月`, src: '寻宝·历练', pool: 'drop' },
  { id: 'z_liehuo', n: '烈火刀', k: 'z', t: 2, el: 'huo', v: 0.10, d: v => `斩妖灵石 +${pc(v)}`, src: '寻宝·历练、血煞秘境', pool: 'drop', mo: true },
  { id: 'z_gengjin', n: '庚金指', k: 'z', t: 3, el: 'jin', v: 0.1, d: v => `越级判定线 0.6 → ${n2(0.6 + v)}`, src: '太虚剑宗宝库（内门）', pool: 'vault', sect: 'jian', rank: 1 },
  // 秘境战斗气血损失 −20%×熟练（realm.js 的 L.mjDmg）；历练负伤月也 −20%
  { id: 'z_hanyue', n: '撼岳拳', k: 'z', t: 3, el: 'tu', v: 0.2, d: v => `秘境战斗气血损失 −${pc(v)}，历练负伤月 −${pc(v)}`, src: '寻宝·历练', pool: 'drop' },
  { id: 'z_wanjian', n: '万剑归宗', k: 'z', t: 4, el: 'jin', v: 6, d: v => `斩妖分数 +${n2(v)}`, src: '太虚剑宗宝库（圣子）', pool: 'vault', sect: 'jian', rank: 3 },
  { id: 'z_fentian', n: '焚天诀', k: 'z', t: 4, el: 'huo', v: 0.1, d: v => `对首领战力 ×${n2(1 + v)}`, src: '血煞秘境（四阶掉落）、熔火秘境秘藏', pool: 'drop', mo: true },
  // 秘境独有（百草秘藏）：秘境气血上限 +30×熟练（realm.js 的 L.mjMaxHp）；负伤时的战力折损也减轻
  { id: 'z_qingdi', n: '青帝剑', k: 'z', t: 5, el: 'mu', v: 0.15, d: v => `秘境气血上限 +${Math.round(200 * v)}，负伤时战力 ×0.6 → ×${n2(Math.min(1, 0.6 + v))}`, src: '百草秘境秘藏', pool: 'realm' },
  { id: 'z_canghai', n: '沧海无量', k: 'z', t: 5, el: 'shui', v: 0.05, d: v => `论道连胜每场战力 +${pc(v)}`, src: '东海借宝链（暂也由五阶掉落）', pool: 'drop' },
  { id: 'z_tianjian', n: '天剑九式（残）', k: 'z', t: 5, el: 'jin', v: 0.2, d: v => `对天剑宗的人战力 ×${n2(1 + v)}`, src: '主线（元婴“残缺的剑诀”）', pool: 'story' },
  { id: 'z_xuanxiao_jian', n: '玄霄剑典·剑卷', k: 'z', t: 6, el: 'jin', v: 0.02, d: v => `对决胜算上限 97% → ${pc(Math.min(0.99, 0.97 + v))}`, src: '老祖旧剑链终点（与器方《玄霄》一起传授）', pool: 'story' },
  // 秘术（无裸倍率，只有特效）
  { id: 'm_lianxi', n: '敛息术', k: 'm', t: 1, el: 'shui', v: 0.5, d: v => `负伤风险 −${pc(Math.min(0.9, v))}`, src: '寻宝·历练', pool: 'drop' },
  { id: 'm_yufeng', n: '御风诀', k: 'm', t: 2, el: 'mu', v: 1, d: v => `历练时长 −${Math.round(v)} 月（最少 3）`, src: '寻宝·历练', pool: 'drop' },
  { id: 'm_xunlong', n: '寻龙诀', k: 'm', t: 2, el: 'tu', v: 0.25, d: v => `寻宝行事掉率 +${pc(v)}，天材地宝 ×${n2(1 + 2 * v)}`, src: '藏宝图链（暂也由二阶掉落）', pool: 'drop' },
  { id: 'm_baicao', n: '百草经', k: 'm', t: 2, el: 'mu', v: 0.5, d: v => `采药灵草 +${pc(v)}（带回药引待药引系统）`, src: '丹霞谷宝库（圣子）', pool: 'vault', sect: 'dan', rank: 3 },
  // 秘境独有（幽泉秘藏）：秘境每层多一扇门、“？”门直接显形（realm.js）；历练相性与地图五行也不用试就显形
  { id: 'm_tianyan', n: '天眼通', k: 'm', t: 3, el: 'huo', v: 1, d: () => '秘境每层多一扇门，“？”门直接显形；历练相性与地图五行不用试就显形', src: '幽泉秘境秘藏', pool: 'realm' },
  { id: 'm_yushou', n: '驭兽诀', k: 'm', t: 3, el: 'mu', v: 0.2, d: v => `出战灵宠效果 +${pc(v)}，认主概率 ×2`, src: '寻宝·历练', pool: 'drop' },
  { id: 'm_danhuo', n: '丹火诀', k: 'm', t: 3, el: 'huo', v: 0.08, d: v => `成丹率 +${pc(v)}，上品以上 +${pc(v * 1.25)}`, src: '丹霞谷宝库（真传）', pool: 'vault', sect: 'dan', rank: 2 },
  { id: 'm_zhujian', n: '铸剑谱', k: 'm', t: 3, el: 'jin', v: 0.1, d: v => `法宝强化成功率 +${pc(v)}`, src: '太虚剑宗宝库（真传）', pool: 'vault', sect: 'jian', rank: 2 },
  { id: 'm_fenshen', n: '分身术', k: 'm', t: 4, el: 'shui', v: 0.5, d: v => `闭关时分身去外围历练一趟（收益 ${pc(Math.min(1, v))}）`, src: '玄天道宗宝库（真传）', pool: 'vault', sect: 'dao', rank: 2 },
  { id: 'm_xuedun', n: '血遁', k: 'm', t: 4, el: 'huo', v: 0.01, d: v => `丁等不负伤，改为寿元 −${pc(0.0001 / v)}`, src: '血煞秘境', pool: 'mo' },   // 代价随熟练减轻：1% ÷ 熟练倍数
  // 心魔劫（SYSTEMS §9）上线前：“心魔劫必过”先折成冲击元婴及以上的成功率
  { id: 'm_wangqing', n: '太上忘情录', k: 'm', t: 5, el: '', v: 0.05, d: v => `冲击元婴及以上 +${pc(v)}（心魔劫上线后改为必过）；好感获取 −30%`, src: '玄天道宗宝库（太上长老）', pool: 'vault', sect: 'dao', rank: 5 },
  // 四季（SYSTEMS §7，calendar.js 的 L.seasonAmp）：季节加成翻倍
  { id: 'm_xingdou', n: '月星斗大法', k: 'm', t: 6, el: '', v: 1, d: () => '四季的季节加成翻倍（春灵草访客、夏兽类地图、秋灵稻行情、冬闭关）', src: '残篇 ×3：天外星墟禁地、坊市、拍卖', pool: 'frag' },
];
const ART = {};
for (const A of L.ARTL) ART[A.id] = A;
L.art = id => ART[id] || null;
L.ZHAN_M = [1.10, 1.20, 1.32, 1.45, 1.60, 1.80];
L.ART_CAT = { x: '心法', z: '战技', m: '秘术' };
L.ART_SLOTS = ['x', 'z', 'm'];
const SLOT_OF = { x: 0, z: 1, m: 2 };
L.artSlotOf = id => SLOT_OF[ART[id].k];
// 阶名（黄玄地天仙神）与品阶色序号（界面用 ART.qualityColor(t)）
L.artTierName = t => ['', '黄阶', '玄阶', '地阶', '天阶', '仙阶', '神阶'][t] || '';
// 熟练：入门 / 小成 / 大成 / 圆满 / 化境，所需累计点数 [0, 12, 36, 80, 150] × (1 + 0.5 × 阶)；效果 ×[1, 1.1, 1.2, 1.3, 1.45]
L.MAST = { pts: [0, 12, 36, 80, 150], mult: [1, 1.1, 1.2, 1.3, 1.45], n: ['入门', '小成', '大成', '圆满', '化境'], tick: 1, retreat: 2, slay: 2, dup: 20 };
// 融会：练到圆满永久得一份（卸下也保留），全功法合计上限 +30%
L.RONG = { x: [0.015, 0], z: [0, 0.015], m: [0.0075, 0.0075], cap: 0.30 };
L.artNeed = (id, lv) => Math.round(L.MAST.pts[Math.min(4, lv)] * (1 + 0.5 * ART[id].t));
L.artPts = (st, id) => (st.arts && st.arts.own[id]) || 0;
L.artOwned = (st, id) => !!(st.arts && st.arts.own[id] !== undefined);
L.artLv = function (st, id) { const p = L.artPts(st, id); let lv = 0; for (let i = 1; i < 5; i++) if (p >= L.artNeed(id, i)) lv = i; return lv; };
L.artMm = (st, id) => (ON() ? L.MAST.mult[L.artLv(st, id)] : 1);
// 到下一级的进度（0～1）与还差多少点
L.artProg = function (st, id) {
  const lv = L.artLv(st, id), p = L.artPts(st, id);
  if (lv >= 4) return { lv, f: 1, left: 0, next: '' };
  const a = L.artNeed(id, lv), b = L.artNeed(id, lv + 1);
  return { lv, f: (p - a) / (b - a), left: b - p, next: L.MAST.n[lv + 1] };
};
L.newArts = () => ({ own: {}, slot: [null, null, null], swapAt: -99, frag: {}, rong: {}, injAcc: 0, firstBox: 0 });

// ---------- 槽位 ----------
// 心法槽开局；战技槽与五行克制炼气后期；秘术槽金丹（SYSTEMS §0）。转世后全开
L.artSlotOpen = function (st, i) {
  if (i === 0 || st.rebirth > 0) return true;
  if (i === 1) return true;   // COMBAT_LOOT §7.4：战技槽不再等炼气后期，拥有任意战技就能用（第 2 趟保底掉《裂金斩》）
  return Math.max(st.p.r, (st.flags && st.flags.maxR) || 0) >= 2;
};
L.artSlotWhy = i => (i === 1 ? '第 2 趟历练会得到' : i === 2 ? '金丹开放' : '');
function slotsOf(st) {
  const a = st.arts; if (!a) return [null, null, null];
  return a.slot.map((id, i) => (id && a.own[id] !== undefined && ART[id] && SLOT_OF[ART[id].k] === i && L.artSlotOpen(st, i) ? id : null));
}
L.artSlots = slotsOf;
L.artOn = (st, id) => ON() && slotsOf(st).includes(id);
// 装备着时的特效数值（入门值 × 熟练倍数），没装备为 0
L.artV = (st, id) => (L.artOn(st, id) ? ART[id].v * L.MAST.mult[L.artLv(st, id)] : 0);
L.artVOf = (st, id) => ART[id].v * L.MAST.mult[L.artLv(st, id)];   // 不管装没装备（列表里显示用）
L.artDesc = (st, id) => ART[id].d(L.artVOf(st, id));
// 攻击属性 = 装备的战技的五行（没装战技为无）。混元一气（c15）每趟自动取克制方
L.atkEl = function (st, foeEl, sl) {
  if (!ON()) return '';
  sl = sl || slotsOf(st);
  if (!sl[1]) return '';
  if (foeEl && comboIn(st, sl, 'c15')) return L.elCounter(foeEl) || ART[sl[1]].el;
  return ART[sl[1]].el;
};

// ---------- 共鸣（CONTENT §2：通用规则 + 18 条有名的；数值固定，不随熟练） ----------
// cul / atk：修炼、战力倍率加成；其余效果由各系统按 L.comboOn 查
L.COMBOS = [
  { id: 'c1', n: '生生不息', a: ['x_qingmu', 'z_huichun'], d: '负伤恢复 ×2，寿元流逝再 −10%' },
  { id: 'c2', n: '烈火燎原', a: ['x_lieyang', 'z_liehuo'], d: '斩妖灵石 +20%' },
  { id: 'c3', n: '水火既济', a: ['x_zifu', 'z_canghai'], cul: 0.06, d: '修炼 +6%（丹毒上限 +40 待丹毒系统）' },
  { id: 'c4', n: '剑心通明', a: ['x_jiuzhuan', 'z_wanjian'], atk: 0.10, d: '战力 +10%，对决胜算 +3%' },
  { id: 'c5', n: '厚德载物', a: ['x_houtu', 'z_hanyue'], d: '法衣全部效果 ×1.5（历练分数、承劫）' },
  { id: 'c6', n: '一气化三清', a: ['x_taixu', 'm_fenshen'], d: '分身收益 50% → 80%' },
  { id: 'c7', n: '寻龙点穴', a: ['m_xunlong', 'z_gengjin'], d: '灵矿所得 ×1.5（历练与奇遇）' },
  { id: 'c8', n: '万兽朝苍', a: ['m_yushou', 'z_qingdi'], d: '灵宠战力加成再 +50%（名册上线后改为可出战两只）' },
  { id: 'c9', n: '丹剑双绝', a: ['m_danhuo', 'z_liehuo'], d: '炼丹 25% 概率不耗灵草（药引上线后改为不耗药引）' },
  { id: 'c10', n: '风行水上', a: ['m_yufeng', 'z_liuyun'], d: '历练时长再 −1（最少 2）' },
  { id: 'c11', n: '太上无情', a: ['m_wangqing', 'x_taiyi'], cul: 0.12, d: '修炼 +12%；不能结道侣（已有则双修失效）' },
  { id: 'c12', n: '星河倒悬', a: ['m_xingdou', 'z_canghai'], d: '冬季闭关倍率再 +0.5' },
  { id: 'c13', n: '天河倒悬', a: ['x_xuanxiao_xin', 'z_tianjian'], d: '对天剑宗的人胜算下限 50%' },
  { id: 'c14', n: '玄霄真传', a: ['x_xuanxiao_xin', 'z_xuanxiao_jian'], cul: 0.10, atk: 0.20, d: '战力 +20%，修炼 +10%' },
  { id: 'c15', n: '混元一气', a: ['x_hunyuan', 'z_wuxing'], d: '五行拳经按 5 阶计，攻击属性每趟自动取克制方' },
  { id: 'c16', n: '百草回春', a: ['x_changchun', 'm_baicao'], d: '灵田灵草产量 +30%' },
  { id: 'c17', n: '炉火纯青', a: ['x_lieyang', 'm_danhuo'], fireZ: true, d: '成丹率、法宝强化成功率各 +10%' },
  { id: 'c18', n: '潜渊', a: ['x_taixu', 'm_lianxi'], d: '禁地丁等改为空手而归、不负伤' },
];
const COMBO = {};
for (const c of L.COMBOS) COMBO[c.id] = c;
L.combo = id => COMBO[id];
function comboList(st, sl) {
  if (!ON()) return [];
  const out = [];
  for (const c of L.COMBOS) {
    if (!c.a.every(id => sl.includes(id))) continue;
    if (c.fireZ && !(sl[1] && ART[sl[1]].el === 'huo')) continue;
    out.push(c.id);
  }
  return out;
}
function comboIn(st, sl, id) { return comboList(st, sl).includes(id); }
const comboCache = new WeakMap();
L.artCombos = function (st, sl) {
  if (sl) return comboList(st, sl);
  const s = slotsOf(st), key = s.join('|') + (ON() ? '' : '!');
  const c = comboCache.get(st);
  if (c && c.key === key) return c.v;
  const v = comboList(st, s);
  comboCache.set(st, { key, v });
  return v;
};
L.comboOn = (st, id) => L.artCombos(st).includes(id);
// 通用共鸣：三槽中两门同属性 +4%、三门 +10%（修炼与战力各）；心法生战技 → 战技倍率部分 +10%
L.GEN = { two: 0.04, three: 0.10, sheng: 0.10 };
L.artGen = function (st, sl) {
  sl = sl || slotsOf(st);
  if (!ON()) return { same: 0, sheng: false, el: '' };
  let same = 0, el = '';
  if (sl.includes('x_hunyuan') && sl.filter(Boolean).length >= 2) same = 3;
  else {
    const cnt = {};
    for (const id of sl) if (id && ART[id].el) { const e = ART[id].el; cnt[e] = (cnt[e] || 0) + 1; if (cnt[e] > same) { same = cnt[e]; el = e; } }
    if (same < 2) same = 0;
  }
  const sheng = !!(sl[0] && sl[1] && L.elSheng(ART[sl[0]].el, ART[sl[1]].el));
  return { same, sheng, el };
};
L.rongSum = function (st, kind) {
  const r = (st.arts && st.arts.rong) || {};
  let v = 0;
  for (const id in r) if (ART[id]) v += L.RONG[ART[id].k][kind === 'cul' ? 0 : 1];
  return Math.min(L.RONG.cap, v);
};
L.rongN = st => Object.keys((st.arts && st.arts.rong) || {}).length;
// 心法 / 战技的倍率（sl 可传假设的三槽，用于“换上之后”的比较）
function xMult(st, sl) {
  const id = sl[0]; if (!id) return 1;
  return 1 + (L.ARTS[ART[id].t].m - 1) * L.artMm(st, id);
}
function zMult(st, sl) {
  const id = sl[1]; if (!id || !ON()) return 1;
  const t = id === 'z_wuxing' && comboIn(st, sl, 'c15') ? 5 : ART[id].t;
  let ex = (L.ZHAN_M[t - 1] - 1) * L.artMm(st, id);
  if (L.artGen(st, sl).sheng) ex *= 1 + L.GEN.sheng;
  if (sl.includes('x_xuanxiao_xin')) ex *= 1 + ART.x_xuanxiao_xin.v * L.artMm(st, 'x_xuanxiao_xin');
  return 1 + ex;
}
L.artXMult = (st, sl) => xMult(st, sl || slotsOf(st));
L.artZMult = (st, sl) => zMult(st, sl || slotsOf(st));
L.artCulParts = function (st, sl) {
  sl = sl || slotsOf(st);
  const out = [], on = ON();
  if (sl[0]) out.push([`心法《${ART[sl[0]].n}》${on ? '·' + L.MAST.n[L.artLv(st, sl[0])] : ''}`, xMult(st, sl), 'art']);
  else out.push(['心法·基础吐纳', 1, 'art']);
  if (!on) return out;
  const g = L.artGen(st, sl);
  if (g.same >= 2) out.push([`共鸣·${g.same >= 3 ? '三' : '两'}门同属`, 1 + (g.same >= 3 ? L.GEN.three : L.GEN.two), 'art']);
  for (const c of comboList(st, sl)) if (COMBO[c].cul) out.push(['共鸣·' + COMBO[c].n, 1 + COMBO[c].cul, 'art']);
  const rc = L.rongSum(st, 'cul'); if (rc > 0) out.push([`融会（${L.rongN(st)} 门圆满）`, 1 + rc, 'art']);
  return out;
};
L.artAtkParts = function (st, sl) {
  sl = sl || slotsOf(st);
  if (!ON()) return [];
  const out = [];
  if (sl[1]) out.push([`战技《${ART[sl[1]].n}》·${L.MAST.n[L.artLv(st, sl[1])]}`, zMult(st, sl), 'art']);
  else if (L.artSlotOpen(st, 1)) out.push(['战技·未装备', 1, 'art']);
  const g = L.artGen(st, sl);
  if (g.same >= 2) out.push([`共鸣·${g.same >= 3 ? '三' : '两'}门同属`, 1 + (g.same >= 3 ? L.GEN.three : L.GEN.two), 'art']);
  for (const c of comboList(st, sl)) if (COMBO[c].atk) out.push(['共鸣·' + COMBO[c].n, 1 + COMBO[c].atk, 'art']);
  const ra = L.rongSum(st, 'atk'); if (ra > 0) out.push([`融会（${L.rongN(st)} 门圆满）`, 1 + ra, 'art']);
  return out;
};
L.artCulMult = (st, sl) => L.modProd(L.artCulParts(st, sl));
L.artAtkMult = (st, sl) => L.modProd(L.artAtkParts(st, sl));
L.addCulMod('art', 20, st => L.artCulParts(st));
L.addAtkMod('art', 15, st => L.artAtkParts(st));

// ---------- 五行克制：历练分数与对决战力 ----------
// 历练：你的攻击属性克此地 +8；此地克你 −8（地图属性第一次去之后显示）
L.expElem = function (st, k, sl) {
  const me = L.atkEl(st, L.REGIONS[k].el, sl), it = L.REGIONS[k].el;
  if (!me || !it) return { me, it, v: 0 };
  const v = L.elKe(me, it) ? L.EL_EXP : L.elKe(it, me) ? -L.EL_EXP : 0;
  // 法宝词条「藏锋」：被克时不受惩罚（gear.js）
  if (v < 0 && L.gearAffN && L.gearAffN(st, 'cangfeng')) return { me, it, v: 0, cang: true };
  return { me, it, v };
};
L.addExpMod('elem', 15, (st, k) => {
  const e = L.expElem(st, k);
  if (!e.v) return null;
  return [e.v > 0 ? `五行·${L.elName(e.me)}克${L.elName(e.it)}` : `五行·${L.elName(e.it)}克${L.elName(e.me)}`, e.v, 'elem'];
});
L.duelElem = function (st, foe, sl) {
  const fe = L.foeEl(foe), me = L.atkEl(st, fe, sl);
  if (!me || !fe) return { me, fe, m: 1 };
  const m = L.elKe(me, fe) ? L.EL_DUEL[0] : L.elKe(fe, me) ? L.EL_DUEL[1] : 1;
  if (m < 1 && L.gearAffN && L.gearAffN(st, 'cangfeng')) return { me, fe, m: 1, cang: true };
  return { me, fe, m };
};
L.addDuelMod('elem', 10, (st, foe) => {
  const e = L.duelElem(st, foe);
  if (e.m === 1) return null;
  return [e.m > 1 ? `五行·${L.elName(e.me)}克${L.elName(e.fe)}` : `五行·${L.elName(e.fe)}克${L.elName(e.me)}`, e.m, 'elem'];
});
// 天剑宗的人：赵乾、楚天阔、会武时的天剑宗代表、来犯的天剑宗
L.foeTianjian = foe => !!foe && ((foe.kind === 'rival' && (foe.id === 'zhao' || foe.id === 'chu')) || ((foe.kind === 'sect' || foe.kind === 'war') && foe.id === 'tianjian'));
L.addDuelMod('art', 20, (st, foe) => {
  const a = [];
  const f = L.artV(st, 'z_fentian'); if (f && foe.kind === 'boss') a.push(['战技·焚天诀（首领）', 1 + f, 'art']);
  const t = L.artV(st, 'z_tianjian'); if (t && L.foeTianjian(foe)) a.push(['战技·天剑九式（天剑宗）', 1 + t, 'art']);
  const c = L.artV(st, 'z_canghai'); if (c && foe.kind === 'rival' && foe.streak > 0) a.push([`战技·沧海无量（连胜 ${foe.streak}）`, 1 + c * foe.streak, 'art']);
  return a.length ? a : null;
});
L.addDuelPMod('art', 20, (st, foe) => {
  const r = {};
  const j = L.artV(st, 'z_xuanxiao_jian'); if (j) r.hi = Math.min(0.99, 0.97 + j);
  if (L.comboOn(st, 'c4')) r.add = 0.03;
  if (L.comboOn(st, 'c13') && L.foeTianjian(foe)) r.lo = 0.5;
  return r.hi || r.add || r.lo ? r : null;
});

// ---------- 其他系统读的小效果 ----------
// 突破：九转玄功（金丹起）、太上忘情录（元婴起）；厚土载物经（失败只退到 85%）
L.addBtMod('art', 55, st => {
  const a = [];
  const j = L.artV(st, 'x_jiuzhuan'); if (j && st.p.r >= 1) a.push(['心法·九转玄功', j]);
  const w = L.artV(st, 'm_wangqing'); if (w && st.p.r >= 2) a.push(['秘术·太上忘情', w]);
  return a.length ? a : null;
});
L.btKeep = st => Math.min(0.95, 0.7 + L.artV(st, 'x_houtu'));
// 状态：历练途中修炼 ×0.5（太虚引气诀 → ×0.7）；心法转修 2 月 ×0.5
L.expCulMult = st => Math.min(1, 0.5 + L.artV(st, 'x_taixu'));
L.SWAP = { len: 2, m: 0.5 };
L.artSwapLeft = st => (ON() && st.arts ? Math.max(0, st.arts.swapAt + L.SWAP.len - st.tick) : 0);
// 闭关倍率（烈阳诀、星河倒悬）与顿悟（紫府天书）
// 星河倒悬（c12）的冬季 +0.5 在 calendar.js 的 L.calRetBonus
L.artRetBonus = st => L.artV(st, 'x_lieyang');
L.artEpi = st => L.artV(st, 'x_zifu');
// 吐纳环每月蓄多少格（满格 6）：引气诀让它 6 → 5 月蓄满
L.tunaStep = st => { const v = L.artV(st, 'x_yinqi'); return v > 0 ? L.TUNA_FULL / (L.TUNA_FULL - Math.min(3, v)) : 1; };
// 寿元流逝：青木长生功 −8%、生生不息再 −10%
L.ageRate = st => (1 - L.artV(st, 'x_qingmu')) * (L.comboOn(st, 'c1') ? 0.9 : 1);
// 负伤时的战力折损（青帝剑减轻）
L.injAtk = st => Math.min(1, 0.6 + L.artV(st, 'z_qingdi'));
// 炼丹：成丹率、品质、灵草消耗
L.artAlchRate = st => L.artV(st, 'm_danhuo') + (L.comboOn(st, 'c17') ? 0.10 : 0);
L.artAlchQual = st => L.artV(st, 'm_danhuo') * 1.25;
L.artHerbCost = st => 1 - L.artV(st, 'x_taiyi');
// 灵田灵草（百草回春）、灵宠（驭兽诀、万兽朝苍）、好感（太上忘情录）、道侣（太上无情）
L.fieldHerbMult = st => (L.comboOn(st, 'c16') ? 1.3 : 1);
L.petBoost = st => (1 + L.artV(st, 'm_yushou')) * (L.comboOn(st, 'c8') ? 1.5 : 1);
L.affMult = st => (L.artOn(st, 'm_wangqing') ? 0.7 : 1);
L.daolvBlocked = st => L.comboOn(st, 'c11');
// 历练里用到的一整组（L.expCalc、L.expForecast、L.resolveExp 读）
L.artExp = function (st, k, d, a) {
  const o = { stone: 1, item: 1, treasure: 1, herb: 1, pet: 1, leap: 0.6, injAvoid: 0, xuedun: 0, c18: false, injMul: 1, heal: 0, reveal: false };
  if (!ON()) return o;
  if (a === 0) o.stone *= 1 + L.artV(st, 'z_liehuo') + (L.comboOn(st, 'c2') ? 0.2 : 0);
  if (a === 1) { const x = L.artV(st, 'm_xunlong'); o.item *= 1 + x; o.treasure *= 1 + 2 * x; }
  if (a === 2) o.herb *= 1 + L.artV(st, 'm_baicao');
  if (L.artOn(st, 'm_yushou')) o.pet = 2;
  o.leap = 0.6 + L.artV(st, 'z_gengjin');
  o.injAvoid = Math.min(0.9, L.artV(st, 'm_lianxi'));
  o.xuedun = L.artOn(st, 'm_xuedun') ? 0.01 / L.artMm(st, 'm_xuedun') : 0;
  o.c18 = d === 2 && L.comboOn(st, 'c18');
  o.injMul = 1 - L.artV(st, 'z_hanyue');
  o.heal = L.artV(st, 'z_huichun');
  o.reveal = L.artOn(st, 'm_tianyan');
  return o;
};
// 历练分数里的功法项：流云剑法 +2、万剑归宗斩妖 +6（厚德载物现在放大法衣，见 gear.js）
L.addExpMod('art', 16, (st, k, d, a) => {
  const out = [];
  const lv = L.artV(st, 'z_liuyun'); if (lv) out.push(['战技·流云剑法', lv, 'art']);
  const wj = L.artV(st, 'z_wanjian'); if (wj && a === 0) out.push(['战技·万剑归宗', wj, 'art']);
  return out.length ? out : null;
});
// 历练时长：御风诀 −1（最少 3），风行水上再 −1（最少 2）
L.artExpLen = function (st, base) {
  if (!st || !ON()) return base;
  let n = base;
  const y = L.artV(st, 'm_yufeng');
  if (y) n = Math.max(Math.min(3, base), n - Math.round(y));
  if (L.comboOn(st, 'c10')) n = Math.max(2, n - 1);
  return n;
};
// 概率取整：1.45 → 1，45% 的概率再 +1
L.probRound = v => Math.floor(v) + (R() < v - Math.floor(v) ? 1 : 0);

// ---------- 熟练 ----------
// 装备着的功法每月 +1（心法在闭关中 +2）；战技每趟斩妖历练另 +2；鸿蒙造化经让全部 ×2；藏经阁每级 +10%
// TODO SYSTEMS §6.1：洞府藏经阁建成后把等级接进 L.libraryLv，并按级揭示共鸣提示（L.comboHint）
L.libraryLv = () => 0;
// 法宝词条「通灵」每条 +15%（gear.js）
L.artRate = st => (1 + L.artV(st, 'x_hongmeng')) * (1 + 0.1 * L.libraryLv(st)) * (1 + (L.gearAffN ? L.AFF_V.tongling * L.gearAffN(st, 'tongling') : 0));
L.addMastery = function (st, id, n) {
  if (!ART[id] || !L.artOwned(st, id) || !n) return null;
  const lv0 = L.artLv(st, id);
  st.arts.own[id] = Math.max(0, st.arts.own[id] + n);
  const lv1 = L.artLv(st, id);
  if (lv1 > lv0) {
    L.log(st, `《${ART[id].n}》熟练升至「${L.MAST.n[lv1]}」`, lv1 >= 3 ? 'gold' : 'jade');
    emit('mastery', { id, lv: lv1 });
    if (lv1 >= 3 && !st.arts.rong[id]) {
      st.arts.rong[id] = 1;
      const R0 = L.RONG[ART[id].k];
      L.log(st, `《${ART[id].n}》圆满，融会贯通：${R0[0] ? '修炼 +' + pc(R0[0]) : ''}${R0[0] && R0[1] ? '、' : ''}${R0[1] ? '战力 +' + pc(R0[1]) : ''}（卸下也保留）`, 'gold');
      emit('rong', { id });
    }
  }
  return { lv0, lv1 };
};
// 槽位刚解锁：老祖先把手里最合适的一门装上（战技看战力、秘术看阶）
L.artCheckOpen = function (st) {
  const a = st.arts;
  if (!a.open) a.open = [true, false, false];
  for (let i = 1; i < 3; i++) {
    if (a.open[i] || !L.artSlotOpen(st, i)) continue;
    a.open[i] = true;
    if (!slotsOf(st)[i]) {
      const own = Object.keys(a.own).filter(id => ART[id] && SLOT_OF[ART[id].k] === i);
      const best = own.sort((x, y) => (i === 1 ? L.artTry(st, y, () => L.power(st)) - L.artTry(st, x, () => L.power(st)) : ART[y].t - ART[x].t))[0];
      if (best) L.equipArt(st, best);
    }
    emit('slotOpen', i);
  }
};
// 每月：槽位解锁、熟练、长春功 / 生生不息的额外疗伤
L.artTick = function (st) {
  if (!st.arts) return;
  L.artCheckOpen(st);
  if (!ON()) return;
  const sl = slotsOf(st), rate = L.artRate(st);
  const ret = st.retreat && st.retreat.kind !== 'teach' && st.retreat.kind !== 'busy';
  sl.forEach((id, i) => { if (id) L.addMastery(st, id, (i === 0 && ret ? L.MAST.retreat : L.MAST.tick) * rate); });
  if (st.p.inj > 0) {
    const ex = (1 + L.artV(st, 'x_changchun')) * (L.comboOn(st, 'c1') ? 2 : 1) - 1;
    if (ex > 0) { st.arts.injAcc = (st.arts.injAcc || 0) + ex; while (st.arts.injAcc >= 1 && st.p.inj > 0) { st.p.inj--; st.arts.injAcc--; } }
  } else st.arts.injAcc = 0;
};

// ---------- 装备 ----------
// 点槽 → 点功法：L.equipArt 即时生效（心法更换后 2 月修炼 ×0.5“转修”）；第一次凑齐的有名共鸣记入 st.meta.combo
L.equipArt = function (st, id) {
  if (!ART[id] || !L.artOwned(st, id)) return null;
  const i = SLOT_OF[ART[id].k];
  if (!L.artSlotOpen(st, i)) return null;
  const prev = st.arts.slot[i];
  if (prev === id) return { ok: true, same: true, slot: i, combos: [] };
  st.arts.slot[i] = id;
  if (i === 0 && prev && L.artOwned(st, prev)) st.arts.swapAt = st.tick;
  return { ok: true, slot: i, prev, combos: L.checkCombos(st) };
};
L.unequipArt = function (st, i) { if (!st.arts.slot[i]) return false; if (i === 0) st.arts.swapAt = st.tick; st.arts.slot[i] = null; return true; };
L.checkCombos = function (st) {
  const out = [];
  if (!ON()) return out;
  st.meta.combo = st.meta.combo || {};
  for (const c of L.artCombos(st)) if (!st.meta.combo[c]) {
    st.meta.combo[c] = 1; out.push(c);
    L.log(st, `【共鸣】${COMBO[c].n}：${COMBO[c].d}`, 'gold');
    emit('combo', { id: c });
  }
  const g = L.artGen(st);
  if (g.same >= 2 && !st.flags.genCombo) { st.flags.genCombo = 1; emit('comboGen', g); }
  return out;
};
// 假设换上 id，看修炼 / 战力变成多少（不改存档）
L.artTry = function (st, id, fn) {
  const a = st.arts, i = SLOT_OF[ART[id].k], prev = a.slot[i];
  a.slot[i] = id;
  try { return fn(); } finally { a.slot[i] = prev; }
};
L.artDelta = function (st, id) {
  const g0 = L.gainBase(st), p0 = L.power(st);
  const [g1, p1] = L.artTry(st, id, () => [L.gainBase(st), L.power(st)]);
  return { g0, g1, p0, p1, dg: g1 - g0, dp: p1 - p0 };
};
// 换上是否更好（心法看修炼、战技看战力；秘术没有裸倍率，不算）。只是裸数比较：界面上的“换上”看 L.artRecommend（artrec.js），这个留给 sim 的 lazy 与秘境选项的说明
L.artBetter = function (st, id) {
  const i = SLOT_OF[ART[id].k];
  if (!L.artSlotOpen(st, i) || i === 2) return false;
  const cur = slotsOf(st)[i];
  if (cur === id) return false;
  const d = L.artDelta(st, id);
  return i === 0 ? d.g1 > d.g0 * 1.0001 : d.p1 > d.p0 * 1.0001;
};
// 功法页的列表：某一槽能装的已有功法，按“换上后修炼 / 战力变化”排序，第一项是推荐
L.artList = function (st, i) {
  const k = L.ART_SLOTS[i], cur = slotsOf(st)[i];
  const rows = Object.keys(st.arts.own).filter(id => ART[id] && ART[id].k === k).map(id => {
    const d = L.artDelta(st, id), A = ART[id];
    const combos = L.artTry(st, id, () => L.artCombos(st, L.artSlots(st)));
    const gen = L.artTry(st, id, () => L.artGen(st));
    const score = i === 0 ? d.g1 / Math.max(1e-9, d.g0) : i === 1 ? d.p1 / Math.max(1e-9, d.p0) : 1 + 0.01 * A.t + 0.05 * combos.length + (L.artLv(st, id) >= 3 ? 0 : 0.002);
    return { id, A, d, cur: id === cur, combos, gen, score, lv: L.artLv(st, id) };
  });
  rows.sort((a, b) => b.score - a.score || b.A.t - a.A.t);
  // “荐”：心法 / 战技取 L.artRecommend 平时的那一门（artrec.js；与角标、气泡、变强页同一门，带原因），排第一；秘术仍按阶与共鸣
  const rc = i < 2 && L.artRecommend ? L.artRecommend(st, i) : null;
  if (rc) { const r = rows.find(x => x.id === rc.id); if (r && !rc.same) { r.rec = true; r.why = rc.why; rows.splice(rows.indexOf(r), 1); rows.unshift(r); } }
  else if (i === 2 && rows.length && !rows[0].cur && rows[0].score > 1.0001) rows[0].rec = true;
  return rows;
};

// 三槽的最优搭配（tools/sim.js 的 guided 用；界面的“荐 / 换上”一律用 artrec.js 的 L.artRecommend）
// opt：wc / wa 修炼、战力的权重（默认 1）；foe 对手（算克制 ×1.15 / ×0.87）；k 地图（克制 ±8 分按每分战力 ×1.028 折算）；
//      mval { 秘术id: 价值 }（秘术没有裸倍率，价值由调用方定，缺省按阶 0.005/阶）；only 只换哪一槽
L.artBest = function (st, opt) {
  opt = opt || {};
  const cur = slotsOf(st);
  const own = Object.keys(st.arts.own).filter(id => ART[id]);
  const cand = [0, 1, 2].map(i => (!L.artSlotOpen(st, i) ? [null] : opt.only !== undefined && opt.only !== i ? [cur[i]] : [null].concat(own.filter(id => SLOT_OF[ART[id].k] === i))));
  let best = null;
  for (const x of cand[0]) for (const z of cand[1]) for (const m of cand[2]) {
    const sl = [x, z, m];
    let s = (opt.wc === undefined ? 1 : opt.wc) * Math.log(L.artCulMult(st, sl)) + (opt.wa === undefined ? 1 : opt.wa) * Math.log(L.artAtkMult(st, sl));
    if (m) s += opt.mval && opt.mval[m] !== undefined ? opt.mval[m] : 0.005 * ART[m].t;
    if (opt.foe) s += Math.log(L.duelElem(st, opt.foe, sl).m);
    if (opt.fel !== undefined) { const ze = sl[1] ? ART[sl[1]].el : ''; s += L.elKe(ze, opt.fel) ? 0.45 : L.elKe(opt.fel, ze) ? -0.3 : 0; }   // 回合战：克这一格精英的战技（COMBAT_LOOT §4.1：克制 ≈ 战力 ×1.7）
    else if (opt.k !== undefined) s += L.expElem(st, opt.k, sl).v * 0.028;
    if (!best || s > best.s + 1e-12) best = { sl, s };
  }
  return best ? best.sl : cur;
};
// 按 L.artBest 的结果换上（心法只在修炼至少多 minX 时才换，免得来回转修）
L.artApply = function (st, sl, minX) {
  const cur = slotsOf(st);
  if (sl[0] !== cur[0] && sl[0]) {
    const gain = L.artCulMult(st, [sl[0], cur[1], cur[2]]) / L.artCulMult(st, cur);
    if (!cur[0] || gain >= 1 + (minX === undefined ? 0.02 : minX)) L.equipArt(st, sl[0]);
  }
  for (const i of [1, 2]) if (sl[i] && sl[i] !== cur[i]) L.equipArt(st, sl[i]);
};

// ---------- 获得 ----------
// 来源（SYSTEMS §2）：寻宝与历练掉具体的一门（L.rollArt）；宗门宝库各宗独有（L.vaultArts）；首领首杀（L.bossArt）；
// 奇遇 fx.art；拍卖。重复获得 → 熟练 +20；仙、神阶的鸿蒙造化经、月星斗大法以三片残篇的形式来，集齐自动合成
L.artItemText = function (st, it) {
  if (!it || !it.art) return '';
  const A = ART[it.art], nm = `${L.artTierName(A.t)}${L.ART_CAT[A.k]}《${A.n}》`;
  if (it.frag && !it.fragDone) return `得到${nm}残篇（${it.frag}/3）`;
  if (it.dup) return `${nm}已会，熟练 +${it.mastery}`;
  if (it.equip) return `获得${nm}，已装上`;
  return `获得${nm}${it.better ? '（换上更强，去【人物】→功法）' : ''}`;
};
L.giveArt = function (st, id, opt) {
  const A = ART[id]; if (!A) return null;
  opt = opt || {};
  const a = st.arts;
  const it = { kind: 'a', art: id, tier: A.t, name: A.n, cat: A.k, src: opt.src || '' };
  if (A.pool === 'frag' && a.own[id] === undefined) {
    a.frag[id] = Math.min(3, (a.frag[id] || 0) + 1); it.frag = a.frag[id];
    if (a.frag[id] < 3) { L.log(st, `得到《${A.n}》残篇（${it.frag}/3）`, 'jade'); return it; }
    it.fragDone = true;
  }
  if (a.own[id] !== undefined) {
    it.dup = true; it.mastery = L.MAST.dup;
    L.addMastery(st, id, L.MAST.dup);
    L.log(st, `又得一部《${A.n}》，参照着练，熟练 +${L.MAST.dup}`);
    return it;
  }
  a.own[id] = 0; it.isNew = true;
  const i = SLOT_OF[A.k];
  if (!slotsOf(st)[i] && L.artSlotOpen(st, i)) { L.equipArt(st, id); it.equip = true; }
  else it.better = L.artRecommend ? !!L.artRecWhy(st, id) : L.artBetter(st, id);   // 掉落卡的【换上】：是平时的推荐才给（artrec.js）
  L.log(st, `获得${L.artTierName(A.t)}${L.ART_CAT[A.k]}《${A.n}》${it.fragDone ? '（三片残篇合一）' : ''}`, A.t >= 4 ? 'gold' : 'jade');
  emit('artNew', it);
  return it;
};
const MO = L.ARTL.filter(A => A.mo || A.pool === 'mo').map(A => A.id);
// 随机掉落：按阶从掉落池抽一门（没拥有的优先；地图同属性的权重 ×3）；ctx = { k, d, src }
L.rollArt = function (st, tier, ctx) {
  ctx = ctx || {};
  tier = clamp(Math.round(tier), 1, 6);
  const own = id => L.artOwned(st, id);
  // 第一次寻宝保底《引气诀》
  if (ctx.src === 'box' && !st.arts.firstBox) { st.arts.firstBox = 1; if (!own('x_yinqi')) return 'x_yinqi'; }
  const k = ctx.k;
  // 地图特产：血煞秘境掉魔道功法；天外星墟禁地掉星斗残篇；混沌裂隙掉鸿蒙残篇
  if (k === 4 && R() < 0.4) { const mo = MO.filter(id => ART[id].t <= tier + 1); const un = mo.filter(id => !own(id)); if (mo.length) return pick(un.length ? un : mo); }
  if (k === 8 && ctx.d === 2 && R() < 0.4 && !own('m_xingdou')) return 'm_xingdou';
  if (k === 10 && R() < 0.5 && !own('x_hongmeng')) return 'x_hongmeng';
  if (tier >= 6) { const fr = ['x_hongmeng', 'm_xingdou'].filter(id => !own(id)); return pick(fr.length ? fr : ['x_hongmeng', 'm_xingdou']); }
  let pool = L.ARTL.filter(A => A.pool === 'drop' && A.t === tier);
  for (let t = tier - 1; !pool.length && t >= 1; t--) pool = L.ARTL.filter(A => A.pool === 'drop' && A.t === t);
  const un = pool.filter(A => !own(A.id)), list = un.length ? un : pool;
  const rel = k !== undefined && L.REGIONS[k] ? L.REGIONS[k].el : '';
  return wpick(list.map(A => [A.id, rel && A.el === rel ? 3 : 1]));
};
// 心法里拥有的最高阶（寻宝保底与法宝比较用）
L.artBestTier = function (st, cat) { let t = 0; for (const id in st.arts.own) if (ART[id] && ART[id].k === (cat || 'x')) t = Math.max(t, ART[id].t); return t; };
// 寻宝保底 / 拍卖：给最落后的已开槽补一门“高一阶”的（掉落池里、没拥有、阶 ≤ cap）
L.artPity = function (st, cap) {
  let best = null;
  for (let i = 0; i < 3; i++) {
    if (!L.artSlotOpen(st, i)) continue;
    const k = L.ART_SLOTS[i], b = L.artBestTier(st, k);
    const cand = L.ARTL.filter(A => A.k === k && A.pool === 'drop' && A.t > b && A.t <= cap && !L.artOwned(st, A.id)).sort((x, y) => x.t - y.t)[0];
    if (cand && (!best || b < best.b)) best = { id: cand.id, b };
  }
  return best ? best.id : null;
};
// 首领首杀：按首领五行掉一门（阶 1 + 0.55k），没有合适的就不掉
L.bossArt = function (st, k) {
  const tmax = clamp(1 + Math.floor(k * 0.55), 1, 5), el = L.BOSS_EL[k];
  const cand = L.ARTL.filter(A => A.pool === 'drop' && A.t <= tmax && !L.artOwned(st, A.id));
  if (!cand.length) return null;
  const same = cand.filter(A => A.el === el), list = same.length ? same : cand;
  const top = Math.max(...list.map(A => A.t));
  return pick(list.filter(A => A.t === top)).id;
};
// 宗门宝库：各宗独有的功法（CONTENT §9，按身份开放；藏经阁每 2 级身份要求 −1）
L.vaultArts = st => (st.sect ? L.ARTL.filter(A => A.pool === 'vault' && A.sect === st.sect.id).sort((a, b) => a.rank - b.rank) : []);
L.vaultArtRank = (st, A) => Math.max(0, A.rank - Math.floor(((st.sect && st.sect.build && st.sect.build.lib) || 0) / 2));
L.vaultArtCost = (st, A) => (st.sect && st.sect.freePick > 0 ? 0 : Math.floor(40 * Math.pow(3.2, A.rank)));
L.vaultArtNext = st => L.vaultArts(st).find(A => !L.artOwned(st, A.id) && st.sect.rank >= L.vaultArtRank(st, A)) || null;
L.vaultBuyArt = function (st, id) {
  const A = ART[id];
  if (!st.sect || !A || A.pool !== 'vault' || A.sect !== st.sect.id || L.artOwned(st, id) || st.sect.rank < L.vaultArtRank(st, A)) return null;
  const c = L.vaultArtCost(st, A);
  if (st.sect.pts < c) return null;
  if (st.sect.freePick > 0) st.sect.freePick--; else st.sect.pts -= c;
  const it = L.giveArt(st, id, { src: 'vault' });
  L.checkQuests(st);
  return { k: 'vart', it };
};

// ---------- 分身术：闭关时分身去外围历练一趟（收益 50%，一气化三清 80%） ----------
L.fenshenTrip = function (st) {
  if (!L.artOn(st, 'm_fenshen')) return null;
  const share = Math.min(1, (L.comboOn(st, 'c6') ? 0.8 : 0.5) * L.artMm(st, 'm_fenshen'));
  let k = 0;
  for (let j = 0; j < L.REGIONS.length; j++) if (L.regionOpen(st, j)) k = j; else break;
  const f = L.expForecast(st, k, 0, 0);
  const em = f.dist.reduce((s, p, j) => s + p * L.RATE_M[j], 0);
  const res = { k, share, stones: Math.floor(f.stones * share), herbs: Math.floor((2 + k) * em * share) };
  st.stones += res.stones; st.herbs += res.herbs;
  L.log(st, `分身从【${L.REGIONS[k].n}·外围】回来：灵石 +${L.fmt(res.stones)}、灵草 +${res.herbs}`, 'jade');
  return res;
};

// ---------- 共鸣提示（藏经阁 / 奇遇） ----------
// 揭示一条还没发现、也没提示过的共鸣，提示写成“据说某两门木系功法同修有奇效”
L.comboHintText = function (id) {
  const c = COMBO[id], els = c.a.map(x => ART[x]);
  const cats = els.map(A => L.ART_CAT[A.k]);
  const el = els.every(A => A.el && A.el === els[0].el) ? L.elName(els[0].el) + '系' : '';
  return `据说某门${cats[0]}与某门${cats[1]}${el ? '（都是' + el + '）' : ''}同修有奇效${c.fireZ ? '，再配一门火系战技' : ''}`;
};
L.comboHint = function (st, id) {
  st.meta.chint = st.meta.chint || {};
  if (!id) { const left = L.COMBOS.filter(c => !st.meta.combo[c.id] && !st.meta.chint[c.id]); if (!left.length) return null; id = pick(left).id; }
  st.meta.chint[id] = 1;
  return id;
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md） ----------
// fx.art：一门或一组功法 id（残篇功法记一片）；fx.mastery：当前心法熟练 ±n（没装心法时作用于战技）
L.supportFx('art', { ok: v => asArr(v).length > 0 && asArr(v).every(id => !!ART[id]), apply: (st, v, out) => {
  for (const id of asArr(v)) { const it = L.giveArt(st, id, { src: 'event' }); if (!it) continue; const t = L.artItemText(st, it); out.push(t); (out.artTexts = out.artTexts || []).push(t); (out.items = out.items || []).push(it); if (!out.item) out.item = it; }
} });
L.supportFx('mastery', { ok: v => typeof v === 'number' && v !== 0, apply: (st, v, out) => {
  const sl = slotsOf(st), id = sl[0] || sl[1];
  if (!id) { out.push('（还没修功法，这番感悟无处安放）'); return; }
  L.addMastery(st, id, v);
  out.push(`《${ART[id].n}》熟练 ${v > 0 ? '+' : '−'}${Math.abs(v)}`);
} });
// 一次性钩子：combo_hint 揭示一条共鸣提示；combo_hint_c18 是潜渊的那条
L.supportFx('flag', { apply: (st, v, out) => {
  for (const f of asArr(v)) {
    if (f === 'combo_hint') { delete st.eflags.combo_hint; const id = L.comboHint(st); if (id) out.push('共鸣提示：' + L.comboHintText(id)); }
    if (f === 'combo_hint_c18' && !(st.meta.chint || {}).c18) { L.comboHint(st, 'c18'); out.push('共鸣提示：' + L.comboHintText('c18')); }
  }
} });
});
