/* 废柴仙途 · 逻辑模块 report：年报的数据（docs/KAIRO_PLAN.md §6.2）
 * 模块写法见 src/logic.js 顶部说明。排在 time 之后（包 L.tick、L.flow、L.resolveExp）。
 *
 *   每 12 月的月初（st.tick % 12 === 0）把这一年封成一份年报：st.rep.ready = L.yearReport 的结果，同时开新的一年；
 *   界面在打坐态（在外就等归来结算之后）弹年报，看完调 L.yearClose(st)。sim 不调也没关系（下一年到时覆盖）。
 *   st.rep = { y, t0, r, s, pw, gain, rank, earn, spend, exp, best, lastS }：本年起点快照与累计；
 *   灵石“赚 / 花”：L.flow 的被动收入 + 每月对账（两次对账之间灵石多出来的算赚、少了的算花，同一个月里先赚后花会抵掉一部分）。
 *   历年：st.repHist（最近 60 年，一年约 10 个数，给【仙途】→ 记录）。L.migrateReport 幂等。
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const HIST_MAX = 60;
const rankOn = st => !!st.pact;
const startRep = st => ({ y: Math.floor(st.tick / 12) + 1, t0: st.tick, r: L.stageName(st.p), ri: L.si(st.p), pw: L.power(st), gain: L.gain(st), rank: rankOn(st) ? st.rank : 0, earn: 0, spend: 0, exp: (st.stats && st.stats.exp) || 0, best: -1, lastS: st.stones, opened: [] });
const rep = st => st.rep || (st.rep = startRep(st));
function settle(st) {
  const R = rep(st), d = st.stones - R.lastS;
  if (d > 0) R.earn += d; else R.spend -= d;
  R.lastS = st.stones;
}
{ const f0 = L.flow; L.flow = function (st, f) {
  if (st && st.p) settle(st);
  f0.apply(this, arguments);
  if (st && st.p) { const R = rep(st), d = st.stones - R.lastS; if (d > 0) R.earn += d; R.lastS = st.stones; }
}; }
{ const re0 = L.resolveExp; L.resolveExp = function (st) {
  const r = re0.apply(this, arguments);
  if (r && st.p && typeof r.rating === 'number') { const R = rep(st); R.best = Math.max(R.best, r.rating); }
  return r;
}; }
// 老祖一句评语：本年哪一项涨得最少（≤ 20 字，带一个数）
function sayOf(o) {
  const g = a => (a[0] > 0 ? a[1] / a[0] - 1 : 0);
  const c = [];
  if (o.exp <= 1) c.push([-1, `一年才出门 ${o.exp} 趟，多出去走走`]);
  c.push([g(o.pw), `战力才涨 ${Math.round(g(o.pw) * 100)}%，去换件好法宝`]);
  c.push([g(o.gain), `修炼才涨 ${Math.round(g(o.gain) * 100)}%，升一升聚灵阵`]);
  if (o.rank && o.rank[0] && o.rank[1] >= o.rank[0]) c.push([0, `名次没动，第 ${o.rank[1]}，论道前多备战`]);
  if (o.hoard > 0) c.push([0.05, `攒着 ${L.fmt(o.hoard)} 灵石不花，可惜了`]);
  c.sort((a, b) => a[0] - b[0]);
  return c[0][0] < 0.25 ? c[0][1] : '这一年没白过，接着来';
}
L.yearReport = function (st, live) {
  if (!st || !st.p) return null;
  if (!live && st.rep && st.rep.ready) return Object.assign({}, st.rep.ready, { next: nextOf(st) });
  settle(st);
  const R = rep(st), o = st.onb || { at: {} };
  const out = { y: R.y, t0: R.t0, t1: st.tick, realm: [R.r, L.stageName(st.p)], up: L.si(st.p) - R.ri, pw: [Math.round(R.pw), Math.round(L.power(st))], gain: [R.gain, L.gain(st)], earn: Math.floor(R.earn), spend: Math.floor(R.spend),
    exp: ((st.stats && st.stats.exp) || 0) - R.exp, best: R.best, bestT: R.best >= 0 ? L.RATINGS[R.best] : '', rank: rankOn(st) && R.rank ? [R.rank, st.rank] : null,
    opened: (L.ONB || []).filter(e => o.at[e.k] !== undefined && o.at[e.k] > R.t0 && o.at[e.k] <= st.tick).map(e => e.k) };
  out.hoard = st.stones > Math.max(1, L.income(st)) * 30 ? Math.floor(st.stones) : 0;
  out.say = sayOf(out);
  out.next = nextOf(st);
  return out;
};
function nextOf(st) { const g = L.goalNow ? L.goalNow(st) : null, b = L.bigNext ? L.bigNext(st) : null; return { ch: g ? { chN: g.chN, t: g.t, bar: g.bar } : null, big: b ? { k: b.k, n: b.n, left: b.left } : null }; }
L.yearHist = st => (Array.isArray(st.repHist) ? st.repHist : []);
L.yearDue = st => !!(st && st.rep && st.rep.ready) && !L.busy(st);
L.yearClose = function (st) { if (st.rep && st.rep.ready) delete st.rep.ready; };
{ const tick0 = L.tick; L.tick = function (st, cont) {
  const out = tick0.apply(this, arguments);
  if (st.p.r <= L.MAXR && st.tick > 0 && st.tick % 12 === 0) {
    const yr = L.yearReport(st, true);
    if (!Array.isArray(st.repHist)) st.repHist = [];
    st.repHist.push({ y: yr.y, r: yr.realm[1], pw: yr.pw[1], gain: Math.round(yr.gain[1] * 10) / 10, earn: yr.earn, spend: yr.spend, exp: yr.exp, best: yr.best, rank: yr.rank ? yr.rank[1] : 0 });
    if (st.repHist.length > HIST_MAX) st.repHist.splice(0, st.repHist.length - HIST_MAX);
    delete yr.next;
    st.rep = startRep(st);
    st.rep.ready = yr;
    out.year = { y: yr.y };
  }
  return out;
}; }
L.migrateReport = function (st) {
  if (!st || !st.p) return st;
  if (!st.rep || typeof st.rep !== 'object' || typeof st.rep.t0 !== 'number') st.rep = startRep(st);
  if (!Array.isArray(st.repHist)) st.repHist = [];
  return st;
};
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); st.rep = startRep(st); st.repHist = []; return st; }; }
// 存档迁移入口（save.js 调一行）：路径、时钟、年报
L.migrateKairo = function (st) { if (L.migratePath) L.migratePath(st); if (L.migrateTime) L.migrateTime(st); L.migrateReport(st); return st; };
});
