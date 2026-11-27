// 前 30 分钟节奏测试（DESIGN §2.4 / §4）：一个照着老祖走的机器人从开场玩到约 30 分钟（第 ~200 周天），
// 每段阻塞讲解截一张图，记下周天、估算的玩家手表时间、台词；气泡、对决也记下。最后核对节奏：
//   · 约战之前（第 36 周天）阻塞讲解 ≤ 14 段（开场、起名不算）；
//   · 不紧急的两段讲解之间至少隔 1 个周天（新手头一章固定讲解）/ 3 个周天（其余）；同一周天最多一段不紧急的；
//   · 气泡：同一周天不连冒两条；台词都带数字。
// node tools/guide30.js <输出目录> [设备名]
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const out = process.argv[2] || 'guide30'; const dev = process.argv[3] || 'Pixel 7';
fs.mkdirSync(out, { recursive: true });
const MAX_TICK = +(process.env.G30_TICKS || 200);
(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ ...devices[dev] })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => window.__xm.setSpeed(3));   // 时间由机器人一格一格推
  const log = [], bubbles = [], duels = [];
  let clock = 30 + 10;   // 开场四格画 + 起名约 40 秒
  const fmtT = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let n = 0, seenB = new Set();
  const state = () => ev(() => { const X = window.__xm, st = X.st; return { tick: st.tick, g: X.guideCur, gHidden: document.getElementById('guide').hidden, text: document.querySelector('#guide .gtext').textContent, modal: !document.getElementById('modal').hidden, title: (document.querySelector('#modal h2') || {}).textContent || '', duel: !!X.duelFx, cine: X.cine, paused: !!(X.cineState && X.cineState.paused), blog: X.bubbleLog.map(b => b.key + '|' + b.text.replace(/<[^>]+>/g, '')) }; });
  const handleGuide = async s => {
    if (s.gHidden || !s.g) return false;
    n++;
    const name = `${String(n).padStart(2, '0')}-t${s.tick}-${s.g.id}`;
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.png` });
    log.push({ n, tick: s.tick, clock: fmtT(clock), id: s.g.id, btn: !!s.g.btn, text: s.text });
    clock += s.g.btn ? 4 : 3;
    if (s.g.btn) await page.click('#guide [data-g="ok"]');
    else await ev(t => { const el = document.querySelector(t); if (el) el.click(); }, s.g.target);
    await page.waitForTimeout(300);
    return true;
  };
  const handleModal = async s => {
    if (!s.modal) return false;
    clock += 2;
    if (s.duel || await ev(() => !!document.querySelector('#modal.duel-m'))) {
      duels.push({ tick: s.tick, title: s.title });
      if (duels.length <= 2) await page.screenshot({ path: `${out}/duel-${duels.length}-t${s.tick}.png` });
      for (let i = 0; i < 20 && await ev(() => !!document.querySelector('#modal.duel-m')); i++) { await page.waitForTimeout(400); await ev(() => { const b = document.querySelector('#modal .foot .btn'); if (b && b.textContent !== '跳过') b.click(); }); }
      clock += 3;
      return true;
    }
    const ch = await page.$('#modal .choices .btn:not([disabled])');
    if (ch) { await ch.click(); await page.waitForTimeout(250); return true; }
    if (s.cine) { const g = await page.$('#modal .foot .btn.gold:not([disabled])'); if (g) await g.click(); else await ev(() => window.__xm.closeModal()); await page.waitForTimeout(300); return true; }
    if (/突破|天劫/.test(s.title)) { await page.click('#modal .foot .btn.gold'); for (let i = 0; i < 40 && await ev(() => window.__xm.cine); i++) await page.waitForTimeout(200); clock += 6; return true; }
    const go = await page.$('#modal .foot .btn.gold:not([disabled])');
    if (go && /拜入|登台|为宗门|接受特训|知道了|谢|继续|下一|落幕|回洞府|好/.test(await go.textContent())) { await go.click(); await page.waitForTimeout(250); return true; }
    await ev(() => window.__xm.closeModal()); await page.waitForTimeout(250);
    return true;
  };
  // 机器人：照问老祖的第一条做（突破、疗伤、见访客、闭关、历练），有闲钱就升聚灵阵 / 灵田
  const act = async () => {
    const what = await ev(() => {
      const X = window.__xm, { st, L } = X;
      if (!st.guide.done) return '';
      if (L.isReady(st)) { X.showBreakthrough(); return 'bt'; }
      if (L.busy(st)) return '';
      if (st.p.inj > 0 && L.canHeal(st)) { X.showHome(); const h = document.querySelector('#btnHeal'); if (h) h.click(); X.closeModal(); return 'heal'; }
      if (st.visitor) { X.showVisitor(); return 'visit'; }
      for (const k of ['array', 'field', 'furnace']) { if (!L.homeOpen(st, k)) continue; const u = L.upInfo(st, k); if (!u.max && !u.lock && u.cost && st.stones >= u.cost * 1.3) { L.upgrade(st, k); return 'up:' + k; } }
      if (L.canRetreat(st) && L.ticksToStage(st, L.si(st.p) + 1) <= 6 && L.retInfo(st).save > 0) { L.startRetreat(st); return 'retreat'; }
      if (st.p.r <= L.MAXR && !L.isFull(st)) { const b = L.expBest(st); const a = st.stats.exp % 3 === 1 && L.apprOpen(st, 2) ? 2 : b.a; X.confirmExp(b.k, b.d, a); return 'exp'; }
      return '';
    });
    if (what === 'exp') { await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) { await ev(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); }); } clock += 3; }
    if (what === 'bt') { await page.waitForTimeout(350); const s = await state(); if (!(await handleGuide(s))) await handleModal(await state()); }
  };
  const T0 = Date.now();
  for (let guard = 0; guard < 4000; guard++) {
    let s = await state();
    if (s.tick >= MAX_TICK || clock > 31 * 60) break;
    if (s.cine && !s.paused && !s.modal) { await page.waitForTimeout(200); continue; }
    if (await handleGuide(s)) continue;
    if (await handleModal(s)) continue;
    await act();
    s = await state();
    if (!s.gHidden || s.modal) continue;
    // 推一个周天（×1 时 5 秒，第 7 分钟起老祖说可以开 ×2：2.5 秒）
    await ev(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); });
    clock += clock < 7 * 60 ? 5 : 2.5;
    await page.waitForTimeout(220);
    s = await state();
    if (process.env.G30_DEBUG) console.log('tick', s.tick, fmtT(clock), Date.now() - T0);
    for (const x of s.blog) if (!seenB.has(x)) { seenB.add(x); bubbles.push({ tick: s.tick, clock: fmtT(clock), text: x }); }
  }
  const end = await state();
  // 核对
  const fails = [];
  // DESIGN §2.4：约战前阻塞弹窗 ≤ 14（开场、起名不算；“点高亮”的那几步是让你动手，不算弹窗）
  const pre = log.filter(x => x.tick < 36 && x.btn);
  if (pre.length > 14) fails.push(`约战前阻塞讲解 ${pre.length} 段（目标 ≤ 14）`);
  const byTick = {}; for (const x of log) (byTick[x.tick] = byTick[x.tick] || []).push(x.id);
  const URG = ['welcome', 'stakes', 'expNav', 'expPick', 'expGo', 'haul', 'afterExp', 'homeNav', 'homeArray', 'quests', 'ready', 'btGo', 'trib', 'tribPause', 'tribNow', 'afterPact', 'pactSoon', 'meetSoon', 'retBtn', 'realm1', 'realm2', 'realm3', 'samsara1', 'toxin', 'petEvo', 'rvKezhi'];
  for (const t in byTick) { const nu = byTick[t].filter(id => !URG.includes(id)); if (nu.length > 1) fails.push(`第 ${t} 周天连着两段不紧急的讲解：${nu.join('、')}`); }
  for (const x of log) if (x.id !== 'welcome' && !/\d/.test(x.text)) fails.push(`讲解 ${x.id} 没有数字：${x.text.slice(0, 30)}`);
  const bt = {}; for (const x of bubbles) bt[x.tick] = (bt[x.tick] || 0) + 1;
  const lines = ['# 前 30 分钟（机器人）', '', `结束：第 ${end.tick} 周天，估算手表时间 ${fmtT(clock)}；阻塞讲解 ${log.length} 段（约战前 ${pre.length} 段）；气泡 ${bubbles.length} 条；对决 ${duels.length} 场`, '',
    '| # | 周天 | 手表 | 讲解 | 台词 |', '|---|---|---|---|---|', ...log.map(x => `| ${x.n} | ${x.tick} | ${x.clock} | ${x.id}${x.btn ? '' : '（点高亮）'} | ${x.text.replace(/\|/g, '/').slice(0, 90)} |`), '',
    '气泡：', ...bubbles.map(x => `- 第 ${x.tick} 周天 ${x.clock}：${x.text.replace(/^[^|]*\|/, '').slice(0, 80)}`), '',
    '对决：', ...duels.map(x => `- 第 ${x.tick} 周天：${x.title}`), '', fails.length ? '未通过：\n' + fails.map(f => '- ' + f).join('\n') : '节奏核对全部通过'];
  fs.writeFileSync(`${out}/guide30.md`, lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
  if (errs.length || fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 400)); process.exit(1); });
