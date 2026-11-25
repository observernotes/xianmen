/* 废柴仙途 · 界面片段 panel-market：坊市（货架六格、行情出售、拍卖竞价、坊市事件）与开宝揭晓
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。数据与规则在 src/logic/market.js。 */
// ---------- 坊市 ----------
// 货的图标（30 像素左右，按整数个设备像素放大）
function goodImg(st0, row) {
  const k = row.k, s = row.s || {};
  if (k === 'ore') return oreImg(pxs(16, 2));
  if (k === 'frag') return icon16('frag', 2);
  if (k === 'plan') return scrollImg(pxs(16, 2));
  if (k === 'robe' && s.tier) { const c = ART.item('r', s.tier), z = pxs(16, 2); return `<img class="px" src="${urlOf(c, 'gear|r|' + s.tier)}" style="width:${z}px;height:${z}px;flex:none" alt="">`; }
  return iconHTML({ pill: 'pill', box: 'bag', egg: 'pet', life: 'life' }[k] || 'bag', 30);
}
// 竞拍者的小头像：宿敌与人物用半身像，天骄榜路人用门人头像生成器（同名恒定）
const RIVAL_PORTRAIT = { mu: 'mu', zhao: 'zhao', chu: 'tian', xue: 'xue', yun: 'yun' };
function compImg(c, w) {
  let cv = null;
  const alt = !!st.p.look.f;
  if (c.kind === 'rival' && RIVAL_PORTRAIT[c.id]) cv = ART.portrait(RIVAL_PORTRAIT[c.id], 'n', c.id === 'mu' ? alt : false);
  else if (c.kind === 'npc' && ART.hasPortrait && ART.hasPortrait(c.id)) cv = ART.portrait(c.id, 'n', (c.id === 'su' || c.id === 'ye') && alt);
  else { let h = 0; for (const ch of c.n) h = (h * 31 + ch.charCodeAt(0)) >>> 0; cv = ART.portraitGen(h, { f: h % 2, realm: Math.min(8, st.p.r) }, 'n'); }
  const z = w || pxs(48, 0.5);
  return `<img class="px" src="${urlOf(cv, 'comp|' + c.kind + '|' + (c.id || c.n) + '|' + (c.kind === 'ladder' ? st.p.r : '') + alt)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">`;
}
// 某人现在在天骄榜第几（ladder 里没有玩家自己，排在玩家后面的要 +1）
const ladderRank = n => { const i = st.ladder.findIndex(x => x.n === n); return i < 0 ? 0 : i + 1 < st.rank ? i + 1 : i + 2; };
const compTag = c => (c.kind === 'rival' ? `<span class="seal">宿敌 · 第 ${ladderRank(c.n)}</span>` : c.kind === 'npc' ? '<span class="jadet">人物</span>' : `<span class="muted">天骄榜第 ${ladderRank(c.n)}</span>`);
const mult2 = v => String(Math.round(v * 100) / 100);
// 拍品说明
function lotWhat(it) {
  if (it.k === 'w' || it.k === 'g') { const s = it.slot || 'w', t = L.gearTier(st, s); return `${L.GEAR_N[s]}，现在 ${t ? L.gearTierName(s, t) : '空'}；随机词条，走对比卡`; }
  if (it.k === 'plan') { const P = L.PLAN[it.plan]; return `${L.GEAR_N[P.slot]} ${L.gearTierName(P.slot, P.t)}，${P.aff.map(a => L.AFFIX[a].n).join('、')}（化神后器炉打造）`; }
  if (it.art) return `${artMain(it.art)}${L.artOwned(st, it.art) ? '（已会，熟练 +20）' : ''}`;
  if (it.k === 'xisui') return `灵根 ${L.talentInfo(st).n} → 高一档`;
  if (it.k === 'treasure') return `手里 ${st.treasure}，洗髓、九转、重铸都用它`;
  if (it.k === 'pack') return '天材地宝 ×2 与九转金丹的灵草';
  if (it.k === 'pills') return `手里 ${st.pills} 枚`;
  return '';
}
function lotImg(it) {
  if (it.art) return artImg(it.art, 2);
  if (it.k === 'plan') return scrollImg(pxs(16, 2));
  if (it.k === 'g' || it.k === 'w') { const c = ART.item(it.slot || 'w', it.tier), z = pxs(16, 2); return `<img class="px" src="${urlOf(c, 'gear|' + (it.slot || 'w') + '|' + it.tier)}" style="width:${z}px;height:${z}px;flex:none" alt="">`; }
  return iconHTML(it.k === 'pills' || it.k === 'xisui' || it.k === 'pack' ? 'pill' : 'bag', 30);
}
// o.noEv：不再先弹待处理的坊市事件（事件结算完、买卖之后刷新时用）；o.keep：保留滚动位置
function showMarket(o) {
  o = o || {};
  const p = st.p;
  const mev = L.marketEvent(st);
  if (mev && !o.noEv) { showChoice(mev, () => showMarket({ noEv: true })); return; }
  const top = o.keep && !$('#modal').hidden && $('#modal .body') ? $('#modal .body').scrollTop : 0;
  const rows = L.shelf(st);
  const cell = row => {
    const why = L.shelfWhy(st, row), dis = !!why;
    const lim = row.fixed ? '' : row.lock ? '' : ` · 限购 ${row.lim - Math.max(0, row.left)}/${row.lim}`;
    const off = row.off ? `<span class="chip warn">${Math.round((1 - row.off) * 10)}折</span>` : row.urgent ? '<span class="chip bad">加急</span>' : '';
    const btn = row.lock ? `<button class="btn sm alt mbuy" disabled>${esc(row.lock)}</button>`
      : `<button class="btn sm ${dis ? 'alt' : 'gold'} mbuy" data-buy="${row.i}" data-k="${row.k}" ${dis ? 'disabled' : ''}>${iconHTML('stone', 12)} ${fmt(row.price)}</button>${why && row.left > 0 ? `<span class="muted">${esc(why)}</span>` : row.left <= 0 && !row.lock ? '<span class="muted">本届售罄</span>' : ''}`;
    return `<div class="card flat shelfrow${row.lock ? ' lock' : ''}"><div style="flex:none">${row.k ? goodImg(st, row) : iconHTML('bag', 30)}</div><div class="main"><div>${esc(row.n)} ${off}</div>${row.d || lim ? `<div class="muted">${esc(row.d || '')}${lim}</div>` : ''}</div><div class="right">${btn}</div></div>`;
  };
  const fixed = rows.filter(r => r.fixed), rot = rows.filter(r => !r.fixed);
  const disc = st.market && st.market.disc < 1 ? ' · 本届九折' : '', shang = L.worldOn(st, 'w_shanglu') ? ' · 商路断绝 +30%' : '';
  let body = `<div class="mhead"><span>${icon16('paddle', 1)} 常驻</span><span class="muted">价格随境界上涨${disc}${shang}</span></div>` + fixed.map(cell).join('')
    + `<div class="mhead" id="shelfRot"><span>${icon16('gavel', 1)} 轮换</span><span class="goldt">${L.shelfOpen(st) ? L.restockIn(st) + ' 周天后换货' : '炼气中期开放'}</span></div>` + rot.map(cell).join('');
  // 行情（筑基）
  if (L.sellOpen(st)) {
    const sellRow = k => {
      const G = L.SELL[k], m = L.sellMult(st, k), tr = L.sellTrend(st, k), have = L.sellHave(st, k), half = L.sellCount(st, k, 0.5), all = L.sellCount(st, k, 1);
      const parts = L.sellParts(st, k).slice(1).map(([n, v, how]) => `${n} ${how === 'add' ? '+' + mult2(v) : '×' + mult2(v)}`).join('，');
      const ic = k === 'herb' ? icon16('yin_w', 1) : k === 'ore' ? oreImg(pxs(16, 1)) : iconHTML('pill', pxs(16, 1));
      return `<div class="sellrow" data-good="${k}"><div class="sl-top">${ic}<span>${G.n} <b class="${tr.d === 'up' ? 'jadet' : tr.d === 'down' ? 'seal' : ''}">×${mult2(m)}</b></span>${icon16(tr.d, 1)}<span class="muted">${tr.t}</span></div>
        <div class="muted">手里 ${fmt(have)} · 单价 ${L.fmt1(L.sellPrice(st, k))}${parts ? '（' + esc(parts) + '）' : ''}${L.sellCapped(st, k) ? ' · 封顶：不超过买价的 95%' : ''}</div>
        <div class="sl-btns"><button class="btn alt" data-sell="${k}:0.5" ${half ? '' : 'disabled'}><span>卖一半</span><small>${half ? fmt(half) + ' → +' + fmt(L.sellValue(st, k, half)) : '没有货'}</small></button><button class="btn alt" data-sell="${k}:1" ${all ? '' : 'disabled'}><span>全卖</span><small>${all ? fmt(all) + ' → +' + fmt(L.sellValue(st, k, all)) : '没有货'}</small></button></div></div>`;
    };
    body += `<div class="sep"></div><div class="mhead" id="mktSell"><span>${icon16('sell', 1)} 行情 · 出售</span><span class="muted">每 ${L.IDX.every} 周天一变</span></div>${L.SELL_KEYS.map(sellRow).join('')}`;
  } else body += `<div class="sep"></div><div class="muted">${icon16('sell', 1)} 行情：筑基后开放，灵草、灵矿、破境丹都能卖。</div>`;
  // 拍卖会（金丹）
  if (L.auctionOpen(st)) {
    const A = st.auction, left = L.auctionBidsLeft(st);
    const lot = (it, i) => {
      const c = it.comp;
      const compLine = c ? `<div class="lotcomp">${compImg(c)}<span>竞拍者 ${esc(c.n)} ${compTag(c)}</span></div>` : '<div class="lotcomp muted">无人竞拍</div>';
      let act;
      if (it.res === 'won') act = `<div class="lotres jadet">已拍下 · 花去 ${fmt(it.paid)}</div>`;
      else if (it.res === 'comp') act = `<div class="lotres seal">被${esc(c.n)}拍走${c.kind !== 'npc' ? `（他战力 ×${L.AUCTION.boost}）` : ''}</div>`;
      else if (it.res === 'gone') act = '<div class="lotres muted">被一位无名修士拍走</div>';
      else act = `<div class="bids">${L.AUCTION.tiers.map((T, t) => { const b = L.bidInfo(st, i, t); return `<button class="btn ${t === 1 ? 'gold' : 'alt'} bidb" data-bid="${i}:${t}" ${b.why ? 'disabled' : ''}>${icon16(T.icon, 1)}<span>${T.n}</span><small>${fmt(b.price)} · ${L.pct(b.p)}</small></button>`; }).join('')}</div>`;
      return `<div class="lot${it.res ? ' done' : ''}" data-lot="${i}"><div class="row">${lotImg(it)}<div class="grow"><div>${esc(it.n)}${it.art ? ' ' + elChip(L.art(it.art).el) : ''}</div>${lotWhat(it) ? `<div class="muted">${esc(lotWhat(it))}</div>` : ''}<div>起拍 ${iconHTML('stone', 12)} ${fmt(it.price)}</div></div></div>${compLine}${act}</div>`;
    };
    body += `<div class="sep"></div><div class="mhead" id="aucBox"><span>${icon16('gavel', 1)} 拍卖会</span><span class="goldt">还剩 ${A.until - st.tick} 周天 · 还能出手 ${left} 次</span></div>${A.consign ? `<div class="jadet">送拍的东西落槌：灵石 +${fmt(A.consign)}</div>` : ''}${A.items.map(lot).join('')}
      <div class="muted">跟一口 ×1 拿下 35%，加价 ×1.4 拿下 70%，豪掷 ×2 拿下 97%；有竞拍者各 −15%。没拿下不花钱，拍品归对方——宿敌拍走的东西让他战力 ×${L.AUCTION.boost}。</div>`;
  } else if (st.rebirth > 0 || L.mr(st) >= 2) body += `<div class="sep"></div><div class="muted">${icon16('gavel', 1)} 下一场拍卖会：${L.nextAuction(st)} 周天后（开 ${L.AUCTION.len} 周天，三件竞价）</div>`;
  else body += `<div class="muted">${icon16('gavel', 1)} 拍卖会：金丹后开放，三件竞价。</div>`;
  const box = L.boxCap(st, 'w');
  body += `<div class="muted">当前：${L.GEAR_SLOTS.filter(s => L.gearOpen(st, s)).map(s => L.GEAR_N[s] + ' ' + (L.gearTier(st, s) ? L.gearTierName(s, L.gearTier(st, s)) : '空')).join(' · ')} · 心法 ${L.artSlots(st)[0] ? '《' + esc(L.art(L.artSlots(st)[0]).n) + '》' : '基础吐纳'} · 灵宠 ${p.pet ? L.PETS[p.pet.tier].n : '无'}<br>寻宝保底：连续 ${st.boxMiss || 0}/2 次没提升；本境界最高补到 ${L.WEAPONS[box].n} / ${L.ARTS[L.boxCap(st, 'a')].n}功法${L.gearPity(st) ? `（下一次保底补${L.GEAR_N[L.gearPity(st).s]}到${L.gearTierName(L.gearPity(st).s, L.gearPity(st).t)}）` : ''}${st.arts.firstBox ? '' : '；头一回寻宝必得《引气诀》'}</div>`;
  const s = sheet({ title: '坊市', sub: `灵石 ${fmt(st.stones)} · 灵草 ${fmt(st.herbs)} · 灵矿 ${fmt(st.ore || 0)} · 破境丹 ${st.pills}`, body });
  if (top) s.querySelector('.body').scrollTop = top;
  const back = () => showMarket({ keep: true });
  s.querySelectorAll('button[data-buy]').forEach(btn => btn.onclick = () => {
    const r = L.shelfBuy(st, +btn.dataset.buy);
    if (!r) return;
    SFX.coin();
    if (r.it) revealItem(r.it, () => showMarket({ keep: true }));
    else { floatText(100, 80, r.planText || (r.k === 'life' ? `寿元 +${r.add} 年` : r.k === 'ore' ? `灵矿 +${fmt(r.ore)}` : '破境丹 +1'), r.k === 'life' ? '#8ff5d0' : r.k === 'ore' ? '#9fd8ff' : '#ffe39a'); showMarket({ keep: true }); }
  });
  s.querySelectorAll('button[data-sell]').forEach(btn => btn.onclick = () => {
    const [k, f] = btn.dataset.sell.split(':');
    const r = L.sell(st, k, +f);
    if (!r) return;
    SFX.coin(); floatText(100, 80, `卖出${L.SELL[k].n} ${fmt(r.n)}：灵石 +${fmt(r.stones)}`, '#7fe0f0');
    showMarket({ noEv: true, keep: true });
  });
  s.querySelectorAll('button[data-bid]').forEach(btn => btn.onclick = () => {
    const [i, t] = btn.dataset.bid.split(':').map(Number);
    const r = L.auctionBid(st, i, t);
    if (!r) return;
    if (r.win) { SFX.win(); floatText(100, 70, `${L.AUCTION.tiers[t].n}拿下【${r.n}】`, '#ffe39a'); if (r.it) { revealItem(r.it, back); return; } if (r.planText) floatText(100, 84, r.planText, '#ffe39a'); }
    else { SFX.fail(); floatText(100, 70, r.comp ? `被${r.comp.n}压了一口` : '被人抢先一步', '#ff9a8a'); }
    showMarket({ keep: true });
  });
}
function revealItem(it, back) {
  const tierOf = it.kind === 'pet' ? it.tier : it.gear ? Math.min(6, it.tier - 1) : it.tier;
  const colors = ['#9aa0a6', '#e6e1d3', '#62d26f', '#4aa8ff', '#c27dff', '#ffcf3f', '#ff7a7a'];
  const col = it.kind === 'a' ? ART.qualityColor(it.tier) : it.gear ? (it.tier >= 7 ? '#c48bff' : ART.qualityColor(it.tier)) : colors[Math.max(0, Math.min(6, tierOf))];
  const img = it.kind === 'pet' ? petImg(it.tier, 44) : it.kind === 'a' ? artImg(it.art, 3) : it.gear ? gearImg(it.gear, 3) : `<img class="px" src="${iconURL.sword}" style="width:44px;height:44px" alt="">`;
  const src = { vault: '宗门宝库', auction: '拍卖', shop: '坊市', xianfu: '仙府秘藏' }[it.src];
  const s = sheet({
    title: it.kind === 'pet' ? '灵兽破壳' : it.kind === 'a' ? (it.frag && !it.fragDone ? '残篇' : src || '功法') : src || '寻宝', center: true, noClose: true,
    body: `<div class="cands" style="grid-template-columns:1fr;max-width:160px;margin:0 auto"><div class="cand hide"><div class="beam" style="background:${col}"></div>${img}<div class="cover">？</div></div></div>${itemLine(it)}`,
    foot: [{ t: it.pend ? '继续' : '收下', gold: true, fn: back || closeModal }],
  });
  setTimeout(() => { const c = s.querySelector('.cand'); if (!c) return; c.classList.remove('hide'); const cv = c.querySelector('.cover'); if (cv) cv.remove(); c.classList.add('reveal'); SFX.reveal(tierOf); if (tierOf >= 5) flash(0.4); }, 450);
}
