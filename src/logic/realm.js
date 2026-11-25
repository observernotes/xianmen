/* 废柴仙途 · 逻辑模块 realm：秘境（docs/SYSTEMS.md §8，docs/CONTENT.md §14.1 的 16 个“奇”房间事件）
 * 模块写法见 src/logic.js 顶部说明。名字一律用 mj（秘境）：L.REALMS 是境界表，别混。
 *
 *   进入：筑基中期解锁（第一世还要三年之约打完；转世后全开）；每年夏季（t % 12 = 4～9，calendar.js 的 L.realmWindow）开放；耗 1 枚秘境令（最多持 3，
 *     每个夏季头一个周天送 1 枚，坊市轮换货架也卖）。仙府现世（大势 w_xianfu）期间另可免令进一次：8 层、秘藏四选一。
 *   主题按年轮换（剑气·金 / 百草·木 / 熔火·火 / 幽泉·水），决定敌人五行、背景与秘藏池。
 *   一局：层数 6 + (r ≥ 4) + (r ≥ 6)；带入气血 100（法衣每阶 +5，四阶起再 +10；青帝剑 +30）；
 *     每层 2 扇门（装着天眼通或白小九同行时 3 扇），30% 是“？”门（气运饰品每阶少 5 点；天眼通全显）；最后一层固定守关。
 *   房间：战 / 精英 / 宝 / 泉 / 奇（where: 'realm' 事件）/ 悟 / 商 / 守关，数值见 L.MJ。层战力 = rec(家门口地图, 0) × 1.22^(层−1)，
 *     掉血 = clamp(30 × (层战力 / 我)^1.2, 5, 70) × 房间倍率 × (1 − 撼岳拳)；“我” = 战力 × 五行克制（×1.15 / ×0.87，SYSTEMS §1）。
 *     （§8 写的是 rec(k, 1)。tools/sim.js 量过：guided 每个夏天的战力中位数只有 rec(家门口, 1) 的 0.6 倍，第一层就掉 55 气血，
 *      两间战斗房出局，守关永远打不过；改用外围 rec(k, 0)，中段的人走到 3～4 层，境界末的人能通关。）
 *   每过一层可以【继续深入】或【带着 N 件收获离开】；气血归零 = 重伤出局：本局收获丢六成，负伤 4 周天。
 *   局中时间暂停（界面不走时）；整局结算后流逝 3 周天（L.mjCost，传送阵 9 级免除），存档随时可续（状态在 st.run）。
 *   记录（跨世，st.meta.mj）：每个主题的最深层数与通关次数；首次通关给称号；任意主题合计通关 3 次后秘藏可出《混元道经》。
 *
 *   st.run = { theme, k 家门口地图, floor 当前层（1 起）, floors, hp, max, doors [{ t 类型, unk 是否“？” }], phase 'door'|'event'|'shop'|'chest',
 *              loot [{ stones, ore, herbs, yin, treasure, pills, item: [kind, tier], frag, t 说明 }], fl { run_* 标记 }, ev 待处理的奇遇,
 *              shop [{ k, n, d, price }], chest [{ k, id, n, d }], cleared 已过层数, xf 仙府, rooms 进过的房间数, at 进入的周天 }
 *   st.mj = { token, giftYr 本年已送令, eggs 灵宠蛋（灵宠名册上线前先记着种）, runs, clears }
 *   st.meta.mj = { th: { jianqi: { deep, clears } … }, clears 合计 } */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const asArr = v => [].concat(v === undefined || v === null ? [] : v);

// L.MJ_ON = false：秘境整个关掉（tools/sim.js 的 norealm 用它量这一刀的影响）
L.MJ_ON = true;
L.MJ = {
  unlockI: 5, tokenMax: 3, cost: 3, recD: 0, powStep: 1.22,
  hp: 100, robeHp: 5, robe4: 10, qingdi: 30, maxhpDown: 20,
  doors: 2, unkP: 0.30, unkLuck: 0.05,
  dmg: { k: 30, e: 1.2, lo: 5, hi: 70 }, elite: 1.8, eliteRew: 2.5, boss: 1.3, bossTier: 1,
  dropP: 0.30, chestP: 0.70, trap: 20, trapUp: 0.10, spring: 30, insight: 10, insightFrag: 0.10,
  wipeLose: 0.6, wipeInj: 4, rew: 0.12, rewStep: 1.12, ore: 0.3, heal: 40,
  hunyuan: 3, xianfu: { floors: 8, chest: 4 }, chest: 3,
};
L.MJ_THEMES = [
  { id: 'jianqi', n: '剑气', el: 'jin', art: 'jin', d: '万剑埋骨处凝出的迷宫，剑气成兵，敌人属金', title: '万剑不侵', yin: 'thunder', pet: 'p_sun', arts: ['m_xingdou'], plans: ['f_duanhun'] },
  { id: 'baicao', n: '百草', el: 'mu', art: 'mu', d: '药王谷的地下药圃，草木成精，敌人属木', title: '百草不凋', yin: 'wood', pet: 'p_que', arts: ['z_qingdi'], plans: [] },
  { id: 'ronghuo', n: '熔火', el: 'huo', art: 'huo', d: '地火翻涌的上古器坊，炉灵成群，敌人属火', title: '浴火而归', yin: 'fire', pet: 'p_hu2', arts: ['z_fentian'], plans: [] },
  { id: 'youquan', n: '幽泉', el: 'shui', art: 'shui', d: '黄泉支流冲出的水府，阴魂游荡，敌人属水', title: '幽泉渡者', yin: 'ice', pet: 'p_he', arts: ['m_tianyan'], plans: ['g_mojiao'] },
];
const TH = {}; for (const T of L.MJ_THEMES) TH[T.id] = T;
L.mjTheme = id => TH[id] || null;
L.MJ_ROOM = {
  fight: { n: '战', d: '掉气血，得灵石、灵矿，三成掉法宝功法' },
  elite: { n: '精英', d: '气血损失 ×1.8，奖励 ×2.5，必掉一件' },
  chest: { n: '宝', d: '七成得宝（药引、残篇、灵矿…），三成是陷阱 −20 气血' },
  spring: { n: '泉', d: '气血 +30' },
  event: { n: '奇', d: '一桩秘境奇遇，二选一' },
  insight: { n: '悟', d: '当前功法熟练 +10，一成得残篇' },
  shop: { n: '商', d: '用本局得的灵石换一件东西（三选一）' },
  boss: { n: '守关', d: '精英 ×1.3；过关开秘藏三选一' },
};
L.MJ_TYPES = Object.keys(L.MJ_ROOM);
// 灵宠蛋的种（CONTENT §4）在灵宠名册上线前折成旧的单只灵宠：名字与初阶
const PET_SP = { p_tu: ['月牙兔', 1], p_hu: ['雪团灵狐', 1], p_que: ['青羽雀', 1], p_xiong: ['铁背熊', 2], p_gui: ['墓穴玄龟', 2], p_hu2: ['赤焰虎', 2], p_fu: ['血瞳蝠', 2], p_sun: ['雷翼隼', 3], p_he: ['冰羽鹤', 3], p_jiao: ['玄水蛟', 4], p_wu: ['金乌雏', 4], p_ze: ['白泽幼兽', 5] };
L.MJ_PET = PET_SP;
// 灵宠名册（pets.js）在的时候用它的种表与出战那只；不在时用上面的折算
const petInfo = id => (L.PET_SP && L.PET_SP[id] ? [L.petFormName(id, 0), L.PET_SP[id].t] : PET_SP[id] || ['灵兽', 1]);
const curPet = st => { if (L.petOut) { const p = L.petOut(st); return p ? [L.petName(p), L.petTier(p)] : null; } return st.p.pet ? [st.p.pet.name, st.p.pet.tier] : null; };
const YIN_KEYS = ['fire', 'ice', 'thunder', 'wood', 'soul'];
const yinN = k => (L.YIN_N && L.YIN_N[k]) || k;

// ---------- 状态 ----------
L.newMj = () => ({ token: 0, giftYr: -1, eggs: [], runs: 0, clears: 0 });
const mj = st => st.mj || (st.mj = L.newMj());
const rec = st => { const m = st.meta || (st.meta = L.newMeta()); const r = m.mj || (m.mj = { th: {}, clears: 0 }); r.th = r.th || {}; return r; };
L.mjRec = rec;
L.mjThRec = (st, id) => { const r = rec(st); return r.th[id] || (r.th[id] = { deep: 0, clears: 0 }); };
// 第一世还要三年之约打完（与历法同一条，calendar.js 的 L.calOpen：约战前老祖只顾着约战）
L.mjUnlocked = st => L.MJ_ON !== false && (st.rebirth > 0 || (mi(st) >= L.MJ.unlockI && !!st.pact));
L.mjTokens = st => (st.mj ? st.mj.token || 0 : 0);
L.mjAddToken = function (st, n) { const m = mj(st), b = m.token || 0; m.token = clamp(b + n, 0, L.MJ.tokenMax); return m.token - b; };
// 今年的主题：按年（12 周天一年）轮换
L.mjThemeNow = st => L.MJ_THEMES[((Math.floor(st.tick / 12) % 4) + 4) % 4];
L.mjFloors = st => 6 + (st.p.r >= 4 ? 1 : 0) + (st.p.r >= 6 ? 1 : 0);
// 仙府现世：大势期间免令进一次（每件大势一次）
L.mjXianfu = function (st) { const w = L.world && L.world(st); return w && w.id === 'w_xianfu' && !w.mj && L.mjUnlocked(st) ? w : null; };
// 进不去的原因（空串 = 能进）；xf 为真时问仙府
L.mjWhy = function (st, xf) {
  if (L.MJ_ON === false) return '秘境未开';
  if (!L.mjUnlocked(st)) return st.pact || st.rebirth ? '筑基中期后开放' : '筑基中期、三年之约之后开放';
  if (st.run) return '已在秘境中';
  if (st.p.r > L.MAXR) return '已证大道';
  if (st.exp) return '历练途中进不了秘境';
  if (st.retreat) return '闭关中进不了秘境';
  if (xf) return L.mjXianfu(st) ? '' : '仙府只在“仙府现世”期间开一次';
  const w = L.realmWindow(st);
  if (!w.open) return `入夏才开（还有 ${w.in} 周天）`;
  if (L.mjTokens(st) < 1) return '没有秘境令（每个夏季送一枚，坊市轮换货架也有）';
  return '';
};
L.mjCan = (st, xf) => !L.mjWhy(st, xf);

// ---------- 数值 ----------
L.mjMaxHp = function (st) {
  const rt = L.gearTier(st, 'r');
  let v = L.MJ.hp + L.MJ.robeHp * rt + (rt >= 4 ? L.MJ.robe4 : 0);
  if (L.artOn(st, 'z_qingdi')) v += Math.round(L.MJ.qingdi * L.artMm(st, 'z_qingdi'));
  return v;
};
L.mjHpParts = function (st) {
  const rt = L.gearTier(st, 'r'), out = [['底子', L.MJ.hp]];
  if (rt) out.push([`法衣 ${rt} 阶`, L.MJ.robeHp * rt + (rt >= 4 ? L.MJ.robe4 : 0)]);
  if (L.artOn(st, 'z_qingdi')) out.push(['青帝剑', Math.round(L.MJ.qingdi * L.artMm(st, 'z_qingdi'))]);
  return out;
};
const homeK = (st, run) => (run && run.k !== undefined ? run.k : L.homeRegion(st));
L.mjLayerPow = (st, f, run) => L.rec(homeK(st, run), L.MJ.recD) * Math.pow(L.MJ.powStep, Math.max(0, f - 1));
// “我”：战力 × 五行（攻击属性克主题 ×1.15，被克 ×0.87；藏锋免罚）
L.mjFoe = th => ({ kind: 'realm', el: (TH[th] || L.MJ_THEMES[0]).el });
L.mjElem = (st, th) => L.duelElem(st, L.mjFoe(th));
L.mjMe = (st, th) => L.power(st) * L.mjElem(st, th).m;
L.mjDmgBase = function (st, f, run, th) {
  const D = L.MJ.dmg, layer = L.mjLayerPow(st, f, run), me = Math.max(1e-9, L.mjMe(st, th || (run && run.theme) || L.mjThemeNow(st).id));
  return clamp(D.k * Math.pow(layer / me, D.e), D.lo, D.hi);
};
L.mjRoomMul = t => (t === 'elite' ? L.MJ.elite : t === 'boss' ? L.MJ.elite * L.MJ.boss : 1);
// 战斗房掉多少气血（撼岳拳 −20%×熟练）
L.mjDmg = function (st, t, f, run, th) {
  return Math.max(1, Math.round(L.mjDmgBase(st, f, run, th) * L.mjRoomMul(t) * (1 - L.artV(st, 'z_hanyue'))));
};
L.mjFight = t => t === 'fight' || t === 'elite' || t === 'boss';
// 一间战斗房的灵石、灵矿（按家门口地图腹地的历练奖励，逐层 ×1.12）
L.mjStones = (st, f, run) => Math.round(L.rew(homeK(st, run), 1) * L.MJ.rew * Math.pow(L.MJ.rewStep, f - 1));
L.mjOre = (st, f, run) => Math.max(1, Math.round(L.expOre(st, homeK(st, run), 1, 0, 1) * L.MJ.ore * Math.pow(L.MJ.rewStep, f - 1)));
const itemTier = (k, kind, up) => 1 + Math.floor((3 * k + 1) * (kind === 'a' ? 0.18 : 0.21)) + (up || 0);
L.mjUnkP = function (st) {
  if (L.artOn(st, 'm_tianyan')) return 0;
  const o = L.gearEq(st, 'o'), lt = o && L.gearRKind(o) === 'luck' ? o.t : 0;
  // 霜月狐（灵宠天赋 realmUnk，pets.js）：“？”门少一半
  return Math.max(0, L.MJ.unkP - L.MJ.unkLuck * lt) * (L.petTal && L.petTal(st, 'realmUnk') > 0 ? 0.5 : 1);
};
// 白小九同行（同伴系统上线前：st.companion === 'bai'；上线后由它提供 L.companionOn）
L.mjBai = st => (typeof L.companionOn === 'function' ? !!L.companionOn(st, 'bai') : st.companion === 'bai');
L.mjDoorN = st => L.MJ.doors + (L.artOn(st, 'm_tianyan') || L.mjBai(st) ? 1 : 0);

// ---------- 门 ----------
const DOOR_W = [['fight', 34], ['elite', 10, f => f >= 2], ['chest', 16], ['spring', 10], ['event', 15], ['insight', 8], ['shop', 7, (f, run) => f >= 3 && !run.shopN]];
const evOk = (st, run) => L.events().some(ev => L.eligible(st, ev, 'realm', { theme: run.theme }));
function rollDoors(st, run) {
  const f = run.floor;
  if (f >= run.floors) return [{ t: 'boss', unk: false }];
  const n = L.mjDoorN(st), unkP = run.fl.reveal || (run.xf && f === 1 && run.fl.map) ? 0 : L.mjUnkP(st);
  const hasEv = evOk(st, run), out = [];
  for (let i = 0; i < n; i++) {
    const list = DOOR_W.filter(x => (!x[2] || x[2](f, run)) && (x[0] !== 'event' || hasEv)).map(x => [x[0], x[1] * (out.some(d => d.t === x[0]) ? 0.3 : 1)]);
    const t = wpick(list);
    out.push({ t, unk: R() < unkP });
  }
  delete run.fl.reveal;
  return out;
}
// 门上显示的类型（“？”门不显示）
L.mjDoorShown = d => (d.unk ? 'unk' : d.t);
// 门的预估：战斗房掉多少、泉加多少（界面门卡下面那行字、guided 的选择都用它）
L.mjDoorEst = function (st, d) {
  const run = st.run; if (!run) return null;
  const t = d.unk ? 'unk' : d.t;
  if (L.mjFight(t)) { const safe = run.fl.safe || (run.fl.proxy && L.mjFight(t)); return { t, hp: safe ? 0 : -L.mjDmg(st, run.fl.elite && t === 'fight' ? 'elite' : t, run.floor, run) }; }
  if (t === 'spring') return { t, hp: Math.min(L.MJ.spring, run.max - run.hp) };
  if (t === 'chest') return { t, hp: 0, risk: -Math.round(L.MJ.trap * (L.mjTrapHalf(st) ? 0.5 : 1)) };
  return { t, hp: 0 };
};
// 老祖推荐哪扇门（界面门卡上的“荐”，sim 的 guided 也照它走）：先看会不会出事，再看收益
L.mjDoorScore = function (st, d) {
  const run = st.run, e = L.mjDoorEst(st, d);
  if (!e) return 0;
  const hp = run.hp, f = run.floor;
  if (e.t === 'boss') return -e.hp < hp ? 10 : -10;
  if (L.mjFight(e.t)) { const loss = -e.hp; if (loss >= hp) return -10; return (e.t === 'elite' ? 3.2 : 2) - 2.2 * loss / Math.max(1, hp); }
  if (e.t === 'spring') return hp + L.MJ.spring <= run.max ? 2.6 : 0.6;
  if (e.t === 'chest') return hp > L.MJ.trap + 5 ? 1.6 : -3;
  if (e.t === 'event') return hp > 30 ? 1.5 : 0.8;
  if (e.t === 'insight') return 1.2;
  if (e.t === 'shop') return L.mjPending(st).stones > 0 ? 1.4 : 0.3;
  const worst = L.mjDmg(st, f >= 2 ? 'elite' : 'fight', f, run);
  return worst >= hp ? -4 : 1.0;
};
L.mjDoorRec = function (st) { const run = st.run; if (!run || run.phase !== 'door') return -1; let b = -1, bs = -99; run.doors.forEach((d, i) => { const s = L.mjDoorScore(st, d); if (s > bs) { bs = s; b = i; } }); return b; };
// 该不该走（guided 用；界面上老祖的低气血气泡另算）：最好的门也会出事、或守关打不过、或气血见底又没有泉
L.mjShouldLeave = function (st) {
  const run = st.run;
  if (!L.mjCanLeave(st)) return false;
  const sc = run.doors.map(d => L.mjDoorScore(st, d));
  if (Math.max(...sc) < 0) return true;
  if (run.hp < 30 && !run.doors.some(d => !d.unk && d.t === 'spring')) return true;
  return false;
};
L.mjTrapP = st => Math.min(0.9, 1 - L.MJ.chestP + (st.run && st.run.fl.trapUp ? L.MJ.trapUp : 0));
L.mjTrapHalf = st => !!(st.gear && st.gear.zhentu && st.gear.zhentu.f_mizong);

// ---------- 进入 ----------
L.mjEnter = function (st, opt) {
  opt = opt || {};
  if (L.mjWhy(st, opt.xf)) return null;
  const m = mj(st);
  let th;
  if (opt.xf) { const w = L.mjXianfu(st); w.mj = 1; th = L.MJ_THEMES[((w.at || 0) % 4 + 4) % 4]; }
  else { m.token--; th = L.mjThemeNow(st); }
  const max = L.mjMaxHp(st);
  const run = { theme: th.id, k: L.homeRegion(st), floor: 1, floors: opt.xf ? L.MJ.xianfu.floors : L.mjFloors(st), hp: max, max, doors: [], phase: 'door', loot: [], fl: {}, cleared: 0, rooms: 0, at: st.tick, xf: opt.xf ? 1 : 0 };
  if (opt.xf && st.eflags && st.eflags.xianfu_map) { delete st.eflags.xianfu_map; run.fl.map = 1; }
  st.run = run;
  run.doors = rollDoors(st, run);
  m.runs = (m.runs || 0) + 1;
  st.stats.mjRuns = (st.stats.mjRuns || 0) + 1;
  L.log(st, `踏入${opt.xf ? '仙府' : th.n + '秘境'}（${run.floors} 层，气血 ${max}）`, 'gold');
  return run;
};

// ---------- 收获 ----------
function lootText(st, e) {
  const a = [];
  if (e.stones) a.push('灵石 ' + L.fmt(e.stones));
  if (e.ore) a.push('灵矿 ' + L.fmt(e.ore));
  if (e.herbs) a.push('灵草 ' + L.fmt(e.herbs));
  if (e.yin) for (const k in e.yin) a.push(yinN(k) + ' ×' + e.yin[k]);
  if (e.treasure) a.push('天材地宝 ×' + e.treasure);
  if (e.pills) a.push('破境丹 ×' + e.pills);
  if (e.item) a.push(e.item[0] === 'a' ? `${L.artTierName(Math.min(6, e.item[1]))}功法一门` : `${L.WEAPONS[Math.min(7, e.item[1])].n}级法宝一件`);
  if (e.frag) a.push(`《${L.art(e.frag).n}》残篇`);
  return a.join('、');
}
L.mjLootText = lootText;
const addLoot = (st, run, e) => { e.t = lootText(st, e); run.loot.push(e); return e; };
L.mjLootN = st => (st.run ? st.run.loot.length : 0);
L.mjPending = function (st) { const o = { stones: 0, ore: 0 }; if (st.run) for (const e of st.run.loot) { o.stones += e.stones || 0; o.ore += e.ore || 0; } return o; };
function fightLoot(st, run, t) {
  const f = run.floor, m = t === 'elite' ? L.MJ.eliteRew : t === 'boss' ? L.MJ.eliteRew * L.MJ.boss : 1;
  const e = { stones: Math.round(L.mjStones(st, f, run) * m), ore: Math.round(L.mjOre(st, f, run) * m) };
  const out = [addLoot(st, run, e)];
  if (t !== 'fight' || R() < L.MJ.dropP) {
    const kind = R() < 0.55 ? 'g' : 'a';
    out.push(addLoot(st, run, { item: [kind, Math.min(kind === 'a' ? 6 : 7, itemTier(run.k, kind, t === 'boss' ? L.MJ.bossTier : 0))] }));
  }
  return out;
}
const fragIds = st => ['x_hongmeng', 'm_xingdou'].filter(id => !L.artOwned(st, id));
function chestLoot(st, run) {
  const th = TH[run.theme], fr = fragIds(st);
  const list = [['yin', 4], ['ore', 2], ['pills', 1.5], ['herbs', 1], ['treasure', 0.8]];
  if (fr.length && st.p.r >= 2) list.push(['frag', 0.6]);
  const k = wpick(list);
  if (k === 'yin') { const y = R() < 0.5 ? th.yin : pick(YIN_KEYS); return addLoot(st, run, { yin: { [y]: ri(1, 2) } }); }
  if (k === 'ore') return addLoot(st, run, { ore: L.mjOre(st, run.floor, run) * 2 });
  if (k === 'pills') return addLoot(st, run, { pills: 1 });
  if (k === 'herbs') return addLoot(st, run, { herbs: Math.round(3 * L.herbScale(st)) });
  if (k === 'treasure') return addLoot(st, run, { treasure: 1 });
  return addLoot(st, run, { frag: pick(fr) });
}
// 把收获交到手上（离开 / 通关时全部；重伤出局时每样留四成）
function grantLoot(st, run, keep) {
  const out = { texts: [], items: [], lost: 0 };
  const tot = { stones: 0, ore: 0, herbs: 0, treasure: 0, pills: 0, yin: {} };
  // 成样的东西（法宝、功法、残篇、丹、天材地宝、药引）按件掷，留下的概率 = keep；灵石灵矿灵草按数量留 keep
  const cnt = n => (keep >= 1 ? n : Math.floor(n * keep + R()));
  for (const e of run.loot) {
    if (keep < 1 && (e.item || e.frag) && R() >= keep) { out.lost++; continue; }
    const pills = cnt(e.pills || 0), treas = cnt(e.treasure || 0);
    if (keep < 1 && (pills < (e.pills || 0) || treas < (e.treasure || 0))) out.lost++;
    tot.stones += Math.floor((e.stones || 0) * keep); tot.ore += Math.floor((e.ore || 0) * keep); tot.herbs += Math.floor((e.herbs || 0) * keep);
    tot.treasure += treas; tot.pills += pills;
    if (e.yin) for (const y in e.yin) { const n = cnt(e.yin[y]); if (n > 0) tot.yin[y] = (tot.yin[y] || 0) + n; }
    if (e.item) { const it = L.giveItem(st, e.item[0], e.item[1], undefined, { k: run.k, d: 1, src: 'realm' }); out.items.push(it); out.texts.push(L.itemText(st, it)); }
    if (e.frag) { const it = L.giveArt(st, e.frag, { src: 'realm' }); if (it) { out.items.push(it); out.texts.push(L.artItemText(st, it)); } }
  }
  if (tot.stones) { st.stones += tot.stones; out.texts.unshift('灵石 +' + L.fmt(tot.stones)); }
  if (tot.ore) { L.addOre(st, tot.ore); out.texts.unshift('灵矿 +' + L.fmt(tot.ore)); }
  if (tot.herbs) { st.herbs += tot.herbs; out.texts.push('灵草 +' + L.fmt(tot.herbs)); }
  if (tot.treasure) { st.treasure += tot.treasure; out.texts.push('天材地宝 +' + tot.treasure); }
  if (tot.pills) { st.pills += tot.pills; out.texts.push('破境丹 +' + tot.pills); }
  if (Object.keys(tot.yin).length) out.texts.push(...L.applyFx(st, { yin: tot.yin }));
  out.stones = tot.stones;
  return out;
}

// ---------- 进门 ----------
// 点第 i 扇门：结算这间房，返回 { t 房间, shown 门上画的, dmg, heal, trap, loot [], texts [], ev 奇遇, shop, chest, wipe 出局结算, floor 进门时的层 }
L.mjPick = function (st, i) {
  const run = st.run;
  if (!run || run.phase !== 'door') return null;
  const d = run.doors[i]; if (!d) return null;
  let t = d.t;
  const res = { i, t, shown: L.mjDoorShown(d), unk: d.unk, floor: run.floor, hp0: run.hp, dmg: 0, heal: 0, loot: [], texts: [] };
  if (run.fl.elite && t !== 'boss') { t = 'elite'; res.t = t; res.forced = true; delete run.fl.elite; }
  run.rooms++;
  const safe = run.fl.safe; delete run.fl.safe;
  if (L.mjFight(t)) {
    const proxy = run.fl.proxy; delete run.fl.proxy;
    if (!safe && !proxy) res.dmg = L.mjDmg(st, t, run.floor, run); else res.free = safe ? 'safe' : 'proxy';
    run.hp = Math.max(0, run.hp - res.dmg);
    if (run.hp <= 0) return wipe(st, res);
    res.loot = fightLoot(st, run, t);
    if (t === 'boss') { run.cleared = run.floor; return openChest(st, res); }
  } else if (t === 'chest') {
    if (R() < L.mjTrapP(st)) { res.trap = true; res.dmg = safe ? 0 : Math.round(L.MJ.trap * (L.mjTrapHalf(st) ? 0.5 : 1)); run.hp = Math.max(0, run.hp - res.dmg); if (run.hp <= 0) return wipe(st, res); }
    else res.loot = [chestLoot(st, run)];
  } else if (t === 'spring') {
    res.heal = Math.min(L.MJ.spring, run.max - run.hp); run.hp += res.heal;
  } else if (t === 'insight') {
    const sl = L.artSlots(st), id = sl[0] || sl[1];
    if (id) { L.addMastery(st, id, L.MJ.insight); res.texts.push(`《${L.art(id).n}》熟练 +${L.MJ.insight}`); }
    else res.texts.push('（还没修功法，悟不出什么）');
    const fr = fragIds(st);
    if (fr.length && R() < L.MJ.insightFrag) { const it = L.giveArt(st, pick(fr), { src: 'realm' }); if (it) { res.texts.push(L.artItemText(st, it)); res.items = [it]; } }
  } else if (t === 'event') {
    const ev = L.pickEvent(st, 'realm', { theme: run.theme });
    if (ev) { run.phase = 'event'; run.ev = ev.id; res.ev = ev.id; return res; }
    res.t = 'spring'; res.heal = Math.min(L.MJ.spring, run.max - run.hp); run.hp += res.heal;
  } else if (t === 'shop') {
    run.shopN = (run.shopN || 0) + 1;
    run.shop = rollShop(st, run); run.phase = 'shop'; res.shop = true; return res;
  }
  return next(st, res);
};
// 过了这间房：上到下一层（摆渡人直达终层前一层；“回头”本层换门；百草药王每层送灵草）
function next(st, res) {
  const run = st.run;
  res.hp1 = run.hp;
  if (run.fl.reroll) { delete run.fl.reroll; run.doors = rollDoors(st, run); run.phase = 'door'; res.reroll = true; return res; }
  run.cleared = run.floor;
  run.floor++;
  if (run.fl.skip) { delete run.fl.skip; if (run.floor < run.floors - 1) { res.skip = run.floors - 1 - run.floor; run.floor = run.floors - 1; run.cleared = run.floor - 1; } }
  if (run.fl.herb) { const n = L.herbScale(st); res.loot = (res.loot || []).concat([addLoot(st, run, { herbs: n })]); res.herbGift = n; }
  run.phase = 'door';
  run.doors = rollDoors(st, run);
  res.next = run.floor;
  return res;
}
// 奇遇处理完（界面在结果页【继续】之后调；fx.hp 可能已经把气血打空）
L.mjAfterEvent = function (st) {
  const run = st.run;
  if (!run || run.phase !== 'event') return null;
  run.phase = 'door'; delete run.ev;
  const res = { t: 'event', floor: run.floor, hp0: run.hp, dmg: 0, heal: 0, loot: [], texts: [] };
  if (run.hp <= 0) return wipe(st, res);
  return next(st, res);
};
// 奇遇里选完一项（L.resolveChoice 之后）不想等界面时也可以直接调：sim 用
L.mjEventNow = st => (st.run && st.run.phase === 'event' ? L.eventById(st.run.ev) : null);

// ---------- 商 ----------
// 价：坊市有的按坊市价（丹 ×1、寻宝 ×1.2、灵矿每筐 ×0.9），回春散与药引按这一层一间战斗房的灵石
const SHOP = [
  { k: 'heal', n: '回春散', c: 0.5 }, { k: 'pill', n: '破境丹', m: 'pill', c: 1 }, { k: 'yin', n: '药引两味', c: 0.5 },
  { k: 'gear', n: '法宝一件', m: 'box', c: 1.2 }, { k: 'art', n: '功法一门', m: 'box', c: 1.2 }, { k: 'ore', n: '灵矿三筐', m: 'ore', c: 2.7 },
];
function rollShop(st, run) {
  const u = L.mjStones(st, run.floor, run), th = TH[run.theme];
  const list = SHOP.slice(), out = [];
  while (out.length < 3 && list.length) {
    const x = list.splice(Math.floor(R() * list.length), 1)[0];
    const o = { k: x.k, n: x.n, price: Math.max(1, Math.round((x.m ? L.price(st, x.m) : u) * x.c)) };
    if (x.k === 'heal') o.d = `气血 +${L.MJ.heal}`;
    if (x.k === 'pill') o.d = '破境丹 +1';
    if (x.k === 'yin') { o.y = th.yin; o.d = `${yinN(th.yin)} ×2`; }
    if (x.k === 'gear') { o.tier = itemTier(run.k, 'g', 0); o.d = `${L.WEAPONS[Math.min(7, o.tier)].n}级法宝，走对比卡`; }
    if (x.k === 'art') { o.tier = itemTier(run.k, 'a', 0); o.d = `${L.artTierName(Math.min(6, o.tier))}功法`; }
    if (x.k === 'ore') o.d = `灵矿 +${L.fmt(L.oreBasket(st) * 3)}`;
    out.push(o);
  }
  return out;
}
L.mjShopWhy = function (st, i) {
  const run = st.run, o = run && run.shop && run.shop[i];
  if (!o) return '没有这件';
  if (o.k === 'heal' && run.hp >= run.max) return '气血是满的';
  if (L.mjPending(st).stones < o.price) return `本局灵石不够（有 ${L.fmt(L.mjPending(st).stones)}）`;
  return '';
};
// 买第 i 件（i < 0 = 不买，走）：从本局收获的灵石里扣
L.mjShop = function (st, i) {
  const run = st.run;
  if (!run || run.phase !== 'shop') return null;
  const res = { t: 'shop', floor: run.floor, hp0: run.hp, dmg: 0, heal: 0, loot: [], texts: [] };
  if (i >= 0 && !L.mjShopWhy(st, i)) {
    const o = run.shop[i];
    let left = o.price;
    for (let j = run.loot.length - 1; j >= 0 && left > 0; j--) { const e = run.loot[j]; if (!e.stones) continue; const d = Math.min(e.stones, left); e.stones -= d; left -= d; e.t = lootText(st, e); }
    run.loot = run.loot.filter(e => lootText(st, e));
    res.bought = o;
    if (o.k === 'heal') { res.heal = Math.min(L.MJ.heal, run.max - run.hp); run.hp += res.heal; }
    else if (o.k === 'pill') res.loot.push(addLoot(st, run, { pills: 1 }));
    else if (o.k === 'yin') res.loot.push(addLoot(st, run, { yin: { [o.y]: 2 } }));
    else if (o.k === 'gear') res.loot.push(addLoot(st, run, { item: ['g', Math.min(7, o.tier)] }));
    else if (o.k === 'art') res.loot.push(addLoot(st, run, { item: ['a', Math.min(6, o.tier)] }));
    else if (o.k === 'ore') res.loot.push(addLoot(st, run, { ore: L.oreBasket(st) * 3 }));
  }
  delete run.shop;
  return next(st, res);
};

// ---------- 秘藏 ----------
// 守关打过：主题的独有功法 / 器方或阵图 / 灵宠蛋 / 天材地宝 / 药引；合计通关 3 次后另有《混元道经》。仙府四选一
function chestOpts(st, run) {
  const th = TH[run.theme], n = run.xf ? L.MJ.xianfu.chest : L.MJ.chest, out = [];
  const total = rec(st).clears || 0;
  if (total + 1 >= L.MJ.hunyuan && !L.artOwned(st, 'x_hunyuan')) out.push({ k: 'art', id: 'x_hunyuan' });
  const pool = [];
  for (const id of th.arts) if (!L.artOwned(st, id)) pool.push({ k: 'art', id });
  for (const id of th.plans) if (!(L.planOwned(st, id) || (st.gear && st.gear.zhentu && st.gear.zhentu[id]))) pool.push({ k: 'plan', id });
  if (L.mjChestExtra) for (const x of L.mjChestExtra(st, run)) if (!pool.some(y => y.id === x.id)) pool.push(x);   // 仙府秘藏的迷踪阵图（buildings.js）
  pool.push({ k: 'pet', id: th.pet });
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  const fill = [{ k: 'treasure', n: 2 }, { k: 'yin', id: th.yin, n: 3 }, { k: 'stones', n: 15 }];
  for (const x of fill) if (out.length < n) out.push(x);
  for (const o of out) chestDesc(st, o);
  return out;
}
function chestDesc(st, o) {
  if (o.k === 'art') { const A = L.art(o.id); o.n = `《${A.n}》`; o.d = `${L.artTierName(A.t)}${L.ART_CAT[A.k]} · ${L.elName(A.el)} · ${A.pool === 'frag' ? `残篇（${(st.arts.frag[o.id] || 0)}/3）· ` : ''}${L.artDesc(st, o.id)}`; }
  else if (o.k === 'plan') { if (L.PLAN[o.id]) { const P = L.PLAN[o.id]; o.n = `器方《${P.n}》`; o.d = `${L.GEAR_N[P.slot]} ${L.gearTierName(P.slot, P.t)}，${P.aff.map(a => L.AFFIX[a].n).join('、')}（化神后器炉打造）`; } else { o.n = `阵图《${L.ZHENTU[o.id]}》`; o.d = L.zhenEffect ? `【洞府】聚灵阵上布阵：${L.zhenEffect(st, o.id)}` : '阵法上线前先收着'; } }
  else if (o.k === 'pet') { const P = petInfo(o.id), c = curPet(st); o.n = `灵宠蛋【${P[0]}】`; o.d = `${L.PETS[P[1]].n}，孵出来就是你的${c ? `（出战的${c[0]}是${L.PETS[c[1]].n}）` : ''}`; }
  else if (o.k === 'treasure') { o.n = `天材地宝 ×${o.n}`; o.d = `手里 ${st.treasure}，洗髓、九转、重铸都用它`; o.cnt = 2; }
  else if (o.k === 'yin') { o.n = `${yinN(o.id)} ×${o.n}`; o.d = '炼丹、打造用的药引'; o.cnt = 3; }
  else if (o.k === 'stones') { o.v = Math.floor(Math.max(L.income(st), 20) * o.n); o.n = `灵石 ${L.fmt(o.v)}`; o.d = `约 ${15} 个周天的收入`; }
  return o;
}
// 老祖推荐哪一项（序号 + 一句带数字的理由）
L.mjChestRec = function (st, opts) {
  opts = opts || (st.run && st.run.chest) || [];
  let best = -1, why = '', sc = -1;
  opts.forEach((o, i) => {
    let s = 0, w = '';
    if (o.k === 'art' && o.id === 'x_hunyuan') { s = 10; w = '三门功法视为同属性，通用共鸣 +10% 一直在'; }
    else if (o.k === 'art') { const b = L.artBetter(st, o.id); s = b ? 8 : L.art(o.id).pool === 'frag' ? 6 : 5; w = b ? '比你现在装的强，拿了就能换上' : L.art(o.id).pool === 'frag' ? `残篇 ${(st.arts.frag[o.id] || 0)} → ${(st.arts.frag[o.id] || 0) + 1}/3，别处难得` : '秘境独有，别处得不到'; }
    else if (o.k === 'plan') { s = 6; w = '器方阵图只在这里出'; }
    else if (o.k === 'pet') { const P = petInfo(o.id), c = curPet(st), cur = c ? c[1] : 0; s = P[1] > cur ? 7 : 2; w = P[1] > cur ? `灵宠 ${L.PETS[cur].n} → ${L.PETS[P[1]].n}：战力 ×${(L.PETS[P[1]].m / L.PETS[cur].m).toFixed(2)}` : ''; }
    else if (o.k === 'treasure') { s = st.treasure < 3 ? 4 : 3; w = `天材地宝手里只有 ${st.treasure}`; }
    else if (o.k === 'yin') s = 2.5;
    else s = 2;
    if (s > sc) { sc = s; best = i; why = w; }
  });
  return { i: best, why };
};
function openChest(st, res) {
  const run = st.run;
  // 百草药王（run_herb_gift）的后半：守关后木引 ×2
  if (run.fl.herb) res.loot.push(addLoot(st, run, { yin: { wood: 2 } }));
  run.chest = chestOpts(st, run); run.phase = 'chest'; res.chest = true; res.hp1 = run.hp;
  return res;
}
// 秘藏选第 i 项，然后通关结算
L.mjChest = function (st, i) {
  const run = st.run;
  if (!run || run.phase !== 'chest') return null;
  const o = run.chest[i] || run.chest[0];
  const got = { o, texts: [], items: [] };
  if (o.k === 'art') { const it = L.giveArt(st, o.id, { src: 'realm' }); if (it) { got.items.push(it); got.texts.push(L.artItemText(st, it)); } }
  else if (o.k === 'plan') got.texts.push(L.givePlan(st, o.id));
  else if (o.k === 'pet') { const fx = L.applyFx(st, { pet: o.id }); got.texts.push(...fx); if (fx.item) got.items.push(fx.item); }
  else if (o.k === 'treasure') { st.treasure += o.cnt; got.texts.push('天材地宝 +' + o.cnt); }
  else if (o.k === 'yin') got.texts.push(...L.applyFx(st, { yin: { [o.id]: o.cnt } }));
  else if (o.k === 'stones') { st.stones += o.v; got.texts.push('灵石 +' + L.fmt(o.v)); }
  L.log(st, `秘藏：${o.n}`, 'gold');
  const sum = finish(st, 'clear');
  sum.chest = got;
  return sum;
};

// ---------- 离开 / 出局 / 通关 ----------
L.mjCanLeave = st => !!st.run && st.run.phase === 'door' && st.run.cleared >= 1;
L.mjLeave = function (st) { if (!L.mjCanLeave(st)) return null; return finish(st, 'leave'); };
function wipe(st, res) {
  res.hp1 = 0; res.wipe = finish(st, 'wipe');
  return res;
}
// 传送阵 9 级免除（buildings.js 的 L.portalLv；nohome2 时没有传送阵，恒为 3）
L.mjCost = st => ((L.portalLv ? L.portalLv(st) : (st.home && st.home.portal) || 0) >= 9 ? 0 : L.MJ.cost);
function finish(st, how) {
  const run = st.run, th = TH[run.theme], r = L.mjThRec(st, run.theme), R0 = rec(st), m = mj(st);
  const n = run.loot.length;
  const g = grantLoot(st, run, how === 'wipe' ? 1 - L.MJ.wipeLose : 1);
  const deep = how === 'clear' ? run.floors : run.cleared;
  const sum = { how, theme: run.theme, floors: run.floors, deep, n, got: g, xf: run.xf, newDeep: deep > r.deep, ticks: L.mjCost(st), hpLeft: run.hp, max: run.max };
  r.deep = Math.max(r.deep, deep);
  if (how === 'clear') {
    r.clears++; R0.clears = (R0.clears || 0) + 1; m.clears = (m.clears || 0) + 1;
    st.stats.mjClears = (st.stats.mjClears || 0) + 1;
    if (r.clears === 1) { sum.first = th.title; L.grantTitle(st, th.title); L.log(st, `首次打穿${th.n}秘境，获得称号「${th.title}」`, 'gold'); }
  }
  if (how === 'wipe') { st.p.inj = Math.max(st.p.inj, L.MJ.wipeInj); sum.inj = L.MJ.wipeInj; }
  st.stats.mjDeep = Math.max(st.stats.mjDeep || 0, deep);
  st.run = null;
  for (const f in st.eflags || {}) if (/^run_/.test(f)) delete st.eflags[f];
  const nm = run.xf ? '仙府' : th.n + '秘境';
  if (how === 'wipe') L.log(st, `${nm}第 ${run.floor} 层重伤出局，收获丢了六成，负伤 ${L.MJ.wipeInj} 周天`, 'red');
  else if (how === 'clear') L.log(st, `打穿${nm}（${run.floors} 层），带回 ${n} 件收获`, 'gold');
  else L.log(st, `从${nm}第 ${run.floor} 层全身而退，带回 ${n} 件收获`, 'jade');
  emit('mjEnd', sum);
  L.checkQuests(st);
  return sum;
}

// ---------- 每周天：夏季送令 ----------
L.mjTick = function (st, out) {
  if (!L.mjUnlocked(st) || st.p.r > L.MAXR) return;
  const w = L.realmWindow(st), yr = Math.floor(st.tick / 12), m = mj(st);
  if (w.open && m.giftYr !== yr) {
    m.giftYr = yr;
    const got = L.mjAddToken(st, 1);
    out.mjOpen = { theme: L.mjThemeNow(st).id, got, left: w.left };
    L.log(st, `入夏，${L.mjThemeNow(st).n}秘境开了（${w.left} 周天）${got ? '，送来一枚秘境令' : '（秘境令已满 3 枚）'}`, 'gold');
  }
};

// ---------- 存档 ----------
// 幂等：缺的补默认值，坏的走到一半的局清掉（只在 v6 档上加字段，不改版本号）
L.migrateRealm = function (s) {
  if (s.run === undefined) s.run = null;
  const r = s.run;
  if (r && (typeof r !== 'object' || !TH[r.theme] || !Array.isArray(r.doors) || !Array.isArray(r.loot) || !(r.floor >= 1) || !(r.floors >= r.floor) || typeof r.hp !== 'number')) s.run = null;
  else if (r) {
    r.fl = r.fl && typeof r.fl === 'object' ? r.fl : {};
    if (!['door', 'event', 'shop', 'chest'].includes(r.phase)) r.phase = 'door';
    if (r.phase === 'event' && !L.eventById(r.ev)) r.phase = 'door';
    if (r.phase === 'shop' && !Array.isArray(r.shop)) r.phase = 'door';
    if (r.phase === 'chest' && !Array.isArray(r.chest)) r.phase = 'door';
    if (r.phase === 'door' && !r.doors.length) r.doors = rollDoors(s, r);
    r.max = r.max > 0 ? r.max : L.MJ.hp; r.cleared = r.cleared || 0; r.rooms = r.rooms || 0;
  }
  const d = L.newMj(), m = s.mj && typeof s.mj === 'object' ? s.mj : d;
  for (const k in d) if (m[k] === undefined) m[k] = d[k];
  if (!Array.isArray(m.eggs)) m.eggs = [];
  m.token = clamp(Math.floor(+m.token || 0), 0, L.MJ.tokenMax);
  s.mj = m;
  if (s.meta) rec(s);
};

// ---------- 事件能力（docs/EVENT_INTEGRATION.md） ----------
// where: 'realm'（“奇”房间）；elig.theme（主题）；fx.hp（本局气血 ±n，只在秘境里有意义）；fx.token / cost.token（秘境令）
L.supportWhere('realm');
L.supportElig('theme', { where: ['realm'], ok: v => !!TH[v], test: (st, v, ev, where, ctx) => ((ctx && ctx.theme) || (st.run && st.run.theme)) === v });
L.supportFx('hp', { where: ['realm'], ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => {
  const r = st.run; if (!r) return;
  const b = r.hp; r.hp = clamp(r.hp + v, 0, r.max);
  out.push(`气血 ${v > 0 ? '+' : '−'}${Math.abs(r.hp - b) || Math.abs(v)}（${r.hp}/${r.max}）`);
} });
L.supportFx('token', { ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => { const d = L.mjAddToken(st, v); out.push(`秘境令 ${d >= 0 ? '+' : '−'}${Math.abs(d)}（${L.mjTokens(st)}/${L.MJ.tokenMax}）`); } });
L.supportCost('token', { ok: (st, v) => L.mjTokens(st) >= v, pay: (st, v) => { L.mjAddToken(st, -v); }, text: (st, v) => '秘境令 ' + v });
// run_*：只在本局有效（ev_realm_rivals.js 文件头）。引擎把它从 st.eflags 挪进 st.run.fl，出秘境清掉
const RUN_FLAGS = { run_reveal: 'reveal', run_elite: 'elite', run_reroll: 'reroll', run_trap_up: 'trapUp', run_herb_gift: 'herb', run_proxy: 'proxy', run_safe: 'safe', run_skip: 'skip' };
const flagPrev = L.CAPS.fx.flag;
L.supportFx('flag', { apply: (st, v, out, fx, ctx) => {
  if (flagPrev && flagPrev.apply) flagPrev.apply(st, v, out, fx, ctx);
  for (const f of asArr(v)) {
    if (!/^run_/.test(f)) continue;
    delete st.eflags[f];
    const run = st.run; if (!run) continue;
    if (RUN_FLAGS[f]) {
      run.fl[RUN_FLAGS[f]] = 1;
      if (f === 'run_reveal') out.push('下一层的门全看清了');
      if (f === 'run_elite') out.push('下一间房是精英');
      if (f === 'run_reroll') out.push('这一层换门');
      if (f === 'run_trap_up') out.push('本局陷阱 +10%');
      if (f === 'run_herb_gift') out.push('之后每层送灵草');
      if (f === 'run_proxy') out.push('下一间战斗房不掉气血');
      if (f === 'run_safe') out.push('下一间房不掉气血');
      if (f === 'run_skip') out.push(`直达第 ${run.floors - 1} 层`);
    } else if (f === 'run_maxhp_down') { run.max = Math.max(10, run.max - L.MJ.maxhpDown); run.hp = Math.min(run.hp, run.max); out.push(`本局气血上限 −${L.MJ.maxhpDown}（${run.hp}/${run.max}）`); }
    else if (f === 'run_melt') {
      const j = run.loot.map((e, k) => k).reverse().find(k => run.loot[k].item || run.loot[k].frag);
      if (j !== undefined) { out.push(`熔掉了本局收获里的${run.loot[j].t}`); run.loot.splice(j, 1); } else out.push('（本局还没捡到法宝，炉子吃了一块碎铁）');
    }
  }
} });

// ---------- 别的系统还没接入时，秘境事件用到的键先在秘境里收着（只对 where: 'realm' 的事件放行） ----------
// 对应的系统（药引与炼丹、因果、兽粮与灵宠、丹毒、长老人脉、宿敌恩怨）上线时会不限 where 地重新登记，覆盖这里的。
// 这里只在“还没有人登记过”时登记，所以加载顺序不影响。
const stub = (kind, key, o) => { if (!L.CAPS[kind][key]) L['support' + kind[0].toUpperCase() + kind.slice(1)](key, Object.assign({ where: ['realm'], stub: true }, o)); };
const yinOk = v => !!v && typeof v === 'object' && Object.keys(v).length > 0 && Object.keys(v).every(k => YIN_KEYS.includes(k) && Number.isInteger(v[k]) && v[k] > 0);
const yinBag = st => { const y = st.yin && typeof st.yin === 'object' ? st.yin : (st.yin = {}); for (const k of YIN_KEYS) y[k] = y[k] || 0; return y; };
stub('fx', 'yin', { ok: yinOk, apply: (st, v, out) => { const y = yinBag(st); for (const k in v) { y[k] += v[k]; out.push(`${yinN(k)} +${v[k]}`); } } });
stub('cost', 'yin', { ok: (st, v) => { const y = yinBag(st); return Object.keys(v).every(k => y[k] >= v[k]); }, pay: (st, v) => { const y = yinBag(st); for (const k in v) y[k] = Math.max(0, y[k] - v[k]); }, text: (st, v) => Object.keys(v).map(k => `${yinN(k)} ${v[k]}`).join('、') });
stub('fx', 'karma', { ok: v => typeof v === 'string' && !!v, apply: (st, v, out) => { st.karma = st.karma && typeof st.karma === 'object' ? st.karma : {}; st.karma[v] = st.tick; out.push('结下一段因果'); } });
stub('fx', 'recipe', { ok: v => typeof v === 'string' && !!v, apply: (st, v, out) => { st.recipeNote = (st.recipeNote || 0) + 1; out.push('记下一张没见过的丹方（丹方图鉴上线后揭晓）'); } });
stub('fx', 'feed', { ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => { st.feed = Math.max(0, (st.feed || 0) + v); out.push(`兽粮 ${v > 0 ? '+' : '−'}${Math.abs(v)}`); } });
stub('fx', 'toxin', { ok: v => Number.isInteger(v) && v !== 0, apply: (st, v, out) => { st.toxin = clamp((st.toxin || 0) + v, 0, 100); out.push(`丹毒 ${v > 0 ? '+' : '−'}${Math.abs(v)}（${st.toxin}/100）`); } });
const ELDER_N = { yun: '丹云婆婆' };
stub('fx', 'favor', { ok: v => !!v && typeof v === 'object' && Object.values(v).every(Number.isInteger), apply: (st, v, out) => { st.favor = st.favor && typeof st.favor === 'object' ? st.favor : {}; for (const id in v) { st.favor[id] = clamp((st.favor[id] || 0) + v[id], -100, 100); out.push(`${ELDER_N[id] || id}的人脉 ${v[id] > 0 ? '+' : '−'}${Math.abs(v[id])}`); } } });
const rivalN = (st, id) => { const x = st.ladder && st.ladder.find(y => y.id === id); return x ? x.n : id; };
stub('fx', 'grudge', { ok: v => !!v && typeof v === 'object' && Object.values(v).every(Number.isInteger), apply: (st, v, out) => { st.grudge = st.grudge && typeof st.grudge === 'object' ? st.grudge : {}; for (const id in v) { st.grudge[id] = clamp((st.grudge[id] || 0) + v[id], 0, 100); out.push(`与${rivalN(st, id)}的恩怨 ${v[id] > 0 ? '+' : '−'}${Math.abs(v[id])}`); } } });
stub('elig', 'grudge', { ok: v => Array.isArray(v) && v.length === 3, test: (st, v) => { const g = (st.grudge && st.grudge[v[0]]) || 0; return g >= v[1] && g <= v[2]; } });
// 灵宠蛋：灵宠名册上线前折成旧的单只灵宠（更好才换，否则折灵石），种记进 st.mj.eggs 留给名册
stub('fx', 'pet', { ok: v => !!PET_SP[v], apply: (st, v, out) => {
  const P = PET_SP[v]; mj(st).eggs.push(v);
  const it = L.giveItem(st, 'pet', P[1], P[0]);
  out.push(`得灵宠蛋【${P[0]}】：` + L.itemText(st, it)); out.item = it;
} });
});
