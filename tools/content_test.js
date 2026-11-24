// 内容系统界面测试：奇遇选项、炼丹、首领、人物分页、剧情队列
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
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(120); }
  await page.click('#goStart'); await page.waitForTimeout(400);
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.r = 3; st.p.t = 6; st.home = { cave: 6, array: 8, field: 8, furnace: 8 }; st.herbs = 500; st.treasure = 4; st.stones = 1e5; st.regionWins = { 3: 3, 2: 5 }; st.bosses = { 2: 1 }; st.npc = { su: { aff: 72, f60: 1 }, chu: { aff: 35 }, ge: { aff: 10 } }; L.joinSect(st, 'dan'); if (!document.getElementById('modal').hidden) window.__xm.closeModal(); st.storyQ = []; });
  const shot = n => page.screenshot({ path: `${out}/${n}.png` });
  // 奇遇
  if (!(await page.evaluate(() => (window.EVENTS || []).length))) await page.evaluate(() => { window.EVENTS = [{ id: 't1', where: 'home', npc: 'su', title: '雨夜访客', text: '雨夜，{su}浑身湿透地敲开洞府的门：“借你的丹炉一用，有人中了奇毒。”', choices: [{ t: '借炉相助', ok: { text: '你们忙了一整夜，人救回来了。', fx: { aff: { su: 12 }, herbs: -2 } } }, { t: '趁机讨价还价', p: 0.5, ok: { text: '对方翻了个白眼，丢下一袋灵草。', fx: { herbs: 6, aff: { su: -5 } } }, fail: { text: '对方转身就走。', fx: { aff: { su: -10 } } } }, { t: '与之切磋', duel: 0.9, ok: { text: '你赢了。', fx: { xp: 5 } }, fail: { text: '你输了。', fx: { inj: 2 } } }] }]; });
  await page.evaluate(() => window.__xm.showChoice((window.EVENTS || [])[0]));
  await page.waitForTimeout(300); await shot('c01-choice');
  await page.click('#modal button[data-c="0"]'); await page.waitForTimeout(300); await shot('c02-outcome');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(200);
  // 炼丹
  await page.evaluate(() => window.__xm.showAlchemy()); await page.waitForTimeout(300); await shot('c03-alchemy');
  await page.click('#modal button[data-r="juling"]'); await page.waitForTimeout(1400); await shot('c04-craft');
  await page.evaluate(() => window.__xm.closeModal());
  // 首领
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(300); await shot('c05-exp-boss');
  await page.evaluate(() => window.__xm.closeModal());
  await page.evaluate(() => window.__xm.fightBossUI(3)); await page.waitForTimeout(1400); await shot('c06-boss');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(200);
  // 九宗会武
  await page.evaluate(() => window.__xm.runSectMeet()); await page.waitForTimeout(300); await shot('c09-meet0');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(1400); await shot('c10-meet1');
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  await page.click('[data-nav="sect"]'); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#modal .body').scrollTop = 700); await page.waitForTimeout(100); await shot('c11-sect');
  await page.evaluate(() => window.__xm.closeModal());
  // 人物分页
  for (const t of ['attr', 'bond', 'ach', 'rank']) { await page.evaluate(t => window.__xm.showMe(t), t); await page.waitForTimeout(250); await shot('c07-me-' + t); }
  await page.evaluate(() => window.__xm.closeModal());
  await page.waitForTimeout(3000); await shot('c08-hud');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
