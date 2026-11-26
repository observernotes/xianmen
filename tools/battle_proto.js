// 战斗数值原型（docs/COMBAT_LOOT.md §8.3 的表由它跑出）：node tools/battle_proto.js。不是游戏代码，实施 src/logic/battle.js 后可删。
let seed = 1; const R = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const A = n => +(process.env[n] || NaN);
const C = { hpK: 10, mob: { q: 0.6, hp: A('MH') || 0.5, at: A('MA') || 0.9 }, elite: { q: 1.0, hp: A('EH') || 1.0, at: A('EA') || 0.85, sh: 3 }, boss: { q: 1.6, hp: 2.0, at: 1.1, sh: 5 }, duel: { q: 1, hp: A('DH') || 1.5, at: A('DA') || 1.5, sh: 0 }, mom: A('MOM') || 0.3,
  ke: 1.3, beike: 0.8, foeKe: 1.15, foeBeike: 0.9, skill: 1.6, skillCd: 3, wskill: 1.3, wCd: 4, ult: 3.0, rageAct: 20, rageHit: 10,
  crit: 0.15, critM: 1.8, heavy: 2.2, heavyEvery: 4, brk: 1.3, brkLen: 2, chain: 1.3, between: 0.12, vari: 0.4 };
// o.el: 1 我克它, 0 中, -1 被克 ; o.pol: 'auto' | 'smart'（留绝招打断蓄力）; o.pill 带一枚疗伤丹
function fight(T, Q, kind, me, o) {
  const K = C[kind], a = Math.sqrt(T) * (1 + C.mom * (2 * R() - 1)), fa = Math.sqrt(Q) * K.at * (1 + C.mom * (2 * R() - 1)), fhp0 = C.hpK * Math.sqrt(Q) * K.hp;
  let fhp = fhp0, sh = K.sh || 0, cd = 0, wcd = 1, t = 0, charge = 0, stun = 0, weak = 0, rounds = 0;
  const em = o.el > 0 ? C.ke : o.el < 0 ? C.beike : 1, fm = o.el > 0 ? C.foeBeike : o.el < 0 ? C.foeKe : 1;
  while (fhp > 0 && me.hp > 0 && rounds < 40) {
    rounds++; t++;
    let m = 1, isSkill = false, brkN = 0;
    const wantUlt = me.rage >= 100 && (o.pol !== 'smart' || charge === 1 || kind === 'mob' || me.hp < me.max * 0.35);
    if (wantUlt) { m = C.ult; me.rage = 0; isSkill = true; brkN = 2; if (charge === 1) { charge = 0; me.brk = (me.brk || 0) + 1; } }
    else if (cd <= 0) { m = C.skill * (o.chain ? C.chain : 1); cd = C.skillCd; isSkill = true; brkN = 1; }
    else if (wcd <= 0) { m = C.wskill; wcd = C.wCd; isSkill = true; brkN = 1; }
    cd--; wcd--;
    let d = a * m * (isSkill ? em : 1) * (1 - C.vari / 2 + C.vari * R()) * (R() < C.crit ? C.critM : 1) * (weak > 0 ? C.brk : 1);
    if (sh > 0) { d *= 0.6; if (isSkill && (o.el > 0 || m === C.ult)) { sh -= o.el > 0 ? brkN : 1; if (sh <= 0) { sh = 0; stun = 1; weak = C.brkLen + 1; charge = 0; } } }
    fhp -= d; me.rage = Math.min(100, me.rage + C.rageAct);
    if (weak > 0) weak--;
    if (fhp <= 0) break;
    if (stun > 0) { stun--; continue; }
    let fd;
    if (kind !== 'mob' && charge === 0 && t % C.heavyEvery === 0) { charge = 1; continue; }
    if (charge === 1) { fd = fa * C.heavy; charge = 0; } else fd = fa;
    fd *= fm * (1 - C.vari / 2 + C.vari * R()) * (R() < 0.1 ? 1.5 : 1);
    me.hp -= fd; me.rage = Math.min(100, me.rage + C.rageHit);
    if (o.pill && me.hp > 0 && me.hp < me.max * 0.35 && !me.pilled) { me.hp += me.max * 0.25; me.pilled = 1; }
  }
  return { win: fhp <= 0 && me.hp > 0, rounds };
}
function trip(T, rec, o) {
  const max = C.hpK * Math.sqrt(T) * (o.hpM || 1); const me = { hp: max, max, rage: o.rage0 || 0 };
  const seq = o.seq || ['mob', 'mob', 'elite']; let n = 0, rounds = 0;
  for (const k of seq) { const r = fight(T, rec * C[k].q, k, me, o); rounds += r.rounds; if (!r.win) return { n, hp: 0, rounds, brk: me.brk || 0 }; n++; me.hp = Math.min(max, me.hp + max * C.between); }
  return { n, hp: me.hp / max, rounds, brk: me.brk || 0 };
}
const rating = r => (r.n < 1 ? 0 : r.n < 3 ? 1 : r.hp >= 0.75 ? 4 : r.hp >= 0.45 ? 3 : 2);
function stat(ratio, o, N = 4000) { const c = [0, 0, 0, 0, 0]; let hp = 0, rd = 0; for (let i = 0; i < N; i++) { const r = trip(100 * ratio, 100, o); c[rating(r)]++; hp += r.hp; rd += r.rounds; } return { dist: c.map(x => (x / N * 100).toFixed(0).padStart(3)).join(' '), hp: (hp / N).toFixed(2), rounds: (rd / N).toFixed(1), clear: ((c[2] + c[3] + c[4]) / N * 100).toFixed(0) }; }
if (require.main === module) {
  console.log('ratio | el | 丁  丙  乙  甲  天 | 通关% | 剩血 | 回合');
  for (const el of [0, 1, -1]) for (const ratio of [0.4, 0.55, 0.7, 0.85, 1, 1.2, 1.5, 1.8, 2.4, 3.2]) { const s = stat(ratio, { el, pol: 'auto' }); console.log(String(ratio).padEnd(5), String(el).padStart(2), '|', s.dist, '|', s.clear.padStart(3), '|', s.hp, '|', s.rounds); }
  console.log('--- smart（留绝招破招）+ 吞丹');
  for (const ratio of [0.55, 0.7, 0.85, 1, 1.2]) { const s = stat(ratio, { el: 0, pol: 'smart', pill: 1 }); console.log(String(ratio).padEnd(5), ' 0 |', s.dist, '|', s.clear.padStart(3), '|', s.hp, '|', s.rounds); }
  console.log('--- 1v1 对决（自动），对照旧公式 0.5 + 0.55·log2(r)');
  for (const ratio of [0.5, 0.6, 0.7, 0.85, 1, 1.2, 1.5, 1.8]) { let w = 0; const N = 6000; for (let i = 0; i < N; i++) { const T = 100 * ratio, max = C.hpK * Math.sqrt(T); const me = { hp: max, max, rage: 0 }; if (fight(T, 100, 'duel', me, { el: 0, pol: 'auto', duel: 1 }).win) w++; } const old = Math.max(0.03, Math.min(0.97, 0.5 + 0.55 * Math.log2(ratio))); console.log(ratio, (w / N * 100).toFixed(0) + '%', 'old', (old * 100).toFixed(0) + '%'); }
}
module.exports = { C, fight, trip, stat };
