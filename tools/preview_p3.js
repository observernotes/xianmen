// 美术预览 · 阶段三新资产（由 preview.html 载入；?only=g1…g10 只看某一批）
// 在一块小画布上调用“画到当前 ctx”的接口
function fxc(w, hh, fn, s, label, bg) { const c = document.createElement('canvas'); c.width = w; c.height = hh; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; ART.setCtx(g, w); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, hh); } fn(g); return show(c, s || 3, label); }
function pair(c, label, i, s) { show(c, 1, '', PAPER); show(c, 1, '', PANEL); show(c, s || 4, label, i % 2 ? PANEL : PAPER); }
const TIERN = ['', '凡', '法', '灵', '宝', '灵宝', '仙', '混沌'];
if (sec('g1') && ART.affix) {
  h('【一 法宝】法衣七阶 ART.item("r", t)（原尺寸纸底 / 暗底 / 4 倍）');
  for (let t = 1; t <= 7; t++) pair(ART.item('r', t), TIERN[t] + ' · ' + ncol(ART.item('r', t)) + ' 色', t);
  br(); h('饰品 ART.item("o", t, kind)：修炼（玉佩）/ 财运（铜钱）/ 气运（符）/ 寿元（长命锁）× 七阶');
  ART.ornKinds.forEach((k, i) => { for (let t = 1; t <= 7; t++) { show(ART.item('o', t, k), 1, '', PAPER); show(ART.item('o', t, k), 3, t === 1 ? k : TIERN[t], (t + i) % 2 ? PANEL : PAPER); } br(); });
  h('首领专属 ART.item("boss", k)');
  ['狼王獠牙匕', '开山宣花斧', '玉棺镇魂钉', '赤炎擎天棍', '血煞噬魂刃', '守墓古剑', '九幽镇魂铃', '蛟皇逆鳞盾', '吞星之核', '傀儡王天戟', '混沌残刃'].forEach((n, k) => pair(ART.item('boss', k), n, k));
  br(); h('词条记号 ART.affix(name) 8×8（原尺寸 / 6 倍）、灵矿、器方');
  for (const n of ART.affixNames()) { show(ART.affix(n), 1, '', PAPER); show(ART.affix(n), 1, '', PANEL); show(ART.affix(n), 6, n, PAPER); }
  br(); pair(ART.icon('ore'), 'ore 灵矿', 0); pair(ART.icon('gscroll'), 'gscroll 器方', 1);
  br(); h('强化特效 ART.drawForge(x, y, k, kind)：hit / ok / fail，进度 0.1 0.35 0.6 0.9');
  for (const kind of ['hit', 'ok', 'fail']) fxc(160, 40, g => [0.1, 0.35, 0.6, 0.9].forEach((k, i) => { g.drawImage(ART.item('w', 3), 12 + i * 40, 12); ART.drawForge(20 + i * 40, 20, k, kind); }), 4, kind, PANEL);
  br();
}
