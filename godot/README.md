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
- 历练场景使用原版背景与角色图集，Godot 渲染回合动作和伤害反馈。音乐和音效来自原版曲谱的离线渲染。
- 还需迁完原版剩余入口和演出，包括天骄榜与大事件的赛前准备、秘境场景、对话头像、章节及结局过场，以及部分独立功能。
- 完整迁移需要核对各系统入口、关键剧情与老档的行为，并在 Android 安装包上跑通主线及存读档。当前工程是迁移中的预览版本。

## 素材更新

先用 `tools/build.py` 生成网页版的离线素材渲染入口。然后运行 `node tools/extract_godot_art.js --combat` 生成战斗图集。音频可用 `tools/audio_render.js` 的 `--loop` 选项渲染完整乐段，将所需 WAV 编码为 Ogg Vorbis 后放入 `godot/audio`。这两个素材工具在开发机使用 Playwright，手机端直接加载导出的图片与音频。
