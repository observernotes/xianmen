/* 废柴仙途 · 逻辑模块 quests：札记：每章主线与小任务
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 札记：每个大境界一章（一个主线目标 + 一串小任务） ----------
// off: 依赖还没做的系统，暂不显示也不结算；c: 完成条件；rw: 奖励 { stones, inc（×当时每月收入）, pills, herbs, treasure, contrib, title, vault }；go: 界面【前往】去哪
const mr = st => st.flags.maxR || 0;
L.mr = mr;
const maxI = st => Math.max(st.flags.maxI || 0, L.si(st.p));
const fullAt = r => st => mr(st) > r || (st.p.r === r && L.isFull(st));
const bestGE = (k, d, v) => st => (st.best[k + '_' + d] || 0) >= v;
const srank = n => st => !!st.sect && st.sect.rank >= n;
const affMax = st => Math.max(0, ...Object.keys(st.npc || {}).map(id => st.npc[id].aff || 0));
L.affFound = st => { let n = 0; for (const key in st.meta.aff) if (L.AFF[Math.floor(key / 3)][key % 3] === 2) n++; return n; };
L.CHAPTERS = [
  { n: '废柴', realm: '炼气',
    main: { t: st => (st.pact < 0 ? '论道上击败{EX}' : '赢下三年之约'), c: st => !!st.beaten.mu, rw: { stones: 800 }, go: 'big' },
    tasks: [
      { t: '外出历练一次', c: st => st.stats.exp >= 1, rw: { stones: 150 }, go: 'exp' },
      { t: '聚灵阵升到 1 级', c: st => st.home.array >= 1, rw: { pills: 1 }, go: 'home' },
      { t: '用【采药】历练一次', c: st => st.stats.herbExp >= 1, rw: { stones: 100 }, go: 'exp' },
      { t: '修到炼气中期', c: st => maxI(st) >= 1, rw: { stones: 60 }, go: 'cult' },
      { t: '闭关一次', c: st => st.stats.retreat >= 1, rw: { stones: 80 }, go: 'home' },
      { t: '开一块灵田', c: st => st.home.field >= 1, rw: { herbs: 5 }, go: 'home' },
      { t: '见一位访客', c: st => st.stats.visits >= 1, rw: { pills: 1 }, go: 'cult' },
      { t: '后山野林腹地评价乙以上', c: bestGE(0, 1, 2), rw: { stones: 200 }, go: 'exp' },
      { t: '打坐 3 次', c: st => (st.stats.sit || 0) + (st.stats.tuna || 0) >= 3, rw: { stones: 60 }, go: 'cult' },
      { t: '修到炼气圆满', c: fullAt(0), rw: { stones: 200 }, go: 'cult' },
      { id: 'c0_plus', t: '强化一次兵器', c: st => (st.stats.plus || 0) >= 1, rw: { stones: 100 }, go: 'gear' },
      { t: '突破筑基', c: st => mr(st) >= 1, rw: { stones: 400 }, go: 'cult' },
    ] },
  { n: '入宗', realm: '筑基',
    main: { t: '晋升内门弟子，并进入天骄榜前 60', c: st => srank(1)(st) && st.bestRank <= 60, rw: { stones: 1500, pills: 2 }, go: 'sect' },
    tasks: [
      { t: '拜入一方宗门', c: st => !!st.sect, rw: { stones: 500 }, go: 'sect' },
      { t: '完成 1 个宗门任务', c: st => st.stats.sectTasks >= 1, rw: { contrib: 30 }, go: 'sect' },
      { t: '黑风岭外围评价乙以上', c: bestGE(1, 0, 2), rw: { stones: 300 }, go: 'exp' },
      { t: '收服一只灵宠', c: st => L.petCount(st) > 0, rw: { stones: 600 }, go: 'market' },
      { t: '炼一炉丹', c: st => st.stats.crafts >= 1, rw: { herbs: 10 }, go: 'home' },
      { id: 'c1_robe', t: '穿上一件法衣', c: st => !!st.gear.r, rw: { stones: 400 }, go: 'gear' },
      { t: '击败独眼狼王', c: st => !!st.bosses[0], rw: { treasure: 1 }, go: 'exp' },
      { t: '论道赢一场', c: st => st.stats.tourWins >= 1, rw: { stones: 400 }, go: 'me' },
      { id: 'c1_plant', t: '改种一块灵田', c: st => (st.stats.plant || 0) >= 1, rw: { herbs: 8 }, go: 'field' },
      { id: 'c1_sold', t: '在坊市行情里卖一次东西', c: st => (st.stats.sold || 0) >= 1, rw: { stones: 150 }, go: 'market' },
      { id: 'c1_realm', t: '闯一次秘境', c: st => (st.stats.mjRuns || 0) >= 1, rw: { stones: 300 }, go: 'realm' },
      { t: '发现 3 个 ◎ 相性', c: st => L.affFound(st) >= 3, rw: { stones: 500 }, go: 'exp' },
      { t: '修到筑基圆满', c: fullAt(1), rw: { stones: 1000 }, go: 'cult' },
    ] },
  { n: '金丹', realm: '金丹',
    main: { t: '晋升真传弟子，并击败赵乾', c: st => srank(2)(st) && !!st.beaten.zhao, rw: { inc: 10, treasure: 1 }, go: 'sect' },
    tasks: [
      { t: '渡过金丹雷劫', c: st => mr(st) >= 2, rw: { stones: 2500 }, go: 'cult' },
      { t: '落日古墓禁地评价乙以上', c: bestGE(2, 2, 2), rw: { inc: 8 }, go: 'exp' },
      { t: '与一人结为知己', c: st => affMax(st) >= 60, rw: { inc: 8 }, go: 'me' },
      { t: '在拍卖会买一件', c: st => st.stats.auction >= 1, rw: { pills: 2 }, go: 'market' },
      { t: '九宗会武赢一场', c: st => st.stats.meetWins >= 1, rw: { inc: 10 }, go: 'sect' },
      { t: '得到一件灵器', c: st => L.gearMaxTier(st) >= 3, rw: { inc: 8 }, go: 'market' },
      { id: 'c2_zhen', t: '换一次阵法', c: st => (st.stats.zhenSet || 0) >= 1, rw: { inc: 4 }, go: 'home' },
      { id: 'c2_recipe', t: '试出一张药引丹方', c: st => (st.stats.recipes || 0) >= 1, rw: { herbs: 15 }, go: 'alch' },
      { id: 'c2_disc', t: '收下第一个徒弟', c: st => (st.stats.discTaken || 0) >= 1, rw: { inc: 6 }, go: 'sect' },
      { t: '击败两个首领', c: st => st.stats.bosses >= 2, rw: { treasure: 1 }, go: 'exp' },
      { t: '修到金丹圆满', c: fullAt(2), rw: { inc: 12 }, go: 'cult' },
    ] },
  { n: '元婴', realm: '元婴',
    main: { t: st => `成为${st.p.look.f ? '圣女' : '圣子'}`, c: srank(3), rw: { inc: 15, vault: 1 }, go: 'sect' },
    tasks: [
      { t: '修成元婴', c: st => mr(st) >= 3, rw: { inc: 10 }, go: 'cult' },
      // DESIGN §7.4：同伴（四心同行，people.js）——带着同伴或道侣历练一趟，结算时累计 st.stats.compExp
      { t: '带同伴历练一次', c: st => st.stats.compExp >= 1, rw: { inc: 8 }, go: 'exp' },
      { t: '炼出上品丹', c: st => st.stats.goodPill >= 1, rw: { herbs: 30 }, go: 'home' },
      { t: '天骄榜进入前 20', c: st => st.bestRank <= 20, rw: { inc: 12 }, go: 'me' },
      { t: '结为道侣，或与一人到四心', c: st => !!st.daolv || affMax(st) >= 80, rw: { inc: 12 }, go: 'me' },
      { id: 'c3_dao', t: '道心任一条到一级', c: st => !!L.DAO_KEYS && L.DAO_KEYS.some(k => L.daoLv(st, k) >= 1), rw: { inc: 6 }, go: 'me' },
      { id: 'c3_evo', t: '让一只灵宠进化', c: st => (st.stats.petEvo || 0) >= 1, rw: { inc: 8 }, go: 'pets' },
      { t: '万妖山脉禁地评价乙以上', c: bestGE(3, 2, 2), rw: { inc: 10 }, go: 'exp' },
      { t: '修到元婴圆满', c: fullAt(3), rw: { inc: 15 }, go: 'cult' },
    ] },
  { n: '化神', realm: '化神',
    main: { t: '击败楚天阔，并在九宗会武压过天剑宗', c: st => !!st.beaten.chu && !!st.flags.beatTianjian, rw: { inc: 20, title: '剑压天剑' }, go: 'me' },
    tasks: [
      { t: '踏入化神', c: st => mr(st) >= 4, rw: { inc: 12 }, go: 'cult' },
      { t: '晋升长老', c: srank(4), rw: { inc: 15 }, go: 'sect' },
      { t: '击败剑冢守墓人', c: st => !!st.bosses[5], rw: { treasure: 2 }, go: 'exp' },
      { id: 'c4_forge', t: '用器方打造一件法宝', c: st => (st.stats.forged || 0) >= 1, rw: { treasure: 1 }, go: 'gear' },
      { id: 'c4_codex', t: '图鉴完成度到 30%', c: st => !!L.codexPct && L.codexPct(st) >= 0.3, rw: { inc: 10 }, go: 'codex' },
      { t: '炼成九转金丹', c: st => st.stats.jiuzhuan >= 1, rw: { inc: 12 }, go: 'home' },
      { t: '宗门榜进入前五', c: st => !!st.sect && st.sect.best <= 5, rw: { inc: 15 }, go: 'sect' },
      { t: '修到化神圆满', c: fullAt(4), rw: { inc: 18 }, go: 'cult' },
    ] },
  { n: '炼虚', realm: '炼虚',
    main: { t: '击退来犯的天剑宗', c: st => !!st.flags.warWon, rw: { inc: 25, title: '山门之盾' }, go: 'sect' },
    tasks: [
      { t: '踏入炼虚', c: st => mr(st) >= 5, rw: { inc: 15 }, go: 'cult' },
      { t: '为宗门夺 2 条灵脉', c: st => !!st.sect && (st.sect.veins || 0) >= 2, rw: { inc: 15 }, go: 'sect' },
      { t: '天骄榜进入前 8', c: st => st.bestRank <= 8, rw: { inc: 18 }, go: 'me' },
      { id: 'c5_chain', t: '走完一条奇遇链', c: st => !!L.CHAIN && Object.keys(L.CHAIN).some(id => L.chainTotal(id) > 0 && L.chainDone(st, id) >= L.chainTotal(id)), rw: { inc: 12 }, go: 'codex' },
      { t: '九幽魔渊禁地评价乙以上', c: bestGE(6, 2, 2), rw: { inc: 15 }, go: 'exp' },
      { t: '与一人到五心', c: st => affMax(st) >= 100, rw: { inc: 18 }, go: 'me' },
      { t: '修到炼虚圆满', c: fullAt(5), rw: { inc: 20 }, go: 'cult' },
    ] },
  { n: '合体', realm: '合体',
    main: { t: '击败血无涯', c: st => !!st.beaten.xue, rw: { inc: 30, title: '魔道克星' }, go: 'me' },
    tasks: [
      { t: '踏入合体', c: st => mr(st) >= 6, rw: { inc: 18 }, go: 'cult' },
      { t: '晋升太上长老', c: srank(5), rw: { inc: 20 }, go: 'sect' },
      { t: '宗门榜进入前三', c: st => !!st.sect && st.sect.best <= 3, rw: { inc: 20 }, go: 'sect' },
      { t: '击败东海蛟皇', c: st => !!st.bosses[7], rw: { treasure: 2 }, go: 'exp' },
      { t: '修到合体圆满', c: fullAt(6), rw: { inc: 25 }, go: 'cult' },
    ] },
  { n: '大乘', realm: '大乘',
    main: { t: '成为宗主，并带宗门登顶', c: st => srank(6)(st) && st.sect.best <= 1, rw: { inc: 40, title: '万宗之主' }, go: 'sect' },
    tasks: [
      { t: '踏入大乘', c: st => mr(st) >= 7, rw: { inc: 20 }, go: 'cult' },
      { t: '宗门建设任一项 3 级', c: st => !!st.sect && L.BUILDS.some(b => ((st.sect.build || {})[b.k] || 0) >= 3), rw: { inc: 20 }, go: 'sect' },
      { t: '天骄榜进入前 2', c: st => st.bestRank <= 2, rw: { inc: 25 }, go: 'me' },
      { t: '击败仙府傀儡王', c: st => !!st.bosses[9], rw: { treasure: 3 }, go: 'exp' },
      { t: '修到大乘圆满', c: fullAt(7), rw: { inc: 30 }, go: 'cult' },
    ] },
  { n: '渡劫', realm: '渡劫',
    main: { t: '登顶天骄榜，击败云无极', c: st => !!st.beaten.yun, rw: { inc: 40, title: '天下第一' }, go: 'me' },   // 主线不看境界（飞升是札记里的一条）
    tasks: [
      { t: '踏入渡劫', c: st => mr(st) >= 8, rw: { inc: 25 }, go: 'cult' },
      { t: '登顶天骄榜', c: st => st.bestRank <= 1, rw: { inc: 40 }, go: 'me' },
      { t: '备好一枚九转金丹', c: st => !!st.flags.sureBt, rw: { inc: 20 }, go: 'home' },
      { t: '听完老祖的诀别', c: st => !!st.eflags.st_farewell, rw: { title: '戒中余音' }, go: 'cult' },
      { t: '修到渡劫圆满', c: fullAt(8), rw: { inc: 30 }, go: 'cult' },
      { id: 'c8_asc', t: '渡过飞升天劫，白日飞升', c: st => st.p.r >= 9, rw: {}, go: 'cult' },
    ] },
];
// 任务 id 按序号（存档里记的就是它）；后来插进去的任务自带 id，不占序号，免得旧档的完成记录错位
L.CHAPTERS.forEach((ch, r) => { ch.main.id = 'c' + r + '_m'; ch.main.main = true; ch.main.ch = r; let j = 0; ch.tasks.forEach(t => { if (!t.id) t.id = 'c' + r + '_' + (j++); t.ch = r; }); });
L.questText = (st, q) => (typeof q.t === 'function' ? q.t(st) : q.t).replace('{EX}', st.exName);
L.rewardText = function (st, rw) {
  const a = [];
  if (!rw) return '';
  if (rw.stones) a.push('灵石+' + L.fmt(rw.stones));
  if (rw.inc) a.push('灵石+' + L.fmt(Math.floor(rw.inc * Math.max(L.income(st), 20))));
  if (rw.pills) a.push('破境丹+' + rw.pills);
  if (rw.herbs) a.push('灵草+' + rw.herbs);
  if (rw.treasure) a.push('天材地宝+' + rw.treasure);
  if (rw.contrib) a.push('贡献+' + rw.contrib);
  if (rw.vault) a.push('宝库任选一件');
  if (rw.title) a.push('称号「' + rw.title + '」');
  return a.join(' ');
};
L.grantReward = grantReward;
function grantReward(st, rw) {
  const text = L.rewardText(st, rw);
  if (!rw) return text;
  if (rw.stones) st.stones += rw.stones;
  if (rw.inc) st.stones += Math.floor(rw.inc * Math.max(L.income(st), 20));
  if (rw.pills) st.pills += rw.pills;
  if (rw.herbs) st.herbs += rw.herbs;
  if (rw.treasure) st.treasure += rw.treasure;
  if (rw.contrib) L.addContrib(st, rw.contrib);
  if (rw.vault && st.sect) st.sect.freePick = (st.sect.freePick || 0) + 1;
  if (rw.title) L.grantTitle(st, rw.title);
  return text;
}
// 完成即领。小任务：只检查已经到过的境界对应的章节。主线：按章序一章一章判（只看主线自己的条件，不看境界）——
// 前一章的主线没做完，后一章的主线条件早满足了也先不算，等前一章做完再接着判，所以章末卡永远按章序一张一张来
L.checkQuests = function (st) {
  if (!st.quest) st.quest = { done: {} };
  st.flags.maxI = maxI(st);
  const top = Math.min(8, Math.max(mr(st), st.p.r));
  let gate = true;
  for (let r = 0; r <= 8; r++) {
    const ch = L.CHAPTERS[r];
    const mainOk = gate && !ch.main.off && (st.quest.done[ch.main.id] || ch.main.c(st));
    for (const q of (r <= top ? ch.tasks : []).concat([ch.main])) {
      if (q.main && !gate) continue;
      if (q.off || st.quest.done[q.id] || !q.c(st)) continue;
      st.quest.done[q.id] = 1;
      const text = grantReward(st, q.rw);
      emit('quest', { id: q.id, t: L.questText(st, q), rw: text, main: !!q.main, ch: r });
      L.log(st, `【${q.main ? '第' + '一二三四五六七八九'[r] + '章·完' : '札记'}】${L.questText(st, q)}${text ? '，' + text : ''}`, 'gold');
    }
    if (!mainOk) gate = false;
  }
};
// 界面用：当前章节、主线、前三条未完成的小任务、以前章节没做完的主线
L.questView = function (st) {
  // 小任务按境界那一章列；主线永远是当前章（第一个没做完的主线，path.js 的 L.chapterNow）的那一条
  const r = Math.min(8, st.p.r), ch = L.CHAPTERS[r], done = (st.quest && st.quest.done) || {};
  const live = ch.tasks.filter(q => !q.off);
  const list = live.filter(q => !done[q.id]).slice(0, 3);
  const old = [];
  const cm = L.CHAPTERS[L.chapterNow ? L.chapterNow(st) : r].main;
  const main = done[cm.id] ? null : cm;
  return { r, ch, main, list, old, first: list[0] || main || old[0] || null, doneN: live.filter(q => done[q.id]).length, total: live.length };
};
});
