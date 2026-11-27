// 试听：把每首曲子和每个音效用 OfflineAudioContext 渲染成 wav。node tools/audio_render.js [outdir] [只渲染名字里带这些词的，逗号分隔]
// 顺便自查：谱子每段是不是整小节（__xm_audio.lint）、各条的峰值 / 均方根（dBFS）、页面有没有报错。
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const out = process.argv[2] || path.join(__dirname, '..', 'shots', 'audio');
const only = process.argv[3] ? process.argv[3].split(',') : null;
const fullLoop = process.argv.includes('--loop');
fs.mkdirSync(out, { recursive: true });
const SEC = { home: 95, road: 42, battle: 30, boss: 28, town: 36, sorrow: 74, vow: 16, trib: 24, ascend: 54, realm: 26, farewell: 80, tense: 26, fate: 68, epic: 44, tender: 62 };
const SFX_ARG = { reveal: ['0', '3', '4', '6'], skill: ['jin', 'mu', 'shui', 'huo', 'tu', ''], flip: ['0,0', '1,1', '2,2'], star: ['0', '2'], forgeOk: ['2', '8'] };
function wav(l, r, sr) {
  const n = l.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(l[i] * 32767))), 44 + i * 4); b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(r[i] * 32767))), 46 + i * 4); }
  return b;
}
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html') + '?audio=1');
  await page.waitForTimeout(400);
  const lint = await page.evaluate(() => window.__xm_audio.lint());
  console.log(lint.length ? 'LINT FAIL\n  ' + lint.join('\n  ') : 'lint ok');
  const names = await page.evaluate(() => ({ t: Object.keys(window.__xm_audio.TRACKS), s: Object.keys(window.__xm_audio.SFX) }));
  const jobs = [];
  for (const k of names.t) { jobs.push(['bgm_' + k, k, { sec: SEC[k] || 30 }]); if (k === 'road') jobs.push(['bgm_road_fight', k, { sec: 20, fight: true }]); }
  for (const k of names.s) for (const a of SFX_ARG[k] || [null]) jobs.push(['sfx_' + k + (a === null ? '' : '_' + (a.replace(',', '-') || 'none')), 'sfx:' + k + (a === null ? '' : ':' + a), { sec: /year|chapter|victory|defeat|btOk|btFail|gong|jackpot|bell|ult|unlock|thunder|wind|rumble|gather|brk/.test(k) ? 4 : 1.6 }]);
  for (const [fn, what, o] of jobs) {
    if (only && !only.some(x => fn.includes(x))) continue;
    const r = await page.evaluate(async ([what, o]) => {
      const x = await window.__xm_audio.render(what, o);
      let pk = 0, sq = 0; for (let i = 0; i < x.l.length; i++) { const v = Math.abs(x.l[i]); if (v > pk) pk = v; sq += v * v; }
      const enc = f => { const u = new Uint8Array(f.buffer); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
      return { sr: x.sr, pk, rms: Math.sqrt(sq / x.l.length), l: enc(x.l), r: enc(x.r) };
    }, [what, { ...o, loop: fullLoop }]);
    const dec = s => { const bf = Buffer.from(s, 'base64'); return new Float32Array(bf.buffer, bf.byteOffset, bf.length / 4); };
    fs.writeFileSync(path.join(out, fn + '.wav'), wav(dec(r.l), dec(r.r), r.sr));
    const db = v => (20 * Math.log10(Math.max(1e-6, v))).toFixed(1);
    console.log(`${fn.padEnd(22)} peak ${db(r.pk).padStart(6)} dB  rms ${db(r.rms).padStart(6)} dB`);
  }
  console.log(errs.length ? 'PAGE ERRORS\n' + errs.join('\n') : 'no page errors');
  await b.close();
  process.exit(lint.length || errs.length ? 1 : 0);
})();
