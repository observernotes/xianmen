/* 废柴仙途 · 界面片段 panel-growth：数值拆解与大事锦囊
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 变强之道（数值拆解） ----------
function showGrowth(focus) {
  const p = st.p, B = L.breakdown(st);
  const mx = v => (v >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.?0+$/, '');
  const upBtn = k => { const b = L.HOME.find(x => x.k === k), lv = st.home[k]; if (!L.homeOpen(st, k)) return `<span class="muted">${esc(L.homeLock(st, k) || '未解锁')}</span>`; if (lv >= b.max) return '<span class="muted">满级</span>'; const c = L.hCost(k, lv); return `<button class="btn sm ${st.stones >= c ? 'gold' : 'alt'}" data-up="${k}" ${st.stones >= c ? '' : 'disabled'}>升级 ${fmt(c)}</button>`; };
  const goBtn = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const row = (n, m, act, tip) => `<div class="grow-row"><span class="gn">${esc(n)}</span><span class="gm ${m < 1 ? 'low' : ''}">${typeof m === 'number' ? '×' + mx(m) : m}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const act = { talent: () => goBtn('洗髓丹', 'alch'), art: () => goBtn('功法', 'arts'), array: () => upBtn('array'), gear: () => goBtn('法宝', 'gear'), pet: () => (L.petCount(st) ? goBtn('兽栏', 'pets') : goBtn('灵兽蛋', 'market')), field: () => upBtn('field'), sect: () => goBtn('宗门', 'sect'), alch: () => goBtn('炼丹房', 'alch') };
  const tips = {
    talent: '灵根是天生的，炼丹房的洗髓丹能提升一品（需要天材地宝）。',
    art: '功法三槽：心法管修炼、战技管战力与攻击属性、秘术给特效；练久了有熟练，凑对了有共鸣。来自历练、寻宝、宗门宝库、首领与奇遇。',
    array: `下一级 ×${mx(L.arrayMult(st.home.array + 1))}，灵石最该花在这里。`,
    gear: '法宝三槽：兵器管战力，法衣管历练分数与负伤，饰品给修炼、财运、气运或寿元。来自历练掉落、首领、坊市寻宝、宗门宝库；灵矿强化，超出部分每级 +6%。',
    pet: '出战的灵宠给战力倍率：喂兽粮升级（每级超出部分 +5%），5 级进化、10 级觉醒各升一阶。灵宠来自坊市灵兽蛋、采药偶遇、奇遇与宗门；其余的派去洞府岗位干活。',
    field: `灵石只来自种灵稻的田（现在 ${L.riceCount(st)}/${L.plotCount(st)} 块）；全种灵稻时下一级每周天 ${fmt(L.fieldInc(st.home.field + 1))} 灵石。灵草、兽粮、药引看【洞府】→ 灵田。`,
    alch: '炼丹房的丹药：爆气丹管下一场对决或下一趟历练，聚灵丹管 6 周天修炼。',
  };
  const sec = (key, title, total, baseName, base, parts, extra) => `<div class="grow-sec" id="g-${key}"><h3>${title}<span>${total}</span></h3>
    ${baseName ? row(baseName, fmt(base), '', '') : ''}${parts.map(([n, m, k]) => row(n, m, k && act[k] ? act[k]() : '', k && tips[k] ? tips[k] : '')).join('')}${extra || ''}</div>`;
  const nxt = p.r >= L.MAXR ? '飞升' : L.REALMS[p.r + 1].n;
  const btn = Math.min(L.BT.maxPills, st.pills), bt = L.tribNeeded(st) ? L.tribRate(st, { pills: btn }) : L.btRate(st, btn);   // 金丹起按天劫算（元婴劫起封顶，L.tribTop）
  const body = [
    `<div class="muted">每项数值 = 基础 × 各项加成。点右边的按钮直接去提升。</div>`,
    sec('cul', '修炼速度', '+' + fmt(B.gain) + ' /周天', '境界基础（' + L.stageName(p) + '）', B.baseCul, B.cul,
      row('运功吐纳', `${Math.floor(Math.min(st.tuna || 0, L.TUNA_FULL))}/${L.TUNA_FULL}`, '', `在洞府打坐时吐纳环每周天蓄 1/${L.TUNA_FULL}，蓄满后点画面里的自己，立得 1 周天修为（+${dec(L.gainCalm(st))}）。`) +
      row('闭关', L.retOpen(st) ? '×' + L.retInfo(st).m.toFixed(2) : '未解锁', goBtn('洞府', 'home'), `4 周天修炼 ×${L.retBaseMult(st).toFixed(2)}，花费 ${fmt(L.retCost(st))} 灵石；连着闭关每次 −${L.RET.fatigue}，出门历练一趟就恢复。历练途中修炼 ×0.5。`)),
    sec('atk', '战力', fmt(B.power), '境界基础（' + L.stageName(p) + '）', B.baseAtk, B.atk,
      row('突破大境界', '大幅', '', '每升一个大境界，战力翻好几倍。战力决定历练成功率、论道和会武胜负。')),
    sec('inc', '灵石收入', '+' + fmt(B.income) + ' /周天', '', 0, B.inc.map(([n, v, k]) => [n, '+' + fmt(v), k]),
      row('历练', '大头', goBtn('去历练', 'exp'), '历练带回的灵石远比每周天收入多。') + (st.sect ? '' : row('宗门俸禄', '未入宗', '', '筑基后拜入宗门，每周天领俸禄。'))),
    `<div class="grow-sec" id="g-bt"><h3>冲击${nxt}成功率<span>${L.pct(bt)}</span></h3>
      ${L.btParts(st, btn).filter(([k]) => !/^(丹炉|破境丹)/.test(k)).map(([k, v]) => row(k, k === '基础' ? L.pct(v) : (v < 0 ? '−' : '+') + L.pct(Math.abs(v)), '', '')).join('')}
      ${L.tribNeeded(st) ? row('护劫手段', `眼下最多 +${L.pct(['fa', 'pet', 'daolv', 'zhen'].reduce((a, k) => { const A = L.aidInfo(st, k); return a + (A.ok ? A.v : 0); }, 0) + L.TRIB.maxPill * L.TRIB.pill)}`, '', `${L.tribTop(st) < 1 ? `天劫最多 ${L.pct(L.tribTop(st))}（每败一次 +${L.pct(L.BT.fail)}），超出的不算。` : ''}金丹起渡雷劫时用：祭法宝 +${L.pct(L.TRIB.fa)}、灵宠挡劫 +${L.pct(L.TRIB.pet)}、道侣护法 +${L.pct(L.TRIB.daolv)}、渡劫阵（聚灵阵每级 +1%），雷劫中途那一停还能临阵吞丹（每枚 +${L.pct(L.TRIB.pill)}，最多 ${L.TRIB.maxPill} 枚）。`) : ''}
      ${row('丹炉 Lv' + st.home.furnace, '+' + L.pct(st.home.furnace * L.BT.furnace), upBtn('furnace'), `每级突破 +${L.pct(L.BT.furnace)}，还能炼丹。`)}
      ${row('破境丹 ×' + st.pills, `每枚 +${L.pct(L.BT.pill)}`, goBtn('去买', 'market'), `一次最多服 ${L.BT.maxPills} 枚。坊市、历练（${L.pct(L.EXP_PILL)} 掉一枚）、炼丹都能得到；负伤时也能服一枚疗伤。`)}
      ${L.btGuard(st) ? row('老祖护法', '必成', '', '第一世头一回冲击筑基，老祖护法必成。') : ''}</div>`,
    `<div class="grow-sec" id="g-life"><h3>寿元<span>${Math.floor(p.age)} / ${p.r >= 9 ? '∞' : fmt(L.lifespan(st))} 岁</span></h3>
      ${row('洞府 Lv' + st.home.cave, '+' + st.home.cave * 5 + '%', upBtn('cave'), '洞府每级寿元 +5%。')}
      ${row('延寿丹', '+10%', goBtn('去买', 'market'), '每个大境界最多三枚。')}
      ${row('突破大境界', '翻倍', '', '境界越高寿元越长。寿元耗尽会坐化转世。')}</div>`,
  ].join('<div class="sep"></div>');
  const s = sheet({ title: '变强之道', sub: `灵石 ${fmt(st.stones)} · 破境丹 ${st.pills} · 灵草 ${fmt(st.herbs)}`, body });
  s.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { if (L.upgrade(st, b.dataset.up)) { SFX.coin(); showGrowth(focus); } });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.go; if (k === 'alch') { if (st.home.furnace) showAlchemy(); else showHome(); } else GO[k](); });
  if (focus && focus !== 'all') { const el = s.querySelector('#g-' + focus); if (el) el.scrollIntoView({ block: 'start' }); }
}
$('#stats').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (!b || !st || cine) return; ac(); SFX.tap(); if (b.dataset.s === 'big') showBig(); else showGrowth(b.dataset.s); });
// “大事”牌：筑基（历法开放）之后点开是年历；之前照旧是三年之约的锦囊
function showBig() {
  if (L.calOpen(st)) { showCalendar(); return; }
  const nb = L.nextBig(st);
  if (nb.k === 'tour') { showMe('rank'); return; }
  if (nb.k === 'meet') { showSect(); return; }
  showPact();
}
// 三年之约的锦囊：每条办法算出做完之后的新胜算（DESIGN §4.4），过滤掉不可行和涨不到 3% 的，按新胜算排序取前三
function pactTips() {
  const pi = L.pactInfo(st), p = st.p, out = [];
  const with_ = (m, assist) => L.duelP(st, pi.base * m * (assist === undefined ? pi.assist : assist), pi.Q, L.PACT_FOE);
  if (p.inj > 0) out.push({ t: '先疗伤', cost: L.canHeal(st) ? '破境丹 1 枚' : `歇 ${p.inj} 周天`, p: with_(1 / 0.6), go: 'home' });
  if (p.r === 0 && !L.isFull(st)) {
    const n = L.ticksToStage(st, L.si(p) + 1);
    if (n < pi.left) out.push(p.s === 3 ? { t: '修满后突破筑基', cost: `约 ${n} 周天修满，再冲一次${L.btGuard(st) ? '（老祖护法必成）' : ''}`, p: with_(btPowerMult(), 1), go: L.retOpen(st) ? 'home' : 'exp' }
      : { t: `修到炼气${L.STAGES[p.s + 1]}`, cost: `照现在约 ${n} 周天（闭关更快）`, p: with_(L.P.pwStage), go: L.retOpen(st) ? 'home' : 'exp' });
  }
  if (p.r === 0 && L.isFull(st)) out.push({ t: '突破筑基', cost: L.btGuard(st) ? '老祖护法必成' : '成功率 ' + L.pct(L.btRate(st, Math.min(3, st.pills))), p: with_(btPowerMult(), 1), go: 'cult' });
  // 法宝（SYSTEMS §3 / §17 锦囊候选）：换一件高一阶的兵器；兵器强化到下一级（一下完成，胜算当场重算）
  const wt = L.gearTier(st, 'w');
  if (wt < L.boxCap(st, 'w')) { const nx = { id: `w${wt + 1}_0`, slot: 'w', t: wt + 1, plus: 0, aff: [] }; out.push({ t: `换一件${L.WEAPONS[wt + 1].n}`, cost: `寻宝 ${fmt(L.price(st, 'box'))} 或历练掉落`, p: with_(L.gearTry(st, nx, () => L.power(st)) / L.power(st)), go: navLock('market') ? 'exp' : 'market' }); }
  const pw = L.gearOpen(st, 'plus') && st.gear.w && L.gearPlusInfo(st, 'w');
  if (pw && !pw.max && !pw.why) out.push({ t: `兵器强化 +${pw.x.plus + 1}：战力 ${fmt(pw.a.p)} → ${fmt(pw.b.p)}`, cost: `灵矿 ${fmt(pw.cost.ore)} · 灵石 ${fmt(pw.cost.stones)} · 成功率 ${L.pct(pw.rate)}`, p: pw.b.pact, go: 'plus:w', btn: '强化', keep: true });
  // 战斗类丹（SYSTEMS §5 / §17 锦囊候选）：丹囊里有爆气丹就“服一枚爆气丹：胜算 p → p'”；没有但炼得出就写炼一枚
  const bq = baoqiTip(m => with_(m));
  if (bq) out.push(bq);
  if (!L.petCount(st) && L.marketOpen(st, 'egg')) out.push({ t: '收一只灵宠', cost: `灵兽蛋 ${fmt(L.price(st, 'egg'))}`, p: with_(L.PETS[1].m), go: 'market' });
  // 灵宠升到下一级（SYSTEMS §17 锦囊候选）：兽粮够就写一口气喂到下一级的胜算
  const op = L.petOut(st), oi = st.petOut;
  if (op && !L.petFeedWhy(st, oi) && (st.feed || 0) >= L.petNeed(op) - op.xp) { const m1 = L.petTry(st, () => { st.pets[oi].lv++; }, () => L.petAtkOf(st, st.pets[oi])); out.push({ t: `灵宠【${L.petName(op)}】升到 Lv${op.lv + 1}`, cost: `兽粮 ${fmt(Math.ceil(L.petNeed(op) - op.xp))}（你有 ${fmt(st.feed)}）`, p: with_(m1 / L.petAtkOf(st, op)), go: 'pets' }); }
  if (L.canRetreat(st) && p.r === 0) { const ri = L.retInfo(st); if (ri.save > 0) out.push({ t: '闭关', cost: ri.free ? '头一回免费' : `${fmt(ri.cost)} 灵石`, p: pi.p, extra: `本层提前 ${ri.save} 周天`, go: 'home' }); }
  // 换成克制对手的战技（SYSTEMS §17 锦囊候选）：战技即换即生效，点【换上】一下完成
  const sw = zSwapTip(L.PACT_FOE, S => S * pi.assist, pi.Q);
  if (sw) out.push(sw);
  return out.filter(x => x.p - pi.p >= 0.03 || x.extra || (x.keep && x.p > pi.p)).sort((a, b) => b.p - a.p).slice(0, 3);
}
// 锦囊里的爆气丹：pf(战力倍率) → 服下之后的胜算
function baoqiTip(pf) {
  if (L.danNext(st, 'baoqi')) return null;
  const d = baoqiDelta(), m = d.pw1 / d.pw0;
  if (L.bagN(st, 'baoqi')) { const why = L.takeWhy(st, 'baoqi'); return why ? null : { t: '服一枚爆气丹', cost: `丹囊里 ${L.bagN(st, 'baoqi')} 枚 · 丹毒 +${L.TOX.pill}`, p: pf(m), go: 'pill:baoqi', btn: '服', keep: true }; }
  if (L.recipeKnown(st, 'baoqi') && !L.canCraft(st, 'baoqi')) return { t: '炼一枚爆气丹服下', cost: `火引 ×2 · 灵草 ${fmt(L.herbCost(st, L.RECIPE.baoqi))}`, p: pf(1.3), go: 'alch', btn: '炼丹房', keep: true };
  return null;
}
// 锦囊里的“换成克制对手的战技”：试遍已有战技，取胜算最高、且至少涨 3% 的一门
function zSwapTip(foe, scale, Q) {
  if (!L.artSlotOpen(st, 1)) return null;
  const sl = L.artSlots(st), fe = L.foeEl(foe), known = L.foeElKnown(st, foe);
  const p0 = L.duelP(st, scale(L.duelPower(st, foe)), Q, foe);
  let best = null;
  for (const id of Object.keys(st.arts.own)) {
    if (L.art(id).k !== 'z' || id === sl[1]) continue;
    const p = L.artTry(st, id, () => L.duelP(st, scale(L.duelPower(st, foe)), Q, foe));
    if (!best || p > best.p) best = { id, p };
  }
  if (!best || best.p - p0 < 0.03) return null;
  const me = L.atkEl(st, fe, [sl[0], best.id, sl[2]]), ke = known && L.elKe(me, fe);
  return { t: ke ? `换成克制对手的战技《${L.art(best.id).n}》（${L.elName(me)}克${L.elName(fe)}）` : `换上战技《${L.art(best.id).n}》`, cost: '免费，即换即生效', p: best.p, go: 'eqz:' + best.id, btn: '换上' };
}
// 三年之约：双方数值摆在明面上，外加老祖锦囊（每条都写清楚能涨多少）
function showPact() {
  const pi = L.pactInfo(st), p = st.p;
  const row = (n, eff, act, tip) => `<div class="grow-row"><span class="gn">${n}</span><span class="gm">${eff}</span><span class="ga">${act || ''}</span>${tip ? `<span class="tipx">${tip}</span>` : ''}</div>`;
  const go = (t, k) => `<button class="btn sm alt" data-go="${k}">${t}</button>`;
  const tips = pactTips().map(x => row(x.t, x.extra ? x.extra : `${L.pct(pi.p)} → <b>${L.pct(x.p)}</b>`, go(x.btn || '前往', x.go), x.cost));
  const muEl = L.artSlotOpen(st, 1) && L.foeElKnown(st, L.PACT_FOE) ? ' ' + elChip(L.foeEl(L.PACT_FOE)) : '';
  const body = `<p class="center">还剩 <b>${pi.left} 个周天</b>，${esc(st.exName)}在落霞城擂台等你。</p>
    <div class="vs"><div class="side">${myAvImg(56)}<div>${esc(p.name)}</div><div class="num">${fmt(pi.base)}${pi.assist > 1 ? ` ×${pi.assist}` : ''}</div><div class="num jadet">= ${fmt(pi.S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${rivalAvImg({ n: st.exName, id: 'mu' }, 56)}<div>${esc(st.exName)}</div><div class="muted">单灵根·炼气后期·法器${muEl}</div><div class="num seal">${fmt(pi.Q)}</div></div></div>
    <div class="center big ${pi.p < 0.45 ? 'seal' : pi.p < 0.8 ? 'goldt' : 'jadet'}">胜算 ${L.pct(pi.p)}</div>
    ${pi.assist > 1 ? `<p class="muted center">×${pi.assist} 是老夫借你的神魂之力，只在你筑基之前有效。</p>` : ''}
    <p class="muted center">五五线：战力 ${fmt(L.duelLines(pi.Q).even)} · 稳赢线：${fmt(L.duelLines(pi.Q).sure)}</p>
    <div class="grow-sec"><h3>老祖锦囊<span>怎么提高胜算</span></h3>${tips.join('') || '<p class="muted">已经稳了，安心等着打脸吧。</p>'}</div>`;
  const s = sheet({ title: '三年之约', body });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const k = b.dataset.go;
    if (k.startsWith('eqz:')) { if (L.equipArt(st, k.slice(4))) { SFX.coin(); showPact(); } return; }
    if (k.startsWith('pill:')) { const r = L.takePill(st, k.slice(5)); if (r) { SFX.gather(); floatText(100, 70, `服下${r.n}`, '#ffb23f'); showPact(); } return; }
    if (k.startsWith('plus:')) { const r = doPlus(k.slice(5)); if (r) { floatText(100, 70, r.ok ? `强化 +${r.to}` : '强化失败', r.ok ? '#ffe39a' : '#9d93b8'); showPact(); } return; }
    SFX.tap();
    if (k === 'cult') { closeModal(); if (L.isReady(st)) showBreakthrough(); } else GO[k]();
  });
}
