/* 废柴仙途 · 界面片段 panel-growth：变强页（docs/KAIRO_PLAN.md §10；示意图 docs/kairo_mock/growth.html → g1/g2/g3）与三年之约页
 * 一个数、一条杠、三张牌：页签（目标 / 战力 / 修炼 / 灵石 / 突破）→ 头（目标 + 现在的数 + 目标线）→ 老祖一句 → ≤ 3 张动作卡 → 明细（默认合着）。
 * 数据全部来自 L.advise(st, focus)（src/logic/advise.js），目标卡“下一步”、老祖头像、备战卡、三年之约的锦囊读的是同一张表。
 * 动作卡部件 advCards(acts) / bindAdv(root, acts, again)：变强页、备战卡、三年之约页共用；runAct(act, again) 也给目标卡【去】用。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 小部件 ----------
function gwIc(name, px) {
  if (String(name).startsWith('core:')) { const c = ART.core && ART.core(name.slice(5)); if (!c) return ''; const s = pxFit(c.width, px); return `<img class="px" src="${urlOf(c, 'core|' + name)}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
  return artIcon(name, px) || artIcon('up', px);
}
function gwEl(el) { const c = el && ART.elemBadge && ART.elemBadge(el); if (!c) return ''; const s = pxFit(c.width, 16); return `<img class="px" src="${urlOf(c, 'elb|' + el)}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
const gwCost = a => (a.why && !a.gap ? esc(a.why) : a.gap ? `${esc(a.gain.text)} ${esc(a.gain.sub || '')}　${esc(a.gap.fix.t === '去熔' ? '熔 1 件' : '去刷一趟')}` : a.cost.length ? a.cost.map(c => `${gwIc(c.icon, 16)} ${typeof c.n === 'number' ? fmt(c.n) : esc(c.n)}${c.have !== undefined ? ` <span class="${c.have < c.n ? 'kdn' : 'gw-mut'}">有 ${fmt(c.have)}</span>` : ''}`).join('　') : '不花钱');
// 功法的推荐牌（artrec.js）花费一栏写原因（“克三年之约的慕容（水）”），不花钱是自然的
// 动作卡：52 图标格 ｜ 名字 / 大数字 / 花费 ｜ 一个按钮（第一张金框 + 红章 + 红按钮；还差牌虚线框、红字、浅按钮）
function advCards(acts, o) {
  o = o || {};
  return acts.map((a, i) => {
    const best = i === 0 && !a.gap && !o.flat, dis = a.away && a.out && !a.gap;
    const num = a.gap ? `<div class="num gw-gap">${artIcon('adv_gap', 16)} 还差 ${fmt(a.gap.n)} <small>${esc(a.gap.unit)}</small></div>` : `<div class="num">${esc(a.gain.text)} <small>${esc(a.gain.sub || '')}</small></div>`;
    return `<div class="gw-act${best ? ' best' : ''}${a.gap ? ' dim' : ''}" data-act="${i}">${best && a.id !== 'idle' ? `<span class="gw-rec">${artIcon('adv_rec', 32)}</span>` : ''}<div class="cell">${gwIc(a.icon, 48)}</div>
      <div class="mid"><div class="nm">${esc(a.n)}</div>${num}<div class="gw-cost">${gwCost(a)}</div></div>
      <button class="kb gw-btn${best && !dis ? ' red' : a.gap ? ' alt' : ''}" data-adv="${i}" ${dis ? 'disabled' : ''}>${dis ? '回来再去' : esc(a.btn)}</button></div>`;
  }).join('');
}
function bindAdv(root, acts, again) { root.querySelectorAll('[data-adv]').forEach(b => b.onclick = e => { e.stopPropagation(); const a = acts[+b.dataset.adv]; if (a) runAct(a, again); }); }
// 跳转键：GO_K 的键，或 'exp:k:d:a'（打开那一格的出发页）
function goKey(k) {
  if (!k) return;
  const m = /^exp:(\d+):(\d+):(\d+)$/.exec(k);
  if (m) { if (L.busy(st)) { showExp(); return; } confirmExp(+m[1], +m[2], +m[3]); return; }
  (GO_K[k] || GO_K.exp)();
}
// 执行一张牌：当场能做的就做（留在原页、飘字、目标卡跳字）；出门的做完关页；其余跳到地方
function runAct(a, again) {
  if (!a || !st) return;
  if (a.gap) { SFX.tap(); closeModal(); goKey(a.go); return; }
  // 花点的牌走 L.act（AP_PLAN §10：界面不直接 L.startRetreat / L.startExp）：闭关当场出关、历练开那一格的出发页
  { const id = String(a.go || ''), m = /^do:(exp|wish):(\d+):?(\d*):?(\d*)/.exec(id);
    if (id === 'do:retreat') { closeModal(); doAct('retreat'); return; }
    if (m) { SFX.tap(); closeModal(); confirmExp(+m[2], +m[3] || 0, +m[4] || 0); return; } }
  if (String(a.go).startsWith('do:')) {
    const r = L.adviseDo(st, a.go.slice(3));
    if (!r.done) { SFX.fail(); sayLine(r.why || '做不了'); return; }
    if (r.ok) SFX.coin(); else SFX.fail();
    floatText(100, 70, r.ok ? `${a.n} ✓` : r.why || '没成', r.ok ? '#8ff5d0' : '#9d93b8');
    if (L.checkQuests) L.checkQuests(st);
    updateHUD();
    if (a.instant && again) again(); else closeModal();
    return;
  }
  SFX.tap(); closeModal(); goKey(a.go);
}

// ---------- 变强页 ----------
const GW_TABS = ['goal', 'atk', 'cul', 'inc', 'bt'];
let gwLast = { f: '', num: '' };
function showGrowth(focus, opt) {
  if (!st) return;
  opt = opt || {};
  focus = !focus || focus === 'all' ? 'goal' : focus;
  if (focus === 'life') { focus = 'bt'; opt.detail = true; }
  if (!GW_TABS.includes(focus)) focus = 'goal';
  const A = L.advise(st, focus), H = A.head;
  if (focus === 'goal') { L.adviseSeen(st); if (typeof syncElderAv === 'function') syncElderAv(); }
  const jump = gwLast.f === focus && gwLast.num && gwLast.num !== H.num; gwLast = { f: focus, num: H.num };
  const tabs = `<div class="ktabs gw-tabs">${A.tabs.map(t => `<button data-gtab="${t.k}" class="${t.k === focus ? 'on' : ''}${t.lock ? ' lk' : ''}">${t.n}<b>${esc(t.v)}</b></button>`).join('')}</div>`;
  const W = v => (Math.max(0, Math.min(1, v / (H.max || 1))) * 100).toFixed(1);
  const after = H.after !== undefined && H.after > H.v ? `<s style="left:${W(H.v)}%;width:${(W(H.after) - W(H.v)).toFixed(1)}%"></s>` : '';
  const line = H.line ? `<u style="left:${W(H.line)}%"></u>` : '';
  const fillC = H.kind === 'stuck' ? 'r' : H.bar === 'g' ? 'g' : '';
  const head = `<div class="gw-head"><div class="l1">${gwIc(H.icon || 'goal', 16)}<span class="nm">${esc(H.t || '')}</span>${H.el ? gwEl(H.el) : ''}<span class="rt">${esc(H.due || '')}</span></div>
    <div class="num gw-big${jump ? ' jump' : ''}">${esc(H.big || '')}<small>${esc(H.small || H.target || '')}</small></div>
    <div class="gw-bar"><i class="${fillC}" style="width:${W(H.v)}%"></i>${after}${line}</div></div>`;
  const say = H.say ? `<div class="gw-say">${elderImg(32)}<div class="bub">${esc(H.say)}</div></div>` : '';
  const sec = `<div class="ksec"><span>现在最划算</span><span>涨多少 · 花什么</span></div>`;
  const det = gwDetail(focus, A, !!opt.detail);
  const s = sheet({ title: '变强', body: tabs + head + say + sec + advCards(A.acts) + det });
  s.classList.add('gw');
  const again = () => showGrowth(focus, { detail: !!(s.querySelector('details.gw-det') || {}).open });
  bindAdv(s, A.acts, again);
  s.querySelectorAll('[data-gtab]').forEach(b => b.onclick = () => { SFX.tap(); showGrowth(b.dataset.gtab); });
  s.querySelectorAll('[data-gdr]').forEach(r => r.onclick = e => { e.stopPropagation(); SFX.tap(); gwPop(s, r, A, again); });
  if (opt.detail) { const d = s.querySelector('details.gw-det'); if (d) setTimeout(() => d.scrollIntoView({ block: 'end' }), 0); }
  { const d = s.querySelector('details.gw-det'); if (d) d.addEventListener('toggle', () => { if (d.open && !opt.detail) d.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); opt.detail = false; }); }   // 展开明细：“明细”那一行不动，正文滚到看得见（卷轴固定高度，jitter_check）
}
// 明细：≤ 6 行（图标 + 名字 + 条 + ×倍数），按贡献排；能提升的行尾 ▲、条上金色斜纹是“做了以后多出来的一段”；×1 的几项合成一行
const GW_KEY = { array: ['up:array'], field: ['up:field'], furnace: ['up:furnace'], cave: ['up:cave'], art: ['art0', 'art1'], gear: ['equip', 'plus', 'infuse'], pet: ['pet'], alch: ['pill'] };
function gwRowsOf(focus, A) {
  const B = L.breakdown(st), act = (k, n) => A.pool.find(a => (GW_KEY[k] || []).some(x => a.cls === x || a.id === x)) || (/^负伤/.test(n) ? A.pool.find(a => a.cls === 'heal') : null);
  const ICK = { talent: 'xisui', art: 'gscroll', array: 'array', gear: 'gear', pet: 'egg', field: 'field', sect: 'contrib', alch: 'baoqi', furnace: 'furnace', cave: 'cave' };
  const mx = v => '×' + (v >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, '');
  let rows = [], sum = '';
  if (focus === 'cul' || focus === 'atk' || focus === 'goal') {
    const atk = focus !== 'cul', base = atk ? B.baseAtk : B.baseCul, parts = atk ? B.atk : B.cul;
    rows.push({ ic: atk ? 'atk' : 'cult', n: '境界', v: fmt(base), w: 0.64 });
    for (const [n, m, k] of parts) rows.push({ ic: ICK[k] || (/^负伤/.test(n) ? 'hurt' : 'buff'), n, v: mx(m), m, w: Math.min(1, Math.abs(Math.log(m)) / Math.log(3)), lo: m < 1, a: act(k, n) });
    sum = atk ? `${fmt(base)} × 各项 = ${fmt(B.power)}` : `${fmt(base)} × 各项 = +${fmt(B.gain)}`;
  } else if (focus === 'inc') {
    const mxv = Math.max(1, ...B.inc.map(x => x[1]));
    for (const [n, v, k] of B.inc) rows.push({ ic: ICK[k] || 'stone', n, v: '+' + L.fmt1(v), m: v ? 2 : 1, w: v / mxv, a: act(k, n) });
    sum = `合计 +${fmt(B.income)}/${MO()}`;
  } else {
    const n = Math.min(L.BT.maxPills, st.pills);
    for (const [k, v] of L.btParts(st, n)) rows.push({ ic: /丹炉/.test(k) ? 'furnace' : /破境丹/.test(k) ? 'pojing' : 'pojing', n: k, v: (k === '基础' ? '' : v < 0 ? '−' : '+') + L.pct(Math.abs(v)), m: v ? 2 : 1, w: Math.min(1, Math.abs(v)), lo: v < 0, a: /丹炉/.test(k) ? act('furnace', k) : null });
    rows.push({ ic: 'cave', n: '寿元', v: `${Math.floor(st.p.age)}/${st.p.r >= 9 ? '∞' : fmt(L.lifespan(st))}`, m: 2, w: Math.min(1, st.p.age / Math.max(1, L.lifespan(st))), a: act('cave', '') });
    sum = '成功率 = 各项相加';
  }
  const head = rows[0] && rows[0].n === '境界' ? [rows.shift()] : [];
  const one = rows.filter(r => r.m === 1 && !r.a), live = rows.filter(r => !(r.m === 1 && !r.a));
  live.sort((a, b) => (b.a ? 1 : 0) - (a.a ? 1 : 0) || b.w - a.w);
  rows = head.concat(live);
  const cap = 6 - (one.length || rows.length > 6 ? 1 : 0);
  const rest = one.length + Math.max(0, rows.length - cap);
  rows = rows.slice(0, cap);
  if (rest) rows.push({ ic: 'lock', n: `还有 ${rest} 项`, v: '×1', m: 1, w: 0, lk: true });
  return { rows, sum };
}
function gwDetail(focus, A, open) {
  const R = gwRowsOf(focus, A);
  const why = { goal: A.head.unit === 'grade' ? '预计怎么算的' : A.head.unit === 'p' ? '胜算怎么算的' : '数怎么来的', atk: '战力怎么算的', cul: '修炼怎么算的', inc: '灵石从哪来', bt: '成功率怎么算的' }[focus];
  const rows = R.rows.map((r, i) => `<div class="gw-dr${r.lk ? ' lk' : ''}" data-gdr="${i}">${gwIc(r.ic, 16)}<span class="n nm">${esc(cut(r.n, 7))}</span><div class="pb"><i style="width:${(r.w * 100).toFixed(0)}%"></i>${r.a && !r.a.gap ? `<i class="add" style="left:${(r.w * 100).toFixed(0)}%;width:${Math.max(6, Math.min(30, r.a.score * 40)).toFixed(0)}%"></i>` : ''}</div><span class="v${r.lo ? ' lo' : r.m === 1 ? ' z' : ''}">${esc(r.v)}</span><span class="a">${r.a ? '▲' : ''}</span></div>`).join('');
  gwDetail.rows = R.rows;
  return `<details class="gw-det"${open ? ' open' : ''}><summary>${artIcon('adv_ledger', 16)}<span>明细</span><span class="rt">${open ? esc(R.sum) : why + ' ▸'}</span></summary><div class="gw-dl">${rows}</div></details>`;
}
// 小卡：名字 ＋ 一句（≤ 40 字）＋ 花费 ＋ 一个按钮（同一条 act）
function gwPop(s, r, A, again) {
  const old = s.querySelector('.gw-pop'); if (old) old.remove();
  s.querySelectorAll('.gw-dr.sel').forEach(x => x.classList.remove('sel'));
  const row = (gwDetail.rows || [])[+r.dataset.gdr]; if (!row || row.lk) return;
  r.classList.add('sel');
  const a = row.a;
  const line = a ? cut(`${row.n} ${row.v}，${a.n}：${a.gain.text}${a.gain.sub ? ' ' + a.gain.sub : ''}。`, 40) : cut(`${row.n} ${row.v}。`, 40);
  const el = document.createElement('div'); el.className = 'gw-pop';
  el.innerHTML = `<div class="t">${gwIc(row.ic, 32)}<span>${esc(a ? a.n : row.n)}</span></div><div>${esc(line)}</div>${a ? `<div class="f">${gwCost(a)}<button class="kb gw-btn" id="gwPopGo">${esc(a.btn)}</button></div>` : ''}`;
  s.appendChild(el);
  const rr = r.getBoundingClientRect(), sr = s.getBoundingClientRect();
  el.style.top = Math.max(8, Math.min(sr.height - el.offsetHeight - 8, rr.bottom - sr.top + 4)) + 'px';
  const go = el.querySelector('#gwPopGo'); if (go) go.onclick = e => { e.stopPropagation(); runAct(a, again); };
  const off = e => { if (!el.contains(e.target)) { el.remove(); r.classList.remove('sel'); document.removeEventListener('pointerdown', off, true); } };
  setTimeout(() => document.addEventListener('pointerdown', off, true), 0);
}
// 主画面三个数：对应页签，明细合着
$('#stats').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b || !st || cine) return; ac(); SFX.tap(); if (b.dataset.s === 'big') showBig(); else showGrowth(b.dataset.s); });
// “大事”牌：筑基（历法开放）之后点开是年历；之前照旧是三年之约
function showBig() {
  if (L.calOpen(st)) { showCalendar(); return; }
  const nb = L.nextBig(st);
  if (nb.k === 'tour') { showMe('rank'); return; }
  if (nb.k === 'meet') { showSect(); return; }
  showPact();
}
// 三年之约：双方数值摆在明面上，外加老祖锦囊（= 变强页目标页签的动作卡，同一个部件）
function showPact() {
  const pi = L.pactInfo(st), p = st.p, acts = L.advise(st, 'goal').acts.filter(a => a.id !== 'idle');
  const muEl = L.artSlotOpen(st, 1) && L.foeElKnown(st, L.PACT_FOE) ? ' ' + elChip(L.foeEl(L.PACT_FOE)) : '';
  const body = `<p class="center">还剩 <b>${seasons(pi.left)} 季</b>，${esc(st.exName)}在落霞城擂台等你。</p>
    <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(p.name)}</div><div class="num">${fmt(pi.base)}${pi.assist > 1 ? ` ×${pi.assist}` : ''}</div><div class="num jadet">= ${fmt(pi.S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${rivalAvImg({ n: st.exName, id: 'mu' }, 56)}<div>${esc(st.exName)}</div><div class="muted">单灵根·炼气后期·法器${muEl}</div><div class="num seal">${fmt(pi.Q)}</div></div></div>
    <div class="center big ${pi.p < 0.45 ? 'seal' : pi.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(pi.p)}</div>
    ${pi.assist > 1 ? `<p class="muted center">×${pi.assist} 是本座借你的神魂之力，只在你筑基之前有效。</p>` : ''}
    <p class="muted center">五五线：战力 ${fmt(L.duelLines(pi.Q).even)} · 稳赢线：${fmt(L.duelLines(pi.Q).sure)}</p>
    <div class="ksec"><span>老祖锦囊</span><span>涨多少 · 花什么</span></div>${acts.length ? advCards(acts) : '<p class="muted">已经稳了，安心等着打脸吧。</p>'}`;
  const s = sheet({ title: '三年之约', body });
  bindAdv(s, acts, () => showPact());
}
