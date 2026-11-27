/* 废柴仙途 · 界面片段 save：存档：本机（自动 / 手动档位，见 saves.js 与 src/logic/slots.js）、云端、读档
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 存档 ----------
// 存档键沿用 v2 时代的名字，这样旧版本的存档能被找到；读进来一律先过 L.migrate（v2 → … → v5）
const SAVE_KEY = 'xiantu_save_v2';
const saveOk = s => !!s && L.SAVE_OK.includes(s.v);
const PREF_KEY = 'xianmen_pref_v1';
// 存档位（src/logic/slots.js）：自动 1（= SAVE_KEY，开游戏读它）/ 2 / 3 轮换 + 手动 1～3；页面在 saves.js
const SLOTS = L.slotStore({ get: k => localStorage.getItem(k), set: (k, v) => localStorage.setItem(k, v), del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } } });
// why：空 = 每月例行（覆盖自动 1，频率照旧）；'章末' / '突破' / '年报' / '归来' / '转世前' / '读档前' = 关键节点（下一次写时挤到自动 2）
function saveLocal(why) { if (!st) return; try { st.savedAt = Date.now(); SLOTS.writeAuto(st, typeof why === 'string' ? why : ''); } catch (e) { /* 无痕模式等 */ } }
function loadLocal() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function clearLocal() { try { SLOTS.retire(st); } catch (e) { /* ignore */ } }   // 重新开始：当前进度挤进自动 2，自动 1 空出来（手动档不动）
// 偏好：音量、战斗演出速度、【下一季】剩点要不要确认。旧的速度档 speedIdx 不再读（AP_PLAN §7）
// 画质（hd）：只有玩家在设置里点过才记（panel-me.js 的 hdPick）；读回来时网址带 ?hd=N 的优先（测试、样张用）
function savePref() { try { const o = { soundMode, btSpeed, sitAsk, mv: AU.mv, sv: AU.sv }; if (hdPref !== null) o.hd = hdPref; localStorage.setItem(PREF_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } }
function loadPref() { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); if (p.soundMode >= 0) soundMode = p.soundMode; if (p.mv >= 0) AU.mv = Math.min(5, p.mv | 0); if (p.sv >= 0) AU.sv = Math.min(5, p.sv | 0); if (p.btSpeed === 2) btSpeed = 2; sitAsk = !!p.sitAsk; if (p.hd === 'auto') p.hd = 1.5; if (HD_VALS.includes(p.hd)) { hdPref = p.hd; if (!/[?&]hd=/.test(location.search) && hdNow() !== p.hd) hdApply(p.hd); } } catch (e) { /* ignore */ } }
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
    foot: [{ t: '保留当前', alt: true, fn: closeModal }, { t: '读取云存档', fn: () => { closeModal(); if (st) { saveLocal('读档前'); svResetUI(); } if (loadState(remote)) { $('#intro').hidden = true; saveLocal(); } } }],
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
  try { renderFeed(); updateHUD(); } catch (e) { console.error('读档后第一次刷新主画面出错（页面照常起来，下一帧再画）：' + (e && e.stack || e)); }   // 偶发：旧档迁移出来的局面某个读数为空，别让整页起不来
  // 渡到一半关了页面：预掷还在 st.trib.cur 里，接着渡（结果不变）
  if (st.trib && st.trib.cur) { const v = L.tribView(st); if (v) setTimeout(() => { if (!cine && st.trib.cur) startTribCine(v); }, 600); }
  // 读档后的第一条结算链（AP_PLAN §4.2 存档点 / §7）：没出完的卡、旧档迁移压着的历练结算与大事、被旧节流压着的戏，接着出（settle.js）
  else setTimeout(() => { if (st === m) settleLoad(); }, 300);
  return true;
}
