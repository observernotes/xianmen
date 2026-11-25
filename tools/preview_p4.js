// 美术预览 · 阶段四“界面补缺”（由 preview.html 载入；?only=g11 看全部，g11a 图标与光柱 / g11b 首领小人 / g11c 九宗代表 / g11d 魔宗演武场与特效）
const sec4 = k => !isOld && (!only || only === 'g11' || only === k);
if (sec4('g11a') && ART.lockBreak) {
  h('【阶段四 · 一】锁碎裂 ART.lockBreak(0～3)（原尺寸纸底 / 暗底 / 5 倍）、声音三态、速度档');
  for (let f = 0; f < 4; f++) pair(ART.lockBreak(f), 'lockBreak ' + f, 1, 5);
  br(); [['snd_on', '全开'], ['snd_sfx', '仅音效'], ['snd_off', '静音'], ['pause', '（已有）'], ['play', '（已有）'], ['spd1', '×1'], ['spd2', '×2'], ['spd4', '×4']].forEach(([n, l], i) => pair(ART.icon(n), n + ' ' + l, 1, 5));
  br(); h('底栏按钮上的锁（示意，3 倍）：24×24 图标右上角叠 16×16 锁，四帧');
  fxc(150, 30, g => { for (let f = 0; f < 4; f++) { const x = 4 + f * 36; ART.R(x, 2, 30, 26, '#1a1528'); ART.R(x + 1, 3, 28, 24, '#262038'); g.globalAlpha = f < 2 ? 0.45 : 1; g.drawImage(ART.icon('sect'), x + 3, 4); g.globalAlpha = 1; g.drawImage(ART.lockBreak(f), x + 15, 1); } }, 3, '锁碎裂示意');
  br(); h('品阶光柱 ART.dropBeam(tier, frame) 24×48：七阶 × 四帧（3 倍，暗底），右为纸底第 0 帧');
  for (let t = 1; t <= 7; t++) { for (let f = 0; f < 4; f++) show(ART.dropBeam(t, f), 3, f ? '' : TIERN[t], PANEL); show(ART.dropBeam(t, 0), 2, '', PAPER); if (t === 4) br(); }
  br(); fxc(200, 60, g => { for (let t = 1; t <= 7; t++) { const x = 6 + (t - 1) * 28; g.drawImage(ART.dropBeam(t, t % 4), x, 4); ART.R(x + 2, 34, 20, 20, '#1a1528'); ART.R(x + 3, 35, 18, 18, '#3a3155'); g.drawImage(ART.item('w', t), x + 4, 36); } }, 3, '翻牌示意：光柱在卡片后面', '#262038');
  br(); h('空状态淡墨小画 ART.emptyNote(kind, paper) 48×48（暗面板 1 倍 / 3 倍；宣纸 3 倍）');
  [['pet', '还没有灵宠'], ['vault', '宝库空'], ['build', '能建的都建了']].forEach(([k, l]) => { show(ART.emptyNote(k), 1, '', PANEL); show(ART.emptyNote(k), 3, k + ' ' + l, PANEL); show(ART.emptyNote(k, 1), 3, 'paper', PAPER); });
  br();
}
if (sec4('g11c') && ART.nineChamp) {
  const z = +(q.get('z') || 3), moods = ['n', 'joy', 'ang', 'shock', 'sad'], FD = ART.dims.fighter;
  h('【阶段四 · 三】九宗代表 ART.portrait(id, mood) 48×48 五表情 + ART.fighter(id, frame) 六帧');
  [['zhuge', '诸葛千机 · 万法阁'], ['huineng', '慧能大师 · 金刚寺'], ['jian13', '剑十三 · 太虚剑宗']].forEach(([id, n]) => {
    moods.forEach((m, i) => show(ART.portrait(id, m), z, i ? m : n + ' · ' + ncol(ART.portrait(id, m)) + ' 色', i % 2 ? PANEL : PAPER));
    show(ART.portrait(id, 'n'), 1, '', PAPER); show(ART.portrait(id, 'n'), 1, '', PANEL); show(sil(ART.portrait(id, 'n')), 1, '', '#d8d8d8');
    br(); ART.fighterFrames.forEach((f, i) => show(ART.fighter(id, f), 3, f, i % 2 ? PANEL : PAPER)); show(ART.fighter(id, 'idle0', true), 3, 'flip', PANEL); show(ART.fighter(id, 'idle0'), 1, '', PAPER); show(ART.fighter('tian', 'idle0'), 3, '对照：楚天阔', PAPER);
    br();
  });
  h('九宗代表同台（原尺寸 2 倍）：' + L.NINE.map(n => n.champ).join(' / '));
  fxc(200, 60, g => { ART.R(0, 0, 200, 60, '#a8a0a8'); L.NINE.forEach((n, i) => g.drawImage(ART.fighter(ART.nineChamp(n.id), 'idle0'), 2 + i * 21, 14)); }, 4, '九宗');
  L.NINE.forEach(n => show(ART.portrait(ART.nineChamp(n.id), 'n'), 2, n.champ, PANEL));
  br();
}
if (sec4('g11d') && ART.drawRingBurst) {
  const T = +(q.get('t') || 1000), FD = ART.dims.fighter;
  h('【阶段四 · 四】魔宗演武场 ART.drawDuelStage("sect_mo", t, OY)（两个时刻；带小人对照）· duelStages = ' + ART.duelStages().join(' '));
  [T, T + 900].forEach((t, i) => scene(g => {
    ART.drawDuelStage('sect_mo', t, OY);
    g.drawImage(ART.fighter({ look, realm: 4 }, i ? 'strike' : 'idle0'), 62 - FD.ax, 128 - FD.ay);
    g.drawImage(ART.fighter('xue', i ? 'hit' : 'idle1', true), 138 - 26, 128 - FD.ay);
    if (ART.bossFighter && i) { const d = ART.bossFighterDims(4); g.drawImage(ART.bossFighter(4, 'idle0', true), 172 - (d.w - 1 - d.ax), 128 - d.ay); }
    ART.drawHpBar(6, 6 - OY, 80, 0.7); ART.drawHpBar(114, 6 - OY, 80, 0.45, { right: 1 });
  }, 'sect_mo t=' + t));
  scene(g => { ART.drawDuelStage('sect', T, OY); g.drawImage(ART.fighter({ look, realm: 4 }, 'idle0'), 62 - FD.ax, 128 - FD.ay); }, '对照：sect');
  br(); h('五行剑气 ART.drawElemQi(x, y, el, t, flip)：三帧 + 朝左；命中 ART.drawElemHit(x, y, el, k)：k = 0.05 0.2 0.4 0.6 0.8 0.95（4 倍）');
  ART.elems.forEach((el, n) => {
    fxc(120, 24, g => { [0, 80, 160].forEach((t, i) => ART.drawElemQi(22 + i * 30, 12, el, t)); ART.drawElemQi(104, 12, el, 0, true); }, 4, el + ' 剑气', n % 2 ? '#3a5a7a' : PANEL);
    fxc(216, 36, g => [0.05, 0.2, 0.4, 0.6, 0.8, 0.95].forEach((k, i) => ART.drawElemHit(18 + i * 36, 18, el, k)), 4, el + ' 命中', n % 2 ? '#3a5a7a' : PANEL);
    br();
  });
  fxc(160, 24, g => { ART.R(0, 0, 160, 24, '#a8a0a8'); ART.elems.forEach((el, i) => ART.drawElemQi(18 + i * 30, 12, el, 0)); }, 4, '亮底上的五行剑气'); fxc(100, 24, g => { ART.drawSwordQi(14, 12, '#7fe0f0'); [0.2, 0.5, 0.8].forEach((k, i) => ART.drawSpark(40 + i * 22, 12, k)); }, 4, '对照：已有 drawSwordQi / drawSpark', PANEL);
  br(); h('戒指爆光 ART.drawRingBurst(x, y, k)：20 帧（k = i / 19），每格 90×80（2 倍）');
  for (let i = 0; i < 20; i++) { fxc(90, 80, g => { ART.R(0, 0, 90, 80, i % 2 ? '#2a2456' : '#1a1528'); g.drawImage(ART.fighter({ look, realm: 3 }, 'idle0'), 45 - FD.ax, 70 - FD.ay); ART.drawRingBurst(54, 60, i / 19); }, 2, '' + i); if (i === 9) br(); }
  br(); scene(g => { ART.drawDuelStage('sect_mo', T, OY); g.drawImage(ART.fighter({ look, realm: 4 }, 'windup'), 62 - FD.ax, 128 - FD.ay); g.drawImage(ART.fighter('xue', 'hit', true), 138 - 26, 128 - FD.ay); ART.drawRingBurst(71, 118, 0.42); }, '场景里 k=0.42');
  scene(g => { ART.drawDuelStage('wild', T, OY); g.drawImage(ART.fighter({ look, realm: 4 }, 'strike'), 62 - FD.ax, 128 - FD.ay); g.drawImage(ART.fighter('xue', 'hit', true), 138 - 26, 128 - FD.ay); ART.drawRingBurst(71, 118, 0.7); ART.drawElemQi(104, 112, 'huo', T); ART.drawElemHit(132, 112, 'huo', 0.3); }, '场景里 k=0.7 + 火');
  br();
}
if (sec4('g11b') && ART.bossFighter) {
  const z = +(q.get('z') || 3), BN = ['独眼狼王', '黑风寨主雷彪', '古墓尸王', '赤炎猿王', '血煞老魔', '剑冢守墓人', '九幽魔将', '东海蛟皇', '吞星巨兽', '仙府傀儡王', '混沌魔神残影'], FD = ART.dims.fighter;
  h('【阶段四 · 二】首领对决小人 ART.bossFighter(k, frame, flip)：六帧（' + z + ' 倍）、朝左、原尺寸、剪影、对照半身像 ART.boss(k)');
  for (let k = 0; k < 11; k++) {
    const d = ART.bossFighterDims(k), c0 = ART.bossFighter(k, 'idle0');
    ART.fighterFrames.forEach((f, i) => show(ART.bossFighter(k, f), z, i ? f : k + ' ' + BN[k] + ' ' + d.w + '×' + d.h + ' · ' + ncol(c0) + ' 色', i % 2 ? PANEL : PAPER));
    show(ART.bossFighter(k, 'idle0', true), z, 'flip', '#4a3550'); show(c0, 1, '', PAPER); show(c0, 1, '', PANEL); show(sil(c0), 1, '', '#d8d8d8'); show(ART.boss(k), 2, '半身像', PANEL);
    br();
  }
  h('场上大小对照：主角在左（脚底 x=62），首领在右朝左（脚底 x=138），野外 / 魔宗 / 论道台');
  const T = 1000, put = (g, k, f, x) => { const d = ART.bossFighterDims(k); g.drawImage(ART.bossFighter(k, f, true), x - (d.w - 1 - d.ax), 128 - d.ay); };
  [[0, 'wild', 'idle0'], [1, 'wild', 'windup'], [2, 'wild', 'idle1'], [3, 'wild', 'strike'], [4, 'sect_mo', 'idle0'], [5, 'wild', 'idle0'], [6, 'sect_mo', 'strike'], [7, 'cloud', 'idle0'], [8, 'cloud', 'strike'], [9, 'cloud', 'idle0'], [10, 'sect_mo', 'idle0'], [7, 'wild', 'down']].forEach(([k, st, f], i) => {
    scene(g => { ART.drawDuelStage(st, T, OY); g.drawImage(ART.fighter({ look: i % 2 ? lookF : look, realm: 2 + (i % 6) }, f === 'strike' ? 'hit' : 'idle0'), 62 - FD.ax, 128 - FD.ay); put(g, k, f, 138); }, k + ' ' + BN[k] + ' ' + f);
    if (i % 4 === 3) br();
  });
  br();
}
