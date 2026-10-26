// Finalisation de la ville (M09, passe 137 ; décision du responsable : heure de ville « Tout préparer ») — **heure de ville
// simulée** : le directeur des rencontres (le module du jeu, `src/aventure/directeur.ts`) sur une heure type, au début de
// chaque chapitre (points de départ du jeu, `src/aventure/departs.ts`), pour des profils de graines différentes. Ce n'est
// pas le jugement du responsable (V1 : « rencontres jugées non intrusives ») : ce sont les chiffres qui l'accompagnent.
//
// Heure type (modèle déclaré, pas une mesure de joueur) : 40 arrivées dans un îlot (une marche au hasard sur les sorties
// réelles de la ville en rangs, les deux quartiers ajoutés ouverts) et un duel toutes les 4 arrivées (10 duels) ; une
// rumeur présente est écoutée ; au moment d'un duel, une rencontre facultative présente est acceptée 6 fois sur 10 (sinon
// un duel de la trame, sans effet sur le directeur) ; hors duel, une rencontre facultative présente est refusée 3 fois
// sur 10. L'état de l'aventure ne change pas pendant l'heure (chaque chapitre est mesuré à son début).
// Usage : npx tsx tools/m09-heure-ville.ts [profils=200] [dossier=artifacts/qa/m09/finalisation]
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { FAMILIES } from '../src/game/catalog/cards';
import { hashString, makeRng } from '../src/game/engine/rng';
import { battre, conclure, decider, MAX_FACULTATIVES, nouveauDirecteur } from '../src/aventure/directeur';
import { aventureAuDepart, DEPARTS } from '../src/aventure/departs';
import { ilotDef, QUARTIERS_AJOUTES, type IlotId } from '../src/ville/ilots';

const PROFILS = Number(process.argv[2] ?? 200);
const DIR = process.argv[3] ?? 'artifacts/qa/m09/finalisation';
const ARRIVEES = 40;
const DUEL_TOUTES = 4;
const AT = '2026-10-25T22:00:00.000Z';
const OUVERTS = new Set<IlotId>(QUARTIERS_AJOUTES);
const ILOTS: IlotId[] = ['quai', 'parvis', 'ruelles', 'cour', 'port', 'haute'];
const VOISINS = Object.fromEntries(ILOTS.map((id) => [id, [...new Set(Object.values(ilotDef(id, true, OUVERTS).exits).map((x) => x.to))]])) as Record<IlotId, IlotId[]>;
const FACULTATIF = new Set(['facultative', 'rival', 'ambiance']);

interface Mesure {
  arrivees: number; vides: number; une: number; deux: number; plusDeDeux: number;
  nouvelles: number; rumeurs: number; duelsRue: number; ombres: number; refus: number; relances: number;
  parIlot: Record<string, { arrivees: number; presentes: number }>;
  ombresMaxProfil: number;
}

function heure(chapitre: (typeof DEPARTS)[number], profil: number): Mesure {
  const f = FAMILIES[profil % 4]!;
  const e = aventureAuDepart(chapitre, f, AT);
  let d = nouveauDirecteur(hashString(`heure:${profil}`));
  const rng = makeRng(hashString(`marche:${chapitre}:${profil}`));
  const m: Mesure = { arrivees: 0, vides: 0, une: 0, deux: 0, plusDeDeux: 0, nouvelles: 0, rumeurs: 0, duelsRue: 0, ombres: 0, refus: 0, relances: 0, parIlot: {}, ombresMaxProfil: 0 };
  const vus: Partial<Record<IlotId, Set<string>>> = {};
  const refuses: Partial<Record<IlotId, Set<string>>> = {};
  let ici: IlotId = 'quai';
  for (let a = 0; a < ARRIVEES; a++) {
    const voisins: IlotId[] = VOISINS[ici];
    ici = voisins[Math.floor(rng() * voisins.length)]!;
    const r = decider(d, e, ici, true);
    d = r.directeur;
    const fac = r.poses.filter((p) => FACULTATIF.has(p.genre));
    m.arrivees++;
    (m.parIlot[ici] ??= { arrivees: 0, presentes: 0 }).arrivees++;
    m.parIlot[ici]!.presentes += fac.length;
    if (fac.length === 0) m.vides++; else if (fac.length === 1) m.une++; else if (fac.length === 2) m.deux++; else m.plusDeDeux++;
    const avant = vus[ici] ?? new Set<string>();
    for (const p of fac) {
      if (!avant.has(p.id)) { m.nouvelles++; if (p.genre === 'rival') m.ombres++; }
      // « sans redemander » : un personnage refusé n'est plus là à l'arrivée suivante dans le même îlot
      if (refuses[ici]?.has(p.id)) m.relances++;
    }
    refuses[ici] = new Set();
    vus[ici] = new Set(fac.map((p) => p.id));
    for (const p of fac.filter((x) => x.genre === 'ambiance')) { m.rumeurs++; d = conclure(d, p.id, true); vus[ici]!.delete(p.id); }
    const duels = fac.filter((x) => x.genre !== 'ambiance');
    if (a % DUEL_TOUTES === DUEL_TOUTES - 1) {
      const p = duels[0];
      if (p && rng() < 0.6) { m.duelsRue++; d = conclure(d, p.id, true); vus[ici]!.delete(p.id); }
      d = battre(d);
    } else if (duels[0] && rng() < 0.3) {
      m.refus++;
      d = conclure(d, duels[0].id, false);
      refuses[ici]!.add(duels[0].id);
    }
  }
  m.ombresMaxProfil = m.ombres;
  return m;
}

const lignes: string[] = [];
const json: Record<string, unknown> = {};
for (const ch of DEPARTS) {
  const t = { arrivees: 0, vides: 0, une: 0, deux: 0, plusDeDeux: 0, nouvelles: 0, rumeurs: 0, duelsRue: 0, ombres: 0, refus: 0, relances: 0, ombresMax: 0 };
  const parIlot: Record<string, { arrivees: number; presentes: number }> = {};
  for (let p = 0; p < PROFILS; p++) {
    const m = heure(ch, p);
    for (const k of Object.keys(t) as (keyof typeof t)[]) if (k !== 'ombresMax') t[k] += (m as unknown as Record<string, number>)[k] ?? 0;
    t.ombresMax = Math.max(t.ombresMax, m.ombresMaxProfil);
    for (const [il, v] of Object.entries(m.parIlot)) { const x = (parIlot[il] ??= { arrivees: 0, presentes: 0 }); x.arrivees += v.arrivees; x.presentes += v.presentes; }
  }
  const pc = (x: number) => `${Math.round((100 * x) / t.arrivees)} %`;
  const parH = (x: number) => (x / PROFILS).toFixed(1);
  json[ch] = { ...t, profils: PROFILS, parIlot };
  lignes.push(`| ${ch} | ${pc(t.vides)} | ${pc(t.une)} | ${pc(t.deux)} | ${t.plusDeDeux} | ${parH(t.nouvelles)} | ${parH(t.rumeurs)} | ${parH(t.duelsRue)} | ${parH(t.ombres)} (max ${t.ombresMax}) | ${parH(t.refus)} | ${t.relances} | ${ILOTS.map((il) => `${(parIlot[il]!.presentes / Math.max(1, parIlot[il]!.arrivees)).toFixed(2)}`).join(' / ')} |`);
}
const head = execSync('git rev-parse --short HEAD').toString().trim();
const md = `# Heure de ville simulée (finalisation de la ville, passe 137)

Commit \`${head}\`, ${new Date().toISOString().slice(0, 10)} ; \`npx tsx tools/m09-heure-ville.ts ${PROFILS}\`. Directeur des rencontres du jeu
(\`src/aventure/directeur.ts\`), ville en rangs avec la Place du Fanal et la Ville haute ouvertes, **${PROFILS} profils** par
chapitre (graines différentes, familles d'accueil en alternance), chacun au début du chapitre (\`src/aventure/departs.ts\`).

**Heure type (modèle déclaré, pas une mesure de joueur)** : ${ARRIVEES} arrivées dans un îlot (marche au hasard sur les sorties
réelles) et un duel toutes les ${DUEL_TOUTES} arrivées ; une rumeur présente est écoutée ; au moment d'un duel, une rencontre
facultative présente est acceptée 6 fois sur 10 ; hors duel, elle est refusée 3 fois sur 10.

Rencontres **facultatives** comptées : duels de rue, membres des familles, l'ombre de Kaï, rumeurs (les figures de la
trame, posées en permanence, ne sont pas comptées). Garanties du contrat : jamais plus de ${MAX_FACULTATIVES} à la fois ;
aucun tirage hors d'un point de décision ; un refusé ne redemande pas (« relances » : un refusé encore là à l'arrivée
suivante dans le même îlot) ; Kaï au plus une fois par chapitre.

| Chapitre | arrivées sans rencontre | avec 1 | avec 2 | plus de 2 | nouvelles rencontres / heure | rumeurs écoutées / heure | duels de rue joués / heure | ombre de Kaï / heure | refus / heure | relances | rencontres présentes par arrivée (Quai / Parvis / Ruelles / Cour / Port / Haute) |
|---|---|---|---|---|---|---|---|---|---|---|---|
${lignes.join('\n')}

Lecture : ces chiffres disent **combien** la ville propose ; **si c'est intrusif** reste le jugement du responsable
(heure jouée, V1 de la fiche M10-E ; page \`docs/HEURE_DE_VILLE.md\`).
`;
mkdirSync(DIR, { recursive: true });
writeFileSync(`${DIR}/heure-simulee.md`, md);
writeFileSync(`${DIR}/heure-simulee.json`, `${JSON.stringify({ date: new Date().toISOString(), commit: head, profils: PROFILS, arrivees: ARRIVEES, duelToutes: DUEL_TOUTES, chapitres: json }, null, 2)}\n`);
console.log(md);
