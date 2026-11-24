/* 仙门崛起 · 核心逻辑（浏览器与 node 模拟共用） */
(function (root) {
'use strict';
const L = {};
L.rng = Math.random;
L.hook = null;
function emit(type, data) { if (L.hook) L.hook(type, data); }
L.emit = emit;

// ---------- 工具 ----------
const R = () => L.rng();
function ri(a, b) { return a + Math.floor(R() * (b - a + 1)); }
function pick(a) { return a[Math.floor(R() * a.length)]; }
function wpick(list) { let t = 0; for (const x of list) t += x[1]; let v = R() * t; for (const x of list) { if ((v -= x[1]) < 0) return x[0]; } return list[list.length - 1][0]; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
L.ri = ri; L.pick = pick; L.clamp = clamp;

L.fmt = function (n) {
  n = Math.floor(n);
  const neg = n < 0; if (neg) n = -n;
  let s;
  if (n < 1e4) s = String(n);
  else if (n < 1e8) s = trim(n / 1e4) + '万';
  else if (n < 1e12) s = trim(n / 1e8) + '亿';
  else if (n < 1e16) s = trim(n / 1e12) + '万亿';
  else s = trim(n / 1e16) + '京';
  return neg ? '-' + s : s;
  function trim(x) { return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1).replace(/\.0$/, '') : x.toFixed(2).replace(/0$/, '').replace(/\.$/, ''); }
};
L.pct = p => Math.round(p * 100) + '%';

// ---------- 数值参数 ----------
const P = L.P = {
  needBase: 30, needGrow: 1.55,
  monBase: 4.2, monGrow: 1.22,
  pw0: 10, pwStage: 1.5, pwRealm: 1.8,
};

// ---------- 静态数据 ----------
L.REALMS = [
  { n: '炼气', robe: '#7f93ab', trim: '#c9d3df', rate: 0.92, trib: 0 },
  { n: '筑基', robe: '#4f9e68', trim: '#a9e2b8', rate: 0.80, trib: 0 },
  { n: '金丹', robe: '#d6a032', trim: '#ffe39a', rate: 0.70, trib: 3 },
  { n: '元婴', robe: '#7d5bd6', trim: '#d2c2ff', rate: 0.60, trib: 4 },
  { n: '化神', robe: '#c8434e', trim: '#ffb0b5', rate: 0.52, trib: 5 },
  { n: '炼虚', robe: '#3c84d6', trim: '#b5d8ff', rate: 0.46, trib: 6 },
  { n: '合体', robe: '#2aa79b', trim: '#a5f2e8', rate: 0.40, trib: 7 },
  { n: '大乘', robe: '#e9e6dc', trim: '#ffd76a', rate: 0.35, trib: 8 },
  { n: '渡劫', robe: '#2a2533', trim: '#ffcc44', rate: 0.30, trib: 9 },
  { n: '真仙', robe: '#fff4c2', trim: '#ffffff', rate: 0, trib: 0 },
];
L.STAGES = ['初期', '中期', '后期', '圆满'];
L.MAXR = 8; // 渡劫圆满之后即飞升

L.TALENTS = [
  { n: '伪灵根', c: '#9aa0a6', cul: 0.7, atk: 0.85 },
  { n: '杂灵根', c: '#e6e1d3', cul: 1.0, atk: 1.0 },
  { n: '双灵根', c: '#62d26f', cul: 1.3, atk: 1.15 },
  { n: '单灵根', c: '#4aa8ff', cul: 1.65, atk: 1.3 },
  { n: '天灵根', c: '#c27dff', cul: 2.1, atk: 1.5 },
  { n: '先天道体', c: '#ffcf3f', cul: 2.6, atk: 1.75 },
  { n: '混沌圣体', c: 'rainbow', cul: 3.2, atk: 2.0 },
];

L.TRAITS = {
  hero:   { n: '主角光环', d: '奇遇概率×2，突破成功率+10%' },
  blood:  { n: '？？？', d: '体内似乎沉睡着什么……' },
  woke:   { n: '血脉觉醒', d: '上古血脉已然苏醒，修炼速度×1.2' },
  lucky:  { n: '气运之子', d: '奇遇概率×3' },
  sword:  { n: '剑心通明', d: '战力×1.5' },
  alch:   { n: '丹道奇才', d: '突破成功率+15%' },
  wise:   { n: '悟性超群', d: '修炼速度×1.3' },
  strong: { n: '天生神力', d: '战力×1.3' },
  koi:    { n: '锦鲤附体', d: '历练灵石收获×2' },
  steady: { n: '道心坚定', d: '突破失败不受伤、不掉修为' },
};

L.WEAPONS = [
  { n: '赤手空拳', m: 1 },
  { n: '凡器', m: 1.3, names: ['精钢剑', '铁木棍', '柳叶刀', '青竹笛'] },
  { n: '法器', m: 1.7, names: ['青锋剑', '玄铁剑', '寒光扇', '流云袖'] },
  { n: '灵器', m: 2.3, names: ['紫电锤', '寒冰枪', '碧落伞', '赤炎剑'] },
  { n: '法宝', m: 3.1, names: ['九龙鼎', '乾坤镜', '缚龙索', '紫金钵'] },
  { n: '灵宝', m: 4.2, names: ['诛邪剑', '昊天塔', '定海珠', '太阴镜'] },
  { n: '仙器', m: 5.7, names: ['斩仙飞刀', '轩辕古剑', '山河社稷图', '混元金斗'] },
  { n: '混沌至宝', m: 8, names: ['开天神斧', '鸿蒙紫气', '造化玉碟'] },
];
L.ARTS = [
  { n: '基础吐纳', m: 1 },
  { n: '黄阶', m: 1.15, names: ['长春功', '引气诀', '五行拳经'] },
  { n: '玄阶', m: 1.35, names: ['太虚引气诀', '青木长生功', '烈阳诀'] },
  { n: '地阶', m: 1.6, names: ['九转玄功', '大衍诀', '星辰炼体术'] },
  { n: '天阶', m: 1.9, names: ['太乙真经', '紫府天书', '万剑归宗'] },
  { n: '仙阶', m: 2.25, names: ['混元道经', '太上忘情录', '周天星斗大法'] },
  { n: '神阶', m: 2.7, names: ['鸿蒙造化经', '大道无极篇'] },
];

L.BUILD = [
  { k: 'gate', n: '山门', base: 200, grow: 2.3, max: 9, d: lv => `弟子上限 ${3 + lv} 人 · 收徒运势提升` },
  { k: 'array', n: '聚灵阵', base: 80, grow: 1.75, max: 40, d: lv => `全宗修炼速度 ×${L.arrayMult(lv).toFixed(2)}` },
  { k: 'mine', n: '灵脉', base: 60, grow: 1.75, max: 40, d: lv => `每月产出灵石 ${L.fmt(L.mineInc(lv))}` },
  { k: 'library', n: '藏经阁', base: 100, grow: 1.75, max: 40, d: lv => `全宗战力 ×${L.libMult(lv).toFixed(2)}` },
  { k: 'alchemy', n: '丹房', base: 200, grow: 1.75, max: 20, d: lv => lv ? `突破成功率 +${lv * 2}% · 每月炼丹 ${Math.round(lv * 3)}%` : '可炼制破境丹，提升突破成功率' },
];
L.arrayMult = lv => Math.pow(1.11, lv);
L.mineInc = lv => 8 * Math.pow(1.65, lv);
L.libMult = lv => Math.pow(1.14, lv);

L.DUNGEONS = [
  { n: '后山灵兽林', rep: 0, mon: 2, desc: '灵兽出没，适合新入门的弟子' },
  { n: '黑风寨', rep: 10, mon: 2, desc: '一伙为非作歹的散修匪寇' },
  { n: '落日古墓', rep: 40, mon: 2, desc: '传闻埋葬着一位筑基老祖' },
  { n: '万妖谷', rep: 120, mon: 3, desc: '妖兽成群，凶险异常' },
  { n: '血煞秘境', rep: 300, mon: 3, desc: '魔道遗留的小世界，血气冲天' },
  { n: '上古剑冢', rep: 700, mon: 3, desc: '万剑埋骨之地，剑意森然' },
  { n: '九幽魔渊', rep: 1500, mon: 3, desc: '深不见底，魔气翻涌' },
  { n: '东海龙宫', rep: 3000, mon: 4, desc: '龙族秘藏，宝光冲霄' },
  { n: '天外星墟', rep: 6000, mon: 4, desc: '破碎星辰的残骸，藏有仙人遗物' },
  { n: '太古仙府', rep: 12000, mon: 4, desc: '上古大能的洞府，九死一生' },
  { n: '混沌裂隙', rep: 25000, mon: 5, desc: '天地初开时留下的伤痕' },
];
// 推荐战力（3 人队伍总和），由模拟校准
L.DREC = [60, 300, 1800, 2e4, 3e5, 4e6, 6e7, 8e8, 1.2e10, 1.5e11, 1e12];
L.DREW = [80, 220, 600, 1600, 4200, 11000, 29000, 76000, 2e5, 5.2e5, 1.4e6];

// ---------- 名字 ----------
const SUR = '李王张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文'.split('');
const SUR2 = ['慕容', '上官', '欧阳', '司马', '南宫', '独孤', '令狐', '东方', '西门', '公孙'];
const G1 = '清明子若无长玄凌紫寒星天云逸问浩景墨剑灵婉雪月风尘羽霜静素晴青轩昊沐辰瑶念知守怀承仲锦'.split('');
const G2 = '风云尘心玄渊河行遥霄羽霜烟月瑶儿宁澜歌舟白川竹秋书影然鸿野衡离渡宸璃笙岚溪'.split('');
const FUNNY = ['铁柱', '狗剩', '二牛', '翠花', '大壮', '石头', '小满', '富贵'];
L.randName = function (t) {
  const s = R() < 0.06 ? pick(SUR2) : pick(SUR);
  if (t === 0 && R() < 0.35) return s + pick(FUNNY);
  return s + pick(G1) + (R() < 0.85 ? pick(G2) : '');
};
const SECT_A = '青玄紫天太灵万九赤寒落星凌归无金碧幽云烈苍昆神圣浩元'.split('');
const SECT_B = ['剑宗', '法阁', '虚宫', '霄宫', '机阁', '极殿', '霞宗', '元宗', '炎门', '冰谷', '灵宗', '华派', '兽山', '鼎派', '花谷', '刚寺', '阳宗', '月宫', '雷殿', '雾门', '道院', '仙府', '剑阁', '魔宗'];
L.RIVAL = '天剑宗';

// ---------- 外观 ----------
const HAIR = ['#1d1a24', '#2b1f1a', '#3a2a22', '#4a3328', '#1f2633'];
const SKIN = ['#f2c9a0', '#e8b68a', '#f6d3b3', '#dca77c'];
function randLook(female) {
  return { hair: pick(HAIR), skin: pick(SKIN), f: female ? 1 : 0, style: ri(0, 1) };
}

// ---------- 公式 ----------
L.si = d => d.r * 4 + d.s;
L.need = i => Math.floor(P.needBase * Math.pow(P.needGrow, i));
L.dNeed = d => L.need(L.si(d));
L.stageName = d => d.r >= 9 ? '真仙' : L.REALMS[d.r].n + L.STAGES[d.s];
L.isReady = d => !d.away && d.s === 3 && d.xp >= L.dNeed(d) && d.r <= L.MAXR;

L.globalCul = function (st) { return (1 + 0.5 * st.rebirth) * (1 + 0.25 * st.ascended); };
L.gain = function (st, d) {
  const i = L.si(d);
  const base = L.need(i) / (P.monBase * Math.pow(P.monGrow, i));
  let m = L.TALENTS[d.t].cul * L.ARTS[d.a].m * L.arrayMult(st.b.array) * L.globalCul(st);
  if (d.tr === 'wise') m *= 1.3;
  if (d.tr === 'woke') m *= 1.2;
  if (d.inj > 0) m *= 0.5;
  if (d.away) m *= 0.5;
  return base * m;
};
L.power = function (st, d) {
  const i = L.si(d);
  let p = P.pw0 * Math.pow(P.pwStage, i) * Math.pow(P.pwRealm, d.r);
  p *= L.TALENTS[d.t].atk * L.WEAPONS[d.w].m * L.libMult(st.b.library);
  if (d.tr === 'sword') p *= 1.5;
  if (d.tr === 'strong') p *= 1.3;
  if (d.inj > 0) p *= 0.6;
  return p;
};
L.income = function (st) {
  let s = L.mineInc(st.b.mine);
  for (const d of st.ds) s += 2 * Math.pow(2, d.r);
  return s;
};
L.cap = st => 3 + st.b.gate;
L.bCost = (k, lv) => { const b = L.BUILD.find(x => x.k === k); return Math.floor(b.base * Math.pow(b.grow, lv)); };
L.recruitCost = st => Math.floor(60 * Math.pow(1.3, Math.min(st.recruits, 40)));
L.btRate = function (st, d, usePill) {
  let p = L.REALMS[d.r].rate + st.b.alchemy * 0.02 + d.fails * 0.12;
  if (usePill) p += 0.2;
  if (d.tr === 'hero') p += 0.1;
  if (d.tr === 'alch') p += 0.15;
  return clamp(p, 0.05, 1);
};
L.sectPower = function (st) {
  const ps = st.ds.map(d => L.power(st, d)).sort((a, b) => b - a);
  return (ps[0] || 0) + (ps[1] || 0) + (ps[2] || 0);
};
L.expChance = function (st, k, team) {
  const T = team.reduce((s, d) => s + L.power(st, d), 0);
  const ratio = T / L.DREC[k];
  return { T, ratio, p: clamp(0.75 + 0.3 * Math.log2(Math.max(ratio, 1e-9)), 0.05, 0.98) };
};

// 宗门榜对手战力：按“等效境界”插值
function stdPower(e) { // e: 等效小境界（可为小数），返回 3 人队伍的典型战力
  const r = Math.floor(e / 4);
  return 3 * P.pw0 * Math.pow(P.pwStage, e) * Math.pow(P.pwRealm, r + (e % 4) / 4) * Math.pow(1.35, e / 4) * 1.2;
}
L.stdPower = stdPower;
const RA = [[1, 19.63], [2, 19.25], [5, 18.06], [12, 15.92], [30, 11.5], [60, 6.9], [80, 4.71], [100, 3.0]];
L.rivalPower = function (st, q) {
  const y = st.year - 1 + st.month / 12;
  let a = RA[RA.length - 1][1];
  for (let j = 0; j < RA.length - 1; j++) {
    const [q0, a0] = RA[j], [q1, a1] = RA[j + 1];
    if (q >= q0 && q <= q1) { a = a0 + (a1 - a0) * (q - q0) / (q1 - q0); break; }
  }
  const G = 0.3 * Math.min(y, 15) + 0.12 * Math.max(0, y - 15);
  return Math.exp(a + G);
};
L.rivalName = function (st, q) {
  if (q === st.rank) return st.sect;
  return st.ladder[q < st.rank ? q - 1 : q - 2];
};

// ---------- 新档 ----------
let uid = 1;
L.newDisciple = function (st, t, opts) {
  opts = opts || {};
  let tr = '';
  if (opts.tr !== undefined) tr = opts.tr;
  else if (t <= 1 && R() < 0.06) tr = 'blood';
  else if (R() < 0.55) tr = wpick([['lucky', 10], ['sword', 10], ['alch', 10], ['wise', 12], ['strong', 12], ['koi', 8], ['steady', 8]]);
  const female = R() < 0.45;
  return {
    id: st.nextId++, name: opts.name || L.randName(t), t, tr,
    r: 0, s: opts.s || 0, xp: 0, w: 0, wn: '', a: 0, an: '',
    inj: 0, away: 0, fails: 0, master: !!opts.master, look: opts.look || randLook(female), slot: opts.master ? 0 : undefined,
    joined: st.year, mocked: 0, feats: 0,
  };
};

L.newState = function (o) {
  o = o || {};
  const st = {
    v: 1, sect: o.sect || '青岚宗', masterName: o.master || '林逸尘',
    year: 1, month: 1, stones: 300 + 600 * (o.rebirth || 0), rep: 0, pills: 1, pillProg: 0,
    b: { gate: 0, array: 0, mine: 0, library: 0, alchemy: 0 },
    ds: [], exps: [], rank: 100, bestRank: 100, ladder: [],
    recruits: 0, nextId: 1, goal: 0, log: [], rebirth: o.rebirth || 0, ascended: 0,
    ascendedList: [], beatRival: 0, cleared: 0, tourneys: 0, flags: {}, totalMonths: 0,
    seenTips: {}, stats: { exp: 0, expWin: 0, bt: 0, events: 0, maxPower: 0 },
  };
  // 宗门榜
  const used = new Set([st.sect, L.RIVAL]);
  const names = [];
  while (names.length < 98) {
    const nm = pick(SECT_A) + pick(SECT_B);
    if (!used.has(nm)) { used.add(nm); names.push(nm); }
  }
  names.splice(11, 0, L.RIVAL); // 天剑宗位列第 12
  st.ladder = names;
  const m = L.newDisciple(st, 1, { tr: 'hero', master: true, name: st.masterName, look: { hair: '#1d1a24', skin: '#f2c9a0', f: o.female ? 1 : 0, style: 0 } });
  st.ds.push(m);
  return st;
};

L.log = function (st, text, cls) {
  st.log.unshift({ t: `${st.year}年${st.month}月`, text, cls: cls || '' });
  if (st.log.length > 60) st.log.length = 60;
  emit('log', { text, cls });
};

// ---------- 目标 ----------
L.GOALS = [
  { t: '招收第一名弟子', c: st => st.recruits >= 1, rw: 150 },
  { t: '将聚灵阵升到 1 级', c: st => st.b.array >= 1, rw: 150 },
  { t: '派弟子去秘境历练一次', c: st => st.stats.exp >= 1, rw: 200 },
  { t: '门下弟子达到 3 人', c: st => st.ds.length >= 3, rw: 300 },
  { t: '任一弟子突破至筑基期', c: st => maxR(st) >= 1, rw: 500 },
  { t: '参加一次宗门大比', c: st => st.tourneys >= 1, rw: 800 },
  { t: '宗门排名进入前 60', c: st => st.bestRank <= 60, rw: 1500 },
  { t: '任一弟子结成金丹', c: st => maxR(st) >= 2, rw: 3000 },
  { t: '宗门排名进入前 30', c: st => st.bestRank <= 30, rw: 8000 },
  { t: '任一弟子修成元婴', c: st => maxR(st) >= 3, rw: 2e4 },
  { t: '在大比中击败天剑宗', c: st => st.beatRival > 0, rw: 6e4 },
  { t: '任一弟子踏入化神', c: st => maxR(st) >= 4, rw: 1.2e5 },
  { t: '宗门排名进入前 5', c: st => st.bestRank <= 5, rw: 4e5 },
  { t: '任一弟子踏入合体', c: st => maxR(st) >= 6, rw: 1e6 },
  { t: '成为天下第一宗', c: st => st.bestRank <= 1, rw: 3e6 },
  { t: '任一弟子踏入渡劫', c: st => maxR(st) >= 8, rw: 5e6 },
  { t: '渡过飞升天劫，白日飞升', c: st => st.ascended >= 1, rw: 1e7 },
];
function maxR(st) { let m = st.flags.maxR || 0; for (const d of st.ds) if (d.r > m) m = d.r; return m; }
L.maxR = maxR;
L.checkGoals = function (st) {
  while (st.goal < L.GOALS.length && L.GOALS[st.goal].c(st)) {
    const g = L.GOALS[st.goal];
    st.stones += g.rw;
    st.goal++;
    emit('goal', { t: g.t, rw: g.rw });
    L.log(st, `【目标达成】${g.t}，奖励灵石 ${L.fmt(g.rw)}`, 'gold');
  }
};

// ---------- 收徒 ----------
L.rollTalent = function (st) {
  const q = 0.09 * st.b.gate + 0.12 * st.rebirth + 0.06 * Math.log10(1 + st.rep);
  const base = [30, 36, 20, 9.5, 3.6, 0.8, 0.1];
  const w = base.map((v, t) => [t, v * Math.pow(1 + q, t)]);
  return wpick(w);
};
L.makeCandidates = function (st, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(L.newDisciple(st, L.rollTalent(st)));
  // 保底：第 10 次收徒必出单灵根以上
  if (st.recruits % 10 === 9 && !out.some(d => d.t >= 3)) out[ri(0, n - 1)].t = 3;
  return out;
};
L.recruit = function (st) {
  const c = L.recruitCost(st);
  if (st.stones < c) return null;
  st.stones -= c;
  const cands = L.makeCandidates(st, 3);
  st.recruits++;
  return cands;
};
L.accept = function (st, d) {
  if (st.ds.length >= L.cap(st)) return false;
  d.joined = st.year;
  st.ds.push(d);
  L.log(st, `${d.name}（${L.TALENTS[d.t].n}）拜入${st.sect}`, d.t >= 4 ? 'gold' : '');
  L.checkGoals(st);
  return true;
};
L.dismiss = function (st, d) {
  if (d.master || d.away) return false;
  st.ds = st.ds.filter(x => x !== d);
  L.log(st, `${d.name} 下山游历去了`);
  return true;
};

// ---------- 建设 ----------
L.upgrade = function (st, k) {
  const b = L.BUILD.find(x => x.k === k);
  const lv = st.b[k];
  if (lv >= b.max) return false;
  const c = L.bCost(k, lv);
  if (st.stones < c) return false;
  st.stones -= c;
  st.b[k]++;
  L.log(st, `${b.n} 升至 ${st.b[k]} 级`);
  L.checkGoals(st);
  return true;
};

// ---------- 突破 ----------
L.breakthrough = function (st, d, usePill) {
  if (!L.isReady(d)) return null;
  if (usePill && st.pills <= 0) usePill = false;
  const p = L.btRate(st, d, usePill);
  if (usePill) st.pills--;
  const ok = R() < p;
  const from = d.r;
  const before = L.power(st, d);
  const res = { ok, from, to: from + 1, rate: p, usedPill: usePill, before, d, trib: L.REALMS[Math.min(from + 1, 8)].trib, ascend: from === L.MAXR };
  st.stats.bt++;
  if (ok) {
    d.r++; d.s = 0; d.xp = 0; d.fails = 0;
    st.flags.maxR = Math.max(st.flags.maxR || 0, d.r);
    const repGain = Math.floor(5 * Math.pow(2.2, d.r));
    st.rep += repGain;
    res.repGain = repGain;
    if (d.r === 1 && d.master && !st.flags.masterWoke) { st.flags.masterWoke = 1; res.awaken = { from: d.t, to: 6 }; d.t = 6; }
    else if (d.r === 1 && d.tr === 'blood') { const to = R() < 0.3 ? 6 : 5; res.awaken = { from: d.t, to }; d.t = to; d.tr = 'woke'; }
    if (d.r === 2 && d.mocked === 1) { d.mocked = 2; res.revenge = true; st.rep += 50; st.stones += 2000; }
    if (d.r >= 9) {
      res.ascend = true;
      st.ascended++;
      st.ascendedList.push({ name: d.name, year: st.year, t: d.t, master: d.master });
      st.ds = st.ds.filter(x => x !== d);
      L.log(st, `★ ${d.name} 渡过九九天劫，白日飞升！宗门气运冲天！`, 'gold');
    } else {
      L.log(st, `${d.name} 突破成功，踏入${L.REALMS[d.r].n}期！`, d.r >= 2 ? 'gold' : 'jade');
    }
    res.after = d.r >= 9 ? before : L.power(st, d);
  } else {
    d.fails++;
    if (d.tr !== 'steady') { d.xp = Math.floor(L.dNeed(d) * 0.7); d.inj = Math.max(d.inj, 2); }
    else d.xp = Math.floor(L.dNeed(d) * 0.95);
    res.after = L.power(st, d);
    L.log(st, `${d.name} 冲击${L.REALMS[from + 1].n}失败……下次成功率 +12%`, 'red');
  }
  L.checkGoals(st);
  return res;
};

// ---------- 历练 ----------
L.unlocked = (st, k) => st.rep >= L.DUNGEONS[k].rep;
L.available = st => st.ds.filter(d => !d.away && d.inj <= 0);
L.autoTeam = function (st) {
  return L.available(st).sort((a, b) => L.power(st, b) - L.power(st, a)).slice(0, 3);
};
L.startExp = function (st, k, team) {
  if (!team.length || !L.unlocked(st, k)) return false;
  for (const d of team) d.away = 1;
  st.exps.push({ k, ids: team.map(d => d.id), left: L.DUNGEONS[k].mon, total: L.DUNGEONS[k].mon });
  L.log(st, `${team.map(d => d.name).join('、')} 出发前往【${L.DUNGEONS[k].n}】`);
  return true;
};
function giveItem(st, team, kind, tier) {
  const key = kind === 'w' ? 'w' : 'a';
  const list = kind === 'w' ? L.WEAPONS : L.ARTS;
  tier = clamp(tier, 1, list.length - 1);
  let best = null;
  for (const d of team) if (d[key] < tier && (!best || d[key] < best[key])) best = d;
  const name = pick(list[tier].names);
  if (best) {
    best[key] = tier; best[key + 'n'] = name;
    return { d: best, name, tier, kind };
  }
  return { sold: true, name, tier, kind };
}
L.resolveExp = function (st, e) {
  const team = e.ids.map(id => st.ds.find(d => d.id === id)).filter(Boolean);
  for (const d of team) d.away = 0;
  const k = e.k;
  const ch = L.expChance(st, k, team);
  const ok = R() < ch.p;
  const res = { k, ok, team, ratio: ch.ratio, p: ch.p, items: [], stones: 0, rep: 0, pills: 0, xp: 0 };
  st.stats.exp++;
  if (ok) {
    st.stats.expWin++;
    const leap = ch.ratio < 0.6;
    res.leap = leap;
    let stones = L.DREW[k] * (0.85 + R() * 0.3);
    if (team.some(d => d.tr === 'koi')) stones *= 2;
    if (leap) stones *= 2;
    res.stones = Math.floor(stones);
    st.stones += res.stones;
    res.rep = Math.floor((3 + k * k * 4 + k * 6) * (leap ? 2 : 1));
    st.rep += res.rep;
    for (const d of team) { const g = L.gain(st, d) * L.DUNGEONS[k].mon * 0.7; addXp(st, d, g); }
    if (R() < 0.6) { res.pills++; }
    if (k >= 4 && R() < 0.5) res.pills++;
    st.pills += res.pills;
    const luck = team.reduce((m, d) => Math.max(m, d.tr === 'lucky' ? 3 : d.tr === 'hero' ? 2 : 1), 1);
    if (R() < 0.38) res.items.push(giveItem(st, team, 'w', 1 + Math.floor(k * 0.62) + (R() < 0.15 * luck ? 1 : 0)));
    if (R() < 0.32) res.items.push(giveItem(st, team, 'a', 1 + Math.floor(k * 0.5) + (R() < 0.15 * luck ? 1 : 0)));
    for (const it of res.items) if (it.sold) { const v = Math.floor(L.DREW[k] * 0.25); st.stones += v; it.value = v; }
    if (R() < 0.08 * luck) {
      const d = pick(team);
      const g = L.gain(st, d) * 12;
      addXp(st, d, g);
      res.fortune = `${d.name}误入一处上古传承之地，得前辈遗泽，修为暴涨！`;
    }
    if (k > st.cleared) st.cleared = k;
    L.log(st, `【${L.DUNGEONS[k].n}】历练${leap ? '越级' : ''}成功！灵石+${L.fmt(res.stones)}`, leap ? 'gold' : 'jade');
  } else {
    res.stones = Math.floor(L.DREW[k] * 0.1);
    st.stones += res.stones;
    for (const d of team) d.inj = Math.max(d.inj, 3);
    L.log(st, `【${L.DUNGEONS[k].n}】历练失利，众弟子负伤而归`, 'red');
  }
  L.checkGoals(st);
  return res;
};

function addXp(st, d, g) {
  if (d.r > L.MAXR) return;
  d.xp += g;
  let ups = 0;
  while (d.s < 3 && d.xp >= L.dNeed(d)) {
    d.xp -= L.dNeed(d); d.s++; ups++;
  }
  if (d.s === 3 && d.xp >= L.dNeed(d)) {
    d.xp = L.dNeed(d);
    if (!d.readyNotified && !d.away) { d.readyNotified = 1; emit('ready', d); }
  } else d.readyNotified = 0;
  if (ups) emit('stageUp', { d, ups });
}
L.addXp = addXp;

// ---------- 宗门大比 ----------
L.tournament = function (st) {
  const S = L.sectPower(st);
  const res = { startRank: st.rank, rounds: [], S, year: st.year };
  st.tourneys++;
  res.n = st.tourneys;
  if (S <= 0) { res.endRank = st.rank; return res; }
  const mults = [0.5, 0.85, 1.2];
  for (let j = 0; j < 3; j++) {
    let q;
    if (st.rank === 1) { q = 2; }
    else {
      const target = S * mults[j];
      // 在排名高于自己的宗门里，找战力最接近目标的
      q = st.rank - 1; let best = Infinity;
      for (let x = st.rank - 1; x >= 1; x--) {
        const p = L.rivalPower(st, x);
        const dlt = Math.abs(Math.log(p / target));
        if (dlt < best) { best = dlt; q = x; }
        if (p > target * 3) break;
      }
    }
    const name = L.rivalName(st, q);
    const Pq = L.rivalPower(st, q);
    const p = clamp(0.5 + 0.55 * Math.log2(S / Pq), 0.03, 0.97);
    const win = R() < p;
    const round = { q, name, P: Pq, p, win, prevRank: st.rank };
    if (win) {
      if (st.rank === 1) round.defend = true;
      else {
        // 我方跃升到对手的位置
        const idx = q - 1; // ladder 中对手的位置（q < rank）
        st.rank = q;
        void idx;
      }
      const rw = Math.floor(L.income(st) * 4 + L.DREW[st.cleared] * 0.6 + 100);
      round.stones = rw; st.stones += rw;
      round.rep = Math.floor(10 + (100 - st.rank) * (100 - st.rank) * 0.06);
      st.rep += round.rep;
      if (name === L.RIVAL) { st.beatRival++; round.rival = true; }
    }
    res.rounds.push(round);
    if (!win) break;
  }
  st.bestRank = Math.min(st.bestRank, st.rank);
  res.endRank = st.rank;
  L.log(st, `第${st.tourneys}届宗门大比落幕，${st.sect}位列天下第 ${st.rank}`, st.rank < res.startRank ? 'gold' : '');
  L.checkGoals(st);
  return res;
};

// ---------- 随机事件 ----------
L.randomEvent = function (st) {
  const home = st.ds.filter(d => !d.away);
  if (!home.length) return null;
  const weightOf = d => d.tr === 'lucky' ? 3 : d.tr === 'hero' ? 2 : 1;
  const d = wpick(home.map(x => [x, weightOf(x)]));
  const inc = L.income(st);
  const opts = [['enl', 25], ['cave', 20], ['rain', 14], ['demon', 12], ['taunt', 8], ['ring', 3], ['pill', 8]];
  if (st.ds.length < L.cap(st)) opts.push(['wander', 9]);
  if (d.t === 0 && !d.mocked && d.r < 2) opts.push(['mock', 30]);
  const kind = wpick(opts);
  const ev = { kind, d };
  switch (kind) {
    case 'enl': { const g = L.gain(st, d) * 6; addXp(st, d, g); ev.text = `${d.name}观云海翻涌，忽有所悟——顿悟！修为大涨`; ev.cls = 'jade'; break; }
    case 'cave': { const v = Math.floor(inc * 8 + 50); st.stones += v; ev.text = `${d.name}于后山寻得一处古修洞府，得灵石 ${L.fmt(v)}`; ev.cls = 'gold'; break; }
    case 'rain': { for (const x of home) addXp(st, x, L.gain(st, x) * 3); ev.text = '天降灵雨，全宗弟子修为精进！'; ev.cls = 'jade'; break; }
    case 'pill': { const n = 1 + (R() < 0.3 ? 1 : 0); st.pills += n; ev.text = `游方丹师路过山门，赠下破境丹 ×${n}`; ev.cls = 'jade'; break; }
    case 'demon': {
      const S = L.sectPower(st);
      const threat = S * (0.45 + R() * 0.8);
      if (S >= threat * (0.8 + R() * 0.4)) { const v = Math.floor(inc * 5 + 80); st.stones += v; st.rep += 5 + Math.floor(st.rep * 0.01); ev.text = `魔修夜袭山门，被${d.name}一剑斩退！缴获灵石 ${L.fmt(v)}`; ev.cls = 'gold'; }
      else { const v = Math.floor(st.stones * 0.1); st.stones -= v; ev.text = `魔修夜袭山门，劫走灵石 ${L.fmt(v)}……此仇必报！`; ev.cls = 'red'; }
      break;
    }
    case 'taunt': { st.rep += 3 + Math.floor(st.rep * 0.01); ev.text = `某宗少主路过山门出言不逊：“这也配叫宗门？”——被${d.name}一招击飞三里地。声望提升`; ev.cls = 'gold'; break; }
    case 'ring': {
      if (d.a < L.ARTS.length - 2) { d.a++; d.an = pick(L.ARTS[d.a].names); ev.text = `${d.name}捡到一枚生锈的戒指……“小友，老夫在此等候三千年了。”戒中老祖传下《${d.an}》！`; ev.cls = 'gold'; ev.big = true; }
      else { const g = L.gain(st, d) * 10; addXp(st, d, g); ev.text = `${d.name}偶遇神秘老者指点，修为大进`; ev.cls = 'jade'; }
      break;
    }
    case 'wander': { ev.cand = L.newDisciple(st, L.rollTalent(st)); ev.text = '一名散修慕名而来，愿拜入门下'; ev.big = true; break; }
    case 'mock': { d.mocked = 1; ev.text = `${d.name}的未婚妻登门退婚：“你一个伪灵根，也配娶我？”${d.name}握紧双拳：“莫欺少年穷！”`; ev.cls = 'red'; ev.big = true; break; }
  }
  st.stats.events++;
  if (ev.text && kind !== 'wander') L.log(st, ev.text, ev.cls);
  return ev;
};

// ---------- 每月推进 ----------
// 连续流动：界面每帧调用，f 为本帧占一个月的比例
L.flow = function (st, f) {
  for (const d of st.ds) addXp(st, d, L.gain(st, d) * f);
  st.stones += L.income(st) * f;
};
// cont=true 表示修为与灵石已由 flow 连续结算
L.monthTick = function (st, cont) {
  const out = { exps: [], event: null, tourney: null };
  st.totalMonths++;
  for (const d of st.ds) {
    if (d.inj > 0) d.inj--;
    if (!cont) addXp(st, d, L.gain(st, d));
  }
  if (!cont) st.stones += L.income(st);
  if (st.b.alchemy > 0) {
    st.pillProg += st.b.alchemy * 0.03;
    while (st.pillProg >= 1) { st.pillProg -= 1; st.pills++; }
  }
  for (const e of st.exps) e.left--;
  const done = st.exps.filter(e => e.left <= 0);
  st.exps = st.exps.filter(e => e.left > 0);
  for (const e of done) out.exps.push(L.resolveExp(st, e));
  if (st.totalMonths > 3 && R() < 0.07) out.event = L.randomEvent(st);
  const sp = L.sectPower(st);
  if (sp > st.stats.maxPower) st.stats.maxPower = sp;
  if (st.month === 12) out.tourney = true; // 年末大比（由界面触发，便于播放演出）
  st.month++;
  if (st.month > 12) { st.month = 1; st.year++; }
  L.checkGoals(st);
  return out;
};

if (typeof module !== 'undefined' && module.exports) module.exports = L;
else root.L = L;
})(typeof window !== 'undefined' ? window : globalThis);
