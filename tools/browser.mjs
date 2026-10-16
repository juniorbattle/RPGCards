// Utilitaires navigateur partagés (Playwright-core + Chromium préinstallé, rendu WebGL logiciel SwiftShader).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

export const CHROMIUM = process.env.CHROMIUM_PATH || ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => existsSync(p));

export async function launch() {
  if (!CHROMIUM) throw new Error('Chromium introuvable : définir CHROMIUM_PATH');
  return chromium.launch({ executablePath: CHROMIUM, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
}

/** Démarre `vite preview` sur le build courant (dist/). */
export async function startPreview(port = 4179) {
  if (!existsSync('dist/index.html')) throw new Error('dist/ absent : lancer `npm run build` avant.');
  const proc = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(base);
      if (r.ok) return { base, stop: () => proc.kill() };
    } catch { /* attente */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error('vite preview ne démarre pas');
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

/** Glisser-déposer réel par pointeur souris (Pointer Events). */
export async function dragTo(page, fromSel, toSel) {
  const a = await page.locator(fromSel).first().boundingBox();
  const b = await page.locator(toSel).first().boundingBox();
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
    const issues = [];
    document.querySelectorAll('.side.opp [data-def], .hud.opp [data-def]').forEach((el) => {
      if (!allowed.has(el.getAttribute('data-def'))) issues.push(`carte adverse non autorisée dans le DOM : ${el.getAttribute('data-def')}`);
    });
    // Aucun identifiant d’instance adverse dans le DOM (ex. « p2#07 »).
    if (/p2#\d\d/.test(document.getElementById('app').innerHTML)) issues.push('identifiant d’instance adverse présent dans le DOM');
    // Le journal ne contient aucune ligne d’événement privé adverse.
    if (v.phase === 'TACTICS' && v.awaitingMe && v.opp.locked) {
      const txt = document.querySelector('.journal')?.textContent ?? '';
      if (/Rival : .*→ (AMPLIFIER|INTERFÉRER|CONSERVER)/.test(txt.split('— TOUR ').pop() ?? '')) issues.push('choix tactique adverse visible avant verrouillage commun');
    }
    return issues;
  });
}

/** Glisser tactile réel via CDP (touchStart/Move/End → Pointer Events pointerType « touch »). */
export async function touchDrag(page, fromSel, toSel) {
  const a = await page.locator(fromSel).first().boundingBox();
  const b = await page.locator(toSel).first().boundingBox();
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
