/* 废柴仙途 · 逻辑模块 chains：奇遇链（SYSTEMS §15、CONTENT §12 / §14.6）
 * 模块写法见 src/logic.js 顶部说明。
 *
 * 链事件就是普通事件加 chain: '链id', step: n（events-engine 完成第 n 步自动置 flag「链短名_n」，下一步 need 它）。
 * 这里补“进度引擎”，保证链能走完、不会永远卡住：
 *   - L.chainProgress(st) 每条链做到第几步、下一步是哪件事、在哪儿触发（洞府来客 / 某张图的历练途中 / 踏入某境界）。
 *   - 催一下：链开了头（或出身自带的那条），下一步能出、而且距上一步已过 L.CHAIN_V.due 个月时，
 *     访客与途中遭遇有 L.CHAIN_V.p 的机会直接挑它（L.pickEvent 包一层）。第一世三年之约之前不催。
 *   - 境界上限放宽：链的第 n 步（n ≥ 2）在上一步做完以后不再看 maxR（中途升了境界不至于把链卡死）；第 1 步照旧。
 *   - 同一步只做一次：某一步的 flag 已经有了，这一步的其它版本（出身专属的第 1 步等）不再出。
 *   - 补放剧情步：剧情触发键 realm:N 只在踏入那一刻发一次，前一步做得晚就错过了——链的下一步是 realm:N 的剧情、而你已过了 N，就补进剧情队列。
 *   - 同一触发键的剧情要读前一段剧情刚置的 flag（story_r7 置 st_justice，tianheng_2 要它）：剧情事件结算完，把它的 realm:N 再发一次（只会补上新满足条件的）。
 *   - 终点：每条链走完记进 st.meta.chain（跨世），附带的“链成”奖励见 L.CHAINS[].fin（阵图、灵宠进化材料、天道试炼提示）；
 *     各步本来的 fx（功法、器方、九转秘方…）照旧。
 * 存档：st.chain = { at: { 链id: 上一步的月 } }（每世）；st.meta.chain = { 链id: { best 最多做到几步, done 走完几次 } }（跨世）。
 *   L.migrateChains 幂等，save.js 调一行。sim 对照：L.CHAINS_ON = false（node tools/sim.js all 200 nochains）链事件一概不出。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;

L.CHAINS = [
  { id: 'ch_map', n: '藏宝图残片', start: '历练途中，前人遗骨里的半张羊皮', fin: { d: '寻龙诀 + 一件高一阶的法宝' } },
  { id: 'ch_danjing', n: '丹经七页', start: '葛老好感 40 以上来访', fin: { d: '九转金丹秘方、丹火阵图' } },
  { id: 'ch_sword', n: '老祖的旧剑', start: '金丹后，戒指上的锈', fin: { d: '器方《玄霄》、《玄霄剑典·剑卷》' } },
  { id: 'ch_mo', n: '墨家遗书', start: '墨无痕好感 60 以上来访', fin: { d: '老祖的记忆（合体那夜多一段）、“潜渊”共鸣提示' } },
  { id: 'ch_fox', n: '狐族秘地', start: '白小九好感 80 以上来访', fin: { d: '九尾血脉、结局分支、养兽阵图', plan: 'f_yangshou' } },
  { id: 'ch_fire', n: '魔门圣火', start: '夜璃好感 60 以上来访（魔门出身开局就有）', fin: { d: '焚天诀、血遁；夜璃去留' } },
  { id: 'ch_tianjian', n: '天剑宗旧案', start: '击败楚天阔之后', fin: { d: '楚天阔入伙；陆天衡的了断多一种（公之于众）' } },
  { id: 'ch_sea', n: '东海借宝', start: '东海龙宫历练途中', fin: { d: '沧海无量或龙鳞宝衣器方；蛟皇鳞一片（灵宠进化）', mat: 7 } },
  { id: 'ch_star', n: '星墟仙人', start: '天外星墟历练途中', fin: { d: '鸿蒙残篇、星河剑器方；噬星核一颗（灵宠进化）', mat: 8 } },
  { id: 'ch_tea', n: '卖茶翁', start: '炼气期洞府来客（散修丹师出身必来）', fin: { d: '一件补最缺那一槽的法宝；天道试炼的提示（每条试炼道果 +5%）', trialHint: true } },
];
L.CHAIN = {}; for (const c of L.CHAINS) L.CHAIN[c.id] = c;
L.CHAIN_V = { due: 8, p: 0.55, originP: 0.8, originAt: 4 };
const short = id => String(id).replace(/^ch_/, '');
L.chainShort = short;
const on = () => L.CHAINS_ON !== false;

// ---------- 链的步骤（按事件库现算，缓存到事件数变化） ----------
let stepCache = null, stepN = -1;
function steps() {
  const evs = L.events();
  if (stepCache && stepN === evs.length) return stepCache;
  const m = {};
  for (const ev of evs) if (ev.chain && ev.step) { const s = m[ev.chain] || (m[ev.chain] = {}); (s[ev.step] = s[ev.step] || []).push(ev); }
  totals = {}; for (const id in m) totals[id] = Math.max(0, ...Object.keys(m[id]).map(Number));
  stepCache = m; stepN = evs.length;
  return m;
}
let totals = {};
L.chainSteps = id => steps()[id] || {};
L.chainTotal = id => { steps(); return totals[id] || 0; };
const flagOn = (st, f) => !!(st.eflags && st.eflags[f]);
L.chainStepOn = (st, id, n) => flagOn(st, short(id) + '_' + n);
// 连续做完的步数（第 1～k 步都有）；做过的步数（可能跳着，比如陆天衡那一步在剑冢前就到了）
L.chainDone = function (st, id) { let k = 0; const n = L.chainTotal(id); while (k < n && L.chainStepOn(st, id, k + 1)) k++; return k; };
L.chainGot = function (st, id) { let k = 0; const n = L.chainTotal(id); for (let i = 1; i <= n; i++) if (L.chainStepOn(st, id, i)) k++; return k; };
L.chainNextStep = function (st, id) { const n = L.chainTotal(id); for (let i = 1; i <= n; i++) if (!L.chainStepOn(st, id, i)) return i; return 0; };
const C = st => { const c = st.chain && typeof st.chain === 'object' ? st.chain : (st.chain = { at: {} }); if (!c.at || typeof c.at !== 'object') c.at = {}; return c; };
const metaC = st => { st.meta = st.meta || L.newMeta(); const m = st.meta.chain && typeof st.meta.chain === 'object' ? st.meta.chain : (st.meta.chain = {}); return m; };
L.chainMeta = (st, id) => { const m = metaC(st); return m[id] || { best: 0, done: 0 }; };
// 这一世出身自带的那条链（散修丹师 → 卖茶翁；samsara.js 的出身表）
L.originChain = st => { const O = L.ORIGINS && L.ORIGINS[st.origin || 'qitu']; return (O && O.chain) || ''; };
L.chainStarted = (st, id) => L.chainGot(st, id) > 0;

// ---------- 下一步在哪儿 ----------
const REALM_N = n => (L.REALMS[n] ? L.REALMS[n].n : '');
function whereText(st, ev) {
  if (!ev) return '';
  if (ev.where === 'story') { const m = /^realm:(\d)$/.exec(ev.trigger || ''); return m ? `踏入${REALM_N(+m[1])}期时` : '剧情里'; }
  if (ev.where === 'exp') {
    if (!ev.bg || !ev.bg.length) return '任意地图历练途中';
    const names = L.REGIONS.filter(r => ev.bg.includes(r.bg)).map(r => r.n);
    return names.join(' / ') + ' 历练途中';
  }
  if (ev.where === 'home') return '洞府来客';
  return '';
}
function condText(st, ev) {
  const out = [];
  if (ev.minR !== undefined && st.p.r < ev.minR) out.push(`${REALM_N(ev.minR)}期起`);
  if (ev.npc && ev.aff) { const a = L.aff(st, ev.npc); if (a < ev.aff[0]) out.push(`${L.npcName(st, ev.npc)}好感 ${a}/${ev.aff[0]}`); }
  for (const f of ev.need || []) {
    if (flagOn(st, f) || new RegExp('^' + short(ev.chain || '') + '_\\d$').test(f)) continue;
    if (f === 'chu_met') out.push('先认识楚狂');
    else if (f === 'beat_chu') out.push('先击败楚天阔');
    else if (/^st_/.test(f)) out.push('主线走到那一步');
    else if (/^(sword|tianjian|tea|map|danjing|mo|fox|fire|sea|star)_\d$/.test(f)) { const c = L.CHAINS.find(x => short(x.id) === f.replace(/_\d$/, '')); out.push(c ? `《${c.n}》第 ${f.slice(-1)} 步` : f); }
  }
  return out;
}
// 下一步的候选事件（同一步可能有几个版本，例如出身专属的第 1 步）
L.chainNextEvs = function (st, id) {
  const n = L.chainNextStep(st, id);
  return n ? (L.chainSteps(id)[n] || []).filter(ev => L.evLive(ev)) : [];
};
L.chainProgress = function (st) {
  return L.CHAINS.map(c => {
    const total = L.chainTotal(c.id), got = L.chainGot(st, c.id), done = L.chainDone(st, c.id), next = L.chainNextStep(st, c.id);
    const evs = next ? L.chainNextEvs(st, c.id) : [];
    const ev = evs.find(e => chainReady(st, e)) || evs[0] || null;
    const gated = next && !evs.length ? (L.chainSteps(c.id)[next] || []).map(e => L.evGate(e).join(',')).join(' / ') : '';
    const M = L.chainMeta(st, c.id);
    return { id: c.id, n: c.n, total, got, done, next, finished: total > 0 && got >= total, started: got > 0 || L.originChain(st) === c.id,
      ev, where: ev ? whereText(st, ev) : '', cond: ev ? condText(st, ev) : [], ready: !!ev && chainReady(st, ev), gated, start: c.start, fin: c.fin.d,
      at: C(st).at[c.id], best: M.best || 0, times: M.done || 0, title: ev ? L.fill(st, ev.title) : '' };
  });
};
L.chainHint = function (st, id) {
  const p = L.chainProgress(st).find(x => x.id === id); if (!p) return '';
  if (p.finished) return '已走完';
  if (p.gated) return '这一步还没有接上（' + p.gated + '）';
  if (!p.started) return '起点：' + p.start;
  return `下一步：${p.where}${p.cond.length ? '（' + p.cond.join('、') + '）' : ''}`;
};
// 剧情用的境界：境界与当前章取小的（story.js 的 L.storyR：realm:N 的剧情要章也到了 N 才放）
const sr = st => (L.storyR ? L.storyR(st) : st.p.r);
// 现在就能出（按它自己的 where，不看访客位、冷却以外的随机）
function chainReady(st, ev) {
  if (ev.where === 'story') { const m = /^realm:(\d)$/.exec(ev.trigger || ''); return !!m && sr(st) >= +m[1] && L.eligible(st, ev, 'story', { trigger: ev.trigger }); }
  return L.eligible(st, ev, ev.where, ev.where === 'home' ? { visit: !!ev.visit } : {});
}
// 下一步是历练途中、在哪张图（sim 与界面用：去那儿走一趟）；返回 [{ id, k, ev }]
L.chainMaps = function (st) {
  const out = [];
  if (!on()) return out;
  for (const c of L.CHAINS) {
    if (!(L.chainStarted(st, c.id) || L.originChain(st) === c.id)) continue;
    for (const ev of L.chainNextEvs(st, c.id)) {
      if (ev.where !== 'exp' || !L.eligible(st, ev, 'exp', {})) continue;
      L.REGIONS.forEach((r, k) => { if ((!ev.bg || ev.bg.includes(r.bg)) && L.regionOpen(st, k)) out.push({ id: c.id, k, ev }); });
    }
  }
  return out;
};

// ---------- 资格：放宽 maxR、同一步只做一次、关掉链 ----------
const relaxed = new Map();
const relax = ev => { let x = relaxed.get(ev); if (!x) { x = Object.assign({}, ev); delete x.maxR; relaxed.set(ev, x); } return x; };
{ const el0 = L.eligible; L.eligible = function (st, ev, where, ctx) {
  if (ev && ev.chain && ev.step) {
    if (!on() && /^ch_/.test(ev.id)) return false;
    if (L.chainStepOn(st, ev.chain, ev.step)) return false;
    if (ev.step > 1 && ev.maxR !== undefined && st.p.r > ev.maxR && L.chainStepOn(st, ev.chain, ev.step - 1)) return el0(st, relax(ev), where, ctx);
  }
  return el0(st, ev, where, ctx);
}; }

// ---------- 催一下：访客、途中遭遇优先挑“该来了”的那一步 ----------
L.chainDue = function (st, where, ctx) {
  if (!on() || (where !== 'home' && where !== 'exp')) return [];
  if (!st.rebirth && !st.pact) return [];   // 第一世三年之约之前不催（新手期，也不动约战的门槛）
  const c = C(st), out = [], oc = L.originChain(st);
  for (const ch of L.CHAINS) {
    const started = L.chainStarted(st, ch.id), mine = oc === ch.id;
    if (!started && !mine) continue;
    const last = c.at[ch.id] !== undefined ? c.at[ch.id] : started ? -99 : 0;
    const wait = started ? L.CHAIN_V.due : L.CHAIN_V.originAt;
    if (st.tick - last < wait) continue;
    for (const ev of L.chainNextEvs(st, ch.id)) if (ev.where === where && L.eligible(st, ev, where, ctx)) out.push({ ev, p: started ? L.CHAIN_V.p : L.CHAIN_V.originP });
  }
  return out;
};
{ const pe0 = L.pickEvent; L.pickEvent = function (st, where, ctx) {
  const due = L.chainDue(st, where, ctx || {});
  if (due.length) { const d = pick(due); if (R() < d.p) return d.ev; }
  return pe0(st, where, ctx);
}; }

// ---------- 结算：记进度、终点奖励、补放剧情步 ----------
function stepDone(st, ev) {
  const c = C(st), id = ev.chain;
  c.at[id] = st.tick;
  const m = metaC(st), rec = m[id] || (m[id] = { best: 0, done: 0 });
  const got = L.chainGot(st, id), total = L.chainTotal(id);
  if (got > (rec.best || 0)) rec.best = got;
  emit('chain', { id, step: ev.step, got, total });
  if (total && got >= total && !st.eflags['chain_' + short(id) + '_fin']) {
    st.eflags['chain_' + short(id) + '_fin'] = 1;
    rec.done = (rec.done || 0) + 1;
    const out = finReward(st, id);
    L.log(st, `【奇遇链】《${L.CHAIN[id] ? L.CHAIN[id].n : id}》走完了${out.length ? '：' + out.join('，') : ''}`, 'gold');
    emit('chainDone', { id, out });
    return out;
  }
  return null;
}
function finReward(st, id) {
  const F = (L.CHAIN[id] && L.CHAIN[id].fin) || {}, out = [];
  // 阵图走洞府线的 L.zhenGive（= L.givePlan，记进 st.gear.zhentu）；没有它时直接 L.givePlan
  if (F.plan) { const give = /^f_/.test(F.plan) && L.zhenGive ? L.zhenGive : L.givePlan; const t = give ? give(st, F.plan) : ''; if (t) out.push(t); }
  if (F.mat !== undefined && L.giveMat) { L.giveMat(st, F.mat, 1); out.push(`${L.BOSS_MAT[F.mat]} ×1（灵宠进化用）`); }
  if (F.trialHint) { st.meta.trialHint = 1; out.push('卖茶翁的提示：以后选的每条天道试炼道果 +5%'); }
  return out;
}
// 链的下一步是 realm:N 的剧情、你已经过了 N：补进剧情队列
L.chainCatchUp = function (st) {
  if (!on() || !st.storyQ) return 0;
  let n = 0;
  for (const c of L.CHAINS) {
    if (!L.chainStarted(st, c.id)) continue;
    for (const ev of L.chainNextEvs(st, c.id)) {
      if (ev.where !== 'story' || st.evDone[ev.id] || st.storyQ.includes(ev.id)) continue;
      const m = /^realm:(\d)$/.exec(ev.trigger || '');
      if (m && sr(st) >= +m[1] && L.eligible(st, ev, 'story', { trigger: ev.trigger })) { st.storyQ.push(ev.id); n++; }
    }
  }
  return n;
};
{ const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) {
  const res = rc0(st, ev, idx);
  if (!res || !ev) return res;
  if (ev.chain && ev.step) { const fin = stepDone(st, ev); if (fin && fin.length) res.fx.push(...fin.map(t => '链成：' + t)); }
  // 同一个 realm:N 的剧情读前一段刚置的 flag：结算完再发一次（只补新满足条件的，已出过的不会重复）
  if (ev.where === 'story' && /^realm:\d$/.test(ev.trigger || '')) L.fireTrigger(st, ev.trigger);
  L.chainCatchUp(st);
  return res;
}; }
{ const tk0 = L.tick; L.tick = function (st, cont) { const out = tk0(st, cont); if (st.tick % 3 === 0) L.chainCatchUp(st); return out; }; }

// ---------- 存档（幂等，不升版本） ----------
L.migrateChains = function (s) {
  C(s);
  const m = metaC(s);
  for (const id of Object.keys(m)) { const r = m[id]; if (!r || typeof r !== 'object' || !L.CHAIN[id]) { delete m[id]; continue; } r.best = Math.max(0, r.best | 0); r.done = Math.max(0, r.done | 0); }
  // 旧档里已经做过的步：补记 best（不补发终点奖励）
  for (const c of L.CHAINS) { const got = L.chainGot(s, c.id); if (got > 0) { const r = m[c.id] || (m[c.id] = { best: 0, done: 0 }); r.best = Math.max(r.best, got); if (got >= L.chainTotal(c.id) && !s.eflags['chain_' + short(c.id) + '_fin']) { s.eflags['chain_' + short(c.id) + '_fin'] = 1; r.done = Math.max(r.done, 1); } } }
};
{ const ns0 = L.newState; L.newState = function (o) { const st = ns0(o); st.chain = { at: {} }; return st; }; }
});
