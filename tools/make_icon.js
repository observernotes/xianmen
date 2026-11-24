// 生成安卓启动图标：用游戏里的像素美术绘制 48×48，再按整数/近邻放大到各密度
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage();
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  await page.waitForTimeout(500);
  const urls = await page.evaluate(() => {
    const S = 48;
    const c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    // 夜空渐变
    const bands = ['#151236', '#1d1a48', '#28245a', '#352c6c', '#46357a', '#5a4084'];
    for (let i = 0; i < S; i++) { g.fillStyle = bands[Math.min(bands.length - 1, Math.floor(i / S * bands.length))]; g.fillRect(0, i, S, 1); }
    // 星星与月亮
    g.fillStyle = '#e8ecff'; for (const [x, y] of [[6, 5], [14, 9], [40, 6], [33, 13], [9, 16], [43, 19]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = '#fff4c8'; for (let y = -5; y <= 5; y++) { const w = Math.round(Math.sqrt(25 - y * y)); g.fillRect(35 - w, 10 + y, w * 2 + 1, 1); }
    g.fillStyle = '#28245a'; for (let y = -5; y <= 5; y++) { const w = Math.round(Math.sqrt(25 - y * y)); g.fillRect(37 - w, 8 + y, w * 2 + 1, 1); }
    // 金色光晕 + 打坐主角
    const spr = window.ART.sit({ hair: '#2a2230', skin: '#f2c9a0', f: 0 }, 2);
    g.globalAlpha = 0.35; g.fillStyle = '#ffe39a';
    for (let y = -15; y <= 15; y++) { const w = Math.round(Math.sqrt(225 - y * y)); g.fillRect(24 - w, 28 + y, w * 2 + 1, 1); }
    g.globalAlpha = 1;
    g.drawImage(spr, Math.round(24 - spr.width / 2), Math.round(47 - spr.height));
    // 圆角（像素阶梯）与描边
    const mask = (x, y) => { const r = 6; const dx = Math.max(0, r - x, x - (S - 1 - r)), dy = Math.max(0, r - y, y - (S - 1 - r)); return dx * dx + dy * dy <= r * r; };
    const img = g.getImageData(0, 0, S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { if (!mask(x, y)) img.data[(y * S + x) * 4 + 3] = 0; }
    g.putImageData(img, 0, 0);
    const out = {};
    for (const [name, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192], ['preview', 512]]) {
      const o = document.createElement('canvas'); o.width = size; o.height = size;
      const og = o.getContext('2d'); og.imageSmoothingEnabled = false; og.drawImage(c, 0, 0, size, size);
      out[name] = o.toDataURL('image/png');
    }
    return out;
  });
  for (const [name, url] of Object.entries(urls)) {
    const buf = Buffer.from(url.split(',')[1], 'base64');
    if (name === 'preview') { fs.writeFileSync(process.argv[2] || '/tmp/icon.png', buf); continue; }
    const dir = path.join(__dirname, '..', 'android', 'res', 'mipmap-' + name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), buf);
  }
  console.log('icons written');
  await b.close();
})();
