/* 废柴仙途 · 逻辑模块 people：人物加深——喜好送礼、委托、同伴（四心同行）、道侣双修（docs/SYSTEMS.md §12，CONTENT §10、§14.4）
 * 模块写法见 src/logic.js 顶部说明。五心规则沿用 npc.js（每 20 好感一颗；仁三级 90 即五心，见 dao.js）。
 *
 *   喜好（发现表，跨世）：每位人物两类爱收的（♥ +8）、一类讨厌的（✕ −3），其余 +3（L.NPC_PREF）。只能在他来访时（门口那位访客就是他）送，
 *         一次来访送一样；送礼列表是身上现有的东西（灵草、灵矿、兽粮、灵石、天材地宝、破境丹、丹囊里的丹、五种药引、功法抄本）。
 *         每样东西带几个标签（L.pgiftOpts 的 tags），讨厌的标签优先、其次喜欢的；试过之后记进 st.meta.gift[人物][标签] = 1 / 0 / −1，
 *         列表上标 ♥ / ✕ / ·（一般）/ ？。L.giftKnown(st)（试出来的格子，数组）给图鉴页 codex.js 读，共 L.GIFT_DEX = 6 × 3 = 18 格；L.giftDex(st) 是按人物分组的完整表。
 *   委托：好感到二心（40）、四心（80）各来一件（L.PQ），显示在人物卡上；完成 +15 好感和一件与他相关的东西。
 *         完成条件只读各系统已有的结果：历练结算（L.resolveExp 的返回）、炼丹（L.craft）、丹方数（L.recipeCount）、首领（L.fightBoss）、
 *         秘境（L.mjPick / L.mjAfterEvent 之后的 st.run.cleared）；交付类在人物卡上点【交付】。
 *   同伴（DESIGN §7.4，四心同行）：st.ppl.comp 选一位四心的人，每趟历练、每次秘境都带上（出发时记在 st.exp.comp / st.run.comp）；
 *         道侣同行不占同伴位。效果：苏 本趟不负伤 / 夜 灵石 ×1.2、越级奖励 ×1.5 / 楚狂 斩妖分数 +10 / 葛老 灵草 ×2、采药带回一味稀有药引 /
 *         白小九 途中遭遇必出、把握 +10%（秘境多一扇门，realm.js 的 L.mjBai）/ 墨无痕 禁地负伤风险减半。L.companionOn(st, id) 给别的模块读。
 *   道侣：仍由 su_5 / ye_5 的 fx.daolv 结成（苏、夜互斥，没选的那位有 su_left / ye_left 与本刀的 pp_*_left2）。结成后每 12 周天一次【双修】：
 *         等同一次不花灵石的闭关（倍率、疲劳、顿悟都照闭关，L.startRetreat），并得对方一门功法（L.giveArt；都会了就是熟练 +20）。
 *         常驻的“道侣双修 修炼 ×1.25”改成 ×1.1（双修动作补回来）；L.PEOPLE2_ON = false（sim 的 nopeople2）时一切照旧。
 * 事件能力：elig.heart（ev.npc 至少几心）、elig.comp（这趟同行的是谁）、触发键 shuangxiu:<id>（第一次双修）；pp_* 事件在 nopeople2 时不出。
 * 接入点（加载时包一层）：L.addAff、L.startExp、L.resolveExp、L.expForecast、L.expStoneMult、L.leapMult、L.choiceLuck、L.craft、L.fightBoss、
 *   L.mjEnter、L.mjPick、L.mjAfterEvent、L.retName、L.eligible、L.newState、L.newMeta。tick.js 每周天调 L.peopleTick；save.js 调 L.migratePeople（幂等）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const rr = st => Math.min(st.p.r, 8);
const fmt = n => L.fmt(n);
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };
L.PEOPLE2_ON = true;
const ON = () => L.PEOPLE2_ON !== false;
L.PPL = ['su', 'ye', 'chu', 'ge', 'bai', 'mo'];
// 同伴位的人选：六位人物，加上化敌为友之后的楚天阔（tian，宿敌线的 tiankuo_ally；DESIGN §7.3“第七位同伴”）
L.COMP_IDS = L.PPL.concat(['tian']);
L.compName = (st, id) => (id === 'tian' ? '楚天阔' : L.npcName(st, id));
L.HEART_N = ['相识', '一心相识', '二心来访', '三心知己', '四心同行', '五心终章'];

// ---------- 状态 ----------
// st.ppl = { q: { 人物: { 1: 委托, 2: 委托 } }, comp 同伴, sx 上次双修的周天, sxN 双修次数, gifts 送礼次数, ga: { 人物: [送过的功法抄本] }, qn 完成的委托数, note: { 已讲过的提示 } }
L.newPeople = () => ({ q: {}, comp: null, sx: -99, sxN: 0, gifts: 0, ga: {}, qn: 0, note: {} });
function ppl(st) {
  let p = st.ppl;
  if (!p || typeof p !== 'object') p = st.ppl = L.newPeople();
  const d = L.newPeople();
  for (const k in d) if (p[k] === undefined || (p[k] === null && k !== 'comp')) p[k] = d[k];
  for (const k of ['q', 'ga', 'note']) if (!p[k] || typeof p[k] !== 'object' || Array.isArray(p[k])) p[k] = {};
  for (const k of ['sx', 'sxN', 'gifts', 'qn']) if (typeof p[k] !== 'number' || !isFinite(p[k])) p[k] = d[k];
  if (p.comp && !L.COMP_IDS.includes(p.comp)) p.comp = null;
  return p;
}
L.pplOf = ppl;
const metaGift = st => { st.meta = st.meta || L.newMeta(); if (!st.meta.gift || typeof st.meta.gift !== 'object') st.meta.gift = {}; return st.meta.gift; };
{ const nm = L.newMeta; L.newMeta = () => Object.assign(nm(), { gift: {} }); }
{ const ns = L.newState; L.newState = function (o) { const st = ns(o); st.ppl = L.newPeople(); metaGift(st); return st; }; }
// 读档：缺的补默认值，坏的去掉（可重复调用，不升存档版本）
L.migratePeople = function (s) {
  const p = ppl(s), g = metaGift(s);
  for (const id of Object.keys(g)) {
    if (!L.NPCS[id] || !g[id] || typeof g[id] !== 'object') { delete g[id]; continue; }
    for (const t of Object.keys(g[id])) if (![1, 0, -1].includes(g[id][t]) || !L.GIFT_TAG_N[t]) delete g[id][t];
  }
  for (const id of Object.keys(p.q)) {
    const o = p.q[id];
    if (!L.PQ[id] || !o || typeof o !== 'object') { delete p.q[id]; continue; }
    for (const i of Object.keys(o)) if (!['1', '2'].includes(i) || !o[i] || !['on', 'done'].includes(o[i].s)) delete o[i];
  }
  for (const id of Object.keys(p.ga)) if (!Array.isArray(p.ga[id])) delete p.ga[id];
  if (s.exp && s.exp.comp && !L.COMP_IDS.includes(s.exp.comp)) delete s.exp.comp;
  if (s.retreat && s.retreat.sx && !L.NPCS[s.retreat.sx]) delete s.retreat.sx;
  if (s.npc && s.p) for (const id of L.PPL) if (s.npc[id]) pqCheck(s, id, true);
};

// ---------- 喜好与送礼 ----------
L.PGIFT_V = { like: 8, mid: 3, hate: -3 };
// 标签（一样东西可以带几个：丹囊里的上品爆气丹 = 丹药 + 战斗类丹药 + 上品以上的丹）
L.GIFT_TAG_N = { herbs: '灵草', ore: '灵矿', feed: '兽粮', stones: '灵石', treasure: '天材地宝', dan: '丹药', zdan: '战斗类丹药', liao: '疗伤丹', dan_hi: '上品以上的丹', dan_low: '下品丹',
  yin_fire: '火引', yin_ice: '冰引', yin_thunder: '雷引', yin_wood: '木引', yin_soul: '魂引', art: '功法抄本', art_z: '战技抄本', art_mo: '魔道功法抄本' };
// CONTENT §10 的 ♥ / ✕。落不到实物上的两处按意思换了：夜璃讨厌的“驻颜丹（嫌你敷衍）”炼成即服、拿不出手，换成疗伤丹（“当我是你的病人？”）；
// 墨无痕讨厌的“聚财类饰品”没有背包可送，换成灵石；葛老爱的“酒（灵谷 ×4）”= 兽粮（灵谷酿的酒）
L.NPC_PREF = {
  su: { like: ['herbs', 'yin_wood'], hate: 'art_mo' },
  ye: { like: ['yin_fire', 'zdan'], hate: 'liao' },
  chu: { like: ['ore', 'art_z'], hate: 'herbs' },
  ge: { like: ['dan_hi', 'feed'], hate: 'dan_low' },
  bai: { like: ['feed', 'dan'], hate: 'yin_ice' },
  mo: { like: ['yin_soul', 'ore'], hate: 'stones' },
};
// 收礼时的一句话（喜欢 / 一般 / 讨厌）
L.PGIFT_LINE = {
  su: ['{su}眼睛一亮，嘴上说“谁稀罕”，手已经把药篓腾出了一格。', '{su}道了声谢，收进药箱，顺手替你把了把脉。', '{su}把东西推了回来，脸色冷下去：“这种东西，我不碰。”'],
  ye: ['{ye}抛起来又接住，笑得眼尾都红了：“算你有眼光。”', '{ye}瞥了一眼，收下了：“下回带点有意思的。”', '{ye}挑起眉毛：“疗伤丹？当我是你的病人？”顺手扔进了你的药匣。'],
  chu: ['楚狂掂了掂，眼睛亮得吓人：“好东西！今晚就拿去磨剑。”', '楚狂点点头收下，又转回去看他的剑。', '楚狂皱眉：“草？我又不是牛。”还是揣进了怀里，大概要拿去喂马。'],
  ge: ['葛老凑近闻了闻，胡子都翘起来：“好！这才叫孝敬！”', '葛老“嗯”了一声，揣进袖子，又去找酒了。', '葛老捏起来看了一眼，叹气：“火候差成这样，也好意思送人？”'],
  bai: ['白小九“嗷呜”一口就没了，尾巴摇成一团白雾：“还有吗还有吗！”', '白小九抱着闻了半天，藏进了她的小窝。', '白小九打了个大喷嚏，耳朵贴着脑袋缩到你身后：“冷……拿走拿走。”'],
  mo: ['墨无痕接过去，指腹在上面摩挲了很久：“……多谢。”', '墨无痕收下了，什么也没说。', '墨无痕看着那袋灵石，面巾下的嘴角沉了下去：“我不缺这个。”'],
};
const pref = id => L.NPC_PREF[id] || { like: [], hate: '' };
// 送一样礼的好感：♥ +8 / 一般 +3 / ✕ −3；建了迎客亭（buildings.js 的 L.visitFavorBonus，来访好感 +1）时正的那两档再加上它（只在这里加一次）
L.pgiftVal = (st, react) => L.PGIFT_V[react] + (react !== 'hate' && L.visitFavorBonus ? L.visitFavorBonus(st) : 0);
L.pgiftReact = (id, tags) => { const P = pref(id); return tags.includes(P.hate) ? 'hate' : tags.some(t => P.like.includes(t)) ? 'like' : 'mid'; };
// 这样东西在这位人物那里已知的反应：like / hate / mid（试过，一般）/ unk
L.pgiftMark = function (st, id, tags) {
  const k = (st.meta && st.meta.gift && st.meta.gift[id]) || {};
  if (tags.some(t => k[t] === -1)) return 'hate';
  if (tags.some(t => k[t] === 1)) return 'like';
  if (tags.every(t => k[t] === 0)) return 'mid';
  return 'unk';
};
const isMo = A => !!(A.mo || A.pool === 'mo');
// 身上现有、能拿出手的礼（每类一项）。amt 是这一份的数量；功法抄本：抄一份给他，自己的不少，同一门只送同一人一次
L.pgiftOpts = function (st, id) {
  const o = [], r = rr(st), inc = Math.max(L.income(st), 20);
  const add = (key, n, amt, have, tags, pay, extra) => { if (have >= amt && amt > 0) o.push(Object.assign({ key, n, amt, tags, pay, text: `${n}${amt > 1 ? ' ' + fmt(amt) : ''}` }, extra || {})); };
  add('herbs', '灵草', 6 * (1 + r), Math.floor(st.herbs), ['herbs'], n => { st.herbs -= n; });
  if (L.oreUnit) add('ore', '灵矿', 4 * L.oreUnit(st), st.ore || 0, ['ore'], n => { st.ore -= n; });
  add('feed', '兽粮', 8 * (1 + r), st.feed || 0, ['feed'], n => { st.feed -= n; });
  add('stones', '灵石', Math.floor(4 * inc), Math.floor(st.stones), ['stones'], n => { st.stones -= n; });
  add('treasure', '天材地宝', 1, st.treasure, ['treasure'], n => { st.treasure -= n; });
  add('pills', '破境丹', 1, st.pills, ['dan'], n => { st.pills -= n; });
  // 丹囊：每种丹按品质分三档（下品 / 中品 / 上品以上），送的是这一档里最差的一枚
  const bag = L.danOf ? L.danOf(st).bag : {};
  for (const k of ['liaoshang', 'baoqi', 'leihuo']) {
    const list = bag[k] || [];
    for (const band of [0, 1, 2]) {
      const qs = list.filter(q => (band === 2 ? q >= 2 : q === band));
      if (!qs.length) continue;
      const q = Math.min(...qs), tags = ['dan', k === 'liaoshang' ? 'liao' : 'zdan'];
      if (band === 0) tags.push('dan_low'); if (band === 2) tags.push('dan_hi');
      add('bag:' + k + ':' + band, L.QUAL[q].n + L.RECIPE[k].n, 1, 1, tags, () => { const b = L.danOf(st).bag[k]; const j = b.lastIndexOf(q); if (j >= 0) b.splice(j, 1); });
    }
  }
  if (L.YIN_KEYS) for (const y of L.YIN_KEYS) add('yin:' + y, L.YIN_N[y], 1, L.yinHave(st, y), ['yin_' + y], () => { L.addYin(st, y, -1); });
  // 功法抄本：魔道功法 / 战技 / 其余各列一门（没送过他的、阶最低的）
  const given = ppl(st).ga[id] || [], own = Object.keys((st.arts && st.arts.own) || {}).filter(a => L.art(a) && !given.includes(a)).sort((a, b) => L.art(a).t - L.art(b).t);
  const cats = [['art_mo', A => isMo(A)], ['art_z', A => A.k === 'z' && !isMo(A)], ['art', A => A.k !== 'z' && !isMo(A)]];
  for (const [c, f] of cats) {
    const a = own.find(x => f(L.art(x)));
    if (!a) continue;
    const A = L.art(a), tags = ['art'].concat(isMo(A) ? ['art_mo'] : []).concat(A.k === 'z' ? ['art_z'] : []);
    add('art:' + a, `《${A.n}》抄本`, 1, 1, tags, () => { (ppl(st).ga[id] = ppl(st).ga[id] || []).push(a); }, { art: a });
  }
  for (const x of o) x.mark = L.pgiftMark(st, id, x.tags);
  // 排序：已知喜欢的在前，其次没试过的，一般，讨厌的最后
  const rank = { like: 0, unk: 1, mid: 2, hate: 3 };
  return o.sort((a, b) => rank[a.mark] - rank[b.mark]);
};
// 眼下能不能给他送礼：门口那位访客就是他、这一回还没送过
L.pgiftVisitor = st => { const ev = st.visitor && L.eventById(st.visitor.id); return ev && ev.npc && L.NPCS[ev.npc] ? ev.npc : null; };
L.pgiftWhy = function (st, id) {
  if (!ON()) return '还没开放';
  if (!L.met(st, id)) return '还不认识';
  if (L.pgiftVisitor(st) !== id) return '等他来访时再送';
  if (st.visitor.gift) return '这一回已经送过了';
  return '';
};
L.pgiftGive = function (st, id, key) {
  if (L.pgiftWhy(st, id)) return null;
  const x = L.pgiftOpts(st, id).find(g => g.key === key);
  if (!x) return null;
  x.pay(x.amt);
  const react = L.pgiftReact(id, x.tags), P = pref(id), K = metaGift(st)[id] || (metaGift(st)[id] = {});
  const fresh = x.mark === 'unk' || (react === 'like' && x.mark !== 'like') || (react === 'hate' && x.mark !== 'hate');
  if (react === 'hate') K[P.hate] = -1;
  else if (react === 'like') { for (const t of x.tags) if (P.like.includes(t)) K[t] = 1; }
  else for (const t of x.tags) if (K[t] === undefined) K[t] = 0;
  const a0 = L.aff(st, id), d = L.addAff(st, id, L.pgiftVal(st, react));
  st.visitor.gift = 1;
  const pp = ppl(st); pp.gifts++;
  st.stats.npcGifts = (st.stats.npcGifts || 0) + 1;
  st.flags.spentAt = st.tick;
  const line = L.fill(st, L.PGIFT_LINE[id][react === 'like' ? 0 : react === 'mid' ? 1 : 2]);
  L.log(st, `给${L.npcName(st, id)}送了${x.text}：${react === 'like' ? '♥ 正中下怀' : react === 'hate' ? '✕ 送错了' : '收下了'}，好感 ${d >= 0 ? '+' : ''}${d}`, react === 'like' ? 'gold' : react === 'hate' ? 'red' : 'jade');
  emit('people', { k: 'gift', id, react, d });
  return { id, x, react, d, a0, a1: L.aff(st, id), line, fresh };
};
// 图鉴（跨世）：每位人物三格（两 ♥ 一 ✕），试出来的算数。
// L.giftDex(st)：按人物分组的完整表（人物卡用）；L.giftKnown(st)：已试出来的那几格（数组，图鉴页 codex.js 读：每格 { id, n, kind, tag }），共 L.GIFT_DEX 格
L.GIFT_DEX = 18;
L.giftKnown = st => { const out = []; for (const x of L.giftDex(st).list) for (const c of x.cells) if (c.known) out.push({ id: x.id, tag: c.tag, kind: c.kind, n: `${x.n}·${c.kind === 'like' ? '♥' : '✕'}${c.n}` }); return out; };
L.giftDex = function (st) {
  const g = (st.meta && st.meta.gift) || {};
  let found = 0;
  const list = L.PPL.map(id => {
    const P = pref(id), k = g[id] || {};
    const cells = P.like.map(t => ({ tag: t, n: L.GIFT_TAG_N[t], kind: 'like', known: k[t] === 1 })).concat([{ tag: P.hate, n: L.GIFT_TAG_N[P.hate], kind: 'hate', known: k[P.hate] === -1 }]);
    found += cells.filter(c => c.known).length;
    return { id, n: L.npcName(st, id), cells, tried: Object.keys(k).length };
  });
  return { total: L.GIFT_DEX, found, list };
};
// 老祖第一次讲送礼时顺口说出的一样（直接记进图鉴，免得讲完了玩家还得瞎试）
L.pgiftHintLike = function (st, id) {
  const P = pref(id), K = metaGift(st)[id] || (metaGift(st)[id] = {});
  const t = P.like.find(x => K[x] !== 1) || P.like[0];
  K[t] = 1;
  return t;
};

// ---------- 委托 ----------
// ty：exp 历练（a 行事、r 评价下限、d 深度下限、home = 只算出委托时最远的那张图）/ give 交付（what：liaoshang 丹囊的疗伤丹、baoqi 爆气丹、feed 兽粮、soul 魂引）/
//     craft 炼成上品以上（q）/ recipe 揭晓新丹方（n；十五格全揭晓了改成炼出两炉上品以上）/ boss 击败首领（首杀或再战）/ realm 带他进秘境闯过 n 层
// rw：+15 好感之外“一件与他相关的东西”。bag 收进丹囊 [丹, 枚, 品质]、mast 装着的战技熟练（没有战技就是心法），其余照 L.applyFx
L.PQ_AFF = 15;
const homeN = (st, q) => L.REGIONS[q.k !== undefined ? q.k : L.homeRegion(st)].n;
L.PQ = {
  su: [
    { t: '药篓', ty: 'exp', a: 2, r: 2, d: st => `山下疫后落了病根，{su}的药铺缺草：以【采药】历练一趟，评价乙以上（地点不限）`, rw: { bag: ['liaoshang', 2, 1] }, rwT: '她配的疗伤丹 ×2（收进丹囊）',
      done: '{su}收了你采回的草，连夜熬成药，分了你两枚：“自己留着，别逞强。”' },
    { t: '药箱', ty: 'give', what: 'liaoshang', n: 2, d: st => '{su}要去疫镇坐诊，药箱里还缺两枚疗伤丹：交两枚疗伤丹（丹囊里的）', rw: { art: 'z_huichun' }, rwT: '战技《回春剑诀》',
      done: '{su}把丹收好，又从药箱底下抽出一卷剑谱：“医者也得护得住病人。这套剑，给你。”' },
  ],
  ye: [
    { t: '不问用途', ty: 'give', what: 'baoqi', n: 1, d: st => '{ye}要一枚爆气丹，“干什么用——不许问”：交一枚爆气丹（丹囊里的）', rw: { yin: { fire: 3 }, stones: 6 }, rwT: '火引 ×3、一袋“出场费”',
      done: '{ye}接过丹，往你怀里塞了三颗赤炎果和一袋灵石：“出场费。剩下的，别问。”' },
    { t: '秘境旧账', ty: 'realm', n: 3, comp: true, d: st => '{ye}要进秘境找一个人算账：带{ye}同行，进秘境闯过 3 层', rw: { art: 'm_xuedun' }, rwT: '秘术《血遁》',
      done: '秘境第三层，{ye}了了那笔账，回来时把一卷血色的秘术拍在你手里：“魔门保命的本事。你比我更用得上。”' },
  ],
  chu: [
    { t: '比剑', ty: 'exp', a: 0, r: 3, home: true, d: st => `楚狂说要看你的剑够不够快：去【{home}】以【斩妖】历练一趟，评价甲以上`, rw: { ore: 8 }, rwT: '灵矿 8 筐（他攒的磨剑石）',
      done: '楚狂看完你带回的妖丹，扔过来一袋磨剑石：“快。还不够快。”' },
    { t: '首领', ty: 'boss', d: st => '楚狂想看一场真正的生死斗：击败一位地图首领（首杀、再战都算）', rw: { mast: 30, ore: 6 }, rwT: '装着的战技熟练 +30、灵矿 6 筐',
      done: '首领倒下的那一刻，楚狂在旁边拍断了一棵树：“这一剑！再来一遍！”他陪你把那一剑拆了三天。' },
  ],
  ge: [
    { t: '上品', ty: 'craft', q: 2, d: st => '葛老说你的火候“还差点”：炼成一炉上品以上的丹（任何一种）', rw: { yin: { fire: 1, soul: 1 } }, rwT: '火引、魂引各一（他压箱底的）',
      done: '葛老捏着那枚上品丹看了半天：“……还行。”从酒葫芦底下摸出两味药引塞给你。' },
    { t: '新方子', ty: 'recipe', n: 1, d: (st, q) => (q && q.alt ? '葛老要看你的成色：再炼出两炉上品以上的丹' : '葛老要考你：自己试出一格新的药引丹方'), rw: { recipe: 'need', herbs: 8 }, rwT: '他告诉你一格丹方、一捆灵草',
      done: '葛老听完你的方子，一拍大腿：“有出息！老头子也教你一格。”' },
  ],
  bai: [
    { t: '好饿', ty: 'give', what: 'feed', d: (st, q) => `白小九饿得尾巴都耷拉了：交兽粮 ${fmt(q ? q.n : 8 * (1 + rr(st)))}`, rw: { treasure: 1 }, rwT: '一颗亮石子（天材地宝）',
      done: '白小九吃饱了，从窝里扒出一颗亮晶晶的石子：“给恩人！我在山里捡的。”' },
    { t: '探险', ty: 'realm', n: 3, comp: true, d: st => '白小九想去秘境里玩：带白小九同行，进秘境闯过 3 层', rw: { pet: 'p_hu' }, rwT: '一只雪团灵狐（她的远房表妹）',
      done: '秘境里白小九玩疯了，出来时怀里多了一团雪白的小狐：“她非要跟着恩人！”' },
  ],
  mo: [
    { t: '墨家旧物', ty: 'exp', a: 1, r: 2, d0: 2, d: st => '墨无痕说禁地里埋着墨家的旧物：以【寻宝】去任意一处禁地历练一趟，评价乙以上', rw: { art: 'm_lianxi' }, rwT: '秘术《敛息术》',
      done: '你把禁地里挖出的半块墨玉交给他。墨无痕看了很久，教了你墨家的敛息法门：“三千年，墨家就靠这个活下来。”' },
    { t: '魂引', ty: 'give', what: 'soul', n: 2, d: st => '墨无痕要两枚魂引，替先祖点一盏长明灯：交魂引 ×2', rw: { item: 'need', itemUp: 1 }, rwT: '一件墨家遗物（补你最弱的那一格法宝）',
      done: '长明灯点上了。墨无痕从怀里取出一件旧物放在你手边：“墨家的东西，该有人用。”' },
  ],
};
const GIVE = {
  liaoshang: { n: '疗伤丹', have: st => L.bagN(st, 'liaoshang'), pay: (st, n) => { const b = L.danOf(st).bag.liaoshang; b.splice(b.length - n, n); } },
  baoqi: { n: '爆气丹', have: st => L.bagN(st, 'baoqi'), pay: (st, n) => { const b = L.danOf(st).bag.baoqi; b.splice(b.length - n, n); } },
  feed: { n: '兽粮', have: st => st.feed || 0, pay: (st, n) => { st.feed -= n; } },
  soul: { n: '魂引', have: st => L.yinHave(st, 'soul'), pay: (st, n) => { L.addYin(st, 'soul', -n); } },
};
const qOf = (st, id, i) => { const o = ppl(st).q[id]; return o ? o[i] : null; };
// 新委托：二心第 1 件、四心第 2 件（quiet：读档补的，不发提示）
function pqCheck(st, id, quiet) {
  if (!ON() || !L.PQ[id] || !L.met(st, id) || st.p.r > L.MAXR) return;
  const P = ppl(st), h = L.hearts(st, id);
  const o = P.q[id] || (P.q[id] = {});
  for (const i of [1, 2]) {
    if (o[i] || h < i * 2) continue;
    const Q = L.PQ[id][i - 1], q = { s: 'on', at: st.tick };
    if (Q.home) q.k = L.homeRegion(st);
    if (Q.ty === 'give') q.n = Q.what === 'feed' ? 8 * (1 + rr(st)) : Q.n;
    if (Q.ty === 'recipe') { q.base = L.recipeCount(st); if (q.base >= L.YIN_GRID.length) { q.alt = 1; q.base = st.stats.goodPill || 0; } }
    o[i] = q;
    if (!quiet) { L.log(st, `${L.npcName(st, id)}托你一件事：${L.fill(st, Q.t)}`, 'gold'); emit('people', { k: 'qnew', id, i }); }
  }
}
L.pqCheck = pqCheck;
L.pqDef = (id, i) => (L.PQ[id] ? L.PQ[id][i - 1] : null);
L.pqDesc = (st, id, i) => { const Q = L.pqDef(id, i), q = qOf(st, id, i); return L.fill(st, Q.d(st, q)).replace('{home}', q ? homeN(st, q) : homeN(st, {})); };
L.pqActive = st => { const out = []; if (!ON()) return out; for (const id of L.PPL) for (const i of [1, 2]) { const q = qOf(st, id, i); if (q && q.s === 'on') out.push({ id, i, q, Q: L.pqDef(id, i) }); } return out; };
// 进度说明：已完成 / 还差什么 / 交付够不够
L.pqProg = function (st, id, i) {
  const Q = L.pqDef(id, i), q = qOf(st, id, i);
  if (!q) return { s: 'none', t: `到${L.HEART_N[i * 2]}（好感 ${i * 40}）时来` };
  if (q.s === 'done') return { s: 'done', t: '已完成' };
  if (Q.ty === 'give') { const G = GIVE[Q.what], h = G.have(st); return { s: 'on', t: `${G.n} ${fmt(Math.min(h, q.n))}/${fmt(q.n)}`, can: h >= q.n, why: h >= q.n ? '' : `还差${G.n} ${fmt(q.n - h)}` }; }
  if (Q.ty === 'recipe') return { s: 'on', t: q.alt ? `上品以上 ${Math.max(0, (st.stats.goodPill || 0) - q.base)}/2` : `新丹方 ${Math.max(0, L.recipeCount(st) - q.base)}/${Q.n}` };
  if (Q.ty === 'realm') return { s: 'on', t: L.comp(st) === id ? `${L.npcName(st, id)}已在同伴位，等夏天秘境` : `先把${L.npcName(st, id)}放进同伴位`, need: 'comp' };
  return { s: 'on', t: '进行中' };
};
L.pqGiveWhy = function (st, id, i) {
  const Q = L.pqDef(id, i), q = qOf(st, id, i);
  if (!q || q.s !== 'on' || Q.ty !== 'give') return '没有可交付的委托';
  const G = GIVE[Q.what], h = G.have(st);
  return h >= q.n ? '' : `还差${G.n} ${fmt(q.n - h)}`;
};
L.pqGive = function (st, id, i) {
  if (L.pqGiveWhy(st, id, i)) return null;
  const Q = L.pqDef(id, i), q = qOf(st, id, i);
  GIVE[Q.what].pay(st, q.n);
  return pqDone(st, id, i, 'give');
};
// via：从哪完成的（exp 历练结算卡上已有一行、give 人物卡上当场弹卡；其余由界面排队弹一张完成卡）
function pqDone(st, id, i, via) {
  const Q = L.pqDef(id, i), q = qOf(st, id, i);
  if (!q || q.s !== 'on') return null;
  q.s = 'done'; q.end = st.tick;
  const P = ppl(st); P.qn++;
  st.stats.npcQuests = (st.stats.npcQuests || 0) + 1;
  const texts = [], items = [];
  const d = L.addAff(st, id, L.PQ_AFF);
  texts.push(`好感 ${L.npcName(st, id)} +${d}`);
  const rw = Object.assign({}, Q.rw);
  if (rw.bag) { const [k, n, qq] = rw.bag; const b = L.danOf(st).bag; (b[k] = b[k] || []); for (let j = 0; j < n; j++) b[k].push(qq); b[k].sort((x, y) => y - x); texts.push(`${L.QUAL[qq].n}${L.RECIPE[k].n} ×${n}（丹囊）`); delete rw.bag; }
  if (rw.mast) {
    const sl = L.artSlots(st), a = sl[1] || sl[0];
    if (a) { L.addMastery(st, a, rw.mast); texts.push(`《${L.art(a).n}》熟练 +${rw.mast}`); }
    delete rw.mast;
  }
  if (rw.art) { const it = L.giveArt(st, rw.art, { src: 'npc' }); if (it) { items.push(it); texts.push(L.artItemText(st, it)); } delete rw.art; }
  if (Object.keys(rw).length) { const fx = L.applyFx(st, rw); for (const t of fx) if (!(fx.artTexts || []).includes(t) && !(fx.gearTexts || []).includes(t)) texts.push(t); for (const it of fx.items || []) items.push(it); }
  const line = L.fill(st, Q.done);
  L.log(st, `委托完成「${L.fill(st, Q.t)}」：${line}`.slice(0, 60), 'gold');
  const res = { id, i, Q, line, texts, items, via: via || '' };
  emit('people', { k: 'qdone', id, i, res, via: via || '' });
  return res;
}
L.pqDone = pqDone;
// 历练结算之后：看有没有对得上的委托
function pqOnExp(st, res) {
  for (const x of L.pqActive(st)) {
    const Q = x.Q;
    if (Q.ty !== 'exp' || res.recall) continue;
    if (Q.a !== undefined && res.a !== Q.a) continue;
    if (res.rating < (Q.r || 0) || res.d < (Q.d0 || 0)) continue;
    if (Q.home && res.k !== x.q.k) continue;
    (res.pq = res.pq || []).push(pqDone(st, x.id, x.i, 'exp'));
  }
}
function pqOnRecipe(st) {
  for (const x of L.pqActive(st)) {
    if (x.Q.ty !== 'recipe') continue;
    if (x.q.alt ? (st.stats.goodPill || 0) - x.q.base >= 2 : L.recipeCount(st) - x.q.base >= x.Q.n) pqDone(st, x.id, x.i);
  }
}
function pqOnRealm(st) {
  const run = st.run;
  if (!run) return;
  for (const x of L.pqActive(st)) if (x.Q.ty === 'realm' && run.comp === x.id && (run.cleared || 0) >= x.Q.n) pqDone(st, x.id, x.i);
}

// ---------- 同伴（四心同行） ----------
L.COMP = {
  su: { n: '本趟不负伤', d: '丁等也只是空手而归，不负伤' },
  ye: { n: '灵石 ×1.2，越级 ×1.5', d: '历练灵石 ×1.2，越级奖励再 ×1.5' },
  chu: { n: '斩妖分数 +10', d: '斩妖时历练分数 +10' },
  ge: { n: '灵草 ×2', d: '带回的灵草 ×2，采药还多带回一味稀有药引（雷 / 木 / 魂）' },
  bai: { n: '遭遇必出 · 把握 +10%', d: '途中遭遇必出，奇遇把握 +10%；秘境多一扇门' },
  mo: { n: '禁地负伤减半', d: '禁地的负伤风险减半' },
  tian: { n: '斩妖分数 +6', d: '斩妖时历练分数 +6（宿敌线的“同行·楚天阔”）' },
};
L.COMP_V = { ye: 1.2, yeLeap: 1.5, chu: 10, mo: 0.5, bai: 0.1 };
const daolvOn = (st, id) => !!st.daolv && st.daolv === id && !(L.daolvBlocked && L.daolvBlocked(st)) && !(typeof L.trialOn === 'function' && L.trialOn(st, 'gu'));
// 能不能放进同伴位：四心（仁三级 90 即五心也算）、不是道侣（道侣本来就跟着）
const lone = st => typeof L.trialOn === 'function' && L.trialOn(st, 'gu');   // 天道试炼·孤星：不能有同伴与道侣（samsara.js）
L.compWhy = function (st, id) {
  if (!ON()) return '还没开放';
  if (lone(st)) return '天道试炼·孤星：不带同伴';
  if (id === 'tian') return st.eflags && st.eflags.tiankuo_ally ? '' : '楚天阔化敌为友之后才肯同行';
  if (!L.NPCS[id] || !L.met(st, id)) return '还不认识';
  if (st.daolv === id) return '道侣本就同行，不占同伴位';
  if (L.hearts(st, id) < 4) return `四心（好感 80）才肯跟你出门，现在 ${L.aff(st, id)}`;
  return '';
};
const compSel = st => { const c = st.ppl && st.ppl.comp; return c && !L.compWhy(st, c) ? c : null; };
L.comp = st => (ON() ? compSel(st) : null);
L.setComp = function (st, id) {
  if (!id) { ppl(st).comp = null; return true; }
  if (L.compWhy(st, id)) return false;
  ppl(st).comp = id;
  return true;
};
// 这一刻同行的是谁：结算中（tripCtx）> 历练途中（st.exp.comp）> 秘境里（st.run.comp）> 同伴位
let tripCtx;
const compNow = st => {
  if (!ON()) return null;
  if (tripCtx !== undefined) return tripCtx;
  if (st.exp) return st.exp.comp || null;
  if (st.run) return st.run.comp !== undefined ? st.run.comp : compSel(st);
  return compSel(st);
};
L.companionOn = (st, id) => ON() && (compNow(st) === id || daolvOn(st, id));
// 这一趟同行的人（同伴位 + 道侣），界面用
L.compList = st => { const a = []; const c = compNow(st); if (c) a.push(c); if (st.daolv && daolvOn(st, st.daolv) && ON() && !a.includes(st.daolv)) a.push(st.daolv); return a; };
// 楚狂：斩妖分数 +10（L.addExpMod，确认页的预计评价也算上）
L.addExpMod('comp_chu', 75, (st, k, d, a) => (a === 0 && L.companionOn(st, 'chu') ? ['同伴·楚狂', L.COMP_V.chu, 'comp'] : null));
// 夜：历练灵石 ×1.2、越级奖励 ×1.5
wrap('expStoneMult', b => (st, a) => b(st, a) * (L.companionOn(st, 'ye') ? L.COMP_V.ye : 1));
wrap('leapMult', b => st => b(st) * (L.companionOn(st, 'ye') ? L.COMP_V.yeLeap : 1));
// 白小九：途中奇遇把握 +10%
wrap('choiceLuck', b => st => b(st) + (st.exp && L.companionOn(st, 'bai') ? L.COMP_V.bai : 0));
// 确认页的负伤风险：苏 0、墨无痕禁地减半
wrap('expForecast', b => function (st, k, d, a) {
  const f = b(st, k, d, a);
  if (!f || !ON()) return f;
  if (L.companionOn(st, 'su')) { f.risk = 0; f.compSafe = 'su'; }
  else if (d === 2 && L.companionOn(st, 'mo')) { f.risk *= L.COMP_V.mo; f.compSafe = 'mo'; }
  return f;
});
// 出发：记下同行的人；白小九同行时途中遭遇必出（tick.js 按 plan.enc 掷）
wrap('startExp', b => function (st, k, d, a, opt) {
  const ok = b(st, k, d, a, opt);
  if (ok && st.exp && ON()) {
    const c = compSel(st);
    if (c) st.exp.comp = c;
    if (st.exp.plan && L.companionOn(st, 'bai')) st.exp.plan.enc = 0;
  }
  return ok;
});
// 结算：苏 / 墨无痕挡伤、葛老灵草与药引；之后看委托
const RARE_YIN = ['thunder', 'wood', 'soul'];
// 楚天阔：宿敌线（rivals2.js）的“同行·楚天阔 斩妖 +6”改由同伴位提供——放进同伴位那几趟才算，不和别人叠（nopeople2 时照宿敌线原样常驻）
wrap('rivalAllyOn', b => (st, id) => b(st, id) && (!ON() || id !== 'chu' || compNow(st) === 'tian'));
wrap('resolveExp', b => function (st) {
  const e = st.exp;
  if (!e || !ON()) return b(st);
  const comp = e.comp && L.COMP_IDS.includes(e.comp) ? e.comp : null, inj0 = st.p.inj;
  tripCtx = comp;
  let res;
  try { res = b(st); } finally { tripCtx = undefined; }
  if (!res || res.legacy) return res;
  const on = id => (comp === id && !lone(st)) || daolvOn(st, id);
  const with_ = L.COMP_IDS.filter(on);
  if (with_.length) {
    res.comps = with_;
    st.stats.compExp = (st.stats.compExp || 0) + 1;
    if (res.inj && !e.recall) {
      const u = e.plan && e.plan.u ? ((e.plan.u[0] || 0) * 7919) % 1 : 0;
      if (on('su')) { st.p.inj = inj0; res.compSave = 'su'; res.inj = 0; }
      else if (on('mo') && e.d === 2 && u < L.COMP_V.mo) { st.p.inj = inj0; res.compSave = 'mo'; res.inj = 0; }
    }
    if (on('ge') && res.herbs > 0) { st.herbs += res.herbs; res.compHerbs = res.herbs; res.herbs *= 2; }
    if (on('ge') && e.a === 2 && !e.recall && L.yinOpen && L.yinOpen(st)) {
      const y = RARE_YIN[Math.floor((((e.plan && e.plan.u && e.plan.u[3]) || 0) * 3301) % 1 * 3)];
      L.addYin(st, y, 1); res.compYin = y;
    }
    if (on('ye')) res.compStone = true;
  }
  pqOnExp(st, res);
  return res;
});
// 秘境：进去时记下同伴；每过一层看“带他闯过 N 层”的委托
wrap('mjEnter', b => function (st, opt) { const run = b(st, opt); if (run && ON()) run.comp = compSel(st); return run; });
for (const f of ['mjPick', 'mjAfterEvent']) wrap(f, b => function (st, i) { const r = b(st, i); if (ON()) pqOnRealm(st); return r; });
// 炼丹、首领：委托
wrap('craft', b => function (st, k, opt) {
  const r = b(st, k, opt);
  if (r && r.ok && ON()) {
    for (const x of L.pqActive(st)) if (x.Q.ty === 'craft' && r.q >= x.Q.q) pqDone(st, x.id, x.i);
    pqOnRecipe(st);
  }
  return r;
});
wrap('fightBoss', b => function (st, k) {
  const r = b(st, k);
  if (r && r.win && ON()) for (const x of L.pqActive(st)) if (x.Q.ty === 'boss') (r.pq = r.pq || []).push(pqDone(st, x.id, x.i));
  return r;
});
// 好感变了：看要不要出新委托（二心、四心）
wrap('addAff', b => function (st, id, d) { const r = b(st, id, d); if (ON() && L.PQ[id]) pqCheck(st, id); return r; });

// ---------- 知己加成（npc.js 的三项修炼 / 战力倍率） ----------
// 送礼与委托让三心来得早得多：修炼 / 战力的那三项改成“三心给一半、五心给满”（苏 修炼 ×1.05 → ×1.1、夜 战力 ×1.05 → ×1.1、楚狂 战力 ×1.075 → ×1.15）；
// nopeople2 时照旧三心给满。其余知己加成（夜的历练灵石、葛老的成丹率、白小九的奇遇、墨无痕的寿元）不变
L.FRIEND_HALF = true;
L.FRIEND_PART = 0.5;   // 三心、四心时给满额的几成
L.FRIEND_YE_STONE = false;   // 夜的历练灵石 ×1.2 是否也按心数折（sim 对照用）
const FRIEND_FULL = { su: 1.1, ye: 1.1, chu: 1.15 };
L.friendV = (st, id) => { const full = FRIEND_FULL[id]; return !ON() || !L.FRIEND_HALF || L.hearts(st, id) >= 5 ? full : 1 + (full - 1) * L.FRIEND_PART; };
wrap('expStoneMult', b => (st, a) => { const v = b(st, a); return L.FRIEND_YE_STONE && ON() && L.friend(st, 'ye') && L.hearts(st, 'ye') < 5 ? v / 1.2 * (1 + 0.2 * L.FRIEND_PART) : v; });
L.friendText = function (st, id) {
  const full = FRIEND_FULL[id], N = L.NPCS[id];
  if (!full || !ON() || !L.FRIEND_HALF) return N.bonus;
  const k = id === 'su' ? '修炼速度' : '战力', half = 1 + (full - 1) * L.FRIEND_PART, rest = N.bonus.split('，').slice(1).join('，');
  return `${k} ×${+half.toFixed(3)}（五心 ×${full}）${rest ? '，' + rest : ''}`;
};
L.addCulMod('friend_su', 80, st => (L.friend(st, 'su') ? ['知己·' + L.npcName(st, 'su'), L.friendV(st, 'su'), ''] : null));
L.addAtkMod('friend_ye', 80, st => (L.friend(st, 'ye') ? ['知己·' + L.npcName(st, 'ye'), L.friendV(st, 'ye'), ''] : null));
L.addAtkMod('friend_chu', 81, st => (L.friend(st, 'chu') ? ['知己·楚狂', L.friendV(st, 'chu'), ''] : null));

// ---------- 道侣与双修 ----------
// 双修：每 12 周天一次，等同一次不花灵石的闭关；送你对方一门功法（按表的次序，没有的先给；都会了 → 熟练 +20）
L.SX = { every: 12, cul: 1.1 };
L.DAOLV_ARTS = { su: ['x_qingmu', 'z_huichun', 'm_baicao', 'x_changchun'], ye: ['z_liehuo', 'x_lieyang', 'm_xuedun', 'z_fentian'] };
// 常驻的道侣加成：×1.25 → ×1.1（双修动作补回来；nopeople2 时照旧 ×1.25）
L.addCulMod('daolv', 85, st => (st.daolv && !L.daolvBlocked(st) ? [(ON() ? '道侣·' : '道侣双修·') + L.npcName(st, st.daolv), ON() ? L.SX.cul : 1.25, ''] : null));
L.sxArt = function (st) {
  const list = L.DAOLV_ARTS[st.daolv] || [];
  return list.find(a => !L.artOwned(st, a)) || list[ppl(st).sxN % Math.max(1, list.length)] || null;
};
L.sxLeft = st => Math.max(0, ppl(st).sx + L.SX.every - st.tick);
L.sxWhy = function (st) {
  if (!ON()) return '还没开放';
  if (!st.daolv) return '还没有道侣';
  if (L.daolvBlocked && L.daolvBlocked(st)) return '太上无情：双修失效';
  if (st.p.r > L.MAXR) return '已证大道';
  const left = L.sxLeft(st);
  if (left > 0) return `还要 ${left} 周天`;
  if (L.busy(st)) return '眼下有事在身';
  if (L.isFull(st)) return '修为已圆满，先去突破';
  return '';
};
L.sxInfo = function (st) {
  const why = L.sxWhy(st), a = st.daolv ? L.sxArt(st) : null;
  return { ok: !why, why, left: st.daolv ? L.sxLeft(st) : 0, m: L.retMult(st), len: L.RET.len, art: a, artNew: !!a && !L.artOwned(st, a), extra: L.gainCalm(st) * (L.retMult(st) - 1) * L.RET.len, who: st.daolv };
};
L.shuangxiu = function (st) {
  if (L.sxWhy(st)) return null;
  const id = st.daolv, P = ppl(st), a = L.sxArt(st);
  // 免费：借闭关的“头一回不收灵石”走一遍，再把原样放回去
  const f0 = st.flags.retFree;
  st.flags.retFree = 0;
  const ok = L.startRetreat(st);
  st.flags.retFree = f0;
  if (!ok) return null;
  st.retreat.sx = id;
  const first = !P.sxN;
  P.sx = st.tick; P.sxN++;
  st.stats.shuangxiu = (st.stats.shuangxiu || 0) + 1;
  const it = a ? L.giveArt(st, a, { src: 'daolv' }) : null;
  L.log(st, `与${L.npcName(st, id)}双修 ${L.RET.len} 周天（修炼 ×${st.retreat.m.toFixed(2)}，不花灵石）${it ? '：' + L.artItemText(st, it) : ''}`, 'gold');
  if (first) L.fireTrigger(st, 'shuangxiu:' + id);
  return { id, it, m: st.retreat.m, first };
};
wrap('retName', b => r => (r && r.sx ? '双修' : b(r)));

// ---------- 每周天 ----------
L.peopleTick = function (st, out) {
  if (!ON() || st.p.r > L.MAXR) return;
  for (const id of L.PPL) if (st.npc && st.npc[id]) pqCheck(st, id);
  pqOnRecipe(st);
  // 双修到时候了：提一次（界面冒气泡）
  const P = ppl(st);
  if (st.daolv && !L.sxWhy(st) && P.note.sx !== P.sx) { P.note.sx = P.sx; out.sx = true; emit('people', { k: 'sx', id: st.daolv }); }
};

// ---------- 事件能力 ----------
// elig.heart：事件里那位人物（ev.npc）至少几心；elig.comp：这趟历练同行的是他（同伴位或道侣）；触发键 shuangxiu:<id>（第一次双修）
L.supportElig('heart', { ok: v => Number.isInteger(v) && v >= 0 && v <= 5, test: (st, v, ev) => ON() && !!ev.npc && L.met(st, ev.npc) && L.hearts(st, ev.npc) >= v });
L.supportElig('comp', { ok: v => !!L.NPCS[v], test: (st, v) => ON() && !!st.exp && L.companionOn(st, v) });
L.supportTrigger('shuangxiu:');
// 本刀的事件（id 以 pp_ 开头）在 nopeople2 时不出
wrap('eligible', b => function (st, ev, where, ctx) { if (!ON() && /^pp_/.test(ev.id)) return false; return b(st, ev, where, ctx); });
});
