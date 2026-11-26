// 高光过场（docs/COMBAT_LOOT.md §9，src/ui/cine2.js）测试与截图：node tools/cine_test.js <输出目录> ["Pixel 7"|360]
// 截图：每段过场三帧（<输出目录>/<p7|360>-<段>-1..3.png）。断言：
//   · 总时长在标称秒数 ±20%；【跳过】0.3 秒内结束；点一下快进到下一个镜头；长按跳过；字幕不换行、不横向溢出；【跳过】≥ 44px
//   · 开场：第 2 页换成退婚过场；播的时候停表（tick 不走）
//   · 只播一次：同一段第二次触发不再播；在外触发的进队，回洞府后在结算卡之前播；排着的过场在章末卡 / 解锁卡之前
//   · 突破筑基 → 破境 → 结果卡；三年之约 开打前 → 对决 → 赢了 → 打脸过场 → 章末卡
//   · 【仙途 → 记录 → 回忆】看过的可点重看、没看过的是黑的
// 默认（playwright）过场是“快放”的：本脚本把 window.__xm_cine.fast 设为 false 才看得到画面。
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots', 'cine');
const dev = process.argv[3] || 'Pixel 7';
const tag = dev === '360' ? '360' : 'p7';
require('fs').mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const b = await chromium.launch();
  const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  const ev = (fn, a) => page.evaluate(fn, a);
  const on = () => ev(() => window.__xm_cine.on);
  await ev(() => { window.__xm_cine.fast = false; });
  // 版式：跳过按钮 44px、字幕一行、没有横向溢出
  const layout = () => ev(() => {
    const r = document.querySelector('.cn-wrap'); if (!r) return null;
    const sk = r.querySelector('.cn-skip').getBoundingClientRect(), sub = r.querySelector('.cn-sub'), cv = r.querySelector('.cn-cv').getBoundingClientRect(), vw = window.innerWidth;
    const over = [...r.querySelectorAll('*')].some(x => { const b = x.getBoundingClientRect(); return b.width && (b.right > vw + 1 || b.left < -1); });
    return { skW: sk.width, skH: sk.height, subLines: Math.round(sub.getBoundingClientRect().height / parseFloat(getComputedStyle(sub).lineHeight)), subFit: sub.scrollWidth <= vw, subFs: parseFloat(getComputedStyle(sub).fontSize), over, cvW: cv.width, sub: sub.textContent };
  });
  // ---------- 开场 ----------
  for (let i = 0; i < 3 && !(await on()); i++) { await page.click('#intro .story'); await page.waitForTimeout(150); }
  let o = await on();
  check(o && o.id === 'tuihun', `开场第 2 页换成退婚过场（${o && o.id}）`);
  // ---------- 每段三帧 ----------
  const frames = async (id, args, pts) => {
    await ev(([id, a]) => { window.__xm_cine.play(id, a, { recall: true, force: true }); }, [id, args]);   // 不 return：play 返回的 Promise 会让 evaluate 等到播完
    await page.waitForTimeout(120);
    const o = await on(); if (!o) { check(false, `${id}：没播起来`); return; }
    const nom = await ev(id => window.__xm_cine.CINE[id].s, id);
    let lay = null;
    for (let j = 0; j < pts.length; j++) {
      await ev(([i, t]) => window.__xm_cine.seek(i, t), pts[j]); await page.waitForTimeout(120);
      const l = await layout(); if (l && l.sub) lay = l; if (!lay) lay = l;
      await page.screenshot({ path: `${out}/${tag}-${id}${args && args.short ? '_short' : ''}${args && args.win === false ? '_lose' : ''}-${j + 1}.png` });
    }
    const t0 = Date.now(); await page.click('.cn-skip'); let n = 0; while ((await on()) && n++ < 40) await page.waitForTimeout(20);
    const dt = Date.now() - t0;
    if (!(args && (args.short || args.part !== undefined || args.win === false))) check(Math.abs(o.ms / 1000 - nom) <= nom * 0.2, `${id}：${(o.ms / 1000).toFixed(1)} 秒（标称 ${nom}）· ${o.n} 个镜头`);
    check(!(await on()) && dt < 300 + 150, `${id}：【跳过】${dt}ms 内结束`);
    if (lay) check(lay.skW >= 44 && lay.skH >= 44 && lay.subLines <= 1 && lay.subFit && lay.subFs >= 13 && !lay.over, `${id}：跳过 ${Math.round(lay.skW)}×${Math.round(lay.skH)} · 字幕 ${lay.subLines} 行「${lay.sub}」· 画面 ${Math.round(lay.cvW)}px · 溢出 ${lay.over}`);
  };
  // 开场这段：先截三帧，再试点一下快进、长按跳过
  for (const [j, p] of [[0, 2500], [1, 2600], [3, 3000]].entries()) { await ev(([i, t]) => window.__xm_cine.seek(i, t), p); await page.waitForTimeout(150); await page.screenshot({ path: `${out}/${tag}-tuihun-${j + 1}.png` }); }
  let lay0 = await layout();
  check(lay0 && lay0.subLines <= 1 && lay0.subFit && !lay0.over && lay0.skH >= 44, `退婚：字幕一行「${lay0 && lay0.sub}」、跳过 44px`);
  await ev(() => { window.__xm_cine.seek(0, 0); window.__xm_cine.resume(); });
  await page.click('.cn-wrap', { position: { x: 30, y: 200 } }); await page.waitForTimeout(150);
  o = await on(); check(o && o.i === 1, `点一下快进到下一个镜头（第 ${o && o.i + 1} 个）`);
  await page.mouse.move(40, 220); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up(); await page.waitForTimeout(150);
  check(!(await on()), '长按跳过');
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  check(await ev(() => !!window.__xm.st.meta.cine.tuihun), '建档后 st.meta.cine.tuihun = 1');
  await ev(() => window.__xm.setSpeed(0));
  // 停表：播的时候修为（L.flow）不涨；不播时涨
  await ev(() => { const X = window.__xm; X.st.guide.done = true; X.st.guide.step = 999; X.setSpeed(1); });
  const xp = () => ev(() => window.__xm.st.p.xp + window.__xm.st.tick * 1e6);
  let a0 = await xp(); await page.waitForTimeout(800); let a1 = await xp();
  await ev(() => { window.__xm_cine.play('ult', {}, { recall: true, force: true }); });
  const b0 = await xp(); await page.waitForTimeout(1500); const b1 = await xp();
  check(a1 > a0 && b1 === b0 && !!(await ev(() => window.__xm.cine)), `播的时候停表（不播 ${a0.toFixed(2)} → ${a1.toFixed(2)}；播 ${b0.toFixed(2)} → ${b1.toFixed(2)}）`);
  await ev(() => window.__xm_cine.skip()); await page.waitForTimeout(200);
  await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));
  await ev(() => { const X = window.__xm, s = X.st; s.p.look = s.p.look || { hair: '#2a2230', skin: '#f2c9a0', f: 0 }; });
  const list = [
    ['tuihun', {}, [[0, 2500], [2, 2400], [3, 3000]]],
    ['ult', { mob: 'xiong' }, [[0, 1800], [1, 600], [1, 1100]]],
    ['pojing', { r: 1 }, [[0, 2500], [1, 2400], [2, 2000]]],
    ['pojing', { r: 4, short: true }, [[0, 1500], [1, 900], [1, 2500]]],
    ['pact', { win: true }, [[0, 2000], [1, 1300], [2, 3000]]],
    ['pact', { part: 1, win: false }, [[0, 400], [0, 1500], [0, 3000]]],
    ['rzong', { id: 'jian' }, [[0, 2000], [1, 2000], [2, 1500]]],
    ['boss', { k: 0 }, [[0, 450], [1, 200], [1, 1500]]],
    ['rival', { id: 'chu' }, [[0, 1500], [0, 3000], [1, 1500]]],
    ['leijie', {}, [[0, 2500], [2, 1750], [3, 2500]]],
    ['shoushan', {}, [[0, 2500], [1, 2800], [2, 2000]]],
    ['feisheng', {}, [[1, 2500], [2, 6500], [3, 3000]]],
    ['lunhui', {}, [[0, 4000], [1, 1500], [2, 3500]]],
  ];
  for (const [id, a, pts] of list) await frames(id, a, pts);
  // ---------- 只播一次、在外排队、结算卡之前 ----------
  await ev(() => { const X = window.__xm; X.closeModal(); });
  const q1 = await ev(() => { const X = window.__xm, C = window.__xm_cine; X.L.startExp(X.st, 0, 0, 0); C.playCine('boss', { k: 1 }); return { on: !!C.on, q: C.queue, exp: !!X.st.exp }; });
  check(q1.exp && !q1.on && q1.q.includes('boss:1'), `在外触发的首领过场不当场播，进队（${q1.q.join(',')}）`);
  await ev(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); }); await page.waitForTimeout(600);
  const r1 = await ev(() => ({ on: window.__xm_cine.on, modal: !document.getElementById('modal').hidden }));
  check(r1.on && r1.on.key === 'boss:1' && !r1.modal, `回洞府：先播排着的过场（${r1.on && r1.on.key}），结算卡等着`);
  await page.screenshot({ path: `${out}/${tag}-flow-boss-home.png` });
  await page.click('.cn-skip'); await page.waitForTimeout(700);
  const r2 = await ev(() => (document.querySelector('#modal h2') || {}).textContent || '');
  check(/历练归来|翻牌/.test(r2), `过场之后是结算卡 / 翻牌（${r2}）`);
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(500);
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(300);
  const again = await ev(() => { const C = window.__xm_cine; C.playCine('boss', { k: 1 }); return { on: !!C.on, q: C.queue }; });
  check(!again.on && !again.q.length, '同一段第二次触发不再播');
  // 在外：戒中剑意当场播（战斗画面里）
  const u1 = await ev(() => { const X = window.__xm, C = window.__xm_cine; X.L.startExp(X.st, 0, 0, 0); C.playCine('ult', {}); return { on: C.on && C.on.id, exp: !!X.st.exp }; });
  check(u1.exp && u1.on === 'ult', '在外：戒中剑意当场播');
  await ev(() => window.__xm_cine.skip());
  await ev(() => { const X = window.__xm; X.st.exp = null; X.closeModal(); }); await page.waitForTimeout(300);
  // ---------- 突破筑基：破境过场 → 结果卡 ----------
  await ev(() => { const X = window.__xm, s = X.st; while (!document.getElementById('modal').hidden) X.closeModal(); s.p.r = 0; s.p.s = 3; s.p.xp = X.L.pNeed(s.p); s.p.inj = 0; X.showBreakthrough(); });
  await page.waitForTimeout(300);
  await page.click('#modal .foot .btn.gold');
  let bo = null; for (let i = 0; i < 30 && !bo; i++) { await page.waitForTimeout(250); bo = await on(); }
  check(bo && bo.id === 'pojing' && bo.n === 3, `突破筑基 → 破境全版（${bo && bo.id} · ${bo && bo.n} 镜）`);
  await page.waitForTimeout(500); await page.screenshot({ path: `${out}/${tag}-flow-pojing.png` });
  await page.click('.cn-wrap', { position: { x: 30, y: 200 } }); await page.waitForTimeout(120);
  await page.click('.cn-skip'); await page.waitForTimeout(400);
  const bt = await ev(() => (document.querySelector('#modal h2') || {}).textContent || '');
  check(/突破成功/.test(bt), `破境之后是结果卡（${bt}）`);
  await ev(() => window.__xm.closeModal()); await page.waitForTimeout(500);
  for (let i = 0; i < 6; i++) { const t = await ev(() => { const C = window.__xm_cine; if (C.on) C.skip(); const m = document.getElementById('modal'); if (!m.hidden) window.__xm.closeModal(); return C.queue.length; }); await page.waitForTimeout(450); if (!t) break; }
  // ---------- 三年之约：开打前 → 对决 → 打脸 → 章末卡 ----------
  await ev(() => { const X = window.__xm, s = X.st; while (!document.getElementById('modal').hidden) X.closeModal(); s.p.r = 1; s.bonus.atk = 1e6; X.runPact(); });
  await page.waitForTimeout(400);
  const p0 = await on(); check(p0 && p0.key === 'pact0', `约战开打前：对视（${p0 && p0.key}）`);
  await page.click('.cn-skip'); await page.waitForTimeout(600);
  const dm = await ev(() => (document.querySelector('#modal h2') || {}).textContent || '');
  check(/三年之约/.test(dm), `然后是约战（${dm}）`);
  for (let i = 0; i < 20; i++) { const d = await ev(() => !!window.__xm.duelFx); if (!d) break; await ev(() => window.__xm.duelSkip()); await page.waitForTimeout(300); }
  await page.waitForTimeout(400);
  await page.click('#modal .foot .btn'); await page.waitForTimeout(700);
  const p1 = await on(); check(p1 && p1.key === 'pact1' && p1.n === 2, `赢了：打脸 + 休书（${p1 && p1.key} · ${p1 && p1.n} 镜）`);
  await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${tag}-flow-pact1.png` });
  await page.click('.cn-skip'); await page.waitForTimeout(1600);
  const ch = await ev(() => (document.querySelector('#modal h2') || {}).textContent || '');
  console.log('       约战之后：' + (ch || '（无弹窗）'));
  check(/章.*完/.test(ch), `约战打脸之后才是章末卡（${ch}）`);
  await ev(() => { while (!document.getElementById('modal').hidden) window.__xm.closeModal(); });
  for (let i = 0; i < 6; i++) { const t = await ev(() => { const C = window.__xm_cine; if (C.on) C.skip(); const m = document.getElementById('modal'); if (!m.hidden) window.__xm.closeModal(); return C.queue.length + (m.hidden ? 0 : 1); }); await page.waitForTimeout(450); if (!t) break; }
  // ---------- 首领首杀（洞府里的首领对决）：对决 → 斩首领过场 → 翻牌 / 结果 ----------
  await ev(() => { const X = window.__xm, s = X.st; s.bosses[2] = 0; s.bonus.atk = 1e7; X.fightBossUI(2); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 20; i++) { const d = await ev(() => !!window.__xm.duelFx); if (!d) break; await ev(() => window.__xm.duelSkip()); await page.waitForTimeout(300); }
  await page.waitForTimeout(300);
  await page.click('#modal .foot .btn'); await page.waitForTimeout(600);
  const bk = await on(); check(bk && bk.key === 'boss:2', `首领首杀：对决之后先播斩首领（${bk && bk.key}）`);
  await page.click('.cn-skip'); await page.waitForTimeout(600);
  const bf = await ev(() => (document.querySelector('#modal h2') || {}).textContent || '');
  console.log('       斩首领之后：' + (bf || '（无弹窗）'));
  await ev(() => { while (!document.getElementById('modal').hidden) window.__xm.closeModal(); });
  // ---------- 回忆 ----------
  await ev(() => window.__xm.showRecord()); await page.waitForTimeout(300);
  check(!!(await page.$('#kCine')), '【仙途 → 记录】有“回忆”');
  await page.click('#kCine'); await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${tag}-recall.png` });
  const rc = await ev(() => ({ n: document.querySelectorAll('[data-cn]').length, on: document.querySelectorAll('[data-cn]:not([disabled])').length, over: [...document.querySelectorAll('#modal *')].some(x => { const b = x.getBoundingClientRect(); return b.width && (b.right > window.innerWidth + 1 || b.left < -1); }), small: [...document.querySelectorAll('#modal .cn-tile, #modal .cn-tile *')].filter(x => x.childNodes.length && [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(x).fontSize) < 13.9).length, minH: Math.min(...[...document.querySelectorAll('[data-cn]')].map(x => x.getBoundingClientRect().height)) }));
  check(rc.n === 11 && rc.on >= 5 && !rc.over && !rc.small && rc.minH >= 44, `回忆：${rc.n} 格、看过的 ${rc.on} 格可点、溢出 ${rc.over}、小字 ${rc.small}、最矮 ${Math.round(rc.minH)}px`);
  await page.click('[data-cn="pojing"]'); await page.waitForTimeout(400);
  const rp = await on(); check(rp && rp.id === 'pojing', '回忆里点了重看');
  await page.click('.cn-skip'); await page.waitForTimeout(300);
  check(await ev(() => !document.getElementById('modal').hidden && !!document.querySelector('.cn-rc')), '看完回到回忆页');
  check(!errs.length, '无报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));
  console.log(fails.length ? `\n${fails.length} 项没过` : '\n全部通过');
  await b.close();
  process.exit(fails.length ? 1 : 0);
})();
