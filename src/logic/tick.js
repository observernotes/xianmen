/* 废柴仙途 · 逻辑模块 tick：时间推进：每周天结算
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 推进 ----------
L.flow = function (st, f) {
  const g = L.gain(st) * f;
  if (st.retreat) st.retreat.got += g;
  L.addXp(st, g);
  st.stones += L.income(st) * f;
  if (st.p.r <= L.MAXR) st.p.age += L.REALMS[st.p.r].mpt * f * L.ageRate(st);
  st.year += L.REALMS[Math.min(st.p.r, 8)].mpt * f;
};
// 一趟历练中途的遭遇：第 ceil(len/2) 周天，60% 概率，前两趟不触发
L.ENC_P = 0.6;
L.tick = function (st, cont) {
  const out = { exp: null, event: null, tourney: false, pact: false, death: false, invite: false, war: false };
  if (!cont) L.flow(st, 1);
  st.tick++;
  const p = st.p;
  if (p.inj > 0) p.inj--;
  // 功法：熟练、长春功的额外疗伤（arts.js）；法宝：过期没决定的掉落兜底结清（gear.js）
  L.artTick(st);
  L.gearTick(st);
  // 历法：大势到期 / 每轮 t%12 = 2 掷新的一件、换季（calendar.js）
  L.calTick(st, out);
  // 秘境：每个夏季头一个周天送一枚秘境令（realm.js）
  if (L.mjTick) L.mjTick(st, out);
  // 洞府：阵法布好生效、灵泉养伤、地块满了的提醒、阵图来源（buildings.js / formation.js）
  if (L.homeTick) L.homeTick(st, out);
  // 灵宠：好感、觅食、闲着掉心与出走、争窝、名册满时没决定的新灵宠（pets.js）
  L.petTick(st, out);
  // 增益；灵田作物长一周天、熟了自动收（crops.js）；丹毒消退、自动续炼（alchemy.js）
  for (const bf of st.buffs) bf.left--;
  st.buffs = st.buffs.filter(bf => bf.left > 0);
  L.cropTick(st, out);
  L.alchTick(st, out);
  // 吐纳环：在洞府打坐才蓄
  if (!L.busy(st) && !L.isFull(st) && p.r <= L.MAXR) st.tuna = Math.min(L.TUNA_FULL, Math.round(((st.tuna || 0) + L.tunaStep(st)) * 1e6) / 1e6);
  const evMul = L.friend(st, 'bai') ? 1.5 : 1;
  if (st.exp) {
    const e = st.exp;
    e.left--;
    if (e.left > 0 && e.plan && !e.encEv && e.total - e.left === Math.ceil(e.total / 2) && st.stats.exp >= 2 && e.plan.enc < L.ENC_P * evMul) {
      const ev = L.pickEvent(st, 'exp', { bg: L.REGIONS[e.k].bg });
      if (ev) { e.encEv = ev.id; e.chain = 0; out.choice = ev; }
    }
    if (e.left <= 0) {
      const r = L.resolveExp(st);
      // 连续历练：三趟合并成一张结算；丁等、遭遇、修为圆满时中断
      const sum = st.expSum || { n: 0, stones: 0, herbs: 0, pills: 0, treasure: 0, contrib: 0, xp: 0, items: [], ratings: [] };
      sum.n++; sum.stones += r.stones; sum.herbs += r.herbs; sum.pills += r.pills; sum.treasure += r.treasure; sum.contrib += r.contrib; sum.xp += r.xp; sum.items = sum.items.concat(r.items); sum.ratings.push(r.rating);
      if (r.chain > 0 && r.rating > 0 && !r.enc && !L.isFull(st) && L.startExp(st, r.k, r.d, r.a, { chain: r.chain, quiet: true })) st.expSum = sum;
      else { st.expSum = null; if (sum.n > 1) r.sum = sum; out.exp = r; }
    }
  }
  if (st.retreat) {
    st.retreat.left--;
    if (st.retreat.left <= 0) { out.retreat = L.endRetreat(st, true); if (out.retreat.visitor) out.visitor = out.retreat.visitor; }
  }
  // 访客：闭关时顺延；新手期等第一次闭关出关（或第 20 周天后）才开始有人上门
  if (st.visitor) {
    if (--st.visitor.left <= 0) out.visitorGone = L.visitorLeave(st);
  } else if (!st.retreat && !out.visitor && (st.rebirth > 0 || st.stats.visits > 0 || st.stats.retreat > 0 || st.tick >= 20) && R() < L.VISIT.p * evMul * L.calVisitMult(st)) {
    out.visitor = L.spawnVisitor(st);
  }
  if (!st.pact && st.tick === L.PACT_TICK - 1) L.fireTrigger(st, 'pact_eve');
  if (!st.pact && st.tick >= L.PACT_TICK) out.pact = true;
  if (!out.pact && L.canTrain(st) && !st.flags.trainOffered) { st.flags.trainOffered = 1; out.train = true; }
  if (!st.sect && p.r >= 1 && st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick >= (st.flags.inviteAt || 0)) { out.invite = true; st.flags.inviteAt = st.tick + 12; }
  // 宿敌与新秀：天剑宗来犯前夜、宿敌的奇遇、新秀出现与追到身后、指点过的新秀送礼（rivals2.js；排在来犯判定之前）
  if (L.rivalTick) L.rivalTick(st, out);
  if (st.sect) {
    const sc = L.sectOf(st);
    // 丹霞谷：每 6 周天俸禄附一枚破境丹（手里不足 L.DAN_PILL_CAP 枚时才发，免得越攒越多）
    if (sc.pill && st.tick % 6 === 0 && st.pills < L.DAN_PILL_CAP) st.pills++;
    if (!st.flags.warWon && st.sect.rank >= 2 && p.r >= 5 && st.tick >= (st.flags.war || 0) && !L.busy(st)) { out.war = true; st.flags.war = st.tick + 9999; }
    if (L.canPromote(st) && !st.flags.promoNote) { st.flags.promoNote = 1; emit('promote', st.sect.rank + 1); }
    if (!L.canPromote(st)) st.flags.promoNote = 0;
  }
  if (st.pact && !out.pact && st.tick > L.PACT_TICK && st.tick % L.TOUR_EVERY === 0) { out.tourney = true; if (st.sect) L.rollTasks(st); }
  if (st.sect && st.sect.order && st.tick - st.sect.joined >= 12 && st.tick % L.MEET_EVERY === L.MEET_AT) out.meet = true;
  // 宗门加深：宝库轮换、长老的恩惠、圣子 / 宗主之争的前夜、徒弟成长与差事（sect2.js、disciples.js）
  if (L.sectTick) L.sectTick(st, out);
  // 坊市：行情游走（每 6 周天）、货架换货（每届论道）、拍卖散场与开槌（market.js）
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
