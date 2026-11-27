/* 废柴仙途 · 界面片段 guide-ask：老祖头像（点开 = 变强页）、卡住检测气泡（§4.3 S 系列）、补齐的讲解与气泡（U02 U04 U09 U14 U17）、章末结算的排队
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide 与各系统的讲解之后：这里还给已有讲解改分类）。
 * 场景右下角一个老祖头像（#guideAv）：变强建议的第一张牌换成新的一条、还没看过时头上冒“！”（L.adviseNew）；点它 = showGrowth('goal')（docs/KAIRO_PLAN.md §10.5）。
 * 原来的“问老祖”面板（showAsk / askList）删掉了：变强的候选都进了 L.advise，不是变强的（访客、交任务、拍卖、行情……）走纸鹤和入口角标；老祖说过的话在纸鹤里。 */
// ---------- 老祖头像（场景右下角，44×44） ----------
function syncElderAv() {
  const wrap = $('#sceneWrap'); if (!wrap || !st) return;
  let b = $('#guideAv');
  if (!b) {
    b = document.createElement('button'); b.id = 'guideAv'; b.className = 'guide-av'; b.setAttribute('aria-label', '变强');
    b.innerHTML = `<img class="px" src="${ELDER}" alt=""><span class="guide-dot">！</span>`;
    b.onclick = e => { e.stopPropagation(); if (!st || cine) return; ac(); SFX.tap(); showGrowth('goal'); };
    wrap.appendChild(b);
  }
  const hide = !!st.run || !!duelFx || !!cine || !st.guide || !st.guide.done;
  if (b.hidden !== hide) b.hidden = hide;
  const dot = !bubbleCur && !modalOpen() && L.adviseNew(st);
  if (b.classList.contains('new') !== dot) b.classList.toggle('new', dot);
  const gone = !!(st.eflags && st.eflags.st_farewell);
  if (b.classList.contains('gone') !== gone) b.classList.toggle('gone', gone);
}

// ---------- 卡住检测与补齐的气泡（每月，boot.js 的 onTick 调） ----------
// 这些都是气泡，不暂停；同一条有自己的冷却（写进 key 里：同一窗口只冒一次），再统一受气泡调度的 3 月间隔
let idleRun = 0, readyRun = 0, stoneRun = 0, lastStones = 0, lastFails = 0;
function guideTick() {
  chapSnap();
  if (!st || !st.guide || !st.guide.done || st.p.r > L.MAXR) return;
  const p = st.p, busy = L.busy(st), t = st.tick;
  // S05：修为圆满、人在洞府、6 月没突破（6 月一次）
  readyRun = L.isReady(st) ? readyRun + 1 : 0;
  if (readyRun >= 6 && readyRun % 6 === 0) { const a = L.adviseFind(st, x => x.id === 'bt'); if (a) tip('s05_' + t, `还等什么？${a.say}：成功率 ${a.gain.text}。点金色的修为条。`, { big: true }); }
  // S07：不在历练、不在闭关、没圆满，连着 3 月（6 月一次）
  idleRun = !busy && !L.isFull(st) && !st.visitor ? idleRun + 1 : 0;
  if (idleRun === 3 || (idleRun > 3 && idleRun % 6 === 3)) {
    const a = L.advise(st, 'goal').acts[0];   // 气泡、目标卡、变强页说的是同一件事（act.say）
    if (a) tip('s07_' + Math.floor(t / 6), a.id === 'idle' ? `闲着也是闲着，${a.say}。` : `闲着也是闲着：${a.say}，${a.gain.text}${a.gain.sub && !/早/.test(a.gain.sub) ? ' ' + a.gain.sub : ''}。`);
  }
  // S04：灵石 ≥ 最便宜升级价的 3 倍，且 6 月没花过（12 月一次）；推荐哪一项 = 变强建议里升级那一类的第一条
  const ups = L.HOME.filter(h => L.homeOpen(st, h.k) && st.home[h.k] < h.max).map(h => L.hCost(h.k, st.home[h.k]));
  stoneRun = st.stones >= lastStones - 1 ? stoneRun + 1 : 0; lastStones = st.stones;
  if (ups.length && st.stones >= Math.min(...ups) * 3 && stoneRun >= 6 && !busy) {
    const a = L.adviseFind(st, x => x.cls === 'up' && !x.gap);
    if (a) tip('s04_' + Math.floor(t / 24), `攒着 ${fmt(st.stones)} 灵石做什么？${a.say}：${a.gain.text}${a.gain.sub && !/早/.test(a.gain.sub) ? ' ' + a.gain.sub : ''}。`);
  }
  // S08：大事前 3 月胜算 < 30%（每届一次）
  const nb = L.nextBig(st);
  if (nb.left === 3 && nb.k === 'pact' && nb.info.p < 0.3) { const a = L.advise(st, 'goal').acts.find(x => x.id !== 'idle' && !x.gap); tip('s08_pact', `这回硬碰不过：胜算 ${L.pct(nb.info.p)}。${a ? `${a.say}，${a.gain.text}，来得及。` : '先保住性命要紧。'}`, { big: true }); }
  // S10：访客还剩 1 月就走
  if (st.visitor && st.visitor.left === 1 && !st.retreat) tip('s10_' + t, '门口那位要走了。点画面里的“！”。', { big: true });
  // S06：突破连败 2 次
  const fails = (st.stats && st.stats.btFails) || 0;
  if (fails >= lastFails + 2 || (fails >= 2 && lastFails === 0 && !st.seenTips.s06)) { lastFails = fails; tip('s06' + (st.seenTips.s06 ? '_' + t : ''), `别硬冲。破境丹每枚 +${L.pct(L.BT.pill)}（你有 ${st.pills} 枚）；灵草够的话自己炼更便宜。`); st.seenTips.s06 = 1; }
  // U02 / 寻宝：行事解锁（第二趟、第四趟出发前）
  if (!st.rebirth && L.apprOpen(st, 2)) tip('u02', '行事多了一样【采药】：灵草 ×3，灵石少些。');
  if (!st.rebirth && L.apprOpen(st, 1)) tip('u02b', `行事又多一样【寻宝】：法宝、功法掉率 ×2，打斗少。`);
  // U04：筑基后灵兽蛋上架
  if (p.r >= 1 && L.marketOpen(st, 'egg') && !L.petCount(st)) tip('u04', `灵兽蛋上架了，${fmt(L.price(st, 'egg'))} 灵石一枚。灵宠最低也让战力 ×${L.PETS[1].m}。【坊市】。`);
  // U14：金丹后能连续历练
  if (L.sweepOpen && L.sweepOpen(st) && !st.rebirth) tip('u14s', '扫荡开了：拿过甲、战力到推荐 ×1.8 的格子，出发页点【扫荡 ◆1】，不播战斗直接结算。');
  // U17：成为宗主
  if (st.sect && st.sect.rank >= 6) tip('u17', `现在这座山是你的了。【宗门】里多了建设，灵石有去处了；九宗会武改成三人战，带两个徒弟上。`, { big: true });
  // S11：第一次拿到丁等（历练结算之后）
  if ((st.stats.dings || 0) >= 1) tip('s11', '栽了吧。出发页那行“预计评价”写着丙～丁就别去，退一格稳拿乙。');
}

// ---------- 补齐的阻塞讲解：九宗会武前 6 月（U09）；第一次三人会武前（宗主） ----------
registerGuide([
  { id: 'meetSoon', intro: true, urgent: true, target: BIG, btn: '好', when: () => !!st.sect && L.sectOf(st) && !st.sect.meets && !modalOpen() && !L.busy(st) && L.nextMeet(st) <= 6 && L.nextMeet(st) > 0, text: () => {
      const pos = L.sectPos(st), q = pos === 1 ? 2 : pos - 1, N = L.nineAt(st, q) || {}, Q = L.ninePower(st, q), fo = { kind: 'sect', id: N.id }, S = L.duelPower(st, fo);
      return `<b>九宗会武</b>还有 <b>${seasons(L.nextMeet(st))}</b> 季。你代表${esc(L.sectOf(st).n)}出战，本宗天下第 <b>${pos}</b>，上一位${esc(N.n || '')}的代表${esc(N.champ || '')}战力约 <b>${fmt(Q)}</b>，你 <b>${fmt(S)}</b>，胜算 <b>${L.pct(L.duelP(st, S, Q, fo))}</b>。赢一场宗门升一位，俸禄跟着涨。`;
    } },
]);
// 分类：新手头一章的固定讲解（DESIGN §4.2 E10～E14、U03、U05、U07）只隔 1 个月
for (const id of ['field', 'retreat', 'retBtn', 'visitor', 'depth', 'sect', 'tourSoon', 'alch']) { const h = HINTS.find(x => x.id === id); if (h) h.core = true; }
// 分类：DESIGN 写成气泡的，从阻塞讲解改成气泡（不暂停、不占讲解名额）
for (const id of ['market', 'furnace', 'me', 'heal', 'depth']) { const h = HINTS.find(x => x.id === id); if (h) h.bubble = true; }
{ const h = HINTS.find(x => x.id === 'boss'); if (h) { h.bubble = true; h.bigBubble = true; } }
// 每段阻塞讲解都高亮一个要点的按钮：秘境第三句指“带着收获离开”（没有就指门）
{ const h = HINTS.find(x => x.id === 'realm3'); if (h && !h.target) Object.defineProperty(h, 'target', { get: () => (document.querySelector('#realmLeave') ? '#realmLeave' : '#realmDoors'), configurable: true }); }
// 札记的【前往】：图鉴（化神“图鉴 30%”、炼虚“走完一条奇遇链”）
GO.codex = () => showCodex();

// ---------- 章末结算卡（DESIGN §2.2 / §5.3“章末结算”）：本章主线完成时，等弹窗、讲解都空下来再弹 ----------
// 每章开头的快照记在 st.flags.chapAt[ch]（月、历练趟数、天骄榜、战力），只给这张卡用；旧档没有的按开局算
const chapPend = [];
function chapSnap() {
  if (!st || !st.flags) return;
  const at = st.flags.chapAt || (st.flags.chapAt = {}), ch = Math.min(8, st.p.r);
  if (!at[ch]) at[ch] = { t: st.tick, exp: st.stats.exp || 0, rank: st.rank, pw: Math.round(L.power(st)) };
}
// 排队等结算链出：已经是更早章节的“未了之事”就不弹了，只留老祖一句气泡
function chapterDone(ch) { if (L.blockRun) return; if (ch < L.chapterNow(st) - 1) { chapterTip(ch); return; } if (!chapPend.some(x => x.ch === ch)) chapPend.push({ ch, t: st.tick }); }   // 线 B：章末卡是结算链的 'chapter' 块
// 章末卡由结算链出（settle.js 的 chainPump：这一章的高潮 / 收尾戏之后、下一章的戏之前），不看真实时间；这里只留个名字给旧的包装
function chapPump() { /* 结算链接管 */ }
// 章末结算卡 showChapterCard：panel-path.js（开罗式重整 §2.3）
