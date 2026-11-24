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
