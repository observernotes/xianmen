/* 废柴仙途 · 主线死锁探测器（验收用；逻辑层与真实界面共用同一份）
 *   node 里：const probe = require('./story_probe.js')(L)；浏览器里：<script> 注入后 window.XM_PROBE(window.__xm.L)
 *
 * probe.probe(st) → { ch, lone, deps: [{ k, t, how, eta, note, realm, sub }], dead: [...], mainOk, mismatch }
 *   把“当前章主线条件”拆成一项一项的依赖，逐项回答：玩家现在能不能主动推进？不能的话，是不是有一个有期限的兜底在路上？
 *   how：
 *     done  已满足
 *     act   玩家现在就能主动做（点按钮就行：交任务、晋升、回洞府看剧情……）
 *     grow  要先变强 / 修炼 / 攒贡献（玩家能主动，但取决于数值）；realm = true 表示卡的是境界（“境界与主线不挂钩”的例外，要单列）
 *     wait  等一个定时的事（论道每 12 月、会武、来犯、招揽倒计时……），eta = 最多还要几个月
 *     beat  等剧情节拍（storyline.js 的 L.storyTick，有 inCh 计时兜底），eta = 上界
 *     none  死锁：没有任何可行动作，也没有兜底在路上
 *   依赖表是验收方按“玩家看到的主线目标”独立写的（不读 L.CHAPTERS[i].main.c 的实现）；mismatch：表里全满足而主线没完成（或反过来）——表该更新了，或者主线条件里有表不知道的东西。
 * probe.goalCheck(st) → { ok, bad: [...] }：目标卡 / 路径页给的文字和【去】是否指向一个能推进的地方。
 * probe.MAXWAIT：wait / beat 两类兜底允许的最长月数（跑用例时的看门狗用）。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else globalThis.XM_PROBE = install; })(function (L) {
'use strict';
const E = st => (st && st.eflags) || {};
const RANKV = { done: 0, act: 1, beat: 2, wait: 3, grow: 4, none: 5 };
const worst = a => a.reduce((x, y) => (RANKV[y.how] > RANKV[x.how] ? y : x), { how: 'done' });
const best = a => a.reduce((x, y) => (RANKV[y.how] < RANKV[x.how] ? y : x), { how: 'none', note: '没有任何来源' });
const D = (k, t, how, o) => Object.assign({ k, t, how }, o || {});
const MAXWAIT = { wait: 40, beat: 110 };
const trial = (st, id) => !!(L.trialOn && L.trialOn(st, id));
const isLone = st => !!(L.loneRoute && L.loneRoute(st));
const bossN = st => Object.keys(st.bosses || {}).filter(k => st.bosses[k]).length;
const chNow = st => L.chapterNow(st);

// ---------- 三年之约 / 论道 ----------
function pactDep(st) {
  if (st.pact) return D('pact', '三年之约', 'done');
  const left = L.PACT_TICK - st.tick;
  if (left < -2) return D('pact', '三年之约', 'none', { note: `约期已过 ${-left} 月，约战没有发生` });
  return D('pact', '三年之约', 'wait', { eta: Math.max(1, left + 1) });
}
function tourOn(st) { return !!st.pact; }
function rivalDep(st, id, n) {
  n = n || (L.rivalName ? L.rivalName(st, id) : id);
  const k = 'beat_' + id, t = '击败' + n;
  if (st.beaten && st.beaten[id]) return D(k, t, 'done');
  if (!tourOn(st)) { const p = pactDep(st); return D(k, t, p.how === 'done' ? 'wait' : p.how, { eta: p.eta, note: '先过三年之约' }); }
  const q = L.rivalRank(st, id);
  if (!q) return D(k, t, 'none', { note: n + '不在天骄榜上' });
  if (q > st.rank && !(st.rank === 1 && q === 2)) return D(k, t, 'none', { note: `${n}在第 ${q}，排在你（第 ${st.rank}）身后——论道只往上打` });
  const W = L.RIVAL_WALL && L.RIVAL_WALL[id];
  if (W && L.si(st.p) < W.from) return D(k, t, 'grow', { realm: true, note: `${n}要你修到${L.rivalWallStage(id)}才肯上台（现在${L.stageName ? L.stageName(st.p) : L.si(st.p)}）`, eta: L.nextTour(st) });
  let p = null; try { p = L.rivalP(st, id); } catch (e) { p = null; }
  return D(k, t, 'grow', { note: `论道遇上他（第 ${q}，你第 ${st.rank}），胜算 ${p === null ? '?' : Math.round(p * 100) + '%'}`, eta: L.nextTour(st), p });
}
function rankDep(st, lim) {
  const k = 'rank' + lim, t = '天骄榜前 ' + lim;
  if ((st.bestRank || 100) <= lim) return D(k, t, 'done');
  if (!tourOn(st)) { const p = pactDep(st); return D(k, t, p.how === 'none' ? 'none' : 'wait', { eta: p.eta, note: '先过三年之约' }); }
  // 前面有没有卡位的宿敌、他肯不肯上台
  for (let x = st.rank - 1; x >= lim; x--) {
    const rv = L.rivalAt(st, x);
    if (rv && rv.id && L.rivalWall && L.rivalWall(st, rv.id) > 0 && !(st.beaten && st.beaten[rv.id])) { const d = rivalDep(st, rv.id); return D(k, t, d.how, { realm: d.realm, note: `要先过第 ${x} 的${rv.n || rv.id}：${d.note || ''}`, eta: d.eta }); }
  }
  return D(k, t, 'grow', { note: `现在第 ${st.rank}（最高 ${st.bestRank}），论道每 ${L.TOUR_EVERY} 月一届`, eta: L.nextTour(st) });
}
// ---------- 入宗 / 身份 ----------
function sectDep(st) {
  if (st.sect) return D('sect', '拜入宗门', 'done');
  if (trial(st, 'wuzong')) return D('sect', '拜入宗门', 'none', { note: '天道试炼·无宗：不能入宗' });
  const src = [];
  // ① 三宗争徒的弹窗（tick.js）：筑基、约战之后、宗门解锁卡开了、人在洞府、到了 inviteAt
  const at = (st.flags && st.flags.inviteAt) || 0;
  if (at >= 1e8) src.push(D('invite', '三宗争徒', 'none', { note: '招揽被永久关掉（inviteAt = ' + at + '）' }));
  else if (!st.pact) { const p = pactDep(st); src.push(D('invite', '三宗争徒', p.how === 'none' ? 'none' : 'wait', { eta: (p.eta || 0) + 12, note: '约战之后才来' })); }
  else if (st.p.r < 1) src.push(D('invite', '三宗争徒', 'grow', { realm: true, note: '筑基之后三宗才上门（弹窗这一路）' }));
  else if (L.unlocked && !L.unlocked(st, 'sect')) src.push(D('invite', '三宗争徒', 'wait', { eta: 60, note: '等【宗门】解锁卡（上一个系统掌握 / 等满 maxWait）' }));
  else src.push(D('invite', '三宗争徒', 'wait', { eta: Math.max(1, at - st.tick) + 3, note: `约 ${Math.max(0, at - st.tick)} 月后上门（要人在洞府）` }));
  // ② 剧情“三张帖子”
  const ev = L.eventById('s2_invite');
  if (ev) { const d = evDep(st, ev, c => c.ok && c.ok.fx && c.ok.fx.join && L.choiceShown(st, c), 0); src.push(D('s2_invite', '剧情·三张帖子', d.how, { eta: d.eta, note: d.note, realm: d.realm })); }
  const b = best(src);
  return D('sect', '拜入宗门', b.how, { eta: b.eta, note: `${b.t}：${b.note || ''}`, realm: b.realm, sub: src });
}
function srankDep(st, n) {
  const nm = L.SRANKS[n] ? L.SRANKS[n].n : '身份 ' + n, k = 'srank' + n, t = '晋升' + nm;
  if (!st.sect) { const s = sectDep(st); return D(k, t, s.how === 'done' ? 'act' : s.how, { eta: s.eta, note: '先入宗——' + (s.note || ''), realm: s.realm, sub: [s] }); }
  if (st.sect.rank >= n) return D(k, t, 'done');
  const sub = [];
  for (let r = st.sect.rank + 1; r <= n; r++) {
    const R = L.SRANKS[r];
    if (st.p.r < R.r) sub.push(D('realm', `境界到${L.REALMS[R.r].n}`, 'grow', { realm: true, note: `晋升${R.n}要${L.REALMS[R.r].n}期（现在${L.REALMS[st.p.r].n}）` }));
    if (st.sect.total < R.c) sub.push(D('contrib', '贡献', 'grow', { note: `贡献 ${Math.floor(st.sect.total)} → ${R.c}` }));
    if (R.duel) sub.push(D('heir', '圣位之争', 'grow', { note: '要打赢原圣子（输了隔 6 月再来）' }));
  }
  if (st.sect.rank + 1 <= n) for (const x of L.promoteNeeds(st)) if (!x.ok && x.k !== 'realm' && x.k !== 'contrib') sub.push(D(x.k || 'need', x.t, 'grow', { note: x.t }));
  if (!sub.length || (L.canPromote(st) && st.sect.rank + 1 === n)) return D(k, t, 'act', { note: '现在就能去宗门页点【晋升】' });
  const w = worst(sub);
  return D(k, t, w.how, { realm: sub.some(x => x.realm), note: sub.map(x => x.note).join('；'), sub });
}
// ---------- 首领 ----------
function bossDep(st, n) {
  const k = 'boss' + n, t = `击败 ${n} 个首领`, v = bossN(st);
  if (v >= n) return D(k, t, 'done');
  const total = L.REGIONS.length;
  if (total < n) return D(k, t, 'none', { note: `全图只有 ${total} 个首领` });
  let ready = 0, open = 0;
  for (let r = 0; r < total; r++) { if (!st.bosses[r] && L.bossReady(st, r)) ready++; if (L.regionOpen(st, r)) open++; }
  if (ready) return D(k, t, L.busy(st) ? 'wait' : 'act', { eta: 12, note: `有 ${ready} 个首领现在就能打（已败 ${v}）` });
  return D(k, t, 'grow', { realm: open < n, note: `已败 ${v}；开了 ${open} 张图${open < n ? '（后面的图要境界）' : ''}，深处评价到乙才出首领` });
}
// ---------- 会武 / 来犯 ----------
function meetDep(st) {
  const k = 'meet', t = '会武压过天剑宗';
  if (st.flags && st.flags.beatTianjian) return D(k, t, 'done');
  if (!st.sect) { const s = sectDep(st); return D(k, t, s.how === 'done' ? 'wait' : s.how, { eta: s.eta, note: '先入宗——' + (s.note || ''), realm: s.realm }); }
  const pos = L.sectPos(st), tj = st.sect.order.indexOf('tianjian') + 1;
  if (!tj) return D(k, t, 'none', { note: '九宗名单里没有天剑宗' });
  if (!(tj < pos || (pos === 1 && tj === 2))) return D(k, t, 'none', { note: `本宗第 ${pos}、天剑宗第 ${tj}：会武只往上打，再也碰不到天剑宗` });
  return D(k, t, 'grow', { eta: L.nextMeet(st), note: `本宗第 ${pos}、天剑宗第 ${tj}，下一届会武还有 ${L.nextMeet(st)} 月` });
}
function warDep(st) {
  const k = 'war', t = '击退天剑宗';
  if (st.flags && st.flags.warWon) return D(k, t, 'done');
  const ch = chNow(st);
  if (ch < 5) return D(k, t, 'wait', { note: '第六章才来犯' });
  const lone = isLone(st);
  if (!st.sect && !lone) { const s = sectDep(st); return D(k, t, s.how === 'done' ? 'wait' : s.how === 'none' ? 'none' : s.how, { eta: s.eta, realm: s.realm, note: '没有宗门、也不在散修之路上：来犯不会发生。先入宗——' + (s.note || '') }); }
  if (st.sect && st.sect.rank < 2 && !lone) { const s = srankDep(st, 2); return D(k, t, s.how === 'done' ? 'wait' : s.how, { realm: s.realm, note: '真传以上才轮到你守山门：' + (s.note || '') }); }
  const at = (st.flags && st.flags.war) || 0;
  if (at - st.tick > 900) return D(k, t, 'none', { note: `来犯被推到了 ${at - st.tick} 月以后（flags.war）` });
  if (st.flags.warEve && st.tick - st.flags.warEve > 8) return D(k, t, 'grow', { eta: Math.max(1, at - st.tick), note: `守山输过，天剑宗 ${Math.max(0, at - st.tick)} 月后再来（每输一次隔 24 月）` });
  return D(k, t, 'wait', { eta: Math.max(1, at - st.tick) + 26, note: `来犯还有 ${Math.max(0, at - st.tick)} 月（要人在洞府）` });
}
// ---------- 剧情节拍 ----------
const CLIMAX_DEPS = [
  st => [pactDep(st)], st => [rankDep(st, 60)], st => [rivalDep(st, 'zhao')], st => mainDeps(st, 3), st => [rivalDep(st, 'chu')], st => [warDep(st)],
  st => [flagDep(st, ['st_truth'], '得知真相', 1), rivalDep(st, 'xue')], st => [flagDep(st, ['st_justice'], '问剑天剑宗', 1), rankDep(st, 2)],
  st => [st.p.r >= 9 ? D('asc', '渡过飞升天劫', 'done') : D('asc', '渡过飞升天劫', 'grow', { realm: true, note: '修到渡劫圆满，渡九九天劫（第九章的目标本身就是它）' })],
];
function beatDep(st, id, depth) {
  const b = L.storyBeat && L.storyBeat(id);
  if (!b) return D(id, '节拍 ' + id, 'none', { note: '没有这个节拍' });
  const s = (st.story && st.story.beat) || {}, now = chNow(st);
  if (s[id] !== undefined) return s[id] >= 0 ? D(id, '节拍 ' + id, 'done') : D(id, '节拍 ' + id, 'none', { note: '节拍被记成“错过”（−1），挂在它上面的场景不会再放' });
  if (b.ch > now) return D(id, '节拍 ' + id, 'wait', { note: `第 ${b.ch + 1} 章才到` });
  if (b.slot === 'climax') { const w = worst(CLIMAX_DEPS[b.ch](st)); if (w.how !== 'done') return D(id, '节拍 ' + id, w.how, { eta: w.eta, realm: w.realm, note: '高潮要先：' + (w.t || '') + (w.note ? '（' + w.note + '）' : '') }); }
  if (b.slot === 'end' && !(st.quest && st.quest.done && st.quest.done['c' + b.ch + '_m'])) return D(id, '节拍 ' + id, 'wait', { note: '这一章主线做完才放' });
  return D(id, '节拍 ' + id, 'beat', { eta: MAXWAIT.beat, note: '节拍按顺序放，中段有 inCh 计时兜底（人要在洞府）' });
}
// 一场剧情能不能给出想要的选项：wantChoice(c) 为真的选项里至少有一个点得到
function evDep(st, ev, wantChoice, depth) {
  depth = depth || 0;
  const t = '剧情 ' + ev.id;
  const shown = ev.choices.some(c => wantChoice(c));
  if (st.storyQ && st.storyQ.includes(ev.id)) return shown ? D(ev.id, t, L.busy(st) ? 'wait' : 'act', { eta: 12, note: '已在剧情队列里，回洞府就播' }) : D(ev.id, t, 'none', { note: '在队列里，但想要的选项都点不到' });
  const retry = st.story && st.story.retry && st.story.retry[ev.id];
  if (st.evDone && st.evDone[ev.id]) return D(ev.id, t, 'none', { note: '这场戏已经结算过了' });
  if (ev.origin && ev.origin !== (st.origin || 'qitu')) return D(ev.id, t, 'none', { note: '只有出身 ' + ev.origin + ' 才有这场戏' });
  if (ev.sect === false && st.sect) return D(ev.id, t, 'none', { note: '入了宗就没有这场戏' });
  const now = chNow(st);
  if (ev.chMax !== undefined && now > ev.chMax) return D(ev.id, t, 'none', { note: `过了第 ${ev.chMax + 1} 章就不再放` });
  if (ev.not && ev.not.some(f => E(st)[f])) return D(ev.id, t, 'none', { note: '排斥的标志位已经置上：' + ev.not.filter(f => E(st)[f]).join(',') });
  if (ev.cond !== undefined && !L.storyCond(st, ev.cond)) return D(ev.id, t, 'none', { note: '条件不满足：' + JSON.stringify(ev.cond) });
  const sub = [];
  if (ev.sect === true && !st.sect) sub.push(sectDep(st));
  if (depth < 4) for (const f of ev.need || []) if (!E(st)[f]) sub.push(flagDep(st, [f], '标志位 ' + f, depth + 1));
  const m = /^sb:(\w+)$/.exec(ev.trigger || ''), mr = /^realm:(\d)$/.exec(ev.trigger || '');
  let trig;
  if (m) trig = beatDep(st, m[1], depth);
  else if (mr) trig = (L.storyR ? L.storyR(st) : st.p.r) >= +mr[1] ? D('realm', '境界触发', 'act') : D('realm', '境界触发', 'grow', { realm: st.p.r < +mr[1], note: `要境界与章都到 ${mr[1]}` });
  else trig = D('trig', '触发 ' + ev.trigger, 'wait', { eta: MAXWAIT.wait, note: '触发键 ' + ev.trigger + '（探测器不认识，按等待算）' });
  if (!shown && !sub.length) return D(ev.id, t, 'none', { note: '想要的选项都被条件挡着' });
  if (trig.how === 'done' || trig.how === 'act') {
    // 节拍放过了：场景合格就会被补进队列
    if (!sub.length) { let el = false; try { el = L.eligible(st, ev, 'story', { trigger: ev.trigger }); } catch (e) { el = false; } if (retry && st.tick < retry) return D(ev.id, t, 'grow', { eta: retry - st.tick + 2, note: `这场戏里的对决输过，${retry - st.tick} 月后重来（要打得赢）` }); return el ? D(ev.id, t, L.busy(st) ? 'wait' : 'act', { eta: 12, note: '节拍已到，下个月补进队列' }) : D(ev.id, t, 'none', { note: '节拍已到、需要的标志位也齐了，L.eligible 仍为假（有探测器不认识的条件）' }); }
    const w = worst(sub); return D(ev.id, t, w.how, { eta: w.eta, realm: w.realm, note: (w.t || '') + '：' + (w.note || ''), sub });
  }
  const w = worst(sub.concat([trig]));
  return D(ev.id, t, w.how, { eta: w.eta, realm: w.realm, note: (w.t || '') + (w.note ? '：' + w.note : ''), sub: sub.concat([trig]) });
}
const fxFlags = fx => (fx ? [].concat(fx.flag || []) : []);
let srcCache = null, srcN = -1;
function flagSources(f) {
  const evs = L.events();
  if (!srcCache || srcN !== evs.length) { srcCache = {}; srcN = evs.length; }
  if (!srcCache[f]) srcCache[f] = evs.filter(e => (e.choices || []).some(c => ['ok', 'fail'].some(r => c[r] && fxFlags(c[r].fx).includes(f))));
  return srcCache[f];
}
// 这几个标志位里任意一个置上就算
function flagDep(st, flags, label, depth) {
  const k = flags.join('|');
  if (flags.some(f => E(st)[f])) return D(k, label, 'done');
  const src = [];
  for (const f of flags) for (const ev of flagSources(f)) {
    if (ev.where !== 'story') { src.push(D(ev.id, '事件 ' + ev.id, 'wait', { eta: MAXWAIT.wait, note: '随机事件（' + ev.where + '），没有期限' , soft: true })); continue; }
    src.push(evDep(st, ev, c => ['ok', 'fail'].some(r => c[r] && fxFlags(c[r].fx).includes(f)) && L.choiceShown(st, c), depth || 0));
  }
  const b = best(src);
  return D(k, label, b.how, { eta: b.eta, realm: b.realm, note: (b.t ? b.t + '：' : '') + (b.note || ''), sub: src });
}
// ---------- 每章的依赖表（验收方独立写的） ----------
function mainDeps(st, ch) {
  const lone = isLone(st);
  switch (ch) {
    case 0: return st.pact < 0 ? [rivalDep(st, 'mu')] : st.pact > 0 ? [rivalDep(st, 'mu')] : [pactDep(st)];
    case 1: return lone ? [rankDep(st, 60), bossDep(st, 2)] : [srankDep(st, 1), rankDep(st, 60)];
    case 2: return lone ? [rivalDep(st, 'zhao'), bossDep(st, 3)] : [srankDep(st, 2), rivalDep(st, 'zhao')];
    case 3: return lone ? [rankDep(st, 20), bossDep(st, 4)] : [srankDep(st, 3)];
    case 4: return lone ? [rivalDep(st, 'chu'), bossDep(st, 5)] : [rivalDep(st, 'chu'), meetDep(st)];
    case 5: return [warDep(st)];
    case 6: return [flagDep(st, ['st_truth'], '得知真相', 0), flagDep(st, L.STORY_WAR, '了结正魔大战', 0)];
    case 7: return [flagDep(st, L.STORY_LU, '了断陆天衡', 0)];
    default: return [flagDep(st, L.STORY_ASC, '天门前作出选择', 0)];
  }
}
function probe(st) {
  const ch = chNow(st), lone = isLone(st);
  const fin = !!(st.quest && st.quest.done && st.quest.done.c8_m);
  if (fin) return { ch, lone, deps: [], dead: [], mainOk: true, fin: true };
  let deps; try { deps = mainDeps(st, ch); } catch (e) { deps = [D('err', '探测器出错', 'none', { note: e.message })]; }
  let mainOk = false; try { mainOk = !!L.CHAPTERS[ch].main.c(st); } catch (e) { mainOk = false; }
  const allDone = deps.every(d => d.how === 'done');
  return { ch, lone, deps, dead: deps.filter(d => d.how === 'none'), realm: deps.filter(d => d.realm), mainOk, mismatch: allDone !== mainOk ? (allDone ? '依赖表全满足，主线却没完成' : '主线完成了，依赖表还有没满足的') : '' };
}
// ---------- 目标卡 / 路径页 ----------
const GO_OK = { bt: 1, exp: 1, home: 1, gear: 1, arts: 1, pets: 1, bag: 1, world: 1, rivals: 1, sect: 1, market: 1, people: 1, path: 1, attr: 1, record: 1, big: 1, prep: 1, field: 1, furnace: 1, zhen: 1, realm: 1, cal: 1, train: 1, disc: 1, trib: 1, inbox: 1, cult: 1, me: 1, codex: 1 };
function goalCheck(st) {
  const bad = [];
  let g = null; try { g = L.goalNow(st); } catch (e) { return { ok: false, bad: ['L.goalNow 抛错：' + e.message] }; }
  if (!g) return { ok: false, bad: ['L.goalNow 为空'] };
  if (st.p.r > L.MAXR) return { ok: true, bad, g };
  if (!g.t) bad.push('目标卡没有目标文字');
  if (!g.prog || !g.prog.length) bad.push('目标卡没有进度条目');
  else if (!g.bar || !g.bar.text) bad.push('目标卡进度没有文字');
  const pr = g.prog && g.prog[0];
  const nx = g.next, go = nx && nx.go;
  if (!nx || !nx.t) bad.push('目标卡没有“下一步”');
  else if (!go || !(GO_OK[go] || /^(do|exp):/.test(go))) bad.push('目标卡【去】的跳转键无效：' + go);
  const P = probe(st), lag = pr && pr.k;
  // 落后的那一项现在只能等（入宗、来犯……）：进度文字得让人知道在等什么
  if (!st.sect && lag === 'sect') {
    const s = sectDep(st);
    if (s.how === 'none') bad.push(`进度写“${pr.text}”，可是入不了宗（${s.note}）`);
  }
  // 卡的是境界、目标卡却一个字没提
  for (const d of P.deps) if (d.realm && d.how === 'grow') {
    const txt = [(g.t || '')].concat((g.prog || []).map(x => x.text || '')).join(' ');
    if (!/(炼气|筑基|金丹|元婴|化神|炼虚|合体|大乘|渡劫|境界|突破|天劫|修到)/.test(txt)) bad.push(`卡在境界（${d.t}：${d.note}），目标卡文字“${txt}”没有提`);
  }
  for (const d of P.dead) bad.push(`死锁：${d.t}——${d.note}`);
  return { ok: !bad.length, bad, g, go, lag, P };
}
const fmtDep = d => `${d.t}[${d.how}${d.realm ? '·境界' : ''}${d.eta ? ' ≤' + d.eta + '月' : ''}]${d.note ? ' ' + d.note : ''}`;
return { probe, goalCheck, mainDeps, sectDep, srankDep, rivalDep, rankDep, bossDep, meetDep, warDep, flagDep, evDep, beatDep, pactDep, MAXWAIT, fmtDep, isLone };
});
