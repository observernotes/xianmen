/* 废柴仙途 · 界面片段 guide：戒中老祖：引导、提示、指南、札记
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 台词按 DESIGN §4.2～§4.3 的编号（E01… / U01… / S02…）。每句里的数字都是当场从逻辑层算的。 */
// ---------- 戒中老祖提示 ----------
function tip(key, text) {
  if (!st || st.seenTips[key]) return;
  st.seenTips[key] = 1;
  const el = $('#tip');
  const gone = st.eflags && st.eflags.st_farewell;
  el.innerHTML = `<img class="px" src="${ELDER}" alt=""${gone ? ' style="opacity:.4"' : ''}><div class="grow"><span class="who">${gone ? '戒中余音' : '戒中老祖'}：</span>${esc(text)}</div><span class="x">×</span>`;
  el.hidden = false;
  el.onclick = () => { el.hidden = true; SFX.tap(); };
}

// ---------- 新手引导 ----------
const modalTitle = () => { const h = document.querySelector('#modal:not([hidden]) h2'); return h ? h.textContent.replace(/^主线/, '').trim() : ''; };
const modalOpen = () => !$('#modal').hidden;
const PI = () => L.pactInfo(st);
const BIG = '#stats button[data-s="big"]';
const dec = v => L.fmt1(v);   // 100 以下保留一位小数（10.8 不会显示成 10）
let lastExp = null;
let lastUp = null;   // 最近一次升小层前后的战力（hud 的 stageUp 记下），给 E11 用
const R0 = () => L.REGIONS[0].n;
// 新手引导（阻塞讲解 E01～E09）：学游戏发展国的秘书——一次只说一两句、说话时暂停、句句带数字，说完立刻让你动手
const GUIDE = [
  { id: 'welcome', text: '小子，别东张西望，就是你手上这枚锈戒。老夫在里面睡了<b>三千年</b>。', btn: '……你是谁' },
  { id: 'stakes', target: BIG, text: () => { const pi = PI(); return `<b>三年之约</b>还剩 <b>${pi.left} 个周天</b>（一周天约 5 秒），到时${esc(st.exName)}要在擂台上当众羞辱你。她战力 <b>${fmt(pi.Q)}</b>，你 <b>${fmt(pi.base)}</b>，老夫借你一口气翻 <b>${pi.assist} 倍</b>，胜算才 <b>${L.pct(pi.p)}</b>。`; }, btn: '那怎么办' },
  { id: 'expNav', show: () => !modalOpen() && !st.exp, target: '[data-nav="exp"]', text: () => `光打坐来不及。出去<b>【历练】</b>：打妖兽有灵石，还能捡法宝。一趟 <b>${L.expLen(0)} 个周天</b>。`, until: () => modalTitle() === '外出历练' || !!st.exp },
  { id: 'expPick', show: () => modalTitle() === '外出历练', target: '#modal .card[data-k="0"]', text: () => `就这儿，<b>${R0()}·外围</b>。推荐战力 <b>${fmt(L.rec(0, 0))}</b>，你 <b>${fmt(L.power(st))}</b>，稳拿<b>甲</b>。`, until: () => modalTitle() === R0() || !!st.exp, back: () => (!modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'expGo', show: () => modalTitle() === R0(), target: '#modal .foot .btn.gold', text: () => `行事先用<b>【斩妖】</b>，预计评价 <b>${L.expForecast(st, 0, 0, 0).text}</b>。点<b>出发</b>，<b>${L.expLen(0)} 个周天</b>就回来。`, until: () => !!st.exp, back: () => (modalTitle() === '外出历练' ? 'expPick' : !modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'haul', show: () => !modalOpen() && !!st.exp, target: '#haul', text: '看这一条：这趟的收获，一个周天涨一截。嫌慢就点右上角的<b>×1</b>加速（×2、×4）。', btn: '好' },
  { id: 'waitExp', silent: true, until: () => st.stats.exp >= 1 && !modalOpen() && !st.exp },
  { id: 'afterExp', show: () => !modalOpen() && !!lastExp, target: '#stats button[data-s="atk"]', text: () => {
      const e = lastExp, pi = PI(), it = e.items.find(x => x.kind === 'w' && x.equip);
      const p0 = L.duelChance(e.pw0 * pi.S / L.power(st), pi.Q);
      const pp = L.pct(p0) === L.pct(pi.p) ? `胜算还是 <b>${L.pct(pi.p)}</b>，差得远` : `胜算 <b>${L.pct(p0)} → ${L.pct(pi.p)}</b>`;
      return `看见没？${it ? `一把<b>${esc(it.name)}</b>，` : ''}战力 <b>${fmt(e.pw0)} → ${fmt(e.pw1)}</b>，${pp}。法宝每高一阶再涨三成，升一层再 ×${L.P.pwStage}。`;
    }, btn: '再接再厉', until: () => !lastExp },
  { id: 'homeNav', show: () => !modalOpen(), target: '[data-nav="home"]', text: () => `灵石要花出去才值钱。你有 <b>${fmt(st.stones)}</b> 灵石，去<b>【洞府】</b>。`, until: () => modalTitle() === '洞府' || st.home.array >= 1 },
  { id: 'homeArray', show: () => modalTitle() === '洞府', target: '#modal button[data-k="array"]', text: () => { const u = L.upInfo(st, 'array'); return `升<b>【聚灵阵】</b>（${fmt(u.cost)} 灵石）：修炼 <b>+${dec(u.d0)} → +${dec(u.d1)}</b> /周天。`; }, until: () => st.home.array >= 1, back: () => (!modalOpen() && st.home.array < 1 ? 'homeNav' : null) },
  { id: 'quests', show: () => !modalOpen(), target: '#goal', text: () => { const q = L.questView(st).first; return `不知道干嘛就看这张<b>札记</b>：做完就有赏${q ? `，眼下这条“${esc(L.questText(st, q))}”赏 <b>${esc(L.rewardText(st, q.rw))}</b>` : ''}。点开能看三条和本章主线。`; }, btn: '明白了' },
];
const nextName = () => (st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n);
const muNext = () => { const n = L.nextTour(st), q = L.rivalRank(st, 'mu'); const Q = Math.exp(L.rivalA(q) + L.RIVAL_SLOPE * (st.tick + n)); return { n, Q, p: L.duelChance(L.duelPower(st, L.PACT_FOE), Q) }; };
// 讲解与提示（E10 起）。urgent 的不受“两条之间隔 2 周天”的限制；intro: true 的是功能介绍，从旧版本迁来的老玩家直接算看过
const HINTS = [
  { id: 'trib', urgent: true, intro: true, when: () => /境界突破|飞升天劫/.test(modalTitle()) && st.p.r >= 1, target: '#btStep', btn: '知道了', text: () => `从金丹起要渡雷劫。基础 <b>${L.pct(L.REALMS[Math.min(st.p.r, 8)].rate)}</b>，一枚破境丹 <b>+${L.pct(L.BT.pill)}</b>，最多 ${L.BT.maxPills} 枚。失败修为退三成、伤 3 个周天，下次 <b>+${L.pct(L.BT.fail)}</b>。` },
  { id: 'ready', urgent: true, intro: true, when: () => L.isReady(st) && !modalOpen(), target: '#cult', text: () => `修为圆满了！点这个<b>金色的修为条</b>冲击${nextName()}${L.btGuard(st) ? '。头一回老夫护法，<b>必成</b>' : `，成功率 <b>${L.pct(L.btRate(st, btDefault()))}</b>`}。`, until: () => /突破|天劫/.test(modalTitle()) || !!cine },
  { id: 'btGo', urgent: true, intro: true, when: () => /境界突破|飞升天劫/.test(modalTitle()), target: '#modal .foot .btn.gold', text: () => `点它。成了之后战力约 <b>×${btPowerMult().toFixed(1)}</b>，寿元 <b>${fmt(L.lifespan(st))} → ${fmt(nextLife())}</b>。`, until: () => !!cine || !modalOpen() },
  { id: 'afterPact', urgent: true, intro: true, when: () => !!st.pact && !modalOpen(), target: BIG, btn: '好', text: () => {
      if (st.pact > 0) return `痛快！满城都知道你不是废物了。往后每 <b>${L.TOUR_EVERY} 个周天</b>一届<b>天骄论道</b>（下一届还剩 <b>${L.nextTour(st)}</b> 个周天），这一格换成它的倒计时。嫌慢可以开 ×2 了。`;
      const m = muNext();
      return `输了不丢人，认输才丢人。第 1 届论道第一场就是她，还剩 <b>${m.n} 个周天</b>，到时她战力约 <b>${fmt(m.Q)}</b>，你现在的胜算已经 <b>${L.pct(m.p)}</b>。`;
    } },
  { id: 'pactSoon', urgent: true, intro: true, when: () => !st.pact && st.guide.done && !modalOpen() && PI().left <= 12 && PI().left > 0, target: BIG, btn: '知道了', text: () => {
      const pi = PI(), tips = pactTips();
      return `还剩 <b>${pi.left} 个周天</b>。你 ${fmt(pi.base)}${pi.assist > 1 ? `×${pi.assist}` : ''} = <b>${fmt(pi.S)}</b>，她 <b>${fmt(pi.Q)}</b>，胜算 <b>${L.pct(pi.p)}</b>。` +
        (tips.length ? '锦囊：' + tips.map(x => `${x.t} → <b>${x.extra ? x.extra : L.pct(x.p)}</b>`).join('；') + '。点这一格看详情。' : '稳了，到时候让全城看看谁是废物。');
    } },
  { id: 'field', intro: true, when: () => st.guide.done && st.stats.exp >= 2 && L.homeOpen(st, 'field') && st.home.field === 0 && !modalOpen() && !st.exp, target: '[data-nav="home"]', btn: '好', text: () => { const u = L.upInfo(st, 'field'); return `带回来的灵草能种。开一块<b>【灵田】</b>（${fmt(u.cost)} 灵石）：每周天自己长 <b>${L.fmt1(u.d1)}</b> 灵石，<b>${u.payback} 个周天</b>回本。`; } },
  { id: 'retreat', intro: true, when: () => st.guide.done && L.retOpen(st) && !st.stats.retreat && !L.busy(st) && !modalOpen() && !L.isFull(st), target: '[data-nav="home"]', btn: '好', text: () => {
      const ri = L.retInfo(st);
      return `${lastUp ? `升了一层，战力 <b>${fmt(lastUp.pw0)} → ${fmt(lastUp.pw1)}</b>。` : ''}想更快就<b>【闭关】</b>：${ri.len} 个周天，修炼 <b>×${ri.m.toFixed(2)}</b>，多得 <b>${fmt(ri.extra)}</b> 修为。${ri.free ? '头一回老夫护法，不收灵石。' : `花 ${fmt(ri.cost)} 灵石。`}`;
    } },
  { id: 'retBtn', intro: true, when: () => modalTitle() === '洞府' && L.canRetreat(st) && !st.stats.retreat && !!document.querySelector('#btnRet'), target: '#btnRet', text: () => `点这里闭关：4 个周天修炼 <b>×${L.retInfo(st).m.toFixed(2)}</b>，期间不能出门。`, until: () => !!st.retreat || st.stats.retreat > 0 },
  { id: 'visitor', intro: true, when: () => !!st.visitor && !modalOpen() && !L.busy(st), target: '#sceneWrap', btn: '好', text: () => `门口有人。点画面里门口的<b>【！】</b>看看。这种事不急，<b>${st.visitor.left} 个周天</b>内理他就行。` },
  { id: 'depth', intro: true, when: () => modalTitle() === R0() && L.depthOpen(st, 0, 1) && !L.firstTrip(st) && !!document.querySelector('#modal [data-d="1"]:not([disabled])'), target: '#modal [data-d="1"]', btn: '知道了', text: () => `上回评价过乙，<b>【腹地】</b>开了：推荐战力 <b>${fmt(L.rec(0, 1))}</b>，你 <b>${fmt(L.power(st))}</b>，灵石 ×${L.REW.d}。丁等会负伤，自己掂量。` },
  { id: 'tuna', intro: true, when: () => L.tunaReady(st) && !modalOpen(), target: '#sceneWrap', btn: '好', text: () => `气满了。点一下画面里的你自己，运一个周天：立得 <b>${dec(L.gainCalm(st))}</b> 修为。` },
  { id: 'market', intro: true, when: () => st.guide.done && st.stats.exp >= 1 && !navLock('market') && !modalOpen(), target: '[data-nav="market"]', btn: '记住了', text: () => `<b>【坊市】</b>开了：破境丹 <b>${fmt(L.price(st, 'pill'))}</b> 灵石一枚（突破 +${L.pct(L.BT.pill)}），寻宝 <b>${fmt(L.price(st, 'box'))}</b> 一次。` },
  { id: 'furnace', intro: true, when: () => st.guide.done && L.homeOpen(st, 'furnace') && st.home.furnace === 0 && !modalOpen() && !st.exp, target: '[data-nav="home"]', btn: '好', text: () => `<b>【丹炉】</b>和<b>【洞府】</b>扩建能开了。丹炉 <b>${fmt(L.hCost('furnace', 0))}</b> 灵石，每级突破 +${L.pct(L.BT.furnace)}，还能炼丹。筑基要破境丹，一枚 +${L.pct(L.BT.pill)}。` },
  { id: 'alch', intro: true, when: () => st.home.furnace >= 1 && !modalOpen() && !st.exp && st.herbs >= L.herbCost(st, L.RECIPES[0]), target: '[data-nav="home"]', btn: '好', text: () => `丹炉有了，灵草 <b>${fmt(st.herbs)}</b> 株也够。<b>培元丹</b>立得 4 周天修为（${L.herbCost(st, L.RECIPES[0])} 灵草）；破境丹 ${L.herbCost(st, L.RECIPES[1])} 灵草一炉。成丹率 <b>${L.pct(L.alchRate(st))}</b>，炸炉只亏灵草。` },
  { id: 'heal', when: () => st.guide.done && st.p.inj > 0 && L.canHeal(st) && !L.busy(st) && !modalOpen(), target: '[data-nav="home"]', btn: '好', text: () => `负伤了：战力只剩六成、修炼减半，还要 <b>${st.p.inj}</b> 个周天。去<b>【洞府】</b>服一枚破境丹立刻就好（你有 <b>${st.pills}</b> 枚）。` },
  { id: 'sect', intro: true, when: () => !!st.sect && !modalOpen(), target: '[data-nav="sect"]', btn: '好', text: () => { const t = (st.sect.tasks || []).find(x => x.rw > 0); return `入宗了。看<b>任务板</b>：三件差事${t ? `，做一件给 <b>${fmt(t.rw)}</b> 贡献` : ''}；累计 <b>${fmt(L.SRANKS[1].c)}</b> 贡献升内门，俸禄 ×${L.SRANKS[0].pay} → ×${L.SRANKS[1].pay}。`; } },
  { id: 'tourSoon', intro: true, when: () => st.pact && st.stats.tour === 0 && L.nextTour(st) <= 6 && !modalOpen() && st.rank > 1, target: BIG, btn: '好', text: () => {
      const q = st.rank - 1, rv = L.rivalAt(st, q), Q = L.rivalPower(st, q), S = L.duelPower(st, { kind: 'rival', q, id: rv && rv.id });
      return `还有 <b>${L.nextTour(st)} 个周天</b>第 1 届论道。你前面是第 <b>${q}</b> 名${esc(rv ? rv.n : '')}，战力 <b>${fmt(Q)}</b>，你 <b>${fmt(S)}</b>，胜算 <b>${L.pct(L.duelChance(S, Q))}</b>。三场全胜最多能升 ${L.TOUR_STEP * 3} 名。`;
    } },
  { id: 'me', intro: true, when: () => st.stats.tour >= 1 && !modalOpen(), target: '[data-nav="me"]', btn: '好', text: () => `你现在天骄榜第 <b>${st.rank}</b>。排名、宿敌都在<b>【人物】→ 天骄榜</b>，那里还有属性、人物好感和成就称号。` },
  { id: 'boss', when: () => !L.busy(st) && !modalOpen() && L.REGIONS.some((r, k) => L.bossReady(st, k)), target: '[data-nav="exp"]', btn: '好', text: () => {
      const k = L.REGIONS.findIndex((r, j) => L.bossReady(st, j)), B = L.BOSSES[k], Q = L.bossPower(k), S = L.duelPower(st, { kind: 'boss', k, el: L.REGIONS[k].el });
      return `${L.REGIONS[k].n}的首领<b>${B.n}</b>出来了，战力 <b>${fmt(Q)}</b>，你的胜算 <b>${L.pct(L.duelChance(S, Q))}</b>。掉天材地宝和专属法宝，去【历练】里挑战。`;
    } },
  { id: 'life', when: () => L.desperate(st) && !modalOpen(), target: '#lifeBox', btn: '知道了', text: () => `寿元只剩 <b>${L.lifeTicks(st)}</b> 个周天！延寿丹还能吃 <b>${Math.max(0, 3 - (st.lifePills[st.p.r] || 0))}</b> 枚（${fmt(L.price(st, 'life'))} 灵石）；或者现在就冲，绝境 +${L.pct(L.BT.desperate)}。` },
];
let activeHint = null, tempHint = null, guideShownId = '', guideHold = false, hintCool = 0;
function ensureGuide() {
  if (!st.guide) st.guide = { step: 0, done: st.tick > 3 || st.stats.exp > 0 || st.rebirth > 0 };
  if (!st.hintSeen) st.hintSeen = {};
}
function currentGuide() {
  if (!st || !$('#intro').hidden || cine) return null;
  ensureGuide();
  if (tempHint) return tempHint;
  const g = st.guide;
  if (!g.done) {
    for (let guard = 0; guard < 20 && g.step < GUIDE.length; guard++) {
      const s0 = GUIDE[g.step];
      if (s0.until && s0.until()) { g.step++; continue; }
      const b = s0.back && s0.back();
      if (b) { g.step = GUIDE.findIndex(x => x.id === b); continue; }
      break;
    }
    if (g.step >= GUIDE.length) g.done = true;
    else { const s0 = GUIDE[g.step]; return !s0.silent && (!s0.show || s0.show()) ? s0 : null; }
  }
  if (activeHint && activeHint.until && activeHint.until()) { st.hintSeen[activeHint.id] = 1; activeHint = null; }
  if (activeHint && !activeHint.until && !activeHint.when()) activeHint = null;
  if (!activeHint) activeHint = HINTS.find(h => !st.hintSeen[h.id] && (h.urgent || st.tick >= hintCool) && h.when()) || null;
  if (activeHint && activeHint.until && !activeHint.when() && !activeHint.until()) return null;
  return activeHint;
}
function advanceGuide(cur) {
  SFX.tap();
  if (cur === tempHint) { tempHint = null; return; }
  hintCool = st.tick + 2; // 两条提示之间至少隔两个周天，别连珠炮
  if (GUIDE.includes(cur)) { st.guide.step = GUIDE.indexOf(cur) + 1; return; }
  st.hintSeen[cur.id] = 1; activeHint = null;
}
function updateGuide() {
  const el = $('#guide');
  const cur = currentGuide();
  guideHold = false;
  if (!cur) { if (!el.hidden) el.hidden = true; guideShownId = ''; return; }
  const tgt = cur.target ? document.querySelector(cur.target) : null;
  if (cur.target && (!tgt || !tgt.offsetParent)) { el.hidden = true; return; }
  el.hidden = false;
  guideHold = !!cur.btn; // 老祖说话时时间暂停
  const id = cur.id + (GUIDE.includes(cur) ? '' : '_h');
  if (guideShownId !== id) {
    guideShownId = id;
    el.querySelector('.gav').src = ELDER;
    el.querySelector('.gtext').innerHTML = typeof cur.text === 'function' ? cur.text() : cur.text;
    const bt = el.querySelector('.gbtns');
    bt.innerHTML = (GUIDE.includes(cur) ? '<button class="skip" data-g="skip">跳过教程</button>' : '') + (cur.btn ? `<button class="btn gold" data-g="ok">${cur.btn}</button>` : '');
    const ok = bt.querySelector('[data-g="ok"]'); if (ok) ok.onclick = () => { ac(); advanceGuide(cur); updateGuide(); };
    const sk = bt.querySelector('[data-g="skip"]'); if (sk) sk.onclick = () => { SFX.tap(); st.guide.done = true; updateGuide(); };
  }
  const z = parseFloat(document.documentElement.style.zoom) || 1;
  const spot = el.querySelector('.spot'), arrow = el.querySelector('.garrow'), box = el.querySelector('.gbox');
  const vh = window.innerHeight / z;
  if (tgt) {
    const r = tgt.getBoundingClientRect();
    const k = /Chrome\/(\d+)/.test(navigator.userAgent) && +RegExp.$1 >= 128 ? 1 : z; // 新版浏览器的 rect 已含缩放
    const L0 = r.left / k, T0 = r.top / k, W0 = r.width / k, H0 = r.height / k;
    spot.className = 'spot';
    Object.assign(spot.style, { left: (L0 - 4) + 'px', top: (T0 - 4) + 'px', width: (W0 + 8) + 'px', height: (H0 + 8) + 'px' });
    const below = T0 + H0 / 2 < vh / 2;
    arrow.hidden = false;
    arrow.className = 'garrow' + (below ? ' up' : '');
    arrow.textContent = below ? '▲' : '▼';
    arrow.style.left = (L0 + W0 / 2) + 'px';
    arrow.style.top = (below ? T0 + H0 + 8 : T0 - 8 - 24) + 'px';
    if (below) { box.style.top = ''; box.style.bottom = '16px'; } else { box.style.bottom = ''; box.style.top = '16px'; }
  } else {
    spot.className = 'spot none'; spot.removeAttribute('style');
    arrow.hidden = true;
    box.style.bottom = ''; box.style.top = '34%';
  }
}
function showHelp() {
  const sec = (ic, t, d) => `<div class="guide-sec">${iconHTML(ic, 24)}<div><b>${t}</b><br>${d}</div></div>`;
  const body = [
    sec('disc', '先看懂这四个数', '修为条下面一排：<b>修炼/周天</b>（每 5 秒涨多少修为）、<b>战力</b>（打架全看它）、<b>灵石/周天</b>、最右边是<b>下一件大事</b>的倒计时和胜算。点任意一格都能看到它由哪些加成组成、怎么提升。'),
    sec('disc', '修炼与突破', `打坐自动涨修为，涨满自动升一层小境界（战力 ×${L.P.pwStage}）。修为条变<b>金色</b>时点它冲击大境界，金丹起要渡雷劫；破境丹每枚 +${L.pct(L.BT.pill)}，一次最多 ${L.BT.maxPills} 枚。失败不会死：修为退三成、伤 3 周天，下次 +${L.pct(L.BT.fail)}。`),
    sec('disc', '闭关与吐纳', `【洞府】里闭关：${L.RET.len} 个周天修炼 ×${L.retBaseMult(st).toFixed(2)}，花灵石（头一回免费），连着闭关每次倍率 −${L.RET.fatigue}，出门历练一趟就恢复。历练途中修炼 ×0.5，所以“出门拿资源”和“在家涨修为”要取舍。在洞府打坐时脚下的吐纳环会蓄满，点自己立得 1 周天修为。`),
    sec('flag', '三年之约', `第 ${L.PACT_TICK} 个周天和退婚的人比武，她战力 ${L.PACT_POWER}。最右边那格显示还剩几个周天和你的胜算；点开有老祖锦囊。筑基前老祖借你 ${L.PACT_ASSIST} 倍战力。`),
    sec('sword', '历练', '选地点 × 深度（外围/腹地/禁地）× 行事（斩妖/寻宝/采药）出发。确认页写着预计评价和负伤风险；回来盖印评价天甲乙丙丁，奖励按评价翻倍或打折，丁等负伤 3 周天。每张图的相性（◎○△）试过才知道。某格评价乙会开下一深度；禁地评价乙后首领现身。'),
    sec('build', '洞府', '聚灵阵加修炼速度，灵田产灵石和灵草，丹炉开炼丹房并加突破成功率，洞府加寿元。每一行写着这次升级值多少（提前几周天、几周天回本）。负伤时可以服一枚破境丹疗伤。'),
    sec('bag', '坊市', '买破境丹、延寿丹；寻宝抽法宝功法（连续两次没提升，第三次必出更高一阶）；筑基后孵灵兽蛋；金丹后每 24 周天有拍卖会。价格随境界上涨。'),
    sec('flag', '宗门', '筑基后三大宗门来招揽。历练、论道、任务板挣贡献，在【宗门】晋升身份、用宝库换东西。每 24 周天九宗会武，你代表本宗往上打。'),
    sec('flag', '天骄论道', `三年之约之后每 ${L.TOUR_EVERY} 周天一届：三场，按战力挑战天骄榜上的对手，每场最多上升 ${L.TOUR_STEP} 名，宿敌都在榜上。`),
    sec('disc', '奇遇与访客', '历练途中可能遇到抉择；洞府门口有时会来访客（画面里的“！”），点它就能见，几个周天不理会自己走。好感 60 成为知己有永久加成，医修和魔门圣女可结为道侣。'),
    sec('pill', '炼丹', '【洞府】→ 炼丹房，用灵草和天材地宝炼丹：培元、破境、聚灵、延寿、洗髓（提升灵根）、九转金丹（突破必成）。'),
    sec('life', '寿元与转世', '右上角沙漏是年龄/寿元。突破能大幅延寿；寿元耗尽会坐化，转世后天赋三选一。'),
    sec('sound', '其他', '右上角【×1】切换速度（×2、×4、暂停），音符按钮切换声音。底部札记栏可以点，告诉你下一步做什么、做完给什么。'),
  ].join('');
  sheet({ title: '玩法指南', body, foot: [{ t: '重看新手教程', alt: true, fn: () => { st.guide = { step: 0, done: false }; st.hintSeen = {}; activeHint = null; closeModal(); } }, { t: '知道了', gold: true, fn: closeModal }] });
}
const GO = {
  exp: () => showExp(), home: () => showHome(), sect: () => showSect(), market: () => showMarket(), me: () => showMe('rank'), big: () => showBig(),
  cult: () => { if (L.isReady(st)) showBreakthrough(); else tempHint = { id: 'tmp', target: '#cult', btn: '好', text: L.isFull(st) ? '修为已满，回到洞府就能冲击境界。' : `照现在的速度，还要约 <b>${L.ticksToStage(st, L.si(st.p) + 1)}</b> 个周天升下一层。闭关、聚灵阵、吐纳都能加快。` }; },
};
// 札记（DESIGN §4.6）：本章主线 + 前三条未完成的小任务 + 以前章节没做完的主线；完成即领
function showQuests() {
  const qv = L.questView(st);
  const item = (q, i) => `<div class="card flat"><div class="main"><div>${q.main ? '<span class="story-tag">主线</span>' : ''}${esc(L.questText(st, q))}</div><div class="goldt">${esc(L.rewardText(st, q.rw)) || '—'}</div></div><div class="right"><button class="btn sm alt" data-q="${i}">前往</button></div></div>`;
  const all = [];
  const rows = [];
  if (qv.main) { all.push(qv.main); rows.push(item(qv.main, all.length - 1)); }
  for (const q of qv.list) { all.push(q); rows.push(item(q, all.length - 1)); }
  if (qv.old.length) { rows.push('<div class="muted">未了之事（以前章节的主线，仍可完成领赏）</div>'); for (const q of qv.old) { all.push(q); rows.push(item(q, all.length - 1)); } }
  const s = sheet({ title: `札记 · 第${'一二三四五六七八九'[qv.r]}章 ${qv.ch.n}`, sub: `本章小任务 ${qv.doneN}/${qv.total} · 完成即领，不用再点`, body: rows.join('') || '<p>大道已成。可以继续在此世逍遥，或去【人物】查看成就。</p>' });
  s.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
    SFX.tap();
    const q = all[+b.dataset.q];
    closeModal();
    if (q.go === 'sect' && !st.sect) { tempHint = { id: 'tmp', target: '#cult', btn: '好', text: `你还没有宗门。突破到筑基、三年之约之后，三大宗门会来招揽你。` }; return; }
    if (q.go === 'market' && navLock('market')) { tempHint = { id: 'tmp', target: '[data-nav="market"]', btn: '好', text: navLock('market') }; return; }
    (GO[q.go] || GO.exp)();
  });
}
$('#goal').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showQuests(); });
$('#btnHelp').onclick = () => { if (!st || cine) return; ac(); SFX.tap(); showHelp(); };
