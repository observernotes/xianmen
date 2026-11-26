// 回合战的词条 / 金词条 / 开锋逐条生效检查（docs/COMBAT_LOOT.md §5.2、§6.1；数据来自刷宝线的 L.gearBattle）：node tools/battle_check.js
// 做法：同一个存档、同一组种子，“带这一条”和“不带”各打一批，比一个看得见的量（伤害、怒气、气血、冷却、削罩、胜率……）。
// 不碰 L.rng（引擎自带随机数），所以每次跑结果一样。任何一条没生效返回退出码 1。
const L = require('../src/logic.js');
let fails = 0;
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails++; };
L.ONB_ON = false;   // 不走上手曲线：三个法宝槽、战技槽直接开
L.rng = (() => { let s = 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })();

// 一个中期存档：兵器（剑，金）、法衣、饰品都戴上，战技裂金斩
function mk() {
  const st = L.newState({ name: '词条' });
  st.p.r = 2; st.flags.maxR = 2; st.flags.maxI = 8; st.rebirth = 1;
  L.giveArt(st, 'z_liejin'); L.equipArt(st, 'z_liejin');
  for (const [slot, base] of [['w', 'w2_0'], ['r', 'r2_0'], ['o', 'o_cul4']]) { const it = L.gearDrop(st, slot, 2, { base }); if (it && it.pend) L.gearDecide(st, it.gear.u, 'equip'); }
  for (const s of L.GEAR_SLOTS) if (st.gear[s]) { st.gear[s].aff = []; st.gear[s].gold = ''; st.gear[s].edge = []; st.gear[s].plus = 0; }
  return st;
}
const T = 400, Q = 400;
// 打一批：foes(kind, el) 造敌人；返回各种统计
function run(st, o) {
  o = o || {};
  const N = o.N || 300, out = { win: 0, dmg: 0, hits: 0, rage0: 0, hp: 0, maxHp: 0, cut: 0, heavy: 0, dot: 0, wcd: 0, crit: 0, critN: 0, lianji: 0, spread: 0, budong: 0, heal: 0 };
  for (let i = 0; i < N; i++) {
    const foes = (o.foes || [['elite', 'mu']]).map(([k, el]) => L.btFoe('x', Q, { kindAs: k, el }));
    const B = L.battleNew(st, foes, 1000 + i * 17, { T, hp: o.hp === undefined ? 1 : o.hp, rage: o.rage || 0, budong: o.budong });
    out.rage0 += B.rage; out.maxHp += B.max;
    const w = B.me.skills.find(s => s.kind === 'w'); if (w) out.wcd += w.cd;
    let first = true;
    while (!B.done) {
      const ev = L.battleStep(B, { ult: B.rage >= 100 });
      for (const e of ev) {
        if (e.who === 'me' && (e.t === 'hit' || e.t === 'skill' || e.t === 'ult')) { out.dmg += e.dmg; out.hits++; if (e.t === 'hit' && e.id !== 'lianji') { out.critN++; if (e.crit) out.crit++; } if (e.id === 'lianji') out.lianji++; }
        if (e.t === 'shield') out.cut += e.cut;
        if (e.t === 'heavy') out.heavy += e.dmg;
        if (e.t === 'dot') out.dot += e.dmg;
        if (e.t === 'spread') out.spread++;
        if (e.t === 'budong') out.budong++;
      }
      if (first && o.firstRound) { out.firstActs = (out.firstActs || 0) + ev.filter(e => e.who === 'me' && (e.t === 'hit' || e.t === 'skill')).length; }
      first = false;
      if (o.stopAfter && B.round >= o.stopAfter) break;
    }
    if (B.win) out.win++;
    out.hp += B.hp / B.max;
  }
  return out;
}
const withAff = (slot, ids) => { const st = mk(); st.gear[slot].aff = ids; return st; };
const withGold = g => { const st = mk(); st.gear.w.gold = g; return st; };
const per = (o, k) => o[k] / Math.max(1, o.hits);

console.log('—— L.gearBattle 读得到 ——');
{ const st = withAff('w', ['huixin', 'ke_mu']); st.gear.w.gold = 'fenguang'; st.gear.w.edge = ['feng']; const gb = L.gearBattle(st), me = L.btMe(st, T);
  check(gb.aff.huixin === 1 && me.aff.huixin === 1 && me.ke.mu === 1 && me.gold.fenguang && me.edge.feng === 1, `btMe 读 L.gearBattle：词条 / 克 X / 金词条 / 开锋（${JSON.stringify({ aff: me.aff, ke: me.ke, gold: me.gold, edge: me.edge })}）`); }

console.log('—— 战斗词条 14 条 + 藏锋 ——');
const base = run(mk());
{ const a = run(withAff('w', ['huixin'])); check(a.crit / a.critN > base.crit / base.critN + 0.06, `会心：普攻暴击率 ${(base.crit / base.critN * 100).toFixed(0)}% → ${(a.crit / a.critN * 100).toFixed(0)}%`); }
{ const a = run(withAff('w', ['lianji'])); check(a.lianji > 0 && base.lianji === 0, `连击：普攻再打一下 ${a.lianji} 次`); }
{ const a = run(mk(), { hp: 0.5, N: 200 }), b = run(withAff('w', ['xixue']), { hp: 0.5, N: 200 }); check(b.hp > a.hp, `吸血：平均剩血 ${(a.hp / 2).toFixed(1)}% → ${(b.hp / 2).toFixed(1)}%`); }
{ const st0 = mk(), st1 = withAff('w', ['pozhao']); for (const s of [st0, st1]) { L.giveArt(s, 'z_wuxing'); L.equipArt(s, 'z_liejin'); }
  const a = run(st0, { stopAfter: 1 }), b = run(st1, { stopAfter: 1 }); check(b.cut > a.cut, `破罩：第一轮削罩 ${a.cut} → ${b.cut} 格`); }
{ const a = run(withAff('o', ['xiansheng'])); check(a.rage0 / 300 >= base.rage0 / 300 + 29, `先声：开场怒气 ${base.rage0 / 300} → ${a.rage0 / 300}`); }
{ const a = run(mk(), { rage: 100, stopAfter: 1 }), b = run(withAff('w', ['xushi']), { rage: 100, stopAfter: 1 }); check(b.dmg > a.dmg * 1.12, `蓄势：开场绝招伤害 ${a.dmg} → ${b.dmg}（×3 → ×3.6）`); }
{ const a = run(mk(), { hp: 0.25, stopAfter: 1 }), b = run(withAff('w', ['fengsheng']), { hp: 0.25, stopAfter: 1 }); check(b.dmg > a.dmg * 1.2, `逢生：血少于三成时伤害 ${a.dmg} → ${b.dmg}`); }
{ const a = run(mk(), { stopAfter: 6 }), b = run(withAff('w', ['yinbao']), { stopAfter: 6 }); check(b.dmg > a.dmg * 1.03, `引爆：打带状态（破甲）的目标 ${a.dmg} → ${b.dmg}`); }
{ const a = run(withAff('r', ['jianren'])); check(a.maxHp > base.maxHp * 1.11, `坚韧：气血上限 ×${(a.maxHp / base.maxHp).toFixed(3)}`); }
{ const a = run(mk(), { stopAfter: 6 }), b = run(withAff('r', ['fanzhen']), { stopAfter: 6 }); const fa = L.battleNew(mk(), [L.btFoe('x', Q, { kindAs: 'elite', el: 'mu' })], 5, { T }), fb = L.battleNew(withAff('r', ['fanzhen']), [L.btFoe('x', Q, { kindAs: 'elite', el: 'mu' })], 5, { T });
  for (let r = 0; r < 6; r++) { L.battleStep(fa, {}); L.battleStep(fb, {}); }
  void a; void b; check(fb.foes[0].hp < fa.foes[0].hp, `反震：同一种子 6 轮后敌人剩血 ${fa.foes[0].hp.toFixed(0)} → ${fb.foes[0].hp.toFixed(0)}`); }
{ const a = run(mk()), b = run(withAff('r', ['tiebi'])); check(b.heavy < a.heavy * 0.85, `铁壁：挨的重击总量 ${a.heavy} → ${b.heavy}`); }
{ const fa = L.battleNew(mk(), [L.btFoe('x', Q, { kindAs: 'elite', el: 'mu' })], 9, { T }), fb = L.battleNew(withAff('r', ['huiqi']), [L.btFoe('x', Q, { kindAs: 'elite', el: 'mu' })], 9, { T });
  L.battleStep(fa, {}); L.battleStep(fb, {}); check(fb.rage >= fa.rage + 4, `回气：第一轮后怒气 ${fa.rage} → ${fb.rage}`); }
{ const a = run(mk(), { firstRound: true, stopAfter: 1 }), b = run(withAff('r', ['jixing']), { firstRound: true, stopAfter: 1 }); check(b.firstActs > a.firstActs * 1.8, `疾行：第一轮出手 ${a.firstActs} → ${b.firstActs}`); }
{ // 养伤：场间回血 12% → 20%（trip.js 的 L.expNodeDone）
  const run1 = st => { st.stats.exp = 5; st.best['0_0'] = 3; L.startExp(st, 0, 0, 0); st.exp.hp = 0.3; L.expNodeDone(st, { win: true, hp: 0.3, rage: 0, used: {}, mats: { core: {} }, kills: [] }); return st.exp.hp; };
  const a = run1(mk()), b = run1(withAff('o', ['yangshang'])); check(b > a + 0.07, `养伤：场间回血后 ${(a * 100).toFixed(0)}% → ${(b * 100).toFixed(0)}%`); }
{ const a = run(mk(), { foes: [['elite', 'huo']], stopAfter: 1 }), b = run(withAff('w', ['cangfeng']), { foes: [['elite', 'huo']], stopAfter: 1 }); check(b.dmg > a.dmg * 1.1, `藏锋：被克（金打火）时第一轮伤害 ${a.dmg} → ${b.dmg}`); }
{ const a = run(mk(), { foes: [['elite', 'tu']], stopAfter: 3 }), b = run(withAff('w', ['ke_tu']), { foes: [['elite', 'tu']], stopAfter: 3 }); check(b.dmg > a.dmg * 1.15, `克土：打土系 ${a.dmg} → ${b.dmg}（+20%，普攻也算）`); }
{ const a = run(mk(), { foes: [['elite', 'shui']], stopAfter: 3 }), b = run(withAff('w', ['ke_tu']), { foes: [['elite', 'shui']], stopAfter: 3 }); check(Math.abs(b.dmg - a.dmg) < 1, `克土：打水系不加（${a.dmg} / ${b.dmg}）`); }

console.log('—— 金词条 8 条 ——');
{ const a = run(mk(), { stopAfter: 3 }), b = run(withGold('fenguang'), { stopAfter: 3 }); check(b.dmg > a.dmg * 1.05, `分光：器技多打一段 ${a.dmg} → ${b.dmg}`); }
{ let n = 0; for (let i = 0; i < 200; i++) { const B = L.battleNew(withGold('huixiang'), [L.btFoe('x', Q, { kindAs: 'boss', el: 'mu' })], 300 + i, { T, rage: 100 }); L.battleStep(B, { ult: true }); if (B.rage >= 50) n++; } check(n > 30 && n < 120, `回响：绝招后怒气还一半 ${n} / 200 次`); }
{ const a = run(mk(), { hp: 0.02, N: 100 }), b = run(withGold('budong'), { hp: 0.02, N: 100, budong: true }); check(b.budong > 0 && b.win >= a.win, `不动：致命伤留 1 点血 ${b.budong} 次（胜 ${a.win} → ${b.win}）`); }
{ let hit = 0; for (let i = 0; i < 200; i++) { const B = L.battleNew(withGold('jieshi'), [L.btFoe('x', Q, { kindAs: 'elite', el: 'mu' })], 500 + i, { T }); B.foes[0].charge = 1; B.rage = 100; L.battleStep(B, { ult: true }); if (B.jieshi) hit++; } check(hit === 200, `借势：破招后下一招必暴击 ×1.5（挂上 ${hit} / 200）`); }
{ const a = run(mk(), { foes: [['mob', 'mu'], ['mob', 'mu']] }), b = run(withGold('shisha'), { foes: [['mob', 'mu'], ['mob', 'mu']] }); void a; let g = 0; for (let i = 0; i < 100; i++) { const B = L.battleNew(withGold('shisha'), [L.btFoe('x', Q, { kindAs: 'mob', el: 'mu', hpM: 0.05 }), L.btFoe('x', Q, { kindAs: 'mob', el: 'mu' })], 700 + i, { T }); const r0 = B.rage; L.battleStep(B, {}); if (B.rage - r0 >= 70) g++; } void b; check(g > 50, `嗜杀：击杀后怒气 +50（${g} / 100 场第一轮怒气涨 ≥ 70）`); }
{ const st = withGold('liaoyuan'); L.giveArt(st, 'z_liaoyuan'); L.equipArt(st, 'z_liaoyuan'); const a = run(st, { foes: [['mob', 'mu'], ['mob', 'mu']] }); check(a.spread > 0, `燎原：灼烧传给下一只 ${a.spread} 次`); }
{ const st0 = mk(), st1 = withGold('guiyi'); const m0 = L.btMe(st0, T), m1 = L.btMe(st1, T); const z0 = m0.skills.find(s => s.kind === 'z'), z1 = m1.skills.find(s => s.kind === 'z'), w0 = m0.skills.find(s => s.kind === 'w'), w1 = m1.skills.find(s => s.kind === 'w');
  check(z0.el === w0.el && z1.m > z0.m * 1.19 && w1.m > w0.m * 1.19, `归一：战技、器技同为${L.elName(z0.el)}，两招 ×${(z1.m / z0.m).toFixed(2)} / ×${(w1.m / w0.m).toFixed(2)}`); }
{ const st0 = mk(), st1 = withGold('huajin'); const a = run(st0, { foes: [['elite', 'huo']], stopAfter: 4 }), b = run(st1, { foes: [['elite', 'huo']], stopAfter: 4 }); check(b.cut > a.cut, `化劲：被克（金打火）也能削罩 ${a.cut} → ${b.cut} 格`); }

console.log('—— 开锋 ——');
{ const st = mk(); st.gear.w.edge = ['feng']; const a = run(mk(), { stopAfter: 3 }), b = run(st, { stopAfter: 3 }); check(b.dmg > a.dmg * 1.04, `锋：伤害 +6%（${a.dmg} → ${b.dmg}）`); }
{ const st = mk(); st.gear.w.edge = ['ling']; const a = run(st); check(a.wcd / 300 === base.wcd / 300 - 1, `灵：器技冷却 ${base.wcd / 300} → ${a.wcd / 300}`); }
{ const st = mk(); st.gear.w.edge = ['ren']; const a = run(st); check(a.maxHp > base.maxHp * 1.07, `韧：气血 ×${(a.maxHp / base.maxHp).toFixed(3)}`); }

console.log(fails ? `\n${fails} 条没生效` : '\n全部生效');
process.exitCode = fails ? 1 : 0;
