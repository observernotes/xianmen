#!/usr/bin/env python3
"""构建：裁剪像素字体 → 内嵌为 base64 → 合成单文件 HTML。

输出：
  dist/index.html     完整网页（可直接用浏览器打开 / GitHub Pages）
  dist/artifact.html  不含 <html>/<head> 外壳的版本（发布到 claude.ai Artifact 用）
依赖：pip install fonttools brotli

源码布局：
  src/logic/*.js  逻辑模块。顺序以 src/logic.js 里的 MODULES 数组为准（这里直接读它），按顺序原样内联；
                  每个模块自带一行样板，浏览器里执行即装到 window.L 上。
  src/events.js + src/content/*.js  事件数据，按 L.CONTENT_FILES 的顺序拼进同一个 <script>。
  src/ui/*.js     界面片段。共用一个作用域，按下面 UI_PARTS 的顺序拼进同一个 IIFE。
                  顺序只对“加载时就执行”的语句有要求（const/let 的声明要在被用到之前），函数声明会提升。
"""
import base64
import io
import pathlib
import re

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
FONT = ROOT / "tools" / "fusion-pixel.ttf"

# 界面片段的拼接顺序（src/ui/<名字>.js）
UI_PARTS = [
    "core",          # 工具、全局状态、字号、图标、头像
    "scene",         # 场景：洞府、历练动画、飘字、横幅
    "cine",          # 过场：突破 / 天劫 / 飞升
    "audio",         # 音效与音乐
    "save",          # 存档与读档（含旧档迁移入口）
    "hud",           # 逻辑事件与主界面 HUD
    "modal",         # 弹窗与弹窗队列
    "goalcard",      # 开罗式主画面：线 1 接口的兜底、时间条、目标卡、一行传讯、固定五格底栏、hlOnly 金框、目标卡【去】的跳转表
    "panel-bt",      # 突破
    "panel-exp",     # 历练
    "loot",          # 刷宝：归途翻牌、出发页“这里掉什么”与心愿、图鉴“掉落”页（COMBAT_LOOT §5）
    "panel-home",    # 洞府、闭关、疗伤，各建筑的入口
    "panel-field",   # 灵田：田一排、作物列表（改这一块 / 全部改种）、场景里的田（ART.drawPlot）、收成飘字
    "panel-alchemy", # 炼丹房：5×5 药引格与试炼、修炼 / 战斗 / 根基三页、续炼、丹囊；状态栏的丹毒葫芦
    "panel-market",  # 坊市
    "panel-sect",    # 宗门
    "duels",         # 对决、三年之约、天骄论道
    "duel-scene",    # 场景内的对决演出：擂台、双方小人、血条、火花、开场对视、胜败印章（duel() 调 duelStage）
    "battle",        # 历练的节点与回合战画面：btDrive（主循环里按节点推进月份）、事件演出、#bt 的气血 / 怒气 / 招式栏 / 大按钮（docs/COMBAT_LOOT.md §2）
    "events",        # 奇遇
    "panel-growth",  # 数值拆解、大事锦囊
    "panel-cal",     # 年历（24 格时间轴）、天下大势小牌、大势与换季的老祖气泡
    "panel-me",      # 外壳面板的分页条（meTabs）、【仙途】属性 / 记录 / 设置、【江湖】天骄榜 / 人物
    "panel-path",    # 【仙途】路径页、【江湖】外壳、章末结算、年报、纸鹤列表
    "panel-arts",    # 功法页、五行标记、掉落卡的【换上】
    "panel-gear",    # 法宝明细页（showGearDetail）、对比卡、强化、重铸、器炉打造、包裹
    "forge",         # 法宝详情 = 炼器台：强化（开锋）/ 淬灵 / 洗练三页（COMBAT_LOOT §6）
    "panel-equip",   # 【装备】一格：法宝 · 功法 · 灵宠 · 包裹；新版法宝页（三行装备栏 + 新到 + 收着的）
    "panel-realm",   # 秘境：场景里的门卡、气血条、房间动画、商与秘藏、入口与结算
    "panel-pets",    # 兽栏：灵宠卡片、出战、派岗、喂食、进化卡、名册满时的放生替换、洞府场景里的灵宠
    "life",          # 飞升、坐化、轮回（结算、传承、轮回殿、出身、命格、天道试炼、出身开场）、出身的约战变体
    "guide",         # 戒中老祖：引导、提示、指南、札记
    "panel-trib",    # 天劫准备页、心魔劫、雷劫中途一停、渡劫评价；人物页道心与因果（排在 guide 后：往 HINTS 里加讲解）
    "panel-rivals",  # 宿敌一览与宿敌卡（天骄榜分页）、论道前的对决准备、新秀挑战；宿敌与新秀的老祖讲解（排在 guide 后）
    "panel-disc",    # 宗门·门下：徒弟卡片、差事、传授、出师、收徒；长老与徒弟的事件立绘；职司 / 人脉 / 第一个徒弟的老祖讲解（排在 guide 后）
    "panel-codex",   # 人物 → 图鉴（十四类、奇遇链进度）、链与图鉴的横幅气泡、老祖讲图鉴与轮回结算（排在 guide 后：往 HINTS 里加讲解）
    "panel-people",  # 人物卡（喜好、委托、同伴、道侣双修）、来访送礼、历练同伴位、委托完成卡；送礼 / 委托 / 同伴 / 道侣 / 双修的老祖讲解（排在 guide 后）
    "guide-ask",     # 问老祖（三条建议 + 最近的气泡）、场景右下角的老祖头像、卡住检测气泡（S 系列）、补齐的讲解（会武前、改气泡的分类）（排在所有讲解之后）
    "onboard",       # 上手曲线：UI.isOpen(key) 读逻辑层的解锁表；讲解加“开了才讲”、解锁横幅、子项气泡、单角标（排在 guide-ask 之后）
    "clock",         # 时间流逝的界面一半：notify() 打断节流与纸鹤、自动停、解锁卡的真实时间间隔、年报最小版（docs/KAIRO_PLAN.md §3）
    "panel-prep",    # 大节点前 1 月的备战卡
    "intro",         # 开场与起名
    "boot",          # 每周天、主循环、输入、启动（必须最后）
]


def logic_bundle():
    entry = (SRC / "logic.js").read_text(encoding="utf-8")
    m = re.search(r"const MODULES = \[([^\]]*)\]", entry)
    names = re.findall(r"'([\w-]+)'", m.group(1))
    parts = []
    for n in names:
        parts.append(f"/* ===== src/logic/{n}.js ===== */\n" + (SRC / "logic" / f"{n}.js").read_text(encoding="utf-8"))
    return "\n".join(parts)


def events_bundle():
    """src/events.js（设 window.EVENTS）+ src/content/*.js 扩展包（push 进 window.EVENTS）。
    扩展包的顺序以 src/logic/events-engine.js 里的 L.CONTENT_FILES 为准（node 端也按它加载）。"""
    parts = []
    base = SRC / "events.js"
    if base.exists():
        parts.append("/* ===== src/events.js ===== */\n" + base.read_text(encoding="utf-8"))
    eng = (SRC / "logic" / "events-engine.js").read_text(encoding="utf-8")
    m = re.search(r"L\.CONTENT_FILES = \[([^\]]*)\]", eng)
    names = re.findall(r"'([\w-]+)'", m.group(1)) if m else []
    for n in names:
        f = SRC / "content" / f"{n}.js"
        if f.exists():
            parts.append(f"/* ===== src/content/{n}.js ===== */\n" + f.read_text(encoding="utf-8"))
    return "\n".join(parts)


def ui_bundle():
    parts = ["/* 废柴仙途 · 界面（src/ui/*.js 按 tools/build.py 的 UI_PARTS 顺序拼接） */\n(function () {\n'use strict';"]
    for n in UI_PARTS:
        parts.append(f"/* ===== src/ui/{n}.js ===== */\n" + (SRC / "ui" / f"{n}.js").read_text(encoding="utf-8"))
    parts.append("})();\n")
    return "\n".join(parts)


def charset(texts):
    chars = set()
    for t in texts:
        chars.update(t)
    # GB2312 一级常用字 + 全角标点，保证玩家自定义名字大多能显示像素字
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    for hi in range(0xA1, 0xA4):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode("gb2312"))
            except UnicodeDecodeError:
                pass
    chars.update(chr(i) for i in range(32, 127))
    chars.update("×→↑↓▸…·—“”‘’《》【】！？，。、：；（）")
    return "".join(sorted(c for c in chars if c.isprintable()))


def build_font(text):
    font = TTFont(str(FONT))
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.hinting = False
    opts.desubroutinize = True
    opts.name_IDs = ["*"]
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    # 裁剪后的字体属于修改版，按 OFL 要求换用自己的名字
    for rec in font["name"].names:
        if rec.nameID in (1, 4, 16):
            rec.string = "XPixel"
        elif rec.nameID == 6:
            rec.string = "XPixel-Regular"
    buf = io.BytesIO()
    font.flavor = "woff2"
    font.save(buf)
    return buf.getvalue()


def main():
    template = (SRC / "template.html").read_text(encoding="utf-8")
    logic = logic_bundle()
    art = (SRC / "art.js").read_text(encoding="utf-8")
    events = events_bundle()
    ui = ui_bundle()
    woff2 = build_font(charset([template, logic, art, ui, events]))
    b64 = base64.b64encode(woff2).decode("ascii")
    page = (
        template.replace("/*FONT_B64*/", b64)
        .replace("/*EVENTS_JS*/", events.replace("</script", "<\\/script"))
        .replace("/*LOGIC_JS*/", logic.replace("</script", "<\\/script"))
        .replace("/*ART_JS*/", art.replace("</script", "<\\/script"))
        .replace("/*UI_JS*/", ui.replace("</script", "<\\/script"))
    )
    DIST.mkdir(exist_ok=True)
    (DIST / "artifact.html").write_text(page, encoding="utf-8")
    full = (
        '<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        "</head>\n<body>\n" + page + "\n</body>\n</html>\n"
    )
    (DIST / "index.html").write_text(full, encoding="utf-8")
    print(f"font {len(woff2) / 1024:.0f} KB, page {len(page.encode()) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
