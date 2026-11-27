/* 废柴仙途 · 界面片段 cine2：高光过场（docs/COMBAT_LOOT.md §9）
 * 十段像素过场（⑩ 分飞升 / 轮回两段，共 11 个）：每段 2～4 个镜头，每个镜头 = 200×120 的底图 + 几层东西（小人 / 特写带 / 特效 / 盖印）+ 一种镜头运动 + 最多一句字幕（≤ 12 字）+ 音效节奏。
 * 画法：世界层（底图、小人、特效）画在 200×120 的画布上，按镜头取景框（中心 x, y 与推近倍数 z）裁出来放大；屏幕层（特写带、集中线、盖印）不跟镜头走。
 *   显示：整屏一块画布。画面按屏宽取整数倍放大（200×120 → k 倍设备像素）放在中间偏上；画面以外不是黑边，是这一帧自己的上沿 / 下沿拉开、糊掉、压暗接出去的底色，
 *   竖屏时画面下沿还有一段倒影；镜头推近（z > 1）时画面上下多露出一截（最多各 30 行），不是只在原来的框里放大。上面【跳过 ▸▸】，画面下面字幕、镜头进度点与“点一下快进 · 长按跳过”。
 * 操作：点一下 = 快进到下一个镜头（最后一个镜头就结束）；长按 0.5 秒或点【跳过】= 立刻结束（0.3 秒内回到原来的流程）。Esc 跳过、空格 / 回车快进。
 * 规则：
 *   - 每段只自动播一次：st.meta.cine[键] = 1（跨世保留；变体：boss:3、rival:zhao、pojing:4……）。开场的退婚在建档前播，记在本机偏好里，建档时补进 st.meta.cine。
 *   - 播的时候停表：借用 cine 变量放一个哨兵 { cn: true }（主循环、弹窗队列、解锁卡、章末卡、老祖气泡都已经在 cine 非空时让路），
 *     drawCine / drawCineTarget 见到哨兵就照常画洞府。原来有天劫过场在跑时先存起来，播完放回去。
 *   - 在外不打断：玩家在外（历练 / 闭关）时触发的过场进 st.cnQ 排队（不弹、不停表），回到洞府后第一次空下来（processQueue）时先播；
 *     只有“戒中剑意”（人生第一次按大按钮）在战斗画面里当场播——那是玩家正看着的战斗本身。
 *   - 排队协调（KAIRO §3.3、§5.1，过场算“大事”）：排着的过场 > 弹窗队列（结算、年报、对决……）> 章末卡 > 解锁卡。过场在播或排着没播时，章末卡与解锁卡都等。
 *   - 测试：playwright（navigator.webdriver）下默认“快放”——过场照常记看过、走完回调，但不出画面（原有的自动化脚本不用改）；
 *     window.__xm_cine.fast = false 关掉快放（tools/cine_test.js）。
 * 触发点（都在本文件末尾“接线”一节，用包一层的办法，不改原文件的流程）：
 *   ① 退婚：intro.js 开场第 2 页（introCine）。② 戒中剑意：战斗画面（C1 的 ui/battle.js）第一次按大按钮时调 playCine('ult', { mob })。
 *   ③ 破境 / ⑧ 金丹雷劫：afterBreakthrough 之前（筑基全版 12 秒；金丹走雷劫；元婴起每个大境界 8 秒短版，各播一次）。
 *   ④ 三年之约：runPact 开打前（pact0）、L.pactDuel 之后排队（pact1：赢了打脸 + 休书，输了低头定格）；只有弃徒出身（没有 L.pactText）才播。
 *   ⑤ 入宗：L.joinSect 成功后排队。⑥ 斩首领：L.fightBoss 首杀后排队（C1 的战斗引擎首杀时调 playCine('boss', { k })）。
 *   ⑦ 宿敌对视：第一次与赵乾 / 楚天阔 / 血无涯对决（duel）之前。⑨ 守山：L.sectWar 获胜后排队。⑩ 飞升：showAscension 之前；轮回：showDeath 之前。
 * 回忆：【仙途 → 记录 → 回忆】（showCineRecall），看过的点了重看，没看过的是黑的。
 * 所有片段共用一个作用域，由 tools/build.py 按 UI_PARTS 的顺序拼进同一个 IIFE（排在 intro 之后、boot 之前，包的都是已经声明好的函数）。 */
// ---------- 小工具 ----------
const CN_ME0 = { hair: '#2a2230', skin: '#f2c9a0', f: 0 };
const cnCv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').imageSmoothingEnabled = false; return c; };
const cnClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cnEase = u => 1 - Math.pow(1 - cnClamp(u, 0, 1), 3);
const cnK = (t, a, d) => cnClamp((t - a) / d, 0, 1);
const cnMe = () => (st && st.p ? { look: st.p.look || CN_ME0, r: Math.min(st.p.r | 0, 9), f: !!(st.p.look && st.p.look.f) } : { look: CN_ME0, r: 0, f: false });
function cnMix(a, b, u) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * u).toString(16).padStart(2, '0')).join('');
}
function cnImg(g, c, x, y, s, a) {
  if (!c) return; s = s || 1;
  const al = g.globalAlpha; if (a !== undefined) g.globalAlpha = al * cnClamp(a, 0, 1);
  g.drawImage(c, Math.round(x), Math.round(y), Math.round(c.width * s), Math.round(c.height * s));
  g.globalAlpha = al;
}
// 小人按脚底锚点画：d = { w, h, ax, ay }，flip 后锚点 x = w - 1 - ax
function cnFeet(g, c, x, y, s, d, flip, a) {
  if (!c) return; s = s || 1; d = d || { w: c.width, h: c.height, ax: c.width >> 1, ay: c.height - 1 };
  const ax = flip ? d.w - 1 - d.ax : d.ax;
  cnImg(g, c, x - ax * s, y - d.ay * s, s, a);
}
function cnDim(g, a, col) { g.globalAlpha = cnClamp(a, 0, 1); g.fillStyle = col || '#0a0818'; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; }
// 特写带：滑入 220ms（主角从左、对手从右）
function cnCut(g, c, flip, y, t) { if (!c || t < 0) return; const e = cnEase(t / 220); g.drawImage(c, Math.round(flip ? 200 * (1 - e) : -200 * (1 - e)), y); }
function cnLines(g, t, col, cx, cy, a) { if (t < 0) return; cnImg(g, ART.speedLines(Math.floor(t / 80) & 1, col, cx, cy), 0, 0, 1, a === undefined ? 1 : a); }
function cnText(g, s, x, y, size, col, align) {
  g.font = `${size}px XPixel, monospace`; g.textBaseline = 'middle'; g.textAlign = align || 'center';
  g.fillStyle = '#1b1326'; g.fillText(s, x + 1, y + 1); g.fillStyle = col || '#f6ecd0'; g.fillText(s, x, y);
}
// 盖印：一块朱红的印（金边、白字），t 从 0 起 180ms 从 2.4 倍砸下来
const cnSealC = new Map();
function cnSealCv(s, size, col) {
  const k = [s, size, col].join('|'); if (cnSealC.has(k)) return cnSealC.get(k);
  const pad = Math.round(size / 3), w = s.length * size + pad * 2, h = size + pad * 2, c = cnCv(w, h), g = c.getContext('2d');
  g.fillStyle = col || '#c8323c'; g.fillRect(1, 0, w - 2, h); g.fillRect(0, 1, w, h - 2);
  g.fillStyle = '#f4c542'; g.fillRect(2, 2, w - 4, 1); g.fillRect(2, h - 3, w - 4, 1); g.fillRect(2, 2, 1, h - 4); g.fillRect(w - 3, 2, 1, h - 4);
  g.font = `${size}px XPixel, monospace`; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = '#fff6e0'; g.fillText(s, w / 2, h / 2);
  cnSealC.set(k, c); return c;
}
function cnSeal(g, s, cx, cy, size, t, col) {
  if (t < 0) return;
  const c = s === '胜' && ART.stamp ? ART.stamp('胜') : cnSealCv(s, size, col), base = s === '胜' ? 2 : 1;
  const z = base * (t < 180 ? 2.4 - 1.4 * (t / 180) : 1), w = c.width * z, h = c.height * z;
  g.globalAlpha = Math.min(1, t / 80); g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h)); g.globalAlpha = 1;
}
// ART 里少数画法用全局画布（劫云、戒指迸光）：临时换过来，画完换回场景画布
function cnArt(g, fn) { ART.setCtx(g, 200); try { fn(); } finally { ART.setCtx(ctx, W); } }
// 洞府截图：开播那一刻场景画布上主角附近 200×120 一块（主角脚底在 (100, 108)）
let cnSnap = null;
function cnTakeSnap() {
  const c = cnCv(200, 120), g = c.getContext('2d');
  try { if (st && !st.exp && cvs.height >= 150) g.drawImage(cvs, 0, OY + 28, 200, 120, 0, 0, 200, 120); else g.drawImage(ART.cineBg('dusk'), 0, 0); } catch (e) { g.drawImage(ART.cineBg('dusk'), 0, 0); }
  cnSnap = c;
}
const cnHome = () => cnSnap || ART.cineBg('dusk');
// 一闪一闪往中心收的灵气点（破境、入定）
function cnGather(g, t, cx, cy, col) {
  for (let i = 0; i < 26; i++) { const u = ((t / 1100) + i / 26) % 1, a = i * 2.4, r = 46 * (1 - u); g.globalAlpha = 0.3 + 0.7 * u; g.fillStyle = i % 3 ? col : '#ffffff'; g.fillRect(Math.round(cx + Math.cos(a) * r * 1.3), Math.round(cy + Math.sin(a) * r * 0.7), 1, 1); }
  g.globalAlpha = 1;
}
// 一道锯齿雷（按 seed 固定形状）
function cnBolt(g, x0, y1, seed, col) {
  let s = seed * 9301 + 49297; const rr = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  let x = x0, y = 0; g.fillStyle = col;
  while (y < y1) { const nx = x + (rr() - 0.5) * 14, ny = Math.min(y1, y + 6 + rr() * 8); for (let k = 0; k <= 8; k++) { const px = x + (nx - x) * k / 8, py = y + (ny - y) * k / 8; g.fillRect(Math.round(px) - 1, Math.round(py), 3, 2); } x = nx; y = ny; }
  g.fillStyle = '#ffffff'; s = seed * 9301 + 49297; x = x0; y = 0;
  while (y < y1) { const nx = x + (rr() - 0.5) * 14, ny = Math.min(y1, y + 6 + rr() * 8); for (let k = 0; k <= 8; k++) g.fillRect(Math.round(x + (nx - x) * k / 8), Math.round(y + (ny - y) * k / 8), 1, 2); x = nx; y = ny; }
}
const cnFt = (who, fr, flip) => ART.fighter(who, fr, flip);
const cnMeFt = (fr, flip, r) => { const M = cnMe(); return ART.fighter({ look: M.look, realm: r === undefined ? M.r : r }, fr, flip); };
const CN_FD = () => ART.dims.fighter;
// 宗门同门的换色小人
const cnDisciple = (col, i) => ({ hair: ['#2a2230', '#3a2a24', '#1e1a2a'][i % 3], skin: i % 2 ? '#f2c9a0' : '#e8bc94', f: i % 2, robe: [cnMix(col, '#1b1326', 0.45), col, cnMix(col, '#ffffff', 0.35)], trim: '#f6ecd0' });

// ---------- 音效（名字 → audio.js 的 SFX；配乐由 audio.js 的 CN_BGM 按段选） ----------
const CSFX = {
  drum: () => SFX.drum(), wardrum: () => SFX.wardrum(), tear: () => SFX.tear(), paper: () => SFX.paper(), clang: () => SFX.clang(), bell: () => SFX.bell(), luo: () => SFX.luo(), wind: () => SFX.wind(),
  gather: () => SFX.gather(), win: () => SFX.victory(), gong: () => SFX.gong(), thunder: () => SFX.thunder(), rumble: () => SFX.rumble(), hit: () => SFX.hit(), reveal: () => SFX.reveal(4),
};

// ---------- 十段分镜 ----------
// 每段：{ n 名字, no 序号, s 标称秒数, thumb() 回忆里的小图, shots(o) → [镜头] }
// 镜头：{ ms, draw(g, t, u) 世界层, over(g, t, u) 屏幕层, cam(u) → { x, y, z } 取景框, sub 字幕, sfx: [[ms, 名字]], shake: [[ms, 持续, 幅度]], fade 淡入 ms }
const CN_RV = {
  zhao: { pt: 'zhao', col: '#aeb8c8', line: '“当年踢你下山，今天照样！”' },
  chu: { pt: 'tian', col: '#4aa8ff', line: '“弃徒，也配与我交手？”' },
  xue: { pt: 'xue', col: '#c8323c', line: '“正道蝼蚁，也配？”' },
};
const CINE = {
  // ① 退婚（开场）
  tuihun: { n: '退婚', no: '①', s: 20, thumb: () => ART.introPanel(1, cnMe().look), shots: () => {
    const M = cnMe(), hall = ART.introPanel(1, M.look), ex = ART.cutin(ART.portrait('mu', 'n', M.f), '#4aa8ff', true), me = ART.cutin(ART.portraitMe(M.look, 0, 'ang'), '#d8404a', false);
    return [
      { ms: 5000, fade: 700, cam: u => ({ x: 64 + 72 * u, y: 58, z: 1.35 }), draw: g => cnImg(g, hall, 0, 0), sfx: [[200, 'wind']] },
      { ms: 5000, cam: u => ({ x: 146, y: 60, z: 1.35 + 0.2 * u }), draw: g => { cnImg(g, hall, 0, 0); cnDim(g, 0.55); }, over: (g, t) => cnCut(g, ex, true, 40, t), sub: '“这门亲事，就此作罢。”' },
      { ms: 4500, draw: (g, t) => {
        cnImg(g, ART.cineBg('ink'), 0, 0); cnDim(g, 0.25);
        const f = t < 1300 ? 0 : t < 2100 ? 1 : 2, drift = f === 2 ? cnEase((t - 2100) / 1600) * 6 : 0;
        cnImg(g, ART.tornLetter(f), 52, 22 - drift, 2);
      }, over: (g, t) => { if (t > 2100) cnLines(g, t, '#1b1326', 100, 58, 0.8); }, shake: [[1300, 260, 3], [2100, 420, 5]], sfx: [[1300, 'tear'], [2100, 'tear'], [2350, 'drum']] },
      { ms: 5500, draw: g => { cnImg(g, ART.cineBg('dusk'), 0, 0); cnDim(g, 0.4); }, over: (g, t) => cnCut(g, me, false, 40, t), sub: '“三年后，我来取回。”', sfx: [[3600, 'bell']] },
    ];
  } },
  // ② 戒中剑意（人生第一次按大按钮）
  ult: { n: '戒中剑意', no: '②', s: 6, thumb: () => ART.ultFx(3), shots: o => {
    const elder = ART.cutin(ART.portrait('elder', 'ang'), '#f4c542', false), mob = o.mob && ART.mob ? o.mob : 'xiong';
    const foe = ART.mob ? ART.mob(mob, 0, false) : null, foeHit = ART.mob ? ART.mob(mob, 0, false) : null;
    const bg = (g, a) => { cnImg(g, ART.cineBg('ink'), 0, 0); cnDim(g, a, '#120c1e'); };
    const D = ART.dims.mob || { w: 32, h: 28, ax: 16, ay: 27 };
    return [
      { ms: 3000, draw: g => { bg(g, 0.62); cnFeet(g, cnMeFt('windup'), 62, 108, 1.5, CN_FD()); cnFeet(g, foe, 144, 108, 1.5, D); }, over: (g, t) => cnCut(g, elder, false, 8, t), sub: '“小子，借你一剑。”', sfx: [[100, 'gather']] },
      { ms: 3000, draw: (g, t) => {
        bg(g, 0.48); cnFeet(g, cnMeFt(t > 520 ? 'strike' : 'windup'), 62, 108, 1.5, CN_FD());
        const hitA = t > 520 && t < 900 ? (Math.floor(t / 60) % 2 ? 0.5 : 1) : 1; cnFeet(g, foeHit, 144, 108, 1.5, D, false, hitA);
        if (t > 200) { const f = Math.min(5, Math.floor((t - 200) / 110)); cnFeet(g, ART.ultFx(f), 144, 108, 1.1, { w: 64, h: 96, ax: 32, ay: 92 }); }
      }, over: (g, t) => { if (t > 530 && t < 1400) cnLines(g, t, '#fff2a8', 144, 70, 0.9); }, shake: [[530, 380, 5]], sfx: [[530, 'hit'], [560, 'clang']] },
    ];
  } },
  // ③ 破境（筑基全版；元婴起短版 ㈡㈢，换境界色）
  pojing: { n: '破境', no: '③', s: 12, thumb: () => ART.cineBg('clouds'), shots: o => {
    const r = cnClamp(o.r || 1, 1, 8), short = !!o.short, M = cnMe(), RC = L.REALMS[r], col = RC.robe[1];
    const body = ART.standRealm(M.look, r, 0);
    const s1 = { ms: 4000, cam: u => ({ x: 100, y: 88, z: 1 + 0.9 * cnEase(u) }), draw: (g, t) => { cnImg(g, cnHome(), 0, 0); cnGather(g, t, 100, 92, '#9ff5d8'); }, sfx: [[100, 'gather']] };
    const s2 = { ms: 4000, draw: (g, t, u) => {
      cnImg(g, ART.cineBg('clouds'), 0, 0); cnLines(g, t, '#ffffff', 100, 62, 0.7);
      const y = 124 - 50 * cnEase(u); g.globalAlpha = 0.5; g.fillStyle = '#fff2a8'; g.fillRect(96, 0, 8, y - 20); g.globalAlpha = 1;
      cnFeet(g, body, 100, y, 1.5);
    }, sfx: [[0, 'gather']] };
    const s3 = { ms: 4000, draw: (g, t) => { cnImg(g, ART.cineBg('clouds'), 0, 0); cnDim(g, 0.15, col); cnFeet(g, body, 100, 76, 1.5); },
      over: (g, t) => cnSeal(g, RC.n, 100, 96, 24, t - 600, cnMix(col, '#8a1e2e', 0.35)), shake: [[600, 200, 2]], sfx: [[1000, 'win']] };
    return short ? [s2, s3] : [s1, s2, s3];
  } },
  // ④ 三年之约：part 0 开打前（4 秒）；part 1 赢了打脸 + 休书（14 秒），输了低头定格（4 秒）
  pact: { n: '三年之约', no: '④', s: 18, thumb: () => ART.cineBg('dusk'), shots: o => {
    const M = cnMe(), meA = ART.cutin(ART.portraitMe(M.look, M.r, 'ang'), '#d8404a', false), exN = ART.cutin(ART.portrait('mu', 'n', M.f), '#4aa8ff', true), exS = ART.portrait('mu', 'shock', M.f);
    const meSad = ART.cutin(ART.portraitMe(M.look, M.r, 'sad'), '#55506e', false);
    const exFt = ART.fighter('mu', 'hit', true, M.f), exDown = ART.fighter('mu', 'idle0', true, M.f);
    const a = { ms: 4000, draw: g => cnImg(g, ART.cineBg('dusk'), 0, 0), over: (g, t) => { cnCut(g, meA, false, 8, t); cnCut(g, exN, true, 60, t - 380); }, sub: '“三年之期已到。”', sfx: [[200, 'drum'], [1100, 'drum']] };
    const b = { ms: 6000, draw: (g, t) => {
      cnImg(g, ART.cineBg('ink'), 0, 0); cnLines(g, t, '#1b1326', 120, 70, 0.85);
      cnFeet(g, cnMeFt(t > 300 ? 'strike' : 'windup'), 62, 104, 2, CN_FD());
      cnFeet(g, t > 300 ? exFt : exDown, 140 + cnEase((t - 300) / 500) * 8, 104, 2, CN_FD(), true);
      if (t > 300 && t < 300 + 4 * 90 + 200) cnImg(g, ART.skillFx('slash', Math.min(3, Math.floor((t - 300) / 90))), 104, 30, 1.5);
    }, over: (g, t) => cnSeal(g, '胜', 168, 26, 24, t - 1100), shake: [[300, 260, 4], [1100, 160, 2]], sfx: [[300, 'clang'], [1100, 'drum']] };
    const c = { ms: 8000, draw: (g, t) => {
      cnImg(g, ART.cineBg('dusk'), 0, 0); cnDim(g, 0.5);
      cnImg(g, exS, 146, 44, 1);
      const k = cnEase(t / 1500), x = 6 + 92 * k, y = 74 - 30 * k, rot = (1 - k) * 7 - 0.2;
      g.save(); g.translate(x + 24, y + 18); g.rotate(rot); g.drawImage(ART.tornLetter(0), -24, -18, 48, 36); g.restore();
    }, over: (g, t) => { if (t > 1500) cnLines(g, t, '#fff2a8', 120, 50, 0.9); }, sub: '“这一纸休书，还你。”', shake: [[1500, 200, 2]], sfx: [[100, 'paper'], [1500, 'paper'], [5600, 'bell']] };
    const lose = { ms: 4000, draw: (g, t) => { cnImg(g, ART.cineBg('dusk'), 0, 0); g.filter = 'grayscale(.8)'; cnImg(g, ART.cineBg('dusk'), 0, 0, 1, cnK(t, 0, 1200)); g.filter = 'none'; cnDim(g, 0.45); },
      over: (g, t) => cnCut(g, meSad, false, 40, t), sub: '“天骄榜上，再见。”', sfx: [[300, 'drum']] };
    if (o.part === 0) return [a];
    if (o.part === 1) return o.win === false ? [lose] : [b, c];
    return o.win === false ? [a, lose] : [a, b, c];
  } },
  // ⑤ 入宗
  rzong: { n: '入宗', no: '⑤', s: 12, thumb: () => ART.cineBg('gate'), shots: o => {
    const sc = L.SECTS.find(x => x.id === (o.id || (st && st.sect && st.sect.id))) || L.SECTS[0], col = sc.color || '#4aa8ff', M = cnMe();
    const me = ART.standRealm(M.look, M.r, 0), em = ART.emblem ? ART.emblem(sc.id) : null;
    const mates = [0, 1, 2, 3].map(i => ART.fighter(cnDisciple(col, i), 'stand0', i % 2 === 0));
    return [
      { ms: 4500, fade: 500, cam: u => ({ x: 100, y: 92 - 60 * cnEase(u), z: 1.9 }), draw: g => cnImg(g, ART.cineBg('gate'), 0, 0), sfx: [[200, 'bell']] },
      { ms: 4000, cam: u => ({ x: 90 + 20 * u, y: 74, z: 1.4 }), draw: g => {
        cnImg(g, ART.cineBg('gate'), 0, 0);
        [[64, 110], [136, 110], [50, 118], [150, 118]].forEach(([x, y], i) => cnFeet(g, mates[i], x, y, 1, CN_FD(), i % 2 === 0));
        cnFeet(g, me, 100, 104, 1);
      }, sfx: [[300, 'bell']] },
      { ms: 3500, draw: g => { cnImg(g, ART.cineBg('ink'), 0, 0); cnDim(g, 0.2); }, over: (g, t) => {
        if (em) { const z = t < 180 ? 6 - 2 * (t / 180) : 4; cnImg(g, em, 100 - 8 * z, 46 - 8 * z, z, Math.min(1, t / 100)); } else cnSeal(g, sc.n.slice(0, 1), 100, 46, 24, t);
        cnSeal(g, sc.n, 100, 98, 12, t - 700, cnMix(col, '#1b1326', 0.35));
      }, shake: [[0, 180, 2]], sub: `“拜入${sc.n}。”`, sfx: [[0, 'drum'], [400, 'bell']] },
    ];
  } },
  // ⑥ 斩首领（模板，11 个首领共用）
  boss: { n: '斩首领', no: '⑥', s: 6, thumb: () => ART.cineBg('ink'), shots: o => {
    const k = cnClamp(o.k | 0, 0, L.BOSSES.length - 1), B = L.BOSSES[k], D = ART.bossFighterDims ? ART.bossFighterDims(k) : CN_FD();
    const bf = fr => (ART.bossFighter ? ART.bossFighter(k, fr, true) : ART.boss(k));
    return [
      { ms: 3000, draw: (g, t) => {
        cnImg(g, ART.cineBg('ink'), 0, 0); cnLines(g, t, '#1b1326', 120, 70, 0.85);
        cnFeet(g, cnMeFt(t > 250 ? 'strike' : 'windup'), 60, 104, 2, CN_FD());
        cnFeet(g, bf(t > 250 ? 'hit' : 'idle0'), 142, 104, 2, D, true);
        if (t > 250 && t < 250 + 560) cnImg(g, ART.skillFx('slash', Math.min(3, Math.floor((t - 250) / 90))), 106, 30, 1.5);
      }, shake: [[250, 300, 4]], sfx: [[250, 'clang']] },
      { ms: 3000, draw: g => { cnImg(g, ART.cineBg('ink'), 0, 0); cnFeet(g, bf('down'), 130, 108, 2, D, true); cnFeet(g, cnMeFt('idle0'), 56, 108, 1.5, CN_FD()); },
        over: (g, t) => cnSeal(g, B.t, 100, 32, 24, t - 300), shake: [[300, 180, 2]], sfx: [[400, 'luo']] },
    ];
  } },
  // ⑦ 宿敌对视（赵乾 / 楚天阔 / 血无涯各一次）
  rival: { n: '宿敌对视', no: '⑦', s: 6, thumb: () => { const c = cnCv(200, 120), g = c.getContext('2d'), M = cnMe(); g.drawImage(ART.cineBg('dusk'), 0, 0); cnDim(g, 0.35); g.drawImage(ART.cutin(ART.portraitMe(M.look, M.r, 'ang'), '#d8404a', false), 0, 8); g.drawImage(ART.cutin(ART.portrait('zhao', 'ang'), '#aeb8c8', true), 0, 62); return c; }, shots: o => {
    const id = CN_RV[o.id] ? o.id : 'zhao', R0 = CN_RV[id], M = cnMe();
    const meA = ART.cutin(ART.portraitMe(M.look, M.r, 'ang'), '#d8404a', false), rv = ART.cutin(ART.portrait(R0.pt, 'ang'), R0.col, true);
    return [
      { ms: 3500, draw: g => { cnImg(g, ART.cineBg('dusk'), 0, 0); cnDim(g, 0.35); }, over: (g, t) => { cnCut(g, meA, false, 8, t); cnCut(g, rv, true, 62, t - 300); }, sub: R0.line, sfx: [[200, 'drum'], [800, 'drum']] },
      { ms: 2500, cam: u => ({ x: 100, y: 80, z: 1 + 0.3 * cnEase(u) }), draw: (g, t) => {
        cnImg(g, ART.cineBg('dusk'), 0, 0); cnDim(g, 0.2);
        cnFeet(g, cnMeFt('windup'), 70, 110, 1.5, CN_FD()); cnFeet(g, ART.fighter(R0.pt, 'windup', true), 130, 110, 1.5, CN_FD(), true);
      }, over: (g, t) => cnLines(g, t, '#fff2a8', 100, 80, 0.5) },
    ];
  } },
  // ⑧ 金丹雷劫（第一次渡劫成功）
  leijie: { n: '金丹雷劫', no: '⑧', s: 15, thumb: () => { const c = cnCv(200, 120), g = c.getContext('2d'); g.drawImage(ART.cineBg('clouds'), 0, 0); cnArt(g, () => ART.drawTribClouds(0, 0, 1)); return c; }, shots: () => {
    const M = cnMe(), meA = ART.cutin(ART.portraitMe(M.look, 1, 'shock'), '#8a7ac8', false), body = ART.standRealm(M.look, 2, 0), sit = ART.sit ? ART.sit(M.look, 1) : null;
    const dark = g => { g.fillStyle = '#0a0818'; g.fillRect(0, 0, 200, 120); };
    return [
      { ms: 4000, draw: (g, t) => { cnImg(g, cnHome(), 0, 0); cnArt(g, () => ART.drawTribClouds(t, 0, cnK(t, 0, 1600))); }, sfx: [[100, 'rumble'], [1600, 'rumble']] },
      { ms: 3500, draw: (g, t) => { cnImg(g, cnHome(), 0, 0); cnArt(g, () => ART.drawTribClouds(t + 4000, 0, 1)); cnDim(g, 0.35); }, over: (g, t) => cnCut(g, meA, false, 40, t), sfx: [[1400, 'thunder']] },
      { ms: 3500, draw: (g, t) => {
        dark(g); cnArt(g, () => ART.drawTribClouds(t + 7500, 0, 1));
        if (sit) cnFeet(g, sit, 100, 112, 1);
        const n = t < 700 ? 0 : t < 1700 ? 1 : 2; if (n && (t % 1000) < 380) cnBolt(g, 100 + (n - 1) * 3, 100, n * 7 + 3, '#fff6a8');
      }, over: (g, t) => { if (t > 700) cnLines(g, t, '#ffffff', 100, 96, 0.6); if (t > 2600) { g.globalAlpha = cnK(t, 2600, 800); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; } },
        shake: [[700, 300, 4], [1700, 400, 6]], sfx: [[700, 'thunder'], [1700, 'thunder']] },
      { ms: 4000, draw: (g, t) => { cnImg(g, ART.cineBg('clouds'), 0, 0); cnFeet(g, body, 100, 98, 1.5); g.globalAlpha = 1 - cnK(t, 0, 600); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; },
        over: (g, t) => cnSeal(g, '金丹', 156, 30, 24, t - 1200, '#b8862a'), sub: '“金丹，成。”', sfx: [[1200, 'win']] },
    ];
  } },
  // ⑨ 守山（天剑宗来犯，击退后）
  shoushan: { n: '守山', no: '⑨', s: 15, thumb: () => { const c = cnCv(200, 120), g = c.getContext('2d'); g.drawImage(ART.cineBg('gate'), 0, 0); cnDim(g, 0.35, '#8a1020'); return c; }, shots: () => {
    const sc = (st && L.sectOf && L.sectOf(st)) || L.SECTS[0], col = sc.color || '#4aa8ff', M = cnMe(), em = ART.emblem ? ART.emblem(sc.id) : null;
    const red = g => { cnImg(g, ART.cineBg('gate'), 0, 0); cnDim(g, 0.38, '#8a1020'); };
    const crowd = (g, t) => {
      for (let row = 0; row < 3; row++) for (let i = 0; i < 18; i++) {
        const x = i * 12 + (row % 2) * 6 - 4, y = 102 + row * 7 + Math.round(Math.sin(t / 300 + i + row) * 0.8);
        g.fillStyle = row === 2 ? '#0e0814' : '#1b1326'; g.fillRect(x, y, 7, 14); g.fillRect(x + 1, y - 4, 5, 4);
        if ((i + row) % 3 === 0) { g.fillStyle = '#aeb8c8'; g.fillRect(x + 6, y - 12, 1, 12); }
      }
    };
    const row = [0, 1, 2, 3].map(i => ART.fighter(cnDisciple(col, i), 'idle0', false));
    return [
      { ms: 5000, fade: 400, cam: u => ({ x: 100, y: 66, z: 1.1 + 0.15 * u }), draw: (g, t) => { red(g); crowd(g, t); }, sfx: [[0, 'wardrum'], [550, 'wardrum'], [1100, 'wardrum'], [2400, 'wardrum'], [2950, 'wardrum']] },
      { ms: 5000, cam: u => ({ x: 70 + 60 * u, y: 84, z: 1.5 }), draw: (g, t) => {
        red(g); cnDim(g, 0.25);
        [26, 56, 144, 174].forEach((x, i) => cnFeet(g, row[i], x, 112, 1, CN_FD()));
        cnFeet(g, cnMeFt(t > 2600 ? 'strike' : 'idle' + (Math.floor(t / 400) % 2)), 100, 112, 1.2, CN_FD());
      }, over: (g, t) => { if (t > 2600) cnLines(g, t, '#ffffff', 100, 70, 0.6); }, shake: [[2600, 300, 4]], sfx: [[2600, 'clang']] },
      { ms: 5000, draw: g => cnImg(g, ART.cineBg('ink'), 0, 0), over: (g, t) => { cnSeal(g, '守', 100, 52, 36, t - 200); if (em && t > 900) cnImg(g, em, 132, 64, 2, cnK(t, 900, 300)); }, shake: [[200, 200, 3]], sub: '“山门在，我在。”', sfx: [[200, 'drum'], [600, 'bell']] },
    ];
  } },
  // ⑩ 飞升
  feisheng: { n: '飞升', no: '⑩', s: 25, thumb: () => ART.backdrop('ascend'), shots: () => {
    const M = cnMe(), meW = ART.cutin(ART.portraitMe(M.look, 9, 'n'), '#f4c542', false);
    const ids = ['elder', 'mu', 'su', 'zhao', 'tian', 'yun'].filter(id => ART.hasPortrait ? ART.hasPortrait(id) : true).slice(0, 6), pts = ids.map(id => ART.portrait(id, 'joy', M.f));
    return [
      { ms: 6000, fade: 800, cam: u => ({ x: 100, y: 54, z: 1 + 0.3 * cnEase(u) }), draw: g => cnImg(g, ART.backdrop('ascend'), 0, 0), sfx: [[0, 'gather'], [1500, 'gather'], [3000, 'gather']] },
      { ms: 5000, draw: g => { cnImg(g, ART.backdrop('ascend'), 0, 0); cnDim(g, 0.5); }, over: (g, t) => cnCut(g, meW, false, 40, t) },
      { ms: 8000, draw: (g, t) => {
        g.fillStyle = '#0e0a1c'; g.fillRect(0, 0, 200, 120);
        for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? '#55508a' : '#ffffff'; g.fillRect((i * 53) % 200, (i * 31) % 120, 1, 1); }
        pts.forEach((c, i) => {
          if (!c) return; const x = 16 + (i % 3) * 60, y = i < 3 ? 8 : 64, on = cnK(t, 400 + i * 1100, 500);
          g.filter = 'grayscale(1) brightness(.35)'; cnImg(g, c, x, y, 1); g.filter = 'none'; cnImg(g, c, x, y, 1, on);
          if (on > 0 && on < 1) { g.globalAlpha = 1 - on; g.fillStyle = '#fff2a8'; g.fillRect(x, y, 48, 48); g.globalAlpha = 1; }
        });
      }, sfx: [0, 1, 2, 3, 4, 5].map(i => [400 + i * 1100, 'reveal']) },
      { ms: 6000, draw: (g, t) => { cnImg(g, ART.backdrop('ascend'), 0, 0); g.globalAlpha = 0.8 * cnK(t, 0, 3000); g.fillStyle = '#fff6d0'; g.fillRect(0, 0, 200, 120); g.globalAlpha = 1; },
        over: (g, t) => { if (t > 400) cnLines(g, t, '#f4c542', 100, 50, 0.5 * cnK(t, 400, 1000)); }, sub: '“此去，天外见。”', sfx: [[800, 'bell']] },
    ];
  } },
  // ⑩ 轮回（寿尽）
  lunhui: { n: '轮回', no: '⑩', s: 18, thumb: () => ART.backdrop('samsara'), shots: () => {
    const snow = (g, t) => { for (let i = 0; i < 60; i++) { const x = ((i * 37 + t * 0.006 * (1 + i % 3)) % 210) - 5, y = ((i * 23 + t * 0.012 * (1 + i % 2)) % 124) - 2; g.fillStyle = i % 4 ? '#e8f0ff' : '#ffffff'; g.fillRect(Math.round(x), Math.round(y), 1, 1); } };
    return [
      { ms: 7000, fade: 800, cam: u => ({ x: 100, y: 84, z: 1 + 0.5 * cnEase(u) }), draw: (g, t) => { cnImg(g, cnHome(), 0, 0); cnDim(g, 0.45 + 0.25 * cnK(t, 0, 7000), '#0a1030'); snow(g, t); }, sfx: [[300, 'bell']] },
      { ms: 4000, draw: (g, t) => { g.fillStyle = '#06050c'; g.fillRect(0, 0, 200, 120); cnArt(g, () => ART.drawRingBurst(100, 64, cnK(t, 300, 2400))); } },
      { ms: 7000, cam: u => ({ x: 100, y: 52, z: 1 + 0.25 * u }), draw: g => cnImg(g, ART.backdrop('samsara'), 0, 0), sub: '“再来。”' },
    ];
  } },
};
// 触发用的名字 → 段与参数（C1 的战斗画面用 pact0 / pact1 / ult / boss）
const CN_ALIAS = { pact0: ['pact', { part: 0 }], pact1: ['pact', { part: 1 }] };
// 看过的键：变体单独记（boss:3、rival:chu、pojing:4、pact0、pact1），同时记段名（回忆按段名点亮）
function cnKeyOf(id, o) {
  if (id === 'boss') return 'boss:' + (o.k | 0);
  if (id === 'rival') return 'rival:' + o.id;
  if (id === 'pojing' && (o.r | 0) > 1) return 'pojing:' + (o.r | 0);
  if (id === 'pact') return o.part === 0 ? 'pact0' : 'pact1';
  return id;
}

// ---------- 看过 ----------
const CN_PREF = 'xianmen_cine_v1';
function cnPrefGet() { try { return JSON.parse(localStorage.getItem(CN_PREF) || '{}') || {}; } catch (e) { return {}; } }
function cnPrefSet(k) { try { const p = cnPrefGet(); p[k] = 1; localStorage.setItem(CN_PREF, JSON.stringify(p)); } catch (e) { /* 无痕模式 */ } }
const cnMeta = () => (st ? ((st.meta = st.meta || L.newMeta()).cine || (st.meta.cine = {})) : null);
const cineSeen = k => { const m = cnMeta(); return m ? !!m[k] : !!cnPrefGet()[k]; };
function cnMark(id, key) { const m = cnMeta(); if (m) { m[key] = 1; m[id] = 1; } else { cnPrefSet(key); cnPrefSet(id); } }
// 新档、转世：st.meta.cine 跟着 L.newMeta 走（src/logic/save.js 包的一层；读档迁移按 L.newMeta 的键补空对象）；开场的退婚记在本机偏好里，建档时补进来
{ const ns = L.newState; L.newState = function () { const s = ns.apply(this, arguments); s.meta = s.meta || L.newMeta(); s.meta.cine = s.meta.cine || {}; if (cnPrefGet().tuihun) s.meta.cine.tuihun = 1; s.cnQ = []; return s; }; }

// ---------- 播放器 ----------
let cn = null;   // 正在播：{ id, key, shots, i, t, root, cv, g, wg, sg, k, done, ... }
const cnFast = () => { const x = window.__xm_cine; if (x && typeof x.fast === 'boolean') return x.fast; return !!navigator.webdriver; };
const cnOn = () => !!cn;
// 有排着的过场且人在洞府：章末卡、解锁卡让一让
const cnHold = () => !!cn || !!(st && st.cnQ && st.cnQ.length && !tripUI());
function cnMount(intro) {
  const root = document.createElement('div');
  root.className = 'cn-wrap' + (intro ? ' story cn-in' : '');
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', '过场');
  root.innerHTML = '<canvas class="cn-cv"></canvas><button class="cn-skip" aria-label="跳过过场">跳过 ▸▸</button><div class="cn-sub"></div><div class="cn-pips"></div><div class="cn-hint">点一下快进 · 长按跳过</div>';
  (intro ? $('#intro') : document.body).appendChild(root);
  return root;
}
function cnSize() {
  if (!cn) return;
  const q = parseFloat(document.documentElement.style.zoom) || 1, dpr0 = (window.devicePixelRatio || 1) * q, vw = window.innerWidth / q, vh = window.innerHeight / q, tall = vh > vw * 1.15;   // 大屏上整页有 zoom，折算进去
  const dpr = Math.min(dpr0, Math.sqrt(4.4e6 / (vw * vh)));   // 画布像素封顶
  let k = Math.max(1, Math.floor(Math.min(vw * dpr / 200, (vh - (tall ? 190 : 150)) * dpr / 120)));
  if (tall && 200 * (k + 1) <= vw * dpr * 1.125 && 120 * (k + 1) <= (vh - 190) * dpr) k++;   // 竖屏：差一点就够再大一倍时，两侧各裁掉不到 6%，换画面大一号
  const Wl = Math.floor(vw * dpr / k), Hl = Math.floor(vh * dpr / k), cv = cn.cv;
  cn.k = k; cv.width = Wl * k; cv.height = Hl * k; cv.style.width = (Wl * k / dpr) + 'px'; cv.style.height = (Hl * k / dpr) + 'px';
  cv.style.left = (Math.round((vw * dpr - Wl * k) / 2) / dpr) + 'px';
  const py = Math.round((Hl - 120) * (tall ? 0.4 : 0.36) - (tall ? 0 : 6)), top = Math.ceil(58 * dpr / k);
  const ext = Math.max(0, Math.min(30, py - (tall ? top : 0)));
  cn.G = { Wl, Hl, dpr, py: Math.max(0, py), ext, tall, x0: Math.floor((Wl - 200) / 2) };
  cn.g.imageSmoothingEnabled = false; cn.am = cnCv(Math.max(8, Math.ceil(Wl / 6)), Math.max(8, Math.ceil(Hl / 6))); cn.at = cnCv(Math.ceil(cn.am.width / 2), Math.ceil(cn.am.height / 2)); cn.amN = 0;
  const subY = Math.min((cn.G.py + 120 + ext) * k / dpr + (tall ? 20 : 10), vh - 104);
  cn.root.style.setProperty('--cn-sub', subY + 'px');
}
// 画面以外的底色：这一帧上沿 12 行拉到屏幕顶、下沿 12 行拉到屏幕底、左右两条拉到屏幕边，缩小再放大糊开，压暗
function cnAmbient(c) {
  const G = c.G, a = c.am, t = c.at, g = a.getContext('2d'), tg = t.getContext('2d'), q = 1 / 12, x0 = G.x0 * q, w = 200 * q, y0 = G.py * q, y1 = (G.py + 120) * q, H = t.height, W = t.width;
  tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high'; tg.globalAlpha = 1;
  tg.drawImage(c.wc, 0, 0, 200, 12, 0, 0, W, y0 + 0.5); tg.drawImage(c.wc, 0, 108, 200, 12, 0, y1 - 0.5, W, H - y1 + 0.5);
  if (x0 > 0.5) { tg.drawImage(c.wc, 0, 0, 8, 120, 0, y0, x0 + 0.5, y1 - y0); tg.drawImage(c.wc, 192, 0, 8, 120, x0 + w - 0.5, y0, W - x0 - w + 0.5, y1 - y0); }
  tg.drawImage(c.wc, x0, y0, w, y1 - y0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.globalAlpha = 1; g.drawImage(t, 0, 0, a.width, a.height);
  g.fillStyle = 'rgba(7,5,12,.5)'; g.fillRect(0, 0, a.width, a.height);
  if (!c.amGr) { const gr = g.createLinearGradient(0, 0, 0, a.height), u0 = G.py / G.Hl, u1 = (G.py + 120) / G.Hl; gr.addColorStop(0, 'rgba(7,5,12,.85)'); gr.addColorStop(Math.max(0.01, u0), 'rgba(7,5,12,0)'); gr.addColorStop(Math.min(0.98, u1), 'rgba(7,5,12,.1)'); gr.addColorStop(Math.min(0.99, u1 + (1 - u1) * 0.5), 'rgba(7,5,12,.72)'); gr.addColorStop(1, 'rgba(7,5,12,.95)'); c.amGr = gr; }
  g.fillStyle = c.amGr; g.fillRect(0, 0, a.width, a.height);
}
// 播一段。o：参数；how：{ intro: 挂在开场里, recall: 回忆（不记看过） }。返回 Promise（结束或被跳过时 resolve）
function cinePlay(id, o, how) {
  o = o || {}; how = how || {};
  const al = CN_ALIAS[id]; if (al) { o = Object.assign({}, al[1], o); id = al[0]; }
  const C = CINE[id]; if (!C) return Promise.resolve(false);
  const key = cnKeyOf(id, o);
  if (!how.recall) cnMark(id, key);
  if (cn) cnEnd(true);   // 理论上不会叠：叠了就把前一段收掉
  if (cnFast() && !how.force) return Promise.resolve(true);
  let shots; try { shots = C.shots(o); } catch (e) { return Promise.resolve(false); }
  if (!shots || !shots.length) return Promise.resolve(false);
  if (st) cnTakeSnap(); else cnSnap = null;
  ac();
  return new Promise(res => {
    const root = cnMount(how.intro), cv = root.querySelector('.cn-cv');
    cn = { id, key, o, shots, i: 0, t: 0, root, cv, g: cv.getContext('2d'), wc: cnCv(200, 120), sc: cnCv(200, 120), fired: new Set(), res, last: performance.now(), prevCine: cine, intro: !!how.intro, down: 0, hold: 0, frozen: false, sub: '' };
    cn.wg = cn.wc.getContext('2d'); cn.sg = cn.sc.getContext('2d'); cn.wg.imageSmoothingEnabled = false; cn.sg.imageSmoothingEnabled = false;
    if (!how.intro && st) cine = { cn: true, t: 0 };   // 停表、挡住弹窗队列与讲解（见文件头）
    $('#tip').hidden = true;
    cnSize();
    root.querySelector('.cn-pips').innerHTML = shots.map(() => '<i></i>').join('');
    const skip = root.querySelector('.cn-skip');
    skip.addEventListener('click', e => { e.stopPropagation(); cnEnd(); });
    skip.addEventListener('pointerdown', e => e.stopPropagation());
    root.addEventListener('pointerdown', e => { if (!cn) return; cn.down = performance.now(); clearTimeout(cn.hold); cn.hold = setTimeout(() => { if (cn && cn.down) { cn.down = 0; cnEnd(); } }, 500); });
    root.addEventListener('pointerup', () => { if (!cn || !cn.down) return; cn.down = 0; clearTimeout(cn.hold); cnNext(); });
    root.addEventListener('pointercancel', () => { if (cn) { cn.down = 0; clearTimeout(cn.hold); } });
    root.addEventListener('click', e => e.stopPropagation());
    cnShot(0);
    requestAnimationFrame(cnFrame);
  });
}
function cnShot(i) {
  cn.i = i; cn.t = 0; cn.fired = new Set();
  const S = cn.shots[i], el = cn.root.querySelector('.cn-sub');
  cn.sub = S.sub || ''; el.textContent = ''; cn.typed = 0; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  cn.root.querySelectorAll('.cn-pips i').forEach((p, j) => p.classList.toggle('on', j <= i));
}
function cnNext() { if (!cn) return; if (cn.i + 1 < cn.shots.length) { cnShot(cn.i + 1); SFX.tap(); } else cnEnd(); }
function cnEnd(quiet) {
  const c = cn; if (!c) return;
  cn = null; clearTimeout(c.hold);
  c.root.remove();
  if (!c.intro && cine && cine.cn) cine = c.prevCine && !c.prevCine.cn ? c.prevCine : null;
  if (st) saveLocal();
  c.res(true);
  if (!quiet && st) { updateHUD(); setTimeout(processQueue, 60); }
}
function cnFrame(now) {
  const c = cn; if (!c) return;
  const dt = Math.min(100, now - c.last); c.last = now;
  if (!c.frozen) c.t += dt;
  const S = c.shots[c.i];
  if (c.t >= S.ms && !c.frozen) { if (c.i + 1 < c.shots.length) { cnShot(c.i + 1); requestAnimationFrame(cnFrame); return; } cnEnd(); return; }
  const t = c.t, u = t / S.ms;
  // 音效
  (S.sfx || []).forEach((x, j) => { if (!c.fired.has(j) && t >= x[0]) { c.fired.add(j); try { (CSFX[x[1]] || (() => {}))(); } catch (e) { /* 没声音就算了 */ } } });
  // 字幕：一个字 45ms 打出来
  if (c.sub && c.typed < c.sub.length) { const n = Math.min(c.sub.length, Math.floor(t / 45) + 1); if (n !== c.typed) { c.typed = n; c.root.querySelector('.cn-sub').textContent = c.sub.slice(0, n); } }
  // 世界层 → 取景框；屏幕层
  const wg = c.wg, sg = c.sg;
  wg.setTransform(1, 0, 0, 1, 0, 0); wg.globalAlpha = 1; wg.filter = 'none'; wg.fillStyle = '#000'; wg.fillRect(0, 0, 200, 120);
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, 200, 120);
  try { if (S.draw) S.draw(wg, t, u); if (S.over) S.over(sg, t, u); } catch (e) { cnEnd(); return; }
  wg.filter = 'none'; sg.filter = 'none';
  const G = c.G, k = c.k, Wl = G.Wl, Hl = G.Hl, g = c.g, Wd = c.cv.width, Hd = c.cv.height;
  const cam = S.cam ? S.cam(u) : { x: 100, y: 60, z: 1 }, z = Math.max(1, cam.z || 1);
  // 推近时上下多露出一截：取景框比 5:3 高
  const ext = Math.round(Math.min(G.ext, 60 * (z - 1)) * k) / k, dh = 120 + ext * 2, sw = 200 / z, sh = dh / z;
  const sx = cnClamp(cam.x - sw / 2, 0, 200 - sw), sy = cnClamp(cam.y - sh / 2, 0, 120 - sh), dy = G.py - ext, yb = dy + dh;
  let ox = 0, oy = 0;
  for (const [a, d, amp] of S.shake || []) if (t >= a && t < a + d) { const f = 1 - (t - a) / d; ox = Math.round((Math.random() - 0.5) * 2 * amp * f) * k; oy = Math.round((Math.random() - 0.5) * 2 * amp * f) * k; }
  if ((c.amN++ & 1) === 0 || c.frozen) cnAmbient(c);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.imageSmoothingEnabled = true; g.drawImage(c.am, 0, 0, Wd, Hd);
  const strip = (yL, hL, al) => { const q = c.am.height / Hl; g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.globalAlpha = Math.min(1, al); g.drawImage(c.am, 0, yL * q, c.am.width, hL * q, 0, Math.round(yL * k), Wd, Math.round(hL * k)); g.globalAlpha = 1; g.imageSmoothingEnabled = false; g.setTransform(k, 0, 0, k, ox, oy); };
  g.imageSmoothingEnabled = false; g.setTransform(k, 0, 0, k, ox, oy);
  g.drawImage(c.wc, sx, sy, sw, sh, G.x0, dy, 200, dh);
  if (G.tall) {
    const rh = Math.min(40, Hl - yb);
    if (rh > 4) { g.save(); g.beginPath(); g.rect(Math.max(0, G.x0), yb, Math.min(Wl, 200), rh); g.clip(); g.translate(0, 2 * yb); g.scale(1, -1); g.globalAlpha = 0.5; g.drawImage(c.wc, sx, sy, sw, sh, G.x0, dy, 200, dh); g.restore(); g.globalAlpha = 1; const n = 8; for (let i = 0; i < n; i++) strip(yb + rh * i / n, rh / n, 0.3 + 0.7 * (i + 1) / n); }
    for (let i = 0; i < 3; i++) strip(dy + i, 1, 0.75 - i * 0.25);
  }
  g.drawImage(c.sc, 0, 0, 200, 120, G.x0, G.py, 200, 120);
  const fd = S.fade || 180; if (t < fd) { const v = 1 - t / fd; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = v * v; g.fillStyle = '#000'; g.fillRect(0, 0, Wd, Hd); g.globalAlpha = 1; }
  requestAnimationFrame(cnFrame);
}
window.addEventListener('resize', () => { if (cn) cnSize(); });
document.addEventListener('keydown', e => { if (!cn) return; if (e.key === 'Escape') { e.preventDefault(); cnEnd(); } else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cnNext(); } });

// ---------- 触发：只播一次、在外排队 ----------
// playCine(id, o)：触发点用。看过了直接 resolve；在外（除了戒中剑意）进 st.cnQ 排队、直接 resolve；否则当场播，播完 resolve。
// 别的过场正在播时也进队。C1 的战斗画面：await playCine('ult', { mob })；首领首杀 playCine('boss', { k })。
// 当场播（不等回洞府）的：战斗画面里的戒中剑意，和玩家自己点开的突破 / 渡劫 / 飞升、寿尽、约战
const CN_NOW = { ult: 1, pojing: 1, leijie: 1, feisheng: 1, lunhui: 1, pact: 1 };
function playCine(id, o) {
  o = o || {};
  const al = CN_ALIAS[id], id0 = al ? al[0] : id, o0 = al ? Object.assign({}, al[1], o) : o;
  if (!CINE[id0]) return Promise.resolve(false);
  const key = cnKeyOf(id0, o0);
  if (cineSeen(key) || (st && st.cnQ && st.cnQ.some(x => x.key === key))) return Promise.resolve(false);
  if (st && (cn || (tripUI() && !CN_NOW[id0]))) { cineWant(id, o); return Promise.resolve(false); }
  return cinePlay(id, o);
}
// cineWant(id, o)：排队，等回洞府、弹窗空下来再播（processQueue 先放它）
function cineWant(id, o) {
  if (!st) return;
  o = o || {};
  const al = CN_ALIAS[id], id0 = al ? al[0] : id, o0 = al ? Object.assign({}, al[1], o) : o;
  if (!CINE[id0]) return;
  const key = cnKeyOf(id0, o0);
  if (cineSeen(key)) return;
  st.cnQ = st.cnQ || [];
  if (!st.cnQ.some(x => x.key === key)) st.cnQ.push({ id, o, key });
  if (st.cnQ.length > 6) st.cnQ.splice(0, st.cnQ.length - 6);
}
// 排着的放一段：人在洞府、没有弹窗 / 对决 / 开场 / 别的过场
function cnFlush() {
  if (!st || !st.cnQ || !st.cnQ.length || cn || cine || duelFx || tripUI() || !$('#modal').hidden || !$('#intro').hidden) return false;
  const x = st.cnQ.shift();
  if (cineSeen(x.key)) return cnFlush();
  cinePlay(x.id, x.o);
  if (!cn) return cnFlush();   // 快放或没播起来：接着放下一段，都放完了让原来的队列接着走
  return true;
}

// ---------- 开场：第 2 页换成退婚过场 ----------
// intro.js 翻到第 2 页时调：没看过就在开场框里播，播完（或跳过）调 next；看过了返回 false，照旧显示静态那一页
function introCine(box, next) {
  if (cnPrefGet().tuihun || cnFast()) return false;
  box.innerHTML = '';
  cnAfter(cinePlay('tuihun', {}, { intro: true }), next);
  return true;
}

// ---------- 回忆：【仙途 → 记录 → 回忆】 ----------
const CN_ORDER = ['tuihun', 'ult', 'pojing', 'pact', 'rzong', 'boss', 'rival', 'leijie', 'shoushan', 'feisheng', 'lunhui'];
function cnRecallArgs(id) {
  if (id === 'boss') { let k = 0; if (st) for (let i = 0; i < L.BOSSES.length; i++) if (st.meta.cine['boss:' + i]) k = i; return { k }; }
  if (id === 'rival') { const m = cnMeta() || {}; return { id: ['zhao', 'chu', 'xue'].find(r => m['rival:' + r]) || 'zhao' }; }
  if (id === 'pojing') return { r: 1 };
  if (id === 'pact') { const m = cnMeta() || {}; return { win: !m.pactLose }; }
  if (id === 'rzong') return { id: st && st.sect ? st.sect.id : undefined };
  return {};
}
const cnSeenCount = () => CN_ORDER.filter(id => cineSeen(id)).length;
// 回忆按段归组（原来四十多格挤在一页）：上面一排分组——修行（①～⑩）、少年（⑪～⑭）、师门（⑮～⑰）、真相（⑱～㉒）、天门（㉓～㉕）、结局（㉖～）；
// 同一段的几个版本（休书·念 / 收，了断四版……）并成一格，下面一排小签各看各的。
const CN_NUM = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟';
const CN_GROUPS = [['xiu', '修行', 1, 10], ['shao', '少年', 11, 14], ['shi', '师门', 15, 17], ['zhen', '真相', 18, 22], ['men', '天门', 23, 25], ['end', '结局', 26, 99]];
const cnNoOf = id => { const i = CN_NUM.indexOf((CINE[id] && CINE[id].no) || ''); return i < 0 ? 1 : i + 1; };
const cnGroupOf = id => (CINE[id] && CINE[id].grp) || (CN_GROUPS.find(g => cnNoOf(id) >= g[2] && cnNoOf(id) <= g[3]) || CN_GROUPS[0])[0];   // 段上写了 grp 的听它的（结契 ㉞ 归“师门”）
let cnRcGroup = 'xiu';
function showCineRecall(grp) {
  if (!st) return;
  if (!navCur) navCur = 'path';
  if (grp && CN_GROUPS.some(g => g[0] === grp)) cnRcGroup = grp;
  const tw = pxFit(200, 132), th = tw * 0.6;
  const by = {}; for (const id of CN_ORDER) (by[cnGroupOf(id)] || (by[cnGroupOf(id)] = [])).push(id);
  const chips = CN_GROUPS.filter(g => by[g[0]]).map(g => { const ids = by[g[0]], on = ids.filter(id => cineSeen(id)).length; return `<button class="cn-grp${g[0] === cnRcGroup ? ' on' : ''}" data-cng="${g[0]}"><b>${g[1]}</b><span class="num">${on}/${ids.length}</span></button>`; }).join('');
  // 这一组里按段号并格：old 十段各自一格（⑩ 飞升 / 轮回是两格）；数据式分镜同号的并成一格
  const segs = []; for (const id of by[cnRcGroup] || []) { const no = CINE[id].no, last = segs[segs.length - 1]; if (cnRcGroup !== 'xiu' && last && last.no === no) last.ids.push(id); else segs.push({ no, ids: [id] }); }
  const verName = (id, base) => { const n = CINE[id].n; const m = /[·]\s*(.+)$/.exec(n); return m && n.replace(/[·].*$/, '').replace(/^结局$/, '') === base ? m[1] : n.replace(/^结局·/, ''); };
  const tiles = segs.map(sg => {
    const seen = sg.ids.filter(id => cineSeen(id)), on = seen.length > 0, id = seen[0] || sg.ids[0], C = CINE[id], multi = sg.ids.length > 1;
    const base = multi ? C.n.replace(/^结局·/, '').replace(/[·].*$/, '') : C.n.replace(/^结局·/, '');
    let src = ''; if (on) { try { src = urlOf(C.thumb(), 'cnth|' + id); } catch (e) { src = ''; } }
    const main = `<button class="cn-tile${on ? '' : ' off'}" data-cn="${id}" ${on ? '' : 'disabled'} aria-label="${on ? '重看' : '没看过'}：${C.n}">
      <span class="cn-th" style="width:${tw}px;height:${th}px">${on && src ? `<img class="px" src="${src}" style="width:${tw}px;height:${th}px" alt="">` : '<i>？</i>'}</span>
      <span class="cn-nm">${C.no} ${on ? (multi ? base : C.n.replace(/^结局·/, '')) : '？？？'}${multi ? ` <small>${seen.length}/${sg.ids.length}</small>` : ''}</span></button>`;
    const vers = multi ? `<div class="cn-vers">${sg.ids.map(v => { const o = cineSeen(v); return `<button class="cn-ver${o ? '' : ' off'}" data-cn="${v}" ${o ? '' : 'disabled'} aria-label="${o ? '重看' : '没看过'}：${CINE[v].n}">${o ? esc(verName(v, base)) : '？'}</button>`; }).join('')}</div>` : '';
    return `<div class="cn-seg">${main}${vers}</div>`;
  }).join('');
  const s = sheet({ title: shellTitle('path'), still: !!grp && !!document.querySelector('#modal .cn-rc'), body: meTabs('rec') + `<div class="ksec"><span>回忆 ${cnSeenCount()} / ${CN_ORDER.length}</span><button id="cnBack">回记录 ▸</button></div><div class="cn-grps">${chips}</div><div class="cn-rc">${tiles}</div>` });
  const b = s.querySelector('#cnBack'); if (b) b.onclick = () => { SFX.tap(); showRecord(); };
  s.querySelectorAll('[data-cng]').forEach(el => { el.onclick = () => { SFX.tab ? SFX.tab() : SFX.tap(); showCineRecall(el.dataset.cng); }; });
  s.querySelectorAll('[data-cn]').forEach(el => { if (!el.disabled) el.onclick = () => { SFX.tap(); const id = el.dataset.cn; cinePlay(id, cnRecallArgs(id), { recall: true, force: true }); }; });
}

// ---------- 接线（包一层，不改原流程） ----------
// 过场之后接原流程：真在播就等播完；没播（看过了、快放、进了队）就当场同步接上——
// 不能等微任务：同一帧里后面的 chapPump / onbPump 会趁弹窗还空着先弹章末卡，紧接着被原流程的结果卡顶掉（章末卡就丢了）
function cnAfter(p, fn) { if (cn) p.then(fn); else fn(); }
// 停表的哨兵：场景照常画洞府，不画旧过场
{ const dc0 = drawCine; drawCine = function (dt) { if (cine && cine.cn) return; return dc0.apply(this, arguments); }; }
{ const dt0 = drawCineTarget; drawCineTarget = function () { if (cine && cine.cn) { drawMeHome(HOMEPOS.x, HOMEPOS.y); return; } return dt0.apply(this, arguments); }; }
// 弹窗队列：过场在播就等；排着的过场先放
{ const pq0 = processQueue; processQueue = function () { if (cn || (cine && cine.cn)) return; if (cnFlush()) return; return pq0.apply(this, arguments); }; }
// 章末卡、解锁卡：过场在播或排着（人在洞府）时等
if (typeof chapPump === 'function') { const cp0 = chapPump; chapPump = function () { if (cnHold()) { if (!cn) cnFlush(); return; } return cp0.apply(this, arguments); }; }
if (typeof onbPump === 'function') { const op0 = onbPump; onbPump = function () { if (cnHold()) return; return op0.apply(this, arguments); }; }
// ③ 破境 / ⑧ 金丹雷劫：结果卡之前
{ const ab0 = afterBreakthrough; afterBreakthrough = function (res) {
  if (!st || !res || !res.ok || res.ascend || res.to > L.MAXR) return ab0.apply(this, arguments);
  const to = res.to;
  const p = to === 2 && res.tb ? playCine('leijie', {}) : to === 1 ? playCine('pojing', { r: 1 }) : playCine('pojing', { r: to, short: true });
  cnAfter(p, () => ab0(res));
}; }
// ⑩ 飞升 / 轮回
{ const sa0 = showAscension; showAscension = function () { const a = arguments; cnAfter(playCine('feisheng', {}), () => sa0.apply(this, a)); }; }
{ const sd0 = showDeath; showDeath = function () { const a = arguments; cnAfter(playCine('lunhui', {}), () => sd0.apply(this, a)); }; }
// ④ 三年之约：只有弃徒出身（换了出身的约战是别人，不播）
const cnPactOrig = () => !(L.pactText && L.pactText(st));
{ const rp0 = runPact; runPact = function () { const a = arguments; if (!st || !cnPactOrig()) return rp0.apply(this, a); cnAfter(playCine('pact0', {}), () => rp0.apply(this, a)); }; }
{ const pd0 = L.pactDuel; L.pactDuel = function (s) { const r = pd0.apply(this, arguments); if (s === st && r && cnPactOrig()) { if (!r.win) cnMeta().pactLose = 1; else delete cnMeta().pactLose; cineWant('pact1', { win: !!r.win }); } return r; }; }
// ⑤ 入宗
{ const js0 = L.joinSect; L.joinSect = function (s, id) { const r = js0.apply(this, arguments); if (s === st && r) cineWant('rzong', { id }); return r; }; }
// ⑥ 斩首领（旧的首领对决；C1 的引擎首杀时自己调 playCine('boss', { k })）
{ const fb0 = L.fightBoss; L.fightBoss = function (s, k) { const r = fb0.apply(this, arguments); if (s === st && r && r.win && !r.again) cineWant('boss', { k }); return r; }; }
// 首领首杀之后的结果卡（C1 的回合战首领 bossResultUI，牌翻在卡上）与单独一张翻牌（showLootFlip）：排着的首领过场插在它们之前播
const cnBossFirst = fn => function () {
  const a = arguments, i = st && st.cnQ && !cn && !tripUI() ? st.cnQ.findIndex(x => x.id === 'boss') : -1;
  if (i < 0) return fn.apply(this, a);
  const x = st.cnQ.splice(i, 1)[0];
  cnAfter(cinePlay(x.id, x.o), () => fn.apply(this, a));
};
if (typeof bossResultUI === 'function') bossResultUI = cnBossFirst(bossResultUI);
if (typeof showLootFlip === 'function') showLootFlip = cnBossFirst(showLootFlip);
// ⑨ 守山
{ const sw0 = L.sectWar; L.sectWar = function (s) { const r = sw0.apply(this, arguments); if (s === st && r && r.win) cineWant('shoushan', {}); return r; }; }
// ⑦ 宿敌对视：第一次与赵乾 / 楚天阔 / 血无涯对决之前
{ const du0 = duel; duel = function (o) {
  const a = arguments, nm = o && o.right && o.right.name;
  const id = st && nm ? ['zhao', 'chu', 'xue'].find(r => L.rivalName(st, r) === nm) : null;
  if (!id || cineSeen('rival:' + id) || tripUI()) return du0.apply(this, a);
  cnAfter(cinePlay('rival', { id }), () => du0.apply(this, a));
}; }
// 【仙途 → 记录】加一行“回忆”
{ const sr0 = showRecord; showRecord = function () {
  sr0.apply(this, arguments);
  const s = document.querySelector('#modal .sheet .body'); if (!s || s.querySelector('#kCine')) return;
  const row = document.createElement('div'); row.className = 'kslot';
  row.innerHTML = `<div class="cell">${artIcon('codex', 32)}</div><div class="mid"><div class="nm">回忆</div><small>过场 ${cnSeenCount()} / ${CN_ORDER.length}</small></div><button class="kb alt" id="kCine">看</button>`;
  const at = s.querySelector('.ksec'); if (at) s.insertBefore(row, at); else s.appendChild(row);
  row.querySelector('#kCine').onclick = () => { SFX.tap(); showCineRecall(); };
}; }
// 测试与截图用
window.__xm_cine = { fast: undefined, CINE, ORDER: CN_ORDER, play: cinePlay, playCine, want: cineWant, seen: cineSeen, recall: showCineRecall, flush: cnFlush,
  get on() { return cn ? { id: cn.id, key: cn.key, i: cn.i, n: cn.shots.length, t: Math.round(cn.t), ms: cn.shots.reduce((s, x) => s + x.ms, 0) } : null; },
  get queue() { return st && st.cnQ ? st.cnQ.map(x => x.key) : []; },
  seek(i, t) { if (!cn) return false; cnShot(Math.min(i, cn.shots.length - 1)); cn.t = t || 0; cn.frozen = true; const s = cn.sub; if (s) { cn.typed = s.length; cn.root.querySelector('.cn-sub').textContent = s; } return true; },
  resume() { if (cn) cn.frozen = false; }, next: cnNext, skip: () => cnEnd() };
