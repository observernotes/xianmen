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
  // 第一屏一行：完成度 + 下一世的修炼战力加成（变化用 ▲）；怎么算、道果进“详情”
  return `<div class="cxsum"><div><b>完成度 ${pctTxt(pct)}</b> · ${L.codexCells(st)} / ${L.codexTotal(st)} 格</div>
    <div class="pn-k">下一世修炼、战力 ${pnDelta('', Math.round(b * 100), Math.round(bn * 100), v => '+' + v + '%').trim()}</div>
    <details class="more"><summary>见多识广怎么算</summary><div class="muted">每 ${Math.round(L.CX_V.step * 100)}% 完成度，修炼、战力各 +${Math.round(L.CX_V.per * 100)}%，上限 +${Math.round(L.CX_V.cap * 100)}%，按投胎时的图鉴算：这一世 +${Math.round(b * 100)}%${nxt ? '；' + nxt : ''}。<br>图鉴跨世保留；这一世新记的格子轮回时每格道果 +${L.DG ? L.DG.cell : 2}（现在 +${L.codexNew(st)} 格）。</div></details></div>`;
}
function chainRows() {
  return L.chainProgress(st).map(c => {
    const best = Math.max(c.best, c.got), seg = Array.from({ length: c.total }, (x, i) => `<i class="${i < c.got ? 'on' : i < best ? 'past' : ''}"></i>`).join('');
    const hint = c.finished ? `走完了 · ${esc(c.fin)}` : esc(L.chainHint(st, c.id));
    return `<div class="cxchain${c.finished ? ' fin' : c.started ? ' on' : ''}" data-chain="${c.id}"><div class="line"><b>《${esc(c.n)}》</b><span class="num">${c.got}/${c.total}</span></div>
      <div class="cxseg">${seg}</div><div class="muted">${hint}${c.times ? ` · 历世走完 ${c.times} 次` : ''}</div>${!c.finished ? `<div class="muted">终点：${esc(c.fin)}</div>` : ''}</div>`;
  }).join('');
}
// 结局页（STORY_PLAN §3）：一个结局一格——点亮的是结局画面、名字、那一句话、第几世头一回见、见过几回；没点亮的是黑的，只有一句不剧透的暗示。
// 点亮的点开：正文（按缺省的走法）与【重看过场】。记录在 st.meta.endings（samsara.js 的 L.metaLife），旧档只有图鉴里的“点亮过”。
const END_ORDER = ['ascend', 'summit', 'daolv', 'hermit', 'shitu', 'mozun', 'gufeng', 'wentian', 'rest'];
const endList = () => L.ENDINGS.slice().sort((a, b) => (END_ORDER.indexOf(a.id) + 99) % 99 - (END_ORDER.indexOf(b.id) + 99) % 99);
const endLit = id => !!((st.meta.cx && st.meta.cx.end && st.meta.cx.end[id]) || (st.meta.endings && st.meta.endings[id]));
const endPicOf = (id, who) => (id === 'daolv' ? 'daolv_' + (who || 'su') : (L.STORY_END[id] && L.STORY_END[id].pic) || id);
const endCineOf = (id, who) => (id === 'ascend' ? 'feisheng' : id === 'rest' ? 'lunhui' : id === 'daolv' ? 'end_daolv_' + (who || 'su') : id === 'hermit' ? 'end_dixian' : 'end_' + id);
function endThumb(id, who, w) {
  const k = endPicOf(id, who); let c = null; try { c = ART.endingPic ? ART.endingPic(k) : ART.backdrop(k); } catch (e) { c = null; }
  return c ? `<img class="px" src="${urlOf(c, 'endpic|' + k)}" style="width:${w}px;height:${w * 0.6}px" alt="">` : '';
}
function endingGallery() {
  const rec = st.meta.endings || {}, w = pxFit(200, 132);
  return `<div class="endg">${endList().map(e => {
    const on = endLit(e.id), r = rec[e.id] || {}, X = L.STORY_END[e.id] || {};
    const sub = on ? `${r.life ? `第 ${r.life} 世` : '前世'}${r.n > 1 ? ` · ${r.n} 回` : ''}${r.tags && r.tags.length ? ' · ' + r.tags.join('、') : ''}` : '还没有见过';
    return `<button class="endg-t${on ? ' on' : ''}" data-end="${e.id}" ${on ? '' : 'aria-disabled="true"'}>
      <span class="endg-pic" style="width:${w}px;height:${w * 0.6}px">${on ? endThumb(e.id, r.who, w) : '<i>？</i>'}</span>
      <b>${on ? esc(e.n) : '？？？'}</b><span class="endg-l">${esc(on ? X.line || e.d || '' : X.hint || '')}</span><span class="endg-s">${esc(sub)}</span></button>`;
  }).join('')}</div>`;
}
function showEndingCard(id) {
  const e = L.ENDING[id], r = (st.meta.endings || {})[id] || {}; if (!e || !endLit(id)) return;
  const fake = { eflags: {}, p: st.p, npc: st.npc, meta: st.meta, origin: st.origin, exName: st.exName, daolv: id === 'daolv' ? r.who || 'su' : null, sect: st.sect, flags: {}, rebirth: st.rebirth };
  let paras = []; try { paras = L.endingParas ? L.endingParas(fake, id) : [L.STORY_END[id].text]; } catch (err) { paras = [(L.STORY_END[id] || {}).text || e.d]; }
  const cid = endCineOf(id, r.who), can = typeof CINE !== 'undefined' && !!CINE[cid] && (typeof cineSeen !== 'function' || cineSeen(cid) || id === 'rest');
  const w = pxFit(200, 300);
  sheet({ title: esc(e.n), center: true,
    body: `<div class="end-pic" style="width:${w}px;height:${w * 0.6}px">${endThumb(id, r.who, w)}</div>
      <div class="end-text still">${paras.map((t, i) => `<p class="${/^“/.test(t) ? 'say' : ''}${i === paras.length - 1 ? ' last' : ''}">${esc(t)}</p>`).join('')}</div>
      <p class="center muted">${r.life ? `第 ${r.life} 世头一回见` : '前世见过'}${r.n > 1 ? ` · 一共 ${r.n} 回` : ''}。换一种走法，正文里的几句会跟着变。</p>`,
    foot: [{ t: '回图鉴', alt: true, fn: () => showCodex('ending') }].concat(can ? [{ t: '重看过场 ▸', gold: true, fn: () => { closeModal(); cnAfter(cinePlay(cid, {}, { recall: true, force: true }), () => showEndingCard(id)); } }] : []) });
}
function showCodex(cat) {
  if (cat) cxCat = cat;
  const list = L.codexList(st);
  if (!list.some(c => c.id === cxCat) && cxCat !== 'drop') cxCat = 'map';
  const grid = list.filter(c => c.avail || c.id === cxCat).map(c => `<button class="cxcat${c.id === cxCat ? ' on' : ''}${c.full ? ' full' : ''}${c.avail ? '' : ' off'}" data-cx="${c.id}">${cxIcon(c.id)}<span class="nm">${esc(c.n)}</span><span class="num">${c.avail ? `${c.got}/${c.total}` : '未开'}</span></button>`).join('');
  // 掉落（刷宝线 C2，src/ui/loot.js）：各地点的掉落格，亮 = 掉过；不计入完成度
  const dropN = Object.values((st.meta && st.meta.drop) || {}).reduce((n, v) => { for (let b = v; b; b >>= 1) n += b & 1; return n; }, 0);
  const grid2 = grid + `<button class="cxcat${cxCat === 'drop' ? ' on' : ''}" data-cx="drop">${artIcon('wish', 24)}<span class="nm">掉落</span><span class="num">${dropN}</span></button>`;
  if (cxCat === 'drop') {
    const s = sheet({ title: shellTitle('path'), still: !!cat && !!document.querySelector('#modal #cxGrid'), body: meTabs('codex') + codexSummary() + `<div class="cxcats" id="cxGrid">${grid2}</div><div class="cxbody" id="cxBody"><div class="cxhead"><div class="grow"><b>掉落</b> ${dropN} 格<div class="muted">每个地方掉什么：亮的掉过，黑的还没见过。出发页能钉心愿。</div></div></div>${lootCodexHTML()}</div>` });
    bindMeTabs(s);
    s.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { SFX.tap(); showCodex(b.dataset.cx); });
    return;
  }
  const C = L.CODEX_CAT[cxCat], info = list.find(c => c.id === cxCat), G = L.CX_GRP[cxCat];
  let body = `<div class="cxhead">${cxIcon(cxCat, 2)}<div class="grow"><b>${esc(C.n)}</b> ${info.avail ? `${info.got}/${info.total}` : ''}<div class="muted">${esc(C.d)}</div>
    ${G ? `<div class="${info.grp ? 'jadet' : 'muted'}">集齐：${esc(G.d)}（永久）＋轮回道果 +${L.CX_V.grp}${info.grp ? ' · 已得' : ''}</div>` : ''}</div></div>`;
  if (!info.avail) body += '<p class="muted center">这一类还没开放（人物喜好要等送礼系统接上）。</p>';
  else if (cxCat === 'chain') body += chainRows();
  else if (cxCat === 'ending') body += endingGallery();
  else body += C.cells(st).map(g => `${g.g ? `<div class="cxg">${esc(g.g)}</div>` : ''}<div class="cxcells">${g.list.map(x => `<span class="cxc${x.on ? ' on' : ''}" title="${esc(x.d || '')}">${esc(x.n)}${x.v ? `<i>${esc(x.v)}</i>` : ''}</span>`).join('')}</div>`).join('');
  const again = !!cat && !!document.querySelector('#modal #cxGrid');
  const s = sheet({ title: shellTitle('path'), still: again, body: meTabs('codex') + codexSummary() + `<div class="cxcats" id="cxGrid">${grid2}</div><div class="cxbody" id="cxBody">${body}</div>` });
  bindMeTabs(s);
  s.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => { SFX.tap(); showCodex(b.dataset.cx); });
  s.querySelectorAll('[data-end]').forEach(b => b.onclick = () => { SFX.tap(); showEndingCard(b.dataset.end); });
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
