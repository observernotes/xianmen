/* 废柴仙途 · 事件库扩展：剧情串联（docs/STORY_PLAN.md）
 * 这里放两样东西：
 *   一、PATCH：把现有主线事件挂到节拍上（trigger 从 realm:N 改成 sb:<节拍>），给其中几场加上对话（talk）与新的抉择；
 *   二、LIST：八个抉择点里新加的场景，和几场样稿（STORY_PLAN §7）。其余场景由写手线照 §4 的清单往 ev_story_*.js 里加。
 * 对话场景的写法（引擎约定见 src/logic/storyline.js，播放器见 src/ui/talk.js）：
 *   scene 底图（ART.storyBg / cineBg 的 kind）、bgm 配乐、gist 跳过时的一句梗概、cine 开场前播的过场；
 *   talk: [ ['elder:ang', '台词'], ['me', '…'], ['nar', '旁白'], ['?:屋顶上的声音', '…'],
 *           { if: 条件, echo: '回响小标的说明', say: [ … ] }, { pick: [ { if, say }, { say } ] }, { cg: 'stab', f: 1 }, { scene: 'grave' }, { sfx: 'thunder' }, { shake: 4 } ]
 *   选项：key: 1 关键抉择、hint 小字、gate 有条件（不满足时灰着，写明缺什么）；结果 ok / fail 里可以再带 talk 与 cine。
 *   text 仍然要写：没有播放器的地方（日志、旧界面、自动化测试的快放）用它。 */
(function (root) {
'use strict';
const NODE = typeof module !== 'undefined' && module.exports;
// 现有事件：node 里各文件各自导出数组（同一份对象），浏览器里都已经在 root.EVENTS 里
const BASE = NODE ? [].concat(require('../events.js'), ...['ev_realm_rivals', 'ev_sect_people', 'ev_world_chains', 'ev_karma', 'ev_rivals2', 'ev_chains2', 'ev_people2'].map(f => { try { return require('./' + f + '.js'); } catch (e) { return []; } })) : (root.EVENTS || []);
const byId = id => BASE.find(e => e.id === id);
const VOW = ['vow_blood', 'vow_justice', 'vow_letgo'], WAR = ['war_zheng', 'war_mo', 'war_stop'];

// ---------- 一、现有事件挂到节拍上 ----------
const PATCH = {
  story_r1: { trigger: 'sb:c2_open' },
  story_r2: { trigger: 'sb:c3_open' },
  story_r3: { trigger: 'sb:c4_open' },
  story_r4: { trigger: 'sb:c5_open' },
  story_r5: { trigger: 'sb:c6_open' },
  tianheng_1: { trigger: 'sb:c7_mid2' },
  story_r7: { trigger: 'sb:c8_open', scene: 'tjgate', cine: 'shijie' },
  tiankuo_4: { trigger: 'sb:c8_mid2' },
  // 抉择四改成主线：击败楚天阔之后，他回去查碑，被逐出门墙（不再要求旧案链走到第 4 步）
  tiankuo_3: { where: 'story', trigger: 'sb:c5_mid3', visit: undefined, once: undefined, minR: undefined, maxR: undefined, need: ['beat_chu'], scene: 'gate', gist: '楚天阔被逐出了天剑宗。',
    patchChoices: c => { c.key = 1; c.hint = c.t === '留下他' ? '他的剑从此跟着你' : c.t === '给他指条路' ? '东边有座空山' : '他会回去认错'; } },
  // 赵乾落败那场戏里已经定了他的去路；葬剑渊的“顶罪”只给没走过那场戏的旧档
  zhao_2: { not: ['zhao_owes', 'zhao_guide', 'clue_tianjian'] },
  // 正魔大战并进第七章的高潮（s7_war）
  sect_war_xuesha: { chMax: 5 },
  // 道侣：第四章起（P28）
  su_5: { chMin: 3, patchChoices: (c, i) => { if (i === 0) { c.key = 1; c.hint = '从此有人等你回家'; } } },
  ye_5: { chMin: 3, patchChoices: (c, i) => { if (i === 0) { c.key = 1; c.hint = '从此有人等你回家'; } } },
  ch_sword_6: { minR: undefined, chMin: 7 },

  // 真相（样稿 6）：抉择五
  story_r6: { trigger: 'sb:c7_open', scene: 'trib3k', bgm: 'sorrow', cine: 'najian', gist: '两块玉简合上了。那一剑，刺的不是师父。',
    talk: [
      { cg: 'jade', f: 1 }, ['nar', '两块玉简合上的时候，没有声音。'],
      { cg: 'stab', f: 0 }, ['elder', '……就是这一幕。本座看了三千年。'], ['elder:ang', '雷落到第八道。阿离从左边来。剑尖对着本座。'],
      { if: 'met:mo', say: [['mo:sad', '师祖。请往下看。']] },
      { cg: 'stab', f: 1 }, { sfx: 'thunder' }, ['nar', '剑过去了。擦着他的肩，过去了。'], ['nar', '他身后还有一个人。举着剑。'],
      ['elder:shock', '……'], ['elder:shock', '天衡。'],
      ['elder:sad', '他喊的是“师尊小心”。'], ['elder:sad', '本座听成了什么？本座三千年，听成了什么？'],
      { if: 'met:mo', say: [['mo:sad+tear', '先祖把您封进剑镡的时候，手是抖的。'], ['mo:sad', '所以您记不全。他到死都以为，是自己没封好。']] },
      { if: 'elder_doubt', echo: '你一直留着个心眼', say: [['me', '（你早就觉得哪里不对。可你宁愿是自己想错了。）']] },
      { if: 'elder_trust', echo: '你说过信他', say: [['me', '前辈。您没有看错人。您只看错了一个。']] },
      ['elder:ang', '够了。'], ['elder:ang', '小子。拿剑。现在就上天剑宗。'], ['elder:ang', '本座要问问他，那一剑，他手抖没抖。'],
    ],
    choices: [
      { t: '我陪您去，一剑了断', key: 1, hint: '恨就是恨', dao: 'k',
        ok: { talk: [['elder:ang', '好。'], { if: 'met:mo', say: [['mo:sad', '……杀了他，墨家的骂名，还在史书上。']] }, ['elder', '那是后面的事。']],
          text: '老祖只说了一个字：“好。”剑典下卷，当夜传你。', fx: { xp: 10, power: 0.05, aff: { mo: 10 }, flag: ['st_truth', 'vow_blood'], art: 'x_xuanxiao_xin' } } },
      { t: '先让天下人知道', key: 1, hint: '他偷的是名，就把名拿回来', dao: 'w',
        ok: { talk: [['elder:ang', '本座等了三千年，你叫本座再等？'], ['me', '您等了三千年。墨家也等了三千年。'], ['elder:sad', '……'], ['elder:sad', '说得对。阿离等得比本座久。'], { if: 'met:mo', say: [['mo:joy', '……多谢。']] }],
          text: '“阿离等得比本座久。”老祖把剑典下卷传给你，又加了一句：先把字抄好看些。', fx: { xp: 10, cul: 0.05, aff: { mo: 15 }, flag: ['st_truth', 'vow_justice'], art: 'x_xuanxiao_xin' } } },
      { t: '师父，都过去了', key: 1, hint: '放下，不是算了', dao: 'r',
        ok: { talk: [['elder:shock', '你叫本座什么？'], ['me', '师父。'], ['elder:sad+tear', '……偏挑这种时候。'], ['elder:sad', '过不去。过不去的。'], ['elder:sad', '——让本座想想。别说话。陪着。']],
          text: '老祖三天没有说话。第四天，他说：“……也是。”', fx: { xp: 10, talent: 1, aff: { mo: 10 }, flag: ['st_truth', 'vow_letgo'], art: 'x_xuanxiao_xin' } } },
    ] },

  // 了断（样稿 8）：抉择七
  tianheng_2: { trigger: 'sb:c8_climax', scene: 'stele', bgm: 'sorrow', gist: '陆天衡跪在碑前，只问了一句：他后悔收我吗？',
    talk: [
      { pick: [{ if: 'st_stele_broken', say: [{ cg: 'kneel', f: 1 }] }, { say: [{ cg: 'kneel', f: 0 }] }] },
      ['nar', '他把腰间那截断剑解下来，横在地上。'],
      ['tianheng', '三千年。我没敢用过它。'], ['tianheng', '也没敢扔。'], ['elder', '……'],
      ['tianheng:sad', '师尊不肯说话。那我问这位小友。'],
      ['tianheng', '你也被人叫过废柴。有人把你从泥里拎出来，教你握剑。'],
      ['tianheng:sad', '然后你发现，他最好的那一卷，是留给别人的。'],
      ['me', '所以你从背后给了他一剑。'], ['tianheng', '所以我给了他一剑。'],
      { if: 'vow_blood', echo: '你说过，一剑了断', say: [['tianheng', '你的眼神，和他年轻时一样。动手吧。']] },
      { if: 'vow_letgo', echo: '你叫过他一声师父', say: [['tianheng:shock', '……你看我的眼神，没有恨。为什么？']] },
      { if: 'vow_justice', echo: '你说过，先让天下人知道', say: [['tianheng', '你抄了九份旧案，送去九宗。我都看过了。'], ['tianheng', '字不错。比我当年强。']] },
      ['tianheng:sad', '我不后悔。我只想问一句。'], ['tianheng:sad+tear', '他后悔收我吗？'],
      ['nar', '戒指很久没有动静。'],
    ],
    patchChoices: (c, i) => {
      c.key = 1; c.hint = ['这一剑，替两个人出的', '让他做回凡人', '让他自己念', '这个答案，不该由我来给'][i];
      if (i === 2) { delete c.need; c.gate = 'expose'; c.t = '昭告天下'; c.ok.text = '楚天阔举着旧档，陆天衡在祖师碑前念了一夜。念完，他把宗主印放在碑前，断剑放在印旁边。'; c.ok.cine = 'liaoduan_exposed'; }
      if (i === 0) { c.ok.talk = [['nar', '他没有躲。'], ['elder:sad', '……也好。'], ['elder:sad', '那截剑，捡起来。是本座的。']]; c.ok.cine = 'liaoduan_dead'; }
      if (i === 1) { c.ok.talk = [['tianheng:sad', '废柴。——呵。原来是这个滋味。我都忘了。'], ['nar', '他把断剑往你这边推了推，自己站起来，走下山去。']]; c.ok.cine = 'liaoduan_crippled'; }
      if (i === 3) { c.ok.cine = 'liaoduan_spared'; c.ok.talk = [
        { if: 'vow_blood', say: [['elder:ang', '小子！——'], ['elder:sad', '……算了。你比本座强。']] },
        { if: 'vow_letgo', echo: '你叫过他一声师父', say: [['elder:sad', '天衡。'], ['tianheng:shock', '……师尊？'], ['elder:sad', '不后悔。收你，收阿离，本座都不后悔。'], ['elder:ang', '滚吧。剑留下。']] },
        ['nar', '他磕了一个头。断剑留在碑前。']]; c.ok.text = '他磕了一个头，下山去了。断剑留在碑前。'; }
    } },

  // 最后一课（样稿 9）：留魂
  story_r8: { trigger: 'sb:c9_open', scene: 'temple', bgm: 'sorrow', gist: '劫云到了。老祖要替你挡第一道。',
    talk: [
      ['nar', '你回了一趟{cradle}。屋顶还是漏的。'], ['nar', '劫云从四面八方压过来，比你见过的任何一次都低。'],
      ['elder', '九九天劫。本座当年走到第八道。'], ['elder', '头一道最阴，专劈心里没放下的东西。'], ['elder', '这一道，为师替你挡。'],
      ['me:shock', '您刚才说——'], ['elder:ang', '说什么了？听错了。'],
      ['elder:sad', '……挡完这一道，本座就没了。残魂经不起。'], ['elder', '别这副脸。三千年，够本了。'],
      { if: 'sword_6', echo: '玄霄重铸了', say: [['nar', '玄霄在鞘里响了一声。'], ['nar', '你想起他说过：剑里空着一块，够住一缕魂。']] },
    ],
    patchChoices: (c, i) => {
      c.ok.cine = 'zuihou_farewell';
      if (i === 0) c.ok.talk = [['elder:sad', '头一回正经叫师父，偏挑这时候。'], ['elder:sad+tear', '{cradle}那夜捡到你，是本座最走运的事。'], ['elder', '最后一课：往后没人骂你了。你自己骂自己。']];
      if (i === 1) c.ok.talk = [['nar', '第一个，谢他教你握剑。第二个，谢他教你记仇。'], ['nar', '第三个，谢他教你——仇记完了，要放下。'], ['elder:sad', '……起来。地上凉。']];
    },
    addChoices: [
      { t: '把玄霄递过去', key: 1, hint: '“师父，住这儿。”', gate: 'kept', dao: 'r',
        ok: { talk: [['elder:shock', '胡闹！剑里多一个魂，天劫要多劈你一成！'], ['me', '那就多劈一成。'], ['me', '规矩第三条是您立的。不许死。'], ['elder:sad+tear', '……'], ['elder:ang', '逆徒。'], ['elder:joy', '——这剑鞘，回头给本座换个软和的。']],
          cine: 'zuihou_kept', text: '老祖的残魂住进了玄霄。剑鞘里从此多了一个嫌东嫌西的声音。', fx: { xp: 12, power: 0.05, flag: 'elder_kept', title: '玄霄传人' } } },
    ] },
};

// ---------- 二、新场景 ----------
const LIST = [
// 第一章开章（样稿 1）
{ id: 's1_night', origin: 'qitu', where: 'story', trigger: 'sb:c1_open', speaker: 'elder', title: '破庙第一夜', scene: 'temple', bgm: 'home', gist: '戒指里的老头给你立了三条规矩。',
  text: '雨从塌了一半的屋顶漏下来。戒指里的老头验完你的灵根，立了三条规矩，然后问：今天被人踩成这样，就没什么想说的？',
  talk: [
    ['nar', '雨从塌了一半的屋顶漏下来。火快灭了。'], ['nar', '戒指烫得握不住。'],
    { pick: [
      { if: 'rebirth', say: [['elder', '松手。烫的是你，又不是——'], ['elder:shock', '……怪了。'], ['me', '什么？'], { pick: [{ if: 'sky', say: [['elder', '上回你劈了什么东西，本座在戒里都听见了。']] }, { say: [['elder', '没什么。看你有点顺眼。没道理的事。']] }] }] },
      { say: [['elder', '松手。烫的是你，又不是本座。'], ['me:shock', '……谁？'], ['elder', '你手上那个。别找了，本座没有身子。'], ['elder:ang', '本座在这破铜烂铁里等了三千年，等来一个——']] },
    ] },
    ['elder', '手伸出来。'], ['nar', '一缕凉意从指根走到丹田，转了一圈，又退回去。'],
    ['elder:sad', '金木水火土，五行俱全。'], ['me:joy', '那是好事？'], ['elder:ang', '样样稀松。本座三千年没见过这么杂的。'],
    ['elder', '……三千年前倒见过一个。'], ['me', '谁？'], ['elder:ang', '轮得到你问？听好，三条规矩。'],
    ['elder', '一，戒指上的锈不许擦。那是包浆。'], ['elder', '二，在外头叫前辈。叫别的，本座不应。'], ['elder', '三——'], ['elder', '三，不许死。本座懒得再等三千年。'],
    ['nar', '火“啪”地响了一声。'], ['elder', '今天那些人把你踩成这样。你就没什么想说的？'],
  ],
  choices: [
    { t: '“让他们抬头看我。”', dao: 'k', ok: { talk: [['elder:joy', '口气不小。本座当年也这么说。'], ['elder', '——后来他们真抬头了。脖子都仰酸了。']], text: '老祖笑了一声：“口气不小。本座当年也这么说。”', fx: { xp: 2, flag: 'oath_k' } } },
    { t: '“先活下去。”', dao: 'w', ok: { talk: [['elder', '……没出息。'], ['elder', '也对。死人讨不了账。睡吧，明天教你喘气。']], text: '“……没出息。也对，死人讨不了账。”', fx: { xp: 2, flag: 'oath_w' } } },
    { t: '“屋顶，得修。”', dao: 'r', ok: { talk: [['elder:shock', '本座问你仇家，你跟本座说屋顶？'], ['elder:sad', '……随你。漏雨的地方，是正对着本座。']], text: '“……随你。漏雨的地方，是正对着本座。”', fx: { xp: 2, flag: 'oath_r' } } },
  ] },

// 第一章高潮（样稿 2）：抉择一
{ id: 's1_pact_after', origin: 'qitu', where: 'story', trigger: 'sb:c1_climax', need: ['beat_mu'], cond: 'pact:win', title: '休书', scene: 'dusk', bgm: 'vow', gist: '约战赢了，休书在你手里。',
  text: '擂台下三千人，没有一个出声。三年前那张纸，你一个字一个字照着写了一份。现在它在你手里。',
  talk: [
    ['nar', '擂台下三千人，没有一个出声。'], ['mu:shock', '……你赢了。'], ['elder:joy', '愣着干什么。赢了要说话，本座教过。'],
    ['nar', '三年前那张纸，你一个字一个字照着写了一份。'], ['nar', '现在它在你手里。'],
    { if: 'mu_letter', echo: '你拆过那封信', say: [['me', '（那封信上的字，和{ex}现在的脸色，对不上。）']] },
  ],
  choices: [
    { t: '当众念休书', key: 1, hint: '这一句，全城都听得见', dao: 'k',
      ok: { talk: [['me:ang', '“{ex}，性骄，无德——今日休之。”'], ['nar', '台下炸了。有人在笑，有人在记。'], ['mu:sad+tear', '……念得好。'], ['mu:ang', '{name}。你和三年前那些人，没有两样。'], ['elder', '……'], ['elder', '痛快是痛快。走吧。']],
        cine: 'xiushu_shame', text: '休书传遍了落霞城。慕容家的大门，三天没开。', fx: { xp: 4, grudge: { mu: 20 }, flag: 'mu_shame' } } },
    { t: '把休书收回袖中', key: 1, hint: '不说话，也是一种话', dao: 'w',
      ok: { talk: [['me', '两清了。'], ['mu:shock', '你——你不念？'], ['me', '念给谁听。'], ['nar', '你转身下台。背后很久没有声音。'], ['elder:joy', '哼。有点本座的样子了。'], ['elder', '——本座当年可没这么便宜人。']],
        cine: 'xiushu_spare', text: '你转身下了擂台。那张纸，后来一直压在箱底。', fx: { xp: 4, grudge: { mu: -10 }, flag: 'mu_spare' } } },
    { t: '问一句', key: 1, hint: '“当年，是你的意思吗？”', gate: 'letter', dao: 'r',
      ok: { talk: [['me', '当年那张纸。是你的意思吗？'], ['mu:shock', '……'], ['mu:sad', '是我写的。'], ['mu:sad', '这就够了。你别问了。'], ['nar', '{ex}走得很快。走到台边，停了一步。'], ['mu', '……三年。你剑练得不错。'], ['elder', '这孩子没说实话。'], ['elder', '——也没说假话。记着，以后用得上。']],
        cine: 'xiushu_spare', text: '没有回答。但走到台边的时候，停了一步。', fx: { xp: 4, grudge: { mu: -30 }, flag: ['mu_spare', 'mu_asked'] } } },
  ] },
{ id: 's1_pact_lost', origin: 'qitu', where: 'story', trigger: 'sb:c1_climax', cond: 'pact:lost', speaker: 'elder', title: '输了', scene: 'temple', bgm: 'sorrow', gist: '约战输了。老祖没有骂你。',
  text: '你躺在破庙里，浑身都疼。老祖没有骂人：“输就输了。本座当年也输过——输给自己徒弟。”说完，他自己愣了一下。',
  talk: [['nar', '你躺在破庙里，浑身都疼。'], ['elder', '输就输了。'], ['elder', '本座当年也输过。输给自己徒弟。'], ['nar', '说完，他自己愣了一下。'], ['elder:ang', '……看什么看。天骄榜上打回来。']],
  choices: [{ t: '“记下了。”', ok: { text: '天骄榜上，再见分晓。', fx: { xp: 3 } } }] },

// 第二章（样稿 3）：抉择二
{ id: 's2_invite', where: 'story', trigger: 'sb:c2_mid1', sect: false, cond: '!trial:wuzong', title: '三张帖子', scene: 'town', bgm: 'town', gist: '三宗都来抢人，屋顶上还丢下来一张血帖。',
  text: '{cradle}门口停了三驾云车。太虚剑宗、丹霞谷、玄天道宗各递了一张帖子。老祖只有一条：跟天剑宗穿一条裤子的，不行。',
  talk: [
    ['nar', '{cradle}门口停了三驾云车。{town}没见过这个阵仗。'],
    ['jian', '太虚剑宗。不看灵根，看你敢不敢拔剑。'], ['dan:joy', '丹霞谷。孩子，剑修穷，丹修不穷。'], ['dao', '玄天道宗。来与不来，皆是缘法。'], ['dao', '——食宿全包。'],
    ['elder:ang', '装神弄鬼。三千年了，这一脉还是这个调调。'],
    { if: 'mu_shame', echo: '你当众念了休书', say: [['dan', '念休书那一手，老身听说了。够狠。丹霞谷不怕狠的。']] },
    { if: 'mu_spare', echo: '你把休书收回了袖中', say: [['jian:joy', '赢了不踩人。这样的剑，太虚要。']] },
    ['me', '当年有人说，我这样的不配修仙。'], ['jian:ang', '那种话，剑宗向来当风听。'], ['elder:joy', '这句中听。'],
    { if: 'gate:xuesha', echo: '魔门有人认得你', say: [['nar', '“啪”。一张红帖从屋顶落下来，钉在三位中间。'], ['?:屋顶上的声音', '正道三家抢一个。那我们也凑个热闹。'], ['?:屋顶上的声音', '血煞魔宗。不问灵根，不问出身，只问你恨不恨。'], ['dao:shock', '魔门的人——']] },
    ['elder', '都别吵。小子，你自己挑。'], ['elder', '本座只有一条：跟天剑宗穿一条裤子的，不行。'],
  ],
  choices: [
    { t: '接太虚剑宗的帖', key: 1, hint: '剑修的路：战力见长', ok: { talk: [['jian:joy', '好。剑宗的山门，为你开一次正门。']], text: '你接了太虚剑宗的帖子。', fx: { join: 'jian' } } },
    { t: '接丹霞谷的帖', key: 1, hint: '丹修的路：突破与丹药', ok: { talk: [['dan:joy', '老身就说，这孩子识货。']], text: '你接了丹霞谷的帖子。', fx: { join: 'dan' } } },
    { t: '接玄天道宗的帖', key: 1, hint: '道法的路：修炼与闭关', ok: { talk: [['dao', '缘法到了。']], text: '你接了玄天道宗的帖子。', fx: { join: 'dao' } } },
    { t: '拾起那张血帖', key: 1, hint: '正道从此不认你', gate: 'xuesha', dao: 'k',
      ok: { talk: [['?:屋顶上的声音', '有种。三天后，血池边见。'], ['dan:sad', '孩子，这一步踏出去，回不了头。'], ['elder', '剑是什么颜色，看握剑的人。本座说的。']], cine: 'xuetie', text: '你拾起了那张血帖。三位使者甩袖而去。', fx: { join: 'xuesha' } } },
    { t: '“我哪家也不去。”', key: 1, hint: '没有山门，也没有人管你', dao: 'w',
      ok: { talk: [['jian:shock', '散修？你可知散修的路——'], ['me', '知道。走过三年了。'], ['elder:joy', '也好。本座当年，也没有山门。']], text: '三驾云车走了。往后改主意，宗门的帖子还会再来。', fx: { xp: 4, flag: 'path_san' } } },
  ] },

// 第三章高潮（样稿 4）
{ id: 's3_zhao_fall', origin: 'qitu', where: 'story', trigger: 'sb:c3_climax', need: ['beat_zhao'], not: ['zhao_owes', 'zhao_guide', 'clue_tianjian'], title: '那一脚的来历', scene: 'dusk', bgm: 'sorrow', gist: '赵乾败了。他说，当年那一脚是宗主亲口吩咐的。',
  text: '赵乾的剑钉在台柱上，还在抖。他低头看着自己的脚：“师弟……当年那一脚，不是我要踢的。是宗主亲口吩咐的。”戒指凉了一下。',
  talk: [
    ['nar', '赵乾的剑飞出去，钉在台柱上，还在抖。'], ['zhao:shock+sweat', '不可能……你一个杂灵根——'], ['me', '还是这只脚？'],
    ['nar', '他低头看自己的脚。没有抬起来。'], ['zhao:sad', '……师弟。'], ['elder:joy', '哟。改口倒快。'],
    ['zhao:sad', '当年那一脚，不是我要踢的。'], ['me:ang', '你的脚，不是你要踢的？'], ['zhao:sad+sweat', '是宗主。宗主亲口吩咐的。'],
    ['zhao:sad', '外门三千人，宗主一年见不了三个。'], ['zhao:sad', '那天他看了你的灵根，脸色变了。回头就叫我去。'],
    ['nar', '戒指凉了一下。'], ['elder', '……'], ['me', '（老祖没有说话。这不像他。）'],
  ],
  choices: [
    { t: '“你走吧。”', key: 1, hint: '他也是替人办事的', dao: 'r', ok: { talk: [['zhao:shock', '你放我？'], ['me', '你也是替人办事的。'], ['zhao:sad', '……我欠你的。我会还。']], text: '赵乾走了。走之前说：我欠你的，我会还。', fx: { xp: 4, grudge: { zhao: -30 }, flag: 'zhao_owes' } } },
    { t: '押他回天剑宗', key: 1, hint: '让他们自己看', dao: 'k', ok: { talk: [['me', '这句话，回去当着你们宗主的面，再说一遍。'], ['zhao:shock+sweat', '你疯了！他会——'], ['elder', '押。本座也想看看，那边接不接。']], text: '你把赵乾押到了天剑宗山门下。山门没有开。', fx: { xp: 4, grudge: { zhao: 40 }, karma: 'zhao_bounty', flag: 'zhao_guide' } } },
    { t: '“宗主还说了什么？”', key: 1, hint: '问到底', dao: 'w', ok: { talk: [['zhao:sad', '他说：别让他死在山门里。'], ['zhao:sad', '还有一句，我没听懂。'], ['zhao', '他说：“又一个。”'], ['elder:ang', '——够了。让他滚。']], text: '“又一个。”老祖那一夜，没有再说话。', fx: { xp: 5, flag: 'clue_tianjian' } } },
  ] },

// 第四章（样稿 5）
{ id: 's4_two_lamps', where: 'story', trigger: 'sb:c4_mid1', need: ['su_met', 'ye_met'], daolv: false, title: '两盏灯', scene: 'cave', bgm: 'home', gist: '苏带了药，夜带了酒，两个人头一回碰面。',
  text: '{su}带着药来的那一夜，{ye}正坐在你的房梁上。药放在桌子左边，酒放在桌子右边。',
  talk: [
    ['nar', '你肋下的伤还没好。门响了。'], ['su:ang', '又是肋下。你是拿肋骨挡剑的吗？'], ['su', '坐好。别动。诊金另算。'],
    ['nar', '房梁上“咔”的一声。'], ['ye:joy', '哟。小废柴屋里有客？'], ['su:shock', '——梁上有人！'], ['ye:joy', '梁上一直有人。我比你先来的，小大夫。'],
    ['nar', '{ye}落下来，手里一坛酒，坛口的泥还是湿的。'], ['ye', '伤了？正好。喝两口，不疼。'], ['su:ang', '有内伤，沾不得酒。'], ['ye:joy', '你那碗黑水我闻见了。喝了才会死。'],
    ['me', '我能说句话吗。'], ['su:ang', '不能。'], ['ye:joy', '不能。'], ['elder:joy', '哈。本座三千年没看过这么好的戏。'],
    ['nar', '药放在桌子左边。酒放在桌子右边。'], ['su', '……你是魔门的人。'], ['ye', '你是丹霞谷的人。'],
    ['ye', '我见过你。疫镇那回，谷里不拨药，是你一个人背进去的。'], ['su:shock', '……'], ['ye:joy', '骗你的。我听人说的。'],
    { pick: [
      { if: 'aff:su>=aff:ye', say: [['nar', '{ye}先走的。走窗户。酒留下了。'], ['su', '……酒收好。伤好之前不许碰。'], ['su:sad', '伤好了以后——随你。']] },
      { say: [['nar', '{su}先走的。走门。药留下了，碗底压着一张方子。'], ['ye', '这字真丑。'], ['ye', '……方子倒是好方子。喝了吧。我看着你喝。']] },
    ] },
  ],
  choices: [
    { t: '先喝药', ok: { text: '苦得你直皱眉。碗底那张方子，你收进了怀里。', fx: { aff: { su: 4 }, xp: 3 } } },
    { t: '先开酒', ok: { text: '酒很烈。肋下的伤，好像真的不那么疼了。', fx: { aff: { ye: 4 }, xp: 3 } } },
    { t: '都留着', ok: { text: '一左一右，你哪样也没动。老祖在戒里笑了半夜。', fx: { xp: 5 } } },
  ] },

// 第七章高潮（样稿 7）：抉择六。对决输了：养伤，六个月后两军再对阵一次
{ id: 's7_war', where: 'story', trigger: 'sb:c7_climax', need: ['st_truth'], not: WAR, title: '阵前', scene: 'field', bgm: 'boss', gist: '正魔两军对阵，所有人都在等你往哪边走。',
  text: '谷地两头，蓝旗和红旗，中间空着一条路。盟主的大旗下，白衣负剑的那个人在看你。他把你摆在两军正中间：谁的箭先到，他都不亏。',
  talk: [
    ['nar', '谷地两头，蓝旗和红旗。中间空着一条路。'], ['nar', '盟主的大旗在蓝阵最后面。旗下那个人，白衣，负剑。'], ['elder:ang', '他在看你。别看回去。'],
    ['xue:joy', '小东西。你来晚了，酒都温第二遍了。'], ['xue', '正道请你来杀我。我请你来喝酒。你挑。'],
    ['?:剑十三', '魔头，休要蛊惑！——这位道友，盟主有令，你打头阵。'], ['me', '头阵。'], ['?:剑十三', '盟主说，你与血煞有旧怨，正该由你了断。'],
    ['elder', '听见没有。他把你摆在两军正中间。'], ['elder', '谁的箭先到，他都不亏。'],
    { pick: [
      { if: 'daolv:ye', echo: '你的道侣在对面', say: [['nar', '红旗下，{ye}没有戴面纱。手按着刀，在看你。']] },
      { if: 'daolv:su', echo: '你的道侣在身后', say: [['nar', '伤兵营的帘子掀开一角。{su}没有出来。']] },
    ] },
    { if: 'path:mo', echo: '你拾起过那张血帖', say: [['xue', '师弟。回家的路，不用我教吧。']] },
  ],
  choices: [
    { t: '拔剑，向红旗走', key: 1, hint: '斩魔，九宗记你首功', duel: 1.1, foe: 'xue',
      ok: { cine: 'zhen_zheng', text: '血无涯退了七步，红旗倒了。九宗给你记了首功。盟主亲自来“贺喜”，笑得很温和。', fx: { xp: 8, power: 0.05, aff: { ye: -15 }, flag: 'war_zheng', title: '破魔之剑' } },
      fail: { text: '你与血无涯两败俱伤，两军各退三十里。半年后，还要再对阵一次。', fx: { inj: 4, retry: 6 } } },
    { t: '转身，向蓝旗拔剑', key: 1, hint: '从此，正道没有你这个人', duel: 1.1, dao: 'k',
      ok: { talk: [['?:剑十三', '你——你敢！'], ['me', '盟主让我打头阵。没说打哪边。']], cine: 'zhen_mo', text: '蓝旗倒了。远处那个白衣人转身走了，一次也没有回头。', fx: { xp: 8, power: 0.05, grudge: { xue: -40 }, aff: { su: -15 }, flag: 'war_mo', unsect: 1 } },
      fail: { text: '剑十三的剑阵把你挡了回来。两军各退三十里，半年后再对阵。', fx: { inj: 4, retry: 6 } } },
    { t: '把剑插在两军正中', key: 1, hint: '“谁先过这把剑，我先接谁。”', gate: 'stop', duel: 1.25, dao: 'r',
      ok: { talk: [['me', '这一仗是谁要打的，诸位心里有数。'], ['me', '今天谁先过这把剑，我先接谁。'], ['xue:joy', '有意思。那我先来。'], ['?:剑十三', '狂妄！']], cine: 'zhen_stop', text: '你接了血无涯一招，又接了剑十三一招。剑还插在那里。那一年的仗，没有打起来。', fx: { xp: 10, cul: 0.05, grudge: { xue: -20 }, flag: 'war_stop', title: '止戈' } },
      fail: { text: '第二招你没有接住。两军各退三十里，半年后再对阵。', fx: { inj: 4, retry: 6 } } },
  ] },

// 第九章高潮（样稿 10）：抉择八
{ id: 's9_gate', where: 'story', trigger: 'sb:c9_climax', not: ['asc_go', 'asc_stay', 'asc_break'], title: '天门', scene: 'heaven', bgm: 'ascend', cine: 'tianmen', gist: '门开了一条缝。',
  text: '第八十一道雷散了。云上有一扇门，开了一条缝，里面的光没有温度。你回头看了一眼：山下有灯，从山门一直点到当年的{cradle}。',
  talk: [
    ['nar', '第八十一道雷散了。云上有一扇门。'], ['nar', '门开了一条缝。里面的光，没有温度。'],
    { if: 'elder_kept', echo: '剑里住着一个人', say: [['elder', '就是这儿。本座当年，差一道。'], ['elder', '……比想的小。']] },
    { if: 'yun_codex', echo: '你陪云无极看过天', say: [['yun', '你到了。'], ['yun', '我一直没进去。我想等一个人，问问他怎么选。']] },
    { if: 'tea_5', echo: '你喝过最后一碗茶', say: [['nar', '你想起一个卖茶的老头。他说，上面没什么好的。']] },
    { pick: [{ if: 'ascend_alone', say: [['nar', '你说过，别等我。可你还是回头看了一眼。']] }, { say: [['nar', '你回头看了一眼。']] }] },
    ['nar', '山下有灯。从山门，一直点到当年的{cradle}。'],
  ],
  choices: [
    { t: '踏进去', key: 1, hint: '你走了这么远，就是为了这扇门', ok: { talk: [['me', '此去，天外见。']], text: '你踏进了那扇门。', fx: { flag: 'asc_go' } } },
    { t: '转身', key: 1, hint: '人间还有人等你', gate: 'stay', dao: 'r',
      ok: { talk: [['nar', '门在你身后，又等了一会儿。然后关上了。'], { if: 'elder_kept', say: [['elder:joy', '哼。没出息。——走吧，回去修屋顶。']] }, { if: 'daolv:su', say: [['nar', '山路上有人提着灯。灯下是一只药箱。']] }, { if: 'daolv:ye', say: [['nar', '屋顶上有人坐着。脚边两坛酒，一坛开了。']] }],
        text: '门在你身后关上了。你下了山。', fx: { flag: 'asc_stay' } } },
    { t: '拔出玄霄', key: 1, hint: '这一剑，问问出题的人', gate: 'break', dao: 'k',
      ok: { talk: [['me', '出题的人，在里面？'], { if: 'yun_codex', say: [['yun:joy', '……原来还能这么选。'], ['yun', '算我一个。我替你数着，它们有几个。']] }, { if: 'elder_kept', say: [['elder:joy', '这才是本座的徒弟！劈！']] }],
        text: '你没有进门。你把门后那张空白的卷，劈成了两半。', fx: { flag: 'asc_break' } } },
  ] },
];

// 打补丁：undefined = 删掉这个字段；patchChoices(选项, 序号) 逐个改；addChoices 接在后面
for (const id in PATCH) {
  const ev = byId(id), P = PATCH[id]; if (!ev || ev._sp) continue; Object.defineProperty(ev, '_sp', { value: 1, enumerable: false });
  for (const k in P) { if (k === 'patchChoices' || k === 'addChoices') continue; if (P[k] === undefined) delete ev[k]; else ev[k] = P[k]; }
  if (P.patchChoices) ev.choices.forEach(P.patchChoices);
  if (P.addChoices) ev.choices.push(...P.addChoices);
}
if (NODE) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
