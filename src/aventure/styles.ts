/**
 * M10-B — styles du prototype `?aventure=1` (chargés seulement avec le mode : le jeu par défaut n'en reçoit aucun).
 * Palette de l'enveloppe et de la ville (ivoire, or pâle, nuit) ; carte neutre blanche/grise (ADR 030) ; écrans en
 * colonne lisibles à 1280 × 720 comme à 1920 × 1080.
 */
import { installVilleStyles } from '../ville/ui';
import { STYLES_CINEMA } from './cinema';

let done = false;

export function installAventureStyles(): void {
  if (done) return;
  done = true;
  installVilleStyles(); // ses variables d'abord, et l'ordre des feuilles reste fixe
  const s = document.createElement('style');
  s.textContent = `
#shell.av-scr[hidden] { display: none; }
#shell.av-scr { position: fixed; inset: 0; z-index: 2600; display: grid; place-items: center; overflow: auto; padding: 24px 16px; background: radial-gradient(ellipse at 50% 40%, rgba(6, 8, 16, 0.55), rgba(4, 6, 12, 0.92)); }
.av-titre { position: relative; z-index: 1; width: min(760px, 100%); color: var(--lqv-ivoire); font: 15px/1.5 Georgia, serif; text-align: center; }
/* titre et résultat : le texte sous le buste, jamais dessus */
.av-accroche { align-self: safe end; margin-bottom: 3vh; }
.av-trait { display: flex; align-items: center; justify-content: center; gap: 12px; margin: 4px auto 10px; color: var(--lqv-or); font: italic 17px/1.3 Georgia, serif; }
.av-trait::before, .av-trait::after { content: ""; flex: 0 1 110px; height: 1px; background: linear-gradient(90deg, transparent, var(--lqv-or)); }
.av-trait::after { transform: scaleX(-1); }
.av-h1 { margin: 6px 0 2px; font: 700 clamp(38px, 5.4vw, 72px)/1.04 Georgia, serif; color: var(--lqv-or-clair); letter-spacing: 0.02em; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.55), 0 0 26px rgba(255, 190, 110, 0.28); }
.av-sous { margin: 0 auto 12px; max-width: 620px; color: #d8ccb4; font: italic 17px/1.4 Georgia, serif; }
.av-proto { color: #c9b98f; font-size: 12.5px; }
.av-emblems { display: flex; justify-content: center; gap: 14px; }
.av-emblems .fam-Cendre, .av-emb.fam-Cendre { color: #ff8a4a; } .av-emblems .fam-Voile, .av-emb.fam-Voile { color: #a8b8ff; }
.av-emblems .fam-Ronce, .av-emb.fam-Ronce { color: #8fdc6a; } .av-emblems .fam-Astre, .av-emb.fam-Astre { color: #ffd36b; }
.av-items { display: grid; gap: 10px; justify-items: center; margin-top: 16px; }
.av-btn { min-width: min(380px, 100%); display: grid; gap: 2px; padding: 11px 22px; border-radius: 2px; border: 1px solid rgba(226, 196, 138, 0.5); background: linear-gradient(180deg, rgba(36, 36, 54, 0.92), rgba(14, 15, 25, 0.94)); color: var(--lqv-ivoire); font: inherit; cursor: pointer; transition: border-color 0.12s, box-shadow 0.12s; }
.av-btn:hover { border-color: var(--lqv-or-clair); box-shadow: 0 0 16px rgba(255, 200, 120, 0.22); }
.av-btn b { font: 700 19px/1.2 Georgia, serif; } .av-btn small { color: var(--lqv-sepia); font: 13px/1.3 Georgia, serif; }
.av-btn.primary { background: linear-gradient(180deg, #f2dcab, #d6b26e); color: #1a1408; border-color: var(--lqv-or-clair); box-shadow: inset 0 0 0 1px rgba(90, 60, 20, 0.4); } .av-btn.primary small { color: #3a2e18; }
.av-btn:focus-visible, .ville-btn:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.av-profil { margin: 0; color: #d8ccb4; font-size: 13px; }
.av-link { color: #b8c4dc; font-size: 13px; }
.av-label { display: block; margin-top: 14px; color: #efe6d4; }
.av-apparence { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center; margin: 6px auto 0; max-width: 620px; text-align: left; }
.av-ap-apercu { display: grid; place-items: center; width: 136px; height: 188px; border-radius: 0; border: 1px solid rgba(226, 196, 138, 0.3); background: radial-gradient(ellipse at 50% 70%, rgba(80, 70, 50, 0.35), rgba(10, 10, 18, 0.6)); }
.av-vignette { image-rendering: pixelated; display: block; }
.av-ap-choix { display: grid; gap: 8px; }
.av-ap-ligne { display: grid; grid-template-columns: 82px 1fr; gap: 8px; align-items: center; }
.av-ap-titre { color: #e2c48a; font: 600 13px/1.2 system-ui, sans-serif; }
.av-ap-items { display: flex; flex-wrap: wrap; gap: 6px; }
.av-ap-pastille { width: 26px; height: 26px; border-radius: 50%; border: 2px solid #3a3446; cursor: pointer; padding: 0; }
.av-ap-pastille.choisi, .av-ap-sil.choisi { border-color: #ffe7b0; box-shadow: 0 0 0 2px rgba(255, 231, 176, 0.35); }
.av-nouveau .av-apparence { margin: 0; max-width: none; gap: 14px; }
.av-nouveau .av-ap-choix { gap: 5px; }
.av-ap-sil canvas { height: 58px; width: auto; }
.av-ap-sil canvas.av-tete { height: 40px; }
.av-ap-sil { display: grid; justify-items: center; gap: 2px; padding: 3px 5px; border-radius: 2px; border: 1px solid #3a3446; background: rgba(12, 10, 20, 0.7); color: #efe6d4; font: 600 11px/1 system-ui, sans-serif; cursor: pointer; }
.av-ap-pastille:focus-visible, .av-ap-sil:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.av-input { box-sizing: border-box; font: 600 17px/1.2 Georgia, serif; padding: 7px 10px; border-radius: 2px; border: 1px solid var(--lqv-or); background: #0f101a; color: #fff4dc; width: 100%; }
.av-cards { --card-w: 74px; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 10px 0; }
.av-cards .card { cursor: default; }
.av-cards.nombreuses { --card-w: 50px; gap: 6px; max-height: 42vh; overflow-y: auto; }
.av-choix-cartes { display: flex; flex-wrap: wrap; justify-content: center; gap: 18px; margin: 14px 0; }
.av-choix-carte { --card-w: 108px; display: grid; justify-items: center; gap: 6px; width: 190px; text-align: center; }
.av-choix-carte .card { cursor: default; }
.av-choix-carte small { min-height: 2.6em; color: #d8ccb4; font: 12px/1.3 system-ui, sans-serif; }
.av-neutre { --famc: #a9a6a0; display: grid; grid-template-rows: 1fr auto auto; place-items: center; padding: 8px 4px; box-sizing: border-box; background: linear-gradient(160deg, #f2f0ea, #c9c6be 70%, #a9a6a0); color: #2a2a2e; border: 1px solid #8d8b86; }
.av-n-rank { font: 700 calc(var(--card-w) * 0.42)/1 Georgia, serif; color: #3a3a40; }
.av-n-name { font: 600 calc(var(--card-w) * 0.13)/1 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #55555c; }
.av-n-pow { font: 700 calc(var(--card-w) * 0.15)/1.3 system-ui, sans-serif; color: #2a2a2e; }
.av-n-note { position: absolute; right: 4px; top: 3px; font: 700 11px/1 system-ui, sans-serif; color: #55555c; }
.av-modal { position: fixed; inset: 0; z-index: 2750; display: grid; place-items: center; padding: 12px; background: radial-gradient(ellipse at 50% 45%, rgba(4, 6, 12, 0.55), rgba(4, 6, 12, 0.86)); }
.av-confirm { width: min(780px, 100%); max-height: calc(100vh - 24px); overflow: auto; box-sizing: border-box; padding: 6px 14px; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; color: var(--lqv-ivoire); font: 15px/1.5 Georgia, serif; box-shadow: var(--lqv-ombre); scrollbar-width: thin; scrollbar-color: rgba(226, 196, 138, 0.5) transparent; }
/* les boutons d'une fenêtre restent à l'écran quand elle défile */
.av-confirm > .ville-choices:last-child { position: sticky; bottom: -6px; margin: 10px -14px -6px; padding: 10px 14px 6px; background: linear-gradient(180deg, transparent, rgba(9, 10, 18, 0.98) 34%); }
.av-confirm.av-large { width: min(980px, 100%); }
.av-confirm h2 { margin: 0; padding-bottom: 6px; font: 700 25px/1.2 Georgia, serif; color: var(--lqv-or-clair); border-bottom: 1px solid; border-image: linear-gradient(90deg, var(--lqv-or), transparent 70%) 1; } .av-confirm h3 { margin: 14px 0 4px; font: 700 13px/1.3 Georgia, serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lqv-or); }
.av-confirm p { margin: 4px 0; }
.av-confirm-head { display: flex; gap: 14px; align-items: center; margin-bottom: 6px; }
.av-confirm-head .ville-portrait { width: 84px; height: 84px; }
.av-devise { color: #d8ccb4; font-style: italic; }

.av-enjeu { display: flex; align-items: center; gap: 12px; --card-w: 74px; }
.av-statut { display: inline-flex; align-items: center; gap: 5px; color: var(--lqv-sepia); font: clamp(14px, 1vw, 19px)/1.3 Georgia, serif; }
.av-statut svg { width: 15px; height: 15px; }
.av-statut.fam-Cendre svg { color: #ff8a4a; } .av-statut.fam-Voile svg { color: #a8b8ff; } .av-statut.fam-Ronce svg { color: #8fdc6a; } .av-statut.fam-Astre svg { color: #ffd36b; }
.av-deck-cards { --card-w: 60px; display: grid; grid-template-columns: repeat(8, auto); justify-content: center; gap: 8px 6px; }
.av-qa-decor { position: absolute; right: 16px; bottom: 16px; max-width: 46vw; padding: 4px 10px; border-radius: 8px; background: rgba(60, 12, 12, 0.85); border: 1px solid #ff9a8a; color: #ffe0da; font: 600 12px/1.35 system-ui, sans-serif; }
.av-qa-decor[hidden] { display: none; }
.av-slot { display: grid; gap: 4px; justify-items: center; }
.ville-btn.av-mini { padding: 1px 6px; font-size: 11px; }
/* M14 : le choix du récit, le bouton de la suite (au doigt comme à la souris) */
.av-recit { display: flex; justify-content: center; gap: 8px; }
.av-recit-texte { min-height: 2.6em; }
.ville-btn[aria-pressed="true"]:hover:not(:disabled) { color: #1a1408; }
.av-suite { min-height: 52px; padding: 0.5em 1.8em; font-size: clamp(19px, 1.3vw, 25px); white-space: nowrap; }
/* M14, révision 3 : le noir entre deux scènes, les fenêtres sur fond noir, la Préparation (plein écran, sans la ville) */
.ville-fade.plein { opacity: 1; transition: none; }
.ville-card.court.out { transition: opacity 0.45s ease 0.75s; }
.av-modal.noire { background: #04060c; }
#shell.av-scr.av-preparation { background: radial-gradient(ellipse at 50% 0%, #1d1a26, #0a0b13 58%, #04060c); padding: 18px 20px; }
.av-prepa { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 12px; box-sizing: border-box; width: min(1560px, 100%); height: min(940px, 100%); color: var(--lqv-ivoire); font: 15px/1.5 Georgia, serif; }
.av-prepa-tete { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 2px 20px; padding-bottom: 6px; border-bottom: 1px solid; border-image: linear-gradient(90deg, var(--lqv-or), transparent 80%) 1; }
.av-prepa-tete h1 { margin: 0; font: 700 clamp(30px, 3vw, 44px)/1.1 Georgia, serif; color: var(--lqv-or-clair); letter-spacing: 0.02em; }
.av-prepa-tete p { margin: 0; color: var(--lqv-or); font: italic clamp(15px, 1.1vw, 19px)/1.3 Georgia, serif; }
.av-prepa-grille { display: grid; grid-template-columns: minmax(340px, 5fr) minmax(0, 7fr); gap: 18px; min-height: 0; }
.av-prepa-grille.seule { grid-template-columns: minmax(0, 620px); justify-content: center; }
.av-prepa h3 { margin: 0 0 6px; font: 700 13px/1.3 Georgia, serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lqv-or); }
.av-prepa-suite { display: flex; flex-direction: column; gap: 10px; min-height: 0; overflow: auto; box-sizing: border-box; padding: 6px 14px; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; scrollbar-width: thin; }
.av-prepa-suite > h3 { margin: 0; } .av-prepa-suite > p { margin: 0; }
.av-prepa-suite .av-suite { margin-top: auto; align-self: stretch; }
.av-prepa-carte { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; }
.av-prepa-carte b { font: 700 22px/1.2 Georgia, serif; color: var(--lqv-or-clair); } .av-prepa-carte p { margin: 0; }
/* « À suivre » : le personnage en grand ; dans un choix, une ligne par personne */
.av-prepa-suite > .av-prepa-carte.av-rue { align-items: center; padding: 0; border: 0; background: none; }
.av-prepa-suite > .av-prepa-carte .ville-portrait { width: clamp(150px, 26vh, 300px); height: auto; aspect-ratio: 5 / 6; }
.av-prepa-suite > .av-prepa-carte .av-rue-texte { flex: none; align-items: center; gap: 2px; }
.av-prepa-suite > .av-prepa-carte .av-rue-texte b { font-size: clamp(22px, 1.6vw, 30px); }
.av-prepa-suite > .av-prepa-carte .av-rue-texte span { font-size: 15px; }
.av-prepa-option .av-prepa-carte { flex-direction: row; align-items: stretch; text-align: left; }
.av-prepa-objectif { font-size: 16px; line-height: 1.4; text-align: center; }
.av-prepa-option { display: flex; align-items: center; gap: 10px; } .av-prepa-option .av-rue { flex: 1; min-width: 0; } .av-prepa-option .ville-btn { flex: none; }
.av-prepa-rues { display: flex; flex-direction: column; min-height: 0; }
.av-prepa-liste { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; align-content: start; min-height: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: rgba(226, 196, 138, 0.5) transparent; }
.av-prepa-pied { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.av-prepa-pied p { margin: 0; min-width: 0; } .av-prepa-pied .ville-choices { flex: none; margin: 0; }
.av-rue { display: flex; gap: 10px; align-items: stretch; padding: 8px; border: 1px solid rgba(226, 196, 138, 0.3); background: rgba(9, 10, 18, 0.5); }
.av-rue .ville-portrait { flex: none; width: 92px; height: 112px; object-fit: cover; }
.av-rue-texte { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; font-size: 14px; line-height: 1.3; } .av-rue-texte b { font-size: 16px; color: var(--lqv-or-clair); }
.av-rue-bilan { color: rgba(240, 232, 214, 0.72); } .av-rue .ville-btn { margin-top: auto; align-self: flex-start; }
@media (max-width: 860px) { .av-prepa { height: auto; } .av-prepa-grille { grid-template-columns: 1fr; } .av-prepa-pied { flex-direction: column; align-items: stretch; } }
/* le HUD : un seul cartouche à gauche, les outils à droite, sur un voile qui garde le décor visible */
.av-hud::before { content: ""; position: absolute; inset: 0 0 auto 0; height: clamp(168px, 16vw, 300px); pointer-events: none; background: linear-gradient(180deg, rgba(4, 5, 10, 0.86), rgba(4, 5, 10, 0.5) 52%, rgba(4, 5, 10, 0)); }
.av-cartouche { position: absolute; left: 22px; top: 14px; max-width: min(max(620px, 44vw), calc(100vw - 340px)); text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
.av-hud .ville-place { position: static; padding: 0; background: none; border: 0; border-radius: 0; }
.av-hud .ville-place b { font-size: clamp(27px, 2.1vw, 40px); }
.av-hud-ligne { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; margin-top: 1px; }
.av-chapitre { color: var(--lqv-or); font: italic clamp(14px, 1vw, 19px)/1.3 Georgia, serif; }
.av-hud .av-chapitre + .av-statut::before { content: "◆"; margin-right: 5px; color: var(--lqv-or); font-size: 8px; }
.av-hud .ville-objective { position: static; max-width: none; margin-top: 7px; padding: 0 0 0 16px; background: none; border: 0; border-radius: 0; color: var(--lqv-ivoire); font: clamp(15px, 1.1vw, 21px)/1.4 Georgia, serif; }
.av-hud .ville-objective::before { content: "◆"; float: left; margin: 1px 0 0 -16px; color: var(--lqv-or-clair); font-size: 10px; }
.av-hud .ville-tools { top: 16px; right: 18px; gap: 0; }
.av-hud .ville-tools .ville-btn { margin-left: -1px; font-size: clamp(14px, 1vw, 19px); padding: 0.5em 1em; background: linear-gradient(180deg, rgba(30, 31, 46, 0.86), rgba(12, 13, 22, 0.9)); }
.av-hud .ville-tools kbd { margin-left: 6px; padding: 0 4px; border: 1px solid rgba(226, 196, 138, 0.4); color: var(--lqv-sepia); font: 11px/1.4 system-ui, sans-serif; }
/* le menu : un panneau à droite, une entrée par ligne, sa valeur au bout */
.ville-dialog.av-panneau { left: auto; right: 12px; top: 62px; bottom: auto; transform: none; width: 356px; min-height: 0; max-height: calc(100vh - 74px); overflow: auto; }
.av-panneau .ville-dialog-body > b { position: static; max-width: none; padding: 0 0 6px; font-size: 22px; color: var(--lqv-or-clair); background: none; clip-path: none; }
.av-panneau .ville-dialog-body p { margin: 0 0 10px; color: var(--lqv-sepia); font-size: 13px; }
.av-panneau .ville-choices { flex-direction: column; flex-wrap: nowrap; gap: 4px; }
.av-panneau .ville-btn { display: flex; justify-content: space-between; gap: 12px; width: 100%; text-align: left; }
.av-menu-sep { display: none; }
.av-menu-val { color: var(--lqv-or); font-weight: 400; font-style: italic; text-align: right; }
.av-panneau .ville-btn.primary .av-menu-val { color: inherit; }
/* nouvelle aventure : deux colonnes, tout tient à l'écran ; le buste de la salle s'efface derrière le titre */
#shell.av-scr:has(.av-nouveau) { background: linear-gradient(180deg, rgba(4, 6, 12, 0.9), rgba(4, 6, 12, 0.8)); }
.av-input::selection { background: var(--lqv-or); color: #1a1408; }
.av-input:focus-visible { outline: 2px solid var(--lqv-or-clair); outline-offset: 1px; }
.av-nouveau { width: min(1120px, 100%); }
.av-nouveau .av-h1 { font-size: clamp(30px, 3.4vw, 46px); }
.av-nouveau .av-sous { max-width: none; margin-bottom: 6px; font-size: 15px; }
.av-nouveau-grille { display: grid; grid-template-columns: minmax(280px, 340px) minmax(0, 1fr); gap: 16px 26px; align-items: start; box-sizing: border-box; padding: 6px 12px; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; text-align: left; }
.av-nouveau-col { display: grid; gap: 7px; }
.av-nouveau-col .av-cards { --card-w: 50px; justify-content: flex-start; flex-wrap: nowrap; gap: 6px; margin: 2px 0 0; }
.av-nouveau-col .av-recit { justify-content: stretch; gap: 0; }
.av-nouveau-col .av-recit .ville-btn { flex: 1; margin-left: -1px; }
.av-nouveau-col .av-recit-texte { min-height: 4.2em; margin: 0; max-width: none; font-size: 14px; line-height: 1.4; }
.av-nouveau .av-label { margin: 0; color: var(--lqv-or); font: 700 12px/1.3 Georgia, serif; letter-spacing: 0.1em; text-transform: uppercase; }
.av-nouveau .av-actions { display: flex; justify-content: center; gap: 10px; margin-top: 12px; }
.av-nouveau .av-actions .av-btn { min-width: 220px; }
/* résultat, journal */
.av-bilan { margin: 4px auto 0; max-width: 620px; }
.av-bilan p { margin: 2px 0; }
.av-journal-grille { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(250px, 1fr); gap: 4px 26px; align-items: start; }
@media (max-width: 860px) { .av-journal-grille { grid-template-columns: 1fr; } }
.av-quete { margin-top: 8px; }
.av-quete summary { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; cursor: pointer; list-style: none; font: 700 16px/1.3 Georgia, serif; color: var(--lqv-or-clair); }
.av-quete summary::-webkit-details-marker { display: none; }
.av-quete.finie summary { color: #b8e6a0; font-weight: 400; }
.av-compte { flex: none; color: var(--lqv-sepia); font: italic 13px/1.5 Georgia, serif; }
.av-quete li { padding: 1px 0 1px 18px; text-indent: -18px; color: var(--lqv-sepia); }
.av-quete li.courante { color: var(--lqv-ivoire); }
.av-familles { list-style: none; margin: 0; padding: 0; }
.av-familles li { display: flex; align-items: center; gap: 8px; padding: 2px 0; font-size: 14px; }
.av-familles svg { width: 16px; height: 16px; flex: none; }
.av-familles .fam-Cendre svg { color: #ff8a4a; } .av-familles .fam-Voile svg { color: #a8b8ff; } .av-familles .fam-Ronce svg { color: #8fdc6a; } .av-familles .fam-Astre svg { color: #ffd36b; }
.av-issues { color: #ffb4a0; margin: 6px 0; } .av-ok { color: #b8e6a0; }
.av-registre { margin: 2px 0; padding-left: 20px; font: 13.5px/1.45 Georgia, serif; color: var(--lqv-sepia); }
.av-collection-registre .av-registre, .av-registre.large { columns: 2; }
.av-quete ul { list-style: none; padding-left: 0; margin: 2px 0; } .av-quete li.faite { color: #b8e6a0; }
.av-tech { display: grid; place-items: center; width: 74px; height: 104px; border-radius: 6px; border: 1px solid #e2c48a; background: #1a1622; color: #ffe7b0; font-size: 12px; text-align: center; }
.av-tech b { font: 700 11px/1 system-ui, sans-serif; color: #cfc3ac; text-transform: uppercase; } .av-tech span { font: 700 14px/1.2 Georgia, serif; }
.av-resultat .av-h1 { font-size: clamp(34px, 4vw, 52px); }
.av-confirm.av-ecran { width: min(1240px, 100%); max-height: calc(100vh - 24px); }
.av-ecran-tete { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.av-onglets { display: flex; gap: 2px; margin: 8px 0 8px; flex-wrap: wrap; border-bottom: 1px solid rgba(226, 196, 138, 0.3); }
.av-onglets .ville-btn { padding: 7px 16px; background: none; border: 0; border-bottom: 2px solid transparent; box-shadow: none; color: var(--lqv-sepia); }
.av-onglets .ville-btn.primary { background: none; color: var(--lqv-or-clair); border-bottom-color: var(--lqv-or-clair); box-shadow: none; }
.av-deck-grille { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px 22px; align-items: start; }
@media (max-width: 1080px) { .av-deck-grille { grid-template-columns: 1fr; } }
.av-rangs { display: grid; grid-template-columns: repeat(2, auto); gap: 4px 18px; justify-content: start; }
.av-rang { display: grid; gap: 2px; }
.av-deck-cote h3:first-of-type { margin-top: 6px; }
.av-deck-cote .ville-choices, .av-sig-ligne .ville-choices { justify-content: flex-start; }
.av-aide { color: #cfc3ac; font-size: 13px; }
.av-resume { color: #d8ccb4; }
.av-rang-nom { font: 700 13px/1.3 Georgia, serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lqv-or); }
.av-rang-cases { --card-w: 62px; display: flex; flex-wrap: wrap; gap: 6px; }
.av-case { display: grid; gap: 2px; justify-items: center; padding: 3px; border: 2px solid transparent; border-radius: 3px; background: none; color: #d8ccb4; font: 11px/1.2 system-ui, sans-serif; cursor: pointer; }
.av-case:hover { border-color: rgba(226, 196, 138, 0.45); } .av-case.sel { border-color: #ffe7b0; background: rgba(226, 196, 138, 0.12); }
.av-case.actuelle { border-color: #8fdc6a; }
.av-case .card { pointer-events: none; }
.av-choix { --card-w: 58px; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 6px; margin: 0; padding: 6px 8px; border: 1px dashed rgba(226, 196, 138, 0.5); border-radius: 0; }
.av-choix p { flex-basis: 100%; margin: 0 0 2px; color: #cfc3ac; font-size: 12.5px; }
.av-sig-ligne { display: flex; align-items: center; gap: 12px; } .av-sig-ligne .av-cards { --card-w: 62px; margin: 0; }
.av-col-fam { --famc: #a9a6a0; margin: 10px 0; padding: 4px 0 6px 10px; border-left: 4px solid var(--famc); }
.av-col-fam.fam-Cendre { --famc: #d0541f; } .av-col-fam.fam-Voile { --famc: #5d63c4; } .av-col-fam.fam-Ronce { --famc: #3f8a46; } .av-col-fam.fam-Astre { --famc: #c9a23a; }
.av-col-fam h3 { display: flex; align-items: center; gap: 4px; } .av-col-fam .av-emb svg { width: 20px; height: 20px; }
.av-col-cartes { --card-w: 70px; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px 6px; }
.av-col-cartes > :last-child { grid-column: 5; grid-row: 1 / span 4; align-self: center; }
.av-col-entree { position: relative; display: grid; gap: 3px; justify-items: center; align-content: start; color: #d8ccb4; font: 11px/1.25 system-ui, sans-serif; text-align: center; }
.av-col-titre { color: #e2c48a; font-weight: 700; }
.av-col-entree.verrou .card { filter: grayscale(1) brightness(0.42); }
.av-col-entree.verrou .av-col-texte { color: #a89e8c; }
.av-badge { padding: 0 6px; border-radius: 999px; background: #e2c48a; color: #1a1408; font: 700 10px/1.5 system-ui, sans-serif; }
.av-col-techs { list-style: none; padding-left: 4px; margin: 2px 0; columns: 2; } .av-col-techs li.faite { color: #b8e6a0; }
.av-bannieres { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 10px 0; }
@media (max-width: 900px) { .av-bannieres { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.av-banniere { --famc: #a9a6a0; display: flex; flex-direction: column; gap: 6px; align-items: center; padding: 12px 8px 14px; border-radius: 0; border: 1px solid var(--famc); border-top-width: 4px; background: linear-gradient(180deg, color-mix(in srgb, var(--famc) 26%, transparent), rgba(9, 9, 16, 0.35) 72%); text-align: center; }
.av-banniere .ville-btn { margin-top: auto; }
.av-banniere.fam-Cendre { --famc: #d0541f; } .av-banniere.fam-Voile { --famc: #5d63c4; } .av-banniere.fam-Ronce { --famc: #3f8a46; } .av-banniere.fam-Astre { --famc: #c9a23a; }
.av-banniere .av-emb svg { width: 40px; height: 40px; }
.av-banniere b { font: 700 17px/1.2 Georgia, serif; color: #ffe7b0; }
.av-banniere small { color: #d8ccb4; font-size: 12.5px; line-height: 1.35; }
.av-banniere.etat-fermee { filter: saturate(0.55); }
.av-banniere-etat { padding: 0 8px; border-radius: 0; background: rgba(226, 196, 138, 0.16); color: var(--lqv-or); font: 700 11px/1.6 system-ui, sans-serif; letter-spacing: 0.06em; text-transform: uppercase; }
.av-banniere.etat-engageable .av-banniere-etat { background: #e2c48a; color: #1a1408; }
.av-banniere.etat-conquise .av-banniere-etat { background: rgba(143, 220, 106, 0.2); color: #b8e6a0; }
.av-transition { margin: 6px 0; padding: 5px 12px; border-left: 2px solid var(--lqv-or); background: rgba(226, 196, 138, 0.07); }
.av-standard { color: #ffe7b0; font-weight: 700; }
.av-cards.av-deja .card { filter: saturate(0.6) brightness(0.8); }
${STYLES_CINEMA}`;
  document.head.append(s);
}
