/* 废柴仙途 · 界面片段 life：飞升、坐化、轮回（结算 → 传承 → 轮回殿 → 出身 → 命格 → 天道试炼 → 投胎 → 出身开场）；出身的约战变体
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 逻辑在 src/logic/samsara.js（L.daoFruit / settle / HALL / ORIGINS / TRIALS / legacyCands / rebirthState）。 */
// ---------- 飞升 / 坐化 ----------
// 这一世的记录：飞升那一刻先记一笔，真正转世时用结算后的（带道果、结局）换掉
function recordLife() {
  const sum = L.lifeSummary(st);
  if (typeof st.flags.lifeIdx === 'number' && st.lives[st.flags.lifeIdx]) st.lives[st.flags.lifeIdx] = sum;
  else { st.flags.lifeIdx = st.lives.length; st.lives.push(sum); }
}
const endName = id => (L.ENDING[id] ? L.ENDING[id].n : '');
function bdImg(kind, w) { const c = ART.backdrop ? ART.backdrop(kind) : null; return c ? `<img class="px" src="${urlOf(c, 'bd|' + kind)}" style="width:${w}px;height:${Math.round(w * c.height / c.width)}px;display:block;margin:0 auto" alt="">` : ''; }
function showAscension() {
  const p = st.p;
  recordLife();
  saveLocal();
  const ends = L.endingsOf(st), f = L.daoFruit(st), fox = st.eflags.bai_nine ? '白小九拖着九条尾巴，跟在你身后一起上了天。' : st.eflags.bai_stay ? '山下那间小院里，一只白狐趴在门槛上，替你看着人间。' : '';
  sheet({ title: '飞升', center: true, noClose: true,
    body: `${bdImg(ends.includes('summit') || ends.includes('mozun') ? 'summit' : ends.includes('hermit') ? 'hermit' : 'ascend', 200)}<div class="center">${myAvImg(66, 9)}</div>
      <div class="center big goldt">${esc(p.name)} 白日飞升</div>
      <p class="center">九九天劫散尽，仙门大开。当年被逐出山门、被当众退婚的废柴，踏云而去，位列仙班。</p>
      <p class="center" id="daoEnding">${esc(L.daoEnding(st))}</p>${fox ? `<p class="center">${esc(fox)}</p>` : ''}
      <dl class="grid2"><dt>结局</dt><dd>${ends.map(endName).join(' · ')}</dd><dt>修仙</dt><dd>${Math.floor(st.year) + 1} 年 · ${fmt(p.age)} 岁</dd><dt>天骄榜</dt><dd>最高第 ${st.bestRank}</dd><dt>宗门</dt><dd>${st.sect ? L.sectOf(st).n + L.srankName(st, st.sect.rank) : '散修'}</dd>
        <dt>道基</dt><dd>+${Math.round(L.daoji(st) * 100)}%${st.trib && st.trib.dan ? ' · ' + esc(st.trib.dan) : ''}</dd>${L.karmaOpen(st).length ? `<dt>因果</dt><dd>未了 ${L.karmaOpen(st).length} 条</dd>` : ''}
        <dt>道果</dt><dd class="goldt">约 ${fmt(f.total)}（其中图鉴 +${fmt(f.codex)}）</dd></dl>
      <div class="quote">恭喜通关！再入轮回：结算道果、在轮回殿换永久加成，选出身、命格与天道试炼，开始新的一世。也可以留在此世，之后在【人物】里再入轮回。</div>`,
    foot: [{ t: '留在此世', alt: true, fn: closeModal }, { t: '再入轮回', gold: true, fn: () => rebirthFlow('ascend') }] });
}
function showDeath() {
  const p = st.p;
  recordLife();
  saveLocal();
  const f = L.daoFruit(st), lim = L.trialOn(st, 'limit') && st.tick >= L.TRIAL_LIMIT;
  sheet({ title: '坐化', center: true, noClose: true,
    body: `${bdImg('rest', 200)}<div class="center">${myAvImg(66, undefined, 'filter:grayscale(1)')}</div>
      <p class="center">${lim ? `天道试炼·限时：第 ${L.TRIAL_LIMIT} 个月到了。` : '寿元耗尽。'}${esc(p.name)}于洞府中静静坐化，享年 ${Math.floor(p.age)} 岁，止步${L.stageName(p)}。</p>
      <p class="center goldt">这一世可带走道果约 ${fmt(f.total)}</p>
      <div class="quote">戒中老祖：“别灰心。老夫护住你一缕真灵，带着这一世的感悟，再来一次！”</div>`,
    foot: [{ t: '转世重修', gold: true, fn: () => rebirthFlow('rest') }] });
}
// 人物页：飞升后“再入轮回”，金丹以后“兵解转世”（二次确认）
function lifeRebirthHTML() {
  const dg = L.daoguo(st), rb = st.p.r >= 9 ? '<button class="btn gold" id="btnReborn">再入轮回 ▸</button>' : st.p.r >= 2 ? '<button class="btn sm alt" id="btnBingjie">兵解转世</button>' : '';
  if (!rb && !dg && !st.rebirth) return '';
  return `<div class="sep"></div><div class="row"><span class="grow">轮回殿：道果 <b>${fmt(dg)}</b>${st.trials && st.trials.length ? ` · 试炼 ${st.trials.map(id => esc(L.TRIAL[id].n)).join('、')}` : ''}${st.origin && st.origin !== 'qitu' ? ` · 出身 ${esc(L.originOf(st).n)}` : ''}</span>${rb}</div>`;
}
function bindLifeRebirth(s) {
  const a = s.querySelector('#btnReborn'); if (a) a.onclick = () => { SFX.tap(); rebirthFlow('ascend'); };
  const b = s.querySelector('#btnBingjie');
  if (b) b.onclick = () => { SFX.tap(); const f = L.daoFruit(st); sheet({ title: '兵解', center: true, body: `<p>散去这一世的修为，带着 <b>${fmt(f.total)}</b> 道果转世重修？这一世到此为止，不能反悔。</p>`, foot: [{ t: '再想想', alt: true, fn: () => showMe() }, { t: '兵解', fn: () => sheet({ title: '兵解', center: true, body: '<p class="center seal">真的兵解吗？</p>', foot: [{ t: '算了', alt: true, fn: () => showMe() }, { t: '兵解转世', fn: () => { recordLife(); rebirthFlow('bingjie'); } }] }) }] }); };
}

// ---------- 轮回 ----------
let RB = null;   // 这一回轮回的选择：{ how, picks, origin, trials, card }
function rebirthFlow(how) {
  saveLocal('转世前');   // 关键节点：结算之前的这一世存一份（自动档）
  L.settle(st, how);
  recordLife();
  RB = { how, picks: { arts: [], gear: null, pet: null }, origin: L.originOpen(st, st.origin) ? st.origin || 'qitu' : 'qitu', trials: (st.trials || []).filter(id => L.TRIAL[id]), card: null };
  saveLocal();
  showSettle();
}
function showSettle() {
  const S = st.settle;
  const rows = S.parts.map(x => `<div class="dgrow"><span>${esc(x.n)}</span><b class="num">+${fmt(x.v)}</b></div>`).join('')
    + S.mults.map(m => `<div class="dgrow mult"><span>${esc(m.n)}</span><b class="num">×${m.v.toFixed(2)}</b></div>`).join('');
  sheet({ title: '轮回结算', center: true, noClose: true,
    body: `${bdImg('samsara', 200)}<div class="dglist">${rows}</div>
      <div class="dgrow total" id="dgTotal"><span>这一世带走</span><b class="num goldt">${fmt(S.total)} 道果</b></div>
      <p class="center muted">结局：${S.ends.map(endName).join(' · ')}${S.freshEnd.length ? '（新记入图鉴）' : ''} · 轮回殿余额 <b>${fmt(L.daoguo(st))}</b></p>`,
    foot: [{ t: '下一步：传承', gold: true, fn: showLegacy }] });
}
function showLegacy() {
  const c = L.legacyCands(st), P = RB.picks;
  if (!c.arts.length && !c.gear.length && !c.pets.length) { L.legacySet(st, {}); showHall(); return; }
  const sec = (title, note, items) => `<div class="muted">${title}<span>（${note}）</span></div>${items.length ? `<div class="lgrid">${items.join('')}</div>` : '<p class="muted">这一世没有能带走的。</p>'}`;
  const artB = c.arts.map(x => `<button class="lgc${P.arts.includes(x.id) ? ' sel' : ''}" data-la="${x.id}"><b>《${esc(x.n)}》</b><span class="muted">${L.MAST.n[x.lv]} → 下一世小成</span></button>`);
  const gearB = c.gear.map((x, i) => `<button class="lgc${P.gear && P.gear.slot === x.slot && P.gear.aff === x.aff ? ' sel' : ''}" data-lg="${i}"><b>「${esc(x.an)}」</b><span class="muted">${esc(x.n)}的器灵 · ${esc(x.ad)}</span></button>`);
  const petB = c.pets.map(x => `<button class="lgc${P.pet === x.sp ? ' sel' : ''}" data-lp="${x.sp}">${petImg({ sp: x.sp, form: 0 }, 32)}<b>${esc(x.n)}</b><span class="muted">下一世第一枚蛋必是它</span></button>`);
  const s = sheet({ title: '传承', center: true, noClose: true, still: modalTitle() === '传承',
    body: `<p>这一世练成的东西，三样都能带一份走。点一下选上，再点取消。</p>
      ${sec('功法', `圆满或化境的${c.artN > 1 ? '，可带两门' : '一门'}`, artB)}${sec('器灵', '一件法宝的一条词条：下一世第一件同槽的法宝带上它', gearB)}${sec('血脉', '一只五心灵宠', petB)}`,
    foot: [{ t: '下一步：轮回殿', gold: true, fn: () => { L.legacySet(st, P); showHall(); } }] });
  s.querySelectorAll('[data-la]').forEach(b => b.onclick = () => { SFX.tap(); const id = b.dataset.la, i = P.arts.indexOf(id); if (i >= 0) P.arts.splice(i, 1); else { P.arts.push(id); if (P.arts.length > c.artN) P.arts.shift(); } showLegacy(); });
  s.querySelectorAll('[data-lg]').forEach(b => b.onclick = () => { SFX.tap(); const x = c.gear[+b.dataset.lg]; P.gear = P.gear && P.gear.slot === x.slot && P.gear.aff === x.aff ? null : { slot: x.slot, aff: x.aff }; showLegacy(); });
  s.querySelectorAll('[data-lp]').forEach(b => b.onclick = () => { SFX.tap(); P.pet = P.pet === b.dataset.lp ? null : b.dataset.lp; showLegacy(); });
}
let hallSel = null;
function hallNodeImg(h) {
  const lv = L.perk(st, h.id), state = lv >= h.max ? 'done' : !L.hallWhy(st, h.id) ? 'open' : 'locked';
  const ic = h.origin ? 'buddy' : h.icon;
  const c = ART.samsaraNode ? ART.samsaraNode(ic, lv > 0 && lv < h.max && state === 'locked' ? 'done' : state) : null;
  return c ? `<img class="px" src="${urlOf(c, ['sn', ic, state, lv].join('|'))}" style="width:${pxs(24, 2)}px;height:${pxs(24, 2)}px" alt="">` : '';
}
function showHall(sel) {
  if (sel !== undefined) hallSel = sel;
  const node = h => { const lv = L.perk(st, h.id); return `<button class="hnode${hallSel === h.id ? ' sel' : ''}${lv >= h.max ? ' done' : ''}" data-h="${h.id}">${hallNodeImg(h)}<span class="nm">${esc(h.n.replace(/^出身·/, ''))}${h.isNew ? '<i class="new">新</i>' : ''}</span><span class="num">${lv >= h.max ? (h.max > 1 ? '满' : '已点亮') : fmt(L.hallCost(st, h.id))}${h.max > 1 ? ` · ${lv}/${h.max}` : ''}</span></button>`; };
  const H = hallSel && L.HALL_NODE[hallSel], why = H ? L.hallWhy(st, H.id) : '';
  const det = H ? `<div class="card flat hdet"><div class="main"><b>${esc(H.n)}</b>${H.max > 1 ? ` <span class="muted">${L.perk(st, H.id)}/${H.max} 级</span>` : ''}<div>${esc(H.d)}</div><div class="${why ? 'seal' : 'jadet'}">${why || `点亮要 ${fmt(L.hallCost(st, H.id))} 道果`}</div></div><div class="right"><button class="btn gold" id="hallBuy" ${why ? 'disabled' : ''}>点亮</button></div></div>` : '<p class="muted center">点一个节点看它管什么。</p>';
  const s = sheet({ title: '轮回殿', center: true, noClose: true, still: modalTitle() === '轮回殿',
    body: `<div class="row"><span class="grow">道果 <b class="goldt" id="hallDg">${fmt(L.daoguo(st))}</b></span><span class="muted">花不完的留到下一世</span></div>
      <div class="muted">殿中</div><div class="hgrid" id="hallGrid">${L.HALL.filter(h => !h.origin).map(node).join('')}</div>
      <div class="muted">出身（点亮后投胎时可选）</div><div class="hgrid">${L.HALL.filter(h => h.origin).map(node).join('')}</div>${det}`,
    foot: [{ t: '下一步：选出身', gold: true, fn: showOriginPick }] });
  s.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { SFX.tap(); showHall(b.dataset.h); });
  const bb = s.querySelector('#hallBuy'); if (bb) bb.onclick = () => { const r = L.hallBuy(st, hallSel); if (r) { SFX.goal(); saveLocal(); floatText(100, 60, `${L.HALL_NODE[r.id].n} ${r.lv} 级`, '#ffe39a'); } showHall(); };
}
function originImg(id, w) { const c = ART.origin ? ART.origin(id) : null; return c ? `<img class="px" src="${urlOf(c, 'og|' + id)}" style="width:${w}px;height:${Math.round(w * 40 / 64)}px" alt="">` : ''; }
function showOriginPick() {
  if (!L.originOpen(st, RB.origin)) RB.origin = 'qitu';
  const O = L.ORIGINS[RB.origin];
  const cards = L.ORIGIN_IDS.map(id => { const X = L.ORIGINS[id], open = L.originOpen(st, id); return `<button class="ocard${RB.origin === id ? ' sel' : ''}${open ? '' : ' off'}" data-o="${id}" ${open ? '' : 'disabled'}>${originImg(id, pxs(64, 1.5))}<b>${esc(X.n)}</b><span class="muted">${open ? esc(X.start) : '轮回殿点亮'}</span></button>`; }).join('');
  const s = sheet({ title: '出身', center: true, noClose: true, still: modalTitle() === '出身',
    body: `<div class="ogrid">${cards}</div>
      <div class="card flat"><div class="main"><b>${esc(O.n)}</b><div>${esc(O.d)}</div><div class="muted">可入宗门：${esc(O.sects)}${O.pact ? ` · 约战：${esc(O.pact.title)}（${esc(O.pact.who)}）` : ' · 约战：三年之约'}${O.chain ? ` · 专属奇遇链《${esc(L.CHAIN[O.chain].n)}》` : O.chainDone ? ` · 《${esc(L.CHAIN[O.chainDone].n)}》第一步已完成` : ''}</div></div></div>`,
    foot: [{ t: '回轮回殿', alt: true, fn: () => showHall() }, { t: '下一步：命格', gold: true, fn: () => rebirthPick() }] });
  s.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { if (b.disabled) return; SFX.tap(); RB.origin = b.dataset.o; showOriginPick(); });
}
function rebirthPick() {
  if (!RB) { rebirthFlow(st.p.r >= 9 ? 'ascend' : 'rest'); return; }
  const n = st.rebirth + 1, N = L.rebirthCardN(st);
  const cards = L.rebirthCards(st, N);
  const s = sheet({ title: `第 ${n + 1} 世 · 选择天赋`, center: true, noClose: true,
    body: `<p>轮回之中，${'三四五'[N - 3] || N}道命格浮现。选择你下一世的根骨：</p>
      <div class="cands${N > 3 ? ' c4' : ''}">${cards.map((c, i) => { const T0 = L.TALENTS[c.t]; const tr = L.TRAITS[c.tr[0]]; const beam = T0.c === 'rainbow' ? 'linear-gradient(#ff7a7a,#ffd36b,#7dff9a,#7ad7ff,#c48bff)' : T0.c; return `<div class="cand hide" data-i="${i}"><div class="beam" style="background:${beam}"></div>${talentTag(c.t)}<div class="tr" style="color:var(--text)">${tr.n}</div><div class="tr">${tr.d}</div><div class="cover">？</div></div>`; }).join('')}</div>
      <p class="muted center">带着前世的见识投胎：所有功能直接开放、不再讲解；图鉴、轮回殿、成就称号跨世保留。</p>`,
    foot: [{ t: '下一步：天道试炼', gold: true, disabled: true, fn: () => {} }] });
  const ok = s.querySelector('[data-fi="0"]');
  s.querySelectorAll('.cand').forEach((c, i) => {
    setTimeout(() => { c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(cards[i].t); }, 350 + i * 450);
    c.onclick = () => {
      if (c.classList.contains('hide')) return;
      SFX.tap();
      s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', x === c));
      ok.disabled = false;
      ok.onclick = () => { RB.card = cards[i]; showTrials(); };
    };
  });
}
function showTrials() {
  const T = RB.trials, m = L.trialMult(st, T);
  const rows = L.TRIALS.map(t => `<button class="check trow${T.includes(t.id) ? ' on' : ''}" data-tr="${t.id}"><span class="box"></span><span class="grow"><b>${esc(t.n)}</b>${t.isNew ? '<i class="new">新</i>' : ''}<br><span class="muted">${esc(t.d)}</span></span><b class="num">+${Math.round(L.trialBonus(st, t.id) * 100)}%</b></button>`).join('');
  const s = sheet({ title: '天道试炼', center: true, noClose: true, still: modalTitle() === '天道试炼',
    body: `<p>给下一世加一道难题：选得越多，下一世结算的道果越多（系数相加）。可以一条不选。</p><div class="tlist">${rows}</div>
      <p class="center">下一世道果 <b class="goldt" id="trialMult">×${m.toFixed(2)}</b>${st.meta.trialHint ? '（卖茶翁的提示：每条 +5%）' : ''}</p>`,
    foot: [{ t: '回去改命格', alt: true, fn: () => rebirthPick() }, { t: '投胎转世', gold: true, fn: doRebirth }] });
  s.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { SFX.tap(); const id = b.dataset.tr, i = T.indexOf(id); if (i >= 0) T.splice(i, 1); else T.push(id); showTrials(); });
}
function doRebirth() {
  const old = st, card = RB.card, n = old.rebirth + 1;
  if (!card) { rebirthPick(); return; }
  const ns = L.rebirthState(old, { t: card.t, tr: card.tr, origin: RB.origin, trials: RB.trials.slice() });
  ns.guide = { step: GUIDE.length, done: true };
  ns.hintSeen = Object.assign({}, old.hintSeen || {}, { pactSoon: 0, afterPact: 0 });
  RB = null; hallSel = null;
  const tp = $('#tip'); if (tp) tp.hidden = true;
  closeModal();
  loadState(ns);
  const O = L.originOf(st);
  L.log(st, `第 ${n + 1} 世，${st.p.name}再踏仙途${st.origin !== 'qitu' ? '（' + O.n + '）' : ''}`, 'gold');
  banner(`第 ${n + 1} 世`, L.TALENTS[card.t].n + ' · ' + L.TRAITS[card.tr[0]].n);
  SFX.gong();
  saveLocal();
  pushPopup(showOpening);
}
// 出身开场：一张出身小画 + 三句 + 约战是谁
function showOpening() {
  const O = L.originOf(st), pt = L.pactText(st);
  sheet({ title: O.n, center: true, noClose: true,
    body: `<div class="center">${originImg(st.origin || 'qitu', 192)}</div>${O.open.map(t => `<p>${esc(t)}</p>`).join('')}
      <div class="quote">第 ${L.PACT_TICK} 个月，${pt ? `${esc(pt.title)}：${esc(pt.who)}` : `三年之约：${esc(st.exName)}`}，战力 ${fmt(L.PACT_POWER)}。${st.trials.length ? `<br>天道试炼：${st.trials.map(id => esc(L.TRIAL[id].n)).join('、')}${st.trialEl ? `（封了${L.elName(st.trialEl)}系）` : ''}` : ''}</div>`,
    foot: [{ t: '踏入仙途', gold: true, fn: closeModal }] });
}

// ---------- 出身的约战变体（弃徒照旧走 duels.js 的三年之约） ----------
{ const pact0 = runPact; runPact = function () {
  const pt = L.pactText(st);
  if (!pt) return pact0();
  const res = L.pactDuel(st);
  const c = ART.portrait ? ART.portrait(pt.img, res.win ? 'shock' : 'ang') : null;
  const img = c ? `<img class="px" id="vsR" src="${urlOf(c, ['pt', pt.img, res.win ? 1 : 0].join('|'))}" style="width:66px;height:66px" alt="">` : rivalAvImg({ n: pt.who, id: 'mu' }, 66);
  duel({
    title: pt.title, intro: esc(pt.intro) + (res.assist ? `<br><span class="jadet">戒中老祖借你一缕神魂：战力 ${fmt(res.base)} ×${L.pactAssist(st)} = ${fmt(res.S)}</span>` : ''),
    right: { img, name: pt.who, sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    stage: 'town', foe: ftPeople(pt.img) || ftGen(pt.who), face: true,
    quote: pt.quote,
    winText: `${esc(pt.win)}<br>灵石 +${fmt(res.stones || 0)}`,
    loseText: `${esc(pt.lose)}<br>天骄榜上，再见分晓。`,
    done: closeModal,
  });
}; }
