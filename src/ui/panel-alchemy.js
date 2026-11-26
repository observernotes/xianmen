/* 废柴仙途 · 界面片段 panel-alchemy：炼丹房（【洞府】→ 炼丹房）：四页——【丹方格】上半是 5×5 药引格（对称，实际 15 格，ART.yinCell），下半是点中那一格的丹方与【炼制】/【试炼】；
 * 【修炼】【战斗】【根基】三页列出会炼的丹，一键【炼制】、勾“续炼”（每 3 周天自动一炉，最多 3 种）；丹囊里的爆气丹、雷火丹在战斗页服。
 * 状态栏的丹毒小葫芦（ART.toxinGourd）也在这里。所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。数值全部取自 src/logic/alchemy.js。 */
let alchTab = '', alchCell = null, alchMsg = '';
const pillImg = (k, z) => { const c = ART.icon(k), s = pxs(16, z || 1.5); return c ? `<img class="px" src="${urlOf(c, 'ic|' + k)}" style="width:${s}px;height:${s}px;flex:none;vertical-align:middle" alt="">` : iconHTML('pill', s); };
const toxChip = st0 => { const t = Math.round(st0.toxin || 0), lv = L.toxLevel(st0); return `<span class="chip ${lv >= 2 ? 'bad' : lv ? 'warn' : 'ok'}">丹毒 ${t}${lv >= 2 ? '·' + L.TOX_N[lv] : ''}</span>`; };
// 一炉要什么：药引、灵草、天材地宝（够的绿、不够的红）
function costHTML(rc) {
  const c = L.cellCost(st, rc), a = [];
  for (const y in c.yin) a.push(`<span class="${L.yinHave(st, y) >= c.yin[y] ? '' : 'seal'}">${yinIcon(y, 1)}${L.YIN_N[y]} ×${c.yin[y]}</span>`);
  a.push(`<span class="${st.herbs >= c.herbs ? '' : 'seal'}">灵草 ${fmt(c.herbs)}</span>`);
  if (c.treasure) a.push(`<span class="${st.treasure >= c.treasure ? '' : 'seal'}">天材地宝 ${c.treasure}</span>`);
  return a.join(' · ');
}
const toxNote = rc => (rc.g === 'g' ? (rc.k === 'pojing' ? '不计丹毒（突破时服每枚 +10）' : '根基类：不计丹毒') : `丹毒 +${L.TOX.pill}（上品 +${L.TOX.good}、极品 +${L.TOX.perfect}）${L.toxHalf(st) ? '，<span class="seal">现在服药力减半</span>' : ''}`);
// 服一枚爆气丹前后（对决胜算 / 战力）
function baoqiDelta() {
  const d = L.danOf(st), keep = d.next.baoqi, b = d.bag.baoqi, q = b && b.length ? b[0] : 1;
  const pw0 = L.power(st);
  d.next.baoqi = 1 + 0.3 * L.QUAL[q].m * L.pillPower(st) * (L.toxHalf(st) ? 0.5 : 1);
  const pw1 = L.power(st);
  if (keep) d.next.baoqi = keep; else delete d.next.baoqi;
  return { pw0, pw1 };
}
// 丹方卡（pnFold）：药丸 + 名字（角标：续炼中 / 丹囊 N）+ 一行效果 +【炼制】；丹囊里有丹的多一个【服一枚】。点开看材料、丹毒、本境界服了几枚、续炼
// prim：本屏唯一的金色按钮（'r:<丹>' 炼制 / 'take:<丹>' 服一枚）
function recipeRow(rc, prim, open) {
  const why = L.canCraft(st, rc.k), auto = L.autoOn(st, rc.k), bagN = rc.bag ? L.bagN(st, rc.k) : 0;
  const used = rc.per ? `本境界已服 ${L.pillUsed(st, rc.k)}/${rc.per}` : rc.k === 'yanshou' ? `本境界已服 ${L.pillUsed(st, rc.k)}/3` : '';
  let takeBtn = '', key = esc(rc.d);
  if (rc.bag && rc.k !== 'liaoshang' && bagN) {
    const nx = L.danNext(st, rc.k), take = L.takeWhy(st, rc.k);
    if (nx) takeBtn = `<button class="btn sm alt" disabled>在身<small>${rc.k === 'baoqi' ? '×' + mult2(nx) : '+' + nx + ' 分'}</small></button>`;
    else {
      takeBtn = `<button class="btn sm ${!take && prim === 'take:' + rc.k ? 'gold' : 'alt'}" data-take="${rc.k}" ${take ? 'disabled' : ''}>服一枚</button>`;
      if (!take) key = rc.k === 'baoqi' ? (() => { const d = baoqiDelta(); return `战力 <b class="pn-up">+${Math.round((d.pw1 / d.pw0 - 1) * 100)}%</b>`; })() : '历练 <b class="pn-up">+10 分</b>';
      else if (!why) key = `<span class="seal">${esc(take)}</span>`;
    }
  }
  if (why) key = `<span class="seal">${esc(why)}</span>`;
  const badge = auto ? '<span class="chip ok">续炼</span>' : bagN ? `<span class="chip">囊 ${bagN}</span>` : '';
  const brew = `<button class="btn sm ${!why && prim === 'r:' + rc.k ? 'gold' : 'alt'}" data-r="${rc.k}" ${why ? 'disabled' : ''}>炼制</button>`;
  const autoDis = !auto && L.danOf(st).auto.length >= L.AUTO.max;
  const body = `<div class="pn-line">${esc(rc.d)}</div><div class="pn-line">材料：${costHTML(rc)}</div><div class="pn-line">${toxNote(rc)}</div>${used ? `<div class="pn-line">${used}</div>` : ''}
    <div class="pn-acts"><button class="btn alt achk pn-chk${auto ? ' on' : ''}" data-auto="${rc.k}" aria-pressed="${auto ? 'true' : 'false'}" ${autoDis ? 'disabled' : ''}><span class="vh">${auto ? '☑' : '☐'}</span>续炼${autoDis ? `<small>最多 ${L.AUTO.max} 种</small>` : ''}</button></div>`;
  return pnFold('rc-' + rc.k, { cls: 'arow', ic: pillImg(rc.k, 2), nm: rc.n, badge, k: key, right: takeBtn + brew, body, open });
}
function yinCellImg(a, b, k, sel, z) {
  const c = ART.yinCell(YIN_LET[a], YIN_LET[b], k || null, sel), s = pxs(22, z || 2);
  return `<img class="px" src="${urlOf(c, ['yc', a, b, k || '', sel ? 1 : 0].join('|'))}" style="width:${s}px;height:${s}px;flex:none" alt="">`;
}
// 5×5 药引格：行列都是 火 冰 雷 木 魂，只画上三角（a ≤ b，15 格）
function yinGridHTML() {
  const K = L.YIN_KEYS, z = 2;
  let h = `<div class="ygrid"><span></span>${K.map(y => `<span class="yh">${yinIcon(y, 1.5)}</span>`).join('')}`;
  K.forEach((a, i) => {
    h += `<span class="yh">${yinIcon(a, 1.5)}</span>`;
    K.forEach((b, j) => {
      if (j < i) { h += '<span class="yc empty"></span>'; return; }
      const rc = L.yinRecipe(a, b), known = L.recipeKnown(st, rc.k), sel = alchCell === a + '|' + b;
      const can = !known && !L.trialWhy(st, a, b);
      h += `<button class="yc${can ? ' can' : ''}" data-cell="${a}|${b}" aria-label="${L.YIN_N[a]}+${L.YIN_N[b]}${known ? '：' + rc.n : ''}">${yinCellImg(a, b, known ? rc.k : '', sel, z)}</button>`;
    });
  });
  return h + '</div>';
}
function cellDetail() {
  if (!alchCell) return `<div class="muted center">点一格看丹方：两味药引配一炉。</div>`;
  const [a, b] = alchCell.split('|'), rc = L.yinRecipe(a, b), known = L.recipeKnown(st, rc.k);
  if (known) return `<div class="adet">${recipeRow(rc, 'r:' + rc.k, true)}</div>`;
  const why = L.trialWhy(st, a, b);
  return `<div class="adet">${pnFold('trial', { open: true, ic: yinCellImg(a, b, '', false, 1.5), nm: `${L.YIN_N[a]} + ${L.YIN_N[b]} → <b>？</b>`,
    k: why ? `<span class="seal">${esc(why)}</span>` : `成丹率 ${L.pct(L.alchRate(st))}`,
    right: `<button class="btn sm ${why ? 'alt' : 'gold'}" id="btnTrial" ${why ? 'disabled' : ''}>试炼</button>`,
    body: `<div class="pn-line">材料：${costHTML(rc)} · 丹炉 ${rc.lv} 级</div><div class="pn-line">丹成就揭晓、记进图鉴（下一世还在）；炸炉只亏材料。</div>` })}</div>`;
}
// 本屏唯一的金色按钮：丹囊里能服的战斗丹优先，其次第一种炼得了的
function alchPrim(list) {
  const t = list.find(rc => rc.bag && rc.k !== 'liaoshang' && L.bagN(st, rc.k) && !L.danNext(st, rc.k) && !L.takeWhy(st, rc.k));
  if (t) return 'take:' + t.k;
  const r = list.find(rc => !L.canCraft(st, rc.k));
  return r ? 'r:' + r.k : '';
}
function showAlchemy(still) {
  const rate = L.alchRate(st), yo = L.yinOpen(st);
  if (!alchTab || (alchTab === 'grid' && !yo)) alchTab = yo ? 'grid' : 'x';
  const tabs = [['grid', '丹方格'], ['x', L.PILL_G.x], ['z', L.PILL_G.z], ['g', L.PILL_G.g]].filter(([g]) => g !== 'grid' || yo)
    .map(([g, n]) => `<button class="${alchTab === g ? 'on' : ''}" data-tab="${g}">${n}${g === 'grid' ? ` ${L.recipeCount(st)}/${L.YIN_GRID.length}` : ` ${L.recipeList(st, g).length}`}</button>`).join('');
  let main;
  if (alchTab === 'grid') main = `${yinBar()}${yinGridHTML()}${cellDetail()}`;
  else {
    const list = L.recipeList(st, alchTab), prim = alchPrim(list);
    main = list.length ? `<div class="pn-list">${list.map(rc => recipeRow(rc, prim)).join('')}</div>`
      : emptyNoteHTML('pill', alchTab === 'z' ? '战斗丹要药引：去【丹方格】试出来。' : '还没有会炼的：去【丹方格】试炼。');
  }
  const auto = L.danOf(st).auto;
  const rules = `<details class="more"><summary>续炼与丹毒 · 续炼 ${auto.length}/${L.AUTO.max}</summary><div class="muted">续炼：最多勾 ${L.AUTO.max} 种${auto.length ? '（' + auto.map(k => L.RECIPE[k].n).join('、') + '）' : ''}，每 ${L.AUTO.every} 周天材料够就各炼一炉；修炼类在丹毒会过 ${L.TOX.autoMax} 时跳过，战斗类丹囊里留 ${L.AUTO.bagKeep} 枚为止。<br>丹毒每周天退 ${dec(L.toxDecay(st))}，过 ${L.TOX.half} 药力减半，过 ${L.TOX.max} 不能再服。<br>成丹分下、中、上、极四品，炸炉只亏材料。天材地宝 ${st.treasure}${L.friend(st, 'ge') ? '；葛老指点，成丹率更高' : ''}。</div></details>`;
  const body = `<div class="tabs atabs">${tabs}</div>${alchMsg ? `<div class="quote">${alchMsg}</div>` : ''}${main}${rules}`;
  const s = sheet({ title: shellTitle('home'), still, sub: `灵草 ${fmt(st.herbs)} · 成丹 ${L.pct(rate)} · ${toxChip(st)}`, body: meTabs('alch') + body });
  alchMsg = '';
  s.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SFX.tap(); alchTab = b.dataset.tab; showAlchemy(true); });
  s.querySelectorAll('[data-cell]').forEach(b => b.onclick = () => { SFX.tap(); alchCell = b.dataset.cell; showAlchemy(true); const d = $('#modal .adet'); if (d) d.scrollIntoView({ block: 'nearest' }); });
  s.querySelectorAll('[data-auto]').forEach(b => b.onclick = () => { SFX.tap(); const k = b.dataset.auto; L.setAuto(st, k, !L.autoOn(st, k)); alchMsg = L.autoOn(st, k) ? `${L.RECIPE[k].n}续炼：每 ${L.AUTO.every} 周天材料够就炼一炉` : `${L.RECIPE[k].n}不再续炼`; showAlchemy(true); });
  s.querySelectorAll('[data-take]').forEach(b => b.onclick = () => {
    const k = b.dataset.take, d = k === 'baoqi' ? baoqiDelta() : null, r = L.takePill(st, k);
    if (!r) return;
    SFX.gather(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, `服下${r.n}`, '#ffb23f');
    alchMsg = `服下${L.QUAL[r.q].n}${r.n}：${esc(r.fx)}${d ? `；战力 ${fmt(d.pw0)} → <b>${fmt(L.power(st))}</b>` : ''}`;
    showAlchemy(true);
  });
  const tb = s.querySelector('#btnTrial'); if (tb) tb.onclick = () => { const [a, b] = alchCell.split('|'); brewUI(L.trial(st, a, b)); };
  s.querySelectorAll('button[data-r]').forEach(b => b.onclick = () => brewUI(L.craft(st, b.dataset.r)));
}
// 开炉动画 → 结果（试炼揭晓时横幅）
function brewUI(res) {
  if (!res) return;
  SFX.gather();
  sheet({ title: res.trial ? '试炼' : '开炉炼丹', center: true, noClose: true, body: `<div class="center"><div class="clashL" style="display:inline-block">${iconHTML('pill', 56)}</div></div><p class="center muted">丹炉火起，药香弥漫……</p>` });
  setTimeout(() => {
    if (!res.ok) { SFX.fail(); sheet({ title: '炸炉了', center: true, body: `<p class="center">轰的一声，${res.trial ? '这一格没试出来' : res.n + '没炼成'}，材料化为飞灰。</p><p class="center muted">提升丹炉等级（每级 +3%）、看炉的灵宠、与葛老交好，成丹率更高。</p>`, foot: [{ t: '再来', gold: true, fn: () => showAlchemy() }] }); return; }
    const q = L.QUAL[res.q];
    if (res.fresh) { banner('新丹方 · ' + res.n, L.yinText(L.recipeYin(L.RECIPE[res.k]))); SFX.reveal(5); }
    else if (res.q === 3) { flash(0.6); SFX.reveal(6); banner('丹纹九现', '极品' + res.n); } else SFX.win();
    sheet({ title: res.fresh ? '试出新丹方' : '丹成', center: true, body: `<div class="center">${pillImg(res.k, 3)}</div><div class="center big ${res.q === 3 ? 'goldt' : res.q === 2 ? 'jadet' : ''}">${q.n}${res.n}</div>${res.fresh ? `<p class="center jadet">${L.yinText(L.recipeYin(L.RECIPE[res.k]))} → ${res.n}，记入图鉴（下一世还在）</p>` : ''}${res.q === 3 ? '<p class="center seal">丹成之时，九道丹纹浮现，异香百里！</p>' : ''}<div class="fxlist"><span>${esc(res.fx)}</span></div>`, foot: [{ t: '继续炼丹', gold: true, fn: () => showAlchemy() }] });
  }, 1100);
}

// ---------- 状态栏的丹毒小葫芦（有丹炉或有丹毒时才出现；点开炼丹房） ----------
(function () {
  const r2 = $('#top .r2'); if (!r2 || $('#toxBox')) return;
  const sp = document.createElement('button'); sp.className = 'res toxres'; sp.id = 'toxBox'; sp.title = '丹毒'; sp.setAttribute('aria-label', '丹毒'); sp.hidden = true;
  sp.innerHTML = '<img class="px" id="toxImg" alt=""><b id="vTox">0</b>';
  r2.appendChild(sp);
  sp.onclick = () => { if (!st || cine) return; ac(); SFX.tap(); if (st.home.furnace) showAlchemy(); else tip('toxinNo', `丹毒 ${Math.round(st.toxin || 0)}：每周天退 ${dec(L.toxDecay(st))}。`); };
})();
let toxShown = -1;
function updateToxin() {
  const b = $('#toxBox'); if (!b) return;
  const on = L.toxinOn(st);
  if (b.hidden === on) b.hidden = !on;
  if (!on) return;
  const t = Math.round(st.toxin || 0), lv = Math.round(Math.min(1, t / L.TOX.max) * 10);
  if (toxShown !== lv) { toxShown = lv; $('#toxImg').src = urlOf(ART.toxinGourd(lv / 10), 'tox|' + lv); }
  const v = $('#vTox'); if (v.textContent !== String(t)) v.textContent = t;
  b.classList.toggle('half', L.toxHalf(st));
}
