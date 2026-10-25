// M10-F — synthèse de la campagne de la RC (`tools/m10f-campagne.sh`) : un tableau par GPU et par parcours, lu dans les
// rapports JSON et les journaux de la sortie. Usage : node tools/m10f-synthese.mjs [dossier]
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const DIR = process.argv[2] ?? 'artifacts/qa/m10f/campagne';
const json = (f) => (existsSync(`${DIR}/${f}`) ? JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) : null);
const log = (f) => (existsSync(`${DIR}/${f}`) ? readFileSync(`${DIR}/${f}`, 'utf8') : '');
const lines = [];
const out = (s) => lines.push(s);
const checks = (r) => { const c = r?.checks ?? []; return `${c.filter((x) => String(x).startsWith('OK')).length}/${c.length}`; };
const lastLine = (t, re) => t.split('\n').filter((l) => re.test(l)).pop()?.trim() ?? '—';

for (const gpu of ['780m', 'rtx']) {
  out(`### ${gpu === 'rtx' ? 'RTX 4060' : 'Radeon 780M'}`);
  out('');
  out('| Parcours | 1280 × 720 | 1920 × 1080 |');
  out('|---|---|---|');
  out(`| Jeu par défaut au pixel près (\`l5-identique\`) | ${lastLine(log(`l5-identique-${gpu}.log`), /IDENTIQUE|DIFF|écart/)} | (même série) |`);
  for (const [nom, base] of [['Démo (`qa:demo`)', 'demo'], ['Aventure (`qa:aventure`)', 'aventure'], ['Maison (`qa:maison`)', 'maison'], ['Voies (`qa:voies`)', 'voies'], ['Ville vivante (`qa:vivante`)', 'vivante'], ['Championnat (`qa:championnat`)', 'championnat'], ['Annonce V3.3', 'annonce'], ['Révision V3.3', 'revision']]) {
    const cell = (w) => { const r = json(`${base}-${gpu}-${w}.json`); const t = log(`${base}-${gpu}-${w}.log`); return r?.checks ? `${checks(r)}${r.console?.length || r.issues?.length ? ' (console !)' : ''}` : lastLine(t, /contrôles|OK|ÉCHEC/); };
    out(`| ${nom} | ${cell(1280)} | ${cell(1920)} |`);
  }
  out(`| Accessoires (\`qa:accessoires\`) | ${lastLine(log(`accessoires-${gpu}.log`), /accessoires|vues|OK|ÉCHEC/)} | |`);
  const pv = (w) => { const r = json(`perf-ville-${gpu}-${w}.json`); if (!r) return '—'; return Object.entries(r.ilots).map(([k, v]) => `${k} ${v.medianeMs}/${v.p95Ms}/${v.maxMs} ms, ${v.stats.calls} appels`).join(' ; ') + (r.console.length ? ' (console !)' : ''); };
  out(`| Ville en rangs, médiane/p95/max entre images | ${pv(1280)} | ${pv(1920)} |`);
  const pp = json(`perf-play-${gpu}.json`);
  if (pp) {
    const runs = pp.runs ?? pp.results ?? pp;
    out(`| Duel (\`perf:play\`) | ${JSON.stringify(Array.isArray(runs) ? runs.map((r) => [r.name, r.all?.medianMs ?? r.all?.fps, r.all?.p95Ms]) : Object.keys(runs)).slice(0, 300)} | |`);
  }
  const qb = log(`qa-browser-${gpu}.log`);
  out(`| \`qa:browser\` | ${lastLine(qb, /QA navigateur|ÉCHEC/)} | |`);
  const qp = json(`qa-product-${gpu}.json`);
  if (qp) out(`| \`qa:product\` | ${Object.entries(qp.runs).map(([k, r]) => `${k.split('-')[0]} ${r.checks.length - r.fails.length}/${r.checks.length}`).join(', ')} | |`);
  for (const v of ['defaut', 'bar', 'arene']) out(`| \`qa:rc\` (${v}) | ${lastLine(log(`qa-rc-${v}-${gpu}.log`), /QA RC|ÉCHEC/)} | |`);
  out(`| \`qa:techniques\` | ${lastLine(log(`qa-techniques-${gpu}.log`), /parcours|ÉCHEC/)} | |`);
  out('');
}
const errs = readdirSync(DIR).filter((f) => f.endsWith('.log') && /ÉCHEC|Error:/.test(readFileSync(`${DIR}/${f}`, 'utf8')));
out(`Journaux avec « ÉCHEC » ou « Error: » : ${errs.length ? errs.join(', ') : 'aucun'}.`);
console.log(lines.join('\n'));
