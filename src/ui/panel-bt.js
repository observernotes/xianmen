/* 废柴仙途 · 界面片段 panel-bt：突破面板（破境丹步进器）与结果；金丹起的天劫准备页、心魔劫、停顿卡在 panel-trib.js
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 成功率与组成一律取自 L.btRate / L.btParts，失败后果取自 L.BT，所以面板上的数就是实际掷骰用的数。 */
// ---------- 突破 ----------
let btPills = null;   // 本次准备服几枚（null：按默认算）
// 照这一步突破后的寿元（下一境界的寿元上限）
function nextLife() { const p = st.p; if (p.r >= L.MAXR) return Infinity; return L.lifespan(Object.assign({}, st, { p: Object.assign({}, p, { r: p.r + 1 }) })); }
// 默认枚数：成功率封顶前能多一枚就多一枚，封顶后不再浪费（老祖护法、九转金丹时为 0）；金丹起算上准备页勾着的护劫手段（panel-trib.js）
function btDefault() {
  const max = Math.min(L.BT.maxPills, st.pills);
  if (L.btGuard(st) || st.flags.sureBt) return 0;
  const trib = L.tribNeeded(st), aids = trib ? tribAidsSel() : null;
  const rate = k => (trib ? L.tribRate(st, { pills: k, aids }) : L.btRate(st, k));
  let n = 0; while (n < max && rate(n) < 1 && rate(n + 1) > rate(n) + 1e-9) n++;   // 天劫封顶（L.tribTop）之后多服也不涨
  return n;
}
// 突破后战力大约翻几倍：升一小层 ×1.5、大境界 ×1.8，外加觉醒抬灵根
function btPowerMult() {
  const p = st.p, aw = L.awakens(st) ? L.AWAKE.find(a => a.r === p.r + 1) : null;
  const t1 = aw ? Math.max(p.t, aw.t) : p.t;
  return L.P.pwStage * L.P.pwRealm * L.TALENTS[t1].atk / L.TALENTS[p.t].atk;
}
function showBreakthrough(still) {
  const p = st.p;
  if (!L.isReady(st)) return;
  if (L.tribNeeded(st)) { showTribPrep(still); return; }   // 金丹起：天劫准备页（护劫手段），panel-trib.js
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const trib = p.r >= L.MAXR ? 9 : L.REALMS[p.r + 1].trib;
  const max = Math.min(L.BT.maxPills, st.pills);
  if (btPills === null || btPills > max) btPills = btDefault();
  const n = btPills, rate = L.btRate(st, n), guard = L.btGuard(st), sure = !!st.flags.sureBt;
  const parts = L.btParts(st, n).map(([k, v]) => `<span>${esc(k)} ${k === '基础' ? L.pct(v) : '+' + L.pct(v)}</span>`).join('');
  const fail = L.has(st, 'steady') ? `失败：道心坚定，修为只退到 95%，不负伤；下次成功率 +${L.pct(L.BT.fail)}。` : `失败不会身死：修为退到 70%，负伤 3 月，下次成功率 +${L.pct(L.BT.fail)}。`;
  const body = `<div class="row">${myAvImg(66)}<div class="grow">
      <div>${esc(p.name)} · ${L.stageName(p)}</div>
      <div class="big seal">冲击${nxt}</div>
      <div class="muted">${trib ? `需渡 ${trib} 道雷劫` : '水到渠成，无需渡劫'}</div></div></div>
    <div class="center"><div class="muted">成功率</div><div class="big ${rate >= 0.7 ? 'jadet' : rate >= 0.4 ? 'goldt' : 'seal'}" id="btRate" style="font-size:calc(var(--fs)*3)">${L.pct(rate)}</div>
      ${guard ? '<div class="jadet">老祖护法：头一回冲击筑基，必成（不耗丹）</div>' : sure ? '<div class="jadet">九转金丹：必定成功（不耗丹）</div>' : ''}
      ${p.r < L.MAXR ? `<div class="num">成了：战力约 <b>×${btPowerMult().toFixed(1)}</b>，寿元 ${fmt(L.lifespan(st))} → <b>${fmt(nextLife())}</b> 年</div>` : ''}</div>
    ${guard || sure || (!st.pills && !UI.isOpen('market')) ? '' : `<div class="stepper" id="btStep"><span class="grow">服破境丹 <span class="muted">每枚 +${L.pct(L.BT.pill)}（剩 ${st.pills}）</span></span>
      <button class="btn sm alt" data-st="-1" ${n <= 0 ? 'disabled' : ''}>−</button><b class="num">${n}</b><button class="btn sm alt" data-st="1" ${n >= max ? 'disabled' : ''}>+</button></div>`}
    ${guard || sure ? '' : `<details class="more"><summary>详情：成功率怎么来、失败会怎样</summary><div class="fxlist">${parts}</div><div class="muted">${fail}一次最多 ${L.BT.maxPills} 枚破境丹。</div></details>`}`;
  const s = sheet({ title: p.r >= L.MAXR ? '飞升天劫' : '境界突破', still, body, foot: [{ t: '再准备一下', alt: true, fn: closeModal }, { t: trib ? '引动天劫' : '开始突破', gold: true, fn: go }] });
  s.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { SFX.tap(); btPills = Math.max(0, Math.min(max, n + +b.dataset.st)); showBreakthrough(true); });
  function go() {
    const res = L.breakthrough(st, btPills);
    btPills = null;
    if (res) startCine(res);
    closeModal();
  }
}
function btStamp(r) { const c = ART.stamp && ART.stamp(r); if (!c) return ''; const s = pxFit(24, 64); return `<img class="px stampimg big" src="${urlOf(c, 'stamp|' + r)}" style="width:${s}px;height:${s}px" alt="${r}">`; }
function afterBreakthrough(res) {
  const p = st.p;
  renderFeed();
  if (res.ok) saveLocal('突破');   // 关键节点存一份（自动档轮换，saves.js）
  if (res.ascend && res.ok) { showAscension(); return; }
  if (res.ok) {
    const lines = [];
    lines.push(`<div class="row" style="justify-content:center;gap:12px">${myAvImg(78, undefined, '', 'joy')}${btStamp('完')}</div>`);
    lines.push(`<div class="center big goldt">${L.REALMS[p.r].n}期！</div>`);
    lines.push(`<div class="center num">战力 ${fmt(res.before)} → <span class="seal">${fmt(res.after)}</span>（×${(res.after / res.before).toFixed(1)}）</div>`);
    const more = [`<div class="center num">寿元 ${fmt(res.lifeBefore)} → <span class="jadet">${fmt(res.lifeAfter)}</span> 年</div>`];
    if (res.tb) lines.push(tribResultHTML(res));
    else if (res.pills) more.push(`<div class="center muted">服下破境丹 ${res.pills} 枚 · 成功率 ${L.pct(res.rate)}</div>`);
    else if (res.guard) lines.push('<div class="center muted">老祖护法，一举功成</div>');
    if (res.carry >= 1) more.push(`<div class="center muted">圆满后多攒的修为 +${fmt(res.carry)} 带进了新境界</div>`);
    if (res.awaken) {
      lines.push(res.awaken.stage === 1 ? '<div class="quote">戒中老祖：“小子，你以为你真是杂灵根？老夫封住你的灵根，就是为了今天！”</div>' : `<div class="quote">戒中老祖：“混沌灵根第 ${res.awaken.stage} 次觉醒。哼，有本座三成风采了。”</div>`);
      const T0 = L.talentInfo(st, res.awaken.from), T1 = L.talentInfo(st, res.awaken.to);
      lines.push(`<div class="center">灵根蜕变：${talentTag(res.awaken.from)} → ${talentTag(res.awaken.to)}</div>`);
      more.push(`<div class="center muted">灵根：修炼 ×${T0.cul} → ×${T1.cul}，战力 ×${T0.atk} → ×${T1.atk}</div>`);
      SFX.reveal(6);
    }
    lines.push(`<details class="more"><summary>详情：寿元、丹药、灵根</summary>${more.join('')}</details>`);
    sheet({ title: res.tb ? '渡劫成功' : '突破成功', center: true, body: lines.join(''), foot: [{ t: '道法自然', gold: true, fn: closeModal }] });
  } else {
    sheet({
      title: res.tb ? '渡劫失败' : '突破失败', center: true,
      body: `<div class="row" style="justify-content:center;gap:12px">${myAvImg(78, undefined, 'filter:grayscale(.6)', 'sad')}${btStamp('败')}</div>
        <p class="center">冲击${res.ascend ? '飞升' : L.REALMS[res.from + 1].n}失败（成功率 ${L.pct(res.rate)}）${L.has(st, 'steady') ? '，好在道心坚定，毫发无伤' : `，修为退到七成，负伤 ${p.inj} 月`}。</p>
        ${res.tb ? tribResultHTML(res) : ''}
        <p class="center seal">屡败屡战：下次成功率 +${L.pct(L.BT.fail)}（已累计 ${p.fails} 次）</p>`,
      foot: [{ t: '再接再厉', gold: true, fn: closeModal }],
    });
  }
}
