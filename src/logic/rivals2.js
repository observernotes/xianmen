/* 废柴仙途 · 逻辑模块 rivals2：宿敌与新秀（docs/SYSTEMS.md §13，docs/CONTENT.md §10、§14.2）
 * 模块写法见 src/logic.js 顶部说明。宿敌的资料（五行、看家战技、法宝）与天骄榜曲线、永久系数上限在 rivals.js。
 *   恩怨 st.grudge = { mu, zhao, chu, xue, yun }（−100～100）：赢他 +20、羞辱 +20、放他一马 / 帮他 −30（事件 fx.grudge）。
 *     ≥ 60：历练途中伏击（ev_rivals2.js 的 rv_ambush_*）、拍卖会上抬价（L.rivalBid，market.js 读）、宗门战事带头（L.rivalLeads，sect.js 读）；
 *     ≤ −40：化敌为友（楚天阔同行 L.rivalAllyOn、慕容和解 mu_3 / mu_5、赵乾倒戈：置 zhao_owes → 天剑宗来犯前报信 zhao_3）。
 *   宿敌的奇遇：每届论道之间（t%12 = 6）每位没打赢过的宿敌 12% 得一次 ×1.05，与拍卖合计每人上限 ×1.3（L.rivalBoost），进天骄榜快讯。
 *   新秀（化神起）：每 36 月天骄榜上冒出一位（L.ROOKIE），从你下方 20 名起每届论道 +8 名追你；追到 5 名内上门下战书（new_2），
 *     追到身后强制一战（out.rookie → 界面 runRookie）：【指点】他成友善路人、之后送礼（指点后 24 月 new_4）；【打压】赢了得他法宝上的一条词条，
 *     他的恩怨（60）进池子 st.rv2.pool（rv_ambush_rk 伏击、L.rivalLeads 带头）；输了他挤到你前面一名。
 *   st.rv2 = { rk 正在追你的新秀 | null, rkN 出过几位, rkNext 下一位最早的月, pool 结了仇的新秀 [{ id, n, s, el, g, gear }], friends 指点过的 [{ n, s, el, at }],
 *              g60 / gLo 第一次 ≥60 / ≤−40 的月, refP 上届论道时你的战力（新秀战力的参照）, trouble 指点后闯祸的月, ambush 伏击次数, qy 宿敌奇遇次数, gifts 新秀送礼次数 }
 *   st.meta.rival = { mu: { art, gear } … }：图鉴（跨世保留），见 rivals.js 的 L.rivalKnow / L.rivalKnown。
 *   L.RIVALS2_ON = false（tools/sim.js 的 norivals2）：恩怨不驱动任何东西、没有新秀、宿敌不得奇遇、法宝不克你、guided 论道前不按克制换战技。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
L.RIVALS2_ON = true;
const ON = () => L.RIVALS2_ON !== false;
const RV_IDS = ['mu', 'zhao', 'chu', 'xue', 'yun'];
const RV_NINE = { mu: '', zhao: 'tianjian', chu: 'tianjian', xue: 'xuesha', yun: 'kunlun' };

// ---------- 存档 ----------
const newGrudge = () => ({ mu: 0, zhao: 0, chu: 0, xue: 0, yun: 0 });
L.newRv2 = () => ({ rk: null, rkN: 0, rkNext: null, pool: [], friends: [], g60: {}, gLo: {}, refP: 0, trouble: null, ambush: 0, qy: 0, gifts: 0, crush: 0, teach: 0, lost: 0 });
const rv = st => st.rv2 || (st.rv2 = L.newRv2());
const newState0 = L.newState;
L.newState = function (o) { const st = newState0(o); st.grudge = newGrudge(); st.rv2 = L.newRv2(); st.meta.rival = st.meta.rival || {}; return st; };
const newMeta0 = L.newMeta;
L.newMeta = () => Object.assign(newMeta0(), { rival: {} });
// 迁移（可重复调用，不升存档版本）：没有恩怨 / 新秀的档补默认；秘境先收着的恩怨（0～100）照用；已交手、已击败的宿敌补记图鉴；拍卖加成超过 ×1.3 的压回上限
L.migrateRivals = function (s) {
  const g = s.grudge && typeof s.grudge === 'object' ? s.grudge : {};
  for (const id of RV_IDS) g[id] = typeof g[id] === 'number' && isFinite(g[id]) ? clamp(Math.round(g[id]), -100, 100) : 0;
  s.grudge = g;
  const d = L.newRv2(), r = s.rv2 && typeof s.rv2 === 'object' ? s.rv2 : {};
  for (const k in d) if (r[k] === undefined) r[k] = d[k];
  for (const k of ['pool', 'friends']) if (!Array.isArray(r[k])) r[k] = [];
  for (const k of ['g60', 'gLo']) if (!r[k] || typeof r[k] !== 'object') r[k] = {};
  r.pool = r.pool.filter(x => x && typeof x.n === 'string').map(x => Object.assign(x, { g: clamp(Math.round(x.g) || 0, -100, 100) }));
  if (r.rk && !(r.rk.id && (s.ladder || []).some(x => x && x.rk === r.rk.id))) r.rk = null;   // 榜上找不着他：这一位作罢
  for (const x of s.ladder || []) if (x && x.rk && !(r.rk && x.rk === r.rk.id)) delete x.rk;
  s.rv2 = r;
  s.meta = s.meta || {};
  const m = s.meta.rival = s.meta.rival && typeof s.meta.rival === 'object' ? s.meta.rival : {};
  for (const id of RV_IDS) {
    if (s.beaten && s.beaten[id]) { m[id] = Object.assign(m[id] || {}, { art: 1, gear: 1 }); }
    else if (s.meta.elem && s.meta.elem['rv_' + id]) (m[id] = m[id] || {}).art = 1;
  }
  for (const x of s.ladder || []) if (x && x.pw > L.RIVAL_PW_CAP) x.pw = L.RIVAL_PW_CAP;
};

// ---------- 恩怨 ----------
L.GRUDGE = { win: 20, insult: 20, spare: -30, hi: 60, lo: -40, min: -100, max: 100 };
const poolGet = (st, id) => rv(st).pool.find(x => x.id === id) || null;
const poolTop = st => rv(st).pool.filter(x => x.g >= L.GRUDGE.hi).sort((a, b) => b.g - a.g)[0] || null;
L.grudge = (st, id) => (RV_IDS.includes(id) ? (st.grudge && st.grudge[id]) || 0 : (poolGet(st, id) || { g: 0 }).g);
const gName = (st, id) => (RV_IDS.includes(id) ? L.rivalName(st, id) : (poolGet(st, id) || { n: '那少年' }).n);
// 加减恩怨，返回实际变化。跨过 60 / −40 时记一笔（老祖讲解、传讯条），≤ −40 时宿敌各有化敌为友的路（赵乾：置 zhao_owes）
L.addGrudge = function (st, id, d) {
  d = Math.round(d || 0);
  if (!d) return 0;
  const r = rv(st);
  if (!RV_IDS.includes(id)) { const x = poolGet(st, id); if (!x) return 0; const g0 = x.g; x.g = clamp(g0 + d, L.GRUDGE.min, L.GRUDGE.max); return x.g - g0; }
  st.grudge = st.grudge || newGrudge();
  const g0 = st.grudge[id] || 0, g1 = clamp(g0 + d, L.GRUDGE.min, L.GRUDGE.max);
  st.grudge[id] = g1;
  const n = L.rivalName(st, id);
  if (g1 >= L.GRUDGE.hi && g0 < L.GRUDGE.hi) {
    if (r.g60[id] === undefined) r.g60[id] = st.tick;
    L.log(st, `与${n}的恩怨到了 ${g1}：他会在历练途中伏击你、拍卖会上抬价、宗门战事里带头`, 'red');
    emit('grudge', { id, g: g1, hi: true });
  }
  if (g1 <= L.GRUDGE.lo && g0 > L.GRUDGE.lo) {
    if (r.gLo[id] === undefined) r.gLo[id] = st.tick;
    if (id === 'zhao') st.eflags.zhao_owes = 1;   // 赵乾倒戈：天剑宗来犯前会有一封没署名的信（zhao_3）
    L.log(st, `与${n}的恩怨降到 ${g1}：${{ mu: '旧怨渐消，或许能说上几句真话了', zhao: '他欠你的，他自己记着', chu: '他看你的眼神不一样了，或许能同行一程', xue: '魔道圣子居然也会念人情', yun: '他第一次睁眼看你' }[id]}`, 'jade');
    emit('grudge', { id, g: g1, lo: true });
  }
  return g1 - g0;
};
// 恩怨的阶段（界面、老祖用）
L.grudgeStage = g => (g >= L.GRUDGE.hi ? 'hate' : g <= L.GRUDGE.lo ? 'friend' : 'none');
// 事件写法：fx.grudge = { 宿敌id | 'rk'（池子里恩怨最深的那位新秀）: ±n }；elig.grudge = [宿敌id, 最小, 最大]；elig.rkGrudge = n（池子里有恩怨 ≥ n 的新秀）
L.supportFx('grudge', { ok: v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => (RV_IDS.includes(k) || k === 'rk') && Number.isInteger(v[k])), apply: (st, v, out) => {
  for (const k in v) {
    const id = k === 'rk' ? (poolTop(st) || {}).id : k;
    if (!id) continue;
    const dd = L.addGrudge(st, id, v[k]);
    if (dd || v[k]) out.push(`与${gName(st, id)}的恩怨 ${v[k] > 0 ? '+' : '−'}${Math.abs(v[k])}（${L.grudge(st, id)}）`);
  }
} });
L.supportElig('grudge', { ok: v => Array.isArray(v) && v.length === 3 && RV_IDS.includes(v[0]) && Number.isInteger(v[1]) && Number.isInteger(v[2]), test: (st, v) => { if (!ON()) return false; const g = L.grudge(st, v[0]); return g >= v[1] && g <= v[2]; } });
L.supportElig('rkGrudge', { ok: v => Number.isInteger(v) && v > 0, test: (st, v) => ON() && !!poolTop(st) && poolTop(st).g >= v });
// 文本占位符 {rk}：池子里恩怨最深的那位新秀（没有就是正在追你的那位）
const fill0 = L.fill;
L.fill = function (st, text) { const s = fill0(st, text); return s.indexOf('{rk}') < 0 ? s : s.replace(/\{rk\}/g, (poolTop(st) || rv(st).rk || { n: '那少年' }).n); };

// ---------- 事件里的对决：choice.foe = 宿敌id | 'rookie'（五行克制、他的法宝都算上；对手战力仍是你的 × duel，新秀用他的真战力） ----------
L.supportChoice('foe');
const rkFoe = rk => ({ kind: 'rookie', id: rk.id, el: rk.el, gear: rk.gear && L.AFFIX[rk.gear.aff] && L.AFFIX[rk.gear.aff].el ? { n: rk.gear.n, ke: L.AFFIX[rk.gear.aff].el } : null });
L.choiceFoe = function (st, ev, ch) {
  if (!ch || !ch.foe || !ON()) return null;
  if (ch.foe === 'rookie') { const rk = rv(st).rk; if (!rk) return null; return { foe: rkFoe(rk), Q: L.rookiePower(st) * (ch.duel || 1), n: rk.n, rk }; }
  if (RV_IDS.includes(ch.foe)) return { foe: { kind: 'rival', id: ch.foe }, Q: L.power(st) * (ch.duel || 1), n: L.rivalName(st, ch.foe), id: ch.foe };
  return null;
};
// 伏击次数（sim 与界面统计）；事件置的“看清属性”标记当场生效：rookie_seen（new_1 去看他一眼）、yun_elem（yun_1 掀了棋盘）
const resolve0 = L.resolveChoice;
L.resolveChoice = function (st, ev) {
  const r = resolve0.apply(this, arguments);
  if (r && ev && /^rv_ambush/.test(ev.id)) rv(st).ambush++;
  const f = st.eflags || {};
  if (f.rookie_seen) { delete f.rookie_seen; L.rookieReveal(st); }
  if (f.yun_elem) { delete f.yun_elem; st.meta.elem = st.meta.elem || {}; st.meta.elem.rv_yun = 1; }
  return r;
};
// 新秀的五行：看过他（new_1）或交过手才知道；宿敌照 arts.js（st.meta.elem）
const foeElKnown0 = L.foeElKnown;
L.foeElKnown = (st, foe) => (foe && foe.kind === 'rookie' ? !!(rv(st).rk && rv(st).rk.known) : foeElKnown0(st, foe));

// ---------- 宿敌的法宝：克你的攻击属性时他对决战力 ×1.1（你这一方 ÷1.1）。克他的那一系永远不被克，所以换成克他的战技始终划算 ----------
L.rivalGearHit = function (st, foe) {
  if (!ON() || !foe) return null;
  const g = foe.kind === 'rival' && foe.id && L.RIVAL_INFO[foe.id] ? L.RIVAL_INFO[foe.id].gear : foe.kind === 'rookie' ? foe.gear : null;
  if (!g || !g.ke) return null;
  return L.atkEl(st, L.foeEl(foe)) === g.ke ? g : null;
};
L.addDuelMod('rival_gear', 12, (st, foe) => { const g = L.rivalGearHit(st, foe); return g ? [`对手法宝·${g.n}（克${L.ELEM[g.ke]}）`, 1 / L.RIVAL_GEAR_M, 'rival'] : null; });
// 赵乾的信（zhao_3 置 raid_intel）：下一场天剑宗来犯战力 ×1.3，打完就用掉
L.addDuelMod('raid_intel', 13, (st, foe) => (foe.kind === 'war' && st.eflags && st.eflags.raid_intel ? ['赵乾的信（阵眼）', 1.3, 'rival'] : null));
const sectWar0 = L.sectWar;
if (sectWar0) L.sectWar = function (st) { const r = sectWar0.apply(this, arguments); if (st.eflags) delete st.eflags.raid_intel; return r; };
// 化敌为友：楚天阔同行（tiankuo_3 / tiankuo_5 置 tiankuo_ally）：斩妖分数 +6。同伴系统（SYSTEMS §12）上线后可改由它提供
L.rivalAllyOn = (st, id) => ON() && id === 'chu' && !!(st.eflags && st.eflags.tiankuo_ally);
L.addExpMod('rival_ally', 82, (st, k, d, a) => (L.rivalAllyOn(st, 'chu') && a === 0 ? ['同行·楚天阔（斩妖）', 6, 'rival'] : null));

// ---------- 恩怨 ≥ 60 的出口 ----------
// 拍卖抬价（market.js 读）：恩怨 ≥ 60 的宿敌一定来竞拍；他在场时你的出价 ×1.2、拿下概率再 −10%。和解了的慕容不来
L.RIVAL_BID = { m: 1.2, cut: 0.10 };
L.rivalBid = function (st, comp) {
  if (!ON() || !comp || comp.kind !== 'rival' || !RV_IDS.includes(comp.id)) return null;
  if (comp.id === 'mu' && st.eflags && (st.eflags.mu_clear || st.eflags.mu_friend)) return null;
  const g = L.grudge(st, comp.id);
  return g >= L.GRUDGE.hi ? { m: L.RIVAL_BID.m, cut: L.RIVAL_BID.cut, g } : null;
};
// 宗门战事带头（sect.js 读）：恩怨 ≥ 60 的宿敌与池子里的新秀，按恩怨从深到浅；m = 对手战力倍率 1.1～1.2；nine = 他所在的九宗 id（天剑宗来犯看 tianjian）
L.rivalLeads = function (st) {
  if (!ON()) return [];
  const out = [], m = g => Math.round((1.1 + 0.1 * clamp((g - L.GRUDGE.hi) / 40, 0, 1)) * 100) / 100;
  for (const id of RV_IDS) { const g = L.grudge(st, id); if (g >= L.GRUDGE.hi) out.push({ id, n: L.rivalName(st, id), sect: (L.RIVALS.find(x => x.id === id) || {}).sect, nine: RV_NINE[id], g, el: L.RIVAL_EL[id], m: m(g) }); }
  for (const x of rv(st).pool) if (x.g >= L.GRUDGE.hi) out.push({ id: x.id, n: x.n, sect: x.s, nine: '', g: x.g, el: x.el, m: m(x.g), rookie: true });
  return out.sort((a, b) => b.g - a.g);
};

// ---------- 论道前：本届第一场会碰上的宿敌（与 L.tournament 的“宿敌优先”同一规则，不掷骰） ----------
L.tourFoe = function (st) {
  if (!st.pact) return null;
  const S = L.power(st), lim = Math.max(1, st.rank - L.TOUR_STEP);
  let q = 0;
  if (st.rank === 1) q = 2;
  else {
    if (st.pact < 0 && !st.beaten.mu) { const mq = L.rivalRank(st, 'mu'); if (mq && mq < st.rank) q = mq; }
    if (!q) for (let x = st.rank - 1; x >= lim; x--) { const r = L.rivalAt(st, x); if (r && r.id && !st.beaten[r.id] && L.rivalPower(st, x) < S * 1.6) { q = x; break; } }
    if (!q && L.rivalBlock && L.rivalBlock(st, lim) === st.rank - 1 && !L.rivalRefuses(st, st.rank - 1)) q = st.rank - 1;   // 卡位宿敌就在身前（rivals.js）；差太远他不上台
  }
  const r = q ? L.rivalAt(st, q) : null;
  if (!r || !r.id) return null;
  return { q, rv: r, id: r.id, foe: { kind: 'rival', q, id: r.id, streak: 0 }, Q: L.rivalPower(st, q) };
};
// 换哪门战技胜算最高（试遍已有的战技，含五行克制、宿敌法宝、战技本身的倍率）。scale：对决战力再乘的（约战的老祖借力）
L.duelArtBest = function (st, foe, Q, scale) {
  if (!L.artSlotOpen(st, 1) || !st.arts) return null;
  scale = scale || (S => S);
  const sl = L.artSlots(st), cur = sl[1];
  const pOf = () => L.duelP(st, scale(L.duelPower(st, foe)), Q, foe);
  const p0 = pOf();
  let best = { id: cur, p: p0 };
  for (const id of Object.keys(st.arts.own)) { const A = L.art(id); if (!A || A.k !== 'z' || id === cur) continue; const p = L.artTry(st, id, pOf); if (p > best.p + 1e-9) best = { id, p }; }
  const fe = L.foeEl(foe), me0 = L.atkEl(st, fe, sl), me = L.atkEl(st, fe, [sl[0], best.id, sl[2]]);
  return { id: best.id, cur, p0, p1: best.p, same: best.id === cur, fe, me0, me, ke: L.elKe(me, fe), ke0: L.elKe(fe, me0), gear0: L.rivalGearHit(st, foe) };
};
// 论道前换上：guided（tools/sim.js）与 longrun 用；界面是准备页的【换上】
L.tourSwap = function (st) {
  if (!ON()) return null;
  const tf = L.tourFoe(st); if (!tf) return null;
  const b = L.duelArtBest(st, tf.foe, tf.Q);
  if (!b || b.same || b.p1 - b.p0 < 0.005) return null;
  return L.equipArt(st, b.id) ? Object.assign(b, { tf }) : null;
};

// ---------- 宿敌的奇遇：永久系数（与拍卖合计每人 ×1.3），进天骄榜快讯 ----------
L.RIVAL_QY = { at: 6, p: 0.12, m: 1.05, lines: {
  mu: ['闭关三月，剑意又进一层', '得了慕容家压箱底的一卷剑谱', '在落霞城外独斩一头三阶妖王'],
  zhao: ['从天剑宗藏剑阁借出一柄古剑', '下山历练，连挑七座山寨', '被长老亲自点拨了一夜'],
  chu: ['在葬剑渊坐了九天，悟出一式新剑', '一剑劈开东海一道浪墙', '拜访剑冢守墓人，空手而回却笑了'],
  xue: ['血洗一座小宗门，修为暴涨', '在血池底下泡了七七四十九天', '夺了一件魔道重宝'],
  yun: ['在昆仑之巅独坐一年，下山时雪停了', '和自己下了一盘三年的棋', '一指点碎一颗流星'],
} };
function rivalQy(st) {
  if (st.tick % 12 !== L.RIVAL_QY.at || !st.pact) return;
  for (const x of st.ladder) {
    if (!x.id || st.beaten[x.id] || (x.pw || 1) >= L.RIVAL_PW_CAP - 1e-9) continue;
    if (R() < L.RIVAL_QY.p && L.rivalBoost(st, x, L.RIVAL_QY.m, pick(L.RIVAL_QY.lines[x.id] || ['得了一场奇遇'])) > 1) rv(st).qy++;
  }
}

// ---------- 新秀（化神起） ----------
// gap：出现在你下方几名；climb：每届论道往上追几名；near：追到几名内上门下战书；lo：刚出现时战力 = 参照战力 × lo，追三届升到 × f（0.92～1.06）
L.ROOKIE = { minR: 4, every: 36, gap: 20, climb: 8, near: 5, lo: 0.45, f: [0.92, 1.06], firstDelay: 6, after: 12, poolMax: 6, friendsMax: 4, giftEvery: 24, giftP: 0.15, trouble: 24 };   // 送礼：每位每 24 月 15%，一份 ≈ 3 月收入（一位 ≈ 收入 +2%，最多记 4 位）
const RK_SA = '青玄紫太灵万九赤寒落星凌归无金碧幽云烈苍昆神浩元'.split('');
const RK_SB = ['剑宗', '法阁', '虚宫', '霄宫', '机阁', '极殿', '霞宗', '元宗', '炎门', '冰谷', '灵宗', '华派', '鼎派', '花谷', '阳宗', '月宫', '雷殿', '道院', '剑阁'];
const RK_GA = ['青锋', '赤霄', '寒星', '裂空', '惊雷', '碧落', '断水', '照夜', '流火', '镇岳'], RK_GB = ['剑', '刀', '枪', '环', '扇', '尺', '戟'];
L.ROOKIE_LINES = ['三年之内，我踩着{name}上去。', '天骄榜第一？那是给我留的位子。', '{name}？我拿他的名字练字。', '谁拦我，我就从谁头上过去。', '等我追上{name}，请他给我端茶。', '我出关那天，天骄榜要重排。'];
const rkIdx = (st, rk) => (rk ? st.ladder.findIndex(x => x.rk === rk.id) : -1);
const idxRank = (st, i) => (i < 0 ? 0 : i + 1 < st.rank ? i + 1 : i + 2);
L.rookie = st => (ON() && st.rv2 && st.rv2.rk) || null;
L.rookieRank = st => idxRank(st, rkIdx(st, rv(st).rk));
// 新秀的战力：天骄榜曲线与“参照战力 × 追了几届”取大（参照 = 上届论道时你的战力，所以他一直是个真威胁，又不会因为你换件法宝就跟着变）
L.rookiePower = function (st, x, q) {
  const rk = rv(st).rk;
  if (!x) { const i = rkIdx(st, rk); if (i < 0) return 0; x = st.ladder[i]; q = idxRank(st, i); }
  const base = L.rivalCurve(st, q || L.rookieRank(st)) * (x.pw || 1);
  if (!rk || x.rk !== rk.id) return base;
  const K = L.ROOKIE, prog = Math.min(1, rk.climbs / 3);
  return Math.max(base, (rv(st).refP || L.power(st)) * (K.lo + (rk.f - K.lo) * prog));
};
L.rookieReveal = st => { const rk = rv(st).rk; if (rk) rk.known = 1; };
L.rookieFoe = st => (rv(st).rk ? rkFoe(rv(st).rk) : null);
function rookieSpawn(st) {
  const r = rv(st), K = L.ROOKIE;
  const used = new Set(st.ladder.map(x => x.n).concat([st.p.name]));
  let n = L.randName();
  for (let g = 0; g < 60 && used.has(n); g++) n = L.randName();
  let j = st.ladder.length - 1;
  while (j >= 0 && (st.ladder[j].id || st.ladder[j].rk)) j--;
  if (j < 0 || used.has(n)) return null;
  st.ladder.splice(j, 1);
  const wAff = L.AFFIX_IDS.filter(a => L.AFFIX[a].slots.includes('w'));
  const rk = { id: 'rk' + (r.rkN + 1), n, s: pick(RK_SA) + pick(RK_SB), el: pick(L.ELEM_KEYS), line: pick(L.ROOKIE_LINES), seed: ri(1, 999999), fem: R() < 0.35 ? 1 : 0,
    t0: st.tick, climbs: 0, f: K.f[0] + R() * (K.f[1] - K.f[0]), gear: { n: pick(RK_GA) + pick(RK_GB), aff: pick(wAff) }, known: 0, near: 0, due: 0 };
  const q = Math.min(100, st.rank + K.gap);
  st.ladder.splice(Math.max(st.rank - 1, Math.min(st.ladder.length, q - 2)), 0, { n, s: rk.s, rk: rk.id });
  r.rk = rk; r.rkN++;
  if (!r.refP) r.refP = L.power(st);
  L.log(st, `天骄榜快讯：第 ${L.rookieRank(st)} 名冒出一位新秀${n}（${rk.s}），放话：“${L.fill(st, rk.line)}”`, 'gold');
  L.fireTrigger(st, 'rookie:appear');
  return rk;
}
// 每届论道之后（rivals.js 的 L.tournament 调）：参照战力记下这一届的你；新秀往上追 8 名，最多追到你身后
L.rookieTour = function (st, S) {
  const r = rv(st);
  if (S > 0) r.refP = S;
  const rk = r.rk;
  if (!ON() || !rk) return null;
  const j = rkIdx(st, rk);
  if (j < 0) { r.rk = null; return null; }
  rk.climbs++;
  const to = Math.max(st.rank - 1, j - L.ROOKIE.climb);
  if (to < j) { const x = st.ladder.splice(j, 1)[0]; st.ladder.splice(to, 0, x); }
  const q = L.rookieRank(st), gap = q - st.rank, out = { n: rk.n, q, gap, up: Math.max(0, j - to) };
  if (gap <= 1) { rk.due = 1; out.due = true; L.log(st, `天骄榜快讯：新秀${rk.n}追到了你身后（第 ${q} 名），扬言下一个就是你`, 'red'); }
  else {
    if (gap <= L.ROOKIE.near && !rk.near) { rk.near = 1; out.near = true; L.fireTrigger(st, 'rookie:near'); }
    L.log(st, `天骄榜快讯：新秀${rk.n}又往上蹿了 ${out.up} 名，第 ${q}，离你只差 ${gap} 名`);
  }
  return out;
};
// 打压赢了：他法宝上的那条词条挪到你的兵器上（兵器最多三条、克 X 只能一条）；装不下就熔成灵矿
function takeAffix(st, rk) {
  const a = rk.gear.aff, x = L.gearEq(st, 'w');
  if (x && L.GEAR_ON !== false && x.aff.length < 3 && !x.aff.includes(a) && !(a.startsWith('ke_') && x.aff.some(b => b.startsWith('ke_')))) {
    x.aff.push(a);
    return { aff: a, text: `他那件【${rk.gear.n}】上的「${L.AFFIX[a].n}」挪到了你的兵器【${L.gearBase(x.id).n}】上：${L.AFFIX[a].d}` };
  }
  const n = L.addOre(st, 3 * L.oreUnit(st));
  return { aff: '', ore: n, text: `他那件【${rk.gear.n}】的「${L.AFFIX[a].n}」你的兵器装不下，熔了得灵矿 ${L.fmt(n)}` };
}
function rookieEnd(st, rk) {
  const r = rv(st), i = rkIdx(st, rk);
  if (i >= 0) delete st.ladder[i].rk;   // 从此是榜上一位普通的天骄
  r.rk = null;
  r.rkNext = Math.max(rk.t0 + L.ROOKIE.every, st.tick + L.ROOKIE.after);
}
// how：'teach' 指点 / 'crush' 打压（win 是打压的胜负）
L.rookieResolve = function (st, how, win) {
  const r = rv(st), rk = r.rk;
  if (!rk) return null;
  const res = { how, win: !!win, n: rk.n, s: rk.s, el: rk.el, gear: rk.gear };
  if (how === 'teach') {
    r.friends.push({ n: rk.n, s: rk.s, el: rk.el, at: st.tick }); if (r.friends.length > L.ROOKIE.friendsMax) r.friends.shift();
    st.eflags.rookie_taught = 1; r.trouble = st.tick + L.ROOKIE.trouble; r.teach++;
    L.log(st, `你指点了新秀${rk.n}三招。他深深一揖走了，往后逢年过节会托人送点东西来`, 'jade');
  } else if (win) {
    Object.assign(res, takeAffix(st, rk));
    r.pool.push({ id: rk.id, n: rk.n, s: rk.s, el: rk.el, g: L.GRUDGE.hi, gear: rk.gear, at: st.tick });
    r.pool.sort((a, b) => b.g - a.g); if (r.pool.length > L.ROOKIE.poolMax) r.pool.length = L.ROOKIE.poolMax;
    r.crush++;
    L.log(st, `你当众打压了新秀${rk.n}。${res.text}。他走时回头看了你一眼——这笔账他记下了（恩怨 ${L.GRUDGE.hi}）`, 'gold');
    L.fireTrigger(st, 'rookie:beaten');
  } else {
    // 输了：他挤到你前面一名
    const i = rkIdx(st, rk);
    if (i >= 0 && i >= st.rank - 1) { const x = st.ladder.splice(i, 1)[0]; st.ladder.splice(st.rank - 1, 0, x); st.rank = Math.min(100, st.rank + 1); }
    st.p.inj = Math.max(st.p.inj, 2);
    r.lost++;
    L.log(st, `新秀${rk.n}赢了你半招，天骄榜上排到了你前面（你第 ${st.rank}）`, 'red');
  }
  rookieEnd(st, rk);
  return res;
};
// 打压：对决（五行克制、他的法宝词条都算）
L.rookieInfo = function (st) {
  const rk = rv(st).rk; if (!rk) return null;
  const foe = rkFoe(rk), Q = L.rookiePower(st), S = L.duelPower(st, foe);
  return { rk, foe, Q, S, p: L.duelP(st, S, Q, foe), q: L.rookieRank(st), gap: L.rookieRank(st) - st.rank, known: !!rk.known };
};
L.rookieDuel = function (st) {
  const I = L.rookieInfo(st); if (!I) return null;
  const win = L.duelWin(st, I.S, I.Q, I.foe, I.p);   // 回合战（battle.js），胜率仍是 I.p
  L.revealFoe(st, I.foe);
  const res = Object.assign({ S: I.S, Q: I.Q, p: I.p }, L.rookieResolve(st, 'crush', win));
  return res;
};
// 事件里的结局：fx.rookie = 'win' | 'lose'（打压的胜负）| 'teach'（指点）
L.supportFx('rookie', { ok: v => ['win', 'lose', 'teach'].includes(v), apply: (st, v, out) => {
  const r = L.rookieResolve(st, v === 'teach' ? 'teach' : 'crush', v === 'win');
  if (r && r.text) out.push(r.text);
  if (r && v === 'lose') out.push(`天骄榜 → 第 ${st.rank}`);
} });
// 新秀的剧情触发键：出现、追到 5 名内、被打压之后、指点后 24 月
L.supportTrigger('rookie:');
L.supportTrigger('war_eve:');

// ---------- 每月（tick.js 调，排在宗门的来犯判定之前） ----------
// 天剑宗来犯前 6 月（war_eve:tianjian）：头一回满足来犯条件时先排日子、先来一封信
function warEve(st) {
  if (!st.sect || st.flags.warWon || st.flags.warEve) return;
  if (!(st.sect.rank >= 2 && st.p.r >= 5)) return;
  st.flags.warEve = st.tick;
  if (!(st.flags.war > st.tick)) st.flags.war = st.tick + 6;
  L.fireTrigger(st, 'war_eve:tianjian');
}
L.rivalTick = function (st, out) {
  const r = rv(st);
  warEve(st);
  // 陆天衡假意答应（tianheng_1 的 raid_delay）：天剑宗来犯推迟 24 月
  if (st.eflags && st.eflags.raid_delay) { delete st.eflags.raid_delay; if (!st.flags.warWon) st.flags.war = Math.max(st.flags.war || 0, st.tick) + 24; }
  if (!ON()) return;
  rivalQy(st);
  const K = L.ROOKIE, p = st.p;
  if (p.r >= K.minR && p.r <= L.MAXR && st.pact) {
    if (r.rkNext === null || r.rkNext === undefined) r.rkNext = st.tick + K.firstDelay;
    if (!r.rk && st.tick >= r.rkNext) { const rk = rookieSpawn(st); if (rk) out.rookieNew = rk; else r.rkNext = st.tick + K.after; }
    if (r.rk && r.rk.due && !st.exp && !st.run && !st.retreat) out.rookie = true;
  }
  // 指点过的新秀：24 月后闯祸（new_4）；之后每 24 月可能托人送礼
  if (r.trouble !== null && r.trouble !== undefined && st.tick >= r.trouble) { r.trouble = null; if (st.eflags.rookie_taught) L.fireTrigger(st, 'rookie:trouble'); }
  if (st.tick % K.giftEvery === 3) for (const f of r.friends) {
    if (st.tick - f.at < K.giftEvery || R() >= K.giftP) continue;
    const k = ri(0, 2), inc = Math.max(L.income(st), 20);
    let what;
    if (k === 0) { const v = Math.round(inc * 3); st.stones += v; what = `灵石 ${L.fmt(v)}`; }
    else if (k === 1) { const v = L.addOre(st, L.oreUnit(st)); what = `灵矿 ${L.fmt(v)}`; }
    else { const v = Math.round(3 * L.herbScale(st)); st.herbs += v; what = `灵草 ${L.fmt(v)}`; }
    r.gifts++; f.gifts = (f.gifts || 0) + 1;
    L.log(st, `新秀${f.n}托人送来一份心意：${what}`, 'jade');
    (out.rkGift = out.rkGift || []).push({ n: f.n, what });
  }
};
});
