/* 废柴仙途 · 界面片段 save：存档：本机、云端、读档
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 存档 ----------
// 存档键沿用 v2 时代的名字，这样旧版本的存档能被找到；读进来一律先过 L.migrate（v2 → … → v5）
const SAVE_KEY = 'xiantu_save_v2';
const saveOk = s => !!s && L.SAVE_OK.includes(s.v);
const PREF_KEY = 'xianmen_pref_v1';
function saveLocal() { if (!st) return; try { st.savedAt = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(st)); } catch (e) { /* 无痕模式等 */ } }
function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearLocal() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }
function savePref() { try { localStorage.setItem(PREF_KEY, JSON.stringify({ soundMode, speedIdx })); } catch (e) { /* ignore */ } }
function loadPref() { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (p.soundMode >= 0) soundMode = p.soundMode; if (p.speedIdx >= 0 && p.speedIdx < 3) speedIdx = p.speedIdx; } catch (e) { /* ignore */ } }
const cloud = { ref: null, busy: false, lastTick: -1 };
async function initCloud() {
  try {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    const db = await window.claude.use('db');
    const user = await window.claude.use('user');
    if (!db || !user) { cloudStatus = '当前环境不可用'; return; }
    const uid = await user.id();
    if (!uid) { cloudStatus = '登录后可用'; return; }
    cloud.ref = db.doc('data/users/' + uid + '/save');
    cloudStatus = '已连接';
    const snap = await cloud.ref.get();
    if (snap.exists) {
      const data = snap.data();
      let remote = null;
      try { remote = data && typeof data.json === 'string' ? JSON.parse(data.json) : null; } catch (e) { remote = null; }
      if (saveOk(remote) && (!st || ((remote.savedAt || 0) > (st.savedAt || 0) + 5000 && remote.tick !== st.tick))) offerCloud(remote);
    }
  } catch (e) { cloudStatus = '暂时无法连接'; }
}
async function saveCloud(force) {
  if (!cloud.ref || cloud.busy || !st) return;
  if (!force && st.tick === cloud.lastTick) return;
  cloud.busy = true;
  try {
    st.savedAt = Date.now();
    await cloud.ref.set({ json: JSON.stringify(st), savedAt: st.savedAt, v: L.SAVE_V });
    cloud.lastTick = st.tick; cloudStatus = '已同步';
  } catch (e) {
    cloudStatus = e && e.code === 'invalid_argument' ? '当前权限无法云存档' : '同步失败，稍后重试';
    if (e && e.code === 'invalid_argument') cloud.ref = null;
  }
  cloud.busy = false;
}
function offerCloud(remote) {
  const intro = !$('#intro').hidden;
  const go = () => sheet({
    title: '发现云端存档', center: true,
    body: `<p>云端有一份更新的存档：<br><b>${esc(remote.p.name)}</b> · ${esc(L.stageName(remote.p))} · 修仙第 ${Math.floor(remote.year) + 1} 年</p><p class="muted">读取后会替换当前进度。</p>`,
    foot: [{ t: '保留当前', alt: true, fn: closeModal }, { t: '读取云存档', fn: () => { closeModal(); if (loadState(remote)) $('#intro').hidden = true; } }],
  });
  if (intro) go(); else pushPopup(go);
}
// 读档：先迁移，读不了返回 false（调用方回到开场）
function loadState(s) {
  let m = null;
  try { m = L.migrate(s); } catch (e) { m = null; }
  if (!m) return false;
  st = m;
  // 从旧版本迁来的老玩家：新手引导和功能讲解直接算看过
  if (st.flags.fromV2 && !st.guide) { st.guide = { step: 999, done: true }; st.hintSeen = Object.assign({}, st.hintSeen || {}); for (const h of HINTS) if (h.intro) st.hintSeen[h.id] = 1; }
  lastExp = null;
  if (st.migratedExp) { const r = st.migratedExp; delete st.migratedExp; pushPopup(() => showExpResult(r)); }
  L.hook = onHook;
  ART.clearCache(); avCache.clear();
  adv = null; lastMode = st.exp ? 'adv' : 'home';
  renderFeed(); updateHUD();
  return true;
}
