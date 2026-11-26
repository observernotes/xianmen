/* 废柴仙途 · 逻辑模块 sect2：宗门加深（docs/SYSTEMS.md §11，CONTENT §9、§14.3）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   任务板：sect.js 的 8 类之外再登记 4 类（L.TASK_X）——炼器（强化到 +3 以上一次，或上交灵矿）、驯兽（上交兽粮，或带指定属性的灵宠出战一趟）、
 *           探秘（有秘境时：本季秘境闯过 N 层；没有时：去家门口最远一张图的禁地寻宝一趟，评价乙以上）、讲法（以一门圆满功法讲道 2 月，贡献 ×2，徒弟各得进益）。
 *   宝库轮换：6 格，每届论道（12 月）换一次——本宗功法、宝库法宝（够格时先给镇宗法宝）、本宗阵图 / 器方、破境丹、灵矿（或灵草）、再随机一格；
 *           按身份开放（不够格的照样摆着，写“X 可换”），贡献是唯一的货币。管库执事的悄悄话（vault_tip）：下一届法宝那格高一阶。
 *   职司（真传起，选一个，每届会武后可改）：丹堂 / 器堂 / 战堂 / 执法堂 / 外事堂，效果包在炼丹、强化、熔炼、历练、论道、访客、货架、拍卖上。
 *   人脉：每宗三位长老（L.ELDERS），支持 0～100（入宗时各 10）。来自对应类型的宗门任务（+3）、事件（fx.favor：a / b / c 是本宗第 1 / 2 / 3 位，或写长老 id）、
 *         送礼（每位每届一次 +6，天材地宝 +9，只送得到 40；他的对头 −2）。≥ 40 得小恩惠（每届一份东西或一项常驻加成），第一次到 80 得绝学（功法、器方、阵图）。
 *         圣子之争、宗主之位要至少两位长老 ≥ 50（L.addPromoReq）；圣子之争前夜（sect:heir）三位长老来谈条件，谁也不站（heir_none）就改成累计贡献多两成；
 *         宗主之争（sect:lord）还回镇宗法宝（lord_gift）补一票。
 *   血煞魔宗（第四宗，L.SECTS 追加）：魔门遗孤出身、或夜璃好感 ≥ 40、或魔修欠你一条命（mo_owe）时才会来招揽；越级奖励 ×3、负伤月 ×2、因果可换贡献；
 *         正道会盟、正魔大战这类事件不出。
 * 事件能力：fx.favor / fx.duty / fx.busy，资格 favorMin，触发键 sect:heir / sect:lord；一次性 flag vault_tip、heir_none、lord_vote、lord_gift、lord_duel、war_feint。
 * 接入点（加载时包一层）：L.joinSect、L.promote、L.alchRate、L.gearPlusRate、L.gearPlusCost、L.gearSmeltOre、L.sellParts、L.buyMult、L.bidInfo、L.calVisitMult、
 *   L.spawnVisitor、L.tournament、L.resolveExp、L.gearPlus、L.retCost、L.addMastery、L.leapMult、L.fieldHerbMult、L.marketTick、L.endRetreat、L.eligible、L.resolveChoice。
 *   tick.js 每月调 L.sectTick；save.js 调 L.migrateSect2（缺的补默认值，可重复调用，不升存档版本）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const rr = st => Math.min(st.p.r, 8);
const fmt = n => L.fmt(n);
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };
let lastSt = null;   // 不带 st 的函数（L.gearSmeltOre）从这里读

// ---------- 血煞魔宗：第四宗 ----------
L.SECTS.push({ id: 'xuesha', n: '血煞魔宗', d: '魔道第一宗，强者为尊', perk: '越级奖励 ×3；负伤月 ×2；手里的因果可以换贡献（每条 +50 起）', fit: '适合：爱越级', atk: 1, cul: 1, bt: 0, color: '#c8323c', mo: true });
L.MO_V = { leap: 1.5, karma: 50 };
// 魔门遗孤出身、夜璃好感 ≥ 40、或救过的魔修欠你一条命（su_q2 的 mo_owe）
L.sectJoinable = (st, id) => id !== 'xuesha' || st.origin === 'moyi' || L.aff(st, 'ye') >= 40 || !!(st.eflags && st.eflags.mo_owe);
L.sectsFor = st => L.SECTS.filter(sc => L.sectJoinable(st, sc.id));
// 魔宗弟子不会碰上的正道事件
const MO_SKIP = ['sect_war_xuesha', 'sect_alliance'];
// 原圣子 / 圣女（圣子之争的对手；美术 id 见 docs/ART_API.md 批次八）
L.SECT_HEIR = { jian: { n: '萧凌风', nf: '苏清寒', img: 'xiao' }, dan: { n: '丹红袖', img: 'hongxiu' }, dao: { n: '陆知白', img: 'zhibai' }, xuesha: { n: '厉千秋', img: 'lixiao' } };   // 血煞魔宗的原圣子不是血无涯（他是要到第七章才肯上台的卡位宿敌，STORY P20）
L.heirName = st => { const H = st.sect && L.SECT_HEIR[st.sect.id]; return H ? (st.p.look.f && H.nf ? H.nf : H.n) : '原圣子'; };

// ---------- 长老（CONTENT §9） ----------
// tasks：管哪些宗门任务（act 带 sub）；gift：喜欢的礼；s40：支持 ≥ 40 的小恩惠；s80：第一次到 80 的绝学；rival：理念相冲的那位（送礼时 −2）
const E = (id, n, t, ph, img, tasks, gift, s40, s80, rival) => ({ id, n, t, ph, img, tasks, gift, s40, s80, rival });
L.ELDERS = {
  jian: [
    E('lingxu', '凌虚子', '掌门', '剑即一切', 'jian', ['exp', 'tour', 'act:leap', 'lecture'], 'treasure', { k: 'ore', n: 20 }, { plan: 'g_jianyi' }, 'liu'),
    E('tieye', '铁冶真人', '器堂', '器为剑骨', 'tieye', ['forge', 'herbs', 'pill', 'act:craft', 'tame'], 'ore', { k: 'plusOre', v: 0.2 }, { art: 'm_zhujian' }, 'lingxu'),
    E('liu', '柳含烟', '执法', '规矩大于天', 'liu', ['escort', 'boss', 'teach', 'act:retreat', 'explore'], 'stones', { k: 'zhen', id: 'f_hushan' }, { art: 'x_jiuzhuan' }, 'tieye'),
  ],
  dan: [
    E('yun', '丹云婆婆', '谷主', '丹道济世', 'dan', ['act:craft', 'pill', 'teach', 'lecture'], 'herbs', { k: 'yin', y: 'fire' }, { plan: 'f_danhuo' }, 'chisong'),
    E('yaochen', '药尘子', '药园', '草木有灵', 'yaochen', ['herbs', 'tame', 'act:retreat', 'explore'], 'feed', { k: 'field', v: 0.1 }, { art: 'm_baicao' }, 'yun'),
    E('chisong', '赤松客', '外事', '丹药就是买卖', 'chisong', ['escort', 'exp', 'forge', 'tour', 'boss', 'act:leap'], 'stones', { k: 'sell', v: 0.1 }, { art: 'x_zifu' }, 'yaochen'),
  ],
  dao: [
    E('xuanwei', '玄微子', '掌教', '道法自然', 'dao', ['act:retreat', 'lecture', 'tour'], 'pills', { k: 'ret', v: 0.1 }, { art: 'x_taiyi' }, 'qingxu'),
    E('shouzhuo', '守拙道人', '藏经', '厚积薄发', 'shouzhuo', ['teach', 'herbs', 'pill', 'forge', 'act:craft'], 'treasure', { k: 'mast', v: 0.1 }, { art: 'm_fenshen' }, 'xuanwei'),
    E('qingxu', '清虚真人', '观星', '顺天应时', 'qingxu', ['explore', 'exp', 'escort', 'boss', 'tame', 'act:leap'], 'stones', { k: 'world', v: 3 }, { frag: 'm_xingdou' }, 'shouzhuo'),
  ],
  xuesha: [
    E('xuehe', '血河老祖', '宗主', '强者为尊', 'xuehe', ['act:leap', 'tour', 'boss', 'exp'], 'treasure', { k: 'leap', v: 0.2 }, { plan: 'g_xuesha' }, 'youji'),
    E('xuesan', '鬼医薛三', '药房', '毒亦是药', 'xue3', ['pill', 'herbs', 'act:craft', 'tame', 'forge'], 'herbs', (L.toxDecay ? { k: 'tox', v: 1 } : { k: 'yin', y: 'soul' }), { art: 'm_xuedun' }, 'xuehe'),
    E('youji', '幽姬', '细作', '人心可用', 'youji', ['escort', 'explore', 'teach', 'lecture', 'act:retreat'], 'stones', { k: 'bid', v: 0.05 }, { k: 'aucSteal' }, 'xuesan'),
  ],
};
const ALL_E = {}; for (const sid in L.ELDERS) for (const x of L.ELDERS[sid]) ALL_E[x.id] = Object.assign(x, { sect: sid });
L.elder = id => ALL_E[id] || null;
L.eldersOf = st => (st.sect && L.ELDERS[st.sect.id]) || [];
L.FAV = { start: 10, task: 3, gift: 6, giftBig: 9, giftCap: 40, rival: 2, small: 40, promo: 50, big: 80, max: 100 };

// ---------- 状态（缺的补默认值，可重复调用） ----------
function ensure(st) {
  const sc = st.sect; if (!sc) return null;
  if (!sc.fav || typeof sc.fav !== 'object') sc.fav = {};
  for (const x of L.eldersOf(st)) if (typeof sc.fav[x.id] !== 'number' || !isFinite(sc.fav[x.id])) sc.fav[x.id] = L.FAV.start;
  for (const k of ['f40', 'f80', 'gift']) if (!sc[k] || typeof sc[k] !== 'object') sc[k] = {};
  if (typeof sc.duty !== 'string') sc.duty = '';
  if (typeof sc.dutyMeet !== 'number') sc.dutyMeet = -1;
  if (sc.vault && !Array.isArray(sc.vault.slots)) sc.vault = null;
  if (sc.vault === undefined) sc.vault = null;
  for (const k of ['heirEv', 'lordEv', 'karmaN', 'meets']) if (typeof sc[k] !== 'number') sc[k] = 0;
  return sc;
}
L.sect2Ensure = ensure;
L.migrateSect2 = function (s) { if (s.sect) ensure(s); if (L.migrateDisc) L.migrateDisc(s); };

// ---------- 支持度 ----------
L.favor = (st, id) => (st.sect && ensure(st) && typeof st.sect.fav[id] === 'number' ? st.sect.fav[id] : null);
const resolveE = (st, k) => { const i = 'abc'.indexOf(k); const list = L.eldersOf(st); return i >= 0 && k.length === 1 ? (list[i] || null) : list.find(x => x.id === k) || null; };
L.on40 = (st, id) => (L.favor(st, id) || 0) >= L.FAV.small;
// 改支持度；跨过 40（第一次时给一次性的东西）/ 80（绝学）时结算。返回实际改了多少
L.addFavor = function (st, id, d, why) {
  const sc = ensure(st); if (!sc || !d) return 0;
  const x = L.eldersOf(st).find(e => e.id === id); if (!x) return 0;
  const v0 = sc.fav[id], v1 = clamp(Math.round(v0 + d), 0, L.FAV.max);
  sc.fav[id] = v1;
  if (v0 < L.FAV.small && v1 >= L.FAV.small) {
    L.log(st, `${x.n}支持你了（${v1}）：${L.elderFavDesc(st, x, 40)}`, 'gold');
    if (!sc.f40[id]) { sc.f40[id] = 1; grant40Once(st, x); }
    emit('favor40', { id });
  }
  if (v1 >= L.FAV.big && !sc.f80[id]) { sc.f80[id] = 1; const t = grant80(st, x); L.log(st, `${x.n}倾囊相授：${t}`, 'gold'); emit('favor80', { id, t }); }
  if (why && v1 !== v0) L.log(st, `${x.n}支持 ${v1 > v0 ? '+' : ''}${v1 - v0}（${why}）`);
  return v1 - v0;
};
// 恩惠的说明（界面、日志共用）
L.elderFavDesc = function (st, x, lv) {
  if (lv === 80) {
    const s = x.s80;
    if (s.art) return `绝学《${L.art(s.art).n}》`;
    if (s.plan) return `${L.PLAN[s.plan] ? '器方' : '阵图'}《${L.PLAN[s.plan] ? L.PLAN[s.plan].n : L.ZHENTU[s.plan]}》`;
    if (s.frag) return `《${L.art(s.frag).n}》残篇一片`;
    if (s.k === 'aucSteal') return '宿敌在拍卖会上拍走东西时，那份战力加成算你的';
    return '';
  }
  const s = x.s40;
  switch (s.k) {
    case 'ore': return `每届论道送灵矿 ${s.n} 筐（${fmt(s.n * L.oreUnit(st))}）`;
    case 'plusOre': return `强化花的灵矿 −${L.pct(s.v)}`;
    case 'zhen': return `阵图《${L.ZHENTU[s.id]}》（一次）`;
    case 'yin': return `每届论道送${{ fire: '火', soul: '魂', ice: '冰', thunder: '雷', wood: '木' }[s.y]}引一枚`;
    case 'field': return `灵田灵草 +${L.pct(s.v)}`;
    case 'sell': return `坊市出售价 +${L.pct(s.v)}`;
    case 'ret': return `闭关花费 −${L.pct(s.v)}`;
    case 'mast': return `功法熟练 +${L.pct(s.v)}`;
    case 'world': return `天象早知：天下大势期间历练分数 +${s.v}`;
    case 'leap': return `越级奖励再 +${L.pct(s.v)}`;
    case 'bid': return `拍卖拿下把握 +${L.pct(s.v)}`;
    case 'tox': return `丹毒每月多消 ${s.v}（毒亦是药）`;
  }
  return '';
};
function grant40Once(st, x) {
  const s = x.s40;
  if (s.k === 'zhen') { const t = L.givePlan(st, s.id); if (t) L.log(st, t, 'gold'); }
}
function grant80(st, x) {
  const s = x.s80;
  if (s.art) { const it = L.giveArt(st, s.art, { src: 'elder' }); return L.itemText ? L.itemText(st, it) : '《' + L.art(s.art).n + '》'; }
  if (s.plan) return L.givePlan(st, s.plan) || '';
  if (s.frag) { const out = L.applyFx(st, { art: s.frag }); return out.join('、'); }
  return L.elderFavDesc(st, x, 80);
}
// 每届论道：≥ 40 的长老送一份东西
function perTourFavours(st, out) {
  for (const x of L.eldersOf(st)) {
    if (!L.on40(st, x.id)) continue;
    const s = x.s40;
    if (s.k === 'ore' && L.gearOpen(st, 'plus')) { const n = L.addOre(st, s.n * L.oreUnit(st)); L.log(st, `${x.n}差人送来灵矿 ${fmt(n)}`, 'jade'); (out.favGifts = out.favGifts || []).push(`${x.n}：灵矿 +${fmt(n)}`); }
    else if (s.k === 'yin') { const t = L.applyFx(st, { yin: { [s.y]: 1 } }); L.log(st, `${x.n}送来一枚药引：${t.join('、')}`, 'jade'); (out.favGifts = out.favGifts || []).push(`${x.n}：${t.join('、')}`); }
  }
}
// 某位长老的小恩惠此刻是否生效（常驻类）
const fav40 = (st, k) => { for (const x of L.eldersOf(st)) if (x.s40.k === k && L.on40(st, x.id)) return x.s40.v; return 0; };
const fav80 = (st, k) => L.eldersOf(st).some(x => x.s80.k === k && st.sect.f80 && st.sect.f80[x.id]);

// ---------- 送礼：每位每届一次，他的对头 −2 ----------
L.GIFT = {
  treasure: { n: '天材地宝', amt: () => 1, have: st => st.treasure, pay: (st, n) => { st.treasure -= n; }, big: true },
  ore: { n: '灵矿', amt: st => 6 * L.oreUnit(st), have: st => st.ore || 0, pay: (st, n) => { st.ore -= n; } },
  stones: { n: '灵石', amt: st => Math.floor(8 * Math.max(L.income(st), 20)), have: st => st.stones, pay: (st, n) => { st.stones -= n; } },
  herbs: { n: '灵草', amt: st => 8 * (1 + rr(st)), have: st => Math.floor(st.herbs), pay: (st, n) => { st.herbs -= n; } },
  pills: { n: '破境丹', amt: () => 1, have: st => st.pills, pay: (st, n) => { st.pills -= n; } },
  feed: { n: '兽粮', amt: st => 10 * (1 + rr(st)), have: st => st.feed || 0, pay: (st, n) => { st.feed -= n; } },
};
L.giftKind = (st, x) => (x.gift === 'feed' && !L.petCount(st) ? 'herbs' : x.gift === 'ore' && !L.gearOpen(st, 'plus') ? 'stones' : x.gift);
L.giftCyc = st => Math.floor(st.tick / L.TOUR_EVERY);
L.giftInfo = function (st, id) {
  const sc = ensure(st), x = L.elder(id);
  if (!sc || !x || x.sect !== sc.id) return null;
  const k = L.giftKind(st, x), G = L.GIFT[k], n = G.amt(st), gain = G.big ? L.FAV.giftBig : L.FAV.gift;
  let why = '';
  if (sc.gift[id] === L.giftCyc(st)) why = '这一届已经送过了';
  else if (sc.fav[id] >= L.FAV.giftCap) why = `礼只送得到 ${L.FAV.giftCap}，再往上得替他办事`;
  else if (G.have(st) < n) why = `还差${G.n} ${fmt(n - G.have(st))}`;
  const rv = L.elder(x.rival);
  return { k, n, G, gain, why, text: `${G.n} ${fmt(n)}`, rival: rv && rv.sect === sc.id ? rv : null };
};
L.giftElder = function (st, id) {
  const g = L.giftInfo(st, id); if (!g || g.why) return null;
  g.G.pay(st, g.n); st.sect.gift[id] = L.giftCyc(st); st.flags.spentAt = st.tick;
  const d = L.addFavor(st, id, g.gain);
  const dr = g.rival ? L.addFavor(st, g.rival.id, -L.FAV.rival) : 0;
  L.log(st, `给${L.elder(id).n}送去${g.text}：支持 +${d}${dr ? `；${g.rival.n} ${dr}` : ''}`, 'jade');
  return { d, dr, g };
};

// ---------- 宗门任务 → 长老 ----------
L.taskElder = function (st, t) {
  const key = t.ty === 'act' ? 'act:' + t.sub : t.ty;
  const x = L.eldersOf(st).find(e => e.tasks.includes(key));
  return x ? x.id : null;
};
L.onTaskDone = function (st, t) {
  ensure(st);
  const id = L.taskElder(st, t);
  if (id) { const d = L.addFavor(st, id, L.FAV.task); t.fav = { id, d }; }
};

// ---------- 晋升：圣子、宗主要两位长老 ≥ 50 ----------
L.elderVotes = function (st, k) {
  const sc = ensure(st); if (!sc) return { n: 0, gift: false };
  const n = L.eldersOf(st).filter(x => sc.fav[x.id] >= L.FAV.promo).length;
  const gift = k === 6 && !!(st.eflags && st.eflags.lord_gift);
  return { n: n + (gift ? 1 : 0), gift };
};
L.HEIR_NONE = 1.2;
L.addPromoReq('elders', function (st, k) {
  if (k !== 3 && k !== 6) return null;
  ensure(st);
  if (k === 3 && st.eflags && st.eflags.heir_none) {
    const need = Math.ceil(L.SRANKS[3].c * L.HEIR_NONE);
    return { k: 'heirNone', t: `谁也不站：累计贡献再多两成 ${fmt(st.sect.total)} / ${fmt(need)}`, ok: st.sect.total >= need, v: Math.min(1, st.sect.total / need) };
  }
  const v = L.elderVotes(st, k);
  return { k: 'elders', t: `至少两位长老支持 ≥ ${L.FAV.promo}（${Math.min(2, v.n)}/2${v.gift ? '，镇宗宝补了一票' : ''}）`, ok: v.n >= 2, v: Math.min(1, v.n / 2), elders: true };
});
// 除了人脉以外都够了（圣子 / 宗主之争的前夜用）
L.promoBaseOk = st => L.promoteNeeds(st).filter(x => x.k !== 'elders' && x.k !== 'heirNone').every(x => x.ok);

// ---------- 职司（真传起；每届会武后可改） ----------
L.DUTIES = {
  dan: { n: '丹堂', icon: 'post_dan', d: '成丹率 +8%，丹药卖价 +20%，任务多半是炼丹' },
  qi: { n: '器堂', icon: 'post_qi', d: '强化成功率 +8%，熔炼所得灵矿 +30%' },
  zhan: { n: '战堂', icon: 'post_zhan', d: '斩妖历练分数 +5，论道所得灵石与贡献 +30%' },
  fa: { n: '执法堂', icon: 'post_fa', d: '坏事上门少一半，打赢挑战你的同门另得贡献' },
  wai: { n: '外事堂', icon: 'post_wai', d: '坊市货架 −10%，拍卖拿下把握 +10%，来访的人多一成半' },
};
L.DUTY_V = { alch: 0.08, pillSell: 1.2, plus: 0.08, smelt: 1.3, slay: 5, tour: 0.3, faBad: 0.5, faContrib: 1, waiBuy: 0.9, waiBid: 0.10, waiVisit: 1.15 };
L.dutyOpen = st => !!st.sect && st.sect.rank >= 2;
L.duty = st => (st.sect && L.dutyOpen(st) && st.sect.duty) || '';
L.dutyWhy = function (st) {
  if (!L.dutyOpen(st)) return '真传弟子才有职司';
  ensure(st);
  if (st.sect.duty && st.sect.meets <= st.sect.dutyMeet) return `下届会武后才能改（${L.nextMeet(st)} 月后）`;
  return '';
};
L.setDuty = function (st, k, free) {
  if (!L.DUTIES[k] || !st.sect) return false;
  ensure(st);
  if (!free && L.dutyWhy(st)) return false;
  if (!L.dutyOpen(st) && !free) return false;
  const was = st.sect.duty;
  st.sect.duty = k; st.sect.dutyMeet = st.sect.meets;
  if (was !== k) L.log(st, `领了宗门职司：${L.DUTIES[k].n}——${L.DUTIES[k].d}`, 'gold');
  return true;
};

// ---------- 宝库轮换：6 格，每届论道换一次 ----------
// 本宗独有的阵图与器方（CONTENT §9 / §6 / §5.2）；血煞魔宗的功法是三门魔道功法
L.SECT_VAULT = {
  jian: { zhen: 'f_hushan', plan: 'g_jianyi' },
  dan: { zhen: 'f_danhuo', plan: 'g_chiyan' },
  dao: { zhen: 'f_mizong', plan: 'g_zhenhun' },
  xuesha: { zhen: 'f_duanhun', plan: 'g_xuesha', arts: [['z_liehuo', 1], ['m_xuedun', 2], ['z_fentian', 3]] },
};
L.VAULT_ROT = { n: 6, zhenRank: 2, planRank: 4 };
const libUp = st => Math.floor(((st.sect.build || {}).lib || 0) / 2);
// 本宗的秘传功法（三正宗读 arts.js 的 pool: 'vault'；魔宗是 SECT_VAULT.xuesha.arts）
L.sectArts = function (st) {
  if (!st.sect) return [];
  const V = L.SECT_VAULT[st.sect.id];
  if (V && V.arts) return V.arts.map(([id, rank]) => ({ A: L.art(id), rank: Math.max(0, rank - libUp(st)) })).filter(x => x.A);
  return L.vaultArts(st).map(A => ({ A, rank: L.vaultArtRank(st, A) }));
};
const planOwn = (st, id) => (L.PLAN[id] ? L.planOwned(st, id) : !!(st.gear.zhentu && st.gear.zhentu[id]));
function gearCell(st, used, tip) {
  const sc = st.sect, uid = L.VAULT_GEAR[sc.id], tier = Math.min(7, sc.rank + 2 + libUp(st) + (tip ? 1 : 0));
  if (uid && tier >= 5 && !st.gear.vaultU[sc.id] && !used.unique) { const B = L.gearBase(uid); used.unique = 1; return { k: 'gear', unique: true, base: uid, slot: B.slot, tier: B.t, lim: 1 }; }
  const open = L.GEAR_SLOTS.filter(s => L.gearOpen(st, s) && !used[s]);
  const slot = open.includes('w') && !used.w ? 'w' : open.length ? pick(open) : 'w';
  used[slot] = 1;
  return { k: 'gear', slot, tier, lim: 1 };
}
L.rollVault = function (st) {
  const sc = ensure(st); if (!sc) return null;
  const slots = [], used = {}, tip = !!(st.eflags && st.eflags.vault_tip);
  if (tip) delete st.eflags.vault_tip;
  const arts = L.sectArts(st).filter(x => !L.artOwned(st, x.A.id));
  if (arts.length) slots.push({ k: 'art', id: arts[0].A.id, lim: 1 });
  slots.push(gearCell(st, used, tip));
  const V = L.SECT_VAULT[sc.id];
  for (const id of [V.zhen, V.plan]) if (id && !planOwn(st, id)) { slots.push({ k: 'plan', id, rank: L.PLAN[id] ? L.VAULT_ROT.planRank : L.VAULT_ROT.zhenRank, lim: 1 }); break; }
  slots.push({ k: 'pill', lim: 2 });
  slots.push(L.gearOpen(st, 'plus') ? { k: 'ore', lim: 2 } : { k: 'herb', lim: 2 });
  const extra = [['treasure', 2], ['herb', slots.some(s => s.k === 'herb') ? 0 : 1], ['feed', L.petCount(st) && !slots.some(s => s.k === 'feed') ? 2 : 0], ['gear', 2], ['art', arts.length > 1 ? 1.5 : 0]].filter(x => x[1] > 0);
  for (let g = 0; slots.length < L.VAULT_ROT.n && g < 12; g++) {
    const k = wpick(extra);
    if (k === 'gear') slots.push(gearCell(st, used, false));
    else if (k === 'art') { slots.push({ k: 'art', id: arts[1].A.id, lim: 1 }); extra.splice(extra.findIndex(x => x[0] === 'art'), 1); }
    else { slots.push({ k, lim: 1 }); if (k !== 'treasure') extra.splice(extra.findIndex(x => x[0] === k), 1); }
  }
  for (const s of slots) s.sold = 0;
  sc.vault = { cyc: L.giftCyc(st), at: st.tick, slots, tip };
  return sc.vault;
};
L.vaultRot = function (st) {
  const sc = ensure(st); if (!sc) return null;
  if (!sc.vault) L.rollVault(st);
  return sc.vault;
};
L.vaultRestockIn = st => L.TOUR_EVERY - (st.tick % L.TOUR_EVERY);
// 一格的名字、说明、价钱、能不能买（为什么不能）
L.vaultCell = function (st, i) {
  const V = L.vaultRot(st), s = V && V.slots[i]; if (!s) return null;
  const sc = st.sect, r = rr(st), free = sc.freePick > 0;
  const o = { i, k: s.k, s, left: s.lim - s.sold, n: '', d: '', cost: 0, why: '' };
  if (s.k === 'art') {
    const A = L.art(s.id), x = L.sectArts(st).find(y => y.A.id === s.id);
    o.n = `《${A.n}》`; o.A = A; o.rank = x ? x.rank : 0; o.cost = free ? 0 : Math.floor(40 * Math.pow(3.2, x ? x.rank : sc.rank));
    if (L.artOwned(st, s.id)) o.why = '已习得';
    else if (sc.rank < o.rank) o.why = `${L.srankName(st, o.rank)}可换`;
  } else if (s.k === 'gear') {
    if (s.unique) { const B = L.gearBase(s.base); o.n = `镇宗法宝【${B.n}】`; o.d = `${L.GEAR_N[s.slot]} · ${L.gearTierName(s.slot, s.tier)} · 固定词条：${B.fixed.map(a => L.AFFIX[a].n).join('、')}`; if (!L.gearOpen(st, s.slot)) o.why = `${L.GEAR_N[s.slot]}槽${L.gearOpenWhy(st, s.slot)}`; }
    else { o.n = `宝库${L.GEAR_N[s.slot]}（${L.gearTierName(s.slot, s.tier)}）`; o.d = `${s.tier} 阶，随机词条，走对比卡`; if (!L.gearOpen(st, s.slot)) o.why = `${L.GEAR_N[s.slot]}槽${L.gearOpenWhy(st, s.slot)}`; }
    o.cost = free ? 0 : Math.floor(60 * Math.pow(3.2, sc.rank) * (s.slot === 'w' && sc.id === 'jian' ? 0.7 : 1));
  } else if (s.k === 'plan') {
    const P = L.PLAN[s.id]; o.n = P ? `器方《${P.n}》` : `阵图《${L.ZHENTU[s.id]}》`; o.d = P ? `${L.GEAR_N[P.slot]} ${L.gearTierName(P.slot, P.t)}，${P.aff.map(a => L.AFFIX[a].n).join('、')}（化神后器炉打造）` : '阵法上线后可布';
    o.rank = s.rank; o.cost = Math.floor(40 * Math.pow(3.2, s.rank));
    if (planOwn(st, s.id)) o.why = '已有'; else if (sc.rank < s.rank) o.why = `${L.srankName(st, s.rank)}可换`;
  } else if (s.k === 'pill') { o.n = '破境丹 ×2'; o.d = '宗门丹房特供'; o.cost = Math.floor(15 * Math.pow(2.3, r)); }
  else if (s.k === 'ore') { o.n = `器堂灵矿 ${fmt(L.vaultOreN(st))}`; o.d = '强化、打造用'; o.cost = Math.floor(12 * Math.pow(2.3, r)); }
  else if (s.k === 'herb') { o.n = `药园灵草 ${fmt(12 * (1 + r))}`; o.d = '炼丹、上交任务'; o.cost = Math.floor(8 * Math.pow(2.3, r)); }
  else if (s.k === 'treasure') { o.n = '天材地宝 ×1'; o.d = '炼丹、重铸、送礼'; o.cost = Math.floor(30 * Math.pow(2.3, r)); }
  else if (s.k === 'feed') { o.n = `兽粮 ${fmt(L.feedSack(st))}`; o.d = '喂灵宠升级'; o.cost = Math.floor(8 * Math.pow(2.3, r)); }
  if (!o.why && o.left <= 0) o.why = '已换完';
  if (!o.why && sc.pts < o.cost) o.why = `还差贡献 ${fmt(o.cost - sc.pts)}`;
  o.ok = !o.why;
  return o;
};
L.vaultCells = st => { const V = L.vaultRot(st); return V ? V.slots.map((s, i) => L.vaultCell(st, i)) : []; };
L.vaultRotBuy = function (st, i) {
  const c = L.vaultCell(st, i); if (!c || !c.ok) return null;
  const sc = st.sect, s = c.s, free = sc.freePick > 0 && (s.k === 'art' || s.k === 'gear');
  const res = { k: s.k, n: c.n };
  if (s.k === 'art') res.it = L.giveArt(st, s.id, { src: 'vault' });
  else if (s.k === 'gear') { if (s.unique) st.gear.vaultU[sc.id] = 1; res.it = L.gearDrop(st, s.slot, s.tier, { base: s.base, src: 'vault' }); }
  else if (s.k === 'plan') res.planText = L.givePlan(st, s.id);
  else if (s.k === 'pill') st.pills += 2;
  else if (s.k === 'ore') res.ore = L.addOre(st, L.vaultOreN(st));
  else if (s.k === 'herb') st.herbs += 12 * (1 + rr(st));
  else if (s.k === 'treasure') st.treasure++;
  else if (s.k === 'feed') { L.applyFx(st, { feed: L.feedSack(st) }); }
  if (free) sc.freePick--; else sc.pts -= c.cost;
  s.sold++; st.flags.spentAt = st.tick;
  L.log(st, `宗门宝库：换得${c.n}${c.cost && !free ? `（贡献 ${fmt(c.cost)}）` : ''}`, 'jade');
  L.checkQuests(st);
  return res;
};

// ---------- 新任务类型（sect.js 的 L.TASK_X） ----------
// 探秘：秘境上线后读它的层数（L.realmTaskFloor(st) → { floor 本季最深, max 可设的最深 } 或 null）；没有秘境时去禁地寻宝
const deepK = st => { let k = -1; for (let j = 0; j < L.REGIONS.length; j++) if (L.expOpen(st, j, 2, 1)) k = j; return k; };
L.TASK_X.forge = {
  n: '炼器', w: st => (L.gearOpen(st, 'plus') && st.gear.w ? 2 : 0),
  init: (st, t) => { t.n = 12 * L.oreUnit(st); },
  text: (st, t) => `炼器：强化一件法宝到 +3 以上，或上交灵矿 ${fmt(t.n)}`,
  canDeliver: (st, t) => (st.ore || 0) >= t.n, deliver: (st, t) => { st.ore -= t.n; },
};
L.TASK_X.tame = {
  n: '驯兽', w: st => (L.petCount(st) ? 2 : 0),
  init: (st, t) => { t.n = 10 * (1 + rr(st)); const els = [...new Set(st.pets.map(p => L.PET_SP[p.sp].el).filter(Boolean))]; t.el = els.length ? pick(els) : ''; },
  text: (st, t) => `驯兽：上交兽粮 ${fmt(t.n)}${t.el ? `，或带${L.PET_EL_N[t.el]}属性的灵宠出战历练一趟（丙以上）` : ''}`,
  canDeliver: (st, t) => (st.feed || 0) >= t.n, deliver: (st, t) => { st.feed -= t.n; },
};
L.TASK_X.explore = {
  n: '探秘', w: st => (L.realmTaskFloor ? (L.realmTaskFloor(st) ? 2 : 0) : deepK(st) >= 0 ? 1.5 : 0),
  init: (st, t) => {
    const rf = L.realmTaskFloor && L.realmTaskFloor(st);
    if (rf) { t.realm = 1; t.n = clamp((rf.floor || 0) + 1, 1, rf.max || 9); t.season = Math.floor(st.tick / 12); }
    else { t.k = deepK(st); t.a = 1; t.rw = Math.floor(t.rw * 1.25); }
  },
  text: (st, t) => (t.realm ? `探秘：本季秘境闯过 ${t.n} 层` : `探秘：去【${L.REGIONS[t.k].n}】禁地寻宝一趟，评价乙以上`),
};
// 讲法：手里有一门圆满（或化境）的功法；接下就开讲，2 月不修炼、不能出门
L.LECTURE_LEN = 2;
const bestRipe = st => Object.keys(st.arts.own).filter(id => L.art(id) && L.artLv(st, id) >= 3).sort((a, b) => L.art(b).t - L.art(a).t)[0] || null;
L.TASK_X.lecture = {
  n: '讲法', w: st => (bestRipe(st) ? 1.5 : 0),
  init: (st, t, std) => { t.art = bestRipe(st); t.rw = std * 2; },
  text: (st, t) => `讲法：以《${L.art(t.art).n}》讲道 ${L.LECTURE_LEN} 月（不修炼），贡献 ×2，徒弟各得进益`,
  take: (st, t, i) => L.startBusy(st, L.LECTURE_LEN, 'lecture', '讲法', { task: i }),
};
for (const ty in L.TASK_X) L.TASK_N[ty] = L.TASK_X[ty].n;
// 任务完成的检查：强化到 +3、驯兽出战、探秘（禁地寻宝 / 秘境层数）
wrap('gearPlus', b => (st, slot) => { lastSt = st; const res = b(st, slot); if (res && res.ok && res.to >= 3 && st.sect) L.taskHit(st, 'forge'); return res; });
wrap('resolveExp', b => st => {
  lastSt = st;
  const pet = L.petOut ? L.petOut(st) : null, el = pet ? L.PET_SP[pet.sp].el : '';
  const res = b(st);
  if (res && st.sect && !res.legacy) {
    if (el && res.rating >= 1) L.taskHit(st, 'tame', t => t.el === el);
    if (res.rating >= 2) L.taskHit(st, 'explore', t => !t.realm && t.k === res.k && res.d === 2 && res.a === 1);
  }
  return res;
});
// 秘境（realm.js）：本季主题已走过的最深层数决定 N（至少 2，不超过倒数第二层）；每过一层（L.mjPick 返回 next）检查一次
L.realmFloorHit = (st, n) => { if (st.sect) L.taskHit(st, 'explore', t => !!t.realm && n >= t.n); };
if (typeof L.mjPick === 'function' && typeof L.mjUnlocked === 'function') {
  L.realmTaskFloor = st => (L.MJ_ON !== false && L.mjUnlocked(st) ? { floor: Math.max(1, L.mjThRec(st, L.mjThemeNow(st).id).deep - 1), max: Math.max(1, L.mjFloors(st) - 1) } : null);
  wrap('mjPick', b => (st, i) => { const res = b(st, i); if (res && res.next) L.realmFloorHit(st, res.next - 1); return res; });
}
// 丹堂：任务多半是炼丹
L.taskActFav = st => (L.duty(st) === 'dan' ? 'craft' : null);
L.taskPoolMod = (st, pool) => { if (L.duty(st) === 'dan') { const x = pool.find(p => p[0] === 'act'); if (x) x[1] *= 1.6; } };

// ---------- 被占住的几个月（讲法、传授、事件 fx.busy）：st.retreat.kind = 'busy'，修炼 ×0、不能出门 ----------
L.startBusy = function (st, n, what, label, data) {
  if (L.busy(st) || st.p.r > L.MAXR || !(n > 0)) return false;
  st.retreat = Object.assign({ kind: 'busy', what, label, left: n, total: n, m: 0, got: 0 }, data || {});
  st.tuna = 0;
  L.log(st, `${label}：${n} 个月`, 'jade');
  return true;
};
wrap('endRetreat', b => (st, done) => {
  const r = st.retreat;
  if (!r || r.kind !== 'busy') return b(st, done);
  st.retreat = null;
  const res = { kind: 'busy', what: r.what, label: r.label, got: 0, done: !!done, epi: 0 };
  if (done) {
    if (r.what === 'lecture' && st.sect && st.sect.tasks) {
      const t = st.sect.tasks[r.task];
      if (t && t.ty === 'lecture' && !t.done) { L.taskDone(st, t); if (L.discLectured) res.disc = L.discLectured(st); res.note = '讲法完毕 贡献到手'; }
    } else if (r.what === 'teachart' && L.discTeachDone) { const x = L.discTeachDone(st, r); if (x) res.note = x.note; res.teach = x; }
    L.log(st, `${r.label}完毕`, 'jade');
  } else L.log(st, `${r.label}半途而废`);
  L.checkQuests(st);
  return res;
});

// ---------- 职司、长老恩惠、魔宗：包在各系统上 ----------
wrap('alchRate', b => st => clamp(b(st) + (L.duty(st) === 'dan' ? L.DUTY_V.alch : 0), 0.1, 0.97));
wrap('gearPlusRate', b => (st, x) => { const v = b(st, x); return v <= 0 ? v : Math.min(1, v + (L.duty(st) === 'qi' ? L.DUTY_V.plus : 0)); });
wrap('gearPlusCost', b => (st, x) => { const c = b(st, x), v = st.sect ? fav40(st, 'plusOre') : 0; return v ? Object.assign({}, c, { ore: Math.max(1, Math.round(c.ore * (1 - v))) }) : c; });
wrap('gearSmeltOre', b => x => { const v = b(x); return lastSt && L.duty(lastSt) === 'qi' ? v * L.DUTY_V.smelt : v; });
for (const f of ['gearDrop', 'gearEquip', 'gearDecide', 'gearCompare']) wrap(f, b => function (st) { lastSt = st; return b.apply(this, arguments); });
wrap('sellParts', b => (st, k) => {
  const out = b(st, k);
  if (k === 'pill' && L.duty(st) === 'dan') out.push(['丹堂', L.DUTY_V.pillSell, 'mul']);
  const v = st.sect ? fav40(st, 'sell') : 0; if (v) out.push(['赤松客', 1 + v, 'mul']);
  return out;
});
wrap('buyMult', b => (st, off) => b(st, off) * (L.duty(st) === 'wai' ? L.DUTY_V.waiBuy : 1));
wrap('bidInfo', b => (st, i, t) => {
  const o = b(st, i, t); if (!o) return o;
  const add = (L.duty(st) === 'wai' ? L.DUTY_V.waiBid : 0) + (st.sect ? fav40(st, 'bid') : 0);
  if (add) o.p = Math.min(0.99, o.p + add);
  return o;
});
wrap('calVisitMult', b => st => b(st) * (L.duty(st) === 'wai' ? L.DUTY_V.waiVisit : 1));
wrap('retCost', b => st => { const v = st.sect ? fav40(st, 'ret') : 0; return v ? Math.floor(b(st) * (1 - v)) : b(st); });
wrap('toxDecay', b => st => b(st) + (st.sect ? fav40(st, 'tox') : 0));
wrap('addMastery', b => (st, id, n) => { const v = st.sect && n > 0 ? fav40(st, 'mast') : 0; return b(st, id, v ? n * (1 + v) : n); });
wrap('leapMult', b => st => b(st) * (st.sect && st.sect.id === 'xuesha' ? L.MO_V.leap : 1) * (1 + (st.sect ? fav40(st, 'leap') : 0)));
// 药尘子 ≥ 40：灵田产量 +10%（作物制下进 L.cropParts 的拆解；没有作物制时乘在灵草上）
if (L.cropParts) wrap('cropParts', b => (st, id) => { const out = b(st, id), v = st.sect ? fav40(st, 'field') : 0; if (v) out.push(['药尘子', 1 + v]); return out; });
else wrap('fieldHerbMult', b => st => b(st) * (1 + (st.sect ? fav40(st, 'field') : 0)));
L.addExpMod('duty_zhan', 62, (st, k, d, a) => (a === 0 && L.duty(st) === 'zhan' ? ['职司·战堂（斩妖）', L.DUTY_V.slay] : null));
L.addExpMod('elder_world', 63, st => { const v = st.sect ? fav40(st, 'world') : 0; return v && L.world(st) ? ['清虚真人·天象早知', v] : null; });
// 战堂：论道所得灵石与贡献 +30%
wrap('tournament', b => st => {
  const res = b(st);
  if (res && L.duty(st) === 'zhan') for (const rd of res.rounds) if (rd.win) {
    const s = Math.floor((rd.stones || 0) * L.DUTY_V.tour); st.stones += s; rd.stones = (rd.stones || 0) + s;
    if (rd.contrib) { const c = L.addContrib(st, rd.contrib * L.DUTY_V.tour); rd.contrib += c; }
    rd.zhan = true;
  }
  return res;
});
// 执法堂：坏事上门（盗贼、踢馆、细作……）一半被挡回去
wrap('spawnVisitor', b => st => {
  const ev = b(st);
  if (!ev || L.duty(st) !== 'fa' || !L.petBadVisitor || !L.petBadVisitor(ev) || R() >= L.DUTY_V.faBad) return ev;
  st.visitor = null; st.evLast[ev.id] = st.tick;
  L.log(st, `执法堂的弟子在山门口拦下了不速之客（${L.fill(st, ev.title)}）`, 'jade');
  return null;
});
// 幽姬的绝学：宿敌在拍卖会上拍走东西，那份战力加成算你的
wrap('marketTick', b => (st, out) => {
  const steal = st.sect && fav80(st, 'aucSteal');
  const snap = steal ? st.ladder.map(x => x.pw || 1) : null;
  const r = b(st, out);
  if (snap) st.ladder.forEach((x, i) => { if ((x.pw || 1) > snap[i] + 1e-12) { const m = (x.pw || 1) / snap[i]; x.pw = snap[i]; st.bonus.atk += m - 1; L.log(st, `幽姬早有安排：${x.n}拍到的东西半路换了主，战力 +${L.pct(m - 1)} 归你`, 'gold'); } });
  return r;
});
// 魔宗不碰正道事件；执法人脉 ≥ 40 时没人敢往你房里塞禁书（sect_frame）
wrap('eligible', b => (st, ev, where, ctx) => {
  if (!b(st, ev, where, ctx)) return false;
  if (st.sect && st.sect.id === 'xuesha' && MO_SKIP.includes(ev.id)) return false;
  if (ev.id === 'sect_frame' && st.sect) { const c = L.eldersOf(st)[2]; if (c && L.on40(st, c.id)) return false; }
  return true;
});
// 执法堂：打赢上门挑战的同门另得贡献
wrap('resolveChoice', b => (st, ev, idx) => {
  const res = b(st, ev, idx);
  if (res && res.ok && res.duel && ev.id === 'sect_junior_duel' && L.duty(st) === 'fa') { const v = L.addContrib(st, L.contribFor(L.homeRegion(st)) * L.DUTY_V.faContrib); if (v) res.fx.push(`执法堂记功：贡献 +${fmt(v)}`); }
  return res;
});

// ---------- 入宗、晋升 ----------
wrap('joinSect', b => (st, id) => {
  if (!L.sectJoinable(st, id)) return false;
  const ok = b(st, id);
  if (ok) { ensure(st); L.rollVault(st); }
  return ok;
});
wrap('promote', b => st => {
  const res = b(st);
  if (res && res.ok) {
    ensure(st);
    if (st.sect.rank === 6 && st.eflags) for (const f of ['lord_vote', 'lord_gift', 'lord_duel']) delete st.eflags[f];
    if (st.sect.rank === 3 && st.eflags) delete st.eflags.heir_none;
    L.rollVault(st);
  }
  return res;
});
// 魔宗：手里的因果换贡献（每条 max(50, 一趟乙等历练的贡献)；了结那条因果）
L.karmaTradeVal = st => Math.max(L.MO_V.karma, L.contribFor(L.homeRegion(st)));
L.karmaTradeWhy = st => (!st.sect || st.sect.id !== 'xuesha' ? '只有血煞魔宗收这个' : !L.karmaOpen(st).length ? '手里没有因果' : '');
L.karmaTrade = function (st) {
  if (L.karmaTradeWhy(st)) return null;
  const rec = L.unkarma(st, 'any', 'xuesha');
  if (!rec) return null;
  const v = L.addContrib(st, L.karmaTradeVal(st)); st.sect.karmaN++;
  L.log(st, `把${rec.who}那笔账交给了血河老祖：贡献 +${fmt(v)}`, 'jade');
  return { rec, v };
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：fx.favor / duty / busy，资格 favorMin，触发键 sect:heir / sect:lord ----------
const favOk = v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => (['a', 'b', 'c'].includes(k) || !!ALL_E[k]) && Number.isInteger(v[k]) && Math.abs(v[k]) <= 50);
L.supportFx('favor', { ok: favOk, apply: (st, v, out) => {
  if (!st.sect) return;
  ensure(st);
  for (const k in v) { const x = resolveE(st, k); if (!x) continue; const d = L.addFavor(st, x.id, v[k]); if (d) out.push(`人脉 ${x.n} ${d > 0 ? '+' : ''}${d}`); }
} });
L.supportElig('favorMin', { ok: v => Array.isArray(v) && v.length === 2 && !!ALL_E[v[0]] && v[1] >= 0 && v[1] <= 100, test: (st, v) => !!st.sect && ALL_E[v[0]].sect === st.sect.id && (L.favor(st, v[0]) || 0) >= v[1] });
L.supportFx('duty', { ok: v => !!L.DUTIES[v], apply: (st, v, out) => { if (L.setDuty(st, v, true)) out.push(`职司：${L.DUTIES[v].n}`); } });
L.supportFx('busy', { ok: v => Number.isInteger(v) && v > 0 && v <= 12, apply: (st, v, out, fx, ctx) => {
  if (L.startBusy(st, v, 'event', ctx && ctx.ev ? L.fill(st, ctx.ev.title) : '奔忙')) out.push(`占住 ${v} 个月（不修炼、不能出门）`);
} });
L.supportTrigger('sect:');

// ---------- 每月（tick.js 调） ----------
L.sectTick = function (st, out) {
  if (!st.sect) return;
  const sc = ensure(st); lastSt = st;
  if (!sc.vault || st.tick % L.TOUR_EVERY === 0) { if (sc.vault && st.tick % L.TOUR_EVERY === 0) out.vault = true; L.rollVault(st); }
  if (st.tick % L.TOUR_EVERY === 0) perTourFavours(st, out);
  // 圣子之争 / 宗主之争的前夜：除了人脉以外都够了，三位长老来谈条件（各一次）
  if (sc.rank === 2 && !sc.heirEv && L.promoBaseOk(st)) { sc.heirEv = 1; L.fireTrigger(st, 'sect:heir'); out.heirEve = true; }
  if (sc.rank === 5 && !sc.lordEv && L.promoBaseOk(st)) { sc.lordEv = 1; L.fireTrigger(st, 'sect:lord'); out.lordEve = true; }
  // 魔宗：负伤月 ×2（每两个月才好一点）
  if (sc.id === 'xuesha' && st.p.inj > 0 && st.tick % 2 === 0) st.p.inj++;
  if (L.discTick) L.discTick(st, out);
};
});
