/* 废柴仙途 · 界面片段 panel-bt：突破面板与结果
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 突破 ----------
let usePill = true;
function nextLife() { const p = st.p; return p.r < L.MAXR ? L.REALMS[p.r + 1].life * (1 + 0.05 * st.home.cave) * (L.has(st, 'longev') ? 1.5 : 1) + st.lifeBonus : 0; }
function showBreakthrough() {
  const p = st.p;
  if (!L.isReady(st)) return;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const trib = p.r >= L.MAXR ? 9 : L.REALMS[p.r + 1].trib;
  const render = () => {
    const pill = usePill && st.pills > 0;
    const rate = L.btRate(st, pill);
    const bits = [`基础 ${L.pct(L.REALMS[p.r].rate)}`];
    if (st.home.furnace) bits.push(`丹炉 +${st.home.furnace * 2}%`);
    if (p.fails) bits.push(`屡败屡战 +${p.fails * 12}%`);
    if (L.has(st, 'hero')) bits.push('主角光环 +10%');
    if (L.has(st, 'alch')) bits.push('丹道奇才 +15%');
    const sc = L.sectOf(st); if (sc && sc.bt) bits.push(`${sc.n} +${Math.round(sc.bt * 100)}%`);
    if (L.desperate(st)) bits.push('<span class="seal">绝境 +25%</span>');
    if (pill) bits.push('破境丹 +20%');
    if (st.flags.sureBt) bits.push('<span class="jadet">九转金丹：必定成功</span>');
    const body = `<div class="row">${myAvImg(66)}<div class="grow">
        <div>${esc(p.name)} · ${L.stageName(p)}</div>
        <div class="big seal">冲击${nxt}</div>
        <div class="muted">${trib ? `需渡 ${trib} 道雷劫` : '水到渠成，无需渡劫'}</div></div></div>
      <div class="center"><div class="muted">成功率</div><div class="big ${rate >= 0.7 ? 'jadet' : rate >= 0.4 ? 'goldt' : 'seal'}" style="font-size:calc(var(--fs)*3)">${L.pct(rate)}</div><div class="muted">${bits.join(' · ')}</div></div>
      <div class="check ${pill ? 'on' : ''}" id="pillChk" role="checkbox" aria-checked="${pill}"><span class="box"></span><span class="grow">服用破境丹 +20%</span><span class="muted">剩余 ${st.pills}</span></div>
      <div class="muted">失败不会身死：修为倒退三成、负伤两周天，下次成功率 +12%。${p.r < L.MAXR ? `成功后寿元增至 ${fmt(nextLife())} 年。` : ''}</div>`;
    const s = sheet({ title: p.r >= L.MAXR ? '飞升天劫' : '境界突破', body, foot: [{ t: '再准备一下', alt: true, fn: closeModal }, { t: trib ? '引动天劫' : '开始突破', gold: true, fn: go }] });
    const chk = s.querySelector('#pillChk');
    if (chk) chk.onclick = () => { if (st.pills <= 0) return; usePill = !usePill; SFX.tap(); render(); };
  };
  const go = () => {
    const res = L.breakthrough(st, usePill && st.pills > 0);
    if (res) startCine(res);
    closeModal();
  };
  render();
}
function afterBreakthrough(res) {
  const p = st.p;
  renderFeed();
  if (res.ascend && res.ok) { showAscension(); return; }
  if (res.ok) {
    const lines = [];
    lines.push(`<div class="center">${myAvImg(78)}</div>`);
    lines.push(`<div class="center big goldt">${L.REALMS[p.r].n}期！</div>`);
    lines.push(`<div class="center num">战力 ${fmt(res.before)} → <span class="seal">${fmt(res.after)}</span>（×${(res.after / res.before).toFixed(1)}）</div>`);
    lines.push(`<div class="center num">寿元 ${fmt(res.lifeBefore)} → <span class="jadet">${fmt(res.lifeAfter)}</span> 年</div>`);
    if (res.awaken) {
      lines.push('<div class="quote">戒中老祖：“小子，你以为你真是杂灵根？老夫封住你的灵根，就是为了今天！”</div>');
      lines.push(`<div class="center">灵根蜕变：${talentTag(res.awaken.from)} → ${talentTag(res.awaken.to)}</div>`);
      lines.push('<div class="center muted">修炼速度与战力暴涨！</div>');
      SFX.reveal(6);
    }
    sheet({ title: '突破成功', center: true, body: lines.join(''), foot: [{ t: '道法自然', gold: true, fn: closeModal }] });
  } else {
    sheet({
      title: '突破失败', center: true,
      body: `<div class="center">${myAvImg(78, undefined, 'filter:grayscale(.6)')}</div>
        <p class="center">冲击${res.ascend ? '飞升' : L.REALMS[res.from + 1].n}失败${L.has(st, 'steady') ? '，好在道心坚定，毫发无伤' : '，修为倒退，需静养两周天'}。</p>
        <p class="center seal">屡败屡战：下次成功率 +12%</p>`,
      foot: [{ t: '再接再厉', fn: closeModal }],
    });
  }
}
