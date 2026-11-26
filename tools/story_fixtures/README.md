# 旧存档样本（主线验收用）

`tools/story_accept.js` 的 H 组、`tools/story_accept_ui.js` 的读档用例读这里的 JSON。
每份都是用旧版本的逻辑（提交 19fd51c＝2.3.1、7622b00＝2.3.2 导出的 `src/` + `tools/sim.js`）真跑出来的存档，不是手改的。

重新生成：把旧版本导出到某个目录，然后

    node tools/story_fixtures/gen_fixtures.js <旧版本目录> v232 tools/story_fixtures

文件名 `<版本>_<局面>_t<月份>.json`：`refuse` = 一直没入宗（“没人让我进门派”那一类）、`lone_sanxiu` = 散修丹师不入宗、`lone_wuzong` = 天道试炼·无宗、
`pactlost` = 约战输了、`lazy` / `idle` = 随手玩 / 只打坐。2.3.1 的章是按境界推的（没入宗也会显示第三章以后），读进新版本要退回第一个没做完的主线章。
