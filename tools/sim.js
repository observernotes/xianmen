// 数值模拟：三种玩法各跑 200 个种子，输出汇总并对照 docs/DESIGN.md §3.12 的目标区间
//   node tools/sim.js                 三种策略 × 200 种子的汇总表
//   node tools/sim.js guided 50       只跑 guided，50 个种子
//   node tools/sim.js guided 1 v 7    种子 7 跑一局，每 12 周天打印一行状态
//   node tools/sim.js all 200 strict  任何一行未达标都返回退出码 1（默认只看三年之约公平这道门槛）
//   node tools/sim.js all 200 noarts  关掉功法系统的新加成（L.ARTS_ON = false：只剩心法的裸倍率），与默认对照量 SYSTEMS §18 的预算
// 策略：
//   guided 空闲就行动；快圆满时留在家；灵石按“聚灵阵 > 灵田 > 丹炉 > 洞府”的折算价升级；每两趟历练闭关一次；
//          突破带尽量多的丹（最多 3 枚）；地点选“预计评价 ≥ 乙”的最高一格；接宗门任务、吐纳、看访客；
//          功法：三槽按 L.artBest 取最优搭配（算上熟练、融会、共鸣），出门前换上克制当地的战技，约战、首领、会武前换上克制对手的
//   lazy   （SYSTEMS §18 第 6 条）会做访客和宗门任务；每届论道（12 周天）之前出门历练两趟，每次出门前只买一样东西；
//          不闭关、不吐纳、不碰新系统；突破最多带 2 枚丹；功法只照掉落卡的默认点【换上】（同类更强才换），不凑共鸣、不换克制
//   idle   什么都不做，只在修为圆满时突破
// 被 require 时导出 { run, L }，可以在别的脚本里换策略或统计（tools/ 之外的分析脚本用）
const L = require('../src/logic.js');
const arg = process.argv.slice(2);
if (arg.includes('noarts')) L.ARTS_ON = false;
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
  const p = st.p;
  if (strat === 'guided') {
    if (p.inj > 0 && st.pills > 0) L.heal(st);
    for (let i = 0; i < 3; i++) if (st.pills < 3 && !L.btGuard(st) && !st.flags.sureBt && st.stones >= L.price(st, 'pill')) L.buy(st, 'pill');
    if (p.r === 8 && !st.flags.sureBt && !L.canCraft(st, 'jiuzhuan')) L.craft(st, 'jiuzhuan');
  } else if (strat === 'lazy') {
    if (st.pills < 1 && st.stones >= L.price(st, 'pill')) L.buy(st, 'pill');
  }
  let n = strat === 'idle' ? Math.min(3, st.pills) : 0;
  if (strat !== 'idle') { n = Math.min(3, st.pills); while (n > 0 && L.btRate(st, n - 1) >= 0.995) n--; }
  if (strat === 'lazy') n = Math.min(n, 2);
  const x0 = L.artSlots(st)[0];
  const art = { cul: L.artCulMult(st) / (x0 ? L.ARTS[L.art(x0).t].m : 1), atk: L.artAtkMult(st), combos: Object.keys(st.meta.combo || {}).length };
  const r = L.breakthrough(st, n);
  if (r && r.ok) { rec.realmAt[r.to] = st.tick; rec.artAt[r.to] = art; }
}

function actGuided(st, rec, seed) {
  const p = st.p;
  if (p.r > L.MAXR) return;
  if (L.tunaReady(st)) L.tuna(st);
  artOpt(st);
  // 灵石：先留够闭关和丹药的钱，其余按折算价升级
  for (let loop = 0; loop < 30; loop++) { const u = cheapestUp(st); if (!u || st.stones < u.c || !L.upgrade(st, u.k)) break; }
  const r = Math.min(p.r, 8);
  const capW = L.boxCap(st, 'w'), capA = L.boxCap(st, 'a');
  if ((p.w < capW || L.artPity(st, capA) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * (st.boxMiss >= 2 ? 1 : 1.5)) L.buy(st, 'box');
  if (L.marketOpen(st, 'egg') && (!p.pet || p.pet.tier < Math.min(6, 1 + Math.floor(r * 0.6))) && st.stones >= L.price(st, 'egg') * 1.5) L.buy(st, 'egg');
  if (st.pills < 2 && st.stones >= L.price(st, 'pill') * 3) L.buy(st, 'pill');
  if (L.lifeLow(st) && L.marketOpen(st, 'life') && L.lifeTicks(st) < 60 && st.stones >= L.price(st, 'life')) L.buy(st, 'life');
  if (L.auctionOpen(st)) st.auction.items.forEach((it, i) => { if (!it.sold && ['w', 'a', 'frag', 'xisui'].includes(it.k) && st.stones >= it.price) L.auctionBuy(st, i); });
  if (st.sect) {
    if (L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 6) { const pr = L.promote(st); if (pr && pr.ok) rec.srankAt[st.sect.rank] = st.tick; }
    for (const k of ['vart', 'vwep']) if (st.sect.pts >= L.vaultCost(st, k)) L.vaultBuy(st, k);
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
  else if ((p.w < Math.min(7, 1 + r) || L.artPity(st, Math.min(6, 1 + r)) || !st.arts.firstBox) && st.stats.exp >= 1 && st.stones >= L.price(st, 'box') * 2) L.buy(st, 'box');
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
  const rec = { realmAt: {}, srankAt: {}, beatAt: {}, artAt: {}, ratio: [], maxPills: 0, passive: 0, streak: 0, maxStreak: 0, lifeRed: false };
  const maxT = strat === 'idle' ? 700 : strat === 'lazy' ? 1700 : 1300;
  for (let n = 0; n < maxT; n++) {
    const p = st.p;
    tryBreak(st, rec, strat);
    if (p.r >= 9) { rec.ascend = st.tick; break; }
    if (strat === 'guided') actGuided(st, rec, seed);
    else if (strat === 'lazy') actLazy(st, rec);
    if (strat === 'lazy') artLazy(st);
    if (strat === 'guided' && !st.pact && st.tick === L.PACT_TICK - 1) artFor(st, { foe: L.PACT_FOE });
    if (strat === 'guided' && st.sect && st.tick % L.MEET_EVERY === L.MEET_AT - 1) { const pos = L.sectPos(st); artFor(st, { foe: { kind: 'sect', id: L.nineAt(st, pos === 1 ? 2 : pos - 1).id } }); }
    rec.passive += L.income(st);
    const out = L.tick(st);
    if (out.choice && strat !== 'idle') pickChoice(st, out.choice);
    if (out.visitor && strat !== 'idle') pickChoice(st, out.visitor);
    while (st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) { if (strat === 'idle') L.resolveChoice(st, ev, ev.choices.findIndex(c => L.costOk(st, c.cost))); else pickChoice(st, ev); } }
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
      console.log(`t${st.tick} 岁${Math.floor(p.age)}/${Math.floor(L.lifespan(st))} ${L.stageName(p)} 根${p.t} 器${p.w} 功${sl}(${Object.keys(st.arts.own).length}门,共鸣${Object.keys(st.meta.combo).length}) 宠${p.pet ? p.pet.tier : 0} 战力=${L.fmt(L.power(st))} 修炼×${(L.gainBase(st) / L.g0(Math.min(L.si(p), 35))).toFixed(1)} 灵石=${L.fmt(st.stones)} 收入=${L.fmt(L.income(st))} 洞府=${st.home.array}/${st.home.field}/${st.home.furnace}/${st.home.cave} 榜=${st.rank} 宗=${st.sect ? st.sect.rank + '/' + L.fmt(st.sect.total) : '-'} 丹=${st.pills} 草=${Math.floor(st.herbs)} 历练=${st.stats.exp}(${st.lastExp ? st.lastExp.k + '.' + st.lastExp.d : '-'}) 败=${st.stats.btFails}`);
    }
  }
  rec.btFails = st.stats.btFails; rec.expStones = st.stats.expStones; rec.endR = st.p.r; rec.endTick = st.tick;
  rec.sectTasks = st.stats.sectTasks; rec.trips = st.stats.exp; rec.dings = st.stats.dings; rec.st = trace ? st : null;
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
    const er = med(recs.map(x => x.expStones / Math.max(1, x.passive)));
    row(strat, '历练收入 : 被动收入', er.toFixed(2), '0.8～1.5', within(er, 0.8, 1.5));
    row(strat, '（参考）历练趟数 / 丁等 / 宗门任务', `${med(recs.map(x => x.trips))} / ${med(recs.map(x => x.dings))} / ${med(recs.map(x => x.sectTasks))}`, '—');
    // SYSTEMS §18 预算：功法系统（心法裸倍率之外的熟练、融会、共鸣、星斗；战技倍率、共鸣、融会）在筑基末、渡劫期的加成
    const at = (r, f) => med(recs.map(x => x.artAt[r] && x.artAt[r][f]));
    row(strat, '（参考）功法加成 筑基末 / 渡劫期', `修炼 ×${at(2, 'cul').toFixed(2)} / ×${at(8, 'cul').toFixed(2)}，战力 ×${at(2, 'atk').toFixed(2)} / ×${at(8, 'atk').toFixed(2)}，共鸣 ${at(8, 'combos')} 条`, '§18 全部新系统：筑基末 ×1.15 / ×1.5，渡劫 ×2.0 / ×4.5');
    row(strat, '（参考）约战时装着战技 / 克制慕容', `${pct(frac(recs, x => x.pactZ))} / ${pct(frac(recs, x => x.pactKe))}`, '—');
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
  console.log(`三种策略 × ${n} 个种子（PACT_POWER=${L.PACT_POWER}${L.ARTS_ON === false ? '，功法系统关' : ''}）`);
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
