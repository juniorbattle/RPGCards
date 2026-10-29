// QA M12 (contrat 2, ADR 045) — les temps forts des activations en combat, au navigateur (build courant).
// 1. Planche : un temps fort RÉEL de chaque genre, tiré de duels joués dans Node (moteur pur, IA contre IA, variantes et
//    Techniques ; `buildActivations` sur la vue du joueur), rejoué dans la scène de la page et figé à mi-course.
// 2. Intégration : de vrais duels au navigateur, rythme normal ; le joueur suit l'IA « équilibré » sur sa vue autorisée
//    (`pilote-qa.mjs`), ses commandes passent par le crochet QA ; chaque genre est figé et capturé à son premier passage.
//    Assertions : secret (aucun nom de carte masquée adverse dans la scène ; effet masqué adverse montré de dos), « Passer »
//    vide la scène, rien ne subsiste à la fin du duel.
// 3. Réglages : mouvement réduit (aucune transformation animée), instantané (rien), gel (temps fort posé, rien n'attend).
// 4. Tenue au clic (retour du responsable du 2026-10-29) : ce qui concerne le joueur attend son clic ou Espace.
// Sortie : screenshots/qa/m12/activations/ (JPEG), artifacts/qa/m12/activations.json. Son coupé en QA.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tsImport } from 'tsx/esm/api';
import { launch, startPreview, watchConsole } from './browser.mjs';
import { decisionIa } from './pilote-qa.mjs';

const OUT = 'screenshots/qa/m12/activations';
mkdirSync(OUT, { recursive: true });
mkdirSync('artifacts/qa/m12', { recursive: true });
const commit = execSync('git rev-parse --short HEAD').toString().trim();
const KINDS = ['effet', 'annule', 'masque', 'echec', 'regard', 'technique', 'camouflage', 'dissipation', 'signature', 'interference', 'insight', 'soin', 'repousse', 'revelation'];

// --- 1. temps forts réels tirés de duels joués dans Node ------------------------------------------------------------
const [{ autoplay }, { DEFAULT_CONFIG }, { buildActivations }, { TECHNIQUE_IDS }] = await Promise.all([
  tsImport('../src/game/match.ts', import.meta.url),
  tsImport('../src/game/engine/engine.ts', import.meta.url),
  tsImport('../src/presentation/activations.ts', import.meta.url),
  tsImport('../src/game/catalog/techniques.ts', import.meta.url),
]);
const fams = ['Cendre', 'Voile', 'Ronce', 'Astre'];
const exemples = new Map();
// préférences : un effet masqué ADVERSE (la forme générique), un regard du joueur, une Technique adverse et une à soi…
const prefer = (a) => (a.kind === 'masque' ? a.side === 'opp' : a.kind === 'effet' ? a.side === 'me' && !!a.defId : a.kind === 'repousse' ? !!a.defId : true);
for (let i = 0; i < 160 && exemples.size < KINDS.length; i++) {
  const a = TECHNIQUE_IDS[i % TECHNIQUE_IDS.length];
  const b = TECHNIQUE_IDS[(i * 5 + 2) % TECHNIQUE_IDS.length];
  const cfg = {
    seed: 7100 + i * 13,
    players: {
      p1: { ...DEFAULT_CONFIG.players.p1, signature: fams[i % 4], variants: 'all', techniques: a === b ? [a] : [a, b] },
      p2: { ...DEFAULT_CONFIG.players.p2, signature: fams[(i + 1) % 4], variants: 'all', techniques: a === b ? [b] : [b, a] },
    },
  };
  const m = autoplay(cfg, 60);
  const byTurn = new Map();
  for (const e of m.events) byTurn.set(e.turn, [...(byTurn.get(e.turn) ?? []), e]);
  for (const [, evs] of byTurn) {
    for (const act of buildActivations(evs, { viewer: 'p1' })) {
      const cur = exemples.get(act.kind);
      if (!cur || (!prefer(cur) && prefer(act))) exemples.set(act.kind, act);
    }
  }
}
const absents = KINDS.filter((k) => !exemples.has(k));
console.log(`temps forts réels trouvés : ${exemples.size}/${KINDS.length}${absents.length ? ` (absents : ${absents.join(', ')})` : ''}`);

// --- navigateur ---------------------------------------------------------------------------------------------------
const srv = await startPreview();
const browser = await launch();
const report = { commit, date: new Date().toISOString(), planche: [], integration: [], checks: {}, console: [], absents };
const fail = [];
const check = (name, ok, detail = '') => { report.checks[name] = { ok, detail }; if (!ok) fail.push(`${name} ${detail}`); console.log(`${ok ? 'OK ' : 'ÉCHEC'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function openPage(query, viewport = { width: 1280, height: 720 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  watchConsole(page, report.console);
  await page.goto(`${srv.base}/?qa=1&autostart=1&${query}`);
  await page.waitForFunction(() => !!window.__lqv?.controller, null, { timeout: 120000 });
  await page.waitForTimeout(600);
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });
const frames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

// 1. planche : chaque genre rejoué et figé à mi-course (0,5 de sa durée)
{
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999');
  for (const kind of KINDS) {
    const a = exemples.get(kind);
    if (!a) continue;
    await page.evaluate(({ k, act }) => { window.__lqv.actHoldOn([k], 0.5); window.__lqv.actPlay([act]); }, { k: kind, act: a });
    await frames(page);
    await page.waitForTimeout(120);
    const shown = await page.evaluate(() => window.__lqv.activations());
    await shot(page, `planche-${kind}`);
    report.planche.push({ kind, side: a.side, title: a.title, consequence: a.consequence, held: shown.held?.kind ?? null });
    await page.evaluate(() => { window.__lqv.actRelease(); window.__lqv.controller.skipSequence(); });
    await page.evaluate(() => document.querySelector('#activations .act-stage')?.replaceChildren());
  }
  check('planche : chaque genre trouvé est figé et montré', report.planche.every((p) => p.held === p.kind), report.planche.filter((p) => p.held !== p.kind).map((p) => p.kind).join(', '));
  await ctx.close();
}

// 2. intégration : de vrais duels, rythme normal
const wanted = new Set(KINDS);
const runs = [
  { name: 'masque', query: 'scenario=masque' },
  { name: 'dissipation', query: 'scenario=dissipation' },
  { name: 'interference', query: 'scenario=interference' },
  { name: 'signature-annonce', query: 'scenario=signature-annonce' },
  { name: 'rupture', query: 'scenario=rupture' },
  { name: 'standard-sondage', query: 'seed=20261027&sig=Cendre&tech=Sondage,Lecture' },
  { name: 'standard-recentrage', query: 'seed=20261031&sig=Voile&tech=Recentrage,Ancrage' },
  { name: 'standard-ronce', query: 'seed=20261043&sig=Ronce&tech=Dissipation,Rupture' },
];
let skipChecked = false;
for (const run of runs) {
  if (![...wanted].length && skipChecked) break;
  const { ctx, page } = await openPage(`${run.query}&aiDelay=400`);
  await page.evaluate((k) => window.__lqv.actHoldOn(k, 0.5), [...wanted]);
  const t0 = Date.now();
  const caught = [];
  let leaks = [];
  let masqueFace = 0;
  let ended = false;
  while (Date.now() - t0 < 150000) {
    const st = await page.evaluate(() => {
      const c = window.__lqv.controller;
      const v = window.__lqv.view();
      const a = window.__lqv.activations();
      return { phase: v.phase, awaitingMe: v.awaitingMe, repelMine: v.phase === 'REPEL' && !!v.repel?.mine, seq: c.sequencing, held: a.held, busy: a.busy, turn: v.turn };
    });
    if (st.held) {
      // secret : aucune carte masquée de l'adversaire nommée dans la scène ; un effet masqué adverse se montre de dos
      const audit = await page.evaluate(() => {
        const s = window.__lqv.state();
        const p2 = s.players.p2;
        // cartes camouflées du rival : la cible de son masque ce tour et ses défausses camouflées du tour
        const ids = [...(p2.mask ? [p2.slots[p2.mask.target]?.cardId] : []), ...p2.maskedDiscards].filter(Boolean);
        const names = [];
        for (const id of ids) {
          const info = window.__lqv.cardInfo(s.cards[id].defId);
          names.push(info.title, info.name, ...(info.effect ? [info.effect] : []));
        }
        const html = document.getElementById('activations')?.innerHTML ?? '';
        return { leaks: names.filter((n) => n && html.includes(n)), masqueFace: document.querySelectorAll('.act-masque.side-opp .act-center .card:not(.back)').length };
      }).catch(() => ({ leaks: [], masqueFace: 0 }));
      leaks = leaks.concat(audit.leaks);
      masqueFace += audit.masqueFace;
      await page.evaluate(() => window.__lqv.pauseSequence());
      await frames(page);
      await shot(page, `duel-${st.held.kind}`);
      caught.push({ kind: st.held.kind, side: st.held.side, title: st.held.title, consequence: st.held.consequence, turn: st.turn });
      wanted.delete(st.held.kind);
      await page.evaluate(() => { window.__lqv.actRelease(); if (window.__lqv.controller.sequencing) window.__lqv.controller.advanceBeat(); });
      continue;
    }
    // « Passer » une fois, pendant une résolution dont la scène joue : plus rien ne doit subsister
    if (!skipChecked && st.seq && st.busy) {
      await page.click('[data-key="act-skip"]').catch(() => {});
      await page.waitForTimeout(60);
      const after = await page.evaluate(() => ({ kids: document.querySelectorAll('#activations .act').length, on: document.getElementById('stage')?.classList.contains('act-on') ?? false, busy: window.__lqv?.activations().busy ?? false }));
      check('« Passer » vide la scène des temps forts', after.kids === 0 && after.on === false && after.busy === false, JSON.stringify(after));
      skipChecked = true;
      continue;
    }
    if (st.phase === 'ENDED' && !st.seq) { ended = true; break; }
    if ((st.awaitingMe || st.repelMine) && !st.seq) {
      const v = await page.evaluate(() => window.__lqv.view());
      const cmd = await decisionIa(v, await page.evaluate(() => window.__lqv.events()));
      if (cmd) await page.evaluate((x) => window.__lqv.apply(x), cmd);
    } else if (st.phase === 'RESOLVED' && !st.seq) {
      await page.evaluate(() => window.__lqv.apply({ type: 'nextTurn' }));
    } else if (st.turn > 6 && run.query.startsWith('scenario') && !st.busy) break;
    await page.waitForTimeout(70);
  }
  // fin : après la mise en scène, aucun temps fort ne subsiste (attente de la file en cours)
  await page.waitForFunction(() => !window.__lqv?.activations().busy, null, { timeout: 15000 }).catch(() => {});
  const rest = await page.evaluate(() => ({ kids: document.querySelectorAll('#activations .act').length, played: window.__lqv?.activations().played.length ?? null }));
  report.integration.push({ run: run.name, ended, caught, played: rest.played, leaks, masqueFace, restAfter: rest.kids });
  check(`intégration ${run.name} : secret (aucun nom masqué adverse, effet masqué adverse de dos)`, leaks.length === 0 && masqueFace === 0, leaks.join(', '));
  check(`intégration ${run.name} : rien ne subsiste après la file`, rest.kids === 0, `${rest.kids} élément(s)`);
  await ctx.close();
}
const vus = [...new Set(report.integration.flatMap((r) => r.caught.map((c) => c.kind)))];
report.vusEnDuel = vus;
check('intégration : genres vus dans de vrais duels au navigateur', vus.length >= 8, vus.join(', '));

// 3. réglages
{
  const act = exemples.get('effet');
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999&reducedMotion=1');
  const moves = await page.evaluate((a) => {
    window.__lqv.actHoldOn(['effet'], 0.5);
    window.__lqv.actPlay([a]);
    const anims = [...document.querySelectorAll('#activations *')].flatMap((el) => el.getAnimations());
    return { anims: anims.length, moving: anims.filter((an) => an.effect.getKeyframes().some((k) => k.transform || k.translate || k.scale || k.rotate)).length };
  }, act);
  await shot(page, 'reglage-mouvement-reduit');
  check('mouvement réduit : des fondus, aucune transformation animée', moves.anims > 0 && moves.moving === 0, JSON.stringify(moves));
  await ctx.close();
}
{
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999&pace=instant');
  const r = await page.evaluate((a) => ({ ms: window.__lqv.actPlay([a]), kids: document.querySelectorAll('#activations .act').length }), exemples.get('effet'));
  check('instantané : aucun temps fort', r.ms === 0 && r.kids === 0, JSON.stringify(r));
  await ctx.close();
}
{
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999&freeze=1');
  const r = await page.evaluate((a) => ({ ms: window.__lqv.actPlay([a, a]), held: document.querySelectorAll('#activations .act.held').length, busy: window.__lqv.activations().busy }), exemples.get('effet'));
  await shot(page, 'reglage-gel');
  check('gel : le dernier temps fort posé, rien n’attend', r.ms === 0 && r.held === 1 && r.busy === false, JSON.stringify(r));
  await ctx.close();
}
{
  // petit écran paysage : la scène tient dans l'écran (bannière et conséquence visibles)
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999', { width: 844, height: 390 });
  const r = await page.evaluate((a) => {
    window.__lqv.actHoldOn(['effet'], 0.5);
    window.__lqv.actPlay([a]);
    const box = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) } : null; };
    return { banner: box('.act-banner'), cons: box('.act-cons'), card: box('.act-center') };
  }, exemples.get('effet'));
  await shot(page, 'reglage-paysage-844');
  const inside = (b) => b && b.top >= 0 && b.bottom <= 390 && b.left >= 0 && b.right <= 844;
  check('petit écran paysage : carte, bannière et conséquence dans l’écran, sans chevauchement', inside(r.banner) && inside(r.cons) && inside(r.card) && r.banner.bottom <= r.cons.top && r.card.bottom <= r.banner.top, JSON.stringify(r));
  await ctx.close();
}

{
  // téléphone en portrait (390 × 844) : la carte, la bannière, la conséquence et le détail dans la largeur, sans chevauchement
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999', { width: 390, height: 844 });
  const r = await page.evaluate((a) => {
    window.__lqv.actHoldOn(['camouflage'], 0.5);
    window.__lqv.actPlay([a]);
    const box = (s) => { const b = document.querySelector(s)?.getBoundingClientRect(); return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) } : null; };
    return { banner: box('.act-banner'), cons: box('.act-cons'), detail: box('.act-detail'), card: box('.act-center') };
  }, exemples.get('camouflage'));
  await shot(page, 'reglage-portrait-390');
  const inside = (b) => b && b.top >= 0 && b.bottom <= 844 && b.left >= 0 && b.right <= 390;
  check('téléphone en portrait : tout dans la largeur, sans chevauchement', inside(r.banner) && inside(r.cons) && inside(r.detail) && inside(r.card) && r.card.bottom <= r.banner.top && r.banner.bottom <= r.cons.top && r.cons.bottom <= r.detail.top, JSON.stringify(r));
  await ctx.close();
}

// 4. tenue au clic (retour du responsable du 2026-10-29) : un temps fort qui concerne le joueur attend son clic ou
//    Espace ; la file et le rival attendent avec lui ; en QA, seulement avec `tenir=1`
{
  const eff = exemples.get('effet');
  const soin = exemples.get('soin');
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999&tenir=1');
  const ms = await page.evaluate((l) => window.__lqv.actPlay(l), [eff, soin].filter(Boolean));
  await page.waitForTimeout(4200);
  const pose = await page.evaluate(() => { const el = document.querySelector('#activations .act.tenu.wait-click'); return { tenu: el ? 1 : 0, visible: el ? getComputedStyle(el).opacity === '1' : false, invite: document.querySelectorAll('#activations .act-next').length, busy: window.__lqv.activations().busy }; });
  await shot(page, 'tenu-attend-le-clic');
  check('tenue : l’effet du joueur reste posé (visible) après sa durée, l’invite au clic montrée, la file attend', ms === Infinity && pose.tenu === 1 && pose.visible && pose.invite === 1 && pose.busy === true, JSON.stringify({ ms, ...pose }));
  await page.mouse.click(640, 300);
  await page.waitForTimeout(700);
  const apres = await page.evaluate(() => ({ effet: document.querySelectorAll('#activations .act-effet').length, played: window.__lqv.activations().played.map((p) => p.kind) }));
  check('tenue : le clic le fait partir et la file reprend (la pastille de soin passe seule)', apres.effet === 0 && apres.played.includes('soin'), JSON.stringify(apres));
  await page.waitForFunction(() => !window.__lqv.activations().busy, null, { timeout: 8000 }).catch(() => {});
  await page.evaluate((a) => window.__lqv.actPlay([a]), eff);
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  const espace = await page.evaluate(() => document.querySelectorAll('#activations .act').length);
  check('tenue : Espace le fait partir aussi', espace === 0, `${espace} élément(s)`);
  await ctx.close();
}
{
  const { ctx, page } = await openPage('seed=4242&aiDelay=999999');
  const r = await page.evaluate((a) => ({ ms: window.__lqv.actPlay([a]), tenu: document.querySelectorAll('#activations .act.tenu').length }), exemples.get('effet'));
  check('tenue : coupée en QA sans tenir=1 (les pilotes ne cliquent pas)', Number.isFinite(r.ms) && r.tenu === 0, JSON.stringify(r));
  await ctx.close();
}
{
  // un vrai duel avec la tenue : le joueur clique chaque temps fort tenu ; la résolution et le rival reprennent après
  const { ctx, page } = await openPage('scenario=interference&aiDelay=400&tenir=1');
  const t0 = Date.now();
  let clics = 0;
  let tour = 0;
  let maxAttente = 0;
  let depuis = Date.now();
  while (Date.now() - t0 < 120000) {
    const st = await page.evaluate(() => {
      const v = window.__lqv.view();
      return { phase: v.phase, awaitingMe: v.awaitingMe, repelMine: v.phase === 'REPEL' && !!v.repel?.mine, seq: window.__lqv.controller.sequencing, turn: v.turn, tenu: document.querySelectorAll('#activations .act.tenu.wait-click').length };
    });
    tour = Math.max(tour, st.turn);
    if (st.tenu) {
      if (clics === 0) await shot(page, 'tenu-en-duel');
      maxAttente = Math.max(maxAttente, Date.now() - depuis);
      await page.mouse.click(640, 300);
      clics++;
      depuis = Date.now();
      await page.waitForTimeout(150);
      continue;
    }
    if (st.phase === 'ENDED' && !st.seq) break;
    if ((st.awaitingMe || st.repelMine) && !st.seq) {
      const v = await page.evaluate(() => window.__lqv.view());
      const cmd = await decisionIa(v, await page.evaluate(() => window.__lqv.events()));
      if (cmd) await page.evaluate((x) => window.__lqv.apply(x), cmd);
    } else if (st.phase === 'RESOLVED' && !st.seq) {
      await page.evaluate(() => window.__lqv.apply({ type: 'nextTurn' }));
    } else if (st.turn > 5) break;
    await page.waitForTimeout(80);
  }
  check('tenue en duel : des temps forts tenus cliqués, et le duel avance (résolution et rival repartent après le clic)', clics > 0 && tour >= 4, JSON.stringify({ clics, tour }));
  report.tenue = { clics, tour };
  await ctx.close();
}

// planche composite (JPEG) : les genres réels, figés
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const items = report.planche.map((p) => `<figure><img src="data:image/jpeg;base64,${readFileSync(`${OUT}/planche-${p.kind}.jpg`).toString('base64')}"><figcaption>${p.kind} — ${p.title} · ${p.consequence || '—'} (${p.side === 'me' ? 'vous' : 'rival'})</figcaption></figure>`).join('');
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b0810;color:#e8dcc4;font:13px system-ui;padding:14px}h1{font:600 18px Georgia;margin:0 0 10px}div{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}figure{margin:0}img{width:100%;display:block;border-radius:6px}figcaption{padding:4px 2px}</style><h1>M12 — temps forts des activations (réels, figés à mi-course) · ${commit}</h1><div>${items}</div>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/planche-activations.jpg`, type: 'jpeg', quality: 80, fullPage: true });
  await ctx.close();
}

report.consoleErrors = report.console.filter((c) => c.startsWith('error') || c.startsWith('pageerror'));
check('console sans erreur', report.consoleErrors.length === 0, report.consoleErrors.slice(0, 3).join(' | '));
writeFileSync('artifacts/qa/m12/activations.json', JSON.stringify(report, null, 2));
await browser.close();
srv.stop();
console.log(`\n${fail.length ? `ÉCHECS : ${fail.length}` : 'tout est vert'} — ${Object.keys(report.checks).length} vérifications ; captures dans ${OUT}/`);
process.exit(fail.length ? 1 : 0);
