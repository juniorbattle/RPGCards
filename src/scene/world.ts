/**
 * Repères du monde du duel, communs à l’arène et aux lieux (M08 C2, ADR 022) : la table est un INVARIANT de la
 * composition (son bord lointain ancre la caméra), le décor de chaque lieu se place autour d’elle.
 */
export const TABLE_TOP = 1.05;
export const TABLE_FAR_Z = -2.35;
export const TABLE_NEAR_Z = 6.2;
export const TABLE_W = 22;
/**
 * Centre du cercle de Clash sur la table. M08 (cadres de cartes, ADR 018 amendement 1) : posé sur l’axe du plateau de
 * la vue A (entre la rangée du rival et celle du joueur, y ≈ 63 % de l’écran) au lieu de z 0,1, où l’étoile tombait
 * sous la Primaire du rival ; la table elle-même ne bouge pas.
 */
export const CLASH_Z = 1.38;
