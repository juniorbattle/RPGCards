/**
 * M10-B — styles du prototype `?aventure=1` (chargés seulement avec le mode : le jeu par défaut n'en reçoit aucun).
 * Palette de l'enveloppe et de la ville (ivoire, or pâle, nuit) ; carte neutre blanche/grise (ADR 030) ; écrans en
 * colonne lisibles à 1280 × 720 comme à 1920 × 1080.
 */
let done = false;

export function installAventureStyles(): void {
  if (done) return;
  done = true;
  const s = document.createElement('style');
  s.textContent = `
#shell.av-scr[hidden] { display: none; }
#shell.av-scr { position: fixed; inset: 0; z-index: 2600; display: grid; place-items: center; overflow: auto; padding: 24px 16px; background: radial-gradient(ellipse at 50% 40%, rgba(6, 8, 16, 0.55), rgba(4, 6, 12, 0.92)); }
.av-titre { width: min(760px, 100%); color: #efe6d4; font: 15px/1.5 system-ui, sans-serif; text-align: center; }
.av-h1 { margin: 6px 0 2px; font: 700 clamp(34px, 4.6vw, 58px)/1.05 Georgia, serif; color: #ffe7b0; letter-spacing: 0.02em; text-shadow: 0 0 22px rgba(255, 190, 110, 0.25); }
.av-sous { margin: 0 auto 12px; max-width: 620px; color: #d8ccb4; font: italic 17px/1.4 Georgia, serif; }
.av-proto { color: #c9b98f; font-size: 12.5px; }
.av-emblems { display: flex; justify-content: center; gap: 14px; }
.av-emblems .fam-Cendre, .av-emb.fam-Cendre { color: #ff8a4a; } .av-emblems .fam-Voile, .av-emb.fam-Voile { color: #a8b8ff; }
.av-emblems .fam-Ronce, .av-emb.fam-Ronce { color: #8fdc6a; } .av-emblems .fam-Astre, .av-emb.fam-Astre { color: #ffd36b; }
.av-items { display: grid; gap: 10px; justify-items: center; margin-top: 16px; }
.av-btn { min-width: min(420px, 100%); display: grid; gap: 2px; padding: 11px 18px; border-radius: 10px; border: 1px solid rgba(226, 196, 138, 0.5); background: rgba(22, 20, 30, 0.9); color: #efe6d4; font: inherit; cursor: pointer; }
.av-btn b { font: 700 18px/1.2 Georgia, serif; } .av-btn small { color: #cfc3ac; font-size: 12.5px; }
.av-btn.primary { background: #e2c48a; color: #1a1408; border-color: #ffe7b0; } .av-btn.primary small { color: #3a2e18; }
.av-btn:focus-visible, .ville-btn:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.av-profil { margin: 0; color: #d8ccb4; font-size: 13px; }
.av-link { color: #b8c4dc; font-size: 13px; }
.av-label { display: block; margin-top: 14px; color: #efe6d4; }
.av-input { font: 600 17px/1.2 system-ui, sans-serif; padding: 6px 10px; border-radius: 8px; border: 1px solid #e2c48a; background: #12101a; color: #fff4dc; width: 220px; }
.av-cards { --card-w: 74px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 10px 0; }
.av-cards .card { cursor: default; }
.av-neutre { --famc: #a9a6a0; display: grid; grid-template-rows: 1fr auto auto; place-items: center; padding: 8px 4px; box-sizing: border-box; background: linear-gradient(160deg, #f2f0ea, #c9c6be 70%, #a9a6a0); color: #2a2a2e; border: 1px solid #8d8b86; }
.av-n-rank { font: 700 calc(var(--card-w) * 0.42)/1 Georgia, serif; color: #3a3a40; }
.av-n-name { font: 600 calc(var(--card-w) * 0.13)/1 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #55555c; }
.av-n-pow { font: 700 calc(var(--card-w) * 0.15)/1.3 system-ui, sans-serif; color: #2a2a2e; }
.av-n-note { position: absolute; right: 4px; top: 3px; font: 700 11px/1 system-ui, sans-serif; color: #55555c; }
.av-modal { position: fixed; inset: 0; z-index: 2750; display: grid; place-items: center; padding: 16px; background: rgba(4, 6, 12, 0.6); }
.av-confirm { width: min(760px, 100%); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 16px 20px; border-radius: 12px; background: rgba(9, 9, 16, 0.96); border: 1px solid #e2c48a; color: #f6eedc; font: 14.5px/1.45 system-ui, sans-serif; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7); }
.av-confirm.av-large { width: min(980px, 100%); }
.av-confirm h2 { margin: 0; font: 700 22px/1.2 Georgia, serif; color: #ffe7b0; } .av-confirm h3 { margin: 12px 0 4px; font: 700 15px/1.2 Georgia, serif; color: #e2c48a; }
.av-confirm p { margin: 4px 0; }
.av-confirm-head { display: flex; gap: 14px; align-items: center; margin-bottom: 6px; }
.av-confirm-head .ville-portrait { width: 84px; height: 84px; }
.av-devise { color: #d8ccb4; font-style: italic; }
.av-confirm.fam-Cendre { border-color: #d0541f; } .av-confirm.fam-Voile { border-color: #5d63c4; } .av-confirm.fam-Ronce { border-color: #3f8a46; } .av-confirm.fam-Astre { border-color: #c9a23a; }
.av-enjeu { display: flex; align-items: center; gap: 12px; --card-w: 74px; }
.av-banner { position: fixed; left: 50%; top: 6px; transform: translateX(-50%); z-index: 2400; padding: 3px 10px; border-radius: 999px; background: rgba(40, 30, 10, 0.82); border: 1px solid rgba(226, 196, 138, 0.6); color: #ffe7b0; font: 600 12px/1.3 system-ui, sans-serif; pointer-events: auto; white-space: nowrap; }
.av-statut { position: absolute; left: 16px; bottom: 16px; padding: 5px 12px; border-radius: 999px; background: rgba(8, 9, 16, 0.72); border: 1px solid rgba(169, 166, 160, 0.6); color: #e6e2da; font: 600 13px/1.3 system-ui, sans-serif; }
.av-statut.fam-Cendre { border-color: #d0541f; } .av-statut.fam-Voile { border-color: #5d63c4; } .av-statut.fam-Ronce { border-color: #3f8a46; } .av-statut.fam-Astre { border-color: #c9a23a; }
.av-deck-cards { --card-w: 60px; display: grid; grid-template-columns: repeat(8, auto); justify-content: center; gap: 8px 6px; }
.av-qa-decor { position: absolute; right: 16px; bottom: 16px; max-width: 46vw; padding: 4px 10px; border-radius: 8px; background: rgba(60, 12, 12, 0.85); border: 1px solid #ff9a8a; color: #ffe0da; font: 600 12px/1.35 system-ui, sans-serif; }
.av-qa-decor[hidden] { display: none; }
.av-slot { display: grid; gap: 4px; justify-items: center; }
.ville-btn.av-mini { padding: 1px 6px; font-size: 11px; }
.av-issues { color: #ffb4a0; margin: 6px 0; } .av-ok { color: #b8e6a0; }
.av-registre { columns: 2; font: 12px/1.4 ui-monospace, monospace; color: #d8ccb4; }
.av-quete ul { list-style: none; padding-left: 4px; margin: 2px 0; } .av-quete li.faite { color: #b8e6a0; }
.av-tech { display: grid; place-items: center; width: 74px; height: 104px; border-radius: 6px; border: 1px solid #e2c48a; background: #1a1622; color: #ffe7b0; font-size: 12px; text-align: center; }
.av-tech b { font: 700 11px/1 system-ui, sans-serif; color: #cfc3ac; text-transform: uppercase; } .av-tech span { font: 700 14px/1.2 Georgia, serif; }
.av-resultat .av-h1 { font-size: clamp(34px, 4vw, 52px); }
.av-confirm.av-ecran { width: min(1240px, 100%); max-height: calc(100vh - 24px); }
.av-ecran-tete { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.av-onglets { display: flex; gap: 6px; margin: 8px 0 6px; flex-wrap: wrap; }
.av-deck-grille { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px 22px; align-items: start; }
@media (max-width: 1080px) { .av-deck-grille { grid-template-columns: 1fr; } }
.av-rangs { display: grid; grid-template-columns: repeat(2, auto); gap: 4px 18px; justify-content: start; }
.av-rang { display: grid; gap: 2px; }
.av-deck-cote h3:first-of-type { margin-top: 6px; }
.av-aide { color: #cfc3ac; font-size: 13px; }
.av-resume { color: #d8ccb4; }
.av-rang-nom { font: 700 15px/1.2 Georgia, serif; color: #e2c48a; }
.av-rang-cases { --card-w: 62px; display: flex; flex-wrap: wrap; gap: 6px; }
.av-case { display: grid; gap: 2px; justify-items: center; padding: 3px; border: 2px solid transparent; border-radius: 9px; background: none; color: #d8ccb4; font: 11px/1.2 system-ui, sans-serif; cursor: pointer; }
.av-case:hover { border-color: rgba(226, 196, 138, 0.45); } .av-case.sel { border-color: #ffe7b0; background: rgba(226, 196, 138, 0.12); }
.av-case.actuelle { border-color: #8fdc6a; }
.av-case .card { pointer-events: none; }
.av-choix { --card-w: 58px; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 6px; margin: 0; padding: 6px 8px; border: 1px dashed rgba(226, 196, 138, 0.55); border-radius: 9px; }
.av-choix p { flex-basis: 100%; margin: 0 0 2px; color: #cfc3ac; font-size: 12.5px; }
.av-sig-ligne { display: flex; align-items: center; gap: 12px; } .av-sig-ligne .av-cards { --card-w: 62px; margin: 0; }
.av-col-fam { --famc: #a9a6a0; margin: 10px 0; padding: 4px 0 6px 10px; border-left: 4px solid var(--famc); }
.av-col-fam.fam-Cendre { --famc: #d0541f; } .av-col-fam.fam-Voile { --famc: #5d63c4; } .av-col-fam.fam-Ronce { --famc: #3f8a46; } .av-col-fam.fam-Astre { --famc: #c9a23a; }
.av-col-fam h3 { display: flex; align-items: center; gap: 4px; } .av-col-fam .av-emb svg { width: 20px; height: 20px; }
.av-col-cartes { --card-w: 70px; display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 8px 6px; }
.av-col-entree { position: relative; display: grid; gap: 3px; justify-items: center; align-content: start; color: #d8ccb4; font: 11px/1.25 system-ui, sans-serif; text-align: center; }
.av-col-titre { color: #e2c48a; font-weight: 700; }
.av-col-entree.verrou .card { filter: grayscale(1) brightness(0.42); }
.av-col-entree.verrou .av-col-texte { color: #a89e8c; }
.av-badge { padding: 0 6px; border-radius: 999px; background: #e2c48a; color: #1a1408; font: 700 10px/1.5 system-ui, sans-serif; }
.av-col-techs { list-style: none; padding-left: 4px; margin: 2px 0; columns: 2; } .av-col-techs li.faite { color: #b8e6a0; }
.av-bannieres { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 10px 0; }
@media (max-width: 900px) { .av-bannieres { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.av-banniere { --famc: #a9a6a0; display: grid; gap: 6px; justify-items: center; align-content: start; padding: 10px 8px 12px; border-radius: 10px; border: 1px solid var(--famc); border-top-width: 5px; background: linear-gradient(180deg, color-mix(in srgb, var(--famc) 24%, transparent), rgba(9, 9, 16, 0.35) 70%); text-align: center; }
.av-banniere.fam-Cendre { --famc: #d0541f; } .av-banniere.fam-Voile { --famc: #5d63c4; } .av-banniere.fam-Ronce { --famc: #3f8a46; } .av-banniere.fam-Astre { --famc: #c9a23a; }
.av-banniere .av-emb svg { width: 40px; height: 40px; }
.av-banniere b { font: 700 17px/1.2 Georgia, serif; color: #ffe7b0; }
.av-banniere small { color: #d8ccb4; font-size: 12.5px; line-height: 1.35; }
.av-banniere.etat-fermee { filter: saturate(0.55); }
.av-banniere-etat { padding: 0 8px; border-radius: 999px; background: rgba(226, 196, 138, 0.16); color: #e2c48a; font: 700 11px/1.6 system-ui, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; }
.av-banniere.etat-engageable .av-banniere-etat { background: #e2c48a; color: #1a1408; }
.av-banniere.etat-conquise .av-banniere-etat { background: rgba(143, 220, 106, 0.2); color: #b8e6a0; }
.av-transition { margin: 6px 0; padding: 5px 10px; border-left: 3px solid #e2c48a; background: rgba(226, 196, 138, 0.08); }
.av-standard { color: #ffe7b0; font-weight: 700; }
.av-cards.av-deja .card { filter: saturate(0.6) brightness(0.8); }
`;
  document.head.append(s);
}
