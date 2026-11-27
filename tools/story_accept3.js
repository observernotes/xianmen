#!/usr/bin/env node
/* 废柴仙途 3.0（行动点制，docs/AP_PLAN.md）· 主线可走通性验收（逻辑层）
 *   node tools/story_accept3.js [only=<正则>] [list] [v] [json=<文件>]
 *
 * 独立于 tools/sim.js：机器人只用 AP_PLAN §10 的公开接口玩（L.act / L.seasonEnd / L.nextBlock / L.blockDone / L.chainOpen / L.mainActs），
 * 不直接改 st、不直接调 L.tick / L.joinSect / L.tournament / L.promote——所以“机器人走得通”就等于“界面上点得通”（界面按约定也只能调这几个）。
 * 3.0 的接口还没合进来时本脚本以退出码 2 结束并列出缺哪几个函数（中期交付时的状态）；A1 冻结后只需要核对最下面 ADAPTER 一节。
 *
 * 硬断言（AP_PLAN §4、§5、§8.3；编号沿用那里的 H1～H10，T* 是验收方另加的）：
 *   H1  关键剧情 shown − due === 0（两套口径都查：逻辑层自己记的 st.story.lag，和本脚本独立记的“条件第一次成立的 seq → 那场戏出链的 seq”）
 *   H3  mid 节拍 ≤ 1 季；带抉择的节拍没有被记成“错过”（−1）
 *   H5  三年之约：约战结果、第一章高潮戏、章末卡、第二章开章都在 tick === 36 的同一条结算链里
 *   H7  任何一个季初阻塞内容 ≤ 2 件
 *   H8  照主线行动走的机器人：单章 ≤ 60 季；六个出身 × 入宗 / 散修走到九章做完
 *   H9  L.mainActs(st) 任何时刻非空；至少一项 ok，或每一项的 why 非空且有另一个能做的行动（历练 / 打坐）；ok 的那一项做下去状态真的会变
 *   H10 旧档（tools/story_fixtures/）：迁移 + 第一条链之后，压着的开章与抉择已播、mainActs 非空、tick % 3 === 0、没有“在外”状态
 *   T1  时间只由 L.seasonEnd 推进：L.act 前后 st.tick 不变；每季末 tick % 3 === 0；任何时刻 !st.exp && !st.retreat
 *   T2  行动点记账：0 ≤ apLeft ≤ L.AP.per；点不够时 L.apWhy 非空、L.act 返回 null 且状态不变
 *   T3  每条链结束 st.storyQ 里没有关键剧情；链 ≤ 40 张（不收敛就是死循环）
 *   T4  链中任意一张之后存读档（JSON 往返 + L.migrate），下一张与不存读时相同
 *   T5  目标卡：L.goalNow(st).next 有字、带 ap / do；主线行动做不了时 why 说得出差什么（不是空串、不是“条件不足”这种话） */
'use strict';
const path = require('path');
const fs = require('fs');
const arg = process.argv.slice(2);
const opt = k => { const a = arg.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : ''; };
const V = arg.includes('v'), ONLY = opt('only') ? new RegExp(opt('only')) : null;
const L = require(path.join(__dirname, '..', 'src', 'logic.js'));
const FIX = path.join(__dirname, 'story_fixtures');
const NEED = ['act', 'seasonEnd', 'nextBlock', 'blockDone', 'chainOpen', 'mainActs', 'apLeft', 'apWhy', 'migrateAp'];
const missing = NEED.filter(k => typeof L[k] !== 'function');

// ---------- 用例 ----------
// pol: main 先做主线行动、做不了就变强（历练 / 闭关 / 打坐）| grow 先变强、每季最后一点才碰主线 | reckless 主线行动能点就点（胜算再低也下战帖）
//      afk 一点不花只点【下一季】| sit 全打坐 | zigzag 每季行动顺序随机
const CASES = [];
const add = c => CASES.push(Object.assign({ pol: 'main', seed: 1, origin: 'qitu', trials: [], life: 1, sect: 'first', reach: 9, picks: {} }, c));
const ON = { qitu: '弃徒', dantong: '丹童', moyi: '魔门遗孤', shoumu: '守墓人之后', sanxiu: '散修丹师', yushou: '御兽遗脉' };
Object.keys(ON).forEach((o, i) => {
  const life = o === 'qitu' ? 1 : 2;
  add({ id: `A-${o}-join`, cat: 'A 出身×入宗', d: `${ON[o]}：在“三张帖子”里接帖`, origin: o, life, seed: 11 + i, sect: 'story' });
  add({ id: `A-${o}-knock`, cat: 'A 出身×入宗', d: `${ON[o]}：帖子不接，之后自己【拜山门】`, origin: o, life, seed: 21 + i, sect: 'knock' });
  add({ id: `A-${o}-lone`, cat: 'A 出身×入宗', d: `${ON[o]}：始终不入宗（没入宗就是散修）`, origin: o, life, seed: 31 + i, sect: 'never' });
});
add({ id: 'A-moyi-xuesha', cat: 'A 出身×入宗', d: '魔门遗孤：血帖 / 拜血煞魔宗', origin: 'moyi', life: 2, seed: 41, sect: 'story', want: 'xuesha' });
add({ id: 'A-late-knock6', cat: 'A 出身×入宗', d: '散修走到第六章再拜山门（外门弟子遇上来犯）', seed: 42, sect: 'knockCh:5' });
add({ id: 'A-knock-early', cat: 'A 出身×入宗', d: '约战一了结、没筑基就拜山门（不看境界）', seed: 43, sect: 'knockNow' });
for (const [i, t] of ['half', 'sleep', 'foes', 'poor', 'limit', 'wuxing', 'gu', 'wuzong'].entries()) add({ id: `B-${t}`, cat: 'B 天道试炼', d: '试炼·' + t, life: 2, trials: [t], seed: 51 + i, reach: t === 'limit' || t === 'half' ? 3 : 9, soft: t === 'limit' || t === 'half' });
add({ id: 'B-wuzong-limit', cat: 'B 天道试炼', d: '无宗 + 限时', life: 2, trials: ['wuzong', 'limit'], seed: 61, reach: 3, soft: true });
add({ id: 'B-all8', cat: 'B 天道试炼', d: '八条全开（只查不卡死）', life: 2, trials: ['half', 'sleep', 'foes', 'poor', 'limit', 'wuxing', 'gu', 'wuzong'], seed: 62, reach: 1, soft: true });
add({ id: 'C-pact-win', cat: 'C 约战', d: '约战赢：结果、高潮戏、章末卡、第二章开章同在第 36 月（H5）', seed: 71 });
add({ id: 'C-pact-lose', cat: 'C 约战', d: '约战输：【下战帖 · 慕容】补回第一章', seed: 72, lose: true });
add({ id: 'C-pact-lose-cool', cat: 'C 约战', d: '约战输 + 战帖也输（4 季冷却期间目标卡指向哪）', seed: 73, lose: true, pol: 'reckless', soft: true, reach: 1 });
const KEY = { s1_pact_after: 3, tiankuo_3: 3, story_r6: 3, s7_war: 3, tianheng_2: 4, story_r8: 3, s9_gate: 3 };
let ds = 100; for (const id in KEY) for (let i = 0; i < KEY[id]; i++) add({ id: `D-${id}-${i}`, cat: 'D 八个抉择', d: `${id} 选第 ${i} 项`, seed: ++ds, picks: { [id]: i }, pickWant: [id, i] });
add({ id: 'D-daolv-su', cat: 'D 八个抉择', d: '道侣选苏', seed: 131, picks: { su_5: 0, ye_5: 1 } });
add({ id: 'D-daolv-ye', cat: 'D 八个抉择', d: '道侣选夜', seed: 132, picks: { su_5: 1, ye_5: 0 } });
add({ id: 'D-daolv-none', cat: 'D 八个抉择', d: '谁也不选', seed: 133, picks: { su_5: 1, ye_5: 1 } });
add({ id: 'D-stay-again', cat: 'D 八个抉择', d: '天门前转身 →【再登天门】', seed: 134, picks: { s9_gate: 1, s9_gate_again: 0 }, again: true });
add({ id: 'D-war-mo-expelled', cat: 'D 八个抉择', d: '正道宗门里选魔道：被除名之后走散修表', seed: 135, picks: { s7_war: 1 } });
for (let s = 0; s < 3; s++) add({ id: `E-reckless-${s}`, cat: 'E 强弱与节奏', d: '打不过也硬下战帖（输 → 负伤 → 冷却）：mainActs 始终非空', pol: 'reckless', seed: 141 + s, soft: true, reach: 2 });
add({ id: 'E-grow-first', cat: 'E 强弱与节奏', d: '只顾变强、境界远超章节，再回头补主线（戏按章序补出）', pol: 'grow', seed: 151 });
add({ id: 'E-main-only', cat: 'E 强弱与节奏', d: '只做主线行动、别的点全打坐（境界落后章节）', pol: 'mainSit', seed: 152, soft: true, reach: 2 });
for (let c = 0; c <= 3; c++) add({ id: `E-cap-${c}`, cat: 'E 强弱与节奏', d: `境界封顶在第 ${c} 个大境界：能推到第几章、目标卡说没说清`, seed: 161 + c, cap: c, soft: true, reach: 0 });
add({ id: 'F-afk', cat: 'F 季内行动', d: '一点不花，只点【下一季】300 季（自动打坐）：不卡死，约战照常发生', pol: 'afk', seed: 171, soft: true, reach: 0, seasons: 300 });
add({ id: 'F-sit', cat: 'F 季内行动', d: '三点全打坐', pol: 'sit', seed: 172, soft: true, reach: 0, seasons: 300 });
add({ id: 'F-zigzag', cat: 'F 季内行动', d: '行动顺序随机（先主线后成长 / 反过来 / 夹着突破）', pol: 'zigzag', seed: 173 });
add({ id: 'F-overspend', cat: 'F 季内行动', d: '每季点数用完后再硬点 3 个行动：都被拒绝、状态不变（T2）', seed: 174, overspend: true });
add({ id: 'F-injured', cat: 'F 季内行动', d: '负伤时照样行动（输了战帖之后）', pol: 'reckless', seed: 175, soft: true, reach: 2 });
add({ id: 'G-save-chain', cat: 'G 存读档', d: '链里每出一张就存读一次（T4）', seed: 181, save: 'block' });
add({ id: 'G-save-act', cat: 'G 存读档', d: '每个行动之后存读一次', seed: 182, save: 'act' });
for (const f of fs.existsSync(FIX) ? fs.readdirSync(FIX).filter(x => /\.json$/.test(x)).sort() : []) add({ id: 'H-' + f.replace(/\.json$/, ''), cat: 'H 旧存档', d: '旧档 ' + f + '：迁移后接着玩（H10）', fixture: f, seed: 200 + CASES.length, sect: /lone|wuzong|refuse/.test(f) ? 'never' : 'story', soft: /idle|lazy/.test(f), reach: /idle|lazy/.test(f) ? 0 : 9 });
add({ id: 'I-life2', cat: 'I 转世坐化', d: '飞升 → 第二世', seed: 211, lives: 2 });
add({ id: 'I-rest', cat: 'I 转世坐化', d: '挂机到坐化 → 第二世', pol: 'afk', seed: 212, lives: 2, soft: true, reach: 0 });
const pick = CASES.filter(c => !ONLY || ONLY.test(c.id));
if (arg.includes('list')) { const by = {}; for (const c of pick) (by[c.cat] = by[c.cat] || []).push(c); for (const k in by) { console.log(`${k}（${by[k].length}）`); for (const c of by[k]) console.log(`  ${c.id.padEnd(28)} ${c.d}`); } console.log('共 ' + pick.length + ' 条'); process.exit(0); }
if (missing.length) { console.error('3.0 的接口还没合进来，缺：' + missing.map(k => 'L.' + k).join('、') + '\n（docs/AP_PLAN.md §10；合进来以后再跑。用例表可以先看：node tools/story_accept3.js list）'); process.exit(2); }

// ---------- 适配层：A1 冻结后只核对这一节 ----------
const ADAPTER = {
  // 做一个主线行动（L.mainActs 的一项）
  // L.mainActs 的 do = { id, args }（一律交给 L.act）；do 是 'exp' 的（首领没现身时指向那一格、“历练变强”）照历练的走法打完
  doMain(st, a) { if (typeof a.do === 'function') return a.do(st); const d = a.do || {}; const id = d.id || a.id, args = d.args !== undefined ? d.args : a.args; return id === 'exp' ? ADAPTER.trip(st, args) : L.act(st, id, args); },
  // 历练：L.act('exp') 只出发、扣 2 点（AP_PLAN §10 末尾）；之后一个节点一个节点 L.tripStep（这里 L.tripAuto 一口气走完，途中遭遇照界面选第一个能选的），走完 L.tripEnd 结算
  trip(st, args) {
    if (!L.act(st, 'exp', args)) return null;
    L.tripAuto(st, ev => { const i = ev.choices.findIndex(x => L.choiceShown(st, x) && L.costOk(st, x.cost)); if (i >= 0) L.resolveChoice(st, ev, i); });
    return L.tripEnd(st);
  },
  exp(st) { const c = L.expBest(st, 0); return ADAPTER.trip(st, { k: c.k, d: c.d, a: c.a }); },
  retreat(st) { return L.act(st, 'retreat'); },
  sit(st) { return L.act(st, 'sit'); },
  knock(st, id) { return L.act(st, 'join', id); },
  // 不花点的：突破 / 渡劫（接口不变）
  breakthrough(st) { if (L.tribNeeded(st)) { const v = L.tribStart(st, { pills: Math.min(3, st.pills), aids: 'all' }); return v ? L.tribFinish(st, { fa: 1, pet: 1, daolv: 1, pills: 0 }) : null; } return L.breakthrough(st, Math.min(3, st.pills)); },
  // 家务（AP_PLAN §2.2：不花点的事一季里做多少次都行）：换装、换功法、建造升级洞府、宗门任务接与交、买破境丹。真人每季都会顺手做；不做的话修炼跟不上寿元
  chores(st) {
    try { if (L.gearAutoAll) L.gearAutoAll(st); if (L.artApply && L.artBest) L.artApply(st, L.artBest(st, {})); } catch (e) { /* 没开放 */ }
    if (L.home2On && L.home2On() && L.homePlotFree(st)) for (const k of ['field', 'furnace', 'room', 'vault', 'library', 'forge', 'pen', 'spring', 'pavilion', 'portal']) { if (st.home[k] > 0 || !L.homeUnlocked(st, k)) continue; if (st.stones >= L.homeCost(st, k)) L.build(st, k); break; }
    for (let g = 0; g < 20; g++) { let best = null; for (const b of L.HOME) { if (st.home[b.k] >= b.max || !L.homeOpen(st, b.k) || (b.nu && !st.home[b.k])) continue; const c = L.hCost(b.k, st.home[b.k]); if (!best || c < best.c) best = { k: b.k, c }; } if (!best || st.stones < best.c * 1.2 || !L.upgrade(st, best.k)) break; }
    if (st.sect) st.sect.tasks.forEach((t, i) => { if (!t.taken && t.ty !== 'teach' && t.ty !== 'lecture') L.taskTake(st, i); if (L.taskCanDeliver(st, t)) L.taskDeliver(st, i); });
    if (L.isFull(st) || (L.ticksToNext && L.ticksToNext(st) <= 6)) for (let g = 0; g < 3 && st.pills < 3 && L.marketOpen && L.marketOpen(st, 'pill') !== false && st.stones >= L.price(st, 'pill'); g++) L.buy(st, 'pill');
    if (st.p.inj > 0 && st.pills > 3) L.heal(st);
  },
  // 结算链里的一张：返回这张是什么（story 类要选选项）
  show(st, x, choose) { if (x.kind === 'story') { const ev = L.eventById(x.id); if (ev) { const i = choose(ev); if (i === undefined) return 'nochoice'; L.resolveChoice(st, ev, i); } } L.blockDone(st, x); return x.kind; },
};

// ---------- 跑 ----------
const KEYEV = [['pact', st => !!st.pact, ['s1_pact_after', 's1_pact_lost']], ['rank60', st => !!st.pact && st.bestRank <= 60, ['s2_rank']], ['zhao', st => !!st.beaten.zhao && L.chapterNow(st) >= 2, ['s3_zhao_fall']], ['chu', st => !!st.beaten.chu && L.chapterNow(st) >= 4, ['s5_tiankuo_fall']],   // 线 B 核对：这两场是第三 / 第五章的高潮；在前一章（论道上）就打赢了的，戏在那一章开章的同一条链里接着出，“成立”= 打赢了且章到了
  ['war', st => !!st.flags.warWon, ['s6_after']]].concat([1, 2, 3, 4, 5, 6, 7, 8].map(i => ['m' + (i - 1), st => !!st.quest.done['c' + (i - 1) + '_m'], ['story_r' + i]]));
function runCase(c) {
  const fails = [], warns = [];
  const fail = m => { if (!fails.includes(m) && fails.length < 14) fails.push(m); };
  const warn = m => { const k = m.replace(/\d+/g, 'N'); if (!warns.some(w => w.replace(/\d+/g, 'N') === k)) warns.push(m); };
  let s = (c.seed * 2654435761 + 5) >>> 0; L.rng = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const rnd = L.rng;
  let st;
  if (c.fixture) { st = L.migrate(JSON.parse(fs.readFileSync(path.join(FIX, c.fixture), 'utf8'))); if (!st) return { id: c.id, cat: c.cat, d: c.d, fails: ['旧档读不进来'], warns, line: '' }; }
  else st = c.life > 1 ? L.newState({ name: '验收', rebirth: c.life - 1, origin: c.origin, trials: c.trials, meta: L.newMeta() }) : L.newState({ name: '验收' });
  const pp = L.PACT_POWER; if (c.lose && !st.pact) L.PACT_POWER = 1e12;
  const due = {}, shown = {}, chAt = []; let ch0 = L.chapterNow(st); chAt[ch0] = st.tick;
  const seq = () => (st.ap ? st.ap.seq : 0);
  const roundtrip = () => { const m = L.migrate(JSON.parse(JSON.stringify(st))); if (!m) { fail(`第 ${st.tick} 月存读档失败`); return; } for (const k of Object.keys(st)) delete st[k]; Object.assign(st, m); };
  const choose = ev => {
    const ok = ev.choices.map((x, i) => i).filter(i => L.choiceShown(st, ev.choices[i]) && L.costOk(st, ev.choices[i].cost));
    if (!ok.length) return undefined;
    if (ev.id === 's2_invite') { const join = ok.find(i => ev.choices[i].ok && ev.choices[i].ok.fx && ev.choices[i].ok.fx.join === (c.want || ['jian', 'dan', 'dao'][c.seed % 3])), san = ok.find(i => ev.choices[i].ok && ev.choices[i].ok.fx && [].concat(ev.choices[i].ok.fx.flag || []).includes('path_san')); return c.sect === 'story' && join !== undefined ? join : san !== undefined ? san : ok[ok.length - 1]; }
    const w = c.picks[ev.id]; if (w !== undefined) { if (ok.includes(w)) return w; warn(`抉择 ${ev.id} 的选项 ${w} 这一局点不到——覆盖不足`); }
    return ok[Math.floor(rnd() * ok.length)];
  };
  const watch = () => { for (const [k, f] of KEYEV) { let v = false; try { v = f(st); } catch (e) { v = false; } if (v && due[k] === undefined) due[k] = { seq: seq(), tick: st.tick }; } const ch = L.chapterNow(st); if (ch > ch0) { for (let i = ch0 + 1; i <= ch; i++) chAt[i] = st.tick; ch0 = ch; } };
  const invariants = where => {
    if (st.exp || st.retreat) fail(`${where}：还有“在外”状态（st.exp / st.retreat），第 ${st.tick} 月`);
    const ap = L.apLeft(st); if (!(ap >= 0 && ap <= L.AP.per)) fail(`${where}：行动点 ${ap} 越界`);
    if (st.p.r >= 9) return;
    let acts = null; try { acts = L.mainActs(st); } catch (e) { fail(`${where}：L.mainActs 抛错 ${e.message}`); return; }
    if (!acts || !acts.length) { fail(`${where}：L.mainActs 为空（第 ${L.chapterNow(st) + 1} 章，第 ${st.tick} 月，${st.sect ? '有宗' : '无宗'}，境界 ${st.p.r}）`); return; }
    for (const a of acts) if (!a.ok && (!a.why || /^(条件不足|不可用|暂不可用)$/.test(a.why))) fail(`${where}：主线行动「${a.t}」做不了，却没说差什么（why = “${a.why || ''}”）`);
    let g = null; try { g = L.goalNow(st); } catch (e) { fail(`${where}：L.goalNow 抛错 ${e.message}`); }
    if (g && (!g.next || !g.next.t)) fail(`${where}：目标卡没有“下一步”`);
  };
  let chainN = 0;
  const settle = why => {
    L.chainOpen(st, why); const tick0 = st.tick, seqList = []; let n = 0, opening = 0;
    for (;;) {
      let x; try { x = L.nextBlock(st); } catch (e) { fail(`结算链抛错（${why}，第 ${st.tick} 月）：${e.message}`); break; }
      if (!x) break;
      if (++n > 40) { fail(`结算链不收敛（${why}，第 ${st.tick} 月，40 张以后还有 ${x.kind}:${x.id}）`); break; }
      if (st.tick !== tick0) fail(`结算链进行中时间走了（${tick0} → ${st.tick}）`);
      seqList.push(x.kind + ':' + (x.id || ''));
      if (x.kind === 'story' && shown[x.id] === undefined) shown[x.id] = { seq: seq(), tick: st.tick, chain: chainN };
      if (why === 'season' && x.lv === 8) opening++;
      const r = ADAPTER.show(st, x, choose); if (r === 'nochoice') fail(`剧情 ${x.id} 没有点得到的选项`);
      watch();
      if (c.save === 'block') { const nx0 = L.nextBlock(st); roundtrip(); const nx1 = L.nextBlock(st); if ((nx0 && nx0.kind + nx0.id) !== (nx1 && nx1.kind + nx1.id)) fail(`链中存读档后下一张变了：${nx0 && nx0.kind + ':' + nx0.id} → ${nx1 && nx1.kind + ':' + nx1.id}`); }
    }
    if (opening > 2) fail(`季初阻塞内容 ${opening} 件（上限 2，H7）：${seqList.join(' → ')}`);
    for (const id of st.storyQ || []) { const ev = L.eventById(id); if (ev && /^sb:c\d_(open|climax|end)$/.test(ev.trigger || '')) fail(`结算链结束后关键剧情 ${id} 还压在队列里（第 ${st.tick} 月）`); }
    chainN++; invariants('链后');
    return seqList;
  };
  const growAct = () => (st.p.inj > 0 ? ADAPTER.sit(st) : (L.isFull && L.isFull(st)) ? ADAPTER.sit(st) : (rnd() < 0.3 && !L.apWhy(st, 'retreat') ? ADAPTER.retreat(st) : ADAPTER.exp(st)) || ADAPTER.sit(st));
  const mainAct = minP => { const acts = (L.mainActs(st) || []).filter(a => a.ok && (a.p === undefined || a.p >= minP)); if (!acts.length) return null; const snap = JSON.stringify([st.ap.left, st.beaten, st.sect && st.sect.rank, st.bestRank, Object.keys(st.bosses || {}).length, Object.keys(st.eflags).length, st.p.inj]); const r = ADAPTER.doMain(st, acts[0]); if (r && JSON.stringify([st.ap.left, st.beaten, st.sect && st.sect.rank, st.bestRank, Object.keys(st.bosses || {}).length, Object.keys(st.eflags).length, st.p.inj]) === snap) fail(`主线行动「${acts[0].t}」说能做、做了却什么都没变（第 ${st.tick} 月）`); return r; };
  settle('load');
  if (c.fixture) { if (st.tick % 3) fail(`迁移后 tick = ${st.tick}，不在季界上`); for (let n = 1; n <= Math.min(8, L.chapterNow(st)); n++) if (!st.evDone['story_r' + n]) fail(`迁移 + 第一条链之后 story_r${n} 还没播（第 ${L.chapterNow(st) + 1} 章）`); }
  const maxS = c.seasons || 520; let seasons = 0, knocked = false;
  for (; seasons < maxS && st.p.r < 9; seasons++) {
    if (st.p.age >= L.lifespan(st)) break;
    if (c.pol !== 'afk' && c.pol !== 'sit') ADAPTER.chores(st);
    for (let g = 0; g < 9 && L.apLeft(st) > 0 && c.pol !== 'afk'; g++) {
      const t0 = st.tick; let r = null;
      // 入宗方式
      const wantKnock = !st.sect && st.pact && !(L.trialOn && L.trialOn(st, 'wuzong')) && (c.sect === 'knockNow' || (c.sect === 'knock' && st.evDone.s2_invite) || (/^knockCh:/.test(c.sect) && L.chapterNow(st) >= +c.sect.split(':')[1]));
      if (wantKnock && !knocked) { r = ADAPTER.knock(st, c.want || ['jian', 'dan', 'dao'][c.seed % 3]); knocked = true; if (!st.sect) fail(`【拜山门】没成（第 ${st.tick} 月，境界 ${st.p.r}）：${L.apWhy(st, 'join', c.want || 'jian')}`); }
      else if (c.pol === 'sit') r = ADAPTER.sit(st);
      else if (c.pol === 'reckless') r = mainAct(0) || growAct();
      else if (c.pol === 'mainSit') r = mainAct(0.5) || ADAPTER.sit(st);
      else if (c.pol === 'grow') r = (L.apLeft(st) === 1 && L.chapterNow(st) + 2 < st.p.r ? mainAct(0.5) : null) || growAct();
      else if (c.pol === 'zigzag') r = (rnd() < 0.5 ? mainAct(0.55) : null) || growAct();
      else r = mainAct(0.55) || growAct();
      if (st.tick !== t0) fail(`行动之后时间走了（${t0} → ${st.tick}）`);
      watch(); settle('act');
      if (c.save === 'act') roundtrip();
      if (!r) break;
    }
    if (c.overspend && L.apLeft(st) === 0) for (const id of ['exp', 'retreat', 'sit']) { const snap = JSON.stringify(st); const why = L.apWhy(st, id); const r = L.act(st, id); if (r || !why || JSON.stringify(st) !== snap) { fail(`点数用完后 L.act('${id}') 没被拒绝干净（why = “${why}”，返回 ${r ? '非空' : '空'}，状态${JSON.stringify(st) !== snap ? '变了' : '没变'}）`); break; } }
    if (L.isReady(st) && !(c.cap !== undefined && st.p.r >= c.cap) && !(st.p.r === 8 && L.chapterNow(st) < 8 && !c.soft)) { const t0 = st.tick; ADAPTER.breakthrough(st); if (st.tick !== t0) fail('突破之后时间走了'); watch(); settle('act'); }
    if (st.p.r >= 9) break;   // 刚飞升：这一世到此为止，不再过季
    if (process.env.ACDBG && seasons % 6 === 0) console.log(`  [dbg] 季 ${seasons} 章 ${L.chapterNow(st) + 1} 境界 ${st.p.r}.${st.p.s} xp ${Math.round(st.p.xp)}/${L.pNeed(st.p)} 寿 ${Math.round(st.p.age)}/${Math.round(L.lifespan(st))} e ${st.mainG && st.mainG.e} gain ${Math.round(L.gain(st))} 点 ${JSON.stringify(st.ap.log[L.seasonNo(st)] && st.ap.log[L.seasonNo(st)].acts)}`);
    const t0 = st.tick; L.seasonEnd(st);
    if ((st.tick !== t0 + 3 || st.tick % 3) && st.p.age < L.lifespan(st)) fail(`季末结算后 tick 从 ${t0} 到 ${st.tick}（应 +3 且在季界上）`);
    watch(); settle('season');
    if (c.lose && st.pact) L.PACT_POWER = pp;
    const ch = L.chapterNow(st); if (!c.soft && chAt[ch] !== undefined && st.tick - chAt[ch] > 180 && !st.quest.done.c8_m) { fail(`第 ${ch + 1} 章超过 60 季还没做完（H8）：主线行动 ${(L.mainActs(st) || []).map(a => a.t + (a.ok ? '✓' : '✗' + a.why)).join(' / ')}`); break; }
  }
  L.PACT_POWER = pp;
  if (st.p.r >= 9) settle('act');
  // H1 / H5
  for (const [k, , evs] of KEYEV) { if (!due[k]) continue; const id = evs.find(e => shown[e]); if (!id) { if (evs.some(e => { const ev = L.eventById(e); return ev && (!ev.origin || ev.origin === (st.origin || 'qitu')) && !st.evDone[e]; }) && seq() - due[k].seq > 4 && !/^(zhao|pact)$/.test(k)) fail(`关键剧情没出：${k}（第 ${due[k].tick} 月）→ ${evs.join('/')}`); continue; } const d = shown[id].seq - due[k].seq; if (d !== 0) fail(`剧情滞后（H1）：${k} 在 seq ${due[k].seq}（第 ${due[k].tick} 月）成立，${id} 在 seq ${shown[id].seq}（第 ${shown[id].tick} 月）才出，隔 ${d} 个行动`); }
  const lag = (st.story && st.story.lag) || {}; for (const id in lag) { const ev = L.eventById(id), x = lag[id]; if (ev && /^sb:c\d_(open|climax|end)$/.test(ev.trigger || '') && x.shown - x.due !== 0) fail(`st.story.lag：${id} shown − due = ${x.shown - x.due}`); }
  if (!st.story || !st.story.lag) warn('逻辑层没有记 st.story.lag（AP_PLAN §8.3），H1 只按验收方自己的口径查了');
  if (due.pact && !c.fixture && c.life === 1 && st.beaten.mu && shown.s1_pact_after) { /* 线 B 核对：H5 只对“约战赢了”的局（输了的局第二章在补回慕容那一战之后开，归 H1 的 m0 → story_r1 查） */ if (due.pact.tick !== 36) fail(`三年之约在第 ${due.pact.tick} 月了结（应 36）`); for (const id of ['s1_pact_after', 's1_pact_lost', 'story_r1']) if (shown[id] && (shown[id].tick !== 36 || shown[id].seq !== due.pact.seq) && !(c.lose && id === 'story_r1')) fail(`H5：${id} 在第 ${shown[id].tick} 月 / seq ${shown[id].seq} 才出（约战在第 36 月 / seq ${due.pact.seq}）`); if (!c.lose && chAt[1] !== 36) fail(`H5：第二章在第 ${chAt[1]} 月才开（应 36）`); }
  for (const b in (st.story && st.story.beat) || {}) if (st.story.beat[b] === -1 && /^(c1_climax|c2_mid1|c3_climax|c5_mid3|c7_mid2|c7_climax|c8_mid2|c8_climax|c9_climax|c\d_open)$/.test(b) && !c.fixture) fail(`带抉择的节拍 ${b} 被记成“错过”（H3）`);
  const fin = !!st.quest.done.c8_m, reached = fin ? 9 : L.chapterNow(st);
  if (reached < c.reach) fail(`${seasons} 季（境界 ${st.p.r}）只走到第 ${L.chapterNow(st) + 1} 章，要求${c.reach >= 9 ? '九章做完' : '至少第 ' + (c.reach + 1) + ' 章'}；主线行动：${st.p.r < 9 ? (L.mainActs(st) || []).map(a => a.t + (a.ok ? '✓' : '✗' + a.why)).join(' / ') : '（已飞升）'}`);
  if (c.sect === 'never' && st.sect) fail('要求不入宗却入了宗');
  if (c.pickWant) { const [id, i] = c.pickWant; if (!st.evDone[id] && id !== 's9_gate') fail(`抉择 ${id} 这一局没有出现`); void i; }
  return { id: c.id, cat: c.cat, d: c.d, fails, warns, line: `${seasons} 季，境界 ${st.p.r}，第 ${L.chapterNow(st) + 1} 章${fin ? '·完' : ''}，${st.sect ? st.sect.id + '/' + st.sect.rank : '无宗'}，章 ${chAt.map((t, i) => (t === undefined ? '' : (i + 1) + ':' + t)).filter(Boolean).join(' ')}，链 ${chainN} 条` };
}
const t0 = Date.now(), all = [];
for (const c of pick) { let r; try { r = runCase(c); } catch (e) { r = { id: c.id, cat: c.cat, d: c.d, fails: ['抛错：' + e.message + ' @ ' + String(e.stack || '').split('\n')[1]], warns: [], line: '' }; } all.push(r); console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.id.padEnd(28)} ${r.line}`); for (const f of r.fails) console.log('       ✗ ' + f); if (V) for (const w of r.warns) console.log('       · ' + w); }
const by = {}; for (const r of all) { const b = by[r.cat] || (by[r.cat] = { n: 0, f: 0 }); b.n++; if (r.fails.length) b.f++; }
console.log('\n================ 3.0 主线可走通性验收（逻辑层） ================'); for (const k in by) console.log(`${k.padEnd(14)} ${by[k].n - by[k].f}/${by[k].n} 通过`);
const bad = all.filter(r => r.fails.length);
console.log(`共 ${all.length} 条，${all.length - bad.length} 通过，${bad.length} 失败；${Math.round((Date.now() - t0) / 1000)} 秒`);
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(all, null, 1));
process.exitCode = bad.length ? 1 : 0;
