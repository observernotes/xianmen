/* 废柴仙途 · 界面片段 goalcard：开罗式主画面（docs/KAIRO_PLAN.md §2.2 / §3.2 / §4.1 / §5.2 / §6.3；示意图 docs/kairo_mock/01_main.png、07_exp_travel.png）
 * 顶栏（灵石 / 丹 / 寿元 / 纸鹤）、时间条（一格一季）、场景状态牌、境界条右侧“圆满还差”、三个数值格跳字、目标卡三行、一行传讯、固定五格底栏（灰锁 + 两种角标）、
 * 面板浮在底栏之上（navOpenPanel）、hlOnly 金框、目标卡【去】的跳转表 GO_K。
 * 数据读线 1 的接口（docs/KAIRO_PLAN.md 末尾“接口”）：L.goalNow / L.timeBar / L.lifeMonths / L.chapterNow / L.pathView / L.chapterSummary / L.yearReport / L.mailbox。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */

// ===================== 小工具（线 1 的接口已经装在 L 上：goalNow / goalNext / timeBar / lifeMonths / bigNext / pathView / chapterSummary / yearReport / mailbox） =====================
const CH_NUM = '一二三四五六七八九';
const chName = i => '第' + CH_NUM[Math.max(0, Math.min(8, i))] + '章';
const MO = () => '月';   // 只给“修炼/月”“灵石/月”这类量词用；时长一律写季（core.js 的 seasons / seasonsT，AP_PLAN §1.4）
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ===================== 一行传讯（§5.2-3）：替代横幅与大部分气泡；≤ 20 字，停 6 秒，点开纸鹤看历史 =====================
let tickNewAt = 0;
const sayLog = [];
function sayLine(text, cls) {
  if (!st || !text) return;
  text = String(text).replace(/<[^>]+>/g, '');
  const m = L.dateText ? L.dateText(st).replace(/^第 (\d+) 年 · /, '$1年') : '';
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
  if (sl && (performance.now() - sl.at < 6000 || !lg || sl.logLen === st.log.length)) h = `${sl.m} <span class="${esc(sl.cls)}">${esc(sl.text)}</span>`;
  else if (lg) h = `<span class="${esc(lg.cls)}">${esc(lg.text)}</span>`;
  else h = '';
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
// 变强建议的 go（docs/KAIRO_PLAN.md §10.5）：'do:<id>'（当场做 / 闭关）、'exp:k:d:a'（那一格的出发页）落到哪一格
const goNavOf = k => { k = String(k || ''); if (k.startsWith('exp:')) return 'exp'; if (k.startsWith('do:')) { const id = k.slice(3); return /^(up|retreat|heal|pill)/.test(id) ? 'home' : /^exp/.test(id) ? 'exp' : 'gear'; } return GO_NAV[k] || ''; };
function goTo(k, hl) {
  if (!k || !st) return;
  if (/^(do|exp):/.test(k)) { if (modalOpen()) closeModal(); if (k.startsWith('exp:')) goKey(k); return; }
  const f = GO_K[k] || GO_K.exp;
  if (!modalOpen() || !hl) { if (modalOpen()) closeModal(); }
  f();
  if (hl) setTimeout(() => hlOnly(hl), 60);
}
// 【去】（AP_PLAN §5.1 / §6.1）：带点数直接执行——线 B 的 next.do（行动 id，可带 next.args）当场 L.act；
// 变强建议的一张牌（next.act）照旧直接做（当场能做的当场做完、闭关直接闭、历练开那一格的出发页）；其余按 next.go 跳过去
$('#gGo').addEventListener('click', e => {
  e.stopPropagation(); if (!st || cine || busyUI()) return; ac(); SFX.tap();
  const g = L.goalNow(st), nx = g.next || {}, d = goDoOf(nx);
  if (d && L.ACTS && L.ACTS[d.id]) { goDo(d); goalKey = ''; return; }
  if (nx.act) { if (modalOpen()) closeModal(); runAct(nx.act, null); goalKey = ''; }
  else if (nx.go) goTo(nx.go, nx.hl);
});
// next.do：线 B 给 { id, args }（也认旧的 next.do = id、next.args）
const goDoOf = nx => (!nx || !nx.do ? null : typeof nx.do === 'object' ? nx.do : { id: nx.do, args: nx.args });
// next.do 的执行：历练要先选格子（没给 args 时开出发页）、首领要打回合战、下战书先进准备页（点名的人）；别的当场 L.act
function goDo(d) {
  const id = d.id, a = d.args;
  if (modalOpen()) closeModal();
  if (id === 'exp' && !(a && (Array.isArray(a) ? a.length : a.k !== undefined))) { showExp(); return; }
  if (id === 'exp') { const k = L.actArg(a, 0, 'k'), d = L.actArg(a, 1, 'd') || 0, aa = L.actArg(a, 2, 'a') || 0; confirmExp(k, d, aa); return; }
  if (id === 'boss') { fightBossUI(L.actArg(a, 0, 'k')); return; }
  if (id === 'duel' && typeof chalPrep === 'function' && L.challengeInfo && L.actArg(a, 0, 'id')) { chalPrep(L.actArg(a, 0, 'id'), {}); return; }
  if (id === 'realm') { showRealm(); return; }
  doAct(id, a);
}
// 【去】这一步花几点：线 B 给 next.ap；没有时按 do / 变强牌的 go 推（历练、闭关 2 点，首领、打坐 1 点……）
function goAp(nx) {
  if (!nx || !st) return 0;
  if (typeof nx.ap === 'number') return nx.ap;
  const d = goDoOf(nx); if (d && L.ACTS && L.ACTS[d.id]) return L.apCost(st, d.id, d.args);
  const go = String((nx.act && nx.act.go) || nx.go || '');
  if (/^exp:/.test(go) || /^do:(exp|wish)/.test(go)) return L.AP.exp;
  if (/^do:retreat/.test(go)) return L.AP.retreat;
  if (go === 'train') return L.AP.train;
  return 0;
}
// 目标卡：默认收起成一行；点一下展开 / 收起（记在存档里）；展开时点第一行（第 N 章 · 目标）进路径页
$('#goal').addEventListener('click', e => {
  if (!st || cine) return; ac(); SFX.tap();
  const el = $('#goal');
  if (e.target.closest('.gbar')) { showGrowth('goal'); return; }   // 进度条 = 变强页（目标页签）
  if (el.classList.contains('open') && e.target.closest('.g1')) { showPath(); return; }
  st.flags.goalOpen = !el.classList.contains('open'); el.classList.toggle('open', st.flags.goalOpen);
  fitScene();   // 当场重排（不等 ResizeObserver 的下一拍）：目标卡高了 / 矮了，场景让出 / 收回这一截，底栏不被挤出屏幕
});
$('#time').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); if (UI.isOpen('cal')) showCalendar(); else showBig(); });
$('#btnMail').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showInbox(); });

// ===================== 底栏固定五格（§4.1）：位置永远不变；没开的那一格灰剪影 + 一行条件 =====================
const NAV_N = { exp: '历练', home: '洞府', gear: '装备', world: '江湖', path: '仙途' };
// 每一格里有哪些系统（“新 N”角标数这些里开了、没看过的）
const NAV_KEYS = { exp: ['exp', 'herb', 'treasure', 'chainExp', 'realm', 'wish', 'boss'], home: ['home', 'retreat', 'field', 'crops', 'furnace', 'yin', 'plots', 'zhen'], gear: ['gearCmp', 'robe', 'orn', 'plus', 'infuse', 'forge', 'arts', 'zhanji', 'mishu', 'pets', 'petJobs'],
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
  const g = st ? L.goalNow(st) : null, goNav = g && g.next && g.next.go ? goNavOf(g.next.go) : '';
  // 底栏同一时刻只挂一个角标（§4.1）：目标卡“下一步”指向的那一格挂“去”；没有“去”时，第一格有新东西的挂“新 N”；其余有新东西的只描一圈淡金边
  const info = $$('#nav button').map(b => { const n = b.dataset.nav, s = navState(n); return { b, n, s, nn: s.open ? navNewN(n) : 0, go: s.open && goNav === n && !(modalOpen() && navCur === n) }; });
  let lkMoved = false;
  const goOne = info.find(x => x.go), newOne = goOne ? null : info.find(x => x.nn > 0 && !(modalOpen() && navCur === x.n));
  for (const x of info) {
    const b = x.b, n = x.n, s = x.s;
    if (b.classList.contains('lk') === s.open) { b.classList.toggle('lk', !s.open); lkMoved = true; }   // 开锁 / 上锁：格子高度会变（“几时开”那一行），下面当场重排场景
    const w = b.querySelector('.lkw'); if (w && w.textContent !== (s.why || '')) { w.textContent = s.why || ''; lkMoved = true; }
    b.classList.toggle('on', modalOpen() && navCur === n);
    b.classList.toggle('gonow', x === goOne);
    b.classList.toggle('new', x.nn > 0 && x !== goOne);
    setBadge(n, x === goOne ? '去' : x === newOne ? '新' + x.nn : '');
  }
  if (lkMoved) fitScene();
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
  // 寿元：≥ 10 年写“寿元足”，否则“寿元 N 年”，≤ 5 年变红（AP_PLAN §1.4）
  const lm = L.lifeMonths(st), lb = $('#vLife'), lt = !isFinite(lm.m) ? lm.text : lm.m >= 120 ? '寿元足' : `寿元 ${Math.max(1, Math.floor(lm.m / 12))} 年`;
  if (lb.textContent !== lt) lb.textContent = lt;
  $('#lifeBox').classList.toggle('low', isFinite(lm.m) && lm.m <= 60);
  const mail = L.mailbox(st).length, mn = $('#mailN');
  if (mn.hidden !== !mail) mn.hidden = !mail;
  if (mail && mn.textContent !== String(mail)) mn.textContent = mail;
  // 时间条：一格一季（第一章 12 格到三年之约，之后每年 4 格）；大节点红格 + 右上角“还有 N 季 / 本季末”
  const tb = L.timeBar(st);
  const dt = L.dateText ? L.dateText(st) : `第 ${tb.y} 年 · ${'春夏秋冬'[tb.season]}`;
  if ($('#date').textContent !== dt) $('#date').textContent = dt;
  const bl = $('#bigLeft'), lbl = tb.big ? tb.label || (tb.big.seasons <= 1 ? `${tb.big.n} 本季末` : `${tb.big.n} 还有 ${tb.big.seasons} 季`) : '';
  if (bl.textContent !== lbl) bl.textContent = lbl;
  bl.classList.toggle('gold', !!tb.big && tb.big.left > 6);
  const pk = tb.n + '|' + tb.cur + '|' + tb.cells.map(c => c.s[0]).join('');
  if (pk !== pipsKey) {
    pipsKey = pk;
    $('#pips').innerHTML = tb.cells.map((c, i) => `<i class="${c.s === 'past' ? 'd' : c.s === 'now' ? 'n' : c.s === 'big' ? 'f' : ''}${tb.n > 4 && i % 4 === 3 && i < tb.n - 1 ? ' yr' : ''}"></i>`).join('');
  }
  // 场景状态牌：打坐中 / 历练中（第几个节点）
  const sp = $('#scenePill');
  let ph = '', pc = '';
  if (st.run || cine || duelFx) ph = '';
  else if (st.exp) { const e = st.exp, nn = e.nodes ? e.nodes.length : e.total, i = Math.min(nn, (e.nodes ? e.ni : e.total - e.left) + 1); ph = `<b>${e.quick ? '扫荡' : '历练中'}</b>${esc(L.REGIONS[e.k].n)} · 第 ${i}/${nn} 处`; pc = 'trip'; }
  else if (p.r > L.MAXR) ph = '<b>大道已成</b>';
  else ph = `<b>打坐中</b>修为 +${fmt(L.gain(st))}/${MO()}`;
  if (sp._h !== ph) { sp._h = ph; sp.innerHTML = ph; }
  if (sp._c !== pc) { sp._c = pc; sp.className = 'spill ' + pc; }
  // 历练途中：底部格子条（一格一个节点）
  const trb = $('#tripBar');
  if (st.exp && !cine) { const e = st.exp, nn = e.nodes ? e.nodes.length : e.total, dn = e.nodes ? e.ni : e.total - e.left, k = nn + '|' + dn; if (trb._k !== k) { trb._k = k; trb.innerHTML = Array.from({ length: nn }, (_, i) => `<i class="${i < dn ? 'd' : ''}"></i>`).join(''); } if (trb.hidden) trb.hidden = false; }
  else if (!trb.hidden) trb.hidden = true;
  // 境界条右侧：圆满还差 N 月
  const cr = $('#cultR');
  let ct = '';
  if (p.r <= L.MAXR) {
    if (L.isReady(st)) ct = '可以突破了 ▸';
    else if (L.isFull(st)) ct = '圆满 · 回洞府突破';
    else { const n = L.ticksToStage(st, p.r * 4 + 4); ct = isFinite(n) ? `圆满还差约 <b>${Math.max(1, seasons(n))} 季</b>` : ''; }   // 只算自然修炼（打坐、闭关会更快）
  }
  if (cr._h !== ct) { cr._h = ct; cr.innerHTML = ct; }
  // 三个数值格跳字（§6.3）
  statDelta('atk', L.power(st), '#sAtk', '#dAtk', fmt);
  statDelta('cul', L.gain(st), '#sCul', '#dCul', v => L.fmt1(v));
  statDelta('inc', L.income(st), '#sInc', '#dInc', v => L.fmt1(v));
  // 目标卡三行：第 N 章 + 目标 / 现值 → 目标值 / 下一步 + 【去】
  const g = L.goalNow(st), nx = g.next || {};
  const nap = goAp(nx), nwhy = nap > L.apLeft(st) ? '点不够（下一季）' : '';
  const gk = [g.ch, g.t, g.bar.text, g.bar.v, nx.t, nx.go, nx.do && (nx.do.id || nx.do), nap, nwhy].join('|');
  if (gk !== goalKey) {
    goalKey = gk;
    $('#gCh').textContent = g.chN || chName(g.ch);
    { const cn = g.chN || chName(g.ch), m = /第(.)章/.exec(cn); $('#gCh2').textContent = m ? m[1] : cn.slice(0, 2); }
    $('#gT').textContent = g.t;
    $('#gFill').style.width = (Math.max(0, Math.min(1, g.bar.v / (g.bar.max || 1))) * 100).toFixed(1) + '%';
    $('#gBar').textContent = g.bar.text;
    $('#gNext').innerHTML = `下一步：${esc(nx.t || '')}${nwhy ? ` <span class="muted">${nwhy}</span>` : ''}`;
    const gg = $('#gGo'); gg.hidden = !nx.go && !nx.do;
    gg.innerHTML = `去${nap ? apTag(nap) : ''} ▸`;
    if (nap) gg.dataset.ap = nap; else delete gg.dataset.ap;
  }
  { const ge = $('#goal'), want = !!st.flags.goalOpen; if (ge.classList.contains('open') !== want) { ge.classList.toggle('open', want); fitScene(); } }
  renderApRow();   // 行动点一行（settle.js）
  syncNav(); renderTick(); syncHl(); tripSnapNow();
}
