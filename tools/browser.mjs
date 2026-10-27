// Utilitaires navigateur partagés (Playwright-core + Chromium préinstallé, rendu WebGL logiciel SwiftShader).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const CHROMIUM = process.env.CHROMIUM_PATH || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => existsSync(p));

/**
 * Navigateur de QA. Par défaut : WebGL LOGICIEL (SwiftShader) — reproductible dans le conteneur, jamais
 * une mesure de GPU. `LQV_GPU=1` (poste de l’opérateur, Chrome avec GPU via CHROMIUM_PATH, `LQV_HEADED=1`
 * pour une fenêtre visible) : aucun forçage logiciel, le navigateur utilise le GPU réel.
 * `LQV_CHROME_ARGS` (séparés par des espaces) s’ajoutent aux arguments : choix de l’adaptateur d’un
 * portable hybride (`--force_high_performance_gpu`), image non plafonnée par la synchro verticale
 * (`--disable-gpu-vsync --disable-frame-rate-limit`) pour mesurer la marge.
 */
export const GPU = process.env.LQV_GPU === '1';
export const EXTRA_ARGS = (process.env.LQV_CHROME_ARGS ?? '').split(/\s+/).filter(Boolean);
export function launchOptions() {
  if (!CHROMIUM) throw new Error('Chromium introuvable : définir CHROMIUM_PATH');
  const base = GPU ? ['--ignore-gpu-blocklist'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
  return { executablePath: CHROMIUM, headless: process.env.LQV_HEADED !== '1', args: [...base, ...EXTRA_ARGS] };
}
export async function launch() {
  return chromium.launch(launchOptions());
}

/** Profil PERSISTANT (dossier `userDataDir`) : caches disque de Chrome (shaders compris) conservés d’un lancement à l’autre. */
export async function launchPersistent(userDataDir, contextOptions = {}) {
  return chromium.launchPersistentContext(userDataDir, { ...launchOptions(), ...contextOptions });
}

/** Moteur de rendu WebGL réellement utilisé par la page (chaîne ANGLE / pilote), ou null. */
export const webglRenderer = (page) => page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null;
});

/** Libellé honnête du mode de rendu pour les rapports. */
export function rendererLabel(renderer) {
  if (!GPU) return 'Chromium headless + ANGLE/SwiftShader (CPU) — FPS non représentatifs d’un GPU';
  const mode = process.env.LQV_HEADED === '1' ? 'fenêtre visible' : 'headless';
  return `Chrome ${mode}, GPU réel : ${renderer ?? 'moteur de rendu inconnu'}${EXTRA_ARGS.length ? ` — arguments : ${EXTRA_ARGS.join(' ')}` : ''}`;
}

/**
 * Démarre `vite preview` sur le build courant (dist/, ou `LQV_DIST`, ou `outDir` : build d’itération / « avant »).
 * Port par défaut : `LQV_PREVIEW_PORT`, sinon 4179. On n’accepte que NOTRE serveur : il doit annoncer son adresse
 * avant la première requête. Un port déjà pris par une autre session (`--strictPort` refuse) est une erreur ; sans ce
 * contrôle, la QA testait silencieusement le build de l’autre serveur (constaté le 2026-10-17, ADR 016).
 */
export async function startPreview(port = Number(process.env.LQV_PREVIEW_PORT) || 4179, outDir = process.env.LQV_DIST || 'dist') {
  if (!existsSync(`${outDir}/index.html`)) throw new Error(`${outDir}/ absent : lancer \`npm run build\` avant.`);
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--outDir', outDir], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  let exited = false;
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { out += d; });
  proc.on('exit', () => { exited = true; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 200; i++) {
    if (exited) throw new Error(`vite preview s’est arrêté (port ${port} déjà pris ? LQV_PREVIEW_PORT pour en choisir un autre) : ${out.slice(0, 400)}`);
    if (out.replace(/\x1b\[[0-9;]*m/g, '').includes(`:${port}/`)) {
      try {
        const r = await fetch(base);
        if (r.ok) return { base, stop: () => proc.kill() };
      } catch { /* attente */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error(`vite preview ne démarre pas (port ${port}) : ${out.slice(0, 400)}`);
}

export function watchConsole(page, sink) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') sink.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => sink.push(`pageerror: ${e.message}`));
}

export const view = (page) => page.evaluate(() => window.__lqv.view());

/** Attend que la phase de p1 demande une décision (ou fin). */
export async function waitDecision(page, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await view(page);
    if (v.phase === 'ENDED' || v.phase === 'RESOLVED' || v.awaitingMe || (v.phase === 'REPEL' && v.repel?.mine)) return v;
    await page.waitForTimeout(60);
  }
  return view(page);
}

/**
 * Positions de départ / d’arrivée une fois la mise en page stabilisée (deux mesures identiques
 * à 120 ms d’intervalle) : on vise comme un joueur, sur ce qui est affiché.
 */
export async function stableBoxes(page, fromSel, toSel, timeout = 3000) {
  const measure = async () => [await page.locator(fromSel).first().boundingBox(), await page.locator(toSel).first().boundingBox()];
  const same = (p, q) => JSON.stringify(p) === JSON.stringify(q);
  let prev = await measure();
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    await page.waitForTimeout(120);
    const cur = await measure();
    if (same(prev, cur)) return cur;
    prev = cur;
  }
  return prev;
}

/** Glisser-déposer réel par pointeur souris (Pointer Events). */
export async function dragTo(page, fromSel, toSel) {
  const [a, b] = await stableBoxes(page, fromSel, toSel);
  if (!a || !b) throw new Error(`dragTo: cible introuvable ${fromSel} -> ${toSel}`);
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(a.x + a.width / 2 + ((b.x + b.width / 2) - (a.x + a.width / 2)) * (i / 12), a.y + a.height / 2 + ((b.y + b.height / 2) - (a.y + a.height / 2)) * (i / 12));
  }
  await page.mouse.up();
}

/**
 * Vérifie qu’aucune identité adverse cachée n’est présente dans le DOM du terrain adverse :
 * seules les cartes adverses VISIBLES (actives non masquées, Primaire révélée) portent data-def.
 */
export async function secretAudit(page) {
  return page.evaluate(() => {
    const v = window.__lqv.view();
    const allowed = new Set();
    for (const s of v.opp.slots) if (s?.card) allowed.add(s.card.defId);
    if (v.reveal.primaries) allowed.add(v.reveal.primaries.opp.defId);
    // Avenant 08 : une Signature engagée en Primaire est annoncée au verrouillage ; son identité est PUBLIQUE.
    if (v.reveal.signatures?.opp) allowed.add(v.reveal.signatures.opp);
    // M03 : pendant la séquence de résolution, le plateau montre l’instantané d’avant résolution
    // (Secondaires engagées encore visibles) — ces identités sont PUBLIQUES (choix tactiques révélés).
    for (const t of v.reveal.tactics?.opp ?? []) if (t?.defId) allowed.add(t.defId);
    const issues = [];
    document.querySelectorAll('.side.opp [data-def], .hud.opp [data-def]').forEach((el) => {
      if (!allowed.has(el.getAttribute('data-def'))) issues.push(`carte adverse non autorisée dans le DOM : ${el.getAttribute('data-def')}`);
    });
    // M03.1B / ADR 011 : Secondaire du rival camouflée ce tour (et non dissipée) → ni définition, ni nom,
    // ni nom d’effet dans le DOM du jeu ni dans la scène du Clash, tant que le tour n’est pas fini.
    const evs = window.__lqv.events?.() ?? [];
    // Seules les surfaces qui parlent du RIVAL sont lues (vos propres cartes peuvent porter les mêmes noms).
    if (v.phase !== 'RESOLVED' && v.phase !== 'ENDED' && !evs.some((e) => e.turn === v.turn && e.kind === 'dissipation' && e.data.target === 'p2')) {
      // M12 : les temps forts du rival (premier plan `#activations`) ; ceux qui montrent VOS cartes (Repoussement, cible
      // d'une Interférence) ne sont lus que par leur bannière, leur conséquence et leur détail
      const rivalHtml = [...document.querySelectorAll('.side.opp, .hud.opp, .rival-bubble, #stage .cs-slot.opp, #activations .act.side-opp:not(.act-repousse):not(.act-interference) .act-center, #activations .act.side-opp .act-src, #activations .act.side-opp .act-banner, #activations .act.side-opp .act-cons, #activations .act.side-opp .act-detail')].map((x) => x.outerHTML).join('');
      const rivalText = [...document.querySelectorAll('.journal .line, .command .msg, #stage .cs-verdict')].map((x) => x.textContent ?? '')
        .flatMap((t) => t.split(' · ')).filter((t) => /rival/.test(t) && !/^\[Privé\]/.test(t)).join('\n');
      for (const e of evs) {
        if (e.turn !== v.turn || e.kind !== 'secondaryRevealed' || e.vis !== 'p2' || !e.data.own) continue;
        const info = window.__lqv.cardInfo(e.data.defId);
        for (const needle of [e.data.defId, info.title, info.effect].filter(Boolean)) {
          const insightLine = rivalText.split('\n').some((t) => /Le rival (gagne 1 Insight|: gain d’Insight plafonné) \(/.test(t) && t.includes(needle));
          if (rivalHtml.includes(needle) || rivalText.includes(`${needle} (rival`) || insightLine) issues.push(`carte camouflée du rival nommée dans le DOM : ${needle}`);
        }
      }
    }
    // Aucun identifiant d’instance adverse dans le DOM (ex. « p2#07 »).
    if (/p2#\d\d/.test(document.getElementById('app').innerHTML)) issues.push('identifiant d’instance adverse présent dans le DOM');
    // Le journal ne contient aucune ligne d’événement privé adverse.
    if (v.phase === 'TACTICS' && v.awaitingMe && v.opp.locked) {
      // Journal groupé par tour (M02) : seul le bloc du tour courant est examiné.
      const turns = document.querySelectorAll('.journal details.turn');
      const txt = turns.length ? turns[turns.length - 1].textContent ?? '' : document.querySelector('.journal')?.textContent ?? '';
      if (/Rival : .*→ (AMPLIFIER|INTERFÉRER|CONSERVER)/.test(txt)) issues.push('choix tactique adverse visible avant verrouillage commun');
    }
    return issues;
  });
}

/** Glisser tactile réel via CDP (touchStart/Move/End → Pointer Events pointerType « touch »). */
export async function touchDrag(page, fromSel, toSel) {
  const [a, b] = await stableBoxes(page, fromSel, toSel);
  if (!a || !b) throw new Error(`touchDrag: cible introuvable ${fromSel} -> ${toSel}`);
  const cdp = await page.context().newCDPSession(page);
  const p0 = { x: a.x + a.width / 2, y: a.y + a.height / 2 };
  const p1 = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p0] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p0.x + (p1.x - p0.x) * (i / 10), y: p0.y + (p1.y - p0.y) * (i / 10) }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/** Charge GPU injectée (aucun code du jeu) : canvas WebGL2 hors document, un triangle plein écran par image dont le
 *  shader boucle `iter` fois ; `iter` suit la cible de temps GPU (médiane de 30 images, requêtes TIME_ELAPSED).
 *  Pour `page.addInitScript(gpuStress, ms)` ; la cible se change en cours de route (`window.__gpuStress.targetMs`,
 *  0 : charge retirée). Sert à placer le poste dans l’état « GPU ralenti » à la demande (perf-play, qa-fallback). */
export function gpuStress(targetMs) {
  const start = () => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const gl = c.getContext('webgl2', { antialias: false });
    if (!gl) return;
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, '#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, '#version 300 es\nprecision highp float;uniform int uIter;uniform float uT;out vec4 o;void main(){vec2 p=gl_FragCoord.xy*0.002;float a=uT;for(int i=0;i<uIter;i++){a=sin(a*1.31+p.x)*cos(a*0.77+p.y)+a*0.5;}o=vec4(a,a*0.5,0.0,1.0);}'));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const uIter = gl.getUniformLocation(prog, 'uIter');
    const uT = gl.getUniformLocation(prog, 'uT');
    const st = { iter: 64, samples: [], ms: [], targetMs, timer: !!ext };
    window.__gpuStress = st;
    const pending = [];
    const frame = (t) => {
      requestAnimationFrame(frame);
      while (ext && pending.length && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE)) {
        const q = pending.shift();
        const ms = gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(q);
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT) && ms > 0 && ms < 100) st.samples.push(ms);
      }
      if (st.samples.length >= 30) {
        const s = st.samples.sort((a, b) => a - b);
        const med = s[15];
        st.ms.push(Math.round(med * 100) / 100);
        if (st.ms.length > 400) st.ms.shift();
        st.iter = st.targetMs > 0 ? Math.max(1, Math.min(20000, Math.round(st.iter * Math.min(2, Math.max(0.5, st.targetMs / Math.max(0.01, med)))))) : 0;
        st.samples = [];
      }
      if (st.iter === 0) { if (!(st.targetMs > 0)) return; st.iter = 64; }
      const q = ext ? gl.createQuery() : null;
      if (q) gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      gl.uniform1i(uIter, st.iter);
      gl.uniform1f(uT, t * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (q) { gl.endQuery(ext.TIME_ELAPSED_EXT); pending.push(q); }
      gl.flush();
    };
    requestAnimationFrame(frame);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
