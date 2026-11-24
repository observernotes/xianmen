// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、功法（三槽、熟练、共鸣、五行克制、fx.art）、特训、人物分页
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
  // ---------- 功法（SYSTEMS §1～§2）----------
  // 换上一门：列表里写的变化量 = 换上前后的实际差（心法看修炼/周天，战技看战力）
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    for (const id of ['x_houtu', 'x_qingmu', 'z_wuxing', 'z_gengjin', 'z_huichun', 'z_liehuo', 'm_lianxi']) L.giveArt(st, id);
    L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_wuxing'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99; st.p.inj = 0; st.exp = null; st.retreat = null;
    st.meta.combo = {}; st.flags.genCombo = 1;
  });
  await page.evaluate(() => window.__xm.showMe('art')); await page.waitForTimeout(300); await shot('c15-arts');
  const rowDelta = id => page.evaluate(id => { const r = document.querySelector(`#modal [data-art="${id}"] .right`); return r ? r.textContent : ''; }, id);
  await page.click('#modal [data-slot="0"]'); await page.waitForTimeout(200);
  const dx = await rowDelta('x_qingmu');
  const gx = await page.evaluate(() => { const { st, L } = window.__xm; return L.gainBase(st); });
  await page.click('#modal [data-art="x_qingmu"]'); await page.waitForTimeout(250);
  const gx1 = await page.evaluate(() => { const { st, L } = window.__xm; return { g: L.gainBase(st), slot: L.artSlots(st)[0], dec: L.fmt1 }; });
  const shownX = await page.evaluate(([a, b]) => { const v = b - a; return `修炼 ${v > 0 ? '+' : '−'}${window.__xm.L.fmt1(Math.abs(v))}/周天`; }, [gx, gx1.g]);
  expect(gx1.slot === 'x_qingmu' && dx === shownX, `换心法：列表写 ${dx}，实际 ${shownX}`);
  await page.click('#modal [data-slot="1"]'); await page.waitForTimeout(200);
  const dz = await rowDelta('z_gengjin');
  const pz = await page.evaluate(() => window.__xm.L.power(window.__xm.st));
  await page.click('#modal [data-art="z_gengjin"]'); await page.waitForTimeout(250);
  const shownZ = await page.evaluate(p0 => { const { st, L } = window.__xm; const v = L.power(st) - p0; return `战力 ${v > 0 ? '+' : '−'}${L.fmt(Math.abs(v))}`; }, pz);
  expect(dz === shownZ, `换战技：列表写 ${dz}，实际 ${shownZ}`);
  // 共鸣：青木长生功 + 回春剑诀 = 生生不息，第一次凑齐弹“共鸣揭晓”并记入 st.meta.combo
  await page.click('#modal [data-art="z_huichun"]'); await page.waitForTimeout(400); await shot('c16-combo');
  const cb = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, c: window.__xm.st.meta.combo, on: window.__xm.L.comboOn(window.__xm.st, 'c1'), age: window.__xm.L.ageRate(window.__xm.st) }));
  expect(cb.t === '共鸣揭晓' && cb.c.c1 === 1 && cb.on, `共鸣「生生不息」揭晓并记入图鉴（${cb.t}）`);
  expect(Math.abs(cb.age - (1 - 0.08) * 0.9) < 1e-9, `生生不息：寿元流逝 ×${cb.age.toFixed(3)}（青木 −8% × 再 −10%）`);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(250);
  // 熟练：门槛 [0,12,36,80,150] × (1 + 0.5 × 阶)，五级；圆满得融会
  const mast = await page.evaluate(() => {
    const { st, L } = window.__xm, id = 'x_qingmu', out = [];
    for (let lv = 0; lv < 5; lv++) { const need = L.artNeed(id, lv); st.arts.own[id] = need; out.push([need, L.artLv(st, id)]); if (lv) { st.arts.own[id] = need - 1; out.push([need - 1, L.artLv(st, id)]); } }
    st.arts.own[id] = L.artNeed(id, 3) - 1; L.addMastery(st, id, 1);
    return { out, rong: !!st.arts.rong[id], m: L.artXMult(st) };
  });
  const want = [[0, 0], [24, 1], [23, 0], [72, 2], [71, 1], [160, 3], [159, 2], [300, 4], [299, 3]];
  expect(JSON.stringify(mast.out) === JSON.stringify(want), `熟练门槛（玄阶）：${JSON.stringify(mast.out)}`);
  expect(mast.rong && Math.abs(mast.m - (1 + 0.35 * 1.3)) < 1e-9, `圆满：融会已记，修炼 ×${mast.m.toFixed(3)}（1 + 0.35 × 1.3）`);
  await page.evaluate(() => window.__xm.showMe('art')); await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.querySelector('#modal [data-slot="0"]').textContent.includes('圆满')), '功法页心法槽写着“圆满”');
  await shot('c17-arts-mastery');
  await close();
  // 五行克制：黑风岭属金，木系战技被克 −8；确认页一键换上火系的烈火刀（火克金）→ +8，预计分数 +16
  const el = await page.evaluate(() => {
    const { st, L } = window.__xm; st.meta.elem[1] = 1; L.equipArt(st, 'z_huichun');
    window.__xm.confirmExp(1, 0, 0);
    const txt = document.querySelector('#expElem').textContent, f0 = L.expForecast(st, 1, 0, 0);
    const parts = L.expParts(st, 1, 0, 0).extra.filter(x => x[2] === 'elem').map(x => x[1]);
    return { txt, base: f0.base, parts, btn: (document.querySelector('#expElem [data-swapz]') || {}).textContent || '' };
  });
  expect(el.txt.includes('此地（金）克你的木系战技：分数 −8') && el.parts[0] === -8, `被克：${el.txt}（${el.parts}）`);
  expect(el.btn.includes('烈火刀') && el.btn.includes('+16'), `一键换克制战技：${el.btn}`);
  await page.waitForTimeout(500); await shot('c18-elem-ke');
  await page.click('#expElem [data-swapz]'); await page.waitForTimeout(250);
  const el2 = await page.evaluate(() => { const { st, L } = window.__xm; return { txt: document.querySelector('#expElem').textContent, base: L.expForecast(st, 1, 0, 0).base, pow: L.expParts(st, 1, 0, 0).pow }; });
  expect(el2.txt.includes('你的火系战技克此地（金）：分数 +8'), `克制：${el2.txt}`);
  await shot('c19-elem-counter');
  await close();
  // 对决：土系战技克慕容（水）×1.15；锦囊列出“换成克制对手的战技”
  const du = await page.evaluate(() => {
    const { st, L } = window.__xm; L.equipArt(st, 'z_liehuo');
    const m0 = L.duelElem(st, L.PACT_FOE).m; L.equipArt(st, 'z_wuxing'); const m1 = L.duelElem(st, L.PACT_FOE).m; L.equipArt(st, 'z_liehuo');
    return { m0, m1 };
  });
  expect(du.m0 === 0.87 && du.m1 === 1.15, `对决：火被水克 ×${du.m0}，土克水 ×${du.m1}`);
  await page.evaluate(() => { const { st, L } = window.__xm; const s2 = JSON.parse(JSON.stringify(st)); s2.pact = 0; s2.tick = 28; s2.p.r = 0; s2.p.s = 2; s2.flags.maxR = 0; s2.flags.maxI = 2; delete s2.arts.own.z_gengjin; delete s2.arts.own.z_huichun; window.__xm.loadState(s2); window.__xm.showPact(); });
  await page.waitForTimeout(300); await shot('c20-pact-swap');
  const tipTxt = await page.evaluate(() => document.querySelector('#modal').textContent);
  expect(/换成克制对手的战技《五行拳经》（土克水）/.test(tipTxt), '锦囊：换成克制对手的战技《五行拳经》（土克水）');
  await page.click('#modal [data-go="eqz:z_wuxing"]'); await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__xm.L.artSlots(window.__xm.st)[1] === 'z_wuxing'), '锦囊一下换上五行拳经');
  await close();
  // fx.art 的事件：ch_fire_5「自己炼化」得焚天诀与血遁，结果页单列两门功法
  await page.evaluate(() => { const { st, L } = window.__xm; delete st.arts.own.z_fentian; delete st.arts.own.m_xuedun; window.__xm.showChoice(L.eventById('ch_fire_5')); });
  await page.waitForTimeout(300);
  await page.click('#modal button[data-c="2"]'); await page.waitForTimeout(400); await shot('c21-event-art');
  const ea = await page.evaluate(() => ({ own: Object.keys(window.__xm.st.arts.own), lines: document.querySelectorAll('#modal .artline').length }));
  expect(ea.own.includes('z_fentian') && ea.own.includes('m_xuedun') && ea.lines === 2, `fx.art：得焚天诀、血遁，结果页 ${ea.lines} 行功法`);
  await close();
  // v3 存档迁移：旧功法阶 → 该阶第一门心法，熟练记小成
  const mig = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); s.v = 3; delete s.arts; s.p.a = 4; s.p.an = '太乙真经';
    const ok = window.__xm.loadState(s); const st = window.__xm.st;
    return { ok, v: st.v, slot: L.artSlots(st)[0], lv: L.artLv(st, L.artSlots(st)[0]), a: st.p.a };
  });
  expect(mig.ok && mig.v === 4 && mig.slot === 'x_jiuzhuan' && mig.lv === 1 && mig.a === undefined, `v3 → v4：${JSON.stringify(mig)}`);
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
