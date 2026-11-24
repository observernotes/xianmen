const L = require('../src/logic.js');
let s = 7; L.rng = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
// 统计最强弟子每个境界用时与倍率
const orig = L.breakthrough;
let last = {};
L.breakthrough = function (st, d, p) {
  const r = orig(st, d, p);
  if (r && r.ok) {
    const key = d.id;
    const m = L.TALENTS[d.t].cul * L.ARTS[d.a].m * L.arrayMult(st.b.array);
    console.log(`Y${st.year}.${st.month} ${d.name} ->${L.REALMS[Math.min(d.r,9)].n} t=${d.t} a=${d.a} arr=${st.b.array} mult=${m.toFixed(1)} months=${st.totalMonths - (last[key]||0)}`);
    last[key] = st.totalMonths;
  }
  return r;
};
process.argv[3]='';
require('./sim.js');
