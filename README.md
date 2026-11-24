# 仙门崛起

一款像素风修仙宗门经营游戏。系统极简、操作只靠点按，修仙爽点一个不少：灵根抽卡、废柴逆袭、戒指老爷爷、渡劫雷劫、越级挑战、宗门大比打脸、白日飞升。

单文件网页，打开 `dist/index.html` 即可游玩（手机、电脑都行），进度自动保存在本机。

## 怎么玩

| 按键 | 做什么 |
| --- | --- |
| 收徒 | 花灵石开山收徒，三选一，灵根从伪灵根到混沌圣体 |
| 建设 | 升级山门、聚灵阵、灵脉、藏经阁、丹房 |
| 秘境 | 派最多三名弟子历练，带回灵石、法宝、功法、破境丹 |
| 弟子 | 查看弟子；头顶出现【！】时点他冲击大境界 |
| 宗门 | 天下宗门榜、存档、转世重修 |

其余交给时间：弟子会自己打坐修炼，小境界自动提升，每年年末自动举行天下宗门大比。

境界：炼气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫 → 飞升。金丹起每次突破都要渡雷劫，失败不会陨落，但下次成功率会提高。

按默认节奏，一局大约 30～40 个游戏年飞升（1 倍速约 30 分钟，可开 2 倍、4 倍速）。飞升后可以继续经营，或者转世重修，下一世修炼更快。

## 开发

```
src/logic.js      纯逻辑（数值、境界、秘境、大比、事件），浏览器和 node 共用
src/ui.js         像素场景、界面、音效、存档
src/template.html 样式与页面骨架
tools/build.py    裁剪像素字体并打包成单文件 → dist/
tools/sim.js      数值模拟：node tools/sim.js <种子> [v]
tools/shot.js     Playwright 冒烟测试与截图
tools/longrun.js  机器人通过界面完整玩一局，检查全程无报错
tools/edge.js     飞升、转世、奇遇弹窗测试
```

构建：

```
pip install fonttools brotli
python3 tools/build.py
```

## 字体

像素字体使用 TakWolf 的 [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font)（SIL Open Font License 1.1，见 `tools/FONT-LICENSE.txt`）。打包时裁剪为游戏所需字符与 GB2312 一级常用字，并按 OFL 要求改名为 XPixel。
