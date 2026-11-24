#!/usr/bin/env python3
"""构建：裁剪像素字体 → 内嵌为 base64 → 合成单文件 HTML。

输出：
  dist/index.html     完整网页（可直接用浏览器打开 / GitHub Pages）
  dist/artifact.html  不含 <html>/<head> 外壳的版本（发布到 claude.ai Artifact 用）
依赖：pip install fonttools brotli
"""
import base64
import io
import pathlib

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
FONT = ROOT / "tools" / "fusion-pixel.ttf"


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
    logic = (SRC / "logic.js").read_text(encoding="utf-8")
    ui = (SRC / "ui.js").read_text(encoding="utf-8")
    woff2 = build_font(charset([template, logic, ui]))
    b64 = base64.b64encode(woff2).decode("ascii")
    page = (
        template.replace("/*FONT_B64*/", b64)
        .replace("/*LOGIC_JS*/", logic.replace("</script", "<\\/script"))
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
