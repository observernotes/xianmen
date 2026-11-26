/* 废柴仙途 · 数据式分镜（docs/STORY_PLAN.md §8）：结局过场 ㉖～㉝、结契 ㉞ 两版（D 线）
 * 播放器在 src/ui/cine2.js，数据 → 镜头的转换在 src/ui/talk.js（cnFromData）。本文件挂 window.XM_CINE_DATA = 画图工具 => { 段 id: 数据 }，
 * talk.js 载入时取一次，同名的段盖掉它自带的那一版。镜头字段见 talk.js “数据式分镜”一节；这里多用到的几样：
 *   bgm 这一镜起换曲（'' = 静下来）、paint(g, t) 画在世界层、top(g, t) 画在屏幕层、cut / sub / if 可以是函数（按这一世的走法换人、换词）。
 * 每个结局都按“一部短片的最后一幕”排：① 一个安静的开场画面 → ② 人 → ③ 黑屏字幕（画面里的字，一字一字落）→ ④ 结局画面 + 题字 → ⑤ 余韵（一个小物件、一句后来）。
 * 音乐的规矩：开场先静或只留风声，那一句话落定了再进曲子；余韵那一镜换回最轻的那首。字幕 ≤ 12 字。 */
(function (root) {
'use strict';
root.XM_CINE_DATA = function (A) {
  const ART = A.ART, K = A.k, ease = A.ease;
  const fnt = (g, size) => { g.font = `${size}px XPixel, monospace`; g.textBaseline = 'middle'; g.textAlign = 'left'; };
  // 画面里的字：居中排好，一字一字落（at 起，per 毫秒一字）；o = { at, per, size, col, a }
  const cap = (g, t, s, y, o) => {
    o = o || {}; const at = o.at || 0; if (t < at) return;
    const size = o.size || 12, n = Math.min(s.length, Math.floor((t - at) / (o.per || 120)) + 1);
    fnt(g, size); const w = g.measureText(s).width, x = Math.round(100 - w / 2), part = s.slice(0, n);
    const al = g.globalAlpha; g.globalAlpha = al * (o.a === undefined ? 1 : o.a);
    g.fillStyle = '#06050c'; g.fillText(part, x + 1, y + 1); g.fillStyle = o.col || '#f6ecd0'; g.fillText(part, x, y);
    g.globalAlpha = al;
  };
  const fill = (g, col, a) => { g.globalAlpha = a === undefined ? 1 : Math.max(0, Math.min(1, a)); g.fillStyle = col; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; };
  const black = g => fill(g, '#06050c', 1);
  const white = (g, t, at, d, col) => { if (t > at) fill(g, col || '#fff6e0', K(t, at, d)); };
  // 粒子：往上飘的光点 / 雪 / 雨 / 往下落的花
  const rise = (g, t, col, n, sp) => { for (let i = 0; i < (n || 30); i++) { const x = (i * 53 + 17) % 200 + Math.sin(t / 900 + i) * 3, y = 122 - ((t * (sp || 0.012) * (1 + i % 3) + i * 29) % 130); g.globalAlpha = 0.25 + 0.3 * (i % 3); g.fillStyle = i % 4 ? col : '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); } g.globalAlpha = 1; };
  const snow = (g, t, n) => { for (let i = 0; i < (n || 60); i++) { const x = ((i * 37 + t * 0.006 * (1 + i % 3)) % 210) - 5, y = ((i * 23 + t * 0.012 * (1 + i % 2)) % 124) - 2; g.fillStyle = i % 4 ? '#e8f0ff' : '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); } };
  const rain = (g, t, n) => { g.globalAlpha = 0.45; g.fillStyle = '#b8c8e8'; for (let i = 0; i < (n || 46); i++) { const x = ((i * 41 + t * 0.02) % 206) - 3, y = ((i * 29 + t * 0.19 * (1 + (i % 3) * 0.2)) % 126) - 3; g.fillRect(Math.round(x), Math.round(y), 1, 3); } g.globalAlpha = 1; };
  const fall = (g, t, cols, n) => { for (let i = 0; i < (n || 26); i++) { const x = ((i * 47 + t * 0.008 + Math.sin(t / 700 + i) * 6) % 208) - 4, y = ((i * 31 + t * 0.016 * (1 + i % 2)) % 126) - 3; g.fillStyle = cols[i % cols.length]; g.fillRect(Math.round(x), Math.round(y), 2, 1); } };
  // 一盏一盏亮起来的灯：pts = [[x, y]]
  const lamps = (g, t, pts, at, per) => pts.forEach(([x, y], i) => { const k = K(t, at + i * per, 300); if (k <= 0) return; g.globalAlpha = 0.22 * k; g.fillStyle = '#ffd36b'; g.fillRect(x - 3, y - 3, 7, 7); g.globalAlpha = 0.5 * k; g.fillRect(x - 2, y - 2, 5, 5); g.globalAlpha = k; g.fillStyle = (t / 400 + i) % 5 < 0.6 ? '#ffb23f' : '#fff2a8'; g.fillRect(x - 1, y - 1, 3, 3); g.globalAlpha = 1; });
  // 跪着 / 站起来的一路人（up: 0 跪 → 1 站）
  const crowd = (g, col, up, y0, rows) => { for (let r = 0; r < (rows || 3); r++) for (let i = 0; i < 9; i++) for (const side of [-1, 1]) {
    const x = 100 + side * (20 + i * 9 + r * 3), y = (y0 || 104) + r * 6 - i, lift = Math.round(4 * ease(up - ((i + r) % 4) * 0.08));
    g.fillStyle = A.mix(col, '#1b1326', r === 0 ? 0.2 : 0.45); g.fillRect(x - 2, y - 5 - lift, 5, 5 + lift); g.fillStyle = '#e8bc94'; g.fillRect(x - 1, y - 8 - lift, 3, 3); g.fillStyle = '#2a2230'; g.fillRect(x - 1, y - 9 - lift, 3, 1);
  } };
  // 主角的背影（小小的一个，站在门前）：深色长发、道袍、背后一柄剑
  const meStand = (g, x, y) => { const M = A.me(), hair = (M.look && M.look.hair) || '#2a2230';
    g.fillStyle = '#3a4a8a'; g.fillRect(x - 3, y - 9, 7, 9); g.fillStyle = '#2a3668'; g.fillRect(x - 4, y - 3, 9, 3); g.fillStyle = '#e8ecf8'; g.fillRect(x - 3, y - 5, 7, 1);
    g.fillStyle = hair; g.fillRect(x - 2, y - 14, 5, 6); g.fillRect(x - 1, y - 15, 3, 1); g.fillStyle = '#aeb8c8'; g.fillRect(x + 3, y - 12, 1, 9); };
  const st = () => A.st() || {};
  const fl = f => !!(st().eflags && st().eflags[f]);
  const sectCol = () => { const s = st(); const sc = (s.sect && L.sectOf && L.sectOf(s)) || L.SECTS[0]; return sc.color || '#4aa8ff'; };
  const L = A.L;
  // 题字：结局画面上那一枚印（落在画面下沿，不挡人）
  const title = (s, col, at) => ({ seal: s, sealCol: col, sealAt: at || 1500, sealSize: 18, sealY: 100 });

  // 敲门那一夜（㉔ 的回声）：道侣两个结局的第一镜共用
  const doorShot = { bg: 'cg:door:0', frames: [[0, 'cg:door:0'], [1700, 'cg:door:1']], cam: 'push', ms: 4400, bgm: '', fade: 800, sub: '“明天，还回来吗？”', sfx: [[300, 'wind'], [1700, 'bell']] };
  const notBack = { ms: 3200, paint: (g, t) => { black(g); cap(g, t, '不用回来了。', 56, { at: 500, per: 170, size: 14 }); }, sfx: [[500, 'heart']] };

  return {
    // ㉞ 结契（抉择三之后的结契之礼 story_daolv 收场；苏版 / 夜版。场景里的 cine 写 'jieqi_{daolv}'）
    // 两版都落在各自那句口头禅上：苏的“诊金”这回记一辈子的账；夜的“骗你的”这回没有说。
    jieqi_su: { n: '结契·药香', no: '㉞', grp: 'shi', bgm: 'home', thumb: 'herb', shots: [
      { bg: 'herb', tint: ['#ff9a4a', 0.2], cam: 'panR', ms: 4400, bgm: '', fade: 900, paint: (g, t) => fall(g, t, ['#ffffff', '#ffd0d8', '#bfe8c8'], 22), sub: '“客人都走了。”', sfx: [[200, 'wind'], [2400, 'bell']] },
      { bg: 'herb', tint: ['#ff9a4a', 0.2], dim: 0.45, ms: 4200, cut: { who: 'su', mood: 'ang', side: 'r' }, sub: '“一筐萝卜，两只鸡。亏了。”', sfx: [[300, 'paper']] },
      { ms: 5200, paint: (g, t) => { black(g); cap(g, t, '合卺酒，是她泡的药酒。'.replace('她', st().p && st().p.look && st().p.look.f ? '他' : '她'), 48, { at: 300, per: 130 }); cap(g, t, '喝完，手脚都是暖的。', 68, { at: 2400, per: 130, col: '#ffd36b' }); }, sfx: [[2400, 'heart'], [3100, 'heart']] },
      { bg: 'herb', tint: ['#ff9a4a', 0.2], dim: 0.5, ms: 4600, bgm: 'home', cut: { who: 'su', mood: 'n', fx: 'blush', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 1200 }, sub: '“往后的诊金，照算。”', sfx: [[300, 'reveal']] },
      Object.assign({ bg: 'herb', tint: ['#ff9a4a', 0.2], dim: 0.5, ms: 5200, cut: { who: 'su', mood: 'joy', fx: 'blush', side: 'r', y: 30 }, paint: (g, t) => fall(g, t, ['#ffffff', '#ffd0d8'], 18), sub: '“……记一辈子的账。”', sfx: [[1800, 'bell'], [2600, 'drum']] }, { seal: '结契', sealCol: '#c8323c', sealAt: 2600, sealSize: 20, sealY: 96 }),
      { bg: 'cg:door:1', dim: 0.55, ms: 4600, fade: 900, paint: (g, t) => { cap(g, t, '从此，', 46, { at: 500, per: 200, size: 14 }); cap(g, t, '有人等你回家。', 68, { at: 1500, per: 170, size: 14, col: '#ffd36b' }); }, sfx: [[1500, 'bell']] }] },
    jieqi_ye: { n: '结契·红绳', no: '㉞', grp: 'shi', bgm: 'home', thumb: 'lantern', shots: [
      { bg: 'lantern', cam: 'panL', ms: 4400, bgm: '', fade: 900, paint: (g, t) => { lamps(g, t, [[176, 100], [150, 108], [128, 98], [104, 110], [82, 100], [58, 108], [36, 98], [14, 106]], 300, 320); rise(g, t, '#ffb23f', 14, 0.006); }, sub: '“满河的灯。”', sfx: [[200, 'wind'], [2400, 'bell']] },
      { bg: 'lantern', dim: 0.45, ms: 4200, cut: { who: 'ye', mood: 'joy', side: 'r' }, sub: '“拜什么天地。拜酒。”', sfx: [[300, 'clang']] },
      { ms: 5200, paint: (g, t) => { black(g); cap(g, t, '一坛酒，两只碗。', 48, { at: 300, per: 130 }); cap(g, t, '坛口缠着红绳。', 68, { at: 2200, per: 150, col: '#ff6a7a' });
        if (t > 3300) { const k = K(t, 3300, 1200), n = Math.round(60 * k); g.fillStyle = '#c8323c'; for (let i = 0; i < n; i++) g.fillRect(70 + i, 88 + Math.round(Math.sin(i / 5) * 2), 1, 1); } }, sfx: [[2200, 'heart'], [2900, 'heart']] },
      { bg: 'lantern', dim: 0.5, ms: 4600, bgm: 'home', cut: { who: 'ye', mood: 'joy', fx: 'blush', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 1200 }, sub: '“喝了，就是我的人。”', sfx: [[300, 'reveal']] },
      Object.assign({ bg: 'lantern', dim: 0.5, ms: 5400, bgm: '', cut: { who: 'ye', mood: 'sad', fx: 'blush', side: 'r', y: 30 }, paint: (g, t) => rise(g, t, '#ff8a9a', 16, 0.008), sub: '“……这句，不骗你。”', sfx: [[600, 'heart'], [2000, 'bell'], [2800, 'drum']] }, { seal: '结契', sealCol: '#8a1e3a', sealAt: 2800, sealSize: 20, sealY: 96 }),
      { bg: 'end:daolv_ye', dim: 0.5, cam: 'pull', ms: 4800, fade: 900, bgm: 'home', top: (g, t) => { cap(g, t, '从此，屋顶上', 44, { at: 500, per: 170, size: 14 }); cap(g, t, '常有两个人。', 66, { at: 1800, per: 170, size: 14, col: '#ffd36b' }); }, sfx: [[1800, 'bell']] }] },

    // ㉖ 师徒同归：三千年前他倒在门前，这回有人背着他上来
    end_shitu: { n: '结局·师徒同归', no: '㉖', bgm: 'ascend', thumb: 'end:shitu', shots: [
      { bg: 'heaven', cam: 'panUp', ms: 4600, bgm: '', fade: 900, paint: (g, t) => { rise(g, t, '#fff2a8', 24); meStand(g, 100, 112, 1); }, sfx: [[200, 'wind'], [2600, 'bell']] },
      { bg: 'heaven', dim: 0.5, ms: 3600, cut: { who: 'elder', mood: 'n', side: 'l' }, sub: '“比想的小。”' },
      { bg: 'trib3k', dim: 0.6, ms: 5600, paint: (g, t) => { rain(g, t, 40); cap(g, t, '三千年前，他倒在这扇门前。', 50, { at: 400, per: 130 }); cap(g, t, '身后，站着自己的徒弟。', 70, { at: 2900, per: 130 }); }, sfx: [[300, 'rumble'], [2900, 'heart'], [3500, 'heart']] },
      { bg: 'heaven', dim: 0.45, ms: 5400, bgm: 'ascend', cut: { who: 'elder', mood: 'joy', side: 'l', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'r', y: 62, at: 1100 }, sub: '“这回，本座看着你渡完。”', sfx: [[300, 'reveal']] },
      Object.assign({ bg: 'end:shitu', cam: 'push', ms: 6400, paint: (g, t) => rise(g, t, '#fff2a8', 30, 0.016), top: (g, t) => white(g, t, 5200, 1200), sfx: [[400, 'gather'], [1500, 'win']] }, title('师徒同归', '#b8862a')),
      { bg: 'cg:sword:1', dim: 0.35, ms: 4200, fade: 900, bgm: 'home', shake: [[900, 220, 2]], sub: '“轻点！本座的腰！”', sfx: [[900, 'clang']] }] },

    // ㉗ 问天：穿过门缝，看见卷，劈卷
    end_wentian: { n: '结局·问天', no: '㉗', bgm: 'boss', thumb: 'end:wentian', shots: [
      { bg: 'heaven', cam: (u) => ({ x: 100, y: 56, z: 1 + 2.2 * ease(u) }), ms: 3200, bgm: '', fade: 600, top: (g, t) => white(g, t, 2300, 900, '#ffffff'), sfx: [[200, 'wind'], [2300, 'gather']] },
      { bg: 'void', cam: 'panR', ms: 5200, fade: 900, paint: (g, t) => { const W = [['废柴', 26, 30], ['弃徒', 150, 28], ['逆徒', 40, 86], ['魔头', 160, 84]]; W.forEach(([s, x, y], i) => A.seal(g, s, x, y, 10, t - 900 - i * 800, '#a81e3a')); }, sub: '“每一张，都批过朱字。”', sfx: [[900, 'paper'], [1700, 'paper'], [2500, 'paper'], [3300, 'paper'], [300, 'rumble']] },
      { bg: 'void', cam: (u) => ({ x: 104, y: 56, z: 1.2 + 0.7 * ease(u) }), ms: 4400, sub: '“正中那张，是空白的。”', paint: (g, t) => { if (t > 2600) cap(g, t, '留给你的。', 100, { at: 2600, per: 160, col: '#ffd36b' }); }, sfx: [[400, 'heart'], [1200, 'heart'], [2600, 'sting']] },
      { bg: 'void', dim: 0.55, ms: 3800, cut: { who: 'me', mood: 'cold', side: 'l', y: 8 }, cut2: () => (fl('yun_codex') ? { who: 'yun', mood: 'joy', side: 'r', y: 62, at: 1300 } : fl('elder_kept') ? { who: 'elder', mood: 'joy', side: 'r', y: 62, at: 1300 } : null), sub: '“它们出题，从不改卷。”', sfx: [[300, 'drum']] },
      { ms: 3400, paint: (g, t) => { black(g); cap(g, t, '那就，', 48, { at: 300, per: 200, size: 14 }); cap(g, t, '换我出一题。', 70, { at: 1500, per: 170, size: 16, col: '#ffd36b' }); }, sfx: [[300, 'drum'], [1500, 'drum'], [2400, 'heart']] },
      Object.assign({ bg: 'end:wentian', ms: 6400, bgm: 'vow', bgmAt: 250, lines: '#c8fff0', flash: [200, 520], shake: [[200, 800, 6]], paint: (g, t) => { if (t > 200 && t < 620) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(30, 118); g.lineTo(30 + 160 * K(t, 200, 180), 118 - 116 * K(t, 200, 180)); g.stroke(); } rise(g, t, '#c8fff0', 26, 0.02); }, sfx: [[200, 'slash'], [260, 'clang'], [520, 'thunder'], [2000, 'bell']] }, title('问天', '#2a6a8a', 2000)),
      { bg: 'void', dim: 0.72, ms: 4600, fade: 900, bgm: 'home', paint: (g, t) => { rise(g, t, '#8ab4e8', 20); cap(g, t, '三千年来头一回，', 50, { at: 500, per: 130 }); cap(g, t, '有人把卷子交了回去。', 70, { at: 1900, per: 130 }); }, sub: () => (fl('elder_kept') ? '“劈得好！——再来！”' : fl('yun_codex') ? '“一共九个。我替你数着。”' : ''), sfx: [[1900, 'bell']] }] },

    // ㉘ 守人间：门关上，下山，修屋顶
    end_dixian: { n: '结局·守人间', no: '㉘', bgm: 'home', thumb: 'end:dixian', shots: [
      { bg: 'heaven', cam: 'panDown', ms: 4600, bgm: '', fade: 800, paint: (g, t) => { A.dim(g, 0.55 * K(t, 1600, 2400), '#0a0818'); meStand(g, 100, 112, 1); }, sub: '“门等了一会儿。”', sfx: [[200, 'wind'], [3400, 'drum']] },
      { ms: 2800, paint: (g, t) => { black(g); cap(g, t, '然后，关上了。', 58, { at: 300, per: 170, size: 14 }); }, sfx: [[1500, 'heart']] },
      { bg: 'lantern', cam: 'panL', ms: 4800, bgm: 'home', fade: 900, paint: (g, t) => lamps(g, t, [[188, 22], [170, 30], [152, 26], [134, 34], [116, 30], [98, 38], [80, 34], [62, 42], [44, 38], [26, 46]], 300, 380), sub: '“山下有灯。”', sfx: [[300, 'bell'], [2100, 'bell'], [3900, 'bell']] },
      { bg: 'temple', tint: ['#ffb23f', 0.16], ms: 4600, shake: [[900, 120, 1], [1500, 120, 1], [2100, 120, 1]],
        cut: () => { const s = st(); return s.daolv === 'su' ? { who: 'su', mood: 'joy', side: 'r', y: 50, at: 2400 } : s.daolv === 'ye' ? { who: 'ye', mood: 'joy', side: 'r', y: 50, at: 2400 } : fl('elder_kept') ? { who: 'elder', mood: 'joy', side: 'r', y: 50, at: 2400 } : null; },
        sub: () => { const s = st(); return s.daolv === 'su' ? '“瓦铺歪了。——诊金另算。”' : s.daolv === 'ye' ? '“修好了？那我上去坐坐。”' : fl('elder_kept') ? '“没出息。……左边再钉一块。”' : '“屋顶，得修。”'; }, sfx: [[900, 'hit'], [1500, 'hit'], [2100, 'hit']] },
      Object.assign({ bg: 'end:dixian', cam: 'push', ms: 6000, paint: (g, t) => rise(g, t, '#ffd36b', 14, 0.006), sfx: [[500, 'reveal'], [1500, 'bell']] }, title('守人间', '#3d7a5a')),
      { bg: 'temple', tint: ['#ffb23f', 0.22], ms: 4800, fade: 900, paint: (g, t) => { rain(g, t, 38); lamps(g, t, [[58, 96]], 1400, 1); cap(g, t, '后来每到下雨天，', 34, { at: 500, per: 130 }); cap(g, t, '那盏灯，亮得特别早。', 52, { at: 1900, per: 130, col: '#ffd36b' }); }, sfx: [[200, 'wind'], [1900, 'bell']] }] },

    // ㉙ 孤峰：账都讨回来了，没有人来送
    end_gufeng: { n: '结局·孤峰', no: '㉙', bgm: 'sorrow', thumb: 'end:gufeng', shots: [
      { bg: 'heaven', cam: 'pull', ms: 4800, bgm: '', fade: 900, paint: (g, t) => meStand(g, 100, 112, 1), sub: '“没有人来送。”', sfx: [[200, 'wind'], [2600, 'wind']] },
      { ms: 6200, paint: (g, t) => { black(g); cap(g, t, '休书，念了。', 36, { at: 300, per: 140 }); cap(g, t, '仇人，杀了。', 54, { at: 1700, per: 140 }); cap(g, t, '欠你的，都讨回来了。', 72, { at: 3100, per: 140 }); cap(g, t, '账本上，没有一个活人。', 94, { at: 4500, per: 110, col: '#8a849c', size: 10 }); }, sfx: [[300, 'paper'], [1700, 'slash'], [3100, 'paper'], [4500, 'heart']] },
      { bg: 'stele', dim: 0.62, ms: 3600, bgm: 'sorrow', cut: { who: 'tianheng', mood: 'sad', fx: 'mono', side: 'r' }, sub: '“他站得太高，”', sfx: [[500, 'bell']] },
      { bg: 'heaven', dim: 0.62, ms: 4200, bgm: '', cut: { who: 'me', mood: 'cold', fx: 'shade', side: 'l', col: '#55506e' }, sub: '“从没回头看过我。”', sfx: [[1800, 'heart'], [2500, 'heart']] },
      Object.assign({ bg: 'end:gufeng', cam: 'pull', ms: 7000, paint: (g, t) => snow(g, t, 70), sfx: [[200, 'wind'], [3000, 'wind'], [1500, 'bell']] }, title('孤峰', '#3a3a5a')),
      { ms: 5400, fade: 900, paint: (g, t) => { black(g); snow(g, t, 24); cap(g, t, '你没有回头。', 50, { at: 600, per: 190, size: 14 }); cap(g, t, '也没有人，在等你回头。', 76, { at: 2900, per: 130, col: '#8a849c', size: 10 }); }, sfx: [[200, 'wind']] }] },

    // ㉚ 魔尊：血海之上多了一把椅子
    end_mozun: { n: '结局·魔尊', no: '㉚', bgm: 'boss', thumb: 'end:mozun', shots: [
      { bg: 'blood', cam: 'panUp', ms: 4400, bgm: '', fade: 900, paint: (g, t) => rise(g, t, '#ff5a4a', 34, 0.018), sfx: [[200, 'rumble'], [2200, 'rumble']] },
      { ms: 4000, paint: (g, t) => { black(g); cap(g, t, '檄文七条。头一条：', 46, { at: 300, per: 120, col: '#b8b0cc' }); cap(g, t, '“本可为正。”', 68, { at: 1800, per: 200, size: 14, col: '#ff6a5a' }); }, sfx: [[300, 'paper'], [1800, 'sting']] },
      { bg: 'blood', dim: 0.5, ms: 3600, bgm: 'boss', cut: { who: 'me', mood: 'n', fx: 'shade', side: 'l', col: '#8a1020' }, sub: '“正道容不下我。”', sfx: [[400, 'drum'], [1000, 'drum']] },
      { bg: 'blood', ms: 4800, cam: 'panDown', paint: (g, t) => crowd(g, '#8a1020', 0, 108, 3), cut: () => (st().daolv === 'ye' ? { who: 'ye', mood: 'joy', side: 'r', y: 8, at: 1500 } : { who: 'xue', mood: 'n', side: 'r', y: 8, at: 1500 }), sub: () => (st().daolv === 'ye' ? '“魔尊大人，今晚谁做饭？”' : '“师弟。——不。尊上。”'), sfx: [[200, 'wardrum'], [800, 'wardrum'], [1400, 'wardrum']] },
      Object.assign({ bg: 'end:mozun', cam: 'push', ms: 6200, flash: [300], shake: [[300, 500, 4]], tint: ['#4a0a14', 0.12], paint: (g, t) => rise(g, t, '#ff5a4a', 24, 0.02), sub: '“那就，换个天下。”', sfx: [[300, 'gong'], [1800, 'drum']] }, title('魔尊', '#6a0a18', 1800)),
      { bg: 'blood', dim: 0.74, ms: 5000, fade: 900, bgm: 'sorrow', paint: (g, t) => { cap(g, t, '血池边新立了一条规矩：', 48, { at: 500, per: 120, col: '#b8b0cc' }); cap(g, t, '不许碰别家的孩子。', 70, { at: 2400, per: 150, size: 14 }); }, sfx: [[2400, 'bell']] }] },

    // ㉛ 道侣同升·药香
    end_daolv_su: { n: '结局·药香', no: '㉛', bgm: 'ascend', thumb: 'end:daolv_su', shots: [
      doorShot, notBack,
      { bg: 'end:daolv_su', cam: 'panR', ms: 4800, bgm: 'ascend', fade: 900, paint: (g, t) => fall(g, t, ['#ffffff', '#bfe8c8', '#ffd0d8'], 26), sfx: [[300, 'bell']] },
      { bg: 'heaven', dim: 0.5, ms: 4600, cut: { who: 'su', mood: 'n', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 900 }, sub: '“上面，有没有病人？”', sfx: [[300, 'reveal']] },
      { bg: 'heaven', dim: 0.5, ms: 4200, cut: { who: 'su', mood: 'joy', fx: 'blush', side: 'r', y: 36 }, sub: '“你的诊金，记一辈子。”', sfx: [[1400, 'bell']] },
      Object.assign({ bg: 'cg:two:#7fd8b0', cam: 'push', ms: 6200, paint: (g, t) => rise(g, t, '#fff2a8', 22, 0.014), top: (g, t) => white(g, t, 5000, 1200), sfx: [[500, 'win']] }, title('同去', '#3d7a5a')),
      { bg: 'herb', ms: 4800, fade: 900, bgm: 'home', paint: (g, t) => { fall(g, t, ['#ffffff', '#ffd0d8'], 18); A.dim(g, 0.25); cap(g, t, '后来，云上常有药香。', 26, { at: 500, per: 140 }); }, sfx: [[500, 'bell']] }] },
    // ㉛ 道侣同升·红月
    end_daolv_ye: { n: '结局·红月', no: '㉛', bgm: 'ascend', thumb: 'end:daolv_ye', shots: [
      doorShot, notBack,
      { bg: 'end:daolv_ye', cam: 'panR', ms: 4800, bgm: 'ascend', fade: 900, paint: (g, t) => rise(g, t, '#ff8a9a', 22, 0.01), sfx: [[300, 'bell']] },
      { bg: 'heaven', dim: 0.5, ms: 4600, cut: { who: 'ye', mood: 'joy', side: 'r', y: 8 }, cut2: { who: 'me', mood: 'joy', side: 'l', y: 62, at: 900 }, sub: '“我赌你不敢松手。”', sfx: [[300, 'reveal']] },
      { bg: 'heaven', dim: 0.5, ms: 4200, cut: { who: 'ye', mood: 'sad', fx: 'blush', side: 'r', y: 36 }, sub: '“往后不骗了。……偶尔骗。”', sfx: [[1400, 'bell']] },
      Object.assign({ bg: 'cg:two:#a81e3a', cam: 'push', ms: 6200, paint: (g, t) => rise(g, t, '#ffb8c0', 22, 0.014), top: (g, t) => white(g, t, 5000, 1200), sfx: [[500, 'win']] }, title('同去', '#8a1e3a')),
      { bg: 'end:daolv_ye', dim: 0.3, cam: (u) => ({ x: 140, y: 34, z: 1.5 - 0.3 * u }), ms: 4800, fade: 900, bgm: 'home', paint: (g, t) => rise(g, t, '#ff8a9a', 14, 0.008), top: (g, t) => cap(g, t, '后来，天上多了一轮红月。', 100, { at: 500, per: 140 }), sfx: [[500, 'bell']] }] },

    // ㉜ 掌宗飞升：印留在案上，山门下跪了一路
    end_summit: { n: '结局·掌宗飞升', no: '㉜', bgm: 'ascend', thumb: 'bd:summit', shots: [
      { bg: 'hall', cam: 'push', ms: 4400, bgm: '', fade: 900, sub: '“宗主印，留在案上。”', sfx: [[300, 'bell'], [2400, 'paper']] },
      { ms: 3000, paint: (g, t) => { black(g); cap(g, t, '印下压着一张纸。', 58, { at: 300, per: 150 }); }, sfx: [[300, 'paper']] },
      { bg: 'gate', cam: 'panUp', ms: 5000, paint: (g, t) => crowd(g, sectCol(), K(t, 2600, 1600), 110, 3), sub: '“都起来。地上凉。”', sfx: [[200, 'wardrum'], [900, 'wardrum'], [2600, 'bell']] },
      { bg: 'gate', dim: 0.5, ms: 4200, bgm: 'ascend', paint: (g, t) => crowd(g, sectCol(), 1, 110, 3), cut: { who: 'me', mood: 'joy', side: 'l' }, sub: '“山门在，我在。”', sfx: [[300, 'reveal']] },
      Object.assign({ bg: 'bd:summit', cam: 'push', ms: 6200, paint: (g, t) => rise(g, t, '#fff2a8', 26, 0.016), top: (g, t) => white(g, t, 5000, 1200), sfx: [[500, 'win']] }, title('掌宗飞升', '#b8862a')),
      { bg: 'gate', ms: 5200, fade: 900, bgm: 'home', paint: (g, t) => { A.dim(g, 0.3); const x = 100, y = 112 - Math.round(26 * K(t, 300, 4600)); g.fillStyle = '#6a5a4a'; g.fillRect(x - 1, y - 5, 4, 5); g.fillStyle = '#e8bc94'; g.fillRect(x, y - 8, 3, 3); g.fillStyle = '#2a2230'; g.fillRect(x, y - 9, 3, 1); cap(g, t, '后来，山门立了条新规矩：', 22, { at: 500, per: 120 }); cap(g, t, '入门，不验灵根。', 42, { at: 2500, per: 160, size: 14, col: '#ffd36b' }); }, sfx: [[2500, 'bell']] }] },

    // ㉝ 止戈（副标签，接在主结局过场后面）
    end_zhige: { n: '止戈', no: '㉝', bgm: 'home', thumb: 'end:zhige', shots: [
      { bg: 'field', cam: 'pull', ms: 4200, bgm: '', fade: 900, sub: '“那一年，没有打起来。”', sfx: [[200, 'wardrum'], [1600, 'wind']] },
      Object.assign({ bg: 'end:zhige', cam: 'push', ms: 5200, bgm: 'home', paint: (g, t) => fall(g, t, ['#ffffff', '#c8b8ff', '#ffd0d8'], 20), sub: '“两面旗，插在一处。”', sfx: [[400, 'bell']] }, title('止戈', '#3d7a5a')),
      { bg: 'end:zhige', dim: 0.3, cam: (u) => ({ x: 146, y: 70, z: 1.7 }), ms: 4600, fade: 900, paint: (g, t) => { const n = Math.floor(14 * K(t, 400, 3200)); for (let i = 0; i < n; i++) { const y = 110 - i * 4, x = 144 + Math.round(Math.sin(i * 1.3) * 2); g.fillStyle = '#3d8a4a'; g.fillRect(x, y, 2, 4); if (i % 3 === 2) { g.fillStyle = i % 2 ? '#c8a8ff' : '#ff9ac8'; g.fillRect(x + (i % 2 ? 2 : -2), y, 2, 2); } } }, top: (g, t) => cap(g, t, '后来，旗杆上缠了牵牛花。', 104, { at: 500, per: 130 }), sfx: [[500, 'bell']] }] },
  };
};
if (typeof module !== 'undefined' && module.exports) module.exports = [];
})(typeof window !== 'undefined' ? window : globalThis);

/* ===== A 线：主线过场 ⑭～⑰、⑳、㉒、㉔ 的纯数据版（挂 window.CINE_DATA_X，talk.js 并进 CINE_DATA：同名的盖掉底稿）。
 * 纯数据，不画图；要画东西的（结局）用上面的 XM_CINE_DATA。 ===== */
(function (root) {
'use strict';
const X = root.CINE_DATA_X = root.CINE_DATA_X || {};
const VISITOR = 'any:daolv:any|aff:su>=60|aff:ye>=60|aff:chu>=60|aff:ge>=60|aff:bai>=60|aff:mo>=60';   // 飞升前夜有没有人来敲门（与 story_ascend 的判断一致）
Object.assign(X, {
  // ⑭ 夜半黑衣（story_r2 之前）：窗前的剪影 → 伸向戒指的手 → 墨色与金色两条特写带上下对切
  heiyi: { n: '夜半黑衣', no: '⑭', bgm: 'realm', thumb: 'cave', shots: [
    { bg: 'cave', dim: 0.55, cam: 'panR', ms: 3200, sfx: [[200, 'wind'], [1800, 'heart']] },
    { bg: 'cg:ring:0', tint: ['#0a0818', 0.35], cam: 'push', ms: 3000, sub: '“给我。”', sfx: [[300, 'gather'], [1500, 'heart']] },
    { bg: 'cave', dim: 0.65, ms: 3600, flash: [900], cut: { who: 'mo', mood: 'n', fx: 'shade', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', side: 'l', y: 62, at: 900 }, sub: '“墨家。”', shake: [[900, 300, 3]], sfx: [[900, 'clang']] }] },
  // ⑮ 万剑低眉（story_boss5 之前）
  wanjian: { n: '万剑低眉', no: '⑮', bgm: 'sorrow', thumb: 'ink', shots: [
    { bg: 'ink', cam: 'panR', ms: 4000, sfx: [[200, 'wind']] },
    { bg: 'ink', ms: 3000, lines: '#1b1326', linesAt: 400, flash: [400], shake: [[400, 500, 3]], sfx: [[400, 'clang'], [700, 'clang'], [1000, 'clang'], [1900, 'bell']] },
    { bg: 'ink', dim: 0.35, cam: 'push', ms: 4400, cut: { who: 'elder', mood: 'sad', fx: 'tear', side: 'l' }, sub: '“本座回来晚了。”', sfx: [[2600, 'bell']] }] },
  // ⑯ 半块玉简（story_r4 之前）
  yujian: { n: '半块玉简', no: '⑯', bgm: 'sorrow', thumb: 'cg:jade:0', shots: [
    { bg: 'cg:jade:0', cam: 'push', ms: 4000, sub: '“祖训只有一句。”', sfx: [[300, 'reveal']] },
    { bg: 'cave', dim: 0.6, ms: 4000, cut: { who: 'mo', mood: 'sad', side: 'r' }, sub: '“可曾信过墨离？”', sfx: [[400, 'drum'], [2200, 'heart']] },
    { bg: 'cave', dim: 0.6, ms: 3400, flash: [300], cut: { who: 'elder', mood: 'ang', fx: 'shade', side: 'l', at: 300 }, sub: '“那个逆徒，也配问？”', shake: [[300, 500, 5]], sfx: [[300, 'thunder']] }] },
  // ⑰ 祖师画像（story_r5 之前）
  huaxiang: { n: '祖师画像', no: '⑰', bgm: 'boss', thumb: 'tjgate', shots: [
    { bg: 'gate', cam: 'panUp', ms: 4000, sfx: [[200, 'wardrum'], [1400, 'paper']] },
    { bg: 'gate', dim: 0.6, cam: 'push', ms: 4400, cut: { who: 'tianheng', mood: 'n', fx: 'mono', side: 'r', y: 8 }, cut2: { who: 'elder', mood: 'ang', fx: 'shade', side: 'l', y: 62, at: 1200 }, sub: '“陆、天、衡。”', sfx: [[1200, 'drum'], [1700, 'drum'], [2200, 'drum']] },
    { bg: 'cg:jade:0', tint: ['#0a0818', 0.3], ms: 4000, flash: [300], lines: '#8ff0d0', linesAt: 1400, sub: '“本座的好大徒弟。”', shake: [[300, 500, 5]], sfx: [[300, 'tear'], [1400, 'reveal']] }] },
  // ⑳ 九百级石阶（story_r7 之前）：第二镜换成并肩上阶的两个背影
  shijie: { n: '九百级石阶', no: '⑳', bgm: 'vow', thumb: 'tjgate', shots: [
    { bg: 'tjgate', cam: 'panUp', ms: 5000, sub: '“这阵，是本座教的。”', sfx: [[200, 'wind'], [1200, 'rumble']] },
    { bg: 'cg:two:#55506e', cam: 'push', ms: 3600, sfx: [[300, 'drum'], [1000, 'drum'], [1700, 'drum'], [2400, 'drum']] },
    { bg: 'stele', dim: 0.2, ms: 4000, sub: '“问剑，天剑宗。”', shake: [[600, 400, 3]], sfx: [[600, 'gong']] }] },
  // ㉒ 玄霄重铸（ch_sword_6 之后）
  chongzhu: { n: '玄霄重铸', no: '㉒', bgm: 'vow', thumb: 'cg:sword:1', shots: [
    { bg: 'cg:sword:0', cam: 'panR', ms: 4000, sfx: [[500, 'clang'], [1700, 'clang'], [2900, 'clang']] },
    { bg: 'cg:sword:0', ms: 2800, lines: '#8ff0d0', flash: [300, 1100, 1900], shake: [[300, 300, 4], [1100, 300, 4], [1900, 300, 5]], sfx: [[300, 'hit'], [1100, 'hit'], [1900, 'hit']] },
    { bg: 'cg:sword:1', cam: 'pull', ms: 5000, flash: [200], sub: '“剑里，空着一块。”', sfx: [[300, 'reveal'], [3000, 'bell']] }] },
  // ㉔ 最后的访客（story_ascend 之前）：没有人来的时候，门一直关着
  fangke: { n: '最后的访客', no: '㉔', bgm: 'home', thumb: 'cg:door:0', shots: [
    { bg: 'cg:door:0', cam: 'push', ms: 4000, sfx: [[300, 'wind']] },
    { if: VISITOR, bg: 'cg:door:1', ms: 5000, sub: '“明天，还回来吗？”', sfx: [[400, 'tap'], [900, 'tap'], [1800, 'bell']] },
    { if: '!' + VISITOR, bg: 'cg:door:0', dim: 0.3, ms: 5000, sub: '没有人来。', sfx: [[600, 'wind']] }] },
});
})(typeof window !== 'undefined' ? window : globalThis);
