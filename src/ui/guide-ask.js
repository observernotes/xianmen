/* 废柴仙途 · 界面片段 guide-ask：问老祖（DESIGN §4.4 / SYSTEMS §17）、卡住检测气泡（§4.3 S 系列）、补齐的讲解与气泡（U02 U04 U09 U14 U17）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 guide 与各系统的讲解之后：这里还给已有讲解改分类）。
 * 场景右下角一个老祖头像（#guideAv）：有没看的气泡时头上冒“！”；点它 = 问老祖：按眼下的状态给出最有用的三条（每条带数字和【前往】），
 * 下面附老祖最近说过的几句气泡。 */
// ---------- 老祖头像（场景右下角，44×44） ----------
function syncElderAv() {
  const wrap = $('#sceneWrap'); if (!wrap || !st) return;
  let b = $('#guideAv');
  if (!b) {
    b = document.createElement('button'); b.id = 'guideAv'; b.className = 'guide-av'; b.setAttribute('aria-label', '问老祖');
    b.innerHTML = `<img class="px" src="${ELDER}" alt=""><span class="guide-dot">！</span>`;
    b.onclick = e => { e.stopPropagation(); if (!st || cine) return; ac(); SFX.tap(); showAsk(); };
    wrap.appendChild(b);
  }
  const hide = !!st.run || !!duelFx || !!cine || !st.guide || !st.guide.done;
  if (b.hidden !== hide) b.hidden = hide;
  const dot = bubbleUnread && !bubbleCur;
  if (b.classList.contains('new') !== dot) b.classList.toggle('new', dot);
  const gone = !!(st.eflags && st.eflags.st_farewell);
  if (b.classList.contains('gone') !== gone) b.classList.toggle('gone', gone);
}

// ---------- 问老祖：候选按 DESIGN §4.4 的顺序，外加 SYSTEMS §17 追加的几条；取前三条 ----------
const ASK_IDLE = ['老夫当年……算了，说了你也不懂。', '数清楚再去，别光凭一腔热血。', '哼，还行，有本座三成风采。', '修行急不得，可也慢不得。', '天骄榜上那几个，没一个省油的灯。', '护短是老夫的老毛病，你别仗着它乱来。'];
function askList() {
  const out = [], p = st.p, busy = L.busy(st);
  const add = (t, go, btn) => { if (out.length < 8) out.push({ t, go, btn: btn || '前往' }); };
  const nb = L.nextBig(st);
  // 1. 修为圆满
  if (L.isReady(st)) add(`修为圆满了。点金色的修为条冲<b>${nextName()}</b>，成功率 <b>${L.pct(btShownRate())}</b>${L.tribNeeded(st) ? '，从金丹起要渡雷劫，护劫手段都在突破页里' : ''}。`, () => showBreakthrough(), '去突破');
  else if (L.isFull(st) && st.exp) add(`修为已经满了，这趟回来就能冲<b>${nextName()}</b>；现在出门是白跑修为。`, () => showExp());
  // 2. 大事 ≤ 6 周天且胜算 < 85%：锦囊第一条
  if (nb.left <= 6) {
    if (nb.k === 'pact') {
      const pi = nb.info, t0 = pactTips()[0];
      if (pi.p < 0.85) add(`三年之约还剩 <b>${pi.left}</b> 个周天，胜算 <b>${L.pct(pi.p)}</b>。${t0 ? `锦囊头一条：${esc(t0.t)} → <b>${t0.extra || L.pct(t0.p)}</b>。` : '能做的都做了，硬上。'}`, () => showPact(), '看锦囊');
    } else if (nb.k === 'tour') {
      const tf = L.tourFoe && L.tourFoe(st);
      if (tf) {
        const S = L.duelPower(st, tf.foe), p0 = L.duelP(st, S, tf.Q, tf.foe), b = L.duelArtBest(st, tf.foe, tf.Q);
        if (p0 < 0.85) add(`<b>${nb.left}</b> 个周天后论道，头一场多半是${esc(tf.rv.n)}（战力 <b>${fmt(tf.Q)}</b>），你 <b>${fmt(S)}</b>，胜算 <b>${L.pct(p0)}</b>。${b && !b.same && b.p1 - b.p0 >= 0.03 ? `换战技《${esc(L.art(b.id).n)}》能到 <b>${L.pct(b.p1)}</b>。` : '多修一层、强化兵器都能补。'}`, () => showRivalCard(tf.id), '看他');
      }
    } else if (nb.k === 'meet' && st.sect) add(`<b>${nb.left}</b> 个周天后九宗会武，你代表${esc(L.sectOf(st).n)}（天下第 <b>${L.sectPos(st)}</b> 宗）出战。赢一场宗门升一位，俸禄跟着涨。`, () => showSect());
  }
  // 3. 负伤
  if (p.inj > 0) add(`负伤还要 <b>${p.inj}</b> 个周天：战力只剩六成、修炼减半。${L.canHeal(st) ? `服${L.healWith && L.healWith(st) === 'liaoshang' ? '疗伤丹' : '一枚破境丹'}立刻就好。` : '没丹可服，就在洞府歇着。'}`, () => showHome(), L.canHeal(st) ? '去服丹' : '前往');
  // 4. 访客
  if (st.visitor && !st.retreat) add(`门口有人等着，还有 <b>${st.visitor.left}</b> 个周天就走了。点画面里的“！”。`, () => showVisitor(), '去见');
  // 5. 宗门：能晋升 / 有任务能交 / 职司没选 / 有拜师的孩子
  if (L.canPromote(st)) add(`贡献够了，晋升<b>${L.srankName(st, st.sect.rank + 1)}</b>：俸禄 ×${L.SRANKS[st.sect.rank].pay} → <b>×${L.SRANKS[st.sect.rank + 1].pay}</b>。`, () => showSect(), '去晋升');
  else if (st.sect && (st.sect.tasks || []).some(t => L.taskCanDeliver(st, t))) { const t = st.sect.tasks.find(x => L.taskCanDeliver(st, x)); add(`宗门有差事能交了，交了给 <b>${fmt(t.rw)}</b> 贡献。`, () => showSect('task'), '去交付'); }
  if (L.dutyOpen(st) && !L.duty(st)) add(`你是真传了，还没领<b>职司</b>：五堂选一个，比如丹堂成丹率 <b>+${L.pct(L.DUTY_V.alch)}</b>。`, () => showSect());
  if (st.disc && st.disc.cand && L.discOpen(st) && !L.discFull(st)) add(`有三个孩子等着拜师（门下 ${L.discList(st).length}/${L.discCap(st)}）。收一个，到金丹出师给一大笔贡献。`, () => showSect('disc'), '去看');
  // 6. 新得的东西：法宝对比卡、更强的功法、能进化的灵宠
  const pend = st.gear && st.gear.pend.find(y => !y.hold);
  if (pend) add(`新得的【${esc(L.gearBase(pend.id).n)}】还没决定换不换：不选就熔炼成灵矿。`, () => showGear(), '去看');
  const ar = artRec();
  if (ar) add(`《${esc(ar.row.A.n)}》比你装着的强：${ar.i === 0 ? `修炼 <b>+${dec(ar.row.d.g1 - ar.row.d.g0)}</b>/周天` : '战力更高'}。【人物】→ 功法点一下换上。`, () => showMe('art'), '去换');
  if (st.pets && st.pets.some(L.petCanEvo)) { const pt = st.pets.find(L.petCanEvo); add(`【${esc(L.petName(pt))}】能<b>进化</b>了：品阶 <b>${L.petTier(pt)} → ${L.petTier(pt) + 1}</b>。去兽栏点它。`, () => showPets(), '去兽栏'); }
  // 7. 要渡劫了：渡劫阵
  if (L.zhenOpen(st) && L.zhenOwned(st, 'f_dujie') && L.tribNeeded(st) && !L.zhenWhere(st, 'f_dujie') && p.s === 3) add(`要渡劫了，把阵换成<b>渡劫阵</b>：承劫 <b>+${L.pct(L.formationVal(st, 'f_dujie'))}</b>，${L.ZV.switch} 个周天后生效。`, () => showZhen(), '去换阵');
  // 8. 寿元
  if (L.desperate(st)) add(`寿元只剩 <b>${L.lifeTicks(st)}</b> 个周天！延寿丹 <b>${fmt(L.price(st, 'life'))}</b> 灵石一枚；或者现在就冲，绝境 +${L.pct(L.BT.desperate)}。`, () => showMarket(), '去坊市');
  // 9. 空闲：快升层就闭关，否则去“预计至少乙”的最高一格
  if (!busy && !L.isFull(st) && p.r <= L.MAXR) {
    const n = L.ticksToStage(st, L.si(p) + 1);
    if (L.canRetreat(st) && n <= 6) { const ri = L.retInfo(st); add(`再过约 <b>${n}</b> 个周天升下一层。闭关 ${ri.len} 个周天、修炼 <b>×${ri.m.toFixed(2)}</b>，多得 <b>${fmt(ri.extra)}</b> 修为（${ri.free ? '头一回免费' : fmt(ri.cost) + ' 灵石'}）。`, () => showHome(), '去闭关'); }
    else { const b = L.expBest(st), rg = L.REGIONS[b.k]; add(`闲着也是闲着。去【${esc(rg.n)}·${L.DEPTHS[b.d]}】：预计评价 <b>${b.f.text}</b>，灵石约 <b>${fmt(b.f.stones)}</b>，${b.f.len} 个周天回来。`, () => confirmExp(b.k, b.d, b.a), '去历练'); }
  }
  // 10. SYSTEMS §17 追加：秘境、拍卖、行情、强化、炼丹
  if (L.mjCan && L.mjCan(st) && !busy) add(`秘境开着，你有 <b>${L.mjTokens(st)}</b> 枚秘境令。里面时间不走，出来只算 ${L.mjCost(st)} 个周天。`, () => showRealm(), '去秘境');
  if (L.auctionOpen(st) && L.auctionBidsLeft(st) > 0 && st.auction.items.some(it => !it.res)) add(`拍卖会还开 <b>${st.auction.until - st.tick}</b> 个周天，还能出手 <b>${L.auctionBidsLeft(st)}</b> 次。没拿下不花钱。`, () => showMarket(), '去拍卖');
  if (L.sellOpen && L.sellOpen(st) && L.sellMult(st, 'herb') >= 1.2 && L.sellHave(st, 'herb') >= 20) add(`行情好：灵草 <b>×${mult2(L.sellMult(st, 'herb'))}</b>，你的 ${fmt(L.sellHave(st, 'herb'))} 株能换 <b>${fmt(L.sellValue(st, 'herb', L.sellHave(st, 'herb')))}</b> 灵石。`, () => showMarket(), '去卖');
  const gs = L.gearOpen(st, 'plus') && L.gearPlusHint(st, 0.8);
  if (gs) { const info = L.gearPlusInfo(st, gs); add(`灵矿够强化${L.GEAR_N[gs]} +${info.x.plus + 1}（成功率 <b>${L.pct(info.rate)}</b>）：战力 <b>${fmt(info.a.p)} → ${fmt(info.b.p)}</b>。`, () => showGear(), '去强化'); }
  if (st.home.furnace >= 1 && !busy && st.herbs >= L.herbCost(st, L.RECIPES[0]) * 2 && (st.toxin || 0) < L.TOX.half) add(`灵草 <b>${fmt(st.herbs)}</b> 株闲着，能炼 ${Math.floor(st.herbs / L.herbCost(st, L.RECIPES[0]))} 炉${L.RECIPES[0].n}，成丹率 <b>${L.pct(L.alchRate(st))}</b>。`, () => showAlchemy(), '去炼丹');
  // 11. 买得起的升级里最值的一项
  const ups = ['array', 'field'].filter(k => L.homeOpen(st, k)).map(k => L.upInfo(st, k)).filter(u => !u.max && !u.lock && u.cost > 0 && st.stones >= u.cost);
  if (ups.length) { const u = ups.sort((a, b) => a.cost - b.cost)[0]; add(`灵石 <b>${fmt(st.stones)}</b> 别攒着：升【${u.k === 'array' ? '聚灵阵' : '灵田'}】${fmt(u.cost)} 灵石，${esc(u.note || '')}。`, () => showHome(false, u.k === 'array' ? 0 : undefined), '去升级'); }
  // 12. 札记
  const q = L.questView(st).first;
  if (q) add(`札记上这条：“${esc(L.questText(st, q))}”，做完赏 <b>${esc(L.rewardText(st, q.rw)) || '—'}</b>。`, () => (GO[q.go] || GO.exp)());
  // 13. 天下大势
  const w = L.world && L.world(st);
  if (w) add(`天下大势：${esc(L.WORLD[w.id].n)}，还剩 <b>${w.until - st.tick}</b> 个周天。${esc(worldLine(w))}`, () => showCalendar(), '看年历');
  // 14. 都不成立：照现在这样稳着呢
  if (!out.length && p.r <= L.MAXR) {
    const n = L.ticksToStage(st, L.si(p) + 1);
    add(`照现在这样，约 <b>${n}</b> 个周天后升${L.stageName({ r: p.s === 3 ? Math.min(9, p.r + 1) : p.r, s: (p.s + 1) % 4 })}，战力到 <b>${fmt(L.power(st) * (p.s === 3 ? btPowerMult() : L.P.pwStage))}</b>。稳着呢。${ASK_IDLE[st.tick % ASK_IDLE.length]}`, null);
  }
  return out;
}
function showAsk() {
  const list = askList().slice(0, 3);
  const row = (x, i) => `<div class="card flat guide-ask"><div class="main"><div>${x.t}</div></div>${x.go ? `<div class="right"><button class="btn sm gold" data-ask="${i}">${x.btn}</button></div>` : ''}</div>`;
  const log = bubbleLog.slice(0, 4).map(b => `<div class="guide-said">${b.text}</div>`).join('');
  bubbleUnread = false;
  const s = sheet({ title: st.eflags && st.eflags.st_farewell ? '戒中余音' : '问老祖', sub: '眼下最该做的三件事（点【前往】直接去）',
    body: `<div class="speaker"><img class="px" src="${ELDER}" style="width:44px;height:44px" alt=""><p class="grow" style="margin:0">${st.p.look.f ? '丫头' : '小子'}，听好了：</p></div>${list.map(row).join('')}${log ? `<div class="muted">老祖刚才说过：</div>${log}` : ''}`,
    foot: [{ t: '玩法指南', alt: true, fn: () => showHelp() }, { t: '札记', alt: true, fn: () => showQuests() }, { t: '知道了', gold: true, fn: closeModal }] });
  s.querySelectorAll('[data-ask]').forEach(b => b.onclick = () => { SFX.tap(); const x = list[+b.dataset.ask]; closeModal(); if (x && x.go) x.go(); });
}

// ---------- 卡住检测与补齐的气泡（每周天，boot.js 的 onTick 调） ----------
// 这些都是气泡，不暂停；同一条有自己的冷却（写进 key 里：同一窗口只冒一次），再统一受气泡调度的 3 周天间隔
let idleRun = 0, readyRun = 0, stoneRun = 0, lastStones = 0, lastFails = 0;
function guideTick() {
  if (!st || !st.guide || !st.guide.done || st.p.r > L.MAXR) return;
  const p = st.p, busy = L.busy(st), t = st.tick;
  // S05：修为圆满、人在洞府、6 周天没突破（6 周天一次）
  readyRun = L.isReady(st) ? readyRun + 1 : 0;
  if (readyRun >= 6 && readyRun % 6 === 0) tip('s05_' + t, `还等什么？现在冲${nextName()}成功率 ${L.pct(btShownRate())}。点金色的修为条。`, { big: true });
  // S07：不在历练、不在闭关、没圆满，连着 3 周天（6 周天一次）
  idleRun = !busy && !L.isFull(st) && !st.visitor ? idleRun + 1 : 0;
  if (idleRun === 3 || (idleRun > 3 && idleRun % 6 === 3)) {
    const b = L.expBest(st), ri = L.retOpen(st) ? L.retInfo(st) : null;
    tip('s07_' + Math.floor(t / 6), `闲着也是闲着。去【${L.REGIONS[b.k].n}·${L.DEPTHS[b.d]}】预计 ${b.f.text}${ri && L.canRetreat(st) ? `；想涨修为就闭关，${ri.free ? '这回免费' : fmt(ri.cost) + ' 灵石'}` : ''}。`);
  }
  // S04：灵石 ≥ 最便宜升级价的 3 倍，且 6 周天没花过（12 周天一次）
  const ups = L.HOME.filter(h => L.homeOpen(st, h.k) && st.home[h.k] < h.max).map(h => ({ k: h.k, c: L.hCost(h.k, st.home[h.k]) })).sort((a, b) => a.c - b.c);
  stoneRun = st.stones >= lastStones - 1 ? stoneRun + 1 : 0; lastStones = st.stones;
  if (ups.length && st.stones >= ups[0].c * 3 && stoneRun >= 6 && !busy) {
    const u = L.upInfo(st, ups[0].k);
    tip('s04_' + Math.floor(t / 12), `攒着 ${fmt(st.stones)} 灵石做什么？升【${(L.HOME.find(h => h.k === u.k) || {}).n || u.k}】${fmt(u.cost)} 灵石${u.note ? '：' + u.note : ''}。`);
  }
  // S08：大事前 3 周天胜算 < 30%（每届一次）
  const nb = L.nextBig(st);
  if (nb.left === 3 && nb.k === 'pact' && nb.info.p < 0.3) { const t0 = pactTips()[0]; tip('s08_pact', `这回硬碰不过：胜算 ${L.pct(nb.info.p)}。${t0 ? `${t0.t} 能到 ${t0.extra || L.pct(t0.p)}，来得及。` : '先保住性命要紧。'}`, { big: true }); }
  // S10：访客还剩 1 周天就走
  if (st.visitor && st.visitor.left === 1 && !st.retreat) tip('s10_' + t, '门口那位要走了。点画面里的“！”。', { big: true });
  // S06：突破连败 2 次
  const fails = (st.stats && st.stats.btFails) || 0;
  if (fails >= lastFails + 2 || (fails >= 2 && lastFails === 0 && !st.seenTips.s06)) { lastFails = fails; tip('s06' + (st.seenTips.s06 ? '_' + t : ''), `别硬冲。破境丹每枚 +${L.pct(L.BT.pill)}（你有 ${st.pills} 枚）；灵草够的话自己炼更便宜。`); st.seenTips.s06 = 1; }
  // U02 / 寻宝：行事解锁（第二趟、第四趟出发前）
  if (!st.rebirth && L.apprOpen(st, 2)) tip('u02', '行事多了一样【采药】：灵草多、灵石少。每个地方适合干什么不一样（◎○△），试过才知道。');
  if (!st.rebirth && L.apprOpen(st, 1)) tip('u02b', '行事又多一样【寻宝】：宝物多一成，打斗少。三样行事在每张图上相性不同，试出来记进图鉴。');
  // U04：筑基后灵兽蛋上架
  if (p.r >= 1 && L.marketOpen(st, 'egg') && !L.petCount(st)) tip('u04', `灵兽蛋上架了，${fmt(L.price(st, 'egg'))} 灵石一枚。灵宠最低也让战力 ×${L.PETS[1].m}。【坊市】。`);
  // U14：金丹后能连续历练
  if (L.chainOpen(st) && !st.rebirth) tip('u14', '嫌一趟趟点麻烦：出发页勾“连续 ×3”，回来一起结算（丁等、遭遇或修为圆满时中断）。');
  // U17：成为宗主
  if (st.sect && st.sect.rank >= 6) tip('u17', `现在这座山是你的了。【宗门】里多了建设，灵石有去处了；九宗会武改成三人战，带两个徒弟上。`, { big: true });
  // S11：第一次拿到丁等（历练结算之后）
  if ((st.stats.dings || 0) >= 1) tip('s11', '栽了吧。出发页那行“预计评价”写着丙～丁就别去，退一格稳拿乙。');
}

// ---------- 补齐的阻塞讲解：九宗会武前 6 周天（U09）；第一次三人会武前（宗主） ----------
registerGuide([
  { id: 'meetSoon', intro: true, urgent: true, target: BIG, btn: '好', when: () => !!st.sect && L.sectOf(st) && !st.sect.meets && !modalOpen() && !L.busy(st) && L.nextMeet(st) <= 6 && L.nextMeet(st) > 0, text: () => {
      const pos = L.sectPos(st), q = pos === 1 ? 2 : pos - 1, N = L.nineAt(st, q) || {}, Q = L.ninePower(st, q), fo = { kind: 'sect', id: N.id }, S = L.duelPower(st, fo);
      return `<b>九宗会武</b>还有 <b>${L.nextMeet(st)}</b> 个周天。你代表${esc(L.sectOf(st).n)}出战，本宗天下第 <b>${pos}</b>，上一位${esc(N.n || '')}的代表${esc(N.champ || '')}战力约 <b>${fmt(Q)}</b>，你 <b>${fmt(S)}</b>，胜算 <b>${L.pct(L.duelP(st, S, Q, fo))}</b>。赢一场宗门升一位，俸禄跟着涨。`;
    } },
]);
// 分类：新手头一章的固定讲解（DESIGN §4.2 E10～E14、U03、U05、U07）只隔 1 个周天
for (const id of ['field', 'retreat', 'retBtn', 'visitor', 'depth', 'tuna', 'sect', 'tourSoon', 'alch']) { const h = HINTS.find(x => x.id === id); if (h) h.core = true; }
// 分类：DESIGN 写成气泡的，从阻塞讲解改成气泡（不暂停、不占讲解名额）
for (const id of ['market', 'furnace', 'me', 'heal']) { const h = HINTS.find(x => x.id === id); if (h) h.bubble = true; }
{ const h = HINTS.find(x => x.id === 'boss'); if (h) { h.bubble = true; h.bigBubble = true; } }
// 每段阻塞讲解都高亮一个要点的按钮：秘境第三句指“带着收获离开”（没有就指门）
{ const h = HINTS.find(x => x.id === 'realm3'); if (h && !h.target) Object.defineProperty(h, 'target', { get: () => (document.querySelector('#realmLeave') ? '#realmLeave' : '#realmDoors'), configurable: true }); }
