#!/usr/bin/env node
/* 废柴仙途 · 事件库校验
 *   node tools/check_events.js          校验 src/events.js + src/content/*.js 合并后的事件表
 *   node tools/check_events.js report   另外列出：按引擎当前登记的能力（L.CAPS），多少事件已上线、多少被闸住、哪些键闸住的最多
 * 规则（docs/EVENT_INTEGRATION.md）：
 *   必须：id 唯一且合法、纯数据、文本长度、占位符、至少一个“不花钱且无条件”的选项（任何条件组合下都看得见）、
 *         p/duel 有 fail、need 的 flag 有来源（事件、链自动 flag 或引擎 flag）。
 *   放开：CONTENT / 扩展包的新键（未知键仍报错）、同一剧情触发键对应多个事件、选项最多 5 个、去掉旧的数量上限。 */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..', 'src');
const L = require(path.join(ROOT, 'logic.js'));
const report = process.argv.includes('report');

const SOURCES = [['src/events.js', require(path.join(ROOT, 'events.js'))]]
  .concat(L.CONTENT_FILES.map(f => ['src/content/' + f + '.js', require(path.join(ROOT, 'content', f + '.js'))]));
const EVENTS = [].concat(...SOURCES.map(x => x[1]));
const fileOf = new Map();
for (const [f, list] of SOURCES) for (const e of list) fileOf.set(e, f);

const NPCS = ['su', 'ye', 'chu', 'ge', 'bai', 'mo'];
const SPEAKERS = NPCS.concat(['elder', 'me']);
const BGS = ['forest', 'hill', 'tomb', 'blood', 'swords', 'abyss', 'sea', 'stars', 'palace', 'chaos'];
const TRAITS = ['sword', 'wise', 'alch', 'lucky', 'longev', 'steady', 'koi'];
const RIVALS = ['mu', 'zhao', 'chu', 'xue', 'yun'];
const WHERES = ['home', 'exp', 'story', 'realm', 'market'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const THEMES = ['jianqi', 'baicao', 'ronghuo', 'youquan'];
const YIN = ['fire', 'ice', 'thunder', 'wood', 'soul'];
const ARTS = L.ARTL ? L.ARTL.map(a => a.id) : null;
const EV_KEYS = ['id', 'where', 'visit', 'trigger', 'bg', 'minR', 'maxR', 'once', 'need', 'not', 'npc', 'aff', 'sect', 'daolv', 'weight', 'speaker', 'title', 'text', 'choices',
  'chain', 'step', 'season', 'world', 'grudge', 'theme', 'favorMin', 'rankMax', 'srankMin', 'cooldown', 'karma', 'daoMin', 'origin', 'sectId'];
const CH_KEYS = ['t', 'cost', 'p', 'duel', 'ok', 'fail', 'dao', 'need', 'not', 'srankMin', 'daoMin'];
const FX_KEYS = ['xp', 'stones', 'pills', 'herbs', 'treasure', 'life', 'inj', 'item', 'itemUp', 'aff', 'flag', 'unflag', 'buff', 'cul', 'power', 'contrib', 'talent', 'trait', 'title', 'daolv', 'vein',
  'ore', 'feed', 'yin', 'token', 'art', 'gear', 'pet', 'mastery', 'grudge', 'favor', 'karma', 'unkarma', 'plan', 'recipe', 'hp', 'petForm', 'petHeart',
  'toxin', 'plus', 'affix', 'busy', 'duty', 'disc'];
const COST_KEYS = ['stones', 'pills', 'herbs', 'yin', 'ore', 'feed', 'token'];
const PLACEHOLDERS = ['su', 'ye', 'ex', 'sect', 'name', 'kwho', 'kwhat'];   // kwho / kwhat：最早那条没了的因果（dao.js）
// 引擎会置上的 flag（不是事件 fx 置的）：首次击败宿敌、结为道侣
const ENGINE_FLAGS = RIVALS.map(r => 'beat_' + r).concat(['daolv_su', 'daolv_ye']);
// 剧情触发键：现有的 + 扩展包里约定的（引擎是否支持另由 L.CAPS 决定，见 report）
const TRIGGER_RE = [/^realm:[1-8]$/, /^rank:\d+$/, /^npc:(su|ye|chu|ge|bai|mo):\d+$/, /^boss:(10|[0-9])$/, /^(sect|pet|daolv|disciple|egg|pact_eve|ascend|plot_full|field_mutant|formation_fail|forge_fail)$/,
  /^beat:(mu|zhao|chu|xue|yun)$/, /^war_eve:tianjian$/, /^rookie:(appear|near|beaten|trouble)$/, /^srank:[1-6]$/, /^sect:(heir|lord)$/, /^disc:\w+$/, /^trib:\d$/, /^demon:[1-3]$/,
  /^pet_(runaway|fight|sick)$/, /^pet_evolve:p_\w+$/, /^build:\w+$/, /^(market|auction):\w+$/];
const LIM = { title: [2, 8], text: 130, btn: 10, result: 80, fxTitle: [2, 6] };

const errors = [], warns = [];
const err = (id, m) => errors.push(`[${id}] ${m}`);
const warn = (id, m) => warns.push(`[${id}] ${m}`);
// 占位符按 3 个字计长
const len = s => [...String(s).replace(/\{\w+\}/g, '名名名')].length;
const asArr = v => (v == null ? [] : Array.isArray(v) ? v : [v]);
const isInt = n => Number.isInteger(n);
const chainFlag = e => String(e.chain).replace(/^ch_/, '') + '_' + e.step;

function pureData(v, id, where) {
  const t = typeof v;
  if (v === null || t === 'string' || t === 'boolean') return;
  if (t === 'number') { if (!Number.isFinite(v)) err(id, `${where} 非有限数字`); return; }
  if (Array.isArray(v)) { v.forEach((x, i) => pureData(x, id, `${where}[${i}]`)); return; }
  if (t === 'object') { if (Object.getPrototypeOf(v) !== Object.prototype) err(id, `${where} 不是普通对象`); for (const k of Object.keys(v)) pureData(v[k], id, `${where}.${k}`); return; }
  err(id, `${where} 不是纯数据（${t}）`);
}
function checkText(id, s, where) {
  if (typeof s !== 'string' || !s) return err(id, `${where} 缺少文本`);
  for (const m of s.matchAll(/\{(\w*)\}/g)) if (!PLACEHOLDERS.includes(m[1])) err(id, `${where} 未知占位符 ${m[0]}`);
  if (/[{}]/.test(s.replace(/\{\w+\}/g, ''))) err(id, `${where} 花括号不配对`);
}
const condOf = c => !!(c.cost || c.need || c.not || c.srankMin !== undefined || c.daoMin);

for (const [f, list] of SOURCES) if (!Array.isArray(list)) { console.error(`${f} 没有导出数组`); process.exit(1); }

// 所有能置上的 flag：事件 fx.flag + 链自动 flag + 引擎 flag
const flagsSet = new Set(ENGINE_FLAGS), flagsUsed = new Map();
for (const e of EVENTS) {
  if (e.chain && e.step) flagsSet.add(chainFlag(e));
  for (const c of e.choices || []) for (const b of ['ok', 'fail']) if (c[b] && c[b].fx) for (const fl of asArr(c[b].fx.flag)) flagsSet.add(fl);
}
const useFlag = (f, who) => { if (!flagsUsed.has(f)) flagsUsed.set(f, []); flagsUsed.get(f).push(who); };

const ids = new Set();
let talentN = 0, traitN = 0, visitN = 0;
const bgCount = Object.fromEntries(BGS.map(b => [b, 0]));
const npcCount = Object.fromEntries(NPCS.map(n => [n, 0]));
const whereCount = Object.fromEntries(WHERES.map(w => [w, 0]));
const triggers = new Map();
const daolvBy = {};

for (const e of EVENTS) {
  const id = (e && e.id) || '(无id)';
  const base = fileOf.get(e) === 'src/events.js';
  pureData(e, id, 'event');
  for (const k of Object.keys(e)) if (!EV_KEYS.includes(k)) err(id, `未知字段 ${k}`);
  if (typeof e.id !== 'string' || !/^[a-z0-9_]+$/.test(e.id)) err(id, 'id 非法');
  if (ids.has(e.id)) err(id, 'id 重复');
  ids.add(e.id);

  if (!WHERES.includes(e.where)) err(id, `where 非法：${e.where}`); else whereCount[e.where]++;
  if (e.where === 'story' || e.where === 'market') {
    const t = e.trigger;
    if (typeof t !== 'string' || !TRIGGER_RE.some(re => re.test(t))) err(id, `trigger 非法：${t}`);
    else if (e.where === 'market' !== /^(market|auction):/.test(t)) err(id, `market 事件的 trigger 用 market:* / auction:*，story 不用：${t}`);
    if (!triggers.has(t)) triggers.set(t, []);
    triggers.get(t).push(id);
  } else if ('trigger' in e) err(id, '只有 story / market 才能有 trigger');

  if ('bg' in e) {
    if (e.where !== 'exp') err(id, 'bg 只能用于 exp');
    if (!Array.isArray(e.bg) || !e.bg.length) err(id, 'bg 需为非空数组');
    else for (const b of e.bg) { if (!BGS.includes(b)) err(id, `bg 非法：${b}`); else bgCount[b]++; }
  }
  for (const k of ['minR', 'maxR']) if (k in e && !(isInt(e[k]) && e[k] >= 0 && e[k] <= 8)) err(id, `${k} 非法`);
  if ('minR' in e && 'maxR' in e && e.minR > e.maxR) err(id, 'minR > maxR');
  for (const k of ['once', 'sect', 'daolv']) if (k in e && typeof e[k] !== 'boolean') err(id, `${k} 需为布尔`);
  if ('weight' in e && !(typeof e.weight === 'number' && e.weight > 0 && e.weight <= 5)) err(id, 'weight 非法');
  if ('cooldown' in e && !(isInt(e.cooldown) && e.cooldown > 0)) err(id, 'cooldown 非法');
  if ('srankMin' in e && !(isInt(e.srankMin) && e.srankMin >= 0 && e.srankMin <= 6)) err(id, 'srankMin 非法');
  if ('rankMax' in e && !(isInt(e.rankMax) && e.rankMax >= 1 && e.rankMax <= 100)) err(id, 'rankMax 非法');
  if ('season' in e && !SEASONS.includes(e.season)) err(id, `season 非法：${e.season}`);
  if ('theme' in e && !THEMES.includes(e.theme)) err(id, `theme 非法：${e.theme}`);
  if ('karma' in e && !(isInt(e.karma) && e.karma > 0)) err(id, 'karma 需为正整数（几周天前结下的因果）');
  const daoMinBad = v => !v || typeof v !== 'object' || !Object.keys(v).length || Object.keys(v).some(k => !['k', 'w', 'r'].includes(k) || !(isInt(v[k]) && v[k] > 0));
  if ('daoMin' in e && daoMinBad(e.daoMin)) err(id, 'daoMin 需为 { k|w|r: 正整数 }');
  for (const [ci, c] of (e.choices || []).entries()) if ('daoMin' in c && daoMinBad(c.daoMin)) err(id, `choice${ci + 1} daoMin 需为 { k|w|r: 正整数 }`);
  if ('theme' in e && e.where !== 'realm') err(id, 'theme 只用于秘境事件');
  if ('world' in e && !(typeof e.world === 'string' && /^w_\w+$/.test(e.world))) err(id, `world 非法：${e.world}`);
  if ('grudge' in e && !(Array.isArray(e.grudge) && e.grudge.length === 3 && RIVALS.includes(e.grudge[0]) && isInt(e.grudge[1]) && isInt(e.grudge[2]) && e.grudge[1] <= e.grudge[2])) err(id, 'grudge 需为 [宿敌id, 最小, 最大]');
  if ('favorMin' in e && !(Array.isArray(e.favorMin) && e.favorMin.length === 2 && typeof e.favorMin[0] === 'string' && isInt(e.favorMin[1]))) err(id, 'favorMin 需为 [长老id, n]');
  if ('chain' in e || 'step' in e) {
    if (!(typeof e.chain === 'string' && /^ch_\w+$/.test(e.chain) && isInt(e.step) && e.step >= 1)) err(id, 'chain / step 非法');
    // 链里的事件 id 是「链名_步」；借用别的事件当一步的（tianheng_2 = ch_sword 第 5 步）不受这条约束
    else if (e.id === `${e.chain}_${e.step}` && e.step > 1 && !(e.need || []).includes(String(e.chain).replace(/^ch_/, '') + '_' + (e.step - 1))) err(id, `链第 ${e.step} 步需 need ${String(e.chain).replace(/^ch_/, '')}_${e.step - 1}`);
  }
  for (const k of ['need', 'not']) if (k in e) {
    if (!Array.isArray(e[k]) || !e[k].every(f => typeof f === 'string' && /^[a-z0-9_]+$/.test(f))) err(id, `${k} 需为 flag 字符串数组`);
    else for (const f of e[k]) useFlag(f, `${id}.${k}`);
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

  if (!Array.isArray(e.choices) || e.choices.length < 1 || e.choices.length > 5) { err(id, 'choices 需 1~5 个'); continue; }
  // 任何条件组合下都得有一个看得见又不花钱的选项，否则资源不够或条件不满足时玩家会卡住：
  // 把选项上 need / not 引用的 flag 与 srankMin 的取值全部枚举一遍（互补条件的写法，如 tiankuo_4，也算数）
  if (!e.choices.some(c => !condOf(c))) {
    const fl = [...new Set([].concat(...e.choices.map(c => (c.need || []).concat(c.not || []))))];
    const ranks = [...new Set([0].concat(e.choices.filter(c => c.srankMin !== undefined).map(c => c.srankMin)))];
    let bad = fl.length > 10 || e.choices.every(c => c.cost);
    for (let m = 0; !bad && m < (1 << fl.length); m++) for (const rk of ranks) {
      const on = f => !!(m & (1 << fl.indexOf(f)));
      const shown = c => !c.cost && (c.need || []).every(on) && !(c.not || []).some(on) && !(c.srankMin > rk);
      if (!e.choices.some(shown)) { bad = true; break; }
    }
    if (bad) err(id, '某种条件组合下没有看得见、不花钱的选项');
  }
  const allText = [e.text];
  const notFlags = e.not || [];
  const oneShot = e.where === 'story' || e.once === true;
  e.choices.forEach((c, ci) => {
    const cid = `choice${ci + 1}`;
    for (const k of Object.keys(c)) if (!CH_KEYS.includes(k)) err(id, `${cid} 未知字段 ${k}`);
    checkText(id, c.t, `${cid}.t`);
    if (typeof c.t === 'string' && len(c.t) > LIM.btn) err(id, `${cid} 按钮过长 ${len(c.t)}：${c.t}`);
    if ('dao' in c && !['k', 'w', 'r'].includes(c.dao)) err(id, `${cid} dao 只能是 k / w / r`);
    for (const k of ['need', 'not']) if (k in c) { if (!Array.isArray(c[k]) || !c[k].every(f => typeof f === 'string' && /^[a-z0-9_]+$/.test(f))) err(id, `${cid} ${k} 需为 flag 数组`); else for (const f of c[k]) useFlag(f, `${id}.${cid}.${k}`); }
    if ('srankMin' in c && !(isInt(c.srankMin) && c.srankMin >= 0 && c.srankMin <= 6)) err(id, `${cid} srankMin 非法`);
    if ('cost' in c) for (const [k, v] of Object.entries(c.cost || {})) {
      if (!COST_KEYS.includes(k)) err(id, `${cid} cost 未知键 ${k}`);
      else if (k === 'yin') { if (!(v && typeof v === 'object' && Object.entries(v).every(([y, n]) => YIN.includes(y) && isInt(n) && n > 0))) err(id, `${cid} cost.yin 非法`); }
      else if (!(typeof v === 'number' && v > 0)) err(id, `${cid} cost.${k} 需为正数`);
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
      const num = (k, lo, hi, int) => { if (k in fx && !(typeof fx[k] === 'number' && fx[k] >= lo && fx[k] <= hi && (!int || isInt(fx[k])))) err(id, `${oid} fx.${k}=${fx[k]} 超出 [${lo},${hi}]`); };
      num('xp', 1, 15); num('stones', -30, 30); num('pills', -3, 3, true); num('herbs', -10, 10); num('treasure', -1, 1, true);
      num('life', -10, 10); num('inj', 1, 5, true); num('cul', 0.01, 0.1); num('power', 0.01, 0.1); num('contrib', -5, 5);
      num('talent', 1, 1, true); num('itemUp', 1, 2, true); num('ore', 1, 60, true); num('feed', 1, 20, true); num('token', 1, 2, true);
      num('mastery', -30, 30, true); num('hp', -40, 40, true); num('toxin', -50, 50, true); num('plus', 1, 3, true); num('busy', 1, 8, true); num('petHeart', -2, 2, true);
      if ('item' in fx && !['w', 'a', 'pet', 'need', 'o', 'r'].includes(fx.item)) err(id, `${oid} fx.item 非法：${fx.item}`);
      if ('itemUp' in fx && !('item' in fx)) err(id, `${oid} itemUp 需要 item`);
      if ('art' in fx && ARTS) for (const a of asArr(fx.art)) if (!ARTS.includes(a)) err(id, `${oid} fx.art 未知功法 ${a}`);
      if ('aff' in fx) for (const [k, v] of Object.entries(fx.aff || {})) {
        if (!NPCS.includes(k)) err(id, `${oid} fx.aff 未知 NPC ${k}`);
        if (!(isInt(v) && v !== 0 && Math.abs(v) <= 25)) err(id, `${oid} fx.aff.${k}=${v} 异常`);
      }
      if ('grudge' in fx) for (const [k, v] of Object.entries(fx.grudge || {})) if (!RIVALS.includes(k) || !isInt(v)) err(id, `${oid} fx.grudge.${k} 非法`);
      for (const k of ['flag', 'unflag']) for (const f of asArr(fx[k])) if (typeof f !== 'string' || !/^[a-z0-9_]+$/.test(f)) err(id, `${oid} ${k} 非法`);
      if ('buff' in fx) {
        const b = fx.buff || {};
        const ks = Object.keys(b).filter(k => k !== 'ticks');
        if (ks.length !== 1 || !['cul', 'atk'].includes(ks[0])) err(id, `${oid} buff 需为 {cul|atk, ticks}`);
        else if (!(b[ks[0]] > 1 && b[ks[0]] <= 3)) err(id, `${oid} buff 倍率异常`);
        if (!(isInt(b.ticks) && b.ticks >= 1 && b.ticks <= 20)) err(id, `${oid} buff.ticks 异常`);
      }
      const sectOnly = e.sect === true || /^(sect|srank|disc)/.test(e.trigger || '') || 'srankMin' in e || 'favorMin' in e;
      if ('contrib' in fx && !sectOnly) err(id, `${oid} contrib 需要宗门里的事件（sect:true / srankMin / favorMin / 宗门触发键）`);
      if ('talent' in fx) talentN++;
      if ('trait' in fx) { traitN++; if (!TRAITS.includes(fx.trait)) err(id, `${oid} trait 非法：${fx.trait}`); }
      if ('title' in fx) {
        const n = len(fx.title);
        if (typeof fx.title !== 'string' || n < LIM.fxTitle[0] || n > LIM.fxTitle[1]) err(id, `${oid} 称号长度 ${n}：${fx.title}`);
      }
      if ('daolv' in fx) {
        if (!['su', 'ye'].includes(fx.daolv)) err(id, `${oid} fx.daolv 非法`);
        if (e.npc !== fx.daolv) err(id, `${oid} daolv 与事件 npc 不符`);
        if (!(e.aff && e.aff[0] >= 90)) err(id, `${oid} daolv 需要 aff 下限 ≥90`);
        if (e.daolv !== false) err(id, `${oid} daolv 事件需 daolv:false`);
        daolvBy[fx.daolv] = id;
      }
      // 永久加成只能出现在一次性事件里（story / once / 自身 not 里的 flag 被本分支设置）
      const perm = ['cul', 'power', 'talent', 'trait'].filter(k => k in fx);
      if (perm.length && !oneShot && !asArr(fx.flag).some(f => notFlags.includes(f))) err(id, `${oid} 永久加成 ${perm} 出现在可重复事件里`);
    }
  });

  // 戒中老祖在 realm:8 诀别，之后的随机事件不应再让他开口（“血河老祖”是魔宗长老，不算）
  const joined = allText.join('');
  const elder = e.speaker === 'elder' || /(?<!血河)老祖/.test(joined);
  if (e.where !== 'story' && elder && !(e.maxR <= 7)) err(id, '提到老祖的随机事件需 maxR ≤ 7');
  if (e.where === 'story' && e.trigger && !/^(realm|demon|trib):/.test(e.trigger) && e.trigger !== 'ascend' && elder && !(e.maxR <= 7)) err(id, '非境界触发的剧情提到老祖需 maxR ≤ 7');
  // 人称：su/ye 与主角不用他/她
  for (const n of ['su', 'ye']) if (joined.includes(`{${n}}`)) {
    if (e.npc !== n) warn(id, `文本出现 {${n}} 但 npc 不是 ${n}`);
    if (/[他她]/.test(joined)) err(id, `涉及 {${n}} 的事件不应出现 他/她`);
  }
  if (e.where === 'home' && 'bg' in e) err(id, 'home 事件不应有 bg');
  // 访客：洞府奇遇以访客形式出现（L.spawnVisitor 只挑 visit:true 的），过期时自动走不花钱的选项
  if ('visit' in e) { if (e.visit !== true) err(id, 'visit 只能是 true'); if (e.where !== 'home') err(id, 'visit 只能用于 home 事件'); else visitN++; }
  else if (e.where === 'home') err(id, 'home 事件需标 visit: true');
  void base;
}

// flag 引用：need / not 的 flag 必须有来源
for (const [f, users] of flagsUsed) if (!flagsSet.has(f)) err(users.join(','), `引用了没有任何事件或引擎会设置的 flag：${f}`);
// 事件链可达性：need 的 flag 的设置者不能只有自己
for (const e of EVENTS) for (const f of e.need || []) {
  const setters = EVENTS.filter(x => (x.chain && x.step && chainFlag(x) === f) || x.choices.some(c => ['ok', 'fail'].some(b => c[b] && c[b].fx && asArr(c[b].fx.flag).includes(f))));
  if (setters.length && setters.every(x => x.id === e.id)) err(e.id, `need 的 flag ${f} 只由自己设置，永远无法触发`);
}

// 基础覆盖（只设下限；旧的数量上限已去掉）
for (let r = 1; r <= 8; r++) if (!triggers.has(`realm:${r}`)) err('story', `缺少 realm:${r} 主线`);
for (const t of ['sect', 'pet', 'daolv', 'rank:12']) if (!triggers.has(t)) err('story', `缺少 ${t} 主线`);
for (const b of BGS) if (bgCount[b] < 2) err('count', `bg ${b} 的 exp 事件只有 ${bgCount[b]} 个`);
for (const n of NPCS) if (npcCount[n] < 4) err('count', `NPC ${n} 的事件只有 ${npcCount[n]} 个`);
for (const n of ['su', 'ye']) if (!daolvBy[n]) err('count', `缺少 ${n} 的结为道侣事件`);
for (const rid of ['re_enl', 're_cave', 're_rain', 're_pill', 're_bandit', 're_taunt', 're_fairy', 're_recruit', 're_ring', 're_beast']) if (!ids.has(rid)) err('count', `缺少由 randomEvent 改写的事件 ${rid}`);

console.log(`事件总数 ${EVENTS.length}（${SOURCES.map(([f, l]) => `${path.basename(f)} ${l.length}`).join(' / ')}）`);
console.log('where:', WHERES.map(w => `${w} ${whereCount[w]}`).join(' / '));
console.log('bg  :', BGS.map(b => `${b} ${bgCount[b]}`).join(', '), `| 不限地图 ${EVENTS.filter(e => e.where === 'exp' && !e.bg).length}`);
console.log('npc :', NPCS.map(n => `${n} ${npcCount[n]}`).join(', '));
console.log(`访客事件 ${visitN} · talent ${talentN} · trait ${traitN} · flag ${flagsSet.size} · 共用的剧情触发键 ${[...triggers].filter(([, v]) => v.length > 1).map(([t, v]) => `${t}×${v.length}`).join(' ') || '无'}`);

if (report) {
  // 能力闸门：按引擎当前登记的能力，算哪些事件上线、哪些被哪个键闸住
  const gated = EVENTS.map(e => [e, L.evGate(e)]);
  const live = gated.filter(([, m]) => !m.length);
  console.log(`\n—— 上线情况（按 L.CAPS 当前登记）——`);
  console.log(`上线 ${live.length} / ${EVENTS.length}，闸住 ${EVENTS.length - live.length}`);
  for (const [f, list] of SOURCES) { const n = list.filter(e => !L.evGate(e).length).length; console.log(`  ${f.padEnd(30)} 上线 ${String(n).padStart(3)} / ${list.length}`); }
  for (const w of WHERES) { const all = EVENTS.filter(e => e.where === w); if (all.length) console.log(`  where ${w.padEnd(8)} 上线 ${String(all.filter(e => !L.evGate(e).length).length).padStart(3)} / ${all.length}`); }
  const by = new Map(), only = new Map();
  for (const [, m] of gated) { for (const k of m) by.set(k, (by.get(k) || 0) + 1); if (m.length === 1) only.set(m[0], (only.get(m[0]) || 0) + 1); }
  console.log('\n闸住最多的键（涉及事件数 / 只差这一个键的事件数）：');
  for (const [k, n] of [...by].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`  ${k.padEnd(28)} ${String(n).padStart(4)}  ${only.get(k) ? '（只差它：' + only.get(k) + '）' : ''}`);
  if (process.argv.includes('list')) for (const [e, m] of gated) console.log(`${m.length ? '  闸 ' : '  上 '}${e.id.padEnd(24)} ${m.join(' ')}`);
}
if (warns.length) { console.log(`\n警告 ${warns.length}:`); warns.slice(0, 40).forEach(w => console.log('  ! ' + w)); if (warns.length > 40) console.log(`  … 另有 ${warns.length - 40} 条`); }
if (errors.length) { console.log(`\n错误 ${errors.length}:`); errors.forEach(x => console.log('  x ' + x)); process.exit(1); }
console.log('\n校验通过');
