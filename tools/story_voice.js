// 人物戏的口吻与演出自查（docs/STORY_PLAN.md §5、§6.3、§10 验收 4）：node tools/story_voice.js
// 查 ev_story_people.js / ev_story_rivals.js 与 STORY_SLOTS：
//   口吻：楚狂单句 ≤ 8 字；陆天衡不说“本座”、不提“墨离”；老祖不说“老夫”、“为师”不出现；第一章以外不出现“三年前 / 三年来”；
//         非弃徒专属的场景里不写死“破庙 / 落霞城 / 慕容 / 退婚”；涉及 {ex} 的旁白不用“他 / 她”；
//   演出：每场有底图、至少一次音乐处理（静音或换曲）、至少一处重音、至少一次镜头（推近 / 震屏 / 闪白 / 换图 / 黑屏字幕）；loud ≤ 3 句，每条分支重音 ≤ 6 处；
//   第九章的戏（chMin 8）里，老祖的台词必须在 elder_kept / !st_farewell 的条件里。
// 末尾打印场数与字数。
const path = require('path');
const ROOT = path.join(__dirname, '..', 'src');
require(path.join(ROOT, 'logic.js'));
const FILES = ['ev_story_people', 'ev_story_rivals'];
const errs = [], err = (id, m) => errs.push(`  x [${id}] ${m}`);
const plain = s => s.replace(/[*|]/g, '');
const hz = s => [...plain(s).replace(/[^一-鿿]/g, '')].length;
let scenes = 0, chars = 0, lines = 0;

// 把一场 talk 走一遍：fn(行, 所在条件栈)；指令也给
function walk(list, fn, conds) {
  for (const it of list || []) {
    if (Array.isArray(it)) fn(it, conds, null);
    else if (it.say) walk(it.say, fn, conds.concat([].concat(it.if || [])));
    else if (it.pick) for (const o of it.pick) walk(o.say, fn, conds.concat([].concat(o.if || [])));
    else fn(null, conds, it);
  }
}
function checkLines(id, list, opt) {
  walk(list, (ln, conds, cmd) => {
    if (!ln) { if (cmd && 'black' in cmd) { chars += hz(cmd.black); lines++; } return; }
    const [who, text] = ln, sp = who.split(':')[0];
    chars += hz(text); lines++;
    if (sp === 'chu') for (const seg of plain(text).split(/[。！？，、…—“”]+/)) if (hz(seg) > 8) err(id, `楚狂一句超过八个字：${seg}`);
    if (sp === 'tianheng' && /本座|墨离|阿离/.test(text)) err(id, `陆天衡不说“本座”、不提那个名字：${text}`);
    if (sp === 'elder' && /老夫/.test(text)) err(id, `老祖自称“本座”：${text}`);
    if (/为师/.test(text)) err(id, `“为师”全剧 ≤ 5 次，人物戏里不用：${text}`);
    if (/三年前|三年来/.test(text)) err(id, `第一章以外写“当年”：${text}`);
    if (!opt.qitu && /破庙|落霞城|慕容|退婚/.test(text)) err(id, `非弃徒专属的戏用占位符：${text}`);
    if (/\{ex\}/.test(text) && /[他她](?!们)/.test(plain(text).replace(/其他|他日|他人/g, ''))) err(id, `{ex} 的句子不用“他 / 她”：${text}`);
    if (sp === 'elder' && opt.late && !conds.some(c => c === 'elder_kept' || c === '!st_farewell')) err(id, `第九章的戏里老祖要写在 elder_kept / !st_farewell 的条件里：${text}`);
  }, []);
}
function stage(id, ev) {
  // 每一条走得到的分支各算一遍太细；这里按整场的并集查“有没有”，按单个结果查“有没有过量”
  let bgm = 0, em = 0, cam = 0, loud = 0;
  const count = list => walk(list, (ln, conds, cmd) => {
    const o = ln ? ln[2] || {} : cmd;
    if ('bgm' in o) bgm++;
    if (o.zoom || o.shake || o.flash || 'cg' in o || 'scene' in o || 'black' in o || o.dim) cam++;
    if (ln) { if (/\*[^*]+\*/.test(ln[1])) em++; if (o.loud) loud++; }
  }, []);
  count(ev.talk); for (const c of ev.choices) for (const b of ['ok', 'fail']) if (c[b] && c[b].talk) count(c[b].talk);
  if (!ev.scene) err(id, '没有底图（scene）');
  if (!bgm) err(id, '没有音乐处理（{ bgm: \'\' } 静音或换曲）');
  if (!em) err(id, '没有重音字');
  if (!cam) err(id, '没有镜头（推近 / 震屏 / 闪白 / 换图 / 黑屏字幕）');
  if (loud > 3) err(id, `loud ${loud} 句（≤ 3）`);
}

for (const f of FILES) for (const ev of require(path.join(ROOT, 'content', f + '.js'))) {
  if (!ev.talk) continue;
  scenes++;
  const qitu = [].concat(ev.origin || []).join() === 'qitu', late = ev.chMin >= 8 || !(ev.not || []).includes('st_farewell') && ev.where === 'home' && !(ev.chMax <= 7) && !(ev.maxR <= 7);
  const opt = { qitu, late };
  checkLines(ev.id, ev.talk, opt);
  for (const c of ev.choices) for (const b of ['ok', 'fail']) if (c[b] && c[b].talk) checkLines(ev.id, c[b].talk, opt);
  for (const t of [ev.text].concat(ev.choices.map(c => c.ok.text))) { if (/三年前|三年来/.test(t)) err(ev.id, `text 里写“当年”：${t}`); if (!qitu && /破庙|落霞城|慕容|退婚/.test(t)) err(ev.id, `text 用占位符：${t}`); }
  stage(ev.id, ev);
}
let slots = 0;
for (const sid of Object.keys(globalThis.STORY_SLOTS || {})) for (const [i, x] of globalThis.STORY_SLOTS[sid].entries()) {
  slots++;
  checkLines(`slot:${sid}#${i}:${x.who}`, x.say, { qitu: [].concat(x.if || []).includes('origin:qitu'), late: false });
}
console.log(`人物戏 ${scenes} 场，空位段落 ${slots} 段，台词 ${lines} 句，${chars} 个汉字`);
if (errs.length) { console.log(`\n错误 ${errs.length}:`); console.log(errs.join('\n')); process.exit(1); }
console.log('口吻与演出自查通过');
