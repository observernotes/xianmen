/* 废柴仙途 · 逻辑模块 cultivation：突破、闭关、特训、疗伤（吐纳已删：由“打坐 1 点”接替，ap.js 的 L.sit，docs/AP_PLAN.md §3.1）
 * 模块写法见 src/logic.js 顶部说明。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';
const { R, ri, pick, wpick, clamp, emit } = L.U;
const P = L.P;

// 吐纳（AP_PLAN §3.1、§3.5）：删除。下面三个是给界面留的空壳（src/ui 的 scene / boot / guide 还在读，线 C 删掉那头后一并拆）：永远不满、点了得 0
L.TUNA_FULL = 6;
L.tunaReady = () => false;
L.tuna = () => 0;

// 突破成功率。n = 服几枚破境丹（true 表示尽量多，最多三枚；SYSTEMS §9 的“临阵吞丹”另算，见 trib.js）
// 基础成功率在 L.REALMS[r].rate；常驻的加成（道心·稳、心魔劫…）用 L.addBtMod 登记，fn(st) → [显示名, 加多少]；
// 每次渡劫临时选的护劫手段（祭法宝、灵宠挡劫、道侣护法、临阵吞丹、渡劫阵）不在这里，见 trib.js 的 L.tribParts
L.BT = { pill: 0.15, maxPills: 3, furnace: 0.01, fail: 0.10, desperate: 0.25 };
L.btPills = (st, n) => (n === true ? Math.min(L.BT.maxPills, st.pills) : clamp(Math.floor(n || 0), 0, Math.min(L.BT.maxPills, st.pills)));
// 老祖护法：第一世第一次冲击筑基必成
L.btGuard = st => st.rebirth === 0 && st.p.r === 0 && !st.flags.guardUsed;
L.btParts = function (st, n) {
  const p = st.p; n = L.btPills(st, n);
  const a = [['基础', L.REALMS[Math.min(p.r, 8)].rate]];
  if (n) a.push([`破境丹 ×${n}`, n * L.BT.pill]);
  if (st.home.furnace) a.push(['丹炉 Lv' + st.home.furnace, st.home.furnace * L.BT.furnace]);
  if (p.fails) a.push([`屡败屡战 ×${p.fails}`, p.fails * L.BT.fail]);
  if (L.has(st, 'alch')) a.push(['丹道奇才', 0.15]);
  const sc = L.sectOf(st); if (sc && sc.bt) a.push([sc.n, sc.bt]);
  if (L.desperate(st)) a.push(['绝境', L.BT.desperate]);
  return a.concat(L.modParts('bt', st));
};
L.btRate = function (st, n) {
  if (st.flags.sureBt || L.btGuard(st)) return 1;
  let v = 0; for (const x of L.btParts(st, n)) v += x[1];
  return clamp(v, 0.05, 1);
};

// ---------- 突破 ----------
// n：服几枚破境丹（0～3；true 表示尽量多）。失败：修为退到 70%，负伤到下季末（4 月，L.injMonths），下次 +10%
// 金丹起要渡雷劫（SYSTEMS §9）：界面拆成 L.tribStart（预掷）→ 临场一停 → L.tribFinish（补手段、结算），见 trib.js；
// 这里一口气走完（sim、旧调用）：opts = { aids: { fa, pet, daolv, zhen } | 'all', extra: { pills, fa, pet, daolv } | 'all' }
L.breakthrough = function (st, n, opts) {
  if (!L.isReady(st)) return null;
  if (L.tribNeeded && L.tribNeeded(st)) {
    opts = opts || {};
    if (!L.tribStart(st, Object.assign({}, opts, { pills: n }))) return null;
    return L.tribFinish(st, opts.extra);
  }
  n = L.btPills(st, n);
  const guard = L.btGuard(st), sure = !!st.flags.sureBt;
  const rate = L.btRate(st, n);
  if (guard || sure) n = 0;            // 必成的时候不浪费丹药
  st.pills -= n;
  if (st.retreat) st.retreat = null;
  return L.btResolve(st, R() < rate, { rate, pills: n, guard, sure });
};
// 掷完之后的结算（筑基的一次掷与天劫共用）：成了升境界、觉醒、触发剧情；败了修为退到 70%、负伤 3 月、下次 +10%
// o = { rate, pills, guard, sure }
L.btResolve = function (st, ok, o) {
  const p = st.p, guard = !!o.guard, sure = !!o.sure, n = o.pills || 0;
  if (!guard && sure) st.flags.sureBt = 0;
  const desp = L.desperate(st);
  const from = p.r;
  const before = L.power(st);
  const res = { ok, from, to: from + 1, rate: o.rate, usedPill: n > 0, pills: n, guard, before, trib: from >= L.MAXR ? 9 : L.REALMS[Math.min(from + 1, 8)].trib, ascend: from === L.MAXR, lifeBefore: L.lifespan(st) };
  st.stats.bt++;
  if (ok) {
    if (guard) st.flags.guardUsed = 1;
    const carry = Math.min(p.over || 0, L.overCap(p));
    p.r++; p.s = 0; p.xp = 0; p.over = 0; p.fails = 0; st.flags.readyNotified = 0;
    st.flags.guardUsed = 1;
    st.flags.maxR = Math.max(st.flags.maxR || 0, p.r);
    if (L.awakens(st)) {
      const aw = L.AWAKE.find(a => a.r === p.r);
      if (aw) {
        st.flags.awoke = L.AWAKE.indexOf(aw) + 1;
        res.awaken = { from: p.t, to: Math.max(p.t, aw.t), n: aw.n, stage: st.flags.awoke };
        p.t = res.awaken.to;
      }
    }
    if (desp) st.stats.despWin++;
    res.sure = sure;
    L.fireTrigger(st, 'realm:' + p.r);
    if (res.trib > 0 && !st.flags.trib1) { st.flags.trib1 = 1; L.fireTrigger(st, 'trib:1'); }
    if (p.r >= 9) { res.ascend = true; st.flags.ascended = 1; L.log(st, `★ ${p.name} 渡过九九天劫，白日飞升！`, 'gold'); }
    else { if (carry > 0) { res.carry = carry; L.addXp(st, carry); } L.log(st, `突破成功，踏入${L.REALMS[p.r].n}期！寿元增至 ${L.fmt(L.lifespan(st))} 年`, p.r >= 2 ? 'gold' : 'jade'); }
    res.after = L.power(st);
    res.lifeAfter = L.lifespan(st);
  } else {
    p.fails++; st.stats.btFails++;
    // 厚土载物经：只退到 85%（L.btKeep）
    if (!L.has(st, 'steady')) { p.xp = Math.floor(L.pNeed(p) * L.btKeep(st)); p.inj = Math.max(p.inj, L.injMonths ? L.injMonths('base') : 3); }
    else p.xp = Math.floor(L.pNeed(p) * 0.95);
    p.over = 0;
    st.flags.readyNotified = 0;
    res.after = L.power(st);
    L.log(st, `冲击${from >= L.MAXR ? '飞升' : L.REALMS[from + 1].n}失败……下次成功率 +${Math.round(L.BT.fail * 100)}%`, 'red');
  }
  L.checkQuests(st);
  return res;
};

// ---------- 闭关与疗伤 ----------
// 花 2 点、当场出关（AP_PLAN §3.2）：得 gainCalm × 4 × (倍率 − 1)（ap.js 的 L.retreatNow；自然修炼另在季末给）；倍率 2 + 静室…；
// 花费 50 × 1.30^i 灵石（SYSTEMS §18；第一次免费，玄天道宗 −30%）；出关 30% 概率顿悟（玄天道宗 45%），再得 2 月修为。
// L.RET.len（4）不再表示时长，只在公式里当 L.AP.retTicks 用、在文案里写“约 N 月修为”
// 闭关疲劳：两趟历练之间连着闭关，从第二次起每次倍率 −0.5（最低 ×1.25）；出门历练一趟就清零（劳逸结合）。
L.RET = { len: 4, base: 50, grow: 1.30, epi: 0.30, epiDao: 0.45, epiTicks: 2, fatigue: 0.5, minM: 1.25 };
// SYSTEMS §6.1：“闭关倍率 +0.05/洞府级”移到静室（home.js 的 L.roomRet；nohome2 时仍按洞府等级）
// 烈阳诀 +0.2、星河倒悬 +0.125（arts.js 的 L.artRetBonus）
// 冬 +0.2、星河倒悬冬季再 +0.5、名师讲道 +0.5（calendar.js 的 L.calRetBonus）
L.retBaseMult = st => 2 + (L.roomRet ? L.roomRet(st) : 0.05 * st.home.cave) + L.artRetBonus(st) + L.calRetBonus(st);
L.retStreak = st => st.flags.retStreak || 0;
L.retMult = st => Math.max(L.RET.minM, L.retBaseMult(st) - L.RET.fatigue * L.retStreak(st));
L.retOpen = st => st.rebirth > 0 || Math.max(L.si(st.p), st.flags.maxI || 0) >= 1;
L.retCost = function (st) {
  if (!st.flags.retFree) return 0;
  let c = L.RET.base * Math.pow(L.RET.grow, Math.min(L.si(st.p), 35));
  if (st.sect && st.sect.id === 'dao') c *= 0.7;
  return Math.floor(c);
};
L.retWhy = function (st) {
  if (!L.retOpen(st)) return '炼气中期后可闭关';
  if (st.p.r > L.MAXR) return '已证大道';
  if (st.exp) return '历练途中';
  if (st.retreat) return '眼下有事在身';
  if (L.isFull(st)) return '修为已圆满，先去突破';
  if (st.stones < L.retCost(st)) return `还差 ${L.fmt(L.retCost(st) - st.stones)} 灵石`;
  return '';
};
L.canRetreat = st => !L.retWhy(st);
// 闭关值不值：多得多少修为、提前几月升层
// m 本次倍率；m0 不计疲劳的倍率；extra 比打坐多得的修为；save 本层提前几月；total 这 4 月共得多少修为
L.retInfo = function (st) {
  const m = L.retMult(st), m0 = L.retBaseMult(st), base = L.gainCalm(st);
  const extra = base * (m - 1) * L.RET.len;
  const left = Math.max(0, L.pNeed(st.p) - st.p.xp);
  const t0 = base > 0 ? left / base : 0, t1 = left <= base * m * L.RET.len ? left / (base * m) : L.RET.len + (left - base * m * L.RET.len) / base;
  return { cost: L.retCost(st), m, m0, tired: m < m0, streak: L.retStreak(st), len: L.RET.len, extra, total: base * m * L.RET.len, save: Math.max(0, Math.round(t0 - t1)), why: L.retWhy(st), free: !st.flags.retFree,
    epi: ((st.sect && st.sect.id === 'dao' ? L.RET.epiDao : L.RET.epi) + L.artEpi(st)) * L.calEpiMult(st), fenshen: L.artOn(st, 'm_fenshen') };
};
L.startRetreat = function (st, opt) {
  opt = opt || {};
  const special = opt.kind === 'train' || opt.kind === 'teach';
  if (special) { if (L.busy(st) || st.p.r > L.MAXR) return false; }
  else {
    if (!L.canRetreat(st)) return false;
    st.stones -= L.retCost(st); st.flags.retFree = 1; st.flags.spentAt = st.tick;
  }
  st.retreat = { left: L.RET.len, total: L.RET.len, m: opt.m !== undefined ? opt.m : L.retMult(st), kind: opt.kind || 'ret', got: 0 };
  if (!special) st.flags.retStreak = L.retStreak(st) + 1;
  if (opt.task !== undefined) st.retreat.task = opt.task;
  L.log(st, opt.kind === 'train' ? '老祖亲自特训，修炼 ×3' : opt.kind === 'teach' ? '应宗门之命，指点师弟' : `闭关，修炼 ×${st.retreat.m.toFixed(2)}`, 'jade');
  return true;
};
// 闭关栏里写的名字（sect2.js 的 'busy'：讲法、传授、事件占住的几个月，带 label）
L.retName = r => (!r ? '' : r.kind === 'train' ? '老祖特训' : r.kind === 'teach' ? '指点师弟' : r.kind === 'busy' ? r.label || '有事在身' : '闭关');
// done = 坐满了；提前出关不退灵石，也没有顿悟
L.endRetreat = function (st, done) {
  const r = st.retreat; if (!r) return null;
  st.retreat = null;
  const res = { kind: r.kind, got: r.got, done: !!done, epi: 0 };
  if (r.kind === 'teach') {
    if (done && st.sect && st.sect.tasks) { const t = st.sect.tasks[r.task]; if (t && t.ty === 'teach' && !t.done) L.taskDone(st, t); }
    L.log(st, done ? '指点师弟归来，宗门记你一功' : '中途离开，师弟们一脸茫然');
  } else {
    if (done) {
      const first = !st.stats.retreat;
      st.stats.retreat = (st.stats.retreat || 0) + 1;
      const pe = ((st.sect && st.sect.id === 'dao' ? L.RET.epiDao : L.RET.epi) + L.artEpi(st)) * L.calEpiMult(st);   // 灵气潮汐：顿悟 ×2
      if (r.kind === 'ret' && (first || R() < pe)) { res.epi = L.gainCalm(st) * L.RET.epiTicks; L.addXp(st, res.epi); }
      // 分身术：闭关时分身去外围历练了一趟
      if (r.kind === 'ret') res.fenshen = L.fenshenTrip(st);
      if (st.sect) L.taskHit(st, 'act', t => t.sub === 'retreat');
      if (r.kind === 'ret') res.contrib = L.calRetDone(st);   // 名师讲道：入宗者出关另得贡献
      if (first && !st.visitor && !st.stats.visits) res.visitor = L.spawnVisitor(st);   // 第一位访客固定在首次出关时上门
    }
    L.log(st, done ? `出关！修为 +${L.fmt(r.got)}${res.epi ? '，顿悟再得 ' + L.fmt(res.epi) : ''}` : '提前出关', res.epi ? 'gold' : 'jade');
  }
  L.checkQuests(st);
  return res;
};
// 老祖特训（E17）：约战前 3 季内（剩 ≤ 9 月，AP_PLAN §3.5）、胜算 < 60%、未筑基未圆满、手上没事，第一世只此一次，不收灵石；花 2 点
L.TRAIN_WIN = 9;
L.canTrain = function (st) {
  if (st.rebirth > 0 || st.pact || st.flags.trained || st.p.r > 0 || L.busy(st) || L.isFull(st)) return false;
  const pi = L.pactInfo(st);
  return pi.left <= L.TRAIN_WIN && pi.left >= 1 && pi.p < 0.6;
};
L.startTrain = function (st) {
  if (!L.canTrain(st)) return false;
  st.flags.trained = 1;
  return L.startRetreat(st, { kind: 'train', m: 3 });
};
// 服丹疗伤：一枚破境丹，立刻痊愈。
// TODO SYSTEMS §5：疗伤丹上线后优先用疗伤丹，破境丹作兜底（效果相同）
L.canHeal = st => st.p.inj > 0 && st.pills > 0;
L.heal = function (st) {
  if (!L.canHeal(st)) return false;
  st.pills--; st.p.inj = 0;
  L.log(st, '服下一枚破境丹，伤势痊愈', 'jade');
  return true;
};
});
