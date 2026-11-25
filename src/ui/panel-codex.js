/* 废柴仙途 · 界面片段 panel-codex：人物 → 图鉴（十四类网格、奇遇链进度“3/5”）；奇遇链与图鉴的横幅、气泡；老祖讲图鉴、讲轮回结算
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide、panel-trib 后面：往 HINTS 里加讲解）。
 * 逻辑在 src/logic/codex.js（L.codexList / codexPct / codexBonus / codexNextStep / CODEX[].cells）与 chains.js（L.chainProgress / chainHint）。 */
// ---------- 图鉴页 ----------
let cxCat = 'map';
const cxIcon = (cat, z) => { const c = ART.codexIcon ? ART.codexIcon(cat) : null; if (!c) return ''; const s = pxs(16, z || 1.5); return `<img class="px" src="${urlOf(c, 'cx|' + cat)}" style="width:${s}px;height:${s}px;flex:none" alt="">`; };
const pctTxt = v => Math.round(v * 100) + '%';
function codexSummary() {
  const pct = L.codexPct(st), b = L.codexBonus(st), bn = L.codexBonusNext(st), nx = L.codexNextStep(st);
  const nxt = nx ? `再记约 <b>${nx.n}</b> 格「${esc(L.CODEX_CAT[nx.cat].n)}」，下一世到 +${Math.round((bn + L.CX_V.per) * 100)}%` : bn >= L.CX_V.cap ? '已到上限' : '';
  return `<div class="cxsum"><div><b>完成度 ${pctTxt(pct)}</b> · ${L.codexCells(st)} / ${L.codexTotal(st)} 格</div>
    <div>见多识广（每 ${Math.round(L.CX_V.step * 100)}% 修炼、战力各 +${Math.round(L.CX_V.per * 100)}%，上限 +${Math.round(L.CX_V.cap * 100)}%，按投胎时的图鉴算）：这一世 <b class="jadet">+${Math.round(b * 100)}%</b>，照现在的图鉴下一世 <b class="jadet">+${Math.round(bn * 100)}%</b>${nxt ? '；' + nxt : ''}</div>
    <div class="muted">图鉴跨世保留；这一世新记的格子轮回时每格道果 +${L.DG ? L.DG.cell : 2}（现在 +${L.codexNew(st)} 格）。</div></div>`;
}
function chainRows() {
  return L.chainProgress(st).map(c => {
    const best = Math.max(c.best, c.got), seg = Array.from({ length: c.total }, (x, i) => `<i class="${i < c.got ? 'on' : i < best ? 'past' : ''}"></i>`).join('');
    const hint = c.finished ? `走完了 · ${esc(c.fin)}` : esc(L.chainHint(st, c.id));
    return `<div class="cxchain${c.finished ? ' fin' : c.started ? ' on' : ''}" data-chain="${c.id}"><div class="line"><b>《${esc(c.n)}》</b><span class="num">${c.got}/${c.total}</span></div>
      <div class="cxseg">${seg}</div><div class="muted">${hint}${c.times ? ` · 历世走完 ${c.times} 次` : ''}</div>${!c.finished ? `<div class="muted">终点：${esc(c.fin)}</div>` : ''}</div>`;
  }).join('');
}
function showCodex(cat) {
  if (cat) cxCat = cat;
  const list = L.codexList(st);
  if (!list.some(c => c.id === cxCat)) cxCat = 'map';
  const grid = list.map(c => `<button class="cxcat${c.id === cxCat ? ' on' : ''}${c.full ? ' full' : ''}${c.avail ? '' : ' off'}" data-cx="${c.id}">${cxIcon(c.id)}<span class="nm">${esc(c.n)}</span><span class="num">${c.avail ? `${c.got}/${c.total}` : '未开'}</span></button>`).join('');
  const C = L.CODEX_CAT[cxCat], info = list.find(c => c.id === cxCat), G = L.CX_GRP[cxCat];
  let body = `<div class="cxhead">${cxIcon(cxCat, 2)}<div class="grow"><b>${esc(C.n)}</b> ${info.avail ? `${info.got}/${info.total}` : ''}<div class="muted">${esc(C.d)}</div>
    ${G ? `<div class="${info.grp ? 'jadet' : 'muted'}">集齐：${esc(G.d)}（永久）＋轮回道果 +${L.CX_V.grp}${info.grp ? ' · 已得' : ''}</div>` : ''}</div></div>`;
  if (!info.avail) body += '<p class="muted center">这一类还没开放（人物喜好要等送礼系统接上）。</p>';
  else if (cxCat === 'chain') body += chainRows();
  else body += C.cells(st).map(g => `${g.g ? `<div class="cxg">${esc(g.g)}</div>` : ''}<div class="cxcells">${g.list.map(x => `<span class="cxc${x.on ? ' on' : ''}" title="${esc(x.d || '')}">${esc(x.n)}${x.v ? `<i>${esc(x.v)}</i>` : ''}</span>`).join('')}</div>`).join('');
  const again = !!cat && !!document.querySelector('#modal #cxGrid');
  const s = sheet({ title: '人物', still: again, body: meTabs('codex') + codexSummary() + `<div class="cxcats" id="cxGrid">${grid}</div><div class="cxbody" id="cxBody">${body}</div>` });
  bindMeTabs(s);
  s.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { SFX.tap(); showCodex(b.dataset.cx); });
  if (again) { const bd = s.querySelector('.body'), cb = s.querySelector('#cxBody'); if (bd && cb) bd.scrollTop = cb.offsetTop - bd.offsetTop - 8; }
}

// ---------- 横幅与气泡 ----------
{ const h0 = onHook; onHook = function (type, data) {
  h0(type, data);
  if (!st) return;
  if (type === 'chain' && data) {
    const C = L.CHAIN[data.id]; if (!C) return;
    if (data.got < data.total) {
      floatText(100, 52, `《${C.n}》${data.got}/${data.total}`, '#ffe39a');
      // 下一步在某张图的历练途中：提一句去哪儿（每一步一次）
      const p = L.chainProgress(st).find(x => x.id === data.id);
      if (p && p.ev && p.ev.where === 'exp' && st.guide && st.guide.done) tip(`chain_${data.id}_${p.next}`, `《${C.n}》的下一步在${p.where}${p.cond.length ? '（' + p.cond.join('、') + '）' : ''}。【人物】→ 图鉴 → 奇遇链 里看得到。`);
    }
  } else if (type === 'chainDone' && data) { const C = L.CHAIN[data.id]; if (C) { banner('奇遇链 · ' + C.n, '走完了'); SFX.goal(); } }
  else if (type === 'codexGrp') { const C = L.CODEX_CAT[data]; if (C) { banner('图鉴集齐 · ' + C.n, L.CX_GRP[data] ? L.CX_GRP[data].d + '（永久）' : ''); SFX.reveal(4); } }
}; }

// ---------- 老祖：图鉴第一次有新格、第一次轮回结算、第一次进轮回殿（数字当场算） ----------
const cxCalm = () => st.guide.done && !modalOpen() && !L.busy(st) && !(st.storyQ || []).length;
const samsaraHints = [
  { id: 'codex1', intro: true, when: () => cxCalm() && (st.cxNews || []).length > 0 && L.codexCells(st) >= 3, target: '[data-nav="me"]', btn: '好', text: () => {
      const n = st.cxNews[st.cxNews.length - 1], C = L.CODEX_CAT[n.cat], b = L.codexBonusNext(st), nx = L.codexNextStep(st);
      return `刚记下一格「${esc(C.n)}」。这是<b>图鉴</b>：地点相性、功法、法宝、丹方……十四类，现在 <b>${L.codexCells(st)}</b> 格，完成度 <b>${pctTxt(L.codexPct(st))}</b>，跨世保留。每满 10%，<b>投胎以后</b>修炼、战力各 +1%（照现在下一世 <b>+${Math.round(b * 100)}%</b>${nx ? `，再记约 ${nx.n} 格「${esc(L.CODEX_CAT[nx.cat].n)}」到 +${Math.round((b + L.CX_V.per) * 100)}%` : ''}）；轮回时这一世新记的每格道果 +${L.DG.cell}。【人物】→ 图鉴。`;
    } },
  { id: 'samsara1', urgent: true, intro: true, when: () => modalTitle() === '轮回结算' && !!document.querySelector('#dgTotal') && !!st.settle, target: '#dgTotal', btn: '知道了', text: () => {
      const S = st.settle, w = L.HALL_NODE.wis, k = S.mults.find(m => /因果/.test(m.n));
      return `这一世能带走 <b>${fmt(S.total)}</b> 道果，其中图鉴 <b>+${fmt(S.codex)}</b>${k ? `；未了的因果把它压了一截（×${k.v.toFixed(2)}）` : ''}。道果带去<b>轮回殿</b>换永久的东西：宿慧一级修炼 +15%（${fmt(w.cost[L.perk(st, 'wis')] || 0)} 道果），出身、命格、传承都在后面几页。花不完的留着，下一世接着攒——你现在一共 <b>${fmt(L.daoguo(st))}</b>。`;
    } },
  { id: 'hall1', urgent: true, intro: true, when: () => modalTitle() === '轮回殿' && !!document.querySelector('#hallGrid'), target: '#hallGrid', btn: '好', text: () => {
      const can = L.HALL.filter(h => !L.hallWhy(st, h.id));
      return `点一个节点看它管什么，再点<b>【点亮】</b>。你有 <b>${fmt(L.daoguo(st))}</b> 道果，现在买得起 <b>${can.length}</b> 项${can.length ? `（最便宜的是「${esc(can.sort((a, b) => L.hallCost(st, a.id) - L.hallCost(st, b.id))[0].n)}」${fmt(L.hallCost(st, can[0].id))}）` : ''}。出身也在这里点亮，点亮了下一页才能选。`;
    } },
];
HINTS.push(...samsaraHints);
// 测试与机器人用（window.__xm 在 boot.js 里，这里另挂一个）
window.__xm_samsara = { showCodex, rebirthFlow, showSettle, showLegacy, showHall, showOriginPick, showTrials, showOpening, doRebirth, rebirthPick, get RB() { return RB; } };
