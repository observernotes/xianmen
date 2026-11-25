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
