/**
 * Options (M04) : présentation et accessibilité (jamais les règles), conseils, mode démo de
 * collection, seed esthétique ; gestion de la sauvegarde (exporter, importer, effacer).
 */
import { parseSave } from '../product/save';
import { downloadText } from './screens';
import type { Shell } from './shell';
import { btn, chip, cls, confirmDialog, h, screen } from './ui';
import { son } from '../son/moteur';

export function renderOptions(sh: Shell, inDuel: boolean): HTMLElement {
  const save = sh.save;
  const o = save?.options;
  const p = sh.params;
  // Avec un profil : option sauvegardée puis appliquée ; sans profil : réglage de la session seulement.
  const commit = (fn: () => void) => {
    fn();
    if (save) { sh.persist(); sh.applyOptions(); } else sh.applyParams();
    sh.live?.session.render();
    sh.render();
  };
  const seg = (label: string, key: string, items: Array<[string, string, boolean, () => void]>) => h('div', { class: 'sh-opt' },
    h('span', { class: 'sh-opt-l', id: `opt-${key}` }, label),
    h('div', { class: 'sh-seg', role: 'radiogroup', 'aria-labelledby': `opt-${key}` }, items.map(([k, t, on, fn]) => h('button', { class: cls('sh-filter', on && 'on'), type: 'button', role: 'radio', 'aria-checked': String(on), 'data-key': `opt-${key}-${k}`, onclick: () => commit(fn) }, t))));
  const rows: HTMLElement[] = [
    seg('Rythme des animations', 'pace', [['normal', 'Normal', p.pace === 'normal', () => { p.pace = 'normal'; if (save) save.options.pace = 'normal'; }], ['fast', 'Rapide', p.pace === 'fast', () => { p.pace = 'fast'; if (save) save.options.pace = 'fast'; }], ['instant', 'Instantané', p.pace === 'instant', () => { p.pace = 'instant'; if (save) save.options.pace = 'instant'; }]]),
    seg('Mouvement réduit', 'motion', [
      ['system', 'Comme le système', save ? o!.reducedMotion === null : false, () => { if (save) save.options.reducedMotion = null; else p.reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; }],
      ['on', 'Activé', save ? o!.reducedMotion === true : p.reducedMotion, () => { if (save) save.options.reducedMotion = true; else p.reducedMotion = true; }],
      ['off', 'Désactivé', save ? o!.reducedMotion === false : !p.reducedMotion, () => { if (save) save.options.reducedMotion = false; else p.reducedMotion = false; }],
    ]),
    h('div', { class: 'sh-opt' }, h('span', { class: 'sh-opt-l' }, `Taille du texte : ${Math.round(p.scale * 100)} %`),
      h('div', { class: 'sh-seg' },
        btn('A−', () => commit(() => { p.scale = Math.max(0.8, Math.round((p.scale - 0.1) * 10) / 10); if (save) save.options.scale = p.scale; }), { ghost: true, key: 'opt-scale-down', disabled: p.scale <= 0.8 }),
        btn('A+', () => commit(() => { p.scale = Math.min(1.5, Math.round((p.scale + 0.1) * 10) / 10); if (save) save.options.scale = p.scale; }), { ghost: true, key: 'opt-scale-up', disabled: p.scale >= 1.5 }))),
    // M11-E : le son (synthétisé par code) : coupure et volume général, mémorisés dans ce navigateur (`lqv.son`)
    seg('Son', 'son', [['on', 'Activé', !son().reglages().coupe, () => son().regler({ coupe: false })], ['off', 'Coupé', son().reglages().coupe, () => son().regler({ coupe: true })]]),
    h('div', { class: 'sh-opt' }, h('span', { class: 'sh-opt-l' }, `Volume : ${Math.round(son().reglages().volume * 100)} %${son().permis ? '' : ' (son désactivé par l’adresse)'}`),
      h('div', { class: 'sh-seg' },
        btn('−', () => commit(() => son().regler({ volume: son().reglages().volume - 0.1 })), { ghost: true, key: 'opt-son-moins', disabled: son().reglages().volume <= 0 }),
        btn('+', () => commit(() => son().regler({ volume: son().reglages().volume + 0.1 })), { ghost: true, key: 'opt-son-plus', disabled: son().reglages().volume >= 1 }))),
  ];
  if (save && o) {
    rows.push(seg('Conseils pendant le duel', 'tips', [['on', 'Affichés', o.tips, () => { save.options.tips = true; }], ['off', 'Masqués', !o.tips, () => { save.options.tips = false; }]]));
    rows.push(h('div', { class: 'sh-opt' }, h('span', { class: 'sh-opt-l' }, `Conseils déjà lus : ${save.tipsSeen.length}`), btn('Tout réafficher', () => commit(() => { save.tipsSeen = []; }), { ghost: true, key: 'opt-tips-reset', disabled: !save.tipsSeen.length })));
    rows.push(seg('Collection (mode démo)', 'full', [['off', 'Progression', !o.fullCollection, () => { save.options.fullCollection = false; }], ['on', 'Tout le catalogue', o.fullCollection, () => { save.options.fullCollection = true; }]]));
    rows.push(h('p', { class: 'sh-note' }, chip('démo', 'proto'), ' « Tout le catalogue » rend équipables les 16 variantes, 4 Signatures et 6 Techniques sans les débloquer : réversible, sans effet sur l’historique. Revenir en « Progression » peut rendre votre deck illégal : il faudra le corriger avant le prochain duel.'));
    rows.push(h('div', { class: 'sh-opt' },
      h('label', { class: 'sh-opt-l', for: 'opt-art' }, 'Seed esthétique (illustrations, rival)'),
      h('div', { class: 'sh-seg' },
        h('input', { id: 'opt-art', class: 'sh-input small', type: 'number', min: '0', max: '999999', value: String(o.artSeed), disabled: inDuel ? true : null, 'data-key': 'opt-art' }),
        btn('Appliquer', () => {
          const v = Math.floor(Number((document.getElementById('opt-art') as HTMLInputElement).value));
          if (!Number.isFinite(v) || v < 0) { sh.toast('Seed esthétique : entier positif attendu.', 'error'); return; }
          save.options.artSeed = v;
          sh.persist();
          sh.applyOptions();
          sh.d.resetArena();
          sh.render();
        }, { ghost: true, key: 'opt-art-apply', disabled: inDuel, title: inDuel ? 'Modifiable hors duel' : 'N’affecte jamais le tirage des cartes' }))));
  }
  const saveRows = save ? [
    h('h2', null, 'Sauvegarde locale'),
    h('p', { class: 'sh-note' }, sh.store.available ? 'Enregistrée automatiquement dans ce navigateur à chaque étape (aucun compte, aucun envoi réseau). Une copie de secours de la version précédente est conservée.' : 'Stockage local indisponible : la progression sera perdue à la fermeture.'),
    h('div', { class: 'btn-row start' },
      btn('Exporter (fichier)', () => downloadText(`les-quatre-voies-${save.profile.name.replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(save, null, 2)), { ghost: true, key: 'opt-export' }),
      inDuel ? null : importButton(sh),
      inDuel ? null : btn('Effacer la sauvegarde…', () => void sh.eraseSave(), { ghost: true, key: 'opt-erase', danger: true })),
  ] : [];
  return screen('options', 'Options', inDuel ? 'Duel en pause — les réglages s’appliquent immédiatement, sans rien changer aux règles.' : 'Présentation et accessibilité : aucun réglage ne modifie les règles du duel.',
    h('div', { class: 'sh-opts' }, ...rows, ...saveRows),
    h('div', { class: 'sh-actions' }, inDuel
      ? btn('Retour au menu du duel', () => sh.setOverlay('menu'), { key: 'opt-back', primary: true })
      : btn('Retour', () => void sh.leaveConsult(), { key: 'opt-back', primary: true })));
}

function importButton(sh: Shell): HTMLElement {
  const input = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', 'data-key': 'opt-import-file', 'aria-label': 'Fichier de sauvegarde à importer' }) as HTMLInputElement;
  input.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    const r = parseSave(await f.text());
    if (!r.ok) { sh.toast(`Import refusé : ${r.reason}`, 'error'); return; }
    const ok = await confirmDialog({ title: 'Importer cette sauvegarde ?', text: `Profil « ${r.save.profile.name} », ${r.save.history.length} duel(s). La progression actuelle sera remplacée (elle reste disponible une fois comme copie de secours).`, confirm: 'Importer' });
    if (ok !== 'confirm') return;
    sh.save = r.save;
    sh.load = { status: 'ok', save: r.save, migratedFrom: r.migratedFrom };
    sh.persist();
    sh.applyOptions();
    sh.toast('Sauvegarde importée.', 'ok');
    sh.render();
  });
  return h('span', null, input, btn('Importer…', () => input.click(), { ghost: true, key: 'opt-import' }));
}
