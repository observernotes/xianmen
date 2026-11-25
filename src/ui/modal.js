/* 废柴仙途 · 界面片段 modal：弹窗与弹窗队列
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 弹窗 ----------
let modalOnClose = null;
function sheet(o) {
  const m = $('#modal');
  m.classList.toggle('mid', !!o.center);
  const foot = (o.foot || []).map((b, i) => `<button class="btn ${b.alt ? 'alt' : ''} ${b.gold ? 'gold' : ''}" data-fi="${i}" ${b.disabled ? 'disabled' : ''}>${b.t}</button>`).join('');
  const oldU = m.hidden ? [] : gearUids(m);   // 上一页没决定的法宝对比卡：新页里不再显示的就熔炼（panel-gear.js）
  m.innerHTML = `<div class="sheet${o.still ? ' still' : ''}" role="dialog" aria-modal="true"><div class="rod"></div>
    <header><h2>${o.title}</h2>${o.noClose ? '' : '<button class="close" aria-label="关闭">×</button>'}</header>
    ${o.sub ? `<div class="sub" style="padding:0 12px">${o.sub}</div>` : ''}
    <div class="body">${o.body || ''}</div>
    ${foot ? `<div class="foot">${foot}</div>` : ''}<div class="rod"></div></div>`;
  m.hidden = false;
  modalOnClose = o.onClose || null;
  const c = m.querySelector('.close'); if (c) c.onclick = () => { SFX.tap(); closeModal(); };
  m.querySelectorAll('[data-fi]').forEach(b => { b.onclick = () => { SFX.tap(); o.foot[+b.dataset.fi].fn(); }; });
  m.onclick = e => { if (e.target === m && !o.noClose) closeModal(); };
  bindEquipButtons(m);   // 掉落卡里的【换上】（panel-arts.js）
  if (oldU.length) gearLeave(oldU, gearUids(m));
  bindGearButtons(m);    // 法宝对比卡（panel-gear.js）
  return m.querySelector('.sheet');
}
function closeModal() {
  const m = $('#modal');
  const oldU = m.hidden ? [] : gearUids(m);
  m.hidden = true; m.innerHTML = '';
  if (oldU.length) gearLeave(oldU);
  const f = modalOnClose; modalOnClose = null;
  if (f) f();
  setTimeout(processQueue, 400);
  updateHUD();
}
function pushPopup(fn) { queue.push(fn); processQueue(); }
function processQueue() {
  if (!$('#modal').hidden || cine || !$('#intro').hidden) return;
  const fn = queue.shift();
  if (fn) { fn(); return; }
  if (st && st.storyQ && st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) showChoice(ev); }
}
const bar = (v, gold) => `<div class="bar ${gold ? 'gold' : ''}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
