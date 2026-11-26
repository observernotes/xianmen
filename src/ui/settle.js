/* 废柴仙途 · 界面片段 settle：季度回合与结算链（docs/AP_PLAN.md §2、§4.2、§6.3；取代原 clock.js 的“时间流逝的界面一半”）
 *   时间不再自己走：主循环（boot.js 的 frame）只画画面、驱动战斗演出。时间只在 nextSeason()（点【下一季】）里推进：L.seasonEnd(st) → seasonFx(S) → settle('season')。
 *   结算链 settle(why)：每个行动结束、每次季末、读档后调。循环问 L.nextBlock(st)，一张接一张出（结算卡 / 季末卡 / 年报 / 剧情 / 大事 / 章末卡 / 解锁卡），
 *     出完一张才问下一张，链里不过季、不扣点、不插无关的东西；链没出完时【下一季】与底栏不让点（busyUI）。出完一张存一次档。
 *     不看真实时间：链的先后只由 L.nextBlock 的优先级和界面这边排着的东西（弹窗队列 queue、过场 cnQ、章末卡 chapPend、解锁卡 unlockQ）决定。
 *   线 B 的 L.nextBlock 完整版会自己给 'chapter' / 'unlock' 块；那时设 L.CHAIN_FULL = true，界面就不再从 chapPend / unlockQ 里自己补。
 *   纸鹤（st.inbox）只收不阻塞的消息（访客、大势、拍卖、宿敌消息），没有“在外”了。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 onboard 之后、boot 之前）。 */

// 历练演出进行中（一趟当场打完的那几十秒）：高光过场等这一趟打完再放（cine2.js 读它；原来的“在外”没有了）
const tripUI = () => !!(st && st.exp);
// ---------- 传讯与纸鹤 ----------
// notify(kind, mail, fn)：旧接口（各面板还在调）。没有“在外”和打断间隔了，一律当场 fn()；mail 不再投（要进纸鹤的由调用方自己 L.mailPush）
function notify(kind, mail, fn) { if (!st) return false; if (fn) fn(); return true; }
function say(text) { if (!st || !text) return false; if (UI.say) UI.say(text); else banner(text, ''); return true; }
const MAIL_GO = { visitor: () => showVisitor(), auction: () => showMarket(), world: () => showCalendar(), season: () => showCalendar(), rookie: () => showRivals ? showRivals() : showMe() };
function openMail(item) {
  if (!st || !item) return;
  L.mailTake(st, item.id);
  if (item.k === 'event' && item.data && item.data.id) { const ev = L.eventById(item.data.id); if (ev) { showChoice(ev); return; } }
  if (item.go && UI.go) { UI.go(item.go, item.data && item.data.hl); return; }
  const f = MAIL_GO[item.k]; if (f) { try { f(); } catch (e) { /* 面板不在就算了 */ } }
}

// ---------- 结算链 ----------
let chainOn = false, chainWhy = '', chainCur = null, chainN = 0, chainTicked = false;
let seasonLog = [];   // 这一季做过的事（季末卡上那一行“这一季：历练 1 趟 · 乙 ｜ 首领 ✓”）
// 有阻塞层开着（弹窗、过场、对话场景、对决、开场、历练演出、首领战）：链等它关掉
const chainBusy = () => !$('#modal').hidden || !!cine || !!duelFx || !$('#intro').hidden || (typeof tk !== 'undefined' && !!tk) || (typeof cn !== 'undefined' && !!cn)
  || !!(st && st.exp) || !!(typeof btv !== 'undefined' && btv && btv.mode === 'boss');
// 【下一季】、底栏、【去】此刻点不点得动：链没出完、演出中、秘境里、弹窗队列里还有东西
const busyUI = () => !st || chainOn || chainBusy() || !!st.run || queue.length > 0;
function settle(why) {
  if (!st) return;
  L.chainOpen(st, why || 'act');
  chainOn = true; chainWhy = why || 'act'; chainN = 0; chainTicked = false;
  chainPump();
  updateHUD();
}
// 章末卡等这一章的高潮 / 收尾那场戏（以及这件事自己的结算卡）出完；下一章的戏不抢在章末卡前头
const chEndStory = x => { const ev = x && x.kind === 'story' ? x.data || L.eventById(x.id) : null; return !!ev && /^(sb:c\d_(climax|end)|beat:)/.test(ev.trigger || ''); };
function showBlock(x) {
  const d = x.data;
  if (x.kind === 'result') return showActResult(x.id, d, x);
  if (x.kind === 'season') { showSeasonCard(d); return; }
  if (x.kind === 'year') { if (st.rep && st.rep.ready) { yearS = d; (UI.showYear || showYearBasic)(); } else showSeasonCard(d); return; }
  if (x.kind === 'story') { const ev = d || L.eventById(x.id); if (ev) showChoice(ev); return; }
  if (x.kind === 'chapter') { const ch = d && typeof d === 'object' ? d.ch !== undefined ? d.ch : d.from : typeof d === 'number' ? d : +String(x.id).replace(/\D/g, ''); showChapterCard(ch); return; }
  if (x.kind === 'unlock') { showUnlock((d && d.k) || x.id); return; }
  if (x.kind === 'big') { showBig1(x.id || (d && d.k)); return; }
}
// 固定日子的大事（季末那条链里）：三年之约、论道、会武、来犯、新秀逼战、寿尽；三宗争徒（线 B 改成第二章开章链末尾之前，季末的 out.invite 由这里接）
function showBig1(k) {
  if (k === 'pact') { if (!st.pact) runPact(); }
  else if (k === 'tour' || k === 'tourney') runTournament();
  else if (k === 'meet') runSectMeet();
  else if (k === 'war') runWar();
  else if (k === 'rookie') { if (L.rookie(st) && L.rookie(st).due) runRookie(); }
  else if (k === 'death') showDeath();
  else if (k === 'invite') { if (!st.sect) showInvite(); }
  // 主线保底（mainline.js）：只剩宿敌没打时他上门、卡住时老祖说下一步、降要求
  else if (k === 'mainFoe') { const id = L.mainFoes ? L.mainFoes(st)[0] : null; if (id) runMainFoe(id); }
  else if (k === 'mainEase' || k === 'mainHint') { const v = blkData(k); if (v) (k === 'mainEase' ? showMainEase : showMainHint)(v); }
}
let blkStash = {};
const blkData = k => { const v = blkStash[k]; delete blkStash[k]; return v; };
function chainPump() {
  if (!st) return false;
  for (let g = 0; g < 24; g++) {
    if (chainBusy()) return true;
    if (queue.length) { const fn = queue.shift(); fn(); continue; }
    if (chainCur) { chainCur = null; saveLocal(); }   // 上一张出完了：存一次（AP_PLAN §4.2 存档点）
    if (typeof cnFlush === 'function' && cnFlush()) continue;   // 排着的高光过场（cine2.js）
    let x = L.nextBlock(st);
    if (!L.CHAIN_FULL && chapPend.length && (!x || (x.kind === 'story' && !chEndStory(x)))) {
      // A1 的缺省 nextBlock 不出章末卡：主线刚完成时先看一眼这一章的高潮到没到（到了先放它），再出章末卡
      if (!x && L.storyTick) { L.storyTick(st); x = L.nextBlock(st); }
      if (!(x && chEndStory(x))) { const c = chapPend.shift(); chainCur = { kind: 'chapter', id: 'ch:' + c.ch }; chainN++; showChapterCard(c.ch); continue; }
    }
    if (x) { L.blockDone(st, x); chainCur = x; chainN++; showBlock(x); continue; }
    // 逻辑层给完了：链尾的解锁卡（AP_PLAN §4.2 第 6 级 / §4.6）。手把手那三步还在讲的时候先不出（它们只等这一下，不看真实时间）
    if (!L.CHAIN_FULL && unlockQ.length && $('#guide').hidden) { const k = unlockQ.shift(); chainCur = { kind: 'unlock', id: k }; chainN++; showUnlock(k); continue; }
    // A1 的缺省链不判节拍：行动的链收尾前看一眼本章节拍（climax / end / open 到了就当场放，不等季末的 L.tick；AP_PLAN §4.3）。线 B 的完整版接手后不走这里
    if (chainOn && !chainTicked && !L.CHAIN_FULL && L.storyTick && chainWhy !== 'season') { chainTicked = true; if (L.storyTick(st) > 0) continue; }
    if (chainOn) { chainOn = false; chainEnd(chainWhy); if (chainBusy() || queue.length) continue; }
    if (chainAfter) { const fn = chainAfter; chainAfter = null; fn(); continue; }
    return false;
  }
  return true;
}
// 链出完了：回主界面，刷新目标卡；读档后的迁移提示、第四步引导、第二季的老祖一句
function chainEnd(why) {
  goalKey = '';
  if (why === 'load' && st.ap && st.ap.migrated && !st.flags.apHint) { st.flags.apHint = 1; showApHint(); }
  if (why === 'season' && L.seasonNo(st) === 1 && !st.flags.apSay) { st.flags.apSay = 1; sayLine('老祖：一季三点。大事两点，小事一点。'); }
  saveLocal();
  updateHUD();
}
function showApHint() {
  sheet({ title: '时间不再自己走了', center: true, noClose: true,
    body: `<div class="speaker">${elderImg(48)}<p class="grow" style="margin:0">每季 <b>3 点</b>行动点，用完点<b>【下一季】</b>。大事 2 点，小事 1 点，管家务不花点。</p></div>`,
    foot: [{ t: '知道了', gold: true, fn: closeModal }] });
}
// 读档后的第一条链（save.js 的 loadState 调）：没出完的卡、旧档迁移压着的历练结算与大事、被旧节流压着的戏
function settleLoad() { if (!st || $('#intro').hidden === false) return; settle('load'); }

// ---------- 行动 ----------
// 花点的事一律 L.act（界面不直接改 st.ap）。做成了：历练类开始演出（结束时 tripFinish → settle），别的当场 settle 出结算卡
// id / args 见 AP_PLAN §10“实际提供的接口”。返回 L.act 的结果（null = 没做成，原因已经说在传讯行）
function doAct(id, args) {
  if (!st) return null;
  if (chainOn || st.exp || st.run || (typeof btv !== 'undefined' && btv)) return null;   // 链没出完、演出中：不接新的行动（出发页这类弹窗开着没关系）
  const r = L.act(st, id, args);
  if (!r) { SFX.fail(); sayLine(L.actLastWhy || '做不了'); updateHUD(); return null; }
  if (id === 'exp' || id === 'deeper') { SFX.coin(); if (modalOpen()) closeModal(); updateHUD(); if (!btOn()) { L.tripAuto(st); tripFinish(); } return r; }   // 历练：主循环接着一个节点一个节点打（battle.js）
  if (id === 'realm') { updateHUD(); return r; }   // 秘境：进去以后一层一层选门（panel-realm.js），不出结算卡
  if (modalOpen()) closeModal();
  settle('act');
  return r;
}
// 结算卡上的【再去一趟】【趁势深入】【回去突破】：等这条链出完（这张卡引出的戏都放完）再做，下一件事不插到戏前头
let chainAfter = null;
function afterChain(fn) { if (!chainOn && !queue.length) { fn(); return; } chainAfter = fn; }
// 弹窗里带 ◆N 的按钮补上 data-ap（tools/shot.js 扫它）
function apMark(root) { root.querySelectorAll('button').forEach(b => { if (b.dataset.ap) return; const m = /◆(\d)/.exec(b.textContent); if (m) b.dataset.ap = m[1]; }); }
// 点数角标：“◆2”；data-ap 给 tools/shot.js 扫（所有花点的按钮都带它，点数与 L.AP 一致）
const apTag = n => `<span class="apc">◆${n}</span>`;
const apBtn = (id, args) => { const n = L.apCost(st, id, args), why = L.apWhy(st, id, args); return { n, why, tag: apTag(n), attr: ` data-ap="${n}"` }; };
// 首领：'boss' 的缺省实现不认界面打出来的回合战结果，这里让它透传 res 给 L.fightBoss（线 A 把这一行收进 ap.js 后可删）
if (L.ACTS && L.ACTS.boss) L.regAct('boss', { run: (s, x) => L.fightBoss(s, L.actArg(x, 0, 'k'), x && typeof x === 'object' && !Array.isArray(x) && x.res ? { res: x.res } : undefined) });

// ---------- 结算卡 ----------
function showActResult(id, d, x) {
  if (!d) return;
  if (id === 'exp' || id === 'sweep' || id === 'deeper') { showExpResult(d, x && x.old); return; }
  if (id === 'boss') { seasonLog.push('首领' + (d.win ? ' ✓' : ' ✗')); if (typeof bossResultUI === 'function') bossResultUI(d.k !== undefined ? d.k : (d.B && L.BOSSES.indexOf(d.B)), d); return; }
  if (id === 'sit') { seasonLog.push('打坐'); floatText(HOMEPOS.x + 14, HOMEPOS.y - D().sit.h - 6, '打坐 修为+' + fmt(d.got || 0), '#8ff5d0'); SFX.gather(); return; }
  if (id === 'retreat' || id === 'train') { seasonLog.push(id === 'train' ? '特训' : '闭关'); showRetResult(d, id); return; }
  if (id === 'errand') { seasonLog.push('差事'); floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, d.note || (d.label || '差事') + '办完', '#8ff5d0'); return; }
  if (id === 'join') { seasonLog.push('拜山门'); if (st.sect) { SFX.win(); banner('拜入' + L.sectOf(st).n, `${L.srankName(st, st.sect.rank)} · 俸禄每${MO()} ${fmt(L.pay(st))}`); } return; }
  if (id === 'duel' || id === 'final') { seasonLog.push(id === 'duel' ? '下战书' : '主线一战'); if (id === 'duel' && d.n && typeof chalShow === 'function') chalShow(d); else showDuelResult(d, id); return; }
}
// 闭关 / 特训 / 双修结算：修为 +N（约 M 月），顿悟、分身、贡献、第一位访客
function showRetResult(r, id) {
  const lines = [];
  lines.push(`<div class="krow"><span class="k">修为</span><span class="v">+<span class="big">${fmt(r.got || 0)}</span></span><span class="s">约 ${L.fmt1((r.got || 0) / Math.max(1e-9, L.gainCalm(st)))} 月</span></div>`);
  if (r.epi) lines.push(`<div class="krow"><span class="k">顿悟</span><span class="v kup">再得 ${fmt(r.epi)}</span></div>`);
  if (r.fenshen) lines.push(`<div class="krow"><span class="k">分身</span><span class="v">${esc(typeof r.fenshen === 'object' ? '外围走了一趟：灵石 +' + fmt(r.fenshen.stones || 0) : String(r.fenshen))}</span></div>`);
  if (r.contrib) lines.push(`<div class="krow"><span class="k">贡献</span><span class="v">+${fmt(r.contrib)}</span></div>`);
  if (r.visitor) lines.push(`<div class="krow"><span class="k">出关</span><span class="v">有人在门口等你（季末上门）</span></div>`);
  if (r.epi) { SFX.reveal(4); } else SFX.gather();
  sheet({ title: id === 'train' ? '特训结束' : r.kind === 'sx' ? '双修完毕' : '出关', center: true, noClose: true, body: lines.join(''), foot: [{ t: '好', gold: true, fn: closeModal }] });
}
// 下战帖 / 主线最后一仗的结果（线 B 的 L.challenge / L.finalFight 给出对决结果；形状没定之前按论道一场的写法读：win、p、Q、S、rv / id）
function showDuelResult(r, id) {
  const rid = r.id || (r.rv && r.rv.id) || '', rv = r.rv || (rid && L.RIVALS ? L.RIVALS.find(x => x.id === rid) : null) || { n: r.n || '对手', id: rid };
  const Q = r.Q || r.P || 0, S = r.S || L.power(st);
  duel({ title: id === 'final' ? (r.title || '主线一战') : '下战帖 · ' + esc(rv.n || ''), right: { img: rv.id ? rvPortrait(rv.id, 66, 'ang', true) : rivalAvImg(rv, 66), name: rv.n || '对手', sub: fmt(Q) }, Q, S, p: r.p, win: !!r.win,
    stage: 'cloud', foe: rv.id ? ftRival(rv.id) : ftGen(rv.n || '对手'), face: !!rv.id,
    winText: r.text ? esc(r.text) : `${r.q ? `天骄榜升至第 ${r.q}` : '胜'}`, loseText: r.text ? esc(r.text) : `负伤（${seasonsT(st.p.inj)}痊愈）；他 4 季内不再接你的帖子`, done: closeModal });
}
// 季末卡（AP_PLAN §2.5）：一张、≤ 60 字、一个按钮；访客、大势、换季都并进最后一行。冬季由年报顶替（showBlock）
let yearS = null;
function seasonLines(S) {
  const R = L.seasonReport(st, S) || { title: '', lines: [], btn: '下一季 ▸' };
  const lines = R.lines.slice();
  if (R.acts !== undefined) return { R, lines };   // 线 A2 的完整版：“这一季：…”、收成、俸禄、下一季预告都在 lines 里了
  if (seasonLog.length) { const c = {}; for (const t of seasonLog) c[t] = (c[t] || 0) + 1; lines.splice(Math.min(2, lines.length), 0, '这一季：' + Object.keys(c).map(t => c[t] > 1 ? `${t} ×${c[t]}` : t).join(' ｜ ')); }
  const nx = S.next;
  if (nx && nx.cal && !(nx.bigSoon && nx.bigSoon.seasons <= 4)) lines.push(`下一季：入${nx.name} · ${cut(String(nx.cal.d).split('，')[0], 14)}`);
  return { R, lines };
}
function showSeasonCard(S) {
  if (!S) return;
  const { R, lines } = seasonLines(S);
  seasonLog = [];
  sheet({ title: esc(R.title), center: true, noClose: true, body: lines.map((t, i) => `<div class="krow${i ? '' : ' kbig'}"><span class="v">${esc(t)}</span></div>`).join(''),
    foot: [{ t: esc(R.btn || '下一季 ▸'), gold: true, fn: closeModal }] });
  SFX.year && SFX.year();
}
// 年报顶替冬季季末卡时，季末那几行放在年报最上面（panel-path.js 的 showYearReport 读 yearTop()）
function yearTop() { const S = yearS; yearS = null; if (!S) return ''; const { lines } = seasonLines(S); seasonLog = []; return lines.slice(0, 2).map(t => `<div class="krow"><span class="v">${esc(t)}</span></div>`).join(''); }

// ---------- 过季 ----------
function nextSeason(force) {
  if (!st || busyUI() || st.p.r > L.MAXR) return false;
  const left = L.apLeft(st);
  if (left > 0 && sitAsk && !force) {
    sheet({ title: '过一季', center: true, body: `<p class="center">还剩 <b>${left}</b> 点：自动打坐，修为 +${fmt(L.sitGain(st, left))}。</p>`,
      foot: [{ t: '再想想', alt: true, fn: closeModal }, { t: '过季 ▸', gold: true, fn: () => { closeModal(); setTimeout(() => nextSeason(true), 0); } }] });
    return false;
  }
  SFX.tap();
  const S = L.seasonEnd(st);
  // 季末 3 个月里出来的、不在 S.big 里的阻塞内容：三宗争徒（线 B 改到第二章开章链末尾之后这一行可删）
  if (S.outs.some(o => o.invite) && !st.sect) L.blockPush(st, { kind: 'big', id: 'invite', data: { k: 'invite' }, lv: 7 });
  // 主线保底（mainline.js 的 out.mainFoe / mainEase / mainHint）：排在季末卡和大事之后
  for (const k of ['mainFoe', 'mainEase', 'mainHint']) { const o = S.outs.find(x => x[k]); if (o) { blkStash[k] = o[k]; L.blockPush(st, { kind: 'big', id: k, data: { k }, lv: 7 }); } }
  seasonFx(S);
  settle('season');
  saveLocal();
  return true;
}
// 季末的飘字与非阻塞的提示（原 onTick 那一长串，改成读 S 一次性播；飘字最多 3 条，其余只进季末卡）
function seasonFx(S) {
  if (!S) return;
  let nf = 0;
  const fl = (x, y, t, c) => { if (nf++ < 3) floatText(x, y, t, c, false, true); };
  const xp = S.xp.flow + S.xp.sit + S.xp.pre;
  if (xp > 0 && st.p.r <= L.MAXR) fl(HOMEPOS.x + 14, HOMEPOS.y - D().sit.h + 2, '+' + fmt(xp), '#8ff5d0');
  if (S.stones > 0) fl(30, 108, '+' + fmt(S.stones), '#ffe39a');
  for (const out of S.outs) { fieldTickFx(out); homeTickFx(out); if (out.mjOpen) realmOpenFx(out.mjOpen); }
  const o = S.out;
  // 访客不弹窗：门口出现一个“！”，点它才见（DESIGN D4）；同时进纸鹤
  if (S.visitor && st.visitor) { L.mailPush(st, { k: 'visitor', ic: 'mail', t: '有人来访', left: st.visitor.left, data: { id: st.visitor.id } }); SFX.reveal(1); }
  if (o.world && L.WORLD[o.world]) { const W = L.WORLD[o.world]; L.mailPush(st, { k: 'world', t: '天下大势 · ' + W.n, left: W.len }); worldTip(o.world); }
  if (o.auction) L.mailPush(st, { k: 'auction', t: '拍卖会开槌', left: L.AUCTION.len });
  if (o.rookieNew) L.mailPush(st, { k: 'rookie', t: '新秀出世 · ' + o.rookieNew.n });
  // 老祖特训：约战前 3 季内可用，进纸鹤，玩家点开才见（GO_K.train）
  if (o.train) { L.mailPush(st, { k: 'say', ic: 'quest', t: '老祖要给你特训', left: 9, go: 'train' }); }
  if (o.lifeRed) sayLine(`寿元只够 ${Math.max(1, Math.round(o.lifeRed.m / 12))} 年了`, 'red');
  if (st.guide && st.guide.done && UI.isOpen('arts')) artRecTip();
  if (st.guide && st.guide.done && UI.isOpen('plus')) gearPlusTip();
  if (st.guide && st.guide.done) guideTick();   // 卡住检测与补齐的老祖气泡（guide-ask.js）
}

// ---------- 主界面的行动点一行（AP_PLAN §6.1） ----------
const BIG_BTN = { pact: '赴约 ▸', tour: '论道 ▸', war: '迎战 ▸', meet: '会武 ▸' };
let apKey = '';
function renderApRow() {
  const row = $('#apRow'); if (!row || !st) return;
  const left = L.apLeft(st), per = L.AP.per, debt = (st.ap && st.ap.debt) || 0, big = L.bigNext ? L.bigNext(st) : null;
  const bigNow = !!big && big.left <= L.SEASON_LEN, ready = L.isReady(st) && st.p.r <= L.MAXR, busy = busyUI();
  const t = st.p.r > L.MAXR ? '大道已成' : bigNow ? BIG_BTN[big.k] || '下一季 ▸' : '下一季 ▸';
  const sub = st.p.r > L.MAXR ? '' : left > 0 ? `剩 ${left} 点 → 打坐 +${fmt(L.sitGain(st, left))}` : bigNow ? `${big.n} · 本季末` : '点已用完';
  const k = [left, debt, t, sub, ready, busy, bigNow].join('|');
  if (k === apKey) return;
  apKey = k;
  const pips = $('#apPips');
  pips.innerHTML = Array.from({ length: per }, (_, i) => `<i class="${i < left ? '' : 'off'}">${i < left ? '◆' : '◇'}</i>`).join('');
  pips.dataset.ap = left;
  pips.setAttribute('aria-label', `行动点 还有 ${left} / ${per}`);
  const b = $('#btnNext');
  $('#nextT').textContent = t; $('#nextS').textContent = sub;
  b.classList.toggle('done', left <= 0 && !busy && st.p.r <= L.MAXR);
  b.classList.toggle('big', bigNow);
  b.disabled = busy || st.p.r > L.MAXR;
  const bt = $('#btnBt'); bt.hidden = !ready; if (ready) bt.textContent = st.p.r >= 1 ? '渡劫' : '突破';
}
// 突破 / 渡劫的入口：演出、对决、过场、链没出完时不开（AP_PLAN 验收：首领战里点修为条渡劫会卡死画面）
const canBreak = () => !!st && !cine && !duelFx && !st.exp && !st.run && !(typeof btv !== 'undefined' && btv) && !(typeof tk !== 'undefined' && tk) && !(typeof cn !== 'undefined' && cn) && !chainOn;
$('#btnNext').addEventListener('click', () => { if (!st) return; ac(); nextSeason(); updateHUD(); });
$('#btnBt').addEventListener('click', () => { if (!st || !canBreak()) return; ac(); SFX.tap(); showBreakthrough(); });

// 年报（线 2 的 UI.showYear 没接上时的最小版）
function showYearBasic() {
  const r = L.yearReport(st); if (!r) return;
  const row = (k, a, b) => `<dt>${k}</dt><dd class="num">${a} → <b>${b}</b></dd>`;
  sheet({ title: `第 ${r.y} 年`, center: true, noClose: true,
    body: `${yearTop()}<dl class="grid2">${row('境界', esc(r.realm[0]), esc(r.realm[1]))}${row('战力', fmt(r.pw[0]), fmt(r.pw[1]))}${row('修炼/月', fmt(r.gain[0]), fmt(r.gain[1]))}${r.rank ? row('天骄榜', r.rank[0], r.rank[1]) : ''}<dt>灵石</dt><dd class="num">赚 ${fmt(r.earn)} · 花 ${fmt(r.spend)}</dd><dt>历练</dt><dd class="num">${r.exp} 趟${r.bestT ? ' · 最好 ' + r.bestT : ''}</dd></dl>
      ${r.next.big ? `<div class="muted">明年：${esc(r.next.big.n)} 还有 ${seasons(r.next.big.left)} 季</div>` : ''}<div class="quote">${esc(r.say)}</div>`,
    foot: [{ t: '新的一年 ▸', gold: true, fn: () => { L.yearClose(st); closeModal(); } }] });
}
