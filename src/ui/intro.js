/* 废柴仙途 · 界面片段 intro：开场与起名
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 开场 ----------
const NAMES_M = ['林逸尘', '沈青川', '陆长风', '叶知秋', '苏念白', '顾清寒', '江离', '温如玉', '秦慕白', '萧云舟'];
const NAMES_F = ['苏清歌', '林晚照', '沈月白', '叶轻舟', '顾念安', '温若雪', '江明月', '秦挽歌'];
function showIntro() {
  const box = $('#intro');
  box.hidden = false;
  $('#modal').hidden = true;
  const lines = [
    ['天剑宗外门。', '“杂灵根也配修仙？滚出山门！”', '你被大师兄赵乾一脚踢下了山。'],
    ['同一天，婚约也被当众撕毁：', '“废物，你配不上慕容家。三年后落霞城论剑，你若敢来，我便让你输得心服口服。”', '“莫欺少年穷！三年之后，我必登台！”'],
    // 原来的第 3 页（破庙、锈戒、“本座等了你三千年”）并进建档后当场播的过场⑪与“破庙第一夜”（talk.js 的 storyStart），这里只留一句引子
    ['当夜，荒山破庙。', '一个废柴的逆天仙途，从这里开始。', '三年之约、天剑宗、天骄榜、宗门之巅——', '还有那九九天劫之后的，白日飞升。'],
  ];
  const PANEL = [0, 1, 2];   // 每页配哪一格开场画：最后一页用破庙那一格
  let page = 0, typing = null;
  // 每一页配一格开场画（ART.introPanel 200×120，整数倍放大；屏幕太窄时退一档）
  const panel = n => {
    if (!ART.introPanel) return '';
    const c = ART.introPanel(n), dpr = window.devicePixelRatio || 1, maxW = Math.min(window.innerWidth - 32, 440);
    let k = Math.max(1, Math.round(dpr * 2)); while (k > 1 && 200 * k / dpr > maxW) k--;
    return `<img class="px ipanel" src="${urlOf(c, 'intro|' + n)}" style="width:${200 * k / dpr}px;height:${120 * k / dpr}px" alt="">`;
  };
  const render = () => {
    const ls = lines[page];
    box.innerHTML = `<div class="story">${page === 0 ? '<h1>废柴仙途</h1>' : ''}${panel(PANEL[page])}${ls.map(() => '<p></p>').join('')}<div class="ipager">${lines.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}<p class="hint">点击继续 ▸</p></div></div>`;
    const ps = box.querySelectorAll('p:not(.hint)');
    let li = 0, ci = 0;
    clearInterval(typing);
    typing = setInterval(() => {
      if (li >= ls.length) { clearInterval(typing); typing = null; return; }
      ps[li].textContent = ls[li].slice(0, ++ci);
      if (ci % 2) SFX.type();
      if (ci >= ls[li].length) { li++; ci = 0; }
    }, 40);
    box.querySelector('.story').onclick = () => {
      ac();
      if (typing) { clearInterval(typing); typing = null; ps.forEach((p, i) => p.textContent = ls[i]); return; }
      page++;
      // 第 2 页（当众退婚）换成高光过场 ①（cine2.js；看过了照旧显示这一页）
      if (page === 1 && typeof introCine === 'function' && introCine(box, () => { page = 2; render(); })) return;
      if (page >= lines.length) setupForm(); else render();
    };
  };
  render();
}
function setupForm() {
  const box = $('#intro');
  const female = 0;   // 主角固定为少年（用户要求：开局只填名字）
  const pickName = () => NAMES_M[Math.floor(Math.random() * NAMES_M.length)];
  box.innerHTML = `<div class="setup sheet" style="margin:0"><div class="rod"></div><header><h2>踏上仙途</h2></header>
    <div class="body">
      <div class="center"><img class="px" id="setupAv" alt=""></div>
      <label for="inName">姓名</label><div class="row"><input class="txt grow" id="inName" maxlength="6" value="${esc(pickName())}"><button class="btn sm alt" id="rdName" aria-label="随机姓名">换</button></div>
    </div><div class="foot"><button class="btn gold" id="goStart">踏入仙途</button></div><div class="rod"></div></div>`;
  const inN = box.querySelector('#inName');
  const av = () => {
    const look = { hair: '#2a2230', skin: '#f2c9a0', f: female }, c = ART.portraitMe ? ART.portraitMe(look, 0, 'n') : ART.avatar(look, 0, '#e6e1d3');
    const img = box.querySelector('#setupAv'); img.src = c.toDataURL(); const s2 = pxFit(c.width, 96); img.style.cssText = `width:${s2}px;height:${s2 * c.height / c.width}px`; img.className = 'px pt';
  };
  av();
  box.querySelector('#rdName').onclick = () => { inN.value = pickName(); SFX.tap(); };
  box.querySelector('#goStart').onclick = () => {
    ac();
    const s = L.newState({ name: inN.value.trim() || pickName(), female });
    L.log(s, `${s.p.name}在荒山破庙中盘膝坐下，仙途由此开始`, 'gold');
    loadState(s);
    box.hidden = true;
    monthAcc = 0;
    SFX.gong();
    banner('废柴仙途', '三年之约 · 倒计时');
    st.guide = { step: 0, done: false }; st.hintSeen = {};
    saveLocal();
    if (typeof storyStart === 'function') storyStart();   // 第一章开章“破庙第一夜”（talk.js）：建档后当场播，播完才开始引导
  };
}
