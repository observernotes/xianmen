// 新手引导流程测试：按真实玩家的点法走一遍新流程（DESIGN §2.4 / §4.2），逐步截图并核对台词里的数字
// node tools/guide_test.js <输出目录> [设备名|desktop|360]
// 速度档：SPEEDS = [1, 2, 4, 0]，setSpeed(2) 是 ×4，setSpeed(3) 是暂停
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2]; const dev = process.argv[3] || 'Pixel 7';
require('fs').mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
(async () => {
  const b = await chromium.launch();
  const opts = dev === 'desktop' ? { viewport: { width: 1280, height: 860 } } : dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
  const page = await (await b.newContext(opts)).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(800);
  const shot = async n => { await page.waitForTimeout(350); await page.screenshot({ path: `${out}/${n}.png` }); };
  const gtext = () => page.evaluate(() => document.getElementById('guide').hidden ? '(hidden)' : document.querySelector('#guide .gtext').textContent);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const tick = () => ev(() => window.__xm.st.tick);
  const log = async n => { await page.waitForTimeout(300); const t = await gtext(); console.log(n, '| t' + await tick(), '|', t.slice(0, 60)); return t; };
  const ok = async () => { await page.waitForSelector('#guide:not([hidden]) [data-g="ok"]', { timeout: 4000 }); await page.click('#guide [data-g="ok"]'); await page.waitForTimeout(200); };
  const has = (t, s) => t.includes(s);
  const dismiss = async () => { for (let i = 0; i < 6; i++) { const o = await page.$('#guide:not([hidden]) [data-g="ok"]'); if (!o) break; await log('hint'); await o.click(); await page.waitForTimeout(150); } };
  // 关掉队列里冒出来的弹窗（主线剧情、成就等）：有选项点第一个能点的，否则点最后一个按钮
  const drain = async () => {
    for (let i = 0, guard = 0; i < 12 && guard < 80; guard++) {
      await page.waitForTimeout(450);
      if (await ev(() => window.__xm.cine)) continue;
      i++;
      const open = await ev(() => !document.getElementById('modal').hidden);
      if (!open) return;
      const ch = await page.$('#modal .choices .btn:not([disabled])');
      if (ch) { await ch.click(); continue; }
      const btns = await page.$$('#modal .foot .btn:not([disabled])');
      if (btns.length) await btns[btns.length - 1].click(); else await ev(() => window.__xm.closeModal());
    }
  };
  // 推进 n 个周天（两条非紧急提示之间至少隔 2 周天）
  const adv = n => ev(n => { const X = window.__xm; for (let i = 0; i < n; i++) { X.L.flow(X.st, 1); X.onTick(); } }, n);

  // E01：老祖说话时时间应当暂停
  let t = await log('E01'); await shot('g01-welcome');
  const t0 = await tick(); await page.waitForTimeout(6000); const t1 = await tick();
  check(t0 === t1, `老祖说话时时间暂停（${t0}→${t1}）`);
  await ok(); t = await log('E02'); await shot('g02-stakes');
  const pi = await ev(() => { const { st, L } = window.__xm; const p = L.pactInfo(st); return { left: p.left, Q: L.fmt(p.Q), base: L.fmt(p.base), assist: p.assist, p: L.pct(p.p) }; });
  check(has(t, `还剩 ${pi.left} 个周天`) && has(t, `战力 ${pi.Q}`) && has(t, `你 ${pi.base}`) && has(t, `翻 ${pi.assist} 倍`) && has(t, `胜算才 ${pi.p}`), `E02 数字：${pi.left} 周天 / 她 ${pi.Q} / 你 ${pi.base} / ×${pi.assist} / ${pi.p}`);
  await ok(); t = await log('E03');
  // 锁住的入口：坊市要先历练一趟
  await page.click('[data-nav="market"]'); await page.waitForTimeout(200); await log('E03-lock'); await shot('g03-locked');
  await ok(); await log('E03'); await shot('g04-expnav');
  await page.click('[data-nav="exp"]'); t = await log('E04'); await shot('g05-exppick');
  check(has(t, '推荐战力 6') && has(t, '你 10'), 'E04 推荐战力 6、你 10');
  check(await ev(() => document.querySelectorAll('#modal .card[data-k]').length === 1), '第一趟只有后山野林一格可选');
  await page.click('#modal .card[data-k="0"]'); t = await log('E05'); await shot('g06-expgo');
  const conf = await ev(() => ({ rate: document.querySelector('#expRate').textContent, dis: [...document.querySelectorAll('#modal .segb')].filter(x => x.disabled).length, fc: window.__xm.L.expForecast(window.__xm.st, 0, 0, 0).text }));
  check(conf.rate === '甲' && conf.fc === '甲', `确认页预计评价 ${conf.rate}（逻辑 ${conf.fc}）`);
  check(conf.dis === 4, `第一趟深度、行事其余 4 格不可选（${conf.dis}）`);
  check(has(t, '4 个周天'), 'E05 写明 4 个周天');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(800); t = await log('E06'); await shot('g07-haul');
  check(await ev(() => !!window.__xm.st.exp && !document.getElementById('haul').hidden), '出发后本趟收获条可见');
  await ok(); await log('E06-done');
  // 等这一趟回来（直接快进）
  await ev(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); });
  await page.waitForTimeout(700); await shot('g08-expresult');
  const res = await ev(() => ({ btns: [...document.querySelectorAll('#modal .foot .btn')].map(x => x.textContent), stamp: (document.querySelector('#modal .stamp') || {}).textContent }));
  check(res.stamp === '甲', `第一张结算卡盖印“甲”（${res.stamp}）`);
  check(res.btns.length === 1 && res.btns[0] === '回洞府', `第一张结算卡只有【回洞府】（${res.btns.join('/')}）`);
  await page.click('#modal .foot .btn'); await page.waitForTimeout(600); t = await log('E07'); await shot('g09-afterexp');
  const e7 = await ev(() => { const { st, L } = window.__xm; return { pw: L.fmt(L.power(st)), p: L.pct(L.pactInfo(st).p) }; });
  check(has(t, `→ ${e7.pw}`) && has(t, `${e7.p}`), `E07 战力 → ${e7.pw}、胜算 ${e7.p}`);
  await ok(); t = await log('E08a'); await shot('g10-homenav');
  await page.click('[data-nav="home"]'); t = await log('E08b'); await shot('g11-homearray');
  const e8 = await ev(() => { const { st, L } = window.__xm; const u = L.upInfo(st, 'array'); return { cost: L.fmt(u.cost) }; });
  check(has(t, `${e8.cost} 灵石`), `E08b 聚灵阵价格 ${e8.cost}`);
  await page.click('#modal button[data-k="array"]'); await page.waitForTimeout(300);
  check(await ev(() => window.__xm.st.home.array === 1), '聚灵阵升到 1 级');
  await page.click('#modal .close'); await page.waitForTimeout(300); t = await log('E09'); await shot('g12-quests');
  check(has(t, '札记'), 'E09 指向札记');
  await ok();
  const done = await ev(() => window.__xm.st.guide.done);
  console.log('guide done (E01–E09):', done);
  check(done, '新手引导完成');

  await ev(() => window.__xm.setSpeed(3)); await page.waitForTimeout(300); await dismiss();
  await page.click('#goal'); await page.waitForTimeout(300); await shot('g13-quests-panel');
  await ev(() => window.__xm.closeModal()); await dismiss();
  await page.click('#stats [data-s="big"]'); await page.waitForTimeout(300); await shot('g14-pact');
  await ev(() => window.__xm.closeModal()); await dismiss();
  await page.click('#btnHelp'); await page.waitForTimeout(300); await shot('g15-help');
  await ev(() => window.__xm.closeModal()); await dismiss();
  await page.click('#stats [data-s="atk"]'); await page.waitForTimeout(300); await shot('g16-growth');
  await ev(() => window.__xm.closeModal()); await dismiss();

  // 第二趟：行事多了采药，确认页能选
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(200); await page.click('#modal .card[data-k="0"]'); await page.waitForTimeout(300);
  check(await ev(() => !document.querySelector('#modal [data-a="2"]').disabled && document.querySelector('#modal [data-a="1"]').disabled), '第二趟采药可选、寻宝未开');
  await page.click('#modal [data-a="2"]'); await page.waitForTimeout(250); await shot('g17-confirm-herb');
  const fc2 = await ev(() => ({ ui: document.querySelector('#expRate').textContent, L: (() => { const { st, L } = window.__xm; return L.expForecast(st, 0, 0, 2).text; })() }));
  check(fc2.ui === fc2.L, `采药预计评价与逻辑一致（${fc2.ui}）`);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
  await ev(() => { const X = window.__xm; X.st.exp.left = 1; X.L.flow(X.st, 1); X.onTick(); }); await page.waitForTimeout(700);
  await shot('g18-result2');
  const r2 = await ev(() => [...document.querySelectorAll('#modal .foot .btn')].map(x => x.textContent));
  check(r2.includes('再探一次') || r2.includes('回去疗伤') || r2.includes('回去突破'), `第二张结算卡有【再探一次】（${r2.join('/')}）`);
  await page.click('#modal .foot .btn.alt'); await page.waitForTimeout(500); await dismiss();

  // E11 闭关：升到炼气中期、人在洞府
  await ev(() => { const { st, L } = window.__xm; st.visitor = null; st.p.xp = L.pNeed(st.p) - 0.5; L.addXp(st, 1); });
  for (let i = 0; i < 4 && !(await gtext()).includes('闭关'); i++) { await dismiss(); await adv(1); await ev(() => { window.__xm.st.visitor = null; if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(500); }
  t = await log('E11'); console.log('   guide state', JSON.stringify(await ev(() => window.__xm.guideDbg)), await ev(() => { const { st, L } = window.__xm; return [L.retOpen(st), st.stats.retreat, L.busy(st), L.isFull(st), st.tick, L.stageName(st.p)].join(','); }));
  check(has(t, '闭关') && has(t, '×2'), 'E11 讲闭关 ×2');
  await shot('g19-retreat-hint'); await ok();
  await page.click('[data-nav="home"]'); await page.waitForTimeout(300); await shot('g20-home-retreat');
  const ri = await ev(() => { const { st, L } = window.__xm; const r = L.retInfo(st); return { m: r.m.toFixed(2), free: r.free, extra: L.fmt(r.extra), ui: document.querySelector('#btnRet') && document.querySelector('#btnRet').textContent, card: document.querySelector('#modal .body').textContent }; });
  check(ri.free && ri.ui === '免费' && ri.card.includes('×' + ri.m) && ri.card.includes('+' + ri.extra), `洞府闭关卡：免费、×${ri.m}、修为 +${ri.extra}`);
  await page.click('#btnRet'); await page.waitForTimeout(300);
  check(await ev(() => !!window.__xm.st.retreat), '开始闭关');
  await ev(() => { const X = window.__xm; for (let i = 0; i < 4; i++) { X.L.flow(X.st, 1); X.onTick(); } }); await page.waitForTimeout(500); await dismiss();
  check(await ev(() => !window.__xm.st.retreat && window.__xm.st.stats.retreat === 1), '闭关 4 周天后出关');
  // 第二次闭关：要花灵石
  await ev(() => { window.__xm.st.stones += 2000; window.__xm.closeModal(); }); await page.waitForTimeout(300); await dismiss();
  await page.click('[data-nav="home"]'); await page.waitForTimeout(300); await shot('g21-home-retreat2');
  const ri2 = await ev(() => { const { st, L } = window.__xm; const r = L.retInfo(st); return { cost: L.fmt(r.cost), m: r.m.toFixed(2), m0: r.m0.toFixed(2), ui: document.querySelector('#btnRet').textContent }; });
  check(ri2.ui.includes(ri2.cost), `第二次闭关价格 ${ri2.cost}（50×1.30^i）`);
  check(ri2.m !== ri2.m0, `连着闭关疲劳：×${ri2.m0} → ×${ri2.m}`);
  await ev(() => window.__xm.closeModal());
  // 服丹疗伤
  await ev(() => { const { st } = window.__xm; st.p.inj = 3; st.pills = Math.max(1, st.pills); }); await page.waitForTimeout(300); await dismiss();
  await page.click('[data-nav="home"]'); await page.waitForTimeout(300); await shot('g22-home-heal');
  await page.click('#btnHeal'); await page.waitForTimeout(200);
  check(await ev(() => window.__xm.st.p.inj === 0), '服丹疗伤后痊愈');
  await ev(() => window.__xm.closeModal()); await dismiss();

  // E16：三年之约剩 12 周天内，锦囊三条
  await ev(() => { const X = window.__xm; X.st.tick = 26; X.st.exp = null; X.st.retreat = null; }); await page.waitForTimeout(600); t = await log('E16'); await shot('g23-pactsoon');
  const p16 = await ev(() => { const { st, L } = window.__xm; const p = L.pactInfo(st); return { left: p.left, S: L.fmt(p.S), p: L.pct(p.p) }; });
  check(has(t, `还剩 ${p16.left} 个周天`) && has(t, `= ${p16.S}`) && has(t, `胜算 ${p16.p}`), `E16 数字：${p16.left} 周天 / ${p16.S} / ${p16.p}`);
  await dismiss();
  // E18：修为圆满 → 突破面板（老祖护法必成）→ 步进器
  await ev(() => { const { st, L } = window.__xm; st.p.s = 3; st.p.xp = L.pNeed(st.p) - 0.5; L.addXp(st, 1); st.pills = 2; }); await page.waitForTimeout(500); t = await log('E18a');
  check(has(t, '必成'), 'E18a 老祖护法必成');
  await page.click('#cult'); await page.waitForTimeout(400); t = await log('E18b'); await shot('g24-bt');
  const bt = await ev(() => ({ rate: document.querySelector('#btRate').textContent, step: !!document.querySelector('#btStep') }));
  check(bt.rate === '100%' && bt.step, `突破面板：成功率 ${bt.rate}、有步进器`);
  check(has(t, '200'), 'E18b 写明寿元到 200');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400);
  for (let i = 0; i < 30 && await ev(() => window.__xm.cine); i++) await page.waitForTimeout(200);
  await page.waitForTimeout(400); await shot('g25-btres');
  check(await ev(() => window.__xm.st.p.r === 1), '突破筑基成功');
  await page.click('#modal .foot .btn'); await drain(); await dismiss(); await drain();
  // 金丹起的突破面板：步进器改成功率
  await ev(() => { const { st, L } = window.__xm; st.p.s = 3; st.p.xp = L.pNeed(st.p); st.pills = 3; st.flags.readyNotified = 1; }); await page.waitForTimeout(300); await dismiss();
  await page.click('#cult'); await page.waitForTimeout(400);
  // 头一回金丹雷劫前老祖讲护劫手段与“那一停”（阻塞，时间暂停），数字与逻辑一致
  const tg = await gtext(), tgL = await ev(() => { const { st, L } = window.__xm; return { all: L.pct(L.tribRate(st, { pills: Math.min(3, st.pills), aids: 'all' })), base: L.pct(L.REALMS[st.p.r].rate), hold: window.__xm.guideHold }; });
  check(has(tg, '护劫手段') && has(tg, '祭法宝 +8%') && has(tg, `全用上 ${tgL.all}`) && has(tg, `基础只有 ${tgL.base}`) && tgL.hold, `金丹雷劫讲解：护劫手段、全用上 ${tgL.all}、时间暂停`);
  await ok(); const tp = await gtext();
  check(has(tp, '停一下') && has(tp, '80%') && has(tp, '+10%'), `金丹雷劫讲解：那一停、八成准、临阵吞丹 +10%（${tp.slice(0, 30)}）`);
  await dismiss(); await shot('g26-bt-jindan');
  const st1 = await ev(() => document.querySelector('#btRate').textContent);
  await page.click('#btStep [data-st="-1"]'); await page.waitForTimeout(250);
  const st2 = await ev(() => ({ ui: document.querySelector('#btRate').textContent, n: +document.querySelector('#btStep b').textContent, L: (() => { const { st, L } = window.__xm; return L.pct(L.tribRate(st, window.__xm.tribOpts())); })() }));
  check(st1 !== st2.ui && st2.ui === st2.L, `步进器 −1：${st1} → ${st2.ui}（逻辑 ${st2.L}，${st2.n} 枚）`);
  await shot('g27-bt-step');
  await ev(() => window.__xm.closeModal()); await dismiss();
  // 三年之约
  await ev(() => { const X = window.__xm; X.st.tick = 35; X.L.flow(X.st, 1); X.onTick(); X.setSpeed(0); });
  await page.waitForTimeout(500); await shot('g28-pactduel');
  await page.waitForTimeout(1500); await shot('g29-pactres');
  await page.click('#modal .foot .btn'); await page.waitForTimeout(600); t = await log('E19'); await shot('g30-afterpact');
  check(has(t, '天骄论道') || has(t, '第 1 届论道'), 'E19 讲天骄论道');
  await dismiss();
  // 三宗争徒：主按钮是【拜入 XX】
  await ev(() => window.__xm.showInvite()); await page.waitForTimeout(300); await shot('g31-invite');
  const inv = await ev(() => [...document.querySelectorAll('#modal .foot .btn')].map(x => (x.classList.contains('gold') ? '*' : '') + x.textContent));
  check(inv.some(x => x.startsWith('*拜入')), `三宗争徒主按钮：${inv.join(' / ')}`);
  await page.click('#modal .cand[data-i="2"]'); await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400);
  check(await ev(() => window.__xm.st.sect && window.__xm.st.sect.id === 'dao'), '拜入玄天道宗');
  await drain(); await dismiss(); await drain();
  await page.click('[data-nav="sect"]'); await page.waitForTimeout(300); await shot('g32-sect');

  console.log('guide done =', await ev(() => window.__xm.st.guide.done));
  console.log(errs.join('\n') || 'no errors');
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  await b.close();
  if (fails.length || errs.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').filter(x => /intercept|waiting for|FAIL|Timeout/.test(x)).slice(0, 6).join('\n')); process.exit(1); });
