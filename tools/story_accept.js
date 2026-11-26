#!/usr/bin/env node
/* 废柴仙途 · 主线可走通性验收（逻辑层；真实界面那一半在 tools/story_accept_ui.js；矩阵见 docs/STORY_ACCEPTANCE.md）
 *   node tools/story_accept.js                 全部用例（分 4 个子进程，约 5 分钟）
 *   node tools/story_accept.js quick           每个用例只跑 1 个种子
 *   node tools/story_accept.js only=<正则>     只跑 id 对得上的用例
 *   node tools/story_accept.js list            只列用例
 *   node tools/story_accept.js v               每局打印章节月份
 *   node tools/story_accept.js json=<文件>     结果另存一份 JSON（修复前后对照用）
 *   node tools/story_accept.js jobs=1          不分子进程
 *
 * 借 tools/sim.js 的策略打怪升级（guided / lazy / idle），但把它的“逻辑捷径”全部堵上——主线相关的每一步都只能走玩家在界面上走得到的路：
 *   · 入宗只有两条路：三宗争徒的弹窗（L.tick 的 out.invite，要筑基、要【宗门】解锁卡、要人在洞府）和剧情“三张帖子”（s2_invite）里的选项。
 *     用例决定这两条路各自接不接（first 谁先来接谁 / story 只接剧情 / popup 只接弹窗 / never 全不理 / late:N 先拒 N 次再接）。
 *   · 剧情选项只能选界面上点得到的（L.choiceShown：条件不满足的灰选项不能选）；关键抉择按用例指定的选项走。
 *   · 剧情事件只在人回到洞府时才弹（在外时队列先收着）——和界面的 processQueue 一样。
 *   · 解锁卡之间的真实时间间隔（界面登记的 L.onbHold：两张系统卡之间 ≥ 6 分钟）按 ×1 / ×4 速度折成月数算进去——sim 默认没有这一条，所以它的入宗比真人早得多。
 *   · 飞升后的“天门”那场戏（s9_gate）照界面的接法补上（sim 一飞升就停）。
 * 每个月跑一遍死锁探测器（tools/story_probe.js）：
 *   F1 任何一项主线依赖是 none（没有可行动作、也没有兜底）→ 失败；
 *   F2 wait / beat 类的兜底超过期限还没生效 → 失败；
 *   F3 照引导玩的局：每章超过 chLimit 个月 → 失败；到不了用例要求的章 / 没飞升 → 失败；
 *   F4 目标卡 / 路径页【去】指向帮不上忙的地方、L.goalNow 抛错 → 失败；
 *   W  卡的是境界而目标卡没提、探测器依赖表与主线条件不一致 → 警告（单列，不算失败）。 */
'use strict';
const path = require('path');
const fs = require('fs');
const cp = require('child_process');
const arg = process.argv.slice(2);
const opt = k => { const a = arg.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : ''; };
const QUICK = arg.includes('quick'), V = arg.includes('v'), LIST = arg.includes('list');
const ONLY = opt('only') ? new RegExp(opt('only')) : null;
const SHARD = opt('shard');   // 'i/n'：子进程用
const JOBS = +(opt('jobs') || 4);
const FIX = path.join(__dirname, 'story_fixtures');

// ---------- 用例表 ----------
// { id, cat, d 说明, strat, seed, origin, trials, life（第几世，1 起）, sect: { want, mode }, lose（约战故意输）, picks: { 事件 id: 选项序号 | { flag } | { daolv } | 'decline' },
//   speed（1 / 4：解锁卡真实时间间隔按这个速度折算；0 = 不算）, cap（境界封顶：到这个大境界就不再突破）, save（每几个月存读一次）, fixture（旧存档文件）, maxT, reach（至少走到第几章，0 起；9 = 飞升并过天门）,
//   chLimit, expect(st, res) → 额外断言, soft（不要求飞升：只查不死锁） }
const CASES = [];
const add = c => { CASES.push(Object.assign({ strat: 'guided', seed: 1, origin: 'qitu', trials: [], life: 1, sect: { mode: 'first' }, speed: 1, reach: 9, chLimit: 330 }, c)); };
const SECT3 = ['jian', 'dan', 'dao'];
const ON = { qitu: '弃徒', dantong: '丹童', moyi: '魔门遗孤', shoumu: '守墓人之后', sanxiu: '散修丹师', yushou: '御兽遗脉' };
// A 出身 × 入宗方式
Object.keys(ON).forEach((o, i) => {
  const life = o === 'qitu' ? 1 : 2;
  add({ id: `A-${o}-first`, cat: 'A 出身×入宗', d: `${ON[o]}：帖子谁先来接谁（${SECT3[i % 3]}）`, origin: o, life, seed: 11 + i, sect: { mode: 'first', want: SECT3[i % 3] } });
  add({ id: `A-${o}-story`, cat: 'A 出身×入宗', d: `${ON[o]}：弹窗一律【再想想】，只在剧情“三张帖子”里接（${SECT3[(i + 1) % 3]}）`, origin: o, life, seed: 21 + i, sect: { mode: 'story', want: SECT3[(i + 1) % 3] } });
  add({ id: `A-${o}-popup`, cat: 'A 出身×入宗', d: `${ON[o]}：剧情里说“哪家也不去”，之后弹窗再来时入宗（${SECT3[(i + 2) % 3]}）`, origin: o, life, seed: 31 + i, sect: { mode: 'popup', want: SECT3[(i + 2) % 3] } });
  add({ id: `A-${o}-never`, cat: 'A 出身×入宗', d: `${ON[o]}：全不理（剧情选“哪家也不去”，弹窗永远【再想想】）→ 散修之路`, origin: o, life, seed: 41 + i, sect: { mode: 'never' }, expect: (st, r) => (st.sect ? '不该入宗' : '') });
  add({ id: `A-${o}-late`, cat: 'A 出身×入宗', d: `${ON[o]}：先拒 3 次，再想入宗`, origin: o, life, seed: 51 + i, sect: { mode: 'late:3', want: SECT3[i % 3] }, expect: (st, r) => (st.sect ? '' : '拒了以后再也入不了宗') });
});
add({ id: 'A-moyi-xuesha', cat: 'A 出身×入宗', d: '魔门遗孤：拾起血帖，入血煞魔宗', origin: 'moyi', life: 2, seed: 61, sect: { mode: 'story', want: 'xuesha' }, expect: st => (st.sect && st.sect.id === 'xuesha' ? '' : '没入成血煞魔宗') });
add({ id: 'A-qitu-ignore', cat: 'A 出身×入宗', d: '弃徒：三张帖子全不理、也不说“哪家也不去”（弹窗一律【再想想】，剧情里也只能选不入）——只查不死锁', seed: 62, sect: { mode: 'never' }, soft: true });
add({ id: 'A-qitu-latejoin6', cat: 'A 出身×入宗', d: '弃徒：散修之路走到第六章，再回头入宗（外门弟子遇上天剑来犯）', seed: 63, sect: { mode: 'lateCh:5', want: 'jian' }, soft: true });
// B 天道试炼
for (const [i, t] of ['half', 'sleep', 'foes', 'poor', 'limit', 'wuxing', 'gu', 'wuzong'].entries())
  add({ id: `B-${t}`, cat: 'B 天道试炼', d: `试炼·${t}`, life: 2, trials: [t], seed: 71 + i, reach: t === 'limit' || t === 'half' ? 3 : 9, soft: t === 'limit' || t === 'half' });
add({ id: 'B-wuzong-limit', cat: 'B 天道试炼', d: '无宗 + 限时', life: 2, trials: ['wuzong', 'limit'], seed: 81, reach: 3, soft: true });
add({ id: 'B-wuzong-sanxiu', cat: 'B 天道试炼', d: '无宗 + 散修丹师', life: 2, origin: 'sanxiu', trials: ['wuzong'], seed: 82 });
add({ id: 'B-all8', cat: 'B 天道试炼', d: '八条全开（只查不死锁）', life: 2, trials: ['half', 'sleep', 'foes', 'poor', 'limit', 'wuxing', 'gu', 'wuzong'], seed: 83, reach: 1, soft: true });
add({ id: 'B-moyi-xuesha-foes', cat: 'B 天道试炼', d: '血煞魔宗 + 仇家遍地', life: 2, origin: 'moyi', trials: ['foes'], seed: 84, sect: { mode: 'first', want: 'xuesha' } });
// C 约战
add({ id: 'C-pact-win', cat: 'C 约战', d: '约战赢', seed: 91 });
add({ id: 'C-pact-lose', cat: 'C 约战', d: '约战输：论道上补', seed: 92, lose: true, expect: st => (st.pact === -1 ? '' : '没输掉约战（局面没造出来）') });
add({ id: 'C-pact-lose-lazy', cat: 'C 约战', d: '约战输 + 随手玩（不要求飞升）', seed: 93, lose: true, strat: 'lazy', soft: true, reach: 2, maxT: 900 });
add({ id: 'C-pact-lose-never', cat: 'C 约战', d: '约战输 + 不入宗', seed: 94, lose: true, sect: { mode: 'never' } });
for (const o of ['dantong', 'sanxiu']) add({ id: `C-pact-lose-${o}`, cat: 'C 约战', d: `${ON[o]}：约战输`, origin: o, life: 2, seed: 95, lose: true });
// D 抉择
const KEY = { s1_pact_after: ['当众念休书', '把休书收回袖中', '问一句（要拆过信）'], tiankuo_3: ['给他指条路', '留下他', '劝他认错'], story_r6: ['一剑了断', '先让天下人知道', '都过去了'],
  s7_war: ['向红旗走（正）', '向蓝旗拔剑（魔，被除名）', '止战（有条件）'], tianheng_2: ['一剑了断', '废他修为', '昭告天下（有条件）', '放他走'], story_r8: ['师父别走', '磕三个头', '把玄霄递过去（有条件）'], s9_gate: ['踏进去', '转身（有条件）', '拔出玄霄（有条件）'] };
let dseed = 100;
for (const id in KEY) KEY[id].forEach((n, i) => add({ id: `D-${id}-${i}`, cat: 'D 八个抉择', d: `${id}：${n}`, seed: ++dseed, picks: { [id]: i }, pickWant: [id, i] }));
add({ id: 'D-s2_invite-all', cat: 'D 八个抉择', d: 's2_invite 的五个选项：见 A 组（三正宗 / 血帖 / 哪家也不去）', seed: 130, sect: { mode: 'story', want: 'dao' } });
add({ id: 'D-daolv-su', cat: 'D 八个抉择', d: '道侣选苏', seed: 131, picks: { su_5: 0, ye_5: 1 }, soft: false });
add({ id: 'D-daolv-ye', cat: 'D 八个抉择', d: '道侣选夜', seed: 132, picks: { su_5: 1, ye_5: 0 } });
add({ id: 'D-daolv-none', cat: 'D 八个抉择', d: '道侣谁也不选', seed: 133, picks: { su_5: 1, ye_5: 1 }, expect: st => (st.daolv ? '不该有道侣' : '') });
add({ id: 'D-stay-again-go', cat: 'D 八个抉择', d: '天门前转身 →【再登天门】踏进去', seed: 134, picks: { s9_gate: 1, s9_gate_again: 0 }, again: true });
add({ id: 'D-stay-again-wait', cat: 'D 八个抉择', d: '天门前转身 →【再登天门】再等等（可反复）', seed: 135, picks: { s9_gate: 1, s9_gate_again: 2 }, again: true });
add({ id: 'D-war-mo-zheng', cat: 'D 八个抉择', d: '正道宗门里向蓝旗拔剑：被除名之后第八、九章照走', seed: 136, sect: { mode: 'first', want: 'jian' }, picks: { s7_war: 1 }, expect: st => (st.eflags.war_mo && st.sect && st.sect.id !== 'xuesha' && !st.eflags.sect_expelled ? '选了魔道却没被除名' : '') });
add({ id: 'D-all-first', cat: 'D 八个抉择', d: '所有抉择都选第一个点得到的', seed: 137, pickAll: 'first' });
add({ id: 'D-all-last', cat: 'D 八个抉择', d: '所有抉择都选最后一个点得到的', seed: 138, pickAll: 'last' });
// E 点名的人物打不过 / 迟迟见不到；境界与章节
for (let s = 0; s < 3; s++) add({ id: `E-lazy-${s}`, cat: 'E 强弱与节奏', d: '随手玩（打不过点名的人）：只查不死锁、目标卡一直指得动', strat: 'lazy', seed: 141 + s, soft: true, reach: 2, maxT: 1500 });
for (let s = 0; s < 2; s++) add({ id: `E-idle-${s}`, cat: 'E 强弱与节奏', d: '只打坐冲境界（境界远超章节）：只查不死锁', strat: 'idle', seed: 151 + s, soft: true, reach: 0, maxT: 700 });
for (let c = 0; c <= 4; c++) add({ id: `E-cap-${c}`, cat: 'E 强弱与节奏', d: `境界封顶在${['炼气', '筑基', '金丹', '元婴', '化神'][c]}（只做主线不修炼）：看能推到第几章、卡住时有没有说清楚`, seed: 161 + c, cap: c, soft: true, reach: 0, maxT: 600 });
add({ id: 'E-foes-lazy', cat: 'E 强弱与节奏', d: '仇家遍地 + 随手玩（点名的人更难打）', strat: 'lazy', life: 2, trials: ['foes'], seed: 171, soft: true, reach: 1, maxT: 1200 });
// F 挂机速度（解锁卡真实时间间隔）
add({ id: 'F-x4-guided', cat: 'F 挂机与速度', d: '全程 ×4 速：解锁卡 6 分钟的真实间隔折成月数', seed: 181, speed: 4 });
add({ id: 'F-x4-lazy', cat: 'F 挂机与速度', d: '全程 ×4 速 + 随手玩', strat: 'lazy', seed: 182, speed: 4, soft: true, reach: 2, maxT: 1200 });
add({ id: 'F-x4-popup', cat: 'F 挂机与速度', d: '全程 ×4 速 + 只接弹窗（要等【宗门】解锁卡）', seed: 183, speed: 4, sect: { mode: 'popup', want: 'dan' } });
add({ id: 'F-x4-idle', cat: 'F 挂机与速度', d: '全程 ×4 速挂机不动（只打坐）', strat: 'idle', seed: 184, speed: 4, soft: true, reach: 0, maxT: 700 });
add({ id: 'F-x1-guided', cat: 'F 挂机与速度', d: '全程 ×1 速（对照）', seed: 185, speed: 1 });
add({ id: 'F-nospeed', cat: 'F 挂机与速度', d: '不算真实时间间隔（= sim 的口径，对照）', seed: 186, speed: 0 });
// G 存读档
add({ id: 'G-save-every', cat: 'G 存读档', d: '每个月存读一次（JSON 往返 + L.migrate）', seed: 191, save: 1 });
add({ id: 'G-save-7', cat: 'G 存读档', d: '每 7 个月存读一次', seed: 192, save: 7 });
add({ id: 'G-save-never', cat: 'G 存读档', d: '每 5 个月存读 + 不入宗', seed: 193, save: 5, sect: { mode: 'never' } });
// H 旧存档（tools/story_fixtures/*.json：由 2.3.1 / 2.3.2 的逻辑生成，见 tools/story_fixtures/README.md）
for (const f of fs.existsSync(FIX) ? fs.readdirSync(FIX).filter(x => /\.json$/.test(x)).sort() : []) {
  const m = /^(v\d+)_(.+)\.json$/.exec(f); if (!m) continue;
  const stuck = /stuck|never|refuse/.test(m[2]);
  add({ id: `H-${m[1]}-${m[2]}`, cat: 'H 旧存档', d: `旧档 ${f}：读进来接着玩`, fixture: f, seed: 200 + CASES.length, sect: { mode: /lone|wuzong/.test(m[2]) ? 'never' : 'first', want: 'jian' }, soft: /idle|lazy/.test(m[2]), reach: /idle|lazy/.test(m[2]) ? 0 : 9, strat: /lazy/.test(m[2]) ? 'lazy' : 'guided', stuck });
}
// I 转世与坐化
add({ id: 'I-life2', cat: 'I 转世坐化', d: '第一世飞升 → 第二世（默认出身）', seed: 211, lives: 2 });
add({ id: 'I-life3', cat: 'I 转世坐化', d: '连玩三世（第二世散修丹师不入宗、第三世魔门遗孤入魔宗）', seed: 212, lives: 3, nextLife: [{ origin: 'sanxiu', sect: { mode: 'never' } }, { origin: 'moyi', sect: { mode: 'story', want: 'xuesha' } }] });
add({ id: 'I-rest-rebirth', cat: 'I 转世坐化', d: '第一世只打坐到坐化 → 第二世照引导玩', strat: 'idle', seed: 213, lives: 2, soft: true, reach: 0, nextLife: [{ strat: 'guided', reach: 9, soft: false }] });
add({ id: 'I-life2-trial', cat: 'I 转世坐化', d: '第二世带试炼（无宗 + 孤星）', seed: 214, lives: 2, nextLife: [{ trials: ['wuzong', 'gu'] }] });

if (QUICK) { /* 每个用例本来就只跑一个种子；quick 只是少跑几组对照 */ }
const pick = CASES.filter(c => !ONLY || ONLY.test(c.id));
if (LIST) { const by = {}; for (const c of pick) (by[c.cat] = by[c.cat] || []).push(c); for (const k in by) { console.log(`${k}（${by[k].length}）`); for (const c of by[k]) console.log(`  ${c.id.padEnd(26)} ${c.d}`); } console.log(`共 ${pick.length} 条`); process.exit(0); }

// ---------- 主进程：分片 ----------
if (!SHARD && JOBS > 1 && pick.length > 3) {
  const t0 = Date.now(), tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'story_accept_'));
  let left = JOBS; const all = [];
  for (let i = 0; i < JOBS; i++) {
    const out = path.join(tmp, i + '.json');
    const ch = cp.spawn(process.execPath, [__filename, ...arg.filter(a => !/^(jobs|json|shard)=/.test(a)), `shard=${i}/${JOBS}`, `json=${out}`], { stdio: ['ignore', 'pipe', 'inherit'] });
    ch.stdout.on('data', d => process.stdout.write(d));
    ch.on('exit', () => { try { all.push(...JSON.parse(fs.readFileSync(out, 'utf8'))); } catch (e) { console.error('分片 ' + i + ' 没有结果：' + e.message); process.exitCode = 2; } if (--left === 0) finish(all, t0); });
  }
} else {
  const t0 = Date.now();
  const [si, sn] = SHARD ? SHARD.split('/').map(Number) : [0, 1];
  const mine = pick.filter((c, i) => i % sn === si);
  const res = mine.map(c => { const r = runCase(c); if (!SHARD || V) printOne(r); else console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.id.padEnd(26)} ${r.line}`); return r; });
  if (SHARD) fs.writeFileSync(opt('json'), JSON.stringify(res)); else finish(res, t0);
}
function printOne(r) { console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.id.padEnd(26)} ${r.line}`); for (const f of r.fails) console.log('       ✗ ' + f); if (V) for (const w of r.warns) console.log('       · ' + w); }
function finish(all, t0) {
  all.sort((a, b) => CASES.findIndex(c => c.id === a.id) - CASES.findIndex(c => c.id === b.id));
  const by = {};
  for (const r of all) { const b = by[r.cat] || (by[r.cat] = { n: 0, fail: 0 }); b.n++; if (r.fails.length) b.fail++; }
  console.log('\n================ 主线可走通性验收（逻辑层） ================');
  for (const k in by) console.log(`${k.padEnd(14)} ${by[k].n - by[k].fail}/${by[k].n} 通过`);
  const bad = all.filter(r => r.fails.length);
  if (bad.length) { console.log('\n失败的用例：'); for (const r of bad) { console.log(`✗ ${r.id}  ${r.d}\n    ${r.line}`); for (const f of r.fails) console.log('    - ' + f); } }
  const warn = {}; for (const r of all) for (const w of r.warns) { const k = w.replace(/\d+/g, 'N'); (warn[k] = warn[k] || { w, ids: [] }).ids.push(r.id); }
  const wk = Object.keys(warn);
  if (wk.length) { console.log(`\n警告（不算失败，${wk.length} 种）：`); for (const k of wk.sort((a, b) => warn[b].ids.length - warn[a].ids.length).slice(0, 40)) console.log(`· [${warn[k].ids.length} 局] ${warn[k].w}`); }
  console.log(`\n共 ${all.length} 条用例，${all.length - bad.length} 通过，${bad.length} 失败；${Math.round((Date.now() - t0) / 1000)} 秒`);
  if (opt('json') && !SHARD) fs.writeFileSync(opt('json'), JSON.stringify(all, null, 1));
  process.exitCode = bad.length ? 1 : process.exitCode || 0;
}

// ---------- 跑一条用例 ----------
function runCase(c) {
  const { run, L } = require(path.join(__dirname, 'sim.js'));
  const P = require(path.join(__dirname, 'story_probe.js'))(L);
  install(L);
  const fails = [], warns = [], lines = [];
  const fail = m => { if (!fails.includes(m) && fails.length < 12) fails.push(m); };
  const wkey = {}; const warn = m => { const k = m.replace(/\d+/g, 'N'); if (!wkey[k] && warns.length < 40) { wkey[k] = 1; warns.push(m); } };
  let st0 = null, life = c.life, cfg = c, lastSt = null;
  const lives = c.lives || 1;
  for (let n = 0; n < lives; n++) {
    if (n > 0) cfg = Object.assign({}, c, { origin: 'qitu', trials: [], sect: { mode: 'first' }, picks: {}, lose: false, cap: undefined, fixture: null }, (c.nextLife || [])[n - 1] || {});
    const r = oneLife(L, P, run, cfg, n, st0, life + n, fail, warn);
    lines.push(r.line); lastSt = r.st;
    if (n + 1 < lives) {
      // 轮回：结算 → 轮回殿 → 传承 → 出身 → 投胎（和 sim 的 life2、界面的 doRebirth 同一组函数）
      try {
        const st = r.st; L.settle(st, st.p.r >= 9 ? 'ascend' : 'rest'); L.hallAuto(st); L.legacyAuto(st);
        const nx = (c.nextLife || [])[n] || {};
        if (nx.origin && nx.origin !== 'qitu') { st.meta.perk = st.meta.perk || {}; st.meta.perk['o_' + nx.origin] = 1; }   // 出身要先在轮回殿点亮：这里直接算点亮了（测的是主线，不是道果够不够）
        const card = L.rebirthCards(st, L.rebirthCardN(st)).sort((x, y) => y.t - x.t)[0];
        st0 = L.rebirthState(st, { t: card.t, tr: card.tr, origin: nx.origin || 'qitu', trials: nx.trials || [] });
        if (nx.origin && st0.origin !== nx.origin) fail(`第 ${n + 2} 世的出身没选上 ${nx.origin}`);
      } catch (e) { fail('轮回流程抛错：' + e.message); break; }
    }
  }
  return { id: c.id, cat: c.cat, d: c.d, fails, warns, line: lines.join(' ⇒ ') };
}

var CTX = null;   // 当前这一局的口径（堵捷径的几层包装读它）
var installed = false;
var R_last = '';
function install(L) {
  if (installed) return; installed = true;
  // ① 入宗：弹窗这条路由用例决定接不接；剧情里的 join 照常
  let depth = 0;
  const js0 = L.joinSect;
  L.joinSect = function (st, id) {
    const X = CTX; if (!X || st !== X.st) return js0.apply(this, arguments);
    if (depth > 0) { const ok = js0.apply(this, arguments); if (ok) X.joins.push('剧情@' + st.tick); return ok; }
    // 弹窗：只有这个月真的弹了（out.invite）才算数——sim 只在 out.invite 时调到这里
    X.offers++;
    const m = X.sect.mode, late = /^late:(\d+)$/.exec(m), lateCh = /^lateCh:(\d+)$/.exec(m);
    let take = m === 'first' || m === 'popup';
    if (late) take = X.refused >= +late[1];
    if (lateCh) take = L.chapterNow(st) >= +lateCh[1];
    if (!take) { X.refused++; return false; }
    const want = X.sect.want && L.sectJoinable(st, X.sect.want) ? X.sect.want : id;
    const ok = js0.call(this, st, want); if (ok) X.joins.push('弹窗@' + st.tick); return ok;
  };
  // ② 剧情选项：只能选点得到的；关键抉择照用例
  const rc0 = L.resolveChoice;
  const canPick = (st, ev, i) => { const ch = ev.choices[i]; return !!ch && L.choiceShown(st, ch) && L.costOk(st, ch.cost); };
  L.resolveChoice = function (st, ev, idx) {
    const X = CTX;
    if (!X || st !== X.st || depth > 0 || !ev) { depth++; try { return rc0.apply(this, arguments); } finally { depth--; } }
    const shown = ev.choices.map((ch, i) => i).filter(i => canPick(st, ev, i));
    let i = idx, want;
    if (ev.id === 's2_invite') {
      const m = X.sect.mode, lateCh = /^lateCh:/.test(m);
      const san = ev.choices.findIndex(ch => ch.ok && ch.ok.fx && [].concat(ch.ok.fx.flag || []).includes('path_san'));
      if (m === 'first' || m === 'story') { want = ev.choices.findIndex(ch => ch.ok && ch.ok.fx && ch.ok.fx.join === (X.sect.want || 'jian')); if (!canPick(st, ev, want)) { X.gated.push(`s2_invite 想接 ${X.sect.want} 的帖，点不到`); want = ev.choices.findIndex((ch, k) => ch.ok && ch.ok.fx && ch.ok.fx.join && canPick(st, ev, k)); } }
      else want = san;
      X.s2 = st.tick; void lateCh;
    } else if (X.picks && X.picks[ev.id] !== undefined) want = X.picks[ev.id];
    else if (X.pickAll && ev.choices.some(ch => ch.key)) want = X.pickAll === 'first' ? shown[0] : shown[shown.length - 1];
    if (want !== undefined) {
      if (canPick(st, ev, want)) i = want;
      else { X.gated.push(`${ev.id} 的选项 ${want}「${ev.choices[want] ? ev.choices[want].t : '?'}」点不到（${ev.choices[want] && ev.choices[want].gate ? L.storyGate(st, ev.choices[want].gate).why : '条件不满足'}）`); i = shown.includes(idx) ? idx : shown[0]; }
    } else if (!shown.includes(i)) { X.remap++; i = shown[0]; }
    if (i === undefined) { X.noChoice.push(ev.id); return null; }
    X.seen[ev.id] = { t: st.tick, i, ch: L.chapterNow(st) };
    depth++; try { return rc0.call(this, st, ev, i); } finally { depth--; }
  };
  // ③ 剧情事件只在洞府弹：在外时把队列收起来
  const stk0 = L.storyTick;
  L.storyTick = function (st) {
    const X = CTX;
    if (X && st === X.st && !L.busy(st) && X.stash.length) { for (const id of X.stash) if (!st.evDone[id] && !st.storyQ.includes(id)) st.storyQ.push(id); X.stash = []; }
    return stk0.apply(this, arguments);
  };
  const tk0 = L.tick;
  L.tick = function (st, cont) {
    const X = CTX;
    const out = tk0.apply(this, arguments);
    if (X && st === X.st) {
      if (out.invite) X.invites++;
      if (L.busy(st) && st.storyQ.length) { X.stash.push(...st.storyQ); st.storyQ.length = 0; X.stashed++; }
      else if (!L.busy(st) && X.stash.length) { for (const id of X.stash) if (!st.evDone[id] && !st.storyQ.includes(id)) st.storyQ.push(id); X.stash = []; }
      if (X.speed) X.vsec += L.monthSec(st) / X.speed;
    }
    return out;
  };
  // ④ 解锁卡的真实时间间隔（src/ui/clock.js 的 L.onbHold / clockHook 的翻版；秒数按速度从月数折）
  L.onbHold = (s, e) => { const X = CTX; if (!X || s !== X.st || !X.speed || !e || !e.sys) return false; return X.vsec - X.lastCard < (!s.pact && L.TIME.unlockGapSec1 ? L.TIME.unlockGapSec1 : L.TIME.unlockGapSec); };
  const os0 = L.onbStep;
  L.onbStep = function (st) {
    const X = CTX; if (!X || st !== X.st || !st.onb) return os0.apply(this, arguments);
    const before = Object.assign({}, st.onb.at);
    const k = os0.apply(this, arguments);
    if (!st.rebirth) for (const e of L.ONB) if (before[e.k] === undefined && st.onb.at[e.k] !== undefined) { if (e.sys && e.k !== 'exp' && e.k !== 'bt') X.lastCard = X.vsec; if (e.k === 'sect') X.sectCard = st.tick; }
    return k;
  };
  // ⑤ 境界封顶（只做主线不修炼）：到顶以后“修为圆满”也不去突破
  const ir0 = L.isReady;
  L.isReady = function (st) { const X = CTX; if (X && st === X.st && X.cap !== undefined && st.p.r >= X.cap && st.p.s >= 3) return false;
    if (X && st === X.st && X.holdAsc && st.p.r === 8 && st.p.s >= 3 && L.chapterNow(st) < 8) { X.held = (X.held || 0) + 1; return false; }   // 想把主线走完的玩家：第九章之前不点飞升
    return ir0.apply(this, arguments); };
}

function oneLife(L, P, run, c, n, st0, lifeNo, fail, warn) {
  const mainDone = (st, i) => !!(st.quest && st.quest.done && st.quest.done['c' + i + '_m']);
  const rngFor = seed => { let s = (seed * 2654435761 + 97) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  L.rng = rngFor(c.seed * 31 + n);
  let st;
  if (c.fixture && n === 0) {
    const raw = JSON.parse(fs.readFileSync(path.join(FIX, c.fixture), 'utf8'));
    st = L.migrate(raw);
    if (!st) { fail('旧档读不进来（L.migrate 返回空）'); return { line: '读档失败', st: null }; }
  } else if (st0) st = st0;
  else if (lifeNo > 1) { const meta = L.newMeta(); st = L.newState({ name: '测试', rebirth: lifeNo - 1, origin: c.origin, trials: c.trials, meta }); }
  else st = L.newState({ name: '测试' });
  if (c.origin !== 'qitu' && st.origin !== c.origin && !c.fixture) fail(`出身没造出来（要 ${c.origin}，得 ${st.origin}）`);
  const X = CTX = { st, sect: c.sect || { mode: 'first' }, picks: c.picks || {}, pickAll: c.pickAll, speed: c.speed, cap: c.cap, vsec: 0, lastCard: -1e9, stash: [], stashed: 0, offers: 0, refused: 0, invites: 0, remap: 0, gated: [], noChoice: [], seen: {}, joins: st.sect ? ['原有'] : [], holdAsc: !c.soft && c.strat === 'guided' && c.holdAsc !== false };
  const chAt = []; let lastCh = L.chapterNow(st); chAt[lastCh] = st.tick;
  const since = {};   // 依赖 → { how, t }
  const t00 = st.tick;
  const pp = L.PACT_POWER; if (c.lose && !st.pact) L.PACT_POWER = 1e12;
  let deadSeen = {}, ticks = 0, maxWait = { k: '', n: 0 };
  const realmStuck = {};
  const onTick = (s, out) => {
    ticks++;
    if (c.lose && s.pact) L.PACT_POWER = pp;
    // 存读档：JSON 往返 + 迁移，原地换回去（sim 手里拿的是同一个对象）
    if (c.save && s.tick % c.save === 0) {
      let m = null; try { m = L.migrate(JSON.parse(JSON.stringify(s))); } catch (e) { fail(`第 ${s.tick} 月存读档抛错：${e.message}`); }
      if (m) { const ch0 = L.chapterNow(s), d0 = Object.keys(s.quest.done).length; for (const k of Object.keys(s)) delete s[k]; Object.assign(s, m); if (L.chapterNow(s) !== ch0) fail(`第 ${s.tick} 月存读档后章变了：${ch0 + 1} → ${L.chapterNow(s) + 1}`); if (Object.keys(s.quest.done).length !== d0) fail(`第 ${s.tick} 月存读档后札记完成数变了`); }
      else if (m === null) fail(`第 ${s.tick} 月存读档：L.migrate 返回空`);
    }
    const ch = L.chapterNow(s);
    if (ch < lastCh) fail(`第 ${s.tick} 月章倒退：${lastCh + 1} → ${ch + 1}`);
    if (ch > lastCh) { for (let i = lastCh + 1; i <= ch; i++) chAt[i] = s.tick; lastCh = ch; }
    let k = 0; while (k < 9 && mainDone(s, k)) k++;
    for (let i = k + 1; i < 9; i++) if (mainDone(s, i)) { fail(`第 ${s.tick} 月：第 ${i + 1} 章主线做完了，第 ${k + 1} 章却没做完（跳章）`); break; }
    if (s.p.r >= 9) return;
    // 死锁探测
    let pr; try { pr = P.probe(s); } catch (e) { fail('探测器抛错：' + e.message); return; }
    if (pr.mismatch) warn(`第 ${ch + 1} 章：${pr.mismatch}（${pr.deps.map(d => d.t + '=' + d.how).join('、')}）`);
    for (const d of pr.deps) {
      const key = ch + ':' + d.k, o = since[key];
      if (!o || o.how !== d.how) since[key] = { how: d.how, t: s.tick };
      const dur = s.tick - since[key].t;
      if (d.how === 'none') { const m = `第 ${ch + 1} 章死锁（第 ${s.tick} 月，境界 ${s.p.r}${s.sect ? '，' + s.sect.id + ' 身份 ' + s.sect.rank : '，无宗'}）：${d.t}——${d.note}`; if (!deadSeen[key]) { deadSeen[key] = 1; fail(m); } }
      else if ((d.how === 'wait' || d.how === 'beat') && dur > Math.max(P.MAXWAIT[d.how], d.how === 'wait' ? 0 : 0) && !(d.how === 'wait' && /第.章才/.test(d.note || ''))) {
        if (dur > maxWait.n) maxWait = { k: `${d.t}（${d.note || ''}）`, n: dur };
        if (!deadSeen['w' + key]) { deadSeen['w' + key] = 1; fail(`第 ${ch + 1} 章兜底超时：${d.t} 已经等了 ${dur} 月（${d.how}，${d.note || ''}）`); }
      }
      if (d.realm && d.how === 'grow') realmStuck[ch] = (realmStuck[ch] || 0) + 1;
    }
    // 目标卡
    if (s.tick % 3 === 0) {
      let g; try { g = P.goalCheck(s); } catch (e) { fail('目标卡检查抛错：' + e.message); return; }
      for (const b of g.bad) { if (/^死锁/.test(b)) continue; if (/^卡在境界|没说要先筑基/.test(b)) warn('目标卡：' + b.replace(/（现在[^）]*）/g, '').replace(/胜算 \d+%/, '胜算 N%')); else fail(`第 ${s.tick} 月目标卡：${b}`); }
    }
  };
  let rec, err = null;
  try { rec = run(c.strat, c.seed, false, { st0: st, keep: true, onTick, maxT: c.maxT || (c.strat === 'guided' ? 1300 : undefined), sect: c.sect && SECT3.includes(c.sect.want) ? c.sect.want : undefined }); } catch (e) { err = e; }
  L.PACT_POWER = pp;
  if (err) { fail('这一局抛错：' + err.message + ' @ ' + String(err.stack || '').split('\n')[1]); CTX = null; return { line: '抛错', st }; }
  // 飞升：照界面的接法过“天门”那场戏（talk.js：showAscension 先播 s9_gate，选完 L.checkQuests）
  let gate = '';
  if (st.p.r >= 9) {
    const ev = L.eventById('s9_gate');
    const chosen = L.STORY_ASC.some(f => st.eflags[f]);
    if (ev && !chosen && !st.evDone.s9_gate) {
      const i = st.storyQ.indexOf('s9_gate'); if (i >= 0) st.storyQ.splice(i, 1);
      L.storyState(st).beat.c9_climax = st.tick;
      const res = L.resolveChoice(st, ev, 0); L.checkQuests(st);
      if (!res) fail('天门那场戏没有一个点得到的选项');
    }
    gate = L.STORY_ASC.find(f => st.eflags[f]) || '';
    if (!gate) fail('飞升了，天门前的抉择没有落下标志位');
    if (c.again && st.eflags.asc_stay) {
      const ev2 = L.eventById('s9_gate_again');
      if (!ev2) fail('没有【再登天门】这场戏');
      else for (let k = 0; k < 3 && st.eflags.asc_stay; k++) { const r2 = L.resolveChoice(st, ev2, 0); L.checkQuests(st); if (!r2) { fail('【再登天门】没有点得到的选项'); break; } if (X.picks.s9_gate_again === 2) { if (!st.eflags.asc_stay) fail('选了“再等等”，asc_stay 却没了'); if (st.evDone.s9_gate_again) fail('选了“再等等”之后【再登天门】不能再点（evDone 没清）'); if (k === 1) { X.picks.s9_gate_again = 0; } } }
      if (st.eflags.asc_stay) fail('【再登天门】之后还留在人间（asc_stay 没清）'); else gate += '→' + (L.STORY_ASC.find(f => st.eflags[f] && f !== 'asc_stay') || '?');
    }
    // 前八章都做完的话，过了天门第九章也该完成
    let k = 0; while (k < 8 && mainDone(st, k)) k++;
    if (k === 8 && !mainDone(st, 8)) fail('前八章都做完、也过了天门，第九章主线却没完成');
    let end = null; try { end = L.endingOf(st); } catch (e) { fail('L.endingOf 抛错：' + e.message); }
    if (end && !end.id) fail('飞升了却没有结局');
    gate += end ? '/结局 ' + end.n : '';
    try { const ep = L.epilogue(st); if (!Array.isArray(ep)) fail('后日谈不是数组'); } catch (e) { fail('L.epilogue 抛错：' + e.message); }
  }
  const ch = L.chapterNow(st), fin = mainDone(st, 8);
  const reached = fin ? 9 : ch;
  // 到没到要求的章
  const need = c.soft ? c.reach : c.reach;
  if (reached < need) fail(`${st.tick - t00} 月（境界 ${st.p.r}${rec.death ? '，坐化' : ''}）只走到第 ${ch + 1} 章${fin ? '' : '（没做完）'}，要求${need >= 9 ? '九章全部做完' : '至少第 ' + (need + 1) + ' 章'}`);
  if (!c.soft && st.p.r < 9) fail(`没有飞升（境界 ${st.p.r}，${rec.death ? '第 ' + rec.death + ' 月坐化' : '跑满 ' + ticks + ' 月'}）`);
  if (!c.soft && c.chLimit) for (let i = 1; i < chAt.length; i++) if (chAt[i] !== undefined && chAt[i - 1] !== undefined && chAt[i] - chAt[i - 1] > c.chLimit) fail(`第 ${i} 章用了 ${chAt[i] - chAt[i - 1]} 月（上限 ${c.chLimit}）`);
  // 指定的抉择有没有走到、选上
  if (c.pickWant && n === 0) { const [id, i] = c.pickWant; const s = X.seen[id]; const gatedOk = X.gated.some(g => g.startsWith(id + ' ')); if (!s && id !== 's9_gate') fail(`抉择 ${id} 这一局没有出现`); else if (s && s.i !== i && !gatedOk) fail(`抉择 ${id} 想选 ${i}，实际选了 ${s.i}`); if (gatedOk) warn(`抉择 ${id} 的选项 ${i} 这一局条件不够、点不到（${X.gated.find(g => g.startsWith(id + ' '))}）——覆盖不足`); }
  if (reached < 9 && st.p.r < 9) { try { const pr = P.probe(st); R_last = pr.deps.map(P.fmtDep).join(' ‖ '); } catch (e) { R_last = ''; } } else R_last = '';
  if (X.noChoice.length) fail('有剧情弹出来却没有一个点得到的选项：' + X.noChoice.join(','));
  if (c.expect) { let m = ''; try { m = c.expect(st, rec); } catch (e) { m = 'expect 抛错 ' + e.message; } if (m) fail(m); }
  if (X.sect.mode === 'never' && st.sect) fail('用例要求不入宗，却入了宗（' + X.joins.join('、') + '）');
  if (c.stuck && ch <= lastChAtLoad(chAt)) { /* 旧档卡死的那类：下面的 reach 断言已经管了 */ }
  for (const r in realmStuck) if (realmStuck[r] > 60) warn(`第 ${+r + 1} 章有 ${realmStuck[r]} 个月卡在境界上（主线条件本身不写境界，但它依赖的晋升 / 宿敌上台 / 地图要境界）`);
  const line = `第 ${lifeNo} 世 ${c.strat}${st.origin !== 'qitu' ? '·' + st.origin : ''}${(st.trials || []).length ? '·试炼 ' + st.trials.join('+') : ''}：${st.tick - t00} 月，境界 ${st.p.r}${rec.death ? '（坐化）' : ''}，第 ${ch + 1} 章${fin ? '·完' : ''}，${st.sect ? st.sect.id + '/' + st.sect.rank + '（' + X.joins.join('、') + '）' : '无宗' + (P.isLone(st) ? '·散修路' : '')}，招揽弹窗 ${X.invites} 次${X.sectCard !== undefined ? '（宗门卡第 ' + X.sectCard + ' 月）' : ''}${X.s2 ? '，三张帖子第 ' + X.s2 + ' 月' : ''}，章 ${chAt.map((t, i) => (t === undefined ? '' : (i + 1) + ':' + t)).filter(Boolean).join(' ')}${gate ? '，' + gate : ''}${X.gated.length ? '，点不到 ' + X.gated.length : ''}${X.held ? '，压着不飞升 ' + X.held + ' 月' : ''}${X.joins.length > 1 ? '，入宗 ' + X.joins.length + ' 次' : ''}${R_last ? '；停在：' + R_last : ''}`;
  if (X.joins.length > 1) warn((st.eflags.sect_expelled ? '被除名以后' : '离开宗门以后') + (X.joins.slice(1).some(j => /剧情/.test(j)) ? '“三张帖子”那场戏（筑基那年三宗来抢人）才补放，又入了一次宗' : '三宗争徒的弹窗又来了，又入了一次宗'));
  if (c.dump) console.log(JSON.stringify(Object.entries(st.onb.at).sort((a, b) => a[1] - b[1])));
  CTX = null;
  return { line, st };
}
function lastChAtLoad(chAt) { for (let i = 0; i < chAt.length; i++) if (chAt[i] !== undefined) return i; return 0; }
