/* 废柴仙途 · 界面片段 audio：音效与音乐（docs/AUDIO.md）
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。
 * 全部用 Web Audio 现场合成，不带任何音频文件：
 *   引擎  auGraph(ctx)：音效总线 / 音乐总线各一个增益 → 压限 → 输出；音乐带一条回声。
 *   乐器  INS（qin 古琴、pipa 琵琶、di 笛、xiao 箫、lead 方波主音、bass / pbass 低音、pad 铺底、bell 磬）与 DRUM（堂鼓、梆子、木鱼、镲、锣……）。
 *   乐谱  TRACKS：简谱字符串（1～7、' 高八度、, 低八度、- 延音、0 休止、| 小节线只是给人看的），运行时解析、按 AudioContext 的时钟排程，
 *         所以 ×2 / ×4 的游戏速度不影响节拍。
 *   导演  bgmScene() 每 150ms 看一眼游戏状态决定该放哪首（不用在各处埋点）；换曲淡出淡入；历练途中的战斗只是给同一首曲子加一层鼓和低音。
 *   音效  SFX.xxx()：统一用上面的乐器合成；同名音效 40ms 内不重复。
 * 声音三态（core.js 的 soundMode）：0 音乐与音效 / 1 仅音效 / 2 静音；音乐、音效另有 0～5 档音量（AU.mv / AU.sv，存在偏好里）。
 * 第一次点按之后才建 AudioContext；页面隐藏 / 安卓切后台时挂起；自动化测试（navigator.webdriver）里整个不出声，地址带 ?audio=1 可强开。 */
// ---------- 引擎 ----------
const AU = { off: !!navigator.webdriver && !/[?&#]audio=1/.test(location.href), mv: 3, sv: 3, paused: false, G: null, MUS: 0.7, SFX: 0.8 };
let AC = null;
const auVol = l => Math.pow(Math.max(0, Math.min(5, l)) / 5, 1.6);
const mf = m => 440 * Math.pow(2, (m - 69) / 12);
function auGraph(a) {
  const G = { a };
  const cp = G.out = a.createDynamicsCompressor();
  cp.threshold.value = -15; cp.knee.value = 12; cp.ratio.value = 5; cp.attack.value = 0.004; cp.release.value = 0.22;
  G.master = a.createGain(); G.master.gain.value = 0.9; cp.connect(G.master); G.master.connect(a.destination);
  G.sfx = a.createGain(); G.sfx.connect(cp);
  G.mus = a.createGain(); G.mus.connect(cp);
  G.duck = a.createGain(); G.duck.connect(G.mus);   // 所有曲目 → duck（短乐句响的时候压一下）→ mus
  const echo = (inp, out, dt, fb, cut) => { const d = a.createDelay(1), f = a.createGain(), lp = a.createBiquadFilter(); d.delayTime.value = dt; f.gain.value = fb; lp.type = 'lowpass'; lp.frequency.value = cut; inp.connect(d); d.connect(lp); lp.connect(f); f.connect(d); lp.connect(out); };
  G.echo = a.createGain(); echo(G.echo, G.duck, 0.31, 0.36, 2400);
  G.sfxW = a.createGain(); G.sfxW.connect(G.sfx); { const s = a.createGain(); s.gain.value = 0.3; G.sfxW.connect(s); echo(s, G.sfx, 0.17, 0.3, 3200); }   // 带一点回声的音效（磬、锣）
  const nb = G.nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), ch = nb.getChannelData(0);
  let s = 12345; for (let i = 0; i < ch.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; ch[i] = s / 0x40000000 - 1; }
  const W = h => { const n = h.length + 1, re = new Float32Array(n), im = new Float32Array(n); h.forEach((v, i) => { im[i + 1] = v; }); return a.createPeriodicWave(re, im); };
  G.w = {
    qin: W([1, 0.55, 0.32, 0.12, 0.16, 0.05, 0.04]), pipa: W([1, 0.7, 0.45, 0.5, 0.2, 0.25, 0.1, 0.12]),
    di: W([1, 0.42, 0.2, 0.08, 0.04]), xiao: W([1, 0.16, 0.07, 0.02]),
    pulse: W(Array.from({ length: 16 }, (_, i) => Math.sin((i + 1) * Math.PI * 0.25) / (i + 1))),
  };
  return G;
}
function auApply() {
  const G = AU.G; if (!G) return;
  const t = G.a.currentTime;
  G.sfx.gain.setTargetAtTime(soundMode === 2 ? 0 : AU.SFX * auVol(AU.sv), t, 0.03);
  G.mus.gain.setTargetAtTime(soundMode === 0 ? AU.MUS * auVol(AU.mv) : 0, t, 0.08);
}
function ac() {
  if (AU.off) return null;
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); AU.G = auGraph(AC); auApply(); } catch (e) { AC = null; AU.G = null; AU.off = true; return null; }
  }
  if (AC.state === 'suspended' && !AU.paused) AC.resume().catch(() => {});
  return AC;
}
const musOn = () => soundMode === 0 && AU.mv > 0;
const sfxOn = () => soundMode !== 2 && AU.sv > 0;
// ---------- 发声的积木 ----------
const wav = (os, G, w) => { if (typeof w === 'string' && G.w[w]) os.setPeriodicWave(G.w[w]); else os.type = w; };
// 拨一下：起音后指数衰减
function oPerc(G, d, w, f, t, dur, v, o) {
  o = o || {};
  const a = G.a, os = a.createOscillator(), g = a.createGain();
  wav(os, G, w);
  os.frequency.setValueAtTime(f, t); if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + (o.ft || dur));
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  os.connect(g); g.connect(d); os.start(t); os.stop(t + dur + 0.03);
  return os;
}
// 吹 / 拉：起音、保持、收音；o.vib 颤音（长音才加）
function oSus(G, d, w, f, t, dur, v, o) {
  o = o || {};
  const a = G.a, os = a.createOscillator(), g = a.createGain(), at = Math.min(o.a || 0.01, dur * 0.5), r = o.r || 0.05;
  wav(os, G, w);
  if (o.scoop) { os.frequency.setValueAtTime(f * o.scoop, t); os.frequency.exponentialRampToValueAtTime(f, t + 0.05); } else os.frequency.setValueAtTime(f, t);
  if (o.f2) os.frequency.exponentialRampToValueAtTime(o.f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + at);
  if (o.s) g.gain.setTargetAtTime(v * o.s, t + at, 0.12);
  g.gain.setValueAtTime(v * (o.s ? o.s + (1 - o.s) * Math.exp(-(dur - at) / 0.12) : 1), t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + r);
  if (o.vib && dur > 0.38) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = o.vib; lg.gain.setValueAtTime(0, t + 0.2); lg.gain.linearRampToValueAtTime(f * (o.vd || 0.006), t + 0.45); l.connect(lg); lg.connect(os.frequency); l.start(t + 0.2); l.stop(t + dur + r); }
  os.connect(g); g.connect(d); os.start(t); os.stop(t + dur + r + 0.03);
}
// 噪声：共用一段白噪声，过滤波器；o: { type, f, f2, q, a }
function nz(G, d, t, dur, v, o) {
  o = o || {};
  const a = G.a, s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain();
  s.buffer = G.nb; s.loop = true;
  fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(o.f || 1200, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur); if (o.q) fl.Q.value = o.q;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + (o.a || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(d); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03);
}
// ---------- 乐器：(G, 去向, 频率, 何时, 时值秒, 音量) ----------
const INS = {
  // 古琴：拨弦，余音长，音色随时间变暗；带一点泛音和指甲声
  qin(G, d, f, t, dur, v) {
    const fl = G.a.createBiquadFilter(), len = Math.min(3.2, Math.max(0.9, dur * 1.6 + 0.5));
    fl.type = 'lowpass'; fl.Q.value = 1.2; fl.frequency.setValueAtTime(Math.min(9000, f * 7), t); fl.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.6), t + 0.5); fl.connect(d);
    oPerc(G, fl, 'qin', f, t, len, v, { a: 0.006 }); oPerc(G, fl, 'sine', f * 2.005, t, len * 0.5, v * 0.18);
    nz(G, d, t, 0.03, v * 0.22, { type: 'bandpass', f: Math.min(6000, f * 5), q: 1 });
  },
  // 琵琶：短、亮
  pipa(G, d, f, t, dur, v) { oPerc(G, d, 'pipa', f, t, Math.min(0.55, Math.max(0.16, dur * 1.2)), v, { a: 0.003 }); nz(G, d, t, 0.02, v * 0.2, { type: 'highpass', f: 3500 }); },
  // 笛：起音从下面滑上来，长音带颤音，一点气声和笛膜的沙
  di(G, d, f, t, dur, v) {
    oSus(G, d, 'di', f, t, dur * 0.92, v, { a: 0.035, r: 0.07, scoop: 0.966, vib: 5.5, vd: 0.007 });
    oSus(G, d, 'pulse', f, t, dur * 0.92, v * 0.05, { a: 0.05, r: 0.05 });
    nz(G, d, t, 0.07, v * 0.28, { type: 'bandpass', f: Math.min(7000, f * 3), q: 0.8 });
  },
  // 箫：起音慢、暗，气声一直在
  xiao(G, d, f, t, dur, v) {
    oSus(G, d, 'xiao', f, t, dur * 0.95, v, { a: 0.09, r: 0.16, vib: 4.6, vd: 0.005 });
    nz(G, d, t, dur, v * 0.1, { type: 'bandpass', f: Math.min(5000, f * 2), q: 1.2, a: 0.08 });
  },
  // 方波主音（芯片味）
  lead(G, d, f, t, dur, v) { oSus(G, d, 'pulse', f, t, dur * 0.88, v, { a: 0.006, r: 0.04, s: 0.7, vib: 6, vd: 0.005 }); },
  sq(G, d, f, t, dur, v) { oPerc(G, d, 'square', f, t, Math.min(0.2, Math.max(0.07, dur)), v * 0.7); },
  bass(G, d, f, t, dur, v) { oSus(G, d, 'triangle', f, t, dur * 0.9, v, { a: 0.006, r: 0.05 }); oPerc(G, d, 'sine', f, t, 0.12, v * 0.5); },
  pbass(G, d, f, t, dur, v) { oPerc(G, d, 'pulse', f, t, Math.max(0.09, dur * 0.95), v, { a: 0.004 }); oPerc(G, d, 'triangle', f, t, Math.max(0.09, dur * 0.95), v * 0.9); },
  pad(G, d, f, t, dur, v) { const o = { a: Math.min(0.7, dur * 0.3), r: 1.1 }; oSus(G, d, 'sine', f, t, dur, v, o); oSus(G, d, 'triangle', f * 1.003, t, dur, v * 0.35, o); oSus(G, d, 'sine', f * 2, t, dur, v * 0.12, o); },
  // 磬 / 铃：不谐和的泛音
  bell(G, d, f, t, dur, v) { const len = Math.min(2.6, Math.max(0.25, dur * 1.5 + 0.2)); oPerc(G, d, 'sine', f, t, len, v); oPerc(G, d, 'sine', f * 2.76, t, len * 0.35, v * 0.22); oPerc(G, d, 'sine', f * 5.4, t, Math.min(0.2, len * 0.15), v * 0.1); },
};
// ---------- 打击：(G, 去向, 何时, 音量) ----------
const DRUM = {
  k(G, d, t, v) { oPerc(G, d, 'sine', 150, t, 0.16, v, { f2: 45, ft: 0.09 }); nz(G, d, t, 0.015, v * 0.3, { type: 'highpass', f: 2000 }); },
  s(G, d, t, v) { nz(G, d, t, 0.11, v * 0.6, { type: 'highpass', f: 1800 }); oPerc(G, d, 'triangle', 220, t, 0.07, v * 0.45, { f2: 140 }); },
  h(G, d, t, v) { nz(G, d, t, 0.035, v * 0.32, { type: 'highpass', f: 7000 }); },
  o(G, d, t, v) { nz(G, d, t, 0.09, v * 0.28, { type: 'bandpass', f: 5200, q: 1.5 }); },
  // 堂鼓：鼓心 / 鼓边
  t(G, d, t, v) { oPerc(G, d, 'sine', 112, t, 0.5, v * 1.1, { f2: 55, ft: 0.16 }); oPerc(G, d, 'triangle', 168, t, 0.2, v * 0.4, { f2: 84, ft: 0.1 }); nz(G, d, t, 0.08, v * 0.45, { f: 520 }); },
  T(G, d, t, v) { oPerc(G, d, 'square', 420, t, 0.05, v * 0.25, { f2: 300 }); nz(G, d, t, 0.04, v * 0.4, { type: 'bandpass', f: 1500, q: 2 }); },
  // 梆子 / 木鱼
  w(G, d, t, v) { oPerc(G, d, 'sine', 1150, t, 0.05, v * 0.7, { f2: 900 }); oPerc(G, d, 'triangle', 2300, t, 0.025, v * 0.22); },
  m(G, d, t, v) { oPerc(G, d, 'sine', 540, t, 0.09, v * 0.8, { f2: 430 }); oPerc(G, d, 'triangle', 1080, t, 0.03, v * 0.15); },
  // 小镲、大锣、闷雷
  c(G, d, t, v) { nz(G, d, t, 0.28, v * 0.4, { type: 'bandpass', f: 6500, q: 2 }); oPerc(G, d, 'square', 3140, t, 0.12, v * 0.04); },
  g(G, d, t, v) { oPerc(G, d, 'triangle', 98, t, 2.4, v * 0.9, { f2: 92 }); oPerc(G, d, 'sine', 196, t, 1.8, v * 0.45); oPerc(G, d, 'sine', 293, t, 1.2, v * 0.2, { f2: 287 }); nz(G, d, t, 0.5, v * 0.3, { f: 1400 }); },
  r(G, d, t, v) { nz(G, d, t, 1.5, v * 0.8, { f: 200, a: 0.25 }); },
};
// ---------- 乐谱 ----------
const DEG = [0, 0, 2, 4, 5, 7, 9, 11];
// 简谱 → [{ s 起点（16 分音符为 1）, n 时值, m 距主音的半音数 }]；u = 一个记号占几个 16 分音符，连写的几个音平分一个记号
function parseJ(p, u) {
  const ev = []; let pos = 0, last = null;
  for (const tok of p.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    if (tok === '-') { if (last) last.n += u; pos += u; continue; }
    const at = tok.match(/[#b]?[0-7][',]*/g) || [], du = u / (at.length || 1);
    for (const x of at) {
      const mm = /^([#b]?)([0-7])([',]*)$/.exec(x), dg = +mm[2];
      if (!dg) last = null;
      else { last = { s: pos, n: du, m: DEG[dg] + (mm[1] === '#' ? 1 : mm[1] === 'b' ? -1 : 0) + 12 * ((mm[3].match(/'/g) || []).length - (mm[3].match(/,/g) || []).length) }; ev.push(last); }
      pos += du;
    }
  }
  return { ev, len: Math.round(pos) };
}
function parseD(p, u) { const ev = []; let pos = 0; for (const c of p.replace(/[\s|]/g, '')) { if (c !== '.') ev.push({ s: pos, c }); pos += u; } return { ev, len: pos }; }
const Z = n => Array(n).fill('0').join(' ');
const rep = (s, n) => Array(n).fill(s).join(' ');
const oct8 = r => `${r} ${r} ${r}' ${r} ${r} ${r} ${r}' ${r}`;          // 一小节八分音符的八度跳
const gal = r => rep(`${r} 0 ${r} ${r}`, 4);                             // 一小节“马蹄”十六分
const bars = (f, list) => list.map(f).join(' | ');
// 主题（《仙途》）：洞府慢弹、三年之约快吹、飞升齐奏、年报 / 章末截一句，都是它
const THEME = "3 5 6 1' | 2' - 1' 6 | 5 6 1' 6 | 5 - 3 - | 2 3 5 6 | 1' - 6 5 | 3 5 2 3 | 1 - - -";
/* 曲目：{ n 名字, bpm, key 主音（简谱 1）的 MIDI 号, resume 切走再回来接着放, v: [声部] }
 * 声部：{ i 乐器 | d: 1 打击, p 谱, u 一个记号几个 16 分（默认旋律 2、打击 1）, o 移八度, v 音量, e 回声量, g 时值比例, L: 1 战斗层（只在打的时候淡入） }
 * 各声部按自己的长度循环：四小节的低音型垫在十六小节的旋律下面，不用抄四遍。 */
const TRACKS = {
  // 洞府打坐：古琴弹主题 → 箫接一段、琴改分解 → 琴再弹主题、箫在上面托长音。D 宫，24 小节约 90 秒
  home: { n: '洞府 · 静坐', bpm: 63, key: 62, resume: 1, v: [
    { i: 'qin', u: 4, o: -1, v: 0.3, e: 0.35, p: THEME + " | 1, 5, 2 3 | 6,, 3, 6, 1 | 2, 6, 2 5 | 5,, 2, 5, 6, | 1, 5, 2 3 | 6,, 3, 6, 1 | 2, 5, 6, 2 | 1, 5, 1 - | " + THEME },
    { i: 'xiao', u: 4, v: 0.2, e: 0.5, p: Z(32) + " | 6 - - 5 | 3 - - - | 5 6 1' 2' | 3' - 2' - | 1' - 6 5 | 6 - - - | 5 3 2 3 | 1 - - - | " + Z(8) + " | 3' - - - | 2' - 1' - | 0 0 0 0 | 0 0 6 - | 5 - - - | 0 0 0 0" },
    { i: 'qin', u: 16, o: -2, v: 0.26, e: 0.2, p: "1 6, 1 5, 2 6, 5, 1 " + Z(8) + " 1 6, 1 5, 2 6, 5, 1" },
    { i: 'pad', u: 32, o: -1, v: 0.05, p: "1 1 5, 1" },
    { i: 'bell', u: 16, o: 1, v: 0.05, e: 0.6, p: "5 0 0 0 0 0 0 0 1' 0 0 0 0 0 0 0 5 0 0 0 0 0 0 0" },
  ] },
  // 历练途中：笛子主奏、琵琶分解、梆子点拍。G 宫落徵，16 小节。战斗层：堂鼓 + 鼓组 + 八分低音，打起来才淡入
  road: { n: '历练 · 行路', bpm: 100, key: 67, resume: 1, v: [
    { i: 'di', v: 0.17, e: 0.3, p: "5 - 6 1' 2' - 1' 6 | 5 - 3 5 6 - - - | 1' - 2' 3' 2' 1' 6 1' | 5 - - - 0 0 3 5 | 6 - 1' 6 5 3 2 3 | 5 - 6 5 3 - 2 1 | 2 - 3 5 6 1' 6 5 | 6 - - - 0 0 0 0 | 3' - 2' 3' 5' - 3' 2' | 1' - 6 1' 2' - - - | 3' 2' 1' 6 5 6 1' 2' | 6 - - - 0 0 5 6 | 1' - 6 5 3 5 6 1' | 2' - 3' 2' 1' 6 5 6 | 5 3 2 3 5 - 6 1' | 5 - - - 0 0 0 0" },
    { i: 'pipa', o: -1, v: 0.1, e: 0.15, p: "1 5 1' 5 2' 5 1' 5 | 1 5 1' 5 3' 5 1' 5 | 6, 3 6 3 1' 3 6 3 | 5, 2 5 2 6 2 5 2" },
    { i: 'bass', u: 8, o: -2, v: 0.2, p: "1 1 | 1 5, | 6, 6, | 5, 5," },
    { d: 1, v: 0.16, p: "w...w...w.w.w... | w...w...w.w.w.ww" },
    { d: 1, v: 0.1, p: "..h...h...h...h." },
    { d: 1, L: 1, v: 0.34, p: "k..hs..hk.khs..h | k..hs..hk.khs.ss" },
    { d: 1, L: 1, v: 0.3, p: "t.......t.....t. | t.......t...t.t." },
    { i: 'pbass', L: 1, o: -2, v: 0.2, p: bars(oct8, ['1', '1', '6,', '5,']) },
    { i: 'sq', L: 1, u: 1, o: 0, v: 0.06, p: rep("1 5 1' 5", 8) + ' ' + rep("6, 3 6 3", 4) + ' ' + rep("5, 2 5 2", 4) },
  ] },
  // 战斗（对决、论道、守山）：方波主音 + 笛，八分低音，鼓组。A 羽，16 小节
  battle: { n: '战 · 交锋', bpm: 140, key: 60, v: [
    { i: 'lead', v: 0.15, e: 0.2, p: "6 - 6 1' 2' - 1' 6 | 3' - 2' 1' 6 - 5 6 | 6 - 6 1' 2' 3' 5' 3' | 2' - 1' 2' 3' - - - | 5' - 3' 2' 1' 2' 3' 5' | 6' - 5' 3' 2' - 1' 2' | 3' 2' 1' 6 5 6 1' 2' | 6 - - - 6 6 0 6 | " + Z(64) },
    { i: 'di', v: 0.2, e: 0.3, p: Z(64) + " | 3' - - - 2' - 3' - | 5' - - - 3' - 2' - | 1' - - 2' 3' - 2' 1' | 6 - - - - - 5 6 | 1' - - - 6 - 1' - | 2' - - 3' 5' - 6' - | 5' 3' 2' 3' 5' 3' 2' 1' | 6 - - - 0 0 0 0" },
    { i: 'pbass', o: -2, v: 0.27, p: bars(oct8, ['6,', '6,', '1', '5,', '1', '2', '3', '6,', '1', '5,', '6,', '6,', '1', '2', '3', '6,']) },
    { i: 'sq', u: 1, o: -1, v: 0.09, p: bars(r => rep(r, 4), ["6 3' 1' 3'", "6 3' 1' 3'", "1' 5' 3' 5'", "5 2' 7 2'", "1' 5' 3' 5'", "2' 6' 5' 6'", "3' 7' 5' 7'", "6 3' 1' 3'"]) },
    { d: 1, v: 0.36, p: "k..hs..hk.k.s.hh | k..hs..hk.khs..h | k..hs..hk.k.s.hh | k..hs..hk.kss.ss" },
    { d: 1, v: 0.3, p: "t............... | ..............t." },
  ] },
  // 首领战：E 弗里几亚（3 为主音，4 是那个压人的小二度），马蹄低音、堂鼓、开头一声大锣。16 小节
  boss: { n: '首领 · 压城', bpm: 152, key: 60, v: [
    { i: 'lead', v: 0.12, e: 0.2, p: "3 - 3 4 3 - 7, 1 | 3 - 3 4 5 - 4 3 | 6 - 6 7 6 - 5 4 | 3 - - - 0 3 4 5 | 6 - 5 4 3 - 4 5 | 6 - 7 1' 7 - 6 5 | 4 - 3 4 5 4 3 2 | 3 - - - 0 0 0 0 | 3' - - 4' 3' - 2' 1' | 7 - - 1' 2' - 3' - | 4' - - 3' 2' - 1' 7 | 6 - 7 - 1' - 2' - | 3' - 5' - 4' - 3' - | 2' - 4' - 3' - 2' - | 1' 7 6 7 1' 2' 3' 4' | 3' - - - 3' 3' 0 3'" },
    { i: 'di', v: 0.1, e: 0.3, p: Z(64) + " | 3' - - 4' 3' - 2' 1' | 7 - - 1' 2' - 3' - | 4' - - 3' 2' - 1' 7 | 6 - 7 - 1' - 2' - | 3' - 5' - 4' - 3' - | 2' - 4' - 3' - 2' - | 1' 7 6 7 1' 2' 3' 4' | 3' - - - 0 0 0 0" },
    { i: 'pbass', u: 1, o: -2, v: 0.24, p: bars(gal, ['3', '3', '6,', '3', '6,', '6,', '4', '3', '3', '7,', '4', '6,', '3', '2', '1', '3']) },
    { i: 'bass', u: 16, o: -2, v: 0.2, p: "3 3 6, 3 6, 6, 4 3 3 7, 4 6, 3 2 1 3" },
    { d: 1, v: 0.36, p: "k.hkshk.k.hkshk. | k.hkshk.k.hkshss" },
    { d: 1, v: 0.34, p: "t.......t.....t. | t.......t..t..tt" },
    { d: 1, v: 0.4, p: 'g' + '.'.repeat(255) },
  ] },
  // 宗门 / 坊市：琵琶主奏、笛子接下半段，一拍一个低音。F 宫，16 小节
  town: { n: '坊市 · 人间', bpm: 112, key: 65, resume: 1, v: [
    { i: 'pipa', v: 0.17, e: 0.2, p: "1' - 6 1' 5 - 3 5 | 6 - 5 6 1' - - - | 2' - 1' 2' 3' 2' 1' 6 | 5 - - - 0 0 5 6 | 1' - 2' 1' 6 5 3 5 | 6 - 1' 6 5 3 2 3 | 5 5 6 5 3 2 1 2 | 1 - - - 0 0 0 0 | " + bars(r => `0 ${r} 0 ${r} 0 ${r} 0 ${r}`, ['5', '3', '6', '5', '5', '3', '6', '5']) },
    { i: 'di', v: 0.16, e: 0.3, p: Z(64) + " | 5' - 3' 5' 6' - 5' 3' | 2' - 3' 2' 1' - - - | 6 - 1' 2' 3' - 2' 1' | 2' - - - 0 0 3' 5' | 6' - 5' 3' 2' 3' 5' 3' | 2' - 1' 6 5 6 1' 2' | 3' 2' 1' 6 5 - 6 1' | 1' - - - 0 0 0 0" },
    { i: 'bass', u: 4, o: -1, v: 0.2, p: "1, 5, 1, 5, | 6,, 3, 6,, 3, | 2, 6, 2, 6, | 5,, 2, 5,, 2," },
    { i: 'pipa', o: 0, v: 0.06, p: bars(r => `0 ${r} 0 ${r} 0 ${r} 0 ${r}`, ['3', '1', '2', '2']) },
    { d: 1, v: 0.16, p: "w...w.w.w...w.w. | w...w.w.w..ww.w." },
    { d: 1, v: 0.12, p: "....o.......o..." },
  ] },
  // 退婚 / 轮回 / 坐化：箫，E 羽，很慢；后八小节箫停，琴在低处把话说完
  sorrow: { n: '退婚 · 低回', bpm: 54, key: 67, v: [
    { i: 'xiao', u: 4, v: 0.22, e: 0.55, p: "6 - - 1' | 2' - 1' 6 | 5 - 6 - | 3 - - - | 6 - 1' 2' | 3' - 2' 1' | 6 - 5 6 | 6 - - - | " + Z(32) },
    { i: 'qin', u: 4, o: -1, v: 0.26, e: 0.35, p: "6, 0 3 0 | 6, 0 2 0 | 5, 0 2 0 | 3, 0 6, 0 | 6, 0 3 0 | 1 0 5 0 | 2 0 3 0 | 6, 3 6 - | 3 - 2 1 | 6, - - - | 1 - 2 3 | 5 - 3 - | 2 - 1 6, | 5, - 6, - | 1 - 2 1 | 6, - - -" },
    { i: 'qin', u: 16, o: -2, v: 0.2, p: Z(8) + " 6, 6, 1 3, 2 5, 1 6," },
    { i: 'pad', u: 32, o: -1, v: 0.05, p: "6, 6, 6, 3," },
  ] },
  // 三年之约 / 入宗 / 守山 / 斩首领：主题提速，笛与方波齐奏，鼓点往前推。D 宫，8 小节
  vow: { n: '三年之约 · 激昂', bpm: 132, key: 62, v: [
    { i: 'di', v: 0.17, e: 0.25, p: "3 5 6 1' 2' - 1' 6 | 5 6 1' 6 5 - 3 - | 2 3 5 6 1' - 6 5 | 3 5 2 3 1 - - - | 3' 5' 6' 5' 3' - 2' 1' | 2' 3' 5' 3' 2' - 1' 6 | 5 6 1' 2' 3' 5' 3' 2' | 1' - - - 1' 1' 0 1'" },
    { i: 'lead', o: -1, v: 0.08, p: "3 5 6 1' 2' - 1' 6 | 5 6 1' 6 5 - 3 - | 2 3 5 6 1' - 6 5 | 3 5 2 3 1 - - - | 1' - - - 5 - - - | 6 - - - 5 - - - | 3 - - - 5 - - - | 5 - 3 - 1 1 0 1" },
    { i: 'pbass', o: -2, v: 0.22, p: bars(oct8, ['1', '6,', '2', '5,', '1', '2', '6,', '1']) },
    { i: 'qin', u: 16, o: -2, v: 0.2, p: "1 6, 2 5, 1 2 6, 1" },
    { d: 1, v: 0.34, p: "k..hs..hk.khs..h | k..hs..hk.khs.ss" },
    { d: 1, v: 0.32, p: "t.............t. | t.......t...t.t." },
  ] },
  // 渡劫 / 破境：堂鼓越敲越密，琵琶轮指压在一个音上，笛子在高处拉长音，升五级（#5）往主音上顶。A 羽，8 小节
  trib: { n: '渡劫 · 天威', bpm: 92, key: 60, v: [
    { i: 'di', u: 4, v: 0.15, e: 0.5, p: "6 - - - | 3' - - 2' | 1' - 7 - | 6 - - - | 6 - 1' 2' | 3' - 5' - | 6' - - #5' | 6' - - -" },
    { i: 'pipa', u: 1, o: -1, v: 0.055, p: bars(r => rep(r, 16), ['6,', '6,', '5,', '6,', '6,', '1', '7,', '6,']) },
    { i: 'bass', u: 16, o: -2, v: 0.22, p: "6, 6, 5, 6, 6, 1 7, 6," },
    { i: 'pad', u: 32, o: -2, v: 0.045, p: "6 3" },
    { d: 1, v: 0.34, p: "t.......t...t... | t...t...t.t.t.tt" },
    { d: 1, v: 0.3, p: 'r' + '.'.repeat(63) },
  ] },
  // 飞升：笛子吹主题，磬的分解往上铺；第二遍磬接过主题，笛子在上面答。D 宫，16 小节
  ascend: { n: '飞升 · 天外', bpm: 76, key: 62, v: [
    { i: 'di', u: 4, v: 0.17, e: 0.5, p: THEME + " | 5' - - - | 6' - 5' - | 3' - 5' - | 2' - - - | 1' - 2' 3' | 5' - - 6' | 5' - 3' 2' | 1' - - -" },
    { i: 'bell', u: 4, o: 1, v: 0.1, e: 0.5, p: Z(32) + ' | ' + THEME },
    { i: 'bell', v: 0.055, e: 0.5, p: "1 5 1' 2' 3' 2' 1' 5 | 6, 3 6 1' 3' 1' 6 3 | 2 5 6 2' 3' 2' 6 5 | 5, 2 5 6 2' 6 5 2" },
    { i: 'pad', u: 16, o: -1, v: 0.07, p: "1 6, 2 5," },
    { i: 'pad', u: 16, o: 0, v: 0.04, p: "5, 3, 6, 2" },
    { i: 'qin', u: 16, o: -2, v: 0.24, e: 0.2, p: "1 6, 2 5," },
    { d: 1, v: 0.2, p: "t............... | ................ | ................ | ..............t." },
  ] },
  // 秘境：D 商，磬的固定音型，箫，远处的鼓。8 小节
  realm: { n: '秘境 · 幽深', bpm: 80, key: 60, resume: 1, v: [
    { i: 'xiao', u: 4, v: 0.16, e: 0.55, p: "2' - - - | 0 0 1' 6 | 5 - - 6 | 2' - - - | 3' - 2' - | 1' - 6 - | 5 - 6 1' | 2' - - -" },
    { i: 'bell', v: 0.06, e: 0.5, p: "2 6 5 6 2' 6 5 6 | 2 6 5 6 1' 6 5 6 | 2 5 3 5 2' 5 3 5 | 1 5 3 5 1' 5 3 5" },
    { i: 'qin', u: 16, o: -2, v: 0.22, e: 0.2, p: "2 2 2 1" },
    { i: 'pad', u: 32, o: -1, v: 0.045, p: "2 6," },
    { d: 1, v: 0.14, p: "t.......t.t....." },
  ] },
  // ---------- 剧情曲（对话场景 / 数据式分镜用：场景的 bgm 字段、台词里的 { bgm: '名字' }）----------
  // 诀别：箫在高处一句一顿，磬远远地应，琴在低处走四个和声。D 羽，很慢，16 小节约 77 秒。末两小节把主题的收句“3 5 2 3 | 1”翻成小调
  farewell: { n: '诀别 · 余音', bpm: 50, key: 65, v: [
    { i: 'xiao', u: 4, v: 0.17, e: 0.6, p: "3' - - 2' | 1' - 6 - | 2' - - 1' | 6 - - - | 3 - 5 6 | 5 - 3 2 | 1 - 2 3 | 6, - - - | 6 - - 5 | 3 - 2 1 | 2 - 3 5 | 3 - - - | 1' - 6 5 | 6 - 3 - | 2 3 1 6, | 6, - - -" },
    { i: 'qin', u: 4, o: -1, v: 0.17, e: 0.35, p: "6, 3 6 3 | 4, 1 4 1 | 5, 2 5 2 | 3, 6, 3 - | 6, 3 6 3 | 4, 1 4 6 | 2, 6, 2 4 | 3, 7, 3 -" },
    { i: 'bell', u: 4, o: 1, v: 0.05, e: 0.65, p: "0 0 6 0 | 0 0 0 3 | 0 0 6 0 | 0 3 0 0" },
    { i: 'pad', u: 32, o: -1, v: 0.05, p: "6, 5, 6, 2," },
  ] },
  // 对峙：低音一拍一顿地压着，琵琶在五度上轮指，堂鼓像心跳；箫只给几个悬着不解决的长音（降二级）。A 羽带 b2，8 小节。留白多，垫在台词下面不抢话
  tense: { n: '对峙 · 弦上', bpm: 84, key: 60, v: [
    { i: 'xiao', u: 4, v: 0.13, e: 0.55, p: "6 - - - | 0 0 b7 - | 6 - - - | 0 0 0 0 | 3' - - - | 0 2' b7 - | 6 - - - | 0 0 0 0" },
    { i: 'pbass', o: -2, v: 0.22, p: "6, 0 6, 0 6, 0 6, 6, | 6, 0 6, 0 6, 0 b7, 6, | 6, 0 6, 0 6, 0 6, 6, | 6, 0 6, 0 3, 0 b7, 6," },
    { i: 'pipa', u: 1, o: -1, v: 0.04, p: bars(r => rep(r, 16), ['3', '3', '3', '4', '3', '3', '2', '3']) },
    { i: 'pad', u: 32, o: -2, v: 0.05, p: "6 6 6 3" },
    { d: 1, v: 0.3, p: "t.......t.t..... | t.......t.t...t." },
    { d: 1, v: 0.12, p: "....w.......w... | ....w.......w.ww" },
  ] },
  // 宿命 / 真相：磬的固定音型不动，低音一级一级往下沉（6 #5 5 #4 4 3 2 3），箫第五小节才进来。B 羽，16 小节；开头一声远锣
  fate: { n: '宿命 · 水落石出', bpm: 60, key: 62, v: [
    { i: 'bell', v: 0.06, e: 0.5, p: "6 3' 1' 3' 6 3' 1' 3' | 6 3' 1' 3' 6 3' 2' 3' | 5 3' 1' 3' 5 3' 1' 3' | #4 3' 1' 3' #4 2' 1' 7 | 4 1' 6 1' 4 1' 6 1' | 3 1' 6 1' 3 7 6 7 | 2 6 4 6 2 6 4 6 | 3 7 #5 7 3 7 #5 7" },
    { i: 'xiao', u: 4, v: 0.17, e: 0.55, p: Z(16) + " | 3' - - 2' | 1' - 7 - | 6 - - 1' | 7 - - - | 3' - - 5' | 4' - 3' 2' | 1' - 7 #5 | 6 - - - | 6 - - - | 0 0 3 - | 6 - - - | 0 0 0 0" },
    { i: 'qin', u: 16, o: -2, v: 0.24, e: 0.25, p: "6 #5 5 #4 4 3 2 3" },
    { i: 'pad', u: 16, o: -1, v: 0.045, p: "6, 6, 5, 6, 4, 3, 2, 3," },
    { d: 1, v: 0.16, p: "t............... | ................ | t.......t....... | ................" },
    { d: 1, v: 0.18, p: 'g' + '.'.repeat(255) },
  ] },
  // 壮阔（大战 / 天门）：主题放宽了吹——笛与方波齐奏，第二遍翻高八度作答；战鼓、铺底的五度、磬的分解。D 宫，16 小节
  epic: { n: '天门 · 壮阔', bpm: 96, key: 62, v: [
    { i: 'di', u: 4, v: 0.17, e: 0.4, p: THEME + " | 5' - 6' 5' | 3' - 2' 1' | 2' 3' 5' 3' | 2' - - - | 3' 5' 6' 1'' | 2'' - 1'' 6' | 5' 6' 3' 2' | 1' - - -" },
    { i: 'lead', u: 4, o: -1, v: 0.07, e: 0.2, p: THEME + " | 5 - - - | 1' - - - | 6 - - - | 5 - - - | 1' - - - | 6 - - - | 5 - 2' - | 1' - - -" },
    { i: 'bell', o: 1, v: 0.04, e: 0.5, p: "1 5 1' 5 2' 5 1' 5 | 6, 3 6 3 1' 3 6 3 | 2 6 2' 6 3' 6 2' 6 | 5, 2 5 2 6 2 5 2" },
    { i: 'pbass', o: -2, v: 0.2, p: bars(r => [r, '0', r, r, r, '0', r, r].join(' '), ['1', '6,', '2', '5,', '1', '2', '6,', '1']) },
    { i: 'pad', u: 16, o: -1, v: 0.08, p: "1 6, 2 5, 1 2 6, 1" },
    { i: 'pad', u: 16, o: 0, v: 0.04, p: "5, 3, 6, 2 5, 6, 3, 5," },
    { d: 1, v: 0.34, p: "t.....t.t...t.t. | t.....t.t.t.tttt" },
    { d: 1, v: 0.18, p: "k...s...k.k.s... | k...s...k.k.s.ss" },
    { d: 1, v: 0.2, p: 'c' + '.'.repeat(127) },
  ] },
  // 温情（道侣 / 洞府夜谈）：琴的分解一直在，箫第三小节才轻轻进来，磬偶尔点一下。G 宫，纯五声，16 小节约 58 秒
  tender: { n: '夜谈 · 灯下', bpm: 66, key: 67, resume: 1, v: [
    { i: 'qin', o: -1, v: 0.2, e: 0.3, p: "1 5 3' 5 1' 5 3' 5 | 6, 3 1' 3 6 3 1' 3 | 2 6 2' 6 3' 6 2' 6 | 5, 2 5 2 6 2 5 2" },
    { i: 'xiao', u: 4, v: 0.17, e: 0.5, p: "0 0 0 0 | 0 0 0 0 | 3' - 2' 1' | 2' - - - | 5 - 6 1' | 2' - 3' - | 2' 1' 6 1' | 5 - - - | 3' - 5' - | 6' - 5' 3' | 2' - 3' 5' | 3' - - - | 2' - 1' 6 | 5 - 6 1' | 2' 3' 2' 1' | 1' - - -" },
    { i: 'bell', u: 4, o: 1, v: 0.04, e: 0.6, p: "0 0 0 5 | 0 0 0 0 | 0 0 0 3 | 0 0 0 0" },
    { i: 'qin', u: 16, o: -2, v: 0.2, e: 0.2, p: "1 6, 2 5," },
    { i: 'pad', u: 32, o: -1, v: 0.04, p: "1 2" },
  ] },
};
function bgmCompile(T) {
  if (T._c) return T._c;
  const C = { sd: 15 / T.bpm, len: 0, v: [] };
  for (const V of T.v) {
    const u = V.u || (V.d ? 1 : 2), P = V.d ? parseD(V.p, u) : parseJ(V.p, u), by = {};
    for (const e of P.ev) (by[Math.floor(e.s)] || (by[Math.floor(e.s)] = [])).push(e);
    C.v.push({ V, len: P.len, by, base: T.key + 12 * (V.o || 0) });
    C.len = Math.max(C.len, P.len);
  }
  return (T._c = C);
}
// 排一步（16 分音符）里所有声部的音
function bgmStep(G, p, step) {
  const C = p.C, sd = C.sd;
  for (let i = 0; i < C.v.length; i++) {
    const X = C.v[i], V = X.V, list = X.by[step % X.len]; if (!list) continue;
    const base = step - (step % X.len);
    for (const e of list) {
      const t = p.t0 + (base + e.s) * sd, acc = (e.s % 16 === 0 ? 1.12 : e.s % 4 === 0 ? 1 : 0.9) * V.v;
      if (V.d) DRUM[e.c] && DRUM[e.c](G, p.bus[i], t, acc);
      else INS[V.i](G, p.bus[i], mf(X.base + e.m), t, e.n * sd * (V.g || 1), acc);
    }
  }
}
// 起一首：每个声部一条小总线（干声 → 曲目增益；按 e 的量送回声）。at 何时开始，fade 淡入秒，from 从第几步起
function bgmPlayer(G, key, at, fade, from) {
  const T = TRACKS[key], C = bgmCompile(T), a = G.a;
  const p = { key, T, C, g: a.createGain(), lay: a.createGain(), bus: [], cur: from || 0, end: 0 };
  p.t0 = at - p.cur * C.sd;
  p.g.gain.setValueAtTime(0.0001, a.currentTime); p.g.gain.setValueAtTime(0.0001, at); p.g.gain.linearRampToValueAtTime(1, at + Math.max(0.02, fade));
  p.g.connect(G.duck); p.lay.gain.value = 0; p.lay.connect(p.g);
  p.wet = a.createGain(); p.wet.connect(G.echo);
  for (const X of C.v) { const b = a.createGain(); b.connect(X.V.L ? p.lay : p.g); if (X.V.e) { const s = a.createGain(); s.gain.value = X.V.e; b.connect(s); s.connect(p.wet); } p.bus.push(b); }
  return p;
}
// ---------- 导演 ----------
const BGM = {
  cur: '', players: [], pos: {}, force: null, pend: '', pendN: 0, fight: false,
  TRACKS,
  // 手动指定一首（o.while() 为假时自动放开；不给就一直到 BGM.auto()）
  play(key, o) { BGM.force = { key, w: o && o.while }; },
  auto() { BGM.force = null; },
  stop() { BGM.force = { key: '' }; },
  scene: () => bgmScene(),
};
const CN_BGM = { tuihun: 'sorrow', ult: 'vow', pojing: 'trib', pact: 'vow', rzong: 'town', boss: 'vow', rival: 'boss', leijie: 'trib', shoushan: 'vow', feisheng: 'ascend', lunhui: 'sorrow' };
const BGM_QUICK = { battle: 1, boss: 1, vow: 1, trib: 1, tense: 1, epic: 1 };
let bgmTown = false;
// 现在该放哪首。只读状态，不改任何东西
function bgmScene() {
  BGM.fight = false;
  if (cn) return CN_BGM[cn.id] || 'vow';
  if (!st) return $('#intro').hidden ? '' : 'sorrow';
  if (cine && !cine.cn) return cine.trib || cine.strikes ? 'trib' : BGM.cur || 'home';
  if (st.p.r >= 9) return 'ascend';
  if (btv && btv.mode === 'boss') return 'boss';
  if (duelFx) return 'battle';
  if (st.run) return 'realm';
  if (st.exp) {
    const B = btv && btv.B;
    if (B && !st.exp.quick && (btv.ph === 'fight' || btv.ph === 'end')) { if (B.foes[0] && B.foes[0].kind === 'boss') return 'boss'; BGM.fight = true; }
    return 'road';
  }
  const m = $('#modal');
  if (m.hidden) bgmTown = false;
  else { const on = m.querySelector('.ktabs[data-kon]'); if (on) bgmTown = on.dataset.kon === 'sect' || on.dataset.kon === 'market'; }   // 分页条（panel-me.js 的 meTabs）写着当前是哪一页；从坊市里再弹出的小卡没有分页条，曲子不变
  return bgmTown ? 'town' : 'home';
}
function bgmSet(key, quick) {
  const G = AU.G, now = G.a.currentTime;
  for (const p of BGM.players) if (!p.end) {
    const out = quick ? 0.3 : 0.9;
    p.end = now + out;
    try { p.g.gain.cancelScheduledValues(now); p.g.gain.setValueAtTime(Math.max(0.0001, p.g.gain.value), now); p.g.gain.linearRampToValueAtTime(0.0001, p.end); } catch (e) { /* ignore */ }
    if (p.T.resume) BGM.pos[p.key] = (p.cur - (p.cur % 16)) % p.C.len;
  }
  BGM.cur = key;
  if (key && TRACKS[key]) BGM.players.push(bgmPlayer(G, key, now + (quick ? 0.12 : 0.5), quick ? 0.06 : 0.8, TRACKS[key].resume ? BGM.pos[key] || 0 : 0));
}
function bgmTick() {
  const G = AU.G; if (!G || AU.paused || G.a.state !== 'running') return;
  const now = G.a.currentTime;
  let want = '';
  if (musOn()) {
    try { want = bgmScene(); } catch (e) { want = BGM.cur; }
    const f = BGM.force; if (f) { if (f.w && !f.w()) BGM.force = null; else want = f.key; }
  }
  if (want !== BGM.cur) {
    const q = !!BGM_QUICK[want] || !want;
    if (BGM.pend !== want) { BGM.pend = want; BGM.pendN = 0; }
    if (q || ++BGM.pendN >= 2) bgmSet(want, q && !!want);   // 不急的换曲要连续两次都这么判，免得弹窗一关一开来回切
  } else BGM.pend = want;
  for (let i = BGM.players.length - 1; i >= 0; i--) {
    const p = BGM.players[i];
    if (p.end && now > p.end + 0.05) { try { p.g.disconnect(); p.wet.disconnect(); } catch (e) { /* ignore */ } BGM.players.splice(i, 1); continue; }
    if (!p.end) p.lay.gain.setTargetAtTime(BGM.fight ? 1 : 0, now, BGM.fight ? 0.06 : 0.45);
    if (p.t0 + p.cur * p.C.sd < now - 0.3) p.cur = Math.ceil((now - p.t0) / p.C.sd);   // 被卡住过（定时器停了）：跳到现在，不补
    while (p.t0 + p.cur * p.C.sd < now + 0.4) { if (p.t0 + p.cur * p.C.sd >= now - 0.02) bgmStep(G, p, p.cur); p.cur++; }
  }
}
// 短乐句响的时候把音乐压下去一会儿
function bgmDuck(sec, k) { const G = AU.G; if (!G) return; const t = G.a.currentTime; G.duck.gain.cancelScheduledValues(t); G.duck.gain.setTargetAtTime(k || 0.3, t, 0.05); G.duck.gain.setTargetAtTime(1, t + sec, 0.4); }
if (!AU.off) setInterval(bgmTick, 150);
// ---------- 音效 ----------
// SX：这一次音效发到哪（平时是实时的图；试听渲染时换成离线的）
let SX = null;
const sxP = (ins, m, dt, dur, v, wet) => INS[ins](SX.G, wet ? SX.G.sfxW : SX.G.sfx, mf(m), SX.t + dt, dur, v);
const sxO = (w, f, dt, dur, v, o) => oPerc(SX.G, SX.G.sfx, w, f, SX.t + dt, dur, v, o);
const sxN = (dt, dur, v, o) => nz(SX.G, SX.G.sfx, SX.t + dt, dur, v, o);
const sxD = (c, dt, v) => DRUM[c](SX.G, SX.G.sfxW, SX.t + dt, v);
const sxArp = (ins, list, dt, gap, dur, v, wet) => list.forEach((m, i) => sxP(ins, m, dt + i * gap, dur, v, wet));
// 一句简谱（年报、章末、胜负的短乐句）
const sxPhrase = (ins, key, sd, p, v, dt, wet) => parseJ(p, 1).ev.forEach(e => sxP(ins, key + e.m, (dt || 0) + e.s * sd, e.n * sd, v, wet));
const sxDuck = (sec, k) => { if (SX.G === AU.G) bgmDuck(sec, k); };
const SFX_DEF = {
  // —— 界面 ——
  tap() { sxO('sine', 1250, 0, 0.05, 0.36, { f2: 900 }); sxO('triangle', 2500, 0, 0.02, 0.09); },
  nav() { sxP('pipa', 74, 0, 0.12, 0.21); sxP('pipa', 81, 0.055, 0.16, 0.18); },
  tab() { sxP('pipa', 78, 0, 0.12, 0.24); },
  open() { sxN(0, 0.12, 0.09, { type: 'bandpass', f: 700, f2: 2600, q: 1.5 }); sxP('qin', 69, 0.02, 0.3, 0.11); sxP('qin', 76, 0.07, 0.3, 0.09); },
  close() { sxN(0, 0.1, 0.07, { type: 'bandpass', f: 2200, f2: 600, q: 1.5 }); sxP('qin', 74, 0, 0.2, 0.08); sxP('qin', 67, 0.05, 0.25, 0.08); },
  unlock() { sxDuck(1.2, 0.5); sxP('qin', 50, 0, 1.2, 0.2); sxO('sine', 147, 0, 1.4, 0.14); sxArp('bell', [74, 78, 81, 86, 90], 0.03, 0.075, 0.5, 0.15, true); sxD('c', 0.33, 0.35); },
  coin() { sxP('bell', 83, 0, 0.2, 0.17); sxP('bell', 88, 0.07, 0.35, 0.17); sxN(0, 0.02, 0.07, { type: 'highpass', f: 6000 }); },
  xp() { sxO('triangle', 660, 0, 0.1, 0.22, { f2: 990 }); sxP('bell', 86, 0.05, 0.15, 0.09); },
  up() { sxArp('pipa', [69, 74, 78], 0, 0.06, 0.16, 0.14); sxP('bell', 81, 0.18, 0.5, 0.14, true); },
  win() { sxArp('lead', [62, 66, 69, 74], 0, 0.075, 0.09, 0.09); sxArp('pipa', [74, 78, 81, 86], 0, 0.075, 0.2, 0.1); sxP('bell', 86, 0.3, 0.7, 0.14, true); sxP('qin', 50, 0, 0.8, 0.16); },
  fail() { sxArp('qin', [64, 60, 57], 0, 0.14, 0.4, 0.17); sxO('sine', 130, 0.28, 0.4, 0.2, { f2: 82 }); sxD('m', 0, 0.3); },
  goal() { sxArp('bell', [74, 78, 81, 86], 0, 0.07, 0.4, 0.14, true); sxP('pipa', 62, 0, 0.3, 0.14); },
  mail() { sxN(0, 0.05, 0.09, { type: 'highpass', f: 2500 }); sxN(0.09, 0.05, 0.09, { type: 'highpass', f: 2500 }); sxP('di', 86, 0.14, 0.09, 0.09); sxP('di', 90, 0.23, 0.16, 0.09); },
  tuna() { sxP('bell', 79, 0, 0.5, 0.2, true); },
  type() { sxO('square', 880, 0, 0.025, 0.08); },
  // —— 大事的短乐句（都截自主题）——
  year() { sxDuck(2.2); sxPhrase('di', 74, 0.11, "3 5 6 1' 2' - 1' 6 5 - - -", 0.13, 0, true); sxPhrase('pipa', 62, 0.11, "3 5 6 1' 2' - 1' 6 5 - - -", 0.1); sxD('w', 0, 0.3); sxArp('bell', [81, 86, 93], 0.88, 0.08, 0.8, 0.1, true); sxP('qin', 45, 0.88, 1.2, 0.18); },
  chapter() { sxDuck(3.2); sxD('t', 0, 0.5); sxPhrase('di', 74, 0.1, "3 5 6 1' 2' - 1' 2' 3' - 5' - 1'' - - - - -", 0.13, 0, true); sxPhrase('lead', 62, 0.1, "3 5 6 1' 2' - 1' 2' 3' - 5' - 1'' - - - - -", 0.06); sxD('t', 1.2, 0.5); sxD('g', 1.2, 0.35); sxD('c', 1.2, 0.4); sxArp('bell', [86, 90, 93, 98], 1.25, 0.07, 0.9, 0.1, true); sxP('qin', 50, 1.2, 1.6, 0.2); },
  victory() { sxDuck(1.8); sxD('t', 0, 0.45); sxPhrase('di', 74, 0.085, "5 1' 2' 3' - 2' 3' 5' - - - -", 0.13, 0, true); sxPhrase('pipa', 62, 0.085, "5 1' 2' 3' - 2' 3' 5' - - - -", 0.1); sxD('t', 0.6, 0.5); sxD('c', 0.6, 0.4); sxArp('bell', [81, 86, 93], 0.62, 0.06, 0.7, 0.1, true); sxP('qin', 50, 0.6, 1.2, 0.18); },
  defeat() { sxDuck(2, 0.4); sxD('t', 0, 0.4); sxPhrase('xiao', 67, 0.13, "6 - 5 3 - 2 - 6, - - - -", 0.16, 0, true); sxP('qin', 40, 0.9, 1.6, 0.2); },
  btOk() { sxDuck(2.4); sxArp('bell', [62, 64, 66, 69, 71, 74, 76, 78, 81], 0, 0.035, 0.3, 0.09, true); sxD('t', 0.34, 0.55); sxD('g', 0.34, 0.4); sxPhrase('di', 74, 0.1, "1' 3' 5' 1'' - - - - - -", 0.14, 0.34, true); sxPhrase('lead', 62, 0.1, "1 3 5 1' - - - -", 0.07, 0.34); sxArp('bell', [86, 90, 93, 98], 0.8, 0.08, 1, 0.1, true); sxP('qin', 38, 0.34, 2, 0.22); },
  btFail() { sxDuck(1.6, 0.4); sxD('t', 0, 0.55); sxN(0, 0.4, 0.3, { type: 'highpass', f: 3000, f2: 800 }); sxArp('pipa', [76, 74, 71, 69, 66, 64, 62, 59], 0.03, 0.05, 0.14, 0.11); sxO('sine', 120, 0.4, 0.8, 0.25, { f2: 50 }); sxN(0.4, 0.9, 0.2, { f: 240, a: 0.1 }); },
  // —— 旧名字（各处在用，保留）——
  gong() { sxD('g', 0, 0.75); },
  thunder() { sxN(0, 1.1, 1, { f: 900, f2: 120 }); sxN(0.02, 0.22, 0.45, { type: 'highpass', f: 3000 }); sxO('sawtooth', 55, 0, 0.7, 0.28, { f2: 38 }); sxO('sine', 80, 0, 0.5, 0.4, { f2: 40 }); },
  rumble() { sxN(0, 1.4, 1, { f: 260, a: 0.3 }); sxO('sine', 62, 0, 1.2, 0.2, { f2: 48, a: 0.3 }); },
  gather() { sxArp('qin', [62, 64, 66, 69, 71, 74], 0, 0.13, 0.4, 0.1); sxArp('bell', [74, 76, 78, 81, 83, 86], 0.02, 0.13, 0.3, 0.04, true); sxN(0, 0.9, 0.045, { type: 'bandpass', f: 800, f2: 3000, q: 2, a: 0.6 }); },
  // 揭晓：品阶 0～6 一路加码（一个音 → 加五度 → 加八度磬 → 琶音 → 垫一声锣）
  reveal(t) {
    t = Math.max(0, Math.min(6, t | 0));
    const n = [62, 64, 66, 69, 71, 74, 76][t];
    sxP('pipa', n, 0, 0.22, 0.22);
    if (t >= 2) sxP('bell', n + 7, 0.08, 0.4, 0.11);
    if (t >= 3) sxP('bell', n + 12, 0.16, 0.6, 0.13, true);
    if (t >= 5) { sxArp('bell', [n + 12, n + 16, n + 19, n + 24], 0.24, 0.07, 0.6, 0.1, true); sxD('c', 0.24, 0.3); }
    if (t >= 6) { sxO('triangle', 98, 0, 1.8, 0.22, { f2: 92 }); sxD('t', 0, 0.35); }
  },
  // —— 战斗 ——
  hit() { sxO('sine', 190, 0, 0.09, 0.36, { f2: 70 }); sxN(0, 0.05, 0.22, { type: 'highpass', f: 2500 }); },
  slash() { sxN(0, 0.11, 0.5, { type: 'bandpass', f: 5000, f2: 900, q: 1.2 }); },
  // 技能：出手的破空声 + 五行各自的落点（金 铮、木 笃笃、水 咕咚、火 呼、土 轰）
  skill(el) {
    if (el === 'jin') { sxN(0, 0.09, 0.2, { type: 'bandpass', f: 6000, f2: 1500, q: 1.5 }); sxO('triangle', 2093, 0.06, 0.32, 0.1); sxO('sine', 3136, 0.06, 0.2, 0.06); sxN(0.06, 0.05, 0.18, { type: 'highpass', f: 6000 }); }
    else if (el === 'mu') { sxN(0, 0.09, 0.18, { type: 'bandpass', f: 1800, f2: 700, q: 2 }); sxO('sine', 620, 0.06, 0.07, 0.3, { f2: 520 }); sxO('sine', 780, 0.13, 0.06, 0.22, { f2: 660 }); sxP('qin', 57, 0.06, 0.3, 0.1); }
    else if (el === 'shui') { sxO('sine', 500, 0, 0.12, 0.24, { f2: 1100 }); sxO('sine', 700, 0.08, 0.12, 0.2, { f2: 1500 }); sxN(0, 0.22, 0.12, { type: 'bandpass', f: 1200, f2: 2400, q: 3 }); }
    else if (el === 'huo') { sxN(0, 0.28, 0.3, { f: 400, f2: 3200, a: 0.02 }); sxO('sawtooth', 110, 0.02, 0.22, 0.11, { f2: 220 }); sxN(0.1, 0.12, 0.14, { type: 'highpass', f: 4000 }); }
    else if (el === 'tu') { sxO('sine', 110, 0, 0.28, 0.45, { f2: 42 }); sxN(0, 0.18, 0.32, { f: 320 }); sxN(0.05, 0.1, 0.1, { type: 'bandpass', f: 900, q: 1 }); }
    else { SFX_DEF.slash(); sxO('sine', 190, 0.05, 0.09, 0.3, { f2: 70 }); }
  },
  ke() { sxO('pulse', 1175, 0, 0.08, 0.1); sxO('pulse', 1568, 0.06, 0.16, 0.1); sxP('bell', 91, 0.06, 0.2, 0.07); },
  beike() { sxO('sine', 240, 0, 0.08, 0.34, { f2: 180 }); sxN(0, 0.05, 0.25, { f: 600 }); },
  crit() { sxN(0, 0.04, 0.28, { type: 'highpass', f: 5000 }); sxO('pulse', 1760, 0, 0.1, 0.1); sxO('pulse', 2637, 0.03, 0.14, 0.08); },
  shieldCut() { sxP('bell', 93, 0, 0.15, 0.19); sxN(0, 0.03, 0.12, { type: 'highpass', f: 7000 }); },
  shieldBreak() { sxN(0, 0.3, 0.32, { type: 'highpass', f: 3500 }); sxArp('bell', [100, 96, 91, 88], 0, 0.04, 0.2, 0.1, true); sxO('sine', 160, 0, 0.12, 0.25, { f2: 60 }); },
  charge() { sxO('pulse', 233, 0, 0.12, 0.17); sxO('pulse', 220, 0.16, 0.12, 0.17); sxO('pulse', 233, 0.32, 0.22, 0.17); sxD('T', 0, 0.4); sxD('T', 0.16, 0.4); sxD('T', 0.32, 0.5); },
  brk() { sxN(0, 0.2, 0.3, { type: 'highpass', f: 6000 }); sxO('triangle', 2637, 0, 0.5, 0.1); sxO('square', 1760, 0, 0.3, 0.05); sxD('t', 0, 0.6); sxD('g', 0.02, 0.4); },
  ult() { sxDuck(1.2, 0.5); sxN(0, 0.32, 0.22, { type: 'bandpass', f: 300, f2: 4000, q: 1, a: 0.28 }); sxO('pulse', 220, 0, 0.32, 0.1, { f2: 880 }); SX.t += 0.3; SFX_DEF.thunder(); sxD('g', 0, 0.45); sxArp('bell', [86, 93, 98], 0, 0.05, 0.8, 0.1, true); SX.t -= 0.3; },
  hurt() { sxO('sine', 140, 0, 0.1, 0.4, { f2: 60 }); sxN(0, 0.04, 0.25, { f: 1200 }); },
  heavy() { sxD('t', 0, 0.8); sxN(0, 0.2, 0.36, { f: 700 }); sxO('sawtooth', 90, 0, 0.25, 0.14, { f2: 40 }); },
  heal() { sxArp('bell', [74, 78, 81], 0, 0.06, 0.3, 0.1, true); sxO('sine', 660, 0, 0.3, 0.07, { f2: 1320 }); },
  flee() { sxN(0, 0.25, 0.32, { type: 'bandpass', f: 2500, f2: 500, q: 1 }); sxArp('pipa', [74, 71, 69, 66], 0, 0.04, 0.1, 0.15); },
  kill() { sxN(0, 0.18, 0.3, { f: 1800, f2: 300 }); sxO('sine', 300, 0, 0.15, 0.22, { f2: 80 }); },
  // —— 翻牌（COMBAT_LOOT §5.5）：第 i 张沿五声音阶上行，一路翻过去是一句上行的旋律；星越多，上面叠的音越多 ——
  flip(i, star) {
    const n = 74 + [0, 2, 4, 7, 9, 12, 14][Math.max(0, Math.min(6, i | 0))];
    sxN(0, 0.035, 0.13, { type: 'highpass', f: 3000 });
    sxP('pipa', n, 0.02, 0.2, 0.2); sxP('bell', n + 12, 0.03, 0.18, 0.06);
    if (star >= 1) sxP('bell', n + 4, 0.09, 0.4, 0.11, true);
    if (star >= 2) { sxP('bell', n + 7, 0.16, 0.5, 0.11, true); sxP('bell', n + 12, 0.23, 0.6, 0.1, true); sxD('c', 0.16, 0.25); }
  },
  shiver() { sxArp('bell', [98, 101, 98, 101], 0, 0.045, 0.06, 0.07); },   // 带星的牌背抖一下
  roll() { for (let k = 0; k < 9; k++) sxD('T', 0.6 * (1 - Math.pow(1 - k / 9, 1.6)), 0.2 + k * 0.04); },   // ★★★ 翻开前那 0.6 秒
  star(i) { sxP('bell', 86 + [0, 4, 7][Math.max(0, Math.min(2, i | 0))], 0, 0.4, 0.18, true); sxN(0, 0.03, 0.18, { type: 'highpass', f: 5000 }); sxD('T', 0, 0.4); },
  jackpot() { sxDuck(1.6, 0.4); sxD('g', 0, 0.7); sxD('t', 0, 0.5); sxD('c', 0.02, 0.45); sxArp('bell', [74, 78, 81, 86, 90, 93], 0.04, 0.06, 0.7, 0.12, true); sxP('qin', 50, 0, 1.4, 0.2); },
  beam() { sxO('sine', 523, 0, 0.45, 0.08, { f2: 1046 }); sxArp('bell', [81, 88], 0.05, 0.1, 0.5, 0.07, true); },
  // —— 炼器 ——
  hammer() { sxO('triangle', 1480, 0, 0.25, 0.15); sxO('sine', 2217, 0, 0.18, 0.09); sxO('sine', 3729, 0, 0.08, 0.05); sxN(0, 0.04, 0.26, { type: 'highpass', f: 3000 }); sxO('sine', 160, 0, 0.08, 0.32, { f2: 70 }); },
  forgeOk(lv) { SFX_DEF.hammer(); sxArp('bell', (lv | 0) >= 7 ? [78, 81, 86, 90, 93] : (lv | 0) >= 4 ? [78, 81, 86, 90] : [78, 81, 86], 0.12, 0.07, 0.5, 0.12, true); if ((lv | 0) >= 7) sxD('c', 0.12, 0.35); },
  forgeFail() { sxO('sine', 220, 0, 0.15, 0.3, { f2: 110 }); sxN(0, 0.1, 0.2, { f: 900 }); sxArp('pipa', [66, 63], 0.12, 0.12, 0.2, 0.11); },
  infuse() { sxArp('bell', [86, 81, 88, 93], 0, 0.09, 0.6, 0.11, true); sxN(0, 0.8, 0.07, { type: 'bandpass', f: 1500, f2: 5000, q: 3, a: 0.4 }); sxO('sine', 330, 0, 0.7, 0.07, { f2: 660 }); },
  reforge() { sxD('w', 0, 0.28); sxD('w', 0.07, 0.28); sxD('w', 0.14, 0.34); sxP('bell', 88, 0.2, 0.4, 0.13, true); },
  // —— 过场（cine2.js 的 CSFX 按名字调）——
  drum() { sxD('t', 0, 0.85); },
  wardrum() { sxD('t', 0, 0.85); sxD('T', 0.27, 0.3); },
  tear() { sxN(0, 0.3, 0.4, { type: 'highpass', f: 2500, f2: 5000 }); sxN(0.08, 0.2, 0.3, { type: 'bandpass', f: 2600, q: 1 }); },
  paper() { sxN(0, 0.16, 0.36, { type: 'bandpass', f: 3200, q: 0.8 }); },
  clang() { sxN(0, 0.2, 0.3, { type: 'highpass', f: 6000 }); sxO('square', 1760, 0, 0.3, 0.05); sxO('triangle', 2637, 0.01, 0.5, 0.09); sxO('sine', 3520, 0.02, 0.25, 0.05); },
  bell() { sxP('bell', 72, 0, 2, 0.24, true); sxP('bell', 60, 0, 2, 0.12); },
  luo() { sxO('triangle', 620, 0, 0.9, 0.2, { f2: 760, ft: 0.12 }); sxO('sine', 1240, 0, 0.5, 0.06, { f2: 1520, ft: 0.12 }); sxN(0, 0.3, 0.14, { type: 'bandpass', f: 3000, q: 1 }); },
  wind() { sxN(0, 1.8, 0.4, { type: 'bandpass', f: 400, f2: 900, q: 0.7, a: 0.5 }); },
  // —— 剧情（talk.js：对话场景与数据式分镜）——
  heart() { sxO('sine', 58, 0, 0.16, 0.6, { f2: 40 }); sxO('sine', 52, 0.2, 0.22, 0.45, { f2: 34 }); },   // 心跳：咚、咚（抉择之前、揭晓之前）
  slash() { sxN(0, 0.16, 0.5, { type: 'bandpass', f: 5200, f2: 900, q: 1.2 }); sxO('triangle', 1900, 0.01, 0.12, 0.08, { f2: 500 }); },   // 挥剑：一道破空
  sting() { sxDuck(1.6, 0.2); sxP('qin', 40, 0, 1.4, 0.3); sxP('qin', 46, 0.02, 1.2, 0.2); sxN(0, 0.5, 0.2, { f: 300, f2: 90 }); },   // 转折：低处一声闷弦，音乐让一下
  boom() { sxDuck(1.2, 0.35); sxO('sine', 90, 0, 0.9, 0.7, { f2: 30, ft: 0.3 }); sxN(0, 0.6, 0.35, { f: 260, f2: 60 }); sxD('t', 0, 0.5); },   // 重击：一声闷雷似的落地（真相砸下来、山门震动）
  shine() { sxArp('bell', [86, 91, 93, 98], 0, 0.07, 0.9, 0.11, true); sxN(0, 0.5, 0.05, { type: 'highpass', f: 6000 }); },   // 微光：一串上行的磬（信物亮起、心意相通）
  whoosh() { sxN(0, 0.34, 0.7, { type: 'bandpass', f: 500, f2: 2600, q: 0.9, a: 0.1 }); },   // 掠过：衣袂 / 身影一闪
  fire() { sxN(0, 0.5, 0.16, { type: 'bandpass', f: 1400, f2: 500, q: 0.8, a: 0.2 }); sxN(0.12, 0.05, 0.14, { type: 'highpass', f: 3500 }); sxN(0.31, 0.04, 0.1, { type: 'highpass', f: 4200 }); },   // 火堆噼啪
};
const sfxLast = {};
const SFX = {};
for (const k in SFX_DEF) SFX[k] = function () {
  const G = AU.G; if (!G || AU.paused || !sfxOn() || G.a.state === 'closed') return;
  const now = performance.now(); if (now - (sfxLast[k] || 0) < 40) return; sfxLast[k] = now;
  SX = { G, t: G.a.currentTime + 0.004 };
  try { SFX_DEF[k].apply(null, arguments); } catch (e) { /* 没声音就算了 */ }
};
// 面板开 / 关：一关一开连着的（换页）不出声
let swTimer = 0;
function sfxPanel(open) {
  if (AU.off) return;
  if (open) { if (swTimer) { clearTimeout(swTimer); swTimer = 0; } else SFX.open(); }
  else { clearTimeout(swTimer); swTimer = setTimeout(() => { swTimer = 0; SFX.close(); }, 70); }
}
// 飘字里的“灵石 + / 修为 +”：跟着响一下
function sfxFloat(text) { if (AU.off) return; text = String(text); if (/灵石\s*\+|\+\s*[\d.]+[万亿]?\s*灵石/.test(text)) SFX.coin(); else if (/修为\s*\+|\+\s*[\d.]+[万亿]?\s*修为/.test(text)) SFX.xp(); }
// 纸鹤进信：在外时一口气来好几只，1.5 秒内只响一次
let mailAt = 0;
function sfxMail() { const now = performance.now(); if (now - mailAt < 1500) return; mailAt = now; SFX.mail(); }
// 旧接口：直接给频率的一声（保留给零散的调用）
function tone(f, t0, dur, type, vol) { const G = AU.G; if (!G || AU.paused || !sfxOn()) return; oPerc(G, G.sfx, type || 'square', f, G.a.currentTime + (t0 || 0), dur, vol || 0.2, { a: 0.008 }); }
function noise(t0, dur, vol, cutoff) { const G = AU.G; if (!G || AU.paused || !sfxOn()) return; nz(G, G.sfx, G.a.currentTime + (t0 || 0), dur, vol || 0.4, { f: cutoff || 1200 }); }
// ---------- 开关、音量、后台 ----------
function auSetVol(which, lv) { lv = Math.max(0, Math.min(5, lv | 0)); if (which === 'm') AU.mv = lv; else AU.sv = lv; auApply(); savePref(); }
function auPause(on) {
  AU.paused = on;
  if (!AC) return;
  if (on) AC.suspend().catch(() => {}); else if (!document.hidden) AC.resume().catch(() => {});
}
document.addEventListener('pointerdown', () => ac(), true);
document.addEventListener('keydown', () => ac(), true);
document.addEventListener('visibilitychange', () => auPause(document.hidden));
window.addEventListener('pagehide', () => auPause(true));
window.addEventListener('pageshow', () => auPause(document.hidden));
window.addEventListener('focus', () => { if (AU.paused && !document.hidden) auPause(false); });
// 声音三态：ART.icon('snd_on' 全开 | 'snd_sfx' 仅音效 | 'snd_off' 静音)，16×16 按整数倍放大；没有新美术时退回旧 10×10 图标
function setSoundIcon() { auApply(); const b = $('#btnSound'); if (!b) return; b.innerHTML = artIcon(['snd_on', 'snd_sfx', 'snd_off'][soundMode], 20) || iconHTML(['note', 'sound', 'mute'][soundMode]); b.setAttribute('aria-label', ['声音：音乐与音效', '声音：仅音效', '声音：静音'][soundMode]); }
// ---------- 试听 / 测试：离线渲染成 PCM（tools/audio_render.js 存成 wav）----------
// what：曲目名，或 'sfx:名字[:参数,参数]'；o: { sec, fight 带战斗层, sr }
async function auRender(what, o) {
  o = o || {};
  const score = o.loop && TRACKS[what] ? bgmCompile(TRACKS[what]) : null;
  const sr = o.sr || 44100, sec = score ? score.sd * score.len : o.sec || 20;
  const a = new OfflineAudioContext(2, Math.ceil(sr * sec), sr), G = auGraph(a);
  G.sfx.gain.value = AU.SFX * auVol(3); G.mus.gain.value = AU.MUS * auVol(3);
  if (/^sfx:/.test(what)) { const [, k, arg] = what.split(':'); SX = { G, t: 0.02 }; SFX_DEF[k].apply(null, arg ? arg.split(',').map(x => (isNaN(+x) ? x : +x)) : []); }
  else {
    const p = bgmPlayer(G, what, score ? 0 : 0.05, 0.05, 0);
    if (o.fight) p.lay.gain.value = 1;
    const n = score ? score.len : Math.floor((sec - 0.1) / p.C.sd);
    for (let s = 0; s < n; s++) bgmStep(G, p, s);
  }
  const buf = await a.startRendering();
  return { sr, l: buf.getChannelData(0), r: buf.getChannelData(1) };
}
// 谱子自查：每个声部的长度是不是整小节、小节线是不是落在整小节上
function auLint() {
  const bad = [];
  for (const k in TRACKS) TRACKS[k].v.forEach((V, i) => {
    const u = V.u || (V.d ? 1 : 2);
    V.p.split('|').forEach((b, j) => { const n = V.d ? parseD(b, u).len : parseJ(b, u).len; if (n % 16) bad.push(`${k}#${i} 第 ${j + 1} 段 ${n} 步`); });
  });
  return bad;
}
window.__xm_audio = { AU, BGM, SFX, TRACKS, render: auRender, lint: auLint, get ctx() { return AC; }, setVol: auSetVol };
