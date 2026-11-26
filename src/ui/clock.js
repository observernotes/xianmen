/* 废柴仙途 · 界面片段 clock：时间流逝的界面一半（docs/KAIRO_PLAN.md §3；逻辑在 src/logic/time.js）
 * notify(kind, mail, fn)：能放行就立刻 fn()，否则把 mail 投进纸鹤（st.inbox）。规则就是逻辑层的 L.notifyGate（tools/onboard.js 的手表机器人用同一个）：
 *   在外（历练 / 闭关）一律进纸鹤；打坐时“主动打断”（kind 'active'：解锁卡、事件抉择、老祖一句、气泡）两次之间至少隔 L.TIME.interruptGapMonths 月；
 *   传讯行（kind 'tick'）在洞府随时出、不算打断；kind 'block'（结算、对决、年报、章末……阻塞清单里的）永远放行。
 * 自动停：修为圆满（每一层第一次）、大节点前 1 月的备战卡、寿元第一次变红——时间停在这个月初，直到玩家处理（点突破、点【就这样上】）或点速度键【继续】。
 *   历练 / 闭关结算、年报、章末都是弹窗，弹窗开着时间本来就停。
 * 解锁卡的真实时间间隔：L.onbHold（两张系统解锁卡之间 ≥ L.TIME.unlockGapSec 秒）。暂停着、由测试脚本一格一格推时间时不算
 *   （手表机器人用 window.__xm.watch = () => 手表秒数 接管）。
 * 在外零打断的兜底：横幅进纸鹤；老祖气泡、讲解、章末卡、剧情事件留在队里，等回到洞府（剧情事件也守“一季一次”）。
 * 线 2 的界面接这里：UI.say(text)（传讯行）、UI.showYear()（年报）、UI.go(go, hl)（目标卡的【去】）、UI.showInbox()（纸鹤列表，点【看】调 openMail(item)）。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 onboard 之后、boot 之前）。 */
const awayUI = () => !!(st && (st.exp || st.retreat));
function notify(kind, mail, fn) {
  if (!st) return false;
  const g = L.notifyGate(st, kind);
  if (g === 'now') { if (kind === 'active') L.markInterrupt(st); if (fn) fn(); return true; }
  if (mail) L.mailPush(st, mail);
  return false;
}
const canInterrupt = () => !!st && L.canInterrupt(st);
const markInterrupt = () => { if (st) L.markInterrupt(st); };
// 传讯行：线 2 的 UI.say；没有时退回场景横幅。在外进纸鹤
function say(text, mail) {
  return notify('tick', Object.assign({ k: 'misc', t: String(text).slice(0, 14) }, mail || {}), () => { if (UI.say) UI.say(text); else bannerRaw(text, ''); });
}
// ---------- 自动停 ----------
let clockStop = null;   // { k: 'ready' | 'prep' | 'life', t }
function autoStop() {
  if (!st) return null;
  if (clockStop && clockStop.k === 'ready' && !L.isReady(st)) clockStop = null;
  return clockStop ? clockStop.k : null;
}
function setStop(k) { if (st) { clockStop = { k, t: st.tick }; updateHUD(); } }
function resumeClock() { clockStop = null; if (st && st.clk) st.clk.prepSeen = st.tick; }
// ---------- 纸鹤：点【看】 ----------
const MAIL_GO = { visitor: () => showVisitor(), auction: () => showMarket(), world: () => showCalendar(), season: () => showCalendar(), rookie: () => showRivals ? showRivals() : showMe() };
function openMail(item) {
  if (!st || !item) return;
  L.mailTake(st, item.id);
  if (item.k === 'event' && item.data && item.data.id) { const ev = L.eventById(item.data.id); if (ev) { showChoice(ev); return; } }
  if (item.go && UI.go) { UI.go(item.go, item.data && item.data.hl); return; }
  const f = MAIL_GO[item.k]; if (f) { try { f(); } catch (e) { /* 面板不在就算了 */ } }
}
// ---------- 每月：预告、备战、年报、空转、寿元、圆满 ----------
let readyAck = -1, yearQ = false;
function clockTick(out) {
  if (!st || st.p.r > L.MAXR) return;
  for (const w of out.warns || []) { say(`${w.n} 还有 ${w.left} ${UNIT}${w.p !== undefined ? ' · 胜算 ' + L.pct(w.p) : ''}`, { k: 'big', t: `${w.n} 还有 ${w.left} ${UNIT}`, left: w.left }); if (UI.flashGoal) UI.flashGoal(); }
  if (out.prep) { const info = out.prep; setStop('prep'); pushPopup(() => showPrep(info)); }
  // 年报：打坐态才出；在外就等归来（归来结算排在前面）
  if (L.yearDue(st) && !yearQ) { yearQ = true; pushPopup(() => { yearQ = false; if (awayUI()) { processQueue(); return; } if (st.rep && st.rep.ready) (UI.showYear || showYearBasic)(); }); }   // 排着的时候人又出门了：等下次回来
  if (out.idle) { say(`闲了 ${out.idle} ${UNIT}，去历练`); if (UI.nudge) UI.nudge('exp'); }
  if (out.lifeRed) { setStop('life'); say(`寿元只够 ${out.lifeRed.m} ${UNIT}了`); }
  const si = L.si(st.p);
  processQueue();   // 排着的剧情事件：到了“一季一次”的空档就放
  if (L.isReady(st) && readyAck !== si && !(st.guide && !st.guide.done)) { readyAck = si; setStop('ready'); say(st.p.r >= 1 ? '修为圆满，可以渡劫了' : '修为圆满，可以突破了'); }
}
// ---------- 解锁卡的真实时间间隔 ----------
let lastCardSec = -1e9;
const watchSec = () => (window.__xm && typeof window.__xm.watch === 'function' ? window.__xm.watch() : performance.now() / 1000);
L.onbHold = (s, e) => {
  if (s !== st || !e || !e.sys) return false;
  if (!(window.__xm && window.__xm.watch) && !SPEEDS[speedIdx]) return false;   // 暂停着手动推时间（测试）不卡
  return watchSec() - lastCardSec < L.TIME.unlockGapSec;
};
function clockHook(type, k) { if (type === 'unlock' && st && !st.rebirth) { const e = L.ONB_K[k]; if (e && e.sys && k !== 'exp' && k !== 'bt') lastCardSec = watchSec(); } }
// 目标卡的锦囊：三年之约前胜算不够时，“下一步”取 pactTips() 的第一条
L.GOAL_TIP = (s, big) => {
  if (s !== st || !big || big.k !== 'pact' || typeof pactTips !== 'function') return null;
  try { const t = pactTips()[0]; return t ? { t: t.t, go: String(t.go || 'exp').split(':')[0], hl: null, tip: t } : null; } catch (e) { return null; }
};
// ---------- 在外零打断的兜底（包已有的几个调度函数；线 2 改掉了哪个就跳过哪个） ----------
const bannerRaw = banner;
banner = function (text, sub, color, lock) { if (awayUI()) { if (st) L.mailPush(st, { k: 'misc', t: String(text).slice(0, 14) }); return; } bannerRaw(text, sub, color, lock); };
if (typeof pumpBubble === 'function') { const pb0 = pumpBubble; pumpBubble = function () { if (awayUI()) { if (bubbleCur) { $('#tip').hidden = true; bubbleCur = null; } return; } pb0(); }; }   // 出门那一刻把正冒着的气泡收进头像
if (typeof currentGuide === 'function') { const cg0 = currentGuide; currentGuide = function () { if (awayUI() && st.guide && st.guide.done) return null; return cg0(); }; }
if (typeof chapPump === 'function') { const cp0 = chapPump; chapPump = function () { if (awayUI()) return; cp0(); }; }
// 剧情事件（st.storyQ）：在外不弹；打坐时守“一季一次”
{ const pq0 = processQueue; processQueue = function () {
  if (!queue.length && st && st.storyQ && st.storyQ.length && (!$('#modal').hidden || cine || !$('#intro').hidden || awayUI() || !L.canInterrupt(st))) return;
  if (!queue.length && st && st.storyQ && st.storyQ.length) L.markInterrupt(st);
  pq0();
}; }
{ const bt0 = showBreakthrough; showBreakthrough = function () { if (clockStop && clockStop.k === 'ready') clockStop = null; return bt0.apply(this, arguments); }; }
// 速度键：自动停着时点它 = 继续（不换档）；图标显示暂停
{ const ss0 = setSpeedIcon; setSpeedIcon = function () {
  const b = $('#btnSpeed');
  if (autoStop()) { if (speedKey !== 'stop') { speedKey = 'stop'; const ic = artIcon('pause', 20); if (ic) b.innerHTML = ic; else b.textContent = '继续'; b.classList.add('on'); } b.title = '时间停着：点这里继续'; b.setAttribute('aria-label', '时间停着，点击继续'); return; }
  if (speedKey === 'stop') speedKey = '';
  ss0();
}; }
{ const oh0 = onHook; onHook = function (type, data) { clockHook(type, data); return oh0(type, data); }; }
// 年报（线 2 的 UI.showYear 没接上时的最小版）
function showYearBasic() {
  const r = L.yearReport(st); if (!r) return;
  const row = (k, a, b) => `<dt>${k}</dt><dd class="num">${a} → <b>${b}</b></dd>`;
  sheet({ title: `第 ${r.y} 年`, center: true, noClose: true,
    body: `<dl class="grid2">${row('境界', esc(r.realm[0]), esc(r.realm[1]))}${row('战力', fmt(r.pw[0]), fmt(r.pw[1]))}${row('修炼/' + UNIT, fmt(r.gain[0]), fmt(r.gain[1]))}${r.rank ? row('天骄榜', r.rank[0], r.rank[1]) : ''}<dt>灵石</dt><dd class="num">赚 ${fmt(r.earn)} · 花 ${fmt(r.spend)}</dd><dt>历练</dt><dd class="num">${r.exp} 趟${r.bestT ? ' · 最好 ' + r.bestT : ''}</dd></dl>
      ${r.next.big ? `<div class="muted">明年：${esc(r.next.big.n)} 还有 ${r.next.big.left} ${UNIT}</div>` : ''}<div class="quote">${esc(r.say)}</div>`,
    foot: [{ t: '新的一年 ▸', gold: true, fn: () => { L.yearClose(st); closeModal(); } }] });
}
