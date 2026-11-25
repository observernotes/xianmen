/* 废柴仙途 · 逻辑模块 trib：天劫（SYSTEMS §9）——护劫手段、预掷的雷劫与护体曲线、临场一停的提示、渡劫评价与道基、心魔劫
 * 模块写法见 src/logic.js 顶部说明。
 *
 * 流程（界面与 sim 共用；L.breakthrough 遇到金丹起的突破就一口气调这两步）：
 *   L.tribStart(st, { pills, aids })  准备页勾选的手段先用上（破境丹 ≤ 3 枚），把成败的随机数 u、提示的噪声、每道雷分走的护体都掷好，
 *                                     返回 L.tribView：护体曲线（按当前成功率）、在倒数第二道之前停一次、停的时候老祖的提示（八成准）
 *   L.tribFinish(st, extra)            停的时候补上的手段（临阵吞丹 ≤ 2 枚，另算在 3 枚之外；还没用的祭法宝 / 灵宠 / 道侣），
 *                                     用补完的成功率和同一个 u 定成败；成了按余量 p − u 评 完美 / 上 / 中 / 下，加永久道基
 * 预掷存在 st.trib.cur 里：渡到一半读档，接着渡，结果不变。
 *
 * 留给还没做的系统的钩子（有就用，没有就显示“开放后可用”）：
 *   灵宠挡劫  L.petCanShield(st) → 能挡劫的那只（名字或 { name }，没有给 null）；L.petShield(st, 周天) 让它挡劫并休养
 *   渡劫阵    L.formationReady(st, 'f_dujie') → 提前 3 周天布好了没有（阵图记在 st.gear.zhentu.f_dujie，story_trib1 给）
 *   丹毒      L.addToxin(st, n, 'trib')；没有丹毒系统时记在 st.trib.toxin，等丹毒上线时折进去
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, clamp, emit } = L.U;

// 护劫手段（每次渡劫各限用一次）与评价（SYSTEMS §9 的表）
L.TRIB = { fa: 0.08, pet: 0.10, daolv: 0.08, pill: 0.10, maxPill: 2, toxin: 20, zhen: 0.01, zhenCap: 0.15, petRest: 12, daolvAff: 5,
  demon: 0.05, cap: 0.24, acc: 0.8, pass: 0.12 };
L.TRIB_GRADES = [
  { n: '完美', m: 0.5, d: 0.03, dan: '一品' },
  { n: '上', m: 0.25, d: 0.02, dan: '二品' },
  { n: '中', m: 0.08, d: 0.01, dan: '三品' },
  { n: '下', m: 0, d: 0, dan: '四品' },
];
// 临场提示：余量 ≥ 0.12 大概能过；0 < 余量 < 0.12 悬（过得去，但评价不会好）；余量 ≤ 0 过不了
L.TRIB_HINT = { pass: '大概能过', close: '悬', fail: '过不了' };
L.AID_KEYS = ['fa', 'pet', 'daolv', 'zhen', 'pill'];
L.AID_N = { fa: '祭法宝', pet: '灵宠挡劫', daolv: '道侣护法', zhen: '渡劫阵', pill: '临阵吞丹' };
// 心魔劫：踏入元婴 / 化神 / 合体的雷劫之前（CONTENT §13 的 story_demon1～3）
L.DEMON_AT = { 3: 1, 4: 2, 6: 3 };

L.newTrib = () => ({ daoji: 0, rec: [], dan: '', cur: null, toxin: 0, daolv: {}, aids: 0 });
const T = st => { if (!st.trib || typeof st.trib !== 'object') st.trib = L.newTrib(); return st.trib; };
L.tribState = T;
// 存档迁移（不升版本）：缺什么补什么，读几遍都一样
L.migrateTrib = function (s) {
  const d = L.newTrib(), t = T(s);
  for (const k in d) if (t[k] === undefined || t[k] === null && k !== 'cur') t[k] = d[k];
  if (!Array.isArray(t.rec)) t.rec = [];
  if (!t.daolv || typeof t.daolv !== 'object') t.daolv = {};
  t.daoji = clamp(+t.daoji || 0, 0, L.TRIB.cap);
  if (!(t.toxin >= 0)) t.toxin = 0;
  const c = t.cur;
  if (c && !(c.N >= 3 && typeof c.u === 'number' && Array.isArray(c.F) && c.F.length === c.N + 1 && c.from === s.p.r)) t.cur = null;
};

L.tribNeeded = st => st.p.r >= 1 && st.p.r <= L.MAXR;
L.tribStrikes = st => (st.p.r >= L.MAXR ? 9 : L.REALMS[st.p.r + 1].trib);
L.tribHintAcc = st => (L.daoLv && L.daoLv(st, 'w') >= 3 ? 1 : L.TRIB.acc);   // 稳·道心三级：十成准
L.daoji = st => T(st).daoji;

const petName = who => (typeof who === 'string' ? who : (who && (who.name || who.n)) || '灵宠');
const wName = w => (L.gearBase && L.gearBase(w.id) ? L.gearBase(w.id).n : '兵器');
// 一样手段现在能不能用、加多少、代价是什么（准备页、停顿卡、老祖讲解都读它）
L.aidInfo = function (st, k) {
  const t = T(st), r = st.p.r, g = st.gear || {};
  const o = { k, n: L.AID_N[k], v: 0, ok: false, why: '', cost: '', pause: k !== 'zhen' };
  if (k === 'fa') {
    const w = g.w; o.v = L.TRIB.fa; o.ok = !!w; o.why = w ? '' : '没有兵器';
    o.cost = !w ? '' : w.plus > 0 ? `失败时【${wName(w)}】强化 +${w.plus} → +${w.plus - 1}` : `失败时强化 −1（【${wName(w)}】+0，不掉）`;
  } else if (k === 'pet') {
    const who = L.petCanShield ? L.petCanShield(st) : null;
    o.v = L.TRIB.pet; o.ok = !!who; o.who = who ? petName(who) : '';
    o.why = !L.petCanShield ? '灵宠名册开放后可用（要 5 心）' : '没有 5 心、没在休养的灵宠';
    o.cost = `${o.who || '该灵宠'}休养 ${L.TRIB.petRest} 周天`;
  } else if (k === 'daolv') {
    const used = !!t.daolv[r], blocked = !!(L.daolvBlocked && L.daolvBlocked(st));
    o.v = L.TRIB.daolv; o.ok = !!st.daolv && !used && !blocked;
    o.why = !st.daolv ? '还没有道侣' : used ? '这一境界已护法过' : '太上无情：道侣不来护法';
    o.cost = st.daolv ? `每境界一次；失败时${L.npcName(st, st.daolv)}好感 −${L.TRIB.daolvAff}` : '每境界一次；失败时道侣好感 −5';
  } else if (k === 'zhen') {
    const has = !!(g.zhentu && g.zhentu.f_dujie);
    o.v = Math.min(L.TRIB.zhenCap, L.TRIB.zhen * (st.home.array || 0));
    o.ok = has && !!(L.formationReady && L.formationReady(st, 'f_dujie'));
    o.why = !has ? '尚无渡劫阵图' : '阵法开放后可布阵（需提前 3 周天）';
    o.cost = `聚灵阵每级 +1%，上限 +${Math.round(L.TRIB.zhenCap * 100)}%；需提前 3 周天布阵`;
  } else if (k === 'pill') {
    o.v = L.TRIB.pill; o.max = Math.min(L.TRIB.maxPill, st.pills); o.ok = o.max > 0; o.why = '没有破境丹了';
    o.cost = `每枚 +${Math.round(L.TRIB.pill * 100)}%，最多 ${L.TRIB.maxPill} 枚（在 ${L.BT.maxPills} 枚之外）；丹毒 +${L.TRIB.toxin}/枚`;
  }
  return o;
};
// 选中的手段 → 只留现在能用、这次还没用过的；'all' = 全部能用的
function pickAids(st, want, phase, used) {
  const out = {};
  for (const k of ['fa', 'pet', 'daolv', 'zhen']) {
    if (phase === 'pause' && k === 'zhen') continue;   // 渡劫阵要提前布
    if (used && used[k]) continue;
    if ((want === 'all' || (want && want[k])) && L.aidInfo(st, k).ok) out[k] = 1;
  }
  return out;
}
// 成功率的组成：L.btParts（不含破境丹）+ 破境丹 + 手段。pills 直接给枚数（开渡之后丹已经扣掉了，不能再按手里的数截）
function partsOf(st, pills, aids, extra) {
  const a = L.btParts(st, 0);
  if (pills) a.splice(1, 0, [`破境丹 ×${pills}`, pills * L.BT.pill]);
  const one = (k, v) => a.push([L.AID_N[k], v]);
  for (const src of [aids || {}, (extra && extra.aids) || {}]) for (const k of ['fa', 'pet', 'daolv', 'zhen']) if (src[k]) one(k, k === 'zhen' ? L.aidInfo(st, 'zhen').v : L.TRIB[k]);
  if (extra && extra.pills) a.push([`${L.AID_N.pill} ×${extra.pills}`, extra.pills * L.TRIB.pill]);
  return a;
}
const rateOf = (parts, sure) => (sure ? 1 : clamp(L.modSum(parts), 0.05, 1));
// 准备页用：照这样选，成功率由哪些项组成、合计多少（o = { pills, aids }；还没开渡，破境丹按手里的数截）
L.tribParts = (st, o) => { o = o || {}; return partsOf(st, L.btPills(st, o.pills), pickAids(st, o.aids, 'pre')); };
L.tribRate = (st, o) => (st.flags.sureBt ? 1 : rateOf(L.tribParts(st, o), false));
// 停顿时补的手段 → 只留还没用、现在能用的；临阵吞丹按手里的丹截到 0～2 枚
function normEx(st, c, ex) {
  if (c.sure) return { add: {}, xp: 0 };
  return { add: pickAids(st, ex === 'all' ? 'all' : ex, 'pause', c.aids), xp: clamp(Math.floor(ex === 'all' ? L.TRIB.maxPill : (ex && ex.pills) || 0), 0, Math.min(L.TRIB.maxPill, st.pills)) };
}
// 停顿卡用：补上这些之后的成功率（不改存档）
L.tribPeek = (st, ex) => { const r = L.tribPreview(st, ex); return r ? r.p1 : 0; };
// 补上这些之后会怎样（不改存档；界面拿它放最后两道雷，落完才调 L.tribFinish 结算——结果一样，因为 u 早就掷好了）
L.tribPreview = function (st, ex) {
  const c = T(st).cur; if (!c) return null;
  const { add, xp } = normEx(st, c, ex);
  const p1 = rateOf(partsOf(st, c.pills, c.aids, { aids: add, pills: xp }), c.sure), m = p1 - c.u, ok = c.u < p1, mr = Math.round(m * 1e4) / 1e4;
  return { ok, p1, margin: mr, curve1: curveOf(c, m), grade: ok ? gradeOf(mr).n : null, add, pills: xp };
};
const gradeOf = m => L.TRIB_GRADES.find(g => m >= g.m && (g.m > 0 || m > 0)) || L.TRIB_GRADES[3];

// ---------- 护体曲线 ----------
// 余量 m = p − u。成了：最后剩的护体 0.06 + 0.5 × min(1, m / 0.6)（完美也剩不到六成：停顿时光看护体猜不准，得听老祖的）；
// 败了：最后一道打穿（差得越多，前面掉得越快）。
// 护体第 i 道之后 = 1 − D × F[i]，F 是开渡时掷好的“每道雷分走多少”（F[N] = 1；停顿之前那几道合计分走 35%～65%）
const finalOf = m => (m > 0 ? 0.06 + 0.5 * Math.min(1, m / 0.6) : 0);
function curveOf(c, m) {
  const D = m > 0 ? 1 - finalOf(m) : 1 + Math.min(0.5, -m);
  const s = c.F.map(f => clamp(1 - D * f, 0, 1));
  if (m <= 0) { s[c.N] = 0; s[c.N - 1] = Math.max(0.04, s[c.N - 1]); for (let i = 1; i < c.N - 1; i++) s[i] = Math.max(s[c.N - 1], s[i]); }
  return s.map(x => Math.round(x * 1000) / 1000);
}
const hintOf = m => (m >= L.TRIB.pass ? 'pass' : m > 0 ? 'close' : 'fail');

// 当前这场雷劫（停顿之前）：曲线、在哪停、停的时候老祖怎么说、红线（预计落点）画在哪
L.tribView = function (st) {
  const c = T(st).cur; if (!c) return null;
  const parts = partsOf(st, c.pills, c.aids), p = rateOf(parts, c.sure), m = p - c.u;
  const curve = curveOf(c, m), pauseAfter = c.N - 2;
  // 提示：拿预掷的 u 和现在的 p 比；八成照实说，两成说成另外两种之一（稳·道心三级：十成准）
  const truth = hintOf(m), acc = L.tribHintAcc(st), others = ['pass', 'close', 'fail'].filter(x => x !== truth);
  const k = c.hn < acc ? truth : others[c.hp < 0.5 ? 0 : 1];
  const mark = k === truth ? curve[c.N] : k === 'pass' ? finalOf(L.TRIB.pass + 0.4 * c.hp) : k === 'close' ? finalOf(0.06) : 0;
  const ex = L.aidInfo(st, 'pill');
  return { from: c.from, to: c.from + 1, N: c.N, ascend: c.from >= L.MAXR, p, parts, curve, pauseAfter, shield: curve[pauseAfter], seed: c.seed,
    hint: { k, text: L.TRIB_HINT[k], acc, mark: Math.round(mark * 1000) / 1000, right: k === truth },
    aids: Object.assign({}, c.aids), pills: c.pills, sure: c.sure,
    canAdd: c.sure ? [] : ['fa', 'pet', 'daolv'].filter(a => !c.aids[a] && L.aidInfo(st, a).ok), pillMax: c.sure ? 0 : ex.max };
};

// ---------- 开渡 ----------
// o = { pills: 0～3（true 尽量多）, aids: { fa, pet, daolv, zhen } | 'all' }；九转金丹（sureBt）必成，不耗丹、不用手段
L.tribStart = function (st, o) {
  const t = T(st);
  if (t.cur) return L.tribView(st);    // 渡到一半读档：接着渡，结果不变
  if (!L.isReady(st) || !L.tribNeeded(st)) return null;
  o = o || {};
  const sure = !!st.flags.sureBt, from = st.p.r, N = L.tribStrikes(st);
  const pills = sure ? 0 : L.btPills(st, o.pills === undefined ? 0 : o.pills);
  const aids = sure ? {} : pickAids(st, o.aids, 'pre');
  st.pills -= pills;
  if (st.retreat) st.retreat = null;
  if (aids.pet && L.petShield) L.petShield(st, L.TRIB.petRest);
  if (aids.daolv) t.daolv[from] = 1;
  // 预掷：护体曲线的形状（停顿前 N−2 道合计分走 e，倒数第二道再分走余下的 35%～55%），然后才是成败的 u 与提示的噪声
  const e = 0.35 + 0.3 * R(), F = [0];
  const w = []; for (let i = 0; i < N - 2; i++) w.push(0.6 + 0.8 * R());
  const ws = w.reduce((a, b) => a + b, 0);
  let acc = 0; for (const x of w) { acc += x; F.push(Math.round(e * acc / ws * 1e4) / 1e4); }
  F.push(Math.round((e + (1 - e) * (0.35 + 0.2 * R())) * 1e4) / 1e4); F.push(1);
  t.cur = { from, N, F, u: R(), hn: R(), hp: R(), seed: Math.floor(R() * 1e6), pills, aids, sure, at: st.tick };
  return L.tribView(st);
};

// ---------- 临场补手段，结算 ----------
// ex = { pills: 0～2, fa, pet, daolv } | 'all'（停顿时补上的；渡劫阵补不了）
L.tribFinish = function (st, ex) {
  const t = T(st), c = t.cur; if (!c) return null;
  const v0 = L.tribView(st);
  const { add, xp } = normEx(st, c, ex);
  st.pills -= xp;
  if (add.pet && L.petShield) L.petShield(st, L.TRIB.petRest);
  if (add.daolv) t.daolv[c.from] = 1;
  if (xp) { const tox = xp * L.TRIB.toxin; if (L.addToxin) L.addToxin(st, tox, 'trib'); else t.toxin += tox; }
  const parts = partsOf(st, c.pills, c.aids, { aids: add, pills: xp }), p1 = rateOf(parts, c.sure);
  const ok = c.u < p1, m = Math.round((p1 - c.u) * 1e4) / 1e4;
  const all = Object.assign({}, c.aids, add);
  const curve1 = curveOf(c, p1 - c.u);
  t.cur = null;
  // 失败的代价：祭过的兵器强化 −1，护法的道侣好感 −5
  const costs = [];
  if (!ok && all.fa && st.gear && st.gear.w && st.gear.w.plus > 0) { st.gear.w.plus--; costs.push(`【${wName(st.gear.w)}】强化 +${st.gear.w.plus + 1} → +${st.gear.w.plus}`); }
  if (!ok && all.daolv && st.daolv) { const d = L.addAff(st, st.daolv, -L.TRIB.daolvAff); costs.push(`${L.npcName(st, st.daolv)}好感 ${d}`); }
  if (xp) costs.push(`丹毒 +${xp * L.TRIB.toxin}`);
  const n = Object.keys(all).length + (xp ? 1 : 0);
  t.aids += n;
  const res = L.btResolve(st, ok, { rate: p1, pills: c.pills, sure: c.sure });
  let grade = null;
  if (ok) {
    grade = gradeOf(m);
    const d0 = t.daoji;
    t.daoji = Math.min(L.TRIB.cap, Math.round((t.daoji + grade.d) * 1e4) / 1e4);
    t.rec.push({ r: c.from + 1, g: grade.n, m, tick: st.tick });
    res.daoji = { add: t.daoji - d0, total: t.daoji, capped: t.daoji - d0 < grade.d };
    if (c.from + 1 === 2) { t.dan = grade.dan + '金丹'; res.dan = t.dan; }
    L.log(st, `渡劫评价「${grade.n}」${t.daoji > d0 ? `：道基 +${Math.round((t.daoji - d0) * 100)}%（累计 +${Math.round(t.daoji * 100)}%）` : ''}${res.dan ? `，结成【${res.dan}】` : ''}`, 'gold');
    res.after = L.power(st);
    emit('trib', { grade: grade.n, r: c.from + 1 });
  } else if (costs.length) L.log(st, '渡劫失败的代价：' + costs.join('，'), 'red');
  res.tb = { N: c.N, curve0: v0.curve, curve1, pauseAfter: v0.pauseAfter, hint: v0.hint, p0: v0.p, p1, margin: m, grade: grade && grade.n, aids: all, extraPills: xp, added: Object.assign({}, add), costs, parts, seed: c.seed };
  return res;
};

// 道基：每次渡劫按评价永久 +3% / +2% / +1% / +0%（修炼与战力），上限 +24%（人物页显示）
// L.DAOJI_ON = false 关掉（tools/sim.js 的 nodaoji 对照）
L.addCulMod('daoji', 75, st => (L.DAOJI_ON !== false && st.trib && st.trib.daoji > 0 ? ['道基（渡劫评价）', 1 + st.trib.daoji, ''] : null));
L.addAtkMod('daoji', 75, st => (L.DAOJI_ON !== false && st.trib && st.trib.daoji > 0 ? ['道基（渡劫评价）', 1 + st.trib.daoji, ''] : null));
// 心魔劫的结果算进这一境界的雷劫：道心如一 +5%，动摇 −5%（story_demonN 的 flag：demonN_firm / demonN_waver，ev_world_chains 写的 _shaken 同义）
L.addBtMod('demon', 95, function (st) {
  const n = L.DEMON_AT[st.p.r + 1], e = st.eflags || {};
  if (!n) return null;
  if (e['demon' + n + '_firm']) return ['心魔劫·道心如一', L.TRIB.demon];
  if (e['demon' + n + '_waver'] || e['demon' + n + '_shaken']) return ['心魔劫·道心动摇', -L.TRIB.demon];
  return null;
});

// ---------- 雷劫之前先过的那一关：心魔劫（元婴 / 化神 / 合体）、飞升前夜的访客 ----------
// 返回还没过的那件 story 事件（界面先弹它，选完再开渡；sim 直接结算），没有就 null
L.tribPre = function (st) {
  if (!L.isReady(st) || !L.tribNeeded(st) || T(st).cur) return null;
  const to = st.p.r + 1, key = st.p.r >= L.MAXR ? 'ascend' : L.DEMON_AT[to] ? 'demon:' + L.DEMON_AT[to] : null;
  if (!key) return null;
  return L.events().find(ev => ev.where === 'story' && ev.trigger === key && !st.evDone[ev.id] && L.eligible(st, ev, 'story', { trigger: key })) || null;
};
// 心魔的题目（CONTENT §13）：一 = 本世第一条没了的因果（没有就是被逐出山门那天）；二 = 没选的那位道侣候选（没有道侣就是老祖）；三 = 陆天衡
L.demonQuestion = function (st, n) {
  if (n === 1) {
    const k = L.karmaOpen ? L.karmaOpen(st)[0] : null;
    if (k) return { who: k.who, karma: k, text: `【${k.title || '旧事'}】你${k.t ? '选了“' + k.t + '”' : k.n}——${k.who}` };
    return { who: '天剑宗', text: '【被逐出山门那天】你跪在山门外，赵乾踢翻了你的包袱，没有一个人回头' };
  }
  if (n === 2) {
    if (st.daolv) { const other = st.daolv === 'su' ? 'ye' : 'su'; return { who: L.npcName(st, other), npc: other, text: `【没走的那条路】你选了${L.npcName(st, st.daolv)}，没有选${L.npcName(st, other)}` }; }
    return { who: '戒中老祖', npc: 'elder', text: '【戒指里的声音】“废柴，就凭你也想化神？”' };
  }
  return { who: '陆天衡', text: '【同路人】“我也曾是废柴。”' };
};
// 飞升前夜来敲门的那位（CONTENT §13：道侣 > 好感最高的知己 > 老祖）
L.ascendVisitor = function (st) {
  if (st.daolv) return { id: st.daolv, n: L.npcName(st, st.daolv) };
  let best = null;
  for (const id of Object.keys(L.NPCS)) if (L.friend(st, id) && (!best || L.aff(st, id) > L.aff(st, best))) best = id;
  return best ? { id: best, n: L.npcName(st, best) } : { id: 'elder', n: '戒中老祖' };
};
L.supportTrigger('demon:');
L.supportTrigger('ascend');
});
