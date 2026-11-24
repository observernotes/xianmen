/* 废柴仙途 · 界面片段 panel-exp：历练：地点、确认页（深度 × 行事 × 预计评价）、途中、结算卡、首领
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 数字一律取自逻辑层：L.expForecast（预计评价、负伤风险、灵石）、L.expPreview（途中收获）、L.resolveExp 的结算。 */
// ---------- 历练 ----------
const RATE_CLS = ['r0', 'r1', 'r2', 'r3', 'r4'];   // 丁丙乙甲天
function chipFor(p) { return `<span class="chip ${p >= 0.75 ? 'ok' : p >= 0.4 ? 'warn' : 'bad'}">${L.pct(p)}</span>`; }
function rateChip(f) { return `<span class="chip ${f.lo >= 3 ? 'ok' : f.lo >= 2 ? 'warn' : 'bad'}">${f.text}${f.unknown && !f.first ? '?' : ''}</span>`; }
function stampHTML(r, big) { return `<span class="stamp ${RATE_CLS[r]}${big ? ' big' : ''}">${L.RATINGS[r]}</span>`; }
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
    if (!open) {
      if (lockedShown) continue;
      lockedShown = true;
      const why = L.firstTrip(st) ? '先走完第一趟' : L.regionLock(st, k);
      rows.push(`<div class="card flat" style="opacity:.6"><div class="main"><div>${rg.n}</div><div class="muted">${why}</div></div><div class="right"><span class="chip">未开放</span></div></div>`);
      continue;
    }
    if (L.bossReady(st, k)) {
      const B = L.BOSSES[k], foe = { kind: 'boss', k }, bp = L.duelP(st, L.duelPower(st, foe), L.bossPower(k), foe);
      rows.push(`<div class="card" data-boss="${k}" style="box-shadow:0 0 0 2px var(--seal)">${bossImg(k, 36)}<div class="main"><div class="seal">首领现身：${B.n} ${L.artSlotOpen(st, 1) ? elChip(L.foeEl(foe), !L.foeElKnown(st, foe)) : ''}</div><div class="muted">“${B.line}” · 战力 ${fmt(L.bossPower(k))}</div><div class="muted">击败可得天材地宝、首领掉落【${B.drop}】与称号「${B.t}」</div></div><div class="right">${chipFor(bp)}<span class="muted">胜算</span></div></div>`);
    }
    const c = defaultCell(st, k), f = L.expForecast(st, k, c.d, c.a);
    const bests = [0, 1, 2].map(d => { const b = L.bestOf(st, k, d); return `${L.DEPTHS[d]} ${b ? L.RATINGS[b] : '—'}`; }).join(' · ');
    const el = L.elemKnown(st, k) ? ` · ${L.elemName(k)}` : '';
    rows.push(`<div class="card" data-k="${k}"><div class="main"><div class="line"><span>${rg.n}</span>${best.k === k ? '<span class="chip ok">荐</span>' : ''}<span class="muted">${L.expLen(k)} 周天${el}</span></div>
      <div class="muted">${rg.desc}</div><div class="muted num">推荐战力 ${fmt(L.rec(k, 0))} / ${fmt(L.rec(k, 1))} / ${fmt(L.rec(k, 2))}</div><div class="muted">最高评价：${bests}</div></div>
      <div class="right">${rateChip(f)}<span class="muted">${L.DEPTHS[c.d]}·${L.APPR[c.a].n}</span></div></div>`);
  }
  const s = sheet({ title: '外出历练', sub: `你的战力 ${fmt(L.power(st))} · 历练途中修炼 ×0.5 · 评价丁等负伤 3 周天`, body: rows.reverse().join('') });
  s.querySelectorAll('.card[data-k]').forEach(c => c.onclick = () => { SFX.tap(); const k = +c.dataset.k, dc = defaultCell(st, k); confirmExp(k, dc.d, dc.a); });
  s.querySelectorAll('.card[data-boss]').forEach(c => c.onclick = () => { SFX.tap(); fightBossUI(+c.dataset.boss); });
}
// 途中：进度、到目前为止的收获、撤回（收获减半立即回家）
function showExpAway() {
  const e = st.exp, rg = L.REGIONS[e.k], pv = L.expPreview(st);
  const sum = st.expSum;
  sheet({ title: '历练中', body: `<div class="card flat"><div class="main"><div>【${cellName(e.k, e.d)}】${L.APPR[e.a].n}${e.chain ? ` · 还要连续 ${e.chain} 趟` : ''}</div><div class="muted">${rg.desc}</div>${bar((e.total - e.left) / e.total, true)}<div class="muted">还需 ${e.left} 周天归来</div></div></div>
    <dl class="grid2"><dt>灵石</dt><dd class="num">+${fmt(pv.stones)}</dd><dt>灵草</dt><dd class="num">+${fmt(pv.herbs)}</dd><dt>宝物</dt><dd class="num">${pv.finds ? pv.finds + ' 件（回来揭晓）' : '—'}</dd>${pv.xp > 0 ? `<dt>感悟</dt><dd class="num">+${fmt(pv.xp)}</dd>` : ''}</dl>
    ${sum ? `<p class="muted">之前 ${sum.n} 趟已得：灵石 ${fmt(sum.stones)}、灵草 ${fmt(sum.herbs)}</p>` : ''}
    <p class="muted">历练途中修炼 ×0.5；评价在出发时就定了，回来揭晓。撤回：本趟收获减半，没有宝物，立刻回家。</p>`,
    foot: [{ t: '撤回', alt: true, fn: () => { const r = L.recallExp(st); closeModal(); if (r) pushPopup(() => showExpResult(r)); } }, { t: '继续', gold: true, fn: closeModal }] });
}
function fightBossUI(k) {
  const res = L.fightBoss(st, k);
  if (!res) return;
  const B = res.B;
  const it = res.item;
  duel({
    title: '首领 · ' + B.n, intro: `【${L.REGIONS[k].n}】深处，${B.n}挡住了去路。`,
    right: { img: bossImg(k, 66), name: B.n, sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    quote: `${B.n}：“${B.line}”`,
    winText: res.win ? `斩杀${esc(B.n)}！获得称号「${esc(B.t)}」<div class="fxlist"><span>天材地宝 +${res.treasure}</span><span>灵石 +${fmt(res.stones)}</span><span>灵草 +${fmt(res.herbs)}</span><span>${it.equip ? '获得' : '已有更好法宝，换得灵石'}【${esc(it.name)}】</span></div>${res.art ? artLine(res.art) : ''}` : '',
    loseText: '首领太强，重伤而归（负伤 4 周天）。变强之后再来！',
    done: closeModal,
  });
}
// 出发确认页：深度一排、行事一排、预计评价与负伤风险（L.expForecast 算出的分布）
let expOpt = { chain: false, escort: false };
function confirmExp(k, d, a, still) {
  const rg = L.REGIONS[k];
  if (!L.expOpen(st, k, d, a)) { d = 0; a = L.apprOpen(st, a) && L.expOpen(st, k, 0, a) ? a : 0; }
  const f = L.expForecast(st, k, d, a);
  const dep = [0, 1, 2].map(dd => {
    const ok = L.depthOpen(st, k, dd) && L.expOpen(st, k, dd, a);
    const why = !ok ? (L.firstTrip(st) && dd ? '第一趟只去外围' : `${L.DEPTHS[dd - 1]}评价乙后开放`) : `推荐 ${fmt(L.rec(k, dd))}`;
    return `<button class="segb ${dd === d ? 'on' : ''}" data-d="${dd}" ${ok ? '' : 'disabled'}><b>${L.DEPTHS[dd]}</b><small>${why}</small></button>`;
  }).join('');
  const appr = [0, 1, 2].map(aa => {
    const ok = L.apprOpen(st, aa) && L.expOpen(st, k, d, aa);
    const why = !L.apprOpen(st, aa) ? (aa === 2 ? '第二趟解锁' : '第四趟解锁') : !ok ? '第一趟先斩妖' : `相性 ${L.affSym(st, k, aa)}`;
    return `<button class="segb ${aa === a ? 'on' : ''}" data-a="${aa}" ${ok ? '' : 'disabled'}><b>${L.APPR[aa].n}</b><small>${why}</small></button>`;
  }).join('');
  const notes = [];
  if (f.first) notes.push('<div class="quote">第一趟老夫暗中护着你：必得<b>甲</b>，还有一把凡器。</div>');
  if (f.warnFull) notes.push(`<div class="seal">修为已经满了，再出去是白跑（溢出的修为最多存下一层的两成）。先回来突破${L.REALMS[Math.min(st.p.r + 1, 8)].n}。</div>`);
  if (f.warnInj) notes.push(`<div class="seal">带伤出门，战力只剩六成，预计评价 ${f.text}。吃一枚破境丹就好，或者歇 ${f.warnInj} 个周天。</div>`);
  if (f.leap) notes.push(`<div class="seal">越级挑战：战力不到推荐的${Math.round(L.artExp(st, k, d, a).leap * 100)}%。评价乙以上奖励再 ×2。</div>`);
  if (f.affUnknown && !f.first) notes.push('<div class="muted">这一格的相性还没试过，按 ○ 估算；去一趟就知道了。</div>');
  if (f.elemUnknown && !f.first) notes.push('<div class="muted">此地五行还不知道，克制的 ±8 分没算进预计。</div>');
  const escortT = st.sect && st.sect.tasks ? st.sect.tasks.findIndex(t => t.ty === 'escort' && t.taken && !t.done && t.k === k) : -1;
  const opts = [];
  if (L.chainOpen(st)) opts.push(`<div class="check ${expOpt.chain ? 'on' : ''}" data-opt="chain"><span class="box"></span><span class="grow">连续 ×3：回来一起结算（丁等、遭遇或修为圆满时中断）</span></div>`);
  if (escortT >= 0) opts.push(`<div class="check ${expOpt.escort ? 'on' : ''}" data-opt="escort"><span class="box"></span><span class="grow">护送同门（宗门任务）：本趟灵石归宗门，贡献 ×3</span></div>`);
  const dist = f.first ? '' : `<div class="muted num">丁 ${L.pct(f.dist[0])} · 丙 ${L.pct(f.dist[1])} · 乙 ${L.pct(f.dist[2])} · 甲 ${L.pct(f.dist[3])} · 天 ${L.pct(f.dist[4])}</div>`;
  const yrs = f.len * L.REALMS[Math.min(st.p.r, 8)].mpt;
  const s = sheet({
    title: rg.n, center: true, still,
    body: `<p class="muted">${rg.desc}${L.elemKnown(st, k) ? ` · 五行属${L.elemName(k)}` : ''}</p>${elemLine(k)}
      <div class="muted">深度</div><div class="seg" id="expDepth">${dep}</div>
      <div class="muted">行事 <span class="muted">（斩妖：灵石多、归来得感悟；寻宝：法宝功法掉率 ×2；采药：灵草 ×3、分数 +6）</span></div><div class="seg" id="expAppr">${appr}</div>
      <div class="center"><div class="muted">战力 ${fmt(f.T)} / 推荐 ${fmt(f.rec)}</div><div class="muted">预计评价</div><div class="big ${f.lo >= 3 ? 'jadet' : f.lo >= 2 ? 'goldt' : 'seal'}" id="expRate" style="font-size:calc(var(--fs)*3)">${f.text}</div>${dist}</div>
      <dl class="grid2"><dt>负伤风险</dt><dd class="num ${f.risk > 0 ? 'seal' : ''}">${L.pct(f.risk)}（丁等负伤 3 周天）</dd><dt>灵石</dt><dd class="num">约 ${fmt(f.stones)}${escortT >= 0 && expOpt.escort ? '（护送：归宗门）' : ''}</dd><dt>耗时</dt><dd>${f.len} 周天（约 ${yrs < 1 ? Math.round(yrs * 12) + ' 个月' : fmt(yrs) + ' 年'}），途中修炼 ×0.5</dd></dl>
      ${notes.join('')}${opts.join('')}`,
    foot: [{ t: '返回', alt: true, fn: showExp }].concat(f.warnInj && L.canHeal(st) ? [{ t: '服丹疗伤', alt: true, fn: () => { L.heal(st); SFX.coin(); confirmExp(k, d, a, true); } }] : []).concat([{ t: '出发', gold: true, fn: () => {
      const o = { chain: expOpt.chain && L.chainOpen(st) ? 3 : 0 };
      if (escortT >= 0 && expOpt.escort) o.escort = escortT;
      if (L.startExp(st, k, d, a, o)) { SFX.coin(); expOpt.escort = false; closeModal(); }
    } }]),
  });
  s.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { SFX.tap(); confirmExp(k, +b.dataset.d, a, true); });
  s.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { SFX.tap(); confirmExp(k, d, +b.dataset.a, true); });
  s.querySelectorAll('[data-swapz]').forEach(b => b.onclick = () => { if (L.equipArt(st, b.dataset.swapz)) { SFX.coin(); confirmExp(k, d, a, true); } });
  s.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { SFX.tap(); expOpt[b.dataset.opt] = !expOpt[b.dataset.opt]; confirmExp(k, d, a, true); });
}
function itemLine(it) {
  if (it.kind === 'a') return artLine(it);
  if (it.kind === 'pet') {
    const T0 = L.PETS[it.tier];
    return it.equip ? `<div class="quote">${petImg(it.tier, 26)} 收服${T0.n}【${esc(it.name)}】！战力 ×${T0.m}</div>` : `<div class="quote">遇到一只${esc(it.name)}，不如你的灵宠，放它归山，换得灵石 ${fmt(it.value)}</div>`;
  }
  const nm = `${L.WEAPONS[it.tier].n}【${esc(it.name)}】`;
  if (!it.equip) return `<div class="quote">得到${nm}，不如身上的，卖得灵石 ${fmt(it.value)}</div>`;
  return `<div class="quote">获得${nm}！战力 ×${L.WEAPONS[it.tier].m}</div>`;
}
function deltaHTML(res) {
  const d = [];
  const arrow = (a, b) => (b > a ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (res.pw1 !== undefined && fmt(res.pw1) !== fmt(res.pw0)) d.push(`<dt>战力</dt><dd class="num">${fmt(res.pw0)} → <b>${fmt(res.pw1)}</b> ${arrow(res.pw0, res.pw1)}</dd>`);
  if (res.gain1 !== undefined && dec(res.gain1) !== dec(res.gain0)) d.push(`<dt>修炼/周天</dt><dd class="num">+${dec(res.gain0)} → <b>+${dec(res.gain1)}</b> ${arrow(res.gain0, res.gain1)}</dd>`);
  if (!st.pact && res.pw1 !== undefined) {
    const a = L.pactAssist(st), dm = L.duelPower(st, L.PACT_FOE) / L.power(st), p0 = L.duelP(st, res.pw0 * dm * a, L.PACT_POWER, L.PACT_FOE), p1 = L.duelP(st, res.pw1 * dm * a, L.PACT_POWER, L.PACT_FOE);
    if (L.pct(p0) !== L.pct(p1)) d.push(`<dt>约战胜算</dt><dd class="num">${L.pct(p0)} → <b>${L.pct(p1)}</b> ${arrow(p0, p1)}</dd>`);
  }
  return d.length ? `<dl class="grid2 delta">${d.join('')}</dl>` : '';
}
// 结算卡：评价印（天甲乙丙丁）+ 四项小分 + 收获 + 掉落 + 前后对比
function showExpResult(res) {
  lastExp = res;
  const rg = L.REGIONS[res.k];
  const lines = [];
  if (res.legacy) {
    lines.push(`<div class="center">${stampHTML(res.rating, true)}</div><p class="center">旧存档里没走完的那趟历练，按旧规矩结算：灵石 +${fmt(res.stones)}${res.inj ? '，负伤 3 周天' : ''}。</p>`);
  } else {
    const pr = res.parts, sg = v => (v >= 0 ? '+' : '') + Math.round(v);
    lines.push(`<div class="row" style="justify-content:center;gap:12px">${myAvImg(52)}<div class="center">${stampHTML(res.rating, true)}<div class="muted">${res.recall ? '中途折返' : '评价'}${res.leap ? ' · <span class="seal">越级</span>' : ''}</div></div></div>`);
    if (!res.first && !res.recall) lines.push(`<div class="center muted num">斩获 ${Math.round(pr.pow)} · 机缘 ${sg(pr.luck)} · 身法 ${sg(pr.aff)} · 胆魄 ${sg(pr.guts)} = <b>${Math.round(res.score)}</b> 分</div><div class="center muted">（丙 ${L.RATE_TH[0]} · 乙 ${L.RATE_TH[1]} · 甲 ${L.RATE_TH[2]} · 天 ${L.RATE_TH[3]}；奖励 ×${res.m}${res.leap ? ' ×2' : ''}）</div>`);
    if (res.affNew) lines.push(`<div class="quote">相性揭晓：【${rg.n}】${L.APPR[res.a].n} ${L.AFF_SYM[res.affV]}${res.affV === 2 ? '——此地正适合！' : res.affV === 0 ? '——此地不宜。' : ''}</div>`);
    const g = [];
    g.push(`<dt>灵石</dt><dd class="num">+${fmt(res.stones)}${res.leap ? '（越级 ×2）' : ''}${res.escort ? '（护送：灵石归宗门）' : ''}</dd>`);
    if (res.herbs) g.push(`<dt>灵草</dt><dd class="num">+${fmt(res.herbs)}</dd>`);
    if (res.xp > 0) g.push(`<dt>战斗感悟</dt><dd class="num">修为 +${fmt(res.xp)}</dd>`);
    if (res.pills) g.push(`<dt>破境丹</dt><dd>+${res.pills}</dd>`);
    if (res.treasure) g.push(`<dt>天材地宝</dt><dd class="seal">+${res.treasure}</dd>`);
    if (res.contrib) g.push(`<dt>宗门贡献</dt><dd class="num">+${fmt(res.contrib)}</dd>`);
    lines.push(`<dl class="grid2">${g.join('')}</dl>`);
    for (const it of res.items) lines.push(itemLine(it));
    for (const u of res.unlock || []) lines.push(`<div class="quote jadet">${esc(u)}</div>`);
    if (res.sum) lines.push(`<div class="quote">连续 ${res.sum.n} 趟合计：灵石 +${fmt(res.sum.stones)}，灵草 +${fmt(res.sum.herbs)}，破境丹 +${res.sum.pills}，评价 ${res.sum.ratings.map(r => L.RATINGS[r]).join(' ')}</div>`);
    if (res.first) lines.push('<div class="quote">戒中老祖：“第一趟，老夫暗中替你挡了两爪子。以后可得靠你自己了。”</div>');
    if (res.inj) lines.push(`<p class="center seal">铩羽而归，负伤 ${res.inj} 周天（战力 ×${dec2(L.injAtk(st))}、修炼 ×0.5）。看出发前那行“预计评价”，是丙～丁就别去。</p>`);
    if (res.dodged) lines.push('<p class="center jadet">敛息术护体：丁等，但没有负伤。</p>');
    if (res.lifeCost) lines.push(`<p class="center seal">血遁脱身：丁等不负伤，寿元 −${fmt(res.lifeCost)} 年。</p>`);
    if (res.qianyuan) lines.push('<p class="center jadet">潜渊：禁地失手，空手而归，但没有负伤。</p>');
    if (res.healed) lines.push(`<p class="center jadet">回春剑诀：负伤 −${res.healed} 周天。</p>`);
  }
  lines.push(deltaHTML(res));
  if (res.rating >= 2) SFX.coin(); else SFX.fail();
  // 引导期（第一张结算卡）只有【回洞府】；修为圆满换成【回去突破】，负伤换成【回去疗伤】
  const guiding = res.first || (st.guide && !st.guide.done);
  const foot = [];
  if (guiding) foot.push({ t: '回洞府', gold: true, fn: closeModal });
  else {
    foot.push({ t: '回洞府', alt: true, fn: closeModal });
    if (L.isReady(st)) foot.push({ t: '回去突破', gold: true, fn: () => { closeModal(); showBreakthrough(); } });
    else if (st.p.inj > 0) foot.push({ t: '回去疗伤', gold: true, fn: () => { closeModal(); showHome(); } });
    else if (!res.legacy && L.expOpen(st, res.k, res.d, res.a) && !L.busy(st)) foot.push({ t: '再探一次', gold: true, fn: () => { closeModal(); if (L.startExp(st, res.k, res.d, res.a)) SFX.coin(); } });
  }
  if (foot.length === 1) { foot[0].alt = false; foot[0].gold = true; }
  sheet({ title: `历练归来 · ${res.legacy ? rg.n : cellName(res.k, res.d)}`, center: true, body: lines.join(''), foot });
}
