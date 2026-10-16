// Utilitaires navigateur partagés (Playwright-core + Chromium préinstallé, rendu WebGL logiciel SwiftShader).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const CHROMIUM = process.env.CHROMIUM_PATH || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => existsSync(p));

export async function launch() {
  if (!CHROMIUM) throw new Error('Chromium introuvable : définir CHROMIUM_PATH');
  return chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

/** Démarre `vite preview` sur le build courant (dist/, ou `LQV_DIST`, ou `outDir` : build d’itération / « avant »). */
export async function startPreview(port = 4179, outDir = process.env.LQV_DIST || 'dist') {
  if (!existsSync(`${outDir}/index.html`)) throw new Error(`${outDir}/ absent : lancer \`npm run build\` avant.`);
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort', '--outDir', outDir], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { out += d; });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 200; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) return { base, stop: () => proc.kill() };
    } catch { /* attente */ }
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
      const rivalHtml = [...document.querySelectorAll('.side.opp, .hud.opp, .rival-bubble, #stage .cs-slot.opp')].map((x) => x.outerHTML).join('');
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
