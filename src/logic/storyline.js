/* 废柴仙途 · 逻辑模块 storyline：剧情串联层（docs/STORY_PLAN.md §1～§3、§11）
 * 模块写法见 src/logic.js 顶部说明。排在 story 之后（包 L.tick / L.choiceShown / L.resolveChoice / L.endingsOf / L.migrate…）。
 *
 *   主线目标：第七章 = 得知真相 + 了结正魔大战；第八章 = 天骄榜前二 + 了断陆天衡；第九章 = 渡过天劫、在天门前作出选择。都不写境界。
 *   节拍 L.STORY_BEATS：每章 open / mid1～3 / pre / climax / end 几个位子，按表里的顺序一个一个放；放的时候 L.fireTrigger(st, 'sb:<节拍 id>')，
 *     场景用 trigger: 'sb:c3_open' 挂上去（人物戏挂 'sb:mid'：任何一章的中段空位）。带抉择的节拍（must）过了章也补放，别的过章就算错过。
 *     时点（docs/AP_PLAN.md §4.3）：开章、高潮、收尾、三张帖子是关键戏，事件一结算 L.storyKick 当场进队（结算链 blocks.js 当场出）；中段戏只在季初放（L.storyTick，一季一场）；
 *     pre 在最后一仗开打之前放（L.storyPreFire，blocks.js 把那一仗挪到它后面），固定日子的（守山）在那一季的季初。
 *     已经放过、场景却还没结算的（队列被清、选了个不显示的选项……）每条结算链补一次（L.storyRepush），所以主线不会丢。
 *   故事量：L.storyPath / storyDark / storyBonds / storySky / storyCond（对话里 if 的写法都走 storyCond）。
 *   有条件的选项：选项写 gate: 'stop' | 'expose' | 'stay' | 'break' | 'xuesha' | 'kept'，L.STORY_GATES[名](st) → { ok, why }；不满足时 L.choiceShown 为假，界面用 L.choiceGate 把它画成灰的并写上 why。
 *   场景字段（引擎只登记、不判）：talk 台词、scene 底图、gist 梗概、cine 过场、bgm 配乐；选项字段 key 关键抉择、hint 小字。
 *   资格字段：chMin / chMax（当前章的上下限，0 起）、cond（storyCond 的写法，字符串或数组）。fx：join 拜入宗门、retry 这场戏过 n 个月重来（对决输了）、meta 记跨世的量。
 *   结局：L.endingOf(st) → { id, n, tags, pic, cine, text }；L.endingsOf 的第一项就是它；L.epilogue(st) → 后日谈卡片 [{ who, text }]。
 * 存档：st.story = { beat: { 节拍 id: 月份（−1 = 错过） }, last 上一场的月份, chAt: { 章: 进入的月份 }, retry: { 事件 id: 到期月份 } }；不升版本（L.migrateStoryline 幂等）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const E = st => (st && st.eflags) || {};
const any = (st, a) => a.some(f => E(st)[f]);

// ---------- 故事量 ----------
L.storyPath = st => (st.sect ? (st.sect.id === 'xuesha' ? 'mo' : 'zheng') : 'san');
L.STORY_VOW = ['vow_blood', 'vow_justice', 'vow_letgo'];
L.STORY_WAR = ['war_zheng', 'war_mo', 'war_stop'];
L.STORY_LU = ['tianheng_dead', 'tianheng_crippled', 'tianheng_exposed', 'tianheng_spared'];
L.STORY_ASC = ['asc_go', 'asc_stay', 'asc_break'];
// 十二个故事标志位（STORY_PLAN §2.3）；tools/story_check.js 拿它查“场景读的标志位是不是登记过”
L.STORY_FLAGS = ['mu_shame', 'mu_spare', 'path_san', 'daolv_su', 'daolv_ye', 'tiankuo_ally', 'tiankuo_sect', 'elder_kept'].concat(L.STORY_VOW, L.STORY_WAR, L.STORY_LU, L.STORY_ASC);
const five = st => Object.keys(st.npc || {}).some(id => (st.npc[id].aff || 0) >= 100);
const grads = st => !!(st.disc && Array.isArray(st.disc.grads) && st.disc.grads.length) || !!(st.flags && st.flags.gradN);
L.storyDark = st => ['mu_shame', 'vow_blood', 'tianheng_dead', 'war_blood'].filter(f => E(st)[f]).length + (L.karmaOpen && L.karmaOpen(st).length >= 3 ? 1 : 0);
L.storyBonds = st => (st.daolv ? 1 : 0) + (st.sect && st.sect.rank >= 6 ? 1 : 0) + (grads(st) ? 1 : 0) + (five(st) ? 1 : 0) + (E(st).elder_kept ? 1 : 0);
L.STORY_SKY = ['yun_codex', 'tea_5', 'star_4'];
L.storySky = st => L.STORY_SKY.filter(f => E(st)[f]).length;
// 对话里 if 的写法：'flag'、'!flag'、'path:mo'、'daolv:su'、'daolv:none'、'origin:qitu'、'aff:su>=60'、'aff:su>=aff:ye'、'ch>=3'、'rebirth'、'gate:stop'、'grudge:xue<=-40'
function cond1(st, c) {
  if (typeof c === 'function') return !!c(st);
  if (c[0] === '!') return !cond1(st, c.slice(1));
  let m;
  if ((m = /^any:(.+)$/.exec(c))) return m[1].split('|').some(x => cond1(st, x));   // 任一满足：'any:war_zheng|war_mo|war_stop'、'any:aff:su>=40|aff:ye>=40'
  if ((m = /^path:(\w+)$/.exec(c))) return L.storyPath(st) === m[1];
  if ((m = /^sect:(\w+)$/.exec(c))) return m[1] === 'none' ? !st.sect : !!st.sect && st.sect.id === m[1];   // 在哪一宗
  if ((m = /^daolv:(\w+)$/.exec(c))) return m[1] === 'none' ? !st.daolv : m[1] === 'any' ? !!st.daolv : st.daolv === m[1];
  if ((m = /^origin:(\w+)$/.exec(c))) return (st.origin || 'qitu') === m[1];
  if ((m = /^aff:(\w+)>=aff:(\w+)$/.exec(c))) return L.aff(st, m[1]) >= L.aff(st, m[2]);
  if ((m = /^aff:(\w+)>=(\d+)$/.exec(c))) return L.aff(st, m[1]) >= +m[2];
  if ((m = /^met:(\w+)$/.exec(c))) return L.met(st, m[1]);
  if ((m = /^grudge:(\w+)<=(-?\d+)$/.exec(c))) return (L.grudge ? L.grudge(st, m[1]) : 0) <= +m[2];
  if ((m = /^ch>=(\d)$/.exec(c))) return L.chapterNow(st) >= +m[1];
  if ((m = /^gate:(\w+)$/.exec(c))) return L.storyGate(st, m[1]).ok;
  if ((m = /^pact:(win|lost)$/.exec(c))) return m[1] === 'win' ? st.pact > 0 : st.pact < 0;
  if ((m = /^trial:(\w+)$/.exec(c))) return !!(L.trialOn && L.trialOn(st, m[1]));
  if (c === 'rebirth') return (st.rebirth || 0) > 0;
  if (c === 'sky') return !!(st.meta && st.meta.sky);
  if (c === 'awakens') return L.awakens(st);
  return !!E(st)[c];
}
L.storyCond = (st, c) => (c === undefined || c === null ? true : Array.isArray(c) ? c.every(x => cond1(st, x)) : cond1(st, c));

// ---------- 共用场景的空位（STORY_PLAN §10 并行约定） ----------
// 场景的 talk 里写 { slot: 'su', say: [ 没人填时的缺省 ] } 或 { slot: '*', max: 3, say: [ … ] }；各线在自己的内容文件里往
// globalThis.STORY_SLOTS['s8_steps'] 里 push { who: 'zhao', if: 'zhao_owes', echo: '…', say: [ … ] }（if 的写法同 storyCond）。
// 取法：先按 who 归组（'*' = 所有人，按第一次出现的顺序），每组取第一条满足条件的——别的线填的排在框架自带的（base: 1）前面；'*' 最多取 max 组。
L.STORY_SLOTS = globalThis.STORY_SLOTS || (globalThis.STORY_SLOTS = {});
L.storySlot = function (st, evId, who, max) {
  const list = (L.STORY_SLOTS[evId] || []).filter(x => x && x.say && (who === '*' || x.who === who) && L.storyCond(st, x.if));
  const order = [], by = {};
  for (const x of list) { if (!by[x.who]) { by[x.who] = x; order.push(x.who); } else if (by[x.who].base && !x.base) by[x.who] = x; }
  return order.slice(0, who === '*' ? max || 3 : 1).map(w => by[w]);
};

// ---------- 有条件的选项 ----------
const moSide = st => L.aff(st, 'ye') >= 60 || L.storyPath(st) === 'mo' || (L.grudge ? L.grudge(st, 'xue') : 0) <= -40;
const zhengSide = st => L.aff(st, 'su') >= 60 || (L.storyPath(st) === 'zheng' && st.sect.rank >= 2) || !!E(st).tiankuo_ally;
L.STORY_GATES = {
  stop: st => (!moSide(st) ? { ok: false, why: '魔道那边，没有人肯听你说话' } : !zhengSide(st) ? { ok: false, why: '正道那边，没有人肯听你说话' } : { ok: true }),
  expose: st => (E(st).tianjian_6 || (E(st).vow_justice && E(st).tiankuo_ally) ? { ok: true } : { ok: false, why: '手里没有旧档，天下人不会信' }),
  stay: st => (L.storyBonds(st) > 0 ? { ok: true } : { ok: false, why: '人间没有等你的人' }),
  break: st => (!E(st).sword_6 ? { ok: false, why: '手里没有玄霄' } : L.storySky(st) < 2 ? { ok: false, why: '你还不知道门后是什么' } : { ok: true }),
  kept: st => (E(st).sword_6 ? { ok: true } : { ok: false, why: '玄霄还没有重铸' }),
  xuesha: st => (L.sectJoinable(st, 'xuesha') ? { ok: true } : { ok: false, why: '魔门没有人认得你' }),
  letter: st => (E(st).mu_letter ? { ok: true } : { ok: false, why: '你没有拆那封信' }),
};
L.storyGate = (st, name) => { const g = L.STORY_GATES[name]; return g ? g(st) : { ok: true }; };
L.choiceGate = (st, c) => (c && c.gate ? L.storyGate(st, c.gate) : { ok: true });
{ const cs0 = L.choiceShown; L.choiceShown = function (st, c) { if (c && c.gate && !L.storyGate(st, c.gate).ok) return false; if (c && c.cond !== undefined && !L.storyCond(st, c.cond)) return false; return cs0(st, c); }; }

// ---------- 引擎登记 ----------
L.supportTrigger('sb:');
for (const k of ['talk', 'scene', 'gist', 'cine', 'bgm']) L.supportElig(k);
L.supportElig('chMin', { ok: v => v >= 0 && v <= 8, test: (st, v) => L.chapterNow(st) >= v });
L.supportElig('chMax', { ok: v => v >= 0 && v <= 8, test: (st, v) => L.chapterNow(st) <= v });
L.supportElig('cond', { test: (st, v) => L.storyCond(st, v) });
for (const k of ['key', 'hint', 'gate', 'cond']) L.supportChoice(k);
// 抉择记一笔（跨世）：下一世的选项上有个小点
L.supportChoice('key', { apply: (st, v, ev, ch) => { if (!st.meta) return; const p = st.meta.picks || (st.meta.picks = {}); (p[ev.id] || (p[ev.id] = {}))[ev.choices.indexOf(ch)] = 1; } });
L.supportFx('join', { ok: v => typeof v === 'string', apply: (st, v, out) => { if (!st.sect && L.sectJoinable(st, v) && !(L.trialOn && L.trialOn(st, 'wuzong')) && L.joinSect(st, v)) out.push('拜入' + L.sectOf(st).n); } });
L.supportFx('retry', { ok: v => v > 0, apply: (st, v, out, fx, ctx) => { const ev = ctx && ctx.ev; if (!ev) return; delete st.evDone[ev.id]; S(st).retry[ev.id] = Math.ceil((st.tick + v) / 3) * 3; } });   // 过 v 个月重来：向上取到季界（AP_PLAN §4.3）
L.supportFx('unsect', { apply: (st, v, out) => { if (st.sect && st.sect.id !== 'xuesha') { out.push(L.sectOf(st).n + '将你除名'); L.log(st, `${L.sectOf(st).n}将你除名`, 'red'); st.sect = null; st.eflags.sect_expelled = 1; } } });

// 抉择二选了“哪家也不去”：这一世走散修之路（之后改主意入了宗就不算了）
{ const lr0 = L.loneRoute; L.loneRoute = st => lr0(st) || (!!st && !st.sect && !!E(st).path_san); }

// ---------- 主线目标（不写境界） ----------
const flagProg = (st, ok, t0, t1) => ({ k: 'story', t: '主线', v: ok ? 1 : 0, max: 1, text: ok ? t1 : t0 });
const rankProg2 = (st, n) => { const r = st.bestRank || 100; return { k: 'rank', t: '天骄榜', v: Math.min(1, (100 - Math.min(r, 100)) / (100 - n)), max: 1, text: r <= n ? `天骄榜最高第 ${r}` : `天骄榜 第 ${r} → 前 ${n}` }; };
const duelP = (st, id, n) => { const ok = !!st.beaten[id]; return { k: id, t: n, v: ok ? 1 : 0, max: 1, text: ok ? `已击败${n}` : `论道击败${n}` }; };
const sortP = a => a.filter(Boolean).sort((x, y) => x.v / x.max - y.v / y.max);
const NEW_MAIN = {
  6: { n: '真相', t: '得知三千年前的真相，并了结正魔大战', short: '知真相·了结大战', blurb: '那一剑，刺的是谁', rw: { inc: 30, title: '魔道克星' },
    c: st => !!E(st).st_truth && any(st, L.STORY_WAR), go: 'me',
    prog: st => sortP([flagProg(st, !!E(st).st_truth, '两块玉简还没有合上', '已知真相'), any(st, L.STORY_WAR) ? flagProg(st, true, '', '正魔大战已了结') : duelP(st, 'xue', '血无涯')]) },
  7: { n: '了断', t: '登上天骄榜前二，问剑天剑宗，了断陆天衡', short: '进前二·了断陆天衡', blurb: '三千年的账，该清了', rw: { inc: 40, title: '清理门户' },
    c: st => any(st, L.STORY_LU), go: 'rivals',
    prog: st => sortP([rankProg2(st, 2), flagProg(st, any(st, L.STORY_LU), E(st).st_justice ? '陆天衡在碑前等你' : '还没有问剑天剑宗', '已了断')]) },
  8: { n: '飞升', t: '渡过九九天劫，在天门前作出选择', short: '渡天劫·天门前', blurb: '修仙，是为了什么', rw: {},
    c: st => any(st, L.STORY_ASC), go: 'cult',
    prog: st => { let p = 0; try { p = st.p.r >= 9 ? 1 : L.tribRate(st); } catch (e) { p = 0; } return [st.p.r >= 9 ? flagProg(st, any(st, L.STORY_ASC), '天门开了一条缝', '已作出选择') : { k: 'trib', t: '天劫', v: Math.min(1, p), max: 1, text: st.p.r >= 8 ? `飞升天劫 成功率 ${Math.round(p * 100)}%` : '修到渡劫圆满，引动九九天劫' }]; } },
};
const CH_N = ['废柴', '入世', '旧怨', '立名', '问剑', '守山', '真相', '了断', '飞升'];
const CH_SUB = ['三年之约', '三张帖子', '那一只脚', '两盏灯', '半块玉简', '祖师画像', '那一剑', '师兄弟', '天门'];
L.CHAPTERS.forEach((ch, i) => {
  ch.n = CH_N[i]; ch.realm = CH_SUB[i];   // realm 字段留着给界面当副题用，不再是境界名
  const X = NEW_MAIN[i]; if (!X) return;
  const m = ch.main; m.t = X.t; m.c = X.c; m.rw = X.rw; m.go = X.go; m.goOf = null; ch.prog = X.prog; ch.shortF = X.short; ch.blurb = X.blurb;
  if (L.LONE) L.LONE[i] = null;
});
// 原来的两条主线降成札记（奖励照旧）；击败云无极是第九章的札记
{ const add = (i, q) => { q.ch = i; L.CHAPTERS[i].tasks.push(q); };
  add(6, { id: 'c6_xue', t: '击败血无涯', c: st => !!st.beaten.xue, rw: { inc: 20 }, go: 'me' });
  add(7, { id: 'c7_lord', t: '成为宗主，并带领宗门登顶', c: st => !!st.sect && st.sect.rank >= 6 && st.sect.best <= 1, rw: { inc: 40, title: '万宗之主' }, go: 'sect' });
  add(8, { id: 'c8_yun', t: '登顶天骄榜，击败云无极', c: st => !!st.beaten.yun, rw: { inc: 40, title: '天下第一' }, go: 'me' }); }

// ---------- 节拍 ----------
const S = st => { const s = st.story || (st.story = {}); if (!s.beat) s.beat = {}; if (!s.chAt) s.chAt = {}; if (!s.retry) s.retry = {}; if (typeof s.last !== 'number') s.last = -99; return s; };
L.storyState = S;
const mainDone = (st, i) => !!(st.quest && st.quest.done && st.quest.done['c' + i + '_m']);
const prOf = (st, ch) => { try { const a = L.CHAPTERS[ch].prog(st); if (!a || !a.length) return 0; return a.reduce((s, x) => s + Math.min(1, x.v / (x.max || 1)), 0) / a.length; } catch (e) { return 0; } };
const MID_PR = { mid1: 0.2, mid2: 0.45, mid3: 0.7 };
// 节拍时点（docs/AP_PLAN.md §4.3）：中段入章满 3 / 6 / 9 季也放；最小间隔只剩中段 1 季（一个季初最多一场）；pre 的兜底 36 月（12 季）
const MID_T = { mid1: 9, mid2: 18, mid3: 27 }, GAP = { open: 0, mid1: 3, mid2: 3, mid3: 3, pre: 0, climax: 0, end: 0 };
L.STORY_GAP = GAP; L.STORY_MID_T = MID_T;
// 高潮：这一章最后一仗打完的那一刻（不是主线完成——第七、八、九章的主线要等高潮那场戏里的抉择）
const CLIMAX = [
  st => !!st.pact, st => L.mainRankOk(st, 60, 1), st => !!st.beaten.zhao, st => mainDone(st, 3), st => !!st.beaten.chu, st => !!st.flags.warWon,
  st => !!E(st).st_truth && !!st.beaten.xue, st => !!E(st).st_justice && L.mainRankOk(st, 2, 7), st => st.p.r >= 9,   // 名次按 mainline.js 降过级的算
];
// 固定日子的最后一仗（守山）：那一季的季初放 pre（AP_PLAN §4.3）
const FIXED_PRE = { 5: st => !st.flags.warWon && st.flags.war > st.tick && st.flags.war - st.tick <= 3 };
// 每章节拍的顺序（缺省 open mid1 mid2 mid3 pre climax end）；must：带抉择，过了章也补放
const ORDER = { 4: ['open', 'mid1', 'mid2', 'climax', 'mid3', 'end'], 7: ['open', 'mid1', 'mid2', 'pre', 'climax', 'mid3', 'end'], 8: ['open', 'mid1', 'mid2', 'mid3', 'pre', 'climax'] };
const MUST = { c1_climax: 1, c2_mid1: 1, c3_climax: 1, c5_mid3: 1, c7_mid2: 1, c7_climax: 1, c8_mid2: 1, c8_climax: 1, c9_climax: 1 };   // 另外：每章的开章（主线剧情）都算
L.STORY_BEATS = [];
for (let ch = 0; ch < 9; ch++) for (const slot of ORDER[ch] || ['open', 'mid1', 'mid2', 'mid3', 'pre', 'climax', 'end']) {
  const id = 'c' + (ch + 1) + '_' + slot;
  L.STORY_BEATS.push({ id, ch, slot, must: slot === 'open' || !!MUST[id], when: (st, x) =>
    slot === 'open' ? (ch > 0 || x.inCh >= 24)   // 第一章的开章：新开一局时界面在建档后当场播（talk.js 的 storyStart）；没播过的（转世、快放的自动化）等上手那两年过去再放
      : slot === 'climax' ? CLIMAX[ch](st)
        : slot === 'end' ? mainDone(st, ch)
          : slot === 'pre' ? ((FIXED_PRE[ch] && FIXED_PRE[ch](st)) || x.pr >= 0.85 || x.inCh >= 36 || CLIMAX[ch](st))
            : id === 'c2_mid1' ? true   // 三张帖子：第二章开章那条链的末尾当场放（入宗不看境界，mainline.js）
              : (x.pr >= MID_PR[slot] || x.inCh >= MID_T[slot]) });
}
const BEAT = {}; for (const b of L.STORY_BEATS) BEAT[b.id] = b;
L.storyBeat = id => BEAT[id];
// 触发键到没到：realm:N 看剧情境界，sb:<节拍> 看这个节拍放过没有（chains.js / story.js 的补放用）
L.storyKeyDue = function (st, key) {
  let m = /^realm:(\d)$/.exec(key || ''); if (m) return (L.storyR ? L.storyR(st) : st.p.r) >= +m[1];
  m = /^sb:(\w+)$/.exec(key || ''); if (m) return m[1] === 'mid' ? false : (S(st).beat[m[1]] || 0) > 0 || S(st).beat[m[1]] === 0;
  return false;
};
const fired = (st, id) => S(st).beat[id] !== undefined;
// 节拍放过了、挂在它上面的场景却没结算也不在队列里：补进队列（结算链每条链开头、每出一张之前补一次：blocks.js）
function repush(st) {
  const s = S(st); let n = 0;
  for (const ev of L.events()) {
    if (ev.where !== 'story' || !ev.trigger || ev.trigger.slice(0, 3) !== 'sb:' || st.evDone[ev.id] || st.storyQ.includes(ev.id)) continue;
    const id = ev.trigger.slice(3); if (id === 'mid' || !(s.beat[id] >= 0)) continue;
    if (s.retry[ev.id] && st.tick < s.retry[ev.id]) continue;
    if (L.eligible(st, ev, 'story', { trigger: ev.trigger })) { st.storyQ.push(ev.id); n++; }
  }
  return n;
}
L.storyRepush = st => (st && st.storyQ && st.p && L.STORYLINE !== false ? repush(st) : 0);
// 上手引导头三步手把手（点历练 → 点地点 → 点出发）期间不放戏（AP_PLAN §4.7）
const guideHold = st => !!(st.guide && !st.guide.done && (st.guide.step || 0) < 3 && st.tick < 36);
L.storyGuideHold = guideHold;
// 闲戏（中段的主线戏、人物戏 sb:mid）：只在季初放，一个季初最多一场（AP_PLAN §4.4）；固定日子的 pre（守山）也在季初放。
// 开章、高潮、收尾、三张帖子、带抉择的补放是关键戏，不在这里——事件一结算 L.storyKick 当场放进队列（同一条结算链）。
const IDLE_RE = /^sb:(mid|c\d_mid\d)$/;
L.storyIdle = ev => !!ev && ev.where === 'story' && IDLE_RE.test(ev.trigger || '') && ev.trigger !== 'sb:c2_mid1';
L.storyTick = function (st, force) {
  if (!st || !st.p || !st.storyQ || L.STORYLINE === false) return 0;
  const s = S(st), now = L.chapterNow(st);
  for (let c = 0; c <= now; c++) if (s.chAt[c] === undefined) s.chAt[c] = st.tick;
  if (!force && st.tick % 3 !== 0) return 0;   // 只在季界（季末结算的最后一个月 = 下一季的季初）
  if (guideHold(st)) return 0;
  // 队列里还压着一场闲戏（上一季没排上）：这一季先放它，不再加
  if (st.storyQ.some(id => L.storyIdle(L.eventById(id)))) return 0;
  if (typeof s.lastMid !== 'number') s.lastMid = -99;
  let n = 0;
  let midBlocked = false;
  for (const b of L.STORY_BEATS) {
    if (fired(st, b.id)) continue;
    if (b.ch > now) break;
    const stale = b.ch < now && b.slot !== 'climax' && b.slot !== 'end';
    if (stale && !b.must) { s.beat[b.id] = -1; continue; }   // 过了章的中段戏：错过（回忆里补看）
    if (reactiveSlot(b) || (stale && b.must)) continue;   // 关键戏：L.storyKick 当场放
    if (b.slot === 'climax' || b.slot === 'end') { if (b.ch < now && !b.must) s.beat[b.id] = -1; continue; }
    const isMid = /^mid/.test(b.slot);
    if (isMid && (midBlocked || st.tick - s.lastMid < GAP[b.slot])) { midBlocked = true; continue; }
    const x = { ch: b.ch, pr: prOf(st, b.ch), inCh: st.tick - (s.chAt[b.ch] || 0) };
    if (!b.when(st, x)) { if (isMid) midBlocked = true; continue; }   // 中段按序：前一个没到点，后面的中段也不放（pre 不受牵连）
    s.beat[b.id] = st.tick;
    const q0 = st.storyQ.length;
    L.fireTrigger(st, 'sb:' + b.id);
    if (st.storyQ.length === q0 && isMid) L.fireTrigger(st, 'sb:mid');   // 这个中段位子没有主线戏：让给人物戏
    if (isMid) s.lastMid = st.tick;
    if (st.storyQ.length > q0) { s.last = st.tick; n += st.storyQ.length - q0; break; }
  }
  return n;
};
// ---------- 关键事件 → 对应剧情：零延迟 ----------
// 直接回应某件事的戏（约战之后、入宗那天、击败点名的人、这一章的高潮与收尾、下一章的开章、三张帖子）不进任何节流：
// 事件一结算（L.checkQuests / L.markBeat / L.joinSect 之后），对应的节拍当场放进剧情队列；结算链（blocks.js 的 L.nextBlock）按 AP_PLAN §4.2 的顺序连着出完。
// 只有中段的闲戏（mid1～3、人物戏 sb:mid）在季初放。L.storyUrgent(st)：队首是关键戏（旧界面用）。
L.storyReactive = ev => !!ev && ev.where === 'story' && (!IDLE_RE.test(ev.trigger || '') || ev.trigger === 'sb:c2_mid1');
const reactiveSlot = b => b.slot === 'open' || b.slot === 'climax' || b.slot === 'end' || b.id === 'c2_mid1';
// 队列里关键戏排前面（各自保持原来的先后）
L.storySort = function (st) {
  if (!st || !Array.isArray(st.storyQ) || st.storyQ.length < 2) return;
  // 前几章补放的带抉择的戏（章已经过了）也算关键的：保持它在后一章开章之前
  const now = L.chapterNow(st), past = ev => { const m = /^sb:c(\d)_/.exec((ev && ev.trigger) || ''); return !!m && +m[1] - 1 < now; };
  const key = id => { const ev = L.eventById(id); return L.storyReactive(ev) || past(ev); };
  const a = st.storyQ.filter(key), b = st.storyQ.filter(id => !key(id));
  st.storyQ.splice(0, st.storyQ.length, ...a, ...b);
};
L.storyUrgent = st => !!(st && st.storyQ && st.storyQ.length && L.storyReactive(L.eventById(st.storyQ[0])));
let kicking = 0;
L.storyKick = function (st) {
  if (kicking || !st || !st.p || !st.storyQ || !st.quest || L.STORYLINE === false) return 0;
  if (guideHold(st)) return 0;
  kicking++;
  try {
    const s = S(st), now = L.chapterNow(st); let n = 0;
    for (let c = 0; c <= now; c++) if (s.chAt[c] === undefined) s.chAt[c] = st.tick;
    for (const b of L.STORY_BEATS) {
      if (b.ch > now) break;
      if (fired(st, b.id)) continue;
      const x = { ch: b.ch, pr: prOf(st, b.ch), inCh: st.tick - (s.chAt[b.ch] || 0) };
      let due = reactiveSlot(b) && b.when(st, x);
      // 高潮来了，它前面那场铺垫（pre）跟着一起放，先铺垫后高潮
      if (!due && b.slot === 'pre' && CLIMAX[b.ch](st)) due = true;
      // 章已经过了、还没放的带抉择的戏（例如第七章的隔空传音）：跟着往后的关键戏一起按顺序补上，不被后一章插队
      if (!due && b.must && b.ch < now) due = true;
      if (!due) continue;
      s.beat[b.id] = st.tick; s.last = st.tick;
      const q0 = st.storyQ.length;
      L.fireTrigger(st, 'sb:' + b.id);
      n += st.storyQ.length - q0;
    }
    L.storySort(st);
    return n;
  } finally { kicking--; }
};
// 主线最后一仗之前的铺垫（pre）：玩家点了【下战帖】/【圣子之战】之后、对决之前当场放（blocks.js 把那一仗挪到这场戏之后再打）。
// 返回这一回放进队列的场景 id（没有可放的就是空数组，这一仗当场打）
L.storyPreFire = function (st) {
  if (!st || !st.p || !st.storyQ || L.STORYLINE === false) return [];
  const now = L.chapterNow(st), b = BEAT['c' + (now + 1) + '_pre'];
  if (!b || fired(st, b.id)) return [];
  const s = S(st), q0 = st.storyQ.length;
  s.beat[b.id] = st.tick; s.last = st.tick;
  L.fireTrigger(st, 'sb:' + b.id);
  return st.storyQ.slice(q0);
};
L.STORY_CLIMAX = CLIMAX;
// 'sb:mid' 的人物戏一次只放一场：fireTrigger 会把合格的全推进去，这里只留权重最高的一条
{ const ft0 = L.fireTrigger; L.fireTrigger = function (st, key) {
  if (key !== 'sb:mid') return ft0(st, key);
  const q0 = st.storyQ.length; ft0(st, key);
  if (st.storyQ.length > q0 + 1) { const add = st.storyQ.splice(q0).map(id => L.eventById(id)).sort((a, b) => (b.weight || 1) - (a.weight || 1)); st.storyQ.push(add[0].id); }
}; }
{ const tk0 = L.tick; L.tick = function (st, cont) { const out = tk0(st, cont); L.storyTick(st); return out; }; }
// 奇遇链 / 条件剧情的补放认 sb: 键（tianheng_2 是《老祖的旧剑》第 5 步）
{ const cc0 = L.chainCatchUp; if (cc0) L.chainCatchUp = function (st) { return cc0(st) + (st && st.storyQ ? repush(st) : 0); }; }
// 天剑宗来犯：了断陆天衡、或止了战以后不再来（P19）
{ const wc0 = L.warChapter; L.warChapter = st => wc0(st) && !(st.flags && st.flags.warWon); }
{ const tk1 = L.tick; L.tick = function (st, cont) { if (st && st.flags && !st.flags.warWon && (any(st, L.STORY_LU) || E(st).war_stop) && L.chapterNow(st) > 5) st.flags.warWon = st.flags.warWon || 1; return tk1(st, cont); }; }

// 按章记着的系统剧情键（boss:5 万剑低眉、trib:1 渡劫阵图、demon:3）：除了章要到，前面各章的开章剧情也得先出过——
// 一口气补主线时开章是一个月补一场，章先到了、戏还排着队，这几场不能插到它们前头（万剑低眉要在“残缺的剑诀”之后）
const openDone = (st, key) => {
  const need = L.STORY_CH ? L.STORY_CH(key) : -1; if (need < 0 || /^realm:/.test(key)) return true;
  const lim = Number.isInteger(need) ? need - 1 : Math.floor(need);
  for (let n = 1; n <= lim; n++) { const ev = L.eventById('story_r' + n); if (ev && !st.evDone[ev.id]) return false; }
  return true;
};
{ const ft2 = L.fireTrigger; L.fireTrigger = function (st, key) {
  if (st && st.p && st.path && L.STORYLINE !== false && L.CH_GATE !== false && !openDone(st, key)) { if (!Array.isArray(st.path.hold)) st.path.hold = []; if (!st.path.hold.includes(key)) st.path.hold.push(key); return; }
  return ft2(st, key);
}; }
{ const sr0 = L.storyRelease; if (sr0) L.storyRelease = function (st) {
  if (st && st.path && Array.isArray(st.path.hold) && L.STORYLINE !== false) { const ch = L.chapterNow(st); const due = st.path.hold.filter(k => L.STORY_CH(k) <= ch).sort((x, y) => L.STORY_CH(x) - L.STORY_CH(y))[0]; if (due !== undefined && !openDone(st, due)) return 0; }
  return sr0.apply(this, arguments);
}; }

// ---------- 境界先到、戏还没到：老祖先把东西传了 ----------
// 主线剧情跟着章走，可剧情里给的功法、灵根、永久加成是修行本身要用的——境界超前的人（不爱做主线的）不该因为戏没到就少一截战力。
// 踏入境界 N 时，第 N 章的开章剧情（story_rN）还没出：先按它头一个带这些奖励的选项发掉（功法 / 灵根 / 永久修炼与战力），记在 st.story.adv；
// 以后那场戏出的时候只讲故事，这几样不再重发（别的奖励——修为、好感、称号、标志位——照旧）。
const ADV_KEYS = ['cul', 'power', 'talent', 'art'];
L.storyAdvance = function (st, n) {
  if (L.STORYLINE === false || L.STORY_ADV === false) return null;
  const ev = L.eventById('story_r' + n); if (!ev || st.evDone[ev.id] || st.storyQ.includes(ev.id)) return null;
  const s = S(st); s.adv = s.adv || {}; if (s.adv[n]) return null;
  const fx0 = ev.choices.map(c => c.ok && c.ok.fx).find(f => f && ADV_KEYS.some(k => f[k] !== undefined)); if (!fx0) { s.adv[n] = 1; return null; }
  const fx = {}; for (const k of ADV_KEYS) if (fx0[k] !== undefined) fx[k] = fx0[k];
  s.adv[n] = 1;
  const out = L.applyFx(st, fx);
  L.log(st, `老祖：“往事以后再说，东西先拿着。”${out.join('、')}`, 'gold');
  return out;
};
{ const ft1 = L.fireTrigger; L.fireTrigger = function (st, key) {
  const r = ft1(st, key);
  const m = /^realm:(\d)$/.exec(key || ''); if (m && st && st.p && L.chapterNow(st) < +m[1]) L.storyAdvance(st, +m[1]);
  return r;
}; }
{ const af1 = L.applyFx; L.applyFx = function (st, fx, ctx) {
  const ev = ctx && ctx.ev, m = ev && /^story_r(\d)$/.exec(ev.id);
  if (m && fx && st && st.story && st.story.adv && st.story.adv[+m[1]] && ADV_KEYS.some(k => fx[k] !== undefined)) { fx = Object.assign({}, fx); for (const k of ADV_KEYS) delete fx[k]; }
  return af1(st, fx, ctx);
}; }

// ---------- 结局 ----------
const END = {
  wentian: { n: '问天', d: '没有进门，把那张空白的卷劈成了两半', bg: 'ascend', pic: 'wentian', text: '你没有进那扇门。玄霄出鞘的时候，门后那片星海头一回起了风。那张空白的大卷从中裂开，朱印碎成两半。它们出了三千年的题，这是头一回，有人把卷子交了回去。' },
  mozun: { n: '魔尊', d: '站在魔道一边打完正魔大战，登顶天骄榜', bg: 'summit', pic: 'mozun', text: '血海之上多了一把椅子。正道说你入了魔，魔道说你本来就是自己人。你只记得一句话：剑是什么颜色，看握剑的人。从此再没有人敢说，正道容不下你。' },
  gufeng: { n: '孤峰', d: '一路杀上来，飞升那天没有人来送', bg: 'ascend', pic: 'gufeng', text: '天门开的时候，山下没有灯。你赢了每一场，讨回了每一笔账。踏进门槛前你想起有个人说过：他站得太高，从没回头看过我。你没有回头。' },
  shitu: { n: '师徒同归', d: '把老祖的残魂留在玄霄里，带着他过了天门', bg: 'ascend', pic: 'shitu', text: '“比想的小。”剑里的人嘟囔了一句。三千年前他倒在第八道雷下，身后站着自己的徒弟。这一回他身后还是自己的徒弟。“走吧。这回，本座看着你渡完。”' },
  hermit: { n: '地仙·守人间', d: '在天门前转身，留在了人间', bg: 'hermit', pic: 'dixian', text: '门在身后等了一会儿，然后关上了。你下了山，把那座庙的屋顶修好了。后来山下的人说，庙里住着个仙人，不显灵，只是每到下雨天，屋里那盏灯亮得特别早。' },
  daolv: { n: '道侣同升', d: '与道侣一同飞升', bg: 'ascend', pic: 'daolv', text: '门槛很高，你先跨过去，回身伸手。那只手握上来的时候，你想起很多年前有人问：明天，还回来吗？不用回来了。要等的人，就在身边。' },
  summit: { n: '掌宗飞升', d: '以宗主之身、带天下第一宗飞升', bg: 'summit', pic: 'summit', text: '山门下跪了一路。你没让他们跪。当年让你去柴房的那位管事站在最前面，头发全白了。你把宗主印留在案上，印下压着一张纸：山门在，我在。' },
  ascend: { n: '白日飞升', d: '九九天劫散尽，踏云而去', bg: 'ascend', pic: 'ascend', text: '九九天劫散尽，仙门大开。当年被人踩在泥里的那个废柴，踏云而去。' },
  rest: { n: '坐化', d: '寿元耗尽，于洞府中坐化', bg: 'rest', pic: 'rest', text: '' },
};
L.STORY_END = END;
// 图鉴里的结局表：补三条新的，“师徒了断”改成“地仙·守人间”（旧档点亮过的照旧算）
{ const have = {}; for (const e of L.ENDINGS) have[e.id] = e;
  for (const id of ['wentian', 'gufeng', 'shitu']) if (!have[id]) { const e = { id, n: END[id].n, d: END[id].d, bg: END[id].bg }; L.ENDINGS.push(e); L.ENDING[id] = e; }
  for (const id of ['hermit', 'mozun']) if (have[id]) { have[id].n = END[id].n; have[id].d = END[id].d; } }
const ascKind = st => { const e = E(st); return e.asc_break ? 'break' : e.asc_stay ? 'stay' : 'go'; };   // 旧档 / 没走过天门那场戏的：当作踏进去
const isMo = st => st.origin === 'moyi' || L.storyPath(st) === 'mo';
const lordTop = st => !!st.sect && st.sect.rank >= 6 && st.sect.best <= 1;
const daolvUp = st => !!st.daolv && !(st.daolv === 'ye' && E(st).ye_ten);
L.endingOf = function (st) {
  if (!st || !st.p || st.p.r < 9) return Object.assign({ id: 'rest', tags: [], cine: 'lunhui' }, END.rest);
  const e = E(st), k = ascKind(st);
  const id = k === 'break' ? 'wentian'
    : e.war_mo && isMo(st) && st.bestRank <= 1 ? 'mozun'
      : k === 'go' && L.storyDark(st) >= 3 && L.storyBonds(st) === 0 ? 'gufeng'
        : k === 'go' && e.elder_kept ? 'shitu'
          : k === 'stay' ? 'hermit'
            : daolvUp(st) ? 'daolv'
              : lordTop(st) ? 'summit' : 'ascend';
  const tags = [];
  if (e.war_stop) tags.push('止戈');
  if (e.tianheng_dead || e.tianheng_crippled) tags.push('清理门户'); else if (e.tianheng_exposed || e.tianheng_spared) tags.push('以德服宗');
  const pic = id === 'daolv' ? 'daolv_' + st.daolv : END[id].pic;
  return Object.assign({ id, tags, cine: id === 'daolv' ? 'end_daolv_' + st.daolv : id === 'ascend' ? 'feisheng' : 'end_' + (id === 'hermit' ? 'dixian' : id) }, END[id], { pic });
};
// 这一世算得上的结局：主结局在前；踏进天门时，同时满足的几种老结局也一并点亮
L.endingsOf = function (st) {
  if (!st || !st.p || st.p.r < 9) return ['rest'];
  const main = L.endingOf(st).id, out = [main];
  if (ascKind(st) === 'go') { if (daolvUp(st)) out.push('daolv'); if (lordTop(st)) out.push('summit'); out.push('ascend'); }
  return out.filter((x, i) => out.indexOf(x) === i);
};
// 后日谈：每类最多一张，按表从上到下取第一条满足的（STORY_PLAN §3.2）。正文是占位稿，D 线照这个意思重写
const EPI = [
  ['天下', [['war_stop', '那一年的仗没有打起来。两面旗在谷地里插了很多年，旗杆上后来缠了牵牛花。'], ['war_zheng', '正道独大。三十年后，又有一个杂灵根的少年被人踢下了山门。'], ['war_mo', '魔道当兴。血池边新立了一条规矩：不许门人碰别家的孩子。']]],
  ['老祖', [['elder_kept', '玄霄的剑鞘里偶尔传出鼾声。换过三回鞘，他都嫌硬。'], ['st_farewell', '那枚玉戒留在了庙里。有人年年来擦，从不擦掉剩下的那一点锈。']]],
  ['陆天衡', [['tianheng_dead', '天剑阁第九层空了。铁匣里那卷剑典的末页，“弟子知罪”四个字被人用袖子擦过。'], ['tianheng_crippled', '山下多了个卖剑的老人。他的剑都没开刃，也从不讲价。'], ['tianheng_exposed', '他守着墨离的衣冠冢，每天扫一遍雪，扫完对着碑坐到天黑。'], ['tianheng_spared', '没有人再见过他。只是每年那一天，碑前会多一坛没开封的酒。']]],
  ['墨离', [['vow_justice', '史书上“弑师”那一页，有人添了两个字的批注：护师。'], ['st_justice', '天剑宗的祖师堂里，多了一块小小的牌位。香是楚天阔上的。']]],
  ['墨无痕', [['mo_brother', '墨无痕成了你的师弟。他学会的第一个字是“霄”，这一回没有人教错。'], ['mo_guard', '墨无痕留下来看门。面巾他再没戴过。'], ['mo_grave', '墨无痕每年去扫一次墓。墨家改过姓的那四十一支，陆续有人把姓改了回来。'], ['st_mo_seen', '墨无痕回了乡。墨家祠堂里，“弑师”那块匾被他亲手摘了。']]],
  ['苏', [['daolv_su', '药庐搬到了洞府旁边。方子越来越不苦，她嘴上说是药材好。'], ['su_tang', '济世堂搬下了山。堂前那块匾，是她自己写的，字还是那么丑。'], ['su_stay', '她留在了山下。药箱上多了一个名字。'], ['su_qianyuan', '她回了丹霞谷，再没下山。她说：下辈子，换你来找我。'], ['su_met', '济世堂的药箱每年都来，从不署名。']]],
  ['夜', [['daolv_ye', '屋顶上常年放着两坛酒。一坛开了，一坛留着。'], ['ye_life', '东海的蛟珠给她续了命。她说这笔账记你头上，慢慢还。'], ['ye_ten', '十年。她一天没多，一天没少。灯是你点的，也是你吹的。'], ['ye_defect', '她自立了门户，不叫魔，也不叫正。'], ['ye_met', '圣宗换了主人。头一道令：不许门人再碰正道的孩子。']]],
  ['楚狂', [['chu_gone', '他走到哪儿，哪儿的剑碑上就多一道痕。有人数过，一共七道，第八道留着。'], ['chu_bond', '楚狂还在磨剑。他说：第八次。']]],
  ['葛老', [['ge_done', '那炉九转金丹成了。他没舍得吃，埋在了阿青坟前。'], ['ge_peace', '坟前两只碗，一只是他的，一只是丹云的。谁也没提当年。'], ['ge_bond', '葛老还在赊酒。担保人那一栏，还是你的名字。']]],
  ['白小九', [['bai_nine', '雪见坡上，九尾的狐火朝天拜了一拜。'], ['bai_stay', '洞府门口多了个狐狸窝。她说恩人不在，小九看家。'], ['bai_bond', '小九把你剑上那撮毛又系紧了一点。']]],
  ['慕容', [[st => E(st).mu_spare && E(st).mu_asked, '她来送行，放下一盒桂花糕就走。走出很远，回了一次头。'], ['mu_spare', '她在人群里点了点头。两清的人，这样就够了。'], ['mu_shame', '慕容家搬出了落霞城。听说她远嫁了，剑留在了娘家。']]],
  ['赵乾', [['zhao_owes', '你的山门下开了间酒肆。掌柜的脚不太好，见了外门的小弟子，总要多打二两。'], ['zhao_guide', '他带了那一回路，然后剃了头。法号里有个“悔”字。'], ['clue_tianjian', '赵乾不知所终，只留下那份旧档。']]],
  ['楚天阔', [[st => E(st).tiankuo_ally && !E(st).tianheng_spared, '楚天阔接掌了天剑宗。第一件事是改名：从此叫玄霄剑宗。'], ['tiankuo_ally', '楚天阔的剑一直跟着你，直到你走的那天。'], ['tiankuo_sect', '问剑山成了第十宗。山门上只有一条规矩：剑从正面出。'], ['beat_chu', '楚天阔守着师父的碑。他练成了第十式，是自己悟的。']]],
  ['宗门', [[st => !!st.sect && st.sect.rank >= 6, '宗主印留在了案上。下一任是你的徒弟，或者你徒弟的徒弟。'], ['sect_expelled', '当年把你除名的那一宗，后来悄悄把你的名字刻了回去。'], ['path_san', '你到最后也没有山门。可天下的散修，都说自己是你那一脉的。']]],
];
L.epilogue = function (st) {
  const out = [];
  for (const [who, list] of EPI) for (const [c, text] of list) if (L.storyCond(st, c)) { out.push({ who, text }); break; }
  return out;
};
L.EPILOGUE = EPI;
// D 线：结局正文、后日谈卡片、结局的变体在 src/content/endings.js（浏览器里事件脚本先于逻辑载入，挂在 globalThis.XM_ENDINGS；node 里 require）。
// 它的 install(L, END, EPI) 把上面的占位稿换掉，并包一层 L.endingOf / L.epilogue；文件缺了就用占位稿。
{ let X = globalThis.XM_ENDINGS; if (!X && typeof require === 'function') { try { X = require('../content/endings.js').ENDINGS; } catch (err) { X = null; } } if (X && X.install) X.install(L, END, EPI); }
// 天外线索：每条让天道试炼道果 +5%（P24：云无极、卖茶翁、星墟仙人三处统一）；问天之后记 meta.sky
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) {
  const res = rc0.apply(this, arguments);
  if (res && st.meta) { if (L.storySky(st) > 0 && !st.meta.trialHint) st.meta.trialHint = 1; if (E(st).asc_break) st.meta.sky = 1; }
  return res;
}; }

// ---------- 存档 ----------
// 旧档：当前章以前的节拍都算过去了（已经发生的主线事件靠 evDone 不重播）；当前章从“现在”算起
L.migrateStoryline = function (s) {
  if (!s || !s.p || !s.quest) return s;
  const fresh = !s.story; const st = S(s);
  // 带抉择的、开章的（must）不算错过：读档后第一条结算链里按章序补出来（AP_PLAN §7、§8.3 H10）
  if (fresh && (s.tick || 0) > 0) { const now = L.chapterNow(s); for (const b of L.STORY_BEATS) if (b.ch < now && !b.must) st.beat[b.id] = -1; for (let c = 0; c <= now; c++) st.chAt[c] = c === now ? s.tick : 0; if (now === 0) st.beat.c1_open = -1; }
  return s;
};
// 以前的版本把过了章的开章 / 抉择记成了“错过”（−1）、场景却一场没放：放出来（场景都结算过的不动）
L.storyUnmiss = function (s) {
  if (!s || !s.story || !s.story.beat || !s.quest) return 0;
  const now = L.chapterNow(s); let n = 0;
  for (const b of L.STORY_BEATS) {
    if (b.ch >= now || !b.must || s.story.beat[b.id] !== -1) continue;
    const evs = L.events().filter(ev => ev.where === 'story' && ev.trigger === 'sb:' + b.id);
    if (evs.length && !evs.some(ev => s.evDone[ev.id])) { delete s.story.beat[b.id]; n++; }
  }
  return n;
};
{ const mg0 = L.migrate; L.migrate = function (s) { const r = mg0.apply(this, arguments); if (r) { L.migrateStoryline(r); L.storyUnmiss(r); } return r; }; }
});
