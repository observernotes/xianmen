/* 废柴仙途 · 事件库扩展：主线剧情（docs/STORY_PLAN.md §4.1，A 线）
 * 九章主线的对话场景。写法见 src/content/ev_story.js 顶部说明与 STORY_PLAN §6.4。这里放三样东西：
 *   一、PATCH：给现有的主线事件加对话（talk / scene / bgm / gist / cine），改几句 text；id、已有的 fx 标志位不动（旧存档）。
 *        写法：普通字段直接盖；undefined = 删掉；res: { 选项序号: { ok: 结果里的对话, fail, okText, failText, cine, failCine, t, hint, key, gate, fx: 并进 ok.fx } }；add: 接在后面的新选项。
 *   二、LIST：新增的场景 s1_*～s9_*。
 *   三、SLOT：共用场景（s4_two_lamps、s6_eve、s8_steps、s9_farewells）的空位。框架和旁白在这里；各人的段落别的线在自己的文件里填：
 *        (globalThis.STORY_SLOTS['s8_steps'] = globalThis.STORY_SLOTS['s8_steps'] || []).push({ who: 'zhao', if: 'zhao_owes', echo: '…', say: [ … ] })
 *        场景里写 { slot: 'su', say: [ 缺省 ] } 或 { slot: '*', max: 3, say: [ … ] }；这里自带的段落带 base: 1，别的线填了同一个 who 就让位（L.storySlot）。
 * 导戏的规矩（§6.3）：每场一句“最重的话”（slow + 重音 + 静音），转折之前先静，每场至少换一次画面，表情跟着话走。 */
(function (root) {
'use strict';
const NODE = typeof module !== 'undefined' && module.exports;
const BASE = NODE ? [].concat(require('../events.js'), ...['ev_realm_rivals', 'ev_sect_people', 'ev_world_chains', 'ev_karma', 'ev_rivals2', 'ev_chains2', 'ev_people2', 'ev_story'].map(f => { try { return require('./' + f + '.js'); } catch (e) { return []; } })) : (root.EVENTS || []);
const byId = id => BASE.find(e => e.id === id);
const SLOTS = root.STORY_SLOTS = root.STORY_SLOTS || {};
const slot = (ev, list) => { (SLOTS[ev] = SLOTS[ev] || []).push(...list.map(x => Object.assign({ base: 1 }, x))); };
const WAR_ANY = 'any:war_zheng|war_mo|war_stop', LU_ANY = 'any:tianheng_dead|tianheng_crippled|tianheng_exposed|tianheng_spared';
const NEVER = '!ch>=0';   // 并进新场景的旧事件：不再出（存档里做过的照旧算做过）
const PATCH = {}, LIST = [];

/* ============================================================
 * 第一章 废柴
 * open s1_night（样稿）→ mid1 s1_town → mid2 s1_firstblood → mid3 s1_letter → pre story_pact_eve（约战前一个月，pact_eve）→ climax s1_pact_after / s1_pact_lost（样稿）
 * ============================================================ */
Object.assign(PATCH, {
  // 开章前先播过场⑪“锈戒”（每世一次；开场白第 3 页并到这里了）
  s1_night: { cine: 'ring' },
  // 约战前夜：老祖把第一夜你说的那句原样念回来
  story_pact_eve: { scene: 'temple', bgm: 'home', gist: '约战前夜，老祖问：赢了以后，想干什么？',
    talk: [
      { sfx: 'wind' }, ['nar', '明天就是三年之约。'], ['nar', '剑擦了三遍。你还是睡不着。', { sfx: 'fire' }],
      ['elder', '别擦了。再擦，剑要秃了。'], ['me', '您当年头一回上擂台，睡得着吗？'],
      ['elder:joy', '本座？本座头一回上台，对面的先睡了。|被本座打的。'],
      ['nar', '你没笑。火堆里的柴塌了一截。', { sfx: 'fire' }],
      ['elder', '怕了。'], ['me', '没有。', { fast: 1 }], ['elder', '怕就怕。本座又不笑话你。'], ['elder:ang', '——本座笑话你三年了，不差这一晚。'],
      ['me', '……{ex}早就筑基了。'],
      ['elder:cold', '筑基怎么了。|三年前这座庙里，有个人连气都不会喘。'], ['elder', '现在会了。本座教的。'],
      { bgm: '' }, ['nar', '戒指难得地安静了一会儿。', { zoom: 1.4, x: 60, y: 96 }],
      ['elder', '小子。|第一夜，本座问过你一句话。', { slow: 1 }], { zoom: 0 },
      { pick: [
        { if: 'oath_k', echo: '第一夜，你说过的话', say: [['elder', '“让他们*抬头看我*。”|你说的。一个字没改。', { slow: 1, sfx: 'heart' }]] },
        { if: 'oath_w', echo: '第一夜，你说过的话', say: [['elder', '“先*活下去*。”|你说的。——你活下来了。', { slow: 1, sfx: 'heart' }]] },
        { if: 'oath_r', echo: '第一夜，你说过的话', say: [['elder', '“这庙的*屋顶*，得修。”|你说的。到现在也没修。', { slow: 1, sfx: 'heart' }]] },
        { say: [['elder', '那夜你什么也没说。|本座记得。', { slow: 1, sfx: 'heart' }]] },
      ] },
      { bgm: 'home' }, ['elder', '明天之后，那句话就算兑了。'], ['elder', '所以本座再问一句正经的。'],
      ['elder', '明天赢了。|*往后*，想干什么？', { slow: 1 }],
    ],
    res: {
      0: { ok: [['elder:joy', '俗！|可本座爱听。'], { if: 'oath_k', echo: '和第一夜一样', say: [['elder', '……和第一夜说的一样。你没变。']] }, ['elder', '让人闭嘴的剑法，本座有七种。先教头一种——'], ['elder:ang', '*睡觉*！明天顶着黑眼圈上台，丢的是本座的脸。', { loud: 1 }]] },
      1: { ok: [['elder', '……嗯。'], ['elder', '这才像修士说的话。'], { if: 'oath_w', echo: '和第一夜一样', say: [['elder', '先活下去，再往上走。你没变。']] }, ['nar', '他没再开口。戒指暖了一下。', { sfx: 'gather' }], ['elder:cold', '天上没什么好的。|——上去了再说。', { soft: 1 }]] },
      2: { ok: [['elder:shock', '又是屋顶。'], { if: 'oath_r', echo: '和第一夜一样', say: [['elder', '三年了，还是这一句。你没变。']] }, { bgm: '' }, ['elder:sad', '……是该修了。|本座在这儿，漏了三千年的雨。', { slow: 1 }], ['elder', '明天赢了，先买瓦。']] },
    } },
  // 输了：老祖没有骂你（样稿，补演出）
  s1_pact_lost: {
    talk: [
      { bgm: '' }, ['nar', '你躺在{cradle}里。浑身都疼。', { sfx: 'wind' }], ['nar', '{town}的锣，隔着十里还听得见。', { sfx: 'luo' }],
      ['me', '……您骂吧。', { soft: 1 }], ['elder', '骂什么。'], ['elder', '输就输了。'],
      ['elder', '本座当年也输过。|输给*自己徒弟*。', { slow: 1, sfx: 'sting' }],
      ['nar', '说完，他自己愣了一下。', { zoom: 1.4, x: 60, y: 96 }], { zoom: 0 }, { bgm: 'sorrow' },
      ['elder:ang', '……看什么看。'], ['elder', '擂台输了，还有天骄榜。榜上打回来。'],
      ['elder:cold', '那张退婚书，留着。|留到你赢的那天。'],
    ] },
});
LIST.push(
// mid1 落霞城的闲话
{ id: 's1_town', origin: 'qitu', where: 'story', trigger: 'sb:c1_mid1', chMax: 0, title: '三枚铜钱', scene: 'town', bgm: 'town', gist: '进城买药，慕容家的管事把找零扔在了地上。',
  text: '进城买伤药，被人认了出来。慕容家的管事替你付了药钱，把找零的三枚铜钱扔在了地上。半条街的人都在看。',
  talk: [
    ['nar', '进城买伤药。药铺的伙计多看了你两眼。'], ['?:伙计', '这不是……天剑宗踢下来的那位？'],
    ['nar', '半条街的人都回过头来。', { sfx: 'luo' }],
    ['?:慕容家管事', '哟。{name}。还没离开落霞城呢？'], ['?:慕容家管事', '我家少主心善，托我带句话：三年后，不必来了。'],
    ['?:慕容家管事', '药钱，慕容家替你付了。就当是——送行。'],
    { bgm: '' }, ['nar', '找零的三枚铜钱，|他*扔在了地上*。', { slow: 1, sfx: 'clang', zoom: 1.6, x: 100, y: 104 }],
    ['nar', '铜钱在青石板上转了很久。没有人说话。'], { zoom: 0 },
    ['elder:cold', '小子。|地上那三个钱，看清楚了。', { sfx: 'heart' }],
  ],
  choices: [
    { t: '低头捡起来', dao: 'w', ok: { talk: [['nar', '你弯下腰，一枚一枚捡起来。街上有人笑。'], { bgm: 'town' }, ['elder', '……捡得好。钱是钱，脸是脸。'], ['elder:ang', '记着今天弯了几次腰。|往后让他们一次一次*还*。']],
      text: '你一枚一枚捡了起来。老祖说：钱是钱，脸是脸。', fx: { xp: 2, stones: 3 } } },
    { t: '踩住铜钱', dao: 'k', ok: { talk: [['nar', '你一脚踩住了还在转的那一枚。', { sfx: 'tap', shake: 2 }], ['me:cold', '钱我不要。|回去带句话：三年后，*我到*。'], ['?:慕容家管事', '你——'], { bgm: 'town' }, ['elder:joy', '哼。有骨气。就是穷。'], ['elder', '回去吃什么？……罢了，本座教你辟谷。']],
      text: '“三年后，我到。”你踩着那枚铜钱说。回去的路上老祖教了你辟谷。', fx: { xp: 3 } } },
    { t: '记下他的脸', dao: 'r', ok: { talk: [['nar', '你没有动。你只是看着他，看了很久。'], ['?:慕容家管事', '看、看什么看！'], { bgm: 'town' }, ['elder', '记仇是好习惯。本座记了三千年。'], ['elder:cold', '——记得太久，也不是好事。|这句你先别懂。', { soft: 1 }]],
      text: '你什么也没做，只是把那张脸记下了。', fx: { xp: 3 } } },
  ] },
// mid2 头一回见血
{ id: 's1_firstblood', where: 'story', trigger: 'sb:c1_mid2', chMax: 0, speaker: 'elder', title: '头一回见血', scene: 'cave', bgm: 'home', gist: '头一回历练回来，老祖念错了一味药。',
  text: '头一回历练，你是爬回来的。老祖骂完“像狗刨”，把止血的方子念了一遍——念错了一味，被你指了出来。',
  talk: [
    { sfx: 'wind' }, ['nar', '头一回历练回来。你是爬进门的。'],
    ['elder', '回来了？本座数数。胳膊，腿，都在。'], ['elder:ang', '那三剑本座都看见了。|*像狗刨*。', { loud: 1 }],
    ['me', '赢了。'], ['elder:ang', '赢一头瘸狼，也值得说？', { fast: 1 }],
    { bgm: '' }, ['nar', '你肋下的血还在渗。戒指沉默了一会儿。', { dim: 0.2 }],
    ['elder:cold', '止血的方子。本座只说一遍。'], ['elder', '三七三钱，白及二钱，血竭一钱——|地榆五钱。'],
    ['me', '地榆是凉血的。五钱下去，人就凉了。'],
    ['elder:shock', '……', { slow: 1 }], ['elder:ang', '本座*考*你的。', { fast: 1 }], { dim: 0 }, { bgm: 'home' },
    ['elder', '一钱。记下。'], ['elder', '……还知道疼，还知道顶嘴。死不了。'],
  ],
  choices: [
    { t: '“记下了。”', dao: 'w', ok: { talk: [['elder', '哼。明天接着刨。'], ['elder:joy', '刨到像个人样为止。']], text: '“明天接着刨。刨到像个人样为止。”', fx: { xp: 3 } } },
    { t: '“您是不是记错了？”', dao: 'k', ok: { talk: [['elder:ang', '三千年！一个方子本座记了三千年！|错一味，怎么了？', { loud: 1 }], { bgm: '' }, ['elder:sad', '……当年这些，有人替本座记。', { soft: 1, slow: 1 }], ['elder:ang', '敷药！']],
      text: '“当年这些，有人替本座记。”老祖说完这句，就不肯再开口了。', fx: { xp: 3 } } },
  ] },
// mid3 没署名的信
{ id: 's1_letter', origin: 'qitu', where: 'story', trigger: 'sb:c1_mid3', chMax: 0, title: '没署名的信', scene: 'temple', bgm: 'home', gist: '慕容家的侍女送来一封没署名的信。',
  text: '夜里，慕容家的小侍女送来一封信。没有署名，没有封蜡。信上的熏香，和那张退婚书是同一种。',
  talk: [
    { sfx: 'wind' }, ['nar', '夜里，破庙外头有人。没有敲门。'], ['?:侍女', '……是{name}吗？'],
    ['nar', '一个提灯的小丫头，手在抖。灯上是慕容家的徽。'], ['elder:cold', '慕容家的人。来看你死没死。'],
    ['?:侍女', '这个，给你。', { sfx: 'paper' }], ['nar', '一封信。没有署名，没有封蜡。'],
    { bgm: '' }, ['nar', '信上有熏香。|和那张退婚书，是*同一种*。', { slow: 1, sfx: 'heart', zoom: 1.5, x: 100, y: 88 }], { zoom: 0 },
    ['me:cold', '谁让你送的。'], ['?:侍女', '少主让我什么都别说。'], ['?:侍女', '还说……你要是不收，就当我没来过。'],
    ['nar', '她放下信就跑。灯在山路上晃了很久。'], { bgm: 'home' },
    ['elder', '拆不拆，你自己定。'], ['elder:ang', '本座只提醒一句：拿退婚书羞辱你的，也是这一家。'],
  ],
  choices: [
    { t: '拆开', dao: 'r', ok: { talk: [['nar', '信很短。字写得很急，有一处被水洇过。', { sfx: 'paper' }], { bgm: '' }, ['nar', '“家里的话，不是我的话。|三年后别来。你打不过。”', { slow: 1 }], ['nar', '最后一行划掉了，还认得出半句：|“那天的话，不是——”', { slow: 1, soft: 1 }], { bgm: 'home' }, ['elder', '……哼。'], ['elder:ang', '打不过？这是看不起谁。|小子，*往死里练*。']],
      text: '“家里的话，不是我的话。三年后别来。”最后一行划掉了，只认得出半句。', fx: { xp: 3, flag: 'mu_letter' } } },
    { t: '压在香炉底下', dao: 'w', ok: { talk: [['nar', '你把信压在了香炉底下。'], ['elder', '不看？'], ['me', '赢了再看。'], ['elder:joy', '行。有点出息。']], text: '信压在香炉底下。你说：赢了再看。', fx: { xp: 3 } } },
    { t: '烧掉', dao: 'k', ok: { talk: [['nar', '火舌舔上信角。熏香烧起来，是苦的。', { sfx: 'fire' }], ['elder:joy', '烧得好。'], ['elder', '……'], ['elder', '——里头写的什么？'], ['me', '没看。'], ['elder:ang', '没看你烧什么！', { loud: 1 }]],
      text: '信烧了。老祖：“烧得好。——里头写的什么？”', fx: { xp: 3 } } },
  ] },
);

/* ============================================================
 * 第二章 入世
 * open story_r1 → mid1 s2_invite（样稿）→ mid2 story_sect（入宗那天）/ s2_alone → mid3 s2_firstfriend → pre home_zhao（还是那只脚）→ climax s2_rank → end s2_end
 * ============================================================ */
Object.assign(PATCH, {
  story_r1: { scene: 'cave', bgm: 'home', gist: '筑基那夜，老祖的声音头一回发颤。',
    text: '筑基功成，{r1open}老祖的声音头一回发颤：“……三千年了。这种事，本座只见过一回。”',
    talk: [
      { pick: [
        { if: 'mu_shame', echo: '你当众念了休书', say: [['nar', '筑基那夜，{town}还在传那封休书。有人学你念，学得不像。']] },
        { if: 'mu_spare', echo: '你把休书收回了袖中', say: [['nar', '筑基那夜，{town}还在猜：那张纸上到底写了什么。']] },
        { say: [['nar', '筑基那夜，{cradle}里很静。']] },
      ] },
      ['nar', '灵气入体。一圈，两圈——|*停不下来*。', { sfx: 'gather', shake: 2 }],
      { pick: [
        { if: 'awakens', say: [
          ['nar', '五色灵根自己转了起来。越转越快，融成灰蒙蒙的一团。', { sfx: 'reveal', flash: 1, zoom: 1.4, x: 56, y: 92 }],
          { bgm: '' }, ['elder:shock', '……混沌。'], ['elder:shock', '五行俱全，样样稀松——|原来是*这个*意思。', { slow: 1 }],
          ['me', '什么意思？'], ['elder', '意思是，你不是五样都差。|你是五样都*要*。'],
          ['elder:sad', '混沌圣体。三千年了。|本座只在一个人身上见过。', { soft: 1, slow: 1 }] ] },
        { say: [
          ['nar', '丹田深处浮起一缕灰气，转瞬沉了下去。戒指猛地一烫。', { sfx: 'reveal', flash: 1, zoom: 1.4, x: 56, y: 92 }],
          { bgm: '' }, ['elder:shock', '……怪了。'], ['elder:shock', '这戒指三千年不认人。|它*认了你*。', { slow: 1 }],
          ['me', '认了会怎样？'], ['elder', '会怎样？里头的东西，往后都归你管。'],
          ['elder:sad', '上一个被它认下的……|本座只见过那一回。', { soft: 1, slow: 1 }] ] },
      ] },
      { zoom: 0 }, ['me', '那个人是谁？'], { bgm: 'home' }, ['elder:ang', '问那么多。筑基了不起？稳境界去。', { fast: 1 }],
      ['nar', '你盘膝坐下。戒指里的声音，头一回有点*发颤*。'],
    ],
    res: {
      0: { ok: [['elder', '呼——呼——', { fast: 1 }], ['me', '您没有身子。打什么鼾。'], ['elder:ang', '本座乐意！'], { bgm: '' }, ['nar', '后半夜，鼾声停了。', { dim: 0.3 }], ['elder:sad', '……那一剑，|*真狠*啊。', { slow: 1, soft: 1, sfx: 'heart' }], ['nar', '是梦话。你没敢出声。'], { dim: 0 }],
        okText: '老祖装睡，鼾声震天。后半夜你听见一句梦话：“……那一剑，真狠啊。”' },
      1: { ok: [['elder', '这还差不多。'], ['nar', '一缕极精纯的剑意渡过来，替你压住了翻腾的气海。', { sfx: 'gather' }], ['elder:cold', '别多想。本座是怕你炸了，溅本座一身。']] },
    } },
  // 三张帖子（样稿）：三位使者各补一段
  s2_invite: { res: {
    0: { ok: [['jian:joy', '好。剑宗的山门，为你开一次正门。'], ['dan:ang', '哼。穷剑修，有你哭的时候。'], ['jian', '见面礼。一块磨剑石。别嫌轻。'], ['elder:joy', '磨剑石。实在。这老头本座看着顺眼。']] },
    1: { ok: [['dan:joy', '老身就说，这孩子识货。'], ['jian:cold', '剑不握在手里，丹吃得再多，也是个药罐子。'], ['dan', '见面礼。筑基丹一瓶。别省着，谷里有的是。'], ['elder', '收着。丹霞谷的东西，三千年前就不便宜。']] },
    2: { ok: [['dao', '缘法到了。'], ['dan:ang', '什么缘法。你就是管饭管得早。'], ['dao:joy', '见面礼。《清静经》一卷。|——饭票三张。'], ['elder:ang', '装神弄鬼。……饭票倒是真的。']] },
  } },
  // 入宗第一天：魔宗是血池边挑水
  story_sect: { scene: 'gate', bgm: 'town', gist: '入宗第一天，管事让你去干杂役。',
    talk: [
      { pick: [
        { if: 'path:mo', echo: '你拾起过那张血帖', say: [{ scene: 'blood' }, ['nar', '血池边立着一块试剑石，上头全是刀痕。'], ['?:管事师兄', '新来的？杂灵根。|池边正缺个挑水的。'], ['nar', '四周的笑声，和正道那边一模一样。', { sfx: 'luo' }], ['elder', '哈。魔门正道，欺负新人倒是一个师父教的。']] },
        { say: [['nar', '{sect}的山门比你想的高。试剑石立在门里，三人合抱。'], ['?:管事师兄', '杂灵根？|柴房正缺个劈柴的。'], ['nar', '四周哄笑。有人学了两声狗叫。', { sfx: 'luo' }], ['elder', '啊——|本座打个哈欠。你们继续。']] },
      ] },
      ['me:cold', '（这种笑声，你听过。）', { soft: 1 }],
      { bgm: '' }, ['elder:cold', '小子。|听了这么些年，还没听够？', { sfx: 'heart' }],
      ['elder', '那块石头，看见没有。|*劈给他看*。', { slow: 1, zoom: 1.4, x: 100, y: 70 }], { zoom: 0 },
    ],
    res: {
      0: { ok: [{ sfx: 'clang' }, { shake: 5 }, { flash: 1 }, ['nar', '石头从中间裂开。裂口平得像剑削的。'], { bgm: 'vow' }, ['nar', '全场死寂。管事师兄的茶杯砸在脚面上。'], ['?:管事师兄', '……', { slow: 1 }], ['nar', '他硬是没敢喊疼。'], ['elder:joy', '看见没有。这叫*讲道理*。']],
        fail: [['nar', '石头纹丝不动。你的手肿了三圈。', { sfx: 'hit', shake: 2 }], ['nar', '笑声更响了。'], ['elder:cold', '记下这些脸。|一张一张记。'], ['elder', '今晚加练。练到石头怕你。']] },
      1: { ok: [{ pick: [{ if: 'path:mo', say: [['nar', '你挑了一夜水。扁担压在肩上，步子越走越稳。']] }, { say: [['nar', '你劈了一夜柴。']] }] }, ['elder', '手腕沉半寸。……再沉。对。'], { bgm: 'home' }, ['nar', '天亮的时候，一位路过的长老站住了。'], ['nar', '看了很久，没有说话。'], ['elder:joy', '干杂役也是练剑。这个道理，那个管事一辈子不懂。']] },
    } },
  // 还是那只脚（s2_zhao）：从洞府来访改成第二章的高潮前
  home_zhao: { where: 'story', trigger: 'sb:c2_pre', visit: undefined, once: undefined, minR: undefined, maxR: undefined, title: '还是那只脚', scene: 'gate', bgm: 'boss', gist: '赵乾找上门来，抬起的还是当年那只脚。',
    text: '赵乾负手立在门前，还是当年踢你下山的嘴脸：“走了狗屎运罢了。今日教你什么叫云泥之别。”他抬起了脚——还是那只脚。',
    talk: [
      { sfx: 'wind' }, ['nar', '门外有人负手站着。云纹白袍，一尘不染。'],
      ['zhao:joy', '哟。杂灵根。|听说你筑基了。'], ['zhao', '走了狗屎运罢了。师兄我今天，特地来教你什么叫云泥之别。'],
      { pick: [
        { if: 'mu_shame', echo: '你当众念了休书', say: [['zhao:joy', '念休书那一手，够狠。|师兄我都没想到，废物也会咬人。']] },
        { if: 'mu_spare', echo: '你把休书收回了袖中', say: [['zhao:joy', '赢了都不敢念。|你这种人，天生是让人踩的。']] },
        { say: [['zhao:joy', '连约战都输了，还有脸修仙？']] },
      ] },
      { bgm: '' }, ['nar', '他抬起了脚。', { slow: 1, zoom: 1.6, x: 140, y: 100, sfx: 'heart' }],
      ['me:cold', '还是|*这只脚*。', { slow: 1 }], { zoom: 0 }, { bgm: 'boss' },
      ['zhao:joy', '你记性好。师兄我脚也没换。'], ['elder:cold', '小子。这一脚，本座也替你记着。'],
    ],
    res: {
      0: { ok: [{ sfx: 'hit' }, { shake: 5 }, { flash: 1 }, ['nar', '你后发先至。他飞出去的时候，脸上还带着笑。'], ['nar', '三百级石阶。和当年的你，|*一级不差*。', { slow: 1 }], ['zhao:shock+sweat', '你——你等着！'], ['zhao:ang', '金丹论道，我在台上等你！'], { bgm: '' }, ['zhao:ang', '宗主说得对，你这种人——', { sfx: 'sting' }], ['nar', '他住了口。脸色变了一下，转身就走。'], ['elder:cold', '……宗主。|外门一个杂役的事，*宗主*说过话？', { slow: 1 }]],
        fail: [['nar', '你接了三招，气血翻涌。', { sfx: 'hit', shake: 3 }], ['zhao:joy', '筑基？筑的是泥巴吧。'], ['zhao', '金丹论道，我在台上等你。别不敢来。'], { bgm: '' }, ['zhao', '宗主说得对，你这种人——', { sfx: 'sting' }], ['nar', '他住了口。脸色变了一下，转身就走。'], ['elder:cold', '……宗主。|记着这两个字。', { slow: 1 }]] },
      1: { ok: [['nar', '你当着他的面，关上了门。', { sfx: 'tap' }], ['nar', '门外是踹门声。一下，两下。然后一声惨叫。', { sfx: 'hit', shake: 3 }], ['elder:joy', '门是本座加持过的。'], ['zhao:ang', '金丹论道！我在台上等你！', { loud: 1 }], { bgm: '' }, ['zhao:ang', '宗主说得对，你这种人——', { sfx: 'sting' }], ['nar', '外头忽然没声了。脚步一瘸一拐地远了。'], ['elder:cold', '……宗主。|他刚才说，*宗主*。', { slow: 1 }]] },
    } },
  // 老祖讲古并进 s2_end
  home_elder_tale: { cond: NEVER },
});
LIST.push(
// mid2（没入宗的）没有山门的人
{ id: 's2_alone', where: 'story', trigger: 'sb:c2_mid2', sect: false, chMax: 1, cond: 'any:path_san|trial:wuzong|origin:sanxiu', speaker: 'elder', title: '没有山门的人', scene: 'cave', bgm: 'home', gist: '你没有入宗。老祖说，他当年也没有山门。',
  text: '你没有山门。老祖说：“本座当年也没有。头一本剑谱，是从死人身上翻出来的。野路子，要走成大路。”',
  talk: [
    { pick: [
      { if: 'path_san', echo: '你一张帖子也没接', say: [['nar', '三驾云车走了以后，{town}的人看你，又换了一种眼神。'], ['?:路人', '听说了吗，三宗都请不动。|——怕是哪家都看不上吧。']] },
      { say: [['nar', '别人筑基，有师门摆酒。你筑基，只有一枚戒指。'], ['?:路人', '散修啊。|散修能走多远。']] },
    ] },
    ['nar', '你关上门。', { sfx: 'tap' }], ['elder', '后悔了？'], ['me', '没有。'], ['elder', '嘴硬。|本座当年也这么嘴硬。'],
    { bgm: '' }, ['elder:cold', '本座没有山门。没有师父。|头一本剑谱，是从*死人身上*翻出来的。', { slow: 1, zoom: 1.4, x: 60, y: 96 }], { zoom: 0 },
    ['me', '后来呢？'], { bgm: 'home' }, ['elder:joy', '后来？后来天下的山门，都来请本座去坐。'],
    ['elder', '没有山门，就没人替你撑腰。|也没人管你往哪儿走。'], ['elder:ang', '所以别丢本座的脸。野路子，要走成*大路*。'],
  ],
  choices: [
    { t: '“记下了。”', dao: 'w', ok: { talk: [['elder', '哼。'], ['elder:joy', '明天起加练。没有师门的人，一个顶十个才够。']], text: '“没有师门的人，一个顶十个才够。”', fx: { xp: 4 } } },
    { t: '“那您去坐了吗？”', dao: 'r', ok: { talk: [['elder', '没去。'], { bgm: '' }, ['elder:sad', '……本座自己开了一座。|收了*两个徒弟*。', { slow: 1, soft: 1 }], ['elder:ang', '睡觉！']], text: '“没去。本座自己开了一座，收了两个徒弟。”他不肯再往下说。', fx: { xp: 4 } } },
  ] },
// mid3 头一个朋友：对方发现你在跟戒指说话
{ id: 's2_firstfriend', where: 'story', trigger: 'sb:c2_mid3', chMax: 2, cond: 'any:aff:su>=40|aff:ye>=40|aff:chu>=40|aff:ge>=40|aff:bai>=40', title: '头一个朋友', scene: 'cave', bgm: 'home', gist: '你跟戒指吵架，被人撞见了。',
  text: '你正跟戒指吵架，门口站了一个人，不知道站了多久。老祖后来说：往后吵架，关上门。',
  talk: [
    ['nar', '你在跟戒指吵架。吵得正凶。'], ['me:ang', '您那是剑法？那是砍柴！', { fast: 1 }], ['elder:ang', '本座砍柴的时候，你祖宗的祖宗还没——', { fast: 1 }],
    { bgm: '' }, ['nar', '门口有人。|不知道站了多久。', { sfx: 'tap', zoom: 1.3, x: 150, y: 70 }], { zoom: 0 },
    { pick: [
      { if: 'aff:su>=40', say: [['su', '你在跟谁说话。'], ['me', '……没有谁。'], ['su:ang', '自言自语，眼神涣散。走火入魔的前兆。|手伸出来。'], ['nar', '把完脉，{su}的眉头松了一点。'], ['su', '脉象没事。……那就是太久没人说话了。'], ['su:sad', '往后有话，可以来药庐说。'], ['su:ang', '诊金另算。', { fast: 1 }]] },
      { if: 'aff:ye>=40', say: [['ye:joy', '小废柴。你屋里藏了人？'], ['me', '没有。'], ['ye:joy', '那你跟谁吵呢。吵得还输了。'], ['nar', '{ye}从窗台上跳下来，凑近看了看你手上的戒指。'], ['ye', '这破戒指……有点意思。'], ['ye:cold', '我小时候也跟一块玉佩说话。我娘留的。', { soft: 1 }], ['ye:joy', '骗你的。酒呢？', { fast: 1 }]] },
      { if: 'aff:chu>=40', say: [['chu', '你在说话。'], ['me', '自言自语。'], ['chu', '跟剑？'], ['me', '……算是。'], ['chu', '我也说。'], ['nar', '他在门槛上坐下，把剑横在膝头。'], ['chu', '剑不回话。'], ['chu:joy', '你的会。不错。']] },
      { if: 'aff:ge>=40', say: [['ge', '小友。屋里还有一位？'], ['me', '没有。就我。'], ['ge:joy', '老头子鼻子不灵，耳朵还行。'], ['ge', '一个人待久了，跟丹炉都能聊。老夫懂。'], ['nar', '他把酒葫芦往桌上一放。'], ['ge', '跟谁聊都行。|别聊到*火候过了*，分不清真假。'], ['ge:joy', '——有下酒的没有？']] },
      { say: [['bai', '恩人在跟谁说话呀？'], ['me', '没有谁。'], ['bai:joy', '有的呀。小九闻见啦。'], ['nar', '她凑到戒指跟前，鼻尖动了动。'], ['bai', '一股锈味。还有一点点……很老很老的雷味。'], ['elder:shock', '……这狐狸。'], ['bai:joy', '它说话啦！恩人，它是不是饿了呀？']] },
    ] },
    { bgm: 'home' }, ['elder', '……哼。'], ['elder', '往后吵架，关上门。'],
  ],
  choices: [
    { t: '“算是朋友吧。”', dao: 'r', ok: { talk: [['elder:joy', '头一个。|本座替你记着了。'], ['elder:cold', '朋友这东西，比仇人难得。——也比仇人难防。', { soft: 1 }]], text: '“头一个。本座替你记着了。”', fx: { xp: 4 } } },
    { t: '“只是路过的。”', dao: 'w', ok: { talk: [['elder', '嘴硬。门都没关。'], ['elder:joy', '——人家下回还来。你信不信。']], text: '“嘴硬。门都没关。”', fx: { xp: 4 } } },
  ] },
// climax 榜上有名
{ id: 's2_rank', where: 'story', trigger: 'sb:c2_climax', title: '榜上有名', scene: 'town', bgm: 'town', gist: '天骄榜上头一回有了你的名字，被人念错了。',
  text: '天骄榜换榜，六十名里头多了一个新名字。念榜的人把它念错了。你站在人群最后面，没有人回头。',
  talk: [
    ['nar', '天骄榜换榜的日子。{town}的榜墙下挤满了人。', { sfx: 'luo' }],
    ['?:念榜的', '六十名里头——咦？有个新名字。'], ['?:念榜的', '这念什么……没听过。'],
    ['?:路人', '是不是那个{shamed}？'], ['?:路人', '不能吧。那位不是杂灵根吗？'],
    ['nar', '你就站在人群最后面。没有人回头。'],
    ['elder:joy', '听见没有。上榜了。'], ['elder:ang', '才这么点名次。本座当年头一回上榜，直接——', { fast: 1 }], ['elder', '算了。不说了。你先高兴一会儿。'],
    { bgm: '' }, ['nar', '你从自己的名字往上数。|数到第七行，停住了。', { slow: 1, zoom: 1.5, x: 100, y: 40 }],
    ['nar', '天剑宗，*楚天阔*。', { sfx: 'sting' }], { zoom: 0 },
    ['elder:cold', '看见了？|姓楚的那个，往后绕不开。'],
  ],
  choices: [
    { t: '挤进去看一眼', dao: 'k', ok: { talk: [['nar', '你挤到榜下。自己的名字，漆还没干。'], ['nar', '你用指头碰了一下。金漆沾在了指尖上。', { sfx: 'bell' }], { bgm: 'town' }, ['elder', '……出息。'], ['elder:joy', '行了，看够了。下回，往上数的名字少一半。']], text: '你的名字，漆还没干。金漆沾在了指尖上。', fx: { xp: 5 } } },
    { t: '转身回去练剑', dao: 'w', ok: { talk: [{ bgm: 'town' }, ['elder:joy', '这就对了。榜是给别人看的。'], ['nar', '身后有人终于把你的名字念对了。'], ['nar', '你没有回头。']], text: '身后有人终于把你的名字念对了。你没有回头。', fx: { xp: 5 } } },
  ] },
// end 两个徒弟（并 home_elder_tale）
{ id: 's2_end', where: 'story', trigger: 'sb:c2_end', speaker: 'elder', title: '两个徒弟', scene: 'cave', bgm: 'home', gist: '老祖讲他收过的两个徒弟：大的周全，小的闷。',
  text: '老祖忽然来了谈兴：“本座收过两个徒弟。大的稳重周全，人人都夸；小的又倔又闷。”停了很久，“……当年夸他的人，都说本座有眼光。”',
  talk: [
    ['nar', '夜里。你把上榜的事又想了一遍。'], ['elder', '睡不着？'], ['elder', '睡不着就听本座讲古。只讲一遍。'], { bgm: '' },
    ['elder', '本座收过两个徒弟。', { sfx: 'fire' }],
    ['elder:joy', '大的那个，稳重，周全。|本座想到的，他先做了；没想到的，他也做了。'], ['elder', '满天下都夸。'],
    ['me', '小的呢？'], ['elder:ang', '小的？又倔又闷。三棍子打不出一句话。'], ['elder:ang', '让他往东，他偏要问一句“为什么”。'],
    ['elder:sad', '……剑倒是练得不坏。', { soft: 1 }],
    ['nar', '戒指很久没有出声。', { zoom: 1.4, x: 60, y: 96, sfx: 'heart' }], ['me', '后来呢？'],
    { bgm: 'sorrow' }, ['elder:cold', '后来。|当年夸他的人，都说本座*有眼光*。', { slow: 1, sfx: 'sting' }], { zoom: 0 },
  ],
  choices: [
    { t: '“再后来呢？”', ok: { talk: [['elder', '再后来，本座就住进这破戒指了。'], ['nar', '他说得很轻松。'], ['nar', '可你听得出来，那里头有三千年没散的东西。'], ['elder', '睡吧。']], text: '“再后来，本座就住进这破戒指了。”语气轻松，你却听出三千年没散的涩意。', fx: { xp: 7 } } },
    { t: '“我算第三个？”', dao: 'r', ok: { talk: [['elder:shock', '你？'], ['elder:ang', '你是捡的。', { fast: 1 }], { wait: 700 }, { bgm: 'home' }, ['elder:sad', '……捡得*不亏*。', { slow: 1, soft: 1 }]], text: '戒指沉默半晌：“你？你是捡的。”顿了顿，“……捡得不亏。”', fx: { xp: 3, buff: { cul: 1.5, ticks: 10 } } } },
  ] },
);

// ==== 以上各章；下面打补丁并导出 ====
for (const id in PATCH) {
  const ev = byId(id) || LIST.find(e => e.id === id), P = PATCH[id]; if (!ev || ev._sm) continue; Object.defineProperty(ev, '_sm', { value: 1, enumerable: false });
  for (const k in P) { if (k === 'res' || k === 'add') continue; if (P[k] === undefined) delete ev[k]; else ev[k] = P[k]; }
  for (const i in P.res || {}) {
    const c = ev.choices[+i], R = P.res[i]; if (!c) continue;
    if (R.ok) c.ok.talk = R.ok; if (R.okText) c.ok.text = R.okText; if (R.cine) c.ok.cine = R.cine; if (R.fx) c.ok.fx = Object.assign({}, c.ok.fx, R.fx);
    if (c.fail) { if (R.fail) c.fail.talk = R.fail; if (R.failText) c.fail.text = R.failText; if (R.failCine) c.fail.cine = R.failCine; }
    for (const k of ['t', 'hint', 'key', 'gate', 'dao']) if (R[k] !== undefined) c[k] = R[k];
  }
  if (P.add) ev.choices.push(...P.add);
}
if (NODE) module.exports = LIST;
else (root.EVENTS = root.EVENTS || []).push(...LIST);
})(typeof window !== 'undefined' ? window : globalThis);
