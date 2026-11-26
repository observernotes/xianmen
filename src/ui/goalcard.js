/* 废柴仙途 · 界面片段 goalcard：开罗式主画面（docs/KAIRO_PLAN.md §2.2 / §3.2 / §4.1 / §5.2 / §6.3；示意图 docs/kairo_mock/01_main.png、07_exp_travel.png）
 * 顶栏（灵石 / 丹 / 寿元 / 纸鹤 / 暂停）、时间条、场景状态牌、境界条右侧“圆满还差”、三个数值格跳字、目标卡三行、一行传讯、固定五格底栏（灰锁 + 两种角标）、
 * 面板浮在底栏之上（navOpenPanel）、hlOnly 金框、目标卡【去】的跳转表 GO_K。
 * 数据读线 1 的接口（docs/KAIRO_PLAN.md 末尾“接口”）：L.goalNow / L.timeBar / L.lifeMonths / L.chapterNow / L.pathView / L.chapterSummary / L.yearReport / L.mailbox。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */

// ===================== 小工具（线 1 的接口已经装在 L 上：goalNow / goalNext / timeBar / lifeMonths / bigNext / pathView / chapterSummary / yearReport / mailbox） =====================
const CH_NUM = '一二三四五六七八九';
const chName = i => '第' + CH_NUM[Math.max(0, Math.min(8, i))] + '章';
const MO = () => L.UNIT || '月';
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ===================== 一行传讯（§5.2-3）：替代横幅与大部分气泡；≤ 20 字，停 6 秒，点开纸鹤看历史 =====================
let tickNewAt = 0;
const sayLog = [];
function sayLine(text, cls) {
  if (!st || !text) return;
  text = String(text).replace(/<[^>]+>/g, '');
  const m = (st.tick % 12) + 1;
  sayLog.unshift({ m, text, cls: cls || '', at: performance.now() });
  if (sayLog.length > 30) sayLog.length = 30;
  tickNewAt = performance.now();
  renderTick();
}
function renderTick() {
  const el = $('#tick'); if (!el || !st) return;
  const lg = st.log[0], sl = sayLog[0];
  // 传讯（say）比逻辑日志新就显示传讯；否则显示最新一条日志
  let h;
  if (sl && (performance.now() - sl.at < 6000 || !lg || sl.logLen === st.log.length)) h = `${sl.m}${MO()} <span class="${esc(sl.cls)}">${esc(sl.text)}</span>`;
  else if (lg) h = `<span class="${esc(lg.cls)}">${esc(lg.text)}</span>`;
  else h = st.exp ? '路上不打扰：消息先收进纸鹤，回来再看' : '';
  if (sl && sl.logLen === undefined) sl.logLen = st.log.length;
  if (el._h !== h) { el._h = h; el.innerHTML = h; }
  el.classList.toggle('new', performance.now() - tickNewAt < 6000);
}
$('#tick').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showInbox(); });

// ===================== hlOnly：只画金框，不出老祖、不停表、点别处就消失（§2.4） =====================
let hlSel = null, hlUntil = 0;
function hlOnly(sel, ms) {
  hlSel = sel || null; hlUntil = performance.now() + (ms || 8000);
  syncHl();
}
function syncHl() {
  let el = $('#hl');
  const tg = hlSel && document.querySelector(hlSel);
  if (!tg || !tg.offsetParent || performance.now() > hlUntil) { if (el) el.hidden = true; if (hlSel && performance.now() > hlUntil) hlSel = null; return; }
  if (!el) { el = document.createElement('div'); el.id = 'hl'; document.body.appendChild(el); }
  const z = parseFloat(document.documentElement.style.zoom) || 1, k = /Chrome\/(\d+)/.test(navigator.userAgent) && +RegExp.$1 >= 128 ? 1 : z;
  const r = tg.getBoundingClientRect();
  Object.assign(el.style, { left: (r.left / k - 3) + 'px', top: (r.top / k - 3) + 'px', width: (r.width / k + 6) + 'px', height: (r.height / k + 6) + 'px' });
  el.hidden = false;
}
document.addEventListener('pointerdown', e => { if (!hlSel) return; const tg = document.querySelector(hlSel); if (!tg || !tg.contains(e.target)) setTimeout(() => { hlSel = null; syncHl(); }, 0); }, true);

// ===================== 目标卡【去】的跳转表（线 1 next.go 的取值） =====================
const GO_K = {
  bt: () => (L.isReady(st) ? showBreakthrough() : showGrowth('cul')), exp: () => showExp(), home: () => showHome(), gear: () => showEquip('gear'), arts: () => showEquip('arts'), pets: () => showEquip('pets'), bag: () => showEquip('bag'),
  world: () => showWorld(), rivals: () => showWorld('rank'), sect: () => showWorld('sect'), market: () => showWorld('market'), people: () => showWorld('people'),
  path: () => showPath(), attr: () => showPath('attr'), record: () => showPath('rec'), big: () => showBig(), prep: () => (typeof showPrep === 'function' ? showPrep() : showBig()),
  field: () => showField(), furnace: () => (st.home.furnace ? showAlchemy() : showHome()), zhen: () => (L.zhenOpen(st) ? showZhen() : showHome()), realm: () => showRealm(), cal: () => showCalendar(),
  train: () => showTrain(), disc: () => showWorld('sect'), trib: () => (L.isReady(st) ? showBreakthrough() : showTribPrep ? showTribPrep() : showBig()), inbox: () => showInbox(), cult: () => GO_K.bt(), me: () => showPath('attr'), codex: () => showCodex(),
};
// 跳转键 → 底栏哪一格（底栏的“去”角标）
const GO_NAV = { bt: '', exp: 'exp', realm: 'exp', home: 'home', field: 'home', furnace: 'home', zhen: 'home', gear: 'gear', arts: 'gear', pets: 'gear', bag: 'gear', world: 'world', rivals: 'world', sect: 'world', market: 'world', people: 'world', disc: 'world', path: 'path', attr: 'path', record: 'path', codex: 'path', cal: '', big: '', prep: '', inbox: '' };
function goTo(k, hl) {
  if (!k || !st) return;
  const f = GO_K[k] || GO_K.exp;
  if (!modalOpen() || !hl) { if (modalOpen()) closeModal(); }
  f();
  if (hl) setTimeout(() => hlOnly(hl), 60);
}
$('#gGo').addEventListener('click', e => { e.stopPropagation(); if (!st || cine) return; ac(); SFX.tap(); const g = L.goalNow(st); if (g.next && g.next.go) goTo(g.next.go, g.next.hl); });
// 目标卡：默认收起成一行；点一下展开 / 收起（记在存档里）；展开时点第一行（第 N 章 · 目标）进路径页
$('#goal').addEventListener('click', e => {
  if (!st || cine) return; ac(); SFX.tap();
  const el = $('#goal');
  if (el.classList.contains('open') && e.target.closest('.g1, .gbar')) { showPath(); return; }
  st.flags.goalOpen = !el.classList.contains('open'); el.classList.toggle('open', st.flags.goalOpen);
});
$('#time').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); if (UI.isOpen('cal')) showCalendar(); else showBig(); });
$('#btnMail').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showInbox(); });
// 暂停键：暂停 ↔ 回到上一次的速度
let speedBefore = 0;
$('#btnPause').addEventListener('click', () => {
  if (!st) return; ac(); SFX.tap();
  const pz = SPEEDS.indexOf(0);
  if (SPEEDS[speedIdx] === 0) speedIdx = speedBefore && SPEEDS[speedBefore] ? speedBefore : 0; else { speedBefore = speedIdx; speedIdx = pz; }
  savePref(); updateHUD();
});

// ===================== 底栏固定五格（§4.1）：位置永远不变；没开的那一格灰剪影 + 一行条件 =====================
const NAV_N = { exp: '历练', home: '洞府', gear: '装备', world: '江湖', path: '仙途' };
// 每一格里有哪些系统（“新 N”角标数这些里开了、没看过的）
const NAV_KEYS = { exp: ['exp', 'herb', 'treasure', 'chainExp', 'realm', 'wish', 'boss'], home: ['home', 'retreat', 'tuna', 'field', 'crops', 'furnace', 'yin', 'plots', 'zhen'], gear: ['gearCmp', 'robe', 'orn', 'plus', 'infuse', 'forge', 'arts', 'zhanji', 'mishu', 'pets', 'petJobs'],
  world: ['tour', 'market', 'sect', 'sell', 'shelf', 'auction', 'vault', 'duty', 'disc', 'bond', 'comp'], path: ['cal', 'world', 'dao', 'codex'] };
function navState(nav) {
  if (!st) return { open: true, why: '' };
  if (st.run && nav !== 'path') return { open: false, why: '秘境中' };
  if (nav === 'home') return UI.isOpen('home') ? { open: true } : { open: false, why: '历练后开' };
  if (nav === 'gear') return (st.gear && (st.gear.w || st.gear.pend.length)) || UI.isOpen('gearCmp') || UI.isOpen('arts') || (st.stats.exp || 0) >= 1 ? { open: true } : { open: false, why: '历练后开' };
  if (nav === 'world') return ['tour', 'market', 'sect', 'bond'].some(k => UI.isOpen(k) && (L.ONB_ON === false || (st.onb && st.onb.at[k] !== undefined) || !!st.rebirth)) || st.pact ? { open: true } : { open: false, why: '筑基开' };
  return { open: true };
}
// “新”：开了、还没在面板里看过（打开那一格就算看过）
function navNewN(nav) {
  if (!st || !st.onb) return 0;
  // 第一次见到（新档或旧档读进来）：已经开着的都算看过，只给之后新开的挂“新”
  if (!st.flags.navSeen) { st.flags.navSeen = {}; for (const k in st.onb.at) st.flags.navSeen[k] = 1; }
  const seen = st.flags.navSeen;
  let n = (NAV_KEYS[nav] || []).filter(k => st.onb.at[k] !== undefined && st.onb.at[k] > 0 && !seen[k] && !st.rebirth).length;
  if (nav === 'gear' && st.gear) n += st.gear.pend.filter(y => !y.hold).length + ((st.petPend || []).length);
  return n;
}
function navSeen(nav) { if (!st) return; const seen = st.flags.navSeen || (st.flags.navSeen = {}); for (const k of NAV_KEYS[nav] || []) if (st.onb && st.onb.at[k] !== undefined) seen[k] = 1; }
// 面板从底栏打开：浮在底栏之上、那一格点亮；同一格再点一次 = 关
let navCur = '';
function navOpenPanel(nav) { navCur = nav; navSeen(nav); }
function syncNav() {
  const g = st ? L.goalNow(st) : null, goNav = g && g.next && g.next.go ? GO_NAV[g.next.go] || '' : '';
  // 底栏同一时刻只挂一个角标（§4.1）：目标卡“下一步”指向的那一格挂“去”；没有“去”时，第一格有新东西的挂“新 N”；其余有新东西的只描一圈淡金边
  const info = $$('#nav button').map(b => { const n = b.dataset.nav, s = navState(n); return { b, n, s, nn: s.open ? navNewN(n) : 0, go: s.open && goNav === n && !(modalOpen() && navCur === n) }; });
  const goOne = info.find(x => x.go), newOne = goOne ? null : info.find(x => x.nn > 0 && !(modalOpen() && navCur === x.n));
  for (const x of info) {
    const b = x.b, n = x.n, s = x.s;
    b.classList.toggle('lk', !s.open);
    const w = b.querySelector('.lkw'); if (w && w.textContent !== (s.why || '')) w.textContent = s.why || '';
    b.classList.toggle('on', modalOpen() && navCur === n);
    b.classList.toggle('gonow', x === goOne);
    b.classList.toggle('new', x.nn > 0 && x !== goOne);
    setBadge(n, x === goOne ? '去' : x === newOne ? '新' + x.nn : '');
  }
  const m = $('#modal'), on = !m.hidden && !!navCur && !m.classList.contains('duel-m') && !m.classList.contains('mid');
  if (m.classList.contains('nav-m') !== on) m.classList.toggle('nav-m', on);
  const nh = $('#nav').getBoundingClientRect(); document.documentElement.style.setProperty('--navh', Math.round(window.innerHeight - nh.top + 4) + 'px');
}
function navClick(nav) {
  const s = navState(nav);
  if (!s.open) { sayLine(`${NAV_N[nav]}：${s.why}`); return; }
  if (modalOpen() && navCur === nav) { closeModal(); return; }
  if (modalOpen()) closeModal();
  navOpenPanel(nav);
  ({ exp: showExp, home: showHome, gear: showEquip, world: showWorld, path: showPath })[nav]();
}

// ===================== 每 200 毫秒刷新一次的主画面（hud.js 的 updateHUD 调） =====================
const statPrev = {};
function statDelta(key, v, sel, dsel, f) {
  const p = statPrev[key];
  statPrev[key] = { v, at: p ? p.at : 0, d: p ? p.d : 0 };
  if (p && Math.abs(v - p.v) > Math.max(1e-6, Math.abs(p.v) * 0.004) && !cine) {
    statPrev[key].d = v - p.v; statPrev[key].at = performance.now();
    const b = $(sel); if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  }
  const el = $(dsel), s = statPrev[key];
  const show = s.at && performance.now() - s.at < 4000 && s.d;
  const txt = show ? (s.d > 0 ? '▲' : '▼') + f(Math.abs(s.d)) : '';
  if (el.textContent !== txt) { el.textContent = txt; el.classList.toggle('dn', s.d < 0); }
}
let pipsKey = '', goalKey = '';
function renderMain() {
  if (!st) return;
  const p = st.p;
  // 顶栏：寿元（还够多少月）、纸鹤数
  const lm = L.lifeMonths(st), lb = $('#vLife');
  if (lb.textContent !== lm.text) lb.textContent = lm.text;
  $('#lifeBox').classList.toggle('low', !!lm.red);
  const mail = L.mailbox(st).length, mn = $('#mailN');
  if (mn.hidden !== !mail) mn.hidden = !mail;
  if (mail && mn.textContent !== String(mail)) mn.textContent = mail;
  const paused = SPEEDS[speedIdx] === 0, pb = $('#btnPause');
  if (pb.classList.contains('on') !== paused) { pb.classList.toggle('on', paused); pb.innerHTML = artIcon(paused ? 'play' : 'pause', 20); pb.setAttribute('aria-label', paused ? '继续' : '暂停'); }
  // 时间条：本章 36 格（第一章）或今年 12 格；大节点红格 + 右上角“还有 N 月”
  const tb = L.timeBar(st);
  $('#date').textContent = `第${tb.y}年 · ${'春夏秋冬'[tb.season]} · ${tb.m}${MO()}`;
  const bl = $('#bigLeft'), lbl = tb.big ? tb.label || `${tb.big.n} 还有 ${tb.big.left} ${MO()}` : '';
  if (bl.textContent !== lbl) bl.textContent = lbl;
  bl.classList.toggle('gold', !!tb.big && tb.big.left > 6);
  const pk = tb.n + '|' + tb.cur + '|' + tb.cells.map(c => c.s[0]).join('');
  if (pk !== pipsKey) {
    pipsKey = pk;
    $('#pips').innerHTML = tb.cells.map((c, i) => `<i class="${c.s === 'past' ? 'd' : c.s === 'now' ? 'n' : c.s === 'big' ? 'f' : ''}${tb.n === 36 && i % 12 === 11 && i < 35 ? ' yr' : ''}"></i>`).join('');
  }
  // 场景状态牌：打坐中 / 历练中 / 闭关中 / 暂停
  const sp = $('#scenePill');
  let ph = '', pc = '';
  if (st.run || cine || duelFx) ph = '';
  else if (st.exp) { const e = st.exp, i = Math.min(e.total, e.total - e.left + 1); ph = `<b>历练中</b>${esc(L.REGIONS[e.k].n)} · 第 ${i}/${e.total} ${MO()}`; pc = 'trip'; }
  else if (st.retreat) { ph = `<b>${st.retreat.kind === 'train' ? '特训中' : st.retreat.kind === 'teach' || st.retreat.kind === 'busy' ? (st.retreat.label || '忙碌中') : '闭关中'}</b>还有 ${st.retreat.left} ${MO()}`; pc = 'trip'; }
  else if (p.r > L.MAXR) ph = '<b>大道已成</b>';
  else if (paused) { ph = '<b>暂停</b>点右上 ▶ 继续'; pc = 'stop'; }
  else ph = `<b>打坐中</b>修为 +${fmt(L.gain(st))}/${MO()}`;
  if (sp._h !== ph) { sp._h = ph; sp.innerHTML = ph; }
  if (sp._c !== pc) { sp._c = pc; sp.className = 'spill ' + pc; }
  // 历练途中：底部格子条（一格一月）
  const trb = $('#tripBar');
  if (st.exp && !cine) { const e = st.exp, k = e.total + '|' + (e.total - e.left); if (trb._k !== k) { trb._k = k; trb.innerHTML = Array.from({ length: e.total }, (_, i) => `<i class="${i < e.total - e.left ? 'd' : ''}"></i>`).join(''); } if (trb.hidden) trb.hidden = false; }
  else if (!trb.hidden) trb.hidden = true;
  // 境界条右侧：圆满还差 N 月
  const cr = $('#cultR');
  let ct = '';
  if (p.r <= L.MAXR) {
    if (L.isReady(st)) ct = '可以突破了 ▸';
    else if (L.isFull(st)) ct = '圆满 · 回洞府突破';
    else { const n = L.ticksToStage(st, p.r * 4 + 4); ct = isFinite(n) ? `圆满还差 <b>${n} ${MO()}</b>` : ''; }
  }
  if (cr._h !== ct) { cr._h = ct; cr.innerHTML = ct; }
  // 三个数值格跳字（§6.3）
  statDelta('atk', L.power(st), '#sAtk', '#dAtk', fmt);
  statDelta('cul', L.gain(st), '#sCul', '#dCul', v => L.fmt1(v));
  statDelta('inc', L.income(st), '#sInc', '#dInc', v => L.fmt1(v));
  // 目标卡三行：第 N 章 + 目标 / 现值 → 目标值 / 下一步 + 【去】
  const g = L.goalNow(st), nx = g.next || {};
  const gk = [g.ch, g.t, g.bar.text, g.bar.v, nx.t, nx.go].join('|');
  if (gk !== goalKey) {
    goalKey = gk;
    $('#gCh').textContent = g.chN || chName(g.ch);
    { const cn = g.chN || chName(g.ch), m = /第(.)章/.exec(cn); $('#gCh2').textContent = m ? m[1] : cn.slice(0, 2); }
    $('#gT').textContent = g.t;
    $('#gFill').style.width = (Math.max(0, Math.min(1, g.bar.v / (g.bar.max || 1))) * 100).toFixed(1) + '%';
    $('#gBar').textContent = g.bar.text;
    $('#gNext').innerHTML = `下一步：${esc(nx.t || '')}`;
    $('#gGo').hidden = !nx.go;
  }
  { const ge = $('#goal'), want = !!st.flags.goalOpen; if (ge.classList.contains('open') !== want) ge.classList.toggle('open', want); }
  syncNav(); renderTick(); syncHl(); tripSnapNow();
}
