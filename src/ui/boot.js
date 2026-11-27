/* 废柴仙途 · 界面片段 boot：主循环、输入、启动
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
/* 时间不再自己走（docs/AP_PLAN.md §6.3）：原来每月的 onTick 拆成 settle.js 的 nextSeason（点【下一季】）→ seasonFx(S) → settle()。 */
// E17 老祖特训：约战前 3 季内、胜算 < 60%、未筑基未圆满，第一世只此一次；花 2 点，当场得修为（AP_PLAN §2.2）
function showTrain() {
  if (!L.canTrain(st)) return;
  const pi = L.pactInfo(st), ab = apBtn('train');
  sheet({ title: '老祖特训', center: true, noClose: true,
    body: `<div class="speaker">${elderImg(56, 'ang')}<p class="grow" style="margin:0">来不及了。还剩 <b>${seasons(pi.left)}</b> 季，胜算才 <b>${L.pct(pi.p)}</b>。坐下，本座亲自给你<b>特训</b>：修炼 <b>×3</b>，不收灵石。</p></div>${ab.why ? `<p class="center seal">${esc(ab.why)}</p>` : ''}`,
    foot: [{ t: '不用', alt: true, fn: closeModal }, { t: '接受特训' + ab.tag, gold: !ab.why, disabled: !!ab.why, fn: () => { closeModal(); if (doAct('train')) banner('老祖特训', '修炼 ×3'); } }] });
}
function showVisitor() {
  const ev = L.visitorEvent(st);
  if (!ev) { st.visitor = null; return; }
  showChoice(ev);
}

// ---------- 主循环 ----------
// 主循环只画画面、驱动战斗演出（btDrive）、刷 HUD、在没有阻塞层时接着出结算链；不推进时间（AP_PLAN §6.3）
let last = performance.now(), cloudAcc = 0;
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  const live = st && $('#modal').hidden && !cine && $('#intro').hidden && st.p.r < 9 && !st.run;
  if (live && (st.exp || (btv && btv.mode === 'boss'))) {
    if (!btDrive(dt * btSpeed) && st.exp) { L.tripAuto(st); tripFinish(); }   // 没有节点表的旧式历练：一口气结掉
  } else if (live) {
    chainPump();   // 结算链：上一张关掉了就接着出下一张（settle.js）
    craneTimer -= dt;   // 仙鹤照旧按真实时间飞（纯装饰，AP_PLAN §6.2）
    if (craneTimer <= 0 && !crane && !st.exp) { crane = { x: -12, y: 14 + Math.random() * 22, v: 0.02 }; craneTimer = 70000 + Math.random() * 60000; }
  }
  if (crane) { crane.x += crane.v * dt; if (crane.x > W + 14) crane = null; }
  drawScene(dt);
  if (st) updateGuide();
  hudTimer += dt;
  if (hudTimer > 200) { hudTimer = 0; updateHUD(); }
  cloudAcc += dt;
  if (cloudAcc > 60000) { cloudAcc = 0; saveCloud(); }
  requestAnimationFrame(frame);
}
function sceneClick(e) {
  if (!st || cine) return;
  ac();
  if (duelFx) { duelSkip(); return; }   // 对决演出中：点画面跳过
  const r = cvs.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H - OY;
  if (crane && Math.abs(x - crane.x + 3) < 14 && Math.abs(y - crane.y) < 8) {
    if (Math.random() < 0.3) { st.pills++; floatText(crane.x, crane.y, '仙鹤衔丹 破境丹+1', '#ffe39a'); }
    else { const v = Math.floor(L.income(st) * 15 + 60); st.stones += v; floatText(crane.x, crane.y, '仙鹤献瑞 灵石+' + fmt(v), '#ffe39a'); }
    for (let k = 0; k < 24; k++) { const a = Math.random() * 6.28; parts.push({ x: crane.x, y: crane.y, vx: Math.cos(a) * 0.04, vy: Math.sin(a) * 0.04, life: 700, max: 700, c: '#ffe39a', s: 1 }); }
    SFX.coin(); crane = null; return;
  }
  if (st.run) return;   // 秘境：门卡是场景上的按钮（panel-realm.js）
  if (btv && btv.mode === 'boss') { btTapHold(); return; }
  if (st.exp && btv) { if (btTapHold()) return; if (btv.ph !== 'walk') return; }   // 战斗中点画面：只放过停顿那一下（battle.js）
  if (st.exp) return;   // 一趟当场打完，途中不弹面板
  if (st.visitor && !st.retreat && Math.abs(x - VISIT_POS.x) < 16 && y > VISIT_POS.y - 58 && y < VISIT_POS.y + 6) { SFX.tap(); showVisitor(); return; }
  if (petSceneHit(x, y)) return;
  if (fieldSceneHit(x, y)) return;
  if (homeSceneHit(x, y)) return;   // 场景里的建筑（panel-home.js）
  const S = D().sit;
  // 点主角：圆满了就突破，否则打开【变强】页（吐纳已删，AP_PLAN §3.1）
  if (Math.abs(x - HOMEPOS.x) < S.w / 2 + 6 && y > HOMEPOS.y - S.h - 16 && y < HOMEPOS.y + 6) {
    if (busyUI()) return;
    SFX.tap();
    if (L.isReady(st) && canBreak()) showBreakthrough(); else showGrowth('cul');
    return;
  }
  if (y > 30 && y < 104 && x > 50 && x < 150) { SFX.tap(); showHome(); }
}
cvs.addEventListener('click', sceneClick);
// 修为条：圆满了点它突破 / 渡劫。演出、对决、过场、链没出完时不开（首领战里点它渡劫会把画面卡死：天劫过场画不出来、点什么都没反应）
$('#cult').addEventListener('click', () => { if (!st || !canBreak()) return; ac(); SFX.tap(); if (L.isReady(st)) showBreakthrough(); else showGrowth('cul'); });
// 底栏固定五格（docs/KAIRO_PLAN.md §4.1）：历练 / 洞府 / 装备 / 江湖 / 仙途；没开的那一格只在传讯行说一句条件（goalcard.js 的 navClick）
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-nav]'); if (!b || !st || cine || chainOn) return;   // 结算链没出完：底栏不让点（AP_PLAN §4.2）
  ac(); SFX.nav();
  navClick(b.dataset.nav);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveLocal(); saveCloud(); } });
window.addEventListener('pagehide', saveLocal);
window.addEventListener('resize', () => { setFontSize(); fitScene(); });

// ---------- 启动 ----------
function start(data) {
  loadPref();
  setSoundIcon();
  const saved = (data && saveOk(data.st)) ? data.st : loadLocal();
  if (saveOk(saved) && loadState(saved)) $('#intro').hidden = true;
  else showIntro();
  updateHUD();
  fitScene();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  initCloud();
}
Object.assign(window.__xm_realm = {}, { showRealm, realmEnterUI, realmPickUI, realmLeaveUI, showRealmChest, showRealmShop, syncRealmUI, realmLowTip, get mjFx() { return mjFx; } });
try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => ({ st })); } catch (e) { /* ignore */ }
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
window.__xm = { get st() { return st; }, L, ART, get hints() { return HINTS; }, showDutyPick, showDiscTeach, nextSeason, settle, doAct, chainPump, get chainOn() { return chainOn; }, get busyUI() { return busyUI(); }, showBreakthrough, closeModal, showEvent, showInvite, runTournament, runPact, runWar, doPromote, showDeath, rebirthPick, showChoice, chalPrep, chalRun, runMainFoe, showMainHint, showMainEase, showRivalCard, showRookieCard, runRookie, tourPrep, showAlchemy, fightBossUI, showMe, runSectMeet, showGrowth,
  showExp, confirmExp, showExpResult, showHome, showMarket, showSect, showQuests, showPact, showTrain, showVisitor, loadState, showGear, showForge, revealItem, doPlus, showPets, showPetJobs, showPetEvo, showCalendar, showBig, worldLine, showDao, showTribPrep, showTribStory, showTribPause, startTribCine, runAct, registerGuide, get bubbleLog() { return bubbleLog; }, get duelFx() { return duelFx; }, duelSkip, showChapterCard, get guideCur() { const c = guideCurShown; return c && { id: c.id, target: c.target || '', btn: c.btn || '' }; }, tribOpts, showField, brewUI, showZhen, get cineState() { return cine; }, get cine() { return !!cine; }, get guideHold() { return guideHold; },
  UI, notify, openMail, showPrep, showYearBasic, showSeasonCard, watch: null,
  get guideDbg() { return { active: activeHint && activeHint.id, temp: !!tempHint, hintCool, bubbleQ: bubbleQ.map(b => b.key), bubble: bubbleCur && bubbleCur.key, step: st && st.guide && st.guide.step, cand: HINTS.filter(h => st && !st.hintSeen[h.id] && h.when()).map(h => h.id) }; } };
Object.assign(window.__xm, { showArts, showBag, showPetAwake });
Object.assign(window.__xm, { showGearDetail, showEquip, showWorld, showPath, showInbox, showUnlock, showYearReport, showChapterCard, showRecord, showSettings, navClick, goTo, hlOnly, say, get sayLog() { return sayLog; }, get unlockQ() { return unlockQ; }, get navCur() { return navCur; } });   // 开罗式重整（测试与截图用）   // 面板重做 A 线：功法页、包裹、觉醒卡（测试与截图用）
Object.assign(window.__xm, { pushPopup, fitScene, updateHUD });   // 换窗抖动检查（tools/jitter_check.js）用
// 旧测试脚本的钩子（tools/content_test.js 还在调）：没有速度档了，setSpeed 什么都不做；onTick = 过一季（跳过链没出完的检查，结算链照常出）
Object.assign(window.__xm, { setSpeed: () => {}, pauseIdx: 0, onTick: () => { if (st && !st.exp && st.p.r <= L.MAXR) { chainOn = false; queue.length = 0; nextSeason(true); } } });
Object.assign(window.__xm, { showSaves, showSlot, saveLocal, get slots() { return SLOTS; }, get queueLen() { return queue.length; } });   // 存档页（saves.js；tools/save_check.js 用）
