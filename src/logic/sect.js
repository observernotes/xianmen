/* 废柴仙途 · 逻辑模块 sect：宗门、身份、宝库、建设、会武、来犯、任务板
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 宗门
L.SECTS = [
  { id: 'jian', n: '太虚剑宗', d: '天下剑修圣地', perk: '战力 ×1.2；斩妖相性高一档；宝库法宝便宜三成', fit: '适合：爱历练', atk: 1.2, cul: 1, bt: 0, color: '#4aa8ff' },
  { id: 'dan', n: '丹霞谷', d: '丹道第一宗门', perk: '突破 +10%；成丹率 +15%、丹效 ×1.3；手里破境丹不足 6 枚时，每 6 月俸禄附一枚', fit: '适合：爱炼丹', atk: 1, cul: 1, bt: 0.1, pill: true, color: '#ff8a5c' },
  { id: 'dao', n: '玄天道宗', d: '传承万年的道法正宗', perk: '修炼 ×1.2；闭关花费 −30%，顿悟概率 30%→45%', fit: '适合：爱闭关', atk: 1, cul: 1.2, bt: 0, color: '#c27dff' },
];
L.DAN_PILL_CAP = 6;
// 宗门身份：r 需要的境界，c 需要的累计贡献，pay 俸禄倍率
// c 原为 80 × 5.2^(k−1)（SYSTEMS §18）：境界一到就升（guided 内门 38 / 真传 62 / 长老 186 / 太上 293 / 宗主 371）；
// 数值校准改成逐级给定，让贡献在境界之后才够（DESIGN §3.12：45～65 / 80～110 / 140～190 / 240～300 / 360～430 / 480～560，按 guided 一世的累计贡献曲线取）
const SC_T = [0, 530, 3400, 4000, 46000, 210000, 700000];
const SC = k => SC_T[k];
L.SRANKS = [
  { n: '外门弟子', r: 0, c: SC(0), pay: 0.5 },
  { n: '内门弟子', r: 1, c: SC(1), pay: 1 },
  { n: '真传弟子', r: 2, c: SC(2), pay: 1.5 },
  { n: '圣子', nf: '圣女', r: 3, c: SC(3), pay: 2.5, duel: true },
  { n: '长老', r: 4, c: SC(4), pay: 4 },
  { n: '太上长老', r: 6, c: SC(5), pay: 6 },
  { n: '宗主', r: 7, c: SC(6), pay: 10 },
];
L.sectOf = st => { if (!st.sect) return null; if (!st.sect.order) { st.sect.order = L.NINE.map(x => x.id); st.sect.veins = st.sect.veins || 0; st.sect.meets = st.sect.meets || 0; st.sect.best = st.sect.order.indexOf(st.sect.id) + 1; } return L.SECTS.find(x => x.id === st.sect.id); };
L.srankName = (st, i) => { const R0 = L.SRANKS[i]; return st.p.look.f && R0.nf ? R0.nf : R0.n; };
L.pay = st => (st.sect ? L.vein(st.p.r) * L.SRANKS[st.sect.rank].pay * L.sectPayMult(st) : 0);
L.addCulMod('sect', 40, st => { const sc = L.sectOf(st); return sc && sc.cul !== 1 ? ['宗门·' + sc.n, sc.cul, 'sect'] : null; });
L.addAtkMod('sect', 40, st => { const sc = L.sectOf(st); return sc && sc.atk !== 1 ? ['宗门·' + sc.n, sc.atk, 'sect'] : null; });
L.addIncSrc('pay', 30, st => (st.sect ? ['宗门俸禄·' + L.srankName(st, st.sect.rank), L.pay(st), 'sect'] : null));
// ---------- 九大宗门（宗门榜） ----------
// pos: 初始排名；champ: 会武代表；eq: 该名次代表相当于天骄榜第几名
L.NINE = [
  { id: 'kunlun', n: '昆仑仙宫', champ: '云无极', line: '昆仑之巅，从不为谁让路。' },
  { id: 'tianjian', n: '天剑宗', champ: '楚天阔', line: '当年的弃徒，也配代表一宗？' },
  { id: 'xuesha', n: '血煞魔宗', champ: '血无涯', line: '正道宗门？不过是待宰的羔羊。' },
  { id: 'wanfa', n: '万法阁', champ: '诸葛千机', line: '你的每一招，我都算到了。' },
  { id: 'jingang', n: '金刚寺', champ: '慧明大师', line: '师叔闭口三千年了，贫僧替他念一声佛。' },
  { id: 'jian', n: '太虚剑宗', champ: '剑十三', line: '我这一剑，你接不住。' },
  { id: 'dao', n: '玄天道宗', champ: '玄微子', line: '道法自然，胜负亦然。请。' },
  { id: 'dan', n: '丹霞谷', champ: '丹红袖', line: '丹修也能打，你信不信？' },
  { id: 'yushou', n: '御兽山', champ: '驭天风', line: '我的兽群，会把你撕成碎片。' },
];
const NINE_EQ = [3, 9, 16, 26, 38, 50, 62, 74, 88];
L.ninePower = (st, pos) => L.rivalCurve(st, NINE_EQ[pos - 1]);
L.sectOrder = st => (st.sect ? st.sect.order : null);
L.sectPos = st => (st.sect ? st.sect.order.indexOf(st.sect.id) + 1 : 0);
L.sectPayMult = st => { if (!st.sect || !st.sect.order) return 1; const b = st.sect.build || {}; return (1 + 0.08 * (9 - L.sectPos(st))) * (1 + 0.25 * (st.sect.veins || 0)) * (1 + 0.25 * (b.vein || 0)); };
L.nineAt = (st, pos) => L.NINE.find(x => x.id === st.sect.order[pos - 1]);
// 晋升条件：境界、累计贡献（圣子那一级另要当众击败原圣子，见 L.promote）。
// 其它条件用 L.addPromoReq 接进来，fn(st, 目标身份序号) → { t, ok } 或 null（人脉：圣子、宗主需两位长老支持 ≥ 50，见 sect2.js）
L.PROMO_REQS = [];
L.addPromoReq = (id, fn) => { L.PROMO_REQS = L.PROMO_REQS.filter(x => x.id !== id).concat([{ id, fn }]); };
L.promoteNeeds = function (st) {
  const nx = st.sect && L.SRANKS[st.sect.rank + 1];
  if (!nx) return [];
  const a = [{ k: 'realm', t: `境界达到${L.REALMS[nx.r].n}期`, ok: st.p.r >= nx.r }, { k: 'contrib', t: `累计贡献 ${L.fmt(st.sect.total)} / ${L.fmt(nx.c)}`, ok: st.sect.total >= nx.c, v: st.sect.total / nx.c }];
  for (const q of L.PROMO_REQS) { const x = q.fn(st, st.sect.rank + 1); if (x) a.push(x); }
  return a;
};
L.canPromote = st => !!st.sect && !!L.SRANKS[st.sect.rank + 1] && L.promoteNeeds(st).every(x => x.ok);
// 一趟 k 号地点乙等历练的贡献；任务、论道、会武的贡献都以它为单位
L.CONTRIB = { base: 10, grow: 2.3, tour: 1, meet: 2, task: 2 };
L.contribFor = k => Math.floor(L.CONTRIB.base * Math.pow(L.CONTRIB.grow, k));
function addContrib(st, v) { v = Math.floor(v); if (!st.sect || v <= 0) return 0; st.sect.total += v; st.sect.pts += v; return v; }
L.addContrib = addContrib;
// 宗门宝库（贡献兑换）。功法是各宗独有的四门（CONTENT §9，见 arts.js 的 L.vaultArts），按身份开放
// 法宝（vwep）：身份每高一级阶 +1；够到 5 阶时先给本宗的镇宗法宝（太虚剑 / 丹霞鼎 / 玄天拂尘，固定词条，gear.js 的 L.VAULT_GEAR）
// 器堂灵矿（vore）；器方（vplan，太虚剑宗长老起换《万剑匣》）
L.VAULT = [
  { k: 'vart', n: '秘传功法', d: '本宗不传之秘（四门，按身份开放）' },
  { k: 'vwep', n: '镇宗法宝', d: '借出镇宗之宝，归你所有' },
  { k: 'vpill', n: '破境丹 ×2', d: '宗门丹房特供' },
  { k: 'vore', n: '器堂灵矿', d: '强化、打造用', gear: 'plus' },
  { k: 'vplan', n: '器方《万剑匣》', d: '剑宗器堂长老的绝学：兵器 5 阶，锋锐、通灵', sect: 'jian', rank: 4, plan: 'g_jianyi' },
];
L.vaultShown = (st, v) => (!v.gear || L.gearOpen(st, v.gear)) && (!v.sect || (st.sect && st.sect.id === v.sect)) && (!v.plan || !L.planOwned(st, v.plan));
L.vaultGear = function (st) {
  const tier = L.vaultTier(st, 'vwep'), uid = L.VAULT_GEAR[st.sect.id];
  if (uid && tier >= 5 && !st.gear.vaultU[st.sect.id]) { const B = L.gearBase(uid); return { base: uid, slot: B.slot, tier: B.t, n: B.n, unique: true, aff: B.fixed }; }
  return { slot: 'w', tier, n: L.WEAPONS[tier].n + '一件' };
};
L.vaultGearOk = st => { const v = L.vaultGear(st); return v.unique ? L.gearOpen(st, v.slot) : L.gearTier(st, 'w') < v.tier; };
L.vaultOreN = st => 25 * L.oreUnit(st);
L.vaultTier = (st, k) => { const up = Math.floor(((st.sect.build || {}).lib || 0) / 2); if (k === 'vart') { const A = L.vaultArtNext(st); return A ? A.t : 0; } return k === 'vwep' ? Math.min(7, st.sect.rank + 2 + up) : 0; };
L.vaultCost = function (st, k) {
  if (k === 'vpill') return Math.floor(15 * Math.pow(2.3, st.p.r));
  if (k === 'vore') return Math.floor(12 * Math.pow(2.3, st.p.r));
  if (k === 'vplan') return Math.floor(40 * Math.pow(3.2, 4));
  if (k === 'vart') { const A = L.vaultArtNext(st); return A ? L.vaultArtCost(st, A) : Infinity; }
  if (st.sect.freePick > 0) return 0;   // 札记奖励：宝库任选一件
  return Math.floor((k === 'vart' ? 40 : 60) * Math.pow(3.2, st.sect.rank) * (k === 'vwep' && st.sect.id === 'jian' ? 0.7 : 1));
};
// 宗主建设：成为宗主后灵石的去处
L.BUILDS = [
  { k: 'ward', n: '护山大阵', d: '宗门战事按战力 ×1.15/级 计算' },
  { k: 'lib', n: '藏经阁', d: '每 2 级宝库兑换阶 +1' },
  { k: 'vein', n: '灵脉', d: '俸禄 +25%/级' },
];
L.buildCost = lv => 2e6 * Math.pow(3, lv);
L.sectBuild = function (st, k) {
  if (!st.sect || st.sect.rank < 6 || !L.BUILDS.some(b => b.k === k)) return false;
  const b = st.sect.build || (st.sect.build = { ward: 0, lib: 0, vein: 0 });
  if (b[k] >= 5 || st.stones < L.buildCost(b[k])) return false;
  st.stones -= L.buildCost(b[k]); b[k]++; st.flags.spentAt = st.tick;
  L.log(st, `宗门建设：${L.BUILDS.find(x => x.k === k).n}升至 ${b[k]} 级`, 'gold');
  L.checkQuests(st);
  return true;
};

// ---------- 宗门 ----------
L.joinSect = function (st, id) {
  const sc = L.SECTS.find(x => x.id === id); if (!sc || st.sect) return false;
  st.sect = { id, rank: 0, total: 0, pts: 0, joined: st.tick, veins: 0, order: L.NINE.map(x => x.id), meets: 0, best: 9, tasks: [], build: { ward: 0, lib: 0, vein: 0 }, freePick: 0 };
  st.sect.best = L.sectPos(st);
  L.rollTasks(st);
  L.log(st, `拜入${sc.n}，成为外门弟子`, 'gold');
  L.fireTrigger(st, 'sect');
  L.checkQuests(st);
  return true;
};
// 原圣子（或圣女）的战力：元婴中期裸装 × 2.3 × 1.5（SYSTEMS §18：为后续系统的战力预算 ×1.5）
L.heirPower = () => P.pw0 * Math.pow(P.pwStage, 13) * Math.pow(P.pwRealm, 3) * 2.3 * 1.5;
L.promote = function (st) {
  if (!L.canPromote(st)) return null;
  const nx = L.SRANKS[st.sect.rank + 1];
  const res = { from: st.sect.rank, to: st.sect.rank + 1 };
  if (nx.duel) {
    const foe = { kind: 'heir', sect: st.sect.id };
    const S = L.duelPower(st, foe), Q = L.heirPower(st);
    const p = L.duelP(st, S, Q, foe);
    if (L.revealFoe) L.revealFoe(st, foe);
    res.duel = { S, Q, p, win: L.duelWin(st, S, Q, foe, p) };
    if (!res.duel.win) { st.flags.promoFail = st.tick; L.log(st, `挑战原${L.srankName(st, st.sect.rank + 1)}失利，来日再战`, 'red'); return res; }
  }
  st.sect.rank++;
  res.ok = true;
  L.fireTrigger(st, 'srank:' + st.sect.rank);
  L.log(st, `全宗震动！晋升${L.SECTS.find(x => x.id === st.sect.id).n}${L.srankName(st, st.sect.rank)}`, 'gold');
  L.checkQuests(st);
  return res;
};
L.vaultBuy = function (st, k) {
  if (!st.sect) return null;
  const c = L.vaultCost(st, k);
  if (st.sect.pts < c) return null;
  if (k === 'vpill') { st.sect.pts -= c; st.pills += 2; return { k }; }
  if (k === 'vore') { if (!L.gearOpen(st, 'plus')) return null; st.sect.pts -= c; return { k, ore: L.addOre(st, L.vaultOreN(st)) }; }
  if (k === 'vplan') { const v = L.VAULT.find(x => x.k === k); if (st.sect.id !== v.sect || st.sect.rank < v.rank || L.planOwned(st, v.plan)) return null; st.sect.pts -= c; return { k, planText: L.givePlan(st, v.plan) }; }
  // 秘传功法：身份够得着的下一门（指定哪一门用 L.vaultBuyArt）
  if (k === 'vart') { const A = L.vaultArtNext(st); return A ? L.vaultBuyArt(st, A.id) : null; }
  if (!L.vaultGearOk(st)) return null;
  const v = L.vaultGear(st);
  if (st.sect.freePick > 0) st.sect.freePick--; else st.sect.pts -= c;
  if (v.unique) st.gear.vaultU[st.sect.id] = 1;
  const out = { k, it: L.gearDrop(st, v.slot, v.tier, { base: v.base, src: 'vault' }) };
  L.checkQuests(st);
  return out;
};
// 天剑宗来犯：对手是天剑宗长老团（约等于炼虚中期的强者；SYSTEMS §18：×7 再 ×3）
L.warPower = () => P.pw0 * Math.pow(P.pwStage, 21) * Math.pow(P.pwRealm, 5) * 7 * 3;
L.wardMult = st => Math.pow(1.15, (st.sect && st.sect.build && st.sect.build.ward) || 0);
L.sectWar = function (st) {
  const foe = { kind: 'war', id: 'tianjian' };
  const lead = (L.rivalLeads ? L.rivalLeads(st) : []).find(x => x.nine === 'tianjian');   // 恩怨 ≥ 60 的赵乾 / 楚天阔带头：来敌战力 ×1.1～1.2（rivals2.js）
  const S = L.duelPower(st, foe) * L.wardMult(st), Q = L.warPower(st) * (lead ? lead.m : 1);
  const p = L.duelP(st, S, Q, foe);
  if (L.revealFoe) L.revealFoe(st, foe);
  const win = L.duelWin(st, S, Q, foe, p);
  const res = { S, Q, p, win, lead };
  if (win) {
    st.flags.warWon = 1;
    res.contrib = addContrib(st, L.contribFor(L.homeRegion(st)) * 3);
    res.stones = Math.floor(L.income(st) * 10 + 500);
    st.stones += res.stones;
    L.log(st, '天剑宗大举来犯，你一人一剑立于山门，杀退来敌！', 'gold');
  } else {
    st.flags.war = st.tick + 24;
    L.log(st, '天剑宗来犯，宗门苦战方才退敌……此仇必报', 'red');
  }
  L.checkQuests(st);
  return res;
};

// 九宗会武：你作为本宗代表，挑战排名更高的宗门
L.sectMeet = function (st) {
  if (!st.sect) return null;
  st.sect.meets++;
  const S = L.power(st);
  const res = { n: st.sect.meets, start: L.sectPos(st), rounds: [], S };
  for (let j = 0; j < 3; j++) {
    const pos = L.sectPos(st);
    const q = pos === 1 ? 2 : pos - 1;
    const foe = L.nineAt(st, q);
    const Q = L.ninePower(st, q);
    const fo = { kind: 'sect', id: foe.id };
    const Sr = L.duelPower(st, fo);
    const p = L.duelP(st, Sr, Q, fo);
    if (L.revealFoe) L.revealFoe(st, fo);
    let win = L.duelWin(st, Sr, Q, fo, p), xx = false;
    // 玄霄在手：老祖“请出手”，每届 2 次，输掉的一场重掷（gear.js）
    if (!win && L.gearXuanxiao(st) && (res.xx || 0) < L.XX_TIMES) { res.xx = (res.xx || 0) + 1; xx = true; win = L.duelWin(st, Sr, Q, fo, p); }
    const rd = { q, foe, Q, S: Sr, p, win, defend: pos === 1, xx };
    if (win) {
      if (pos > 1) { const o = st.sect.order; [o[pos - 1], o[q - 1]] = [o[q - 1], o[pos - 1]]; }
      st.stats.meetWins = (st.stats.meetWins || 0) + 1;
      rd.contrib = addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.meet);
      rd.stones = Math.floor(L.income(st) * 5 + 100); st.stones += rd.stones;
      if (foe.id === 'tianjian') st.flags.beatTianjian = (st.flags.beatTianjian || 0) + 1;
    }
    res.rounds.push(rd);
    if (!win || rd.defend) break;
  }
  res.end = L.sectPos(st);
  st.sect.best = Math.min(st.sect.best, res.end);
  L.log(st, `第${res.n}届九宗会武落幕，${L.sectOf(st).n}位列天下第 ${res.end} 宗`, res.end < res.start ? 'gold' : '');
  L.checkQuests(st);
  return res;
};

// ---------- 宗门任务板：每届论道（12 月）刷新 3 个，可同时接 ----------
// ty: exp 指定地点行事评价乙 / herbs 上交灵草 / pill 上交破境丹 / tour 论道赢一场 / boss 击败首领
//     act 闭关·炼丹两次·越级一次 / escort 护送同门（本趟灵石归宗门，贡献 ×3）/ teach 指点师弟（4 月，贡献 ×2）
L.TASK_N = { exp: '历练', herbs: '上交灵草', pill: '上交丹药', tour: '论道', boss: '讨伐首领', act: '修行', escort: '护送同门', teach: '指点师弟' };
L.rollTasks = function (st) {
  const sc = st.sect; if (!sc) return;
  const home = L.homeRegion(st), r = Math.min(st.p.r, 8), std = Math.floor(L.contribFor(home) * L.CONTRIB.task);
  const bossK = []; for (let k = 0; k <= home; k++) if (L.bossReady(st, k)) bossK.push(k);
  const pool = [['exp', 3], ['herbs', 2], ['pill', 2], ['tour', st.pact ? 2 : 0], ['act', 3], ['escort', 1.5], ['teach', 1.5], ['boss', bossK.length ? 2 : 0]].filter(x => x[1] > 0);
  // 别的模块登记的任务类型（sect2.js：炼器 / 驯兽 / 探秘 / 讲法）：L.TASK_X[ty] = { n, w(st), init(st, t, std, r), text(st, t), … }；L.taskPoolMod(st, pool) 改权重（职司）
  for (const ty in L.TASK_X) { const w = L.TASK_X[ty].w(st); if (w > 0) pool.push([ty, w]); }
  if (L.taskPoolMod) L.taskPoolMod(st, pool);
  const tasks = [];
  while (tasks.length < 3 && pool.length) {
    const ty = wpick(pool); pool.splice(pool.findIndex(x => x[0] === ty), 1);
    const t = { ty, need: 1, prog: 0, taken: 0, done: 0, rw: std };
    if (ty === 'exp' || ty === 'escort') {
      t.k = home > 0 && R() < 0.4 ? home - 1 : home;
      const as = [0, 1, 2].filter(a => L.apprOpen(st, a));
      t.a = ty === 'exp' ? pick(as) : 0;
      if (ty === 'escort') t.rw = 0;
    } else if (ty === 'herbs') t.n = 6 * (1 + r);
    else if (ty === 'pill') t.n = 1;
    else if (ty === 'boss') { t.k = pick(bossK); t.rw = Math.floor(std * 1.5); }
    else if (ty === 'teach') t.rw = std * 2;
    else if (ty === 'act') {
      const fav = (L.taskActFav && L.taskActFav(st)) || { dao: 'retreat', dan: 'craft', jian: 'leap' }[sc.id] || 'leap';
      t.sub = R() < 0.6 ? fav : pick(['retreat', 'craft', 'leap']);
      if (t.sub === 'craft' && st.home.furnace < 1) t.sub = 'retreat';
      if (t.sub === 'craft') t.need = 2;
    } else if (L.TASK_X[ty]) L.TASK_X[ty].init(st, t, std, r);
    t.bonus = pick([{ pills: 1 }, { herbs: 4 * (1 + r) }, { inc: 3 }]);
    tasks.push(t);
  }
  sc.tasks = tasks; sc.taskAt = st.tick;
};
L.taskText = function (st, t) {
  switch (t.ty) {
    case 'exp': return `去【${L.REGIONS[t.k].n}】${L.APPR[t.a].n}，评价乙以上`;
    case 'herbs': return `上交灵草 ${t.n} 株`;
    case 'pill': return '上交破境丹 1 枚';
    case 'tour': return '本届论道至少赢 1 场';
    case 'boss': return `击败【${L.REGIONS[t.k].n}】首领${L.BOSSES[t.k].n}`;
    case 'act': return t.sub === 'retreat' ? '闭关 1 次' : t.sub === 'craft' ? `炼丹 2 次（${t.prog}/2）` : '越级历练成功 1 次';
    case 'escort': return `护送同门去【${L.REGIONS[t.k].n}】（本趟灵石归宗门，贡献 ×3）`;
    case 'teach': return '指点师弟（4 月不涨修为，贡献 ×2）';
  }
  return L.TASK_X[t.ty] ? L.TASK_X[t.ty].text(st, t) : '';
};
L.taskReward = (st, t) => (t.ty === 'escort' ? '贡献 ×3（随本趟历练结算）' : '贡献+' + L.fmt(t.rw)) + ' ' + L.rewardText(st, t.bonus);
L.TASK_X = {};
function taskDone(st, t) {
  if (t.done) return;
  t.done = 1; t.taken = 1;
  addContrib(st, t.rw);
  L.grantReward(st, t.bonus);
  st.stats.sectTasks = (st.stats.sectTasks || 0) + 1;
  L.log(st, `【宗门任务】${L.TASK_N[t.ty]}完成，${L.taskReward(st, t)}`, 'jade');
  if (L.onTaskDone) L.onTaskDone(st, t);   // 人脉：管这类任务的长老支持 +（sect2.js）
  emit('task', t);
}
function taskHit(st, ty, test) {
  if (!st.sect || !st.sect.tasks) return;
  for (const t of st.sect.tasks) if (t.ty === ty && t.taken && !t.done && (!test || test(t))) { t.prog++; if (t.prog >= t.need) taskDone(st, t); }
}
L.taskHit = taskHit;
L.taskDone = taskDone;
// 接取。指点师弟接下就开始（要人在洞府且空闲）
L.taskTake = function (st, i) {
  const t = st.sect && st.sect.tasks && st.sect.tasks[i];
  if (!t || t.taken || t.done) return false;
  if (t.ty === 'teach') { if (!L.startRetreat(st, { kind: 'teach', m: 0, task: i })) return false; }
  const X = L.TASK_X[t.ty]; if (X && X.take && !X.take(st, t, i)) return false;
  t.taken = 1;
  return true;
};
// 上交类任务（灵草 / 破境丹）
L.taskCanDeliver = (st, t) => !!t && t.taken && !t.done && ((t.ty === 'herbs' && st.herbs >= t.n) || (t.ty === 'pill' && st.pills >= t.n) || (!!L.TASK_X[t.ty] && !!L.TASK_X[t.ty].canDeliver && L.TASK_X[t.ty].canDeliver(st, t)));
L.taskDeliver = function (st, i) {
  const t = st.sect && st.sect.tasks && st.sect.tasks[i];
  if (!L.taskCanDeliver(st, t)) return false;
  if (t.ty === 'herbs') st.herbs -= t.n; else if (t.ty === 'pill') st.pills -= t.n; else L.TASK_X[t.ty].deliver(st, t);
  taskDone(st, t);
  L.checkQuests(st);
  return true;
};
});
