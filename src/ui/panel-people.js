/* 废柴仙途 · 界面片段 panel-people：【人物】→ 羁绊（人物卡：立绘、五心、喜好、委托、同伴、道侣双修）、来访时的【送礼】、
 * 历练确认页的同伴位与结算卡上的同行、委托完成卡、双修气泡与老祖讲解（SYSTEMS §12 / §17）。规则在 src/logic/people.js。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide 后：往 HINTS 里加讲解）。 */
// ---------- 立绘与小件 ----------
// 苏、夜男女主各一版（主角为女时是苏景行、夜无殇 → ART.portrait 的 alt）
const pplAlt = id => (id === 'su' || id === 'ye') && !!st.p.look.f;
function pplImg(id, w, mood) {
  if (!ART.portrait || !ART.hasPortrait || !ART.hasPortrait(id)) return npcAvImg(id, w);
  const c = ART.portrait(id, mood || 'n', pplAlt(id));
  return `<img class="px" src="${urlOf(c, ['pp', id, mood || 'n', pplAlt(id) ? 1 : 0].join('|'))}" style="width:${w}px;height:${w}px;flex:none" alt="">`;
}
const pplTa = id => (id === 'bai' ? '她' : id === 'su' || id === 'ye' ? (st.p.look.f ? '他' : '她') : '他');
const pplMood = id => { const a = L.aff(st, id); return st.daolv === id || a >= 80 ? 'joy' : a < 10 ? 'sad' : 'n'; };
const pplHearts = id => { const h = Math.min(5, L.hearts(st, id)); return '<span class="phearts">' + '♥'.repeat(h) + '<i>' + '♥'.repeat(5 - h) + '</i></span>'; };
const PMARK = { like: ['♥', 'plike'], hate: ['✕', 'phate'], mid: ['·', 'pmid'], unk: ['？', 'punk'] };
// 送礼列表右边写的数：♥ +8、一般 +3、✕ −3（迎客亭再 +1，L.pgiftVal）
const pmkVal = m => (m === 'unk' ? '没试过' : (L.pgiftVal(st, m) > 0 ? '+' : '') + L.pgiftVal(st, m));
const pmk = m => `<span class="pmk ${PMARK[m][1]}">${PMARK[m][0]}</span>`;
// 下一颗心在多少好感、叫什么
function pplNext(id) { const h = Math.min(5, L.hearts(st, id)); if (h >= 5) return null; const v = h === 4 ? L.heartMax(st) : (h + 1) * 20; return { v, n: L.HEART_N[h + 1] }; }

// ---------- 【人物】→ 羁绊 ----------
function bondTabHTML() {
  const vis = L.pgiftVisitor(st), comp = L.comp(st), dex = L.giftKnown(st);
  const head = L.PEOPLE2_ON === false ? '' : `<div class="mhead"><span>同伴位：${comp ? `${pplImg(comp, pxs(24, 1), 'n')}${esc(L.compName(st, comp))}（${esc(L.COMP[comp].n)}）` : '空着'}</span><span class="muted">喜好图鉴 ${dex.found}/${dex.total}</span></div>`;
  return head + Object.keys(L.NPCS).map(id => pplCard(id, vis)).join('') + tianCard()
    + `<div class="muted">好感：奇遇里的抉择、来访时送礼（♥ +${L.PGIFT_V.like}、一般 +${L.PGIFT_V.mid}、✕ ${L.PGIFT_V.hate}）、委托（+${L.PQ_AFF}）。二心来访、三心知己、四心同行（每趟历练、秘境带一位）、五心终章；苏与夜二人中只能与一位结为道侣。试出来的喜好记进图鉴，下一世还在。</div>`;
}
function pplCard(id, vis) {
  const N = L.NPCS[id];
  if (!L.met(st, id)) return `<div class="card flat" style="opacity:.55"><div class="av" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--muted)">？</div><div class="main"><div>？？？</div><div class="muted">${N.title} · 尚未相识</div></div></div>`;
  const a = L.aff(st, id), h = Math.min(5, L.hearts(st, id)), on = L.PEOPLE2_ON !== false;
  const tag = st.daolv === id ? '<span class="chip ok">道侣</span>' : a >= 60 ? '<span class="chip ok">知己</span>' : a >= 30 ? '<span class="chip">熟识</span>' : '<span class="chip">初识</span>';
  const rows = [];
  rows.push(`<div class="line"><span>${esc(L.npcName(st, id))}</span>${tag}${pplHearts(id)}</div>`);
  rows.push(`<div class="muted">${N.title} · ${L.HEART_N[h]}${vis === id ? ' · <b class="seal">正在门口</b>' : ''}</div>`);
  rows.push(`<div class="pbarrow">${bar(a / 100, a >= 60)}<span class="num">${a}/100</span></div>`);
  rows.push(`<div class="${a >= 60 ? 'jadet' : 'muted'}">${a >= 60 ? '✓' : '·'} 三心知己：${esc(L.friendText ? L.friendText(st, id) : N.bonus)}</div>`);
  if (on) {
    // 喜好：已知的写名字，没试出来的是“？”
    const K = (L.giftKnown(st).list.find(x => x.id === id) || { cells: [] }).cells;
    rows.push(`<div class="pprefs"><span class="muted">喜好</span>${K.map(c => `<span class="ppref ${c.kind === 'like' ? 'plike' : 'phate'}">${c.kind === 'like' ? '♥' : '✕'} ${c.known ? esc(c.n) : '？'}</span>`).join('')}</div>`);
    // 委托
    for (const i of [1, 2]) rows.push(pqRow(id, i));
    // 同伴
    if (id !== st.daolv) {
      const why = L.compWhy(st, id), cur = L.comp(st) === id;
      if (!why) rows.push(`<div class="pcompr"><span class="grow">四心同行：${esc(L.COMP[id].d)}</span><button class="btn sm ${cur ? 'alt' : 'gold'} eq" data-ppcomp="${cur ? '' : id}">${cur ? '不带了' : '同行'}</button></div>`);
      else if (h >= 3) rows.push(`<div class="muted">· 四心同行（好感 80）：${esc(L.COMP[id].d)}</div>`);
    }
    // 道侣
    if (st.daolv === id) {
      const sx = L.sxInfo(st), A = sx.art && L.art(sx.art);
      rows.push(`<div class="pcompr"><span class="grow">道侣同行，不占同伴位：${esc(L.COMP[id].d)}。<b>双修</b>：${sx.len} 周天修炼 ×${sx.m.toFixed(2)}，不花灵石${A ? `，${sx.artNew ? '学' : '熟练'}《${esc(A.n)}》` : ''}</span><button class="btn sm ${sx.ok ? 'gold' : 'alt'} eq" id="btnSx" ${sx.ok ? '' : 'disabled'}><span>双修</span>${sx.ok ? '' : `<small>${esc(sx.why)}</small>`}</button></div>`);
    } else if (N.daolv && !st.daolv) rows.push(`<div class="muted">· 可结为道侣：好感 90、心意相通之后，${pplTa(id)}会来问你</div>`);
    // 来访：送礼
    if (vis === id) { const why = L.pgiftWhy(st, id); rows.push(`<button class="btn ${why ? 'alt' : 'gold'} giftb" data-ppgift="${id}" ${why ? 'disabled' : ''}><span>送礼</span><small>${why ? esc(why) : '身上现有的东西点一样'}</small></button>`); }
  } else if (N.daolv) rows.push('<div class="muted">· 可结为道侣（双修 修炼 ×1.25）</div>');
  return `<div class="card flat pcard2" data-pp="${id}">${pplImg(id, pxs(48, 1), pplMood(id))}<div class="main">${rows.join('')}</div></div>`;
}
// 化敌为友之后的楚天阔：只有同伴这一行（没有好感、喜好、委托）
function tianCard() {
  if (L.PEOPLE2_ON === false || L.compWhy(st, 'tian')) return '';
  const cur = L.comp(st) === 'tian';
  return `<div class="card flat pcard2">${pplImg('tian', pxs(48, 1), 'n')}<div class="main"><div class="line"><span>楚天阔</span><span class="chip ok">化敌为友</span></div><div class="muted">天剑宗圣子 · 说过“往后你去哪，我的剑跟着”</div>
    <div class="pcompr"><span class="grow">同行：${esc(L.COMP.tian.d)}</span><button class="btn sm ${cur ? 'alt' : 'gold'} eq" data-ppcomp="${cur ? '' : 'tian'}">${cur ? '不带了' : '同行'}</button></div></div></div>`;
}
function pqRow(id, i) {
  const Q = L.pqDef(id, i), pr = L.pqProg(st, id, i);
  if (pr.s === 'none') return `<div class="pq off">${icon16('quest', 1)}<span class="grow muted">委托·${i === 1 ? '二心' : '四心'}：${esc(pr.t)}</span></div>`;
  const done = pr.s === 'done';
  const give = !done && Q.ty === 'give' ? `<button class="btn sm ${pr.can ? 'gold' : 'alt'} eq" data-ppq="${id}:${i}" ${pr.can ? '' : 'disabled'}><span>交付</span>${pr.can ? '' : `<small>${esc(pr.why)}</small>`}</button>` : '';
  return `<div class="pq ${done ? 'done' : ''}">${icon16('quest', 1)}<div class="grow"><b>委托·${esc(Q.t)}</b>${done ? ' <span class="chip ok">已完成</span>' : ` <span class="muted num">${esc(pr.t)}</span>`}
    ${done ? '' : `<div>${esc(L.pqDesc(st, id, i))}</div><div class="goldt">好感 +${L.PQ_AFF} · ${esc(Q.rwT)}</div>`}</div>${give}</div>`;
}
function bindBondTab(s) {
  s.querySelectorAll('[data-ppcomp]').forEach(b => b.onclick = () => { SFX.tap(); L.setComp(st, b.dataset.ppcomp || null); showMe('bond'); });
  s.querySelectorAll('[data-ppq]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.ppq.split(':'); const r = L.pqGive(st, id, +i); if (r) { SFX.coin(); showPqDone(r, () => showMe('bond')); } });
  s.querySelectorAll('[data-ppgift]').forEach(b => b.onclick = () => { SFX.tap(); showGift(b.dataset.ppgift, () => showMe('bond')); });
  const sx = s.querySelector('#btnSx'); if (sx) sx.onclick = () => { const r = L.shuangxiu(st); if (!r) return; SFX.coin(); closeModal(); floatText(HOMEPOS.x, HOMEPOS.y - 40, `双修 ×${r.m.toFixed(2)}`, '#ffb0c8'); if (r.it) floatText(HOMEPOS.x, HOMEPOS.y - 28, L.artItemText(st, r.it), '#ffe39a', false, true); };
}

// ---------- 送礼 ----------
// back：送完【继续】回到哪（来访事件的弹窗，或人物页）
function showGift(id, back) {
  const opts = L.pgiftOpts(st, id), a = L.aff(st, id), nx = pplNext(id);
  const rows = opts.map(o => `<button class="btn alt pgiftopt" data-pg="${esc(o.key)}">${pmk(o.mark)}<span class="grow">${esc(o.text)}</span><small class="${o.mark === 'like' ? 'jadet' : o.mark === 'hate' ? 'seal' : 'muted'}">${pmkVal(o.mark)}</small></button>`).join('')
    || '<p class="muted">身上没什么拿得出手的。灵草、灵矿、兽粮、丹药、药引、功法抄本都能送。</p>';
  const s = sheet({ title: `送礼 · ${esc(L.npcName(st, id))}`, center: true,
    sub: `好感 ${a}/100 · ${L.HEART_N[Math.min(5, L.hearts(st, id))]}${nx ? ` · 到 ${nx.v} 是${nx.n}` : ''}`,
    body: `<div class="speaker">${pplImg(id, 44, pplMood(id))}<p class="grow muted" style="margin:0">一回来访送一样：♥ 喜欢 ${pmkVal('like')}、一般 ${pmkVal('mid')}、✕ 讨厌 ${pmkVal('hate')}${L.visitFavorBonus && L.visitFavorBonus(st) ? '（迎客亭 +' + L.visitFavorBonus(st) + '）' : ''}。没试过的写着“？”。</p></div><div class="pgifts">${rows}</div>`,
    foot: [{ t: '算了', alt: true, fn: back }] });
  s.querySelectorAll('[data-pg]').forEach(b => b.onclick = () => {
    const r = L.pgiftGive(st, id, b.dataset.pg); if (!r) return;
    if (r.react === 'like') SFX.win(); else if (r.react === 'hate') SFX.fail(); else SFX.coin();
    floatText(100, 70, `${PMARK[r.react][0]} 好感 ${r.d >= 0 ? '+' : ''}${r.d}`, r.react === 'hate' ? '#ff9a8a' : '#ffb0c8');
    const nx2 = pplNext(id), note = r.fresh ? `<div class="quote">记进图鉴：${pmk(r.react)} ${esc(r.x.tags.map(t => L.GIFT_TAG_N[t]).join(' / '))}</div>` : '';
    sheet({ title: `送礼 · ${esc(L.npcName(st, id))}`, center: true, noClose: true,
      body: `<div class="speaker">${pplImg(id, 44, r.react === 'like' ? 'joy' : r.react === 'hate' ? 'ang' : 'n')}<p class="grow" style="margin:0">${esc(r.line)}</p></div>
        <div class="fxlist"><span>${esc(r.x.text)}</span><span>好感 ${r.a0} → <b>${r.a1}</b></span>${nx2 ? `<span>到 ${nx2.v} 是${nx2.n}</span>` : ''}</div>${note}`,
      foot: [{ t: '继续', gold: true, fn: back }] });
  });
}
// 来访事件弹窗里的【送礼】（events.js 的 showChoice 调）
function peopleGiftBar(ev) {
  if (!st || L.PEOPLE2_ON === false || !ev || !ev.npc || !st.visitor || st.visitor.id !== ev.id || L.pgiftVisitor(st) !== ev.npc) return '';
  const why = L.pgiftWhy(st, ev.npc);
  return `<div class="pgiftbar"><button class="btn ${why ? 'alt' : 'gold'} giftb" id="ppGift" ${why ? 'disabled' : ''}><span>送礼</span><small>${why ? esc(why) : `好感 ${L.aff(st, ev.npc)}/100 · 身上的东西点一样`}</small></button></div>`;
}
function bindPeopleGift(s, ev, back) { const b = s.querySelector('#ppGift'); if (b) b.onclick = () => { SFX.tap(); showGift(ev.npc, () => showChoice(ev, back)); }; }

// ---------- 委托完成卡 ----------
function showPqDone(r, back) {
  const items = (r.items || []).map(it => (typeof itemLine === 'function' ? itemLine(it) : '')).join('');
  const plain = r.texts.filter(t => !(r.items || []).some(it => L.itemText(st, it) === t));
  sheet({ title: `委托完成 · ${esc(L.fill(st, r.Q.t))}`, center: true, noClose: true,
    body: `<div class="speaker">${pplImg(r.id, 56, 'joy')}<div class="grow"><div class="seal">${esc(L.npcName(st, r.id))}</div><p style="margin:4px 0 0">${esc(r.line)}</p></div></div>
      <div class="fxlist">${plain.map(t => `<span>${esc(t)}</span>`).join('')}</div>${items}`,
    foot: [{ t: '继续', gold: true, fn: back || closeModal }] });
  SFX.goal();
}
// ---------- 历练：确认页的同伴位、结算卡上的同行 ----------
function compExpLine(k, d, a) {
  if (L.PEOPLE2_ON === false) return '';
  const cands = L.COMP_IDS.filter(id => !L.compWhy(st, id)), list = L.compList(st);
  if (!cands.length && !list.length) return '';
  const bits = list.map(id => `${pplImg(id, pxs(24, 1), 'n')}<span>${st.daolv === id ? '道侣 ' : ''}${esc(L.compName(st, id))}：${esc(L.COMP[id].n)}</span>`).join('');
  return `<div class="pcompexp" id="ppCompExp"><span class="muted">同伴</span>${bits || '<span class="muted">没带人</span>'}${cands.length ? '<button class="btn sm alt eq" id="ppCompSw">换</button>' : ''}</div>`;
}
function bindCompExp(s, back) {
  const b = s.querySelector('#ppCompSw'); if (!b) return;
  b.onclick = () => {
    SFX.tap();
    const cands = L.COMP_IDS.filter(id => !L.compWhy(st, id)), cur = L.comp(st);
    const rows = cands.map(id => `<button class="btn ${id === cur ? 'gold' : 'alt'} pgiftopt" data-cc="${id}">${pplImg(id, pxs(24, 1), 'n')}<span class="grow">${esc(L.compName(st, id))}</span><small>${esc(L.COMP[id].n)}</small></button>`).join('')
      + `<button class="btn ${cur ? 'alt' : 'gold'} pgiftopt" data-cc=""><span class="grow">不带人</span></button>`;
    const s2 = sheet({ title: '同伴', center: true, sub: '一趟历练（或一次秘境）带一位；道侣另算，不占这一格', body: `<div class="pgifts">${rows}</div>`, foot: [{ t: '返回', alt: true, fn: back }] });
    s2.querySelectorAll('[data-cc]').forEach(x => x.onclick = () => { SFX.tap(); L.setComp(st, x.dataset.cc || null); back(); });
  };
}
function compResLine(res) {
  if (!res.comps || !res.comps.length) return (res.pq || []).filter(Boolean).map(q => `<div class="quote jadet">委托完成「${esc(L.fill(st, q.Q.t))}」：${esc(q.texts.join('、'))}</div>`).join('');
  const nm = res.comps.map(id => L.compName(st, id)).join('、');
  const bits = [];
  if (res.compSave) bits.push(`本是负伤而归，${esc(L.npcName(st, res.compSave))}替你挡下了`);
  if (res.compHerbs) bits.push(`葛老多带回灵草 ${fmt(res.compHerbs)}`);
  if (res.compYin) bits.push(`还挖到一枚${L.YIN_N[res.compYin]}`);
  if (res.compStone) bits.push(`${esc(L.npcName(st, 'ye'))}在，灵石 ×${L.COMP_V.ye}`);
  return `<div class="quote">同行：${esc(nm)}${bits.length ? '——' + bits.join('；') : ''}</div>` + (res.pq || []).filter(Boolean).map(q => `<div class="quote jadet">委托完成「${esc(L.fill(st, q.Q.t))}」：${esc(q.texts.join('、'))}</div>`).join('');
}

// ---------- 逻辑事件（hud.js 的 onHook 转来） ----------
function peopleHook(d) {
  if (!st || !d) return;
  if (d.k === 'qnew') {
    const Q = L.pqDef(d.id, d.i);
    floatText(100, 58, `${L.npcName(st, d.id)}托你一件事`, '#ffe39a');
    if (st.hintSeen && st.hintSeen.ppQuest) tip(`pq_${d.id}${d.i}`, `${L.npcName(st, d.id)}托你一件事——「${L.fill(st, Q.t)}」：${L.pqDesc(st, d.id, d.i)}。办成了好感 +${L.PQ_AFF}，还有${Q.rwT}。`);
  } else if (d.k === 'qdone') {
    // 历练结算卡上已经有一行、人物卡上交付时当场弹卡；其余（炼丹、首领、秘境、丹方）排队弹一张完成卡
    if (d.via === 'exp' || d.via === 'give' || !d.res) return;
    if (cine) banner(`委托完成 · ${L.npcName(st, d.id)}`, `${L.fill(st, d.res.Q.t)}：好感 +${L.PQ_AFF}`);
    else pushPopup(() => showPqDone(d.res));
  } else if (d.k === 'sx') {
    if (st.hintSeen && st.hintSeen.ppSx) { const sx = L.sxInfo(st); tip('sx_' + L.pplOf(st).sx, `能和${L.npcName(st, d.id)}双修了：${sx.len} 个周天修炼 ×${sx.m.toFixed(2)}，不花灵石${sx.art ? `，还有《${L.art(sx.art).n}》` : ''}。【人物】→ 羁绊。`); }
  }
}
// 底栏【人物】的角标：有委托能交、能双修
function peopleBadge() {
  if (!st || L.PEOPLE2_ON === false || L.busy(st)) return '';
  if (L.pqActive(st).some(x => x.Q.ty === 'give' && !L.pqGiveWhy(st, x.id, x.i))) return '委';
  if (st.daolv && L.sxInfo(st).ok) return '侣';
  return '';
}

// ---------- 老祖讲解（SYSTEMS §17）：第一次送礼、第一个委托、第一位四心同行、可以结道侣、第一次双修；数字当场算 ----------
const pplCalm = () => st.guide && st.guide.done && !modalOpen() && !L.busy(st) && !(st.storyQ || []).length && L.PEOPLE2_ON !== false;
// 讲送礼时老祖顺口点破一样 ♥（记进图鉴；算一次就固定下来，免得重画时换了一样）
function giftHintLike(id) { const nt = L.pplOf(st).note; if (!nt.gh || nt.gh.id !== id) nt.gh = { id, t: L.pgiftHintLike(st, id) }; return nt.gh.t; }
function daolvReady() { return ['su', 'ye'].filter(id => !st.daolv && L.met(st, id) && L.aff(st, id) >= 90 && st.eflags && st.eflags[id + '_bond'] && !(L.daolvBlocked && L.daolvBlocked(st))).sort((a, b) => L.aff(st, b) - L.aff(st, a))[0]; }
const peopleHints = [
  { id: 'ppGift', intro: true, when: () => st.guide && st.guide.done && st.p.r >= 1 && L.PEOPLE2_ON !== false && modalOpen() && !!document.querySelector('#ppGift:not([disabled])') && !!L.pgiftVisitor(st), target: '#ppGift', btn: '好', text: () => {
      const id = L.pgiftVisitor(st), t = giftHintLike(id), a = L.aff(st, id), nx = pplNext(id), ta = pplTa(id);
      return `${esc(L.npcName(st, id))}来串门，可以<b>【送礼】</b>：身上现有的东西点一样。老夫知道${ta}最喜欢<b>${esc(L.GIFT_TAG_N[t])}</b>，送一份 <b>${pmkVal('like')}</b> 好感，现在 <b>${a}/100</b>${nx ? `，到 <b>${nx.v}</b> 就是${nx.n}` : ''}。别的一般 ${pmkVal('mid')}，送错了 ${pmkVal('hate')}；试过的记上 ♥ / ✕，下一世还记得。`;
    } },
  { id: 'ppQuest', intro: true, when: () => pplCalm() && L.pqActive(st).length > 0, target: '[data-nav="me"]', btn: '好', text: () => {
      const x = L.pqActive(st)[0], a = L.aff(st, x.id);
      return `${esc(L.npcName(st, x.id))}托你一件事——<b>「${esc(L.fill(st, x.Q.t))}」</b>：${esc(L.pqDesc(st, x.id, x.i))}。办成了好感 <b>+${L.PQ_AFF}</b>（现在 ${a}），还有${esc(x.Q.rwT)}。二心、四心各一件，【人物】→ 羁绊里看。`;
    } },
  { id: 'ppComp', intro: true, when: () => pplCalm() && L.PPL.some(id => !L.compWhy(st, id)), target: '[data-nav="exp"]', btn: '好', text: () => {
      const id = L.PPL.includes(L.comp(st)) ? L.comp(st) : L.PPL.find(x => !L.compWhy(st, x)), ta = pplTa(id);
      if (!L.comp(st)) L.setComp(st, id);
      return `${esc(L.npcName(st, id))}到四心了，愿意跟你出门：${ta}在同伴位上，每趟历练、每回秘境都跟着——<b>${esc(L.COMP[id].d)}</b>。一次只带一位，出发页的“同伴”那一行点【换】。`;
    } },
  { id: 'ppDaolv', intro: true, when: () => pplCalm() && !!daolvReady(), target: '[data-nav="me"]', btn: '好', text: () => {
      const id = daolvReady(), ta = pplTa(id), m = L.retMult(st), ex = L.gainCalm(st) * (m - 1) * L.RET.len, A = L.art(L.DAOLV_ARTS[id][0]);
      return `${esc(L.npcName(st, id))}好感 <b>${L.aff(st, id)}</b>，心里有你了：${ta}下回来访，就能<b>结为道侣</b>。道侣同行不占同伴位，每 <b>${L.SX.every}</b> 周天<b>双修</b>一次——等于一次不花灵石的闭关（眼下 ×${m.toFixed(2)}，多得约 <b>${fmt(ex)}</b> 修为），还教你${ta}的功法（头一门《${esc(A.n)}》）。苏、夜只能选一位。`;
    } },
  { id: 'ppSx', intro: true, when: () => pplCalm() && !!st.daolv && L.sxInfo(st).ok, target: '[data-nav="me"]', btn: '好', text: () => {
      const sx = L.sxInfo(st), id = st.daolv, A = sx.art && L.art(sx.art), c = L.retCost(st);
      return `能和${esc(L.npcName(st, id))}<b>双修</b>了：${sx.len} 个周天修炼 <b>×${sx.m.toFixed(2)}</b>，不花灵石（闭关要 ${fmt(c)}）${A ? `，还能学到《${esc(A.n)}》` : ''}。每 ${L.SX.every} 周天一次。【人物】→ 羁绊，点${esc(L.npcName(st, id))}卡上的【双修】。`;
    } },
];
HINTS.push(...peopleHints);
// 测试入口（tools/shot.js、content_test.js 用）
if (typeof window !== 'undefined') Object.assign(window.__xm_people = {}, { showGift, showPqDone, bondTabHTML, compExpLine, compResLine, peopleGiftBar, peopleBadge, get hints() { return peopleHints; } });
