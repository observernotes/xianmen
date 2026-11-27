/* 废柴仙途 · 界面片段 saves：【仙途 → 设置 → 存档】自动 3 档 + 手动 3 档、读档、删除、导出 / 导入字符串（换手机）
 * 规则（哪份进哪格、轮换）在 src/logic/slots.js；这里只管画和点。存档读写都走 save.js 的 SLOTS（localStorage）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
const SV_NAME = (kind, i) => (kind === 'a' ? '自动 ' : '手动 ') + (i + 1);
const svPad = n => String(n).padStart(2, '0');
function svWhen(at) {
  if (!at) return '';
  const d = new Date(at), now = new Date();
  return (d.getFullYear() !== now.getFullYear() ? d.getFullYear() + '-' : '') + `${svPad(d.getMonth() + 1)}-${svPad(d.getDate())} ${svPad(d.getHours())}:${svPad(d.getMinutes())}`;
}
// 档位头像：存档里主角的样子 + 境界（32 / 48 像素，不画大图）
function svAv(h, w) {
  if (h && h.look && ART.portraitMe) { const c = ART.portraitMe(h.look, Math.min(h.r || 0, 9), 'n'); return ptHTML(c, ['me', h.look.hair, h.look.skin, h.look.f, Math.min(h.r || 0, 9), 'n'].join('|'), w); }
  return artIcon('ok', 32);
}
// 存档头里的日期：按回合的季（tick 停在季界，这一季 = L.seasonName(⌊tick % 12 / 3⌋)）
const svDate = h => `第 ${Math.floor((h.tick || 0) / 12) + 1} 年 · ${L.seasonName ? L.seasonName(Math.floor(((h.tick || 0) % 12) / 3)) : ''}`;
const svLine = h => `${chName(h.ch)} · ${svDate(h)} · 第${h.life}世`;
// 右边一小列：真实存档时间（月-日 / 时:分 两行）
const svTime = h => { const w = svWhen(h.at).split(' '); return `<span class="sv-t num">${w[0] || ''}<br>${w[1] || ''}</span>`; };
function svRow(kind, i, h) {
  if (!h) return `<div class="kslot sv dash" data-sv="${kind}${i}" role="button"><div class="cell lk"></div><div class="mid"><div class="nm">${SV_NAME(kind, i)}</div><small>空</small></div><span class="sv-t">${kind === 'm' ? '▸' : ''}</span></div>`;
  const tag = kind === 'a' && i === 0 ? '<span class="chip ok">最新</span>' : h.why && h.why !== '手动' ? `<span class="chip">${esc(h.why)}</span>` : '';
  return `<div class="kslot sv" data-sv="${kind}${i}" role="button"><div class="cell">${svAv(h, 32)}</div><div class="mid"><div class="nm">${SV_NAME(kind, i)} · ${esc(h.realm)} ${tag}</div><small>${svLine(h)}</small></div>${svTime(h)}</div>`;
}
function svCard(h) {
  return `<div class="kcard">${svAv(h, 48)}<div class="grow"><div class="nm" style="font-size:17px">${esc(h.name)} · ${esc(h.realm)}</div><div class="num">${chName(h.ch)} · ${svDate(h)} · 第 ${h.life} 世</div><div class="num muted">${svWhen(h.at)}${h.why ? ' · ' + esc(h.why) : ''}</div></div></div>`;
}
function showSaves(msg) {
  if (!st) return;
  if (!navCur) navCur = 'path';
  st.savedAt = Date.now(); saveLocal();   // 自动 1 永远是此刻
  const H = SLOTS.heads();
  const body = `<div class="ksec"><span>自动 · 每季与关键处</span><button id="svBack">回设置 ▸</button></div>`
    + H.a.map((h, i) => svRow('a', i, h)).join('')
    + '<div class="ksec"><span>手动</span></div>'
    + H.m.map((h, i) => svRow('m', i, h)).join('')
    + `<div class="kslot"><div class="cell">${artIcon('mail', 32)}</div><div class="mid"><div class="nm">换手机</div><small>${msg ? esc(msg) : '存档字符串'}</small></div><button class="kb alt" id="svOut">导出</button><button class="kb alt" id="svIn">导入</button></div>`;
  const s = sheet({ title: '存档', body });
  s.querySelectorAll('[data-sv]').forEach(el => el.onclick = () => { SFX.tap(); showSlot(el.dataset.sv[0], +el.dataset.sv.slice(1)); });
  s.querySelector('#svBack').onclick = () => { SFX.tap(); showSettings(); };
  s.querySelector('#svOut').onclick = () => { SFX.tap(); svExport(); };
  s.querySelector('#svIn').onclick = () => { SFX.tap(); svImport(); };
}
// 点一格：自动档只能读；手动档空着 = 存到这里（这一张就是确认），有档 = 读 / 覆盖 / 删除（各自再确认）
function showSlot(kind, i) {
  const H = SLOTS.heads(), h = H[kind][i], nm = SV_NAME(kind, i), back = () => showSaves();
  const cur = () => { st.savedAt = Date.now(); return L.slotHead(st, ''); };
  if (!h) {
    if (kind === 'a') { showSaves(); return; }
    sheet({ title: '存到' + nm, center: true, body: svCard(cur()), foot: [{ t: '取消', alt: true, fn: back }, { t: '存到这里', gold: true, fn: () => svSaveMan(i) }] });
    return;
  }
  const foot = [{ t: '返回', alt: true, fn: back }];
  if (kind === 'm') foot.push({ t: '删除', alt: true, fn: () => sheet({ title: '删除' + nm, center: true, body: svCard(h) + '<p class="center seal">删了就没有了。</p>', foot: [{ t: '取消', alt: true, fn: () => showSlot(kind, i) }, { t: '删除', fn: () => { SLOTS.del('m', i); SFX.tap(); showSaves(nm + '已删除'); } }] }) });
  if (kind === 'm') foot.push({ t: '覆盖', alt: true, fn: () => sheet({ title: '覆盖' + nm, center: true, body: svCard(cur()) + '<p class="center">用当前进度盖掉这一格？</p>', foot: [{ t: '取消', alt: true, fn: () => showSlot(kind, i) }, { t: '覆盖', gold: true, fn: () => svSaveMan(i) }] }) });
  foot.push({ t: '读档', gold: true, fn: () => svAskLoad(SLOTS.raw(kind, i), nm, h, () => showSlot(kind, i)) });
  sheet({ title: nm, center: true, body: svCard(h), foot });
}
function svSaveMan(i) {
  st.savedAt = Date.now();
  const r = SLOTS.writeMan(i, st);
  if (r.ok) { SFX.goal(); showSaves('已存到' + SV_NAME('m', i)); } else showSaves('存不下：本机空间满了');
}
// 读档前的二次确认；raw 是存档 JSON 字符串。先试迁移一遍，读不了的档在这里就拦下
function svAskLoad(raw, nm, h, back) {
  let obj = null;
  try { obj = raw ? L.migrate(JSON.parse(raw)) : null; } catch (e) { obj = null; }
  if (!obj) { sheet({ title: nm, center: true, body: '<p class="center seal">这份存档读不了。</p>', foot: [{ t: '返回', alt: true, fn: back }] }); return; }
  const hh = h || L.slotHead(obj, '');
  sheet({ title: '读' + nm, center: true, body: svCard(hh) + '<p class="center">当前进度会丢失（会先自动存一份）。</p>',
    foot: [{ t: '取消', alt: true, fn: back }, { t: '读档', gold: true, fn: () => svLoad(raw, hh) }] });
}
// 读档后界面这边要清干净的：弹窗队列、过场、对决演出、历练画面、秘境动画、自动停、年报排队、解锁卡、章末排队、气泡、讲解
function svResetUI() {
  queue.length = 0; parts.length = 0; unlockQ.length = 0; chapPend.length = 0; bubbleQ.length = 0;
  if (cn) cnEnd(true);
  cine = null; duelFx = null; adv = null; crane = null; mjFx = null; mjWait = 0;
  btStop();
  chainOn = false; chainCur = null; chainAfter = null; seasonLog = []; blkStash = {}; blkLate = null; yearS = null; rankShown = 0; tripSnap = null; RB = null; hallSel = null; btPills = null; tribSel = null; tribEx = null; lastUp = null;
  bubbleCur = null; activeHint = null; tempHint = null; guideHold = false; guideShownId = '';

  const tp = $('#tip'); if (tp) tp.hidden = true;
  const g = $('#guide'); if (g) g.hidden = true;
}
function svLoad(raw, h) {
  saveLocal('读档前');   // 当前进度先进自动档（下一次写自动 1 时挤到自动 2）
  let s = null;
  try { s = JSON.parse(raw); } catch (e) { s = null; }
  closeModal();
  svResetUI();
  if (!s || !loadState(s)) { showSaves('读档失败'); return; }
  syncRealmUI(true);
  fitScene();
  saveLocal();
  saveCloud(true);
  SFX.gong();
  banner('读档', `${chName(h.ch)} · ${h.realm}`);
}
// ---------- 导出 / 导入（换手机）：L.packSave 压成一串，复制粘贴 ----------
function svExport() {
  st.savedAt = Date.now(); saveLocal();
  const code = L.packSave(JSON.stringify(st));
  const s = sheet({ title: '导出存档', center: true,
    body: `<p>复制这一串，到新手机【导入】。</p><textarea class="svtxt" id="svTxt" readonly>${code}</textarea><div class="center num muted" id="svNote">${code.length} 字符</div>`,
    foot: [{ t: '返回', alt: true, fn: () => showSaves() }, { t: '复制', gold: true, fn: () => svCopy(code) }] });
  void s;
}
function svCopy(code) {
  const note = t => { const el = $('#svNote'); if (el) el.textContent = t; };
  const fallback = () => { const ta = $('#svTxt'); if (!ta) return; ta.focus(); ta.select(); try { note(document.execCommand('copy') ? '已复制' : '长按上面全选复制'); } catch (e) { note('长按上面全选复制'); } };
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(() => note('已复制'), fallback); SFX.tap(); return; } } catch (e) { /* 走旧办法 */ }
  fallback(); SFX.tap();
}
function svImport(err) {
  const s = sheet({ title: '导入存档', center: true,
    body: `<p>把导出的那一串贴进来。</p><textarea class="svtxt" id="svTxt" placeholder="XT1."></textarea>${err ? `<p class="center seal">${esc(err)}</p>` : ''}`,
    foot: [{ t: '返回', alt: true, fn: () => showSaves() }, { t: '读入', gold: true, fn: () => {
      const ta = $('#svTxt'), raw = L.unpackSave(ta ? ta.value : '');
      if (!raw) { svImport('读不出来：贴全了吗？'); return; }
      svAskLoad(raw, '导入的存档', null, () => svImport());
    } }] });
  void s;
}
