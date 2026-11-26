// 功法推荐一致性检查（src/logic/artrec.js 的 L.artRecommend，docs/SYSTEMS.md §2.6）：node tools/rec_check.js [截图目录] [--html 别的 dist] [--noui] [--loose]
// 逻辑（node）：构造几种情境——只有通用 / 正要去某五行地图（与刚从那里回来）/ 三年之约前 / 论道前，手里同时有青藤缚（木）、燎原式（火）和别的黄阶战技，断言：
//   · 所有入口给同一门：L.artRecommend、功法页“荐”（L.artList）、变强页各页签的换战技牌（L.advise 的 pool）、掉落卡【换上】（L.artRecWhy）、
//     备战 / 论道准备页（L.duelArtBest 对同一个对手）、出发页（ctx {k,d}）= 从那张图回来后的平时推荐；推荐都带原因
//   · 照推荐换上以后，任何入口都不再推回去（乒乓）；不换时连续多个月，情境不变推荐就不变
//   · guided 跑 3 世（各 360 月），每月复制一份、补上全套黄阶战技：变强页（目标 / 战力 / 修炼页签）照第一张换战技牌换上后不再推回原来那门
// 界面（playwright，Pixel 7）：同一个存档里，功法页“荐”、变强页换战技牌、出发页【换上】是同一门、原因相同，截图；
//   --loose 只截图、列出不一致（量“修之前”的旧 dist 用：node tools/rec_check.js out --html 旧dist/index.html --loose）
const path = require('path');
const fs = require('fs');
const argv = process.argv.slice(2);
const flag = k => argv.includes(k);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = argv[0] && !argv[0].startsWith('--') ? argv[0] : path.join(__dirname, '..', 'shots', 'rec');
const HTML = opt('--html', path.join(__dirname, '..', 'dist', 'index.html'));
const LOOSE = flag('--loose');
fs.mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : (LOOSE ? '  diff ' : '  FAIL ')) + what); if (!ok && !LOOSE) fails.push(what); };
const Z1 = ['z_qingteng', 'z_liaoyuan', 'z_liejin', 'z_liuyun', 'z_wuxing'];
const clone = s => JSON.parse(JSON.stringify(s));

function logic() {
  const sim = require('./sim.js'), L = sim.L;
  if (!L.artRecommend) { console.log('  （没有 L.artRecommend：跳过逻辑部分）'); return {}; }
  const give = st => { for (const id of Z1) if (!L.artOwned(st, id)) st.arts.own[id] = 0; return st; };
  const idle = st => { st.exp = null; st.retreat = null; st.run = null; if (st.p.inj) st.p.inj = 0; return st; };
  const swapIds = (st, f) => L.advise(st, f).pool.filter(a => /^swap:/.test(a.id)).map(a => a.id.slice(5));
  const name = id => (id ? L.art(id).n : '—');
  // 所有入口：返回 { rec, list, adv: {focus: [ids]}, drop: [ids], duel? }
  const entries = (st, foe) => {
    const rc = L.artRecommend(st, 1), r = rc && !rc.same ? rc.id : '';
    const lr = L.artList(st, 1).find(x => x.rec);
    const adv = {}; for (const f of ['goal', 'atk', 'cul', 'inc', 'bt']) adv[f] = swapIds(st, f);
    const drop = Object.keys(st.arts.own).filter(id => L.art(id).k === 'z' && L.artRecWhy(st, id));
    const duel = foe ? L.duelArtBest(st, foe.foe, foe.Q, foe.scale) : null;
    return { rc, r, list: lr ? lr.id : '', lwhy: lr ? lr.why : '', adv, drop, duel: duel ? (duel.same ? '' : duel.id) : undefined };
  };
  const agree = (tag, st, foe) => {
    const E = entries(st, foe);
    const advOk = Object.values(E.adv).every(a => a.every(id => id === E.r));
    const ok = E.list === E.r && advOk && (E.r ? E.drop.length === 1 && E.drop[0] === E.r : E.drop.length === 0) && (E.duel === undefined || E.duel === E.r) && (!E.r || !!E.rc.why);
    check(ok, `${tag}：推荐《${name(E.r)}》（${E.rc ? E.rc.ctx.kind : '-'}：${E.rc && E.rc.why || '不用换'}）· 功法页荐《${name(E.list)}》· 变强页 ${JSON.stringify(E.adv)} · 掉落卡 ${E.drop.join() || '—'}${E.duel !== undefined ? ` · 备战卡《${name(E.duel)}》` : ''}`);
    return E;
  };
  // 照推荐换上：再问一遍，不能推别的（尤其不能推回原来那门）；不换时 n 个月里情境不变推荐不变
  const stable = (tag, st0, months, foeOf) => {
    const st = clone(st0); let back = 0, jumps = 0, last = null, lastCtx = '', seq = [];
    for (let m = 0; m < months; m++) {
      const rc = L.artRecommend(st, 1), cur = L.artSlots(st)[1];
      const ck = rc ? rc.ctx.kind + (rc.ctx.k !== undefined ? rc.ctx.k + '/' + rc.ctx.d : '') + (rc.ctx.big || '') : '';
      if (rc && !rc.same) {
        L.equipArt(st, rc.id);
        const r2 = L.artRecommend(st, 1), adv2 = ['goal', 'atk', 'cul'].flatMap(f => swapIds(st, f));
        if (!r2.same || adv2.length) back++;
        seq.push(`t${st.tick}:${name(rc.id)}`);
      }
      const now = L.artSlots(st)[1];
      if (last !== null && now !== last && ck === lastCtx) jumps++;
      last = now; lastCtx = ck;
      st.exp = null; L.tick(st); idle(st);
    }
    check(back === 0 && jumps === 0, `${tag}：连续 ${months} 月照推荐换，换后又推别的 ${back} 次、同一情境里换来换去 ${jumps} 次（${seq.join(' → ') || '一直不用换'}）`);
  };
  const out = {};
  // ---------- 情境 ----------
  const s15 = idle(give(sim.run('guided', 1, false, { keep: true, maxT: 15 }).st));
  // 1. 只有通用：没去过历练、大节点还远
  { const st = clone(s15); delete st.lastExp; const E = agree('只有通用', st); check(E.rc && E.rc.ctx.kind === 'gen', `只有通用：情境是 gen（${E.rc && E.rc.ctx.kind}）`); stable('只有通用', st, 6); out.gen = st; }
  // 2. 要去某五行地图：黑风岭外围（精英刀疤头目，金）→ 火克金；后山野林腹地（铁背熊，土）→ 木克土
  for (const [k, d, want] of [[1, 0, 'z_liaoyuan'], [0, 1, 'z_qingteng']]) {
    const st = clone(s15); delete st.lastExp;
    const row = L.cellFoes(k, d); st.meta.foes = st.meta.foes || {}; st.meta.foes[row.elite] = 1;
    // 起手装着另一门（青藤缚 / 燎原式互换），看出发页推什么
    st.arts.slot[1] = want === 'z_liaoyuan' ? 'z_qingteng' : 'z_liaoyuan';
    const here = L.artRecommend(st, 1, { k, d, here: true });
    check(here && here.id === want && /克这张图/.test(here.why), `出发页 ${L.REGIONS[k].n}${L.DEPTHS[d]}：推《${name(here && here.id)}》（${here && here.why}）`);
    // 出发（lastExp 记下这一格）→ 回来：平时的推荐还是它，不叫换回去
    L.equipArt(st, here.id); st.lastExp = { k, d, a: 0, r: 3, t: st.tick };
    const E = agree(`从${L.REGIONS[k].n}${L.DEPTHS[d]}回来`, st);
    check(E.r === '' && E.rc.ctx.kind === 'map', `从${L.REGIONS[k].n}${L.DEPTHS[d]}回来：不叫换回去（${E.rc && E.rc.ctx.kind} · ${E.r ? '推《' + name(E.r) + '》' : '不用换'}）`);
    // 换回另一门再看：推荐就是出发页那门
    st.arts.slot[1] = want === 'z_liaoyuan' ? 'z_qingteng' : 'z_liaoyuan';
    const E2 = agree(`${L.REGIONS[k].n}${L.DEPTHS[d]}（装着另一门）`, st);
    check(E2.r === want, `${L.REGIONS[k].n}${L.DEPTHS[d]}：平时的推荐 = 出发页那门《${name(want)}》（${E2.rc && E2.rc.why}）`);
    stable(`${L.REGIONS[k].n}${L.DEPTHS[d]}之后`, st, 6);
    out['map' + k + d] = st;
  }
  // 3. 三年之约前（还有 2 月）：慕容是水 → 土克水
  {
    // 行动点制下 sim 按季推进（maxT 落在季末），所以不按 maxT 取，而是逐月看：约战没打、离约战 ≤ L.ART_REC.big 月、人在洞府的最后一个月
    let found = null;
    sim.run('guided', 1, false, { keep: true, maxT: L.PACT_TICK + 3, onTick: s => { const b = L.bigNext(s); if (!s.pact && b && b.k === 'pact' && b.left <= L.ART_REC.big && b.left >= 1) found = clone(s); } });
    check(!!found, `三年之约前：取到约战前 ≤ ${L.ART_REC.big} 月的存档（第 ${found && found.tick} 月，还有 ${found && L.bigNext(found).left} 月）`);
    let st = idle(give(found));
    st.arts.slot[1] = 'z_liaoyuan';   // 火被慕容的水克
    // 让胜算不贴着 97% 的上限：约战对手的战力调到与装着燎原式时五五开（界面那边同样设）
    const Q0 = L.PACT_POWER; L.PACT_POWER = L.pactInfo(st).S; st._pactQ = L.PACT_POWER;
    const pi = L.pactInfo(st), foe = { foe: L.PACT_FOE, Q: pi.Q, scale: S => S * L.pactAssist(st) };
    const E = agree('三年之约前', st, foe);
    // 推的那门胜算在最高的一档（胜算封顶 97% 时几门同档，档里比通用战力）
    const pOf = id => L.artTry(st, id, () => L.pactInfo(st).p), ps = Object.keys(st.arts.own).filter(id => L.art(id).k === 'z').map(pOf), top = Math.max(...ps);
    check(E.rc && E.rc.ctx.kind === 'duel' && E.rc.ctx.big === 'pact' && !!E.r && pOf(E.r) >= top - L.ART_REC.pEps, `三年之约前：情境 ${E.rc && E.rc.ctx.kind}/${E.rc && E.rc.ctx.big}，推《${name(E.r)}》胜算 ${L.pct(pOf(E.r || L.artSlots(st)[1]))}（最高 ${L.pct(top)}；${E.rc && E.rc.why}）`);
    check(!!E.r && E.rc.p1 - E.rc.p0 >= L.ART_REC.pEps, `三年之约前：换上推荐那门胜算 ${L.pct(E.rc.p0 || 0)} → ${L.pct(E.rc.p1 || 0)}`);
    stable('三年之约前', st, 2);
    L.PACT_POWER = Q0;
    out.pact = st;
  }
  // 4. 论道前：本届第一场有宿敌、还有 ≤ 3 月
  {
    let found = null;
    sim.run('guided', 2, false, { keep: true, maxT: 260, onTick: s => { if (!found && s.pact && L.tourFoe(s) && L.nextTour(s) <= 3 && L.nextTour(s) >= 2 && !L.busy(s)) found = clone(s); } });
    if (!found) check(false, '论道前：guided 种子 2 没碰上有宿敌的一届');
    else {
      const st = idle(give(found)), tf = L.tourFoe(st);
      // 起手装一门被他克的（他的五行克它），看各处推不推同一门
      const bad = Object.keys(st.arts.own).find(id => L.art(id).k === 'z' && L.elKe(L.RIVAL_EL[tf.id], L.art(id).el));
      if (bad) { st.arts.slot[1] = bad; st._start = bad; }
      const E = agree(`论道前（${L.rivalName(st, tf.id)}，${L.elName(L.RIVAL_EL[tf.id])}）`, st, { foe: tf.foe, Q: tf.Q });
      // 推的那门（不用换就是装着的）胜算在最高的一档；装着的不在最高档就一定要推
      const pOf = id => L.artTry(st, id, () => L.duelP(st, L.duelPower(st, tf.foe), tf.Q, tf.foe)), top = Math.max(...Object.keys(st.arts.own).filter(id => L.art(id).k === 'z').map(pOf));
      const pick = E.r || L.artSlots(st)[1];
      check(pOf(pick) >= top - L.ART_REC.pEps && (pOf(L.artSlots(st)[1]) >= top - L.ART_REC.pEps || !!E.r), `论道前：推《${name(pick)}》胜算 ${L.pct(pOf(pick))}（最高 ${L.pct(top)}，装着的 ${L.pct(pOf(L.artSlots(st)[1]))}）`);
      check(E.rc && E.rc.ctx.kind === 'duel' && E.rc.ctx.big === 'tour', `论道前：情境 ${E.rc && E.rc.ctx.kind}/${E.rc && E.rc.ctx.big}（${E.rc && E.rc.why || '不用换'}）`);
      // L.tourSwap（guided 与准备页的【换上】）换的就是这一门
      const s2 = clone(st), sw = L.tourSwap(s2);
      check((sw ? sw.id : '') === E.r, `论道前：L.tourSwap 换《${name(sw && sw.id)}》= 推荐《${name(E.r)}》`);
      stable('论道前', st, 2);
      out.tour = st;
    }
  }
  // ---------- guided 一世，每月复制一份：变强页不乒乓 ----------
  for (const seed of [1, 2, 3]) {
    let n = 0, pp = 0, bad = 0; const ex = [];
    sim.run('guided', seed, false, { keep: true, maxT: 360, onTick: s0 => {
      if (!s0.arts) return;
      const st = give(clone(s0)); n++;
      const rc = L.artRecommend(st, 1);
      for (const f of ['goal', 'atk', 'cul']) {
        const ids = swapIds(st, f);
        if (ids.some(id => !rc || id !== rc.id)) { bad++; if (ex.length < 3) ex.push(`t${st.tick}[${f}] 牌${ids} ≠ 荐${rc && rc.id}`); }
        if (!ids.length) continue;
        const z0 = L.artSlots(st)[1], s2 = clone(st); L.equipArt(s2, ids[0]);
        const back = swapIds(s2, f);
        if (back.length) { pp++; if (ex.length < 3) ex.push(`t${st.tick}[${f}] ${z0}→${ids[0]} 又推 ${back}`); }
      }
    } });
    check(pp === 0 && bad === 0, `guided 种子 ${seed}：${n} 个月，变强页照换后又推 ${pp} 次、牌与“荐”不一致 ${bad} 次${ex.length ? '（' + ex.join('；') + '）' : ''}`);
  }
  return out;
}

async function ui(states) {
  let chromium, devices;
  try { ({ chromium, devices } = require('playwright')); } catch (e) { console.log('  （没有 playwright：跳过界面部分）'); return; }
  const b = await chromium.launch();
  const page = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + HTML); await page.waitForTimeout(400);
  for (let i = 0; i < 12; i++) { if (await page.$('#goStart')) break; await page.click('#intro .story'); await page.waitForTimeout(100); }
  await page.click('#goStart'); await page.waitForTimeout(600);
  const ev = (fn, a) => page.evaluate(fn, a);
  await ev(() => window.__xm.setSpeed(window.__xm.pauseIdx));
  const scen = [['map10', 1, 0, 'z_qingteng'], ['map01', 0, 1, 'z_liaoyuan'], ['pact', 0, 0, null], ['tour', null, null, null]];
  for (const [key, k, d, start] of scen) {
    const s = states[key]; if (!s) continue;
    const s2 = clone(s); s2.guide = Object.assign({ step: 99 }, s2.guide, { done: true }); s2.hintSeen = Object.assign({}, s2.hintSeen); if (start || s._start) s2.arts.slot[1] = start || s._start;
    if (key.startsWith('map')) delete s2.lastExp;   // 正要去：还没去过这一格
    await ev(q => { if (q) window.__xm.L.PACT_POWER = q; }, s2._pactQ || 0);
    await ev(x => { window.__xm.loadState(x); window.__xm.closeModal(); window.__xm.setSpeed(window.__xm.pauseIdx); for (const h of window.__xm.hints) window.__xm.st.hintSeen[h.id] = 1; }, s2);
    await page.waitForTimeout(200);
    const read = async (what, open, sel) => { await ev(open.fn, open.a); await page.waitForTimeout(350); await page.screenshot({ path: `${OUT}/p7-${key}-${what}.png` }); return ev(sel); };
    const arts = await read('arts', { fn: () => window.__xm.showArts(1) }, () => { const r = [...document.querySelectorAll('#modal .arow')].find(x => /荐/.test((x.querySelector('.chip') || {}).textContent || '')); return r ? { id: r.dataset.art, why: ((r.querySelector('.arec-why') || {}).textContent || '') } : { id: '', why: '' }; });
    const grow = await read('growth', { fn: () => window.__xm.showGrowth('goal') }, () => { const { st, L } = window.__xm, A = L.advise(st, 'goal'); const i = A.acts.findIndex(a => /^swap:/.test(a.id)); const el = i >= 0 && document.querySelectorAll('#modal .gw-act')[i]; return { id: i >= 0 ? A.acts[i].id.slice(5) : '', nm: el ? el.querySelector('.nm').textContent : '', why: el ? el.querySelector('.gw-cost').textContent : '' }; });
    let exp = null;
    if (k !== null) exp = await read('exp', { fn: x => window.__xm.confirmExp(x[0], x[1], 0), a: [k, d] }, () => { const b = document.querySelector('#modal .bt-rec [data-swapz], #modal #expElem [data-swapz]'); return { id: b ? b.dataset.swapz : '', t: b ? b.textContent : '' }; });
    // 照出发页（或功法页）的推荐换上，回到变强页 / 功法页：都不再推别的
    const take = exp && exp.id ? exp.id : arts.id;
    let after = null;
    if (take) {
      await ev(x => { const { st, L } = window.__xm; L.equipArt(st, x.id); if (x.k !== null) st.lastExp = { k: x.k, d: x.d, a: 0, r: 3, t: st.tick }; window.__xm.closeModal(); }, { id: take, k, d });
      const a2 = await read('arts-after', { fn: () => window.__xm.showArts(1) }, () => [...document.querySelectorAll('#modal .arow')].filter(x => /荐/.test((x.querySelector('.chip') || {}).textContent || '')).map(x => x.dataset.art).join());
      const g2 = await read('growth-after', { fn: () => window.__xm.showGrowth('goal') }, () => { const { st, L } = window.__xm; return L.advise(st, 'goal').acts.filter(a => /^swap:/.test(a.id)).map(a => a.id.slice(5)).join(); });
      after = { arts: a2, grow: g2 };
    }
    const same = (!grow.id || grow.id === arts.id) && (!exp || !exp.id || !arts.id || exp.id === arts.id) && (!arts.id || !!arts.why);
    check(same, `界面 ${key}：功法页荐《${arts.id}》“${arts.why}” · 变强页《${grow.id}》“${grow.why}” · 出发页${exp ? `《${exp.id}》“${exp.t}”` : '—'}`);
    if (after) check(!after.arts && !after.grow, `界面 ${key}：换上《${take}》${k !== null ? '、走完这一格' : ''}后 功法页荐“${after.arts || '无'}” · 变强页换战技牌“${after.grow || '无'}”`);
    await ev(() => window.__xm.closeModal());
  }
  check(errs.length === 0, `页面报错 ${errs.length}${errs.length ? '：' + errs.slice(0, 3).join(' | ') : ''}`);
  await b.close();
}

(async () => {
  console.log('逻辑');
  const states = logic();
  if (!flag('--noui')) { console.log('界面（Pixel 7）'); await ui(states); }
  console.log(fails.length ? `\n${fails.length} 项不通过` : '\n全部通过');
  process.exit(fails.length ? 1 : 0);
})();
