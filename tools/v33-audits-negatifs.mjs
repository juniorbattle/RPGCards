// Avenant 08 — contre-épreuve des audits de secret du navigateur (`secretAudit`, `stanceAudit`) : sur
// `?scenario=signature-annonce`, la Signature annoncée du rival (identité publique, pastille « Mode : ? ») ne doit
// déclencher aucune alerte ; un mode du rival ou une carte adverse non publique injectés dans le DOM doivent en déclencher.
// Usage : npm run build && [LQV_GPU=1 CHROMIUM_PATH=…] node tools/v33-audits-negatifs.mjs [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { launch, secretAudit, startPreview } from './browser.mjs';
import { stanceAudit } from './duel-driver.mjs';

const OUT = process.argv[2] ?? 'artifacts/qa/v33/audits-negatifs.json';
const head = execSync('git rev-parse --short HEAD').toString().trim();
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4298, process.env.LQV_DIST || 'dist');
const browser = await launch();
const checks = [];
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
try {
  const p = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  await p.goto(`${server.base}/?scenario=signature-annonce&qa=1`);
  await p.waitForFunction(() => window.__lqv?.view?.().reveal.signatures.opp && document.querySelector('.side.opp .secret-stance'), null, { timeout: 30000 });
  const sig = await p.evaluate(() => window.__lqv.view().reveal.signatures.opp);
  check((await secretAudit(p)).length === 0, `Signature annoncée du rival (${sig}) admise par l’audit des fuites`);
  check((await stanceAudit(p)).length === 0, 'pastille « Mode : ? » admise par l’audit des postures');
  await p.evaluate(() => { const s = document.querySelector('.side.opp .secret-stance'); s.classList.add('assault'); s.textContent = 'Assaut (secret)'; });
  check((await stanceAudit(p)).some((x) => /mode de la Primaire adverse/.test(x)), 'mode du rival injecté : détecté');
  await p.evaluate(() => { const s = document.querySelector('.side.opp .secret-stance'); s.classList.remove('assault'); s.textContent = 'Mode : ?'; });
  await p.evaluate(() => { const d = document.createElement('div'); d.setAttribute('data-def', 'Ronce-4-basic'); document.querySelector('.side.opp').append(d); });
  check((await secretAudit(p)).some((x) => /Ronce-4-basic/.test(x)), 'carte adverse non publique injectée : détectée');
} finally {
  await browser.close();
  server.stop?.();
}
const ok = checks.every((c) => c.startsWith('OK'));
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ commit: head, ok, checks }, null, 1) + '\n');
console.log(`${checks.filter((c) => c.startsWith('OK')).length}/${checks.length} contrôles ; ${ok ? 'OK' : 'ÉCHEC'}`);
