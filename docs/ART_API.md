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
