/* 废柴仙途 · 界面片段 guide：戒中老祖：引导、提示、指南、目标
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
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
const dec = v => (v < 10 ? (Math.round(v * 10) / 10).toString() : fmt(v));
let lastExp = null;
// 新手引导：学游戏发展国的秘书——一次只说一两句、说话时暂停、句句带数字，说完立刻让你动手
const GUIDE = [
  { id: 'welcome', text: () => `小子，我是住在你戒指里的老祖。<b>三年之约</b>还剩 <b>${PI().left} 个周天</b>（一周天约 5 秒），到时${esc(st.exName)}要在擂台上当众羞辱你。`, btn: '然后呢' },
  { id: 'stakes', target: BIG, text: () => `她战力 <b>${L.PACT_POWER}</b>，你只有 <b>${fmt(L.power(st))}</b>。老夫借你神魂之力能翻 <b>3 倍</b>，胜算也才 <b>${L.pct(PI().p)}</b>。光打坐，必输。`, btn: '那怎么办？' },
  { id: 'expNav', show: () => !modalOpen() && !st.exp, target: '[data-nav="exp"]', text: '出去<b>【历练】</b>！打妖兽能捡<b>法宝</b>，战力直接 ×1.3 起，还能带回灵石。', until: () => modalTitle() === '外出历练' || !!st.exp },
  { id: 'expPick', show: () => modalTitle() === '外出历练', target: '#modal .card[data-k="0"]', text: () => `先去最近的<b>后山野林</b>，成功率 <b>${L.pct(L.expChance(st, 0).p)}</b>，稳。`, until: () => modalTitle() === '后山野林' || !!st.exp, back: () => (!modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'expGo', show: () => modalTitle() === '后山野林', target: '#modal .foot .btn.gold', text: '点<b>【御剑出发】</b>。', until: () => !!st.exp, back: () => (modalTitle() === '外出历练' ? 'expPick' : !modalOpen() && !st.exp ? 'expNav' : null) },
  { id: 'speed', show: () => !modalOpen(), target: '#btnSpeed', text: () => `路上会自动打怪，${L.REGIONS[st.exp ? st.exp.k : 0].mon} 个周天后回来。嫌慢就点这里<b>加速</b>。`, btn: '好' },
  { id: 'waitExp', silent: true, until: () => st.stats.exp >= 1 && !modalOpen() && !st.exp },
  { id: 'afterExp', show: () => !modalOpen() && !!lastExp, target: '#stats button[data-s="atk"]', text: () => {
      const e = lastExp, a = L.pactAssist(st), it = e.items.find(x => x.kind === 'w' && x.equip);
      const p0 = L.duelChance(e.pw0 * a, L.PACT_POWER), p1 = L.duelChance(e.pw1 * a, L.PACT_POWER);
      return `看见没？${it ? `捡了把<b>${esc(it.name)}</b>，` : ''}战力 <b>${fmt(e.pw0)} → ${fmt(e.pw1)}</b>，胜算 <b>${L.pct(p0)} → ${L.pct(p1)}</b>。`;
    }, btn: '再接再厉', until: () => !lastExp },
  { id: 'homeNav', show: () => !modalOpen(), target: '[data-nav="home"]', text: '灵石要花出去才有用。去<b>【洞府】</b>升级聚灵阵——修炼越快升层越快，<b>每升一层战力 ×1.5</b>。', until: () => modalTitle() === '洞府' || st.home.array >= 1 },
  { id: 'homeArray', show: () => modalTitle() === '洞府', target: '#modal button[data-k="array"]', text: () => `点这里升级<b>聚灵阵</b>：修炼 <b>+${dec(L.gain(st))} → +${dec(L.gain(st) * 1.11)}</b> /周天。`, until: () => st.home.array >= 1, back: () => (!modalOpen() && st.home.array < 1 ? 'homeNav' : null) },
  { id: 'loop', show: () => !modalOpen(), target: BIG, text: () => `就这么循环：<b>历练 → 花灵石升级 → 再历练</b>。现在胜算 <b>${L.pct(PI().p)}</b>，随时看这一格，点开有老夫的锦囊。不知道干嘛就点下面的<b>目标</b>栏。`, btn: '明白了' },
];
const nextName = () => (st.p.r >= L.MAXR ? '飞升' : L.REALMS[st.p.r + 1].n);
const HINTS = [
  { id: 'ready', urgent: true, when: () => L.isReady(st) && !modalOpen(), target: '#cult', text: () => `修为圆满了！点这个<b>金色的修为条</b>冲击${nextName()}，成功率 <b>${L.pct(L.btRate(st, st.pills > 0))}</b>${st.pills ? '（已算上破境丹）' : ''}。突破后战力、寿元大涨。`, until: () => /突破|天劫/.test(modalTitle()) || !!cine },
  { id: 'btGo', urgent: true, when: () => /境界突破|飞升天劫/.test(modalTitle()), target: '#modal .foot .btn.gold', text: '有破境丹就勾上，<b>成功率 +20%</b>。准备好了点<b>开始突破</b>。失败不会死，下次成功率 +12%。', until: () => !!cine || !modalOpen() },
  { id: 'afterPact', urgent: true, when: () => !!st.pact && !modalOpen(), target: BIG, btn: '好', text: () => (st.pact > 0 ? '痛快！满城都知道你不是废物了。' : '输了不丢人，她就在天骄榜上。') +
      `每 <b>12 周天</b>一届<b>天骄论道</b>，看这一格倒计时${st.pact > 0 ? '' : '，到时再找她算账'}。` + (st.p.r < 1 ? '眼下先冲<b>筑基</b>：战力暴涨，宗门也会来抢你。' : '你已筑基，宗门很快会来招揽。') },
  { id: 'pactSoon', urgent: true, when: () => !st.pact && st.guide.done && !modalOpen() && PI().left <= 6, target: BIG, btn: '好', text: () => {
      const pi = PI();
      return `还剩 <b>${pi.left} 个周天</b>就是三年之约！你 ${fmt(pi.base)}×${pi.assist} = <b>${fmt(pi.S)}</b>，她 <b>${pi.Q}</b>，胜算 <b>${L.pct(pi.p)}</b>。` +
        (pi.p < 0.5 ? '不够稳：再历练捡件法器（×1.7），或者让修为再升一层（×1.5）。点这一格看锦囊。' : pi.p < 0.85 ? '还差一口气，再历练两趟。' : '稳了。到时候让全城看看谁是废物。');
    } },
  { id: 'market', when: () => st.guide.done && st.stats.exp >= 2 && !modalOpen() && st.stones >= L.price(st, 'pill'), target: '[data-nav="market"]', text: () => `<b>【坊市】</b>开张了：破境丹 <b>${fmt(L.price(st, 'pill'))}</b> 灵石一枚（突破成功率 +20%），“寻宝”能抽法宝功法，还能孵灵兽蛋。`, btn: '记住了' },
  { id: 'tuna', when: () => st.guide.done && !st.exp && !modalOpen() && st.tick >= 6 && !L.isReady(st) && st.p.r <= L.MAXR && (st.tunaLeft === undefined || st.tunaLeft === L.TUNA_MAX), target: '#sceneWrap', text: () => `在洞府的空当，<b>点画面里的你</b>能运功吐纳：每次 <b>+${dec(L.gain(st) * 0.1)}</b> 修为，每周天 ${L.TUNA_MAX} 次。点一下试试！`, btn: '下次再说', until: () => st.tunaLeft !== undefined && st.tunaLeft < L.TUNA_MAX },
  { id: 'sect', when: () => !!st.sect && !modalOpen(), target: '[data-nav="sect"]', text: '入宗了！历练、论道都能挣<b>宗门贡献</b>，攒够了来<b>【宗门】</b>晋升身份；宝库能用贡献换功法法宝；每 24 周天还有九宗会武。', btn: '好' },
  { id: 'me', when: () => st.stats.tour >= 1 && !modalOpen(), target: '[data-nav="me"]', text: '论道排名、宿敌都在<b>【人物】→ 天骄榜</b>。那里还有属性、人物好感和成就称号。', btn: '好' },
  { id: 'alch', when: () => st.home.furnace >= 1 && !modalOpen() && st.herbs >= L.herbCost(st, L.RECIPES[0]), target: '[data-nav="home"]', text: '丹炉有了，灵草也够了。去<b>【洞府】→ 炼丹房</b>：聚灵丹加速修炼，延寿丹续命，洗髓丹还能提升灵根！', btn: '好' },
  { id: 'boss', when: () => !modalOpen() && L.REGIONS.some((r, k) => L.bossReady(st, k)), target: '[data-nav="exp"]', text: '有张地图的<b>首领</b>现身了！去<b>【历练】</b>里挑战它，掉落天材地宝和专属法宝。', btn: '好' },
  { id: 'life', when: () => L.desperate(st) && !modalOpen(), target: '#lifeBox', text: '<b>寿元</b>快到头了！去坊市买延寿丹，或者赶紧突破——寿元将尽时突破有绝境加成。', btn: '知道了' },
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
    sec('disc', '修炼与突破', '打坐自动涨修为，涨满自动升一层小境界（战力 ×1.5）。修为条变<b>金色</b>时点它冲击大境界，金丹起要渡雷劫。失败不会死，下次成功率 +12%。在洞府时点画面里的自己能运功吐纳，额外涨修为。'),
    sec('flag', '三年之约', '开局第 3 年要和退婚的人比武。最右边那格显示还剩几个周天和你的胜算；点开有提高胜算的办法。筑基前老祖会借你 3 倍战力。'),
    sec('sword', '历练', '点【历练】选地图出发，路上自动打怪，带回灵石、修为、破境丹，有机会掉法宝、功法、灵宠。成功率越绿越稳；越级挑战成功奖励翻倍。每张地图赢 3 次会出现首领。'),
    sec('build', '洞府', '灵石主要花在这里：聚灵阵加修炼速度，灵田产灵石和灵草，丹炉自动出破境丹并开启炼丹房，洞府加寿元。'),
    sec('bag', '坊市', '买破境丹、延寿丹；寻宝抽法宝功法；孵灵兽蛋得灵宠。价格随境界上涨。'),
    sec('flag', '宗门', '筑基后三大宗门来招揽。历练、论道挣贡献，在【宗门】晋升身份、用宝库换东西。每 24 周天九宗会武，你代表本宗往上打。'),
    sec('flag', '天骄论道', '每 12 周天自动举行，按战力挑战天骄榜上的对手，宿敌都在榜上等你。'),
    sec('disc', '奇遇与人物', '随时会遇到奇遇，按你的选择给奖励、改变人物好感。好感 60 成为知己有永久加成，医修和魔门圣女可结为道侣。'),
    sec('pill', '炼丹', '【洞府】→ 炼丹房，用灵草和天材地宝炼丹：培元、聚灵、延寿、洗髓（提升灵根）、九转金丹（突破必成）。'),
    sec('life', '寿元与转世', '右上角沙漏是年龄/寿元。突破能大幅延寿；寿元耗尽会坐化，转世后天赋三选一、修炼更快。'),
    sec('sound', '其他', '右上角【×1】切换速度（×2、×4、暂停），音符按钮切换声音。底部目标栏可以点，告诉你下一步怎么做。'),
  ].join('');
  sheet({ title: '玩法指南', body, foot: [{ t: '重看新手教程', alt: true, fn: () => { st.guide = { step: 0, done: false }; st.hintSeen = {}; activeHint = null; closeModal(); } }, { t: '知道了', gold: true, fn: closeModal }] });
}
const GO = { exp: () => showExp(), home: () => showHome(), sect: () => showSect(), market: () => showMarket(), me: () => showMe('rank') };
function showGoal() {
  const g = L.GOALS[st.goal];
  if (!g) { sheet({ title: '目标', center: true, body: '<p>大道已成。可以继续在此世逍遥，或去【人物】查看成就。</p>', foot: [{ t: '好', gold: true, fn: closeModal }] }); return; }
  const go = () => {
    closeModal();
    if (g.go === 'cult') { if (L.isReady(st)) showBreakthrough(); else tempHint = { id: 'tmp', target: '#cult', text: g.how, btn: '好' }; }
    else if (g.go === 'sect' && !st.sect) tempHint = { id: 'tmp', target: '#cult', text: '你还没有宗门。突破到筑基期后，宗门会来招揽你。', btn: '好' };
    else if (GO[g.go]) GO[g.go]();
  };
  sheet({ title: '当前目标', center: true,
    body: `<div class="big">${esc(L.goalText(st, g))}</div><div class="quote">${esc(g.how || '')}</div>${g.rw ? `<p class="muted">完成奖励：灵石 ${fmt(g.rw)}</p>` : ''}`,
    foot: [{ t: '关闭', alt: true, fn: closeModal }, { t: '带我去', gold: true, fn: go }] });
}
$('#goal').addEventListener('click', () => { if (!st || cine) return; ac(); SFX.tap(); showGoal(); });
$('#btnHelp').onclick = () => { if (!st || cine) return; ac(); SFX.tap(); showHelp(); };
