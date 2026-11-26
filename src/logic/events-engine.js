/* 废柴仙途 · 逻辑模块 events-engine：奇遇事件引擎与访客
 * 模块写法见 src/logic.js 顶部说明。事件能力登记（哪些写法引擎已经支持）见 core.js 的 L.CAPS。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 事件数据 ----------
// 浏览器：src/events.js 设 window.EVENTS，src/content/*.js 再 push 进去（tools/build.py 按顺序内联）。
// node：require src/events.js 与 L.CONTENT_FILES 里的扩展包，拼成一份。
L.CONTENT_FILES = ['ev_realm_rivals', 'ev_sect_people', 'ev_world_chains', 'ev_karma', 'ev_rivals2', 'ev_chains2', 'ev_people2', 'ev_story', 'ev_story_bond', 'ev_story_people', 'ev_story_rivals', 'endings', 'cine_data'];
let nodeEvents = null;
L.events = function () {
  if (globalThis.EVENTS) return globalThis.EVENTS;
  if (nodeEvents) return nodeEvents;
  if (typeof require !== 'function') return [];
  const out = [];
  try { out.push(...require('../events.js')); } catch (err) { /* 没有事件文件 */ }
  for (const f of L.CONTENT_FILES) { try { out.push(...require('../content/' + f + '.js')); } catch (err) { /* 扩展包缺失时跳过 */ } }
  nodeEvents = out;
  return out;
};
L.fill = function (st, text) {
  const sc = L.sectOf(st);
  return String(text || '').replace(/\{su\}/g, L.npcName(st, 'su')).replace(/\{ye\}/g, L.npcName(st, 'ye')).replace(/\{ex\}/g, st.exName)
    .replace(/\{sect\}/g, sc ? sc.n : '宗门').replace(/\{name\}/g, st.p.name);
};
function flagOn(st, f) { return !!(st.eflags && st.eflags[f]); }

// ---------- 能力闸门：事件用到的写法全部登记过才放行 ----------
// 结构字段（任何事件都有、引擎本来就认）不算能力
const EV_BASE = ['id', 'where', 'title', 'text', 'choices', 'speaker', 'weight', 'once', 'visit', 'trigger'];
const CH_BASE = ['t', 'cost', 'p', 'duel', 'ok', 'fail'];
const triggerOk = t => { const C = L.CAPS.trigger; if (C[t]) return true; const i = t.indexOf(':'); return i > 0 && !!C[t.slice(0, i + 1)]; };
const triggerKey = t => { const i = t.indexOf(':'); return i > 0 ? t.slice(0, i + 1) + '*' : t; };
// 登记时可带 where: ['realm']：只对这些 where 的事件算支持（realm.js 给秘境事件先收着别的系统的键，别处的事件仍闸着）
const scoped = (c, ev) => !!c.where && !c.where.includes(ev.where);
// 返回这条事件缺的能力（空数组 = 可以上线），形如 'fx.grudge'、'elig.favorMin'、'trigger.rookie:*'、'fx.item=need'
function gate(ev) {
  const C = L.CAPS, miss = new Set();
  if (!C.where[ev.where]) miss.add('where.' + ev.where);
  if (ev.trigger !== undefined && !triggerOk(ev.trigger)) miss.add('trigger.' + triggerKey(ev.trigger));
  for (const k of Object.keys(ev)) {
    if (EV_BASE.includes(k)) continue;
    const c = C.elig[k];
    if (!c || scoped(c, ev)) miss.add('elig.' + k); else if (c.ok && !c.ok(ev[k], ev)) miss.add('elig.' + k + '=' + ev[k]);
  }
  for (const ch of ev.choices || []) {
    for (const k of Object.keys(ch)) {
      if (CH_BASE.includes(k)) continue;
      if (!C.choice[k]) miss.add('choice.' + k);
    }
    for (const k of Object.keys(ch.cost || {})) if (!C.cost[k] || scoped(C.cost[k], ev)) miss.add('cost.' + k);
    for (const b of ['ok', 'fail']) {
      const fx = ch[b] && ch[b].fx;
      if (!fx) continue;
      for (const k of Object.keys(fx)) {
        const c = C.fx[k];
        if (!c || scoped(c, ev)) miss.add('fx.' + k);
        else if (c.ok && !c.ok(fx[k], fx)) miss.add('fx.' + k + '=' + (typeof fx[k] === 'object' ? JSON.stringify(fx[k]).slice(0, 24) : fx[k]));
      }
    }
  }
  return [...miss];
}
const gateCache = new WeakMap();
L.evGate = function (ev) {
  const c = gateCache.get(ev);
  if (c && c.ver === L.CAPS.ver) return c.miss;
  const miss = gate(ev);
  gateCache.set(ev, { ver: L.CAPS.ver, miss });
  return miss;
};
L.evLive = ev => !L.evGate(ev).length;

// ---------- 引擎本来就支持的写法 ----------
for (const w of ['home', 'exp', 'story']) L.supportWhere(w);
for (const t of ['realm:', 'sect', 'pet', 'daolv', 'rank:', 'npc:', 'boss:']) L.supportTrigger(t);
// 本模块新接的剧情触发键：首次击败宿敌、晋升身份、约战前夜、第一次渡雷劫
for (const t of ['beat:', 'srank:', 'pact_eve', 'trib:']) L.supportTrigger(t);
for (const k of ['minR', 'maxR', 'need', 'not', 'npc', 'aff', 'sect', 'daolv', 'bg']) L.supportElig(k);
// 新资格字段：冷却（默认 40 月）、宗门身份下限、天骄榜名次上限、奇遇链（完成第 n 步自动置「链短名_n」）
L.supportElig('cooldown', { ok: v => v > 0 });
L.supportElig('srankMin', { ok: v => v >= 0 && v < 7 });
L.supportElig('rankMax', { ok: v => v >= 1 });
L.supportElig('chain'); L.supportElig('step');
// 选项级：need / not / srankMin 不满足时该选项不显示；dao 记一笔道心（SYSTEMS §14 的道心系统上线前只记数，st.dao）
L.supportChoice('need'); L.supportChoice('not'); L.supportChoice('srankMin');
L.supportChoice('dao', { apply: (st, v) => { if (!['k', 'w', 'r'].includes(v)) return; st.dao = st.dao || { k: 0, w: 0, r: 0 }; st.dao[v] = (st.dao[v] || 0) + 1; } });
for (const k of ['stones', 'pills', 'herbs']) L.supportCost(k);
// 内建的 fx（L.applyFx 里直接结算）。已被前面的模块登记过的（arts / gear / calendar / market 给 flag 接的一次性钩子）不要覆盖
for (const k of ['xp', 'stones', 'pills', 'herbs', 'treasure', 'life', 'inj', 'itemUp', 'aff', 'flag', 'unflag', 'buff', 'cul', 'power', 'vein', 'contrib', 'talent', 'trait', 'title', 'daolv']) if (!L.CAPS.fx[k]) L.supportFx(k);
// item：a 功法（按阶抽一门具体的，见 arts.js）/ pet 灵宠 / 法宝 w 兵器 · r 法衣 · o 饰品 · need 最弱的一槽（gear.js：空槽直接装上，否则走对比卡）
L.supportFx('item', { ok: v => ['w', 'a', 'pet', 'need', 'r', 'o'].includes(v) });
L.supportFx('buff', { ok: v => !!v && (v.cul > 0 || v.atk > 0) });

// ---------- 资格 ----------
L.EV_COOL = 40;   // 随机事件默认冷却（月），事件可用 cooldown 覆盖
L.eligible = function (st, ev, where, ctx) {
  ctx = ctx || {};
  if (ev.where !== where) return false;
  if (!L.evLive(ev)) return false;
  const r = st.p.r;
  // story（剧情触发键）与 market（坊市里的时机：market:restock / market:buy / auction:*）都按 trigger 对上才出
  if (where === 'story' || where === 'market') { if (ev.trigger !== ctx.trigger) return false; if (where === 'story' && st.evDone[ev.id]) return false; }
  if (ev.once && st.evDone[ev.id]) return false;
  if (ev.minR !== undefined && r < ev.minR) return false;
  if (ev.maxR !== undefined && r > ev.maxR) return false;
  if (ev.need && !ev.need.every(f => flagOn(st, f))) return false;
  if (ev.not && ev.not.some(f => flagOn(st, f))) return false;
  if (ev.npc && ev.aff) { const a = L.aff(st, ev.npc); if (a < ev.aff[0] || a > ev.aff[1]) return false; }
  if (ev.sect === true && !st.sect) return false;
  if (ev.sect === false && st.sect) return false;
  if (ev.srankMin !== undefined && !(st.sect && st.sect.rank >= ev.srankMin)) return false;
  if (ev.rankMax !== undefined && st.rank > ev.rankMax) return false;
  if (ev.daolv === true && !st.daolv) return false;
  if (ev.daolv === false && st.daolv) return false;
  if (where === 'exp' && ev.bg && ctx.bg && !ev.bg.includes(ctx.bg)) return false;
  // 各系统登记的资格字段的判定（calendar.js 的 season / world …：L.supportElig(key, { test(st, v, ev) })）
  for (const k in ev) { const c = L.CAPS.elig[k]; if (c && c.test && !c.test(st, ev[k], ev, where, ctx)) return false; }
  if (where !== 'story' && st.evLast[ev.id] !== undefined && st.tick - st.evLast[ev.id] < (ev.cooldown || L.EV_COOL)) return false;
  // 一个选项都付不起的奇遇不要弹出来（否则玩家只能干看着）
  if (where !== 'story' && !ev.choices.some(c => L.choiceShown(st, c) && L.costOk(st, c.cost))) return false;
  if (where === 'home' && ctx.visit && !ev.visit) return false;
  return true;
};
// 选项是否显示（need / not / srankMin）
L.choiceShown = function (st, c) {
  if (!c) return false;
  if (c.need && !c.need.every(f => flagOn(st, f))) return false;
  if (c.not && c.not.some(f => flagOn(st, f))) return false;
  if (c.srankMin !== undefined && !(st.sect && st.sect.rank >= c.srankMin)) return false;
  return true;
};
L.pickEvent = function (st, where, ctx) {
  const list = L.events().filter(ev => L.eligible(st, ev, where, ctx));
  if (!list.length) return null;
  // 尚未出现过的事件优先
  const fresh = list.filter(ev => st.evLast[ev.id] === undefined);
  const pool = fresh.length && R() < 0.75 ? fresh : list;
  return wpick(pool.map(ev => [ev, (ev.weight || 1) * (ev.npc ? 2.5 : 1)]));
};
L.fireTrigger = function (st, key) {
  for (const ev of L.events()) if (ev.where === 'story' && ev.trigger === key && !st.evDone[ev.id] && !st.storyQ.includes(ev.id) && L.eligible(st, ev, 'story', { trigger: key })) st.storyQ.push(ev.id);
};
L.eventById = id => L.events().find(e => e.id === id);
L.herbScale = st => 1 + st.p.r;
L.costOk = function (st, cost) {
  if (!cost) return true;
  if (cost.stones && st.stones < cost.stones * Math.max(L.income(st), 20)) return false;
  if (cost.pills && st.pills < cost.pills) return false;
  if (cost.herbs && st.herbs < cost.herbs * L.herbScale(st)) return false;
  for (const k in cost) { const c = L.CAPS.cost[k]; if (c && c.ok && !c.ok(st, cost[k])) return false; }
  return true;
};
L.costText = function (st, cost) {
  const a = [];
  if (cost.stones) a.push('灵石 ' + L.fmt(cost.stones * Math.max(L.income(st), 20)));
  if (cost.pills) a.push('破境丹 ' + cost.pills);
  if (cost.herbs) a.push('灵草 ' + L.fmt(cost.herbs * L.herbScale(st)));
  for (const k in cost) { const c = L.CAPS.cost[k]; if (c && c.text) a.push(c.text(st, cost[k])); }
  return a.join('、');
};
// 事件里的 xp: N 表示 N × L.EV_XP 个月的修为（打坐速度，不计闭关、历练的状态）。
// 0.3：途中遭遇（每趟 60%）和访客（每月 10%）加起来很密，按 1 算时奇遇占了勤快玩家三成修为（tools/sim.js 校准）
L.EV_XP = 0.3;
L.applyFx = function (st, fx, ctx) {
  const out = [];
  if (!fx) return out;
  const p = st.p, f = L.fmt;
  if (fx.xp) { const g = L.gainCalm(st) * fx.xp * L.EV_XP; L.addXp(st, g); out.push('修为 +' + f(g)); }
  if (fx.stones) { const v = Math.round(fx.stones * Math.max(L.income(st), 20)); st.stones = Math.max(0, st.stones + v); out.push('灵石 ' + (v >= 0 ? '+' : '') + f(v)); }
  if (fx.pills) { st.pills = Math.max(0, st.pills + fx.pills); out.push('破境丹 ' + (fx.pills > 0 ? '+' : '') + fx.pills); }
  if (fx.herbs) { const v = Math.round(fx.herbs * L.herbScale(st)); st.herbs = Math.max(0, st.herbs + v); out.push('灵草 ' + (v > 0 ? '+' : '') + f(v)); }
  if (fx.treasure) { st.treasure = Math.max(0, st.treasure + fx.treasure); out.push('天材地宝 ' + (fx.treasure > 0 ? '+' : '') + fx.treasure); }
  if (fx.life && p.r <= L.MAXR) { const v = Math.round(L.REALMS[p.r].life * fx.life / 100); st.lifeBonus += v; out.push('寿元 ' + (v >= 0 ? '+' : '') + f(v) + ' 年'); }
  if (fx.inj) { p.inj = Math.max(p.inj, fx.inj); out.push('负伤 ' + fx.inj + ' 月'); }
  if (fx.item) {
    const kind = fx.item, up = fx.itemUp || 0;
    const base = kind === 'a' || kind === 'pet' ? 1 + Math.floor(p.r * 0.6) : 1 + Math.floor(p.r * 0.75);
    const it = L.giveItem(st, kind, base + up, undefined, { src: 'event' });
    out.push(L.itemText(st, it));
    if (it.kind === 'a') (out.artTexts = out.artTexts || []).push(out[out.length - 1]);
    if (it.gear) (out.gearTexts = out.gearTexts || []).push(out[out.length - 1]);
    (out.items = out.items || []).push(it);
    out.item = it;
  }
  if (fx.aff) for (const id in fx.aff) { const d = L.addAff(st, id, fx.aff[id]); if (d) out.push(`好感 ${L.npcName(st, id)} ${d > 0 ? '+' : ''}${d}`); }
  if (fx.flag) for (const fl of [].concat(fx.flag)) st.eflags[fl] = 1;
  if (fx.unflag) for (const fl of [].concat(fx.unflag)) delete st.eflags[fl];
  if (fx.buff) { st.buffs.push({ cul: fx.buff.cul, atk: fx.buff.atk, left: fx.buff.ticks || 6 }); out.push(fx.buff.cul ? `修炼速度 ×${fx.buff.cul}（${fx.buff.ticks || 6} 月）` : `战力 ×${fx.buff.atk}（${fx.buff.ticks || 6} 月）`); }
  if (fx.cul) { st.bonus.cul += fx.cul; out.push(`永久修炼速度 +${Math.round(fx.cul * 100)}%`); }
  if (fx.power) { st.bonus.atk += fx.power; out.push(`永久战力 +${Math.round(fx.power * 100)}%`); }
  if (fx.vein && st.sect) { st.sect.veins = (st.sect.veins || 0) + fx.vein; out.push(`宗门灵脉 +${fx.vein}（俸禄 +${fx.vein * 25}%）`); }
  if (fx.contrib && st.sect) {
    const v = L.contribFor(Math.min(10, p.r + 1)) * fx.contrib;
    // 负数：从可用贡献里扣（累计贡献是晋升门槛，不倒退）
    if (v >= 0) { st.sect.total += v; st.sect.pts += v; out.push('宗门贡献 +' + f(v)); }
    else { const d = Math.min(st.sect.pts, -v); st.sect.pts -= d; out.push('宗门贡献 −' + f(d)); }
  }
  if (fx.talent && p.t < 6) { const from = p.t; p.t = Math.min(6, p.t + fx.talent); out.push(`灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`); out.talent = true; }
  if (fx.trait && L.TRAITS[fx.trait] && !p.tr.includes(fx.trait)) { p.tr.push(fx.trait); out.push('获得天赋【' + L.TRAITS[fx.trait].n + '】'); }
  if (fx.title) { L.grantTitle(st, fx.title); out.push('获得称号「' + fx.title + '」'); }
  if (fx.daolv && !st.daolv && (!L.daolvBlocked || !L.daolvBlocked(st))) { st.daolv = fx.daolv; st.eflags['daolv_' + fx.daolv] = 1; out.push(`与${L.npcName(st, fx.daolv)}结为道侣：双修，修炼速度 ×1.25`); L.log(st, `与${L.npcName(st, fx.daolv)}结为道侣`, 'gold'); L.fireTrigger(st, 'daolv'); }
  // 各系统登记的 fx（arts.js 的 art / mastery …）
  for (const k in fx) { const c = L.CAPS.fx[k]; if (c && c.apply) c.apply(st, fx[k], out, fx, ctx); }
  return out;
};
// 奇遇把握：气运之子、主角光环、白小九知己、气运饰品（+1%×阶，gear.js）
L.choiceLuck = st => (L.has(st, 'lucky') ? 0.1 : 0) + (L.has(st, 'hero') ? 0.05 : 0) + (L.friend(st, 'bai') ? 0.05 : 0) + L.gearLuck(st);
L.resolveChoice = function (st, ev, idx) {
  const ch = ev.choices[idx];
  if (!ch || !L.choiceShown(st, ch) || !L.costOk(st, ch.cost)) return null;
  if (ch.cost) {
    L.applyFx(st, { stones: -(ch.cost.stones || 0), pills: -(ch.cost.pills || 0), herbs: -(ch.cost.herbs || 0) });
    for (const k in ch.cost) { const c = L.CAPS.cost[k]; if (c && c.pay) c.pay(st, ch.cost[k]); }
  }
  let ok = true, duel = null;
  if (ch.duel) {
    // choice.foe：对手是某位宿敌或正在追你的新秀（五行克制、他的法宝都算上，rivals2.js 的 L.choiceFoe）
    const cf = L.choiceFoe ? L.choiceFoe(st, ev, ch) : null;
    const foe = cf ? cf.foe : { kind: 'event', id: ev.id }; const S = L.duelPower(st, foe), Q = cf ? cf.Q : L.power(st) * ch.duel; const p = L.duelP(st, S, Q, foe); ok = L.duelWin(st, S, Q, foe, p); duel = { S, Q, p, win: ok, foe: cf ? cf.foe : null, n: cf ? cf.n : '' };
    if (cf && L.revealFoe) L.revealFoe(st, cf.foe);
  }
  else if (ch.p !== undefined) ok = R() < Math.min(0.95, ch.p + L.choiceLuck(st));
  const br = ok ? ch.ok : (ch.fail || ch.ok);
  if (ev.npc) { st.npc = st.npc || {}; if (!st.npc[ev.npc]) st.npc[ev.npc] = { aff: 0 }; }
  st.evLast[ev.id] = st.tick;
  if (ev.once || ev.where === 'story') st.evDone[ev.id] = 1;
  st.stats.events++;
  // 选项级字段（dao 记道心…）
  for (const k in ch) { const c = L.CAPS.choice[k]; if (c && c.apply) c.apply(st, ch[k], ev, ch); }
  // 奇遇链：完成第 n 步，置「链短名_n」（ch_tea 第 2 步 → tea_2），下一步的 need 用它
  if (ev.chain && ev.step) st.eflags[String(ev.chain).replace(/^ch_/, '') + '_' + ev.step] = 1;
  // 访客：见过就算数；途中遭遇：成了本趟分数 +5，砸了 −5
  if (st.visitor && st.visitor.id === ev.id) { st.visitor = null; st.stats.visits = (st.stats.visits || 0) + 1; }
  if (ev.where === 'market' && L.marketEventDone) L.marketEventDone(st, ev.id);
  if (st.exp && st.exp.plan && st.exp.encEv === ev.id && !st.exp.encDone) { st.exp.encDone = 1; st.exp.plan.adj = (st.exp.plan.adj || 0) + (ok ? 5 : -5); }
  const fx = L.applyFx(st, br && br.fx, { ev });
  const text = L.fill(st, br ? br.text : '');
  L.log(st, `【${L.fill(st, ev.title)}】${text}`.slice(0, 60), ok ? 'jade' : 'red');
  L.checkQuests(st);
  return { ok, duel, text, fx, hasRisk: ch.p !== undefined || !!ch.duel };
};

// ---------- 访客（洞府奇遇） ----------
// 每月 10% 概率来一位，停留 6 月，同时最多一位；过期按不花钱的选项自动结算
L.VISIT = { p: 0.10, stay: 6 };
L.spawnVisitor = function (st) {
  if (st.visitor) return null;
  const ev = L.pickEvent(st, 'home', { visit: true });
  if (!ev) return null;
  st.visitor = { id: ev.id, left: L.VISIT.stay };
  return ev;
};
L.visitorEvent = st => (st.visitor ? L.eventById(st.visitor.id) : null);
L.visitorLeave = visitorLeave;
function visitorLeave(st) {
  const ev = L.visitorEvent(st);
  st.visitor = null;
  if (!ev) return null;
  const shown = i => L.choiceShown(st, ev.choices[i]);
  let idx = ev.choices.findIndex((c, i) => shown(i) && !c.cost && c.p === undefined && !c.duel);
  if (idx < 0) idx = ev.choices.findIndex((c, i) => shown(i) && !c.cost);
  if (idx < 0) return null;
  const visits = st.stats.visits;
  st.visitor = { id: ev.id, left: 0 };
  const res = L.resolveChoice(st, ev, idx);
  st.visitor = null; st.stats.visits = visits;   // 没见着，不算“见过访客”
  if (res) L.log(st, `访客久候不至，自行离去（${L.fill(st, ev.title)}）`);
  return { ev, res };
}
});
