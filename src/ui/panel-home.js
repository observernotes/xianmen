/* 废柴仙途 · 界面片段 panel-home：洞府（闭关、服丹疗伤、四项设施；炼丹房、灵田、兽栏、器炉的入口）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 闭关的花费、倍率、疲劳、多得多少修为都取自 L.retInfo；设施的“值不值”取自 L.upInfo。 */
// ---------- 洞府 ----------
const HOME_ICON = { cave: 'build', array: 'stone', field: 'stone', furnace: 'pill' };
function retreatCard() {
  if (st.retreat) {
    const r = st.retreat, nm = L.retName(r);
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
  // 先用丹囊里的疗伤丹，没有再用破境丹（alchemy.js 的 L.heal）
  const ok = L.canHeal(st), w = L.healWith(st), nl = L.bagN(st, 'liaoshang');
  const how = w === 'liaoshang' ? `服一枚疗伤丹立刻痊愈（丹囊里 ${nl} 枚）` : `服一枚破境丹立刻痊愈（你有 ${st.pills} 枚${st.home.furnace ? `；疗伤丹 ${fmt(L.herbCost(st, L.RECIPE.liaoshang))} 灵草一炉，省下破境丹` : ''}）`;
  return `<div class="card flat" style="box-shadow:0 0 0 2px var(--seal)"><div style="flex:none">${pillImg(w === 'liaoshang' ? 'liaoshang' : 'pojing', 2)}</div><div class="main"><div class="seal">负伤：还剩 ${st.p.inj} 周天</div>
    <div class="muted">战力 ×0.6、修炼 ×0.5。${how}${ok ? '' : `；坊市 ${fmt(L.price(st, 'pill'))} 灵石一枚`}</div></div>
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
  const tox = L.toxinOn(st) ? ` · 丹毒 ${Math.round(st.toxin || 0)}` : '', auto = L.danOf(st).auto.length;
  const alch = (L.plotCount(st) ? `<button class="btn alt" id="btnField">灵田 · ${L.plotCount(st)} 块 · ${L.plots(st).map(x => L.CROP[x.c].n).filter((n, i, a) => a.indexOf(n) === i).join('、')}${L.yinTotal(st) ? ` · 药引 ${L.yinTotal(st)}` : ''}</button>` : '')
    + (st.home.furnace ? `<button class="btn alt" id="btnAlch">炼丹房 · 灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure}${tox}${auto ? ` · 续炼 ${auto} 种` : ''}</button>` : '')
    + (L.petCount(st) || (st.petPend || []).length ? `<button class="btn ${L.petGlowAny(st) || (st.petPend || []).length ? 'gold' : 'alt'}" id="btnPets">兽栏 · 灵宠 ${L.petCount(st)}/${L.petCap(st)} · 兽粮 ${fmt(st.feed || 0)}${L.petGlowAny(st) ? ' · 能进化' : (st.petPend || []).length ? ' · 有新灵宠' : ''}</button>` : '')
    + (L.gearOpen(st, 'forge') || Object.keys(st.gear.plans).length ? `<button class="btn alt" id="btnForgeH">器炉 · 打造 · 器方 ${Object.keys(st.gear.plans).length} 张 · 灵矿 ${fmt(st.ore || 0)}</button>` : '');
  const s = sheet({ title: '洞府', still, sub: `${L.caveName(st.home.cave)} · 灵石 ${fmt(st.stones)} · 每周天 +${fmt(L.income(st))} · 修炼 +${dec(L.gain(st))}/周天`, body: healCard() + retreatCard() + alch + '<div class="sep"></div>' + rows });
  const ab = s.querySelector('#btnAlch'); if (ab) ab.onclick = () => { SFX.tap(); showAlchemy(); };
  const fb = s.querySelector('#btnField'); if (fb) fb.onclick = () => { SFX.tap(); showField(); };
  const pb = s.querySelector('#btnPets'); if (pb) pb.onclick = () => { SFX.tap(); showPets(); };
  const fh = s.querySelector('#btnForgeH'); if (fh) fh.onclick = () => { SFX.tap(); showForge(); };
  const rb = s.querySelector('#btnRet'); if (rb) rb.onclick = () => { if (L.startRetreat(st)) { SFX.gather(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, `闭关 ×${st.retreat.m.toFixed(2)}`, '#8ff5d0'); closeModal(); } };
  const re = s.querySelector('#btnRetEnd'); if (re) re.onclick = () => { const r = L.endRetreat(st, false); if (r) { SFX.tap(); showHome(true); } };
  const hb = s.querySelector('#btnHeal'); if (hb) hb.onclick = () => { const w = L.healWith(st); if (L.heal(st)) { SFX.coin(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, (w === 'liaoshang' ? '疗伤丹 ' : '') + '伤势痊愈', '#8ff5d0'); showHome(true); } };
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    if (L.upgrade(st, btn.dataset.k)) {
      SFX.coin();
      const pos = { cave: [100, 60], array: [100, 128], field: [22, 110], furnace: [166, 112] }[btn.dataset.k];
      floatText(pos[0], pos[1], `Lv${st.home[btn.dataset.k]}`, '#ffe39a');
      showHome(true);
    }
  });
}

// 炼丹房在 panel-alchemy.js，灵田在 panel-field.js
