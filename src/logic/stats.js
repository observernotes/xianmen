/* 废柴仙途 · 逻辑模块 stats：修炼、战力、收入的倍率汇总与数值拆解
 * 模块写法见 src/logic.js 顶部说明。各系统的加成用 core.js 的 L.addCulMod / L.addAtkMod / L.addIncSrc … 登记到这里。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 本模块登记的通用项：灵根、天赋、轮回、机缘、增益、负伤、灵脉、锦鲤 ----------
L.addCulMod('talent', 10, st => { const TI = L.talentInfo(st); return ['灵根·' + TI.n, TI.cul, 'talent']; });
L.addAtkMod('talent', 10, st => { const TI = L.talentInfo(st); return ['灵根·' + TI.n, TI.atk, 'talent']; });
L.addCulMod('wise', 50, st => (L.has(st, 'wise') ? ['天赋·悟性超群', 1.3, ''] : null));
L.addAtkMod('sword', 50, st => (L.has(st, 'sword') ? ['天赋·先天剑骨', 1.5, ''] : null));
L.addCulMod('reb', 60, st => (L.rebCul(st) > 1 ? ['宿慧（轮回）', L.rebCul(st), ''] : null));
L.addAtkMod('reb', 60, st => (L.rebAtk(st) > 1 ? ['根骨（轮回）', L.rebAtk(st), ''] : null));
L.addCulMod('bonus', 70, st => (st.bonus && st.bonus.cul ? ['机缘加成', 1 + st.bonus.cul, ''] : null));
L.addAtkMod('bonus', 70, st => (st.bonus && st.bonus.atk ? ['机缘加成', 1 + st.bonus.atk, ''] : null));
L.addCulMod('buffs', 90, st => (st.buffs || []).filter(b => b.cul).map(b => ['丹药增益（剩' + b.left + '周天）', b.cul, '']));
L.addAtkMod('buffs', 90, st => (st.buffs || []).filter(b => b.atk).map(b => ['增益（剩' + b.left + '周天）', b.atk, '']));
L.addAtkMod('inj', 100, st => (st.p.inj > 0 ? ['负伤（剩' + st.p.inj + '周天）', L.injAtk(st), ''] : null));
L.addIncSrc('vein', 20, st => ['灵脉（' + L.REALMS[Math.min(st.p.r, 8)].n + '）', L.vein(st.p.r), '']);
L.addIncMul('koi', 50, st => (L.has(st, 'koi') ? ['天赋·锦鲤附体', 1.5, ''] : null));

// ---------- 状态倍率：打坐 ×1；闭关 ×m（见 cultivation.js）；历练中 ×0.5（太虚引气诀 ×0.7）；负伤 ×0.5；心法转修 ×0.5 ----------
L.statusParts = function (st) {
  const a = [];
  if (st.exp) a.push(['历练途中', L.expCulMult(st), '']);
  const sw = L.artSwapLeft(st);
  if (sw > 0) a.push(['心法转修（剩' + sw + '周天）', L.SWAP.m, 'art']);
  if (st.retreat) a.push([L.retName(st.retreat) + '（剩' + st.retreat.left + '周天）', st.retreat.m, '']);
  if (st.p.inj > 0) a.push(['负伤（剩' + st.p.inj + '周天）', 0.5, '']);
  return a;
};
L.statusMult = st => L.modProd(L.statusParts(st));
L.culParts = st => L.modParts('cul', st);
L.atkParts = st => L.modParts('atk', st);
L.baseCul = st => L.g0(Math.min(L.si(st.p), 35));
L.baseAtk = st => P.pw0 * Math.pow(P.pwStage, L.si(st.p)) * Math.pow(P.pwRealm, st.p.r);
// 修炼倍率之积（不含状态）。sim 和界面里说的“修炼 ×N”就是它
L.culMult = st => L.modProd(L.culParts(st));
L.atkMult = st => L.modProd(L.atkParts(st));
// 不含“状态”的修炼速度（吐纳、顿悟、培元丹、战斗感悟按它结算，负伤另算）
L.gainBase = st => L.baseCul(st) * L.culMult(st);
L.gain = st => L.gainBase(st) * L.statusMult(st);
// 负伤时的吐纳/顿悟也减半（但不受闭关、历练的状态影响）
L.gainCalm = st => L.gainBase(st) * (st.p.inj > 0 ? 0.5 : 1);
L.power = st => L.baseAtk(st) * L.atkMult(st);
// 对决用的战力：在 L.power 上再乘对决专属的项（五行克制等，foe = { kind, el, … }）
L.duelParts = (st, foe) => L.modParts('duel', st, foe || {});
L.duelPower = (st, foe) => L.power(st) * L.modProd(L.duelParts(st, foe));
L.incParts = function (st) {
  const m = L.modProd(L.modParts('incMul', st));
  return L.modParts('inc', st).map(x => [x[0], x[1] * m, x[2]]);
};
L.income = st => L.modSum(L.incParts(st));
// 升到下一小层（或圆满）还要几个周天，按当前速度
L.ticksToNext = st => { const g = L.gain(st); return g > 0 ? Math.max(0, Math.ceil((L.pNeed(st.p) - st.p.xp) / g)) : Infinity; };
// 照现在的速度（不算闭关、历练），升到 si 还要几个周天
L.ticksToStage = function (st, si) {
  const p = st.p, g = L.gainCalm(st);
  if (!(g > 0)) return Infinity;
  let need = L.pNeed(p) - p.xp;
  for (let i = L.si(p) + 1; i < si && i <= 35; i++) need += L.need(i);
  return Math.max(0, Math.ceil(need / g));
};
// 数值拆解：给“变强”面板展示每一项数值从哪来（与 gain / power / income 用的是同一份登记）
L.breakdown = function (st) {
  const cul = L.culParts(st).concat(L.statusParts(st));
  return { baseCul: L.baseCul(st), cul, gain: L.gain(st), baseAtk: L.baseAtk(st), atk: L.atkParts(st), power: L.power(st), inc: L.incParts(st), income: L.income(st) };
};
});
