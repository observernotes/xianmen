/* 废柴仙途 · 界面片段 panel-equip：【装备】一格（docs/KAIRO_PLAN.md §4.3；示意图 docs/kairo_mock/03_gear.png）
 * 分页：法宝 · 功法 · 灵宠 · 包裹。法宝页是新版式：三行装备栏（兵器 / 法衣 / 饰品，没开的画锁 + 一行条件），每行 品阶底框图标 + 名字 +N + 这一件贡献的战力 + 【强化 矿 N】；
 * 下面“新到 N 件”每件一行 ▲ +41  278 → 319 +【换上】【熔 矿+6】（比身上差的把【熔】设为主按钮），再下面“收着的”格子 + 一键熔炼低阶。
 * 点装备栏的图标格 = 进那一格的明细（词条、重铸、锁定、强化前后：panel-gear.js 的 showGearDetail）。
 * 不选的新法宝不再“离开就熔掉”：留在“新到”里，底栏【装备】挂“新 N”，直到你换上或熔掉。
 * 功法 / 灵宠 / 包裹页是 panel-arts.js / panel-pets.js / panel-gear.js 的原页面，分页条（meTabs）与标题行换成【装备】的。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
function showEquip(tab) {
  navOpenPanel('gear');
  if (tab === 'arts' || tab === 'art') showArts();
  else if (tab === 'pets') showPets();
  else if (tab === 'bag') showBag();
  else showGear();
}
// 标题行：面板名 + 一个最要紧的数（§4.2-1）
function shellTitle(sh) {
  if (sh === 'gear') return `装备<span class="hn">战力 <b>${fmt(L.power(st))}</b></span>`;
  if (sh === 'world') return st.sect ? `江湖<span class="hn">贡献 <b>${fmt(st.sect.pts)}</b></span>` : `江湖<span class="hn">榜第 <b>${st.rank}</b></span>`;
  if (sh === 'home') return `洞府<span class="hn">修炼 <b>+${fmt(L.gain(st))}</b>/${MO()}</span>`;
  if (sh === 'path') return `仙途<span class="hn">${chName(L.chapterNow(st))}</span>`;
  return '';
}
// 这一件身上的贡献：卸下它前后的战力差（法衣、饰品不加战力时写主属性）
function gearContrib(s) {
  const x = st.gear[s]; if (!x) return '';
  const pw1 = L.power(st); st.gear[s] = null; let pw0; try { pw0 = L.power(st); } finally { st.gear[s] = x; }
  return pw1 - pw0 >= 1 ? `战力 <span class="kup">+${fmt(pw1 - pw0)}</span>` : esc(gearKey(x));
}
let gearNote = '';
function showGear(sel, still) {
  navCur = navCur || 'gear';
  const g = st.gear, plusOpen = L.gearOpen(st, 'plus');
  const rows = L.GEAR_SLOTS.map(s => {
    if (!L.gearOpen(st, s)) return `<div class="kslot dash"><div class="cell lk">${artIcon('lock', 32)}</div><div class="mid"><div class="nm mut" style="color:#8a7a5c">${L.GEAR_N[s]}</div><small>${esc(L.gearOpenWhy(st, s).replace('开放', '开'))}</small></div></div>`;
    const x = g[s];
    if (!x) return `<div class="kslot"><div class="cell"></div><div class="mid"><div class="nm">${L.GEAR_N[s]} · 空</div><small>历练会掉</small></div></div>`;
    const B = L.gearBase(x.id), info = plusOpen && s === 'w' ? L.gearPlusInfo(st, s) : null;   // 第一屏只给兵器一个【强化】；法衣、饰品点图标格进明细强化
    const pb = !info ? '' : info.max ? '<button class="kb alt" disabled>+9</button>' : `<button class="kb${info.why ? '' : ''}" data-kplus="${s}" ${info.why ? 'disabled' : ''}>强化<br><small>矿 ${fmt(info.cost.ore)}</small></button>`;
    return `<div class="kslot"><button class="cell" data-kdet="${s}" aria-label="${L.GEAR_N[s]}明细" style="border:0;padding:0;cursor:pointer">${qcellHTML(x.t, gearImg(x, 2), 2)}</button><div class="mid"><div class="nm" style="color:${pnTierInk(x.t)}">${esc(B.n)}${x.plus ? ` <span class="p">+${x.plus}</span>` : ''}</div><small>${s === 'o' ? L.ACC_KIND[B.kind].n : L.GEAR_N[s]} · ${gearContrib(s)}</small></div>${pb}</div>`;
  }).join('');
  const pend = g.pend.filter(y => !y.hold).sort((a, b) => (L.gearDelta(st, b).better ? 1 : 0) - (L.gearDelta(st, a).better ? 1 : 0)), held = L.gearHeld(st);
  const pendRows = pend.slice(0, 1).map(y => {
    const B = L.gearBase(y.id), D = L.gearDelta(st, y), up = D.better;
    const dp = D.b.p - D.a.p, big = Math.abs(dp) >= 1;
    const num = big ? `战力 <span class="${dp >= 0 ? 'kup' : 'kdn'}" style="font-size:16px">${dp >= 0 ? '▲ +' : '▼ −'}${fmt(Math.abs(dp))}</span>　${fmt(D.a.p)} → ${fmt(D.b.p)}` : esc(gearKey(y));
    return `<div class="kslot${up ? ' hot' : ''}"><div class="cell">${qcellHTML(y.t, gearImg(y, 2), 2)}</div><div class="mid"><div class="nm" style="color:${pnTierInk(y.t)}">${esc(B.n)}</div><small>${num}</small></div>
      <button class="kb ${up ? 'red' : 'alt'}" data-keq="${y.u}">换上</button><button class="kb ${up ? 'alt' : ''}" data-ksm="${y.u}">熔<br><small>矿+${D.smelt}</small></button></div>`;
  }).join('');
  const rest = pend.slice(1).concat(held);
  const cells = rest.map(y => `<button data-kcell="${y.u}" aria-label="${esc(L.gearBase(y.id).n)}">${qcellHTML(y.t, gearImg(y, 1.5), 1.5)}</button>`);
  const minN = rest.length ? Math.ceil(rest.length / 6) * 6 : 0;
  while (cells.length < minN) cells.push('<div class="e"></div>');
  const worse = pend.filter(y => !L.gearDelta(st, y).better).length;
  const nf = Object.keys(g.plans || {}).length;
  const forge = L.gearOpen(st, 'forge') || nf ? `<div class="ksec"><span>器炉 · 器方 ${nf}</span><button id="kForge">打造 ▸</button></div>` : '';
  const body = meTabs('gear') + rows
    + (pend.length ? `<div class="ksec"><span class="red">新到 ${pend.length} 件</span><span>灵矿 ${fmt(st.ore || 0)}</span></div>${pendRows}` : `<div class="ksec"><span>新到 0 件 · 历练会掉</span><span>灵矿 ${fmt(st.ore || 0)}</span></div>`)
    + (gearNote ? `<div class="ksec"><span class="kup">${gearNote}</span></div>` : '')
    + (rest.length ? `<div class="ksec"><span>收着的 ${rest.length} · 点一格比一比</span>${worse > 1 ? `<button id="kSmeltAll">一键熔炼低阶 ▸</button>` : ''}</div><div class="kgrid">${cells.join('')}</div>` : '')
    + forge;
  gearNote = '';
  const s = sheet({ title: shellTitle('gear'), body, still });
  s.querySelectorAll('[data-kdet]').forEach(b => b.onclick = () => { SFX.tap(); showGearDetail(b.dataset.kdet); });
  s.querySelectorAll('[data-kplus]').forEach(b => b.onclick = () => { const r = doPlus(b.dataset.kplus); if (r) { gearNote = r.ok ? `强化成功 +${r.to}` : '强化失败，不掉级'; showGear(undefined, true); } });
  const decide = (u, how) => { const r = L.gearDecide(st, u, how); if (!r) return; SFX.coin(); gearNote = how === 'equip' ? `换上了【${L.gearBase(r.x.id).n}】` : `熔成灵矿 +${r.smelt}`; updateHUD(); showGear(undefined, true); };
  s.querySelectorAll('[data-keq]').forEach(b => b.onclick = () => decide(+b.dataset.keq, 'equip'));
  s.querySelectorAll('[data-ksm]').forEach(b => b.onclick = () => decide(+b.dataset.ksm, 'smelt'));
  s.querySelectorAll('[data-kcell]').forEach(b => b.onclick = () => {
    const y = L.gearPend(st, +b.dataset.kcell); if (!y) return; SFX.tap();
    const B = L.gearBase(y.id);
    gearNote = y.hold ? `【${B.n}】${L.GEAR_N[y.slot]}槽${L.gearOpenWhy(st, y.slot)}，到时自动戴上` : `【${B.n}】${gearKey(y)}`;
    if (!y.hold) { g.pend.splice(g.pend.indexOf(y), 1); g.pend.unshift(y); }   // 点一格 = 把它拿到“新到”第一行比一比
    showGear(undefined, true);
  });
  const sa = s.querySelector('#kSmeltAll'); if (sa) sa.onclick = () => { let ore = 0; for (const y of g.pend.slice()) if (!y.hold && !L.gearDelta(st, y).better) { const r = L.gearDecide(st, y.u, 'smelt'); if (r) ore += r.smelt; } SFX.coin(); gearNote = `熔成灵矿 +${ore}`; showGear(undefined, true); };
  const fb = s.querySelector('#kForge'); if (fb) fb.onclick = () => { SFX.tap(); showForge(); };
}
