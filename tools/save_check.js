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
const OLD = {};   // 旧形状的存档 JSON（逻辑部分造好，界面部分塞进 localStorage 读）
// 旧存档迁移（docs/AP_PLAN.md §7、§8.4）：行动点制之前的各种存档形状（没有 st.ap），整个过 L.migrate（含 L.migrateAp），然后照新规则接着玩 8 季
// 归属：[A] 内核与迁移，[B] 剧情与主线（第一条链补放、主线行动），[X] 别的线
console.log('旧档迁移（AP_PLAN §7）');
{
  const onb0 = L.ONB_ON, rng0 = L.rng;
  let sd = 31; L.rng = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  const tag = (who, ok, what) => check(ok, (who ? `[${who}] ` : '') + what);
  // 本分支（合并推荐统一 49cf52f 之后）：artrec.js 的 L.REC = {…} 盖掉了 expedition.js 的 L.REC，L.rec 全是 NaN。先报一条，再垫回去，免得迁移后接着玩的断言被带歪
  const recBug = !(L.rec(0, 0) > 0);
  tag('X', !recBug, 'L.rec(0, 0) 是有限数（artrec.js 的 L.REC = {…} 盖掉了 expedition.js 的 L.REC = { base, k, d }）');
  if (recBug) Object.assign(L.REC, { base: 6, k: 13.4, d: 2.37 });
  const mid = () => {
    const s = L.newState({ name: '旧' });
    s.p.r = 3; s.p.s = 1; s.p.t = 6; s.home = { cave: 6, array: 8, field: 8, furnace: 8, room: 5 }; s.stones = 1e6; s.stats.exp = 20; s.pact = 1; s.tick = 120; s.flags.maxR = 3; s.flags.maxI = 12;
    for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) s.best[k + '_' + d] = 3;
    L.joinSect(s, 'jian'); s.storyQ = [];
    return s;
  };
  const legacy = s => { L.ONB_ON = false; delete s.ap; return s; };   // 旧档的样子：没有 st.ap
  const load = s => { L.ONB_ON = onb0 === undefined ? true : onb0; return L.migrate(JSON.parse(JSON.stringify(s))); };   // 存进文件、读出来、过迁移链
  // 第一条结算链（和界面 settle() 同口径）：出卡、放戏，直到没东西；返回出场顺序
  const chain = (s, why) => {
    const seq = [];
    if (L.chainOpen) L.chainOpen(s, why);
    for (let g = 0, x; g < 80 && typeof L.nextBlock === 'function' && (x = L.nextBlock(s)); g++) {
      seq.push(x.kind + (x.id ? ':' + x.id : ''));
      if (x.kind === 'story') {
        const e = x.data || (L.eventById && L.eventById(x.id));
        const ok = e && e.choices ? e.choices.map((c, i) => i).filter(i => L.costOk(s, e.choices[i].cost) && L.choiceShown(s, e.choices[i])) : [];
        if (e && ok.length) L.resolveChoice(s, e, ok[0]); else if (e) s.evDone[e.id] = 1;
        const i = s.storyQ.indexOf(x.id); if (i >= 0) s.storyQ.splice(i, 1);
      }
      L.blockDone(s, x);
    }
    return seq;
  };
  // 照新规则接着玩 n 季：每季把点打坐花完 → 季末 → 一条链
  const playOn = (s, n) => {
    let err = ''; const t0 = s.tick;
    try { for (let i = 0; i < n && s.p.r <= L.MAXR; i++) { while (L.apLeft(s) > 0 && L.act(s, 'sit')); const S = L.seasonEnd(s); if (S.out && S.out.death) break; chain(s, 'season'); } } catch (e) { err = e.stack.split('\n').slice(0, 3).join(' | '); }
    return { err, dt: s.tick - t0 };
  };
  const common = (who, s, t0) => {
    tag('A', !s.exp && !(s.retreat && s.retreat.left > 0), `${who}：读档后没有“在外 / 闭关中”的状态`);
    tag('A', s.tick % 3 === 0 && s.tick >= t0, `${who}：tick 在季界（${t0} → ${s.tick}）`);
    tag('A', s.ap && s.ap.left === 3 && s.ap.migrated === 1 && !('tuna' in s), `${who}：st.ap 已建（行动点 3、migrated）、吐纳环字段已删`);
  };
  const run8 = (who, s) => { const r = playOn(s, 8); tag('A', !r.err && r.dt === 24, `${who}：接着玩 8 季：tick +${r.dt}${r.err ? '，报错 ' + r.err : '，无报错'}`); };
  // 1. 历练在外（含连续历练的 chain 与 expSum）
  { const o = legacy(mid()); o.tick = 123; o.expSum = { n: 2 }; L.startExp(o, 0, 0, 0); L.tripStep(o); o.exp.chain = 2; const n0 = o.stats.exp;
    const s = load(o); common('在外历练', s, 123);
    tag('A', s.stats.exp === n0 + 1 && !s.expSum, '在外历练：当场结掉（历练次数 +1，expSum 清空）');
    const seq = chain(s, 'load'); tag('A', /^result/.test(seq[0] || ''), `在外历练：读档后第一条链的第一张是旧档历练结算卡（${seq.slice(0, 3).join(' → ')}）`);
    run8('在外历练', s); }
  // 2. 闭关中
  { const o = legacy(mid()); o.tick = 123; L.startRetreat(o); o.retreat.left = 2; const x0 = o.p.xp;
    const s = load(o); common('闭关中', s, 123); tag('A', s.p.xp > x0, `闭关中：当场出关，修为 +${Math.round(s.p.xp - x0)}`); run8('闭关中', s); }
  // 3. 秘境里（本来就不走时间）
  { let o = null; for (let t = 120; t < 132 && !o; t += 3) { const x = legacy(mid()); x.tick = t; x.mj = x.mj || {}; x.mj.token = 3; L.ONB_ON = false; if (L.mjCan(x) && L.mjEnter(x)) o = x; }
    if (!o || !o.run) console.log('  （注）秘境里：没造出秘境局面，跳过');
    else { const s = load(o); tag('A', !!s.run && s.tick % 3 === 0, '秘境里：st.run 还在，读档后接着闯'); } }
  // 4. tick % 3 = 1 / 2
  for (const off of [1, 2]) { const o = legacy(mid()); o.tick = 120 + off; const s = load(o); common(`tick % 3 = ${off}`, s, 120 + off); tag('A', s.tick === 123, `tick % 3 = ${off}：静默推到下一个季界（${120 + off} → ${s.tick}）`); run8(`tick % 3 = ${off}`, s); }
  // 5. 到期的大事记进 pend：约战前一月存的档，读档后第一条链当场出约战
  { const o = legacy(mid()); o.tick = 35; o.pact = 0; o.stones = 0; delete o.sect; o.sect = null;
    const s = load(o); const pend = s.ap.pend.map(x => x.k);
    tag('A', s.tick === 36 && pend.includes('pact'), `约战前一月的档：补月到第 36 月，约战记进 pend（${JSON.stringify(pend)}）`);
    const seq = chain(s, 'load'); tag('A', seq.includes('big:pact'), `约战前一月的档：第一条链会出约战（${seq.join(' → ')}）`); }
  // 6. 吐纳环、来犯日、重来的时间（见 content_test 的逐行用例；这里只看过整条迁移链后还在）
  { const o = legacy(mid()); o.tuna = 14; o.flags.war = 202; o.story = o.story || {}; o.story.retry = { s1_pact_lost: 61 }; const x0 = o.p.xp;
    const s = load(o); tag('A', !('tuna' in s) && s.p.xp > x0 && s.flags.war === 204 && s.story.retry.s1_pact_lost === 63, `整条迁移链：吐纳 14 → 2 月修为、来犯 202 → ${s.flags.war}、重来 61 → ${s.story.retry.s1_pact_lost}`); }
  // 7. 第三章散修：没宗门、三年之约已赢、金丹、章 = 2（卡在第三章的两个存档形状）
  const lone3 = shape => {
    const s = L.newState({ name: '散' });
    s.p.r = 3; s.p.s = 1; s.p.t = 5; s.tick = 126; s.pact = 1; s.sect = null; s.stones = 5e4; s.stats.exp = 30; s.flags.maxR = 3; s.flags.maxI = 12;
    for (let k = 0; k <= 3; k++) for (let d = 0; d < 3; d++) s.best[k + '_' + d] = 3;
    s.quest = s.quest || {}; s.quest.done = Object.assign(s.quest.done || {}, { c0_m: 1, c1_m: 1 });
    s.beaten = Object.assign(s.beaten || {}, { mu: 1 });
    s.story = { beat: { c1_open: 0, c1_climax: 36, c1_end: 36, c2_open: 36, c2_mid1: 70, c2_climax: 100, c2_end: 100, c3_open: 101 }, last: 101, chAt: { 0: 0, 1: 36, 2: 100 }, retry: {} };
    s.evDone = Object.assign(s.evDone || {}, { story_r1: 1, story_r2: 1, s2_invite: 1 });
    if (shape === 'A') { s.flags.inviteAt = 1e9; s.eflags = Object.assign(s.eflags || {}, { path_san: 1 }); }   // 抉择二选了“哪家也不去”
    else { s.flags.inviteAt = 126 + 12; }                                                                       // 没人请：三宗争徒一直在等筑基 / 洞府空
    s.storyQ = []; delete s.ap;
    return s;
  };
  for (const shape of ['A', 'B']) {
    const who = `第三章散修（${shape === 'A' ? '选了哪家也不去' : '没人邀请'}）`;
    const s = load(lone3(shape));
    common(who, s, 126);
    tag('B', L.chapterNow(s) === 2 && L.loneRoute(s), `${who}：第 3 章、走散修表（L.loneRoute）`);
    tag('B', typeof L.mainActs === 'function' && (L.mainActs(s) || []).length > 0 && L.mainActs(s).some(a => a.ok || a.why), `${who}：L.mainActs 非空且有一项可做 / 写明差什么（击败赵乾、击败 3 个首领）`);
    tag('B', typeof L.knockWhy === 'function' && L.knockWhy(s, 'jian') === '', `${who}：【拜山门】随时可点（不看境界）`);
    const seq = chain(s, 'load');
    tag('B', !s.storyQ.length && !!s.story.beat.c3_open, `${who}：第一条链放完（${seq.length} 张），队列空、第三章开章节拍有了`);
    run8(who, s);
  }
  // 8. 三年之约已赢、戏压着没播（旧节流压着）：迁移 + 第一条链之后，压着的开章与抉择全部已播（H10）
  { const o = legacy(mid()); o.tick = 48; o.sect = null; o.flags.inviteAt = 60; o.quest = o.quest || {}; o.quest.done = Object.assign(o.quest.done || {}, { c0_m: 1 });
    o.story = { beat: {}, last: -99, chAt: { 0: 0 }, retry: {} }; o.evDone = {}; o.storyQ = [];
    const s = load(o); const seq = chain(s, 'load'); const b = s.story.beat;
    tag('B', b.c1_climax !== undefined && b.c1_end !== undefined && b.c2_open !== undefined && !s.storyQ.length && !!s.evDone.story_r1, `三年之约已赢、戏压着：第一条链把 c1_climax / c1_end / c2_open（story_r1）补完（${JSON.stringify({ c1_climax: b.c1_climax, c1_end: b.c1_end, c2_open: b.c2_open })}；链 ${seq.length} 张）`); }
  // 给界面部分用的旧形状（读档后界面要能接上：没有在外 / 闭关中、季界、迁移提示一次）
  { const o1 = legacy(mid()); o1.tick = 123; L.startExp(o1, 0, 0, 0); L.tripStep(o1); OLD.exp = JSON.stringify(o1);
    const o2 = legacy(mid()); o2.tick = 123; L.startRetreat(o2); OLD.ret = JSON.stringify(o2);
    const o3 = legacy(mid()); o3.tick = 121; OLD.tick1 = JSON.stringify(o3);
    OLD.lone3 = JSON.stringify(lone3('A')); }
  // 调试：SVDUMP=文件 把这几份旧形状的档写出来就退出（给复现偶发问题的脚本用）
  if (process.env.SVDUMP) { fs.writeFileSync(process.env.SVDUMP, JSON.stringify(OLD)); process.exit(0); }
  L.ONB_ON = onb0; L.rng = rng0;
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
    // 往前过 n 季：新界面点【下一季】（window.__xm.nextSeason）；界面线还没合进来时退回逐月推进（旧界面）。每季之后把弹出来的卡关掉
    const adv = async (n, pg) => {
      pg = pg || page; const e = (fn, x) => pg.evaluate(fn, x);
      for (let i = 0; i < n; i++) {
        if (process.env.SVDBG) console.log('    adv', JSON.stringify(await e(() => ({ t: window.__xm.st.tick, b: window.__xm.busyUI, c: window.__xm.chainOn, m: (document.querySelector('#modal:not([hidden]) h2') || {}).textContent, tk: !!(window.__xm_talk && window.__xm_talk.on), x: !!window.__xm.st.exp, r: !!window.__xm.st.run, q: window.__xm.queueLen }))));
        if (await e(() => typeof window.__xm.nextSeason === 'function')) await e(() => window.__xm.nextSeason());
        else await e(() => { const X = window.__xm; for (let m = 0; m < 3; m++) { X.L.flow(X.st, 1); X.onTick(); } });
        // 结算链没出完时【下一季】点不动（__xm.busyUI）：一张一张关到链出完
        for (let g = 0; g < 60; g++) { if (!(await e(() => window.__xm.busyUI === undefined ? !document.getElementById('modal').hidden && !window.__xm.cine : window.__xm.busyUI))) break; await e(() => { const X = window.__xm; if (window.__xm_talk && window.__xm_talk.on) { const p = document.querySelector('.tk-pick:not([disabled])'); if (p) p.click(); else window.__xm_talk.close(); return; } if (document.getElementById('modal').hidden) return; const c = document.querySelector('#modal .choices .btn:not([disabled])'); if (c) { c.click(); return; } const f = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')].filter(b => !/出发|扫荡|再去/.test(b.textContent)); if (f.length) f[f.length - 1].click(); else X.closeModal(); }); await pg.waitForTimeout(150); }
      }
    };
    // 旧档：升级前那一份（只有 xiantu_save_v2、没有索引）
    await page.goto(url); await page.waitForTimeout(300);
    const oldJson = JSON.stringify(Object.assign(JSON.parse(JSON.stringify(st0)), { guide: { step: 99, done: true }, hintSeen: {}, evDone: { s1_night: 1 } }));
    await ev(j => { localStorage.clear(); localStorage.setItem('xiantu_save_v2', j); }, oldJson);
    await page.reload(); await page.waitForTimeout(700);
    check(await ev(() => document.getElementById('intro').hidden && window.__xm.st && window.__xm.st.p.name === '甲'), '旧档：开游戏直接读进来');
    await ev(() => { const X = window.__xm; if (X.setSpeed && X.pauseIdx !== undefined) X.setSpeed(X.pauseIdx); X.L.onbAll(X.st); for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) X.closeModal(); });
    await page.waitForTimeout(500);
    await ev(() => { for (let i = 0; i < 4; i++) if (!document.getElementById('modal').hidden) window.__xm.closeModal(); });
    // 入口：仙途 → 设置 → 存档
    await ev(() => window.__xm.showSettings()); await page.waitForTimeout(250);
    await page.click('#btnSaves'); await page.waitForTimeout(300);
    const pg = await ev(() => ({ t: document.querySelector('#modal h2').textContent, rows: [...document.querySelectorAll('#modal [data-sv]')].map(r => ({ id: r.dataset.sv, h: r.getBoundingClientRect().height, txt: r.textContent })) }));
    check(/存档/.test(pg.t) && pg.rows.length === 6, `设置 → 存档：6 格（${pg.rows.map(r => r.id).join(' ')}）`);
    check(/自动 1/.test(pg.rows[0].txt) && /第一章|第二章/.test(pg.rows[0].txt) && /第1世/.test(pg.rows[0].txt) && /第\s*\d+\s*年\s*(\d+月|·\s*[春夏秋冬])/.test(pg.rows[0].txt), '自动 1 一行：第 N 章 · 境界 · 第 X 年 · 季（旧界面写月）· 第几世 · 时间：' + pg.rows[0].txt.replace(/\s+/g, ' ').slice(0, 60));
    const shape = () => ev(() => {
      const m = document.querySelector('#modal .sheet'), vw = window.innerWidth;
      const small = [...m.querySelectorAll('button, [data-sv]')].filter(x => x.getBoundingClientRect().height && x.getBoundingClientRect().height < 44 - 0.5).map(x => (x.id || x.textContent).slice(0, 8));
      const over = [...m.querySelectorAll('*')].some(x => { const r = x.getBoundingClientRect(); return r.width && (r.right > vw + 1 || r.left < -1); });
      return { small, over };
    });
    let sh = await shape();
    check(!sh.small.length && !sh.over, `存档页：可点的都 ≥ 44px${sh.small.length ? '（小：' + sh.small.join(',') + '）' : ''} · ${sh.over ? '横向溢出' : '不溢出'}`);
    await page.screenshot({ path: `${out}/${tag}-saves.png` });
    // 手动 1：存到这里（这份档里不留排着的剧情：读回来不该冒出弹窗；开章那场戏算看过了）
    await ev(() => { const s = window.__xm.st; s.storyQ.length = 0; s.evDone.s1_night = 1; });
    await page.click('#modal [data-sv="m0"]'); await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${tag}-slot-new.png` });
    const t0 = await ev(() => window.__xm.st.tick);
    await page.click('#modal .foot .btn.gold'); await page.waitForTimeout(300);
    check(await ev(t => { const h = window.__xm.slots.index().m[0]; return h && h.tick === t && /已存到手动 1/.test(document.querySelector('#modal').textContent); }, t0), '手动 1：点“存到这里”存下，回存档页有提示');
    // 往前走几个月 + 两个真的关键节点（章末、年报）
    await ev(() => window.__xm.closeModal()); await adv(2);
    await ev(() => { const X = window.__xm; X.st.flags.chEnd = {}; X.showChapterCard(0); });
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
    // 接着玩 10 季（30 个月）
    await adv(10);
    await page.waitForTimeout(600);
    check(!errs.length && (await ev(() => window.__xm.st.tick)) >= Math.ceil(t0 / 3) * 3 + 27, `读档后接着过 10 季（这份档是逐月推出来的，第一季只补到季界）：tick ${await ev(() => window.__xm.st.tick)}，${errs.length ? '报错 ' + errs[0] : '无报错'}`);
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
    await ev(() => window.__xm.closeModal()); await adv(1);
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
    // 旧档读进新界面（AP_PLAN §7、§6.4）：在外历练 / 闭关中 / tick % 3 = 1 / 第三章散修（形状见上面逻辑部分的 OLD）。每个形状一个全新的浏览器上下文（localStorage 不串）
    for (const [k, label] of [['exp', '在外历练'], ['ret', '闭关中'], ['tick1', 'tick % 3 = 1'], ['lone3', '第三章散修']]) {
      const c2 = await b.newContext(opts), p2 = await c2.newPage(), e2 = (fn, x) => p2.evaluate(fn, x), er2 = [];
      p2.on('pageerror', e => er2.push(e.message + (process.env.SVDBG ? ' @ ' + String(e.stack || '').split('\n').slice(1, 4).join(' | ') : ''))); p2.on('console', m => { if (m.type() === 'error') er2.push('console: ' + m.text()); });
      await p2.goto(url); await p2.waitForTimeout(300);
      const json = JSON.stringify(Object.assign(JSON.parse(OLD[k]), { guide: { step: 99, done: true }, hintSeen: {} }));
      await e2(j => { localStorage.clear(); localStorage.setItem('xiantu_save_v2', j); }, json);
      await p2.reload(); await p2.waitForTimeout(900);
      if (!(await e2(() => !!window.__xm))) { check(false, `${dev} 旧档（${label}）：页面没起来：${er2.slice(0, 2).join(' | ')}`); await c2.close(); continue; }
      let text = '';
      const r = await e2(() => { const X = window.__xm, st = X.st; return { ok: !!st, exp: !!(st && st.exp), ret: !!(st && st.retreat && st.retreat.left > 0), m3: st && st.tick % 3, ap: !!(st && st.ap && st.ap.migrated), speedBtn: !!document.getElementById('btnSpeed') }; });
      const okLoad = r.ok && !r.exp && !r.ret && r.m3 === 0 && r.ap;
      check(okLoad, `${dev} 旧档（${label}）：读进来后没有在外 / 闭关中、tick 在季界、st.ap 已迁` + (okLoad ? '' : ' ' + JSON.stringify(r)));
      if (k === 'exp') check(!r.speedBtn, `[C] ${dev}：#btnSpeed 不存在（速度键已删）`);
      // 第一条链：一张一张点掉（至多 30 张：旧档迁移会把压着的戏连着补出来），期间的字都收下来，看有没有那条一次性的提示
      for (let g = 0; g < 30; g++) {
        text += await e2(() => document.body.innerText);
        if (!(await e2(() => !document.getElementById('modal').hidden || !!window.__xm.cine || !!(window.__xm_talk && window.__xm_talk.on) || !!window.__xm.busyUI))) break;
        await e2(() => { const X = window.__xm; if (window.__xm_talk && window.__xm_talk.on) { const p = document.querySelector('.tk-pick:not([disabled])'); if (p) p.click(); else window.__xm_talk.close(); return; } if (document.getElementById('modal').hidden) return; const c = document.querySelector('#modal .choices .btn:not([disabled])'); if (c) { c.click(); return; } const f = [...document.querySelectorAll('#modal .foot .btn:not([disabled])')].filter(b => !/出发|扫荡|再去/.test(b.textContent)); if (f.length) f[f.length - 1].click(); else X.closeModal(); }); await p2.waitForTimeout(400);
      }
      check(/时间不再自己走了/.test(text), `[C] ${dev} 旧档（${label}）：读档后出一次提示“时间不再自己走了。每季 3 点行动点，用完点【下一季】。”`);
      await adv(1, p2);
      check(!er2.length, `${dev} 旧档（${label}）：第一条链关完、再过一季：无报错${er2.length ? '：' + er2.slice(0, 2).join(' | ') : ''}`);
      await c2.close();
    }
    check(!errs.length, dev + '：页面无报错' + (errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''));
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? `${fails.length} 项未通过：\n` + fails.join('\n') : '全部通过');
  if (fails.length) process.exitCode = 1;
})().catch(e => { console.error('FAIL', e.message.slice(0, 800)); process.exit(1); });
