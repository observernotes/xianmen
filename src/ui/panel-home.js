/* 废柴仙途 · 界面片段 panel-home：洞府（SYSTEMS §6.1 / §6.3）——闭关、服丹疗伤、顶部 2×4 地块网格（ART.plotTile + ART.building）、
 * 点地块进该建筑的小面板（升级 / 拆除 / 功能入口：聚灵阵→阵法、灵田→田、丹炉→炼丹房、器炉→打造、兽栏→灵宠、静室→闭关、藏经阁→功法）、空地块的建造列表（第一项是老祖推荐的）、
 * 阵法面板（ART.sigil）、洞府场景里的建筑与阵法（ART.drawBuilding / ART.homeSlots / ART.drawFormation）、洞府的老祖讲解与气泡。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 闭关的花费、倍率、疲劳、多得多少修为都取自 L.retInfo；建筑的“值不值”取自 L.upInfo / L.homeDelta；阵法的数取自 L.zhenEffect。 */
// ---------- 洞府 ----------
function retreatCard() {
  if (st.retreat) {
    const r = st.retreat, nm = L.retName(r);
    return `<div class="card flat"><div class="main"><div class="line"><span>${nm}中</span><span class="chip ok">修炼 ×${r.m.toFixed(2)}</span></div>${bar((r.total - r.left) / r.total, true)}
      <div class="muted">还剩 ${r.left} 周天 · 已得修为 ${fmt(r.got)}${r.kind === 'ret' ? ' · 坐满出关有机会顿悟' : ''}</div></div>
      <div class="right"><button class="btn sm alt" id="btnRetEnd">提前出关</button></div></div>`;
  }
  if (!L.retOpen(st)) return '<div class="card flat" style="opacity:.6"><div class="main"><div>闭关</div><div class="muted">炼气中期解锁：4 周天修炼翻倍</div></div></div>';
  const ri = L.retInfo(st), ok = !ri.why;
  const cost = ri.free ? '头一回免费' : `${fmt(ri.cost)} 灵石`;
  const tired = ri.tired ? `<div class="seal">连着第 ${ri.streak + 1} 次闭关：倍率 ×${ri.m0.toFixed(2)} → ×${ri.m.toFixed(2)}（出门历练一趟就恢复）</div>` : '';
  return `<div class="card flat"><div style="flex:none">${iconHTML('disc', 30)}</div><div class="main"><div class="line"><span>闭关 · ${ri.len} 周天</span><span class="chip ${ri.tired ? 'warn' : 'ok'}">修炼 ×${ri.m.toFixed(2)}</span></div>
    <div class="jadet">修为 +${fmt(ri.extra)}（比打坐多）${ri.save ? `，本层提前 ${ri.save} 周天` : ''}</div>
    <div class="muted">出关 ${L.pct(ri.epi)} 顿悟，再得 ${L.RET.epiTicks} 周天修为 · 期间不能历练${L.home2On() ? (st.home.room ? ` · 静室 Lv${st.home.room}` : L.homeUnlocked(st, 'room') ? ' · 建静室能加倍率' : '') : ''}</div>${tired}${ok ? '' : `<div class="seal">${esc(ri.why)}</div>`}</div>
    <div class="right"><button class="btn sm ${ok ? 'gold' : 'alt'}" id="btnRet" ${ok ? '' : 'disabled'}>${ri.free ? '免费' : `${iconHTML('stone', 12)} ${fmt(ri.cost)}`}</button><span class="muted">${cost}</span></div></div>`;
}
function healCard() {
  if (!(st.p.inj > 0)) return '';
  // 先用丹囊里的疗伤丹，没有再用破境丹（alchemy.js 的 L.heal）
  const ok = L.canHeal(st), w = L.healWith(st), nl = L.bagN(st, 'liaoshang');
  const how = w === 'liaoshang' ? `服一枚疗伤丹立刻痊愈（丹囊里 ${nl} 枚）` : `服一枚破境丹立刻痊愈（你有 ${st.pills} 枚${st.home.furnace ? `；疗伤丹 ${fmt(L.herbCost(st, L.RECIPE.liaoshang))} 灵草一炉，省下破境丹` : ''}）`;
  return `<div class="card flat" style="box-shadow:0 0 0 2px var(--seal)"><div style="flex:none">${pillImg(w === 'liaoshang' ? 'liaoshang' : 'pojing', 2)}</div><div class="main"><div class="seal">负伤：还剩 ${st.p.inj} 周天</div>
    <div class="muted">战力 ×0.6、修炼 ×0.5。${how}${ok ? '' : `；坊市 ${fmt(L.price(st, 'pill'))} 灵石一枚`}</div></div>
    <div class="right"><button class="btn sm ${ok ? 'gold' : 'alt'}" id="btnHeal" ${ok ? '' : 'disabled'}>服丹疗伤</button></div></div>`;
}

// ---------- 地块网格与建筑小面板 ----------
let homeSel = 0, homeMsg = '', homeDemo = '';
const HB = k => L.HOME_B[k];
// 选中地块的详情卡：画小建筑（ART.buildingSprite 26×26，按等级三档），没有就退回 16×16 图标
function bldSprite(k, lv, max) { const c = ART.buildingSprite && ART.buildingSprite(k, lv >= max * 0.66 ? 2 : lv >= max * 0.33 ? 1 : 0); if (!c) return ''; const z = pxFit(26, 52); return `<img class="px" src="${urlOf(c, 'bsp|' + k + '|' + (lv >= max * 0.66 ? 2 : lv >= max * 0.33 ? 1 : 0))}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">`; }
function bldIcon(k, kk) { const c = ART.building(k), z = pxs(16, kk || 2); return c ? `<img class="px" src="${urlOf(c, 'bld|' + k)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">` : ''; }
function sigilImg(id, kk, off) { const c = ART.sigil(id), z = pxs(16, kk || 2); return c ? `<img class="px${off ? ' psil' : ''}" src="${urlOf(c, 'sig|' + id)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">` : ''; }
// 地块格：ART.plotTile 上叠建筑图标，缓存成图
function tileImg(state, sel, k) {
  const key = ['tile', state, sel ? 1 : 0, k || ''].join('|');
  if (!avCache.has(key)) {
    const c = document.createElement('canvas'); c.width = 26; c.height = 26;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(ART.plotTile(state, sel), 0, 0);
    const b = k && ART.building(k); if (b) g.drawImage(b, 5, 5);
    avCache.set(key, c.toDataURL());
  }
  const z = pxs(26, 1.5);
  return `<img class="px" src="${avCache.get(key)}" style="width:${z}px;height:${z}px" alt="">`;
}
// 老祖推荐建什么（空地块列表的第一项）：按眼下最缺的来，写一句带数字的理由
function homeRec() {
  const can = L.homeUnbuilt(st);
  if (!can.length) return null;
  const pick = (k, why) => (can.includes(k) ? { k, why } : null);
  const dl = k => L.homeDelta(st, k, 0, L.homeRebuildLv(st, k));
  const nPet = L.petCount(st), plans = Object.keys(st.gear.plans || {}).length, mr = Math.max(st.p.r, st.flags.maxR || 0);
  return pick('field', '每周天自己长灵石，还能种灵草和药引')
    || pick('furnace', `开炼丹房，每级突破 +${L.pct(L.BT.furnace)}`)
    || (plans && mr >= 4 ? pick('forge', `手里 ${plans} 张器方，${L.FORGE_LV} 级就能打造`) : null)
    || pick('room', dl('room')) || pick('vault', dl('vault')) || pick('library', dl('library'))
    || (nPet >= 2 ? pick('pen', `${nPet} 只灵宠，${dl('pen')}`) : null)
    || pick('forge', dl('forge')) || pick('pen', dl('pen')) || pick('spring', dl('spring')) || pick('pavilion', dl('pavilion'))
    || { k: can[0], why: HB(can[0]).d(0) };
}
// 建筑的功能入口
function homeFnRow(k) {
  if (k === 'array') {
    if (!L.zhenOpen(st)) return `<div class="muted">布着聚灵阵：${esc(L.zhenEffect(st, 'f_juling'))}。${L.home2On() ? '筑基后期能换别的阵法。' : ''}</div>`;
    const z = L.zhenState(st), sl = L.zhenSlots(st);
    const one = (s, j) => (!s.id && !s.nx ? (j ? '<div class="muted">第二阵位空着</div>' : '') : `<div class="zline">${sigilImg(s.id || s.nx, 1.5)}<span>${s.id ? `${esc(L.zhenName(s.id))}：${esc(L.zhenEffect(st, s.id, j ? L.ZV.second : 1))}` : ''}${s.nx ? ` <span class="chip warn">布阵中 ${Math.max(1, s.at - st.tick)} 周天 → ${esc(L.zhenName(s.nx))}</span>` : ''}</span></div>`);
    return `${one(z[0], 0)}${sl >= 2 ? one(z[1], 1) : ''}<button class="btn sm gold" data-go="zhen">换阵 · 阵图 ${L.zhenOwnList(st).length}/${L.ZHEN.length}</button>`;
  }
  if (k === 'field') return L.plotCount(st) ? `<button class="btn sm alt" data-go="field">进灵田 · ${L.plotCount(st)} 块</button>` : '';
  if (k === 'furnace') return `<button class="btn sm alt" data-go="alch">炼丹房 · 灵草 ${fmt(st.herbs)}</button>`;
  if (k === 'forge') return L.gearOpen(st, 'forge') ? `<button class="btn sm alt" data-go="forge">打造 · 器方 ${Object.keys(st.gear.plans).length} 张</button>` : `<div class="muted">${esc(L.gearOpenWhy(st, 'forge'))}；强化在【人物】→ 法宝</div>`;
  if (k === 'pen') return L.petCount(st) || (st.petPend || []).length ? `<button class="btn sm alt" data-go="pets">灵宠 · ${L.petCount(st)}/${L.petCap(st)}</button>` : '<div class="muted">还没有灵宠：坊市灵兽蛋、采药偶遇</div>';
  if (k === 'room') { const ri = L.retInfo(st); return `<div class="muted">闭关 ×${ri.m0.toFixed(2)}（静室 +${(L.HV.roomRet * st.home.room).toFixed(2)}）· 出关顿悟 ${L.pct(ri.epi)}</div>${L.canRetreat(st) ? `<button class="btn sm alt" data-go="ret">闭关 · ${ri.free ? '免费' : fmt(ri.cost) + ' 灵石'}</button>` : ''}`; }
  if (k === 'library') { const n = L.COMBOS.filter(c => !st.meta.combo[c.id] && (st.meta.chint || {})[c.id]).length; return `<button class="btn sm alt" data-go="arts">功法 · 共鸣提示 ${n} 条</button>`; }
  if (k === 'vault' && L.sellOpen(st)) return '<button class="btn sm alt" data-go="market">坊市行情</button>';
  return '';
}
// 选中的那块地：已建 → 升级 / 拆除 / 功能入口；空地 → 建造列表；未开 → 洞府几级开
function plotDetail(i) {
  const pl = L.homePlots(st), max = L.homePlotMax(st);
  if (i >= pl.length) {
    let c = 0; for (let v = st.home.cave + 1; v <= HB('cave').max; v++) if (L.homePlotMaxAt(v) > i) { c = v; break; }
    return `<div class="card flat hdet"><div style="flex:none">${tileImg('locked')}</div><div class="main"><div>第 ${i + 1} 块地 · 未开</div><div class="muted">${c ? `洞府升到 <b>${c}</b> 级开这块地（现在 ${st.home.cave} 级）` : '洞府已满级'}</div></div></div>`;
  }
  const k = pl[i];
  if (!k) {
    const rec = homeRec();
    const list = L.BLD_KEYS.filter(x => x !== 'array' && !st.home[x] && (L.home2On() || !HB(x).nu)).sort((a, b) => (rec && b === rec.k) - (rec && a === rec.k) || L.homeUnlocked(st, b) - L.homeUnlocked(st, a));
    const rows = list.map(x => {
      const B = HB(x), un = L.homeUnlocked(st, x), why = L.buildWhy(st, x, i), lv = L.homeRebuildLv(st, x), c = L.homeCost(st, x), ok = !why, poor = /灵石/.test(why);
      const tag = rec && x === rec.k ? '<span class="chip warn">荐</span> ' : '';
      const eff = un ? (B.nu ? L.homeDelta(st, x, 0, lv) : B.d(lv)) : B.unlock;
      return `<div class="card flat crow${un ? '' : ' off'}"><div style="flex:none">${bldIcon(x, 2)}</div><div class="main"><div class="line">${tag}<span>${B.n}</span>${lv > 1 ? `<span class="chip ok">重建从 Lv${lv}</span>` : ''}</div>
        <div class="${un ? 'jadet' : 'muted'}">${esc(eff)}</div>${rec && x === rec.k ? `<div class="muted">${esc(rec.why)}</div>` : ''}${un && why && !poor ? `<div class="seal">${esc(why)}</div>` : ''}</div>
        <div class="right"><button class="btn sm ${ok ? 'gold' : 'alt'}" data-build="${x}" ${ok ? '' : 'disabled'}>${un ? `${iconHTML('stone', 12)} ${fmt(c)}` : '未解锁'}</button>${un && poor ? `<span class="muted">${esc(why)}</span>` : ''}</div></div>`;
    }).join('');
    return `<div class="hdet"><div class="line"><b>第 ${i + 1} 块 · 空地</b><span class="muted">点一样就建（已建 ${pl.filter(Boolean).length}/${max}）</span></div>${rows || '<div class="muted">能建的都建了。</div>'}</div>`;
  }
  const B = HB(k), u = L.upInfo(st, k), lv = st.home[k], can = !u.max && st.stones >= u.cost, keep = Math.floor(lv * L.HV.keep);
  const demo = k === 'array' ? '' : homeDemo === k
    ? `<div class="quote">拆了退 <b>${fmt(L.homeRefund(st, k))}</b> 灵石（累计花费的一半）${keep >= 1 ? `，等级记着，重建从 <b>${keep}</b> 级起` : ''}。${k === 'field' ? '田里的作物一并铲掉。' : k === 'furnace' ? '炼丹房关门，续炼停下。' : ''}</div><div class="hrow"><button class="btn sm alt" data-demo-no="1">不拆了</button><button class="btn sm" data-demo-yes="${k}">确认拆除</button></div>`
    : `<div class="hrow"><button class="btn sm alt" data-demo="${k}">拆除 · 退 ${fmt(L.homeRefund(st, k))}</button></div>`;
  return `<div class="card flat hdet"><div style="flex:none">${bldSprite(k, lv, B.max) || bldIcon(k, 3)}</div><div class="main">
      <div class="line"><span><b>${B.n}</b></span><span class="chip">Lv ${lv}/${B.max}</span></div>
      <div class="muted">${esc(B.d(lv))}</div>${u.max ? '<div class="muted">已满级</div>' : `<div class="jadet">→ ${esc(B.d(lv + 1))}</div><div class="muted">${esc(u.note)}</div>`}
      <div class="hfn">${homeFnRow(k)}</div>${demo}</div>
    <div class="right"><button class="btn sm ${can ? 'gold' : 'alt'}" data-k="${k}" ${can ? '' : 'disabled'}>${u.max ? '已满级' : `${iconHTML('stone', 12)} ${fmt(u.cost)}`}</button>${!u.max && !can ? `<span class="muted">还差 ${fmt(u.cost - st.stones)}</span>` : ''}</div></div>`;
}
function showHome(still, sel) {
  if (sel !== undefined) { homeSel = sel; homeDemo = ''; }
  const pl = L.homePlots(st), max = L.homePlotMax(st), n = Math.max(8, pl.length);
  if (homeSel >= n) homeSel = 0;
  const rec = homeRec(), tiles = [];
  for (let i = 0; i < n; i++) {
    const k = pl[i], lockd = i >= pl.length, over = i >= max && !!k, s = i === homeSel;
    const state = lockd ? 'locked' : k ? 'built' : 'empty';
    const nm = lockd ? '未开' : k ? HB(k).n : '空地', canB = !k && !lockd && !!rec && !L.buildWhy(st, rec.k, i);
    const up = !!k && !L.upInfo(st, k).max && st.stones >= L.homeCost(st, k);
    const sub = k ? `Lv${st.home[k]}${up ? ' ↑' : ''}` : canB ? '可建' : '';
    tiles.push(`<button class="hplot${s ? ' sel' : ''}${over ? ' over' : ''}${canB ? ' can' : ''}" data-hp="${i}" aria-label="${nm} ${sub}">${tileImg(state, s, k)}<span class="nm">${nm}</span><span class="muted">${sub}</span></button>`);
  }
  const cu = L.upInfo(st, 'cave'), cCan = !cu.max && !cu.lock && st.stones >= cu.cost, nx = L.homeNextPlotCave(st);
  const caveCard = `<div class="card flat"><div style="flex:none">${iconHTML('build', 30)}</div><div class="main"><div class="line"><span>洞府 · ${L.caveName(st.home.cave)}</span><span class="chip">Lv ${st.home.cave}</span></div>
    <div class="muted">${esc(HB('cave').d(st.home.cave))}${L.homeOver(st) ? ` · <span class="seal">地块超出 ${L.homeOver(st)} 块（旧档留着，拆了就收回）</span>` : ''}</div>${cu.max ? '' : cu.lock ? `<div class="muted">${esc(cu.lock)}</div>` : `<div class="jadet">→ ${esc(cu.note)}</div>${nx && nx > st.home.cave + 1 ? `<div class="muted">升到 ${nx} 级多一块地</div>` : ''}`}</div>
    <div class="right"><button class="btn sm ${cCan ? 'gold' : 'alt'}" data-k="cave" ${cCan ? '' : 'disabled'}>${cu.max ? '已满级' : cu.lock ? '未解锁' : `${iconHTML('stone', 12)} ${fmt(cu.cost)}`}</button></div></div>`;
  const tox = L.toxinOn(st) ? ` · 丹毒 ${Math.round(st.toxin || 0)}` : '', auto = L.danOf(st).auto.length;
  const alch = (L.plotCount(st) ? `<button class="btn alt" id="btnField">灵田 · ${L.plotCount(st)} 块 · ${L.plots(st).map(x => L.CROP[x.c].n).filter((m, j, a) => a.indexOf(m) === j).join('、')}${L.yinTotal(st) ? ` · 药引 ${L.yinTotal(st)}` : ''}</button>` : '')
    + (st.home.furnace ? `<button class="btn alt" id="btnAlch">炼丹房 · 灵草 ${fmt(st.herbs)} · 天材地宝 ${st.treasure}${tox}${auto ? ` · 续炼 ${auto} 种` : ''}</button>` : '')
    + (L.petCount(st) || (st.petPend || []).length ? `<button class="btn ${L.petGlowAny(st) || (st.petPend || []).length ? 'gold' : 'alt'}" id="btnPets">兽栏 · 灵宠 ${L.petCount(st)}/${L.petCap(st)} · 兽粮 ${fmt(st.feed || 0)}${L.petGlowAny(st) ? ' · 能进化' : (st.petPend || []).length ? ' · 有新灵宠' : ''}</button>` : '')
    + (L.gearOpen(st, 'forge') || Object.keys(st.gear.plans).length ? `<button class="btn alt" id="btnForgeH">器炉 · 打造 · 器方 ${Object.keys(st.gear.plans).length} 张 · 灵矿 ${fmt(st.ore || 0)}</button>` : '');
  const body = healCard() + retreatCard() + `<div class="hgrid" id="homeGrid">${tiles.join('')}</div>` + (homeMsg ? `<div class="quote">${homeMsg}</div>` : '') + plotDetail(homeSel) + caveCard + (alch ? '<div class="sep"></div>' + alch : '');
  const s = sheet({ title: '洞府', still, sub: `${L.caveName(st.home.cave)} · 地块 ${pl.filter(Boolean).length}/${max} · 灵石 ${fmt(st.stones)} · 每周天 +${fmt(L.income(st))} · 修炼 +${dec(L.gain(st))}/周天`, body });
  homeMsg = '';
  const on = (q, f) => { const b = s.querySelector(q); if (b) b.onclick = f; };
  on('#btnAlch', () => { SFX.tap(); showAlchemy(); });
  on('#btnField', () => { SFX.tap(); showField(); });
  on('#btnPets', () => { SFX.tap(); showPets(); });
  on('#btnForgeH', () => { SFX.tap(); showForge(); });
  const doRet = () => { if (L.startRetreat(st)) { SFX.gather(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, `闭关 ×${st.retreat.m.toFixed(2)}`, '#8ff5d0'); closeModal(); } };
  on('#btnRet', doRet);
  on('#btnRetEnd', () => { const r = L.endRetreat(st, false); if (r) { SFX.tap(); showHome(true); } });
  on('#btnHeal', () => { const w = L.healWith(st); if (L.heal(st)) { SFX.coin(); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, (w === 'liaoshang' ? '疗伤丹 ' : '') + '伤势痊愈', '#8ff5d0'); showHome(true); } });
  s.querySelectorAll('[data-hp]').forEach(b => b.onclick = () => { SFX.tap(); homeSel = +b.dataset.hp; homeDemo = ''; showHome(true); });
  s.querySelectorAll('button[data-k]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.k, lv0 = st.home[k], plot0 = L.homePlotMax(st), h0 = Object.keys(st.meta.chint || {}).length;
    if (!L.upgrade(st, k)) return;
    SFX.coin();
    const sp = homeSpot(k); floatText(sp.x, sp.y - 16, `${HB(k).n} Lv${st.home[k]}`, '#ffe39a');
    if (k === 'cave' && L.homePlotMax(st) > plot0) homeMsg = `洞府 Lv${lv0} → <b>Lv${st.home[k]}</b>：多出一块地（${plot0} → <b>${L.homePlotMax(st)}</b> 块）。`;
    else if (k === 'library' && Object.keys(st.meta.chint).length > h0) homeMsg = `藏经阁 Lv${st.home[k]}：书里翻出一条共鸣提示——${esc(L.comboHintText(Object.keys(st.meta.chint).slice(-1)[0]))}。`;
    showHome(true);
  });
  s.querySelectorAll('[data-build]').forEach(btn => btn.onclick = () => {
    const k = btn.dataset.build, r = L.build(st, k, homeSel);
    if (!r) return;
    SFX.coin(); banner(`${HB(k).n}建成`, `Lv${r.lv}${r.lv > 1 ? ' · 重建' : ''}`);
    const sp = homeSpot(k); floatText(sp.x, sp.y - 16, `${HB(k).n}建成`, '#ffe39a');
    homeMsg = `【${HB(k).n}】Lv${r.lv}：${esc(HB(k).d(r.lv))}${r.hints.length ? `；书里翻出共鸣提示 ${r.hints.length} 条` : ''}。`;
    showHome(true);
  });
  s.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => { SFX.tap(); homeDemo = b.dataset.demo; showHome(true); });
  s.querySelectorAll('[data-demo-no]').forEach(b => b.onclick = () => { SFX.tap(); homeDemo = ''; showHome(true); });
  s.querySelectorAll('[data-demo-yes]').forEach(b => b.onclick = () => {
    const r = L.demolish(st, b.dataset.demoYes); homeDemo = '';
    if (!r) return;
    SFX.coin(); homeMsg = `拆了${HB(r.k).n}（Lv${r.lv}）：退回 <b>${fmt(r.back)}</b> 灵石${r.keep >= 1 ? `，重建从 ${r.keep} 级起` : ''}。这块地空出来了。`;
    showHome(true);
  });
  s.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    SFX.tap();
    const g = b.dataset.go;
    if (g === 'zhen') showZhen(); else if (g === 'field') showField(); else if (g === 'alch') showAlchemy(); else if (g === 'forge') showForge(); else if (g === 'pets') showPets();
    else if (g === 'ret') doRet(); else if (g === 'arts') showMe('art'); else if (g === 'market') showMarket();
  });
}

// ---------- 阵法（SYSTEMS §6.3）：两个阵位、八张阵图；换阵免费，3 周天后生效 ----------
// 老祖推荐布什么：要渡劫了 → 渡劫；灵草够炼很多炉 → 丹火；否则聚灵
function zhenRec() {
  const has = id => L.zhenOwned(st, id);
  if (has('f_dujie') && L.tribNeeded(st) && st.p.s === 3 && (L.isFull(st) || L.ticksToNext(st) <= 6)) return { id: 'f_dujie', why: `要渡劫了：承劫 +${L.pct(L.formationVal(st, 'f_dujie'))}，${L.ZV.switch} 个周天后生效` };
  const rc = L.RECIPES[0], n = st.home.furnace ? Math.floor(st.herbs / Math.max(1, L.herbCost(st, rc))) : 0;
  if (has('f_danhuo') && n >= 6) return { id: 'f_danhuo', why: `灵草够炼 ${n} 炉：成丹率 ${L.pct(L.alchRate(st))} → ${L.pct(Math.min(0.97, L.alchRate(st) + L.zhenNum(st, 'f_danhuo', 1).alch))}` };
  return { id: 'f_juling', why: `平时聚灵：修炼 ×${L.zhenNum(st, 'f_juling', 1).cul.toFixed(2)}` };
}
function showZhen(still) {
  if (!L.zhenOpen(st)) { showHome(still, 0); return; }
  const z = L.zhenState(st), sl = L.zhenSlots(st), rec = zhenRec();
  const slotCard = j => {
    const s = z[j], id = s.id || s.nx;
    return `<div class="card flat zslot${s.nx ? ' zpend' : ''}"><div style="flex:none">${id ? sigilImg(id, 2.5) : tileImg('empty')}</div><div class="main"><div><b>${j ? '第二阵位（×0.5）' : '主阵位'}</b></div>${s.id ? `<div class="jadet">${esc(L.zhenName(s.id))}：${esc(L.zhenEffect(st, s.id, j ? L.ZV.second : 1))}</div>` : '<div class="muted">空着</div>'}${s.nx ? `<div class="seal">布阵中：${esc(L.zhenName(s.nx))}，还要 ${Math.max(1, s.at - st.tick)} 周天</div>` : ''}</div>${j && (s.id || s.nx) ? '<div class="right"><button class="btn sm alt" data-zclear="1">撤下</button></div>' : ''}</div>`;
  };
  const rows = L.ZHEN.slice().sort((a, b) => (b.id === rec.id) - (a.id === rec.id) || L.zhenOwned(st, b.id) - L.zhenOwned(st, a.id)).map(Z => {
    const own = L.zhenOwned(st, Z.id), w = L.zhenWhere(st, Z.id);
    const tag = (Z.id === rec.id ? '<span class="chip warn">荐</span> ' : '') + (w ? `<span class="chip ok">${w.on ? (w.slot ? '第二阵位' : '布着') : `布阵中 ${w.pend}`}</span> ` : '');
    const btn = j => { const why = L.zhenSetWhy(st, j, Z.id), keep = z[j].id === Z.id && z[j].nx; return `<button class="btn sm ${why || j ? 'alt' : 'gold'}" data-zs="${j}" data-zid="${Z.id}" ${why ? 'disabled' : ''}>${keep ? '不换了' : j ? '第二阵位' : '布阵'}</button>`; };
    return `<div class="card flat crow${own ? '' : ' off'}"><div style="flex:none">${sigilImg(Z.id, 2, !own)}</div><div class="main"><div class="line">${tag}<span>${esc(L.zhenName(Z.id))}</span></div>
      <div class="${own ? 'jadet' : 'muted'}">${esc(L.zhenEffect(st, Z.id))}</div><div class="muted">${Z.id === rec.id ? esc(rec.why) : own ? esc(Z.use) : '来源：' + esc(Z.src)}</div></div>
      <div class="right">${own ? btn(0) + (sl >= 2 ? btn(1) : '') : '<span class="muted">没有阵图</span>'}</div></div>`;
  }).join('');
  const body = `<div id="zhenSlots">${slotCard(0)}${sl >= 2 ? slotCard(1) : ''}</div>${homeMsg ? `<div class="quote">${homeMsg}</div>` : ''}${rows}
    <div class="muted">强度 = 聚灵阵等级（Lv${st.home.array}）。换阵不花钱，<b>${L.ZV.switch}</b> 个周天后生效，这期间原来的阵照常管用。${sl >= 2 ? '第二阵位效果减半。' : '炼虚后开第二阵位（效果 ×0.5）。'}平时聚灵；大量炼丹前布丹火；渡劫前 ${L.ZV.switch} 个周天布渡劫。</div>`;
  const s = sheet({ title: '阵法', still, sub: `聚灵阵 Lv${st.home.array} · 阵图 ${L.zhenOwnList(st).length}/${L.ZHEN.length} · 修炼 +${dec(L.gain(st))}/周天`, body, foot: [{ t: '回洞府', alt: true, fn: () => showHome(false, 0) }] });
  homeMsg = '';
  s.querySelectorAll('[data-zs]').forEach(b => b.onclick = () => {
    const j = +b.dataset.zs, id = b.dataset.zid, r = L.zhenSet(st, j, id);
    if (!r) return;
    SFX.gather();
    homeMsg = r.cancel ? `不换了，接着用${esc(L.zhenName(id))}。` : `改布<b>${esc(L.zhenName(id))}</b>：${esc(L.zhenEffect(st, id, j ? L.ZV.second : 1))}，<b>${L.ZV.switch}</b> 个周天后生效${r.from ? `；在那之前${esc(L.zhenName(r.from))}照常` : ''}。`;
    showZhen(true);
  });
  const c = s.querySelector('[data-zclear]'); if (c) c.onclick = () => { if (L.zhenSet(st, 1, '')) { SFX.tap(); showZhen(true); } };
}

// ---------- 洞府场景：建筑（ART.drawBuilding，按 ART.homeSlots 摆）与阵法（ART.drawFormation） ----------
// 丹炉先占原来的位置（右侧第 2 格），其余按地块顺序摆；灵田画在左下（panel-field.js 的 drawPlots），没有灵田时左下那格也能摆
function homeSceneSlots() {
  const S = ART.homeSlots || [], pl = L.homePlots(st), out = [];
  const ks = pl.filter((k, i) => i > 0 && k && k !== 'field');
  const order = ks.includes('furnace') ? ['furnace'].concat(ks.filter(k => k !== 'furnace')) : ks;
  const free = [2, 3, 4, 5, 6, 7].concat(st.home.field ? [] : [1]);
  order.forEach((k, j) => { const P = S[free[j]]; if (P) out.push({ k, x: P.x, y: P.y, i: pl.indexOf(k) }); });
  return out;
}
const homeSpot = k => { if (k === 'array' || k === 'cave') return { x: HOMEPOS.x, y: HOMEPOS.y }; if (k === 'field') return { x: 22, y: 116 }; return homeSceneSlots().find(x => x.k === k) || { x: 166, y: 130 }; };
// part：'back' 画在主角身后（脚底不低于主角），'front' 画在前面；返回夜间光源
function drawBuildings(part) {
  if (!st || !ART.drawBuilding) return [];
  const lights = [];
  for (const b of homeSceneSlots()) {
    if ((b.y > HOMEPOS.y) !== (part === 'front')) continue;
    const l = ART.drawBuilding(b.k, st.home[b.k], b.x, b.y, T); if (l) lights.push(l);
    if (b.k === 'furnace' && Math.random() < 0.06) parts.push({ x: b.x + (Math.random() - 0.5) * 4, y: b.y - 16, vx: 0.002, vy: -0.01, life: 2600, max: 2600, c: '#d8d0e4', s: 2 });
  }
  return lights;
}
// 阵法光圈：主阵位、第二阵位小一圈，布阵中的画虚线；返回主阵位的光色
function drawZhen(part) {
  if (!st.home.array || !ART.drawFormation || (L.arrayPaused && L.arrayPaused(st))) return null;
  const z = L.zhenState(st); let col = null;
  for (const j of [0, 1]) {
    if (j && L.zhenSlots(st) < 2) continue;
    const s = z[j], o = { small: !!j, part };
    if (s.id) { ART.drawFormation(s.id, HOMEPOS.x, HOMEPOS.y, T, o); if (!j) col = ART.sigilColor(s.id); }
    if (s.nx) ART.drawFormation(s.nx, HOMEPOS.x, HOMEPOS.y, T, Object.assign({}, o, { pending: true }));
  }
  return col;
}
// 点场景里的建筑：打开【洞府】并选中那块地
function homeSceneHit(x, y) {
  if (!st || st.exp) return false;
  for (const b of homeSceneSlots()) if (Math.abs(x - b.x) <= 12 && y >= b.y - 24 && y <= b.y + 3) { SFX.tap(); showHome(false, b.i); return true; }
  return false;
}

// ---------- 老祖：地块（地块比建筑少）、阵法，各一次阻塞讲解；新建筑解锁、新阵图、要渡劫了、大量炼丹前用气泡 ----------
const homeCalm = () => st.guide && st.guide.done && !modalOpen() && !L.busy(st) && !(st.storyQ || []).length && L.home2On();
const homeHints = [
  { id: 'plots', intro: true, when: () => homeCalm() && L.homeUnbuilt(st).length > L.homePlotFree(st), target: '[data-nav="home"]', btn: '知道了', text: () => {
      const un = L.homeUnbuilt(st), free = L.homePlotFree(st), max = L.homePlotMax(st), c = L.homeNextPlotCave(st);
      const cost = c ? L.homeSum('cave', c) - L.homeSum('cave', st.home.cave) : 0, r = homeRec();
      return `洞府只有 <b>${max}</b> 块地，能建的却多了：${un.map(k => `【${HB(k).n}】`).join('')}——<b>地块比建筑少</b>，得挑。${free ? `还空 ${free} 块。` : '地已经满了。'}${c ? `洞府升到 <b>${c}</b> 级多一块（还要 ${fmt(cost)} 灵石）；` : ''}或者拆一样：退一半本钱，重建从一半等级起。${r ? `眼下最值的是【${HB(r.k).n}】：${esc(r.why)}。` : ''}`;
    } },
  { id: 'zhen', intro: true, when: () => homeCalm() && L.zhenOpen(st) && L.zhenOwnList(st).length >= 2, target: '[data-nav="home"]', btn: '好', text: () => {
      const other = L.zhenOwnList(st).filter(id => id !== 'f_juling'), d = other.includes('f_dujie') ? 'f_dujie' : other[0];
      return `聚灵阵上能<b>换阵法</b>了：现在布着聚灵阵，修炼 <b>×${L.zhenNum(st, 'f_juling', 1).cul.toFixed(2)}</b>。你手里还有${other.map(id => `《${esc(L.zhenName(id))}》`).join('')}，比如${esc(L.zhenName(d))}：${esc(L.zhenEffect(st, d))}。换阵不花钱，<b>${L.ZV.switch} 个周天</b>后生效，这期间原来的阵照常管用；换走聚灵阵就没了那份修炼。平时聚灵，要渡劫了提前布渡劫阵。【洞府】→ 点聚灵阵那块地 →【换阵】。`;
    } },
];
// 每周天（boot.js 的 onTick 调）：阵法布成、灵泉养伤的飘字；拆建教学（tut_rebuild）；气泡一次最多一条
function homeTickFx(out) {
  if (!st || !L.home2On()) return;
  if (out.zhen && !st.exp) for (const z of out.zhen) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 18, `${L.zhenName(z.id)}布成`, '#ffe39a');
  if (out.springHeal && !st.exp) floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, `灵泉养伤 −${out.springHeal} 周天`, '#8ff5d0', false, true);
  if (st.home.tut && $('#modal').hidden && !cine) {
    delete st.home.tut;
    const cand = L.homePlots(st).map((k, i) => ({ k, i })).filter(x => x.i > 0 && x.k).sort((a, b) => st.home[a.k] - st.home[b.k])[0];
    if (cand) pushPopup(() => { homeMsg = `老祖指着【${HB(cand.k).n}】那块地：“拆它。退你 ${fmt(L.homeRefund(st, cand.k))} 灵石，等级记着，往后重建从 ${Math.max(1, Math.floor(st.home[cand.k] * L.HV.keep))} 级起。”`; showHome(false, cand.i); homeDemo = cand.k; showHome(true); });
    return;
  }
  if (!st.guide || !st.guide.done || cine) return;
  // 新建筑能建了（灵田、丹炉、聚灵阵有自己的讲解）
  for (const k of L.BLD_KEYS) {
    if (!HB(k).nu || st.home[k] || !L.homeUnlocked(st, k) || st.seenTips['bld_' + k]) continue;
    const free = L.homePlotFree(st), lv = L.homeRebuildLv(st, k);
    tip('bld_' + k, `【${HB(k).n}】能建了：${L.homeDelta(st, k, 0, lv)}，${fmt(L.homeCost(st, k))} 灵石。${free ? `还空 ${free} 块地，【洞府】点空地就建。` : '地块满了：扩建洞府，或者拆一样。'}`);
    return;
  }
  // 新得的阵图（阵法讲解之后）
  if (L.zhenOpen(st) && st.hintSeen && st.hintSeen.zhen) for (const id of L.zhenOwnList(st)) {
    if (id === 'f_juling' || st.seenTips['zt_' + id]) continue;
    tip('zt_' + id, `得了《${L.zhenName(id)}》阵图：布在聚灵阵上，${L.zhenEffect(st, id)}。${L.ZHEN_ONE[id].use}。`);
    return;
  }
  // 要渡劫了：换渡劫阵（每个境界提醒一次）
  if (L.zhenOpen(st) && L.zhenOwned(st, 'f_dujie') && L.tribNeeded(st) && !L.zhenWhere(st, 'f_dujie') && st.p.s === 3 && (L.isFull(st) || L.ticksToNext(st) <= L.ZV.switch + 2)) {
    tip('zhenDujie' + st.p.r, `要渡劫了，把阵换成渡劫阵：承劫 +${L.pct(L.formationVal(st, 'f_dujie'))}，${L.ZV.switch} 个周天后生效。这期间聚灵阵照常；渡完记得换回来（修炼 ×${L.zhenNum(st, 'f_juling', 1).cul.toFixed(2)}）。`);
    return;
  }
  // 大量炼丹前：换丹火阵（每个境界提醒一次）
  const rc = L.RECIPES[0], n = st.home.furnace ? Math.floor(st.herbs / Math.max(1, L.herbCost(st, rc))) : 0;
  if (L.zhenOpen(st) && L.zhenOwned(st, 'f_danhuo') && !L.zhenWhere(st, 'f_danhuo') && n >= 6) {
    const a = L.alchRate(st), b = Math.min(0.97, a + L.zhenNum(st, 'f_danhuo', 1).alch);
    tip('zhenDanhuo' + st.p.r, `灵草 ${fmt(st.herbs)} 株，够炼 ${n} 炉${rc.n}。大量炼丹前把阵换成丹火阵：成丹率 ${L.pct(a)} → ${L.pct(b)}，上品以上 +${L.pct(L.zhenNum(st, 'f_danhuo', 1).q)}，${L.ZV.switch} 个周天后生效。`);
  }
}
