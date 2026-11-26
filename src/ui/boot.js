/* 废柴仙途 · 界面片段 boot：每月、主循环、输入、启动
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 每月 ----------
let monthAcc = 0;
function onTick() {
  const out = L.tick(st, true);
  if (!st.exp && !cine && $('#modal').hidden) {
    const g = L.gain(st), inc = L.income(st);
    if (st.p.r <= L.MAXR && !L.isReady(st)) floatText(HOMEPOS.x + 14, HOMEPOS.y - D().sit.h + 2, '+' + fmt(g), '#8ff5d0', false, true);
    floatText(30, 108, '+' + fmt(inc), '#ffe39a', false, true);
  }
  fieldTickFx(out);   // 收成、续炼飘字（panel-field.js）
  homeTickFx(out);    // 阵法布成、灵泉养伤、拆建教学、洞府的老祖气泡（panel-home.js）
  if (out.exp) { const r = out.exp; pushPopup(() => showExpResult(r)); }
  // 途中遭遇是要你做决定的，阻塞；引导期间（前两趟）逻辑层本来就不出
  if (out.choice && !(st.guide && !st.guide.done)) { const ce = out.choice; pushPopup(() => showChoice(ce)); }
  // 访客不弹窗：门口出现一个“！”，点它才见（DESIGN D4）；同时进纸鹤，等待期从你回到洞府起算（docs/KAIRO_PLAN.md §3.3）
  if (out.visitor && st.visitor) { L.mailPush(st, { k: 'visitor', ic: 'mail', t: '有人来访', left: st.visitor.left, data: { id: st.visitor.id } }); notify('tick', null, () => { SFX.reveal(1); floatText(VISIT_POS.x, VISIT_POS.y - 22, '有人来访', '#ffe39a'); }); }
  if (out.visitorGone) notify('tick', null, () => floatText(VISIT_POS.x, VISIT_POS.y - 22, '访客走了', '#9d93b8'));
  if (out.retreat) {
    const r = out.retreat;
    if (r.kind === 'teach') floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, '指点完毕 贡献到手', '#8ff5d0');
    else if (r.kind === 'busy') floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, r.note || (r.label || '') + '完毕', '#8ff5d0');
    else { floatText(HOMEPOS.x, HOMEPOS.y - D().sit.h - 8, '出关 修为+' + fmt(r.got), '#8ff5d0'); if (r.epi) { banner('顿悟！', '再得修为 ' + fmt(r.epi)); SFX.reveal(4); } }
  }
  // 老祖特训不在阻塞清单（§5.1）：进纸鹤，玩家点开才见（GO_K.train）
  if (out.train) { if (L.mailPush) { L.mailPush(st, { k: 'say', ic: 'quest', t: '老祖要给你特训', left: 4, go: 'train' }); say('老祖要给你特训：看纸鹤'); } else pushPopup(showTrain); }
  if (st.guide && st.guide.done && st.tick % 3 === 0 && UI.isOpen('arts') && !awayUI()) artRecTip();
  if (st.guide && st.guide.done && st.tick % 3 === 1 && UI.isOpen('plus') && !awayUI()) gearPlusTip();
  if (out.auction) notify('tick', { k: 'auction', t: '拍卖会开槌', left: L.AUCTION.len }, () => banner('拍卖会开槌', `坊市 · ${L.AUCTION.len} ${UNIT} · 三件竞价`));
  // 拍卖散场：竞拍者拿走的（宿敌战力 ×1.04）
  if (out.aucEnd && out.aucEnd.length && !awayUI()) { const b = out.aucEnd.find(x => x.boost); floatText(100, 40, b ? `${b.n}拍走了【${b.item}】：战力 ×${L.AUCTION.boost}` : `${out.aucEnd[0].n}拍走了【${out.aucEnd[0].item}】`, b ? '#ff9a8a' : '#9d93b8'); }
  // 天下大势起了：老祖一句“该干什么”；换季：每季头一回提一句（panel-cal.js）
  if (out.world) { const W = L.WORLD[out.world]; notify('active', { k: 'world', t: '天下大势 · ' + W.n, left: W.len }, () => { banner('天下大势 · ' + W.n, `${W.len} ${UNIT}`); SFX.reveal(3); worldTip(out.world); }); }
  else if (out.season !== undefined && st.guide && st.guide.done && UI.isOpen('cal')) notify('active', { k: 'season', t: ['入春了', '入夏了', '入秋了', '入冬了'][out.season] || '换季了', left: 3 }, () => seasonTip(out.season));
  if (out.mjOpen) realmOpenFx(out.mjOpen);   // 入夏，秘境开了（panel-realm.js）
  if (out.pact) pushPopup(runPact);
  if (out.invite) pushPopup(showInvite);
  if (out.war) pushPopup(runWar);
  if (out.tourney) pushPopup(runTournament);
  // 宿敌与新秀（panel-rivals.js）：新秀出世、追到身后强制一战、指点过的新秀送礼
  if (out.rookieNew) notify('tick', { k: 'rookie', t: '新秀出世 · ' + out.rookieNew.n }, () => { banner('新秀出世', `${out.rookieNew.n} · 天骄榜第 ${L.rookieRank(st)}`, '#ffe39a'); SFX.reveal(2); });
  if (out.rookie) pushPopup(runRookie);
  if (out.rkGift && !awayUI()) floatText(100, 40, `${out.rkGift[0].n}送来${out.rkGift[0].what}`, '#8ff5d0');
  if (out.meet) pushPopup(runSectMeet);
  if (out.death) pushPopup(showDeath);
  clockTick(out);   // 大节点预告、备战卡、年报、空转、寿元、圆满自动停、排着的剧情事件（clock.js）
  if (!awayUI()) guideTick();   // 卡住检测与补齐的老祖气泡（guide-ask.js）
  saveLocal();
}
// E17 老祖特训：约战剩余 ≤ 8 月、胜算 < 60%、未筑基未圆满，第一世只此一次
function showTrain() {
  if (!L.canTrain(st)) return;
  const pi = L.pactInfo(st);
  sheet({ title: '老祖特训', center: true, noClose: true,
    body: `<div class="speaker">${elderImg(56, 'ang')}<p class="grow" style="margin:0">来不及了。还剩 <b>${pi.left}</b> 个月，胜算才 <b>${L.pct(pi.p)}</b>。坐下，老夫亲自给你<b>特训</b>：${L.RET.len} 个月，修炼 <b>×3</b>，不收灵石。</p></div>`,
    foot: [{ t: '不用', alt: true, fn: closeModal }, { t: '接受特训', gold: true, fn: () => { if (L.startTrain(st)) { SFX.gather(); banner('老祖特训', `${L.RET.len} 月 · 修炼 ×3`); } closeModal(); } }] });
}
function showVisitor() {
  const ev = L.visitorEvent(st);
  if (!ev) { st.visitor = null; return; }
  showChoice(ev);
}

// ---------- 主循环 ----------
let last = performance.now(), cloudAcc = 0;
function frame(now) {
  const dt = Math.min(100, now - last); last = now;
  const sp = SPEEDS[speedIdx];
  const running = st && sp > 0 && $('#modal').hidden && !cine && $('#intro').hidden && st.p.r < 9 && !guideHold && !st.run && !autoStop();   // 秘境里、自动停（clock.js）时间不走
  if (running) {
    const TM = tickMs();
    L.flow(st, dt * sp / TM);
    monthAcc += dt * sp;
    if (monthAcc >= TM) { monthAcc -= TM; onTick(); }
    craneTimer -= dt;
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
  if (st.exp) { SFX.tap(); showExp(); return; }
  if (st.visitor && !st.retreat && Math.abs(x - VISIT_POS.x) < 16 && y > VISIT_POS.y - 58 && y < VISIT_POS.y + 6) { SFX.tap(); showVisitor(); return; }
  if (petSceneHit(x, y)) return;
  if (fieldSceneHit(x, y)) return;
  if (homeSceneHit(x, y)) return;   // 场景里的建筑（panel-home.js）
  const S = D().sit;
  if (Math.abs(x - HOMEPOS.x) < S.w / 2 + 6 && y > HOMEPOS.y - S.h - 16 && y < HOMEPOS.y + 6) {
    if (L.isReady(st)) { SFX.tap(); showBreakthrough(); return; }
    if (st.retreat) { SFX.tap(); showHome(); return; }
    const g = L.tuna(st);
    if (g > 0) {
      tone(784, 0, 0.12, 'triangle', 0.1);
      floatText(HOMEPOS.x + (Math.random() - 0.5) * 20, HOMEPOS.y - S.h - 4 - Math.random() * 12, `吐纳 +${dec(g)}`, '#8ff5d0');
      for (let k = 0; k < 16; k++) { const a = Math.random() * 6.28, r = 18; parts.push({ x: HOMEPOS.x + Math.cos(a) * r, y: HOMEPOS.y - S.h / 2 + Math.sin(a) * r * 0.6, vx: -Math.cos(a) * 0.03, vy: -Math.sin(a) * 0.018, life: 500, max: 500, c: '#9ff5d8', s: 1 }); }
    } else floatText(HOMEPOS.x, HOMEPOS.y - S.h - 4, `吐纳环 ${Math.floor(Math.min(st.tuna || 0, L.TUNA_FULL))}/${L.TUNA_FULL}，在洞府打坐时每月蓄一格${L.tunaStep(st) > 1 ? '（引气诀蓄得快些）' : ''}`, '#9d93b8', false, true);
    return;
  }
  if (y > 30 && y < 104 && x > 50 && x < 150) { SFX.tap(); showHome(); }
}
cvs.addEventListener('click', sceneClick);
$('#cult').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); if (L.isReady(st)) showBreakthrough(); else showGrowth('cul'); });
// 底栏固定五格（docs/KAIRO_PLAN.md §4.1）：历练 / 洞府 / 装备 / 江湖 / 仙途；没开的那一格只在传讯行说一句条件（goalcard.js 的 navClick）
$('#nav').addEventListener('click', e => {
  const b = e.target.closest('button[data-nav]'); if (!b || !st || cine) return;
  ac(); SFX.tap();
  navClick(b.dataset.nav);
});
$('#btnSpeed').onclick = () => { ac(); SFX.tap(); if (autoStop()) { resumeClock(); updateHUD(); return; } speedIdx = (speedIdx + 1) % SPEEDS.length; savePref(); updateHUD(); };   // 自动停着时点它 = 继续
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
window.__xm = { get st() { return st; }, L, ART, get hints() { return HINTS; }, showDutyPick, showDiscTeach, setSpeed: i => { speedIdx = Math.min(i, SPEEDS.length - 1); }, onTick, showBreakthrough, closeModal, showEvent, showInvite, runTournament, runPact, runWar, doPromote, showDeath, rebirthPick, showChoice, showRivalCard, showRookieCard, runRookie, tourPrep, showAlchemy, fightBossUI, showMe, runSectMeet, showGrowth,
  showExp, confirmExp, showExpResult, showHome, showMarket, showSect, showQuests, showPact, showTrain, showVisitor, loadState, showGear, showForge, revealItem, doPlus, showPets, showPetJobs, showPetEvo, showCalendar, showBig, worldLine, showDao, showTribPrep, showTribStory, showTribPause, startTribCine, runAct, registerGuide, get bubbleLog() { return bubbleLog; }, get duelFx() { return duelFx; }, duelSkip, showChapterCard, get guideCur() { const c = guideCurShown; return c && { id: c.id, target: c.target || '', btn: c.btn || '' }; }, tribOpts, showField, brewUI, showZhen, get cineState() { return cine; }, get cine() { return !!cine; }, get guideHold() { return guideHold; },
  UI, get tickMs() { return tickMs(); }, notify, openMail, showPrep, showYearBasic, resumeClock, get autoStop() { return autoStop(); }, watch: null,
  get guideDbg() { return { active: activeHint && activeHint.id, temp: !!tempHint, hintCool, bubbleQ: bubbleQ.map(b => b.key), bubble: bubbleCur && bubbleCur.key, step: st && st.guide && st.guide.step, cand: HINTS.filter(h => st && !st.hintSeen[h.id] && h.when()).map(h => h.id) }; } };
Object.assign(window.__xm, { showArts, showBag, showPetAwake });
Object.assign(window.__xm, { showGearDetail, showEquip, showWorld, showPath, showInbox, showUnlock, showYearReport, showChapterCard, showRecord, showSettings, navClick, goTo, hlOnly, say, get sayLog() { return sayLog; }, get unlockQ() { return unlockQ; }, get pauseIdx() { return SPEEDS.indexOf(0); }, get navCur() { return navCur; } });   // 开罗式重整（测试与截图用）   // 面板重做 A 线：功法页、包裹、觉醒卡（测试与截图用）
