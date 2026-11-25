/* 废柴仙途 · 界面片段 panel-market：坊市
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 坊市 ----------
function showMarket() {
  const p = st.p;
  const body = L.MARKET.filter(m => !m.gear || L.marketOpen(st, m.k)).map(m => {
    const c = L.price(st, m.k);
    const note = m.k === 'life' ? ` · 本境界已服 ${st.lifePills[p.r] || 0}/3` : m.k === 'ore' ? ` · 一筐 ${fmt(L.oreBasket(st))} · 本届还能买 ${L.oreBuyLeft(st)} 筐 · 手里 ${fmt(st.ore || 0)}` : '';
    const dis = st.stones < c || (m.k === 'life' && (st.lifePills[p.r] || 0) >= 3) || (m.k === 'ore' && L.oreBuyLeft(st) <= 0);
    const ic = { pill: 'pill', life: 'life', box: 'bag', egg: 'pet' }[m.k];
    return `<div class="card flat"><div style="flex:none">${m.k === 'ore' ? oreImg(30) : iconHTML(ic, 30)}</div><div class="main"><div>${m.n}</div><div class="muted">${m.d}${note}</div></div>
      <div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-k="${m.k}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(c)}</button></div></div>`;
  }).join('');
  let auc = '';
  if (L.auctionOpen(st)) {
    auc = `<div class="sep"></div><div class="seal">拍卖会 · 还剩 ${st.auction.until - st.tick} 周天（一口价，通常只买得起一件）</div>` + st.auction.items.map((it, i) => {
      const dis = it.sold || st.stones < it.price;
      const what = it.k === 'w' || it.k === 'g' ? `${L.GEAR_N[it.slot || 'w']}${it.slot === 'o' ? '' : ''}，现在 ${L.gearTier(st, it.slot || 'w') ? L.gearTierName(it.slot || 'w', L.gearTier(st, it.slot || 'w')) : '空'}；随机词条，走对比卡` : it.k === 'plan' ? `${L.GEAR_N[L.PLAN[it.plan].slot]} ${L.gearTierName(L.PLAN[it.plan].slot, L.PLAN[it.plan].t)}，${L.PLAN[it.plan].aff.map(a => L.AFFIX[a].n).join('、')}（化神后器炉打造）` : it.art ? `${artMain(it.art)}${L.artOwned(st, it.art) ? '（已会，熟练 +20）' : ''}` : '';
      return `<div class="card flat">${it.art ? artImg(it.art, 2) : it.k === 'plan' ? scrollImg() : ''}<div class="main"><div>${esc(it.n)}${it.art ? ' ' + elChip(L.art(it.art).el) : ''}</div>${what ? `<div class="muted">${esc(what)}</div>` : ''}${it.sold ? '<div class="muted">已拍下</div>' : ''}</div><div class="right"><button class="btn sm ${dis ? 'alt' : 'gold'}" data-au="${i}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(it.price)}</button></div></div>`;
    }).join('');
  } else if (L.mr(st) >= 2) {
    const n = ((L.AUCTION.at - st.tick % L.AUCTION.every) + L.AUCTION.every) % L.AUCTION.every || L.AUCTION.every;
    auc = `<div class="muted">下一场拍卖会：${n} 周天后</div>`;
  }
  const box = L.boxCap(st, 'w');
  const s = sheet({ title: '坊市', sub: `灵石 ${fmt(st.stones)} · 价格随境界上涨`, body: body + auc + `<div class="muted">当前：${L.GEAR_SLOTS.filter(s => L.gearOpen(st, s)).map(s => L.GEAR_N[s] + ' ' + (L.gearTier(st, s) ? L.gearTierName(s, L.gearTier(st, s)) : '空')).join(' · ')} · 心法 ${L.artSlots(st)[0] ? '《' + esc(L.art(L.artSlots(st)[0]).n) + '》' : '基础吐纳'} · 灵宠 ${p.pet ? L.PETS[p.pet.tier].n : '无'}<br>寻宝保底：连续 ${st.boxMiss || 0}/2 次没提升；本境界最高补到 ${L.WEAPONS[box].n} / ${L.ARTS[L.boxCap(st, 'a')].n}功法${L.gearPity(st) ? `（下一次保底补${L.GEAR_N[L.gearPity(st).s]}到${L.gearTierName(L.gearPity(st).s, L.gearPity(st).t)}）` : ''}${st.arts.firstBox ? '' : '；头一回寻宝必得《引气诀》'}</div>` });
  s.querySelectorAll('button[data-au]').forEach(btn => btn.onclick = () => {
    const r = L.auctionBuy(st, +btn.dataset.au);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, showMarket);
    else { floatText(100, 80, r.planText || '拍下' + r.n, '#ffe39a'); showMarket(); }
  });
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    const r = L.buy(st, btn.dataset.k);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, showMarket);
    else { floatText(100, 80, r.k === 'life' ? `寿元 +${r.add} 年` : r.k === 'ore' ? `灵矿 +${fmt(r.ore)}` : '破境丹 +1', r.k === 'life' ? '#8ff5d0' : r.k === 'ore' ? '#9fd8ff' : '#ffe39a'); showMarket(); }
  });
}
function revealItem(it, back) {
  const tierOf = it.kind === 'pet' ? it.tier : it.gear ? Math.min(6, it.tier - 1) : it.tier;
  const colors = ['#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff', '#ffcf3f', '#ff7a7a'];
  const col = it.kind === 'a' ? ART.qualityColor(it.tier) : it.gear ? (it.tier >= 7 ? '#c48bff' : ART.qualityColor(it.tier)) : colors[Math.max(0, Math.min(6, tierOf))];
  const img = it.kind === 'pet' ? petImg(it.tier, 44) : it.kind === 'a' ? artImg(it.art, 3) : it.gear ? gearImg(it.gear, 3) : `<img class="px" src="${iconURL.sword}" style="width:44px;height:44px" alt="">`;
  const s = sheet({
    title: it.kind === 'pet' ? '灵兽破壳' : it.kind === 'a' ? (it.frag && !it.fragDone ? '残篇' : '功法') : it.src === 'vault' ? '宗门宝库' : it.src === 'auction' ? '拍卖' : '寻宝', center: true, noClose: true,
    body: `<div class="cands" style="grid-template-columns:1fr;max-width:160px;margin:0 auto"><div class="cand hide"><div class="beam" style="background:${col}"></div>${img}<div class="cover">？</div></div></div>${itemLine(it)}`,
    foot: [{ t: it.pend ? '继续' : '收下', gold: true, fn: back || closeModal }],
  });
  setTimeout(() => { const c = s.querySelector('.cand'); if (!c) return; c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(tierOf); if (tierOf >= 5) flash(0.4); }, 450);
}
