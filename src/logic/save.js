/* 废柴仙途 · 逻辑模块 save：存档版本与旧档迁移
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 存档迁移（v2 → v3 → v4 → v5 → v6，DESIGN §9、SYSTEMS §18 第 10 条） ----------
// v2 是 main 分支（旧数值体系）的存档，v3 是功法改三槽之前的，v4 是法宝改三槽之前的，v5 是坊市改货架与竞价之前的，v6 是现在的。读档一律先过 L.migrate：
// 缺的字段补默认值；旧数值体系下的修为按比例折算；走到一半的旧历练按旧规则结算一次（结果放在 s.migratedExp）；
// st.meta 不存在则新建。从 v2 迁来的档 s.flags.fromV2 = 1（界面据此跳过新手引导）。返回 null 表示读不了。
// v3 → v4：单一功法 st.p.a（阶）换成三槽 st.arts —— 旧功法阶 → 该阶的第一门心法，熟练记小成（L.migrateArts）。
// v4 → v5：单一法宝 st.p.w / wn（阶 / 名）换成三槽 st.gear —— 旧法宝阶 → 该阶同名兵器 +0 无词条，已斩首领补发材料与器方（gear.js 的 L.migrateGear）。
// v5 → v6：坊市换成货架 + 行情 + 拍卖竞价、历法与天下大势上线 —— 新建 st.market（货架下次打开时按本届补货）与 st.cal；
//   开着的一口价拍卖会换成竞价（起拍价 = 旧价的 12/20，没有竞拍者，本场还能出手两次）；st.gear.oreBuy（旧的每届三筐）去掉（L.migrateMarket）。
// 灵宠名册（SYSTEMS §4）：没有 st.pets 的档把旧的 st.p.pet 折成名册（pets.js 的 L.migratePets，可重复调用，不升版本）
// 灵田作物与炼丹（SYSTEMS §5、§6.2）：没有 st.crops / st.mats / st.dan / st.toxin 的档补上（田全种灵稻，与旧的被动灵石等价；L.migrateCrops / L.migrateAlch，可重复调用，不升版本）
L.SAVE_V = 6;
L.SAVE_OK = [2, 3, 4, 5, 6];
L.migrateMarket = function (s) {
  const d = L.newMarket(), m = s.market && typeof s.market === 'object' ? s.market : d;
  for (const k in d) if (m[k] === undefined || m[k] === null && k !== 'last') m[k] = d[k];
  if (!Array.isArray(m.rot)) { m.rot = []; m.cyc = -1; }
  m.rot = m.rot.filter(x => x && L.MARKET.some(M => M.k === x.k));
  if (!m.idx || typeof m.idx !== 'object') m.idx = d.idx;
  for (const k of L.SELL_KEYS) if (typeof m.idx[k] !== 'number' || !isFinite(m.idx[k])) m.idx[k] = 1;
  if (!Array.isArray(m.evQ)) m.evQ = [];
  s.market = m;
  const c = s.cal && typeof s.cal === 'object' ? s.cal : L.newCal(), dc = L.newCal();
  for (const k in dc) if (c[k] === undefined) c[k] = dc[k];
  if (c.w && !L.WORLD[c.w.id]) c.w = null;
  s.cal = c;
  // 旧的一口价拍卖会：起拍价 = 旧价 × 12/20，无竞拍者
  const A = s.auction;
  if (A && Array.isArray(A.items) && A.bids === undefined) {
    A.at = A.at === undefined ? A.until - L.AUCTION.len : A.at; A.bids = 0;
    for (const it of A.items) { it.price = Math.floor((it.price || 0) * L.AUCTION.price / 20); it.comp = null; it.res = it.sold ? 'won' : null; delete it.sold; }
  } else if (A && !Array.isArray(A.items)) s.auction = null;
  if (s.gear) delete s.gear.oreBuy;
  for (const x of s.ladder || []) if (x && x.pw !== undefined && !(x.pw > 0)) delete x.pw;
};
L.migrateArts = function (s) {
  const p = s.p, a = s.arts && typeof s.arts === 'object' ? s.arts : L.newArts();
  const d = L.newArts();
  for (const k in d) if (a[k] === undefined || a[k] === null) a[k] = d[k];
  if (!Array.isArray(a.slot) || a.slot.length !== 3) a.slot = [null, null, null];
  for (const id of Object.keys(a.own)) if (!L.art(id) || typeof a.own[id] !== 'number' || !isFinite(a.own[id])) delete a.own[id];
  a.slot = a.slot.map((id, i) => (id && a.own[id] !== undefined && L.artSlotOf(id) === i ? id : null));
  let note = '';
  if (typeof p.a === 'number' && p.a > 0 && !Object.keys(a.own).length) {
    const tier = clamp(Math.floor(p.a), 1, 6);
    const A = L.ARTL.find(x => x.k === 'x' && x.t === tier);
    a.own[A.id] = L.artNeed(A.id, 1);
    a.slot[0] = A.id;
    a.firstBox = 1;
    note = `旧功法${p.an ? '《' + p.an + '》' : ''}（${L.ARTS[tier].n}）折成同阶心法《${A.n}》，熟练记小成`;
  }
  delete p.a; delete p.an;
  s.arts = a;
  s.meta.combo = s.meta.combo || {}; s.meta.chint = s.meta.chint || {};
  return note;
};
L.migrate = function (s) {
  if (!s || typeof s !== 'object' || !s.p || !s.home) return null;
  if (!L.SAVE_OK.includes(s.v)) return null;
  const old = s.v === 2, v3 = s.v < 4, v4 = s.v < 5, v5 = s.v < 6;
  const p = s.p;
  s.flags = s.flags || {}; s.seenTips = s.seenTips || {}; s.beaten = s.beaten || {}; s.lifePills = s.lifePills || {}; s.lives = s.lives || [];
  s.stats = Object.assign(L.newStats(), s.stats || {});
  s.meta = s.meta || L.newMeta(); for (const k in L.newMeta()) s.meta[k] = s.meta[k] || {};
  s.home = Object.assign({ cave: 0, array: 0, field: 0, furnace: 0 }, s.home);
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
  const artNote = L.migrateArts(s);
  const gearNote = L.migrateGear(s);
  L.migrateMarket(s);
  // 天劫（道基、预掷到一半的雷劫）、道心与因果：缺的补默认值，不升存档版本（trib.js / dao.js）
  L.migrateTrib(s); L.migrateDao(s);
  // 宗门加深（人脉、职司、宝库轮换）与徒弟：缺的补默认值，可重复调用（sect2.js、disciples.js）
  if (L.migrateSect2) L.migrateSect2(s);
  const petNote = L.migratePets(s);
  // 灵田作物、药引、丹囊与丹毒（crops.js / alchemy.js，可重复调用，不升版本）
  L.migrateAlch(s); L.migrateCrops(s);
  if (L.migrateRealm) L.migrateRealm(s);   // 秘境：st.run / st.mj / st.meta.mj 缺了补默认（幂等，不升版本）
  if (L.migratePeople) L.migratePeople(s);   // 人物：委托、同伴、双修、送礼图鉴 st.ppl / st.meta.gift（people.js，幂等，不升版本）
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
    s.flags.fromV2 = 1;
    s.v = L.SAVE_V;
    // 走到一半的旧历练：按旧规则结算一次
    if (s.exp && !s.exp.plan) s.migratedExp = L.resolveExp(s);
    L.log(s, '洞天重整：修为、历练与洞府换了新章法，旧日积累已按比例折算', 'gold');
  }
  if (s.sect) { s.sect.tasks = s.sect.tasks || []; s.sect.build = s.sect.build || { ward: 0, lib: 0, vein: 0 }; }
  if (s.exp && !s.exp.plan) s.exp = null;
  if (s.retreat && !(s.retreat.left > 0)) s.retreat = null;
  if (v3 && !old) L.log(s, '功法换了新章法：心法、战技、秘术三槽，练久了有熟练' + (artNote ? '。' + artNote : ''), 'gold');
  if (v4) L.log(s, '法宝换了新章法：兵器、法衣、饰品三槽，能强化、带词条' + (gearNote ? '。' + gearNote : ''), 'gold');
  if (petNote) L.log(s, '灵宠换了新章法：名册、岗位、等级与进化。' + petNote, 'gold');
  if (v5 && !old) L.log(s, '坊市换了新章法：货架六格、行情能卖、拍卖会竞价；四季与天下大势也看得见了', 'gold');
  s.v = L.SAVE_V;
  return s;
};
});
