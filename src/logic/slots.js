/* 废柴仙途 · 逻辑模块 slots：存档位（自动 3 个轮换 + 手动 3 个）、档位摘要、导出字符串的压缩
 * 模块写法见 src/logic.js 顶部说明。存储由调用方给（浏览器里是 localStorage，测试里是 Map），这里只管规则。 */
(function (install) { if (typeof module === 'object' && module.exports) module.exports = install; else install(globalThis.L || (globalThis.L = {})); })(function (L) {
'use strict';

// ---------- 档位 ----------
// 自动 1 用老存档键 xiantu_save_v2：升级前那一份存档原地就是“自动 1”，不用搬。自动 1 永远是最新的，开游戏读它。
// 规则：每月照旧存（覆盖自动 1，不轮换）；关键节点（章末、突破成功、年报、历练归来、转世前、读档前）存一份并把自动 1 记成“节点档”；
// 下一次再往自动 1 写时，先把节点档挤到自动 2（自动 2 → 自动 3，最老的那份丢掉）。所以自动 2 / 3 是最近两个关键节点那一刻的样子。
// 同一个月里连着两个节点：后一个直接覆盖前一个（后一个包含前一个），不多挤一格。
L.SLOTS = { a: 3, m: 3 };
L.SLOT_IDX = 'xianmen_slots_v1';
L.slotKey = (kind, i) => (kind === 'a' ? (i === 0 ? 'xiantu_save_v2' : 'xiantu_save_a' + (i + 1)) : 'xiantu_save_m' + (i + 1));
// 档位一行要显示的东西：第 N 章 · 境界 · 第 X 年 X 月 · 第几世 · 存档时间；头像用 look + 境界现画
L.slotHead = function (st, why) {
  if (!st || !st.p) return null;
  const p = st.p;
  let ch = 0, realm = '', y = 1, m = 1;
  try { ch = L.chapterNow(st); } catch (e) { ch = 0; }
  try { realm = L.stageName(p); } catch (e) { realm = ''; }
  try { y = L.calYear ? L.calYear(st) : Math.floor((st.tick || 0) / 12) + 1; m = L.calMonth ? L.calMonth(st) : (st.tick || 0) % 12 + 1; } catch (e) { /* 旧档没有历法 */ }
  return { at: st.savedAt || Date.now(), tick: st.tick || 0, ch, realm, y, m, life: (st.rebirth || 0) + 1, name: String(p.name || ''), look: p.look ? { hair: p.look.hair, skin: p.look.skin, f: p.look.f } : null, r: p.r || 0, why: why || '', key: !!why };
};
const okHead = h => !!h && typeof h === 'object' && typeof h.tick === 'number';
// store：{ get(k) → 字符串或 null, set(k, v)（满了会抛错）, del(k) }
L.slotStore = function (store) {
  const N = L.SLOTS;
  const get = k => { try { const v = store.get(k); return typeof v === 'string' ? v : null; } catch (e) { return null; } };
  function index() {
    let x = null;
    try { x = JSON.parse(get(L.SLOT_IDX) || 'null'); } catch (e) { x = null; }
    if (!x || typeof x !== 'object') x = {};
    const fix = (a, n) => { a = Array.isArray(a) ? a.slice(0, n) : []; while (a.length < n) a.push(null); return a.map(h => (okHead(h) ? h : null)); };
    return { a: fix(x.a, N.a), m: fix(x.m, N.m) };
  }
  const putIdx = idx => { try { store.set(L.SLOT_IDX, JSON.stringify(idx)); } catch (e) { /* 索引丢了也能从档里重建 */ } };
  function parse(kind, i) { const s = get(L.slotKey(kind, i)); if (!s) return null; try { return JSON.parse(s); } catch (e) { return null; } }
  // 摘要：索引里有就用；没有（升级前的老档、索引坏了）就读档现算一次并补进索引
  function heads() {
    const idx = index(); let dirty = false;
    for (const kind of ['a', 'm']) for (let i = 0; i < N[kind]; i++) {
      const has = get(L.slotKey(kind, i)) !== null;
      if (!has) { if (idx[kind][i]) { idx[kind][i] = null; dirty = true; } continue; }
      if (!idx[kind][i]) { const s = parse(kind, i); const h = s && L.slotHead(s, ''); if (h) { h.at = s.savedAt || 0; idx[kind][i] = h; dirty = true; } }
    }
    if (dirty) putIdx(idx);
    return idx;
  }
  function rotate(idx) {
    for (let i = N.a - 1; i >= 1; i--) {
      const v = get(L.slotKey('a', i - 1));
      if (v === null) store.del(L.slotKey('a', i)); else store.set(L.slotKey('a', i), v);
      idx.a[i] = idx.a[i - 1];
    }
    idx.a[0] = null;
  }
  // 写自动 1。why 为空 = 每月的例行存档；有 why = 关键节点。返回 { ok, rot }
  function writeAuto(st, why, json) {
    json = json || JSON.stringify(st);
    const idx = index(), h0 = idx.a[0];
    let rot = false;
    try {
      if (h0 && h0.key && !(why && h0.tick === st.tick)) { rotate(idx); rot = true; }
      store.set(L.slotKey('a', 0), json);
    } catch (e) {
      // 满了：丢掉最老的自动档再试一次
      try { store.del(L.slotKey('a', N.a - 1)); idx.a[N.a - 1] = null; store.set(L.slotKey('a', 0), json); } catch (e2) { putIdx(idx); return { ok: false, rot }; }
    }
    idx.a[0] = L.slotHead(st, why || '');
    putIdx(idx);
    return { ok: true, rot, size: json.length };
  }
  function writeMan(i, st) {
    const json = JSON.stringify(st), idx = index();
    try { store.set(L.slotKey('m', i), json); } catch (e) { return { ok: false }; }
    idx.m[i] = L.slotHead(st, '手动');
    putIdx(idx);
    return { ok: true, size: json.length };
  }
  function del(kind, i) { store.del(L.slotKey(kind, i)); const idx = index(); idx[kind][i] = null; putIdx(idx); }
  // 重新开始：当前进度先挤进自动 2（后悔了还能读），自动 1 空出来
  function retire(st) {
    if (st) writeAuto(st, '重来前');
    const idx = index();
    try { if (get(L.slotKey('a', 0)) !== null) rotate(idx); store.del(L.slotKey('a', 0)); } catch (e) { /* 满了也要空出自动 1 */ store.del(L.slotKey('a', 0)); }
    idx.a[0] = null; putIdx(idx);
  }
  // 各档占了多少字符（localStorage 按 UTF-16 计，约 5M 字符上限）
  function usage() {
    let n = 0; const per = {};
    for (const kind of ['a', 'm']) for (let i = 0; i < N[kind]; i++) { const s = get(L.slotKey(kind, i)); if (s) { per[kind + i] = s.length; n += s.length; } }
    return { total: n, per };
  }
  return { index, heads, parse, raw: (kind, i) => get(L.slotKey(kind, i)), writeAuto, writeMan, del, retire, rotate: () => { const idx = index(); rotate(idx); putIdx(idx); }, usage };
};

// ---------- 导出字符串：UTF-8 → LZW（9～16 位变长码）→ base64url，前缀 XT1. + 码数 + 校验 ----------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const utf8 = s => { if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s); const b = unescape(encodeURIComponent(s)); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const unutf8 = a => { if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(a); let b = ''; for (let i = 0; i < a.length; i++) b += String.fromCharCode(a[i]); return decodeURIComponent(escape(b)); };
const width = i => { const n = Math.min(65536, 256 + i); return Math.max(9, 32 - Math.clz32(n - 1)); };
const sum = a => { let h = 0; for (let i = 0; i < a.length; i++) h = (h * 31 + a[i]) >>> 0; return h; };
L.packSave = function (json) {
  const bytes = utf8(json), out = [];
  let acc = 0, nb = 0, k = 0;
  const emit = c => { const w = width(k++); acc |= c << nb; nb += w; while (nb >= 8) { out.push(acc & 255); acc >>>= 8; nb -= 8; } };
  if (bytes.length) {
    const dict = new Map(); let next = 256, w = String.fromCharCode(bytes[0]);
    for (let i = 1; i < bytes.length; i++) {
      const c = String.fromCharCode(bytes[i]), wc = w + c;
      if (dict.has(wc)) { w = wc; continue; }
      emit(w.length === 1 ? w.charCodeAt(0) : dict.get(w));
      if (next < 65536) dict.set(wc, next++);
      w = c;
    }
    emit(w.length === 1 ? w.charCodeAt(0) : dict.get(w));
  }
  if (nb > 0) out.push(acc & 255);
  let s = '';
  for (let i = 0; i < out.length; i += 3) {
    const n = out[i] | ((out[i + 1] || 0) << 8) | ((out[i + 2] || 0) << 16), left = out.length - i;
    s += B64[n & 63] + B64[(n >> 6) & 63] + (left > 1 ? B64[(n >> 12) & 63] : '') + (left > 2 ? B64[(n >> 18) & 63] : '');
  }
  return 'XT1.' + k.toString(36) + '.' + sum(bytes).toString(36) + '.' + s;
};
// 解不开返回 null（贴错、贴了一半）；也收没压缩的原始 JSON
L.unpackSave = function (text) {
  text = String(text || '').trim();
  if (text[0] === '{') return text;
  text = text.replace(/\s+/g, '');
  const m = /^XT1\.([0-9a-z]+)\.([0-9a-z]+)\.([A-Za-z0-9_-]*)$/.exec(text);
  if (!m) return null;
  const cnt = parseInt(m[1], 36), ck = parseInt(m[2], 36), s = m[3];
  const rev = {}; for (let i = 0; i < 64; i++) rev[B64[i]] = i;
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) {
    const n = rev[s[i]] | (rev[s[i + 1]] << 6) | ((rev[s[i + 2]] || 0) << 12) | ((rev[s[i + 3]] || 0) << 18), left = s.length - i;
    bytes.push(n & 255); if (left > 2) bytes.push((n >> 8) & 255); if (left > 3) bytes.push((n >> 16) & 255);
  }
  let acc = 0, nb = 0, p = 0;
  const read = k => { const w = width(k); while (nb < w) { if (p >= bytes.length) return -1; acc |= bytes[p++] << nb; nb += 8; } const c = acc & ((1 << w) - 1); acc >>>= w; nb -= w; return c; };
  const dict = []; for (let i = 0; i < 256; i++) dict.push([i]);
  const out = [];
  let prev = null;
  for (let k = 0; k < cnt; k++) {
    const c = read(k); if (c < 0) return null;
    let e;
    if (c < dict.length) e = dict[c]; else if (c === dict.length && prev) e = prev.concat(prev[0]); else return null;
    for (const b of e) out.push(b);
    if (prev && dict.length < 65536) dict.push(prev.concat(e[0]));
    prev = e;
  }
  const a = new Uint8Array(out);
  if (sum(a) !== ck) return null;
  try { return unutf8(a); } catch (e) { return null; }
};
});
