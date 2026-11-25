/* 废柴仙途 · 逻辑模块 items：法宝、功法、灵宠的阶表与发放
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

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
// 灵宠的倍率（SYSTEMS §4 会把这个单值换成名册，届时只改这一行登记）。功法三槽见 arts.js；法宝三槽（兵器 / 法衣 / 饰品）见 gear.js
// L.ARTS 现在只是心法的阶倍率表（arts.js 按阶取 m）；L.WEAPONS 是兵器的阶倍率表（gear.js 按阶取 m）
// 灵宠：驭兽诀、万兽朝苍放大“超出 1 的部分”（L.petBoost）
L.addAtkMod('pet', 25, st => { const m = L.PETS[st.p.pet ? st.p.pet.tier : 0].m; return ['灵宠·' + (st.p.pet ? st.p.pet.name : '无'), 1 + (m - 1) * (L.petBoost ? L.petBoost(st) : 1), 'pet']; });

// ---------- 宝物 ----------
L.rollTier = rollTier;
function rollTier(st, base, max) {
  const lucky = L.has(st, 'lucky') ? 2 : L.has(st, 'hero') ? 1.4 : 1;
  let t = base;
  if (R() < 0.2 * lucky) t++;
  if (R() < 0.05 * lucky) t++;
  if (R() < 0.15) t--;
  return clamp(t, 1, max);
}
// 奇遇结果里的一句话（功法的写法见 arts.js 的 L.artItemText）
L.itemText = function (st, it) {
  if (it.kind === 'a') return L.artItemText(st, it);
  if (it.gear) return L.gearItemText(st, it);
  return (it.equip ? '获得' : '得到（已有更好的，换成灵石）') + L.PETS[it.tier].n + '【' + it.name + '】';
};
// kind：'a' 功法（按阶抽一门具体的，见 arts.js 的 L.rollArt；ctx = { k 地图, d 深度, src 来源 }）/ 'pet' 灵宠 /
//       法宝 'w' 兵器 | 'r' 法衣 | 'o' 饰品 | 'g' 按地图挑一槽 | 'need' 最弱的一槽（gear.js 的 L.gearGive：空槽直接装上，否则进对比卡）
L.giveItem = function (st, kind, tier, name, ctx) {
  const p = st.p;
  if (kind === 'a') return L.giveArt(st, L.rollArt(st, tier, ctx), ctx);
  if (kind === 'pet') {
    tier = clamp(tier, 1, L.PETS.length - 1);
    const T = L.PETS[tier];
    const it = { kind, tier, name: name || pick(T.names) };
    if (!p.pet || p.pet.tier < tier) { const first = !p.pet; p.pet = { tier, name: it.name }; it.equip = true; if (first) L.fireTrigger(st, 'pet'); }
    else { it.value = Math.floor(L.price(st, 'egg') * 0.3); st.stones += it.value; }
    return it;
  }
  return L.gearGive(st, kind, tier, ctx);
};
});
