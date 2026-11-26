// 用旧版本（2.3.1 / 2.3.2）的逻辑生成旧存档：node genfix.js <旧版本目录> <前缀 v231|v232> <输出目录>
const fs = require('fs');
const [W, tag, out] = process.argv.slice(2);
const { run, L } = require(W + '/tools/sim.js');
fs.mkdirSync(out, { recursive: true });
const reborn = (origin, trials) => L.newState({ name: '旧档', rebirth: 1, origin, trials: trials || [], meta: L.newMeta() });
const LIST = [
  // [名字, 策略, 种子, 跑几个月, 入宗方式, 开局]
  ['ch2_joined_t60', 'guided', 3, 60, 'join'],
  ['ch2_refuse_t120', 'guided', 4, 120, 'refuse'],      // 没人让进门派：境界一路往上，章停在第二章
  ['ch2_refuse_t300', 'guided', 5, 300, 'refuse'],
  ['ch2_refuse_t500', 'guided', 6, 500, 'refuse'],
  ['ch4_t150', 'guided', 7, 150, 'join'],
  ['ch6_t330', 'guided', 8, 330, 'join'],
  ['ch8_t450', 'guided', 9, 450, 'join'],
  ['pactlost_t40', 'guided', 10, 40, 'join', null, true],
  ['lazy_t300', 'lazy', 11, 300, 'join'],
  ['idle_t200', 'idle', 12, 200, 'join'],
  ['lone_sanxiu_t200', 'guided', 13, 200, 'refuse', () => reborn('sanxiu')],   // 散修丹师不入宗：卡在第三章散修路线的那一类
  ['lone_sanxiu_t400', 'guided', 14, 400, 'refuse', () => reborn('sanxiu')],
  ['lone_wuzong_t250', 'guided', 15, 250, 'refuse', () => reborn('qitu', ['wuzong'])],
  ['moyi_t200', 'guided', 16, 200, 'join', () => reborn('moyi')],
];
const j0 = L.joinSect;
for (const [name, strat, seed, maxT, mode, mk, lose] of LIST) {
  L.joinSect = mode === 'refuse' ? () => false : j0;
  const pp = L.PACT_POWER; if (lose) L.PACT_POWER = 1e12;
  let st0; try { st0 = mk ? mk() : undefined; } catch (e) { console.log(tag, name, '开局造不出来：' + e.message); L.PACT_POWER = pp; continue; }
  let r, snap = null; const tk0 = L.tick; L.tick = function (st) { const o = tk0.apply(this, arguments); if (st.tick === maxT && !snap) snap = JSON.parse(JSON.stringify(st)); return o; };
  try { r = run(strat, seed, false, { keep: true, maxT, st0 }); } catch (e) { console.log(tag, name, '跑不动：' + e.message); L.PACT_POWER = pp; L.tick = tk0; continue; }
  L.PACT_POWER = pp;
  L.tick = tk0;
  const st = snap || r.st;
  if (!st) { console.log(tag, name, '没有 st'); continue; }
  for (const k of Object.keys(st)) if (k[0] === '_') delete st[k];
  const ch = L.chapterNow ? L.chapterNow(st) : -1;
  fs.writeFileSync(`${out}/${tag}_${name}.json`, JSON.stringify(st));
  console.log(tag, name, 'v', st.v, 't', st.tick, 'r', st.p.r, 'ch', ch + 1, 'sect', st.sect ? st.sect.id + st.sect.rank : '-', 'pact', st.pact, 'origin', st.origin, 'bytes', JSON.stringify(st).length);
}
