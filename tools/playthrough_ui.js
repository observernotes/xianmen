// 主线通关测试（真实界面）：Playwright 打开 dist/index.html，从开局一路玩到第九章或飞升，看主线在界面上是不是每一章都走得通（docs/STORY_PLAN.md §12）。
// node tools/playthrough_ui.js [路线,…|all] [并行数=3] [每章上限月=200]
//   路线：guided 普通出身照目标卡玩 · sanxiu 散修丹师出身（不入宗）· nosect 三张帖子都不理（选“哪家也不去”、弹窗一律【再想想】）
//         pactlose 约战输了 · wuzong 无宗试炼 · random 随机选择（剧情、弹窗、上门都随手点）· oldsave 2.3.2 旧档（散修第三章、赵乾没打）读进来接着玩
// 主线上的每一步都只点界面：剧情抉择点弹窗里的选项、入宗点“三张帖子”或三宗争徒弹窗或宗门页【投帖】、晋升点目标卡【去】再点高亮的【晋升】、
//   宿敌点目标卡【去】进宿敌卡再点【下战书】、上门点【应战】、论道 / 会武 / 来犯 / 约战都是弹窗里点【登台】【跳过】；不调 L.joinSect / L.tournament / L.promote 这类逻辑捷径。
// 测试钩子：时间用 L.flow + __xm.onTick() 逐月快进（和 longrun.js 一样）；转世出身、天道试炼、旧档用 __xm.loadState 装进去；约战输了那条在约战前把慕容的战力调高；
//   修炼的杂事（买破境丹、升聚灵阵、选历练地图）照 longrun.js 用逻辑层算好再点界面的出发 / 突破，或直接买。
// 每局断言：每章在“每章上限月”内推进（记下每章用时）；目标卡【去】指到主线一步时，打开的面板里真有那个按钮；全程无报错；走到第九章或飞升。
const { chromium } = require('playwright');
const path = require('path');
const arg = process.argv.slice(2);
const ALL = ['guided', 'sanxiu', 'nosect', 'pactlose', 'wuzong', 'random', 'oldsave'];
const routes = !arg[0] || arg[0] === 'all' ? ALL : arg[0].split(',');
const PAR = +arg[1] || 3, CAP = +arg[2] || 200, MAXT = +process.env.PT_MAXT || 1150;

async function play(route, seed) {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 412, height: 860 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' ')));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.text().startsWith('PT ')) console.log(`[${route}] ` + m.text().slice(3)); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 40; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(150); }
  await page.click('#goStart', { timeout: 60000 });
  await page.waitForTimeout(500);
  const t0 = Date.now();
  const beat = process.env.PT_BEAT ? setInterval(() => { page.evaluate(() => JSON.stringify(window.__pt || null)).then(v => console.log(`[${route}] ♥ ${v}`), () => {}); }, 15000) : null;
  let res;
  try {
    res = await page.evaluate(async cfg => {
      const X = window.__xm, L = X.L, R = cfg.route;
      let s = cfg.seed * 9301 + 49297; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const modal = () => !document.getElementById('modal').hidden;
      const mark = w => { const c = X.cineState; window.__pt = { w, tick: X.st && X.st.tick, t: title(), cine: !!X.cine, ck: c ? Object.keys(c).slice(0, 6).join(',') + ':' + (c.kind || c.k || c.type || c.id || '') : '' }; };
      const title = () => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent : ''; };
      const log = m => console.log('PT ' + m);
      X.setSpeed(X.pauseIdx);   // 时间由下面逐月推进
      window.__xm_talk.fast = true; window.__xm_cine.fast = true;   // 对话、过场快放（走弹窗）
      // ---------- 局面 ----------
      if (R === 'sanxiu' || R === 'wuzong') {
        const st0 = L.newState({ name: '测试', rebirth: 1, origin: R === 'sanxiu' ? 'sanxiu' : 'qitu', trials: R === 'wuzong' ? ['wuzong'] : [], meta: L.newMeta() });
        X.loadState(JSON.parse(JSON.stringify(st0)));
      }
      X.st.guide = { step: 99, done: true };
      const pactPow = L.PACT_POWER; if (R === 'pactlose') L.PACT_POWER = 1e12;
      const noSect = R === 'sanxiu' || R === 'nosect' || R === 'wuzong' || R === 'oldsave';
      const stat = { chAt: [0], goMain: 0, goMiss: [], joins: 0, promos: 0, chals: 0, visits: 0, invites: 0, hints: 0, eases: 0, tours: 0, story: 0, picks: {}, pactLost: false, rescue: null, res: {}, km: { cl: [], join: undefined } };
      // ---------- 弹窗：按路线的选法 ----------
      const evOf = () => { const c = document.querySelector('#modal .choices[data-ev]'); return c ? L.eventById(c.dataset.ev) : null; };
      async function pickStory(ev, btns) {
        const fx = b => (ev.choices[+b.dataset.c].ok || {}).fx || {};
        let b = null;
        if (ev.id === 's2_invite') {
          if (R === 'random') b = btns[Math.floor(rnd() * btns.length)];
          else if (noSect) b = btns.find(x => [].concat(fx(x).flag || []).includes('path_san'));
          else b = btns.find(x => fx(x).join === 'jian') || btns[0];
          stat.picks.s2_invite = b && ev.choices[+b.dataset.c].t;
        } else if (R === 'random' || R === 'nosect') b = btns[Math.floor(rnd() * btns.length)];
        else b = btns[0];
        if (ev.where === 'story') { stat.story++; if (stat.res[ev.id] === undefined) stat.res[ev.id] = X.st.tick; }
        b.click();
      }
      async function drain() {
        for (let g = 0; g < 400; g++) {
          mark('drain' + g);
          if (document.querySelector('#tribPause')) { const go = document.querySelector('#modal .foot .btn.gold'); if (go) go.click(); await sleep(60); continue; }
          if (X.cine) { await sleep(80); continue; }
          if (X.duelFx && !X.duelFx.ended) { X.duelSkip(); await sleep(40); continue; }
          const gd = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (gd) { gd.click(); await sleep(30); continue; }
          if (!modal()) { await sleep(25); if (!modal() && !X.cine) return; continue; }
          const t = title();
          if (cfg.dbg) { const now = performance.now(); if (window.__ptLast && now - window.__ptLast.at > 1500) log(`slow ${Math.round(now - window.__ptLast.at)}ms after “${window.__ptLast.t}” → “${t}” @${X.st.tick}`); window.__ptLast = { at: now, t }; }
          const unl =document.querySelector('#unlOk'); if (unl) { unl.click(); await sleep(60); X.closeModal(); await sleep(40); continue; }
          const chs = [...document.querySelectorAll('#modal .choices .btn:not([disabled])')];
          if (chs.length) { const ev = evOf(); if (ev) await pickStory(ev, chs); else chs[Math.floor(rnd() * chs.length)].click(); await sleep(50); continue; }
          const foot = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')];
          // 三宗争徒：入宗的路线挑一家【拜入】，不入宗的【再想想】
          if (/宗争徒/.test(t)) { stat.invites++; const join = !noSect && (R !== 'random' || rnd() < 0.5); if (join) { const c = document.querySelector('#modal .cand'); if (c) c.click(); await sleep(20); foot[foot.length - 1].click(); stat.joins++; } else foot[0].click(); await sleep(60); continue; }
          // 宿敌上门：应战（随机路线一半改日）
          if (/上门$/.test(t)) { stat.visits++; const go = R !== 'random' || rnd() < 0.5; const b = go ? foot.find(x => /应战/.test(x.textContent)) : foot.find(x => /改日/.test(x.textContent)); (b || foot[0]).click(); if (go && b) stat.chals++; await sleep(60); continue; }
          if (t === '戒中老祖' && document.querySelector('#modal .foot')) { if (/封顶|放宽|破格|不再要求|弃权|少打/.test(document.querySelector('#modal .body').textContent)) stat.eases++; else stat.hints++; foot[0].click(); await sleep(40); continue; }
          if (/天骄论道|论道/.test(t)) stat.tours += /对决准备/.test(t) ? 0 : 0;
          const cand = document.querySelector('#modal .cand:not(.hide):not(.sel)');
          if (cand && !document.querySelector('#modal .cand.sel')) { cand.click(); await sleep(30); continue; }
          if (document.querySelector('#modal [data-gcmp]')) { const c = document.querySelector('#modal [data-gcmp]'); const b = c.dataset.better === '1' ? c.querySelector('[data-geq]') : c.querySelector('[data-gsm]'); if (b) { b.click(); await sleep(30); continue; } }
          if (!foot.length) { X.closeModal(); await sleep(60); continue; }
          const back = foot.find(b => b.textContent === '回洞府');
          (back || foot[foot.length - 1]).click();
          await sleep(40);
        }
      }
      // 目标卡【去】：指到主线一步（why = 'main'）时，点它，再点高亮的那个按钮——按钮不在就记一笔
      async function goMain() {
        const g = L.goalNow(X.st), nx = g && g.next;
        if (!nx || nx.why !== 'main') return false;
        if (nx.k === 'main:join' && noSect) return false;
        document.querySelector('#gGo').click(); await sleep(120);
        const el = nx.hl && document.querySelector(nx.hl);
        stat.goMain++;
        if (!el) { stat.goMiss.push(`${X.st.tick}:${nx.k}:${nx.hl}`); X.closeModal(); await sleep(40); return false; }
        if (nx.k === 'main:join') { const b = document.querySelector('#modal [data-join="jian"]:not([disabled])') || el; b.click(); stat.joins++; }
        else el.click();
        if (/chal/.test(nx.k)) { stat.chals++; await sleep(80); const go = document.querySelector('#btnChalGo:not([disabled])'); if (go) go.click(); else stat.goMiss.push(`${X.st.tick}:${nx.k}:准备页没有【下战书】`); }
        if (/promo/.test(nx.k)) stat.promos++;
        await sleep(60); await drain();
        return true;
      }
      // 宗门任务板：接、交（点界面）
      async function sectTasks() {
        if (!X.st.sect) return;
        X.showSect('task'); await sleep(30);
        for (let k = 0; k < 4; k++) { const b = document.querySelector('#modal [data-td]') || document.querySelector('#modal [data-tk]:not([disabled])'); if (!b) break; b.click(); await sleep(30); if (!modal()) break; }
        if (modal()) X.closeModal(); await sleep(30); await drain();
      }
      const W = { array: 1, field: 1.25, furnace: 1.8, cave: 2.4, room: 2.2, vault: 2.4, library: 2.6, forge: 2.6, pen: 3, spring: 3.2, pavilion: 4, portal: 4 };
      let trips = 0, uiBt = 0, lastCh = L.chapterNow(X.st), lastLog = 0;
      if (R === 'oldsave') {
        // 2.3.2 的散修档：第三章（赵乾）、没有 st.story / st.mainG / 三张帖子；卡了 150 月
        const st0 = L.newState({ name: '测试', rebirth: 1, origin: 'sanxiu', trials: [], meta: L.newMeta() });
        for (let i = 0; i < 230; i++) { L.flow(st0, 1); L.tick(st0); if (st0.tick === L.PACT_TICK) { st0.pact = 1; st0.beaten.mu = 1; } st0.storyQ.length = 0; st0.exp = null; }
        st0.quest.done.c0_m = 1; st0.quest.done.c1_m = 1; for (let i = 2; i < 9; i++) delete st0.quest.done['c' + i + '_m'];
        st0.bestRank = Math.min(st0.bestRank, 58); st0.bosses = { 0: 1, 1: 1 }; delete st0.beaten.zhao;
        delete st0.mainG; delete st0.story; delete st0.evDone.s2_invite; st0.flags.inviteAt = 0; st0.path = { ch: 2, at: [{ t: 0 }, { t: 36 }, { t: st0.tick - 150 }], best: [] };
        X.loadState(JSON.parse(JSON.stringify(st0))); X.st.guide = { step: 99, done: true };
        stat.rescue = { e: L.mainEase(X.st), ch: L.chapterNow(X.st), invite: X.st.flags.inviteAt <= X.st.tick, rescue: X.st.mainG && X.st.mainG.rescue };
        stat.chAt = []; stat.chAt[2] = X.st.tick; lastCh = 2; stat.t0 = X.st.tick;
      }
      for (let n = 0; n < cfg.maxT; n++) {
        const st = X.st;
        if (!st || st.p.r >= 9) break;
        mark('loop');
        const ch = L.chapterNow(st);
        if (ch !== lastCh) { for (let i = lastCh + 1; i <= ch; i++) stat.chAt[i] = st.tick; lastCh = ch; log(`第 ${ch + 1} 章 @${st.tick} 月 境界 ${st.p.r} 宗门 ${st.sect ? st.sect.id + st.sect.rank : '-'} 榜 ${st.bestRank}`); }
        if (st.tick - lastLog >= cfg.logEvery) { lastLog = st.tick; log(`… ${st.tick} 月 第 ${ch + 1} 章 境界 ${st.p.r} 进度 ${(L.goalNow(st).bar || {}).text} 降级 ${L.mainEase(st)} 下一步 ${((L.goalNow(st) || {}).next || {}).t}/${((L.goalNow(st) || {}).next || {}).why}`); }
        if (R === 'pactlose' && st.pact) { if (st.pact < 0) stat.pactLost = true; L.PACT_POWER = pactPow; }
        if (st.p.inj > 0 && L.canHeal(st)) L.heal(st);
        // 突破：点界面
        if (L.isReady(st) && !L.busy(st)) {
          while (st.pills < 3 && st.stones > L.price(st, 'pill') * 2 && !L.btGuard(st)) L.buy(st, 'pill');
          // 突破的过场在无头浏览器里按真实时间放（机器忙时一场几分钟），照 longrun.js 直接结算（PT_UIBT=1 时筑基那一回点界面；修炼不是主线，心魔劫照样当剧情弹）
          if (cfg.uiBt && uiBt < 1 && !L.tribNeeded(st)) {
            uiBt++; X.showBreakthrough(); await sleep(30);
            for (const b of [...document.querySelectorAll('#modal [data-aid]:not([disabled])')]) if (!b.closest('.aid').classList.contains('on')) { b.click(); await sleep(20); }
            const go = document.querySelector('#modal .foot .btn.gold:not([disabled])'); if (go) go.click(); else X.closeModal();
          } else {
            while (L.tribNeeded(st) && st.pills < 5 && st.stones > L.price(st, 'pill') * 2) L.buy(st, 'pill');
            const pre = L.tribPre(st); if (pre) { X.showTribStory(pre, () => X.closeModal()); await sleep(40); await drain(); }
            L.breakthrough(st, Math.min(3, st.pills), { aids: 'all', extra: 'all' });
          }
          await sleep(40); await drain();
          if (X.st.p.r >= 9) break;
        }
        // 修炼的杂事
        for (let k = 0; k < 20; k++) { const o = L.HOME.filter(b => L.homeOpen(st, b.k) && st.home[b.k] < b.max && W[b.k] && !(b.nu && !st.home[b.k])).map(b => [b.k, L.hCost(b.k, st.home[b.k])]).sort((a, b) => a[1] * W[a[0]] - b[1] * W[b[0]]); if (!o.length || !L.upgrade(st, o[0][0])) break; }
        if (st.pills < 2 && st.stones > L.price(st, 'pill') * 4) L.buy(st, 'pill');
        if (L.lifeLow(st) && L.marketOpen(st, 'life') && st.stones > L.price(st, 'life')) L.buy(st, 'life');
        if (st.home.furnace) for (const k of ['xisui', 'jiuzhuan', 'juling', 'pojing']) if (!L.canCraft(st, k) && (k !== 'jiuzhuan' || st.p.r >= 5)) { L.craft(st, k); break; }
        if (L.tunaReady(st)) L.tuna(st);
        L.gearAutoAll(st);
        // 主线：目标卡【去】
        if (!L.busy(st) && !modal()) await goMain();
        if (n % 6 === 3 && !L.busy(st) && !modal()) await sectTasks();
        // 首领：打得过就打（点界面）
        if (!L.busy(st) && !modal()) for (let k = 0; k < L.REGIONS.length; k++) if (L.bossReady(st, k) && L.duelChance(L.power(st), L.bossPower(k)) > 0.6) { X.fightBossUI(k); await drain(); break; }
        // 出门：闭关或历练（点界面的出发）
        if (!L.busy(st) && !L.isReady(st) && !L.isFull(st) && st.p.inj <= 0 && !modal()) {
          if (trips >= 2 && L.canRetreat(st)) { trips = 0; L.startRetreat(st); }
          else { const c = L.expBest(st, 0); if (c) { X.showExp(); await sleep(20); if (document.querySelector('#modal .choices')) { stat.storyAtDoor = (stat.storyAtDoor || 0) + 1; await drain(); } else X.confirmExp(c.k, c.d, c.a); await sleep(20); const go = document.querySelector('#modal .foot .btn.gold'); if (go) go.click(); await sleep(40); if (X.st.exp) trips++; else X.closeModal(); } }
        }
        L.flow(st, 1);
        X.onTick();
        await drain();
        // 关键事件发生的月份（高潮条件第一次成立、入宗）：对应的剧情要立刻接上
        for (let c = 0; c < 9; c++) if (stat.km.cl[c] === undefined) { let ok = false; try { ok = L.STORY_CLIMAX[c](st); } catch (e) { ok = false; } if (ok) stat.km.cl[c] = st.tick; }
        if (stat.km.join === undefined && st.sect) stat.km.join = st.tick;
        if (stat.t0 !== undefined && stat.foeAt === undefined && st.mainG && (st.beaten.zhao || stat.visits)) stat.foeAt = st.tick - stat.t0;
        if (cfg.dbg > 1 && st.tick < 60) log(`dbg t${st.tick} exp=${!!st.exp}${st.exp ? '/' + st.exp.left + '/c' + (st.exp.chain || 0) : ''} ret=${!!st.retreat} q=${st.storyQ.length} canInt=${L.canInterrupt(st)} last=${st.clk && st.clk.last} modal=${modal()}`);
      }
      const st = X.st;
      // 关键事件 → 剧情的延迟：事件那个月（章还没到的，从进这一章那个月）到挂在高潮节拍上的戏播完
      stat.lag = [];
      for (let c = 0; c < 9; c++) {
        const T = stat.km.cl[c]; if (T === undefined || stat.chAt[c] === undefined) continue;
        const t0 = Math.max(T, stat.chAt[c]), id = 'c' + (c + 1) + '_climax', bt = (st.story && st.story.beat || {})[id];
        const evs = L.events().filter(e => e.where === 'story' && e.trigger === 'sb:' + id && stat.res[e.id] !== undefined);
        const done = evs.length ? Math.min(...evs.map(e => stat.res[e.id])) : null;
        stat.lag.push({ id, ev: t0, beat: bt, shown: done, scene: evs.map(e => e.id).join('/') });
      }
      if (stat.km.join !== undefined) stat.lag.push({ id: 'join', ev: stat.km.join, beat: stat.km.join, shown: stat.res.story_sect === undefined ? null : stat.res.story_sect, scene: 'story_sect' });
      stat.beat = JSON.stringify((st.story || {}).beat); stat.storyQ = st.storyQ.join(); stat.storyIds = Object.keys(st.evDone).filter(id => (L.eventById(id) || {}).where === 'story');
      return Object.assign(stat, { tick: st.tick, r: st.p.r, ch: L.chapterNow(st), asc: st.p.r >= 9, sect: st.sect ? st.sect.id : '', lone: L.loneRoute(st), path_san: !!st.eflags.path_san, ease: L.mainEase(st), ending: st.p.r >= 9 ? L.endingOf(st).id : '' });
    }, { route, seed, maxT: MAXT, logEvery: +process.env.PT_LOG || 120, dbg: +process.env.PT_DBG || 0, uiBt: !!process.env.PT_UIBT });
  } catch (e) { res = { err: e.message }; }
  if (beat) clearInterval(beat);
  await browser.close();
  return { route, res, errors, sec: Math.round((Date.now() - t0) / 1000) };
}

(async () => {
  const T0 = Date.now(), out = [], queue = routes.slice();
  await Promise.all(Array.from({ length: Math.min(PAR, queue.length) }, async () => { while (queue.length) { const r = queue.shift(); const x = await play(r, 1 + ALL.indexOf(r)); out.push(x); console.log(`[${r}] 完 ${x.sec} 秒`); } }));
  const fails = [];
  const N = '一二三四五六七八九';
  console.log('\n主线通关（真实界面）：');
  for (const r of routes) {
    const x = out.find(y => y.route === r), s = x.res || {}, F = m => fails.push(`[${r}] ${m}`);
    if (s.err) { F('脚本出错：' + s.err); continue; }
    const dur = []; let prev = s.chAt.findIndex(v => v !== undefined && v !== null);
    for (let i = prev + 1; i < 9; i++) { if (s.chAt[i] === undefined || s.chAt[i] === null) break; dur.push(`${N[i - 1]}${s.chAt[i] - s.chAt[i - 1]}`); if (s.chAt[i] - s.chAt[i - 1] > CAP) F(`第${N[i - 1]}章用了 ${s.chAt[i] - s.chAt[i - 1]} 月（> ${CAP}）`); prev = i; }
    const last = s.asc ? s.tick : s.tick; const lastCh = s.ch;
    if (!s.asc) { const since = s.tick - (s.chAt[lastCh] || 0); dur.push(`${N[lastCh]}${since}+`); if (since > CAP) F(`第${N[lastCh]}章卡了 ${since} 月（> ${CAP}）`); }
    else dur.push(`${N[8]}${s.tick - (s.chAt[8] || s.tick)}（飞升）`);
    if (!(s.asc || s.ch >= 8)) F(`${s.tick} 月只走到第${N[s.ch]}章`);
    if (s.goMiss.length) F('目标卡【去】指到的按钮不在：' + s.goMiss.slice(0, 4).join('、'));
    const LAG = 1;
    for (const g of s.lag || []) { if (g.beat !== undefined && g.beat >= 0 && g.beat - g.ev > LAG) F(`${g.id}：事件在第 ${g.ev} 月，节拍第 ${g.beat} 月才放（> ${LAG}）`); if (g.shown !== null && g.shown - g.ev > LAG) F(`${g.id}：事件在第 ${g.ev} 月，${g.scene} 第 ${g.shown} 月才播（> ${LAG}）`); }
    if (x.errors.length) F('页面报错：' + x.errors.slice(0, 3).join(' | '));
    if (['sanxiu', 'nosect', 'wuzong'].includes(r) && s.sect) F('不入宗的路线入了宗');
    if (r === 'nosect' && !/哪家也不去/.test(s.picks.s2_invite || '')) F(`三张帖子没选“哪家也不去”（${s.picks.s2_invite}）`);
    if (r === 'pactlose' && !s.pactLost) F('约战没输（局面没造出来）');
    if (r === 'guided' && !s.sect) F('照引导玩却没入宗');
    if (r === 'oldsave') { if (!s.rescue || !s.rescue.rescue || !s.rescue.invite) F('旧档读进来没救场（' + JSON.stringify(s.rescue) + '）'); if (!(s.visits > 0)) F('旧档读进来赵乾没上门'); }
    if (process.env.PT_LOG) console.log('  剧情：' + (s.storyIds || []).join(' ') + ' 节拍 ' + s.beat + ' 队列 ' + s.storyQ);
    console.log(`  ${r.padEnd(9)} ${s.asc ? '飞升' : '第' + N[s.ch] + '章'} ${s.tick} 月 境界 ${s.r}${s.ending ? ' 结局 ' + s.ending : ''} · ${s.sect ? '宗门 ' + s.sect : s.lone ? '散修' : '无宗门'} · 每章用时 ${dur.join(' ')} · 目标卡主线一步 ${s.goMain} 次 · 入宗 ${s.joins} · 晋升 ${s.promos} · 下战书 ${s.chals} · 上门 ${s.visits} · 帖子弹窗 ${s.invites} · 老祖提示 ${s.hints} · 降要求 ${s.eases} · 剧情 ${s.story} 场 · 关键事件→剧情 ${(s.lag || []).filter(g => g.shown !== null).map(g => g.id.replace('_climax', '') + '+' + (g.shown - g.ev)).join(' ')} · ${x.sec} 秒${s.rescue ? ' · 旧档：读档即降到 ' + s.rescue.e + ' 级、补帖 ' + s.rescue.invite : ''}`);
  }
  console.log(`共 ${routes.length} 局，${Math.round((Date.now() - T0) / 1000)} 秒`);
  if (fails.length) { console.log(`失败 ${fails.length} 条：`); for (const f of fails) console.log('  ✗ ' + f); process.exit(1); }
  console.log('主线通关测试通过');
})();
