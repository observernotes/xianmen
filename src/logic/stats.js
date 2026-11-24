/* 废柴仙途 · 逻辑模块 stats：修炼、战力、收入的倍率汇总与数值拆解
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

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
});
