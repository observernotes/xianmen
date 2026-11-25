// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、功法（三槽、熟练、共鸣、五行克制、fx.art）、
// 法宝（对比卡与继承、熔炼与锁定、强化与保底、词条效果、fx.ore / fx.plus、器方打造、v4 → v5 迁移）、特训、人物分页、
// 历法与坊市（四季效果、天下大势效果与到期、货架轮换与限购、行情卖价、竞价结果与宿敌加成、坊市事件、年历与大势小牌、v5 → v6 迁移）、
// 灵田与炼丹（田数、作物周期与产出、旺季、全种灵稻与旧被动灵石等价、解锁与灵种、改种、药引丹方的试炼与跨世图鉴、fx.recipe、丹毒的加减与门槛、自动续炼、
// 爆气丹 / 雷火丹的效果与用掉、锦囊里的“服一枚爆气丹：胜算 p → p'”、疗伤丹、药引一包、旧档迁移、老祖的丹毒讲解）
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
    st.guide = { step: 99, done: true }; st.hintSeen = {}; for (const k of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life', 'pet1', 'pet2', 'petEvo', 'crops', 'yinGrid', 'toxin']) st.hintSeen[k] = 1;
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
  await page.evaluate(() => { const { st } = window.__xm; st.meta.recipe.juling = 1; st.mats.yin.fire = 2; st.mats.yin.ice = 2; st.toxin = 0; window.__xm.showAlchemy(); }); await page.waitForTimeout(300);
  await page.click('#modal .atabs [data-tab="x"]'); await page.waitForTimeout(250); await shot('c03-alchemy');
  await page.click('#modal button[data-r="juling"]'); await page.waitForTimeout(1400); await shot('c04-craft');
  expect(await page.evaluate(() => window.__xm.st.mats.yin.fire === 1 && window.__xm.st.mats.yin.ice === 1), '炼聚灵丹付了火引、冰引各一');
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
  // 拍卖会（竞价）：点【加价】出一次价
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.r = 3; L.rollAuction(st); if (st.market) st.market.evQ = []; }); await page.click('[data-nav="market"]'); await page.waitForTimeout(300); await page.evaluate(() => document.querySelector('#aucBox').scrollIntoView()); await page.waitForTimeout(100); await shot('c12-auction');
  const au = await page.$('#modal [data-bid$=":1"]:not([disabled])'); if (au) { await au.click(); await page.waitForTimeout(900); }
  expect(await page.evaluate(() => window.__xm.st.auction.bids === 1), '拍卖会点【加价】出了一次价');
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
  const H = ['gearCmp', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge', 'crops', 'yinGrid', 'toxin'];
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
  expect(mig5.ok && mig5.v === 6 && mig5.w === 'w3_2' && mig5.plus === 0 && mig5.aff === 0 && mig5.pw === undefined && mig5.ore === 0 && mig5.mat === 2 && mig5.plan, `v4 → v5：${JSON.stringify(mig5)}`);
  await close();
  // v3 存档迁移：旧功法阶 → 该阶第一门心法，熟练记小成
  const mig = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); s.v = 3; delete s.arts; s.p.a = 4; s.p.an = '太乙真经';
    const ok = window.__xm.loadState(s); const st = window.__xm.st;
    return { ok, v: st.v, slot: L.artSlots(st)[0], lv: L.artLv(st, L.artSlots(st)[0]), a: st.p.a };
  });
  expect(mig.ok && mig.v === 6 && mig.slot === 'x_jiuzhuan' && mig.lv === 1 && mig.a === undefined, `v3 → v6：${JSON.stringify(mig)}`);
  await close();
  // 老祖特训（E17）
  await page.evaluate(() => { const { st, L } = window.__xm; const s2 = L.newState({ name: '特训' }); s2.guide = { step: 99, done: true }; s2.hintSeen = Object.assign({}, st.hintSeen); s2.tick = 30; s2.stats.exp = 3; window.__xm.loadState(s2); });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__xm.L.canTrain(window.__xm.st)), '约战前 6 周天、胜算低时可以特训');
  await page.evaluate(() => window.__xm.showTrain()); await page.waitForTimeout(300); await shot('c14-train');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__xm.st.retreat && window.__xm.st.retreat.kind === 'train' && window.__xm.st.retreat.m === 3), '接受特训：4 周天 ×3');
  await close();
  // ---------- 历法、天下大势、坊市（SYSTEMS §7、§10）----------
  const CALH = ['cal', 'world1', 'shelf', 'sell', 'auction', 'ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life',
    'art1', 'art2', 'zhanji', 'mishu', 'ke', 'gearCmp', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge', 'crops', 'yinGrid', 'toxin'];
  await page.evaluate(H => {
    const { st, L } = window.__xm; st.guide = { step: 99, done: true }; st.hintSeen = st.hintSeen || {}; for (const h of H) st.hintSeen[h] = 1;
    st.p.r = 3; st.p.s = 0; st.flags.maxR = 3; st.flags.maxI = 12; st.pact = 1; st.exp = null; st.retreat = null; st.p.inj = 0; st.visitor = null;
    st.stones = 1e7; st.herbs = 400; st.pills = 10; st.ore = 0; st.home.field = 10; st.cal = L.newCal(); st.market = L.newMarket(); st.auction = null;
    if (st.arts.slot[2] === 'm_xingdou') st.arts.slot[2] = null;
  }, CALH);
  // 四季：t % 12 → 季节；冬闭关 +0.2、春访客 ×1.3、秋灵田灵石 +50%、夏兽类地图斩妖 +15%；周天星斗翻倍；星河倒悬冬季再 +0.5
  const se = await page.evaluate(() => {
    const { st, L } = window.__xm, at = t => { st.tick = t; };
    const seasons = [1, 3, 4, 6, 7, 9, 10, 12].map(t => L.seasonOf(t)).join('');
    at(127); const retAut = L.retBaseMult(st); at(130); const ret0 = L.retBaseMult(st); at(131); const ret1 = L.retBaseMult(st);   // 127 秋 · 130 % 12 = 10 冬 · 131 冬
    at(127); const autumn = L.incParts(st).find(x => /秋/.test(x[0])); const fi = L.fieldInc(st.home.field) * L.modProd(L.modParts('incMul', st));
    at(122); const spring = L.calVisitMult(st), herb = L.calFieldHerb(st);
    at(125); const beast = L.calExp(st, 0, 0, 0).stone, notBeast = L.calExp(st, 1, 0, 0).stone, seekBeast = L.calExp(st, 0, 0, 1).stone;
    const f0 = L.expForecast(st, 0, 0, 0).stones; at(127); const f1 = L.expForecast(st, 0, 0, 0).stones;
    L.giveArt(st, 'm_xingdou'); st.arts.frag.m_xingdou = 3; st.arts.own.m_xingdou = 0; st.arts.slot[2] = 'm_xingdou'; at(130); const retX = L.retBaseMult(st);
    L.giveArt(st, 'z_canghai'); st.arts.slot[1] = 'z_canghai'; const retC = L.retBaseMult(st), c12 = L.comboOn(st, 'c12');
    st.arts.slot[2] = null; st.arts.slot[1] = 'z_wuxing';
    return { seasons, w: ret1 - ret0, ret0, retAut, autumn: autumn && autumn[1] / fi, spring, herb, beast, notBeast, seekBeast, fr: f0 / f1, xing: retX - ret0, c12, c12d: retC - retX };
  });
  expect(se.seasons === '00112233', `季节：t%12 = 1,3 春 4,6 夏 7,9 秋 10,12 冬（${se.seasons}）`);
  expect(Math.abs(se.w) < 1e-9 && Math.abs(se.ret0 - se.retAut - 0.2) < 1e-9, `冬季闭关倍率 +0.2（秋 ×${se.retAut.toFixed(2)} → 冬 ×${se.ret0.toFixed(2)}）`);
  expect(Math.abs(se.autumn - 0.5) < 1e-9, `秋：灵田灵石 +50%（${se.autumn}）`);
  expect(Math.abs(se.spring - 1.3) < 1e-9 && Math.abs(se.herb - 1.5) < 1e-9, `春：访客 ×${se.spring}、灵田灵草 ×${se.herb}`);
  expect(Math.abs(se.beast - 1.15) < 1e-9 && se.notBeast === 1 && se.seekBeast === 1 && Math.abs(se.fr - 1.15) < 0.01, `夏：后山野林斩妖灵石 ×${se.beast}（黑风岭 ×${se.notBeast}、寻宝 ×${se.seekBeast}；确认页 ×${se.fr.toFixed(3)}）`);
  expect(Math.abs(se.xing - 0.2) < 1e-9, `周天星斗大法：冬季闭关 +0.2 → +0.4（多 ${se.xing.toFixed(2)}）`);
  expect(se.c12 && Math.abs(se.c12d - 0.5) < 1e-9, `星河倒悬：冬季闭关再 +0.5（${se.c12d}）`);
  // 天下大势：效果与到期
  const wd = await page.evaluate(() => {
    const { st, L } = window.__xm, set = (id, extra) => { st.cal.w = Object.assign({ id, at: st.tick, until: st.tick + L.WORLD[id].len }, extra || {}); };
    st.tick = 134;   // 春
    const g0 = L.culMult(st); set('w_lingchao'); const lc = L.culMult(st) / g0;
    const e0 = L.retInfo(st).epi * 0; void e0; const epi = L.calEpiMult(st);
    L.applyFx(st, { flag: 'lingchao_share' }); const lcs = L.culMult(st) / g0;
    set('w_shouchao'); const sc = L.calExp(st, 0, 0, 0).stone, scSeek = L.calExp(st, 0, 0, 1).stone, scPart = L.expExtraParts(st, 0, 0, 0).find(x => /兽潮/.test(x[0])), scOther = L.expExtraParts(st, 1, 0, 0).some(x => /兽潮/.test(x[0]));
    set('w_kuangmai', { k: 1 }); const km = L.calExp(st, 1, 0, 0).ore, kmOther = L.calExp(st, 0, 0, 0).ore;
    set('w_mojie'); const mj = L.calExp(st, 4, 0, 0), mjRec = L.expParts(st, 4, 0, 0).rec / L.rec(4, 0);
    set('w_liuxing'); const lx = L.calExp(st, 2, 0, 1);
    st.cal.w = null; const i0 = L.income(st), h0 = L.sellMult(st, 'herb'); set('w_dahan'); const dh = L.income(st) - i0;
    set('w_shanglu'); const sl = L.shelf(st)[0].price / L.price(st, 'pill'), slSell = L.sellMult(st, 'herb') / h0;
    st.cal.w = null; const r0 = L.retBaseMult(st), a0 = L.alchRate(st); set('w_jiangdao'); const jd = L.retBaseMult(st) - r0;
    set('w_danhui'); const dhA = L.alchRate(st) - a0, dhP = L.sellMult(st, 'pill');
    // 到期：until 那个周天结掉，记到 prev
    set('w_liuxing'); st.cal.w.until = st.tick + 1; const out = L.tick(st); const gone = !L.world(st) && st.cal.prev && st.cal.prev.id === 'w_liuxing' && out.worldEnd === 'w_liuxing';
    return { lc, epi, lcs, sc, scSeek, scPart: scPart && scPart[1], scOther, km, kmOther, mj, mjRec, lx, dh, dhExp: -L.fieldInc(st.home.field) * 0.4, sl, slSell, jd, dhA, dhP, gone };
  });
  expect(Math.abs(wd.lc - 1.3) < 1e-9 && wd.epi === 2 && Math.abs(wd.lcs - 1.15) < 1e-9, `灵气潮汐：修炼 ×${wd.lc}、顿悟 ×${wd.epi}；合用后 ×${wd.lcs}`);
  expect(wd.sc === 1.8 && wd.scSeek === 1 && wd.scPart === -8 && !wd.scOther, `兽潮：木属性地图斩妖灵石 ×${wd.sc}、分数 ${wd.scPart}（寻宝 ×${wd.scSeek}，金属性地图不受影响）`);
  expect(wd.km === 3 && wd.kmOther === 1, `矿脉现世：指定地图灵矿 ×${wd.km}，别处 ×${wd.kmOther}`);
  expect(wd.mj.rec === 1.3 && wd.mj.stone === 1.6 && Math.abs(wd.mjRec - 1.3) < 1e-9, `魔劫：血煞秘境（火）推荐战力 ×${wd.mj.rec}、灵石 ×${wd.mj.stone}`);
  expect(wd.lx.tier === 2 && wd.lx.treasure === 2, `流星雨：寻宝高一阶概率 ×${wd.lx.tier}、天材地宝 ×${wd.lx.treasure}`);
  expect(Math.abs(wd.dh - wd.dhExp) < 1e-6, `大旱：灵田灵石 ${wd.dh.toFixed(1)}（应为 ${wd.dhExp.toFixed(1)}）`);
  expect(Math.abs(wd.sl - 1.3) < 0.01 && Math.abs(wd.slSell - 1.3) < 1e-9, `商路断绝：买价 ×${wd.sl.toFixed(2)}、行情 ×${wd.slSell}`);
  expect(Math.abs(wd.jd - 0.5) < 1e-9 && Math.abs(wd.dhA - 0.1) < 1e-9, `名师讲道：闭关 +${wd.jd}；丹道大会：成丹率 +${wd.dhA.toFixed(2)}、破境丹行情 ×${wd.dhP.toFixed(2)}`);
  expect(wd.gone, '大势到期：L.world 清空、记入 prev、tick 报 worldEnd');
  // 通缉令：论道里击败被通缉的路人，赏 20×收入
  const tj = await page.evaluate(() => {
    const { st, L } = window.__xm; st.tick = 132; st.rank = 40; st.cal.w = null; st.cal.prev = null;
    const rng = L.rng; let w = null; for (let i = 0; i < 400 && !(w && w.id === 'w_tongji'); i++) { st.cal.w = null; w = L.rollWorld(st); }
    const q = L.wantedRank(st), who = st.cal.w.who, inc = L.income(st), s0 = st.stones;
    L.rng = () => 0; const res = L.tournament(st); L.rng = rng;
    const r0 = res.rounds[0];
    return { q, who, met: r0 && r0.rv && r0.rv.n === who, bounty: r0 && r0.bounty, want: Math.floor(Math.max(inc, 20) * 20), paid: !L.wanted(st), w: w && w.id };
  });
  expect(tj.met && tj.bounty === tj.want && tj.paid, `通缉令：论道第一场打第 ${tj.q} 名「${tj.who}」，赏金 ${tj.bounty}（应为 ${tj.want}）`);
  // 货架：常驻三格不限购；轮换三格每届论道（t%12 = 0）换货、各限购；九折与多一格的钩子
  const sh = await page.evaluate(() => {
    const { st, L } = window.__xm; st.tick = 144; st.market = L.newMarket(); L.restock(st, true);
    const rows = L.shelf(st), fixed = rows.filter(r => r.fixed).map(r => r.k).join(), rot = rows.filter(r => !r.fixed && !r.lock);
    const r = rot.find(x => x.lim >= 1), lim = r.lim; let bought = 0; while (L.shelfBuy(st, r.i)) bought++;
    const why = L.shelfWhy(st, L.shelf(st)[r.i]);
    const p0 = st.pills; for (let i = 0; i < 5; i++) L.shelfBuy(st, 0); const fixedOk = st.pills - p0 === 5;
    const before = JSON.stringify(st.market.rot.map(x => x.k + x.sold)); const out = {}; st.tick = 155; L.tick(st); const restocked = JSON.stringify(st.market.rot.map(x => x.k + x.sold)) !== before && st.market.rot.every(x => x.sold === 0) && st.tick % 12 === 0;
    L.applyFx(st, { flag: ['mkt_discount', 'mkt_extra_slot'] }); L.restock(st, true);
    const disc = st.market.disc, n = st.market.rot.length, discPrice = L.shelf(st)[0].price / L.price(st, 'pill');
    L.restock(st, true); const back = st.market.disc === 1 && st.market.rot.length === 3;
    return { fixed, rot: rot.length, lim, bought, why, fixedOk, restocked, disc, n, discPrice, back, life: L.restockIn(st) };
  });
  expect(sh.fixed === 'pill,box,egg' && sh.rot === 3 && sh.fixedOk, `货架：常驻 ${sh.fixed}（不限购），轮换 ${sh.rot} 格`);
  expect(sh.bought === sh.lim && sh.why === '本届已售罄', `限购：买满 ${sh.bought}/${sh.lim} 后“${sh.why}”`);
  expect(sh.restocked, '每届论道（t%12 = 0）换货，限购清零');
  expect(sh.disc === 0.9 && sh.n === 4 && Math.abs(sh.discPrice - 0.9) < 0.01 && sh.back, `mkt_discount 下一届九折（×${sh.discPrice.toFixed(2)}）、mkt_extra_slot 多一格（${sh.n} 格），再下一届复原`);
  // 行情：灵草 2 × 2.6^r × 指数；破境丹 40% 买价；卖一半 / 全卖；能买到的封顶在买价的 95%
  const sp = await page.evaluate(() => {
    const { st, L } = window.__xm; st.tick = 146; st.cal.w = null; st.market.idx = { herb: 1.4, ore: 0.6, pill: 1 };
    const herbP = L.sellPrice(st, 'herb'), herbWant = 2 * Math.pow(2.6, 3) * 1.4;
    const pillP = L.sellPrice(st, 'pill'), pillWant = 0.4 * L.price(st, 'pill');
    st.herbs = 101; const s0 = st.stones; const r1 = L.sell(st, 'herb', 0.5); const got1 = st.stones - s0;
    const r2 = L.sell(st, 'herb', 1);
    const tr = L.sellTrend(st, 'herb').t;
    st.tick = 151; st.market.idx.pill = 1.6; st.cal.w = { id: 'w_danhui', at: 150, until: 156 }; const capped = L.sellCapped(st, 'pill') && Math.abs(L.sellPrice(st, 'pill') - 0.95 * L.price(st, 'pill')) < 1e-6;
    st.cal.w = null; st.ore = 1000; const oreP = L.sellPrice(st, 'ore'), oreBuy = L.price(st, 'ore') / L.oreBasket(st);
    return { herbP, herbWant, pillP, pillWant, r1: r1 && r1.n, got1, want1: Math.floor(50 * herbP), r2: r2 && r2.n, left: st.herbs, tr, capped, oreP, oreBuy };
  });
  expect(Math.abs(sp.herbP - sp.herbWant) < 1e-6 && Math.abs(sp.pillP - sp.pillWant) < 1e-6, `行情：灵草 ${sp.herbP.toFixed(1)} = 2×2.6³×1.4，破境丹 ${sp.pillP.toFixed(1)} = 买价 40%`);
  expect(sp.r1 === 50 && sp.got1 === sp.want1 && sp.r2 === 51 && sp.left === 0, `卖一半 ${sp.r1} 株 +${sp.got1}，全卖 ${sp.r2} 株`);
  expect(sp.tr === '高于平时' && sp.capped && sp.oreP < sp.oreBuy, `“${sp.tr}”；丹道大会破境丹封顶买价 95%；灵矿卖 ${sp.oreP.toFixed(2)} < 买 ${sp.oreBuy.toFixed(2)}`);
  await page.evaluate(() => { const { st } = window.__xm; st.herbs = 300; st.pills = 9; st.ore = 120; st.tick = 151; });
  // 竞价：拿下付出价 × 档位倍率；没拿下不花钱、拍品归竞拍者、宿敌战力 ×1.04 并在下届论道提起；一场只能出手两次
  const bd = await page.evaluate(() => {
    const { st, L } = window.__xm; st.tick = 157; st.rank = 50; st.beaten = { mu: 1 };
    const rng = L.rng; L.rng = () => 0.5; L.rollAuction(st); L.rng = rng; st.market.evQ = [];
    const A = st.auction, zhao = st.ladder.find(x => x.id === 'zhao'); delete zhao.pw;
    A.items[0].comp = null; A.items[1].comp = { kind: 'rival', id: 'zhao', n: zhao.n }; A.items[2].comp = { kind: 'npc', id: 'su', n: '苏青瑶' };
    const b0 = L.bidInfo(st, 0, 1), b1 = L.bidInfo(st, 1, 2), b1c = L.bidInfo(st, 1, 0);
    const cq = L.checkQuests; L.checkQuests = () => {};   // 札记奖励会顺手发灵石，量花费时先停掉
    const s0 = st.stones; L.rng = () => 0.01; const w = L.auctionBid(st, 0, 1); const paid = s0 - st.stones; L.checkQuests = cq;
    const q = L.rivalRank(st, 'zhao'), P0 = L.rivalPower(st, q);
    const s1 = st.stones; L.rng = () => 0.999; const l = L.auctionBid(st, 1, 2); L.rng = rng; const lostCost = s1 - st.stones;
    const P1 = L.rivalPower(st, q), third = L.bidInfo(st, 2, 0);
    const end = L.auctionClose(st);
    L.rng = () => 0.999; const res = L.tournament(st); L.rng = rng;
    return { p0: b0.p, m0: b0.price / A.items[0].price, p1: b1.p, p1c: b1c.p, win: w.win, paid, want: b0.price, lose: !l.win, lostCost, res1: A.items[1].res, boost: P1 / P0, note: res.aucNews.some(x => x.n === zhao.n), third: third.why, npc: A.items[2].res, npcBoost: end.some(x => x.boost) };
  });
  expect(Math.abs(bd.p0 - 0.70) < 1e-9 && Math.abs(bd.m0 - 1.4) < 0.01 && Math.abs(bd.p1 - 0.82) < 1e-9 && Math.abs(bd.p1c - 0.20) < 1e-9, `出价：加价 ×${bd.m0.toFixed(2)} 拿下 ${bd.p0}；宿敌在场豪掷 ${bd.p1}、跟一口 ${bd.p1c.toFixed(2)}`);
  expect(bd.win && bd.paid === bd.want, `拿下：付 ${bd.paid}（加价 ${bd.want}）`);
  expect(bd.lose && bd.lostCost === 0 && bd.res1 === 'comp' && Math.abs(bd.boost - 1.04) < 1e-9 && bd.note, `没拿下不花钱，拍品归宿敌，他战力 ×${bd.boost.toFixed(3)}，下届论道提起`);
  expect(bd.third.includes('出手 2 次') && bd.npc === 'comp' && !bd.npcBoost, `一场两次：${bd.third}；人物竞拍者拿走不加战力`);
  // 坊市事件：换货后 5% 的“标错的价”、买轮换货 10% 的“老板心情好”、开拍的“无名之物”——进 st.market.evQ，打开坊市时弹
  const me0 = await page.evaluate(() => {
    const { st, L } = window.__xm; st.auction = null; st.market.evQ = []; delete st.evLast.mkt_fake; delete st.evLast.mkt_haggle; delete st.evLast.auc_mystery;
    const a = L.marketTrigger(st, 'market:restock'), b = L.marketTrigger(st, 'market:buy', undefined, 1);
    return { a: a && a.id, b: b && b.id, q: st.market.evQ.map(x => x.id).join() };
  });
  expect(me0.a === 'mkt_fake' && me0.b === 'mkt_haggle', `坊市事件入队：${me0.q}`);
  await page.click('[data-nav="market"]'); await page.waitForTimeout(400); await shot('c27-market-event');
  const me1 = await page.evaluate(() => document.querySelector('#modal h2').textContent);
  expect(me1.includes('标错的价'), `打开坊市先弹坊市事件（${me1}）`);
  await page.click('#modal button[data-c="1"]'); await page.waitForTimeout(300);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400);
  const me2 = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, disc: window.__xm.st.market.discNext }));
  expect(me2.t.includes('老板心情好') && me2.disc === 0.9, `“叫醒老板”→ 下一届九折（${me2.disc}），接着弹下一件（${me2.t}）`);
  await page.click('#modal button[data-c="1"]'); await page.waitForTimeout(300);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400);
  const me3 = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, extra: window.__xm.st.market.extra, q: window.__xm.st.market.evQ.length }));
  expect(me3.t === '坊市' && me3.extra === 1 && me3.q === 0, `“原价成交”→ 下一届多一格；事件处理完回到坊市（${me3.t}）`);
  const mys = await page.evaluate(() => { const { st, L } = window.__xm; const rng = L.rng; L.rng = () => 0.01; L.rollAuction(st); L.rng = rng; return st.market.evQ.map(x => x.id); });
  expect(mys.includes('auc_mystery'), `开拍时 auction:open → 无名之物（${mys.join()}）`);
  await close();
  // 年历：筑基且约战打完后，“大事”牌点开是年历（24 格时间轴 + 论道 / 拍卖 / 会武 / 秘境 / 大势各一行）；大势小牌在场景右上角
  await page.evaluate(() => { const { st, L } = window.__xm; st.market.evQ = []; st.tick = 158; st.cal.w = { id: 'w_shouchao', at: 158, until: 166 }; L.rollAuction(st); st.market.evQ = []; document.querySelector('#tip').hidden = true; });
  await page.waitForTimeout(400);
  const tag = await page.evaluate(() => { const el = document.querySelector('#worldTag'); const r = el.getBoundingClientRect(); return { vis: !el.hidden, txt: el.textContent, w: r.width, h: r.height }; });
  expect(tag.vis && tag.txt.includes('兽潮') && tag.txt.includes('8') && tag.w >= 44 && tag.h >= 44, `大势小牌：${tag.txt}（${Math.round(tag.w)}×${Math.round(tag.h)}）`);
  await shot('c28-world-tag');
  await page.click('#worldTag'); await page.waitForTimeout(400); await shot('c29-calendar');
  const cal = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, strip: !!document.querySelector('#calStrip'), rows: [...document.querySelectorAll('#modal [data-cal]')].map(x => x.dataset.cal).join(), txt: document.querySelector('#modal .body').textContent }));
  expect(cal.t === '年历' && cal.strip && cal.rows.includes('dao') && cal.rows.includes('auc') && cal.rows.includes('war') && cal.rows.includes('realm') && cal.rows.includes('world') && cal.txt.includes('兽潮'), `年历：${cal.rows}`);
  await close();
  await page.click('#stats [data-s="big"]'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.querySelector('#modal h2').textContent === '年历'), '筑基后“大事”牌点开是年历');
  await close();
  // 老祖在每件大势开始时的一句“该干什么”：12 种都带数字，没有 undefined / NaN
  const wl = await page.evaluate(() => {
    const { st, L } = window.__xm, out = [];
    for (const W of L.WORLDS) {
      st.cal.w = { id: W.id, at: st.tick, until: st.tick + W.len, k: 1 };
      if (W.id === 'w_tongji') { const rv = L.rivalAt(st, st.rank - 3); st.cal.w.who = rv.n; st.cal.w.tourAt = st.tick + 6; }
      out.push([W.id, window.__xm.worldLine(st.cal.w)]);
    }
    st.cal.w = null;
    return out;
  });
  const badWl = wl.filter(([, t]) => !/\d/.test(t) || /undefined|NaN|null/.test(t) || t.length > 75);
  expect(!badWl.length, `大势开场白（12 种）都带数字：${badWl.map(x => x.join('：')).join(' | ') || wl.map(x => x[1].slice(0, 12)).join(' / ')}`);
  // v5 存档迁移：一口价拍卖会 → 竞价（起拍价 = 旧价 × 12/20）；st.gear.oreBuy 去掉；新建 st.market、st.cal
  const mig6 = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); s.v = 5; delete s.market; delete s.cal; s.gear.oreBuy = { cyc: 3, n: 2 }; s.tick = 200;
    s.auction = { until: 204, items: [{ k: 'treasure', n: '天材地宝', m: 0.8, price: 1000 }, { k: 'pills', n: '破境丹 ×3', m: 0.5, price: 500, sold: 1 }] };
    const ok = window.__xm.loadState(s); const st = window.__xm.st;
    return { ok, v: st.v, mk: !!st.market && Array.isArray(st.market.rot), cal: !!st.cal, ore: st.gear.oreBuy, p: st.auction && st.auction.items[0].price, res: st.auction && st.auction.items[1].res, bids: st.auction && st.auction.bids, open: L.auctionOpen(st), shelf: L.shelf(st).length };
  });
  expect(mig6.ok && mig6.v === 6 && mig6.mk && mig6.cal && mig6.ore === undefined && mig6.p === 600 && mig6.res === 'won' && mig6.bids === 0 && mig6.open && mig6.shelf >= 6, `v5 → v6：${JSON.stringify(mig6)}`);
  await close();
  // ---------- 灵宠（SYSTEMS §4）：倍率、岗位、喂食与等级、进化分支与发现、好感、旧档迁移、灵宠事件 ----------
  const pt = await page.evaluate(() => {
    const { L } = window.__xm, o = {};
    const st = L.newState({ name: '灵宠测试' }); st.p.r = 3; st.flags.maxR = 3; st.home = { cave: 4, array: 8, field: 8, furnace: 6 }; st.herbs = 2000; st.stones = 1e6; st.tick = 100;
    const a = L.petGive(st, { sp: 'p_hu2', src: 'shop' }), p = st.pets[0];
    o.first = a.out && a.first && st.storyQ.includes('story_pet');
    o.mult = Math.abs(L.petAtkOf(st, p) - (1 + (L.PETS[2].m - 1) * 1.02)) < 1e-9 && Math.abs(L.atkParts(st).find(x => x[2] === 'pet')[1] - L.petAtkOf(st, p)) < 1e-9;
    const pw0 = L.petTry(st, () => { st.petOut = -1; }, () => L.power(st)); o.pw = Math.abs(L.power(st) / pw0 - L.petAtkOf(st, p)) < 1e-6;
    // 岗位：冰羽鹤（灵）看炉对口 ×1.5；月牙兔（寻）觅食；名册上限元婴 3
    L.petGive(st, { sp: 'p_he' }); L.petGive(st, { sp: 'p_tu' }); o.cap = L.petCap(st) === 3 && st.pets.length === 3;
    const r0 = L.petTry(st, () => L.petSetJob(st, 1, ''), () => L.alchRate(st)); L.petSetJob(st, 1, 'furnace');
    o.furnace = Math.abs(L.alchRate(st) - r0 - 0.06 * 1.5 * 1.02) < 1e-9;
    L.petSetJob(st, 2, 'array'); o.array = Math.abs(L.culParts(st).find(x => x[2] === 'petjob')[1] - (1 + 0.05 * 1.02)) < 1e-9;
    L.petSetJob(st, 2, 'forage'); const f0 = st.feed; L.petTick(st, {}); o.forage = Math.abs(st.feed - f0 - 0.5 * 1.5 * 1.02 * (1 + 1.02)) < 1e-6;   // 月牙兔天赋：觅食兽粮 ×2（超出部分随好感 +2%/心）
    L.petSetJob(st, 2, 'field'); o.field = L.incParts(st).some(x => x[2] === 'petjob' && Math.abs(x[1] - L.fieldInc(8) * 0.15 * 1.5 * 1.02) < 1e-6);
    L.petSetJob(st, 2, 'patrol'); o.patrol = Math.abs(L.petJobVal(st, 'patrol') - 0.5 * 1.02) < 1e-9 && L.petBadVisitor({ id: 're_bandit', title: '劫修夜闯' });
    // 喂食：每级 6 × 1.5^级 × 阶；5 级没进化就喂不进去，并触发进化事件 pet_evolve:p_hu2
    o.need = L.petNeed(p) === Math.round(6 * 1.5 * 2);
    st.feed = 1000; st.storyQ = []; let n = 0; while (!L.petFeedWhy(st, 0) && n++ < 200) L.petFeed(st, 0);
    o.lv5 = p.lv === 5 && L.petFeedWhy(st, 0) === '先进化' && st.storyQ.includes('pet_evolve_hu2') && L.petCanEvo(p) && L.petGlow(st, p);
    o.lvMult = Math.abs(L.petAtkOf(st, p) - (1 + (L.PETS[2].m - 1) * 1.2 * (1 + 0.02 * p.heart))) < 1e-9;
    // 进化分支与发现：铁背熊的“黑风岭禁地 3 趟”不满足时进化事件里那一项不显示
    const ev = L.eventById('pet_evolve_xiong'), xi = (L.petGive(st, { sp: 'p_xiong' }), st.petPend.length ? (L.petPendDecide(st, 0, 2), 2) : 3), x = st.pets[xi];
    x.lv = 5; st.petFocus = x.u;
    o.hide = !L.choiceShown(st, ev.choices[0]) && L.choiceShown(st, ev.choices[2]);
    x.deep[1] = 3; o.show = L.choiceShown(st, ev.choices[0]) && L.petBranchOk(st, x, 1);
    o.unknown = !L.petEvoKnown(st, 'p_hu2', 1);
    st.mats.yin.fire = 2; o.noYin = !!L.petEvolveWhy(st, 0, 1) && !L.petBranchOk(st, p, 1);
    st.mats.yin.fire = 5; const h0 = st.herbs, e = L.petEvolve(st, 0, 1);
    o.evolve = !!e && p.form === 1 && L.petTier(p) === 3 && st.herbs === h0 && st.mats.yin.fire === 2 && L.petEvoKnown(st, 'p_hu2', 1) && L.petName(p) === '炎虎王' && L.petTal(st, 'boss') > 1;
    // 好感：闲着 24 周天 −1 心；出战 36 周天 +1 心
    L.petSetJob(st, 1, ''); const hz = st.pets[1].heart; for (let i = 0; i < 24; i++) L.petTick(st, {});
    o.decay = st.pets[1].heart === hz - 1;
    const hp = p.heart; p.hp = 0; for (let i = 0; i < 36; i++) L.petTick(st, {}); o.gain = p.heart === Math.min(5, hp + 1);
    // 名册满：放生得兽粮
    const fd = st.feed, pend = L.petGive(st, { sp: 'p_fu' }); const rel = L.petPendDecide(st, 0); o.full = pend.pend && rel && st.feed === fd + rel.feed && rel.feed > 0;
    window.__petTest = st;
    return o;
  });
  for (const k in pt) expect(pt[k], '灵宠：' + k);
  // 旧档：v6 里的 st.p.pet（铁背熊 2 阶）→ 名册里 1 级出战的铁背熊；重复迁移不变
  const mp = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); delete s.pets; delete s.petOut; delete s.feed; s.p.pet = { tier: 2, name: '铁背熊' }; s.p.r = 1;
    const ok = window.__xm.loadState(s), st = window.__xm.st, s2 = L.migrate(JSON.parse(JSON.stringify(st)));
    st.guide = { step: 99, done: true }; st.hintSeen = { pet1: 1, pet2: 1, petEvo: 1, art1: 1 }; st.tick = 60;
    return { ok, n: st.pets.length, sp: st.pets[0] && st.pets[0].sp, lv: st.pets[0] && st.pets[0].lv, out: st.petOut, old: st.p.pet, n2: s2.pets.length, m: L.atkParts(st).find(x => x[2] === 'pet')[1] };
  });
  expect(mp.ok && mp.n === 1 && mp.sp === 'p_xiong' && mp.lv === 1 && mp.out === 0 && mp.old === undefined && mp.n2 === 1 && mp.m > 1.45, '旧灵宠迁移：' + JSON.stringify(mp));
  await close();
  // 灵宠事件：喂到 5 级 → 进化事件 pet_evolve_hu2 弹出来，点“喂赤炎果” → 炎虎王
  await page.evaluate(() => { const { st, L } = window.__xm; st.pets = []; st.petOut = -1; st.petPend = []; st.p.r = 2; st.flags.maxR = 2; st.herbs = 3000; st.mats.yin.fire = 4; st.feed = 900; st.storyQ = []; st.evDone = {}; st.flags.petFirst = 1; L.petGive(st, { sp: 'p_hu2', src: 'shop' }); st.storyQ = []; for (let i = 0; i < 80 && !L.petFeedWhy(st, 0); i++) L.petFeed(st, 0); });
  await page.evaluate(() => window.__xm.showChoice(window.__xm.L.eventById(window.__xm.st.storyQ.shift())));
  await page.waitForTimeout(300); await shot('c09-pet-evolve-event');
  const pe = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, n: document.querySelectorAll('#modal button[data-c]').length }));
  expect(pe.t.includes('虎啸') && pe.n === 3, '灵宠进化事件弹出：' + JSON.stringify(pe));
  await page.click('#modal button[data-c="0"]'); await page.waitForTimeout(400); await shot('c10-pet-evolve-done');
  const pf = await page.evaluate(() => ({ f: window.__xm.st.pets[0].form, n: window.__xm.L.petName(window.__xm.st.pets[0]), k: !!window.__xm.st.meta.petEvo.p_hu2_a }));
  expect(pf.f === 1 && pf.n === '炎虎王' && pf.k, '进化事件生效：' + JSON.stringify(pf));
  await close();
  // ---------- 灵田作物与炼丹（SYSTEMS §5、§6.2）----------
  const cr = await page.evaluate(() => {
    const { L } = window.__xm, o = {}, rng0 = L.rng;
    const mk = () => { const s = L.newState({ name: '灵田测试' }); s.p.r = 2; s.flags.maxR = 2; s.flags.maxI = 9; s.home = { cave: 2, array: 5, field: 9, furnace: 8 }; s.tick = 100; s.pact = 1; s.stats.exp = 10; return s; };
    const st = mk();
    // 田数 = 1 + floor(灵田等级 / 4)，至多 6 块；新开的田默认灵稻
    o.plots = [0, 1, 3, 4, 8, 20, 30].map(lv => { st.home.field = lv; return L.plotCount(st); }).join() === '0,1,1,2,3,6,6';
    st.home.field = 9; o.rice = L.plots(st).length === 3 && L.plots(st).every(x => x.c === 'rice');
    // 全种灵稻 = 旧的被动灵石：灵田 + 秋季 +50% + 守田灵宠 − 大旱（拆解里的“灵田”几项之和）
    const im = s => L.modProd(L.modParts('incMul', s));
    const fieldSum = s => L.incParts(s).filter(x => x[2] === 'field' || (x[2] === 'petjob' && /守田/.test(x[0]))).reduce((a, x) => a + x[1], 0) / im(s);
    const old = s => { const f = L.fieldInc(s.home.field), sf = L.seasonFx(s); return f * (1 + sf.rice - (L.worldOn(s, 'w_dahan') ? L.WORLD_V.dahan : 0) + (L.petJobVal(s, 'field') || 0)); };
    L.petGive(st, { sp: 'p_tu' }); L.petSetJob(st, 0, 'field');
    const eq = []; for (const t of [100, 103, 127]) { st.tick = t; eq.push(Math.abs(fieldSum(st) - old(st)) < 1e-6); }
    st.cal.w = { id: 'w_dahan', at: 125, until: 140 }; eq.push(Math.abs(fieldSum(st) - old(st)) < 1e-6); st.cal.w = null;
    o.equiv = eq.every(Boolean) && L.petJobVal(st, 'field') > 0;
    // 改种灵草：灵稻份额 2/3，灵石少三分之一；3 周天一收，3 × (1 + 0.5r) × (1 + 8% × 9) × 守田 × 春季 1.5
    const i0 = fieldSum(st); L.plant(st, 0, 'herb'); o.share = Math.abs(fieldSum(st) - i0 * 2 / 3) < 1e-6;
    st.tick = 118; const h0 = st.herbs, pj = 1 + L.petJobVal(st, 'field');
    for (let i = 0; i < 3; i++) { st.tick++; L.cropTick(st, {}); }
    const herbWant = 3 * (1 + 0.5 * 2) * (1 + 0.08 * 9) * pj * 1.5;
    o.herb = st.tick === 121 && L.season(st) === 0 && st.herbs - h0 === Math.floor(herbWant) && Math.abs(st.crops.prog.herbs - (herbWant % 1)) < 1e-6;
    // 赤炎果：6 周天收一枚火引 × 产量，夏季 +50%（收成那一周天是夏）
    L.plant(st, 1, 'fire'); st.tick = 118; const f0 = L.yinHave(st, 'fire'); let out6 = {};
    for (let i = 0; i < 6; i++) { st.tick++; out6 = {}; L.cropTick(st, out6); }
    const fireWant = (1 + 0.08 * 9) * pj * 1.5;
    o.fire = L.season(st) === 1 && L.yinHave(st, 'fire') - f0 === Math.floor(fireWant) && out6.harvest && out6.harvest.fire === Math.floor(fireWant);
    // 灵谷：4 周天兽粮 4 × 产量（夏旺）
    L.plant(st, 2, 'grain'); const fd0 = st.feed; st.tick = 130; for (let i = 0; i < 4; i++) { st.tick++; L.cropTick(st, {}); }
    o.grain = Math.abs(st.feed - fd0 - 4 * (1 + 0.08 * 9) * pj) < 1e-6;
    // 解锁：养魂花元婴；春集“买灵种”提前一种；坊市“灵种”
    o.lock = L.plantWhy(st, 0, 'soul') === '元婴解锁' && !L.plant(st, 0, 'soul') && L.cropOpen(st, 'bolt');
    L.applyFx(st, { flag: 'seed_early' }); o.seed = L.cropOpen(st, 'soul') && !st.eflags.seed_early;
    // 【全部改种】
    o.all = L.plantAll(st, 'vine') === 3 && L.plots(st).every(x => x.c === 'vine' && x.g === 0) && L.riceShare(st) === 0;
    // 药引丹方：试炼没揭晓的一格（火 + 冰 → 聚灵丹），丹成就揭晓并记进 st.meta.recipe，跨世保留；fx.recipe 'need' / 指定
    st.herbs = 5000; st.treasure = 5; st.mats.yin = { fire: 3, ice: 3, thunder: 2, wood: 2, soul: 2 }; st.toxin = 0;
    o.unknown = L.canCraft(st, 'juling') === '还没试出这一格' && L.trialWhy(st, 'ice', 'fire') === '';
    L.rng = () => 0.5;
    const tr = L.trial(st, 'ice', 'fire');
    o.trial = tr && tr.ok && tr.fresh && tr.k === 'juling' && st.meta.recipe.juling === 1 && st.mats.yin.fire === 2 && st.mats.yin.ice === 2 && st.buffs.some(b => b.src === 'juling');
    o.known = L.recipeKnown(st, 'juling') && L.canCraft(st, 'juling') !== '还没试出这一格';
    o.noStack = /药力还在/.test(L.canCraft(st, 'juling'));
    const st2 = L.newState({ meta: st.meta, rebirth: 1 }); o.cross = L.recipeKnown(st2, 'juling') && !L.recipeKnown(st2, 'baoqi');
    const n0 = L.recipeCount(st); L.applyFx(st, { recipe: 'need' }); o.need = L.recipeCount(st) === n0 + 1;
    L.applyFx(st, { recipe: 'qingdu' }); o.named = L.recipeKnown(st, 'qingdu');
    o.secret = /秘方/.test(L.canCraft(st, 'jiuzhuan')) && (L.applyFx(st, { recipe: 'jiuzhuan' }), L.recipeKnown(st, 'jiuzhuan'));
    // 丹毒：中品 +15、上品 +10、极品 +5；过 60 药力减半；会过 100 就不能服；每周天退 2；突破时每枚破境丹 +10；清毒丹 −40
    st.buffs = []; st.toxin = 0; const x0 = st.p.xp + 0; const g = L.gainCalm(st);
    L.craft(st, 'peiyuan'); o.tox15 = st.toxin === 15 && Math.abs(st.p.xp - x0 - 4 * g) < 1e-6;
    L.rng = () => 0.3; L.craft(st, 'peiyuan'); o.tox10 = st.toxin === 25;
    L.rng = () => 0.5; st.toxin = 61; const x1 = st.p.xp; L.craft(st, 'peiyuan'); o.half = st.toxin === 76 && Math.abs(st.p.xp - x1 - 2 * g) < 1e-6;
    st.toxin = 86; o.block = /再服就要中毒/.test(L.canCraft(st, 'peiyuan'));
    st.toxin = 30; L.alchTick(st, {}); o.decay = st.toxin === 28;
    st.toxin = 50; L.craft(st, 'qingdu'); o.qingdu = st.toxin === 10;
    st.toxin = 0; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 3; const bt = L.breakthrough(st, 2); o.btTox = !!bt && st.toxin === 20;
    // 自动续炼：每 3 周天；修炼类在丹毒会过 60 时跳过
    const s3 = mk(); s3.herbs = 2000; L.setAuto(s3, 'peiyuan', true); s3.tick = 3; const ob = {}; L.alchTick(s3, ob);
    s3.toxin = 50; s3.tick = 6; const ob2 = {}; L.alchTick(s3, ob2);
    o.auto = ob.brew && ob.brew.length === 1 && ob.brew[0].k === 'peiyuan' && !ob2.brew && /六十/.test(L.autoWhy(s3, 'peiyuan')) && L.setAuto(s3, 'pojing', true) && L.setAuto(s3, 'liaoshang', true) && !L.setAuto(s3, 'juling', true);
    // 战斗类丹：爆气丹 下一场对决战力 ×1.3（约战胜算涨），约战打完就用掉；雷火丹 下一趟历练分数 +10，出发就用掉
    const s4 = L.newState({ name: '对决' }); s4.tick = 30; s4.home.furnace = 3; s4.dan.bag.baoqi = [1]; s4.dan.bag.leihuo = [1];
    const pa = L.pactInfo(s4).p, pw0 = L.duelPower(s4, L.PACT_FOE);
    const tk = L.takePill(s4, 'baoqi');
    o.baoqi = !!tk && Math.abs(L.duelPower(s4, L.PACT_FOE) / pw0 - 1.3) < 1e-9 && L.pactInfo(s4).p > pa && s4.toxin === 15 && L.bagN(s4, 'baoqi') === 0;
    o.baoqiAgain = /丹囊里没有/.test(L.takeWhy(s4, 'baoqi'));
    s4.tick = L.PACT_TICK; L.pactDuel(s4); o.baoqiUsed = !L.danNext(s4, 'baoqi');
    L.takePill(s4, 'leihuo'); const lp = L.expExtraParts(s4, 0, 0, 0).find(x => /雷火丹/.test(x[0]));
    const g1 = L.expParts(s4, 0, 0, 0).guts; L.startExp(s4, 0, 0, 0);
    o.leihuo = !!lp && lp[1] === 10 && s4.exp && s4.exp.plan.guts === g1 && !L.danNext(s4, 'leihuo') && L.expParts(s4, 0, 0, 0).guts === g1 - 10;
    // 疗伤：丹囊里的疗伤丹优先，没有再用破境丹
    const s5 = mk(); s5.p.inj = 3; s5.pills = 2; s5.dan.bag.liaoshang = [1];
    o.heal = L.healWith(s5) === 'liaoshang' && L.heal(s5) && s5.p.inj === 0 && s5.pills === 2 && L.bagN(s5, 'liaoshang') === 0;
    s5.p.inj = 3; o.heal2 = L.healWith(s5) === 'pojing' && L.heal(s5) && s5.pills === 1;
    // 事件：fx.yin / cost.yin 是真的药引；fx.toxin
    const y0 = s5.mats.yin.ice; L.applyFx(s5, { yin: { ice: 2 } }); o.fxYin = s5.mats.yin.ice === y0 + 2 && L.costOk(s5, { yin: { ice: 2 } }) && !L.costOk(s5, { yin: { ice: 3 } });
    L.applyFx(s5, { toxin: 30 }); o.fxTox = s5.toxin === 30;
    // 坊市：药引一包（两枚同种）
    s5.market.rot = [{ k: 'yin', lim: 2, sold: 0, off: 0, yin: 'soul' }]; s5.market.cyc = Math.floor(s5.tick / 12); s5.stones = 1e6; s5.flags.maxI = 9;
    const row = L.shelf(s5).find(r => r.k === 'yin'); const so = s5.mats.yin.soul; const b = row && L.shelfBuy(s5, row.i);
    o.shop = !!row && row.n === '魂引一包' && !!b && s5.mats.yin.soul === so + 2;
    // 变种：药引作物成熟时 3% 触发 field_mutant（剧情 home_field_mutant）
    const s6 = mk(); L.plant(s6, 0, 'fire'); s6.storyQ = []; L.rng = () => 0.01; for (let i = 0; i < 6; i++) { s6.tick++; L.cropTick(s6, {}); }
    o.mutant = s6.storyQ.includes('home_field_mutant') && s6.crops.mut === 'fire';
    L.rng = rng0;
    // 旧档：没有 st.crops / mats / dan / toxin / meta.recipe → 田全种灵稻（收入不变）、药引 0、丹毒 0；重复迁移不变
    const od = JSON.parse(JSON.stringify(mk())); delete od.crops; delete od.mats; delete od.dan; delete od.toxin; delete od.meta.recipe; od.home.field = 9;
    const inc0 = L.fieldInc(9); const m1 = L.migrate(od), m2 = L.migrate(JSON.parse(JSON.stringify(m1)));
    o.migrate = !!m1 && m1.crops.plots.length === 3 && m1.crops.plots.every(x => x.c === 'rice') && Math.abs(L.incParts(m1).find(x => x[2] === 'field')[1] - inc0 * im(m1)) < 1e-6
      && m1.mats.yin.fire === 0 && m1.toxin === 0 && Array.isArray(m1.dan.auto) && !!m1.meta.recipe && JSON.stringify(m2.crops) === JSON.stringify(m1.crops) && JSON.stringify(m2.dan) === JSON.stringify(m1.dan);
    return o;
  });
  for (const k in cr) expect(cr[k], '灵田与炼丹：' + k);
  // 锦囊：约战前丹囊里有爆气丹 → “服一枚爆气丹：胜算 p → p'”，点【服】生效
  const jn = await page.evaluate(() => {
    const { L } = window.__xm; const s = L.newState({ name: '锦囊' }); s.tick = 30; s.home.furnace = 3; s.dan.bag.baoqi = [1]; s.guide = { step: 99, done: true }; s.hintSeen = { pactSoon: 1, toxin: 1 }; s.stats.exp = 3;
    s.gear.w = { u: 1, id: 'w1_0', slot: 'w', t: 1, plus: 0, aff: [], fail: 0 };   // 兵器已到上限：锦囊里不再有“换一件”
    window.__xm.loadState(JSON.parse(JSON.stringify(s)));
    const st = window.__xm.st, p0 = L.pactInfo(st).p;
    st.dan.next.baoqi = 1.3; const p1 = L.pactInfo(st).p; delete st.dan.next.baoqi;
    window.__xm.showPact();
    const row = [...document.querySelectorAll('#modal .grow-row')].find(r => r.textContent.includes('服一枚爆气丹'));
    return { p0: L.pct(p0), p1: L.pct(p1), txt: row ? row.textContent : '' };
  });
  await page.waitForTimeout(300); await shot('c11c-pact-baoqi');
  expect(jn.txt.includes(`${jn.p0} → ${jn.p1}`), '锦囊里有“服一枚爆气丹：胜算 p → p\'”：' + JSON.stringify(jn));
  await page.click('#modal [data-go="pill:baoqi"]'); await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__xm.L.danNext(window.__xm.st, 'baoqi') > 1 && window.__xm.L.bagN(window.__xm.st, 'baoqi') === 0), '锦囊里点【服】服下了爆气丹');
  await close();
  // 老祖：第一次有丹毒，一次阻塞讲解（指着状态栏的葫芦，暂停，数字对）
  await page.evaluate(() => { const { st } = window.__xm; delete st.hintSeen.toxin; st.toxin = 25; window.__xm.setSpeed(0); });
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(300);
    const a = await page.evaluate(() => window.__xm.guideDbg.active);
    if (a === 'toxin') break;
    await page.evaluate(() => { const { st } = window.__xm; for (const id of window.__xm.guideDbg.cand) if (id !== 'toxin') st.hintSeen[id] = 1; st.toxin = 25; const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); });
  }
  await page.waitForTimeout(300); await shot('c11d-toxin-hint');
  const th = await page.evaluate(() => ({ vis: !document.querySelector('#guide').hidden, txt: document.querySelector('#guide .gtext').textContent, hold: window.__xm.guideHold }));
  expect(th.vis && th.hold && th.txt.includes('丹毒 25') && th.txt.includes('过 60'), '老祖的丹毒讲解：' + JSON.stringify(th));
  await page.evaluate(() => { const ok = document.querySelector('#guide [data-g="ok"]'); if (ok) ok.click(); window.__xm.setSpeed(3); });
  await page.waitForTimeout(300);
  // 人物分页
  for (const t of ['attr', 'bond', 'ach', 'rank']) { await page.evaluate(t => window.__xm.showMe(t), t); await page.waitForTimeout(250); await shot('c07-me-' + t); }
  await close();
  await page.waitForTimeout(3000); await shot('c08-hud');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
