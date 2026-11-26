/* 废柴仙途 · 逻辑模块 codex：图鉴（SYSTEMS §15）
 * 模块写法见 src/logic.js 顶部说明。
 *
 * 十四类，分类与 ART.codexCats / ART.codexIcon 一致：map art combo gear pet pill recipe sigil people rival chain event realm ending。
 * 各系统已经各自记着“见过 / 发现”的，这里只读、不重复存：
 *   map 地点相性 st.meta.aff · combo 共鸣 st.meta.combo · pet 灵宠 st.meta.petSeen + petEvo · pill 丹方 L.recipeKnown（st.meta.recipe）
 *   rival 对手属性 宿敌线的 L.rivalKnown（五行 / 功法 / 法宝，st.meta.rival）+ st.meta.elem 的 boss_* · realm 秘境 st.meta.mj · chain 奇遇链 st.meta.chain（chains.js）· people 人物喜好 L.giftKnown（人物线导出，没接上时这一类不计）
 * 别处没有跨世记录的，记进 st.meta.cx：art 功法 · gear 法宝底子 · plan 器方 · sigil 阵图 · ev 奇遇（散件）· end 结局 · grp 已成组的类。
 *
 * 加成（都要克制，sim 对照 nocodex）：
 *   见多识广：总完成度（各类完成比例的平均）每 20% 修炼、战力各 +1%，上限 +5%（L.CX_V），转世后仍在（L.addCulMod / addAtkMod 'codex'）。
 *     按投胎那一刻的图鉴算（st.cxBirth），这一世新记的格子下一世才算进去——它是轮回的奖励；第一世是 +0%，引导型的节奏不受影响
 *     （sim 对照：一世里实时算的话引导型飞升快约 3.4%，524 → 506）。
 *   成组：某一类第一次集齐，一个小的永久加成（L.CX_GRP，多是寿元、奇遇把握、成丹率、灵石这类不怎么改节奏的）＋ 轮回时道果 +L.CX_V.grp。
 * 轮回：道果“图鉴新格 ×2”= 现在的总格数 − 这一世开局时的（st.cx0，samsara.js 读 L.codexNew）。
 * 老祖：第一次有新格时讲一次（界面 guide 读 st.cxNews）。
 * 存档：L.migrateCodex 幂等；旧档按手里已有的功法、法宝、器方、阵图补记。sim 对照：L.CODEX_ON = false 去掉两种加成（记录照旧）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;

// 见多识广：每 step 完成度修炼、战力各 +per（数值校准：原每 10% +1%、上限 +10%，第二世 / 第一世之比偏快，改成每 20% +1%、上限 +5%）
L.CX_V = { step: 0.20, per: 0.01, cap: 0.05, grp: 40, newCell: 2 };
const ON = () => L.CODEX_ON !== false;
const CX = st => {
  st.meta = st.meta || L.newMeta();
  const c = st.meta.cx && typeof st.meta.cx === 'object' ? st.meta.cx : (st.meta.cx = {});
  for (const k of ['art', 'gear', 'plan', 'sigil', 'ev', 'end', 'grp']) if (!c[k] || typeof c[k] !== 'object') c[k] = {};
  return c;
};
L.codexStore = CX;

// ---------- 结局（6，CONTENT §16；飞升 / 坐化时 samsara.js 记） ----------
L.ENDINGS = [
  { id: 'ascend', n: '白日飞升', d: '九九天劫散尽，踏云而去', bg: 'ascend' },
  { id: 'rest', n: '坐化', d: '寿元耗尽，于洞府中坐化', bg: 'rest' },
  { id: 'daolv', n: '道侣同升', d: '与道侣一同飞升', bg: 'ascend' },
  { id: 'summit', n: '掌宗飞升', d: '以宗主之身、带天下第一宗飞升', bg: 'summit' },
  { id: 'mozun', n: '魔道至尊', d: '魔门出身或血煞魔宗弟子，登顶天骄榜后飞升', bg: 'summit' },
  { id: 'hermit', n: '师徒了断', d: '与陆天衡了断旧案之后飞升', bg: 'hermit' },
];
L.ENDING = {}; for (const e of L.ENDINGS) L.ENDING[e.id] = e;
// 这一世现在结束，算得上哪几种结局（第一项是主结局）
L.endingsOf = function (st) {
  const out = [];
  if (st.p.r < 9) return ['rest'];
  const ef = st.eflags || {};
  if ((st.origin === 'moyi' || (st.sect && st.sect.id === 'xuesha')) && st.bestRank <= 1) out.push('mozun');
  if (st.sect && st.sect.rank >= 6 && st.sect.best <= 1) out.push('summit');
  if (st.daolv) out.push('daolv');
  if (ef.tianheng_dead || ef.tianheng_crippled || ef.tianheng_exposed || ef.tianheng_spared) out.push('hermit');
  out.push('ascend');
  return out;
};

// ---------- 十四类 ----------
const ACTS = ['斩妖', '寻宝', '采药'];
const evSetCache = { ver: -1, n: -1, set: null, list: null };
// 奇遇散件：洞府、历练、秘境、坊市的事件里不是链上一步的（链有自己的一类）
function evLoose() {
  const evs = L.events();
  if (evSetCache.ver === L.CAPS.ver && evSetCache.n === evs.length) return evSetCache;
  const list = evs.filter(ev => ['home', 'exp', 'realm', 'market'].includes(ev.where) && !ev.chain && L.evLive(ev));
  Object.assign(evSetCache, { ver: L.CAPS.ver, n: evs.length, list, set: new Set(list.map(e => e.id)) });
  return evSetCache;
}
const once = f => { let v = null; return () => v || (v = f()); };
// 宿敌：宿敌线导出 L.rivalKnown(st) → [{ id, n, el|null, art|null, gear|null }]（存在 st.meta.rival）；没有它时只认五行（st.meta.elem 的 rv_*）
const rivalFacts = st => (typeof L.rivalKnown === 'function' ? L.rivalKnown(st) || [] : L.RIVALS.filter(r => st.meta.elem['rv_' + r.id]).map(r => ({ id: r.id, n: r.id === 'mu' ? st.exName : r.name, el: '?', art: null, gear: null })));
const gearList = once(() => L.gearBases().slice());
const petCells = once(() => { const out = []; for (const sp of L.PET_IDS) { out.push({ k: sp, sp, b: 0 }); if (L.PET_SP[sp].a) out.push({ k: sp + '_a', sp, b: 1 }, { k: sp + '_b', sp, b: 2 }); } return out; });
const realmCells = once(() => { const out = []; for (const th of L.MJ_THEMES || []) out.push({ k: th.id + ':deep', th, t: 'deep' }, { k: th.id + ':clear', th, t: 'clear' }); out.push({ k: 'hunyuan', t: 'hunyuan' }); return out; });
const mjRec = st => (st.meta && st.meta.mj) || { th: {}, clears: 0 };
const realmOn = (st, c) => { const m = mjRec(st); if (c.t === 'hunyuan') return (m.clears || 0) >= ((L.MJ && L.MJ.hunyuan) || 3); const r = (m.th || {})[c.th.id] || {}; return c.t === 'deep' ? (r.deep || 0) >= 5 : (r.clears || 0) >= 1; };
const gifts = st => (typeof L.giftKnown === 'function' ? [].concat(L.giftKnown(st) || []) : null);
const sigilOn = (st, id) => id === 'f_juling' || !!CX(st).sigil[id];
L.CODEX = [
  { id: 'map', n: '地点相性', d: '每张图 × 斩妖 / 寻宝 / 采药，试过一次就知道是 ◎ ○ △',
    total: () => L.REGIONS.length * 3, got: st => { let n = 0; for (const k in st.meta.aff) if (+k < L.REGIONS.length * 3) n++; return n; },
    cells: st => L.REGIONS.map((r, k) => ({ g: r.n, list: ACTS.map((a, j) => ({ n: a, on: !!st.meta.aff[k * 3 + j], v: st.meta.aff[k * 3 + j] ? L.AFF_SYM[L.AFF[k][j]] : '' })) })) },
  { id: 'art', n: '功法', d: '得到过的功法（心法 / 战技 / 秘术）',
    total: () => L.ARTL.length, got: st => L.ARTL.filter(A => CX(st).art[A.id]).length,
    cells: st => [['x', '心法'], ['z', '战技'], ['m', '秘术']].map(([k, g]) => ({ g, list: L.ARTL.filter(A => A.k === k).map(A => ({ n: CX(st).art[A.id] ? A.n : '？', on: !!CX(st).art[A.id], v: L.ARTS[A.t] ? L.ARTS[A.t].n : '' })) })) },
  { id: 'combo', n: '共鸣', d: '有名有姓的功法共鸣，凑齐时揭晓',
    total: () => L.COMBOS.length, got: st => L.COMBOS.filter(c => st.meta.combo[c.id]).length,
    cells: st => [{ g: '', list: L.COMBOS.map(c => ({ n: st.meta.combo[c.id] ? c.n : (st.meta.chint || {})[c.id] ? '有提示' : '？', on: !!st.meta.combo[c.id] })) }] },
  { id: 'gear', n: '法宝', d: '经手过的法宝底子（兵器、法衣、饰品、首领专属、打造与镇宗）',
    total: () => gearList().length, got: st => { const g = CX(st).gear; let n = 0; for (const B of gearList()) if (g[B.id]) n++; return n; },
    cells: st => [['w', '兵器'], ['r', '法衣'], ['o', '饰品']].map(([s, g]) => ({ g, list: gearList().filter(B => B.slot === s).map(B => ({ n: CX(st).gear[B.id] ? B.n : '？', on: !!CX(st).gear[B.id] })) })) },
  { id: 'pet', n: '灵宠', d: '见过的种与试出来的进化形态',
    total: () => petCells().length, got: st => petCells().filter(c => (c.b ? (st.meta.petEvo || {})[c.k] : (st.meta.petSeen || {})[c.k])).length,
    cells: st => L.PET_IDS.map(sp => ({ g: (st.meta.petSeen || {})[sp] ? L.petFormName(sp, 0) : '？', list: petCells().filter(c => c.sp === sp).map(c => { const on = c.b ? !!(st.meta.petEvo || {})[c.k] : !!(st.meta.petSeen || {})[c.k]; return { n: on ? L.petFormName(sp, c.b) : '？', on }; }) })) },
  { id: 'pill', n: '丹方', d: '基础三方 + 药引丹方 + 九转秘方',
    total: () => Object.keys(L.RECIPE).length, got: st => Object.keys(L.RECIPE).filter(k => L.recipeKnown(st, k)).length,
    cells: st => [{ g: '', list: Object.keys(L.RECIPE).map(k => ({ n: L.recipeKnown(st, k) ? L.RECIPE[k].n : '？', on: L.recipeKnown(st, k) })) }] },
  { id: 'recipe', n: '器方', d: '得到过的器方（化神后器炉打造）',
    total: () => L.PLANS.length, got: st => L.PLANS.filter(P => CX(st).plan[P.id]).length,
    cells: st => [{ g: '', list: L.PLANS.map(P => ({ n: CX(st).plan[P.id] ? P.n : '？', on: !!CX(st).plan[P.id] })) }] },
  { id: 'sigil', n: '阵图', d: '得到过的阵图（聚灵阵自带）',
    total: () => Object.keys(L.ZHENTU).length, got: st => Object.keys(L.ZHENTU).filter(id => sigilOn(st, id)).length,
    cells: st => [{ g: '', list: Object.keys(L.ZHENTU).map(id => ({ n: sigilOn(st, id) ? L.ZHENTU[id] : '？', on: sigilOn(st, id), sigil: id })) }] },
  { id: 'people', n: '人物喜好', d: '送礼试出来的人物喜好', avail: st => !!gifts(st),
    // 格数：人物线（people.js）导出 L.GIFT_DEX（6 位人物 × 两 ♥ 一 ✕ = 18）；没有时按 SYSTEMS §15 的 14
    total: () => L.GIFT_DEX || 14, got: st => Math.min(L.GIFT_DEX || 14, (gifts(st) || []).length),
    cells: st => [{ g: '', list: (gifts(st) || []).map(x => ({ n: typeof x === 'string' ? x : (x && x.n) || '喜好', on: true })).concat(Array.from({ length: Math.max(0, (L.GIFT_DEX || 14) - (gifts(st) || []).length) }, () => ({ n: '？', on: false }))) }] },
  { id: 'rival', n: '对手属性', d: '宿敌的五行、功法、法宝（宿敌线 L.rivalKnown，交过手、打探过才知道），首领的五行',
    total: () => L.RIVALS.length * 3 + L.REGIONS.length, got: st => { let n = 0; for (const x of rivalFacts(st)) n += (x.el ? 1 : 0) + (x.art ? 1 : 0) + (x.gear ? 1 : 0); for (let k = 0; k < L.REGIONS.length; k++) if (st.meta.elem['boss_' + k]) n++; return n; },
    cells: st => { const F = {}; for (const x of rivalFacts(st)) F[x.id] = x; return L.RIVALS.map(r => { const x = F[r.id] || {}; const nm = x.n || (r.id === 'mu' ? st.exName : r.name); return { g: x.id ? nm : '？', list: [['el', '五行'], ['art', '功法'], ['gear', '法宝']].map(([k, t]) => ({ n: x[k] ? t + '·' + (k === 'el' ? (L.elName ? L.elName(x.el) : x.el) : k === 'art' ? (L.art && L.art(x.art) ? L.art(x.art).n : x.art) : x.gear.n) : t + '？', on: !!x[k] })) }; })
      .concat([{ g: '首领', list: L.BOSSES.map((B, k) => ({ n: st.meta.elem['boss_' + k] ? B.n : '？', on: !!st.meta.elem['boss_' + k] })) }]); } },
  { id: 'chain', n: '奇遇链', d: '十条奇遇链，每做完一步记一格（跨世取最远的那次）',
    total: () => L.CHAINS.reduce((a, c) => a + L.chainTotal(c.id), 0), got: st => L.CHAINS.reduce((a, c) => a + Math.min(L.chainTotal(c.id), Math.max(L.chainMeta(st, c.id).best || 0, L.chainGot(st, c.id))), 0),
    cells: st => L.CHAINS.map(c => { const best = Math.max(L.chainMeta(st, c.id).best || 0, L.chainGot(st, c.id)), t = L.chainTotal(c.id); return { g: c.n, chain: c.id, list: Array.from({ length: t }, (x, i) => ({ n: String(i + 1), on: i < best })) }; }) },
  { id: 'event', n: '奇遇', d: '经历过的奇遇（链以外的散件：访客、途中、秘境、坊市）',
    total: () => evLoose().list.length, got: st => { const S = evLoose().set; let n = 0; for (const id in CX(st).ev) if (S.has(id)) n++; return n; },
    cells: st => { const W = { home: '洞府', exp: '历练', realm: '秘境', market: '坊市' }; return Object.keys(W).map(w => ({ g: W[w], list: evLoose().list.filter(e => e.where === w).map(e => ({ n: CX(st).ev[e.id] ? L.fill(st, e.title) : '？', on: !!CX(st).ev[e.id] })) })); } },
  { id: 'realm', n: '秘境', d: '四个主题各：走到第 5 层、通关；合计通关 3 次得《混元道经》',
    total: () => realmCells().length, got: st => realmCells().filter(c => realmOn(st, c)).length,
    cells: st => [{ g: '', list: realmCells().map(c => ({ n: c.t === 'hunyuan' ? '混元道经' : c.th.n + (c.t === 'deep' ? '·五层' : '·通关'), on: realmOn(st, c) })) }] },
  { id: 'ending', n: '结局', d: '一世怎么结束的',
    total: () => L.ENDINGS.length, got: st => L.ENDINGS.filter(e => CX(st).end[e.id]).length,
    cells: st => [{ g: '', list: L.ENDINGS.map(e => ({ n: CX(st).end[e.id] ? e.n : '？', on: !!CX(st).end[e.id], d: e.d })) }] },
];
L.CODEX_CAT = {}; for (const c of L.CODEX) L.CODEX_CAT[c.id] = c;
const avail = (st, c) => !c.avail || c.avail(st);
L.codexAvail = avail;
L.codexCat = function (st, id) { const c = L.CODEX_CAT[id]; if (!c) return null; const total = c.total(st), got = Math.min(total, c.got(st)); return { id, n: c.n, d: c.d, total, got, avail: avail(st, c), full: total > 0 && got >= total, grp: !!CX(st).grp[id] }; };
L.codexList = st => L.CODEX.map(c => L.codexCat(st, c.id));
// 总格数（只算接上了的类）
L.codexCells = st => L.CODEX.reduce((a, c) => a + (avail(st, c) ? Math.min(c.total(st), c.got(st)) : 0), 0);
L.codexTotal = st => L.CODEX.reduce((a, c) => a + (avail(st, c) ? c.total(st) : 0), 0);
// 总完成度：各类完成比例的平均（大类不会把小类淹掉）
L.codexPct = function (st) {
  let s = 0, n = 0;
  for (const c of L.CODEX) { if (!avail(st, c)) continue; const t = c.total(st); if (!t) continue; s += Math.min(1, c.got(st) / t); n++; }
  return n ? s / n : 0;
};
const bonusOf = pct => Math.min(L.CX_V.cap, Math.floor(pct / L.CX_V.step + 1e-9) * L.CX_V.per);
L.codexBonusAt = bonusOf;
// 这一世的见多识广：按投胎时的完成度 st.cxBirth（这一世新记的下一世生效）；L.codexBonusNext 是照现在的图鉴、下一世能有多少
L.codexBonus = st => (ON() ? bonusOf(st.cxBirth || 0) : 0);
L.codexBonusNext = st => (ON() ? bonusOf(typeof st.cxPct === 'number' ? st.cxPct : L.codexPct(st)) : 0);
// 再记几格到下一档（按最省的那一类估：哪一类缺的格子占比最大就记它）
L.codexNextStep = function (st) {
  const pct = L.codexPct(st), goal = (Math.floor(pct / L.CX_V.step + 1e-9) + 1) * L.CX_V.step;
  if (bonusOf(pct) >= L.CX_V.cap) return null;
  let n = 0;
  for (const c of L.CODEX) if (avail(st, c) && c.total(st)) n++;
  // 结局只在一世结束时记，不拿它当“再记几格”的建议
  const per = L.CODEX.filter(c => c.id !== 'ending' && avail(st, c) && c.total(st) && c.got(st) < c.total(st)).map(c => ({ c, v: 1 / (n * c.total(st)) })).sort((a, b) => b.v - a.v);
  if (!per.length) return null;
  return { cat: per[0].c.id, n: Math.max(1, Math.ceil((goal - pct) / per[0].v - 1e-9)), goal };
};
L.codexNew = st => Math.max(0, L.codexCells(st) - (st.cx0 || 0));
// 这一世集齐的类（grp 记的是第几世集齐：rebirth + 1）
L.codexGrpNew = st => Object.keys(CX(st).grp).filter(k => CX(st).grp[k] === (st.rebirth || 0) + 1);

// ---------- 成组的小永久加成（某一类第一次集齐） ----------
L.CX_GRP = {
  map: { d: '历练分数 +1', exp: 1 }, art: { d: '寿元 +2%', life: 0.02 }, combo: { d: '突破成功率 +1%', bt: 0.01 }, gear: { d: '灵石收入 +2%', inc: 0.02 },
  pet: { d: '奇遇把握 +1%', luck: 0.01 }, pill: { d: '成丹率 +2%', alch: 0.02 }, recipe: { d: '灵石收入 +2%', inc: 0.02 }, sigil: { d: '突破成功率 +1%', bt: 0.01 },
  people: { d: '奇遇把握 +1%', luck: 0.01 }, rival: { d: '历练分数 +1', exp: 1 }, chain: { d: '奇遇把握 +2%', luck: 0.02 }, event: { d: '灵石收入 +3%', inc: 0.03 },
  realm: { d: '寿元 +3%', life: 0.03 }, ending: { d: '突破成功率 +2%', bt: 0.02 },
};
const grpSum = (st, k) => { if (!ON() || !st || !st.meta || !st.meta.cx) return 0; let v = 0; for (const id in st.meta.cx.grp) if (L.CX_GRP[id] && L.CX_GRP[id][k]) v += L.CX_GRP[id][k]; return v; };
L.codexGrpSum = grpSum;

// ---------- 加成登记 ----------
L.addCulMod('codex', 65, st => { const b = L.codexBonus(st); return b > 0 ? [`见多识广（投胎时图鉴 ${Math.round(st.cxBirth * 100)}%）`, 1 + b, 'codex'] : null; });
L.addAtkMod('codex', 65, st => { const b = L.codexBonus(st); return b > 0 ? [`见多识广（投胎时图鉴 ${Math.round(st.cxBirth * 100)}%）`, 1 + b, 'codex'] : null; });
L.addIncMul('codex', 66, st => { const v = grpSum(st, 'inc'); return v ? ['图鉴成组', 1 + v, ''] : null; });
L.addExpMod('codex', 76, st => { const v = grpSum(st, 'exp'); return v ? ['图鉴成组', v] : null; });
L.addBtMod('codex', 76, st => { const v = grpSum(st, 'bt'); return v ? ['图鉴成组', v] : null; });
{ const f0 = L.choiceLuck; L.choiceLuck = st => f0(st) + grpSum(st, 'luck'); }
{ const f0 = L.lifespan; L.lifespan = st => { const y = f0(st); return y === Infinity ? y : y * (1 + grpSum(st, 'life')); }; }
{ const f0 = L.alchRate; L.alchRate = st => Math.min(0.99, f0(st) + grpSum(st, 'alch')); }

// ---------- 记录：没有跨世记录的几类 ----------
{ const f0 = L.giveArt; L.giveArt = function (st, id, opt) { const it = f0(st, id, opt); if (st.arts && st.arts.own[id] !== undefined) CX(st).art[id] = 1; return it; }; }
{ const f0 = L.gearDrop; L.gearDrop = function (st, slot, tier, ctx) { const it = f0(st, slot, tier, ctx); if (it && it.gear) CX(st).gear[it.gear.id] = 1; return it; }; }
{ const f0 = L.givePlan; L.givePlan = function (st, id) { const t = f0(st, id); if (L.PLAN[id]) CX(st).plan[id] = 1; else if (L.ZHENTU[id]) CX(st).sigil[id] = 1; return t; }; }
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) {
  const auto = !!(st.visitor && ev && st.visitor.id === ev.id && st.visitor.left === 0);   // 访客久候自去：没见着，不记
  const res = rc0(st, ev, idx);
  if (res && ev && !ev.chain && !auto && ['home', 'exp', 'realm', 'market'].includes(ev.where)) CX(st).ev[ev.id] = 1;
  return res;
}; }
// 手里已有的（旧档、开局送的、迁移）补记；每月顺手做一次，很便宜
function seed(st) {
  const c = CX(st);
  if (st.arts) for (const id in st.arts.own) if (L.art(id)) c.art[id] = 1;
  if (st.gear) {
    for (const s of L.GEAR_SLOTS) if (st.gear[s]) c.gear[st.gear[s].id] = 1;
    for (const x of st.gear.pend || []) c.gear[x.id] = 1;
    for (const id in st.gear.plans || {}) if (L.PLAN[id]) c.plan[id] = 1;
    for (const id in st.gear.zhentu || {}) if (L.ZHENTU[id]) c.sigil[id] = 1;
  }
  // 洞府线的阵法系统收着的阵图（st.gear.zhentu，L.zhenOwnList）也算
  if (st.home && st.home.zhentu && typeof st.home.zhentu === 'object') for (const id in st.home.zhentu) if (L.ZHENTU[id]) c.sigil[id] = 1;
  if (typeof L.zhenOwnList === 'function') for (const id of [].concat(L.zhenOwnList(st) || [])) if (L.ZHENTU[id]) c.sigil[id] = 1;   // 洞府线 formation.js
}
L.codexSeed = seed;
L.codexEnding = function (st, ids) { const c = CX(st), fresh = []; for (const id of ids || []) if (L.ENDING[id] && !c.end[id]) { c.end[id] = 1; fresh.push(id); } return fresh; };
// 新格、成组：每月看一次。新格记进 st.cxNews（老祖的讲解与气泡读），成组给加成并写日志
L.codexCheck = function (st, out) {
  seed(st);
  const c = CX(st), cnt = st.cxCnt && typeof st.cxCnt === 'object' ? st.cxCnt : null, now = {};
  for (const cat of L.CODEX) now[cat.id] = avail(st, cat) ? Math.min(cat.total(st), cat.got(st)) : 0;
  if (cnt) {
    for (const id in now) if (now[id] > (cnt[id] || 0)) {
      st.cxNews = st.cxNews || [];
      st.cxNews.push({ cat: id, n: now[id] - (cnt[id] || 0), at: st.tick });
      if (st.cxNews.length > 8) st.cxNews.shift();
      if (out) out.codex = (out.codex || []).concat([id]);
      emit('codex', { cat: id, n: now[id] });
    }
  }
  st.cxCnt = now;
  st.cxPct = L.codexPct(st);
  for (const cat of L.CODEX) {
    if (c.grp[cat.id] || !avail(st, cat)) continue;
    const t = cat.total(st);
    if (t > 0 && now[cat.id] >= t) {
      c.grp[cat.id] = (st.rebirth || 0) + 1;   // 记下是第几世集齐的（轮回时这一世成组的给道果）
      L.log(st, `【图鉴】「${cat.n}」集齐了：${L.CX_GRP[cat.id] ? L.CX_GRP[cat.id].d + '（永久）' : ''}，轮回时道果 +${L.CX_V.grp}`, 'gold');
      if (out) out.codexGrp = (out.codexGrp || []).concat([cat.id]);
      emit('codexGrp', cat.id);
    }
  }
};
{ const tk0 = L.tick; L.tick = function (st, cont) { const out = tk0(st, cont); L.codexCheck(st, out); return out; }; }

// ---------- 存档 ----------
L.migrateCodex = function (s) {
  CX(s); seed(s);
  if (typeof s.cx0 !== 'number' || !isFinite(s.cx0)) s.cx0 = s.rebirth ? L.codexCells(s) : 0;
  if (typeof s.cxBirth !== 'number' || !isFinite(s.cxBirth)) s.cxBirth = s.rebirth ? L.codexPct(s) : 0;
  if (!s.cxCnt || typeof s.cxCnt !== 'object') { s.cxCnt = null; L.codexCheck(s); }
  if (!Array.isArray(s.cxNews)) s.cxNews = [];
};
{ const ns0 = L.newState; L.newState = function (o) { const st = ns0(o); CX(st); seed(st); st.cx0 = L.codexCells(st); st.cxBirth = L.codexPct(st); st.cxCnt = null; st.cxNews = []; L.codexCheck(st); return st; }; }
});
