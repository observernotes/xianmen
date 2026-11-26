/* 废柴仙途 · 界面片段 loot：刷宝——归途翻牌（COMBAT_LOOT §5.5，示意图 04_loot.png）、出发页“这里掉什么”与心愿（§5.3，01_prep.png）、图鉴“掉落”页
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 panel-exp 后面）。CSS 前缀 .lt-（src/template.html 末尾）。
 * 数字与发放都在逻辑层（src/logic/loot.js 的 L.tripLoot / L.bossLoot / L.dropTable / L.setWish）：这里只演出——东西在翻牌前就已经到手，翻不翻都不丢。
 *   lootFlipHTML(cards) + lootFlipRun(root, cards, opt)：嵌进结算卡；showLootFlip(cards, done)：单独一张（首领、C1 的战斗流程用）。
 * 仪式：牌按价值从低到高扣着排开，最好的在最右；带星的牌背抖、四角闪光（不说几星）；点一张翻一张（0.25 秒），长按全翻；
 *       每翻一张一个音，音高按翻的顺序上行（SFX.flip）；★★ 起牌下升起品阶光柱；★★★ 先停 0.6 秒、全屏金闪、震一下，星一颗一颗钉上去。 */
const LT_ICON = { ore: 'ore', herb: 'herb', pill: 'pojing', treasure: 'treasure', rune: 'rune', plan: 'gscroll', mat: 'treasure' };
function lootIconCanvas(c) {
  if (c.kind === 'gear' && c.item && c.item.gear) return gearCanvas(c.item.gear);
  if (c.kind === 'art' || c.kind === 'frag') return ART.item('a', c.tier);
  if (c.kind === 'core') return ART.core ? ART.core(c.el) : ART.icon('treasure');
  return ART.icon(LT_ICON[c.kind] || 'stone') || ART.icon('stone');
}
// 牌面：品阶边框 + 物品图 (5, 5) + 星（前 nStar 颗亮）；牌背：ART.lootCard('back', 0, 帧)
function lootFront(c, nStar) {
  const cv = document.createElement('canvas'); cv.width = 26; cv.height = 34;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  g.drawImage(ART.lootCard('front', Math.max(1, Math.min(7, c.tier || 1))), 0, 0);
  const ic = lootIconCanvas(c); if (ic) g.drawImage(ic, 5, 5, 16, 16);
  const ns = c.stars || 0;
  for (let i = 0; i < 3 && i < ns; i++) g.drawImage(ART.star(i < (nStar === undefined ? ns : nStar)), 3 + i * 7, 25);
  if (!ns && c.n > 1) { g.fillStyle = '#2c2238'; g.font = '7px monospace'; g.fillText('×' + c.n, 13 - String(c.n).length * 2, 31); }
  if (c.kind === 'core' || (c.kind === 'gear' && c.el)) { const b = ART.elemBadge && ART.elemBadge(c.el); if (b) g.drawImage(b, 15, 2, 8, 8); }
  return cv;
}
const lootBack = f => urlOf(ART.lootCard('back', 0, f & 1), 'ltback|' + (f & 1));
// 牌的大小：一行放得下就 3 倍，否则 2 倍（按设备像素取整）
function lootZ(n) {
  const avail = Math.min(window.innerWidth, 412) - 48;
  const z = Math.max(2, Math.min(3, Math.floor((avail - 6 * (n - 1)) / (26 * n))));
  return pxFit(26, 26 * z) / 26;
}
let ltSeq = 0;
function lootFlipHTML(cards, opt) {
  opt = opt || {};
  if (!cards || !cards.length) return '';
  const z = lootZ(cards.length), W = Math.round(26 * z), H = Math.round(34 * z), id = 'lt' + (++ltSeq);
  const cells = cards.map((c, i) => `<div class="lt-c${c.stars ? ' lt-hot' : ''}" data-li="${i}" style="width:${W}px;height:${H}px" aria-label="翻牌">
      <canvas class="px lt-beam" width="24" height="48" style="width:${Math.round(24 * z)}px;height:${Math.round(48 * z)}px;left:${Math.round(1 * z)}px;bottom:${Math.round(2 * z)}px"></canvas>
      <img class="px lt-face" src="${lootBack(0)}" style="width:${W}px;height:${H}px" alt=""></div>`).join('');
  return `<div class="lt-flip" id="${id}"><div class="lt-cards" style="min-height:${H + Math.round(14 * z)}px">${cells}</div>
    <div class="lt-hint">${cards.length > 1 ? `点牌翻开 · 还有 <span class="num">${cards.length}</span> 张` : '点牌翻开'}${cards.some(c => c.kind === 'gear' && c.item && c.item.equip) ? ' · 兵器已戴上' : ''}</div><div class="lt-after"></div></div>`;
}
// 翻开一张之后，牌下面那一行：比身上强的法宝【换上】【收】，不如身上的【熔】为主；新功法一行；心愿达成一条红框
function lootAfterRow(c) {
  if (c.kind === 'gear' && c.item && c.item.gear) {
    const it = c.item, x = it.gear, B = L.gearBase(x.id);
    const nm = `<div class="nm" style="color:${pnTierInk(x.t)}">${esc(B.n)}${lootStarsHTML(x.star)}${L.gearEl(x) && x.slot === 'w' ? elBadgeHTML(L.gearEl(x)) : ''}</div>`;
    const cell = `<div class="cell">${qcellHTML(x.t, gearImg(x, 2), 2)}</div>`;
    const keys = x.aff.slice(0, 2).map(a => L.AFFIX[a].n).concat(x.gold ? [`<span class="lt-gold-t">${L.GOLD_AFFIX[x.gold].n}</span>`] : []).join(' · ');
    if (it.pend && L.gearPend(st, x.u)) {
      const D = L.gearDelta(st, x), dp = D.b.p - D.a.p;
      const num = Math.abs(dp) >= 1 ? `战力 <span class="${dp >= 0 ? 'kup' : 'kdn'}">${dp >= 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(dp))}</span>` : '';
      return `<div class="kslot${D.better ? ' hot' : ''}" data-lrow="${x.u}">${cell}<div class="mid">${nm}<small>${num}${num && keys ? ' · ' : ''}${keys}</small></div>
        ${D.better ? `<button class="kb red" data-lteq="${x.u}">换上</button><button class="kb alt" data-ltkeep="${x.u}">收</button>` : `<button class="kb" data-ltsm="${x.u}">熔<br><small>矿+${fmt(D.smelt)}</small></button><button class="kb alt" data-ltkeep="${x.u}">收</button>`}</div>`;
    }
    const tail = it.equip || st.gear[x.slot] === x ? '<span class="chip ok">已戴上</span>' : it.smelt !== undefined ? `<span class="chip">熔 +${fmt(it.smelt)}</span>` : it.hold ? '<span class="chip">收着</span>' : '';
    return `<div class="kslot">${cell}<div class="mid">${nm}<small>${keys || esc(gearKey(x))}</small></div>${tail}</div>`;
  }
  if ((c.kind === 'art' || c.kind === 'frag') && c.item) {
    const it = c.item, A = L.art(it.art);
    const s = it.frag && !it.fragDone ? `残篇 ${it.frag}/3` : it.dup ? `已会 · 熟练 +${it.mastery}` : it.equip ? '已装上' : '新功法 · 装备里换';
    return `<div class="kslot"><div class="cell">${qcellHTML(A.t, artImg(it.art, 2), 2)}</div><div class="mid"><div class="nm" style="color:${pnTierInk(A.t)}">《${esc(A.n)}》</div><small>${esc(s)}</small></div></div>`;
  }
  if (c.kind === 'plan' && c.item) return `<div class="krow"><span class="k">${scrollImg()}</span><span class="v nm">${esc(cut(c.item.text || c.name, 18))}</span></div>`;
  return '';
}
const lootStarsHTML = n => (n > 0 ? `<span class="lt-stars">${Array.from({ length: 3 }, (x, i) => `<img class="px" src="${urlOf(ART.star(i < n), 'star|' + (i < n ? 1 : 0))}" style="width:${pxFit(7, 14)}px;height:${pxFit(7, 14)}px" alt="">`).join('')}</span>` : '');
const elBadgeHTML = el => (ART.elemBadge && el ? `<img class="px lt-elb" src="${urlOf(ART.elemBadge(el), 'elb|' + el)}" style="width:${pxFit(10, 20)}px;height:${pxFit(10, 20)}px" alt="${L.ELEM[el] || ''}">` : '');
// 跑起来：opt = { onAll（全翻完）, onWish（心愿那张翻开时：“再钉一件 ▸”） }
function lootFlipRun(root, cards, opt) {
  opt = opt || {};
  const bxs = root ? root.querySelectorAll('.lt-flip') : [], box = bxs[bxs.length - 1];
  if (!box || !cards || !cards.length) return;
  const els = [...box.querySelectorAll('.lt-c')], hint = box.querySelector('.lt-hint'), after = box.querySelector('.lt-after');
  const open = new Array(cards.length).fill(false);
  let nOpen = 0, busy = 0, f = 0;
  // 带星的牌背：两帧每 250 毫秒换一次 + 左右抖 1 像素（CSS .lt-hot）；第一次看到时轻轻响一下
  const shiver = setInterval(() => {
    if (!box.isConnected) { clearInterval(shiver); return; }
    f++;
    els.forEach((el, i) => { if (!open[i] && cards[i].stars) el.querySelector('.lt-face').src = lootBack(f); });
  }, 250);
  if (cards.some(c => c.stars)) setTimeout(() => { if (box.isConnected) SFX.shiver(); }, 350);
  const beam = (el, c) => {
    const cv = el.querySelector('.lt-beam'); if (!cv || !ART.dropBeam) return;
    const g = cv.getContext('2d'), n = ART.beamFrames || 4, tier = Math.max(1, Math.min(7, c.tier || 1));
    el.classList.add('lt-beamon');
    let fr = 0; const step = () => { if (!cv.isConnected) return; g.clearRect(0, 0, 24, 48); g.drawImage(ART.dropBeam(tier, fr % n), 0, 0); fr++; setTimeout(step, 110); };
    step(); SFX.beam();
  };
  const goldFlash = () => {
    const d = document.createElement('div'); d.className = 'lt-goldfx'; document.body.appendChild(d);
    setTimeout(() => d.remove(), 700);
    const sh = root.closest('.sheet') || root; sh.classList.remove('lt-quake'); void sh.offsetWidth; sh.classList.add('lt-quake');
  };
  const rowFor = i => {
    const c = cards[i], h = lootAfterRow(c);
    if (h) after.insertAdjacentHTML('beforeend', h);
    if (c.wish) {
      after.insertAdjacentHTML('beforeend', `<div class="lt-wish">${artIcon('wish', 20)}<span class="grow"><b>心愿达成！</b></span>${opt.onWish ? '<button class="lt-wbtn" data-ltwish="1">再钉一件 ▸</button>' : ''}</div>`);
      const b = after.querySelector('[data-ltwish]'); if (b) b.onclick = () => { SFX.tap(); opt.onWish(); };
    }
    bindLootRows(after);
  };
  const reveal = (i, quick) => new Promise(res => {
    if (open[i]) { res(); return; }
    open[i] = true; busy++;
    const el = els[i], c = cards[i], face = el.querySelector('.lt-face'), seq = nOpen++;
    el.classList.remove('lt-hot');
    const slow = c.stars >= 3 && !quick ? 600 : 0;
    if (slow) { el.classList.add('lt-charge'); SFX.roll(); }
    setTimeout(() => {
      el.classList.remove('lt-charge'); el.classList.add('lt-turn');
      setTimeout(() => {
        face.src = lootFront(c, c.stars >= 3 ? 0 : undefined).toDataURL();
        el.classList.remove('lt-turn'); el.classList.add('lt-open');
        if (c.stars >= 3) { SFX.jackpot(); goldFlash(); } else SFX.flip(seq, c.stars);
        if (c.stars >= 2) beam(el, c);
        const done = () => { busy--; rowFor(i); left(); res(); };
        if (c.stars >= 3) { let s = 0; const nail = () => { s++; face.src = lootFront(c, s).toDataURL(); SFX.star(s - 1); if (s < c.stars) setTimeout(nail, 200); else done(); }; setTimeout(nail, 260); }
        else done();
      }, 125);
    }, slow);
  });
  const left = () => {
    const n = open.filter(x => !x).length;
    if (hint) hint.innerHTML = n ? `点牌翻开 · 还有 <span class="num">${n}</span> 张` : '全部翻开';   // 翻开以后“已戴上”写在牌下那一行
    if (!n && busy === 0 && opt.onAll) { const f0 = opt.onAll; opt.onAll = null; f0(); }
  };
  const all = async () => { for (let i = 0; i < cards.length; i++) if (!open[i]) { await reveal(i, true); await new Promise(r => setTimeout(r, 160)); } };
  let press = null, longed = false;
  els.forEach((el, i) => {
    el.onpointerdown = () => { longed = false; clearTimeout(press); press = setTimeout(() => { longed = true; all(); }, 500); };
    el.onpointerup = el.onpointerleave = () => clearTimeout(press);
    el.onclick = e => { e.stopPropagation(); if (longed) { longed = false; return; } reveal(i); };
  });
  box.flipAll = all;
  return { all, open };
}
// 牌下面那几行的按钮：换上 / 熔 / 收（收 = 留在【装备】的“新到”里，不熔）
function bindLootRows(root) {
  const done = (u, msg) => { const r = root.querySelector(`[data-lrow="${u}"]`); if (r) r.outerHTML = `<div class="krow"><span class="v kup">${msg}</span></div>`; updateHUD(); };
  root.querySelectorAll('[data-lteq]').forEach(b => b.onclick = () => { const u = +b.dataset.lteq, r = L.gearDecide(st, u, 'equip'); if (!r) return; SFX.coin(); done(u, `已换上【${esc(L.gearBase(r.x.id).n)}】· 战力 ${fmt(L.power(st))}`); });
  root.querySelectorAll('[data-ltsm]').forEach(b => b.onclick = () => { const u = +b.dataset.ltsm, r = L.gearDecide(st, u, 'smelt'); if (!r) return; SFX.coin(); done(u, `熔成灵矿 +${fmt(r.smelt)}${r.x.star ? ` · 器纹石 +${r.x.star}` : ''}`); });
  root.querySelectorAll('[data-ltkeep]').forEach(b => b.onclick = () => { SFX.tap(); done(+b.dataset.ltkeep, '收进【装备】的“新到”'); });
}
// 单独一张翻牌（首领战之后；C1 的战斗流程在评价章后调它，done() 之后接“你变强了”）
function showLootFlip(cards, done, opt) {
  opt = opt || {};
  if (!cards || !cards.length) { if (done) done(); return; }
  const s = sheet({ title: opt.title || '翻牌', center: true, noClose: !!opt.noClose, body: (opt.head || '') + lootFlipHTML(cards),
    foot: [{ t: opt.btn || '收下', gold: true, fn: () => { closeModal(); if (done) done(); } }] });
  lootFlipRun(s, cards, { onAll: opt.onAll });
  return s;
}

// ---------- 出发页：这里掉什么（一格一样，没掉过的是黑剪影）、心愿 ----------
function dropCellImg(c, z) {
  let cv;
  if (c.kind === 'gear') { const B = L.gearBase(c.base); cv = B.boss !== undefined ? ART.item('boss', B.boss) : B.slot === 'o' ? ART.item('o', B.t, B.kind) : ART.item(B.slot, B.t); }
  else if (c.kind === 'art') cv = ART.item('a', c.tier);
  else cv = ART.core ? ART.core(c.el) : ART.icon('treasure');
  const s = pxFit(16, 16 * z);
  return `<img class="px" src="${urlOf(cv, 'dc|' + (c.base || c.art || c.el || c.tier) + '|' + c.kind)}" style="width:${s}px;height:${s}px" alt="">`;
}
let ltSel = null;   // 出发页上点开的那一格 { k, d, i }
function lootPrepHTML(k, d) {
  if (!L.dropTable || L.firstTrip(st)) return '';
  const row = L.dropTable(st, k, d), seen = row.filter(c => c.seen).length, wi = L.wishInfo(st), here = wi && wi.k === k && wi.d === d;
  const wOpen = L.wishOpen(st) && UI.isOpen('wish');
  const cells = row.map(c => `<button class="lt-dc${c.seen ? '' : ' un'}${c.wish ? ' wish' : ''}${ltSel && ltSel.k === k && ltSel.d === d && ltSel.i === c.i ? ' sel' : ''}" data-ltd="${c.i}" aria-label="${esc(c.seen ? c.n : '没见过')}">${dropCellImg(c, 2)}${c.wish ? '<i>心愿</i>' : ''}</button>`).join('');
  let line = '';
  const sel = ltSel && ltSel.k === k && ltSel.d === d ? row[ltSel.i] : null;
  if (sel) {
    const pin = wOpen && !sel.wish ? `<button class="kb alt" data-ltpin="${sel.i}">钉</button>` : sel.wish ? '<span class="chip ok">已钉</span>' : '';
    line = `<div class="kslot lt-pop"><div class="mid"><div class="nm" style="color:${pnTierInk(sel.tier)}">${sel.seen ? esc(sel.n) : '？？？'}</div><small>${esc(sel.d)} · ${esc(sel.who)}${sel.every > 1 ? ` · 约 ${sel.every} 趟` : ''}</small></div>${pin}</div>`;
  } else if (here) line = `<div class="lt-wl">${artIcon('wish', 16)}<span>${esc(wi.c.seen ? wi.c.n : '？？？')}：掉率 ×2，${wi.max} 趟内必出</span></div>`;
  return `<div class="ksec"><span>这里掉什么 <span class="num">${seen} / ${row.length}</span></span>${here ? `<span class="red">心愿 <span class="num">${wi.n} / ${wi.max}</span> 趟</span>` : wi ? `<span>心愿在${esc(L.REGIONS[wi.k].n)}</span>` : ''}</div>
    <div class="kgrid lt-drops" style="grid-template-columns:repeat(${row.length},52px)">${cells}</div>${line}`;
}
function bindLootPrep(root, k, d, redraw) {
  root.querySelectorAll('[data-ltd]').forEach(b => b.onclick = () => { SFX.tap(); const i = +b.dataset.ltd; ltSel = ltSel && ltSel.k === k && ltSel.d === d && ltSel.i === i ? null : { k, d, i }; redraw(); });
  root.querySelectorAll('[data-ltpin]').forEach(b => b.onclick = () => { if (L.setWish(st, k, d, +b.dataset.ltpin)) { SFX.coin(); ltSel = null; redraw(); } });
}

// ---------- 图鉴 · 掉落：按地点列，每格亮 / 黑；角上“距天命 N 件” ----------
function lootCodexHTML() {
  const rows = [];
  for (let k = 0; k < L.REGIONS.length; k++) {
    if (!L.regionOpen(st, k) && !Object.keys((st.meta && st.meta.drop) || {}).some(x => x.startsWith(k + '_'))) continue;
    for (let d = 0; d < 3; d++) {
      const row = L.dropTable(st, k, d);
      rows.push(`<div class="lt-cxrow"><span class="nm">${esc(L.REGIONS[k].n)}·${L.DEPTHS[d]}</span><span class="lt-cxcells">${row.map(c => `<span class="lt-dc sm${c.seen ? '' : ' un'}${c.wish ? ' wish' : ''}" title="${esc(c.seen ? c.n : '？？？')}">${dropCellImg(c, 1.5)}</span>`).join('')}</span></div>`);
    }
  }
  const p = L.starPity(st);
  return `<div class="muted">距天命 <b class="num">${p.tm}</b> 件（连续 ${L.STAR.pityTm} 件没出 ★★★，下一件必出）</div>${rows.join('')}`;
}
// 测试与机器人用（window.__xm 在 boot.js 里，这里另挂一个）
window.__xm_loot = { showLootFlip, lootCodexHTML, showGearDetail: (s, t) => showGearDetail(s, false, t) };
