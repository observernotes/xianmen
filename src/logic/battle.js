/* 废柴仙途 · 逻辑模块 battle：历练里的半自动回合战（docs/COMBAT_LOOT.md §2、§3、§4、§8）
 * 模块写法见 src/logic.js 顶部说明。排在 arts、gear、pets 之后，expedition 之前。界面（src/ui/battle.js）和 tools/sim.js 用同一个引擎。
 *
 *   B = L.battleNew(st, foes, seed, opt)      一场战斗的状态（opt：{ hp 0～1, rage, pills, T 战力（缺省 L.btPower）, pact, first, budong }）
 *   ev = L.battleStep(B, { ult, pill, flee })  推进一轮，返回这一轮的事件数组 { t, who, id, n, dmg, el, … }
 *   res = L.battleAuto(B, policy)              跑到结束：'auto' 怒气满就放；'smart' 留绝招破招、血少吞丹
 *   res = L.battleResult(B)                    { win, dead, fled, hp, rage, rounds, brk, ke, beike, pill, kills, elite, boss, mats, used }
 *   我方：L.btMe(st) → { atk, hpMax, el 护体, skills[战技, 器技, 秘术], ult, pas }；招式 L.artSkill(st, id)、L.gearSkill(x)。
 *   敌人：L.FOES[id]，L.CELL_FOES[k][d]（§7.2 的第一章表 + 第二章以后各图三行，docs/CONTENT.md §17），L.btFoe(id, Q, opt) 造一只。
 *   随机数：引擎自带一个线性同余发生器（seed 播种），不碰 L.rng——同一个种子、同样的按键，结果逐轮一致；sim 的随机序列也不受影响。
 *   常数全在 L.BAT / L.EL_B，一处调。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';

// ---------- 常数（§8.2） ----------
L.BAT = {
  hpK: 10, vari: 0.4, crit: 0.15, critM: 1.8, fcrit: 0.1, fcritM: 1.5, mom: 0.3, ult: 3, rage: [20, 10], heavy: 2.2, heavyEvery: 4,
  shieldCut: 0.6, brk: 1.3, brkLen: 2, between: 0.12, pill: 0.25, pillAt: 0.35, maxRounds: 40,
  mob: { q: 0.6, hp: 0.5, at: 1.0, two: 0.6 }, elite: { q: 1.0, hp: 1.0, at: 1.0, sh: 3 }, boss: { q: 1.6, hp: 2.0, at: 1.1, sh: 5 }, duel: { q: 1.0, hp: 1.5, at: 1.5, sh: 0 },
  // 分数折战力：旧评价分里与五行无关的几项（相性、禁地胆魄、法衣、锋锐、同伴、灵宠……）每 25 分折战力 ×2（旧公式“分数 = 70 + 25·log2(战力比)”的反函数）
  ptsPer2: 25,
};
L.EL_B = { ke: 1.3, beike: 0.8, foeKe: 1.2, foeBeike: 0.9, chain: 1.3, brk: 1.3, keAff: 0.2 };

// ---------- 招式（§3.2） ----------
// 战技：m 倍数（多段写每段）、hits 段数、cd 冷却、fx 演出、eff 附带效果（引擎只认 8 种状态：armor 破甲 / root 缠住 / burn 灼烧 / daze 震住 / stun 晕 / shield 盾 / leech 吸血 / stack 叠层，外加几个一次性的）
// line：界面原文（≤ 14 字）
L.ART_B = {
  z_liejin: { m: 1.6, cd: 3, fx: 'slash', eff: { k: 'armor', v: 0.15, n: 2 }, line: '×1.6；破甲：它受伤 +15%' },
  z_qingteng: { m: 1.4, cd: 3, fx: 'vine', eff: { k: 'root', n: 1 }, line: '×1.4；缠住：它蓄力晚 1 轮' },
  z_liuyun: { m: 0.8, hits: 2, cd: 3, fx: 'wave', eachCut: true, line: '×0.8 两段，每段都能削罩' },
  z_liaoyuan: { m: 1.2, cd: 3, fx: 'flame', eff: { k: 'burn', v: 0.3, n: 3 }, line: '×1.2；灼烧 3 轮' },
  z_wuxing: { m: 1.5, cd: 3, fx: 'quake', eff: { k: 'daze', v: 0.3, n: 1 }, line: '×1.5；震住：它下一下 −30%' },
  z_huichun: { m: 1.8, cd: 3, fx: 'vine', eff: { k: 'leech', v: 0.3 }, line: '×1.8；伤害三成回血' },
  z_liehuo: { m: 2.2, cd: 4, fx: 'flame', eff: { k: 'burnCrit' }, line: '×2.2；打灼烧的必暴击' },
  z_gengjin: { m: 2.3, cd: 4, fx: 'slash', eff: { k: 'pierce' }, line: '×2.3；无视护罩减伤' },
  z_hanyue: { m: 1.9, cd: 5, fx: 'quake', eff: { k: 'stun', n: 1 }, line: '×1.9；晕 1 轮' },
  z_wanjian: { m: 0.6, hits: 6, cd: 4, fx: 'slash', line: '×0.6 六段' },
  z_fentian: { m: 2.4, cd: 4, fx: 'flame', eff: { k: 'bossBurn', v: 1.5 }, line: '×2.4；打首领 ×1.5' },
  z_qingdi: { m: 2.8, cd: 4, fx: 'vine', eff: { k: 'heal', v: 0.15 }, line: '×2.8；回 15% 气血' },
  z_canghai: { m: 2.0, cd: 3, fx: 'wave', eff: { k: 'stack', v: 0.2, n: 5 }, line: '×2.0，每放一次 +20%' },
  z_tianjian: { m: 0.5, hits: 9, cd: 5, fx: 'slash', eff: { k: 'ramp', v: 0.08 }, line: '×0.5 九段，段段递增' },
  z_xuanxiao_jian: { m: 4, cd: 5, fx: 'ult', eff: { k: 'exec', v: 0.2 }, line: '×4；残血两成直接斩杀' },
  // 心法被动（§3.2）
  x_yinqi: { pas: { k: 'rage', v: 5 }, line: '每轮怒气 +5' },
  x_changchun: { pas: { k: 'regen', v: 0.02 }, line: '每轮回 2% 气血' },
  x_qingmu: { pas: { k: 'between', v: 0.22 }, line: '场间回血 12% → 22%' },
  x_lieyang: { pas: { k: 'fire', v: 0.15 }, line: '火系招 +15%' },
  x_houtu: { pas: { k: 'heavyCut', v: 0.25 }, line: '挨重击 −25%' },
  x_taixu: { pas: { k: 'rage0', v: 30 }, line: '开场怒气 30' },
  x_jiuzhuan: { pas: { k: 'ramp3', v: 0.1, n: 3 }, line: '每 3 轮伤害 +10%' },
  x_zifu: { pas: { k: 'ult', v: 3.5 }, line: '绝招 ×3 → ×3.5' },
  x_hunyuan: { pas: { k: 'noBeike' }, line: '你的招不会被克' },
  x_taiyi: { pas: { k: 'regen', v: 0.015 }, line: '每轮回 1.5% 气血' },
  x_hongmeng: { pas: { k: 'rage', v: 6 }, line: '每轮怒气 +6' },
  x_xuanxiao_xin: { pas: { k: 'zhan', v: 0.15 }, line: '战技 +15%' },
  // 秘术（金丹起，战术招，§3.2）
  m_lianxi: { mi: 'first', line: '开场先手，第一下必暴击' },
  m_yufeng: { mi: 'dodge', line: '躲掉每场第一下重击' },
  m_xuedun: { mi: 'escape', line: '气血归零时逃走一次' },
  m_tianyan: { mi: 'eye', line: '开场它的罩少 1 格' },
  m_fenshen: { mi: 'clone', v: 0.5, line: '每 3 轮分身补一下 ×0.5' },
  m_xunlong: { mi: 'card', line: '归来多翻一张牌' },
  m_yushou: { mi: 'pet', line: '灵宠每 2 轮助战一下' },
  m_zhujian: { mi: 'wcd', line: '器技冷却 −1' },
  m_baicao: { mi: 'herb', line: '采药节点灵草 +50%' },
  m_danhuo: { mi: 'pill', line: '疗伤丹回 25% → 35%' },
  m_wangqing: { mi: 'calm', line: '不受震慑：重击 −15%' },
  m_xingdou: { mi: 'star', line: '每 4 轮怒气 +25' },
};
// 战技的大成“+”：附带效果 ×1.5（§3.3）；圆满：绝招换成这门战技的奥义（同属性 ×3.5）
L.ULT_BASE = { id: 'ult', n: '戒中剑意', el: '', m: 3, fx: 'ult', kind: 'ult' };
const MASTER_PLUS = 2, MASTER_AOYI = 3;
L.artSkill = function (st, id) {
  const A = L.art(id), b = L.ART_B[id];
  if (!A || !b) return null;
  const lv = L.artLv(st, id), mm = L.MAST.mult[lv];
  if (b.pas || b.mi) return { id, n: A.n, el: A.el, kind: b.pas ? 'pas' : 'mi', pas: b.pas, mi: b.mi, v: b.v, line: b.line, lv };
  const eff = b.eff ? Object.assign({}, b.eff) : null;
  if (eff && lv >= MASTER_PLUS) { if (eff.v) eff.v *= 1.5; if (eff.n) eff.n = Math.round(eff.n * 1.5); }
  return { id, n: A.n, el: A.el, kind: 'z', m: b.m * mm, hits: b.hits || 1, cd: b.cd, fx: b.fx, eff, eachCut: !!b.eachCut, line: b.line, lv, plus: lv >= MASTER_PLUS, t: A.t };
};
// 器技（按兵器名字末字归类；首领专属与打造品读独有器技）
const W_CLASS = [
  ['剑', { k: 'pi', n: '劈斩', m: 1.3, cd: 4, fx: 'slash', line: '×1.3' }],
  ['棍锤斧', { k: 'sao', n: '横扫', m: 1.1, cd: 4, fx: 'quake', cut: 2, line: '×1.1；克制时削罩 2 格' }],
  ['刀', { k: 'lian', n: '连斩', m: 0.7, hits: 2, cd: 4, fx: 'slash', line: '×0.7 两段' }],
  ['笛扇袖伞', { k: 'yin', n: '音刃', m: 1.0, cd: 4, fx: 'wave', all: true, line: '×1.0，打全体' }],
  ['枪戟', { k: 'chuan', n: '贯穿', m: 1.4, cd: 4, fx: 'slash', halfShield: true, line: '×1.4；罩的减伤减半' }],
  ['鼎塔钵', { k: 'zhen', n: '镇', m: 0.8, cd: 4, fx: 'quake', guard: 1, line: '×0.8；给自己一层盾' }],
  ['镜', { k: 'zhao', n: '照', m: 0.8, cd: 4, fx: 'wave', reflect: 0.3, line: '×0.8；下一下反弹三成' }],
  ['索图斗珠', { k: 'kun', n: '困', m: 0.6, cd: 6, fx: 'vine', skip: 1, line: '×0.6；它跳过一轮' }],
];
const W_UNIQUE = {
  b0: { k: 'langshi', n: '狼噬', m: 1.3, cd: 4, fx: 'slash', low: [0.35, 2], line: '×1.3；残血三成半 ×2' },
  b1: { k: 'kaishan', n: '开山', m: 1.1, cd: 4, fx: 'quake', cutAny: 3, line: '削罩 3 格，不看克制' },
  b3: { k: 'qingtian', n: '擎天', m: 1.5, cd: 4, fx: 'quake', firstCrit: true, line: '×1.5；每场第一下必暴击' },
  b4: { k: 'shihun', n: '噬魂', m: 1.2, cd: 4, fx: 'slash', killHeal: 0.2, line: '×1.2；击杀回 20% 气血' },
  b5: { k: 'yijian', n: '一剑', m: 3, cd: 6, fx: 'ult', line: '冷却 6；×3' },
  g_xuanxiao: { k: 'guiqiao', n: '归鞘', m: 1.3, cd: 4, fx: 'slash', ultBack: 0.5, line: '绝招放完，怒气还一半' },
};
L.gearSkill = function (x) {
  if (!x) return null;
  const B = L.gearBase(x.id); if (!B || B.slot !== 'w') return null;
  let s = W_UNIQUE[x.id] || (B.skill && W_UNIQUE[B.skill]);
  if (!s) { const ch = B.n.slice(-1); const c = W_CLASS.find(w => w[0].includes(ch)); s = (c || W_CLASS[0])[1]; }
  const plusM = 1 + 0.03 * (x.plus || 0);
  return Object.assign({}, s, { id: 'w_' + s.k, kind: 'w', el: x.el || B.el || '', m: s.m * plusM, hits: s.hits || 1, wn: B.n });
};

// ---------- 怪物（§7.2；第二章以后见 docs/CONTENT.md §17） ----------
// art：界面画法（'wolf' | 'man' | 'orb' | 'snake' | 'mob:teng' 等 | 'boss:k'），tint 换色，aura 精英光环
L.FOES = {};
const F = (id, n, el, kind, art, o) => { L.FOES[id] = Object.assign({ id, n, el, kind, art }, o || {}); };
// 第一章 · 后山野林
F('yelang', '野狼', 'mu', 'mob', 'wolf');
F('qingteng', '青藤妖', 'mu', 'mob', 'mob:teng');
F('tengwang', '老藤王', 'mu', 'elite', 'mob:teng', { aura: 1, trait: 'regen' });
F('hantan', '寒潭蛙', 'shui', 'mob', 'mob:wa');
F('tiexiong', '铁背熊', 'tu', 'elite', 'mob:xiong', { aura: 1, trait: 'hard' });
F('huoya', '火鸦', 'huo', 'mob', 'mob:ya');
F('chitong', '赤瞳头狼', 'huo', 'elite', 'wolf', { tint: '#c03028', aura: 1, trait: 'berserk' });
F('langwang', '独眼狼王', 'mu', 'boss', 'boss:0', { trait: 'double', summon: 'yelang' });
// 黑风岭 · 外围（章末可达）
F('feikou', '匪寇', 'jin', 'mob', 'man');
F('tangl', '铁螳螂', 'jin', 'mob', 'mob:tang');
F('daoba', '刀疤头目', 'jin', 'elite', 'man', { tint: '#6a6a78', aura: 1 });
// 精英特性（§4.3）：≤ 6 字
L.TRAITS = { regen: { n: '再生', d: '每轮回 3%' }, hard: { n: '硬壳', d: '罩多 1 格' }, berserk: { n: '狂暴', d: '血少攻 +30%' }, double: { n: '双蓄', d: '连蓄两轮' }, fearfire: { n: '惧火', d: '被克再 +20%' } };
// 地点 × 深度：小怪、精英、本地招牌（C2 的掉落表读 sig）、灵核
L.CELL_FOES = { 0: [
  { mobs: ['yelang', 'qingteng'], elite: 'tengwang', sig: { kind: 'art', id: 'z_qingteng' }, core: 'mu' },
  { mobs: ['qingteng', 'hantan'], elite: 'tiexiong', sig: { kind: 'art', id: 'z_wuxing' }, mobSig: { hantan: { kind: 'art', id: 'z_liuyun' } }, core: 'tu' },
  { mobs: ['huoya'], elite: 'chitong', sig: { kind: 'art', id: 'z_liaoyuan' }, core: 'huo' },
], 1: [
  { mobs: ['feikou', 'tangl'], elite: 'daoba', sig: { kind: 'gear', base: 'w1_2', el: 'jin', star: 1 }, core: 'jin' },
] };
L.BOSS_FOE = { 0: 'langwang' };
// 没写进表的格（第二章以后的表在本文件末尾 L.addCellFoes 补；再没有的按地图五行生成一组）
const KIND_ART = { beast: 'wolf', man: 'man', orb: 'orb', snake: 'snake' };
L.cellFoes = function (k, d) {
  const row = L.CELL_FOES[k] && L.CELL_FOES[k][d];
  if (row) return row;
  const R0 = L.REGIONS[k] || L.REGIONS[0], el = R0.el || '';
  const id = `g${k}_${d}`;
  if (!L.FOES[id + 'm']) { F(id + 'm', R0.n.slice(0, 2) + '小妖', el, 'mob', KIND_ART[R0.foe] || 'man', { tint: R0.fc && R0.fc[0] }); F(id + 'e', R0.n.slice(0, 2) + '守将', el, 'elite', KIND_ART[R0.foe] || 'man', { tint: R0.fc && R0.fc[1], aura: 1 }); }
  return { mobs: [id + 'm'], elite: id + 'e', core: el || 'jin', gen: true };
};
L.bossFoeId = function (k) {
  if (L.BOSS_FOE[k]) return L.BOSS_FOE[k];
  const id = 'boss' + k;
  if (!L.FOES[id]) F(id, L.BOSSES[k].n, L.BOSS_EL[k] || '', 'boss', 'boss:' + k, { trait: k >= 6 ? 'double' : '' });
  return id;
};
// 造一只敌人：Q 是它那一格的推荐战力 × 节点系数（§8.1）
L.btFoe = function (id, Q, o) {
  o = o || {};
  const D = L.FOES[id] || { id, n: id, el: '', kind: 'mob' }, K = L.BAT[o.kindAs || D.kind] || L.BAT.mob;
  const q = Q * K.q, hp = L.BAT.hpK * Math.sqrt(q) * K.hp * (o.hpM || 1);
  const sh = (K.sh || 0) + (D.trait === 'hard' ? 1 : 0) + (o.sh || 0);
  return { id, n: o.n || D.n, el: o.el !== undefined ? o.el : D.el, kind: o.kindAs || D.kind, art: D.art, tint: D.tint, aura: D.aura, trait: o.trait !== undefined ? o.trait : D.trait || '', summon: D.summon,
    atk0: Math.sqrt(q) * K.at * (o.atM || 1), hp, max: hp, sh, shMax: sh, cc: 0, charge: 0, stun: 0, weak: 0, st: [], Q: q, sumDone: false };
};

// ---------- 我方 ----------
// 历练用的战力：L.power × 旧评价分里与五行无关的几项（每 25 分 ×2）；k 为空时只用 L.power
L.btPower = function (st, k, d, a) {
  const T = L.power(st);
  if (k === undefined || !L.expParts) return T;
  const pt = L.expParts(st, k, d, a);
  let pts = pt.aff + (d === 2 ? 3 : 0);
  for (const x of pt.extra) if (x[2] !== 'elem' && !/^词条·克/.test(x[0])) pts += x[1];
  return T * Math.pow(2, pts / L.BAT.ptsPer2);
};
const affN = (st, id) => (L.gearAffN ? L.gearAffN(st, id) : 0);
const goldOf = st => { const g = {}; if (st.gear) for (const s of L.GEAR_SLOTS || []) { const x = st.gear[s]; if (x && x.gold) g[x.gold] = 1; } return g; };
L.defEl = function (st) { const r = st.gear && st.gear.r; if (r && r.el) return r.el; const x = L.artSlots(st)[0]; return x ? L.art(x).el || '' : ''; };
L.btMe = function (st, T) {
  T = T || L.power(st);
  const sl = L.artSlots(st), skills = [];
  const z = sl[1] && L.artSkill(st, sl[1]); if (z) skills.push(z);
  const w = st.gear && L.gearSkill(st.gear.w); if (w) skills.push(w);
  const m = sl[2] && L.artSkill(st, sl[2]); if (m) skills.push(m);
  const pas = sl[0] && L.artSkill(st, sl[0]);
  // 绝招：圆满的战技换成奥义（§3.2）
  let ult = Object.assign({}, L.ULT_BASE);
  if (z && z.lv >= MASTER_AOYI) ult = { id: 'aoyi_' + z.id, n: z.n + '·奥义', el: z.el, m: 3.5, fx: z.fx, kind: 'ult', eff: z.eff, aoyi: true };
  const hpM = 1 + 0.12 * affN(st, 'jianren') + (L.btHpMods ? L.btHpMods(st) : 0);
  const aff = {}; for (const id of ['huixin', 'lianji', 'xixue', 'pozhao', 'xiansheng', 'xushi', 'fengsheng', 'yinbao', 'fanzhen', 'tiebi', 'huiqi', 'jixing', 'yangshang', 'cangfeng']) { const n = affN(st, id); if (n) aff[id] = n; }
  const ke = {}; for (const e of L.ELEM_KEYS) { const n = affN(st, 'ke_' + e); if (n) ke[e] = n; }
  return { T, atk: Math.sqrt(T), hpMax: L.BAT.hpK * Math.sqrt(T) * hpM, el: L.defEl(st), skills, ult, pas, aff, ke, gold: goldOf(st) };
};

// ---------- 引擎 ----------
function rngOf(seed) { let s = (Math.floor(seed * 2654435761) ^ 0x9e3779b9) >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
L.btRng = rngOf;
const pasK = (me, k) => (me.pas && me.pas.pas && me.pas.pas.k === k ? me.pas.pas.v || true : 0);
const miK = (me, k) => me.skills.some(s => s.kind === 'mi' && s.mi === k);
L.battleNew = function (st, foes, seed, opt) {
  opt = opt || {};
  const rng = rngOf(seed || 1), C = L.BAT;
  const me = opt.me || L.btMe(st, opt.T);
  const mom = 1 + C.mom * (2 * rng() - 1);
  const B = { rng, me, foes, round: 0, done: false, win: false, dead: false, fled: false, brk: 0, ke: 0, beike: 0, pill: 0, kills: [], used: {}, mats: {}, log: [], opt,
    atk: me.atk * mom, mom, hp: me.hpMax * (opt.hp === undefined ? 1 : opt.hp), max: me.hpMax, rage: opt.rage || 0, cds: {}, stack: 0, ramp: 0, guard: 0, reflect: 0, firstHit: true, dodged: false, escaped: !!opt.escaped, budong: !!opt.budong, crit: 0, lastEl: '', pills: opt.pills || 0, pillUsed: false };
  // 心法：开场怒气（太虚引气诀）、词条先声
  B.rage = Math.min(100, B.rage + (pasK(me, 'rage0') || 0) + 30 * (me.aff.xiansheng || 0));
  if (opt.ult0) B.rage = 100;
  for (const s of me.skills) if (s.kind !== 'mi') B.cds[s.id] = s.kind === 'w' ? 1 : 0;
  if (miK(me, 'wcd')) for (const s of me.skills) if (s.kind === 'w') s.cd = Math.max(2, s.cd - 1);
  for (const f of foes) { f.atk = f.atk0 * (1 + C.mom * (2 * rng() - 1)); if (miK(me, 'eye') && f.sh > 0) { f.sh--; f.shMax = Math.max(f.sh, f.shMax - 1); } }
  B.momText = mom >= 1.15 ? '气势如虹' : mom <= 0.85 ? '被压了一头' : '气势平平';
  return B;
};
const alive = B => B.foes.filter(f => f.hp > 0);
const elM = (me, el, fe) => (!el || !fe ? 1 : L.elKe(el, fe) ? L.EL_B.ke : L.elKe(fe, el) ? (pasK(me, 'noBeike') || me.aff.cangfeng ? 1 : L.EL_B.beike) : 1);
const hasSt = (f, k) => f.st.find(x => x.k === k);
function addSt(f, k, v, n) { const x = hasSt(f, k); if (x) { x.n = Math.max(x.n, n); x.v = Math.max(x.v || 0, v || 0); } else f.st.push({ k, v, n }); }
// 我方打出一下：返回伤害，处理罩、暴击、状态
function hitFoe(B, f, mv, m, ev, cutN) {
  const C = L.BAT, me = B.me, R = B.rng, el = mv.el || '';
  let d = B.atk * m;
  const em = mv.kind === 'n' ? 1 : elM(me, el, f.el);
  const ke = em > 1, beike = em < 1;
  d *= em;
  if (ke && f.trait === 'fearfire' && el === 'huo') d *= 1.2;
  if (el && f.el && me.ke[f.el]) d *= 1 + L.EL_B.keAff * me.ke[f.el];
  if (el === 'huo') d *= 1 + (pasK(me, 'fire') || 0);
  if (mv.kind === 'z') d *= 1 + (pasK(me, 'zhan') || 0);
  d *= 1 - C.vari / 2 + C.vari * R();
  let crit = R() < C.crit + 0.10 * (me.aff.huixin || 0);
  if (mv.eff && mv.eff.k === 'burnCrit' && hasSt(f, 'burn')) crit = true;
  if (B.firstHit && (mv.firstCrit || miK(me, 'first'))) crit = true;
  if (B.jieshi) { crit = true; d *= 1.5; B.jieshi = false; }
  if (crit) d *= C.critM;
  const ar = hasSt(f, 'armor'); if (ar) d *= 1 + ar.v;
  if (f.weak > 0) d *= C.brk;
  if (me.aff.yinbao && f.st.length) d *= 1 + 0.2 * me.aff.yinbao;
  if (me.aff.fengsheng && B.hp < B.max * 0.3) d *= 1 + 0.3 * me.aff.fengsheng;
  if (mv.low && f.hp < f.max * mv.low[0]) d *= mv.low[1];
  if (mv.eff && mv.eff.k === 'bossBurn' && f.kind === 'boss') d *= mv.eff.v;
  if (pasK(me, 'ramp3')) d *= 1 + me.pas.pas.v * Math.min(3, Math.floor(B.round / 3));
  // 相生连携（P1-3）：上一招的五行生这一招
  let chain = false;
  if (mv.kind !== 'n' && el && B.lastEl && L.elSheng(B.lastEl, el) && mv.kind !== 'ult') { chain = true; d *= L.EL_B.chain; }
  // 罩：在则 ×0.6（庚金指无视、枪减半、绝招无视减伤）；只有克制的招能削
  if (f.sh > 0) {
    const pierce = (mv.eff && mv.eff.k === 'pierce') || mv.kind === 'ult';
    if (!pierce) d *= mv.halfShield ? 1 - (1 - C.shieldCut) / 2 : C.shieldCut;
    let cut = 0;
    if (mv.cutAny) cut = mv.cutAny;
    else if (mv.kind === 'ult') cut = ke ? 2 : 1;
    else if (mv.kind !== 'n' && (ke || (B.me.gold.huajin && beike))) cut = cutN || (mv.cut && ke ? mv.cut : 1);
    if (cut && me.aff.pozhao && !B.pozhaoUsed) { cut++; B.pozhaoUsed = true; }
    if (cut) {
      f.sh = Math.max(0, f.sh - cut); ev.push({ t: 'shield', who: B.foes.indexOf(f), sh: f.sh, cut });
      if (f.sh <= 0) { f.stun = Math.max(f.stun, 1); f.weak = C.brkLen + 1; f.charge = 0; ev.push({ t: 'break', who: B.foes.indexOf(f), n: '罩碎' }); }
    }
  }
  d = Math.max(1, d);
  f.hp -= d;
  B.firstHit = false;
  if (ke) { B.ke++; ev.push({ t: 'ke', who: B.foes.indexOf(f), el }); }
  if (beike) { B.beike++; ev.push({ t: 'beike', who: B.foes.indexOf(f), el }); }
  if (chain) { B.rage = Math.min(100, B.rage + 10); ev.push({ t: 'chain', el }); }
  // 印记引爆（P1-3，金丹）：用克制它的属性打带印记的目标，追加最大气血的 10%（精英 6%、首领 4%）
  if (ke && B.me.mark && f.mark && L.elKe(el, f.mark)) { const x = f.max * (f.kind === 'boss' ? 0.04 : f.kind === 'elite' ? 0.06 : 0.10); f.hp -= x; d += x; f.mark = ''; ev.push({ t: 'burst', who: B.foes.indexOf(f), dmg: Math.round(x) }); }
  if (B.me.mark && el && mv.kind !== 'n') f.mark = el;
  if (me.aff.xixue) { const h = d * 0.06 * me.aff.xixue; B.hp = Math.min(B.max, B.hp + h); }
  return { d, crit, ke, beike, chain };
}
function applyEff(B, f, mv, r, ev) {
  const e = mv.eff; if (!e) return;
  const i = B.foes.indexOf(f);
  switch (e.k) {
    case 'armor': addSt(f, 'armor', e.v, e.n + 1); break;
    case 'root': f.cc -= e.n; ev.push({ t: 'root', who: i }); break;
    case 'burn': addSt(f, 'burn', e.v, e.n); break;
    case 'daze': addSt(f, 'daze', e.v, e.n + 1); break;
    case 'stun': f.stun = Math.max(f.stun, e.n); f.charge = 0; ev.push({ t: 'stun', who: i }); break;
    case 'leech': { const h = r.d * e.v; B.hp = Math.min(B.max, B.hp + h); ev.push({ t: 'heal', who: 'me', dmg: Math.round(h) }); break; }
    case 'heal': { const h = B.max * e.v; B.hp = Math.min(B.max, B.hp + h); ev.push({ t: 'heal', who: 'me', dmg: Math.round(h) }); break; }
    case 'exec': if (f.hp > 0 && f.hp < f.max * e.v && f.kind !== 'boss') { f.hp = 0; ev.push({ t: 'exec', who: i }); } break;
    case 'bossBurn': for (const g of alive(B)) addSt(g, 'burn', 0.3, 2); break;
  }
}
// 选招：战技（冷却好了）＞ 器技（冷却好了）＞ 普攻；绝招由输入决定
function pickMove(B) {
  for (const s of B.me.skills) if (s.kind === 'z' && B.cds[s.id] <= 0) return s;
  for (const s of B.me.skills) if (s.kind === 'w' && B.cds[s.id] <= 0) return s;
  return null;
}
function doMove(B, mv, ev) {
  const C = L.BAT, list = alive(B);
  if (!list.length) return;
  // 目标：绝招优先打在蓄力的那只上（破招），其余打第一只活着的
  let f = list[0];
  if (mv.kind === 'ult') { const c = list.find(x => x.charge); if (c) f = c; }
  const isUlt = mv.kind === 'ult';
  let m = mv.m;
  if (isUlt) m = mv.aoyi ? mv.m : (pasK(B.me, 'ult') || mv.m) * (B.opt.pact ? 4 / 3 : 1) + 0.6 * (B.me.aff.xushi || 0);
  if (mv.eff && mv.eff.k === 'stack') { m *= 1 + mv.eff.v * B.stack; B.stack = Math.min(mv.eff.n, B.stack + 1); }
  const hits = (mv.hits || 1) + (mv.kind === 'w' && B.me.gold.fenguang ? 1 : 0);
  const targets = mv.all ? list : [f];
  let tot = 0, anyCrit = false, anyKe = false;
  for (const g of targets) for (let h = 0; h < hits; h++) {
    if (g.hp <= 0) break;
    const mh = mv.eff && mv.eff.k === 'ramp' ? m * (1 + mv.eff.v * h) : m;
    const r = hitFoe(B, g, mv, mh, ev, mv.eachCut || h === 0 ? 0 : -1);
    tot += r.d; anyCrit = anyCrit || r.crit; anyKe = anyKe || r.ke;
    if (h === 0 || mv.eff && mv.eff.k === 'leech') applyEff(B, g, mv, r, ev);
  }
  if (mv.kind !== 'n') B.used[mv.id] = (B.used[mv.id] || 0) + 1;
  if (mv.el) B.lastEl = mv.el; else if (mv.kind !== 'n') B.lastEl = '';
  ev.push({ t: isUlt ? 'ult' : mv.kind === 'n' ? 'hit' : 'skill', who: 'me', id: mv.id, n: mv.n, dmg: Math.round(tot), el: mv.el || '', crit: anyCrit, ke: anyKe, fx: mv.fx, tgt: B.foes.indexOf(f) });
  // 破招：蓄力那一轮放绝招
  if (isUlt && f.charge && f.hp > -Infinity) { f.charge = 0; f.cc = 0; B.brk++; ev.push({ t: 'brk', who: B.foes.indexOf(f), n: '破招' }); if (B.me.gold.jieshi) B.jieshi = true; }
  if (mv.guard) B.guard = mv.guard;
  if (mv.reflect) B.reflect = mv.reflect;
  if (mv.skip) { f.stun = Math.max(f.stun, mv.skip); f.charge = 0; }
  for (const g of targets) if (g.hp <= 0 && !g.deadEv) { g.deadEv = 1; B.kills.push(g.id); ev.push({ t: 'dead', who: B.foes.indexOf(g), id: g.id }); if (mv.killHeal) B.hp = Math.min(B.max, B.hp + B.max * mv.killHeal); if (B.me.gold.shisha) B.rage = Math.min(100, B.rage + 50); }
  // 普攻连击（词条）
  if (mv.kind === 'n' && B.me.aff.lianji && B.rng() < 0.2 * B.me.aff.lianji && f.hp > 0) { const r = hitFoe(B, f, mv, 1, ev); ev.push({ t: 'hit', who: 'me', id: 'lianji', n: '连击', dmg: Math.round(r.d) }); if (f.hp <= 0 && !f.deadEv) { f.deadEv = 1; B.kills.push(f.id); ev.push({ t: 'dead', who: B.foes.indexOf(f), id: f.id }); } }
}
const NORMAL = { id: 'n', n: '普攻', kind: 'n', m: 1, el: '' };
L.battleStep = function (B, inp) {
  if (B.done) return [];
  inp = inp || {};
  const C = L.BAT, me = B.me, R = B.rng, ev = [];
  B.round++;
  // 撤
  if (inp.flee) { B.done = true; B.fled = true; ev.push({ t: 'flee', who: 'me' }); return ev; }
  // 丹：每场一枚，回 25%
  if (inp.pill && B.pills > 0 && !B.pillUsed && B.hp > 0) { B.pillUsed = true; B.pills--; B.pill++; const h = B.max * (miK(me, 'pill') ? 0.35 : C.pill); B.hp = Math.min(B.max, B.hp + h); ev.push({ t: 'pill', who: 'me', dmg: Math.round(h) }); }
  // 我出手
  const ult = inp.ult && B.rage >= 100;
  const acts = B.round === 1 && me.aff.jixing ? 2 : 1;
  for (let a = 0; a < acts && alive(B).length; a++) {
    let mv;
    if (ult && a === 0) { mv = me.ult; B.rage = 0; }
    else { mv = pickMove(B) || NORMAL; if (mv !== NORMAL) B.cds[mv.id] = mv.cd; }
    doMove(B, mv, ev);
    if (ult && a === 0) {
      if (B.me.gold.huixiang && R() < 0.3) B.rage = 50;
      for (const s of me.skills) if (s.ultBack) B.rage = Math.max(B.rage, 50);
    }
    B.rage = Math.min(100, B.rage + C.rage[0]);
  }
  for (const id in B.cds) B.cds[id]--;
  // 分身术：每 3 轮补一下 ×0.5
  if (miK(me, 'clone') && B.round % 3 === 0 && alive(B).length) doMove(B, { id: 'm_fenshen', n: '分身', kind: 'n', m: 0.5, el: '' }, ev);
  // 灼烧
  for (const f of alive(B)) { const b = hasSt(f, 'burn'); if (b) { const d = B.atk * b.v; f.hp -= d; ev.push({ t: 'dot', who: B.foes.indexOf(f), dmg: Math.round(d) }); if (f.hp <= 0 && !f.deadEv) { f.deadEv = 1; B.kills.push(f.id); ev.push({ t: 'dead', who: B.foes.indexOf(f), id: f.id }); } } }
  // 召唤（狼王血少于一半，召两只野狼）
  for (const f of alive(B)) if (f.summon && !f.sumDone && f.hp < f.max * 0.5) { f.sumDone = true; for (let j = 0; j < 2; j++) { const w = L.btFoe(f.summon, f.Q / L.BAT.boss.q * 0.6 / L.BAT.mob.q, { hpM: 0.4 }); w.atk = w.atk0; B.foes.push(w); } ev.push({ t: 'summon', who: B.foes.indexOf(f), n: '召来两只野狼' }); }
  if (!alive(B).length) { B.done = true; B.win = true; ev.push({ t: 'win' }); tickSt(B); return ev; }
  // 它们出手
  for (const f of alive(B)) {
    const i = B.foes.indexOf(f);
    if (f.trait === 'regen') f.hp = Math.min(f.max, f.hp + f.max * 0.03);
    if (f.stun > 0) { f.stun--; ev.push({ t: 'stunned', who: i }); continue; }
    if (f.kind !== 'mob' && !f.charge) {
      f.cc++;
      if (f.cc >= C.heavyEvery) { f.cc = 0; f.charge = f.trait === 'double' ? 2 : 1; ev.push({ t: 'charge', who: i, n: '蓄力！' }); continue; }
    } else if (f.charge > 1) { f.charge--; ev.push({ t: 'charge', who: i, n: '再蓄！' }); continue; }
    let heavy = false, d = f.atk;
    if (f.charge) { heavy = true; d *= f.trait === 'double' ? 3 : C.heavy; f.charge = 0; }
    if (f.trait === 'berserk' && f.hp < f.max * 0.3) d *= 1.3;
    const fe = f.el, de = me.el;
    d *= !fe || !de ? 1 : L.elKe(fe, de) ? L.EL_B.foeKe : L.elKe(de, fe) ? L.EL_B.foeBeike : 1;
    d *= 1 - C.vari / 2 + C.vari * R();
    if (R() < C.fcrit) d *= C.fcritM;
    const dz = hasSt(f, 'daze'); if (dz) { d *= 1 - dz.v; f.st = f.st.filter(x => x !== dz); }
    if (heavy) { d *= 1 - (pasK(me, 'heavyCut') || 0) - 0.25 * (me.aff.tiebi || 0) - (miK(me, 'calm') ? 0.15 : 0); if (miK(me, 'dodge') && !B.dodged) { B.dodged = true; ev.push({ t: 'miss', who: i, n: '御风躲开' }); continue; } }
    if (B.guard > 0 && heavy) { B.guard = 0; ev.push({ t: 'guard', who: 'me', n: '盾挡住了' }); continue; }
    d = Math.max(0.5, d);
    B.hp -= d;
    if (B.reflect) { f.hp -= d * B.reflect; B.reflect = 0; }
    if (me.aff.fanzhen) f.hp -= d * 0.15 * me.aff.fanzhen;
    B.rage = Math.min(100, B.rage + C.rage[1]);
    ev.push({ t: heavy ? 'heavy' : 'fhit', who: i, dmg: Math.round(d), el: fe, ke: !!(fe && de && L.elKe(fe, de)) });
    if (f.hp <= 0 && !f.deadEv) { f.deadEv = 1; B.kills.push(f.id); ev.push({ t: 'dead', who: i, id: f.id }); }
    if (B.hp <= 0) {
      if (B.budong) { B.budong = false; B.budongUsed = true; B.hp = 1; ev.push({ t: 'budong', who: 'me', n: '不动' }); continue; }
      if (miK(me, 'escape') && !B.escaped) { B.escaped = true; B.done = true; B.fled = true; B.hp = 1; ev.push({ t: 'escape', who: 'me', n: '血遁' }); return ev; }
      B.hp = 0; B.done = true; B.dead = true; ev.push({ t: 'dead', who: 'me' }); return ev;
    }
  }
  // 我方每轮的被动
  B.rage = Math.min(100, B.rage + (pasK(me, 'rage') || 0) + 4 * (me.aff.huiqi || 0) + (miK(me, 'star') && B.round % 4 === 0 ? 25 : 0));
  const rg = pasK(me, 'regen'); if (rg) B.hp = Math.min(B.max, B.hp + B.max * rg);
  tickSt(B);
  if (!alive(B).length) { B.done = true; B.win = true; ev.push({ t: 'win' }); }
  else if (B.round >= C.maxRounds) { B.done = true; B.fled = true; ev.push({ t: 'timeout' }); }
  return ev;
};
function tickSt(B) { for (const f of B.foes) { if (f.weak > 0) f.weak--; for (const x of f.st) x.n--; f.st = f.st.filter(x => x.n > 0); } }
// 自动策略要不要放绝招
L.btWantUlt = function (B, policy) {
  if (B.rage < 100) return false;
  if (policy !== 'smart') return true;
  const list = alive(B);
  if (list.some(f => f.charge)) return true;
  if (list.every(f => f.kind === 'mob')) return true;
  if (B.hp < B.max * 0.35) return true;
  // 罩还在、绝招克得动：削 2 格也值
  return list.some(f => f.sh > 0 && B.me.ult.el && L.elKe(B.me.ult.el, f.el));
};
L.btWantPill = (B, policy) => policy === 'smart' && B.pills > 0 && !B.pillUsed && B.hp < B.max * L.BAT.pillAt;
L.battleAuto = function (B, policy) {
  while (!B.done) L.battleStep(B, { ult: L.btWantUlt(B, policy), pill: L.btWantPill(B, policy) });
  return L.battleResult(B);
};
L.battleResult = function (B) {
  const el = B.foes.find(f => f.kind === 'elite'), bo = B.foes.find(f => f.kind === 'boss');
  const mats = { core: {} };
  if (B.win) for (const f of B.foes) if (f.kind !== 'mob' && f.el) mats.core[f.el] = (mats.core[f.el] || 0) + (f.kind === 'boss' ? 2 : 1);
  return { win: B.win, dead: B.dead, fled: B.fled, hp: Math.max(0, B.hp / B.max), rage: B.rage, rounds: B.round, brk: B.brk, ke: B.ke, beike: B.beike, pill: B.pill,
    kills: B.kills.slice(), elite: !!el, eliteId: el ? el.id : '', eliteEl: el ? el.el : '', boss: !!bo, bossId: bo ? bo.id : '', mats, used: Object.assign({}, B.used), budongUsed: !!B.budongUsed, escaped: !!B.escaped };
};

// ---------- 对决换引擎（§8.4 P1）：约战、论道、会武、宿敌、新秀、来犯 ----------
// 胜算照旧由 L.duelP 算（备战卡、sim 门槛都认它，含五行 ×1.15、玄霄剑卷的上限、锦囊的加减）；胜负改成一场真打的回合战：
// 先按“这一套招”查一张 战力比 → 全自动胜率 的表（每套招只跑一次，按招式签名缓存），反查出让引擎胜率正好等于 p 的战力比 r，
// 再用 T = Q × r 真打一场（种子取一个 R()，与原来的 R() < p 消耗同样多的随机数）。界面拿 L.duelLast 重放同一场。
L.DUEL_ON = L.DUEL_ON === undefined ? true : L.DUEL_ON;
const DGRID = []; for (let x = -3; x <= 3.001; x += 0.25) DGRID.push(x);
const dtab = new Map();
const meSig = me => [me.el, me.skills.map(s => s.id + (s.el || '') + (s.lv || 0)).join(), me.ult.id, me.pas ? me.pas.id : '', Object.keys(me.aff).join(), Object.keys(me.gold).join()].join('|');
const duelFoe = (Q, n) => { const f = L.btFoe('duel', Q, { kindAs: 'duel', el: '', n: n || '对手' }); return f; };
function duelTable(me, pact) {
  const key = meSig(me) + (pact ? '|p' : '');
  let t = dtab.get(key); if (t) return t;
  const N = 120, Q = 100;
  t = DGRID.map((x, gi) => {
    let w = 0; const T = Q * Math.pow(2, x);
    const m2 = Object.assign({}, me, { T, atk: Math.sqrt(T), hpMax: L.BAT.hpK * Math.sqrt(T) * (me.hpMax / L.BAT.hpK / Math.sqrt(me.T || 1)) });
    for (let j = 0; j < N; j++) { const B = L.battleNew(null, [duelFoe(Q)], 70001 + gi * 977 + j * 13, { me: m2, ult0: pact, pact }); if (L.battleAuto(B, 'auto').win) w++; }
    return w / N;
  });
  for (let i = 1; i < t.length; i++) t[i] = Math.max(t[i], t[i - 1]);   // 单调
  if (dtab.size > 400) dtab.clear();
  dtab.set(key, t);
  return t;
}
// 让全自动胜率 = p 的战力比（log2）
L.duelRatioFor = function (me, p, pact) {
  const t = duelTable(me, pact);
  if (p <= t[0]) return DGRID[0];
  for (let i = 1; i < t.length; i++) if (t[i] >= p) { const a = t[i - 1], b = t[i]; return DGRID[i - 1] + (b > a ? (p - a) / (b - a) : 0) * 0.25; }
  return DGRID[DGRID.length - 1];
};
L.duelBattle = function (st, Q, foe, p, seed, opt) {
  opt = opt || {};
  const pact = !!opt.pact;
  const me0 = L.btMe(st), x = L.duelRatioFor(me0, p, pact), T = Q * Math.pow(2, x);
  const me = Object.assign({}, me0, { T, atk: Math.sqrt(T), hpMax: me0.hpMax / Math.sqrt(me0.T) * Math.sqrt(T) });
  const f = duelFoe(Q, opt.n);
  f.vel = L.foeEl ? L.foeEl(foe) || '' : '';   // 画面上的五行徽（胜负里的五行已经算进胜算）
  return L.battleNew(st, [f], seed, { me, ult0: pact, pact });
};
L.duelLast = null;
L.duelWin = function (st, S, Q, foe, p, opt) {
  const seed = 1 + Math.floor(L.U.R() * 1e9);
  if (L.DUEL_ON === false || !st) return seed / 1e9 < p;
  const B = L.duelBattle(st, Q, foe, p, seed, opt);
  const res = L.battleAuto(B, 'auto');
  L.duelLast = { seed, Q, p, foe, opt: opt || {}, res, win: res.win };
  return res.win;
};

// ---------- 一张表：§8.3 的曲线（tools/sim.js btcurve 用，也是引擎的自测） ----------
// ratio：战力 / 推荐；el：1 我克它 / 0 / -1 被克；policy；pill：带一枚丹。返回 { clear, a甲以上, hp, rounds }
L.btCurve = function (ratio, el, policy, pill, N, seq) {
  N = N || 2000; seq = seq || ['mob', 'mob', 'elite'];
  const rec = 100, T = rec * ratio, sk = { id: 'z_t', n: '测试', el: el > 0 ? 'jin' : el < 0 ? 'tu' : 'huo', kind: 'z', m: 1.6, hits: 1, cd: 3 };
  const wk = { id: 'w_t', n: '劈斩', el: sk.el, kind: 'w', m: 1.3, hits: 1, cd: 4 };
  const fe = 'mu';
  let clear = 0, jia = 0, hp = 0, rd = 0;
  for (let i = 0; i < N; i++) {
    const me = { T, atk: Math.sqrt(T), hpMax: L.BAT.hpK * Math.sqrt(T), el: sk.el, skills: [sk, wk], ult: Object.assign({}, L.ULT_BASE), pas: null, aff: {}, ke: {}, gold: {} };
    let h = 1, rage = 0, won = 0, brk = 0, pills = pill ? 1 : 0, last = 0;
    for (let j = 0; j < seq.length; j++) {
      const kind = seq[j];
      const foes = kind === 'duel' ? [L.btFoe('x', rec, { kindAs: 'duel', el: fe })] : [L.btFoe('x', rec, { kindAs: kind, el: fe })];
      const B = L.battleNew(null, foes, i * 7919 + j * 104729 + 1, { me, hp: h, rage, pills });
      const r = L.battleAuto(B, policy);
      rd += r.rounds; brk += r.brk; pills = B.pills;
      if (!r.win) { h = 0; break; }
      won++; last = r.hp; h = Math.min(1, r.hp + L.BAT.between); rage = r.rage;
    }
    if (won === seq.length) { clear++; if (last >= (brk ? 0.35 : 0.45)) jia++; hp += last; }
  }
  return { clear: clear / N, jia: jia / N, hp: hp / Math.max(1, clear), rounds: rd / N };
};
});
