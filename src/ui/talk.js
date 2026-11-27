/* 废柴仙途 · 界面片段 talk：剧情（docs/STORY_PLAN.md §6、§8、§11）
 * 一、对话场景播放器：带 talk 的事件不走弹窗，走这里——整屏的舞台（200×120 的底图放大铺开，上下用底图自己的颜色接出去，竖屏带倒影），左右两张立绘（关键人物 96×128，其余 48×48 小像），对话框压在最下面一句一句出。
 *     点一下 = 出完这句 / 下一句；长按 0.4 秒 = 快进；【跳过 ▸▸】跳到下一个选项（没有选项就结束，留一句梗概）；【回看】本场说过的话。选项不能跳过。
 *     选完接着播结果里的 talk，再播结果里的过场（cine），最后落到原来的结算卡（events.js 的 choiceResult）。
 *     播的时候停表：和高光过场一样借 cine 变量放哨兵 { cn: true }。在外不播（剧情队列本来就只在洞府放）。
 *     测试：playwright 下默认“快放”——不出画面，带 talk 的事件照旧走弹窗（原有的自动化脚本不用改）；window.__xm_talk = { fast: false } 关掉快放。
 * 二、数据式分镜：CINE_DATA 里一段 = 几个镜头的数据（底图、镜头运动、字幕、特写带、音效），cnFromData 把它变成 cine2 的镜头。⑪～㉝ 都在这里。
 * 三、接线：showChoice 见到 ev.talk 交给播放器；飞升时先过“天门”那场戏（s9_gate），再按 L.endingOf 播结局过场、出结局卡。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 cine2 之后、boot 之前）。 */
// ---------- 一、对话场景播放器 ----------
let tk = null;   // 正在播：{ ev, back, lines, i, root, ... }
const tkFast = () => { const x = window.__xm_talk; if (x && typeof x.fast === 'boolean') return x.fast; return !!navigator.webdriver; };
const TK_NAME = { elder: '老祖', zhao: '赵乾', tian: '楚天阔', xue: '血无涯', yun: '云无极', tianheng: '陆天衡', jian: '凌虚子', dan: '丹云婆婆', dao: '玄微子', teaman: '卖茶翁', xuehe: '血河老祖' };
const tkName = id => (id === 'me' ? st.p.name : id === 'mu' ? st.exName : L.NPCS[id] ? L.npcName(st, id) : TK_NAME[id] || id);
const tkAlt = id => (id === 'su' || id === 'ye' || id === 'mu') && !!st.p.look.f;
// 表情：五种基础表情 + cold（冷）；+ 后面是叠加（泪、血、汗……）。有大立绘（ART.tachie，96×128）的用立绘，没有的退回 48×48 小像（冷 = 平脸 + 眉眼压一层阴影）
function tkFace(who, mood, fx) {
  if (who === 'elder' && st.eflags.st_farewell && !/fade/.test(fx || '')) fx = (fx ? fx + ' ' : '') + 'fade';   // 诀别之后的老祖：只剩余音
  if (ART.tachie) { const c = who === 'me' ? ART.tachieMe(st.p.look, Math.min(st.p.r | 0, 9), mood, fx) : ART.tachie(who, mood, fx, tkAlt(who)); if (c) return c; }
  if (mood === 'cold') { mood = 'n'; fx = (fx ? fx + ' ' : '') + 'shade'; }
  if (who === 'me') { const c = myAvCanvas(undefined, mood); return fx ? ART.portraitX(c, '', fx) : c; }
  if (!ART.hasPortrait || !ART.hasPortrait(who)) return null;
  return ART.portraitX(who, mood, fx || '', tkAlt(who));
}
const tkBg = spec => { const p = String(spec || 'cave').split(':'); return p[0] === 'cg' ? ART.storyCg(p[1], p[2] && /^\d+$/.test(p[2]) ? +p[2] : p[2] || 0) : p[0] === 'end' ? ART.endingPic(p[1]) : ART.storyBg(p[p.length - 1]); };
// 场景自带的气氛：雨、雪、火星、流萤（{ fx: '' } 关掉，{ fx: 'rain' } 换）
const TK_AMB = { temple: 'rain', trib3k: 'storm', grave: 'snow', field: 'ember', blood: 'ember', lantern: 'glow', heaven: 'mote', void: 'mote', herb: 'petal', dusk: 'ember' };
// 一句台词里的记号：*重音*（放大、金色、抖一下）、| 停一拍。返回 [{ ch, em, wait }]
function tkParse(text) {
  const out = []; let em = false;
  for (const ch of text) {
    if (ch === '*') { em = !em; continue; }
    if (ch === '|') { if (out.length) out[out.length - 1].wait = (out[out.length - 1].wait || 0) + 420; continue; }
    out.push({ ch, em, wait: /[。！？…]/.test(ch) ? 230 : /[，、；：—]/.test(ch) ? 110 : 0 });
  }
  return out;
}
const tkPlain = text => text.replace(/[*|]/g, '');
// 把 talk 摊平成一行一行（条件当场判）：台词 { who, mood, fx, name, text, o, echo }；指令 { bg } { sfx } { shake } { flash } { bgm } { wait } { zoom } { amb } { dim } { black }
let tkSlotEv = '';   // 正在摊平的是哪一场（空位按场景 id 取）
function tkFlat(list, out, echo) {
  out = out || [];
  for (const it of list || []) {
    if (Array.isArray(it)) {
      const p = it[0].split(':'), unk = p[0] === '?';
      const mf = unk ? [] : (p[1] || 'n').split('+');
      out.push({ who: unk ? '?' : p[0], mood: mf[0] || 'n', fx: mf.slice(1).join(' '), name: unk ? p[1] : p[2], text: L.fill(st, it[1]), o: it[2] || {}, echo: echo || '' });
      echo = '';
    } else if (it.slot) {   // 共用场景的空位：别的线填了就用填的，没有就用这里的缺省（L.storySlot）
      if (!L.storyCond(st, it.if)) continue;
      const got = tkSlotEv ? L.storySlot(st, tkSlotEv, it.slot, it.max) : [];
      if (got.length) for (const x of got) tkFlat(x.say, out, x.echo || echo); else tkFlat(it.say, out, it.echo || echo);
    } else if (it.say) { if (L.storyCond(st, it.if)) tkFlat(it.say, out, it.echo || echo); }
    else if (it.pick) { const o = it.pick.find(x => L.storyCond(st, x.if)); if (o) tkFlat(o.say, out, o.echo || echo); }
    else if ('black' in it) out.push({ who: 'black', mood: 'n', fx: '', text: L.fill(st, it.black), o: it, echo: '' });
    else if ('cg' in it) out.push({ bg: 'cg:' + it.cg + ':' + (it.f || 0), flash: it.flash });
    else if ('scene' in it) out.push({ bg: it.scene });
    else out.push(Object.assign({ cmd: 1 }, it));   // sfx / shake / flash / bgm / wait / zoom / fx / dim
  }
  return out;
}
// 视口（CSS 像素）与每个 CSS 像素合多少设备像素。大屏上 core.js 给整页加了 zoom，这里折算进去
function tkView() { const q = parseFloat(document.documentElement.style.zoom) || 1; return { vw: window.innerWidth / q, vh: window.innerHeight / q, dpr: (window.devicePixelRatio || 1) * q }; }
const tkGap = T => { const ui = T.root.querySelector('.tk-ui'); return ui.offsetHeight - T.root.querySelector('.tk-box').offsetTop; };   // 对话框上沿到屏幕底
function tkMount() {
  const root = document.createElement('div');
  root.className = 'tk-wrap'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '剧情');
  root.innerHTML = `<div class="tk-stage"><canvas class="tk-cv"></canvas><canvas class="tk-pt l"></canvas><canvas class="tk-pt r"></canvas></div>
    <div class="tk-top"><button class="tk-log" aria-label="回看">回看</button><span class="tk-title"></span><button class="tk-skip" aria-label="跳过">跳过 ▸▸</button></div>
    <div class="tk-ui"><div class="tk-echo" hidden></div><div class="tk-box"><div class="tk-name" hidden></div><div class="tk-text"></div><canvas class="tk-next" width="9" height="8"></canvas><div class="tk-picks" hidden></div></div><div class="tk-hint">点一下继续 · 长按快进</div></div>
    <div class="tk-black" hidden><p></p></div><div class="tk-hist" hidden></div>`;
  applyFrames(root, ['talk', 'talkName', 'talkNameMe', 'talkPick']);   // 跟着当前画质取九宫格（core.js）
  document.body.appendChild(root);
  return root;
}
// 版式：舞台是整屏的一块画布。底图按整数倍放大（竖屏时宽度略超出屏幕、两侧各裁掉一点，横屏时铺到对话框后面），
// 画面以外的地方用底图自己的上沿 / 下沿拉开、压暗、糊掉来接（天接着往上、地接着往下），画面下沿有一段倒影；人物立绘站在对话框上沿，对话框压在最下面。
function tkSize() {
  const T = tk; if (!T) return;
  const V = tkView(), dpr0 = V.dpr, vw = V.vw, vh = V.vh, tall = vh > vw * 1.15;
  const dpr = Math.min(dpr0, Math.sqrt(4.4e6 / (vw * vh)));   // 画布像素封顶（大屏不用全分辨率）
  const box = T.root.querySelector('.tk-box');
  box.style.width = Math.min(vw - 12, 640) + 'px';
  if (!T.picking || !T.baseGap) T.baseGap = tkGap(T);   // 对话框（两行字时）上沿到屏幕底
  const baseTop = vh - T.baseGap;
  let P = tall ? Math.round(vw * dpr / 200 * 1.1) : Math.round(Math.min(vw * dpr / 200, (baseTop + 40) * dpr / 120));
  if (tall && 200 * P > vw * dpr * 1.2) P--;
  P = Math.max(1, P);
  const Wl = Math.ceil(vw * dpr / P), Hl = Math.ceil(vh * dpr / P), cv = T.cv;
  cv.width = Wl * P; cv.height = Hl * P; cv.style.width = (Wl * P / dpr) + 'px'; cv.style.height = (Hl * P / dpr) + 'px';
  // 立绘：一个像素放大 kp 个设备像素。宽不过屏宽的 56%，高不过对话框以上的三分之二
  const kp = Math.max(1, Math.min(Math.round(P * dpr0 / dpr), Math.floor(0.66 * baseTop * dpr0 / 128), Math.floor(0.56 * vw * dpr0 / 96)));
  const ptH = 128 * kp / dpr0, topL = tall ? Math.ceil(54 * dpr / P) : 0, lim = (baseTop + 14 - ptH * 0.8) * dpr / P;   // 人物肩线以上留给画面
  const py = tall ? Math.round(topL + Math.max(0, lim - topL - 120) * 0.45) : Math.max(0, Math.min(Hl - 120, Math.round(((baseTop + 30) * dpr / P - 120) / 2)));
  const ext = tall ? Math.max(0, Math.min(26, py - topL + 6)) : Math.min(py, 20);
  // 关键画面（cg / end）时立绘多半不在：画面往下挪到顶条与对话框的正中偏上，推近时能长得更高
  const pyC = tall ? Math.round(topL + Math.max(0, baseTop * dpr / P - topL - 120) * 0.4) : py, extC = tall ? Math.max(0, Math.min(40, pyC - topL + 6)) : ext;
  T.G = { P, Wl, Hl, dpr, kp, py, tall, ext, pyN: py, extN: ext, pyC, extC }; T.pyc = undefined;
  T.root.style.setProperty('--tk-pt-b', (tall ? T.baseGap - 14 : 0) + 'px'); T.root.style.setProperty('--tk-cast', Math.max(0, (vw - (tall ? 900 : 1040)) / 2) + 'px');
  T.ambC = null; T.ambPrev = null;
  tkDraw();
}
// 画面以外的那一层：底图上沿 14 行拉到屏幕顶、下沿 14 行拉到屏幕底，缩小再放大糊开，压暗（越靠上下两头越暗）
// 取样按底图的实际尺寸换算（bx / by：每个逻辑像素几个底图像素）：底图换成 400×240 的高清版（docs/ART_HD2D.md §6-6）也取同一块
function tkAmbient(bg, G) {
  const q = 6, aw = Math.max(8, Math.ceil(G.Wl / q)), ah = Math.max(8, Math.ceil(G.Hl / q)), a = cnCv(aw, ah), g = a.getContext('2d'), t = cnCv(Math.ceil(aw / 2), Math.ceil(ah / 2)), tg = t.getContext('2d');
  const k = 1 / q / 2, x0 = (G.Wl - 200) / 2 * k, w = 200 * k, y0 = G.py * k, y1 = (G.py + 120) * k, H = t.height, bx = (bg.width || 200) / 200, by = (bg.height || 120) / 120;
  tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
  tg.drawImage(bg, 0, 0, bx, 120 * by, 0, 0, t.width, H); tg.drawImage(bg, 0, 0, 200 * bx, 14 * by, x0, 0, w, y0 + 0.5); tg.drawImage(bg, 0, 106 * by, 200 * bx, 14 * by, x0, y1 - 0.5, w, H - y1 + 0.5); tg.drawImage(bg, x0, y0, w, y1 - y0);
  if (x0 > 0) { tg.drawImage(bg, 0, 0, 6 * bx, 120 * by, 0, 0, x0 + 0.5, H); tg.drawImage(bg, 194 * bx, 0, 6 * bx, 120 * by, x0 + w - 0.5, 0, t.width - x0 - w + 0.5, H); }
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(t, 0, 0, aw, ah);
  g.fillStyle = 'rgba(7,5,12,.42)'; g.fillRect(0, 0, aw, ah);
  const gr = g.createLinearGradient(0, 0, 0, ah), u0 = G.py / G.Hl, u1 = (G.py + 120) / G.Hl;
  gr.addColorStop(0, 'rgba(7,5,12,.7)'); gr.addColorStop(Math.max(0.01, u0), 'rgba(7,5,12,0)'); gr.addColorStop(Math.min(0.98, u1), 'rgba(7,5,12,.12)'); gr.addColorStop(Math.min(0.99, u1 + (1 - u1) * 0.55), 'rgba(7,5,12,.62)'); gr.addColorStop(1, 'rgba(7,5,12,.9)');
  g.fillStyle = gr; g.fillRect(0, 0, aw, ah);
  return a;
}
// 镜头：从现在的位置缓动到 to（三次缓入缓出），ms 不写时推近 650、拉回 850
const tkEase = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
function tkCamNow(T, now) { const u = tkEase(cnClamp((now - T.camT0) / T.camMs, 0, 1)), A = T.camA, B = T.camB; return { z: A.z + (B.z - A.z) * u, x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }; }
function tkCam(to, ms) { const T = tk, now = performance.now(); T.camA = tkCamNow(T, now); T.camB = to; T.camT0 = now; T.camMs = ms || (to.z >= T.camA.z ? 650 : 850); T.zoom = to.z; T.zx = to.x; T.zy = to.y; }
// 气氛粒子：铺满整屏（按屏高加量）
function tkParticles(g, a, t, W, H) {
  const m = Math.min(4, H / 120);
  if (a === 'rain' || a === 'storm') { const st0 = a === 'storm', n = Math.round((st0 ? 46 : 22) * m), len = st0 ? 6 : 4; g.fillStyle = st0 ? 'rgba(200,224,255,.5)' : 'rgba(200,212,255,.28)'; for (let i = 0; i < n; i++) { const y = (i * 37 + t * (st0 ? 260 : 170) + i * i) % (H + 12) - 6, x = ((i * 53 + t * 40) % (W + 40)) - 5 - y * 0.12; g.fillRect(Math.round(x), Math.round(y), 1, len + (i % 3 === 0 ? 2 : 0)); } }
  else if (a === 'snow') { const n = Math.round(34 * m); for (let i = 0; i < n; i++) { const y = (i * 29 + t * (9 + i % 5 * 3)) % (H + 6) - 3, x = (i * 61 + Math.sin(t * 0.8 + i) * 6 + W * 8) % W; g.fillStyle = i % 3 ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.45)'; g.fillRect(Math.round(x), Math.round(y), i % 4 ? 1 : 2, i % 7 ? 1 : 2); } }
  else if (a === 'ember' || a === 'mote' || a === 'glow' || a === 'petal') {
    const col = a === 'ember' ? ['#ffb23f', '#ff7a5a'] : a === 'glow' ? ['#ffd86a', '#ffb23f'] : a === 'petal' ? ['#f6a0c0', '#ffffff'] : ['#ffffff', '#c8b8e8'], n = Math.round(20 * m);
    for (let i = 0; i < n; i++) { const u = (t * (0.05 + i % 4 * 0.02) + i * 0.137) % 1, x = (i * 47 + Math.sin(t * 0.6 + i * 2) * 8 + W * 8) % W, y = a === 'petal' ? u * (H + 4) - 2 : H + 2 - u * (H + 4); g.globalAlpha = 0.25 + 0.6 * Math.sin(u * Math.PI); g.fillStyle = col[i % 2]; g.fillRect(Math.round(x), Math.round(y), i % 5 === 0 ? 2 : 1, i % 5 === 0 && a !== 'petal' ? 2 : 1); }
    g.globalAlpha = 1;
  }
}
// 舞台：每帧画（立绘是另外两块画布，只在换人时画）
function tkStage(now) {
  const T = tk; if (!T) return;
  const G = T.G, cv = T.cv, g = cv.getContext('2d'), P = G.P, Wl = G.Wl, Hl = G.Hl, cw = cv.width, ch = cv.height;
  const dt = Math.min(100, now - (T.last || now)); T.last = now;
  if (T.zoom !== T.camB.z || T.zx !== T.camB.x || T.zy !== T.camB.y) tkCam({ z: T.zoom || 1, x: T.zx, y: T.zy });   // 别处直接改了镜头目标（跳过时拉回）
  const cam = tkCamNow(T, now), z = Math.max(1, cam.z); T.zc = z;
  let bg = null; try { bg = tkBg(T.bg); } catch (e) { bg = null; }
  if (T.bgSeen !== T.bg) { T.bgPrev = T.bgC; T.ambPrev = T.ambC; T.ambC = null; T.bgSeen = T.bg; T.bgAt = T.bgPrev ? now : -9999; }   // 换底图：叠化 0.3 秒
  T.bgC = bg;
  const cgm = /^(cg|end):/.test(T.bg), pyT = cgm ? G.pyC : G.pyN; G.ext = cgm ? G.extC : G.extN;
  T.pyc = T.pyc === undefined ? pyT : T.pyc + (pyT - T.pyc) * (1 - Math.exp(-dt / 160)); if (Math.abs(pyT - T.pyc) < 0.2) T.pyc = pyT;
  G.py = Math.round(T.pyc * P) / P;
  if (!T.ambC && bg) T.ambC = tkAmbient(bg, Object.assign({}, G, { py: pyT }));
  const xf = cnClamp((now - T.bgAt) / 300, 0, 1); if (xf >= 1) { T.bgPrev = null; T.ambPrev = null; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#07050c'; g.fillRect(0, 0, cw, ch);
  g.imageSmoothingEnabled = true;
  if (T.ambPrev) g.drawImage(T.ambPrev, 0, 0, cw, ch);
  if (T.ambC) { g.globalAlpha = T.ambPrev ? xf : 1; g.drawImage(T.ambC, 0, 0, cw, ch); g.globalAlpha = 1; }
  const amb = T.ambC, strip = (yL, hL, al) => { if (!amb || al <= 0) return; const k = amb.height / Hl; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, al); g.drawImage(amb, 0, yL * k, amb.width, hL * k, 0, Math.round(yL * P), cw, Math.round(hL * P)); g.globalAlpha = 1; g.imageSmoothingEnabled = false; g.setTransform(P, 0, 0, P, 0, 0); };
  g.imageSmoothingEnabled = false; g.setTransform(P, 0, 0, P, 0, 0);
  // 画面：推近时上下多露出一截（ext），不是只在原来的框里放大
  const snap = v => Math.round(v * P) / P, ext = Math.min(G.ext, 60 * (z - 1)), wy0 = snap(G.py - ext), wh = snap(120 + ext * 2), pw = 200 * z, ph = 120 * z;
  const left = snap(pw <= Wl ? (Wl - pw) / 2 : cnClamp(Wl / 2 - cam.x * z, Wl - pw, 0)), top = snap(ph <= wh ? wy0 + (wh - ph) / 2 : cnClamp(G.py + 60 - cam.y * z, wy0 + wh - ph, wy0)), yb = wy0 + wh;
  const pic = (img, al) => { if (img) { g.globalAlpha = al; g.drawImage(img, left, top, pw, ph); g.globalAlpha = 1; } };
  g.save(); g.beginPath(); g.rect(0, wy0, Wl, wh); g.clip(); if (T.bgPrev) pic(T.bgPrev, 1); pic(bg, T.bgPrev ? xf : 1); g.restore();
  if (G.tall && bg) {
    // 倒影：画面沿下沿翻下去一段，越往下越融进底色
    const rh = Math.min(48, Hl - yb);
    if (rh > 4) { g.save(); g.beginPath(); g.rect(0, yb, Wl, rh); g.clip(); g.translate(0, 2 * yb); g.scale(1, -1); pic(bg, 0.55); g.restore(); const n = 8; for (let i = 0; i < n; i++) strip(yb + rh * i / n, rh / n, 0.28 + 0.72 * (i + 1) / n); g.fillStyle = 'rgba(7,5,12,.5)'; g.fillRect(0, yb, Wl, 1 / P * Math.max(1, Math.round(P / 3))); }
    for (let i = 0; i < 4; i++) strip(wy0 + i * 1.5, 1.5, 0.8 - i * 0.2);
  }
  // 电影黑边（{ bars: 1 }）：压在画面上下两头
  T.bars += (T.barsT - T.bars) * (1 - Math.exp(-dt / 140)); if (Math.abs(T.barsT - T.bars) < 0.004) T.bars = T.barsT;
  if (T.bars > 0.01) { const bh = snap(11 * T.bars); g.fillStyle = '#07050c'; g.fillRect(0, wy0, Wl, bh); g.fillRect(0, yb - bh, Wl, bh); }
  // 气氛
  const a = T.amb === undefined ? TK_AMB[String(T.bg).split(':').pop()] || (/^cg:(stab|fade)/.test(T.bg) ? 'storm' : '') : T.amb;
  // 雨分层（docs/ART_HD2D.md §6-10）：这一场有没有雨、多大，告诉 HD2D 的气氛层（stageFx 返回对象的 o.rain，舞台上也记一份 data-rain）；
  // 气氛层自己画远近三层雨丝（HD2D.stageRain 为真）时，这里那层平的雨就不画了，否则照旧画
  const rain = a === 'rain' || a === 'storm' ? a : '';
  if (T.rain !== rain) { T.rain = rain; if (T.hdfx && T.hdfx.o) T.hdfx.o.rain = rain; T.root.querySelector('.tk-stage').dataset.rain = rain; }
  if (a && !(rain && T.hdfx && HDX && HDX.stageRain && HDX.q >= 1)) tkParticles(g, a, now / 1000, Wl, Hl);
  T.dim += (T.dimT - T.dim) * (1 - Math.exp(-dt / 150)); if (Math.abs(T.dimT - T.dim) < 0.004) T.dim = T.dimT;
  if (T.dim > 0.01) { g.globalAlpha = Math.min(0.9, T.dim); g.fillStyle = '#07050c'; g.fillRect(0, 0, Wl, Hl); g.globalAlpha = 1; }
  const f = now - T.flashAt; if (f < 420) { const u = 1 - f / 420; g.globalAlpha = u * u; g.fillStyle = T.flashCol || '#ffffff'; g.fillRect(0, 0, Wl, Hl); g.globalAlpha = 1; }
  T.root.querySelector('.tk-stage').classList.toggle('dimmed', T.dimT >= 0.3);
  requestAnimationFrame(tkStage);
}
function tkFlash(col) { const T = tk; if (!T) return; T.flashAt = performance.now(); T.flashCol = col || '#ffffff'; const s = T.root.querySelector('.tk-stage'); s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }
function tkShakeNow(n) { const T = tk; if (!T) return; const s = T.root.querySelector('.tk-stage'); s.style.setProperty('--tk-amp', (n || 4) * 1.5 + 'px'); s.classList.remove('shake'); void s.offsetWidth; s.classList.add('shake'); }
function tkSfx(n) { try { (CSFX[n] || (() => {}))(); } catch (e) { /* 没声音就算了 */ } }
function tkBgm(k) { if (k === '' || k === 0) BGM.play('', { while: () => !!tk }); else if (k) BGM.play(k, { while: () => !!tk }); }
// 立绘：换人、换表情时重画；说话的亮、靠前并跳一下，不说的暗、退后半步；loud 的那句抖。有大立绘的 96×128，没有的是 48×48 小像（放大一倍半）
function tkDraw(hop) {
  const T = tk; if (!T) return;
  const cg = /^(cg|end):/.test(T.bg), ln = T.cur || {}, dpr = tkView().dpr, kp = (T.G && T.G.kp) || 1;
  [['l', T.left], ['r', T.right]].forEach(([side, f], i) => {
    const c = T.pts[i], on = !!f && ((side === 'l') === (ln.who === 'me')) && !!ln.who && ln.who !== 'nar' && ln.who !== 'black';
    const show = !!f && (!cg || on) && ln.who !== 'black';
    const was = !c.hidden; c.hidden = !show; if (!show) return;
    const w = f.c.width, h = f.c.height, big = h > 48, sc = big ? kp : Math.max(1, Math.round(kp * 1.5));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.style.width = (w * sc / dpr) + 'px'; c.style.height = (h * sc / dpr) + 'px';
    const pg = c.getContext('2d'); pg.imageSmoothingEnabled = false; pg.clearRect(0, 0, w, h);
    if (side === 'r' && f.who !== 'me') { pg.save(); pg.translate(w, 0); pg.scale(-1, 1); pg.drawImage(f.c, 0, 0); pg.restore(); } else pg.drawImage(f.c, 0, 0);
    c.classList.toggle('on', on); c.classList.toggle('big', big);
    if (hop && on) { const cls = !was || f.fresh ? 'in' : ln.o && ln.o.loud ? 'rage' : f.c !== f.last ? 'hop' : 'nod'; f.fresh = false; c.classList.remove('in', 'hop', 'rage', 'nod'); void c.offsetWidth; c.classList.add(cls); }
    f.last = f.c;
  });
}
// 选项出来时对话框长高：立绘跟着站到它的上沿（选完落回去）
function tkLift(on) { const T = tk; if (!T || !T.G || !T.G.tall) return; const V = tkView(), vh = V.vh, gap = on ? tkGap(T) : T.baseGap, ptH = 128 * T.G.kp / V.dpr; T.root.style.setProperty('--tk-pt-b', (Math.max(T.baseGap, Math.min(gap, vh - ptH - 40)) - 14) + 'px'); }
function tkCmd(x) {
  const T = tk;
  if (x.bg) { T.bg = x.bg; T.amb = undefined; if (x.flash) tkFlash(); }
  if (x.sfx) tkSfx(x.sfx);
  if (x.shake) tkShakeNow(x.shake);
  if (x.cmd && x.flash) tkFlash(typeof x.flash === 'string' ? x.flash : '');
  if ('bgm' in x) tkBgm(x.bgm);
  if ('zoom' in x) tkCam(x.zoom ? { z: x.zoom, x: x.x !== undefined ? x.x : T.zx, y: x.y !== undefined ? x.y : T.zy } : { z: 1, x: 100, y: 60 }, x.ms);
  if ('fx' in x) T.amb = x.fx;
  if ('dim' in x) T.dimT = x.dim;
  if ('bars' in x) T.barsT = x.bars ? 1 : 0;
}
// 出一行：指令不占一句（wait 除外：停那么久再往下），接着出下一行
function tkShow(i) {
  const T = tk; if (!T) return;
  clearTimeout(T.tm); clearTimeout(T.ffT);
  while (i < T.lines.length && T.lines[i].text === undefined) {
    const x = T.lines[i++]; tkCmd(x);
    if (x.wait && !T.ff && !T.skipping) { T.i = i; T.full = false; T.waiting = true; T.tm = setTimeout(() => { if (tk === T) { T.waiting = false; tkShow(i); } }, x.wait); return; }
  }
  T.i = i; T.waiting = false;
  if (i >= T.lines.length) { tkDraw(); T.after(); return; }
  const ln = T.lines[i], o = ln.o || {}; T.cur = ln;
  if (ln.who === 'me') { const fresh = !T.left; T.left = { who: 'me', c: tkFace('me', ln.mood, ln.fx), fresh }; }
  else if (ln.who !== 'nar' && ln.who !== 'black') { const c = ln.who === '?' ? null : tkFace(ln.who, ln.mood, ln.fx), fresh = !T.right || T.right.who !== ln.who; T.right = c ? { who: ln.who, c, fresh } : null; if (!T.left) T.left = { who: 'me', c: tkFace('me', 'n', ''), fresh: true }; }
  const root = T.root, nm = root.querySelector('.tk-name'), bk = root.querySelector('.tk-black'), black = ln.who === 'black';
  const tx = black ? bk.querySelector('p') : root.querySelector('.tk-text');
  bk.hidden = !black; if (black) { bk.classList.remove('in'); void bk.offsetWidth; bk.classList.add('in'); }
  nm.hidden = ln.who === 'nar' || black; nm.textContent = nm.hidden ? '' : ln.name || tkName(ln.who); nm.classList.toggle('me', ln.who === 'me');
  if (!black) { tx.className = 'tk-text' + (ln.who === 'nar' ? ' nar' : '') + (o.loud ? ' loud' : '') + (o.soft ? ' soft' : ''); }
  tx.textContent = '';
  // 这一句自带的演出
  if (o.sfx) tkSfx(o.sfx);
  if (o.flash) tkFlash(typeof o.flash === 'string' ? o.flash : '');
  if (o.shake || o.loud) tkShakeNow(o.shake || 3);
  if ('bgm' in o) tkBgm(o.bgm);
  if ('zoom' in o) tkCmd({ zoom: o.zoom, x: o.x !== undefined ? o.x : ln.who === 'me' ? 50 : ln.who === 'nar' ? 100 : 150, y: o.y !== undefined ? o.y : 70, ms: o.ms });
  if ('dim' in o) T.dimT = o.dim;
  if ('fx' in o) T.amb = o.fx;
  if ('bars' in o) T.barsT = o.bars ? 1 : 0;
  const ec = root.querySelector('.tk-echo'); ec.hidden = !ln.echo; if (ln.echo) { ec.innerHTML = `<img class="px" src="${urlOf(ART.icon('echo'), 'ic|echo')}" alt="">因为：${esc(ln.echo)}`; ec.classList.remove('in'); void ec.offsetWidth; ec.classList.add('in'); SFX.bell(); }
  T.hist.push(ln); T.typed = 0; T.full = false; root.querySelector('.tk-next').style.visibility = 'hidden';
  const toks = tkParse(ln.text), base = o.slow ? 85 : o.fast ? 14 : black ? (o.auto ? 48 : 64) : 30;
  const chB = k => `<span class="tk-ch${k.em ? ' em' : ''}">${esc(k.ch)}</span>`;   // 黑屏字幕：一个字一个字淡着落下来
  const html = n => { let h = '', open = false; for (let j = 0; j < n; j++) { const k = toks[j]; if (k.em && !open) { h += '<em>'; open = true; } if (!k.em && open) { h += '</em>'; open = false; } h += esc(k.ch); } return h + (open ? '</em>' : ''); };
  T.finish = () => { clearTimeout(T.tm); if (black) { for (; T.typed < toks.length; T.typed++) tx.insertAdjacentHTML('beforeend', chB(toks[T.typed])); } else { T.typed = toks.length; tx.innerHTML = html(toks.length); } T.full = true; if (!black) root.querySelector('.tk-next').style.visibility = ''; if (T.ff) T.ffT = setTimeout(() => { if (tk === T && T.ff) tkShow(T.i + 1); }, 140); else if (black && ln.o && ln.o.auto) T.ffT = setTimeout(() => { if (tk === T && T.i === i) tkShow(i + 1); }, ln.o.auto); };
  const step = () => {
    if (tk !== T) return;
    if (T.ff) { T.finish(); return; }
    if (T.typed >= toks.length) { T.finish(); return; }
    const k = toks[T.typed++]; if (black) tx.insertAdjacentHTML('beforeend', chB(k)); else tx.innerHTML = html(T.typed);
    if (T.typed % 3 === 1 && !/\s/.test(k.ch)) SFX.type();
    if (k.em && (T.typed === 1 || !toks[T.typed - 2].em)) { tkShakeNow(2); }
    if (T.typed >= toks.length) { T.tm = setTimeout(() => { if (tk === T && T.i === i && !T.full) T.finish(); }, 60); return; }   // 最后一个字不再等标点的那一拍
    T.tm = setTimeout(step, base + (k.wait || 0));
  };
  const swap = !black && ln.who !== 'nar' && T.spk !== ln.who; if (!black && ln.who !== 'nar') T.spk = ln.who;
  tkDraw(true);
  T.tm = setTimeout(step, black ? (o.auto ? 240 : 420) : swap ? 170 : 60);   // 换人说话先让立绘站定一拍
}
function tkTap() {
  const T = tk; if (!T || T.picking || T.histOn || T.locked) return;
  if (T.waiting) { clearTimeout(T.tm); T.waiting = false; tkShow(T.i); return; }
  if (!T.full) { if (T.finish) T.finish(); return; }
  SFX.tap(); tkShow(T.i + 1);
}
// 选项。关键抉择：先静一拍（音乐压下去、舞台暗下来、两声心跳），选项一个一个浮上来；选完当场有回响（闪白 + 黑屏一句你选的话）
function tkPicks() {
  const T = tk, ev = T.ev, box = T.root.querySelector('.tk-picks');
  T.picking = true; T.ff = false; clearTimeout(T.tm); clearTimeout(T.ffT);
  T.root.querySelector('.tk-next').style.visibility = 'hidden'; T.root.querySelector('.tk-hint').textContent = '';
  const picks = (st.meta && st.meta.picks && st.meta.picks[ev.id]) || {}, luck = L.choiceLuck(st);
  const key = ev.choices.some(c => c.key);
  box.innerHTML = ev.choices.map((c, i) => {
    const g = L.choiceGate(st, c), shown = L.choiceShown(st, c);
    if (!shown && g.ok) return '';   // need / not 不满足的照旧不显示；只有“有条件的选项”灰着给人看
    const can = shown && L.costOk(st, c.cost), bits = [];
    if (!g.ok) bits.push(g.why); else if (c.hint) bits.push(c.hint);
    if (c.cost) bits.push(L.costText(st, c.cost));
    if (c.duel && g.ok) { const cf = L.choiceFoe ? L.choiceFoe(st, ev, c) : null, foe = cf ? cf.foe : { kind: 'event', id: ev.id }; bits.push('胜算 ' + L.pct(L.duelP(st, L.duelPower(st, foe), cf ? cf.Q : L.power(st) * c.duel, foe))); }
    else if (c.p !== undefined) bits.push('把握 ' + L.pct(Math.min(0.95, c.p + luck)));
    return `<button class="tk-pick${c.key ? ' key' : ''}" data-c="${i}" ${can ? '' : 'disabled'}>${c.key ? `<img class="px" src="${urlOf(ART.icon('branch'), 'ic|branch')}" alt="">` : ''}<span>${esc(L.fill(st, c.t))}${picks[i] ? '<i class="tk-dot" title="上一世选过"></i>' : ''}</span><small>${esc(bits.join(' · '))}</small></button>`;
  }).join('');
  [...box.querySelectorAll('.tk-pick')].forEach((b, j) => { b.style.animationDelay = (j * 110) + 'ms'; });
  const lead = key && !T.skipping ? 1100 : 0;
  if (key) { bgmDuck(lead / 1000 + 2.2, 0.12); T.dimT = 0.5; if (lead) { SFX.heart(); setTimeout(() => { if (tk === T) SFX.heart(); }, 560); } }
  const open = () => { if (tk !== T) return; box.hidden = false; T.root.classList.add('picking'); tkLift(true); if (key) { T.root.classList.add('keypick'); SFX.drum(); } else SFX.reveal(2); T.t0 = performance.now(); };
  if (lead) setTimeout(open, lead); else open();
  box.querySelectorAll('button[data-c]').forEach(b => b.onclick = e => {
    e.stopPropagation(); if (performance.now() - (T.t0 || 0) < 600 || b.disabled) return;   // 刚出来的 0.6 秒不可点（防连点误触）
    const ci = +b.dataset.c, c = ev.choices[ci];
    const res = L.resolveChoice(st, ev, ci); if (!res) return;
    const br = c[res.ok ? 'ok' : 'fail'] || c.ok || {};
    box.hidden = true; T.picking = false; T.root.classList.remove('picking', 'keypick'); tkLift(false); T.root.querySelector('.tk-hint').textContent = '点一下继续 · 长按快进'; T.dimT = 0; T.skipping = false;
    const fin = () => { const back = T.back; tkClose(); const card = () => choiceResult(ev, res, back || closeModal); const bc = br.cine && String(br.cine).replace('{daolv}', st.daolv || 'su');   /* 'jieqi_{daolv}'：按道侣取版本 */ if (bc && !res.duel) cnAfter(playCine(bc, {}), card); else if (bc) choiceResult(ev, res, () => { (back || closeModal)(); cineWant(bc, {}); }); else card(); };
    // 当场的回响：关键抉择闪一下，黑屏上落一句你选的话，再接结果里的台词
    const lines = tkFlat(br.talk || []);
    if (c.key) { SFX.clang(); tkFlash(); lines.unshift({ who: 'black', mood: 'n', fx: '', text: '—— ' + tkPlain(L.fill(st, c.t)).replace(/^“|”$/g, ''), o: { auto: 1100 }, echo: '' }); } else SFX.tap();
    if (lines.length) { T.lines = lines; T.after = fin; tkShow(0); } else fin();
  });
}
function tkHist() {
  const T = tk; if (!T) return; const h = T.root.querySelector('.tk-hist');
  T.histOn = !T.histOn; h.hidden = !T.histOn;
  if (T.histOn) h.innerHTML = '<div class="tk-hh">回看（点任意处关闭）</div>' + T.hist.map(l => `<p class="${l.who === 'nar' || l.who === 'black' ? 'nar' : ''}">${l.who === 'nar' || l.who === 'black' ? '' : `<b>${esc(l.name || tkName(l.who))}</b>　`}${esc(tkPlain(l.text))}</p>`).join('');
  if (T.histOn) h.scrollTop = h.scrollHeight;
}
function tkClose() {
  const T = tk; if (!T) return;
  tk = null; clearTimeout(T.tm); clearTimeout(T.hold); clearTimeout(T.ffT); T.root.remove();
  if (cine && cine.tk) cine = T.prevCine || null;
  BGM.auto();
  if (st) { saveLocal(); updateHUD(); }
}
// 播一场。ev：带 talk 的事件；back：结算卡【继续】之后回到哪
function playTalk(ev, back) {
  if (tk) tkClose();
  tkSlotEv = ev.id;
  const root = tkMount();
  // HD-2D 气氛层：自己先挂上（拿到句柄好传雨），不等模块的 MutationObserver；画质 < 1 时不挂，与原来一样
  const hdfx = HDX && HDX.q >= 1 && HDX.stageFx ? HDX.stageFx(root.querySelector('.tk-stage'), root.querySelector('.tk-cv'), { z: 2 }) : null;
  tk = { ev, back, root, hdfx, rain: undefined, cv: root.querySelector('.tk-cv'), pts: [root.querySelector('.tk-pt.l'), root.querySelector('.tk-pt.r')], lines: tkFlat(ev.talk), i: 0, hist: [], bg: ev.scene || 'cave', left: null, right: null, prevCine: cine, k: 1,
    zoom: 1, zc: 1, zx: 100, zy: 60, dim: 1, dimT: 0, flashAt: -9999, amb: undefined,
    camA: { z: 1, x: 100, y: 60 }, camB: { z: 1, x: 100, y: 60 }, camT0: 0, camMs: 1, bars: 0, barsT: 0, bgAt: -9999 };
  const T = tk;
  cine = { cn: true, tk: true, t: 0 };   // 停表、挡住弹窗队列（与高光过场同一个哨兵）
  $('#tip').hidden = true;
  root.querySelector('.tk-title').textContent = L.fill(st, ev.title);
  if (ev.bgm) BGM.play(ev.bgm, { while: () => !!tk });
  { const c = ART.talkNext(0), g = root.querySelector('.tk-next').getContext('2d'); g.drawImage(c, 0, 0); }
  T.after = () => tkPicks();
  root.querySelector('.tk-skip').onclick = e => { e.stopPropagation(); if (!tk || T.picking || T.locked) return; SFX.tap(); clearTimeout(T.tm); clearTimeout(T.ffT); T.ff = false; T.skipping = true; T.waiting = false;
    for (let j = T.i; j < T.lines.length; j++) { const x = T.lines[j]; if (x.text === undefined) tkCmd(Object.assign({}, x, { sfx: '', shake: 0, flash: 0 })); else if (j > T.i) T.hist.push(x); }
    T.i = T.lines.length; T.cur = { who: 'nar' }; root.querySelector('.tk-black').hidden = true; T.zoom = 1;
    if (ev.gist && T.after !== null) { root.querySelector('.tk-name').hidden = true; const tx = root.querySelector('.tk-text'); tx.className = 'tk-text nar'; tx.textContent = '（' + L.fill(st, ev.gist) + '）'; }
    tkDraw(); T.after(); };
  root.querySelector('.tk-log').onclick = e => { e.stopPropagation(); SFX.tap(); tkHist(); };
  root.querySelector('.tk-hist').onclick = e => { e.stopPropagation(); tkHist(); };
  for (const b of root.querySelectorAll('.tk-top button')) b.addEventListener('pointerdown', e => e.stopPropagation());
  root.querySelector('.tk-picks').addEventListener('pointerdown', e => e.stopPropagation());
  root.addEventListener('pointerdown', () => { if (!tk || T.picking || T.histOn) return; T.down = performance.now(); clearTimeout(T.hold); T.hold = setTimeout(() => { if (tk === T && T.down) { T.ff = true; if (T.waiting) { clearTimeout(T.tm); T.waiting = false; tkShow(T.i); } else if (T.full) tkShow(T.i + 1); else if (T.finish) T.finish(); } }, 400); });
  root.addEventListener('pointerup', () => { if (!tk) return; const was = T.ff; T.ff = false; clearTimeout(T.hold); clearTimeout(T.ffT); if (T.down && !was) tkTap(); T.down = 0; });
  root.addEventListener('pointercancel', () => { if (tk) { T.down = 0; T.ff = false; clearTimeout(T.hold); } });
  root.addEventListener('click', e => e.stopPropagation());
  tkSize();
  requestAnimationFrame(tkStage);
  tkShow(0);
}
window.addEventListener('resize', () => { if (tk) tkSize(); });
document.addEventListener('keydown', e => { if (!tk || tk.picking) return; if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tkTap(); } });
// 带 talk 的事件交给播放器；开场前的过场（ev.cine）先播
{ const sc0 = showChoice; showChoice = function (ev, back) {
  if (!ev || !st || !ev.talk || tkFast()) return sc0.apply(this, arguments);
  if (!$('#modal').hidden) closeModal();
  if (ev.cine) cnAfter(playCine(ev.cine, {}), () => playTalk(ev, back)); else playTalk(ev, back);
}; }
// 解锁卡、章末卡和剧情的先后全由结算链定（settle.js 的 chainPump：结算卡 → 剧情 → 章末卡 → 下一章 → 解锁卡），解锁卡永远不挡剧情（AP_PLAN §4.2）
if (typeof onbPump === 'function') { const op0 = onbPump; onbPump = function () { if (tk) return; return op0.apply(this, arguments); }; }
// 剧情线加的几个音效名（分镜与对话里按名字调）
Object.assign(CSFX, { heart: () => SFX.heart(), slash: () => SFX.slash(), sting: () => SFX.sting(), fire: () => SFX.fire(), tap: () => SFX.tap(), boom: () => SFX.boom(), shine: () => SFX.shine(), whoosh: () => SFX.whoosh() });

// ---------- 二、数据式分镜 ----------
// 一段：{ n 名字, no 序号, bgm, thumb 底图写法, shots: [ 镜头 ] }
// 镜头：{ bg 底图写法（'temple' 这样的 storyBg / cineBg kind，'cg:stab:1'，'end:shitu'，'bd:summit'）, frames: [[ms, bg]] 中途换图, ms, cam: 'push' | 'pull' | 'panR' | 'panL' | 'panUp' | 'panDown' | 'hold',
//         sub 字幕（≤ 12 字）, cut / cut2: { who, mood, fx, side: 'l' | 'r', col, y, at }, dim 压暗, tint 罩色, flash: [ms] 闪白, lines 集中线色, seal 盖印, sfx: [[ms, 名]], shake: [[ms, 持续, 幅度]], if 条件（不满足就没有这一镜） }
const CN_CAM = {
  hold: () => ({ x: 100, y: 60, z: 1 }), push: u => ({ x: 100, y: 60, z: 1 + 0.35 * u }), pull: u => ({ x: 100, y: 60, z: 1.35 - 0.35 * u }),
  panR: u => ({ x: 70 + 60 * u, y: 60, z: 1.3 }), panL: u => ({ x: 130 - 60 * u, y: 60, z: 1.3 }), panUp: u => ({ x: 100, y: 78 - 36 * u, z: 1.3 }), panDown: u => ({ x: 100, y: 42 + 36 * u, z: 1.3 }),
};
const cnBgOf = spec => { const p = String(spec).split(':'); return p[0] === 'bd' ? ART.backdrop(p[1]) : tkBg(spec); };
const CN_COL = { me: '#d8404a', elder: '#f4c542', mu: '#4aa8ff', mo: '#55506e', tianheng: '#aeb8c8', xue: '#c8323c', yun: '#8ab4e8', su: '#4ccb9f', ye: '#a81e3a', tian: '#4aa8ff', zhao: '#aeb8c8' };
function cnCutOf(c) {
  if (!c) return null;
  const M = cnMe(), who = c.who === 'daolv' ? (st && st.daolv) || 'su' : c.who;
  const src = who === 'me' ? (c.fx ? ART.portraitX(ART.portraitMe(M.look, M.r, c.mood || 'n'), '', c.fx) : ART.portraitMe(M.look, M.r, c.mood || 'n')) : ART.portraitX(who, c.mood || 'n', c.fx || '', (who === 'su' || who === 'ye' || who === 'mu') && M.f);
  return { cv: ART.cutin(src, c.col || CN_COL[who] || '#d8404a', c.side === 'r'), flip: c.side === 'r', y: c.y === undefined ? 36 : c.y, at: c.at || 300 };
}
// 写手线可用的镜头字段（src/content/cine_data.js）：if 也可以是函数；sub / cam 可以是函数；bgm 这一镜起换曲（'' = 静下来，一直管到本段结束）；
//   paint(g, t, u) 画在世界层（底图、罩色之后；跟镜头走）、top(g, t, u) 画在屏幕层（特写带之前；不跟镜头走）；fade 淡入毫秒。
const cnBgmFx = k => { const n = '~bgm:' + k; if (!CSFX[n]) CSFX[n] = () => BGM.play(k, { while: () => !!cn }); return n; };
function cnFromData(D) {
  return D.shots.filter(S => !S.if || (typeof S.if === 'function' ? S.if() : st && L.storyCond(st, S.if))).map(S => {
    const cut = cnCutOf(typeof S.cut === 'function' ? S.cut() : S.cut), cut2 = cnCutOf(typeof S.cut2 === 'function' ? S.cut2() : S.cut2), fr = S.frames || [[0, S.bg]];
    const sub = typeof S.sub === 'function' ? S.sub() : S.sub;
    const sfx = S.bgm !== undefined ? [[S.bgmAt || 0, cnBgmFx(S.bgm)]].concat(S.sfx || []) : S.sfx;
    return { ms: S.ms || 4000, sub, sfx, shake: S.shake, fade: S.fade, cam: typeof S.cam === 'function' ? S.cam : CN_CAM[S.cam || 'hold'],
      draw: (g, t, u) => { let b = fr[0][1]; for (const f of fr) if (t >= f[0]) b = f[1]; if (b) cnImg(g, cnBgOf(b), 0, 0); if (S.tint) cnDim(g, S.tint[1], S.tint[0]); if (S.dim) cnDim(g, S.dim); if (S.paint) S.paint(g, t, u); },
      over: (g, t, u) => { for (const f of S.flash || []) if (t >= f && t < f + 320) { g.globalAlpha = 1 - (t - f) / 320; g.fillStyle = '#ffffff'; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; } if (S.lines && t > (S.linesAt || 0)) cnLines(g, t, S.lines, 100, 60, 0.8); if (S.top) S.top(g, t, u); if (cut) cnCut(g, cut.cv, cut.flip, cut.y, t - cut.at); if (cut2) cnCut(g, cut2.cv, cut2.flip, cut2.y, t - cut2.at); if (S.seal) cnSeal(g, S.seal, S.sealX || 100, S.sealY || 60, S.sealSize || 28, t - (S.sealAt || 1200), S.sealCol); } };
  });
}
const daolvCol = () => (st && st.daolv === 'ye' ? '#a81e3a' : '#7fd8b0');
const CINE_DATA = {
  ring: { n: '锈戒', no: '⑪', bgm: 'sorrow', thumb: 'cg:ring:0', shots: [
    { bg: 'temple', cam: 'panDown', ms: 4000, sfx: [[200, 'wind']] },
    { bg: 'cg:ring:0', cam: 'push', ms: 3200, sub: '“小家伙。”', sfx: [[300, 'gather']] },
    { bg: 'temple', dim: 0.5, ms: 4200, cut: { who: 'elder', mood: 'n', side: 'l' }, sub: '“本座等了你三千年。”', sfx: [[2600, 'bell']] }] },
  xiushu_shame: { n: '休书·念', no: '⑫', bgm: 'vow', thumb: 'dusk', shots: [
    { bg: 'dusk', dim: 0.4, cam: 'push', ms: 3200, cut: { who: 'me', mood: 'ang', fx: 'shade', side: 'l' }, sub: '“今日休之。”', sfx: [[300, 'drum']] },
    { bg: 'ink', ms: 2800, lines: '#1b1326', flash: [300], shake: [[300, 400, 4]], sfx: [[300, 'paper'], [700, 'luo']] },
    { bg: 'dusk', dim: 0.55, ms: 4200, cut: { who: 'mu', mood: 'sad', fx: 'tear', side: 'r' }, sub: '“你和他们，没有两样。”', sfx: [[400, 'wind']] }] },
  xiushu_spare: { n: '休书·收', no: '⑫', bgm: 'vow', thumb: 'dusk', shots: [
    { bg: 'dusk', cam: 'panL', ms: 3800, sub: '“两清了。”', sfx: [[300, 'drum']] },
    { bg: 'dusk', dim: 0.55, ms: 3000, cut: { who: 'mu', mood: 'shock', side: 'r' }, sfx: [[300, 'wind']] },
    { bg: 'ink', cam: 'push', ms: 3200, sub: '“莫欺少年穷。”', sfx: [[1800, 'bell']] }] },
  xuetie: { n: '血帖', no: '⑬', bgm: 'boss', thumb: 'blood', shots: [
    { bg: 'town', dim: 0.6, cam: 'push', ms: 3000, sfx: [[400, 'clang']] },
    { bg: 'blood', cam: 'panDown', ms: 4000, sub: '“剑是什么颜色，”', sfx: [[300, 'rumble']] },
    { bg: 'blood', dim: 0.45, ms: 4000, cut: { who: 'me', mood: 'n', fx: 'shade', side: 'l', col: '#8a1020' }, sub: '“看握剑的人。”', sfx: [[2400, 'gong']] }] },
  heiyi: { n: '夜半黑衣', no: '⑭', bgm: 'realm', thumb: 'cave', shots: [
    { bg: 'cave', dim: 0.5, cam: 'push', ms: 3000, sfx: [[200, 'wind']] },
    { bg: 'cg:ring:0', cam: 'push', ms: 3000, sub: '“给我。”', sfx: [[300, 'gather']] },
    { bg: 'cave', dim: 0.6, ms: 3400, cut: { who: 'mo', mood: 'n', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', side: 'l', y: 62, at: 900 }, sub: '“墨家。”', sfx: [[900, 'clang']] }] },
  wanjian: { n: '万剑低眉', no: '⑮', bgm: 'sorrow', thumb: 'ink', shots: [
    { bg: 'ink', cam: 'panR', ms: 4000, sfx: [[200, 'wind']] },
    { bg: 'ink', ms: 2800, lines: '#1b1326', shake: [[400, 500, 3]], sfx: [[400, 'clang'], [700, 'clang'], [1000, 'clang']] },
    { bg: 'ink', dim: 0.3, ms: 4200, cut: { who: 'elder', mood: 'sad', side: 'l' }, sub: '“本座回来晚了。”', sfx: [[2600, 'bell']] }] },
  yujian: { n: '半块玉简', no: '⑯', bgm: 'sorrow', thumb: 'cg:jade:0', shots: [
    { bg: 'cg:jade:0', cam: 'push', ms: 4000, sub: '“祖训只有一句。”', sfx: [[300, 'reveal']] },
    { bg: 'cave', dim: 0.6, ms: 4000, cut: { who: 'mo', mood: 'sad', side: 'r' }, sub: '“可曾信过墨离？”', sfx: [[400, 'drum']] },
    { bg: 'cave', dim: 0.6, ms: 3200, cut: { who: 'elder', mood: 'ang', fx: 'shade', side: 'l' }, sub: '“那个逆徒，也配问？”', shake: [[300, 400, 4]], sfx: [[300, 'thunder']] }] },
  huaxiang: { n: '祖师画像', no: '⑰', bgm: 'boss', thumb: 'tjgate', shots: [
    { bg: 'tjgate', cam: 'panUp', ms: 4000, sfx: [[300, 'paper']] },
    { bg: 'tjgate', dim: 0.6, cam: 'push', ms: 4200, cut: { who: 'tianheng', mood: 'n', fx: 'mono', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', side: 'l', y: 62, at: 1200 }, sub: '“陆、天、衡。”', sfx: [[1200, 'drum'], [1700, 'drum'], [2200, 'drum']] },
    { bg: 'cg:jade:0', tint: ['#0a0818', 0.3], ms: 4000, sub: '“本座的好大徒弟。”', shake: [[300, 500, 5]], sfx: [[300, 'tear'], [1400, 'reveal']] }] },
  najian: { n: '那一剑', no: '⑱', bgm: 'sorrow', thumb: 'cg:stab:1', shots: [
    { bg: 'cg:jade:1', cam: 'push', ms: 3000, sfx: [[300, 'reveal']] },
    { bg: 'cg:stab:0', ms: 4000, sub: '“他只记得这一幕。”', sfx: [[500, 'thunder']] },
    { bg: 'cg:stab:0', frames: [[0, 'cg:stab:0'], [1800, 'cg:stab:1']], ms: 5000, lines: '#e8f4ff', linesAt: 1800, flash: [1800], sub: '“师尊，小心——”', shake: [[1800, 600, 5]], sfx: [[400, 'heart'], [1100, 'heart'], [1800, 'slash'], [1850, 'clang'], [2000, 'thunder']] },
    { bg: 'trib3k', dim: 0.5, ms: 5000, cut: { who: 'elder', mood: 'sad', fx: 'tear', side: 'l' }, sub: '“本座骂了他三千年。”', sfx: [[3200, 'bell']] }] },
  zhen_zheng: { n: '阵前·斩魔', no: '⑲', bgm: 'vow', thumb: 'field', shots: [
    { bg: 'field', cam: 'panL', ms: 3000, sfx: [[200, 'wardrum']] },
    { bg: 'field', dim: 0.55, ms: 3200, cut: { who: 'me', mood: 'ang', side: 'l', y: 8 }, cut2: { who: 'xue', mood: 'joy', side: 'r', y: 62, at: 500 }, sub: '“借你人头一用。”', flash: [1400], shake: [[1400, 400, 5]], sfx: [[1400, 'slash'], [1450, 'clang']] },
    { bg: 'field', dim: 0.3, ms: 4000, seal: '胜', sealAt: 600, sub: '“此战首功。”', sfx: [[600, 'win']] }] },
  zhen_mo: { n: '阵前·倒戈', no: '⑲', bgm: 'boss', thumb: 'field', shots: [
    { bg: 'field', cam: 'panR', ms: 3000, sfx: [[200, 'wardrum']] },
    { bg: 'field', dim: 0.55, cam: 'push', ms: 3400, cut: { who: 'me', mood: 'n', fx: 'shade', side: 'l', col: '#8a1020' }, sub: '“没说打哪边。”', sfx: [[1200, 'clang']] },
    { bg: 'field', tint: ['#4a0a14', 0.4], ms: 4000, sub: '“正道，再无此人。”', sfx: [[600, 'gong']] }] },
  zhen_stop: { n: '阵前·止戈', no: '⑲', bgm: 'vow', thumb: 'end:zhige', shots: [
    { bg: 'field', cam: 'push', ms: 4000, sub: '“谁先过这把剑。”', sfx: [[400, 'clang']] },
    { bg: 'field', dim: 0.55, ms: 3200, cut: { who: 'xue', mood: 'joy', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'ang', side: 'l', y: 62 }, shake: [[900, 300, 4], [1700, 300, 4]], sfx: [[900, 'drum'], [1700, 'drum']] },
    { bg: 'end:zhige', cam: 'pull', ms: 5000, sub: '“这一仗，不打了。”', sfx: [[800, 'bell']] }] },
  shijie: { n: '九百级石阶', no: '⑳', bgm: 'vow', thumb: 'tjgate', shots: [
    { bg: 'tjgate', cam: 'panUp', ms: 5000, sub: '“这阵，是本座教的。”', sfx: [[200, 'wind'], [1200, 'rumble']] },
    { bg: 'tjgate', cam: 'push', ms: 3600, sfx: [[300, 'drum'], [1000, 'drum'], [1700, 'drum'], [2400, 'drum']] },
    { bg: 'stele', ms: 4000, sub: '“问剑，天剑宗。”', sfx: [[600, 'gong']] }] },
  liaoduan_dead: { n: '了断·一剑', no: '㉑', bgm: 'sorrow', thumb: 'cg:kneel:0', shots: [
    { bg: 'cg:kneel:0', cam: 'push', ms: 3000, sfx: [[200, 'wind']] },
    { bg: 'cg:kneel:0', ms: 1800, lines: '#ffffff', flash: [200], shake: [[200, 400, 5]], sfx: [[200, 'slash'], [260, 'clang']] },
    { bg: 'stele', dim: 0.5, ms: 5000, cut: { who: 'elder', mood: 'sad', side: 'l' }, sub: '“……也好。”', sfx: [[3000, 'bell']] }] },
  liaoduan_crippled: { n: '了断·废', no: '㉑', bgm: 'sorrow', thumb: 'cg:kneel:0', shots: [
    { bg: 'cg:kneel:0', cam: 'push', ms: 4200, sub: '“原来是这个滋味。”', sfx: [[300, 'gather']] },
    { bg: 'tjgate', cam: 'panDown', ms: 5000, sfx: [[300, 'wind']] }] },
  liaoduan_exposed: { n: '了断·昭告', no: '㉑', bgm: 'sorrow', thumb: 'stele', shots: [
    { bg: 'cg:kneel:0', ms: 4000, sub: '“师父，您来念。”', sfx: [[300, 'paper']] },
    { bg: 'tjgate', cam: 'panR', ms: 4000, sfx: [[300, 'bell'], [1500, 'bell'], [2700, 'bell']] },
    { bg: 'stele', cam: 'push', ms: 5000, sub: '“墨离。”', sfx: [[800, 'reveal']] }] },
  liaoduan_spared: { n: '了断·放', no: '㉑', bgm: 'sorrow', thumb: 'cg:kneel:0', shots: [
    { bg: 'cg:kneel:0', ms: 4000, sub: '“他后悔收我吗？”', sfx: [[300, 'wind']] },
    { if: 'vow_letgo', bg: 'stele', dim: 0.5, ms: 4000, cut: { who: 'elder', mood: 'sad', side: 'l' }, sub: '“不后悔。”', sfx: [[1600, 'bell']] },
    { bg: 'stele', cam: 'push', ms: 4000, sub: '“剑留下。”', sfx: [[400, 'paper']] }] },
  chongzhu: { n: '玄霄重铸', no: '㉒', bgm: 'vow', thumb: 'cg:sword:1', shots: [
    { bg: 'cg:sword:0', cam: 'panR', ms: 4000, sfx: [[500, 'clang'], [1700, 'clang'], [2900, 'clang']] },
    { bg: 'cg:sword:0', ms: 2600, lines: '#8ff0d0', shake: [[300, 300, 4], [1100, 300, 4], [1900, 300, 4]], sfx: [[300, 'hit'], [1100, 'hit'], [1900, 'hit']] },
    { bg: 'cg:sword:1', ms: 5000, sub: '“这杯，敬阿离。”', sfx: [[300, 'reveal'], [3000, 'bell']] }] },
  zuihou_farewell: { n: '最后一课', no: '㉓', bgm: 'sorrow', thumb: 'cg:fade:1', shots: [
    { bg: 'temple', tint: ['#1a1030', 0.35], ms: 4000, flash: [400], sub: '“这一道，为师替你挡。”', shake: [[400, 500, 5]], sfx: [[400, 'thunder']] },
    { bg: 'cg:fade:0', frames: [[0, 'cg:fade:0'], [2000, 'cg:fade:1'], [4000, 'cg:fade:2']], ms: 6000, sub: '“是本座最走运的事。”', sfx: [[600, 'heart'], [2000, 'gather'], [4000, 'bell']] },
    { bg: 'cg:ring:1', frames: [[0, 'cg:ring:1'], [2400, 'cg:ring:2']], cam: 'push', ms: 5000, sfx: [[2400, 'bell']] }] },
  zuihou_kept: { n: '最后一课·留魂', no: '㉓', bgm: 'vow', thumb: 'cg:sword:1', shots: [
    { bg: 'temple', tint: ['#1a1030', 0.35], ms: 4000, sub: '“规矩第三条，不许死。”', shake: [[400, 500, 5]], sfx: [[400, 'thunder']] },
    { bg: 'cg:fade:1', cam: 'push', ms: 4000, sfx: [[300, 'gather']] },
    { bg: 'cg:sword:1', ms: 4200, sub: '“……逆徒。”', sfx: [[400, 'reveal']] }] },
  fangke: { n: '最后的访客', no: '㉔', bgm: 'home', thumb: 'cg:door:0', shots: [
    { bg: 'cg:door:0', cam: 'push', ms: 4000, sfx: [[300, 'wind']] },
    { bg: 'cg:door:1', ms: 5000, sub: '“明天，还回来吗？”', sfx: [[600, 'bell']] }] },
  tianmen: { n: '天门', no: '㉕', bgm: 'ascend', thumb: 'heaven', shots: [
    { bg: 'clouds', ms: 3000, shake: [[300, 600, 5]], sfx: [[300, 'thunder'], [900, 'rumble']] },
    { bg: 'heaven', cam: 'panUp', ms: 5000, sfx: [[400, 'bell'], [1800, 'bell'], [3200, 'bell']] },
    { bg: 'heaven', cam: 'push', ms: 4200, sub: '“门开了一条缝。”', sfx: [[400, 'gather']] }] },
  end_shitu: { n: '结局·师徒同归', no: '㉖', bgm: 'ascend', thumb: 'end:shitu', shots: [
    { bg: 'end:shitu', cam: 'panUp', ms: 4200, sub: '“比想的小。”', sfx: [[300, 'bell']] },
    { bg: 'heaven', dim: 0.5, ms: 5000, cut: { who: 'elder', mood: 'joy', side: 'l', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'r', y: 62, at: 700 }, sub: '“这回，本座看着你渡完。”', sfx: [[900, 'reveal']] },
    { bg: 'end:shitu', cam: 'push', ms: 6000, sub: '师徒同归', sfx: [[600, 'win']] }] },
  end_wentian: { n: '结局·问天', no: '㉗', bgm: 'boss', thumb: 'end:wentian', shots: [
    { bg: 'heaven', cam: 'push', ms: 3000, sfx: [[200, 'wind']] },
    { bg: 'void', cam: 'panR', ms: 5000, sub: '“它们出题，从不改卷。”', sfx: [[300, 'rumble']] },
    { bg: 'void', dim: 0.5, ms: 3200, cut: { who: 'me', mood: 'ang', side: 'l' }, sub: '“那就，换我出一题。”', sfx: [[600, 'drum'], [1200, 'drum']] },
    { bg: 'end:wentian', ms: 6000, lines: '#c8fff0', flash: [200], sub: '问天', shake: [[200, 700, 6]], sfx: [[200, 'slash'], [260, 'clang'], [500, 'thunder']] }] },
  end_dixian: { n: '结局·守人间', no: '㉘', bgm: 'home', thumb: 'end:dixian', shots: [
    { bg: 'heaven', cam: 'panDown', ms: 4000, sfx: [[300, 'wind']] },
    { bg: 'temple', tint: ['#ffb23f', 0.18], ms: 4000, sub: '“屋顶，得修。”', sfx: [[600, 'bell']] },
    { bg: 'end:dixian', cam: 'push', ms: 6000, sub: '守人间', sfx: [[600, 'reveal']] }] },
  end_gufeng: { n: '结局·孤峰', no: '㉙', bgm: 'sorrow', thumb: 'end:gufeng', shots: [
    { bg: 'heaven', ms: 4600, sub: '“没有人来送。”', sfx: [[300, 'wind']] },
    { bg: 'heaven', dim: 0.6, ms: 3200, cut: { who: 'tianheng', mood: 'n', fx: 'mono', side: 'r' }, sub: '“他站得太高。”', sfx: [[600, 'bell']] },
    { bg: 'end:gufeng', cam: 'pull', ms: 7000, sub: '“从没回头。”', sfx: [[300, 'wind']] }] },
  end_mozun: { n: '结局·魔尊', no: '㉚', bgm: 'boss', thumb: 'end:mozun', shots: [
    { bg: 'blood', cam: 'panUp', ms: 4000, sfx: [[300, 'rumble']] },
    { bg: 'blood', dim: 0.5, ms: 3200, cut: { who: 'me', mood: 'n', fx: 'shade', side: 'l', col: '#8a1020' }, sub: '“正道容不下我。”', sfx: [[500, 'drum']] },
    { bg: 'end:mozun', ms: 6000, sub: '“那就，换个天下。”', sfx: [[500, 'gong']] }] },
  end_daolv_su: { n: '结局·药香', no: '㉛', bgm: 'ascend', thumb: 'end:daolv_su', shots: [
    { bg: 'end:daolv_su', cam: 'panR', ms: 5000, sfx: [[300, 'bell']] },
    { bg: 'heaven', dim: 0.5, ms: 5000, cut: { who: 'su', mood: 'joy', fx: 'blush', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 700 }, sub: '“上面，有没有病人？”', sfx: [[900, 'reveal']] },
    { bg: 'cg:two:#7fd8b0', cam: 'push', ms: 6000, sub: '同去', sfx: [[600, 'win']] }] },
  end_daolv_ye: { n: '结局·红月', no: '㉛', bgm: 'ascend', thumb: 'end:daolv_ye', shots: [
    { bg: 'end:daolv_ye', cam: 'panR', ms: 5000, sfx: [[300, 'bell']] },
    { bg: 'heaven', dim: 0.5, ms: 5000, cut: { who: 'ye', mood: 'joy', fx: 'blush', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 700 }, sub: '“我赌你不敢松手。”', sfx: [[900, 'reveal']] },
    { bg: 'cg:two:#a81e3a', cam: 'push', ms: 6000, sub: '同去', sfx: [[600, 'win']] }] },
  end_summit: { n: '结局·掌宗飞升', no: '㉜', bgm: 'ascend', thumb: 'bd:summit', shots: [
    { bg: 'hall', cam: 'push', ms: 4000, sfx: [[300, 'bell']] },
    { bg: 'gate', cam: 'panUp', ms: 4000, sub: '“都起来。”', sfx: [[300, 'wardrum']] },
    { bg: 'bd:summit', ms: 6000, sub: '“山门在，我在。”', sfx: [[600, 'win']] }] },
  end_zhige: { n: '止戈', no: '㉝', bgm: 'home', thumb: 'end:zhige', shots: [
    { bg: 'end:zhige', cam: 'push', ms: 6000, sub: '“那一年，没有打起来。”', sfx: [[600, 'bell']] }] },
};
// 写手线的分镜：src/content/cine_data.js 挂 window.XM_CINE_DATA = 画图工具 => { 段 id: 数据 }；同名的段盖掉上面的（㉖～㉝ 结局在那边）
const CN_API = { ART, L, img: cnImg, feet: cnFeet, dim: cnDim, text: cnText, lines: cnLines, seal: cnSeal, gather: cnGather, bolt: cnBolt, ease: cnEase, k: cnK, mix: cnMix, clamp: cnClamp, cv: cnCv, bg: cnBgOf,
  me: cnMe, meFt: cnMeFt, fd: CN_FD, disciple: cnDisciple, st: () => st, cond: c => !!st && L.storyCond(st, c) };
if (typeof window.XM_CINE_DATA === 'function') { try { Object.assign(CINE_DATA, window.XM_CINE_DATA(CN_API)); } catch (e) { console.error('cine_data', e); } }
for (const id in CINE_DATA) {
  const D = CINE_DATA[id];
  CINE[id] = { n: D.n, no: D.no, grp: D.grp, s: Math.round(D.shots.reduce((a, s) => a + (s.ms || 4000), 0) / 1000), thumb: () => cnBgOf(D.thumb), shots: () => cnFromData(D) };
  CN_BGM[id] = D.bgm || 'vow'; CN_ORDER.push(id);
}
// 玩家正看着的那一刻就播（不等回洞府）：天门、结局、最后一课
for (const id of ['tianmen', 'zuihou_farewell', 'zuihou_kept']) CN_NOW[id] = 1;
for (const id in CINE_DATA) if (/^end_/.test(id)) CN_NOW[id] = 1;
// 结局过场每一世都播（看过的结局也重播：这是这一世的收尾）；回忆里照常点亮
const cineEnd = id => (CINE[id] ? cinePlay(id, {}) : Promise.resolve(false));

// ---------- 三、接线：天门与结局 ----------
// 飞升：渡过九九天劫 →（过场㉕ 天门）→ 对话“天门”与抉择八 →（结局过场）→ 结局卡。原来的 ⑩ 飞升过场留给“白日飞升”这一个结局。
{ const sa1 = showAscension; showAscension = function () {
  const a = arguments, self = this;
  if (!st) return sa1.apply(self, a);
  const ev = L.eventById('s9_gate'), chosen = L.STORY_ASC.some(f => st.eflags[f]);
  if (ev && !chosen && !st.evDone.s9_gate && L.STORYLINE !== false) {
    const i = st.storyQ.indexOf('s9_gate'); if (i >= 0) st.storyQ.splice(i, 1);
    L.storyState(st).beat.c9_climax = st.tick;
    showChoice(ev, () => { closeModal(); L.checkQuests(st); showAscension(); });
    return;
  }
  const E = L.endingOf(st);
  if (E.cine === 'feisheng' || st.flags.endCine === st.rebirth + 1) return sa1.apply(self, a);   // sa1 = cine2 包过的那一层：自己会播 ⑩
  st.flags.endCine = st.rebirth + 1;
  const tail = () => { if (E.tags.includes('止戈')) cnAfter(cineEnd('end_zhige'), () => sa1.apply(self, a)); else sa1.apply(self, a); };
  cnMark('feisheng', 'feisheng');   // 这一世的收尾是别的结局：不再叠播“白日飞升”
  cnAfter(cineEnd(E.cine), tail);
}; }
// 新开一局（第一世）：建档后当场播第一章的开章。快放（自动化）时不播，留给节拍表晚些时候放
function storyStart() {
  if (!st || tkFast() || (st.rebirth || 0) > 0 || (st.origin || 'qitu') !== 'qitu' || L.STORYLINE === false) return;
  const ev = L.eventById('s1_night'); if (!ev || st.evDone.s1_night) return;
  L.storyState(st).beat.c1_open = 0; L.storyState(st).last = 0;
  showChoice(ev);
}
// 测试与截图用（tools/story_ui.js）
window.__xm_talk = { fast: undefined, DATA: CINE_DATA, play: id => { const ev = L.eventById(id); if (ev) showChoice(ev); return !!ev; }, close: tkClose, tap: tkTap, ascend: () => showAscension(),
  get stage() { return tk ? { bg: tk.bg, zoom: tk.zoom, dimT: tk.dimT, amb: tk.amb, x: tk.zx, y: tk.zy, bars: tk.barsT, G: tk.G } : null; },
  get on() { return tk ? { id: tk.ev.id, i: tk.i, n: tk.lines.length, picking: !!tk.picking, full: !!tk.full, bg: tk.bg, text: tk.root.querySelector('.tk-text').textContent } : null; } };
