/* 废柴仙途 · 逻辑模块 save：存档版本与旧档迁移
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 存档迁移（v2 → v3） ----------
// 缺的字段补默认值；旧数值体系下的修为按比例折算；走到一半的旧历练按旧规则结算一次；st.meta 不存在则新建
L.SAVE_V = 3;
L.migrate = function (s) {
  if (!s || !s.p || !s.home) return null;
  if (s.v !== 2 && s.v !== 3) return null;
  const old = s.v === 2;
  const p = s.p;
  s.flags = s.flags || {}; s.seenTips = s.seenTips || {}; s.beaten = s.beaten || {}; s.lifePills = s.lifePills || {}; s.lives = s.lives || [];
  s.stats = Object.assign(L.newStats(), s.stats || {});
  s.meta = s.meta || L.newMeta(); s.meta.aff = s.meta.aff || {}; s.meta.perk = s.meta.perk || {}; s.meta.seen = s.meta.seen || {};
  s.quest = s.quest || { done: {} }; s.quest.done = s.quest.done || {};
  s.best = s.best || {}; s.regionWins = s.regionWins || {}; s.bosses = s.bosses || {};
  s.npc = s.npc || {}; s.eflags = s.eflags || {}; s.evDone = s.evDone || {}; s.evLast = s.evLast || {}; s.storyQ = s.storyQ || []; s.buffs = s.buffs || [];
  s.bonus = s.bonus || { cul: 0, atk: 0 }; s.ach = s.ach || {}; s.titles = s.titles || []; s.achQ = s.achQ || []; s.log = s.log || [];
  for (const k of ['herbs', 'herbProg', 'treasure', 'lifeBonus', 'tuna', 'boxMiss', 'pills', 'stones', 'rebirth', 'tick', 'year']) if (typeof s[k] !== 'number' || !isFinite(s[k])) s[k] = 0;
  if (s.retreat === undefined) s.retreat = null;
  if (s.visitor === undefined) s.visitor = null;
  if (s.auction === undefined) s.auction = null;
  if (s.lastExp === undefined) s.lastExp = null;
  s.origin = s.origin || 'qitu';
  if (typeof p.over !== 'number') p.over = 0;
  if (typeof p.inj !== 'number') p.inj = 0;
  if (typeof p.fails !== 'number') p.fails = 0;
  p.tr = p.tr || [];
  if (old) {
    const st = s;
    // 修为：旧需求 300 × 1.55^i（更早的档还要 ×10），按进度比例折成新数值
    const i = Math.min(L.si(p), 35);
    const oldNeed = 300 * Math.pow(1.55, i) / (s.xs ? 1 : 10);
    if (p.r <= L.MAXR) p.xp = Math.min(1, Math.max(0, p.xp / oldNeed)) * L.need(i);
    delete s.xs; delete s.pillProg; delete s.tunaLeft; delete s.goal;
    // 洞府等级上限变了
    for (const b of L.HOME) s.home[b.k] = clamp(Math.floor(s.home[b.k] || 0), 0, b.max);
    s.flags.maxR = Math.max(s.flags.maxR || 0, Math.min(p.r, 9));
    s.flags.maxI = Math.max(s.flags.maxI || 0, Math.min(L.si(p), 35));
    if (p.r >= 1) { s.flags.guardUsed = 1; s.flags.retFree = 1; }
    // 灵根：旧版筑基一步到位觉醒成满档，新版分四次
    if (s.flags.awoke) {
      let stage = 0, t = 1;
      L.AWAKE.forEach((a, j) => { if (p.r >= a.r) { stage = j + 1; t = a.t; } });
      s.flags.awoke = stage; p.t = Math.min(p.t, Math.max(t, 1));
    }
    p.t = clamp(p.t | 0, 0, 6);
    // 历练进度：打赢过的图视为外围评价乙；打赢三次以上的，腹地、禁地也算（首领照旧可打）
    for (const k in s.regionWins) if (s.regionWins[k] > 0) { s.best[k + '_0'] = 2; if (s.regionWins[k] >= 3) { s.best[k + '_1'] = 2; s.best[k + '_2'] = 2; } }
    // 以前的章节直接记为已完成（不补发奖励）；当前章节照常结算
    for (let r = 0; r < Math.min(p.r, 9); r++) { const ch = L.CHAPTERS[r]; for (const q of ch.tasks.concat([ch.main])) if (q.c(st)) s.quest.done[q.id] = 1; }
    if (s.sect) { s.sect.tasks = s.sect.tasks || []; s.sect.build = s.sect.build || { ward: 0, lib: 0, vein: 0 }; s.sect.freePick = s.sect.freePick || 0; L.sectOf(s); }
    // 时间线：新版一个周天流逝的年数变了，别让人一读档就坐化
    if (p.r <= L.MAXR && p.age > L.lifespan(s) * 0.85) p.age = L.lifespan(s) * 0.85;
    if (s.pact && s.rank > 72 && s.beaten.mu) { /* 名次照旧 */ }
    s.v = 3;
    // 走到一半的旧历练：按旧规则结算一次
    if (s.exp && !s.exp.plan) s.migratedExp = L.resolveExp(s);
    L.log(s, '洞天重整：修为、历练与洞府换了新章法，旧日积累已按比例折算', 'gold');
  }
  if (s.sect) { s.sect.tasks = s.sect.tasks || []; s.sect.build = s.sect.build || { ward: 0, lib: 0, vein: 0 }; }
  if (s.exp && !s.exp.plan) s.exp = null;
  s.v = 3;
  return s;
};
});
