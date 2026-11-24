// 数值模拟：用一个“正常玩家”策略跑完一局，打印里程碑时间线
const L = require('../src/logic.js');
const seed = Number(process.argv[2] || 1);
let s = seed;
L.rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const st = L.newState({ sect: '测试宗' });
const ms = {};
const mark = (k) => { if (!ms[k]) ms[k] = `Y${st.year}.${st.month}`; };
let lastGoal = 0;
for (let m = 0; m < 12 * 150; m++) {
  // 突破
  for (const d of [...st.ds]) if (L.isReady(d)) { const r = L.breakthrough(st, d, st.pills > 0); if (r && r.ok) mark('R' + (r.from + 1)); }
  if (st.ascended) { mark('ascend'); break; }
  // 建设：优先最便宜的（山门有人满才升）
  for (let loop = 0; loop < 20; loop++) {
    const opts = ['array', 'mine', 'library', 'alchemy'].map(k => [k, L.bCost(k, st.b[k]) * (k === 'alchemy' ? 1.6 : k === 'mine' ? 0.8 : 1)]);
    if (st.ds.length >= L.cap(st) && st.b.gate < 9) opts.push(['gate', L.bCost('gate', st.b.gate) * 0.7]);
    opts.sort((a, b) => a[1] - b[1]);
    const k = opts[0][0];
    if (st.stones >= L.bCost(k, st.b[k]) * 1.0 && L.upgrade(st, k)) continue;
    break;
  }
  // 收徒
  if (st.stones >= L.recruitCost(st) * 1.2) {
    const full = st.ds.length >= L.cap(st);
    const worst = st.ds.filter(d => !d.master && !d.away).sort((a, b) => a.t - b.t)[0];
    if (!full || (worst && worst.t <= 2)) {
      const c = L.recruit(st);
      const best = c.sort((a, b) => b.t - a.t)[0];
      if (full) { if (best.t > worst.t + 1) { L.dismiss(st, worst); L.accept(st, best); } }
      else L.accept(st, best);
    }
  }
  // 历练
  const team = L.autoTeam(st);
  if (team.length && st.exps.length === 0) {
    let bestK = -1;
    for (let k = L.DUNGEONS.length - 1; k >= 0; k--) {
      if (!L.unlocked(st, k)) continue;
      if (L.expChance(st, k, team).p >= 0.74) { bestK = k; break; }
    }
    if (bestK < 0) bestK = 0;
    L.startExp(st, bestK, team);
    mark('D' + bestK);
  }
  const out = L.monthTick(st);
  if (out.tourney) {
    const t = L.tournament(st);
    if (st.rank <= 60) mark('rank60');
    if (st.rank <= 30) mark('rank30');
    if (st.rank <= 12) mark('rank12');
    if (st.rank <= 5) mark('rank5');
    if (st.rank === 1) mark('rank1');
    if (st.beatRival) mark('beatRival');
  }
  if (st.month === 1 && process.argv[3]) {
    const top = st.ds.slice().sort((a, b) => L.power(st, b) - L.power(st, a))[0];
    console.log(`Y${st.year} stones=${L.fmt(st.stones)} inc=${L.fmt(L.income(st))} rep=${L.fmt(st.rep)} rank=${st.rank} b=${JSON.stringify(st.b)} ds=${st.ds.length} top=${top.name}:${L.stageName(top)} t${top.t} w${top.w} a${top.a} pw=${L.fmt(L.power(st, top))} S=${L.fmt(L.sectPower(st))} r1=${L.fmt(L.rivalPower(st, 1))} r12=${L.fmt(L.rivalPower(st, 12))} cleared=${st.cleared} pills=${st.pills} recr=${st.recruits}`);
  }
}
console.log(seed, JSON.stringify(ms));
