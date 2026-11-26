// 美术预览 · 阶段五“面板补缺”（由 preview.html 载入；?only=g12 看全部，g12a 图标与底框 / g12b 空状态、剪影、勾选框）
const sec5 = k => !isOld && (!only || only === 'g12' || only === k);
if (sec5('g12a') && ART.bossMat) {
  h('【阶段五 · 一】首领材料 ART.bossMat(0～10)（原尺寸纸底 / 暗底 / 5 倍）');
  L.BOSS_MAT.forEach((n, k) => pair(ART.bossMat(k), k + ' ' + n, k, 5));
  br(); h('丹囊 danbag、宗主建设 sb_ward / sb_lib / sb_vein、宗门任务 task；对照：peiyuan / treasure / token');
  [['danbag', '丹囊'], ['sb_ward', '护山大阵'], ['sb_lib', '藏经阁'], ['sb_vein', '灵脉'], ['task', '宗门任务'], ['peiyuan', '（已有）'], ['treasure', '（已有）'], ['token', '（已有）']].forEach(([n, l], i) => pair(ART.icon(n), n + ' ' + l, i, 5));
  br(); h('展开箭头 ART.icon("fold_closed" / "fold_open") 10×10、“新”角标 ART.newBadge() 10×10（1 倍 / 6 倍）；右：角标叠在包裹格右上角（3 倍）');
  [['fold_closed', ART.icon('fold_closed')], ['fold_open', ART.icon('fold_open')], ['newBadge', ART.newBadge()]].forEach(([n, c], i) => pair(c, n, i, 6));
  fxc(120, 24, g => { for (let i = 0; i < 5; i++) { g.drawImage(ART.qualityCell(i + 2, 16), 4 + i * 23, 5); g.drawImage(i % 2 ? ART.bossMat(i * 2) : ART.item('w', i + 2), 4 + i * 23, 5); if (i !== 2) g.drawImage(ART.newBadge(), 4 + i * 23 + 10, 1); } }, 3, '包裹格 + 新', PANEL);
  br(); h('品阶底框 ART.qualityCell(tier, 16 | 36)：七档（1～6 同 qualityColor，7 七彩）。上：16（1 倍 / 4 倍 / 垫物品）；下：36（1 倍 / 3 倍 / 垫物品）');
  for (let t = 1; t <= 7; t++) { show(ART.qualityCell(t, 16), 1, '', PANEL); show(ART.qualityCell(t, 16), 4, TIERN[t], PANEL); fxc(16, 16, g => { g.drawImage(ART.qualityCell(t, 16), 0, 0); g.drawImage(ART.item('w', t), 0, 0); }, 4, '', PANEL); }
  br(); for (let t = 1; t <= 7; t++) { show(ART.qualityCell(t, 36), 1, '', PANEL); show(ART.qualityCell(t, 36), 3, TIERN[t], t % 2 ? PANEL : PAPER); fxc(36, 36, g => { g.drawImage(ART.qualityCell(t, 36), 0, 0); g.drawImage(t < 7 ? ART.item('a', t) : ART.item('w', 7), 2, 2, 32, 32); }, 3, '', PANEL); if (t === 4) br(); }
  br();
}
if (sec5('g12b') && ART.portraitUnknown) {
  h('【阶段五 · 二】空状态淡墨小画（新增 kind）ART.emptyNote(kind, paper)（暗面板 1 倍 / 3 倍；宣纸 3 倍）；末尾对照已有 pet');
  [['pill', '还没有丹方'], ['scroll', '任务都做完了'], ['gift', '没东西可送'], ['gavel', '等下一场拍卖'], ['pet', '（已有）']].forEach(([k, l]) => { show(ART.emptyNote(k), 1, '', PANEL); show(ART.emptyNote(k), 3, k + ' ' + l, PANEL); show(ART.emptyNote(k, 1), 3, 'paper', PAPER); });
  br(); h('未见过人物的剪影 ART.portraitUnknown() 48×48（1 倍 / 3 倍，纸底 / 暗底）；对照 ART.portrait("mu")');
  const U = ART.portraitUnknown(); show(U, 1, '', PAPER); show(U, 1, '', PANEL); show(U, 3, 'portraitUnknown · ' + ncol(U) + ' 色', PAPER); show(U, 3, '', PANEL); show(ART.portrait('mu', 'n'), 3, '对照', PAPER); show(ART.portrait('ge', 'n'), 3, '对照', PANEL);
  br(); h('勾选按钮框 ART.frame("chkOn" / "chkOff")（左：原图 4 倍；右：border-image 拉伸成按钮，2 倍像素）');
  for (const k of ['chkOn', 'chkOff', 'btnAlt', 'btnOff']) {
    const F = ART.frame(k); show(F.canvas, 4, k, '#444');
    for (const [t, bg] of [['续炼', PAPER], ['护劫 · 当前差事', PANEL]]) { const w = document.createElement('span'); w.style.cssText = 'display:inline-block;padding:10px;margin:3px;vertical-align:top;background:' + bg; const d = document.createElement('div'); d.style.cssText = 'border:12px solid transparent;border-image:url(' + F.url + ') 6 fill / 12px stretch;image-rendering:pixelated;font:14px sans-serif;padding:0 8px;color:' + F.ink; d.textContent = t; w.appendChild(d); out.appendChild(w); }
  }
  br();
}
