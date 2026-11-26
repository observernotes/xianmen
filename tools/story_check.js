#!/usr/bin/env node
/* 废柴仙途 · 故事推进 / 章节进度的防回归（只跑逻辑层，不开浏览器）
 *   node tools/story_check.js          全部局面各跑几局（约几分钟）
 *   node tools/story_check.js quick    每个局面只跑 1 局
 *   node tools/story_check.js v        另打印每局的章节月份
 *
 * 机器人借 tools/sim.js 的策略（guided 照引导玩、lazy 随手选、idle 只修炼冲境界），再加几种局面：
 *   六个出身（转世）、八条天道试炼（各单开）、三年之约故意输、魔门遗孤入血煞魔宗、只冲境界 400 月再回头补主线、旧存档（章被境界推过头）迁移。
 * 每局断言：
 *   A 章节单调、不跳：当前章 = 第一个没完成的主线；做完的主线永远是从第一章起连续的一段；章只在主线完成时变。
 *   B 章节不被境界推着走：境界远超章节时（只冲境界的机器人），章停在第一个没完成的主线章。
 *   C realm:N 主线剧情（story_r1～r8）各出一次、按 N 的顺序出，出的时候“当前章 ≥ N”（境界超前时等章）。
 *   D 老祖身世线（STORY.md §3 的“确定”几件）按揭示顺序：r1 < r2 < 渡劫阵图 < r3 < r4 < r5 < 心魔·同路人 < r6 < 隔空传音 < r7 < r8；万剑低眉在 r3 之后。
 *   E 不卡死：照引导玩的每一章主线都在合理月数内完成（单章 ≤ 420 月），每个出身都走到飞升或至少第六章。
 *   F 解锁卡跟着章走：第一世按表解锁（非“已经发生”的强制解锁）的那一刻，当前章 ≥ 这一项的 ch（原门槛满足后等满 L.ONB_CH_WAIT 月的除外）。 */
'use strict';
const path = require('path');
const { run, L } = require(path.join(__dirname, 'sim.js'));
const arg = process.argv.slice(2);
const QUICK = arg.includes('quick'), V = arg.includes('v');
const N = QUICK ? 1 : 3;

const fails = [];
const fail = (who, m) => { fails.push(`[${who}] ${m}`); };
const MAIN = ['story_r1', 'story_r2', 'story_r3', 'story_r4', 'story_r5', 'story_r6', 'story_r7', 'story_r8'];
const LORE = ['story_r1', 'story_r2', 'story_trib1', 'story_r3', 'story_r4', 'story_r5', 'story_demon3', 'story_r6', 'tianheng_1', 'story_r7', 'story_r8'];
const mainDone = (st, i) => !!(st.quest && st.quest.done && st.quest.done['c' + i + '_m']);
const rngFor = seed => { let s = (seed * 2654435761 + 7) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

// 记录剧情事件的结算顺序（含当时的章）
let cur = null;
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) { const r = rc0.apply(this, arguments); if (r && cur && st === cur.st && ev && ev.where === 'story') cur.story.push({ id: ev.id, t: st.tick, ch: L.chapterNow(st), r: st.p.r }); return r; }; }
// 解锁卡：按表解锁（不是强制）时看章
{ const os0 = L.onbStep; L.onbStep = function (st) {
  const before = st && st.onb ? Object.assign({}, st.onb.at) : null;
  const k = os0.apply(this, arguments);
  if (cur && st === cur.st && before && !(st.rebirth > 0)) for (const e of L.ONB) if (before[e.k] === undefined && st.onb.at[e.k] !== undefined) {
    let forced = false; try { forced = !!(e.force && e.force(st)); } catch (err) { forced = false; }
    const waited = st.onb.rdy && st.onb.rdy[e.k] !== undefined && st.tick - st.onb.rdy[e.k] >= L.ONB_CH_WAIT;   // 原门槛满足后等满 L.ONB_CH_WAIT 月的，按设计放行
    if (!forced && !waited && e.ch !== undefined && L.chapterNow(st) < e.ch) cur.onbBad.push(`${e.k}（第 ${e.ch + 1} 章的，开在第 ${L.chapterNow(st) + 1} 章）`);
  }
  return k;
}; }

function watch(who, st) {
  return { who, st, story: [], onbBad: [], ch: L.chapterNow(st), chAt: [0], maxGap: 0, lastCh: 0, realmAhead: 0 };
}
function onTick(w) {
  return (st, out) => {
    w.st = st;
    const ch = L.chapterNow(st);
    // A：做完的主线是连续的一段
    let k = 0; while (k < 9 && mainDone(st, k)) k++;
    for (let i = k + 1; i < 9; i++) if (mainDone(st, i)) { fail(w.who, `第 ${st.tick} 月：第 ${i + 1} 章主线做完了，第 ${k + 1} 章却没做完（跳章）`); break; }
    if (ch !== Math.min(8, k)) fail(w.who, `第 ${st.tick} 月：当前章 ${ch + 1} ≠ 第一个没完成的主线 ${k + 1}`);
    if (ch < w.ch) fail(w.who, `第 ${st.tick} 月：章倒退 ${w.ch + 1} → ${ch + 1}`);
    if (ch > w.ch) { for (let i = w.ch + 1; i <= ch; i++) w.chAt[i] = st.tick; }
    w.ch = ch;
    if (st.p.r > ch + 1) w.realmAhead = Math.max(w.realmAhead, st.p.r - ch);
    if (st.path && st.path.ch !== ch && st.path.ch > ch) fail(w.who, `第 ${st.tick} 月：st.path.ch ${st.path.ch} 超过当前章 ${ch}`);
  };
}
function judge(w, o) {
  o = o || {};
  const st = w.st, ids = w.story.map(x => x.id);
  // C：realm:N 主线剧情各一次、按序、章到了才出
  const seen = {};
  for (const x of w.story) if (MAIN.includes(x.id)) {
    if (seen[x.id]) fail(w.who, `${x.id} 出了两次`);
    seen[x.id] = 1;
    const n = MAIN.indexOf(x.id) + 1;
    if (x.ch < n) fail(w.who, `${x.id} 出在第 ${x.ch + 1} 章（要第 ${n + 1} 章起）`);
    if (x.r < n) fail(w.who, `${x.id} 出在境界 ${x.r}（要 ${n}）`);
  }
  const mi = ids.filter(id => MAIN.includes(id)).map(id => MAIN.indexOf(id));
  for (let i = 1; i < mi.length; i++) if (mi[i] < mi[i - 1]) { fail(w.who, `主线剧情错序：${ids.filter(id => MAIN.includes(id)).join(' → ')}`); break; }
  // 到了的章、境界都够的 realm:N 剧情应该都出过（最多差最后一个月还在队列里）
  const sr = Math.min(st.p.r, L.chapterNow(st));
  for (let n = 1; n <= Math.min(8, sr); n++) if (!st.evDone['story_r' + n] && !st.storyQ.includes('story_r' + n)) fail(w.who, `story_r${n} 没出（境界 ${st.p.r}、第 ${L.chapterNow(st) + 1} 章）`);
  // D：身世线揭示顺序
  const li = ids.filter(id => LORE.includes(id)).map(id => LORE.indexOf(id));
  for (let i = 1; i < li.length; i++) if (li[i] < li[i - 1]) { fail(w.who, `身世线错序：${w.story.filter(x => LORE.includes(x.id)).map(x => `${x.id}@${x.t}/章${x.ch + 1}`).join(' → ')}`); break; }
  const b5 = ids.indexOf('story_boss5'), r3 = ids.indexOf('story_r3');
  if (b5 >= 0 && (r3 < 0 || b5 < r3)) fail(w.who, '万剑低眉出在 story_r3 之前');
  // E：不卡死
  if (o.reach !== undefined) {
    const reached = L.chapterNow(st) >= o.reach || st.p.r >= 9;
    if (!reached) fail(w.who, `${st.tick} 月只走到第 ${L.chapterNow(st) + 1} 章（要第 ${o.reach + 1} 章或飞升）`);
  }
  if (o.gap) for (let i = 1; i < w.chAt.length; i++) if (w.chAt[i] !== undefined && w.chAt[i - 1] !== undefined && w.chAt[i] - w.chAt[i - 1] > o.gap) fail(w.who, `第 ${i} 章用了 ${w.chAt[i] - w.chAt[i - 1]} 月（> ${o.gap}）`);
  // F：解锁卡
  if (w.onbBad.length) fail(w.who, '解锁卡比章早：' + w.onbBad.slice(0, 3).join('、'));
  return w;
}
const fmtCh = w => w.chAt.map((t, i) => (t === undefined ? '' : `${i + 1}:${t}`)).filter(Boolean).join(' ');
const sum = { runs: 0, asc: 0, chMax: [] };
function play(who, strat, seed, opt) {
  opt = opt || {};
  L.rng = rngFor(seed);
  const st0 = opt.st0 || (opt.mk ? opt.mk() : L.newState({ name: '测试' }));
  const w = watch(who, st0); cur = w;
  const rec = run(strat, seed, false, Object.assign({ st0, keep: true, onTick: onTick(w), maxT: opt.maxT }, opt.run || {}));
  w.st = rec.st || w.st; w.rec = rec;
  if (!opt.noJudge) judge(w, opt);
  sum.runs++; if (w.st.p.r >= 9) sum.asc++; sum.chMax.push(L.chapterNow(w.st));
  if (V) console.log(`  ${who.padEnd(22)} 境界 ${w.st.p.r} · 第 ${L.chapterNow(w.st) + 1} 章 · ${w.st.tick} 月 · 章 ${fmtCh(w)}${w.realmAhead ? ' · 境界最多领先章 ' + w.realmAhead : ''}`);
  return w;
}
const reborn = (origin, trials, extra) => () => {
  const meta = L.newMeta ? L.newMeta() : undefined;
  const st = L.newState({ name: '测试', rebirth: 1, origin, trials: trials || [], meta });
  if (extra) extra(st);
  return st;
};

const t0 = Date.now();
console.log('故事推进检查' + (QUICK ? '（quick）' : ''));
// 1. 第一世：照引导玩 / 随手选 / 只修炼
for (let s = 1; s <= N; s++) play('引导·第一世#' + s, 'guided', s, { reach: 5, gap: 420 });
for (let s = 1; s <= N; s++) play('随手选#' + s, 'lazy', 100 + s, { maxT: 900 });
// 2. 只冲境界：章停在第一个没完成的主线章；之后回头照引导玩，剧情按序补上
for (let s = 1; s <= N; s++) {
  // 照引导修炼、历练、论道，但三宗争徒一律不理（主线第二章要入宗）：境界一路往上，章停在第二章
  const a = play('只修炼#' + s, 'guided', 200 + s, { maxT: 400, noJudge: true, mk: () => { const st = L.newState({ name: '测试' }); st.flags.inviteAt = 1e9; return st; } });
  const st = a.st, k = (() => { let i = 0; while (i < 9 && mainDone(st, i)) i++; return Math.min(8, i); })();
  if (L.chapterNow(st) !== k) fail(a.who, `境界 ${st.p.r} 时章是 ${L.chapterNow(st) + 1}，第一个没完成的主线是 ${k + 1}`);
  if (st.p.r <= L.chapterNow(st) + 1) fail(a.who, `只修炼 400 月境界 ${st.p.r} 没有超过章（${L.chapterNow(st) + 1}），这一局测不到“境界超前”`);
  for (let n = L.chapterNow(st) + 1; n <= 8; n++) if (st.evDone['story_r' + n]) fail(a.who, `章没到，story_r${n} 先出了`);
  judge(a);
  // 回头补主线（把只修炼那段的记录接着用）：宗门照常上门
  st.flags.inviteAt = st.tick + 1;
  const w = watch('只修炼→补主线#' + s, st); w.story = a.story.slice(); w.ch = L.chapterNow(st); w.chAt = a.chAt.slice(); cur = w;
  L.rng = rngFor(300 + s);
  const rec = run('guided', 300 + s, false, { st0: st, keep: true, onTick: onTick(w), maxT: 1100 });
  w.st = rec.st || st; judge(w, { reach: Math.min(8, L.chapterNow(st) + 3) });
  sum.runs++; if (w.st.p.r >= 9) sum.asc++; sum.chMax.push(L.chapterNow(w.st));
  if (V) console.log(`  ${w.who.padEnd(22)} 境界 ${w.st.p.r} · 第 ${L.chapterNow(w.st) + 1} 章 · ${w.st.tick} 月 · 章 ${fmtCh(w)}`);
}
// 3. 三年之约输了：论道上补
{
  const pp = L.PACT_POWER;
  for (let s = 1; s <= N; s++) {
    L.PACT_POWER = 1e12;
    const w = play('约战输#' + s, 'guided', 400 + s, { maxT: 60, noJudge: true });
    L.PACT_POWER = pp;
    if (w.st.pact !== -1) fail(w.who, '没输掉约战（测试局面没造出来）');
    if (L.chapterNow(w.st) !== 0 && !w.st.beaten.mu) fail(w.who, '没赢慕容就离开了第一章');
    const w2 = watch(w.who, w.st); w2.story = w.story; w2.ch = L.chapterNow(w.st); cur = w2;
    const rec = run('guided', 400 + s, false, { st0: w.st, keep: true, onTick: onTick(w2), maxT: 1240 });
    w2.st = rec.st || w.st; judge(w2, { reach: 5 });
    if (!mainDone(w2.st, 0)) fail(w.who, '输了约战以后一直没在论道上补回第一章');
    sum.runs++; if (w2.st.p.r >= 9) sum.asc++;
  }
  L.PACT_POWER = pp;
}
// 4. 六个出身（转世）
for (const o of L.ORIGIN_IDS) for (let s = 1; s <= N; s++) play('出身·' + L.ORIGINS[o].n + '#' + s, 'guided', 500 + s, { mk: reborn(o), reach: 5, gap: 420 });
// 5. 天道试炼（各单开）；限时 480 月，只要求不卡、走到第四章；无宗走散修之路
for (const t of L.TRIALS) for (let s = 1; s <= N; s++) {
  const w = play('试炼·' + t.n + '#' + s, 'guided', 600 + s, { mk: reborn('qitu', [t.id]), reach: t.id === 'limit' || t.id === 'half' ? 3 : 5, gap: 420 });
  if (t.id === 'wuzong') { if (w.st.sect) fail(w.who, '无宗试炼却入了宗'); if (!L.loneRoute(w.st)) fail(w.who, '无宗试炼没走散修之路'); }
}
// 6. 魔门遗孤入血煞魔宗
for (let s = 1; s <= N; s++) {
  const w = play('魔宗#' + s, 'guided', 700 + s, { mk: reborn('moyi'), run: { sect: 'xuesha' }, reach: 5, gap: 420 });
  if (!w.st.sect || w.st.sect.id !== 'xuesha') fail(w.who, '没入血煞魔宗（测试局面没造出来）');
  if (L.SECT_HEIR.xuesha.n === '血无涯') fail(w.who, '血煞魔宗的原圣子还是血无涯');
}
// 7. 散修丹师不入宗（同样走散修之路）
for (let s = 1; s <= N; s++) {
  const w = play('散修不入宗#' + s, 'guided', 800 + s, { mk: reborn('sanxiu', [], st => { st.flags.inviteAt = 1e9; }), reach: 5, gap: 420 });
  if (w.st.sect) fail(w.who, '测试局面没造出来（入了宗）');
}
// 8. 旧存档：以前境界把章推过了头（第二章没入宗就进了第三章）
for (let s = 1; s <= N; s++) {
  const a = play('旧档#' + s, 'guided', 900 + s, { maxT: 200, noJudge: true });
  const st = a.st;
  if (!mainDone(st, 1)) { if (V) console.log('  旧档#' + s + '：200 月没做完第二章，跳过'); continue; }
  for (let i = 1; i < 9; i++) delete st.quest.done['c' + i + '_m'];
  st.quest.done.c2_m = 1;                     // 造一个“第三章主线做完、第二章没做”的旧档
  st.path.ch = 3;
  const s2 = L.migrate(JSON.parse(JSON.stringify(st)));
  if (L.chapterNow(s2) !== 1) fail(a.who, `迁移后当前章 ${L.chapterNow(s2) + 1}（应退回第二章）`);
  if (s2.path.ch !== 1) fail(a.who, `迁移后 st.path.ch = ${s2.path.ch}（应为 1）`);
  const w = watch(a.who + '·续玩', s2); w.story = a.story.slice(); cur = w;
  const rec = run('guided', 950 + s, false, { st0: s2, keep: true, onTick: onTick(w), maxT: 1100 });
  w.st = rec.st || s2;
  if (!mainDone(w.st, 1)) fail(w.who, '迁移后一直没补上第二章');
  sum.runs++;
}

const sec = Math.round((Date.now() - t0) / 1000);
console.log(`共 ${sum.runs} 局，飞升 ${sum.asc} 局，${sec} 秒`);
if (fails.length) { console.log(`失败 ${fails.length} 条：`); for (const f of fails.slice(0, 60)) console.log('  ✗ ' + f); process.exit(1); }
console.log('故事推进检查通过');
