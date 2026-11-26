/* 废柴仙途 · 事件库扩展：主线剧情（docs/STORY_PLAN.md §4.1，A 线）
 * 九章主线的对话场景。写法见 src/content/ev_story.js 顶部说明与 STORY_PLAN §6.4。这里放三样东西：
 *   一、PATCH：给现有的主线事件加对话（talk / scene / bgm / gist / cine），改几句 text；id、已有的 fx 标志位不动（旧存档）。
 *        写法：普通字段直接盖；undefined = 删掉；pre: 接在现有对话最前面的几行；res: { 选项序号: { ok: 结果里的对话, fail, okText, failText, cine, failCine, t, hint, key, gate, fx: 并进 ok.fx } }；add: 接在后面的新选项。
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

/* ============================================================
 * 第三章 旧怨
 * open story_r2 → mid1 s3_ring_doubt → mid2 mo_1（来访）→ mid3 s3_zhao_eve → climax s3_zhao_fall（样稿）→ end s3_end；另：story_trib1（头一回雷劫）
 * ============================================================ */
Object.assign(PATCH, {
  story_r2: { scene: 'cave', bgm: 'boss', cine: 'heiyi', gist: '夜半有人来夺戒：“你不知道里面关着什么。”',
    talk: [
      { bgm: '' }, { dim: 0.3 }, ['nar', '金丹初成的那一夜。你睡得很沉。', { sfx: 'wind' }],
      ['nar', '榻前站着一个人。|指尖已经碰到了戒指。', { slow: 1, sfx: 'heart', zoom: 1.5, x: 60, y: 96 }],
      ['mo:n:黑衣人', '给我。', { soft: 1 }], ['me:shock', '——谁！', { loud: 1 }], { zoom: 0 }, { dim: 0 }, { bgm: 'boss' },
      ['mo:cold:黑衣人', '别动。我不想伤你。'], ['mo:n:黑衣人', '这枚戒指，你戴了多久了？'], ['me:ang', '关你什么事。'],
      ['mo:cold:黑衣人', '你*不知道*里面关着什么。', { slow: 1, sfx: 'sting' }],
      ['nar', '戒指冷得像一块冰。'], { bgm: '' },
      ['elder:cold', '……*墨家*。', { slow: 1, sfx: 'heart' }], ['mo:shock:黑衣人', '……它醒着。'],
      ['elder:ang', '墨家的人，还有脸来碰本座的东西。'], ['nar', '黑衣人的手停在半空。指节发白。'], { bgm: 'boss' },
      ['mo:cold:黑衣人', '墨家祖训，寻此戒三千年。|今夜，我带它走。'],
    ],
    res: {
      0: { ok: [{ sfx: 'clang' }, { shake: 4 }, { flash: 1 }, ['nar', '你拼着金丹震荡，逼退了他半步。'], ['mo:shock:黑衣人', '……金丹初成，接我一指。'], ['mo', '我叫墨无痕。'], ['mo:cold', '戒指，先寄在你这。|等你知道它是什么，我再来。'], ['elder:ang', '寄？这是本座的——', { fast: 1 }], ['nar', '窗开着。人已经不在了。', { sfx: 'wind' }]],
        fail: [['nar', '你被一指点飞，撞塌了半面墙。', { sfx: 'hit', shake: 5 }], ['mo:cold:黑衣人', '太弱。'], ['mo', '我叫墨无痕。等你配得上它，我再来取。'], ['nar', '窗开着。人已经不在了。', { sfx: 'wind' }], ['elder:cold', '……他留手了。'], ['elder:ang', '墨家的人，留什么手！']] },
      1: { ok: [['me:cold', '你说，里面关着什么。'], ['mo:n:黑衣人', '问它自己。'], ['mo:cold:黑衣人', '问它当年，*做过什么*。', { slow: 1 }], ['nar', '他退到窗边，没入夜色。窗台上留下一枚墨色剑穗。', { sfx: 'wind' }], ['me', '前辈。他说的——'], ['elder:ang', '墨家人的话，一个字都别信。', { fast: 1 }], ['elder:cold', '……睡你的觉。']] },
    } },
  // 墨色剑帖（来访，保留）：补上对话；留过心眼的人答一句“我知道”
  mo_1: { scene: 'cave', bgm: 'home', gist: '墨色剑帖：三日后子时，后山。',
    talk: [
      ['nar', '桌上凭空多了一张墨色剑帖。帖下压着一坛酒。', { sfx: 'paper' }],
      ['nar', '“三日后子时，后山。|戒指，或者你一条胳膊。”', { zoom: 1.4, x: 100, y: 84 }], { zoom: 0 },
      ['elder:cold', '墨家人。'], ['elder:ang', '约架还带酒。假客气。'],
    ],
    res: {
      0: { ok: [{ scene: 'dusk' }, { bgm: 'battle' }, ['nar', '后山。十招。你一步没退。', { sfx: 'clang', shake: 3 }], ['mo', '你赢了。'], ['nar', '他把那坛酒抛了过来。'], { bgm: '' }, ['mo:cold', '戒指里那位的话，|别*全信*。', { slow: 1, sfx: 'sting' }],
          { pick: [{ if: 'elder_doubt', echo: '你一直留着个心眼', say: [['me', '我知道。'], ['nar', '他多看了你一眼。没有再说什么。']] }, { say: [['elder:ang', '挑拨离间！', { loud: 1 }]] }] }],
        fail: [{ scene: 'dusk' }, ['nar', '后山。第七招，你躺下了。', { sfx: 'hit', shake: 3 }], ['mo:cold', '酒留你养伤。下次，撑到十招。'], ['mo', '戒指里那位的话，别全信。', { sfx: 'sting' }], ['elder:ang', '挑拨离间！', { loud: 1 }]] },
      1: { ok: [['nar', '你喝光了酒，蒙头大睡。'], ['nar', '第四天，门上钉着第二张帖。', { sfx: 'clang' }], ['nar', '“……*无赖*。”|字迹有点气急败坏。'], ['elder:joy', '哈。这一手，本座喜欢。']] },
    } },
  // 头一回雷劫：渡劫阵图
  story_trib1: { scene: 'dusk', bgm: 'home', gist: '头一道雷劫散了，老祖丢来一卷旧阵图。',
    talk: [
      { sfx: 'thunder' }, { flash: 1 }, ['nar', '头一道雷劫散了。你焦黑着脸，坐在山顶。', { shake: 3 }],
      ['elder:joy', '哈。像块炭。'], ['elder', '下回别光着身子挨劈。拿去。'],
      ['nar', '识海里展开一卷旧阵图。线条歪歪扭扭，像小孩画的。', { sfx: 'paper' }],
      ['elder', '渡劫用的。照着摆，雷能卸掉三成。'],
      { bgm: '' }, ['elder:cold', '本座当年渡劫……|算了。*没渡完*。', { slow: 1, soft: 1, sfx: 'heart' }],
    ],
    res: {
      0: { ok: [['nar', '你一笔一笔记。老祖一处一处挑刺，挑了一夜。'], { bgm: 'home' }, ['elder:joy', '——这阵，是本座年轻时画的。'], ['elder', '那时候手还不稳。也没人敢说丑。']] },
      1: { ok: [['me', '您没渡完？'], ['elder:sad', '雷落下来的时候，|背后*有点凉*。', { slow: 1, soft: 1 }], ['nar', '他不吭声了。'], ['nar', '这句话，比刚才那道雷还沉。']] },
      2: { ok: [['me', '这阵图真丑。'], ['elder:ang', '三千年前它挂在本座山门上，*万人来拜*！', { loud: 1 }], { bgm: 'home' }, ['nar', '骂完，他又把阵眼讲了三遍。'], ['elder', '……记住没有。再丑也能救命。']] },
    } },
  // 赵乾落败（样稿）：押过自己的，台下那张赌桌空了
  s3_zhao_fall: { pre: [{ if: 'zhao_bet', echo: '你押了自己', say: [['nar', '台下那张赌桌空了。庄家是连夜跑的。']] }] },
});
LIST.push(
// mid1 里面关着什么
{ id: 's3_ring_doubt', where: 'story', trigger: 'sb:c3_mid1', need: ['st_mo_seen'], chMax: 3, speaker: 'elder', title: '里面关着什么', scene: 'cave', bgm: 'home', gist: '你问老祖：戒指里关着什么？',
  text: '那夜之后你三天没跟戒指说话。第四天你问：里面关着什么？老祖说：“关着本座。你嫌挤？”',
  talk: [
    ['nar', '那夜之后，你三天没有主动跟戒指说话。'], ['elder', '憋着不难受？'], ['elder', '问。本座数到三。一，二——', { fast: 1 }],
    ['me', '里面关着什么？'],
    { bgm: '' }, ['nar', '戒指没有立刻回答。', { sfx: 'heart', zoom: 1.5, x: 60, y: 96 }],
    ['elder:cold', '关着本座。|你*嫌挤*？', { slow: 1 }], { zoom: 0 },
    ['me', '他说的是“关着”。不是“住着”。'], ['elder:ang', '咬文嚼字。墨家的人都这毛病。'],
    ['me', '您认得墨家。'], ['elder:cold', '……认得。'], ['elder:ang', '认得又怎样？本座认得的人多了，死了九成九。'],
    { bgm: 'home' }, ['elder', '小子。本座教你这些年，害过你没有？'],
    ['nar', '戒指贴着指根，是温的。和这些年的每一夜一样。'],
  ],
  choices: [
    { t: '“我信您。”', dao: 'r', ok: { talk: [['elder:shock', '……'], ['elder:ang', '信就信，说出来干什么。肉麻。', { fast: 1 }], ['nar', '那一夜，他多教了你半式。没说是哪家的剑。']], text: '“信就信，说出来干什么。”那一夜他多教了你半式。', fx: { xp: 4, flag: 'elder_trust' } } },
    { t: '点头，留个心眼', dao: 'w', ok: { talk: [['me', '没有。您没害过我。'], ['nar', '你点了头。可那个“关”字，你没有忘。'], ['elder:cold', '……你那点心思，本座看不出来？'], { bgm: '' }, ['elder:sad', '留着吧。|本座当年要是也留一个，就不在这儿了。', { slow: 1, soft: 1 }]], text: '你点了头。可那个“关”字，你没有忘。', fx: { xp: 4, flag: 'elder_doubt' } } },
    { t: '“墨家和您什么仇？”', dao: 'k', ok: { talk: [['elder:ang', '*够了*！', { loud: 1, sfx: 'thunder' }], ['elder:ang', '逆徒的后人，也配让本座提？'], ['nar', '戒指烫了一下，然后彻底冷了。'], { black: '老祖三天没有理你。' }, ['nar', '第四天清晨。'], ['elder:cold', '……起来。练剑。']], text: '“逆徒的后人，也配让本座提？”老祖三天没有理你。', fx: { xp: 3 } } },
  ] },
// mid3 论道前夜的盘口
{ id: 's3_zhao_eve', origin: 'qitu', where: 'story', trigger: 'sb:c3_mid3', not: ['beat_zhao'], chMax: 2, title: '一赔九', scene: 'gate', bgm: 'town', gist: '论道前夜有人开盘口：押你输，一赔九。',
  text: '金丹论道的前一夜，山门外有人开了盘口。赵乾一赔一，你一赔九。押你的那一边是空的。',
  talk: [
    ['nar', '金丹论道的前一夜。山门外有人支了张桌子。', { sfx: 'luo' }],
    ['?:庄家', '买定离手！天剑宗赵乾，对——那个谁。'], ['?:庄家', '赵乾一赔一。那个谁，*一赔九*。'],
    ['nar', '押赵乾的灵石堆成了小山。另一边，是空的。', { zoom: 1.4, x: 120, y: 96 }], { zoom: 0 },
    ['elder:ang', '一赔九？本座的传人，*一赔九*？', { loud: 1 }],
    { if: 'met:chu', say: [['chu', '押那个谁。'], ['?:庄家', '这位爷，押多少？'], ['chu', '全部。'], ['nar', '楚狂把钱袋扔在空的那一边。没看你，走了。', { sfx: 'tap' }]] },
    { bgm: '' }, ['elder:cold', '小子。|你自己押不押。', { sfx: 'heart' }],
  ],
  choices: [
    { t: '押自己', cost: { stones: 20 }, dao: 'k', ok: { talk: [['me', '押“那个谁”。'], ['?:庄家', '你谁啊？'], ['me:cold', '*那个谁*。', { slow: 1 }], { bgm: 'vow' }, ['elder:joy', '哈！'], ['elder', '押了就没有退路了。明天，把桌子给他掀了。']], text: '你把二十块灵石拍在了空的那一边。', fx: { xp: 3, buff: { atk: 1.2, ticks: 4 }, flag: 'zhao_bet' } } },
    { t: '不押', dao: 'w', ok: { talk: [['me', '我不赌。'], { bgm: 'town' }, ['elder', '嗯。剑不是骰子。'], ['elder:joy', '——可惜了那一赔九。']], text: '“剑不是骰子。”老祖说。“——可惜了那一赔九。”', fx: { xp: 3 } } },
  ] },
// end 没渡完的劫
{ id: 's3_end', where: 'story', trigger: 'sb:c3_end', speaker: 'elder', title: '没渡完的劫', scene: 'cave', bgm: 'home', gist: '老祖说起当年渡劫：“背后有点凉。”',
  text: '一宗之主，为什么要管一个杂灵根？你想不通。老祖忽然说起当年渡劫：“雷落下来的时候，背后有点凉。”',
  talk: [
    { pick: [
      { if: 'origin:qitu', say: [['nar', '赵乾那句话，在你脑子里转了一个月。'], ['nar', '“宗主亲口吩咐的。”'], ['elder', '又在想那句话。'], ['me', '一宗之主，为什么要管一个外门的杂灵根？']] },
      { say: [['nar', '金丹论道打完了。可天剑宗的人看你的眼神，不像看一个对手。'], ['elder', '看出来了？'], ['me', '他们怕的不是我。是我手上这枚戒指。']] },
    ] },
    ['elder:cold', '本座也在想。'],
    { bgm: '' }, ['nar', '窗外滚过一声闷雷。戒指忽然说起了别的。', { sfx: 'thunder', flash: 1 }],
    ['elder', '本座当年渡劫，渡到第八道。'], ['elder:sad', '雷落下来的时候，|背后*有点凉*。', { slow: 1, soft: 1, zoom: 1.4, x: 60, y: 96 }], { zoom: 0 },
    ['elder', '……没渡完。就这么回事。'],
    { pick: [
      { if: 'elder_trust', echo: '你说过信他', say: [['me', '下回，我站您背后。'], ['elder:shock', '……'], ['elder:ang', '你站本座背后？你站得住吗！', { fast: 1 }], ['elder:sad', '……站远点。雷不长眼。', { soft: 1 }]] },
      { if: 'elder_doubt', echo: '你一直留着个心眼', say: [['nar', '你没有接话。'], ['nar', '背后有点凉——那是背后有人。你没问是谁。'], ['elder:cold', '……不问？也好。']] },
      { say: [['me', '背后有什么？'], ['elder:cold', '有风。']] },
    ] },
    { bgm: 'home' }, ['elder', '睡吧。金丹之后的路，不好走。'],
  ],
  choices: [
    { t: '“记下了。”', dao: 'w', ok: { talk: [['elder', '嗯。']], text: '窗外的雷响了半夜，没有落下来。', fx: { xp: 5 } } },
    { t: '“这笔账，一起算。”', dao: 'k', ok: { talk: [['elder:joy', '口气不小。'], ['elder', '——先算你自己的。本座的，不急这一时。']], text: '“先算你自己的。本座的，不急这一时。”', fx: { xp: 5 } } },
  ] },
);

/* ============================================================
 * 第四章 立名
 * open story_r3 → mid1 s4_two_lamps（样稿）→ mid2 s4_tiankuo → pre sect_succession（圣子之争前夜）/ s4_challenge（无宗）→ climax s4_heir → end s4_end
 * ============================================================ */
Object.assign(PATCH, {
  // 上门示威的换成执剑长老韩铁衣（P15）
  story_r3: { scene: 'gate', bgm: 'boss', gist: '天剑宗长老上门示威。老祖说：只偷了上半句。',
    text: '元婴大成，天剑宗执剑长老韩铁衣上门示威，一式天剑九式削平半座山头。老祖冷笑：“只偷了上半句，下半句在本座这里。”',
    talk: [
      { sfx: 'rumble' }, { shake: 4 }, { flash: 1 }, ['nar', '一道剑光从天上落下来。对面的山头，平了。'],
      ['?:韩铁衣', '天剑宗执剑长老，韩铁衣。'], ['?:韩铁衣', '奉宗主之命，来看看榜上新冒出来的这一位。'], ['?:韩铁衣', '方才那一式，天剑九式第九式。|看清了么？'],
      { if: 'zhao_owes', echo: '你放过赵乾', say: [['nar', '人群后面，赵乾冲你摇了摇头。很轻。']] },
      ['nar', '四下无声。半座山的烟尘还没有落。'],
      { bgm: '' }, ['elder:joy', '呵。'], ['elder:cold', '第九式。|只偷了*上半句*。', { slow: 1, sfx: 'sting', zoom: 1.5, x: 150, y: 70 }],
      ['me', '上半句？'], ['elder', '收势的地方断了。你看他的手腕，在抖。'], { zoom: 0 },
      ['elder:ang', '三千年，一代一代，就这么抖着传下来。没一个人问为什么。'],
      { bgm: 'boss' }, ['elder:cold', '下半句，在本座这里。'],
    ],
    res: {
      0: { ok: [{ sfx: 'slash' }, { flash: 1 }, { shake: 5 }, ['nar', '你随手一剑。同一式，没有停在那个地方。'], ['nar', '剑气倒卷上去，把天上的云劈开了。'], ['?:韩铁衣', '——你怎会我宗*不传之秘*！', { loud: 1 }], ['me:cold', '不传之秘？|你们传下来的，只有一半。'], ['nar', '他的脸白了。手腕抖得更厉害。'], ['elder:joy', '走吧。让他回去问他的宗主。']],
        okText: '你随手一剑，剑气倒卷天河。韩铁衣脸色煞白：“你怎会我宗不传之秘！”',
        fail: [{ sfx: 'slash' }, ['nar', '这一剑只有七分像。'], ['nar', '可就是这七分，韩铁衣连退了三步。', { shake: 3 }], ['?:韩铁衣', '……今日之事，我会禀报宗主。'], ['elder', '七分。还行。剩下三分，夜里补。']],
        failText: '这一剑只得七分形似，仍惊得韩铁衣连退三步，撂下狠话就走。' },
      1: { ok: [['me', '看清了。多谢长老赐教。'], ['?:韩铁衣', '哼。识相。'], { scene: 'cave' }, { bgm: 'sorrow' }, ['nar', '夜里，老祖把下半句一招一招拆给你。'], ['nar', '越拆越慢。越讲越沉默。'], ['elder:sad', '教过的。|*都教过的*。', { slow: 1, soft: 1 }], ['me', '教过谁？'], ['elder:ang', '……练你的。']] },
    } },
  // 问剑并进 s4_tiankuo
  tiankuo_1: { cond: NEVER },
  // 三处灯火（圣子之争前夜，保留）：补上对话
  sect_succession: { scene: 'hall', bgm: 'home', gist: '圣子之争前夜，三位长老各请你去说话。',
    talk: [
      ['nar', '圣子之争的前一夜。{sect}有三处灯还亮着。'], ['nar', '山顶一盏。后山一盏。藏经阁一盏。'],
      ['?:传话弟子', '三位长老，都请您过去说话。'],
      ['elder', '来了。|这是叫你站队。'], ['elder', '站过去，往后有人替你说话。不站，路慢些。'],
      ['me', '您当年站过谁？'], ['elder:joy', '本座？本座当年，是别人来站本座。'],
      { bgm: '' }, ['elder:cold', '……站得最近的那个，|本座到今天还记得。', { slow: 1, soft: 1, sfx: 'sting' }],
      { bgm: 'home' }, ['elder', '自己挑。看灯，别看人。'],
    ],
    res: {
      0: { ok: [['nar', '山顶风大。那位长老在看云。'], ['?:长老', '想不想要？'], ['me', '想。'], ['nar', '他把自己的玉佩解下来，系在了你腰上。', { sfx: 'bell' }]] },
      1: { ok: [['nar', '后山的长老挽着袖子，头也不抬。'], ['?:长老', '搭把手。'], ['nar', '干到月上中天，他才直起腰。'], ['?:长老', '明天，我替你说话。']] },
      2: { ok: [['nar', '灯下的长老在翻一本名册。'], ['nar', '写着你名字的那一页，他折了个角。', { sfx: 'paper' }], ['?:长老', '明日，照这页办。'], ['nar', '灯花一爆，像盖了个印。']] },
      3: { ok: [['nar', '你练了一夜剑。'], ['nar', '天亮的时候，三处的灯都灭了。'], ['elder:joy', '不欠人。也好。'], ['elder', '路慢些。——本座陪你慢。']] },
    } },
});
LIST.push(
// mid2 第十式（并 tiankuo_1）
{ id: 's4_tiankuo', where: 'story', trigger: 'sb:c4_mid2', not: ['beat_chu'], chMax: 4, title: '第十式', scene: 'dusk', bgm: 'home', gist: '楚天阔来看你出一剑：“是我宗的，又不是。”',
  text: '天剑宗圣子楚天阔独自立在门外松下，已站了一个时辰：“我不是来打架的。出一剑，让我看看。”',
  talk: [
    { sfx: 'wind' }, ['nar', '门外的松树下站着一个人。已经站了一个时辰。'], ['nar', '白衣，负剑。天剑宗的云纹，圣子的玉牌。'],
    ['tian', '楚某，楚天阔。'], ['tian', '我不是来打架的。'],
    ['tian:cold', '韩长老回去以后，三天没有握剑。|我想知道他看见了什么。'],
    ['elder', '哦？这个倒是直来直去。'], ['tian', '出一剑。|让我看看。', { sfx: 'heart' }],
  ],
  choices: [
    { t: '出剑', ok: { talk: [{ sfx: 'slash' }, { flash: 1 }, ['nar', '你出了一剑。第九式。没有停在那个地方。'], { bgm: '' }, ['nar', '他的瞳孔缩了一下。', { zoom: 1.6, x: 150, y: 80 }], ['tian:shock', '这收势……|是我宗的，*又不是*。', { slow: 1 }], { zoom: 0 }, ['tian', '依据何在？谁教你的？'], ['me', '一位前辈。'], ['tian:cold', '我练了二十年。每一次，都停在那里。'], ['tian:sad', '我以为，是我不够好。', { soft: 1 }], { bgm: 'sorrow' }, ['nar', '他走的时候，背影头一回不那么直。'], ['tian', '会武上，我要再看一遍。'], ['elder', '这小子。倒比他师祖像个剑修。']],
      text: '他瞳孔一缩：“这收势……是我宗的，又不是。谁教你的？”走时背影第一次不那么直。', fx: { mastery: 10, flag: 'tiankuo_doubt', grudge: { chu: -10 } } } },
    { t: '“论道台上看。”', dao: 'k', ok: { talk: [['me:cold', '想看，论道台上看。'], ['tian:joy', '好。'], ['tian', '楚某在榜上等你。别让我等太久。'], ['elder', '嗯？被人当面顶回去，还笑得出来。'], ['elder:cold', '天剑宗……居然养得出这样的。', { soft: 1 }]],
      text: '他竟笑了：“好，我等你。”老祖哼道：“这小子，倒比他师祖像个剑修。”', fx: { xp: 4, grudge: { chu: 10 } } } },
    { t: '请他喝茶', dao: 'w', ok: { talk: [['nar', '他坐下了。坐得笔直，像在受审。'], ['tian', '你出剑的时候，想的是什么？'], ['nar', '他问了七个问题。全是剑。'], { bgm: '' }, ['tian:cold', '你的剑里有愧。|*不是你的愧*。', { slow: 1, sfx: 'sting' }], ['nar', '戒指凉了一下。', { sfx: 'heart', zoom: 1.4, x: 60, y: 96 }], { zoom: 0 }, ['elder:cold', '……多嘴。']],
      text: '他问了七个关于剑的问题，临走只说：“你的剑里有愧。不是你的愧。”', fx: { mastery: 6, flag: 'tiankuo_doubt' } } },
  ] },
// pre（无宗）城里替你立了一座擂
{ id: 's4_challenge', where: 'story', trigger: 'sb:c4_pre', sect: false, chMax: 3, title: '三天的擂', scene: 'dusk', bgm: 'town', gist: '城里替你立了一座擂，第三天来了九宗的人。',
  text: '{town}的人在城门口替你立了一座擂。第三天傍晚，台下来了个带剑的：“无门无派，也配占着榜上的位子？”',
  talk: [
    ['nar', '{town}的城门口，有人替你立了一座擂。', { sfx: 'luo' }],
    ['?:说书的', '三天！连立三天！谁上台赢了这一位，榜上的名次归谁！'],
    ['me', '我没让人立。'], ['elder:joy', '立都立了。有人替你吆喝，省得本座费嗓子。'],
    ['nar', '第一天，来的是街坊。第二天，来的是外地的散修。'],
    { bgm: '' }, ['nar', '第三天傍晚。台下站着一个带剑的，九宗的服色。', { zoom: 1.4, x: 150, y: 80 }], { zoom: 0 },
    ['?:带剑的', '无门无派，也配占着榜上的位子？', { sfx: 'sting' }],
    ['elder:cold', '听见没有。|没有山门，他们就当你*没有来处*。', { slow: 1 }],
  ],
  choices: [
    { t: '“请。”', dao: 'k', ok: { talk: [{ bgm: 'battle' }, { sfx: 'slash' }, { flash: 1 }, ['nar', '三招。他的剑落在了台下。', { sfx: 'clang', shake: 3 }], ['me:cold', '来处？|这座擂，就是来处。'], { bgm: 'vow' }, ['nar', '台下静了一瞬。然后是满城的人在喊你的名字。'], ['elder:joy', '听听。这回没念错。']], text: '三招。台下满城的人在喊你的名字，这回没有念错。', fx: { xp: 6, title: '擂主' } } },
    { t: '指指身后的城门', dao: 'r', ok: { talk: [['me', '我的来处，是这座城。'], ['?:街坊', '就是！这是我们{town}的人！', { loud: 1 }], { bgm: 'town' }, ['nar', '带剑的站了一会儿，走了。台下有人在笑，是善意的那种。'], ['elder', '不出剑也行。|有人替你说话了，小子。']], text: '“这是我们{town}的人！”有人替你说了话。', fx: { xp: 6 } } },
  ] },
// climax 圣子：败者的一段话，各宗各样
{ id: 's4_heir', where: 'story', trigger: 'sb:c4_climax', sect: true, title: '那把椅子', scene: 'hall', bgm: 'home', gist: '大典散了，原来的圣子还没有走。',
  text: '大典散了。大殿里只剩两个人：一个是你，一个是昨天还坐在那把椅子上的人。',
  talk: [
    { bgm: '' }, ['nar', '大典散了。{sect}的大殿里只剩两个人。'], ['nar', '一个是你。|一个是昨天还坐在那把椅子上的人。', { slow: 1, zoom: 1.4, x: 100, y: 50 }], { zoom: 0 }, { bgm: 'home' },
    { pick: [
      { if: 'sect:xuesha', echo: '你拾起过那张血帖', say: [['lixiao:cold:厉千秋', '师弟好剑。'], ['lixiao:n:厉千秋', '血煞的规矩，输了的把牌子交出来。我交。'], ['lixiao:ang:厉千秋', '可你记着：这把椅子底下，埋着三任圣子。'], ['lixiao:cold:厉千秋', '没有一任是老死的。', { sfx: 'sting' }]] },
      { if: 'sect:dan', say: [['hongxiu:joy:丹红袖', '别这么看我。我不哭。'], ['hongxiu:n:丹红袖', '丹霞谷不做亏本买卖。拿这个位子换一回看清自己，不亏。'], ['hongxiu:sad:丹红袖', '……就是有点贵。', { soft: 1 }], ['hongxiu:n:丹红袖', '往后谷里的账，你来管。管不好，我可要笑的。']] },
      { if: 'sect:dao', say: [['zhibai:n:陆知白', '我算过。昨日一战，我胜的机缘是三成。'], ['zhibai:sad:陆知白', '三成不到。……我少算了你。'], ['zhibai:n:陆知白', '师父说，来与不来皆是缘法。我一直以为，缘法是等来的。'], ['zhibai:joy:陆知白', '你是自己走过来的。这个，我得学。']] },
      { say: [['xiao:sad:前任圣子', '我练剑十九年，没有一天偷过懒。'], ['xiao:n:前任圣子', '输给杂灵根。昨天以前，我会当这是个笑话。'], ['xiao:cold:前任圣子', '今天我回去数了。你出的每一剑，都比我多想了一步。'], ['xiao:n:前任圣子', '剑宗不看灵根，看敢不敢拔剑。这话我背了十九年，今天才懂。']] },
    ] },
    ['me', '这把椅子，不好坐。'],
    { bgm: '' }, ['elder', '嗯。|坐上去的人，*背后都是眼睛*。', { slow: 1, sfx: 'sting' }],
    ['elder:cold', '本座当年有个徒弟，坐得比谁都稳。', { soft: 1 }],
  ],
  choices: [
    { t: '请对方留下帮你', dao: 'r', ok: { talk: [{ bgm: 'home' }, ['me', '这个位子上的事，我不熟。你熟。'], ['nar', '那人愣了一下，然后笑了。'], ['nar', '“……行。输给你，不冤。”'], ['elder', '会用人。比本座强。——本座是说，比本座当年强。']], text: '“……行。输给你，不冤。”昨天的对手，成了你的帮手。', fx: { xp: 5, contrib: 2 } } },
    { t: '把牌子接过来', dao: 'w', ok: { talk: [{ bgm: 'home' }, ['nar', '牌子还是温的。你系在了腰上。', { sfx: 'bell' }], ['elder', '沉不沉？'], ['me', '沉。'], ['elder:joy', '沉就对了。']], text: '牌子还是温的。老祖问沉不沉，你说沉。“沉就对了。”', fx: { xp: 5, contrib: 2 } } },
  ] },
// end 当年让你干杂役的管事
{ id: 's4_end', where: 'story', trigger: 'sb:c4_end', sect: true, title: '门槛外的人', scene: 'gate', bgm: 'home', gist: '当年让你干杂役的管事来送礼，手在抖。',
  text: '新院子的门槛外站着一个人，捧着礼盒，手在抖——是当年让你去干杂役的那位管事。',
  talk: [
    ['nar', '新院子的门槛，比别处高三寸。'], ['nar', '门槛外头站着一个人。手里捧着礼盒，|*在抖*。', { zoom: 1.5, x: 150, y: 90 }], { zoom: 0 },
    ['?:管事师兄', '小、小的来给您贺喜。'], ['elder:joy', '哟。这不是那位么。'],
    ['?:管事师兄', '当年是小的有眼无珠……那块试剑石，后来一直没人敢换。'],
    ['me', '你的脚，后来好了吗？'], ['?:管事师兄', '好、好了！早好了！', { fast: 1 }],
    { bgm: '' }, ['nar', '他不敢抬头。|你忽然想起，自己也这样站在别人门外过。', { slow: 1, sfx: 'heart' }],
  ],
  choices: [
    { t: '收下', dao: 'w', ok: { talk: [{ bgm: 'home' }, ['nar', '你接过礼盒。很轻。'], ['?:管事师兄', '谢谢！谢谢您！'], ['elder', '收了，就是翻篇了。|你倒痛快。']], text: '你收下了礼盒。收了，就是翻篇了。', fx: { xp: 4, stones: 30 } } },
    { t: '让他干一夜杂役', dao: 'k', ok: { talk: [['me:cold', '院里正缺个干杂役的。'], ['?:管事师兄', '……是！小的这就去！'], { bgm: 'home' }, ['nar', '那一夜，后院的斧声没有停。'], ['elder:joy', '一报还一报。本座喜欢。'], ['elder:cold', '——干完就算了。别学那些记一辈子的。', { soft: 1 }]], text: '那一夜后院的斧声没有停。“干完就算了。别学那些记一辈子的。”', fx: { xp: 4 } } },
    { t: '请他喝茶', dao: 'r', ok: { talk: [['me', '进来坐。'], ['?:管事师兄', '小的不敢——'], ['me', '当年你让我干杂役，我干出了一套剑法。该我谢你。'], { bgm: 'home' }, ['nar', '他端着茶，手抖得洒了一半。眼圈是红的。'], ['elder:sad', '……你这一点，比本座强。', { soft: 1 }]], text: '他端着茶，手抖得洒了一半，眼圈是红的。', fx: { xp: 5 } } },
  ] },
);

// ==== 以上各章；下面打补丁并导出 ====
for (const id in PATCH) {
  const ev = byId(id) || LIST.find(e => e.id === id), P = PATCH[id]; if (!ev || ev._sm) continue; Object.defineProperty(ev, '_sm', { value: 1, enumerable: false });
  if (P.pre && ev.talk) ev.talk.unshift(...P.pre);
  for (const k in P) { if (k === 'res' || k === 'add' || k === 'pre') continue; if (P[k] === undefined) delete ev[k]; else ev[k] = P[k]; }
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
