// M07 L5 — porte de validation : planche comparative « actuelle (V1) contre vectoriel V2 » de Maëlle, aux dimensions
// réelles du jeu (crops 1:1), sur le build courant :
//   - six humeurs (pose QA imposée, intensité 1) : visage, scène 3D seule, à 1280×720 et 1920×1080 ;
//   - vue A du duel complète (HUD compris), éclairage HD-2D, 1280×720 et 1920×1080, expression de repos ;
//   - affiche de rencontre (écran Rencontres, manche 2 ouverte par l’outil : progression posée dans la sauvegarde) ;
//   - réaction animée (repos → surprise avec recul → prudence → repos), enregistrée depuis le canvas de l’arène
//     (MediaRecorder, WebM VP9, 1:1), images clés gardées pour la planche, puis vidéo côte à côte des deux versions ;
//   - coût de génération des couches (`__lqvFigureCost`, médiane de 15 essais) et moteur de rendu réellement utilisé.
// Usage : npm run build && LQV_GPU=1 CHROMIUM_PATH=<Chrome> node tools/l5-planche.mjs [sortie=screenshots/qa/m07/l5]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const OUT = process.argv[2] ?? 'screenshots/qa/m07/l5';
mkdirSync(OUT, { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const dirty = execSync('git status --porcelain src').toString().trim() !== '';
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4196);
const browser = await launch();
const FIG = { v1: '', v2: '&figure=v2' };
const LABEL = { v1: 'Actuelle (V1)', v2: 'Vectoriel V2' };
const MOODS = [['neutral', 'repos'], ['focused', 'prudence'], ['surprised', 'surprise'], ['pained', 'touchée'], ['angry', 'colère'], ['triumphant', 'triomphe']];
const SIZES = [[1280, 720], [1920, 1080]];
const issues = [];
const manifest = { commit: dirty ? `${commit}+arbre de travail` : commit, date: new Date().toISOString(), renderer: null, files: [], cost: null, issues };
let renderer = null;

const DUEL = 'seed=202&autostart=1&rival=ronce&qa=1&aiDelay=0&intro=1&view=A';

async function page(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.setDefaultTimeout(30000);
  watchConsole(p, issues);
  return { ctx, p };
}
const hideDom = (p, hidden) => p.evaluate((h) => { for (const id of ['app', 'shell', 'stage']) { const el = document.getElementById(id); if (el) el.style.visibility = h ? 'hidden' : ''; } }, hidden);
const png = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
function save(name, buf, desc) {
  const file = `${OUT}/${name}`;
  writeFileSync(file, buf);
  manifest.files.push({ file, desc });
  return buf;
}

const shots = { v1: { moods: {}, vueA: {}, affiche: {}, frames: [] }, v2: { moods: {}, vueA: {}, affiche: {}, frames: [] } };

try {
  for (const fig of ['v1', 'v2']) {
    for (const vp of SIZES) {
      const k = vp[0] / 1280;
      const { ctx, p } = await page(vp);
      // Six humeurs : visage seul (scène 3D, calques DOM masqués), recadré à l’échelle 1:1.
      shots[fig].moods[vp[0]] = {};
      for (const [mood] of MOODS) {
        await p.goto(`${server.base}/?${DUEL}&reducedMotion=1&freeze=1&pose=${mood}${FIG[fig]}`);
        await p.waitForFunction(() => !!window.__lqv);
        renderer ??= await webglRenderer(p);
        await p.waitForTimeout(600);
        await hideDom(p, true);
        await p.waitForTimeout(120);
        const buf = await p.screenshot({ clip: { x: Math.round(540 * k), y: Math.round(28 * k), width: Math.round(200 * k), height: Math.round(240 * k) } });
        shots[fig].moods[vp[0]][mood] = png(save(`${fig}-humeur-${mood}-${vp[0]}.png`, buf, `${LABEL[fig]} — humeur ${mood}, ${vp[0]}×${vp[1]}, visage 1:1 (scène seule)`));
      }
      // Vue A du duel, HUD compris, expression de repos.
      await p.goto(`${server.base}/?${DUEL}&reducedMotion=1&freeze=1${FIG[fig]}`);
      await p.waitForFunction(() => !!window.__lqv);
      await p.waitForTimeout(800);
      shots[fig].vueA[vp[0]] = png(save(`${fig}-vueA-${vp[0]}.png`, await p.screenshot(), `${LABEL[fig]} — vue A du duel, ${vp[0]}×${vp[1]}, HUD compris`));
      // Affiche de rencontre : profil neuf, puis manche 2 (Maëlle) ouverte par l’outil.
      await p.goto(`${server.base}/?qa=1&aiDelay=0&reducedMotion=1&freeze=1&profileSeed=5${FIG[fig]}`);
      await p.click('[data-key="home-new"]');
      await p.fill('[data-key="new-name"]', 'Capture');
      await p.click('[data-key="new-sig-Ronce"]');
      await p.click('[data-key="new-create"]');
      await p.waitForSelector('[data-screen="board"]');
      await p.evaluate(() => { const sh = window.__lqvShell; sh.save.progress.series.step = 1; if (!sh.save.progress.met.includes('ronce')) sh.save.progress.met.push('ronce'); sh.persist(); sh.render(); });
      await p.waitForSelector('[data-encounter="quai-2"].st-open');
      await p.waitForTimeout(500);
      const aff = p.locator('[data-encounter="quai-2"]');
      shots[fig].affiche[vp[0]] = png(save(`${fig}-affiche-${vp[0]}.png`, await aff.screenshot(), `${LABEL[fig]} — affiche de rencontre (manche 2), ${vp[0]}×${vp[1]}`));
      if (vp[0] === 1280) save(`${fig}-rencontres-1280.png`, await p.screenshot(), `${LABEL[fig]} — écran Rencontres, 1280×720`);
      await ctx.close();
    }
    // Réaction animée, 1280×720, rendu continu (mouvement non réduit).
    {
      const { ctx, p } = await page([1280, 720]);
      await p.goto(`${server.base}/?${DUEL}&reducedMotion=0${FIG[fig]}`);
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
        // Une prise : tranches de 250 ms (rien ne reste dans l’encodeur à l’arrêt).
        const take = async (script) => {
          const mr = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8e6 });
          const chunks = [];
          mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          const done = new Promise((r) => { mr.onstop = r; });
          mr.start(250);
          await script();
          mr.stop();
          await done;
          return new Blob(chunks, { type: 'video/webm' });
        };
        // Prise de chauffe jetée : à la première prise d’un navigateur, l’encodeur n’était pas prêt (vidéo vide).
        await take(() => wait(600));
        const ex = (mood, gesture = null, gaze = 'player') => arena.expression({ mood, intensity: 1, gaze, gesture, hold: 0, cause: 'réaction de revue (QA L5)' });
        let frames = [];
        const scene = async () => {
          frames = [];
          const t0 = performance.now();
          const grab = (label) => frames.push({ label, t: Math.round(performance.now() - t0), src: c.toDataURL('image/png') });
          ex('neutral');
          await wait(500); grab('0,5 s — repos');
          ex('surprised', 'recoil');
          await wait(160); grab('0,66 s — surprise (début)');
          await wait(340); grab('1,0 s — surprise');
          await wait(900);
          ex('focused');
          await wait(700); grab('2,6 s — prudence');
          await wait(700);
          ex('neutral');
          await wait(900); grab('4,2 s — retour au repos');
          await wait(300);
        };
        ex('neutral');
        await wait(1200);
        let blob = await take(scene);
        let tries = 1;
        if (blob.size < 100000) { ex('neutral'); await wait(1200); blob = await take(scene); tries = 2; }
        run = false;
        const b64 = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
        return { b64, frames, tries, bytes: blob.size };
      });
      save(`reaction-${fig}.webm`, Buffer.from(rec.b64, 'base64'), `${LABEL[fig]} — réaction animée (repos → surprise avec recul → prudence → repos), 340×340, 1:1, 60 i/s demandées`);
      for (const [i, f] of rec.frames.entries()) save(`${fig}-reaction-${i + 1}.png`, Buffer.from(f.src.split(',')[1], 'base64'), `${LABEL[fig]} — réaction, ${f.label} (mesuré : ${f.t} ms)`);
      shots[fig].frames = rec.frames;
      if (rec.bytes < 100000) issues.push(`vidéo de réaction ${fig} vide (${rec.bytes} octets, ${rec.tries} prises)`);
      if (fig === 'v2') manifest.cost = await p.evaluate(() => window.__lqvFigureCost(15));
      await ctx.close();
    }
  }

  // Vidéo côte à côte des deux réactions (lecture des deux WebM dans une page, composées sur un canvas enregistré).
  {
    const { ctx, p } = await page([720, 400]);
    await p.goto(`${server.base}/?gallery=1`);
    const both = await p.evaluate(async ({ a, b }) => {
      document.body.innerHTML = '';
      const vid = (b64) => { const v = document.createElement('video'); v.src = `data:video/webm;base64,${b64}`; v.muted = true; v.playsInline = true; return v; };
      const [va, vb] = [vid(a), vid(b)];
      const within = (pr, ms, what) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error(`délai dépassé : ${what}`)), ms))]);
      await within(Promise.all([va, vb].map((v) => new Promise((r) => { v.onloadeddata = r; }))), 20000, 'chargement des vidéos');
      const c = document.createElement('canvas');
      c.width = 700; c.height = 380;
      const g = c.getContext('2d');
      let run = true;
      const draw = () => {
        g.fillStyle = '#100c12'; g.fillRect(0, 0, 700, 380);
        g.drawImage(va, 6, 34, 340, 340); g.drawImage(vb, 354, 34, 340, 340);
        g.fillStyle = '#f3e6c8'; g.font = '600 16px Georgia, serif';
        g.fillText('Actuelle (V1)', 12, 22); g.fillText('Vectoriel V2', 360, 22);
        if (run) requestAnimationFrame(draw);
      };
      draw();
      const mr = new MediaRecorder(c.captureStream(60), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8e6 });
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise((r) => { mr.onstop = r; });
      mr.start();
      await Promise.all([va.play(), vb.play()]);
      await within(Promise.all([va, vb].map((v) => new Promise((r) => { v.onended = r; }))), 20000, 'lecture des vidéos');
      mr.stop();
      await done;
      run = false;
      const blob = new Blob(chunks, { type: 'video/webm' });
      return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
    }, { a: (await import('node:fs')).readFileSync(`${OUT}/reaction-v1.webm`).toString('base64'), b: (await import('node:fs')).readFileSync(`${OUT}/reaction-v2.webm`).toString('base64') }).catch((e) => { issues.push(`composition côte à côte : ${e.message}`); return null; });
    if (both) save('reaction-comparaison.webm', Buffer.from(both, 'base64'), 'Réaction animée, V1 et V2 côte à côte (même script, même durée)');
    await ctx.close();
  }

  // Planches : (1) humeurs et réaction, (2) scène et affiche ; toutes les images à l’échelle 1:1.
  manifest.renderer = rendererLabel(renderer);
  const head = (title) => `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#120e14;color:#efe6d6;font:14px system-ui;padding:18px 22px">
<h1 style="font:600 26px Georgia,serif;color:#ffe2a6;margin:0 0 4px">${title}</h1>
<p style="margin:0 0 14px;color:#b9ad98">Maëlle, gardienne des Ronces — build ${manifest.commit}, seed 202, graine d’art 7 — ${manifest.renderer}. Images à l’échelle 1:1 du jeu (aucun agrandissement). Humeurs imposées par le paramètre QA <code>pose=</code> (intensité 1) ; en jeu, elles ne suivent que des faits publics.</p>`;
  const row = (fig, imgs, cap) => `<div style="display:flex;gap:10px;align-items:flex-start;margin:6px 0 12px"><div style="width:120px;font:600 15px Georgia,serif;color:${fig === 'v2' ? '#c8f08a' : '#e6c99a'}">${LABEL[fig]}</div>${imgs.map((src, i) => `<figure style="margin:0"><img src="${src}" style="display:block;border:1px solid #3a3040"><figcaption style="color:#b9ad98;font-size:12px;margin-top:3px">${cap[i] ?? ''}</figcaption></figure>`).join('')}</div>`;
  const h2 = (t) => `<h2 style="font:600 18px Georgia,serif;color:#f0d08c;margin:18px 0 4px">${t}</h2>`;
  const html1 = head('L5 — Maëlle : actuelle contre vectoriel V2 — humeurs et réaction')
    + h2('Six humeurs — 1280×720 (visage ≈ 83 px des yeux au menton)')
    + ['v1', 'v2'].map((f) => row(f, MOODS.map(([m]) => shots[f].moods[1280][m]), MOODS.map(([, l]) => l))).join('')
    + h2('Six humeurs — 1920×1080 (≈ 125 px)')
    + ['v1', 'v2'].map((f) => row(f, MOODS.map(([m]) => shots[f].moods[1920][m]), MOODS.map(([, l]) => l))).join('')
    + h2('Réaction animée — images clés (vidéo : reaction-comparaison.webm)')
    + ['v1', 'v2'].map((f) => row(f, shots[f].frames.map((x) => x.src), shots[f].frames.map((x) => x.label))).join('');
  const html2 = head('L5 — Maëlle : actuelle contre vectoriel V2 — scène et affiche')
    + h2('Affiche de rencontre — écran Rencontres, 1280×720 puis 1920×1080')
    + `<div style="display:flex;gap:28px">${['v1', 'v2'].map((f) => row(f, [shots[f].affiche[1280], shots[f].affiche[1920]], ['1280×720', '1920×1080'])).join('')}</div>`
    + h2('Vue A du duel, éclairage HD-2D — 1280×720')
    + `<div style="display:flex;gap:16px">${['v1', 'v2'].map((f) => row(f, [shots[f].vueA[1280]], [''])).join('')}</div>`;
  const { ctx, p } = await page([2900, 1000]);
  for (const [name, html] of [['planche-l5-humeurs.png', html1], ['planche-l5-scene.png', html2]]) {
    await p.setContent(html);
    await p.waitForTimeout(300);
    save(name, await p.screenshot({ fullPage: true }), name.includes('humeurs') ? 'Planche : six humeurs (1280 et 1920) et images clés de la réaction, V1 contre V2' : 'Planche : affiche de rencontre et vue A du duel, V1 contre V2');
  }
  await ctx.close();
} finally {
  await browser.close();
  server.stop();
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ renderer: manifest.renderer, cost: manifest.cost, files: manifest.files.length, issues }, null, 2));
