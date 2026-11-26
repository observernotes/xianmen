/* 废柴仙途 · 界面片段 audio：音效与音乐
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE。 */
// ---------- 音效 ----------
let AC = null, master = null, musicGain = null;
function ac() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      master = AC.createGain(); master.gain.value = 0.22; master.connect(AC.destination);
      musicGain = AC.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
    } catch (e) { AC = null; }
  }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
function tone(f, t0, dur, type, vol, dest) {
  if (soundMode === 2 && dest !== 'music') return;
  const a = AC; if (!a || a.state !== 'running') return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'square';
  const t = a.currentTime + (t0 || 0);
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol || 0.2, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(dest === 'music' ? musicGain : master);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t0, dur, vol, cutoff) {
  if (soundMode === 2) return;
  const a = AC; if (!a || a.state !== 'running') return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
  const g = a.createGain(); g.gain.value = vol || 0.4;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(a.currentTime + (t0 || 0));
}
const SFX = {
  tap() { tone(740, 0, 0.05, 'square', 0.08); },
  coin() { tone(988, 0, 0.06, 'square', 0.12); tone(1318, 0.06, 0.12, 'square', 0.12); },
  up() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.06, 0.1, 'square', 0.1)); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.09, 0.2, 'square', 0.16)); tone(1046, 0.38, 0.6, 'triangle', 0.2); tone(1568, 0.38, 0.6, 'triangle', 0.1); },
  fail() { [392, 330, 262, 196].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.22)); },
  thunder() { noise(0, 0.9, 0.7, 700); tone(48, 0, 0.6, 'sawtooth', 0.18); },
  rumble() { noise(0, 1.2, 0.25, 220); },
  gather() { [392, 440, 523, 587, 659].forEach((f, i) => tone(f, i * 0.15, 0.25, 'triangle', 0.1)); },
  gong() { tone(98, 0, 2.2, 'triangle', 0.4); tone(196, 0, 1.6, 'sine', 0.2); tone(293, 0.05, 1.2, 'sine', 0.1); },
  reveal(t) { const base = [330, 392, 440, 523, 659, 784, 988][Math.max(0, Math.min(6, t))]; tone(base, 0, 0.15, 'square', 0.12); if (t >= 3) tone(base * 1.5, 0.1, 0.3, 'triangle', 0.14); if (t >= 5) [1, 1.25, 1.5, 2].forEach((m, i) => tone(base * m, 0.2 + i * 0.08, 0.3, 'triangle', 0.12)); },
  goal() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.14, 'square', 0.1)); },
  hit() { noise(0, 0.08, 0.25, 2600); tone(180, 0, 0.06, 'square', 0.08); },
  slash() { tone(1400, 0, 0.05, 'sawtooth', 0.03); },
  // 翻牌（COMBAT_LOOT §5.5）：第 i 张、几颗星。音高按翻的顺序沿五声音阶上行，一路翻过去是一句上行的旋律；
  // 无星 do、★ mi、★★ sol、★★★ 高八度 do + 锣（SFX.jackpot）
  flip(i, star) {
    const base = 392 * Math.pow(2, [0, 2, 4, 7, 9, 12, 14][Math.max(0, Math.min(6, i | 0))] / 12);
    const f = base * Math.pow(2, [0, 4, 7, 12][Math.max(0, Math.min(3, star | 0))] / 12);
    noise(0, 0.05, 0.12, 3200);
    tone(f, 0.02, 0.16, 'square', 0.12); tone(f * 2, 0.04, 0.12, 'triangle', 0.05);
    if (star >= 2) tone(f * 1.5, 0.12, 0.3, 'triangle', 0.1);
  },
  shiver() { tone(1760, 0, 0.03, 'square', 0.03); tone(2093, 0.05, 0.03, 'square', 0.025); },   // 带星的牌背抖一下
  star(i) { tone(1046 * Math.pow(2, [0, 4, 7][Math.max(0, Math.min(2, i | 0))] / 12), 0, 0.12, 'square', 0.12); noise(0, 0.03, 0.15, 5000); },
  jackpot() { tone(98, 0, 2.2, 'triangle', 0.35); tone(196, 0, 1.6, 'sine', 0.18); [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, 0.05 + i * 0.07, 0.35, 'triangle', 0.12)); noise(0, 0.5, 0.25, 1800); },
  beam() { [523, 784, 1046].forEach((f, i) => tone(f, i * 0.05, 0.4, 'sine', 0.08)); },
};
const SCALE = [0, 2, 4, 7, 9];
const MELODY = (() => {
  let s = 11; const rr = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let p = 7;
  for (let i = 0; i < 64; i++) { if (i % 8 === 7) { out.push(-1); continue; } p += Math.round((rr() - 0.5) * 4); p = Math.max(3, Math.min(12, p)); out.push(rr() < 0.18 ? -1 : p); }
  return out;
})();
let musicStep = 0, musicNext = 0;
function musicTick() {
  if (soundMode !== 0 || !AC || AC.state !== 'running') return;
  const a = AC;
  if (musicNext < a.currentTime) musicNext = a.currentTime + 0.05;
  while (musicNext < a.currentTime + 0.4) {
    const n = MELODY[musicStep % MELODY.length];
    const t0 = musicNext - a.currentTime;
    if (n >= 0) { const midi = 60 + 12 * Math.floor(n / 5) + SCALE[n % 5]; const f = 440 * Math.pow(2, (midi - 69) / 12); tone(f, t0, 0.9, 'triangle', 0.07, 'music'); tone(f * 2, t0, 0.25, 'sine', 0.02, 'music'); }
    if (musicStep % 8 === 0) { const root = [48, 45, 43, 50][(musicStep / 16 | 0) % 4]; tone(440 * Math.pow(2, (root - 69) / 12), t0, 2.4, 'sine', 0.06, 'music'); }
    musicStep++; musicNext += 0.42;
  }
}
setInterval(musicTick, 120);
document.addEventListener('pointerdown', () => ac(), true);
// 声音三态：ART.icon('snd_on' 全开 | 'snd_sfx' 仅音效 | 'snd_off' 静音)，16×16 按整数倍放大；没有新美术时退回旧 10×10 图标
function setSoundIcon() { const b = $('#btnSound'); if (!b) return; b.innerHTML = artIcon(['snd_on', 'snd_sfx', 'snd_off'][soundMode], 20) || iconHTML(['note', 'sound', 'mute'][soundMode]); b.setAttribute('aria-label', ['声音：音乐与音效', '声音：仅音效', '声音：静音'][soundMode]); }
