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

- 已接通章节剧情和主线行动、历练及首领回合战、季末结算、基础法宝和功法、坊市货架和行情、宗门身份和任务、秘境选门与秘藏、渡劫准备和续劫、天门和结局文本、坐化和轮回殿、建筑与阵位、灵田和炼丹、灵宠名册、存档恢复与 XT1 互导。
- 还需迁完原版系统界面和演出，包括战斗动画、装备词条与炼器、拍卖和坊市事件、宗门宝库与弟子、秘境原生场景、人物羁绊和结局过场。
- 完整迁移需要核对各系统入口、关键剧情与老档的行为，并在 Android 安装包上跑通主线及存读档。当前工程是迁移中的预览版本。
