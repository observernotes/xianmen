/* 废柴仙途 · 界面片段 panel-growth：数值拆解与大事锦囊
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 变强之道（数值拆解） ----------
function showGrowth(focus) {
  const p = st.p, B = L.breakdown(st);
  const mx = v => (v >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, '');
  const upBtn = k => { const b = L.HOME.find(x => x.k === k), lv = st.home[k]; if (!L.homeOpen(st, k)) return '<span class="muted">未解锁</span>'; if (lv >= b.max) return '<span class="muted">满级</span>'; const c = L.hCost(k, lv); return `<button class="btn sm ${st.stones >= c ? 'gold' : 'alt'}" data-up="${k}" ${st.stones >= c ? '' : 'disabled'}>升级 ${fmt(c)}</button>`; };
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
  const btn = Math.min(L.BT.maxPills, st.pills), bt = L.btRate(st, btn);
  const body = [
    `<div class="muted">每项数值 = 基础 × 各项加成。点右边的按钮直接去提升。</div>`,
    sec('cul', '修炼速度', '+' + fmt(B.gain) + ' /周天', '境界基础（' + L.stageName(p) + '）', B.baseCul, B.cul,
      row('运功吐纳', `${Math.min(st.tuna || 0, L.TUNA_FULL)}/${L.TUNA_FULL}`, '', `在洞府打坐时吐纳环每周天蓄 1/${L.TUNA_FULL}，蓄满后点画面里的自己，立得 1 周天修为（+${dec(L.gainCalm(st))}）。`) +
      row('闭关', L.retOpen(st) ? '×' + L.retInfo(st).m.toFixed(2) : '未解锁', goBtn('洞府', 'home'), `4 周天修炼 ×${L.retBaseMult(st).toFixed(2)}，花费 ${fmt(L.retCost(st))} 灵石；连着闭关每次 −${L.RET.fatigue}，出门历练一趟就恢复。历练途中修炼 ×0.5。`)),
    sec('atk', '战力', fmt(B.power), '境界基础（' + L.stageName(p) + '）', B.baseAtk, B.atk,
      row('突破大境界', '大幅', '', '每升一个大境界，战力翻好几倍。战力决定历练成功率、论道和会武胜负。')),
    sec('inc', '灵石收入', '+' + fmt(B.income) + ' /周天', '', 0, B.inc.map(([n, v, k]) => [n, '+' + fmt(v), k]),
      row('历练', '大头', goBtn('去历练', 'exp'), '历练带回的灵石远比每周天收入多。') + (st.sect ? '' : row('宗门俸禄', '未入宗', '', '筑基后拜入宗门，每周天领俸禄。'))),
    `<div class="grow-sec" id="g-bt"><h3>冲击${nxt}成功率<span>${L.pct(bt)}</span></h3>
      ${L.btParts(st, btn).filter(([k]) => !/^(丹炉|破境丹)/.test(k)).map(([k, v]) => row(k, k === '基础' ? L.pct(v) : '+' + L.pct(v), '', '')).join('')}
      ${row('丹炉 Lv' + st.home.furnace, '+' + L.pct(st.home.furnace * L.BT.furnace), upBtn('furnace'), `每级突破 +${L.pct(L.BT.furnace)}，还能炼丹。`)}
      ${row('破境丹 ×' + st.pills, `每枚 +${L.pct(L.BT.pill)}`, goBtn('去买', 'market'), `一次最多服 ${L.BT.maxPills} 枚。坊市、历练（${L.pct(L.EXP_PILL)} 掉一枚）、炼丹都能得到；负伤时也能服一枚疗伤。`)}
      ${L.btGuard(st) ? row('老祖护法', '必成', '', '第一世头一回冲击筑基，老祖护法必成。') : ''}</div>`,
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
// 三年之约的锦囊：每条办法算出做完之后的新胜算（DESIGN §4.4），过滤掉不可行和涨不到 3% 的，按新胜算排序取前三
function pactTips() {
  const pi = L.pactInfo(st), p = st.p, out = [];
  const with_ = (m, assist) => L.duelChance(pi.base * m * (assist === undefined ? pi.assist : assist), pi.Q);
  if (p.inj > 0) out.push({ t: '先疗伤', cost: L.canHeal(st) ? '破境丹 1 枚' : `歇 ${p.inj} 周天`, p: with_(1 / 0.6), go: 'home' });
  if (p.r === 0 && !L.isFull(st)) {
    const n = L.ticksToStage(st, L.si(p) + 1);
    if (n < pi.left) out.push(p.s === 3 ? { t: '修满后突破筑基', cost: `约 ${n} 周天修满，再冲一次${L.btGuard(st) ? '（老祖护法必成）' : ''}`, p: with_(btPowerMult(), 1), go: L.retOpen(st) ? 'home' : 'exp' }
      : { t: `修到炼气${L.STAGES[p.s + 1]}`, cost: `照现在约 ${n} 周天（闭关更快）`, p: with_(L.P.pwStage), go: L.retOpen(st) ? 'home' : 'exp' });
  }
  if (p.r === 0 && L.isFull(st)) out.push({ t: '突破筑基', cost: L.btGuard(st) ? '老祖护法必成' : '成功率 ' + L.pct(L.btRate(st, Math.min(3, st.pills))), p: with_(btPowerMult(), 1), go: 'cult' });
  if (p.w < L.boxCap(st, 'w')) out.push({ t: `换一件${L.WEAPONS[p.w + 1].n}`, cost: `寻宝 ${fmt(L.price(st, 'box'))} 或历练掉落`, p: with_(L.WEAPONS[p.w + 1].m / L.WEAPONS[p.w].m), go: navLock('market') ? 'exp' : 'market' });
  if (!p.pet && L.marketOpen(st, 'egg')) out.push({ t: '收一只灵宠', cost: `灵兽蛋 ${fmt(L.price(st, 'egg'))}`, p: with_(L.PETS[1].m), go: 'market' });
  if (L.canRetreat(st) && p.r === 0) { const ri = L.retInfo(st); if (ri.save > 0) out.push({ t: '闭关', cost: ri.free ? '头一回免费' : `${fmt(ri.cost)} 灵石`, p: pi.p, extra: `本层提前 ${ri.save} 周天`, go: 'home' }); }
  return out.filter(x => x.p - pi.p >= 0.03 || x.extra).sort((a, b) => b.p - a.p).slice(0, 3);
}
// 三年之约：双方数值摆在明面上，外加老祖锦囊（每条都写清楚能涨多少）
function showPact() {
  const pi = L.pactInfo(st), p = st.p;
  const row = (n, eff, act, tip) => `<div class="grow-row"><span class="gn">${n}</span><span class="gm">${eff}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const go = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const tips = pactTips().map(x => row(x.t, x.extra ? x.extra : `${L.pct(pi.p)} → <b>${L.pct(x.p)}</b>`, go('前往', x.go), x.cost));
  const body = `<p class="center">还剩 <b>${pi.left} 个周天</b>，${esc(st.exName)}在落霞城擂台等你。</p>
    <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(p.name)}</div><div class="num">${fmt(pi.base)}${pi.assist > 1 ? ` ×${pi.assist}` : ''}</div><div class="num jadet">= ${fmt(pi.S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${rivalAvImg({ n: st.exName, id: 'mu' }, 56)}<div>${esc(st.exName)}</div><div class="muted">单灵根·炼气后期·法器</div><div class="num seal">${fmt(pi.Q)}</div></div></div>
    <div class="center big ${pi.p < 0.45 ? 'seal' : pi.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(pi.p)}</div>
    ${pi.assist > 1 ? `<p class="muted center">×${pi.assist} 是老夫借你的神魂之力，只在你筑基之前有效。</p>` : ''}
    <p class="muted center">五五线：战力 ${fmt(L.duelLines(pi.Q).even)} · 稳赢线：${fmt(L.duelLines(pi.Q).sure)}</p>
    <div class="grow-sec"><h3>老祖锦囊<span>怎么提高胜算</span></h3>${tips.join('') || '<p class="muted">已经稳了，安心等着打脸吧。</p>'}</div>`;
  const s = sheet({ title: '三年之约', body });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.go; if (k === 'cult') { closeModal(); if (L.isReady(st)) showBreakthrough(); } else GO[k](); });
}
