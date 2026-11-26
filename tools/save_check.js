// 存档位检查（src/logic/slots.js + src/ui/saves.js）：node tools/save_check.js [截图目录]
// 逻辑（node）：存 → 读 → 状态一致；自动 3 档轮换（每月覆盖、关键节点挤一格、同月两节点不多挤、读档前备份）；手动 3 档存 / 读 / 删；
//   旧档（只有 xiantu_save_v2、没有索引）成为“自动 1”；v5 旧档过迁移；读回来的档接着玩 30 个月不报错；导出字符串往返与贴错；容量估算。
// 界面（playwright，Pixel 7 与 360×640）：旧档升级后进存档页看到“自动 1”；点手动 1 存到这里；章末 / 年报真的存了节点档；
//   读手动档（两次确认）后 tick 回到存的那一刻、弹窗队列清空、备份进了自动档，接着跑 30 个月无报错；删除；导出 → 导入；
//   每行 ≥ 44px、按钮 ≥ 44px、不横向溢出；本机 localStorage 实测上限。
const path = require('path');
const fs = require('fs');
const L = require('../src/logic.js');
const sim = require('./sim.js');
const out = process.argv[2] || path.join(__dirname, '..', 'shots', 'saves');
fs.mkdirSync(out, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
const mapStore = () => { const m = new Map(); return { m, get: k => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)), del: k => m.delete(k) }; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ---------- 逻辑 ----------
console.log('逻辑');
const mid = sim.run('guided', 3, false, { keep: true, }).st;   // 一整世（飞升）
L.rng = Math.random;
const st0 = L.newState({ name: '甲' }); for (let i = 0; i < 20; i++) L.tick(st0);
{
  const S = mapStore(), P = L.slotStore(S);
  // 旧档：升级前只有 xiantu_save_v2
  S.set('xiantu_save_v2', JSON.stringify(st0));
  const H = P.heads();
  check(H.a[0] && H.a[0].tick === st0.tick && H.a[0].name === '甲' && !H.a[1] && !H.m[0], '旧档（只有 xiantu_save_v2）升级后成为“自动 1”，摘要补进索引');
  const back = P.parse('a', 0);
  check(same(L.migrate(JSON.parse(JSON.stringify(st0))), L.migrate(back)), '自动 1 读回来与原档一致（都过 L.migrate）');
  // 每月例行：只覆盖自动 1
  const st = JSON.parse(JSON.stringify(st0));
  for (let i = 0; i < 5; i++) { L.tick(st); P.writeAuto(st, ''); }
  let I = P.index();
  check(I.a[0].tick === st.tick && !I.a[1] && !I.a[2], `每月例行 5 次：只有自动 1（tick ${I.a[0].tick}）`);
  // 关键节点：写进自动 1 并标成节点档；下一次写时挤到自动 2
  P.writeAuto(st, '突破'); const kt = st.tick;
  I = P.index(); check(I.a[0].key && I.a[0].why === '突破' && !I.a[1], '突破：自动 1 记成节点档，还没挤');
  P.writeAuto(st, '年报'); I = P.index();
  check(I.a[0].why === '年报' && !I.a[1], '同一个月第二个节点：覆盖，不多挤一格');
  L.tick(st); P.writeAuto(st, '');
  I = P.index(); check(I.a[1] && I.a[1].tick === kt && I.a[1].why === '年报' && I.a[0].tick === st.tick && !I.a[0].key, '下个月例行存档：节点档挤到自动 2，自动 1 是此刻');
  check(P.parse('a', 1).tick === kt, '自动 2 的档内容就是节点那一刻');
  // 再来两个节点：自动 2 → 自动 3，最老的丢掉
  const ticks = [kt];
  for (const why of ['章末', '归来', '转世前']) { for (let i = 0; i < 3; i++) L.tick(st); P.writeAuto(st, why); ticks.push(st.tick); L.tick(st); P.writeAuto(st, ''); }
  I = P.index();
  check(I.a[1].tick === ticks[3] && I.a[2].tick === ticks[2] && I.a[1].why === '转世前' && I.a[2].why === '归来' && P.parse('a', 2).tick === ticks[2], `三个节点后：自动 2 = ${I.a[1].why}（${I.a[1].tick}）· 自动 3 = ${I.a[2].why}（${I.a[2].tick}）· 最老的丢了`);
  // 手动 3 档
  for (let i = 0; i < 3; i++) { L.tick(st); P.writeMan(i, st); }
  I = P.index();
  check(I.m.every((h, i) => h && h.tick === st.tick - 2 + i), '手动 1～3：各存各的');
  check(same(P.parse('m', 2), JSON.parse(JSON.stringify(st))), '存 → 读：状态一致（手动 3）');
  P.del('m', 1); I = P.index();
  check(!I.m[1] && !S.m.has('xiantu_save_m2') && I.m[0] && I.m[2], '删手动 2：档与摘要都没了，别的不动');
  // 读档流程：先备份（读档前）→ 换档 → 写一次（备份挤到自动 2）
  const cur = st, tgt = P.parse('m', 0);
  P.writeAuto(cur, '读档前');
  const loaded = L.migrate(tgt); P.writeAuto(loaded, '');
  I = P.index();
  check(I.a[0].tick === tgt.tick && I.a[1].why === '读档前' && I.a[1].tick === cur.tick, '读档：读档前的进度进了自动 2，自动 1 = 读进来的档');
  // 重新开始：当前进度挤进自动 2，自动 1 空出来
  P.retire(loaded); I = P.index();
  check(!I.a[0] && !S.m.has('xiantu_save_v2') && I.a[1] && I.a[1].why === '重来前', '重新开始：自动 1 空、旧进度在自动 2、手动档不动');
  check(I.m[0] && I.m[2], '重新开始后手动档还在');
  // 读回来接着玩 30 个月
  let err = '';
  try { const s = L.migrate(P.parse('a', 1)); for (let i = 0; i < 30; i++) L.tick(s); } catch (e) { err = e.message; }
  check(!err, '读回来的档接着跑 30 个月无报错' + (err ? '：' + err : ''));
  // 满了：写不进去时丢最老的自动档再试
  const Q = mapStore(); let cap = 1e9; const qs = Object.assign({}, Q, { set: (k, v) => { let n = 0; for (const [kk, vv] of Q.m) if (kk !== k) n += vv.length; if (n + v.length > cap) throw new Error('QuotaExceededError'); Q.m.set(k, v); } });
  const QP = L.slotStore(qs); const a = JSON.parse(JSON.stringify(st0));
  QP.writeAuto(a, '突破'); L.tick(a); QP.writeAuto(a, '归来'); L.tick(a); QP.writeAuto(a, '');
  cap = Q.m.get('xiantu_save_v2').length * 2.5; L.tick(a); const r = QP.writeAuto(a, '');
  check(r.ok && Q.m.get('xiantu_save_v2') && JSON.parse(Q.m.get('xiantu_save_v2')).tick === a.tick, '本机空间满：丢掉自动 3 后照样写进自动 1');
}
// 旧版本（v5）的档过迁移、成为自动 1
{
  const S = mapStore(), P = L.slotStore(S);
  const old = JSON.parse(JSON.stringify(st0)); old.v = 5; delete old.market; delete old.cal; delete old.path; delete old.clk; delete old.inbox;
  S.set('xiantu_save_v2', JSON.stringify(old));
  const m = L.migrate(P.parse('a', 0));
  let err = ''; try { for (let i = 0; i < 30; i++) L.tick(m); } catch (e) { err = e.message; }
  check(m && m.v === L.SAVE_V && m.market && m.cal && !err && P.heads().a[0], 'v5 旧档：成为自动 1、迁移补齐、接着跑 30 个月' + (err ? '：' + err : ''));
}
// 导出字符串
{
  const j = JSON.stringify(mid), code = L.packSave(j);
  check(L.unpackSave(code) === j, `导出字符串往返一致（${j.length} 字符 → ${code.length} 字符）`);
  check(L.unpackSave(code.slice(0, -40)) === null && L.unpackSave(code.replace(/.$/, c => (c === 'A' ? 'B' : 'A'))) === null && L.unpackSave('乱贴的') === null, '贴了一半 / 改了一个字 / 乱贴：都认出来是坏的');
  check(L.unpackSave(' \n' + code.slice(0, 50) + '\n' + code.slice(50)) === j && L.unpackSave(j) === j, '中间夹了换行也能读；直接贴 JSON 也收');
}
// 容量：新档、第一章、一整世、第二世中途
const sizes = {};
{
  const s2 = JSON.parse(JSON.stringify(mid)); L.settle(s2, 'ascend'); L.hallAuto(s2); L.legacyAuto(s2);
  const c = L.rebirthCards(s2, L.rebirthCardN(s2))[0];
  const ns = L.rebirthState(s2, { t: c.t, tr: c.tr, origin: 'qitu', trials: [] });
  const second = sim.run('guided', 4, false, { st0: ns, keep: true }).st;
  Object.assign(sizes, { 新档: JSON.stringify(L.newState({ name: '甲' })).length, 第20月: JSON.stringify(st0).length, 一整世: JSON.stringify(mid).length, 第二世飞升: JSON.stringify(second).length });
  const max = Math.max(...Object.values(sizes)), all = max * 7 + 3000;   // 6 档 + 设置 + 索引；云存档不占本机
  console.log('  存档大小（字符）：' + Object.entries(sizes).map(([k, v]) => `${k} ${(v / 1024).toFixed(1)}K`).join(' · '));
  check(all < 2.5e6, `6 档全满按最大的算：约 ${(all / 1024).toFixed(0)}K 字符（UTF-16 约 ${(all * 2 / 1048576).toFixed(2)} MB），localStorage 约 5M 字符 → 不必压缩`);
}

// ---------- 界面 ----------
(async () => {
  const { chromium, devices } = require('playwright');
  const b = await chromium.launch();
  for (const dev of ['Pixel 7', '360']) {
    console.log('界面 ' + dev);
    const tag = dev === '360' ? '360' : 'p7';
    const opts = dev === '360' ? { viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { ...devices[dev] };
    const ctx = await b.newContext(opts);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
    const ev = (fn, a) => page.evaluate(fn, a);
    // 旧档：升级前那一份（只有 xiantu_save_v2、没有索引）
    await page.goto(url); await page.waitForTimeout(300);
    const oldJson = JSON.stringify(Object.assign(JSON.parse(JSON.stringify(st0)), { guide: { step: 99, done: true }, hintSeen: {} }));
    await ev(j => { localStorage.clear(); localStorage.setItem('xiantu_save_v2', j); }, oldJson);
    await page.reload(); await page.waitForTimeout(700);
    check(await ev(() => document.getElementById('intro').hidden && window.__xm.st && window.__xm.st.p.name === '甲'), '旧档：开游戏直接读进来');
    await ev(() => { const X = window.__xm; X.setSpeed(X.pauseIdx); X.L.onbAll(X.st); for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) X.closeModal(); });
    await page.waitForTimeout(500);
    await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); });
    // 入口：仙途 → 设置 → 存档
    await ev(() => window.__xm.showSettings()); await page.waitForTimeout(250);
    await page.click('#btnSaves'); await page.waitForTimeout(300);
    const pg = await ev(() => ({ t: document.querySelector('#modal h2').textContent, rows: [...document.querySelectorAll('#modal [data-sv]')].map(r => ({ id: r.dataset.sv, h: r.getBoundingClientRect().height, txt: r.textContent })) }));
    check(/存档/.test(pg.t) && pg.rows.length === 6, `设置 → 存档：6 格（${pg.rows.map(r => r.id).join(' ')}）`);
    check(/自动 1/.test(pg.rows[0].txt) && /第一章|第二章/.test(pg.rows[0].txt) && /第1世/.test(pg.rows[0].txt) && /第\d+年\d+月/.test(pg.rows[0].txt), '自动 1 一行：第 N 章 · 境界 · 第 X 年 X 月 · 第几世 · 时间：' + pg.rows[0].txt.replace(/\s+/g, ' ').slice(0, 60));
    const shape = () => ev(() => {
      const m = document.querySelector('#modal .sheet'), vw = window.innerWidth;
      const small = [...m.querySelectorAll('button, [data-sv]')].filter(x => x.getBoundingClientRect().height && x.getBoundingClientRect().height < 44 - 0.5).map(x => (x.id || x.textContent).slice(0, 8));
      const over = [...m.querySelectorAll('*')].some(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1); });
      return { small, over };
    });
    let sh = await shape();
    check(!sh.small.length && !sh.over, `存档页：可点的都 ≥ 44px${sh.small.length ? '（小：' + sh.small.join(',') + '）' : ''} · ${sh.over ? '横向溢出' : '不溢出'}`);
    await page.screenshot({ path: `${out}/${tag}-saves.png` });
    // 手动 1：存到这里
    await page.click('#modal [data-sv="m0"]'); await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-slot-new.png` });
    const t0 = await ev(() => window.__xm.st.tick);
    await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
    check(await ev(t => { const h = window.__xm.slots.index().m[0]; return h && h.tick === t && /已存到手动 1/.test(document.querySelector('#modal').textContent); }, t0), '手动 1：点“存到这里”存下，回存档页有提示');
    // 往前走几个月 + 两个真的关键节点（章末、年报）
    await ev(() => { const X = window.__xm; X.closeModal(); for (let i = 0; i < 4; i++) { X.L.flow(X.st, 1); X.onTick(); } X.st.flags.chEnd = {}; X.showChapterCard(0); });
    await page.waitForTimeout(300);
    const k1 = await ev(() => { const h = window.__xm.slots.index().a[0]; return h && h.why; });
    await ev(() => { const X = window.__xm; X.closeModal(); X.saveLocal(); X.showYearReport(); });   // 例行存档一次，再出年报
    await page.waitForTimeout(300);
    const k2 = await ev(() => { const I = window.__xm.slots.index(); return [I.a[0] && I.a[0].why, I.a[1] && I.a[1].why]; });
    check(k1 === '章末' && k2[0] === '年报' && k2[1] === '章末', `关键节点真的存了：章末 → 自动 1（${k1}）；下个月年报 → 自动 1（${k2[0]}）、章末挤到自动 2（${k2[1]}）`);
    await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450);
    // 读手动 1：点格 → 读档 → 确认
    const before = await ev(() => window.__xm.st.tick);
    await ev(() => window.__xm.showSaves()); await page.waitForTimeout(250);
    await page.click('#modal [data-sv="m0"]'); await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-slot.png` });
    sh = await shape(); check(!sh.small.length && !sh.over, `手动档卡片：按钮 ≥ 44px · ${sh.over ? '横向溢出' : '不溢出'}${sh.small.length ? '（小：' + sh.small.join(',') + '）' : ''}`);
    await ev(() => [...document.querySelectorAll('#modal .foot .btn')].find(x => x.textContent === '读档').click()); await page.waitForTimeout(250);
    check(await ev(() => /当前进度会丢失/.test(document.querySelector('#modal').textContent)), '读档二次确认：“当前进度会丢失（会先自动存一份）”');
    await page.screenshot({ path: `${out}/${tag}-confirm.png` });
    await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(500);
    const after = await ev(() => { const X = window.__xm, I = X.slots.index(); return { tick: X.st.tick, modal: document.getElementById('modal').hidden, q: X.queueLen, cine: X.cine, a0: I.a[0] && I.a[0].tick, a1: I.a[1] && I.a[1].why, a1t: I.a[1] && I.a[1].tick }; });
    check(after.tick === t0 && after.modal && after.q === 0 && !after.cine, `读手动 1：tick ${before} → ${after.tick}（存的是 ${t0}）· 弹窗关了 · 队列 ${after.q} · 没有过场`);
    check(after.a0 === t0 && after.a1 === '读档前' && after.a1t === before, `读档前的进度在自动 2（${after.a1} · tick ${after.a1t}）`);
    // 接着玩 30 个月
    await ev(() => { const X = window.__xm; for (let i = 0; i < 30; i++) { X.L.flow(X.st, 1); X.onTick(); if (i % 5 === 4) for (let k = 0; k < 4; k++) if (!document.getElementById('modal').hidden) X.closeModal(); } });
    await page.waitForTimeout(600);
    check(!errs.length && (await ev(() => window.__xm.st.tick)) >= t0 + 30, `读档后接着跑 30 个月：tick ${await ev(() => window.__xm.st.tick)}，${errs.length ? '报错 ' + errs[0] : '无报错'}`);
    await ev(() => { for (let i = 0; i < 6; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); }); await page.waitForTimeout(450);
    // 删除手动 1
    await ev(() => window.__xm.showSlot('m', 0)); await page.waitForTimeout(200);
    await ev(() => [...document.querySelectorAll('#modal .foot .btn')].find(x => x.textContent === '删除').click()); await page.waitForTimeout(200);
    await page.click('#modal .foot .btn:not(.alt)'); await page.waitForTimeout(250);
    check(await ev(() => !window.__xm.slots.index().m[0] && localStorage.getItem('xiantu_save_m1') === null), '删手动 1（确认后）');
    // 导出 → 导入
    await ev(() => window.__xm.showSaves()); await page.waitForTimeout(200);
    await page.click('#svOut'); await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-export.png` });
    const code = await ev(() => document.getElementById('svTxt').value);
    const tE = await ev(() => window.__xm.st.tick);
    check(/^XT1\./.test(code) && L.unpackSave(code) && JSON.parse(L.unpackSave(code)).tick === tE, `导出：${code.length} 字符，解开就是当前进度`);
    await ev(() => { const X = window.__xm; X.closeModal(); for (let i = 0; i < 3; i++) { X.L.flow(X.st, 1); X.onTick(); } for (let k = 0; k < 4; k++) if (!document.getElementById('modal').hidden) X.closeModal(); });
    await page.waitForTimeout(450);
    await ev(() => window.__xm.showSaves()); await page.waitForTimeout(200);
    await page.click('#svIn'); await page.waitForTimeout(200);
    await page.fill('#svTxt', 'XT1.乱贴'); await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(200);
    check(await ev(() => /读不出来/.test(document.querySelector('#modal').textContent)), '导入乱贴的：提示读不出来');
    await page.fill('#svTxt', code); await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(200);
    await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(500);
    const imp = await ev(() => ({ t: window.__xm.st.tick, hid: document.getElementById('modal').hidden, h2: (document.querySelector('#modal h2') || {}).textContent }));
    check(imp.t === tE && (imp.hid || !/导入|读|存档/.test(imp.h2)), `导入：贴进来、确认后回到导出那一刻（tick ${imp.t} / ${tE}${imp.hid ? '' : ' · 读进来的档自己的弹窗：' + imp.h2}）`);
    // 本机实测：6 档全满，再看还能塞多少
    const cap = await ev(() => {
      const X = window.__xm; for (let i = 0; i < 3; i++) X.slots.writeMan(i, X.st);
      for (let i = 0; i < 3; i++) { X.saveLocal('突破'); X.st.tick++; X.saveLocal(''); }
      const used = X.slots.usage();
      let lo = 0, hi = 12e6, ok = 0; const key = '__cap';
      while (hi - lo > 50000) { const n = Math.floor((lo + hi) / 2); try { localStorage.setItem(key, 'x'.repeat(n)); ok = n; lo = n; } catch (e) { hi = n; } }
      localStorage.removeItem(key);
      return { used: used.total, n: Object.keys(used.per).length, free: ok };
    });
    console.log(`  本机实测：6 档共 ${(cap.used / 1024).toFixed(0)}K 字符（${cap.n} 份），还能再放约 ${(cap.free / 1048576).toFixed(2)}M 字符`);
    check(cap.n === 6 && cap.free > cap.used * 3, '6 档全满后 localStorage 余量充足');
    await ev(() => { const X = window.__xm; for (let i = 0; i < 6; i++) if (!document.getElementById('modal').hidden) X.closeModal(); X.showSaves(); }); await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/${tag}-saves-full.png` });
    sh = await shape(); check(!sh.small.length && !sh.over, `6 档全满的存档页：可点的都 ≥ 44px · ${sh.over ? '横向溢出' : '不溢出'}`);
    check(!errs.length, dev + '：页面无报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  if (fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 800)); process.exit(1); });
