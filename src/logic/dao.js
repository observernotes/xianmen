/* 废柴仙途 · 逻辑模块 dao：道心与因果（SYSTEMS §14）
 * 模块写法见 src/logic.js 顶部说明。
 *
 * 道心：奇遇选项的 dao: 'k' | 'w' | 'r'（狂 / 稳 / 仁）各记一笔，到 5 / 12 / 25 笔各得一级效果（L.DAO）。
 *   狂：越级奖励 ×1.2（L.leapMult）/ 对决胜算下限 3% → 8%（L.addDuelPMod）/ 丁等“以伤换命”再战一次（expedition.js 的 L.expRefight）
 *   稳：突破 +3%（L.addBtMod）/ 闭关花费 −15%（L.retCost）/ 天劫临场提示十成准（trib.js 的 L.tribHintAcc）
 *   仁：来访好感 +1（fx.aff）/ 徒弟成长 +20%（L.daoDiscMult，徒弟系统读）/ 人物五心只要好感 90（L.hearts）
 * 因果：杀、夺、负人的选项 fx.karma: '因果id' 记一条（带当事人，L.KARMA），会回来——仇家上门（src/content/ev_karma.js，事件字段 karma: n
 *   = 有一条 n 月前结下、还没了的因果）、心魔劫的题目（trib.js 的 L.demonQuestion）、轮回时的“业”（L.karmaRebirth）。
 *   fx.unkarma: 'any' 了结最早的一条（心魔劫里就是题目那一条），也可以写具体的因果 id。
 * 事件文本占位符 {kwho} / {kwhat}：最早那条没了的因果的当事人 / 当时做了什么（寻仇事件用）。
 * 资格字段 daoMin: { k|w|r: n }（事件级与选项级）：该道心至少 n 笔。
 * 章末与飞升结局的评语按三条里最高的一条写（L.daoChapter / L.daoEnding）。
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { clamp, emit } = L.U;

// ---------- 道心 ----------
L.DAO = {
  k: { n: '狂', fx: ['越级奖励 ×2 → ×2.4', '对决胜算下限 3% → 8%', '丁等不直接负伤：“以伤换命”再战一次'] },
  w: { n: '稳', fx: ['突破成功率 +3%', '闭关花费 −15%', '天劫临场提示十成准'] },
  r: { n: '仁', fx: ['来访好感多 +1', '徒弟成长 +20%', '人物五心只要好感 90'] },
};
L.DAO_KEYS = ['k', 'w', 'r'];
L.DAO_TH = [5, 12, 25];
L.DAO_V = { leap: 1.2, lo: 0.08, bt: 0.03, ret: 0.85, aff: 1, disc: 1.2, heart5: 90, refightInj: 1 };
const D = st => {
  const d = st.dao && typeof st.dao === 'object' ? st.dao : (st.dao = { k: 0, w: 0, r: 0 });
  for (const k of L.DAO_KEYS) if (typeof d[k] !== 'number' || !isFinite(d[k])) d[k] = 0;
  return d;
};
L.daoN = (st, k) => D(st)[k];
L.daoLv = (st, k) => { const n = L.daoN(st, k); let lv = 0; for (const t of L.DAO_TH) if (n >= t) lv++; return lv; };
L.daoNext = (st, k) => L.DAO_TH.find(t => t > L.daoN(st, k)) || 0;
// 三条里最高的一条（并列取先记满的那条：狂 → 稳 → 仁的顺序；一笔都没有 → null）
L.daoTop = st => { const d = D(st); let best = null; for (const k of L.DAO_KEYS) if (d[k] > 0 && (!best || d[k] > d[best])) best = k; return best; };
L.addDao = function (st, k, n) {
  if (!L.DAO_KEYS.includes(k)) return 0;
  const d = D(st), lv0 = L.daoLv(st, k);
  d[k] += n || 1;
  const lv = L.daoLv(st, k);
  if (lv > lv0) {
    L.log(st, `道心·${L.DAO[k].n}到了${'一二三'[lv - 1]}级：${L.DAO[k].fx[lv - 1]}`, 'gold');
    emit('dao', { k, lv, n: d[k] });
  }
  return lv - lv0;
};
L.supportChoice('dao', { apply: (st, v) => { L.addDao(st, v, 1); } });

// 狂一级：越级奖励 ×1.2（灵石、贡献的越级倍率 ×2 → ×2.4）
{ const leap0 = L.leapMult; L.leapMult = st => leap0(st) * (L.daoLv(st, 'k') >= 1 ? L.DAO_V.leap : 1); }
// 狂二级：对决胜算下限 3% → 8%
L.addDuelPMod('dao_k', 30, st => (L.daoLv(st, 'k') >= 2 ? { lo: L.DAO_V.lo, n: '道心·狂' } : null));
// 狂三级：丁等时“以伤换命”再战一次——按预掷的随机数重掷一次运气分；翻到丙以上就算数（换一月轻伤），还是丁就照丁等结算
L.expRefight = function (st, pl, score) {
  if (L.daoLv(st, 'k') < 3) return null;
  const u = pl.u || [], v = ((u[0] || 0) * 613 + (u[5] || 0) * 97) % 1;   // 从已掷的数派生，不多耗随机数
  const s2 = score - pl.rnd + (-12 + 24 * v);
  return L.ratingOf(s2);
};
// 稳一级：突破成功率 +3%
L.addBtMod('dao_w', 96, st => (L.daoLv(st, 'w') >= 1 ? ['道心·稳', L.DAO_V.bt] : null));
// 稳二级：闭关花费 −15%
{ const ret0 = L.retCost; L.retCost = st => (L.daoLv(st, 'w') >= 2 ? Math.floor(ret0(st) * L.DAO_V.ret) : ret0(st)); }
// 仁一级：来访的人给好感时多 +1（访客事件 visit: true）
L.supportFx('aff', { apply: function (st, v, out, fx, ctx) {
  if (L.daoLv(st, 'r') < 1 || !ctx || !ctx.ev || !ctx.ev.visit || !v) return;
  for (const id in v) if (v[id] > 0 && L.NPCS[id]) { const d = L.addAff(st, id, L.DAO_V.aff); if (d) out.push(`仁·好感 ${L.npcName(st, id)} 再 +${d}`); }
} });
// 仁二级：徒弟成长 +20%（徒弟系统上线时乘上它）
L.daoDiscMult = st => (L.daoLv(st, 'r') >= 2 ? L.DAO_V.disc : 1);
// 仁三级：人物五心只要好感 90
L.heartMax = st => (L.daoLv(st, 'r') >= 3 ? L.DAO_V.heart5 : 100);
{ const h0 = L.hearts; L.hearts = (st, id) => (L.aff(st, id) >= L.heartMax(st) ? 5 : h0(st, id)); }

// 资格字段 daoMin: { k|w|r: n }（事件级、选项级）
const daoOk = (st, v) => Object.keys(v).every(k => L.daoN(st, k) >= v[k]);
const daoMinOk = v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => L.DAO_KEYS.includes(k) && v[k] > 0);
L.supportElig('daoMin', { ok: daoMinOk, test: (st, v) => daoOk(st, v) });
L.supportChoice('daoMin');
{ const shown0 = L.choiceShown; L.choiceShown = (st, c) => shown0(st, c) && !(c.daoMin && !daoOk(st, c.daoMin)); }

// ---------- 因果 ----------
// 每条因果的当事人与“你做了什么”（事件 fx.karma 的 id；没登记的按事件的人物 / 标题兜底）
L.KARMA = {
  altar: { who: '祭坛的主人', n: '取走了祭坛上的遗物' },
  sword_slave: { who: '剑冢里的剑奴', n: '夺了剑奴的佩剑' },
  zhao_bounty: { who: '赵乾', n: '把赵乾押去天剑宗领赏' },
  xue_head: { who: '斜眼师兄', n: '收下了斜眼师兄的人头' },
  xue_bait: { who: '血池边的正道弟子', n: '看着他被血无涯钓走' },
  tianheng: { who: '陆天衡', n: '一剑了断了陆天衡' },
  frame: { who: '隔壁那位师兄', n: '把禁书塞进了他的枕下' },
  traitor: { who: '私通外宗的老长老', n: '约他去后山“看云”' },
  jiubao: { who: '城南的老酒保', n: '替血河老祖提了他的头' },
  qiulao: { who: '血牢里的十二个人', n: '把他们交给鬼医试药' },
  ye_pill: { who: '坊市血案的死者', n: '给了那两颗赤炎果，不问用途' },
  kuangmai: { who: '争矿的两拨人', n: '趁乱掏空了矿脉' },
  mojie: { who: '魔修手下的苦主', n: '做了魔修的生意' },
  tongji: { who: '被冤枉的通缉犯', n: '拿他领了赏' },
  map_theft: { who: '杂货铺的胖老板', n: '夜里偷了他的羊皮' },
  dinghai: { who: '东海沿岸的渔民', n: '硬拔定海针，掀了潮' },
};
L.KARMA_REB = 0.02;   // 轮回时每条没了的因果 −2% 道果（SYSTEMS §16）
L.newKarma = () => ({ list: [], done: 0 });
const K = st => {
  const k = st.karma && typeof st.karma === 'object' ? st.karma : (st.karma = L.newKarma());
  if (!Array.isArray(k.list)) k.list = [];
  if (!(k.done >= 0)) k.done = 0;
  return k;
};
L.karmaState = K;
L.migrateDao = function (s) {
  D(s); const k = K(s);
  k.list = k.list.filter(x => x && typeof x.id === 'string');
  for (const x of k.list) { if (typeof x.who !== 'string') x.who = '无名之人'; if (typeof x.tick !== 'number') x.tick = 0; x.done = x.done ? 1 : 0; }
};
L.karmaOpen = st => K(st).list.filter(x => !x.done);
// 当前这一笔是哪个选项给的（L.resolveChoice 包一层记下来，fx.karma 结算时读）
let curChoice = null;
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) { const prev = curChoice; curChoice = { ev, ch: ev && ev.choices[idx] }; try { return rc0(st, ev, idx); } finally { curChoice = prev; } }; }
L.addKarma = function (st, id, ev, ch) {
  const info = L.KARMA[id] || {};
  const npc = ev && (L.NPCS[ev.npc] ? ev.npc : L.NPCS[ev.speaker] ? ev.speaker : null);
  const rec = { id, who: info.who || (npc ? L.npcName(st, npc) : ev ? L.fill(st, ev.title) : '无名之人'), n: info.n || (ch ? '选了“' + L.fill(st, ch.t) + '”' : ''),
    title: ev ? L.fill(st, ev.title) : '', t: ch ? L.fill(st, ch.t) : '', ev: ev ? ev.id : '', tick: st.tick, r: st.p.r, done: 0 };
  K(st).list.push(rec);
  L.log(st, `记下一笔因果：${rec.who}（${rec.n}）`, 'red');
  emit('karma', rec);
  return rec;
};
// v = 'any'（最早的一条）或具体的因果 id
L.unkarma = function (st, v, how) {
  const open = L.karmaOpen(st);
  const rec = v === 'any' || v === true ? open[0] : open.find(x => x.id === v) || null;
  if (!rec) return null;
  rec.done = 1; rec.doneAt = st.tick; rec.how = how || '';
  K(st).done++;
  L.log(st, `了结一笔因果：${rec.who}`, 'jade');
  emit('unkarma', rec);
  return rec;
};
L.supportFx('karma', { ok: v => typeof v === 'string' && v.length > 0, apply: (st, v, out, fx, ctx) => {
  const c = curChoice && (!ctx || !ctx.ev || curChoice.ev === ctx.ev) ? curChoice : null;
  const rec = L.addKarma(st, v, (ctx && ctx.ev) || (c && c.ev), c && c.ch);
  out.push(`因果 +1：${rec.who}`);
} });
L.supportFx('unkarma', { ok: v => typeof v === 'string' && v.length > 0, apply: (st, v, out) => {
  const rec = L.unkarma(st, v, curChoice && curChoice.ev ? curChoice.ev.id : '');
  out.push(rec ? `了结因果：${rec.who}` : '心里那笔账，本就是空的');
} });
// 事件字段 karma: n —— 有一条 n 月前结下、还没了的因果（寻仇要过些日子才找得上门）
L.supportElig('karma', { ok: v => v > 0, test: (st, v) => { const o = L.karmaOpen(st)[0]; return !!o && st.tick - o.tick >= v; } });
// 占位符 {kwho} / {kwhat}：最早那条没了的因果
{ const fill0 = L.fill; L.fill = function (st, text) {
  let s = fill0(st, text);
  if (s.indexOf('{k') >= 0) { const o = L.karmaOpen(st)[0]; s = s.replace(/\{kwho\}/g, o ? o.who : '旧人').replace(/\{kwhat\}/g, o ? o.n : '旧事'); }
  return s;
}; }

// ---------- 轮回与结局 ----------
// 轮回殿接入时读：未了的因果每条 −2% 道果；“狂”路线有称号补偿；道基总和 ×10、了结的因果 ×15（SYSTEMS §16）
L.karmaRebirth = function (st) {
  const n = L.karmaOpen(st).length, done = K(st).done;
  return { n, done, mult: Math.max(0, 1 - L.KARMA_REB * n), title: L.daoTop(st) === 'k' && n > 0 ? '业火加身' : null };
};
L.daoFruitParts = function (st) {
  const kr = L.karmaRebirth(st), dj = L.daoji ? L.daoji(st) : 0;
  return [['道基总和', Math.round(dj * 100) * 10], ['了结的因果', kr.done * 15], ['未了的因果', -L.KARMA_REB * kr.n, 'mult']];
};
{ const ls0 = L.lifeSummary; L.lifeSummary = function (st) {
  const o = ls0(st), kr = L.karmaRebirth(st);
  return Object.assign(o, { dao: Object.assign({}, D(st)), daoTop: L.daoTop(st), karma: kr.n, karmaDone: kr.done, karmaTitle: kr.title, daoji: L.daoji ? L.daoji(st) : 0, dan: (st.trib && st.trib.dan) || '' });
}; }
const daoTag = st => { const d = D(st); return `狂 ${d.k} · 稳 ${d.w} · 仁 ${d.r}`; };
const CH_LINE = {
  k: '这一章多半是打出来的：谁拦路，谁就成了你剑下的名字。',
  w: '这一章走得稳：该等的等了，该退的退了，一步没踩空。',
  r: '这一章你护了不少人，自己也没少挨刀。',
};
L.daoChapter = (st, ch) => `第${'一二三四五六七八九'[ch] || ''}章完。${CH_LINE[L.daoTop(st)] || '这一章还看不出你是个什么样的人。'}（${daoTag(st)}）`;
const END_LINE = {
  k: '你是一路打上天的。挡路的天骄、宗门、雷劫，一个个都成了你剑下的名字；天门开时，你没有回头。',
  w: '你是一步一步修上去的。没抢过谁的机缘，也没让谁替你挨过雷；天门开时，你连衣角都没乱。',
  r: '你护过的人，比你打过的人多。飞升那天，山下点起了一路的灯，一直点到当年那座破庙。',
};
L.daoEnding = st => (END_LINE[L.daoTop(st)] || '九九天劫散尽，仙门大开。当年被逐出山门、被当众退婚的废柴，踏云而去，位列仙班。') + `（${daoTag(st)}）`;
});
