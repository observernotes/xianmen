/* 废柴仙途 · 界面片段 panel-home：洞府（闭关、服丹疗伤、四项设施）与炼丹房
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 闭关的花费、倍率、疲劳、多得多少修为都取自 L.retInfo；设施的“值不值”取自 L.upInfo。 */
// ---------- 洞府 ----------
const HOME_ICON = { cave: 'build', array: 'stone', field: 'stone', furnace: 'pill' };
function retreatCard() {
  if (st.retreat) {
    const r = st.retreat, nm = r.kind === 'train' ? '老祖特训' : r.kind === 'teach' ? '指点师弟' : '闭关';
    return `<div class="card flat"><div class="main"><div class="line"><span>${nm}中</span><span class="chip ok">修炼 ×${r.m.toFixed(2)}</span></div>${bar((r.total - r.left) / r.total, true)}
      <div class="muted">还剩 ${r.left} 周天 · 已得修为 ${fmt(r.got)}${r.kind === 'ret' ? ' · 坐满出关有机会顿悟' : ''}</div></div>
      <div class="right"><button class="btn sm alt" id="btnRetEnd">提前出关</button></div></div>`;
  }
  if (!L.retOpen(st)) return '<div class="card flat" style="opacity:.6"><div class="main"><div>闭关</div><div class="muted">炼气中期解锁：4 周天修炼翻倍</div></div></div>';
  const ri = L.retInfo(st), ok = !ri.why;
  const cost = ri.free ? '头一回免费' : `${fmt(ri.cost)} 灵石`;
  const tired = ri.tired ? `<div class="seal">连着第 ${ri.streak + 1} 次闭关：倍率 ×${ri.m0.toFixed(2)} → ×${ri.m.toFixed(2)}（出门历练一趟就恢复）</div>` : '';
  return `<div class="card flat"><div style="flex:none">${iconHTML('disc', 30)}</div><div class="main"><div class="line"><span>闭关 · ${ri.len} 周天</span><span class="chip ${ri.tired ? 'warn' : 'ok'}">修炼 ×${ri.m.toFixed(2)}</span></div>
    <div class="jadet">修为 +${fmt(ri.extra)}（比打坐多）${ri.save ? `，本层提前 ${ri.save} 周天` : ''}</div>
    <div class="muted">出关 ${L.pct(ri.epi)} 顿悟，再得 ${L.RET.epiTicks} 周天修为 · 期间不能历练</div>${tired}${ok ? '' : `<div class="seal">${esc(ri.why)}</div>`}</div>
    <div class="right"><button class="btn sm ${ok ? 'gold' : 'alt'}" id="btnRet" ${ok ? '' : 'disabled'}>${ri.free ? '免费' : `${iconHTML('stone', 12)} ${fmt(ri.cost)}`}</button><span class="muted">${cost}</span></div></div>`;
}
function healCard() {
  if (!(st.p.inj > 0)) return '';
  const ok = L.canHeal(st);
  // TODO SYSTEMS §5：疗伤丹上线后这里优先用疗伤丹，破境丹作兜底（L.heal 里改）
  return `<div class="card flat" style="box-shadow:0 0 0 2px var(--seal)"><div style="flex:none">${iconHTML('pill', 30)}</div><div class="main"><div class="seal">负伤：还剩 ${st.p.inj} 周天</div>
    <div class="muted">战力 ×0.6、修炼 ×0.5。服一枚破境丹立刻痊愈（你有 ${st.pills} 枚）${ok ? '' : `；坊市 ${fmt(L.price(st, 'pill'))} 灵石一枚`}</div></div>
    <div class="right"><button class="btn sm ${ok ? 'gold' : 'alt'}" id="btnHeal" ${ok ? '' : 'disabled'}>服丹疗伤</button></div></div>`;
}
function showHome(still) {
  const rows = L.HOME.map(b => {
    const u = L.upInfo(st, b.k), lv = u.lv;
    if (u.lock) return `<div class="card flat" style="opacity:.6"><div style="flex:none">${iconHTML(HOME_ICON[b.k], 30)}</div><div class="main"><div>${b.n}</div><div class="muted">${u.lock}</div></div></div>`;
    const can = !u.max && st.stones >= u.cost;
    return `<div class="card flat"><div style="flex:none">${iconHTML(HOME_ICON[b.k], 30)}</div><div class="main">
      <div class="line"><span>${b.n}</span><span class="chip">Lv ${lv}</span></div>
      <div class="muted">${b.d(lv)}</div>${u.max ? '' : `<div class="jadet">→ ${b.d(lv + 1)}</div><div class="muted">${esc(u.note)}</div>`}${!u.max && !can ? `<div class="muted">还差 ${fmt(u.cost - st.stones)} 灵石</div>` : ''}</div>
      <div class="right"><button class="btn sm ${can ? 'gold' : 'alt'}" data-k="${b.k}" ${can ? '' : 'disabled'}>${u.max ? '已满级' : `${iconHTML('stone', 12)} ${fmt(u.cost)}`}</button></div></div>`;
  }).join('');
  const alch = st.home.furnace ? `<button class="btn alt" id="btnAlch">炼丹房 · 灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure}</button>` : '';
  const s = sheet({ title: '洞府', still, sub: `${L.caveName(st.home.cave)} · 灵石 ${fmt(st.stones)} · 每周天 +${fmt(L.income(st))} · 修炼 +${dec(L.gain(st))}/周天`, body: healCard() + retreatCard() + alch + '<div class="sep"></div>' + rows });
  const ab = s.querySelector('#btnAlch'); if (ab) ab.onclick = () => { SFX.tap(); showAlchemy(); };
  const rb = s.querySelector('#btnRet'); if (rb) rb.onclick = () => { if (L.startRetreat(st)) { SFX.gather(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, `闭关 ×${st.retreat.m.toFixed(2)}`, '#8ff5d0'); closeModal(); } };
  const re = s.querySelector('#btnRetEnd'); if (re) re.onclick = () => { const r = L.endRetreat(st, false); if (r) { SFX.tap(); showHome(true); } };
  const hb = s.querySelector('#btnHeal'); if (hb) hb.onclick = () => { if (L.heal(st)) { SFX.coin(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, '伤势痊愈', '#8ff5d0'); showHome(true); } };
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    if (L.upgrade(st, btn.dataset.k)) {
      SFX.coin();
      const pos = { cave: [100, 60], array: [100, 128], field: [22, 110], furnace: [166, 112] }[btn.dataset.k];
      floatText(pos[0], pos[1], `Lv${st.home[btn.dataset.k]}`, '#ffe39a');
      showHome(true);
    }
  });
}

// ---------- 炼丹 ----------
function showAlchemy() {
  const rate = L.alchRate(st);
  const body = L.RECIPES.map(rc => {
    const why = L.canCraft(st, rc.k);
    const cost = `灵草 ${fmt(L.herbCost(st, rc))}${rc.treasure ? ` · 天材地宝 ${rc.treasure}` : ''}`;
    return `<div class="card flat"><div style="flex:none">${iconHTML('pill', 28)}</div><div class="main"><div>${rc.n}</div><div class="muted">${rc.d}</div><div class="muted">${cost}${why ? ` · <span class="seal">${why}</span>` : ''}</div></div>
      <div class="right"><button class="btn sm ${why ? 'alt' : 'gold'}" data-r="${rc.k}" ${why ? 'disabled' : ''}>炼制</button></div></div>`;
  }).join('');
  const s = sheet({ title: '炼丹房', sub: `灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure} · 成丹率 ${L.pct(rate)}${L.friend(st, 'ge') ? '（葛老指点）' : ''}`, body: body + '<div class="muted">灵田每周天产灵草，历练（尤其采药）和奇遇也能得到。天材地宝来自地图首领与稀有机缘。成丹分下、中、上、极品四等，炸炉只亏灵草。</div>' });
  s.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => {
    const res = L.craft(st, b.dataset.r);
    if (!res) return;
    SFX.gather();
    const s2 = sheet({ title: '开炉炼丹', center: true, noClose: true, body: `<div class="center"><div class="clashL" style="display:inline-block">${iconHTML('pill', 56)}</div></div><p class="center muted">丹炉火起，药香弥漫……</p>` });
    setTimeout(() => {
      if (!res.ok) { SFX.fail(); sheet({ title: '炸炉了', center: true, body: `<p class="center">轰的一声，${res.n}没炼成，灵草化为飞灰。</p><p class="center muted">提升丹炉等级（每级 +3%）、与葛老交好，成丹率更高。</p>`, foot: [{ t: '再来', gold: true, fn: showAlchemy }] }); return; }
      const q = L.QUAL[res.q];
      if (res.q === 3) { flash(0.6); SFX.reveal(6); banner('丹纹九现', '极品' + res.n); } else SFX.win();
      sheet({ title: '丹成', center: true, body: `<div class="center">${iconHTML('pill', 44)}</div><div class="center big ${res.q === 3 ? 'goldt' : res.q === 2 ? 'jadet' : ''}">${q.n}${res.n}</div>${res.q === 3 ? '<p class="center seal">丹成之时，九道丹纹浮现，异香百里！</p>' : ''}<div class="fxlist"><span>${esc(res.fx)}</span></div>`, foot: [{ t: '继续炼丹', gold: true, fn: showAlchemy }] });
    }, 1100);
    void s2;
  });
}
