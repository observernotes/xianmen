/* 废柴仙途 · 界面片段 panel-arts：功法页（【人物】→ 功法）、五行标记、功法图标、掉落卡里的【换上】、共鸣揭晓
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * SYSTEMS §2：三个大槽 + 下方已有功法（按“换上后修炼 / 战力变化”排序，第一项标“荐”）。点槽 → 点功法，两下完成。
 * “荐 / 换上”一律问 L.artRecommend（src/logic/artrec.js，带原因）；数字取自逻辑层：L.artList（排序与变化量）、L.artXMult / L.artZMult（倍率）、L.artProg（熟练）、L.expElem / L.duelElem（克制）。 */
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
  const B = L.ART_B && L.ART_B[id];   // 战斗里的招式（battle.js，COMBAT_LOOT §3.2）：一句话
  if (A.k === 'x') return `修炼 ×${dec2(1 + (L.ARTS[A.t].m - 1) * mm)}${B ? ' · ' + B.line : ''}`;
  if (A.k === 'z') { const sk = L.artSkill && L.artSkill(st, id); return sk && B ? `${B.line.replace(/^×[\d.]+/, '×' + dec2(sk.m))}${sk.plus ? ' +' : ''}` : `战力 ×${dec2(1 + (L.ZHAN_M[A.t - 1] - 1) * mm)}`; }
  return L.artDesc(st, id);
}
const dec2 = v => (Math.round(v * 100) / 100).toFixed(2).replace(/0$/, '');
function masteryHTML(id, small) {
  const pg = L.artProg(st, id);
  return `<div class="mast">${bar(pg.f, pg.lv >= 3)}<span class="muted${small ? '' : ' num'}">${L.MAST.n[pg.lv]}${pg.lv < 4 ? ` · 还差 ${Math.ceil(pg.left)}` : ''}</span></div>`;
}
// 换上这门的变化（心法看修炼 / 月，战技看战力）
function artDeltaText(id) {
  const A = L.art(id), d = L.artDelta(st, id);
  if (A.k === 'x') { const v = d.g1 - d.g0; return Math.abs(v) < 0.05 ? '' : `<span class="${v > 0 ? 'jadet' : 'seal'}">修炼 ${v > 0 ? '+' : '−'}${dec(Math.abs(v))}/月</span>`; }
  const v = d.p1 - d.p0, pct = d.p1 / d.p0 - 1;
  if (Math.abs(pct) < 0.0005) return '';
  return `<span class="${v > 0 ? 'jadet' : 'seal'}">战力 ${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}</span>`;
}

// 该换的心法 / 战技（【人物】角标“功”、老祖气泡用）：返回 { i, rc } 或 null。口径就是 L.artRecommend 平时的推荐（artrec.js），与功法页“荐”、变强页同一门
let artRecCache = { t: -1, v: null };
function artRec() {
  if (!st || !st.arts) return null;
  const key = (L.adviseKey ? L.adviseKey(st) : st.tick) + '|' + L.artSlots(st).join();
  if (artRecCache.t === key) return artRecCache.v;
  let v = null;
  for (const i of [0, 1]) { const rc = L.artRecommend(st, i); if (rc && !rc.same && rc.id) { v = { i, rc }; break; } }
  artRecCache = { t: key, v };
  return v;
}
// 每月：新出现的推荐老祖提一句（每门一次，不打断），带原因
function artRecTip() {
  const r = artRec();
  if (!r || L.busy(st)) return;
  const A = L.art(r.rc.id);
  tip('artrec_' + r.rc.id, `换上${r.i === 0 ? '心法' : '战技'}《${A.n}》：${r.rc.why}。去【人物】→ 功法点一下换上。`);
}
// ---------- 功法页 ----------
let artSel = 0;
const SLOT_HEAD = ['心法 · 修炼', '战技 · 战力', '秘术 · 特效'];
// 上：开了的几个槽（图标 + 名字品阶色 + 关键数 + 熟练）；共鸣角标一行；下：这一槽能装的功法，一行一门（名字 + 关键数 + 熟练 · 右边是换上的变化），点一下换上
// 每门的说明、共鸣图鉴、熟练与融会收进详情
function showArts(sel, still) {
  if (sel !== undefined && sel !== null) artSel = sel;
  const sl = L.artSlots(st);
  const openSlots = [0, 1, 2].filter(i => L.artSlotOpen(st, i));
  if (!openSlots.length) {   // 还没有任何功法：分页照样在，告诉玩家去哪里得
    sheet({ title: '装备', body: meTabs('art') + emptyNoteHTML('scroll', '还没有功法 · 历练、奇遇里能得到第一门心法') });
    return;
  }
  if (!openSlots.includes(artSel)) artSel = 0;
  const slots = openSlots.map(i => {
    const id = sl[i], A = id && L.art(id);
    const cls = 'aslot pn-aslot' + (i === artSel ? ' sel' : '');
    const head = SLOT_HEAD[i].slice(0, 2);
    const noZ = i === 1 && !Object.keys(st.arts.own).some(x => L.art(x) && L.art(x).k === 'z');
    if (!A) return `<div class="${cls}" data-slot="${i}"><span class="k">${head}</span><span class="aempty">空</span><span class="muted">${i === 0 ? '基础吐纳' : noZ ? L.artSlotWhy(1) : '点下面一门'}</span></div>`;
    const big = i === 0 ? `修炼 ×${dec2(L.artXMult(st))}` : i === 1 ? `战力 ×${dec2(L.artZMult(st))}` : '';
    const pg = L.artProg(st, id);
    return `<div class="${cls}" data-slot="${i}"><span class="k">${head}</span>${qcellHTML(A.t, artImg(id, 2), 2)}<span class="nm" style="color:${pnTierInk(A.t)}">《${esc(A.n)}》</span>${big ? `<span class="num pn-key">${big}</span>` : elChip(A.el)}${bar(pg.f, pg.lv >= 3)}<span class="muted">${L.MAST.n[pg.lv]}</span></div>`;
  }).join('');
  // 当前三槽的共鸣
  const g = L.artGen(st), combos = L.artCombos(st);
  const res = [];
  if (g.same >= 2) res.push(`<span class="chip ok">${g.same >= 3 ? '三' : '两'}门同属${g.el ? L.elName(g.el) : ''} +${Math.round((g.same >= 3 ? L.GEN.three : L.GEN.two) * 100)}%</span>`);
  if (g.sheng) res.push(`<span class="chip ok">心法生战技 +${Math.round(L.GEN.sheng * 100)}%</span>`);
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
    const recWhy = r.rec && r.why ? `<div class="jadet arec-why">${esc(r.why)}</div>` : '';
    return `<div class="card arow pn-arow${r.cur ? ' cur' : ''}" data-art="${r.id}">${artImg(r.id, 2)}<div class="main"><div class="line">${why}<b class="pn-nm" style="color:${pnTierInk(A.t)}">《${esc(A.n)}》</b>${elChip(A.el)}${links}${gen}</div>
      <div class="muted">${A.k !== 'm' ? esc(artMain(r.id)) + ' · ' : ''}熟练 ${L.MAST.n[L.artLv(st, r.id)]}</div>${recWhy}</div>
      <div class="right">${dt}</div></div>`;
  }).join('') || emptyNoteHTML('vault', `还没有${L.ART_CAT[L.ART_SLOTS[artSel]]}：寻宝、历练、宗门宝库都会给。`);
  const descs = rows.map(r => `<div class="dexrow">${tierTag(r.A.t)} 《${esc(r.A.n)}》：${esc(r.A.k === 'm' ? L.artDesc(st, r.id) : artMain(r.id) + ' · ' + L.artDesc(st, r.id))}${masteryHTML(r.id, true)}</div>`).join('');
  // 共鸣图鉴（跨世保留）、融会、残篇
  const found = L.COMBOS.filter(c => st.meta.combo[c.id]);
  const hints = L.COMBOS.filter(c => !st.meta.combo[c.id] && (st.meta.chint || {})[c.id]);
  const dex = found.map(c => `<div class="dexrow"><span class="chip warn">${esc(c.n)}</span> ${c.a.map(x => '《' + esc(L.art(x).n) + '》').join(' + ')}${c.fireZ ? ' + 火系战技' : ''}<br><span class="muted">${esc(c.d)}</span></div>`).join('')
    + hints.map(c => `<div class="dexrow muted">？ + ？　${esc(L.comboHintText(c.id))}</div>`).join('');
  const rc = L.rongSum(st, 'cul'), ra = L.rongSum(st, 'atk');
  const frags = ['x_hongmeng', 'm_xingdou'].filter(id => !L.artOwned(st, id) && (st.arts.frag[id] || 0) > 0).map(id => `《${L.art(id).n}》残篇 ${st.arts.frag[id]}/3`).join(' · ');
  const tip = !open ? '' : L.ART_SLOTS[artSel] === 'x' && sl[0] ? `点一门换上 · 换心法转修 ${seasons(L.SWAP.len)} 季` : '点一门即换上';
  // 绝招与器技（battle.js）：绝招常驻，怒气满了手动放；兵器带一招
  const btm = L.btMe ? L.btMe(st) : null, wsk = btm && btm.skills.find(x => x.kind === 'w');
  const ultRow = btm ? `<div class="bt-arow">${typeof btSkillIcon === 'function' ? btSkillIcon(btm.ult) : ''}<span class="grow">绝招「${esc(btm.ult.n)}」×${dec2(btm.ult.m)}</span></div>${wsk ? `<div class="bt-arow">${typeof btSkillIcon === 'function' ? btSkillIcon(wsk) : ''}<span class="grow">器技「${esc(wsk.n)}」${esc(wsk.line.split('；')[0])}</span></div>` : ''}` : '';
  const body = meTabs('art') + `<div class="aslots pn-aslots" style="grid-template-columns:repeat(${openSlots.length},minmax(0,1fr))">${slots}</div>${ultRow}
    ${res.length || swap ? `<div class="arows">${res.join('')}${swap ? `<span class="chip bad">转修中：还剩 ${seasons(swap)} 季（修炼 ×${L.SWAP.m}）</span>` : ''}</div>` : ''}
    ${list}`;   // 各门说明、共鸣图鉴、熟练与融会不再折叠在第一屏（§4.2）：点一门看它（换上前后的数），图鉴在【仙途】→ 记录
  const s = sheet({ title: shellTitle('gear'), body, still });
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
  const head = `${artImg(it.art, 2)}<div class="grow"><div class="line">${pnName(`${L.ART_CAT[A.k]}《${esc(A.n)}》`, A.t)}${elChip(A.el)}</div><div class="muted">${esc(artMain(it.art))}</div>`;
  let tail;
  if (it.frag && !it.fragDone) tail = `<div>残篇 <b>${it.frag} / 3</b>，集齐自动合成</div>`;
  else if (it.dup) tail = `<div>已会：参照着练，熟练 <b>+${it.mastery}</b>（${L.MAST.n[L.artLv(st, it.art)]}）</div>`;
  else if (it.equip || L.artSlots(st).includes(it.art)) tail = `<div class="jadet">已装上${it.fragDone ? '（三片残篇合一）' : ''}</div>`;
  else if (L.artRecWhy(st, it.art)) tail = `<div class="row"><span class="grow pn-key">${esc(L.artRecWhy(st, it.art))} ▲</span><button class="btn sm gold eq" data-eqart="${it.art}">换上</button></div>`;   // 是平时的推荐才给【换上】（artrec.js），原因同功法页
  else tail = `<div class="muted">先收着，【人物】→ 功法随时换</div>`;
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
// 历练确认页的五行一行（旧分数制）：已知写“你的火系战技克此地（金）：分数 +8”，未知写“？”；L.artRecommend 按这一格推荐时给一键换上（带原因）
function elemLine(k, d) {
  if (!L.artSlotOpen(st, 1)) return '';
  const rg = L.REGIONS[k], known = L.elemKnown(st, k), e = L.expElem(st, k), sl = L.artSlots(st), z = sl[1] && L.art(sl[1]);
  let main;
  if (!rg.el) main = '五行：无';
  else if (!known) main = '五行：？（去过才知道）';
  else if (!z) main = `五行 ${elChip(rg.el)} · 没装战技`;
  else if (e.v > 0) main = `<span class="jadet">${L.elName(e.me)}克${L.elName(e.it)}：分数 +${e.v}</span>`;
  else if (e.v < 0) main = `<span class="seal">${L.elName(e.it)}克${L.elName(e.me)}：分数 −${-e.v}</span>`;
  else main = `${L.elName(e.me)}与${L.elName(e.it)}不相克`;
  // 有更合适的战技：L.artRecommend 按这一格（与功法页、变强页同一套打分），写原因
  let swap = '';
  L.artRecSelect(st, k, d || 0); const rc = L.artRecommend(st, 1);   // 选中这一格，问平时的推荐（与功法页、变强页同一个答案）
  if (rc && !rc.same && rc.id) { const B = L.art(rc.id); swap = `<button class="btn sm alt eq" data-swapz="${rc.id}">换上《${esc(B.n)}》：${esc(rc.why)}</button>`; }
  const alt = rc && rc.ctx.kind === 'duel' ? L.artRecommend(st, 1, { k, d: d || 0, here: true, force: true }) : null;   // 近期大节点优先：克这张图的另有一门只提一句
  if (alt && alt.id !== (rc.same ? rc.cur : rc.id) && alt.why && /克/.test(alt.why)) swap += `<span class="muted">克这张图的是《${esc(L.art(alt.id).n)}》；${esc(rc.ctx.label)}还有 ${seasons(rc.ctx.left)} 季，先按它配</span>`;
  return `<div id="expElem" class="elemline">${elChip(rg.el, rg.el && !known)}<span class="grow">${main}</span>${swap}</div>`;
}
