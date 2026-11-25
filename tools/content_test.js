// 内容系统界面测试：奇遇选项、访客、炼丹、首领、会武、宗门任务板、拍卖会、札记、功法（三槽、熟练、共鸣、五行克制、fx.art）、
// 法宝（对比卡与继承、熔炼与锁定、强化与保底、词条效果、fx.ore / fx.plus、器方打造、v4 → v5 迁移）、特训、人物分页、
// 历法与坊市（四季效果、天下大势效果与到期、货架轮换与限购、行情卖价、竞价结果与宿敌加成、坊市事件、年历与大势小牌、v5 → v6 迁移）、
// 灵田与炼丹（田数、作物周期与产出、旺季、全种灵稻与旧被动灵石等价、解锁与灵种、改种、药引丹方的试炼与跨世图鉴、fx.recipe、丹毒的加减与门槛、自动续炼、
// 爆气丹 / 雷火丹的效果与用掉、锦囊里的“服一枚爆气丹：胜算 p → p'”、疗伤丹、药引一包、旧档迁移、老祖的丹毒讲解）、
// 秘境（掉血公式与五行、离开与出局、秘藏、秘境事件与 run_* 标记、送令、迁移、存档续玩）
// 天劫（护劫手段的加成与代价、预掷与结果一致、临场提示八成准、评价 → 道基与“N 品金丹”、失败代价、心魔劫、那一停的界面）、道心（5/12/25 与九条效果、评语）、
// 因果（fx.karma 记当事人、寻仇事件、了结、轮回的业、界面）、迁移补字段
// 宗门加深（任务板四类、宝库轮换、职司五堂、人脉支持与晋升门槛、送礼、40 / 80 的恩惠、徒弟成长 / 差事 / 传授 / 出师 / 候选、性情事件、三人会武、血煞魔宗、长老事件界面、老祖讲解、迁移）
// 界面改版 A / B 线（文件末尾那一大段）：主界面布局（Pixel 7 与 360×640）、人物页 8 分页、访客 / 闭关 / 老祖精灵 / 横幅排队 / 评价印、横屏、问老祖、气泡排队与头像“！”、章末卡、registerGuide、札记新任务、十种场景内对决、阶段四美术接线（锁碎裂 / 声音三态 / 速度档 / 掉落翻牌 / 空状态 / 首领十一种 / 九宗代表 / 魔宗演武场 / 戒指爆光）
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
    st.guide = { step: 99, done: true }; st.hintSeen = {}; for (const k of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life', 'dao1', 'karma1', 'pet1', 'pet2', 'petEvo', 'crops', 'yinGrid', 'toxin']) st.hintSeen[k] = 1;
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
  await page.evaluate(() => { const { st } = window.__xm; for (const h of window.__xm.hints) st.hintSeen[h.id] = 1; const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); });   // 合并后新增的老祖讲解会盖住小牌：一律算看过
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
    return { names: parts.map(x => x[0]).join(','), rate: L.tribRate(st, { pills: 2, aids: { fa: 1, daolv: 1 } }), base: L.REALMS[2].rate, furn: st.home.furnace * L.BT.furnace, top: L.tribTop(st),
      pet0: pet0.ok, pet4, petWhy: pet0.why, zhen0: zhen0.ok, zhenWhy: zhen0.why, pet1: pet1.ok, petD: Math.round((r1 - r0) * 100), rested, petUsed: !!(v && v.aids.pet), restOff: pwRest < 0.999 && !again, cost: L.aidInfo(st, 'fa').cost };
  });
  // 元婴劫起天劫封顶（L.tribTop：L.TRIB.top + 屡败屡战），超出的部分在拆解里单列“天劫难测”
  expect(Math.abs(aid.rate - Math.min(aid.top, aid.base + aid.furn + 0.30 + 0.16)) < 1e-9 && aid.top < 1 && aid.names.includes('祭法宝') && aid.names.includes('道侣护法') && !aid.names.includes('灵宠挡劫') && !aid.names.includes('渡劫阵'),
    `护劫手段：${aid.names} = ${L_pct(aid.rate)}（基础 ${aid.base} + 丹 30% + 法宝 8% + 道侣 8%，封顶 ${L_pct(aid.top)}）`);
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
    await page.evaluate(([id, setup]) => { const { st } = window.__xm; st.exp = null; st.retreat = null; st.hintSeen[id] = 0; st.tick += 3; st.storyQ = []; new Function('st', setup)(st); if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }, [id, setup]);
    await page.waitForTimeout(2200);   // 上一段讲解点完后静 1.2 秒才轮到下一段（guideQuiet）
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
  // ---------- 宗门加深补测（待测清单 1～9 里上面没盖到的）：任务奖励与长老、宝库轮换与 freePick、职司的熔炼 / 拍卖 / 论道 / 坏访客、人脉的“只给一次”与外人、徒弟 fx.disc 七项与出师门槛、单人会武、魔宗入门与负伤、旧档与 busy 存档、转世留名、边界 ----------
  const sx2 = await page.evaluate(() => {
    const { L } = window.__xm;
    const o = {};
    const mk = (sid, rank, r) => { const st = L.newState({ name: '宗门测试' }); st.p.r = r || 4; st.p.s = 2; st.flags.maxR = st.p.r; st.tick = 240; st.pact = 1; st.stones = 1e7; st.herbs = 900; st.ore = 3000; st.treasure = 6; st.pills = 6; st.home = { cave: 4, array: 8, field: 6, furnace: 6 }; st.stats.exp = 20;
      for (let k = 0; k <= 5; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = 3;
      if (sid === 'xuesha') st.eflags.mo_owe = 1; L.joinSect(st, sid); st.sect.rank = rank; st.sect.total = 1e6; st.sect.pts = 1e6; st.storyQ = []; return st; };
    const T = (st, ty) => { const t = { ty, need: 1, prog: 0, taken: 0, done: 0, rw: 50, bonus: { inc: 1 } }; L.TASK_X[ty].init(st, t, 50, st.p.r); st.sect.tasks = [t]; L.taskTake(st, 0); return t; };
    const clone = s => JSON.parse(JSON.stringify(s));
    const noThrow = f => { try { f(); return true; } catch (e) { return String(e && e.stack || e); } };
    let st, t, d;
    // ---- 1 任务板补充：长老 +3、讲法 ×2 与长老、驯兽出战要属性对、禁地寻宝要乙以上
    st = mk('jian', 2); L.petGive(st, { sp: 'p_hu2', src: 'shop' }); L.giveArt(st, 'x_houtu'); st.arts.own.x_houtu = L.artNeed('x_houtu', 3) + 1;
    o.favTask = L.FAV.task === 3;
    t = T(st, 'lecture'); o.lectureX2 = t.rw === 100 && L.taskElder(st, t) === 'lingxu';
    L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.q = [];
    { const fl = L.favor(st, 'lingxu'); for (let i = 0; i < 2; i++) { st.retreat.left--; if (st.retreat.left <= 0) L.endRetreat(st, true); } o.lectureFav = L.favor(st, 'lingxu') === fl + 3 && !!t.fav && t.fav.d === 3; }
    t = T(st, 'tame');
    { const el = t.el;
      const run = ok => { st.exp = null; st.petOut = 0; t.el = ok ? el : (el === 'huo' ? 'shui' : 'huo'); t.prog = 0; t.done = 0; L.rng = () => 0.5; st.bonus.atk = 1e4; L.startExp(st, 0, 0, 0); st.exp.left = 0; const r = L.resolveExp(st); L.rng = Math.random; return t.done === 1; };
      o.tameEl = !!el && run(false) === false && run(true) === true; }
    t = T(st, 'explore'); L.MJ_ON = false; t = T(st, 'explore'); L.MJ_ON = true;
    { const run = (rat) => { st.exp = null; st.petOut = -1; t.prog = 0; t.done = 0; L.rng = () => 0.5; st.bonus.atk = rat ? 1e4 : -0.9; L.startExp(st, t.k, 2, 1); if (!st.exp) return 'noexp'; st.exp.left = 0; const r = L.resolveExp(st); L.rng = Math.random; st.bonus.atk = 0; return [r.rating, t.done]; };
      const lo = run(false), hi = run(true); o.exploreRating = hi[0] >= 2 && hi[1] === 1 && !(lo[0] >= 2 && lo[1] === 0) && (lo[0] < 2 ? lo[1] === 0 : true); }
    // ---- 2 宝库：非 12k 周天不重滚、12k 重滚；freePick 只对功法与法宝免费
    st = mk('jian', 2);
    { const at0 = st.sect.vault.at; st.tick = 251; L.sectTick(st, {}); const same = st.sect.vault.at === at0; st.tick = 252; L.sectTick(st, {}); o.vaultCycle = L.TOUR_EVERY === 12 && same && st.sect.vault.at === 252; }
    st = mk('jian', 2); st.sect.freePick = 3;
    { const cells = L.vaultCells(st), pc = cells.find(c => c.k === 'pill'), ac = cells.find(c => c.k === 'art' && c.ok), gc = cells.find(c => c.k === 'gear' && c.ok);
      const p0 = st.sect.pts; L.vaultRotBuy(st, pc.i); const paid = p0 - st.sect.pts === pc.cost && st.sect.freePick === 3;
      const p1 = st.sect.pts; L.vaultRotBuy(st, ac.i); const free1 = st.sect.pts === p1 && st.sect.freePick === 2;
      const p2 = st.sect.pts; L.vaultRotBuy(st, gc.i); const free2 = st.sect.pts === p2 && st.sect.freePick === 1;
      o.freePick = paid && free1 && free2 && pc.cost > 0; }
    // ---- 3 职司补充：熔炼灵矿 ×1.3、论道 +30%、拍卖 +10%、坏访客只挡一半
    st = mk('dan', 2); L.gearDrop(st, 'w', 3, { base: 'w3_0' }); st.gear.pend = [];
    { const sm = k => { st.sect.duty = k; L.sectTick(st, {}); return L.gearSmeltOre(st.gear.w); }; const a = sm(''), b = sm('qi'); o.dutySmelt = a > 0 && Math.abs(b / a - 1.3) < 1e-9; }
    { L.rollAuction(st); const bp = k => { st.sect.duty = k; return L.bidInfo(st, 0, 0).p; }; const a = bp(''), b = bp('wai'); o.dutyBid = Math.abs((b - a) - 0.1) < 1e-9 && a < 0.89; }
    { const run = k => { const s = clone(st); s.sect.duty = k; L.rng = () => 0.001; s.stones = 0; const r = L.tournament(s); L.rng = Math.random; return { r, stones: s.stones }; };
      const a = run(''), b = run('zhan'); const w = b.r.rounds.filter(x => x.win); o.dutyTour = w.length > 0 && w.every(x => x.zhan) && b.stones > a.stones && a.r.rounds.every(x => !x.zhan); }
    { const pe = L.pickEvent; st.sect.duty = 'fa'; const hits = [0.1, 0.9].map(v => { L.pickEvent = () => L.eventById('re_bandit'); st.visitor = null; L.rng = () => v; return !!L.spawnVisitor(st); }); L.pickEvent = pe; L.rng = Math.random; st.visitor = null; o.dutyFaHalf = hits[0] === false && hits[1] === true; }
    // 职司改过一次到下届会武前不能再改，会武后又能改
    st = mk('dao', 2); st.sect.duty = ''; o.dutyFree = L.setDuty(st, 'qi') && !L.setDuty(st, 'dan') && L.duty(st) === 'qi' && !!L.dutyWhy(st); st.sect.meets++; o.dutyAfterMeet = !L.dutyWhy(st) && L.setDuty(st, 'dan') && L.duty(st) === 'dan';
    st = mk('dao', 1); o.dutyNeedRank = !L.setDuty(st, 'qi') && L.duty(st) === '';
    // ---- 4 人脉补充
    st = mk('jian', 2, 3);
    { const sp = L.givePlan; let n = 0; L.givePlan = function () { n++; return sp.apply(this, arguments); };
      L.addFavor(st, 'liu', 45); const a = n; L.addFavor(st, 'liu', -20); L.addFavor(st, 'liu', 30); L.givePlan = sp; o.f40Once = a === 1 && n === 1 && !!st.gear.zhentu && !!st.gear.zhentu.f_hushan; }
    { const ga = L.giveArt; let n = 0; L.giveArt = function () { n++; return ga.apply(this, arguments); };
      L.addFavor(st, 'tieye', 100); const a = n; L.addFavor(st, 'tieye', -40); L.addFavor(st, 'tieye', 40); L.giveArt = ga; o.f80Once = a === 1 && n === 1; }
    { const a = L.favor(st, 'lingxu'); o.favFloor = (L.addFavor(st, 'lingxu', -999), L.favor(st, 'lingxu')) === 0 && L.addFavor(st, 'lingxu', -5) === 0; L.addFavor(st, 'lingxu', a); }
    o.favForeign = L.addFavor(st, 'yun', 20) === 0 && L.favor(st, 'yun') === null;
    { const before = JSON.stringify(st.sect.fav); L.applyFx(st, { favor: { yun: 9, chisong: 9, nobody: 9 } }); o.favFxForeign = JSON.stringify(st.sect.fav) === before; const x = L.favor(st, 'lingxu'); L.applyFx(st, { favor: { a: 5 } }); o.favFxA = L.favor(st, 'lingxu') === x + 5; }
    { const s0 = L.newState({ name: '无宗' }); o.favNoSect = L.addFavor(s0, 'lingxu', 5) === 0 && L.favor(s0, 'lingxu') === null && noThrow(() => { L.applyFx(s0, { favor: { a: 5, lingxu: 3 } }); L.applyFx(s0, { duty: 'dan' }); L.applyFx(s0, { disc: { grow: 0.1 } }); L.applyFx(s0, { disc: { new: 'strong' } }); L.applyFx(s0, { busy: 2 }); L.discTick(s0, {}); L.sectTick(s0, {}); L.giftInfo(s0, 'lingxu'); }) === true && !s0.sect; }
    { const s1 = mk('jian', 2); L.addFavor(s1, 'tieye', 20); s1.tick = 240; const g = L.giftElder(s1, 'tieye'); const w1 = L.giftInfo(s1, 'tieye').why; s1.tick += 12; const w2 = L.giftInfo(s1, 'tieye').why; o.giftEachTerm = !!g && /已经送过/.test(w1) && w2 === ''; }
    // ---- 5 徒弟：成长公式（灵根 × 传授 × 成长加成 × 性情）、fx.disc 七个字段、名册满、出师门槛
    st = mk('dao', 6, 6); st.p.s = 3; st.dao = { k: 0, w: 0, r: 0 };
    d = L.discTake(st, null, { cat: 'strong', t: 4, tp: 'qin' }); st.storyQ = []; st.disc.q = [];
    d.taught = ['a', 'b']; d.grow = 0.1; o.discRateFull = Math.abs(L.discGrowRate(st, d) - 0.02 * 1.5 * 1.2 * 1.1 * 1.15) < 1e-12;
    d.rest = st.tick + 5; o.discRest = L.discGrowRate(st, d) === 0; d.rest = 0; d.taught = []; d.grow = 0;
    st.disc.focus = d.u;
    { const f = fx => { const out = L.applyFx(st, { disc: fx }); return out; };
      d.grow = 0; f({ grow: 0.05 }); const g = Math.abs(d.grow - 0.05) < 1e-12;
      d.di = 2.5; f({ lv: 2 }); const lv = d.di === 4.5;
      d.heart = 4; f({ heart: 3 }); const h1 = d.heart === 5; f({ heart: -9 }); const h2 = d.heart === 0;
      st.tick = 100; f({ inj: 3 }); const inj = d.rest === 103 && L.discGrowRate(st, d) === 0;
      d.jb = 0; f({ job: 0.1 }); const jb = Math.abs(d.jb - 0.1) < 1e-12;
      o.fxDisc = g && lv && h1 && h2 && inj && jb; }
    { const n0 = st.disc.list.length; st.disc.cand = null; L.applyFx(st, { disc: { new: 'clever' } }); const a = st.disc.list.length === n0 + 1 && st.disc.list[n0].cat === 'clever';
      L.rollCands(st); const want = st.disc.cand[2].n; L.applyFx(st, { disc: { new: 'quiet' } }); const b = st.disc.list.some(x => x.n === want) && st.disc.cand === null;
      o.fxNew = a && b && st.disc.list.length === 3; }
    { const cap = L.discCap(st); st.disc.list.length = 0; st.disc.cand = null; while (st.disc.list.length < cap) L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.q = [];
      const n = st.disc.list.length; const out = L.applyFx(st, { disc: { new: 'strong' } }); o.rosterFull = n === cap && st.disc.list.length === n && out.join('').includes('门下已满') && L.discTake(st, null, {}) === null; }
    // 出师要金丹（小层 ≥ 8）：没到时 fx.out 只算离开，不加桃李、不进 meta.taoli；到了才出师
    { const x = st.disc.list[0], tl = st.meta.taoli.n, gr = L.discGraduated(st); st.disc.focus = x.u; x.di = 7.9;
      o.gradNo = L.discGraduate(st, x.u) === null && !L.discAskGrad(st, x.u);
      L.applyFx(st, { disc: { out: 1 } }); o.outNotGrad = !L.discByU(st, x.u) && L.discGraduated(st) === gr && st.meta.taoli.n === tl;
      const y = st.disc.list[0]; st.disc.focus = y.u; y.di = 8; L.applyFx(st, { disc: { out: 1 } }); o.outGrad = !L.discByU(st, y.u) && L.discGraduated(st) === gr + 1 && st.meta.taoli.n === tl + 1; }
    // “都不收”：清掉候选，名册不变（事件第 4 项）
    st = mk('dao', 4, 4); L.rollCands(st); st.storyQ = []; { const ev = L.eventById('sect_candidates'); L.resolveChoice(st, ev, 3); o.candPass = st.disc.cand === null && st.disc.list.length === 0; }
    st = mk('dao', 4, 4); L.rollCands(st); L.discPass(st); o.candPass2 = st.disc.cand === null && L.discPass(st) === false;
    // 候选只在有空位时送
    st = mk('dao', 4, 4); L.discTake(st, null, { cat: 'quiet' }); L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.candAt = -999; L.discTick(st, {}); o.candFull = L.discFull(st) && st.disc.cand === null;
    st = mk('dao', 0, 4); L.discState(st).candAt = -999; L.discTick(st, {}); o.candNoRank = !L.discOpen(st) && st.disc.cand === null && L.discTake(st, null, {}) === null;
    // ---- 6 三人会武：只有 1 名徒弟、或没到宗主，走原来的单人会武
    st = mk('dao', 6, 7); st.p.s = 2; L.discTake(st, null, { cat: 'strong' }); st.disc.list[0].di = 13; st.storyQ = [];
    { const mt = L.sectMeet(st); o.meetSolo = !L.trioOn(st) && !mt.trio && mt.rounds.length >= 1 && mt.rounds.every(r => !r.trio); }
    st = mk('dao', 5, 6); st.p.s = 2; L.discTake(st, null, { cat: 'strong' }); L.discTake(st, null, { cat: 'quiet' }); st.storyQ = [];
    { const mt = L.sectMeet(st); o.meetNotLord = !L.trioOn(st) && !mt.trio; }
    st = mk('dao', 6, 7); st.p.s = 2; L.discTake(st, null, { cat: 'strong' }); L.discTake(st, null, { cat: 'quiet' }); st.disc.list.forEach(x => { x.di = 13; x.taught = []; }); st.storyQ = [];
    { const rr = [0.001, 0.999]; let wins = 0; for (const v of [0.001, 0.999]) { const s = clone(st); L.rng = () => v; const mt = L.sectMeet(s); L.rng = Math.random; wins += mt.rounds.length && mt.rounds.every(r => r.trio.length === 3 && r.win === (v < 0.5)) ? 1 : 0; }
      o.meetAllOrNone = wins === 2; }
    // ---- 7 魔宗
    st = L.newState({ name: '魔2' }); st.p.r = 2; st.pact = 1; st.origin = 'moyi'; o.moOrigin = L.sectsFor(st).length === 4;
    st = L.newState({ name: '魔3' }); st.p.r = 2; st.pact = 1; st.eflags.mo_owe = 1; o.moOwe = L.joinSect(st, 'xuesha') && st.sect.id === 'xuesha';
    st = L.newState({ name: '正' }); st.p.r = 2; st.pact = 1; o.moHidden = !L.sectsFor(st).some(x => x.id === 'xuesha') && L.sectsFor(st).length === 3 && L.joinSect(st, 'jian') && st.sect.id === 'jian';
    { const a = mk('jian', 3, 7), b = mk('xuesha', 3, 7); const ev = L.eventById('sect_war_xuesha'); const ev2 = L.eventById('sect_alliance');
      const ok = s => !!L.eligible(s, ev, 'home', {}); a.eflags = a.eflags || {}; o.moWar = ok(a) === true && ok(b) === false && L.eligible(a, ev2, 'home', {}) === true && L.eligible(b, ev2, 'home', {}) === false; }
    { const a = mk('jian', 2, 4), b = mk('xuesha', 2, 4); const one = s => { s.p.inj = 4; s.tick = 100; L.sectTick(s, {}); return s.p.inj; }; o.moInj = one(a) === 4 && one(b) === 5; const odd = s => { s.p.inj = 4; s.tick = 101; L.sectTick(s, {}); return s.p.inj; }; o.moInjOdd = odd(b) === 4;
      const ab = mk('jian', 2, 4), bb = mk('xuesha', 2, 4); o.moLeap = Math.abs(L.leapMult(bb) / L.leapMult(ab) - 1.5) < 1e-9;
      o.moKarmaNo = L.karmaTradeWhy(ab) !== '' && L.karmaTrade(ab) === null; }
    // ---- 8 存档：旧档补齐、读两遍一样；讲法 / 传授到一半的 busy 存档读出来能做完；转世后徒弟留名、前世徒弟来访一次
    { const s1 = mk('jian', 2, 4); delete s1.sect.fav; delete s1.sect.vault; delete s1.sect.duty; delete s1.sect.f40; delete s1.sect.f80; delete s1.sect.gift; delete s1.disc; delete s1.meta.taoli;
      const a = L.migrate(clone(s1)), b = L.migrate(clone(a));
      o.migrate2 = L.eldersOf(a).every(x => a.sect.fav[x.id] === L.FAV.start) && a.sect.duty === '' && typeof a.sect.f40 === 'object' && typeof a.sect.gift === 'object' && Array.isArray(a.disc.list) && a.meta.taoli.n === 0 && Array.isArray(a.meta.taoli.list) && JSON.stringify([a.sect, a.disc, a.meta.taoli]) === JSON.stringify([b.sect, b.disc, b.meta.taoli]);
      const s2 = mk('dao', 4, 4); L.discTake(s2, null, { cat: 'quiet' }); const x = s2.disc.list[0]; delete x.ev; delete x.taught; delete x.lp; delete x.jt; x.tp = 'zzz'; x.job = 'zzz';
      const c = L.migrate(clone(s2)).disc.list[0]; o.migrateDiscFields = Array.isArray(c.taught) && typeof c.ev === 'object' && c.lp === 0 && c.tp === 'qin' && c.job === ''; }
    { st = mk('jian', 2, 4); L.giveArt(st, 'x_houtu'); st.arts.own.x_houtu = L.artNeed('x_houtu', 3) + 1; L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.q = [];
      t = T(st, 'lecture'); st.retreat.left = 1; const s = L.migrate(clone(st)); const tot = s.sect.total, lp = s.disc.list[0].lp;
      o.busyLectureSave = s.retreat && s.retreat.kind === 'busy' && s.retreat.what === 'lecture' && (s.retreat.left--, L.endRetreat(s, true), s.sect.tasks[0].done === 1 && s.disc.list[0].lp === lp + 1 && !s.retreat && s.sect.total > tot);
      st = mk('dao', 4, 4); L.giveArt(st, 'x_houtu'); st.arts.own.x_houtu = L.artNeed('x_houtu', 3) + 1; const dd = L.discTake(st, null, { cat: 'quiet' }); st.storyQ = []; st.disc.q = []; L.discTeach(st, dd.u, 'x_houtu');
      const s2 = L.migrate(clone(st)); L.endRetreat(s2, true); o.busyTeachSave = s2.retreat === null && s2.disc.list[0].taught.includes('x_houtu');
      const s3 = L.migrate(clone(st)); L.endRetreat(s3, false); o.busyTeachAbort = s3.disc.list[0].taught.length === 0; }
    { const old = mk('dao', 4, 4); old.p.r = 5; const x = L.discTake(old, null, { cat: 'quiet' }); x.di = 8; L.discGraduate(old, x.u, 'grad_word');
      const meta = clone(old.meta); const ns = L.newState({ name: '新', rebirth: 1, meta, lives: [] }); o.taoliKeep = ns.meta.taoli.n === 1 && ns.meta.taoli.list.length === 1 && ns.meta.taoli.list[0].n === x.n && L.discGraduated(ns) === 0;
      ns.p.r = 3; L.joinSect(ns, 'dan'); const _r0 = L.discOpen(ns); ns.sect.rank = 2; ns.stones = 0; ns.tick = 50; const out = {}; L.discTick(ns, out); const s1 = ns.stones; L.discTick(ns, out); o.taoliVisit = s1 > 0 && ns.stones === s1 && ns.flags.taoliVisit === 1;
      const fresh = L.newState({ name: '头世', meta: clone(old.meta) }); fresh.p.r = 3; L.joinSect(fresh, 'dan'); fresh.stones = 0; L.discTick(fresh, {}); o.taoliVisitNeedRebirth = fresh.stones === 0;
      const same = L.newState({ name: '同世', rebirth: 1, meta: clone(old.meta) }); same.p.r = 3; same.meta.taoli.list[0].life = 1; L.joinSect(same, 'dan'); same.stones = 0; L.discTick(same, {}); o.taoliVisitPast = same.stones === 0; }
    // ---- 9 边界：空名册 / 没入宗的 disc、busy、favor；busy 碰上历练
    { const s0 = mk('dao', 4, 4); s0.disc = null; const out = L.applyFx(s0, { disc: { grow: 0.1 } }); o.emptyRoster = out.join('').includes('不在门下') && noThrow(() => { L.applyFx(s0, { disc: { out: 1 } }); L.applyFx(s0, { disc: { lv: 1, heart: 1, inj: 1, job: 0.1 } }); L.discTick(s0, {}); L.discTop(s0, 2); L.sectMeet(s0); L.discLectured(s0); L.discSetJob(s0, 99, 'exp'); L.discTeach(s0, 99, 'x_houtu'); L.discGraduate(s0, 99); }) === true && L.discSetJob(s0, 99, 'exp') === false; }
    { const s0 = mk('dao', 4, 4); s0.exp = { k: 0, d: 0, a: 0, left: 3, total: 3, plan: {}, chain: 0 }; const out = L.applyFx(s0, { busy: 3 }); o.busyExp = !s0.retreat && !out.join('').includes('占住');
      const s1 = mk('dao', 4, 4); const o1 = L.applyFx(s1, { busy: 3 }); o.busyOk = !!s1.retreat && s1.retreat.kind === 'busy' && s1.retreat.left === 3 && L.gain(s1) === 0 && o1.join('').includes('占住 3 个周天');
      const o2 = L.applyFx(s1, { busy: 2 }); o.busyTwice = s1.retreat.left === 3 && !o2.join('').includes('占住'); }
    return o;
  });
  for (const k in sx2) expect(sx2[k], '宗门补测：' + k);
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
    await page.waitForTimeout(2200);   // 上一段讲解点完后静 1.2 秒才轮到下一段（guideQuiet）
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
    // 恩怨 grudge 随“宿敌与新秀”接入：秘境的 realm_rival 与宿敌那边的 zhao_2 都上线（不再闸着）
    const z2 = L.eventById('zhao_2'), zs = (() => { const r0 = L.rng; L.rng = Math.random; try { return L.newState({ name: '顶罪' }); } finally { L.rng = r0; } })();   // 这里 L.rng 被钉成常数，newState 取名会死循环：临时换回真随机
    zs.p.r = 2; zs.flags.maxR = 2; zs.stats.exp = 5; zs.stats.tour = 1; zs.pact = 1;
    const z2no = L.eligible(zs, z2, 'exp', { bg: 'swords' }); zs.eflags.beat_zhao = 1; const z2yes = L.eligible(zs, z2, 'exp', { bg: 'swords' });
    o.gate = { zhao: L.evLive(z2) && !z2no && z2yes, rival: L.evLive(L.eventById('realm_rival')) };
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
  expect(mj.gate.zhao && mj.gate.rival, `恩怨接入后 zhao_2 上线且只在击败赵乾（beat_zhao）后才出、realm_rival 上线：zhao_2 ${mj.gate.zhao}、realm_rival ${mj.gate.rival}`);
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
  // ---------- 宿敌与新秀（逻辑层）：恩怨上下限与阈值、fx / elig、永久系数封顶、抬价与带头、论道前的对手与论道第一场一致、换战技（五行克制 +11 个百分点）、
  // 法宝克、图鉴、新秀出现 / 追赶 / 打压 / 指点 / 看一眼 / 送礼、norivals2、迁移、来犯前夜（zhao_3、raid_intel、raid_delay）。检查体在 tools/ 外无副本，这里每段 evaluate 自成一体 ----------
  const rvL1 = await page.evaluate(() => {
    const { L } = window.__xm; const o = {};
    const withR = (v, fn) => { const r0 = L.rng; L.rng = typeof v === 'function' ? v : () => v; try { return fn(); } finally { L.rng = r0; } };
    const clone = x => JSON.parse(JSON.stringify(x));
    const mk = (o2) => { const s = L.newState({ name: '宿敌测试' }); s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.stats.tour = 5; s.storyQ = []; s.guide = { step: 99, done: true }; return Object.assign(s, o2 || {}); };
    // 把榜单排成“你在第 rank 名”：榜上 99 个、不含你
    // ---------- 1. 恩怨 ----------
    {
      const s = mk(); const r = () => s.rv2;
      o.gCapHi = L.addGrudge(s, 'mu', 500) === 100 && s.grudge.mu === 100 && L.addGrudge(s, 'mu', 5) === 0;
      o.gCapLo = L.addGrudge(s, 'mu', -1000) === -200 && s.grudge.mu === -100 && L.addGrudge(s, 'mu', -5) === 0;
      const t = mk(); t.grudge.zhao = 40; t.tick = 310;
      L.addGrudge(t, 'zhao', 19); const before = t.rv2.g60.zhao;
      L.addGrudge(t, 'zhao', 1); const at60 = t.rv2.g60.zhao;
      t.tick = 400; L.addGrudge(t, 'zhao', -50); L.addGrudge(t, 'zhao', 50);
      o.g60 = before === undefined && at60 === 310 && t.rv2.g60.zhao === 310 && t.grudge.zhao === 60;   // 59 不记、60 记、第二次跨过不改第一次的周天
      const u = mk(); L.addGrudge(u, 'zhao', -39); const n39 = !!u.eflags.zhao_owes; L.addGrudge(u, 'zhao', -1);
      const v = mk(); L.addGrudge(v, 'mu', -40); const w = mk(); L.addGrudge(w, 'chu', -60);
      o.zhaoOwes = !n39 && u.grudge.zhao === -40 && !!u.eflags.zhao_owes && u.rv2.gLo.zhao === 300 && !v.eflags.zhao_owes && !w.eflags.zhao_owes && v.rv2.gLo.mu === 300;
      // fx.grudge：rk 键作用于池子里恩怨最深的那位
      const p = mk(); p.rv2.pool = [{ id: 'rkA', n: '甲', s: '青玄剑宗', el: 'huo', g: 60 }, { id: 'rkB', n: '乙', s: '赤霄剑宗', el: 'mu', g: 80 }];
      L.applyFx(p, { grudge: { rk: -30 } });
      const g1 = p.rv2.pool.map(x => x.g).join(','); L.applyFx(p, { grudge: { rk: -30 } });
      o.fxRk = g1 === '60,50' && p.rv2.pool.map(x => x.g).join(',') === '30,50';
      const e = mk(); let thrown = false; try { L.applyFx(e, { grudge: { rk: 10 } }); } catch (x) { thrown = true; }
      o.fxRkEmpty = !thrown && !e.rv2.pool.length;
      o.fxRival = (() => { const q = mk(); L.applyFx(q, { grudge: { chu: 30, xue: -10 } }); return q.grudge.chu === 30 && q.grudge.xue === -10; })();
      // elig.grudge 是闭区间
      const ev = L.eventById('rv_ambush_mu'), ev2 = L.eventById('zhao_4'), res = {};
      const q = mk();
      for (const g of [59, 60, 100]) { q.grudge.mu = g; res['a' + g] = L.eligible(q, ev, 'exp', {}); }
      for (const g of [-39, -40, -100]) { q.grudge.zhao = g; res['b' + g] = L.eligible(q, ev2, 'home', { visit: true }); }
      o.eligGrudge = L.evLive(ev) && L.evLive(ev2) && !res.a59 && res.a60 && res.a100 && !res['b-39'] && res['b-40'] && res['b-100'];
      L.RIVALS2_ON = false; q.grudge.mu = 80; const off = L.eligible(q, ev, 'exp', {}); L.RIVALS2_ON = true;
      o.eligOff = !off && L.eligible(q, ev, 'exp', {});
    }
    // ---------- 1b. 永久系数封顶、抬价、带头 ----------
    {
      const x = { n: '甲', id: 'zhao', pw: 1 }; let last = 1;
      for (let i = 0; i < 12; i++) last = L.rivalBoost(mk(), x, 1.05);
      const capped = x.pw, again = L.rivalBoost(mk(), x, 1.05), big = { id: 'mu', n: '乙', pw: 1.2 }, rb = L.rivalBoost(mk(), big, 3);
      o.boostCap = Math.abs(capped - 1.3) < 1e-9 && again === 1 && x.pw === capped && Math.abs(big.pw - 1.3) < 1e-9 && Math.abs(rb - 1.3 / 1.2) < 1e-6 && L.rivalBoost(mk(), { pw: 1 }, 0) === 1 && L.rivalBoost(mk(), null, 2) === 1;
      const s = mk(), comp = id => ({ kind: 'rival', id });
      s.grudge.mu = 59; s.grudge.zhao = 60; s.grudge.chu = -50;
      const b59 = L.rivalBid(s, comp('mu')), b60 = L.rivalBid(s, comp('zhao')), bn = L.rivalBid(s, comp('chu')), bnpc = L.rivalBid(s, { kind: 'npc', id: 'su' });
      s.grudge.mu = 90; const hot = L.rivalBid(s, comp('mu')); s.eflags.mu_clear = 1; const clear = L.rivalBid(s, comp('mu')); delete s.eflags.mu_clear; s.eflags.mu_friend = 1; const fr = L.rivalBid(s, comp('mu'));
      s.grudge.zhao = 90; const zh = L.rivalBid(s, comp('zhao'));   // 和解标记只对慕容
      L.RIVALS2_ON = false; const off = L.rivalBid(s, comp('zhao')); L.RIVALS2_ON = true;
      o.bid = !b59 && !!b60 && b60.m === 1.2 && b60.cut === 0.1 && !bn && !bnpc && !!hot && !clear && !fr && !!zh && !off;
      // 带头：按恩怨降序，m 在 1.1～1.2
      const t = mk(); t.grudge.mu = 70; t.grudge.zhao = 100; t.grudge.chu = 59; t.grudge.xue = 60; t.rv2.pool = [{ id: 'rkA', n: '甲', s: '青玄剑宗', el: 'huo', g: 80 }, { id: 'rkB', n: '乙', s: '赤霄剑宗', el: 'mu', g: 59 }];
      const lead = L.rivalLeads(t);
      o.leads = lead.map(x => x.id).join() === 'zhao,rkA,mu,xue' && lead.every(x => x.m >= 1.1 && x.m <= 1.2) && lead[0].m === 1.2 && lead[3].m === 1.1 && lead[1].rookie === true && lead[0].nine === 'tianjian' && lead[2].nine === '' && lead.every((x, i) => !i || lead[i - 1].g >= x.g);
    }
    return o;
  });
  for (const k in rvL1) expect(rvL1[k], '宿敌与新秀（恩怨、永久系数、抬价与带头）：' + k);
  const rvL2 = await page.evaluate(() => {
    const { L } = window.__xm; const o = {};
    const withR = (v, fn) => { const r0 = L.rng; L.rng = typeof v === 'function' ? v : () => v; try { return fn(); } finally { L.rng = r0; } };
    const mk = (o2) => { const s = L.newState({ name: '宿敌测试' }); s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.stats.tour = 5; s.storyQ = []; s.guide = { step: 99, done: true }; return Object.assign(s, o2 || {}); };
    const arts = (s, ids, eq) => { for (const id of ids) L.giveArt(s, id); for (const id of eq) L.equipArt(s, id); return s; };
    // ---------- 2. 论道前的对手与论道第一场一致 ----------
    {
      // 前方 15 名内有没打赢过的宿敌：赵乾在 45，你在 50
      const cases = [];
      const a = mk({ rank: 50 }); a.beaten.mu = 1; cases.push(['near', a, 'zhao', 45]);
      const b = mk({ rank: 80, pact: -1 }); cases.push(['pact', b, 'mu', 72]);   // 三年之约输了：第一场固定是退婚的那位
      const c = mk({ rank: 1 }); cases.push(['top', c, 'yun', 2]);                // 榜首：打第 2 名
      const d = mk({ rank: 50 }); d.beaten.zhao = 1; d.beaten.mu = 1; const none = L.tourFoe(d);   // 打赢过了：没有宿敌
      const e = mk({ rank: 20, tick: 120 }); e.beaten.mu = 1; cases.push(['chu', e, 'chu', 12]);
      for (const [k, s, id, q] of cases) {
        const tf = L.tourFoe(s);
        const S = L.power(s);
        // 战力 ≥ 宿敌的 1/1.6 才会选他：tourFoe 与 tournament 用同一条线
        const ok0 = !!tf && tf.id === id && tf.q === q && tf.foe.id === id && tf.foe.q === q && tf.Q === L.rivalPower(s, q);
        const res = withR(0.99, () => L.tournament(s));
        const r0 = res.rounds[0];
        o['tourFoe_' + k] = ok0 && r0.q === q && r0.rv && r0.rv.id === id && Math.abs(r0.P - tf.Q) / tf.Q < 1e-9;
      }
      // 约战输了：赵乾排在前方 15 名内更近的位置，第一场也固定是慕容（退婚那位）
      const pz = mk({ rank: 80, pact: -1 }); const zi = pz.ladder.findIndex(x => x.id === 'zhao'); [pz.ladder[zi], pz.ladder[75]] = [pz.ladder[75], pz.ladder[zi]];
      const pzf = L.tourFoe(pz), pzr = withR(0.99, () => L.tournament(pz)).rounds[0];
      o.tourFoePact2 = L.rivalRank(pz, 'zhao') === 76 && pzf.id === 'mu' && pzr.rv.id === 'mu' && pzr.q === pzf.q;
      o.tourFoeNone = none === null;
      o.tourFoeNoPact = mk({ rank: 50, pact: 0 }).pact === 0 && L.tourFoe(mk({ rank: 50, pact: 0 })) === null;
      // 打不过（战力 ≥ 你的 1.6 倍）的宿敌不选：两边都不选他
      const f = mk({ rank: 50 }); f.beaten.mu = 1; L.rivalBoost(f, f.ladder.find(x => x.id === 'zhao'), 1.3); f.tick = 2000;
      const tf = L.tourFoe(f), r = withR(0.99, () => L.tournament(f)).rounds[0];
      o.tourFoeFar = L.rivalPower(f, 45) >= L.power(f) * 1.6 && tf === null && !(r.rv && r.rv.id === 'zhao');
    }
    // ---------- 2b. 换战技：五行克制与法宝 ----------
    {
      // 对慕容（水）：火被水克（×0.87）、木 / 金中性、土克水（×1.15）
      const s = arts(mk({ rank: 80, pact: -1 }), ['z_liehuo', 'z_liuyun', 'z_hanyue', 'z_gengjin'], ['z_liehuo']);
      const tf = L.tourFoe(s), foe = tf.foe;
      const b = L.duelArtBest(s, foe, L.duelPower(s, { kind: 'rival', id: 'mu', el: '' }));
      o.artBest = tf.id === 'mu' && b.id === 'z_hanyue' && b.cur === 'z_liehuo' && !b.same && b.ke === true && b.ke0 === true && b.fe === 'shui' && b.me0 === 'huo' && b.me === 'tu' && b.p1 > b.p0;
      // 中性换克制约 +11 个百分点（0.55 × log2 1.15）：同阶的金（对水中性）→ 土（克水），对手战力调成五五开（对手只给五行，不带法宝）
      const fe = { kind: 'rival', el: 'shui' };
      const n = arts(mk({ rank: 80, pact: -1 }), ['z_gengjin', 'z_hanyue'], ['z_gengjin']);
      const bn = L.duelArtBest(n, fe, L.duelPower(n, fe));
      o.artNeutral = bn.id === 'z_hanyue' && Math.abs(bn.p0 - 0.5) < 1e-6 && Math.abs((bn.p1 - bn.p0) - 0.55 * Math.log2(1.15)) < 0.005 && Math.abs(bn.p1 - bn.p0 - 0.11) < 0.005 && !bn.ke0 && bn.ke;
      o.artSame = L.duelArtBest(arts(mk({ rank: 80, pact: -1 }), ['z_hanyue'], ['z_hanyue']), fe, 1e5).same === true;
      // L.tourSwap：换上最好的（装备生效），再来一次不用换；norivals2 就不换。把慕容的战力调到和你五五开，胜算才不贴着上下限
      const w = arts(mk({ rank: 80, pact: -1 }), ['z_liehuo', 'z_hanyue'], ['z_liehuo']);
      w.tick = Math.round((Math.log(L.power(w)) - L.rivalA(72)) / L.RIVAL_SLOPE);
      const pw = L.tourFoe(w).foe, pBefore = L.duelP(w, L.duelPower(w, pw), L.tourFoe(w).Q, pw);
      L.RIVALS2_ON = false; const off = L.tourSwap(w); const stay = L.artSlots(w)[1] === 'z_liehuo'; L.RIVALS2_ON = true;
      const sw = L.tourSwap(w), again = L.tourSwap(w), pAfter = L.duelP(w, L.duelPower(w, pw), L.tourFoe(w).Q, pw);
      o.tourSwap = pBefore > 0.03 && pBefore < 0.8 && off === null && stay && !!sw && sw.id === 'z_hanyue' && L.artSlots(w)[1] === 'z_hanyue' && Math.abs(sw.p1 - pAfter) < 1e-9 && pAfter - pBefore > 0.15 && again === null && !!sw.tf && sw.tf.id === 'mu';
      const nf = arts(mk({ rank: 50, beaten: { mu: 1, zhao: 1 } }), ['z_liehuo', 'z_hanyue'], ['z_liehuo']);
      o.tourSwapNoFoe = L.tourFoe(nf) === null && L.tourSwap(nf) === null && L.artSlots(nf)[1] === 'z_liehuo';
      // 法宝克：慕容的霜华簪克金，赵乾的镇岳剑克土；克你的攻击属性时他 ×1.1（你这边 ÷1.1）
      const g = arts(mk(), ['z_gengjin', 'z_hanyue', 'z_liehuo'], ['z_gengjin']);
      const mu = { kind: 'rival', id: 'mu' }, zhao = { kind: 'rival', id: 'zhao' };
      const hMuJin = L.rivalGearHit(g, mu);
      const pJin = L.duelPower(g, mu); L.equipArt(g, 'z_liehuo'); const pHuo = L.duelPower(g, mu), hMuHuo = L.rivalGearHit(g, mu);
      L.equipArt(g, 'z_hanyue'); const hZhaoTu = L.rivalGearHit(g, zhao), hMuTu = L.rivalGearHit(g, mu);
      L.RIVALS2_ON = false; const hOff = L.rivalGearHit(g, zhao); L.RIVALS2_ON = true;
      o.gearHit = !!hMuJin && hMuJin.n === '霜华簪' && hMuJin.ke === 'jin' && hMuHuo === null && !!hZhaoTu && hZhaoTu.n === '镇岳剑' && hMuTu === null && hOff === null
        && L.rivalGearHit(g, null) === null && L.rivalGearHit(g, { kind: 'boss', k: 0 }) === null;
      // 金 vs 水中性、火 vs 水被克：金（被法宝克）÷1.1 → 不是土的 1.15，所以算上法宝金比火也只差一点：duelPower(金) × 1.1 ≈ 中性值
      const g2 = arts(mk(), ['z_gengjin'], ['z_gengjin']);   // 金战技：对水中性，撞上慕容的霜华簪（克金）
      const pNeutral = L.duelPower(g2, { kind: 'rival', el: 'shui' }); L.equipArt(g2, 'z_gengjin'); const pJin2 = L.duelPower(g2, mu);
      o.gearMult = Math.abs(pJin2 / pNeutral - 1 / 1.1) < 1e-6 && pJin === pJin2;
    }
    // ---------- 3. 交手知道战技、击败知道法宝 ----------
    {
      const s = mk({ rank: 50 });
      const k0 = L.rivalKnow(s, 'zhao'), list0 = L.rivalKnown(s).map(x => x.id);
      L.revealFoe(s, { kind: 'rival', id: 'zhao' });
      const k1 = L.rivalKnow(s, 'zhao'), l1 = L.rivalKnown(s).find(x => x.id === 'zhao');
      L.markBeat(s, 'zhao');
      const k2 = L.rivalKnow(s, 'zhao'), l2 = L.rivalKnown(s).find(x => x.id === 'zhao');
      o.know = !k0.el && !k0.art && !k0.gear && !list0.includes('zhao') && k1.el && k1.art && !k1.gear && l1.art === 'z_gengjin' && l1.gear === null && l1.el === 'jin'
        && k2.gear && l2.gear && l2.gear.n === '镇岳剑' && l2.gear.ke === 'tu' && !L.rivalKnow(s, 'chu').art && !L.rivalKnown(s).some(x => x.id === 'chu');
      o.beatFlag = s.eflags.beat_zhao === 1 && (L.markBeat(s, 'zhao'), s.eflags.beat_zhao === 1) && s.meta.rival.zhao.gear === 1;
      // 论道里赢下一场：记图鉴、恩怨 +20
      const t = mk({ rank: 50 }); t.beaten.mu = 1; const g0 = t.grudge.zhao;
      const r = withR(0.01, () => L.tournament(t)), rd = r.rounds[0];
      o.tourBeat = rd.win && rd.rv.id === 'zhao' && rd.first === true && t.grudge.zhao === g0 + 20 && rd.grudge === 20 && L.rivalKnow(t, 'zhao').gear && L.rivalKnow(t, 'zhao').art;
      // 三年之约赢了：慕容恩怨 +20、图鉴齐
      const p = mk({ pact: 0, tick: L.PACT_TICK, rank: 100 }); p.p.r = 0; p.p.s = 3; const pr = withR(0.01, () => L.pactDuel(p));
      o.pactBeat = pr.win && p.grudge.mu === 20 && L.rivalKnow(p, 'mu').gear && L.rivalKnow(p, 'mu').art && p.eflags.beat_mu === 1;
    }
    return o;
  });
  for (const k in rvL2) expect(rvL2[k], '宿敌与新秀（论道前的对手、换战技、法宝克、图鉴）：' + k);
  const rvL3 = await page.evaluate(() => {
    const { L } = window.__xm; const o = {};
    const withR = (v, fn) => { const r0 = L.rng; L.rng = typeof v === 'function' ? v : () => v; try { return fn(); } finally { L.rng = r0; } };
    const clone = x => JSON.parse(JSON.stringify(x));
    const mk = (o2) => { const s = L.newState({ name: '新秀测试' }); s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.stats.tour = 5; s.storyQ = []; s.guide = { step: 99, done: true }; return Object.assign(s, o2 || {}); };
    const rkIdx = s => s.ladder.findIndex(x => x.rk);
    // 把时间推到新秀出现：第一次进 rivalTick 排日子（+6 周天），到点出现
    const spawn = (s) => { const log = []; for (let i = 0; i < 8 && !s.rv2.rk; i++) { s.tick++; const out = {}; L.rivalTick(s, out); log.push(out); } return log; };
    // ---------- 4. 新秀 ----------
    {
      const s = mk({ rank: 10 }); s.p.r = 3;
      for (let i = 0; i < 12; i++) { s.tick++; L.rivalTick(s, {}); }
      o.rkNotBefore = !s.rv2.rk && s.rv2.rkN === 0;   // 元婴不出
      const t = mk({ rank: 10 }); let when = -1;
      for (let i = 1; i <= 10 && !t.rv2.rk; i++) { t.tick++; const out = {}; L.rivalTick(t, out); if (t.rv2.rk) when = i; }
      const rk = t.rv2.rk;
      o.rkSpawn = when === 7 && !!rk && rk.id === 'rk1' && rkIdx(t) >= 0 && t.ladder.length === 99 && L.rookieRank(t) === 30 && t.ladder[rkIdx(t)].rk === 'rk1' && t.rv2.rkN === 1 && L.rookie(t) === rk
        && t.storyQ.includes('new_1') && t.ladder.filter(x => x.id).length === 5 && new Set(t.ladder.map(x => x.n)).size === 99 && !t.ladder.some(x => x.n === t.p.name);
      o.rkNew1 = t.storyQ.filter(x => x === 'new_1').length === 1 && L.fill(t, '{rk}') === rk.n;
      // 你在第 81 名以后：新秀出现在第 100 名；榜首：第 21 名
      const b = mk({ rank: 85 }); spawn(b); const top = mk({ rank: 1 }); spawn(top);
      o.rkEdge = L.rookieRank(b) === 100 && b.ladder.length === 99 && L.rookieRank(top) === 21 && top.ladder.length === 99;
      // 每届论道追 8 名：你第 10、他第 30：22 → 14（离你只差 4 名，上门下战书 new_2）→ 追到你身后
      const c = mk({ rank: 10 }); spawn(c); c.storyQ = [];
      const q0 = L.rookieRank(c), t1 = L.rookieTour(c, 5e4), q1 = L.rookieRank(c);
      const hasN2 = c.storyQ.includes('new_2');
      const t2 = L.rookieTour(c, 5e4), q2 = L.rookieRank(c);
      const t3 = L.rookieTour(c, 5e4), q3 = L.rookieRank(c);
      o.rkClimb = q0 === 30 && q1 === 22 && t1.up === 8 && t1.gap === 12 && !hasN2 && q2 === 14 && t2.near === true && c.storyQ.includes('new_2') && q3 === 11 && t3.due === true && c.rv2.rk.due === 1 && c.ladder.length === 99
        && c.storyQ.filter(x => x === 'new_2').length === 1;
      // 追到离你 5 名以内才上门下战书（差 6 名不算）
      const nb = rank => { const x = mk({ rank: 10 }); spawn(x); x.rank = rank; x.storyQ = []; const r = L.rookieTour(x, 5e4); return [r.gap, !!r.near, x.storyQ.includes('new_2')]; };
      o.rkNear = nb(17).join() === '5,true,true' && nb(16).join() === '6,false,false';
      // 到你身后时 out.rookie 出现；秘境（st.run）、历练、闭关中途不弹，等回来再弹
      const d = mk({ rank: 5 }); spawn(d); for (let i = 0; i < 3; i++) L.rookieTour(d, 5e4);
      const prev = d.tick; const res = {};
      for (const [k, f] of [['run', () => { d.run = {}; }], ['exp', () => { d.exp = {}; }], ['retreat', () => { d.retreat = {}; }]]) { f(); const out = {}; d.tick++; L.rivalTick(d, out); res[k] = !!out.rookie; d.run = null; d.exp = null; d.retreat = null; }
      const outOk = {}; d.tick++; L.rivalTick(d, outOk);
      o.rkDue = d.rv2.rk.due === 1 && !res.run && !res.exp && !res.retreat && outOk.rookie === true;
      // 拿论道带的：每届追一次、参照战力记下你的战力
      const e = mk({ rank: 40 }); spawn(e); const jr = L.rookieRank(e); const tr = withR(0.99, () => L.tournament(e));
      o.rkViaTour = !!tr.rookie && tr.rookie.n === e.rv2.rk.n && tr.rookie.up === 8 && L.rookieRank(e) === jr - 8 && e.rv2.refP === tr.S && e.rv2.rk.climbs === 1;
      // 新秀不参与论道前的榜单浮动：把八次交换全对准他和他的邻居，他的位置只由“追 8 名”决定
      const f = mk({ rank: 40 }); spawn(f); const j0 = rkIdx(f); const seq = []; for (let i = 0; i < 8; i++) seq.push(((i % 2 ? j0 : j0 - 1) + 0.5) / 98);
      let k = 0; const trf = withR(() => (k < 8 ? seq[k++] : 0.99), () => L.tournament(f));
      o.rkNoDrift = k >= 8 && rkIdx(f) === j0 - 8 && trf.rookie.up === 8;
      // 战力：参照战力 × 追了几届，一直是个真威胁
      const g = mk({ rank: 40 }); spawn(g); g.rv2.refP = 1e6; const p0 = L.rookiePower(g); g.rv2.rk.climbs = 3; const p3 = L.rookiePower(g);
      o.rkPower = p0 >= 0.45 * 1e6 - 1 && p3 >= g.rv2.rk.f * 1e6 - 1 && p3 > p0 && L.rivalPower(g, L.rookieRank(g)) === p3;
    }
    return o;
  });
  for (const k in rvL3) expect(rvL3[k], '宿敌与新秀（新秀的出现与追赶）：' + k);
  const rvL4 = await page.evaluate(() => {
    const { L } = window.__xm; const o = {};
    const withR = (v, fn) => { const r0 = L.rng; L.rng = typeof v === 'function' ? v : () => v; try { return fn(); } finally { L.rng = r0; } };
    const clone = x => JSON.parse(JSON.stringify(x));
    const mk = (o2) => { const s = L.newState({ name: '新秀测试' }); s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.stats.tour = 5; s.storyQ = []; s.guide = { step: 99, done: true }; return Object.assign(s, o2 || {}); };
    const spawn = (s) => { for (let i = 0; i < 8 && !s.rv2.rk; i++) { s.tick++; L.rivalTick(s, {}); } return s.rv2.rk; };
    // 追到你身后、手里有一把带词条的兵器，新秀法宝上的词条由 aff 指定
    const due = (aff, mine) => {
      const s = mk({ rank: 10 }); s.gear = L.newGear(); L.gearDrop(s, 'w', 4, { base: 'w4_1' }); s.gear.w.aff = (mine || []).slice();
      spawn(s); for (let i = 0; i < 3; i++) L.rookieTour(s, 5e4);
      s.rv2.rk.gear.aff = aff; s.storyQ = []; return s;
    };
    // ---------- 打压：赢 ----------
    {
      const s = due('fengrui', ['ke_mu']), rk = s.rv2.rk, name = rk.n, id = rk.id, rank0 = s.rank, ore0 = s.ore || 0;
      const res = L.rookieResolve(s, 'crush', true), w = L.gearEq(s, 'w');
      o.crushWin = res.win && res.aff === 'fengrui' && w.aff.join() === 'ke_mu,fengrui' && s.rv2.rk === null && s.rv2.pool.length === 1 && s.rv2.pool[0].id === id && s.rv2.pool[0].g === 60 && s.rv2.pool[0].n === name
        && s.rank === rank0 && !s.ladder.some(x => x.rk) && s.ladder.some(x => x.n === name) && s.storyQ.includes('new_3') && s.rv2.crush === 1 && (s.ore || 0) === ore0 && s.rv2.rkNext >= s.tick + L.ROOKIE.after;
      o.crushPool = L.grudge(s, id) === 60 && L.rivalLeads(s).some(x => x.id === id && x.rookie) && L.addGrudge(s, id, -30) === -30 && L.grudge(s, id) === 30 && L.rivalLeads(s).every(x => x.id !== id) && s.ladder.length === 99;
      // 兵器满三条：改给灵矿；克 X 冲突：改给灵矿；已经有这条：改给灵矿
      for (const [k, aff, mine] of [['full', 'fengrui', ['ke_mu', 'zhongji', 'fengrui2']], ['conf', 'ke_tu', ['ke_mu']], ['dup', 'fengrui', ['fengrui']]]) {
        const q = due(aff, mine.map(x => (L.AFFIX[x] ? x : 'zhongji'))), ore = q.ore || 0, before = q.gear.w.aff.slice();
        const r = L.rookieResolve(q, 'crush', true);
        o['crushOre_' + k] = r.aff === '' && r.ore > 0 && q.ore === ore + r.ore && q.gear.w.aff.join() === before.join() && /熔了得灵矿/.test(r.text);
      }
      // 没有兵器也不报错，改给灵矿
      const n = due('fengrui', []); n.gear.w = null; const nr = (() => { try { return L.rookieResolve(n, 'crush', true); } catch (e) { return { err: e.message }; } })();
      o.crushNoWeapon = !nr.err && nr.aff === '' && nr.ore > 0;
    }
    // ---------- 打压：输 ----------
    {
      const s = due('fengrui'), rk = s.rv2.rk, name = rk.n, rank0 = s.rank; s.p.inj = 0;
      const res = L.rookieResolve(s, 'crush', false), i = s.ladder.findIndex(x => x.n === name);
      o.crushLose = !res.win && s.rank === rank0 + 1 && L.rivalAt(s, rank0) && L.rivalAt(s, rank0).n === name && i === rank0 - 1 && s.p.inj >= 2 && s.rv2.rk === null && s.rv2.lost === 1 && !s.rv2.pool.length && s.ladder.length === 99 && !s.ladder.some(x => x.rk) && !s.storyQ.includes('new_3');
      // 榜上第 100 名时输了：名次不超过 100
      const t = due('fengrui'); t.rank = 100; t.ladder.splice(t.rank - 1, 0, t.ladder.pop()); const r2 = L.rookieResolve(t, 'crush', false);
      o.crushLoseCap = t.rank === 100 && r2 && t.ladder.length === 99;
    }
    // ---------- 指点 ----------
    {
      const s = due('fengrui'), rk = s.rv2.rk, name = rk.n, t0 = s.tick;
      const res = L.rookieResolve(s, 'teach');
      o.teach = res.how === 'teach' && s.rv2.friends.length === 1 && s.rv2.friends[0].n === name && s.rv2.friends[0].at === t0 && s.eflags.rookie_taught === 1 && s.rv2.trouble === t0 + 24 && s.rv2.rk === null && s.rv2.teach === 1 && !s.rv2.pool.length && s.rank === 10 && !s.ladder.some(x => x.rk);
      // 24 周天后闯祸（new_4）：之前没有
      let early = false; for (let i = 0; i < 23; i++) { s.tick++; L.rivalTick(s, {}); if (s.storyQ.includes('new_4')) early = true; }
      s.tick++; L.rivalTick(s, {});
      o.teachTrouble = !early && s.storyQ.includes('new_4') && s.rv2.trouble === null;
      // 送礼：每 24 周天（t % 24 = 3）、满 24 周天后、15%：rng 0 就送，0.99 不送
      const g = due('fengrui'); L.rookieResolve(g, 'teach'); g.tick = 24 * 20 + 3; g.rv2.friends[0].at = g.tick - 24;
      const no = {}; g.stones = 0; withR(0.99, () => L.rivalTick(g, no));
      const yes = {}; withR(0.0, () => L.rivalTick(g, yes));
      const fresh = due('fengrui'); L.rookieResolve(fresh, 'teach'); fresh.tick = 24 * 21 + 3; fresh.rv2.friends[0].at = fresh.tick - 5; const young = {}; withR(0.0, () => L.rivalTick(fresh, young));
      const wrongTick = due('fengrui'); L.rookieResolve(wrongTick, 'teach'); wrongTick.tick = 24 * 22 + 4; wrongTick.rv2.friends[0].at = 0; const wt = {}; withR(0.0, () => L.rivalTick(wrongTick, wt));
      o.teachGift = !no.rkGift && !!yes.rkGift && yes.rkGift.length === 1 && g.rv2.gifts === 1 && g.rv2.friends[0].gifts === 1 && !young.rkGift && !wt.rkGift;
      // 朋友最多记 4 位，满了挤掉最早的
      const h = mk({ rank: 10 }); for (let i = 0; i < 6; i++) { h.ladder.splice(0, 1); h.rv2.rk = null; h.rv2.rkN = i; spawn(h); L.rookieResolve(h, 'teach'); h.rv2.rkNext = 0; }
      o.teachMax = h.rv2.friends.length === L.ROOKIE.friendsMax;
    }
    // ---------- 看一眼：五行显形 ----------
    {
      const s = due('fengrui'), rk = s.rv2.rk;
      const k0 = L.foeElKnown(s, L.rookieFoe(s)); const ev = L.eventById('new_1');
      L.resolveChoice(s, ev, 1);
      const k1 = L.foeElKnown(s, L.rookieFoe(s));
      o.rkSeen = !k0 && k1 && rk.known === 1 && !s.eflags.rookie_seen;
      const t = due('fengrui'); L.revealFoe(t, L.rookieFoe(t));   // 交过手也知道
      o.rkRevealFight = L.foeElKnown(t, L.rookieFoe(t)) === true;
      // 打压的对决：L.rookieDuel 一场定胜负，进池子 / 挤到前面二选一；对手战力 = L.rookiePower
      const d = due('fengrui'), I = L.rookieInfo(d), rank0 = d.rank;
      o.rkInfo = I.q === rank0 + 1 && I.gap === 1 && I.Q === L.rookiePower(d) && I.p > 0 && I.p < 1 && I.known === false;
      const win = withR(0.0, () => L.rookieDuel(d));
      const e = due('fengrui'); e.p.inj = 0; const lose = withR(0.999999, () => L.rookieDuel(e));
      o.rkDuel = win.win === true && d.rv2.pool.length === 1 && !!win.text && lose.win === false && e.rank === rank0 + 1 && L.rookie(e) === null && L.foeElKnown(d, { kind: 'rookie' }) === false;
    }
    // ---------- norivals2：没有新秀、不抬价、不带头 ----------
    {
      L.RIVALS2_ON = false;
      try {
        const s = mk({ rank: 10 }); s.grudge.zhao = 90; s.grudge.mu = 80; s.eflags.zhao_owes = 1;
        for (let i = 0; i < 30; i++) { s.tick++; L.rivalTick(s, {}); }
        o.off = !s.rv2.rk && s.rv2.rkN === 0 && !s.ladder.some(x => x.rk) && L.rivalBid(s, { kind: 'rival', id: 'zhao' }) === null && L.rivalLeads(s).length === 0 && L.rookie(s) === null && !L.eligible(s, L.eventById('rv_ambush_zhao'), 'exp', {})
          && L.rivalGearHit(s, { kind: 'rival', id: 'mu' }) === null && L.tourSwap(s) === null;
        const q = mk({ rank: 10 }); q.rv2.refP = 0; const x = q.ladder.find(y => y.id === 'zhao'); q.tick = 18; withR(0, () => { for (let i = 0; i < 12; i++) { q.tick++; L.rivalTick(q, {}); } });
        o.offQy = (x.pw || 1) === 1 && q.rv2.qy === 0;
      } finally { L.RIVALS2_ON = true; }
      // 打开：宿敌的奇遇（t%12 = 6、12%）×1.05；没打赢过的才有
      const q = mk({ rank: 10 }); const x = q.ladder.find(y => y.id === 'zhao'); const y = q.ladder.find(y => y.id === 'chu'); q.beaten.chu = 1; q.tick = 17;
      withR(0.0, () => { q.tick++; L.rivalTick(q, {}); });
      o.qy = Math.abs(x.pw - 1.05) < 1e-9 && (y.pw || 1) === 1 && q.rv2.qy >= 1 && q.tick % 12 === 6;
    }
    return o;
  });
  for (const k in rvL4) expect(rvL4[k], '宿敌与新秀（新秀的结局、指点、看一眼、norivals2、宿敌奇遇）：' + k);
  const rvL5 = await page.evaluate(() => {
    const { L } = window.__xm; const o = {};
    const clone = x => JSON.parse(JSON.stringify(x));
    const mk = (o2) => { const s = L.newState({ name: '迁移测试' }); s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.storyQ = []; s.guide = { step: 99, done: true }; return Object.assign(s, o2 || {}); };
    // ---------- 5. 迁移 ----------
    {
      // 旧档：没有 grudge / rv2 / meta.rival
      const old = clone(mk({ rank: 50 })); delete old.grudge; delete old.rv2; delete old.meta.rival;
      const m1 = L.migrateRivals(old) || old;
      o.migEmpty = ['mu', 'zhao', 'chu', 'xue', 'yun'].every(id => old.grudge[id] === 0) && !!old.rv2 && old.rv2.rk === null && Array.isArray(old.rv2.pool) && Array.isArray(old.rv2.friends) && typeof old.rv2.g60 === 'object' && old.rv2.rkN === 0 && !!old.meta.rival && typeof old.meta.rival === 'object';
      // 秘境里先存下的恩怨（0～100）保留；越界的夹回来；不是数的清成 0
      const r = clone(mk()); r.grudge = { mu: 35, zhao: 100, chu: 250, xue: 'x', yun: -400 }; delete r.rv2; L.migrateRivals(r);
      o.migGrudge = r.grudge.mu === 35 && r.grudge.zhao === 100 && r.grudge.chu === 100 && r.grudge.xue === 0 && r.grudge.yun === -100;
      // 已击败 → 图鉴补记战技与法宝；只交过手（meta.elem）→ 只补战技；已有的不丢
      const k = clone(mk()); k.beaten = { zhao: 2, mu: 1 }; k.meta.elem = { rv_chu: 1 }; k.meta.rival = { xue: { art: 1 } }; L.migrateRivals(k);
      const mr = k.meta.rival;
      o.migKnow = mr.zhao.art === 1 && mr.zhao.gear === 1 && mr.mu.gear === 1 && mr.chu.art === 1 && !mr.chu.gear && mr.xue.art === 1 && !mr.yun;
      // pw > 1.3 压回 1.3；没有 pw 的不动
      const p = clone(mk()); p.ladder.find(x => x.id === 'zhao').pw = 1.62; p.ladder.find(x => x.id === 'chu').pw = 1.12; L.migrateRivals(p);
      o.migPw = p.ladder.find(x => x.id === 'zhao').pw === 1.3 && p.ladder.find(x => x.id === 'chu').pw === 1.12 && p.ladder.find(x => x.id === 'mu').pw === undefined;
      // 榜上孤立的 rk 标记清掉；他还在的保留；rv2.rk 在榜上找不着：作罢
      const q = mk({ rank: 10 }); for (let i = 0; i < 8 && !q.rv2.rk; i++) { q.tick++; L.rivalTick(q, {}); }
      const s = clone(q); s.ladder[3].rk = 'rk9'; s.ladder[4].rk = 'rk7'; L.migrateRivals(s);
      o.migRk = s.ladder.filter(x => x.rk).length === 1 && s.ladder.filter(x => x.rk === 'rk1').length === 1 && !!s.rv2.rk && s.rv2.rk.id === 'rk1' && s.ladder[3].rk === undefined;
      const t = clone(q); const idx = t.ladder.findIndex(x => x.rk); delete t.ladder[idx].rk; L.migrateRivals(t);
      o.migRkLost = t.rv2.rk === null && !t.ladder.some(x => x.rk);
      const u = clone(q); u.rv2.pool = [{ id: 'a', n: '甲', s: 'x', g: 400 }, null, { id: 'b' }, { id: 'c', n: '丙', s: 'y', g: 'abc' }]; L.migrateRivals(u);
      o.migPool = u.rv2.pool.length === 2 && u.rv2.pool[0].g === 100 && u.rv2.pool[1].g === 0;
      // 迁移两遍结果一致；走完整的 L.migrate 也一样（读档路径）
      const a = clone(old), b = clone(old); L.migrateRivals(a); L.migrateRivals(b); L.migrateRivals(b);
      o.migTwice = JSON.stringify(a) === JSON.stringify(b);
      const full = clone(mk({ rank: 30 })); delete full.grudge; delete full.rv2; full.ladder.find(x => x.id === 'xue').pw = 2; const f1 = L.migrate(clone(full)), f2 = L.migrate(clone(f1));
      o.migLoad = !!f1 && f1.grudge.mu === 0 && !!f1.rv2 && f1.ladder.find(x => x.id === 'xue').pw === 1.3 && JSON.stringify(f1.grudge) === JSON.stringify(f2.grudge) && JSON.stringify(f1.rv2) === JSON.stringify(f2.rv2) && JSON.stringify(f1.meta.rival) === JSON.stringify(f2.meta.rival);
    }
    // ---------- 6. 来犯前夜 ----------
    {
      const sect = (rank, r) => { const s = mk({ rank: 20 }); s.p.r = r; s.flags.maxR = r; L.joinSect(s, 'dao'); s.sect.rank = rank; return s; };
      // 宗门身份 ≥ 2 且到炼虚：来犯排到 6 周天后，并触发 zhao_3（需要 zhao_owes）
      const s = sect(2, 5); s.eflags.zhao_owes = 1; s.storyQ = []; s.tick = 400; delete s.flags.war; L.rivalTick(s, {});
      o.eve = s.flags.warEve === 400 && s.flags.war === 406 && s.storyQ.includes('zhao_3');
      const s2 = sect(2, 5); s2.tick = 400; delete s2.flags.war; s2.storyQ = []; L.rivalTick(s2, {});
      o.eveNoOwes = s2.flags.war === 406 && !s2.storyQ.includes('zhao_3');
      const s3 = sect(1, 5); L.rivalTick(s3, {}); const s4 = sect(2, 4); L.rivalTick(s4, {}); const s5 = sect(2, 5); s5.flags.warWon = 1; L.rivalTick(s5, {});
      o.eveGate = !s3.flags.warEve && !s4.flags.warEve && !s5.flags.warEve;
      const s6 = sect(2, 5); s6.tick = 400; s6.flags.war = 500; L.rivalTick(s6, {});   // 已经排了更晚的日子：不提前
      o.eveKeep = s6.flags.warEve === 400 && s6.flags.war === 500;
      s.tick = 401; s.storyQ = []; L.rivalTick(s, {}); o.eveOnce = s.flags.war === 406 && !s.storyQ.includes('zhao_3');
      // raid_delay 推迟 24 周天（只一次，用掉就清）
      const d = sect(2, 5); d.tick = 410; d.flags.warEve = 1; d.flags.war = 410; d.eflags.raid_delay = 1; L.rivalTick(d, {});
      const d1 = d.flags.war; L.rivalTick(d, {});
      o.delay = d1 === 434 && d.flags.war === 434 && !d.eflags.raid_delay;
      const dw = sect(2, 5); dw.flags.warEve = 1; dw.flags.warWon = 1; dw.flags.war = 410; dw.eflags.raid_delay = 1; L.rivalTick(dw, {});
      o.delayWon = dw.flags.war === 410 && !dw.eflags.raid_delay;
      // raid_intel：天剑宗来犯战力 ×1.3，打完清掉（不论胜负）；别的对决不吃
      const w = sect(2, 5), war = { kind: 'war', id: 'tianjian' };
      const base = L.duelPower(w, war); w.eflags.raid_intel = 1; const boosted = L.duelPower(w, war), other = L.duelPower(w, { kind: 'boss', k: 0 });
      delete w.eflags.raid_intel; const other0 = L.duelPower(w, { kind: 'boss', k: 0 }); w.eflags.raid_intel = 1;
      const rs = L.sectWar(w);
      o.intel = Math.abs(boosted / base - 1.3) < 1e-9 && other === other0 && !w.eflags.raid_intel && rs.S > 0;
      const wl = sect(2, 5); wl.eflags.raid_intel = 1; const rl = (() => { const r0 = L.rng; L.rng = () => 0.9999; try { return L.sectWar(wl); } finally { L.rng = r0; } })();
      o.intelLose = !rl.win && !wl.eflags.raid_intel;
      // 恩怨 ≥ 60 的赵乾带头：来敌战力 ×1.1～1.2
      const wz = sect(2, 5); wz.grudge.zhao = 100; const lz = L.sectWar(wz), wn = sect(2, 5), ln = L.sectWar(wn);
      o.leadWar = !!lz.lead && lz.lead.id === 'zhao' && Math.abs(lz.Q / ln.Q - 1.2) < 1e-9 && !ln.lead;
    }
    return o;
  });
  for (const k in rvL5) expect(rvL5[k], '宿敌与新秀（迁移与来犯前夜）：' + k);
  {   // 块作用域：下面的局部名不和前文的变量冲突
  // ---------- 宿敌与新秀（界面）：论道前的对决准备页（有 / 没有【换上】、法宝未知时不点名）、换上后重新渲染、新秀挑战（指点 / 打压 / 胜负）、
  // 天骄榜的宿敌行与宿敌卡（未知 / 已知）、伏击对决的半身像、老祖三次讲解（数字与逻辑层一致）、norivals2 ----------
  // 造一个局面载入：kind = prep 慕容（约战输了）/ prepZhao 赵乾 / none 没有宿敌可打 / rookie 新秀追到身后 / list 榜上有新秀 / ambush 赵乾恩怨 80
  const rvBuild = kind => page.evaluate(kind => {
    const { L } = window.__xm;
    const m0 = document.getElementById('modal'); m0.hidden = true; m0.innerHTML = '';   // 上一页关掉后弹窗里的旧节点还在（#rvSwap 会让 rvKezhi 的 when 继续为真）：清干净
    const s = L.newState({ name: '论道客' });
    s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; s.flags.maxI = 12; s.pact = 1; s.tick = 300; s.stats.tour = 5; s.stats.exp = 20; s.storyQ = []; s.guide = { step: 99, done: true };
    s.hintSeen = {}; for (const k of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life', 'dao1', 'karma1', 'pet1', 'pet2', 'petEvo', 'crops', 'yinGrid', 'toxin', 'art1', 'art2', 'zhanji', 'mishu', 'ke', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge', 'cal', 'world1', 'shelf', 'sell', 'auction', 'gearCmp']) s.hintSeen[k] = 1;
    for (const h of window.__xm.hints) if (!/^rv/.test(h.id)) s.hintSeen[h.id] = 1;   // 别的线新增的讲解一律算看过，免得抢在宿敌的讲解前面
    s.home = { cave: 6, array: 8, field: 6, furnace: 6 };
    const arts = (own, eq) => { for (const id of own) L.giveArt(s, id); for (const id of eq) L.equipArt(s, id); };
    // 把对手战力调到和你五五开：tick 只影响宿敌（榜上曲线）
    const tune = q => { s.tick = Math.round((Math.log(L.power(s)) - L.rivalA(q)) / L.RIVAL_SLOPE); };
    if (kind === 'prep') { s.rank = 80; s.pact = -1; arts(['z_liehuo', 'z_hanyue'], ['z_liehuo']); tune(72); }
    else if (kind === 'prepZhao') { s.rank = 50; s.beaten.mu = 1; arts(['z_liehuo', 'z_hanyue'], ['z_hanyue']); tune(45); }
    else if (kind === 'none') { s.rank = 50; s.beaten = { mu: 1, zhao: 1, chu: 1, xue: 1, yun: 1 }; arts(['z_liehuo', 'z_hanyue'], ['z_liehuo']); }
    else if (kind === 'rookie' || kind === 'list') {
      s.rank = 10; arts(['z_liehuo', 'z_hanyue'], ['z_liehuo']); s.gear = L.newGear(); L.gearDrop(s, 'w', 4, { base: 'w4_1' });
      tune(10);   // 榜上第 10 名的战力和你差不多，新秀（第 11 名）才是个真对手
      for (let i = 0; i < 8 && !s.rv2.rk; i++) { s.tick++; L.rivalTick(s, {}); }
      if (kind === 'rookie') { for (let i = 0; i < 3; i++) L.rookieTour(s, L.power(s)); s.rv2.rk.el = 'shui'; s.rv2.rk.known = 1; }
      s.storyQ = [];
    } else if (kind === 'ambush') { s.rank = 30; s.grudge.zhao = 80; arts(['z_liehuo', 'z_hanyue'], ['z_hanyue']); }
    window.__xm.loadState(JSON.parse(JSON.stringify(s)));
    window.__xm.setSpeed(3);
    return { kind };
  }, kind);
  const mtitle = () => page.evaluate(() => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent : ''; });
  const mtext = () => page.evaluate(() => { const m = document.querySelector('#modal:not([hidden]) .sheet'); return m ? m.textContent : ''; });
  const feet = () => page.evaluate(() => [...document.querySelectorAll('#modal:not([hidden]) .foot .btn')].map(b => b.textContent.trim()));
  const clickFoot = async i => { await page.evaluate(i => { const b = document.querySelectorAll('#modal:not([hidden]) .foot .btn'); b[i < 0 ? b.length - 1 : i].click(); }, i); await page.waitForTimeout(350); };
  const forceR = v => page.evaluate(v => { window.__xm.L.rng0 = window.__xm.L.rng0 || window.__xm.L.rng; window.__xm.L.rng = () => v; }, v);
  const unforceR = () => page.evaluate(() => { const L = window.__xm.L; if (L.rng0) { L.rng = L.rng0; L.rng0 = null; } });
  const zPage = async () => { const sw = await page.$('#modal #rvSwap [data-zswap], #modal #rkSwap [data-zswap]'); return sw; };
  // —— 论道前：慕容，有【换上】（火被水克 → 土）
  await rvBuild('prep');
  const pp0 = await page.evaluate(() => { const { st, L } = window.__xm; const tf = L.tourFoe(st), b = L.duelArtBest(st, tf.foe, tf.Q); return { id: tf.id, p0: L.pct(b.p0), p1: L.pct(b.p1), to: b.id, n: st.stats.tour }; });
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(400); await shot('rv01-prep-swap');
  const t1 = await mtitle(), x1 = await mtext(), f1 = await feet();
  expect(pp0.id === 'mu' && t1 === '论道 · 对决准备' && f1.length === 1 && f1[0] === '登台', '论道前先弹对决准备页，只有一个【登台】：' + JSON.stringify([t1, f1]));
  expect(!!(await page.$('#modal #rvSwap')) && x1.includes(`胜算 ${pp0.p0} → ${pp0.p1}`) && x1.includes('撼岳拳'), '准备页有【换上】一行，胜算 p → p\' 与逻辑层一致：' + pp0.p0 + ' → ' + pp0.p1);
  expect(!x1.includes('霜华簪') && !x1.includes('克金'), '慕容的法宝没见过：准备页不点出法宝名');
  await (await zPage()).click(); await page.waitForTimeout(400); await shot('rv02-prep-swapped');
  const x2 = await mtext();
  expect(await page.evaluate(() => window.__xm.L.artSlots(window.__xm.st)[1]) === 'z_hanyue' && !(await page.$('#modal #rvSwap')) && (await mtitle()) === '论道 · 对决准备' && x2.includes('你的战技正克他'), '点【换上】后装上了克他的战技、准备页重新渲染（换上那一行没了）');
  await clickFoot(0); await page.waitForTimeout(300);
  const t3 = await mtitle(), x3 = await mtext();
  expect(/^第\d+届 天骄论道$/.test(t3) && x3.includes('天下天骄齐聚论道台'), '点【登台】进入论道：' + t3);
  expect(await page.evaluate(n => window.__xm.st.stats.tour === n + 1, pp0.n), '登台才开打：论道届数 +1');
  await clickFoot(0);   // 登台！
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  await close();
  // —— 论道前：赵乾，法宝没见过 / 见过
  for (const known of [false, true]) {
    await rvBuild('prepZhao');
    if (known) await page.evaluate(() => { const { st } = window.__xm; st.meta.rival.zhao = { art: 1, gear: 1 }; st.meta.elem.rv_zhao = 1; });
    await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(400); await shot('rv03-prepZhao-' + (known ? 'known' : 'unknown'));
    const x = await mtext(), has = await page.evaluate(() => !!document.querySelector('#modal #rvSwap'));
    if (known) expect(x.includes('镇岳剑') && x.includes('克土') && has, '赵乾的法宝见过：准备页写出【镇岳剑】克土：' + x.slice(0, 120));
    else expect(!x.includes('镇岳剑') && !x.includes('克土') && has && x.includes('？'), '赵乾的法宝没见过：不点法宝名，只写换上之后胜算：' + x.slice(0, 120));
    await close();
  }
  // —— 论道前：没有宿敌可打 → 不弹准备页，直接是论道开场
  await rvBuild('none');
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(400);
  expect(/^第\d+届 天骄论道$/.test(await mtitle()) && !(await page.evaluate(() => window.__xm.L.tourFoe(window.__xm.st))), '没有宿敌可打时不弹准备页');
  await close();
  // —— norivals2：不弹准备页
  await rvBuild('prep');
  await page.evaluate(() => { window.__xm.L.RIVALS2_ON = false; });
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(400);
  const noPrep = (await mtitle()) !== '论道 · 对决准备';
  await page.evaluate(() => { window.__xm.L.RIVALS2_ON = true; });
  expect(noPrep || (await page.evaluate(() => !!window.__xm.L.tourFoe(window.__xm.st))), 'norivals2 下的论道不会卡在准备页');
  await close();
  // —— 新秀挑战：有【换上】；【指点】【打压】；打压的胜 / 败
  await rvBuild('rookie');
  const rk0 = await page.evaluate(() => { const { st, L } = window.__xm; const I = L.rookieInfo(st), b = L.duelArtBest(st, I.foe, I.Q); return { n: I.rk.n, p: L.pct(I.p), q: I.q, rank: st.rank, swap: b.same ? '' : b.id }; });
  await page.evaluate(() => window.__xm.runRookie()); await page.waitForTimeout(400); await shot('rv04-rookie');
  const rf = await feet(), rt = await mtitle(), rx = await mtext();
  expect(rt === '新秀挑战' && rf.join() === '指点,打压' && rx.includes(rk0.n) && rx.includes(rk0.p), '新秀挑战页：标题、两个按钮（最后一个是【打压】）、胜算与逻辑层一致：' + JSON.stringify([rt, rf, rk0]));
  expect(!!(await page.$('#modal #rkSwap')) && rk0.swap === 'z_hanyue', '新秀挑战页有 #rkSwap：换成克他的战技');
  await (await zPage()).click(); await page.waitForTimeout(400);
  expect((await page.evaluate(() => window.__xm.L.artSlots(window.__xm.st)[1])) === 'z_hanyue' && !(await page.$('#modal #rkSwap')) && (await mtitle()) === '新秀挑战', '在新秀挑战里点【换上】后重新渲染');
  await forceR(0.0); await clickFoot(-1); await page.waitForTimeout(500); await page.evaluate(() => window.__xm.duelSkip()); await page.waitForTimeout(800); await shot('rv05-crush-win'); await unforceR();
  const cw = await mtext();
  expect((await mtitle()) === '打压' && cw.includes('胜！') && cw.includes('恩怨 60'), '打压赢：对决结果页写胜、写恩怨 60：' + cw.slice(0, 100));
  await clickFoot(0); await page.waitForTimeout(300);
  expect(await page.evaluate(() => { const { st, L } = window.__xm; return !L.rookie(st) && st.rv2.pool.length === 1 && st.rv2.crush === 1 && !st.ladder.some(x => x.rk); }), '打压赢之后：新秀进池子、榜上去掉新秀标记');
  await close();
  await rvBuild('rookie');
  await page.evaluate(() => window.__xm.runRookie()); await page.waitForTimeout(400);
  await forceR(0.999999); await clickFoot(-1); await page.waitForTimeout(500); await page.evaluate(() => window.__xm.duelSkip()); await page.waitForTimeout(800); await shot('rv06-crush-lose'); await unforceR();
  const cl = await mtext();
  expect((await mtitle()) === '打压' && cl.includes('败') && cl.includes('负伤 2 周天'), '打压输：对决结果页写败、负伤 2 周天：' + cl.slice(0, 100));
  await clickFoot(0); await page.waitForTimeout(300);
  expect(await page.evaluate(n => { const { st, L } = window.__xm; return st.rank === n + 1 && !L.rookie(st) && st.p.inj >= 2 && L.rivalAt(st, n) && !L.rivalAt(st, n).id; }, rk0.rank), '打压输之后：名次 +1、他排到你前面、负伤');
  await close();
  await rvBuild('rookie');
  await page.evaluate(() => window.__xm.runRookie()); await page.waitForTimeout(400); await clickFoot(0); await page.waitForTimeout(400); await shot('rv07-teach');
  expect((await mtitle()) === '指点' && (await feet()).join() === '继续', '指点：一页文字、一个【继续】');
  await clickFoot(0);
  expect(await page.evaluate(() => { const { st, L } = window.__xm; return !L.rookie(st) && st.rv2.friends.length === 1 && st.eflags.rookie_taught === 1; }), '指点之后：他进友人名册');
  await close();
  // 还没追到身后时 runRookie 什么都不弹
  await rvBuild('list');
  await page.evaluate(() => window.__xm.runRookie()); await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.getElementById('modal').hidden), '新秀还没追到身后：runRookie 不弹');
  // —— 天骄榜：宿敌一行一张，有新秀时也列出；宿敌卡未知 / 已知
  await page.evaluate(() => window.__xm.showMe('rank')); await page.waitForTimeout(400); await shot('rv08-rank');
  const lst = await page.evaluate(() => ({ rv: document.querySelectorAll('#modal .rvrow[data-rv]').length, rk: document.querySelectorAll('#modal .rvrow[data-rk]').length, txt: document.querySelector('#modal .sheet').textContent, n: window.__xm.L.rookie(window.__xm.st).n }));
  expect(lst.rv === 5 && lst.rk === 1 && lst.txt.includes(lst.n) && lst.txt.includes('新秀'), '天骄榜：宿敌一行一张（5 张），新秀也列出：' + JSON.stringify([lst.rv, lst.rk]));
  await page.click('#modal .rvrow[data-rv="zhao"]'); await page.waitForTimeout(350); await shot('rv09-card-unknown');
  const cu = await mtext();
  expect((await mtitle()) === '宿敌' && cu.includes('赵乾') && cu.includes('？') && !cu.includes('镇岳剑') && !cu.includes('庚金指'), '宿敌卡（没交过手）：战技与法宝写“？”：' + cu.slice(0, 120));
  await clickFoot(0); await page.waitForTimeout(300);
  expect((await mtitle()) !== '宿敌' && (await page.evaluate(() => !!document.querySelector('#modal .rvrow'))), '宿敌卡【返回】回到天骄榜');
  await page.evaluate(() => { const { st, L } = window.__xm; L.revealFoe(st, { kind: 'rival', id: 'zhao' }); L.markBeat(st, 'zhao'); st.beaten.zhao = 1; window.__xm.showRivalCard('zhao'); }); await page.waitForTimeout(350); await shot('rv10-card-known');
  const ck = await mtext();
  expect(ck.includes('庚金指') && ck.includes('镇岳剑') && ck.includes('克土') && ck.includes('已击败'), '宿敌卡（击败过）：战技、法宝、已击败都写出来：' + ck.slice(0, 160));
  await close();
  await page.evaluate(() => window.__xm.showMe('rank')); await page.waitForTimeout(300);
  await page.click('#modal .rvrow[data-rk]'); await page.waitForTimeout(350); await shot('rv11-rookie-card');
  const kc = await mtext(), kn = await page.evaluate(() => window.__xm.L.rookie(window.__xm.st).n);
  expect((await mtitle()) === '新秀' && kc.includes(kn) && kc.includes('每届论道追 8 名') && kc.includes('？'), '新秀卡：名字、追赶速度、没看过的五行写“？”：' + kc.slice(0, 120));
  await close();
  // norivals2：天骄榜还是五行宿敌，没有新秀行；不报错
  await page.evaluate(() => { window.__xm.L.RIVALS2_ON = false; window.__xm.showMe('rank'); }); await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.querySelectorAll('#modal .rvrow[data-rv]').length === 5 && document.querySelectorAll('#modal .rvrow[data-rk]').length === 0), 'norivals2：天骄榜没有新秀行');
  await page.evaluate(() => { window.__xm.L.RIVALS2_ON = true; }); await close();
  // —— 伏击：事件对决用宿敌半身像，胜算含五行与他的法宝
  await rvBuild('ambush');
  const am = await page.evaluate(() => { const { st, L } = window.__xm; const ev = L.eventById('rv_ambush_zhao'); const foe = { kind: 'rival', id: 'zhao' }; window.__xm.showChoice(ev); return { p: L.pct(L.duelP(st, L.duelPower(st, foe), L.power(st) * 1.1, foe)), live: L.evLive(ev), ok: L.eligible(st, ev, 'exp', {}) }; });
  await page.waitForTimeout(350); await shot('rv12-ambush');
  const ax = await mtext();
  expect(am.live && am.ok && ax.includes('胜算 ' + am.p) && ax.includes('缚灵网'), '伏击事件：选项上的胜算与逻辑层一致：' + am.p);
  await forceR(0.0); await page.click('#modal button[data-c="0"]'); await page.waitForTimeout(500); await shot('rv13-ambush-duel');
  const aimg = await page.evaluate(() => { const d = window.__xm.duelFx; return d ? { face: d.face, nR: d.bouts[0].nR } : null; });   // 对决在场景里演：先对视（画布上的半身像），右边的名字是赵乾
  await page.evaluate(() => window.__xm.duelSkip()); await page.waitForTimeout(900); await unforceR();
  expect(!!aimg && aimg.face > 0 && aimg.nR.includes('赵乾') && (await mtext()).includes('赵乾') && (await mtext()).includes('胜！'), '伏击对决：右边是赵乾的半身像，结果写胜：' + JSON.stringify(aimg));
  expect(await page.evaluate(() => window.__xm.st.grudge.zhao === 90 && window.__xm.L.rivalKnow(window.__xm.st, 'zhao').art), '伏击赢了：恩怨 +10、记下他的看家战技');
  await close();
  // —— 老祖讲解：rvKezhi（对决准备页出现【换上】）、rvGrudge（恩怨过 60）、rvRookie（新秀出世）。说话时暂停，数字和逻辑层一致
  const guideAt = async id => { for (let i = 0; i < 12; i++) { await page.waitForTimeout(250); if ((await page.evaluate(() => window.__xm.guideDbg.active)) === id) return true; await page.evaluate(id => { const { st } = window.__xm; for (const h of window.__xm.guideDbg.cand) if (h !== id) st.hintSeen[h] = 1; }, id); } return false; };
  // 非 urgent 的讲解要 st.tick ≥ hintCool（上一条说完后隔两个周天，模块级变量，换局面不清）：把周天拨过去
  const guideCool = () => page.evaluate(() => { const { st } = window.__xm; st.tick = Math.max(st.tick, window.__xm.guideDbg.hintCool + 1); });
  const guideOff = () => page.evaluate(() => { const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); });
  await rvBuild('prep'); await page.evaluate(() => { const { st } = window.__xm; delete st.hintSeen.rvKezhi; window.__xm.runTournament(); });
  const gk = await page.evaluate(() => { const { st, L } = window.__xm; const tf = L.tourFoe(st), b = L.duelArtBest(st, tf.foe, tf.Q); return { p0: L.pct(b.p0), p1: L.pct(b.p1), n: L.art(b.id).n }; });
  expect(await guideAt('rvKezhi'), '老祖：对决准备页出现【换上】时讲克制（rvKezhi）');
  await page.waitForTimeout(300); await shot('rv14-guide-kezhi');
  const gt = await page.evaluate(() => ({ vis: !document.querySelector('#guide').hidden, txt: document.querySelector('#guide .gtext').textContent, hold: window.__xm.guideHold }));
  expect(gt.vis && gt.hold && gt.txt.includes(gk.p0) && gt.txt.includes(gk.p1) && gt.txt.includes(gk.n) && gt.txt.includes('×0.87') && gt.txt.includes('×1.15'), '老祖的克制讲解数字对：' + gt.txt);
  await guideOff(); await close();
  await rvBuild('list'); await page.evaluate(() => { const { st, L } = window.__xm; st.rv2.rk = null; st.ladder.forEach(x => { delete x.rk; }); st.hintSeen.rvRookie = 1; delete st.hintSeen.rvGrudge; L.addGrudge(st, 'zhao', 75); });
  await guideCool();
  expect(await guideAt('rvGrudge'), '老祖：恩怨过 60 讲伏击、抬价、带头（rvGrudge）');
  await page.waitForTimeout(300); await shot('rv15-guide-grudge');
  const gg = await page.evaluate(() => ({ txt: document.querySelector('#guide .gtext').textContent, g: window.__xm.L.grudge(window.__xm.st, 'zhao'), hold: window.__xm.guideHold }));
  expect(gg.hold && gg.txt.includes('赵乾') && gg.txt.includes('恩怨 ' + gg.g) && gg.txt.includes('×1.2') && gg.txt.includes('−10%'), '老祖的恩怨讲解数字对：' + gg.txt);
  await guideOff();
  await rvBuild('list'); await page.evaluate(() => { const { st } = window.__xm; st.hintSeen.rvGrudge = 1; delete st.hintSeen.rvRookie; });
  await guideCool();
  expect(await guideAt('rvRookie'), '老祖：新秀出世讲追赶（rvRookie）');
  await page.waitForTimeout(300); await shot('rv16-guide-rookie');
  const gr = await page.evaluate(() => { const { st, L } = window.__xm; const I = L.rookieInfo(st); return { txt: document.querySelector('#guide .gtext').textContent, n: I.rk.n, q: I.q, Q: L.fmt(I.Q), S: L.fmt(L.power(st)), hold: window.__xm.guideHold }; });
  expect(gr.hold && gr.txt.includes(gr.n) && gr.txt.includes(String(gr.q)) && gr.txt.includes(gr.Q) && gr.txt.includes(gr.S) && gr.txt.includes('8'), '老祖的新秀讲解数字对（名次、他的战力、你的战力）：' + gr.txt);
  await guideOff(); await page.waitForTimeout(200); await close();
  }
  // 人物分页
  for (const t of ['attr', 'bond', 'ach', 'rank']) { await page.evaluate(t => window.__xm.showMe(t), t); await page.waitForTimeout(250); await shot('c07-me-' + t); }
  await close();
  await page.waitForTimeout(3000); await shot('c08-hud');
  // ================= 界面改版：A 线（主界面 / 面板 / 美术接入）与 B 线（场景内对决 / 老祖引导） =================
  {
    const U = n => `${out}/ui-${n}.png`;
    const PAGE = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
    // 新开一页（新上下文），过开场，引导设为 done、提示都标成讲过，免得遮挡
    const fresh = async ctxOpts => {
      const ctx = await browser.newContext(ctxOpts), pg = await ctx.newPage();
      pg.on('pageerror', e => errors.push('pageerror(ui): ' + e.message));
      pg.on('console', m => { if (m.type() === 'error') errors.push('console(ui): ' + m.text()); });
      await pg.goto(PAGE); await pg.waitForTimeout(400);
      for (let i = 0; i < 12; i++) { if (await pg.$('#goStart')) break; await pg.click('#intro .story'); await pg.waitForTimeout(120); }
      await pg.click('#goStart'); await pg.waitForTimeout(500);
      await pg.evaluate(() => { const X = window.__xm, { st } = X; X.setSpeed(3); st.guide = { step: 99, done: true }; for (const h of X.hints) st.hintSeen[h.id] = 1; st.storyQ = []; });
      return { ctx, pg };
    };
    const closeAll = async pg => { for (let i = 0; i < 3; i++) { await pg.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await pg.waitForTimeout(450); } };
    const DEVS = { 'Pixel7': devices['Pixel 7'], '360x640': { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } };

    // ---- A1 主界面布局：场景整数倍放大、无横向溢出、点击目标 ≥44、矮屏藏传讯条 ----
    for (const [dn, dev] of Object.entries(DEVS)) {
      const { ctx, pg } = await fresh(dev);
      await pg.waitForTimeout(600);
      const lay = await pg.evaluate(() => {
        const dpr = window.devicePixelRatio, outer = document.getElementById('sceneOuter'), wrap = document.getElementById('sceneWrap'), app = document.getElementById('app'), feed = document.getElementById('feed');
        let n = Math.round(dpr * 2); const ow = outer.clientWidth || innerWidth; while (n > 1 && 180 * n / dpr > ow + 0.5) n--;
        const small = [];
        for (const el of document.querySelectorAll('#top button, #stats button, #nav button, #goal, #cult, #btnSpeed')) { const r = el.getBoundingClientRect(); if (r.width && (r.height < 43.5 || r.width < 43.5)) small.push((el.id || el.dataset.nav || el.dataset.s || el.className) + ' ' + r.width.toFixed(1) + '×' + r.height.toFixed(1)); }
        return { dpr, want: 200 * n / dpr, got: wrap.getBoundingClientRect().width, over: document.documentElement.scrollWidth - innerWidth, small, ah: app.clientHeight, feedOff: getComputedStyle(feed).display === 'none', vh: innerHeight };
      });
      expect(Math.abs(lay.want - lay.got) < 0.6, `主界面(${dn})：#sceneWrap 宽 = 200×round(dpr×2)/dpr（${lay.want.toFixed(2)}，实际 ${lay.got.toFixed(2)}，dpr ${lay.dpr}）`);
      expect(lay.over <= 0, `主界面(${dn})：页面无横向溢出（${lay.over}px）`);
      expect(lay.small.length === 0, `主界面(${dn})：#top/#stats/#goal/#nav 里的按钮都 ≥44：${lay.small.join('，')}`);
      expect(lay.feedOff === (lay.ah < 760), `主界面(${dn})：高度 <760 时 #feed 隐藏（app 高 ${lay.ah}，feed 隐藏 ${lay.feedOff}）`);
      await pg.screenshot({ path: U('a1-main-' + dn) });
      // ---- A2 人物页 8 个分页（只在 360 宽跑）----
      if (dn === '360x640') {
        for (const t of ['attr', 'art', 'gear', 'dao', 'bond', 'ach', 'codex', 'rank']) {
          await pg.evaluate(t => window.__xm.showMe(t), t); await pg.waitForTimeout(350);
          const r = await pg.evaluate(() => {
            const tabs = document.querySelector('#modal .tabs'); if (!tabs) return { none: 1 };
            const bs = [...tabs.querySelectorAll('button')], tr = tabs.getBoundingClientRect(), on = tabs.querySelector('button.on'), or = on && on.getBoundingClientRect();
            const body = document.querySelector('#modal .sheet .body');
            return { n: bs.length, oneRow: new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size === 1, onIn: !!or && or.left >= tr.left - 1 && or.right <= tr.right + 1, bodyOver: body.scrollWidth - body.clientWidth, pageOver: document.documentElement.scrollWidth - innerWidth };
          });
          expect(!r.none && r.n === 8 && r.oneRow && r.onIn && r.bodyOver <= 0 && r.pageOver <= 0, `人物页分页 ${t}（360 宽）：8 个按钮一行、当前页在可见范围、不横向溢出：${JSON.stringify(r)}`);
          if (t === 'attr' || t === 'rank') await pg.screenshot({ path: U('a2-me-' + t) });
        }
        await closeAll(pg);
      }
      // ---- A9 横屏 839×412 整页可滚动、底栏点得到（只在 Pixel 7 跑）----
      if (dn === 'Pixel7') {
        await pg.setViewportSize({ width: 839, height: 412 }); await pg.waitForTimeout(500);
        const ls = await pg.evaluate(() => { const nav = document.getElementById('nav'), r = nav.getBoundingClientRect(); const sc = document.scrollingElement; return { scrollable: sc.scrollHeight > innerHeight + 1, navBottom: r.bottom, navH: r.height, ov: sc.scrollWidth - innerWidth, appH: document.getElementById('app').scrollHeight, vh: innerHeight }; });
        await pg.screenshot({ path: U('a9-landscape-top') });
        await pg.evaluate(() => window.scrollTo(0, 99999)); await pg.waitForTimeout(300);
        await pg.screenshot({ path: U('a9-landscape-bottom') });
        const nb = await pg.evaluate(() => { const r = document.querySelector('#nav [data-nav="home"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, inView: r.top >= 0 && r.bottom <= innerHeight + 1, h: r.height }; });
        expect(nb.inView && nb.h >= 44, `横屏：滚到底后底栏在视口里且 ≥44（${JSON.stringify(nb)}，页面可滚 ${ls.scrollable}，app 高 ${ls.appH} / 视口 ${ls.vh}）`);
        expect(ls.ov <= 0, `横屏：无横向溢出（${ls.ov}）`);
        await pg.mouse.click(nb.x, nb.y); await pg.waitForTimeout(500);
        expect(await pg.evaluate(() => !document.getElementById('modal').hidden && /洞府/.test(document.querySelector('#modal h2').textContent)), '横屏：滚到底点【洞府】能打开洞府');
        await closeAll(pg);
      }
      await ctx.close();
    }

    // ---- A3 访客 / A4 闭关 / A5 老祖精灵 / A6 横幅排队 / A7 历练结算印（Pixel 7）----
    {
      const { ctx, pg } = await fresh(devices['Pixel 7']);
      await pg.evaluate(() => {
        const X = window.__xm, A = X.ART; window.__cnt = { visitor: [], retreat: 0, elder: 0 };
        const dv = A.drawVisitor, dr = A.drawRetreat, de = A.elderSprite;
        A.drawVisitor = function (x, y, kind) { window.__cnt.visitor.push(kind); return dv.apply(this, arguments); };
        A.drawRetreat = function () { window.__cnt.retreat++; return dr.apply(this, arguments); };
        A.elderSprite = function () { window.__cnt.elder++; return de.apply(this, arguments); };
      });
      const cnt = async () => pg.evaluate(() => JSON.parse(JSON.stringify(window.__cnt)));
      const reset = () => pg.evaluate(() => { window.__cnt = { visitor: [], retreat: 0, elder: 0 }; });
      // A3 访客：半身像人物画本人
      const vinfo = await pg.evaluate(() => {
        const X = window.__xm, { st, L } = X; st.exp = null; st.retreat = null;
        const evs = window.EVENTS || L.EVENTS || [];
        const ev = evs.find(e => e.npc && e.npc !== 'elder' && X.ART.hasPortrait(e.npc) && e.where === 'home' && L.eventById(e.id));
        if (!ev) return null;
        st.visitor = { id: ev.id, left: 6 }; return { id: ev.id, npc: ev.npc };
      });
      expect(!!vinfo, 'A3 找得到一个有半身像人物的访客事件');
      await reset(); await pg.waitForTimeout(500);
      const c3 = await cnt();
      expect(vinfo && c3.visitor.length > 0 && c3.visitor.every(k => k === vinfo.npc), `A3 访客：有半身像的人物画本人（${vinfo && vinfo.npc}），画的是 ${[...new Set(c3.visitor)].join(',')}`);
      // 点“！”气泡区：脚底往上 58 个逻辑像素以内能开；比 58 高很多的地方不开
      const clickAt = async (lx, ly) => { const p = await pg.evaluate(([lx, ly]) => { const c = document.getElementById('scene'), r = c.getBoundingClientRect(), OY = c.height - 160, u = r.width / 200; return { x: r.left + lx * u, y: r.top + (ly + OY) * u }; }, [lx, ly]); await pg.mouse.click(p.x, p.y); await pg.waitForTimeout(450); };
      await clickAt(36, 138 - 80);
      expect(await pg.evaluate(() => document.getElementById('modal').hidden), 'A3 点访客头顶 80 逻辑像素以上的空处：不开访客');
      await clickAt(36, 138 - 52);   // 在“！”气泡上
      const vopen = await pg.evaluate(() => ({ open: !document.getElementById('modal').hidden, t: (document.querySelector('#modal h2') || {}).textContent }));
      expect(vopen.open, 'A3 点“！”气泡区（脚底上 52 个逻辑像素）能打开访客：' + JSON.stringify(vopen));
      await pg.screenshot({ path: U('a3-visitor-modal') });
      await closeAll(pg); await pg.evaluate(() => { window.__xm.st.visitor = null; });
      // A4 闭关：ret / train 画石门，busy / teach 不画
      for (const [kind, want] of [['ret', true], ['train', true], ['busy', false], ['teach', false]]) {
        await pg.evaluate(kind => { const { st, L } = window.__xm; st.exp = null; st.visitor = null; st.p.inj = 0; st.retreat = { kind, left: 5, len: 5, tick0: st.tick, total: 5, m: 2, save: 0 }; }, kind);
        await reset(); await pg.waitForTimeout(450);
        const c = await cnt();
        expect((c.retreat > 0) === want, `A4 闭关 kind=${kind}：${want ? '画' : '不画'}石门和光罩（drawRetreat 调了 ${c.retreat} 次）`);
        if (kind === 'ret') await pg.screenshot({ path: U('a4-retreat') });
      }
      await pg.evaluate(() => { window.__xm.st.retreat = null; });
      // A5 提示气泡出现时有老祖精灵；老祖告别后不再出现
      await pg.evaluate(() => { const X = window.__xm; X.registerGuide([{ id: 'ui_t_b1', bubble: true, when: () => true, text: '试验气泡一，数字 5。' }]); });
      await reset();
      for (let i = 0; i < 10; i++) { await pg.evaluate(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); }); await pg.waitForTimeout(450); if (await pg.evaluate(() => !document.getElementById('tip').hidden)) break; }
      const tipOn = await pg.evaluate(() => !document.getElementById('tip').hidden);
      await pg.waitForTimeout(500);
      const c5 = await cnt();
      expect(tipOn && c5.elder > 0, `A5 提示气泡出现时场景里有老祖精灵（气泡 ${tipOn}，elderSprite 调了 ${c5.elder} 次）`);
      await pg.screenshot({ path: U('a5-elder-bubble') });
      await pg.evaluate(() => { document.getElementById('tip').click(); });   // 点掉
      await pg.waitForTimeout(900);
      await pg.evaluate(() => { const X = window.__xm; X.st.eflags = X.st.eflags || {}; X.st.eflags.st_farewell = 1; X.registerGuide([{ id: 'ui_t_b2', bubble: true, when: () => true, text: '告别后的气泡，数字 7。' }]); });
      await reset();
      for (let i = 0; i < 12; i++) { await pg.evaluate(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); }); await pg.waitForTimeout(450); if (await pg.evaluate(() => !document.getElementById('tip').hidden)) break; }
      const tip2 = await pg.evaluate(() => ({ on: !document.getElementById('tip').hidden, who: (document.querySelector('#tip .who') || {}).textContent }));
      await reset(); await pg.waitForTimeout(600);
      const c5b = await cnt();
      expect(tip2.on && c5b.elder === 0, `A5 老祖告别后（st_farewell）气泡还在（${JSON.stringify(tip2)}）但不再画老祖精灵（elderSprite ${c5b.elder} 次）`);
      await pg.evaluate(() => { delete window.__xm.st.eflags.st_farewell; document.getElementById('tip').click(); });
      // A6 横幅排队：同一周天连触 3 条，依次出现不叠
      await pg.waitForTimeout(500);
      const seq = await pg.evaluate(async () => {
        const X = window.__xm, { st } = X, b = document.getElementById('banner'), seen = [];
        let maxVisible = 0;
        // 一个周天里连发 3 个札记（完成即发横幅）：成就 / 札记走 banner
        for (const t of ['甲一', '乙二', '丙三']) X.L.U.emit('quest', { id: 'ui_' + t, t, rw: '', main: true, ch: Math.min(8, st.p.r) });   // 主线完成：横幅 + 章末卡排队
        X.onTick();
        const t0 = performance.now();
        while (performance.now() - t0 < 6500) {
          const txt = b.textContent;
          if (b.classList.contains('show') && txt && seen[seen.length - 1] !== txt) seen.push(txt);
          // 同一时刻 #banner 里只有一条（innerHTML 只有一个 span + 可选 small）
          maxVisible = Math.max(maxVisible, b.querySelectorAll('span').length);
          await new Promise(r => setTimeout(r, 40));
        }
        return { seen, maxVisible };
      });
      expect(seq.seen.length >= 2 && new Set(seq.seen).size === seq.seen.length && seq.maxVisible <= 1, `A6 横幅排队：同周天连发的几条依次出现、不叠：${JSON.stringify(seq)}`);
      await ctx.close();
    }
    // ---- A7 历练结算卡：#modal .stamp 的文字是评价字、里面是 ART.stamp 图片 ----
    {
      const { ctx, pg } = await fresh(devices['Pixel 7']);
      const st7 = null;
      if (!st7) {
        await pg.evaluate(() => { const X = window.__xm, { st, L } = X; st.stones = 99999; X.closeModal(); const b = L.expBest(st); L.startExp(st, b.k, b.d, b.a); for (let i = 0; i < 12 && st.exp; i++) { L.flow(st, 1); X.onTick(); } });
        await pg.waitForTimeout(900);
      }
      const s7 = st7 || await pg.evaluate(() => { const s = document.querySelector('#modal .stamp'); return s ? { txt: s.textContent.trim(), img: !!s.querySelector('img.px'), src: s.querySelector('img') ? s.querySelector('img').src.slice(0, 11) : '', w: s.querySelector('img') ? s.querySelector('img').getBoundingClientRect().width : 0 } : null; });
      expect(!!s7 && /^[天甲乙丙丁]$/.test(s7.txt) && s7.img && s7.src === 'data:image/' && s7.w >= 24, 'A7 历练结算卡：#modal .stamp 文字是评价字、里面是 ART.stamp 图片：' + JSON.stringify(s7));
      await pg.screenshot({ path: U('a7-exp-result') });
      await ctx.close();
    }

    // ---- B：问老祖、气泡排队、章末卡、registerGuide、札记新任务 ----
    {
      const { ctx, pg } = await fresh(DEVS['360x640']);
      const mt = () => pg.evaluate(() => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent : ''; });
      // 问老祖：各阶段三条建议都带数字，按钮 ≥44，360 宽不溢出，【前往】到对的面板
      const stages = [
        ['开局', s => {}, null],
        ['修为圆满', (s, L) => { s.p.s = 3; s.p.xp = L.pNeed(s.p); }, /突破/],
        ['有访客', (s, L) => { const ev = (window.EVENTS || L.EVENTS || []).find(e => e.where === 'home' && L.eventById(e.id)); if (ev) s.visitor = { id: ev.id, left: 4 }; }, null],
        ['负伤+灵石多', (s, L) => { s.p.inj = 3; s.stones = 5000; s.pills = 3; s.home.array = 2; }, null],
        ['筑基入宗', (s, L) => { s.p.r = 1; s.p.s = 1; s.flags.maxR = 1; L.joinSect(s, 'dan'); s.sect.total = 900; s.stones = 3000; }, null],
        ['金丹闲着', (s, L) => { s.p.r = 2; s.p.s = 1; s.flags.maxR = 2; s.stones = 20000; s.home.array = 4; s.herbs = 80; s.home.furnace = 2; }, null],
        ['临近约战', (s, L) => { s.tick = 33; }, null],
      ];
      for (const [name, set, goRe] of stages) {
        await closeAll(pg);
        const info = await pg.evaluate(([set]) => {
          const X = window.__xm, { L } = X; const s = L.newState({ name: '问' }); s.guide = { step: 99, done: true }; s.storyQ = []; s.hintSeen = {}; for (const h of X.hints) s.hintSeen[h.id] = 1;
          new Function('s', 'L', set)(s, L);
          X.loadState(JSON.parse(JSON.stringify(s))); X.setSpeed(3);
          const list = X.askList(); return list.map(x => ({ t: x.t.replace(/<[^>]+>/g, ''), btn: x.btn, go: typeof x.go }));
        }, ['(' + set.toString() + ')(s, L)']);
        expect(info.length >= 1 && info.every(x => /\d/.test(x.t) && x.go === 'function'), `问老祖（${name}）：每条建议带数字和【前往】：${JSON.stringify(info.map(x => x.t.slice(0, 24)))}`);
        await pg.evaluate(() => window.__xm.showAsk()); await pg.waitForTimeout(350);
        const ui = await pg.evaluate(() => {
          const bs = [...document.querySelectorAll('#modal [data-ask]')], small = bs.filter(b => { const r = b.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).length;
          const body = document.querySelector('#modal .sheet .body');
          return { n: bs.length, small, over: body.scrollWidth - body.clientWidth, page: document.documentElement.scrollWidth - innerWidth, foot: [...document.querySelectorAll('#modal .foot .btn')].filter(b => b.getBoundingClientRect().height < 43.5).length };
        });
        expect(ui.n === Math.min(3, info.length) && ui.small === 0 && ui.foot === 0 && ui.over <= 0 && ui.page <= 0, `问老祖（${name}，360 宽）：按钮数 = min(3,建议数)、≥44px、不溢出：${JSON.stringify(ui)}`);
        if (name === '修为圆满' || name === '有访客') await pg.screenshot({ path: U('b-ask-' + name) });
        if (goRe) { await pg.click('#modal [data-ask="0"]'); await pg.waitForTimeout(450); expect(goRe.test(await mt()), `问老祖（${name}）：第一条【前往】到突破页（实际 ${await mt()}）`); }
        if (name === '有访客' && info.some(x => x.btn === '去见')) { await pg.click('#modal [data-ask="0"]'); await pg.waitForTimeout(450); expect((await mt()) !== '' && (await mt()) !== '问老祖', `问老祖（有访客）：【去见】打开访客（${await mt()}）`); }
      }
      await closeAll(pg);
      // 气泡排队：3 条同周天触发，按 3 个周天间隔一条条出，不覆盖，6 秒收起，收起后头像出“！”
      await pg.evaluate(() => { const X = window.__xm, { L } = X; const s = L.newState({ name: '泡' }); s.pact = 1; s.beaten.mu = 1; s.tick = 100; s.guide = { step: 99, done: true }; s.storyQ = []; s.hintSeen = {}; for (const h of X.hints) s.hintSeen[h.id] = 1; X.loadState(JSON.parse(JSON.stringify(s))); X.setSpeed(3);
        X.registerGuide([1, 2, 3].map(i => ({ id: 'ui_q' + i, bubble: true, when: () => true, text: `排队气泡第 ${i} 条，数字 ${i}。` }))); });
      const log = [];
      const t0 = Date.now(); let lastTxt = '';
      let nt = 0;
      while (Date.now() - t0 < 30000) {
        const doTick = Date.now() - nt >= 2000; if (doTick) nt = Date.now();
        const s = await pg.evaluate(doTick => { const X = window.__xm; if (!document.getElementById('modal').hidden) X.closeModal(); if (doTick) { X.L.flow(X.st, 1); X.st.visitor = null; X.onTick(); } const tip = document.getElementById('tip'); return { on: !tip.hidden, txt: tip.hidden ? '' : tip.textContent, tick: X.st.tick, bq: X.guideDbg.bubbleQ.length }; }, doTick);
        if (s.on && s.txt !== lastTxt) { lastTxt = s.txt; log.push({ t: Date.now() - t0, tick: s.tick, txt: s.txt.replace(/\s+/g, '').slice(0, 24) }); }
        if (!s.on) lastTxt = '';
        await pg.waitForTimeout(350);
      }
      const gaps = log.slice(1).map((x, i) => x.t - log[i].t), tgaps = log.slice(1).map((x, i) => x.tick - log[i].tick);   // 含别的气泡：全部都要不重叠
      const lq = log.filter(x => /排队气泡第/.test(x.txt)); expect(lq.length === 3 && lq.map(x => x.txt.match(/第(\d)/)[1]).join('') === '123', `气泡排队：3 条依次都出现一次：${JSON.stringify(log)}`);
      expect(gaps.every(g => g >= 5500) && tgaps.every(g => g >= 3), `气泡排队：每条至少停留约 6 秒、相隔 ≥3 周天，不互相覆盖（间隔 ${gaps.join(',')} ms，${tgaps.join(',')} 周天）`);
      const dot = await pg.evaluate(() => { const b = document.getElementById('guideAv'); return { has: !!b, hidden: b && b.hidden, nw: b && b.classList.contains('new'), tipHidden: document.getElementById('tip').hidden, logN: window.__xm.bubbleLog.length, dotTxt: b && b.querySelector('.guide-dot') && b.querySelector('.guide-dot').textContent }; });
      await pg.waitForTimeout(6500);
      const dot2 = await pg.evaluate(() => { const b = document.getElementById('guideAv'); return { tipHidden: document.getElementById('tip').hidden, nw: b.classList.contains('new'), dotTxt: b.querySelector('.guide-dot').textContent }; });
      expect(dot2.tipHidden && dot2.nw && dot2.dotTxt === '！' && dot.logN >= 3, `气泡：6 秒后收起，头像出“！”（bubbleLog ${dot.logN} 条）：${JSON.stringify(dot2)}`);
      await pg.screenshot({ path: U('b-bubble-dot') });
      await closeAll(pg);
      const hit = await pg.evaluate(() => { const b = document.getElementById('guideAv'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { ok: e === b || b.contains(e), cover: e && (e.id || e.className || e.tagName), rect: [r.left, r.top, r.width, r.height].map(Math.round), modal: !document.getElementById('modal').hidden }; });
      expect(hit.ok, '头像“！”没被别的东西盖住：' + JSON.stringify(hit));
      await pg.screenshot({ path: U('b-bubble-dot-hit') });
      await pg.evaluate(() => { const r = document.getElementById('guideAv').getBoundingClientRect(); window.__avr = r; }); await pg.mouse.click(await pg.evaluate(() => window.__avr.left + window.__avr.width / 2), await pg.evaluate(() => window.__avr.top + window.__avr.height / 2)); await pg.waitForTimeout(400);
      expect(await pg.evaluate(() => document.querySelector('#modal h2').textContent === '问老祖' && document.querySelectorAll('#modal .guide-said').length >= 3), '点头像 = 问老祖，下面附最近说过的几句气泡');
      await closeAll(pg);
      // registerGuide 的 before 能插到指定位置
      const rg = await pg.evaluate(() => { const X = window.__xm; const first = X.hints[0].id; X.registerGuide([{ id: 'ui_ins', when: () => false, text: 'x' }], { before: first }); X.registerGuide({ id: 'ui_tail', when: () => false, text: 'y' }); const ids = X.hints.map(h => h.id); const i = ids.indexOf('ui_ins'); return { i, nextIsWelcome: ids[i + 1] === first, tail: ids[ids.length - 1] }; });
      expect(rg.i >= 0 && rg.nextIsWelcome && rg.tail === 'ui_tail', 'registerGuide：before 插到指定讲解之前，不带 before 追加到末尾：' + JSON.stringify(rg));
      // 章末卡：只在本章主线刚完成时弹
      const chap = async (setup, wait) => {
        await closeAll(pg);
        await pg.evaluate(setup); await pg.waitForTimeout(wait);
        return pg.evaluate(() => ({ title: document.getElementById('modal').hidden ? '' : document.querySelector('#modal h2').textContent, stamp: !!document.querySelector('#modal .duel-ch-stamp'), tip: window.__xm.bubbleLog.length }));
      };
      const ch0 = await chap(() => { const X = window.__xm, { L } = X; const s = L.newState({ name: '章' }); s.guide = { step: 99, done: true }; s.storyQ = []; s.hintSeen = {}; for (const h of X.hints) s.hintSeen[h.id] = 1; X.loadState(JSON.parse(JSON.stringify(s))); X.setSpeed(3); X.st.stats.exp = 1; L.checkQuests(X.st); X.onTick(); }, 3000);
      expect(ch0.title === '', '章末卡：做完的只是小任务（历练一次），不弹章末卡：' + JSON.stringify(ch0));
      const ch1 = await chap(() => { const X = window.__xm; X.st.beaten.mu = 1; X.L.checkQuests(X.st); X.onTick(); }, 3500);
      expect(/^第一章/.test(ch1.title) && ch1.stamp, '章末卡：本章主线（赢下三年之约）刚完成时弹出，带“完”印：' + JSON.stringify(ch1));
      await pg.screenshot({ path: U('b-chapter-card') });
      await pg.evaluate(() => { const b = document.querySelector('#modal .foot .btn'); if (b) b.click(); }); await pg.waitForTimeout(500);
      const ch2 = await chap(() => { const X = window.__xm; X.onTick(); }, 2500);
      expect(ch2.title === '', '章末卡：只弹一次');
      const ch3 = await chap(() => { const X = window.__xm, { st, L } = X; st.p.r = 3; st.flags.maxR = 3; st.quest.done = {}; st.beaten.mu = 0; X.onTick(); st.beaten.mu = 1; L.checkQuests(st); X.onTick(); }, 3000);
      expect(ch3.title === '' || !/^第一章/.test(ch3.title), '章末卡：早已过去的章节（元婴期补完第一章主线）不弹卡，只留一句气泡：' + JSON.stringify(ch3));
      await ctx.close();
    }
    // ---- 札记：带自己 id 的新任务可完成、不占序号（旧档记录不错位）----
    {
      const q = await page.evaluate(() => {
        const L = window.__xm.L, bad = [], named = [];
        const s = L.newState({ name: '札' });
        L.CHAPTERS.forEach((ch, r) => {
          const plain = ch.tasks.filter(t => /^c\d_\d+$/.test(t.id)).map(t => t.id), want = plain.map((_, i) => 'c' + r + '_' + i);
          if (plain.join() !== want.join()) bad.push('第 ' + r + ' 章序号不连续：' + plain.join());
          ch.tasks.filter(t => !/^c\d_\d+$/.test(t.id)).forEach(t => named.push(t.id));
        });
        // 旧档序号：这几条是原来就有的，序号不能因为插了新任务而变
        const pin = { c0_3: '修到炼气中期', c0_4: '闭关一次', c1_0: '拜入一方宗门', c1_5: '击败独眼狼王', c2_0: '渡过金丹雷劫' };
        for (const k in pin) { const [r] = k.slice(1).split('_'); const t = L.CHAPTERS[+r].tasks.find(x => x.id === k); if (!t || L.questText(s, t) !== pin[k]) bad.push(k + ' 现在是 ' + (t ? L.questText(s, t) : '无') + '，应为 ' + pin[k]); }
        // 新任务：干净状态下都不满足；给上对应的统计后满足
        const fx = { c0_plus: st => { st.stats.plus = 1; }, c1_robe: st => { st.gear.r = { u: 1, id: 'r1_0', slot: 'r', t: 1, plus: 0, aff: [], fail: 0 }; }, c1_plant: st => { st.stats.plant = 1; }, c1_sold: st => { st.stats.sold = 1; }, c1_realm: st => { st.stats.mjRuns = 1; }, c2_zhen: st => { st.stats.zhenSet = 1; }, c2_recipe: st => { st.stats.recipes = 1; }, c2_disc: st => { st.stats.discTaken = 1; }, c3_dao: st => { st.dao = st.dao || {}; st.dao.k = 5; }, c3_evo: st => { st.stats.petEvo = 1; }, c4_forge: st => { st.stats.forged = 1; } };
        const res = {};
        for (const id of named) {
          const t = L.CHAPTERS.flatMap(c => c.tasks).find(x => x.id === id);
          if (!fx[id]) { res[id] = 'skip'; continue; }
          const a = L.newState({ name: 'a' }), b = L.newState({ name: 'b' });
          let before = false, after = false; try { before = !!t.c(a); fx[id](b); after = !!t.c(b); } catch (e) { bad.push(id + ' 报错 ' + e.message); }
          res[id] = before + '→' + after; if (before || !after) bad.push(id + ' ' + before + '→' + after);
        }
        // 旧档读进来：done 里只有旧序号时，完成状态不错位
        const o = L.newState({ name: 'o' }); o.quest = { done: { c0_3: 1 } }; o.p.r = 0;
        const v = L.questView(o); if (v.list.some(x => x.id === 'c0_3')) bad.push('旧档 c0_3 已完成却还在清单里');
        return { bad, named, res };
      });
      expect(q.bad.length === 0, '札记：新任务不占序号、旧档不错位、统计满足即完成：' + JSON.stringify(q.bad));
      expect(q.named.length >= 11, '札记：带自己 id 的新任务 ≥11 条（实际 ' + q.named.length + '）');
    }

    // ---- B 对决：每种对决演得完、跳得过；纸卷不挡场景、点画面可跳、中途 closeModal 清掉 duelFx ----
    {
      const { ctx, pg } = await fresh(devices['Pixel 7']);
      const build = kind => pg.evaluate(kind => {
        const X = window.__xm, { L } = X; const s = L.newState({ name: '对决' }); s.guide = { step: 99, done: true }; s.storyQ = []; s.hintSeen = {}; for (const h of X.hints) s.hintSeen[h.id] = 1;
        s.p.r = (kind === 'tour' || kind === 'rookie') ? 4 : 3; s.p.s = (kind === 'tour' || kind === 'rookie') ? 1 : 2; s.stats.tour = 5; s.home = { cave: 6, array: 8, field: 8, furnace: 8 }; s.stones = 1e5; s.tick = 130; s.flags.maxR = 3; s.pact = 1; s.beaten.mu = 1; s.stats.exp = 20; s.rank = 50;
        for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) s.best[k + '_' + d] = 3;
        const arts = (own, eq) => { for (const id of own) L.giveArt(s, id); for (const id of eq) L.equipArt(s, id); };
        arts(['z_liehuo', 'z_hanyue'], ['z_liehuo']);
        const tune = q => { s.tick = Math.round((Math.log(L.power(s)) - L.rivalA(q)) / L.RIVAL_SLOPE); };
        if (kind === 'pact') { s.pact = 0; s.beaten = {}; s.tick = 36; }
        else if (kind === 'origin') { s.origin = 'dantong'; s.pact = 0; s.beaten = {}; s.tick = 36; }
        else if (kind === 'tour') { s.rank = 80; s.pact = -1; s.p.r = 6; s.flags.maxR = 6; s.rank = 90; tune(80); }   // 数值校准后宿敌会卡位：境界给高一点，才有多场
        else if (kind === 'rookie') { s.rank = 10; s.flags.maxR = 4; s.gear = L.newGear(); L.gearDrop(s, 'w', 4, { base: 'w4_1' }); tune(10); for (let i = 0; i < 8 && !s.rv2.rk; i++) { s.tick++; L.rivalTick(s, {}); } for (let i = 0; i < 3; i++) L.rookieTour(s, L.power(s)); }
        else if (kind === 'boss') { s.bosses = { 0: 0 }; }
        else if (kind === 'meet' || kind === 'trio' || kind === 'war' || kind === 'promo') { L.joinSect(s, 'dao'); s.sect.total = kind === 'promo' ? 20000 : 3000; s.sect.pts = 900; if (kind === 'trio') { s.sect.rank = 4; s.p.r = 4; s.p.s = 1; s.flags.maxR = 4; L.discTake(s, null, { cat: 'strong', tp: 'mang', t: 4 }); L.discTake(s, null, { cat: 'quiet', tp: 'chi', t: 3 }); s.disc.list.forEach(x => { x.di = 13; }); s.disc.cand = null; } if (kind === 'meet' || kind === 'trio') s.sect.rank = kind === 'trio' ? 6 : 2; if (kind === 'promo') s.sect.rank = 2; }
        X.loadState(JSON.parse(JSON.stringify(s))); X.setSpeed(3); return kind;
      }, kind);
      const startFn = {
        pact: () => window.__xm.runPact(), origin: () => window.__xm.runPact(), tour: () => window.__xm.runTournament(), rookie: () => window.__xm.runRookie(), boss: () => window.__xm.fightBossUI(0),
        meet: () => window.__xm.runSectMeet(), trio: () => window.__xm.runSectMeet(), war: () => window.__xm.runWar(), promo: () => { const X = window.__xm, { L } = X; const o = L.promote; L.promote = () => ({ duel: { S: 900, Q: 1000, p: 0.5, win: true } }); X.doPromote(); L.promote = o; },
        event: () => { const X = window.__xm; X.showChoice({ id: 'ui_duel', where: 'home', title: '路遇拦路人', text: '有人拦住了去路。', choices: [{ t: '与之交手', duel: 0.9, ok: { text: '你赢了。', fx: { xp: 5 } }, fail: { text: '你输了。', fx: { inj: 2 } } }] }); setTimeout(() => { const b = document.querySelector('#modal button[data-c="0"]'); if (b) b.click(); }, 300); },
      };
      const D = () => pg.evaluate(() => { const X = window.__xm, d = X.duelFx; const m = document.getElementById('modal'); return { fx: !!d, ended: d && d.ended, modal: !m.hidden, duelM: m.classList.contains('duel-m'), title: (m.querySelector('h2') || {}).textContent || '' }; });
      const sceneClickSkip = async () => { const p = await pg.evaluate(() => { const r = document.getElementById('scene').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 }; }); await pg.mouse.click(p.x, p.y); };
      for (const kind of ['pact', 'origin', 'tour', 'rookie', 'boss', 'meet', 'trio', 'war', 'promo', 'event']) {
        await closeAll(pg);
        await build(kind === 'event' ? 'plain' : kind);
        const trioOn = await pg.evaluate(() => window.__xm.L.trioOn(window.__xm.st));
        await pg.evaluate(startFn[kind]); await pg.waitForTimeout(500);
        const titles = [], rounds = { n: 0, layout: [], clickSkipOk: 0 }; let started = false;
        for (let step = 0; step < 30; step++) {
          const d = await D();
          if (d.fx && !d.ended) {
            started = true; rounds.n++; if (!titles.includes(d.title)) titles.push(d.title);
            if (rounds.n <= 2 && rounds.n >= 1) {
              await pg.waitForTimeout(350);   // 纸卷展开动画 0.24 秒内高度被压扁，量按钮要等它完
              const lay = await pg.evaluate(() => { const sh = document.querySelector('#modal.duel-m .sheet'), w = document.getElementById('sceneWrap').getBoundingClientRect(); if (!sh) return { none: 1 }; const r = sh.getBoundingClientRect(); return { gap: Math.round(r.top - w.bottom), over: document.documentElement.scrollWidth - innerWidth, skipH: Math.round(sh.querySelector('.foot .btn') ? sh.querySelector('.foot .btn').getBoundingClientRect().height : 0) }; });
              rounds.layout.push(lay);
              if (rounds.n === 1) await pg.screenshot({ path: U('b-duel-' + kind) });
            }
            // 点画面跳过（第一场用点画面，之后用按钮 / duelSkip 交替）
            if (rounds.n === 1) { await sceneClickSkip(); await pg.waitForTimeout(700); const d2 = await D(); if (!d2.fx || d2.ended) rounds.clickSkipOk++; }
            else await pg.evaluate(() => window.__xm.duelSkip());
            await pg.waitForTimeout(500);
            continue;
          }
          if (!d.modal) { if (started) break; await pg.waitForTimeout(300); continue; }
          if (d.ended) rounds.endedSeen = (rounds.endedSeen || 0) + 1;
          // 准备页 / 结果页：点最后一个可点的金按钮（或第一个按钮）往下走
          const clicked = await pg.evaluate(() => { const ch = document.querySelector('#modal .choices .btn:not([disabled])'); if (ch) { ch.click(); return 'choice'; } const g = document.querySelector('#modal .foot .btn.gold:not([disabled])') || document.querySelector('#modal .foot .btn:not([disabled])'); if (g) { g.click(); return g.textContent; } window.__xm.closeModal(); return 'close'; });
          await pg.waitForTimeout(700);
        }
        const end = await D();
        expect(started, `对决 ${kind}：真的演出了（场景内 duelFx）`);
        if (!started) continue;
        expect(!end.fx && !end.modal, `对决 ${kind}：演完后收尾（duelFx 清掉、弹窗关）：${JSON.stringify(end)}，共 ${rounds.n} 场，标题 ${titles.join('/')}`);
        expect(rounds.layout.every(l => !l.none && l.gap >= -2 && l.over <= 0 && l.skipH >= 44), `对决 ${kind}：纸卷在场景下方不挡画面、无横向溢出、跳过 / 继续按钮 ≥44：${JSON.stringify(rounds.layout)}`);
        expect(rounds.clickSkipOk === 1, `对决 ${kind}：点画面能跳过（0.7 秒内结束）`);
        if (kind === 'tour') expect(rounds.n >= 2, `对决 tour：论道多场（${rounds.n} 场）`);
        if (kind === 'trio') expect(trioOn && titles.some(t => /三人战/.test(t)), `对决 trio：会武三人战（trioOn ${trioOn}，标题 ${titles.join('/')}）`);
      }
      // 中途 closeModal：duelFx 被清掉
      await closeAll(pg); await build('pact'); await pg.evaluate(startFn.pact); await pg.waitForTimeout(600);
      const pre = await D();
      await pg.evaluate(() => window.__xm.closeModal()); await pg.waitForTimeout(700);
      const post = await D();
      expect(pre.fx && !post.fx, `对决中途 closeModal 后 duelFx 被清掉（前 ${pre.fx}，后 ${post.fx}）`);
      await closeAll(pg);
      await ctx.close();
    }

    // ================= 阶段四美术接线（锁碎裂、声音三态、速度档、掉落翻牌、空状态、首领 / 九宗代表 / 魔宗演武场、戒指爆光）=================
    {
      const { ctx, pg } = await fresh(devices['Pixel 7']);
      const ev = (f, a) => pg.evaluate(f, a);
      await ev(() => {
        const { st, L } = window.__xm;
        st.stones = 5e4; st.p.r = 3; st.p.s = 3; st.p.t = 4; st.flags.awoke = 2; st.flags.maxR = 3; st.tick = 120; st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.retreat = null; st.exp = null;
        st.home = Object.assign(st.home, { cave: 4, array: 9, field: 8, furnace: 5 });
        for (let k = 0; k <= 4; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = 3;
        L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900; st.market.evQ = []; st.achQ = []; st.storyQ = [];
        document.getElementById('tip').hidden = true;
      });
      await pg.waitForTimeout(600);
      // 1 底栏解锁：.lkbrk 出现、约 330ms 后撤掉；.unlock 照旧
      await ev(() => { window.__xm.st.stats.exp = 0; }); await pg.waitForTimeout(700);
      const lockedBefore = await ev(() => !!document.querySelector('#nav [data-nav="market"] .lock, #nav [data-nav="market"].locked, #nav [data-nav="market"] img[data-lock]') || document.querySelector('#nav [data-nav="market"]').className);
      await ev(() => { window.__xm.st.stats.exp = 1; });
      const lk = { seen: false, unlock: false, t0: Date.now(), goneAt: 0, firstAt: 0 };
      for (let i = 0; i < 40; i++) {
        const r = await ev(() => ({ brk: !!document.querySelector('#nav button .lkbrk'), un: !!document.querySelector('#nav button.unlock') }));
        if (r.brk && !lk.seen) { lk.seen = true; lk.firstAt = Date.now() - lk.t0; }
        if (r.un) lk.unlock = true;
        if (lk.seen && !r.brk && !lk.goneAt) lk.goneAt = Date.now() - lk.t0;
        await pg.waitForTimeout(25);
      }
      expect(lk.seen && lk.goneAt > 0 && lk.goneAt - lk.firstAt >= 200 && lk.goneAt - lk.firstAt <= 700 && lk.unlock, `阶段四 1 底栏解锁：.lkbrk 出现后约 330ms 撤掉、.unlock 流程照旧：${JSON.stringify(lk)}（解锁前 ${lockedBefore}）`);
      // 2 声音三态
      const snd = [];
      for (let i = 0; i < 3; i++) {
        snd.push(await ev(() => { const b = document.getElementById('btnSound'), im = b.querySelector('img'); const L = ['声音：音乐与音效', '声音：仅音效', '声音：静音'], k = L.indexOf(b.getAttribute('aria-label')); const want = ['snd_on', 'snd_sfx', 'snd_off'].map(n => window.__xm.ART.icon(n).toDataURL()); return { label: b.getAttribute('aria-label'), idx: k, imgMatch: !!im && k >= 0 && im.src === want[k], distinct: new Set(want).size }; }));
        await pg.click('#btnSound'); await pg.waitForTimeout(150);
      }
      expect(snd.every(x => x.imgMatch && x.distinct === 3) && new Set(snd.map(x => x.idx)).size === 3 && snd.every((x, i) => i === 0 || x.idx === (snd[i - 1].idx + 1) % 3), '阶段四 2 #btnSound 点三次：图标依次 snd_on / snd_sfx / snd_off、aria-label 三种文案：' + JSON.stringify(snd));
      await pg.click('#btnSound'); await pg.click('#btnSound'); await pg.click('#btnSound');   // 回到起点（点满三下一圈）
      // 3 速度档
      await ev(() => window.__xm.setSpeed(0)); await pg.waitForTimeout(400);
      const spd = [];
      for (let i = 0; i < 4; i++) {
        await pg.waitForTimeout(250);
        spd.push(await ev(() => { const b = document.getElementById('btnSpeed'), r = b.getBoundingClientRect(); return { lab: b.getAttribute('aria-label'), on: b.classList.contains('on'), w: Math.round(r.width), h: Math.round(r.height), img: !!b.querySelector('img') }; }));
        await pg.click('#btnSpeed');
      }
      await ev(() => window.__xm.setSpeed(3)); await pg.waitForTimeout(300);
      expect(spd.map(x => x.lab).join('|') === ['游戏速度：×1', '游戏速度：×2', '游戏速度：×4', '游戏速度：暂停'].join('|') && spd.map(x => x.on).join() === 'false,false,false,true' && spd.every(x => x.w >= 44 && x.h >= 44 && x.img), '阶段四 3 #btnSpeed 点四次：×1 / ×2 / ×4 / 暂停，暂停时有 .on，按钮 ≥44px、图标是美术：' + JSON.stringify(spd));
      // 4 掉落翻牌
      const drop = async (drops, legacy) => {
        await ev(([drops, legacy]) => {
          const { st, L } = window.__xm; st.exp = null; window.__xm.closeModal();
          L.startExp(st, 0, 0, 0); const res = L.resolveExp(st); res.items = [];
          for (const [k, t] of drops) res.items.push(L.giveItem(st, k, t, undefined, { k: 0, d: 0, src: 'exp' }));
          window.__want = Math.max(0, ...res.items.map(it => it.kind === 'a' ? (L.art(it.art) || {}).t : it.gear ? it.gear.t : it.kind === 'pet' ? it.tier : 0).map(t => t ? Math.max(1, Math.min(7, t | 0)) : 0));
          window.__xm.showExpResult(res);
        }, [drops, legacy]);
        await pg.waitForTimeout(700);
        const r = await ev(() => { const d = document.querySelector('#modal .dflip'), c = document.querySelector('#modal canvas.dflip-beam'); return { has: !!d, tier: c ? c.dataset.tier : null, want: String(window.__want) }; });
        await closeAll(pg); return r;
      };
      const d1 = await drop([['w', 6], ['a', 2]]), d2 = await drop([['a', 2]]), d3 = await drop([['r', 7]]), d4 = await drop([]);
      expect([d1, d2, d3].every(d => d.has && d.tier === d.want && +d.want >= 2), '阶段四 4 有掉落：#modal .dflip，光柱 data-tier = 掉落里最高品阶（法宝 6 + 功法 2 → 6；功法 2 → 2；法衣 7 → 7 封顶）：' + JSON.stringify([d1, d2, d3]));
      expect(!d4.has, '阶段四 4 没有掉落：不出现 .dflip：' + JSON.stringify(d4));
      // 5 空状态
      const en = async fn => { await ev(fn); await pg.waitForTimeout(400); const r = await ev(() => !!document.querySelector('#modal .empty-note')); await closeAll(pg); return r; };
      const e1 = await en(() => { const { st } = window.__xm; st.pets = []; st.petOut = -1; st.petPend = []; window.__xm.showPets(); });
      const e1n = await en(() => { const { st, L } = window.__xm; st.pets = []; st.petOut = -1; st.petPend = []; L.petGive(st, { sp: 'p_tu' }); window.__xm.showPets(); });
      const e2 = await en(() => { const { st, L } = window.__xm; L.rollVault(st); const V = L.vaultRot(st); if (V) V.slots.forEach(s => { s.sold = s.lim || 1; }); window.__xm.showSect('vault'); });
      const e2n = await en(() => { const { st, L } = window.__xm; L.rollVault(st); window.__xm.showSect('vault'); });
      const e3 = await en(() => { const { st, L } = window.__xm; window.__keys = L.BLD_KEYS.slice(); L.BLD_KEYS.splice(0, L.BLD_KEYS.length, 'array'); const pl = L.homePlots(st); const i = pl.findIndex((k, j) => j > 0 && !k); window.__xm.showHome(false, i > 0 ? i : 1); });
      await ev(() => { const { L } = window.__xm; L.BLD_KEYS.splice(0, L.BLD_KEYS.length, ...window.__keys); });
      const e3n = await en(() => { const { st, L } = window.__xm; const pl = L.homePlots(st); const i = pl.findIndex((k, j) => j > 0 && !k); window.__xm.showHome(false, i > 0 ? i : 1); });
      expect(e1 && !e1n && e2 && !e2n && e3 && !e3n, '阶段四 5 .empty-note：没灵宠 / 宝库没得换 / 空地没有可建的 时出现，反之不出现：' + JSON.stringify({ pet: [e1, e1n], vault: [e2, e2n], plot: [e3, e3n] }));
      // 6 首领 k=0..10：无报错、duelFx 正常结束；7 九宗代表；8 魔宗演武场；9 戒指爆光
      const wait = async (cond, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(cond)) return true; await pg.waitForTimeout(80); } return false; };
      const finishDuel = async () => { for (let i = 0; i < 12; i++) { const s = await ev(() => ({ fx: !!window.__xm.duelFx, ended: window.__xm.duelFx && window.__xm.duelFx.ended, modal: !document.getElementById('modal').hidden })); if (!s.fx && !s.modal) return true; if (s.fx && !s.ended) await ev(() => window.__xm.duelSkip()); else await ev(() => { const b = document.querySelector('#modal .foot .btn'); if (b) b.click(); else window.__xm.closeModal(); }); await pg.waitForTimeout(600); } return false; };
      const bossRes = (k, p, win) => ev(([k, p, win]) => { const { L } = window.__xm; window.__fb = window.__fb || L.fightBoss; L.fightBoss = (st, kk) => ({ B: L.BOSSES[kk], Q: 1000, S: 900, p, win, again: true, mat: 1, stones: 10 }); window.__xm.fightBossUI(k); L.fightBoss = window.__fb; }, [k, p, win]);
      const nBoss = await ev(() => window.__xm.L.BOSSES.length);
      for (let k = 0; k < Math.max(11, nBoss); k++) {
        await closeAll(pg); await bossRes(k, 0.7, true);
        const started = await wait(() => !!window.__xm.duelFx, 1500);
        if ([0, 7, 8].includes(k)) { await pg.waitForTimeout(700); await pg.screenshot({ path: U('wire4-boss' + k) }); }
        const done = started && await finishDuel();
        expect(started && done, `阶段四 6 首领 k=${k}：duelFx 正常开始并结束（开始 ${started}，结束 ${done}）`);
      }
      const meet = id => ev(id => { const { st, L } = window.__xm; window.__sm = window.__sm || L.sectMeet; const foe = L.NINE.find(x => x.id === id); L.sectMeet = () => ({ n: 1, start: 5, end: 4, S: 900, rounds: [{ q: 4, foe, Q: 1000, S: 900, p: 0.6, win: true, contrib: 10, stones: 10 }] }); window.__xm.runSectMeet(); L.sectMeet = window.__sm; }, id);
      for (const [id, who] of [['wanfa', 'zhuge'], ['jingang', 'huineng'], ['jian', 'jian13'], ['xuesha', null]]) {
        await closeAll(pg); await meet(id); await pg.waitForTimeout(300);
        await pg.evaluate(() => { const b = document.querySelector('#modal .foot .btn.gold'); if (b) b.click(); });
        await wait(() => !!window.__xm.duelFx, 1500);
        const r = await ev(() => { const d = window.__xm.duelFx; return d ? { stage: d.stage, who: d.bouts[0].R.who && (typeof d.bouts[0].R.who === 'string' ? d.bouts[0].R.who : 'gen'), pt: !!d.bouts[0].R.pt } : null; });
        if (id === 'xuesha') expect(r && r.stage === 'sect_mo', `阶段四 7 对手 xuesha：duelFx.stage === 'sect_mo'（${JSON.stringify(r)}）`);
        else expect(r && r.who === who && r.stage !== 'sect_mo', `阶段四 7 会武对手 ${id} 用画像小人 ${who}（${JSON.stringify(r)}）`);
        await finishDuel();
      }
      // 8 来犯 / 晋升之争的舞台
      await closeAll(pg);
      await ev(() => { const { L } = window.__xm; const o = L.sectWar; L.sectWar = () => ({ Q: 1000, S: 900, p: 0.5, win: true, contrib: 1, stones: 1 }); window.__xm.runWar(); L.sectWar = o; });
      await wait(() => !!window.__xm.duelFx, 1500);
      const war = await ev(() => window.__xm.duelFx && window.__xm.duelFx.stage); await finishDuel();
      expect(war === 'sect_mo', `阶段四 8 runWar：duelFx.stage === 'sect_mo'（${war}）`);
      const promoStage = async sect => {
        await closeAll(pg);
        await ev(sect => { const X = window.__xm, { L } = X; const s = L.newState({ name: '晋', origin: sect === 'xuesha' ? 'moyi' : undefined }); s.guide = { step: 99, done: true }; s.hintSeen = {}; for (const h of X.hints) s.hintSeen[h.id] = 1; s.storyQ = []; if (sect === 'xuesha') s.origin = 'moyi'; s.p.r = 3; s.p.s = 2; s.flags.maxR = 3; s.tick = 130; s.pact = 1; s.beaten.mu = 1; s.stats.exp = 20; s.stones = 1e5; s.rank = 50; s.home = { cave: 6, array: 8, field: 8, furnace: 8 }; for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) s.best[k + '_' + d] = 3; L.joinSect(s, sect); s.sect.rank = 2; s.sect.total = 20000; s.sect.pts = 900; X.loadState(JSON.parse(JSON.stringify(s))); X.setSpeed(3); const o = L.promote; L.promote = () => ({ duel: { S: 900, Q: 1000, p: 0.5, win: true } }); X.doPromote(); L.promote = o; }, sect);   // 晋升要的人脉等条件不好凑：直接给一场晋升之争
        await wait(() => !!window.__xm.duelFx, 2500);
        const r = await ev(() => ({ stage: window.__xm.duelFx && window.__xm.duelFx.stage, sect: window.__xm.st.sect && window.__xm.st.sect.id, title: (document.querySelector('#modal h2') || {}).textContent }));
        await finishDuel(); return r;
      };
      const pMo = await promoStage('xuesha'), pDao = await promoStage('dao'), pDan = await promoStage('dan');
      expect(/之争/.test(pMo.title) && /之争/.test(pDao.title) && pMo.sect === 'xuesha' && pMo.stage === 'sect_mo' && pDao.stage === 'sect' && pDan.stage === 'sect', '阶段四 8 魔宗弟子的晋升之争 sect_mo，其他宗门仍 sect：' + JSON.stringify([pMo, pDao, pDan]));
      // 9 越级反杀：戒指爆光约 1 秒，无报错；跳过时不播
      await closeAll(pg);
      await ev(() => { const A = window.__xm.ART, f = A.drawRingBurst; window.__rb = { n: 0, first: 0, last: 0 }; A.drawRingBurst = function () { const t = performance.now(); if (!window.__rb.n) window.__rb.first = t; window.__rb.last = t; window.__rb.n++; return f.apply(this, arguments); }; });
      await bossRes(4, 0.3, true);
      await wait(() => !!window.__xm.duelFx, 1500);
      await wait(() => window.__xm.duelFx && window.__xm.duelFx.ringT >= 0, 6000);
      await pg.waitForTimeout(1600);
      const rb = await ev(() => Object.assign({}, window.__rb)); await finishDuel();
      expect(rb.n > 0 && rb.last - rb.first >= 800 && rb.last - rb.first <= 1500, `阶段四 9 越级反杀：戒指爆光约 1 秒（${rb.n} 帧，${Math.round(rb.last - rb.first)}ms）`);
      await ev(() => { window.__rb = { n: 0, first: 0, last: 0 }; });
      await bossRes(4, 0.3, true); await wait(() => !!window.__xm.duelFx, 1500); await ev(() => window.__xm.duelSkip()); await pg.waitForTimeout(1200);
      const rb2 = await ev(() => Object.assign({}, window.__rb)); await finishDuel();
      expect(rb2.n === 0, `阶段四 9 跳过对决时不播戒指爆光（${rb2.n} 帧）`);
      await ctx.close();
    }
  }

  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
