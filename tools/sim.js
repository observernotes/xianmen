// 数值模拟：三种玩法各跑 200 个种子，输出汇总并对照 docs/DESIGN.md §3.12 的目标区间
//   node tools/sim.js                 三种策略 × 200 种子的汇总表
//   node tools/sim.js guided 50       只跑 guided，50 个种子
//   node tools/sim.js guided 1 v 7    种子 7 跑一局，每 12 周天打印一行状态
//   node tools/sim.js all 200 strict  任何一行未达标都返回退出码 1（默认只看三年之约公平这道门槛）
//   node tools/sim.js all 200 noarts  关掉功法系统的新加成（L.ARTS_ON = false：只剩心法的裸倍率），与默认对照量 SYSTEMS §18 的预算
//   node tools/sim.js all 200 nogear  关掉法宝系统的新东西（L.GEAR_ON = false：法衣、饰品、强化、词条都没有，只剩兵器的阶倍率）
//   node tools/sim.js all 200 nocal   关掉四季与天下大势（L.CAL_ON = false）
//   node tools/sim.js all 200 nomarket guided 不卖行情、不去拍卖、不买轮换货（货架的常驻三格照用），量坊市这一刀对节奏的影响
//   node tools/sim.js all 200 nodaoji  渡劫评价不给道基（L.DAOJI_ON = false），量道基对节奏的影响
// 策略：
//   guided 空闲就行动；快圆满时留在家；灵石按“聚灵阵 > 灵田 > 丹炉 > 洞府”的折算价升级；每两趟历练闭关一次；
//          突破带尽量多的丹（最多 3 枚）；金丹起的天劫护劫手段有就全用（祭法宝、道侣、灵宠、渡劫阵；停顿时临阵吞丹补到成功率封顶），
//          心魔劫选“还这么选”；地点选“预计评价 ≥ 乙”的最高一格；接宗门任务、吐纳、看访客；
//          功法：三槽按 L.artBest 取最优搭配（算上熟练、融会、共鸣），出门前换上克制当地的战技，约战、首领、会武前换上克制对手的
//          法宝：掉落卡“更好就换、否则熔炼”（L.gearAuto）；灵矿全花在强化上（兵器优先，按“每点灵矿换来多少”挑槽），器方材料够就打
//          坊市（SYSTEMS §10）：货架上打折的破境丹、轮换的法衣 / 残篇 / 器方买得起就买，灵矿不够强化时买一筐；
//          行情：破境丹 ≥ 9 枚时卖一半（指数 ≥ 0.9，或 ≥ 11 枚时不看指数），灵草远多于炼丹所需、指数 ≥ 1.2 时卖一半，灵矿不卖（全拿去强化）；
//          拍卖：想要的拍品（法宝、功法、残篇、洗髓、器方，天材地宝不足 3 个时）按手里的钱出价，宿敌在场的先出、出到豪掷；
//          钱差一点时拍卖那几个周天不升洞府、攒着；坊市事件随手选一个付得起的选项
//   lazy   （SYSTEMS §18 第 6 条）会做访客和宗门任务；每届论道（12 周天）之前出门历练两趟，每次出门前只买一样东西；
//          不闭关、不吐纳、不碰新系统（不卖行情、不去拍卖）；突破最多带 2 枚丹；功法、法宝只照掉落卡的默认点【换上】（更强才换），不凑共鸣、不换克制、不强化
//   idle   什么都不做，只在修为圆满时突破
// 被 require 时导出 { run, L }，可以在别的脚本里换策略或统计（tools/ 之外的分析脚本用）
const L = require('../src/logic.js');
const arg = process.argv.slice(2);
if (arg.includes('noarts')) L.ARTS_ON = false;
if (arg.includes('nogear')) L.GEAR_ON = false;
if (arg.includes('nocal')) L.CAL_ON = false;
if (arg.includes('nodaoji')) L.DAOJI_ON = false;
const MARKET_SIM = !arg.includes('nomarket');
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
    const buy = (row.k === 'pill' && st.pills < 3 && st.stones >= row.price * 2) || (row.k === 'robe' && st.stones >= row.price * 2)
      || ((row.k === 'frag' || row.k === 'plan') && st.stones >= row.price * 1.5);
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
function rngFor(seed) { let s = (seed * 2654435761) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const UPW = { array: 1, field: 1.25, furnace: 1.8, cave: 2.4 };   // 折算价的权重：越小越优先

function cheapestUp(st) {
  let best = null;
  for (const b of L.HOME) {
    if (st.home[b.k] >= b.max || !L.homeOpen(st, b.k)) continue;
    const c = L.hCost(b.k, st.home[b.k]);
    if (!best || c * UPW[b.k] < best.w) best = { k: b.k, c, w: c * UPW[b.k] };
  }
  return best;
}
function pickChoice(st, ev) {
  const ok = ev.choices.map((c, i) => i).filter(i => L.costOk(st, ev.choices[i].cost));
  if (ok.length) L.resolveChoice(st, ev, ok[Math.floor(L.rng() * ok.length)]);
}
function tryBreak(st, rec, strat) {
  if (!L.isReady(st)) return;
  const p = st.p, trib = L.tribNeeded(st);
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
  if (strat !== 'idle') while (n > 0 && (trib ? L.tribRate(st, { pills: n - 1, aids }) : L.btRate(st, n - 1)) >= 0.995) n--;
  if (strat === 'lazy') n = Math.min(n, 2);
  const x0 = L.artSlots(st)[0];
  const art = { cul: L.artCulMult(st) / (x0 ? L.ARTS[L.art(x0).t].m : 1), atk: L.artAtkMult(st), combos: Object.keys(st.meta.combo || {}).length };
  let r;
  if (trib) {
    const v = L.tribStart(st, { pills: n, aids });
    if (!v) return;
    let ex = null;
    if (strat === 'guided') { ex = { fa: 1, pet: 1, daolv: 1, pills: 0 }; while (ex.pills < v.pillMax && L.tribPeek(st, ex) < 0.995) ex.pills++; }
    rec.tribs++; rec.hints++; if (v.hint.right) rec.hintRight++;
    r = L.tribFinish(st, ex);
    rec.aidN += Object.keys(r.tb.aids).length + (r.tb.extraPills ? 1 : 0); rec.extraPills += r.tb.extraPills;
    if (r.tb.grade) rec.grades[r.tb.grade] = (rec.grades[r.tb.grade] || 0) + 1;
  } else r = L.breakthrough(st, n);
  if (r && r.ok) { rec.realmAt[r.to] = st.tick; rec.artAt[r.to] = art; rec.gearAt[r.to] = gearShare(st); rec.daojiAt[r.to] = L.daoji(st); }
}

function actGuided(st, rec, seed) {
  const p = st.p;
  if (p.r > L.MAXR) return;
  if (L.tunaReady(st)) L.tuna(st);
  artOpt(st);
  // 坊市：行情卖丹卖草、轮换货、拍卖（拍卖差一点钱时这几个周天先不升洞府）
  if (MARKET_SIM) marketGuided(st, rec);
  const keep = MARKET_SIM ? aucGuided(st, rec) : 0;
  // 灵石：先留够闭关和丹药的钱（拍卖前后再留一笔），其余按折算价升级
  for (let loop = 0; loop < 30; loop++) { const u = cheapestUp(st); if (!u || st.stones - u.c < keep || !L.upgrade(st, u.k)) break; }
  const r = Math.min(p.r, 8);
  const capA = L.boxCap(st, 'a');
  if ((L.gearPity(st) || L.artPity(st, capA) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * (st.boxMiss >= 2 ? 1 : 1.5)) L.buy(st, 'box');
  if (L.marketOpen(st, 'egg') && (!p.pet || p.pet.tier < Math.min(6, 1 + Math.floor(r * 0.6))) && st.stones >= L.price(st, 'egg') * 1.5) L.buy(st, 'egg');
  if (st.pills < 2 && st.stones >= L.price(st, 'pill') * 3) L.buy(st, 'pill');
  if (L.lifeLow(st) && L.marketOpen(st, 'life') && L.lifeTicks(st) < 60 && st.stones >= L.price(st, 'life')) L.buy(st, 'life');
  if (st.sect) {
    if (L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 6) { const pr = L.promote(st); if (pr && pr.ok) rec.srankAt[st.sect.rank] = st.tick; }
    for (const k of ['vart', 'vwep', 'vplan']) if (st.sect.pts >= L.vaultCost(st, k)) L.vaultBuy(st, k);
    st.sect.tasks.forEach((t, i) => {
      if (!t.taken && t.ty !== 'teach') L.taskTake(st, i);
      if (L.taskCanDeliver(st, t) && (t.ty === 'herbs' ? st.herbs >= t.n * 1.5 : st.pills >= 3)) L.taskDeliver(st, i);
    });
    if (st.sect.rank >= 6) for (const b of L.BUILDS) if (st.stones >= L.buildCost(st.sect.build[b.k]) * 1.2) L.sectBuild(st, b.k);
  }
  if (st.home.furnace) {
    if (!L.canCraft(st, 'xisui')) L.craft(st, 'xisui');
    if (!L.canCraft(st, 'juling') && !st.buffs.some(b => b.cul)) L.craft(st, 'juling');
    else if (st.pills < 3 && !L.canCraft(st, 'pojing')) L.craft(st, 'pojing');
    else if (!L.canCraft(st, 'peiyuan') && st.herbs > L.herbCost(st, L.RECIPES[0]) * 2.5 && !L.isFull(st)) L.craft(st, 'peiyuan');
  }
  if (!L.busy(st)) for (let k = 0; k < L.REGIONS.length; k++) if (L.bossReady(st, k)) { const foe = { kind: 'boss', k }; artFor(st, { foe }); if (L.duelP(st, L.duelPower(st, foe), L.bossPower(k), foe) > 0.7) L.fightBoss(st, k); }
  if (L.busy(st) || L.isFull(st)) return;
  if (p.inj > 0 && st.pills > 0) L.heal(st);
  if (L.canTrain(st)) { L.startTrain(st); return; }
  // 快圆满时留在家：圆满前最后一段路，在家比出门再回来快
  const tt = L.ticksToNext(st);
  if (p.s === 3 && tt <= 3) return;
  // 负伤又没丹可服：在家歇着（带伤出门战力只剩六成，闭关也只有一半效果）
  if (p.inj > 0) return;
  if ((st._trips || 0) >= 2 && L.canRetreat(st)) { st._trips = 0; L.startRetreat(st); return; }
  // 行事：轮着来，缺灵草多采药；宗门任务点名的优先
  let a = 0;
  const n = st.stats.exp;
  if (L.apprOpen(st, 2) && (n === 1 || n % 4 === 2)) a = 2;
  if (L.apprOpen(st, 1) && n % 4 === 3) a = 1;
  let cell = L.expBest(st, a), escort;
  if (st.sect) st.sect.tasks.forEach((t, i) => {
    if (!t.taken || t.done) return;
    if (t.ty === 'exp') { for (let d = 2; d >= 0; d--) if (L.expOpen(st, t.k, d, t.a)) { const f = L.expForecast(st, t.k, d, t.a); if (f.risk <= 0 && f.pOk >= 0.8) { cell = { k: t.k, d, a: t.a }; break; } } }
    else if (t.ty === 'escort' && n % 3 === 0 && L.expOpen(st, t.k, 0, 0) && L.expForecast(st, t.k, 0, 0).risk <= 0) { cell = { k: t.k, d: 0, a: 0 }; escort = i; }
  });
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
      if (!t.taken && t.ty !== 'teach' && t.ty !== 'escort') L.taskTake(st, i);
      if (L.taskCanDeliver(st, t)) L.taskDeliver(st, i);
    });
  }
  if (L.busy(st) || L.isFull(st) || st._trips >= 2) return;
  // 出门前买一样：寿元告急买延寿丹 > 还没灵宠买蛋 > 寻宝 > 最便宜的洞府升级
  const r = Math.min(p.r, 8);
  if (L.desperate(st) && L.marketOpen(st, 'life') && st.stones >= L.price(st, 'life')) L.buy(st, 'life');
  else if (L.marketOpen(st, 'egg') && !p.pet && st.stones >= L.price(st, 'egg')) L.buy(st, 'egg');
  else if ((L.gearPity(st) || L.artPity(st, Math.min(6, 1 + r)) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * 2) L.buy(st, 'box');
  else { const u = cheapestUp(st); if (u && st.stones >= u.c) L.upgrade(st, u.k); }
  if (p.inj > 0) return;
  let a = 0;
  if (st.sect) st.sect.tasks.forEach(t => { if (t.taken && !t.done && t.ty === 'exp' && L.expOpen(st, t.k, 0, t.a)) a = t.a; });
  const cell = L.expBest(st, a);
  if (L.startExp(st, cell.k, cell.d, cell.a)) st._trips++;
}

function run(strat, seed, trace) {
  L.rng = rngFor(seed);
  const st = L.newState({ name: '测试' });
  const rec = { realmAt: {}, srankAt: {}, beatAt: {}, artAt: {}, gearAt: {}, daojiAt: {}, ratio: [], maxPills: 0, passive: 0, streak: 0, maxStreak: 0, lifeRed: false, sold: 0, shop: 0, bids: 0, aucWon: 0, worlds: 0,
    tribs: 0, hints: 0, hintRight: 0, aidN: 0, extraPills: 0, grades: {}, demons: 0 };
  const maxT = strat === 'idle' ? 700 : strat === 'lazy' ? 1700 : 1300;
  for (let n = 0; n < maxT; n++) {
    const p = st.p;
    tryBreak(st, rec, strat);
    if (p.r >= 9) { rec.ascend = st.tick; rec.gearAt[9] = gearShare(st); break; }
    if (strat === 'guided') actGuided(st, rec, seed);
    else if (strat === 'lazy') actLazy(st, rec);
    if (strat === 'lazy') { artLazy(st); L.gearAutoAll(st); }
    if (strat === 'guided') gearGuided(st);
    if (strat === 'guided' && !st.pact && st.tick === L.PACT_TICK - 1) artFor(st, { foe: L.PACT_FOE });
    if (strat === 'guided' && st.sect && st.tick % L.MEET_EVERY === L.MEET_AT - 1) { const pos = L.sectPos(st); artFor(st, { foe: { kind: 'sect', id: L.nineAt(st, pos === 1 ? 2 : pos - 1).id } }); }
    rec.passive += L.income(st);
    const out = L.tick(st);
    if (out.choice && strat !== 'idle') pickChoice(st, out.choice);
    if (out.visitor && strat !== 'idle') pickChoice(st, out.visitor);
    while (st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) { if (strat === 'idle') L.resolveChoice(st, ev, ev.choices.findIndex(c => L.costOk(st, c.cost))); else pickChoice(st, ev); } }
    // 坊市事件（换货、开拍、买轮换货时）：会去坊市的人打开坊市时碰上，随手选一个
    if (strat !== 'idle') for (let g = 0, ev; g < 3 && (ev = L.marketEvent(st)); g++) { pickChoice(st, ev); L.marketEventDone(st, ev.id); }
    if (out.world) rec.worlds++;
    if (out.train && strat === 'guided') L.startTrain(st);
    if (out.pact) { rec.zhujiAtPact = p.r >= 1; rec.pChance = L.pactInfo(st).p; const sl = L.artSlots(st); rec.pactZ = !!sl[1]; rec.pactKe = L.duelElem(st, L.PACT_FOE).m > 1; const r = L.pactDuel(st); rec.pactWin = r.win; }
    if (out.invite && strat !== 'idle') L.joinSect(st, ['jian', 'dan', 'dao'][seed % 3]);
    if (out.war) { if (strat === 'guided') artFor(st, { foe: { kind: 'war', id: 'tianjian' } }); L.sectWar(st); }
    if (out.tourney) L.tournament(st);
    if (out.meet) L.sectMeet(st);
    for (const id of ['mu', 'zhao', 'chu', 'xue', 'yun']) if (st.beaten[id] && rec.beatAt[id] === undefined) rec.beatAt[id] = st.tick;
    if (st.rank === 1 && rec.rank1 === undefined) rec.rank1 = st.tick;
    if (p.r >= 6 && L.desperate(st)) rec.lifeRed = true;
    if (p.r >= 1 && L.lifeLow(st)) rec.lifeYellow = true;
    if (st.tick > 12) {
      const q = st.stones / Math.max(L.income(st), 1); rec.ratio.push(q);
      rec.streak = q > 40 ? rec.streak + 1 : 0; rec.maxStreak = Math.max(rec.maxStreak, rec.streak);
    }
    rec.maxPills = Math.max(rec.maxPills, st.pills);
    if (out.death) { rec.death = st.tick; rec.deathR = p.r; break; }
    if (trace && st.tick % 12 === 0) {
      const sl = L.artSlots(st).map(id => (id ? L.art(id).n.slice(0, 2) + L.art(id).t + L.MAST.n[L.artLv(st, id)][0] : '-')).join('/');
      const gs = L.GEAR_SLOTS.map(s => (st.gear[s] ? st.gear[s].t + '+' + st.gear[s].plus : '-')).join('/');
      console.log(`t${st.tick} 岁${Math.floor(p.age)}/${Math.floor(L.lifespan(st))} ${L.stageName(p)} 根${p.t} 器${gs}(矿${L.fmt(st.ore)}) 功${sl}(${Object.keys(st.arts.own).length}门,共鸣${Object.keys(st.meta.combo).length}) 宠${p.pet ? p.pet.tier : 0} 战力=${L.fmt(L.power(st))} 修炼×${(L.gainBase(st) / L.g0(Math.min(L.si(p), 35))).toFixed(1)} 灵石=${L.fmt(st.stones)} 收入=${L.fmt(L.income(st))} 洞府=${st.home.array}/${st.home.field}/${st.home.furnace}/${st.home.cave} 榜=${st.rank} 宗=${st.sect ? st.sect.rank + '/' + L.fmt(st.sect.total) : '-'} 丹=${st.pills} 草=${Math.floor(st.herbs)} 历练=${st.stats.exp}(${st.lastExp ? st.lastExp.k + '.' + st.lastExp.d : '-'}) 败=${st.stats.btFails}`);
    }
  }
  rec.btFails = st.stats.btFails; rec.expStones = st.stats.expStones; rec.endR = st.p.r; rec.endTick = st.tick;
  rec.daoji = L.daoji(st); rec.dao = Object.assign({}, st.dao); rec.karmaOpen = L.karmaOpen(st).length; rec.karmaDone = st.karma.done; rec.toxin = st.trib.toxin;
  rec.sectTasks = st.stats.sectTasks; rec.trips = st.stats.exp; rec.dings = st.stats.dings; rec.st = trace ? st : null;
  rec.aucLost = st.stats.aucLost || 0; rec.rivalPw = Math.max(1, ...st.ladder.filter(x => x.id).map(x => x.pw || 1));
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
    const T = [34, 38, 62, 75, 75, 75, 85, 82, 90];
    row(strat, '各境界时长中位数', durs.map(Math.round).join(' / '), T.join(' / ') + '，各 ±20%', durs.every((d, i) => within(d, T[i] * 0.8, T[i] * 1.2)));
    row(strat, '飞升周天', span(asc) + `，飞升率 ${pct(frac(recs, x => x.ascend !== undefined))}`, '中位数 580～660', within(ascMed, 580, 660));
    row(strat, '三年之约胜率', pct(pact), '85%～95%', within(pact, 0.85, 0.95), true);
    row(strat, '约战前已筑基', pct(zj), '60%～85%', within(zj, 0.60, 0.85));
    const mu60 = frac(recs, x => x.beatAt.mu !== undefined && x.beatAt.mu <= 60);
    row(strat, '击败慕容雪', `第 60 周天前 ${pct(mu60)}，中位数 ${med(recs.map(x => x.beatAt.mu))}`, '≥95% 在第 60 周天前', mu60 >= 0.95);
    const bz = med(recs.map(x => x.beatAt.zhao)), bc = med(recs.map(x => x.beatAt.chu)), bx = med(recs.map(x => x.beatAt.xue));
    row(strat, '击败赵乾 / 楚天阔 / 血无涯', `${bz} / ${bc} / ${bx}`, '72～110 / 190～300 / 340～480', within(bz, 72, 110) && within(bc, 190, 300) && within(bx, 340, 480));
    const r1 = frac(recs, x => x.rank1 !== undefined && (x.ascend === undefined || x.rank1 <= x.ascend)), r1m = med(recs.map(x => x.rank1));
    row(strat, '天骄榜第一', `${pct(r1)} 的种子在飞升前拿到，中位数 ${r1m}`, '50%～80%，中位数 510～600', within(r1, 0.5, 0.8) && within(r1m, 510, 600));
    const sr = [1, 2, 3, 4, 5, 6].map(k => med(recs.map(x => x.srankAt[k])));
    const ST = [[45, 65], [80, 110], [140, 190], [240, 300], [360, 430], [480, 560]];
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
    // SYSTEMS §7 / §10：天下大势、行情、货架、拍卖用得怎样
    row(strat, '（参考）大势 / 行情卖出 / 轮换货', `${med(recs.map(x => x.worlds))} 件 / ${L.fmt(med(recs.map(x => x.sold)))} 灵石（占历练收入 ${pct(med(recs.map(x => x.sold / Math.max(1, x.expStones))))}） / ${med(recs.map(x => x.shop))} 件`, '—');
    row(strat, '（参考）拍卖 出价 / 拿下 / 被人拍走；宿敌最高 ×', `${med(recs.map(x => x.bids))} / ${med(recs.map(x => x.aucWon))} / ${med(recs.map(x => x.aucLost))}；×${med(recs.map(x => x.rivalPw)).toFixed(2)}`, '—');
    // SYSTEMS §18 预算：功法系统（心法裸倍率之外的熟练、融会、共鸣、星斗；战技倍率、共鸣、融会）在筑基末、渡劫期的加成
    const at = (r, f) => med(recs.map(x => x.artAt[r] && x.artAt[r][f]));
    row(strat, '（参考）功法加成 筑基末 / 渡劫期', `修炼 ×${at(2, 'cul').toFixed(2)} / ×${at(8, 'cul').toFixed(2)}，战力 ×${at(2, 'atk').toFixed(2)} / ×${at(8, 'atk').toFixed(2)}，共鸣 ${at(8, 'combos')} 条`, '§18 全部新系统：筑基末 ×1.15 / ×1.5，渡劫 ×2.0 / ×4.5');
    row(strat, '（参考）约战时装着战技 / 克制慕容', `${pct(frac(recs, x => x.pactZ))} / ${pct(frac(recs, x => x.pactKe))}`, '—');
    const ga = (r, f) => med(recs.map(x => x.gearAt[r] && x.gearAt[r][f]));
    row(strat, '（参考）法宝 筑基末 / 渡劫期 / 飞升', `强化 ×${ga(2, 'plus').toFixed(2)} / ×${ga(8, 'plus').toFixed(2)} / ×${ga(9, 'plus').toFixed(2)}，词条当量 ×${ga(2, 'aff').toFixed(2)} / ×${ga(8, 'aff').toFixed(2)} / ×${ga(9, 'aff').toFixed(2)}`, '§18：强化 ×1.3、词条 ×1.15（后期）');
    row(strat, '（参考）法宝修炼加成（饰品、养气） 元婴 / 渡劫期', `×${ga(3, 'cul').toFixed(2)} / ×${ga(8, 'cul').toFixed(2)}`, '§18：饰品 +12%');
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
  console.log(`三种策略 × ${n} 个种子（PACT_POWER=${L.PACT_POWER}${L.DAOJI_ON === false ? '，道基关' : ''}${L.ARTS_ON === false ? '，功法系统关' : ''}${L.GEAR_ON === false ? '，法宝新东西关' : ''}${L.CAL_ON === false ? '，四季与大势关' : ''}${MARKET_SIM ? '' : '，guided 不用行情、拍卖、轮换货'}）`);
  console.log(pad('策略', w[0]) + pad('指标', w[1]) + pad('结果：中位数（10%～90% 分位）', w[2]) + pad('目标', w[3]) + '判定');
  for (const r of rows) console.log(pad(r[0], w[0]) + pad(r[1], w[1]) + pad(r[2], w[2]) + pad(r[3], w[3]) + r[4]);
  console.log(fails ? `\n${fails} 行未达标（其中门槛 ${gateFails} 行）` : '\n全部达标');
  return { fails, gateFails };
}

module.exports = { run, main, L };
if (require.main !== module) { /* 被 require 时只导出，不跑汇总 */ } else if (verbose) {
  const strat = only || 'guided';
  const rec = run(strat, seed0, true);
  const { st, ratio, ...rest } = rec; void st; void ratio;
  console.log(JSON.stringify(rest));
} else { const r = main(only, N); process.exitCode = r.gateFails || (process.argv.includes('strict') && r.fails) ? 1 : 0; }
