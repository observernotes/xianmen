/* 废柴仙途 · 界面片段 panel-gear：法宝页（【人物】→ 法宝）、对比卡（换上 / 熔炼 / 锁定当前）、强化（点一下一次，长按连强）、重铸、器炉打造
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * SYSTEMS §3：三格 + 每格下【强化】；新掉落只弹对比卡，不选就熔成灵矿（没有背包）。
 * 数字一律取自逻辑层：L.gearDelta（对比卡的前后）、L.gearPlusInfo（强化前后）、L.gearMainText（主属性）、L.planNeeds（器方材料）。 */
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
// 对比卡、强化预览里的一组“前 → 后”（只列有变化的）
function gearDeltaRows(a, b, k) {
  const d = [], arrow = (x, y) => (y > x ? '<span class="jadet">▲</span>' : '<span class="seal">▼</span>');
  if (fmt(a.p) !== fmt(b.p)) d.push(`<dt>战力</dt><dd class="num">${fmt(a.p)} → <b>${fmt(b.p)}</b> ${arrow(a.p, b.p)}</dd>`);
  if (dec(a.g) !== dec(b.g)) d.push(`<dt>修炼/周天</dt><dd class="num">+${dec(a.g)} → <b>+${dec(b.g)}</b> ${arrow(a.g, b.g)}</dd>`);
  if (Math.abs(a.s - b.s) >= 0.05) d.push(`<dt>历练分数</dt><dd class="num">${sgn(a.s)} → <b>${sgn(b.s)}</b>（${esc(L.REGIONS[k].n)}斩妖） ${arrow(a.s, b.s)}</dd>`);
  if (a.pact !== undefined && a.pact !== null && L.pct(a.pact) !== L.pct(b.pact)) d.push(`<dt>约战胜算</dt><dd class="num">${L.pct(a.pact)} → <b>${L.pct(b.pact)}</b> ${arrow(a.pact, b.pact)}</dd>`);
  if (a.inc !== undefined && Math.abs(a.inc - b.inc) > 0.004) d.push(`<dt>历练灵石</dt><dd class="num">×${dec2(a.inc)} → <b>×${dec2(b.inc)}</b> ${arrow(a.inc, b.inc)}</dd>`);
  if (a.life !== undefined && fmt(a.life) !== fmt(b.life)) d.push(`<dt>寿元</dt><dd class="num">${fmt(a.life)} → <b>${fmt(b.life)}</b> 岁 ${arrow(a.life, b.life)}</dd>`);
  if (a.luck !== undefined && Math.abs(a.luck - b.luck) > 0.0005) d.push(`<dt>奇遇把握</dt><dd class="num">+${L.pct(a.luck)} → <b>+${L.pct(b.luck)}</b> ${arrow(a.luck, b.luck)}</dd>`);
  if (a.trib !== undefined && Math.abs(a.trib - b.trib) >= 0.05) d.push(`<dt>天劫承劫</dt><dd class="num">${dec(a.trib)}% → <b>${dec(b.trib)}%</b> ${arrow(a.trib, b.trib)}</dd>`);
  return d;
}
const sgn = v => (v >= 0 ? '+' : '−') + dec(Math.abs(v));

// ---------- 对比卡：新掉落【换上】/【熔炼】/【锁定当前】（不选 = 熔炼） ----------
function gearCmpHTML(x) {
  const B = L.gearBase(x.id), cur = st.gear[x.slot], D = L.gearDelta(st, x), inh = D.inh[1];
  const a = Object.assign({}, D.a, { pact: st.pact ? null : L.pactInfo(st).p }), b = Object.assign({}, D.b);
  b.pact = st.pact ? null : L.gearTry(st, x, () => L.pactInfo(st).p);
  const rows = gearDeltaRows(a, b, D.k);
  const curLine = cur ? `<div class="gcur">${gearImg(cur, 1.5)}<span class="grow">现在：${esc(L.gearBase(cur.id).n)}${plusTag(cur.plus)} · ${esc(L.gearMainText(st, cur))} ${affChips(cur.aff)}</span></div>` : '';
  const notes = [];
  if (cur && cur.plus) notes.push(`强化继承一半：+${cur.plus} → <b>+${inh}</b>`);
  if (cur) notes.push(`换下的【${esc(L.gearBase(cur.id).n)}】熔成灵矿 +${D.smeltCur}`);
  notes.push('不选就熔炼');
  return `<div class="gcmp${D.better ? ' better' : ''}" data-gcmp="${x.u}" data-better="${D.better ? 1 : 0}" style="border-left-color:${gTierBorder(x.t)}">
    <div class="row">${gearImg(x, 2.5)}<div class="grow"><div class="line">${gTierTag(x.slot, x.t)}<span>${L.GEAR_N[x.slot]}【${esc(B.n)}】${inh ? `<span class="gplusn">+${inh}</span>` : ''}</span>${D.better ? '<span class="chip ok">更强</span>' : ''}</div>
      <div class="muted">${esc(L.gearMainText(st, x, inh))}</div>${x.aff.length ? `<div class="gaffs">${affChips(x.aff, !!B.fixed)}</div><div class="muted fxs">${x.aff.map(q => esc(L.gearAffText(q))).join('；')}</div>` : ''}</div></div>
    ${curLine}
    ${rows.length ? `<dl class="grid2 delta">${rows.join('')}</dl>` : '<div class="muted">数值上和现在的差不多</div>'}
    <div class="gbtns"><button class="btn sm ${D.better ? 'gold' : 'alt'}" data-geq="${x.u}">换上</button><button class="btn sm ${D.better ? 'alt' : 'gold'}" data-gsm="${x.u}">熔炼 ${oreImg(pxs(8, 2))}+${D.smelt}</button>${cur ? `<button class="btn sm alt" data-glk="${x.u}">锁定当前</button>` : ''}</div>
    <div class="muted fxs">${notes.join(' · ')}${cur ? `；锁定当前：以后低于 ${cur.t} 阶的${L.GEAR_N[x.slot]}直接熔炼、不再弹卡` : ''}</div></div>`;
}
// 掉落一行：待决定的弹对比卡；已经装上 / 自动熔掉的写一句
function gearLine(it) {
  const x = it.gear;
  if (it.pend && L.gearPend(st, x.u)) return gearCmpHTML(x);
  const B = L.gearBase(x.id);
  const head = `${gearImg(x, 2)}<div class="grow"><div class="line">${gTierTag(x.slot, x.t)}<span>${L.GEAR_N[x.slot]}【${esc(B.n)}】${plusTag(x.plus)}</span></div><div class="muted">${esc(L.gearMainText(st, x))}</div>${x.aff.length ? `<div class="gaffs">${affChips(x.aff, !!B.fixed)}</div>` : ''}</div>`;
  const tail = it.hold ? `<span class="muted">先收着：${L.GEAR_N[x.slot]}槽${L.gearOpenWhy(st, x.slot)}，到时自动戴上</span>` : it.equip ? '<span class="chip ok">已装上</span>' : it.smelt !== undefined ? `<span class="muted">熔成灵矿 +${it.smelt}${it.closed ? `（${L.GEAR_N[x.slot]}槽${L.gearOpenWhy(st, x.slot)}）` : it.auto ? '（已锁定）' : ''}</span>` : st.gear[x.slot] === x ? '<span class="chip ok">已换上</span>' : '<span class="muted">已处理</span>';
  return `<div class="quote gline"><div class="row">${head}${tail}</div></div>`;
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
    updateHUD();
  });
  act('[data-geq]', 'equip'); act('[data-gsm]', 'smelt'); act('[data-glk]', 'lock');
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
let gearSel = 'w', gearMsg = '', gearHold = null;
const GSLOT_HEAD = { w: '兵器 · 战力', r: '法衣 · 护体', o: '饰品' };
function showGear(sel, still) {
  if (sel) gearSel = sel;
  const g = st.gear;
  const slots = L.GEAR_SLOTS.map(s => {
    const open = L.gearOpen(st, s), x = open ? g[s] : null;
    const cls = 'aslot gslot' + (s === gearSel ? ' sel' : '') + (open ? '' : ' lock');
    let inner;
    if (!open) inner = `<span class="k">${GSLOT_HEAD[s]}</span>${iconHTML('bag', pxs(16, 2))}<span>未开放</span><span class="muted">${L.gearOpenWhy(st, s)}</span>`;
    else if (!x) inner = `<span class="k">${GSLOT_HEAD[s]}</span><span class="aempty">空</span><span class="muted">${s === 'w' ? '赤手空拳 ×1' : '历练、寻宝、首领会掉'}</span>`;
    else { const B = L.gearBase(x.id); inner = `<span class="k">${s === 'o' ? '饰品 · ' + L.ACC_KIND[B.kind].n : GSLOT_HEAD[s]}${g.lock[s] ? ' <span class="chip">锁</span>' : ''}</span>${gearImg(x, 2.5)}<span class="nm">${esc(B.n)}${plusTag(x.plus)}</span><span>${gTierTag(s, x.t)}</span><span class="num goldt fxs">${esc(L.gearMainText(st, x).split(' · ')[0])}</span><span class="gaffs">${affChips(x.aff, !!B.fixed)}</span>`; }
    // 每格下的【强化】：点一下一次，长按连强
    let btn = '';
    if (open && x && L.gearOpen(st, 'plus')) {
      const why = L.gearPlusWhy(st, s), rate = L.gearPlusRate(st, x), c = L.gearPlusCost(st, x);
      btn = x.plus >= L.PLUS.max ? '<button class="btn sm alt gplusb" disabled>已 +9</button>' : `<button class="btn sm ${why ? 'alt' : 'gold'} gplusb" data-plus="${s}" ${why ? 'disabled' : ''}>强化 +${x.plus}→+${x.plus + 1}<small>${L.pct(rate)} · ${oreImg(pxs(8, 2))}${fmt(c.ore)}</small></button>`;
    } else if (open && x) btn = `<button class="btn sm alt gplusb" disabled>强化<small>${L.gearOpenWhy(st, 'plus')}</small></button>`;
    return `<div class="gcell"><div class="${cls}" data-gslot="${s}" style="${x ? 'border-top:3px solid ' + gTierBorder(x.t) : ''}">${inner}</div>${btn}</div>`;
  }).join('');
  // 选中格的详情：主属性全文、强化前后、词条与重铸、锁定当前
  const x = L.gearOpen(st, gearSel) ? g[gearSel] : null;
  let det = '';
  if (x) {
    const B = L.gearBase(x.id), info = L.gearPlusInfo(st, gearSel);
    const pRows = info && !info.max ? gearDeltaRows(info.a, info.b, info.k) : [];
    const plusLine = !L.gearOpen(st, 'plus') ? `<div class="muted">强化${L.gearOpenWhy(st, 'plus')}</div>`
      : info.max ? '<div class="goldt">已强化到 +9</div>'
      : `<div class="gplusinfo"><div>强化 +${x.plus} → +${x.plus + 1}：成功率 <b>${L.pct(info.rate)}</b>${x.fail ? `（保底：已失败 ${x.fail} 次，每次 +${Math.round(L.PLUS.pity * 100)}%）` : ''} · 灵矿 ${fmt(info.cost.ore)} · 灵石 ${fmt(info.cost.stones)}</div>${pRows.length ? `<dl class="grid2 delta">${pRows.join('')}</dl>` : ''}${info.why ? `<div class="seal">${esc(info.why)}</div>` : ''}</div>`;
    const affRows = x.aff.map((a, i) => {
      const why = L.gearReforgeWhy(st, gearSel, i);
      return `<div class="garow"><span class="gaff${B.fixed ? ' fixed' : ''}">${affImg(a)}${L.AFFIX[a].n}</span><span class="grow muted">${esc(L.AFFIX[a].d)}</span>${B.fixed ? '<span class="muted">固定</span>' : `<button class="btn sm ${why ? 'alt' : 'gold'} eq" data-rf="${i}" ${why ? 'disabled' : ''}>重铸</button>`}</div>`;
    }).join('') || '<div class="muted">没有词条</div>';
    det = `<div class="gdet" style="border-left-color:${gTierBorder(x.t)}"><div class="row">${gearImg(x, 3)}<div class="grow"><div class="line">${gTierTag(x.slot, x.t)}<span>${L.GEAR_N[x.slot]}【${esc(B.n)}】${plusTag(x.plus)}</span>${B.el ? elChip(B.el) : ''}</div><div>${esc(L.gearMainText(st, x))}</div>${B.note ? `<div class="jadet">${esc(B.note)}</div>` : ''}${B.xx ? '<div class="jadet">老祖“请出手”：每届论道、会武各 2 次，输掉的一场重来</div>' : ''}</div></div>
      ${gearMsg ? `<div class="quote">${gearMsg}</div>` : ''}${plusLine}
      <div class="muted">词条${B.fixed ? '（固定）' : `（重铸：花天材地宝 1 重抽一条，二选一保留；你有 ${st.treasure}）`}</div>${affRows}
      <div class="row"><span class="grow muted">${g.lock[gearSel] ? `已锁定：低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼、不弹卡` : `锁定当前：以后低于 ${x.t} 阶的${L.GEAR_N[gearSel]}直接熔炼`}</span><button class="btn sm alt eq" data-glock="${gearSel}">${g.lock[gearSel] ? '解锁' : '锁定当前'}</button></div></div>`;
  } else if (L.gearOpen(st, gearSel)) det = `<div class="muted">${L.GEAR_N[gearSel]}槽空着：历练（斩妖、寻宝）、坊市寻宝、首领、宗门宝库、奇遇都能得到，得到就直接装上。</div>`;
  else det = `<div class="muted">${L.GEAR_N[gearSel]}槽${L.gearOpenWhy(st, gearSel)}。</div>`;
  // 重铸的二选一
  const rf = g.rf;
  const rfCard = rf ? `<div class="gcmp better" id="gRf"><div>重铸【${esc(L.gearBase(st.gear[rf.slot].id).n)}】：二选一保留</div><div class="gbtns"><button class="btn sm alt" data-rfk="0"><span class="gaff">${affImg(rf.old)}${L.AFFIX[rf.old].n}</span> 保留旧的</button><button class="btn sm gold" data-rfk="1"><span class="gaff">${affImg(rf.neu)}${L.AFFIX[rf.neu].n}</span> 换成新的</button></div><div class="muted fxs">旧：${esc(L.AFFIX[rf.old].d)}；新：${esc(L.AFFIX[rf.neu].d)}</div></div>` : '';
  const open = g.pend.filter(y => !y.hold), held = L.gearHeld(st);
  const pend = (open.length ? `<div class="seal">还有 ${open.length} 件新得的法宝没决定（离开这页就熔成灵矿）</div>` + open.map(gearCmpHTML).join('') : '')
    + (held.length ? `<div class="muted">收着：${held.map(y => `【${esc(L.gearBase(y.id).n)}】（${L.GEAR_N[y.slot]}槽${L.gearOpenWhy(st, y.slot)}）`).join('、')}，槽一开自动戴上</div>` : '');
  // 器炉与材料
  const nPlan = Object.keys(g.plans).length, mats = Object.keys(g.mats).filter(k => g.mats[k] > 0).map(k => `${L.BOSS_MAT[k]} ×${g.mats[k]}`).join('、');
  const forge = `<div class="grow-sec"><h3>器方与打造<span>${nPlan} / ${L.PLANS.length} 张</span></h3>
    <div class="row">${scrollImg()}<span class="grow">${L.gearOpen(st, 'forge') ? '器炉已能开火：用首领材料与灵矿打出固定词条的专属法宝。' : `打造${L.gearOpenWhy(st, 'forge')}。`}${mats ? `<br><span class="muted">首领材料：${mats}</span>` : ''}</span><button class="btn sm alt eq" id="btnForge">器炉 ▸</button></div></div>`;
  const body = meTabs('gear') + `<div class="gres">${oreImg()} 灵矿 <b class="num">${fmt(st.ore || 0)}</b> · 天材地宝 ${st.treasure} · 灵石 ${fmt(st.stones)}</div>
    ${rfCard}${pend}<div class="aslots gslots">${slots}</div>${det}
    <div class="sep"></div>${forge}
    <div class="muted">强化：每级让主属性的超出部分 +${Math.round(L.PLUS.step * 100)}%（兵器 +9 约 ×1.3～1.5）；成功率 100%→40%，失败不掉级，下次 +10%。换装备时强化继承一半。<br>灵矿：历练（斩妖 ×${L.ORE.slay}，黑风岭 ×2、剑冢 ×3、星墟 ×4）、熔炼（4 × 2^阶）、坊市一筐、宗门器堂、首领、奇遇。</div>`;
  const s = sheet({ title: '人物', body, still });
  bindMeTabs(s);
  s.querySelectorAll('[data-gslot]').forEach(b => b.onclick = () => { SFX.tap(); gearMsg = ''; showGear(b.dataset.gslot, true); });
  s.querySelectorAll('[data-plus]').forEach(b => bindPlusButton(b));
  s.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { if (L.gearReforge(st, gearSel, +b.dataset.rf)) { SFX.reveal(3); showGear(gearSel, true); } });
  s.querySelectorAll('[data-rfk]').forEach(b => b.onclick = () => { const r = L.gearReforgeKeep(st, b.dataset.rfk === '1'); if (r) { SFX.coin(); gearMsg = `重铸：保留「${L.AFFIX[r.keep].n}」`; showGear(gearSel, true); } });
  const lk = s.querySelector('[data-glock]'); if (lk) lk.onclick = () => { SFX.tap(); L.gearLock(st, lk.dataset.glock, !st.gear.lock[lk.dataset.glock]); showGear(gearSel, true); };
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
  } else { SFX.fail(); gearMsg = `<span class="seal">强化失败</span>：灵矿 ${fmt(r.cost.ore)} 打了水漂，不掉级；下次成功率 ${L.pct(L.gearPlusRate(st, r.x))}（保底 +${Math.round(L.PLUS.pity * 100)}%）`; }
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
  b.onclick = e => { e.preventDefault(); if (gearHold && gearHold.fired) { gearHold = null; return; } gearHold = null; const r = doPlus(slot); if (r) { showGear(slot, true); forgeFx(slot, r.ok ? 'ok' : 'fail'); } };
  b.onpointerdown = () => {
    stopHold();
    gearHold = { slot, fired: false, t: setTimeout(function rep() {
      if (!gearHold) return;
      gearHold.fired = true;
      if (L.gearPlusWhy(st, slot)) { stopHold(true); return; }
      const r = doPlus(slot);
      showGear(slot, true); forgeFx(slot, r && r.ok ? 'ok' : 'fail');
      if (gearHold) gearHold.t = setTimeout(rep, 220);
    }, 450) };
  };
}
function stopHold(keep) { if (gearHold && gearHold.t) clearTimeout(gearHold.t); if (gearHold) gearHold.t = 0; if (!keep && gearHold && !gearHold.fired) gearHold = null; }
document.addEventListener('pointerup', () => stopHold(true));
document.addEventListener('pointercancel', () => stopHold(true));

// ---------- 器炉：打造（化神，器炉 5 级；器炉建成前借用丹炉等级） ----------
function showForge() {
  const open = L.gearOpen(st, 'forge');
  const rows = L.PLANS.map(P => {
    const own = L.planOwned(st, P.id), B = L.gearBase(P.id), x = { id: P.id, slot: P.slot, t: P.t };
    if (!own) return `<div class="card flat" style="opacity:.6">${scrollImg()}<div class="main"><div>？？？ <span class="muted">（${L.GEAR_N[P.slot]} · ${L.gearTierName(P.slot, P.t)}）</span></div><div class="muted">器方来源：${esc(P.src)}</div></div></div>`;
    const why = L.canForge(st, P.id), needs = L.planNeeds(st, P.id);
    return `<div class="card flat">${gearImg(x, 2)}<div class="main"><div class="line">${gTierTag(P.slot, P.t)}<span>${L.GEAR_N[P.slot]}【${esc(P.n)}】</span></div><div class="gaffs">${affChips(P.aff, true)}</div>
      <div class="muted">${esc(L.gearMainText(st, Object.assign({ plus: 0, aff: [] }, x)))}${B.xx ? ' · 老祖“请出手”每届 2 次' : ''}</div>
      <div class="fxs">${needs.map(n => `<span class="${n.ok ? 'jadet' : 'seal'}">${esc(n.t)}（${fmt(n.have)}/${fmt(n.need)}）</span>`).join(' · ')}</div></div>
      <div class="right"><button class="btn sm ${why ? 'alt' : 'gold'}" data-forge="${P.id}" ${why ? 'disabled' : ''}>打造</button></div></div>`;
  }).join('');
  const zt = Object.keys(st.gear.zhentu).map(id => `《${L.ZHENTU[id]}》`).join('、');
  const s = sheet({ title: '器炉 · 打造', sub: `${open ? `器炉 ${L.forgeLv(st)} 级（借用丹炉）` : '打造' + L.gearOpenWhy(st, 'forge')} · 灵矿 ${fmt(st.ore || 0)} · 灵草 ${fmt(st.herbs)}`,
    body: rows + `${zt ? `<div class="muted">阵图（阵法上线后可布）：${zt}</div>` : ''}<div class="muted">器方来自首领首杀、拍卖、宗门宝库与奇遇链；首领材料首杀 ×2，金丹后每 48 周天可再战一次 ×1。打成的法宝词条固定，走对比卡换上。</div>`,
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
