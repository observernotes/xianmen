/* 废柴仙途 · 界面片段 duels：对决、三年之约、天骄论道
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 对决（通用） ----------
function duel(o) {
  const S = o.S || L.power(st);
  const p = o.p !== undefined ? o.p : L.duelChance(S, o.Q);   // 逻辑层掷骰用的胜算（L.duelP，含功法共鸣的上下限）
  const s = sheet({
    title: o.title, center: true, noClose: true,
    body: `${o.intro ? `<p>${o.intro}</p>` : ''}<div class="vs"><div class="side">${myAvImg(66).replace('<img ', '<img id="vsL" ')}<div>${esc(st.p.name)}</div><div class="muted num">${fmt(S)}</div></div>
      <div class="vsx">VS</div>
      <div class="side">${o.right.img}<div>${esc(o.right.name)}</div><div class="muted num">${esc(o.right.sub)}</div></div></div>
      ${o.quote ? `<div class="quote">${esc(o.quote)}</div>` : ''}
      <div class="muted center">胜算 ${L.pct(p)}</div>
      <div id="vsRes" class="center" style="min-height:3em"></div>`,
    foot: [{ t: '……', alt: true, disabled: true, fn: () => o.done() }],
  });
  const l = s.querySelector('#vsL'), r = s.querySelector('#vsR');
  if (l) l.classList.add('clashL'); if (r) r.classList.add('clashR');
  let hits = 0; const hi = setInterval(() => { SFX.hit(); if (++hits >= 3) clearInterval(hi); }, 330);
  setTimeout(() => {
    const box = s.querySelector('#vsRes'), btn = s.querySelector('[data-fi="0"]');
    if (!box) return;
    box.innerHTML = o.win ? `<div class="big goldt">胜！</div><div>${o.winText}</div>` : `<div class="big seal">败</div><div>${o.loseText}</div>`;
    if (o.win) SFX.win(); else SFX.fail();
    btn.disabled = false; btn.textContent = o.btn || '继续'; btn.classList.remove('alt'); btn.classList.add('gold');
  }, 1150);
}

// ---------- 三年之约 ----------
function runPact() {
  const res = L.pactDuel(st);
  const ex = st.exName;
  duel({
    title: '三年之约', intro: '三年之期已到。落霞城擂台下人山人海，都来看那个被退婚的“废物”如何收场。' + (res.assist ? `<br><span class="jadet">戒中老祖借你一缕神魂：战力 ${fmt(res.base)} ×${L.PACT_ASSIST} = ${fmt(res.S)}</span>` : ''),
    right: { img: rivalAvImg({ n: ex, id: 'mu' }, 66), name: ex, sub: fmt(res.Q) }, Q: res.Q, S: res.S, p: res.p, win: res.win,
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
function runTournament() {
  const res = L.tournament(st);
  rankShown = res.startRank;
  let step = -1;
  const next = () => {
    step++;
    if (step === 0) {
      SFX.gong();
      sheet({ title: `第${res.n}届 天骄论道`, center: true, noClose: true,
        body: `<p class="center">天下天骄齐聚论道台，以战论道，排定天骄榜！</p>${res.n === 1 ? `<div class="quote">天骄论道每 ${L.TOUR_EVERY} 周天一届，会自动开打：三场，按战力去挑战榜上的对手，赢了就顶替对方的名次，每场最多上升 ${L.TOUR_STEP} 名。宿敌们都在榜上。</div>` : ''}<div class="center">${myAvImg(52)}</div><p class="center num">战力 ${fmt(res.S)} · 当前天骄榜第 ${res.startRank}</p>`,
        foot: [{ t: '登台！', gold: true, fn: next }] });
      return;
    }
    const rd = res.rounds[step - 1];
    if (!rd) { summary(); return; }
    const rv = rd.rv || { n: '无名', s: '' };
    const lines = rv.id ? RIVAL_LINES[rv.id] : null;
    duel({
      title: `第 ${step} 战`,
      right: { img: rivalAvImg(rv, 66), name: rv.n, sub: `${rv.s} · 第${rd.q}名 · ${fmt(rd.P)}` }, Q: rd.P, S: rd.S || res.S, p: rd.p, win: rd.win,
      quote: `${rv.n}：“${lines ? lines[0] : TAUNTS[(step + res.n) % TAUNTS.length]}”`,
      winText: `${rd.defend ? '卫冕天骄榜第一' : `排名升至第 ${rd.q}`} · 灵石+${fmt(rd.stones || 0)}${rd.contrib ? ` · 贡献+${fmt(rd.contrib)}` : ''}${lines && rd.first ? `<div class="quote">${esc(rv.n)}：“${esc(lines[1])}”</div>` : rd.P > res.S * 0.9 ? `<div class="muted">${SHOCK[step % SHOCK.length]}</div>` : ''}`,
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
        ${res.endRank === 1 && res.startRank > 1 ? `<div class="quote">四海天骄俯首，${esc(st.p.name)}，天下第一！</div>` : ''}`,
      foot: [{ t: '回洞府', gold: true, fn: closeModal }] });
  };
  next();
}
