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
// 功法、法宝、灵宠的倍率（SYSTEMS §2～§4 会把这三个单值换成槽位/名册，届时只改这三行登记）
L.addCulMod('art', 20, st => ['功法·' + (st.p.a ? st.p.an : '基础吐纳'), L.ARTS[st.p.a].m, 'art']);
L.addAtkMod('weapon', 20, st => ['法宝·' + (st.p.w ? st.p.wn : '赤手空拳'), L.WEAPONS[st.p.w].m, 'weapon']);
L.addAtkMod('pet', 25, st => ['灵宠·' + (st.p.pet ? st.p.pet.name : '无'), L.PETS[st.p.pet ? st.p.pet.tier : 0].m, 'pet']);

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
});
