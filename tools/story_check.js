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
 *   C 主线剧情（story_r1～r8，挂在第 N+1 章的开章节拍上）各出一次、按 N 的顺序出，出的时候“当前章 ≥ N”；不看境界。
 *   D 老祖身世线（STORY.md §3 的“确定”几件）按揭示顺序：r1 < r2 < r3 < r4 < r5 < r6 < 隔空传音 < r7 < r8；万剑低眉在 r3 之后。
 *   E 不卡死：照引导玩的每一章主线都在合理月数内完成（单章 ≤ 420 月），每个出身都走到飞升或至少第六章。
 *   G 串联层：八个抉择场景齐全、节拍都挂得上、预设路线各落在预期的结局、有条件的选项、每个故事标志位至少两处回声（第 9 节）。
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
// 渡劫阵图、心魔·同路人跟着雷劫走（突破系统的戏），不在节拍上，不参加排序
const LORE = ['story_r1', 'story_r2', 'story_r3', 'story_r4', 'story_r5', 'story_r6', 'tianheng_1', 'story_r7', 'story_r8'];
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
  }
  const mi = ids.filter(id => MAIN.includes(id)).map(id => MAIN.indexOf(id));
  for (let i = 1; i < mi.length; i++) if (mi[i] < mi[i - 1]) { fail(w.who, `主线剧情错序：${ids.filter(id => MAIN.includes(id)).join(' → ')}`); break; }
  // 到了的章、境界都够的 realm:N 剧情应该都出过（最多差最后一个月还在队列里）
  // 主线剧情挂在各章的开章节拍上（storyline.js），不看境界：已经走完的章，它的开章剧情一定出过
  const sr = L.chapterNow(st) - 1;
  for (let n = 1; n <= Math.min(8, sr); n++) if (!st.evDone['story_r' + n] && !st.storyQ.includes('story_r' + n)) fail(w.who, `story_r${n} 没出（第 ${L.chapterNow(st) + 1} 章）`);
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
  // 照引导修炼、历练、论道，但约战输了、慕容又永远打不过（她的战力 ×1e12），主线不降级（L.MAIN_EASE_ON = false）：境界一路往上，章停在第一章
  const pp = L.PACT_POWER, dw0 = L.duelWin; L.PACT_POWER = 1e12; L.MAIN_EASE_ON = false;
  L.duelWin = function (st, S, Q, foe) { return foe && foe.id === 'mu' ? false : dw0.apply(this, arguments); };
  const a = play('只修炼#' + s, 'guided', 200 + s, { maxT: 400, noJudge: true });
  L.PACT_POWER = pp; L.MAIN_EASE_ON = true; L.duelWin = dw0;
  const st = a.st, k = (() => { let i = 0; while (i < 9 && mainDone(st, i)) i++; return Math.min(8, i); })();
  if (L.chapterNow(st) !== k) fail(a.who, `境界 ${st.p.r} 时章是 ${L.chapterNow(st) + 1}，第一个没完成的主线是 ${k + 1}`);
  if (st.p.r <= L.chapterNow(st) + 1) fail(a.who, `只修炼 400 月境界 ${st.p.r} 没有超过章（${L.chapterNow(st) + 1}），这一局测不到“境界超前”`);
  for (let n = L.chapterNow(st) + 1; n <= 8; n++) if (st.evDone['story_r' + n]) fail(a.who, `章没到，story_r${n} 先出了`);
  judge(a);
  // 回头补主线（把只修炼那段的记录接着用）：慕容打得赢了
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
    // 回合战里 1e12 的对手也有极小的概率被一路好运打赢（改动 RNG 序列后种子 402 就撞上了）：局面没造出来就换种子重来，最多 6 次
    let w = play('约战输#' + s, 'guided', 400 + s, { maxT: 60, noJudge: true });
    for (let k = 1; k <= 5 && w.st.pact !== -1; k++) w = play('约战输#' + s, 'guided', 400 + s + 100 * k, { maxT: 60, noJudge: true });
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
// 7b. 不走捷径（docs/STORY_PLAN.md §12）：入宗只走界面那两条路（“三张帖子”那场戏、三宗争徒的弹窗），宿敌只靠论道、上门、下战书；
//     每局每章都要在 GAP_NS 月内推进（主线卡住时 mainline.js 会降要求：没有永远卡死的局面）
const GAP_NS = 200;
{
  const noSect = st => { st.flags.inviteAt = 1e9; };
  const ROUTES_NS = [
    ['散修·三张帖子都不理', 'guided', 1010, { mk: () => { const st = L.newState({ name: '测试' }); noSect(st); return st; }, run: { noSect: true } }],
    ['随手选·不入宗', 'lazy', 1020, { mk: () => { const st = L.newState({ name: '测试' }); noSect(st); return st; }, run: { noSect: true }, maxT: 1300 }],
    ['只靠论道与上门', 'guided', 1030, { run: { noChal: true } }],
    ['随手选·只靠论道', 'lazy', 1040, { run: { noChal: true }, maxT: 1300 }],
    ['散修丹师·不理', 'guided', 1050, { mk: reborn('sanxiu', [], noSect), run: { noSect: true } }],
  ];
  for (const [n, strat, seed, o] of ROUTES_NS) for (let s = 1; s <= N; s++) {
    const w = play('不走捷径·' + n + '#' + s, strat, seed + s, Object.assign({ reach: 8, gap: GAP_NS }, o));
    if (o.run && o.run.noSect && w.st.sect) fail(w.who, '不入宗的局面入了宗');
    if (o.run && o.run.noSect && !w.st.eflags.path_san && !w.st.origin) fail(w.who, '三张帖子没有选“哪家也不去”');
  }
  // 约战输了、又不入宗
  const pp = L.PACT_POWER;
  for (let s = 1; s <= N; s++) {
    L.PACT_POWER = 1e12;
    const a = play('不走捷径·约战输·不入宗#' + s, 'guided', 1060 + s, { maxT: 40, noJudge: true, mk: () => { const st = L.newState({ name: '测试' }); noSect(st); return st; }, run: { noSect: true } });
    L.PACT_POWER = pp;
    if (a.st.pact !== -1) fail(a.who, '没输掉约战（测试局面没造出来）');
    const w = watch(a.who, a.st); w.story = a.story; w.ch = L.chapterNow(a.st); w.chAt = a.chAt.slice(); cur = w;
    L.rng = rngFor(1070 + s);
    const rec = run('guided', 1070 + s, false, { st0: a.st, keep: true, onTick: onTick(w), noSect: true });
    w.st = rec.st || a.st; judge(w, { reach: 8, gap: GAP_NS });
    sum.runs++; if (w.st.p.r >= 9) sum.asc++; sum.chMax.push(L.chapterNow(w.st));
    if (V) console.log(`  ${w.who.padEnd(22)} 境界 ${w.st.p.r} · 第 ${L.chapterNow(w.st) + 1} 章 · ${w.st.tick} 月 · 章 ${fmtCh(w)}`);
  }
  L.PACT_POWER = pp;
  // 2.3.2 的旧档：散修走到第三章（赵乾）卡住——读档后补一封入宗帖、赵乾上门，主线接着走
  for (let s = 1; s <= N; s++) {
    const a = play('旧档·散修第三章#' + s, 'guided', 1080 + s, { maxT: 400, noJudge: true, mk: () => { const st = L.newState({ name: '测试' }); noSect(st); return st; }, run: { noSect: true, noChal: true } });
    const st = a.st;
    if (L.chapterNow(st) < 2) { fail(a.who, `400 月没走到第三章（第 ${L.chapterNow(st) + 1} 章），造不出旧档`); continue; }
    // 退回“第三章、赵乾没打”的样子，去掉新字段（2.3.2 没有 st.story / st.mainG / 三张帖子）
    for (let i = 2; i < 9; i++) delete st.quest.done['c' + i + '_m'];
    delete st.beaten.zhao; delete st.eflags.beat_zhao; st.path.ch = 2; st.path.at[2] = { t: st.tick - 150, pw: 1, exp: 0 };
    delete st.mainG; delete st.story; delete st.evDone.s2_invite; delete st.eflags.path_san; st.flags.inviteAt = 0; st.origin = 'sanxiu';
    const s2 = L.migrate(JSON.parse(JSON.stringify(st)));
    if (L.chapterNow(s2) !== 2) { fail(a.who, `迁移后第 ${L.chapterNow(s2) + 1} 章（应在第三章）`); continue; }
    if (!(s2.mainG && s2.mainG.rescue)) fail(a.who, '旧档没有救场标记');
    // 宗门不再上门来请（AP_PLAN §4.7）：读档当季就能【拜山门】、能向赵乾【下战帖】（L.mainActs）
    if (L.knockWhy(s2, 'jian')) fail(a.who, '读档后拜不了山门：' + L.knockWhy(s2, 'jian'));
    { const acts = L.mainActs(s2), side = L.mainActs(s2, { side: true }); if (!acts.some(x => x.do && x.do.id === 'duel' && x.do.args && x.do.args.id === 'zhao')) fail(a.who, '读档后主线行动里没有【下战帖 · 赵乾】：' + acts.map(x => x.t).join(' / ')); if (!side.some(x => x.do && x.do.id === 'join' && x.ok)) fail(a.who, '读档后没有能点的【拜山门】'); }
    let invite = true, foe = false;
    const w = watch(a.who + '·续玩', s2); w.story = a.story.slice(); w.ch = 2; w.chAt = [0, 36, s2.tick]; cur = w;
    const t0 = s2.tick;
    L.rng = rngFor(1090 + s);
    const rec = run('guided', 1090 + s, false, { st0: s2, keep: true, maxT: 260, noSect: true, noChal: true, onTick: (x, out) => { onTick(w)(x, out); if (out.mainFoe === 'zhao') foe = foe || x.tick - t0; } });
    w.st = rec.st || s2;
    void invite;
    if (foe === false) fail(w.who, '读档后赵乾没有上门'); else if (foe > 3) fail(w.who, `读档后第 ${foe} 月赵乾才上门`);
    if (L.chapterNow(w.st) < 3) fail(w.who, `读档后 260 月还在第 ${L.chapterNow(w.st) + 1} 章`);
    if (V) console.log(`  ${w.who.padEnd(22)} 赵乾上门 +${foe} 月 · 第三章用了 ${(w.chAt[3] || NaN) - t0} 月 · 第 ${L.chapterNow(w.st) + 1} 章`);
    sum.runs++;
  }
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

// 9. 串联层（storyline.js，docs/STORY_PLAN.md §2、§3、§10）：抉择场景齐全、节拍挂得上、十二条预设路线各落在预期的结局
{
  const who = '串联';
  const evs = L.events(), byId = id => evs.find(e => e.id === id);
  // 八个抉择点的场景都在，关键选项置的标志位对得上
  const PICKS = { s1_pact_after: ['mu_shame', 'mu_spare'], s2_invite: ['path_san'], su_5: [], ye_5: [], tiankuo_3: ['tiankuo_ally', 'tiankuo_sect'], story_r6: L.STORY_VOW, s7_war: L.STORY_WAR, tianheng_2: L.STORY_LU, story_r8: ['elder_kept', 'st_farewell'], s9_gate: L.STORY_ASC };
  for (const id in PICKS) {
    const ev = byId(id); if (!ev) { fail(who, `抉择场景 ${id} 不在`); continue; }
    if (!ev.choices.some(c => c.key)) fail(who, `${id} 没有关键抉择（key）`);
    const set = [].concat(...ev.choices.map(c => [].concat((c.ok.fx && c.ok.fx.flag) || [])));
    for (const f of PICKS[id]) if (!set.includes(f)) fail(who, `${id} 没有选项置 ${f}`);
  }
  // 节拍：sb: 触发键都对得上节拍表；每章的开章与高潮（带主线的章）都挂了场景
  const beats = new Set(L.STORY_BEATS.map(b => b.id)), used = new Set();
  for (const e of evs) if (e.where === 'story' && /^sb:/.test(e.trigger || '')) { const k = e.trigger.slice(3); used.add(k); if (k !== 'mid' && !beats.has(k)) fail(who, `${e.id} 挂在不存在的节拍 ${k} 上`); }
  for (const k of ['c1_open', 'c1_climax', 'c2_open', 'c2_mid1', 'c3_open', 'c3_climax', 'c4_open', 'c5_open', 'c5_mid3', 'c6_open', 'c7_open', 'c7_mid2', 'c7_climax', 'c8_open', 'c8_mid2', 'c8_climax', 'c9_open', 'c9_climax']) if (!used.has(k)) fail(who, `节拍 ${k} 上没有场景`);
  // §10 验收 1：九章每章的节拍位都挂了对话场景（几个位子由系统触发键上的那场戏顶着：约战前夜、墨色剑帖、击败云无极、飞升前夜；第一章的章末并进第二章开章）；每章主线对话场景 ≥ 6
  { const EQUIV = { c1_pre: 'story_pact_eve', c1_end: 'story_r1', c3_mid2: 'mo_1', c9_mid3: 'yun_3', c9_pre: 'story_ascend' };
    const EXTRA = { 0: ['story_pact_eve'], 1: ['story_sect'], 2: ['mo_1', 'story_trib1'], 3: ['sect_succession'], 4: ['story_boss5'], 5: ['zhao_3'], 7: ['ch_sword_6'], 8: ['yun_3', 'story_ascend'] };
    const talkOn = k => evs.some(e => e.where === 'story' && e.trigger === 'sb:' + k && e.talk);
    const has = id => talkOn(id) || !!(EQUIV[id] && byId(EQUIV[id]) && byId(EQUIV[id]).talk);
    // open / pre / climax / end 必须有；中段至少两个（空着的中段位让给人物戏 sb:mid）
    for (const b of L.STORY_BEATS) if (!/^mid/.test(b.slot) && !has(b.id)) fail(who, `节拍 ${b.id} 上没有对话场景`);
    for (let ch = 0; ch < 9; ch++) { const n = L.STORY_BEATS.filter(b => b.ch === ch && /^mid/.test(b.slot) && has(b.id)).length; if (n < 2) fail(who, `第 ${ch + 1} 章的中段只有 ${n} 个位子挂了场景（要 ≥ 2）`); }
    for (let ch = 0; ch < 9; ch++) { const n = evs.filter(e => e.talk && new RegExp('^sb:c' + (ch + 1) + '_').test(e.trigger || '')).length + (EXTRA[ch] || []).filter(id => byId(id) && byId(id).talk).length; if (n < 6) fail(who, `第 ${ch + 1} 章主线对话场景只有 ${n} 场（要 ≥ 6）`); }
    // 口吻（§10 验收 4）：只查带对话的场景与共用场景的空位
    const lines = [];   // { id, who, text, qitu }
    const walkT = (id, t, qitu) => { for (const it of t || []) { if (Array.isArray(it)) lines.push({ id, who: it[0].split(':')[0], text: it[1], qitu }); else if (it && it.black) lines.push({ id, who: 'nar', text: it.black, qitu }); else if (it) { if (it.say) walkT(id, it.say, qitu); if (it.pick) for (const o of it.pick) walkT(id, o.say, qitu); } } };
    for (const e of evs) if (e.talk) { const q = e.origin === 'qitu'; walkT(e.id, e.talk, q); for (const c of e.choices) for (const br of ['ok', 'fail']) if (c[br]) walkT(e.id, c[br].talk, q); }
    for (const id in (L.STORY_SLOTS || {})) for (const x of L.STORY_SLOTS[id]) walkT(id + '·空位', x.say, x.who === 'mu' || x.who === 'zhao');
    const ws = lines.filter(x => /为师/.test(x.text)); if (ws.length > 5) fail(who, `“为师”出现 ${ws.length} 次（全剧 ≤ 5）：${ws.map(x => x.id).join('、')}`);
    for (const x of lines) {
      const plain = x.text.replace(/[*|]/g, '');
      if (x.who === 'elder' && /老夫/.test(plain)) fail(who, `${x.id} 老祖说了“老夫”`);
      if (x.who === 'chu') for (const seg of plain.split(/[。！？…，、—]+/)) if ([...seg].length > 8) fail(who, `${x.id} 楚狂的句子超过八个字：${seg}`);
      if (x.who === 'tianheng' && /本座|墨离/.test(plain)) fail(who, `${x.id} 陆天衡说了“本座 / 墨离”：${plain.slice(0, 14)}`);
      if (!/^(s1_|story_pact_eve)/.test(x.id) && /三年前|三年来/.test(plain)) fail(who, `${x.id} 第一章以外出现“三年前 / 三年来”：${plain.slice(0, 14)}`);
      if (!x.qitu && /天剑宗外门|破庙|退婚|慕容/.test(plain)) fail(who, `${x.id} 不是弃徒专属的戏却写死了弃徒的词：${plain.slice(0, 14)}`);
    } }
  // 主线目标不写境界：第七、八、九章只看故事标志位
  { const st = L.newState({ name: '测试' }); st.p.r = 9; for (let i = 0; i < 9; i++) st.quest.done['c' + i + '_m'] = i < 6 ? 1 : 0;
    if (L.CHAPTERS[6].main.c(st) || L.CHAPTERS[7].main.c(st) || L.CHAPTERS[8].main.c(st)) fail(who, '境界到了、故事没走，第七～九章的主线却算完成了');
    Object.assign(st.eflags, { st_truth: 1, war_stop: 1, tianheng_spared: 1, asc_go: 1 }); st.p.r = 3;
    if (!(L.CHAPTERS[6].main.c(st) && L.CHAPTERS[7].main.c(st) && L.CHAPTERS[8].main.c(st))) fail(who, '故事走完了，第七～九章的主线没算完成'); }
  // 预设路线 → 结局（STORY_PLAN §10 的表）
  const lord = st => { st.sect = { id: 'jian', rank: 6, best: 1, total: 0, pts: 0, joined: 0, veins: 0, order: L.NINE.map(x => x.id), meets: 0, tasks: [], build: { ward: 0, lib: 0, vein: 0 } }; };
  const sect = id => st => { st.sect = { id, rank: 3, best: 4, total: 0, pts: 0, joined: 0, veins: 0, order: L.NINE.map(x => x.id), meets: 0, tasks: [], build: { ward: 0, lib: 0, vein: 0 } }; };
  const ROUTES = [
    ['R1 正统', ['mu_spare', 'vow_justice', 'war_zheng', 'tianheng_crippled', 'asc_go'], sect('jian'), 'ascend'],
    ['R2 药香', ['mu_spare', 'mu_asked', 'tiankuo_ally', 'vow_letgo', 'war_stop', 'tianheng_spared', 'asc_go'], st => { sect('dan')(st); st.daolv = 'su'; }, 'daolv'],
    ['R3 红月', ['mu_spare', 'tiankuo_sect', 'vow_justice', 'war_stop', 'tianheng_exposed', 'asc_go'], st => { sect('dao')(st); st.daolv = 'ye'; }, 'daolv'],
    ['R4 掌宗', ['mu_spare', 'tiankuo_ally', 'vow_justice', 'war_zheng', 'tianheng_exposed', 'asc_go'], lord, 'summit'],
    ['R5 师徒', ['mu_spare', 'tiankuo_ally', 'vow_letgo', 'war_stop', 'tianheng_spared', 'sword_6', 'elder_kept', 'asc_go'], st => { sect('dao')(st); st.daolv = 'su'; }, 'shitu'],
    ['R6 地仙', ['mu_spare', 'path_san', 'tiankuo_sect', 'vow_letgo', 'war_stop', 'tianheng_spared', 'sword_6', 'elder_kept', 'asc_stay'], st => { st.daolv = 'su'; }, 'hermit'],
    ['R7 问天', ['mu_spare', 'tiankuo_ally', 'vow_justice', 'war_stop', 'tianheng_exposed', 'sword_6', 'elder_kept', 'yun_codex', 'tea_5', 'star_4', 'asc_break'], sect('jian'), 'wentian'],
    ['R8 魔尊', ['mu_shame', 'vow_blood', 'war_mo', 'tianheng_dead', 'asc_go'], st => { sect('xuesha')(st); st.daolv = 'ye'; st.bestRank = 1; }, 'mozun'],
    ['R9 孤峰', ['mu_shame', 'vow_blood', 'war_zheng', 'war_blood', 'tianheng_dead', 'asc_go'], sect('jian'), 'gufeng'],
    ['R10 倒戈', ['mu_shame', 'tiankuo_sect', 'vow_blood', 'war_mo', 'tianheng_crippled', 'asc_go'], st => { st.daolv = 'ye'; }, 'daolv'],
    ['R11 约输', ['path_san', 'vow_justice', 'war_zheng', 'tianheng_crippled', 'asc_go'], null, 'ascend'],
  ];
  const seenEnd = new Set(), seenFlag = new Set();
  for (const [n, flags, mk, want] of ROUTES) {
    const st = L.newState({ name: '测试' }); st.p.r = 9; st.bestRank = 5; if (mk) mk(st); for (const f of flags) { st.eflags[f] = 1; seenFlag.add(f); }
    const E = L.endingOf(st); seenEnd.add(E.id);
    if (E.id !== want) fail(who, `${n} 落在结局 ${E.id}（要 ${want}）`);
    if (L.endingsOf(st)[0] !== E.id) fail(who, `${n} L.endingsOf 的第一项不是主结局`);
    if (!L.epilogue(st).length) fail(who, `${n} 没有后日谈`);
    if (!L.ENDING[E.id]) fail(who, `结局 ${E.id} 不在图鉴的结局表里`);
  }
  { const st = L.newState({ name: '测试' }); if (L.endingOf(st).id !== 'rest') fail(who, 'R12 没飞升不是坐化'); seenEnd.add('rest'); }
  for (const id of Object.keys(L.STORY_END)) if (!seenEnd.has(id)) fail(who, `结局 ${id} 没有一条预设路线走得到`);
  for (const f of L.STORY_FLAGS) if (!seenFlag.has(f) && !['daolv_su', 'daolv_ye'].includes(f)) fail(who, `故事标志位 ${f} 没有一条预设路线用到`);
  // 有条件的选项：条件不满足时不显示（界面画成灰的），满足了才显示
  { const st = L.newState({ name: '测试' }), ev = byId('s9_gate'), shown = () => ev.choices.map(c => L.choiceShown(st, c) ? 1 : 0).join('');
    if (shown() !== '100') fail(who, `天门：什么都没有时该只有“踏进去”（${shown()}）`);
    st.daolv = 'su'; st.eflags.sword_6 = 1; st.eflags.yun_codex = 1; st.eflags.tea_5 = 1;
    if (shown() !== '111') fail(who, `天门：有牵挂、有玄霄、两处线索时三项都该能选（${shown()}）`); }
  // 回声：每个故事标志位至少被两处读到（对话里的 if、事件 / 选项的 need / not / cond、后日谈、结局判定）
  { const read = {}; const hit = f => { if (typeof f === 'string') { f = f.replace(/^!/, ''); read[f] = (read[f] || 0) + 1; } };
    const walk = t => { for (const it of t || []) { if (Array.isArray(it)) continue; [].concat(it.if === undefined ? [] : it.if).forEach(hit); if (it.say) walk(it.say); if (it.pick) walk(it.pick); } };
    for (const e of evs) { [].concat(e.need || [], e.not || [], e.cond === undefined ? [] : e.cond).forEach(hit); walk(e.talk); for (const c of e.choices) { [].concat(c.need || [], c.not || []).forEach(hit); for (const b of ['ok', 'fail']) if (c[b]) walk(c[b].talk); } }
    for (const [, list] of L.EPILOGUE) for (const [c] of list) hit(c);
    const src = require('fs').readFileSync(path.join(__dirname, '..', 'src', 'logic', 'storyline.js'), 'utf8');
    for (const f of ['mu_shame', 'mu_spare', 'vow_blood', 'vow_justice', 'vow_letgo', 'war_zheng', 'war_mo', 'war_stop', 'tianheng_dead', 'tianheng_spared', 'elder_kept', 'tiankuo_ally', 'tiankuo_sect']) {
      const n = (read[f] || 0) + (src.split(f).length - 1 > 2 ? 1 : 0);
      if (n < 2) fail(who, `故事标志位 ${f} 只有 ${n} 处读它（回声不够）`);
    } }
  sum.runs += ROUTES.length + 1;
}

// 10. 结算链与主线行动（docs/AP_PLAN.md §8.3 的 H1～H10）：只用 L.act / L.seasonEnd / L.nextBlock / L.blockDone / L.mainActs 玩（界面也只能调这几个），不借 sim 的主循环
//   H1 关键剧情 shown − due === 0（逻辑层的 st.story.lag，和本段自己记的“条件第一次成立 → 那场戏出链”两套口径）；H3 中段戏 ≤ 1 季；H5 三年之约整条链在第 36 月；
//   H7 季初阻塞内容 ≤ 2 件；H8 单章 ≤ 60 季、六个出身 × 入宗 / 散修都走到第六章以后；H9 任何一季 L.mainActs 非空、做不了的说得出差什么；H10 旧档迁移 + 第一条链。
//   另打印：关键剧情 shown − due 的分布（应全为 0）、每条路线每章用了几季。
const HSUM = { lag: {}, mid: {}, chap: [] };
const KEY_RE = /^sb:c\d_(open|climax|end|pre)$|^sb:c2_mid1$|^(beat|boss|trib|demon|srank|rank|war_eve):|^(sect|daolv|pact_eve)$/;
// 击败点名的人：那场戏是那一章的高潮——人在前一章就打赢了的（论道上碰到），戏在那一章开章的同一条链里接着出，所以“成立”= 打赢了且章到了
const KEYEV = [['pact', st => !!st.pact, ['s1_pact_after', 's1_pact_lost']], ['zhao', st => !!st.beaten.zhao && L.chapterNow(st) >= 2, ['s3_zhao_fall']], ['chu', st => !!st.beaten.chu && L.chapterNow(st) >= 4, ['s5_tiankuo_fall']], ['war', st => !!st.flags.warWon, ['s6_after']]]
  .concat([1, 2, 3, 4, 5, 6, 7, 8].map(i => ['m' + (i - 1), st => !!st.quest.done['c' + (i - 1) + '_m'], ['story_r' + i]]));
function chainPlay(who, mk, o) {
  o = o || {};
  L.rng = rngFor(o.seed || 1);
  const st = mk(); st.btPol = 'smart';
  const seq = () => st.ap.seq, due = {}, shown = {}, chAt = []; let ch0 = L.chapterNow(st); chAt[ch0] = st.tick;
  const h = m => fail(who, m);
  const pick = ev => {
    const okI = ev.choices.map((c, i) => i).filter(i => L.choiceShown(st, ev.choices[i]) && L.costOk(st, ev.choices[i].cost));
    if (!okI.length) return undefined;
    if (ev.id === 's2_invite') { const join = okI.find(i => ev.choices[i].ok && ev.choices[i].ok.fx && ev.choices[i].ok.fx.join && L.sectJoinable(st, ev.choices[i].ok.fx.join)), san = okI.find(i => [].concat((ev.choices[i].ok && ev.choices[i].ok.fx && ev.choices[i].ok.fx.flag) || []).includes('path_san')); return o.lone ? (san !== undefined ? san : okI[0]) : join !== undefined ? join : okI[0]; }
    return okI[Math.floor(L.rng() * okI.length)];
  };
  const watchK = () => { for (const [k, f] of KEYEV) if (due[k] === undefined && f(st)) due[k] = { seq: seq(), tick: st.tick }; const ch = L.chapterNow(st); if (ch > ch0) { for (let i = ch0 + 1; i <= ch; i++) chAt[i] = st.tick; ch0 = ch; } };
  const settle = why => {
    L.chainOpen(st, why); const t0 = st.tick; let n = 0, lv8 = 0; const list = [];
    for (;;) {
      const x = L.nextBlock(st); if (!x) break;
      if (++n > 60) { h(`结算链不收敛（${why}，第 ${st.tick} 月）：${list.slice(-6).join(' → ')}`); break; }
      list.push(x.kind + ':' + x.id);
      if (x.kind === 'story') { if (shown[x.id] === undefined) shown[x.id] = { seq: seq(), tick: st.tick }; const ev = L.eventById(x.id); if (ev) { const i = pick(ev); if (i !== undefined) L.resolveChoice(st, ev, i); } }
      if (why === 'season' && x.lv === 8) lv8++;
      L.blockDone(st, x); watchK();
    }
    if (st.tick !== t0) h(`结算链进行中时间走了（${t0} → ${st.tick}）`);
    if (lv8 > 2) h(`H7 季初阻塞内容 ${lv8} 件（第 ${st.tick} 月）：${list.join(' → ')}`);
    for (const id of st.storyQ) { const ev = L.eventById(id); if (ev && /^sb:c\d_(open|climax|end)$/.test(ev.trigger || '')) h(`链结束后关键剧情 ${id} 还在队列里（第 ${st.tick} 月）`); }
    return list;
  };
  const trip = args => { if (!L.act(st, 'exp', args)) return null; L.tripAuto(st, ev => { const i = pick(ev); if (i !== undefined) L.resolveChoice(st, ev, i); }); return L.tripEnd(st); };
  const growAct = () => {
    if (st.p.inj > 0 && st.pills > 0 && L.heal) L.heal(st);
    if (L.isFull(st) || st.p.inj > 0) return (!L.apWhy(st, 'retreat') && L.act(st, 'retreat')) || L.act(st, 'sit');
    if ((st._hT || 0) >= 2 && !L.apWhy(st, 'retreat')) { st._hT = 0; return L.act(st, 'retreat'); }
    const c = L.expBest(st, 0); const r = trip({ k: c.k, d: c.d, a: c.a }); if (r) { st._hT = (st._hT || 0) + 1; return r; }
    return L.act(st, 'sit');
  };
  const chores = () => {   // 家务：不花点（换装、换功法、建造升级洞府、宗门任务、买破境丹）
    try { if (L.gearAutoAll) L.gearAutoAll(st); if (L.artApply && L.artBest) L.artApply(st, L.artBest(st, {})); } catch (e) { /* 没开放 */ }
    if (L.home2On && L.home2On() && L.homePlotFree(st)) for (const k of ['field', 'furnace', 'room', 'vault', 'library', 'forge', 'pen', 'spring', 'pavilion', 'portal']) { if (st.home[k] > 0 || !L.homeUnlocked(st, k)) continue; if (st.stones >= L.homeCost(st, k)) L.build(st, k); break; }
    for (let g = 0; g < 20; g++) { let best = null; for (const b of L.HOME) { if (st.home[b.k] >= b.max || !L.homeOpen(st, b.k) || (b.nu && !st.home[b.k])) continue; const c = L.hCost(b.k, st.home[b.k]); if (!best || c < best.c) best = { k: b.k, c }; } if (!best || st.stones < best.c * 1.2 || !L.upgrade(st, best.k)) break; }
    if (st.sect) st.sect.tasks.forEach((t, i) => { if (!t.taken && t.ty !== 'teach' && t.ty !== 'lecture') L.taskTake(st, i); if (L.taskCanDeliver(st, t)) L.taskDeliver(st, i); });
    if (L.isFull(st) || (L.ticksToNext && L.ticksToNext(st) <= 6)) for (let g = 0; g < 3 && st.pills < 3 && st.stones >= L.price(st, 'pill'); g++) L.buy(st, 'pill');
  };
  settle('load');
  if (o.fixture) {
    if (st.tick % 3) h(`H10 迁移后 tick = ${st.tick}，不在季界上`);
    if (st.exp || st.retreat) h('H10 迁移 + 第一条链之后还有“在外”状态');
    for (let n = 1; n <= Math.min(8, L.chapterNow(st)); n++) if (!st.evDone['story_r' + n]) h(`H10 迁移 + 第一条链之后 story_r${n} 还没播（第 ${L.chapterNow(st) + 1} 章）`);
    if (!L.mainActs(st).length) h('H10 迁移后 L.mainActs 为空');
  }
  const maxS = o.seasons || 230;
  let sN = 0;
  for (; sN < maxS && st.p.r < 9 && st.p.age < L.lifespan(st); sN++) {
    chores();
    for (let g = 0; g < 6 && L.apLeft(st) > 0; g++) {
      const acts = L.mainActs(st);
      if (!acts.length) h(`H9 第 ${st.tick} 月 L.mainActs 为空（第 ${L.chapterNow(st) + 1} 章）`);
      for (const a of acts) if (!a.ok && (!a.why || /^(条件不足|不可用|暂不可用|眼下做不了)$/.test(a.why))) h(`H9 主线行动「${a.t}」做不了却没说差什么（“${a.why}”）`);
      if (!acts.some(a => a.ok) && L.apLeft(st) > 0 && !st.run) h(`H9 第 ${st.tick} 月主线行动一项都做不了：${acts.map(a => a.t + '✗' + a.why).join(' / ')}`);
      const t0 = st.tick, a = acts.find(x => x.ok && !x.grow && (x.p === undefined || x.p >= 0.55));
      let r = null;
      if (a && a.do) r = a.do.id === 'exp' ? trip(a.do.args) : L.act(st, a.do.id, a.do.args);
      if (!r) r = growAct();
      if (st.tick !== t0) h(`行动之后时间走了（${t0} → ${st.tick}）`);
      watchK(); settle('act');
      if (!r) break;
    }
    if (L.isReady(st) && !(st.p.r === 8 && L.chapterNow(st) < 8)) { if (L.tribNeeded(st)) { const v = L.tribStart(st, { pills: Math.min(3, st.pills), aids: 'all' }); if (v) L.tribFinish(st, { fa: 1, pet: 1, daolv: 1, pills: 0 }); } else L.breakthrough(st, Math.min(3, st.pills)); watchK(); settle('act'); }
    if (st.p.r >= 9) break;
    const t0 = st.tick; L.seasonEnd(st);
    if (st.tick !== t0 + 3 && !(st.p.age >= L.lifespan(st))) h(`季末结算后 tick ${t0} → ${st.tick}`);
    watchK(); settle('season');
    const ch = L.chapterNow(st); if (chAt[ch] !== undefined && st.tick - chAt[ch] > 180 && !st.quest.done.c8_m && st.p.r < 9) { h(`H8 第 ${ch + 1} 章超过 60 季：${L.mainActs(st).map(a => a.t + (a.ok ? '✓' : '✗' + a.why)).join(' / ')}`); break; }
  }
  if (st.p.r >= 9) settle('act');
  // H1 两套口径
  for (const [k, , evs] of KEYEV) { if (!due[k]) continue; const id = evs.find(e => shown[e]); if (!id) continue; const d = shown[id].seq - due[k].seq; HSUM.lag[d] = (HSUM.lag[d] || 0) + 1; if (d !== 0) h(`H1 剧情滞后：${k} 在第 ${due[k].tick} 月成立，${id} 第 ${shown[id].tick} 月才出（隔 ${d} 个行动）`); }
  for (const id in st.story.lag) {
    const x = st.story.lag[id], ev = L.eventById(id); if (!ev || x.shown === undefined || x.via !== 'chain') continue;
    if (KEY_RE.test(ev.trigger || '') && !(L.storyIdle && L.storyIdle(ev))) { const d = x.shown - x.due; HSUM.lag[d] = (HSUM.lag[d] || 0) + 1; if (d !== 0) h(`H1 st.story.lag：${id}（${ev.trigger}）shown − due = ${d}`); }
    else if (L.storyIdle && L.storyIdle(ev)) { const d = x.shown - x.due; HSUM.mid[d] = (HSUM.mid[d] || 0) + 1; }
  }
  if (due.pact && !o.fixture && !st.rebirth) for (const id of ['s1_pact_after', 'story_r1']) if (shown[id] && (shown[id].tick !== 36 || shown[id].seq !== due.pact.seq) && st.pact > 0) h(`H5 ${id} 在第 ${shown[id].tick} 月 / seq ${shown[id].seq}（约战第 ${due.pact.tick} 月 / seq ${due.pact.seq}）`);
  for (const b in st.story.beat) if (st.story.beat[b] === -1 && /^(c1_climax|c2_mid1|c3_climax|c7_mid2|c7_climax|c8_mid2|c8_climax|c9_climax|c\d_open)$/.test(b) && !o.fixture) h(`H3 带抉择的节拍 ${b} 被记成“错过”`);
  const fin = !!st.quest.done.c8_m || st.p.r >= 9;
  if (o.reach !== undefined && !fin && L.chapterNow(st) < o.reach && st.p.r < 9) h(`H8 ${sN} 季（境界 ${st.p.r}）只走到第 ${L.chapterNow(st) + 1} 章（要第 ${o.reach + 1} 章）`);
  const per = []; for (let i = 1; i < chAt.length; i++) if (chAt[i] !== undefined && chAt[i - 1] !== undefined) per.push(Math.round((chAt[i] - chAt[i - 1]) / 3));
  { const last = chAt.length - 1; if (last >= 0 && chAt[last] !== undefined) per.push(Math.round((st.tick - chAt[last]) / 3) + (fin ? '' : '+')); }
  HSUM.chap.push({ who, per, end: fin ? '完' : `第 ${L.chapterNow(st) + 1} 章`, seasons: sN, r: st.p.r });
  sum.runs++; if (st.p.r >= 9) sum.asc++; sum.chMax.push(L.chapterNow(st));
  if (V) console.log(`  ${who.padEnd(22)} ${sN} 季 · 境界 ${st.p.r} · ${fin ? '九章做完' : '第 ' + (L.chapterNow(st) + 1) + ' 章'} · 每章季数 ${per.join('/')}`);
  return st;
}
{
  const HN = QUICK ? 1 : 2;
  for (const o of L.ORIGIN_IDS) for (const lone of [false, true]) for (let k = 0; k < HN; k++) {
    const mk = o === 'qitu' && k === 0 ? () => L.newState({ name: '测试' }) : reborn(o);
    chainPlay(`链·${L.ORIGINS[o].n}·${lone ? '散修' : '入宗'}#${k + 1}`, mk, { seed: 1300 + k * 7 + (lone ? 1 : 0), lone, reach: 6 });
  }
  // H10 旧档
  const FIX = path.join(__dirname, 'story_fixtures'), fsx = require('fs');
  const files = fsx.existsSync(FIX) ? fsx.readdirSync(FIX).filter(f => /\.json$/.test(f)).sort() : [];
  for (const f of QUICK ? files.filter((x, i) => i % 3 === 0) : files) chainPlay('旧档·' + f.replace(/\.json$/, ''), () => L.migrate(JSON.parse(fsx.readFileSync(path.join(FIX, f), 'utf8'))), { seed: 1400, fixture: f, lone: /lone|wuzong|refuse/.test(f), seasons: QUICK ? 20 : 60 });
  const ls = Object.keys(HSUM.lag).sort((a, b) => a - b).map(d => `${d}: ${HSUM.lag[d]}`).join('，'), ms = Object.keys(HSUM.mid).sort((a, b) => a - b).map(d => `${d}: ${HSUM.mid[d]}`).join('，');
  console.log(`关键剧情 shown − due（个行动）分布：${ls || '—'}；闲戏：${ms || '—'}`);
  console.log('每条路线每章用了几季（第一章起；— = 没走到）：');
  for (const c of HSUM.chap.filter(x => !/^旧档/.test(x.who))) console.log(`  ${c.who.padEnd(20)} ${c.per.map((v, i) => `${i + 1}:${v}`).join(' ')} · ${c.end} · 共 ${c.seasons} 季`);
}

const sec = Math.round((Date.now() - t0) / 1000);
console.log(`共 ${sum.runs} 局，飞升 ${sum.asc} 局，${sec} 秒`);
if (fails.length) { console.log(`失败 ${fails.length} 条：`); for (const f of fails.slice(0, 60)) console.log('  ✗ ' + f); process.exit(1); }
console.log('故事推进检查通过');
