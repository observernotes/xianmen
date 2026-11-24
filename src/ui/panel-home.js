/* 废柴仙途 · 界面片段 panel-home：洞府与炼丹房
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 洞府 ----------
const HOME_ICON = { cave: 'build', array: 'stone', field: 'stone', furnace: 'pill' };
function showHome() {
  const body = L.HOME.map(b => {
    const lv = st.home[b.k], max = lv >= b.max, c = max ? 0 : L.hCost(b.k, lv);
    return `<div class="card flat"><div style="flex:none">${iconHTML(HOME_ICON[b.k], 30)}</div><div class="main">
      <div class="line"><span>${b.n}</span><span class="chip">Lv ${lv}</span></div>
      <div class="muted">${b.d(lv)}</div>${max ? '' : `<div class="jadet">下一级：${b.d(lv + 1)}</div>`}</div>
      <div class="right"><button class="btn sm ${st.stones >= c && !max ? 'gold' : 'alt'}" data-k="${b.k}" ${max || st.stones < c ? 'disabled' : ''}>${max ? '已满级' : `${iconHTML('stone', 12)} ${fmt(c)}`}</button></div></div>`;
  }).join('');
  const alch = st.home.furnace ? `<button class="btn gold" id="btnAlch">炼丹房 · 灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure}</button>` : '<div class="muted">建造丹炉后可以炼丹（灵田和历练产出灵草）。</div>';
  const s = sheet({ title: '洞府', sub: `${L.caveName(st.home.cave)} · 灵石 ${fmt(st.stones)} · 每周天 +${fmt(L.income(st))}<br>灵石花在这里最值：聚灵阵加修炼速度，灵田产灵石灵草，丹炉出丹药，洞府加寿元。`, body: alch + body });
  const ab = s.querySelector('#btnAlch'); if (ab) ab.onclick = () => { SFX.tap(); showAlchemy(); };
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    if (L.upgrade(st, btn.dataset.k)) {
      SFX.coin();
      const pos = { cave: [100, 60], array: [100, 128], field: [22, 110], furnace: [166, 112] }[btn.dataset.k];
      floatText(pos[0], pos[1], `Lv${st.home[btn.dataset.k]}`, '#ffe39a');
      showHome();
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
  const s = sheet({ title: '炼丹房', sub: `灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure} · 成丹率 ${L.pct(rate)}${L.friend(st, 'ge') ? '（葛老指点）' : ''}`, body: body + '<div class="muted">灵田每周天产灵草，历练和奇遇也能得到。天材地宝来自地图首领与稀有机缘。成丹分下、中、上、极品四等。</div>' });
  s.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => {
    const res = L.craft(st, b.dataset.r);
    if (!res) return;
    SFX.gather();
    const s2 = sheet({ title: '开炉炼丹', center: true, noClose: true, body: `<div class="center"><div class="clashL" style="display:inline-block">${iconHTML('pill', 56)}</div></div><p class="center muted">丹炉火起，药香弥漫……</p>` });
    setTimeout(() => {
      if (!res.ok) { SFX.fail(); sheet({ title: '炸炉了', center: true, body: `<p class="center">轰的一声，${res.n}没炼成，灵草化为飞灰。</p><p class="center muted">提升丹炉等级、与葛老交好，成丹率更高。</p>`, foot: [{ t: '再来', gold: true, fn: showAlchemy }] }); return; }
      const q = L.QUAL[res.q];
      if (res.q === 3) { flash(0.6); SFX.reveal(6); banner('丹纹九现', '极品' + res.n); } else SFX.win();
      sheet({ title: '丹成', center: true, body: `<div class="center">${iconHTML('pill', 44)}</div><div class="center big ${res.q === 3 ? 'goldt' : res.q === 2 ? 'jadet' : ''}">${q.n}${res.n}</div>${res.q === 3 ? '<p class="center seal">丹成之时，九道丹纹浮现，异香百里！</p>' : ''}<div class="fxlist"><span>${esc(res.fx)}</span></div>`, foot: [{ t: '继续炼丹', gold: true, fn: showAlchemy }] });
    }, 1100);
    void s2;
  });
}
