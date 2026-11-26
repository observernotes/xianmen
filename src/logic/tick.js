/* 废柴仙途 · 逻辑模块 tick：时间推进：每月结算
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 天剑宗来犯按章（第六章“击退天剑宗”）来，不看境界（path.js 的 L.chapterNow；没装上时退回炼虚）
L.warChapter = st => (L.chapterNow ? L.chapterNow(st) >= 5 : st.p.r >= 5);
// ---------- 推进 ----------
L.flow = function (st, f) {
  const g = L.gain(st) * f;
  if (st.retreat) st.retreat.got += g;
  L.addXp(st, g);
  st.stones += L.income(st) * f;
  if (st.p.r <= L.MAXR) st.p.age += L.REALMS[st.p.r].mpt * f * L.ageRate(st);
  st.year += L.REALMS[Math.min(st.p.r, 8)].mpt * f;
};
// 一趟历练中途的遭遇：走过一半那个节点之后，60% 概率，前两趟不触发（ap.js 的 L.tripStep）
L.ENC_P = 0.6;
L.tick = function (st, cont) {
  const out = { exp: null, event: null, tourney: false, pact: false, death: false, invite: false, war: false };
  if (!cont) L.flow(st, 1);
  st.tick++;
  L._inMonth = st;   // 这个月的结算进行中：L.monthNow / L.season 取 st.tick（calendar.js）；包在外面的 ap.js 在整条 L.tick 跑完后复原
  const p = st.p;
  if (p.inj > 0) p.inj--;
  // 功法：熟练、长春功的额外疗伤（arts.js）；法宝：过期没决定的掉落兜底结清（gear.js）
  L.artTick(st);
  L.gearTick(st);
  // 历法：大势到期 / 每轮 t%12 = 2 掷新的一件、换季（calendar.js）
  L.calTick(st, out);
  // 秘境：每个夏季头一个月送一枚秘境令（realm.js）
  if (L.mjTick) L.mjTick(st, out);
  // 洞府：阵法布好生效、灵泉养伤、地块满了的提醒、阵图来源（buildings.js / formation.js）
  if (L.homeTick) L.homeTick(st, out);
  // 灵宠：好感、觅食、闲着掉心与出走、争窝、名册满时没决定的新灵宠（pets.js）
  L.petTick(st, out);
  // 增益；灵田作物长一月、熟了自动收（crops.js）；丹毒消退、自动续炼（alchemy.js）
  for (const bf of st.buffs) bf.left--;
  st.buffs = st.buffs.filter(bf => bf.left > 0);
  L.cropTick(st, out);
  L.alchTick(st, out);
  // 吐纳环已删（docs/AP_PLAN.md §3.1：由“打坐 1 点”接替，ap.js 的 L.sit）
  const evMul = L.friend(st, 'bai') ? 1.5 : 1;
  // 历练、闭关不再逐月推进：当场结算（ap.js 的 L.tripStep / L.tripEnd / L.retreatNow；途中遭遇在 L.tripStep 里出）
  // 访客：新手期等第一次闭关出关（或第 20 月后）才开始有人上门；没有“在外”了，等待每月照减（AP_PLAN §4.7）
  if (st.visitor) {
    if (--st.visitor.left <= 0) out.visitorGone = L.visitorLeave(st);
  } else if (!out.visitor && (st.rebirth > 0 || st.stats.visits > 0 || st.stats.retreat > 0 || st.tick >= 20) && R() < L.VISIT.p * evMul * L.calVisitMult(st)) {
    out.visitor = L.spawnVisitor(st);
  }
  if (!st.pact && st.tick === L.PACT_TICK - 1) L.fireTrigger(st, 'pact_eve');
  if (!st.pact && st.tick >= L.PACT_TICK) out.pact = true;
  if (!out.pact && L.canTrain(st) && !st.flags.trainOffered) { st.flags.trainOffered = 1; out.train = true; }
  if (!st.sect && p.r >= 1 && st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick >= (st.flags.inviteAt || 0)) {   // 三宗争徒（不再等“你在洞府”；线 B 改成第二章开章链末尾当场出）
    out.invite = true; st.flags.inviteAt = st.tick + 12; }
  // 宿敌与新秀：天剑宗来犯前夜、宿敌的奇遇、新秀出现与追到身后、指点过的新秀送礼（rivals2.js；排在来犯判定之前）
  if (L.rivalTick) L.rivalTick(st, out);
  if (st.sect) {
    const sc = L.sectOf(st);
    // 丹霞谷：每 6 月俸禄附一枚破境丹（手里不足 L.DAN_PILL_CAP 枚时才发，免得越攒越多）
    if (sc.pill && st.tick % 6 === 0 && st.pills < L.DAN_PILL_CAP) st.pills++;
    if (!st.flags.warWon && st.sect.rank >= 2 && L.warChapter(st) && st.tick >= (st.flags.war || 0)) { out.war = true; st.flags.war = st.tick + 9999; }
    if (L.canPromote(st) && !st.flags.promoNote) { st.flags.promoNote = 1; emit('promote', st.sect.rank + 1); }
    if (!L.canPromote(st)) st.flags.promoNote = 0;
  }
  if (st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick % L.TOUR_EVERY === 0) { out.tourney = true; if (st.sect) L.rollTasks(st); }
  if (st.sect && st.sect.order && st.tick - st.sect.joined >= 12 && st.tick % L.MEET_EVERY === L.MEET_AT) out.meet = true;
  // 宗门加深：宝库轮换、长老的恩惠、圣子 / 宗主之争的前夜、徒弟成长与差事（sect2.js、disciples.js）
  if (L.sectTick) L.sectTick(st, out);
  // 人物：二心、四心的委托，丹方类委托的进度，双修到时候了（people.js）
  if (L.peopleTick) L.peopleTick(st, out);
  // 坊市：行情游走（每 6 月）、货架换货（每届论道）、拍卖散场与开槌（market.js）
  L.marketTick(st, out);
  for (const nw of L.RIVAL_NEWS) if (nw[0] === st.tick && !st.beaten[nw[1]]) L.log(st, nw[2]);
  if (p.r <= L.MAXR && p.age >= L.lifespan(st)) out.death = true;
  if (L.desperate(st) && !st.flags.warnLife) { st.flags.warnLife = 1; L.log(st, '寿元将尽！突破时将获得绝境加成', 'red'); }
  if (!L.desperate(st)) st.flags.warnLife = 0;
  L.checkQuests(st);
  L.checkAchs(st);
  return out;
};
});
