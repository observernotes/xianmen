/* 废柴仙途 · 界面片段 panel-prep：大节点前 1 月的备战卡（docs/KAIRO_PLAN.md §3.3 第 4 条；数据 L.bigInfo / out.prep）
 * 对手头像与战力、你的战力、胜算条、“还能做什么”（= 变强页目标页签的动作卡 L.advise(st,'goal').acts，同一个部件 advCards，docs/KAIRO_PLAN.md §10.7）；
 * 【再准备一下】关卡片，时间仍停在这个月初，直到玩家自己点速度键继续；【就这样上】关卡片、时间接着走。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 clock 之后）。 */
function showPrep(info) {
  if (!st) return;
  const b = L.bigInfo(st, info) || info;
  L.prepSeen(st);
  const tips = L.advise(st, 'goal').acts.filter(a => a.id !== 'idle');
  // 版式与结算卡、年报一致：对手 / 你 / 胜算条 / 至多三张动作卡（同变强页，当场能做的点了留在这张卡上重算）
  const foeImg = b.k === 'pact' ? rivalAvImg({ id: 'mu', n: st.exName || '' }, 40) : '';
  const vs = b.foe ? `<div class="kcard">${foeImg}<div class="grow"><div class="krow"><span class="k nm">${esc(b.foe.n)}</span><span class="v">战力 ${fmt(b.foe.pw)}</span></div><div class="krow"><span class="k">你</span><span class="v">战力 <span class="big">${fmt(b.S || L.power(st))}</span></span>${b.k === 'pact' && L.pactAssist(st) > 1 ? `<span class="s">含借力 ×${L.pactAssist(st)}</span>` : ''}</div></div></div>` : `<div class="krow"><span class="k">你</span><span class="v">战力 <span class="big">${fmt(L.power(st))}</span></span></div>`;
  const pBar = b.p !== undefined ? `<div class="krow"><span class="k">胜算</span><div class="kpbar"><i style="width:${(Math.max(0, Math.min(1, b.p)) * 100).toFixed(1)}%"></i></div><span class="s">${L.pct(b.p)}</span></div>` : '';
  const tipRows = advCards(tips, { flat: true });
  const s = sheet({ title: `备战 · ${esc(b.n)}<span class="hn">还有 ${Math.max(1, b.left)} ${UNIT}</span>`, center: true, noClose: true,
    body: `${vs}${pBar}${tipRows ? '<div class="ksec"><span>还能做什么</span><span>涨多少 · 花什么</span></div>' + tipRows : ''}`,
    foot: [{ t: '再准备一下', alt: true, fn: () => { closeModal(); } }, { t: '就这样上', gold: true, fn: () => { resumeClock(); closeModal(); } }] });
  bindAdv(s, tips, () => showPrep(info));
}
