/* 废柴仙途 · 界面片段 panel-arts：功法页（【人物】→ 功法）、五行标记、功法图标、掉落卡里的【换上】、共鸣揭晓
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * SYSTEMS §2：三个大槽 + 下方已有功法（按“换上后修炼 / 战力变化”排序，第一项标“荐”）。点槽 → 点功法，两下完成。
 * 数字一律取自逻辑层：L.artList（排序与变化量）、L.artXMult / L.artZMult（倍率）、L.artProg（熟练）、L.expElem / L.duelElem（克制）。 */
// ---------- 小部件 ----------
const EL_CLS = { jin: 'el-jin', mu: 'el-mu', shui: 'el-shui', huo: 'el-huo', tu: 'el-tu' };
function elChip(el, unknown) { return unknown ? '<span class="el el-unk">？</span>' : `<span class="el ${EL_CLS[el] || 'el-none'}">${L.elName(el)}</span>`; }
// 像素图按整数个设备像素放大（DESIGN §5.1）：16 逻辑像素 × round(dpr × k) / dpr
function pxs(n, k) { const d = window.devicePixelRatio || 1; return n * Math.max(1, Math.round(d * k)) / d; }
function artImg(id, k) { const A = L.art(id), c = ART.item('a', A.t), s = pxs(16, k || 2); return `<img class="px" src="${urlOf(c, 'art|' + A.t)}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
function tierTag(t) { return `<span class="tag" style="background:${ART.qualityColor(t)}">${L.artTierName(t)}</span>`; }
// 一门功法“现在给什么”：心法修炼 ×、战技战力 ×、秘术的特效
function artMain(id) {
  const A = L.art(id), mm = L.MAST.mult[L.artLv(st, id)];
  if (A.k === 'x') return `修炼 ×${dec2(1 + (L.ARTS[A.t].m - 1) * mm)}`;
  if (A.k === 'z') return `战力 ×${dec2(1 + (L.ZHAN_M[A.t - 1] - 1) * mm)}`;
  return L.artDesc(st, id);
}
const dec2 = v => (Math.round(v * 100) / 100).toFixed(2).replace(/0$/, '');
function masteryHTML(id, small) {
  const pg = L.artProg(st, id);
  return `<div class="mast">${bar(pg.f, pg.lv >= 3)}<span class="muted${small ? '' : ' num'}">${L.MAST.n[pg.lv]}${pg.lv < 4 ? ` · 还差 ${Math.ceil(pg.left)}` : ''}</span></div>`;
}
// 换上这门的变化（心法看修炼 / 周天，战技看战力）
function artDeltaText(id) {
  const A = L.art(id), d = L.artDelta(st, id);
  if (A.k === 'x') { const v = d.g1 - d.g0; return Math.abs(v) < 0.05 ? '' : `<span class="${v > 0 ? 'jadet' : 'seal'}">修炼 ${v > 0 ? '+' : '−'}${dec(Math.abs(v))}/周天</span>`; }
  const v = d.p1 - d.p0, pct = d.p1 / d.p0 - 1;
  if (Math.abs(pct) < 0.0005) return '';
  return `<span class="${v > 0 ? 'jadet' : 'seal'}">战力 ${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}</span>`;
}

// ---------- 功法页 ----------
let artSel = 0;
const SLOT_HEAD = ['心法 · 修炼', '战技 · 战力', '秘术 · 特效'];
function showArts(sel, still) {
  if (sel !== undefined && sel !== null) artSel = sel;
  const sl = L.artSlots(st);
  const slots = [0, 1, 2].map(i => {
    const open = L.artSlotOpen(st, i), id = sl[i], A = id && L.art(id);
    const cls = 'aslot' + (i === artSel ? ' sel' : '') + (open ? '' : ' lock');
    if (!open) return `<div class="${cls}" data-slot="${i}"><span class="k">${SLOT_HEAD[i]}</span>${iconHTML('bag', pxs(16, 2))}<span>未开放</span><span class="muted">${L.artSlotWhy(i)}</span></div>`;
    if (!A) return `<div class="${cls}" data-slot="${i}"><span class="k">${SLOT_HEAD[i]}</span><span class="aempty">空</span><span class="muted">${i === 0 ? '基础吐纳 ×1' : '点这里，再点下面一门'}</span></div>`;
    const big = i === 0 ? `修炼 ×${dec2(L.artXMult(st))}` : i === 1 ? `战力 ×${dec2(L.artZMult(st))}` : '';
    const pg = L.artProg(st, id);
    return `<div class="${cls}" data-slot="${i}"><span class="k">${SLOT_HEAD[i]}</span>${artImg(id, 2.5)}<span class="nm">《${esc(A.n)}》</span><span>${tierTag(A.t)} ${elChip(A.el)}</span>${bar(pg.f, pg.lv >= 3)}<span class="${i === 2 ? 'muted fxs' : 'num goldt'}">${L.MAST.n[pg.lv]}${big ? ' ' + big : '：' + esc(L.artDesc(st, id))}</span></div>`;
  }).join('');
  // 当前三槽的共鸣
  const g = L.artGen(st), combos = L.artCombos(st);
  const res = [];
  if (g.same >= 2) res.push(`<span class="chip ok">${g.same >= 3 ? '三' : '两'}门同属${g.el ? L.elName(g.el) : ''}：修炼、战力 +${Math.round((g.same >= 3 ? L.GEN.three : L.GEN.two) * 100)}%</span>`);
  if (g.sheng) res.push(`<span class="chip ok">心法生战技：战技倍率部分 +${Math.round(L.GEN.sheng * 100)}%</span>`);
  for (const c of combos) res.push(`<span class="chip warn">共鸣·${L.combo(c).n}</span>`);
  const swap = L.artSwapLeft(st);
  // 下方列表：这一槽能装的已有功法
  const rows = L.artList(st, artSel);
  const open = L.artSlotOpen(st, artSel);
  const list = rows.map(r => {
    const A = r.A, links = r.combos.filter(c => st.meta.combo[c]).map(c => `<span class="alink">⟷${esc(L.combo(c).n)}</span>`).join('');
    const gen = r.gen.same >= 2 && !r.cur ? `<span class="alink gen">同属+${Math.round((r.gen.same >= 3 ? L.GEN.three : L.GEN.two) * 100)}%</span>` : '';
    const dt = r.cur ? '<span class="chip ok">装备中</span>' : open ? artDeltaText(r.id) : '';
    const why = r.rec ? `<span class="chip ok">荐</span>` : '';
    return `<div class="card arow${r.cur ? ' cur' : ''}" data-art="${r.id}">${artImg(r.id, 2)}<div class="main"><div class="line">${why}<span>《${esc(A.n)}》</span>${tierTag(A.t)}${elChip(A.el)}${links}${gen}</div>
      <div class="muted">${esc(artMain(r.id))}${A.k !== 'm' ? ' · ' + esc(L.artDesc(st, r.id)) : ''}</div>${masteryHTML(r.id, true)}</div>
      <div class="right">${dt}</div></div>`;
  }).join('') || `<p class="muted">还没有${L.ART_CAT[L.ART_SLOTS[artSel]]}。寻宝、历练掉落、宗门宝库、首领与奇遇都能得到。</p>`;
  // 共鸣图鉴（跨世保留）、融会、残篇
  const found = L.COMBOS.filter(c => st.meta.combo[c.id]);
  const hints = L.COMBOS.filter(c => !st.meta.combo[c.id] && (st.meta.chint || {})[c.id]);
  const dex = found.map(c => `<div class="dexrow"><span class="chip warn">${esc(c.n)}</span> ${c.a.map(x => '《' + esc(L.art(x).n) + '》').join(' + ')}${c.fireZ ? ' + 火系战技' : ''}<br><span class="muted">${esc(c.d)}</span></div>`).join('')
    + hints.map(c => `<div class="dexrow muted">？ + ？　${esc(L.comboHintText(c.id))}</div>`).join('');
  const rc = L.rongSum(st, 'cul'), ra = L.rongSum(st, 'atk');
  const frags = ['x_hongmeng', 'm_xingdou'].filter(id => !L.artOwned(st, id) && (st.arts.frag[id] || 0) > 0).map(id => `《${L.art(id).n}》残篇 ${st.arts.frag[id]}/3`).join(' · ');
  const body = meTabs('art') + `<div class="aslots">${slots}</div>
    ${res.length || swap ? `<div class="arows">${res.join('')}${swap ? `<span class="chip bad">心法转修中：还剩 ${swap} 周天（修炼 ×${L.SWAP.m}）</span>` : ''}</div>` : ''}
    <div class="muted">${open ? `点一门即换上${L.ART_SLOTS[artSel] === 'z' ? '（即换即生效，还定你的攻击属性）' : L.ART_SLOTS[artSel] === 'm' ? '（即换即生效）' : sl[0] ? `（换心法先转修 ${L.SWAP.len} 周天，修炼 ×${L.SWAP.m}）` : ''}` : `${SLOT_HEAD[artSel].slice(0, 2)}槽${L.artSlotWhy(artSel)}`} · 已有 ${rows.length} 门${L.ART_CAT[L.ART_SLOTS[artSel]]}</div>
    ${list}
    <div class="sep"></div>
    <div class="grow-sec"><h3>共鸣图鉴<span>${found.length} / ${L.COMBOS.length}</span></h3>${dex || ''}<div class="muted">两门同属修炼、战力 +4%，三门 +10%；心法生战技（木→火→土→金→水→木）战技倍率部分 +10%。还有 ${L.COMBOS.length - found.length} 条有名的共鸣没发现：凑齐就揭晓，跨世保留。</div></div>
    <div class="muted">熟练：装备着每周天 +1（心法闭关 +2，战技斩妖一趟 +2）；圆满得一份融会（卸下也保留，合计上限 +30%）。融会 ${L.rongN(st)} 门：修炼 +${(rc * 100).toFixed(1)}% · 战力 +${(ra * 100).toFixed(1)}%${frags ? '<br>' + frags : ''}</div>`;
  const s = sheet({ title: '人物', body, still });
  bindMeTabs(s);
  s.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { SFX.tap(); showArts(+b.dataset.slot, true); });
  s.querySelectorAll('[data-art]').forEach(b => b.onclick = () => {
    if (!L.artSlotOpen(st, artSel)) { SFX.tap(); return; }
    const id = b.dataset.art, pw0 = L.power(st), g0 = L.gainBase(st);
    const r = L.equipArt(st, id);
    if (!r || r.same) { SFX.tap(); return; }
    SFX.coin();
    const pw1 = L.power(st), g1 = L.gainBase(st);
    floatText(100, 70, `换上《${L.art(id).n}》`, '#ffe39a');
    if (Math.abs(g1 - g0) > 0.05) floatText(100, 82, `修炼 ${dec(g0)} → ${dec(g1)}`, '#8ff5d0', false, true);
    else if (fmt(pw1) !== fmt(pw0)) floatText(100, 82, `战力 ${fmt(pw0)} → ${fmt(pw1)}`, '#ff9a8a', false, true);
    if (r.combos.length) comboReveal(r.combos, () => showArts(artSel, true));
    else showArts(artSel, true);
  });
}
// 共鸣揭晓：第一次凑齐时的大卡（同时 hud 有横幅）
function comboReveal(ids, back) {
  const c = L.combo(ids[0]);
  SFX.reveal(5); flash(0.35);
  sheet({ title: '共鸣揭晓', center: true, noClose: true,
    body: `<div class="combo-card"><div class="combo-arts">${c.a.map(id => `<div class="combo-a">${artImg(id, 3)}<span>《${esc(L.art(id).n)}》</span></div>`).join('<span class="combo-x">⟷</span>')}</div>
      <div class="big goldt center">${esc(c.n)}</div><p class="center">${esc(c.d)}</p>
      <p class="muted center">已记入共鸣图鉴（${Object.keys(st.meta.combo).length} / ${L.COMBOS.length}），下一世也认得。</p></div>`,
    foot: [{ t: '妙', gold: true, fn: () => { if (ids.length > 1) comboReveal(ids.slice(1), back); else if (back) back(); else closeModal(); } }] });
}
// 掉落卡 / 结算卡里的一门功法：图标、阶、五行、给什么；更强时给【换上】（一下）
function artLine(it) {
  const A = L.art(it.art);
  const head = `${artImg(it.art, 2)}<div class="grow"><div class="line">${tierTag(A.t)}<span>${L.ART_CAT[A.k]}《${esc(A.n)}》</span>${elChip(A.el)}</div><div class="muted">${esc(artMain(it.art))}${A.k !== 'm' ? ' · ' + esc(L.artDesc(st, it.art)) : ''}</div>`;
  let tail;
  if (it.frag && !it.fragDone) tail = `<div>残篇 <b>${it.frag} / 3</b>，集齐自动合成</div>`;
  else if (it.dup) tail = `<div>已会：参照着练，熟练 <b>+${it.mastery}</b>（${L.MAST.n[L.artLv(st, it.art)]}）</div>`;
  else if (it.equip || L.artSlots(st).includes(it.art)) tail = `<div class="jadet">已装上${it.fragDone ? '（三片残篇合一）' : ''}</div>`;
  else if (L.artBetter(st, it.art)) tail = `<div class="row"><span class="grow">换上更强：${artDeltaText(it.art)}</span><button class="btn sm gold eq" data-eqart="${it.art}">换上</button></div>`;
  else tail = `<div class="muted">先收着：【人物】→ 功法里随时能换${L.artSlotOpen(st, L.artSlotOf(it.art)) ? '' : `（${L.artSlotWhy(L.artSlotOf(it.art))}）`}</div>`;
  return `<div class="quote artline"><div class="row">${head}${tail}</div></div></div>`;
}
// sheet() 里所有 [data-eqart] 按钮：点一下换上
function bindEquipButtons(root) {
  root.querySelectorAll('[data-eqart]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const r = L.equipArt(st, b.dataset.eqart);
    if (!r || !r.ok) return;
    SFX.coin();
    b.outerHTML = '<span class="chip ok">已换上</span>';
    updateHUD();
  });
}
// 历练确认页的五行一行：已知写“你的火系战技克此地（金）：分数 +8”，未知写“？”；有更合适的战技给一键换上
function elemLine(k) {
  if (!L.artSlotOpen(st, 1)) return '';
  const rg = L.REGIONS[k], known = L.elemKnown(st, k), e = L.expElem(st, k), sl = L.artSlots(st), z = sl[1] && L.art(sl[1]);
  let main;
  if (!rg.el) main = '此地五行：无，不论克制';
  else if (!known) main = `此地五行未知（去过一次才知道）${z ? `；你的${L.elName(e.me)}系战技克不克它：？` : ''}`;
  else if (!z) main = `此地属${elChip(rg.el)}。你没装战技（无属性），不论克制`;
  else if (e.v > 0) main = `<span class="jadet">你的${L.elName(e.me)}系战技克此地（${L.elName(e.it)}）：分数 +${e.v}</span>`;
  else if (e.v < 0) main = `<span class="seal">此地（${L.elName(e.it)}）克你的${L.elName(e.me)}系战技：分数 −${-e.v}</span>`;
  else main = `你的${L.elName(e.me)}系战技与此地（${L.elName(e.it)}）不相克`;
  let swap = '';
  if (known && rg.el) {
    let best = null;
    for (const id of Object.keys(st.arts.own)) {
      if (L.art(id).k !== 'z' || id === sl[1]) continue;
      const v = L.expElem(st, k, [sl[0], id, sl[2]]).v;
      if (v > e.v && (!best || v > best.v || (v === best.v && L.art(id).t > L.art(best.id).t))) best = { id, v };
    }
    if (best) { const B = L.art(best.id); swap = `<button class="btn sm alt eq" data-swapz="${best.id}">换上《${esc(B.n)}》（${L.elName(L.atkEl(st, rg.el, [sl[0], best.id, sl[2]]))}）：分数 ${best.v - e.v > 0 ? '+' : ''}${best.v - e.v}</button>`; }
  }
  return `<div id="expElem" class="elemline">${elChip(rg.el, rg.el && !known)}<span class="grow">${main}</span>${swap}</div>`;
}
