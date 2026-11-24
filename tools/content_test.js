// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、特训、人物分页
// node tools/content_test.js <输出目录>
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2];
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  const expect = (ok, what) => { if (!ok) errors.push('check: ' + what); };
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
  await page.click('#goStart'); await page.waitForTimeout(400);
  const close = async () => { for (let i = 0; i < 3; i++) { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450); } };
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    window.__xm.setSpeed(3);
    st.guide = { step: 99, done: true }; st.hintSeen = {}; for (const k of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life']) st.hintSeen[k] = 1;
    st.p.r = 3; st.p.t = 6; st.home = { cave: 6, array: 8, field: 8, furnace: 8 }; st.herbs = 500; st.treasure = 4; st.stones = 1e5; st.tick = 130; st.pact = 1; st.beaten.mu = 1; st.flags.maxR = 3; st.flags.maxI = 12; st.stats.exp = 20;
    for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = 3;
    st.bosses = { 0: 1, 1: 1, 2: 1 };
    st.npc = { su: { aff: 72, f60: 1 }, chu: { aff: 35 }, ge: { aff: 10 } }; L.joinSect(st, 'dan'); st.storyQ = [];
  });
  await close();
  const shot = n => page.screenshot({ path: `${out}/${n}.png` });
  // 奇遇
  if (!(await page.evaluate(() => (window.EVENTS || []).length))) await page.evaluate(() => { window.EVENTS = [{ id: 't1', where: 'home', npc: 'su', title: '雨夜访客', text: '雨夜，{su}浑身湿透地敲开洞府的门：“借你的丹炉一用，有人中了奇毒。”', choices: [{ t: '借炉相助', ok: { text: '你们忙了一整夜，人救回来了。', fx: { aff: { su: 12 }, herbs: -2 } } }, { t: '趁机讨价还价', p: 0.5, ok: { text: '对方翻了个白眼，丢下一袋灵草。', fx: { herbs: 6, aff: { su: -5 } } }, fail: { text: '对方转身就走。', fx: { aff: { su: -10 } } } }, { t: '与之切磋', duel: 0.9, ok: { text: '你赢了。', fx: { xp: 5 } }, fail: { text: '你输了。', fx: { inj: 2 } } }] }]; });
  await page.evaluate(() => window.__xm.showChoice((window.EVENTS || [])[0]));
  await page.waitForTimeout(300); await shot('c01-choice');
  await page.click('#modal button[data-c="0"]'); await page.waitForTimeout(300); await shot('c02-outcome');
  await close();
  // 访客：门口的“！”，点它见访客
  const vis = await page.evaluate(() => { const { st, L } = window.__xm; st.visitor = null; const ev = L.spawnVisitor(st); return ev ? ev.id : null; });
  expect(!!vis, '能生成访客');
  await page.waitForTimeout(600); await shot('c02b-visitor');
  await page.evaluate(() => window.__xm.showVisitor()); await page.waitForTimeout(300); await shot('c02c-visitor-event');
  const vb = await page.$('#modal .choices .btn:not([disabled])'); if (vb) { await vb.click(); await page.waitForTimeout(300); }
  expect(await page.evaluate(() => !window.__xm.st.visitor), '见过访客后门口没人了');
  await close();
  // 炼丹
  await page.evaluate(() => window.__xm.showAlchemy()); await page.waitForTimeout(300); await shot('c03-alchemy');
  await page.click('#modal button[data-r="juling"]'); await page.waitForTimeout(1400); await shot('c04-craft');
  await close();
  // 首领：万妖山脉禁地评价过乙
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(300); await shot('c05-exp-boss');
  expect(await page.evaluate(() => !!document.querySelector('#modal .card[data-boss="3"]')), '历练面板出现首领卡');
  await close();
  await page.evaluate(() => window.__xm.fightBossUI(3)); await page.waitForTimeout(1400); await shot('c06-boss');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(200); await close();
  // 九宗会武
  await page.evaluate(() => window.__xm.runSectMeet()); await page.waitForTimeout(300); await shot('c09-meet0');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(1400); await shot('c10-meet1');
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  await close();
  // 宗门：任务板接取与交付
  await page.evaluate(() => { const { st } = window.__xm; st.sect.tasks = [{ ty: 'herbs', n: 24, need: 1, prog: 0, taken: 0, done: 0, rw: 50, bonus: { pills: 1 } }, { ty: 'pill', n: 1, need: 1, prog: 0, taken: 0, done: 0, rw: 50, bonus: { herbs: 10 } }, { ty: 'act', sub: 'retreat', need: 1, prog: 0, taken: 0, done: 0, rw: 50, bonus: { inc: 3 } }]; st.pills = 3; });
  await page.click('[data-nav="sect"]'); await page.waitForTimeout(300); await shot('c11-sect');
  await page.click('#modal [data-tk="0"]'); await page.waitForTimeout(300);
  await page.click('#modal [data-td="0"]'); await page.waitForTimeout(300); await shot('c11b-sect-task');
  expect(await page.evaluate(() => window.__xm.st.sect.tasks[0].done === 1), '宗门任务交付完成');
  await close();
  // 拍卖会
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.r = 3; L.rollAuction(st); }); await page.click('[data-nav="market"]'); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#modal .body').scrollTop = 900); await page.waitForTimeout(100); await shot('c12-auction');
  const au = await page.$('#modal [data-au]:not([disabled])'); if (au) { await au.click(); await page.waitForTimeout(900); }
  await close();
  // 札记
  await page.click('#goal'); await page.waitForTimeout(300); await shot('c13-quests');
  await close();
  // 老祖特训（E17）
  await page.evaluate(() => { const { st, L } = window.__xm; const s2 = L.newState({ name: '特训' }); s2.guide = { step: 99, done: true }; s2.hintSeen = Object.assign({}, st.hintSeen); s2.tick = 30; s2.stats.exp = 3; window.__xm.loadState(s2); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__xm.L.canTrain(window.__xm.st)), '约战前 6 周天、胜算低时可以特训');
  await page.evaluate(() => window.__xm.showTrain()); await page.waitForTimeout(300); await shot('c14-train');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__xm.st.retreat && window.__xm.st.retreat.kind === 'train' && window.__xm.st.retreat.m === 3), '接受特训：4 周天 ×3');
  await close();
  // 人物分页
  for (const t of ['attr', 'bond', 'ach', 'rank']) { await page.evaluate(t => window.__xm.showMe(t), t); await page.waitForTimeout(250); await shot('c07-me-' + t); }
  await close();
  await page.waitForTimeout(3000); await shot('c08-hud');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
