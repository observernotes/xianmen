/* 废柴仙途 · 界面片段 modal：弹窗与弹窗队列
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 弹窗 ----------
let modalOnClose = null;
// 换窗不抖（tools/jitter_check.js）：弹窗开着时再调 sheet()（换分页、底栏换格、原地重画、关了 A 同一帧开 B）= 同一个卷轴换内容——
// 同类窗口（底部卷轴 / 居中 / 解锁卡 / 对决）不重放入场动画；同一页重画保留滚动位置；同名窗口重画时高度只增不减（不让卷轴上沿跳）。
// 底栏面板和带分页的窗口（.full）固定高度，换页、换格时卷轴边框一动不动。o.anim = true 强制重放入场。
let modalShut = null;   // closeModal 关掉的那一张（下一帧之前又开 = 换内容，不算重新打开）
const modalMode = m => ['mid', 'unl-m', 'duel-m', 'nav-m'].map(c => (m.classList.contains(c) ? 1 : 0)).join('');
function modalSnap(m) {
  const s = m.querySelector('.sheet'); if (!s) return null;
  const b = s.querySelector('.body'), h = s.querySelector('header h2'), on = s.querySelector('[data-kt].on, [data-gtab].on, .tabs .on');
  const title = h ? h.textContent : '';
  return { mode: modalMode(m), title, page: title + '|' + (on ? on.dataset.kt || on.dataset.gtab || on.textContent : ''), top: b ? b.scrollTop : 0, h: s.offsetHeight };
}
function sheet(o) {
  const m = $('#modal');
  const prev = m.hidden ? modalShut : modalSnap(m); modalShut = null;
  m.classList.toggle('mid', !!o.center);
  m.classList.remove('duel-m');   // 场景内对决的透明底（duels.js 打开对决时再加上）
  m.classList.toggle('unl-m', !!o.unl);   // 解锁卡（onboard.js）：无纸卷边框，居中
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
  bindPetButtons(m);     // 名册满时新灵宠的放生 / 替换（panel-pets.js）
  // 外壳面板的分页条（panel-me.js 的 meTabs）：点分页 = 换页；面板浮在底栏之上、那一格点亮（goalcard.js）
  const ks = m.querySelector('[data-kshell]'); if (ks) navCur = ks.dataset.kshell;
  m.querySelectorAll('[data-kt]').forEach(b => { b.onclick = () => { SFX.tap(); openTab(b.dataset.kt); }; });
  if (st) syncNav();
  const sh = m.querySelector('.sheet'), bd = sh.querySelector('.body');
  sh.classList.toggle('full', m.classList.contains('nav-m') || !!sh.querySelector('.ktabs:not([hidden])'));
  // 副标题（灵石 · 灵草……）挪进正文、放在分页条下面：底栏五格、各分页的分页条和正文都从同一高度起（换格、换分页时不上下跳）
  { const sb = sh.querySelector(':scope > .sub'), kt = bd && bd.firstElementChild; if (sb && bd && (sh.classList.contains('full') || (kt && kt.matches('.ktabs:not([hidden])')))) { if (kt && kt.matches('.ktabs')) kt.after(sb); else bd.prepend(sb); } }
  if (prev && !o.anim) {
    if (prev.mode === modalMode(m)) sh.classList.add('still');
    const now = modalSnap(m);
    if (now.title === prev.title && !sh.classList.contains('full') && prev.mode === now.mode) sh.style.minHeight = prev.h + 'px';
    if (now.page === prev.page && bd && prev.top) bd.scrollTop = prev.top;
  }
  // 分页条放不下时横向滑：把当前页滑到中间，右缘有渐隐提示
  m.querySelectorAll('.tabs').forEach(t => { if (t.scrollWidth <= t.clientWidth + 1) return; t.classList.add('scroll'); const on = t.querySelector('.on'); if (on) t.scrollLeft = on.offsetLeft - t.offsetLeft - (t.clientWidth - on.offsetWidth) / 2; });
  return sh;
}
function closeModal() {
  const m = $('#modal');
  const oldU = m.hidden ? [] : gearUids(m);
  if (!m.hidden) { const sn = modalSnap(m); modalShut = sn; requestAnimationFrame(() => { if (modalShut === sn) modalShut = null; }); }
  m.hidden = true; m.innerHTML = ''; navCur = '';
  if (oldU.length) gearLeave(oldU);
  const f = modalOnClose; modalOnClose = null;
  if (f) f();
  setTimeout(processQueue, 400);
  updateHUD();
}
// 弹窗里一行做完换成一句结果（换上 / 熔 / 收）：新的一行至少和旧的一样高，卷轴不缩、上沿不跳
function swapKeep(el, html) {
  const h = el.offsetHeight; el.insertAdjacentHTML('afterend', html);
  const n = el.nextElementSibling; el.remove();
  if (n && h) { n.style.minHeight = h + 'px'; n.style.boxSizing = 'border-box'; }
  return n;
}
function pushPopup(fn) { queue.push(fn); processQueue(); }
function processQueue() {
  if (!$('#modal').hidden || cine || !$('#intro').hidden) return;
  const fn = queue.shift();
  if (fn) { fn(); return; }
  if (st && st.storyQ && st.storyQ.length) { const ev = L.eventById(st.storyQ.shift()); if (ev) showChoice(ev); }
}
const bar = (v, gold) => `<div class="bar ${gold ? 'gold' : ''}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
