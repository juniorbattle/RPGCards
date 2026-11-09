/**
 * M17 — les écrans des leçons, communs au jeu standard et à l'aventure : la question du profil (A6), la bibliothèque
 * « Leçons » (B4) et la proposition d'une leçon à l'obtention d'un élément (B1). Des fenêtres posées sur la page, comme
 * les confirmations ; Échap ferme.
 */
import { LECONS, LECONS_BASE, LECONS_ELEMENTS, PARTENAIRE, type LeconId } from './catalogue';
import { avecProfil, ecrireLecons, leconsDuProfil, lireLecons, marquerProposee, PROFILS, stockageLecons, type Profil } from './progression';
import { bouton } from './seance';
import { installerStylesLecons } from './styles';

function fenetre(contenu: Array<Node | null>, cle: string, onEchap: () => void): { fermer: () => void; el: HTMLElement } {
  installerStylesLecons();
  const box = document.createElement('div');
  box.className = 'dialog sh-dialog lecon-dialog';
  box.append(...contenu.filter((x): x is Node => !!x));
  const o = document.createElement('div');
  o.className = `overlay sh-confirm ${cle}`;
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-modal', 'true');
  o.append(box);
  const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onEchap(); } };
  document.addEventListener('keydown', key, true);
  document.body.append(o);
  const fermer = () => { document.removeEventListener('keydown', key, true); o.remove(); };
  queueMicrotask(() => o.querySelector<HTMLElement>('[data-premier]')?.focus() ?? o.querySelector<HTMLElement>('button')?.focus());
  return { fermer, el: o };
}

const txt = (tag: string, cls: string | null, t: string): HTMLElement => { const e = document.createElement(tag); if (cls) e.className = cls; e.textContent = t; return e; };

/** La question du profil ; `null` si le joueur ferme sans choisir. Le choix est enregistré. */
export function demanderProfil(intro?: string): Promise<Profil | null> {
  return new Promise((resolve) => {
    const choisir = (p: Profil | null) => {
      f.fermer();
      if (p) ecrireLecons(stockageLecons(), avecProfil(lireLecons(stockageLecons()), p));
      resolve(p);
    };
    const liste = document.createElement('div');
    liste.className = 'lecon-profils';
    for (const [i, p] of PROFILS.entries()) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lecon-profil';
      b.dataset.key = `lecon-profil-${p.id}`;
      if (i === 0) b.dataset.premier = '';
      b.append(txt('b', null, p.label), txt('small', null, p.detail));
      b.addEventListener('click', () => choisir(p.id));
      liste.append(b);
    }
    const f = fenetre([
      txt('div', 'lecon-plaque', PARTENAIRE),
      txt('h2', null, 'Avant de jouer, une question'),
      txt('p', null, intro ?? 'Les duels des Quatre Voies se jouent en Clashs. Pour que je t’explique ce qu’il faut, et seulement ce qu’il faut :'),
      liste,
      txt('p', 'sh-note', 'Tu pourras changer de réponse dans le menu « Leçons ». Cela ne change ni les adversaires ni la difficulté.'),
    ], 'lecon-profil-overlay', () => choisir(null));
  });
}

/** Les leçons de base à proposer après le choix d'un profil (celles qui ne sont pas encore faites). */
export function leconsAProposer(p: Profil): LeconId[] {
  const faites = lireLecons(stockageLecons()).faites;
  return leconsDuProfil(p).filter((id) => !faites.includes(id));
}

/** La bibliothèque « Leçons » (B4) : chaque leçon, faite ou non, rejouable ; `jouer` lance la séance. */
export function bibliotheque(jouer: (ids: LeconId[]) => void, onFerme?: () => void): void {
  const e = lireLecons(stockageLecons());
  const fermer = () => { f.fermer(); onFerme?.(); };
  const ligne = (id: LeconId) => {
    const l = LECONS[id];
    const d = document.createElement('div');
    d.className = 'lecon-ligne';
    d.dataset.lecon = id;
    const corps = document.createElement('div');
    const titre = txt('b', null, l.titre);
    corps.append(titre);
    if (e.aRevoir.includes(id)) corps.append(txt('span', 'badge', 'conseillée'));
    corps.append(txt('small', null, l.resume));
    d.append(txt('span', 'ok', e.faites.includes(id) ? '✓' : ''), corps, bouton(e.faites.includes(id) ? 'Rejouer' : 'Jouer', `lecon-jouer-${id}`, () => { f.fermer(); jouer([id]); }, e.faites.includes(id) ? 'ghost' : ''));
    return d;
  };
  const liste = (ids: readonly LeconId[]) => { const d = document.createElement('div'); d.className = 'lecon-liste'; d.append(...ids.map(ligne)); return d; };
  const profil = PROFILS.find((p) => p.id === e.profil);
  const tete = document.createElement('div');
  tete.className = 'lecon-tete';
  tete.append(txt('span', 'sh-note', `Profil : ${profil?.label ?? 'non choisi'}`), bouton(profil ? 'Changer de profil' : 'Choisir un profil', 'lecon-changer-profil', () => { f.fermer(); void demanderProfil().then(() => bibliotheque(jouer, onFerme)); }, 'ghost'));
  const f = fenetre([
    txt('div', 'lecon-plaque', PARTENAIRE),
    txt('h2', null, 'Leçons'),
    tete,
    txt('div', 'lecon-groupe', `Les bases du duel (${LECONS_BASE.filter((id) => e.faites.includes(id)).length} / ${LECONS_BASE.length})`),
    liste(LECONS_BASE),
    (() => { const r = document.createElement('div'); r.className = 'btn-row'; r.append(bouton('Jouer toutes les bases', 'lecon-jouer-bases', () => { f.fermer(); jouer([...LECONS_BASE]); })); return r; })(),
    txt('div', 'lecon-groupe', 'Les nouveaux éléments'),
    liste(LECONS_ELEMENTS),
    (() => { const r = document.createElement('div'); r.className = 'btn-row'; r.append(bouton('Fermer', 'lecon-fermer', fermer, 'ghost')); return r; })(),
  ], 'lecon-biblio', fermer);
}

/**
 * Proposition à l'obtention d'un élément (B1) : « Essayer maintenant » lance la séance, « Plus tard » la range dans la
 * bibliothèque ; dans les deux cas, la leçon ne sera plus proposée d'elle-même.
 */
export function offrirLecons(ids: readonly LeconId[], intro?: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ids.length) { resolve(false); return; }
    ecrireLecons(stockageLecons(), marquerProposee(lireLecons(stockageLecons()), ids));
    const fin = (oui: boolean) => { f.fermer(); resolve(oui); };
    const noms = ids.map((id) => LECONS[id].titre);
    const r = document.createElement('div');
    r.className = 'btn-row';
    const plusTard = bouton('Plus tard', 'lecon-plus-tard', () => fin(false), 'ghost');
    const oui = bouton('Essayer maintenant', 'lecon-essayer', () => fin(true));
    oui.dataset.premier = '';
    r.append(plusTard, oui);
    const f = fenetre([
      txt('div', 'lecon-plaque', PARTENAIRE),
      txt('h2', null, ids.length > 1 ? 'Nouvelles leçons' : `Nouvelle leçon : ${noms[0]}`),
      txt('p', null, intro ?? `${ids.length > 1 ? `Du nouveau dans ton jeu : ${noms.join(', ')}.` : `${LECONS[ids[0]!].resume}`} Une minute à ma table pour l’essayer, avant de la jouer pour de bon ?`),
      txt('p', 'sh-note', 'Elles restent dans le menu « Leçons ».'),
      r,
    ], 'lecon-offre', () => fin(false));
  });
}
