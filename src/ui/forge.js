/* 废柴仙途 · 界面片段 forge：法宝详情 = 炼器台（docs/COMBAT_LOOT.md §6，示意图 05_forge.png）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 panel-gear 后面：用它的 gearImg、doPlus、bindPlusButton、forgeFx）。
 * 顶上一排三格（兵器 / 法衣 / 饰品，点了换件）；下面一张炼器台（ART.forgeBench）+ 三页：强化（含开锋）/ 淬灵 / 洗练，一页一个主按钮；没开的页灰着写几时开。
 * 数字一律取自逻辑层：L.gearPlusInfo、L.gearInfuseWhy / L.gearInfuseCost、L.gearReforgeWhy / L.gearRerollLeft、L.gearEdgeDue / L.EDGE。 */
let forgeTab = 'plus', forgeEl = '', forgeAff = 0;
const FORGE_TABS = [['plus', '强化'], ['infuse', '淬灵'], ['reroll', '洗练']];
function forgeBenchHTML(x, frame) {
  const c = ART.forgeBench ? ART.forgeBench(frame | 0) : null; if (!c) return '';
  const w = pxFit(64, 128), h = Math.round(w * 44 / 64);
  return `<div class="lt-bench"><img class="px" id="ltBench" src="${urlOf(c, 'bench|' + (frame | 0))}" style="width:${w}px;height:${h}px" alt="">
    <span class="lt-bl">${esc(L.gearTierName(x.slot, x.t))} · ${L.GEAR_N[x.slot]}</span><span class="lt-br num">${esc(gearKey(x))}</span></div>`;
}
// 一页的内容：返回 { html, main（主按钮 HTML） }
function forgePagePlus(x, slot) {
  if (!L.gearOpen(st, 'plus')) return { html: `<div class="muted">${esc(L.gearOpenWhy(st, 'plus'))}：不如身上的法宝熔成灵矿，再来强化。</div>`, main: null };
  const info = L.gearPlusInfo(st, slot);
  if (info.max) return { html: '<div class="goldt">已强化到 +9</div>' + forgeEdgeHTML(x), main: null };
  const pr = fmt(info.a.p) !== fmt(info.b.p) ? `战力 ${fmt(info.a.p)} → <b class="kup">${fmt(info.b.p)}</b>` : (gearDeltaRows(info.a, info.b, info.k)[0] || '').replace(/<[^>]+>/g, ' ');
  const need = info.cost.ore, have = st.ore || 0;
  const html = `<div class="krow"><span class="k num">+${x.plus} → +${x.plus + 1}</span><span class="v num">${pr}</span><span class="s">成功 ${L.pct(info.rate)}</span></div>
    <div class="krow"><span class="k">灵矿</span><div class="kpbar"><i class="dl" style="width:${Math.min(100, have / need * 100).toFixed(1)}%"></i></div><span class="s num">${fmt(have)} / ${fmt(need)}</span></div>${forgeEdgeHTML(x)}`;
  const main = { t: info.why ? esc(info.why) : `强化 · 矿 ${fmt(need)}`, dis: !!info.why, attr: { plus: slot } };
  return { html, main };
}
// 开锋：+3 / +6 / +9 时三选一（选了不能改）；没到时一行预告
function forgeEdgeHTML(x) {
  if (x.slot !== 'w') return '';
  const ed = x.edge || [], ic = k => (ART.skillIcon ? `<img class="px" src="${urlOf(ART.skillIcon(k === 'ling' ? '' : L.gearEl(x), k === 'feng' ? 'zhan' : k === 'ling' ? 'xin' : 'qi'), 'edic|' + k + L.gearEl(x))}" style="width:${pxFit(16, 32)}px;height:${pxFit(16, 32)}px" alt="">` : '');
  const got = ed.length ? `<span class="muted">已开锋：${ed.map(k => L.EDGE[k].n).join(' · ')}</span>` : '';
  if (L.gearEdgeDue(x)) return `<div class="lt-edge on"><div class="muted">开锋 · 三选一（选了不能改）</div><div class="lt-edgeb">${L.gearEdgeOpts(x).map(k => `<button class="kb alt" data-edge="${k}">${ic(k)}<span><b>${L.EDGE[k].n}</b><br><small>${L.EDGE[k].d}</small></span></button>`).join('')}</div></div>`;
  if (ed.length >= L.EDGE_AT.length) return got ? `<div class="lt-edge">${got}</div>` : '';
  return `<div class="lt-edge"><span>到 +${L.EDGE_AT[ed.length]} 开锋</span>${L.gearEdgeOpts(x).map(ic).join('')}<span class="muted">三选一</span></div>${got ? `<div>${got}</div>` : ''}`;
}
function forgePageInfuse(x) {
  if (x.slot !== 'w') return { html: '<div class="muted">只有兵器能淬灵（法衣淬灵筑基后开）。</div>', main: null };
  if (!L.gearOpen(st, 'infuse') || !UI.isOpen('infuse')) return { html: `<div class="muted">${esc(L.gearOpenWhy(st, 'infuse'))}：精英掉它那一系的灵核。</div>`, main: null };
  const cur = L.gearEl(x), c = L.gearInfuseCost(x);
  if (!forgeEl || forgeEl === cur) forgeEl = L.CORE_EL.filter(e => e !== cur).sort((a, b) => L.coreN(st, b) - L.coreN(st, a))[0];
  const cells = L.CORE_EL.map(e => `<button class="lt-ic${e === forgeEl ? ' sel' : ''}${e === cur ? ' cur' : ''}" data-infel="${e}" ${e === cur ? 'disabled' : ''}>${ART.core ? `<img class="px" src="${urlOf(ART.core(e), 'core|' + e)}" style="width:${pxFit(16, 28)}px;height:${pxFit(16, 28)}px" alt="">` : ''}<b class="num">${L.coreN(st, e)}</b></button>`).join('');
  const why = L.gearInfuseWhy(st, x, forgeEl);
  const html = `<div class="krow"><span class="k">现在</span><span class="v">${cur ? `${elBadgeHTML(cur)} ${L.ELEM[cur]}系` : '无属性'}</span><span class="s">灵核 ${c.core} · 矿 ${fmt(c.ore)}</span></div>
    <div class="kgrid lt-ics" style="grid-template-columns:repeat(5,minmax(0,1fr))">${cells}</div>
    <div class="muted">淬成${L.ELEM[forgeEl]}：器技${L.ELEM[forgeEl]}系，克${L.ELEM[L.ELEM_KEYS.find(y => L.elKe(forgeEl, y))] || ''}</div>`;
  const main = { t: why ? esc(why) : `淬成 ${L.ELEM[forgeEl]}`, dis: !!why, attr: { infuse: forgeEl } };
  return { html, main };
}
function forgePageReroll(x, slot) {
  const B = L.gearBase(x.id);
  if (!L.gearOpen(st, 'reroll')) return { html: `<div class="muted">${esc(L.gearOpenWhy(st, 'reroll'))}：花器纹石换一条词条。</div>`, main: null };
  if (B.fixed) return { html: '<div class="muted">固定词条，不能洗练。</div>', main: null };
  const rf = st.gear.rf;
  if (rf && rf.u === x.u) {
    return { html: `<div class="muted">留哪条？${rf.pity ? '<span class="goldt">（保底）</span>' : ''}</div><div class="gbtns"><button class="btn alt" data-rfk="0">留旧 · ${L.AFFIX[rf.old].n}</button><button class="btn gold" data-rfk="1">换新 · ${L.AFFIX[rf.neu].n}</button></div><div class="muted">新：${esc(L.AFFIX[rf.neu].d)}</div>`, main: null };
  }
  if (forgeAff >= x.aff.length) forgeAff = 0;
  const rows = x.aff.map((a, i) => `<button class="lt-ar${i === forgeAff ? ' sel' : ''}" data-faff="${i}"><b>${L.AFFIX[a].n}</b><span>${esc(L.AFFIX[a].d)}</span></button>`).join('')
    + (x.gold ? `<div class="lt-ar gold"><b>${L.GOLD_AFFIX[x.gold].n}</b><span>${esc(L.GOLD_AFFIX[x.gold].d)}</span></div>` : '');
  const why = L.gearReforgeWhy(st, slot, forgeAff);
  const html = `<div class="kgrid lt-ars" style="grid-template-columns:1fr">${rows}</div><div class="muted">器纹石 <span class="num">${L.runeN(st)}</span> · 再洗 <span class="num">${L.gearRerollLeft(x)}</span> 次必出新战斗词条</div>`;
  const main = { t: why ? esc(why) : '洗这条 · 器纹石 1', dis: !!why, attr: { rf: forgeAff } };
  return { html, main };
}
// 法宝详情（装备页点图标格进来）：sel 槽、still 不重放弹出动画、tab 页
function showGearDetail(sel, still, tab) {
  if (sel) gearSel = sel;
  if (tab) forgeTab = tab;
  const g = st.gear, open = L.GEAR_SLOTS.filter(s => L.gearOpen(st, s));
  if (!open.includes(gearSel)) gearSel = 'w';
  const slots = open.map(s => {
    const x = g[s], cls = 'aslot gslot lt-gslot' + (s === gearSel ? ' sel' : '');
    const inner = x ? `${qcellHTML(x.t, gearImg(x, 1.5), 1.5)}<span class="nm" style="color:${pnTierInk(x.t)}">${esc(L.gearBase(x.id).n)}${plusTag(x.plus)}</span>` : `<span class="k">${L.GEAR_N[s]}</span><span class="aempty">空</span>`;
    return `<div class="${cls}" data-gslot="${s}">${inner}</div>`;
  }).join('');
  const x = g[gearSel];
  let det = '', main = null;
  if (x) {
    const B = L.gearBase(x.id);
    const tabs = FORGE_TABS.map(([k, n]) => { const lk = k === 'reroll' && !L.gearOpen(st, 'reroll'); return `<button class="${forgeTab === k ? 'on' : ''}${lk ? ' lt-lk' : ''}" data-ftab="${k}">${n}${lk ? `<small> · ${esc(L.gearOpenWhy(st, 'reroll').replace('开放', '开'))}</small>` : ''}</button>`; }).join('');
    const pg = forgeTab === 'infuse' ? forgePageInfuse(x) : forgeTab === 'reroll' ? forgePageReroll(x, gearSel) : forgePagePlus(x, gearSel);
    main = pg.main;
    const sk = L.gearSkill ? L.gearSkill(x) : null;
    const skill = sk && sk.n ? `<div class="kslot"><div class="cell">${ART.skillIcon ? `<img class="px" src="${urlOf(ART.skillIcon(sk.el || L.gearEl(x), 'qi'), 'ski|' + (sk.el || L.gearEl(x)) + '|qi')}" style="width:${pxFit(16, 40)}px;height:${pxFit(16, 40)}px" alt="">` : ''}</div><div class="mid"><div class="nm">器技 · ${esc(sk.n)}</div><small>${esc(sk.d || '')}</small></div></div>` : '';
    const affs = forgeTab === 'reroll' ? '' : x.aff.filter(a => L.AFFIX[a]).map(a => `<div class="krow"><span class="k">${L.AFFIX[a].n}</span><span class="v">${esc(L.AFFIX[a].d)}</span></div>`).join('') + (x.gold ? `<div class="krow"><span class="k lt-gold-t">${L.GOLD_AFFIX[x.gold].n}</span><span class="v">${esc(L.GOLD_AFFIX[x.gold].d)}</span></div>` : '');
    det = `<div class="gdet pn-gdet lt-det" style="border-left-color:${gTierBorder(x.t)}">
      <div class="line">${pnName(esc(B.n), x.t)}${plusTag(x.plus)}${lootStarsHTML(x.star || 0)}${x.slot === 'w' && L.gearEl(x) ? elBadgeHTML(L.gearEl(x)) : ''}</div>
      ${forgeBenchHTML(x, 0)}<div class="ktabs lt-ftabs">${tabs}</div>
      ${gearMsg ? `<div class="quote">${gearMsg}</div>` : ''}${pg.html}
      ${skill || affs ? `<div class="ksec"><span>它带的</span></div>${skill}${affs}` : ''}</div>`;
  } else det = emptyNoteHTML('vault', `${L.GEAR_N[gearSel]}空着：历练、寻宝、首领都会掉。`);
  const pendL = g.pend.filter(y => !y.hold), held = L.gearHeld(st);
  const pend = (pendL.length ? `<div class="seal">${pendL.length} 件新法宝待定，离开就熔掉</div>` + pendL.map(gearCmpHTML).join('') : '')
    + (held.length ? `<div class="muted">收着：${held.map(y => `【${esc(L.gearBase(y.id).n)}】`).join('、')}，槽一开自动戴上</div>` : '');
  const nPlan = Object.keys(g.plans).length, nMat = Object.keys(g.mats).reduce((n, k) => n + (g.mats[k] > 0 ? g.mats[k] : 0), 0);
  const forge = L.gearOpen(st, 'forge') || nPlan || nMat ? `<div class="row pn-row">${scrollImg()}<span class="grow">器炉 · 器方 ${nPlan}/${L.PLANS.length}${nMat ? ` · 首领材料 ${nMat}` : ''}</span><button class="btn sm alt eq" id="btnForge">器炉</button></div>` : '';
  const lock = x ? `<details class="more pn-more"><summary>锁定 · 强化、灵核、器纹石怎么来</summary>
      <div class="row"><span class="grow muted fxs">${g.lock[gearSel] ? `已锁定：低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼、不弹卡` : `锁定后，低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼`}</span><button class="btn sm alt eq" data-glock="${gearSel}">${g.lock[gearSel] ? '解锁' : '锁定'}</button></div>
      <div class="muted">强化：每级主属性的超出部分 +${Math.round(L.PLUS.step * 100)}%，成功率 100%→40%，失败不掉级、下次 +10%，换装继承一半；+3 / +6 / +9 开锋。灵矿：历练、熔炼、坊市、首领。<br>淬灵：${L.INFUSE.n} 枚同系灵核 + 灵矿 ${L.INFUSE.ore}×阶，兵器改五行。灵核：精英、翻牌。<br>洗练：器纹石 1 枚换一条词条，二选一；熔带星的法宝按星数给器纹石，首领给 1 枚。</div></details>` : '';
  const body = meTabs('gear') + `<div class="gres pn-res">${oreImg()} 灵矿 <b class="num">${fmt(st.ore || 0)}</b>${L.runeN(st) ? ` · ${artIcon('rune', 16)} <b class="num">${L.runeN(st)}</b>` : ''}</div>
    <div class="aslots gslots pn-gslots lt-gslots" style="grid-template-columns:repeat(${open.length},minmax(0,1fr))">${slots}</div>${det}${pend}${lock}${forge}`;
  // 这一页唯一的主按钮放在底栏（金）：强化 / 淬成 X / 洗这条
  const foot = [{ t: '回装备', alt: true, fn: () => showGear() }];
  if (main) foot.push({ t: main.t, gold: !main.dis, disabled: main.dis, fn: () => {} });
  const s = sheet({ title: shellTitle('gear'), body, still, foot });
  if (main) { const fb = s.querySelector('.foot [data-fi="1"]'); if (fb) { for (const k in main.attr) fb.dataset[k] = main.attr[k]; fb.classList.add('lt-main'); } }
  bindMeTabs(s);
  s.querySelectorAll('[data-gslot]').forEach(b => b.onclick = () => { SFX.tap(); gearMsg = ''; showGearDetail(b.dataset.gslot, true); });
  s.querySelectorAll('[data-ftab]').forEach(b => b.onclick = () => { SFX.tap(); gearMsg = ''; showGearDetail(gearSel, true, b.dataset.ftab); });
  s.querySelectorAll('[data-plus]').forEach(b => bindPlusButton(b));
  s.querySelectorAll('[data-edge]').forEach(b => b.onclick = () => { const r = L.gearEdge(st, gearSel, b.dataset.edge); if (r) { SFX.forgeOk(7); gearMsg = `<span class="jadet">开锋 · ${L.EDGE[b.dataset.edge].n}：${L.EDGE[b.dataset.edge].d}</span>`; showGearDetail(gearSel, true); benchHit('ok'); } });
  s.querySelectorAll('[data-infel]').forEach(b => b.onclick = () => { SFX.tap(); forgeEl = b.dataset.infel; showGearDetail(gearSel, true); });
  s.querySelectorAll('[data-infuse]').forEach(b => b.onclick = () => { const r = L.gearInfuse(st, st.gear[gearSel], b.dataset.infuse); if (r) { SFX.infuse(); flash(0.3); gearMsg = `<span class="jadet">淬灵成功：【${esc(L.gearBase(r.x.id).n)}】成了${L.ELEM[r.el]}系</span>`; forgeEl = ''; showGearDetail(gearSel, true); benchHit('ok'); updateHUD(); } });
  s.querySelectorAll('[data-faff]').forEach(b => b.onclick = () => { SFX.tap(); forgeAff = +b.dataset.faff; showGearDetail(gearSel, true); });
  s.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { const r = L.gearReforge(st, gearSel, +b.dataset.rf); if (r) { SFX.reforge(); if (r.pity) SFX.reveal(5); gearMsg = ''; showGearDetail(gearSel, true); } });
  s.querySelectorAll('[data-rfk]').forEach(b => b.onclick = () => { const r = L.gearReforgeKeep(st, b.dataset.rfk === '1'); if (r) { SFX.coin(); gearMsg = `洗练：保留「${L.AFFIX[r.keep].n}」`; showGearDetail(gearSel, true); } });
  const lk = s.querySelector('[data-glock]'); if (lk) lk.onclick = () => { SFX.tap(); L.gearLock(st, lk.dataset.glock, !st.gear.lock[lk.dataset.glock]); showGearDetail(gearSel, true); };
  const fb = s.querySelector('#btnForge'); if (fb) fb.onclick = () => { SFX.tap(); showForge(); };
}
// 炼器台落锤：第 1 帧 300 毫秒
function benchHit() {
  const im = document.querySelector('#ltBench'); if (!im || !ART.forgeBench) return;
  im.src = urlOf(ART.forgeBench(1), 'bench|1');
  setTimeout(() => { if (im.isConnected) im.src = urlOf(ART.forgeBench(0), 'bench|0'); }, 300);
}
