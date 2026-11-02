/**
 * M09 — interface DOM de la ville : bulle d'interaction au-dessus de la zone active (« E — Entrer au Fanal »), toasts,
 * styles. Palette du jeu (nuit, ivoire, or) ; M14 : langage commun de l'interface hors combat (ADR 049) : cadre ornementé
 * dessiné par code (`--lqv-cadre`), coins carrés, Georgia pour ce qui se lit et se clique, système pour les petites données.
 */
import type { Town } from './ville';

import '../interface.css';

let styled = false;
export function installVilleStyles(): void {
  if (styled) return;
  styled = true;
  const s = document.createElement('style');
  s.textContent = `
.ville-host { position: fixed; inset: 0; background: #04060c; overflow: hidden; }
.ville-canvas { display: block; }
.ville-panel { position: fixed; left: 16px; top: 14px; z-index: 2650; max-width: min(640px, calc(100vw - 32px)); padding: 10px 14px; border-radius: 10px; background: rgba(8, 9, 16, 0.78); border: 1px solid rgba(226, 196, 138, 0.35); color: #efe6d4; font: 13px/1.4 system-ui, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.5); }
.ville-title b { font-family: Georgia, serif; font-size: 16px; color: #ffe7b0; }
.ville-title small { display: block; color: #c9bda6; font-size: 12px; }
.ville-cams { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 6px; }
.ville-btn { font: 600 14px/1.2 Georgia, serif; letter-spacing: 0.01em; color: var(--lqv-ivoire); background: linear-gradient(180deg, rgba(36, 36, 54, 0.94), rgba(16, 17, 28, 0.96)); border: 1px solid rgba(226, 196, 138, 0.42); border-radius: 2px; padding: 7px 14px; cursor: pointer; transition: border-color 0.12s, color 0.12s, box-shadow 0.12s; }
.ville-btn:hover:not(:disabled) { border-color: var(--lqv-or-clair); color: var(--lqv-or-clair); box-shadow: 0 0 12px rgba(255, 200, 120, 0.2); }
.ville-btn:disabled { opacity: 0.45; cursor: default; }
.ville-btn[aria-pressed="true"] { background: linear-gradient(180deg, #f2dcab, #d6b26e); color: #1a1408; border-color: var(--lqv-or-clair); }
.ville-btn:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.ville-help { color: #d8ccb4; font-size: 12px; }
.ville-stats { margin-top: 6px; color: #b8c4dc; font: 11px/1.4 ui-monospace, monospace; }
.ville-bubble { position: fixed; z-index: 2650; transform: translate(-50%, -100%); padding: 6px 12px; border-radius: 2px; background: rgba(10, 11, 19, 0.92); border: 1px solid var(--lqv-or); color: var(--lqv-ivoire); font: 600 14px/1.2 Georgia, serif; white-space: nowrap; pointer-events: auto; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.55); }
.ville-bubble kbd { display: inline-block; min-width: 1.4em; margin-right: 8px; padding: 1px 5px; border-radius: 2px; background: linear-gradient(180deg, #f2dcab, #d6b26e); color: #1a1408; font: 700 12px/1.3 system-ui, sans-serif; text-align: center; }
.ville-bubble[hidden] { display: none; }
.ville-host.demo { z-index: 2000; }
.ville-host[hidden] { display: none; }
#shell.scr-ville { pointer-events: none; overflow: hidden; background: none; }
#shell.scr-ville .ville-hud { pointer-events: none; }
#shell.scr-ville .ville-hud button { pointer-events: auto; }
.ville-hud { position: fixed; inset: 0; color: #efe6d4; font: 14px/1.4 system-ui, sans-serif; }
.ville-place { position: absolute; left: 16px; top: 14px; padding: 8px 14px; border-radius: 10px; background: rgba(8, 9, 16, 0.72); border: 1px solid rgba(226, 196, 138, 0.35); }
.ville-place b { display: block; font: 700 20px/1.1 Georgia, serif; color: #ffe7b0; }
.ville-place small { color: #cfc3ac; font-size: 12px; }
.ville-objective { position: absolute; left: 16px; top: 82px; max-width: min(520px, calc(100vw - 32px)); padding: 7px 12px; border-radius: 9px; background: rgba(8, 9, 16, 0.66); border-left: 3px solid #e2c48a; color: #f3ead8; }
.ville-objective::before { content: "Objectif — "; color: #e2c48a; font-weight: 700; }
.ville-tools { position: absolute; right: 16px; top: 14px; display: flex; gap: 6px; }
.ville-tip { position: absolute; left: 50%; top: 16px; transform: translateX(-50%); max-width: min(560px, calc(100vw - 32px)); padding: 9px 16px; border-radius: 2px; background: rgba(14, 12, 12, 0.92); border: 1px solid var(--lqv-or); color: #fff4dc; font: 600 14px/1.35 Georgia, serif; text-align: center; box-shadow: 0 6px 20px rgba(0,0,0,.5); }
.ville-tip[hidden] { display: none; }
.ville-dialog, .ville-dialog-sortie { position: fixed; z-index: 2700; left: 50%; bottom: 14px; transform: translateX(-50%); box-sizing: border-box; width: min(clamp(980px, 62vw, 1320px), calc(100vw - 24px)); min-height: 148px; display: flex; gap: 18px; align-items: center; padding: 6px 14px; border: 14px solid transparent; border-image: var(--lqv-cadre) 14 / 14px stretch; background: var(--lqv-panneau) border-box; color: var(--lqv-ivoire); font: clamp(17px, 1.15vw, 22px)/1.5 Georgia, serif; box-shadow: var(--lqv-ombre); }
/* passe 200 : on entre et on sort en douceur ; une réplique qui en suit une autre garde son cadre, seul le texte change */
@media (prefers-reduced-motion: no-preference) {
  .ville-dialog, .av-confirm { animation: lqv-entree 0.3s cubic-bezier(0.22, 0.61, 0.36, 1); }
  .ville-dialog.enchaine { animation: none; }
  .ville-dialog.enchaine .ville-dialog-body > p, .ville-dialog.enchaine .ville-choices, .ville-dialog.enchaine:not(.meme-voix) > .ville-portrait, .ville-dialog.enchaine:not(.meme-voix) .ville-dialog-body > b { animation: lqv-texte 0.3s ease-out; }
  .sortie { animation: lqv-sortie 0.22s ease-in forwards; pointer-events: none; }
}
@keyframes lqv-entree { from { opacity: 0; translate: 0 8px; } to { opacity: 1; translate: 0 0; } }
@keyframes lqv-texte { from { opacity: 0; } to { opacity: 1; } }
@keyframes lqv-sortie { from { opacity: 1; } to { opacity: 0; } }
.ville-portrait { width: clamp(104px, 7.2vw, 150px); height: clamp(104px, 7.2vw, 150px); flex: none; border-radius: 0; border: 1px solid var(--lqv-or); outline: 1px solid rgba(226, 196, 138, 0.32); outline-offset: 2px; background: #141019; object-fit: cover; }
.ville-dialog-body { flex: 1; min-width: 0; }
.ville-dialog-body > b { position: absolute; left: 12px; top: -28px; max-width: calc(100% - 24px); box-sizing: border-box; padding: 4px 22px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font: 700 15px/1.25 Georgia, serif; letter-spacing: 0.02em; color: #1a1408; background: linear-gradient(180deg, #f2dcab, #d6b26e); clip-path: polygon(10px 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 10px 100%, 0 50%); }
.ville-portrait + .ville-dialog-body > b { left: calc(clamp(104px, 7.2vw, 150px) + 26px); max-width: calc(100% - clamp(104px, 7.2vw, 150px) - 38px); font-size: clamp(15px, 1vw, 19px); }
.ville-dialog-body p { margin: 8px 0 12px; }
.ville-choices { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.ville-dialog .ville-btn, .ville-dialog-sortie .ville-btn { font-size: clamp(14px, 1vw, 19px); }
.ville-btn.primary { background: linear-gradient(180deg, #f2dcab, #d6b26e); color: #1a1408; border-color: var(--lqv-or-clair); box-shadow: inset 0 0 0 1px rgba(90, 60, 20, 0.4); }
.ville-btn.primary:hover:not(:disabled) { color: #1a1408; box-shadow: inset 0 0 0 1px rgba(90, 60, 20, 0.4), 0 0 14px rgba(255, 200, 120, 0.35); }
.ville-card { position: fixed; inset: 0; z-index: 2960; display: grid; place-content: center; text-align: center; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, rgba(4,6,12,0.55), rgba(4,6,12,0.95)); color: #ffe7b0; }
.ville-card b { font: 700 clamp(40px, 6vw, 84px)/1 Georgia, serif; letter-spacing: 0.04em; text-shadow: 0 0 24px rgba(255, 190, 110, 0.35); }
.ville-card span { margin-top: 10px; font: italic 18px/1.2 Georgia, serif; color: #d8ccb4; letter-spacing: 0.2em; text-transform: uppercase; }
.ville-card.out { opacity: 0; transition: opacity 1.4s ease 1.4s; }
@media (prefers-reduced-motion: no-preference) {
  .ville-card.fondu { animation: lqv-carton 3.2s ease both; }
  .ville-card.fondu.court { animation-duration: 1.7s; }
}
@keyframes lqv-carton { from { opacity: 0; } 22% { opacity: 1; } 64% { opacity: 1; } to { opacity: 0; } }
.ville-fade { position: fixed; inset: 0; z-index: 2950; pointer-events: none; background: #04060c; opacity: 0; transition: opacity 0.28s cubic-bezier(0.45, 0, 0.55, 1); }
.ville-fade.in { opacity: 1; }
.ville-fade.out { opacity: 0; transition-duration: 0.4s; }
.ville-toast { position: fixed; left: 50%; bottom: 28px; z-index: 2800; transform: translateX(-50%); padding: 9px 18px; border-radius: 2px; background: rgba(10, 11, 19, 0.95); border: 1px solid var(--lqv-or); color: var(--lqv-ivoire); font: 14px/1.35 Georgia, serif; max-width: calc(100vw - 32px); box-shadow: 0 6px 20px rgba(0,0,0,.5); }
`;
  document.head.append(s);
}

export function toast(text: string, ms = 2600): void {
  installVilleStyles();
  document.querySelectorAll('.ville-toast').forEach((e) => e.remove());
  const t = document.createElement('div');
  t.className = 'ville-toast';
  t.setAttribute('role', 'status');
  t.textContent = text;
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}

/** Bulle « E — action » au-dessus de la zone active ; un clic dessus déclenche la même interaction que E. */
export function promptBubble(town: Town, onClick?: () => void, labelFor?: (z: NonNullable<ReturnType<Town['zone']>>) => string): { update(): void; el: HTMLElement } {
  const el = document.createElement('div');
  el.className = 'ville-bubble';
  el.dataset.key = 'ville-action';
  el.hidden = true;
  if (onClick) el.onclick = onClick;
  document.body.append(el);
  let last = '';
  return {
    el,
    update() {
      const z = town.zone();
      if (!z) { el.hidden = true; last = ''; return; }
      const a = z.area;
      const c = 'r' in a ? { x: a.x, z: a.z } : { x: (a.x0 + a.x1) / 2, z: (a.z0 + a.z1) / 2 };
      const h = z.kind === 'parler' ? town.walkerH() + 0.43 : Math.max(2.6, town.walkerH() + 0.65);
      const p = town.project({ x: c.x, y: h, z: c.z });
      el.hidden = !p.visible;
      el.style.left = `${Math.round(p.x)}px`;
      el.style.top = `${Math.round(p.y)}px`;
      const text = labelFor?.(z) ?? z.label;
      const label = `${z.id}|${text}`;
      if (label !== last) {
        const k = document.createElement('kbd');
        k.textContent = 'E';
        el.replaceChildren(k, document.createTextNode(text));
        last = label;
      }
    },
  };
}
