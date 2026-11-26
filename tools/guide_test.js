// 新手引导流程测试（开罗式重整，docs/KAIRO_PLAN.md §5）：按真实玩家的点法走第一章，逐步截图并核对
//   · 主画面：时间条 36 格 + 末格红、目标卡四样、固定五格（没开的灰着 + 一行条件）、“去”角标
//   · 阻塞对话只剩清单：头三步手把手（只有金框和一行字 ≤ 16 字，没有“好”），之后全程不出现带【好】的老祖讲解
//   · 在外零打断；结算卡有“战力 前 → 后”“离目标”；解锁卡【带我去】1 次点击到控件；装备 1 次点击；年报；突破走目标卡【去】；备战卡 → 三年之约 → 章末结算
// node tools/guide_test.js <输出目录> [设备名|360]
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
  await page.click('#goStart'); await page.waitForTimeout(900);
  const shot = async n => { await page.waitForTimeout(300); await page.screenshot({ path: `${out}/${n}.png` }); };
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const gtext = () => ev(() => (document.getElementById('guide').hidden ? '' : document.querySelector('#guide .gtext').textContent));
  const modal = () => ev(() => (document.getElementById('modal').hidden ? '' : (document.querySelector('#modal h2') || {}).textContent || '?'));
  // 全程记：带【好 / 知道了】按钮的老祖讲解（阻塞讲解）出现过几次
  await ev(() => { window.__blk = 0; new MutationObserver(() => { if (!document.getElementById('guide').hidden && document.querySelector('#guide [data-g="ok"]')) window.__blk++; }).observe(document.getElementById('guide'), { attributes: true, childList: true, subtree: true }); });
  // 推进 n 个月（逐月调 onTick，和真实时钟一样走 clock.js 的打断规则）
  const adv = n => ev(n => { const X = window.__xm; for (let i = 0; i < n; i++) { X.L.flow(X.st, 1); X.onTick(); } }, n);
  const closeAll = async () => { for (let i = 0; i < 8; i++) { const m = await modal(); if (!m) return; const u = await page.$('#unlOk'); if (u) await u.click(); else { const ch = await page.$('#modal .choices .btn:not([disabled])'); if (ch) await ch.click(); else { const f = await page.$$('#modal .foot .btn:not([disabled])'); if (f.length) await f[f.length - 1].click(); else await ev(() => window.__xm.closeModal()); } } await page.waitForTimeout(450); } };

  // ---------- 开局主画面 ----------
  await shot('g01-start');
  const m0 = await ev(() => ({
    pips: document.querySelectorAll('#pips i').length, red: !!document.querySelector('#pips i:last-child.f'), big: document.getElementById('bigLeft').textContent,
    ch: document.getElementById('gCh').textContent, t: document.getElementById('gT').textContent, bar: document.getElementById('gBar').textContent, nx: document.getElementById('gNext').textContent,
    nav: [...document.querySelectorAll('#nav button')].map(x => x.dataset.nav + (x.classList.contains('lk') ? '(灰)' : '')).join(','), go: (document.querySelector('[data-nav="exp"] .badge') || {}).textContent,
  }));
  check(m0.pips === 36 && m0.red && /三年之约 还有 36 月/.test(m0.big), `时间条 36 格、末格红、“${m0.big}”`);
  check(m0.ch === '第一章' && /三年之约/.test(m0.t) && /胜算 \d+% → 目标 80%/.test(m0.bar) && m0.nx.startsWith('下一步：'), `目标卡：${m0.ch} · ${m0.t} · ${m0.bar} · ${m0.nx}`);
  check(m0.nav === 'exp,home(灰),gear,world(灰),path', `开局五格都在、没开的灰着、【装备】开局就亮（功法页有心法与绝招，COMBAT_LOOT §7.3）（${m0.nav}）`);
  check(m0.go === '去', `【历练】挂“去”（${m0.go}）`);
  // ---------- 头三步手把手 ----------
  let t = await gtext();
  const g1 = await ev(() => ({ ok: !!document.querySelector('#guide [data-g="ok"]'), hold: window.__xm.guideHold, slim: document.querySelector('#guide .gbox').classList.contains('slim') }));
  check(t.length > 0 && t.length <= 16 && !g1.ok && g1.slim, `第 1 步：一行字（${t}，${t.length} 字）、没有“好”按钮`);
  check(g1.hold, '手把手时停表');
  await page.click('[data-nav="exp"]'); await page.waitForTimeout(300); t = await gtext(); await shot('g02-exppick');
  check(/后山野林/.test(t) && t.length <= 16, `第 2 步：${t}`);
  check(await ev(() => document.querySelectorAll('#modal .card[data-k]').length === 1), '第一趟只有后山野林一格');
  await page.click('#modal .card[data-k="0"]'); await page.waitForTimeout(300); t = await gtext(); await shot('g03-expgo');
  const conf = await ev(() => ({ rate: document.querySelector('#expRate').textContent, fc: window.__xm.L.expForecast(window.__xm.st, 0, 0, 0).text }));
  check(/出发/.test(t) && t.length <= 16, `第 3 步：${t}`);
  check(/^[乙甲天](～[乙甲天])?$/.test(conf.rate) && conf.rate === conf.fc, `确认页预计评价 ${conf.rate}（回合战：第一趟按打出来的定，COMBAT_LOOT §2.3）`);
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(700); await shot('g04-travel');
  const tr = await ev(() => ({ exp: !!window.__xm.st.exp, done: window.__xm.st.guide.done, pill: document.getElementById('scenePill').textContent, bar: !document.getElementById('tripBar').hidden, haul: !document.getElementById('haul').hidden }));
  check(tr.exp && tr.done, '出发后引导做完');
  check(/历练中/.test(tr.pill) && tr.bar && tr.haul, `在外：状态牌“${tr.pill}”、格子条、累计条`);
  // 在外零打断：逐月推到最后一月前，期间不出任何弹层 / 气泡 / 讲解
  const away = [];
  for (let i = 0; i < 3; i++) { await adv(1); await page.waitForTimeout(250); away.push(await ev(() => [document.getElementById('modal').hidden ? '' : 'modal', document.getElementById('tip').hidden ? '' : 'tip', document.getElementById('guide').hidden ? '' : 'guide'].filter(Boolean).join('+'))); if (!(await ev(() => !!window.__xm.st.exp))) break; }
  check(away.slice(0, -1).every(x => !x), `在外零打断（${away.map(x => x || '·').join(' ')}）`);
  // ---------- 归来结算卡 ----------
  if (await ev(() => !!window.__xm.st.exp)) { await ev(() => { const X = window.__xm; X.st.exp.left = 1; }); await adv(1); }
  await page.waitForTimeout(800); await shot('g05-result');
  const res = await ev(() => ({ title: (document.querySelector('#modal h2') || {}).textContent || '', body: (document.querySelector('#modal .body') || {}).textContent || '', btns: [...document.querySelectorAll('#modal .foot .btn')].map(x => x.textContent), stamp: (document.querySelector('#modal .kstamp') || {}).textContent }));
  check(/历练归来/.test(res.title) && /用了 \d+ 月/.test(res.title), `结算卡标题：${res.title}`);
  check(/^[乙甲天]$/.test(res.stamp), `评价印“${res.stamp}”（回合战按打出来的定）`);
  check(/战力\s*\d+\s*→\s*\d+/.test(res.body.replace(/\s+/g, ' ')) && /离目标/.test(res.body) && /还有 \d+ 月/.test(res.body), '结算卡：战力 前 → 后、离目标、还有 N 月');
  check(/已戴上/.test(res.body), '第一件法宝：已戴上（不讲解）');
  check(res.btns.length === 1 && res.btns[0] === '回洞府', `第一张结算卡只有【回洞府】（${res.btns.join('/')}）`);
  await page.click('#modal .foot .btn'); await page.waitForTimeout(900);
  // ---------- 解锁卡：洞府 · 聚灵阵 ----------
  for (let i = 0; i < 6 && !(await page.$('#unlGo')); i++) { await page.waitForTimeout(400); }
  await shot('g06-unlock');
  const ul = await ev(() => { const u = document.querySelector('.unl'); return u ? u.textContent : ''; });
  check(/解锁了/.test(ul) && /聚灵阵/.test(ul), `解锁卡：${ul.replace(/\s+/g, ' ').slice(0, 40)}`);
  const navHome = await ev(() => !document.querySelector('[data-nav="home"]').classList.contains('lk'));
  check(navHome, '【洞府】亮了');
  if (await page.$('#unlGo')) { await page.click('#unlGo'); await page.waitForTimeout(500); }
  await shot('g07-home-hl');
  const hl = await ev(() => ({ m: (document.querySelector('#modal h2') || {}).textContent || '', hl: !!document.getElementById('hl') && !document.getElementById('hl').hidden }));
  check(/洞府/.test(hl.m) && hl.hl, `【带我去】1 次点击：洞府 + 金框（${hl.m}）`);
  await page.click('#modal button[data-k="array"]'); await page.waitForTimeout(300);
  check(await ev(() => window.__xm.st.home.array === 1), '聚灵阵升到 1 级（金框不挡点击）');
  await closeAll();
  // ---------- 装备：1 次点击 ----------
  await page.click('[data-nav="gear"]'); await page.waitForTimeout(350); await shot('g08-gear');
  check(await ev(() => /装备/.test(document.querySelector('#modal h2').textContent) && document.querySelectorAll('#modal .kslot').length >= 3 && !!document.querySelector('#modal [data-kdet="w"]')), '【装备】1 次点击：兵器 / 法衣 / 饰品三格');
  check(await ev(() => document.querySelector('[data-nav="gear"]').classList.contains('on')), '面板浮在底栏之上，【装备】格点亮');
  await page.click('[data-nav="path"]'); await page.waitForTimeout(350); await shot('g09-path');
  check(await ev(() => !!document.querySelector('#modal .kpn.cur') && /第一章/.test(document.querySelector('#modal .kpn.cur').textContent)), '面板开着直接点【仙途】：路径页，当前章展开');
  await closeAll();
  // ---------- 一年：年报 ----------
  await ev(() => { const X = window.__xm; X.st.visitor = null; });
  for (let i = 0; i < 14 && !(await modal()).includes('年报'); i++) { await adv(1); await page.waitForTimeout(300); const m = await modal(); if (m && !m.includes('年报')) await closeAll(); }
  await shot('g10-year');
  const yr = await ev(() => ({ m: (document.querySelector('#modal h2') || {}).textContent || '', b: (document.querySelector('#modal .body') || {}).textContent || '', tick: window.__xm.st.tick }));
  check(/年报/.test(yr.m) && /战力/.test(yr.b) && /明年/.test(yr.b), `第 ${yr.tick} 月：年报（${yr.m}）`);
  await closeAll();
  // ---------- 老祖头像 = 变强页（KAIRO_PLAN §10.5）：目标卡“下一步”、头像点开的第一张、L.advise 第一张是同一件事 ----------
  await ev(() => { const X = window.__xm; X.st.exp = null; X.st.retreat = null; });
  await page.waitForTimeout(400);
  const s3 = await ev(() => { const { st, L } = window.__xm, A = L.advise(st, 'goal'), gn = L.goalNext(st); return { id: A.acts[0] && A.acts[0].id, say: A.acts[0] && A.acts[0].say, n: A.acts[0] && A.acts[0].n, gk: gn.k, why: gn.why, card: document.getElementById('gNext').textContent, av: !!document.getElementById('guideAv') && !document.getElementById('guideAv').hidden }; });
  check(s3.av, '场景右下角有老祖头像');
  if (s3.av) { await page.click('#guideAv'); await page.waitForTimeout(400); }
  await shot('g10b-growth');
  const gw = await ev(() => ({ m: (document.querySelector('#modal h2') || {}).textContent || '', nm: ((document.querySelector('#modal .gw-act .nm') || {}).textContent || '').trim(), n: document.querySelectorAll('#modal .gw-act').length }));
  check(/变强/.test(gw.m) && gw.n >= 1 && gw.n <= 3, `老祖头像 → 变强页（${gw.m}，${gw.n} 张牌）`);
  check(gw.nm === s3.n && (s3.why !== 'adv' || (s3.gk === s3.id && s3.card === '下一步：' + s3.say)), `三处同源：目标卡“${s3.card}” · 变强页第一张“${gw.nm}” · advise ${s3.id}（${s3.why}）`);
  await closeAll();
  // ---------- 修为圆满：目标卡“下一步：可以突破了”→【去】→ 突破面板 ----------
  await ev(() => { const { st, L } = window.__xm; st.exp = null; st.retreat = null; st.p.s = 3; st.p.xp = L.pNeed(st.p) - 0.5; L.addXp(st, 1); st.pills = 2; });
  await page.waitForTimeout(700); await closeAll(); await page.waitForTimeout(300);
  const nx = await ev(() => document.getElementById('gNext').textContent);
  check(/突破/.test(nx), `目标卡：${nx}`);
  await page.click('#gGo'); await page.waitForTimeout(400); await shot('g11-bt');
  check(/突破/.test(await modal()), '目标卡【去】→ 突破面板');
  await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400);
  for (let i = 0; i < 30 && await ev(() => window.__xm.cine); i++) await page.waitForTimeout(200);
  await page.waitForTimeout(400);
  check(await ev(() => window.__xm.st.p.r === 1), '突破筑基成功');
  await closeAll();
  // ---------- 三年之约：备战卡（前 1 月）→ 对决 → 章末结算 ----------
  await ev(() => { const X = window.__xm; X.st.tick = 34; X.st.exp = null; X.st.retreat = null; X.st.visitor = null; });
  await adv(1); await page.waitForTimeout(600); await shot('g12-prep');
  const pm = await modal();
  check(/备战/.test(pm), `第 35 月：备战卡（${pm || '没出'}）`);
  if (/备战/.test(pm)) { await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(400); }
  await closeAll();
  await ev(() => { const X = window.__xm; X.L.flow(X.st, 1); X.onTick(); });
  await page.waitForTimeout(600); await shot('g13-pact');
  check(await ev(() => !!document.querySelector('#modal.duel-m')), '三年之约在场景里演');
  await page.waitForTimeout(1500);
  if (await ev(() => /跳过/.test((document.querySelector('#modal .foot .btn') || {}).textContent || ''))) { await page.click('#modal .foot .btn'); await page.waitForTimeout(700); }
  await page.click('#modal .foot .btn'); await page.waitForTimeout(800);
  let chEnd = '';
  for (let i = 0; i < 10; i++) { const m = await modal(); if (/章.*完/.test(m)) { chEnd = m; break; } if (m) await closeAll(); await page.waitForTimeout(500); }
  await shot('g14-chapter');
  const cb = await ev(() => [...document.querySelectorAll('#modal .foot .btn')].map(x => x.textContent).join('/'));
  check(/第一章.*完/.test(chEnd) && /开始第二章/.test(cb), `章末结算：${chEnd} ·【${cb}】`);
  await closeAll();
  const g2 = await ev(() => ({ ch: document.getElementById('gCh').textContent, world: !document.querySelector('[data-nav="world"]').classList.contains('lk') }));
  check(g2.ch === '第二章' && g2.world, `之后目标卡换成${g2.ch}、【江湖】亮起`);
  await shot('g15-ch2');
  const blk = await ev(() => window.__blk);
  check(blk === 0, `全程没有带【好】的阻塞讲解（${blk} 次）`);
  console.log('guide done =', await ev(() => window.__xm.st.guide.done));
  console.log(errs.join('\n') || 'no errors');
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  await b.close();
  if (fails.length || errs.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.split('\n').slice(0, 6).join('\n')); process.exit(1); });
