/* 废柴仙途 · 界面片段 panel-growth：数值拆解与大事锦囊
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 变强之道（数值拆解） ----------
function showGrowth(focus) {
  const p = st.p, B = L.breakdown(st);
  const mx = v => (v >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, '');
  const upBtn = k => { const b = L.HOME.find(x => x.k === k), lv = st.home[k]; if (lv >= b.max) return '<span class="muted">满级</span>'; const c = L.hCost(k, lv); return `<button class="btn sm ${st.stones >= c ? 'gold' : 'alt'}" data-up="${k}" ${st.stones >= c ? '' : 'disabled'}>升级 ${fmt(c)}</button>`; };
  const goBtn = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const row = (n, m, act, tip) => `<div class="grow-row"><span class="gn">${esc(n)}</span><span class="gm ${m < 1 ? 'low' : ''}">${typeof m === 'number' ? '×' + mx(m) : m}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const act = { talent: () => goBtn('洗髓丹', 'alch'), art: () => goBtn('去寻宝', 'market'), array: () => upBtn('array'), weapon: () => goBtn('去历练', 'exp'), pet: () => goBtn('灵兽蛋', 'market'), field: () => upBtn('field'), sect: () => goBtn('宗门', 'sect') };
  const tips = {
    talent: '灵根是天生的，炼丹房的洗髓丹能提升一品（需要天材地宝）。',
    art: '功法来自历练掉落、坊市寻宝、宗门宝库，越高阶修炼越快。',
    array: `下一级 ×${mx(L.arrayMult(st.home.array + 1))}，灵石最该花在这里。`,
    weapon: '法宝来自历练掉落、首领、坊市寻宝、宗门宝库。',
    pet: '灵宠来自坊市灵兽蛋、历练与奇遇。',
    field: `下一级每周天 ${fmt(L.fieldInc(st.home.field + 1))} 灵石，还产灵草。`,
  };
  const sec = (key, title, total, baseName, base, parts, extra) => `<div class="grow-sec" id="g-${key}"><h3>${title}<span>${total}</span></h3>
    ${baseName ? row(baseName, fmt(base), '', '') : ''}${parts.map(([n, m, k]) => row(n, m, k && act[k] ? act[k]() : '', k && tips[k] ? tips[k] : '')).join('')}${extra || ''}</div>`;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const bt = L.btRate(st, st.pills > 0);
  const body = [
    `<div class="muted">每项数值 = 基础 × 各项加成。点右边的按钮直接去提升。</div>`,
    sec('cul', '修炼速度', '+' + fmt(B.gain) + ' /周天', '境界基础（' + L.stageName(p) + '）', B.baseCul, B.cul,
      row('运功吐纳', `${st.tunaLeft === undefined ? L.TUNA_MAX : st.tunaLeft}/${L.TUNA_MAX}`, '', '点画面里的自己，每次额外 +10% 周天修为，每周天 12 次。')),
    sec('atk', '战力', fmt(B.power), '境界基础（' + L.stageName(p) + '）', B.baseAtk, B.atk,
      row('突破大境界', '大幅', '', '每升一个大境界，战力翻好几倍。战力决定历练成功率、论道和会武胜负。')),
    sec('inc', '灵石收入', '+' + fmt(B.income) + ' /周天', '', 0, B.inc.map(([n, v, k]) => [n, '+' + fmt(v), k]),
      row('历练', '大头', goBtn('去历练', 'exp'), '历练带回的灵石远比每周天收入多。') + (st.sect ? '' : row('宗门俸禄', '未入宗', '', '筑基后拜入宗门，每周天领俸禄。'))),
    `<div class="grow-sec" id="g-bt"><h3>冲击${nxt}成功率<span>${L.pct(bt)}</span></h3>
      ${row('境界基础', L.pct(L.REALMS[Math.min(p.r, 8)].rate), '', '')}
      ${row('丹炉 Lv' + st.home.furnace, '+' + st.home.furnace * 2 + '%', upBtn('furnace'), '每级 +2%，还会自动炼出破境丹。')}
      ${row('破境丹 ×' + st.pills, st.pills ? '+20%' : '无', goBtn('去买', 'market'), '突破时服一枚 +20%。坊市、历练、丹炉都能得到。')}
      ${p.fails ? row('屡败屡战', '+' + p.fails * 12 + '%', '', '') : ''}</div>`,
    `<div class="grow-sec" id="g-life"><h3>寿元<span>${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</span></h3>
      ${row('洞府 Lv' + st.home.cave, '+' + st.home.cave * 5 + '%', upBtn('cave'), '洞府每级寿元 +5%。')}
      ${row('延寿丹', '+10%', goBtn('去买', 'market'), '每个大境界最多三枚。')}
      ${row('突破大境界', '翻倍', '', '境界越高寿元越长。寿元耗尽会坐化转世。')}</div>`,
  ].join('<div class="sep"></div>');
  const s = sheet({ title: '变强之道', sub: `灵石 ${fmt(st.stones)} · 破境丹 ${st.pills} · 灵草 ${fmt(st.herbs)}`, body });
  s.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { if (L.upgrade(st, b.dataset.up)) { SFX.coin(); showGrowth(focus); } });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.go; if (k === 'alch') { if (st.home.furnace) showAlchemy(); else showHome(); } else GO[k](); });
  if (focus && focus !== 'all') { const el = s.querySelector('#g-' + focus); if (el) el.scrollIntoView({ block: 'start' }); }
}
$('#stats').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b || !st || cine) return; ac(); SFX.tap(); if (b.dataset.s === 'big') showBig(); else showGrowth(b.dataset.s); });
function showBig() {
  const nb = L.nextBig(st);
  if (nb.k === 'tour') { showMe('rank'); return; }
  if (nb.k === 'meet') { showSect(); return; }
  showPact();
}
// 三年之约：双方数值摆在明面上，外加老祖锦囊（每条都写清楚能涨多少）
function showPact() {
  const pi = L.pactInfo(st), p = st.p;
  const row = (n, eff, act, tip) => `<div class="grow-row"><span class="gn">${n}</span><span class="gm">${eff}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const go = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const with_ = m => L.pct(L.duelChance(pi.S * m, pi.Q));
  const tips = [];
  if (p.w < 2) tips.push(row('历练捡法宝', p.w ? '×1.3→×1.7' : '×1.3 起', go('去历练', 'exp'), `凡器 ×1.3、法器 ×1.7，后山野林、黑风岭都会掉。换上法器胜算 → <b>${with_(L.WEAPONS[2].m / L.WEAPONS[p.w].m)}</b>。`));
  if (p.r === 0 && p.s < 3) {
    const need = Math.max(0, L.pNeed(p) - p.xp), t = Math.ceil(need / Math.max(L.gain(st), 1e-9));
    tips.push(row('修为再升一层', '×1.5', go('聚灵阵', 'home'), `还差 ${fmt(need)} 修为，照现在约 ${t} 周天。升一层胜算 → <b>${with_(1.5)}</b>。聚灵阵、运功吐纳都能加快。`));
  } else if (p.r === 0) tips.push(row('突破筑基', '暴涨', '', '修为条变金色就点它。筑基后不光境界涨，还会有大机缘——到时她根本不是对手。'));
  if (!p.pet) tips.push(row('收服灵宠', '×1.2 起', navLock('market') ? go('去历练', 'exp') : go('去坊市', 'market'), '历练时偶尔能收服，坊市也能买灵兽蛋。'));
  if (p.inj > 0) tips.push(row('养伤', '负伤 ×0.6', '', `还要 ${p.inj} 周天才好，别赶在开打前受伤。`));
  const body = `<p class="center">还剩 <b>${pi.left} 个周天</b>，${esc(st.exName)}在落霞城擂台等你。</p>
    <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(p.name)}</div><div class="num">${fmt(pi.base)}${pi.assist > 1 ? ` ×${pi.assist}` : ''}</div><div class="num jadet">= ${fmt(pi.S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${rivalAvImg({ n: st.exName, id: 'mu' }, 56)}<div>${esc(st.exName)}</div><div class="muted">单灵根·炼气后期·法器</div><div class="num seal">${fmt(pi.Q)}</div></div></div>
    <div class="center big ${pi.p < 0.45 ? 'seal' : pi.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(pi.p)}</div>
    ${pi.assist > 1 ? '<p class="muted center">×3 是老夫借你的神魂之力，只在你筑基之前有效。</p>' : ''}
    <div class="grow-sec"><h3>老祖锦囊<span>怎么提高胜算</span></h3>${tips.join('') || '<p class="muted">已经稳了，安心等着打脸吧。</p>'}</div>`;
  const s = sheet({ title: '三年之约', body });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); GO[b.dataset.go](); });
}
