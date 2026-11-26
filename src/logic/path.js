/* 废柴仙途 · 逻辑模块 path：游戏路径（docs/KAIRO_PLAN.md §2）——九章路径表、主画面目标卡、章末结算
 * 模块写法见 src/logic.js 顶部说明。排在 onboard 之后（读 L.ONB、L.onbGoal，包 L.checkQuests、L.resolveExp）。
 *
 *   L.CHAPTERS[i].prog(st) → [{ k, t, v, max, text }]：这一章目标的进度（1～2 条，落后的那条排第一；v / max 是比例）
 *   L.CHAPTERS[i].short / blurb：目标卡第一行（≤ 10 字）与路径页的一句话（≤ 14 字）
 *   L.ONB[j].ch：这一项在第几章开放（路径页“已开 / 还有几样”）
 *   L.chapterNow(st)：当前章 = 第一个主线没做完的章（只由主线推进；境界与章节互不挂钩：境界随便升，主线没做完就停在这一章，主线目标也不看境界）。
 *     按章走的东西：realm:N 主线剧情等“境界到 N 且章到 N”才放（story.js）；事件的境界窗口按 min(境界, 章) 判；解锁卡第一世按章开（onboard.js）；天剑宗来犯按章（第六章）。
 *   散修之路（L.loneRoute：天道试炼“无宗”，或散修丹师不入宗）：要宗门的主线换成不要宗门的版本（L.LONE），目标卡、路径页、札记跟着换字
 *   L.pathView(st) / L.goalNow(st) / L.chapterSummary(st, i)：界面读（接口见 KAIRO_PLAN.md 末尾“接口”）
 *   emit('chapter', { from, to })：当前章变了（L.checkQuests 之后判；界面据此弹章末结算）
 *   存档 st.path = { ch, at: [{ t, pw, exp }], best: [每章最好评价] }；L.migratePath 幂等
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { emit } = L.U;
const CN = '一二三四五六七八九';
const mr = st => Math.max(st.p.r, (st.flags && st.flags.maxR) || 0);
const done = (st, q) => !!(st.quest && st.quest.done && st.quest.done[q.id]);
const pctT = p => Math.round(p * 100) + '%';
const sortProg = a => a.filter(Boolean).sort((x, y) => Math.min(1, x.v / (x.max || 1)) - Math.min(1, y.v / (y.max || 1)));
// 对某位宿敌的胜算（他在榜上的位置、五行、法宝都算；打赢过 / 不在榜上 → null）
function rivalP(st, id) {
  if (st.beaten && st.beaten[id]) return 1;
  const q = L.rivalRank(st, id); if (!q) return null;
  const foe = { kind: 'rival', q, id, streak: 0 };
  try { return L.duelP(st, L.duelPower(st, foe), L.rivalPower(st, q), foe); } catch (e) { return null; }
}
L.rivalP = rivalP;
const duelProg = (st, id, n) => { const p = rivalP(st, id); return { k: id, t: '对' + n + '胜算', v: p === null ? 0 : Math.min(p, 0.8), max: 0.8, text: st.beaten[id] ? `已击败${n}` : p === null ? `${n}还没露面` : `对${n} ${pctT(p)} → 80%` }; };
const contribProg = (st, rank) => {
  if (!st.sect) return { k: 'sect', t: '入宗', v: 0, max: 1, text: '先拜入宗门' };
  const R = L.SRANKS[rank]; if (!R) return null;
  if (st.sect.rank >= rank) return { k: 'contrib', t: '贡献', v: 1, max: 1, text: `已是${L.srankName(st, rank)}` };
  return { k: 'contrib', t: '贡献', v: Math.min(st.sect.total, R.c), max: R.c, text: `贡献 ${L.fmt(st.sect.total)} → ${L.fmt(R.c)}` };
};
const rankProg = (st, lim) => ({ k: 'rank', t: '天骄榜', v: Math.max(0, 100 - Math.max(st.bestRank, lim)), max: 100 - lim, text: st.bestRank <= lim ? `天骄榜 第 ${st.rank}` : `天骄榜 第 ${st.rank} → 前 ${lim}` });
const sectPosProg = (st, lim, n) => { const pos = L.sectPos(st) || 9, best = st.sect ? st.sect.best || pos : 9; return { k: 'spos', t: '宗门名次', v: Math.max(0, 9 - Math.max(best, lim)), max: 9 - lim, text: best <= lim ? `宗门 第 ${pos}` : `宗门 第 ${pos} → ${n}` }; };
const PROG = [
  st => {
    if (st.pact < 0 && !st.beaten.mu) return [duelProg(st, 'mu', st.exName)];
    if (st.pact) return [{ k: 'pact', t: '胜算', v: 0.8, max: 0.8, text: '三年之约 已胜' }];
    const p = L.pactInfo(st).p;
    return [{ k: 'pact', t: '胜算', v: Math.min(p, 0.8), max: 0.8, text: `胜算 ${pctT(p)} → 目标 80%` }];
  },
  st => sortProg([contribProg(st, 1), rankProg(st, 60)]),
  st => sortProg([contribProg(st, 2), duelProg(st, 'zhao', '赵乾')]),
  st => sortProg([contribProg(st, 3)]),
  st => sortProg([duelProg(st, 'chu', '楚天阔'), st.flags.beatTianjian ? { k: 'meet', t: '会武', v: 1, max: 1, text: '会武压过天剑宗' } : sectPosProg(st, 1, '压过天剑宗')]),
  st => {
    if (st.flags.warWon) return [{ k: 'war', t: '守山', v: 1, max: 1, text: '已击退天剑宗' }];
    const foe = { kind: 'war', id: 'tianjian' }; let S = 0, Q = 1;
    try { S = L.duelPower(st, foe) * L.wardMult(st); Q = L.warPower(st); } catch (e) { /* 没入宗 */ }
    return [{ k: 'war', t: '守山', v: Math.min(S, Q), max: Q, text: `战力 ${L.fmt(S)} → 来犯 ${L.fmt(Q)}` }];
  },
  st => [duelProg(st, 'xue', '血无涯')],
  st => sortProg([contribProg(st, 6), st.sect ? sectPosProg(st, 1, '第 1') : null]),
  st => [duelProg(st, 'yun', '云无极')],
];
const SHORT = [st => (st.pact < 0 && !st.beaten.mu ? '论道击败' + st.exName : '赢下三年之约'), '入内门·进前 60', '升真传·败赵乾', st => (st.p.look.f ? '成为圣女' : '成为圣子'), '败楚天阔·压天剑', '击退天剑宗', '击败血无涯', '成宗主·带宗登顶', '登顶·败云无极'];
const BLURB = ['三年后，当众打回去', '拜入宗门，站上天骄榜', '结成金丹，压过赵乾', '宗门里争一个圣位', '九宗会武，剑压天剑', '守住山门', '魔道当头，一战了断', '执掌一宗，万宗之首', '天下第一，再问天门'];
// ---------- 散修之路：不能入宗（天道试炼“无宗”），或散修丹师这一世没入宗 ----------
// 要宗门的主线（二、三、四、五、八章）换成不要宗门的：天骄榜名次 / 宿敌 + 击败过的首领数（最小可行版，剧情串联留给后续）；第六章“击退天剑宗”照旧（来犯的是你的洞府，tick.js / story.js）
L.loneRoute = st => !!st && !st.sect && ((L.trialOn && L.trialOn(st, 'wuzong')) || st.origin === 'sanxiu');
// 首领只数“击败过几个不同的”（不点名哪一张图：玩家回头打、跳着打都算）
const bossN = st => Object.keys(st.bosses || {}).filter(k => st.bosses[k]).length;
const bossProg = (st, n) => { const v = bossN(st); return { k: 'boss', t: '首领', v: Math.min(v, n), max: n, text: v >= n ? `已击败首领 ${v} 个` : `击败首领 ${v} → ${n} 个` }; };
L.LONE = [
  null,
  { t: '以散修之身进入天骄榜前 60，并击败 2 个首领', short: '散修·进前 60', blurb: '不入宗门，也站上天骄榜', c: st => st.bestRank <= 60 && bossN(st) >= 2, prog: st => sortProg([rankProg(st, 60), bossProg(st, 2)]), go: 'rivals' },
  { t: '击败赵乾，并击败 3 个首领', short: '败赵乾·斩首领', blurb: '一人一剑，压过赵乾', c: st => !!st.beaten.zhao && bossN(st) >= 3, prog: st => sortProg([duelProg(st, 'zhao', '赵乾'), bossProg(st, 3)]), go: 'me' },
  { t: '天骄榜进入前 20，并击败 4 个首领', short: '进前 20·斩首领', blurb: '一人一剑，闯进前二十', c: st => st.bestRank <= 20 && bossN(st) >= 4, prog: st => sortProg([rankProg(st, 20), bossProg(st, 4)]), go: 'rivals' },
  { t: '击败楚天阔，并击败 5 个首领', short: '败楚天阔·斩首领', blurb: '不靠宗门，剑压天剑', c: st => !!st.beaten.chu && bossN(st) >= 5, prog: st => sortProg([duelProg(st, 'chu', '楚天阔'), bossProg(st, 5)]), go: 'me' },
  null,
  null,
  { t: '登上天骄榜前 3，并击败 7 个首领', short: '进前 3·斩首领', blurb: '无门无派，天下前三', c: st => st.bestRank <= 3 && bossN(st) >= 7, prog: st => sortProg([rankProg(st, 3), bossProg(st, 7)]), go: 'rivals' },
  null,
];
L.CHAPTERS.forEach((ch, i) => {
  ch.prog = PROG[i]; ch.blurb = BLURB[i]; ch.shortF = SHORT[i];
  const X = L.LONE[i]; if (!X) return;
  const m = ch.main, c0 = m.c, t0 = m.t, go0 = m.go, p0 = ch.prog;
  m.c = st => (L.loneRoute(st) ? X.c(st) : c0(st));
  m.t = st => (L.loneRoute(st) ? X.t : typeof t0 === 'function' ? t0(st) : t0);
  m.goOf = st => (L.loneRoute(st) ? X.go : go0);
  ch.prog = st => (L.loneRoute(st) ? X.prog(st) : p0(st));
});
const blurbOf = (st, i) => { const X = L.LONE[i]; if (X && L.loneRoute(st)) return X.blurb; if (i === 6 && st.sect && st.sect.id === 'xuesha') return '同门相争，魔道之首'; return L.CHAPTERS[i].blurb; };
L.chapterBlurb = blurbOf;
L.chapterGoal = (st, i) => { const X = L.LONE[i]; if (X && L.loneRoute(st)) return X.short; const s = L.CHAPTERS[i].shortF; return typeof s === 'function' ? s(st) : s; };
L.mainGo = (st, i) => { const m = L.CHAPTERS[i].main; return m.goOf ? m.goOf(st) : m.go; };

// 各项在第几章开放（KAIRO_PLAN §2.1 的“这一章开放”一列；顺序仍是 L.ONB 的）
const ONB_CH = {
  exp: 0, home: 0, herb: 0, retreat: 0, bt: 0, arts: 0, zhanji: 0, plus: 0, gearCmp: 0, wish: 0, infuse: 0, boss: 0,   // COMBAT_LOOT §7.4：这几样提到第一章
  tour: 1, market: 1, sect: 1, visitor: 1, tuna: 1, field: 1, treasure: 1, trib: 1,
  furnace: 2, trib2: 2, pets: 2, cal: 2, sell: 2, world: 2, shelf: 2, crops: 2, robe: 2,
  realm: 3, yin: 3, bond: 3, plots: 3, vault: 3, zhen: 3, dao: 3, mishu: 3, auction: 3, codex: 3,
  petJobs: 4, chainExp: 4, duty: 4, disc: 4, comp: 4, orn: 4, forge: 4,
};
for (const e of L.ONB) e.ch = ONB_CH[e.k] !== undefined ? ONB_CH[e.k] : 4;

// ---------- 当前章：只由主线推进 ----------
L.chapterNow = function (st) {
  if (!st || !st.p) return 0;
  for (let i = 0; i < 8; i++) if (!done(st, L.CHAPTERS[i].main)) return i;
  return 8;
};
// 主线进度里落后的那一条，【去】跳到哪（目标卡 / 路径页用）
const PROG_GO = { pact: 'big', sect: 'sect', contrib: 'sect', rank: 'rivals', spos: 'sect', meet: 'sect', war: 'prep', boss: 'exp', trib: 'cult' };
L.lockGo = (st, pr, ch) => (pr && (PROG_GO[pr.k] || (L.RIVAL_EL && L.RIVAL_EL[pr.k] ? 'rivals' : ''))) || L.mainGo(st, ch);
const snap = st => ({ t: st.tick, pw: Math.round(L.power(st)), exp: (st.stats && st.stats.exp) || 0 });
L.newPath = st => ({ ch: 0, at: [st ? snap(st) : { t: 0, pw: 0, exp: 0 }], best: [] });
L.migratePath = function (st) {
  if (!st || !st.p) return st;
  if (!st.path || typeof st.path !== 'object') {
    const ch = L.chapterNow(st);
    st.path = { ch, at: [], best: [] };
    st.path.at[ch] = snap(st);
  }
  if (!Array.isArray(st.path.at)) st.path.at = [];
  if (!Array.isArray(st.path.best)) st.path.best = [];
  if (typeof st.path.ch !== 'number') st.path.ch = L.chapterNow(st);
  // 旧档：以前境界会把章往前推（约战前先筑基、第二章没入宗就因结丹进了第三章……）——退回第一个主线没做完的那章；
  // 补完主线时照常弹章末卡（st.path.ch 退回去了，L.pathStep 才会再报 'chapter'）
  if (st.path.ch > L.chapterNow(st)) st.path.ch = L.chapterNow(st);
  return st;
};
{ const ns0 = L.newState; L.newState = function () { const st = ns0.apply(this, arguments); st.path = L.newPath(st); return st; }; }
// 章变了：记快照，emit('chapter')
L.pathStep = function (st) {
  if (!st || !st.p) return null;
  if (!st.path) L.migratePath(st);
  const now = L.chapterNow(st), was = st.path.ch;
  if (now <= was) return null;
  st.path.ch = now;
  const s = snap(st);
  for (let i = was + 1; i <= now; i++) if (!st.path.at[i]) st.path.at[i] = s;
  const ev = { from: was, to: now };
  emit('chapter', ev);
  return ev;
};
{ const cq0 = L.checkQuests; L.checkQuests = function (st) { const r = cq0.apply(this, arguments); L.pathStep(st); return r; }; }
// 每章最好的历练评价（章末结算用）
{ const re0 = L.resolveExp; L.resolveExp = function (st) {
  const r = re0.apply(this, arguments);
  if (r && st.path && typeof r.rating === 'number') { const c = st.path.ch || 0; st.path.best[c] = Math.max(st.path.best[c] === undefined ? -1 : st.path.best[c], r.rating); }
  return r;
}; }

// ---------- 路径页 ----------
L.pathView = function (st) {
  const now = L.chapterNow(st), o = st.onb || { at: {} }, reborn = (st.rebirth || 0) > 0;
  return L.CHAPTERS.map((ch, i) => {
    const d = done(st, ch.main);
    const state = d ? 'done' : i === now ? 'now' : i < now ? 'miss' : i === now + 1 ? 'next' : 'lock';   // 'miss' 只剩旧接口兼容（章只由主线推进，不会再出现）
    const keys = L.ONB.filter(e => e.ch === i);
    const opened = keys.filter(e => reborn || L.ONB_ON === false || o.at[e.k] !== undefined).map(e => e.k);
    let prog = [];
    if (state === 'now' || state === 'miss') { try { prog = ch.prog(st); } catch (e) { prog = []; } }
    return { i, n: ch.n, chN: '第' + CN[i] + '章', realm: ch.realm, state, goal: L.chapterGoal(st, i), main: L.questText(st, ch.main), blurb: blurbOf(st, i), prog, opened, toOpen: keys.length - opened.length };
  });
};

// ---------- 目标卡：本章目标 + 进度 + 下一步（KAIRO_PLAN §2.2；“下一步”从 §10 起取 L.advise 的第一张牌） ----------
// next.go：界面跳转键；next.hl：给 hlOnly 的选择器（拿不准就 null，界面按 go 自己找）
const ONB_GO = { exp: 'exp', home: 'home', herb: 'exp', retreat: 'home', bt: 'bt', market: 'market', sect: 'sect', visitor: 'inbox', field: 'field', gearCmp: 'gear',
  furnace: 'furnace', arts: 'arts', trib: 'trib', pets: 'pets', plus: 'gear', zhanji: 'arts', realm: 'realm', bond: 'people', plots: 'home', zhen: 'zhen', disc: 'disc', cal: 'cal', dao: 'path', codex: 'path' };
const cut = (s, n) => (s.length > n ? s.slice(0, n) : s);
let gCache = { key: '', v: null };
L.goalNow = function (st) {
  if (!st || !st.p) return null;
  const ch = L.chapterNow(st), C = L.CHAPTERS[ch];
  let prog = []; try { prog = C.prog(st); } catch (e) { prog = []; }
  const bar = prog[0] ? { v: prog[0].v, max: prog[0].max, text: prog[0].text, k: prog[0].k } : { v: 0, max: 1, text: '' };
  const g = { ch, chN: '第' + CN[ch] + '章', t: L.chapterGoal(st, ch), bar, prog, next: L.goalNext(st) };
  return g;
};
L.goalNext = function (st) {
  const key = (L.adviseKey ? L.adviseKey(st) : st.tick + '|' + Math.floor(st.stones)) + '|' + (L.isFull(st) ? 'F' : '') + Object.keys(st.onb ? st.onb.m : {}).length + '|' + Object.keys((st.quest && st.quest.done) || {}).length + '|' + (st.clk && st.clk.prepSeen);
  if (gCache.key === key && gCache.st === st) return gCache.v;
  const v = goalNext0(st);
  gCache = { key, st, v };
  return v;
};
function goalNext0(st) {
  const p = st.p;
  if (p.r > L.MAXR) return { t: '已飞升', go: 'path', hl: null, why: 'idle' };
  if (st.run) return { t: '秘境中', go: 'realm', hl: null, why: 'away' };
  if (st.exp) return { t: `历练中 · 还有 ${st.exp.left} 月`, go: 'exp', hl: null, why: 'away' };
  if (st.retreat) return { t: `${L.retName(st.retreat)}中 · 还有 ${st.retreat.left} 月`, go: 'home', hl: null, why: 'away' };
  // 大节点前 1 月：备战（自动停）
  const big = L.bigNext ? L.bigNext(st) : null;
  if (big && big.left <= 1 && !(st.clk && st.clk.prepSeen === st.tick)) return { t: '备战：' + big.n, go: 'prep', hl: null, why: 'prep', big };
  // 其余都取变强建议（docs/KAIRO_PLAN.md §10.5）：目标卡、老祖头像、变强页同一张表；必须先做的（突破、疗伤、新法宝）压过新系统上手
  const A = L.advise ? L.advise(st, 'goal') : null, a0 = A && A.acts[0];
  if (a0 && a0.must) return advNext(a0);
  // 主线眼下就能做的一步（投帖、晋升、胜算过半的下战书；mainline.js）
  const ms = L.mainStep ? L.mainStep(st) : null;
  if (ms && ms.must) return { t: cut(ms.t, 12), go: ms.go, hl: ms.hl, why: 'main', k: ms.id, foe: ms.foe };
  // 刚开、还没学会的系统
  const og = L.onbGoal(st);
  if (og) return { t: cut(og.goal, 12), go: ONB_GO[og.k] || 'path', hl: null, why: 'onb', k: og.k };
  if (p.inj > 0 && (!a0 || a0.id === 'idle')) return { t: `养伤 · 还有 ${p.inj} 月`, go: 'home', hl: null, why: 'idle' };
  if (a0) return advNext(a0);
  if (p.inj > 0) return { t: `养伤 · 还有 ${p.inj} 月`, go: 'home', hl: null, why: 'idle' };
  return { t: '去历练', go: 'exp', hl: '[data-nav="exp"]', why: 'exp' };
}
const advNext = a => ({ t: a.say, go: a.go, hl: a.hl || null, why: 'adv', act: a, k: a.id });

// ---------- 章末结算 ----------
L.chapterSummary = function (st, i) {
  if (!st.path) L.migratePath(st);
  const C = L.CHAPTERS[i]; if (!C) return null;
  const a = st.path.at[i] || st.path.at.slice(0, i + 1).filter(Boolean).pop() || { t: 0, pw: 0, exp: 0 };
  let b = null; for (let j = i + 1; j < st.path.at.length; j++) if (st.path.at[j]) { b = st.path.at[j]; break; }
  b = b || snap(st);
  const best = st.path.best[i] === undefined ? -1 : st.path.best[i];
  const N = L.CHAPTERS[i + 1];
  const keys = N ? L.ONB.filter(e => e.ch === i + 1) : [];
  const o = st.onb || { at: {} };
  return { i, n: C.n, chN: '第' + CN[i] + '章', realm: C.realm, done: done(st, C.main), months: b.t - a.t, pw0: a.pw, pw1: b.pw, exp: b.exp - a.exp, best, bestT: best >= 0 ? L.RATINGS[best] : '',
    rw: L.rewardText(st, C.main.rw),
    next: N ? { i: i + 1, n: N.n, chN: '第' + CN[i + 1] + '章', goal: L.chapterGoal(st, i + 1), blurb: blurbOf(st, i + 1), toOpen: keys.filter(e => (st.rebirth || 0) === 0 && o.at[e.k] === undefined).length, rw: L.rewardText(st, N.main.rw) } : null };
};
// 三年之约一了结（赢或输）就判一次章：第一章到此结束，章末卡紧跟在约战之后，不等下一个月
{ const pd0 = L.pactDuel; if (pd0) L.pactDuel = function (st) { const r = pd0.apply(this, arguments); if (st && st.pact) L.checkQuests(st); return r; }; }
});
