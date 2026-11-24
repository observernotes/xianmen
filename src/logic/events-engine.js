/* 废柴仙途 · 逻辑模块 events-engine：奇遇事件引擎与访客
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// ---------- 事件引擎（数据见 events.js） ----------
L.events = () => (globalThis.EVENTS || (typeof require === 'function' ? (() => { try { return require('../events.js'); } catch (err) { return []; } })() : []));
L.fill = function (st, text) {
  const sc = L.sectOf(st);
  return String(text || '').replace(/\{su\}/g, L.npcName(st, 'su')).replace(/\{ye\}/g, L.npcName(st, 'ye')).replace(/\{ex\}/g, st.exName)
    .replace(/\{sect\}/g, sc ? sc.n : '宗门').replace(/\{name\}/g, st.p.name);
};
function flagOn(st, f) { return !!(st.eflags && st.eflags[f]); }
L.eligible = function (st, ev, where, ctx) {
  ctx = ctx || {};
  if (ev.where !== where) return false;
  const r = st.p.r;
  if (where === 'story') { if (ev.trigger !== ctx.trigger) return false; if (st.evDone[ev.id]) return false; }
  if (ev.once && st.evDone[ev.id]) return false;
  if (ev.minR !== undefined && r < ev.minR) return false;
  if (ev.maxR !== undefined && r > ev.maxR) return false;
  if (ev.need && !ev.need.every(f => flagOn(st, f))) return false;
  if (ev.not && ev.not.some(f => flagOn(st, f))) return false;
  if (ev.npc && ev.aff) { const a = L.aff(st, ev.npc); if (a < ev.aff[0] || a > ev.aff[1]) return false; }
  if (ev.sect === true && !st.sect) return false;
  if (ev.sect === false && st.sect) return false;
  if (ev.daolv === true && !st.daolv) return false;
  if (ev.daolv === false && st.daolv) return false;
  if (where === 'exp' && ev.bg && ctx.bg && !ev.bg.includes(ctx.bg)) return false;
  if (where !== 'story' && st.evLast[ev.id] !== undefined && st.tick - st.evLast[ev.id] < 40) return false;
  // 一个选项都付不起的奇遇不要弹出来（否则玩家只能干看着）
  if (where !== 'story' && !ev.choices.some(c => L.costOk(st, c.cost))) return false;
  if (where === 'home' && ctx.visit && !ev.visit) return false;
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
  return true;
};
L.costText = function (st, cost) {
  const a = [];
  if (cost.stones) a.push('灵石 ' + L.fmt(cost.stones * Math.max(L.income(st), 20)));
  if (cost.pills) a.push('破境丹 ' + cost.pills);
  if (cost.herbs) a.push('灵草 ' + L.fmt(cost.herbs * L.herbScale(st)));
  return a.join('、');
};
L.applyFx = function (st, fx) {
  const out = [];
  if (!fx) return out;
  const p = st.p, f = L.fmt;
  if (fx.xp) { const g = L.gain(st) * fx.xp; L.addXp(st, g); out.push('修为 +' + f(g)); }
  if (fx.stones) { const v = Math.round(fx.stones * Math.max(L.income(st), 20)); st.stones = Math.max(0, st.stones + v); out.push('灵石 ' + (v >= 0 ? '+' : '') + f(v)); }
  if (fx.pills) { st.pills = Math.max(0, st.pills + fx.pills); out.push('破境丹 ' + (fx.pills > 0 ? '+' : '') + fx.pills); }
  if (fx.herbs) { const v = Math.round(fx.herbs * L.herbScale(st)); st.herbs = Math.max(0, st.herbs + v); out.push('灵草 ' + (v > 0 ? '+' : '') + f(v)); }
  if (fx.treasure) { st.treasure = Math.max(0, st.treasure + fx.treasure); out.push('天材地宝 ' + (fx.treasure > 0 ? '+' : '') + fx.treasure); }
  if (fx.life && p.r <= L.MAXR) { const v = Math.round(L.REALMS[p.r].life * fx.life / 100); st.lifeBonus += v; out.push('寿元 ' + (v >= 0 ? '+' : '') + f(v) + ' 年'); }
  if (fx.inj) { p.inj = Math.max(p.inj, fx.inj); out.push('负伤 ' + fx.inj + ' 周天'); }
  if (fx.item) {
    const kind = fx.item, up = fx.itemUp || 0;
    const base = kind === 'w' ? 1 + Math.floor(p.r * 0.75) : kind === 'a' ? 1 + Math.floor(p.r * 0.6) : 1 + Math.floor(p.r * 0.6);
    const it = L.giveItem(st, kind, base + up);
    const tn = kind === 'w' ? L.WEAPONS[it.tier].n : kind === 'a' ? L.ARTS[it.tier].n : L.PETS[it.tier].n;
    out.push((it.equip ? '获得' : '得到（已有更好的，换成灵石）') + tn + (kind === 'a' ? '《' + it.name + '》' : '【' + it.name + '】'));
    out.item = it;
  }
  if (fx.aff) for (const id in fx.aff) { const d = L.addAff(st, id, fx.aff[id]); if (d) out.push(`好感 ${L.npcName(st, id)} ${d > 0 ? '+' : ''}${d}`); }
  if (fx.flag) for (const fl of [].concat(fx.flag)) st.eflags[fl] = 1;
  if (fx.unflag) for (const fl of [].concat(fx.unflag)) delete st.eflags[fl];
  if (fx.buff) { st.buffs.push({ cul: fx.buff.cul, atk: fx.buff.atk, left: fx.buff.ticks || 6 }); out.push(fx.buff.cul ? `修炼速度 ×${fx.buff.cul}（${fx.buff.ticks || 6} 周天）` : `战力 ×${fx.buff.atk}（${fx.buff.ticks || 6} 周天）`); }
  if (fx.cul) { st.bonus.cul += fx.cul; out.push(`永久修炼速度 +${Math.round(fx.cul * 100)}%`); }
  if (fx.power) { st.bonus.atk += fx.power; out.push(`永久战力 +${Math.round(fx.power * 100)}%`); }
  if (fx.vein && st.sect) { st.sect.veins = (st.sect.veins || 0) + fx.vein; out.push(`宗门灵脉 +${fx.vein}（俸禄 +${fx.vein * 25}%）`); }
  if (fx.contrib && st.sect) { const v = L.contribFor(Math.min(10, p.r + 1)) * fx.contrib; st.sect.total += v; st.sect.pts += v; out.push('宗门贡献 +' + f(v)); }
  if (fx.talent && p.t < 6) { const from = p.t; p.t = Math.min(6, p.t + fx.talent); out.push(`灵根 ${L.talentInfo(st, from).n} → ${L.talentInfo(st, p.t).n}`); out.talent = true; }
  if (fx.trait && L.TRAITS[fx.trait] && !p.tr.includes(fx.trait)) { p.tr.push(fx.trait); out.push('获得天赋【' + L.TRAITS[fx.trait].n + '】'); }
  if (fx.title) { L.grantTitle(st, fx.title); out.push('获得称号「' + fx.title + '」'); }
  if (fx.daolv && !st.daolv) { st.daolv = fx.daolv; out.push(`与${L.npcName(st, fx.daolv)}结为道侣：双修，修炼速度 ×1.25`); L.log(st, `与${L.npcName(st, fx.daolv)}结为道侣`, 'gold'); L.fireTrigger(st, 'daolv'); }
  return out;
};
L.choiceLuck = st => (L.has(st, 'lucky') ? 0.1 : 0) + (L.has(st, 'hero') ? 0.05 : 0) + (L.friend(st, 'bai') ? 0.05 : 0);
L.resolveChoice = function (st, ev, idx) {
  const ch = ev.choices[idx];
  if (!ch || !L.costOk(st, ch.cost)) return null;
  if (ch.cost) L.applyFx(st, { stones: -(ch.cost.stones || 0), pills: -(ch.cost.pills || 0), herbs: -(ch.cost.herbs || 0) });
  let ok = true, duel = null;
  if (ch.duel) { const S = L.power(st), Q = S * ch.duel; const p = L.duelChance(S, Q); ok = R() < p; duel = { S, Q, p, win: ok }; }
  else if (ch.p !== undefined) ok = R() < Math.min(0.95, ch.p + L.choiceLuck(st));
  const br = ok ? ch.ok : (ch.fail || ch.ok);
  if (ev.npc) { st.npc = st.npc || {}; if (!st.npc[ev.npc]) st.npc[ev.npc] = { aff: 0 }; }
  st.evLast[ev.id] = st.tick;
  if (ev.once || ev.where === 'story') st.evDone[ev.id] = 1;
  st.stats.events++;
  // 访客：见过就算数；途中遭遇：成了本趟分数 +5，砸了 −5
  if (st.visitor && st.visitor.id === ev.id) { st.visitor = null; st.stats.visits = (st.stats.visits || 0) + 1; }
  if (st.exp && st.exp.plan && st.exp.encEv === ev.id && !st.exp.encDone) { st.exp.encDone = 1; st.exp.plan.adj = (st.exp.plan.adj || 0) + (ok ? 5 : -5); }
  const fx = L.applyFx(st, br && br.fx);
  const text = L.fill(st, br ? br.text : '');
  L.log(st, `【${L.fill(st, ev.title)}】${text}`.slice(0, 60), ok ? 'jade' : 'red');
  L.checkQuests(st);
  return { ok, duel, text, fx, hasRisk: ch.p !== undefined || !!ch.duel };
};

// ---------- 访客（洞府奇遇） ----------
// 每周天 10% 概率来一位，停留 6 周天，同时最多一位；过期按不花钱的选项自动结算
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
  let idx = ev.choices.findIndex(c => !c.cost && c.p === undefined && !c.duel);
  if (idx < 0) idx = ev.choices.findIndex(c => !c.cost);
  if (idx < 0) return null;
  const visits = st.stats.visits;
  st.visitor = { id: ev.id, left: 0 };
  const res = L.resolveChoice(st, ev, idx);
  st.visitor = null; st.stats.visits = visits;   // 没见着，不算“见过访客”
  if (res) L.log(st, `访客久候不至，自行离去（${L.fill(st, ev.title)}）`);
  return { ev, res };
}
});
