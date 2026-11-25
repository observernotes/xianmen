/* 废柴仙途 · 逻辑模块 disciples：徒弟（docs/SYSTEMS.md §11，CONTENT §14.3 徒弟 12 个事件）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   st.disc = { list: [徒弟], cand: [三个候选] | null, candAt 上回送候选的周天, u 编号, q: [{ id 事件, u 徒弟 }] 排着的徒弟事件, focus 当前事件说的是谁, taoli 本世出师人数 }
 *   徒弟 = { u, n 名, f 女, t 灵根 1～5 档, tp 性情（L.TEMPERS 的键）, cat 候选里的那一类, di 小层（可带小数）, grow 成长永久加成, heart 师徒情分 0～5,
 *           job 差事 '' | exp 代师历练 | home 打理洞府 | duty 宗门当值 | cult 闭门苦修, jb 差事收益加成, taught [传过的功法], lp 听过几回讲法, rest 休养到第几周天,
 *           ev { 已经走过的事件 }, seed 头像, at 入门周天, acc 当值贡献的零头, jt 代师历练的周天计数, rookie 新秀出身 }
 *   st.meta.taoli = { n 历世出师人数, list: [{ n, tp, t, how, life }] }（跨世保留；下一世入宗时他作为前辈来一趟）
 *
 *   名额：真传 1、长老 2、宗主 3。真传起每 24 周天宗门送来 3 个候选（壮实 / 机灵 / 安静各一个：姓名、灵根、性情），三选一或都不要（sect_candidates 事件或【门下】里点）。
 *   成长：每周天 0.02 × 灵根倍率 × (1 + 0.1 × 传授数) × (1 + 成长加成) × 性情 × 道心·仁 × 闭门苦修 ×2，上限为师父的小层 − 4。
 *   差事（一人一事）：代师历练（每 6 周天带回家门口那张图一趟乙等灵石的 30% 和些灵草）、打理洞府（被动灵石与灵田灵草 +8%）、
 *         宗门当值（每周天贡献 = 一趟乙等历练的 0.3）、闭门苦修（成长 ×2）。
 *   传授：你圆满（或化境）的一门功法传给一个徒弟（每门一次，花 2 周天）：他的战力 ×(1 + 0.2 × 传授数)、成长 +10%；你的这门功法直接升到化境（教学相长）。
 *   战力 = 他那一小层的基础战力 × 1.5 × (1 + 0.2 × 传授数) × (1 + 0.05 × 听过的讲法) × 性情。
 *   出师：小层 ≥ 8（金丹）可【出师】（disc_graduate 辞行事件）：离开名册，给一大笔贡献和一个“桃李”（L.discGraduated(st) 本世出师人数，轮回道果由轮回那一刀读）。
 *   性情事件（disc:*）：每名徒弟各走一遍，按性情触发（莽 / 贪玩 闯祸、聪慧 发问、滑 倒卖、痴 走火、孤傲 顶撞、仁厚 散丹、贪玩 偷懒），另有 冲关（跨大境界）、
 *         挖角（小层 ≥ 8）、绑架（你有因果未了）、辞行（出师）；收徒当天的 disc_first_day 定基调（严：成长 +5%、宽：情分 +1、放养：差事 +10%）。
 *   宗主之后的九宗会武改为三人战：你 + 两名最强的徒弟各打一场，三局两胜（对方的两名弟子按你的小层 − 16 算，名次越高越强）。
 * 事件能力：fx.disc（作用于触发这件事的那名徒弟；new 收一名），触发键 disciple、disc:*。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;
const fmt = n => L.fmt(n);
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };

// ---------- 数据 ----------
// 性情：grow 成长倍率、pow 战力倍率、job 某样差事的倍率、ev 专属事件（CONTENT §14.3）
L.TEMPERS = {
  qin: { n: '勤勉', grow: 1.15, ev: [], d: '成长 +15%' },
  hui: { n: '聪慧', grow: 1.05, teach: 0.3, ev: ['question'], d: '每回传授战力 +30%（常人 +20%）' },
  mang: { n: '莽', pow: 1.2, ev: ['trouble'], d: '战力 +20%，爱闯祸' },
  hua: { n: '滑', job: { home: 1.5 }, ev: ['steal'], d: '打理洞府 ×1.5' },
  chi: { n: '痴', job: { cult: 1.25 }, ev: ['obsess'], d: '闭门苦修成长 ×2.5' },
  ao: { n: '孤傲', pow: 1.1, grow: 1.05, ev: ['pride'], d: '战力 +10%、成长 +5%' },
  ren: { n: '仁厚', job: { duty: 1.3 }, ev: ['kind'], d: '宗门当值 ×1.3' },
  wan: { n: '贪玩', grow: 0.9, job: { exp: 1.4 }, ev: ['trouble', 'lazy'], d: '成长 −10%，代师历练 ×1.4' },
};
// 候选的三类（sect_candidates：壮得像牛犊 / 眼珠滴溜溜转 / 不哭不闹）
L.DISC_CAT = { strong: ['mang', 'qin'], clever: ['hui', 'hua', 'wan'], quiet: ['chi', 'ao', 'ren'] };
L.DISC_CAT_N = { strong: '壮实', clever: '机灵', quiet: '安静' };
L.DISC_T = [null, { n: '伪灵根', m: 0.7 }, { n: '杂灵根', m: 1.0 }, { n: '双灵根', m: 1.25 }, { n: '单灵根', m: 1.5 }, { n: '天灵根', m: 1.8 }];
L.DISC_JOB = {
  exp: { n: '代师历练', icon: 'job_out', d: '每 6 周天带回一趟乙等灵石的 30%' },
  home: { n: '打理洞府', icon: 'job_field', d: '被动灵石与灵田灵草 +8%' },
  duty: { n: '宗门当值', icon: 'post_fa', d: '每周天贡献 = 一趟乙等历练的 0.3' },
  cult: { n: '闭门苦修', icon: 'job_array', d: '成长 ×2' },
};
L.DISC_V = { grow: 0.02, teach: 0.1, teachPow: 0.2, pow: 1.5, lecture: 0.05, expShare: 0.3, expEvery: 6, home: 0.08, duty: 0.3, cult: 2, every: 24, gradDi: 8, gradC: 8, evP: 1 / 30, evGap: 18 };
L.discCap = st => (!st.sect ? 0 : st.sect.rank >= 6 ? 3 : st.sect.rank >= 4 ? 2 : st.sect.rank >= 2 ? 1 : 0);
L.discOpen = st => L.discCap(st) > 0;
L.discNextCapRank = st => (!st.sect ? 2 : st.sect.rank < 2 ? 2 : st.sect.rank < 4 ? 4 : st.sect.rank < 6 ? 6 : -1);

function ensure(st) {
  const d = st.disc && typeof st.disc === 'object' ? st.disc : (st.disc = {});
  if (!Array.isArray(d.list)) d.list = [];
  if (d.cand !== null && !Array.isArray(d.cand)) d.cand = null;
  if (!Array.isArray(d.q)) d.q = [];
  for (const k of ['candAt', 'u', 'focus', 'taoli']) if (typeof d[k] !== 'number' || !isFinite(d[k])) d[k] = k === 'candAt' ? -999 : 0;
  for (const x of d.list) {
    if (!x.ev || typeof x.ev !== 'object') x.ev = {};
    if (!Array.isArray(x.taught)) x.taught = [];
    for (const k of ['di', 'grow', 'heart', 'jb', 'lp', 'rest', 'acc', 'jt']) if (typeof x[k] !== 'number' || !isFinite(x[k])) x[k] = 0;
    if (!L.TEMPERS[x.tp]) x.tp = 'qin';
    if (!L.DISC_JOB[x.job]) x.job = '';
  }
  if (st.meta) { const t = st.meta.taoli && typeof st.meta.taoli === 'object' ? st.meta.taoli : (st.meta.taoli = { n: 0, list: [] }); if (!Array.isArray(t.list)) t.list = []; if (!(t.n >= 0)) t.n = 0; }
  return d;
}
L.discState = ensure;
L.migrateDisc = s => { ensure(s); };
L.discList = st => ensure(st).list;
L.discByU = (st, u) => ensure(st).list.find(x => x.u === u) || null;
const mySi = st => Math.min(35, L.si(st.p));
L.discMax = st => Math.max(0, mySi(st) - 4);
L.discStage = x => { const i = Math.min(35, Math.floor(x.di)); return L.REALMS[Math.min(9, i >> 2)].n + L.STAGES[i & 3]; };
L.discRealm = x => Math.min(9, Math.floor(x.di) >> 2);

// ---------- 候选与收徒 ----------
function newCand(st, cat, o) {
  o = o || {};
  const tp = o.tp || pick(L.DISC_CAT[cat]);
  const t = o.t || wpick([[1, 15], [2, 35], [3, 30], [4, 15], [5, 5]]);
  return { n: o.n || L.randName(), f: R() < 0.5 ? 1 : 0, t, tp, cat, seed: Math.floor(R() * 1e9), rookie: !!o.rookie };
}
L.rollCands = function (st) {
  const d = ensure(st);
  d.cand = ['strong', 'clever', 'quiet'].map(c => newCand(st, c));
  d.candAt = st.tick;
  return d.cand;
};
L.discFull = st => ensure(st).list.length >= L.discCap(st);
// 收一名（候选里的第 i 个；或直接给 { cat, rookie }）
L.discTake = function (st, i, o) {
  const d = ensure(st);
  if (!L.discOpen(st) || L.discFull(st)) return null;
  let c = null;
  if (typeof i === 'number') { if (!d.cand || !d.cand[i]) return null; c = d.cand[i]; d.cand = null; }
  else c = newCand(st, (o && o.cat) || pick(Object.keys(L.DISC_CAT)), o);
  d.u++;
  const x = { u: d.u, n: c.n, f: c.f, t: c.t, tp: c.tp, cat: c.cat, seed: c.seed, rookie: !!c.rookie, di: c.rookie ? 3 : 0, grow: 0, heart: 1, job: '', jb: 0, taught: [], lp: 0, rest: 0, ev: {}, at: st.tick, acc: 0, jt: 0 };
  d.list.push(x);
  st.stats.discTaken = (st.stats.discTaken || 0) + 1;
  L.log(st, `收${x.n}为徒（${L.DISC_T[x.t].n} · ${L.TEMPERS[x.tp].n}）`, 'gold');
  L.discFire(st, 'disciple', x);
  emit('disciple', x);
  return x;
};
L.discPass = function (st) { const d = ensure(st); if (!d.cand) return false; d.cand = null; L.log(st, '三个拜师的孩子，你一个也没收'); return true; };

// ---------- 成长、战力 ----------
const T = x => L.TEMPERS[x.tp] || L.TEMPERS.qin;
L.discGrowRate = function (st, x) {
  if (x.rest > st.tick) return 0;
  const tm = T(x), cult = x.job === 'cult' ? L.DISC_V.cult * ((tm.job && tm.job.cult) || 1) : 1;
  return L.DISC_V.grow * L.DISC_T[x.t].m * (1 + L.DISC_V.teach * x.taught.length) * (1 + x.grow) * (tm.grow || 1) * (L.daoDiscMult ? L.daoDiscMult(st) : 1) * cult;
};
L.discBasePow = i => P.pw0 * Math.pow(P.pwStage, i) * Math.pow(P.pwRealm, i >> 2);
L.discPow = function (st, x) {
  const tm = T(x), i = Math.min(35, Math.floor(x.di));
  return L.discBasePow(i) * L.DISC_V.pow * (1 + (tm.teach || L.DISC_V.teachPow) * x.taught.length) * (1 + L.DISC_V.lecture * x.lp) * (tm.pow || 1);
};
// 名册里最强的 n 个（三人会武出战用）
L.discTop = (st, n) => ensure(st).list.slice().sort((a, b) => L.discPow(st, b) - L.discPow(st, a)).slice(0, n);
L.discJobMult = (x, k) => (1 + x.jb) * ((T(x).job && T(x).job[k]) || 1);
// 打理洞府：被动灵石与灵田灵草（每人 +8%，可叠）
const homeAdd = st => ensure(st).list.reduce((a, x) => a + (x.job === 'home' && x.rest <= st.tick ? L.DISC_V.home * L.discJobMult(x, 'home') : 0), 0);
L.addIncMul('disc_home', 45, st => { if (!st.disc || !st.disc.list.length) return null; const v = homeAdd(st); return v ? ['徒弟·打理洞府', 1 + v, 'disc'] : null; });
wrap('fieldHerbMult', b => st => b(st) * (st.disc ? 1 + homeAdd(st) : 1));
L.discJobVal = function (st, x, k) {
  k = k || x.job;
  if (k === 'exp') { const kk = L.homeRegion(st); return { stones: Math.floor(L.rew(kk, 0) * L.RATE_M[2] * L.DISC_V.expShare * L.discJobMult(x, 'exp')), herbs: Math.round((2 + kk) * 0.6 * L.discJobMult(x, 'exp')) }; }
  if (k === 'home') return { inc: L.DISC_V.home * L.discJobMult(x, 'home') };
  if (k === 'duty') return { contrib: L.contribFor(L.homeRegion(st)) * L.DISC_V.duty * L.discJobMult(x, 'duty') };
  if (k === 'cult') return { grow: L.DISC_V.cult * ((T(x).job && T(x).job.cult) || 1) };
  return {};
};
L.discSetJob = function (st, u, k) {
  const x = L.discByU(st, u); if (!x || (k && !L.DISC_JOB[k])) return false;
  x.job = k || ''; x.jt = 0;
  if (k) L.log(st, `${x.n}去${L.DISC_JOB[k].n}了`);
  return true;
};

// ---------- 传授：你圆满的一门功法，每门一次，花 2 周天 ----------
L.TEACH_LEN = 2;
L.discTeachList = (st, x) => Object.keys(st.arts.own).filter(id => L.art(id) && L.artLv(st, id) >= 3 && !x.taught.includes(id)).sort((a, b) => L.art(b).t - L.art(a).t);
L.discTeachWhy = function (st, x, id) {
  if (!x) return '没有这名徒弟';
  if (id && (!L.art(id) || L.artLv(st, id) < 3)) return '这门功法还没练到圆满';
  if (id && x.taught.includes(id)) return '这门已经教过他了';
  if (!id && !L.discTeachList(st, x).length) return '你还没有能教他的圆满功法';
  if (L.busy(st)) return st.exp ? '历练途中' : '眼下脱不开身';
  if (st.p.r > L.MAXR) return '已证大道';
  return '';
};
L.discTeach = function (st, u, id) {
  const x = L.discByU(st, u);
  if (L.discTeachWhy(st, x, id)) return false;
  return L.startBusy(st, L.TEACH_LEN, 'teachart', `传授《${L.art(id).n}》`, { u, art: id });
};
// 传授做完（sect2.js 的 endRetreat 调）
L.discTeachDone = function (st, r) {
  const x = L.discByU(st, r.u); if (!x || !L.art(r.art) || x.taught.includes(r.art)) return null;
  const pw0 = L.discPow(st, x);
  x.taught.push(r.art);
  const A = L.art(r.art), lv0 = L.artLv(st, r.art);
  if (lv0 < 4 && L.artOwned(st, r.art)) L.addMastery(st, r.art, L.artNeed(r.art, 4) - L.artPts(st, r.art));
  st.stats.discTeach = (st.stats.discTeach || 0) + 1;
  L.log(st, `把《${A.n}》传给了${x.n}：他的战力 ${fmt(pw0)} → ${fmt(L.discPow(st, x))}${lv0 < 4 ? `；教学相长，你的《${A.n}》到了化境` : ''}`, 'gold');
  return { u: x.u, art: r.art, pw0, pw1: L.discPow(st, x), lv0, note: `${x.n}学会了《${A.n}》` };
};
// 讲法（sect2.js 的讲法任务做完时调）：徒弟各听一回
L.discLectured = function (st) { const list = ensure(st).list; for (const x of list) x.lp++; return list.length; };

// ---------- 出师：小层 ≥ 8（金丹） ----------
L.discCanGrad = x => !!x && x.di >= L.DISC_V.gradDi;
L.discGradContrib = (st, x) => Math.floor(L.contribFor(L.homeRegion(st)) * L.DISC_V.gradC * (1 + 0.1 * x.taught.length));
L.discGraduate = function (st, u, how) {
  const d = ensure(st), x = L.discByU(st, u);
  if (!x || !L.discCanGrad(x)) return null;
  d.list = d.list.filter(y => y !== x);
  const c = st.sect ? L.addContrib(st, L.discGradContrib(st, x)) : 0;
  d.taoli++;
  const T0 = st.meta.taoli; T0.n++; T0.list.push({ n: x.n, tp: x.tp, t: x.t, f: x.f, seed: x.seed, how: how || '', life: st.rebirth || 0 });
  if (T0.list.length > 12) T0.list.shift();
  st.stats.discGrad = (st.stats.discGrad || 0) + 1;
  L.log(st, `${x.n}出师下山：宗门记你一大功（贡献 +${fmt(c)}），桃李 ${d.taoli}`, 'gold');
  emit('discGrad', x);
  return { x, contrib: c, taoli: d.taoli };
};
// 离开名册但不算出师（被挖走、放走）
function discLeave(st, x) { const d = ensure(st); d.list = d.list.filter(y => y !== x); L.log(st, `${x.n}离开了门下`); }
// 本世出师的徒弟数（桃李）。轮回道果的“徒弟出师”由轮回那一刀读它来算（这里不再自己往 L.daoFruitParts 里加，免得算两遍）
L.discGraduated = st => (st && st.disc && st.disc.taoli) || 0;
wrap('lifeSummary', b => st => Object.assign(b(st), { taoli: (st.disc && st.disc.taoli) || 0 }));

// ---------- 徒弟事件：每名徒弟各走一遍（不看 evDone） ----------
L.discFire = function (st, key, x) {
  const d = ensure(st); let n = 0;
  for (const ev of L.events()) {
    if (ev.where !== 'story' || ev.trigger !== key) continue;
    if (d.q.some(q => q.id === ev.id && q.u === (x ? x.u : 0))) continue;
    const done = st.evDone[ev.id]; delete st.evDone[ev.id];
    let ok;
    try { ok = L.eligible(st, ev, 'story', { trigger: key }); } finally { if (done) st.evDone[ev.id] = done; }
    if (!ok) continue;
    st.storyQ.push(ev.id); d.q.push({ id: ev.id, u: x ? x.u : 0 }); n++;
  }
  return n;
};
const isDiscEv = ev => !!ev && ev.where === 'story' && (ev.trigger === 'disciple' || /^disc:/.test(ev.trigger || ''));
// 这件事说的是哪名徒弟（界面立绘、fx.disc 用）：排着的第一条对上的
L.discOfEvent = function (st, ev) {
  const d = ensure(st);
  if (!isDiscEv(ev)) return null;
  const q = d.q.find(y => y.id === ev.id);
  return (q && L.discByU(st, q.u)) || L.discByU(st, d.focus) || d.list[d.list.length - 1] || null;
};
wrap('resolveChoice', b => (st, ev, idx) => {
  if (!isDiscEv(ev)) return b(st, ev, idx);
  const d = ensure(st), qi = d.q.findIndex(y => y.id === ev.id);
  const q = qi >= 0 ? d.q.splice(qi, 1)[0] : null;
  const x = (q && L.discByU(st, q.u)) || d.list[d.list.length - 1] || null;
  d.focus = x ? x.u : 0;
  const n0 = d.list.length;
  const res = b(st, ev, idx);
  if (!res) { if (q) d.q.splice(qi, 0, q); return res; }
  // 收徒当天定的基调落到这名徒弟身上
  if (ev.id === 'disc_first_day' && x) {
    const f = st.eflags;
    if (f.disc_strict) { x.grow += 0.05; res.fx.push(`${x.n}：成长 +5%`); }
    if (f.disc_warm) { x.heart = Math.min(5, x.heart + 1); res.fx.push(`${x.n}：情分 +1`); }
    if (f.disc_wild) { x.jb += 0.1; res.fx.push(`${x.n}：差事收益 +10%`); }
    for (const k of ['disc_strict', 'disc_warm', 'disc_wild']) delete f[k];
  }
  // 拜师的孩子：一个都没收
  if (ev.id === 'sect_candidates' && d.list.length === n0) d.cand = null;
  return res;
});
// 清掉已经不在名册里的徒弟的排队事件
function prune(st) {
  const d = ensure(st);
  // storyQ 里已经没有的（结算过、被丢掉的）记录删掉；名册里已经没有的徒弟，连同 storyQ 里那一条一起删
  const cnt = {}; for (const id of st.storyQ) cnt[id] = (cnt[id] || 0) + 1;
  const keep = []; for (const q of d.q) if (cnt[q.id] > 0) { cnt[q.id]--; keep.push(q); }
  d.q = keep.filter(q => { if (!q.u || L.discByU(st, q.u)) return true; const j = st.storyQ.lastIndexOf(q.id); if (j >= 0) st.storyQ.splice(j, 1); return false; });
}
// fx.disc
const DOPS = ['new', 'grow', 'lv', 'heart', 'inj', 'job', 'out'];
L.supportFx('disc', { ok: v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => DOPS.includes(k)) && (v.new === undefined || !!L.DISC_CAT[v.new]), apply: (st, v, out) => {
  const d = ensure(st);
  if (v.new) {
    if (!L.discOpen(st)) { out.push('（还收不了徒弟）'); return; }
    if (L.discFull(st)) { out.push('门下已满，只好让他回去'); return; }
    const i = d.cand ? d.cand.findIndex(c => c.cat === v.new) : -1;
    const x = i >= 0 ? L.discTake(st, i) : L.discTake(st, null, { cat: v.new });
    if (x) out.push(`收徒：${x.n}（${L.DISC_T[x.t].n} · ${L.TEMPERS[x.tp].n}）`);
    return;
  }
  const x = L.discByU(st, d.focus);
  if (!x) { out.push('（那名徒弟已经不在门下了）'); return; }
  if (v.grow) { x.grow += v.grow; out.push(`${x.n}：成长 +${L.pct(v.grow)}`); }
  if (v.lv) { const s0 = L.discStage(x); x.di = Math.min(35, Math.floor(x.di) + v.lv + (x.di % 1)); out.push(`${x.n}：${s0} → ${L.discStage(x)}`); }
  if (v.heart) { x.heart = clamp(x.heart + v.heart, 0, 5); out.push(`${x.n}：情分 ${v.heart > 0 ? '+' : ''}${v.heart}`); }
  if (v.inj) { x.rest = Math.max(x.rest, st.tick) + v.inj; out.push(`${x.n}：休养 ${v.inj} 周天`); }
  if (v.job) { x.jb += v.job; out.push(`${x.n}：差事收益 +${L.pct(v.job)}`); }
  if (v.out) {
    if (L.discCanGrad(x)) { const g = L.discGraduate(st, x.u, 'event'); if (g) out.push(`${x.n}出师：贡献 +${fmt(g.contrib)}，桃李 ${g.taoli}`); }
    else { discLeave(st, x); out.push(`${x.n}离开了门下`); }
  }
} });
L.supportTrigger('disciple'); L.supportTrigger('disc:');
// 【出师】按钮：先弹辞行事件（选一样送他的东西），事件没上线时直接出师
L.discAskGrad = function (st, u) {
  const x = L.discByU(st, u); if (!L.discCanGrad(x)) return null;
  if (L.discFire(st, 'disc:graduate', x)) { const i = st.storyQ.lastIndexOf('disc_graduate'); if (i >= 0) st.storyQ.splice(i, 1); return { ev: L.eventById('disc_graduate') }; }
  return { grad: L.discGraduate(st, u) };
};

// ---------- 每周天（sect2.js 的 L.sectTick 调） ----------
L.discTick = function (st, out) {
  const d = ensure(st);
  prune(st);
  // 新秀跪门（new_3）：收下他
  if (st.eflags && st.eflags.rookie_disciple) { delete st.eflags.rookie_disciple; const x = L.discTake(st, null, { cat: 'strong', rookie: true }); if (x) out.discNew = x; }
  if (!L.discOpen(st)) return;
  // 候选：每 24 周天一批，名册有空位才送
  if (!L.discFull(st) && st.tick - d.candAt >= L.DISC_V.every) { L.rollCands(st); out.discCand = true; L.log(st, '宗门送来三个拜师的孩子，在【宗门】→ 门下', 'gold'); L.discFire(st, 'disc:candidates', null); }
  else if (L.discFull(st) && d.cand) d.cand = null;
  const cap = L.discMax(st);
  for (const x of d.list.slice()) {
    const r0 = L.discRealm(x), di0 = x.di;
    if (x.di < cap) x.di = Math.min(cap, x.di + L.discGrowRate(st, x));
    if (x.rest > st.tick) continue;
    // 差事
    if (x.job === 'exp' && ++x.jt >= L.DISC_V.expEvery) { x.jt = 0; const v = L.discJobVal(st, x, 'exp'); st.stones += v.stones; st.herbs += v.herbs; L.log(st, `${x.n}代师历练归来：灵石 +${fmt(v.stones)}、灵草 +${v.herbs}`, 'jade'); }
    if (x.job === 'duty' && st.sect) { x.acc += L.discJobVal(st, x, 'duty').contrib; const n = Math.floor(x.acc); if (n > 0) { x.acc -= n; L.addContrib(st, n); } }
    // 事件：冲关（跨大境界）、挖角（小层 ≥ 8）、绑架（因果未了 24 周天以上）、性情
    if (L.discRealm(x) > r0 && Math.floor(di0) < Math.floor(x.di) && !x.ev.break) { x.ev.break = 1; L.discFire(st, 'disc:break', x); continue; }
    if (x.di >= L.DISC_V.gradDi && !x.ev.poach) { x.ev.poach = 1; L.discFire(st, 'disc:poach', x); continue; }
    if (st.tick - (x.evAt || x.at) < L.DISC_V.evGap || R() >= L.DISC_V.evP) continue;
    const ko = L.karmaOpen ? L.karmaOpen(st)[0] : null;
    const keys = T(x).ev.filter(k => !x.ev[k]).concat(ko && st.tick - ko.tick >= 24 && !x.ev.avenge ? ['avenge'] : []);
    if (!keys.length) continue;
    const k = pick(keys); x.ev[k] = 1; x.evAt = st.tick;
    L.discFire(st, 'disc:' + k, x);
  }
  // 前世出师的徒弟：今生入宗后，作为前辈来一趟
  const TL = st.meta && st.meta.taoli;
  if (TL && st.rebirth > 0 && !st.flags.taoliVisit && st.sect) {
    const g = TL.list.find(y => y.life < st.rebirth);
    if (g) { st.flags.taoliVisit = 1; const v = Math.floor(Math.max(L.income(st), 20) * 20); st.stones += v; L.log(st, `前世的徒弟${g.n}如今已是一方前辈，听说“师父”转世入了宗门，托人送来灵石 ${fmt(v)}：“当年那${g.how === 'grad_sword' ? '把剑' : g.how === 'grad_meal' ? '顿饭' : '句话'}，弟子一直记着。”`, 'gold'); out.taoliVisit = g; }
  }
};

// ---------- 宗主之后的九宗会武：三人战（你 + 两名徒弟，三局两胜） ----------
L.trioOn = st => !!st.sect && st.sect.rank >= 6 && ensure(st).list.length >= 2;
// 对方两名弟子：小层 = 你的小层 − 16（大乘初期时是元婴初期），名次越高越强（第 1 宗 ×1.45 × 1.5，第 8 宗 ×1.1 × 1.5，相当于传授过两三回的徒弟）
L.TRIO_LV = 16;
L.trioFoeLv = st => clamp(mySi(st) - L.TRIO_LV, 4, 35);
L.trioFoePow = (st, q, j) => L.discBasePow(L.trioFoeLv(st)) * L.DISC_V.pow * (1.5 - 0.05 * q) * (j === 2 ? 0.92 : 1);
wrap('sectMeet', b => st => {
  if (!L.trioOn(st)) return b(st);
  st.sect.meets++;
  const S = L.power(st), team = L.discTop(st, 2);
  const res = { n: st.sect.meets, start: L.sectPos(st), rounds: [], S, trio: true, team: team.map(x => x.u) };
  for (let j = 0; j < 3; j++) {
    const pos = L.sectPos(st), q = pos === 1 ? 2 : pos - 1, foe = L.nineAt(st, q), Q = L.ninePower(st, q);
    const fo = { kind: 'sect', id: foe.id }, Sr = L.duelPower(st, fo), p = L.duelP(st, Sr, Q, fo);
    if (L.revealFoe) L.revealFoe(st, fo);
    let me = R() < p, xx = false;
    if (!me && L.gearXuanxiao(st) && (res.xx || 0) < L.XX_TIMES) { res.xx = (res.xx || 0) + 1; xx = true; me = R() < p; }
    const trio = [{ who: 'me', n: st.p.name, S: Sr, Q, p, win: me }];
    team.forEach((x, i) => { const Sd = L.discPow(st, x), Qd = L.trioFoePow(st, q, i + 1), pd = L.duelChance(Sd, Qd); trio.push({ who: 'disc', u: x.u, n: x.n, S: Sd, Q: Qd, p: pd, win: R() < pd }); });
    const wins = trio.filter(t => t.win).length, win = wins >= 2;
    const rd = { q, foe, Q, S: Sr, p, win, defend: pos === 1, xx, trio, wins };
    if (win) {
      if (pos > 1) { const o = st.sect.order; [o[pos - 1], o[q - 1]] = [o[q - 1], o[pos - 1]]; }
      st.stats.meetWins = (st.stats.meetWins || 0) + 1;
      rd.contrib = L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.CONTRIB.meet);
      rd.stones = Math.floor(L.income(st) * 5 + 100); st.stones += rd.stones;
      if (foe.id === 'tianjian') st.flags.beatTianjian = (st.flags.beatTianjian || 0) + 1;
      for (const t of trio) if (t.who === 'disc' && t.win) { const x = L.discByU(st, t.u); if (x) x.heart = Math.min(5, x.heart + (R() < 0.3 ? 1 : 0)); }
    }
    st.stats.trioRounds = (st.stats.trioRounds || 0) + 1; if (win) st.stats.trioWins = (st.stats.trioWins || 0) + 1;
    res.rounds.push(rd);
    if (!win || rd.defend) break;
  }
  res.end = L.sectPos(st);
  st.sect.best = Math.min(st.sect.best, res.end);
  L.log(st, `第${res.n}届九宗会武（三人战）落幕，${L.sectOf(st).n}位列天下第 ${res.end} 宗`, res.end < res.start ? 'gold' : '');
  L.checkQuests(st);
  return res;
});
});
