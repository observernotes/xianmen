/* 废柴仙途 · 界面片段 panel-cal：年历（24 格时间轴）、场景右上角的天下大势小牌、老祖的大势与换季气泡
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。规则与数据在 src/logic/calendar.js（四季、固定历、大势）。 */
// ART.icon 的 16×16 图标，按整数个设备像素放大（k = 每个逻辑像素约几个 CSS 像素）
function icon16(name, k) {
  const c = ART.icon(name); if (!c) return '';
  const z = pxs(c.width || 16, k || 1);
  return `<img class="px" src="${urlOf(c, 'ic|' + name)}" style="width:${z}px;height:${z}px;flex:none;vertical-align:middle" alt="">`;
}
const CAL_KIND = { dao: ['论道', '#f4c542'], auc: ['拍卖', '#c27dff'], war: ['会武', '#d8404a'], realm: ['秘境', '#7fe0f0'], world: ['大势', '#4ccb9f'] };
const calKey = k => `<i class="calkey" style="background:${CAL_KIND[k][1]}"></i>`;
// 某张图斩妖（或别的行事）能稳拿的最深一层：预计乙以上过半；都不行就外围
function calDepth(k, a) { let d = 0; for (let j = 0; j < 3; j++) if (L.expOpen(st, k, j, a) && L.expForecast(st, k, j, a).pOk >= 0.5) d = j; return d; }
// 年历：一条 24 格的时间轴（ART.calStrip），下面每件事一行，各带倒计时和【前往】
function showCalendar(focus) {
  const t = st.tick, s = L.season(st), S = L.SEASONS[s], f = L.seasonFx(st), w = L.world(st);
  // 一件事一张卡：图标 + 名字 + 倒计时（金字）+【前往】；说明点开看。还没轮到你的（金丹后、入宗后……）收进“以后的事”
  const rows = [], later = [];
  const row = (o) => (o.later ? later : rows).push(pnFold('cal-' + o.id, { cls: 'calrow' + (focus && o.id === focus ? ' focus' : ''), attrs: ` data-cal="${o.id}"`, ic: o.img, nm: `${o.key ? calKey(o.key) : ''}${o.n}`,
    k: `<b class="goldt">${o.left}</b>`, right: o.go ? `<button class="btn sm alt calgo" data-go="${o.go}">${o.btn || '前往'}</button>` : '', body: o.d ? `<div class="pn-line">${o.d}</div>` : '', open: focus && o.id === focus }));
  // 季节
  const nextS = L.SEASONS[(s + 1) % 4];
  const sd = [f.herb && `灵田灵草 +${Math.round(f.herb * 100)}%`, f.visit && `访客 +${Math.round(f.visit * 100)}%`, f.beast && `兽类地图斩妖灵石 +${Math.round(f.beast * 100)}%`, s === 1 && '秘境开放', f.rice && `灵田灵石 +${Math.round(f.rice * 100)}%`, f.price && `行情 +${mult2(f.price)}`, f.ret && `闭关倍率 +${mult2(f.ret)}${L.comboOn(st, 'c12') ? '（星河倒悬再 +0.5）' : ''}`].filter(Boolean).join('，');
  row({ id: 'season', img: icon16('s' + s, 2), n: `${S.n}季`, left: `还剩 ${L.seasonLeft(st)} 月`, d: `${sd}${f.amp > 1 ? '（月星斗：季节加成翻倍）' : ''}。下一季${nextS.n}：${nextS.d}。` });
  // 天下大势
  if (w) row({ id: 'world', key: 'world', img: icon16(w.id, 2), n: `天下大势 · ${L.WORLD[w.id].n}`, left: `还剩 ${w.until - t} 月`, d: esc(L.worldDesc(st, w)) + '。' });
  else row({ id: 'world', key: 'world', img: icon16('w_taiping', 2), n: '天下大势', left: `${L.nextWorldRoll(st)} 月后`, d: `眼下无事。每年第 ${L.CAL.worldAt} 个月看一次天象，六成会起一件大势，持续 6～10 月。` });
  // 论道 / 三年之约
  if (!st.pact) { const pi = L.pactInfo(st); row({ id: 'pact', key: 'dao', img: icon16('gavel', 2), n: '三年之约', left: `${pi.left} 月后`, d: `胜算 ${L.pct(pi.p)}。之后每 ${L.TOUR_EVERY} 月一届天骄论道（冬末）。`, go: 'pact', btn: '锦囊' }); }
  else row({ id: 'dao', key: 'dao', img: iconHTML('flag', 30), n: '天骄论道', left: `${L.nextTour(st)} 月后`, d: `每 ${L.TOUR_EVERY} 月一届（冬末），三场，每场最多升 ${L.TOUR_STEP} 名。你现在第 ${st.rank}。`, go: 'rank', btn: '看榜' });
  // 拍卖会
  if (st.rebirth > 0 || L.mr(st) >= 2) {
    if (L.auctionOpen(st)) row({ id: 'auc', key: 'auc', img: icon16('gavel', 2), n: '拍卖会 · 正开着', left: `还剩 ${st.auction.until - t} 月`, d: `三件竞价，还能出手 ${L.auctionBidsLeft(st)} 次。`, go: 'market', btn: '去坊市' });
    else row({ id: 'auc', key: 'auc', img: icon16('gavel', 2), n: '拍卖会', left: `${L.nextAuction(st)} 月后`, d: `每 ${L.AUCTION.every} 月一场，开 ${L.AUCTION.len} 月，三件竞价。` });
  } else row({ id: 'auc', key: 'auc', img: icon16('gavel', 2), n: '拍卖会', left: '金丹后', later: 1, d: `金丹后每 ${L.AUCTION.every} 月一场，开 ${L.AUCTION.len} 月。` });
  // 九宗会武
  if (st.sect && st.sect.order) row({ id: 'war', key: 'war', img: icon16('paddle', 2), n: '九宗会武', left: `${L.nextMeet(st)} 月后`, d: `每 ${L.MEET_EVERY} 月一届，你代表${esc(L.sectOf(st).n)}出战，眼下宗门第 ${L.sectPos(st)}。`, go: 'sect', btn: '宗门' });
  else row({ id: 'war', key: 'war', img: icon16('paddle', 2), n: '九宗会武', left: '入宗后', later: 1, d: `入宗满 12 月后，每 ${L.MEET_EVERY} 月一届。` });
  // 秘境：每个夏季
  const rw = L.realmWindow(st);
  const mth = L.mjThemeNow(st), mok = L.mjUnlocked(st);
  row({ id: 'realm', key: 'realm', later: !mok, img: icon16('token', 2), n: '秘境' + (mok ? ` · ${mth.n}` : ''), left: rw.open ? `正开着，还剩 ${rw.left} 月` : `${rw.in} 月后开`, d: `每年入夏开放 6 个月（本年第 4～9 月），筑基中期起可入${mok ? `；秘境令 ${L.mjTokens(st)}/${L.MJ.tokenMax}，主题每年一换（剑气 → 百草 → 熔火 → 幽泉）` : ''}。`, go: mok && L.mjCan(st) ? 'realm' : '', btn: '进入' });
  // 货架与任务板
  row({ id: 'shelf', img: icon16('sell', 2), n: '坊市换货', left: `${L.restockIn(st)} 月后`, d: `每届论道后换三格轮换货${st.sect ? '，宗门任务板同时刷新' : ''}。`, go: navLock('market') ? '' : 'market', btn: '去坊市' });
  const legend = Object.keys(CAL_KIND).map(k => `<span>${calKey(k)}${CAL_KIND[k][0]}</span>`).join('');
  const body = `<div class="calwrap"><img class="px calstrip" id="calStrip" src="${ART.calStrip(t, L.calMarks(st)).toDataURL()}" alt="年历"><div class="calruler" id="calRuler">${[0, 6, 12, 18, 23].map(i => `<span style="left:${((1 + 8 * i + 4) / 194 * 100).toFixed(2)}%">${i ? '+' + i : '今'}</span>`).join('')}</div></div>
    <div class="callegend">${legend}</div><div class="pn-list">${rows.join('')}</div>${later.length ? `<details class="more"><summary>以后的事 · ${later.length} 件</summary><div class="pn-list">${later.join('')}</div></details>` : ''}`;
  const sh = sheet({ title: '年历', sub: `第${Math.floor(st.year) + 1}年 · ${S.n} · 本年第 ${((t % 12) + 12) % 12 || 12} 月`, body });
  fitCalStrip(sh);
  sh.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    SFX.tap();
    const k = b.dataset.go;
    if (k === 'pact') showPact(); else if (k === 'rank') showMe('rank'); else GO[k]();
  });
  if (focus) { const el = sh.querySelector(`[data-cal="${focus}"]`); if (el) { const dd = el.closest('details.more'); if (dd) dd.open = true; el.scrollIntoView({ block: 'nearest' }); } }
}
// 年历条按整数个设备像素放大到装得下的最大一档
function fitCalStrip(root) {
  const img = root.querySelector('#calStrip'), wrap = root.querySelector('.calwrap'); if (!img || !wrap) return;
  const d = window.devicePixelRatio || 1, avail = wrap.clientWidth || 300;
  const k = Math.max(1, Math.floor(avail * d / 194));
  img.style.width = (194 * k / d) + 'px'; img.style.height = (20 * k / d) + 'px';
  const ru = root.querySelector('#calRuler'); if (ru) ru.style.width = img.style.width;
}

// ---------- 场景右上角：天下大势小牌（点开 = 年历） ----------
let worldTagKey = '';
function updateWorldTag() {
  const el = $('#worldTag'); if (!el) return;
  const w = st && L.calOpen(st) && L.world(st);
  const show = !!w && !cine && $('#intro').hidden;
  if (!show) { if (!el.hidden) el.hidden = true; worldTagKey = ''; return; }
  const key = w.id + '|' + (w.until - st.tick);
  if (key !== worldTagKey) {
    worldTagKey = key;
    el.innerHTML = `${icon16(w.id, 1.5)}<span>${L.WORLD[w.id].n}</span><b>${w.until - st.tick}</b>`;
    el.setAttribute('aria-label', `天下大势：${L.WORLD[w.id].n}，还剩 ${w.until - st.tick} 月`);
  }
  el.classList.toggle('away', !!st.exp);
  el.hidden = false;
}
$('#worldTag').addEventListener('click', e => { e.stopPropagation(); if (!st || cine) return; ac(); SFX.tap(); showCalendar('world'); });

// ---------- 老祖：大势开始时一句“该干什么”（带数字）；换季时提一句（每季一次） ----------
function worldLine(w) {
  const n = w.until - w.at, V = L.WORLD_V, inc = Math.max(L.income(st), 20);
  const where = (k, a) => { const d = calDepth(k, a); return { d, f: L.expForecast(st, k, d, a), at: L.REGIONS[k].n + '·' + L.DEPTHS[d] }; };
  switch (w.id) {
    case 'w_shouchao': { const x = where(L.regionOpen(st, 3) ? 3 : 0, 0); return `兽潮来了，${n} 个月：木属性地图斩妖灵石 ×1.8（${x.at} ${fmt(x.f.stones / V.shouchao)} → ${fmt(x.f.stones)}），分数 ${V.shouchaoScore}，量力。`; }
    case 'w_lingchao': { const g1 = L.gainBase(st), e = L.retInfo(st).epi; return `灵气潮汐 ${n} 个月：修炼 +${dec(g1 / (1 + V.lingchao))} → +${dec(g1)}/月，闭关顿悟 ${L.pct(e / 2)} → ${L.pct(e)}。正好闭关。`; }
    case 'w_danhui': { const r = L.alchRate(st), p = L.sellOpen(st) ? L.sellPrice(st, 'pill') : 0; return `丹道大会 ${n} 个月：成丹率 ${L.pct(r - V.danhuiAlch)} → ${L.pct(r)}` + (p ? `，破境丹卖价 ${fmt(p / V.danhuiSell)} → ${fmt(p)}。留三枚，多的去卖。` : '，多炼几炉。'); }
    case 'w_kuangmai': { const x = where(w.k, 0); return `${L.REGIONS[w.k].n}出了矿脉：${n} 个月灵矿 ×3，斩妖一趟 ${fmt(x.f.ore / V.kuangmai)} → ${fmt(x.f.ore)}。缺灵矿就去。`; }
    case 'w_mojie': {
      const ks = []; for (let k = 0; k < L.REGIONS.length; k++) if (L.regionOpen(st, k) && ['huo', 'shui'].includes(L.REGIONS[k].el)) ks.push(k);
      if (!ks.length) return `魔劫 ${n} 个月：火、水属性地图推荐战力 ×1.3、收获 ×1.6。你还没去过那种地方，躲远点。`;
      const x = where(ks[ks.length - 1], 0);
      return `魔劫 ${n} 个月：火、水属性地图推荐战力 ×1.3、收获 ×1.6。${x.at}你预计「${x.f.text}」，打得过就去。`;
    }
    case 'w_liuxing': return `流星雨 ${n} 个月：寻宝出高一阶的概率 15% → 30%，天材地宝一出就是两个。这几趟去寻宝。`;
    case 'w_dahan': { const p = L.sellOpen(st) ? L.sellPrice(st, 'herb') : 0, h = L.sellHave(st, 'herb'); return `大旱 ${n} 个月：灵田少四成` + (p ? `，灵草卖价 ×1.6（一株 ${L.fmt1(p)}）。你的 ${fmt(h)} 株能卖 ${fmt(L.sellValue(st, 'herb', h))}。` : `，灵石少 ${fmt(st.home.field ? L.fieldInc(st.home.field) * V.dahan : 0)}/月。`); }
    case 'w_xianfu': { const b = L.expBest(st, 0); return `仙府现世 ${n} 个月：历练评价甲以上，一半机会带回秘藏。${L.REGIONS[b.k].n}·${L.DEPTHS[b.d]}你预计「${b.f.text}」。`; }
    case 'w_shanglu': { const v = L.sellOpen(st) ? L.sellValue(st, 'herb', L.sellHave(st, 'herb')) + L.sellValue(st, 'pill', L.sellHave(st, 'pill')) : 0; return `商路断了 ${n} 个月：买价 +30%（破境丹 ${fmt(L.price(st, 'pill'))} → ${fmt(Math.floor(L.price(st, 'pill') * V.shanglu))}），行情 ×1.3。先别买` + (v ? `，卖草卖丹约 ${fmt(v)}。` : '。'); }
    case 'w_jiangdao': { const m = L.retBaseMult(st), c = st.sect ? L.contribFor(L.homeRegion(st)) * V.jiangdaoContrib : 0; return `名师讲道 ${n} 个月：闭关 ×${(m - V.jiangdao).toFixed(2)} → ×${m.toFixed(2)}${c ? `，出关另得贡献 ${fmt(c)}` : ''}。回洞府闭关。`; }
    case 'w_tongji': { const q = L.wantedRank(st), P = q ? L.rivalPower(st, q) : 0, S = L.power(st); return `通缉令：第 ${q} 名「${w.who}」悬赏 ${fmt(inc * L.CAL.bounty)}，${L.nextTour(st)} 月后论道打赢他就拿，胜算 ${L.pct(L.duelChance(S, P))}。`; }
    default: return `天下太平，${n} 个月没什么事。照常历练、闭关，${n + 2} 月后再看天象。`;
  }
}
function worldTip(id) {
  const w = L.world(st); if (!w || w.id !== id) return;
  tip('world_' + w.id + '_' + w.at, worldLine(w));
}
function seasonTip(s) {
  if (!L.calOpen(st) || (st.guide && !st.guide.done)) return;
  const f = L.seasonFx(st), left = L.seasonLeft(st);
  let t = '';
  if (s === 0) t = `开春了（${left} 个月）：${cropSeasonLine(0) || `灵田灵草 +${Math.round(f.herb * 100)}%`}，访客多三成。`;
  else if (s === 1) { const ks = L.REGIONS.map((r, k) => k).filter(k => L.beastMap(k) && L.regionOpen(st, k)).map(k => L.REGIONS[k].n); t = `入夏：兽类地图（${ks.join('、') || '后山野林'}）斩妖灵石 +${Math.round(f.beast * 100)}%；传闻夏天山里有秘境开启。${cropSeasonLine(1) ? cropSeasonLine(1) + '。' : ''}`; }
  else if (s === 2) { const base = L.fieldStoneInc(st); t = `入秋：灵田灵石 +${Math.round(f.rice * 100)}%${st.home.field ? `（+${L.fmt1(base)} → +${L.fmt1(base * (1 + f.rice))}/月）` : ''}，行情 +${mult2(f.price)}${L.sellOpen(st) ? `：灵草现在 ×${mult2(L.sellMult(st, 'herb'))}` : ''}。秋天卖东西最好。`; }
  else { const m = L.retBaseMult(st); t = `入冬：闭关倍率 ×${(m - f.ret).toFixed(2)} → ×${m.toFixed(2)}，冬末（${L.nextTour(st)} 月后）是天骄论道。这时候闭关最划算。${cropSeasonLine(3) ? cropSeasonLine(3) + '。' : ''}`; }
  tip('season_' + s, t);
}
