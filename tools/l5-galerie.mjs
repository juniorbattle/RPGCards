// M07 L5 — généralisation : galerie « actuelle (V1) contre vectoriel V2 » des quatre rivaux, à l’échelle 1:1 du jeu,
// sur le build courant :
//   - par rival, une planche : six humeurs (humeur de repos du rival, prudence, surprise, touché·e, colère, triomphe ;
//     pose QA imposée, intensité 1 ; visage, scène 3D seule, 1280×720), affiche de rencontre (duel libre) et vue A du
//     duel complète (HUD compris) sous l’éclairage HD-2D ;
//   - l’écran Rencontres complet, V1 puis V2 (toutes les rencontres ouvertes par l’outil : progression posée dans la
//     sauvegarde de test) ;
//   - une vidéo des réactions (repos → surprise avec recul → prudence → repos), V1 en haut, V2 en bas, quatre rivaux.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/l5-galerie.mjs [sortie=screenshots/qa/m07/l5-rivaux]
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m07/l5-rivaux';
mkdirSync(OUT, { recursive: true });
const head = execSync('git rev-parse --short HEAD').toString().trim();
const commit = execSync('git status --porcelain src').toString().trim() ? `${head}+arbre de travail` : head;
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4196);
const browser = await launch();
const FIG = { v1: '', v2: '&figure=v2' };
const LABEL = { v1: 'Actuelle (V1)', v2: 'Vectoriel V2' };
const RIVALS = [
  { id: 'braise', name: 'Kaï, la Braise du quai', rest: ['confident', 'sûr de lui'] },
  { id: 'ronce', name: 'Maëlle, gardienne des Ronces', rest: ['neutral', 'repos'] },
  { id: 'voile', name: 'Sélène, liseuse du Voile', rest: ['smug', 'narquoise'] },
  { id: 'astre', name: 'Orin, l’arpenteur des Astres', rest: ['thinking', 'pensif'] },
];
const MOODS = [['focused', 'prudence'], ['surprised', 'surprise'], ['pained', 'touché·e'], ['angry', 'colère'], ['triumphant', 'triomphe']];
const issues = [];
const manifest = { commit, date: new Date().toISOString(), renderer: null, files: [], issues };
let renderer = null;
const png = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
function save(name, buf, desc) {
  writeFileSync(`${OUT}/${name}`, buf);
  manifest.files.push({ file: `${OUT}/${name}`, desc });
}
async function page(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  return { ctx, p };
}
const hideDom = (p) => p.evaluate(() => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = 'hidden'; } });
const duel = (id) => `seed=202&autostart=1&rival=${id}&qa=1&aiDelay=0&intro=1&view=A`;

const shots = {};
try {
  for (const r of RIVALS) {
    shots[r.id] = { v1: { moods: [], frames: [] }, v2: { moods: [], frames: [] } };
    for (const fig of ['v1', 'v2']) {
      const { ctx, p } = await page([1280, 720]);
      for (const [mood, label] of [r.rest, ...MOODS]) {
        await p.goto(`${server.base}/?${duel(r.id)}&reducedMotion=1&freeze=1&pose=${mood}${FIG[fig]}`);
        await p.waitForFunction(() => !!window.__lqv);
        renderer ??= await webglRenderer(p);
        await p.waitForTimeout(600);
        await hideDom(p);
        await p.waitForTimeout(120);
        shots[r.id][fig].moods.push({ label, src: png(await p.screenshot({ clip: { x: 540, y: 10, width: 200, height: 258 } })) });
      }
      await p.goto(`${server.base}/?${duel(r.id)}&reducedMotion=1&freeze=1${FIG[fig]}`);
      await p.waitForFunction(() => !!window.__lqv);
      await p.waitForTimeout(800);
      shots[r.id][fig].vueA = png(await p.screenshot());
      // Réaction : rendu continu, enregistrée depuis le canvas (prise de chauffe jetée, tranches de 250 ms).
      await p.goto(`${server.base}/?${duel(r.id)}&reducedMotion=0${FIG[fig]}`);
      await p.waitForFunction(() => !!window.__lqv);
      await p.waitForTimeout(2500);
      const rec = await p.evaluate(async () => {
        const arena = window.__lqv.controller.arena;
        const src = document.querySelector('canvas.arena-canvas');
        const R = { x: 470, y: 0, w: 340, h: 340 };
        const k = src.width / 1280;
        const c = document.createElement('canvas');
        c.width = R.w; c.height = R.h;
        const g = c.getContext('2d');
        let run = true;
        const copy = () => { g.drawImage(src, R.x * k, R.y * k, R.w * k, R.h * k, 0, 0, R.w, R.h); if (run) requestAnimationFrame(copy); };
        copy();
        const stream = c.captureStream(60);
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const take = async (script) => {
          const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 6e6 });
          const chunks = [];
          mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          const done = new Promise((r) => { mr.onstop = r; });
          mr.start(250);
          await script();
          mr.stop();
          await done;
          return new Blob(chunks, { type: 'video/webm' });
        };
        await take(() => wait(600));
        const ex = (mood, gesture = null) => arena.expression({ mood, intensity: 1, gaze: 'player', gesture, hold: 0, cause: 'réaction de revue (QA L5)' });
        let frames = [];
        const scene = async () => {
          frames = [];
          const grab = (label) => frames.push({ label, src: c.toDataURL('image/png') });
          ex('neutral');
          await wait(500); grab('repos');
          ex('surprised', 'recoil');
          await wait(500); grab('surprise');
          await wait(900);
          ex('focused');
          await wait(700); grab('prudence');
          await wait(700);
          ex('neutral');
          await wait(1200);
        };
        ex('neutral');
        await wait(1200);
        let blob = await take(scene);
        if (blob.size < 60000) { ex('neutral'); await wait(1200); blob = await take(scene); }
        run = false;
        const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
        return { b64, frames, bytes: blob.size };
      });
      if (rec.bytes < 60000) issues.push(`vidéo ${r.id} ${fig} vide (${rec.bytes} octets)`);
      writeFileSync(`${OUT}/.reaction-${r.id}-${fig}.webm`, Buffer.from(rec.b64, 'base64'));
      shots[r.id][fig].frames = rec.frames;
      await ctx.close();
    }
  }
  // Écran Rencontres, toutes les rencontres ouvertes ; affiches des duels libres.
  for (const fig of ['v1', 'v2']) {
    const { ctx, p } = await page([1280, 720]);
    await p.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5${FIG[fig]}`);
    await p.click('[data-key="home-new"]');
    await p.fill('[data-key="new-name"]', 'Capture');
    await p.click('[data-key="new-sig-Ronce"]');
    await p.click('[data-key="new-create"]');
    await p.waitForSelector('[data-screen="board"]');
    await p.evaluate(() => { const sh = window.__lqvShell; const pr = sh.save.progress; pr.series.step = 2; pr.series.completed = Math.max(1, pr.series.completed ?? 0); for (const id of ['braise', 'ronce', 'voile', 'astre']) if (!pr.met.includes(id)) pr.met.push(id); sh.persist(); sh.render(); });
    await p.waitForSelector('[data-encounter="libre-astre"].st-open');
    await p.waitForTimeout(600);
    save(`rencontres-${fig}-1280.png`, await p.screenshot({ fullPage: true }), `${LABEL[fig]} — écran Rencontres, 1280×720 (page entière), rencontres ouvertes par l’outil`);
    for (const r of RIVALS) shots[r.id][fig].affiche = png(await p.locator(`[data-encounter="libre-${r.id}"]`).screenshot());
    await ctx.close();
  }
  // Vidéo des réactions : V1 en haut, V2 en bas, quatre rivaux.
  {
    const { ctx, p } = await page([1400, 760]);
    await p.goto(`${server.base}/?gallery=1`);
    const vids = RIVALS.flatMap((r) => ['v1', 'v2'].map((f) => readFileSync(`${OUT}/.reaction-${r.id}-${f}.webm`).toString('base64')));
    const both = await p.evaluate(async ({ vids, names }) => {
      const within = (pr, ms, what) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error(`délai dépassé : ${what}`)), ms))]);
      document.body.innerHTML = '';
      const vs = vids.map((b64) => { const v = document.createElement('video'); v.src = `data:video/webm;base64,${b64}`; v.muted = true; v.playsInline = true; return v; });
      await within(Promise.all(vs.map((v) => new Promise((r) => { v.onloadeddata = r; }))), 30000, 'chargement');
      const c = document.createElement('canvas');
      c.width = 1384; c.height = 744;
      const g = c.getContext('2d');
      let run = true;
      const draw = () => {
        g.fillStyle = '#100c12'; g.fillRect(0, 0, c.width, c.height);
        g.fillStyle = '#f3e6c8'; g.font = '600 15px Georgia, serif';
        names.forEach((n, i) => g.fillText(n, 8 + i * 344, 20));
        g.fillText('V1', 4, 200); g.fillText('V2', 4, 544);
        vs.forEach((v, i) => { const col = Math.floor(i / 2); const row = i % 2; g.drawImage(v, 30 + col * 344, 30 + row * 356, 340, 340); });
        if (run) requestAnimationFrame(draw);
      };
      draw();
      const mr = new MediaRecorder(c.captureStream(60), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 10e6 });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise((r) => { mr.onstop = r; });
      mr.start(250);
      await Promise.all(vs.map((v) => v.play()));
      await within(Promise.all(vs.map((v) => new Promise((r) => { v.onended = r; }))), 30000, 'lecture');
      mr.stop();
      await done;
      run = false;
      const blob = new Blob(chunks, { type: 'video/webm' });
      return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    }, { vids, names: RIVALS.map((r) => r.name.split(',')[0]) }).catch((e) => { issues.push(`composition : ${e.message}`); return null; });
    if (both) save('reaction-quatre-rivaux.webm', Buffer.from(both, 'base64'), 'Réactions des quatre rivaux, V1 en haut, V2 en bas (même script)');
    await ctx.close();
  }
  // Planches par rival.
  manifest.renderer = rendererLabel(renderer);
  const { ctx, p } = await page([2700, 1000]);
  for (const r of RIVALS) {
    const s = shots[r.id];
    const row = (fig, items) => `<div style="display:flex;gap:8px;align-items:flex-start;margin:4px 0 10px"><div style="width:110px;font:600 15px Georgia,serif;color:${fig === 'v2' ? '#c8f08a' : '#e6c99a'}">${LABEL[fig]}</div>${items.map(([src, cap]) => `<figure style="margin:0"><img src="${src}" style="display:block;border:1px solid #3a3040"><figcaption style="color:#b9ad98;font-size:12px;margin-top:3px">${cap}</figcaption></figure>`).join('')}</div>`;
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:16px 20px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">${r.name} — actuelle contre vectoriel V2</h1>
<p style="margin:0 0 10px;color:#b9ad98">Build ${commit}, seed 202, graine d’art 7 — ${manifest.renderer}. Images à l’échelle 1:1 du jeu (1280×720). Humeurs imposées par le paramètre QA <code>pose=</code> (intensité 1) ; en jeu, elles ne suivent que des faits publics.</p>
<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:12px 0 2px">Six humeurs et affiche de rencontre (réactions : reaction-quatre-rivaux.webm)</h2>
${['v1', 'v2'].map((f) => row(f, [...s[f].moods.map((m) => [m.src, m.label]), [s[f].affiche, 'affiche (duel libre)']])).join('')}
<h2 style="font:600 17px Georgia,serif;color:#f0d08c;margin:12px 0 2px">Vue A du duel, éclairage HD-2D</h2>
<div style="display:flex;gap:14px">${['v1', 'v2'].map((f) => row(f, [[s[f].vueA, '']])).join('')}</div></body>`;
    await p.setContent(html);
    await p.waitForTimeout(300);
    save(`planche-${r.id}.png`, await p.screenshot({ fullPage: true }), `Planche ${r.name} : six humeurs, affiche et vue A, V1 contre V2`);
  }
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
  for (const r of RIVALS) for (const f of ['v1', 'v2']) rmSync(`${OUT}/.reaction-${r.id}-${f}.webm`, { force: true });
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ renderer: manifest.renderer, files: manifest.files.length, issues }, null, 2));
