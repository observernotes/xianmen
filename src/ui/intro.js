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
    ['当夜，荒山破庙。', '一枚生锈的戒指在月光下微微发烫……', '“小家伙，老夫在戒中等了你三千年。”'],
    ['一个废柴的逆天仙途，从此开始。', '三年之约、天剑宗、天骄榜、宗门之巅——', '还有那九九天劫之后的，白日飞升。'],
  ];
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
    box.innerHTML = `<div class="story">${page === 0 ? '<h1>废柴仙途</h1>' : ''}${panel(page)}${ls.map(() => '<p></p>').join('')}<div class="ipager">${lines.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}<p class="hint">点击继续 ▸</p></div></div>`;
    const ps = box.querySelectorAll('p:not(.hint)');
    let li = 0, ci = 0;
    clearInterval(typing);
    typing = setInterval(() => {
      if (li >= ls.length) { clearInterval(typing); typing = null; return; }
      ps[li].textContent = ls[li].slice(0, ++ci);
      if (ci % 2) tone(880, 0, 0.02, 'square', 0.03);
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
  let female = 0;
  const pickName = () => { const a = female ? NAMES_F : NAMES_M; return a[Math.floor(Math.random() * a.length)]; };
  box.innerHTML = `<div class="setup sheet" style="margin:0"><div class="rod"></div><header><h2>踏上仙途</h2></header>
    <div class="body">
      <div class="center"><img class="px" id="setupAv" alt=""></div>
      <label for="inName">姓名</label><div class="row"><input class="txt grow" id="inName" maxlength="6" value="${esc(pickName())}"><button class="btn sm alt" id="rdName" aria-label="随机姓名">换</button></div>
      <div class="row"><span>性别</span><button class="btn sm gold" id="gM">少年</button><button class="btn sm alt" id="gF">少女</button></div>
      <div class="muted">操作很简单：打坐自动涨修为 → 点【历练】打怪拿资源 → 升级洞府、买丹药 → 修为条变金时点它突破。</div>
    </div><div class="foot"><button class="btn gold" id="goStart">踏入仙途</button></div><div class="rod"></div></div>`;
  const inN = box.querySelector('#inName');
  const av = () => {
    const look = { hair: '#2a2230', skin: '#f2c9a0', f: female }, c = ART.portraitMe ? ART.portraitMe(look, 0, 'n') : ART.avatar(look, 0, '#e6e1d3');
    const img = box.querySelector('#setupAv'); img.src = c.toDataURL(); const s2 = pxFit(c.width, 96); img.style.cssText = `width:${s2}px;height:${s2 * c.height / c.width}px`; img.className = 'px pt';
  };
  av();
  box.querySelector('#rdName').onclick = () => { inN.value = pickName(); SFX.tap(); };
  const setG = f => { female = f; box.querySelector('#gM').className = 'btn sm ' + (f ? 'alt' : 'gold'); box.querySelector('#gF').className = 'btn sm ' + (f ? 'gold' : 'alt'); if ((f ? NAMES_M : NAMES_F).includes(inN.value)) inN.value = pickName(); av(); SFX.tap(); };
  box.querySelector('#gM').onclick = () => setG(0);
  box.querySelector('#gF').onclick = () => setG(1);
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
  };
}
