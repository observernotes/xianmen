#!/usr/bin/env node
/* 废柴仙途 · 主线可达性的静态检查（src/logic/mainline.js 的 L.mainReqs 表；只跑逻辑层）
 *   node tools/main_check.js        检查并打印每章每条路线的主线组成、依赖、怎么主动去做
 *   node tools/main_check.js q      只打印失败
 *
 * 对 L.CHAPTERS / L.LONE / NEW_MAIN 合起来的每一章主线（L.mainReqs，按路线展开），六条路线：入宗正道（太虚剑宗）、入魔宗（魔门遗孤 + 血煞魔宗）、
 * 散修（三张帖子选了“哪家也不去”）、无宗试炼、散修丹师、被除名（入过宗、后来没了宗门），逐项列出它依赖的系统、函数、界面入口、人物，并断言：
 *   1 依赖在：L.MAIN_HOW 里写的逻辑函数都在 L 上；界面入口都在 dist 的界面代码里；
 *   2 能主动去做：宿敌（这一章要打的）在家时 L.challengeInfo 没有拦着（不看境界、名次）；没宗门的人身上不出现要宗门的项（srank / meet）；
 *     内门 / 真传 / 圣子不看境界；天骄论道、九宗会武的下一届在 24 月内；首领表够数；来犯在第六章 L.WAR_LEAD + 6 月内真的来（入宗、散修两条都跑一遍）；
 *     剧情项（flag / beat）：节拍在表里、这一章有能放的场景、场景里至少一个不要钱、不设门槛（要打的输了能重来）的选项置上要的标志位，而且照常过月 80 月内真的放出来并置上；
 *     第二章一开（6 月内）就是“三张帖子”（无宗试炼除外）；没宗门的随时【拜山门】；每章每条路线 L.mainActs 非空、做不了的说得出差什么、至少一项现在就能做；
 *   3 目标卡带得到：每一项的进度都有一句话、【去】的键在 goalcard.js 的 GO_K 里；老祖的“下一步”有话说；
 *   4 兜底管用：这一章降到第 3 级时，宿敌 / 原圣子 / 来犯的胜算 ≥ 60%，名次、首领不再要求，会武由击败楚天阔顶替。 */
'use strict';
const fs = require('fs'), path = require('path');
const L = require(path.join(__dirname, '..', 'src', 'logic.js'));
const Q = process.argv.includes('q');
const fails = []; let checks = 0;
const ok = (c, who, m) => { checks++; if (!c) fails.push(`[${who}] ${m}`); return c; };
const rngFor = seed => { let s = (seed * 2654435761 + 7) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
L.rng = rngFor(1);
const ui = fs.readdirSync(path.join(__dirname, '..', 'src', 'ui')).map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'ui', f), 'utf8')).join('\n');
const GO_K = new Set((/const GO_K = \{([\s\S]*?)\n\};/.exec(ui) || ['', ''])[1].match(/\b(\w+): \(\)/g).map(x => x.split(':')[0]).concat((ui.match(/GO_K\.(\w+) =/g) || []).map(x => x.slice(5, -2))));
const CN = '一二三四五六七八九';

// ---------- 局面 ----------
const ROUTES = [
  { id: 'zheng', n: '入宗·正道', mk: () => L.newState({ name: '测试' }), sect: 'jian' },
  { id: 'mo', n: '入宗·魔宗', mk: () => L.newState({ name: '测试', rebirth: 1, origin: 'moyi', trials: [], meta: L.newMeta() }), sect: 'xuesha' },
  { id: 'san', n: '散修', mk: () => { const st = L.newState({ name: '测试' }); st.eflags.path_san = 1; return st; } },
  { id: 'wuzong', n: '无宗试炼', mk: () => L.newState({ name: '测试', rebirth: 1, origin: 'qitu', trials: ['wuzong'], meta: L.newMeta() }) },
  { id: 'sanxiu', n: '散修丹师', mk: () => L.newState({ name: '测试', rebirth: 1, origin: 'sanxiu', trials: [], meta: L.newMeta() }) },
  { id: 'expel', n: '被除名', mk: () => L.newState({ name: '测试' }), sect: 'jian', expel: 2 },
];
function at(route, ch, o) {
  o = o || {};
  L.rng = rngFor(10 + ch);
  const st = route.mk();
  st.tick = o.tick || Math.max(40, 40 + ch * 40); st.p.age += st.tick / 12;
  st.pact = o.pact !== undefined ? o.pact : ch === 0 ? -1 : 1; if (st.pact > 0 || ch >= 1) { st.beaten.mu = 1; st.eflags.beat_mu = 1; }   // 第一章：约战输了的那条（赢了第一章就完了；约战是第 36 月定时的）
  for (let i = 0; i < ch; i++) st.quest.done['c' + i + '_m'] = 1;
  if (ch >= 1) st.evDone.s2_invite = 1;
  if (route.sect && ch >= 1 && !(route.expel && ch >= route.expel)) { L.joinSect(st, route.sect); st.sect.joined = st.tick - 30; }
  if (route.expel && ch >= route.expel) st.eflags.sect_expelled = 1;
  if (o.r !== undefined) { st.p.r = o.r; st.p.s = 0; st.flags.maxR = o.r; }
  if (st.path) st.path.ch = L.chapterNow(st);
  L.mainState(st); st.mainG.ch = L.chapterNow(st); st.mainG.in = st.mainG.at = st.tick;
  { const S = L.storyState(st); for (const b of L.STORY_BEATS) if (b.ch < ch) S.beat[b.id] = -1; S.chAt[ch] = st.tick; }
  return st;
}
const reqList = (st, ch) => { const a = []; for (const x of L.mainReqs(st, ch)) { a.push(x); if (x.k === 'beat') for (const y of x.pre || []) a.push(Object.assign({ under: x.beat }, y)); } return a; };
const xName = (st, x) => ({ rival: () => '击败' + L.rivalName(st, x.id), srank: () => '宗门身份 ' + L.srankName(st, x.n), rank: () => '天骄榜前 ' + x.n, boss: () => `击败首领 ${x.n} 个`, meet: () => '会武压过天剑宗', war: () => '击退天剑宗来犯',
  flag: () => `剧情 ${x.f}（节拍 ${x.beat}）`, beat: () => `抉择 ${x.flags.join('/')}（节拍 ${x.beat}）`, asc: () => '渡过飞升天劫' }[x.k] || (() => x.k))();
// 节拍上能放的场景：this chapter、置得上要的标志位
const scenesOf = (st, beat, flags) => L.events().filter(ev => ev.where === 'story' && ev.trigger === 'sb:' + beat).map(ev => {
  const choices = ev.choices.map((c, i) => ({ c, i, f: [].concat((c.ok && c.ok.fx && c.ok.fx.flag) || []) })).filter(o => o.f.some(f => flags.includes(f)));
  // 免费：不要钱、不设门槛；要打的（duel / p）得有“输了过几个月重来”（fail.fx.retry）
  const free = choices.filter(o => !o.c.cost && !o.c.gate && o.c.cond === undefined && !o.c.need && !o.c.not && ((o.c.p === undefined && !o.c.duel) || !!(o.c.fail && o.c.fail.fx && o.c.fail.fx.retry)));
  return { ev, el: L.eligible(st, ev, 'story', { trigger: ev.trigger }), choices, free };
});
// 照常过月，剧情一出就选（优先置上要的标志位的那一项）；n 月内 test(st) 为真
function runFor(st, n, test, want) {
  const outs = [];
  for (let k = 0; k < n; k++) {
    const out = L.tick(st); outs.push(out);
    if (out.war) L.sectWar(st);
    if (out.tourney) L.tournament(st);
    for (let g = 0; g < 8 && st.storyQ.length; g++) {
      const ev = L.eventById(st.storyQ.shift()); if (!ev) continue;
      const sh = ev.choices.map((c, i) => i).filter(i => L.choiceShown(st, ev.choices[i]) && L.costOk(st, ev.choices[i].cost));
      const pick = sh.find(i => [].concat((ev.choices[i].ok && ev.choices[i].ok.fx && ev.choices[i].ok.fx.flag) || []).some(f => (want || []).includes(f)));
      L.resolveChoice(st, ev, pick !== undefined ? pick : sh[0] !== undefined ? sh[0] : 0);
    }
    if (st.exp) st.exp = null;
    if (test(st, out)) return { ok: true, n: k + 1, outs };
  }
  return { ok: false, n, outs };
}

const lines = [];
const fnOk = f => typeof L[f] === 'function';
const uiOk = f => new RegExp('function ' + f + '\\b').test(ui);
for (const R of ROUTES) for (let ch = 0; ch < 9; ch++) {
  const who = `${R.n}·第${CN[ch]}章`;
  const st = at(R, ch);
  if (L.chapterNow(st) !== ch) { ok(false, who, `局面没造出来：当前第 ${L.chapterNow(st) + 1} 章`); continue; }
  const lone = L.loneRoute(st), xs = reqList(st, ch);
  ok(xs.length > 0, who, '这一章没有主线项');
  lines.push(`${who}（${lone ? '散修之路' : st.sect ? L.sectOf(st).n : '未入宗'}）：${L.questText(st, L.CHAPTERS[ch].main)}`);
  if (!st.sect) ok(!xs.some(x => x.k === 'srank' || x.k === 'meet') || (!lone && R.id === 'zheng'), who, '没宗门、却要宗门身份 / 会武（散修走不通）');
  for (const x of xs) {
    const H = L.MAIN_HOW[x.k];
    if (!ok(!!H, who, `${x.k} 没写 MAIN_HOW`)) continue;
    for (const f of H.fn) ok(fnOk(f), who, `${xName(st, x)}：依赖的 L.${f} 不在`);
    for (const f of H.ui) ok(uiOk(f), who, `${xName(st, x)}：界面入口 ${f} 不在`);
    const dep = [];
    if (x.k === 'rival') {
      const I = L.challengeInfo(st, x.id);
      dep.push('人物 ' + L.rivalName(st, x.id) + `（天骄榜第 ${L.rivalRank(st, x.id)}）`);
      ok(I && I.main, who, `${xName(st, x)}：不是这一章的对手（下战书拦着）`);
      if (I && I.main) ok(!I.why, who, `${xName(st, x)}：在家也下不了战书：${I && I.why}`);
      // 低境界照样能下战书（不看境界）
      const lo = at(R, ch, { r: 0 }); const I0 = L.challengeInfo(lo, x.id);
      ok(I0 && !I0.why, who, `${xName(st, x)}：炼气期下不了战书：${I0 && I0.why}`);
    }
    if (x.k === 'srank' && st.sect) {
      const nd = L.promoteNeeds(st);
      if (st.sect.rank + 1 <= 3) ok(!nd.some(y => y.k === 'realm'), who, `晋升${L.srankName(st, st.sect.rank + 1)}还看境界`);
      for (const y of nd) ok(['contrib', 'elders', 'heirNone', 'realm'].includes(y.k), who, `晋升条件 ${y.k}（${y.t}）没有对应的做法`);
      ok((st.sect.tasks || []).length > 0, who, '任务板是空的（贡献没处攒）');
      dep.push('宗门任务板', '长老送礼');
    }
    if (x.k === 'rank') { ok(L.nextTour(st) <= 12, who, `下一届论道要 ${L.nextTour(st)} 月`); dep.push('天骄论道（每 12 月）'); }
    if (x.k === 'meet') { ok(st.sect && L.nextMeet(st) <= 36, who, `下一届会武要 ${st.sect ? L.nextMeet(st) : '∞'} 月`); dep.push('九宗会武（每 24 月）', '人物 楚天阔（天剑宗代表）'); }
    if (x.k === 'boss') { ok(L.BOSSES.length >= x.n, who, `首领只有 ${L.BOSSES.length} 个`); dep.push(`首领表 ${L.BOSSES.length} 个`); }
    if (x.k === 'war') {
      // 来犯的日子：进第六章后 L.WAR_LEAD 个月（3.0 校准 42 月 = 14 季，docs/AP_PLAN.md D2 一节），取到季界；多给一季余量
      const lim = (L.WAR_LEAD || 24) + 6;
      const w = at(R, ch); const r = runFor(w, lim, (s, out) => !!out.war || !!s.flags.warWon);
      ok(r.ok, who, `第六章 ${lim} 月内天剑宗没有来犯（${st.sect ? '入宗' : '散修'}）`);
      dep.push('天剑宗来犯' + (r.ok ? `（第 ${r.n} 月来）` : ''));
    }
    if (x.k === 'flag' || x.k === 'beat') {
      const b = L.storyBeat(x.beat); ok(!!b && b.ch === ch, who, `节拍 ${x.beat} 不在第 ${ch + 1} 章`);
      const flags = x.k === 'flag' ? [x.f] : x.flags;
      const s1 = at(R, ch); for (const y of x.pre || []) { if (y.k === 'flag') s1.eflags[y.f] = 1; if (y.k === 'rival') { s1.beaten[y.id] = 1; s1.eflags['beat_' + y.id] = 1; } if (y.k === 'rank') s1.bestRank = y.n; if (y.k === 'asc') { s1.p.r = 9; } }
      const sc = scenesOf(s1, x.beat, flags);
      ok(sc.some(o => o.el && o.free.length), who, `${xName(st, x)}：节拍上没有能放、而且有免费选项置上 ${flags.join('/')} 的场景（${sc.map(o => o.ev.id + (o.el ? '' : '×')).join('、') || '无'}）`);
      dep.push('场景 ' + sc.filter(o => o.el).map(o => o.ev.id).join(' / '));
      if (x.k === 'beat' && (x.pre || []).some(y => y.k === 'asc')) { /* 飞升那场戏由界面的飞升流程放（talk.js），不在过月里 */ }
      else {
        const r = runFor(s1, 80, s => flags.some(f => s.eflags[f]), flags);
        ok(r.ok, who, `${xName(st, x)}：照常过月 80 月没放出来（节拍 ${JSON.stringify(Object.fromEntries(Object.entries(s1.story.beat).filter(([k]) => k.startsWith('c' + (ch + 1)))))}）`);
        if (r.ok) dep.push(`第 ${r.n} 月放`);
      }
    }
    // 目标卡：进度一句话、【去】的键
    let pr = null; try { pr = L.CHAPTERS[ch].prog(st); } catch (err) { ok(false, who, '进度条出错：' + err.message); }
    if (pr) { ok(pr.length > 0 && pr.every(p => p && p.text), who, '进度没有字'); for (const p of pr) { const g = L.mainGoKey(p) || L.mainGo(st, ch); ok(GO_K.has(g), who, `进度“${p.text}”的【去】${g} 不在 GO_K 里`); } }
    lines.push(`    ${x.under ? '└ ' : ''}${xName(st, x)} ← ${H.sys.join('、')}；${H.act}${dep.length ? '；' + dep.join('、') : ''}`);
  }
  const adv = L.mainAdvice(st); ok(adv && adv.t && GO_K.has(adv.go), who, `老祖的下一步没话说或【去】不对（${adv && adv.go}）`);
  // 兜底第 3 级
  const e3 = at(R, ch); e3.mainG.e = 3;
  for (const x of reqList(e3, ch)) {
    if (L.mainReqOk(e3, x, ch)) continue;
    if (x.k === 'rival') { const I = L.challengeInfo(e3, x.id); ok(I && I.p >= 0.6, who, `降到 3 级，对${L.rivalName(e3, x.id)}胜算只有 ${I ? Math.round(I.p * 100) : '?'}%`); }
    else if (x.k === 'rank' || x.k === 'boss') ok(false, who, `降到 3 级，${xName(e3, x)}还在要求`);
    else if (x.k === 'meet') { e3.beaten.chu = 1; ok(L.mainReqOk(e3, x, ch), who, '降到 3 级、击败楚天阔以后会武还在要求'); }
    else if (x.k === 'war') { const foe = { kind: 'war', id: 'tianjian' }, S = L.duelPower(e3, foe) * L.wardMult(e3), Qw = L.warPower(e3); ok(L.duelP(e3, S, Qw, foe) >= 0.6, who, `降到 3 级，来犯胜算只有 ${Math.round(L.duelP(e3, S, Qw, foe) * 100)}%`); }
    else if (x.k === 'srank' && e3.sect) {
      const nd = L.promoteNeeds(e3);
      ok(!nd.some(y => y.k === 'elders' && !y.ok), who, '降到 3 级，长老人脉还卡着晋升');
      const c = nd.find(y => y.k === 'contrib'); if (c) ok(/破格/.test(c.t), who, '降到 3 级，晋升要的贡献没降');
      if (e3.sect.rank + 1 === 3) { const foe = { kind: 'heir', sect: e3.sect.id }; ok(L.duelP(e3, L.duelPower(e3, foe), L.heirPower(e3), foe) >= 0.6, who, '降到 3 级，原圣子胜算不到 60%'); }
    }
  }
}
// 第二章一开就收到入宗帖（三张帖子），无宗试炼不出
for (const R of ROUTES.filter(r => ['zheng', 'wuzong', 'sanxiu'].includes(r.id))) {
  const st = at(R, 1); delete st.evDone.s2_invite; if (st.sect) st.sect = null; delete st.eflags.path_san;
  L.storyState(st).beat = {}; for (const b of L.STORY_BEATS) if (b.ch < 1) st.story.beat[b.id] = -1; st.story.chAt = { 0: 0, 1: st.tick };
  let first = -1;
  const r = runFor(st, 8, (s, out) => { if (first < 0 && (s.evDone.s2_invite || s.storyQ.includes('s2_invite'))) first = 1; return first > 0; });
  if (R.id === 'wuzong') ok(!r.ok, '第二章·' + R.n, '无宗试炼也来了三张帖子');
  else ok(r.ok, '第二章·' + R.n, `第二章开头 8 月里没有三张帖子`);
  if (R.id !== 'wuzong') lines.push(`第二章·${R.n}：三张帖子第 ${r.n} 月就来`);
}
// 三张帖子选了“哪家也不去”以后：随时能【拜山门】（1 点，不看境界，AP_PLAN §5.2）；宗门不再上门来请
{ const st = at(ROUTES[2], 1);
  ok(L.loneRoute(st), '散修', '选了哪家也不去，却不是散修之路');
  ok(!L.knockWhy(st, 'jian'), '散修', '拜不了山门：' + L.knockWhy(st, 'jian'));
  const lo = at(ROUTES[2], 1, { r: 0 }); ok(!L.knockWhy(lo, 'jian'), '散修', '炼气期拜不了山门：' + L.knockWhy(lo, 'jian'));
  ok(L.mainActs(st, { side: true }).some(a => a.do && a.do.id === 'join' && a.ok && a.ap === L.AP.join), '散修', '主线行动（side）里没有【拜山门 ◆1】');
  ok(L.act(st, 'join', 'dan') && st.sect && !L.loneRoute(st) && !st.eflags.path_san, '散修', '拜了山门还算散修'); }
// 每章 × 每条路线：L.mainActs 非空，做不了的说得出差什么，至少一项现在就能做（AP_PLAN §5.1、§8.3 H9）
for (const R of ROUTES) for (let ch = 0; ch < 9; ch++) {
  const st = at(R, ch), who = `${R.n}·第${CN[ch]}章`;
  if (L.chapterNow(st) !== ch) continue;
  const a = L.mainActs(st);
  ok(a.length > 0, who, 'L.mainActs 为空');
  for (const x of a) ok(x.ok || (x.why && x.why.length >= 4), who, `主线行动「${x.t}」做不了却没说差什么（${x.why}）`);
  ok(a.some(x => x.ok), who, '主线行动一项都做不了：' + a.map(x => x.t + '✗' + x.why).join(' / '));
  for (const x of a) if (x.do) ok(L.ACTS[x.do.id] && x.ap === L.apCost(st, x.do.id, x.do.args), who, `「${x.t}」的点数 ${x.ap} 和 L.apCost 对不上`);
  const g = L.goalNow(st); ok(g && g.next && g.next.t && g.next.ap !== undefined && 'do' in g.next, who, '目标卡“下一步”没带 ap / do');
  lines.push(`${who} 主线行动：${a.map(x => `${x.t}${x.ap ? '◆' + x.ap : ''}${x.ok ? '' : '✗' + x.why}`).join(' / ')}`);
}
// 旧档：第三章散修、赵乾没打 → 读档补帖子、赵乾上门
{ const st = at(ROUTES[4], 2); delete st.mainG; delete st.story; delete st.evDone.s2_invite; st.flags.inviteAt = 0; st.path.at[2] = { t: st.tick - 120, pw: 1, exp: 0 };
  const s2 = L.migrate(JSON.parse(JSON.stringify(st)));
  ok(s2.mainG && s2.mainG.rescue, '旧档', '没有救场标记'); ok(!L.knockWhy(s2, 'jian'), '旧档', '读档后拜不了山门');
  ok(L.mainActs(s2).some(a => a.do && a.do.id === 'duel' && a.do.args.id === 'zhao' && a.ok), '旧档', '读档后不能向赵乾下战帖');
  ok(s2.mainG.in <= s2.tick - 120, '旧档', '这一章从哪个月起算没接上 st.path.at');
  const r = runFor(s2, 3, (s, out) => out.mainFoe === 'zhao');
  ok(r.ok, '旧档', '读档后 3 月内赵乾没上门');
  ok(L.mainEase(s2) >= 1 || 120 < L.MAIN_V.inCh, '旧档', '卡了 120 月的旧档读进来没有降要求');
  lines.push(`旧档·散修第三章：读档第 ${r.n} 月赵乾上门，降到第 ${L.mainEase(s2)} 级`);
}
// 用户的另一个旧档：弃徒，打赢了赵乾（当年踢他下山的那一脚），没入宗，停在第三章——目标卡要说清还差首领、想入宗怎么入
{ const st = at(ROUTES[0], 2); st.sect = null; st.beaten.zhao = 1; st.eflags.beat_zhao = 1; st.bosses = { 0: 1 }; delete st.mainG; delete st.story; delete st.evDone.s2_invite; st.flags.inviteAt = 0; st.path.at[2] = { t: st.tick - 90, pw: 1, exp: 0 };
  const s2 = L.migrate(JSON.parse(JSON.stringify(st))), who = '旧档·弃徒败赵乾未入宗';
  ok(L.chapterNow(s2) === 2 && L.loneRoute(s2), who, `读档后第 ${L.chapterNow(s2) + 1} 章、${L.loneRoute(s2) ? '散修' : '入宗'}之路`);
  const pr = L.CHAPTERS[2].prog(s2), txt = pr.map(x => x.text).join(' / ');
  ok(/已击败赵乾/.test(txt) && /首领 1 → \d 个/.test(txt), who, '进度没说清：' + txt);
  ok(/首领/.test(L.goalNow(s2).bar.text), who, '目标卡第一条不是还差的首领：' + L.goalNow(s2).bar.text);
  ok(/首领/.test(L.mainAdvice(s2).t), who, '老祖的下一步没提首领：' + L.mainAdvice(s2).t);
  ok(!L.knockWhy(s2, 'jian') && L.mainActs(s2, { side: true }).some(a => a.do && a.do.id === 'join' && a.ok), who, '想入宗入不了（没有【拜山门】）');
  ok(L.mainActs(s2).some(a => a.ok && a.do && (a.do.id === 'boss' || a.do.id === 'exp')), who, '主线行动里没有【讨伐首领】或指向首领那一格的历练：' + L.mainActs(s2).map(a => a.t).join(' / '));
  lines.push(`${who}：目标卡“${L.goalNow(s2).bar.text}”，进度 ${txt}；老祖：${L.mainAdvice(s2).t}`);
}
if (!Q) console.log(lines.join('\n'));
console.log(`主线可达性检查：${checks} 项`);
if (fails.length) { console.log(`失败 ${fails.length} 条：`); for (const f of fails.slice(0, 80)) console.log('  ✗ ' + f); process.exit(1); }
console.log('主线可达性检查通过');
