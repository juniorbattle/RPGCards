// Passe 240 — le repère d'objectif de la Promenade libre (demande du responsable du 2026-11-15 ; `src/aventure/repereObjectif.ts`,
// `src/ville/repereEcran.ts`), parcours navigateur : (1) prologue : le losange au-dessus de Kaï, la flèche au bord quand il
// est hors champ, effacé tout près (la bulle prend le relais) ; (2) au Parvis, le passage vers le Quai ; (3) silences :
// dialogue, menu (et son réglage « Repère d'objectif », masqué puis rétabli), fenêtre du duel, duel, Récit guidé (par le
// menu, jusqu'à la Préparation, puis retour) ; (4) l'objectif qui change : les émissaires, la figure du chapitre I, la Salle
// des Bannières, le Championnat (passage vers la Grande Cour, puis le héraut) ; (5) la manette : réglage basculé à la croix
// et à A, le repère jamais focalisable ; (6) le mouvement réduit du jeu : ni fondu ni flottement.
// Captures « avant » (repère masqué : l'écran d'avant la passe) et « après » dans `brut/` pour la planche
// (`tools/repere-objectif-planche.mjs`).
// Usage : npm run build && [LQV_VP=1920x1080] node tools/repere-objectif.mjs [dossier] [rapport.json]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { launch, rendererLabel, startPreview, watchConsole, webglRenderer } from './browser.mjs';

const VP = (process.env.LQV_VP ?? '1280x720').split('x').map(Number);
const DIR = process.argv[2] ?? 'screenshots/qa/retours-2026-11-15';
const OUT = process.argv[3] ?? `artifacts/qa/retours-2026-11-15/repere-${VP[0]}.json`;
const BRUT = join(DIR, 'brut');
const head = execSync('git rev-parse --short HEAD').toString().trim();
mkdirSync(BRUT, { recursive: true });
const server = await startPreview(Number(process.env.LQV_PREVIEW_PORT) || 4301, process.env.LQV_DIST || 'dist');
const browser = await launch();
const issues = [];
const checks = [];
const vues = {};
const check = (ok, what) => { checks.push(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); console.log(`${ok ? 'OK' : 'ÉCHEC'} ${what}`); };
const B = { A: 0, B: 1, START: 9, HAUT: 12, BAS: 13, GAUCHE: 14, DROITE: 15 };
let renderer = '';
const URL_BASE = '/?aventure=1&qa=1&aiDelay=0&profileSeed=31&repere=1';
const PROLOGUE = [{ type: 'scene', id: 'P2' }, { type: 'duelPrologue', issue: 'victoire', faits: { assautsGagnes: 2, gardesGagnees: 2, interferencesReussies: 0 } }];
const battre = (id) => [{ type: 'lancerDefi', figure: id }, { type: 'duelStructurant', figure: id, issue: 'victoire', duel: `qa-${id}` }, { type: 'combat', issue: 'victoire' }];

try {
  const ctx = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  // une manette simulée, au repos jusqu'à la partie (5) (le jeu ne change pas tant qu'on ne la touche pas)
  await ctx.addInitScript(() => {
    const pad = { id: 'Manette simulée (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null, hapticActuators: [], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(Navigator.prototype, 'getGamepads', { configurable: true, value: () => [pad, null, null, null] });
    window.__pad = { set: (i, v) => { pad.buttons[i] = { pressed: v, touched: v, value: v ? 1 : 0 }; } };
  });
  const p = await ctx.newPage();
  p.setDefaultTimeout(90000);
  watchConsole(p, issues);
  const av = (fn, arg) => p.evaluate(fn, arg);
  const brut = async (vue, quand) => writeFileSync(join(BRUT, `${vue}-${quand}-${VP[0]}.png`), await p.screenshot());
  const pret = () => p.waitForFunction(() => { const t = window.__lqvAventure?.town; return !!t && t.stats().frames > 1 && !document.querySelector('.ville-host')?.hidden && !document.querySelector('.ville-fade') && !document.querySelector('.ville-card') && window.__lqvAventure.ecran === 'ville'; }, null, { timeout: 120000 });
  const faire = (evs) => av((x) => { const a = window.__lqvAventure; for (const ev of x) a.faire(ev); a.rafraichir(); }, evs);
  const etat = () => av(() => { const a = window.__lqvAventure; return { g: a.guidageVu?.g ?? null, ecran: a.reperes?.etat() ?? [], ilot: a.town?.ilotId() }; });
  const visibles = () => av(() => [...document.querySelectorAll('.lqv-repere:not(.cache)')].map((e) => e.dataset.repere));
  const presents = () => av(() => document.querySelectorAll('.lqv-repere').length);
  /** Place le joueur à un point libre près de `c` (+dx, +dz), en spirale si le point est pris. */
  const placerPres = (c, dx, dz) => av(([c, dx, dz]) => {
    const a = window.__lqvAventure; const il = a.town.ilot; const b = il.bounds;
    const libre = (x, z) => x > b.x0 + 0.4 && x < b.x1 - 0.4 && z > b.z0 + 0.4 && z < b.z1 - 0.4
      && !il.rects.some((r) => x > r.x0 - 0.35 && x < r.x1 + 0.35 && z > r.z0 - 0.35 && z < r.z1 + 0.35)
      && !il.discs.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + 0.35);
    for (let k = 0; k < 80; k++) { const t = k * 0.7; const r = k * 0.12; const x = c.x + dx + Math.cos(t) * r; const z = c.z + dz + Math.sin(t) * r; if (libre(x, z)) { a.town.place({ x, z }, dx > 0 ? 'gauche' : 'droite'); return { x, z }; } }
    return null;
  }, [c, dx, dz]);
  /** Capture avant (repère masqué) puis après ; garde l'état du repère pour la planche. */
  const paire = async (vue) => {
    await av(() => { window.__lqvAventure.repereAffiche = false; });
    await p.waitForTimeout(650);
    await brut(vue, 'avant');
    await av(() => { window.__lqvAventure.repereAffiche = true; });
    await p.waitForTimeout(900);
    await brut(vue, 'apres');
    const e = await etat();
    vues[vue] = { ilot: e.ilot, reperes: e.ecran };
    return e;
  };
  const voyager = async (ilot, spawn = 'arrivee') => {
    await av(([i, s]) => window.__lqvAventure.voyager(i, s), [ilot, spawn]);
    await p.waitForFunction((i) => window.__lqvAventure.town?.ilotId() === i, ilot);
    await pret();
    await p.waitForTimeout(500);
  };
  const echantillonner = async (ms) => { let max = 0; const t0 = Date.now(); while (Date.now() - t0 < ms) { max = Math.max(max, (await visibles()).length); await p.waitForTimeout(120); } return max; };
  const presser = async (i) => { await av((k) => window.__pad.set(k, true), i); await p.waitForTimeout(70); await av((k) => window.__pad.set(k, false), i); await p.waitForTimeout(170); };

  await p.goto(`${server.base}${URL_BASE}`, { timeout: 90000 });
  renderer = rendererLabel(await webglRenderer(p).catch(() => null));
  await p.click('[data-key="av-new"]');
  await p.fill('[data-key="av-name"]', 'Lou');
  await p.click('[data-key="av-suite"]');
  await p.click('[data-key="av-start"]');
  await pret();

  // (1) le prologue : Kaï
  const kai = await av(() => window.__lqvAventure.town.npcAt('braise'));
  let e = await etat();
  check(e.g?.reperes?.[0]?.id === 'kai-prologue' && !e.g.ailleurs, `prologue : le guide vise Kaï (${e.g?.reperes?.[0]?.nom})`);
  await placerPres(kai, -4.5, 1.2);
  e = await paire('prologue-kai');
  const kp = await av((k) => window.__lqvAventure.town.project({ x: k.x, y: window.__lqvAventure.town.walkerH() + 1.05, z: k.z }), kai);
  const r0 = e.ecran[0];
  check(!!r0 && r0.visible && r0.dedans && r0.cote === 'dessus' && Math.abs(r0.x - kp.x) < 3 && r0.y < kp.y + 3, `le losange au-dessus de Kaï, dans le cadre (${r0?.x}, ${r0?.y})`);
  const txt = await av(() => document.querySelector('.lqv-repere b')?.textContent);
  check(txt === 'Kaï', `il le nomme (« ${txt} »)`);
  check(await av(() => { const el = document.querySelector('.lqv-reperes'); const s = getComputedStyle(el); return s.pointerEvents === 'none' && el.getAttribute('aria-hidden') === 'true' && !el.querySelector('[tabindex], button, a, input'); }), 'jamais cliquable ni focalisable (souris, clavier, manette passent au travers)');
  check(await av(() => { const r = document.querySelector('.lqv-repere-texte')?.getBoundingClientRect(); return !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0; }), 'son nom tient dans l’écran');
  // hors champ : à l'ouest du Quai
  await av(() => { const a = window.__lqvAventure; const b = a.town.ilot.bounds; a.town.place({ x: b.x0 + 1.5, z: 1.4 }, 'gauche'); });
  e = await paire('prologue-hors-champ');
  const r1 = e.ecran[0];
  check(!!r1 && r1.visible && !r1.dedans && r1.cote === 'droite', `Kaï hors champ : la flèche au bord droit (${r1?.cote}, ${r1?.x}, ${r1?.y})`);
  check(await av(() => getComputedStyle(document.querySelector('.lqv-repere-fleche')).display !== 'none'), 'la flèche est dessinée');
  // tout près : la bulle prend le relais
  await placerPres(kai, -1.0, 0.3);
  await p.waitForTimeout(700);
  const bulle = await av(() => window.__lqvAventure.town.zone()?.label ?? null);
  check((await visibles()).length === 0 && /Kaï/.test(bulle ?? ''), `tout près de Kaï, le losange s’efface, la bulle reste (« ${bulle} »)`);

  // (2) au Parvis : le passage vers le Quai
  await voyager('parvis');
  e = await etat();
  check(e.g?.ailleurs && e.g.reperes[0].id === 'sortie-quai' && /Kaï/.test(e.g.reperes[0].detail ?? ''), `au Parvis : « ${e.g?.reperes?.[0]?.nom} » (${e.g?.reperes?.[0]?.detail})`);
  const sortie = await av(() => { const z = window.__lqvAventure.town.ilot.zones.find((x) => x.id === 'sortie-quai'); return { x: (z.area.x0 + z.area.x1) / 2, z: (z.area.z0 + z.area.z1) / 2 }; });
  await placerPres(sortie, 7, 0.2);
  e = await paire('parvis-passage');
  check(e.ecran[0]?.visible, `le passage montré (${e.ecran[0]?.dedans ? 'dans le cadre' : `au bord ${e.ecran[0]?.cote}`})`);

  // (3) silences : un dialogue, le menu et son réglage
  await av(() => window.__lqvAventure.interagir({ id: 'monument-qa', kind: 'info', label: 'Le monument des Quatre Voies', area: { x: 0, z: 0, r: 1 } }));
  await p.waitForSelector('.ville-dialog');
  await p.waitForTimeout(500);
  check((await visibles()).length === 0, 'dialogue ouvert : aucun repère');
  await p.click('.ville-dialog [data-key="dlg-close"]');
  await p.waitForTimeout(800);
  check((await visibles()).length === 1, 'dialogue fermé : le repère revient');
  await av(() => window.__lqvAventure.menu());
  await p.waitForSelector('[data-key="menu-repere"]');
  await p.waitForTimeout(400);
  check((await visibles()).length === 0, 'menu ouvert : aucun repère');
  check(/Repère d’objectif : affiché/.test(await p.textContent('[data-key="menu-repere"]')), 'le menu dit « Repère d’objectif : affiché » (par défaut)');
  await p.click('[data-key="menu-repere"]');
  await p.waitForSelector('[data-key="menu-repere"]');
  check(/masqué/.test(await p.textContent('[data-key="menu-repere"]')) && await av(() => localStorage.getItem('lqv.repere')) === '0', 'un clic le masque (mémorisé dans ce navigateur)');
  await p.click('[data-key="dlg-close"]');
  await p.waitForTimeout(900);
  check(await presents() === 0, 'masqué : aucun repère en ville');
  await av(() => window.__lqvAventure.menu());
  await p.click('[data-key="menu-repere"]');
  await p.click('[data-key="dlg-close"]');
  await p.waitForTimeout(900);
  check((await visibles()).length === 1 && await av(() => localStorage.getItem('lqv.repere')) === '1', 'rétabli : le repère revient');

  // (4) l'objectif qui change : les émissaires
  await faire([...PROLOGUE, { type: 'scene', id: 'P6' }]);
  await voyager('quai');
  e = await etat();
  check(!!e.g && e.g.reperes.every((r) => r.id.startsWith('emissaire-') || r.id.startsWith('sortie-')), `le choix de la voie : ${e.g?.reperes?.map((r) => `${r.nom}${r.detail ? ` (${r.detail})` : ''}`).join(', ')}`);
  if (e.g && !e.g.ailleurs) await placerPres(e.g.reperes[0].at, -4, 1.2);
  await paire('choix-emissaires');

  // le chapitre I : la Cendre ; sa première figure
  await faire([{ type: 'confirmer', famille: 'Cendre' }]);
  await p.waitForTimeout(300);
  e = await etat();
  const figI = await av(() => window.__lqvAventure.etat.vaincues.length === 0 ? 'cadet-Cendre' : null);
  const ouCadet = await av((id) => { const a = window.__lqvAventure; return a.ilotsRecit.find((i) => a.posesDe(i).some((x) => x.id === id)) ?? null; }, figI);
  check(!!ouCadet, `la figure du chapitre I posée (${figI} : ${ouCadet})`);
  if (ouCadet && ouCadet !== e.ilot) {
    check(e.g?.ailleurs === true, `ailleurs : le passage (« ${e.g?.reperes?.[0]?.nom} », ${e.g?.reperes?.[0]?.detail})`);
    await voyager(ouCadet);
  }
  e = await etat();
  check(e.g?.reperes?.[0]?.id === figI, `dans son quartier, le losange vise ${e.g?.reperes?.[0]?.nom}`);
  await placerPres(e.g.reperes[0].at, -4.2, 1.3);
  await paire('chapitre-1-figure');

  // le duel : silence de la fenêtre d'avant-duel au résultat
  await av((id) => window.__lqvAventure.parler(id), figI);
  await p.waitForSelector('.ville-dialog [data-key="dlg-duel"]');
  await p.click('.ville-dialog [data-key="dlg-duel"]');
  await p.waitForSelector('[data-key="av-preparation"]');
  await p.waitForTimeout(500);
  check((await visibles()).length === 0, 'fenêtre d’avant-duel : aucun repère');
  await p.click('[data-key="av-duel-go"]');
  await p.waitForFunction(() => window.__lqvAventure.ecran === 'duel' && window.__lqv?.controller);
  await p.waitForTimeout(800);
  check(await presents() === 0, 'en duel : aucun repère');
  await av(() => window.__lqvAventure.qaTerminer('victoire'));
  await p.waitForSelector('[data-screen="av-resultat"]');
  check(await presents() === 0, 'au résultat : aucun repère');
  await p.click('[data-key="av-retour"]');
  await pret();
  await p.waitForTimeout(900);
  e = await etat();
  check(e.g?.reperes?.[0]?.id !== figI && (await visibles()).length >= 1, `retour en ville : l’objectif a changé (« ${e.g?.reperes?.[0]?.nom} »${e.g?.reperes?.[0]?.detail ? `, ${e.g.reperes[0].detail}` : ''})`);

  // la Salle des Bannières
  await faire([...battre('brasDroit-Cendre'), ...battre('chef-Cendre')]);
  await voyager('quai');
  e = await etat();
  check(e.g?.reperes?.[0]?.id === 'porte-salle' && e.g.reperes[0].nom === 'La Salle des Bannières', `après la cheffe ou le chef : « ${e.g?.reperes?.[0]?.nom} »`);
  await placerPres(e.g.reperes[0].at, 4.5, 2.2);
  e = await paire('bannieres-porte');
  check(e.ecran[0]?.visible && e.ecran[0]?.dedans, 'le losange au-dessus de la porte de la salle');

  // le Championnat : depuis le Quai, le passage vers la Grande Cour ; puis le héraut
  for (const f of ['Ronce', 'Voile', 'Astre']) await faire([{ type: 'engager', famille: f }, ...battre(`cadet-${f}`), ...battre(`brasDroit-${f}`), ...battre(`chef-${f}`)]);
  await p.waitForTimeout(400);
  e = await etat();
  check(e.g?.ailleurs && e.g.reperes[0].id === 'sortie-cour' && /Championnat/.test(e.g.reperes[0].detail ?? ''), `Championnat, depuis le Quai : « ${e.g?.reperes?.[0]?.nom} » (${e.g?.reperes?.[0]?.detail})`);
  await placerPres(e.g.reperes[0].at, 2.5, 3.5);
  await paire('championnat-passage');
  await voyager('cour', 'sortie-quai');
  e = await etat();
  check(e.g?.reperes?.[0]?.id === 'heraut', `dans la Grande Cour : « ${e.g?.reperes?.[0]?.nom} » (${e.g?.reperes?.[0]?.detail})`);
  await placerPres(e.g.reperes[0].at, 4.5, 2.5);
  await paire('championnat-heraut');

  // le Récit guidé (par le menu) : aucun repère, jusqu'à la Préparation ; puis retour à la Promenade libre
  await av(() => window.__lqvAventure.menu());
  await p.click('[data-key="menu-recit"]');
  await p.waitForSelector('[data-key="menu-recit"]');
  await p.click('[data-key="dlg-close"]');
  const maxGuide = await echantillonner(4500);
  const ecranGuide = await av(() => window.__lqvAventure.ecran);
  check(maxGuide === 0, `Récit guidé : aucun repère sur 4,5 s (écran : ${ecranGuide})`);
  await p.waitForFunction(() => window.__lqvAventure.ecran === 'preparation' && !document.querySelector('.av-rideau.en-cours'), null, { timeout: 30000 }).catch(() => {});
  if (await av(() => window.__lqvAventure.ecran === 'preparation')) {
    check(await presents() === 0, 'à la Préparation : aucun repère');
    await av(() => window.__lqvAventure.menu());
    await p.click('[data-key="menu-recit"]');
    await pret();
    await p.waitForTimeout(1000);
    check((await visibles()).length >= 1, 'retour à la Promenade libre : le repère revient');
  } else check(false, `la Préparation attendue (écran : ${await av(() => window.__lqvAventure.ecran)})`);

  // (5) la manette : Start ouvre le menu, la croix va au réglage, A le bascule ; B referme
  await presser(B.START);
  await p.waitForSelector('[data-key="menu-repere"]');
  let atteint = false;
  for (let i = 0; i < 24 && !atteint; i++) {
    atteint = await av(() => document.activeElement?.dataset?.key === 'menu-repere');
    if (!atteint) await presser(B.BAS);
  }
  check(atteint, 'à la manette, la croix atteint « Repère d’objectif »');
  await presser(B.A);
  await p.waitForTimeout(300);
  check(/masqué/.test(await p.textContent('[data-key="menu-repere"]')), 'A le masque');
  await presser(B.B);
  await p.waitForTimeout(900);
  check(await presents() === 0, 'menu refermé (B) : aucun repère');
  await presser(B.START);
  await p.waitForSelector('[data-key="menu-repere"]');
  await av(() => document.querySelector('[data-key="menu-repere"]').focus());
  await presser(B.A);
  await presser(B.B);
  await p.waitForTimeout(900);
  check((await visibles()).length >= 1, 'A le rétablit : le repère revient');
  check(await av(() => !document.activeElement || !document.activeElement.closest('.lqv-reperes')), 'le focus de la manette ne se pose jamais sur un repère');

  // (6) mouvement : le fondu et le flottement, puis le réglage « Mouvement réduit » du jeu
  const plein = await av(() => { const el = document.querySelector('.lqv-repere'); return { t: getComputedStyle(el).transitionDuration, a: getComputedStyle(el.querySelector('.lqv-repere-pin')).animationName }; });
  check(/0\.35s/.test(plein.t) && (plein.a === 'lqv-repere-flotte' || !(await av(() => window.__lqvAventure.reperes.etat()[0]?.dedans))), `réglage par défaut : fondu (${plein.t}) et flottement (${plein.a})`);
  await av(() => { const a = window.__lqvAventure; a.params.reducedMotion = true; a.appliquerMouvement(); });
  await p.waitForTimeout(200);
  const reduit = await av(() => { const el = document.querySelector('.lqv-repere'); return { t: getComputedStyle(el).transitionDuration, a: getComputedStyle(el.querySelector('.lqv-repere-pin')).animationName }; });
  check(/^0s/.test(reduit.t) && reduit.a === 'none', `« Mouvement réduit » : ni fondu (${reduit.t}) ni flottement (${reduit.a})`);
  await av(() => window.__lqvAventure.menu());
  await p.waitForTimeout(50);
  check(await presents() === 0, 'mouvement réduit : le repère s’efface d’un coup à l’ouverture du menu');
  await p.click('[data-key="dlg-close"]');
  await av(() => { const a = window.__lqvAventure; a.params.reducedMotion = false; a.appliquerMouvement(); });
  await ctx.close();

  // QA sans `repere=1` : ni repère ni entrée de menu (parcours d'avant identiques)
  const ctx2 = await browser.newContext({ viewport: { width: VP[0], height: VP[1] }, deviceScaleFactor: 1 });
  const p2 = await ctx2.newPage();
  watchConsole(p2, issues);
  await p2.goto(`${server.base}/?aventure=1&qa=1&aiDelay=0&profileSeed=31`, { timeout: 90000 });
  await p2.click('[data-key="av-new"]');
  await p2.fill('[data-key="av-name"]', 'Lou');
  await p2.click('[data-key="av-suite"]');
  await p2.click('[data-key="av-start"]');
  await p2.waitForFunction(() => window.__lqvAventure?.ecran === 'ville' && window.__lqvAventure.town?.stats().frames > 5, null, { timeout: 120000 });
  await p2.waitForTimeout(1200);
  const sans = await p2.evaluate(() => ({ n: document.querySelectorAll('.lqv-repere').length, affiche: window.__lqvAventure.repereAffiche }));
  await p2.evaluate(() => window.__lqvAventure.menu());
  await p2.waitForSelector('[data-key="menu-recit"]');
  const entree = await p2.evaluate(() => !!document.querySelector('[data-key="menu-repere"]'));
  check(sans.n === 0 && !sans.affiche && !entree, 'en QA sans `repere=1` : aucun repère, aucune entrée de menu');
  await ctx2.close();
} catch (err) {
  check(false, `exception : ${err?.message ?? err}`);
  console.error(err);
} finally {
  await browser.close();
  await server.stop();
}
check(issues.length === 0, `console propre (${issues.length})`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ head, renderer, viewport: VP, checks, issues, vues }, null, 2));
const ko = checks.filter((c) => c.startsWith('ÉCHEC')).length;
console.log(`${checks.length - ko}/${checks.length} — ${renderer}`);
process.exit(ko ? 1 : 0);
