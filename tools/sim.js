// 数值模拟：三种玩法各跑 200 个种子，输出汇总并对照 docs/DESIGN.md §3.12 的目标区间
//   node tools/sim.js                 三种策略 × 200 种子的汇总表
//   node tools/sim.js guided 50       只跑 guided，50 个种子
//   node tools/sim.js guided 1 v 7    种子 7 跑一局，每 12 周天打印一行状态
//   node tools/sim.js all 200 strict  任何一行未达标都返回退出码 1（默认只看三年之约公平这道门槛）
//   node tools/sim.js all 200 noarts  关掉功法系统的新加成（L.ARTS_ON = false：只剩心法的裸倍率），与默认对照量 SYSTEMS §18 的预算
//   node tools/sim.js all 200 nogear  关掉法宝系统的新东西（L.GEAR_ON = false：法衣、饰品、强化、词条都没有，只剩兵器的阶倍率）
//   node tools/sim.js all 200 nocal   关掉四季与天下大势（L.CAL_ON = false）
//   node tools/sim.js all 200 norealm 关掉秘境（L.MJ_ON = false），与默认对照量秘境这一刀的影响
//   node tools/sim.js all 200 nomarket guided 不卖行情、不去拍卖、不买轮换货（货架的常驻三格照用），量坊市这一刀对节奏的影响
//   node tools/sim.js all 200 nodaoji  渡劫评价不给道基（L.DAOJI_ON = false），量道基对节奏的影响
//   node tools/sim.js all 200 nopets  关掉灵宠的新东西（L.PETS_ON = false：只剩种的初阶倍率，没有等级、进化、好感、岗位、天赋）
//   node tools/sim.js all 200 nohome2 回到洞府地块之前（L.HOME2_ON = false：只有聚灵阵、灵田、丹炉、洞府四项，闭关按洞府等级、器炉借丹炉、阵法只有聚灵）
//   node tools/sim.js all 200 nosect2 guided 不送礼、不收徒、不领职司、宝库照旧（人脉的晋升条件仍在），量宗门加深这一刀
//   node tools/sim.js all 200 nocrops 灵田只种灵稻（L.CROPS_ON = false：等价于作物制之前的被动灵石，没有灵草、灵谷、药引作物）
//   node tools/sim.js all 200 noalch  关掉药引丹方与丹毒（L.ALCH_ON = false：只剩培元、破境、疗伤三种基础丹）
//   node tools/sim.js all 200 nochains 关掉奇遇链（L.CHAINS_ON = false：链事件一概不出，链的催促、补放剧情步都不做）
//   node tools/sim.js all 200 nocodex  图鉴照记，但“见多识广”与成组的加成都不给（L.CODEX_ON = false）
//   node tools/sim.js guided 50 life2  每个种子连玩两世：第一世结算道果 → 轮回殿照 L.HALL_ORDER 买 → 传承照 L.legacyAuto 带 → 默认出身（弃徒）、不选试炼投胎，
//                                      第二世照样玩；汇总第二世的飞升周天与第一世之比（DESIGN 阶段四验收：75%～90%）、道果、轮回殿买了什么
//                                      （加 wis1 只买宿慧一级，nohall 一样不买，nolegacy 不带传承）
//   node tools/sim.js all 200 norivals2 关掉宿敌与新秀这一刀（L.RIVALS2_ON = false：恩怨不驱动伏击 / 抬价 / 带头 / 化敌为友，没有新秀，宿敌不得奇遇、法宝不克你，guided 论道前不按克制换战技）
//   node tools/sim.js all 200 nopeople2 关掉人物加深（L.PEOPLE2_ON = false：不送礼、没有委托、同伴、双修，串门与同行事件不出，道侣照旧修炼 ×1.25）
// 策略：
//   guided 空闲就行动；快圆满时留在家；灵石按“聚灵阵 > 灵田 > 丹炉 > 洞府”的折算价升级；每两趟历练闭关一次；
//          突破带尽量多的丹（最多 3 枚）；金丹起的天劫护劫手段有就全用（祭法宝、道侣、灵宠、渡劫阵；停顿时临阵吞丹补到成功率封顶），
//          心魔劫选“还这么选”；地点选“预计评价 ≥ 乙”的最高一格；接宗门任务、吐纳、看访客；
//          功法：三槽按 L.artBest 取最优搭配（算上熟练、融会、共鸣），出门前换上克制当地的战技，约战、首领、会武前换上克制对手的
//          法宝：掉落卡“更好就换、否则熔炼”（L.gearAuto）；灵矿全花在强化上（兵器优先，按“每点灵矿换来多少”挑槽），器方材料够就打
//          灵宠（SYSTEMS §4）：名册没满、或出战那只的初阶低于蛋的上限时每届买一枚蛋；兽粮一袋买得起就买；L.petAuto：出战最强的、空岗派人、
//          条件满足就进化（留够两炉培元丹的灵草）、10 级觉醒、兽粮先喂出战的、名册满时更强才替换
//          灵田（SYSTEMS §6.2）：缺什么药引就种什么（灵宠进化、聚灵丹、洗髓丹、爆气丹、器方），最多占一半的田，同样缺的先种当季的；
//          田有三块以上、灵草不够炼两炉培元丹时留一块灵草；其余灵稻。只在刚收完的那块上改种（不糟蹋长到一半的）
//          炼丹（SYSTEMS §5）：没揭晓的药引格材料够就试炼；丹毒过 60 炼清毒丹；能炼就炼洗髓、淬体；丹毒不过 60 时聚灵丹常驻，
//          破境丹不足 3 枚补，灵草富余、丹毒不过 45 时培元；丹囊里留一枚疗伤丹、一枚爆气丹（胜算不到九成的约战、首领前服）
//          坊市（SYSTEMS §10）：货架上打折的破境丹、轮换的法衣 / 残篇 / 器方买得起就买，灵矿不够强化时买一筐；
//          药引一包：缺的那种（见下面的灵田）买得起三包就买；
//          行情：破境丹 ≥ 9 枚时卖一半（指数 ≥ 0.9，或 ≥ 11 枚时不看指数），灵草远多于炼丹所需、指数 ≥ 1.2 时卖一半，灵矿不卖（全拿去强化）；
//          拍卖：想要的拍品（法宝、功法、残篇、洗髓、器方，天材地宝不足 3 个时）按手里的钱出价，宿敌在场的先出、出到豪掷；
//          钱差一点时拍卖那几个周天不升洞府、攒着；坊市事件随手选一个付得起的选项
//          宗门（SYSTEMS §11）：宝库轮换里功法、更高阶法宝、器方阵图买得起就换；职司按宗门领；每届给支持最高的两位长老送礼；
//          任务板四类新任务照接（讲法要离圆满还远），炼器、驯兽东西富余才交；徒弟挑灵根最高的收，闭门苦修到顶再去当值，圆满功法教给他，金丹出师
//          宿敌与新秀（SYSTEMS §13）：论道前看本届第一场会碰上哪位宿敌（L.tourFoe），按胜算换上最好的战技（L.tourSwap：克他的五行、躲开他法宝克的那一系）；
//          新秀追到身后：先换上对他最好的战技，打压胜算 ≥ 45% 就【打压】，否则【指点】
//          人物（SYSTEMS §12）：人物来访时送一样礼（已知 ♥ 的、拿得出手的先送；没有就拿便宜的东西去试没试过的，讨厌的不送）；
//          委托：历练类能稳拿到要求的评价就去那一格，交付类东西够了就交（疗伤丹、爆气丹不够时多炼一炉），秘境类夏天先把他放进同伴位；
//          同伴位放四心里最有用的一位（楚狂 > 楚天阔（化敌为友后）> 夜 > 苏 > 葛老 > 墨无痕 > 白小九）；有道侣时每回该闭关就改成双修（不花灵石）
//   lazy   （SYSTEMS §18 第 6 条）会做访客和宗门任务；每届论道（12 周天）之前出门历练两趟，每次出门前只买一样东西；
//          不闭关、不吐纳、不碰新系统（不卖行情、不去拍卖、灵田照默认全种灵稻、不炼丹）；突破最多带 2 枚丹；功法、法宝只照掉落卡的默认点【换上】（更强才换），不凑共鸣、不换克制、不强化
//   idle   什么都不做，只在修为圆满时突破
// 被 require 时导出 { run, L }，可以在别的脚本里换策略或统计（tools/ 之外的分析脚本用）
const L = require('../src/logic.js');
const arg = process.argv.slice(2);
if (arg.includes('noarts')) L.ARTS_ON = false;
if (arg.includes('nogear')) L.GEAR_ON = false;
if (arg.includes('nocal')) L.CAL_ON = false;
if (arg.includes('norealm')) L.MJ_ON = false;
if (arg.includes('nodaoji')) L.DAOJI_ON = false;
if (arg.includes('nopets')) L.PETS_ON = false;
if (arg.includes('nocrops')) L.CROPS_ON = false;
if (arg.includes('noalch')) L.ALCH_ON = false;
if (arg.includes('nochains')) L.CHAINS_ON = false;
if (arg.includes('nocodex')) L.CODEX_ON = false;
const LIFE2 = arg.includes('life2');
if (arg.includes('nohome2')) L.HOME2_ON = false;
if (arg.includes('norivals2')) L.RIVALS2_ON = false;
const RIV2 = !arg.includes('norivals2');
if (arg.includes('nopeople2')) L.PEOPLE2_ON = false;
// noonb：关掉上手曲线（L.ONB_ON = false：各系统一到原门槛就开，回到 2.0.0 的节奏），与默认对照量 docs/ONBOARDING.md 这一刀的影响
if (arg.includes('noonb')) L.ONB_ON = false;
const MARKET_SIM = !arg.includes('nomarket');
// nosect2：guided 不送礼、不收徒、不领职司，宝库照旧的四样（量人脉、徒弟这一刀对节奏的影响）；人脉的晋升条件仍在
const SECT2 = !arg.includes('nosect2');
const only = ['guided', 'lazy', 'idle'].includes(arg[0]) ? arg[0] : null;
const N = Number(arg[1]) || 200;
const verbose = arg[2] === 'v';
const seed0 = Number(arg[3]) || 1;

// 秘术没有裸倍率：guided 给每门一个“值多少”（对数，约等于修炼 / 战力的百分比），L.artBest 用
const MVAL = { m_lianxi: 0.02, m_yufeng: 0.05, m_xunlong: 0.03, m_baicao: 0.02, m_tianyan: 0.01, m_yushou: 0.03, m_danhuo: 0.02, m_zhujian: 0.01, m_fenshen: 0.06, m_xuedun: 0.01, m_wangqing: 0.04, m_xingdou: 0.05 };
// guided：拥有的功法或熟练等级变了才重排三槽（全枚举较慢）
function artOpt(st) {
  const key = Object.keys(st.arts.own).map(id => id + L.artLv(st, id)).join() + [0, 1, 2].map(i => +L.artSlotOpen(st, i)).join('');
  if (st._artKey === key) return;
  st._artKey = key;
  L.artApply(st, L.artBest(st, { mval: MVAL }));
}
// 出门 / 对决前只换战技（免费、即时）
function artFor(st, o) { if (!L.artSlotOpen(st, 1)) return; L.artApply(st, L.artBest(st, Object.assign({ only: 1, mval: MVAL }, o))); st._artKey = null; }
// lazy：新到手的功法，掉落卡说“换上更强”就点【换上】
function artLazy(st) {
  const n = Object.keys(st.arts.own).length;
  if (st._artN === n) return;
  st._artN = n;
  for (const id of Object.keys(st.arts.own)) if (!st._artSeen || !st._artSeen[id]) { (st._artSeen = st._artSeen || {})[id] = 1; if (L.artBetter(st, id)) L.equipArt(st, id); }
}
// guided 的法宝：掉落卡更好就换；灵矿按“每点灵矿换来多少”挑槽强化（兵器的战力最值钱，折半算）；器方够材料就打
function gearGuided(st) {
  L.gearAutoAll(st);
  if (L.GEAR_ON === false) return;
  for (const P of L.PLANS) if (!L.canForge(st, P.id)) { const it = L.forge(st, P.id); if (it && it.pend) L.gearAuto(st, it.gear); }
  if (!L.gearOpen(st, 'plus')) return;
  for (let n = 0; n < 30; n++) {
    let best = null;
    for (const s of L.GEAR_SLOTS) {
      const x = L.gearEq(st, s); if (!x || L.gearPlusWhy(st, s)) continue;
      const c = L.gearPlusCost(st, x).ore * (s === 'w' ? 0.5 : 1) / Math.max(0.3, L.gearPlusRate(st, x));
      if (!best || c < best.c) best = { s, c };
    }
    if (!best) break;
    L.gearPlus(st, best.s);
  }
  // 重铸：兵器（非固定词条）没有锋锐时，花多余的天材地宝（留 3 个炼丹）重抽价值最低的一条，新的更好才留
  const wx = L.gearEq(st, 'w');
  if (wx && !L.gearBase(wx.id).fixed && st.treasure > 3 && !wx.aff.includes('fengrui') && wx.aff.length) {
    let worst = 0, wv = Infinity;
    wx.aff.forEach((a, i) => { wx.aff.splice(i, 1); const v = -L.gearValue(st); wx.aff.splice(i, 0, a); if (v < wv) { wv = v; worst = i; } });
    const v0 = L.gearValue(st), rf = L.gearReforge(st, 'w', worst);
    if (rf) { wx.aff[rf.i] = rf.neu; const v1 = L.gearValue(st); wx.aff[rf.i] = rf.old; L.gearReforgeKeep(st, v1 > v0 + 1e-9); }
  }
  // 灵矿不够强化兵器、灵石富余（≥ 一筐价的 4 倍）时，去坊市买一筐
  const w = L.gearEq(st, 'w');
  if (w && L.marketOpen(st, 'ore') && L.oreBuyLeft(st) > 0 && (st.ore || 0) < L.gearPlusCost(st, w).ore && st.stones >= L.price(st, 'ore') * 4) L.buy(st, 'ore');
}
// SYSTEMS §18 预算量：强化让战力多了多少（各槽强化清零对照）；词条的战力当量（家门地图斩妖时锋锐、克 X 给的分数，每 25 分折战力 ×2）
function gearShare(st) {
  const g = st.gear, p1 = L.power(st), saved = L.GEAR_SLOTS.map(s => g[s] && g[s].plus);
  L.GEAR_SLOTS.forEach(s => { if (g[s]) g[s].plus = 0; });
  const p0 = L.power(st);
  L.GEAR_SLOTS.forEach((s, i) => { if (g[s]) g[s].plus = saved[i]; });
  const parts = L.expExtraParts(st, L.homeRegion(st), 0, 0);
  const pts = parts.filter(x => /^词条/.test(x[0])).reduce((a, x) => a + x[1], 0);
  const robe = parts.filter(x => /^法衣/.test(x[0])).reduce((a, x) => a + x[1], 0);
  const cul = L.culParts(st).filter(x => x[2] === 'gear').reduce((a, x) => a * x[1], 1);
  return { plus: p1 / p0, aff: Math.pow(2, pts / 25), pts, robe, cul, wt: g.w ? g.w.t : 0, wp: g.w ? g.w.plus : 0, rp: g.r ? g.r.plus : 0, op: g.o ? g.o.plus : 0, n: L.gearEqList(st).length };
}
// SYSTEMS §18 预算量：出战灵宠的倍率、它“等级进化好感”的份额（÷ 同种初阶 1 级的倍率）、岗位给的修炼
function petShare(st) {
  const p = L.petOut(st), m = p ? L.petAtkOf(st, p) : 1, b = p ? L.petBaseAtkOf(st, p) : 1;
  const cul = L.culParts(st).filter(x => x[2] === 'petjob').reduce((a, x) => a * x[1], 1);
  return { m, share: m / b, cul, n: L.petCount(st), lv: p ? p.lv : 0, t: p ? L.petTier(p) : 0 };
}
// guided 的灵宠：蛋、兽粮、L.petAuto
function petGuided(st) {
  const cyc = Math.floor(st.tick / 12), out = L.petOut(st);
  const want = L.petCount(st) < L.petCap(st) || (out && L.PET_SP[out.sp].t < L.petEggCap(st) && st.stones >= L.price(st, 'egg') * 3);
  if (want && st._eggCyc !== cyc && L.marketOpen(st, 'egg') && st.stones >= L.price(st, 'egg') * 1.5) { st._eggCyc = cyc; L.buy(st, 'egg'); }
  if (L.petCount(st) && L.marketOpen(st, 'feed') && st.stones >= L.price(st, 'feed') * 4) L.buy(st, 'feed');
  L.petAuto(st);
}
// guided 的灵田：缺什么药引种什么（最多一半的田），灵草不够时留一块灵草，其余灵稻；只在刚收完（g = 0）的田上改种
// 要药引的地方按先后：洗髓丹（灵根）> 清毒丹（丹毒过 50）> 灵宠进化 > 聚灵丹 > 器方 > 淬体丹 > 爆气丹；返回还缺的 [{ y, d }]，排在前面的先种
function yinWants(st) {
  const need = {}, order = [], add = (o, k) => { for (const y in o) { need[y] = (need[y] || 0) + o[y] * (k || 1); if (!order.includes(y)) order.push(y); } };
  if (st.p.t < L.talentCap(st) && st.p.t < 6 && (st.home.furnace >= 8 || L.friend(st, 'ge'))) add({ thunder: 1, soul: 1 });
  if ((st.toxin || 0) > 50 && st.home.furnace >= 3) add({ ice: 1, wood: 1 });
  for (const p of st.pets || []) {
    if (p.form || p.lv < 3 || !L.PET_SP[p.sp].a) continue;
    const B = [L.PET_SP[p.sp].a, L.PET_SP[p.sp].b].find(b => b.c.yin && !b.c.deep && !b.c.heart && !b.c.season && b.c.mat === undefined);
    if (B) add(B.c.yin);
  }
  if (st.home.furnace >= 3) add({ fire: 1, ice: 1 }, 2);
  for (const id in st.gear.plans) { const P = L.PLAN[id]; if (P && P.yin) add(P.yin); }
  if (st.home.furnace >= 5 && L.recipeKnown(st, 'cuiti')) add({ thunder: 2 });
  if (st.home.furnace >= 3) add({ fire: 2 });
  const out = [];
  for (const y of order) { const d = need[y] - L.yinHave(st, y); if (d > 0) out.push({ y, d }); }
  return out;
}
const YIN_CROP = { fire: 'fire', ice: 'ice', thunder: 'bolt', wood: 'vine', soul: 'soul' };
function cropGuided(st) {
  if (!L.cropsOpen(st)) return;
  const n = L.plotCount(st), want = [];
  const ys = yinWants(st).filter(x => L.cropOpen(st, YIN_CROP[x.y]));
  for (const x of ys.slice(0, Math.max(n >= 2 ? 1 : 0, Math.floor(n / 3)))) want.push(YIN_CROP[x.y]);
  if (n >= 3 && want.length < n - 1 && st.herbs < 2 * L.herbCost(st, L.RECIPES[0])) want.push('herb');
  while (want.length < n) want.push('rice');
  const plots = L.plots(st), left = want.slice();
  // 已经种着想要的就留着；剩下的在刚收完时换成还缺的
  const keep = plots.map(x => { const j = left.indexOf(x.c); if (j >= 0) { left.splice(j, 1); return true; } return false; });
  plots.forEach((x, i) => { if (!keep[i] && x.g === 0 && left.length) L.plant(st, i, left.shift()); });
}
// guided 的炼丹
function alchGuided(st, rec) {
  if (!st.home.furnace) return;
  const can = k => !L.canCraft(st, k), tox = () => st.toxin || 0;
  // 试炼：根基类不计丹毒随时试，修炼 / 战斗类等丹毒不过 30
  if (L.yinOpen(st)) for (const g of L.YIN_GRID) if (!L.recipeKnown(st, g[2]) && !L.trialWhy(st, g[0], g[1]) && (L.RECIPE[g[2]].g === 'g' || tox() <= 30)) { if (L.trial(st, g[0], g[1])) rec.trials++; break; }
  if (tox() > 60 && can('qingdu')) L.craft(st, 'qingdu');
  if (can('xisui')) L.craft(st, 'xisui');
  if (can('cuiti')) L.craft(st, 'cuiti');
  if (can('juling') && tox() + 15 <= 60) L.craft(st, 'juling');
  else if (st.pills < 3 && can('pojing')) L.craft(st, 'pojing');
  else if (can('peiyuan') && st.herbs > L.herbCost(st, L.RECIPES[0]) * 2.5 && !L.isFull(st) && tox() + 15 <= (L.recipeKnown(st, 'juling') ? 30 : 45)) L.craft(st, 'peiyuan');
  if (L.bagN(st, 'liaoshang') < 1 && can('liaoshang') && st.herbs > L.herbCost(st, L.RECIPES[0])) L.craft(st, 'liaoshang');
  if (L.bagN(st, 'baoqi') < 1 && can('baoqi')) L.craft(st, 'baoqi');
}
// guided 的人物（SYSTEMS §12）：同伴位、交付委托、为委托多炼一炉丹
const COMP_PRI = ['chu', 'tian', 'ye', 'su', 'ge', 'mo', 'bai'];   // tian：化敌为友后的楚天阔（斩妖 +6，原来宿敌线常驻，现在占同伴位）
function peopleGuided(st, rec) {
  if (L.PEOPLE2_ON === false) return;
  // 同伴：夏天秘境开着、有“带他闯秘境”的委托时先放他；否则按 COMP_PRI 挑四心里的第一位
  const act = L.pqActive(st), rq = act.find(x => x.Q.ty === 'realm' && !L.compWhy(st, x.id));
  const want = rq && L.mjUnlocked(st) && (L.mjCan(st) || L.realmWindow(st).open) ? rq.id : COMP_PRI.find(id => !L.compWhy(st, id));
  if (!L.busy(st) && want && L.comp(st) !== want) L.setComp(st, want);
  for (const x of act) {
    if (x.Q.ty !== 'give') continue;
    const w = x.Q.what;
    if (w === 'liaoshang' && L.bagN(st, 'liaoshang') < x.q.n + 1 && !L.canCraft(st, 'liaoshang') && st.herbs > L.herbCost(st, L.RECIPES[0])) L.craft(st, 'liaoshang');
    if (w === 'baoqi' && L.bagN(st, 'baoqi') < x.q.n + 1 && !L.canCraft(st, 'baoqi')) L.craft(st, 'baoqi');
    const spare = w === 'feed' ? (st.feed || 0) >= x.q.n * 1.5 : w === 'soul' ? L.yinHave(st, 'soul') >= x.q.n : (L.bagN(st, w) >= x.q.n + (w === 'liaoshang' ? 1 : 0));
    if (spare && L.pqGive(st, x.id, x.i)) rec.pq++;
  }
}
// 来访送礼：已知 ♥ 的、拿得出手的先送；没有就拿便宜的东西去试没试过的；讨厌的不送
function giftGuided(st, rec) {
  if (L.PEOPLE2_ON === false) return;
  const id = L.pgiftVisitor(st);
  if (!id || L.pgiftWhy(st, id)) return;
  const cheap = o => !((o.key === 'pills' && st.pills < 4) || (o.key === 'treasure' && st.treasure < 3) || (o.key === 'ore' && st.gear.w && (st.ore || 0) - o.amt < L.gearPlusCost(st, st.gear.w).ore)
    || (/^yin:/.test(o.key) && L.yinHave(st, o.key.slice(4)) < 2) || (o.key.startsWith('bag:') && L.bagN(st, o.key.split(':')[1]) < 2) || (o.key === 'stones' && o.amt > st.stones * 0.1));
  const opts = L.pgiftOpts(st, id).filter(cheap);
  const o = opts.find(x => x.mark === 'like') || opts.find(x => x.mark === 'unk') || opts.find(x => x.mark === 'mid');
  if (o && L.pgiftGive(st, id, o.key)) rec.npcGifts++;
}
// 历练类委托：能稳拿到要求的评价（八成）、没有负伤风险的那一格
function pqCell(st) {
  if (L.PEOPLE2_ON === false) return null;
  for (const x of L.pqActive(st)) {
    const Q = x.Q;
    if (Q.ty !== 'exp') continue;
    let best = null;
    for (let k = L.REGIONS.length - 1; k >= 0; k--) {
      if (Q.home && k !== x.q.k) continue;
      for (let d = 2; d >= (Q.d0 || 0); d--) {
        if (!L.expOpen(st, k, d, Q.a)) continue;
        const f = L.expForecast(st, k, d, Q.a), pr = f.dist.slice(Q.r || 0).reduce((a, v) => a + v, 0);
        if (f.risk <= 0.05 && pr >= 0.8) { best = { k, d, a: Q.a }; break; }
      }
      if (best) break;
    }
    if (best) return best;
  }
  return null;
}
// 战斗类丹：胜算不到九成的硬仗（约战前夜、打首领前）服一枚爆气丹；论道、会武不服（火引留给聚灵丹）
function battlePill(st, rec, p) { if (p < 0.9 && !L.takeWhy(st, 'baoqi') && L.takePill(st, 'baoqi')) rec.baoqi++; }
// guided 的坊市：行情卖丹卖草、货架买轮换货（灵矿另见 gearGuided）
function marketGuided(st, rec) {
  if (L.sellOpen(st)) {
    const pm = L.sellMult(st, 'pill');
    if (st.pills >= 11 || (st.pills >= 9 && pm >= 0.9)) { const r = L.sell(st, 'pill', 0.5); if (r) rec.sold += r.stones; }
    const keep = 4 * L.herbCost(st, L.RECIPES[0]);
    if (st.herbs > keep && L.sellMult(st, 'herb') >= 1.2) { const r = L.sell(st, 'herb', 0.5); if (r) rec.sold += r.stones; }
  }
  if (!L.shelfOpen(st)) return;
  for (const row of L.shelf(st)) {
    if (row.fixed || L.shelfWhy(st, row)) continue;
    const buy = (row.k === 'pill' && st.pills < 3 && st.stones >= row.price * 2) || (row.k === 'robe' && st.stones >= row.price * 2) || (row.k === 'token' && !L.mjTokens(st) && st.stones >= row.price * 5)
      || ((row.k === 'frag' || row.k === 'plan') && st.stones >= row.price * 1.5)
      || (row.k === 'yin' && row.s && yinWants(st).some(x => x.y === row.s.yin) && st.stones >= row.price * 3);
    if (buy) { const r = L.shelfBuy(st, row.i); if (r) { rec.shop++; if (r.it && r.it.pend) L.gearAuto(st, r.it.gear); } }
  }
}
// guided 的拍卖：返回升洞府时要留下的灵石（拍卖会开槌前 4 个周天留 12 周天收入；开着时差一点就全留着）
function aucGuided(st, rec) {
  const inc = Math.max(L.income(st), 1);
  if (!L.auctionOpen(st)) return L.mr(st) >= 2 && L.nextAuction(st) <= 4 ? 12 * inc : 0;
  const A = st.auction, left = A.until - st.tick;
  // 手里压着 30 周天以上的收入（洞府升不动了）：什么都拍
  const rich = st.stones > 30 * inc;
  const want = it => rich || ['g', 'a', 'frag', 'xisui', 'plan'].includes(it.k) || (it.k === 'treasure' && st.treasure < 3);
  const rival = it => !!it.comp && it.comp.kind !== 'npc';
  const lots = A.items.map((it, i) => ({ it, i })).filter(x => !x.it.res && want(x.it)).sort((a, b) => rival(b.it) - rival(a.it) || b.it.m - a.it.m);
  let saving = false;
  for (const { it, i } of lots) {
    if (L.auctionBidsLeft(st) <= 0) break;
    const b2 = L.bidInfo(st, i, 2), b1 = L.bidInfo(st, i, 1);
    // 钱多（豪掷价的 1.5 倍）或宿敌在场：豪掷；否则加价；最后一个周天钱还不够，就跟一口
    let t = (rival(it) || st.stones >= b2.price * 1.5) && !b2.why ? 2 : !b1.why ? 1 : -1;
    if (t < 0 && left <= 1 && !L.bidInfo(st, i, 0).why) t = 0;
    if (t >= 0) { const r = L.auctionBid(st, i, t); if (r) { rec.bids++; if (r.win) { rec.aucWon++; if (r.it && r.it.gear && r.it.pend) L.gearAuto(st, r.it.gear); } } continue; }
    if (left > 1 && st.stones + L.income(st) * (left - 1) >= b1.price) saving = true;
  }
  return saving ? Infinity : 0;
}
// guided 的宗门（SYSTEMS §11）：宝库轮换里功法、更高阶的法宝、器方阵图买得起就换，丹矿缺了补；职司按宗门领；
//   每届给支持最高、还没到 40 的两位长老送礼（钱够才送）；徒弟：候选里挑灵根最高的，到顶前闭门苦修、到顶了去当值，圆满的功法教给他（你那门到化境），
//   长老以前金丹就出师，长老起留两个最强的打三人会武（太上起给这两个各补教到两门）
const DUTY_FOR = { jian: 'zhan', dan: 'dan', dao: 'qi', xuesha: 'zhan' };
function sectGuided(st, rec) {
  for (const c of L.vaultCells(st)) {
    if (!c.ok) continue;
    const s = c.s;
    const want = s.k === 'art' || s.k === 'plan' || (s.k === 'gear' && (s.unique || L.gearTier(st, s.slot) < s.tier)) || (s.k === 'pill' && st.pills < 3)
      || (s.k === 'ore' && st.gear.w && (st.ore || 0) < L.gearPlusCost(st, st.gear.w).ore) || (s.k === 'treasure' && st.treasure < 2);
    if (want) { const r = L.vaultRotBuy(st, c.i); if (r) { rec.vaultBuys++; if (r.it && r.it.gear && r.it.pend) L.gearAuto(st, r.it.gear); } }
  }
  if (L.dutyOpen(st) && !L.duty(st)) L.setDuty(st, DUTY_FOR[st.sect.id] || 'zhan');
  // 送礼：支持最高的两位（每届一次；灵石只花手里一成以内）
  const es = L.eldersOf(st).slice().sort((a, b) => L.favor(st, b.id) - L.favor(st, a.id)).slice(0, 2);
  for (const e of es) {
    const g = L.giftInfo(st, e.id); if (!g || g.why) continue;
    if ((g.k === 'stones' && g.n > st.stones * 0.1) || (g.k === 'treasure' && st.treasure < 3) || (g.k === 'pills' && st.pills < 4) || (g.k === 'ore' && st.gear.w && (st.ore || 0) - g.n < L.gearPlusCost(st, st.gear.w).ore)) continue;
    if (L.giftElder(st, e.id)) rec.gifts++;
  }
  // 徒弟
  const D = L.discState(st);
  if (D.cand && !L.discFull(st)) { const i = D.cand.map((c, j) => [j, c.t]).sort((a, b) => b[1] - a[1])[0][0]; L.discTake(st, i); }
  const cap = L.discMax(st);
  for (const x of D.list.slice()) {
    const job = x.di < cap - 0.3 ? 'cult' : 'duty';
    if (x.job !== job) L.discSetJob(st, x.u, job);
    // 长老以前金丹就出师；长老起留两个最强的打三人会武，第三个金丹出师
    const keep = st.sect.rank >= 4 && L.discTop(st, 2).includes(x);
    if (L.discCanGrad(x) && !keep) { const r = L.discAskGrad(st, x.u); if (r && r.ev) L.resolveChoice(st, r.ev, 0); continue; }
    if (!L.busy(st) && !L.isFull(st) && L.ticksToNext(st) > 4) { const id = L.discTeachList(st, x).find(a => L.artLv(st, a) === 3 || (keep && st.sect.rank >= 5 && x.taught.length < 2)); if (id && L.discTeach(st, x.u, id)) return; }
  }
}
// guided 的秘境（SYSTEMS §8）：夏天有令、没伤、第一层战斗房掉血不到一半就进；门照老祖的“荐”走，最好的门也会出事 / 气血见底没泉就带着收获走；
//   奇遇随手选一个付得起的；行商气血不到一半买回春散，否则买得起丹 / 法宝 / 功法就买；秘藏拿“荐”的那项。整局之后 3 个周天不动（L.mjCost）
function mjGuided(st, rec) {
  if (!L.mjCan(st) && !L.mjCan(st, true)) return false;
  const xf = L.mjCan(st, true), th = xf ? null : L.mjThemeNow(st);
  if (!xf && L.mjDmg(st, 'fight', 1, null, th.id) > L.mjMaxHp(st) * 0.5) return false;
  if (!L.mjEnter(st, { xf })) return false;
  rec.mj.runs++;
  let sum = null;
  for (let g = 0; g < 60 && st.run; g++) {
    const run = st.run;
    if (run.phase === 'door') {
      if (L.mjShouldLeave(st)) { sum = L.mjLeave(st); break; }
      const r = L.mjPick(st, Math.max(0, L.mjDoorRec(st)));
      if (r && r.wipe) { sum = r.wipe; break; }
    } else if (run.phase === 'event') {
      pickChoice(st, L.mjEventNow(st)); rec.mj.ev++;
      const r = L.mjAfterEvent(st); if (r && r.wipe) { sum = r.wipe; break; }
    } else if (run.phase === 'shop') {
      const want = run.hp < run.max / 2 ? ['heal'] : ['pill', 'gear', 'art'];
      const i = run.shop.findIndex((o, j) => want.includes(o.k) && !L.mjShopWhy(st, j));
      L.mjShop(st, i);
    } else if (run.phase === 'chest') sum = L.mjChest(st, L.mjChestRec(st).i);
  }
  if (!sum) return true;
  rec.mj[sum.how]++; rec.mj.deep += sum.deep; rec.mj.stones += sum.got.stones || 0;
  L.gearAutoAll(st);
  st._mjWait = sum.ticks - 1;
  return true;
}
function rngFor(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// 折算价的权重：越小越优先。地块制之后的新建筑（SYSTEMS §6.1）只升已建的，建造另见 buildGuided
const UPW = { array: 1, field: 1.25, furnace: 1.8, cave: 2.4, room: 2.2, vault: 2.4, library: 2.6, forge: 2.6, pen: 3, spring: 3.2, pavilion: 4, portal: 4 };

function cheapestUp(st) {
  let best = null;
  for (const b of L.HOME) {
    if (st.home[b.k] >= b.max || !L.homeOpen(st, b.k) || !UPW[b.k]) continue;
    if (b.nu && !st.home[b.k]) continue;
    const c = L.hCost(b.k, st.home[b.k]);
    if (!best || c * UPW[b.k] < best.w) best = { k: b.k, c, w: c * UPW[b.k] };
  }
  return best;
}
// guided 的洞府（SYSTEMS §6.1）：空地块按这个顺序建（前一样解锁了没建、钱不够就先攒着）；地块满了不拆
const BUILD_ORDER = ['field', 'furnace', 'room', 'vault', 'library', 'forge', 'pen', 'spring', 'pavilion', 'portal'];
function buildGuided(st, keep) {
  if (!L.home2On() || !L.homePlotFree(st)) return;
  for (const k of BUILD_ORDER) {
    if (st.home[k] > 0 || !L.homeUnlocked(st, k)) continue;
    if (st.stones - L.homeCost(st, k) >= keep) L.build(st, k);
    return;
  }
}
// guided 的阵法（SYSTEMS §6.3）：平时聚灵；有渡劫阵图、快圆满要渡劫时提前布渡劫阵（突破时等它布好），突破后换回聚灵；
//   第二阵位（炼虚起）布锻魂 > 生财 > 丹火（有哪张用哪张）
function zhenGuided(st, rec) {
  if (!L.zhenOpen(st)) return;
  const p = st.p, z = L.zhenState(st);
  const soon = L.tribNeeded(st) && L.zhenOwned(st, 'f_dujie') && p.s === 3 && (L.isFull(st) || L.ticksToNext(st) <= L.ZV.switch + 1);
  const want = soon ? 'f_dujie' : 'f_juling';
  if ((z[0].nx || z[0].id) !== want && !L.zhenSetWhy(st, 0, want)) { L.zhenSet(st, 0, want); rec.zhenSet++; }
  if (L.zhenSlots(st) >= 2 && !z[1].id && !z[1].nx) { const id = ['f_duanhun', 'f_shengcai', 'f_danhuo'].find(x => L.zhenOwned(st, x) && !L.zhenSetWhy(st, 1, x)); if (id) { L.zhenSet(st, 1, id); rec.zhenSet++; } }
}
function pickChoice(st, ev) {
  const ok = ev.choices.map((c, i) => i).filter(i => L.costOk(st, ev.choices[i].cost));
  if (ok.length) L.resolveChoice(st, ev, ok[Math.floor(L.rng() * ok.length)]);
}
function tryBreak(st, rec, strat) {
  if (!L.isReady(st)) return;
  const p = st.p, trib = L.tribNeeded(st);
  // guided：渡劫阵在布（还差一两个周天）就等它布好再突破
  if (strat === 'guided' && trib && L.home2On() && L.zhenWhere(st, 'f_dujie') && !L.formationReady(st, 'f_dujie') && !L.desperate(st)) return;
  if (strat === 'guided') {
    if (p.inj > 0 && st.pills > 0) L.heal(st);
    // 突破最多服 3 枚；金丹起天劫另有临阵吞丹 2 枚（SYSTEMS §9）
    const want = L.BT.maxPills + (trib ? L.TRIB.maxPill : 0);
    for (let i = 0; i < want; i++) if (st.pills < want && !L.btGuard(st) && !st.flags.sureBt && st.stones >= L.price(st, 'pill')) L.buy(st, 'pill');
    if (p.r === 8 && !st.flags.sureBt && !L.canCraft(st, 'jiuzhuan')) L.craft(st, 'jiuzhuan');
  } else if (strat === 'lazy') {
    if (st.pills < 1 && st.stones >= L.price(st, 'pill')) L.buy(st, 'pill');
  }
  // 心魔劫（元婴 / 化神 / 合体之前）与飞升前夜：guided 选“道心如一”那项（还这么选 +5%），lazy 随手选，idle 选第一个付得起的
  const pre = L.tribPre(st);
  if (pre) {
    const shown = pre.choices.map((c, i) => i).filter(i => L.choiceShown(st, pre.choices[i]) && L.costOk(st, pre.choices[i].cost));
    const firm = shown.find(i => { const fx = pre.choices[i].ok && pre.choices[i].ok.fx; return fx && /_firm$/.test([].concat(fx.flag || []).join()) && pre.choices[i].p === undefined; });
    const i = strat === 'guided' && firm !== undefined ? firm : strat === 'lazy' ? shown[Math.floor(L.rng() * shown.length)] : shown[0];
    if (i !== undefined) { L.resolveChoice(st, pre, i); rec.demons++; }
    while (st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) pickChoice(st, ev); }
  }
  // guided：护劫手段有就全用（祭法宝、灵宠、道侣、渡劫阵），破境丹只服到成功率封顶为止（3 枚 + 停顿时临阵吞丹 ≤ 2 枚）；lazy、idle 不用手段
  const aids = strat === 'guided' ? 'all' : null;
  let n = Math.min(3, st.pills);
  const rateN = k => (trib ? L.tribRate(st, { pills: k, aids }) : L.btRate(st, k));
  if (strat !== 'idle') while (n > 0 && rateN(n - 1) >= Math.min(0.995, rateN(n) - 1e-9)) n--;   // 到封顶（天劫难测，L.tribTop）就不再多服
  if (strat === 'lazy') n = Math.min(n, 2);
  const x0 = L.artSlots(st)[0];
  const art = { cul: L.artCulMult(st) / (x0 ? L.ARTS[L.art(x0).t].m : 1), atk: L.artAtkMult(st), combos: Object.keys(st.meta.combo || {}).length };
  let r;
  if (trib) {
    const v = L.tribStart(st, { pills: n, aids });
    if (!v) return;
    let ex = null;
    if (strat === 'guided') { ex = { fa: 1, pet: 1, daolv: 1, pills: 0 }; while (ex.pills < v.pillMax) { const a = L.tribPeek(st, ex); if (a >= 0.995) break; ex.pills++; if (L.tribPeek(st, ex) <= a + 1e-9) { ex.pills--; break; } } }
    rec.tribs++; rec.hints++; if (v.hint.right) rec.hintRight++;
    r = L.tribFinish(st, ex);
    rec.aidN += Object.keys(r.tb.aids).length + (r.tb.extraPills ? 1 : 0); rec.extraPills += r.tb.extraPills; if (r.tb.aids.zhen) rec.zhenAid++;
    if (r.tb.grade) rec.grades[r.tb.grade] = (rec.grades[r.tb.grade] || 0) + 1;
  } else r = L.breakthrough(st, n);
  if (r && r.ok) { rec.realmAt[r.to] = st.tick; rec.artAt[r.to] = art; rec.gearAt[r.to] = gearShare(st); rec.daojiAt[r.to] = L.daoji(st); rec.petAt[r.to] = petShare(st); }
}

function actGuided(st, rec, seed) {
  const p = st.p;
  if (p.r > L.MAXR) return;
  if (st._mjWait > 0) { st._mjWait--; return; }   // 秘境出来的 3 个周天
  if (L.tunaReady(st)) L.tuna(st);
  artOpt(st);
  // 坊市：行情卖丹卖草、轮换货、拍卖（拍卖差一点钱时这几个周天先不升洞府）
  if (MARKET_SIM) marketGuided(st, rec);
  const keep = MARKET_SIM ? aucGuided(st, rec) : 0;
  // 灵石：先留够闭关和丹药的钱（拍卖前后再留一笔），其余按折算价升级
  buildGuided(st, keep);
  for (let loop = 0; loop < 30; loop++) { const u = cheapestUp(st); if (!u || st.stones - u.c < keep || !L.upgrade(st, u.k)) break; }
  zhenGuided(st, rec);
  const r = Math.min(p.r, 8);
  const capA = L.boxCap(st, 'a');
  if ((L.gearPity(st) || L.artPity(st, capA) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * (st.boxMiss >= 2 ? 1 : 1.5)) L.buy(st, 'box');
  petGuided(st);
  if (st.pills < 2 && st.stones >= L.price(st, 'pill') * 3) L.buy(st, 'pill');
  if (L.lifeLow(st) && L.marketOpen(st, 'life') && L.lifeTicks(st) < 60 && st.stones >= L.price(st, 'life')) L.buy(st, 'life');
  if (st.sect) {
    if (L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 6) { const pr = L.promote(st); if (pr && pr.ok) rec.srankAt[st.sect.rank] = st.tick; }
    // 只差人脉的那几个周天（圣子、宗主）
    if (st.sect.rank === 2 || st.sect.rank === 5) { const nd = L.promoteNeeds(st); if (nd.some(x => x.k === 'elders' && !x.ok) && nd.filter(x => x.k !== 'elders').every(x => x.ok)) rec.favWait[st.sect.rank + 1] = (rec.favWait[st.sect.rank + 1] || 0) + 1; }
    if (SECT2) sectGuided(st, rec);
    else for (const k of ['vart', 'vwep', 'vplan']) if (st.sect.pts >= L.vaultCost(st, k)) L.vaultBuy(st, k);
    st.sect.tasks.forEach((t, i) => {
      if (!t.taken && t.ty !== 'teach' && (t.ty !== 'lecture' || (SECT2 && !L.busy(st) && !L.isFull(st) && L.ticksToNext(st) > 6))) L.taskTake(st, i);
      const enough = t.ty === 'herbs' ? st.herbs >= t.n * 1.5 : t.ty === 'pill' ? st.pills >= 3 : t.ty === 'forge' ? (st.ore || 0) >= t.n * 3 : t.ty === 'tame' ? (st.feed || 0) >= t.n * 2 : false;
      if (L.taskCanDeliver(st, t) && enough) L.taskDeliver(st, i);
    });
    if (st.sect.rank >= 6) for (const b of L.BUILDS) if (st.stones >= L.buildCost(st.sect.build[b.k]) * 1.2) L.sectBuild(st, b.k);
  }
  cropGuided(st);
  alchGuided(st, rec);
  peopleGuided(st, rec);
  if (!L.busy(st)) for (let k = 0; k < L.REGIONS.length; k++) if (L.bossReady(st, k)) { const foe = { kind: 'boss', k }; artFor(st, { foe }); const bp = L.duelP(st, L.duelPower(st, foe), L.bossPower(k), foe); if (bp > 0.7) { battlePill(st, rec, bp); L.fightBoss(st, k); } }
  if (L.busy(st) || L.isFull(st)) return;
  if (p.inj > 0 && st.pills > 0) L.heal(st);
  if (L.canTrain(st)) { L.startTrain(st); return; }
  // 快圆满时留在家：圆满前最后一段路，在家比出门再回来快
  const tt = L.ticksToNext(st);
  if (p.s === 3 && tt <= 3) return;
  // 负伤又没丹可服：在家歇着（带伤出门战力只剩六成，闭关也只有一半效果）
  if (p.inj > 0) return;
  if (mjGuided(st, rec)) return;
  // 该闭关时：有道侣、双修到时候了就双修（不花灵石，另得一门对方的功法）
  if ((st._trips || 0) >= 2 && L.PEOPLE2_ON !== false && L.sxInfo(st).ok) { st._trips = 0; if (L.shuangxiu(st)) { rec.sx++; return; } }
  if ((st._trips || 0) >= 2 && L.canRetreat(st)) { st._trips = 0; L.startRetreat(st); return; }
  // 行事：轮着来，缺灵草多采药；宗门任务点名的优先
  let a = 0;
  const n = st.stats.exp;
  if (L.apprOpen(st, 2) && (n === 1 || n % 4 === 2)) a = 2;
  if (L.apprOpen(st, 1) && n % 4 === 3) a = 1;
  let cell = L.expBest(st, a), escort;
  if (st.sect) st.sect.tasks.forEach((t, i) => {
    if (!t.taken || t.done) return;
    if (t.ty === 'explore' && !t.realm && L.expOpen(st, t.k, 2, 1)) { const f = L.expForecast(st, t.k, 2, 1); if (f.risk <= 0.05 && f.pOk >= 0.8) cell = { k: t.k, d: 2, a: 1 }; }
    if (t.ty === 'exp') { for (let d = 2; d >= 0; d--) if (L.expOpen(st, t.k, d, t.a)) { const f = L.expForecast(st, t.k, d, t.a); if (f.risk <= 0 && f.pOk >= 0.8) { cell = { k: t.k, d, a: t.a }; break; } } }
    else if (t.ty === 'escort' && n % 3 === 0 && L.expOpen(st, t.k, 0, 0) && L.expForecast(st, t.k, 0, 0).risk <= 0) { cell = { k: t.k, d: 0, a: 0 }; escort = i; }
  });
  // 人物委托（历练类）：每三趟里抽一趟去办
  if (escort === undefined && n % 3 === 1) { const pc = pqCell(st); if (pc) cell = pc; }
  // 走链（SYSTEMS §15）：链的下一步在某张图的历练途中、而且该来了（距上一步 ≥ L.CHAIN_V.due），去那张图走一趟（那儿稳拿乙的最深一层）
  if (escort === undefined && L.chainMaps && n % 2 === 0) {
    for (const c of L.chainMaps(st)) {
      const at = st.chain && st.chain.at[c.id] !== undefined ? st.chain.at[c.id] : -99;
      if (st.tick - at < L.CHAIN_V.due) continue;
      let pick = null;
      for (let d = 2; d >= 0 && !pick; d--) if (L.expOpen(st, c.k, d, a)) { const f = L.expForecast(st, c.k, d, a); if (f.risk <= 0 && f.pOk >= 0.8) pick = { k: c.k, d, a }; }
      if (pick) { cell = pick; rec.chainTrips = (rec.chainTrips || 0) + 1; break; }
    }
  }
  artFor(st, { k: cell.k });
  if (L.startExp(st, cell.k, cell.d, cell.a, escort !== undefined ? { escort } : undefined)) st._trips = (st._trips || 0) + 1;
}
function actLazy(st, rec) {
  const p = st.p;
  if (p.r > L.MAXR) return;
  const cyc = Math.floor(st.tick / L.TOUR_EVERY);
  if (st._cyc !== cyc) { st._cyc = cyc; st._trips = 0; }
  if (st.sect) {
    if (L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 12) { const pr = L.promote(st); if (pr && pr.ok) rec.srankAt[st.sect.rank] = st.tick; }
    st.sect.tasks.forEach((t, i) => {
      if (!t.taken && t.ty !== 'teach' && t.ty !== 'escort' && t.ty !== 'lecture') L.taskTake(st, i);
      if (L.taskCanDeliver(st, t)) L.taskDeliver(st, i);
    });
  }
  if (L.busy(st) || L.isFull(st) || st._trips >= 2) return;
  // 出门前买一样：寿元告急买延寿丹 > 还没灵宠买蛋 > 寻宝 > 最便宜的洞府升级
  const r = Math.min(p.r, 8);
  if (L.desperate(st) && L.marketOpen(st, 'life') && st.stones >= L.price(st, 'life')) L.buy(st, 'life');
  else if (L.marketOpen(st, 'egg') && !L.petCount(st) && st.stones >= L.price(st, 'egg')) L.buy(st, 'egg');
  else if ((L.gearPity(st) || L.artPity(st, Math.min(6, 1 + r)) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * 2) L.buy(st, 'box');
  else { const u = cheapestUp(st); if (u && st.stones >= u.c) L.upgrade(st, u.k); }
  if (p.inj > 0) return;
  let a = 0;
  if (st.sect) st.sect.tasks.forEach(t => { if (t.taken && !t.done && t.ty === 'exp' && L.expOpen(st, t.k, 0, t.a)) a = t.a; });
  const cell = L.expBest(st, a);
  if (L.startExp(st, cell.k, cell.d, cell.a)) st._trips++;
}

// opt.st0：从这个存档接着玩（life2 的第二世）；opt.keep：留下 st 但不打印
function run(strat, seed, trace, opt) {
  opt = opt || {};
  if (!opt.st0) L.rng = rngFor(seed);
  const st = opt.st0 || L.newState({ name: '测试' });
  const rec = { realmAt: {}, srankAt: {}, beatAt: {}, artAt: {}, gearAt: {}, daojiAt: {}, ratio: [], maxPills: 0, passive: 0, streak: 0, maxStreak: 0, lifeRed: false, sold: 0, shop: 0, bids: 0, aucWon: 0, worlds: 0, petAt: {},
    tribs: 0, hints: 0, hintRight: 0, aidN: 0, extraPills: 0, grades: {}, demons: 0, vaultBuys: 0, gifts: 0, favAt: {}, favWait: {}, npcGifts: 0, pq: 0, sx: 0, affAt: {},
    mj: { runs: 0, clear: 0, leave: 0, wipe: 0, deep: 0, ev: 0, stones: 0 }, rv: { swap: 0, swapGain: 0, crushWin: 0, crushLose: 0, crushP: 0, teach: 0 }, trials: 0, baoqi: 0, toxSum: 0, toxMax: 0, ticks: 0, rice: 0, plots: 0, yinGot: 0, zhenSet: 0, zhenAid: 0 };
  const maxT = strat === 'idle' ? 700 : strat === 'lazy' ? 1700 : 1300;
  for (let n = 0; n < maxT; n++) {
    const p = st.p;
    tryBreak(st, rec, strat);
    if (p.r >= 9) { rec.ascend = st.tick; rec.gearAt[9] = gearShare(st); rec.petAt[9] = petShare(st); rec.petEvo = st.stats.petEvo || 0; rec.petAw = st.stats.petAwake || 0; rec.feedUsed = st.stats.petFeed || 0; break; }
    if (strat === 'guided') actGuided(st, rec, seed);
    else if (strat === 'lazy') actLazy(st, rec);
    if (strat === 'lazy') { artLazy(st); L.gearAutoAll(st); }
    if (strat === 'guided') gearGuided(st);
    if (strat === 'guided' && !st.pact && st.tick === L.PACT_TICK - 1) artFor(st, { foe: L.PACT_FOE });
    if (strat === 'guided' && st.sect && st.tick % L.MEET_EVERY === L.MEET_AT - 1) { const pos = L.sectPos(st); artFor(st, { foe: { kind: 'sect', id: L.nineAt(st, pos === 1 ? 2 : pos - 1).id } }); }
    if (strat === 'guided' && !st.pact && st.tick === L.PACT_TICK - 1) battlePill(st, rec, L.pactInfo(st).p);
    rec.passive += L.income(st);
    rec.toxSum += st.toxin || 0; rec.toxMax = Math.max(rec.toxMax, st.toxin || 0); rec.ticks++;
    if (L.plotCount(st)) { rec.rice += L.riceCount(st); rec.plots += L.plotCount(st); }
    const out = L.tick(st);
    if (out.harvest) for (const k in out.harvest) if (L.YIN_N[k]) rec.yinGot += out.harvest[k];
    if (out.choice && strat !== 'idle') pickChoice(st, out.choice);
    if (out.visitor && strat === 'guided') giftGuided(st, rec);
    if (out.visitor && strat !== 'idle') pickChoice(st, out.visitor);
    while (st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) { if (strat === 'idle') L.resolveChoice(st, ev, ev.choices.findIndex(c => L.costOk(st, c.cost))); else pickChoice(st, ev); } }
    // 坊市事件（换货、开拍、买轮换货时）：会去坊市的人打开坊市时碰上，随手选一个
    if (strat !== 'idle') for (let g = 0, ev; g < 3 && (ev = L.marketEvent(st)); g++) { pickChoice(st, ev); L.marketEventDone(st, ev.id); }
    if (out.world) rec.worlds++;
    if (out.train && strat === 'guided') L.startTrain(st);
    if (out.pact) { rec.zhujiAtPact = p.r >= 1; rec.pChance = L.pactInfo(st).p; const sl = L.artSlots(st); rec.pactZ = !!sl[1]; rec.pactKe = L.duelElem(st, L.PACT_FOE).m > 1; const r = L.pactDuel(st); rec.pactWin = r.win; }
    if (out.invite && strat !== 'idle') L.joinSect(st, ['jian', 'dan', 'dao'][seed % 3]);
    if (out.war) { if (strat === 'guided') artFor(st, { foe: { kind: 'war', id: 'tianjian' } }); L.sectWar(st); }
    if (out.tourney) {
      // guided：论道前按克制换战技（第一场的宿敌）；换完下个周天 artOpt 再按平时的最优搭配换回来
      if (strat === 'guided' && RIV2) { const sw = L.tourSwap(st); if (sw) { rec.rv.swap++; rec.rv.swapGain += sw.p1 - sw.p0; st._artKey = null; } }
      L.tournament(st);
    }
    // 新秀追到身后，强制一战：guided 换上对他最好的战技，胜算 ≥ 45% 打压、否则指点；lazy 一半一半；idle 指点
    if (out.rookie && L.rookie(st)) {
      if (strat === 'guided') { const I0 = L.rookieInfo(st), b = L.duelArtBest(st, I0.foe, I0.Q); if (b && !b.same) { L.equipArt(st, b.id); st._artKey = null; } }
      const I = L.rookieInfo(st), crush = strat === 'guided' ? I.p >= 0.45 : strat === 'lazy' ? L.rng() < 0.5 : false;
      if (crush) { const r = L.rookieDuel(st); if (r.win) rec.rv.crushWin++; else rec.rv.crushLose++; rec.rv.crushP += r.p; } else { L.rookieResolve(st, 'teach'); rec.rv.teach++; }
      while (st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) { if (strat === 'idle') L.resolveChoice(st, ev, ev.choices.findIndex(c => L.costOk(st, c.cost))); else pickChoice(st, ev); } }
    }
    if (out.meet) L.sectMeet(st);
    for (const id of ['mu', 'zhao', 'chu', 'xue', 'yun']) if (st.beaten[id] && rec.beatAt[id] === undefined) rec.beatAt[id] = st.tick;
    if (st.rank === 1 && rec.rank1 === undefined) rec.rank1 = st.tick;
    for (const m of [60, 80]) if (rec.affAt[m] === undefined && L.NPCS && Object.keys(st.npc || {}).some(id => L.NPCS[id] && L.aff(st, id) >= m)) rec.affAt[m] = st.tick;
    if (st.daolv && rec.daolvAt === undefined) rec.daolvAt = st.tick;
    if (p.r >= 6 && L.desperate(st)) rec.lifeRed = true;
    if (p.r >= 1 && L.lifeLow(st)) rec.lifeYellow = true;
    if (st.tick > 12) {
      const q = st.stones / Math.max(L.income(st), 1); rec.ratio.push(q);
      // 坊市开之前（第一世三年之约前后，docs/ONBOARDING.md）灵石本来就只有聚灵阵、闭关两处去处，不算囤积
      rec.streak = q > 40 && L.unlocked(st, 'market') ? rec.streak + 1 : 0; rec.maxStreak = Math.max(rec.maxStreak, rec.streak);
    }
    rec.maxPills = Math.max(rec.maxPills, st.pills);
    if (out.death) { rec.death = st.tick; rec.deathR = p.r; break; }
    if (trace && st.tick % 12 === 0) {
      const sl = L.artSlots(st).map(id => (id ? L.art(id).n.slice(0, 2) + L.art(id).t + L.MAST.n[L.artLv(st, id)][0] : '-')).join('/');
      const gs = L.GEAR_SLOTS.map(s => (st.gear[s] ? st.gear[s].t + '+' + st.gear[s].plus : '-')).join('/');
      console.log(`t${st.tick} 岁${Math.floor(p.age)}/${Math.floor(L.lifespan(st))} ${L.stageName(p)} 根${p.t} 器${gs}(矿${L.fmt(st.ore)}) 功${sl}(${Object.keys(st.arts.own).length}门,共鸣${Object.keys(st.meta.combo).length}) 宠${L.petOut(st) ? L.petName(L.petOut(st)) + L.petOut(st).lv : 0}/${L.petCount(st)} 战力=${L.fmt(L.power(st))} 修炼×${(L.gainBase(st) / L.g0(Math.min(L.si(p), 35))).toFixed(1)} 灵石=${L.fmt(st.stones)} 收入=${L.fmt(L.income(st))} 洞府=${st.home.array}/${st.home.field}/${st.home.furnace}/${st.home.cave} 榜=${st.rank} 宗=${st.sect ? st.sect.rank + '/' + L.fmt(st.sect.total) : '-'} 丹=${st.pills} 草=${Math.floor(st.herbs)} 历练=${st.stats.exp}(${st.lastExp ? st.lastExp.k + '.' + st.lastExp.d : '-'}) 败=${st.stats.btFails}`);
    }
  }
  rec.home = Object.assign({}, st.home); rec.homeN = L.homePlots(st).filter(Boolean).length; rec.zhentu = L.zhenOwnList(st).length;
  rec.btFails = st.stats.btFails; rec.expStones = st.stats.expStones; rec.endR = st.p.r; rec.endTick = st.tick;
  rec.daoji = L.daoji(st); rec.dao = Object.assign({}, st.dao); rec.karmaOpen = L.karmaOpen(st).length; rec.karmaDone = st.karma.done; rec.toxin = st.trib.toxin;
  rec.sectTasks = st.stats.sectTasks; rec.trips = st.stats.exp;
  rec.discTaken = st.stats.discTaken || 0; rec.discGrad = st.stats.discGrad || 0; rec.discTeach = st.stats.discTeach || 0; rec.trioR = st.stats.trioRounds || 0; rec.trioW = st.stats.trioWins || 0;
  rec.fav = st.sect && st.sect.fav ? Object.values(st.sect.fav).sort((a, b) => b - a) : [0, 0, 0]; rec.duty = st.sect ? st.sect.duty : ''; rec.dings = st.stats.dings; rec.st = trace || opt.keep ? st : null;
  rec.recipes = L.recipeCount(st); rec.crafts = st.stats.crafts; rec.talent = st.p.t;
  rec.compExp = st.stats.compExp || 0; rec.st0q = st.stats.npcQuests || 0; rec.friends = Object.keys(st.npc || {}).filter(id => L.NPCS[id] && L.friend(st, id)).length; rec.giftDex = L.giftKnown ? L.giftKnown(st).length : 0;
  // 奇遇链、图鉴、道果（SYSTEMS §15 / §16）
  if (L.CHAINS) { rec.chainFin = L.CHAINS.filter(c => L.chainGot(st, c.id) >= L.chainTotal(c.id)).length; rec.chainSteps = L.CHAINS.reduce((a, c) => a + L.chainGot(st, c.id), 0); rec.chainTrips = rec.chainTrips || 0; }
  if (L.codexPct) { L.codexCheck(st); rec.cxPct = L.codexPct(st); rec.cxBonus = L.codexBonus(st); rec.cxBonusNext = L.codexBonusNext(st); rec.cxCells = L.codexCells(st); rec.cxNew = L.codexNew(st); rec.cxGrp = Object.keys(st.meta.cx.grp).length; }
  if (L.daoFruit) { const f = L.daoFruit(st); rec.dg = f.total; rec.dgCodex = f.codex; }
  rec.aucLost = st.stats.aucLost || 0; rec.rivalPw = Math.max(1, ...st.ladder.filter(x => x.id).map(x => x.pw || 1));
  const R2 = st.rv2 || {};
  Object.assign(rec.rv, { rkN: R2.rkN || 0, ambush: R2.ambush || 0, qy: R2.qy || 0, gifts: R2.gifts || 0, gMax: Math.max(...Object.values(st.grudge || { x: 0 })), gMin: Math.min(...Object.values(st.grudge || { x: 0 })),
    hi: Object.values(st.grudge || {}).filter(g => g >= 60).length, lo: Object.values(st.grudge || {}).filter(g => g <= -40).length, ally: st.eflags && st.eflags.tiankuo_ally ? 1 : 0 });
  rec.ratio.sort((a, b) => a - b);
  rec.ratioMed = rec.ratio.length ? rec.ratio[rec.ratio.length >> 1] : 0;
  return rec;
}

// ---------- 汇总 ----------
const q = (arr, f) => { const a = arr.filter(x => x !== undefined && x !== null && !Number.isNaN(x)).sort((x, y) => x - y); if (!a.length) return NaN; return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
const med = arr => q(arr, 0.5);
const span = arr => { const m = med(arr); return Number.isNaN(m) ? '—' : `${Math.round(m)}（${Math.round(q(arr, 0.1))}～${Math.round(q(arr, 0.9))}）`; };
const pct = x => (x * 100).toFixed(0) + '%';
const frac = (arr, f) => arr.filter(f).length / arr.length;
const rows = [];
let fails = 0, gateFails = 0;
// gate：硬门槛（三年之约要公平：guided 85%～95%，idle 15%～25%）。没过门槛时退出码为 1；
// 其余行是对照 DESIGN §3.12 的校准目标，未达标照常列出，加参数 strict 时也算失败
function row(strat, name, value, target, ok, gate) { rows.push([strat, name + (gate ? '（门槛）' : ''), String(value), target, ok === undefined ? '' : ok ? '达标' : '未达标']); if (ok === false) { fails++; if (gate) gateFails++; } }
const within = (v, lo, hi) => v >= lo && v <= hi;

// 天劫（SYSTEMS §9）与道心因果（§14）：评价分布、道基（§18 预算：修炼 +12%、与图鉴合计战力 ×1.15）、护劫手段、临场提示的准头、道心与因果
function tribRows(strat, recs) {
  const G = {}; let n = 0;
  for (const x of recs) for (const k in x.grades) { G[k] = (G[k] || 0) + x.grades[k]; n += x.grades[k]; }
  const gd = ['完美', '上', '中', '下'].map(k => `${k} ${pct((G[k] || 0) / Math.max(1, n))}`).join(' / ');
  const dj8 = med(recs.map(x => x.daojiAt[8])), djEnd = med(recs.map(x => x.daoji));
  row(strat, '（参考）渡劫评价 · 道基 渡劫期 / 一世', `${gd}；道基 +${(dj8 * 100 || 0).toFixed(0)}% / +${(djEnd * 100).toFixed(0)}%（上限 24%）`, '§18：道基 修炼 +12%');
  const tr = recs.reduce((a, x) => a + x.tribs, 0), hr = recs.reduce((a, x) => a + x.hintRight, 0) / Math.max(1, recs.reduce((a, x) => a + x.hints, 0));
  row(strat, '（参考）每次渡劫用的手段 / 临阵吞丹', `${(recs.reduce((a, x) => a + x.aidN, 0) / Math.max(1, tr)).toFixed(2)} 样 / ${(recs.reduce((a, x) => a + x.extraPills, 0) / Math.max(1, tr)).toFixed(2)} 枚；临场提示准 ${pct(hr)}；丹毒（待接）中位 ${med(recs.map(x => x.toxin))}`, '提示 80%（稳三级 100%）');
  const dm = k => med(recs.map(x => x.dao[k]));
  row(strat, '（参考）道心 狂/稳/仁 · 因果 未了/了结', `${dm('k')} / ${dm('w')} / ${dm('r')} · ${med(recs.map(x => x.karmaOpen))} / ${med(recs.map(x => x.karmaDone))}；心魔劫 ${med(recs.map(x => x.demons))} 次`, '三级门槛 5 / 12 / 25');
}
// 宿敌与新秀（SYSTEMS §13）：论道前换战技的次数与胜算涨幅、新秀几位怎么了结、伏击、宿敌奇遇、恩怨分布
function rvRows(strat, recs) {
  const m = k => med(recs.map(x => x.rv[k])), sum = k => recs.reduce((a, x) => a + x.rv[k], 0);
  const sw = sum('swap'), cw = sum('crushWin'), cl = sum('crushLose');
  row(strat, '（参考）宿敌 论道前换战技 / 胜算涨', `${m('swap')} 次 / +${(100 * sum('swapGain') / Math.max(1, sw)).toFixed(1)} 个百分点（每次）；宿敌奇遇 ${m('qy')} 次；伏击 ${m('ambush')} 次`, '§13：克制约 +10 个百分点');
  row(strat, '（参考）新秀 出现 / 打压胜·负 / 指点；恩怨', `${m('rkN')} 位 / ${(cw / recs.length).toFixed(1)}·${(cl / recs.length).toFixed(1)}（打压胜算 ${pct(sum('crushP') / Math.max(1, cw + cl))}） / ${(sum('teach') / recs.length).toFixed(1)}；送礼 ${m('gifts')}；恩怨 ≥60 ${(sum('hi') / recs.length).toFixed(1)} 人、≤−40 ${(sum('lo') / recs.length).toFixed(1)} 人，最高 ${m('gMax')} 最低 ${m('gMin')}；楚天阔同行 ${pct(sum('ally') / recs.length)}`, '—');
}
function summarize(strat, recs, G) {
  const n = recs.length;
  const dur = r => recs.map(x => (x.realmAt[r + 1] !== undefined ? x.realmAt[r + 1] - (r ? x.realmAt[r] : 0) : undefined));
  const durs = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(r => med(dur(r)));
  const asc = recs.map(x => x.ascend);
  const ascMed = med(asc);
  const pact = frac(recs, x => x.pactWin);
  const zj = frac(recs, x => x.zhujiAtPact);
  const died = frac(recs, x => x.death !== undefined);
  if (strat === 'guided') {
    // docs/ONBOARDING.md §5：系统一样一样开，筑基～元婴拿到灵宠、功法、强化等加成比 2.0.0 晚 30～60 个周天，这两段拉长；炼气只剩四样，略短
    const T = L.ONB_ON === false ? [34, 38, 62, 75, 75, 75, 85, 82, 90] : [32, 44, 80, 92, 75, 75, 88, 84, 92];
    row(strat, '各境界时长中位数', durs.map(Math.round).join(' / '), T.join(' / ') + '，各 ±20%', durs.every((d, i) => within(d, T[i] * 0.8, T[i] * 1.2)));
    const AT = L.ONB_ON === false ? [580, 660] : [620, 710];   // 上手曲线放慢了前中期（docs/ONBOARDING.md §5）
    row(strat, '飞升周天', span(asc) + `，飞升率 ${pct(frac(recs, x => x.ascend !== undefined))}`, `中位数 ${AT[0]}～${AT[1]}`, within(ascMed, AT[0], AT[1]));
    row(strat, '三年之约胜率', pct(pact), '85%～95%', within(pact, 0.85, 0.95), true);
    row(strat, '约战前已筑基', pct(zj), '60%～85%', within(zj, 0.60, 0.85));
    const mu60 = frac(recs, x => x.beatAt.mu !== undefined && x.beatAt.mu <= 60);
    row(strat, '击败慕容雪', `第 60 周天前 ${pct(mu60)}，中位数 ${med(recs.map(x => x.beatAt.mu))}`, '≥95% 在第 60 周天前', mu60 >= 0.95);
    const bz = med(recs.map(x => x.beatAt.zhao)), bc = med(recs.map(x => x.beatAt.chu)), bx = med(recs.map(x => x.beatAt.xue));
    row(strat, '击败赵乾 / 楚天阔 / 血无涯', `${bz} / ${bc} / ${bx}`, '72～110 / 190～300 / 340～480', within(bz, 72, 110) && within(bc, 190, 300) && within(bx, 340, 480));
    const r1 = frac(recs, x => x.rank1 !== undefined && (x.ascend === undefined || x.rank1 <= x.ascend)), r1m = med(recs.map(x => x.rank1));
    const R1 = L.ONB_ON === false ? [0.5, 510, 600] : [0.45, 520, 650];
    row(strat, '天骄榜第一', `${pct(r1)} 的种子在飞升前拿到，中位数 ${r1m}`, `${pct(R1[0])}～80%，中位数 ${R1[1]}～${R1[2]}`, within(r1, R1[0], 0.8) && within(r1m, R1[1], R1[2]));
    const sr = [1, 2, 3, 4, 5, 6].map(k => med(recs.map(x => x.srankAt[k])));
    const ST = L.ONB_ON === false ? [[45, 65], [80, 110], [140, 190], [240, 300], [360, 430], [480, 560]] : [[45, 70], [90, 125], [150, 210], [260, 340], [380, 470], [500, 600]];
    row(strat, '内门/真传/圣子/长老/太上/宗主', sr.join(' / '), ST.map(x => x.join('～')).join(' / '), sr.every((v, i) => within(v, ST[i][0], ST[i][1])));
    row(strat, '坐化', pct(died), '0%', died === 0);
    const rm = med(recs.map(x => x.ratioMed)), viol = frac(recs, x => x.maxStreak >= 24);
    row(strat, '手持灵石 / 每周天收入', `中位数 ${rm.toFixed(1)}；连续 24 周天超过 40 的种子 ${pct(viol)}`, '中位数 ≤ 20，任何连续 24 周天不超过 40', rm <= 20 && viol <= 0.05);
    const mp = recs.map(x => x.maxPills);
    row(strat, '手持破境丹（全程最高）', `中位数 ${med(mp)}，90% 分位 ${q(mp, 0.9)}，最大 ${Math.max(...mp)}`, '全程 ≤ 12', q(mp, 0.9) <= 12);
    const bf = med(recs.map(x => x.btFails));
    row(strat, '突破失败次数（一世）', `${bf}（${q(recs.map(x => x.btFails), 0.1)}～${q(recs.map(x => x.btFails), 0.9)}）`, '中位数 2～6', within(bf, 2, 6));
    tribRows(strat, recs);
    const er = med(recs.map(x => x.expStones / Math.max(1, x.passive)));
    row(strat, '历练收入 : 被动收入', er.toFixed(2), '0.8～1.5', within(er, 0.8, 1.5));
    row(strat, '（参考）历练趟数 / 丁等 / 宗门任务', `${med(recs.map(x => x.trips))} / ${med(recs.map(x => x.dings))} / ${med(recs.map(x => x.sectTasks))}`, '—');
    // SYSTEMS §11：人脉（只差人脉卡住的周天）、宝库轮换、徒弟、三人会武
    const fw = k => med(recs.map(x => x.favWait[k] || 0));
    row(strat, '（参考）人脉 卡圣子 / 宗主的周天；一世长老支持', `${fw(3)} / ${fw(6)} 周天；${[0, 1, 2].map(i => med(recs.map(x => x.fav[i]))).join(' / ')}；送礼 ${med(recs.map(x => x.gifts))} 次`, '—');
    row(strat, '（参考）宝库换 / 收徒 / 传授 / 出师 / 三人会武胜', `${med(recs.map(x => x.vaultBuys))} 件 / ${med(recs.map(x => x.discTaken))} / ${med(recs.map(x => x.discTeach))} / ${med(recs.map(x => x.discGrad))} / ${med(recs.map(x => x.trioW))}/${med(recs.map(x => x.trioR))} 场`, '—');
    row(strat, '（参考）人物 送礼 / 委托 / 同伴趟数 / 知己数 / 喜好图鉴', `${med(recs.map(x => x.npcGifts))} 次 / ${med(recs.map(x => x.pq))} 件交付（共完成 ${med(recs.map(x => x.st0q))}）/ ${med(recs.map(x => x.compExp))} 趟 / ${med(recs.map(x => x.friends))} 位 / ${med(recs.map(x => x.giftDex))}/18`, '—');
    row(strat, '（参考）人物 第一位到 60 / 80；道侣 比例 / 周天；双修', `${med(recs.map(x => x.affAt[60]))} / ${med(recs.map(x => x.affAt[80]))}；${pct(frac(recs, x => x.daolvAt !== undefined))} / ${med(recs.map(x => x.daolvAt))}；${med(recs.map(x => x.sx))} 次`, '—');
    // SYSTEMS §7 / §10：天下大势、行情、货架、拍卖用得怎样
    row(strat, '（参考）大势 / 行情卖出 / 轮换货', `${med(recs.map(x => x.worlds))} 件 / ${L.fmt(med(recs.map(x => x.sold)))} 灵石（占历练收入 ${pct(med(recs.map(x => x.sold / Math.max(1, x.expStones))))}） / ${med(recs.map(x => x.shop))} 件`, '—');
    // SYSTEMS §8 秘境：一世进几次、怎么出来的、平均走到第几层、带回的灵石占历练收入多少
    const mjs = k => med(recs.map(x => x.mj[k]));
    row(strat, '（参考）秘境 进 / 通关 / 离开 / 出局；平均层；奇遇', `${mjs('runs')} / ${mjs('clear')} / ${mjs('leave')} / ${mjs('wipe')}；${(recs.reduce((a, x) => a + x.mj.deep, 0) / Math.max(1, recs.reduce((a, x) => a + x.mj.runs, 0))).toFixed(1)} 层；${mjs('ev')} 次；灵石占历练 ${pct(med(recs.map(x => x.mj.stones / Math.max(1, x.expStones))))}`, '—');
    rvRows(strat, recs);
    row(strat, '（参考）拍卖 出价 / 拿下 / 被人拍走；宿敌最高 ×', `${med(recs.map(x => x.bids))} / ${med(recs.map(x => x.aucWon))} / ${med(recs.map(x => x.aucLost))}；×${med(recs.map(x => x.rivalPw)).toFixed(2)}`, '—');
    // SYSTEMS §18 预算：功法系统（心法裸倍率之外的熟练、融会、共鸣、星斗；战技倍率、共鸣、融会）在筑基末、渡劫期的加成
    const at = (r, f) => med(recs.map(x => x.artAt[r] && x.artAt[r][f]));
    row(strat, '（参考）功法加成 筑基末 / 渡劫期', `修炼 ×${at(2, 'cul').toFixed(2)} / ×${at(8, 'cul').toFixed(2)}，战力 ×${at(2, 'atk').toFixed(2)} / ×${at(8, 'atk').toFixed(2)}，共鸣 ${at(8, 'combos')} 条`, '§18 全部新系统：筑基末 ×1.15 / ×1.5，渡劫 ×2.0 / ×4.5');
    row(strat, '（参考）约战时装着战技 / 克制慕容', `${pct(frac(recs, x => x.pactZ))} / ${pct(frac(recs, x => x.pactKe))}`, '—');
    const ga = (r, f) => med(recs.map(x => x.gearAt[r] && x.gearAt[r][f]));
    row(strat, '（参考）法宝 筑基末 / 渡劫期 / 飞升', `强化 ×${ga(2, 'plus').toFixed(2)} / ×${ga(8, 'plus').toFixed(2)} / ×${ga(9, 'plus').toFixed(2)}，词条当量 ×${ga(2, 'aff').toFixed(2)} / ×${ga(8, 'aff').toFixed(2)} / ×${ga(9, 'aff').toFixed(2)}`, '§18：强化 ×1.3、词条 ×1.15（后期）');
    row(strat, '（参考）法宝修炼加成（饰品、养气） 元婴 / 渡劫期', `×${ga(3, 'cul').toFixed(2)} / ×${ga(8, 'cul').toFixed(2)}`, '§18：饰品 +12%');
    const pa = (r, f) => med(recs.map(x => x.petAt[r] && x.petAt[r][f]));
    row(strat, '（参考）灵宠 筑基末 / 渡劫期 / 飞升：出战', `×${pa(2, 'm').toFixed(2)} / ×${pa(8, 'm').toFixed(2)} / ×${pa(9, 'm').toFixed(2)}（等级进化好感 ×${pa(2, 'share').toFixed(2)} / ×${pa(8, 'share').toFixed(2)} / ×${pa(9, 'share').toFixed(2)}），出战 ${pa(8, 't')} 阶 Lv${pa(8, 'lv')}`, '§18：灵宠等级进化 ×1.25');
    row(strat, '（参考）灵宠 岗位修炼 渡劫期 / 名册 / 进化 觉醒 / 喂兽粮', `×${pa(8, 'cul').toFixed(2)} / ${pa(8, 'n')} 只 / ${med(recs.map(x => x.petEvo))} 次 ${med(recs.map(x => x.petAw))} 次 / ${L.fmt(med(recs.map(x => x.feedUsed)))}`, '§18：岗位 +5% 修炼');
    row(strat, '（参考）灵田 灵稻份额 / 药引收成；炼丹 炉数 / 试炼 / 揭晓丹方', `${pct(med(recs.map(x => x.rice / Math.max(1, x.plots))))} / ${med(recs.map(x => x.yinGot))} 枚；${med(recs.map(x => x.crafts))} / ${med(recs.map(x => x.trials))} / ${med(recs.map(x => x.recipes))} 格`, '—');
    row(strat, '（参考）丹毒 平均 / 最高；爆气丹服用；飞升时灵根', `${med(recs.map(x => x.toxSum / Math.max(1, x.ticks))).toFixed(1)} / ${med(recs.map(x => x.toxMax)).toFixed(0)}；${med(recs.map(x => x.baoqi))} 枚；${med(recs.map(x => x.talent))} 档`, '—');
    row(strat, '（参考）奇遇链 走完 / 推进步数 / 为链专程出门', `${med(recs.map(x => x.chainFin))} 条 / ${med(recs.map(x => x.chainSteps))} 步 / ${med(recs.map(x => x.chainTrips))} 趟`, '10 条 48 步');
    row(strat, '（参考）图鉴 完成度 / 见多识广 这一世→下一世 / 格数 / 成组；一世道果（其中图鉴）', `${pct(med(recs.map(x => x.cxPct)))} / +${Math.round(med(recs.map(x => x.cxBonus)) * 100)}%→+${Math.round(med(recs.map(x => x.cxBonusNext)) * 100)}% / ${med(recs.map(x => x.cxCells))} 格 / ${med(recs.map(x => x.cxGrp))} 类；${med(recs.map(x => x.dg))}（${med(recs.map(x => x.dgCodex))}）`, '见多识广上限 +10%');
    // SYSTEMS §6.1 / §6.3：飞升时（或一世末）洞府地块上的建筑与等级，阵图几张、换阵几次、渡劫阵用了几次
    const hk = ['field', 'furnace', 'room', 'vault', 'library', 'forge', 'pen', 'spring', 'pavilion', 'portal'], hm = k => med(recs.map(x => x.home[k] || 0));
    row(strat, '（参考）洞府 地块 / 建筑等级（一世末）', `${med(recs.map(x => x.homeN))} 块（洞府 ${hm('cave')}）；聚灵阵 ${hm('array')} ` + hk.map(k => `${L.HOME_B[k].n} ${hm(k)}`).join(' '), '—');
    row(strat, '（参考）阵法 阵图 / 换阵 / 渡劫阵护劫', `${med(recs.map(x => x.zhentu))} 张 / ${med(recs.map(x => x.zhenSet))} 次 / ${med(recs.map(x => x.zhenAid))} 次`, '—');
    row(strat, '（参考）飞升时 兵器阶+强化 / 法衣 / 饰品强化', `${ga(9, 'wt')}+${ga(9, 'wp')} / +${ga(9, 'rp')}（分数 +${ga(9, 'robe').toFixed(1)}） / +${ga(9, 'op')}`, '—');
    return { durs, ascMed };
  }
  if (strat === 'lazy') {
    const ratios = durs.map((d, i) => d / G.durs[i]);
    row(strat, '各境界时长中位数', durs.map(Math.round).join(' / '), '约为 guided 的 1.5～1.8 倍', undefined);
    const rr = ratios.filter(x => !Number.isNaN(x)); const avg = rr.reduce((a, b) => a + b, 0) / rr.length;
    row(strat, '  与 guided 之比', ratios.map(x => x.toFixed(2)).join(' / ') + `（平均 ${avg.toFixed(2)}）`, '1.5～1.8', within(avg, 1.5, 1.8));
    row(strat, '飞升周天', span(asc) + `，飞升率 ${pct(frac(recs, x => x.ascend !== undefined))}`, '850～1000', within(ascMed, 850, 1000));
    row(strat, '三年之约胜率', pct(pact), '35%～60%', within(pact, 0.35, 0.60));
    row(strat, '约战前已筑基', pct(zj), '≤ 10%', zj <= 0.10);
    const bz = med(recs.map(x => x.beatAt.zhao));
    row(strat, '击败赵乾', bz, '≤ 160', bz <= 160);
    const r1 = frac(recs, x => x.rank1 !== undefined && (x.ascend === undefined || x.rank1 <= x.ascend));
    row(strat, '天骄榜第一', pct(r1), '0～10%', r1 <= 0.10);
    rvRows(strat, recs);
    row(strat, '（参考）拍卖被人拍走；宿敌最高 ×', `${med(recs.map(x => x.aucLost))}；×${med(recs.map(x => x.rivalPw)).toFixed(2)}`, '—');
    const bfl = med(recs.map(x => x.btFails));
    row(strat, '（参考）突破失败次数（一世）', `${bfl}（${q(recs.map(x => x.btFails), 0.1)}～${q(recs.map(x => x.btFails), 0.9)}）`, '—');
    tribRows(strat, recs);
    const late = recs.filter(x => x.realmAt[6] !== undefined), red = late.length ? frac(late, x => x.lifeRed) : 0;
    row(strat, '坐化', `${pct(died)}；到过合体的种子里亮过寿元红灯的 ${pct(red)}`, '≤ 25%，且合体以后至少亮一次寿元红灯', died <= 0.25 && red >= 0.5);
    return;
  }
  row(strat, '炼气时长', span(dur(0)), '45～60', within(durs[0], 45, 60));
  row(strat, '飞升', pct(frac(recs, x => x.ascend !== undefined)), '不飞升', frac(recs, x => x.ascend !== undefined) === 0);
  row(strat, '三年之约胜率', pct(pact), '15%～25%（DESIGN 写 ≤ 20%）', within(pact, 0.15, 0.25), true);
  row(strat, '约战前已筑基', pct(zj), '0', zj === 0);
  const inJd = frac(recs, x => x.death !== undefined && x.deathR === 2), dm = med(recs.map(x => x.death));
  row(strat, '坐化', `${pct(died)}，其中金丹期 ${pct(inJd)}，中位数第 ${dm} 周天（${q(recs.map(x => x.death), 0.1)}～${q(recs.map(x => x.death), 0.9)}）`, '100%，在金丹期，第 230～300 周天', died === 1 && inJd >= 0.95 && within(dm, 230, 300));
}

function main(onlyStrat, n) {
  rows.length = 0; fails = 0; gateFails = 0;
  let G = null;
  for (const strat of onlyStrat ? [onlyStrat] : ['guided', 'lazy', 'idle']) {
    const recs = [];
    for (let s = 1; s <= n; s++) recs.push(run(strat, s));
    if (strat !== 'guided' && !G) { const g = []; for (let s = 1; s <= Math.min(n, 60); s++) g.push(run('guided', s)); G = { durs: [0, 1, 2, 3, 4, 5, 6, 7, 8].map(r => med(g.map(x => (x.realmAt[r + 1] !== undefined ? x.realmAt[r + 1] - (r ? x.realmAt[r] : 0) : undefined)))) }; }
    const out = summarize(strat, recs, G);
    if (strat === 'guided') G = out;
  }
  const w = [8, 30, 64, 44, 6];
  const pad = (s, k) => { let len = 0; for (const ch of s) len += ch.charCodeAt(0) > 255 ? 2 : 1; return s + ' '.repeat(Math.max(1, k - len)); };
  console.log(`三种策略 × ${n} 个种子（PACT_POWER=${L.PACT_POWER}${L.DAOJI_ON === false ? '，道基关' : ''}${L.ARTS_ON === false ? '，功法系统关' : ''}${L.GEAR_ON === false ? '，法宝新东西关' : ''}${L.CAL_ON === false ? '，四季与大势关' : ''}${L.MJ_ON === false ? '，秘境关' : ''}${L.PETS_ON === false ? '，灵宠新东西关' : ''}${L.CROPS_ON === false ? '，灵田只种灵稻' : ''}${L.ALCH_ON === false ? '，药引丹方与丹毒关' : ''}${L.CHAINS_ON === false ? '，奇遇链关' : ''}${L.CODEX_ON === false ? '，图鉴加成关' : ''}${L.RIVALS2_ON === false ? '，宿敌与新秀关' : ''}${L.HOME2_ON === false ? '，洞府回到地块之前' : ''}${L.ONB_ON === false ? '，上手曲线关' : ''}${MARKET_SIM ? '' : '，guided 不用行情、拍卖、轮换货'}）`);
  console.log(pad('策略', w[0]) + pad('指标', w[1]) + pad('结果：中位数（10%～90% 分位）', w[2]) + pad('目标', w[3]) + '判定');
  for (const r of rows) console.log(pad(r[0], w[0]) + pad(r[1], w[1]) + pad(r[2], w[2]) + pad(r[3], w[3]) + r[4]);
  console.log(fails ? `\n${fails} 行未达标（其中门槛 ${gateFails} 行）` : '\n全部达标');
  return { fails, gateFails };
}

// 连玩两世（SYSTEMS §16）：第一世结算 → 轮回殿照顺序买 → 传承 → 默认出身投胎 → 第二世
function life2(n) {
  const r1 = [], r2 = [], dg = [], bought = {}, cards = [];
  for (let s = 1; s <= n; s++) {
    const a = run('guided', s, false, { keep: true }), st = a.st;
    L.settle(st, st.p.r >= 9 ? 'ascend' : 'rest');
    dg.push(st.settle.total);
    // 对照：nohall 一样不买；wis1 只买宿慧一级（DESIGN 阶段四的验收口径）；nolegacy 不带传承
    const buys = arg.includes('nohall') ? [] : arg.includes('wis1') ? [L.hallBuy(st, 'wis')].filter(Boolean).map(x => x.id) : L.hallAuto(st);
    for (const id of buys) bought[id] = (bought[id] || 0) + 1;
    if (!arg.includes('nolegacy')) L.legacyAuto(st); else L.legacySet(st, {});
    const c = L.rebirthCards(st, L.rebirthCardN(st)).sort((x, y) => y.t - x.t)[0]; cards.push(c.t);
    const ns = L.rebirthState(st, { t: c.t, tr: c.tr, origin: 'qitu', trials: [] });
    const b = run('guided', s, false, { st0: ns });
    r1.push(a); r2.push(b);
  }
  const asc1 = r1.map(x => x.ascend), asc2 = r2.map(x => x.ascend), ratio = r1.map((x, i) => (x.ascend && r2[i].ascend ? r2[i].ascend / x.ascend : undefined));
  console.log(`连玩两世 × ${n} 个种子（guided；第二世默认出身、不选试炼）`);
  console.log(`第一世飞升 ${span(asc1)}；道果 ${span(dg)}`);
  console.log(`第二世飞升 ${span(asc2)}，飞升率 ${pct(frac(r2, x => x.ascend !== undefined))}；与第一世之比 ${med(ratio).toFixed(2)}（${q(ratio, 0.1).toFixed(2)}～${q(ratio, 0.9).toFixed(2)}，DESIGN 阶段四：0.75～0.90）`);
  console.log(`第二世三年之约胜率 ${pct(frac(r2, x => x.pactWin))}；命格灵根中位 ${med(cards)} 档；图鉴完成度 第一世 ${pct(med(r1.map(x => x.cxPct)))} → 第二世 ${pct(med(r2.map(x => x.cxPct)))}`);
  console.log('轮回殿买了（种子数）：' + Object.entries(bought).map(([k, v]) => `${L.HALL_NODE[k].n} ${v}`).join('、'));
}

module.exports = { run, main, life2, L };
if (require.main !== module) { /* 被 require 时只导出，不跑汇总 */ } else if (LIFE2) life2(N); else if (verbose) {
  const strat = only || 'guided';
  const rec = run(strat, seed0, true);
  const { st, ratio, ...rest } = rec; void st; void ratio;
  console.log(JSON.stringify(rest));
} else { const r = main(only, N); process.exitCode = r.gateFails || (process.argv.includes('strict') && r.fails) ? 1 : 0; }
