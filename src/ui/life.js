/* 废柴仙途 · 界面片段 life：飞升、坐化、转世
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 飞升 / 坐化 / 转世 ----------
function showAscension() {
  const p = st.p;
  st.lives.push(L.lifeSummary(st));
  saveLocal();
  sheet({ title: '飞升', center: true, noClose: true,
    body: `<div class="center">${myAvImg(66, 9)}</div>
      <div class="center big goldt">${esc(p.name)} 白日飞升</div>
      <p class="center">九九天劫散尽，仙门大开。当年被逐出山门、被当众退婚的废柴，踏云而去，位列仙班。</p>
      <p class="center" id="daoEnding">${esc(L.daoEnding(st))}</p>
      <dl class="grid2"><dt>修仙</dt><dd>${Math.floor(st.year) + 1} 年 · ${fmt(p.age)} 岁</dd><dt>天骄榜</dt><dd>最高第 ${st.bestRank}</dd><dt>宗门</dt><dd>${st.sect ? L.sectOf(st).n + L.srankName(st, st.sect.rank) : '散修'}</dd>
        <dt>道基</dt><dd>+${Math.round(L.daoji(st) * 100)}%${st.trib && st.trib.dan ? ' · ' + esc(st.trib.dan) : ''}</dd>${L.karmaOpen(st).length ? `<dt>因果</dt><dd>未了 ${L.karmaOpen(st).length} 条</dd>` : ''}</dl>
      <div class="quote">恭喜通关！转世重修可以开启新的一世：天赋三选一，所有功能直接开放。</div>`,
    foot: [{ t: '留在此世', alt: true, fn: closeModal }, { t: '再入轮回', gold: true, fn: () => rebirthPick() }] });
}
function showDeath() {
  const p = st.p;
  st.lives.push(L.lifeSummary(st));
  saveLocal();
  sheet({ title: '坐化', center: true, noClose: true,
    body: `<div class="center">${myAvImg(66, undefined, 'filter:grayscale(1)')}</div>
      <p class="center">寿元耗尽。${esc(p.name)}于洞府中静静坐化，享年 ${Math.floor(p.age)} 岁，止步${L.stageName(p)}。</p>
      <div class="quote">戒中老祖：“别灰心。老夫护住你一缕真灵，带着这一世的感悟，再来一次！”</div>`,
    foot: [{ t: '转世重修', gold: true, fn: () => rebirthPick() }] });
}
function rebirthPick() {
  const cards = L.rebirthCards(st, 3);
  const n = st.rebirth + 1;
  const s = sheet({ title: `第 ${n + 1} 世 · 选择天赋`, center: true, noClose: true,
    body: `<p>轮回之中，三道命格浮现。选择你下一世的根骨：</p>
      <div class="cands">${cards.map((c, i) => { const T0 = L.TALENTS[c.t]; const tr = L.TRAITS[c.tr[0]]; const beam = T0.c === 'rainbow' ? 'linear-gradient(#ff7a7a,#ffd36b,#7dff9a,#7ad7ff,#c48bff)' : T0.c; return `<div class="cand hide" data-i="${i}"><div class="beam" style="background:${beam}"></div>${talentTag(c.t)}<div class="tr" style="color:var(--text)">${tr.n}</div><div class="tr">${tr.d}</div><div class="cover">？</div></div>`; }).join('')}</div>
      <p class="muted center">带着前世的见识投胎：所有功能直接开放、不再讲解；历练相性的图鉴跨世保留。</p>`,
    foot: [{ t: '投胎转世', gold: true, disabled: true, fn: () => {} }] });
  const ok = s.querySelector('[data-fi="0"]');
  s.querySelectorAll('.cand').forEach((c, i) => {
    setTimeout(() => { c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(cards[i].t); }, 350 + i * 450);
    c.onclick = () => {
      if (c.classList.contains('hide')) return;
      SFX.tap();
      s.querySelectorAll('.cand').forEach(x => x.classList.toggle('sel', x === c));
      ok.disabled = false;
      ok.onclick = () => {
        const old = st, card = cards[i];
        const ns = L.newState({ name: old.p.name, female: old.p.look.f, rebirth: n, t: card.t, tr: card.tr, lives: old.lives, meta: old.meta, origin: old.origin });
        ns.guide = { step: GUIDE.length, done: true };
        ns.hintSeen = Object.assign({}, old.hintSeen || {}, { pactSoon: 0, afterPact: 0 });
        closeModal();
        loadState(ns);
        L.log(st, `第 ${n + 1} 世，${st.p.name}再踏仙途`, 'gold');
        banner(`第 ${n + 1} 世`, L.TALENTS[card.t].n + ' · ' + L.TRAITS[card.tr[0]].n);
        SFX.gong();
        saveLocal();
      };
    };
  });
}
