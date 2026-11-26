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
const PREP_GO = { home: () => showHome(), market: () => showMarket(), exp: () => showExp(), cult: () => showBreakthrough(), pets: () => showPets(), plus: () => showEquip('gear'), gear: () => showEquip('gear'), arts: () => showEquip('arts'), big: () => showBig() };
function showPrep(info) {
  if (!st) return;
  const b = L.bigInfo(st, info) || info;
  L.prepSeen(st);
  const tips = prepTips(b);
  // 版式与结算卡、年报一致（线 2 统一：.krow 行、.kpbar 条、.kslot 锦囊行）：对手 / 你 / 胜算条 / 至多三条锦囊（做什么 → 胜算变成多少 +【去】）
  const foeImg = b.k === 'pact' ? rivalAvImg({ id: 'mu', n: st.exName || '' }, 40) : '';
  const vs = b.foe ? `<div class="kcard">${foeImg}<div class="grow"><div class="krow"><span class="k nm">${esc(b.foe.n)}</span><span class="v">战力 ${fmt(b.foe.pw)}</span></div><div class="krow"><span class="k">你</span><span class="v">战力 <span class="big">${fmt(b.S || L.power(st))}</span></span>${b.k === 'pact' && L.pactAssist(st) > 1 ? `<span class="s">含借力 ×${L.pactAssist(st)}</span>` : ''}</div></div></div>` : `<div class="krow"><span class="k">你</span><span class="v">战力 <span class="big">${fmt(L.power(st))}</span></span></div>`;
  const pBar = b.p !== undefined ? `<div class="krow"><span class="k">胜算</span><div class="kpbar"><i style="width:${(Math.max(0, Math.min(1, b.p)) * 100).toFixed(1)}%"></i></div><span class="s">${L.pct(b.p)}</span></div>` : '';
  const tipRows = tips.map((t, i) => `<div class="kslot"><div class="mid"><div class="nm">${esc(cut(t.t, 10))}</div>${t.p !== undefined ? `<small>胜算 → <span class="kup">${L.pct(t.p)}</span></small>` : ''}</div><button class="kb ${i ? 'alt' : ''}" data-ptip="${i}">去</button></div>`).join('');
  const s = sheet({ title: `备战 · ${esc(b.n)}<span class="hn">还有 ${Math.max(1, b.left)} ${UNIT}</span>`, center: true, noClose: true,
    body: `${vs}${pBar}${tipRows ? '<div class="ksec"><span>锦囊</span></div>' + tipRows : ''}`,
    foot: [{ t: '再准备一下', alt: true, fn: () => { closeModal(); } }, { t: '就这样上', gold: true, fn: () => { resumeClock(); closeModal(); } }] });
  s.querySelectorAll('[data-ptip]').forEach(el => el.onclick = () => {
    const t = tips[+el.dataset.ptip]; SFX.tap();
    if (t.art) { if (L.equipArt(st, t.art)) { SFX.coin(); showPrep(info); } return; }
    closeModal(); const f = PREP_GO[t.go]; if (f) try { f(); } catch (e) { /* 面板不在就算了 */ }
  });
}
