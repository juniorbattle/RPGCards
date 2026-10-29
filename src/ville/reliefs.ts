/**
 * Relief des plans peints (retour du responsable du 2026-10-29 : « les décors props qui représentent des images en
 * billboard […] brisent l'immersion […] une image avec un escalier […] l'escalier semble aplati ; […] une taverne avec son
 * intérieur […] l'intérieur aplati »). Pour chaque image du décor, les formes qui ne sont pas dans le plan de sa façade,
 * avec leur profondeur en mètres : en retrait (intérieurs ouverts, arcades, portes, clochers et dômes derrière la
 * façade), en saillie (escaliers, balcons, auvents, vitrines, tours). Le nuanceur des plans (`diorama.ts`) en tire une parallaxe, par lancer de rayon
 * dans la carte des profondeurs : vue de biais, l'intérieur d'une arcade glisse derrière ses piliers, un escalier
 * s'avance devant le mur. Vu de face (le cadrage de référence), rien ne change. Les toits restent dans le plan : leurs
 * cheminées et leurs flèches, fines, se tordraient dans un dégradé.
 *
 * Aucune image n'est créée ni modifiée : les formes sont des données (pixels de l'image d'origine), la carte des
 * profondeurs se trace au chargement (`tracerRelief`), comme un masque.
 */

/** Profondeur (m) : constante, ou `[haut, bas]` (dégradé vertical : un escalier qui vient vers la caméra, un toit). */
export type Prof = number | readonly [number, number];

/**
 * Une forme, en pixels de l'image : `arc` (ouverture en plein cintre : x0, x1, naissance de l'arc, sommet, bas),
 * `rect` (x0, y0, x1, y1) ou `poly` (sommets). Les formes se tracent dans l'ordre : la dernière l'emporte.
 */
export type Forme =
  | { arc: readonly [number, number, number, number, number]; prof: Prof }
  | { rect: readonly [number, number, number, number]; prof: Prof }
  | { poly: readonly (readonly [number, number])[]; prof: Prof };

/** Bornes des profondeurs encodées (m) : saillie jusqu'à 2,5 m devant le plan, retrait jusqu'à 4 m derrière. */
export const RELIEF_MIN = -2.5;
export const RELIEF_MAX = 4;

/** Profondeur (m) → niveau de la carte (0 à 255) ; le plan de la façade (0 m) vaut `encoder(0)`. */
export const encoder = (prof: number): number => Math.round(Math.min(1, Math.max(0, (prof - RELIEF_MIN) / (RELIEF_MAX - RELIEF_MIN))) * 255);

/** Ouverture en plein cintre (sommets) : jambages droits sous la naissance, demi-ellipse au-dessus. */
export function sommetsArc(a: readonly [number, number, number, number, number], n = 16): [number, number][] {
  const [x0, x1, naissance, sommet, bas] = a;
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = naissance - sommet;
  const pts: [number, number][] = [[x0, bas], [x0, naissance]];
  for (let i = 1; i < n; i++) {
    const t = Math.PI - (i / n) * Math.PI;
    pts.push([cx + Math.cos(t) * rx, naissance - Math.sin(t) * ry]);
  }
  pts.push([x1, naissance], [x1, bas]);
  return pts;
}

/** Sommets d'une forme (pixels de l'image). */
export function sommets(f: Forme): [number, number][] {
  if ('arc' in f) return sommetsArc(f.arc);
  if ('rect' in f) { const [x0, y0, x1, y1] = f.rect; return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; }
  return f.poly.map(([x, y]) => [x, y]);
}

/** Disque (rose, oculus) en polygone. */
const disque = (cx: number, cy: number, r: number, prof: Prof): Forme => ({ poly: Array.from({ length: 20 }, (_, i) => [cx + Math.cos((i / 20) * Math.PI * 2) * r, cy + Math.sin((i / 20) * Math.PI * 2) * r] as const), prof });

/** Intérieur ouvert sous une arcade : le fond (`fond` m), puis le sol et les marchandises qui reviennent vers le seuil. */
const interieur = (arc: readonly [number, number, number, number, number], fond: number, solDe: number): Forme[] => [
  { arc, prof: fond },
  { rect: [arc[0], solDe, arc[1], arc[4]], prof: [fond * 0.75, 0.25] },
];

/** Escalier qui descend vers la caméra : la marche du haut au mur, celle du bas en saillie de `saillie` m. */
const escalier = (rect: readonly [number, number, number, number], saillie: number): Forme => ({ rect, prof: [0, -saillie] });

/**
 * Les reliefs, par image du décor (`public/decors/`). Coordonnées relevées sur les images, grille de 50 px
 * (planches de relevé : `screenshots/qa/retours-2026-10-29/reliefs/`).
 */
export const RELIEFS: Readonly<Record<string, readonly Forme[]>> = {
  // la Halle (place de la Halle, Quai), la maison du Puits (placette du Puits), la chapelle (Grande Cour du Quai)
  'rangs-monuments.png': [
    // Halle : le clocheton en retrait sur le faîte
    { rect: [288, 0, 380, 226], prof: 3 },
    // Halle : trois arcades ouvertes sur la halle (étals, lanternes), profondes de 3 m
    ...interieur([72, 222, 650, 578, 862], 3, 744),
    ...interieur([258, 410, 650, 578, 862], 3, 744),
    ...interieur([447, 599, 650, 578, 862], 3, 744),
    // maison du Puits : auvent et balcon en saillie, vitrine en encorbellement, porte en retrait en haut du perron
    { rect: [800, 318, 1052, 382], prof: [-0.25, -1.1] },
    { rect: [736, 438, 1106, 526], prof: -0.9 },
    { rect: [704, 556, 942, 772], prof: -0.45 },
    { arc: [964, 1050, 600, 556, 752], prof: 0.4 },
    escalier([936, 750, 1080, 866], 1.5),
    // chapelle : clocher en retrait sur le pignon, rose et portail en retrait
    { rect: [1252, 40, 1378, 290], prof: 1.4 },
    disque(1310, 425, 56, 0.3),
    { arc: [1260, 1370, 650, 604, 852], prof: 0.5 },
  ],
  // la Place du Fanal : la remise des cordiers ouverte, le portail de la remise d'en face et la porte du phare en retrait
  'quartiers-port-fanal.png': [
    ...interieur([164, 398, 772, 700, 956], 3, 862),
    { arc: [1030, 1246, 760, 700, 956], prof: 0.4 },
    { arc: [656, 760, 800, 760, 956], prof: 0.5 },
  ],
  // le premier rang du Quai : le passage voûté vers la ruelle, la taverne ouverte, la Salle des Bannières, les échoppes
  'quai-facades.png': [
    { arc: [60, 250, 640, 570, 993], prof: 4 },
    ...interieur([470, 760, 780, 700, 993], 3, 900),
    { arc: [1100, 1310, 720, 640, 993], prof: 0.5 },
    disque(1210, 260, 70, 0.3),
    { rect: [1530, 730, 1700, 782], prof: [-0.2, -0.9] },
    { rect: [1550, 790, 1700, 930], prof: 0.8 },
    { arc: [1760, 1830, 800, 760, 993], prof: 0.4 },
    { rect: [1900, 570, 2390, 640], prof: -0.6 },
    { arc: [2010, 2140, 800, 750, 993], prof: 0.45 },
    { rect: [2450, 720, 2670, 792], prof: [-0.2, -1] },
    { rect: [2470, 800, 2660, 930], prof: 0.8 },
    { arc: [2930, 3140, 750, 670, 993], prof: 0.5 },
  ],
  // frises des rangs du fond : les remises ouvertes (tonneaux, cordages) et leurs vantaux, les escaliers le long des façades
  'rangs-frise-a.png': [
    ...interieur([1350, 1620, 579, 578, 834], 3, 760),
    { rect: [1290, 590, 1350, 834], prof: -0.35 },
    { rect: [1620, 590, 1700, 834], prof: -0.35 },
    { poly: [[1715, 834], [1715, 705], [1790, 560], [1885, 560], [1885, 834]], prof: -1.2 },
  ],
  'rangs-frise-b.png': [
    { poly: [[845, 834], [845, 525], [905, 515], [1005, 705], [1005, 834]], prof: -1.2 },
    ...interieur([1100, 1370, 599, 598, 834], 3, 760),
    { rect: [1020, 600, 1100, 834], prof: -0.35 },
    { rect: [1370, 600, 1450, 834], prof: -0.35 },
    ...interieur([2830, 3075, 596, 595, 834], 3, 760),
    { rect: [3075, 600, 3150, 834], prof: -0.35 },
    { poly: [[3170, 834], [3170, 710], [3235, 565], [3335, 560], [3335, 834]], prof: -1.2 },
  ],
  // objets des villes : le monument des Quatre Voies (vasque, colonne au centre), l'estrade du héraut et ses marches,
  // l'étal à auvent ; le plan est posé au bord avant de l'objet, le reste est derrière
  'villes-objets.png': [
    { rect: [170, 20, 420, 390], prof: 1.5 },
    { rect: [95, 385, 500, 455], prof: [2.2, 0.1] },
    { rect: [565, 40, 995, 398], prof: 1 },
    { rect: [565, 395, 995, 445], prof: [2, 0.1] },
    { rect: [650, 445, 890, 532], prof: [-0.1, -1.2] },
    { rect: [560, 585, 970, 690], prof: [0.9, 0.1] },
    { rect: [580, 690, 950, 860], prof: 0.8 },
  ],
  // mobilier des rangs : le puits (toit et treuil au centre), la fontaine adossée, l'étal des poissons
  'rangs-mobilier.png': [
    { rect: [120, 60, 400, 300], prof: 0.7 },
    { rect: [700, 70, 830, 310], prof: 1.3 },
    { rect: [590, 300, 930, 362], prof: [1.6, 0.1] },
    { rect: [1050, 80, 1430, 240], prof: 1 },
    { rect: [1060, 240, 1420, 335], prof: [0.8, 0.2] },
  ],
  // la Grande Cour : la grande porte ouverte sur la salle, les échoppes en arcades, le clocheton en retrait
  'villes-cour-facades.png': [
    { rect: [673, 0, 791, 227], prof: 2.5 },
    ...interieur([609, 809, 836, 782, 993], 3, 930),
    ...interieur([64, 218, 855, 800, 993], 1.8, 930),
    ...interieur([218, 382, 855, 800, 993], 1.8, 930),
    ...interieur([1082, 1236, 855, 800, 993], 1.8, 930),
    ...interieur([1236, 1391, 855, 800, 993], 1.8, 930),
    { rect: [100, 745, 336, 800], prof: [-0.2, -0.9] },
    { rect: [1118, 745, 1355, 800], prof: [-0.2, -0.9] },
  ],
  // les Ruelles : la maison de la guilde, ses quatre arcades ouvertes sur la salle (tables, lanternes), sa galerie
  'villes-ruelles-guilde.png': [
    { rect: [650, 30, 780, 240], prof: 2.5 },
    { rect: [0, 560, 1443, 640], prof: -0.6 },
    ...interieur([82, 309, 764, 700, 972], 3, 880),
    ...interieur([455, 673, 764, 700, 972], 3, 880),
    ...interieur([764, 990, 764, 700, 972], 3, 880),
    ...interieur([1109, 1327, 764, 700, 972], 3, 880),
  ],
  'villes-ruelles-canal.png': [
    { rect: [215, 700, 451, 764], prof: [-0.2, -1] },
    { rect: [233, 791, 445, 964], prof: 1.2 },
    { rect: [495, 709, 700, 800], prof: [-0.2, -1] },
    { rect: [505, 818, 691, 982], prof: 0.3 },
    { arc: [827, 936, 790, 745, 972], prof: 0.4 },
    { rect: [1045, 709, 1200, 827], prof: -0.5 },
    { rect: [1345, 809, 1436, 964], prof: 0.4 },
  ],
  // le Parvis : la porte du Tournoi ouverte sur l'arène, les herses en retrait, les tours en saillie
  'villes-parvis-porte.png': [
    { rect: [0, 100, 191, 931], prof: -0.8 },
    { rect: [1273, 100, 1440, 931], prof: -0.8 },
    ...interieur([618, 836, 690, 585, 931], 4, 840),
    { arc: [218, 391, 718, 636, 931], prof: 0.7 },
    { arc: [1036, 1200, 718, 636, 931], prof: 0.7 },
  ],
  // la Place du Fanal : la maison de la Ronce (porte en retrait, balcon, clocheton en retrait)
  'quartiers-port-ronce.png': [
    { rect: [636, 0, 718, 200], prof: 2 },
    { rect: [545, 482, 827, 545], prof: -0.7 },
    { arc: [582, 800, 700, 627, 965], prof: 0.5 },
  ],
  // la Ville haute : les Hôtels (arcades du rez-de-chaussée : bibliothèques, cabinets, portes), l'Observatoire ouvert
  'quartiers-haute-hotels.png': [
    { arc: [40, 167, 727, 682, 951], prof: 0.4 },
    ...interieur([204, 331, 727, 682, 951], 1.5, 890),
    ...interieur([385, 509, 727, 682, 951], 1.5, 890),
    { arc: [578, 655, 727, 682, 951], prof: 0.4 },
    { arc: [700, 809, 727, 682, 951], prof: 0.4 },
    { arc: [845, 927, 727, 682, 951], prof: 0.4 },
    { arc: [1027, 1131, 727, 682, 951], prof: 0.4 },
    ...interieur([1173, 1273, 727, 682, 951], 1.5, 890),
    ...interieur([1305, 1436, 727, 682, 951], 1.5, 890),
  ],
  'quartiers-haute-observatoire.png': [
    { rect: [373, 0, 900, 300], prof: 3 },
    { rect: [355, 300, 909, 527], prof: 1.5 },
    ...interieur([545, 764, 727, 627, 939], 3, 860),
  ],
};

/**
 * Le morceau d'image d'un plan (`uv` : u0, v0, u1, v1, comptés depuis le haut) touche-t-il une forme de relief ? Un plan
 * sans relief garde le nuanceur d'origine (aucun lancer de rayon pour rien).
 */
export function reliefDansMorceau(file: string, size: readonly [number, number], uv: readonly [number, number, number, number] = [0, 0, 1, 1]): boolean {
  const formes = RELIEFS[file];
  if (!formes?.length) return false;
  const [x0, y0, x1, y1] = [uv[0] * size[0], uv[1] * size[1], uv[2] * size[0], uv[3] * size[1]];
  return formes.some((f) => {
    const pts = sommets(f);
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    return Math.max(...xs) > x0 && Math.min(...xs) < x1 && Math.max(...ys) > y0 && Math.min(...ys) < y1;
  });
}
