#!/usr/bin/env node
/* 废柴仙途 · 事件库校验：node tools/check_events.js */
'use strict';
const path = require('path');
const EVENTS = require(path.join(__dirname, '..', 'src', 'events.js'));

const NPCS = ['su', 'ye', 'chu', 'ge', 'bai', 'mo'];
const SPEAKERS = NPCS.concat(['elder', 'me']);
const BGS = ['forest', 'hill', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos'];
const TRAITS = ['sword', 'wise', 'alch', 'lucky', 'longev', 'steady', 'koi'];
const EV_KEYS = ['id', 'where', 'visit', 'trigger', 'bg', 'minR', 'maxR', 'once', 'need', 'not', 'npc', 'aff', 'sect', 'daolv', 'weight', 'speaker', 'title', 'text', 'choices'];
const CH_KEYS = ['t', 'cost', 'p', 'duel', 'ok', 'fail'];
const FX_KEYS = ['xp', 'stones', 'pills', 'herbs', 'treasure', 'life', 'inj', 'item', 'itemUp', 'aff', 'flag', 'buff', 'cul', 'power', 'contrib', 'talent', 'trait', 'title', 'daolv', 'vein'];
const PLACEHOLDERS = ['su', 'ye', 'ex', 'sect', 'name'];
const LIM = { title: [2, 8], text: 120, btn: 8, result: 80, fxTitle: [2, 6] };

const errors = [], warns = [];
const err = (id, m) => errors.push(`[${id}] ${m}`);
const warn = (id, m) => warns.push(`[${id}] ${m}`);
// 占位符按 3 个字计长
const len = s => [...String(s).replace(/\{\w+\}/g, '名名名')].length;
const asArr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const isInt = n => Number.isInteger(n);

function pureData(v, id, where) {
  const t = typeof v;
  if (v === null || t === 'string' || t === 'boolean') return;
  if (t === 'number') { if (!Number.isFinite(v)) err(id, `${where} 非有限数字`); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => pureData(x, id, `${where}[${i}]`)); return; }
  if (t === 'object') { for (const k of Object.keys(v)) pureData(v[k], id, `${where}.${k}`); return; }
  err(id, `${where} 不是纯数据（${t}）`);
}
function checkText(id, s, where) {
  if (typeof s !== 'string' || !s) return err(id, `${where} 缺少文本`);
  for (const m of s.matchAll(/\{(\w*)\}/g)) if (!PLACEHOLDERS.includes(m[1])) err(id, `${where} 未知占位符 ${m[0]}`);
  if (/[{}]/.test(s.replace(/\{\w+\}/g, ''))) err(id, `${where} 花括号不配对`);
}

if (!Array.isArray(EVENTS)) { console.error('EVENTS 不是数组'); process.exit(1); }

const ids = new Set(), flagsSet = new Set(), flagsUsed = new Map();
let talentN = 0, traitN = 0, visitN = 0;
const bgCount = Object.fromEntries(BGS.map(b => [b, 0]));
const npcCount = Object.fromEntries(NPCS.map(n => [n, 0]));
const whereCount = { home: 0, exp: 0, story: 0 };
const triggers = new Map();
const daolvBy = {};
const cat = { main: 0, npc: 0, home: 0, exp: 0 };

for (const e of EVENTS) {
  const id = e && e.id || '(无id)';
  pureData(e, id, 'event');
  for (const k of Object.keys(e)) if (!EV_KEYS.includes(k)) err(id, `未知字段 ${k}`);
  if (typeof e.id !== 'string' || !/^[a-z0-9_]+$/.test(e.id)) err(id, 'id 非法');
  if (ids.has(e.id)) err(id, 'id 重复');
  ids.add(e.id);

  if (!(e.where in whereCount)) err(id, `where 非法：${e.where}`); else whereCount[e.where]++;
  if (e.where === 'story') {
    const t = e.trigger;
    let ok = false, m;
    if (typeof t === 'string') {
      if ((m = /^realm:(\d)$/.exec(t))) ok = +m[1] >= 1 && +m[1] <= 8;
      else if (['sect', 'pet', 'daolv'].includes(t)) ok = true;
      else if ((m = /^rank:(\d+)$/.exec(t))) ok = +m[1] >= 1;
      else if ((m = /^npc:(\w+):(\d+)$/.exec(t))) ok = NPCS.includes(m[1]) && +m[2] > 0 && +m[2] <= 100;
      else if ((m = /^boss:(\d+)$/.exec(t))) ok = +m[1] >= 0 && +m[1] <= 10;
    }
    if (!ok) err(id, `story 的 trigger 非法：${t}`);
    if (triggers.has(t)) err(id, `trigger 与 ${triggers.get(t)} 重复：${t}`);
    triggers.set(t, id);
  } else if ('trigger' in e) err(id, '只有 story 才能有 trigger');

  if ('bg' in e) {
    if (e.where !== 'exp') err(id, 'bg 只能用于 exp');
    if (!Array.isArray(e.bg) || !e.bg.length) err(id, 'bg 需为非空数组');
    else for (const b of e.bg) { if (!BGS.includes(b)) err(id, `bg 非法：${b}`); else if (e.where === 'exp') bgCount[b]++; }
  }
  for (const k of ['minR', 'maxR']) if (k in e && !(isInt(e[k]) && e[k] >= 0 && e[k] <= 8)) err(id, `${k} 非法`);
  if ('minR' in e && 'maxR' in e && e.minR > e.maxR) err(id, 'minR > maxR');
  for (const k of ['once', 'sect', 'daolv']) if (k in e && typeof e[k] !== 'boolean') err(id, `${k} 需为布尔`);
  if ('weight' in e && !(typeof e.weight === 'number' && e.weight > 0)) err(id, 'weight 非法');
  for (const k of ['need', 'not']) if (k in e) {
    if (!Array.isArray(e[k]) || !e[k].every(f => typeof f === 'string' && /^[a-z0-9_]+$/.test(f))) err(id, `${k} 需为 flag 字符串数组`);
    else for (const f of e[k]) { if (!flagsUsed.has(f)) flagsUsed.set(f, []); flagsUsed.get(f).push(`${id}.${k}`); }
  }
  if ('npc' in e) { if (!NPCS.includes(e.npc)) err(id, `npc 非法：${e.npc}`); else npcCount[e.npc]++; }
  if ('aff' in e) {
    if (!e.npc) err(id, 'aff 范围需要 npc');
    if (!(Array.isArray(e.aff) && e.aff.length === 2 && e.aff.every(isInt) && e.aff[0] >= 0 && e.aff[1] <= 100 && e.aff[0] <= e.aff[1])) err(id, 'aff 范围非法');
  }
  if ('speaker' in e && !SPEAKERS.includes(e.speaker)) err(id, `speaker 非法：${e.speaker}`);

  checkText(id, e.title, 'title'); checkText(id, e.text, 'text');
  if (typeof e.title === 'string' && (len(e.title) < LIM.title[0] || len(e.title) > LIM.title[1])) err(id, `title 长度 ${len(e.title)}`);
  if (typeof e.text === 'string' && len(e.text) > LIM.text) err(id, `text 过长 ${len(e.text)}/${LIM.text}`);

  if (!Array.isArray(e.choices) || e.choices.length < 1 || e.choices.length > 3) { err(id, 'choices 需 1~3 个'); continue; }
  if (!e.choices.some(c => !c.cost)) err(id, '至少要有一个不花钱的选项，否则资源不够时玩家会卡住');
  const allText = [e.text];
  const notFlags = e.not || [];
  const oneShot = e.where === 'story' || e.once === true;
  e.choices.forEach((c, ci) => {
    const cid = `choice${ci + 1}`;
    for (const k of Object.keys(c)) if (!CH_KEYS.includes(k)) err(id, `${cid} 未知字段 ${k}`);
    checkText(id, c.t, `${cid}.t`);
    if (typeof c.t === 'string' && len(c.t) > LIM.btn) err(id, `${cid} 按钮过长 ${len(c.t)}：${c.t}`);
    if ('cost' in c) for (const [k, v] of Object.entries(c.cost || {})) {
      if (!['stones', 'pills', 'herbs'].includes(k)) err(id, `${cid} cost 未知键 ${k}`);
      if (!(typeof v === 'number' && v > 0)) err(id, `${cid} cost.${k} 需为正数`);
    }
    const hasP = 'p' in c, hasD = 'duel' in c;
    if (hasP && hasD) err(id, `${cid} p 与 duel 只能二选一`);
    if (hasP && !(typeof c.p === 'number' && c.p > 0 && c.p < 1)) err(id, `${cid} p 需在 (0,1)`);
    if (hasD && !(typeof c.duel === 'number' && c.duel >= 0.5 && c.duel <= 2)) err(id, `${cid} duel 倍数异常`);
    if ((hasP || hasD) && !c.fail) err(id, `${cid} 有 p/duel 必须有 fail`);
    if (!(hasP || hasD) && c.fail) err(id, `${cid} 无 p/duel 却有 fail`);
    if (!c.ok) err(id, `${cid} 缺少 ok`);
    for (const br of ['ok', 'fail']) {
      const o = c[br]; if (!o) continue;
      const oid = `${cid}.${br}`;
      for (const k of Object.keys(o)) if (!['text', 'fx'].includes(k)) err(id, `${oid} 未知字段 ${k}`);
      checkText(id, o.text, `${oid}.text`); allText.push(o.text);
      if (typeof o.text === 'string' && len(o.text) > LIM.result) err(id, `${oid} 结果过长 ${len(o.text)}/${LIM.result}`);
      const fx = o.fx;
      if (fx === undefined) { err(id, `${oid} 缺少 fx`); continue; }
      if (typeof fx !== 'object' || fx === null || Array.isArray(fx)) { err(id, `${oid} fx 需为对象`); continue; }
      for (const k of Object.keys(fx)) if (!FX_KEYS.includes(k)) err(id, `${oid} fx 未知键 ${k}`);
      const num = (k, lo, hi) => { if (k in fx && !(typeof fx[k] === 'number' && fx[k] >= lo && fx[k] <= hi)) err(id, `${oid} fx.${k}=${fx[k]} 超出 [${lo},${hi}]`); };
      num('xp', 1, 15); num('stones', -30, 30); num('pills', 1, 3); num('herbs', 1, 10); num('treasure', 1, 1);
      num('life', -10, 10); num('inj', 1, 4); num('cul', 0.01, 0.1); num('power', 0.01, 0.1); num('contrib', 1, 5);
      num('talent', 1, 1); num('itemUp', 1, 1);
      if ('item' in fx && !['w', 'a', 'pet'].includes(fx.item)) err(id, `${oid} fx.item 非法`);
      if ('itemUp' in fx && !('item' in fx)) err(id, `${oid} itemUp 需要 item`);
      if ('aff' in fx) for (const [k, v] of Object.entries(fx.aff || {})) {
        if (!NPCS.includes(k)) err(id, `${oid} fx.aff 未知 NPC ${k}`);
        if (!(isInt(v) && v !== 0 && Math.abs(v) <= 25)) err(id, `${oid} fx.aff.${k}=${v} 异常`);
      }
      for (const f of asArr(fx.flag)) { if (typeof f !== 'string' || !/^[a-z0-9_]+$/.test(f)) err(id, `${oid} flag 非法`); else flagsSet.add(f); }
      if ('buff' in fx) {
        const b = fx.buff || {};
        const ks = Object.keys(b).filter(k => k !== 'ticks');
        if (ks.length !== 1 || !['cul', 'atk'].includes(ks[0])) err(id, `${oid} buff 需为 {cul|atk, ticks}`);
        else if (!(b[ks[0]] > 1 && b[ks[0]] <= 3)) err(id, `${oid} buff 倍率异常`);
        if (!(isInt(b.ticks) && b.ticks >= 1 && b.ticks <= 20)) err(id, `${oid} buff.ticks 异常`);
      }
      if ('contrib' in fx && !(e.sect === true || e.trigger === 'sect')) err(id, `${oid} contrib 需要 sect:true 的事件`);
      if ('talent' in fx) talentN++;
      if ('trait' in fx) { traitN++; if (!TRAITS.includes(fx.trait)) err(id, `${oid} trait 非法：${fx.trait}`); }
      if ('title' in fx) {
        const L = len(fx.title);
        if (typeof fx.title !== 'string' || L < LIM.fxTitle[0] || L > LIM.fxTitle[1]) err(id, `${oid} 称号长度 ${L}：${fx.title}`);
      }
      if ('daolv' in fx) {
        if (!['su', 'ye'].includes(fx.daolv)) err(id, `${oid} fx.daolv 非法`);
        if (e.npc !== fx.daolv) err(id, `${oid} daolv 与事件 npc 不符`);
        if (!(e.aff && e.aff[0] >= 90)) err(id, `${oid} daolv 需要 aff 下限 ≥90`);
        if (e.daolv !== false) err(id, `${oid} daolv 事件需 daolv:false`);
        daolvBy[fx.daolv] = id;
      }
      // 永久加成只能出现在一次性事件里（story / once / 自身 not 里的 flag 被本分支设置）
      const perm = ['cul', 'power', 'talent', 'trait', 'treasure'].filter(k => k in fx);
      if (perm.length && !oneShot && !asArr(fx.flag).some(f => notFlags.includes(f))) err(id, `${oid} 永久加成 ${perm} 出现在可重复事件里`);
    }
  });

  // 老祖在 realm:8 诀别，之后的随机事件不应再让他开口
  const joined = allText.join('');
  if (e.where !== 'story' && (e.speaker === 'elder' || /老祖/.test(joined)) && !(e.maxR <= 7)) err(id, '提到老祖的随机事件需 maxR ≤ 7');
  if (e.where === 'story' && e.trigger && !/^realm:/.test(e.trigger) && (e.speaker === 'elder' || /老祖/.test(joined)) && !(e.maxR <= 7)) err(id, '非境界触发的剧情提到老祖需 maxR ≤ 7');
  // 人称：su/ye 与主角不用他/她
  for (const n of ['su', 'ye']) if (joined.includes(`{${n}}`)) {
    if (e.npc !== n) warn(id, `文本出现 {${n}} 但 npc 不是 ${n}`);
    if (/[他她]/.test(joined)) err(id, `涉及 {${n}} 的事件不应出现 他/她`);
  }
  if (/[他她]/.test(joined) && !e.npc) warn(id, '出现 他/她，请确认不是指主角');
  if (e.where === 'home' && 'bg' in e) err(id, 'home 事件不应有 bg');
  // 访客：洞府奇遇以访客形式出现（logic.js 的 L.spawnVisitor 只挑 visit:true 的），过期时自动走不花钱的选项
  if ('visit' in e) { if (e.visit !== true) err(id, 'visit 只能是 true'); if (e.where !== 'home') err(id, 'visit 只能用于 home 事件'); else visitN++; }
  else if (e.where === 'home') err(id, 'home 事件需标 visit: true');

  if (e.where === 'story' && !e.npc || e.id.startsWith('story_')) cat.main++;
  else if (e.npc && /^(su|ye|chu|ge|bai|mo)_/.test(e.id)) cat.npc++;
  else cat[e.where]++;
}

// flag 引用
for (const [f, users] of flagsUsed) if (!flagsSet.has(f)) err(users.join(','), `引用了没有任何事件会设置的 flag：${f}`);
for (const f of flagsSet) if (!flagsUsed.has(f)) warn('flags', `flag ${f} 被设置但没有事件引用（引擎或后续内容可用）`);
// 事件链可达性：need 的 flag 的设置者不能只有自己
for (const e of EVENTS) for (const f of e.need || []) {
  const setters = EVENTS.filter(x => x.choices.some(c => ['ok', 'fail'].some(b => c[b] && c[b].fx && asArr(c[b].fx.flag).includes(f))));
  if (setters.length && setters.every(x => x.id === e.id)) err(e.id, `need 的 flag ${f} 只由自己设置，永远无法触发`);
}

// 数量与分布
for (let r = 1; r <= 8; r++) if (!triggers.has(`realm:${r}`)) err('story', `缺少 realm:${r} 主线`);
for (const t of ['sect', 'pet', 'daolv', 'rank:12']) if (!triggers.has(t)) err('story', `缺少 ${t} 主线`);
if (cat.main < 12 || cat.main > 14) err('count', `主线数量 ${cat.main}，应为 12~14`);
if (cat.npc < 25) err('count', `NPC 事件链 ${cat.npc}，应 ≥25`);
if (cat.home < 20) err('count', `home 随机 ${cat.home}，应 ≥20`);
if (cat.exp < 25) err('count', `exp 随机 ${cat.exp}，应 ≥25`);
if (EVENTS.length < 85 || EVENTS.length > 160) err('count', `事件总数 ${EVENTS.length}，应为 85~160`);
for (const b of BGS) if (bgCount[b] < 2) err('count', `bg ${b} 的 exp 事件只有 ${bgCount[b]} 个`);
for (const n of NPCS) if (npcCount[n] < 4) err('count', `NPC ${n} 的事件只有 ${npcCount[n]} 个`);
for (const n of ['su', 'ye']) if (!daolvBy[n]) err('count', `缺少 ${n} 的结为道侣事件`);
if (visitN < 30) err('count', `访客事件 ${visitN}，应 ≥30`);
for (const rid of ['re_enl', 're_cave', 're_rain', 're_pill', 're_bandit', 're_taunt', 're_fairy', 're_recruit', 're_ring', 're_beast']) if (!ids.has(rid)) err('count', `缺少由 randomEvent 改写的事件 ${rid}`);
if (talentN > 2) err('count', `talent 出现 ${talentN} 处（上限 2）`);
if (traitN > 4) err('count', `trait 出现 ${traitN} 处（上限 4）`);

console.log(`事件总数 ${EVENTS.length}  | where: home ${whereCount.home} / exp ${whereCount.exp} / story ${whereCount.story}`);
console.log(`分类: 主线 ${cat.main} / NPC链 ${cat.npc} / 洞府随机 ${cat.home} / 历练随机 ${cat.exp}`);
console.log('bg  :', BGS.map(b => `${b} ${bgCount[b]}`).join(', '), `| 不限地图 ${EVENTS.filter(e => e.where === 'exp' && !e.bg).length}`);
console.log('npc :', NPCS.map(n => `${n} ${npcCount[n]}`).join(', '));
console.log(`访客事件 ${visitN}`);
console.log(`talent ${talentN}/2, trait ${traitN}/4, flags ${flagsSet.size}`);
if (warns.length) { console.log(`\n警告 ${warns.length}:`); warns.forEach(w => console.log('  ! ' + w)); }
if (errors.length) { console.log(`\n错误 ${errors.length}:`); errors.forEach(x => console.log('  x ' + x)); process.exit(1); }
console.log('\n校验通过');
