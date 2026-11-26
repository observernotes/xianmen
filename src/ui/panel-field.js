/* 废柴仙途 · 界面片段 panel-field：灵田（【洞府】→ 灵田，或点场景里的田）：田一排，点田 → 作物列表（改这一块 / 全部改种），第一项是老祖推荐的；
 * 洞府场景里的田（ART.drawPlot，drawHome 收到的灵田等级是 0，田由这里画）、收成飘字、药引库存的小条。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。数值全部取自 src/logic/crops.js，按钮上写着“前 → 后”。 */
let fieldSel = 0, fieldAll = false, fieldMsg = '';
const YIN_LET = { fire: 'f', ice: 'i', thunder: 't', wood: 'w', soul: 's' };
const yinIcon = (y, k) => icon16('yin_' + YIN_LET[y], k || 1);
const cropIcon = (id, k) => { const c = ART.crop(id), z = pxs(16, k || 1.5); return `<img class="px" src="${urlOf(c, 'crop|' + id)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">`; };
// 一块田的缩略图（ART.drawPlot 画到离屏画布上）
function plotImg(x, k) {
  const id = x ? x.c : '', sg = x ? L.plotStage(x) : 0, key = ['plot', id, sg].join('|');
  if (!avCache.has(key)) {
    const c = document.createElement('canvas'); c.width = 20; c.height = 14;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    ART.setCtx(g, 20); ART.drawPlot(1, 5, id, sg, 0); ART.setCtx(ctx, W);
    avCache.set(key, c.toDataURL());
  }
  const z = pxs(1, k || 3);
  return `<img class="px" src="${avCache.get(key)}" style="width:${20 * z}px;height:${14 * z}px;flex:none" alt="">`;
}
// 药引库存一行（炼丹房、灵田共用）
function yinBar() {
  return `<div class="yinbar"><span class="muted">药引</span>${L.YIN_KEYS.map(y => `<span class="res" title="${L.YIN_N[y]}" aria-label="${L.YIN_N[y]} ${L.yinHave(st, y)}">${yinIcon(y, 1)}<b class="num">${L.yinHave(st, y)}</b></span>`).join('')}</div>`;
}
// 一茬收多少、平均每周天多少（灵稻写灵石，别的写产出）
function cropOutText(id) {
  const C = L.CROP[id], h = L.cropHarvest(st, id);
  if (C.out === 'stones') return `每块每周天灵石 +${dec(h / C.cyc)}`;
  return `${C.cyc} 周天收${L.cropOutN(C)} ${dec(h)}`;
}
// 把第 i 块（或全部）改种成 id 之前 / 之后：灵石收入、这种产出每周天多少
function plantDelta(id, all) {
  const plots = L.plots(st), keep = plots.map(x => ({ c: x.c, g: x.g }));
  const a = L.income(st);
  try { plots.forEach((x, i) => { if (all || i === fieldSel) x.c = id; }); return { a, b: L.income(st) }; } finally { keep.forEach((x, i) => Object.assign(plots[i], x)); }
}
// 老祖推荐种什么：灵宠进化、没揭晓的丹方缺的药引 > 灵草不够 > 灵稻
function cropRec() {
  const yc = { fire: 'fire', ice: 'ice', thunder: 'bolt', wood: 'vine', soul: 'soul' };
  for (const p of st.pets || []) if (L.petCanEvo(p)) for (const b of [1, 2]) for (const x of L.petBranchNeeds(st, p, b)) {
    const y = L.YIN_KEYS.find(k => x.t.includes(L.YIN_N[k]));
    if (y && !x.ok && L.cropOpen(st, yc[y])) return { id: yc[y], why: `【${L.petName(p)}】进化要${L.YIN_N[y]} ×${x.need}（你有 ${x.have}）` };
  }
  if (L.yinOpen(st)) for (const g of L.YIN_GRID) if (!L.recipeKnown(st, g[2])) for (const y of [g[0], g[1]]) if (L.yinHave(st, y) < (g[0] === g[1] ? 2 : 1) && L.cropOpen(st, yc[y])) return { id: yc[y], why: `试炼新丹方还缺${L.YIN_N[y]}` };
  if (st.home.furnace && st.herbs < 2 * L.herbCost(st, L.RECIPES[0]) && L.plotCount(st) >= 2) return { id: 'herb', why: `灵草 ${fmt(st.herbs)}，不够炼两炉培元丹` };
  return { id: 'rice', why: `灵稻结灵石，每块每周天 +${dec(L.fieldInc(st.home.field) / Math.max(1, L.plotCount(st)))}` };
}
function showField(sel, still) {
  if (!L.plotCount(st)) { showHome(); return; }
  if (sel !== undefined) { fieldSel = sel; fieldAll = false; }
  const plots = L.plots(st);
  if (fieldSel >= plots.length) fieldSel = 0;
  const cards = plots.map((x, i) => {
    const C = L.CROP[x.c], left = L.plotLeft(x);
    return `<button class="fplot${i === fieldSel && !fieldAll ? ' sel' : ''}${fieldAll ? ' all' : ''}" data-fp="${i}">${plotImg(x, 2)}<span class="nm">${C.n}</span><span class="muted">${left <= 1 ? '下周天收' : left + ' 周天后收'}</span></button>`;
  }).join('');
  const rec = cropRec(), cur = plots[fieldSel];
  // 作物卡：图标 + 名字（荐 / 旺季）+ 改种后的变化（灵石 a → ▲b，或一茬收多少）+【改种】；只有“荐”的那一行是金色；没开的作物收进折叠
  const crow = C => {
    const open = L.cropOpen(st, C.id), here = !fieldAll && cur.c === C.id, every = fieldAll && plots.every(x => x.c === C.id);
    const sea = L.cropSeason(st, C), d = open ? plantDelta(C.id, fieldAll) : null;
    const delta = d && Math.abs(d.b - d.a) >= 0.05 ? `灵石 +${dec(d.a)} → <b>+${dec(d.b)}</b>/周天` : '';
    const tag = (C.id === rec.id ? '<span class="chip warn">荐</span> ' : '') + (sea ? `<span class="chip ok">旺季 +${Math.round(sea * 100)}%</span> ` : `<span class="chip">${L.SEASONS[C.s].n}季旺</span> `);
    const why = !open ? L.cropLock(st, C.id) : '';
    const btn = here || every ? `<button class="btn sm alt" disabled>种着</button>` : `<button class="btn sm ${open && C.id === rec.id ? 'gold' : 'alt'}" data-crop="${C.id}" ${open ? '' : 'disabled'}>${fieldAll ? '全改' : '改种'}</button>`;
    const key = !open ? `<span class="seal">${esc(why)}</span>` : d && Math.abs(d.b - d.a) >= 0.05 ? `灵石 <b class="${d.b > d.a ? 'pn-up' : 'pn-dn'}">${d.b > d.a ? '+' : '−'}${dec(Math.abs(d.b - d.a))}</b>/周天` : esc(cropOutText(C.id));
    return pnFold('crop-' + C.id, { cls: 'crow' + (open ? '' : ' off pn-off'), ic: cropIcon(C.id, 2), nm: `${C.id === rec.id ? '<span class="chip warn">荐</span> ' : ''}${C.n}`, badge: sea ? `<span class="chip ok">旺季</span>` : '', k: key, right: btn,
      body: `${C.id === rec.id ? `<div class="pn-line">老祖：${esc(rec.why)}</div>` : ''}<div class="pn-line">${C.cyc} 周天一收 · ${open ? esc(cropOutText(C.id)) : '产' + L.cropOutN(C)}</div><div class="pn-line">${tag}</div>${delta ? `<div class="pn-line">${delta}</div>` : ''}` });
  };
  const sorted = L.CROPS.slice().sort((a, b) => (b.id === rec.id) - (a.id === rec.id)), cOpen = sorted.filter(C => L.cropOpen(st, C.id)), cLock = sorted.filter(C => !L.cropOpen(st, C.id));
  const list = `<div class="pn-list">${cOpen.map(crow).join('')}</div>${cLock.length ? `<details class="more" data-pn="crop-lock"${pnOpenKeys.has('crop-lock') ? ' open' : ''}><summary>还没开的作物 · ${cLock.length} 种</summary><div class="pn-list">${cLock.map(crow).join('')}</div></details>` : ''}`;
  const yp = L.cropParts(st, cur.c === 'rice' ? 'herb' : cur.c).map(x => `${x[0]} ×${mult2(x[1])}`).join(' · ');
  const body = `${yinBar()}<div class="fplots">${cards}</div>
    <div class="tabs fscope"><button class="${fieldAll ? '' : 'on'}" data-scope="0">改第 ${fieldSel + 1} 块</button><button class="${fieldAll ? 'on' : ''}" data-scope="1">全部 ${plots.length} 块</button></div>
    ${fieldMsg ? `<div class="quote">${fieldMsg}</div>` : ''}${list}
    <details class="more"><summary>灵田怎么长</summary><div class="muted">熟了自动收、接着种同一种；改种那块从头长。灵稻的灵石按周天结（全种灵稻就是灵田原来的收入），种别的就少那块的灵石。产量：${esc(yp)}。灵田每 ${L.CROP_V.plotEvery} 级多一块田（最多 ${L.CROP_V.plotMax} 块），每级作物产量 +${Math.round(L.CROP_V.lvYield * 100)}%。</div></details>`;
  const s = sheet({ title: '灵田', still, sub: `灵石 +${fmt(L.income(st))}/周天 · 灵草 ${fmt(st.herbs)}`, body, foot: [{ t: '回洞府', alt: true, fn: () => showHome() }] });
  fieldMsg = '';
  s.querySelectorAll('[data-fp]').forEach(b => b.onclick = () => { SFX.tap(); fieldSel = +b.dataset.fp; fieldAll = false; showField(undefined, true); });
  s.querySelectorAll('[data-scope]').forEach(b => b.onclick = () => { SFX.tap(); fieldAll = b.dataset.scope === '1'; showField(undefined, true); });
  s.querySelectorAll('[data-crop]').forEach(b => b.onclick = () => {
    const id = b.dataset.crop, C = L.CROP[id], a = L.income(st);
    const n = fieldAll ? L.plantAll(st, id) : (L.plant(st, fieldSel, id) ? 1 : 0);
    if (!n) return;
    SFX.coin();
    const pos = fieldPlotPos(fieldSel); floatText(pos.x + 8, pos.y - 2, `改种${C.n}`, '#8ff5d0');
    fieldMsg = `${fieldAll ? `${n} 块田` : `第 ${fieldSel + 1} 块`}改种${C.n}：${cropOutText(id)}${Math.abs(L.income(st) - a) >= 0.05 ? `；灵石 +${dec(a)} → <b>+${dec(L.income(st))}</b>/周天` : ''}`;
    showField(undefined, true);
  });
}

// ---------- 洞府场景里的田：第 i 块在 (5 + (i % 2) × 18, 112 + (i >> 1) × 12)（ART.drawPlot 的建议坐标） ----------
const fieldPlotPos = i => ({ x: 5 + (i % 2) * 18, y: 112 + (i >> 1) * 12 });
function drawPlots() {
  if (!st || !st.home.field) return;
  const plots = L.plots(st);
  plots.forEach((x, i) => { const p = fieldPlotPos(i); ART.drawPlot(p.x, p.y, x.c, L.plotStage(x), T); });
  // 竹篱小牌
  const R = ART.R; R(1, 108, 1, 5, '#8a6a3c'); R(0, 106, 4, 3, '#b89456'); R(1, 107, 2, 1, '#5a4034');
}
function fieldSceneHit(x, y) {
  if (!st || !st.home.field || st.exp) return false;
  const plots = L.plots(st);
  for (let i = 0; i < plots.length; i++) { const p = fieldPlotPos(i); if (x >= p.x - 2 && x <= p.x + 18 && y >= p.y - 8 && y <= p.y + 9) { SFX.tap(); if (L.cropsOpen(st)) showField(i); else showHome(); return true; } }
  return false;
}
// 换季气泡（panel-cal.js 的 seasonTip）里的一句：这一季旺的作物，田里种着的写“一茬 a → b”
function cropSeasonLine(s) {
  if (!L.plotCount(st) || !L.cropsOpen(st)) return '';
  const Cs = L.CROPS.filter(C => C.s === s && C.out !== 'stones' && L.cropOpen(st, C.id));
  if (!Cs.length) return '';
  const on = Cs.filter(C => L.plots(st).some(x => x.c === C.id)), a = Math.round(L.CROP_V.season * L.seasonAmp(st) * 100);
  return `灵田${Cs.map(C => C.n).join('、')} +${a}%` + (on.length ? `（田里的${on.map(C => `${C.n}一茬 ${dec(L.cropHarvest(st, C.id) / (1 + L.cropSeason(st, C)))} → ${dec(L.cropHarvest(st, C.id))}`).join('、')}）` : '');
}
// 新作物解锁：老祖一句气泡（灵田讲解之后；开田时就有的灵草、灵稻不算）
function cropUnlockTip() {
  if (!st.guide || !st.guide.done || !st.hintSeen || !st.hintSeen.crops || !L.cropsOpen(st)) return;
  const fresh = L.CROPS.filter(C => C.id !== 'herb' && C.id !== 'rice' && L.cropOpen(st, C.id) && !st.seenTips['crop_' + C.id]);
  if (!fresh.length) return;
  const txt = fresh.map(C => `【${C.n}】${C.cyc} 周天收${L.cropOutN(C)} ${dec(L.cropHarvest(st, C.id))}（${L.SEASONS[C.s].n}季 +${Math.round(L.CROP_V.season * 100)}%）`).join('，');
  for (const C of fresh.slice(1)) st.seenTips['crop_' + C.id] = 1;
  tip('crop_' + fresh[0].id, `灵田能种${txt}了。点画面左下的田改种，种的那块就不结灵石。`);
}
// 每周天：收成飘字（田上方）、自动续炼飘字（丹炉旁）、新作物气泡
function fieldTickFx(out) {
  cropUnlockTip();
  if (st.exp || cine || !$('#modal').hidden) return;
  if (out.harvest) {
    let k = 0;
    for (const o in out.harvest) {
      if (o === 'stones') continue;
      const v = out.harvest[o], n = o === 'herbs' ? '灵草' : o === 'feed' ? '兽粮' : L.YIN_N[o];
      floatText(22, 100 - 8 * k++, `${n} +${dec(v)}`, o === 'herbs' ? '#9ae06a' : o === 'feed' ? '#e8925a' : '#ffb23f', false, true);
    }
  }
  if (out.brew) { const r = out.brew[out.brew.length - 1]; floatText(166, 104, r.ok ? `续炼·${r.n}` : '续炼炸炉', r.ok ? '#ffe39a' : '#9d93b8', false, true); }
}
