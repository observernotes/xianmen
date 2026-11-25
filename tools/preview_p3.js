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

if (sec('g4') && ART.petSprite) {
  const z = +(q.get('z') || 4), ELN = { jin: '金', mu: '木', shui: '水', huo: '火', tu: '土' };
  h('【四 灵宠】ART.petSprite(sp, form, frame, aw) 32×28：两帧（' + z + ' 倍）、原尺寸、剪影、觉醒；ART.petCard 36×36（2 倍）');
  let last = '';
  for (const [sp, fi, name, el] of ART.petList()) {
    if (sp !== last && last) br(); last = sp;
    const w = document.createElement('span'); w.style.cssText = 'display:inline-block;margin:0 10px 4px 0;white-space:nowrap'; out.appendChild(w);
    const add = (c, s, l, bg) => w.appendChild(show(c, s, l, bg));
    const c0 = ART.petSprite(sp, fi, 0);
    add(c0, z, name + '·' + ELN[el] + ' ' + ncol(c0) + '色', PAPER); add(ART.petSprite(sp, fi, 1), z, sp + ' ' + fi, PANEL);
    add(c0, 1, '', PAPER); add(c0, 1, '', PANEL); add(sil(c0), 1, '', '#d8d8d8'); add(ART.petSprite(sp, fi, 0, 1), 1, '', PANEL);
    add(ART.petCard(sp, fi), 2, '', PANEL); if (fi) add(ART.petCard(sp, fi, 1), 2, '觉醒', PANEL);
  }
  br(); h('洞府里的大小对照、可进化光效 ART.drawEvo(x, y, t) 与进化瞬间 ART.drawEvo(x, y, t, k)');
  const T = 1000, P2 = ART.dims.pet2;
  scene(g => {
    const r = ART.drawHome({ year: 0.3, home: { cave: 4, field: 6, furnace: 4, array: 5 } }, T, OY, [], { phase: 0.5 });
    g.drawImage(ART.sit(look, 2), 100 - D.sit.w / 2, 136 - D.sit.h);
    [['p_hu', 0, 124], ['p_xiong', 1, 150], ['p_he', 0, 60], ['p_jiao', 1, 30]].forEach(([sp, fi, x], i) => { if (i === 1) ART.drawEvo(x + 16, 138, T); g.drawImage(ART.petSprite(sp, fi, 0), x, 138 - P2.foot); });
    g.drawImage(ART.petSprite('p_fu', 0, 0), 80, 70); ART.nightOverlay(r.sky, OY, 160 + OY, r.lights);
  }, '洞府');
  fxc(200, 44, g => [0.1, 0.35, 0.6, 0.9].forEach((k, i) => { g.drawImage(ART.petSprite('p_hu2', 1, 0), 9 + i * 50, 12); ART.drawEvo(25 + i * 50, 38, T, k); }), 3, '进化瞬间 k = 0.1 / 0.35 / 0.6 / 0.9', PANEL);
  br(); h('岗位图标');
  [['job_field', '守田'], ['job_furnace', '看炉'], ['job_array', '护阵'], ['job_forage', '觅食'], ['job_patrol', '巡山'], ['job_out', '出战']].forEach(([n, l], i) => pair(ART.icon(n), n + ' ' + l, i));
  br();
}

if (sec('g5') && ART.drawPlot) {
  const CN = ['灵草', '灵稻', '灵谷', '赤炎果', '寒霜莲', '惊雷竹', '长生藤', '养魂花'];
  h('【五 灵田与炼丹】作物图标 ART.crop(id)');
  ART.cropIds.forEach((id, i) => pair(ART.crop(id), id + ' ' + CN[i], i));
  br(); h('田里的三个生长阶段 ART.drawPlot(x, y, id, stage, t)（每列一种作物：芽 / 长 / 熟；最右为空垄），6 倍与洞府中原尺寸');
  fxc(8 * 20 + 24, 40, g => { ART.cropIds.forEach((id, i) => [0, 1, 2].forEach(s => ART.drawPlot(3 + i * 20, 5 + s * 12, id, s, 1000))); ART.drawPlot(165, 5, null, 0, 0); }, 6, '', '#5a9a4a');
  scene(g => {
    const r = ART.drawHome({ year: 0.3, home: { cave: 4, field: 0, furnace: 4, array: 5 } }, 1000, OY, [], { phase: 0.5 });
    ['rice', 'fire', 'ice', 'bolt', 'vine', 'soul'].forEach((id, i) => ART.drawPlot(5 + (i % 2) * 18, 112 + (i >> 1) * 12, id, i % 3 === 0 ? 1 : 2, 1000));
    g.drawImage(ART.sit(look, 2), 100 - D.sit.w / 2, 136 - D.sit.h); ART.nightOverlay(r.sky, OY, 160 + OY, r.lights);
  }, '洞府左侧六块田');
  br(); h('丹药 19 种：修炼类（素丸）/ 战斗类（火星）/ 根基类（金托）');
  const PN = { peiyuan: '培元丹', pojing: '破境丹', liaoshang: '疗伤丹', baoqi: '爆气丹', bingxin: '冰心丹', cuiti: '淬体丹', yanshou: '延寿丹', yanghun: '养魂丹', juling: '聚灵丹', leihuo: '雷火丹', baicao: '百草丹', wudao: '悟道丹', pozhang: '破障丹', qingdu: '清毒丹', dingshen: '定神丹', huaxing: '化形丹', xisui: '洗髓丹', zhuyan: '驻颜丹', jiuzhuan: '九转金丹' };
  for (const g of ['x', 'z', 'g']) { ART.pillIds().filter(id => ART.pillGroup(id) === g).forEach((id, i) => pair(ART.icon(id), PN[id], i)); br(); }
  h('药引格 ART.yinCell(a, b, pill, sel) 22×22：5×5 对称表（上三角已知，下三角未知，一格选中），2 倍；丹毒葫芦 ART.toxinGourd(frac)');
  const K = ART.yinKeys, RC = { ff: 'baoqi', ii: 'bingxin', tt: 'cuiti', ww: 'yanshou', ss: 'yanghun', fi: 'juling', ft: 'leihuo', fw: 'baicao', fs: 'wudao', it: 'pozhang', iw: 'qingdu', is: 'dingshen', tw: 'huaxing', ts: 'xisui', ws: 'zhuyan' };
  { const c = document.createElement('canvas'); c.width = 5 * 23 + 1; c.height = 5 * 23 + 1; const g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const a = Math.min(i, j), b2 = Math.max(i, j); g.drawImage(ART.yinCell(a, b2, j >= i ? RC[K[a] + K[b2]] : null, i === 1 && j === 3), 1 + j * 23, 1 + i * 23); } show(c, 3, '5×5'); }
  for (const f of [0, 0.3, 0.6, 0.8, 1]) { show(ART.toxinGourd(f), 1, '', PANEL); show(ART.toxinGourd(f), 4, '丹毒 ' + f * 100, f * 10 % 2 ? PANEL : PAPER); }
  br();
}

if (sec('g6') && ART.drawBuilding) {
  const BN = { array: '聚灵阵', field: '灵田', furnace: '丹炉', forge: '器炉', pen: '兽栏', room: '静室', library: '藏经阁', spring: '灵泉', vault: '聚宝阁', pavilion: '迎客亭', portal: '传送阵' };
  h('【六 洞府】建筑图标 ART.building(id)');
  ART.buildingIds.forEach((id, i) => pair(ART.building(id), id + ' ' + BN[id], i));
  br(); h('场景小建筑 ART.buildingSprite(id, tier) 三档（4 倍 / 原尺寸）');
  for (const id of ART.buildingIds) { if (!ART.buildingSprite(id, 0)) continue; for (let t = 0; t < 3; t++) { const c = ART.buildingSprite(id, t); show(c, 4, t ? '' : BN[id] + ' ' + ncol(c) + '色', t % 2 ? PANEL : '#5a9a4a'); } show(ART.buildingSprite(id, 1), 1, '', '#5a9a4a'); }
  br(); h('放进洞府：ART.drawBuilding(id, lv, x, y, t) + ART.homeSlots + ART.drawFormation（白天低级 / 白天高级双阵 / 夜晚 / 布阵中）');
  const T = 1000, lay = ['forge', 'furnace', 'pen', 'room', 'library', 'spring', 'vault'], lay2 = ['field', 'furnace', 'pavilion', 'vault', 'spring', 'library', 'portal'];
  const home = (label, cave, lv, list, ph, f1, f2, o) => scene(g => {
    const st = { year: 0.3, home: { cave, field: 0, furnace: 0, array: 5 } }, r = ART.drawHome(st, T, OY, [], { phase: ph }), lights = r.lights.slice();
    ART.drawFormation(f1, 100, 136, T, Object.assign({ part: 'back' }, o)); if (f2) ART.drawFormation(f2, 100, 136, T, { small: 1, part: 'back' });
    const S = ART.homeSlots.slice(1).map((s, i) => [s, list[i]]).sort((a, b2) => a[0].y - b2[0].y);
    for (const [s, id] of S) { if (s === ART.homeSlots[1]) { for (let i = 0; i < 6; i++) ART.drawPlot(5 + (i % 2) * 18, 112 + (i >> 1) * 12, ART.cropIds[i + 1], 2, T); continue; } const l = ART.drawBuilding(id, lv, s.x, s.y, T); if (l) lights.push(l); }
    g.drawImage(ART.sit(look, 3), 100 - D.sit.w / 2, 136 - D.sit.h);
    ART.drawFormation(f1, 100, 136, T, Object.assign({ part: 'front' }, o)); if (f2) ART.drawFormation(f2, 100, 136, T, { small: 1, part: 'front' });
    ART.nightOverlay(r.sky, OY, 160 + OY, lights);
  }, label);
  home('低级 · 聚灵阵', 3, 1, lay, 0.5, 'f_juling'); home('高级 · 丹火 + 渡劫', 9, 12, lay2, 0.5, 'f_danhuo', 'f_dujie'); home('夜 · 生财阵', 6, 6, lay, 0.02, 'f_shengcai'); home('布阵中 · 护山', 6, 6, lay2, 0.3, 'f_hushan', null, { pending: 1 });
  br(); h('地块格 ART.plotTile(state, sel) 26×26（2 行 × 4 列示意，2 倍）；阵图 ART.sigil(id)');
  { const c = document.createElement('canvas'); c.width = 4 * 28 + 2; c.height = 2 * 28 + 2; const g = c.getContext('2d'); g.fillStyle = PAPER; g.fillRect(0, 0, c.width, c.height);
    const cells = ['array', 'field', 'furnace', 'forge', 'spring', null, null, 'L'];
    cells.forEach((id, i) => { const x = 2 + (i % 4) * 28, y = 2 + (i >> 2) * 28; g.drawImage(ART.plotTile(id === 'L' ? 'locked' : id ? 'built' : 'empty', i === 3), x, y); if (id && id !== 'L') g.drawImage(ART.building(id), x + 5, y + 5); }); show(c, 3, '洞府面板顶部'); }
  const SN = { f_juling: '聚灵', f_shengcai: '生财', f_hushan: '护山', f_yangshou: '养兽', f_danhuo: '丹火', f_duanhun: '锻魂', f_dujie: '渡劫', f_mizong: '迷踪' };
  ART.sigilIds.forEach((id, i) => pair(ART.sigil(id), SN[id], i));
  br();
}

if (sec('g7') && ART.drawTribBolt) {
  h('【七 天劫与道心】劫云 + 雷击四个时刻（k = 0.1 先导 / 0.22 主击闪屏 / 0.4 主击 / 0.7 余辉）+ 护体光罩与护体条');
  const T = 1000;
  [[0.1, 0, 1, 0.9], [0.22, 1, 1, 0.7], [0.4, 2, 1, 0.45], [0.7, 3, 0, 0.2]].forEach(([k, lvl, hit, fr], i) => scene(g => {
    const r = ART.drawHome({ year: 0.3, home: { cave: 5, field: 6, furnace: 4, array: 5 } }, T, OY, [], { phase: 0.5 });
    ART.drawTribClouds(T + i * 400, OY, 1);
    g.drawImage(ART.sit(look, 3), 100 - D.sit.w / 2, 136 - D.sit.h);
    ART.drawShield(100, 136, fr, T, hit && k > 0.15 && k < 0.3);
    ART.drawTribBolt(100, -OY + 10, 136 - 27, k, 3 + i, lvl);
    ART.drawShieldBar(60, 150, 80, fr, { mark: 0.3, lag: fr + 0.15 });
  }, 'k=' + k + ' 第' + (lvl + 1) + '色 护体' + fr * 100 + '%'));
  br(); h('道基品级印 ART.stamp("完美" | "上" | "中" | "下")；道心三相与因果图标；心魔劫底图 ART.backdrop("demon")');
  for (const r of ['完美', '上', '中', '下']) { show(ART.stamp(r), 1, '', PAPER); show(ART.stamp(r), 3, r, PAPER); }
  [['dao_k', '狂'], ['dao_w', '稳'], ['dao_r', '仁'], ['karma', '因果']].forEach(([n, l], i) => pair(ART.icon(n), n + ' ' + l, i));
  br(); show(ART.backdrop('demon'), SS, '心魔劫');
  fxc(100, 44, g => { ART.drawShieldBar(6, 5, 88, 1, {}); ART.drawShieldBar(6, 18, 88, 0.5, { mark: 0.2, lag: 0.7 }); ART.drawShieldBar(6, 31, 88, 0.15, { mark: 0 }); }, 4, '护体条', '#3a5a7a');
  br();
}
