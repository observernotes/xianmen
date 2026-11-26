/* 废柴仙途 · 逻辑模块 onboard：上手曲线——系统解锁表 + 掌握信号（docs/ONBOARDING.md）
 * 模块写法见 src/logic.js 顶部说明。排在 MODULES 最后：它把前面各模块的“开放”判定（L.retOpen、L.homeUnlocked、L.artSlotOpen、L.gearOpen、
 * L.calOpen、L.shelfOpen、L.sellOpen、L.mjUnlocked、L.cropsOpen、L.yinOpen、L.zhenOpen、L.chainOpen、L.petJobsOpen、L.dutyOpen、L.discOpen……）
 * 各包一层“并且已解锁”，所以界面、逻辑、sim 看到的是同一份开放状态。
 *
 * 规则（第一世；转世后 L.unlocked 一律为真，只剩各系统原来的门槛）：
 *   · 表 L.ONB 按顺序排；每周天（以及动手之后）看一次：第一个“原门槛已满足、还没解锁”的条目，满足下面两条就解锁它，一次只解锁一个——
 *     ① 离上一次解锁至少 gap 个周天（系统 L.ONB_GAP.sys，子项 L.ONB_GAP.sub）；
 *     ② 系统（sys）要等上一个系统“掌握”：master(st) 为真（用过几次 / 达成某结果），或解锁后过了 maxWait 个周天（玩家不理它也不会卡死）。
 *        子项（sub，例如历练的采药、坊市的行情）只等它的父系统解锁，不占“掌握”。
 *   · force(st) 为真的（突破、三年之约、入宗、遇见人物、拿到灵宠……）立刻解锁，不等间隔——那件事已经发生了，界面不能装作没有。
 *   · 存档 st.onb = { at: { key: 解锁时的周天 }, m: { key: 掌握时的周天 }, last: 上次解锁的周天, c: { 计数 } }；
 *     旧档（没有 st.onb）：原门槛已满足的全部算已解锁、已掌握（老玩家的东西不会消失），L.migrateOnb 幂等。
 *   · 解锁时 emit('unlock', key)，掌握时 emit('master', key)；界面（src/ui/guide.js 的 UI.isOpen）据此决定底栏入口、分页、按钮、HUD 格、角标、问老祖、札记显示与否。
 * sim 对照：L.ONB_ON = false（node tools/sim.js all 200 noonb）回到上一版：各系统一到原门槛就开。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { emit } = L.U;
const ON = () => L.ONB_ON !== false;
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const S = (st, k) => (st.stats && st.stats[k]) || 0;
const C = (st, k) => (st.onb && st.onb.c && st.onb.c[k]) || 0;
// 原来的开放判定（包之前先存一份；解锁条件只看原门槛，不会绕回自己）
const O = {};
for (const k of ['retOpen', 'apprOpen', 'tunaReady', 'homeUnlocked', 'artSlotOpen', 'gearOpen', 'calOpen', 'shelfOpen', 'sellOpen', 'mjUnlocked', 'cropsOpen', 'yinOpen', 'zhenOpen', 'chainOpen', 'petJobsOpen', 'dutyOpen', 'discOpen', 'auctionOpen'])
  O[k] = L[k];
const hasArt = (st, kind) => !!(st.arts && Object.keys(st.arts.own || {}).some(id => L.art(id) && L.art(id).k === kind));
const metAny = st => Object.keys(st.npc || {}).some(id => L.NPCS && L.NPCS[id]);
const EXTRA_B = ['forge', 'pen', 'room', 'library', 'spring', 'vault', 'pavilion', 'portal'];

// 间隔（月）。系统之间另有 L.TIME.unlockGapMonths 的下限（解锁卡之间 ≥ 8 月；真实时间那一半由界面登记 L.onbHold 判，见 src/ui/clock.js）
L.ONB_GAP = { sys: st => (st.p.r < 1 ? 4 : st.p.r < 3 ? 6 : 12), sub: 5, reborn: 3 };
// ---------- 时钟（docs/KAIRO_PLAN.md §3.2 / §3.4 的旋钮）：×1 时一月多少秒 ----------
// idle 在洞府打坐、trip 历练、away 闭关 / 特训 / 讲道；转世后用 reborn 那一组。unlockGapMonths / unlockGapSec：两张解锁卡之间的最短间隔；
// interruptGapMonths：打坐时两次主动打断（解锁卡、事件、老祖一句）之间至少隔几个月（src/logic/time.js 的 L.notifyGate）
L.TIME = { idle: 15, trip: 8, away: 3, reborn: { idle: 8, trip: 4, away: 2 }, unlockGapMonths: 8, unlockGapSec: 360, interruptGapMonths: 3 };
L.monthSec = function (st) {
  const T = st && (st.rebirth || 0) > 0 ? L.TIME.reborn : L.TIME;
  return !st ? T.idle : st.exp ? T.trip : st.retreat ? T.away : T.idle;
};
L.TICK_SEC = st => L.monthSec(st);   // 旧名（界面、测试脚本还在读）
// k：键；n：名字；sys：系统（true）/ 子项（false，par 是父系统）；base：原门槛；force：已经发生了，立刻开；
// master：掌握信号；goal：解锁后札记顶上的小目标（掌握信号的白话）；maxWait：解锁后最多等几个周天就当掌握了
L.ONB = [
  // ---- 第一章：三年之约之前只开这四样（DESIGN §2.4 的脚本收窄） ----
  { k: 'exp', n: '历练', sys: true, start: true, master: st => S(st, 'exp') >= 1, goal: '外出历练一次' },
  { k: 'home', n: '洞府·聚灵阵', sys: true, base: st => S(st, 'exp') >= 1, master: st => st.home.array >= 2, goal: '聚灵阵升到 2 级', maxWait: 10 },
  { k: 'herb', n: '行事·采药', par: 'home', gap: 4, base: st => S(st, 'exp') >= 1 },   // 采药开得早晚直接改约战战力（多斩妖多掉法宝），钉在洞府开后 4 周天
  { k: 'retreat', n: '闭关', sys: true, base: st => O.retOpen(st), master: st => S(st, 'retreat') >= 1, goal: '闭关一次', maxWait: 10 },
  { k: 'bt', n: '突破', sys: true, base: st => L.isReady(st), force: st => L.isReady(st) || mr(st) >= 1, master: st => mr(st) >= 1, goal: '突破筑基' },
  // ---- 三年之约之后：一次一样，掌握了再开下一样 ----
  { k: 'tour', n: '天骄论道·天骄榜', par: 'exp', base: st => !!st.pact, force: st => !!st.pact, master: () => true },
  { k: 'market', n: '坊市', sys: true, gap: 8, base: st => !!st.pact || mr(st) >= 1, master: st => S(st, 'shop') >= 1, goal: '在坊市买一样东西', maxWait: 8 },
  { k: 'sect', n: '宗门·任务板', sys: true, base: st => mr(st) >= 1 && !!st.pact, force: st => !!st.sect, master: st => S(st, 'sectTasks') >= 1, goal: '交一件宗门任务', maxWait: 10 },
  { k: 'visitor', n: '访客·奇遇', sys: true, base: st => !!st.pact, force: st => !!st.visitor || S(st, 'visits') > 0, master: st => S(st, 'visits') >= 1, goal: '见一位访客', maxWait: 14 },
  { k: 'tuna', n: '吐纳', par: 'home', base: st => !!st.pact },
  { k: 'field', n: '灵田', sys: true, base: st => O.homeUnlocked(st, 'field'), master: st => st.home.field >= 1, goal: '开一块灵田', maxWait: 12 },
  { k: 'treasure', n: '行事·寻宝', par: 'market', base: st => O.apprOpen(st, 1) },
  { k: 'gearCmp', n: '法宝·换上与熔炼', sys: true, base: st => S(st, 'exp') >= 4, master: st => C(st, 'gdec') >= 1, goal: '在对比卡上换上或熔炼一件法宝', maxWait: 12 },
  { k: 'furnace', n: '丹炉·炼丹', sys: true, base: st => O.homeUnlocked(st, 'furnace'), master: st => S(st, 'crafts') >= 1, goal: '炼一炉丹', maxWait: 14 },
  { k: 'arts', n: '功法·心法', sys: true, base: st => hasArt(st, 'x'), master: st => !!(L.artSlots(st)[0]), goal: '装上一门心法', maxWait: 10 },
  { k: 'trib', n: '天劫·护劫', sys: true, base: st => mr(st) >= 1 && st.p.s === 3, force: st => mr(st) >= 2 || (st.trib && !!st.trib.cur) || (mr(st) >= 1 && L.isReady(st)), master: st => mr(st) >= 2, goal: '渡过金丹雷劫', maxWait: 16 },
  { k: 'pets', n: '灵宠', sys: true, base: st => mr(st) >= 1, force: st => L.petCount(st) > 0 || (st.petPend || []).length > 0, master: st => L.petCount(st) >= 1, goal: '收服一只灵宠', maxWait: 16 },
  { k: 'plus', n: '强化·灵矿', sys: true, base: st => O.gearOpen(st, 'plus'), master: st => S(st, 'plus') >= 1, goal: '强化一次兵器', maxWait: 12 },
  { k: 'cal', n: '四季·年历', sys: true, base: st => O.calOpen(st), master: () => false, maxWait: 8 },
  { k: 'zhanji', n: '战技·五行', sys: true, base: st => O.artSlotOpen(st, 1) && hasArt(st, 'z'), master: st => !!(L.artSlots(st)[1]), goal: '装上一门战技', maxWait: 12 },
  { k: 'sell', n: '行情·出售', par: 'market', base: st => O.sellOpen(st) },
  { k: 'world', n: '天下大势', par: 'cal', base: st => O.calOpen(st) },
  { k: 'shelf', n: '坊市·轮换货', par: 'market', base: st => O.shelfOpen(st) },
  { k: 'crops', n: '灵田·改种', par: 'field', base: st => O.cropsOpen(st) },
  { k: 'robe', n: '法衣', par: 'gearCmp', base: st => O.gearOpen(st, 'r') },
  { k: 'realm', n: '秘境', sys: true, base: st => O.mjUnlocked(st), master: st => S(st, 'mjRuns') >= 1, goal: '闯一次秘境', maxWait: 20 },
  { k: 'yin', n: '药引丹方·丹毒', par: 'furnace', base: st => O.yinOpen(st) && st.home.furnace >= 1 },
  { k: 'bond', n: '人物·羁绊与送礼', sys: true, base: metAny, force: st => S(st, 'npcGifts') > 0, master: st => S(st, 'npcGifts') >= 1, goal: '给来访的人送一次礼', maxWait: 16 },
  { k: 'plots', n: '洞府地块·建筑', sys: true, base: st => L.home2On && L.home2On() && EXTRA_B.some(k => O.homeUnlocked(st, k)), master: st => EXTRA_B.some(k => (st.home[k] || 0) > 0), goal: '在空地块上建一样', maxWait: 14 },
  { k: 'vault', n: '宗门·宝库与人脉', par: 'sect', base: st => !!st.sect && (st.sect.rank >= 1 || S(st, 'sectTasks') >= 2) },
  { k: 'zhen', n: '阵法', sys: true, base: st => O.zhenOpen(st), master: st => S(st, 'zhenSet') >= 1, goal: '换一次阵法', maxWait: 14 },
  { k: 'dao', n: '道心·因果', sys: true, base: st => mr(st) >= 2 || ((st.dao && (st.dao.k + st.dao.w + st.dao.r)) || 0) >= 5, master: () => false, maxWait: 8 },
  { k: 'mishu', n: '秘术', par: 'arts', base: st => O.artSlotOpen(st, 2) },
  { k: 'auction', n: '拍卖会', par: 'market', base: st => mr(st) >= 2 },
  { k: 'petJobs', n: '灵宠岗位', par: 'pets', base: st => O.petJobsOpen(st) && L.petCount(st) >= 1 },
  { k: 'chainExp', n: '连续历练', par: 'exp', base: st => O.chainOpen(st) },
  { k: 'duty', n: '宗门·职司', par: 'sect', base: st => O.dutyOpen(st) },
  { k: 'disc', n: '徒弟', sys: true, base: st => O.discOpen(st), force: st => S(st, 'discTaken') > 0, master: st => S(st, 'discTaken') >= 1, goal: '收一个徒弟', maxWait: 16 },
  { k: 'codex', n: '图鉴', sys: true, base: st => mr(st) >= 2, master: () => false, maxWait: 8 },
  { k: 'comp', n: '同伴', par: 'bond', base: st => Object.keys(st.npc || {}).some(id => L.NPCS && L.NPCS[id] && L.aff(st, id) >= 60) },
  { k: 'orn', n: '饰品', par: 'gearCmp', base: st => O.gearOpen(st, 'o') },
  { k: 'forge', n: '器炉·打造', par: 'plus', base: st => O.gearOpen(st, 'forge') },
];
const E = {}; L.ONB.forEach((e, i) => { e.i = i; E[e.k] = e; });
L.ONB_K = E;
const call = (f, st) => { try { return !!(f && f(st)); } catch (e) { return false; } };
L.newOnb = () => ({ at: { exp: 0 }, m: {}, last: 0, c: {} });
const ob = st => st.onb || (st.onb = L.newOnb());
// 这一样开了没有（第一世看解锁表；转世后、关掉上手曲线时恒真，剩各系统原来的门槛）
L.unlocked = function (st, k) {
  if (!ON() || !st || !E[k]) return true;
  return ob(st).at[k] !== undefined;
};
// 界面用：开了，而且原门槛也满足（转世后也要原门槛满足才显示）
L.onbShown = (st, k) => (!E[k] || !ON() ? true : L.unlocked(st, k));   // 关掉上手曲线（L.ONB_ON = false）时界面和 2.0.0 一样全摆出来，由各系统原来的门槛（灰锁）管
L.onbMastered = (st, k) => { const o = ob(st); return o.m[k] !== undefined; };
const lastSys = st => { const o = ob(st); let best = null; for (const e of L.ONB) if (e.sys && o.at[e.k] !== undefined && (!best || o.at[e.k] >= o.at[best.k])) best = e; return best; };
const masteredNow = (st, e) => { const o = ob(st); return o.m[e.k] !== undefined || call(e.master, st) || st.tick - o.at[e.k] >= (e.maxWait || 12); };
// 每周天（L.tick 末尾）和动手之后调：记掌握、按规则至多解锁一样（force 的不限）
L.onbStep = function (st) {
  if (!ON() || !st || !st.p) return null;
  const o = ob(st);
  for (const e of L.ONB) if (o.at[e.k] !== undefined && o.m[e.k] === undefined && call(e.master, st)) { o.m[e.k] = st.tick; emit('master', e.k); }
  const reborn = (st.rebirth || 0) > 0;
  let got = null;
  for (const e of L.ONB) if (o.at[e.k] === undefined && call(e.force, st)) { o.at[e.k] = st.tick; o.last = Math.max(o.last, st.tick); if (e.sys && e.k !== 'bt') o.ls = st.tick; emit('unlock', e.k); got = got || e.k; }
  // 转世后“快开”：不讲解、不等掌握、不等三年之约，原门槛到了就按表的顺序每 L.ONB_GAP.reborn 个周天开一样
  const ls = lastSys(st), sysWait = !reborn && !!ls && !masteredNow(st, ls);
  for (const e of L.ONB) {
    if (o.at[e.k] !== undefined || !(e.start || call(e.base, st))) continue;
    if (e.par && o.at[e.par] === undefined) continue;
    if (!reborn && e.i > E.bt.i && !st.pact) continue;   // 第一章只有历练、洞府、闭关、突破（和采药）：其余的都等三年之约之后
    if (e.sys && sysWait) continue;   // 上一个系统还没掌握：别的系统等着，子项可以先开
    const gap = reborn ? L.ONB_GAP.reborn : e.gap || (e.sys ? L.ONB_GAP.sys(st) : L.ONB_GAP.sub);
    if (st.tick - o.last < gap && o.last > 0) break;   // 一样一样来：排在前面的没到时候，后面的也等着
    // 解锁卡（系统）之间：至少 L.TIME.unlockGapMonths 月；界面另把“离上一张卡不到 6 分钟”登记成 L.onbHold
    if (e.sys && !reborn && o.ls !== undefined && st.tick - o.ls < L.TIME.unlockGapMonths) break;
    if (e.sys && !reborn && typeof L.onbHold === 'function' && L.onbHold(st, e)) break;
    o.at[e.k] = st.tick; o.last = st.tick;
    if (e.sys) o.ls = st.tick;
    if (!e.master || reborn) o.m[e.k] = st.tick;
    emit('unlock', e.k);
    return got || e.k;
  }
  return got;
};
// 札记顶上的小目标：最近解锁、还没掌握的那个系统
L.onbGoal = function (st) {
  if (!ON() || !st || (st.rebirth || 0) > 0) return null;
  const o = ob(st); let best = null;
  for (const e of L.ONB) if (e.goal && o.at[e.k] !== undefined && o.m[e.k] === undefined && !call(e.master, st) && (!best || o.at[e.k] >= o.at[best.k])) best = e;
  return best;
};
// 测试与旧档用：全部算解锁、已掌握（造中后期局面的测试先调它，界面才和 2.0.0 一样全开）
L.onbAll = function (st) { const o = ob(st); for (const e of L.ONB) { if (o.at[e.k] === undefined) o.at[e.k] = st.tick; if (o.m[e.k] === undefined) o.m[e.k] = st.tick; } o.last = st.tick; return st; };
// 下一样（问老祖“接下来会开什么”、文档核对用）：原门槛已满足、在排队的第一个
L.onbNext = st => L.ONB.find(e => ob(st).at[e.k] === undefined && (e.start || call(e.base, st))) || null;

// ---------- 把各模块的开放判定包一层 ----------
const U = L.unlocked;
const wrap = (name, f) => { const f0 = L[name]; if (typeof f0 === 'function') L[name] = f(f0); };
wrap('retOpen', f => st => f(st) && U(st, 'retreat'));
wrap('apprOpen', f => (st, a) => f(st, a) && (a === 2 ? U(st, 'herb') : a === 1 ? U(st, 'treasure') : true));
wrap('tunaReady', f => st => f(st) && U(st, 'tuna'));
const HOME_K = { field: 'field', furnace: 'furnace' };
wrap('homeUnlocked', f => (st, k) => f(st, k) && (HOME_K[k] ? U(st, HOME_K[k]) : EXTRA_B.includes(k) ? U(st, 'plots') : true));
wrap('artSlotOpen', f => (st, i) => f(st, i) && U(st, ['arts', 'zhanji', 'mishu'][i]));
wrap('gearOpen', f => (st, w) => f(st, w) && (w === 'plus' ? U(st, 'plus') : w === 'r' ? U(st, 'robe') : w === 'o' ? U(st, 'orn') : w === 'forge' ? U(st, 'forge') : true));
wrap('calOpen', f => st => f(st) && U(st, 'cal'));
wrap('shelfOpen', f => st => f(st) && U(st, 'shelf'));
wrap('sellOpen', f => st => f(st) && U(st, 'sell'));
wrap('mjUnlocked', f => st => f(st) && U(st, 'realm'));
wrap('cropsOpen', f => st => f(st) && U(st, 'crops'));
wrap('yinOpen', f => st => f(st) && U(st, 'yin'));
wrap('zhenOpen', f => st => f(st) && U(st, 'zhen'));
wrap('chainOpen', f => st => f(st) && U(st, 'chainExp'));
wrap('petJobsOpen', f => st => f(st) && U(st, 'petJobs'));
wrap('dutyOpen', f => st => f(st) && U(st, 'duty'));
wrap('discOpen', f => st => f(st) && U(st, 'disc'));
wrap('auctionOpen', f => st => f(st) && U(st, 'auction'));
// 坊市：没开时什么都买不了；灵兽蛋等灵宠开了才上架
wrap('shelfWhy', f => (st, row) => (!U(st, 'market') ? '坊市还没开' : row && row.k === 'egg' && !U(st, 'pets') ? '还没到养灵宠的时候' : f(st, row)));
wrap('marketOpen', f => (st, k) => U(st, 'market') && (k !== 'egg' || U(st, 'pets')) && f(st, k));
// 访客：开了才有人上门（第一世三年之约之后）
wrap('spawnVisitor', f => st => (U(st, 'visitor') ? f(st) : null));
// 宗门宝库、送礼、同伴：没开时不能用（sim 也一样）
wrap('vaultBuy', f => (st, k) => (U(st, 'vault') ? f(st, k) : null));
wrap('vaultRotBuy', f => (st, i) => (U(st, 'vault') ? f(st, i) : null));
wrap('setComp', f => (st, id) => (!id || U(st, 'comp') ? f(st, id) : null));
// 法宝对比卡没开之前：新掉的法宝老祖替你定（比身上强就换上，不然熔成灵矿），结算卡上写一行
wrap('gearDrop', f => (st, slot, tier, ctx) => {
  const it = f(st, slot, tier, ctx);
  if (it && it.pend && !U(st, 'gearCmp')) { const x = st.gear.pend.find(y => y.u === (it.gear && it.gear.u)); if (x) { const better = L.gearBetter(st, x); L.gearDecide(st, x.u, better ? 'equip' : 'smelt'); delete it.pend; if (better) it.equip = true; else { it.auto = true; it.smelt = it.smelt || L.gearSmeltOre(x); } } }
  return it;
});
wrap('gearDecide', f => (st, u, how) => { const r = f(st, u, how); if (r && U(st, 'gearCmp')) ob(st).c.gdec = C(st, 'gdec') + 1; return r; });
// 奇遇：会送灵宠、兽粮的（草窠幼兽之类），灵宠开了才出（不然第一章就冒出一只养不了的灵宠）
const petFx = ev => (ev._onbPet !== undefined ? ev._onbPet : (ev._onbPet = (ev.choices || []).some(c => ['ok', 'fail'].some(r => c[r] && c[r].fx && (c[r].fx.item === 'pet' || c[r].fx.feed || c[r].fx.petXp)))));
wrap('eligible', f => (st, ev, where, ctx) => f(st, ev, where, ctx) && (where === 'story' || U(st, 'pets') || !petFx(ev)));
// 宗门招揽：宗门开了才上门（入宗是三年之约之后的第一件大事，排在表里的前头）
wrap('tick', f => (st, cont) => {
  L.onbStep(st);
  const out = f(st, cont);
  if (out.invite && !U(st, 'sect')) { out.invite = false; st.flags.inviteAt = st.tick + 1; }
  // 天下大势：大势开了才起（四季先开，大势是它的子项）
  if (out.world && !U(st, 'world') && st.cal) { if (st.cal.n) st.cal.n[out.world] = Math.max(0, (st.cal.n[out.world] || 1) - 1); st.cal.w = null; delete out.world; }
  if (out.auction && !U(st, 'auction')) { st.auction = null; out.auction = false; }
  const k = L.onbStep(st);
  if (k) out.unlock = k;
  return out;
});
// 札记：依赖还没开的系统的小任务，暂不显示也不结算（和 off 一样）；开了以后照常
const Q_KEY = [[/采药/, 'herb'], [/寻宝/, 'treasure'], [/闭关/, 'retreat'], [/灵田|改种/, 'field'], [/访客/, 'visitor'], [/吐纳/, 'tuna'], [/强化/, 'plus'], [/宗门|拜入|内门/, 'sect'],
  [/灵宠/, 'pets'], [/炼一炉|炼出|丹方|九转/, 'furnace'], [/法衣/, 'robe'], [/论道|天骄榜/, 'tour'], [/行情/, 'sell'], [/秘境/, 'realm'], [/拍卖/, 'auction'], [/知己|道侣|四心|五心/, 'bond'],
  [/同伴/, 'comp'], [/会武/, 'sect'], [/灵器|法宝/, 'gearCmp'], [/图鉴|奇遇链/, 'codex'], [/徒弟/, 'disc'], [/阵/, 'zhen'], [/建设/, 'sect'], [/饰品/, 'orn'], [/打造|器方/, 'forge']];
for (const ch of L.CHAPTERS) for (const q of ch.tasks) { const t = typeof q.t === 'string' ? q.t : ''; const m = Q_KEY.find(([re]) => re.test(t)); if (m) q.onb = m[1]; }
const qv0 = L.questView;
L.questView = function (st) {
  const v = qv0(st);
  if (!ON()) return v;
  const done = (st.quest && st.quest.done) || {}, ok = q => !q.onb || U(st, q.onb);
  const live = v.ch.tasks.filter(q => !q.off && ok(q));
  v.list = live.filter(q => !done[q.id]).slice(0, 3);
  v.first = v.list[0] || v.main || v.old[0] || null;
  v.doneN = live.filter(q => done[q.id]).length; v.total = live.length;
  return v;
};
{ const cq0 = L.checkQuests; L.checkQuests = function (st) {
  if (!ON()) return cq0(st);
  const off = [];
  for (const ch of L.CHAPTERS) for (const q of ch.tasks) if (q.onb && !q.off && !U(st, q.onb)) { q.off = true; off.push(q); }
  try { return cq0(st); } finally { for (const q of off) q.off = false; }
}; }

// ---------- 新档、旧档 ----------
{ const ns0 = L.newState; L.newState = function (o) {
  const was = L.ONB_ON; L.ONB_ON = false;
  let st; try { st = ns0(o); } finally { L.ONB_ON = was; }
  st.onb = L.newOnb();
  if ((st.rebirth || 0) > 0) markUsed(st);
  return st;
}; }
// 旧档：原门槛已满足、或已经在用的，全算解锁并掌握（不让老玩家的东西突然消失）；可重复调用
L.migrateOnb = function (s) {
  if (!s || !s.p) return s;
  if (s.onb && s.onb.at) { s.onb.m = s.onb.m || {}; s.onb.c = s.onb.c || {}; s.onb.last = s.onb.last || 0; return s; }
  s.onb = L.newOnb();
  const fresh = (s.tick || 0) <= 0 && !((s.stats && s.stats.exp) > 0);
  if (fresh) return s;
  for (const e of L.ONB) if (e.start || call(e.base, s) || call(e.force, s) || call(e.master, s)) { s.onb.at[e.k] = s.tick; s.onb.m[e.k] = s.tick; }
  markUsed(s);
  s.onb.last = s.tick;
  return s;
};
// 用过的痕迹：建过的建筑、装着的功法、有过的宗门、拍卖过、卖过东西……这些系统直接算开了
function markUsed(s) {
  const used = { sect: !!s.sect, field: s.home && s.home.field > 0, furnace: s.home && s.home.furnace > 0, pets: (s.pets || []).length > 0, realm: S(s, 'mjRuns') > 0, sell: S(s, 'sold') > 0,
    auction: S(s, 'auction') > 0 || S(s, 'bids') > 0, arts: hasArt(s, 'x'), plus: S(s, 'plus') > 0, market: S(s, 'shop') > 0, visitor: S(s, 'visits') > 0, retreat: S(s, 'retreat') > 0, gearCmp: S(s, 'exp') >= 2, tour: !!s.pact, zhanji: hasArt(s, 'z'), mishu: hasArt(s, 'm') };
  for (const k in used) if (used[k] && E[k]) { s.onb.at[k] = s.tick; s.onb.m[k] = s.tick; if (E[k].par) s.onb.at[E[k].par] = s.onb.at[E[k].par] === undefined ? s.tick : s.onb.at[E[k].par]; }
}
});
