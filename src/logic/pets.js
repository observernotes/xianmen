/* 废柴仙途 · 逻辑模块 pets：灵宠名册、出战、洞府岗位、等级与兽粮、分支进化与觉醒、好感（docs/SYSTEMS.md §4，CONTENT §4、§14.5）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   st.pets = [{ u 编号, sp 种, form 0 初始 / 1 分支 A / 2 分支 B, lv 1～10, xp, heart 0～5, hp 好感进度 0～1, job '' | 守田 field | 看炉 furnace | 护阵 array | 觅食 forage | 巡山 patrol,
 *               aw 觉醒, idle 连续闲着的周天, deep { 地图: 出战时去过几趟禁地 } }]
 *   st.petOut = 出战那只的序号（−1 = 没有）；st.feed 兽粮；st.petPend 名册满时等你【放生 / 替换】的新灵宠；st.petFocus 触发剧情事件的那只（编号）
 *   st.meta.petEvo { 'p_hu_a': 1 … } 试出来的进化分支（跨世保留，未试过的分支在进化卡上写“？”）；st.meta.petSeen 见过的种
 *
 *   名册上限：筑基 1、金丹 2、元婴 3、合体 4（炼气时奇遇给的那一只也算 1）。出战 1 只：倍率与天赋生效；其余每只占一个岗位（一岗一只，类型对口 ×1.5）。
 *   倍率：1 + (L.PETS[阶].m − 1) × (1 + 5% × (级 − 1)) × (1 + 2% × 心) × 驭兽诀；阶 = 种的初阶 + 进化 1 + 觉醒 1（上限 6）。
 *   每级要兽粮 6 × 1.5^级 × 阶；出战的每趟历练另得一级的 10%。5 级二选一分支进化（条件满足卡片发光），10 级觉醒（天赋 ×1.5、阶 +1、光环）。
 *   好感：出战每 36 周天一心、在岗每 72 周天一心、喂食、事件；连续 24 周天既不出战也没岗位 −1 心；0 心再闲 24 周天叼碗出走（pet_runaway），
 *         事件用过以后再闲 24 周天就真的走了；5 心不会走，并能“挡劫”：天劫的护劫手段 +10%，挡完休养 12 周天（L.petCanShield / L.petShield，trib.js 调；休养期间出战倍率、岗位、天赋都不算）。
 *   兽粮：斩妖历练（1 + 地图）× 评价倍率、觅食岗位 0.5/周天、坊市轮换货“兽粮一袋”、宗门宝库、奇遇、放生。
 *   药引（SYSTEMS §5，crops.js 的 st.mats.yin）：进化条件里的药引付真的药引；觅食偶尔叼回一枚。守田加灵田作物产量（crops.js 的 L.cropParts）与灵稻的灵石；看炉加成丹率。
 *
 * 接入点（本模块加载时包一层，别的模块不用改）：items 的 L.giveItem / L.itemText 的灵宠分支在 items.js 里转到这里；
 *   L.resolveExp（出战经验、斩妖兽粮、禁地趟数、青羽雀）、L.craft（下品丹 → pet_sick）、L.eligible / L.choiceShown（灵宠事件的前提、进化分支的条件）、
 *   L.spawnVisitor（巡山）、L.ageRate、L.alchRate、L.retBaseMult、L.choiceLuck、L.leapMult、L.expLen、L.gearDingSave、L.gearInjCut、L.expStoneMult、
 *   L.lifespan、L.affKnown、L.elemKnown、L.expElem、L.duelElem、L.gearAffN、L.addAff、L.addMastery、L.gearSmeltOre、L.toxDecay、L.vaultCost / L.vaultBuy（天赋与岗位）。
 *   tick.js 每周天调 L.petTick；save.js 调 L.migratePets（没有 st.pets 时把旧的 st.p.pet 折成名册，可重复调用）；market.js 的灵兽蛋与“兽粮一袋”调 L.petEgg / L.feedSack。
 *   L.PETS_ON = false（sim 的 nopets）：只剩种的初阶倍率，没有等级、进化、好感、岗位与天赋，量 SYSTEMS §18 的预算。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const rr = st => Math.min(st.p.r, 8);
const ON = () => L.PETS_ON !== false;

// ---------- 类型、天赋、种（CONTENT §4） ----------
L.PET_TY = { zhan: '战', hu: '护', ling: '灵', xun: '寻' };
// 天赋：k 'mul' 倍率（觉醒与好感放大超出 1 的部分）/ 'add' 加数 / 'flag' 有无；job：只在干这个岗位时生效（其余只在出战时生效）
L.PET_TAL = {
  forage2: { k: 'mul', v: 2, job: 'forage', d: v => `觅食岗位兽粮 ×${r2(v)}` },
  alchUp: { k: 'add', v: 0.06, job: 'furnace', d: v => `看炉成丹率再 +${pc(v)}` },
  ret: { k: 'add', v: 0.2, d: v => `闭关倍率 +${r2(v)}` },
  luck: { k: 'add', v: 0.03, d: v => `奇遇把握 +${pc(v)}` },
  realmUnk: { k: 'add', v: 0.04, d: () => '秘境“？”门少一半' },   // realm.js 的 L.mjUnkP 读（有就减半）
  leap: { k: 'mul', v: 1.2, d: v => `越级奖励 +${pc(v - 1)}` },
  herbx: { k: 'add', v: 0.1, d: v => `历练 ${pc(v)} 多带一份灵草` },
  explen: { k: 'flag', v: 1, d: () => '历练时长 −1 周天（最少 2）' },
  visitAff: { k: 'add', v: 1, d: v => `人物好感每次多 +${Math.round(v)}` },
  dingSave: { k: 'add', v: 0.3, d: v => `丁等 ${pc(v)} 改判丙等` },
  robe: { k: 'add', v: 0.3, d: v => `法衣效果 +${pc(v)}（历练分数）` },
  smelt: { k: 'mul', v: 1.5, d: v => `熔炼灵矿 +${pc(v - 1)}` },
  age: { k: 'add', v: 0.04, d: v => `寿元流逝 −${pc(v)}` },
  tribGuard: { k: 'add', v: 0.05, d: v => `挡劫不必 5 心，挡劫再 +${pc(v)}（天劫的护劫手段）` },
  injCut2: { k: 'add', v: 2, d: v => `负伤周天 −${Math.round(v)}` },
  slay4: { k: 'add', v: 4, d: v => `斩妖历练分数 +${r2(v)}` },
  boss: { k: 'mul', v: 1.1, d: v => `对首领战力 ×${r2(v)}` },
  duelP2: { k: 'add', v: 0.02, d: v => `对决胜算 +${pc(v)}` },
  expStone: { k: 'mul', v: 1.08, d: v => `历练灵石 +${pc(v - 1)}` },
  drain: { k: 'mul', v: 1.05, d: v => `交手先咬一口：对决战力 ×${r2(v)}` },
  winterLuck: { k: 'add', v: 0.08, d: v => `冬季奇遇把握 +${pc(v)}` },
  zhanMast: { k: 'mul', v: 1.2, d: v => `战技熟练 +${pc(v - 1)}` },
  duelP3: { k: 'add', v: 0.03, d: v => `先手：对决胜算 +${pc(v)}` },
  affixW: { k: 'mul', v: 1.3, d: v => `兵器词条效果 ×${r2(v)}` },
  cul4: { k: 'mul', v: 1.04, d: v => `修炼 +${pc(v - 1)}` },
  toxin: { k: 'add', v: 1, d: v => `丹毒每周天多退 ${Math.round(v)}` },
  life5: { k: 'mul', v: 1.05, d: v => `寿元 +${pc(v - 1)}` },
  waterMap: { k: 'add', v: 8, d: v => `水属性地图历练分数 +${r2(v)}` },
  atk11: { k: 'mul', v: 1.1, d: v => `出战战力倍率再 ×${r2(v)}` },
  noKe: { k: 'flag', v: 1, d: () => '被克惩罚无效（历练与对决）' },
  summer: { k: 'mul', v: 1.1, d: v => `夏季修炼 +${pc(v - 1)}` },
  allSeason: { k: 'mul', v: 1.06, d: v => `季节加成全年对你生效一半（折算：修炼 +${pc(v - 1)}）` },
  baoqi: { k: 'mul', v: 1.5, d: v => `战力增益（爆气、机缘）效果 ×${r2(v)}` },
  reveal: { k: 'flag', v: 1, d: () => '未知的相性、地图属性直接显示' },
  jinang: { k: 'add', v: 0.03, d: v => `锦囊必含最优解（折算：对决胜算 +${pc(v)}）` },
  demon: { k: 'add', v: 0.05, d: v => `心魔劫那一境界（元婴 / 化神 / 合体前）突破成功率 +${pc(v)}` },
  qilin: { k: 'mul', v: 1.05, d: v => `祥瑞：修炼、灵石收入各 +${pc(v - 1)}` },
};
function pc(v) { const x = Math.round(v * 1000) / 10; return (x % 1 ? x.toFixed(1) : x) + '%'; }
function r2(v) { return String(Math.round(v * 100) / 100); }
// 分支条件：yin 药引（折灵草）/ ore 灵矿（筐）/ mat 首领材料（序号）/ deep 出战时去过这张图的禁地 3 趟 / heart 心 / season 季节；hint 未试过时的线索
// t 初阶；ty 类型；maps 历练偶遇的地图；egg 能从这种属性的灵兽蛋里孵出（rare 稀有）
L.PET_SP = {
  p_tu: { t: 1, ty: 'xun', el: 'mu', tal: 'forage2', egg: 1,
    a: { c: { yin: { wood: 2 } }, tal: 'alchUp', hint: '它总往丹炉边凑，嗅那股木香' }, b: { c: { season: 'winter' }, tal: 'ret', hint: '一下雪就格外精神' } },
  p_hu: { t: 1, ty: 'ling', el: 'shui', tal: 'luck', egg: 1,
    a: { c: { yin: { ice: 2 } }, tal: 'realmUnk', hint: '对着寒气直打喷嚏' }, b: { c: { yin: { fire: 2 } }, tal: 'leap', hint: '盯着炉火看个不停' } },
  p_que: { t: 1, ty: 'xun', el: 'mu', tal: 'herbx', egg: 1,
    a: { c: { yin: { thunder: 2 } }, tal: 'explen', hint: '雷雨天偏要站在最高处' }, b: { c: { yin: { wood: 2 } }, tal: 'visitAff', hint: '爱在青藤间穿来穿去' } },
  p_xiong: { t: 2, ty: 'hu', el: 'jin', tal: 'dingSave', egg: 1,
    a: { c: { deep: 1 }, tal: 'robe', hint: '老念着黑风岭深处的风' }, b: { c: { ore: 30 }, tal: 'smelt', hint: '嚼过一块灵矿就停不下嘴' } },
  p_gui: { t: 2, ty: 'hu', el: 'tu', tal: 'age', egg: 1,
    a: { c: { yin: { soul: 1 } }, tal: 'tribGuard', hint: '夜里冲着古墓的方向发呆' }, b: { c: { yin: { ice: 2 } }, tal: 'injCut2', hint: '喜欢泡在冷水里' } },
  p_hu2: { t: 2, ty: 'zhan', el: 'huo', tal: 'slay4', egg: 1,
    a: { c: { yin: { fire: 3 } }, tal: 'boss', hint: '火气一天比一天大' }, b: { c: { yin: { thunder: 2 } }, tal: 'duelP2', hint: '一打雷毛就竖起来' } },
  p_fu: { t: 2, ty: 'xun', el: 'huo', tal: 'expStone', egg: 1,
    a: { c: { deep: 4 }, tal: 'drain', hint: '闻到血腥味就兴奋' }, b: { c: { heart: 5 }, tal: 'winterLuck', hint: '只肯让最亲的人抱' } },
  p_sun: { t: 3, ty: 'zhan', el: 'jin', tal: 'zhanMast', egg: 1,
    a: { c: { yin: { thunder: 3 } }, tal: 'duelP3', hint: '雷云一来就冲天而起' }, b: { c: { deep: 5 }, tal: 'affixW', hint: '围着剑冢的残剑打转' } },
  p_he: { t: 3, ty: 'ling', el: 'shui', tal: 'cul4', egg: 1,
    a: { c: { yin: { ice: 3 } }, tal: 'toxin', hint: '单脚立在冰水里不肯走' }, b: { c: { yin: { wood: 3 } }, tal: 'life5', hint: '总往松林里飞' } },
  p_jiao: { t: 4, ty: 'zhan', el: 'shui', tal: 'waterMap', egg: 1, rare: 1,
    a: { c: { yin: { thunder: 4 }, mat: 7 }, tal: 'atk11', hint: '头顶的小包噼啪冒电，像在找一片龙鳞' }, b: { c: { yin: { ice: 4 } }, tal: 'noKe', hint: '游过的地方一片冰凉' } },
  p_wu: { t: 4, ty: 'ling', el: 'huo', tal: 'summer',
    a: { c: { yin: { fire: 5 } }, tal: 'allSeason', hint: '越烤越旺' }, b: { c: { mat: 8 }, tal: 'baoqi', hint: '衔着一颗星核舍不得咽' } },
  p_ze: { t: 5, ty: 'ling', el: 'tu', tal: 'reveal',
    a: { c: { heart: 5 }, tal: 'jinang', hint: '你说话时它听得格外认真' }, b: { c: { yin: { soul: 3 } }, tal: 'demon', hint: '伏在地上，像在听地底的声音' } },
  p_qilin: { t: 6, ty: 'ling', el: '', tal: 'qilin' },
};
L.PET_IDS = Object.keys(L.PET_SP);
// 历练偶遇（采药最容易）：每张图的种（CONTENT §1 的“可遇灵宠”；龙宫的碧波龟按墓穴玄龟算）
L.PET_MAP = [['p_tu', 'p_hu'], ['p_xiong'], ['p_gui'], ['p_hu2', 'p_que'], ['p_fu'], ['p_sun'], ['p_he'], ['p_jiao', 'p_gui'], ['p_wu'], ['p_ze'], ['p_qilin']];
const SPN = { p_tu: ['月牙兔', '捣药玉兔', '广寒兔'], p_hu: ['雪团灵狐', '霜月狐', '赤尾狐'], p_que: ['青羽雀', '雷翼隼', '青鸾'], p_xiong: ['铁背熊', '金刚熊', '玄铁熊'], p_gui: ['墓穴玄龟', '负碑灵龟', '玄武幼龟'],
  p_hu2: ['赤焰虎', '炎虎王', '雷纹虎'], p_fu: ['血瞳蝠', '噬魂蝠王', '夜明蝠'], p_sun: ['雷翼隼', '裂空隼', '剑羽隼'], p_he: ['冰羽鹤', '玄冰仙鹤', '松鹤'], p_jiao: ['玄水蛟', '应龙', '冰螭'],
  p_wu: ['金乌雏', '三足金乌', '大日金乌'], p_ze: ['白泽幼兽', '白泽', '谛听'], p_qilin: ['麒麟幼崽'] };
L.petFormName = (sp, form) => { const a = SPN[sp] || ['灵宠']; return a[Math.min(a.length - 1, form || 0)]; };
L.PET_EL_N = { mu: '木', shui: '水', jin: '金', huo: '火', tu: '土', '': '无' };
L.PET_EGG_ELS = ['mu', 'shui', 'jin', 'huo', 'tu'];
const hasBranch = sp => !!L.PET_SP[sp].a;

// ---------- 岗位（一岗一只；类型对口 ×1.5；每级 +4%、每心 +2%） ----------
L.PET_JOBS = [
  { k: 'array', n: '护阵', ty: 'hu', icon: 'job_array', v: 0.05, need: st => st.home.array >= 1, lock: '先升聚灵阵', d: v => `修炼 +${pc(v)}` },
  { k: 'forage', n: '觅食', ty: 'xun', icon: 'job_forage', v: 0.5, need: () => true, d: v => `兽粮 +${r2(v)}/周天，偶尔叼回灵矿或药引` },
  { k: 'field', n: '守田', ty: 'xun', icon: 'job_field', v: 0.15, need: st => st.home.field >= 1, lock: '先开灵田', d: v => `灵田作物产量与灵稻灵石 +${pc(v)}` },
  { k: 'furnace', n: '看炉', ty: 'ling', icon: 'job_furnace', v: 0.06, need: st => st.home.furnace >= 1, lock: '先建丹炉', d: v => `成丹率 +${pc(v)}` },
  { k: 'patrol', n: '巡山', ty: 'zhan', icon: 'job_patrol', v: 0.5, need: () => true, d: v => `坏访客、盗贼 −${pc(Math.min(0.9, v))}` },
];
const JOB = {}; for (const J of L.PET_JOBS) JOB[J.k] = J;
L.PET_JOB = JOB;
L.PET_N = { lvMax: 10, evoLv: 5, step: 0.05, jobStep: 0.04, heart: 0.02, match: 1.5, tripXp: 0.1, outHeart: 36, jobHeart: 72, idle: 24, leave: 24, feedHeart: 0.05,
  forageFind: 0.03, slayFeed: 1, sackBase: 20, sackR: 10, fight: 0.25, sick: 0.3 };

// ---------- 名册与阶 ----------
L.petCap = st => (mr(st) >= 6 ? 4 : mr(st) >= 3 ? 3 : mr(st) >= 2 ? 2 : 1);
L.petCount = st => (st.pets ? st.pets.length : 0);
L.petOut = st => (st.pets && st.petOut >= 0 ? st.pets[st.petOut] || null : null);
L.petJobsOpen = st => st.rebirth > 0 || mr(st) >= 2 || L.petCount(st) >= 2;
L.petTier = p => (ON() ? clamp(L.PET_SP[p.sp].t + (p.form > 0 ? 1 : 0) + (p.aw ? 1 : 0), 1, 6) : L.PET_SP[p.sp].t);
L.petName = p => L.petFormName(p.sp, p.form);
L.petTalId = p => { const S = L.PET_SP[p.sp]; return p.form === 1 && S.a ? S.a.tal : p.form === 2 && S.b ? S.b.tal : S.tal; };
L.petNeed = p => Math.round(6 * Math.pow(1.5, p.lv) * L.petTier(p));
L.petMaxLv = p => (hasBranch(p.sp) && !p.form ? L.PET_N.evoLv : L.PET_N.lvMax);
const heartK = p => (ON() ? 1 + L.PET_N.heart * (p.heart || 0) : 1);
const lvK = (p, step) => (ON() ? 1 + step * (p.lv - 1) : 1);
// 出战倍率（不在这里乘应龙；见 L.petAtkOf）
L.petAtkOf = function (st, p) {
  if (!p || L.petResting(st, p)) return 1;
  const m = L.PETS[L.petTier(p)].m, boost = L.petBoost ? L.petBoost(st) : 1;
  const v = 1 + (m - 1) * lvK(p, L.PET_N.step) * heartK(p) * boost;
  const yl = ON() && L.petTalId(p) === 'atk11' ? talScale(L.PET_TAL.atk11, p) : 1;
  return v * yl;
};
// 种的初阶、1 级、0 心时的倍率（sim 量“等级进化”的份额）
L.petBaseAtkOf = (st, p) => (p ? 1 + (L.PETS[L.PET_SP[p.sp].t].m - 1) * (L.petBoost ? L.petBoost(st) : 1) : 1);
// 岗位效果的倍数：类型对口 ×1.5，每级 +4%，每心 +2%
L.petJobK = (p, k) => (ON() ? (L.PET_SP[p.sp].ty === JOB[k].ty ? L.PET_N.match : 1) * lvK(p, L.PET_N.jobStep) * heartK(p) : 0);
L.petJobMatch = (p, k) => L.PET_SP[p.sp].ty === JOB[k].ty;
L.petJobV = (p, k) => JOB[k].v * L.petJobK(p, k);
// 某岗位现在的效果值（没人干为 0）
function jobV(st, k) {
  if (!ON() || !st.pets) return 0;
  const p = st.pets.find(x => x.job === k);
  if (!p || L.petResting(st, p) || !JOB[k].need(st)) return 0;
  let v = L.petJobV(p, k);
  if (k === 'forage') v *= tv1(st, 'forage2');
  if (k === 'patrol') v = Math.min(0.9, v);
  return v;
}
L.petJobVal = jobV;
L.petJobHolder = (st, k) => (st.pets || []).find(x => x.job === k) || null;
// 天赋：出战那只的（岗位天赋看干那个岗的），觉醒 ×1.5、每心 +2%（放大超出部分）
function talScale(T, p) {
  const k = (p.aw ? 1.5 : 1) * heartK(p);
  return T.k === 'mul' ? 1 + (T.v - 1) * k : T.k === 'add' ? T.v * k : 1;
}
L.petTalVal = (p, id) => talScale(L.PET_TAL[id || L.petTalId(p)], p);
function tv(st, id) {
  if (!ON() || !st.pets || !st.pets.length) return 0;
  const T = L.PET_TAL[id];
  for (let i = 0; i < st.pets.length; i++) {
    const p = st.pets[i];
    if (L.petTalId(p) !== id || L.petResting(st, p)) continue;
    if (T.job ? p.job === T.job : i === st.petOut) return talScale(T, p);
  }
  return 0;
}
const tv1 = (st, id) => tv(st, id) || 1;   // 'mul' 型：没有时 ×1
L.petTal = tv;
L.petTalText = p => { const id = L.petTalId(p); return L.PET_TAL[id].d(talScale(L.PET_TAL[id], p)); };

// ---------- 新档、迁移 ----------
L.newPets = () => ({ pets: [], petOut: -1, feed: 0, petPend: [], petU: 0 });
function ensure(st) {
  if (!Array.isArray(st.pets)) st.pets = [];
  if (typeof st.petOut !== 'number') st.petOut = -1;
  if (typeof st.feed !== 'number' || !isFinite(st.feed)) st.feed = 0;
  if (!Array.isArray(st.petPend)) st.petPend = [];
  if (typeof st.petU !== 'number') st.petU = st.pets.reduce((a, p) => Math.max(a, p.u || 0), 0);
  if (st.meta) { st.meta.petEvo = st.meta.petEvo || {}; st.meta.petSeen = st.meta.petSeen || {}; }
  curSt = st;
  return st;
}
let curSt = null;   // 最近一次用到的存档（L.gearSmeltOre 不带 st，玄铁熊的“熔炼 +50%”从这里读）
function newPet(st, sp, src) {
  st.petU = (st.petU || 0) + 1;
  return { u: st.petU, sp, form: 0, lv: 1, xp: 0, heart: 1, hp: 0, job: '', aw: 0, idle: 0, deep: {}, at: st.tick || 0, src: src || '' };
}
// 旧档：st.p.pet = { tier, name } → 同阶的基础种（名字对得上的优先），1 级，2 心，出战（SYSTEMS §18 第 10 条）。已有 st.pets 时只补字段
const OLD_NAME = { '雪团灵狐': 'p_hu', '月牙兔': 'p_tu', '青羽雀': 'p_que', '赤焰虎': 'p_hu2', '火鬃狮': 'p_hu2', '铁背熊': 'p_xiong', '冰羽鹤': 'p_he', '雷翼隼': 'p_sun' };
L.migratePets = function (s) {
  const had = Array.isArray(s.pets);
  ensure(s);
  let note = '';
  const old = s.p && s.p.pet;
  if (!had && old && old.tier > 0) {
    const tier = clamp(Math.floor(old.tier) || 1, 1, 6);
    const byName = OLD_NAME[old.name], sp = byName && L.PET_SP[byName].t === tier ? byName : L.PET_IDS.find(id => L.PET_SP[id].t === tier) || 'p_tu';
    const p = newPet(s, sp, 'old'); p.heart = 2;
    s.pets.push(p); s.petOut = 0;
    s.flags = s.flags || {}; s.flags.petFirst = 1;
    if (s.meta) s.meta.petSeen[sp] = 1;
    note = `旧灵宠【${old.name || L.PETS[tier].n}】折成同阶的${L.petFormName(sp, 0)}（${L.PET_SP[sp].t} 阶），1 级，出战`;
  }
  for (const p of s.pets) {
    if (!L.PET_SP[p.sp]) p.sp = 'p_tu';
    p.form = clamp(p.form | 0, 0, hasBranch(p.sp) ? 2 : 0); p.lv = clamp(p.lv | 0 || 1, 1, 10); p.xp = Math.max(0, +p.xp || 0);
    p.heart = clamp(p.heart | 0, 0, 5); p.hp = clamp(+p.hp || 0, 0, 0.999); p.job = JOB[p.job] ? p.job : ''; p.aw = p.aw ? 1 : 0; p.idle = Math.max(0, p.idle | 0); p.deep = p.deep && typeof p.deep === 'object' ? p.deep : {};
    if (!p.u) { s.petU++; p.u = s.petU; }
  }
  if (s.petOut >= s.pets.length) s.petOut = s.pets.length ? 0 : -1;
  if (s.petOut >= 0 && s.pets[s.petOut]) s.pets[s.petOut].job = '';
  if (s.p) delete s.p.pet;
  return note;
};

// ---------- 获得 ----------
L.petEggCap = (st, up) => clamp(2 + Math.floor(rr(st) * 0.4) + (up || 0), 2, 5);
// 灵兽蛋按属性：同属性里初阶不超过上限的种，阶越高越容易（稀有的减半）
L.petEggPool = function (st, el, up) {
  const cap = L.petEggCap(st, up);
  let ids = L.PET_IDS.filter(id => L.PET_SP[id].egg && (!el || L.PET_SP[id].el === el));
  if (!ids.length) ids = L.PET_IDS.filter(id => L.PET_SP[id].egg);
  const ok = ids.filter(id => L.PET_SP[id].t <= cap);
  const use = ok.length ? ok : [ids.reduce((a, b) => (L.PET_SP[a].t <= L.PET_SP[b].t ? a : b))];
  return use.map(id => [id, L.PET_SP[id].t * (L.PET_SP[id].rare ? 0.5 : 1)]);
};
// 坊市这一届的蛋是什么属性：每届论道轮一种
L.eggEl = st => L.PET_EGG_ELS[(Math.floor((st.tick || 0) / 12) + 2) % 5];
L.eggName = (st, el) => `灵兽蛋（${L.PET_EL_N[el || L.eggEl(st)]}）`;
L.eggDesc = (st, el) => { const pool = L.petEggPool(st, el || L.eggEl(st)); return `孵出：${pool.map(x => L.petFormName(x[0], 0)).join(' / ')}（名册 ${L.petCount(st)}/${L.petCap(st)}）`; };
L.petEgg = function (st, el, src, up) {
  const sp = wpick(L.petEggPool(st, el || L.eggEl(st), up));
  const it = L.petGive(st, { sp, src: src || 'shop', egg: el || L.eggEl(st) });
  L.fireTrigger(st, 'egg');
  return it;
};
function rollByTier(st, tier) {
  const ids = L.PET_IDS.filter(id => L.PET_SP[id].egg);
  const ok = ids.filter(id => L.PET_SP[id].t <= tier);
  return wpick((ok.length ? ok : ['p_tu', 'p_hu', 'p_que']).map(id => [id, L.PET_SP[id].t]));
}
// o = { sp 指定种 | k 地图（历练偶遇）| tier 阶（奇遇、旧写法），src }
L.petGive = function (st, o) {
  ensure(st);
  o = o || {};
  let sp = o.sp;
  if (!sp && o.k !== undefined && L.PET_MAP[o.k]) sp = pick(L.PET_MAP[o.k]);
  if (!sp) sp = rollByTier(st, clamp(o.tier || 1, 1, 6));
  const p = newPet(st, sp, o.src);
  st.meta.petSeen[sp] = 1;
  const it = { kind: 'pet', sp, form: 0, tier: L.petTier(p), name: L.petName(p), el: L.PET_SP[sp].el, u: p.u, src: o.src, egg: o.egg };
  if (st.pets.length < L.petCap(st)) {
    st.pets.push(p); it.equip = true;
    if (st.petOut < 0) { st.petOut = st.pets.length - 1; it.out = true; }
    else if (L.petJobsOpen(st)) { const k = L.petBestJob(st, p); if (k) { p.job = k; it.job = k; } }
    st.petFocus = p.u;
    if (!st.flags.petFirst) { st.flags.petFirst = 1; it.first = true; L.fireTrigger(st, 'pet'); }
    L.log(st, `收服灵宠【${it.name}】（${L.PET_SP[sp].t} 阶${L.PET_TY[L.PET_SP[sp].ty]}）${it.out ? '，出战' : it.job ? '，派去' + JOB[it.job].n : ''}`, 'jade');
  } else {
    st.petPend.push(Object.assign(p, { pendAt: st.tick || 0 }));
    it.pend = true;
    L.log(st, `遇到灵宠【${it.name}】，名册已满（${st.pets.length}/${L.petCap(st)}）：放生或替换`);
  }
  emit('pet', it);
  L.checkQuests(st);
  return it;
};
L.petItemText = function (st, it) {
  if (it.pend) return `${it.name}想跟你走，名册已满：【放生】得兽粮或【替换】一只`;
  return `收服灵宠【${it.name}】（${it.tier} 阶）${it.out ? '，出战' : it.job ? '，派去' + JOB[it.job].n : ''}`;
};
L.petByU = (st, u) => (st.pets || []).find(p => p.u === u) || null;
L.petIdx = (st, u) => (st.pets || []).findIndex(p => p.u === u);

// ---------- 放生 / 替换 ----------
L.petReleaseFeed = p => Math.round(5 * L.petTier(p) * p.lv);
function removeAt(st, i) {
  const p = st.pets[i];
  st.pets.splice(i, 1);
  if (st.petOut === i) st.petOut = -1; else if (st.petOut > i) st.petOut--;
  return p;
}
L.petRelease = function (st, i) {
  ensure(st);
  const p = st.pets[i]; if (!p) return null;
  removeAt(st, i);
  const f = L.petReleaseFeed(p); st.feed += f;
  if (st.petOut < 0 && st.pets.length) L.petSetOut(st, L.petBest(st));
  L.log(st, `放生了【${L.petName(p)}】，它留下一窝兽粮 ${f}`);
  return { p, feed: f };
};
// 名册满时的新灵宠：j 是 st.petPend 的序号；i 为空 → 放生，否则替换名册第 i 只（被替换的那只放生）
L.petPendDecide = function (st, j, i) {
  ensure(st);
  const p = st.petPend[j]; if (!p) return null;
  st.petPend.splice(j, 1); delete p.pendAt;
  if (i === undefined || i === null || i < 0 || !st.pets[i]) { const f = L.petReleaseFeed(p); st.feed += f; L.log(st, `放【${L.petName(p)}】归山，得兽粮 ${f}`); return { released: p, feed: f }; }
  const old = st.pets[i], wasOut = st.petOut === i, job = old.job;
  const f = L.petReleaseFeed(old); st.feed += f;
  st.pets[i] = p; p.job = wasOut ? '' : job;
  st.petFocus = p.u;
  L.log(st, `【${L.petName(p)}】替下了【${L.petName(old)}】（放生得兽粮 ${f}）`, 'jade');
  L.checkQuests(st);
  return { replaced: old, feed: f, p };
};
// 没决定的超过 12 周天自己走了（放生）
const PEND_TTL = 12;

// ---------- 出战与岗位 ----------
L.petSetOut = function (st, i) {
  ensure(st);
  const p = st.pets[i]; if (!p || i === st.petOut) return false;
  const prev = L.petOut(st), job = p.job;
  p.job = '';
  st.petOut = i;
  if (prev && job && L.petJobsOpen(st)) prev.job = job;   // 换下来的接它原来的岗
  return true;
};
L.petJobWhy = function (st, i, k) {
  if (!L.petJobsOpen(st)) return '金丹后开放';
  if (!JOB[k]) return '没有这个岗位';
  if (!JOB[k].need(st)) return JOB[k].lock || '';
  return '';
};
// k = '' 收回来闲着
L.petSetJob = function (st, i, k) {
  ensure(st);
  const p = st.pets[i]; if (!p) return false;
  if (k && L.petJobWhy(st, i, k)) return false;
  if (k) { const h = st.pets.find(x => x !== p && x.job === k); if (h) h.job = p.job || ''; }
  if (i === st.petOut) st.petOut = -1;
  p.job = k || '';
  p.idle = 0;
  return true;
};
// 这只最该干的空岗（推荐）：对口的优先，按“值多少”排
L.JOB_W = { array: 3, forage: 2, field: 1.2, furnace: 1, patrol: 0.6 };
L.petBestJob = function (st, p, any) {
  let best = null, bv = -1;
  for (const J of L.PET_JOBS) {
    if (!J.need(st)) continue;
    const h = (st.pets || []).find(x => x !== p && x.job === J.k);
    if (h && !any) continue;
    const v = L.JOB_W[J.k] * L.petJobK(p, J.k);
    if (v > bv) { bv = v; best = J.k; }
  }
  return best;
};
// 名册里出战最强的一只
L.petBest = st => { let b = -1, bv = 0; (st.pets || []).forEach((p, i) => { const v = L.petAtkOf(st, p); if (v > bv) { bv = v; b = i; } }); return b; };

// ---------- 等级、喂食 ----------
function addHeart(st, p, v) {
  if (!ON()) return;
  if (v >= 1 || v <= -1) { p.heart = clamp(p.heart + Math.trunc(v), 0, 5); return; }
  p.hp = (p.hp || 0) + v;
  while (p.hp >= 1) { p.hp -= 1; if (p.heart < 5) { p.heart++; if (st) L.log(st, `【${L.petName(p)}】和你更亲了：${p.heart} 心`, 'jade'); } }
  if (p.heart >= 5) p.hp = 0;
}
L.petAddHeart = addHeart;
// 加经验：5 级没进化、10 级封顶时经验停在满格
function addPetXp(st, p, v) {
  if (!ON() || !(v > 0)) return 0;
  let ups = 0;
  p.xp += v;
  while (p.lv < L.petMaxLv(p) && p.xp >= L.petNeed(p)) {
    p.xp -= L.petNeed(p); p.lv++; ups++;
    if (p.lv === L.PET_N.evoLv && hasBranch(p.sp) && !p.form) { st.petFocus = p.u; L.fireTrigger(st, 'pet_evolve:' + p.sp); }
  }
  if (p.lv >= L.petMaxLv(p)) p.xp = Math.min(p.xp, p.lv >= L.PET_N.lvMax ? 0 : L.petNeed(p));
  if (ups) { L.log(st, `【${L.petName(p)}】升到 ${p.lv} 级`, 'jade'); emit('petUp', { p, ups }); }
  return ups;
}
L.petAddXp = addPetXp;
L.petFeedEff = st => 1 + (st.flags && st.flags.penExtra ? 0.08 : 0);
// 一口：约一级的 1/6（至少 1）；到顶了（5 级待进化 / 10 级）就喂不进去
L.petFeedWhy = function (st, i) {
  const p = (st.pets || [])[i]; if (!p) return '没有这只';
  if (!ON()) return '';
  if (p.lv >= L.PET_N.lvMax) return '已满级';
  if (p.lv >= L.petMaxLv(p)) return '先进化';
  if ((st.feed || 0) < 1) return '没有兽粮';
  return '';
};
L.petPortion = (st, p) => Math.max(1, Math.min(Math.floor(st.feed || 0), Math.ceil(L.petNeed(p) / 6), Math.ceil((L.petNeed(p) - p.xp) / L.petFeedEff(st))));
L.petFeed = function (st, i) {
  ensure(st);
  if (L.petFeedWhy(st, i)) return null;
  const p = st.pets[i], n = L.petPortion(st, p);
  const lv0 = p.lv, pw0 = L.power(st), v0 = L.petAtkOf(st, p);
  st.feed -= n;
  addHeart(st, p, L.PET_N.feedHeart);
  const ups = addPetXp(st, p, n * L.petFeedEff(st));
  st.stats.petFeed = (st.stats.petFeed || 0) + n;
  return { n, lv0, lv1: p.lv, ups, pw0, pw1: L.power(st), m0: v0, m1: L.petAtkOf(st, p) };
};

// ---------- 进化（5 级二选一）与觉醒（10 级） ----------
const SEASON_N = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
// 一个分支的条件：每项 { t 文字, ok, cost 是否要花 }
L.petBranchNeeds = function (st, p, b) {
  const S = L.PET_SP[p.sp], B = S[b === 1 ? 'a' : 'b'], c = B.c, out = [];
  if (c.yin) for (const y in c.yin) out.push({ t: `喂${L.YIN_N[y]} ×${c.yin[y]}`, ok: L.yinHave(st, y) >= c.yin[y], cost: 1, have: L.yinHave(st, y), need: c.yin[y] });
  if (c.ore) { const n = c.ore * L.oreUnit(st); out.push({ t: `喂灵矿 ${L.fmt(n)}`, ok: (st.ore || 0) >= n, cost: 1, have: st.ore || 0, need: n }); }
  if (c.mat !== undefined) out.push({ t: `${L.BOSS_MAT[c.mat]} ×1（${L.BOSSES[c.mat].n}掉落）`, ok: ((st.gear && st.gear.mats[c.mat]) || 0) >= 1, cost: 1, have: (st.gear && st.gear.mats[c.mat]) || 0, need: 1 });
  if (c.deep !== undefined) out.push({ t: `带它去${L.REGIONS[c.deep].n}禁地 3 趟（出战时）`, ok: (p.deep[c.deep] || 0) >= 3, have: p.deep[c.deep] || 0, need: 3 });
  if (c.heart) out.push({ t: `好感 ${c.heart} 心`, ok: p.heart >= c.heart, have: p.heart, need: c.heart });
  if (c.season) out.push({ t: `${SEASON_N[c.season]}季进化`, ok: L.seasonKey(st) === c.season });
  return out;
};
L.petBranchOk = (st, p, b) => L.petBranchNeeds(st, p, b).every(x => x.ok);
// 非花费的条件（事件里的分支选项靠它决定显不显示；药引、灵矿写在事件的 cost 里）
const branchFree = (st, p, b) => L.petBranchNeeds(st, p, b).filter(x => !x.cost || /×1（/.test(x.t)).every(x => x.ok);
L.petEvoKey = (sp, b) => sp + (b === 1 ? '_a' : '_b');
L.petEvoKnown = (st, sp, b) => !!(st.meta && st.meta.petEvo && st.meta.petEvo[L.petEvoKey(sp, b)]);
// 可进化：5 级、没进化、有分支；可觉醒：10 级、进化过（或没分支）、没觉醒
L.petCanEvo = p => ON() && hasBranch(p.sp) && !p.form && p.lv >= L.PET_N.evoLv;
L.petCanAwake = p => ON() && !p.aw && p.lv >= L.PET_N.lvMax && (p.form > 0 || !hasBranch(p.sp));
// 卡片发光：能觉醒，或能进化且至少一支条件满足
L.petGlow = (st, p) => L.petCanAwake(p) || (L.petCanEvo(p) && (L.petBranchOk(st, p, 1) || L.petBranchOk(st, p, 2)));
L.petGlowAny = st => (st.pets || []).some(p => L.petGlow(st, p));
function payBranch(st, p, b, only) {
  const c = L.PET_SP[p.sp][b === 1 ? 'a' : 'b'].c;
  if (!only && c.yin) L.yinPay(st, c.yin);
  if (!only && c.ore) st.ore -= c.ore * L.oreUnit(st);
  if (c.mat !== undefined && st.gear) st.gear.mats[c.mat] = Math.max(0, (st.gear.mats[c.mat] || 0) - 1);
}
function doEvolve(st, p, b) {
  const pw0 = L.power(st), m0 = L.petAtkOf(st, p), t0 = L.petTier(p), n0 = L.petName(p);
  p.form = b;
  const key = L.petEvoKey(p.sp, b), fresh = !st.meta.petEvo[key];
  st.meta.petEvo[key] = 1;
  st.stats.petEvo = (st.stats.petEvo || 0) + 1;
  L.log(st, `【${n0}】进化成【${L.petName(p)}】！${fresh ? '（新发现，记入图鉴）' : ''}`, 'gold');
  emit('petEvo', { p, b });
  L.checkQuests(st);
  return { p, b, fresh, from: n0, to: L.petName(p), t0, t1: L.petTier(p), m0, m1: L.petAtkOf(st, p), pw0, pw1: L.power(st), tal: L.petTalText(p) };
}
L.petEvolveWhy = function (st, i, b) {
  const p = (st.pets || [])[i]; if (!p) return '没有这只';
  if (!L.petCanEvo(p)) return p.form ? '已进化' : `${L.PET_N.evoLv} 级可进化`;
  const miss = L.petBranchNeeds(st, p, b).filter(x => !x.ok);
  return miss.length ? '还差：' + miss.map(x => x.t).join('、') : '';
};
L.petEvolve = function (st, i, b) {
  ensure(st);
  if (L.petEvolveWhy(st, i, b)) return null;
  const p = st.pets[i];
  payBranch(st, p, b);
  return doEvolve(st, p, b);
};
L.petAwake = function (st, i) {
  ensure(st);
  const p = st.pets[i]; if (!p || !L.petCanAwake(p)) return null;
  const pw0 = L.power(st), m0 = L.petAtkOf(st, p), t0 = L.petTier(p), tal0 = L.petTalText(p);
  p.aw = 1;
  st.stats.petAwake = (st.stats.petAwake || 0) + 1;
  L.log(st, `【${L.petName(p)}】觉醒：天赋增强，品阶 +1`, 'gold');
  L.checkQuests(st);
  return { p, aw: true, t0, t1: L.petTier(p), m0, m1: L.petAtkOf(st, p), pw0, pw1: L.power(st), tal0, tal: L.petTalText(p) };
};
// 试一下（界面算“前 → 后”）：fn 在改动期间调用，结束后复原
L.petTry = function (st, mut, fn) {
  const snap = JSON.stringify({ pets: st.pets, out: st.petOut });
  try { mut(); return fn(); } finally { const o = JSON.parse(snap); o.pets.forEach((p, i) => Object.assign(st.pets[i] || (st.pets[i] = {}), p)); st.pets.length = o.pets.length; st.petOut = o.out; }
};

// ---------- 每周天 ----------
L.petTick = function (st, out) {
  ensure(st);
  if (!st.pets.length && !st.petPend.length) return;
  const N = L.PET_N;
  for (let i = st.pets.length - 1; i >= 0; i--) {
    const p = st.pets[i];
    if (i === st.petOut) { p.idle = 0; p.z = 0; addHeart(st, p, 1 / N.outHeart); continue; }
    if (p.job && JOB[p.job].need(st)) { p.idle = 0; p.z = 0; addHeart(st, p, 1 / N.jobHeart); continue; }
    if (!ON()) continue;
    p.idle++;
    if (p.heart >= 5) continue;
    if (p.heart > 0) { p.z = 0; if (p.idle % N.idle === 0) { p.heart--; L.log(st, `【${L.petName(p)}】闲了 ${p.idle} 个周天，好感 −1（${p.heart} 心）：派个岗或带它出战`, 'red'); } continue; }
    // 0 心还闲着：再过 24 周天叼着碗站到门口（pet_runaway，每世一次），事件用过以后再闲 24 周天就真走了
    p.z = (p.z || 0) + 1;
    if (p.z === N.leave && !st.evDone.pet_runaway && !st.storyQ.includes('pet_runaway')) { st.petFocus = p.u; L.fireTrigger(st, 'pet_runaway'); }
    else if (p.z >= N.leave * 2) { removeAt(st, i); L.log(st, `【${L.petName(p)}】叼着食碗走了，再没回来`, 'red'); if (out) out.petLeft = p; }
  }
  // 觅食：兽粮，偶尔叼回一筐灵矿或一枚药引（折灵草）
  const fv = jobV(st, 'forage');
  if (fv > 0) {
    st.feed += fv;
    if (R() < N.forageFind * L.petJobK(L.petJobHolder(st, 'forage'), 'forage')) {
      const fp = L.petJobHolder(st, 'forage');
      if (R() < 0.5) { const n = L.addOre(st, L.oreUnit(st)); L.log(st, `觅食的【${L.petName(fp)}】叼回一块灵矿：+${n}`); }
      else { const y = pick(L.YIN_KEYS); L.addYin(st, y, 1); L.log(st, `觅食的【${L.petName(fp)}】叼回一枚${L.YIN_N[y]}`); }
    }
  }
  // 名册 ≥ 2：两只争窝（pet_fight，每届论道后 25%）
  if (st.pets.length >= 2 && st.tick % 12 === 6 && !st.evDone.pet_fight && R() < N.fight) { st.petFocus = st.pets.reduce((a, b) => (b.u > a.u ? b : a)).u; L.fireTrigger(st, 'pet_fight'); }
  // 名册满时没决定的新灵宠：12 周天后自己走（放生）
  for (let j = st.petPend.length - 1; j >= 0; j--) if (st.tick - (st.petPend[j].pendAt || 0) >= PEND_TTL) L.petPendDecide(st, j);
  if (st.petOut < 0 && st.pets.length && !L.petJobsOpen(st)) st.petOut = 0;
};

// ---------- 历练：出战经验、斩妖兽粮、禁地趟数、青羽雀的多一份灵草 ----------
const resolveExp0 = L.resolveExp;
L.resolveExp = function (st) {
  const e = st.exp;
  const res = resolveExp0(st);
  if (!res || !e || res.legacy || !st.pets) return res;
  ensure(st);
  const p = L.petOut(st);
  if (!res.recall && st.pets.length) {
    if (e.a === 0) { const f = Math.round((L.PET_N.slayFeed + e.k) * (res.m || 0)); if (f > 0) { st.feed += f; res.feed = f; } }
    if (p) {
      const lv0 = p.lv;
      if (L.petMaxLv(p) > p.lv) addPetXp(st, p, L.PET_N.tripXp * L.petNeed(p));
      addHeart(st, p, 0.05);
      if (e.d === 2) p.deep[e.k] = (p.deep[e.k] || 0) + 1;
      res.pet = { name: L.petName(p), lv0, lv1: p.lv, deep: e.d === 2 ? p.deep[e.k] : 0 };
      const hx = tv(st, 'herbx');
      if (hx && res.herbs > 0 && R() < hx) { st.herbs += res.herbs; res.petHerbs = res.herbs; }
      res.pw1 = L.power(st);
    }
  }
  return res;
};

// ---------- 剧情触发：下品丹 → pet_sick ----------
const craft0 = L.craft;
L.craft = function (st, k, opt) {
  const res = craft0(st, k, opt);
  if (res && res.ok && res.q === 0 && L.petOut(st) && !st.evDone.pet_sick && R() < L.PET_N.sick) { st.petFocus = L.petOut(st).u; L.fireTrigger(st, 'pet_sick'); }
  return res;
};

// ---------- 倍率登记 ----------
L.addAtkMod('pet', 25, st => {
  const p = L.petOut(st);
  if (!p) return ['灵宠·' + (L.petCount(st) ? '没有出战的' : '无'), 1, 'pet'];
  return [`灵宠·${L.petName(p)} Lv${p.lv}${p.aw ? '·觉醒' : ''}`, L.petAtkOf(st, p), 'pet'];
});
// 大日金乌：战力增益（丹药、机缘的 atk 增益）超出部分 ×1.5
L.addAtkMod('petBuff', 91, st => {
  const v = tv(st, 'baoqi'); if (!v) return null;
  let m = 1; for (const b of st.buffs || []) if (b.atk) m *= 1 + (b.atk - 1) * (v - 1);
  return m > 1 ? ['灵宠·大日金乌（增益加持）', m, 'pet'] : null;
});
L.addCulMod('petArray', 31, st => { const v = jobV(st, 'array'); return v ? [`灵宠护阵·${L.petName(L.petJobHolder(st, 'array'))}`, 1 + v, 'petjob'] : null; });
L.addCulMod('petTal', 81, st => {
  const a = [];
  const c4 = tv(st, 'cul4'); if (c4) a.push(['灵宠·' + L.petName(L.petOut(st)), c4, 'pet']);
  const su = tv(st, 'summer'); if (su && L.seasonKey(st) === 'summer') a.push(['灵宠·金乌雏（夏）', su, 'pet']);
  const al = tv(st, 'allSeason'); if (al) a.push(['灵宠·三足金乌（四季）', al, 'pet']);
  const ql = tv(st, 'qilin'); if (ql) a.push(['灵宠·麒麟（祥瑞）', ql, 'pet']);
  return a.length ? a : null;
});
// 守田：灵稻的灵石 +v（只算种灵稻的几块，crops.js 的 L.fieldStoneInc）；别的作物的产量 +v 在 crops.js 的 L.cropParts
L.addIncSrc('petField', 11, st => { const v = jobV(st, 'field'); return v && st.home.field && L.riceCount(st) ? [`灵宠守田·${L.petName(L.petJobHolder(st, 'field'))}`, L.fieldStoneInc(st) * v, 'petjob'] : null; });
L.addIncMul('petTal', 46, st => { const ql = tv(st, 'qilin'); return ql ? ['灵宠·麒麟（祥瑞）', ql, 'pet'] : null; });
L.addExpMod('pet', 18, (st, k, d, a) => {
  const out = [], p = L.petOut(st); if (!p) return null;
  const s4 = tv(st, 'slay4'); if (s4 && a === 0) out.push([`灵宠·${L.petName(p)}（斩妖）`, s4, 'pet']);
  const wm = tv(st, 'waterMap'); if (wm && L.REGIONS[k] && L.REGIONS[k].el === 'shui') out.push([`灵宠·${L.petName(p)}（水）`, wm, 'pet']);
  const rb = tv(st, 'robe'); if (rb && L.gearEq && L.gearEq(st, 'r')) out.push([`灵宠·金刚熊（法衣 +${pc(rb)}）`, L.gearOScore(st, L.gearEq(st, 'r')) * rb, 'pet']);
  return out.length ? out : null;
});
L.addDuelMod('pet', 16, (st, foe) => {
  const a = [];
  const b = tv(st, 'boss'); if (b && foe.kind === 'boss') a.push(['灵宠·炎虎王（首领）', b, 'pet']);
  const dr = tv(st, 'drain'); if (dr) a.push(['灵宠·噬魂蝠王', dr, 'pet']);
  return a.length ? a : null;
});
L.addDuelPMod('pet', 21, st => { const v = tv(st, 'duelP2') + tv(st, 'duelP3') + tv(st, 'jinang'); return v ? { add: v } : null; });
// 挡劫不在这里：天劫上线后是一样护劫手段（下面的 L.petCanShield / L.petShield，trib.js 的 L.aidInfo('pet')），不再折成常驻的突破加成
L.addBtMod('pet', 57, st => {
  const dm = tv(st, 'demon'); if (dm && L.DEMON_AT && L.DEMON_AT[st.p.r + 1]) return ['灵宠·谛听（心魔劫）', dm];
  return null;
});
// ---------- 天劫：灵宠挡劫（SYSTEMS §9）----------
// 5 心、没在休养的那只能挡一次天劫（+10%；负碑灵龟的“挡劫”天赋不必 5 心，再加天赋值）；出战的优先，其次心最多的。
// 挡完休养 12 周天：L.petAtkOf、岗位、天赋都跳过它（无效果）
L.petResting = (st, p) => !!p && (p.rest || 0) > st.tick;
function shieldPet(st) {
  if (!ON() || !st.pets || !st.pets.length || st.p.r < 1) return null;
  const ok = p => !L.petResting(st, p) && (p.heart >= 5 || L.petTalId(p) === 'tribGuard');
  const out = L.petOut(st); if (out && ok(out)) return out;
  return st.pets.filter(ok).sort((a, b) => b.heart - a.heart || b.lv - a.lv)[0] || null;
}
L.petCanShield = st => { const p = shieldPet(st); return p ? L.petName(p) : null; };
L.petShieldBonus = st => { const p = shieldPet(st); return p && L.petTalId(p) === 'tribGuard' ? L.petTalVal(p, 'tribGuard') : 0; };
L.petShield = function (st, n) {
  const p = shieldPet(st); if (!p) return null;
  p.rest = st.tick + n;
  L.log(st, `【${L.petName(p)}】替你挡下一道雷，休养 ${n} 个周天`, 'jade');
  return p;
};

// ---------- 天赋与岗位接进别的系统（包一层） ----------
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };
wrap('ageRate', b => st => b(st) * (1 - tv(st, 'age')));
wrap('alchRate', b => st => clamp(b(st) + jobV(st, 'furnace') + tv(st, 'alchUp'), 0.1, 0.97));
wrap('retBaseMult', b => st => b(st) + tv(st, 'ret'));
wrap('choiceLuck', b => st => b(st) + tv(st, 'luck') + (L.seasonKey(st) === 'winter' ? tv(st, 'winterLuck') : 0));
wrap('leapMult', b => st => b(st) * tv1(st, 'leap'));
wrap('expLen', b => (k, st) => { const n = b(k, st); return st && tv(st, 'explen') ? Math.max(2, Math.min(n, n - 1)) : n; });
wrap('gearDingSave', b => st => { const a = b(st), v = Math.min(0.9, tv(st, 'dingSave')); return 1 - (1 - a) * (1 - v); });
wrap('gearInjCut', b => st => b(st) + Math.round(tv(st, 'injCut2')));
wrap('toxDecay', b => st => b(st) + tv(st, 'toxin'));
wrap('expStoneMult', b => (st, a) => b(st, a) * tv1(st, 'expStone'));
wrap('lifespan', b => st => { const y = b(st); return isFinite(y) ? y * tv1(st, 'life5') : y; });
wrap('affKnown', b => (st, k, a) => b(st, k, a) || !!tv(st, 'reveal'));
wrap('elemKnown', b => (st, k) => b(st, k) || !!tv(st, 'reveal'));
wrap('expElem', b => (st, k, sl) => { const e = b(st, k, sl); return e.v < 0 && tv(st, 'noKe') ? Object.assign({}, e, { v: 0, chi: true }) : e; });
wrap('duelElem', b => (st, foe, sl) => { const e = b(st, foe, sl); return e.m < 1 && tv(st, 'noKe') ? Object.assign({}, e, { m: 1, chi: true }) : e; });
wrap('gearAffN', b => (st, id) => {
  const n = b(st, id); if (!n) return n;
  const v = tv(st, 'affixW'); if (!v) return n;
  const w = st.gear && L.gearEq(st, 'w'); const k = w ? w.aff.filter(a => a === id).length : 0;
  return k ? n + k * (v - 1) : n;
});
wrap('addAff', b => (st, id, d) => b(st, id, d > 0 ? d + Math.round(tv(st, 'visitAff')) : d));
wrap('addMastery', b => (st, id, n) => { const z = st.arts && st.arts.slot && st.arts.slot[1]; return b(st, id, z && id === z && n > 0 ? n * tv1(st, 'zhanMast') : n); });
wrap('gearSmeltOre', b => x => { const v = b(x); return curSt ? v * tv1(curSt, 'smelt') : v; });
// 巡山：坏访客、盗贼来的时候，巡山的灵宠按概率把人轰走（换一位来）
L.PET_BAD = ['re_bandit', 'home_challenger', 'sect_spy', 'world_lingchao', 'bai_1', 'sect_merchant_war'];
L.petBadVisitor = ev => !!ev && (L.PET_BAD.includes(ev.id) || /贼|劫|盗|踢馆|细作|勒索/.test(ev.title || ''));
wrap('spawnVisitor', b => st => {
  const ev = b(st);
  const v = jobV(st, 'patrol');
  if (!ev || !v || !L.petBadVisitor(ev) || R() >= v) return ev;
  const p = L.petJobHolder(st, 'patrol');
  st.visitor = null; st.evLast[ev.id] = st.tick;
  st.stats.petPatrol = (st.stats.petPatrol || 0) + 1;
  L.log(st, `巡山的【${L.petName(p)}】把门口的不速之客（${L.fill(st, ev.title)}）轰下了山`, 'jade');
  return null;
});
// 灵宠事件的前提（数据里写不出来的，CONTENT §14.5 各事件的“触发条件”）
const usesPet = new WeakMap();
function evUsesPet(ev) {
  if (usesPet.has(ev)) return usesPet.get(ev);
  const s = JSON.stringify(ev.choices || []), v = /petHeart|petForm/.test(s);
  usesPet.set(ev, v); return v;
}
const focus = st => L.petByU(st, st.petFocus) || L.petOut(st) || (st.pets || [])[0] || null;
const PET_EV_REQ = {
  pet_gift: st => { const p = L.petOut(st); return !!p && p.heart >= 3; },
  pet_wild_friend: st => !!L.petOut(st) && !!st.exp && st.exp.a === 2,
  pet_guard: st => !!L.petJobHolder(st, 'patrol'),
  home_field_pest: st => st.home.field >= 3,
  pet_fight: st => L.petCount(st) >= 2,
  pet_sick: st => !!L.petOut(st),
};
wrap('eligible', b => (st, ev, where, ctx) => {
  if (!b(st, ev, where, ctx)) return false;
  if (evUsesPet(ev) && !L.petCount(st)) return false;
  const f = PET_EV_REQ[ev.id]; if (f && !f(st, ctx)) return false;
  if (ev.trigger && /^pet_evolve:/.test(ev.trigger)) { const p = focus(st); if (!p || 'pet_evolve:' + p.sp !== ev.trigger || !L.petCanEvo(p)) return false; }
  return true;
});
// 进化事件的分支选项：petForm 对应的分支有非花费的条件（禁地 3 趟、好感、季节、首领材料）没满足时不显示
const evoTarget = (st, sp) => { const f = focus(st); if (f && f.sp === sp && L.petCanEvo(f)) return f; return (st.pets || []).find(p => p.sp === sp && L.petCanEvo(p)) || null; };
const parseForm = v => { const m = /^(p_\w+?)_([ab])$/.exec(String(v)); return m && L.PET_SP[m[1]] && L.PET_SP[m[1]][m[2]] ? { sp: m[1], b: m[2] === 'a' ? 1 : 2 } : null; };
wrap('choiceShown', b => (st, c) => {
  if (!b(st, c)) return false;
  const pf = c && c.ok && c.ok.fx && c.ok.fx.petForm; if (!pf) return true;
  const f = parseForm(pf); if (!f) return false;
  const p = evoTarget(st, f.sp);
  return !!p && branchFree(st, p, f.b);
});

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：fx.pet / feed / petHeart / petForm / yin，cost.feed / yin，触发键 egg / pet_runaway / pet_fight / pet_sick / pet_evolve:* ----------
L.supportFx('feed', { ok: v => Number.isFinite(v) && v !== 0, apply: (st, v, out) => { ensure(st); st.feed = Math.max(0, st.feed + v); out.push('兽粮 ' + (v > 0 ? '+' : '') + v); } });
L.supportCost('feed', { ok: (st, v) => (st.feed || 0) >= v, pay: (st, v) => { st.feed = Math.max(0, (st.feed || 0) - v); }, text: (st, v) => '兽粮 ' + v });
L.supportFx('pet', { ok: v => !!L.PET_SP[v], apply: (st, v, out) => { const it = L.petGive(st, { sp: v, src: 'event' }); out.push(L.petItemText(st, it)); (out.items = out.items || []).push(it); if (!out.item) out.item = it; } });
L.supportFx('petHeart', { ok: v => Number.isInteger(v) && v !== 0 && Math.abs(v) <= 2, apply: (st, v, out, fx, ctx) => {
  const ev = ctx && ctx.ev;
  let p = focus(st);
  if (ev && ev.id === 'pet_guard') p = L.petJobHolder(st, 'patrol') || p;
  if (ev && ev.id === 'home_field_pest') p = L.petJobHolder(st, 'field') || L.petOut(st) || p;
  if (ev && ev.where !== 'story' && ev.id !== 'pet_guard' && ev.id !== 'home_field_pest') p = L.petOut(st) || p;
  if (!p) return;
  addHeart(st, p, v); out.push(`【${L.petName(p)}】好感 ${v > 0 ? '+' : ''}${v}（${p.heart} 心）`);
  // 争窝偏心新来的：老的那只 −1
  if (ev && ev.id === 'pet_fight' && v > 0) { const o = st.pets.filter(x => x !== p).reduce((a, x) => (!a || x.u < a.u ? x : a), null); if (o) { addHeart(st, o, -1); out.push(`【${L.petName(o)}】好感 −1（${o.heart} 心）`); } }
} });
L.supportFx('petForm', { ok: v => !!parseForm(v), apply: (st, v, out) => {
  const f = parseForm(v), p = evoTarget(st, f.sp);
  if (!p) { out.push('（它已经不在你身边了）'); return; }
  payBranch(st, p, f.b, true);   // 药引、灵矿已在选项的 cost 里付过；首领材料在这里扣
  const r = doEvolve(st, p, f.b);
  out.push(`【${r.from}】进化成【${r.to}】：${r.tal}`);
  out.petEvo = r;
} });
// fx.yin / cost.yin（药引）在 crops.js 登记
for (const t of ['egg', 'pet_runaway', 'pet_fight', 'pet_sick', 'pet_evolve:']) L.supportTrigger(t);
// 一次性钩子 flag：hatch_stone 当场孵出 / hatch_warm（心已 +1）/ hatch_field 埋进灵田（地气养过：直接 2 级）/ pet_release 放生 / pet_job_pick 派个岗 / pen_discount 兽栏扩建（喂养 +8%）
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of [].concat(v)) {
    if (!/^(hatch_stone|hatch_warm|hatch_field|pet_release|pet_job_pick|pen_discount)$/.test(f)) continue;
    delete st.eflags[f];
    const p = focus(st), i = p ? L.petIdx(st, p.u) : -1;
    if (f === 'hatch_field' && p && p.lv < 2) { addPetXp(st, p, L.petNeed(p)); out.push(`【${L.petName(p)}】地气养过：直接 ${p.lv} 级`); }
    if (f === 'pet_release' && i >= 0) { const r = L.petRelease(st, i); if (r) out.push(`放生【${L.petName(r.p)}】，兽粮 +${r.feed}`); }
    if (f === 'pet_job_pick' && i >= 0) { const k = L.petBestJob(st, p, true) || 'forage'; if (L.petJobsOpen(st)) { L.petSetJob(st, i, k); out.push(`【${L.petName(p)}】去${JOB[k].n}了`); } else { L.petSetOut(st, i); out.push(`【${L.petName(p)}】跟着你出战`); } }
    if (f === 'pen_discount') { st.flags.penExtra = 1; out.push('兽栏扩了一间：喂养效率 +8%'); }
  }
} });

// ---------- 兽粮一袋（坊市）、宗门御兽堂（宝库） ----------
L.feedSack = st => L.PET_N.sackBase + L.PET_N.sackR * rr(st);
L.VAULT.push({ k: 'vegg', n: '御兽堂灵兽蛋', d: '宗门御兽堂孵的蛋，品阶高一档' }, { k: 'vfeed', n: '御兽堂兽粮', d: '一大袋兽粮' });
wrap('vaultCost', b => (st, k) => (k === 'vegg' ? Math.floor(30 * Math.pow(2.3, st.p.r)) : k === 'vfeed' ? Math.floor(8 * Math.pow(2.3, st.p.r)) : b(st, k)));
wrap('vaultBuy', b => (st, k) => {
  if (k !== 'vegg' && k !== 'vfeed') return b(st, k);
  if (!st.sect) return null;
  const c = L.vaultCost(st, k);
  if (st.sect.pts < c) return null;
  st.sect.pts -= c;
  if (k === 'vfeed') { const n = 2 * L.feedSack(st); ensure(st); st.feed += n; return { k, feed: n }; }
  return { k, it: L.petEgg(st, pick(L.PET_EGG_ELS), 'vault', 1) };
});

// ---------- sim / 机器人用：自动安排（出战最强、空岗派人、能进化就进化、兽粮先喂出战的、名册满时更强才替换） ----------
L.petAuto = function (st, o) {
  ensure(st); o = o || {};
  while (st.petPend.length) {
    const p = st.petPend[0];
    let wi = -1, wv = L.petAtkOf(st, p) * 0.98;
    st.pets.forEach((x, i) => { const v = L.petAtkOf(st, x) + 0.05 * (x.lv - 1); if (v < wv) { wv = v; wi = i; } });
    L.petPendDecide(st, 0, wi >= 0 ? wi : undefined);
  }
  if (!st.pets.length) return;
  const b = L.petBest(st); if (b >= 0 && b !== st.petOut && L.petAtkOf(st, st.pets[b]) > L.petAtkOf(st, L.petOut(st)) * 1.001) L.petSetOut(st, b);
  if (st.petOut < 0) L.petSetOut(st, L.petBest(st));
  if (L.petJobsOpen(st)) st.pets.forEach((p, i) => { if (i !== st.petOut && !p.job) { const k = L.petBestJob(st, p); if (k) L.petSetJob(st, i, k); } });
  st.pets.forEach((p, i) => {
    if (L.petCanAwake(p)) L.petAwake(st, i);
    if (L.petCanEvo(p)) for (const br of [1, 2]) if (L.petBranchOk(st, p, br)) { L.petEvolve(st, i, br); break; }
  });
  if (o.feed !== false) {
    const order = st.pets.map((p, i) => i).sort((x, y) => (y === st.petOut) - (x === st.petOut));
    for (const i of order) for (let g = 0; g < 60 && !L.petFeedWhy(st, i); g++) L.petFeed(st, i);
  }
};
});
