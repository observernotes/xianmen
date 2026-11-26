/* 废柴仙途 · 界面片段 panel-realm：秘境（SYSTEMS §8）——场景换成秘境背景，下方两三张门卡，一层点一下；房间小动画、飘字、气血条；
 * 入口（历练页最上面一格、年历）、商、秘藏三选一、结算；老祖的三句开场与低气血提醒（台词里的数字当场算）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。规则与数据在 src/logic/realm.js。
 * 局中时间暂停（boot.js 的 frame 见 st.run 就不走时）；走到一半关掉也能续（st.run 随存档）。 */
// ---------- 样式（只有秘境用，挂在这里免得动模板） ----------
(function () {
  const css = `
#mjUI { position: absolute; inset: 0; pointer-events: none; }
#mjUI > * { position: absolute; pointer-events: auto; }
#mjUI .mjtxt { color: var(--text); text-shadow: 1px 0 0 var(--ink), -1px 0 0 var(--ink), 0 1px 0 var(--ink), 0 -1px 0 var(--ink); white-space: nowrap; pointer-events: none; }
#mjTop { left: 2%; right: 2%; display: flex; justify-content: space-between; gap: 6px; }
#mjTop .th b { color: var(--gold); font-weight: normal; }
#realmHp { pointer-events: none; display: flex; align-items: center; justify-content: flex-end; }
#realmDoors { left: 0; right: 0; pointer-events: none; }
.mjdoor { position: absolute; padding: 0; border: 0; background: none; cursor: pointer; pointer-events: auto; min-width: 44px; min-height: 44px; }
.mjdoor img { width: 100%; height: 100%; display: block; image-rendering: pixelated; }
.mjdoor span { position: absolute; left: 50%; bottom: 2px; transform: translateX(-50%); padding: 0 3px; background: rgba(11, 9, 18, .78); color: #fff6dc; white-space: nowrap; font-size: var(--fs); line-height: 1.25; }
.mjdoor span.bad { color: #ff9a8a; } .mjdoor span.good { color: #8ff5d0; }
.mjdoor:active { transform: translateY(2px); }
.mjdoor.rec::after { content: '荐'; position: absolute; top: -2px; right: -4px; background: var(--jade); color: #0d2b20; padding: 0 2px; line-height: 1.2; }
#mjBar { left: 2%; right: 2%; display: flex; align-items: center; gap: 6px; }
#mjBar .msg { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
#realmLeave { flex: none; min-height: 44px; padding: 4px 10px; }
.mjroom { display: flex; gap: 8px; align-items: center; }
.mjroom img { flex: none; }
.mjfloor { display: flex; flex-wrap: wrap; gap: 3px; }
.mjfloor span { background: var(--paper-lo); padding: 0 4px; font-variant-numeric: tabular-nums; }
.mjfloor span.boss { background: var(--seal); color: #fff; }
.mjcard.rec { box-shadow: 0 0 0 2px var(--jade), 0 -2px 0 0 #b9a77c, 0 2px 0 0 #b9a77c; }
.mjsheet .foot .btn, #modal [data-shop] { min-height: 44px; }
#modal [data-shop] { min-width: 72px; }
`;
  const el = document.createElement('style'); el.textContent = css; document.head.appendChild(el);
})();

// ---------- 小工具 ----------
// 秘境的弹窗：底部按钮至少 44 像素高（手机上好点）
function mjSheet(o) { const s = sheet(o); s.classList.add('mjsheet'); return s; }
const MJ_DOOR_CN = { fight: '战', elite: '精英', chest: '宝', spring: '泉', event: '奇', insight: '悟', shop: '商', boss: '守关', unk: '？' };
const mjTh = () => (st && st.run ? L.mjTheme(st.run.theme) : L.mjThemeNow(st));
const mjName = run => (run && run.xf ? '仙府' : (run ? L.mjTheme(run.theme) : L.mjThemeNow(st)).n + '秘境');
function doorImg(type, w) { const c = ART.door(type); return `<img class="px" src="${urlOf(c, 'door|' + type)}" style="width:${w}px;height:${Math.round(w * 40 / 32)}px" alt="${MJ_DOOR_CN[type] || ''}">`; }
// 门卡下面那行：战斗房掉多少、泉加多少、宝有三成陷阱
function doorLabel(d) {
  const e = L.mjDoorEst(st, d);
  if (!e) return ['', ''];
  if (e.t === 'unk') return ['？', ''];
  if (L.mjFight(e.t)) return [e.hp ? `${MJ_DOOR_CN[e.t]} ${e.hp}` : `${MJ_DOOR_CN[e.t]} 无伤`, e.hp <= -(st.run.hp) ? 'bad' : ''];
  if (e.t === 'spring') return [`泉 +${e.hp}`, 'good'];
  return [MJ_DOOR_CN[e.t], ''];
}
// 门的摆放（场景坐标，脚底 y = 128）
function doorPos(n, i) { const xs = n === 1 ? [138] : n === 2 ? [112, 162] : [96, 136, 176]; return { x: xs[i], y: 88, w: 32, h: 40 }; }

// ---------- 场景 ----------
let mjFx = null;          // 正在播的房间动画 { t0, dur, type, x, res, i }
let mjWait = 0;           // 房间动画放完、等着弹奇遇 / 商 / 秘藏的那一小会儿（毫秒时间戳）
let mjUIKey = '';
function drawRealmScene(dt) {
  const run = st.run, th = L.mjTheme(run.theme), FD = ART.dims.fighter;
  ART.drawRealm(th.art, T, OY);
  // 主角：战斗房挥剑，挨打踉跄，出局倒地
  let frame = (T / 520 | 0) % 2 ? 'idle1' : 'idle0';
  if (mjFx) {
    const k = (T - mjFx.t0) / mjFx.dur;
    if (L.mjFight(mjFx.type)) frame = k < 0.25 ? 'windup' : k < 0.55 ? 'strike' : mjFx.res.dmg ? 'hit' : 'idle0';
    if (mjFx.res.wipe && k > 0.5) frame = 'down';
  }
  const px = 44 + (mjFx && L.mjFight(mjFx.type) && (T - mjFx.t0) / mjFx.dur < 0.55 ? Math.round(((T - mjFx.t0) / mjFx.dur) * 30) : 0);
  ctx.drawImage(ART.fighter({ look: st.p.look, realm: Math.min(st.p.r, 9) }, frame), px - FD.ax, 128 - FD.ay);
  // 气血条（左上）：房间动画放到出手那一下才掉
  ART.drawQiBar(4, -OY + 13, 112, mjHpShown() / run.max, T);
  // 房间动画：推开的门渐隐，门口放 ART.drawRoomFx
  if (mjFx) {
    const k = Math.min(1, (T - mjFx.t0) / mjFx.dur), p = mjFx.pos;
    ctx.globalAlpha = Math.max(0, 1 - k * 1.6);
    ctx.drawImage(ART.door(mjFx.shown), p.x - p.w / 2, p.y);
    ctx.globalAlpha = 1;
    ART.drawRoomFx(mjFx.res.trap ? 'trap' : mjFx.type, L.mjFight(mjFx.type) ? 74 : p.x, 122, k);
    if (k >= 1) { const f = mjFx; mjFx = null; mjRoomDone(f.res); }
  }
  drawParts(dt);
}
const mjHpShown = () => (mjFx && (T - mjFx.t0) / mjFx.dur < 0.55 && mjFx.res.hp0 !== undefined ? mjFx.res.hp0 : st.run.hp);
// 场景上的 DOM 层：标题、气血数字、门卡按钮、离开按钮。状态变了才重画
function syncRealmUI(force) {
  const wrap = $('#sceneWrap'); if (!wrap) return;
  let ui = $('#mjUI');
  if (!st || !st.run || cine) { if (ui) ui.remove(); mjUIKey = ''; return; }
  const run = st.run;
  // 走到一半关掉的：回来时把没处理完的奇遇 / 商 / 秘藏接着弹（刚点完门、正等着弹的不算）
  if (!mjFx && run.phase !== 'door' && $('#modal').hidden && $('#intro').hidden && Date.now() > mjWait) realmResume();
  if (!ui) { ui = document.createElement('div'); ui.id = 'mjUI'; wrap.appendChild(ui); mjUIKey = ''; }
  const key = [run.floor, mjHpShown(), run.max, run.phase, run.loot.length, run.doors.map(d => d.t + d.unk).join(), !!mjFx, H, run.fl.proxy, run.fl.safe, run.fl.elite].join('|');
  if (!force && key === mjUIKey) return;
  mjUIKey = key;
  const pc = (x, w) => (x / W * 100).toFixed(2) + '%', pt = y => ((y + OY) / H * 100).toFixed(2) + '%', ph = h => (h / H * 100).toFixed(2) + '%';
  const showDoors = run.phase === 'door' && !mjFx, n = run.doors.length, rec = showDoors ? L.mjDoorRec(st) : -1;
  const doors = showDoors ? run.doors.map((d, i) => {
    const p = doorPos(n, i), [lab, cls] = doorLabel(d), sh = L.mjDoorShown(d);
    return `<button class="mjdoor${i === rec && n > 1 ? ' rec' : ''}" data-door="${i}" aria-label="${MJ_DOOR_CN[sh]}门" style="left:${pc(p.x - p.w / 2)};top:${pt(p.y)};width:${pc(p.w)};height:${ph(p.h)}"><img class="px" src="${urlOf(ART.door(sh), 'door|' + sh)}" alt=""><span class="${cls}">${esc(lab)}</span></button>`;
  }).join('') : '';
  const canLeave = L.mjCanLeave(st) && !mjFx, nL = L.mjLootN(st);
  const msg = mjFx ? '' : run.phase !== 'door' ? '……' : run.floor >= run.floors ? '最后一层：守关' : `点一扇门${run.cleared ? '继续深入' : '进去'}`;
  ui.innerHTML = `<div id="mjTop" class="mjtxt" style="top:${pt(-OY + 2)}"><span class="th">${esc(mjName(run))} · <b>第 ${run.floor}/${run.floors} 层</b></span><span>收获 ${nL} 件</span></div>
    <div id="realmHp" class="mjtxt" aria-label="气血 ${mjHpShown()}/${run.max}" style="left:${pc(4)};width:${pc(150)};top:${pt(-OY + 11)};height:${ph(11)}">${mjHpShown()}/${run.max}</div>
    <div id="realmDoors" style="top:0;bottom:0">${doors}</div>
    <div id="mjBar" style="top:${pt(132)};height:${ph(26)}"><span class="msg mjtxt">${msg}</span>${canLeave ? `<button class="btn gold" id="realmLeave">带着 ${nL} 件离开</button>` : ''}</div>`;
  ui.querySelectorAll('[data-door]').forEach(b => b.onclick = e => { e.stopPropagation(); ac(); realmPickUI(+b.dataset.door); });
  const lv = ui.querySelector('#realmLeave'); if (lv) lv.onclick = e => { e.stopPropagation(); ac(); SFX.tap(); realmLeaveUI(); };
}
function realmResume() {
  const run = st.run; if (!run) return;
  if (run.phase === 'event') { const ev = L.eventById(run.ev); if (ev) showChoice(ev, realmEventBack); else { run.phase = 'door'; syncRealmUI(true); } }
  else if (run.phase === 'shop') showRealmShop();
  else if (run.phase === 'chest') showRealmChest();
}

// ---------- 点门 ----------
function realmPickUI(i) {
  if (!st.run || st.run.phase !== 'door' || mjFx) return;
  const run = st.run, d = run.doors[i], n = run.doors.length;
  const res = L.mjPick(st, i);
  if (!res) return;
  SFX.tap();
  mjFx = { t0: T, dur: L.mjFight(res.t) ? 900 : 750, type: res.t, shown: res.shown, pos: doorPos(n, i), res };
  if (res.unk) floatText(doorPos(n, i).x, 84, `？→ ${MJ_DOOR_CN[res.t]}`, '#f0dcff', false, true);
  if (L.mjFight(res.t)) setTimeout(() => SFX.hit(), 260);
  saveLocal();
  syncRealmUI(true);
}
// 动画放完：飘字，然后接着弹奇遇 / 商 / 秘藏 / 结算，或者摆出下一层的门
function mjRoomDone(res) {
  let dy = 0;
  const fl = (t, c) => { floatText(136, 80 - dy, t, c, false, true); dy += 11; };
  if (res.forced) fl('精英！', '#ff9a8a');
  if (res.free) fl(res.free === 'proxy' ? '火灵替你打了' : '无伤', '#8ff5d0');
  if (res.dmg) { floatText(44, 84, `−${res.dmg}`, '#ff6b6b', true); shake(); SFX.fail(); }
  if (res.trap) fl('陷阱！', '#ff9a8a');
  if (res.heal) { floatText(44, 84, `+${res.heal}`, '#8ff5d0', true); SFX.gather && SFX.gather(); }
  for (const e of res.loot || []) fl('+' + e.t, '#ffe39a');
  for (const t of res.texts || []) fl(t, '#8ff5d0');
  if (res.skip) fl(`摆渡直达第 ${res.next} 层`, '#c27dff');
  if (res.reroll) fl('这一层换了门', '#c27dff');
  if ((res.loot || []).length) SFX.coin();
  if (res.wipe) { flash(0.7); SFX.fail(); setTimeout(() => realmEndUI(res.wipe), 700); syncRealmUI(true); return; }
  const later = (fn, ms) => { mjWait = Date.now() + ms + 500; setTimeout(() => { if ($('#modal').hidden) fn(); }, ms); };
  if (res.ev) { const ev = L.eventById(res.ev); later(() => showChoice(ev, realmEventBack), 350); syncRealmUI(true); return; }
  if (res.shop) { later(showRealmShop, 300); syncRealmUI(true); return; }
  if (res.chest) { banner('守关已破', '秘藏三选一'); SFX.win(); later(showRealmChest, 900); syncRealmUI(true); return; }
  if (res.next) floatText(100, 40, `第 ${res.next} 层`, '#ffffff');
  syncRealmUI(true);
  realmLowTip();
}
// 奇遇结果页【继续】之后
function realmEventBack() {
  const res = L.mjAfterEvent(st);   // 先结算再关弹窗：closeModal 会刷新 HUD，那时还挂着奇遇就又弹一次
  closeModal();
  if (!res) { syncRealmUI(true); return; }
  saveLocal();
  if (res.wipe) { realmEndUI(res.wipe); return; }
  mjRoomDone(res);
}
// 气血 < 30：老祖气泡（时间本来就停着；每局一次）
function realmLowTip() {
  const run = st.run;
  if (!run || run.warned || run.phase !== 'door' || run.hp >= 30 || !L.mjCanLeave(st)) return;
  run.warned = 1;
  const d = L.mjDmg(st, 'fight', run.floor, run), n = L.mjLootN(st);
  tempHint = { id: 'tmp', target: '#realmLeave', btn: '知道了', text: `气血只剩 <b>${run.hp}</b> 了。该走了，手里已经有 <b>${n}</b> 件——下一层一间战斗房就要掉 <b>${d}</b>，打空了收获丢六成。` };
}

// ---------- 离开 / 结算 ----------
function realmLeaveUI() {
  if (!L.mjCanLeave(st)) return;
  const sum = L.mjLeave(st);
  if (sum) realmEndUI(sum);
}
// 结算：先把 3 个周天走完（期间的论道、会武、拍卖照常排进弹窗队列），再弹收获
function realmEndUI(sum) {
  mjFx = null;
  syncRealmUI(true);
  for (let k = 0; k < sum.ticks; k++) { L.flow(st, 1); onTick(); }
  saveLocal();
  const th = L.mjTheme(sum.theme), g = sum.got;
  const head = sum.how === 'clear' ? `打穿${sum.xf ? '仙府' : th.n + '秘境'}！` : sum.how === 'wipe' ? '重伤出局' : '全身而退';
  const items = g.items || [];
  const plain = g.texts.filter((t, i) => !items.some(it => (it.kind === 'a' ? L.artItemText(st, it) : it.gear ? L.gearItemText(st, it) : '') === t));
  const ci = sum.chest ? (sum.chest.items || []).filter(it => it.kind === 'a' || it.gear) : [];
  const chest = sum.chest ? `<div class="quote center">秘藏：<b>${esc(sum.chest.o.n)}</b>${ci.length ? '' : `<div class="fxlist">${sum.chest.texts.map(t => `<span>${esc(t)}</span>`).join('')}</div>`}</div>` + ci.map(it => (it.kind === 'a' ? artLine(it) : gearLine(it))).join('') : '';
  const rec = L.mjThRec(st, sum.theme);
  const body = `<div class="center">${sum.how === 'clear' ? `${sum.floors} 层全过` : `走到第 ${sum.deep + (sum.how === 'wipe' ? 1 : 0)} 层${sum.how === 'wipe' ? '，气血打空' : ''}`} · 带回 <b>${sum.n}</b> 件${sum.how === 'wipe' ? `，丢了六成${g.lost ? `（${g.lost} 件没了）` : ''}；负伤 ${sum.inj} 周天` : ''}</div>
    ${sum.first ? `<div class="big goldt center">首通 · 称号「${esc(sum.first)}」</div>` : ''}
    ${plain.length ? `<div class="fxlist">${plain.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : '<p class="muted center">两手空空。</p>'}
    ${items.map(it => (it.kind === 'a' ? artLine(it) : it.gear ? gearLine(it) : '')).join('')}${chest}
    <p class="muted center">${th.n}秘境：最深 ${rec.deep} 层${sum.newDeep ? '（新纪录）' : ''} · 通关 ${rec.clears} 次 · 合计通关 ${L.mjRec(st).clears || 0} 次${sum.ticks ? ` · 出来时 ${sum.ticks} 个周天过去了` : ''}</p>`;
  if (sum.how === 'clear') SFX.goal(); else if (sum.how === 'wipe') SFX.fail(); else SFX.coin();
  mjSheet({ title: head, center: true, noClose: true, body, foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
}

// ---------- 商 ----------
function showRealmShop() {
  const run = st.run; if (!run || run.phase !== 'shop') return;
  const have = L.mjPending(st).stones;
  const rows = run.shop.map((o, i) => { const why = L.mjShopWhy(st, i); return pnRow({ ic: icon16(o.k === 'heal' ? 'spring' : o.k === 'pill' ? 'pojing' : o.k === 'yin' ? 'yin_' + (o.y || 'f')[0] : o.k === 'ore' ? 'ore' : o.k === 'art' ? 'frag' : 'seek', 2), nm: esc(o.n), k: o.d ? `<span class="muted">${esc(o.d)}</span>` : '',
    right: `<button class="btn sm alt" data-shop="${i}" ${why ? 'disabled' : ''}><span>${iconHTML('stone', 12)} ${fmt(o.price)}</span>${why ? `<small>${esc(why)}</small>` : ''}</button>` }); }).join('');
  const s = mjSheet({ title: '秘境 · 行商', center: true, noClose: true, sub: `本局捡到灵石 ${fmt(have)}，只收灵石`, body: `<div class="pn-list">${rows}</div>`, foot: [{ t: '不买，走', alt: true, fn: () => realmShopPick(-1) }] });
  s.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => { SFX.coin(); realmShopPick(+b.dataset.shop); });
}
function realmShopPick(i) {
  const res = L.mjShop(st, i);
  closeModal();
  if (!res) return;
  saveLocal();
  if (res.bought) floatText(100, 70, '买下' + res.bought.n, '#ffe39a');
  mjRoomDone(res);
}

// ---------- 秘藏 ----------
const MJ_CHEST_IC = { art: 'frag', plan: 'gscroll', pet: 'egg', treasure: 'treasure', yin: 'yin_w', stones: 'stone' };
function chestImg(o) {
  if (o.k === 'plan' && L.ZHENTU[o.id]) { const c = ART.sigil(o.id); return `<img class="px" src="${urlOf(c, 'sig|' + o.id)}" style="width:${pxs(16, 2)}px;height:${pxs(16, 2)}px" alt="">`; }
  if (o.k === 'art') return artImg(o.id, 2);
  if (o.k === 'yin') return icon16('yin_' + o.id[0], 2);
  if (o.k === 'stones') return iconHTML('stone', 30);
  return icon16(MJ_CHEST_IC[o.k] || 'seek', 2);
}
function showRealmChest() {
  const run = st.run; if (!run || run.phase !== 'chest') return;
  const r = L.mjChestRec(st);
  const rows = run.chest.map((o, i) => `<div class="card mjcard${i === r.i ? ' rec' : ''}" data-chest="${i}"><div style="flex:none">${chestImg(o)}</div><div class="main"><div class="line"><span>${esc(o.n)}</span>${i === r.i ? '<span class="chip ok">荐</span>' : ''}</div><div class="muted">${esc(o.d || '')}</div>${i === r.i && r.why ? `<div class="jadet">${esc(r.why)}</div>` : ''}</div></div>`).join('');
  const s = mjSheet({ title: '秘藏', center: true, noClose: true, sub: `${run.chest.length === 4 ? '四' : '三'}样东西，只能带走一样`, body: rows });
  s.querySelectorAll('[data-chest]').forEach(c => c.onclick = () => { SFX.reveal(4); const sum = L.mjChest(st, +c.dataset.chest); closeModal(); if (sum) realmEndUI(sum); });
}

// ---------- 入口 ----------
function realmStatus(xf) {
  const why = L.mjWhy(st, xf), w = L.realmWindow(st);
  if (!why) return xf ? '免令' : `开着 · 剩 ${w.left} 周天`;
  return why;
}
// 历练页最上面那一格（秘境解锁后才有；仙府现世时另有一格）
function realmExpCard() {
  if (!L.mjUnlocked(st)) return '';
  const th = L.mjThemeNow(st), why = L.mjWhy(st), w = L.realmWindow(st), tk = L.mjTokens(st);
  let h = `<div class="card" data-mj="0" id="mjCard">${icon16('token', 2)}<div class="main"><div class="line"><span>秘境 · ${th.n}</span>${elChip(th.el)}<span class="muted">秘境令 ${tk}/${L.MJ.tokenMax}</span></div><div class="muted">${esc(th.d)}</div><div class="muted">${w.open ? `今夏还开 ${w.left} 周天` : `入夏开放（${w.in} 周天后）`} · ${L.mjFloors(st)} 层 · 局中时间不走</div></div><div class="right"><span class="chip ${why ? '' : 'ok'}">${why ? (w.open ? '无令' : '未开') : '可进'}</span></div></div>`;
  if (L.mjXianfu(st)) h = `<div class="card" data-mj="1" style="box-shadow:0 0 0 2px var(--gold)">${icon16('w_xianfu', 2)}<div class="main"><div class="goldt">仙府现世 · 免令进一次</div><div class="muted">${L.MJ.xianfu.floors} 层，秘藏四选一，还剩 ${L.worldLeft(st)} 周天</div></div><div class="right"><span class="chip ok">可进</span></div></div>` + h;
  return h;
}
function bindRealmCard(root) { root.querySelectorAll('[data-mj]').forEach(c => c.onclick = () => { SFX.tap(); showRealm(c.dataset.mj === '1'); }); }
function showRealm(xf) {
  if (st.run) { closeModal(); return; }
  const th = xf ? L.MJ_THEMES[((L.world(st) || {}).at || 0) % 4] : L.mjThemeNow(st), why = L.mjWhy(st, xf);
  const floors = xf ? L.MJ.xianfu.floors : L.mjFloors(st), k = L.homeRegion(st), fake = { k, theme: th.id }, max = L.mjMaxHp(st), el = L.mjElem(st, th.id);
  const dm = []; for (let f = 1; f <= floors; f++) dm.push(f === floors ? `<span class="boss">守关 −${L.mjDmg(st, 'boss', f, fake, th.id)}</span>` : `<span>${f}层 −${L.mjDmg(st, 'fight', f, fake, th.id)}</span>`);
  const hpParts = L.mjHpParts(st).map(x => `${x[0]} ${x[1]}`).join(' + ');
  const elTxt = el.m > 1 ? `你的${L.elName(el.me)}系战技克${L.elName(el.fe)}：战力 ×${L.EL_DUEL[0]}` : el.m < 1 ? `${L.elName(el.fe)}克你的${L.elName(el.me)}系战技：战力 ×${L.EL_DUEL[1]}` : el.cang ? '藏锋：被克不受罚' : '你的战技不克它，它也不克你';
  const r = L.mjThRec(st, th.id);
  // 第一屏：秘境名与克制一行、三格数（层数 / 气血 / 战力对比）、每层掉多少气血；规则、门数、战绩收进“详情”
  const me = L.mjMe(st, th.id), f1 = L.mjLayerPow(st, 1, fake);
  const body = `<div class="mjroom">${doorImg('unk', pxs(32, 1.5))}<div class="grow"><div>${xf ? '仙府现世 · ' : ''}${esc(th.n)}秘境 ${elChip(th.el)}</div><div class="${el.m > 1 ? 'jadet' : el.m < 1 ? 'seal' : 'muted'}">${elTxt}</div></div></div>
    <div class="pn-stats"><div><small>层数</small><b>${floors} 层</b></div><div><small>气血</small><b class="num">${max}</b></div><div><small>你 / 第一层</small><b class="num ${me >= f1 ? 'jadet' : 'seal'}">${fmt(me)}/${fmt(f1)}</b></div></div>
    <div class="muted">每层战斗掉的气血：</div><div class="mjfloor">${dm.join('')}</div>
    <details class="more"><summary>规则 · 战绩</summary><div class="muted">${esc(th.d)}<br>气血 ${max} = ${hpParts}；每层 ${L.mjDoorN(st)} 扇门，“？”门 ${L.pct(L.mjUnkP(st))}；敌人每层战力 ×${L.MJ.powStep}，精英房掉血 ×${L.MJ.elite}。<br>每过一层可以带着收获离开；气血归零重伤出局：收获丢六成，负伤 ${L.MJ.wipeInj} 周天。局中时间不走，出来时流逝 ${L.mjCost(st)} 周天。${xf ? '' : `秘境令 ${L.mjTokens(st)}/${L.MJ.tokenMax}。`}<br>${esc(th.n)}秘境：最深 ${r.deep} 层 · 通关 ${r.clears} 次${r.clears ? '' : `（首通称号「${esc(th.title)}」）`}</div></details>`;
  mjSheet({ title: xf ? '仙府现世' : '秘境 · ' + th.n, body, foot: [{ t: '不去', alt: true, fn: closeModal }, { t: why ? why : xf ? '进仙府<small> 免令</small>' : `进入<small> 令 ${L.mjTokens(st)} → ${L.mjTokens(st) - 1}</small>`, gold: !why, disabled: !!why, fn: () => realmEnterUI(xf) }] });
}
function realmEnterUI(xf) {
  const run = L.mjEnter(st, { xf });
  if (!run) return;
  closeModal();
  SFX.reveal(4);
  banner(mjName(run), `${run.floors} 层 · 气血 ${run.max}`);
  parts.length = 0; wipe = 700; mjFx = null;
  saveLocal();
  syncRealmUI(true);
}
// 每个夏季开秘境那一刻（boot.js 的 onTick）
function realmOpenFx(o) {
  const th = L.mjTheme(o.theme);
  banner('入夏 · ' + th.n + '秘境开了', o.got ? '送来一枚秘境令' : '秘境令已满');
  SFX.reveal(3);
}

// ---------- 老祖：第一次进秘境三句（门、气血、见好就收）；秘境开了提醒一次 ----------
const inRealm = () => !!st.run && st.run.phase === 'door' && !mjFx && !modalOpen() && !!document.querySelector('#realmDoors .mjdoor');
const realmHints = [
  { id: 'realmOpen', intro: true, when: () => st.guide.done && L.mjCan(st) && !modalOpen() && !L.busy(st), target: '[data-nav="exp"]', btn: '好', text: () => {
      const th = L.mjThemeNow(st), w = L.realmWindow(st);
      return `入夏了，<b>秘境</b>开着（还剩 <b>${w.left}</b> 周天）：今年是<b>${th.n}秘境</b>（${L.elName(th.el)}），你手里有 <b>${L.mjTokens(st)}</b> 枚秘境令，进一次用一枚。【历练】最上面那一格。里面时间不走，出来只算 ${L.mjCost(st)} 个周天。`;
    } },
  { id: 'realm1', urgent: true, intro: true, when: inRealm, target: '#realmDoors', btn: '然后呢', text: () => {
      const run = st.run, d = L.mjDmg(st, 'fight', run.floor, run), last = L.mjDmg(st, 'boss', run.floors, run);
      return `这是秘境：<b>${run.floors}</b> 层，每层 <b>${run.doors.length}</b> 扇门，门上画着房间。这一层的战斗房要掉 <b>${d}</b> 气血，越往下越狠，最后一层守关要掉 <b>${last}</b>；“？”门推开才知道。`;
    } },
  { id: 'realm2', urgent: true, intro: true, when: () => inRealm() && !!st.hintSeen.realm1, target: '#realmHp', btn: '嗯', text: () => {
      const run = st.run;
      return `左上角是<b>气血 ${run.hp}/${run.max}</b>：只掉不回，除非碰上泉（<b>+${L.MJ.spring}</b>）。打空了就是重伤出局——这趟的收获丢<b>六成</b>，还要负伤 <b>${L.MJ.wipeInj}</b> 个周天。`;
    } },
  { id: 'realm3', urgent: true, intro: true, when: () => inRealm() && !!st.hintSeen.realm2, btn: '明白', text: () => {
      const run = st.run;
      return `每过一层，右下角都能<b>带着收获离开</b>。打穿第 ${run.floors} 层开<b>秘藏</b>三选一，有别处得不到的功法、器方——可贪到气血见底，就全赔进去了。<b>见好就收。</b>`;
    } },
];
