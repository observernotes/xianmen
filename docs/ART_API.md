# 美术接口速查（src/art.js）

所有函数返回缓存好的画布（除非注明“画到当前 ctx”）。新界面优先用这里的接口；旧接口（ART.avatar、ART.elder、ART.sit 等）仍然可用。

## 阶段二（已合并）

- `ART.portrait(id, mood, alt)` → 48×48 半身像。id：elder mu zhao tian xue yun su ye chu ge bai mo jian dan dao；mood：n joy ang shock sad；alt 为真取女主版本。`ART.portraitIds()`、`ART.hasPortrait(id)`。注意：楚狂是 `chu`，楚天阔是 `tian`。
- `ART.portraitMe(look, realm, mood)` → 48×48 主角半身像。
- `ART.icon(name)` → 16×16（exp/home/sect/market/me 为 24×24，atk8 为 8×8）；`ART.iconNames()`、`ART.navIcons()`。
- `ART.stamp(r)` → 24×24 评价印章（天甲乙丙丁胜败完 或 0～4）。
- `ART.frame(kind)` → {url, slice:6, size:20, fill, ink, canvas}，kind：hud sheet card btnGold btnAlt btnSeal btnOff；CSS `border-image: url() 6 fill / Npx stretch`。
- `ART.emblem(id)` 16×16 宗门徽记（id 同 L.NINE）；`ART.item('w'|'a', tier)` 16×16；`ART.qualityColor(tier)`。
- `ART.boss(k)` 48×48（k 0～10）。
- `ART.fighter(who, frame, flip, alt)` 48×40 对决小人（frame：idle0 idle1 windup strike hit down / 0～5，另有 stand0 stand1）；`ART.dims.fighter`。
- `ART.drawDuelStage(kind, t, OY)`（town cloud sect wild，画到 ctx）、`ART.drawSpark(x, y, k)`、`ART.drawHpBar(x, y, w, frac, opts)`。
- `ART.elderSprite(frame)` 24×28；`ART.drawVisitor(x, y, kind, t, opts)`；`ART.drawTunaRing(...)`、`ART.drawRetreat(...)`（part 'back'/'front'）。
- `ART.introPanel(n, look)` 200×120；`ART.backdrop('chapter'|'samsara')` 200×120；`ART.extendSides(W)`。

## 阶段三·批次一（法宝）

- `ART.item('r', tier 1～7)` 法衣；`ART.item('o', tier, kind)` 饰品，kind 0|'cul' 修炼 / 1|'gold' 财运 / 2|'luck' 气运 / 3|'life' 寿元（`ART.ornKinds`）；`ART.item('boss', k 0～10)` 首领专属。
- `ART.affix(词条中文名 | 0～15)` → 8×8 记号（`ART.affixNames()`）。
- `ART.icon('ore')` 灵矿、`ART.icon('gscroll')` 器方。
- `ART.drawForge(x, y, k 0～1, 'hit'|'ok'|'fail')` 强化特效（画到 ctx）。

## 阶段三·批次二（历法 / 大势 / 坊市 / 拍卖）

- 四季：`ART.icon('s0'～'s3')` 或 `ART.season(0～3)`；`ART.seasonOf(t)`、`ART.seasonColor(k)`。
- 天下大势：`ART.icon('w_shouchao' … 'w_taiping')`，id 同 CONTENT §8（`ART.worldIds()`）。
- `ART.icon`：feed 兽粮、token 秘境令、yin_f / yin_i / yin_t / yin_w / yin_s 药引、frag 功法残篇；gavel、paddle、bid1 / bid2 / bid3 三档出价；down 跌、flat 平（涨用已有 up）、sell 出售。
- `ART.calStrip(t, marks)` → 194×20 年历条：24 格每格宽 8（第 i 格左缘 x = 1 + 8i，第 0 格是当前周天，`ART.dims.cal`），marks = [{at, len, kind: 'dao'|'auc'|'war'|'realm'|'world'}]。

## 阶段三·批次三（秘境）

- `ART.drawRealm(theme, t, OY)` 秘境背景，theme = 'jin'|'mu'|'huo'|'shui'（`ART.realmThemes`），坐标与 `ART.drawDuelStage` 相同（200×(160+OY)，脚底 y = 128，可直接摆 `ART.fighter`）。主题 id 对照：剑气 jianqi→jin、百草 baicao→mu、熔火 ronghuo→huo、幽泉 youquan→shui。
- `ART.door(type)` → 32×40 门卡，type = fight|elite|chest|spring|event|insight|shop|boss|unk（也接受 战/精/宝/泉/奇/悟/商/守/？，`ART.doorTypes`）。
- `ART.drawQiBar(x, y, w, frac, t)` 气血条；`ART.drawRoomFx(type, x, y, k 0～1)` 房间结果动画（type 同门卡，另有 'trap'）。
- `ART.icon('spring'|'wonder'|'skull')`。`ART.duelStages()` 仍只返回原来四个舞台。

## 阶段三·批次四（灵宠）

- `ART.petSprite(sp, form, frame, aw)` → 32×28 精灵，面朝左，脚底 y = 26（`ART.dims.pet2 = {w:32, h:28, foot:26}`）。sp 用 CONTENT §4 的 id：p_tu p_hu p_que p_xiong p_gui p_hu2 p_fu p_sun p_he p_jiao p_wu p_ze，另有 p_qilin。form 0 初始 / 1 分支 A / 2 分支 B（也接受 'a' 'b'；p_hu 的 3 = 九尾天狐）；frame 0/1；aw 为真 = 觉醒光环。
- `ART.petCard(sp, form, aw)` → 36×36 卡片像。`ART.petName(sp, form)`、`ART.petList()` → [[sp, form, 名, 五行]…]。
- `ART.drawEvo(x, y, t)` 可进化时的循环光效；`ART.drawEvo(x, y, t, k 0～1)` 进化瞬间（(x, y) 为脚底中心）。
- 岗位图标：`ART.icon('job_field'|'job_furnace'|'job_array'|'job_forage'|'job_patrol'|'job_out')`。旧 `ART.pet(tier)` 不变。

## 阶段三·批次五（灵田 / 炼丹）

- 作物 id = herb rice grain fire ice bolt vine soul（`ART.cropIds`，顺序同 SYSTEMS §6.2，也接受序号 0～7）；`ART.crop(id)` → 16×16 图标。
- `ART.drawPlot(x, y, id, stage 0|1|2, t)` 在当前 ctx 画一块田（垄 18×9；(x, y) 与旧 drawField 的 px, py 同义：第 i 块建议 x = 5 + (i % 2) × 18，y = 112 + (i >> 1) × 12；id 为空画空垄）。旧 drawHome 仍按 st.home.field 自己画田——改成作物制时把 st.home.field 置 0 传入，再逐块调 drawPlot。
- 丹药：`ART.icon(丹方 id)` 19 种齐全（新增 liaoshang baoqi bingxin cuiti yanghun leihuo baicao wudao pozhang qingdu dingshen huaxing zhuyan），根基类自动带金托、战斗类带火星；`ART.pillGroup(id)` → 'x'|'z'|'g'，`ART.pillIds()`。
- `ART.yinCell(a, b, pill, sel)` → 22×22 药引格（a, b = 'f','i','t','w','s' 或 0～4；pill 为空画“？”）。
- `ART.toxinGourd(frac 0～1)` → 16×16 丹毒葫芦。

## 阶段三·批次六（洞府建筑 / 地块 / 阵法）

- 建筑 id = array field furnace forge pen room library spring vault pavilion portal（`ART.buildingIds`）。`ART.building(id)` → 16×16 图标；`ART.buildingSprite(id, tier 0～2)` → 26×26 小建筑。
- `ART.drawBuilding(id, lv, x, y, t)` 画进洞府场景：(x, y) 为底边中点，按等级自动分三档，带炉火 / 泉水 / 传送门动画；返回可并入 nightOverlay 的光源或 null。array 与 field 不画（阵法用 drawFormation，田用 drawPlot）。furnace 放到任意地块时，给 drawHome 传 st.home.furnace = 0，免得重复。
- `ART.homeSlots`：8 个地块的建议坐标（[0] 聚灵阵 = 主角座下，[1] 田区，其余按 y 排序后画）。`ART.plotTile('empty'|'built'|'locked', sel)` → 26×26 地块格。
- `ART.sigil(id)` → 16×16 阵图，id = f_juling f_shengcai f_hushan f_yangshou f_danhuo f_duanhun f_dujie f_mizong（`ART.sigilIds`、`ART.sigilColor(id)`）。
- `ART.drawFormation(id, x, y, t, { pending, small, part: 'back'|'front' })` 地面阵法光圈（small = 第二阵位）。

## 阶段三·批次七（天劫 / 道心）

- `ART.drawTribClouds(t, OY, k 0～1)` 劫云（k = 聚拢程度）。
- `ART.drawTribBolt(x, yTop, yGround, k 0～1, seed, lvl 0～3)` 一道雷：0～0.15 先导、0.15～0.5 主击（带闪屏）、之后余辉；seed 决定折线，lvl 换色 青白 / 金 / 紫 / 赤。
- `ART.drawShield(x, y, frac, t, hit)` 护体光罩（(x, y) = 人物脚底；frac 越低越红并出裂纹）。
- `ART.drawShieldBar(x, y, w, frac, { mark, lag })` 护体条（mark = 预计落点刻线）。
- `ART.stamp('完美'|'上'|'中'|'下')` 道基品级印（原有 天甲乙丙丁胜败完 不变）。
- `ART.icon('dao_k'|'dao_w'|'dao_r'|'karma')` 狂 / 稳 / 仁 / 因果。`ART.backdrop('demon')` 心魔劫 200×120 底图。

## 阶段三·批次八（宗门人物）

- `ART.portrait(id, mood, alt)` 新增 id：长老 tieye 铁冶真人 / liu 柳含烟 / yaochen 药尘子 / chisong 赤松客 / shouzhuo 守拙道人 / qingxu 清虚真人 / xuehe 血河老祖 / xue3 鬼医薛三 / youji 幽姬；圣子 xiao 萧凌风（alt = true → 苏清寒）/ hongxiu 丹红袖 / zhibai 陆知白；tianheng 陆天衡。五种表情齐全；`ART.fighter(id, …)` 与 `ART.drawVisitor(…, id)` 也都可用这些 id。
  注意：CONTENT 事件里鬼医薛三的长老 id 是 `xuesan`，美术 id 是 `xue3`；接入时做一次映射。
- `ART.portraitGen(seed, { f, realm, temper, kind, robe, trim }, mood)` → 48×48 门人 / 徒弟头像（同 seed 恒定；temper = 0～7 或 '勤勉' '聪慧' '莽' '滑' '痴' '孤傲' '仁厚' '贪玩'，`ART.tempers`；realm 决定道袍色，或直接传 robe: [暗, 中, 亮] 用宗门色；kind: 'rookie' = 新秀外观：金抹额 + 红披领）。
- 职司图标：`ART.icon('post_dan'|'post_qi'|'post_zhan'|'post_fa'|'post_wai')`。

## 阶段三·批次九（人物 / 宿敌）

- `ART.portrait` 再增 id：teaman 卖茶翁、qian 钱通、lei 雷豹、lixiao 厉枭、yutian 驭天风（后四位是出身约战的对手；丹红袖用 hongxiu）。
- 新秀头像：`ART.portraitGen(seed, { kind: 'rookie', f, robe: [暗, 中, 亮], trim }, mood)`。
- 新图标：`ART.icon('grudge'` 恩怨 | `'quest'` 委托 | `'like'` ♥ | `'dislike'` ✕ | `'wine'` | `'tea'` | `'spar'` 指点 | `'crush'` 打压`)`。
- CONTENT §12 其余链人物（星墟仙人、龙宫等）没有单独画像，用 portraitGen 或现有访客小人代替。

## 阶段三·批次十（图鉴 / 轮回）

- `ART.frame('codex'|'codexCell'|'codexCellOff')` 图鉴页与收集格（九宫格）。
- `ART.codexIcon(cat)`，cat = map art combo gear pet pill recipe sigil people rival chain event realm ending（`ART.codexCats`）。
- `ART.samsaraNode(iconName, 'locked'|'open'|'done')` → 24×24 轮回殿节点（内嵌任意 ART.icon 名）；新增节点图标 sm_slot sm_roster sm_elem sm_legacy，另有图鉴 cx_map cx_combo cx_chain cx_end。
- `ART.origin(id)` → 64×40 出身小画，id = qitu dantong moyi shoumu sanxiu yushou（`ART.originIds`）。
- `ART.backdrop('ascend'|'rest'|'summit'|'hermit')` 结局底图 200×120（chapter / samsara / demon 不变，`ART.backdropKinds()`）。

美术阶段三合计页面 +131 KB。总览：`node tools/preview.js out.png`（单批用 only=g1～g10）。

## 阶段四·界面补缺

预览：`node tools/preview.js out.png only=g11`（分块：g11a 图标 / 光柱 / 空状态，g11b 首领小人，g11c 九宗代表，g11d 魔宗演武场与特效；代码在 tools/preview_p4.js）。以下都是新增接口，旧接口的签名与输出不变。

### 1 锁碎裂（底栏按钮右上角）

- `ART.lockBreak(f)` → 16×16，`f` = 0～3（`ART.lockBreakFrames = 4`）：0 完好（就是 `ART.icon('lock')`）、1 裂开一道缝、2 锁体崩成两半、3 碎屑 + 十字闪光。
- 用法：解锁时按 0 → 1 → 2 → 3 各约 70～90 毫秒播一遍，播完撤掉；扫光与第 2 帧同时起。位置与原来的锁相同（左上角对齐，不需要偏移）。

### 2 声音三态（顶栏）

- `ART.icon('snd_on')` 全开（喇叭 + 两道声波）、`ART.icon('snd_sfx')` 仅音效（喇叭 + 一道声波 + 金色火花）、`ART.icon('snd_off')` 静音（灰喇叭 + 红叉）。16×16，描边规则同其它 `ART.icon`。

### 3 速度档（场景右上角）

- `ART.icon('spd1')`、`ART.icon('spd2')`、`ART.icon('spd4')` → 16×16 的 “×1 / ×2 / ×4”，配色同 `pause` / `play`（暂停、播放仍用这两个）。

### 4 品阶光柱（结算卡掉落翻牌）

- `ART.dropBeam(tier, frame)` → 24×48 透明底画布。`tier` 1～7（凡 / 法 / 灵 / 宝 / 灵宝 / 仙 / 混沌，七阶为七彩流动），`frame` 0～3 循环（`ART.beamFrames = 4`，建议每帧 100～120 毫秒）。
- 光柱底心在画布 (12, 44)：把它垫在卡片后面，卡片中心对 x = 12，卡片上沿大约压在 y = 30～34。四阶起带十字星，五阶起光柱更粗，六阶起有两道侧芒。
- `ART.beamColor(tier)` → 该阶主色（做文字 / 描边用）。

### 5 空状态淡墨小画

- `ART.emptyNote(kind, paper)` → 48×48。`kind`（`ART.emptyKinds`）：`'pet'` 还没有灵宠（空巢、碎蛋壳、一根落羽）、`'vault'` 宝库空（敞开的空箱、蛛网）、`'build'` 能建的都建了（山上层楼、松、朱日、飞鸟）。
- 默认透明底、浅墨色，直接放进暗色面板的 `.empty-note`（建议 2 倍显示，`image-rendering: pixelated`）；`paper` 为真时带宣纸底、深墨色，用在纸面卡片上。

### 6 首领对决小人

- `ART.bossFighter(k, frame, flip)` → 首领小人。`k` 0～10，顺序同 `ART.boss(k)` / `L.BOSSES`；`frame` 同 `ART.fighter`：`'idle0' 'idle1' 'windup' 'strike' 'hit' 'down'` 或 0～5；默认面朝右，`flip` 为真面朝左。
- 尺寸：`ART.bossFighterDims(k)` → `{ w, h, ax, ay }`。人形（1 雷彪 / 2 尸王 / 3 猿王 / 4 老魔 / 5 守墓人 / 6 魔将 / 9 傀儡王 / 10 残影）是 48×40、脚底锚点 (21, 39)，与 `ART.dims.fighter` 完全一致，可以直接顶替；兽形（0 独眼狼王 / 7 东海蛟皇 / 8 吞星巨兽）是 64×40、锚点 (28, 39)。`flip` 之后锚点 x = `w - 1 - ax`。
- 摆放（脚底在 (X, 128)）：`const d = ART.bossFighterDims(k); ctx.drawImage(ART.bossFighter(k, f, flip), X - (flip ? d.w - 1 - d.ax : d.ax), 128 - d.ay)`。
- 各帧的动作：尸王平举双臂、`idle1` 是原地一跳；狼王 / 蛟皇 / 吞星的 `strike` 会向前探出约 6～9 像素（已在画布之内，不必再加位移）；混沌残影下半身散成烟（半透明抖动）。持械首领的 `strike` 末端自带一道弧光。

### 7 九宗代表

- `ART.portrait(id, mood)` 新增 id：`zhuge` 诸葛千机（万法阁：纶巾、羽扇、山羊胡）、`huineng` 慧能大师（金刚寺：戒疤、白长眉、袈裟佛珠）、`jian13` 剑十三（太虚剑宗：高马尾、白抹额、脸上旧疤、背双剑）。48×48，五种表情 n joy ang shock sad 齐全。
- `ART.fighter(id, frame, flip)` 同样接受这三个 id（六帧 + stand0 / stand1），`ART.drawVisitor(…, id)` 也可用。
- `ART.nineChamp(宗门 id)` → 该宗代表的美术 id：kunlun→yun、tianjian→tian、xuesha→xue、wanfa→zhuge、jingang→huineng、jian→jian13、dao→dao、dan→hongxiu、yushou→yutian。注意宗门 id `jian`（太虚剑宗）与人物 id `jian`（凌虚子）重名，所以没有做别名，接线时请走 `ART.nineChamp`。

### 8 魔宗演武场

- `ART.drawDuelStage('sect_mo', t, OY)`：血月、黑色尖山、挂骷髅的魔殿、两盏绿火盆、地上的血纹阵；动效有旗、火焰、火星、殿门红光、阵纹流转与低处紫雾。坐标与其它舞台相同（200×(160+OY)，脚底 y = 128）。
- `ART.duelStages()` 现在返回 `['town', 'cloud', 'sect', 'wild', 'sect_mo']`。血煞魔宗、天剑宗来犯用它。

### 9 五行招式特效

- `ART.drawElemQi(x, y, el, t, flip)`（画到当前 ctx）：飞行中的五行剑气，(x, y) 为中心，约 22×14，默认朝右、`flip` 朝左；`t` 传毫秒时间，自带抖动 / 拖尾动画。金 = 金色月牙刃，木 = 三片叶刃带藤影，水 = 浪形月牙带水珠，火 = 火球拖火舌，土 = 飞石带碎砾。
- `ART.drawElemHit(x, y, el, k)`（画到当前 ctx）：命中特效，`k` 0～1 播放进度，约 30×30。金 = 交叉斩痕 + 十字金光，木 = 叶片四散，水 = 水环 + 抛落的水珠，火 = 爆燃后起黑烟，土 = 碎石迸溅 + 尘浪。
- `el`：`'jin' 'mu' 'shui' 'huo' 'tu'`（`ART.elems`），也接受 金木水火土 或序号 0～4；`ART.elemColor(el)` 取主色。无属性招式仍用原来的 `drawSwordQi` / `drawSpark`。

### 10 戒指爆光（反杀）

- `ART.drawRingBurst(x, y, k)`（画到当前 ctx）：(x, y) 是戒指所在点（主角持剑手附近，约脚底上方 10 像素、身前 9 像素），`k` 0～1。0～0.25 金光向内聚拢，0.25～0.5 炸开（白芯、十二道金芒，前两帧带全屏淡金闪屏），之后光环扩散、金屑上浮的余辉。
- 按 20 帧播（`ART.ringBurstFrames = 20`，`k = 帧 / 19`，每帧 50 毫秒左右）；最大半径约 40 像素，画在小人之上。

### 接线位置（阶段四已接入界面）

- 1 锁碎裂：`src/ui/hud.js` `lockBreakFx`（updateHUD 里底栏解锁时调用；扫光推迟 0.16 秒，CSS 在 template 末尾“阶段四”段）。
- 2 声音三态：`src/ui/audio.js` `setSoundIcon`。3 速度档：`src/ui/hud.js` `setSpeedIcon`（暂停显示 `pause`，金框）。
- 4 品阶光柱：`src/ui/panel-exp.js` `dropFlipHTML` / `dropFlipRun`（历练结算卡，按掉落最高品阶）。
- 5 空状态：`src/ui/core.js` `emptyNoteHTML`；兽栏（panel-pets.js `showPets`）、宗门宝库（panel-sect.js `sectVaultHTML`）、洞府空地（panel-home.js `plotDetail`）。
- 6～10：`src/ui/duel-scene.js`（`ftBoss` / `ftChamp` / `duelStageOf` / `duelMeEl` / `drawDuelScene`）；天剑宗来犯 panel-sect.js `runWar` 传 `sect_mo`。

## 阶段五·面板补缺

预览：`node tools/preview.js <输出.png> only=g12`（`g12a` 图标与品阶底框 / `g12b` 空状态、剪影、勾选框），代码在 `tools/preview_p5.js`。本批只画图，尚未接线。旧接口（`ART.icon` / `ART.frame` / `ART.emptyNote` 的旧名字）输出逐像素不变。

### 1 首领材料（包裹）

- `ART.bossMat(k)` → 16×16。`k` 0～10，顺序同 `L.BOSS_MAT` / `L.BOSSES`（`ART.bossMatCount = 11`）：0 狼王牙（金箍红绳的獠牙）、1 寨主令（铁牌朱字红穗）、2 尸王玉（带尸斑的青玉璧）、3 猿王心（燃着的赤心）、4 血魔珠（滴血的黑旋血珠）、5 守墓剑意（一缕青色剑芒）、6 魔将角（箍金环的紫弯角）、7 蛟皇鳞（扇形青鳞）、8 噬星核（黑核金芯）、9 傀儡芯（铜齿轮嵌青晶）、10 混沌尘（灰尘上旋着七彩微光）。
- 用法：包裹里 `st.gear.mats[k]` 那一格直接 `ART.bossMat(k)`，顶替现在借用的 `ART.icon('treasure')`。

### 2 丹囊、宗主建设、宗门任务（16×16 图标）

- `ART.icon('danbag')` 丹囊（系金绳的青布囊，囊上一粒红丹），顶替借用的 `peiyuan`。
- `ART.icon('sb_ward')` 护山大阵（光罩扣山）、`ART.icon('sb_lib')` 藏经阁（两层蓝瓦阁）、`ART.icon('sb_vein')` 灵脉（山岩里发光的脉与灵晶）。也可以用 `ART.sectBuildIcon(k)`，`k` 是 `src/logic/sect.js` 里宗主建设的 `'ward' | 'lib' | 'vein'`。
- `ART.icon('task')` 宗门任务（贴着差事的告示牌），给没有师长管的宗门任务用。

### 3 展开箭头、“新”角标（10×10）

- `ART.icon('fold_closed')` ▶ 收起、`ART.icon('fold_open')` ▼ 展开 → 10×10（注意不是 16×16），金色带描边，纸底暗底都能用。
- `ART.newBadge()` → 10×10 朱印白叹号。叠在 16×16 包裹格右上角：`drawImage(ART.newBadge(), 格子x + 10, 格子y - 4)`；CSS 里就是 `position:absolute; right:-4px; top:-4px`（按显示倍数放大）。

### 4 品阶底框（法宝 / 灵宠 / 功法格子背景）

- `ART.qualityCell(tier, size)` → 画布。`tier` 1～7：1～6 与 `ART.qualityColor(1～6)` 同色，7 为七彩（混沌）；`size` 传 16 或 36（`ART.qualityCellSizes`；不传按 16）。
- 16×16：暗底 + 品阶色描边 + 底部一抹光，四档起四角有亮钉。16×16 的物品图直接叠在上面（同一左上角）。
- 36×36：双线描边 + 内圈细线；二档起四角有折角，四档起角上嵌钉，五档起四边中点嵌菱，六档起内角有星点。格内可用区域约 (5, 5)～(30, 30)，放 2 倍的 16×16 图时画在 (2, 2) 也可以。
- 需要 CSS 背景时用 `ART.qualityCell(t, 36).toDataURL()`，`image-rendering: pixelated`，按整数倍放大；四角是透明的切角。

### 5 空状态淡墨小画（新增 kind）

- `ART.emptyNote(kind, paper)` 新增四种 `kind`，规格与原来的三种完全一样（48×48，`paper` 为真带宣纸底）：`'pill'` 还没有丹方（冷掉的丹炉、掀开的炉盖、一张空白方子）、`'scroll'` 任务都做完了（告示牌只剩钉子和一张打了红勾的）、`'gift'` 没东西可送（打开的空礼盒、松开的缎带、飞走的蛾子）、`'gavel'` 等下一场拍卖（搁在醒木上的拍卖槌、还在漏的沙漏）。
- `ART.emptyKinds` 现在是 `['pet', 'vault', 'build', 'pill', 'scroll', 'gift', 'gavel']`。接线照旧走 `src/ui/core.js` 的 `emptyNoteHTML`。

### 6 未见过人物的剪影

- `ART.portraitUnknown()` → 48×48，规格与 `ART.portrait` 相同（透明底、带描边）：束发的深色半身剪影，脸上一个问号。没有表情参数。图鉴 / 人物列表里还没见过的人用它。

### 7 勾选按钮框

- `ART.frame('chkOn')` 已勾（青玉底、右上角金色小牌带勾，`ink` 为 `#fff6e0`）、`ART.frame('chkOff')` 未勾（暗紫底、右上角空槽，`ink` 为 `#a8a4b8`）。返回格式与其它 `ART.frame` 相同：`{ url, slice: 6, size: 20, fill, ink, canvas }`，CSS 写法也相同（`border-image: url(...) 6 fill / … stretch`）。
- 勾选标记画在右上角 6×6 的角格里，九宫格拉伸时不会变形；续炼、护劫、当前差事这类开关按钮在两种 kind 之间切换即可。
