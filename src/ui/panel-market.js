/* 废柴仙途 · 界面片段 panel-market：坊市
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 坊市 ----------
function showMarket() {
  const p = st.p;
  const body = L.MARKET.map(m => {
    const c = L.price(st, m.k);
    const note = m.k === 'life' ? ` · 本境界已服 ${st.lifePills[p.r] || 0}/3` : '';
    const dis = st.stones < c || (m.k === 'life' && (st.lifePills[p.r] || 0) >= 3);
    const ic = { pill: 'pill', life: 'life', box: 'bag', egg: 'pet' }[m.k];
    return `<div class="card flat"><div style="flex:none">${iconHTML(ic, 30)}</div><div class="main"><div>${m.n}</div><div class="muted">${m.d}${note}</div></div>
      <div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-k="${m.k}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(c)}</button></div></div>`;
  }).join('');
  let auc = '';
  if (L.auctionOpen(st)) {
    auc = `<div class="sep"></div><div class="seal">拍卖会 · 还剩 ${st.auction.until - st.tick} 周天（一口价，通常只买得起一件）</div>` + st.auction.items.map((it, i) => {
      const dis = it.sold || st.stones < it.price;
      return `<div class="card flat"><div class="main"><div>${esc(it.n)}${it.tier ? ` <span class="muted">（${it.k === 'w' ? '战力 ×' + L.WEAPONS[it.tier].m : '修炼 ×' + L.ARTS[it.tier].m}）</span>` : ''}</div>${it.sold ? '<div class="muted">已拍下</div>' : ''}</div><div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-au="${i}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(it.price)}</button></div></div>`;
    }).join('');
  } else if (L.mr(st) >= 2) {
    const n = ((L.AUCTION.at - st.tick % L.AUCTION.every) + L.AUCTION.every) % L.AUCTION.every || L.AUCTION.every;
    auc = `<div class="muted">下一场拍卖会：${n} 周天后</div>`;
  }
  const box = L.boxCap(st, 'w');
  const s = sheet({ title: '坊市', sub: `灵石 ${fmt(st.stones)} · 价格随境界上涨`, body: body + auc + `<div class="muted">当前：法宝 ${p.w ? L.WEAPONS[p.w].n : '无'} · 功法 ${L.ARTS[p.a].n} · 灵宠 ${p.pet ? L.PETS[p.pet.tier].n : '无'}<br>寻宝保底：连续 ${st.boxMiss || 0}/2 次没提升；本境界最高补到 ${L.WEAPONS[box].n} / ${L.ARTS[L.boxCap(st, 'a')].n}</div>` });
  s.querySelectorAll('button[data-au]').forEach(btn => btn.onclick = () => {
    const r = L.auctionBuy(st, +btn.dataset.au);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, showMarket);
    else { floatText(100, 80, '拍下' + r.n, '#ffe39a'); showMarket(); }
  });
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    const r = L.buy(st, btn.dataset.k);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, showMarket);
    else { floatText(100, 80, r.k === 'life' ? `寿元 +${r.add} 年` : '破境丹 +1', r.k === 'life' ? '#8ff5d0' : '#ffe39a'); showMarket(); }
  });
}
function revealItem(it, back) {
  const tierOf = it.kind === 'pet' ? it.tier : it.kind === 'w' ? Math.min(6, it.tier - 1) : it.tier;
  const colors = ['#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff', '#ffcf3f', '#ff7a7a'];
  const col = colors[Math.max(0, Math.min(6, tierOf))];
  const img = it.kind === 'pet' ? petImg(it.tier, 44) : `<img class="px" src="${iconURL[it.kind === 'w' ? 'sword' : 'bag']}" style="width:44px;height:44px" alt="">`;
  const s = sheet({
    title: it.kind === 'pet' ? '灵兽破壳' : '寻宝', center: true, noClose: true,
    body: `<div class="cands" style="grid-template-columns:1fr;max-width:160px;margin:0 auto"><div class="cand hide"><div class="beam" style="background:${col}"></div>${img}<div class="cover">？</div></div></div>${itemLine(it)}`,
    foot: [{ t: '收下', gold: true, fn: back || closeModal }],
  });
  setTimeout(() => { const c = s.querySelector('.cand'); if (!c) return; c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(tierOf); if (tierOf >= 5) flash(0.4); }, 450);
}
