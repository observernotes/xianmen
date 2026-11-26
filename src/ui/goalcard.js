/* 废柴仙途 · 界面片段 goalcard：开罗式主画面（docs/KAIRO_PLAN.md §2.2 / §3.2 / §4.1 / §5.2 / §6.3；示意图 docs/kairo_mock/01_main.png、07_exp_travel.png）
 * 顶栏（灵石 / 丹 / 寿元 / 纸鹤 / 暂停）、时间条、场景状态牌、境界条右侧“圆满还差”、三个数值格跳字、目标卡三行、一行传讯、固定五格底栏（灰锁 + 两种角标）、
 * 面板浮在底栏之上（navOpenPanel）、hlOnly 金框、目标卡【去】的跳转表 GO_K。
 * 数据读线 1 的接口（docs/KAIRO_PLAN.md 末尾“接口”）：L.goalNow / L.timeBar / L.lifeMonths / L.chapterNow / L.pathView / L.chapterSummary / L.yearReport / L.mailbox。
 * 本片段开头那一段是这些接口的兜底（线 1 合并后，同名的逻辑层实现先装上，这里的 `L.x = L.x || …` 就不生效；确认无用后可删）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */

// ===================== 兜底：线 1 的接口没装上时用（合并线 1 后可删） =====================
const CH_NUM = '一二三四五六七八九';
const chName = i => '第' + CH_NUM[Math.max(0, Math.min(8, i))] + '章';
const MO = () => L.UNIT || '月';
// 每章开放的系统（KAIRO_PLAN §2.1 表“这一章开放”一列）：L.ONB[j].ch 没有时按这张表
const ONB_CH0 = { exp: 0, home: 0, herb: 0, retreat: 0, bt: 0, gearCmp: 0, tour: 1, market: 1, sect: 1, visitor: 1, tuna: 1, field: 1, treasure: 1, trib: 1, sell: 1, shelf: 1, robe: 1, vault: 1,
  arts: 2, furnace: 2, plus: 2, pets: 2, cal: 2, world: 2, zhanji: 2, crops: 2, yin: 2, mishu: 2, realm: 3, bond: 3, plots: 3, zhen: 3, dao: 3, auction: 3, codex: 3, petJobs: 3,
  disc: 4, duty: 4, comp: 4, orn: 4, forge: 4, chainExp: 4 };
const onbCh = e => (e.ch !== undefined ? e.ch : ONB_CH0[e.k] !== undefined ? ONB_CH0[e.k] : 4);
const CH_GOAL = ['赢下三年之约', '晋升内门 · 榜前 60', '晋升真传 · 败赵乾', '成为圣子', '九宗会武夺魁', '击退天剑宗', '击败血无涯', '成为宗主', '渡过飞升天劫'];
const CH_BLURB = ['被退婚，三年后打回去', '拜入宗门，进天骄榜前 60', '渡雷劫 · 晋升真传', '成为圣子 / 圣女', '九宗会武', '守山之战', '击败血无涯', '宗主 · 带宗门登顶', '白日飞升'];
L.chapterNow = L.chapterNow || (st => { const done = (st.quest && st.quest.done) || {}; let i = 0; while (i < 8 && done[L.CHAPTERS[i].main.id]) i++; return Math.min(8, Math.max(i, L.mr ? L.mr(st) : st.p.r)); });
const chGoal = (st, i) => { const C = L.CHAPTERS[i]; if (C.goal) return typeof C.goal === 'function' ? C.goal(st) : C.goal; if (i === 0 && st.pact < 0) return '论道击败' + (st.exName || '对手'); return CH_GOAL[i]; };
const chBlurb = i => L.CHAPTERS[i].blurb || CH_BLURB[i];
function chProg(st, i) {
  const C = L.CHAPTERS[i];
  if (C.prog) { try { const r = C.prog(st); if (r && r.length) return r; } catch (e) { /* 线 1 的 prog 算不出来就用兜底 */ } }
  if (i === 0) { const pi = L.pactInfo(st); return [{ k: 'pact', t: '胜算', v: pi.p, max: 0.8, text: `胜算 ${L.pct(pi.p)} → 目标 80%` }]; }
  if (i === 1) { const b = st.bestRank || st.rank; return [{ k: 'rank', t: '天骄榜', v: Math.max(0, 100 - b), max: 40, text: `天骄榜 第 ${st.rank} → 前 60` }]; }
  if (i === 8) { const r = L.tribRate ? L.tribRate(st, { pills: Math.min(L.BT.maxPills, st.pills), aids: 'all' }) : 0; return [{ k: 'trib', t: '天劫', v: r, max: 1, text: `天劫成功率 ${L.pct(r)}` }]; }
  const qv = L.questView(st); return [{ k: 'quest', t: '札记', v: qv.doneN, max: Math.max(1, qv.total), text: `本章小任务 ${qv.doneN}/${qv.total}` }];
}
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
// 刚开的系统的小目标去哪做（ONB 键 → GO_K 键）
const ONB_GO_K = { exp: 'exp', home: 'home', retreat: 'home', bt: 'bt', sect: 'sect', market: 'market', visitor: 'inbox', field: 'field', gearCmp: 'gear', furnace: 'furnace', arts: 'arts', trib: 'bt', pets: 'pets', plus: 'gear', zhanji: 'arts', realm: 'realm', bond: 'people', plots: 'home', zhen: 'zhen', disc: 'sect', tour: 'rivals', cal: 'cal', dao: 'attr', codex: 'record' };
const QGO_K = { big: 'big', cult: 'bt', me: 'attr', gear: 'gear', arts: 'arts' };
L.goalNow = L.goalNow || function (st) {
  const ch = L.chapterNow(st), prog = chProg(st, ch), b = prog[0];
  const bar = { v: Math.max(0, Math.min(1, b.v / (b.max || 1))), max: 1, text: b.text };
  let next = null;
  const qv = L.questView(st), og = L.onbGoal && L.onbGoal(st), nb = L.nextBig(st);
  if (st.exp) next = { t: '历练中，等它回来', go: null, why: 'exp' };
  else if (L.isReady(st)) next = { t: '可以突破了', go: 'bt', hl: '#cult', why: 'ready' };
  else if (st.gear && st.gear.pend.some(y => !y.hold)) next = { t: '装备里有新东西', go: 'gear', why: 'gear' };
  else if (og) next = { t: cut(og.goal, 12), go: ONB_GO_K[og.k] || 'exp', why: 'onb' };
  else if (nb && nb.left <= 6 && nb.k === 'pact' && nb.info.p < 0.8 && typeof pactTips === 'function' && pactTips()[0]) { const t = pactTips()[0]; next = { t: cut(t.t, 12), go: t.go === 'cult' ? 'bt' : t.go || 'big', why: 'big' }; }
  else if (qv.first && !qv.first.main) next = { t: cut(L.questText(st, qv.first), 12), go: QGO_K[qv.first.go] || qv.first.go || 'exp', why: 'quest' };
  else if (st.retreat) next = { t: '闭关中，静候出关', go: null, why: 'idle' };
  else next = { t: '去历练', go: 'exp', hl: null, why: 'exp' };
  return { ch, chN: chName(ch), t: chGoal(st, ch), bar, next };
};
L.lifeMonths = L.lifeMonths || (st => { if (st.p.r > L.MAXR) return { m: Infinity, text: '不朽', red: false }; const m = L.lifeTicks(st); return { m, text: m >= 120 ? '寿元足' : `寿元 ${m} 月`, red: m <= 60 }; });
L.bigNext = L.bigNext || (st => { const nb = L.nextBig(st); return nb ? { k: nb.k, n: nb.n, left: nb.left, p: nb.info && nb.info.p } : null; });
L.timeBar = L.timeBar || function (st) {
  const t = st.tick, y = Math.floor(t / 12) + 1, m = (t % 12) + 1, big = L.bigNext(st);
  const pre = !st.pact && !st.rebirth, n = pre ? 36 : 12, cur = pre ? Math.min(35, t) : t % 12;
  const cells = []; for (let i = 0; i < n; i++) cells.push({ s: i < cur ? 'past' : i === cur ? 'now' : 'future' });
  if (big && cur + big.left < n) cells[cur + big.left] = { s: 'big', k: big.k };
  return { y, m, season: L.season(st), n, cur, cells, big, label: big ? `${big.n} 还有 ${big.left} ${MO()}` : '' };
};
L.mailbox = L.mailbox || (st => (st.inbox || []).filter(x => x.left === null || x.left === undefined || x.left > 0));
L.pathView = L.pathView || function (st) {
  const now = L.chapterNow(st), done = (st.quest && st.quest.done) || {};
  return L.CHAPTERS.map((C, i) => {
    const keys = L.ONB.filter(e => e.sys && onbCh(e) === i).map(e => e.k);
    const opened = keys.filter(k => L.onbShown(st, k));
    const state = i < now ? (done[C.main.id] ? 'done' : 'miss') : i === now ? 'now' : i === now + 1 ? 'next' : 'lock';
    return { i, n: C.n, realm: C.realm, state, goal: chGoal(st, i), blurb: chBlurb(i), prog: i === now ? chProg(st, i) : [], opened, toOpen: keys.length - opened.length };
  });
};
L.chapterSummary = L.chapterSummary || function (st, i) {
  const at = (st.flags.chapAt || {})[i] || { t: 0, exp: 0, rank: 100, pw: 10 }, C = L.CHAPTERS[i], N = L.CHAPTERS[i + 1];
  const best = Math.max(-1, ...Object.values(st.best || {}));
  const nk = N ? L.ONB.filter(e => e.sys && onbCh(e) === i + 1).length : 0;
  return { i, n: C.n, realm: C.realm, months: st.tick - at.t, pw0: at.pw, pw1: L.power(st), exp: (st.stats.exp || 0) - at.exp, best,
    next: N ? { i: i + 1, n: N.n, goal: chGoal(st, i + 1), blurb: chBlurb(i + 1), toOpen: nk, rw: L.rewardText(st, N.main.rw) } : null };
};
// 年报兜底：界面自己记一份年初快照（st.flags.repUI），灵石赚 / 花按每次刷新的差值累计
function repSnap(y) { return { y, r: st.p.r, s: st.p.s, pw: Math.round(L.power(st)), gain: L.gain(st), earn: 0, spend: 0, exp: st.stats.exp || 0, best: -1, rank: st.pact ? st.rank : null, opened: Object.keys((st.onb && st.onb.at) || {}) }; }
let repStones = null;
function repTrack() {
  if (!st || L.yearClose) return;
  const f = st.flags, y = Math.floor(st.tick / 12) + 1;
  if (!f.repUI) f.repUI = repSnap(y);
  if (repStones !== null && st.stones !== repStones) { const d = st.stones - repStones; if (d > 0) f.repUI.earn += d; else f.repUI.spend -= d; }
  repStones = st.stones;
}
L.yearReport = L.yearReport || function (st) {
  const r = st.flags.repUI || repSnap(Math.floor(st.tick / 12)), stage = (rr, ss) => L.REALMS[Math.min(rr, 9)].n + (rr <= L.MAXR ? L.STAGES[ss] : '');
  const at0 = new Set(r.opened || []), opened = Object.keys((st.onb && st.onb.at) || {}).filter(k => !at0.has(k) && L.ONB_K[k] && L.ONB_K[k].sys);
  const g = L.goalNow(st), bn = L.bigNext(st);
  const lows = [['pw', L.power(st) / Math.max(1, r.pw)], ['gain', L.gain(st) / Math.max(0.01, r.gain)]].sort((a, b) => a[1] - b[1]);
  return { y: r.y, realm: [stage(r.r, r.s), stage(st.p.r, st.p.s)], pw: [r.pw, Math.round(L.power(st))], gain: [r.gain, L.gain(st)], earn: r.earn, spend: r.spend, exp: (st.stats.exp || 0) - r.exp,
    best: Math.max(-1, ...Object.values(st.best || {})), rank: r.rank !== null && st.pact ? [r.rank, st.rank] : null, opened, next: { ch: g.ch, bar: g.bar, big: bn },
    say: lows[0][0] === 'gain' ? '修炼涨得慢，聚灵阵该升了。' : '战力没怎么长，多去历练捡法宝。' };
};
L.yearClose = L.yearClose || null;

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
  disc: () => showWorld('sect'), trib: () => (L.isReady(st) ? showBreakthrough() : showTribPrep ? showTribPrep() : showBig()), inbox: () => showInbox(), cult: () => GO_K.bt(), me: () => showPath('attr'), codex: () => showCodex(),
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
$('#goal').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showPath(); });
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
const NAV_KEYS = { exp: ['exp', 'herb', 'treasure', 'chainExp', 'realm'], home: ['home', 'retreat', 'tuna', 'field', 'crops', 'furnace', 'yin', 'plots', 'zhen'], gear: ['gearCmp', 'robe', 'orn', 'plus', 'forge', 'arts', 'zhanji', 'mishu', 'pets', 'petJobs'],
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
  const seen = st.flags.navSeen || (st.flags.navSeen = {});
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
  $$('#nav button').forEach(b => {
    const n = b.dataset.nav, s = navState(n), nn = s.open ? navNewN(n) : 0;
    b.classList.toggle('lk', !s.open);
    const w = b.querySelector('.lkw'); if (w && w.textContent !== (s.why || '')) w.textContent = s.why || '';
    b.classList.toggle('on', modalOpen() && navCur === n);
    const go = s.open && goNav === n && !(modalOpen() && navCur === n);
    b.classList.toggle('gonow', go);
    b.classList.toggle('new', nn > 0 && !go);
    setBadge(n, go ? '去' : nn > 0 ? '新' + nn : '');
  });
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
    $('#gT').textContent = g.t;
    $('#gFill').style.width = (Math.max(0, Math.min(1, g.bar.v / (g.bar.max || 1))) * 100).toFixed(1) + '%';
    $('#gBar').textContent = g.bar.text;
    $('#gNext').innerHTML = `下一步：${esc(nx.t || '')}`;
    $('#gGo').hidden = !nx.go;
  }
  syncNav(); renderTick(); syncHl(); repTrack(); tripSnapNow();
}
