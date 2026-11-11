/**
 * Styles du mode Aventure (nés du prototype M10-B ; chargés seulement avec le mode : le Duel standard n'en reçoit aucun).
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
/* passe 200 : deux écrans de l'enveloppe en fondu enchaîné */
.shell-fantome { position: fixed; inset: 0; z-index: 2601; overflow: hidden; pointer-events: none; }
.lqv-fondus #shell.av-entree { animation: lqv-texte 0.3s ease-out; }
:is(#shell, .shell-fantome).av-scr { position: fixed; inset: 0; z-index: 2600; display: grid; place-items: center; overflow: auto; padding: 24px 16px; background: radial-gradient(ellipse at 50% 40%, rgba(6, 8, 16, 0.55), rgba(4, 6, 12, 0.92)); }
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
.av-profil { display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline; gap: 2px 0; margin: 2px 0 0; color: #d8ccb4; font-size: 13.5px; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
.av-profil b { color: var(--lqv-or-clair); font-size: 16px; }
.av-profil > span::before { content: "◆"; margin: 0 9px; color: var(--lqv-or); font-size: 8px; vertical-align: 2px; }
.av-link { color: #b8c4dc; font-size: 13px; }
.av-label { display: block; margin-top: 14px; color: #efe6d4; }
.av-apparence { display: grid; grid-template-columns: auto 1fr; gap: 16px; align-items: center; margin: 6px auto 0; max-width: 620px; text-align: left; }
.av-ap-apercu { display: grid; place-items: center; width: 136px; height: 188px; border-radius: 0; border: 1px solid rgba(226, 196, 138, 0.3); background: radial-gradient(ellipse at 50% 70%, rgba(80, 70, 50, 0.35), rgba(10, 10, 18, 0.6)); }
.av-vignette { image-rendering: pixelated; display: block; }
.av-ap-choix { display: grid; gap: 8px; }
.av-ap-ligne { display: grid; grid-template-columns: 82px 1fr; gap: 8px; align-items: center; }
.av-ap-titre { display: grid; gap: 1px; color: #e2c48a; font: 600 13px/1.2 system-ui, sans-serif; }
.av-ap-titre small { color: #b9ae98; font: italic 12px/1.2 Georgia, serif; }
.av-ap-items { display: flex; flex-wrap: wrap; gap: 6px; }
.av-ap-pastille { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #3a3446; cursor: pointer; padding: 0; }
.av-ap-pastille.choisi, .av-ap-sil.choisi { border-color: #ffe7b0; box-shadow: 0 0 0 2px rgba(255, 231, 176, 0.35); }
.av-nouveau .av-apparence { margin: 0; max-width: none; gap: 14px; }
.av-nouveau .av-ap-choix { gap: 5px; }
.av-ap-sil canvas { height: 48px; width: auto; }
.av-ap-sil canvas.av-tete { height: 40px; }
.av-ap-sil { display: grid; place-items: center; width: 50px; height: 54px; box-sizing: border-box; gap: 2px; padding: 3px; border-radius: 2px; border: 1px solid #3a3446; background: rgba(12, 10, 20, 0.7); color: #efe6d4; font: 600 11px/1 system-ui, sans-serif; cursor: pointer; }
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
.av-modal, .av-modal-sortie { position: fixed; inset: 0; z-index: 2750; display: grid; place-items: center; padding: 12px; background: radial-gradient(ellipse at 50% 45%, rgba(4, 6, 12, 0.55), rgba(4, 6, 12, 0.86)); }
.lqv-fondus .av-modal:not(.direct) { animation: lqv-texte 0.3s ease-out; }
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
.ville-fade.in { pointer-events: auto; }
.av-modal.noire { background: #04060c; }
.av-modal-sortie.noire { z-index: 2970; background: none; }
:is(#shell, .shell-fantome).av-scr.av-preparation { background: radial-gradient(ellipse at 50% 0%, #1d1a26, #0a0b13 58%, #04060c); padding: 18px 20px; }
.lqv-fondus :is(.av-prepa-tete, .av-prepa-suite, .av-prepa-rues, .av-prepa-pied) { animation: lqv-entree 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.lqv-fondus .av-prepa-suite { animation-delay: 0.12s; } .lqv-fondus .av-prepa-rues { animation-delay: 0.22s; } .lqv-fondus .av-prepa-pied { animation-delay: 0.3s; }
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
.ville-dialog.av-panneau, .ville-dialog-sortie.av-panneau { left: auto; right: 12px; top: 62px; bottom: auto; transform: none; width: 356px; min-height: 0; max-height: calc(100vh - 74px); overflow: auto; }
.av-panneau .ville-dialog-body > b { position: static; max-width: none; padding: 0 0 6px; font-size: 22px; color: var(--lqv-or-clair); background: none; clip-path: none; }
.av-panneau .ville-dialog-body p { margin: 0 0 10px; color: var(--lqv-sepia); font-size: 13px; }
.av-panneau .ville-choices { flex-direction: column; flex-wrap: nowrap; gap: 4px; }
.av-panneau .ville-btn { display: flex; justify-content: space-between; gap: 12px; width: 100%; text-align: left; }
.av-menu-sep { display: none; }
.av-menu-val { color: var(--lqv-or); font-weight: 400; font-style: italic; text-align: right; }
.av-panneau .ville-btn.primary .av-menu-val { color: inherit; }
/* nouvelle aventure : deux colonnes, tout tient à l'écran ; le buste de la salle s'efface derrière le titre */
#shell.av-scr:has(.av-nouveau) { background: linear-gradient(180deg, rgba(4, 6, 12, 0.96), rgba(4, 6, 12, 0.9)); }
@media (min-width: 1600px) and (min-height: 960px) { .av-nouveau { zoom: 1.25; } }
.av-input::selection { background: var(--lqv-or); color: #1a1408; }
.av-input:focus-visible { outline: 2px solid var(--lqv-or-clair); outline-offset: 1px; }
.av-nouveau { width: min(1040px, 100%); }
.av-nv-sur { margin: 0; color: var(--lqv-or); font: 700 12px/1.3 Georgia, serif; letter-spacing: 0.22em; text-transform: uppercase; }
.av-nouveau .av-h1 { margin: 2px 0 0; font-size: clamp(30px, 3.4vw, 44px); }
.av-nouveau .av-sous { max-width: none; margin: 2px 0 14px; font-size: 15px; }
.av-nv { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 0; box-sizing: border-box; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; text-align: left; }
.av-nv-perso { display: grid; grid-template-rows: 1fr auto; gap: 14px; padding: 10px 22px 14px 8px; border-right: 1px solid rgba(226, 196, 138, 0.2); }
.av-nv-apercu { display: grid; place-items: end center; min-height: 250px; padding-bottom: 12px; background: radial-gradient(ellipse 60% 14% at 50% 94%, rgba(0, 0, 0, 0.55), transparent 70%), radial-gradient(ellipse at 50% 60%, rgba(120, 96, 60, 0.28), transparent 68%); }
.av-nv-apercu canvas { height: 230px; width: auto; }
.av-nv-nom { display: grid; gap: 6px; }
.av-nv-reglages { display: grid; grid-template-rows: auto 1fr; gap: 12px; padding: 10px 8px 6px 24px; }
/* deux étapes dans la même case : le cadre garde la taille de la plus grande ; l'étape cachée s'efface */
.av-nv-etapes { display: flex; gap: 22px; margin: 0; padding-bottom: 8px; border-bottom: 1px solid rgba(226, 196, 138, 0.16); font: 700 12px/1.3 Georgia, serif; letter-spacing: 0.14em; text-transform: uppercase; color: #6f6656; }
.av-nv-etapes .actif { color: var(--lqv-or-clair); }
.av-nv-pages { display: grid; }
.av-nv-page { grid-area: 1 / 1; display: grid; grid-template-rows: auto auto 1fr auto; align-content: start; gap: 8px; transition: opacity 0.25s ease, transform 0.25s ease; }
.av-nv-page.cachee { visibility: hidden; opacity: 0; transform: translateX(10px); transition: opacity 0.2s ease, transform 0.2s ease, visibility 0s 0.2s; }
.av-nv-page > .av-label + * { margin-bottom: 8px; }
.av-nv-page > .av-actions { grid-row: -2 / -1; align-self: end; }
.av-nv-nom-fixe { display: grid; align-content: center; margin: 0; text-align: center; font: 700 24px/1.2 Georgia, serif; color: #f6eedc; letter-spacing: 0.02em; }
.av-nv-nom, .av-nv-nom-fixe { min-height: 64px; }
.av-nv-nom[hidden], .av-nv-nom-fixe[hidden] { display: none; }
.av-nv-question { margin: 6px 0 6px; font: 700 22px/1.25 Georgia, serif; color: #f6eedc; }
.av-nv-note { margin: 4px 0 0; font: italic 13px/1.4 Georgia, serif; color: #8f8573; }
.av-nv-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.av-nv-mode { display: grid; gap: 8px; align-content: start; min-height: 180px; padding: 22px 22px; border: 1px solid #3a3446; border-radius: 2px; background: rgba(12, 10, 20, 0.6); color: var(--lqv-ivoire); text-align: left; cursor: pointer; }
.av-nv-mode b { font: 700 20px/1.2 Georgia, serif; color: #f6eedc; }
.av-nv-mode span { font: italic 15px/1.5 Georgia, serif; color: #b9ae98; }
:root:not(.lqv-fondus) :is(.av-nv-page, .av-nv-page.cachee) { transition: none; transform: none; }
.av-nv-mode:hover { border-color: var(--lqv-or); }
.av-nv-mode.choisi { border-color: var(--lqv-or-clair); background: linear-gradient(180deg, rgba(214, 178, 110, 0.18), rgba(214, 178, 110, 0.06)); box-shadow: inset 0 0 0 1px rgba(255, 231, 176, 0.25); }
.av-nv-mode.choisi b { color: #ffe7b0; }
.av-nv-mode:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.av-apparence.sans-apercu { display: block; margin: 0; max-width: none; }
.av-nv .av-ap-choix { gap: 6px; }
.av-nv .av-ap-ligne { grid-template-columns: 112px 1fr; }
.av-nouveau .av-label { margin: 0; color: var(--lqv-or); font: 700 12px/1.3 Georgia, serif; letter-spacing: 0.14em; text-transform: uppercase; }
.av-nouveau .av-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; }
.av-nouveau .av-actions .av-btn { min-width: 170px; }
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
.av-resultat .av-h1 { font-size: clamp(30px, min(3.4vw, 5.2vh), 56px); }
.av-resultat.av-accroche { margin-bottom: 1.6vh; }
@media (min-width: 1600px) and (min-height: 960px) { .av-titre.av-resultat { zoom: 1.2; } }
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
/* passe 207 — retour du test (2026-11-04) : « textes de résultat et récompenses trop en vrac », « manque de mise en valeur des
   textes » : un vocabulaire commun. Le mot qui compte (nom, nombre, carte, Technique) en or clair ; un surtitre en petites
   capitales ; des lignes titrées (.av-fiche) ; des étapes numérotées (.av-etapes) ; les cartes gagnées avec leur nom. */
:is(.av-titre, .av-confirm, .av-prepa) :is(p, dd, li) b { color: var(--lqv-or-clair); font-weight: 700; }
.av-surtitre { margin: 0 0 -2px; color: var(--lqv-or); font: 700 13px/1.3 Georgia, serif; letter-spacing: 0.26em; text-transform: uppercase; text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9); }
.av-trait > span b { color: var(--lqv-ivoire); font-style: normal; }
.av-aide b { color: var(--lqv-ivoire); }
/* le résultat : l'issue en couleur, puis un bilan en cases */
.av-titre.av-resultat { width: min(980px, 100%); }
.av-resultat .av-items { margin-top: 12px; }
.av-resultat.issue-victoire .av-h1 { color: #ffe9b8; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6), 0 0 34px rgba(255, 196, 100, 0.5); }
.av-resultat.issue-defaite .av-h1 { color: #f0c0b0; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6), 0 0 30px rgba(214, 84, 60, 0.4); }
.av-resultat.issue-abandon .av-h1 { color: #cfc7b8; text-shadow: 0 2px 0 rgba(0, 0, 0, 0.6); }
.av-bilan-panneau { display: flex; flex-wrap: wrap; align-items: stretch; gap: 10px; box-sizing: border-box; margin: 4px auto 0; padding: 2px 6px 2px; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; box-shadow: var(--lqv-ombre); text-align: left; }
.lqv-fondus .av-bilan-panneau { animation: lqv-entree 0.45s 0.1s cubic-bezier(0.22, 0.61, 0.36, 1) both; }
.av-bilan-panneau h3 { margin: 0 0 6px; color: var(--lqv-or); font: 700 12px/1.3 Georgia, serif; letter-spacing: 0.16em; text-transform: uppercase; }
.av-bilan-cases { display: contents; }
.av-bilan-case, .av-bilan-gains { box-sizing: border-box; padding: 7px 14px 8px; border: 1px solid rgba(226, 196, 138, 0.2); background: rgba(9, 10, 18, 0.5); }
.av-bilan-case { flex: 1 1 190px; }
.av-bilan-gains { flex: 2 1 300px; display: flex; flex-direction: column; }
.av-pv { display: flex; align-items: baseline; gap: 10px; margin: 2px 0 0; font: 700 26px/1.1 Georgia, serif; }
.av-pv b { color: var(--lqv-or-clair); font-size: 38px; text-shadow: 0 0 18px rgba(255, 196, 100, 0.3); }
.av-pv-avant { color: var(--lqv-sepia); }
.av-fleche { color: var(--lqv-or); font-size: 22px; }
.av-pv small { margin-left: -6px; color: var(--lqv-sepia); font: 15px/1 Georgia, serif; }
.av-bilan-aide { display: block; margin-top: 6px; color: var(--lqv-sepia); font: italic 13px/1.35 Georgia, serif; }
.av-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.av-stat { display: grid; justify-items: center; align-content: start; gap: 4px; text-align: center; }
.av-stat b { color: var(--lqv-or-clair); font: 700 34px/1 Georgia, serif; }
.av-stat span { color: var(--lqv-sepia); font: 12.5px/1.25 Georgia, serif; }
.av-gains { --card-w: 74px; display: flex; flex-wrap: wrap; justify-content: center; align-items: flex-start; gap: 12px 18px; margin: auto 0; }
.av-gains.nombreuses { --card-w: 52px; gap: 8px 10px; max-height: 40vh; overflow-y: auto; }
.av-gain { display: grid; justify-items: center; gap: 6px; margin: 0; text-align: center; }
.av-gain .card { cursor: default; }
.av-gain figcaption { display: grid; max-width: calc(var(--card-w) + 48px); }
.av-gain figcaption b { color: var(--lqv-or-clair); font: 700 13.5px/1.25 Georgia, serif; }
.av-gain figcaption small { color: var(--lqv-sepia); font: italic 12.5px/1.25 Georgia, serif; }
/* au résultat, sous le buste : cartes à la taille de l'écran ; une ou deux cartes, la légende à côté */
.av-gains.peu .av-gain { grid-template-columns: auto auto; align-items: center; gap: 0 12px; text-align: left; }
.av-gains.peu .av-gain figcaption { max-width: 160px; }
.av-choix-carte .av-btn { min-width: 0; width: 100%; padding: 8px 12px; } .av-choix-carte .av-btn b { font-size: 16px; }
.av-gain-pile { --card-w: 52px; display: flex; gap: 4px; }
.av-gain-large figcaption { max-width: none; }
.av-bilan-rien { margin: auto 0; color: var(--lqv-sepia); font: italic 15px/1.4 Georgia, serif; text-align: center; }
.av-bilan-note { flex: 1 1 100%; margin: 0; padding: 6px 6px 0; border-top: 1px solid rgba(226, 196, 138, 0.2); color: var(--lqv-ivoire); font: italic 15.5px/1.45 Georgia, serif; text-align: center; }
/* le choix de la variante : la consigne en tête du cadre, les trois cartes dessous */
.av-ecran-choix .av-bilan-panneau { display: block; padding: 6px 16px 10px; text-align: center; }
.av-choix-consigne { font-size: 13px !important; }
.av-choix-aide { margin: 0 auto 4px; max-width: 640px; color: var(--lqv-sepia); font: italic 14px/1.45 Georgia, serif; }
.av-choix-carte > b { display: flex; align-items: center; gap: 7px; color: var(--lqv-or-clair); font: 700 16px/1.2 Georgia, serif; }
.av-choix-lettre { display: grid; place-items: center; width: 22px; height: 22px; border: 1px solid var(--lqv-or); color: var(--lqv-or); font: 700 12px/1 Georgia, serif; }
/* fenêtres : lignes titrées, étapes, Technique */
.av-fiche { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 8px 18px; align-items: baseline; margin: 10px 0 4px; }
.av-fiche dt { color: var(--lqv-or); font: 700 12px/1.6 Georgia, serif; letter-spacing: 0.14em; text-transform: uppercase; }
.av-fiche dd { margin: 0; padding-bottom: 8px; border-bottom: 1px solid rgba(226, 196, 138, 0.12); color: var(--lqv-ivoire); }
.av-fiche dd:last-of-type { border-bottom: 0; padding-bottom: 0; }
.av-fiche .av-enjeu { flex-wrap: wrap; }
.av-enjeu > span { display: grid; } .av-enjeu > span b { color: var(--lqv-or-clair); font-size: 16px; } .av-enjeu > span small { color: var(--lqv-sepia); font-style: italic; }
.av-rien { color: var(--lqv-sepia); font-style: italic; }
.av-etapes { display: grid; gap: 6px; margin: 4px 0 6px; padding: 0; list-style: none; counter-reset: etape; }
.av-etapes li { display: grid; grid-template-columns: 26px minmax(0, 1fr) minmax(0, 1.15fr); align-items: baseline; gap: 0 4px; counter-increment: etape; }
.av-etapes li::before { content: counter(etape); display: grid; place-items: center; width: 20px; height: 20px; align-self: center; border: 1px solid var(--lqv-or); color: var(--lqv-or); font: 700 12px/1 Georgia, serif; }
.av-etapes li > span:last-child { justify-self: end; padding-left: 14px; color: var(--lqv-sepia); font-style: italic; text-align: right; }
.av-tech-ligne { display: flex; align-items: baseline; gap: 14px; margin: 6px 0; padding: 6px 12px; border-left: 2px solid var(--lqv-or); background: rgba(226, 196, 138, 0.07); }
.av-tech-nom { display: grid; flex: none; } .av-tech-nom small { color: var(--lqv-or); font: 700 10.5px/1.3 Georgia, serif; letter-spacing: 0.14em; text-transform: uppercase; } .av-tech-nom b { color: var(--lqv-or-clair); font: 700 17px/1.2 Georgia, serif; }
.av-tech-ligne > span:last-child { color: var(--lqv-sepia); font-size: 14px; line-height: 1.4; }
.av-recompense .av-gains { margin: 8px 0 4px; }
/* passe 208 — retour du test : « les cartes n'ont pas toujours les mêmes dimensions ». --card-h est calculée une seule fois
   sur :root (96 px × 1,4 = 134 px) et héritée telle quelle : un conteneur qui ne changeait que --card-w donnait des cartes
   étirées (60 × 134 à la préparation, au résultat) ou trapues (108 × 134 au choix). Chaque carte de l'aventure reprend sa
   hauteur à 1,4 fois sa largeur, comme au duel. */
:is(.av-titre, .av-confirm, .av-prepa, .av-modal, .av-cards, .av-choix-cartes, .av-enjeu, .av-deck-cards, .av-rang-cases, .av-choix, .av-col-cartes, .av-gains, .av-gain-pile) .card { --card-h: calc(var(--card-w) * 1.4); --radius: calc(var(--card-w) * 0.07); }
/* passe 209 — retour du test : « encore trop de texte descriptif visible […] des tooltips si on a besoin d'infos
   supplémentaires ». L'écran garde l'essentiel ; le détail se lit dans une bulle (infobulle.ts), au survol ou au clavier,
   sur l'élément lui-même ou sur une pastille « i » posée à côté d'un titre. */
.lqv-infobulle { position: fixed; z-index: 5000; max-width: min(340px, calc(100vw - 16px)); box-sizing: border-box; padding: 8px 12px; border: 1px solid rgba(226, 196, 138, 0.7); background: linear-gradient(180deg, #1b1c2b, #10111b); box-shadow: 0 10px 28px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(0, 0, 0, 0.6); color: var(--lqv-ivoire); font: 14px/1.45 Georgia, serif; text-align: left; pointer-events: none; opacity: 0; transform: translateY(3px); transition: opacity 0.14s ease-out, transform 0.14s ease-out; }
.lqv-infobulle.dessous { transform: translateY(-3px); }
.lqv-infobulle.visible { opacity: 1; transform: none; }
.av-info { display: inline-grid; place-items: center; width: 17px; height: 17px; margin: 0 0 0 8px; padding: 0; vertical-align: 0.12em; border: 1px solid rgba(226, 196, 138, 0.75); border-radius: 50%; background: rgba(226, 196, 138, 0.08); color: var(--lqv-or); font: italic 700 11px/1 Georgia, serif; letter-spacing: 0; text-transform: none; cursor: help; transition: background 0.15s, color 0.15s; }
.av-info:hover, .av-info:focus-visible { background: var(--lqv-or); color: #1a1408; outline: none; }
:is(.av-titre, .av-confirm, .av-prepa, .av-ecran, .av-modal, .shell) [data-info]:not(button):not(a) { cursor: help; }
.av-tech-ligne { align-items: center; gap: 10px; }
.av-tech-ligne > small { color: var(--lqv-or); font: 700 10.5px/1.3 Georgia, serif; letter-spacing: 0.14em; text-transform: uppercase; }
.av-tech-ligne > b { color: var(--lqv-or-clair); font: 700 17px/1.2 Georgia, serif; }
.av-tech-ligne > .av-info { margin-left: 0; }
.av-nv-mode { min-height: 110px; align-content: center; }
/* M16 : la Technique de départ (nouvelle aventure) */
.av-nv-page:has(.av-nv-techs) { grid-template-rows: auto auto auto auto 1fr auto; }
.av-nv-techs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.av-nv-tech { display: grid; gap: 4px; align-content: center; min-height: 64px; padding: 10px 18px; border: 1px solid #3a3446; border-radius: 2px; background: rgba(12, 10, 20, 0.6); color: var(--lqv-ivoire); text-align: left; cursor: pointer; font: inherit; }
.av-nv-tech b { font: 700 17px/1.2 Georgia, serif; color: #f6eedc; }
.av-nv-tech span { font: italic 14px/1.4 Georgia, serif; color: #b9ae98; }
.av-nv-tech:hover { border-color: var(--lqv-or); }
.av-nv-tech.choisi { border-color: var(--lqv-or-clair); background: linear-gradient(180deg, rgba(214, 178, 110, 0.18), rgba(214, 178, 110, 0.06)); box-shadow: inset 0 0 0 1px rgba(255, 231, 176, 0.25); }
.av-nv-tech.choisi b { color: #ffe7b0; }
.av-nv-tech:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.av-tech-quand { color: var(--lqv-sepia); font-style: italic; font-size: 14px; }
/* M16 : les cartes qui scintillent dans ce quartier (HUD) */
.av-hud .av-lueurs { margin-top: 6px; padding-left: 16px; color: #ffe3a0; font: italic clamp(14px, 1vw, 19px)/1.35 Georgia, serif; text-shadow: 0 0 8px rgba(255, 200, 110, 0.55), 0 1px 3px rgba(0, 0, 0, 0.9); }
/* M16 : la découverte d'une carte en ville */
.av-decouverte { text-align: center; }
.av-decouverte .av-fiche { text-align: left; }
.av-decouverte-scene { position: relative; display: grid; place-items: center; height: 220px; margin: 6px 0 4px; perspective: 700px; }
.av-decouverte-halo { position: absolute; inset: 0; margin: auto; width: 230px; height: 230px; border-radius: 50%; background: radial-gradient(circle, rgba(255, 226, 150, 0.55) 0%, rgba(255, 196, 100, 0.22) 38%, rgba(255, 170, 70, 0) 70%); animation: av-halo 2.4s ease-in-out infinite; }
.av-decouverte-carte { position: relative; --card-w: 128px; animation: av-retourne 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; transform-style: preserve-3d; filter: drop-shadow(0 0 18px rgba(255, 210, 120, 0.55)); }
.av-decouverte-carte .card { --card-h: calc(var(--card-w) * 1.4); --radius: calc(var(--card-w) * 0.07); }
.av-decouverte-nom { display: grid; gap: 2px; margin: 4px 0 8px; }
.av-decouverte-nom b { color: var(--lqv-or-clair); font: 700 22px/1.2 Georgia, serif; }
.av-decouverte-nom small { color: var(--lqv-sepia); font-style: italic; }
@keyframes av-retourne { 0% { transform: rotateY(180deg) scale(0.6); opacity: 0; } 45% { opacity: 1; } 100% { transform: rotateY(0) scale(1); opacity: 1; } }
@keyframes av-halo { 0%, 100% { transform: scale(0.94); opacity: 0.8; } 50% { transform: scale(1.06); opacity: 1; } }
.av-decouverte.calme .av-decouverte-carte, .av-decouverte.calme .av-decouverte-halo { animation: none; }
${STYLES_CINEMA}`
  document.head.append(s);
}
