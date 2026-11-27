# 废柴仙途 Godot 移动端迁移

移动端界面由 Godot 4 的 Control、场景和纹理驱动。游戏规则和剧情数据使用同一份 `src/logic` 和 `src/content`，由原生 GDExtension 中的 QuickJS 执行。安卓包内没有 HTML 页面或 WebView。旧版 XT1 导出码用于跨客户端迁移存档。Godot 有三份自动档和三份手动档，自动档还记录未关闭的结算卡，读取其他档位前会备份当前进度。

## 构建

需要 Godot 4.6.3、对应导出模板、C/C++ 工具链、SCons 和网页构建使用的 Python 依赖。Android 另需 JDK 17、Android SDK、NDK 28.1.13356709。在 Godot 编辑器设置里填写 Java SDK 和 Android SDK 路径。

```sh
PYTHON="$PWD/.venv/bin/python" SCONS="$PWD/.venv/bin/scons" tools/build_godot.sh
PYTHON="$PWD/.venv/bin/python" SCONS="$PWD/.venv/bin/scons" tools/build_godot.sh --android
```

构建会获取固定版本的 godot-cpp 和 QuickJS，生成规则程序，执行原生冒烟测试，再按需导出独立包名的 Android 预览包。可用 `GODOT_BIN` 和 `ANDROID_HOME` 指定本机安装路径。

## 迁移验收

- 已接通章节剧情和主线行动、历练及首领回合战、掉落心愿与翻牌、法宝洗练与打造、坊市行情和拍卖、洞府访客与人物羁绊、宗门任务与宝库、长老职司和弟子、历法和图鉴、秘境选门与秘藏、渡劫与轮回、洞府经营、灵宠以及存档和 XT1 互导。
- 历练场景使用原版背景与角色图集，自动推进路程和战斗回合。可手动放绝招、服丹或撤退，三年之约后可开启自动绝招和双倍速度。存档重放已执行的回合指令，恢复当时的战斗状态。音乐和音效来自原版曲谱的离线渲染。
- 天骄榜和大事件已接入备战、换战技、擂台演出及结算，九宗会武可依次观看玩家与两位弟子的对局。演出可跳过，重启从当前一局接着看。秘境使用原版四种场景、门卡和房间动画。序章分镜、剧情立绘、关键画面、章节结算和结局插画已接入。
- 独立过场使用从原版分镜生成的 Theora 视频，由 Godot 播放。字幕、音乐和音效在原生界面按时间触发，播放或跳过后会记入跨世回忆。前台中断后，从当前过场重新开始。
- 包裹、变强建议、备战和历练准备使用共享规则。出发前可看风险、换战技、邀请同伴或选择护送任务。属性、道心、称号、历年年报和纸鹤也有原生入口。
- 完整迁移需要核对各系统入口、关键剧情与老档的行为，并在 Android 安装包上跑通主线及存读档。当前工程是迁移中的预览版本。

## 素材更新

先用 `tools/build.py` 生成网页版的离线素材渲染入口。用 `node tools/extract_godot_art.js` 传入 `--combat`、`--duel`、`--realm`、`--story` 或 `--items`，生成相应素材。音频可用 `tools/audio_render.js` 的 `--loop` 选项渲染完整乐段，将所需 WAV 编码为 Ogg Vorbis 后放入 `godot/audio`。素材工具在开发机使用 Playwright，手机端直接加载导出的图片与音频。

用 `node tools/render_godot_cinematics.js` 更新过场与播放时间表。它需要 Playwright、生成后的网页版和启用 `libtheora` 的 FFmpeg。可用 `FFMPEG_BIN` 指定编码器，通过第一个参数传入正则表达式来重渲染指定过场。
