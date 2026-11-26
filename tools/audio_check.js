// 声音冒烟测试：node tools/audio_check.js
// 自动化环境默认不出声（navigator.webdriver）；这里用 ?audio=1 强开，真的建 AudioContext 跑一遍：
//   第一次点按后才有 AudioContext；开场放《退婚》、进游戏换《洞府》、出门换《历练》、打起来加战斗层、坊市换《坊市》；
//   三态与两条音量格；切后台挂起、回来恢复；每个音效实打实调一遍；页面无报错。另验一遍默认（不带 ?audio=1）时不建 AudioContext。
const { chromium, devices } = require('playwright');
const path = require('path');
const fails = [];
const check = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); if (!ok) fails.push(what); };
const url = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
async function boot(b, q) {
  const page = await (await b.newContext({ ...devices['Pixel 7'] })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto(url + q);
  await page.waitForTimeout(400);
  return { page, errs };
}
async function intoGame(page) {
  for (let i = 0; i < 40; i++) {
    if (await page.$('#goStart')) break;
    const sk = await page.$('.cn-skip'); if (sk) await sk.click(); else await page.click('#intro .story');
    await page.waitForTimeout(120);
  }
  await page.click('#goStart'); await page.waitForTimeout(700);
}
(async () => {
  const b = await chromium.launch();
  { // ① 强开
    const { page, errs } = await boot(b, '?audio=1');
    const ev = (fn, a) => page.evaluate(fn, a);
    const A = () => ev(() => { const x = window.__xm_audio; return { ctx: x.ctx ? x.ctx.state : null, cur: x.BGM.cur, fight: x.BGM.fight, n: x.BGM.players.length, mv: x.AU.mv, sv: x.AU.sv, paused: x.AU.paused }; });
    check((await A()).ctx === null, '点按之前没有 AudioContext');
    await page.click('#intro .story'); await page.waitForTimeout(900);
    let a = await A();
    check(a.ctx === 'running', `第一次点按后 AudioContext 在跑（${a.ctx}）`);
    check(a.cur === 'sorrow', `开场放《退婚》（${a.cur}）`);
    await intoGame(page); await page.waitForTimeout(900);
    a = await A(); check(a.cur === 'home', `进游戏换《洞府》（${a.cur}）`);
    // 每个音效直接调定义（不过那层 try / catch）
    const bad = await ev(() => { const x = window.__xm_audio, out = []; for (const k in x.SFX) { try { x.SFX[k](1, 1); } catch (e) { out.push(k + ': ' + e.message); } } return out; });
    check(!bad.length, '全部音效能调' + (bad.length ? '：' + bad.join('；') : ''));
    // 设置：三态、音量格
    await ev(() => window.__xm.showSettings()); await page.waitForTimeout(200);
    check(await page.$$eval('.kvol', l => l.length) === 2, '设置里有音乐 / 音效两条音量格');
    await page.click('.kvol[data-vol="m"] i[data-i="5"]'); await page.waitForTimeout(100);
    await page.click('.kvol[data-vol="s"] i[data-i="1"]'); await page.waitForTimeout(100);
    a = await A(); check(a.mv === 5 && a.sv === 1, `点音量格：音乐 5 / 音效 1（${a.mv} / ${a.sv}）`);
    check(await ev(() => { const p = JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /pref/i.test(k))) || '{}'); return p.mv === 5 && p.sv === 1; }), '音量存进偏好');
    await page.click('#kSnd'); await page.waitForTimeout(1300);
    a = await A(); check(a.cur === '', `三态切到“仅音效”：音乐停（${a.cur || '空'}）`);
    await page.click('.kvol[data-vol="m"] i[data-i="3"]'); await page.waitForTimeout(1300);
    a = await A(); check(a.cur === 'home' && a.mv === 3, `点音乐音量：三态回到有音乐（${a.cur}）`);
    await page.click('.kvol[data-vol="s"] i[data-i="3"]'); await page.waitForTimeout(100);
    // 坊市
    const town = await ev(() => { try { window.__xm.showWorld('market'); } catch (e) { return 'err ' + e.message; } const t = document.querySelector('#modal .ktabs[data-kon]'); return t ? (t.dataset.kon === 'market' ? 'ok' : t.dataset.kon) : 'none'; });
    if (town === 'ok') { await page.waitForTimeout(1600); a = await A(); check(a.cur === 'town', `坊市 / 宗门页换《坊市》（${a.cur}）`); }
    else console.log('  skip 坊市页还没开（' + town + '）');
    await ev(() => window.__xm.closeModal()); await page.waitForTimeout(1600);
    a = await A(); check(a.cur === 'home', `关掉面板回《洞府》（${a.cur}）`);
    // 历练：出门 → 《历练》；打起来 → 战斗层
    const went = await ev(() => { const x = window.__xm, st = x.st; x.setSpeed(1); return !!x.L.startExp(st, 0, 0, 0); });
    if (went) {
      let seenRoad = false, seenFight = false;
      for (let i = 0; i < 60 && !(seenRoad && seenFight); i++) { await page.waitForTimeout(200); a = await A(); if (a.cur === 'road') seenRoad = true; if (a.cur === 'road' && a.fight) seenFight = true; if (await page.$('#modal:not([hidden])')) await ev(() => window.__xm.closeModal()); }
      check(seenRoad, '出门换《历练》'); check(seenFight, '打起来加战斗层');
    } else console.log('  skip 这个存档出不了门');
    // 后台
    await ev(() => window.dispatchEvent(new Event('pagehide'))); await page.waitForTimeout(300);
    a = await A(); check(a.ctx === 'suspended' && a.paused, `切后台挂起（${a.ctx}）`);
    await ev(() => window.dispatchEvent(new Event('pageshow'))); await page.waitForTimeout(300);
    a = await A(); check(a.ctx === 'running' && !a.paused, `回前台恢复（${a.ctx}）`);
    check(!errs.length, '页面无报错' + (errs.length ? '：' + errs.slice(0, 3).join('；') : ''));
    await page.context().close();
  }
  { // ② 默认：自动化环境里不出声
    const { page, errs } = await boot(b, '');
    await page.click('#intro .story'); await page.waitForTimeout(300);
    check(await page.evaluate(() => window.__xm_audio.ctx === null && window.__xm_audio.AU.off), '默认（webdriver）不建 AudioContext');
    check(!errs.length, '页面无报错');
    await page.context().close();
  }
  await b.close();
  console.log(fails.length ? `\n${fails.length} 项失败` : '\n全部通过');
  process.exit(fails.length ? 1 : 0);
})();
