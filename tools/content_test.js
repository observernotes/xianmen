// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、功法（三槽、熟练、共鸣、五行克制、fx.art）、
// 法宝（对比卡与继承、熔炼与锁定、强化与保底、词条效果、fx.ore / fx.plus、器方打造、v4 → v5 迁移）、特训、人物分页、
// 历法与坊市（四季效果、天下大势效果与到期、货架轮换与限购、行情卖价、竞价结果与宿敌加成、坊市事件、年历与大势小牌、v5 → v6 迁移）、
// 灵田与炼丹（田数、作物周期与产出、旺季、全种灵稻与旧被动灵石等价、解锁与灵种、改种、药引丹方的试炼与跨世图鉴、fx.recipe、丹毒的加减与门槛、自动续炼、
// 爆气丹 / 雷火丹的效果与用掉、锦囊里的“服一枚爆气丹：胜算 p → p'”、疗伤丹、药引一包、旧档迁移、老祖的丹毒讲解）、
// 秘境（掉血公式与五行、离开与出局、秘藏、秘境事件与 run_* 标记、送令、迁移、存档续玩）
// 天劫（护劫手段的加成与代价、预掷与结果一致、临场提示八成准、评价 → 道基与“N 品金丹”、失败代价、心魔劫、那一停的界面）、道心（5/12/25 与九条效果、评语）、
// 因果（fx.karma 记当事人、寻仇事件、了结、轮回的业、界面）、迁移补字段
// 宗门加深（任务板四类、宝库轮换、职司五堂、人脉支持与晋升门槛、送礼、40 / 80 的恩惠、徒弟成长 / 差事 / 传授 / 出师 / 候选、性情事件、三人会武、血煞魔宗、长老事件界面、老祖讲解、迁移）
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
    st.guide = { step: 99, done: true }; st.hintSeen = {}; for (const k of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life', 'dao1', 'karma1', 'pet1', 'pet2', 'petEvo', 'crops', 'yinGrid', 'toxin', 'plots', 'zhen']) st.hintSeen[k] = 1;
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
  await page.click('#modal [data-stab="task"]'); await page.waitForTimeout(300);
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
  expect(Math.abs(cb.age - (1 - 0.08) * 0.9) < 1e-9, `生生不息：寿元流逝 ×${cb.age.toFixed(3)}（青木 −8% × 再 −10%）` + await page.evaluate(() => JSON.stringify([(window.__xm.st.pets || []).map(p => p.sp + p.lv), window.__xm.st.log.slice(0, 12).map(x => x.text.slice(0, 30))])));
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
    const { st, L } = window.__xm; st.p.r = 4; st.flags.maxR = 4; st.home.furnace = 8; st.home.forge = 5; L.homePlots(st);   // 器炉不再借丹炉等级：要建一座器炉
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
  await page.evaluate(() => { const { st, L } = window.__xm; st.market.evQ = []; st.tick = 158; st.cal.w = { id: 'w_shouchao', at: 158, until: 166 }; L.rollAuction(st); st.market.evQ = []; document.querySelector('#tip').hidden = true; for (const h of window.__xm.hints) if (!/^realm/.test(h.id)) st.hintSeen[h.id] = 1; const gk = document.querySelector('#guide [data-g="ok"]'); if (gk) gk.click(); });   // 老祖讲解不要盖住大势小牌
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
  // ---------- 天劫（SYSTEMS §9）----------
  const SEEN = ['ready', 'btGo', 'trib', 'tribPause', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life',
    'art1', 'art2', 'zhanji', 'mishu', 'ke', 'gearCmp', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge', 'cal', 'world1', 'shelf', 'sell', 'auction', 'dao1', 'karma1', 'pet1', 'pet2', 'petEvo', 'crops', 'yinGrid', 'toxin'];
  await page.evaluate(SEEN => { const { st } = window.__xm; st.guide = { step: 99, done: true }; st.hintSeen = st.hintSeen || {}; for (const k of SEEN) st.hintSeen[k] = 1; document.querySelector('#tip').hidden = true; }, SEEN);
  // 护劫手段的加成与代价：基础 + 破境丹 + 祭法宝 8% + 道侣 8%；灵宠、渡劫阵没上线时不可用（写明原因），接上钩子就能用
  const aid = await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.p.r = 2; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 8; st.flags.sureBt = 0; st.p.fails = 0; st.trib = L.newTrib(); st.eflags = {}; st.dao = { k: 0, w: 0, r: 0 };
    st.gear = L.newGear(); L.gearDrop(st, 'w', 3, { base: 'w3_0' }); st.gear.w.plus = 3; st.daolv = 'su'; st.npc.su = { aff: 70, f60: 1 };
    const parts = L.tribParts(st, { pills: 2, aids: { fa: 1, daolv: 1, pet: 1, zhen: 1 } });
    // 灵宠挡劫（pets.js 的 L.petCanShield / L.petShield）：名册里没有 5 心的不可用；5 心的出战灵宠 +10%，挡完休养 12 周天，这期间出战倍率不算
    st.pets = []; st.petOut = -1; st.petPend = []; st.flags.maxR = Math.max(st.flags.maxR || 0, 2);
    const pet0 = L.aidInfo(st, 'pet'), zhen0 = L.aidInfo(st, 'zhen');
    L.petGive(st, { sp: 'p_hu2' }); const pp = st.pets[0]; pp.heart = 4; const pet4 = L.aidInfo(st, 'pet').ok; pp.heart = 5;
    const pet1 = L.aidInfo(st, 'pet'), r1 = L.tribRate(st, { pills: 0, aids: { pet: 1 } }), r0 = L.tribRate(st, { pills: 0, aids: {} });
    const pw0 = L.power(st);
    st.pills = 0; const v = L.tribStart(st, { pills: 0, aids: { pet: 1 } }); const rested = (pp.rest || 0) - st.tick, pwRest = L.power(st) / pw0, again = L.aidInfo(st, 'pet').ok;
    st.trib.cur = null; st.pills = 8; st.pets = []; st.petOut = -1;
    return { names: parts.map(x => x[0]).join(','), rate: L.tribRate(st, { pills: 2, aids: { fa: 1, daolv: 1 } }), base: L.REALMS[2].rate, furn: st.home.furnace * L.BT.furnace,
      pet0: pet0.ok, pet4, petWhy: pet0.why, zhen0: zhen0.ok, zhenWhy: zhen0.why, pet1: pet1.ok, petD: Math.round((r1 - r0) * 100), rested, petUsed: !!(v && v.aids.pet), restOff: pwRest < 0.999 && !again, cost: L.aidInfo(st, 'fa').cost };
  });
  expect(Math.abs(aid.rate - Math.min(1, aid.base + aid.furn + 0.30 + 0.16)) < 1e-9 && aid.names.includes('祭法宝') && aid.names.includes('道侣护法') && !aid.names.includes('灵宠挡劫') && !aid.names.includes('渡劫阵'),
    `护劫手段：${aid.names} = ${L_pct(aid.rate)}（基础 ${aid.base} + 丹 30% + 法宝 8% + 道侣 8%）`);
  expect(!aid.pet0 && !aid.pet4 && /灵宠/.test(aid.petWhy) && !aid.zhen0 && /阵/.test(aid.zhenWhy) && aid.pet1 && aid.petD === 10 && aid.rested === 12 && aid.petUsed && aid.restOff && aid.cost.includes('+3 → +2'),
    `没有 5 心灵宠、渡劫阵未上线时不可用（${aid.petWhy} / ${aid.zhenWhy}）；5 心灵宠挡劫 +${aid.petD}%、休养 ${aid.rested} 周天（期间不出力 ${aid.restOff}）；祭法宝代价：${aid.cost}`);
  // 预掷与结果一致：同一个 u，成败 = u < 补完后的成功率；曲线单调下降，败了最后一道打穿；评价按余量；临阵吞丹另算在 3 枚之外、记丹毒
  const pre = await page.evaluate(() => {
    const { st, L } = window.__xm, bad = [];
    let n = 0, ok = 0, extraUp = 0;
    for (let i = 0; i < 300; i++) {
      st.p.r = 2 + (i % 6); st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 8; st.p.fails = 0; st.trib.cur = null; st.trib.daoji = 0; st.eflags = {}; st.toxin = 0;
      // 丹毒（alchemy.js）上线后临阵吞丹走 L.addToxin（每枚 +20），开渡时服的破境丹结算时每枚 +10
      const tox = () => (L.addToxin ? st.toxin : st.trib.toxin), toxPre = L.addToxin ? L.TOX.bt * (i % 4) : 0;
      const v = L.tribStart(st, { pills: i % 4, aids: i % 2 ? { fa: 1 } : {} }), u = st.trib.cur.u, pill0 = st.pills, tox0 = tox();
      const mono = v.curve.every((x, j) => !j || x <= v.curve[j - 1] + 1e-9);
      const ex = i % 3 === 0 ? { pills: 2 } : {};
      const pv = L.tribPreview(st, ex), r = L.tribFinish(st, ex), p1 = r.tb.p1, m = p1 - u;
      if (pv.ok !== r.ok || pv.grade !== r.tb.grade || pv.p1 !== p1 || JSON.stringify(pv.curve1) !== JSON.stringify(r.tb.curve1)) bad.push('pv' + i);
      if (r.ok !== (u < p1) || !mono || (r.ok ? r.tb.curve1[v.N] <= 0 : r.tb.curve1[v.N] !== 0) || Math.abs(r.tb.margin - m) > 1e-3 || JSON.stringify(r.tb.curve0) !== JSON.stringify(v.curve)) bad.push(i);
      if (ex.pills) { if (Math.abs(p1 - Math.min(1, v.p + 0.2)) > 1e-9 || pill0 - st.pills !== 2 || tox() - tox0 !== 40 + toxPre) bad.push('ex' + i); else extraUp++; }
      else if (JSON.stringify(r.tb.curve1) !== JSON.stringify(v.curve)) bad.push('c' + i);
      if (r.ok) { ok++; const g = m >= 0.5 ? '完美' : m >= 0.25 ? '上' : m >= 0.08 ? '中' : '下'; if (r.tb.grade !== g) bad.push('g' + i); }
      n++;
    }
    return { n, ok, bad: bad.slice(0, 6), extraUp };
  });
  expect(!pre.bad.length && pre.ok > 0 && pre.ok < pre.n && pre.extraUp >= 90, `预掷 ${pre.n} 次：成败、曲线、评价与预掷一致（成 ${pre.ok}，临阵吞丹 ${pre.extraUp} 次）${pre.bad.join(',')}`);
  // 临场提示：八成准；稳·道心三级十成准；提示对的时候红线就是实际落点
  const hint = await page.evaluate(() => {
    const { st, L } = window.__xm;
    const run = () => { let right = 0, n = 0, mk = 0; for (let i = 0; i < 1500; i++) { st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 5; st.trib.cur = null; const v = L.tribStart(st, { pills: i % 4 }); n++; if (v.hint.right) { right++; if (Math.abs(v.hint.mark - v.curve[v.N]) < 1e-9) mk++; } st.trib.cur = null; } return { acc: right / n, mk: mk / Math.max(1, right) }; };
    st.dao = { k: 0, w: 0, r: 0 }; const a = run();
    st.dao.w = 25; const b = run(); st.dao.w = 0;
    return { a, b };
  });
  expect(Math.abs(hint.a.acc - 0.8) < 0.04 && hint.b.acc === 1 && hint.a.mk === 1, `临场提示准 ${L_pct(hint.a.acc)}（稳三级 ${L_pct(hint.b.acc)}），提示对时红线 = 实际落点`);
  // 评价 → 道基（修炼、战力同乘），累计上限 24%；金丹那一次定名“N 品金丹”
  const dj = await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.trib = L.newTrib(); st.p.r = 1; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 5; st.flags.sureBt = 0; st.p.fails = 0;
    const rng = L.rng; L.rng = () => 0.01;   // u 很小：余量大 → 完美
    const r = L.breakthrough(st, 3, { aids: 'all' });
    L.rng = rng;
    const c1 = L.culParts(st).find(x => x[0].startsWith('道基')), a1 = L.atkParts(st).find(x => x[0].startsWith('道基'));
    st.trib.daoji = 0.23; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 5; L.rng = () => 0.01; const r2 = L.breakthrough(st, 3, { aids: 'all' }); L.rng = rng;
    return { ok: r.ok, g: r.tb.grade, dan: st.trib.dan, resDan: r.dan, add: r.daoji.add, c1: c1 && c1[1], a1: a1 && a1[1], cap: st.trib.daoji, add2: r2.daoji && r2.daoji.add, capped: r2.daoji && r2.daoji.capped };
  });
  expect(dj.ok && dj.g === '完美' && dj.dan === '一品金丹' && dj.resDan === '一品金丹' && Math.abs(dj.add - 0.03) < 1e-9 && Math.abs(dj.c1 - 1.03) < 1e-9 && Math.abs(dj.a1 - 1.03) < 1e-9, `完美 → 道基 +3%（修炼 ×${dj.c1}、战力 ×${dj.a1}），结成「${dj.dan}」`);
  expect(Math.abs(dj.cap - 0.24) < 1e-9 && Math.abs(dj.add2 - 0.01) < 1e-9 && dj.capped, `道基上限 24%：0.23 + 完美只加到 ${dj.cap}`);
  // 失败的代价：祭过的兵器强化 −1、道侣好感 −5；修为退到 70%、负伤 3；道侣这一境界不再护法
  const fl = await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.p.r = 4; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 0; st.flags.sureBt = 0; st.p.fails = 0; st.trib.cur = null; st.gear.w.plus = 3; st.daolv = 'su'; st.npc.su = { aff: 70, f60: 1 }; st.trib.daolv = {}; st.p.inj = 0;
    const rng = L.rng; L.rng = () => 0.999; const r = L.breakthrough(st, 0, { aids: { fa: 1, daolv: 1 } }); L.rng = rng;
    return { ok: r.ok, plus: st.gear.w.plus, aff: st.npc.su.aff, inj: st.p.inj, costs: r.tb.costs.join('，'), xp: st.p.xp / L.pNeed(st.p), again: L.aidInfo(st, 'daolv').ok };
  });
  expect(!fl.ok && fl.plus === 2 && fl.aff === 65 && fl.inj === 3 && Math.abs(fl.xp - 0.7) < 0.02 && !fl.again, `失败：${fl.costs}；修为 ${L_pct(fl.xp)}、负伤 ${fl.inj}；道侣这一境界不再护法`);
  // 心魔劫（元婴前）：题目取自本世第一条没了的因果；还这么选 +5%；换一种 −5% 且了结那一条
  const dm = await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.p.r = 2; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.trib.cur = null; st.karma = L.newKarma(); delete st.evDone.story_demon1; st.eflags = {};
    const ev = L.eventById('world_tongji'); L.addKarma(st, 'tongji', ev, ev.choices[1]);
    const pre = L.tribPre(st), q = L.demonQuestion(st, 1);
    const snap = JSON.stringify(st);
    L.resolveChoice(st, pre, 0); const firm = L.btParts(st, 0).find(x => /心魔/.test(x[0]));
    const s2 = JSON.parse(snap); window.__xm.loadState(s2); const st2 = window.__xm.st;
    L.resolveChoice(st2, L.eventById('story_demon1'), 1); const waver = L.btParts(st2, 0).find(x => /心魔/.test(x[0]));
    const q0 = L.demonQuestion(st2, 1).text; st2.daolv = 'ye'; const q2 = L.demonQuestion(st2, 2).text; st2.daolv = null;
    return { pre: pre && pre.id, q: q.text, firm: firm && firm.join(':'), waver: waver && waver.join(':'), open: L.karmaOpen(st2).length, done: st2.karma.done, q0, q2, q2n: L.demonQuestion(st2, 2).who, q3: L.demonQuestion(st2, 3).who };
  });
  expect(dm.pre === 'story_demon1' && dm.q.includes('被冤枉的通缉犯') && dm.q.includes('拿下他领赏') && dm.firm === '心魔劫·道心如一:0.05' && dm.waver === '心魔劫·道心动摇:-0.05' && dm.open === 0 && dm.done === 1,
    `心魔劫：${dm.q}；还这么选 ${dm.firm}，换一种 ${dm.waver} 且了结（未了 ${dm.open}）`);
  expect(dm.q0.includes('被逐出山门') && /选了.*没有选/.test(dm.q2) && dm.q2n === '戒中老祖' && dm.q3 === '陆天衡', `心魔题目：没因果 → ${dm.q0.slice(0, 10)}；化神 → ${dm.q2}（没道侣是${dm.q2n}）；合体 → ${dm.q3}`);
  await page.evaluate(SEEN => { const { st } = window.__xm; st.guide = { step: 99, done: true }; for (const k of SEEN) st.hintSeen[k] = 1; }, SEEN);
  // ---------- 道心（SYSTEMS §14）：5 / 12 / 25 笔各一级，效果都接上 ----------
  const dao = await page.evaluate(() => {
    const { st, L } = window.__xm, out = {};
    st.dao = { k: 0, w: 0, r: 0 };
    const lvAt = []; for (let i = 1; i <= 25; i++) { L.addDao(st, 'k', 1); lvAt.push(L.daoLv(st, 'k')); }
    out.th = [lvAt.indexOf(1) + 1, lvAt.indexOf(2) + 1, lvAt.indexOf(3) + 1].join('/');
    // 狂：越级 ×2.4、对决下限 8%
    out.leap = L.leapMult(st) / (2 * L.gearExp(st).leap); out.lo = L.duelP(st, 1, 1e9, {});
    // 狂三级：丁等以伤换命再战一次（翻到丙以上算数，换一周天轻伤）
    st.exp = null; st.retreat = null; st.p.inj = 0; st.p.r = 3; st.p.s = 0; st.p.xp = 0;
    const mk = () => { L.startExp(st, 0, 0, 0); const pl = st.exp.plan; Object.assign(pl, { fix: undefined, gift: undefined, aff: 0, guts: 0, adj: 0, rnd: -12, pow: L.RATE_TH[0] - 3 + 12 }); pl.u[0] = 0.1; pl.u[5] = 0; pl.u[7] = 0.99; pl.u[8] = 0.99; };
    mk(); const re = L.resolveExp(st); out.refight = re.refight; out.rating = re.rating; out.inj = st.p.inj;
    st.dao.k = 0; st.p.inj = 0; mk(); const re0 = L.resolveExp(st); out.noRefight = !re0.refight && re0.rating === 0;
    // 稳：突破 +3%、闭关花费 ×0.85、天劫提示十成准
    st.flags.retFree = 1; const rc0 = L.retCost(st); st.dao.w = 12; out.bt = (L.btParts(st, 0).find(x => x[0] === '道心·稳') || [])[1]; out.ret = L.retCost(st) / rc0; st.dao.w = 25; out.acc = L.tribHintAcc(st);
    // 仁：来访的人给好感多 +1；五心只要 90
    st.dao.r = 5; st.npc.ge = { aff: 10 };
    L.applyFx(st, { aff: { ge: 5 } }, { ev: { id: 'x', visit: true } }); out.aff = st.npc.ge.aff;
    L.applyFx(st, { aff: { ge: 5 } }, { ev: { id: 'y' } }); out.aff2 = st.npc.ge.aff;
    st.npc.ge.aff = 90; out.h0 = L.hearts(st, 'ge'); st.dao.r = 25; out.h1 = L.hearts(st, 'ge'); out.disc = L.daoDiscMult(st);
    st.dao = { k: 3, w: 9, r: 1 }; out.top = L.daoTop(st); out.end = L.daoEnding(st); out.ch = L.daoChapter(st, 2);
    return out;
  });
  expect(dao.th === '5/12/25', `道心门槛 ${dao.th}`);
  expect(Math.abs(dao.leap - 1.2) < 1e-9 && Math.abs(dao.lo - 0.08) < 1e-9, `狂：越级 ×${dao.leap}、对决下限 ${L_pct(dao.lo)}`);
  expect(dao.refight === 'win' && dao.rating === 1 && dao.inj === 1 && dao.noRefight, `狂三级：丁等再战一次 → ${dao.refight}，评价 ${dao.rating}、轻伤 ${dao.inj}；没有狂三级仍是丁（${dao.noRefight}）`);
  expect(Math.abs(dao.bt - 0.03) < 1e-9 && Math.abs(dao.ret - 0.85) < 0.02 && dao.acc === 1, `稳：突破 +${dao.bt}、闭关 ×${(dao.ret || 0).toFixed(2)}、提示 ${dao.acc}`);
  expect(dao.aff === 16 && dao.aff2 === 21 && dao.h0 === 4 && dao.h1 === 5 && dao.disc === 1.2, `仁：来访好感 10 → ${dao.aff}（非来访 +5 → ${dao.aff2}），好感 90 时 ${dao.h0} → ${dao.h1} 心，徒弟 ×${dao.disc}`);
  expect(dao.top === 'w' && dao.end.includes('一步一步') && dao.ch.startsWith('第三章完') && dao.ch.includes('走得稳'), `评语按最高的道心：${dao.ch}`);
  // ---------- 因果：记一条（带当事人）→ 寻仇事件 → 了结；轮回的业 ----------
  const km = await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.karma = L.newKarma(); st.tick = 300; st.p.r = 3; st.dao = { k: 0, w: 0, r: 0 }; st.exp = null;
    const ev = L.eventById('world_tongji'), i = ev.choices.findIndex(c => c.ok.fx && c.ok.fx.karma);
    const rng = L.rng; L.rng = () => 0.001; const r = L.resolveChoice(st, ev, i); L.rng = rng;
    const rec = L.karmaOpen(st)[0];
    const door = L.eventById('karma_door'); delete st.evLast.karma_door; const e0 = L.eligible(st, door, 'home', { visit: true });
    st.tick = 330; const e1 = L.eligible(st, door, 'home', { visit: true }), txt = L.fill(st, door.text);
    const kr0 = L.karmaRebirth(st);
    st.stones = 1e7; L.resolveChoice(st, door, 0);
    return { fx: r.fx.join('、'), who: rec && rec.who, t: rec && rec.t, e0, e1, txt, mult: kr0.mult, open: L.karmaOpen(st).length, done: st.karma.done,
      live: ['story_demon1', 'story_demon2', 'story_demon3', 'story_ascend', 'tianheng_2', 'world_tongji', 'karma_door', 'karma_ambush'].filter(id => L.evLive(L.eventById(id))).length };
  });
  expect(km.fx.includes('因果 +1') && km.who === '被冤枉的通缉犯' && km.t === '拿下他领赏', `fx.karma：${km.fx}，当事人 ${km.who}`);
  expect(!km.e0 && km.e1 && km.txt.includes('被冤枉的通缉犯') && Math.abs(km.mult - 0.98) < 1e-9 && km.open === 0 && km.done === 1, `寻仇事件 24 周天后才上门（${km.e0} → ${km.e1}）：${km.txt.slice(0, 26)}…；赔礼了结（未了 ${km.open}，轮回业 ×${km.mult}）`);
  expect(km.live === 8, `心魔劫、飞升前夜、了断、寻仇等事件上线：${km.live}/8`);
  // 界面：一件带 fx.karma 的事件，选了之后结果页写“因果 +1”，人物 → 道心里列着
  await page.evaluate(() => { const { st, L } = window.__xm; st.karma = L.newKarma(); delete st.evLast.world_tongji; L.rng = () => 0.001; window.__xm.showChoice(L.eventById('world_tongji')); });
  await page.waitForTimeout(300);
  const kIdx = await page.evaluate(() => window.__xm.L.eventById('world_tongji').choices.findIndex(c => c.ok.fx && c.ok.fx.karma));
  await page.click(`#modal button[data-c="${kIdx}"]`); await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { const t = await page.evaluate(() => (document.querySelector('#modal .body') || {}).textContent || ''); if (t.includes('因果 +1')) break; await page.waitForTimeout(400); }
  const kUi = await page.evaluate(() => ({ body: (document.querySelector('#modal .body') || {}).textContent || '', n: window.__xm.L.karmaOpen(window.__xm.st).length }));
  await page.evaluate(() => { window.__xm.L.rng = Math.random; });
  expect(kUi.body.includes('因果 +1') && kUi.n === 1, `界面：选了“拿下他领赏”→ 结果页${kUi.body.includes('因果 +1') ? '写了' : '没写'}“因果 +1”，记下 ${kUi.n} 条`);
  await close();
  await page.evaluate(() => { const { st } = window.__xm; st.dao = { k: 6, w: 13, r: 2 }; document.querySelector('#tip').hidden = true; window.__xm.showMe('dao'); });
  await page.waitForTimeout(300); await shot('c30-dao');
  const daoUi = await page.evaluate(() => ({ rows: document.querySelectorAll('#modal .daorow').length, karma: document.querySelectorAll('#modal .krow').length, txt: document.querySelector('#modal .body').textContent, tab: !!document.querySelector('#modal .tabs button.on[data-t="dao"]') }));
  expect(daoUi.rows === 3 && daoUi.karma >= 1 && daoUi.tab && daoUi.txt.includes('被冤枉的通缉犯') && daoUi.txt.includes('道基') && daoUi.txt.includes('一级'), `人物 → 道心：三条道心、因果 ${daoUi.karma} 条、道基`);
  await close();
  // 老祖：道心头一回到一级、头一笔因果，各一次阻塞讲解（时间暂停，数字与逻辑一致）
  const gHint = async (id, setup) => {
    await page.evaluate(([id, setup]) => { const { st } = window.__xm; st.exp = null; st.retreat = null; st.hintSeen[id] = 0; st.hintSeen.plots = 1; st.hintSeen.zhen = 1; st.tick += 3; st.storyQ = []; new Function('st', setup)(st); if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }, [id, setup]);
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({ g: document.getElementById('guide').hidden ? '' : document.querySelector('#guide .gtext').textContent, hold: window.__xm.guideHold, dbg: JSON.stringify(window.__xm.guideDbg) }));
    const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (o) { await o.click(); await page.waitForTimeout(200); }
    return r;
  };
  const gd = await gHint('dao1', "st.dao = { k: 5, w: 2, r: 1 };");
  expect(gd.g.includes('狂 5') && gd.g.includes('一级') && gd.g.includes('越级奖励') && gd.hold, `道心讲解：${gd.g.slice(0, 40)}（暂停 ${gd.hold}）${gd.g ? "" : gd.dbg}`);
  const gk = await gHint('karma1', "");
  expect(gk.g.includes('因果') && gk.g.includes('被冤枉的通缉犯') && gk.g.includes('−2%') && gk.hold, `因果讲解：${gk.g.slice(0, 40)}（暂停 ${gk.hold}）${gk.g ? "" : gk.dbg}`);
  // 界面：雷劫中途那一停——提示在三种之内、老祖讲怎么补（时间暂停），补上临阵吞丹成功率上去；结束有道基印
  await page.evaluate(() => {
    const { st, L } = window.__xm; st.trib = L.newTrib(); st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 2; st.p.fails = 0; st.flags.sureBt = 0; st.exp = null; st.retreat = null;
    st.evDone.story_demon2 = 1; st.hintSeen.tribNow = 0; st.daolv = null; st.p.inj = 0; st.visitor = null; st.storyQ = [];
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__xm.showBreakthrough()); await page.waitForTimeout(300);
  await page.evaluate(() => { for (let i = 0; i < 3; i++) { const b = document.querySelector('#btStep [data-st="-1"]'); if (b && !b.disabled) b.click(); } });
  await page.waitForTimeout(200);
  await page.click('#modal .foot .btn.gold');
  for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!document.querySelector('#tribPause'))) break; await page.waitForTimeout(200); }
  await page.waitForTimeout(500); await shot('c31-trib-pause');
  const pzT = await page.evaluate(() => ({ hint: (document.querySelector('#tribHint') || {}).textContent, rate: (document.querySelector('#tpRate') || {}).textContent, g: document.getElementById('guide').hidden ? '' : document.querySelector('#guide .gtext').textContent, hold: window.__xm.guideHold, p: window.__xm.cineState && window.__xm.cineState.v.p }));
  expect(['大概能过', '悬', '过不了'].includes(pzT.hint) && pzT.g.includes('那一停') && pzT.g.includes(L_pct(pzT.p)) && pzT.hold, `那一停：提示“${pzT.hint}”，老祖：${pzT.g.slice(0, 34)}（时间暂停 ${pzT.hold}）`);
  for (let i = 0; i < 3; i++) { const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (!o) break; await o.click(); await page.waitForTimeout(200); }
  await page.click('#modal [data-exp="1"]'); await page.waitForTimeout(200);
  const pzT2 = await page.evaluate(() => (document.querySelector('#tpRate') || {}).textContent);
  expect(pzT2.includes('→'), `补一枚临阵吞丹：成功率 ${pzT2}`);
  await page.click('#modal .foot .btn.gold');
  for (let i = 0; i < 50 && await page.evaluate(() => window.__xm.cine); i++) await page.waitForTimeout(200);
  await page.waitForTimeout(400); await shot('c32-trib-result');
  const tr = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, stamp: !!document.querySelector('#tribGrade img'), txt: document.querySelector('#modal .body').textContent }));
  expect((tr.t === '渡劫成功' && tr.stamp) || (tr.t === '渡劫失败' && tr.txt.includes('余量')), `渡劫结果：${tr.t}${tr.stamp ? '（道基印）' : ''}`);
  await close();
  // 存档迁移（不升版本）：没有天劫 / 道心 / 因果字段的档补默认值；读两遍一样；渡到一半的预掷留着
  const migT = await page.evaluate(() => {
    const { L } = window.__xm; const s = JSON.parse(JSON.stringify(L.newState({ name: '旧档' }))); delete s.trib; delete s.karma; delete s.dao;
    const a = L.migrate(JSON.parse(JSON.stringify(s))), b = L.migrate(JSON.parse(JSON.stringify(a)));
    const s3 = L.newState({ name: '半途' }); s3.p.r = 2; s3.p.s = 3; s3.p.xp = L.pNeed(s3.p); s3.pills = 3; L.tribStart(s3, { pills: 3 }); const u = s3.trib.cur.u;
    const c = L.migrate(JSON.parse(JSON.stringify(s3)));
    return { v: a.v, trib: !!a.trib && a.trib.daoji === 0 && Array.isArray(a.trib.rec), karma: !!a.karma && Array.isArray(a.karma.list), dao: !!a.dao && a.dao.k === 0,
      same: JSON.stringify([a.trib, a.karma, a.dao]) === JSON.stringify([b.trib, b.karma, b.dao]), cur: !!c.trib.cur && c.trib.cur.u === u };
  });
  expect(migT.v === 6 && migT.trib && migT.karma && migT.dao && migT.same && migT.cur, `迁移补上天劫 / 因果 / 道心（版本仍 ${migT.v}，读两遍一样，半途的预掷还在）`);
  // ---------- 灵宠（SYSTEMS §4）：倍率、岗位、喂食与等级、进化分支与发现、好感、旧档迁移、灵宠事件 ----------
  const pt = await page.evaluate(() => {
    const { L } = window.__xm, o = {};
    const st = L.newState({ name: '灵宠测试' }); st.p.r = 3; st.flags.maxR = 3; st.home = { cave: 4, array: 8, field: 8, furnace: 6 }; st.herbs = 2000; st.mats.yin.fire = 3; st.stones = 1e6; st.tick = 100;
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
  // ---------- 宗门加深（SYSTEMS §11）：任务板四类、宝库轮换、职司、人脉与晋升门槛、徒弟（成长、差事、传授、出师）、三人会武、带 favor 的事件 ----------
  const sx = await page.evaluate(() => {
    const { L } = window.__xm, o = {};
    const mk = (sid, rank, r) => { const st = L.newState({ name: '宗门测试' }); st.p.r = r || 4; st.p.s = 2; st.flags.maxR = st.p.r; st.tick = 240; st.pact = 1; st.stones = 1e7; st.herbs = 900; st.ore = 3000; st.treasure = 6; st.pills = 6; st.home = { cave: 4, array: 8, field: 6, furnace: 6 }; st.stats.exp = 20;
      for (let k = 0; k <= 5; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = 3;
      L.joinSect(st, sid); st.sect.rank = rank; st.sect.total = 1e6; st.sect.pts = 1e6; st.storyQ = []; return st; };
    // 任务板：四类新任务能刷出来、文案、交付与完成
    let st = mk('jian', 2);
    L.gearDrop(st, 'w', 4, { base: 'w4_1' }); st.gear.pend = []; st.gear.w.plus = 2;
    L.petGive(st, { sp: 'p_hu2', src: 'shop' }); st.feed = 500;
    for (const id of ['x_houtu']) { L.giveArt(st, id); st.arts.own[id] = L.artNeed(id, 3) + 1; }
    const seen = new Set(); for (let i = 0; i < 80; i++) { L.rollTasks(st); for (const t of st.sect.tasks) seen.add(t.ty); }
    o.types = ['forge', 'tame', 'explore', 'lecture'].every(t => seen.has(t));
    const T = ty => { const t = { ty, need: 1, prog: 0, taken: 0, done: 0, rw: 50, bonus: { inc: 1 } }; L.TASK_X[ty].init(st, t, 50, st.p.r); st.sect.tasks = [t]; L.taskTake(st, 0); return t; };
    let t = T('forge'); o.forgeText = /炼器：强化一件法宝到 \+3 以上，或上交灵矿/.test(L.taskText(st, t));
    const fav0 = L.favor(st, 'tieye'); const ore0 = st.ore; o.forgeDeliver = L.taskDeliver(st, 0) && t.done === 1 && st.ore === ore0 - t.n && L.favor(st, 'tieye') === fav0 + L.FAV.task;
    t = T('forge'); L.rng = () => 0.01; L.gearPlus(st, 'w'); L.rng = Math.random; o.forgePlus = t.done === 1 && st.gear.w.plus === 3;
    t = T('tame'); const fd0 = st.feed; o.tame = !!t.el && L.taskDeliver(st, 0) && st.feed === fd0 - t.n;
    // 探秘：秘境开了时是“本季秘境闯过 N 层”（每过一层检查），秘境关掉时改去禁地寻宝
    t = T('explore'); o.exploreRealm = !!t.realm && t.n >= 2 && /本季秘境闯过/.test(L.taskText(st, t)) && (L.realmFloorHit(st, t.n - 1), !t.done) && (L.realmFloorHit(st, t.n), t.done === 1);
    L.MJ_ON = false; t = T('explore'); L.MJ_ON = true; o.exploreFallback = !t.realm && L.expOpen(st, t.k, 2, 1) && /禁地寻宝/.test(L.taskText(st, t));
    t = T('lecture'); o.lectureBusy = !!st.retreat && st.retreat.kind === 'busy' && st.retreat.left === 2 && L.gain(st) === 0;
    L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.q = [];
    const tot0 = st.sect.total; for (let i = 0; i < 2; i++) { st.retreat.left--; if (st.retreat.left <= 0) L.endRetreat(st, true); }
    o.lectureDone = t.done === 1 && st.sect.total >= tot0 + 100 && st.disc.list[0].lp === 1 && !st.retreat;
    // 宝库轮换：6 格，每届论道换；按身份开放；贡献是唯一的货币；vault_tip 法宝高一阶
    st = mk('jian', 0);
    const v0 = L.vaultRot(st), cells = L.vaultCells(st);
    o.vault6 = v0.slots.length === 6 && cells.some(c => c.k === 'art') && cells.some(c => c.k === 'plan') && cells.some(c => c.k === 'pill');
    o.vaultLock = cells.some(c => /可换$/.test(c.why || ''));
    const pc = cells.find(c => c.k === 'pill'), pts0 = st.sect.pts, s0 = st.stones;
    o.vaultBuy = !!L.vaultRotBuy(st, pc.i) && st.sect.pts === pts0 - pc.cost && st.stones === s0 && L.vaultCell(st, pc.i).left === pc.left - 1;
    const g0 = cells.find(c => c.k === 'gear').s.tier;
    st.eflags.vault_tip = 1; st.tick = 252; L.sectTick(st, {});
    o.vaultRoll = st.sect.vault.at === 252 && st.sect.vault.slots.find(s => s.k === 'gear').tier === g0 + 1 && !st.eflags.vault_tip;
    // 职司：五堂的效果
    st = mk('dan', 2);
    L.gearDrop(st, 'w', 3, { base: 'w3_0' }); st.gear.pend = [];
    const tryD = (k, fn) => { st.sect.duty = ''; const a = fn(); st.sect.duty = k; const b = fn(); st.sect.duty = ''; return [a, b]; };
    let ab = tryD('dan', () => L.alchRate(st)); o.dutyDan = Math.abs(ab[1] - Math.min(0.97, ab[0] + 0.08)) < 1e-9;
    ab = tryD('dan', () => L.sellMult(st, 'pill')); o.dutyDanSell = ab[1] / ab[0] > 1.19 || ab[1] === ab[0];
    ab = tryD('qi', () => L.gearPlusRate(st, st.gear.w)); o.dutyQi = Math.abs(ab[1] - Math.min(1, ab[0] + 0.08)) < 1e-9;
    ab = tryD('zhan', () => L.expExtraParts(st, 1, 0, 0).filter(x => /战堂/.test(x[0])).reduce((a, x) => a + x[1], 0)); o.dutyZhan = ab[0] === 0 && ab[1] === 5;
    ab = tryD('wai', () => L.buyMult(st, 0)); o.dutyWai = Math.abs(ab[1] / ab[0] - 0.9) < 1e-9;
    ab = tryD('wai', () => L.calVisitMult(st)); o.dutyWaiVisit = Math.abs(ab[1] / ab[0] - 1.15) < 1e-9;
    o.dutyChange = L.setDuty(st, 'qi') && !!L.dutyWhy(st) && !L.setDuty(st, 'zhan') && (st.sect.meets++, L.setDuty(st, 'zhan')) && L.duty(st) === 'zhan';
    const pe = L.pickEvent; L.pickEvent = () => L.eventById('re_bandit'); st.visitor = null; st.sect.duty = 'fa'; L.rng = () => 0.1;
    o.dutyFa = L.spawnVisitor(st) === null && !st.visitor; st.sect.duty = ''; o.dutyFa = o.dutyFa && !!L.spawnVisitor(st); L.pickEvent = pe; L.rng = Math.random; st.visitor = null;
    // 人脉：支持度的加减、40 / 80 的恩惠、送礼、晋升门槛
    st = mk('jian', 2, 3);
    o.favStart = L.eldersOf(st).every(x => L.favor(st, x.id) === L.FAV.start);
    const g = L.giftInfo(st, 'tieye'), fl0 = L.favor(st, 'lingxu');
    o.gift = !g.why && !!L.giftElder(st, 'tieye') && L.favor(st, 'tieye') === L.FAV.start + L.FAV.gift && L.favor(st, 'lingxu') === fl0 - L.FAV.rival && !!L.giftInfo(st, 'tieye').why;
    L.addFavor(st, 'tieye', 40); o.giftCap = /礼只送得到/.test((st.tick += 12, L.giftInfo(st, 'tieye').why));
    L.gearDrop(st, 'w', 3, { base: 'w3_0' }); st.gear.pend = [];
    const c0 = L.gearPlusCost(st, st.gear.w).ore; L.addFavor(st, 'tieye', -20); const c1 = L.gearPlusCost(st, st.gear.w).ore; L.addFavor(st, 'tieye', 20);
    o.fav40 = Math.abs(c0 / c1 - 0.8) < 0.05;
    const ore1 = st.ore; L.addFavor(st, 'lingxu', 60); st.tick = 264; L.sectTick(st, {}); o.fav40Gift = st.ore === ore1 + 20 * L.oreUnit(st);
    L.addFavor(st, 'tieye', 100); o.fav80 = L.artOwned(st, 'm_zhujian') && !!st.sect.f80.tieye;
    o.clamp = L.favor(st, 'tieye') === 100 && L.addFavor(st, 'tieye', 10) === 0;
    // 晋升：圣子要两位 ≥ 50；谁也不站（heir_none）改成累计贡献多两成
    st = mk('jian', 2, 3); st.sect.total = L.SRANKS[3].c; st.storyQ = [];
    const need = () => L.promoteNeeds(st).find(x => x.k === 'elders' || x.k === 'heirNone');
    o.gate0 = !!need() && !need().ok && !L.canPromote(st);
    L.sectTick(st, {}); o.heirEve = st.storyQ.includes('sect_succession') && st.sect.heirEv === 1;
    L.addFavor(st, 'lingxu', 40); L.addFavor(st, 'liu', 40); o.gate2 = need().ok && L.canPromote(st);
    L.addFavor(st, 'liu', -10); st.eflags.heir_none = 1; o.heirNone = need().k === 'heirNone' && !need().ok && (st.sect.total = Math.ceil(L.SRANKS[3].c * 1.2), need().ok);
    st.sect.rank = 5; st.p.r = 7; st.sect.total = L.SRANKS[6].c; delete st.eflags.heir_none; L.addFavor(st, 'liu', -40);
    o.lord1 = !need().ok; st.eflags.lord_gift = 1; o.lordGift = need().ok;
    // 徒弟：成长公式、闭门苦修、上限、差事、传授、出师
    st = mk('dao', 4, 4); st.p.s = 3; L.giveArt(st, 'x_houtu'); st.arts.own.x_houtu = L.artNeed('x_houtu', 3) + 1;
    const d = L.discTake(st, null, { cat: 'quiet', t: 3, tp: 'ren' }); st.storyQ = []; st.disc.q = [];
    o.discRate = Math.abs(L.discGrowRate(st, d) - 0.02 * 1.25 * L.daoDiscMult(st)) < 1e-12;
    L.discSetJob(st, d.u, 'cult'); o.discCult = Math.abs(L.discGrowRate(st, d) - 0.02 * 1.25 * 2 * L.daoDiscMult(st)) < 1e-12;
    st.dao = { k: 0, w: 0, r: 12 }; o.discRen = Math.abs(L.discGrowRate(st, d) - 0.02 * 1.25 * 2 * 1.2) < 1e-12;
    d.di = L.discMax(st) - 0.001; L.discTick(st, {}); o.discCap = d.di === L.discMax(st) && L.discMax(st) === L.si(st.p) - 4;
    L.discSetJob(st, d.u, 'duty'); d.di = 5; const t0c = st.sect.total; for (let i = 0; i < 10; i++) L.discTick(st, {}); o.discDuty = st.sect.total - t0c >= Math.floor(10 * L.contribFor(L.homeRegion(st)) * 0.3 * 1.3) - 1;
    L.discSetJob(st, d.u, 'home'); o.discHome = Math.abs(L.modProd(L.modParts('incMul', st).filter(x => x[2] === 'disc')) - 1.08) < 1e-9;
    L.discSetJob(st, d.u, 'exp'); const sto = st.stones; for (let i = 0; i < 6; i++) L.discTick(st, {}); o.discExp = st.stones - sto === L.discJobVal(st, d, 'exp').stones;
    const pw0 = L.discPow(st, d); st.retreat = null; st.exp = null;
    o.teachStart = L.discTeach(st, d.u, 'x_houtu') && st.retreat.kind === 'busy' && st.retreat.left === L.TEACH_LEN;
    st.retreat.left = 1; st.retreat.left--; L.endRetreat(st, true);
    o.teachDone = d.taught.includes('x_houtu') && Math.abs(L.discPow(st, d) / pw0 - 1.2) < 1e-9 && L.artLv(st, 'x_houtu') === 4;
    d.di = 8; const tot1 = st.sect.total, tl0 = st.meta.taoli.n, gc = L.discGradContrib(st, d);
    const gr = L.discGraduate(st, d.u, 'grad_word'); o.grad = !!gr && st.sect.total === tot1 + gc && st.disc.taoli === 1 && st.meta.taoli.n === tl0 + 1 && !st.disc.list.length && L.discGraduated(st) === 1;
    // 候选：每 24 周天三个（壮实 / 机灵 / 安静），三选一
    st.disc.candAt = -999; st.storyQ = []; L.discTick(st, {}); o.cands = st.disc.cand.length === 3 && st.disc.cand.map(c => c.cat).join() === 'strong,clever,quiet' && st.storyQ.includes('sect_candidates');
    const ev = L.eventById('sect_candidates'); st.storyQ = []; L.resolveChoice(st, ev, 1); o.candEvent = st.disc.list.length === 1 && st.disc.list[0].cat === 'clever' && st.storyQ.includes('disc_first_day');
    // 性情事件按徒弟各走一遍：莽 → disc:trouble，fx.disc 落在那名徒弟身上
    st.storyQ = []; st.disc.q = []; const m1 = L.discTake(st, null, { cat: 'strong', tp: 'mang' }); st.storyQ = []; st.disc.q = [];
    L.discFire(st, 'disc:trouble', m1); const evT = L.eventById('disc_trouble'), g1 = m1.grow;
    L.resolveChoice(st, evT, 1); o.discEvent = m1.grow === g1 + 0.05 && st.disc.list[0].grow === 0;
    // 三人会武：宗主 + 两名徒弟，三局两胜
    st = mk('dao', 6, 7); st.p.s = 2; L.discTake(st, null, { cat: 'strong' }); L.discTake(st, null, { cat: 'quiet' }); st.disc.list.forEach(x => { x.di = 13; }); st.storyQ = [];
    const mt = L.sectMeet(st);
    o.trio = !!mt.trio && mt.rounds.length >= 1 && mt.rounds.every(r => r.trio.length === 3 && r.win === (r.trio.filter(x => x.win).length >= 2));
    // 血煞魔宗：没有门路进不去；夜璃好感 40 以后能进，越级 ×3，因果换贡献
    st = L.newState({ name: '魔' }); st.p.r = 2; st.pact = 1;
    o.moGate = !L.joinSect(st, 'xuesha') && L.sectsFor(st).length === 3;
    st.npc.ye = { aff: 45 }; const lp0 = L.leapMult(st); o.moJoin = L.sectsFor(st).length === 4 && L.joinSect(st, 'xuesha') && Math.abs(L.leapMult(st) / lp0 - 1.5) < 1e-9;
    L.addKarma(st, 'frame', null, null); const kt = st.sect.total; o.moKarma = !!L.karmaTrade(st) && st.sect.total > kt && !L.karmaOpen(st).length;
    // 存档：没有人脉 / 职司 / 宝库 / 徒弟字段的档补默认值，读两遍一样
    const s1 = L.newState({ name: '旧档' }); s1.p.r = 3; L.joinSect(s1, 'dan'); delete s1.sect.fav; delete s1.sect.vault; delete s1.sect.duty; delete s1.disc;
    const a = L.migrate(JSON.parse(JSON.stringify(s1))), b = L.migrate(JSON.parse(JSON.stringify(a)));
    o.migrate = a.v === L.SAVE_V && a.sect.fav.yun === L.FAV.start && Array.isArray(a.disc.list) && JSON.stringify([a.sect.fav, a.disc]) === JSON.stringify([b.sect.fav, b.disc]);
    return o;
  });
  for (const k in sx) expect(sx[k], '宗门：' + k);
  // 界面：带 favor 的长老事件（剑冢取剑）——立绘、支持度、结果页写“人脉 凌虚子 +N”
  await page.evaluate(() => {
    const { st, L } = window.__xm; st.sect = null; st.p.r = 3; st.stones = 1e7; L.joinSect(st, 'jian'); st.sect.rank = 2; st.storyQ = []; st.disc = null; st.retreat = null; st.exp = null;
    for (const h of window.__xm.hints) st.hintSeen[h.id] = 1;
    L.addFavor(st, 'lingxu', 15); delete st.evLast.jian_lingxu_1; delete st.evDone.jian_lingxu_1;
    for (const h of ['duty1', 'renmai1', 'disc1']) st.hintSeen[h] = 1;
    window.__favEv = L.eligible(st, L.eventById('jian_lingxu_1'), 'home', {}); L.rng = () => 0.01; window.__xm.showChoice(L.eventById('jian_lingxu_1'));
  });
  await page.waitForTimeout(300); await shot('c40-elder-event');
  const fe0 = await page.evaluate(() => ({ el: window.__favEv, who: (document.querySelector('#modal .speaker .seal') || {}).textContent || '', img: !!document.querySelector('#modal .speaker img') }));
  await page.click('#modal button[data-c="1"]'); await page.waitForTimeout(500);
  const fe1 = await page.evaluate(() => ({ body: document.querySelector('#modal .body').textContent, v: window.__xm.L.favor(window.__xm.st, 'lingxu') }));
  await page.evaluate(() => { window.__xm.L.rng = Math.random; });
  expect(fe0.el && fe0.who.includes('凌虚子') && fe0.who.includes('支持 25') && fe0.img && fe1.body.includes('人脉 凌虚子 +5') && fe1.v === 30, `长老事件：资格 ${fe0.el}，${fe0.who}，结果 ${fe1.v}`);
  await shot('c41-elder-event-res');
  await close();
  // 老祖讲职司、人脉、第一个徒弟（各一次阻塞讲解：时间暂停，数字与逻辑一致）
  const sHint = async (id, setup) => {
    await page.evaluate(([id, setup]) => { const { st } = window.__xm; for (const h of window.__xm.hints) st.hintSeen[h.id] = 1; st.exp = null; st.retreat = null; st.visitor = null; st.hintSeen[id] = 0; st.tick += 300; st.storyQ = []; new Function('st', 'L', setup)(st, window.__xm.L); if (!document.getElementById('modal').hidden) window.__xm.closeModal(); document.querySelector('#tip').hidden = true; }, [id, setup]);
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => ({ g: document.getElementById('guide').hidden ? '' : document.querySelector('#guide .gtext').textContent, hold: window.__xm.guideHold }));
    await shot('c44-hint-' + id);
    const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (o) { await o.click(); await page.waitForTimeout(200); }
    return r;
  };
  const rm = await sHint('renmai1', 'st.sect.rank = 1;');
  const rmv = await page.evaluate(() => window.__xm.L.favor(window.__xm.st, 'lingxu'));
  expect(rm.g.includes('三位长老') && rm.g.includes('凌虚子 ' + rmv) && rm.g.includes('两位 ≥ 50') && rm.hold, `人脉讲解：${rm.g.slice(0, 40)}（暂停 ${rm.hold}）`);
  const duH = await sHint('duty1', "st.sect.rank = 2; st.sect.duty = ''; L.setDuty(st, 'zhan', true);");
  expect(duH.g.includes('职司·战堂') && duH.g.includes('斩妖历练分数 +5') && duH.hold, `职司讲解：${duH.g.slice(0, 40)}（暂停 ${duH.hold}）`);
  const dc = await sHint('disc1', "st.disc = null; L.rollCands(st); st.disc.cand[0].t = 5;");
  const dcN = await page.evaluate(() => { const c = window.__xm.st.disc.cand[0]; return { n: c.n, g: (0.02 * 1.8).toFixed(3) }; });
  expect(dc.g.includes(dcN.n) && dc.g.includes('门下') && dc.g.includes(dcN.g) && dc.hold, `第一个徒弟讲解：${dc.g.slice(0, 40)}（暂停 ${dc.hold}）`);
  await page.click('[data-nav="sect"]'); await page.waitForTimeout(300);
  await page.click('#modal [data-stab="id"]'); await page.waitForTimeout(300); await shot('c42-sect-id');
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#modal [data-stab]')].map(b => b.textContent.replace(/！/, '').trim()).join());
  expect(tabs === '身份,任务板,宝库,门下', '宗门四个分页：' + tabs);
  const gv = await page.evaluate(() => window.__xm.L.favor(window.__xm.st, 'liu'));
  await page.click('#modal [data-gift="liu"]'); await page.waitForTimeout(300);
  expect(await page.evaluate(gv => window.__xm.L.favor(window.__xm.st, 'liu') === gv + window.__xm.L.FAV.gift, gv), '身份页【送礼】：柳含烟支持 +6');
  await page.click('#modal [data-stab="vault"]'); await page.waitForTimeout(300); await shot('c43-sect-vault');
  expect(await page.evaluate(() => document.querySelectorAll('#modal [data-vr]').length === 6), '宝库六格');
  await close();
  // ---------- 秘境（SYSTEMS §8）：掉血公式、离开与出局、秘藏、秘境事件、run_* 标记、送令、存档续玩 ----------
  const mj = await page.evaluate(() => {
    const { L } = window.__xm, o = {};
    const mk = () => { const r0 = L.rng; L.rng = Math.random; const s = L.newState({ name: '秘境' }); L.rng = r0; s.p.r = 3; s.p.s = 1; s.flags.maxR = 3; s.flags.maxI = 13; s.pact = 1; s.tick = 4 * 12 + 4; for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) s.best[k + '_' + d] = 3; s.mj = L.newMj(); s.mj.token = 1; s.guide = { step: 99, done: true }; s.bonus.atk = 20; return s; };
    let s = mk();
    // 解锁：筑基中期且约战打完；夏季；有令
    o.why = L.mjWhy(s); const s0 = mk(); s0.pact = 0; o.whyPact = L.mjWhy(s0); const s1 = mk(); s1.tick = 4 * 12 + 10; o.whyWin = L.mjWhy(s1); const s2 = mk(); s2.mj.token = 0; o.whyTok = L.mjWhy(s2);
    // 掉血：层战力 = rec(家门口, 0) × 1.22^(层−1)；clamp(30 × (层 / 我)^1.2, 5, 70)；精英 ×1.8，守关再 ×1.3；我 = 战力 × 五行
    L.giveArt(s, 'z_liehuo'); L.equipArt(s, 'z_liehuo');   // 火克金
    const fake = { k: L.homeRegion(s), theme: 'jianqi' }, me = L.power(s) * 1.15;
    o.me = [L.mjMe(s, 'jianqi'), me]; o.meMu = L.mjMe(s, 'baicao') / L.power(s);   // 火 vs 木：不克
    const exp = (f, m) => Math.max(1, Math.round(Math.min(70, Math.max(5, 30 * Math.pow(L.rec(fake.k, 0) * Math.pow(1.22, f - 1) / me, 1.2))) * m));
    o.dmg = [1, 3, 5, 6].map(f => [L.mjDmg(s, 'fight', f, fake, 'jianqi'), exp(f, 1), L.mjDmg(s, 'elite', f, fake, 'jianqi'), exp(f, 1.8), L.mjDmg(s, 'boss', f, fake, 'jianqi'), exp(f, 2.34)]);
    L.giveArt(s, 'z_hanyue'); L.equipArt(s, 'z_hanyue');   // 撼岳拳（土，木克土 ×0.87… 主题百草）：战斗掉血 −20%
    o.hanyue = [L.mjDmg(s, 'fight', 3, fake, 'jianqi'), Math.max(1, Math.round(Math.min(70, Math.max(5, 30 * Math.pow(L.rec(fake.k, 0) * Math.pow(1.22, 2) / L.power(s), 1.2))) * 0.8))];
    L.equipArt(s, 'z_liehuo');
    // 气血：100 + 法衣每阶 5（四阶起再 +10）
    L.gearDrop(s, 'r', 4, { base: 'r4_0' }); o.hp = [L.mjMaxHp(s), 100 + 20 + 10];
    // 进：耗令，6 层（元婴前），2 扇门
    s.tick = 4 * 12 + 4; const run = L.mjEnter(s); o.enter = { tok: s.mj.token, floors: run.floors, doors: run.doors.length, th: run.theme, busy: L.busy(s), ready: L.isReady(s) };
    o.leave1 = L.mjCanLeave(s);   // 第一层还没过，不能走
    // 战斗房：掉血 = 公式，收获进本局（还没到手）
    L.rng = () => 0.99;
    run.doors = [{ t: 'fight', unk: false }, { t: 'spring', unk: false }];
    const hp0 = run.hp, st0 = s.stones, r1 = L.mjPick(s, 0);
    o.fight = { dmg: r1.dmg, want: L.mjDmg(s, 'fight', 1, run), hp: hp0 - run.hp, floor: run.floor, pend: L.mjPending(s).stones, stones: s.stones - st0, loot: run.loot.length };
    // 宝（掷 0.99 不是陷阱）与泉
    run.doors = [{ t: 'chest', unk: false }]; L.mjPick(s, 0); o.chestN = run.loot.length;
    run.hp = 40; run.doors = [{ t: 'spring', unk: false }]; const r3 = L.mjPick(s, 0); o.spring = [r3.heal, run.hp];
    // 奇：秘境事件按主题出（剑气或任意）；fx.hp 动本局气血；摆渡人的 run_skip 直达终层前一层
    run.doors = [{ t: 'event', unk: false }]; const r4 = L.mjPick(s, 0); const ev = L.eventById(r4.ev);
    o.ev = { id: r4.ev, ph: run.phase, theme: ev && (!ev.theme || ev.theme === 'jianqi'), live: L.events().filter(e => e.where === 'realm').filter(L.evLive).length };
    if (ev) { const i = ev.choices.findIndex(c => L.choiceShown(s, c) && L.costOk(s, c.cost)); L.resolveChoice(s, ev, i); }
    const r5 = L.mjAfterEvent(s); o.afterEv = { ph: run.phase, next: r5 && r5.next };
    const altar = L.eventById('realm_altar'); run.hp = 50; L.resolveChoice(s, altar, 1); o.altarHp = run.hp;
    run.floor = 2; run.phase = 'event'; run.ev = 'realm_ferryman'; L.resolveChoice(s, L.eventById('realm_ferryman'), 0); const fl0 = run.floor; L.mjAfterEvent(s); o.skip = [fl0, run.floor, run.floors - 1, !s.eflags.run_skip];
    // 别的系统的键只对秘境事件放行（恩怨 grudge：秘境的 realm_rival 上线，宿敌那边的 zhao_2 还闸着）
    o.gate = { zhao: L.evGate(L.eventById('zhao_2')).includes('fx.grudge'), rival: L.evLive(L.eventById('realm_rival')) };
    // 离开：收获全部到手
    o.leave2 = L.mjCanLeave(s); const pend = L.mjPending(s).stones, sb = s.stones, n = run.loot.length; const sum = L.mjLeave(s);
    o.leave = { how: sum.how, got: s.stones - sb, pend, n: sum.n, n0: n, run: s.run, deep: L.mjThRec(s, 'jianqi').deep, ticks: sum.ticks };
    // 出局：收获丢六成（灵石按数量留四成），负伤 4 周天
    s.mj.token = 1; s.p.inj = 0; const run2 = L.mjEnter(s); run2.doors = [{ t: 'fight', unk: false }]; L.mjPick(s, 0);
    run2.loot.push({ stones: 1000, t: '灵石 1000' }); const pend2 = L.mjPending(s).stones, sb2 = s.stones;
    run2.hp = 1; run2.doors = [{ t: 'fight', unk: false }]; const rw = L.mjPick(s, 0);
    o.wipe = { how: rw.wipe && rw.wipe.how, got: s.stones - sb2, want: Math.floor(pend2 * 0.4), inj: s.p.inj, run: s.run };
    // 守关 → 秘藏（幽泉：天眼通、魔角冠、冰羽鹤蛋）；合计通关 2 次后第三次通关出《混元道经》
    const s3 = mk(); s3.tick = 7 * 12 + 4; L.mjRec(s3).clears = 2; const run3 = L.mjEnter(s3); o.th3 = run3.theme;
    run3.floor = run3.floors; run3.max = run3.hp = 9999; run3.doors = [{ t: 'boss', unk: false }]; const rb = L.mjPick(s3, 0);
    o.chest = { ph: run3.phase, ks: run3.chest.map(c => c.k + ':' + (c.id || '')), rec: L.mjChestRec(s3).i };
    const iH = run3.chest.findIndex(c => c.id === 'x_hunyuan'); const sumC = L.mjChest(s3, iH);
    o.clear = { how: sumC.how, own: L.artOwned(s3, 'x_hunyuan'), title: sumC.first, titles: s3.titles.includes(sumC.first), clears: L.mjThRec(s3, 'youquan').clears, total: L.mjRec(s3).clears, loot: rb.loot.length >= 2 };
    const s4 = mk(); s4.tick = 7 * 12 + 4; const r4b = L.mjEnter(s4); r4b.floor = r4b.floors; r4b.max = r4b.hp = 9999; r4b.doors = [{ t: 'boss', unk: false }]; L.mjPick(s4, 0);
    o.pool4 = r4b.chest.map(c => c.id || c.k).sort().join(',');
    const ip = r4b.chest.findIndex(c => c.k === 'pet'); L.mjChest(s4, ip); o.pet = { sp: (s4.pets || []).map(p => p.sp).join(), n: L.petCount(s4) };
    // 秘境令：夏季头一个周天送一枚，最多 3；坊市轮换货架有秘境令
    L.rng = Math.random;
    const s5 = mk(); s5.mj.token = 2; s5.tick = 5 * 12 + 3; L.tick(s5); const t1 = s5.mj.token; L.tick(s5); o.gift = [t1, s5.mj.token, L.mjAddToken(s5, 5), s5.mj.token];
    s5.mj.token = 0; s5.market.cyc = -9; let found = false; for (let i = 0; i < 40 && !found; i++) { L.restock(s5, true); found = s5.market.rot.some(x => x.k === 'token'); } o.shelfTok = found;
    // 迁移：v6 档没有 st.run / st.mj → 补默认；坏的局清掉；再迁一遍不变
    const old = JSON.parse(JSON.stringify(mk())); delete old.run; delete old.mj; delete old.meta.mj;
    const m1 = L.migrate(old); const a = JSON.stringify([m1.run, m1.mj, m1.meta.mj]); const m2 = L.migrate(JSON.parse(JSON.stringify(m1)));
    o.mig = { v: m1.v, run: m1.run, tok: m1.mj.token, same: a === JSON.stringify([m2.run, m2.mj, m2.meta.mj]) };
    const bad = JSON.parse(JSON.stringify(mk())); bad.run = { theme: 'nope', doors: 3 }; o.migBad = L.migrate(bad).run;
    L.rng = Math.random;
    return o;
  });
  expect(mj.why === '' && /三年之约/.test(mj.whyPact) && /入夏/.test(mj.whyWin) && /秘境令/.test(mj.whyTok), `秘境入口：${JSON.stringify([mj.why, mj.whyPact, mj.whyWin, mj.whyTok])}`);
  expect(Math.abs(mj.me[0] - mj.me[1]) < 1e-6 && mj.meMu === 1, `五行：火克金 ×1.15（${mj.me[0] / mj.me[1]}），火对木 ×${mj.meMu}`);
  expect(mj.dmg.every(r => r[0] === r[1] && r[2] === r[3] && r[4] === r[5]) && mj.dmg[0][0] < 70 && mj.dmg[0][0] < mj.dmg[3][0], `掉血公式 clamp(30×(层/我)^1.2,5,70)×房间：${JSON.stringify(mj.dmg)}`);
  expect(mj.hanyue[0] === mj.hanyue[1], `撼岳拳：战斗掉血 −20%（${mj.hanyue}）`);
  expect(mj.hp[0] === mj.hp[1], `气血上限：100 + 法衣四阶 20 + 10 = ${mj.hp[0]}（应为 ${mj.hp[1]}）`);
  expect(mj.enter.tok === 0 && mj.enter.floors === 6 && mj.enter.doors === 2 && mj.enter.th === 'jianqi' && mj.enter.busy && !mj.enter.ready, `进秘境：${JSON.stringify(mj.enter)}`);
  expect(!mj.leave1 && mj.leave2, '第一层没过不能走，过了可以走');
  expect(mj.fight.dmg === mj.fight.want && mj.fight.hp === mj.fight.dmg && mj.fight.floor === 2 && mj.fight.pend > 0 && mj.fight.stones === 0 && mj.fight.loot >= 1, `战斗房：${JSON.stringify(mj.fight)}`);
  expect(mj.chestN >= 2 && mj.spring[0] === 30 && mj.spring[1] === 70, `宝与泉：收获 ${mj.chestN} 件，泉 +${mj.spring[0]} → ${mj.spring[1]}`);
  expect(/^realm_/.test(mj.ev.id || '') && mj.ev.ph === 'event' && mj.ev.theme && mj.ev.live === 16, `秘境事件按主题出且 16 个都上线：${JSON.stringify(mj.ev)}`);
  expect(mj.afterEv.ph === 'door', `奇遇处理完回到门前：${JSON.stringify(mj.afterEv)}`);
  expect(mj.altarHp === 60, `fx.hp：续一炷香气血 50 → ${mj.altarHp}`);
  expect(mj.skip[1] === mj.skip[2] && mj.skip[3], `run_skip：第 ${mj.skip[0]} 层 → 第 ${mj.skip[1]} 层（终层前一层 ${mj.skip[2]}），标记不留在 eflags`);
  expect(mj.gate.zhao && mj.gate.rival, `恩怨只对秘境事件放行：zhao_2 仍闸 ${mj.gate.zhao}、realm_rival 上线 ${mj.gate.rival}`);
  expect(mj.leave.how === 'leave' && mj.leave.got === mj.leave.pend && mj.leave.n === mj.leave.n0 && !mj.leave.run && mj.leave.deep >= 3 && mj.leave.ticks === 3, `带着收获离开：${JSON.stringify(mj.leave)}`);
  expect(mj.wipe.how === 'wipe' && mj.wipe.got === mj.wipe.want && mj.wipe.inj >= 4 && !mj.wipe.run, `重伤出局：灵石留四成 ${mj.wipe.got}/${mj.wipe.want}，负伤 ${mj.wipe.inj}`);
  expect(mj.th3 === 'youquan' && mj.chest.ph === 'chest' && mj.chest.ks.includes('art:x_hunyuan') && mj.chest.ks.length === 3, `秘藏三选一（第三次通关出混元道经）：${JSON.stringify(mj.chest)}`);
  expect(mj.clear.how === 'clear' && mj.clear.own && mj.clear.title === '幽泉渡者' && mj.clear.titles && mj.clear.clears === 1 && mj.clear.total === 3 && mj.clear.loot, `通关：${JSON.stringify(mj.clear)}`);
  expect(mj.pool4 === 'g_mojiao,m_tianyan,p_he', `幽泉秘藏池：${mj.pool4}`);
  expect(mj.pet.sp.includes('p_he') && mj.pet.n >= 1, `秘藏的灵宠蛋进名册：${JSON.stringify(mj.pet)}`);
  expect(mj.gift[0] === 3 && mj.gift[1] === 3 && mj.gift[2] === 0, `夏季送令、最多 3：${mj.gift}`);
  expect(mj.shelfTok, '坊市轮换货架会上秘境令');
  expect(mj.mig.v === 6 && mj.mig.run === null && mj.mig.tok === 0 && mj.mig.same && mj.migBad === null, `秘境存档迁移（幂等）：${JSON.stringify(mj.mig)}，坏局 ${mj.migBad}`);
  // 界面：进秘境 → 过一层 → 奇遇弹出时存档 → 读档续玩（奇遇重新弹出，层数不变）→ 处理完回到门前
  await close();
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.r = 3; st.p.s = 1; st.p.xp = 0; st.pact = 1; st.flags.maxR = 3; st.flags.maxI = 13; st.guide = { step: 99, done: true }; for (let k = 0; k <= 3; k++) st.best[k + "_0"] = 3; st.exp = null; st.retreat = null; st.p.inj = 0; st.tick = 15 * 12 + 4; st.mj = L.newMj(); st.mj.token = 1; st.mj.giftYr = 15; for (const h of ["realmOpen", "realm1", "realm2", "realm3"]) st.hintSeen[h] = 1; st.storyQ = []; window.__mjWhy = L.mjWhy(st); window.__xm_realm.realmEnterUI(false); });
  { const w = await page.evaluate(() => window.__mjWhy); if (w) errors.push("界面进秘境失败：" + w); }
  await page.waitForTimeout(500);
  await page.evaluate(() => { const { st } = window.__xm; if (!st.run) throw new Error('no run: ' + window.__mjWhy + ' ' + JSON.stringify([st.p.r, st.pact, st.tick, st.mj, !!st.exp, !!st.retreat, st.flags.maxI])); st.run.doors = [{ t: 'spring', unk: false }, { t: 'spring', unk: false }]; window.__xm_realm.syncRealmUI(true); });
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(1200);
  await page.evaluate(() => { const { st } = window.__xm; st.run.doors = [{ t: 'event', unk: false }]; window.__xm_realm.syncRealmUI(true); });
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(1300);
  const mjBefore = await page.evaluate(() => ({ ev: window.__xm.st.run.ev, fl: window.__xm.st.run.floor, modal: !document.getElementById('modal').hidden }));
  await page.evaluate(() => { const { st } = window.__xm; const snap = JSON.parse(JSON.stringify(st)); window.__xm.closeModal(); window.__xm.loadState(snap); });
  await page.waitForTimeout(900); await shot('c20-realm-resume');
  const mjAfter = await page.evaluate(() => ({ ev: window.__xm.st.run && window.__xm.st.run.ev, fl: window.__xm.st.run && window.__xm.st.run.floor, title: (document.querySelector('#modal h2') || {}).textContent || '', doors: !!document.querySelector('#mjUI') }));
  expect(mjBefore.modal && mjAfter.ev === mjBefore.ev && mjAfter.fl === mjBefore.fl && mjAfter.doors && mjAfter.title.length > 0, `存档续玩：${JSON.stringify([mjBefore, mjAfter])}`);
  const t0 = await page.evaluate(() => window.__xm.st.tick);
  await page.click('#modal .choices button[data-c]:not([disabled])'); await page.waitForTimeout(1500);
  { const b = await page.$('#modal .foot .btn:not([disabled])'); if (b) await b.click(); } await page.waitForTimeout(600);
  const back = await page.evaluate(() => ({ ph: window.__xm.st.run && window.__xm.st.run.phase, leave: !!document.querySelector('#realmLeave'), t: window.__xm.st.tick }));
  expect(back.ph === 'door' && back.leave && back.t === t0, `续玩后奇遇处理完回到门前、时间没走：${JSON.stringify(back)}`);
  await shot('c20b-realm-back'); await page.click('#realmLeave', { timeout: 5000 }); await page.waitForTimeout(600); await shot('c21-realm-leave');
  const lv = await page.evaluate(() => ({ run: window.__xm.st.run, t: window.__xm.st.tick, title: (document.querySelector('#modal h2') || {}).textContent }));
  expect(!lv.run && lv.t === t0 + 3 && lv.title === '全身而退', `离开：出来 3 个周天（${JSON.stringify(lv)}）`);
  await close();
  // ---------- 灵田作物与炼丹（SYSTEMS §5、§6.2）----------
  const cr = await page.evaluate(() => {
    const { L } = window.__xm, o = {};
    // 固定随机数只包住要定成丹品质的那几下（新建存档时取名要真的随机，常数会死循环）
    const withR = (v, fn) => { const r0 = L.rng; L.rng = () => v; try { return fn(); } finally { L.rng = r0; } };
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
    const tr = withR(0.5, () => L.trial(st, 'ice', 'fire'));
    o.trial = tr && tr.ok && tr.fresh && tr.k === 'juling' && st.meta.recipe.juling === 1 && st.mats.yin.fire === 2 && st.mats.yin.ice === 2 && st.buffs.some(b => b.src === 'juling');
    o.known = L.recipeKnown(st, 'juling') && L.canCraft(st, 'juling') !== '还没试出这一格';
    o.noStack = /药力还在/.test(L.canCraft(st, 'juling'));
    const st2 = L.newState({ meta: st.meta, rebirth: 1 }); o.cross = L.recipeKnown(st2, 'juling') && !L.recipeKnown(st2, 'baoqi');
    const n0 = L.recipeCount(st); L.applyFx(st, { recipe: 'need' }); o.need = L.recipeCount(st) === n0 + 1;
    L.applyFx(st, { recipe: 'qingdu' }); o.named = L.recipeKnown(st, 'qingdu');
    o.secret = /秘方/.test(L.canCraft(st, 'jiuzhuan')) && (L.applyFx(st, { recipe: 'jiuzhuan' }), L.recipeKnown(st, 'jiuzhuan'));
    // 丹毒：中品 +15、上品 +10、极品 +5；过 60 药力减半；会过 100 就不能服；每周天退 2；突破时每枚破境丹 +10；清毒丹 −40
    st.buffs = []; st.toxin = 0; const x0 = st.p.xp + 0; const g = L.gainCalm(st);
    withR(0.5, () => L.craft(st, 'peiyuan')); o.tox15 = st.toxin === 15 && Math.abs(st.p.xp - x0 - 4 * g) < 1e-6;
    withR(0.3, () => L.craft(st, 'peiyuan')); o.tox10 = st.toxin === 25;
    st.toxin = 61; const x1 = st.p.xp; withR(0.5, () => L.craft(st, 'peiyuan')); o.half = st.toxin === 76 && Math.abs(st.p.xp - x1 - 2 * g) < 1e-6;
    st.toxin = 86; o.block = /再服就要中毒/.test(L.canCraft(st, 'peiyuan'));
    st.toxin = 30; L.alchTick(st, {}); o.decay = st.toxin === 28;
    st.toxin = 50; withR(0.5, () => L.craft(st, 'qingdu')); o.qingdu = st.toxin === 10;
    st.toxin = 0; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 3; const bt = L.breakthrough(st, 2); o.btTox = !!bt && st.toxin === 20;
    // 自动续炼：每 3 周天；修炼类在丹毒会过 60 时跳过
    const s3 = mk(); s3.herbs = 2000; L.setAuto(s3, 'peiyuan', true); s3.tick = 3; const ob = {}; withR(0.5, () => L.alchTick(s3, ob));
    s3.toxin = 50; s3.tick = 6; const ob2 = {}; L.alchTick(s3, ob2);
    o.auto = ob.brew && ob.brew.length === 1 && ob.brew[0].k === 'peiyuan' && !ob2.brew && /六十/.test(L.autoWhy(s3, 'peiyuan')) && L.setAuto(s3, 'pojing', true) && L.setAuto(s3, 'liaoshang', true) && !L.setAuto(s3, 'juling', true);
    // 战斗类丹：爆气丹 下一场对决战力 ×1.3（约战胜算涨），约战打完就用掉；雷火丹 下一趟历练分数 +10，出发就用掉
    const s4 = L.newState({ name: '对决' }); s4.tick = 30; s4.p.s = 3; s4.gear.w = { u: 1, id: 'w1_0', slot: 'w', t: 1, plus: 0, aff: [], fail: 0 }; s4.home.furnace = 3; s4.dan.bag.baoqi = [1]; s4.dan.bag.leihuo = [1];
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
    const s6 = mk(); L.plant(s6, 0, 'fire'); s6.storyQ = []; withR(0.01, () => { for (let i = 0; i < 6; i++) { s6.tick++; L.cropTick(s6, {}); } });
    o.mutant = s6.storyQ.includes('home_field_mutant') && s6.crops.mut === 'fire';
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
    s.gear.w = { u: 1, id: 'w1_0', slot: 'w', t: 1, plus: 0, aff: [], fail: 0 }; s.p.s = 3;   // 兵器已到上限（锦囊里不再有“换一件”）；炼气圆满，胜算不贴着下限
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
  {
  // ---------- 洞府（SYSTEMS §6.1 / §6.3）：地块、拆建、迁移、十一种建筑的效果、阵法（逻辑层）；洞府面板、阵法面板、场景里点建筑、老祖讲解、拆建教学 ----------
  const hl = await page.evaluate(() => {
    const L = window.__xm.L, o = {};
    try {
        const withR = (v, fn) => { const r0 = L.rng; L.rng = () => v; try { return fn(); } finally { L.rng = r0; } };
        const mk = () => { const s = L.newState({ name: '洞府测试' }); s.stats.exp = 5; s.stones = 1e12; s.p.r = 5; s.p.s = 1; s.flags.maxR = 5; s.flags.maxI = 22; s.tick = 300; s.rebirth = 1; s.pact = 1; return s; };
        const has = (s, k) => L.homePlots(s).includes(k);
        // ---- 1 地块、拆建
        let s = mk();
        o.plots0 = L.homePlotMax(s) === 3 && L.homePlots(s).length === 3 && L.homePlots(s)[0] === 'array';
        s.home.cave = 3; o.plots3 = L.homePlotMax(s) === 4; s.home.cave = 12; o.plots12 = L.homePlotMax(s) === 8; s.home.cave = 0;
        L.build(s, 'field'); L.build(s, 'furnace');
        o.full = L.homePlotFree(s) === 0 && /地块满/.test(L.buildWhy(s, 'room')) && L.homeOpen(s, 'room') === false && L.build(s, 'room') === null && !L.upgrade(s, 'room');
        o.fullBuiltOpen = L.homeOpen(s, 'field') === true;
        for (let i = 0; i < 3; i++) L.upgrade(s, 'cave');
        o.plot4 = L.homePlotFree(s) === 1 && L.homeOpen(s, 'room') === true;
        const r0 = L.retBaseMult(s); L.build(s, 'room'); const r1 = L.retBaseMult(s);
        o.room1 = Math.abs(r1 - r0 - 0.05) < 1e-9;
        for (let i = 0; i < 7; i++) L.upgrade(s, 'room');
        const spent = s.home.spent.room, st0 = s.stones, d = L.demolish(s, 'room');
        o.demo = !!d && d.back === Math.floor(spent / 2) && s.stones === st0 + d.back && s.home.rec.room === 4 && s.home.room === 0 && !has(s, 'room') && L.homePlotFree(s) === 1;
        const b = L.build(s, 'room'); o.rebuild = !!b && b.lv === 4 && s.home.room === 4 && s.home.rec.room === undefined && has(s, 'room');
        const s1 = mk(); L.build(s1, 'vault'); L.demolish(s1, 'vault'); const b1 = L.build(s1, 'vault'); o.rebuild1 = b1.lv === 1 && !s1.home.rec.vault;
        L.upgrade(s1, 'vault'); L.upgrade(s1, 'vault'); L.upgrade(s1, 'vault'); L.demolish(s1, 'vault'); o.rec3 = s1.home.rec.vault === 2 && L.homeRebuildLv(s1, 'vault') === 2;
        o.noDemoArray = L.demolish(s, 'array') === null && /根基/.test(L.demolishWhy(s, 'array')) && L.demolish(s, 'cave') === null && L.demolish(s, 'pen') === null;
        const sl = mk(); sl.home.cave = 6; L.migrateHome(sl);
        L.build(sl, 'library'); L.upgrade(sl, 'library'); L.upgrade(sl, 'library');
        const n3 = Object.keys(sl.meta.chint).length; L.demolish(sl, 'library');
        const rb = L.build(sl, 'library'); L.upgrade(sl, 'library');
        o.libOnce = n3 === 3 && Object.keys(sl.meta.chint).length === 3 && rb.hints.length === 0 && sl.home.library === 2;
        L.upgrade(sl, 'library'); L.upgrade(sl, 'library'); o.libNew = Object.keys(sl.meta.chint).length === 4;
        const sp = mk(); sp.home.cave = 6; L.migrateHome(sp); const full0 = L.hCost('pen', 0);
        L.applyFx(sp, { flag: 'pen_discount' }); o.penDisc = sp.home.disc.pen === 0.7 && L.homeCost(sp, 'pen') === Math.floor(full0 * 0.7);
        L.build(sp, 'pen'); o.penDisc2 = sp.home.spent.pen === Math.floor(full0 * 0.7) && !sp.home.disc.pen && L.homeCost(sp, 'pen') === L.hCost('pen', 1);

        // 拆丹炉停续炼、拆灵田铲作物、重建的田是新的灵稻
        const dm = mk(); dm.home.cave = 6; L.migrateHome(dm); L.build(dm, 'field'); L.build(dm, 'furnace'); for (let i = 0; i < 5; i++) L.upgrade(dm, 'field');
        L.plant(dm, 0, 'fire'); const planted = L.plots(dm)[0].c === 'fire'; dm.dan.auto = ['peiyuan'];
        o.demFurnace = !!L.demolish(dm, 'furnace') && dm.dan.auto.length === 0 && !dm.home.furnace && !has(dm, 'furnace');
        o.demField = planted && !!L.demolish(dm, 'field') && L.plotCount(dm) === 0 && L.plots(dm).length === 0;
        L.build(dm, 'field'); o.demField2 = dm.home.field === 3 && L.plots(dm).length === 1 && L.plots(dm).every(x => x.c === 'rice' && x.g === 0);
        // 坊市轮换货：阵图（生财阵）
        const mz = mk(); mz.market.rot = [{ k: 'zhentu', lim: 1, sold: 0, off: 0, zt: 'f_shengcai' }]; mz.market.cyc = Math.floor(mz.tick / 12); mz.stones = 1e9;
        const zrow = L.shelf(mz).find(r => r.k === 'zhentu'), zb0 = L.zhenOwned(mz, 'f_shengcai'), zbuy = zrow && L.shelfBuy(mz, zrow.i);
        o.shopZhen = !!zrow && !zb0 && !!zbuy && L.zhenOwned(mz, 'f_shengcai') && !L.zhenShopOk(mz) && L.zhenShopOk(Object.assign(mk(), { rebirth: 0, p: Object.assign(mk().p, { r: 1 }), flags: { maxR: 1 } }));

        // ---- 2 迁移
        const mkOld = (h, v) => { const x = JSON.parse(JSON.stringify(mk())); x.home = h; x.rebirth = 0; x.v = v || 6; return x; };
        const old = mkOld({ cave: 6, array: 9, field: 8, furnace: 6 }); const m = L.migrate(old);
        o.migPlots = !!m && JSON.stringify(m.home.plots.slice(0, 3)) === '["array","field","furnace"]' && m.home.array === 9 && m.home.field === 8 && m.home.furnace === 6;
        o.migRec = m.home.rec.room === 6 && m.home.rec.forge === 5 && m.home.cave === 6;
        o.migSpent = m.home.spent.field === L.homeSum('field', 8) && m.home.spent.furnace === L.homeSum('furnace', 6);
        const snap = JSON.stringify(m.home), m2 = L.migrate(JSON.parse(JSON.stringify(m)));
        o.migTwice = JSON.stringify(m2.home) === snap && L.migrateHome(m2) === '' && JSON.stringify(m2.home) === snap;
        const low = mkOld({ cave: 0, array: 2, field: 2, furnace: 3 }); L.migrate(low); o.migLowFurnace = !low.home.rec.forge && !low.home.rec.room;
        const ov = mk(); ov.home.cave = 0; ov.home.room = 1; ov.home.field = 2; ov.home.furnace = 2; ov.home.plots = undefined; L.migrateHome(ov);
        o.over = L.homePlots(ov).length === 4 && L.homeOver(ov) === 1 && ov.home.room === 1 && L.homePlotFree(ov) === 0;
        L.demolish(ov, 'room'); o.overBack = L.homePlots(ov).length === 3 && L.homeOver(ov) === 0 && ov.home.room === 0;
        const v2 = mkOld({ cave: 6, array: 9, field: 8, furnace: 6 }, 2); v2.p.r = 1; const mv2 = L.migrate(v2);
        o.migV2 = !!mv2 && mv2.v === L.SAVE_V && JSON.stringify(mv2.home.plots.slice(0, 3)) === '["array","field","furnace"]' && mv2.home.array === 9 && mv2.home.rec.room === 6 && Array.isArray(mv2.home.zhen) && mv2.home.zhen[0].id === 'f_juling';
        const v2b = JSON.stringify(mv2.home); o.migV2Twice = JSON.stringify(L.migrate(JSON.parse(JSON.stringify(mv2))).home) === v2b;
        const v2c = mkOld({ cave: 99, array: 99, field: 99, furnace: 99 }, 2); const mc = L.migrate(v2c);
        o.migClamp = !!mc && mc.home.cave === 12 && mc.home.array === 30 && mc.home.furnace === 20 && L.homePlots(mc).length >= 3;
        const bad = mkOld({ cave: 1, array: 1, field: 0, furnace: 0 }); bad.home.plots = ['field', 'array', 'x', 'furnace', 'furnace']; L.migrate(bad);
        o.migBadPlots = bad.home.plots[0] === 'array' && !bad.home.plots.includes('x') && bad.home.plots.filter(k => k === 'furnace').length === 0;

        // ---- 3 建筑效果
        s = mk(); s.home.cave = 12; L.migrateHome(s);
        for (const k of ['forge', 'library', 'spring', 'pen', 'vault', 'pavilion', 'portal']) L.build(s, k);
        o.built7 = L.homePlotFree(s) === 0;
        const t = mk(); t.home.cave = 12; L.migrateHome(t);
        const e0 = L.artEpi(t), c0 = L.retBaseMult(t); L.build(t, 'room');
        o.roomEpi = Math.abs(L.artEpi(t) - e0 - 0.02) < 1e-9 && Math.abs(L.retBaseMult(t) - c0 - 0.05) < 1e-9;
        L.upgrade(t, 'room'); o.roomLv2 = Math.abs(L.artEpi(t) - e0 - 0.04) < 1e-9 && Math.abs(L.retBaseMult(t) - c0 - 0.10) < 1e-9 && Math.abs(L.roomRet(t) - 0.10) < 1e-9;
        const f = mk(); f.home.cave = 12; L.migrateHome(f); f.gear.w = { u: 1, id: 'w1_0', slot: 'w', t: 1, plus: 4, aff: [], fail: 0 };
        const pr0 = L.gearPlusRate(f, f.gear.w), oc0 = L.gearPlusCost(f, f.gear.w).ore; L.build(f, 'forge');
        const pr1 = L.gearPlusRate(f, f.gear.w), oc1 = L.gearPlusCost(f, f.gear.w).ore;
        o.forge1 = Math.abs(pr1 - pr0 - 0.02) < 1e-9 && oc1 < oc0 && oc1 === Math.max(1, Math.ceil(oc0 * 0.97)) && L.forgeLv(f) === 1 && !L.gearOpen(f, 'forge');
        for (let i = 0; i < 4; i++) L.upgrade(f, 'forge'); o.forge5 = L.forgeLv(f) === 5 && L.gearOpen(f, 'forge') && Math.abs(L.gearPlusRate(f, f.gear.w) - pr0 - 0.10) < 1e-9;
        const f2 = mk(); f2.home.furnace = 8; f2.home.cave = 3; L.migrateHome(f2); o.noForgeFromFurnace = L.forgeLv(f2) === 0 && !L.gearOpen(f2, 'forge');
        const pt = mk(); pt.home.cave = 12; L.migrateHome(pt); L.build(pt, 'portal');
        const base = mk(); const len0 = L.expLen(0, base);
        o.portal1 = L.portalLv(pt) === 1 && L.expLen(0, pt) === len0 && L.mjCost(pt) === L.MJ.cost;
        for (let i = 0; i < 2; i++) L.upgrade(pt, 'portal'); o.portal3 = L.expLen(0, pt) === len0 - 1 && L.expLen(0, base) === len0;
        for (let i = 0; i < 3; i++) L.upgrade(pt, 'portal');
        pt.best['0_0'] = 1; pt.best['0_1'] = 0; const closed = L.depthOpen(pt, 0, 2); pt.best['0_0'] = 2; const open6 = L.depthOpen(pt, 0, 2);
        base.best['0_0'] = 2; base.best['0_1'] = 0; o.portal6 = !closed && open6 && !L.depthOpen(base, 0, 2) && L.depthOpen(pt, 0, 1);
        o.portalMj = L.portalLv(pt) === 6 && L.mjCost(pt) === L.MJ.cost && (L.upgrade(pt, 'portal'), L.upgrade(pt, 'portal'), L.upgrade(pt, 'portal'), L.portalLv(pt) === 9 && L.mjCost(pt) === 0);
        const mkInj = (lvSpring, inj) => { const q = mk(); q.home.cave = 12; L.migrateHome(q); if (lvSpring) { L.build(q, 'spring'); while (q.home.spring < lvSpring) L.upgrade(q, 'spring'); } q.p.inj = 0; L.tick(q); q.p.inj = inj; L.tick(q); return q.p.inj; };
        o.spring0 = mkInj(0, 5) === 4; o.spring1 = mkInj(1, 5) === 4; o.spring4 = mkInj(4, 5) === 2; o.springMin = mkInj(10, 1) === 0 && mkInj(10, 2) === 0 + 0 || mkInj(10, 2) <= 1;
        const vt = mk(); vt.home.cave = 12; L.migrateHome(vt); const im = q => L.modProd(L.modParts('incMul', q)); const inc0 = im(vt);
        L.build(vt, 'vault'); L.upgrade(vt, 'vault'); o.vaultInc = Math.abs(im(vt) / inc0 - 1.04) < 1e-6;
        const vs = mk(); vs.home.cave = 12; L.migrateHome(vs); const sk = Object.keys(L.SELL)[0];
        const pv0 = L.sellPrice(vs, sk); L.build(vs, 'vault'); L.upgrade(vs, 'vault'); L.upgrade(vs, 'vault'); const pv1 = L.sellPrice(vs, sk);
        o.vaultSell = pv1 > pv0;
        const pv = mk(); pv.home.cave = 12; L.migrateHome(pv); const vm0 = L.calVisitMult(pv); o.pav0 = L.visitFavorBonus(pv) === 0;
        L.build(pv, 'pavilion'); L.upgrade(pv, 'pavilion'); o.pav = Math.abs(L.calVisitMult(pv) / vm0 - 1.2) < 1e-9 && L.visitFavorBonus(pv) === 1;
        pv.npc = { su: { aff: 30 } }; const a0 = pv.npc.su.aff; const out1 = L.applyFx(pv, { aff: { su: 4 } }, { ev: { visit: 1, id: 't' } }); const a1 = pv.npc.su.aff;
        const out2 = L.applyFx(pv, { aff: { su: 4 } }, { ev: { id: 't' } }); const a2 = pv.npc.su.aff;
        const pv2 = mk(); pv2.npc = { su: { aff: 30 } }; L.applyFx(pv2, { aff: { su: 4 } }, { ev: { visit: 1, id: 't' } });
        o.pavAff = a1 - a0 === pv2.npc.su.aff - 30 + 1 && a2 - a1 === a1 - a0 - 1 && out1.some(x => /迎客亭/.test(x)) && !out2.some(x => /迎客亭/.test(x));
        const pe = mk(); pe.home.cave = 12; L.migrateHome(pe); const pf0 = L.petFeedEff(pe), pj0 = L.penJobMult(pe); L.build(pe, 'pen'); L.upgrade(pe, 'pen');
        o.pen = Math.abs(L.petFeedEff(pe) / pf0 - 1.16) < 1e-6 && Math.abs(L.penJobMult(pe) - 1.10) < 1e-9 && pj0 === 1;
        L.HOME2_ON = false;
        try { const nh = mk(); nh.home.cave = 12; L.migrateHome(nh); o.nh = !L.homeUnlocked(nh, 'room') && L.build(nh, 'forge') === null && L.homeUnbuilt(nh).every(k => !L.HOME_B[k].nu) && L.zhenSlots(nh) === 1 && !L.zhenOpen(nh);
          nh.home.cave = 6; o.nhRet = Math.abs(L.roomRet(nh) - 0.30) < 1e-9; o.nhForge = L.forgeLv({ home: { furnace: 7, forge: 3 } }) === 7; } finally { L.HOME2_ON = true; }

        // ---- 4 阵法
        const zs = () => { const q = mk(); q.home.cave = 12; q.home.array = 20; L.migrateHome(q); q.gear.zhentu = { f_dujie: 1, f_danhuo: 1, f_shengcai: 1, f_hushan: 1 }; return q; };
        let z = zs();
        o.zOpen = L.zhenSlots(z) === 2 && L.formationReady(z, 'f_juling') && !L.formationReady(z, 'f_dujie');
        z.tick = 400; L.zhenSet(z, 0, 'f_dujie');
        o.zAt = z.home.zhen[0].at === 403;
        const hist = []; for (let i = 0; i < 3; i++) { z.tick++; L.zhenTick(z, {}); hist.push([L.formationReady(z, 'f_juling'), L.formationReady(z, 'f_dujie')]); }
        o.zSwitch = JSON.stringify(hist) === '[[true,false],[true,false],[false,true]]';
        o.zTrib = Math.abs(L.aidInfo(z, 'zhen').v - 0.15) < 1e-9 && L.aidInfo(z, 'zhen').ok && Math.abs(L.formationVal(z, 'f_dujie') - 0.15) < 1e-9;
        z.home.array = 8; o.zTrib8 = Math.abs(L.formationVal(z, 'f_dujie') - 0.08) < 1e-9; z.home.array = 40; o.zTribCap = Math.abs(L.formationVal(z, 'f_dujie') - 0.15) < 1e-9; z.home.array = 20;
        o.zCulGone = L.culParts(z).find(x => x[2] === 'array')[1] === 1;
        L.zhenSet(z, 0, 'f_juling'); for (let i = 0; i < 3; i++) { z.tick++; L.zhenTick(z, {}); }
        o.zCulBack = Math.abs(L.culParts(z).find(x => x[2] === 'array')[1] - Math.pow(1.08, 20)) < 1e-9;
        L.zhenSet(z, 1, 'f_dujie'); for (let i = 0; i < 3; i++) { z.tick++; L.zhenTick(z, {}); }
        o.zSecond = L.zhenK(z, 'f_dujie') === 0.5 && Math.abs(L.formationVal(z, 'f_dujie') - 0.075) < 1e-9 && Math.abs(L.aidInfo(z, 'zhen').v - 0.075) < 1e-9;
        o.zSecondCul = Math.abs(L.zhenNum(z, 'f_juling', 0.5).cul - (1 + (Math.pow(1.08, 20) - 1) * 0.5)) < 1e-9;
        o.zNoDup = /另一个阵位/.test(L.zhenSetWhy(z, 0, 'f_dujie')) && L.zhenSet(z, 0, 'f_dujie') === null && /另一个阵位/.test(L.zhenSetWhy(z, 1, 'f_juling'));
        L.zhenSet(z, 1, 'f_danhuo'); o.zNoDupNx = /另一个阵位/.test(L.zhenSetWhy(z, 0, 'f_danhuo'));
        const z1 = zs(); z1.p.r = 4; z1.flags.maxR = 4; z1.rebirth = 0; o.zSlot2R = L.zhenSlots(z1) === 1 && /炼虚/.test(L.zhenSetWhy(z1, 1, 'f_danhuo')) && /还没有这张阵图/.test(L.zhenSetWhy(zs(), 0, 'f_duanhun')) && /不能空/.test(L.zhenSetWhy(z1, 0, ''));
        const rb1 = L.newState({ name: 'r' }); rb1.rebirth = 1; o.rebirth = L.BLD_KEYS.filter(k => k !== 'array').every(k => L.homeUnlocked(rb1, k)) && L.zhenOpen(rb1) && L.zhenSlots(rb1) === 1;
        rb1.flags.maxR = 5; o.rebirth2 = L.zhenSlots(rb1) === 2;
        const zp = zs(); L.zhenSet(zp, 1, 'f_shengcai'); for (let i = 0; i < 3; i++) { zp.tick++; L.zhenTick(zp, {}); }
        const on = [L.zhenK(zp, 'f_juling'), L.zhenK(zp, 'f_shengcai')], inc_on = L.income(zp); zp.cal.pause = zp.tick + 5;
        o.zPause = on[0] === 1 && on[1] === 0.5 && L.zhenK(zp, 'f_juling') === 0 && L.zhenK(zp, 'f_shengcai') === 0 && L.culParts(zp).find(x => x[2] === 'array')[1] === 1 && L.income(zp) < inc_on && !L.formationReady(zp, 'f_juling');
        zp.cal.pause = 0; o.zPauseEnd = L.zhenK(zp, 'f_juling') === 1;
        const zb = zs(); zb.tick = 500; L.zhenSet(zb, 0, 'f_dujie'); const o1 = L.applyFx(zb, { flag: 'formation_boost' });
        o.zBoost = !!zb.home.zboost && zb.home.zboost.id === 'f_dujie' && zb.home.zboost.until === 503 + L.ZV.boostLen && o1.some(x => /阵势 \+20%/.test(x)) && !zb.eflags.formation_boost;
        for (let i = 0; i < 3; i++) { zb.tick++; L.zhenTick(zb, {}); }
        o.zBoost2 = Math.abs(L.zhenK(zb, 'f_dujie') - 1.2) < 1e-9 && Math.abs(L.formationVal(zb, 'f_dujie') - 0.15 * 1.2) < 1e-9;
        zb.tick = 503 + L.ZV.boostLen; o.zBoostEnd = L.zhenK(zb, 'f_dujie') === 1;
        const zr = zs(); zr.tick = 600; L.zhenSet(zr, 0, 'f_dujie'); zr.tick = 601; const o2 = L.applyFx(zr, { flag: 'formation_redo' });
        o.zRedo = zr.home.zhen[0].at === 606 && zr.home.zhen[0].nx === 'f_dujie' && zr.home.zhen[0].id === 'f_juling' && o2.some(x => /要再布 3/.test(x));
        const zr2 = zs(); zr2.tick = 600; const o3 = L.applyFx(zr2, { flag: 'formation_redo' });
        o.zRedo2 = zr2.home.zhen[0].nx === 'f_juling' && zr2.home.zhen[0].at === 603 && o3.some(x => /撤了重布/.test(x));
        const zz = zs(); zz.home.zhen = [{ id: 'bogus', nx: 'x', at: -3 }, null]; L.zhenState(zz); o.zBad = zz.home.zhen[0].id === 'f_juling' && zz.home.zhen[1].id === '' && zz.home.zhen.length === 2;
    } catch (e) { o.exception = false; o.msg = e.message + ' @' + (e.stack || '').split('\n')[1]; }
    return o;
  });
  if (hl.msg) errors.push('check: 洞府逻辑抛了异常：' + hl.msg);
  for (const k in hl) if (k !== 'msg') expect(hl[k], '洞府逻辑：' + k);
  // 载入一个洞府局面：cfg.r 境界、i 最高心境、cave 洞府等级、build 先建的建筑、zhen 阵图、unseen 不标已看的老祖讲解
  const hLoad = async cfg => {
    await page.evaluate(() => { const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); });
    await page.evaluate(cfg => {
      const { L } = window.__xm, s = L.newState({ name: '洞府' });
      s.stats.exp = 8; s.stones = 1e10; s.p.r = cfg.r; s.p.s = cfg.s === undefined ? 1 : cfg.s; s.flags.maxR = Math.max(cfg.r, cfg.maxR || 0); s.flags.maxI = cfg.i; s.tick = 300 + 300 * (window.__hn = (window.__hn || 0) + 1); s.pact = 1;   // 每局的周天往后挪，老祖讲解的冷却不串局
      s.herbs = cfg.herbs || 0;
      s.home.cave = cfg.cave; L.migrateHome(s);
      for (const k of cfg.build || []) L.build(s, k);
      for (const id of cfg.zhen || []) s.gear.zhentu[id] = 1;
      s.guide = { step: 99, done: true }; s.hintSeen = {}; for (const h of window.__xm.hints) s.hintSeen[h.id] = 1; for (const id of cfg.unseen || []) delete s.hintSeen[id];
      s.storyQ = []; s.seenTips = {}; for (const k of L.BLD_KEYS) s.seenTips['bld_' + k] = 1; for (const z of L.ZHEN) s.seenTips['zt_' + z.id] = 1; for (const id of cfg.tips || []) delete s.seenTips[id];
      window.__xm.loadState(JSON.parse(JSON.stringify(s)));
      window.__xm.setSpeed(3);
    }, cfg);
    await page.waitForTimeout(300);
  };
  const hq = fn => page.evaluate(fn);
  // 洞府面板：2×4 网格（3 个已建、1 块空地、4 块未开）、选中空地列出能建的（荐在最前、没解锁的灰）、点建、升级、拆除要确认
  await hLoad({ r: 3, i: 13, cave: 4, build: ['field', 'furnace'] });
  await page.evaluate(() => window.__xm.showHome(false, 3)); await page.waitForTimeout(350);
  const hg = await hq(() => {
    const t = [...document.querySelectorAll('#modal #homeGrid .hplot')], rows = [...document.querySelectorAll('#modal [data-build]')];
    return { n: t.length, locked: t.filter(x => /未开/.test(x.textContent)).length, empty: t.filter(x => /空地/.test(x.textContent)).length, can: t.filter(x => x.classList.contains('can')).length,
      built: t.filter(x => !/未开|空地/.test(x.textContent)).length, sel: t.filter(x => x.classList.contains('sel')).map(x => +x.dataset.hp), rows: rows.map(b => b.dataset.build + (b.disabled ? ':off' : '')),
      rec: (document.querySelector('#modal .crow .chip') || {}).textContent, recK: (document.querySelector('#modal .crow [data-build]') || {}).dataset && document.querySelector('#modal .crow [data-build]').dataset.build, sub: (document.querySelector('#modal .sub, #modal .head .muted') || {}).textContent || '' };
  });
  await shot('h01-home-empty-plot');
  expect(hg.n === 8 && hg.locked === 4 && hg.empty === 1 && hg.built === 3 && hg.sel.join() === '3' && hg.can === 1, '洞府网格：8 格，3 已建 / 1 空（买得起荐的，标“可建”）/ 4 未开，选中第 4 块：' + JSON.stringify(hg));
  expect(hg.rows.length === 8 && hg.rows.includes('portal:off') && !hg.rows.filter(x => x !== 'portal:off').some(x => /:off/.test(x)) && hg.rec === '荐' && hg.recK === 'room', '空地建造列表：8 项、传送阵（化神）灰着、第一项是荐的（静室）：' + JSON.stringify(hg));
  expect(hg.rows.indexOf('field') < 0 && hg.rows.indexOf('furnace') < 0 && !hg.rows.includes('cave') && !hg.rows.includes('array'), '建造列表不含已建的、洞府本体和聚灵阵');
  await page.click('#modal [data-build="room"]'); await page.waitForTimeout(350);
  const hb = await hq(() => { const { st, L } = window.__xm; return { room: st.home.room, pl: L.homePlots(st).join(), spent: st.home.spent.room, msg: (document.querySelector('#modal .quote') || {}).textContent || '', tile: (document.querySelector('#modal [data-hp="3"]') || {}).textContent, demo: !!document.querySelector('#modal [data-demo="room"]'), up: !!document.querySelector('#modal button[data-k="room"]'), full: L.homePlotFree(st) }; });
  expect(hb.room === 1 && hb.pl === 'array,field,furnace,room' && hb.spent === 300 && /静室/.test(hb.msg) && /Lv1/.test(hb.tile) && hb.demo && hb.up && hb.full === 0, '点【建】：静室 Lv1 建在第 4 块、记花费 300、提示、网格更新：' + JSON.stringify(hb));
  await page.click('#modal button[data-k="room"]'); await page.waitForTimeout(300);
  expect(await hq(() => window.__xm.st.home.room === 2), '已建的地块里点升级：静室 Lv2');
  // 拆除：先问，取消不动；确认后退一半、记一半等级、地块空出来
  await page.click('#modal [data-demo="room"]'); await page.waitForTimeout(300); await shot('h02-home-demolish');
  const hd = await hq(() => { const { st, L } = window.__xm; return { yes: !!document.querySelector('#modal [data-demo-yes]'), no: !!document.querySelector('#modal [data-demo-no]'), txt: (document.querySelector('#modal .hdet .quote') || {}).textContent || '', back: L.homeRefund(st, 'room'), room: st.home.room }; });
  expect(hd.yes && hd.no && /拆了退/.test(hd.txt) && /重建从\s*1\s*级起/.test(hd.txt) && hd.back > 0 && hd.room === 2, '拆除前要确认，写明退多少、重建从几级起：' + JSON.stringify(hd));
  await page.click('#modal [data-demo-no]'); await page.waitForTimeout(300);
  expect(await hq(() => window.__xm.st.home.room === 2 && !document.querySelector('#modal [data-demo-yes]')), '点【取消】：建筑还在，确认条收起');
  await page.click('#modal [data-demo="room"]'); await page.waitForTimeout(250);
  const stBefore = await hq(() => window.__xm.st.stones), refund = await hq(() => window.__xm.L.homeRefund(window.__xm.st, 'room'));
  await page.click('#modal [data-demo-yes="room"]'); await page.waitForTimeout(350);
  const hy = await hq(() => { const { st, L } = window.__xm; return { room: st.home.room, rec: st.home.rec.room, stones: st.stones, pl: L.homePlots(st).join(), empty: [...document.querySelectorAll('#modal #homeGrid .hplot')].filter(x => /空地/.test(x.textContent)).length, msg: (document.querySelector('#modal .quote') || {}).textContent || '' }; });
  expect(hy.room === 0 && hy.rec === 1 && hy.stones >= stBefore + refund && refund > 0 && hy.pl === 'array,field,furnace,' && hy.empty === 1 && /拆了静室/.test(hy.msg), '确认拆除：退一半、记 1 级、这块地空出来：' + JSON.stringify(hy));
  expect(await hq(() => { const r = [...document.querySelectorAll('#modal [data-build="room"]')]; return r.length === 1 && !/重建从/.test(r[0].closest('.crow').textContent); }), '重建 1 级的不写“重建从”（和新建一样）');
  // 未开的地块：写洞府几级开
  await page.click('#modal [data-hp="6"]'); await page.waitForTimeout(300); await shot('h03-home-locked-plot');
  const hk = await hq(() => (document.querySelector('#modal .hdet') || {}).textContent || '');
  expect(/未开/.test(hk) && /洞府升到\s*10\s*级/.test(hk), '未开的地块：洞府升到 10 级开：' + hk);
  // 洞府升级：4 → 5 级多一块地，写在提示里；第 5 块变空地
  await page.click('#modal button[data-k="cave"]'); await page.waitForTimeout(350);
  const hc = await hq(() => ({ max: window.__xm.L.homePlotMax(window.__xm.st), msg: (document.querySelector('#modal .quote') || {}).textContent || '', empty: [...document.querySelectorAll('#modal #homeGrid .hplot')].filter(x => /空地/.test(x.textContent)).length }));
  expect(hc.max === 5 && /多出一块地/.test(hc.msg) && hc.empty === 2, '洞府 4 → 5 级：多出一块地，提示写明：' + JSON.stringify(hc));
  await close();
  // 地块满：洞府面板上空地没了、满了的提示在洞府卡里；超额的旧档卡上写“地块超出”
  await hLoad({ r: 3, i: 13, cave: 0, build: ['field', 'furnace'] });
  await page.evaluate(() => { const { st, L } = window.__xm; st.home.room = 1; st.home.spent.room = 300; L.homePlots(st); window.__xm.showHome(false, 0); }); await page.waitForTimeout(350); await shot('h04-home-over');
  const ho = await hq(() => ({ txt: (document.querySelector('#modal .card:has(button[data-k="cave"])') || document.body).textContent, over: document.querySelectorAll('#modal #homeGrid .hplot.over').length, n: document.querySelectorAll('#modal #homeGrid .hplot').length }));
  expect(/地块超出 1 块/.test(ho.txt) && ho.over === 1 && ho.n === 8, '旧档地块超额：洞府卡写“地块超出 1 块”、超额那格标出来：' + JSON.stringify(ho));
  await close();
  // 阵法面板：布阵中、旧阵照常；第二阵位（炼虚）；同一阵法不能占两位
  await hLoad({ r: 5, i: 22, cave: 12, build: ['field', 'furnace', 'room'], zhen: ['f_dujie', 'f_danhuo'] });
  await page.evaluate(() => { const { st } = window.__xm; st.home.array = 12; window.__xm.showZhen(); }); await page.waitForTimeout(350);
  const z0 = await hq(() => ({ slots: document.querySelectorAll('#modal #zhenSlots .zslot').length, rows: document.querySelectorAll('#modal .crow').length, own: [...document.querySelectorAll('#modal .crow:not(.off)')].length }));
  expect(z0.slots === 2 && z0.rows === 8 && z0.own === 3, '阵法面板：两个阵位、八张阵图、手里 3 张：' + JSON.stringify(z0));
  await page.click('#modal [data-zs="0"][data-zid="f_dujie"]'); await page.waitForTimeout(350); await shot('h05-zhen-pending');
  const z1 = await hq(() => { const { st, L } = window.__xm, s0 = document.querySelectorAll('#modal #zhenSlots .zslot')[0]; return { pend: s0.classList.contains('zpend'), txt: s0.textContent, id: st.home.zhen[0].id, nx: st.home.zhen[0].nx, at: st.home.zhen[0].at - st.tick, chip: [...document.querySelectorAll('#modal .crow')].filter(r => /布阵中/.test(r.textContent)).length, msg: (document.querySelector('#modal .quote') || {}).textContent || '', k: L.zhenK(st, 'f_juling'), dis: !!document.querySelector('#modal [data-zs="1"][data-zid="f_dujie"]').disabled }; });
  expect(z1.pend && /布阵中/.test(z1.txt) && z1.id === 'f_juling' && z1.nx === 'f_dujie' && z1.at === 3 && z1.k === 1 && /3<\/b> 个周天后生效|3 个周天后生效/.test(z1.msg.replace(/<[^>]+>/g, '')) && z1.dis, '换阵：布阵中 3 周天、旧阵（聚灵）照常、这张阵法不能再放第二阵位：' + JSON.stringify(z1));
  await page.click('#modal [data-zs="1"][data-zid="f_danhuo"]'); await page.waitForTimeout(350); await shot('h06-zhen-second');
  const z2 = await hq(() => { const { st } = window.__xm, c = document.querySelectorAll('#modal #zhenSlots .zslot'); return { nx1: st.home.zhen[1].nx, txt: c[1].textContent, pend: c[1].classList.contains('zpend') }; });
  expect(z2.nx1 === 'f_danhuo' && z2.pend && /第二阵位/.test(z2.txt) && /×0.5/.test(z2.txt), '第二阵位布丹火阵（效果 ×0.5）：' + JSON.stringify(z2));
  expect(await hq(() => { const b = document.querySelector('#modal [data-zs="0"][data-zid="f_dujie"]'); return b.disabled && window.__xm.st.home.zhen[0].nx === 'f_dujie'; }), '正在布的阵法按钮灰着、点不动');
  await page.evaluate(() => { const { st } = window.__xm; st.tick += 3; window.__xm.onTick(); }); await page.waitForTimeout(300);
  const z3 = await hq(() => { const { st, L } = window.__xm; return { a: st.home.zhen[0].id, b: st.home.zhen[1].id, trib: L.formationVal(st, 'f_dujie'), cul: L.culParts(st).find(x => x[2] === 'array')[1] }; });
  expect(z3.a === 'f_dujie' && z3.b === 'f_danhuo' && Math.abs(z3.trib - 0.12) < 1e-9 && z3.cul === 1, '3 周天后换阵生效、聚灵阵那项 ×1、渡劫阵护劫 +12%（阵法强度 12）：' + JSON.stringify(z3));
  await close();
  // 筑基前阵法没开：showZhen 退回洞府；炼虚前只有一个阵位
  await hLoad({ r: 1, i: 4, cave: 2, build: ['field'] });
  await page.evaluate(() => window.__xm.showZhen()); await page.waitForTimeout(300);
  expect(await hq(() => !!document.querySelector('#modal #homeGrid') && !document.querySelector('#modal #zhenSlots')), '阵法没开（心境不到筑基后期）：showZhen 退回洞府网格');
  await close();
  await hLoad({ r: 3, i: 13, cave: 6, zhen: ['f_dujie'], maxR: 3 });
  await page.evaluate(() => window.__xm.showZhen()); await page.waitForTimeout(300);
  expect(await hq(() => document.querySelectorAll('#modal #zhenSlots .zslot').length === 1 && !document.querySelector('#modal [data-zs="1"]') && /炼虚后开第二阵位/.test(document.querySelector('#modal .body').textContent)), '元婴只有一个阵位：没有第二阵位按钮，写“炼虚后开第二阵位”');
  await close();
  // 场景：夜间 / 白天画着建筑与光圈不出错；点场景里的建筑打开洞府并选中那块地
  await hLoad({ r: 5, i: 22, cave: 12, build: ['field', 'furnace', 'room', 'vault'], zhen: ['f_dujie'] });
  const sc = await page.evaluate(async () => {
    const { st, L } = window.__xm; st.home.zhen[1] = { id: 'f_dujie', nx: '', at: 0 }; const cvs = document.querySelector('#scene'), r = cvs.getBoundingClientRect(), H = cvs.height, OY = H - 160, slots = window.__xm.ART.homeSlots;
    const click = (x, y) => cvs.dispatchEvent(new MouseEvent('click', { clientX: r.left + x / 200 * r.width, clientY: r.top + (y - 8 + OY) / H * r.height, bubbles: true }));
    const out = {}; out.pl = L.homePlots(st).join();
    // 丹炉占第 2 个景位，其余按地块顺序：静室第 3 个、聚宝阁第 4 个
    click(slots[3].x, slots[3].y); await new Promise(f => setTimeout(f, 500));
    out.sel = (document.querySelector('#modal #homeGrid .hplot.sel') || {}).dataset && document.querySelector('#modal #homeGrid .hplot.sel').dataset.hp; out.title = (document.querySelector('#modal .hdet') || {}).textContent || '';
    return out;
  });
  expect(sc.pl === 'array,field,furnace,room,vault,,,' && sc.sel === '3' && /静室/.test(sc.title), '点场景里的静室：打开【洞府】选中静室那块地：' + JSON.stringify(sc));
  await close();
  const lum = [];
  await page.evaluate(() => { window.__skyAt0 = window.__xm.ART.skyAt; });
  for (const [ph, nm] of [[0.5, 'day'], [0.0, 'night']]) {
    await page.evaluate(ph => { const A = window.__xm.ART; A.skyAt = () => window.__skyAt0(ph); }, ph);
    await page.waitForTimeout(700); await shot('h07-scene-' + nm);
    lum.push(await page.evaluate(() => { const c = document.querySelector('#scene'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let t = 0; for (let i = 0; i < d.length; i += 4) t += d[i] + d[i + 1] + d[i + 2]; return t / (d.length / 4) / 3; }));
  }
  await page.evaluate(() => { window.__xm.ART.skyAt = window.__skyAt0; });
  expect(lum[0] > lum[1] + 15, '场景白天比夜间亮（建筑与光圈照常画）：' + lum.map(Math.round).join(' / '));
  // 已有场景的光圈：布阵中画虚线（pending）不抛错
  await page.evaluate(() => { const { st, L } = window.__xm; st.home.zhen[0].nx = 'f_juling'; st.home.zhen[0].id = 'f_dujie'; st.home.zhen[0].at = st.tick + 3; }); await page.waitForTimeout(500);
  // 老祖讲解：炼气圆满、器炉解锁、地块比建筑少 → 讲地块
  await hLoad({ r: 0, s: 3, i: 3, cave: 0, build: [], unseen: ['plots'] });
  const hint = async id => {
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(300);
      if (await page.evaluate(() => window.__xm.guideDbg.active) === id) return true;
      await page.evaluate(id => { const { st } = window.__xm; for (const h of window.__xm.guideDbg.cand) if (h !== id) st.hintSeen[h] = 1; const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok && window.__xm.guideDbg.active !== id) ok.click(); }, id);
      await page.evaluate(() => window.__xm.onTick());
    }
    return false;
  };
  const pre = await hq(() => { const { st, L } = window.__xm; return { un: L.homeUnbuilt(st), free: L.homePlotFree(st), forge: L.homeUnlocked(st, 'forge') }; });
  expect(pre.forge && pre.un.includes('forge') && pre.un.length > pre.free, '前提：炼气圆满器炉解锁，能建的比空地多：' + JSON.stringify(pre));
  const got = await hint('plots'); await shot('h08-hint-plots');
  const ht = await hq(() => ({ vis: !document.querySelector('#guide').hidden, txt: (document.querySelector('#guide .gtext') || {}).textContent || '', hold: window.__xm.guideHold }));
  expect(got && ht.vis && /洞府只有 3 块地/.test(ht.txt) && /地块比建筑少/.test(ht.txt) && /器炉/.test(ht.txt), '炼气圆满：老祖讲“地块比建筑少”（阻塞讲解）：' + JSON.stringify(ht));
  await page.evaluate(() => { const ok = document.querySelector('#guide [data-g="ok"]'); if (ok) ok.click(); }); await page.waitForTimeout(300);
  expect(await hq(() => window.__xm.st.hintSeen.plots === 1), '讲过一次记下，不再讲');
  await close();
  // 筑基后期、≥ 2 张阵图 → 讲阵法；不到 2 张不讲
  await hLoad({ r: 1, s: 2, i: 7, cave: 2, build: ['field'], unseen: ['zhen'] });
  await page.waitForTimeout(600);
  expect(await hq(() => !window.__xm.guideDbg.cand.includes('zhen') && window.__xm.L.zhenOpen(window.__xm.st) && window.__xm.L.zhenOwnList(window.__xm.st).length === 1), '只有聚灵阵（1 张）：不讲阵法');
  await page.evaluate(() => { window.__xm.st.gear.zhentu.f_shengcai = 1; window.__xm.st.gear.zhentu.f_dujie = 1; });
  const got2 = await hint('zhen'); await shot('h09-hint-zhen');
  const ht2 = await hq(() => (document.querySelector('#guide .gtext') || {}).textContent || '');
  expect(got2 && /换阵法/.test(ht2) && /渡劫阵/.test(ht2) && /3 个周天/.test(ht2), '筑基后期、手里 2 张阵图：老祖讲“换阵法”：' + ht2);
  await page.evaluate(() => { const ok = document.querySelector('#guide [data-g="ok"]'); if (ok) ok.click(); }); await page.waitForTimeout(300);
  await close();
  // 要渡劫了：渡劫阵提醒气泡（每境界一次）；大量炼丹前：丹火阵气泡；新建筑能建：气泡
  await hLoad({ r: 1, s: 3, i: 7, cave: 4, build: ['field', 'furnace'], zhen: ['f_dujie', 'f_danhuo'], herbs: 5000 });
  const tipTick = pre => page.evaluate(async pre => {
    const { st, L } = window.__xm, el = document.querySelector('#tip'), seen = []; el.hidden = true;
    const mo = new MutationObserver(() => seen.push(el.textContent)); mo.observe(el, { childList: true, subtree: true, characterData: true });
    new Function('st', 'L', pre)(st, L); window.__xm.onTick(); await new Promise(f => setTimeout(f, 80)); mo.disconnect();
    return { keys: Object.keys(st.seenTips).filter(k => /^zhen|^bld_/.test(k) && !/^bld_/.test(k)), txt: seen.join(' | '), hid: el.hidden };
  }, pre);
  const tp = await tipTick('st.hintSeen.zhen = 1; st.p.xp = L.pNeed(st.p);');
  expect(tp.keys.includes('zhenDujie1') && !tp.hid, '要渡劫了：气泡提醒换渡劫阵（每境界一次的记号 zhenDujie1）：' + JSON.stringify(tp));
  const tp2 = await tipTick("st.p.xp = 0; st.home.zhen[0].nx = 'f_dujie'; st.home.zhen[0].at = st.tick + 9;");
  expect(tp2.keys.includes('zhenDanhuo1'), '灵草够炼很多炉：气泡提醒换丹火阵（记号 zhenDanhuo1）：' + JSON.stringify(tp2));
  // 同一境界不重复提醒
  const tp3 = await tipTick('');
  expect(!/渡劫阵|丹火阵/.test(tp3.txt) && !tp3.keys.some(k => !tp2.keys.includes(k)), '同一境界提醒过就不再提醒：' + tp3.txt);
  // tut_rebuild：弹出洞府，选中等级最低的建筑、拆除确认条已展开
  await hLoad({ r: 3, i: 13, cave: 6, build: ['field', 'furnace', 'room'] });
  await page.evaluate(() => window.__xm.onTick()); await page.waitForTimeout(500); await close();
  await page.evaluate(() => { const { st, L } = window.__xm; st.home.field = 9; st.home.furnace = 6; st.home.room = 2; L.applyFx(st, { flag: 'tut_rebuild' }); window.__xm.onTick(); }); await page.waitForTimeout(900); await shot('h10-tut-rebuild');
  const tr = await hq(() => ({ sel: (document.querySelector('#modal #homeGrid .hplot.sel') || {}).dataset && document.querySelector('#modal #homeGrid .hplot.sel').dataset.hp, yes: !!document.querySelector('#modal [data-demo-yes="room"]'), txt: (document.querySelector('#modal .quote') || {}).textContent || '', tut: window.__xm.st.home.tut }));
  expect(tr.sel === '3' && tr.yes && /拆了退/.test(tr.txt) && !tr.tut, 'tut_rebuild：打开洞府、选中等级最低的静室、拆除确认条已展开：' + JSON.stringify(tr));
  await close();
  // 旧写法 st.home = {…} 直接赋值（不带 plots）：洞府面板和阵法面板都能打开、不抛错
  const errN = errors.length;
  await page.evaluate(() => { const { st } = window.__xm; st.home = { cave: 5, array: 9, field: 6, furnace: 5 }; window.__xm.showHome(); }); await page.waitForTimeout(350);
  expect(await hq(() => document.querySelectorAll('#modal #homeGrid .hplot').length === 8 && /聚灵阵/.test(document.querySelector('#modal #homeGrid').textContent)), '直接赋值旧式 st.home：洞府面板照样打开（8 格、聚灵阵在）');
  await close();
  await page.evaluate(() => { window.__xm.showZhen(); }); await page.waitForTimeout(300); await close();
  expect(errors.length === errN, '旧式 st.home 打开洞府 / 阵法没有报错：' + errors.slice(errN).join('；'));
  // nohome2：界面里没有新建筑、没有阵法按钮
  await hLoad({ r: 3, i: 13, cave: 4, build: ['field', 'furnace'] });
  await page.evaluate(() => { window.__xm.L.HOME2_ON = false; window.__xm.showHome(false, 3); }); await page.waitForTimeout(350);
  const nh = await hq(() => ({ rows: [...document.querySelectorAll('#modal [data-build]')].map(b => b.dataset.build), txt: document.querySelector('#modal .body').textContent }));
  expect(nh.rows.length === 0 && !/器炉|兽栏|静室|传送阵/.test(nh.txt.replace(/器炉 · 打造/g, '')), 'nohome2：空地建造列表里没有新建筑：' + JSON.stringify(nh.rows));
  await close();
  await page.evaluate(() => { window.__xm.showZhen(); }); await page.waitForTimeout(300);
  expect(await hq(() => !document.querySelector('#modal #zhenSlots')), 'nohome2：阵法面板不开');
  await page.evaluate(() => { window.__xm.L.HOME2_ON = true; }); await close();
  }
  // 人物分页
  for (const t of ['attr', 'bond', 'ach', 'rank']) { await page.evaluate(t => window.__xm.showMe(t), t); await page.waitForTimeout(250); await shot('c07-me-' + t); }
  await close();
  await page.waitForTimeout(3000); await shot('c08-hud');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
