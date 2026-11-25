/* 废柴仙途 · 界面片段 duels：对决、三年之约、天骄论道（论道前的对决准备与新秀挑战在 panel-rivals.js）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 对决（通用）：在场景里演（duel-scene.js），下方纸卷只留标题、一行台词、胜算和【跳过】 ----------
// o：title, intro, quote, right{img,name,sub}, S, Q, p, win, winText, loseText, btn, done；
//   stage（town 落霞城 / cloud 论道台 / sect 演武场 / wild 野外，缺省按在不在历练里选）、foe（对决小人，见 ftRival / ftPeople / ftGen / ftBoss）、face（开场对视）、trio（三人会武）
function duel(o) {
  const S = o.S || L.power(st);
  const p = o.p !== undefined ? o.p : L.duelChance(S, o.Q);   // 逻辑层掷骰用的胜算（L.duelP，含功法共鸣的上下限）
  const cont = !!duelFx;
  let ended = false;
  const finish = () => { const prev = duelFx; o.done(); if (duelFx === prev) { duelFx = null; syncDuelUI(); } };
  const s = sheet({
    title: o.title, noClose: true, still: cont,
    body: `${o.intro ? `<p class="duel-intro">${o.intro}</p>` : ''}${o.quote ? `<div class="quote">${esc(o.quote)}</div>` : ''}
      <div class="muted center duel-p">${esc(st.p.name)} ${fmt(S)} · ${esc(o.right.name)} ${fmt(o.Q)} · 胜算 ${L.pct(p)}</div>
      <div id="vsRes" class="center"></div>`,
    foot: [{ t: '跳过', alt: true, fn: () => { if (!ended) duelSkip(); else finish(); } }],
    onClose: () => { duelFx = null; syncDuelUI(); },
  });
  const m = $('#modal');
  m.classList.add('duel-m');
  { const wr = $('#sceneWrap').getBoundingClientRect(); m.style.setProperty('--dmax', Math.max(150, Math.floor(window.innerHeight - 8 - wr.bottom)) + 'px'); }   // 纸卷最高到场景底边为止，不盖住场景（长台词在纸卷里滚）
  m.onclick = e => { if (e.target === m && !ended) duelSkip(); };   // 点画面任何地方都能跳过
  const foe = o.foe || ftGen(o.right.name);
  duelStage({ stage: o.stage || (st.exp || st.run ? 'wild' : 'town'), L: ftMe(), R: foe, win: o.win, p, S, Q: o.Q, face: o.face, trio: o.trio, foeName: o.right.name,
    onEnd: () => {
      ended = true;
      const box = s.querySelector('#vsRes'), btn = s.querySelector('[data-fi="0"]');
      if (!box || !btn) return;
      box.innerHTML = o.win ? `<div class="big goldt">胜！</div><div>${o.winText}</div>` : `<div class="big seal">败</div><div>${o.loseText}</div>`;
      bindEquipButtons(box); bindGearButtons(box);   // 结果里的功法【换上】、法宝对比卡
      btn.textContent = o.btn || '继续'; btn.classList.remove('alt'); btn.classList.add('gold');
      const ip = s.querySelector('.duel-intro'); if (ip && o.winText) ip.hidden = true;   // 结果出来后纸卷别太高，把开场白收起来
    } });
}

// ---------- 三年之约 ----------
function runPact() {
  const res = L.pactDuel(st);
  const ex = st.exName;
  duel({
    title: '三年之约', intro: '三年之期已到。落霞城擂台下人山人海，都来看那个被退婚的“废物”如何收场。' + (res.assist ? `<br><span class="jadet">戒中老祖借你一缕神魂：战力 ${fmt(res.base)} ×${L.PACT_ASSIST} = ${fmt(res.S)}</span>` : ''),
    right: { img: rivalAvImg({ n: ex, id: 'mu' }, 66), name: ex, sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
    stage: 'town', foe: ftRival('mu'), face: true,
    quote: `${ex}：“三年了，废物终究是废物。现在认输，我还能给你留几分颜面。”`,
    winText: `${res.assist ? '危急关头，戒指中涌出一股浩瀚之力！<br>' : ''}一招落定，${esc(ex)}倒退十余步，满城哗然！<br>“莫欺少年穷！今日之后，你我再无瓜葛。”<br>灵石 +${fmt(res.stones || 0)}`,
    loseText: `${esc(ex)}冷笑离去。你攥紧拳头：天骄榜上，我们再见分晓！`,
    done: closeModal,
  });
}

// ---------- 天骄论道 ----------
const TAUNTS = ['区区散修，也敢上论道台？', '今日便让你知道天高地厚！', '哼，不自量力。', '我宗天骄，岂是你能比的？', '早点认输，免得丢人现眼。'];
const SHOCK = ['这……这不可能！', '台下一片哗然！', '对面师长脸色铁青。', '观战众人倒吸一口凉气！'];
const RIVAL_LINES = {
  mu: ['废物，三年过去，你还是废物。', '怎……怎么可能？当年那个废物……'],
  zhao: ['当年一脚把你踢下山，今天照样！', '师……师弟，当年是师兄有眼无珠！'],
  chu: ['天剑宗圣子，岂是你这弃徒能挑战的？', '我楚天阔……竟输给一个弃徒？！'],
  xue: ['正道蝼蚁，也配让本圣子出手？', '此人……不可力敌，撤！'],
  yun: ['我在榜首等你很久了。来吧。', '好剑。天下第一，是你的了。'],
};
// 第一场多半碰上宿敌时，先弹对决准备页（panel-rivals.js 的 tourPrep：他的资料、换成 X 战技：胜算 p → p'），点【登台】再开打
function runTournament() { tourPrep(runTournamentGo); }
function runTournamentGo() {
  const wq = L.wantedRank(st), ww = L.wanted(st);
  const res = L.tournament(st);
  rankShown = res.startRank;
  // 上回拍卖会被天骄拍走的东西（他们战力已 ×1.04）；通缉令的悬赏
  const aucNews = (res.aucNews || []).length ? `<div class="quote">${res.aucNews.slice(0, 3).map(x => `${esc(x.n)}在拍卖会上拍得【${esc(x.item)}】，战力 ×${L.AUCTION.boost}`).join('<br>')}${res.aucNews.length > 3 ? `<br>另有 ${res.aucNews.length - 3} 人` : ''}</div>` : '';
  const wantedNote = ww && wq ? `<p class="center seal">通缉犯「${esc(ww.who)}」也在台上（第 ${wq} 名），击败他赏 ${fmt(Math.max(L.income(st), 20) * L.CAL.bounty)} 灵石</p>` : '';
  let step = -1;
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({ title: `第${res.n}届 天骄论道`, center: true, noClose: true,
        body: `<p class="center">天下天骄齐聚论道台，以战论道，排定天骄榜！</p>${aucNews}${wantedNote}${res.n === 1 ? `<div class="quote">天骄论道每 ${L.TOUR_EVERY} 周天一届，会自动开打：三场，按战力去挑战榜上的对手，赢了就顶替对方的名次，每场最多上升 ${L.TOUR_STEP} 名。宿敌们都在榜上。</div>` : ''}<div class="center">${myAvImg(52)}</div><p class="center num">战力 ${fmt(res.S)} · 当前天骄榜第 ${res.startRank}</p>`,
        foot: [{ t: '登台！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const rv = rd.rv || { n: '无名', s: '' };
    const lines = rv.id ? RIVAL_LINES[rv.id] : null;
    // 宿敌：半身像；看家战技与法宝已知的写出来；赢了恩怨 +20（rivals2.js）
    const rk = rv.id ? L.rivalKnow(st, rv.id) : null, RI = rv.id ? L.RIVAL_INFO[rv.id] : null;
    const rvIntro = rk ? [rk.art ? `看家战技《${esc(L.art(RI.art).n)}》` : '', rk.gear ? `法宝【${esc(RI.gear.n)}】克${L.ELEM[RI.gear.ke]}` : ''].filter(Boolean).join(' · ') : '';
    duel({
      title: `第 ${step} 战`, intro: rvIntro ? `<span class="muted">${rvIntro}</span>` : '',
      right: { img: rv.id ? rvPortrait(rv.id, 66, 'ang', true) : rivalAvImg(rv, 66), name: rv.n, sub: `${rv.s} · 第${rd.q}名 · ${fmt(rd.P)}` }, Q: rd.P, S: rd.S || res.S, p: rd.p, win: rd.win,
      stage: 'cloud', foe: rv.id ? ftRival(rv.id) : ftGen(rv.n), face: !!rv.id,
      quote: `${rv.n}：“${rd.auc ? `上回拍卖会那件【${rd.auc}】，多谢你没跟价。今天就用它送你下台！` : rd.wanted ? '我是冤枉的……可你要拿我领赏，那就来！' : lines ? lines[0] : TAUNTS[(step + res.n) % TAUNTS.length]}”`,
      winText: `${rd.xx ? '<div class="jadet">玄霄嗡鸣，老祖出手：这一场重来了一次</div>' : ''}${rd.defend ? '卫冕天骄榜第一' : `排名升至第 ${rd.q}`} · 灵石+${fmt(rd.stones || 0)}${rd.contrib ? ` · 贡献+${fmt(rd.contrib)}` : ''}${rd.bounty ? `<div class="goldt">擒下通缉犯，赏金 +${fmt(rd.bounty)}</div>` : ''}${lines && rd.first ? `<div class="quote">${esc(rv.n)}：“${esc(lines[1])}”</div>` : rd.P > res.S * 0.9 ? `<div class="muted">${SHOCK[step % SHOCK.length]}</div>` : ''}${rd.grudge ? `<div class="seal">与${esc(rv.n)}的恩怨 +${rd.grudge}（${L.grudge(st, rv.id)}）</div>` : ''}`,
      loseText: '对手底蕴深厚，来日再战。',
      btn: res.rounds[step] ? '下一战' : '论道落幕',
      done: () => { if (rd.win && !rd.defend) rankShown = rd.q; next(); },
    });
  };
  const summary = () => {
    const up = res.startRank - res.endRank;
    rankShown = 0;
    if (up > 0) banner(`天骄榜 ↑${up}`, `第 ${res.endRank} 名`);
    sheet({ title: '论道落幕', center: true,
      body: `<div class="center big ${up > 0 ? 'goldt' : ''}">天骄榜第 ${res.endRank}</div><p class="center">${up > 0 ? `排名 ${res.startRank} → ${res.endRank}，上升 ${up} 位！` : res.endRank === 1 ? '稳坐天骄榜第一！' : '排名未变，下届再战。'}</p>
        ${res.endRank === 1 && res.startRank > 1 ? `<div class="quote">四海天骄俯首，${esc(st.p.name)}，天下第一！</div>` : ''}
        ${res.hold ? `<p class="center seal">${esc(res.hold.n)}挡在第 ${res.hold.q} 名，没把你放在眼里，不肯上台。修到<b>${esc(res.hold.need)}</b>前后再来（越不过他的名次）。</p>` : ''}
        ${res.rookie ? `<p class="center ${res.rookie.due ? 'seal' : 'muted'}">新秀${esc(res.rookie.n)}往上追了 ${res.rookie.up} 名（第 ${res.rookie.q}）${res.rookie.due ? '，追到了你身后！' : `，离你还差 ${res.rookie.gap} 名`}</p>` : ''}`,
      foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
  };
  next();
}
