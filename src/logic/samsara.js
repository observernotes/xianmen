/* 废柴仙途 · 逻辑模块 samsara：轮回（DESIGN v1 §8.5 + SYSTEMS §16）——道果、轮回殿、出身、天道试炼、传承
 * 模块写法见 src/logic.js 顶部说明。
 *
 * 道果（L.daoFruit，结算界面逐项列出来源）：
 *   v1：10 × 最高小层序号（0～36）+ 3 × (100 − 最高名次) + 40 × 宗门身份 + 20 × (10 − 宗门最高名次) + 15 × 首领 + 30 × 知己 + 50 道侣 + 5 × 成就 + 500 飞升
 *   §16：图鉴新格 ×2（codex.js）、秘境最深层 ×10、徒弟出师 ×60（disciples.js 的 L.discGraduated）、道基总和 ×10 与了结的因果 ×15（dao.js 的 L.daoFruitParts）、
 *        这一世集齐的图鉴类 ×40；然后 × 天道试炼系数（1 + 每条试炼的加成），× 未了因果（每条 −2%，L.karmaRebirth）。
 *   结算一次（L.settle）：记结局进图鉴、道果进 st.meta.daoguo（轮回殿的余额，跨世）。
 * 轮回殿（L.HALL）：v1 的宿慧 / 根骨 / 家底 / 前世法宝 / 老祖的记性 / 命格多一选 / 气运 / 出身，加 §16 的五个：
 *   功法槽提前、名册 +1、识五行、宿慧丹方、第二传承功法。等级存 st.meta.perk[id]（宿慧 wis、根骨 bone、家底 purse 的效果在 core.js）。
 * 出身（L.ORIGINS，CONTENT §11）：弃徒（默认）、丹童、魔门遗孤、守墓人之后、散修丹师、御兽遗脉；只在转世时可选（第一世永远是弃徒，三年之约门槛不受影响）。
 *   各有开局资源、开场、约战变体（L.pactText，界面 samsara.js 用）、专属奇遇链（chains.js 读 L.ORIGINS[].chain，或开局就做完第 1 步）。
 * 天道试炼（L.TRIALS）：v1 五条 + §16 三条（五行缺一、孤星、无宗），可多选，道果系数相加。
 * 传承（L.legacyCands / meta.legacy）：一门圆满或化境的功法（下一世从小成起；第二传承功法可带两门）、一件法宝的器灵（下一世第一件同槽法宝带它一条词条）、
 *   一只五心灵宠的血脉（下一世第一枚蛋必为该种）。三样都可以带。
 * 存档：st.trials、st.trialEl、st.legacy、st.settle（每世）；st.meta.daoguo、st.meta.perk、st.meta.legacy、st.meta.trialHint（跨世）。L.migrateSamsara 幂等。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const perk = (st, k) => ((st && st.meta && st.meta.perk) || {})[k] || 0;
L.perk = perk;
const trialOn = (st, id) => !!(st && Array.isArray(st.trials) && st.trials.includes(id));
L.trialOn = trialOn;
const mr = st => (L.mr ? L.mr(st) : st.p.r);

// ---------- 出身（CONTENT §11） ----------
L.ORIGINS = {
  qitu: { n: '弃徒', d: '杂灵根，会觉醒；主线全套', start: '默认出身', sects: '三正宗',
    open: ['天剑宗外门。“杂灵根也配修仙？滚出山门！”', '同一天，婚约也被当众撕毁。', '当夜，破庙里一枚锈戒指微微发烫。'] },
  dantong: { n: '丹童', d: '丹炉 2 级、葛老一心、已知 3 格丹方；《丹经七页》第一步已完成', start: '丹炉 2 级 · 葛老一心 · 3 格丹方', sects: '三正宗（丹霞谷以内门起步）', chainDone: 'ch_danjing',
    open: ['丹霞谷山脚，你给葛老烧了七年炉火。', '谷里的少主丹红袖当着满堂丹师把你的丹倒进了泔水桶：“烧火的也配开炉？三年后丹会，你敢来，我就让你连火都点不着。”', '那夜炉灰里滚出一枚锈戒指，老祖打了个哈欠：“这丫头的火候，差得远。”'],
    pact: { who: '丹红袖', f: 1, img: 'hongxiu', title: '丹会之约', place: '丹霞谷丹会', intro: '丹会之期已到。丹霞谷的斗丹台下围满了人：先比丹，再动手——这是丹会的老规矩。', quote: '丹红袖：“一个烧火的丹童，也配和我同台？”', win: '一炉丹出，香飘满谷；一掌落定，丹红袖退下斗丹台。“火候是我输了，”她咬着唇，“人，我还没输。”', lose: '丹红袖收了丹炉：“烧火的，回去再烧三年吧。”你把那炉没炼成的丹收进了怀里。' } },
  moyi: { n: '魔门遗孤', d: '一件法器、夜璃一心、生来背着两条因果；可入血煞魔宗', start: '法器 · 夜璃一心 · 因果 +2', sects: '血煞魔宗、三正宗（入正宗要过“洗心”）', chain: 'ch_fire',
    open: ['正道围剿血煞旧坛那一夜，你被一个穿红衣的孩子塞进了枯井。', '十年后，血无涯的跟班厉枭把你从井边拎起来：“血池之约，三年后你若不来，我就把你那位小恩人的名字刻进血池。”', '井底的锈戒指亮了：“魔门的孩子？无妨。剑是什么颜色，看握剑的人。”'],
    pact: { who: '厉枭', img: 'lixiao', title: '血池之约', place: '血池边', intro: '血池之期已到。血煞旧坛的废墟上站满了看热闹的魔修，厉枭坐在池边磨刀。', quote: '厉枭：“遗孤就该待在井底。上来做什么？”', win: '血池翻起一层浪。厉枭的刀断成三截，他跪在池边，第一次正眼看你。', lose: '厉枭的刀背拍在你脸上：“下回带够血来。”你记下了这一刀。' } },
  shoumu: { n: '守墓人之后', d: '一件法器、先天剑骨；筑基前不能开灵田；上古剑冢从筑基开放', start: '法器 · 先天剑骨', sects: '三正宗',
    open: ['你家世代守着上古剑冢外的一片祖坟，坟比人多，剑比坟多。', '黑风寨的少寨主雷豹看上了那片坟地：“三年后，祖坟之约。输了，坟归我，你滚。”', '守墓的老父亲临终前塞给你一枚锈戒指：“它比坟还老。”'],
    pact: { who: '雷豹', img: 'lei', title: '祖坟之约', place: '祖坟前', intro: '祖坟之期已到。雷豹带着半个黑风寨堵在坟地口，坟头的草被踩平了一片。', quote: '雷豹：“守墓的，今天就给你挑块好地方。”', win: '一剑过去，雷豹的大刀插进了自家祖传的石碑。他爬起来就跑，跑出十里才敢回头。', lose: '雷豹在坟前插了一面黑旗。你没拔，你说三年后连旗带人一起拔。' } },
  sanxiu: { n: '散修丹师', d: '灵石 +300、行情开、出售价 +15%；不会觉醒，灵根看命格；不入宗时坊市货架多两格；专属链《卖茶翁》', start: '灵石 +300 · 卖价 +15%', sects: '三正宗，或不入宗', chain: 'ch_tea',
    open: ['坊市最末一间铺面，你挂起了“散修丹师”的木牌，卖些止血散、聚气丹。', '坊市恶霸钱通把你的木牌劈成两半：“这条街的铺子都姓钱。三年后铺面之约，赢了铺子归你，输了人归我。”', '收拾木牌那晚，你在柜台缝里抠出一枚锈戒指。'],
    pact: { who: '钱通', img: 'qian', title: '铺面之约', place: '坊市长街', intro: '铺面之期已到。坊市长街两边的铺子都关了门，掌柜们从门缝里看。', quote: '钱通：“这条街的铺子，从来都姓钱。”', win: '钱通的金算盘碎了一地。他捂着脸滚出长街，你把劈成两半的木牌重新钉了回去。', lose: '钱通在你铺子门口贴了张封条。你没撕，你说三年后连本带利。' } },
  yushou: { n: '御兽遗脉', d: '一只月牙兔、驭兽诀；灵宠名册 +1；自身战力 ×0.9；《狐族秘地》第一步已完成', start: '月牙兔 · 驭兽诀 · 名册 +1', sects: '三正宗', chainDone: 'ch_fox', atk: 0.9,
    open: ['御兽山的一支旁系，到你这一代只剩一只月牙兔和一卷驭兽诀。', '御兽山少主驭天风骑着白狼从你门前过，把兔子吓得钻进了灶膛：“三年后驭兽之约，你那只兔子要是还活着，就带来。”', '兔子从灶灰里叼出一枚锈戒指，还梦见了一只九尾的白狐。'],
    pact: { who: '驭天风', img: 'yutian', title: '驭兽之约', place: '御兽山前', intro: '驭兽之期已到。御兽山前的斗兽场里，驭天风的白狼在笼子里来回踱步。', quote: '驭天风：“兔子？我的狼一口一个。”', win: '白狼夹着尾巴缩回了笼子，驭天风愣在原地。你的兔子在场中央啃起了草。', lose: '驭天风大笑而去。兔子蹭着你的手，一点也不知道丢人。' } },
};
L.ORIGIN_IDS = Object.keys(L.ORIGINS);
L.originOf = st => L.ORIGINS[(st && st.origin) || 'qitu'] || L.ORIGINS.qitu;
// 出身是否可选：弃徒总是；其余要在轮回殿点亮
L.originOpen = (st, id) => id === 'qitu' || perk(st, 'o_' + id) > 0;
// 约战变体（弃徒用原来的三年之约，返回 null）
L.pactText = st => { const O = L.originOf(st); return O.pact || null; };
L.exTa = st => { const pt = L.pactText(st); return pt ? (pt.f ? '她' : '他') : st.p.look.f ? '他' : '她'; };
{ const nb0 = L.nextBig; L.nextBig = function (st) { const b = nb0(st); if (b && b.k === 'pact') { const pt = L.pactText(st); if (pt) b.n = pt.title; } return b; }; }
// 非弃徒出身：退婚、慕容家那一套事件不出
const EX_RE = /退婚|婚约|婚书|慕容/;
const exOnly = new Map();
L.originSkip = function (st, ev) {
  if (!st || (st.origin || 'qitu') === 'qitu' || !ev) return false;
  let v = exOnly.get(ev);
  if (v === undefined) { v = EX_RE.test(JSON.stringify([ev.title, ev.text, ev.choices])); exOnly.set(ev, v); }
  return v;
};
// 资格字段：origin（这一世的出身是它 / 在这几个里）、sectId（拜的是这几个宗门之一）
L.supportElig('origin', { ok: v => [].concat(v).every(x => !!L.ORIGINS[x]), test: (st, v) => [].concat(v).includes(st.origin || 'qitu') });
L.supportElig('sectId', { ok: v => [].concat(v).length > 0, test: (st, v) => !!st.sect && [].concat(v).includes(st.sect.id) });
{ const el0 = L.eligible; L.eligible = (st, ev, where, ctx) => !L.originSkip(st, ev) && el0(st, ev, where, ctx); }
// 魔门遗孤生来背着的两条因果
Object.assign(L.KARMA, { moyi_a: { who: '血煞旧坛下的冤魂', n: '魔门的血债（生来就背着）' }, moyi_b: { who: '正道围剿时死去的那家人', n: '父辈欠下的命（生来就背着）' } });

// 出身的效果
L.addAtkMod('origin', 52, st => { const O = L.originOf(st); return O.atk && O.atk !== 1 ? ['出身·' + O.n, O.atk, ''] : null; });
{ const f0 = L.homeOpen; L.homeOpen = (st, k) => (k === 'field' && st.origin === 'shoumu' && mr(st) < 1 ? false : f0(st, k)); }
{ const f0 = L.homeLock; L.homeLock = (st, k) => (k === 'field' && st.origin === 'shoumu' && mr(st) < 1 ? '守墓人之后：筑基前不能开灵田' : f0(st, k)); }
{ const f0 = L.regionOpen; L.regionOpen = (st, k) => f0(st, k) || (k === 5 && st.origin === 'shoumu' && mr(st) >= 1); }
{ const f0 = L.sellParts; L.sellParts = (st, k) => { const a = f0(st, k); if (st.origin === 'sanxiu') a.push(['散修丹师', 1.15, 'mul']); return a; }; }
{ const f0 = L.sellOpen; L.sellOpen = st => f0(st) || st.origin === 'sanxiu'; }
{ const f0 = L.restock; L.restock = function (st, quiet) {
  if (st.origin !== 'sanxiu' || st.sect) return f0(st, quiet);
  const n0 = L.SHELF.rot; L.SHELF.rot = n0 + 2;
  try { return f0(st, quiet); } finally { L.SHELF.rot = n0; }
}; }
{ const f0 = L.petCap; L.petCap = st => f0(st) + (st.origin === 'yushou' ? 1 : 0) + (perk(st, 'roster') ? 1 : 0); }
// 徒弟名册 +1（宗门线读：L.rebRoster ? L.rebRoster(st, 'disc') : 0）
L.rebRoster = (st, k) => (perk(st, 'roster') ? 1 : 0);
{ const f0 = L.joinSect; L.joinSect = function (st, id) {
  if (trialOn(st, 'wuzong')) return false;
  const ok = f0(st, id);
  if (ok && st.origin === 'dantong' && id === 'dan' && st.sect.rank < 1) { st.sect.rank = 1; L.log(st, '丹童出身：丹霞谷认得你这手火候，以内门弟子起步（人脉照旧从零攒）', 'jade'); }
  return ok;
}; }

// ---------- 轮回殿 ----------
L.HALL = [
  { id: 'wis', n: '宿慧', d: '修炼 +10%/级', max: 5, cost: [300, 600, 1000, 1500, 2200], icon: 'cult' },
  { id: 'bone', n: '根骨', d: '战力 +10%/级', max: 5, cost: [300, 600, 1000, 1500, 2200], icon: 'atk' },
  { id: 'purse', n: '家底', d: '开局灵石 +500/级', max: 3, cost: [200, 200, 200], icon: 'stone' },
  { id: 'relic', n: '前世法宝', d: '开局带一件法器（2 级：灵器）', max: 2, cost: [400, 1200], icon: 'gear' },
  { id: 'memory', n: '老祖的记性', d: '转世后老祖仍记得你：第一次大境界突破护法必成，约战借力 ×1.5', max: 1, cost: [300], icon: 'insight' },
  { id: 'card4', n: '命格多一选', d: '投胎时命格四选一', max: 1, cost: [800], icon: 'badge' },
  { id: 'luck', n: '气运', d: '奇遇把握 +5%/级', max: 2, cost: [600, 600], icon: 'buff' },
  // SYSTEMS §16 新增五个
  { id: 'slots', n: '功法槽提前', d: '开局三槽各带一门入门功法（小成）', max: 1, cost: [800], icon: 'sm_slot', isNew: true },
  { id: 'roster', n: '名册 +1', d: '灵宠名册 +1、徒弟名册 +1', max: 1, cost: [1000], icon: 'sm_roster', isNew: true },
  { id: 'elem', n: '识五行', d: '地图与对手的五行开局已知', max: 1, cost: [400], icon: 'sm_elem', isNew: true },
  { id: 'alch', n: '宿慧丹方', d: '已发现的丹方成丹率 +10%', max: 1, cost: [600], icon: 'pojing', isNew: true },
  { id: 'legacy2', n: '第二传承功法', d: '传承可以带两门功法', max: 1, cost: [1500], icon: 'sm_legacy', isNew: true },
  // 出身
  { id: 'o_dantong', n: '出身·丹童', d: L.ORIGINS.dantong.d, max: 1, cost: [500], origin: 'dantong' },
  { id: 'o_moyi', n: '出身·魔门遗孤', d: L.ORIGINS.moyi.d, max: 1, cost: [800], origin: 'moyi' },
  { id: 'o_shoumu', n: '出身·守墓人之后', d: L.ORIGINS.shoumu.d, max: 1, cost: [1000], origin: 'shoumu' },
  { id: 'o_sanxiu', n: '出身·散修丹师', d: L.ORIGINS.sanxiu.d, max: 1, cost: [600], origin: 'sanxiu' },
  { id: 'o_yushou', n: '出身·御兽遗脉', d: L.ORIGINS.yushou.d, max: 1, cost: [800], origin: 'yushou' },
];
L.HALL_NODE = {}; for (const h of L.HALL) L.HALL_NODE[h.id] = h;
L.daoguo = st => (st && st.meta && st.meta.daoguo) || 0;
L.hallCost = (st, id) => { const h = L.HALL_NODE[id]; if (!h) return Infinity; const lv = perk(st, id); return lv >= h.max ? Infinity : h.cost[lv]; };
L.hallWhy = function (st, id) {
  const h = L.HALL_NODE[id]; if (!h) return '没有这一项';
  if (perk(st, id) >= h.max) return '已点满';
  if (L.daoguo(st) < L.hallCost(st, id)) return `还差 ${L.fmt(L.hallCost(st, id) - L.daoguo(st))} 道果`;
  return '';
};
L.hallBuy = function (st, id) {
  if (L.hallWhy(st, id)) return null;
  const c = L.hallCost(st, id);
  st.meta.daoguo -= c;
  st.meta.perk[id] = perk(st, id) + 1;
  emit('hall', { id, lv: st.meta.perk[id] });
  return { id, lv: st.meta.perk[id], cost: c };
};
// sim / 机器人：照这个顺序买得起就买（宿慧、根骨先各一级，然后新节点与出身穿插）
L.HALL_ORDER = ['wis', 'bone', 'luck', 'elem', 'wis', 'card4', 'alch', 'bone', 'roster', 'slots', 'memory', 'wis', 'relic', 'o_sanxiu', 'o_yushou', 'bone', 'legacy2', 'o_dantong', 'purse', 'o_moyi', 'o_shoumu', 'wis', 'bone', 'luck', 'relic', 'wis', 'bone', 'purse', 'purse'];
L.hallAuto = function (st, keep) {
  const out = [];
  for (let g = 0; g < 60; g++) {
    // 顺序表里第 n 次出现的 id 表示“买到 n 级”
    const seen = {};
    const id = L.HALL_ORDER.find(k => { seen[k] = (seen[k] || 0) + 1; return perk(st, k) < Math.min(seen[k], L.HALL_NODE[k].max); });
    if (!id || L.daoguo(st) - L.hallCost(st, id) < (keep || 0) || !L.hallBuy(st, id)) break;
    out.push(id);
  }
  return out;
};
L.rebirthCardN = st => 3 + perk(st, 'card4');
// 效果（宿慧、根骨、家底在 core.js）
{ const f0 = L.choiceLuck; L.choiceLuck = st => f0(st) + 0.05 * perk(st, 'luck'); }
{ const f0 = L.elemKnown; L.elemKnown = (st, k) => f0(st, k) || perk(st, 'elem') > 0; }
{ const f0 = L.foeElKnown; L.foeElKnown = (st, foe) => f0(st, foe) || (perk(st, 'elem') > 0 && !!L.foeKey(foe)); }
let curTrial = false;
{ const f0 = L.craft; L.craft = function (st, k, opt) { const p = curTrial; curTrial = !!(opt && opt.trial); try { return f0(st, k, opt); } finally { curTrial = p; } }; }
{ const f0 = L.alchRate; L.alchRate = st => (perk(st, 'alch') && !curTrial ? Math.min(0.99, f0(st) + 0.10) : f0(st)); }
{ const f0 = L.btGuard; L.btGuard = st => f0(st) || (perk(st, 'memory') > 0 && st.rebirth > 0 && st.p.r === 0 && !st.flags.guardUsed && !trialOn(st, 'sleep')); }
{ const f0 = L.pactAssist; L.pactAssist = st => (trialOn(st, 'sleep') ? 1 : f0(st) > 1 ? f0(st) : perk(st, 'memory') > 0 && st.p.r === 0 ? 1.5 : 1); }

// ---------- 天道试炼 ----------
L.TRIALS = [
  { id: 'half', n: '寿元减半', d: '寿元 ×0.5', k: 0.30 },
  { id: 'sleep', n: '老祖沉睡', d: '没有护法、借力', k: 0.20 },
  { id: 'foes', n: '仇家遍地', d: '天骄榜上的对手战力 ×1.25', k: 0.30 },
  { id: 'poor', n: '清贫', d: '灵石收入 ×0.6', k: 0.25 },
  { id: 'limit', n: '限时', d: '第 480 月还没飞升，就地坐化', k: 0.40 },
  { id: 'wuxing', n: '五行缺一', d: '开局随机封一系，不能装备该系功法', k: 0.25, isNew: true },
  { id: 'gu', n: '孤星', d: '不能有同伴与道侣', k: 0.25, isNew: true },
  { id: 'wuzong', n: '无宗', d: '不能拜入任何宗门', k: 0.35, isNew: true },
];
L.TRIAL = {}; for (const t of L.TRIALS) L.TRIAL[t.id] = t;
L.TRIAL_LIMIT = 480;
L.trialBonus = (st, id) => (L.TRIAL[id] ? L.TRIAL[id].k + (st && st.meta && st.meta.trialHint ? 0.05 : 0) : 0);
L.trialMult = (st, list) => 1 + [].concat(list || st.trials || []).reduce((a, id) => a + L.trialBonus(st, id), 0);
{ const f0 = L.lifespan; L.lifespan = st => { const y = f0(st); return trialOn(st, 'half') && y !== Infinity ? y * 0.5 : y; }; }
{ const f0 = L.canTrain; L.canTrain = st => !trialOn(st, 'sleep') && f0(st); }
{ const f0 = L.rivalPower; L.rivalPower = (st, q) => f0(st, q) * (trialOn(st, 'foes') ? 1.25 : 1); }
L.addIncMul('trial_poor', 56, st => (trialOn(st, 'poor') ? ['天道试炼·清贫', 0.6, ''] : null));
{ const f0 = L.daolvBlocked; L.daolvBlocked = st => trialOn(st, 'gu') || f0(st); }
L.trialEl = st => (trialOn(st, 'wuxing') ? st.trialEl || '' : '');
L.artSealed = (st, id) => { const e = L.trialEl(st); return !!e && !!L.art(id) && L.art(id).el === e; };
{ const f0 = L.equipArt; L.equipArt = (st, id) => (L.artSealed(st, id) ? null : f0(st, id)); }
{ const f0 = L.artBest; L.artBest = function (st, opt) {
  const e = L.trialEl(st); if (!e) return f0(st, opt);
  const own = st.arts.own, keep = {};
  for (const id in own) if (!L.artSealed(st, id)) keep[id] = own[id];
  st.arts.own = keep;
  try { return f0(st, opt); } finally { st.arts.own = own; }
}; }
{ const f0 = L.tick; L.tick = function (st, cont) {
  const out = f0(st, cont);
  if (trialOn(st, 'gu')) { if (st.companion) st.companion = null; if (st.daolv) st.daolv = null; }
  if (trialOn(st, 'limit') && st.p.r <= L.MAXR && st.tick >= L.TRIAL_LIMIT && !out.death) { out.death = true; out.trialLimit = true; st.p.age = Math.max(st.p.age, L.lifespan(st)); }
  return out;
}; }
if (typeof L.companionOn === 'function') { const f0 = L.companionOn; L.companionOn = (st, id) => !trialOn(st, 'gu') && f0(st, id); }

// ---------- 道果 ----------
L.DG = { si: 10, rank: 3, srank: 40, sectPos: 20, boss: 15, friend: 30, daolv: 50, ach: 5, ascend: 500, cell: 2, deep: 10, disc: 60, grp: 40 };
L.daoFruit = function (st) {
  const p = st.p, G = L.DG, parts = [];
  const add = (n, v, how) => { if (v) parts.push({ n, v: Math.round(v), how: how || '' }); };
  const si = p.r >= 9 ? 36 : Math.max(L.si(p), (st.flags && st.flags.maxI) || 0);
  add(`境界（最高第 ${si} 层）`, G.si * si);
  add(`天骄榜（最高第 ${st.bestRank} 名）`, G.rank * Math.max(0, 100 - st.bestRank));
  if (st.sect) { add(`宗门身份（${L.srankName(st, st.sect.rank)}）`, G.srank * st.sect.rank); add(`宗门排名（最高第 ${st.sect.best}）`, G.sectPos * Math.max(0, 10 - (st.sect.best || 9))); }
  const bosses = Object.keys(st.bosses || {}).filter(k => st.bosses[k]).length;
  add(`首领 ${bosses} 个`, G.boss * bosses);
  const fr = Object.keys(L.NPCS).filter(id => L.friend(st, id)).length;
  add(`知己 ${fr} 位`, G.friend * fr);
  if (st.daolv) add('道侣', G.daolv);
  const ach = Object.keys(st.ach || {}).length;
  add(`成就 ${ach} 项`, G.ach * ach);
  if (p.r >= 9) add('白日飞升', G.ascend);
  // SYSTEMS §16 的加项
  const cells = L.codexNew ? L.codexNew(st) : 0;
  add(`图鉴新格 ${cells}`, G.cell * cells, 'codex');
  const grp = L.codexGrpNew ? L.codexGrpNew(st).length : 0;
  add(`图鉴集齐 ${grp} 类`, G.grp * grp, 'codex');
  const deep = (st.stats && st.stats.mjDeep) || 0;
  add(`秘境最深 ${deep} 层`, G.deep * deep);
  const disc = L.discGraduated ? L.discGraduated(st) : 0;
  add(`徒弟出师 ${disc} 人`, G.disc * disc);
  let mult = 1;
  for (const x of L.daoFruitParts ? L.daoFruitParts(st) : []) { if (x[2] === 'mult') continue; add(x[0], x[1]); }
  const base = parts.reduce((a, x) => a + x.v, 0);
  const mults = [];
  const tm = L.trialMult(st);
  if (tm > 1) mults.push({ n: '天道试炼（' + (st.trials || []).map(id => L.TRIAL[id].n).join('、') + '）', v: tm });
  const kr = L.karmaRebirth ? L.karmaRebirth(st) : { n: 0, mult: 1 };
  if (kr.n) mults.push({ n: `未了的因果 ${kr.n} 条（每条 −${Math.round((L.KARMA_REB || 0.02) * 100)}%）`, v: kr.mult });
  for (const m of mults) mult *= m.v;
  const codex = parts.filter(x => x.how === 'codex').reduce((a, x) => a + x.v, 0);
  return { parts, base, mults, mult, total: Math.max(0, Math.round(base * mult)), codex: Math.round(codex * mult), karmaTitle: kr.title || null };
};
// 一世结束结算一次：结局记进图鉴（算进新格）、道果进轮回殿余额
L.settle = function (st, how) {
  if (st.settle) return st.settle;
  const ends = st.p.r >= 9 ? L.endingsOf(st) : ['rest'];
  const freshEnd = L.codexEnding ? L.codexEnding(st, ends) : [];
  if (L.codexCheck) L.codexCheck(st);
  const f = L.daoFruit(st);
  st.meta.daoguo = (st.meta.daoguo || 0) + f.total;
  st.meta.lifeN = (st.meta.lifeN || 0) + 1;
  if (f.karmaTitle) L.grantTitle(st, f.karmaTitle);
  st.settle = { total: f.total, base: f.base, mult: f.mult, parts: f.parts, mults: f.mults, codex: f.codex, ends, freshEnd, how: how || (st.p.r >= 9 ? 'ascend' : 'rest'), at: st.tick };
  L.log(st, `轮回结算：道果 +${L.fmt(f.total)}（轮回殿余 ${L.fmt(st.meta.daoguo)}）`, 'gold');
  emit('settle', st.settle);
  return st.settle;
};
{ const ls0 = L.lifeSummary; L.lifeSummary = function (st) { const o = ls0(st); o.origin = st.origin || 'qitu'; o.trials = (st.trials || []).slice(); if (st.settle) { o.dg = st.settle.total; o.end = st.settle.ends[0]; } return o; }; }

// ---------- 传承 ----------
L.legacyCands = function (st) {
  const arts = Object.keys((st.arts && st.arts.own) || {}).filter(id => L.art(id) && L.artLv(st, id) >= 3).map(id => ({ id, n: L.art(id).n, lv: L.artLv(st, id), k: L.art(id).k }));
  const gear = [];
  for (const s of L.GEAR_SLOTS) { const x = st.gear && st.gear[s]; if (x && x.aff && x.aff.length) for (const a of x.aff) if (L.AFFIX[a]) gear.push({ slot: s, aff: a, n: L.gearBase(x.id).n, an: L.AFFIX[a].n, ad: L.AFFIX[a].d }); }
  const seen = {}, pets = [];
  for (const p of st.pets || []) if (p.heart >= 5 && !seen[p.sp]) { seen[p.sp] = 1; pets.push({ sp: p.sp, n: L.petName(p) }); }
  return { arts, gear, pets, artN: 1 + (perk(st, 'legacy2') ? 1 : 0) };
};
// picks = { arts: [id], gear: { slot, aff }, pet: sp }
L.legacySet = function (st, picks) {
  const c = L.legacyCands(st), o = {};
  const arts = [].concat((picks && picks.arts) || []).filter(id => c.arts.some(x => x.id === id)).slice(0, c.artN);
  if (arts.length) o.arts = arts;
  const g = picks && picks.gear;
  if (g && c.gear.some(x => x.slot === g.slot && x.aff === g.aff)) o.gear = { slot: g.slot, aff: g.aff };
  if (picks && picks.pet && c.pets.some(x => x.sp === picks.pet)) o.pet = picks.pet;
  st.meta.legacy = o;
  return o;
};
L.legacyAuto = function (st) {
  const c = L.legacyCands(st);
  const arts = c.arts.slice().sort((a, b) => L.art(b.id).t - L.art(a.id).t || b.lv - a.lv).slice(0, c.artN).map(x => x.id);
  const gear = c.gear.find(x => /^ke_|fengrui/.test(x.aff)) || c.gear[0];
  return L.legacySet(st, { arts, gear: gear && { slot: gear.slot, aff: gear.aff }, pet: c.pets[0] && c.pets[0].sp });
};
// 器灵：下一世第一件同槽法宝带这条词条
{ const f0 = L.gearDrop; L.gearDrop = function (st, slot, tier, ctx) {
  const it = f0(st, slot, tier, ctx);
  const lg = st.legacy && st.legacy.gear, x = it && it.gear;
  if (lg && x && x.slot === lg.slot && L.gearBase(x.id) && !L.gearBase(x.id).fixed) {
    if (!x.aff.includes(lg.aff)) { if (x.aff.length >= 2) x.aff[x.aff.length - 1] = lg.aff; else x.aff.push(lg.aff); }
    delete st.legacy.gear; it.legacy = lg.aff;
    L.log(st, `前世的器灵认出了【${L.gearBase(x.id).n}】：带上词条「${L.AFFIX[lg.aff].n}」`, 'gold');
  }
  return it;
}; }
// 血脉：下一世第一枚蛋必为该种
{ const f0 = L.petEgg; L.petEgg = function (st, el, src, up) {
  const sp = st.legacy && st.legacy.pet;
  if (!sp || !L.PET_SP[sp]) return f0(st, el, src, up);
  delete st.legacy.pet;
  const it = L.petGive(st, { sp, src: src || 'shop', egg: el || L.eggEl(st) });
  it.legacy = true;
  L.log(st, `蛋壳上浮出前世灵宠的纹路：孵出来的是【${L.petFormName(sp, 0)}】`, 'gold');
  L.fireTrigger(st, 'egg');
  return it;
}; }

// ---------- 新档：出身、轮回殿、传承、试炼 ----------
const SEAL_EL = ['jin', 'mu', 'shui', 'huo', 'tu'];
function startArt(st, k) {
  const A = L.ARTL.filter(x => x.k === k && x.pool === 'drop').sort((a, b) => a.t - b.t)[0];
  if (!A || st.arts.own[A.id] !== undefined) return null;
  L.giveArt(st, A.id, { src: 'perk' });
  st.arts.own[A.id] = Math.max(st.arts.own[A.id] || 0, L.artNeed(A.id, 1));
  L.equipArt(st, A.id);
  return A.id;
}
function applyOrigin(st) {
  const id = st.origin || 'qitu', O = L.ORIGINS[id];
  if (!O || id === 'qitu') return;
  if (O.pact) { st.exName = O.pact.who; const q = L.RIVALS.find(r => r.id === 'mu').q; if (st.ladder[q - 1]) st.ladder[q - 1].n = O.pact.who; }
  if (O.chainDone) { st.eflags[L.chainShort(O.chainDone) + '_1'] = 1; st.chain.at[O.chainDone] = 0; const m = st.meta.chain = st.meta.chain || {}; const r = m[O.chainDone] || (m[O.chainDone] = { best: 0, done: 0 }); r.best = Math.max(r.best, 1); }
  if (id === 'dantong') {
    st.home.furnace = Math.max(st.home.furnace, 2);
    L.addAff(st, 'ge', 20);
    const unk = L.YIN_GRID.filter(g => !L.recipeKnown(st, g[2]) && !L.RECIPE[g[2]].secret);
    for (let i = 0; i < 3 && unk.length; i++) { const g = unk.splice(ri(0, unk.length - 1), 1)[0]; st.meta.recipe[g[2]] = 1; }
  } else if (id === 'moyi') {
    L.gearDrop(st, 'w', 2, { src: 'origin' });
    L.addAff(st, 'ye', 20);
    L.addKarma(st, 'moyi_a'); L.addKarma(st, 'moyi_b');
  } else if (id === 'shoumu') {
    L.gearDrop(st, 'w', 2, { src: 'origin' });
    if (!st.p.tr.includes('sword')) st.p.tr.push('sword');
  } else if (id === 'sanxiu') {
    st.stones += 300;
  } else if (id === 'yushou') {
    L.petGive(st, { sp: 'p_tu', src: 'origin' });
    L.giveArt(st, 'm_yushou', { src: 'origin' }); L.equipArt(st, 'm_yushou');
  }
}
{ const ns0 = L.newState; L.newState = function (o) {
  o = o || {};
  const st = ns0(o);
  st.trials = [].concat(o.trials || []).filter(id => L.TRIAL[id]);
  st.trialEl = trialOn(st, 'wuxing') ? pick(SEAL_EL) : '';
  st.legacy = {}; st.settle = null;
  if (!st.meta.perk) st.meta.perk = {};
  if (typeof st.meta.daoguo !== 'number') st.meta.daoguo = 0;
  // 这些只在转世时生效（第一世不读轮回殿，三年之约门槛不变）
  if ((st.rebirth || 0) > 0) {
    applyOrigin(st);
    const rl = perk(st, 'relic'); if (rl) L.gearDrop(st, 'w', rl >= 2 ? 3 : 2, { src: 'perk' });
    if (perk(st, 'slots')) for (const k of ['x', 'z', 'm']) startArt(st, k);
    const lg = st.meta.legacy || {};
    for (const id of lg.arts || []) if (L.art(id)) { L.giveArt(st, id, { src: 'legacy' }); st.arts.own[id] = Math.max(st.arts.own[id] || 0, L.artNeed(id, 1)); if (!L.artSlots(st)[L.ART_SLOTS.indexOf(L.art(id).k)]) L.equipArt(st, id); }
    if (lg.gear) st.legacy.gear = Object.assign({}, lg.gear);
    if (lg.pet) st.legacy.pet = lg.pet;
    st.meta.legacy = {};
    if (trialOn(st, 'wuzong')) st.flags.inviteAt = 1e9;
    if (L.codexCells) { L.codexSeed(st); st.cx0 = L.codexCells(st); st.cxBirth = L.codexPct(st); st.cxCnt = null; L.codexCheck(st); }
  }
  return st;
}; }
// 转世：从这一世的存档生出下一世（UI 与 sim 共用）。opt = { t, tr, origin, trials }；传承用 L.legacySet 先选好
L.rebirthState = function (old, opt) {
  opt = opt || {};
  const origin = opt.origin && L.originOpen(old, opt.origin) ? opt.origin : 'qitu';
  return L.newState({ name: old.p.name, female: old.p.look.f, rebirth: (old.rebirth || 0) + 1, t: opt.t, tr: opt.tr, lives: old.lives, meta: old.meta, origin, trials: opt.trials || [] });
};

// ---------- 存档 ----------
L.migrateSamsara = function (s) {
  s.meta.perk = s.meta.perk && typeof s.meta.perk === 'object' ? s.meta.perk : {};
  for (const k of Object.keys(s.meta.perk)) if (!(s.meta.perk[k] >= 0)) delete s.meta.perk[k];
  if (typeof s.meta.daoguo !== 'number' || !isFinite(s.meta.daoguo)) s.meta.daoguo = 0;
  if (!s.meta.legacy || typeof s.meta.legacy !== 'object') s.meta.legacy = {};
  s.trials = Array.isArray(s.trials) ? s.trials.filter(id => L.TRIAL[id]) : [];
  if (typeof s.trialEl !== 'string') s.trialEl = s.trials.includes('wuxing') ? pick(SEAL_EL) : '';
  if (!s.legacy || typeof s.legacy !== 'object') s.legacy = {};
  if (s.settle === undefined) s.settle = null;
  if (!L.ORIGINS[s.origin]) s.origin = 'qitu';
};
});
