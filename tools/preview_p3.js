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

if (sec('g2') && ART.calStrip) {
  h('【二 历法与大势】四季 s0–s3、天下大势 12 枚（原尺寸纸底 / 暗底 / 4 倍）');
  ['春', '夏', '秋', '冬'].forEach((n, i) => pair(ART.season(i), 's' + i + ' ' + n, i));
  br(); const WN = { w_shouchao: '兽潮', w_lingchao: '灵气潮汐', w_danhui: '丹道大会', w_kuangmai: '矿脉现世', w_mojie: '魔劫', w_liuxing: '流星雨', w_dahan: '大旱', w_xianfu: '仙府现世', w_shanglu: '商路断绝', w_jiangdao: '名师讲道', w_tongji: '通缉令', w_taiping: '太平无事' };
  ART.worldIds().forEach((id, i) => pair(ART.icon(id), WN[id], i));
  br(); h('场景右上角的大势小牌（示意，3 倍）与年历条 ART.calStrip(t, marks)（3 倍）');
  fxc(200, 40, g => { ART.drawDuelStage('wild', 0, 0); ['w_shouchao', 'w_liuxing', 'w_xianfu'].forEach((id, i) => { const x = 138 + i * 20; ART.R(x, 3, 20, 20, '#1a1528'); ART.R(x + 1, 4, 18, 18, '#262038'); ART.R(x + 1, 4, 18, 1, '#4ccb9f'); g.drawImage(ART.icon(id), x + 2, 5); }); }, 3, '小牌示意');
  br(); show(ART.calStrip(5, [{ at: 7, kind: 'dao' }, { at: 3, len: 6, kind: 'auc' }, { at: 13, kind: 'war' }, { at: 11, len: 6, kind: 'realm' }, { at: 0, len: 3, kind: 'world' }, { at: 19, kind: 'dao' }]), 3, 't=5：论道 / 拍卖 / 会武 / 秘境 / 大势'); show(ART.calStrip(22, []), 3, 't=22 空');
  br(); h('坊市：兽粮、秘境令、药引 ×5、功法残篇；拍卖：拍槌、号牌、三档出价；行情：涨 / 跌 / 平 / 出售');
  [['feed', '兽粮'], ['token', '秘境令'], ['yin_f', '火引'], ['yin_i', '冰引'], ['yin_t', '雷引'], ['yin_w', '木引'], ['yin_s', '魂引'], ['frag', '功法残篇'], ['gavel', '拍槌'], ['paddle', '号牌'], ['bid1', '跟一口'], ['bid2', '加价'], ['bid3', '豪掷'], ['up', '涨'], ['down', '跌'], ['flat', '平'], ['sell', '出售']].forEach(([n, l], i) => pair(ART.icon(n), n + ' ' + l, i));
  br();
}

if (sec('g3') && ART.drawRealm) {
  h('【三 秘境】四个主题背景 ART.drawRealm(theme, t, OY)（带小人、气血条、房间动画）');
  const T = +(q.get('t') || 1000), FD = ART.dims.fighter, fxs = [['fight', 0.3], ['chest', 0.45], ['spring', 0.4], ['insight', 0.35]];
  ART.realmThemes.forEach((k, i) => scene(g => {
    ART.drawRealm(k, T, OY);
    g.drawImage(ART.fighter({ look: i % 2 ? lookF : look, realm: 2 + i }, 'idle0'), 62 - FD.ax, 128 - FD.ay);
    ART.drawQiBar(6, 6 - OY, 70, [0.85, 0.55, 0.22, 1][i], T);
    ART.drawRoomFx(fxs[i][0], 130, 122, fxs[i][1]);
  }, ['剑气·金', '百草·木', '熔火·火', '幽泉·水'][i] + ' (' + k + ')'));
  br(); h('门卡 ART.door(type) 32×40（原尺寸 / 3 倍）');
  const DN = { fight: '战', elite: '精英', chest: '宝', spring: '泉', event: '奇', insight: '悟', shop: '商', boss: '守关', unk: '？' };
  for (const k of ART.doorTypes) { show(ART.door(k), 1, '', PANEL); show(ART.door(k), 3, DN[k] + ' ' + k, PANEL); }
  br(); pair(ART.icon('spring'), 'spring', 0); pair(ART.icon('wonder'), 'wonder', 1); pair(ART.icon('skull'), 'skull', 0);
  br(); h('房间动画 ART.drawRoomFx(type, x, y, k)：进度 0.15 / 0.4 / 0.65 / 0.9；气血条 100% / 55% / 20%');
  for (const k of ['fight', 'elite', 'boss', 'chest', 'trap', 'spring', 'event', 'insight', 'shop']) fxc(160, 44, g => [0.15, 0.4, 0.65, 0.9].forEach((p, i) => ART.drawRoomFx(k, 20 + i * 40, 32, p)), 2, k, PANEL);
  fxc(90, 34, g => { ART.drawQiBar(4, 3, 80, 1, 0); ART.drawQiBar(4, 13, 80, 0.55, 0); ART.drawQiBar(4, 23, 80, 0.2, 0); }, 4, '气血条', '#3a5a7a');
  br();
}
