// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、功法（三槽、熟练、共鸣、五行克制、fx.art）、
// 法宝（对比卡与继承、熔炼与锁定、强化与保底、词条效果、fx.ore / fx.plus、器方打造、v4 → v5 迁移）、特训、人物分页
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
  const L_pct = p => Math.round(p * 100) + '%';
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
  // ---------- 法宝（SYSTEMS §3）----------
  const H = ['gearCmp', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge'];
  await page.evaluate(H => { const { st, L } = window.__xm; for (const h of H) st.hintSeen[h] = 1; st.p.r = 3; st.p.s = 0; st.p.xp = 0; st.flags.maxR = 3; st.flags.maxI = 12; st.pact = 1; st.gear = L.newGear(); st.ore = 5000; st.stones = 1e6; st.treasure = 3; st.exp = null; st.retreat = null; st.p.inj = 0; L.gearDrop(st, 'w', 3, { base: 'w3_0' }); L.gearDrop(st, 'r', 3, { base: 'r3_0' }); L.gearDrop(st, 'o', 4, { base: 'o_cul4' }); }, H);
  // 对比卡：卡上写的“战力 a → b”就是换上之后的战力；强化继承一半（+4 → +2）；旧的熔成灵矿 4 × 2^阶
  const cmp = await page.evaluate(() => {
    const { st, L } = window.__xm; st.gear.w.plus = 4;
    const it = L.gearDrop(st, 'w', 4, { base: 'w4_3' });
    window.__xm.revealItem(it, () => window.__xm.closeModal());
    return { u: it.u, pend: !!it.pend };
  });
  await page.waitForTimeout(700); await shot('c22-gear-compare');
  const shown = await page.evaluate(u => { const c = document.querySelector(`#modal [data-gcmp="${u}"]`); const dd = c && [...c.querySelectorAll('dl.delta dt')].find(x => x.textContent === '战力'); return dd ? dd.nextElementSibling.querySelector('b').textContent : null; }, cmp.u);
  const ore0 = await page.evaluate(() => window.__xm.st.ore);
  await page.click(`#modal [data-geq="${cmp.u}"]`); await page.waitForTimeout(250);
  const after = await page.evaluate(() => { const { st, L } = window.__xm; return { p: L.fmt(L.power(st)), id: st.gear.w.id, plus: st.gear.w.plus, ore: st.ore }; });
  expect(cmp.pend && shown === after.p && after.id === 'w4_3', `对比卡写战力 → ${shown}，换上后 ${after.p}`);
  expect(after.plus === 2, `强化继承一半：+4 → +${after.plus}`);
  expect(after.ore - ore0 === 4 * 8, `换下的三阶兵器熔成灵矿 +${after.ore - ore0}（应为 32）`);
  await close();
  // 不选就熔炼：关掉对比卡 = 熔炼，灵矿 +4 × 2^阶；【锁定当前】后更低阶的直接熔炼
  const sm = await page.evaluate(() => { const { st, L } = window.__xm; const it = L.gearDrop(st, 'w', 2, { base: 'w2_0' }); window.__xm.revealItem(it); return { u: it.u, ore: st.ore }; });
  await page.waitForTimeout(300); await close();
  const sm1 = await page.evaluate(u => { const { st, L } = window.__xm; return { ore: st.ore, pend: !!L.gearPend(st, u) }; }, sm.u);
  expect(!sm1.pend && sm1.ore - sm.ore === 16, `关掉对比卡 = 熔炼：灵矿 +${sm1.ore - sm.ore}（二阶应为 16）`);
  const lk = await page.evaluate(() => { const { st, L } = window.__xm; L.gearLock(st, 'w', true); const it = L.gearDrop(st, 'w', 2, { base: 'w2_1' }); const it2 = L.gearDrop(st, 'w', 4, { base: 'w4_0' }); const r = { auto: !!it.auto, smelt: it.smelt, pend2: !!it2.pend }; L.gearDecide(st, it2.u, 'smelt'); L.gearLock(st, 'w', false); return r; });
  expect(lk.auto && lk.smelt === 16 && lk.pend2, `锁定当前：二阶直接熔炼 +${lk.smelt}，同阶照样弹卡`);
  // 强化：法宝页【强化】按钮，预览写的“战力 a → b”与实际一致；+0→+1 必成
  await page.evaluate(() => window.__xm.showGear('w')); await page.waitForTimeout(300); await shot('c23-gear-page');
  const pv = await page.evaluate(() => { const d = [...document.querySelectorAll('#modal .gplusinfo dl.delta dt')].find(x => x.textContent === '战力'); return d ? d.nextElementSibling.querySelector('b').textContent : null; });
  await page.click('#modal [data-plus="w"]'); await page.waitForTimeout(400); await shot('c24-gear-plus');
  const pv1 = await page.evaluate(() => { const { st, L } = window.__xm; return { p: L.fmt(L.power(st)), plus: st.gear.w.plus, msg: (document.querySelector('#modal .gdet .quote') || {}).textContent || '' }; });
  expect(pv === pv1.p && pv1.plus === 3 && pv1.msg.includes('强化成功'), `强化预览写战力 → ${pv}，强化后 ${pv1.p}（+${pv1.plus}）：${pv1.msg.slice(0, 30)}`);
  // 保底：+5 → +6 基础 70%，失败一次 +10%；失败不掉级、灵矿照扣
  const pity = await page.evaluate(() => {
    const { st, L } = window.__xm, x = st.gear.w; x.plus = 5; x.fail = 0;
    const r0 = L.gearPlusRate(st, x), c = L.gearPlusCost(st, x), ore = st.ore, rng = L.rng;
    L.rng = () => 0.999; const f = L.gearPlus(st, 'w'); L.rng = rng;
    const r1 = L.gearPlusRate(st, x);
    L.rng = () => 0.75; const ok = L.gearPlus(st, 'w'); L.rng = rng;
    return { r0, r1, fail: f.ok, plusAfterFail: f.to, oreSpent: ore - st.ore, cost: c.ore, ok: ok.ok, to: ok.to, failReset: x.fail, costOk: c.ore === Math.ceil(8 * Math.pow(1.6, 5) * Math.pow(1.5, 4)) };
  });
  expect(Math.abs(pity.r0 - 0.7) < 1e-9 && Math.abs(pity.r1 - 0.8) < 1e-9 && !pity.fail && pity.plusAfterFail === 5, `保底：70% → 失败 → ${L_pct(pity.r1)}，不掉级（+${pity.plusAfterFail}）`);
  expect(pity.ok && pity.to === 6 && pity.failReset === 0 && pity.costOk, `第二次（掷 0.75 < 80%）成功到 +${pity.to}，花费公式 8×1.6^级×1.5^阶`);
  // 词条：锋锐斩妖 +5（寻宝不加）、聚财灵石 ×1.12、克木对木属性对手 ×1.1 与木属性地图 +4、养气修炼 ×1.04、藏锋免五行惩罚
  const af = await page.evaluate(() => {
    const { st, L } = window.__xm, w = st.gear.w, r = st.gear.r, o = st.gear.o;
    const sum = (k, a) => L.expExtraParts(st, k, 0, a).filter(x => x[2] === 'gear' && /^词条/.test(x[0])).reduce((s, x) => s + x[1], 0);
    w.aff = []; r.aff = []; o.aff = [];
    const s0 = sum(1, 0), j0 = L.expStoneMult(st, 0), c0 = L.culMult(st), d0 = L.duelPower(st, { kind: 'boss', k: 0 });
    w.aff = ['fengrui', 'ke_mu']; r.aff = ['jucai']; o.aff = ['yangqi'];
    const out = { slay: sum(1, 0) - s0, seek: sum(1, 1) - s0, mu: sum(0, 0) - sum(1, 0), stone: L.expStoneMult(st, 0) / j0, cul: L.culMult(st) / c0, duel: L.duelPower(st, { kind: 'boss', k: 0 }) / d0 };
    // 藏锋：火系战技在水属性的九幽魔渊被克 −8，有藏锋就 0
    L.giveArt(st, 'z_liehuo'); L.equipArt(st, 'z_liehuo');
    w.aff = []; const e0 = L.expElem(st, 6).v; r.aff = ['cangfeng']; const e1 = L.expElem(st, 6);
    out.cang = [e0, e1.v, !!e1.cang];
    return out;
  });
  expect(af.slay === 5 && af.seek === 0, `锋锐：斩妖 +${af.slay}、寻宝 +${af.seek}`);
  expect(af.mu === 4 && Math.abs(af.duel - 1.1) < 1e-9, `克木：后山野林（木）分数 +${af.mu}，对独眼狼王（木）战力 ×${af.duel.toFixed(3)}`);
  expect(Math.abs(af.stone - 1.12) < 1e-9 && Math.abs(af.cul - 1.04) < 1e-9, `聚财灵石 ×${af.stone.toFixed(3)}、养气修炼 ×${af.cul.toFixed(3)}`);
  expect(af.cang[0] === -8 && af.cang[1] === 0 && af.cang[2], `藏锋：被克 ${af.cang[0]} → ${af.cang[1]}`);
  await close();
  // 事件：ch_sword_3「照价买下」得灵矿 10 筐（1 筐 = 1.5^境界）；home_forge_boom「再锻一次」成了强化 +1
  const ev1 = await page.evaluate(() => { const { st, L } = window.__xm; st.eflags.sword_2 = 1; delete st.evDone.ch_sword_3; return { ore: st.ore, unit: L.oreUnit(st), live: L.evLive(L.eventById('ch_sword_3')) && L.evLive(L.eventById('home_forge_boom')) }; });
  await page.evaluate(() => window.__xm.showChoice(window.__xm.L.eventById('ch_sword_3'))); await page.waitForTimeout(300);
  await page.click('#modal button[data-c="1"]'); await page.waitForTimeout(300); await shot('c25-event-ore');
  const ev2 = await page.evaluate(() => window.__xm.st.ore);
  expect(ev1.live && ev2 - ev1.ore === 10 * ev1.unit, `fx.ore：灵矿 +${ev2 - ev1.ore}（10 筐 × ${ev1.unit}）`);
  await close();
  const fb = await page.evaluate(() => { const { st, L } = window.__xm; const p0 = st.gear.w.plus, rng = L.rng; L.rng = () => 0.01; const r = L.resolveChoice(st, L.eventById('home_forge_boom'), 1); L.rng = rng; return { p0, p1: st.gear.w.plus, ok: r.ok, fx: r.fx.join('，') }; });
  expect(fb.ok && fb.p1 === fb.p0 + 1, `fx.plus：兵器 +${fb.p0} → +${fb.p1}（${fb.fx}）`);
  // 器方与打造：story_trib1 给阵图（先收着），ch_star_4 给器方；化神 + 器炉（借丹炉）5 级、材料够就能打，打出来固定词条
  const fg = await page.evaluate(() => {
    const { st, L } = window.__xm; st.p.r = 4; st.flags.maxR = 4; st.home.furnace = 8;
    L.applyFx(st, { plan: 'f_dujie' }); L.applyFx(st, { plan: 'g_langya' });
    L.giveMat(st, 0, 2);
    const why = L.canForge(st, 'g_langya'), it = L.forge(st, 'g_langya');
    return { zt: !!st.gear.zhentu.f_dujie, why, aff: it && it.gear.aff.join(), slot: it && it.slot, mats: st.gear.mats[0] };
  });
  expect(fg.zt && fg.why === '' && fg.aff === 'xunzhen' && fg.mats === 0, `打造狼牙项链：${JSON.stringify(fg)}`);
  await page.evaluate(() => window.__xm.showForge()); await page.waitForTimeout(300); await shot('c26-forge');
  await close();
  // v4 存档迁移：旧法宝阶 → 该阶同名兵器 +0 无词条；已斩首领补发材料与器方
  const mig5 = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); s.v = 4; delete s.gear; delete s.ore; s.p.w = 3; s.p.wn = '碧落伞'; s.bosses = { 0: 1 };
    const ok = window.__xm.loadState(s); const st = window.__xm.st;
    return { ok, v: st.v, w: st.gear.w && st.gear.w.id, plus: st.gear.w && st.gear.w.plus, aff: st.gear.w && st.gear.w.aff.length, pw: st.p.w, ore: st.ore, mat: st.gear.mats[0], plan: !!st.gear.plans.g_langya, pow: L.power(st) / L.baseAtk(st) / L.atkMult(st) };
  });
  expect(mig5.ok && mig5.v === 5 && mig5.w === 'w3_2' && mig5.plus === 0 && mig5.aff === 0 && mig5.pw === undefined && mig5.ore === 0 && mig5.mat === 2 && mig5.plan, `v4 → v5：${JSON.stringify(mig5)}`);
  await close();
  // v3 存档迁移：旧功法阶 → 该阶第一门心法，熟练记小成
  const mig = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); s.v = 3; delete s.arts; s.p.a = 4; s.p.an = '太乙真经';
    const ok = window.__xm.loadState(s); const st = window.__xm.st;
    return { ok, v: st.v, slot: L.artSlots(st)[0], lv: L.artLv(st, L.artSlots(st)[0]), a: st.p.a };
  });
  expect(mig.ok && mig.v === 5 && mig.slot === 'x_jiuzhuan' && mig.lv === 1 && mig.a === undefined, `v3 → v5：${JSON.stringify(mig)}`);
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
