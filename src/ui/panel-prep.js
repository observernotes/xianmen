/* 废柴仙途 · 界面片段 panel-prep：大节点前 1 月的备战卡（docs/KAIRO_PLAN.md §3.3 第 4 条；数据 L.bigInfo / out.prep）
 * 对手头像与战力、你的战力、胜算条、最多三条锦囊（三年之约取 pactTips()；论道取对第一场宿敌最好的战技）；
 * 【再准备一下】关卡片，时间仍停在这个月初，直到玩家自己点速度键继续；【就这样上】关卡片、时间接着走。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 clock 之后）。 */
function prepTips(b) {
  const out = [];
  try {
    if (b.k === 'pact' && typeof pactTips === 'function') for (const t of pactTips().slice(0, 3)) out.push({ t: t.t, p: t.p, go: String(t.go || '').split(':')[0] });
    else if (b.k === 'tour' && L.tourFoe) {
      const f = L.tourFoe(st), bz = f && L.duelArtBest(st, f.foe, f.Q);
      if (bz && !bz.same && bz.id) out.push({ t: `换上《${L.art(bz.id).n}》`, p: bz.p1 !== undefined ? bz.p1 : bz.p, art: bz.id });
    }
  } catch (e) { /* 算不出就不给锦囊 */ }
  return out.slice(0, 3);
}
const PREP_GO = { home: () => showHome(), market: () => showMarket(), exp: () => showExp(), cult: () => showBreakthrough(), pets: () => showPets(), plus: () => showGear(), gear: () => showGear(), arts: () => showArts() };
function showPrep(info) {
  if (!st) return;
  const b = L.bigInfo(st, info) || info;
  L.prepSeen(st);
  const tips = prepTips(b);
  const pBar = b.p !== undefined ? `<div class="muted">胜算 <b class="num">${L.pct(b.p)}</b></div>${bar(b.p, b.p >= 0.8)}` : '';
  const vs = b.foe ? `<div class="row" style="justify-content:space-between"><span>你 <b class="num">${fmt(b.S || L.power(st))}</b></span><span class="muted">对</span><span>${esc(b.foe.n)} <b class="num">${fmt(b.foe.pw)}</b></span></div>` : `<div class="center">战力 <b class="num">${fmt(L.power(st))}</b></div>`;
  const assist = b.k === 'pact' && L.pactAssist(st) > 1 ? `<div class="center muted">你的战力含老祖借力 ×${L.pactAssist(st)}</div>` : '';
  const tipRows = tips.map((t, i) => `<div class="row" style="justify-content:space-between;min-height:44px"><span class="grow">${esc(t.t)}${t.p !== undefined ? ` → <b class="num">${L.pct(t.p)}</b>` : ''}</span><button class="btn alt" data-ptip="${i}">去</button></div>`).join('');
  const s = sheet({ title: `备战 · ${b.n}`, center: true, noClose: true,
    body: `<div class="center muted">还有 ${Math.max(1, b.left)} ${UNIT}</div>${vs}${assist}${pBar}${tipRows ? '<div class="muted">锦囊</div>' + tipRows : ''}`,
    foot: [{ t: '再准备一下', alt: true, fn: () => { closeModal(); } }, { t: '就这样上', gold: true, fn: () => { resumeClock(); closeModal(); } }] });
  s.querySelectorAll('[data-ptip]').forEach(el => el.onclick = () => {
    const t = tips[+el.dataset.ptip]; SFX.tap();
    if (t.art) { if (L.equipArt(st, t.art)) { SFX.coin(); showPrep(info); } return; }
    closeModal(); const f = PREP_GO[t.go]; if (f) try { f(); } catch (e) { /* 面板不在就算了 */ }
  });
}
