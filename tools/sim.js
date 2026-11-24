// 数值模拟：一个“正常玩家”策略跑完一世，打印里程碑（单位：周天 t / 年龄 a）
const L = require('../src/logic.js');
const seed = Number(process.argv[2] || 1);
const verbose = !!process.argv[3];
let s = seed;
L.rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const st = L.newState({ name: '测试' });
const ms = {}; const pw = {};
const mark = k => { if (!ms[k]) ms[k] = `t${st.tick}/a${Math.floor(st.p.age)}`; };
for (let n = 0; n < 2000; n++) {
  const p = st.p;
  if (L.isReady(st)) { const r = L.breakthrough(st, st.pills > 0); if (r.ok) { mark('R' + r.to); pw['R' + r.to] = L.fmt(r.after); } }
  if (p.r >= 9) break;
  // 洞府：优先最便宜
  for (let loop = 0; loop < 20; loop++) {
    const opts = L.HOME.map(b => [b.k, L.hCost(b.k, st.home[b.k]) * (b.k === 'furnace' ? 1.6 : b.k === 'cave' ? 1.4 : 1)]).filter(o => st.home[o[0]] < L.HOME.find(b => b.k === o[0]).max);
    opts.sort((a, b) => a[1] - b[1]);
    const k = opts[0][0];
    if (st.stones >= L.hCost(k, st.home[k]) && L.upgrade(st, k)) continue;
    break;
  }
  // 坊市
  if (st.pills < 2 && st.stones > L.price(st, 'pill') * 4) L.buy(st, 'pill');
  if (st.stones > L.price(st, 'box') * 5) L.buy(st, 'box');
  if ((!p.pet || p.pet.tier < 1 + p.r * 0.6) && st.stones > L.price(st, 'egg') * 4) L.buy(st, 'egg');
  if (L.desperate(st) && st.stones > L.price(st, 'life')) L.buy(st, 'life');
  // 宗门
  if (st.sect) {
    if (L.canPromote(st)) { const r = L.promote(st); if (r && r.ok) mark('S' + st.sect.rank); else if (r && r.duel) mark('duelLost'); }
    for (const k of ['vart', 'vwep']) if (st.sect.pts > L.vaultCost(st, k) * 1.2) L.vaultBuy(st, k);
  }
  // 历练
  if (!st.exp && !L.isReady(st)) {
    let best = -1;
    for (let k = L.REGIONS.length - 1; k >= 0; k--) if (L.unlocked(st, k) && L.expChance(st, k).p >= 0.74) { best = k; break; }
    if (best < 0) best = 0;
    L.startExp(st, best); mark('D' + best);
  }
  const out = L.tick(st);
  if (out.invite) { L.joinSect(st, ['jian', 'dan', 'dao'][seed % 3]); mark('join'); }
  if (out.pact) { const r = L.pactDuel(st); mark(r.win ? 'pactWin' : 'pactLose'); }
  if (out.war) { const r = L.sectWar(st); mark(r.win ? 'warWin' : 'warLose'); }
  if (out.tourney) {
    L.tournament(st);
    for (const q of [50, 12, 4, 1]) if (st.rank <= q) mark('rank' + q);
    for (const id of ['mu', 'zhao', 'chu', 'xue', 'yun']) if (st.beaten[id]) mark('beat_' + id);
  }
  if (out.death) { mark('DEATH'); break; }
  if (verbose && st.tick % 24 === 0) {
    console.log(`t${st.tick} a${Math.floor(p.age)}/${Math.floor(L.lifespan(st))} ${L.stageName(p)} t${p.t} w${p.w} a${p.a} pet${p.pet ? p.pet.tier : 0} pw=${L.fmt(L.power(st))} stones=${L.fmt(st.stones)} inc=${L.fmt(L.income(st))} home=${JSON.stringify(st.home)} rank=${st.rank} r1=${L.fmt(L.rivalPower(st, 1))} r12=${L.fmt(L.rivalPower(st, 12))} r50=${L.fmt(L.rivalPower(st, 50))} sect=${st.sect ? st.sect.rank + '/' + L.fmt(st.sect.total) : '-'} pills=${st.pills}`);
  }
}
if (process.argv[4]) console.log(JSON.stringify(pw));
console.log(seed, JSON.stringify(ms).replace(/"D\d+":"[^"]*",?/g, ''));
