/* 废柴仙途 · 逻辑模块 advise：变强建议（docs/KAIRO_PLAN.md §10.5 / §10.6）——目标卡“下一步”、老祖头像、变强页、备战卡、三年之约锦囊、S 系列气泡共用的一张排好序的动作表
 * 模块写法见 src/logic.js 顶部说明。排在最后（读 path / time / report 的接口；包 L.resolveExp 记下上一趟的评价）。
 *
 *   L.advise(st, focus) → { focus, tabs, head, acts, more, pool }
 *     focus：'goal'（默认）| 'atk' | 'cul' | 'inc' | 'bt'
 *     tabs：五个页签 [{ k, n, v, lock }]；head：{ icon, t, due, big, num, target, v, max, line, after, say, el, unit }
 *     acts：排好序的 ≤ 3 张动作卡（Act，字段见 §10.5）；pool：过了门槛的全部（S 气泡、测试用）；more：pool 里没显示的条数
 *   L.adviseDo(st, id) → { ok, done, why, res }：执行一张牌（当场能做的、以及闭关 / 历练这类“出门”的）；done = 动过存档（强化失败也算）
 *   L.adviseSeen(st)：记下 acts[0].id（老祖头像的“！”只在第一张换成新的一条、还没看过时亮）；L.adviseNew(st) 读它
 *   L.adviseKey(st)：缓存键（目标卡每 200 毫秒读一次，键不变就不重算）
 *
 * 只读状态：所有“做了以后”的数都用现成的试算（L.artTry / L.gearTry / 临时改一下再复原），算完原样放回，不消耗随机数。
 * 战斗线 / 刷宝线（docs/COMBAT_LOOT.md）的函数（L.gearInfuse / gearInfuseCost / gearInfuseWhy / coreN / gearEl、L.wishInfo / setWish / dropTable、L.bossAgain、L.CELL_FOES / FOES）一律 typeof 判了再用：没有就不出那张牌。
 * 存档：st.lastExp 上多记两个字段 r（上一趟评价）、t（哪个月回来的）；st.flags.advSeen。都不用迁移（没有就当没有）。
 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const fmt = v => L.fmt(v), f1 = v => L.fmt1(v);
const pc = p => Math.round(p * 100) + '%';
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n) : s; };
const CN = ['', '一', '两', '三'];
const has = f => typeof L[f] === 'function';
const nextN = st => (st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n);
const R = i => L.RATINGS[Math.max(0, Math.min(4, i))];
L.ADV = { pThr: 0.03, pwThr: 0.03, culThr: 0.05, saveThr: 1, incThr: 0.05, rateThr: 0.03, gradeThr: 4, tie: 0.2, line: 0.8 };

// ---------- 上一趟的评价（“卡住”的判定用） ----------
{ const re0 = L.resolveExp; L.resolveExp = function (st) {
  const r = re0.apply(this, arguments);
  if (r && typeof r.rating === 'number' && st.lastExp && !r.legacy) { st.lastExp.r = r.rating; st.lastExp.t = st.tick; }
  return r;
}; }

const btShown = st => { const n = Math.min(L.BT.maxPills, st.pills || 0); try { return L.tribNeeded(st) ? L.tribRate(st, { pills: n }) : L.btRate(st, n); } catch (e) { return 0; } };
L.btShown = btShown;
const needLeft = st => Math.max(0, L.pNeed(st.p) - st.p.xp);
const toStage = st => { try { return L.ticksToStage(st, L.si(st.p) + 1); } catch (e) { return Infinity; } };
// 临时改一下再复原
function withSet(obj, k, v, fn) { const had = Object.prototype.hasOwnProperty.call(obj, k), old = obj[k]; obj[k] = v; try { return fn(); } finally { if (had) obj[k] = old; else delete obj[k]; } }
function scalePw(m, fn) { const a0 = L.atkMult; L.atkMult = st => a0(st) * m; try { return fn(); } finally { L.atkMult = a0; } }

// ---------- 眼下的目标（goal 页签的头；§10.4 下表） ----------
function bigP(st, b) {
  if (b.k === 'pact') { const pi = L.pactInfo(st); return { m: s => L.pactInfo(s).p, foe: L.PACT_FOE, Q: pi.Q, scale: S => S * L.pactAssist(st), t: '赢下三年之约' }; }
  if (b.k === 'tour' && has('tourFoe')) { const f = L.tourFoe(st); if (!f) return null; return { m: s => L.duelP(s, L.duelPower(s, f.foe), f.Q, f.foe), foe: f.foe, Q: f.Q, scale: S => S, t: '论道 · ' + (L.rivalName ? L.rivalName(st, f.id) : f.rv.n) }; }
  if (b.k === 'war') { const foe = { kind: 'war', id: 'tianjian' }; let Q = 1; try { Q = L.warPower(); } catch (e) { return null; } return { m: s => L.duelP(s, L.duelPower(s, foe) * L.wardMult(s), Q, foe), foe, Q, scale: S => S * L.wardMult(st), t: '击退天剑宗' }; }
  return null;
}
function cellFoe(st, k, d) {
  const C = has('cellFoes') ? L.cellFoes(k, d) : L.CELL_FOES && L.CELL_FOES[k] && L.CELL_FOES[k][d], F = C && L.FOES && L.FOES[C.elite];
  return { n: F ? F.n : '', el: F && F.el ? F.el : L.REGIONS[k].el };
}
function goalOf(st) {
  const p = st.p;
  if (L.isReady(st)) {
    const r = btShown(st);
    return { kind: 'bt', icon: 'cult', t: '冲击' + nextN(st), due: '', big: '成功率 ' + pc(r), num: pc(r), target: '目标 80%', v: r, max: 1, line: L.ADV.line, m: btShown, unit: 'rate' };
  }
  const b = L.bigNext ? L.bigNext(st) : null;
  if (b && b.left <= 12) {
    const P = bigP(st, b);
    if (P) {
      const v = P.m(st);
      return { kind: 'big', k: b.k, icon: 'goal', t: P.t, due: `还有 ${b.left} 月`, hz: b.left, big: '胜算 ' + pc(v), num: pc(v), target: '目标 80%', v, max: 1, line: L.ADV.line, m: P.m, unit: 'p', foe: P.foe, Q: P.Q, fe: L.foeEl(P.foe), feKnown: !L.foeElKnown || L.foeElKnown(st, P.foe) };
    }
  }
  const le = st.lastExp;
  if (le && le.r !== undefined && le.r <= 1 && st.tick - (le.t || 0) <= 12 && !L.isFull(st) && L.expOpen(st, le.k, le.d, le.a || 0)) {
    const k = le.k, d = le.d, a = le.a || 0, m = s => L.expForecast(s, k, d, a).base, v = m(st);
    if (L.ratingOf(v) < 3) {
      const cf = cellFoe(st, k, d), known = L.elemKnown(st, k);
      return { kind: 'stuck', icon: 'goal', t: cf.n ? cut(`${L.REGIONS[k].n.slice(0, 2)}${L.DEPTHS[d]} · ${cf.n}`, 11) : `${L.REGIONS[k].n}${L.DEPTHS[d]}`, el: known ? cf.el : null, due: '上回 ' + R(le.r), big: '预计 ' + R(L.ratingOf(v)), num: R(L.ratingOf(v)),
        target: '目标 甲', v, max: L.RATE_TH[3], line: L.RATE_TH[2], m, unit: 'grade', cell: { k, d, a }, fe: known ? cf.el : null, feKnown: known, hz: 12 };
    }
  }
  // 本章目标（不走 L.goalNow：它读 L.goalNext，会绕回来）
  const ch = L.chapterNow(st), C = L.CHAPTERS[ch];
  let pr = null; try { pr = C.prog(st)[0]; } catch (e) { pr = null; }
  const t = L.chapterGoal(st, ch), hz = b ? b.left : 24;
  if (!pr) return { kind: 'chap', icon: 'goal', t, due: '', big: t, num: '', target: '', v: 0, max: 1, m: null, unit: '', hz };
  const parts = String(pr.text).split(' → ');
  const g = { kind: 'chap', icon: 'goal', t: cut(t, 10), due: b ? `${cut(b.n, 4)} 还有 ${b.left} 月` : '', big: parts[0], num: (parts[0].match(/[\d.]+[%万亿]?/) || ['—'])[0], target: parts[1] ? (/^目标/.test(parts[1]) ? parts[1] : '目标 ' + parts[1]) : '', v: pr.v, max: pr.max || 1, line: pr.max || 1, m: null, unit: '', hz };
  if (pr.k === 'pact' && !st.pact) { g.m = s => L.pactInfo(s).p; g.unit = 'p'; g.max = 1; g.line = L.ADV.line; g.foe = L.PACT_FOE; g.Q = L.PACT_POWER; g.fe = L.foeEl(L.PACT_FOE); g.feKnown = !L.foeElKnown || L.foeElKnown(st, L.PACT_FOE); g.v = g.m(st); }
  else if (L.RIVAL_EL && L.RIVAL_EL[pr.k] && has('rivalP')) { const id = pr.k, P0 = L.rivalP(st, id); if (P0 !== null && P0 < 1) { g.m = s => { const v = L.rivalP(s, id); return v === null ? 0 : v; }; g.unit = 'p'; g.max = 1; g.line = L.ADV.line; g.v = P0; const q = L.rivalRank(st, id); g.foe = { kind: 'rival', q, id, streak: 0 }; try { g.Q = L.rivalPower(st, q); } catch (e) { /* */ } g.fe = L.RIVAL_EL[id]; g.feKnown = !L.foeElKnown || L.foeElKnown(st, g.foe); } }
  else if (pr.k === 'trib') { g.m = btShown; g.unit = 'rate'; g.max = 1; g.line = L.ADV.line; g.v = btShown(st); }
  return g;
}

// ---------- 候选（§10.5 候选表）：每条给“怎么试”（try）或固定的效果 ----------
// c = { id, cls, icon, n, say, go, btn, instant, out(要出门), must, cost: [{icon,n,have}], short: { n, unit, icon } | null（不够的料）, fix: { t, go },
//       tr: fn => 试一下这个改动时 fn() 的值；save: 修炼提前的月数（闭关）；gm: 修炼倍率文字；stones: 历练带回灵石；fixed: { rate, life } }
function cands(st, G) {
  const out = [], p = st.p, add = c => { if (c) out.push(c); };
  const away = L.busy(st);
  // 1. 去突破
  if (L.isReady(st)) {
    const n = Math.min(L.BT.maxPills, st.pills || 0), r = btShown(st);
    add({ id: 'bt', cls: 'bt', icon: 'cult', n: cut('冲击' + nextN(st), 8), say: p.r >= 1 ? '可以渡劫了' : '可以突破了', go: 'bt', hl: '#cult', btn: '突破', must: 1, out: 1, cost: n ? [{ icon: 'pojing', n, have: st.pills }] : [], fixed: { bt: r }, show: { text: pc(r), sub: '成功率' } });
  }
  // 2. 疗伤（有丹才算“当场能做”；没丹只能歇着，不出牌）
  if (p.inj > 0 && L.canHeal(st)) {
    const w = L.healWith(st);
    add({ id: 'heal', cls: 'heal', icon: 'hurt', n: '服丹疗伤', say: '服丹疗伤', go: 'do:heal', btn: '服下', instant: 1, must: 1, cost: [{ icon: w === 'liaoshang' ? 'liaoshang' : 'pojing', n: 1, have: w === 'liaoshang' ? L.bagN(st, 'liaoshang') : st.pills }], tr: fn => withSet(p, 'inj', 0, fn) });
  }
  // 3. 待换上的新法宝（比身上的强）
  if (st.gear && st.gear.pend) {
    let best = null;
    for (const x of st.gear.pend) { if (x.hold) continue; let D; try { D = L.gearDelta(st, x); } catch (e) { continue; } if (D.better && (!best || D.b.v - D.a.v > best.dv)) best = { x, dv: D.b.v - D.a.v }; }
    if (best) { const x = best.x; add({ id: 'equip:' + x.u, cls: 'equip', icon: 'adv_swap', n: cut('换上' + L.gearBase(x.id).n, 8), say: '换上新法宝', go: 'do:equip:' + x.u, btn: '换上', instant: 1, must: 1, cost: [], tr: fn => L.gearTry(st, x, fn) }); }
  }
  // 4. 功法：心法 / 战技，每槽取一门（排序时按页签的数比）
  if (st.arts && st.arts.own) {
    const sl = L.artSlots(st);
    for (const i of [0, 1]) {
      if (!L.artSlotOpen(st, i)) continue;
      const k = L.ART_SLOTS[i];
      for (const id of Object.keys(st.arts.own)) {
        const A = L.art(id); if (!A || A.k !== k || id === sl[i] || (L.artSealed && L.artSealed(st, id))) continue;
        let n = (i === 0 ? '换心法《' : '换上《') + A.n + '》', ke = null;
        if (i === 1 && G.fe && G.feKnown) { const ns = sl.slice(); ns[1] = id; const me = L.atkEl(st, G.fe, ns), me0 = L.atkEl(st, G.fe, sl); if (L.elKe(me, G.fe) && !L.elKe(me0, G.fe)) { ke = { me, me0, fe: G.fe }; n = `换${L.elName(me)}克${L.elName(G.fe)}的战技`; } }
        add({ id: (i === 1 ? 'swap:' : 'art:') + id, cls: 'art' + i, icon: 'adv_swap', n: cut(n, 8), say: cut(ke ? `换${L.elName(ke.me)}克${L.elName(ke.fe)}的战技` : '换上《' + A.n + '》', 12), go: 'do:' + (i === 1 ? 'swap:' : 'art:') + id, btn: '换上', instant: 1, cost: [], ke, tr: fn => L.artTry(st, id, fn) });
      }
    }
  }
  // 5. 强化（每槽一条，排序时同类只留涨得最多的）
  if (L.gearOpen(st, 'plus') && st.gear) for (const s of L.GEAR_SLOTS) {
    let I; try { I = L.gearPlusInfo(st, s); } catch (e) { I = null; }
    if (!I || I.max) continue;
    const x = I.x, c = I.cost, shortOre = Math.max(0, c.ore - (st.ore || 0)), shortSt = Math.max(0, c.stones - st.stones);
    const smeltable = st.gear.pend.some(y => !y.hold);
    add({ id: 'plus:' + s, cls: 'plus', icon: 'f_plus', n: `${L.GEAR_N[s]}强化 +${x.plus + 1}`, say: `${L.GEAR_N[s]}强化 +${x.plus + 1}`, go: 'do:plus:' + s, btn: '强化', instant: 1,
      cost: [{ icon: 'ore', n: c.ore, have: st.ore || 0 }, { icon: 'stone', n: c.stones, have: Math.floor(st.stones) }],
      short: shortOre ? { n: shortOre, unit: '灵矿', icon: 'ore' } : shortSt ? { n: shortSt, unit: '灵石', icon: 'stone' } : null,
      fix: shortOre ? (smeltable ? { t: '去熔', go: 'gear' } : { t: '去刷', go: 'exp' }) : { t: '去刷', go: 'exp' },
      tr: fn => { x.plus++; try { return fn(); } finally { x.plus--; } } });
  }
  // 6. 淬灵（刷宝线 L.gearInfuse / gearInfuseCost / gearInfuseWhy / coreN / gearEl；兵器换成克目标的那一系）
  if (has('gearInfuse') && st.gear && st.gear.w && G.fe && G.feKnown && (!has('gearOpen') || L.gearOpen(st, 'infuse'))) {
    const w = st.gear.w, wEl = has('gearEl') ? L.gearEl(w) : w.el || (L.gearBase(w.id) || {}).el;
    const C = has('gearInfuseCost') ? L.gearInfuseCost(w) : { core: 3, ore: 10 * (w.t || 1) };
    for (const el of ['jin', 'mu', 'shui', 'huo', 'tu']) {
      if (!L.elKe(el, G.fe) || el === wEl) continue;
      const haveC = has('coreN') ? L.coreN(st, el) : ((st.mats && st.mats.core) || {})[el] || 0;
      if (haveC < 1) continue;
      const base = L.gearBase(w.id) || {};
      add({ id: `infuse:w:${el}`, cls: 'infuse', icon: 'f_infuse', n: `兵器淬成${L.elName(el)}`, say: `兵器淬成${L.elName(el)}`, go: `do:infuse:w:${el}`, btn: '淬灵', instant: 1,
        cost: [{ icon: 'core:' + el, n: C.core, have: haveC }, { icon: 'ore', n: C.ore, have: st.ore || 0 }],
        short: haveC < C.core ? { n: C.core - haveC, unit: '枚', icon: 'core:' + el } : (st.ore || 0) < C.ore ? { n: C.ore - (st.ore || 0), unit: '灵矿', icon: 'ore' } : null,
        fix: { t: '去刷', go: 'exp' }, tr: fn => (has('gearElTry') ? L.gearElTry(st, el, () => fn()) : withSet(w, 'el', el, fn)) });
    }
  }
  // 7. 心愿（刷宝线 L.wishInfo / setWish / dropTable）/ 首领再战（L.bossAgain）
  if (st.wish && has('wishInfo')) {
    const W = L.wishInfo(st);
    if (W && L.REGIONS[W.k] && L.expOpen(st, W.k, W.d || 0, 0)) {
      const left = Math.max(1, W.max - (W.n || 0)), useful = W.c && (W.c.boss || (G.fe && G.feKnown && W.c.el && L.elKe(W.c.el, G.fe)));
      if (useful || G.kind === 'stuck') add({ id: `wish:${W.k}:${W.d || 0}`, cls: 'wish', icon: 'wish', n: cut(`刷心愿《${W.c ? W.c.n : ''}》`, 8), say: '刷心愿', go: `exp:${W.k}:${W.d || 0}:0`, btn: '去', out: 1, cost: [{ icon: 'time', n: `每趟 ${L.expLen(W.k, st)} 月` }], fixed: { goal: useful ? 0.3 : 0.12, text: `再 ${left} 趟`, sub: '必出' } });
    }
  } else if (has('setWish') && has('dropTable') && G.kind === 'stuck' && G.fe && G.feKnown && (!has('wishOpen') || L.wishOpen(st))) {
    // 钉一个心愿：这一格的招牌克它
    const c = L.dropTable(st, G.cell.k, G.cell.d)[1];
    if (c && !c.seen && c.el && L.elKe(c.el, G.fe)) add({ id: `wishset:${G.cell.k}:${G.cell.d}:1`, cls: 'wish', icon: 'wish', n: cut(`钉心愿《${c.n}》`, 8), say: '钉一个心愿', go: `do:wishset:${G.cell.k}:${G.cell.d}:1`, btn: '钉', instant: 1, cost: [], fixed: { goal: 0.2, text: `${R(L.ratingOf(G.v))} → 甲`, sub: '拿到以后' } });
  }
  if (has('bossAgain')) for (let k = 0; k < L.REGIONS.length; k++) {
    let ok = false; try { ok = !!L.bossAgain(st, k) && L.bossReady && L.bossReady(st, k); } catch (e) { ok = false; }
    if (!ok || !L.BOSSES[k]) continue;
    let P = 0; try { const Q = L.bossPower(k), S = L.duelPower(st, { kind: 'boss', k, el: L.REGIONS[k].el }); P = L.duelChance(S, Q); } catch (e) { P = 0; }
    if (P < 0.6) continue;
    add({ id: 'boss:' + k, cls: 'boss', icon: 'boss' + Math.min(10, k), n: cut('再战' + L.BOSSES[k].n, 8), say: cut('再战' + L.BOSSES[k].n, 12), go: 'exp', btn: '去', out: 1, cost: [], fixed: { goal: 0.15, text: '35%', sub: '专属' } });
    break;
  }
  // 8. 洞府升级（聚灵阵 / 灵田 / 丹炉 / 洞府……；同类只出最值的一项）
  for (const h of L.HOME) {
    const k = h.k;
    if (!L.homeOpen(st, k)) continue;
    let u; try { u = L.upInfo(st, k); } catch (e) { continue; }
    if (!u || u.max || u.lock || !u.cost || !(u.built || k === 'array')) continue;
    const sh = Math.max(0, u.cost - st.stones);
    add({ id: 'up:' + k, cls: 'up', icon: ['array', 'field', 'furnace', 'cave'].includes(k) ? k : 'up', n: cut(`${h.n} Lv${u.next}`, 8), say: k === 'array' ? '聚灵阵升一级' : cut(h.n + '升一级', 12), go: 'do:up:' + k, btn: '升级', instant: 1,
      cost: [{ icon: 'stone', n: u.cost, have: Math.floor(st.stones) }], short: sh ? { n: sh, unit: '灵石', icon: 'stone' } : null, fix: { t: '去刷', go: 'exp' }, up: u,
      tr: fn => withSet(st.home, k, u.next, fn) });
  }
  // 9. 闭关
  if (L.retOpen(st) && !L.isFull(st) && p.r <= L.MAXR) {
    const ri = L.retInfo(st), blk = L.retBlock ? L.retBlock(st) : null;
    if (ri.save >= 1 && !blk && !st.retreat) {
      const sh = ri.free ? 0 : Math.max(0, ri.cost - st.stones);
      add({ id: 'retreat', cls: 'retreat', icon: 'retreat', n: `闭关 ${ri.len} 月`, say: `闭关 ${ri.len} ${L.UNIT || '月'}`, go: 'do:retreat', btn: '闭关', out: 1, cost: ri.free ? [] : [{ icon: 'stone', n: ri.cost, have: Math.floor(st.stones) }],
        short: sh ? { n: sh, unit: '灵石', icon: 'stone' } : null, fix: { t: '去刷', go: 'exp' }, save: ri.save, gm: ri.m });
    }
  }
  // 10. 丹：爆气丹（丹囊里有就服；炼得出就去炼）、破境丹（突破页签）
  if (st.dan && !L.danNext(st, 'baoqi')) {
    const d = L.danOf(st), b = d.bag.baoqi, q = b && b.length ? b[0] : 1, v = 1 + 0.3 * L.QUAL[q].m * L.pillPower(st) * (L.toxHalf(st) ? 0.5 : 1);
    if (L.bagN(st, 'baoqi') && !L.takeWhy(st, 'baoqi')) add({ id: 'pill:baoqi', cls: 'pill', icon: 'baoqi', n: '服爆气丹', say: '服一枚爆气丹', go: 'do:pill:baoqi', btn: '服下', instant: 1, cost: [{ icon: 'baoqi', n: 1, have: L.bagN(st, 'baoqi') }], tr: fn => withSet(d.next, 'baoqi', v, fn) });
    else if (L.recipeKnown(st, 'baoqi') && !L.canCraft(st, 'baoqi') && st.home.furnace) add({ id: 'brew:baoqi', cls: 'pill', icon: 'baoqi', n: '炼爆气丹', say: '炼一枚爆气丹', go: 'furnace', btn: '去炼', out: 0, cost: [{ icon: 'herb', n: L.herbCost(st, L.RECIPE.baoqi), have: st.herbs }], tr: fn => scalePw(1.3, fn) });
  }
  if ((L.isFull(st) || G.kind === 'bt') && (st.pills || 0) < L.BT.maxPills && L.marketOpen && L.marketOpen(st, 'pill')) {
    const n = st.pills || 0, pr = L.price(st, 'pill');
    let d = 0; try { d = L.tribNeeded(st) ? L.tribRate(st, { pills: n + 1 }) - L.tribRate(st, { pills: n }) : L.btRate(st, n + 1) - L.btRate(st, n); } catch (e) { d = 0; }
    add({ id: 'buy:pill', cls: 'buy', icon: 'pojing', n: '买破境丹', say: '买一枚破境丹', go: 'market', btn: '去买', cost: [{ icon: 'stone', n: pr, have: Math.floor(st.stones) }], short: st.stones < pr ? { n: Math.ceil(pr - st.stones), unit: '灵石', icon: 'stone' } : null, fix: { t: '去刷', go: 'exp' }, fixed: { bt: btShown(st) + d, rateAdd: d } });
  }
  // 11. 灵宠：收一只 / 喂到下一级
  if (L.petCount && !L.petCount(st) && L.marketOpen && L.marketOpen(st, 'egg')) {
    const pr = L.price(st, 'egg');
    add({ id: 'egg', cls: 'pet', icon: 'egg', n: '收一只灵宠', say: '收一只灵宠', go: 'market', btn: '去买', cost: [{ icon: 'stone', n: pr, have: Math.floor(st.stones) }], short: st.stones < pr ? { n: Math.ceil(pr - st.stones), unit: '灵石', icon: 'stone' } : null, fix: { t: '去刷', go: 'exp' }, tr: fn => scalePw(L.PETS[1].m, fn) });
  }
  const op = L.petOut ? L.petOut(st) : null, oi = st.petOut;
  if (op && !L.petFeedWhy(st, oi)) {
    const need = Math.ceil(L.petNeed(op) - op.xp), sh = Math.max(0, need - Math.floor(st.feed || 0));
    add({ id: 'pet:feed', cls: 'pet', icon: 'feed', n: cut(`喂到 Lv${op.lv + 1}`, 8), say: '喂灵宠升一级', go: 'do:pet:feed', btn: '喂', instant: 1, cost: [{ icon: 'feed', n: need, have: Math.floor(st.feed || 0) }], short: sh ? { n: sh, unit: '兽粮', icon: 'feed' } : null, fix: { t: '去刷', go: 'exp' },
      tr: fn => L.petTry(st, () => { st.pets[oi].lv++; }, fn) });
  }
  // 12. 渡劫阵（要渡劫了：换上，3 个月后生效）
  if (L.zhenOpen && L.zhenOpen(st) && L.zhenOwned(st, 'f_dujie') && L.tribNeeded(st) && !L.zhenWhere(st, 'f_dujie') && p.s === 3) {
    const v = L.formationVal(st, 'f_dujie');
    if (v > 0) add({ id: 'zhen:dujie', cls: 'zhen', icon: 'array', n: '换上渡劫阵', say: '换上渡劫阵', go: 'zhen', btn: '换阵', cost: [], fixed: { bt: btShown(st) + v, rateAdd: v } });
  }
  // 13. 延寿丹（寿元告急）
  if (L.desperate(st) && L.marketOpen && L.marketOpen(st, 'life')) {
    const pr = L.price(st, 'life'), mo = Math.floor(L.lifespan(st) * 0.1 / L.REALMS[Math.min(p.r, L.MAXR)].mpt);
    add({ id: 'life', cls: 'life', icon: 'yanshou', n: '买延寿丹', say: '买一枚延寿丹', go: 'market', btn: '去买', must: 1, cost: [{ icon: 'stone', n: pr, have: Math.floor(st.stones) }], fixed: { goal: 1, text: `+${mo} 月`, sub: '寿元' } });
  }
  // 14. 去历练（兜底；灵石页签算“每月多多少”）
  if (p.r <= L.MAXR && !L.isFull(st)) {
    const b = L.expBest(st);
    add({ id: `exp:${b.k}:${b.d}`, cls: 'exp', icon: 'slay', n: cut('去' + L.REGIONS[b.k].n, 8), say: '去历练', go: `exp:${b.k}:${b.d}:${b.a}`, btn: '去', out: 1, cost: [{ icon: 'time', n: `${b.f.len} 月` }], stones: b.f.stones, len: b.f.len, cell: b });
  }
  for (const c of out) if (away && c.out) c.away = 1;
  return out;
}

// ---------- 打分（§10.6） ----------
const M = {
  atk: st => L.power(st), cul: st => L.gainCalm(st), inc: st => L.income(st), bt: btShown,
};
// 一条候选在某个页签上：{ score, ok（过门槛）, text, sub, from, to, unit, d（目标数的增量，算 head.after 用） }
function rate(st, c, focus, G, base) {
  const r = { score: 0, ok: false, text: '', sub: '', unit: '', d: 0 };
  const tryM = f => (c.tr ? c.tr(() => f(st)) : null);
  // 修炼提前的月数（阵、心法、闭关、聚灵）
  const culSave = () => {
    if (c.save) return { save: c.save, text: '×' + c.gm.toFixed(1) };
    if (!c.tr) return null;
    const g0 = base.cul, g1 = tryM(M.cul); if (!(g1 > g0 * 1.0001)) return null;
    const left = needLeft(st), save = g0 > 0 && !L.isFull(st) ? left / g0 - left / g1 : 0;
    return { save: Math.round(save), frac: g1 / g0 - 1, text: `+${f1(g1 - g0)}/月` };
  };
  if (c.fixed && c.fixed.text) { // 心愿、首领、延寿：不按公式比，给定的分
    if (focus === 'goal' || c.cls === 'life') { r.score = c.fixed.goal; r.ok = true; r.text = c.fixed.text; r.sub = c.fixed.sub; }
    return r;
  }
  if (c.cls === 'bt') { if (focus === 'goal' || focus === 'bt') { r.score = 9; r.ok = true; r.text = c.show.text; r.sub = c.show.sub; } return r; }
  if (focus === 'atk') {
    const p1 = c.tr ? tryM(M.atk) : null; if (p1 === null) return r;
    const fr = p1 / base.atk - 1; r.score = fr; r.ok = fr >= L.ADV.pwThr; r.text = '+' + fmt(p1 - base.atk); r.sub = '战力'; r.from = base.atk; r.to = p1; r.unit = 'pw'; return r;
  }
  if (focus === 'cul') {
    const cs = culSave(); if (!cs) return r;
    const n = toStage(st), fr = Math.max(cs.frac || 0, cs.save / Math.max(1, isFinite(n) ? n : 12));
    r.score = fr; r.ok = (cs.frac || 0) >= L.ADV.culThr || cs.save >= L.ADV.saveThr; r.text = cs.text; r.sub = cs.save >= 1 ? `早 ${cs.save} 月` : '修炼'; r.unit = 'cul'; r.save = cs.save; return r;
  }
  if (focus === 'inc') {
    if (c.cls === 'exp') { const per = c.stones / Math.max(1, c.len); r.score = per / Math.max(1, base.inc); r.ok = c.stones > 0; r.text = '约 +' + fmt(c.stones); r.sub = '灵石'; r.unit = 'inc'; return r; }
    const i1 = c.tr ? tryM(M.inc) : null; if (i1 === null) return r;
    const fr = (i1 - base.inc) / Math.max(1, base.inc); r.score = fr; r.ok = fr >= L.ADV.incThr; r.text = `+${f1(i1 - base.inc)}/月`; r.sub = '灵石'; r.unit = 'inc'; return r;
  }
  if (focus === 'bt') {
    let b1 = c.fixed && c.fixed.bt !== undefined ? c.fixed.bt : c.tr ? tryM(M.bt) : null; if (b1 === null) return r;
    const d = b1 - base.bt; r.score = d; r.ok = d >= L.ADV.rateThr; r.text = '▲' + Math.round(d * 100) + '%'; r.sub = '成功率'; r.unit = 'rate'; r.d = d; return r;
  }
  // goal：折成“离目标线近了多少”
  let best = null;
  if (G.m && (c.tr || (c.fixed && c.fixed.bt !== undefined && G.unit === 'rate'))) {
    const v1 = c.tr ? tryM(G.m) : c.fixed.bt, d = v1 - G.v, gapTo = Math.max(1e-6, (G.v < G.line ? G.line : G.max) - G.v);
    if (G.unit === 'p' || G.unit === 'rate') { if (d >= (G.unit === 'p' ? L.ADV.pThr : L.ADV.rateThr)) best = { score: d / Math.max(gapTo, 0.05), text: '▲' + Math.round(d * 100) + '%', sub: G.unit === 'p' ? '胜算' : '成功率', d, from: G.v, to: v1, unit: G.unit }; }
    else if (G.unit === 'grade') { if (d >= L.ADV.gradeThr) { const g0 = L.ratingOf(G.v), g1 = L.ratingOf(v1); best = { score: d / Math.max(gapTo, 4), text: g1 > g0 ? `${R(g0)} → ${R(g1)}` : `+${Math.round(d)} 分`, sub: '预计', d, from: G.v, to: v1, unit: 'grade' }; } }
  }
  const cs = culSave();
  if (cs && cs.save >= L.ADV.saveThr && G.kind !== 'bt') {
    const s = cs.save / Math.max(6, G.hz || 24);
    if (!best || s > best.score) best = { score: s, text: cs.text, sub: `早 ${cs.save} 月`, d: 0, unit: 'cul' };
  }
  if ((!G.m || G.kind === 'stuck') && c.tr && !best) { const p1 = tryM(M.atk), fr = p1 / base.atk - 1; if (fr >= L.ADV.pwThr) best = { score: fr, text: '+' + fmt(p1 - base.atk), sub: '战力', d: 0, unit: 'pw' }; }
  if (!best && !G.m && c.tr && G.kind === 'chap') { const i1 = tryM(M.inc), fr = (i1 - base.inc) / Math.max(1, base.inc); if (fr >= 0.1) best = { score: fr * 0.5, text: `+${f1(i1 - base.inc)}/月`, sub: '灵石', d: 0, unit: 'inc' }; }
  if (best) Object.assign(r, best, { ok: true });
  return r;
}

// ---------- 排序（§10.6） ----------
function order(list) {
  const kind = c => (c.instant ? (c.cost.length ? 1 : 0) : 2);   // 不花钱 > 当场能做 > 要出门
  const must = list.filter(c => c.must).sort((a, b) => b.r.score - a.r.score);
  const rest = list.filter(c => !c.must).sort((a, b) => {
    const hi = Math.max(a.r.score, b.r.score);
    if (hi > 0 && Math.abs(a.r.score - b.r.score) < hi * L.ADV.tie) return kind(a) - kind(b) || b.r.score - a.r.score;
    return b.r.score - a.r.score;
  });
  // 同一类只出一张
  const seen = {}, uniq = [];
  for (const c of must.concat(rest)) { if (seen[c.cls]) continue; seen[c.cls] = 1; uniq.push(c); }
  return uniq;
}
function toAct(c) {
  const r = c.r, gap = c.short ? { icon: c.short.icon, n: c.short.n, unit: c.short.unit, fix: c.fix } : null;
  return { id: c.id, cls: c.cls, icon: c.icon, n: c.n, gain: { unit: r.unit || '', from: r.from, to: r.to, text: r.text, sub: r.sub }, cost: c.cost || [], gap, go: gap ? c.fix.go : c.go, btn: gap ? c.fix.t : c.btn, instant: !!c.instant && !gap, out: !!c.out, away: !!c.away, must: !!c.must, score: r.score, say: c.say, hl: c.hl || null, ke: c.ke || null, d: r.d || 0, save: r.save };
}

// ---------- 页签与头 ----------
function tabs(st, G) {
  const full = L.isFull(st) || L.isReady(st);
  return [
    { k: 'goal', n: '目标', v: G.num || '—', lock: false },
    { k: 'atk', n: '战力', v: fmt(L.power(st)), lock: false },
    { k: 'cul', n: '修炼', v: '+' + fmt(L.gain(st)), lock: st.p.r > L.MAXR },
    { k: 'inc', n: '灵石', v: '+' + fmt(L.income(st)), lock: false },
    { k: 'bt', n: '突破', v: full ? pc(btShown(st)) : '未满', lock: !full },
  ];
}
function headOf(st, focus, G) {
  const p = st.p;
  if (focus === 'goal') return Object.assign({}, G);
  if (focus === 'atk') {
    let tg = 0;
    const b = L.bigNext && L.bigNext(st);
    if (b && G.Q && G.kind === 'big') tg = L.duelLines(G.Q).even;
    else { const pw = L.power(st); for (let k = 0; k < L.REGIONS.length; k++) for (let d = 0; d < 3; d++) { if (!L.expOpen(st, k, d, 0)) continue; const rc = L.rec(k, d); if (rc > pw && (!tg || rc < tg)) tg = rc; } }
    const v = L.power(st);
    return { icon: 'atk', t: L.stageName(p), due: tg ? (G.kind === 'big' ? '五五线 ' : '下一格 ') + fmt(tg) : '', big: '战力 ' + fmt(v), num: fmt(v), target: tg ? '目标 ' + fmt(tg) : '', v, max: tg ? tg * 1.25 : v, line: tg ? tg : 0, unit: 'pw' };
  }
  if (focus === 'cul') {
    const n = toStage(st), need = L.pNeed(p);
    return { icon: 'cult', t: L.stageName(p), due: L.isFull(st) ? '已圆满' : isFinite(n) ? `圆满还差 ${n} 月` : '', big: '修炼 +' + fmt(L.gain(st)), small: '/月', num: '+' + fmt(L.gain(st)), target: '', v: p.xp, max: need, unit: 'cul', bar: 'g' };
  }
  if (focus === 'inc') {
    const ups = L.HOME.filter(h => L.homeOpen(st, h.k)).map(h => { try { return L.upInfo(st, h.k); } catch (e) { return null; } }).filter(u => u && !u.max && !u.lock && u.cost);
    const c = ups.length ? Math.min(...ups.map(u => u.cost)) : 0;
    return { icon: 'stone', t: '灵石', due: '有 ' + fmt(st.stones), big: '灵石 +' + fmt(L.income(st)), small: '/月', num: '+' + fmt(L.income(st)), target: c ? '最便宜一项 ' + fmt(c) : '', v: Math.min(st.stones, c || st.stones), max: c || Math.max(1, st.stones), line: c ? c : 0, unit: 'inc' };
  }
  const r = btShown(st), full = L.isFull(st) || L.isReady(st);
  return { icon: 'pojing', t: '冲击' + nextN(st), due: full ? '' : '未满', big: '成功率 ' + pc(r), num: pc(r), target: '目标 80%', v: r, max: 1, line: L.ADV.line, unit: 'rate', lock: !full };
}
function sayOf(st, H, acts, G) {
  const a = acts[0]; if (!a) return '';
  if (a.id === 'idle') return H.kind === 'stuck' ? '这一格先缓缓，修高一层再来。' : '稳着呢，照这样修就是。';
  if (a.ke) return cut(L.elKe(a.ke.fe, a.ke.me0) ? `${L.elName(a.ke.me0)}被${L.elName(a.ke.fe)}克，换成${L.elName(a.ke.me)}。` : `换成${L.elName(a.ke.me)}，正克${L.elName(a.ke.fe)}。`, 20);
  const n = acts.filter(x => x.d > 0 && !x.gap).length;
  if (n && (H.unit === 'p' || H.unit === 'rate') && H.after > H.v + 0.005) return cut(`做完这${n > 1 ? CN[n] : ''}件，${H.unit === 'p' ? '胜算' : '成功率'}到 ${pc(H.after)}。`, 20);
  if (n && H.unit === 'grade') return cut(`做完这${n > 1 ? CN[n] : ''}件，预计 ${R(L.ratingOf(H.after))}。`, 20);
  return cut(`先${a.say}：${a.gain.text}${a.gain.sub && !/早/.test(a.gain.sub) ? a.gain.sub : ''}。`, 20);
}

// ---------- 主入口（带缓存） ----------
L.adviseKey = function (st) {
  const g = st.gear, A = st.arts, d = st.dan;
  return [st.tick, st.exp ? 'e' + st.exp.left : '', st.retreat ? 'r' + st.retreat.left : '', st.run ? 'R' : '', Math.floor(st.stones), st.ore || 0, st.pills, Math.floor(st.feed || 0), Math.floor(st.herbs || 0), st.p.r, st.p.s, Math.floor(st.p.xp), st.p.inj, st.toxin | 0,
    g ? g.pend.length + ':' + L.GEAR_SLOTS.map(s => (g[s] ? g[s].id + '+' + g[s].plus + (g[s].el || '') : '-')).join(',') : '', A ? Object.keys(A.own).length + L.artSlots(st).join() : '',
    JSON.stringify(st.home), st.pets ? st.pets.map(p => p.lv + (p.form || '') + (p.aw ? 'a' : '')).join() + '/' + st.petOut : '', d ? JSON.stringify(d.next) + Object.keys(d.bag || {}).map(k => d.bag[k].length).join() : '',
    st.mats ? JSON.stringify(st.mats) : '', st.wish ? JSON.stringify(st.wish) : '', st.lastExp ? JSON.stringify(st.lastExp) : '', st.pact, st.rank, st.onb ? Object.keys(st.onb.at).length : 0, st.flags.retFree, st.stats.retreat || 0, st.visitor ? 1 : 0, st.sect ? st.sect.rank : -1].join('|');
};
let cache = { st: null, key: '', by: {} };
L.advise = function (st, focus) {
  focus = focus === 'all' || !focus ? 'goal' : focus === 'life' ? 'bt' : focus;
  if (!st || !st.p) return { focus, tabs: [], head: {}, acts: [], more: 0, pool: [] };
  const key = L.adviseKey(st);
  if (cache.st !== st || cache.key !== key) cache = { st, key, by: {} };
  if (cache.by[focus]) return cache.by[focus];
  const G = goalOf(st);
  const base = { atk: L.power(st), cul: L.gainCalm(st), inc: L.income(st), bt: btShown(st) };
  const list = cands(st, G);
  for (const c of list) { try { c.r = rate(st, c, focus, G, base); } catch (e) { c.r = { score: 0, ok: false }; } }
  const pass = order(list.filter(c => c.r.ok && c.cls !== 'exp' || (c.cls === 'exp' && focus === 'inc' && c.r.ok)));
  const can = pass.filter(c => !c.short), gaps = pass.filter(c => c.short);
  let acts = can.slice(0, 3).map(toAct);
  // 还差牌：最多 1 张，取“差得最少、涨得最多”，放第三张（不占前两张）
  if (gaps.length) {
    const g = gaps.slice().sort((a, b) => (b.r.score / (1 + b.short.n / Math.max(1, b.cost[0] ? b.cost[0].n : 1))) - (a.r.score / (1 + a.short.n / Math.max(1, a.cost[0] ? a.cost[0].n : 1))))[0];
    if (acts.length >= 3) acts = acts.slice(0, 2);
    acts.push(toAct(g));
  }
  // 空状态：一张“稳着呢”（之后可接一张还差牌）
  if (!acts.length || acts.every(a => a.gap)) {
    const ex = list.find(c => c.cls === 'exp'), n = toStage(st);
    const idle = { id: 'idle', cls: 'idle', icon: 'cult', n: '稳着呢', gain: { unit: 'month', text: isFinite(n) && !L.isFull(st) ? `约 ${n} 月` : '—', sub: L.isFull(st) ? '已圆满' : '升下一层' }, cost: ex ? ex.cost : [], gap: null,
      go: ex ? ex.go : 'exp', btn: '去历练', instant: false, out: true, away: L.busy(st), must: false, score: 0, say: '去历练', hl: null, ke: null, d: 0 };
    acts = [idle].concat(acts.filter(a => a.gap).slice(0, 1));
  }
  const H = headOf(st, focus, G);
  if (H.unit === 'p' || H.unit === 'rate' || H.unit === 'grade') H.after = Math.min(H.max, H.v + acts.reduce((s, a) => s + (a.gap ? 0 : a.d || 0), 0));
  H.say = focus === 'goal' ? sayOf(st, H, acts, G) : '';
  const res = { focus, tabs: tabs(st, G), head: H, acts, more: Math.max(0, pass.length - acts.length), pool: pass.map(toAct) };
  delete res.head.m;
  cache.by[focus] = res;
  return res;
};
// 某一类的第一条（气泡用：S04 找升级、S05 找突破）
L.adviseFind = (st, pred, focus) => L.advise(st, focus).pool.find(pred) || null;

// ---------- 执行 ----------
L.adviseDo = function (st, id) {
  const [k, a, b, c] = String(id || '').split(':');
  const fail = why => ({ ok: false, done: false, why });
  let r = null;
  try {
    if (k === 'swap' || k === 'art') { r = L.equipArt(st, a); return r ? { ok: true, done: true, res: r } : fail('换不上'); }
    if (k === 'equip') { r = L.gearDecide(st, +a, 'equip'); return r ? { ok: true, done: true, res: r } : fail('这件已经不在了'); }
    if (k === 'plus') { const why = L.gearPlusWhy(st, a); if (why) return fail(why); r = L.gearPlus(st, a); return r ? { ok: !!r.ok, done: true, why: r.ok ? '' : '强化失败', res: r } : fail('强化不了'); }
    if (k === 'infuse') { if (!has('gearInfuse')) return fail('还不能淬灵'); const x = st.gear[a]; if (!x) return fail('没有兵器'); const why = has('gearInfuseWhy') ? L.gearInfuseWhy(st, x.u, b) : ''; if (why) return fail(why); r = L.gearInfuse(st, x.u, b); return r ? { ok: true, done: true, res: r } : fail('淬灵不了'); }
    if (k === 'wishset') { if (!has('setWish')) return fail('还不能钉心愿'); r = L.setWish(st, +a, +b, +c); return r ? { ok: true, done: true, res: r } : fail('钉不上'); }
    if (k === 'up') { r = L.upgrade(st, a); return r ? { ok: true, done: true } : fail('灵石不够'); }
    if (k === 'retreat') { r = L.startRetreat(st); return r ? { ok: true, done: true } : fail(L.retWhy(st) || '闭不了关'); }
    if (k === 'pill') { r = L.takePill(st, a); return r ? { ok: true, done: true, res: r } : fail(L.takeWhy(st, a)); }
    if (k === 'heal') { r = L.heal(st); return r ? { ok: true, done: true } : fail('没有丹'); }
    if (k === 'exp' || k === 'wish') { r = L.startExp(st, +a, +b || 0, +c || 0); return r ? { ok: true, done: true } : fail('出不了门'); }
    if (k === 'pet' && a === 'feed') {
      const i = st.petOut, p = st.pets[i]; if (!p) return fail('没有出战的灵宠');
      const lv0 = p.lv; let n = 0;
      while (p.lv === lv0 && !L.petFeedWhy(st, i) && n++ < 40) L.petFeed(st, i);
      return p.lv > lv0 ? { ok: true, done: true } : { ok: false, done: n > 0, why: '兽粮不够' };
    }
    if (k === 'egg') { r = L.buy(st, 'egg'); return r ? { ok: true, done: true } : fail('买不起'); }
    if (k === 'life') { r = L.buy(st, 'life'); return r ? { ok: true, done: true } : fail('买不起'); }
    if (k === 'buy' && a === 'pill') { r = L.buy(st, 'pill'); return r ? { ok: true, done: true } : fail('买不起'); }
  } catch (e) { return fail(String(e && e.message || e)); }
  return fail('这一条要去那边做');
};
L.adviseSeen = function (st) { const a = L.advise(st, 'goal').acts[0]; if (a && st.flags) st.flags.advSeen = a.id; return a ? a.id : ''; };
L.adviseNew = function (st) { if (!st || !st.flags) return false; const a = L.advise(st, 'goal').acts[0]; return !!a && a.id !== 'idle' && a.cls !== 'exp' && a.id !== st.flags.advSeen; };
});
