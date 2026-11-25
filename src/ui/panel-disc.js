/* 废柴仙途 · 界面片段 panel-disc：【宗门】→ 门下（徒弟卡片 ART.portraitGen、差事、传授、出师、收徒候选）；长老与徒弟的事件立绘；
 * 职司、人脉、第一个徒弟的老祖讲解（排在 guide 后：往 HINTS 里加）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。数值全部取自 src/logic/disciples.js 与 sect2.js。 */
let discSel = 0;
// 徒弟头像：同一个 seed 恒定，境界定道袍色，性情定眉眼
function discImg(x, w, mood) {
  const o = { f: x.f, realm: L.discRealm(x), temper: L.TEMPERS[x.tp].n };
  if (x.rookie) o.kind = 'rookie';
  const c = ART.portraitGen ? ART.portraitGen(x.seed, o, mood || 'n') : null;
  if (!c) return myAvImg(w);
  return `<img class="px" src="${urlOf(c, ['dg', x.seed, x.f, o.realm, x.tp, x.rookie ? 1 : 0, mood || 'n'].join('|'))}" style="width:${w}px;height:${w}px;flex:none" alt="">`;
}
const dHearts = x => '<span class="phearts">' + '♥'.repeat(x.heart) + '<i>' + '♥'.repeat(5 - x.heart) + '</i></span>';
const discTTag = t => `<span class="tag" style="background:${['', '#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff'][t]}">${L.DISC_T[t].n}</span>`;
// 到下一小层还要几个周天（成长为 0 或到顶时写原因）
function discEta(x) {
  const g = L.discGrowRate(st, x), cap = L.discMax(st);
  if (x.rest > st.tick) return `休养中，还要 ${x.rest - st.tick} 周天`;
  if (x.di >= cap) return `到顶了：徒弟最多到你的小层 − 4（${L.discStage({ di: cap })}）`;
  if (!g) return '';
  const left = Math.min(Math.floor(x.di) + 1, cap) - x.di;
  return `成长 ${g.toFixed(3)} 小层/周天，约 ${Math.ceil(left / g)} 周天到下一层`;
}
function discJobLine(x, k) {
  const v = L.discJobVal(st, x, k);
  if (k === 'exp') return `灵石 +${fmt(v.stones)}、灵草 +${v.herbs} / ${L.DISC_V.expEvery} 周天`;
  if (k === 'home') return `被动灵石与灵草 +${L.pct(v.inc)}`;
  if (k === 'duty') return `贡献 +${L.fmt1(v.contrib)} / 周天`;
  if (k === 'cult') return `成长 ×${v.grow}（${(L.discGrowRate(st, Object.assign({}, x, { job: '' })) * v.grow).toFixed(3)} 小层/周天）`;
  return '';
}
function discTabHTML() {
  const D = L.discState(st), cap = L.discCap(st), nr = L.discNextCapRank(st);
  if (!L.discOpen(st)) return `<div class="quote">真传弟子起可收徒：真传 1 人、长老 2 人、宗主 3 人。还差 ${Math.max(0, 2 - st.sect.rank)} 级身份。</div><p class="muted">徒弟有自己的境界，替你历练、看家、当值；你圆满的功法可以传给他。到金丹出师，宗门记一大功，还多一个“桃李”。</p>`;
  if (discSel >= D.list.length) discSel = Math.max(0, D.list.length - 1);
  const cards = D.list.map((x, i) => `<button class="dcard${i === discSel ? ' sel' : ''}${L.discCanGrad(x) ? ' glow' : ''}" data-di="${i}">${discImg(x, pxs(48, 1))}<span class="nm">${esc(x.n)}</span><span>${L.discStage(x)}</span>${dHearts(x)}<span class="prole">${x.job ? icon16(L.DISC_JOB[x.job].icon, 1) + L.DISC_JOB[x.job].n : x.rest > st.tick ? '休养' : '闲着'}</span></button>`).join('')
    + Array.from({ length: Math.max(0, cap - D.list.length) }, () => '<div class="dcard empty"><span class="aempty">空</span><span class="muted">宗门每 24 周天送候选</span></div>').join('')
    + (nr > 0 ? `<div class="dcard empty lock"><span class="aempty">锁</span><span class="muted">${L.srankName(st, nr)}再收一人</span></div>` : '');
  let det = '';
  const x = D.list[discSel];
  if (x) {
    const T0 = L.TEMPERS[x.tp], tl = L.discTeachList(st, x), tw = L.discTeachWhy(st, x);
    const jobs = Object.keys(L.DISC_JOB).map(k => `<button class="btn sm ${x.job === k ? 'gold' : 'alt'} djob" data-dj="${k}" ${x.job === k ? 'disabled' : ''}>${icon16(L.DISC_JOB[k].icon, 1)} ${L.DISC_JOB[k].n}<small>${esc(discJobLine(x, k))}</small></button>`).join('');
    det = `<div class="pdet ddet"><div class="row">${discImg(x, pxs(48, 1.5), L.discCanGrad(x) ? 'joy' : 'n')}<div class="grow"><div><b>${esc(x.n)}</b> ${discTTag(x.t)} <span class="chip">${T0.n}</span>${x.rookie ? ' <span class="chip warn">新秀</span>' : ''}</div>
      <div>${L.discStage(x)} · 战力 <b class="num">${fmt(L.discPow(st, x))}</b></div><div class="muted">${esc(discEta(x))}</div>
      <div class="muted">${esc(T0.d)}${x.taught.length ? ` · 学过 ${x.taught.map(id => '《' + esc(L.art(id).n) + '》').join('')}` : ''}${x.lp ? ` · 听过讲法 ${x.lp} 回` : ''}</div></div></div>
      <div class="muted">差事（一人一事）</div><div class="pbtns djobs">${jobs}</div>
      <div class="gbtns"><button class="btn sm ${tw ? 'alt' : 'gold'}" id="discTeach" ${tw ? 'disabled' : ''}>传授<small>${tw ? esc(tw) : `${tl.length} 门圆满功法可教 · ${L.TEACH_LEN} 周天`}</small></button>
      <button class="btn sm ${L.discCanGrad(x) ? 'gold' : 'alt'}" id="discGrad" ${L.discCanGrad(x) ? '' : 'disabled'}>出师<small>${L.discCanGrad(x) ? `贡献 +${fmt(L.discGradContrib(st, x))}，桃李 +1` : `到金丹（现${L.discStage(x)}）`}</small></button></div></div>`;
  }
  const cands = D.cand && !L.discFull(st) ? `<div class="sep"></div><div class="mhead"><span>拜师的孩子</span><span class="muted">${Math.max(0, L.DISC_V.every - (st.tick - D.candAt))} 周天后换一批</span></div>
    <div class="cands dcands">${D.cand.map((c, i) => `<div class="cand dcand">${discImg({ seed: c.seed, f: c.f, di: 0, tp: c.tp, rookie: c.rookie }, pxs(48, 1))}<div class="nm">${esc(c.n)}</div><div>${discTTag(c.t)}</div><div class="tr">${L.DISC_CAT_N[c.cat]} · ${L.TEMPERS[c.tp].n}</div><div class="tr">${esc(L.TEMPERS[c.tp].d)}</div><button class="btn sm gold" data-dtake="${i}">收徒</button></div>`).join('')}</div>
    <button class="btn sm alt" id="discPass" style="width:100%;min-height:44px">都不收</button>` : '';
  return `<div class="mhead"><span>门下 ${D.list.length}/${cap}</span><span class="muted">桃李 ${D.taoli}${L.trioOn(st) ? ' · 会武三人战' : st.sect.rank >= 6 ? ' · 收满两人会武改三人战' : ''}</span></div>
    ${D.list.length || cap ? `<div class="dcards">${cards}</div>` : ''}${det}${cands}
    <div class="muted">成长：每周天 ${L.DISC_V.grow} × 灵根 × (1 + 0.1 × 传授数)${L.daoDiscMult(st) > 1 ? ` × 道心·仁 ${L.daoDiscMult(st)}` : ''}，最多到你的小层 − 4。传授一门圆满功法：他战力 ×(1 + 0.2 × 传授数)，你的那门直接到化境。</div>`;
}
function bindDiscTab(s) {
  s.querySelectorAll('[data-di]').forEach(b => b.onclick = () => { discSel = +b.dataset.di; SFX.tap(); showSect('disc'); });
  s.querySelectorAll('[data-dj]').forEach(b => b.onclick = () => { const x = L.discList(st)[discSel]; if (x && L.discSetJob(st, x.u, b.dataset.dj)) { SFX.tap(); showSect('disc'); } });
  s.querySelectorAll('[data-dtake]').forEach(b => b.onclick = () => { const x = L.discTake(st, +b.dataset.dtake); if (!x) return; SFX.win(); discSel = L.discList(st).indexOf(x); banner('收徒', `${x.n} · ${L.DISC_T[x.t].n} · ${L.TEMPERS[x.tp].n}`); closeModal(); });
  const pa = s.querySelector('#discPass'); if (pa) pa.onclick = () => { L.discPass(st); SFX.tap(); showSect('disc'); };
  const te = s.querySelector('#discTeach'); if (te) te.onclick = () => { SFX.tap(); showDiscTeach(); };
  const gr = s.querySelector('#discGrad'); if (gr) gr.onclick = () => {
    const x = L.discList(st)[discSel]; if (!x) return;
    const r = L.discAskGrad(st, x.u); if (!r) return; SFX.win();
    if (r.ev) showChoice(r.ev, () => showSect('disc'));
    else { banner('出师', `${x.n} · 贡献 +${fmt(r.grad.contrib)}`); showSect('disc'); }
  };
}
// 传授：列出你圆满（或化境）、还没教过他的功法；每行写他的战力前后、你这门到化境
function showDiscTeach() {
  const x = L.discList(st)[discSel]; if (!x) return;
  const pw0 = L.discPow(st, x), pw1 = L.discPow(st, Object.assign({}, x, { taught: x.taught.concat(['?']) }));
  const rows = L.discTeachList(st, x).map(id => { const A = L.art(id), lv = L.artLv(st, id); return `<button class="pjob dteach" data-dt="${id}">${artImg(id, 2)}<span class="grow"><b>《${esc(A.n)}》 <span class="muted">${L.MAST.n[lv]}</span></b><span>${esc(x.n)}战力 ${fmt(pw0)} → <b>${fmt(pw1)}</b>${lv < 4 ? '；教学相长：你的这门到<b>化境</b>' : ''}</span></span></button>`; }).join('');
  const s = sheet({ title: '传授', body: `<div class="row">${discImg(x, pxs(48, 1))}<p class="grow" style="margin:0">把一门你练到圆满的功法传给<b>${esc(x.n)}</b>：花 ${L.TEACH_LEN} 个周天（不修炼、不能出门），每门只教一次。</p></div><div class="pjobs">${rows || '<p class="muted">你还没有能教他的圆满功法。</p>'}</div>`,
    foot: [{ t: '回门下', alt: true, fn: () => showSect('disc') }] });
  s.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => { if (!L.discTeach(st, x.u, b.dataset.dt)) return; SFX.gather(); banner('传授', `《${L.art(b.dataset.dt).n}》· ${L.TEACH_LEN} 周天`); closeModal(); });
}

// ---------- 事件立绘：长老私事 / 冲突（favorMin）、圣子与宗主之争、徒弟事件 ----------
function sectEvElder(ev) {
  if (!st.sect) return null;
  if (ev.favorMin) return L.elder(ev.favorMin[0]);
  if (ev.id === 'sect_succession' || ev.id === 'sect_lord_vote' || ev.id === 'sect_lecture') return L.eldersOf(st)[0] || null;
  return null;
}
function sectSpeakerImg(ev, w) {
  if (!st || !ev) return '';
  const x = L.discOfEvent(st, ev);
  if (x) return discImg(x, w);
  const e = sectEvElder(ev);
  return e && e.sect === (st.sect && st.sect.id) ? ptImg(e.img, w) : '';
}
function sectSpeakerWho(ev) {
  if (!st || !ev) return '';
  const x = L.discOfEvent(st, ev);
  if (x) return `<div class="seal">徒弟·${esc(x.n)} <span class="muted">${L.TEMPERS[x.tp].n} · ${L.discStage(x)}</span></div>`;
  const e = sectEvElder(ev);
  return e && e.sect === (st.sect && st.sect.id) ? `<div class="seal">${esc(e.n)} <span class="muted">${esc(e.t)} · ${esc(e.ph)} · 支持 ${L.favor(st, e.id)}</span></div>` : '';
}

// ---------- 老祖讲解（SYSTEMS §17）：职司、人脉、第一个徒弟——一次阻塞讲解，数字当场从逻辑层算 ----------
const sectCalm = () => st.guide && st.guide.done && !modalOpen() && !L.busy(st) && !!st.sect && !(st.storyQ || []).length;
// 换个职司前后各算一次（讲解里的“a → b”）
function dutyTry(k, fn) { const sc = st.sect, d0 = sc.duty; const a = (sc.duty = '', fn()); sc.duty = k; const b = fn(); sc.duty = d0; return [a, b]; }
function dutyNum(k) {
  if (k === 'dan') { const [a, b] = dutyTry(k, () => L.alchRate(st)); return `成丹率 <b>${L.pct(a)} → ${L.pct(b)}</b>，破境丹卖价 ×${L.DUTY_V.pillSell}`; }
  if (k === 'qi') { const w = st.gear.w; if (!w) return `强化成功率 +${L.pct(L.DUTY_V.plus)}`; const [a, b] = dutyTry(k, () => L.gearPlusRate(st, w)); return `兵器强化 +${w.plus + 1} 成功率 <b>${L.pct(a)} → ${L.pct(b)}</b>，熔炼灵矿 ×${L.DUTY_V.smelt}`; }
  if (k === 'zhan') return `斩妖历练分数 <b>+${L.DUTY_V.slay}</b>，论道每赢一场灵石与贡献再 <b>+${L.pct(L.DUTY_V.tour)}</b>`;
  if (k === 'fa') return `盗贼、踢馆这类不速之客 <b>${L.pct(L.DUTY_V.faBad)}</b> 拦在山门外，打赢上门挑战的同门另得贡献 <b>${fmt(L.contribFor(L.homeRegion(st)))}</b>`;
  const [a, b] = dutyTry(k, () => L.price(st, 'pill') * L.buyMult(st, 0)); return `破境丹 <b>${fmt(a)} → ${fmt(b)}</b> 灵石，拍卖拿下把握 <b>+${L.pct(L.DUTY_V.waiBid)}</b>`;
}
const sectHints = [
  { id: 'duty1', intro: true, when: () => sectCalm() && L.dutyOpen(st), target: '[data-nav="sect"]', btn: '好', text: () => {
      const k = L.duty(st), D = k && L.DUTIES[k];
      return D ? `真传了，还领了<b>职司·${D.n}</b>：${dutyNum(k)}。五堂各管一摊，每届九宗会武（${L.nextMeet(st)} 周天后）之后能改，【宗门】→ 身份。`
        : `真传了，能在五堂领<b>职司</b>：丹堂成丹率 +${L.pct(L.DUTY_V.alch)}、器堂强化 +${L.pct(L.DUTY_V.plus)}、战堂斩妖 +${L.DUTY_V.slay}……【宗门】→ 身份里选一个。`;
    } },
  { id: 'renmai1', intro: true, when: () => sectCalm() && st.sect.rank >= 1, target: '[data-nav="sect"]', btn: '好', text: () => {
      const es = L.eldersOf(st), t = (st.sect.tasks || []).find(x => !x.done && L.taskElder(st, x)), te = t && L.elder(L.taskElder(st, t));
      return `宗里说话算数的是三位长老：${es.map(e => `${esc(e.n)} <b>${L.favor(st, e.id)}</b>`).join('、')}。圣子之争要<b>两位 ≥ ${L.FAV.promo}</b>。做他管的任务 +${L.FAV.task}${te ? `（眼下“${esc(L.TASK_N[t.ty])}”归${esc(te.n)}管）` : ''}，送礼 +${L.FAV.gift}；≥ ${L.FAV.small} 还有小恩惠。【宗门】→ 身份。`;
    } },
  { id: 'disc1', intro: true, when: () => sectCalm() && L.discOpen(st) && !!(st.disc && st.disc.cand) && !L.discList(st).length, target: '[data-nav="sect"]', btn: '好', text: () => {
      const c = st.disc.cand.slice().sort((a, b) => b.t - a.t)[0], g = L.DISC_V.grow * L.DISC_T[c.t].m;
      return `宗门送来三个拜师的孩子，【宗门】→ <b>门下</b>。${esc(c.n)}是${L.DISC_T[c.t].n}：每周天成长 <b>${g.toFixed(3)}</b> 小层，闭门苦修 ×${L.DISC_V.cult}；到金丹出师给贡献约 <b>${fmt(L.contribFor(L.homeRegion(st)) * L.DISC_V.gradC)}</b>，派去当值每周天 +${L.fmt1(L.contribFor(L.homeRegion(st)) * L.DISC_V.duty)}。`;
    } },
];
HINTS.push(...sectHints);
