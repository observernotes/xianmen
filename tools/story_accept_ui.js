#!/usr/bin/env node
/* 废柴仙途 · 主线可走通性验收（真实界面；逻辑层那一半在 tools/story_accept.js，矩阵见 docs/STORY_ACCEPTANCE.md）
 *   node tools/story_accept_ui.js                 全部用例（Playwright，4 个页面并行，约 25 分钟）
 *   node tools/story_accept_ui.js only=<正则>     只跑 id 对得上的
 *   node tools/story_accept_ui.js list            只列用例
 *   node tools/story_accept_ui.js json=<文件>     结果另存 JSON
 *   node tools/story_accept_ui.js dist=<index.html>  换一个构建来跑（例如 2.3.2 的 dist，复现旧版本的卡死；旧构建上探测器自动关掉）
 *   node tools/story_accept_ui.js jobs=2 shots=<目录>  并行数；失败 / 卡住时截图放哪
 *
 * 机器人在真实页面（dist/index.html）里玩，规则：
 *   · 时间只在“真人那边时间也会走”的时候推进：没有弹窗、没有过场、不在秘境、没有自动停（修为圆满 / 备战 / 寿元），推进用测试钩子 __xm.onTick（等价于主循环走满一个月）。
 *     时间走不了、又没有任何按钮可点 → 判“界面卡死”。
 *   · 主线相关的每一步只点按钮：三宗争徒弹窗的【拜入】/【再想想】、剧情的选项（.choices [data-c] 或对话场景的 .tk-pick）、约战 / 论道 / 会武 / 来犯 / 新秀的弹窗、
 *     宗门页的【晋升】、突破页、备战卡、解锁卡、年报、章末卡、飞升后的天门与结局卡、【再入轮回】整条流程。
 *   · 打怪升级的杂事（升洞府、买丹、炼丹、换法宝、派灵宠、接交宗门任务、出发历练）借 tools/sim.js 的 guided / lazy 策略直接调逻辑函数（测试钩子），
 *     但把其中会推进主线的两样（L.promote、L.fightBoss）拦下来改成点界面。
 *   · 解锁卡的真实时间间隔（L.onbHold）：用 __xm.watch 接一只“手表”，按 ×1 / ×4 的速度把走过的月数折成秒——所以 ×4 挂机时解锁卡来得多慢，这里量得出来。
 *   · 每个月跑死锁探测器（tools/story_probe.js，和逻辑层同一份），看目标卡三行字是不是都有、每隔一阵点一次目标卡的【去】看有没有反应。 */
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const arg = process.argv.slice(2);
const opt = k => { const a = arg.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : ''; };
const ROOT = path.join(__dirname, '..');
const DIST = opt('dist') ? path.resolve(opt('dist')) : path.join(ROOT, 'dist', 'index.html');
const OLD = !!opt('dist');
const JOBS = +(opt('jobs') || 4);
const SHOTS = opt('shots');
const ONLY = opt('only') ? new RegExp(opt('only')) : null;
const FIX = path.join(__dirname, 'story_fixtures');

// ---------- 用例 ----------
// strat: guided / lazy / idle（只在提示时突破，别的不动）/ away（一回洞府立刻再出门，从不闭关）
// sect: { mode: first | story | popup | never | late:N, want }；speed: 1 | 4；until: 跑到第几个月（0 = 跑到飞升或坐化）；reach: 至少到第几章（0 起；9 = 九章做完）
// reload: 每几个月整页刷新一次（真的走 localStorage 存读档）；reloadAt: 碰到标题对得上的弹窗先刷新一次再处理；fixture: 旧存档；talk: 对话场景用真画面（不快放）
// life2: 飞升 / 坐化后点完整条轮回流程，再玩 life2 个月；mk: 在页面里造开局（第二世的出身 / 试炼）
const CASES = [
  { id: 'U01-first-full', d: '照引导玩一世：帖子谁先来接谁，走到飞升、过天门、点完轮回流程、第二世再玩 40 月', strat: 'guided', sect: { mode: 'first', want: 'jian' }, until: 0, reach: 9, life2: 40, goEvery: 15 },
  { id: 'U02-never-full', d: '照引导玩一世：帖子全不理（剧情里说“哪家也不去”，弹窗点【再想想】），散修之路走到飞升', strat: 'guided', sect: { mode: 'never' }, until: 0, reach: 9, goEvery: 15 },
  { id: 'U03-x4-popup', d: '全程 ×4 速，剧情里不接帖、只等三宗争徒的弹窗：量【宗门】解锁卡与弹窗第几个月才来', strat: 'guided', speed: 4, sect: { mode: 'popup', want: 'dan' }, until: 420, reach: 2 },
  { id: 'U04-x4-first', d: '全程 ×4 速，谁先来接谁', strat: 'guided', speed: 4, sect: { mode: 'first', want: 'dao' }, until: 420, reach: 3 },
  { id: 'U05-away', d: '一直在外历练：一回洞府立刻再出门，从不闭关、不停留', strat: 'away', sect: { mode: 'first', want: 'jian' }, until: 330, reach: 2 },
  { id: 'U06-idle-x4', d: '×4 挂机：只在提示时点突破，别的什么都不做', strat: 'idle', speed: 4, sect: { mode: 'first', want: 'jian' }, until: 320, reach: 0, soft: true },
  { id: 'U07-reload', d: '每 9 个月整页刷新一次（真的存读档），碰到三宗争徒 / 三张帖子 / 约战弹窗时先刷新再处理', strat: 'guided', sect: { mode: 'popup', want: 'jian' }, until: 260, reach: 2, reload: 9, reloadAt: '宗争徒|三张帖子|三年之约|之约' },
  { id: 'U08-talk-story', d: '对话场景用真画面（点一下 / 选项按钮）：只在“三张帖子”里接帖', strat: 'guided', sect: { mode: 'story', want: 'dao' }, until: 150, reach: 2, talk: true },
  { id: 'U09-pact-lose', d: '约战故意输：论道上补回第一章，再入宗', strat: 'guided', sect: { mode: 'first', want: 'dan' }, until: 200, reach: 2, lose: true },
  { id: 'U10-late', d: '先拒 3 次，再想入宗', strat: 'guided', sect: { mode: 'late:3', want: 'jian' }, until: 330, reach: 2 },
  { id: 'U11-wuzong', d: '第二世 · 天道试炼“无宗”', strat: 'guided', sect: { mode: 'first', want: 'jian' }, until: 300, reach: 3, mk: { origin: 'qitu', trials: ['wuzong'] } },
  { id: 'U12-moyi-xuesha', d: '第二世 · 魔门遗孤：拾起血帖', strat: 'guided', sect: { mode: 'story', want: 'xuesha' }, until: 260, reach: 2, mk: { origin: 'moyi', trials: [] } },
  { id: 'U13-sanxiu-limit', d: '第二世 · 散修丹师 + 限时：不入宗，跑到坐化 / 飞升，点完轮回流程', strat: 'guided', sect: { mode: 'never' }, until: 0, reach: 3, mk: { origin: 'sanxiu', trials: ['limit'] }, life2: 20, soft: true },
  { id: 'U14-lazy', d: '随手玩 500 月（打不过点名的人）：不卡死、目标卡一直有字', strat: 'lazy', sect: { mode: 'first', want: 'jian' }, until: 500, reach: 2, soft: true },
  { id: 'U15-stay-again', d: '天门前转身（点得到的话）→ 结局页【再登天门】', strat: 'guided', sect: { mode: 'first', want: 'dan' }, until: 0, reach: 9, picks: { s9_gate: 1, s9_gate_again: 0, story_r8: 2, su_5: 0 }, again: true },
];
for (const f of ['v232_ch2_refuse_t120', 'v232_ch2_refuse_t300', 'v232_lone_sanxiu_t200', 'v232_pactlost_t40', 'v231_ch2_refuse_t120', 'v231_idle_t200', 'v231_ch6_t330', 'v232_ch8_t450'])
  CASES.push({ id: 'U20-' + f, d: `读旧档 ${f}.json 接着玩 160 月`, strat: 'guided', sect: { mode: /lone/.test(f) ? 'never' : 'first', want: 'jian' }, until: '+160', reach: /idle/.test(f) ? 1 : /refuse|pactlost/.test(f) ? 2 : -1, fixture: f + '.json', advance: /refuse|pactlost|idle/.test(f) });
if (opt('until')) for (const c of CASES) { c.until = +opt('until'); c.reach = -1; c.life2 = 0; }   // 调试：只跑前几个月
const pick = CASES.filter(c => !ONLY || ONLY.test(c.id));
if (arg.includes('list')) { for (const c of pick) console.log(c.id.padEnd(26), c.d); console.log('共 ' + pick.length + ' 条'); process.exit(0); }

// ---------- 页面里的机器人 ----------
/* eslint-disable no-undef */
async function BOT(cfg) {
  const X = window.__xm, L = X.L, S = window.__sim, TK = window.__xm_talk;
  const P = window.XM_PROBE && L.storyBeat ? window.XM_PROBE(L) : null;
  const R = cfg.R;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const modal = () => !$('#modal').hidden;
  const title = () => { const h = $('#modal h2'); return h ? h.textContent : ''; };
  const fail = m => { if (R.fails.length < 14 && !R.fails.includes(m)) R.fails.push(m); };
  const wk = window.__wk || (window.__wk = {});
  const warn = m => { const k = m.replace(/\d+/g, 'N'); if (!wk[k] && R.warns.length < 40) { wk[k] = 1; R.warns.push(m); } };
  let seed = cfg.seed + R.months; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const speed = cfg.speed || 1;
  // ---- 只装一次：记录入宗 / 抉择，拦主线捷径，接手表 ----
  if (!window.__accInst) {
    window.__accInst = 1; window.__vsec = R.vsec || 0; window.__depth = 0; window.__block = false; window.__log = { joins: [], picks: [] };
    X.watch = () => window.__vsec;
    const js0 = L.joinSect; L.joinSect = function (st, id) { const ok = js0.apply(this, arguments); if (ok && st === X.st) window.__log.joins.push((window.__depth > 0 ? '剧情' : '弹窗') + '@' + st.tick + ':' + id); return ok; };
    const rc0 = L.resolveChoice; L.resolveChoice = function (st, ev, idx) { window.__depth++; try { const r = rc0.apply(this, arguments); if (r && st === X.st && window.__depth === 1 && ev) window.__log.picks.push({ id: ev.id, i: idx, t: st.tick, ch: L.chapterNow(st), where: ev.where }); return r; } finally { window.__depth--; } };
    window.__mi = {}; const mi0 = L.markInterrupt; L.markInterrupt = function (st) { const k = (new Error().stack.split('\n').slice(2, 5).map(x => (/at (\w+)/.exec(x) || [])[1] || '?').join('<')); window.__mi[k] = (window.__mi[k] || 0) + 1; return mi0.apply(this, arguments); };
    const pr0 = L.promote; L.promote = function () { if (window.__block) return null; return pr0.apply(this, arguments); };
    const fb0 = L.fightBoss; L.fightBoss = function () { if (window.__block) return null; return fb0.apply(this, arguments); };
    if (cfg.lose) { window.__pp = L.PACT_POWER; if (!X.st.pact) L.PACT_POWER = 1e12; }
    setInterval(() => { const ok = $('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); }, 200);
    if (TK) TK.fast = cfg.talk ? false : true;
    if (window.__xm_cine) window.__xm_cine.fast = true;
  }
  X.setSpeed(3);
  const st0 = X.st; if (st0.guide && !st0.guide.done) st0.guide = { step: 99, done: true };
  const rec = { realmAt: {}, srankAt: {}, beatAt: {}, artAt: {}, gearAt: {}, daojiAt: {}, ratio: [], maxPills: 0, passive: 0, streak: 0, maxStreak: 0, sold: 0, shop: 0, bids: 0, aucWon: 0, worlds: 0, petAt: {}, tribs: 0, hints: 0, hintRight: 0, aidN: 0, extraPills: 0, grades: {}, demons: 0, vaultBuys: 0, gifts: 0, favAt: {}, favWait: {}, npcGifts: 0, pq: 0, sx: 0, affAt: {},
    mj: { runs: 0, clear: 0, leave: 0, wipe: 0, deep: 0, ev: 0, stones: 0 }, rv: { swap: 0, swapGain: 0, crushWin: 0, crushLose: 0, crushP: 0, teach: 0 }, trials: 0, baoqi: 0, toxSum: 0, toxMax: 0, ticks: 0, rice: 0, plots: 0, yinGot: 0, zhenSet: 0, zhenAid: 0 };
  // ---- 认出弹窗里是哪件事 ----
  let titleMap = null;
  const evOfModal = () => {
    const btns = $$('#modal .choices .btn[data-c]'); if (!btns.length) return null;
    const h = $('#modal h2'); if (!h) return null;
    const t = h.textContent.replace(/^主线/, '').trim();
    const st = X.st;
    const cands = L.events().filter(ev => { try { return L.fill(st, ev.title) === t; } catch (e) { return false; } });
    const fit = cands.filter(ev => btns.every(b => { const c = ev.choices[+b.dataset.c]; return c && b.querySelector('span') && L.fill(st, c.t) === b.querySelector('span').textContent; }));
    return fit[0] || cands[0] || null;
  };
  // 按用例挑一个选项（只在点得到的里面挑）
  const wantFor = (evId, avail) => {
    const ev = L.eventById(evId), m = cfg.sect.mode;
    if (evId === 's2_invite' && ev) {
      const join = id => ev.choices.findIndex(c => c.ok && c.ok.fx && c.ok.fx.join === id);
      const san = ev.choices.findIndex(c => c.ok && c.ok.fx && [].concat(c.ok.fx.flag || []).includes('path_san'));
      R.s2 = R.s2 || X.st.tick;
      if (m === 'first' || m === 'story') { const w = join(cfg.sect.want); if (avail.includes(w)) return w; R.gated.push('s2_invite 想接 ' + cfg.sect.want + ' 的帖，点不到'); const any = avail.find(i => ev.choices[i].ok && ev.choices[i].ok.fx && ev.choices[i].ok.fx.join); return any !== undefined ? any : avail[0]; }
      return avail.includes(san) ? san : avail[avail.length - 1];
    }
    const w = cfg.picks && cfg.picks[evId];
    if (w !== undefined) { if (avail.includes(w)) return w; R.gated.push(`${evId} 的选项 ${w} 点不到`); }
    return avail[Math.floor(rnd() * avail.length)];
  };
  let lastClose = 0, wasOpen = false;
  const noteModal = () => { const o = modal(); if (wasOpen && !o) lastClose = performance.now(); wasOpen = o; return o; };
  async function pauseCard() {
    for (const b of $$('#modal [data-ex]:not([disabled])')) if (!b.closest('.aid').classList.contains('on')) { b.click(); await sleep(30); }
    for (let i = 0; i < 2; i++) { const b = $('#modal [data-exp="1"]:not([disabled])'); if (b) { b.click(); await sleep(30); } }
    const go = $('#modal .foot .btn.gold'); if (go) go.click(); await sleep(60);
  }
  async function drainCards() {
    for (let g = 0; g < 8; g++) {
      const c = $('#modal [data-gcmp]'); if (!c) return;
      const u = c.dataset.gcmp;
      if (c.dataset.better === '1' && c.querySelector('[data-geq]')) c.querySelector('[data-geq]').click(); else if (c.querySelector('[data-gsm]')) c.querySelector('[data-gsm]').click(); else return;
      await sleep(30);
      if ($(`#modal [data-gcmp="${u}"]`)) return;
    }
  }
  // 把眼前所有弹窗、过场、对决点掉；stopAt：碰到标题对得上的先不点，交回去（刷新测试用）
  let stuckInfo = '';
  async function drain(stopAt) {
    let same = 0, lastSig = '';
    for (let guard = 0; guard < 900; guard++) {
      // 对话场景（真画面）
      if (TK && TK.on) {
        const o = TK.on;
        if (stopAt && o.id && new RegExp(stopAt).test(L.fill(X.st, L.eventById(o.id).title))) return 'stop';
        if (o.picking) {
          await sleep(650);
          const ps = $$('.tk-picks:not([hidden]) .tk-pick[data-c]');
          const avail = ps.filter(b => !b.disabled).map(b => +b.dataset.c);
          if (ps.some(b => b.disabled)) R.greyed = (R.greyed || 0) + 1;
          if (!avail.length) { fail(`对话场景 ${o.id} 的选项全是灰的，点不动`); TK.close(); await sleep(200); continue; }
          const w = wantFor(o.id, avail);
          const b = ps.find(x => +x.dataset.c === w); b.click(); R.talkPicks = (R.talkPicks || 0) + 1; await sleep(260);
        } else { TK.tap(); await sleep(18); }
        const sig = 'tk' + o.id + o.i + o.picking; same = sig === lastSig ? same + 1 : 0; lastSig = sig;
        if (same > 400) { stuckInfo = '对话场景点不动：' + o.id; return 'stuck'; }
        continue;
      }
      // 首领战是在场景里真打的一场回合战：机器人不看戏，用测试钩子按自动策略一口气打完，再照常点结果卡
      if (window.__xm_bt && window.__xm_bt.on && !X.st.exp && !X.cine && !modal()) { window.__xm_bt.finish(); R.bossFin = (R.bossFin || 0) + 1; await sleep(80); continue; }
      if ($('#tribPause')) { await pauseCard(); continue; }
      if (X.cine) { if (cfg.dbg && same % 40 === 0) { const c = X.cineState; console.log('BOT cine ' + JSON.stringify({ t: c.t, end: c.end, done: c.done, trib: c.trib, idx: c.idx, N: c.N, cn: c.cn, tk: c.tk, next: c.next, paused: c.paused, guide: !$('#guide').hidden, gtxt: $('#guide').textContent.slice(0, 60), modal: modal() ? title() : '' })); } await sleep(100); same++; if (same > 300) { stuckInfo = '过场一直不结束'; return 'stuck'; } continue; }
      if (X.duelFx && !X.duelFx.ended) { X.duelSkip(); await sleep(40); continue; }
      if (!noteModal()) {
        const wait = 440 - (performance.now() - lastClose);
        if (wait > 0) { await sleep(wait + 10); continue; }
        return 'clear';
      }
      const t = title();
      R.titles[t.replace(/\d+/g, 'N').slice(0, 14)] = 1;
      if (stopAt && new RegExp(stopAt).test(t)) return 'stop';
      const sig = t + '|' + $('#modal').textContent.length; same = sig === lastSig ? same + 1 : 0; lastSig = sig;
      if (same > 60) { stuckInfo = `弹窗点不掉：「${t}」 ${$('#modal').textContent.replace(/\s+/g, ' ').slice(0, 120)}`; return 'stuck'; }
      // 三宗争徒
      if (/宗争徒/.test(t)) {
        R.invites.push(X.st.tick);
        const m = cfg.sect.mode, late = /^late:(\d+)$/.exec(m);
        let take = m === 'first' || m === 'popup'; if (late) take = R.refused >= +late[1];
        if (!take) { R.refused++; const b = $('#modal .foot [data-fi="0"]'); if (!b) { fail('三宗争徒没有【再想想】'); X.closeModal(); } else b.click(); await sleep(60); continue; }
        const sc = L.SECTS.find(x => x.id === cfg.sect.want);
        const c = $$('#modal .cand').find(x => sc && x.querySelector('.nm') && x.querySelector('.nm').textContent === sc.n) || $('#modal .cand');
        if (c) { c.click(); await sleep(40); }
        const ok = $('#modal .foot [data-fi="1"]'); if (!ok) { fail('三宗争徒没有【拜入】'); X.closeModal(); } else ok.click(); await sleep(80); continue;
      }
      const cand = $('#modal .cand:not(.hide):not(.sel)');
      if (cand && !$('#modal .cand.sel')) { cand.click(); await sleep(40); continue; }
      const chs = $$('#modal .choices .btn[data-c]:not([disabled])');
      if (chs.length) {
        const ev = evOfModal(), avail = chs.map(b => +b.dataset.c);
        const w = ev ? wantFor(ev.id, avail) : avail[Math.floor(rnd() * avail.length)];
        (chs.find(b => +b.dataset.c === w) || chs[0]).click(); await sleep(60); continue;
      }
      const lv = $('#modal .choices [data-leave]'); if (lv) { lv.click(); await sleep(60); continue; }
      const zs = $('#modal [data-zswap]'); if (zs) { zs.click(); await sleep(40); continue; }
      const eq = $('#modal [data-eqart]'); if (eq) { eq.click(); await sleep(40); continue; }
      if ($('#modal [data-gcmp]')) { await drainCards(); if ($('#modal [data-gcmp]')) { X.closeModal(); await sleep(60); } continue; }
      const btns = $$('#modal .foot .btn:not([disabled])');
      if (!btns.length) { const cl = $('#modal .close'); if (cl) { cl.click(); await sleep(60); } else if (same > 8) { X.closeModal(); await sleep(60); } else await sleep(100); continue; }
      // 再登天门：结局 / 结算页上的按钮
      const gate = $('#modal #btnGate'); if (gate && cfg.again && !R.gateAgain) { R.gateAgain = X.st.tick; gate.click(); await sleep(200); continue; }
      const back = btns.find(b => b.textContent === '回洞府');
      (back || btns[btns.length - 1]).click(); await sleep(50);
    }
    stuckInfo = '弹窗处理了 900 轮还没清空：' + title(); return 'stuck';
  }
  const canRun = () => { const st = X.st; return !(window.__xm_bt && window.__xm_bt.on && !st.exp) && !modal() && !X.cine && $('#intro').hidden && st.p.r < 9 && !st.run && !X.autoStop && !(TK && TK.on); };
  async function breakthrough() {
    const st = X.st;
    if (st.p.inj > 0 && L.canHeal && L.canHeal(st)) L.heal(st);
    if (cfg.strat !== 'idle') { while (st.pills < 3 && st.stones > L.price(st, 'pill') * 2 && !L.btGuard(st)) L.buy(st, 'pill'); while (L.tribNeeded(st) && st.pills < 5 && st.stones > L.price(st, 'pill') * 2) L.buy(st, 'pill'); }
    X.showBreakthrough(); await sleep(40);
    if (cfg.strat !== 'idle') for (const b of $$('#modal [data-aid]:not([disabled])')) if (!b.closest('.aid').classList.contains('on')) { b.click(); await sleep(30); }
    const go = $('#modal .foot .btn.gold:not([disabled])') || $('#modal .foot .btn:not([disabled])');
    if (go) go.click(); else { fail(`突破页没有能点的按钮（第 ${st.tick} 月）`); X.closeModal(); }
    R.bts++;
    return drain();
  }
  async function promoteUI() {
    const st = X.st;
    $('#nav [data-nav="world"]').click(); await sleep(50);
    if (!$('#modal #btnPromo')) { X.showSect('id'); await sleep(50); }
    const b = $('#modal #btnPromo:not([disabled])');
    if (!b) { R.promoMiss = (R.promoMiss || 0) + 1; if (R.promoMiss === 6) fail(`L.canPromote 为真，宗门页的【晋升】却点不了（第 ${st.tick} 月，身份 ${st.sect.rank}）`); if (modal()) { X.closeModal(); await sleep(60); } return drain(); }
    b.click(); R.promos++; await sleep(60);
    return drain();
  }
  function chores() {
    const st = X.st;
    if (cfg.strat === 'idle') return;
    window.__block = true;
    try {
      if (cfg.strat === 'lazy') { S.actLazy(st, rec); S.artLazy(st); L.gearAutoAll(st); }
      else { S.actGuided(st, rec, cfg.seed); S.gearGuided(st); }
      if (cfg.strat === 'away' && !L.busy(st) && !L.isReady(st) && st.p.r <= L.MAXR) { if (st.retreat) { /* 不闭关 */ } const c = L.expBest(st, 0); L.startExp(st, c.k, c.d, c.a); }
    } catch (e) { fail('杂事策略抛错：' + e.message); }
    window.__block = false;
  }
  // ---- 每月检查 ----
  const since = R.since, dead = R.dead;
  function checks() {
    const st = X.st, ch = L.chapterNow(st);
    if (ch < R.ch) fail(`第 ${st.tick} 月章倒退：${R.ch + 1} → ${ch + 1}`);
    if (ch > R.ch) { for (let i = R.ch + 1; i <= ch; i++) R.chAt[i] = st.tick; R.ch = ch; }
    if (st.onb && st.onb.at.sect !== undefined && R.sectCard === null) R.sectCard = st.onb.at.sect;
    { const K = R.keyAt, e = st.eflags || {}, set = (k, v) => { if (v && K[k] === undefined) K[k] = st.tick; };
      set('pact', st.pact); set('rank60', st.pact && st.bestRank <= 60); set('zhao', st.beaten.zhao); set('chu', st.beaten.chu); set('war', st.flags.warWon); set('truth_xue', e.st_truth && st.beaten.xue); set('justice_rank2', e.st_justice && st.bestRank <= 2);
      for (let i = 0; i < 9; i++) set('m' + i, st.quest.done['c' + i + '_m']); }
    if (st.sect && R.joinAt === null) R.joinAt = st.tick;
    R.vsec = window.__vsec;
    if (st.p.r >= 9) return;
    // 目标卡三行字
    const gT = $('#gT').textContent.trim(), gBar = $('#gBar').textContent.trim(), gNext = $('#gNext').textContent.trim();
    if (!gT) fail(`第 ${st.tick} 月目标卡没有目标文字`);
    if (!gNext || gNext === '下一步：') fail(`第 ${st.tick} 月目标卡“下一步”是空的`);
    if (!gBar && st.tick > 2) { R.noBar = (R.noBar || 0) + 1; if (R.noBar === 5) fail(`第 ${st.tick} 月目标卡进度没有文字（目标“${gT}”）`); }
    R.goalText[ch] = R.goalText[ch] || {}; if (Object.keys(R.goalText[ch]).length < 6) R.goalText[ch][(gT + ' / ' + gBar).replace(/\d+/g, 'N')] = 1;
    if (!P) return;
    let pr; try { pr = P.probe(st); } catch (e) { fail('探测器抛错：' + e.message); return; }
    if (pr.mismatch) warn(`第 ${ch + 1} 章：${pr.mismatch}（${pr.deps.map(d => d.t + '=' + d.how).join('、')}）`);
    for (const d of pr.deps) {
      const key = ch + ':' + d.k, o = since[key];
      if (!o || o.how !== d.how) since[key] = { how: d.how, t: st.tick };
      const dur = st.tick - since[key].t;
      if (d.how === 'none') { if (!dead[key]) { dead[key] = 1; fail(`第 ${ch + 1} 章死锁（第 ${st.tick} 月，境界 ${st.p.r}${st.sect ? '，' + st.sect.id + ' 身份 ' + st.sect.rank : '，无宗'}）：${d.t}——${d.note}`); } }
      else if ((d.how === 'wait' || d.how === 'beat') && dur > P.MAXWAIT[d.how] && !/第.章才/.test(d.note || '')) { if (!dead['w' + key]) { dead['w' + key] = 1; fail(`第 ${ch + 1} 章兜底超时：${d.t} 已经等了 ${dur} 月（${d.how}，${d.note || ''}）`); } }
      if (d.how === 'wait' || d.how === 'beat') { const k2 = (gT + '｜' + gBar).replace(/\d+/g, 'N'); R.waitText[d.t] = R.waitText[d.t] || {}; if (Object.keys(R.waitText[d.t]).length < 4) R.waitText[d.t][k2] = d.note || ''; }
    }
    const g = P.goalCheck(st);
    for (const b of g.bad) { if (/^死锁/.test(b)) continue; if (/^卡在境界|没说要先筑基/.test(b)) warn('目标卡：' + b.replace(/（现在[^）]*）/g, '').replace(/胜算 \d+%/, '胜算 N%')); else fail(`第 ${st.tick} 月目标卡：${b}`); }
  }
  // 点一次目标卡的【去】：要有反应
  async function tryGo() {
    const st = X.st; if (modal() || X.cine || st.p.r >= 9 || L.busy(st) || X.autoStop) return;
    const b = $('#gGo'); if (!b || !b.offsetParent) { R.goHidden = (R.goHidden || 0) + 1; return; }
    const before = JSON.stringify([st.stones | 0, st.home, !!st.exp, !!st.retreat, st.pills, X.sayLog.length, st.log.length, st.gear && st.gear.w && st.gear.w.u, st.p.inj]);
    const txt = $('#gNext').textContent;
    b.click(); await sleep(120);
    const s2 = X.st;
    const after = JSON.stringify([s2.stones | 0, s2.home, !!s2.exp, !!s2.retreat, s2.pills, X.sayLog.length, s2.log.length, s2.gear && s2.gear.w && s2.gear.w.u, s2.p.inj]);
    R.goClicks++;
    if (!modal() && !X.cine && before === after) { R.goDead.push(`第 ${st.tick} 月「${txt}」`); if (R.goDead.length === 3) fail('目标卡【去】点了没有任何反应：' + R.goDead.join('、')); }
    else R.goTo[(txt.replace(/\d+/g, 'N').slice(0, 16)) + ' → ' + (modal() ? title().replace(/\d+/g, 'N').slice(0, 10) || '面板' : s2.exp ? '出发' : '当场做了')] = 1;
    if (modal() && !$('#modal .foot .btn.gold')) { X.closeModal(); await sleep(60); }   // 只是看一眼的面板关掉；出发页之类的留给下面照常处理
    else if (modal() && /出发|历练/.test(title())) { X.closeModal(); await sleep(60); }
  }
  // ---- 主循环 ----
  const until = cfg.untilTick;
  let blocked = 0, out = 'time';
  for (let n = 0; n < 4000; n++) {
    if (cfg.dbg) console.log(`BOT n=${n} t=${X.st.tick} r=${X.st.p.r}.${X.st.p.s} modal=${modal() ? title() : ''} cine=${JSON.stringify(X.cineState && Object.keys(X.cineState))} stop=${X.autoStop} exp=${!!X.st.exp} ${Math.round(performance.now() / 1000)}s`);
    let d = await drain(cfg.stopAt);
    if (d === 'stop') { out = 'stop'; break; }
    if (d === 'stuck') { fail(`界面卡死（第 ${X.st.tick} 月）：${stuckInfo}`); R.stuck++; if (TK && TK.on) TK.close(); X.closeModal(); await sleep(500); if (R.stuck > 3) { out = 'stuck'; break; } }
    let st = X.st;
    // 剧情队列：人在洞府、弹窗都点完了，排着的剧情为什么还不出
    if (st.storyQ && st.storyQ.length && !st.exp && !st.retreat && !modal()) { const q = R.sq; q.home++; if (!L.canInterrupt(st)) { q.throttled++; q.gap[st.tick - (st.clk ? st.clk.last : -99)] = (q.gap[st.tick - (st.clk ? st.clk.last : -99)] || 0) + 1; } else { q.free++; const why = [X.unlockQ.length ? '解锁卡排队 ' + X.unlockQ.join(',') : '', !$('#guide').hidden ? '老祖气泡开着' : '', X.queueLen ? '弹窗队列 ' + X.queueLen : '', (st.cnQ || []).length ? '过场排队' : ''].filter(Boolean).join('+') || '无'; q.why[why] = (q.why[why] || 0) + 1; if (cfg.poke) { X.closeModal(); await sleep(460); if (modal() || (TK && TK.on)) q.poked = (q.poked || 0) + 1; } } }
    R.qMax = Math.max(R.qMax || 0, (st.storyQ || []).length);
    if (st.p.r >= 9) { out = 'asc'; break; }
    if (st.p.age >= L.lifespan(st) && R.deathSeen) { out = 'death'; break; }
    if (until && st.tick >= until) { out = 'time'; break; }
    if (cfg.lose && st.pact && window.__pp) { L.PACT_POWER = window.__pp; window.__pp = 0; }
    // 突破（境界封顶 / 主线没走完先不飞升）
    const hold = cfg.holdAsc && st.p.r === 8 && st.p.s >= 3 && L.chapterNow(st) < 8;
    if (L.isReady(st) && !hold && !L.busy(st)) { if (hold) R.held++; d = await breakthrough(); st = X.st; if (st.p.r >= 9) { out = 'asc'; break; } if (d === 'stuck') { fail(`突破之后界面卡死（第 ${st.tick} 月）：${stuckInfo}`); X.closeModal(); await sleep(500); } }
    if (hold) R.held++;
    if (X.autoStop) { R.autoStops[X.autoStop] = (R.autoStops[X.autoStop] || 0) + 1; $('#btnSpeed').click(); await sleep(30); X.setSpeed(3); }
    chores();
    st = X.st;
    if (st.sect && L.canPromote(st) && st.tick - (st.flags.promoFail || -99) >= 6 && cfg.strat !== 'idle' && !modal()) await promoteUI();
    if (cfg.strat !== 'idle' && cfg.strat !== 'lazy' && !L.busy(st) && !modal()) for (let k = 0; k < L.REGIONS.length; k++) if (L.bossReady(st, k) && (L.bossP ? L.bossP(st, k) : 0.8) > 0.7) { X.fightBossUI(k); R.bossUI++; await drain(); if (L.busy(X.st)) break; }
    if (st.visitor && !st.retreat && !st.exp && !modal() && cfg.strat !== 'idle') { X.showVisitor(); await drain(); }
    if (cfg.goEvery && st.tick % cfg.goEvery === 7) { await tryGo(); await drain(); }
    d = await drain(cfg.stopAt);
    if (d === 'stop') { out = 'stop'; break; }
    if (X.autoStop) { $('#btnSpeed').click(); await sleep(30); X.setSpeed(3); }
    if (!canRun()) {
      blocked++;
      if (blocked > 6) { fail(`界面卡死（第 ${X.st.tick} 月）：时间走不了——弹窗=${modal() ? title() : '无'} 过场=${!!X.cine} 秘境=${!!X.st.run} 自动停=${X.autoStop || '无'} 对话=${!!(TK && TK.on)}`); R.stuck++; if (X.st.run) { out = 'stuck'; break; } X.closeModal(); await sleep(500); blocked = 0; if (R.stuck > 3) { out = 'stuck'; break; } }
      continue;
    }
    blocked = 0;
    st = X.st;
    const t0 = st.tick;
    L.flow(st, 1); X.onTick();
    window.__vsec += X.tickMs / 1000 / speed; R.months++;
    if (X.st.p.age >= L.lifespan(X.st) && X.st.p.r <= L.MAXR) R.deathSeen = X.st.tick;
    if (X.st.tick !== t0 + 1 && X.st === st) fail(`onTick 之后月份没有 +1（${t0} → ${X.st.tick}）`);
    try { checks(); } catch (e) { fail('每月检查抛错：' + e.message); }
  }
  R.out = out; R.tick = X.st.tick; R.r = X.st.p.r; R.chNow = L.chapterNow(X.st); R.fin = !!(X.st.quest.done.c8_m); R.sect = X.st.sect ? X.st.sect.id + '/' + X.st.sect.rank : ''; R.lone = !!(L.loneRoute && L.loneRoute(X.st));
  R.log = window.__log; R.title = title(); R.rebirth = X.st.rebirth || 0; R.eflags = Object.keys(X.st.eflags || {}).filter(k => /^(asc_|war_|tianheng_|path_san|sect_expelled|daolv_)/.test(k)); R.daolv = X.st.daolv || '';
  R.story = JSON.stringify({ beat: X.st.story && X.st.story.beat, q: X.st.storyQ, hold: X.st.path && X.st.path.hold, last: X.st.story && X.st.story.last, chAt: X.st.story && X.st.story.chAt, clk: X.st.clk, queue: X.queueLen, evDone: ['story_r1', 's2_invite', 's1_pact_lost', 's1_pact_after'].filter(k => X.st.evDone[k]) });
  R.mi = window.__mi;
  R.onb = X.st.onb ? Object.entries(X.st.onb.at).filter(([k]) => ['market', 'sect', 'visitor', 'field', 'tour', 'pets', 'trib'].includes(k)).map(([k, v]) => k + '@' + v).join(' ') : '';
  return R;
}
// 飞升 / 坐化之后：结局卡、【再登天门】、整条轮回流程都点过去，再玩几个月
async function AFTER(cfg) {
  const X = window.__xm, L = X.L, R = cfg.R;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const title = () => { const h = $('#modal h2'); return h ? h.textContent : ''; };
  const st = X.st, life0 = st.rebirth || 0;
  const seen = [];
  R.endTitles = seen;
  if (st.p.r >= 9) {
    R.ascFlags = L.STORY_ASC ? L.STORY_ASC.filter(f => st.eflags[f]) : [];
    if (L.STORY_ASC && !R.ascFlags.length) R.fails.push('飞升了，天门前的抉择没有落下标志位（界面没播 s9_gate？）');
    if (L.endingOf) { try { R.ending = L.endingOf(st).n; } catch (e) { R.fails.push('L.endingOf 抛错：' + e.message); } }
    if (cfg.again) { if (!st.eflags.asc_stay && !R.gateAgain) R.warns.push('这一局天门前“转身”点不到（人间没有等你的人）——【再登天门】没测到'); else if (st.eflags.asc_stay) R.fails.push('点了【再登天门】之后还留在人间（asc_stay 没清）'); }
  }
  if (!cfg.life2) return R;
  // 人物页的【再入轮回】
  if (!$('#modal:not([hidden])') || !$('#modal .foot .btn')) { X.showMe('attr'); await sleep(80); }
  const rb = $('#btnReborn'); if (rb) { rb.click(); await sleep(300); }
  for (let g = 0; g < 80 && (X.st.rebirth || 0) === life0; g++) {
    const t = title(); if (t && !seen.includes(t)) seen.push(t);
    if (window.__xm.cine) { await sleep(150); continue; }
    if (window.__xm_talk && window.__xm_talk.on) { window.__xm_talk.close(); await sleep(100); continue; }
    if (/选择天赋|命格/.test(t)) { for (let k = 0; k < 20 && !$('#modal .cand:not(.hide)'); k++) await sleep(200); const c = $('#modal .cand:not(.hide)'); if (c) c.click(); await sleep(60); }
    if (t === '传承') for (const sel of ['[data-la]', '[data-lg]', '[data-lp]']) { const b = $('#modal ' + sel); if (b) { b.click(); await sleep(40); } }
    if (t === '轮回殿' && !R.hall) { R.hall = 1; for (const h of L.HALL) { const b = $(`#modal [data-h="${h.id}"]`); if (!b) continue; b.click(); await sleep(30); const buy = $('#hallBuy:not([disabled])'); if (buy) { buy.click(); await sleep(40); } } }
    const chs = $$('#modal .choices .btn[data-c]:not([disabled])'); if (chs.length) { chs[0].click(); await sleep(80); continue; }
    const f = $('#modal .foot .btn.gold:not([disabled])') || $('#modal .foot .btn:not([disabled])');
    if (f) f.click(); else if (!$('#modal:not([hidden])')) { X.showMe('attr'); await sleep(80); const b2 = $('#btnReborn'); if (b2) b2.click(); }
    await sleep(280);
  }
  if ((X.st.rebirth || 0) === life0) { R.fails.push('轮回流程点不过去（停在「' + title() + '」；经过：' + seen.join(' → ') + '）'); return R; }
  R.life2 = { origin: X.st.origin, trials: X.st.trials, tick: X.st.tick };
  return R;
}
/* eslint-enable no-undef */

// ---------- 剧情时效 ----------
const LAT_MAX = +(opt('lat') || 2);
const LAT = [
  ['三年之约了结', 'pact', ['s1_pact_after', 's1_pact_lost'], 'qitu'],
  ['天骄榜进前 60', 'rank60', ['s2_rank']], ['击败赵乾', 'zhao', ['s3_zhao_fall'], 'qitu'], ['击败楚天阔', 'chu', ['s5_tiankuo_fall']], ['击退天剑宗', 'war', ['s6_after']],
  ['知真相并击败血无涯', 'truth_xue', ['s7_war']], ['问剑后进前二', 'justice_rank2', ['tianheng_2']],
].concat([1, 2, 3, 4, 5, 6, 7, 8].map(i => [`第 ${i} 章主线完成`, 'm' + (i - 1), ['story_r' + i]]));
function latency(K, picks) {
  const out = [];
  for (const [n, k, evs, origin] of LAT) {
    if (K[k] === undefined) continue;
    const p = picks.find(x => evs.includes(x.id));
    out.push({ n, at: K[k], ev: p ? p.id : '', want: evs.join('/'), t: p ? p.t : null, d: p ? p.t - K[k] : null, opt: !!origin });
  }
  return out;
}
// ---------- 节点这一侧 ----------
const SIM_SRC = fs.readFileSync(path.join(__dirname, 'sim.js'), 'utf8') + '\nmodule.exports.H = { actGuided, actLazy, gearGuided, artLazy, giftGuided, artFor };';
const PROBE_SRC = fs.readFileSync(path.join(__dirname, 'story_probe.js'), 'utf8');
async function inject(page) {
  await page.evaluate(src => { const module = { exports: {} }; const process = { argv: [], hrtime: { bigint: () => 0n } }; const require = () => window.__xm.L; require.main = null; (new Function('module', 'require', 'process', src))(module, require, process); window.__sim = module.exports.H; }, SIM_SRC);
  if (!OLD) await page.evaluate(src => { (new Function(src))(); }, PROBE_SRC);
}
const freshR = () => ({ fails: [], warns: [], months: 0, vsec: 0, titles: {}, invites: [], refused: 0, gated: [], bts: 0, promos: 0, bossUI: 0, stuck: 0, held: 0, autoStops: {}, since: {}, dead: {}, ch: 0, chAt: [0], sectCard: null, joinAt: null, goalText: {}, waitText: {}, goClicks: 0, goDead: [], goTo: {}, s2: 0, keyAt: {}, sq: { home: 0, throttled: 0, free: 0, gap: {}, why: {} } });
async function runCase(browser, c, idx) {
  const ctx = await browser.newContext({ viewport: { width: 400, height: 820 } });
  const page = await ctx.newPage();
  const errs = [];
  if (arg.includes('dbg')) page.on('pageerror', e => console.log(c.id, 'PAGEERROR', e.message, String(e.stack || '').split('\n').slice(0, 4).join(' | ')));
  page.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + String(e.stack || '').split('\n').slice(1, 3).join(' ')));
  if (arg.includes('dbg')) page.on('console', m => { if (m.text().startsWith('BOT ')) console.log(c.id, m.text()); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  const t0 = Date.now();
  let R = freshR();
  const fail = m => { if (!R.fails.includes(m)) R.fails.push(m); };
  try {
    await page.goto('file://' + DIST);
    await page.waitForTimeout(400);
    for (let i = 0; i < 14; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
    await page.click('#goStart'); await page.waitForTimeout(500);
    await page.evaluate(() => { const X = window.__xm; X.setSpeed(3); X.st.guide = { step: 99, done: true }; if (window.__xm_talk) window.__xm_talk.fast = true; if (window.__xm_cine) window.__xm_cine.fast = true; });
    await page.waitForTimeout(600);
    await page.evaluate(() => { const X = window.__xm; if (window.__xm_talk && window.__xm_talk.on) window.__xm_talk.close(); X.closeModal(); });
    await page.waitForTimeout(500);
    // 造开局：旧存档 / 第二世
    if (c.fixture) {
      const raw = JSON.parse(fs.readFileSync(path.join(FIX, c.fixture), 'utf8'));
      const ok = await page.evaluate(s => { const X = window.__xm; const ok = X.loadState(s); if (ok) { X.st.guide = { step: 999, done: true }; X.saveLocal(); } return ok; }, raw);
      if (!ok) fail('旧档读不进来（loadState 返回 false）');
    } else if (c.mk) {
      const ok = await page.evaluate(mk => { const X = window.__xm, L = X.L; const s = L.newState({ name: '验收', rebirth: 1, origin: mk.origin, trials: mk.trials, meta: L.newMeta() }); const ok = X.loadState(JSON.parse(JSON.stringify(s))); if (ok) X.st.guide = { step: 999, done: true }; return ok && X.st.origin === mk.origin; }, c.mk);
      if (!ok) fail('第二世的开局没造出来');
    }
    await page.waitForTimeout(300);
    const start = await page.evaluate(() => ({ tick: window.__xm.st.tick, ch: window.__xm.L.chapterNow(window.__xm.st) }));
    R.ch = start.ch; R.chAt = []; R.chAt[start.ch] = start.tick; R.tick0 = start.tick; R.ch0 = start.ch;
    const until = typeof c.until === 'string' ? start.tick + +c.until.slice(1) : c.until;
    const base = { seed: 7 + idx * 13, strat: c.strat, sect: c.sect, speed: c.speed || 1, picks: c.picks || {}, lose: !!c.lose, talk: !!c.talk, again: !!c.again, goEvery: c.goEvery || 24, holdAsc: !c.soft && c.reach >= 9, life2: c.life2 || 0, dbg: arg.includes('dbg'), poke: arg.includes('poke') };
    let segs = 0, reloadN = 0, lastReloadTick = -99;
    for (;;) {
      await inject(page);
      const cur = await page.evaluate(() => window.__xm.st.tick);
      let untilTick = until;
      if (c.reload) { const nx = cur + c.reload; untilTick = until ? Math.min(until, nx) : nx; }
      const stopAt = c.reloadAt && cur - lastReloadTick >= 2 ? c.reloadAt : '';
      R = await page.evaluate(BOT, Object.assign({}, base, { R, untilTick, stopAt }));
      segs++;
      const doneAll = R.out === 'asc' || R.out === 'death' || R.out === 'stuck' || (until && R.tick >= until);
      if (doneAll) break;
      if (c.reload || R.out === 'stop') {
        // 整页刷新：存档靠每月的 saveLocal；刷新前不额外调任何东西（弹窗开着也照刷）
        const before = await page.evaluate(() => ({ tick: window.__xm.st.tick, sect: !!window.__xm.st.sect, done: Object.keys(window.__xm.st.quest.done).length, title: (document.querySelector('#modal h2') || {}).textContent || '' }));
        if (R.out === 'stop') { R.reloadAtSeen = (R.reloadAtSeen || []).concat([before.title + '@' + before.tick]); lastReloadTick = before.tick; }
        await page.reload(); await page.waitForTimeout(900);
        const after = await page.evaluate(() => { const X = window.__xm; if (!X || !X.st) return null; X.setSpeed(3); return { tick: X.st.tick, sect: !!X.st.sect, done: Object.keys(X.st.quest.done).length, intro: !document.querySelector('#intro').hidden }; });
        reloadN++;
        if (!after) { fail('刷新后没有读出存档'); break; }
        if (after.intro) { fail(`刷新后回到了开场（第 ${before.tick} 月的存档没读出来）`); break; }
        if (after.tick < before.tick - 1) fail(`刷新后月份倒退：${before.tick} → ${after.tick}`);
        if (after.done < before.done) fail('刷新后札记完成数变少');
        if (before.sect && !after.sect) fail('刷新后宗门没了');
        await page.waitForTimeout(700);
      }
      if (segs > 400) { fail('分段太多（> 400）'); break; }
    }
    R.reloads = reloadN;
    if (R.out === 'asc' || R.out === 'death') {
      await inject(page);
      // 结局卡、后日谈一路点过去（天门那场戏 / 再登天门在 BOT 的 drain 里已经按用例点了）
      R = await page.evaluate(BOT, Object.assign({}, base, { R, untilTick: 1, stopAt: '' }));
      R = await page.evaluate(AFTER, Object.assign({}, base, { R }));
      if (c.life2 && R.life2) {
        const r2 = freshR(); r2.ch = 0; r2.chAt = [0];
        await inject(page);
        const b2 = Object.assign({}, base, { sect: { mode: 'first', want: 'jian' }, picks: {}, lose: false, R: r2, untilTick: c.life2, stopAt: '' });
        const q = await page.evaluate(BOT, b2);
        R.life2.played = q.tick; R.life2.fails = q.fails;
        for (const f of q.fails) fail('第二世：' + f);
        if (q.tick < c.life2 - 2) fail(`第二世只走了 ${q.tick} 月（要 ${c.life2}）`);
      }
    }
  } catch (e) { fail('用例抛错：' + e.message.split('\n')[0]); }
  for (const e of errs.slice(0, 4)) fail('页面报错：' + e);
  // ---- 断言 ----
  const reached = R.fin ? 9 : R.chNow;
  if (c.reach !== undefined && c.reach >= 0 && reached < c.reach && !(c.reach >= 9 && R.fin)) fail(`${R.months} 月（境界 ${R.r}，${R.out}）只走到第 ${R.chNow + 1} 章，要求${c.reach >= 9 ? '九章全部做完' : '至少第 ' + (c.reach + 1) + ' 章'}`);
  if (c.advance && R.chNow <= R.ch0 && !R.fin) fail(`读档后 ${R.months} 月章一直停在第 ${R.ch0 + 1} 章`);
  if (c.sect.mode === 'never' && R.sect) fail('用例要求不入宗，却入了宗');
  if (['first', 'story', 'popup'].includes(c.sect.mode) && !R.sect && !(c.mk && c.mk.trials.includes('wuzong')) && c.reach >= 2 && !OLD) fail(`想入宗却一直没入成（${R.months} 月；弹窗 ${R.invites.length} 次，三张帖子第 ${R.s2 || '—'} 月）`);
  if (/^late/.test(c.sect.mode) && !R.sect) fail(`拒了以后再也没入成宗（弹窗 ${R.invites.length} 次，拒 ${R.refused} 次）`);
  if (c.mk && c.mk.trials.includes('wuzong') && R.sect) fail('无宗试炼却入了宗');
  if (c.reloadAt && !(R.reloadAtSeen || []).length) R.warns.push('没碰上要在弹窗开着时刷新的那几种弹窗——这一项没测到');
  if (c.talk && !(R.talkPicks > 0)) fail('对话场景一次也没在真画面里点过选项');
  if (SHOTS && (R.fails.length || R.out === 'stuck')) { try { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, c.id + '.png') }); } catch (e) { /* 截图失败不管 */ } }
  // 剧情时效：关键事件 → 对应那场戏结算，隔了几个月（用户反馈：第三年打完约战，剧情第五年才出）
  const lat = latency(R.keyAt || {}, (R.log && R.log.picks) || []);
  for (const x of lat) if (x.d > LAT_MAX) fail(`剧情滞后：${x.n}（第 ${x.at} 月）→ 剧情「${x.ev}」第 ${x.t} 月才播，隔了 ${x.d} 月（上限 ${LAT_MAX}）`);
  for (const x of lat) if (x.d === null && R.tick - x.at > 12 && !x.opt) fail(`剧情没出：${x.n}（第 ${x.at} 月）之后 ${R.tick - x.at} 月，对应的剧情（${x.want}）一直没播`);
  await ctx.close();
  const chs = (R.chAt || []).map((t, i) => (t === undefined || t === null ? '' : (i + 1) + ':' + t)).filter(Boolean).join(' ');
  const line = `${R.months} 月（${Math.round((Date.now() - t0) / 1000)} 秒，${R.out}），境界 ${R.r}，第 ${R.chNow + 1} 章${R.fin ? '·完' : ''}，${R.sect ? R.sect : '无宗' + (R.lone ? '·散修路' : '')}，入宗 ${(R.log && R.log.joins.join('、')) || '—'}，宗门卡第 ${R.sectCard === null ? '—' : R.sectCard} 月，弹窗第 ${R.invites.slice(0, 4).join('/') || '—'} 月${R.invites.length > 4 ? '…共 ' + R.invites.length + ' 次' : ''}，三张帖子第 ${R.s2 || '—'} 月，章 ${chs}，手表 ${Math.round(R.vsec / 60)} 分钟${R.reloads ? '，刷新 ' + R.reloads + ' 次' : ''}${R.ending ? '，结局 ' + R.ending + '（' + (R.ascFlags || []).join() + '）' : ''}${R.life2 ? '，第二世 ' + JSON.stringify(R.life2) : ''}${R.goClicks ? '，【去】点了 ' + R.goClicks + ' 次' : ''}${lat.length ? '；剧情时效 ' + lat.map(x => x.want.split('/')[0].replace('story_', '') + (x.d === null ? '∅' : '+' + x.d)).join(' ') : ''}`;
  return { id: c.id, d: c.d, fails: R.fails, warns: R.warns, line, R: { onb: R.onb, goalText: R.goalText, waitText: R.waitText, goTo: Object.keys(R.goTo || {}), titles: Object.keys(R.titles || {}), story: R.story, sq: R.sq, qMax: R.qMax, mi: R.mi, lat, keyAt: R.keyAt, autoStops: R.autoStops, gated: R.gated, picks: R.log ? R.log.picks.filter(p => p.where === 'story').map(p => p.id + ':' + p.i + '@' + p.t) : [], eflags: R.eflags, reloadAtSeen: R.reloadAtSeen, endTitles: R.endTitles, bossUI: R.bossUI, promos: R.promos, bts: R.bts, held: R.held } };
}
(async () => {
  const t0 = Date.now();
  if (!fs.existsSync(DIST)) { console.error('没有 ' + DIST + '，先 python3 tools/build.py'); process.exit(2); }
  const all = []; let next = 0;
  // 每个并行位一只浏览器：同一只浏览器里开几个页面，排在后面的页面 requestAnimationFrame 会被节流，突破 / 天劫的过场（靠帧推进）就不走了
  const worker = async () => { for (;;) {
    const i = next++; if (i >= pick.length) return; const c = pick[i]; let r;
    // 每条用例一只新浏览器；浏览器中途没了（长局偶发）重跑一次
    for (let attempt = 0; attempt < 2; attempt++) {
      const browser = await chromium.launch();
      try { r = await runCase(browser, c, CASES.indexOf(c)); } catch (e) { r = { id: c.id, d: c.d, fails: ['跑不起来：' + e.message.split('\n')[0]], warns: [], line: '', R: {} }; }
      await browser.close().catch(() => {});
      if (!r.fails.some(f => /has been closed|跑不起来/.test(f))) break;
    }
    all.push(r); console.log(`${r.fails.length ? 'FAIL' : 'ok  '} ${r.id.padEnd(24)} ${r.line}`); for (const f of r.fails) console.log('       ✗ ' + f);
  } };
  await Promise.all(Array.from({ length: Math.min(JOBS, pick.length) }, worker));
  all.sort((a, b) => CASES.findIndex(c => c.id === a.id) - CASES.findIndex(c => c.id === b.id));
  const bad = all.filter(r => r.fails.length);
  console.log('\n================ 主线可走通性验收（真实界面）================');
  for (const r of all) console.log(`${r.fails.length ? '✗' : '✓'} ${r.id.padEnd(24)} ${r.d}`);
  const warn = {}; for (const r of all) for (const w of r.warns) { const k = w.replace(/\d+/g, 'N'); (warn[k] = warn[k] || { w, ids: [] }).ids.push(r.id); }
  if (Object.keys(warn).length) { console.log('\n警告：'); for (const k of Object.keys(warn).sort((a, b) => warn[b].ids.length - warn[a].ids.length).slice(0, 30)) console.log(`· [${warn[k].ids.length} 局] ${warn[k].w}`); }
  console.log(`\n共 ${all.length} 条，${all.length - bad.length} 通过，${bad.length} 失败；${Math.round((Date.now() - t0) / 1000)} 秒；构建 ${path.relative(ROOT, DIST)}`);
  if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(all, null, 1));
  process.exitCode = bad.length ? 1 : 0;
})().catch(e => { console.error('FAIL', e); process.exit(1); });
