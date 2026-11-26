/* 废柴仙途 · 界面片段 mainline：主线保底的界面一半（规则在 src/logic/mainline.js）
 *   下战书：这一章要击败的宿敌，宿敌卡上有【下战书】（#btnChal），点了先进准备页（换克他的战技），再【下战书】开打；只剩他没打时他自己上门（runMainFoe）。
 *   没宗门时的宗门页：每家一行【投帖】（data-join）；无宗试炼写明走散修之路。
 *   老祖：卡住时的一句“下一步”（showMainHint，带【去看看】）、降要求那一回（showMainEase）。
 *   目标卡【去】的 mainfoe：打开这一章要打的那位的宿敌卡。
 *   行动点（docs/AP_PLAN.md §2.2）：下战书 = 'duel'（1 点）、投帖 = 'join'（1 点），都走 L.act；结果卡由结算链（settle.js）出，它引出的戏紧跟着放。
 *   A1 的 'duel' / 'join' 缺省实现认 L.challenge / L.knock；主线保底这边的函数叫 L.challengeRival / L.sectApply，没有前者时这里把它们接上（线 B 的 mainline 换成 L.regAct 后可删）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 panel-rivals 之后：用 rvPortrait / zSwapRow / showRivalCard）。 */
GO_K.mainfoe = () => { const id = L.mainFoes(st)[0]; if (id) showRivalCard(id, () => showWorld('rank')); else showWorld('rank'); };
GO_NAV.mainfoe = 'world';
// 晋升：宗门页总是落在“身份”分页（上回停在任务板也一样），【晋升】按钮 #btnPromo 才在眼前
GO_K.sectid = () => { sectTab = 'id'; showWorld('sect'); };
GO_NAV.sectid = 'world';
const chalCd = () => seasons(L.mainEase(st) >= 1 ? L.MAIN_V.cdEase : L.MAIN_V.cd);   // 输了几季后可以再来
if (L.ACTS && L.ACTS.duel && !L.challenge && L.challengeRival) L.regAct('duel', { why: (s, x) => { const I = L.challengeInfo(s, L.actArg(x, 0, 'id')); return !I ? '没有这个人' : I.why || ''; }, run: (s, x) => L.challengeRival(s, L.actArg(x, 0, 'id')) });
if (L.ACTS && L.ACTS.join && !L.knock && L.sectApply) L.regAct('join', { why: (s, x) => L.sectApplyWhy(s, L.actArg(x, 0, 'id')), run: (s, x) => (L.sectApply(s, L.actArg(x, 0, 'id')) && s.sect ? { id: s.sect.id, sect: s.sect } : null) });
// 准备页：VS、胜算、换战技；o = { visit 上门的那一回, intro, back }
function chalPrep(id, o) {
  o = o || {};
  const later = () => { if (o.visit) { L.mainFoeLater(st, id); L.log(st, `${L.rivalName(st, id)}的战书先收下了，${chalCd()} 季后再说`); closeModal(); } else if (o.back) o.back(); else closeModal(); };
  const render = () => {
    const I = L.challengeInfo(st, id); if (!I) { closeModal(); return; }
    const k = L.rivalKnow(st, id), g = L.grudge(st, id), e = L.mainEase(st), z = L.artSlots(st)[1];
    const b = I.why ? null : L.duelArtBest(st, I.foe, I.Q);
    const body = `${o.intro ? `<p class="center">${o.intro}</p>` : ''}
      <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(st.p.name)}</div><div class="num">${fmt(I.S)}</div><div class="muted">${z ? `《${esc(L.art(z).n)}》${L.elName(L.art(z).el)}` : '没装战技'}</div></div>
        <div class="vsx">VS</div>
        <div class="side">${rvPortrait(id, 56, g >= L.GRUDGE.hi ? 'ang' : 'n')}<div>${esc(I.n)}</div><div class="num seal">${fmt(I.Q)}</div><div class="muted">第 ${I.q} 名 ${elChip(L.RIVAL_EL[id], !k.el)}</div></div></div>
      <div class="center big ${I.p < 0.45 ? 'seal' : I.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(I.p)}</div>
      ${e && I.main ? `<p class="center goldt">他这些年不如从前：战力封顶为你的 ×${L.MAIN_V.cap[e]}</p>` : ''}
      ${I.why ? `<p class="center seal">${esc(I.why)}</p>` : zSwapRow(b, k, 'chalSwap') || ''}
      <p class="muted center">不看境界、不看名次。输了不掉东西，${chalCd()} 季后可以再来；赢了他的名次归你。</p>`;
    const ab = apBtn('duel', { id }), why = I.why || (o.visit ? '' : ab.why);
    const s = sheet({ title: o.visit ? `${esc(I.n)}上门` : `下战书 · ${esc(I.n)}`, center: true, noClose: !!o.visit, body,
      foot: [{ t: o.visit ? '改日' : '返回', alt: true, fn: later }, { t: o.visit ? '应战' : '下战书' + ab.tag, gold: true, disabled: !!why, fn: () => chalRun(id, o.visit) }] });
    if (!I.why && why) s.querySelector('.body').insertAdjacentHTML('beforeend', `<p class="center seal">${esc(why)}</p>`);
    const gb = s.querySelector('[data-fi="1"]'); if (gb && !o.visit) gb.dataset.ap = ab.n;
    const fb = s.querySelector('[data-fi="1"]'); if (fb) fb.id = 'btnChalGo';
    s.querySelectorAll('[data-zswap]').forEach(bt => bt.onclick = () => { if (L.equipArt(st, bt.dataset.zswap)) { SFX.coin(); render(); } });
  };
  render();
}
// 下战书花 1 点（L.act 'duel'）；他自己上门那一回（visit）是找上门的事，不花点
function chalRun(id, visit) {
  closeModal();
  if (visit) { const res = L.challengeRival(st, id); if (res) { seasonLog.push('应战'); pushPopup(() => chalShow(res)); } return; }
  doAct('duel', { id });   // 结果卡 → 结算链（settle.js 的 showActResult 调 chalShow）
}
function chalShow(res) {
  const id = res.id || res.rid;
  const img = rvPortrait(id, 66, 'ang', true);
  duel({ title: '下战书 · ' + res.n, right: { img, name: res.n, sub: `第 ${res.q} 名 · ${fmt(res.Q)}` }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    stage: 'cloud', foe: ftRival(id), face: true, quote: `${res.n}：“既然你送上门来——”`,
    winText: `${esc(res.n)}收了剑，半晌没有说话。<div class="fxlist"><span>击败${esc(res.n)}</span>${res.rank1 < res.rank0 ? `<span>天骄榜 → 第 ${res.rank1}</span>` : ''}<span>灵石 +${fmt(res.stones || 0)}</span></div>`,
    loseText: `你输了半招。${esc(res.n)}冷笑一声走了。<div class="fxlist"><span>${chalCd()} 季后可以再下战书</span></div>`, done: closeModal });
}
// 只剩他没打时，他自己找上门（out.mainFoe）
function runMainFoe(id) {
  const I = L.challengeInfo(st, id); if (!I || I.why) return;
  const say = { mu: '三年之约你输了，我可没忘。再比一场？', zhao: '听说你在找我？省得你跑，我来了。', chu: '师父的剑，你配不配用，今天见分晓。', xue: '正道魔道都在等。我等不及了。' }[id] || '来。';
  chalPrep(id, { visit: true, intro: `${esc(I.n)}找上门来，把战书钉在你门上：“${esc(say)}”` });
}
// 老祖：卡住时的一句下一步
function showMainHint(h) {
  if (!h || !h.t) return;
  sheet({ title: '戒中老祖', center: true, body: `<div class="speaker">${elderImg(56, 'n')}<p class="grow" style="margin:0">${esc(h.t)}</p></div>`,
    foot: [{ t: '知道了', alt: true, fn: closeModal }, { t: '去看看', gold: true, fn: () => { closeModal(); setTimeout(() => goTo(h.go), 40); } }] });
}
// 老祖：这一章降了要求
function showMainEase(x) {
  if (!x || !x.lines || !x.lines.length) return;
  sheet({ title: '戒中老祖', center: true, body: `<div class="speaker">${elderImg(56, 'joy')}<div class="grow">${x.lines.map(t => `<p style="margin:0 0 4px">${esc(t)}</p>`).join('')}</div></div>${x.next && x.next.t ? `<div class="quote">下一步：${esc(x.next.t)}</div>` : ''}`,
    foot: [{ t: '知道了', alt: true, fn: closeModal }, { t: '去看看', gold: true, fn: () => { closeModal(); setTimeout(() => goTo((x.next && x.next.go) || 'path'), 40); } }] });
}
// 宗门页：还没宗门（投帖；无宗试炼写明散修之路）
function sectJoinHTML() {
  const ch = L.chapterNow(st), lone = L.loneRoute(st), goal = L.chapterGoal(st, ch);
  if (L.sectBanned(st)) return `${emptyNoteHTML('vault', '天道试炼·无宗：这一世拜不进任何宗门。')}<div class="pn-line">走散修之路：${esc(goal)}。</div>
    <div class="quote">戒中老祖：“本座当年也没有山门。野路子，要走成大路。”</div>`;
  const nx = L.inviteNext(st);
  const rows = L.sectsFor(st).map(sc => { const why = L.sectApplyWhy(st, sc.id);
    return `<div class="pn-row" style="display:flex;align-items:center;gap:8px;margin:6px 0">${emblemImg(sc.id, 1.5)}<div class="grow"><b style="color:${sc.color}">${esc(sc.n)}</b><div class="muted">${esc(sc.fit)} · ${esc(sc.perk)}</div></div>
      <button class="btn sm gold" data-join="${sc.id}" data-ap="${L.apCost(st, 'join', { id: sc.id })}" ${why || L.apWhy(st, 'join', { id: sc.id }) ? 'disabled' : ''}>投帖${apTag(L.apCost(st, 'join', { id: sc.id }))}${!why && L.apWhy(st, 'join', { id: sc.id }) ? `<small>${esc(L.apWhy(st, 'join', { id: sc.id }))}</small>` : ''}</button></div>`; }).join('');
  // 入了宗，这一章的主线换成入宗那条（已经做完的章不退）
  let alt = ''; if (lone) { try { alt = L.questText(Object.assign({}, st, { sect: { id: 'jian', rank: 0, total: 0, pts: 0, tasks: [] } }), L.CHAPTERS[ch].main); } catch (e) { alt = ''; } }
  return `<div class="pn-line">${lone ? `散修一个，走的是散修之路（这一章：${esc(L.questText(st, L.CHAPTERS[ch].main))}）。想入宗随时可以${alt ? `，入了宗这一章改成：${esc(alt)}` : ''}：` : '还没有宗门。挑一家投帖，入了宗就做任务、攒贡献、晋升：'}</div>
    ${rows}
    ${!st.pact ? '<div class="pn-line muted">三年之约之后才收人。</div>' : nx > 0 ? `<div class="pn-line muted">不投帖也行：约 ${seasons(nx)} 季后宗门还会再来请。</div>` : ''}
    <div class="quote">戒中老祖：“${lone ? '散修也走得通。只是有山门，有人撑腰。' : '挑一家。跟天剑宗穿一条裤子的，不行。'}”</div>`;
}
function bindSectJoin(s) {
  s.querySelectorAll('[data-join]').forEach(b => b.onclick = () => {
    const id = b.dataset.join;
    if (!doAct('join', { id })) return;   // 拜山门 1 点：入宗结算 → 入宗第一天的戏（结算链）
    sectTab = 'id';
  });
}
// 排着的剧情不会再“等空档”：结算链当场连着出完（settle.js），所以原来“打开历练页先放排着的那一场”的补丁删了
