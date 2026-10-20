// M09 V4 — génération des images de la ville avec gpt-image-2 (AGENTS, « Images de la ville » ; ADR 027 et 028).
// La clé OpenAI est lue à l'exécution dans le `.env.local` du dossier principal (ignoré par git), jamais affichée,
// jamais écrite ailleurs, jamais dans le build (aucune variable `VITE_`). Une image par appel, dans l'ordre de la
// spécification ; un appel refusé arrête la série (aucune image produite, rien de compté). Les bruts vont dans
// `art-gen/<lot>/` du dossier principal (ignoré par git) avec un journal de provenance (`provenance.json` : modèle,
// point d'accès, paramètres, prompt complet, images d'entrée et leurs empreintes, empreinte de la sortie, usage, date).
// Usage : node tools/m09-generer-images.mjs <spécification.json> [--only <nom>]
//   spécification : { "lot": "<dossier>", "images": [{ "name", "endpoint": "edits" | "generations", "inputs": [chemins],
//                     "prompt", "size", "quality", "background" }] }
// Variables : LQV_ENV_FILE (fichier de la clé, défaut : `.env.local` du dossier principal du dépôt), LQV_ART_GEN
// (dossier des bruts, défaut : `art-gen/` du dossier principal).
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';

const MODEL = 'gpt-image-2';
const [specPath, flag, only] = process.argv.slice(2);
if (!specPath) throw new Error('usage : node tools/m09-generer-images.mjs <spécification.json> [--only <nom>]');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));
const main = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
const envFile = process.env.LQV_ENV_FILE || join(main, '.env.local');
const outDir = join(process.env.LQV_ART_GEN || join(main, 'art-gen'), spec.lot);
const sha = (b) => createHash('sha256').update(b).digest('hex');

/** Clé lue sans jamais être affichée ; absente : seuls les NOMS des variables présentes sont rapportés. */
function readKey() {
  if (!existsSync(envFile)) throw new Error(`fichier de clé absent : ${envFile}`);
  const vars = new Map();
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m) vars.set(m[1], m[2].replace(/^['"]|['"]$/g, ''));
  }
  const key = vars.get('OPENAI_API_KEY');
  if (!key) throw new Error(`OPENAI_API_KEY absente de ${basename(envFile)} (variables présentes : ${[...vars.keys()].join(', ') || 'aucune'})`);
  return key;
}

const key = readKey();
mkdirSync(outDir, { recursive: true });
const logPath = join(outDir, 'provenance.json');
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, 'utf8')) : { lot: spec.lot, images: [] };
for (const im of spec.images) {
  if (flag === '--only' && im.name !== only) continue;
  const inputs = (im.inputs ?? []).map((p) => { const b = readFileSync(p); return { path: p, sha256: sha(b), bytes: b.length, buf: b }; });
  const params = { model: MODEL, size: im.size, quality: im.quality, background: im.background, output_format: 'png', n: 1 };
  let res;
  const t0 = Date.now();
  if (im.endpoint === 'edits') {
    const fd = new FormData();
    for (const [k, v] of Object.entries(params)) if (v !== undefined) fd.append(k, String(v));
    fd.append('prompt', im.prompt);
    for (const i of inputs) fd.append('image[]', new Blob([i.buf], { type: 'image/png' }), basename(i.path));
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: fd });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...params, prompt: im.prompt }) });
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.data?.[0]?.b64_json) {
    // message d'erreur de l'API seulement (il ne contient pas la clé) ; la série s'arrête
    console.error(`ÉCHEC ${im.name} : HTTP ${res.status} ${body?.error?.message ?? '(réponse illisible)'}`);
    process.exit(1);
  }
  const png = Buffer.from(body.data[0].b64_json, 'base64');
  const file = `${im.name}.png`;
  writeFileSync(join(outDir, file), png);
  const entry = {
    name: im.name, file, model: MODEL, endpoint: `/v1/images/${im.endpoint}`, params, prompt: im.prompt,
    inputs: inputs.map(({ path, sha256, bytes }) => ({ path, sha256, bytes })),
    output: { sha256: sha(png), bytes: png.length, width: png.readUInt32BE(16), height: png.readUInt32BE(20), colorType: png[25] },
    revised_prompt: body.data[0].revised_prompt ?? null, usage: body.usage ?? null, created: body.created ?? null,
    date: new Date().toISOString(), durationMs: Date.now() - t0,
  };
  log.images = log.images.filter((x) => x.name !== im.name).concat(entry);
  writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log(`OK ${im.name} : ${entry.output.width}×${entry.output.height}, ${png.length} octets, type de couleur PNG ${entry.output.colorType} (6 = RGBA), ${entry.durationMs} ms, usage ${JSON.stringify(entry.usage)}`);
}
