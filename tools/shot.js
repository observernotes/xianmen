// 冒烟测试 + 截图：node tools/shot.js <输出目录>
// 速度档：SPEEDS = [1, 2, 4, 0]，setSpeed(3) 是暂停
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || path.join(__dirname, '..', 'shots');
require('fs').mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/01-intro.png' });
  for (let i = 0; i < 10; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(150); }
  await page.screenshot({ path: out + '/02-setup.png' });
  await page.click('#goStart');
  await page.waitForTimeout(2400);
  await page.screenshot({ path: out + '/03-start.png' });
  const close = async () => { await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450); await page.evaluate(() => { if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); };
  // 中期局面：元婴圆满，打通前五张图
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    window.__xm.setSpeed(3);
    st.stones = 5e4; st.p.r = 3; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.p.t = 4; st.flags.awoke = 2;
    for (const id of ['x_houtu', 'x_qingmu', 'x_changchun', 'z_hanyue', 'z_huichun', 'z_liuyun', 'm_lianxi', 'm_yufeng']) L.giveArt(st, id);
    st.arts.own.x_houtu = L.artNeed('x_houtu', 2) + 5; st.arts.own.z_hanyue = L.artNeed('z_hanyue', 1) + 3; st.arts.own.x_qingmu = L.artNeed('x_qingmu', 3);
    L.equipArt(st, 'x_houtu'); L.equipArt(st, 'z_hanyue'); L.equipArt(st, 'm_lianxi'); st.arts.swapAt = -99;
    st.home = { cave: 4, array: 9, field: 8, furnace: 5 }; st.p.age = 60; st.year = 44; st.tick = 120; st.flags.maxR = 3; st.flags.maxI = 15;
    for (let k = 0; k <= 4; k++) for (let d = 0; d < 3; d++) st.best[k + '_' + d] = k < 4 || d < 1 ? 3 : 0;
    for (let k = 0; k <= 3; k++) st.bosses[k] = 1;
    for (let k = 0; k < 15; k++) st.meta.aff[k] = 1;
    st.pact = 1; st.beaten.mu = 1; st.rank = 30; st.stats.exp = 25; st.stats.tour = 3; st.stats.retreat = 3; st.retreat = null; st.exp = null; st.herbs = 120; st.pills = 3;
    L.joinSect(st, 'dao'); st.sect.total = 3000; st.sect.pts = 900; st.sect.tasks[0].taken = 1;
    st.storyQ = []; st.guide = { step: 99, done: true };
    for (const h of ['ready', 'btGo', 'trib', 'afterPact', 'pactSoon', 'field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'market', 'furnace', 'alch', 'heal', 'sect', 'tourSoon', 'me', 'boss', 'life', 'gearPlus', 'gearRobe', 'gearOrn', 'gearForge', 'cal', 'world1', 'shelf', 'sell', 'auction', 'dao1', 'karma1', 'pet1', 'pet2', 'petEvo']) st.hintSeen[h] = 1;
    st.market.evQ = [];
    // 法宝：乾坤镜 +3（克木、锋锐）、冰蚕法衣、紫府玉简；灵矿够强化几次
    st.gear = L.newGear(); st.ore = 900; st.treasure = 2;
    L.gearDrop(st, 'w', 4, { base: 'w4_1' }); st.gear.w.aff = ['ke_mu', 'fengrui']; st.gear.w.plus = 3;
    L.gearDrop(st, 'r', 3, { base: 'r3_0' }); L.gearDrop(st, 'o', 4, { base: 'o_cul4' });
    // 灵宠：元婴名册 3 只——赤焰虎 5 级出战（可进化）、冰羽鹤护阵、月牙兔觅食
    st.pets = []; st.petOut = -1; st.petPend = []; st.feed = 400;
    L.petGive(st, { sp: 'p_hu2', src: 'shop' }); L.petGive(st, { sp: 'p_he' }); L.petGive(st, { sp: 'p_tu' });
    st.pets[0].lv = 5; st.pets[0].heart = 3; st.pets[1].lv = 3; st.herbs = 400; L.petSetJob(st, 1, 'array'); L.petSetJob(st, 2, 'forage');
    st.mats.yin.fire = 3;   // 赤焰虎进化（炎虎王）要火引 ×3
    for (const h of ['crops', 'yinGrid', 'toxin']) st.hintSeen[h] = 1;
    L.checkQuests(st); st.achQ = []; st.storyQ = [];
  });
  await close(); await page.waitForTimeout(1200);
  await page.screenshot({ path: out + '/04-home-mid.png' });
  for (const [nav, name] of [['exp', '05-exp'], ['home', '06-home'], ['sect', '07-sect'], ['market', '08-market'], ['me', '09-me']]) {
    await page.click(`[data-nav="${nav}"]`); await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${name}.png` }); await page.click('.sheet .close'); await page.waitForTimeout(450);
  }
  // 功法页：三个大槽 + 列表；换上青木长生功、回春剑诀 → 共鸣「生生不息」揭晓
  await page.evaluate(() => window.__xm.showMe('art')); await page.waitForTimeout(300); await page.screenshot({ path: out + '/09b-arts.png' });
  // 手机上不横向溢出、可点的东西都 ≥ 44 像素
  const lay = await page.evaluate(() => {
    const body = document.querySelector('#modal .body'), bad = [];
    for (const el of document.querySelectorAll('#modal [data-slot], #modal [data-art], #modal .tabs button, #modal .close')) { const r = el.getBoundingClientRect(); if (r.height < 44 || r.width < 44) bad.push(el.textContent.trim().slice(0, 8) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
    return { over: body.scrollWidth - body.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, bad };
  });
  if (lay.over > 0 || lay.page > 0) errors.push(`功法页横向溢出 ${lay.over}/${lay.page}px`);
  if (lay.bad.length) errors.push('功法页点击目标不足 44px：' + lay.bad.join('，'));
  await page.click('#modal [data-slot="1"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/09c-arts-zhan.png' });
  await page.click('#modal [data-art="z_huichun"]'); await page.waitForTimeout(250);
  await page.click('#modal [data-slot="0"]'); await page.waitForTimeout(250);
  await page.click('#modal [data-art="x_qingmu"]'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/09d-combo.png' });
  const combo = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, c: window.__xm.st.meta.combo }));
  if (combo.t !== '共鸣揭晓' || !combo.c.c1) errors.push('共鸣揭晓没有出现：' + JSON.stringify(combo));
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/09e-arts-after.png' });
  await close();
  // 法宝页：三格 + 每格下【强化】；手机上不横向溢出、可点的都 ≥ 44 像素
  await page.evaluate(() => window.__xm.showGear('w')); await page.waitForTimeout(300); await page.screenshot({ path: out + '/09f-gear.png' });
  const glay = await page.evaluate(() => {
    const body = document.querySelector('#modal .body'), bad = [];
    for (const el of document.querySelectorAll('#modal [data-gslot], #modal [data-plus], #modal [data-rf], #modal [data-glock], #modal #btnForge, #modal .tabs button')) { const r = el.getBoundingClientRect(); if (r.height < 44 || r.width < 44) bad.push(el.textContent.trim().slice(0, 8) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
    return { over: body.scrollWidth - body.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, bad, slots: document.querySelectorAll('#modal [data-gslot]').length };
  });
  if (glay.over > 0 || glay.page > 0) errors.push(`法宝页横向溢出 ${glay.over}/${glay.page}px`);
  if (glay.bad.length) errors.push('法宝页点击目标不足 44px：' + glay.bad.join('，'));
  if (glay.slots !== 3) errors.push('法宝页应有三格：' + glay.slots);
  // 强化一下：+3 → +4（90%），格子上放锤击特效
  const p0 = await page.evaluate(() => window.__xm.st.gear.w.plus);
  await page.click('#modal [data-plus="w"]'); await page.waitForTimeout(150); await page.screenshot({ path: out + '/09g-gear-plus.png' });
  const p1 = await page.evaluate(() => ({ plus: window.__xm.st.gear.w.plus, fail: window.__xm.st.gear.w.fail, msg: (document.querySelector('#modal .gdet .quote') || {}).textContent || '' }));
  if (!(p1.plus === p0 + 1 || p1.fail === 1) || !/强化(成功|失败)/.test(p1.msg)) errors.push('强化没有生效：' + JSON.stringify(p1));
  // 对比卡：寻宝开出一件兵器（槽里有了 → 弹【换上】/【熔炼】/【锁定当前】）
  await page.evaluate(() => { const { st, L } = window.__xm; st.arts.firstBox = 1; st.boxMiss = 2; st.gear.w.t = 3; st.gear.w.id = 'w3_0'; window.__xm.showMarket(); });
  await page.waitForTimeout(300); await page.click('#modal button[data-k="box"]'); await page.waitForTimeout(900); await page.screenshot({ path: out + '/08c-box-gear.png' });
  const cmp = await page.evaluate(() => { const c = document.querySelector('#modal [data-gcmp]'); if (!c) return null; const bad = [...c.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).map(b => b.textContent); return { btns: [...c.querySelectorAll('button')].map(b => b.textContent.trim()), bad, over: document.querySelector('#modal .body').scrollWidth - document.querySelector('#modal .body').clientWidth }; });
  if (!cmp || !cmp.btns.includes('换上') || !cmp.btns.some(t => t.startsWith('熔炼'))) errors.push('寻宝开出的兵器没有对比卡：' + JSON.stringify(cmp));
  else { if (cmp.bad.length) errors.push('对比卡按钮不足 44px：' + cmp.bad.join('，')); if (cmp.over > 0) errors.push('对比卡横向溢出 ' + cmp.over + 'px'); }
  await close();
  // 寻宝揭晓：头一回必得《引气诀》，卡上写具体的一门
  await page.evaluate(() => { const { st, L } = window.__xm; st.arts.firstBox = 0; delete st.arts.own.x_yinqi; window.__xm.showMarket(); });
  await page.waitForTimeout(300); await page.click('#modal button[data-k="box"]'); await page.waitForTimeout(900); await page.screenshot({ path: out + '/08b-box-art.png' });
  const boxArt = await page.evaluate(() => document.querySelector('#modal .artline') && document.querySelector('#modal .artline').textContent);
  if (!boxArt || !boxArt.includes('引气诀')) errors.push('寻宝揭晓卡没写出具体功法：' + boxArt);
  await close();
  // ---------- 灵宠（SYSTEMS §4）：兽栏、派岗、进化二选一、名册满的放生替换、洞府场景里四只灵宠 ----------
  const pet44 = (sel, what) => page.evaluate(([sel, what]) => {
    const body = document.querySelector('#modal .body'), bad = [];
    for (const el of document.querySelectorAll(sel)) { const r = el.getBoundingClientRect(); if (r.width && (r.height < 44 || r.width < 44)) bad.push(el.textContent.trim().slice(0, 8) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
    return { what, over: body ? body.scrollWidth - body.clientWidth : 0, page: document.documentElement.scrollWidth - window.innerWidth, bad };
  }, [sel, what]);
  const petLay = r => { if (r.over > 0 || r.page > 0) errors.push(`${r.what}横向溢出 ${r.over}/${r.page}px`); if (r.bad.length) errors.push(`${r.what}点击目标不足 44px：` + r.bad.join('，')); };
  await page.click('[data-nav="home"]'); await page.waitForTimeout(250);
  if (!(await page.$('#modal #btnPets'))) errors.push('洞府里没有【兽栏】入口');
  await page.click('#modal #btnPets'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/25-pets.png' });
  petLay(await pet44('#modal .pcard[data-pi], #modal .pbtns .btn, #modal #petEvo', '兽栏'));
  const pc = await page.evaluate(() => ({ n: document.querySelectorAll('#modal .pcard[data-pi]').length, glow: document.querySelectorAll('#modal .pcard.glow').length }));
  if (pc.n !== 3 || pc.glow !== 1) errors.push('兽栏应有 3 张卡、1 张发光：' + JSON.stringify(pc));
  await page.click('#modal .pcard[data-pi="1"]'); await page.waitForTimeout(250);
  await page.click('#modal #petJob'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/26-pet-jobs.png' });
  petLay(await pet44('#modal .pjob', '派岗'));
  const nj = await page.evaluate(() => document.querySelectorAll('#modal .pjob').length);
  if (nj !== 6) errors.push('派岗应有出战 + 五个岗位：' + nj);
  await page.click('#modal .pjob[data-job="field"]'); await page.waitForTimeout(300);
  if (await page.evaluate(() => window.__xm.st.pets[1].job !== 'field')) errors.push('派岗守田没生效');
  await page.click('#modal .pcard[data-pi="0"]'); await page.waitForTimeout(250);
  await page.click('#modal #petEvo'); await page.waitForTimeout(700); await page.screenshot({ path: out + '/27-pet-evo.png' });
  petLay(await pet44('#modal .pbr .btn', '进化卡'));
  await page.click('#modal [data-evo="1"]'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/27b-pet-evolving.png' });
  await page.waitForTimeout(1400); await page.screenshot({ path: out + '/27c-pet-evolved.png' });
  const evo = await page.evaluate(() => ({ form: window.__xm.st.pets[0].form, known: !!window.__xm.st.meta.petEvo.p_hu2_a, t: document.querySelector('#modal h2').textContent }));
  if (evo.form !== 1 || !evo.known || evo.t !== '进化') errors.push('进化卡没生效：' + JSON.stringify(evo));
  await close();
  // 名册满：第四只想跟你走 → 放生 / 替换卡；场景里出战的在主角身边、护阵 / 觅食 / 守田在各自岗位
  await page.evaluate(() => { const { st, L } = window.__xm; const it = L.petGive(st, { sp: 'p_sun', src: 'shop' }); window.__xm.revealItem(it); });
  await page.waitForTimeout(800); await page.screenshot({ path: out + '/28-pet-full.png' });
  petLay(await pet44('#modal [data-ppend]', '放生替换'));
  await page.click('#modal [data-ppend="0:2"]'); await page.waitForTimeout(300);
  if (await page.evaluate(() => window.__xm.st.pets[2].sp !== 'p_sun' || window.__xm.st.petPend.length)) errors.push('替换没生效');
  await close();
  await page.evaluate(() => { const { st, L } = window.__xm; st.flags.maxR = 6; st.p.r = 6; L.petGive(st, { sp: 'p_xiong', src: 'shop' }); L.petSetJob(st, 3, 'patrol'); L.petSetJob(st, 2, 'furnace'); st.pets[1].lv = 5; st.storyQ = []; st.p.r = 3; for (const h of ['art1', 'art2', 'zhanji', 'mishu']) st.hintSeen[h] = 1; });
  await page.waitForTimeout(600); await page.evaluate(() => { const ok = document.querySelector('#guide:not([hidden]) [data-g="ok"]'); if (ok) ok.click(); });
  await page.waitForTimeout(1200); await page.screenshot({ path: out + '/29-home-pets.png' });
  await page.evaluate(() => { const { st } = window.__xm; st.pets.splice(3, 1); st.flags.maxR = 3; st.pets.forEach(p => { if (p.job === 'patrol') p.job = ''; }); });
  // ---------- 历法与坊市（SYSTEMS §7、§10）：大势小牌、年历、货架、行情、拍卖竞价；手机上不横向溢出、可点的 ≥ 44 像素 ----------
  const big44 = (sel, what) => page.evaluate(([sel, what]) => {
    const body = document.querySelector('#modal .body'), bad = [];
    for (const el of document.querySelectorAll(sel)) { const r = el.getBoundingClientRect(); if (r.width && (r.height < 44 || r.width < 44)) bad.push(el.textContent.trim().slice(0, 8) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
    return { what, over: body ? body.scrollWidth - body.clientWidth : 0, page: document.documentElement.scrollWidth - window.innerWidth, bad };
  }, [sel, what]);
  const lay44 = r => { if (r.over > 0 || r.page > 0) errors.push(`${r.what}横向溢出 ${r.over}/${r.page}px`); if (r.bad.length) errors.push(`${r.what}点击目标不足 44px：` + r.bad.join('，')); };
  // ---------- 灵田与炼丹（SYSTEMS §5、§6.2）：场景里的田（ART.drawPlot）、灵田面板与作物列表、炼丹房的 5×5 药引格、试炼与丹成、战斗类丹、丹毒葫芦 ----------
  await page.evaluate(() => {
    const { st, L } = window.__xm;
    st.home.field = 16; st.home.furnace = 8; st.p.inj = 0; st.exp = null; st.retreat = null; st.visitor = null; document.querySelector('#tip').hidden = true;
    ['herb', 'fire', 'ice', 'soul', 'rice'].forEach((c, i) => { L.plant(st, i, c); L.plots(st)[i].g = [2, 5, 1, 3, 0][i]; });
    st.mats.yin = { fire: 5, ice: 3, thunder: 2, wood: 1, soul: 2 }; st.herbs = 900; st.treasure = 3; st.toxin = 45;
    st.meta.recipe = { juling: 1, baoqi: 1, qingdu: 1 }; st.dan.bag = { baoqi: [2], liaoshang: [1] }; st.dan.auto = ['juling'];
  });
  await page.waitForTimeout(900); await page.screenshot({ path: out + '/30-home-field.png' });
  const toxB = await page.evaluate(() => { const b = document.querySelector('#toxBox'); const r = b.getBoundingClientRect(); return { vis: !b.hidden && r.width > 0, t: b.textContent, half: b.classList.contains('half') }; });
  if (!toxB.vis || toxB.t !== '45' || toxB.half) errors.push('状态栏丹毒葫芦不对：' + JSON.stringify(toxB));
  // 点场景里第 2 块田（赤炎果）→ 灵田面板，选的是那一块
  await page.evaluate(() => { const c = document.querySelector('#scene'), r = c.getBoundingClientRect(), H = c.height, OY = H - 160; c.dispatchEvent(new MouseEvent('click', { clientX: r.left + (23 + 8) / 200 * r.width, clientY: r.top + (112 + 3 + OY) / H * r.height, bubbles: true })); });
  await page.waitForTimeout(400); await page.screenshot({ path: out + '/31-field.png' });
  lay44(await big44('#modal .fplot, #modal [data-crop], #modal .fscope button, #modal .close', '灵田'));
  const fp = await page.evaluate(() => ({ t: document.querySelector('#modal h2') && document.querySelector('#modal h2').textContent, n: document.querySelectorAll('#modal .fplot').length, sel: [...document.querySelectorAll('#modal .fplot')].findIndex(b => b.classList.contains('sel')), rows: document.querySelectorAll('#modal .crow').length, rec: !!document.querySelector('#modal .crow .chip.warn') }));
  if (fp.t !== '灵田' || fp.n !== 5 || fp.sel !== 1 || fp.rows !== 8 || !fp.rec) errors.push('点田没打开灵田面板（应 5 块、选第 2 块、8 种作物、有“荐”）：' + JSON.stringify(fp));
  const inc0 = await page.evaluate(() => window.__xm.L.income(window.__xm.st));
  await page.click('#modal [data-crop="rice"]'); await page.waitForTimeout(300);
  const pl = await page.evaluate(() => ({ c: window.__xm.st.crops.plots[1].c, inc: window.__xm.L.income(window.__xm.st), msg: (document.querySelector('#modal .quote') || {}).textContent || '' }));
  if (pl.c !== 'rice' || !(pl.inc > inc0) || !pl.msg.includes('改种灵稻')) errors.push('改种灵稻没生效：' + JSON.stringify(pl));
  await page.click('#modal [data-scope="1"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/31b-field-all.png' });
  await page.click('#modal [data-crop="vine"]'); await page.waitForTimeout(300);
  if (await page.evaluate(() => !window.__xm.st.crops.plots.every(x => x.c === 'vine'))) errors.push('【全部改种】长生藤没生效');
  await page.evaluate(() => { const { st, L } = window.__xm; ['herb', 'fire', 'ice', 'soul', 'rice'].forEach((c, i) => L.plant(st, i, c)); });
  await close();
  // 炼丹房：5×5 药引格（15 格，已揭晓 3 格），修炼 / 战斗 / 根基三页，续炼勾着聚灵丹
  await page.evaluate(() => window.__xm.showAlchemy()); await page.waitForTimeout(300);
  await page.click('#modal .atabs [data-tab="grid"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/32-alchemy.png' });
  lay44(await big44('#modal .yc[data-cell], #modal button[data-r], #modal [data-auto], #modal [data-take], #modal .atabs button, #modal .close', '炼丹房'));
  const ag = await page.evaluate(() => ({ cells: document.querySelectorAll('#modal .yc[data-cell]').length, can: document.querySelectorAll('#modal .yc.can').length, tabs: [...document.querySelectorAll('#modal .atabs button')].map(b => b.textContent), auto: !!document.querySelector('#modal [data-auto="juling"].on') }));
  if (ag.cells !== 15 || ag.tabs.length !== 4) errors.push('炼丹房的药引格 / 分页 / 续炼不对：' + JSON.stringify(ag));
  // 点“火引 + 魂引”（没揭晓）→【试炼】→ 丹成揭晓悟道丹（成丹固定：R = 0.3）
  await page.click('#modal [data-cell="fire|soul"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/32b-cell.png' });
  await page.evaluate(() => { window.__rng0 = window.__xm.L.rng; window.__xm.L.rng = () => 0.3; });
  await page.click('#modal #btnTrial'); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/32c-trial.png' });
  await page.evaluate(() => { window.__xm.L.rng = window.__rng0; });
  const tr = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, k: !!window.__xm.st.meta.recipe.wudao, y: window.__xm.st.mats.yin }));
  if (tr.t !== '试出新丹方' || !tr.k || tr.y.fire !== 4 || tr.y.soul !== 1) errors.push('试炼没揭晓悟道丹：' + JSON.stringify(tr));
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  await page.click('#modal .atabs [data-tab="z"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/32d-battle.png' });
  lay44(await big44('#modal button[data-r], #modal [data-auto], #modal [data-take]', '炼丹房·战斗'));
  const pw0 = await page.evaluate(() => window.__xm.L.power(window.__xm.st));
  await page.click('#modal [data-take="baoqi"]'); await page.waitForTimeout(300);
  const bq = await page.evaluate(() => ({ n: window.__xm.L.danNext(window.__xm.st, 'baoqi'), pw: window.__xm.L.power(window.__xm.st), tox: window.__xm.st.toxin, msg: (document.querySelector('#modal .quote') || {}).textContent || '' }));
  if (!(Math.abs(bq.n - 1.39) < 1e-9) || Math.abs(bq.pw / pw0 - 1.39) > 1e-6 || bq.tox !== 65 || !bq.msg.includes('服下上品爆气丹')) errors.push('服爆气丹不对（上品 ×1.39、丹毒 55 → 65）：' + JSON.stringify(bq));
  await page.click('#modal .atabs [data-tab="x"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/32e-cul.png' });
  if (await page.evaluate(() => !document.querySelector('#modal [data-auto="juling"].on'))) errors.push('修炼页的聚灵丹没显示“续炼中”');
  await page.click('#modal .atabs [data-tab="g"]'); await page.waitForTimeout(250); await page.screenshot({ path: out + '/32f-root.png' });
  await close();
  await page.evaluate(() => { const { st } = window.__xm; st.toxin = 72; }); await page.waitForTimeout(500);
  await page.screenshot({ path: out + '/33-toxin.png', clip: { x: 0, y: 0, width: 390, height: 80 } });
  if (await page.evaluate(() => !document.querySelector('#toxBox').classList.contains('half'))) errors.push('丹毒过 60 葫芦没变色');
  await page.evaluate(() => { const { st } = window.__xm; st.toxin = 0; delete st.dan.next.baoqi; });
  await page.evaluate(() => {
    const { st, L } = window.__xm; st.p.inj = 0; st.exp = null; st.retreat = null; st.visitor = null;
    for (const h of ['cal', 'world1', 'shelf', 'sell', 'auction', 'art1', 'art2', 'zhanji', 'mishu', 'ke', 'gearCmp']) st.hintSeen[h] = 1;
    st.tick = 152; st.stones = 5e5; st.pills = 10; st.herbs = 300; st.ore = 60;
    st.cal.w = { id: 'w_dahan', at: 146, until: 154 }; st.market.idx = { herb: 1.4, ore: 0.8, pill: 1.2 };
    L.restock(st, true); L.rollAuction(st); st.market.evQ = []; document.querySelector('#tip').hidden = true;
  });
  for (let i = 0; i < 8; i++) { const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (!o) break; await o.click(); await page.waitForTimeout(150); }   // 老祖还没讲完的先点掉
  await page.evaluate(() => { document.querySelector('#tip').hidden = true; });
  await page.waitForTimeout(600); await page.screenshot({ path: out + '/20-world-tag.png' });
  const wt = await page.evaluate(() => { const el = document.querySelector('#worldTag'); const r = el.getBoundingClientRect(); return { vis: !el.hidden && r.width > 0, w: r.width, h: r.height, txt: el.textContent }; });
  if (!wt.vis || wt.w < 44 || wt.h < 44 || !wt.txt.includes('大旱')) errors.push('大势小牌不对：' + JSON.stringify(wt));
  await page.click('#worldTag'); await page.waitForTimeout(400); await page.screenshot({ path: out + '/21-calendar.png' });
  const calT = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, strip: (document.querySelector('#calStrip') || {}).naturalWidth, w: (document.querySelector('#calStrip') || { getBoundingClientRect: () => ({ width: 0 }) }).getBoundingClientRect().width }));
  if (calT.t !== '年历' || calT.strip !== 194 || calT.w < 194) errors.push('年历没有打开或时间轴不对：' + JSON.stringify(calT));
  lay44(await big44('#modal .calgo, #modal .close', '年历'));
  await close();
  await page.click('[data-nav="market"]'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/22-shelf.png' });
  lay44(await big44('#modal .mbuy, #modal .close', '货架'));
  const shelfN = await page.evaluate(() => document.querySelectorAll('#modal .shelfrow').length);
  if (shelfN < 6) errors.push('货架不足 6 格：' + shelfN);
  await page.evaluate(() => document.querySelector('#mktSell').scrollIntoView()); await page.waitForTimeout(150); await page.screenshot({ path: out + '/23-sell.png' });
  lay44(await big44('#modal [data-sell]', '行情'));
  // 指数 1.4 + 秋 0.2，大旱 ×1.6 → ×2.56
  const herb0 = await page.evaluate(() => ({ h: window.__xm.st.herbs, s: window.__xm.st.stones, m: window.__xm.L.sellMult(window.__xm.st, 'herb'), txt: document.querySelector('#modal [data-good="herb"]').textContent }));
  if (Math.abs(herb0.m - 2.56) > 1e-9 || !herb0.txt.includes('灵草 ×2.56') || !herb0.txt.includes('高于平时')) errors.push('行情没写“灵草 ×2.56 ↑ 高于平时”：' + herb0.txt.slice(0, 40));
  await page.click('#modal [data-sell="herb:0.5"]'); await page.waitForTimeout(300);
  const herb1 = await page.evaluate(() => ({ h: window.__xm.st.herbs, s: window.__xm.st.stones }));
  if (herb1.h !== herb0.h - Math.floor(herb0.h / 2) || herb1.s <= herb0.s) errors.push('卖一半没生效：' + JSON.stringify([herb0, herb1]));
  await page.evaluate(() => document.querySelector('#aucBox').scrollIntoView()); await page.waitForTimeout(150); await page.screenshot({ path: out + '/24-auction.png' });
  lay44(await big44('#modal .bidb', '拍卖'));
  const nb = await page.evaluate(() => document.querySelectorAll('#modal .bidb').length);
  if (nb !== 9) errors.push('三件拍品各三档出价，应有 9 个按钮：' + nb);
  await page.click('#modal [data-bid="0:2"]'); await page.waitForTimeout(900); await page.screenshot({ path: out + '/24b-auction-bid.png' });
  const bid = await page.evaluate(() => ({ bids: window.__xm.st.auction.bids, res: window.__xm.st.auction.items[0].res }));
  if (bid.bids !== 1 || !bid.res) errors.push('豪掷没有出价：' + JSON.stringify(bid));
  await close();
  // ---------- 秘境（SYSTEMS §8）：历练页入口、进入确认、一层的门卡、老祖三句、房间结果、奇遇、行商、秘藏、结算；手机上不溢出、可点的 ≥ 44 像素 ----------
  await page.evaluate(() => {
    const { st, L } = window.__xm; st.exp = null; st.retreat = null; st.visitor = null; st.p.inj = 0; st.cal.w = null; st.auction = null;
    st.tick = 160; st.mj = L.newMj(); st.mj.token = 2; st.mj.giftYr = Math.floor(160 / 12); st.hintSeen.realmOpen = 1; st.storyQ = []; document.querySelector('#tip').hidden = true;
  });
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/25-exp-realm.png' });
  const mjCard = await page.evaluate(() => { const c = document.querySelector('#modal #mjCard'); return c ? c.textContent : ''; });
  if (!mjCard.includes('秘境') || !mjCard.includes('可进')) errors.push('历练页没有秘境入口：' + mjCard.slice(0, 40));
  await page.click('#modal #mjCard'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/26-realm-entry.png' });
  lay44(await big44('#modal .foot .btn, #modal .close', '秘境入口'));
  const ent = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, chips: document.querySelectorAll('#modal .mjfloor span').length, btn: document.querySelector('#modal .foot .btn.gold') && document.querySelector('#modal .foot .btn.gold').textContent }));
  if (!/秘境/.test(ent.t) || ent.chips < 6 || !/进入/.test(ent.btn || '')) errors.push('秘境入口页不对：' + JSON.stringify(ent));
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(900); await page.screenshot({ path: out + '/27-realm-floor.png' });
  const fl = await page.evaluate(() => { const ds = [...document.querySelectorAll('#realmDoors .mjdoor')]; return { run: !!window.__xm.st.run, tok: window.__xm.st.mj.token, n: ds.length, small: ds.filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length, hint: (document.querySelector('#guide:not([hidden]) .gtext') || {}).textContent || '', page: document.documentElement.scrollWidth - window.innerWidth }; });
  if (!fl.run || fl.tok !== 1 || fl.n < 2) errors.push('进秘境后没有门卡：' + JSON.stringify(fl));
  if (fl.small) errors.push('秘境门卡不足 44px：' + fl.small);
  if (fl.page > 0) errors.push('秘境场景横向溢出 ' + fl.page + 'px');
  if (!/每层.*扇门.*掉 \d+ 气血/.test(fl.hint)) errors.push('老祖第一句没讲门与气血：' + fl.hint.slice(0, 50));
  for (let i = 0; i < 3; i++) { const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (!o) break; await o.click(); await page.waitForTimeout(250); if (i < 2) await page.screenshot({ path: `${out}/27${'bc'[i]}-realm-elder.png` }); }
  const seen = await page.evaluate(() => ['realm1', 'realm2', 'realm3'].filter(h => window.__xm.st.hintSeen[h]).length);
  if (seen !== 3) errors.push('老祖的三句没讲完：' + seen);
  // 一间战斗房：动画 → 飘字 → 下一层
  await page.evaluate(() => { const { st } = window.__xm; st.run.doors = [{ t: 'fight', unk: false }, { t: 'spring', unk: false }]; window.__xm_realm.syncRealmUI(true); });
  const hp0 = await page.evaluate(() => window.__xm.st.run.hp);
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(450); await page.screenshot({ path: out + '/28-realm-fight.png' });
  await page.waitForTimeout(800); await page.screenshot({ path: out + '/29-realm-result.png' });
  const r1 = await page.evaluate(() => ({ hp: window.__xm.st.run.hp, floor: window.__xm.st.run.floor, loot: window.__xm.st.run.loot.length, floats: [...document.querySelectorAll('#fx .float')].map(e => e.textContent), leave: !!document.querySelector('#realmLeave') }));
  if (!(r1.hp < hp0) || r1.floor !== 2 || r1.loot < 1 || !r1.floats.some(t => /^−\d+$/.test(t)) || !r1.leave) errors.push('战斗房结果不对：' + JSON.stringify(r1));
  lay44(await big44('#realmLeave', '秘境离开按钮'));
  // 奇遇房（where: 'realm' 事件）
  await page.evaluate(() => { const { st } = window.__xm; st.run.doors = [{ t: 'event', unk: false }, { t: 'chest', unk: true }]; window.__xm_realm.syncRealmUI(true); });
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(1300); await page.screenshot({ path: out + '/30-realm-event.png' });
  const evm = await page.evaluate(() => ({ ph: window.__xm.st.run.phase, ev: window.__xm.st.run.ev, t: (document.querySelector('#modal h2') || {}).textContent }));
  if (evm.ph !== 'event' || !/^realm_/.test(evm.ev || '') || !evm.t) errors.push('奇遇房没有弹出秘境事件：' + JSON.stringify(evm));
  else { await page.click('#modal .choices button[data-c]:not([disabled])'); await page.waitForTimeout(1500); const b = await page.$('#modal .foot .btn:not([disabled])'); if (b) await b.click(); await page.waitForTimeout(600); }
  const af = await page.evaluate(() => ({ ph: window.__xm.st.run && window.__xm.st.run.phase, fl: window.__xm.st.run && window.__xm.st.run.floor }));
  if (af.ph !== 'door') errors.push('奇遇处理完没回到门前：' + JSON.stringify(af));
  // 行商
  await page.evaluate(() => { const { st } = window.__xm; st.run.hp = Math.max(st.run.hp, 40); st.run.doors = [{ t: 'shop', unk: false }]; window.__xm_realm.syncRealmUI(true); });
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(1800); await page.screenshot({ path: out + '/31-realm-shop.png' });
  lay44(await big44('#modal [data-shop], #modal .foot .btn', '秘境行商'));
  const shopN = await page.evaluate(() => document.querySelectorAll('#modal [data-shop]').length);
  if (shopN !== 3) errors.push('行商应有三件货：' + shopN);
  await page.click('#modal .foot .btn'); await page.waitForTimeout(500);
  // 气血见底：老祖气泡“该走了”
  await page.evaluate(() => { const { st } = window.__xm; st.run.hp = 18; st.run.warned = 0; window.__xm_realm.syncRealmUI(true); window.__xm_realm.realmLowTip(); });
  await page.waitForTimeout(400); await page.screenshot({ path: out + '/32-realm-lowhp.png' });
  const low = await page.evaluate(() => (document.querySelector('#guide:not([hidden]) .gtext') || {}).textContent || '');
  if (!/该走了.*\d+.*件/.test(low)) errors.push('低气血没有老祖气泡：' + low.slice(0, 40));
  { const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (o) { await o.click(); await page.waitForTimeout(200); } }
  // 守关 → 秘藏三选一 → 结算
  await page.evaluate(() => { const { st } = window.__xm; const r = st.run; r.floor = r.floors; r.max = 999; r.hp = 999; r.doors = [{ t: 'boss', unk: false }]; window.__xm_realm.syncRealmUI(true); });
  await page.click('#realmDoors [data-door="0"]'); await page.waitForTimeout(2300); await page.screenshot({ path: out + '/33-realm-chest.png' });
  const ch = await page.evaluate(() => ({ t: (document.querySelector('#modal h2') || {}).textContent, n: document.querySelectorAll('#modal [data-chest]').length, rec: document.querySelectorAll('#modal [data-chest] .chip.ok').length }));
  if (ch.t !== '秘藏' || ch.n !== 3 || ch.rec !== 1) errors.push('秘藏三选一不对：' + JSON.stringify(ch));
  lay44(await big44('#modal [data-chest]', '秘藏'));
  await page.click('#modal [data-chest] .chip.ok'); await page.waitForTimeout(600); await page.screenshot({ path: out + '/34-realm-end.png' });
  const end = await page.evaluate(() => ({ run: window.__xm.st.run, t: (document.querySelector('#modal h2') || {}).textContent, clears: window.__xm.L.mjRec(window.__xm.st).clears, tick: window.__xm.st.tick, title: window.__xm.st.title }));
  if (end.run || !/打穿/.test(end.t || '') || end.clears < 1 || end.tick !== 163) errors.push('秘境通关结算不对：' + JSON.stringify(end));
  await close();
  // 历练确认页（血煞秘境·外围·寻宝）与札记
  await page.evaluate(() => window.__xm.confirmExp(4, 0, 1)); await page.waitForTimeout(300); await page.screenshot({ path: out + '/05b-confirm.png' });
  await close();
  await page.click('#goal'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/05c-quests.png' }); await close();
  // ---------- 天劫（SYSTEMS §9）：准备页（护劫手段）→ 心魔劫 → 落雷与护体条 → 那一停 → 道基印；人物页的道心与因果 ----------
  await page.evaluate(() => {
    const { st, L } = window.__xm; st.daolv = 'su'; st.npc.su = { aff: 72, f60: 1 }; st.pills = 10; st.p.inj = 0; st.exp = null; st.retreat = null;
    for (const h of ['tribPause', 'tribNow']) st.hintSeen[h] = 1;
    const ev = L.eventById('world_tongji'); if (!L.karmaOpen(st).length) L.addKarma(st, 'tongji', ev, ev.choices[1]);
    st.dao = { k: 4, w: 9, r: 6 }; document.querySelector('#tip').hidden = true;
  });
  await page.click('#cult'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/10-bt.png' });
  const prep = await page.evaluate(() => ({ aids: document.querySelectorAll('#modal #tribAids .aid').length, rate: document.querySelector('#btRate').textContent, title: document.querySelector('#modal h2').textContent }));
  if (prep.aids !== 5 || prep.title !== '境界突破') errors.push('天劫准备页没有五样护劫手段：' + JSON.stringify(prep));
  lay44(await big44('#modal [data-aid], #modal [data-st], #modal .foot .btn, #modal .close', '天劫准备页'));
  await page.evaluate(() => document.querySelector('#tribAids').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await page.screenshot({ path: out + '/10b-bt-aids.png' });
  await page.click('.foot .btn.gold'); await page.waitForTimeout(500); await page.screenshot({ path: out + '/10c-demon.png' });
  const dmn = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, bd: !!document.querySelector('#modal .demonbd'), q: (document.querySelector('#modal .dq') || {}).textContent || '' }));
  if (!dmn.t.includes('心魔') || !dmn.bd || !dmn.q.includes('没有选')) errors.push('心魔劫卡不对：' + JSON.stringify(dmn));
  lay44(await big44('#modal .choices .btn', '心魔劫'));
  await page.click('#modal .choices .btn[data-c="0"]'); await page.waitForTimeout(400); await page.screenshot({ path: out + '/10d-demon-res.png' });
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(2900); await page.screenshot({ path: out + '/11-trib.png' });
  const cs = await page.evaluate(() => { const c = window.__xm.cineState; return c && { trib: c.trib, idx: c.idx, N: c.N, shield: c.shield }; });
  if (!cs || !cs.trib || cs.idx < 1) errors.push('雷劫过场没有落雷：' + JSON.stringify(cs));
  for (let i = 0; i < 50; i++) { if (await page.evaluate(() => !!document.querySelector('#tribPause'))) break; await page.waitForTimeout(200); }
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/11b-trib-pause.png' });
  const pz = await page.evaluate(() => ({ hint: (document.querySelector('#tribHint') || {}).textContent, bar: !!document.querySelector('#tribPause .shieldimg') }));
  if (!['大概能过', '悬', '过不了'].includes(pz.hint) || !pz.bar) errors.push('那一停没有护体条与提示：' + JSON.stringify(pz));
  lay44(await big44('#modal [data-ex], #modal [data-exp], #modal .foot .btn', '那一停'));
  for (let i = 0; i < 2; i++) { const b = await page.$('#modal [data-exp="1"]:not([disabled])'); if (b) { await b.click(); await page.waitForTimeout(150); } }
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(1300); await page.screenshot({ path: out + '/11c-trib-final.png' });
  for (let i = 0; i < 40 && await page.evaluate(() => window.__xm.cine); i++) await page.waitForTimeout(200);
  await page.waitForTimeout(300); await page.screenshot({ path: out + '/12-btres.png' });
  const bres = await page.evaluate(() => ({ t: document.querySelector('#modal h2').textContent, stamp: !!document.querySelector('#tribGrade img'), r: window.__xm.st.p.r }));
  if (bres.t !== '渡劫成功' || !bres.stamp || bres.r !== 4) errors.push('补满手段后渡劫应成功并盖道基印：' + JSON.stringify(bres));
  await close();
  await page.evaluate(() => window.__xm.showMe('dao')); await page.waitForTimeout(300); await page.screenshot({ path: out + '/25-dao.png' });
  lay44(await big44('#modal .tabs button, #modal .close', '人物 · 道心'));
  const dui = await page.evaluate(() => ({ rows: document.querySelectorAll('#modal .daorow').length, k: document.querySelectorAll('#modal .krow').length, recs: document.querySelectorAll('#modal .grec').length }));
  if (dui.rows !== 3 || dui.k < 1 || dui.recs < 1) errors.push('人物 · 道心页缺东西：' + JSON.stringify(dui));
  await page.evaluate(() => document.querySelector('#karmaBox').scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await page.screenshot({ path: out + '/25b-dao-karma.png' });
  await close();
  await page.evaluate(() => { const { st } = window.__xm; st.storyQ = []; st.p.r = 3; st.p.s = 2; st.sect.total = 20000; window.__xm.doPromote(); }); await page.waitForTimeout(1500); await page.screenshot({ path: out + '/13-promo-duel.png' });
  await page.click('.foot .btn:not([disabled])'); await page.waitForTimeout(300); await close();
  await page.evaluate(() => window.__xm.runTournament()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1400); await page.screenshot({ path: out + '/14-tour.png' });
  for (let i = 0; i < 6; i++) { const b = await page.$('#modal:not([hidden]) .foot .btn:not([disabled])'); if (!b) break; await b.click(); await page.waitForTimeout(1350); }
  await close();
  // 历练途中（本趟收获条）与结算卡
  await page.evaluate(() => { const { st, L } = window.__xm; st.p.inj = 0; L.startExp(st, 3, 1, 0); });
  await page.evaluate(() => window.__xm.setSpeed(0)); await page.waitForTimeout(3500); await page.screenshot({ path: out + '/15-adv.png' });
  await page.evaluate(() => window.__xm.setSpeed(3));
  await page.evaluate(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); }); await page.waitForTimeout(700); await page.screenshot({ path: out + '/15b-result.png' });
  await close();
  await page.evaluate(() => { const { st, L } = window.__xm; st.exp = null; st.retreat = null; L.startExp(st, 4, 0, 1); }); await page.evaluate(() => window.__xm.setSpeed(0)); await page.waitForTimeout(3000); await page.screenshot({ path: out + '/16-adv2.png' });
  await page.evaluate(() => { window.__xm.setSpeed(3); window.__xm.st.exp = null; const s = window.__xm.st; s.p.inj = 2; s.stones = 5e4; }); await page.waitForTimeout(300);
  await page.click('[data-nav="home"]'); await page.waitForTimeout(300); await page.screenshot({ path: out + '/16b-home-heal.png' }); await close();
  await page.evaluate(() => { const s = window.__xm.st; s.p.inj = 0; window.__xm.L.startRetreat(s); }); await page.waitForTimeout(800); await page.screenshot({ path: out + '/16c-retreat.png' });
  await page.evaluate(() => { const s = window.__xm.st; s.retreat = null; s.sect = null; window.__xm.showInvite(); }); await page.waitForTimeout(300); await page.screenshot({ path: out + '/17-invite.png' });
  await close();
  await page.evaluate(() => window.__xm.showDeath()); await page.waitForTimeout(300); await page.click('.foot .btn.gold'); await page.waitForTimeout(1900); await page.screenshot({ path: out + '/18-rebirth.png' });
  await page.click('.cand[data-i="0"]'); await page.click('.foot .btn.gold'); await page.waitForTimeout(800); await page.screenshot({ path: out + '/19-newlife.png' });
  const meta = await page.evaluate(() => Object.keys(window.__xm.st.meta.aff).length);
  if (meta < 15) errors.push('转世后相性图鉴没有保留（' + meta + '）');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(e => { console.error('TEST FAIL', e.message.split('\n').slice(0, 4).join('\n')); process.exit(1); });
