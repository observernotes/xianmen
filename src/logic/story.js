/* 废柴仙途 · 逻辑模块 story：剧情流程的守门（docs/STORY.md 第 11 节的流程 / 触发类问题都在这里收口）
 * 模块写法见 src/logic.js 顶部说明。排在 path 之后（读 L.chapterNow），包 L.fireTrigger / L.fill / L.applyFx / L.eligible / L.tribPre / L.tick / L.resolveChoice。
 *
 *   按章触发（通用机制，新剧情直接用）：剧情触发键 K 若在 L.STORY_CH(K) 里有章号 c（realm:N → N；boss:5 → 4；demon:3 → 5.9；trib:1 → 2.1），
 *     就要“触发条件成立 且 当前章 ≥ c”才放：境界先到、章没到时记在 st.path.hold，章到了按 c 的先后一个一个补发（前一个放出的剧情结算完才放下一个）——
 *     realm:N 剧情永远按章顺序、各一次，不因境界超前提前或错过。
 *     心魔劫（雷劫前那一关，L.tribPre）同理：章没到就这一劫先不出心魔，记下来章到了再当剧情放。新加按章走的键：往 CH_KEY 里登记一行。
 *   L.storyR(st)：剧情用的境界 = min(境界, 当前章)；事件的 minR / maxR、chains.js 的“补放剧情步”、这里的补发都看它（身世线、人物线的境界窗口跟着章走）。
 *   补发：realm:N 的剧情里带条件（need）的（story_r6_mo 要墨家遗书走完、tianheng_1 要 st_truth……），条件后来才满足时，只要还没出过就补进剧情队列（P09）。
 *   新秀：四件新秀剧情每位新秀各出一次（触发前清掉上一位留下的 evDone，P05）。
 *   出身：非弃徒出身的事件文本用占位符换词（{cradle} 捡戒的地方、{town} 家门口的城、{shamed} 当年被人看扁的说法、{lowly} 对头骂你的那个词、{exHouse} 对头一家、
 *     {r1open} 筑基那夜的异象、{body} 魔修嘴里的你、{zhaoDebt} 赵乾欠你的那笔），退婚 / 慕容家那几件改成显式的 origin: 'qitu'，不再按正则扫文本（P01 / P06）。
 *   楚天阔的处境：{tkStand} / {tkFoe} / {stele}（问剑天剑宗那夜他站在哪、碑碎没碎，P03）。
 *   没见过的人：事件顺手给的好感，对还没相识的人物不建档（P21）。
 *   人物远行：楚狂下山、苏留在济世堂以后不再顺路来访、不再同行（P13）。
 *   老祖诀别之后：飞升前夜兜底的访客不再是老祖（P08）。
 *   天道试炼提示：击败云无极得的“上面的规矩”（trial_hint）也记进 st.meta.trialHint（P24）。
 * 存档：st.path.hold（path.js 的存档里，没有就当空）；不升版本。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';

// ---------- 剧情键 → 最早在第几章放（0 起）----------
// 小数用来排同一章里的先后：心魔·同路人（陆天衡的自辩）在第七章的 story_r6 之前；第一次雷劫后的渡劫阵图在第三章的 story_r2 之后
const CH_KEY = { 'boss:5': 4, 'demon:3': 5.9, 'trib:1': 2.1 };
L.STORY_CH = key => { const m = /^realm:(\d)$/.exec(key || ''); if (m) return +m[1]; return CH_KEY[key] !== undefined ? CH_KEY[key] : -1; };
L.storyR = st => Math.min(st.p.r, L.chapterNow(st));
const hold = st => { if (!st.path) L.migratePath(st); if (!Array.isArray(st.path.hold)) st.path.hold = []; return st.path.hold; };
const ROOKIE_RE = /^rookie:/;
{ const ft0 = L.fireTrigger; L.fireTrigger = function (st, key) {
  if (!st || !st.p) return ft0(st, key);
  const need = L.STORY_CH(key);
  if (need >= 0 && L.CH_GATE !== false && L.chapterNow(st) < need) { const h = hold(st); if (!h.includes(key)) h.push(key); return; }
  // 新秀：每位新秀各走一遍四件剧情
  if (ROOKIE_RE.test(key)) for (const ev of L.events()) if (ev.where === 'story' && ev.trigger === key && st.evDone[ev.id] && !st.storyQ.includes(ev.id)) delete st.evDone[ev.id];
  return ft0(st, key);
}; }
// 章到了：按章序补发记着的剧情键
let resolving = 0;   // 剧情结算中（L.resolveChoice 里会先判章、后补发同键剧情）：等结算完再放
L.storyRelease = function (st) {
  if (resolving) return 0;
  if (!st || !st.path || !Array.isArray(st.path.hold) || !st.path.hold.length) return 0;
  const ch = L.chapterNow(st), h = st.path.hold;
  const due = h.filter(k => L.STORY_CH(k) <= ch).sort((a, b) => L.STORY_CH(a) - L.STORY_CH(b));
  if (!due.length) return 0;
  // 一次只放一个键，等它放出来的剧情都结算完（队列里没有按章的剧情了）再放下一个：
  // 同一键的后续剧情（story_r6 → tianheng_1）是前一段结算后才补发的，几个键一起放会被后一章的剧情插队
  const pend = st.storyQ.some(id => { const ev = L.eventById(id); return ev && L.STORY_CH(ev.trigger) >= 0; });
  if (pend) return 0;
  const k = due[0];
  st.path.hold = h.filter(x => x !== k);
  L.fireTrigger(st, k);
  return 1;
};
// 条件后来才满足的 realm:N 剧情：补进剧情队列（只补 N ≤ 剧情境界的，按 N 的顺序）
const REALM_RE = /^realm:(\d)$/;
let condCache = null, condN = -1;
const condStories = () => { const evs = L.events(); if (condCache && condN === evs.length) return condCache; condN = evs.length; condCache = evs.filter(ev => ev.where === 'story' && REALM_RE.test(ev.trigger || '') && (ev.need || ev.chain)).sort((a, b) => +REALM_RE.exec(a.trigger)[1] - +REALM_RE.exec(b.trigger)[1]); return condCache; };
L.storyCatchUp = function (st) {
  if (!st || !st.storyQ || !st.p) return 0;
  const r = L.storyR(st); let n = 0;
  for (const ev of condStories()) {
    const N = +REALM_RE.exec(ev.trigger)[1];
    if (N > r || st.evDone[ev.id] || st.storyQ.includes(ev.id)) continue;
    if (L.eligible(st, ev, 'story', { trigger: ev.trigger })) { st.storyQ.push(ev.id); n++; }
  }
  return n;
};
// 事件的境界窗口按“剧情境界”判：境界远超章时，还按章所在的那段境界出事件（身世线不提前、不错过）
const relaxR = new WeakMap();
const noR = ev => { let x = relaxR.get(ev); if (!x) { x = Object.assign({}, ev); delete x.minR; delete x.maxR; relaxR.set(ev, x); } return x; };
{ const el0 = L.eligible; L.eligible = function (st, ev, where, ctx) {
  if (!ev || !st || !st.p || (ev.minR === undefined && ev.maxR === undefined) || L.CH_GATE === false) return el0(st, ev, where, ctx);
  const r = L.storyR(st);
  if (r >= st.p.r) return el0(st, ev, where, ctx);
  if (ev.minR !== undefined && r < ev.minR) return false;
  if (ev.maxR !== undefined && r > ev.maxR) return false;
  return el0(st, noR(ev), where, ctx);
}; }
// 心魔劫：章还没到（例如陆天衡还没露面就要渡合体雷劫）——这一劫不出心魔，记下来，章到了再当剧情放
{ const tp0 = L.tribPre; L.tribPre = function (st) {
  const ev = tp0(st);
  if (!ev || L.CH_GATE === false) return ev;
  const c = L.STORY_CH(ev.trigger);
  if (c >= 0 && L.chapterNow(st) < c) { const h = hold(st); if (!h.includes(ev.trigger)) h.push(ev.trigger); return null; }
  return ev;
}; }
{ const cc0 = L.chainCatchUp; L.chainCatchUp = function (st) { const a = cc0 ? cc0(st) : 0; return a + L.storyCatchUp(st); }; }
{ const ps0 = L.pathStep; L.pathStep = function (st) { const r = ps0.apply(this, arguments); L.storyRelease(st); return r; }; }

// ---------- 出身换词（P01 / P06） ----------
const OW = {
  cradle: { qitu: '破庙', dantong: '炉房', moyi: '井边破屋', shoumu: '守墓屋', sanxiu: '小铺', yushou: '灶房' },
  town: { qitu: '落霞城', dantong: '丹霞谷山下', moyi: '血池边的镇子', shoumu: '剑冢外的镇子', sanxiu: '坊市', yushou: '御兽山下' },
  shamed: { qitu: '被退婚的废柴', dantong: '被倒了丹的烧火童', moyi: '从枯井里爬出来的魔门遗孤', shoumu: '守祖坟的穷小子', sanxiu: '被劈了招牌的散修', yushou: '只剩一只兔子的御兽遗脉' },
  lowly: { qitu: '弃徒', dantong: '烧火童', moyi: '魔门余孽', shoumu: '守墓的', sanxiu: '野散修', yushou: '养兔子的' },
  exHouse: { qitu: '慕容家', dantong: '丹霞谷少主', moyi: '厉枭', shoumu: '黑风寨', sanxiu: '钱家', yushou: '御兽山' },
  zhaoDebt: { qitu: '当年那一脚', dantong: '这些年的账', moyi: '这些年的账', shoumu: '这些年的账', sanxiu: '这些年的账', yushou: '这些年的账' },
};
L.ORIGIN_WORDS = OW;
L.originWord = (st, k) => { const t = OW[k]; return t ? t[(st && st.origin) || 'qitu'] || t.qitu : ''; };
// 心魔劫·一的兜底题目（没有因果时：那个被人看扁的日子）
L.ORIGIN_SHAME = {
  qitu: { who: '天剑宗', title: '被逐出山门那天', text: '你跪在山门外，赵乾踢翻了你的包袱，没有一个人回头' },
  dantong: { who: '丹红袖', title: '那桶泔水', text: '满堂丹师看着你的丹被倒进泔水桶，没有一个人替你说话' },
  moyi: { who: '厉枭', title: '井底那十年', text: '你在枯井里数了十年的星星，井口探进来的第一张脸在笑' },
  shoumu: { who: '雷豹', title: '踩平的坟头', text: '雷豹的人把你家祖坟的草踩平了一片，你攥着锄头没敢抬头' },
  sanxiu: { who: '钱通', title: '劈开的木牌', text: '钱通一刀劈开你的招牌，满街掌柜都关了门' },
  yushou: { who: '驭天风', title: '灶膛里的兔子', text: '白狼从你门前过，兔子钻进了灶膛，你也想钻进去' },
};
const tkStand = st => { const e = st.eflags || {}; return e.tiankuo_ally ? '楚天阔与你并肩而立，守碑的是天剑宗执法长老' : e.tiankuo_sect ? '楚天阔抱剑立在山门外观礼，守碑的是天剑宗执法长老' : '楚天阔横剑而立'; };
const tkFoe = st => { const e = st.eflags || {}; return e.tiankuo_ally || e.tiankuo_sect ? '执法长老' : '楚天阔'; };
{ const fill0 = L.fill; L.fill = function (st, text) {
  let s = fill0(st, text);
  if (s.indexOf('{') < 0 || !st || !st.p) return s;
  return s.replace(/\{(cradle|town|shamed|lowly|exHouse|zhaoDebt|r1open|body|tkStand|tkFoe|stele)\}/g, (m, k) => {
    if (k === 'r1open') return L.awakens(st) ? '五色杂灵根竟融成一团混沌。' : '丹田深处浮起一缕混沌之气，转瞬又沉了下去。';
    if (k === 'body') return L.awakens(st) ? '混沌圣体' : '锈戒的主人';
    if (k === 'tkStand') return tkStand(st);
    if (k === 'tkFoe') return tkFoe(st);
    if (k === 'stele') return st.eflags && st.eflags.st_stele_broken ? '碎碑间' : '祖师碑前';
    return L.originWord(st, k);
  });
}; }
// 退婚 / 慕容家那几件：事件自己写 origin: 'qitu'（samsara.js 的资格字段），不再按正则扫文本
L.originSkip = () => false;
// 魔门遗孤：开局就认识夜（她是当年把你塞进枯井的人），不再出“屋顶来客”那段初遇
{ const ns0 = L.newState; L.newState = function (o) { const st = ns0(o); if (st.origin === 'moyi' && st.eflags) st.eflags.ye_met = 1; return st; }; }
L.migrateStory = function (s) {
  if (!s || !s.p) return s;
  if (s.origin === 'moyi' && s.eflags && L.met(s, 'ye')) s.eflags.ye_met = 1;
  if (s.eflags && s.eflags.trial_hint && s.meta) s.meta.trialHint = 1;
  if (s.path && !Array.isArray(s.path.hold)) s.path.hold = [];
  return s;
};

// ---------- 没见过的人不建档（P21） ----------
{ const af0 = L.applyFx; L.applyFx = function (st, fx, ctx) {
  if (fx && fx.aff && st) {
    const ev = ctx && ctx.ev, drop = Object.keys(fx.aff).filter(id => L.NPCS[id] && !L.met(st, id) && !(ev && ev.npc === id));
    if (drop.length) { fx = Object.assign({}, fx, { aff: Object.assign({}, fx.aff) }); for (const id of drop) delete fx.aff[id]; }
  }
  return af0(st, fx, ctx);
}; }

// ---------- 人物远行（P13）：下山走天下的楚狂、留在济世堂的苏，不再顺路来访、不再同行 ----------
L.npcAway = function (st, id) {
  const e = (st && st.eflags) || {};
  if (id === 'chu') return !!e.chu_gone;
  if (id === 'su') return !st.daolv && !!(e.su_qianyuan || e.su_apart);
  return false;
};
const AWAY_OK = /_(end|left|left2)$/;
{ const el0 = L.eligible; L.eligible = function (st, ev, where, ctx) {
  if (ev && ev.npc && (where === 'home' || where === 'exp') && !AWAY_OK.test(ev.id) && L.npcAway(st, ev.npc)) return false;
  return el0(st, ev, where, ctx);
}; }
if (typeof L.companionOn === 'function') { const f0 = L.companionOn; L.companionOn = (st, id) => !L.npcAway(st, id) && f0(st, id); }

// ---------- 老祖诀别之后（P08）：飞升前夜兜底的访客 ----------
{ const av0 = L.ascendVisitor; L.ascendVisitor = function (st) {
  const v = av0(st);
  if (v.id !== 'elder' || !(st.eflags && st.eflags.st_farewell)) return v;
  if (L.met(st, 'mo')) return { id: 'mo', n: L.npcName(st, 'mo') };
  const d = st.disc && Array.isArray(st.disc.list) && st.disc.list.find(x => x && x.n);
  if (d) return { id: 'disc', n: '徒弟' + d.n };
  return { id: 'none', n: '山下的风' };
}; }
// 心魔劫·一：没有因果时的题目按出身换（P06）
{ const dq0 = L.demonQuestion; L.demonQuestion = function (st, n) {
  const q = dq0(st, n);
  if (n !== 1 || q.karma) return q;
  const S = L.ORIGIN_SHAME[st.origin || 'qitu'] || L.ORIGIN_SHAME.qitu;
  return { who: S.who, text: `【${S.title}】${S.text}` };
}; }

// ---------- 结算之后的几件 ----------
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) {
  let res; resolving++;
  try { res = rc0.apply(this, arguments); } finally { resolving--; }
  if (!resolving) L.storyRelease(st);
  if (res && st.eflags && st.eflags.trial_hint && st.meta && !st.meta.trialHint) st.meta.trialHint = 1;   // P24：云无极的“上面的规矩”也算试炼提示
  return res;
}; }
// ---------- 散修之路的第六章：天剑宗照样来犯，打的是你的洞府（tick.js 的来犯判定只看入了宗的；这里补上没入宗的） ----------
function loneWar(st, out) {
  if (!L.loneRoute(st) || st.flags.warWon || !L.warChapter(st)) return;
  if (!st.flags.warEve) { st.flags.warEve = st.tick; if (!(st.flags.war > st.tick)) st.flags.war = st.tick + 6; L.fireTrigger(st, 'war_eve:tianjian'); return; }
  if (!out.war && st.tick >= (st.flags.war || 0) && !L.busy(st)) { out.war = true; st.flags.war = st.tick + 9999; }
}
// 赵乾的信（P22）：头一回排来犯日子时还没放过他，之后才欠下人情的——来犯前一月再补一次
function zhaoLetter(st) {
  const e = st.eflags || {};
  if (st.flags.warWon || !e.zhao_owes || st.evDone.zhao_3 || !(st.flags.war > st.tick) || st.flags.war - st.tick !== 1) return;
  L.fireTrigger(st, 'war_eve:tianjian');
}
{ const tk0 = L.tick; L.tick = function (st, cont) { const out = tk0(st, cont); loneWar(st, out); zhaoLetter(st); L.storyRelease(st); return out; }; }
// ---------- 天剑宗来犯（P16）：将计就计换了阵眼（war_feint）——这一场来敌撞进真阵；押回天剑宗的赵乾（zhao_guide、没欠你人情）——这一场他带路 ----------
L.addDuelMod('war_feint', 14, (st, foe) => (foe.kind === 'war' && st.eflags && st.eflags.war_feint ? ['将计就计（假阵眼）', 1.3, 'sect'] : null));
L.addDuelMod('zhao_guide', 15, (st, foe) => (foe.kind === 'war' && st.eflags && st.eflags.zhao_guide && !st.eflags.zhao_owes ? ['赵乾带路（摸清了山门）', 0.9, 'rival'] : null));
{ const sw0 = L.sectWar; L.sectWar = function (st) { const r = sw0.apply(this, arguments); if (st.eflags) delete st.eflags.war_feint; return r; }; }
});
