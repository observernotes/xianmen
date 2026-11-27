# 废柴仙途 Godot 移动端迁移

移动端界面由 Godot 4 的 Control、场景和纹理驱动。游戏规则和剧情数据仍使用同一份 `src/logic` 和 `src/content`，由原生 GDExtension 中的 QuickJS 执行。安卓包内没有 HTML 页面或 WebView。旧版 XT1 导出码用于跨客户端迁移存档。Godot 本地自动档还记录未关闭的结算卡。

## 构建

需要 Godot 4.6.3、对应导出模板、C/C++ 工具链、SCons 和网页构建使用的 Python 依赖。Android 另需 JDK 17、Android SDK、NDK 28.1.13356709。在 Godot 编辑器设置里填写 Java SDK 和 Android SDK 路径。

```sh
PYTHON="$PWD/.venv/bin/python" SCONS="$PWD/.venv/bin/scons" tools/build_godot.sh
PYTHON="$PWD/.venv/bin/python" SCONS="$PWD/.venv/bin/scons" tools/build_godot.sh --android
```

构建会获取固定版本的 godot-cpp 和 QuickJS，生成规则程序，执行原生冒烟测试，再按需导出独立包名的 Android 预览包。可用 `GODOT_BIN` 和 `ANDROID_HOME` 指定本机安装路径。

## 迁移验收

- 已接通原生规则运行时、洞府场景、条件台词与剧情选择、历练地图、深度和回合战操作与续战、行动点和季末结算、主线行动、筑基与聚灵阵、基础法宝和功法、坊市货架与行情、宗门身份和任务、秘境选门、商人和秘藏、存档恢复和 XT1 互导。
- 还需迁完原版系统界面和演出，包括首领战操作与战斗动画、装备词条与炼器、拍卖和坊市事件、宗门宝库与弟子、洞府经营、秘境原生场景、人物羁绊、轮回和结局。
- 完整迁移需要核对各系统入口、关键剧情与老档的行为，并在 Android 安装包上跑通主线及存读档。当前工程是迁移中的预览版本。
