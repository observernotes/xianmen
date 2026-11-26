/* 废柴仙途 · 界面片段 panel-gear：法宝页（【人物】→ 法宝）、对比卡（换上 / 熔炼 / 锁定当前）、强化（点一下一次，长按连强）、重铸、器炉打造、包裹
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * SYSTEMS §3：三格 + 选中格下一个【强化】；新掉落只弹对比卡，不选就熔成灵矿（没有背包）。
 * 面板重做（A 线，pn-）：卡片只放 图标 + 名字（品阶色）+ 一个关键数 + 至多一个角标；要拿主意的地方第一屏只写“做了之后最重要的变化”（▲ / ▼），
 * 一个主按钮（金），次按钮最多一个；词条明细、来源、公式收进“详情”（details.more）。
 * 数字一律取自逻辑层：L.gearDelta（对比卡的前后）、L.gearPlusInfo（强化前后）、L.gearMainText（主属性）、L.planNeeds（器方材料）。 */
// ---------- A 线公共小件（pn-，灵宠页、功法页、包裹共用） ----------
// 品阶色压暗一点再当字色：亮色字落在宣纸上发虚（框、角标仍用原色）
function pnInk(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#3b2b1f';
  const n = parseInt(m[1], 16), k = 0.6;
  return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`;
}
const pnTierInk = t => (t >= 7 ? '#7a3fc0' : pnInk(ART.qualityColor(t)));
// 名字一枚（品阶色）
const pnName = (text, t) => `<b class="pn-nm" style="color:${pnTierInk(t)}">${text}</b>`;
// ---------- 小部件 ----------
// 图：兵器 ART.item('w', 阶)、法衣 ART.item('r', 阶)、饰品 ART.item('o', 阶, 种类)、首领专属 ART.item('boss', k)
function gearCanvas(x) {
  const B = L.gearBase(x.id);
  if (B.boss !== undefined) return ART.item('boss', B.boss);
  if (x.slot === 'o') return ART.item('o', x.t, B.kind);
  return ART.item(x.slot, x.t);
}
function gearImg(x, k) {
  const B = L.gearBase(x.id), s = pxs(16, k || 2), key = 'gear|' + (B.boss !== undefined ? 'b' + B.boss : x.slot + x.t + (B.kind || ''));
  return `<img class="px" src="${urlOf(gearCanvas(x), key)}" style="width:${s}px;height:${s}px;flex:none" alt="">`;
}
const affURL = {};
function affImg(a) { const n = L.AFFIX[a].n; if (!affURL[n]) { const c = ART.affix(n); affURL[n] = c ? c.toDataURL() : ''; } const s = pxs(8, 2); return affURL[n] ? `<img class="px" src="${affURL[n]}" style="width:${s}px;height:${s}px" alt="">` : ''; }
let oreURL = '';
function oreImg(sz) { if (!oreURL) { const c = ART.icon('ore'); oreURL = c ? c.toDataURL() : iconURL.stone; } const s = sz || pxs(16, 1); return `<img class="px" src="${oreURL}" style="width:${s}px;height:${s}px;vertical-align:middle" alt="">`; }
let scrollURL = '';
function scrollImg(sz) { if (!scrollURL) { const c = ART.icon('gscroll'); scrollURL = c ? c.toDataURL() : iconURL.bag; } const s = sz || pxs(16, 1.5); return `<img class="px" src="${scrollURL}" style="width:${s}px;height:${s}px;flex:none" alt="">`; }
function gTierTag(slot, t) { return t >= 7 ? `<span class="tag rainbow">${L.gearTierName(slot, t)}</span>` : `<span class="tag" style="background:${ART.qualityColor(t)}">${L.gearTierName(slot, t)}</span>`; }
const gTierBorder = t => (t >= 7 ? '#c48bff' : ART.qualityColor(t));
function affChips(aff, fixed) { return aff.map(a => `<span class="gaff${fixed ? ' fixed' : ''}">${affImg(a)}${L.AFFIX[a].n}</span>`).join(''); }
const plusTag = p => (p > 0 ? `<span class="gplusn">+${p}</span>` : '');
// 一件法宝的关键数（格子、掉落行用）：主属性的第一段
const gearKey = x => L.gearMainText(st, x).split(' · ')[0];
// 对比卡、强化预览里的一组“前 → 后”（只列有变化的），按要紧程度排：战力、约战胜算、修炼、历练分数、其余
function gearDeltaRows(a, b, k) {
  const d = [], arrow = (x, y) => (y > x ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (fmt(a.p) !== fmt(b.p)) d.push([0, `<dt>战力</dt><dd class="num">${fmt(a.p)} → <b>${fmt(b.p)}</b> ${arrow(a.p, b.p)}</dd>`]);
  if (a.pact !== undefined && a.pact !== null && L.pct(a.pact) !== L.pct(b.pact)) d.push([1, `<dt>约战胜算</dt><dd class="num">${L.pct(a.pact)} → <b>${L.pct(b.pact)}</b> ${arrow(a.pact, b.pact)}</dd>`]);
  if (dec(a.g) !== dec(b.g)) d.push([2, `<dt>修炼/周天</dt><dd class="num">+${dec(a.g)} → <b>+${dec(b.g)}</b> ${arrow(a.g, b.g)}</dd>`]);
  if (Math.abs(a.s - b.s) >= 0.05) d.push([3, `<dt>历练分数</dt><dd class="num">${sgn(a.s)} → <b>${sgn(b.s)}</b> ${arrow(a.s, b.s)}</dd>`]);
  if (a.inc !== undefined && Math.abs(a.inc - b.inc) > 0.004) d.push([4, `<dt>历练灵石</dt><dd class="num">×${dec2(a.inc)} → <b>×${dec2(b.inc)}</b> ${arrow(a.inc, b.inc)}</dd>`]);
  if (a.life !== undefined && fmt(a.life) !== fmt(b.life)) d.push([5, `<dt>寿元</dt><dd class="num">${fmt(a.life)} → <b>${fmt(b.life)}</b> 岁 ${arrow(a.life, b.life)}</dd>`]);
  if (a.luck !== undefined && Math.abs(a.luck - b.luck) > 0.0005) d.push([6, `<dt>奇遇把握</dt><dd class="num">+${L.pct(a.luck)} → <b>+${L.pct(b.luck)}</b> ${arrow(a.luck, b.luck)}</dd>`]);
  if (a.trib !== undefined && Math.abs(a.trib - b.trib) >= 0.05) d.push([7, `<dt>天劫承劫</dt><dd class="num">${dec(a.trib)}% → <b>${dec(b.trib)}%</b> ${arrow(a.trib, b.trib)}</dd>`]);
  return d.sort((x, y) => x[0] - y[0]).map(x => x[1]);
}
const sgn = v => (v >= 0 ? '+' : '−') + dec(Math.abs(v));

// ---------- 对比卡：新掉落【换上】/【熔炼】（不选 = 熔炼）；【锁定当前】在详情里 ----------
// 第一屏：新法宝（名字品阶色）+ 换下哪件 + 换上之后最要紧的 1～2 个变化（▲绿 / ▼红）+ 两个按钮（更强时【换上】是金的，否则【熔炼】是金的）
function gearCmpHTML(x) {
  const B = L.gearBase(x.id), cur = st.gear[x.slot], D = L.gearDelta(st, x), inh = D.inh[1];
  const a = Object.assign({}, D.a, { pact: st.pact ? null : L.pactInfo(st).p }), b = Object.assign({}, D.b);
  b.pact = st.pact ? null : L.gearTry(st, x, () => L.pactInfo(st).p);
  const rows = gearDeltaRows(a, b, D.k), key = rows.slice(0, 2), rest = rows.slice(2);
  const cB = cur && L.gearBase(cur.id);
  const notes = [];
  if (cur && cur.plus) notes.push(`强化继承一半：+${cur.plus} → +${inh}`);
  if (cur) notes.push(`换下的【${esc(cB.n)}】熔成灵矿 +${D.smeltCur}`);
  notes.push('不选就熔炼');
  const more = `<details class="more pn-more"><summary>词条与明细</summary>
      <div class="line">${gTierTag(x.slot, x.t)}<span>${esc(L.gearMainText(st, x, inh))}</span></div>
      ${x.aff.length ? `<div class="gaffs">${affChips(x.aff, !!B.fixed)}</div><div class="muted fxs">${x.aff.map(q => esc(L.gearAffText(q))).join('；')}</div>` : ''}
      ${rest.length ? `<dl class="grid2 delta">${rest.join('')}</dl>` : ''}
      ${cur ? `<div class="gcur">${gearImg(cur, 1.5)}<span class="grow">现在：${esc(cB.n)}${plusTag(cur.plus)} · ${esc(L.gearMainText(st, cur))} ${affChips(cur.aff)}</span></div>` : ''}
      <div class="muted fxs">${notes.join(' · ')}</div>
      ${cur ? `<div class="row"><span class="grow muted fxs">锁定当前：以后低于 ${cur.t} 阶的${L.GEAR_N[x.slot]}直接熔炼、不弹卡</span><button class="btn sm alt" data-glk="${x.u}">锁定当前</button></div>` : ''}
    </details>`;
  return `<div class="gcmp pn-cmp${D.better ? ' better' : ''}" data-gcmp="${x.u}" data-better="${D.better ? 1 : 0}" style="border-left-color:${gTierBorder(x.t)}">
    <div class="row">${gearImg(x, 2.5)}<div class="grow"><div class="line">${pnName(`${L.GEAR_N[x.slot]}【${esc(B.n)}】`, x.t)}${inh ? `<span class="gplusn">+${inh}</span>` : ''}${D.better ? '<span class="chip ok">更强</span>' : ''}</div>
      <div class="muted">${cur ? `换下【${esc(cB.n)}】${cur.plus ? '+' + cur.plus : ''}` : '空槽：直接装上'}</div></div></div>
    ${key.length ? `<dl class="grid2 delta pn-key">${key.join('')}</dl>` : '<div class="muted pn-key">和现在的差不多</div>'}
    <div class="gbtns pn-2"><button class="btn ${D.better ? 'gold' : 'alt'}" data-geq="${x.u}">换上</button><button class="btn ${D.better ? 'alt' : 'gold'} pn-smb" data-gsm="${x.u}">熔炼<small>${oreImg(pxs(8, 2))}+${D.smelt}</small></button></div>
    ${more}</div>`;
}
// 掉落一行：待决定的弹对比卡；已经装上 / 自动熔掉的写一句
function gearLine(it) {
  const x = it.gear;
  if (it.pend && L.gearPend(st, x.u)) return gearCmpHTML(x);
  const B = L.gearBase(x.id);
  const tail = it.hold ? `<span class="muted">先收着</span>` : it.equip ? '<span class="chip ok">已装上</span>' : it.smelt !== undefined ? `<span class="muted">${oreImg(pxs(8, 2))}+${it.smelt}</span>` : st.gear[x.slot] === x ? '<span class="chip ok">已换上</span>' : '<span class="muted">已处理</span>';
  const why = it.hold ? `${L.GEAR_N[x.slot]}槽${L.gearOpenWhy(st, x.slot)}，到时自动戴上` : it.smelt !== undefined ? `熔成灵矿${it.closed ? `（${L.GEAR_N[x.slot]}槽${L.gearOpenWhy(st, x.slot)}）` : it.auto ? '（已锁定）' : ''}` : '';
  return `<div class="quote gline"><div class="row">${gearImg(x, 2)}<div class="grow"><div class="line">${pnName(`${L.GEAR_N[x.slot]}【${esc(B.n)}】`, x.t)}${plusTag(x.plus)}</div><div class="muted">${esc(gearKey(x))}${why ? ' · ' + why : ''}</div></div>${tail}</div></div>`;
}
// 弹窗里有没决定的对比卡（或名册满的放生卡）时，它就是这一屏的主操作：底部的金按钮（再探一次 / 继续）先降成纸色，卡片都决定完再换回来
function gearFootSync(root) {
  const has = !!root.querySelector('[data-gcmp], [data-ppend]');   // 名册满时的放生卡同理
  root.querySelectorAll('.foot .btn').forEach(b => {
    if (has && b.classList.contains('gold')) { b.classList.remove('gold'); b.classList.add('alt'); b.dataset.pnGold = '1'; }
    else if (!has && b.dataset.pnGold) { b.classList.add('gold'); b.classList.remove('alt'); delete b.dataset.pnGold; }
  });
}
// 对比卡上的按钮（sheet() 里统一绑定）
function bindGearButtons(root) {
  const act = (sel, how) => root.querySelectorAll(sel).forEach(b => b.onclick = e => {
    e.stopPropagation();
    const u = +b.dataset[{ equip: 'geq', smelt: 'gsm', lock: 'glk' }[how]];
    const r = L.gearDecide(st, u, how);
    if (!r) return;
    SFX.coin();
    const card = b.closest('[data-gcmp]');
    const nm = esc(L.gearBase(r.x.id).n);
    const msg = how === 'equip' ? `<span class="chip ok">已换上</span> ${nm}${r.plus ? `（继承 +${r.plus}）` : ''}${r.prev ? `，旧的熔成灵矿 +${r.smelt}` : ''}` : `<span class="chip">已熔炼</span> ${nm} → 灵矿 +${r.smelt}${how === 'lock' ? `；${L.GEAR_N[r.slot]}已锁定，更低阶的直接熔炼` : ''}`;
    if (card) card.outerHTML = `<div class="quote gdone">${msg}</div>`;
    if (how === 'equip') { const pw = L.power(st); floatText(100, 82, `战力 → ${fmt(pw)}`, '#ff9a8a', false, true); }
    gearFootSync(root);
    updateHUD();
  });
  act('[data-geq]', 'equip'); act('[data-gsm]', 'smelt'); act('[data-glk]', 'lock');
  gearFootSync(root);
  // 结算卡上面有评价印、翻牌，小屏上对比卡常落在第一屏下面：翻牌放完把它滚进来（按钮露全）
  const c = root.querySelector('[data-gcmp]'), body = c && c.closest('.body');
  if (c && body) setTimeout(() => { if (!c.isConnected) return; const r = c.querySelector('.gbtns').getBoundingClientRect(), bb = body.getBoundingClientRect(); if (r.bottom > bb.bottom || r.top < bb.top) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 650);
}
// 弹窗换内容或关掉时：上一页里还没决定的对比卡按“不选 = 熔炼”结清（新页里还在显示的不算）
const gearUids = m => Array.from(m.querySelectorAll('[data-gcmp]')).map(x => +x.dataset.gcmp);
function gearLeave(oldU, keep) {
  if (!st || !st.gear) return;
  let ore = 0;
  for (const u of oldU) if (!(keep || []).includes(u) && L.gearPend(st, u)) { const r = L.gearDecide(st, u, 'smelt'); if (r) ore += r.smelt; }
  if (ore) floatText(100, 70, `没换上的熔成灵矿 +${fmt(ore)}`, '#9fd8ff', false, true);
}

// ---------- 法宝页 ----------
// 上：灵矿一行；待定的对比卡；开了的几格（图标 + 名字 + 关键数 + 角标）；选中那格：一个【强化】（金）和强化后的变化；词条、重铸、锁定收进详情
let gearSel = 'w', gearMsg = '', gearHold = null;
function showGearDetail(sel, still) {
  if (sel) gearSel = sel;
  const g = st.gear;
  const open = L.GEAR_SLOTS.filter(s => L.gearOpen(st, s));
  if (!open.includes(gearSel)) gearSel = 'w';
  const plusOpen = L.gearOpen(st, 'plus');
  const slots = open.map(s => {
    const x = g[s], cls = 'aslot gslot pn-gslot' + (s === gearSel ? ' sel' : '');
    let inner;
    if (!x) inner = `<span class="k">${L.GEAR_N[s]}</span><span class="aempty">空</span>`;
    else {
      const B = L.gearBase(x.id), why = plusOpen ? L.gearPlusWhy(st, s) : 'x';
      const badge = g.lock[s] ? '<span class="chip">锁</span>' : !why && L.gearPlusRate(st, x) >= 0.8 ? '<span class="chip ok">可强化</span>' : '';
      inner = `<span class="k">${s === 'o' ? L.ACC_KIND[B.kind].n : L.GEAR_N[s]}</span>${qcellHTML(x.t, gearImg(x, 2), 2)}<span class="nm" style="color:${pnTierInk(x.t)}">${esc(B.n)}${plusTag(x.plus)}</span><span class="num pn-key">${esc(gearKey(x))}</span>${badge}`;
    }
    return `<div class="${cls}" data-gslot="${s}">${inner}</div>`;
  }).join('');
  // 选中格：名字、主属性全文、强化（一个金按钮）；词条与重铸、锁定当前收进详情
  const x = g[gearSel];
  let det = '';
  if (x) {
    const B = L.gearBase(x.id), info = L.gearPlusInfo(st, gearSel);
    let plusSec = '';
    if (plusOpen && info.max) plusSec = '<div class="goldt">已强化到 +9</div>';
    else if (plusOpen) {
      const pRows = gearDeltaRows(info.a, info.b, info.k).slice(0, 3);
      plusSec = `<div class="gplusinfo"><div class="pn-ph">强化 +${x.plus} → +${x.plus + 1} · 成功率 <b>${L.pct(info.rate)}</b>${x.fail ? ` <span class="muted">（失败 ${x.fail} 次，保底已加）</span>` : ''}</div>${pRows.length ? `<dl class="grid2 delta pn-key">${pRows.join('')}</dl>` : ''}
        <button class="btn ${info.why ? 'alt' : 'gold'} gplusb pn-plusb" data-plus="${gearSel}" ${info.why ? 'disabled' : ''}>强化<small>${info.why ? esc(info.why) : `${oreImg(pxs(8, 2))}${fmt(info.cost.ore)} · 灵石 ${fmt(info.cost.stones)}`}</small></button></div>`;
    }
    const affRows = x.aff.map((a, i) => {
      const why = L.gearReforgeWhy(st, gearSel, i);
      return `<div class="garow"><span class="gaff${B.fixed ? ' fixed' : ''}">${affImg(a)}${L.AFFIX[a].n}</span><span class="grow muted">${esc(L.AFFIX[a].d)}</span>${B.fixed ? '<span class="muted">固定</span>' : `<button class="btn sm alt eq" data-rf="${i}" ${why ? 'disabled' : ''}>重铸</button>`}</div>`;
    }).join('') || '<div class="muted">没有词条</div>';
    const more = `<details class="more pn-more"${g.rf ? ' open' : ''}><summary>词条${x.aff.length ? ' ' + x.aff.length + ' 条' : ''} · 重铸 · 锁定</summary>
      ${B.note ? `<div class="jadet">${esc(B.note)}</div>` : ''}${B.xx ? '<div class="jadet">老祖“请出手”：每届论道、会武各 2 次，输掉的一场重来</div>' : ''}
      ${affRows}${B.fixed ? '' : `<div class="muted fxs">重铸：花天材地宝 1 重抽一条，二选一保留（你有 ${st.treasure}）</div>`}
      <div class="row"><span class="grow muted fxs">${g.lock[gearSel] ? `已锁定：低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼、不弹卡` : `锁定后，低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼`}</span><button class="btn sm alt eq" data-glock="${gearSel}">${g.lock[gearSel] ? '解锁' : '锁定'}</button></div></details>`;
    det = `<div class="gdet pn-gdet" style="border-left-color:${gTierBorder(x.t)}"><div class="row">${gearImg(x, 3)}<div class="grow"><div class="line">${pnName(esc(B.n), x.t)}${plusTag(x.plus)}${gTierTag(x.slot, x.t)}${B.el ? elChip(B.el) : ''}</div><div class="muted">${esc(L.gearMainText(st, x))}</div></div></div>
      ${gearMsg ? `<div class="quote">${gearMsg}</div>` : ''}${plusSec}${more}</div>`;
  } else det = emptyNoteHTML('vault', `${L.GEAR_N[gearSel]}空着：历练、寻宝、首领都会掉。`);
  // 重铸的二选一
  const rf = g.rf;
  const rfCard = rf ? `<div class="gcmp better" id="gRf"><div>重铸【${esc(L.gearBase(st.gear[rf.slot].id).n)}】：留哪条？</div><div class="gbtns"><button class="btn sm alt" data-rfk="0"><span class="gaff">${affImg(rf.old)}${L.AFFIX[rf.old].n}</span> 留旧</button><button class="btn sm gold" data-rfk="1"><span class="gaff">${affImg(rf.neu)}${L.AFFIX[rf.neu].n}</span> 换新</button></div><div class="muted fxs">旧：${esc(L.AFFIX[rf.old].d)}；新：${esc(L.AFFIX[rf.neu].d)}</div></div>` : '';
  const pendL = g.pend.filter(y => !y.hold), held = L.gearHeld(st);
  const pend = (pendL.length ? `<div class="seal">${pendL.length} 件新法宝待定，离开就熔掉</div>` + pendL.map(gearCmpHTML).join('') : '')
    + (held.length ? `<div class="muted">收着：${held.map(y => `【${esc(L.gearBase(y.id).n)}】`).join('、')}，槽一开自动戴上</div>` : '');
  // 器炉：开了、或手里有器方 / 首领材料时才有这一行
  const nPlan = Object.keys(g.plans).length, nMat = Object.keys(g.mats).reduce((n, k) => n + (g.mats[k] > 0 ? g.mats[k] : 0), 0);
  const forge = L.gearOpen(st, 'forge') || nPlan || nMat ? `<div class="row pn-row">${scrollImg()}<span class="grow">器炉 · 器方 ${nPlan}/${L.PLANS.length}${nMat ? ` · 首领材料 ${nMat}` : ''}</span><button class="btn sm alt eq" id="btnForge">器炉</button></div>` : '';
  const body = meTabs('gear') + `<div class="gres pn-res">${oreImg()} 灵矿 <b class="num">${fmt(st.ore || 0)}</b>${st.treasure ? ` · 天材地宝 ${st.treasure}` : ''}</div>
    ${rfCard}${pend}<div class="aslots gslots pn-gslots" style="grid-template-columns:repeat(${open.length},minmax(0,1fr))">${slots}</div>${det}${forge}
    <details class="more"><summary>强化、灵矿怎么来</summary><div class="muted">强化：每级让主属性的超出部分 +${Math.round(L.PLUS.step * 100)}%（兵器 +9 约 ×1.3～1.5）；成功率 100%→40%，失败不掉级，下次 +10%。换装备时强化继承一半。点一下强化一次，按住连强。<br>灵矿：历练（斩妖 ×${L.ORE.slay}，黑风岭 ×2、剑冢 ×3、星墟 ×4）、熔炼（4 × 2^阶）、坊市一筐、宗门器堂、首领、奇遇。</div></details>`;
  const s = sheet({ title: shellTitle('gear'), body, still, foot: [{ t: '回法宝', alt: true, fn: () => showGear() }] });
  bindMeTabs(s);
  s.querySelectorAll('[data-gslot]').forEach(b => b.onclick = () => { SFX.tap(); gearMsg = ''; showGearDetail(b.dataset.gslot, true); });
  s.querySelectorAll('[data-plus]').forEach(b => bindPlusButton(b));
  s.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { if (L.gearReforge(st, gearSel, +b.dataset.rf)) { SFX.reveal(3); showGearDetail(gearSel, true); } });
  s.querySelectorAll('[data-rfk]').forEach(b => b.onclick = () => { const r = L.gearReforgeKeep(st, b.dataset.rfk === '1'); if (r) { SFX.coin(); gearMsg = `重铸：保留「${L.AFFIX[r.keep].n}」`; showGearDetail(gearSel, true); } });
  const lk = s.querySelector('[data-glock]'); if (lk) lk.onclick = () => { SFX.tap(); L.gearLock(st, lk.dataset.glock, !st.gear.lock[lk.dataset.glock]); showGearDetail(gearSel, true); };
  const fb = s.querySelector('#btnForge'); if (fb) fb.onclick = () => { SFX.tap(); showForge(); };
}
// 强化一次：成功率、花费、前后战力都在逻辑层算；格子上放一下锤击 / 成功 / 失败的特效（ART.drawForge）
function doPlus(slot) {
  const info = L.gearPlusInfo(st, slot);
  const r = L.gearPlus(st, slot);
  if (!r) return null;
  const nm = L.gearBase(r.x.id).n;
  if (r.ok) {
    SFX.reveal(Math.min(6, 2 + Math.floor(r.to / 2)));
    gearMsg = `<span class="jadet">强化成功：【${esc(nm)}】+${r.from} → <b>+${r.to}</b></span>${fmt(r.p0) !== fmt(r.p1) ? `，战力 ${fmt(r.p0)} → <b>${fmt(r.p1)}</b>` : ''}${info && info.a.pact !== null && L.pct(info.a.pact) !== L.pct(info.b.pact) ? `，约战胜算 ${L.pct(info.a.pact)} → <b>${L.pct(info.b.pact)}</b>` : ''}`;
    if (r.to >= 6) banner(`强化 +${r.to}`, nm);
  } else { SFX.fail(); gearMsg = `<span class="seal">强化失败</span>，不掉级；下次成功率 <b>${L.pct(L.gearPlusRate(st, r.x))}</b>`; }
  return r;
}
function forgeFx(slot, kind) {
  const cell = document.querySelector(`#modal [data-gslot="${slot}"]`); if (!cell) return;
  const c = document.createElement('canvas'); c.width = 40; c.height = 32; c.className = 'px gfx';
  const z = pxs(1, 2); c.style.width = 40 * z + 'px'; c.style.height = 32 * z + 'px';
  cell.appendChild(c);
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const t0 = performance.now();
  const step = now => {
    const k = Math.min(1, (now - t0) / 520);
    g.clearRect(0, 0, 40, 32);
    ART.setCtx(g, 40);
    try { ART.drawForge(20, 18, k, k < 0.35 ? 'hit' : kind); } finally { ART.setCtx(ctx, W); }
    if (k < 1 && c.isConnected) requestAnimationFrame(step); else c.remove();
  };
  requestAnimationFrame(step);
}
// 点一下强化一次；按住 0.45 秒后每 0.22 秒连强，松手（任何地方）或做不了就停
function bindPlusButton(b) {
  const slot = b.dataset.plus;
  b.onclick = e => { e.preventDefault(); if (gearHold && gearHold.fired) { gearHold = null; return; } gearHold = null; const r = doPlus(slot); if (r) { showGearDetail(slot, true); forgeFx(slot, r.ok ? 'ok' : 'fail'); } };
  b.onpointerdown = () => {
    stopHold();
    gearHold = { slot, fired: false, t: setTimeout(function rep() {
      if (!gearHold) return;
      gearHold.fired = true;
      if (L.gearPlusWhy(st, slot)) { stopHold(true); return; }
      const r = doPlus(slot);
      showGearDetail(slot, true); forgeFx(slot, r && r.ok ? 'ok' : 'fail');
      if (gearHold) gearHold.t = setTimeout(rep, 220);
    }, 450) };
  };
}
function stopHold(keep) { if (gearHold && gearHold.t) clearTimeout(gearHold.t); if (gearHold) gearHold.t = 0; if (!keep && gearHold && !gearHold.fired) gearHold = null; }
document.addEventListener('pointerup', () => stopHold(true));
document.addEventListener('pointercancel', () => stopHold(true));

// ---------- 器炉：打造（化神，器炉 5 级；器炉建成前借用丹炉等级） ----------
// 每张有的器方一行：图标、名字（品阶色）、固定词条、材料够不够；能打的第一张【打造】是金的；没得到的器方收进详情
function showForge() {
  const open = L.gearOpen(st, 'forge');
  let goldUsed = false;
  const own = L.PLANS.filter(P => L.planOwned(st, P.id)), miss = L.PLANS.filter(P => !L.planOwned(st, P.id));
  const rows = own.map(P => {
    const B = L.gearBase(P.id), x = { id: P.id, slot: P.slot, t: P.t };
    const why = L.canForge(st, P.id), needs = L.planNeeds(st, P.id), gold = !why && !goldUsed; if (gold) goldUsed = true;
    return `<div class="card flat pn-frow">${gearImg(x, 2)}<div class="main"><div class="line">${pnName(`${L.GEAR_N[P.slot]}【${esc(P.n)}】`, P.t)}</div><div class="gaffs">${affChips(P.aff, true)}</div>
      <div class="muted">${esc(L.gearMainText(st, Object.assign({ plus: 0, aff: [] }, x)))}${B.xx ? ' · 老祖“请出手”每届 2 次' : ''}</div>
      <div class="fxs">${needs.map(n => `<span class="${n.ok ? 'jadet' : 'seal'}">${esc(n.t)} ${fmt(n.have)}/${fmt(n.need)}</span>`).join(' · ')}</div></div>
      <div class="right"><button class="btn sm ${gold ? 'gold' : 'alt'}" data-forge="${P.id}" ${why ? 'disabled' : ''}>打造</button></div></div>`;
  }).join('') || emptyNoteHTML('vault', '还没有器方：首领首杀、拍卖、宗门宝库会给。');
  const missRows = miss.map(P => `<div class="row pn-row" style="opacity:.65">${scrollImg()}<span class="grow">？？？ <span class="muted">${L.GEAR_N[P.slot]} · ${L.gearTierName(P.slot, P.t)} · ${esc(P.src)}</span></span></div>`).join('');
  const zt = Object.keys(st.gear.zhentu).map(id => `《${L.ZHENTU[id]}》`).join('、');
  const s = sheet({ title: '器炉 · 打造', sub: `${open ? `器炉 ${L.forgeLv(st)} 级` : '打造' + L.gearOpenWhy(st, 'forge')} · 灵矿 ${fmt(st.ore || 0)}`,
    body: rows + (missRows ? `<details class="more"><summary>没得到的器方 ${miss.length} 张</summary>${missRows}</details>` : '')
      + `<details class="more"><summary>器方、材料从哪来</summary><div class="muted">器方来自首领首杀、拍卖、宗门宝库与奇遇链；首领材料首杀 ×2，金丹后每 48 周天可再战一次 ×1。打成的法宝词条固定，走对比卡换上。器炉建成前借用丹炉等级。${zt ? `<br>阵图：${zt}` : ''}</div></details>`,
    foot: [{ t: '回法宝页', alt: true, fn: () => showGear() }] });
  s.querySelectorAll('[data-forge]').forEach(b => b.onclick = () => {
    const it = L.forge(st, b.dataset.forge);
    if (!it) return;
    SFX.gather(); flash(0.35);
    sheet({ title: '器炉开火', center: true, body: `<p class="center">炉火三日不熄，一件法宝出炉。</p>${gearLine(it)}`, foot: [{ t: '回器炉', alt: true, fn: showForge }, { t: '回法宝页', gold: true, fn: () => showGear(it.kind) }] });
  });
}
// ---------- 提醒：有能强化、成功率 ≥ 80% 的法宝，灵矿闲着（老祖气泡，每一级一次） ----------
function gearPlusTip() {
  if (!st.gear || L.busy(st) || !L.gearOpen(st, 'plus')) return;
  const s = L.gearPlusHint(st, 0.8); if (!s) return;
  const info = L.gearPlusInfo(st, s), x = info.x;
  const gain = fmt(info.a.p) !== fmt(info.b.p) ? `战力 ${fmt(info.a.p)} → ${fmt(info.b.p)}` : Math.abs(info.a.s - info.b.s) >= 0.05 ? `历练分数 ${sgn(info.a.s)} → ${sgn(info.b.s)}` : `修炼 +${dec(info.a.g)} → +${dec(info.b.g)}`;
  tip(`gplus_${s}_${x.u}_${x.plus}`, `灵矿 ${fmt(st.ore)} 闲着：${L.GEAR_N[s]}强化 +${x.plus + 1}（成功率 ${L.pct(info.rate)}）：${gain}。【人物】→ 法宝，点【强化】。`);
}

// ---------- 包裹（【人物】→ 属性 →【包裹】）：材料一格一样，图标 + 数量；点一格看从哪来、拿来干什么、去哪用 ----------
// 只列手里有的（数量 0 的不画）；丹药的丹囊归炼丹房（panel-alchemy.js），这里只给一格入口
const BAG_YIN_IC = { fire: 'yin_f', ice: 'yin_i', thunder: 'yin_t', wood: 'yin_w', soul: 'yin_s' };
function bagItems() {
  const g = st.gear || {}, out = [];
  const add = (grp, k, n, ic, have, from, use, go) => { if (have > 0) out.push({ grp, k, n, ic, have, from, use, go }); };
  add('常用', 'stones', '灵石', 'stone', st.stones, '历练、灵田、宗门俸禄、坊市卖货', '洞府建造与升级、坊市、强化');
  add('常用', 'herbs', '灵草', 'herb', st.herbs || 0, '采药历练、灵田、觅食的灵宠', '炼丹、灵宠进化、坊市行情好时卖', st.home && st.home.furnace ? ['炼丹', () => showAlchemy()] : null);
  add('常用', 'ore', '灵矿', 'ore', st.ore || 0, '斩妖历练、熔炼法宝、坊市、首领', '强化法宝、器炉打造', L.gearOpen(st, 'plus') ? ['去强化', () => showGear()] : null);
  add('常用', 'treasure', '天材地宝', 'treasure', st.treasure || 0, '首领、禁地、奇遇', '重铸法宝词条、洗髓丹、九转金丹', UI.isOpen('gearCmp') ? ['看法宝', () => showGear()] : null);
  add('常用', 'pills', '破境丹', 'pojing', st.pills || 0, '坊市、历练、丹炉', `突破时服下，成功率每枚 +${L.pct(L.BT.pill)}`);
  add('常用', 'feed', '兽粮', 'feed', st.feed || 0, '斩妖历练、觅食岗的灵宠、放生', '喂灵宠升级', L.petCount && L.petCount(st) ? ['去喂', () => showPets()] : null);
  const bagN = st.dan && st.dan.bag ? Object.keys(st.dan.bag).reduce((n, k) => n + ((st.dan.bag[k] || []).length), 0) : 0;
  add('常用', 'dan', '丹囊', 'danbag', bagN, '炼丹房炼出的疗伤、爆气、雷火丹', '负伤、对决、历练前服', ['丹囊', () => showAlchemy()]);
  add('常用', 'token', '秘境令', 'token', (st.mj && st.mj.token) || 0, '每年送一枚、奇遇', '进秘境', UI.isOpen('realm') ? ['去秘境', () => showExp()] : null);
  const yin = (st.mats && st.mats.yin) || {};
  for (const k of Object.keys(BAG_YIN_IC)) add('药引', 'yin_' + k, L.YIN_N[k], BAG_YIN_IC[k], yin[k] || 0, '灵田药引作物、坊市、觅食的灵宠', '药引丹方、灵宠进化、器方', st.home && st.home.furnace ? ['炼丹', () => showAlchemy()] : null);
  for (const k of Object.keys(g.mats || {})) add('材料', 'mat_' + k, L.BOSS_MAT[k], 'treasure', g.mats[k], '首领：首杀 ×2，金丹后再战 ×1', '器炉打造专属法宝', ['器炉', () => showForge()]);
  out.forEach(it => { if (it.k.startsWith('mat_') && ART.bossMat) { const k = +it.k.slice(4); it.img0 = ART.bossMat(k); it.imgKey = 'bmat|' + k; } });
  add('材料', 'plans', '器方', 'gscroll', Object.keys(g.plans || {}).length, '首领首杀、拍卖、宗门宝库、奇遇链', '器炉打造固定词条的法宝', ['器炉', () => showForge()]);
  for (const id of Object.keys((st.arts && st.arts.frag) || {})) if (!L.artOwned(st, id)) add('材料', 'frag_' + id, `《${L.art(id).n}》残篇`, 'frag', st.arts.frag[id], esc(L.art(id).src || '奇遇'), '集齐 3 片自动合成');
  for (const y of L.gearHeld ? L.gearHeld(st) : []) add('材料', 'held_' + y.u, L.gearBase(y.id).n, null, 1, '首领、器方、奇遇', `${L.GEAR_N[y.slot]}槽${L.gearOpenWhy(st, y.slot)}，到时自动戴上`, null);
  out.forEach(it => { if (it.k.startsWith('held_')) it.img = gearImg(L.gearHeld(st).find(y => 'held_' + y.u === it.k), 1.5); });
  return out;
}
const bagImg = (it, want) => it.img || (it.img0 ? `<img class="px" src="${urlOf(it.img0, it.imgKey)}" style="width:${pxFit(16, want)}px;height:${pxFit(16, want)}px;flex:none" alt="">` : '') || artIcon(it.ic, want) || iconHTML('bag', want);
// “新”角标：材料、药引比上次打开包裹时多了的格子挂 ART.newBadge；上次看过的数量记在 st.flags.bagSeen（打开包裹即记下，这一次开着的时候角标不消失）
const bagNewGrp = it => it.grp === '材料' || it.grp === '药引';
let bagSel = '', bagNew = new Set();
function showBag(sel) {
  const items = bagItems();
  if (sel === undefined) {
    const seen = st.flags.bagSeen || {};
    bagNew = new Set(items.filter(it => bagNewGrp(it) && st.flags.bagSeen && it.have > (seen[it.k] || 0)).map(it => it.k));
    const now = {}; for (const it of items) if (bagNewGrp(it)) now[it.k] = it.have;
    st.flags.bagSeen = now;
  }
  if (sel !== undefined) bagSel = sel;
  if (!items.some(it => it.k === bagSel)) bagSel = items[0] ? items[0].k : '';
  const cur = items.find(it => it.k === bagSel);
  const det = cur ? `<div class="pn-bagdet">${bagImg(cur, 32)}<div class="grow"><div class="line"><b class="pn-nm">${esc(cur.n)}</b><span class="num pn-key">${fmt(cur.have)}</span></div>
      <div class="muted">来源：${cur.from}</div><div class="muted">用途：${cur.use}</div></div>${cur.go ? `<button class="btn sm gold" id="bagGo">${cur.go[0]}</button>` : ''}</div>` : '';
  const grps = [...new Set(items.map(it => it.grp))];
  const grid = grps.map(gp => `<div class="pn-bagh">${gp}</div><div class="pn-bag">${items.filter(it => it.grp === gp).map(it => `<button class="pn-tile${it.k === bagSel ? ' sel' : ''}" data-bag="${it.k}"><span class="pn-tic">${bagImg(it, 24)}${bagNew.has(it.k) ? newBadgeHTML(pxFit(16, 24) * 10 / 16) : ''}</span><b class="num">${fmt(it.have)}</b><span>${esc(it.n)}</span></button>`).join('')}</div>`).join('');
  const s = sheet({ title: shellTitle('gear'), still: sel !== undefined, body: meTabs('bag') + (items.length ? det + grid : emptyNoteHTML('vault', '包裹是空的：去历练捡点东西。')) });
  s.querySelectorAll('[data-bag]').forEach(b => b.onclick = () => { SFX.tap(); showBag(b.dataset.bag); });
  const gb = s.querySelector('#bagGo'); if (gb && cur && cur.go) gb.onclick = () => { SFX.tap(); cur.go[1](); };
}
// 人物页属性页上的【包裹】入口：带三样最多的材料的小图标与数量
function bagBtnHTML() {
  const items = bagItems().filter(it => it.k !== 'stones');
  if (!items.length) return '';
  return `<button class="btn alt pn-bagbtn" id="btnBag"><span class="pn-bagic">${items.slice(0, 3).map(it => `${bagImg(it, 16)}<span class="num">${fmt(it.have)}</span>`).join('')}</span><span>包裹 ▸</span></button>`;
}
