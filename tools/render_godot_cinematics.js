// Render the authored Canvas storyboards offline into videos the Godot player can decode.
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const output = path.join(root, 'godot/cinematics');
const encoder = process.env.FFMPEG_BIN || 'ffmpeg';
const fps = 15;
const width = 200;
const height = 120;
const music = {
  tuihun: 'sorrow', ult: 'vow', pojing: 'trib', pact: 'vow', rzong: 'town',
  boss: 'vow', rival: 'boss', leijie: 'trib', shoushan: 'vow', feisheng: 'ascend', lunhui: 'sorrow',
};

async function encode(page, id, frames) {
  const target = path.join(output, id + '.ogv');
  const temporary = path.join(output, id + '.tmp.ogv');
  const child = spawn(encoder, [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-vcodec', 'png', '-framerate', String(fps),
    '-i', 'pipe:0', '-an', '-c:v', 'libtheora', '-pix_fmt', 'yuv420p', '-q:v', '6', temporary,
  ], { stdio: ['pipe', 'ignore', 'inherit'] });
  const exited = once(child, 'exit');
  exited.catch(() => {});
  child.stdin.on('error', () => {});
  try {
    for (let offset = 0; offset < frames; offset += fps * 3) {
      const batch = await page.evaluate(([start, end]) => window.captureFrames(start, end), [offset, Math.min(frames, offset + fps * 3)]);
      const chunk = Buffer.concat(batch.map(frame => Buffer.from(frame, 'base64')));
      await new Promise((resolve, reject) => child.stdin.write(chunk, error => error ? reject(error) : resolve()));
    }
    child.stdin.end();
    const [code] = await exited;
    if (code !== 0) throw new Error(encoder + ' returned ' + code + ' for ' + id);
    fs.renameSync(temporary, target);
  } catch (error) {
    child.stdin.destroy();
    child.kill();
    await exited.catch(() => {});
    fs.rmSync(temporary, { force: true });
    throw error;
  }
}

async function run() {
  const filter = process.argv[2] ? new RegExp(process.argv[2]) : null;
  const catalogPath = path.join(output, 'catalog.json');
  const catalog = filter && fs.existsSync(catalogPath) ? JSON.parse(fs.readFileSync(catalogPath, 'utf8')) : {};
  const source = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const anchor = 'window.__xm_cine = {';
  if (!source.includes(anchor)) throw new Error('Build dist/index.html with tools/build.py first.');
  const reference = source.replace(anchor, anchor + `
    prepareOffline(state) {
      st = state;
      const canvas = cnCv(200, 172), backdrop = canvas.getContext('2d');
      ART.setCtx(backdrop, 200);
      try {
        for (let i = 0; i < 6; i++) ART.drawHome(st, 1200, 0, [], { phase: 0.45 });
        const player = ART.sit(st.p.look, Math.min(st.p.r, 9));
        backdrop.drawImage(player, 100 - (player.width >> 1), 136 - player.height);
        cnSnap = cnCv(200, 120);
        cnSnap.getContext('2d').drawImage(canvas, 0, 28, 200, 120, 0, 0, 200, 120);
      } finally { ART.setCtx(ctx, W); }
    },
  `);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const url = 'http://xianmen-build.invalid/?hd=0';
    await page.route('**/*', route => route.request().url() === url
      ? route.fulfill({ contentType: 'text/html', body: reference }) : route.abort());
    await page.goto(url);
    const jobs = await page.evaluate(async ([fps, width, height, music]) => {
      await document.fonts.load('14px XPixel');
      await document.fonts.ready;
      const { L } = window.__xm;
      const { CINE, ORDER } = window.__xm_cine;
      const descriptions = window.__xm_talk.DATA;
      const variants = {
        pojing: Array.from({ length: 8 }, (_, i) => ({ suffix: String(i + 1), realm: i + 1, options: { r: i + 1, short: i > 0 } })),
        pact: [
          { suffix: 'arrival', options: { part: 0 } },
          { suffix: 'win', options: { part: 1, win: true } },
          { suffix: 'loss', options: { part: 1, win: false } },
        ],
        rzong: L.SECTS.map(sect => ({ suffix: sect.id, sect: sect.id, options: { id: sect.id } })),
        boss: L.BOSSES.map((_, k) => ({ suffix: String(k), options: { k }, realm: Math.min(8, k + 1) })),
        rival: ['zhao', 'chu', 'xue'].map((id, i) => ({ suffix: id, options: { id }, realm: 2 + i * 2 })),
        shoushan: L.SECTS.map(sect => ({ suffix: sect.id, sect: sect.id, realm: 5 })),
        liaoduan_spared: [{}, { suffix: 'letgo', flags: { vow_letgo: 1 } }],
        fangke: [{}, { suffix: 'visitor', daolv: 'su' }],
        end_wentian: [{}, { suffix: 'elder', flags: { elder_kept: 1 } }, { suffix: 'yun', flags: { yun_codex: 1 } },
          { suffix: 'both', flags: { yun_codex: 1, elder_kept: 1 } }],
        end_dixian: [{}, { suffix: 'su', daolv: 'su' }, { suffix: 'ye', daolv: 'ye' }, { suffix: 'elder', flags: { elder_kept: 1 } }],
        end_mozun: [{}, { suffix: 'ye', daolv: 'ye' }],
        end_summit: L.SECTS.map(sect => ({ suffix: sect.id, sect: sect.id })),
      };
      const backgrounds = Array.from({ length: 2 }, () => {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext('2d', { alpha: false });
        context.imageSmoothingEnabled = false;
        return context;
      });
      const [world, frame] = backgrounds;
      // The overlaid layer needs alpha, unlike the main video frame.
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = width; overlayCanvas.height = height;
      const overlay = overlayCanvas.getContext('2d');
      overlay.imageSmoothingEnabled = false;
      let timeline = [];
      function reset(context) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.filter = 'none';
        context.globalCompositeOperation = 'source-over';
      }

      window.prepareCapture = job => {
        const { id, options, daolv, flags, realm, sect } = job;
        const state = L.newState();
        state.p.r = realm ?? (id.startsWith('end_') || ['tianmen', 'feisheng', 'fangke'].includes(id) ? 9 : 0);
        if (sect) state.sect = { id: sect };
        state.daolv = daolv || null;
        Object.assign(state.eflags, flags);
        window.__xm_cine.prepareOffline(state);
        let cursor = 0;
        const subtitles = [], cues = [];
        timeline = CINE[id].shots(options || {}).map(shot => {
          const start = cursor;
          cursor += Math.ceil(shot.ms * fps / 1000);
          const at = start / fps;
          if (shot.sub) subtitles.push([at, cursor / fps, shot.sub]);
          for (const [ms, name] of shot.sfx || []) cues.push([at + ms / 1000, name]);
          return { shot, start, end: cursor };
        });
        if (!cursor) throw new Error('No frames for ' + id);
        cues.sort((left, right) => left[0] - right[0]);
        return { frames: cursor, seconds: cursor / fps, subtitles, cues, music: descriptions[id]?.bgm || music[id] || 'vow' };
      };

      window.captureFrames = (start, end) => {
        const result = [];
        for (let index = start; index < end; index++) {
          const { shot, start: first } = timeline.find(cut => index < cut.end);
          const time = (index - first) * 1000 / fps;
          const phase = time / shot.ms;
          reset(world); reset(overlay); reset(frame);
          world.fillStyle = '#000';
          world.fillRect(0, 0, width, height);
          overlay.clearRect(0, 0, width, height);
          if (shot.draw) shot.draw(world, time, phase);
          if (shot.over) shot.over(overlay, time, phase);
          const camera = shot.cam ? shot.cam(phase) : { x: 100, y: 60, z: 1 };
          const zoom = Math.max(1, camera.z || 1);
          const w = width / zoom, h = height / zoom;
          const x = Math.min(width - w, Math.max(0, camera.x - w / 2));
          const y = Math.min(height - h, Math.max(0, camera.y - h / 2));
          let dx = 0, dy = 0;
          for (const [at, duration, amplitude] of shot.shake || []) {
            if (time >= at && time < at + duration) {
              const strength = amplitude * (1 - (time - at) / duration);
              dx = Math.round(Math.sin(index * 2.9) * strength);
              dy = Math.round(Math.cos(index * 3.7) * strength);
            }
          }
          frame.fillStyle = '#000';
          frame.fillRect(0, 0, width, height);
          frame.drawImage(world.canvas, x, y, w, h, dx, dy, width, height);
          frame.drawImage(overlayCanvas, dx, dy);
          const fade = shot.fade || 180;
          if (time < fade) {
            frame.globalAlpha = (1 - time / fade) ** 2;
            frame.fillRect(0, 0, width, height);
          }
          result.push(frame.canvas.toDataURL('image/png').split(',')[1]);
        }
        return result;
      };
      return ORDER.flatMap(id => (variants[id] || [{}]).map(variant => ({
        id, asset: id + (variant.suffix ? '-' + variant.suffix : ''),
        title: CINE[id].n, no: CINE[id].no, ...variant,
      })));
    }, [fps, width, height, music]);

    fs.mkdirSync(output, { recursive: true });
    for (const job of jobs.filter(job => !filter || filter.test(job.asset))) {
      const info = await page.evaluate(job => window.prepareCapture(job), job);
      await encode(page, job.asset, info.frames);
      catalog[job.asset] = { id: job.id, title: job.title, no: job.no, ...info };
      console.log(job.asset + '  ' + info.seconds.toFixed(1) + 's');
    }
    fs.writeFileSync(catalogPath, JSON.stringify(catalog) + '\n');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
