/* 废柴仙途 · 逻辑模块 trip：历练一趟 = 4～6 个节点、一月一个（docs/COMBAT_LOOT.md §2.1、§2.3、§2.5）；首领战换引擎（§8.4 P0）
 * 模块写法见 src/logic.js 顶部说明。排在 expedition 之后（包 L.startExp、L.resolveExp、L.fightBoss、L.artExp、L.expOre）。
 *
 *   st.exp 多出：seed、nodes [{ t: 'fight'|'elite'|'boss'|'treasure'|'herb'|'home', n }]、ni（已走完的节点数）、hp（0～1）、rage、lastHp、pol、
 *                bt { fights, won, dead, fled, brk, pill, eliteWin, eliteId, eliteEl, ke, beike, kills, mats, treasure, herbN, budongUsed, escaped }
 *   每过一个月（tick.js 调 L.expNodeTick）消费一个节点：界面已经打完（L.expNodeDone 把 ni 推过这个月）就跳过，否则 L.battleAuto(B, e.pol) 打完。
 *   倒下 / 撤：这一趟在本月结束（e.left = 1，tick 里减到 0 就结算）。评价 L.expRating（§2.3）。
 *   预计评价 L.tripDist：同一套节点、20 个种子跑 'auto'，按战力档、招式、地点缓存。
 *   旧档里走到一半、没有 nodes 的历练照旧规则（分数）结算。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R } = L.U;
L.TRIP_ON = L.TRIP_ON === undefined ? true : L.TRIP_ON;
const ON = () => L.TRIP_ON !== false;
const FIGHT = { fight: 1, elite: 1, boss: 1 };
L.nodeIsFight = n => !!(n && FIGHT[n.t]);
L.NODE_N = { fight: '战', elite: '精', boss: '首', treasure: '宝', herb: '采', home: '归' };

// ---------- 节点表（§2.1） ----------
// 第一世前两趟没有精英（§1.3：第 3 趟才出现带罩的精英）
L.tripSeq = st => (st.rebirth || 0) === 0 ? (st.stats.exp || 0) + 1 : 99;
L.expNodes = function (st, k, d, a, len) {
  let core;
  if (a === 1) core = [{ t: 'fight', n: 1 }, { t: 'treasure' }, { t: 'elite' }];
  else if (a === 2) core = [{ t: 'herb' }, { t: 'herb' }, { t: 'fight', n: 2 }];
  else core = [{ t: 'fight', n: 1 }, { t: 'fight', n: 2 }, { t: 'elite' }];
  const base = 4 + (k >= 3 ? 1 : 0) + (k >= 7 ? 1 : 0);
  if (base >= 5) core.splice(1, 0, { t: 'fight', n: 1 });
  if (base >= 6) core.splice(core.length - 1, 0, { t: 'elite' });
  if (st && L.tripSeq(st) <= 2) core = core.map(n => (n.t === 'elite' ? { t: 'fight', n: 2 } : n));
  if (st && L.tripSeq(st) === 1) core = core.map((n, i) => (i === 1 && n.t === 'fight' ? { t: 'fight', n: 1 } : n));   // 人生第一趟：前两场各一只
  // 时长被御风诀、轻灵缩短：先去掉非战斗节点，再去掉单只小怪的战
  const want = Math.max(1, (len || base) - 1);
  while (core.length > want) {
    let i = core.findIndex(n => !FIGHT[n.t]);
    if (i < 0) i = core.findIndex(n => n.t === 'fight' && n.n === 1);
    if (i < 0) i = 0;
    core.splice(i, 1);
  }
  while (core.length < want) core.splice(0, 0, { t: a === 2 ? 'herb' : 'fight', n: 1 });
  return core.concat([{ t: 'home' }]);
};
// 这一格的推荐战力（含大势），节点 i 的敌人
L.tripRec = (st, k, d, a) => L.rec(k, d) * (L.calExp ? L.calExp(st, k, d, a).rec : 1);
L.expNodeFoes = function (st, e, i) {
  const n = e.nodes[i]; if (!L.nodeIsFight(n)) return [];
  const row = L.cellFoes(e.k, e.d), Q = e.rq || L.tripRec(st, e.k, e.d, e.a), rng = L.btRng((e.seed || 1) * 31 + i * 977 + 7);
  if (n.t === 'boss') return [L.btFoe(L.bossFoeId(e.k), L.rec(e.k, 2))];
  if (n.t === 'elite') return [L.btFoe(row.elite, Q)];
  const out = [], cnt = n.n || 1;
  for (let j = 0; j < cnt; j++) out.push(L.btFoe(row.mobs[Math.floor(rng() * row.mobs.length)], Q, { hpM: cnt > 1 ? L.BAT.mob.two : 1 }));
  return out;
};
const pillsOf = st => (L.bagN ? L.bagN(st, 'liaoshang') : 0);
const takePill = st => { const b = st.dan && st.dan.bag && st.dan.bag.liaoshang; if (b && b.length) b.shift(); };
// 节点 i 的战斗（界面与 sim 共用）：B 的种子 = seed + i
L.expBattle = function (st, opt) {
  const e = st.exp; if (!e || !e.nodes) return null;
  const i = e.ni, n = e.nodes[i]; if (!L.nodeIsFight(n)) return null;
  const T = L.btPower(st, e.k, e.d, e.a);
  const gold = L.btMe(st, T).gold, foes = L.expNodeFoes(st, e, i);
  const seen = st.meta.foes || (st.meta.foes = {}); for (const f of foes) seen[f.id] = 1;   // 出发页“这一趟会遇到”：见过的才显示名字与五行（跨世保留）
  return L.battleNew(st, foes, (e.seed || 1) + i, Object.assign({ T, hp: e.hp, rage: e.rage, pills: pillsOf(st), budong: !!gold.budong && !e.bt.budongUsed, escaped: e.bt.escaped, first: L.tripSeq(st) === 1 && i === 0 }, opt || {}));
};
const newBt = () => ({ fights: 0, won: 0, dead: 0, fled: 0, brk: 0, pill: 0, eliteWin: 0, eliteId: '', eliteEl: '', ke: 0, beike: 0, kills: [], mats: { core: {} }, treasure: 0, herbN: 0, budongUsed: 0, escaped: 0, used: {} });
// 一个节点打完（界面打完一场调它；res 为空 = 非战斗节点）
L.expNodeDone = function (st, res) {
  const e = st.exp; if (!e || !e.nodes) return null;
  const i = e.ni, n = e.nodes[i]; if (!n) return null;
  const b = e.bt || (e.bt = newBt());
  if (L.nodeIsFight(n) && res) {
    b.fights++;
    b.brk += res.brk || 0; b.ke += res.ke || 0; b.beike += res.beike || 0;
    for (let j = 0; j < (res.pill || 0); j++) { takePill(st); b.pill++; }
    b.kills = b.kills.concat(res.kills || []);
    for (const el in (res.mats && res.mats.core) || {}) b.mats.core[el] = (b.mats.core[el] || 0) + res.mats.core[el];
    if (res.budongUsed) b.budongUsed = 1;
    if (res.escaped) b.escaped = 1;
    for (const id in res.used || {}) b.used[id] = (b.used[id] || 0) + (n.t === 'fight' ? 1 : 2);
    e.rage = res.rage || 0;
    if (res.win) {
      b.won++; e.lastHp = res.hp;
      if (res.elite) { b.eliteWin++; b.eliteId = res.eliteId; b.eliteEl = res.eliteEl; }
      const bw = L.btMe(st).pas, between = bw && bw.pas && bw.pas.k === 'between' ? bw.pas.v : L.BAT.between;
      const ys = L.gearAffN ? L.gearAffN(st, 'yangshang') : 0;
      e.hp = Math.min(1, res.hp + (ys ? Math.max(between, 0.20) : between));
    } else {
      e.hp = res.hp;
      if (res.dead) b.dead = 1; else b.fled = 1;
      e.left = Math.min(e.left, 1); e.chain = 0;
    }
  } else if (n.t === 'treasure') b.treasure++;
  else if (n.t === 'herb') b.herbN++;
  e.ni = i + 1;
  return res;
};
// 没人看着时（sim、读档、速战）这一月的节点按 e.pol 自动打
L.expNodeRun = function (st, policy) {
  const e = st.exp; if (!e || !e.nodes || e.ni >= e.nodes.length) return null;
  const B = L.expBattle(st);
  const res = B ? L.battleAuto(B, policy || e.pol || 'auto') : null;
  L.expNodeDone(st, res);
  return res;
};
// tick.js：每月先消费这一月的节点（界面已经打完就跳过）
L.expNodeTick = function (st) {
  const e = st.exp; if (!e || !e.nodes || !ON()) return;
  const m = e.total - e.left;   // 这是第几个月（0 起）
  if (e.ni <= m && e.ni < e.nodes.length && !e.bt.dead && !e.bt.fled) L.expNodeRun(st);
};
// 速战（§2.2）：这一格拿过甲、战力 ≥ 推荐 × 1.8
L.QUICK = 1.8;
L.quickOk = (st, k, d, a) => ON() && L.bestOf(st, k, d) >= 3 && L.btPower(st, k, d, a) >= L.tripRec(st, k, d, a) * L.QUICK;
// 剩下的战斗一次打完（速战、测试里直接结算的历练）
L.expRunRest = function (st, policy) {
  const e = st.exp; if (!e || !e.nodes) return;
  let g = 0;
  while (e.ni < e.nodes.length - 1 && !e.bt.dead && !e.bt.fled && g++ < 12) L.expNodeRun(st, policy);
};
// 评价（§2.3）
L.expRating = function (st, e) {
  const b = e.bt || newBt(), nf = e.nodes.filter(L.nodeIsFight).length;
  if (b.dead && b.won === 0) return 0;
  if (b.won < nf) return 1;
  const hp = e.lastHp === undefined ? e.hp : e.lastHp, cut = b.brk > 0 ? 0.10 : 0;
  return hp >= 0.75 - cut ? 4 : hp >= 0.45 - cut ? 3 : 2;
};

// ---------- 出发 ----------
{ const f0 = L.startExp; L.startExp = function (st, k, d, a, opt) {
  const ok = f0.apply(this, arguments);
  if (!ok || !ON() || !st.exp) return ok;
  const e = st.exp;
  e.seed = 1 + Math.floor(R() * 1e9);
  e.nodes = L.expNodes(st, e.k, e.d, e.a, e.total);
  e.ni = 0; e.hp = 1; e.rage = 0; e.bt = newBt(); e.rq = L.tripRec(st, e.k, e.d, e.a);
  e.pol = (opt && opt.pol) || st.btPol || 'auto';
  e.seq = L.tripSeq(st);
  delete e.plan.fix;   // 评价按打出来的定（第一趟的保底改成“必掉精钢剑”）
  return ok;
}; }

// ---------- 预计评价：同一套节点跑 20 个种子 ----------
const memo = new Map();
L.TRIP_N = 20;
L.tripDist = function (st, k, d, a) {
  const T = L.btPower(st, k, d, a), rq = L.tripRec(st, k, d, a), ratio = T / rq;
  const len = L.expLen(k, st), seq = L.tripSeq(st) <= 2 ? 1 : 0;
  if (ratio >= 4) return { dist: [0, 0, 0, 0, 1], dead: 0 };
  if (ratio <= 0.25) return { dist: [1, 0, 0, 0, 0], dead: 1 };
  const me = L.btMe(st, T);
  const key = [k, d, a, len, seq, Math.round(Math.log2(T / rq) * 24), me.el, me.skills.map(s => s.id + (s.el || '') + (s.lv || 0)).join(), me.ult.id, me.pas ? me.pas.id : '', Object.keys(me.aff).join(), Object.keys(me.ke).join(), Object.keys(me.gold).join(), Math.round(me.hpMax / L.BAT.hpK / Math.sqrt(T) * 20)].join('|');
  const hit = memo.get(key); if (hit) return hit;
  const nodes = L.expNodes(st, k, d, a, len), dist = [0, 0, 0, 0, 0];
  let dead = 0;
  for (let j = 0; j < L.TRIP_N; j++) {
    const e = { k, d, a, seed: 9001 + j * 7, nodes, rq, ni: 0, hp: 1, rage: 0, bt: newBt() };
    for (let i = 0; i < nodes.length && !e.bt.dead && !e.bt.fled; i++) {
      if (!L.nodeIsFight(nodes[i])) continue;
      const B = L.battleNew(st, L.expNodeFoes(st, e, i), e.seed + i, { me: JSON.parse(JSON.stringify(me)), T, hp: e.hp, rage: e.rage });
      const r = L.battleAuto(B, 'auto');
      e.bt.fights++; e.rage = r.rage; e.bt.brk += r.brk;
      if (r.win) { e.bt.won++; e.lastHp = r.hp; e.hp = Math.min(1, r.hp + L.BAT.between); } else { e.hp = r.hp; if (r.dead) e.bt.dead = 1; else e.bt.fled = 1; }
    }
    dist[L.expRating(st, e)]++;
    if (e.bt.dead) dead++;
  }
  const out = { dist: dist.map(x => x / L.TRIP_N), dead: dead / L.TRIP_N };
  if (memo.size > 600) memo.clear();
  memo.set(key, out);
  return out;
};

// ---------- 结算 ----------
{ const re0 = L.resolveExp; L.resolveExp = function (st) {
  const e = st.exp;
  if (!e || !e.nodes) return re0.apply(this, arguments);
  // 直接结算（测试、读档跳过）：没打的战斗自动打完；撤回的不打
  if (!e.recall && !e.cutF) L.expRunRest(st, e.pol);
  const b = e.bt || newBt();
  const res = re0.apply(this, arguments);
  if (!res) return res;
  res.bt = { fights: b.fights, won: b.won, nf: e.nodes.filter(L.nodeIsFight).length, dead: !!b.dead, fled: !!b.fled, hp: e.lastHp === undefined ? e.hp : e.lastHp, brk: b.brk, pill: b.pill, eliteWin: b.eliteWin, eliteId: b.eliteId, eliteEl: b.eliteEl, ke: b.ke, beike: b.beike, kills: b.kills, mats: b.mats, treasure: b.treasure, seq: e.seq };
  res.mats = b.mats;
  if (b.ke && !e.recall) st.stats.btKe = (st.stats.btKe || 0) + b.ke;   // 解锁表“战技·五行”的掌握信号：打出过“克”
  // 灵核入库（C2 的 L.matsAdd；没有就先记在 st.mats.core）
  if (!e.recall) {
    if (L.matsAdd) L.matsAdd(st, b.mats);
    else { st.mats = st.mats || {}; const c = st.mats.core || (st.mats.core = { jin: 0, mu: 0, shui: 0, huo: 0, tu: 0 }); for (const el in b.mats.core) c[el] = (c[el] || 0) + b.mats.core[el]; }
  }
  // 熟练：放过的战技每场 +1、打精英 +2（§3.3）
  if (!e.recall && L.ARTS_ON !== false) for (const id in b.used) if (L.art(id)) L.addMastery(st, id, b.used[id] * L.artRate(st));
  // 归途翻牌：第一章保底脚本（§5.6 / §7.3）由这里定，C2 的 L.tripLoot 必须排进牌里
  const must = [];
  if (e.seq === 1) must.push({ kind: 'gear', base: 'w1_0', el: 'jin' });
  if (e.seq === 2 && !L.artOwned(st, 'z_liejin')) must.push({ kind: 'art', id: 'z_liejin' });
  if (e.seq === 3) must.push({ kind: 'gear', minStar: 1 });
  res.trip = { k: e.k, d: e.d, a: e.a, rating: res.rating, won: b.won, eliteWin: b.eliteWin, eliteId: b.eliteId, eliteEl: b.eliteEl, boss: false, bossFirst: false, treasure: b.treasure, seq: e.seq, must, recall: !!e.recall, seed: e.seed, hp: res.bt.hp,
    deeper: e.deeper ? (b.eliteWin && !e.recall ? 'win' : 'lose') : undefined, deeperOnly: !!e.deeper, deeperPrev: e.deeper && e.deeper.prevU };   // 趁势深入（loot.js 的 L.startDeeper）
  if (L.tripLoot && (!e.recall || e.deeper)) { res.cards = L.tripLoot(st, res.trip) || []; }
  else if (!e.recall) {
    // 兜底（刷宝线合并前）：第 2 趟必得《裂金斩》
    for (const m of must) if (m.kind === 'art' && !L.artOwned(st, m.id)) { const it = L.giveArt(st, m.id, { src: 'exp' }); if (it) res.items.push(it); }
  }
  return res;
}; }
// 换个克它的招（目标卡 / 问老祖 / 结算卡“带 X 系来：预计 甲”）：手里的战技里，换上后这一格预计评价最好的一门
// 返回 { id, el, lo, hi, text, pOk, ke（克不克这一格的精英）, cur: { lo, pOk } } 或 null（没有更好的）
L.btSwapTry = function (st, k, d, a) {
  if (!st.arts || !L.artSlotOpen(st, 1)) return null;
  const sl = st.arts.slot, cur = sl[1], f0 = L.expForecast(st, k, d, a);
  const row = L.cellFoes(k, d), fe = L.FOES[row.elite] ? L.FOES[row.elite].el : '';
  let best = null;
  for (const id of Object.keys(st.arts.own)) {
    const A = L.art(id); if (!A || A.k !== 'z' || id === cur) continue;
    sl[1] = id;
    let f; try { f = L.expForecast(st, k, d, a); } finally { sl[1] = cur; }
    const sc = f.pOk * 10 + f.lo + f.dist[3] + 2 * f.dist[4];
    if (!best || sc > best.sc) best = { id, el: A.el, lo: f.lo, hi: f.hi, text: f.text, pOk: f.pOk, ke: L.elKe(A.el, fe), sc };
  }
  if (!best || best.sc <= f0.pOk * 10 + f0.lo + f0.dist[3] + 2 * f0.dist[4] + 0.05) return null;
  best.cur = { lo: f0.lo, pOk: f0.pOk, id: cur };
  return best;
};
// 试算：把兵器淬成某一系，跑 fn(st) 拿结果，再原样换回（advise 的“淬灵”牌用；换功法的试算用 arts.js 已有的 L.artTry；KAIRO_PLAN §10.5）
L.gearElTry = function (st, el, fn) {
  const x = st.gear && st.gear.w; if (!x) return fn(st);
  const had = Object.prototype.hasOwnProperty.call(x, 'el'), old = x.el;
  x.el = el;
  try { return fn(st); } finally { if (had) x.el = old; else delete x.el; }
};
// 这一格的精英克不克得动（出发页克制条、目标卡用）：{ el 精英五行, ke 身上的招克它, can 手里有克它的战技 }
L.btKeInfo = function (st, k, d) {
  const row = L.cellFoes(k, d), fe = L.FOES[row.elite] ? L.FOES[row.elite].el : '';
  const me = L.btMe(st), moves = me.skills.filter(s => s.kind === 'z' || s.kind === 'w');
  const ke = moves.some(s => L.elKe(s.el, fe));
  const can = Object.keys(st.arts.own).some(id => L.art(id) && L.art(id).k === 'z' && L.elKe(L.art(id).el, fe));
  return { el: fe, ke, can, eliteId: row.elite };
};
// expCalc 读：节点表在就按打出来的定评价；倒下（哪怕过了一场）也负伤
L.tripRatingOf = (st, e) => (e && e.nodes && ON() ? L.expRating(st, e) : null);
L.tripDead = e => !!(e && e.nodes && e.bt && e.bt.dead);

// ---------- 首领：引擎（§8.4 P0） ----------
L.bossBattle = function (st, k, opt) {
  const foes = [L.btFoe(L.bossFoeId(k), L.rec(k, 2))];
  const T = L.btPower(st, k, 2, 0);
  return L.battleNew(st, foes, 1 + Math.floor(R() * 1e9), Object.assign({ T, pills: pillsOf(st) }, opt || {}));
};
// 胜算：同一只首领跑 30 个种子（'smart'）
const bmemo = new Map();
L.bossP = function (st, k, policy) {
  const T = L.btPower(st, k, 2, 0), me = L.btMe(st, T);
  const key = [k, Math.round(Math.log2(T) * 24), me.el, me.skills.map(s => s.id + (s.el || '') + (s.lv || 0)).join(), me.ult.id, policy || 'smart'].join('|');
  if (bmemo.has(key)) return bmemo.get(key);
  let w = 0; const N = 30;
  for (let j = 0; j < N; j++) { const B = L.battleNew(st, [L.btFoe(L.bossFoeId(k), L.rec(k, 2))], 5003 + j * 11, { me: JSON.parse(JSON.stringify(me)), T, pills: 1 }); if (L.battleAuto(B, policy || 'smart').win) w++; }
  const p = w / N; if (bmemo.size > 300) bmemo.clear(); bmemo.set(key, p); return p;
};
{ const fb0 = L.fightBoss; L.fightBoss = function (st, k, opt) {
  if (!ON()) return fb0.apply(this, arguments);
  opt = opt || {};
  if (!L.bossReady(st, k) || L.busy(st)) return null;
  let res = opt.res;
  if (!res) { const B = L.bossBattle(st, k); res = L.battleAuto(B, opt.pol || st.btPol || 'smart'); }
  for (let j = 0; j < (res.pill || 0); j++) takePill(st);
  // 原函数按 R() < p 掷胜负：这里把胜负钉成打出来的结果
  const r0 = L.rng; let first = true;
  L.rng = () => { if (first) { first = false; return res.win ? 0 : 0.999999; } return r0(); };
  let out;
  try { out = fb0.call(this, st, k); } finally { L.rng = r0; }
  if (out) {
    out.bt = res; out.p = L.bossP(st, k);
    if (res.win) { const mats = { core: {} }; const el = L.BOSS_EL[k]; if (el) mats.core[el] = 2; out.mats = mats; if (L.matsAdd) L.matsAdd(st, mats); else { st.mats = st.mats || {}; const c = st.mats.core || (st.mats.core = { jin: 0, mu: 0, shui: 0, huo: 0, tu: 0 }); if (el) c[el] = (c[el] || 0) + 2; } }
    if (L.ARTS_ON !== false) for (const id in res.used || {}) if (L.art(id)) L.addMastery(st, id, 2 * L.artRate(st));
  }
  return out;
}; }

// ---------- 三门新黄阶战技的历练小特效（§3.2：裂金斩灵矿 +10%、青藤缚采药灵草 +15%、燎原式斩妖灵石 +6%） ----------
{ const ax0 = L.artExp; L.artExp = function (st, k, d, a) {
  const o = ax0.apply(this, arguments);
  if (L.ARTS_ON === false) return o;
  if (a === 2) o.herb *= 1 + L.artV(st, 'z_qingteng');
  if (a === 0) o.stone *= 1 + L.artV(st, 'z_liaoyuan');
  return o;
}; }
{ const eo0 = L.expOre; L.expOre = function (st, k, d, a, m) { const v = eo0.apply(this, arguments); return L.ARTS_ON === false ? v : Math.round(v * (1 + L.artV(st, 'z_liejin'))); }; }

// 开局自带心法《引气诀》（§3.1、§7.3：功法页从第一分钟就有东西）；绝招「戒中剑意」不占槽，引擎里常驻
{ const ns0 = L.newState; L.newState = function () {
  const st = ns0.apply(this, arguments);
  if (ON() && st.arts && st.arts.own.x_yinqi === undefined) { st.arts.own.x_yinqi = 0; if (!st.arts.slot[0]) st.arts.slot[0] = 'x_yinqi'; }
  return st;
}; }
});
