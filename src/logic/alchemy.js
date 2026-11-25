/* 废柴仙途 · 逻辑模块 alchemy：炼丹（docs/SYSTEMS.md §5，丹方表 docs/CONTENT.md §5.1）
 * 模块写法见 src/logic.js 顶部说明。
 *
 *   丹方 18 + 1：基础三种（培元、破境、疗伤，丹炉 1 级，不需药引）+ 药引组合 15 种（两味药引可相同，5×5 对称表的 15 格）+ 秘方九转金丹（五种药引各一）。
 *   发现：药引格没试过显示“？”，【试炼】按那一格的丹方付材料：丹成（没炸炉）就揭晓并记进 st.meta.recipe（跨世保留）；炸炉只亏材料。
 *         葛老、丹经、事件的 fx.recipe（'need' = 随机揭晓一格没试过的；或指定丹方 id）直接告诉你某一格。九转金丹只能靠 fx.recipe 学到。
 *   三类（ART.pillGroup 同）：修 x = 修炼类、战 z = 战斗类（计丹毒）；根 g = 根基类（不计丹毒，有每境界次数上限）。
 *   服用：修炼类与根基类炼成即服；战斗类（爆气、雷火）与疗伤丹收进丹囊 st.dan.bag，到时候再服——爆气丹管下一场对决或下一趟历练，雷火丹管下一趟历练。
 *   丹毒 st.toxin（0～100；天劫临阵吞丹也走 L.addToxin，旧档 st.trib.toxin 折进来）：每服一枚修炼 / 战斗类 +15（上品 +10、极品 +5），突破时服的破境丹每枚 +10；每周天 −2（灵泉每级再 −0.5，白鹤类灵宠天赋另加）。
 *         服之前已 > 60：药力减半；服了会超过 100：不能服。
 *   自动续炼：最多勾 3 种，每 3 周天材料够就各炼一炉（修炼类在丹毒会过 60 时跳过，战斗类丹囊里各留 3 枚为止）。
 *   st.dan = { bag { 丹方: [品质…] }, next { baoqi 战力倍率, leihuo 分数, wudao 顿悟倍率, bingxin 突破加成, dingshen 承劫加成 }, cnt { 丹方+境界: 次数 }, auto [丹方…] }
 *   成丹率与品质沿用 L.alchRate、L.QUAL（看炉灵宠、丹火诀、丹道大会、葛老加成）；L.ALCH_ON = false（sim 的 noalch）：没有药引丹、没有丹毒。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;
const mi = st => Math.max(L.si(st.p), (st.flags && st.flags.maxI) || 0);
const rr = st => Math.min(st.p.r, 8);
L.ALCH_ON = true;
const ON = () => L.ALCH_ON !== false;

// ---------- 丹方（CONTENT §5.1） ----------
// g 类别；herbs 灵草基数（× L.herbScale）；lv 丹炉等级；yin 两味药引；bag 收进丹囊；per 每境界上限；secret 只能由 fx.recipe 学到
L.RECIPES = [
  // 培元丹、聚灵丹的灵草价由 tools/sim.js 校准（CONTENT 写 10 / 16：勤快玩家炼气期四分之一的修为来自培元丹、聚灵丹几乎常驻）。
  // 丹毒上线后试过调回去，但丹毒很少卡住（引导型平均 6～16），聚灵丹的门槛是火引冰引和灵草：16 时引导型聚灵覆盖四成多、飞升快 6%，40 与合并前持平
  { k: 'peiyuan', n: '培元丹', g: 'x', d: '服下立得 4 周天修为', herbs: 24, lv: 1 },
  { k: 'pojing', n: '破境丹', g: 'g', d: '突破时每枚成功率 +15%（一次最多三枚，每枚丹毒 +10）', herbs: 8, lv: 1 },
  { k: 'liaoshang', n: '疗伤丹', g: 'g', d: '收进丹囊；负伤时服一枚立刻痊愈', herbs: 6, lv: 1, bag: 1 },
  { k: 'baoqi', n: '爆气丹', g: 'z', yin: ['fire', 'fire'], d: '收进丹囊；服下后下一场对决或下一趟历练战力 ×1.3', herbs: 12, lv: 3, bag: 1 },
  { k: 'bingxin', n: '冰心丹', g: 'g', yin: ['ice', 'ice'], d: '下一次突破成功率 +5%（心魔劫动摇不扣）', herbs: 12, lv: 5, per: 3 },
  { k: 'cuiti', n: '淬体丹', g: 'g', yin: ['thunder', 'thunder'], d: '永久战力 +1%（每境界 3 枚）', herbs: 16, lv: 5, per: 3 },
  { k: 'yanshou', n: '延寿丹', g: 'g', yin: ['wood', 'wood'], d: '寿元 +8%（与坊市共用每境界三枚上限）', herbs: 12, lv: 5 },
  { k: 'yanghun', n: '养魂丹', g: 'x', yin: ['soul', 'soul'], d: '装着的三门功法熟练各 +15', herbs: 16, lv: 8 },
  { k: 'juling', n: '聚灵丹', g: 'x', yin: ['fire', 'ice'], d: '接下来 6 周天修炼速度 ×1.5', herbs: 40, lv: 3 },
  { k: 'leihuo', n: '雷火丹', g: 'z', yin: ['fire', 'thunder'], d: '收进丹囊；服下后下一趟历练分数 +10', herbs: 14, lv: 3, bag: 1 },
  { k: 'baicao', n: '百草丹', g: 'x', yin: ['fire', 'wood'], d: '接下来 6 周天灵田作物产量 ×2', herbs: 10, lv: 3 },
  { k: 'wudao', n: '悟道丹', g: 'x', yin: ['fire', 'soul'], d: '下一次闭关坐满必顿悟，顿悟 ×2', herbs: 20, lv: 8 },
  { k: 'pozhang', n: '破障丹', g: 'g', yin: ['ice', 'thunder'], d: '立得一次“屡败屡战”：突破 +10%（每境界 1 枚）', herbs: 18, lv: 8, per: 1 },
  { k: 'qingdu', n: '清毒丹', g: 'g', yin: ['ice', 'wood'], d: '丹毒 −40', herbs: 8, lv: 3 },
  { k: 'dingshen', n: '定神丹', g: 'g', yin: ['ice', 'soul'], d: '下一次天劫承劫：成功率 +5%', herbs: 18, lv: 8, per: 3 },
  { k: 'huaxing', n: '化形丹', g: 'g', yin: ['thunder', 'wood'], d: '出战的灵宠立升 1 级（每境界 3 枚）', herbs: 14, lv: 5, per: 3 },
  { k: 'xisui', n: '洗髓丹', g: 'g', yin: ['thunder', 'soul'], d: '灵根提升一档，可以比剧情觉醒提前一档（丹炉 8 级或葛老为知己）', herbs: 30, treasure: 1, lv: 8 },
  { k: 'zhuyan', n: '驻颜丹', g: 'g', yin: ['wood', 'soul'], d: '万能礼物：最接近知己的那位好感 +10（每境界 3 枚）', herbs: 12, lv: 5, per: 3 },
  { k: 'jiuzhuan', n: '九转金丹', g: 'g', yin: ['fire', 'ice', 'thunder', 'wood', 'soul'], d: '下一次大境界突破必定成功（秘方：丹经七页或葛老传授）', herbs: 40, treasure: 2, lv: 12, secret: 1 },
];
const REC = {}; for (const rc of L.RECIPES) REC[rc.k] = rc;
L.RECIPE = REC;   // 丹方 id → 丹方（L.REC 是历练推荐战力的参数，expedition.js）
L.PILL_G = { x: '修炼', z: '战斗', g: '根基' };
L.QUAL = [{ n: '下品', m: 0.7 }, { n: '中品', m: 1 }, { n: '上品', m: 1.3 }, { n: '极品', m: 1.8 }];
// 5×5 药引表（对称）：YIN_GRID[i] = [a, b, 丹方]，a ≤ b（按 L.YIN_KEYS 的次序）；共 15 格
L.YIN_GRID = [];
for (const rc of L.RECIPES) if (rc.yin && rc.yin.length === 2) L.YIN_GRID.push([rc.yin[0], rc.yin[1], rc.k]);
L.yinRecipe = (a, b) => { const g = L.YIN_GRID.find(x => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a)); return g ? REC[g[2]] : null; };
L.recipeYin = rc => { const o = {}; for (const k of rc.yin || []) o[k] = (o[k] || 0) + 1; return o; };
L.isBase = rc => !rc.yin;
const metaRec = st => { st.meta = st.meta || L.newMeta(); return st.meta.recipe || (st.meta.recipe = {}); };
// st.meta.recipe：试出来的丹方（跨世保留）。core.js 的 L.newMeta 包一层加上它（新档、转世、读档迁移都走 L.newMeta）
{ const nm = L.newMeta; L.newMeta = () => Object.assign(nm(), { recipe: {} }); }
// 药引丹方表：筑基中期开放（SYSTEMS §0，转世后全开）
L.yinOpen = st => ON() && (st.rebirth > 0 || mi(st) >= 5);
L.recipeKnown = (st, k) => { const rc = REC[k]; return !!rc && (L.isBase(rc) || !!(st.meta && st.meta.recipe && st.meta.recipe[k])); };
L.recipeCount = st => L.YIN_GRID.filter(g => L.recipeKnown(st, g[2])).length;
// 炼丹房列出来的丹方（基础三种 + 揭晓过的药引丹），按类分页
L.recipeList = (st, g) => L.RECIPES.filter(rc => (!g || rc.g === g) && L.recipeKnown(st, rc.k));

// 太乙真经省灵草；丹火诀、炉火纯青加成丹率（arts.js）
L.herbCost = (st, rc) => Math.ceil(rc.herbs * L.herbScale(st) * L.artHerbCost(st));
L.alchRate = st => clamp(0.6 + 0.03 * st.home.furnace + (L.friend(st, 'ge') ? 0.15 : 0) + (L.has(st, 'alch') ? 0.15 : 0) + (st.sect && st.sect.id === 'dan' ? 0.15 : 0) + L.artAlchRate(st) + L.calAlch(st), 0.1, 0.97);   // 丹道大会 +10%（calendar.js）；看炉灵宠（pets.js 包一层）
L.pillPower = st => (st.sect && st.sect.id === 'dan' ? 1.3 : 1);   // 丹霞谷：丹药效果 ×1.3

// ---------- 丹囊、待生效、次数 ----------
L.newDan = () => ({ bag: {}, next: {}, cnt: {}, auto: [] });
const dan = st => {
  let d = st.dan;
  if (!d || typeof d !== 'object') d = st.dan = L.newDan();
  for (const k of ['bag', 'next', 'cnt']) if (!d[k] || typeof d[k] !== 'object') d[k] = {};
  if (!Array.isArray(d.auto)) d.auto = [];
  return d;
};
L.danOf = dan;
L.bagN = (st, k) => ((dan(st).bag[k] || []).length);
const bagPut = (st, k, q) => { const b = dan(st).bag; (b[k] = b[k] || []).push(q); b[k].sort((x, y) => y - x); };
const bagTake = (st, k) => { const b = dan(st).bag[k]; return b && b.length ? b.shift() : -1; };
L.danNext = (st, k) => dan(st).next[k] || 0;
const cntKey = (k, st) => k + '@' + rr(st);
L.pillUsed = (st, k) => (k === 'yanshou' ? st.lifePills[rr(st)] || 0 : dan(st).cnt[cntKey(k, st)] || 0);

// ---------- 丹毒 ----------
L.TOX = { pill: 15, good: 10, perfect: 5, bt: 10, decay: 2, spring: 0.5, half: 60, max: 100, autoMax: 60, cure: 40 };
L.toxinOn = st => ON() && (st.home.furnace > 0 || (st.toxin || 0) > 0);
L.toxAdd = q => (q >= 3 ? L.TOX.perfect : q === 2 ? L.TOX.good : L.TOX.pill);
L.toxHalf = st => (st.toxin || 0) > L.TOX.half;
// 服了会超过上限（按最坏的 +15 算）
L.toxFull = (st, add) => (st.toxin || 0) + (add === undefined ? L.TOX.pill : add) > L.TOX.max;
// 每周天消退：2 + 灵泉 0.5/级（洞府建筑上线后的 st.home.spring）；pets.js 包一层加白鹤类天赋
L.toxDecay = st => L.TOX.decay + L.TOX.spring * ((st.home && st.home.spring) || 0);
// src：来源（'bt' 突破的破境丹、'trib' 天劫临阵吞丹…），只作说明
L.addToxin = function (st, v, src) {
  const t0 = st.toxin || 0;
  st.toxin = clamp(t0 + v, 0, L.TOX.max);
  if (t0 <= L.TOX.half && st.toxin > L.TOX.half) { L.log(st, `丹毒 ${Math.round(st.toxin)}：过了六十，再服丹药药力减半`, 'red'); emit('toxin', { lv: 1, v: st.toxin }); }
  return st.toxin - t0;
};
L.toxLevel = st => { const t = st.toxin || 0; return t >= L.TOX.max ? 3 : t > L.TOX.half ? 2 : t > 30 ? 1 : 0; };
L.TOX_N = ['清', '微毒', '药力减半', '不能再服'];

// ---------- 能不能炼 ----------
// opt.trial：试炼没揭晓的药引格（不看“揭晓没有”，也不看这枚丹能不能服——服不了的也算炼成，只是白炼）
L.canCraft = function (st, k, opt) {
  opt = opt || {};
  const rc = REC[k];
  if (!rc || st.home.furnace < 1) return '需要先建丹炉';
  if (!L.isBase(rc) && !ON()) return '药引丹方未开放';
  if (!opt.trial && !L.recipeKnown(st, k)) return rc.secret ? '秘方：要有人传授' : '还没试出这一格';
  if (k === 'xisui') { if (!(L.friend(st, 'ge') || st.home.furnace >= 8)) return '需葛老为知己或丹炉 8 级'; }
  else if (st.home.furnace < rc.lv) return `丹炉 ${rc.lv} 级才炼得了`;
  if (!opt.trial) {
    const w = L.useWhy(st, k);
    if (w) return w;
  }
  if (st.herbs < L.herbCost(st, rc)) return '灵草不足';
  if ((rc.treasure || 0) > st.treasure) return '天材地宝不足';
  if (rc.yin && !L.yinOk(st, L.recipeYin(rc))) return '药引不足';
  return '';
};
// 炼成之后服不服得了（丹囊里收着的看囊满没满）
L.useWhy = function (st, k) {
  const rc = REC[k], p = st.p;
  if (rc.bag) return L.bagN(st, k) >= 9 ? '丹囊里已有 9 枚' : '';
  if ((rc.g === 'x' || rc.g === 'z') && ON() && L.toxFull(st)) return `丹毒 ${Math.round(st.toxin)}，再服就要中毒`;
  if (k === 'xisui' && p.t >= 6) return '灵根已至巅峰';
  if (k === 'xisui' && p.t >= L.talentCap(st)) return '灵根已到此境界的极限，突破后再炼';
  if (k === 'yanshou' && L.pillUsed(st, k) >= 3) return '本境界延寿丹已服满';
  if (rc.per && L.pillUsed(st, k) >= rc.per) return `本境界已服满 ${rc.per} 枚`;
  if (k === 'jiuzhuan' && st.flags.sureBt) return '已有一枚九转金丹';
  if ((k === 'bingxin' || k === 'dingshen' || k === 'wudao') && L.danNext(st, k)) return '上一枚的药力还没用掉';
  // 聚灵丹、百草丹不叠：药力还在就别再服
  if (k === 'juling' || k === 'baicao') { const b = (st.buffs || []).find(x => x.src === k); if (b) return `药力还在（剩 ${b.left} 周天）`; }
  if (k === 'huaxing') { const pt = L.petOut(st) || (st.pets || [])[0]; if (!pt) return '没有灵宠'; if (L.petMaxLv(pt) <= pt.lv) return pt.lv >= L.PET_N.lvMax ? '灵宠已满级' : '灵宠要先进化'; }
  if (k === 'zhuyan' && !zhuyanTo(st)) return '还没有结识的人';
  if (k === 'yanghun' && !L.artSlots(st).some(Boolean)) return '没装功法';
  if (k === 'qingdu' && !(st.toxin > 0)) return '没有丹毒';
  return '';
};
// 驻颜丹送给谁：结识过的人里好感最高、还没到知己的；都是知己就给好感最高、没满的
function zhuyanTo(st) {
  const ids = Object.keys(st.npc || {}).filter(id => L.NPCS[id] && L.aff(st, id) < 100);
  if (!ids.length) return null;
  const pre = ids.filter(id => L.aff(st, id) < 60);
  return (pre.length ? pre : ids).sort((a, b) => L.aff(st, b) - L.aff(st, a))[0];
}

// ---------- 炼 ----------
// opt.auto 自动续炼（日志带“自动续炼”）；opt.trial 试炼
L.craft = function (st, k, opt) {
  opt = opt || {};
  if (L.canCraft(st, k, opt)) return null;
  const rc = REC[k], d = dan(st);
  // 丹剑双绝：25% 不耗药引（没有药引的丹方不耗灵草）
  const free = L.comboOn(st, 'c9') && R() < 0.25;
  if (!(free && !rc.yin)) st.herbs -= L.herbCost(st, rc);
  if (rc.yin && !free) L.yinPay(st, L.recipeYin(rc));
  st.treasure -= rc.treasure || 0;
  st.stats.crafts++;
  if (st.sect) L.taskHit(st, 'act', t => t.sub === 'craft');
  const res = { k, n: rc.n, g: rc.g, free, auto: !!opt.auto, trial: !!opt.trial };
  // 丹霞鼎（宗门镇宗法宝，gear.js）：炼丹不炸炉
  if (R() >= L.alchRate(st) && !L.gearNoBoom(st)) { res.ok = false; L.log(st, `${opt.auto ? '自动续炼：' : ''}炼制${opt.trial ? '（试炼）' : ''}${rc.n}时炸炉了……材料化为飞灰`, 'red'); return res; }
  res.ok = true;
  // 揭晓：药引丹第一次炼成，记进图鉴（跨世保留）
  if (rc.yin && !L.recipeKnown(st, k)) { metaRec(st)[k] = 1; res.fresh = true; st.stats.recipes = (st.stats.recipes || 0) + 1; L.log(st, `试出新丹方：${L.yinText(L.recipeYin(rc))} → ${rc.n}（记入图鉴）`, 'gold'); emit('recipe', k); }
  const pPerfect = 0.05 + st.home.furnace * 0.006 + (L.friend(st, 'ge') ? 0.05 : 0) + (L.has(st, 'alch') ? 0.05 : 0);
  const pGood = 0.25 + L.artAlchQual(st);   // 丹火诀：上品以上 +10%
  const x = R();
  const q = x < pPerfect ? 3 : x < pPerfect + pGood ? 2 : x < pPerfect + pGood + 0.5 ? 1 : 0;
  res.q = q;
  if (q >= 2) st.stats.goodPill = (st.stats.goodPill || 0) + 1;
  if (q === 3) st.stats.perfect++;
  if (rc.bag) { bagPut(st, k, q); res.fx = `收进丹囊（${rc.n} ${L.bagN(st, k)} 枚）`; res.bag = true; }
  else if (L.useWhy(st, k)) { res.fx = '丹成了，可眼下服不下，药力散了'; res.wasted = true; }
  else Object.assign(res, take(st, k, q));
  L.log(st, `${opt.auto ? '自动续炼：' : ''}丹成！${L.QUAL[q].n}${rc.n}：${res.fx}`, q === 3 ? 'gold' : 'jade');
  L.checkQuests(st);
  return res;
};
// 服一枚（炼成即服的，或从丹囊里拿的）：丹毒、药力减半、效果
function take(st, k, q) {
  const rc = REC[k], p = st.p, d = dan(st), out = {};
  const toxic = (rc.g === 'x' || rc.g === 'z') && ON();
  const half = toxic && L.toxHalf(st);
  const m = L.QUAL[q].m * L.pillPower(st) * (half ? 0.5 : 1);
  out.half = half;
  if (k === 'peiyuan') { const g = L.gainCalm(st) * 4 * m; L.addXp(st, g); out.fx = '修为 +' + L.fmt(g); }
  else if (k === 'pojing') { const n = q === 3 ? 2 : 1; st.pills += n; out.fx = '破境丹 +' + n; }
  else if (k === 'juling') { const t = Math.max(1, Math.round(6 * m)); const c = q === 3 ? 2 : 1.5; st.buffs.push({ cul: c, left: t, src: 'juling' }); out.fx = `修炼速度 ×${c}（${t} 周天）`; }
  else if (k === 'baicao') { const t = Math.max(1, Math.round(6 * m)); st.buffs.push({ field: L.CROP_V.baicao, left: t, src: 'baicao' }); out.fx = `灵田作物产量 ×${L.CROP_V.baicao}（${t} 周天）`; }
  else if (k === 'yanghun') { const n = Math.round(15 * m); const ids = L.artSlots(st).filter(Boolean); for (const id of ids) L.addMastery(st, id, n); out.fx = `${ids.map(id => '《' + L.art(id).n + '》').join('')}熟练各 +${n}`; }
  else if (k === 'wudao') { d.next.wudao = m; out.fx = `下一次闭关坐满必顿悟，顿悟 ×${L.fmt1(2 * m)}`; }
  else if (k === 'baoqi') { d.next.baoqi = 1 + 0.3 * m; out.fx = `下一场对决或下一趟历练战力 ×${d.next.baoqi.toFixed(2)}`; }
  else if (k === 'leihuo') { d.next.leihuo = Math.round(10 * m); out.fx = `下一趟历练分数 +${d.next.leihuo}`; }
  else if (k === 'bingxin') { d.next.bingxin = Math.round(5 * m) / 100; out.fx = `下一次突破成功率 +${L.pct(d.next.bingxin)}`; }
  else if (k === 'dingshen') { d.next.dingshen = Math.round(5 * m) / 100; out.fx = `下一次天劫承劫 +${L.pct(d.next.dingshen)}`; }
  else if (k === 'cuiti') { const v = Math.round(m) / 100; st.bonus.atk += v; out.fx = `永久战力 +${L.pct(v)}`; }
  else if (k === 'pozhang') { p.fails = (p.fails || 0) + 1; out.fx = `屡败屡战 ×${p.fails}：下一次突破 +${L.pct(p.fails * L.BT.fail)}`; }
  else if (k === 'qingdu') { const v = -Math.round(L.TOX.cure * m); const dd = L.addToxin(st, v); out.fx = `丹毒 ${Math.round(dd)}（现在 ${Math.round(st.toxin)}）`; }
  else if (k === 'huaxing') { const pt = L.petOut(st) || st.pets[0], lv0 = pt.lv; L.petAddXp(st, pt, L.petNeed(pt) - pt.xp + 1e-9); out.fx = `【${L.petName(pt)}】Lv${lv0} → Lv${pt.lv}`; }
  else if (k === 'zhuyan') { const id = zhuyanTo(st), dd = L.addAff(st, id, Math.round(10 * m)); out.fx = `${L.npcName(st, id)}好感 +${dd}`; }
  else if (k === 'yanshou') { st.lifePills[rr(st)] = (st.lifePills[rr(st)] || 0) + 1; const v = Math.round(L.REALMS[rr(st)].life * 0.08 * m); st.lifeBonus += v; out.fx = `寿元 +${L.fmt(v)} 年`; }
  else if (k === 'xisui') { const from = p.t; p.t = Math.min(6, p.t + 1); out.fx = `灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`; out.talent = true; if (q === 3) { st.bonus.cul += 0.03; out.fx += '，极品药力再增修炼 3%'; } }
  else if (k === 'jiuzhuan') { st.flags.sureBt = 1; st.stats.jiuzhuan = (st.stats.jiuzhuan || 0) + 1; out.fx = '下一次突破必定成功'; }
  else if (k === 'liaoshang') { p.inj = 0; out.fx = '伤势痊愈'; }
  if (rc.per) d.cnt[cntKey(k, st)] = (d.cnt[cntKey(k, st)] || 0) + 1;
  if (toxic) { const t = L.addToxin(st, L.toxAdd(q)); out.tox = t; out.fx += `（丹毒 +${Math.round(t)}${half ? '，药力减半' : ''}）`; }
  return out;
}
// 从丹囊里服一枚（爆气丹、雷火丹；疗伤丹走 L.heal）
L.takeWhy = function (st, k) {
  const rc = REC[k];
  if (!rc || !rc.bag) return '这种丹炼成即服';
  if (!L.bagN(st, k)) return '丹囊里没有';
  if (k === 'liaoshang') return st.p.inj > 0 ? '' : '没有负伤';
  if (L.danNext(st, k)) return '上一枚的药力还没用掉';
  if (ON() && L.toxFull(st, L.toxAdd(dan(st).bag[k][0]))) return `丹毒 ${Math.round(st.toxin)}，再服就要中毒`;
  return '';
};
L.takePill = function (st, k) {
  if (L.takeWhy(st, k)) return null;
  const q = bagTake(st, k), rc = REC[k];
  const r = take(st, k, q);
  L.log(st, `服下${L.QUAL[q].n}${rc.n}：${r.fx}`, 'jade');
  return Object.assign({ k, n: rc.n, q }, r);
};
// 试炼一格（a、b 为药引键）
L.trialWhy = function (st, a, b) {
  const rc = L.yinRecipe(a, b);
  if (!rc) return '没有这一格';
  if (!L.yinOpen(st)) return '筑基中期开放';
  if (L.recipeKnown(st, rc.k)) return '';
  return L.canCraft(st, rc.k, { trial: true });
};
L.trial = function (st, a, b) {
  const rc = L.yinRecipe(a, b);
  if (!rc || L.trialWhy(st, a, b)) return null;
  return L.craft(st, rc.k, { trial: !L.recipeKnown(st, rc.k) });
};
// 一格要付的材料（没揭晓的格子也照付）
L.cellCost = (st, rc) => ({ herbs: L.herbCost(st, rc), treasure: rc.treasure || 0, yin: L.recipeYin(rc) });
// 揭晓一格（fx.recipe）：'need' 随机一格没试过的（丹炉等级够的优先）；也可指定丹方
L.revealRecipe = function (st, v) {
  let k = v;
  if (v === 'need') {
    const left = L.YIN_GRID.map(g => REC[g[2]]).filter(rc => !L.recipeKnown(st, rc.k));
    if (!left.length) return null;
    const ok = left.filter(rc => st.home.furnace >= rc.lv);
    k = pick(ok.length ? ok : left).k;
  }
  if (!REC[k] || L.recipeKnown(st, k)) return null;
  metaRec(st)[k] = 1;
  st.stats.recipes = (st.stats.recipes || 0) + 1;
  L.log(st, `得知丹方：${REC[k].yin ? L.yinText(L.recipeYin(REC[k])) + ' → ' : ''}${REC[k].n}（记入图鉴）`, 'gold');
  emit('recipe', k);
  return k;
};

// ---------- 自动续炼 ----------
L.AUTO = { max: 3, every: 3, bagKeep: 3 };
L.autoOn = (st, k) => dan(st).auto.includes(k);
L.setAuto = function (st, k, on) {
  const d = dan(st), i = d.auto.indexOf(k);
  if (!on) { if (i >= 0) d.auto.splice(i, 1); return true; }
  if (i >= 0) return true;
  if (!L.recipeKnown(st, k) || d.auto.length >= L.AUTO.max) return false;
  d.auto.push(k);
  return true;
};
L.autoWhy = function (st, k) {
  const rc = REC[k];
  if (rc.bag && L.bagN(st, k) >= L.AUTO.bagKeep) return `丹囊里已有 ${L.AUTO.bagKeep} 枚`;
  if ((rc.g === 'x' || rc.g === 'z') && !rc.bag && ON() && (st.toxin || 0) + L.TOX.pill > L.TOX.autoMax) return '丹毒会过六十，先停一停';
  if (k === 'peiyuan' && L.isFull(st)) return '修为已满';
  if (k === 'pojing' && st.pills >= 9) return '破境丹已有 9 枚';
  return L.canCraft(st, k);
};
L.alchTick = function (st, out) {
  const d = dan(st);
  if (st.toxin > 0) st.toxin = Math.max(0, st.toxin - L.toxDecay(st));
  if (!d.auto.length || st.tick % L.AUTO.every !== 0 || st.p.r > L.MAXR) return;
  const done = [];
  for (const k of d.auto.slice()) { if (!L.recipeKnown(st, k)) { L.setAuto(st, k, false); continue; } if (!L.autoWhy(st, k)) { const r = L.craft(st, k, { auto: true }); if (r) done.push(r); } }
  if (out && done.length) out.brew = done;
};

// ---------- 接进别的系统 ----------
// 爆气丹：下一场对决（约战、论道、首领、会武、宗门战、晋升挑战）或下一趟历练战力 ×1.3；雷火丹：下一趟历练分数 +10
L.addAtkMod('dan_baoqi', 92, st => (L.danNext(st, 'baoqi') ? ['爆气丹（下一场对决或历练）', L.danNext(st, 'baoqi'), 'alch'] : null));
L.addExpMod('dan_leihuo', 77, st => (L.danNext(st, 'leihuo') ? ['雷火丹', L.danNext(st, 'leihuo'), 'alch'] : null));
// 冰心丹、定神丹：下一次突破（金丹起是天劫）的成功率；L.btParts 读它，天劫的 partsOf 也读 L.btParts。冰心丹“心魔劫动摇不扣”：dao / trib 可读 L.danNext(st, 'bingxin')
L.addBtMod('dan', 58, st => {
  const a = [];
  if (L.danNext(st, 'bingxin')) a.push(['冰心丹', L.danNext(st, 'bingxin')]);
  if (L.danNext(st, 'dingshen')) a.push(['定神丹（承劫）', L.danNext(st, 'dingshen')]);
  return a.length ? a : null;
});
const wrap = (name, f) => { const base = L[name]; if (typeof base !== 'function') return; L[name] = f(base); };
const useUp = (st, ...ks) => { const d = dan(st); for (const k of ks) if (d.next[k]) { delete d.next[k]; L.log(st, `${REC[k].n}的药力用掉了`); } };
for (const fn of ['pactDuel', 'tournament', 'fightBoss', 'sectMeet', 'sectWar']) wrap(fn, b => function (st) { const r = b.apply(this, arguments); if (r) useUp(st, 'baoqi'); return r; });
wrap('promote', b => function (st) { const r = b.apply(this, arguments); if (r && r.duel) useUp(st, 'baoqi'); return r; });
wrap('startExp', b => function (st) { const ok = b.apply(this, arguments); if (ok) useUp(st, 'baoqi', 'leihuo'); return ok; });
// 突破：服的破境丹每枚丹毒 +10；冰心丹、定神丹的药力用掉。接在 L.btResolve 上（筑基的一次掷与天劫 L.tribFinish 都走它）；
// 天劫临场吞的丹（trib.js）自己调 L.addToxin(st, 20, 'trib')
wrap('btResolve', b => function (st, ok, o) {
  const r = b.apply(this, arguments);
  if (r) { const n = (o && o.pills) || 0; if (n && ON()) L.addToxin(st, L.TOX.bt * n, 'bt'); useUp(st, 'bingxin', 'dingshen'); }
  return r;
});
// 悟道丹：下一次闭关坐满必顿悟，顿悟 ×2
wrap('endRetreat', b => function (st, done) {
  const kind = st.retreat && st.retreat.kind, m = L.danNext(st, 'wudao');
  const r = b.apply(this, arguments);
  if (r && done && kind === 'ret' && m) {
    const want = L.gainCalm(st) * L.RET.epiTicks * 2 * m;
    if (want > r.epi) { L.addXp(st, want - r.epi); r.epi = want; }
    r.wudao = true; delete dan(st).next.wudao;
    L.log(st, `悟道丹药力发作，顿悟修为 +${L.fmt(want)}`, 'gold');
  }
  return r;
});
// 疗伤：先用丹囊里的疗伤丹，没有再用破境丹（效果相同，旧行为兜底）
wrap('canHeal', b => st => (st.p.inj > 0 && L.bagN(st, 'liaoshang') > 0) || b(st));
wrap('heal', b => function (st) {
  if (st.p.inj > 0 && L.bagN(st, 'liaoshang') > 0) { bagTake(st, 'liaoshang'); st.p.inj = 0; L.log(st, '服下一枚疗伤丹，伤势痊愈', 'jade'); return true; }
  return b(st);
});
L.healWith = st => (st.p.inj > 0 && L.bagN(st, 'liaoshang') > 0 ? 'liaoshang' : st.pills > 0 ? 'pojing' : '');

// ---------- 事件能力（docs/EVENT_INTEGRATION.md）：fx.toxin（丹毒 ±n）、fx.recipe（'need' 或丹方 id） ----------
L.supportFx('toxin', { ok: v => Number.isFinite(v) && v !== 0, apply: (st, v, out) => { const d = L.addToxin(st, v); out.push(`丹毒 ${d >= 0 ? '+' : '−'}${Math.abs(Math.round(d))}（现在 ${Math.round(st.toxin)}）`); } });
L.supportFx('recipe', { ok: v => v === 'need' || !!REC[v] && !L.isBase(REC[v]), apply: (st, v, out) => {
  const k = L.revealRecipe(st, v);
  if (k) out.push(`得知丹方：${REC[k].n}${REC[k].secret ? '（秘方）' : '（' + L.yinText(L.recipeYin(REC[k])) + '）'}`);
  else { const h = Math.round(6 * L.herbScale(st)); st.herbs += h; out.push(`（这张方子你早就会了）灵草 +${h}`); }
} });

// ---------- 存档（可重复调用，不升版本）：旧档没有丹囊、丹毒；st.meta.recipe ----------
L.migrateAlch = function (s) {
  dan(s);
  s.meta.recipe = s.meta.recipe && typeof s.meta.recipe === 'object' ? s.meta.recipe : {};
  for (const k of Object.keys(s.meta.recipe)) if (!REC[k] || L.isBase(REC[k])) delete s.meta.recipe[k];
  s.dan.auto = s.dan.auto.filter(k => REC[k]).slice(0, L.AUTO.max);
  for (const k of Object.keys(s.dan.bag)) if (!REC[k] || !REC[k].bag || !Array.isArray(s.dan.bag[k])) delete s.dan.bag[k];
  if (typeof s.toxin !== 'number' || !isFinite(s.toxin)) s.toxin = 0;
  // 秘境先上线时（realm.js 的占位登记）记下的“没见过的丹方”：一张揭晓一格
  if (s.recipeNote > 0) { for (let i = 0; i < s.recipeNote; i++) L.revealRecipe(s, 'need'); delete s.recipeNote; }
  // 丹毒上线前天劫临阵吞丹记在 st.trib.toxin（trib.js），折进来
  if (s.trib && s.trib.toxin > 0) { s.toxin += s.trib.toxin; s.trib.toxin = 0; }
  s.toxin = clamp(s.toxin, 0, L.TOX.max);
};
});
