# 新事件接入备忘（src/content/*.js → 事件引擎）

各写手交稿时报告的、引擎需要支持的东西。接入某个系统时，把这里对应的条目一起做掉。

## 接入状态（第一刀：事件加载 + 能力闸门 + 功法与五行；第二刀：法宝三槽；第三刀：历法、天下大势、坊市货架行情拍卖；第四刀：天劫、道心与因果；第五刀：灵宠；第六刀：秘境；第七刀：灵田作物与炼丹；第八刀：宗门加深与徒弟）

- [x] 三个扩展包在 node（`L.events()`）与 dist（`tools/build.py` 拼进 EVENTS 脚本）里都加载，顺序以 `src/logic/events-engine.js` 的 `L.CONTENT_FILES` 为准。
- [x] 能力闸门：`core.js` 的 `L.supportFx / supportElig / supportChoice / supportCost / supportTrigger / supportWhere`；事件用到任何没登记的写法就整条不出（`L.evGate(ev)` 列出缺什么）。各系统接入时在自己的模块里登记，对应事件自动上线。
- [x] `tools/check_events.js` 放开：新键、共享剧情触发键、最多 5 个选项、去掉数量上限；互补条件的选项按 flag 组合枚举检查“总有一个不花钱的可见”；`node tools/check_events.js report` 列出上线 / 闸住数量和闸住最多的键（`report list` 逐条列）。
- [x] 已登记（引擎现在就支持）：现有全部 fx 与资格字段；`cooldown`、`srankMin`、`rankMax`、`chain`/`step`（完成第 n 步自动置「链短名_n」）、选项级 `need / not / srankMin`（不满足不显示）、`choice.dao`（道心系统上线前只记数 `st.dao`）、`contrib` 可为负（扣可用贡献）、`unflag`；触发键 `beat:*`（首次击败宿敌，同时置 `beat_<id>`）、`srank:*`（晋升）、`pact_eve`（约战前一周天）、`trib:1`（第一次渡雷劫）；结为道侣时置 `daolv_su` / `daolv_ye`。
- [x] 功法系统登记：`fx.art`（可为数组；`x_hongmeng` / `m_xingdou` 记一片残篇，三片合成）、`fx.mastery`（当前心法熟练 ±n，没装心法时作用于战技）、一次性 flag `combo_hint` / `combo_hint_c18`（揭示共鸣提示）。
- [x] 重复 id：两位写手都写了 `story_pact_eve / story_trib1 / story_demon1～3 / story_ascend`，保留 `ev_sect_people.js` 版（CONTENT §14.4 记在这一组），`ev_world_chains.js` 的 8 段（含 `_b` 版）删去。
- [x] 血河老祖的 `mo_xuehe_1` 去掉了 `maxR: 7`（校验的老祖规则不再误伤“血河老祖”）；`mo_xuehe_2`、`mo_xuesan_2` 正文里单写“老祖”，仍保留。
- [x] 主线给功法（CONTENT §2 的“主”来源）：`story_r3` 得《天剑九式（残）》，`story_r6` 得《玄霄剑典·心卷》；《玄霄剑典·剑卷》只由老祖旧剑链终点 `ch_sword_6` 给（与器方《玄霄》一起；`story_r8` 的临时赠送已去掉）。
- [x] 法宝系统登记（`src/logic/gear.js`）：`fx.item` 增加 `'need'`（最弱的一槽）/ `'r'`（法衣）/ `'o'`（饰品）——槽名与 `st.gear`、`ART.item('r' | 'o')` 一致；
  `fx.plus`（当前兵器强化 +n，不掷）、`fx.affix`（±n：当前兵器随机去掉 / 添一条词条）、`fx.ore` 与 `cost.ore`、`fx.plan`、`fx.gear`（指定底子，走对比卡）；
  剧情触发键 `forge_fail`（强化失败时 10%，`home_forge_boom`）；一次性 flag `forge_refund2`（返还这回强化灵矿 ×2）、常驻 flag `neighbor_smith`（强化灵矿 −20%）。
- [x] **灵矿的单位**：事件里的 `ore: n`（fx 与 cost）按“筐”算，1 筐 = `L.oreUnit` = 1.5^境界（四舍五入，炼气 1、筑基 2、元婴 3、化神 5 … 渡劫 26），
  与器方“灵矿 基数 × 1.5^阶”同口径。写手原注“不按境界缩放”——不缩放时化神以后的“一筐灵矿”连一次强化都不够，所以改了；数值本身不用动。
- [x] **`fx.plan`**：`g_*` 器方记进 `st.gear.plans`（化神后器炉打造）；`f_*` 阵图在阵法系统上线前记进 `st.gear.zhentu` 先收着（`story_trib1` 的渡劫阵、`ch_danjing_5` 的丹火阵）。
- [x] 首领：首杀掉专属法宝（固定词条，走对比卡；槽没开就先收着，槽一开自动戴上）、首领材料 ×2、器方；金丹后每 48 周天可再战一次（材料 ×1）。
- [x] 历法与坊市登记（`src/logic/calendar.js`、`src/logic/market.js`）：
  - `elig.season`（`spring/summer/autumn/winter`，按 `t % 12` 的季节）、`elig.world`（只在该大势期间）；判定走新的通用钩子 `L.supportElig(key, { test(st, v, ev) })`，`L.eligible` 会调它。
  - `where: 'market'` 与触发键 `market:*` / `auction:*`：`L.marketTrigger(st, key, p)` 掷中后把事件排进 `st.market.evQ`，**打开坊市时先弹**（处理完一件接着弹下一件，最后才是坊市本身）；sim 里会去坊市的策略每周天顺手处理。
    时机：`market:restock` 换货后 5%（mkt_fake；魔劫期间 mkt_black）、`market:buy` 买轮换货时 10%（mkt_haggle）、`auction:open` 开拍 35%（auc_mystery）、`auction:rival` 有宿敌竞拍时 50%（auc_rival）、`auction:sell` 身上有 +5 以上或 5 阶以上法宝时 30%（auc_sell）。
  - 一次性钩子 flag：`mkt_discount` 下一届货架九折、`mkt_cut30` 退回这次轮换货的三成、`mkt_extra_slot` 下一届多一格、`auc_consign` 下一场拍卖会开槌时结 8×收入×行情均值、`mu_overpaid` 慕容这场拍到的不加战力；
    `lingchao_share` 灵气潮汐 +30% → +15%、`array_pause3` 聚灵阵停 3 周天（另记一次仁）。`xianfu_map` 留给秘境。
  - **修了一个旧坑**：`events-engine` 的内建 fx 登记以前会把 arts / gear 接在 `fx.flag` 上的钩子盖掉（`combo_hint`、`forge_refund2` 其实没生效），现在内建键已被登记过就不再覆盖。
  - 这一刀放行的 11 个：`mkt_fake`、`mkt_haggle`、`auc_mystery`、`auc_sell`、`season_autumn_harvest`、`season_winter_snow`、`world_lingchao`、`world_dahan`、`world_xianfu`、`world_shanglu`、`world_jiangdao`。
    还闸着、但历法与坊市部分已能结算的：`auc_rival`、`world_liuxing`（等宿敌恩怨 `grudge`）、`mkt_black`（等丹毒、因果）、`world_shouchao`（等兽粮 `feed`）、`world_danhui`（等药引 `yin`）、`world_kuangmai` / `world_mojie` / `world_tongji`（等因果 `karma`）、
    `season_spring_fair`（等 `pet`、丹毒）、`season_summer_storm`、`home_field_pest`（等灵宠心、兽粮、药引）。
- [x] 灵宠登记（`src/logic/pets.js`）：`fx.pet`（种 id，进名册，满了走放生 / 替换卡）、`fx.feed` 与 `cost.feed`（兽粮，原始数量）、`fx.petHeart`（剧情事件作用于触发它的那只 `st.petFocus`，洞府 / 历练事件作用于出战的，`pet_guard` 作用于巡山的、`home_field_pest` 作用于守田的；`pet_fight` 偏心新来的时老的那只另 −1）、
  `fx.petForm`（`种_a` / `种_b`；药引、灵矿在选项的 cost 里付，首领材料在这里扣；分支里不是花费的条件——禁地 3 趟、好感、季节、首领材料——没满足时该选项不显示，靠包了一层的 `L.choiceShown`）；
  `fx.yin` 与 `cost.yin`：药引系统上线前按每枚折灵草 `12 × (1 + 境界)`；**灵田炼丹那一刀起是真的药引（crops.js 登记）**；
  触发键 `egg`（得蛋，孵蛋事件）、`pet_evolve:<种>`（升到 5 级）、`pet_runaway`（0 心再闲 24 周天）、`pet_fight`（名册 ≥ 2，每届论道后 25%）、`pet_sick`（炼出下品丹时出战灵宠 30% 偷吃）；
  一次性 flag `hatch_stone` / `hatch_warm` / `hatch_field`（埋进灵田：直接 2 级）/ `pet_release` / `pet_job_pick`（派到推荐的岗）/ `pen_discount`（兽栏建筑上线前：喂养效率 +8%）。
  数据里写不出来的前提（CONTENT §14.5 的“触发条件”）在 `L.eligible` 外面补：`pet_gift` 出战 ≥ 3 心、`pet_wild_friend` 采药且有出战、`pet_guard` 有巡山、`home_field_pest` 灵田 ≥ 3 级；用到 petHeart / petForm 的事件都要名册里至少一只。
  这一刀放行的 29 个：`pet_hatch`、`pet_runaway`、`pet_fight`、`pet_sick`、`pet_gift`、`pet_wild_friend`、`pet_guard`、12 个 `pet_evolve_*`、`home_field_pest`、`season_summer_storm`、`world_shouchao`、`world_danhui`、`bai_q1`、`bai_end`、`ch_danjing_3`、`ch_fox_2`、`ch_fire_1`、`ch_star_3`。
  还闸着、但灵宠部分已能结算的：`season_spring_fair`（等丹毒）、`disc_lazy`（等徒弟）、`dan_yaochen_1/2`（等人脉）、`realm_fire_spirit`、`realm_bees`（等秘境）。
- [x] 天劫与道心因果登记（`src/logic/trib.js`、`src/logic/dao.js`）：
  - 剧情触发键 `demon:1～3`（元婴 / 化神 / 合体雷劫之前，界面在准备页点【引动天劫】后先弹，`L.tribPre`）、`ascend`（飞升雷劫之前，来敲门的是道侣 > 好感最高的知己 > 老祖，`L.ascendVisitor`）；`trib:1` 照旧在第一次渡过雷劫后触发。
    心魔劫的 flag：`demonN_firm` 这一境界的雷劫 +5%，`demonN_waver`（与 `_shaken` 同义）−5%；题目（`L.demonQuestion`）：一 = 本世最早一条没了的因果（没有就是被逐出山门那天），二 = 没选的那位道侣候选（没有道侣是老祖），三 = 陆天衡。
  - `fx.karma: '因果id'`：记一条因果（当事人与“你做了什么”在 dao.js 的 `L.KARMA`，没登记的按事件人物 / 标题兜底），同时记下当时选的是哪一项（心魔劫题目用）。
    `fx.unkarma: 'any' | '因果id'`：了结最早的一条 / 指定那条。`choice.dao` 现在真的记道心（5 / 12 / 25 笔各一级，见 SYSTEMS §14），升级时发 `dao` 事件给老祖气泡。
  - 新资格字段：`karma: n`（事件级：有一条 n 周天前结下、还没了的因果）、`daoMin: { k|w|r: n }`（事件级与选项级：该道心至少 n 笔）；新占位符 `{kwho}` / `{kwhat}`（最早那条没了的因果的当事人 / 做了什么）。`tools/check_events.js` 已认这些键。
  - 新扩展包 `src/content/ev_karma.js`（寻仇 5 件：旧账上门、冤家路窄、苦主之后、悬赏令、漏雨的屋），全部上线。
  - 这一刀放行的 15 个：`story_demon1～3`、`story_ascend`、`tianheng_2`、`world_kuangmai`、`world_mojie`、`world_tongji`、`ch_map_2`、`ch_sword_4` 与 ev_karma 的 5 件。
    还闸着、但因果部分已能结算的：`realm_altar`、`realm_sword_slave`（等秘境）、`zhao_2`、`xue_1`、`xue_2`（等恩怨 `grudge`）、`sect_frame`、`sect_traitor`、`mo_xuehe_1`、`mo_xuesan_2`（等人脉 `favor`）、`ye_q1`（等药引）、`mkt_black`（等丹毒）、`disc_avenge`（等徒弟）。
  - 写手按“无数据键可表达”改成 `p` 掷骰的道心门槛（drowned 稳 ≥ 5、yun_1 随稳道心…）仍是掷骰；需要时可改写成 `daoMin`。
- [x] 秘境登记（`src/logic/realm.js`，第六刀）：`where: 'realm'`（“奇”房间，`L.pickEvent(st, 'realm', { theme })`）、`elig.theme`（jianqi / baicao / ronghuo / youquan）、`fx.hp`（本局气血 ±n）、`fx.token` / `cost.token`（秘境令）；
  `run_*` 一次性标记由 fx.flag 的钩子从 `st.eflags` 挪进 `st.run.fl`，出秘境清掉（reveal / elite / reroll / trap_up / herb_gift / maxhp_down / proxy / safe / skip / melt 全部有效）；`xianfu_map` 在仙府那一局用掉（首层门全显）。
  - **能力登记可以限 where**：`L.supportFx(key, { where: ['realm'], … })` 只对这些 where 的事件算支持（events-engine 的闸门认它）。秘境事件用到、但所属系统还没做的键，realm.js 先**只对秘境**登记了一份“先收着”的实现：
    `fx.favor`（`st.favor`）、`fx.grudge` / `elig.grudge`（`st.grudge`）、`fx.toxin`（`st.toxin`）、`fx.recipe`（`st.recipeNote` 计数）；合并灵宠与天劫道心后，`fx.yin` / `cost.yin` / `fx.feed` / `fx.pet` 由 pets.js、`fx.karma` 由 dao.js 正式登记（覆盖了秘境里的先收着版本），秘藏的灵宠蛋走 `fx.pet` 进名册。
    这些只在“还没人登记过”时登记；对应系统上线时不带 where 重新登记即覆盖（加载顺序无关），别处用这些键的事件到那时才放行——所以这一刀只多放行了 16 个秘境事件，没有连带放出别的系统的事件。
  - realm_rival 已上线，但要宿敌恩怨 ≥ 20 才会出现（恩怨系统上线前只有秘境事件改得动 `st.grudge`）。灵宠天赋 realmUnk（霜月狐）现在是秘境“？”门减半（去掉了秘境上线前折的奇遇把握）。
- [x] 灵田作物与炼丹登记（`src/logic/crops.js`、`src/logic/alchemy.js`，第七刀）：`fx.yin` / `cost.yin` 换成真的药引（`st.mats.yin`，原始数量；秘境的占位登记与旧 `st.yin` 折进来）、
  `fx.toxin`（丹毒 ±n，走 `L.addToxin`，天劫临阵吞丹也走它）、`fx.recipe`（`'need'` 揭晓一格没试过的药引丹方，丹炉等级够的优先；或指定丹方 id，`jiuzhuan` 是秘方；已会的给一点灵草）、
  剧情触发键 `field_mutant`（药引作物成熟时 3%，记下是哪种作物）；一次性 flag `field_half`（本季灵田产量减半）、`mutant_seed`（变种的那种作物以后 ×1.2）、`seed_early`（下一种没解锁的作物提前能种）。
  这一刀放行的 6 个：`ch_danjing_5`、`ge_end`、`home_field_mutant`、`mkt_black`、`season_spring_fair`、`xue_3`（另有秘境的 `realm_herb_king`、`realm_ghost_market` 从占位换成真的结算）。
  还闸着、但炼丹部分已能结算的：`dan_yun_1`、`mo_xuehe_1`、`mo_xuesan_1`、`mo_youji_2`（等人脉 `favor`）。
- [x] 宗门加深登记（`src/logic/sect2.js`、`src/logic/disciples.js`，第八刀）：
  - `fx.favor`：键 `a / b / c` = 本宗第 1 / 2 / 3 位长老（L.ELDERS 的顺序），或写具体长老 id（任何一宗的都算合法，不是本宗的就忽略；没入宗整条忽略）；值 ±50 以内，结果 0～100 截断；
    跨过 40 时给小恩惠、第一次到 80 给绝学。不带 where 重新登记，覆盖了 realm.js 只对秘境登记的“先收着”版本（`st.favor` 不再用）。
  - `elig.favorMin: [长老id, n]`：身在该长老的宗门且支持 ≥ n（隐含 sect）。鬼医薛三：事件里的长老 id 是 `xuesan`，立绘用美术 id `xue3`（L.ELDERS 里 `img: 'xue3'`）。
  - `fx.duty`（dan / qi / zhan / fa / wai，设职司，事件里免“会武后才能改”的限制）；`fx.busy: n`（`st.retreat = { kind: 'busy' }`，n 周天不修炼、不能出门；人已在路上或闭关时这一项作废）；
    `fx.contrib` 负数照旧（扣可用贡献）；`fx.disc`（见下）。
  - 触发键 `sect:`（`sect:heir`：真传时除人脉以外的晋升条件都够了；`sect:lord`：太上长老时同上；各一次）、`disciple`（收徒当天，每名徒弟一次）、`disc:`（徒弟事件）。
  - **徒弟事件每名徒弟各走一遍**：`L.discFire(st, key, 徒弟)` 不看 evDone，把事件排进 storyQ，同时在 `st.disc.q` 记下是哪名徒弟；结算时（包了一层的 `L.resolveChoice`）取出来当 `st.disc.focus`，
    `fx.disc` 作用于它：`new: strong|clever|quiet` 收候选里那一类（没有候选就现生一个；名额满了作罢）/ `grow` 成长永久 + / `lv` 立升 n 小层 / `heart` 情分 ± / `inj` 休养 n 周天 / `job` 差事收益 + /
    `out` 离开名册（金丹以上算出师：贡献 + 桃李，否则只是走了）。时机：`disc:candidates` 每 24 周天送候选时；`disc:break` 跨大境界；`disc:poach` 小层 ≥ 8；`disc:avenge` 有一条 24 周天以上没了的因果；
    `disc:graduate` 点【出师】时；其余按性情（莽 / 贪玩 trouble、聪慧 question、滑 steal、痴 obsess、孤傲 pride、仁厚 kind、贪玩 lazy），每名徒弟每周天 1/30，两件之间至少隔 18 周天。
    `disc_first_day` 的三个基调 flag（disc_strict / disc_warm / disc_wild）落到那名徒弟身上（成长 +5% / 情分 +1 / 差事 +10%）后清掉；`sect_candidates` 选“都不收”清掉这批候选。
  - 一次性钩子：`vault_tip`（下一届宝库法宝那格高一阶）、`heir_none`（圣子之争的人脉条件换成累计贡献 ×1.2，晋升后清）、`lord_gift`（宗主之争补一票；`lord_vote` / `lord_duel` 只是记录），
    `rookie_disciple`（new_3 新秀跪门“收下他”：名额有空就收进门下，新秀外观，起点筑基）。`war_feint` 留给宗门战事那一刀。
  - 数据里写不出来的前提在 `L.eligible` 外面补：`sect_frame` 要执法那位（本宗第 3 位）支持 < 40；血煞魔宗弟子碰不上 `sect_war_xuesha`、`sect_alliance`。
  - 这一刀放行的 43 个：宗门通用 8 个（sect_duty_pick、sect_junior_duel、sect_frame、sect_lecture、sect_candidates、sect_succession、sect_lord_vote、sect_traitor；sect_vault_new 早已上线）、
    长老 20 个（24 个里 dan_yun_1、mo_youji_2、mo_xuesan_1 还等丹毒，mo_xuehe_1、mo_xuesan_1 还等丹方）、徒弟 12 个、人物委托 3 个（su_q1、su_q2、bai_q2：fx.busy / fx.favor）。
    还闸着、但宗门部分已能结算的：chu_q2、mo_q1（fx.busy 已登记，等恩怨）、mu_4、xue_1（fx.favor 已登记，等恩怨）。
    与灵田炼丹合并后，等丹毒 / 丹方的 4 个长老事件（dan_yun_1、mo_xuehe_1、mo_xuesan_1、mo_youji_2）也放行了。
- [x] 宿敌与新秀登记（`src/logic/rivals2.js`，第九刀）：
  - `fx.grudge`（不限 where，覆盖秘境里先收着的版本；键是宿敌 id，或 `rk` = 池子里恩怨最深的那位新秀）、`elig.grudge` = [宿敌id, 最小, 最大]（恩怨 −100～100）、新资格字段 `rkGrudge: n`（池子里有恩怨 ≥ n 的新秀）、新占位符 `{rk}`（那位新秀的名字）。
  - 选项级 `foe: 宿敌id | 'rookie'`：配 `duel` 用，对手按这位宿敌算五行克制和他的法宝（新秀另用他的真战力，`L.choiceFoe`）；events-engine 的对决、界面的胜算与半身像都读它。已加在 `zhao_1`、`xue_2`、`realm_rival`、`new_2` 和新的伏击事件上。
  - `fx.rookie: 'win' | 'lose' | 'teach'`：新秀这一场的结局（`new_2` 的应战 / 指点；`L.rookieResolve`）。
  - 剧情触发键 `rookie:appear / near / beaten / trouble`（新秀出现 / 追到 5 名内 / 被打压之后 / 指点后 24 周天）、`war_eve:tianjian`（头一回满足天剑宗来犯条件时把来犯排到 6 周天后，先发这一封信；`zhao_3` 置的 `raid_intel` 让那一场对决 ×1.3、打完用掉；`tianheng_1` 的 `raid_delay` 把来犯推迟 24 周天）。
  - 事件置的一次性标记当场生效：`rookie_seen`（new_1 看他一眼：新秀五行显形）、`yun_elem`（yun_1 掀棋盘：云无极五行显形）。恩怨降到 −40 以下时引擎置 `zhao_owes`（赵乾倒戈）。
  - 新扩展包 `src/content/ev_rivals2.js`（11 个，CONTENT §14.2 的 23 个都已在 ev_realm_rivals.js）：恩怨 ≥ 60 的伏击 `rv_ambush_mu / zhao / chu / xue / yun / rk`，≤ −40 的化敌为友 `zhao_4`、`tiankuo_5`（楚天阔同行 `tiankuo_ally`：斩妖 +6，同伴系统上线后可改由它接管）、`mu_5`、`xue_4`、`yun_4`。
  - 这一刀放行的 39 个：ev_realm_rivals 的 20 个（`mu_1～4`、`zhao_1～3`、`tiankuo_1～4`、`xue_1`、`xue_2`、`yun_1`、`yun_2`、`new_1～4`、`auc_rival`）、ev_sect_people 的 `chu_q2`、`mo_q1`、ev_world_chains 的 `world_liuxing`、`ch_tianjian_1～4 / 6`，加新的 11 个。
- 当前上线 339 / 343（宿敌与新秀 +39，含新增 11 个；还闸着的 4 个等洞府：`build:*`、`plot_full`、`formation_fail`）。宗门加深那一刀 300 / 332（宗门加深 +43，与灵田炼丹合并后那 4 个长老事件 +4）。灵田与炼丹那一刀 253 / 332（+6）。合并灵田炼丹之前 247 / 332（基础 122 全部上线；扩展包 125 / 210；秘境 16 / 16）。灵宠 + 天劫道心合并后 231 / 332；秘境单独接入时 202 / 327。
- 灵宠那一刀 215 / 327；天劫与道心因果单独接入时 201 / 332；历法与坊市那一刀 186 / 327。
- 法宝那一刀时上线 175 / 327。法宝这一刀放行的 10 个：`ch_map_3`、`ch_map_5`、`ch_tea_5`、`ch_sword_3`、`ch_sword_6`、`ch_sea_4`、`ch_star_4`、`story_trib1`、`sect_vault_new`、`home_forge_boom`。
  还闸着、但法宝部分已能结算的：`realm_forge`、`realm_broken_sword`、`realm_twin_doors`（等秘境）、`xue_2`（等宿敌恩怨与因果）、`mu_3`、`yun_1`、`mkt_fake`、`auc_*`（等坊市事件、宿敌）、`jian_tieye_*`（等人脉）、`world_kuangmai`（等大势）、`ch_danjing_5`（等 `fx.recipe`）。
  闸住最多的键：`fx.favor`、`fx.grudge`、`elig.favorMin`、`fx.petHeart`、`cost.yin`、`where.realm`、`fx.karma`、`fx.hp`、`elig.theme` …（`report` 有全表）。

## ev_realm_rivals.js（秘境 16、宿敌与新秀 23、坊市拍卖 6）

- 文件头列出了引擎要设置或读取的所有 flag：首次击败宿敌置 `beat_<rival>`；秘境内的 `run_*`；若干一次性的坊市、突袭 flag。
- CONTENT.md 之外新增的 fx：`toxin`、`plus`（兵器强化 +n）、`affix: -1`、`item: 'o'|'r'`（法衣/饰品）、`recipe: 'need'`、`unkarma: 'any'`。
- 选项可以带 `need` / `not` / `srankMin` 来隐藏自己；每个事件仍保证有一个可见的免费选项。
- 新的 `where: 'market'`，触发键如 `market:restock`、`auction:rival`。
- 新的剧情触发键：`beat:yun`、`war_eve:tianjian`、`rookie:appear|near|beaten|trouble`；`new_*` 事件是 `once: false`。
- 秘境主题 id：`jianqi / baicao / ronghuo / youquan`。洞府访客事件带 `visit: true`。
- 无数据键可表达的门槛已改成 `p` 掷骰：天眼通（twin_doors）、丹方 ≥ 6（herb_king）、稳 ≥ 5（drowned）、金系/稳 修正（broken_sword、yun_1）。引擎实现对应系统后可以按条件调整 `p`。
- 待补的缺口：
  - 数据无法表达“或”：mu_3 的“质问”置 `mu_press`，mu_4 也应接受它。mkt_black 只覆盖魔劫，没覆盖魔宗弟子。
  - `sword_slave_saved` 预告了一个“报恩”洞府事件，计划表里没有。
  - tiankuo_2 置 `tk_rubbing`，可作为 ch_tianjian 链的第 2 步。
  - realm_forge 的“熔一件宝”、mkt_black 的“卖因果”在没有可熔/可卖的东西时应隐藏。
- [x] `tools/check_events.js` 需要放开：新键、同一 `realm:6/7` 触发多个事件、`tianheng_2` 的 4 个选项、旧的事件数量上限。
- 写手的校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev/validate.js（会话临时目录）。

## ev_sect_people.js（宗门 45、人物委托与终章 26，共 71）

- [x] 选项数超过旧校验上限 3：sect_duty_pick 5 个，sect_candidates / sect_succession 4 个。
- 长老 `_2` 事件里“帮他”是 75% 成功；访客超时按“置身事外”结算。
- sect_frame 去掉了“执法人脉 < 40”（没有 favorMax 键）——sect2.js 在 `L.eligible` 外面补回来了（本宗第 3 位长老支持 ≥ 40 时不出）。
- chu_q1、bai_end 是历练事件（剑冢、狐族秘地），不是访客。
- 机制替换：ge_end 的“丹方 ≥ 12”改为 50%；ye_q2 信任检定必过；ye_end 的特殊历练改为概率选项；disc_kind 的“仁 +2”只是一个 `dao: 'r'`；ge_q2 对丹霞谷人脉的影响改成 flag。
- [x] 点名血河老祖的三个魔宗事件带 `maxR: 7`（只是旧的 /老祖/ 规则误伤，接入时可去掉）。——`mo_xuehe_1` 已去掉；另两个正文单写“老祖”，保留。
- CONTENT.md 之外新增的 fx：`toxin`（丹毒）、`busy: n`（占用 n 周天）、`duty: 'dan'|'qi'|'zhan'|'fa'|'wai'`（职司）、`disc: {new|grow|lv|heart|inj|job|out}`（徒弟）；`contrib` 可以为负；选项级 `need`（用于 zhao_owes）；`unkarma: 'any'`。
- 新剧情触发键：`srank:2`、`sect:heir`、`sect:lord`、`disciple`、`disc:*`、`pact_eve`、`trib:1`、`demon:1`～`demon:3`、`ascend`。`disc:*` 要按每个徒弟各触发一次，而不是每世一次。
- [x] 结为道侣时自动置 `daolv_su` / `daolv_ye`。
- 长老 id：剑宗 lingxu / tieye / liu；丹霞谷 yun / yaochen / chisong；道宗 xuanwei / shouzhuo / qingxu；魔宗 xuehe / xuesan / youji。
- 文件头注释里有完整清单；写手校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev2/validate.js（会话临时目录）。

## ev_world_chains.js（灵宠/洞府/历法 42、奇遇链 47 步、主线补充 8，共 97）

- [x] ch_sword 第 5 步就是 ev_realm_rivals.js 的 tianheng_2（已补上 `chain: 'ch_sword', step: 5`）。链事件完成后引擎要自动置 `链短名_步`（如 `sword_5`）。
- 新增事件 id：story_demon2_b、story_ascend_b（有道侣的版本，按 `daolv` 区分）。
- 7 个原本在早期地图的链步骤改成了洞府访客事件（ch_map_5、ch_sword_3、ch_sea_2、ch_fox_2～4、ch_fire_4），ch_tianjian_2 也是，避免中期玩家不回老地图导致链卡住。
- 与其他文件的 flag 约定：ch_tianjian_6 不置 `tiankuo_ally`（由 tiankuo_3 给）；选“私下逼宫”置 `tj_private`，tianheng_2 的文本默认揭露发生在会武——接入时检查一致性。雪团灵狐血脉奖励在 bai_end。
- [x] `fx.art` 可以是数组（ch_fire_5 同时给焚天诀和血遁）；指向 `x_hongmeng` 时算三片残篇中的一片。
- 新剧情触发键：`egg`、`pet_runaway`、`pet_fight`、`pet_sick`、`plot_full`、`field_mutant`、`formation_fail`、`forge_fail`、`build:spring`、`build:library`、`pact_eve`、`trib:1`、`demon:1/2/3`、`ascend`；季节值 `spring/summer/autumn/winter`；约 25 个一次性引擎 flag（见文件头）。
- [x] check_events.js 需要允许同一剧情触发键对应多个事件（realm:6、demon:2、ascend 都是共享的）。
- 写手校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev3/validate.js（会话临时目录）。
