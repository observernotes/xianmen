/* 废柴仙途 · 界面片段 panel-rivals：宿敌与新秀（SYSTEMS §13）——天骄榜分页里的宿敌一览与宿敌卡、论道前的对决准备、新秀挑战、老祖的三次讲解
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide 后：往 HINTS 里加讲解）。规则与数据在 src/logic/rivals.js、rivals2.js。
 * 美术：宿敌半身像 ART.portrait（mu zhao tian xue yun，楚天阔是 tian；慕容的 alt 跟主角性别），新秀 ART.portraitGen(seed, { kind: 'rookie' })，图标 ART.icon('grudge' | 'spar' | 'crush')。 */
const RV_PT = { mu: 'mu', zhao: 'zhao', chu: 'tian', xue: 'xue', yun: 'yun' };
// 宿敌半身像（48×48，按整数设备像素放大）；vs 为真时带 id="vsR"（对决的出场动画找它）
function rvPortrait(id, z, mood, vs) {
  const alt = id === 'mu' && !!st.p.look.f, m = mood || 'n';
  const cv = ART.portrait(RV_PT[id] || id, m, alt);
  if (!cv) return rivalAvImg({ n: L.rivalName(st, id), id }, z || 44);
  const w = z || pxs(48, 0.75);
  return `<img class="px"${vs ? ' id="vsR"' : ''} src="${urlOf(cv, ['rvpt', id, m, alt ? 1 : 0].join('|'))}" style="width:${w}px;height:${w}px;flex:none;vertical-align:middle" alt="">`;
}
function rkPortrait(rk, z, mood, vs) {
  const m = mood || 'n', cv = ART.portraitGen(rk.seed, { kind: 'rookie', f: rk.fem, realm: Math.min(8, st.p.r) }, m), w = z || pxs(48, 0.75);
  return `<img class="px"${vs ? ' id="vsR"' : ''} src="${urlOf(cv, ['rkpt', rk.seed, rk.fem, Math.min(8, st.p.r), m].join('|'))}" style="width:${w}px;height:${w}px;flex:none;vertical-align:middle" alt="">`;
}
// 恩怨条：−100～100，中线是 0；刻线在 60（伏击、抬价、带头）与 −40（化敌为友）
function grudgeBar(g) {
  const a = 50 + Math.min(0, g) / 2, w = Math.abs(g) / 2, cls = g >= L.GRUDGE.hi ? 'hi' : g <= L.GRUDGE.lo ? 'lo' : g > 0 ? 'pos' : 'neg';
  return `<div class="gbar" title="恩怨 ${g}"><i class="${cls}" style="left:${a}%;width:${w}%"></i><b class="m60"></b><b class="m40"></b><b class="m0"></b></div>`;
}
const grudgeTag = g => (g >= L.GRUDGE.hi ? '<span class="chip bad">结仇</span>' : g <= L.GRUDGE.lo ? '<span class="chip ok">化敌为友</span>' : '');
const grudgeWhat = (id, g) => (g >= L.GRUDGE.hi ? '他会在历练途中伏击你、拍卖会上抬价（你出价 ×1.2、拿下概率 −10%）、宗门战事里带头。'
  : g <= L.GRUDGE.lo ? { mu: '旧怨渐消：退婚的真相，或许能听到了。', zhao: '他欠你的：天剑宗来犯前，会有一封没署名的信。', chu: '他愿意和你同行一程（斩妖分数 +6）。', xue: '魔道圣子也念人情。', yun: '他第一次睁眼看你。' }[id]
  : `到 ${L.GRUDGE.hi} 他会伏击、抬价、带头；降到 ${L.GRUDGE.lo} 以下化敌为友。`);
// 克他的那一系（他的法宝克的那一系要躲开）
function rvCounterText(id) {
  const fe = L.RIVAL_EL[id], ce = L.elCounter(fe), g = L.RIVAL_INFO[id].gear;
  return `${L.elName(ce)}克${L.elName(fe)}：用${L.elName(ce)}系战技对决战力 ×${L.EL_DUEL[0]}；别用${L.elName(L.ELEM_KEYS.find(x => L.elKe(fe, x)))}系（被克 ×${L.EL_DUEL[1]}）${g ? `，也别用${L.ELEM[g.ke]}系（他的法宝克它）` : ''}`;
}
// 天骄榜分页：五位宿敌一行一张（点开看宿敌卡），下面是新秀
function rivalListHTML() {
  const rows = L.RIVALS.map(R0 => {
    const id = R0.id, g = L.grudge(st, id), k = L.rivalKnow(st, id), q = L.rivalRank(st, id);
    // 一行：头像 + 名字（五行）+ 名次 / 已击败 + 恩怨（结仇 / 化敌为友才有角标）；称号、恩怨条进宿敌卡
    return `<button class="rvrow" data-rv="${id}">${rvPortrait(id, pxs(48, 0.75), g >= L.GRUDGE.hi ? 'ang' : g <= L.GRUDGE.lo ? 'joy' : 'n')}<span class="rvmain"><span class="line"><b>${esc(L.rivalName(st, id))}</b>${elChip(L.RIVAL_EL[id], !k.el)}</span>
      <span class="line">${st.beaten[id] ? '<span class="chip ok">已击败</span>' : `<span class="chip">第${q || '?'}名</span>`}${grudgeTag(g) || `<span class="muted">恩怨 ${g}</span>`}</span></span><span class="rvgo">›</span></button>`;
  });
  return `${pnHead('宿敌', '点开看底细')}${rows.join('')}${rookieListHTML()}`;
}
function rookieListHTML() {
  const R2 = st.rv2; if (!R2 || !L.RIVALS2_ON) return '';
  const rk = L.rookie(st), out = [];
  if (rk) {
    const I = L.rookieInfo(st);
    out.push(`<button class="rvrow" data-rk="1">${rkPortrait(rk, pxs(48, 0.75), 'ang')}<span class="rvmain"><span class="line"><b>${esc(rk.n)}</b>${elChip(rk.el, !rk.known)}<span class="chip warn">新秀</span></span>
      <span class="line muted">${esc(rk.s)} · 第 ${I.q} 名 · 战力 ${fmt(I.Q)}</span><span class="line muted">${I.gap <= 1 ? '追到你身后了' : `离你还差 ${I.gap} 名，每届追 ${L.ROOKIE.climb} 名`}</span></span><span class="rvgo">›</span></button>`);
  } else if (st.p.r >= L.ROOKIE.minR) out.push(`<div class="muted">新秀：化神起每 ${L.ROOKIE.every} 月榜上冒出一位${R2.rkNext !== null && R2.rkNext > st.tick ? `（下一位约 ${R2.rkNext - st.tick} 月后）` : ''}</div>`);
  for (const x of R2.pool) out.push(`<div class="rvline">${icon16('crush', 1)}<span class="grow">${esc(x.n)} <span class="muted">${esc(x.s)} · 被你打压过</span></span><span class="muted">恩怨 ${x.g}</span>${grudgeTag(x.g)}</div>`);
  for (const x of R2.friends) out.push(`<div class="rvline">${icon16('spar', 1)}<span class="grow">${esc(x.n)} <span class="muted">${esc(x.s)} · 你指点过</span></span><span class="jadet">${x.gifts ? `送过 ${x.gifts} 回礼` : '友善'}</span></div>`);
  return out.length ? `${pnHead('新秀')}${out.join('')}` : '';
}
function bindRivalList(s) {
  s.querySelectorAll('[data-rv]').forEach(b => b.onclick = () => { SFX.tap(); showRivalCard(b.dataset.rv); });
  s.querySelectorAll('[data-rk]').forEach(b => b.onclick = () => { SFX.tap(); showRookieCard(); });
}
// 宿敌卡：已知的才显示，未知的写“？”
function showRivalCard(id, back) {
  const R0 = L.RIVALS.find(r => r.id === id), I = L.RIVAL_INFO[id], A = L.art(I.art), k = L.rivalKnow(st, id), g = L.grudge(st, id), q = L.rivalRank(st, id);
  const x = st.ladder.find(y => y.id === id) || {}, pw = x.pw || 1, Q = q ? L.rivalPower(st, q) : 0, foe = { kind: 'rival', id, q };
  const b = q ? L.duelArtBest(st, foe, Q) : null;
  // 第一屏：头像 + 名次战力、你对他的胜算（大字，能换战技提一句）、四样底细各一行短句；克制细则、恩怨后果、怎么变进“详情”
  const p0 = q ? (b ? b.p0 : L.duelP(st, L.duelPower(st, foe), Q, foe)) : 0;
  const vs = q ? `<div class="pn-hero"><div class="row"><span class="grow">你现在对他</span><b class="big ${p0 >= 0.6 ? 'jadet' : p0 >= 0.4 ? 'goldt' : 'seal'}">胜算 ${L.pct(p0)}</b></div>${b && !b.same && b.p1 - b.p0 >= 0.005 ? `<div class="pn-k">换成战技《${esc(L.art(b.id).n)}》：胜算 ${L.pct(b.p0)} → <b class="pn-up">${L.pct(b.p1)}</b></div>` : ''}</div>` : '';
  const ce = L.elCounter(L.RIVAL_EL[id]);
  const body = `<div class="row">${rvPortrait(id, pxs(48, 1.25), g >= L.GRUDGE.hi ? 'ang' : g <= L.GRUDGE.lo ? 'joy' : 'n')}<div class="grow"><div class="big">${esc(L.rivalName(st, id))}</div><div class="muted">${esc(R0.sect)} · ${esc(R0.title)}</div>
      <div>${st.beaten[id] ? '<span class="chip ok">已击败</span> ' : ''}第 ${q || '?'} 名 · 战力 ${fmt(Q)}</div></div></div>
    ${vs}
    <dl class="grid2">
      <dt>五行</dt><dd>${k.el ? `${elChip(L.RIVAL_EL[id])} 用${L.elName(ce)}系克他` : `${elChip('', true)} <span class="muted">交过手才知道</span>`}</dd>
      <dt>战技</dt><dd>${k.art ? `《${esc(A.n)}》<span class="muted">${L.elName(A.el)}</span>` : '？ <span class="muted">交过手才知道</span>'}</dd>
      <dt>法宝</dt><dd>${k.gear ? `【${esc(I.gear.n)}】克${L.ELEM[I.gear.ke]}` : '？ <span class="muted">打赢一回才看清</span>'}</dd>
      <dt>恩怨</dt><dd><b class="${g >= L.GRUDGE.hi ? 'seal' : g <= L.GRUDGE.lo ? 'jadet' : ''}">${g}</b> ${grudgeTag(g)}${grudgeBar(g)}</dd>
    </dl>
    <details class="more"><summary>克制 · 恩怨细则</summary><div class="muted">${k.el ? rvCounterText(id) + '。' : ''}${k.art ? `看家战技是${L.artTierName(A.t)}战技。` : ''}${k.gear ? `你用${L.ELEM[I.gear.ke]}系战技时，他对决战力 ×${L.RIVAL_GEAR_M}。` : ''}${pw > 1.0001 ? `奇遇与拍卖让他战力 ×${(Math.round(pw * 100) / 100)}（上限 ×${L.RIVAL_PW_CAP}）。` : ''}<br>${grudgeWhat(id, g)}<br>恩怨怎么变：论道上赢他 +${L.GRUDGE.win}、羞辱他 +${L.GRUDGE.insult}、放他一马或帮他 ${L.GRUDGE.spare}（奇遇里的选择）。</div></details>`;
  const s = sheet({ title: '宿敌', body, foot: [{ t: '返回', alt: true, fn: () => (back ? back() : showMe('rank')) }] });
  return s;
}
function showRookieCard() {
  const I = L.rookieInfo(st); if (!I) { showMe('rank'); return; }
  const rk = I.rk, ke = rk.gear.aff && L.AFFIX[rk.gear.aff];
  const body = `<div class="row">${rkPortrait(rk, pxs(48, 1.25), 'ang')}<div class="grow"><div class="big">${esc(rk.n)}</div><div class="muted">${esc(rk.s)} · 新秀</div><div>天骄榜第 ${I.q} · 战力 ${fmt(I.Q)}</div></div></div>
    <div class="quote">${esc(rk.n)}：“${esc(L.fill(st, rk.line))}”</div>
    <dl class="grid2"><dt>五行</dt><dd>${rk.known ? elChip(rk.el) : `${elChip('', true)} <span class="muted">去看他一眼或交过手才知道</span>`}</dd>
      <dt>法宝</dt><dd>【${esc(rk.gear.n)}】${rk.known && ke ? `「${esc(ke.n)}」<span class="muted">${esc(ke.d)}</span>` : '？'}</dd>
      <dt>追你</dt><dd>${I.gap <= 1 ? '追到你身后了，下一次就要和你打一场' : `离你 ${I.gap} 名，每届论道追 ${L.ROOKIE.climb} 名；追到身后强制一战`}</dd></dl>
    <details class="more"><summary>追上时怎么办</summary><div class="muted">追上时二选一：【指点】他成友善路人、之后送礼；【打压】赢了得他法宝上的一条词条，他记你的仇（恩怨 ${L.GRUDGE.hi}）。</div></details>`;
  sheet({ title: '新秀', body, foot: [{ t: '返回', alt: true, fn: () => showMe('rank') }] });
}
// 换战技那一行（准备页、新秀挑战共用）：b = L.duelArtBest 的结果
// know = { el 知道他的五行, gear 知道他的法宝 }：不知道的不点破，只写“换上之后胜算多少”
function zSwapRow(b, know, rowId) {
  if (!b || b.same || b.p1 - b.p0 < 0.005) return '';
  know = know || {};
  const B = L.art(b.id), cur = b.cur ? L.art(b.cur) : null, ke = know.el && b.ke;
  const why = [];
  if (cur && know.el && b.ke0) why.push(`你现在的《${esc(cur.n)}》是${L.elName(b.me0)}系，被他的${L.elName(b.fe)}克：×${L.EL_DUEL[1]}`);
  if (cur && know.gear && b.gear0) why.push(`他的【${esc(b.gear0.n)}】克${L.ELEM[b.gear0.ke]}：×${(1 / L.RIVAL_GEAR_M).toFixed(2)}`);
  if (ke) why.push(`${L.elName(b.me)}克${L.elName(b.fe)}：×${L.EL_DUEL[0]}`);
  return `<div class="grow-row" id="${rowId || 'rvSwap'}"><span class="gn">换成${ke ? '克他的' : ''}战技《${esc(B.n)}》${ke ? `（${L.elName(b.me)}）` : ''}</span><span class="gm">胜算 ${L.pct(b.p0)} → <b>${L.pct(b.p1)}</b></span><span class="ga"><button class="btn sm gold" data-zswap="${b.id}">换上</button></span><span class="tipx">${why.join('；') || '免费，即换即生效'}</span></div>`;
}
// ---------- 论道前：对决准备（本届第一场会碰上宿敌时才弹） ----------
function tourPrep(go) {
  const tf0 = L.tourFoe(st);
  if (!tf0) { go(); return; }
  const render = () => {
    const tf = L.tourFoe(st) || tf0, id = tf.id, k = L.rivalKnow(st, id), I = L.RIVAL_INFO[id], A = L.art(I.art), g = L.grudge(st, id);
    const S = L.duelPower(st, tf.foe), p = L.duelP(st, S, tf.Q, tf.foe), b = L.duelArtBest(st, tf.foe, tf.Q), z = L.artSlots(st)[1];
    const news = tf.rv.aucNote ? `<div class="quote">${esc(tf.rv.n)}在拍卖会上拍得【${esc(tf.rv.aucNote)}】</div>` : '';
    const body = `<p class="center">第 ${st.stats.tour + 1} 届天骄论道，第一场多半碰上宿敌。</p>${news}
      <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(st.p.name)}</div><div class="num">${fmt(S)}</div><div class="muted">${z ? `《${esc(L.art(z).n)}》${L.elName(L.art(z).el)}` : '没装战技'}</div></div>
        <div class="vsx">VS</div>
        <div class="side">${rvPortrait(id, 56, g >= L.GRUDGE.hi ? 'ang' : 'n')}<div>${esc(tf.rv.n)}</div><div class="num seal">${fmt(tf.Q)}</div><div class="muted">第 ${tf.q} 名 ${elChip(L.RIVAL_EL[id], !k.el)}</div></div></div>
      <div class="center big ${p < 0.45 ? 'seal' : p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(p)}</div>
      <dl class="grid2"><dt>看家战技</dt><dd>${k.art ? `《${esc(A.n)}》${L.elName(A.el)}` : '？'}</dd><dt>法宝</dt><dd>${k.gear ? `【${esc(I.gear.n)}】克${L.ELEM[I.gear.ke]}` : '？'}</dd><dt>恩怨</dt><dd>${g} ${grudgeTag(g)}</dd></dl>
      ${zSwapRow(b, k) || `<p class="muted center">${k.el && L.duelElem(st, tf.foe).m > 1 ? '你的战技正克他。' : '手里没有更合适的战技。'}</p>`}`;
    const s = sheet({ title: '论道 · 对决准备', center: true, noClose: true, body, foot: [{ t: '登台', gold: true, fn: go }] });
    s.querySelectorAll('[data-zswap]').forEach(bt => bt.onclick = () => { if (L.equipArt(st, bt.dataset.zswap)) { SFX.coin(); floatText(100, 70, `换上《${L.art(bt.dataset.zswap).n}》`, '#ffe39a'); render(); } });
  };
  render();
}
// ---------- 新秀挑战：追到身后，强制一战 ----------
function runRookie() {
  if (!L.rookie(st) || !L.rookie(st).due) return;
  const render = () => {
    const I = L.rookieInfo(st), rk = I.rk, b = L.duelArtBest(st, I.foe, I.Q), ke = rk.gear.aff && L.AFFIX[rk.gear.aff];
    const body = `<p class="center">那个放话要踩着你上去的新秀，追到了你身后（第 ${I.q} 名）。</p>
      <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(st.p.name)}</div><div class="num">${fmt(I.S)}</div></div><div class="vsx">VS</div>
        <div class="side">${rkPortrait(rk, 56, 'ang')}<div>${esc(rk.n)}</div><div class="num seal">${fmt(I.Q)}</div><div class="muted">${esc(rk.s)} ${elChip(rk.el, !rk.known)}</div></div></div>
      <div class="quote">${esc(rk.n)}：“${esc(L.fill(st, rk.line))}”</div>
      <div class="center">打压的胜算 <b class="${I.p < 0.45 ? 'seal' : I.p < 0.8 ? 'goldt' : 'jadet'}">${L.pct(I.p)}</b></div>
      ${zSwapRow(b, { el: rk.known, gear: rk.known }, 'rkSwap')}
      <div class="grow-row"><span class="gn">${icon16('spar', 1)}【指点】</span><span class="gm"></span><span class="ga"></span><span class="tipx">不打。他成了友善路人，往后逢年过节托人送礼；${L.ROOKIE.trouble} 月后可能报你的名号闯祸。</span></div>
      <div class="grow-row"><span class="gn">${icon16('crush', 1)}【打压】</span><span class="gm">${L.pct(I.p)}</span><span class="ga"></span><span class="tipx">赢了得他法宝【${esc(rk.gear.n)}】上的${rk.known && ke ? `「${esc(ke.n)}」` : '一条词条'}（挪到你的兵器上），他记你的仇（恩怨 ${L.GRUDGE.hi}）；输了他排到你前面一名，负伤 2 月。</span></div>`;
    const s = sheet({ title: '新秀挑战', center: true, noClose: true, body, foot: [{ t: '指点', alt: true, fn: teach }, { t: '打压', gold: true, fn: crush }] });
    s.querySelectorAll('[data-zswap]').forEach(bt => bt.onclick = () => { if (L.equipArt(st, bt.dataset.zswap)) { SFX.coin(); render(); } });
  };
  const teach = () => {
    const rk = L.rookie(st), r = L.rookieResolve(st, 'teach');
    SFX.coin();
    sheet({ title: '指点', center: true, noClose: true, body: `<div class="speaker">${rkPortrait(rk, 56, 'joy')}<p class="grow" style="margin:0">你没拔剑，折了根树枝跟${esc(r.n)}拆了三招，三招都点在他最得意的地方。他站了很久，深深一揖：“受教。”</p></div><div class="fxlist"><span>${esc(r.n)}成了友善路人，往后会托人送礼</span></div>`,
      foot: [{ t: '继续', gold: true, fn: closeModal }] });
  };
  const crush = () => {
    const rk = L.rookie(st), img = rkPortrait(rk, 66, 'ang', true), res = L.rookieDuel(st);
    duel({ title: '打压', right: { img, name: res.n, sub: `${res.s} · ${fmt(res.Q)}` }, Q: res.Q, S: res.S, p: res.p, win: res.win,
      stage: 'cloud', foe: ftRookie(rk), face: true,
      quote: `${res.n}：“${L.fill(st, rk.line)}”`,
      winText: `你当着满场看客把他压了下去。<div class="fxlist"><span>${esc(res.text || '')}</span><span>恩怨 ${L.GRUDGE.hi}：他记下了</span></div>`,
      loseText: `你输了半招。他愣了一下，朝你抱拳。<div class="fxlist"><span>天骄榜 → 第 ${st.rank}</span><span>负伤 2 月</span></div>`, done: closeModal });
  };
  render();
}
// 事件里的对决：对手是宿敌或新秀时用他的半身像（events.js 调）
function duelFoeImg(d, w) {
  if (d && d.foe && d.foe.kind === 'rival' && d.foe.id) return { img: rvPortrait(d.foe.id, w, 'ang', true), name: d.n || L.rivalName(st, d.foe.id) };
  if (d && d.foe && d.foe.kind === 'rookie') { const rk = L.rookie(st) || (st.rv2.pool.find(x => x.id === d.foe.id)) ; if (rk && rk.seed) return { img: rkPortrait(rk, w, 'ang', true), name: d.n }; }
  return null;
}
// ---------- 老祖：第一次看到克制提示、第一次恩怨到 60、第一位新秀出现，各讲一次（说话时暂停，句句带数） ----------
const rvCalm = () => st.guide.done && !modalOpen() && !L.busy(st) && !(st.storyQ || []).length && !!st.rv2;
const rvHints = [
  { id: 'rvKezhi', urgent: true, intro: true, target: '#rvSwap, #rkSwap', btn: '知道了', when: () => st.guide.done && !!document.querySelector('#modal #rvSwap, #modal #rkSwap'), text: () => {
      const el = document.querySelector('#modal #rvSwap, #modal #rkSwap'), id = el.querySelector('[data-zswap]').dataset.zswap, B = L.art(id);
      const tf = el.id === 'rkSwap' ? (() => { const I = L.rookieInfo(st); return I && { foe: I.foe, Q: I.Q, n: I.rk.n, known: I.known, gk: I.known }; })() : (() => { const t = L.tourFoe(st); return t && { foe: t.foe, Q: t.Q, n: t.rv.n, known: L.rivalKnow(st, t.id).el, gk: L.rivalKnow(st, t.id).gear }; })();
      if (!tf) return '换一门战技，胜算能高一截。';
      const b = L.duelArtBest(st, tf.foe, tf.Q), cur = b.cur ? L.art(b.cur) : null;
      const bad = cur && tf.known && b.ke0 ? `你这手${L.elName(b.me0)}系的《${esc(cur.n)}》被他的${L.elName(b.fe)}克，战力 <b>×${L.EL_DUEL[1]}</b>。` : cur && b.gear0 ? `他身上那件${tf.gk ? `【${esc(b.gear0.n)}】` : '法宝'}专克${L.ELEM[b.gear0.ke]}系，你吃亏 <b>×${(1 / L.RIVAL_GEAR_M).toFixed(2)}</b>。` : '';
      return `看清了再上台。${esc(tf.n)}${tf.known ? `练的是${L.elName(b.fe)}系` : ''}，${bad}换成《${esc(B.n)}》${tf.known && b.ke ? `（${L.elName(b.me)}克${L.elName(b.fe)}，×${L.EL_DUEL[0]}）` : ''}：胜算 <b>${L.pct(b.p0)} → ${L.pct(b.p1)}</b>。战技即换即生效，打完再换回来。`;
    } },
  { id: 'rvGrudge', intro: true, target: '[data-nav="me"]', btn: '记住了', when: () => rvCalm() && Object.keys(st.rv2.g60).some(id => L.grudge(st, id) >= L.GRUDGE.hi), text: () => {
      const id = Object.keys(st.rv2.g60).filter(x => L.grudge(st, x) >= L.GRUDGE.hi).sort((a, b) => st.rv2.g60[b] - st.rv2.g60[a])[0], g = L.grudge(st, id), n = esc(L.rivalName(st, id));
      return `${n}恨上你了：恩怨 <b>${g}</b>（过了 ${L.GRUDGE.hi}）。往后他会在历练途中<b>伏击</b>你，拍卖会上他在场时你出价 <b>×${L.RIVAL_BID.m}</b>、拿下概率 <b>−${Math.round(L.RIVAL_BID.cut * 100)}%</b>，宗门战事里他还带头（来敌 ×${(L.rivalLeads(st).find(x => x.id === id) || { m: 1.1 }).m}）。放他一马、帮他一把每次 <b>${L.GRUDGE.spare}</b>，降到 ${L.GRUDGE.lo} 以下能化敌为友。【人物】→ 天骄榜看他的恩怨条。`;
    } },
  { id: 'rvRookie', intro: true, target: '[data-nav="me"]', btn: '好', when: () => rvCalm() && !!L.rookie(st), text: () => {
      const I = L.rookieInfo(st), rk = I.rk, n = Math.max(1, Math.ceil((I.gap - 1) / L.ROOKIE.climb));
      return `榜上冒出个<b>新秀</b>：${esc(rk.n)}（${esc(rk.s)}），第 <b>${I.q}</b> 名，战力 <b>${fmt(I.Q)}</b>，你 <b>${fmt(L.power(st))}</b>。他每届论道往上追 <b>${L.ROOKIE.climb}</b> 名，照这样约 <b>${n}</b> 届追到你身后，到时战力约是你的 <b>${Math.round(rk.f * 100)}%</b>，要和你打一场：【指点】他往后送礼；【打压】赢了把他法宝上的一条词条挪到你兵器上，但他记仇（恩怨 ${L.GRUDGE.hi}）。`;
    } },
];
HINTS.push(...rvHints);
