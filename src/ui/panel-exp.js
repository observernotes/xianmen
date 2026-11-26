/* 废柴仙途 · 界面片段 panel-exp：历练：地点、确认页（深度 × 行事 × 预计评价）、途中、结算卡、首领
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 数字一律取自逻辑层：L.expForecast（预计评价、负伤风险、灵石）、L.expPreview（途中收获）、L.resolveExp 的结算。 */
// ---------- 历练 ----------
const RATE_CLS = ['r0', 'r1', 'r2', 'r3', 'r4'];   // 丁丙乙甲天
function chipFor(p) { return `<span class="chip ${p >= 0.75 ? 'ok' : p >= 0.4 ? 'warn' : 'bad'}">${L.pct(p)}</span>`; }
function rateChip(f) { return `<span class="chip ${f.lo >= 3 ? 'ok' : f.lo >= 2 ? 'warn' : 'bad'}">${f.text}${f.unknown && !f.first ? '?' : ''}</span>`; }
// 评价印：ART.stamp（天甲乙丙丁，24×24 像素印）按整数倍放大；大印带砸下动画
function stampHTML(r, big) {
  const c = ART.stamp && ART.stamp(4 - r);
  if (c) { const s = pxFit(24, big ? 64 : 24); return `<span class="stamp art ${RATE_CLS[r]}${big ? ' big' : ''}"><img class="px stampimg${big ? ' big' : ''}" src="${urlOf(c, 'stamp|' + r)}" style="width:${s}px;height:${s}px" alt=""><i>${L.RATINGS[r]}</i></span>`; }
  return `<span class="stamp ${RATE_CLS[r]}${big ? ' big' : ''}">${L.RATINGS[r]}</span>`;
}
const cellName = (k, d) => `${L.REGIONS[k].n}·${L.DEPTHS[d]}`;
// 进历练面板时每张图默认选哪一格：上次去过的那一格 > 最高一格“稳拿乙”的深度 > 外围
function defaultCell(st0, k) {
  const le = st0.lastExp;
  let a = le && L.apprOpen(st0, le.a) ? le.a : 0;
  if (le && le.k === k && L.expOpen(st0, k, le.d, a)) return { d: le.d, a };
  let d = 0;
  for (let dd = 2; dd >= 0; dd--) { if (!L.expOpen(st0, k, dd, a)) continue; const f = L.expForecast(st0, k, dd, a); if (f.first || (f.risk <= 0 && f.pOk >= 0.8)) { d = dd; break; } }
  if (!L.expOpen(st0, k, d, a)) a = 0;
  return { d, a };
}
function showExp() {
  if (st.exp) { showExpAway(); return; }
  const best = L.expBest(st);
  const rows = [];
  let lockedShown = false;
  for (let k = 0; k < L.REGIONS.length; k++) {
    const rg = L.REGIONS[k];
    const open = L.regionOpen(st, k) && L.expOpen(st, k, 0, 0);
    if (!open) { void lockedShown; continue; }   // 没开的地方直接不画（docs/ONBOARDING.md §2.3）
    if (L.bossReady(st, k)) {
      const B = L.BOSSES[k], foe = { kind: 'boss', k }, bp = L.TRIP_ON !== false && L.bossP ? L.bossP(st, k) : L.duelP(st, L.duelPower(st, foe), L.bossPower(k), foe), again = !!st.bosses[k];
      rows.push(`<div class="card" data-boss="${k}" style="box-shadow:0 0 0 2px var(--seal)">${bossImg(k, 36)}<div class="main"><div class="seal">${again ? '首领再现' : '首领现身'}：${B.n} ${L.artSlotOpen(st, 1) ? elChip(L.foeEl(foe), !L.foeElKnown(st, foe)) : ''}</div><div class="muted">“${B.line}” · 战力 ${fmt(L.bossPower(k))}</div><div class="muted">${again ? `再战：首领材料 ×1、灵石，35% 掉专属（第 3 次必出）；每 ${L.BOSS_AGAIN} 月一次` : `击败可得天材地宝、首领专属【${B.drop}】、首领材料${L.BOSS_MAT[k]} ×2${L.BOSS_PLAN[k] ? '、器方' : ''}与称号「${B.t}」`}</div></div><div class="right">${chipFor(bp)}<span class="muted">胜算</span></div></div>`);
    }
    const c = defaultCell(st, k), f = L.expForecast(st, k, c.d, c.a);
    const bb = Math.max(0, ...[0, 1, 2].map(d => L.bestOf(st, k, d)));
    const el = L.elemKnown(st, k) && UI.isOpen('zhanji') ? ` · ${L.elemName(k)}` : '';
    rows.push(`<div class="card" data-k="${k}"><div class="main"><div class="line"><span>${rg.n}</span>${best.k === k ? '<span class="chip ok">荐</span>' : ''}<span class="muted">${L.expLen(k)} 月${el}</span></div>
      <div class="muted num">推荐战力 ${fmt(L.rec(k, c.d))}${bb ? ` · 最高 ${L.RATINGS[bb]}` : ''}</div></div>
      <div class="right">${rateChip(f)}<span class="muted">${L.DEPTHS[c.d]}·${L.APPR[c.a].n}</span></div></div>`);
  }
  const s = sheet({ title: '外出历练', sub: `你的战力 ${fmt(L.power(st))}`, body: (UI.isOpen('realm') ? realmExpCard() : '') + rows.reverse().join('') });
  bindRealmCard(s);   // 秘境一格（panel-realm.js）
  s.querySelectorAll('.card[data-k]').forEach(c => c.onclick = () => { SFX.tap(); const k = +c.dataset.k, dc = defaultCell(st, k); confirmExp(k, dc.d, dc.a); });
  s.querySelectorAll('.card[data-boss]').forEach(c => c.onclick = () => { SFX.tap(); fightBossUI(+c.dataset.boss); });
}
// 途中：进度、到目前为止的收获、撤回（收获减半立即回家）
function showExpAway() {
  const e = st.exp, rg = L.REGIONS[e.k], pv = L.expPreview(st);
  const sum = st.expSum;
  sheet({ title: '历练中', body: `<div class="card flat"><div class="main"><div>【${cellName(e.k, e.d)}】${L.APPR[e.a].n}${e.chain ? ` · 还要连续 ${e.chain} 趟` : ''}</div><div class="muted">${rg.desc}</div>${bar((e.total - e.left) / e.total, true)}<div class="muted">还需 ${e.left} 月归来</div></div></div>
    <dl class="grid2"><dt>灵石</dt><dd class="num">+${fmt(pv.stones)}</dd><dt>灵草</dt><dd class="num">+${fmt(pv.herbs)}</dd><dt>宝物</dt><dd class="num">${pv.finds ? pv.finds + ' 件（回来揭晓）' : '—'}</dd>${pv.xp > 0 ? `<dt>感悟</dt><dd class="num">+${fmt(pv.xp)}</dd>` : ''}</dl>
    ${sum ? `<p class="muted">之前 ${sum.n} 趟已得：灵石 ${fmt(sum.stones)}、灵草 ${fmt(sum.herbs)}</p>` : ''}
    <p class="muted">${e.nodes ? `第 ${Math.min(e.ni + 1, e.nodes.length)} / ${e.nodes.length} 个节点 · 气血 ${Math.round((e.hp || 0) * 100)}%；评价按打出来的定。` : '评价在出发时就定了，回来揭晓。'}历练途中修炼 ×0.5。撤回：本趟收获减半，没有宝物，立刻回家。</p>`,
    foot: [{ t: '撤回', alt: true, fn: () => { const r = L.recallExp(st); closeModal(); if (r) pushPopup(() => showExpResult(r)); } }, { t: '继续', gold: true, fn: closeModal }] });
}
function fightBossUI(k) {
  // 回合战（battle.js）：在场景里真打一场，打完 bossResultUI 出结果
  if (L.TRIP_ON !== false && typeof btBossStart === 'function') { closeModal(); btBossStart(k); return; }
  const res = L.fightBoss(st, k);
  if (!res) return;
  const B = res.B;
  const it = res.item;
  duel({
    title: '首领 · ' + B.n, intro: `【${L.REGIONS[k].n}】深处，${B.n}挡住了去路。`,
    right: { img: bossImg(k, 66), name: B.n, sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    stage: 'wild', foe: ftBoss(k),
    quote: `${B.n}：“${B.line}”`,
    winText: !res.win ? '' : res.again ? `再败${esc(B.n)}！<div class="fxlist"><span>${L.BOSS_MAT[k]} +${res.mat}</span><span>灵石 +${fmt(res.stones)}</span></div>`
      : `斩杀${esc(B.n)}！获得称号「${esc(B.t)}」<div class="fxlist"><span>天材地宝 +${res.treasure}</span><span>灵石 +${fmt(res.stones)}</span><span>灵草 +${fmt(res.herbs)}</span><span>${L.BOSS_MAT[k]} +${res.mat}</span>${res.planText && !res.cards ? `<span>${esc(res.planText)}</span>` : ''}</div>${res.cards ? '' : (it ? gearLine(it) : '') + (res.art ? artLine(res.art) : '')}`,
    loseText: '首领太强，重伤而归（负伤 4 月）。变强之后再来！',
    // 首领的牌（loot.js 的 L.bossLoot）：对决演完再翻
    done: () => { if (res.win && res.cards && res.cards.length) showLootFlip(res.cards, null, { title: `${esc(B.n)} · 翻牌` }); else closeModal(); },
  });
}
// 出发确认页：深度一排、行事一排、预计评价与负伤风险（L.expForecast 算出的分布）
let expOpt = { chain: false, escort: false };
function confirmExp(k, d, a, still) {
  const rg = L.REGIONS[k];
  if (!L.expOpen(st, k, d, a)) { d = 0; a = L.apprOpen(st, a) && L.expOpen(st, k, 0, a) ? a : 0; }
  const f = L.expForecast(st, k, d, a);
  const depOk = dd => L.depthOpen(st, k, dd) && L.expOpen(st, k, dd, a), apprOk = aa => L.apprOpen(st, aa) && L.expOpen(st, k, d, aa);
  const dep = [0, 1, 2].filter(dd => dd === d || depOk(dd)).map(dd => {
    const ok = depOk(dd);
    const why = !ok ? (L.firstTrip(st) && dd ? '第一趟只去外围' : `${L.DEPTHS[dd - 1]}评价乙后开放`) : `推荐 ${fmt(L.rec(k, dd))}`;
    return `<button class="segb ${dd === d ? 'on' : ''}" data-d="${dd}" ${ok ? '' : 'disabled'}><b>${L.DEPTHS[dd]}</b><small>${why}</small></button>`;
  }).join('');
  const nDep = [0, 1, 2].filter(dd => dd === d || depOk(dd)).length, nAppr = [0, 1, 2].filter(aa => aa === a || apprOk(aa)).length;
  const appr = [0, 1, 2].filter(aa => aa === a || apprOk(aa)).map(aa => {
    const ok = apprOk(aa);
    const why = !L.apprOpen(st, aa) ? (aa === 2 ? '第二趟解锁' : '第四趟解锁') : !ok ? '第一趟先斩妖' : `相性 ${L.affSym(st, k, aa)}`;
    return `<button class="segb ${aa === a ? 'on' : ''}" data-a="${aa}" ${ok ? '' : 'disabled'}><b>${L.APPR[aa].n}</b><small>${why}</small></button>`;
  }).join('');
  const notes = [];
  if (f.first) notes.push(L.TRIP_ON !== false ? '<div class="quote">第一趟只有小怪：必得一把剑</div>' : '<div class="quote">第一趟老祖护着：必得甲</div>');
  if (f.warnFull) notes.push(`<div class="seal">修为已经满了，再出去是白跑（溢出的修为最多存下一层的两成）。先回来突破${L.REALMS[Math.min(st.p.r + 1, 8)].n}。</div>`);
  if (f.warnInj) notes.push(`<div class="seal">带伤出门，战力只剩六成，预计评价 ${f.text}。吃一枚破境丹就好，或者歇 ${f.warnInj} 个月。</div>`);
  // 大节点前（docs/KAIRO_PLAN.md §3.3 第 4 条）：回不来的行程不让出发；正好等长的提前一月赶回来（收获按走过的月数折算）
  const blk = L.expBlock ? L.expBlock(st, k) : null, cutI = !blk && L.expCut ? L.expCut(st, k) : null;
  if (blk) notes.push(`<div class="seal">${esc(blk.big.n)}还有 ${blk.left} ${UNIT}，这一趟要 ${f.len} ${UNIT}，回不来。</div>`);
  else if (cutI) notes.push(`<div class="quote">${esc(cutI.big.n)}前会赶回来：只走 ${cutI.months} ${UNIT}，收获按 ${cutI.months}/${f.len} 算。</div>`);
  if (f.leap) notes.push(`<div class="seal">越级挑战：战力不到推荐的${Math.round(L.artExp(st, k, d, a).leap * 100)}%。评价乙以上奖励再 ×2。</div>`);
  const fine = [];   // 次要的说明：收进“详情”
  if (f.affUnknown && !f.first && nAppr > 1) fine.push('<div class="muted">这一格的相性还没试过，按 ○ 估算；去一趟就知道了。</div>');
  if (f.elemUnknown && !f.first && UI.isOpen('zhanji')) fine.push('<div class="muted">此地五行还不知道，克制的 ±8 分没算进预计。</div>');
  const escortT = st.sect && st.sect.tasks ? st.sect.tasks.findIndex(t => t.ty === 'escort' && t.taken && !t.done && t.k === k) : -1;
  const opts = [];
  if (L.chainOpen(st)) opts.push(`<div class="check ${expOpt.chain ? 'on' : ''}" data-opt="chain"><span class="box"></span><span class="grow">连续 ×3</span></div>`);
  if (escortT >= 0) opts.push(`<div class="check ${expOpt.escort ? 'on' : ''}" data-opt="escort"><span class="box"></span><span class="grow">护送同门：贡献 ×3</span></div>`);
  const dist = f.first ? '' : `<div class="muted num">丁 ${L.pct(f.dist[0])} · 丙 ${L.pct(f.dist[1])} · 乙 ${L.pct(f.dist[2])} · 甲 ${L.pct(f.dist[3])} · 天 ${L.pct(f.dist[4])}</div>`;
  const yrs = f.len * L.REALMS[Math.min(st.p.r, 8)].mpt;
  const s = sheet({
    title: rg.n, center: true, still,
    body: `${typeof btPrepHTML === 'function' && L.TRIP_ON !== false ? btPrepHTML(k, d, a) : UI.isOpen('zhanji') ? elemLine(k) : ''}
      ${nDep > 1 ? `<div class="muted">深度</div><div class="seg" id="expDepth">${dep}</div>` : ''}
      ${nAppr > 1 ? `<div class="muted">行事</div><div class="seg" id="expAppr">${appr}</div>` : ''}${typeof compExpLine === 'function' && UI.isOpen('comp') ? compExpLine(k, d, a) : ''}
      <div class="center"><div class="muted">战力 ${fmt(f.T)} / 推荐 ${fmt(f.rec)}</div><div class="big ${f.lo >= 3 ? 'jadet' : f.lo >= 2 ? 'goldt' : 'seal'}" id="expRate" style="font-size:calc(var(--fs)*3)">${f.text}</div>
      <div class="num">灵石约 <b>${fmt(f.stones)}</b>${escortT >= 0 && expOpt.escort ? '（护送：归宗门）' : ''} · ${f.len} 月${f.risk > 0 ? ` · <span class="seal">负伤风险 ${L.pct(f.risk)}</span>` : ''}</div></div>
      ${notes.join('')}${opts.join('')}
      ${dist}${lootPrepHTML(k, d)}`,
    foot: [{ t: '返回', alt: true, fn: showExp }].concat(!blk && L.quickOk && L.quickOk(st, k, d, a) ? [{ t: '速战', alt: true, fn: () => { if (L.startExp(st, k, d, a)) { st.exp.quick = 1; SFX.coin(); closeModal(); } } }] : []).concat(f.warnInj && L.canHeal(st) ? [{ t: '服丹疗伤', alt: true, fn: () => { L.heal(st); SFX.coin(); confirmExp(k, d, a, true); } }] : []).concat([{ t: blk ? blk.why : '出发', gold: !blk, disabled: !!blk, fn: () => {
      const o = { chain: expOpt.chain && L.chainOpen(st) ? 3 : 0 };
      if (escortT >= 0 && expOpt.escort) o.escort = escortT;
      if (L.startExp(st, k, d, a, o)) { SFX.coin(); expOpt.escort = false; closeModal(); }
    } }]),
  });
  s.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { SFX.tap(); confirmExp(k, +b.dataset.d, a, true); });
  s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { SFX.tap(); confirmExp(k, d, +b.dataset.a, true); });
  s.querySelectorAll('[data-swapz]').forEach(b => b.onclick = () => { if (L.equipArt(st, b.dataset.swapz)) { SFX.coin(); btSwapOpen = false; confirmExp(k, d, a, true); } });
  s.querySelectorAll('[data-btswap]').forEach(b => b.onclick = () => { SFX.tap(); btSwapOpen = !btSwapOpen; confirmExp(k, d, a, true); });
  s.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { SFX.tap(); expOpt[b.dataset.opt] = !expOpt[b.dataset.opt]; confirmExp(k, d, a, true); });
  if (typeof bindCompExp === 'function') bindCompExp(s, () => confirmExp(k, d, a, true));   // 同伴位（panel-people.js）
  bindLootPrep(s, k, d, () => confirmExp(k, d, a, true));   // 这里掉什么、心愿（loot.js）
}
function itemLine(it) {
  if (it.kind === 'a') return artLine(it);
  if (it.gear) return gearLine(it);
  if (it.kind === 'pet') return petLine(it);   // panel-pets.js
  return '';
}
// 掉落翻牌（ART_API 阶段四 4）：按这趟最高品阶的掉落立一道 ART.dropBeam 光柱，卡背翻过来露出那件东西的图标
// 品阶 1～7：功法 L.art().t、法宝 gear.t、灵宠 tier；光柱 24×48 按整数倍放大，底心 (12, 44)，卡片上沿压在 y = 30
function dropTop(items) {
  let top = null;
  for (const it of items || []) {
    const t = it.kind === 'a' ? (L.art(it.art) || {}).t : it.gear ? it.gear.t : it.kind === 'pet' ? it.tier : 0;
    if (t && (!top || t > top.t)) top = { it, t: Math.max(1, Math.min(7, t | 0)) };
  }
  return top;
}
function dropFlipHTML(items) {
  const top = ART.dropBeam && dropTop(items);
  if (!top) return '';
  const it = top.it, n = items.filter(x => x && (x.kind === 'a' || x.gear || x.kind === 'pet')).length;
  const W0 = pxFit(24, 48), z = W0 / 24, col = ART.beamColor(top.t);
  const ic = it.kind === 'a' ? artImg(it.art, 2) : it.gear ? gearImg(it.gear, 2) : petCardImg(it.sp, 0, 0, 1);
  const tn = it.kind === 'a' ? L.artTierName(top.t) : it.gear ? L.gearTierName(it.gear.slot, top.t) : top.t + ' 阶';
  return `<div class="dflip" aria-hidden="true"><div class="dflip-box" style="width:${W0}px;height:${Math.round(52 * z)}px">
    <canvas class="px dflip-beam" width="24" height="48" data-tier="${top.t}" style="width:${W0}px;height:${W0 * 2}px"></canvas>
    <div class="dflip-card" style="left:${Math.round(2 * z)}px;top:${Math.round(30 * z)}px;width:${Math.round(20 * z)}px;height:${Math.round(20 * z)}px;--bc:${col}"><i class="dflip-back"></i><i class="dflip-front">${ic}</i></div></div>
    <div class="dflip-t" style="color:${col}">${esc(tn)}${n > 1 ? ` <small>等 ${n} 件</small>` : ''}</div></div>`;
}
// 光柱逐帧（ART.beamFrames 帧 × 110 毫秒循环），卡片翻开（约 0.4 秒）之后才亮；结算卡关掉就停
function dropFlipRun(root) {
  const cv = root && root.querySelector('.dflip-beam');
  if (!cv) return;
  const g = cv.getContext('2d'), tier = +cv.dataset.tier, n = ART.beamFrames || 4, t0 = performance.now();
  let f = 0;
  const step = () => {
    if (!cv.isConnected) return;
    const k = Math.min(1, Math.max(0, (performance.now() - t0 - 300) / 250));
    g.clearRect(0, 0, 24, 48);
    if (k > 0) { g.globalAlpha = k; g.drawImage(ART.dropBeam(tier, f % n), 0, 0); g.globalAlpha = 1; }
    f++;
    setTimeout(step, 110);
  };
  step();
}
function deltaHTML(res) {
  const d = [];
  const arrow = (a, b) => (b > a ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (res.pw1 !== undefined && fmt(res.pw1) !== fmt(res.pw0)) d.push(`<dt>战力</dt><dd class="num">${fmt(res.pw0)} → <b>${fmt(res.pw1)}</b> ${arrow(res.pw0, res.pw1)}</dd>`);
  if (res.gain1 !== undefined && dec(res.gain1) !== dec(res.gain0)) d.push(`<dt>修炼/月</dt><dd class="num">+${dec(res.gain0)} → <b>+${dec(res.gain1)}</b> ${arrow(res.gain0, res.gain1)}</dd>`);
  if (!st.pact && res.pw1 !== undefined) {
    const a = L.pactAssist(st), dm = L.duelPower(st, L.PACT_FOE) / L.power(st), p0 = L.duelP(st, res.pw0 * dm * a, L.PACT_POWER, L.PACT_FOE), p1 = L.duelP(st, res.pw1 * dm * a, L.PACT_POWER, L.PACT_FOE);
    if (L.pct(p0) !== L.pct(p1)) d.push(`<dt>约战胜算</dt><dd class="num">${L.pct(p0)} → <b>${L.pct(p1)}</b> ${arrow(p0, p1)}</dd>`);
  }
  return d.length ? `<dl class="grid2 delta">${d.join('')}</dl>` : '';
}
// 结算卡（docs/KAIRO_PLAN.md §6.1，示意图 05_exp_result.png）：一趟（或连续三趟合并）只一张，从上到下——
// 标题“历练归来 · 地点 · 用了 N 月”+ 评价印；拿到的三格；新法宝 / 功法一行对比（第一件“已戴上”，之后【换上】【先收着】）；
// 你变强了：战力 前 → 后、修为条（旧青新金）；离目标：本章目标条 前 → 后、“还有 N 月 · 够再去 M 趟”；你不在时（纸鹤汇总）；【回洞府】【再去一趟 ▸】
// 出发前快照：线 1 在 L.startExp 里记的 st.exp.snap（没有时用界面自己记的 tripSnap：出发后第一次刷新主画面时记下）
let tripSnap = null;
function tripSnapNow() {
  if (!st || !st.exp) return;
  if (tripSnap && tripSnap.e === st.exp) return;
  const g = L.goalNow(st);
  tripSnap = { e: st.exp, pw: L.power(st), xp: st.p.xp, r: st.p.r, s: st.p.s, need: L.pNeed(st.p), gv: Math.max(0, Math.min(1, g.bar.v / (g.bar.max || 1))), gt: g.bar.text, ch: g.ch, total: st.exp.total, pact: st.pact ? null : L.pactInfo(st).p };
  if (st.exp.snap) Object.assign(tripSnap, { pw: st.exp.snap.pw !== undefined ? st.exp.snap.pw : tripSnap.pw, xp: st.exp.snap.xp !== undefined ? st.exp.snap.xp : tripSnap.xp });
}
function showExpResult(res) {
  // 归途翻牌就在这张结算卡上（评价章之后、“你变强了”之前；示意图 04_loot.png）：见下面的 lootFlipHTML / lootFlipRun（src/ui/loot.js）
  lastExp = res;
  saveLocal('归来');   // 关键节点存一份（自动档轮换，saves.js）
  const rg = L.REGIONS[res.k];
  if (res.legacy) {
    const lines = [`<div class="center">${stampHTML(res.rating, true)}</div><p class="center">旧存档里那趟历练按旧规矩结算：灵石 +${fmt(res.stones)}${res.inj ? `，负伤 3 ${MO()}` : ''}。</p>`, deltaHTML(res)];
    sheet({ title: `归来 · ${rg.n}`, center: true, body: lines.join(''), foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
    return;
  }
  const sn = tripSnap && (!tripSnap.e || tripSnap.e.k === res.k) ? tripSnap : null; tripSnap = null;
  const pw0 = sn ? sn.pw : res.pw0, pw1 = L.power(st);
  const used = res.sum ? res.sum.n * (sn ? sn.total : L.expLen(res.k, st)) : sn ? sn.total : L.expLen(res.k, st);
  const lines = [];
  // 评价
  lines.push(`<div class="krow"><span class="k">${res.recall ? '中途折返' : '评价'}</span><span class="v s">推荐 ${fmt(L.rec(res.k, res.d))}</span><div class="kstamp">${L.RATINGS[res.rating]}</div></div>`);
  // 回合战的战况（COMBAT_LOOT §5.5 第 1 条）与“带 X 系来：预计 甲”（§4.2）
  if (res.bt && res.bt.nf) {
    const b = res.bt, all = b.won >= b.nf;
    lines.push(`<div class="krow"><span class="k">战况</span><span class="v s">${all ? `${b.nf === 3 ? '三' : b.nf} 场全胜` : b.dead ? `倒在第 ${b.won + 1} 场` : `过了 ${b.won} / ${b.nf} 场`} · 剩气血 ${Math.round((b.hp || 0) * 100)}%${b.brk ? ` · 破招 ${b.brk} 次` : ''}</span></div>`);
    const tr = res.rating < 3 && !res.recall && L.btSwapTry ? L.btSwapTry(st, res.k, res.d, res.a) : null;
    if (tr && tr.lo > res.rating) lines.push(`<div class="krow"><span class="k">换招</span><span class="v kup">带${L.elName(tr.el)}系来：预计 ${L.RATINGS[tr.lo]}</span><button class="kb alt" data-btgo="${tr.id}">去换</button></div>`);
  }
  // 拿到的：有就画，没有不占位（最多四格，其余一行小字）
  const loot = [];
  if (res.stones) loot.push(`${artIcon('stone', 16)} +${fmt(res.stones)}`);
  if (res.herbs) loot.push(`${artIcon('herb', 16)} +${fmt(res.herbs)}`);
  if (res.xp > 0) loot.push(`${artIcon('xp', 16)} +${fmt(res.xp)}`);
  if (res.ore) loot.push(`${artIcon('ore', 16)} +${fmt(res.ore)}`);
  if (res.feed) loot.push(`${artIcon('feed', 16)} +${res.feed}`);
  if (res.pills) loot.push(`${artIcon('pojing', 16)} +${res.pills}`);
  if (res.treasure) loot.push(`${artIcon('treasure', 16)} +${res.treasure}`);
  if (res.contrib) loot.push(`${artIcon('contrib', 16)} +${fmt(res.contrib)}`);
  if (loot.length) lines.push(`<div class="kloot">${loot.slice(0, 4).map(x => `<div>${x}</div>`).join('')}</div>` + (loot.length > 4 ? `<div class="kloot">${loot.slice(4, 8).map(x => `<div>${x}</div>`).join('')}</div>` : ''));
  // 归途翻牌（src/ui/loot.js；牌里的法宝、功法翻开后在牌下出对比行），牌以外的（灵宠、仙府秘藏）照旧一行一件
  const cards = res.sum ? res.sum.cards : res.cards, inCards = new Set((cards || []).map(c => c.item).filter(Boolean));
  const dz = res.deeper || (res.cards && res.cards.deeper), dLost = res.deeperLost || (res.cards && res.cards.deeperLost);
  if (dz) lines.push(`<div class="krow"><span class="k">趁势深入</span><span class="v ${dz === 'win' ? 'kup' : 'kdn'}">${dz === 'win' ? '赢了 · 多翻 2 张' : `输了${dLost && dLost.length ? ' · 丢了' + esc(dLost.join('、')) : ''}`}</span></div>`);
  if (cards && cards.length) lines.push(lootFlipHTML(cards));
  // 趁势深入（loot.js 的 L.startDeeper，§5.7）：甲以上、下一层还有，不回家直接打下一层的精英
  const deepOk = !dz && !res.sum && !res.first && L.startDeeper && L.deeperOk(st, L.tripOf(res)) && !(L.tripBlock && L.tripBlock(st, L.DEEPER.len, false));
  if (deepOk) lines.push(`<div class="kslot lt-deep"><div class="mid"><div class="nm">再深一层 · ${L.DEPTHS[res.d + 1]}精英</div><small>赢：多翻 2 张、星率 ×1.5 · 输：牌丢一半</small></div><button class="kb" id="ltDeep">去 ▸<br><small>+${L.DEEPER.len} ${MO()}</small></button></div>`);
  // 新法宝 / 功法 / 灵宠：第一件“已戴上”；待定的【换上】【先收着】（先收着 = 留在【装备】的“新到”里，不熔）
  for (const it of res.items) {
    if (inCards.has(it)) continue;
    if (it.gear) {
      const x = it.gear, B = L.gearBase(x.id), cell = `<div class="cell">${qcellHTML(x.t, gearImg(x, 2), 2)}</div>`;
      if (it.pend && L.gearPend(st, x.u)) {
        const D = L.gearDelta(st, x), dp = D.b.p - D.a.p;
        lines.push(`<div class="kslot${D.better ? ' hot' : ''}" data-krow="${x.u}">${cell}<div class="mid"><div class="nm" style="color:${pnTierInk(x.t)}">${esc(B.n)} <span class="kdn" style="font-size:14px">新</span></div><small>${Math.abs(dp) >= 1 ? `战力 <span class="${dp >= 0 ? 'kup' : 'kdn'}" style="font-size:16px">${dp >= 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(dp))}</span>` : esc(gearKey(x))}</small></div><button class="kb ${D.better ? 'red' : 'alt'}" data-req="${x.u}">换上</button><button class="kb alt" data-rkeep="${x.u}">先收着</button></div>`);
      } else if (it.equip || st.gear[x.slot] === x) lines.push(`<div class="kslot">${cell}<div class="mid"><div class="nm" style="color:${pnTierInk(x.t)}">${esc(B.n)}</div><small>${esc(gearKey(x))}</small></div><span class="chip ok">已戴上</span></div>`);
      else if (it.hold) lines.push(`<div class="kslot">${cell}<div class="mid"><div class="nm">${esc(B.n)}</div><small>${L.GEAR_N[x.slot]}槽${esc(L.gearOpenWhy(st, x.slot).replace('开放', '开'))}</small></div><span class="chip">收着</span></div>`);
      else if (it.smelt !== undefined) lines.push(`<div class="kslot">${cell}<div class="mid"><div class="nm">${esc(B.n)}</div><small>不如身上的 · 熔成灵矿 +${it.smelt}</small></div></div>`);
    } else { const h = itemLine(it); if (h) lines.push(h); }
  }
  if (res.planText) lines.push(`<div class="quote row">${scrollImg()}<span class="grow">${esc(cut(res.planText, 24))}</span></div>`);
  for (const u of res.unlock || []) lines.push(`<div class="krow"><span class="k">${artIcon('unlock', 16)}</span><span class="v kup nm">${esc(cut(u, 16))}</span></div>`);
  if (res.inj) lines.push(`<div class="krow"><span class="k">负伤</span><span class="v kdn">${res.inj} ${MO()} · 战力 ×${dec2(L.injAtk(st))}</span></div>`);
  if (res.lifeCost) lines.push(`<div class="krow"><span class="k">血遁</span><span class="v kdn">寿元 −${fmt(res.lifeCost)} 年</span></div>`);
  if (typeof compResLine === 'function') { const c = compResLine(res); if (c) lines.push(c); }
  // 你变强了
  lines.push(`<div class="ksec"><span>你变强了</span></div>`);
  lines.push(`<div class="krow"><span class="k">战力</span><span class="v">${fmt(pw0)} → <span class="big">${fmt(pw1)}</span>${pw1 > pw0 + 0.5 ? ` <span class="kup" style="font-size:14px">▲${fmt(pw1 - pw0)}</span>` : ''}</span></div>`);
  if (st.p.r <= L.MAXR) {
    const need = L.pNeed(st.p), same = sn && sn.r === st.p.r && sn.s === st.p.s;
    const a = same ? Math.min(1, sn.xp / need) : 0, b = Math.min(1, st.p.xp / need);
    lines.push(`<div class="krow"><span class="k">修为</span><div class="kpbar"><i class="dl" style="width:${(b * 100).toFixed(1)}%"></i><i style="width:${(a * 100).toFixed(1)}%"></i></div><span class="s">${fmt(st.p.xp)}/${fmt(need)}</span></div>`);
  }
  // 离目标：本章目标条 前 → 后；下一个大节点还有几月、够再去几趟
  const g = L.goalNow(st), bn = L.bigNext(st);
  const nb1 = b => Math.max(0, Math.min(1, b.v / (b.max || 1))), gv1 = nb1(g.bar), gv0 = sn && sn.ch === g.ch ? sn.gv : gv1;
  const isPct = /%/.test(g.bar.text), pctOf = v => Math.round(v * (g.ch === 0 && !st.pact ? 80 : 100));
  lines.push(`<div class="ksec"><span>离目标</span></div>`);
  lines.push(`<div class="krow"><span class="k">${esc(cut((g.prog && g.prog[0] && g.prog[0].t) || g.bar.text.split(' ')[0] || '目标', 4))}</span><div class="kpbar"><i class="dl" style="width:${(Math.max(gv0, gv1) * 100).toFixed(1)}%"></i><i style="width:${(Math.min(gv0, gv1) * 100).toFixed(1)}%"></i></div><span class="s">${isPct ? `${pctOf(gv0)}→<span class="kup">${pctOf(gv1)}%</span>` : esc(cut(g.bar.text, 10))}</span></div>`);
  if (bn) { const n = Math.floor(Math.max(0, bn.left - 1) / Math.max(1, L.expLen(res.k, st))); lines.push(`<div class="krow"><span class="k">${esc(cut(bn.n, 5))}</span><span class="v kdn">还有 ${bn.left} ${MO()}</span><span class="s">可去 ${n} 趟</span></div>`); }
  // 丁 / 丙（卡住）：变强建议的第一张（头就是这一格，KAIRO_PLAN §10.7），【去换】进变强页
  let stuckA = null;
  if (!res.first && !res.recall && res.rating <= 1 && !lines.some(x => /data-btgo/.test(x))) { const A = L.advise(st, 'goal'); stuckA = A.head.kind === 'stuck' && A.acts[0] && A.acts[0].id !== 'idle' ? A.acts[0] : null; }
  if (stuckA) lines.push(`<div class="kslot"><div class="cell">${gwIc(stuckA.icon, 32)}</div><div class="mid"><div class="nm">${esc(stuckA.say)}</div><small>${esc(stuckA.gain.text)} ${esc(stuckA.gain.sub || '')}</small></div><button class="kb alt" id="kGrow">${/^(swap|art|equip|infuse)/.test(stuckA.cls) ? '去换' : '去看'}</button></div>`);
  // 你不在时：纸鹤汇总（线 1 的 L.mailAway）
  const awayT = L.mailAwayText ? L.mailAwayText(st) : '';
  if (awayT) { lines.push(`<div class="kaway">${artIcon('mail', 16)}<span class="klog">${esc(awayT)}</span></div>`); if (L.mailAwayClear) L.mailAwayClear(st); }
  if (res.rating >= 2) SFX.coin(); else SFX.fail();
  // 第一张只有【回洞府】；修为圆满换成【回去突破】，负伤换成【回去疗伤】，否则【再去一趟 ▸】
  const foot = [{ t: '回洞府', alt: true, fn: closeModal }];
  if (!res.first) {
    const blk = L.expBlock ? L.expBlock(st, res.k, res.d, res.a) : null;
    if (L.isReady(st)) foot.push({ t: '回去突破', gold: true, fn: () => { closeModal(); showBreakthrough(); } });
    else if (st.p.inj > 0) foot.push({ t: '回去疗伤', gold: true, fn: () => { closeModal(); showHome(); } });
    else if (L.expOpen(st, res.k, res.d, res.a) && !L.busy(st)) foot.push({ t: blk ? blk.why : '再去一趟 ▸', gold: !blk, disabled: !!blk, fn: () => { closeModal(); if (L.startExp(st, res.k, res.d, res.a)) SFX.coin(); } });
  }
  if (foot.length === 1) { foot[0].alt = false; foot[0].gold = true; }
  const s = sheet({ title: `历练归来<span class="hn">${esc(rg.n)} · 用了 ${used} ${MO()}</span>`, body: lines.join(''), foot });
  if (cards && cards.length) lootFlipRun(s, cards, { onWish: () => { closeModal(); confirmExp(res.k, res.d, res.a); } });
  const dp = s.querySelector('#ltDeep'); if (dp) dp.onclick = () => { if (L.startDeeper(st, res)) { SFX.coin(); closeModal(); updateHUD(); } };
  const done = (u, msg) => { const r = s.querySelector(`[data-krow="${u}"]`); if (r) swapKeep(r, `<div class="krow"><span class="v kup">${msg}</span></div>`); updateHUD(); };
  s.querySelectorAll('[data-req]').forEach(b => b.onclick = () => { const u = +b.dataset.req, r = L.gearDecide(st, u, 'equip'); if (!r) return; SFX.coin(); done(u, `已换上【${esc(L.gearBase(r.x.id).n)}】· 战力 ${fmt(L.power(st))}`); });
  { const kg = s.querySelector('#kGrow'); if (kg) kg.onclick = () => { SFX.tap(); closeModal(); showGrowth('goal'); }; }
  s.querySelectorAll('[data-btgo]').forEach(b => b.onclick = () => { SFX.tap(); closeModal(); showGrowth('goal'); });   // 【去换】→ 变强页，头就是这一格（KAIRO_PLAN §10.7）
  s.querySelectorAll('[data-rkeep]').forEach(b => b.onclick = () => { SFX.tap(); done(+b.dataset.rkeep, '收进【装备】的“新到”'); });
}
// 确认页里法宝带来的分数与灵矿（法衣、锋锐、克 X；灵矿约多少）：分数已算进上面的预计评价
function gearExpLine(k, d, a) {
  const parts = L.expExtraParts(st, k, d, a).filter(x => x[2] === 'gear'), f = L.expForecast(st, k, d, a);
  const bits = parts.map(x => `${esc(x[0])} +${dec(x[1])}`);
  if (L.gearAffN(st, 'qingling')) bits.push('轻灵：时长 −1');
  if (L.gearHuzhuReady(st)) bits.push('护主：这趟丁等不负伤');
  return `<div class="muted gexp">${oreImg(pxs(8, 2))} 灵矿约 ${fmt(f.ore)}${bits.length ? ' · 法宝：' + bits.join(' · ') : ''}</div>`;
}
// 首领回合战打完（battle.js 的 btBossEnd 调）：结果卡
function bossResultUI(k, res) {
  const B = res.B, it = res.item;
  const body = !res.win ? `<div class="center">${stampHTML(0, true)}</div><p class="center">${esc(B.n)}太强，重伤而归（负伤 4 ${MO()}）。变强之后再来！</p>`
    : res.again ? `<p class="center">再败${esc(B.n)}！</p><div class="fxlist"><span>${L.BOSS_MAT[k]} +${res.mat}</span><span>灵石 +${fmt(res.stones)}</span></div>`
    : `<p class="center">斩杀${esc(B.n)}！获得称号「${esc(B.t)}」</p><div class="fxlist"><span>天材地宝 +${res.treasure}</span><span>灵石 +${fmt(res.stones)}</span><span>灵草 +${fmt(res.herbs)}</span><span>${L.BOSS_MAT[k]} +${res.mat}</span>${res.planText && !res.cards ? `<span>${esc(res.planText)}</span>` : ''}</div>${res.cards ? '' : (it ? gearLine(it) : '') + (res.art ? artLine(res.art) : '')}`;
  if (res.win) SFX.victory(); else SFX.defeat();
  // 首领的牌（loot.js 的 L.bossLoot：首杀 3 张固定，再战 1 张）：就翻在这张卡上
  const cards = res.win && res.cards && res.cards.length ? res.cards : null;
  const s = sheet({ title: '首领 · ' + B.n, center: true, body: body + (cards ? lootFlipHTML(cards) : ''), foot: [{ t: '好', gold: true, fn: closeModal }] });
  if (cards) lootFlipRun(s, cards);
  if (typeof bindEquipButtons === 'function') bindEquipButtons(s);
}
