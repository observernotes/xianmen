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
  // 头一回金丹雷劫前（SYSTEMS §9 / §17）：护劫手段 → 那一停（panel-trib.js 的 tribPause）→ 点它
  { id: 'trib', urgent: true, intro: true, when: () => /境界突破|飞升天劫/.test(modalTitle()) && st.p.r >= 1 && !!document.querySelector('#tribAids'), target: '#tribAids', btn: '知道了', text: () => {
      const fa = L.aidInfo(st, 'fa'), max = Math.min(L.BT.maxPills, st.pills);
      return `从金丹起要渡雷劫。基础只有 <b>${L.pct(L.REALMS[Math.min(st.p.r, 8)].rate)}</b>，破境丹每枚 +${L.pct(L.BT.pill)}；这些<b>护劫手段</b>各能用一次：${fa.ok ? `祭法宝 <b>+${L.pct(fa.v)}</b>（失败兵器强化 −1）` : `祭法宝 +${L.pct(fa.v)}`}、道侣护法 +${L.pct(L.TRIB.daolv)}。全用上 <b>${L.pct(L.tribRate(st, { pills: max, aids: 'all' }))}</b>。`;
    } },
  { id: 'ready', urgent: true, intro: true, when: () => L.isReady(st) && !modalOpen(), target: '#cult', text: () => `修为圆满了！点这个<b>金色的修为条</b>冲击${nextName()}${L.btGuard(st) ? '。头一回老夫护法，<b>必成</b>' : `，成功率 <b>${L.pct(btShownRate())}</b>`}。`, until: () => /突破|天劫/.test(modalTitle()) || !!cine },
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
  { id: 'alch', intro: true, when: () => st.home.furnace >= 1 && !modalOpen() && !st.exp && st.herbs >= L.herbCost(st, L.RECIPES[0]), target: '[data-nav="home"]', btn: '好', text: () => `丹炉有了，灵草 <b>${fmt(st.herbs)}</b> 株也够。<b>培元丹</b>立得 4 周天修为（${L.herbCost(st, L.RECIPES[0])} 灵草，丹毒 +${L.TOX.pill}）；破境丹 ${L.herbCost(st, L.RECIPES[1])} 灵草一炉；疗伤丹 ${L.herbCost(st, L.RECIPE.liaoshang)} 灵草，负伤时服，省下破境丹。成丹率 <b>${L.pct(L.alchRate(st))}</b>，炸炉只亏灵草。` },
  { id: 'heal', when: () => st.guide.done && st.p.inj > 0 && L.canHeal(st) && !L.busy(st) && !modalOpen(), target: '[data-nav="home"]', btn: '好', text: () => `负伤了：战力只剩六成、修炼减半，还要 <b>${st.p.inj}</b> 个周天。去<b>【洞府】</b>服一枚${L.healWith(st) === 'liaoshang' ? `疗伤丹立刻就好（丹囊里 <b>${L.bagN(st, 'liaoshang')}</b> 枚）` : `破境丹立刻就好（你有 <b>${st.pills}</b> 枚）`}。` },
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
  // ---------- 功法与五行（SYSTEMS §2 / §17）：每个解锁一次阻塞讲解，数字当场从逻辑层算 ----------
  { id: 'art1', intro: true, when: () => artCalm() && !!L.artSlots(st)[0], target: '[data-nav="me"]', btn: '好', text: () => {
      const id = L.artSlots(st)[0], c = artWithout(0, () => L.gain(st));
      return `这是<b>功法</b>：心法管修炼。《${esc(L.art(id).n)}》修炼 <b>×${dec2(L.artXMult(st))}</b>：每周天 <b>+${dec(c.off)} → +${dec(c.on)}</b>。装着就涨熟练，到<b>小成</b>再强一成。【人物】→ 功法 里换。`;
    } },
  { id: 'art2', intro: true, when: () => artCalm() && Object.keys(st.arts.own).filter(id => L.art(id).k === 'x').length >= 2, target: '[data-nav="me"]', btn: '好', text: () => {
      const rows = L.artList(st, 0), rec = rows.find(r => r.rec), cur = rows.find(r => r.cur);
      if (rec) return `功法不止一门。《${esc(rec.A.n)}》修炼 <b>×${dec2(1 + (L.ARTS[rec.A.t].m - 1) * L.MAST.mult[rec.lv])}</b>，比你现在的多 <b>+${dec(rec.d.g1 - rec.d.g0)}/周天</b>；练久了还有熟练。【人物】→ 功法，点一下就换（先转修 ${L.SWAP.len} 周天）。`;
      const nw = rows.find(r => !r.cur);
      return `又得一门心法《${esc(nw.A.n)}》，不如你现在的《${esc(cur ? cur.A.n : '')}》（修炼 ×${dec2(L.artXMult(st))}），先收着。每门练到<b>圆满</b>都有一份融会：修炼 <b>+${(L.RONG.x[0] * 100).toFixed(1)}%</b>，卸下也保留。`;
    } },
  { id: 'zhanji', intro: true, when: () => artCalm() && L.artSlotOpen(st, 1) && !st.rebirth, target: '[data-nav="me"]', btn: '好', text: () => {
      const id = L.artSlots(st)[1], head = `<b>战技槽</b>开了：战技管战力，还定你的<b>攻击属性</b>（五行）。`;
      const tail = '金克木、木克土、土克水、水克火、火克金：克得住的地方历练分数 <b>+8</b>，被克 <b>−8</b>。';
      if (!id) return head + `手里还没有战技，寻宝或历练掉一门就能装，战力 <b>×${L.ZHAN_M[0]}</b> 起。` + tail;
      const c = artWithout(1, () => [L.power(st), L.pactInfo(st).p]);
      const pp = !st.pact && L.pct(c.off[1]) !== L.pct(c.on[1]) ? `，约战胜算 <b>${L.pct(c.off[1])} → ${L.pct(c.on[1])}</b>` : '';
      return head + `老夫给你装上了《${esc(L.art(id).n)}》（${L.elName(L.art(id).el)}）：战力 <b>${fmt(c.off[0])} → ${fmt(c.on[0])}</b>${pp}。` + tail;
    } },
  { id: 'mishu', intro: true, when: () => artCalm() && L.artSlotOpen(st, 2) && !st.rebirth, target: '[data-nav="me"]', btn: '好', text: () => {
      const id = L.artSlots(st)[2];
      return `<b>秘术槽</b>开了：秘术不加倍率，只给特效。` + (id ? `老夫给你装上了《${esc(L.art(id).n)}》：${esc(L.artDesc(st, id))}。` : '你还没有秘术：寻宝、宗门宝库都换得到。') + `三槽齐了，三门同属的共鸣是修炼、战力各 <b>+${Math.round(L.GEN.three * 100)}%</b>。`;
    } },
  { id: 'ke', intro: true, when: () => { const k = L.REGIONS.findIndex(r => r.n === modalTitle()); return k >= 0 && L.elemKnown(st, k) && L.expElem(st, k).v < 0 && !!document.querySelector('#expElem'); }, target: '#expElem', btn: '知道了', text: () => {
      const k = L.REGIONS.findIndex(r => r.n === modalTitle()), e = L.expElem(st, k), z = L.art(L.artSlots(st)[1]);
      const sw = document.querySelector('#expElem [data-swapz]'), B = sw && L.art(sw.dataset.swapz);
      return `${L.elName(e.it)}克${L.elName(e.me)}，你这手${L.elName(e.me)}系的《${esc(z.n)}》在${L.REGIONS[k].n}要吃亏：分数 <b>−${-e.v}</b>。换一门战技，或者认了。` + (B ? `你有《${esc(B.n)}》，点右边一下就换。` : '');
    } },
];
// ---------- 法宝（SYSTEMS §3 / §17）：对比卡、强化、法衣槽、饰品槽、器炉各一次阻塞讲解，数字当场从逻辑层算 ----------
const gearHints = [
  { id: 'gearCmp', intro: true, when: () => st.guide.done && !!document.querySelector('#modal [data-gcmp]') && !!L.gearPend(st, +document.querySelector('#modal [data-gcmp]').dataset.gcmp), target: '#modal [data-gcmp]', btn: '知道了', text: () => {
      const el = document.querySelector('#modal [data-gcmp]'); el.scrollIntoView({ block: 'nearest' });
      const x = L.gearPend(st, +el.dataset.gcmp), B = L.gearBase(x.id), D = L.gearDelta(st, x);
      const aff = x.aff.length ? `带词条${x.aff.map(a => `「${L.AFFIX[a].n}」`).join('')}：${esc(L.AFFIX[x.aff[0]].d)}。` : '';
      const gain = fmt(D.a.p) !== fmt(D.b.p) ? `战力 <b>${fmt(D.a.p)} → ${fmt(D.b.p)}</b>` : Math.abs(D.a.s - D.b.s) >= 0.05 ? `历练分数 <b>${sgn(D.a.s)} → ${sgn(D.b.s)}</b>` : `修炼 <b>+${dec(D.a.g)} → +${dec(D.b.g)}</b>`;
      return `新得的【${esc(B.n)}】${aff}【换上】：${gain}；【熔炼】得灵矿 <b>${D.smelt}</b>。没有背包，不选就熔炼。`;
    } },
  { id: 'gearPlus', intro: true, when: () => artCalm() && L.gearOpen(st, 'plus') && !!st.gear.w && !st.rebirth, target: '[data-nav="me"]', btn: '好', text: () => {
      const info = L.gearPlusInfo(st, 'w'), c = info.cost;
      const pp = info.a.pact !== null && L.pct(info.a.pact) !== L.pct(info.b.pact) ? `，约战胜算 <b>${L.pct(info.a.pact)} → ${L.pct(info.b.pact)}</b>` : '';
      const have = (st.ore || 0) >= c.ore ? `你有灵矿 <b>${fmt(st.ore)}</b>，这一下要 ${fmt(c.ore)}` : `你有灵矿 <b>${fmt(st.ore || 0)}</b>，还差 ${fmt(c.ore - (st.ore || 0))}（斩妖、熔炼都给）`;
      return `能<b>强化</b>了。灵矿别攒着：兵器强化 +${info.x.plus + 1}：战力 <b>${fmt(info.a.p)} → ${fmt(info.b.p)}</b>${pp}。${have}。【人物】→ 法宝，点兵器下面的【强化】，按住连强。`;
    } },
  { id: 'gearRobe', intro: true, when: () => artCalm() && L.gearOpen(st, 'r') && !st.rebirth, target: '[data-nav="me"]', btn: '好', text: () => {
      const x = st.gear.r, head = '<b>法衣槽</b>开了：法衣管护体——历练分数 <b>+1.5×阶</b>，三阶起负伤少 <b>1</b> 周天，金丹起还加天劫承劫。';
      return head + (x ? `你身上的【${esc(L.gearBase(x.id).n)}】：${esc(L.gearMainText(st, x))}。` : `落日古墓掉法衣多一倍；一件三阶法衣就是历练分数 <b>+${dec(L.gearOScore(st, { t: 3, plus: 0 }))}</b>。`);
    } },
  { id: 'gearOrn', intro: true, when: () => artCalm() && L.gearOpen(st, 'o') && !st.rebirth, target: '[data-nav="me"]', btn: '好', text: () => {
      const x = st.gear.o, head = `<b>饰品槽</b>开了：四种，修炼 <b>+${Math.round(L.ACC_KIND.cul.v * 100)}%×阶</b>、灵石收入 +${Math.round(L.ACC_KIND.gold.v * 100)}%×阶、奇遇把握 +${Math.round(L.ACC_KIND.luck.v * 100)}%×阶、寿元 +${Math.round(L.ACC_KIND.life.v * 100)}%×阶。`;
      return head + (x ? `你身上的【${esc(L.gearBase(x.id).n)}】：${esc(L.gearMainText(st, x))}。` : `东海龙宫掉饰品多一倍；一件四阶的修炼饰品就是修炼 <b>+${Math.round(L.ACC_KIND.cul.v * 4 * 100)}%</b>。`);
    } },
  { id: 'gearForge', intro: true, when: () => artCalm() && L.gearOpen(st, 'forge') && Object.keys(st.gear.plans).length > 0, target: '[data-nav="home"]', btn: '好', text: () => {
      const n = Object.keys(st.gear.plans).length, ok = L.PLANS.filter(P => !L.canForge(st, P.id));
      return `<b>器炉</b>能开火了：器方 <b>${n}</b> 张，用首领材料和灵矿打出固定词条的专属法宝${ok.length ? `，眼下【${esc(ok[0].n)}】材料就够` : '；首领材料不够的，金丹后首领每 ' + L.BOSS_AGAIN + ' 周天能再打一次'}。【洞府】→ 器炉。`;
    } },
];
HINTS.push(...gearHints);
// ---------- 历法、天下大势、坊市货架、行情、拍卖（SYSTEMS §7 / §10 / §17）：每样一次阻塞讲解，数字当场算 ----------
const inMarket = sel => modalTitle() === '坊市' && !!document.querySelector(sel);
const calHints = [
  { id: 'cal', intro: true, when: () => st.guide.done && L.calOpen(st) && !st.rebirth && !modalOpen() && !L.busy(st), target: BIG, btn: '好', text: () => {
      const S = L.SEASONS[L.season(st)];
      return `筑基了，天时也看得见了：这一格点开是<b>年历</b>——论道每 ${L.TOUR_EVERY} 周天（下一届 <b>${L.nextTour(st)}</b> 周天后）、拍卖会、九宗会武、夏季秘境都排在上面。现在是<b>${S.n}</b>：${S.d}。`;
    } },
  { id: 'world1', intro: true, when: () => st.guide.done && !!L.world(st) && !modalOpen() && !!document.querySelector('#worldTag:not([hidden])'), target: '#worldTag', btn: '好', text: () => {
      const w = L.world(st);
      return `右上角这块牌子是<b>天下大势</b>：${L.WORLD[w.id].n}，还剩 <b>${w.until - st.tick}</b> 个周天——${esc(L.worldDesc(st, w))}。每年第 ${L.CAL.worldAt} 个周天看一次天象，点牌子看年历。`;
    } },
  { id: 'shelf', intro: true, when: () => st.guide.done && L.shelfOpen(st) && inMarket('#shelfRot'), target: '#shelfRot', btn: '知道了', text: () => {
      document.querySelector('#shelfRot').scrollIntoView({ block: 'nearest' });
      const rot = L.shelf(st).filter(r => !r.fixed && !r.lock && r.k);
      return `下面这几格是<b>轮换货</b>：每届论道换一次，各限购几件。这届有${rot.length ? rot.map(r => `「${esc(r.n)}」${fmt(r.price)}`).join('、') : '的不多'}。<b>${L.restockIn(st)}</b> 个周天后换货。`;
    } },
  { id: 'sell', intro: true, when: () => st.guide.done && L.sellOpen(st) && inMarket('#mktSell'), target: '#mktSell', btn: '知道了', text: () => {
      document.querySelector('#mktSell').scrollIntoView({ block: 'nearest' });
      const h = L.sellHave(st, 'herb');
      return `筑基了，坊市能<b>卖东西</b>了：灵草现在 <b>×${mult2(L.sellMult(st, 'herb'))}</b>，你的 ${fmt(h)} 株能换 <b>${fmt(L.sellValue(st, 'herb', h))}</b> 灵石；破境丹一枚 <b>${fmt(L.sellPrice(st, 'pill'))}</b>。指数每 ${L.IDX.every} 个周天变一次，×1.2 以上再卖最划算。`;
    } },
  { id: 'auction', intro: true, when: () => st.guide.done && L.auctionOpen(st) && inMarket('#aucBox'), target: '#aucBox', btn: '知道了', text: () => {
      document.querySelector('#aucBox').scrollIntoView({ block: 'nearest' });
      const it = st.auction.items.find(x => !x.res) || st.auction.items[0], b = L.bidInfo(st, st.auction.items.indexOf(it), 1);
      return `拍卖会开 <b>${st.auction.until - st.tick}</b> 个周天，三件。每件三档出价：跟一口 <b>35%</b>、加价 <b>70%</b>、豪掷 <b>97%</b>，有人竞拍各 −15%——比如「${esc(it.n)}」加价 ${fmt(b.price)} 拿下 <b>${L.pct(b.p)}</b>。没拿下不花钱，一场只能出手两次；宿敌拍走的东西让他战力 ×${L.AUCTION.boost}。`;
    } },
];
HINTS.push(...calHints);
HINTS.push(...realmHints);   // 秘境：开了提醒一次、第一次进去讲三句（panel-realm.js）
// ---------- 灵宠（SYSTEMS §4 / §17）：第一只（主线“认主”之后讲兽栏）、第二只讲岗位、第一次能进化讲进化（进化事件或进化卡开着时就在上面讲） ----------
const petCalm = () => st.guide.done && !modalOpen() && !L.busy(st) && !!st.pets && !(st.storyQ || []).length;
const PET_EVO_TITLES = () => L.events().filter(e => /^pet_evolve:/.test(e.trigger || '')).map(e => e.title);
const petEvoOpen = () => !!document.querySelector('#modal .pbrs') || PET_EVO_TITLES().includes(modalTitle());
const petHints = [
  { id: 'pet1', intro: true, when: () => petCalm() && !!L.petOut(st), target: '[data-nav="home"]', btn: '好', text: () => {
      const p = L.petOut(st), need = L.petNeed(p), pw0 = L.petTry(st, () => { st.petOut = -1; }, () => L.power(st));
      return `这小东西认你做主了：<b>${esc(L.petName(p))}</b>出战，战力倍率 <b>×${mult2(L.petAtkOf(st, p))}</b>（战力 ${fmt(pw0)} → <b>${fmt(L.power(st))}</b>）。【洞府】→ <b>兽栏</b> 喂兽粮升级：Lv1 → Lv2 要 <b>${need}</b>（你有 ${fmt(st.feed || 0)}），每级倍率超出部分 +5%；它跟你出门一趟另得一成经验，斩妖还带回兽粮。`;
    } },
  { id: 'pet2', intro: true, when: () => petCalm() && L.petCount(st) >= 2 && L.petJobsOpen(st), target: '[data-nav="home"]', btn: '好', text: () => {
      const i = st.pets.findIndex((p, j) => j !== st.petOut && p.job), q = st.pets[i >= 0 ? i : st.petOut === 0 ? 1 : 0];
      const k = q.job || L.petBestJob(st, q, true) || 'forage', J = L.PET_JOB[k], qi = st.pets.indexOf(q);
      const fx = k === 'array' ? (() => { const [a, b] = petDelta(() => L.petSetJob(st, qi, ''), () => L.gain(st)); return `修炼 <b>+${dec(b)} → +${dec(a)}</b>/周天`; })() : esc(J.d(L.petTry(st, () => L.petSetJob(st, qi, k), () => L.petJobVal(st, k))));
      return `第二只来了。出战只能一只，其余的派去洞府<b>岗位</b>：护阵（修炼）、觅食（兽粮）、守田、看炉、巡山，类型对口效果 <b>×1.5</b>。【${esc(L.petName(q))}】${q.job ? '已经在' : '最适合'}<b>${J.n}</b>：${fx}${L.petJobMatch(q, k) ? '（对口）' : ''}。连着 ${L.PET_N.idle} 周天没事干会掉好感。`;
    } },
  { id: 'petEvo', urgent: true, intro: true, get target() { return modalOpen() ? '#modal .pbrs, #modal .choices' : '[data-nav="home"]'; }, btn: '知道了',
    when: () => st.guide.done && !!st.pets && st.pets.some(L.petCanEvo) && (modalOpen() ? petEvoOpen() : !L.busy(st) && !(st.storyQ || []).length), text: () => {
      const i = st.pets.findIndex(L.petCanEvo), p = st.pets[i];
      const [m0, m1] = petDelta(() => { st.pets[i].form = 1; }, () => L.petAtkOf(st, st.pets[i]));
      const sb = b => (L.petEvoKnown(st, p.sp, b) ? L.petFormName(p.sp, b) : '？') + (L.petBranchOk(st, p, b) ? '（条件已满足）' : '');
      return `【${esc(L.petName(p))}】${L.PET_N.evoLv} 级了，能<b>进化</b>：二选一，换外形、名字和天赋，品阶 <b>${L.petTier(p)} → ${L.petTier(p) + 1}</b>，出战倍率 <b>×${mult2(m0)} → ×${mult2(m1)}</b>。两支：${sb(1)} / ${sb(2)}。没试过的写着“？”，试出来记进图鉴。` + (modalOpen() ? '条件不够的分支先不显示，选“再等等”以后去兽栏点发光的卡片也能进化。' : '去【洞府】→ 兽栏，点它。');
    } },
];
HINTS.push(...petHints);
// ---------- 灵田作物与炼丹（SYSTEMS §5 / §6.2 / §17）：灵田能改种、药引丹方开放、第一次有丹毒，各一次阻塞讲解（说话时暂停）；新作物解锁另有气泡（panel-field.js） ----------
const alchCalm = () => st.guide.done && !modalOpen() && !L.busy(st) && !(st.storyQ || []).length;
const alchHints = [
  { id: 'crops', intro: true, when: () => alchCalm() && L.cropsOpen(st), target: '[data-nav="home"]', btn: '好', text: () => {
      const n = L.plotCount(st), per = L.fieldInc(st.home.field) / n;
      return `灵田现在 <b>${n}</b> 块，全种着<b>灵稻</b>：每块每周天灵石 <b>+${dec(per)}</b>。点画面左下的田（或【洞府】→ 灵田）能改种：<b>灵草</b>每 3 周天收 <b>${dec(L.cropHarvest(st, 'herb'))}</b> 株，炼丹用——那块田就不结灵石了。灵田每 ${L.CROP_V.plotEvery} 级多一块，筑基后还有灵谷（兽粮）和药引作物。`;
    } },
  { id: 'yinGrid', intro: true, when: () => alchCalm() && L.yinOpen(st) && st.home.furnace >= 1, target: '[data-nav="home"]', btn: '好', text: () => {
      const f = L.CROP.fire, h = dec(L.cropHarvest(st, 'fire'));
      return `<b>药引丹方</b>开了：两味药引配一炉，火、冰、雷、木、魂五味，5×5 共 <b>${L.YIN_GRID.length}</b> 格，没试过的写着“？”。【洞府】→ 炼丹房，点一格【试炼】：付那一格的材料，丹成就揭晓，记进图鉴，下一世还在。药引从灵田来——<b>赤炎果</b>（火引）、<b>寒霜莲</b>（冰引）能种了，每 ${f.cyc} 周天收 <b>${h}</b> 枚；你现在有火引 ${L.yinHave(st, 'fire')}、冰引 ${L.yinHave(st, 'ice')}。`;
    } },
  { id: 'toxin', urgent: true, intro: true, when: () => st.guide.done && (st.toxin || 0) > 0 && !modalOpen() && !cine && !!document.querySelector('#toxBox:not([hidden])'), target: '#toxBox', btn: '知道了', text: () => {
      const t = Math.round(st.toxin), d = L.toxDecay(st);
      return `看这个小葫芦：<b>丹毒 ${t}</b>/${L.TOX.max}。修炼、战斗类的丹每服一枚 +${L.TOX.pill}（上品 +${L.TOX.good}、极品 +${L.TOX.perfect}），突破时每枚破境丹 +${L.TOX.bt}；每周天退 <b>${dec(d)}</b>，照现在 ${Math.ceil(t / d)} 个周天退干净。过 <b>${L.TOX.half}</b> 再服药力减半，过 <b>${L.TOX.max}</b> 不能再服。根基类的丹不计丹毒。`;
    } },
];
HINTS.push(...alchHints);
// 功法讲解的时机：引导做完、没有弹窗、人在洞府闲着、没负伤（台词里的“每周天 +N”与顶栏一致）
const artCalm = () => st.guide.done && !modalOpen() && !L.busy(st) && !(st.p.inj > 0) && !!st.arts;
// 卸下第 i 槽前后各算一次 fn（讲解里的“a → b”）
function artWithout(i, fn) {
  const a = st.arts, prev = a.slot[i];
  const on = fn();
  a.slot[i] = null;
  try { return { on, off: fn() }; } finally { a.slot[i] = prev; }
}
let activeHint = null, tempHint = null, guideShownId = '', guideHold = false, hintCool = 0;
function ensureGuide() {
  if (!st.guide) st.guide = { step: 0, done: st.tick > 3 || st.stats.exp > 0 || st.rebirth > 0 };
  if (!st.hintSeen) st.hintSeen = {};
}
function currentGuide() {
  if (!st || !$('#intro').hidden || (cine && !cine.paused)) return null;   // 天劫中途那一停（cine.paused）老祖可以说话
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
  if (activeHint && st.run && !/^realm/.test(activeHint.id)) activeHint = null;   // 秘境里只讲秘境的
  if (!activeHint) activeHint = HINTS.find(h => !st.hintSeen[h.id] && (!st.run || /^realm/.test(h.id)) && (h.urgent || st.tick >= hintCool) && h.when()) || null;
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
    sec('build', '洞府', '聚灵阵加修炼速度，灵田种作物，丹炉开炼丹房并加突破成功率，洞府加寿元。每一行写着这次升级值多少（提前几周天、几周天回本）。负伤时服一枚疗伤丹（没有就用破境丹）立刻痊愈。'),
    sec('build', '灵田', `田数 = 1 + 灵田等级 ÷ ${L.CROP_V.plotEvery}（最多 ${L.CROP_V.plotMax} 块），每块种一种，熟了自动收、接着种。点画面里的田（或【洞府】→ 灵田）改种，【全部】一键改。灵稻结灵石（全种灵稻就是灵田的灵石收入），灵草 3 周天一收，灵谷（筑基）产兽粮，赤炎果、寒霜莲（筑基中期）、惊雷竹、长生藤（金丹）、养魂花（元婴）产五种药引。每种作物有旺季（+50%），每级灵田产量 +${Math.round(L.CROP_V.lvYield * 100)}%。种药引就是放弃那块田的灵石。`),
    sec('disc', '功法与五行', `【人物】→ 功法：三个槽，点槽再点一门就换上。心法管修炼，战技管战力并定攻击属性（炼气后期开），秘术给特效（金丹开）。装着就涨熟练（入门→小成→大成→圆满→化境，倍率的超出部分最多 ×${L.MAST.mult[4]}），圆满留一份融会。两门同属 +${Math.round(L.GEN.two * 100)}%、三门 +${Math.round(L.GEN.three * 100)}%；特定几门凑在一起有名有姓的共鸣，试出来就记进图鉴。五行：金克木、木克土、土克水、水克火、火克金，克制历练分数 +${L.EL_EXP}、对决 ×${L.EL_DUEL[0]}，被克反之。`),
    sec('sword', '法宝', `【人物】→ 法宝：兵器（战力，开局）、法衣（历练分数、少负伤，筑基中期）、饰品（修炼 / 财运 / 气运 / 寿元，元婴）三格。新掉落弹对比卡：【换上】（强化继承一半）或【熔炼】成灵矿（4 × 2^阶），不选就熔炼；【锁定当前】以后更低阶的直接熔炼。每格下【强化】花灵矿和灵石，+0～+9，每级超出部分 +${Math.round(L.PLUS.step * 100)}%，成功率 100%→40%，失败不掉级、下次 +10%。词条 16 种，天材地宝能重铸一条。化神后器炉用器方打造专属法宝。`),
    sec('bag', '坊市', `货架六格：破境丹、寻宝（连续两次没提升，第三次必出更高一阶）、灵兽蛋常驻；另三格每届论道换货（灵矿、延寿丹、法衣、残篇、器方、打折的常驻货），各限购几件。筑基后能在<b>行情</b>里卖灵草、灵矿、破境丹：指数 ×0.6～×1.6，每 ${L.IDX.every} 周天变一次，秋季、大势另有涨落。金丹后每 ${L.AUCTION.every} 周天一场<b>拍卖会</b>：三档出价（35% / 70% / 97%，有人竞拍各 −15%），没拿下不花钱，一场出手两次；宿敌拍走的东西让他战力 ×${L.AUCTION.boost}。`),
    sec('flag', '历法与天下大势', `12 周天一年：1～3 春（灵草、访客多）、4～6 夏（秘境开放、兽类地图斩妖灵石 +15%）、7～9 秋（灵田灵石 +50%、行情 +0.2）、10～12 冬（闭关 +0.2，冬末论道）。每年第 ${L.CAL.worldAt} 个周天看天象，六成起一件<b>天下大势</b>（兽潮、灵气潮汐、魔劫……），持续 6～10 周天，场景右上角挂一块牌子。筑基后最右那格“大事”点开是<b>年历</b>。`),
    sec('flag', '宗门', '筑基后三大宗门来招揽。历练、论道、任务板挣贡献，在【宗门】晋升身份、用宝库换东西。每 24 周天九宗会武，你代表本宗往上打。'),
    sec('flag', '天骄论道', `三年之约之后每 ${L.TOUR_EVERY} 周天一届：三场，按战力挑战天骄榜上的对手，每场最多上升 ${L.TOUR_STEP} 名，宿敌都在榜上。`),
    sec('disc', '奇遇与访客', '历练途中可能遇到抉择；洞府门口有时会来访客（画面里的“！”），点它就能见，几个周天不理会自己走。好感 60 成为知己有永久加成，医修和魔门圣女可结为道侣。'),
    sec('pill', '炼丹', `【洞府】→ 炼丹房。基础丹：培元（立得修为）、破境（突破）、疗伤（收进丹囊，负伤时服）。筑基中期起两味药引配一炉：5×5 共 ${L.YIN_GRID.length} 格，没试过的点【试炼】，丹成就揭晓、记进图鉴（跨世保留）。丹分修炼、战斗、根基三类：战斗类（爆气丹、雷火丹）收进丹囊，服下管下一场对决或下一趟历练；根基类不计丹毒但每境界有次数。勾“续炼”的丹每 ${L.AUTO.every} 周天自动炼一炉（最多 ${L.AUTO.max} 种）。丹毒（状态栏的葫芦）：修炼、战斗类每枚 +${L.TOX.pill}，每周天退 ${L.TOX.decay}，过 ${L.TOX.half} 药力减半，过 ${L.TOX.max} 不能再服；清毒丹 −${L.TOX.cure}。九转金丹是秘方，要有人传授。`),
    sec('life', '寿元与转世', '右上角沙漏是年龄/寿元。突破能大幅延寿；寿元耗尽会坐化，转世后天赋三选一。'),
    sec('sound', '其他', '右上角【×1】切换速度（×2、×4、暂停），音符按钮切换声音。底部札记栏可以点，告诉你下一步做什么、做完给什么。'),
  ].join('');
  sheet({ title: '玩法指南', body, foot: [{ t: '重看新手教程', alt: true, fn: () => { st.guide = { step: 0, done: false }; st.hintSeen = {}; activeHint = null; closeModal(); } }, { t: '知道了', gold: true, fn: closeModal }] });
}
const GO = {
  realm: () => showRealm(),
  exp: () => showExp(), home: () => showHome(), pets: () => showPets(), field: () => showField(), alch: () => (st.home.furnace ? showAlchemy() : showHome()), sect: () => showSect(), market: () => showMarket(), me: () => showMe('rank'), big: () => showBig(), arts: () => showMe('art'), gear: () => showGear(),
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
