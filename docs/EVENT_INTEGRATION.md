# 新事件接入备忘（src/content/*.js → 事件引擎）

各写手交稿时报告的、引擎需要支持的东西。接入某个系统时，把这里对应的条目一起做掉。

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
- `tools/check_events.js` 需要放开：新键、同一 `realm:6/7` 触发多个事件、`tianheng_2` 的 4 个选项、旧的事件数量上限。
- 写手的校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev/validate.js（会话临时目录）。

## ev_sect_people.js（宗门 45、人物委托与终章 26，共 71）

- 选项数超过旧校验上限 3：sect_duty_pick 5 个，sect_candidates / sect_succession 4 个。
- 长老 `_2` 事件里“帮他”是 75% 成功；访客超时按“置身事外”结算。
- sect_frame 去掉了“执法人脉 < 40”（没有 favorMax 键）。
- chu_q1、bai_end 是历练事件（剑冢、狐族秘地），不是访客。
- 机制替换：ge_end 的“丹方 ≥ 12”改为 50%；ye_q2 信任检定必过；ye_end 的特殊历练改为概率选项；disc_kind 的“仁 +2”只是一个 `dao: 'r'`；ge_q2 对丹霞谷人脉的影响改成 flag。
- 点名血河老祖的三个魔宗事件带 `maxR: 7`（只是旧的 /老祖/ 规则误伤，接入时可去掉）。
- CONTENT.md 之外新增的 fx：`toxin`（丹毒）、`busy: n`（占用 n 周天）、`duty: 'dan'|'qi'|'zhan'|'fa'|'wai'`（职司）、`disc: {new|grow|lv|heart|inj|job|out}`（徒弟）；`contrib` 可以为负；选项级 `need`（用于 zhao_owes）；`unkarma: 'any'`。
- 新剧情触发键：`srank:2`、`sect:heir`、`sect:lord`、`disciple`、`disc:*`、`pact_eve`、`trib:1`、`demon:1`～`demon:3`、`ascend`。`disc:*` 要按每个徒弟各触发一次，而不是每世一次。
- 结为道侣时自动置 `daolv_su` / `daolv_ye`。
- 长老 id：剑宗 lingxu / tieye / liu；丹霞谷 yun / yaochen / chisong；道宗 xuanwei / shouzhuo / qingxu；魔宗 xuehe / xuesan / youji。
- 文件头注释里有完整清单；写手校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev2/validate.js（会话临时目录）。

## ev_world_chains.js（灵宠/洞府/历法 42、奇遇链 47 步、主线补充 8，共 97）

- ch_sword 第 5 步就是 ev_realm_rivals.js 的 tianheng_2（已补上 `chain: 'ch_sword', step: 5`）。链事件完成后引擎要自动置 `链短名_步`（如 `sword_5`）。
- 新增事件 id：story_demon2_b、story_ascend_b（有道侣的版本，按 `daolv` 区分）。
- 7 个原本在早期地图的链步骤改成了洞府访客事件（ch_map_5、ch_sword_3、ch_sea_2、ch_fox_2～4、ch_fire_4），ch_tianjian_2 也是，避免中期玩家不回老地图导致链卡住。
- 与其他文件的 flag 约定：ch_tianjian_6 不置 `tiankuo_ally`（由 tiankuo_3 给）；选“私下逼宫”置 `tj_private`，tianheng_2 的文本默认揭露发生在会武——接入时检查一致性。雪团灵狐血脉奖励在 bai_end。
- `fx.art` 可以是数组（ch_fire_5 同时给焚天诀和血遁）；指向 `x_hongmeng` 时算三片残篇中的一片。
- 新剧情触发键：`egg`、`pet_runaway`、`pet_fight`、`pet_sick`、`plot_full`、`field_mutant`、`formation_fail`、`forge_fail`、`build:spring`、`build:library`、`pact_eve`、`trib:1`、`demon:1/2/3`、`ascend`；季节值 `spring/summer/autumn/winter`；约 25 个一次性引擎 flag（见文件头）。
- check_events.js 需要允许同一剧情触发键对应多个事件（realm:6、demon:2、ascend 都是共享的）。
- 写手校验脚本：/tmp/claude-0/-home-user-xianmen/9c6ceeed-9bee-5408-804e-0383805fba9d/scratchpad/ev3/validate.js（会话临时目录）。
