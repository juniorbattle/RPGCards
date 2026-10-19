/**
 * M09 — interface DOM de la ville : bulle d'interaction au-dessus de la zone active (« E — Entrer au Fanal »), toasts,
 * styles. Typographie système et palette du jeu (ivoire, or), comme les écrans hors duel (ADR 020).
 */
import type { Town } from './ville';

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
.ville-btn { font: inherit; color: #efe6d4; background: rgba(30, 28, 40, 0.9); border: 1px solid rgba(226, 196, 138, 0.4); border-radius: 7px; padding: 5px 10px; cursor: pointer; }
.ville-btn[aria-pressed="true"] { background: #e2c48a; color: #1a1408; border-color: #ffe7b0; font-weight: 600; }
.ville-btn:focus-visible { outline: 3px solid #ffe7b0; outline-offset: 2px; }
.ville-help { color: #d8ccb4; font-size: 12px; }
.ville-stats { margin-top: 6px; color: #b8c4dc; font: 11px/1.4 ui-monospace, monospace; }
.ville-bubble { position: fixed; z-index: 2650; transform: translate(-50%, -100%); padding: 6px 11px; border-radius: 9px; background: rgba(10, 10, 18, 0.88); border: 1px solid #e2c48a; color: #f6eedc; font: 600 14px/1.2 system-ui, sans-serif; white-space: nowrap; pointer-events: auto; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.55); }
.ville-bubble kbd { display: inline-block; min-width: 1.4em; margin-right: 6px; padding: 1px 5px; border-radius: 4px; background: #e2c48a; color: #1a1408; font: 700 12px/1.3 system-ui, sans-serif; text-align: center; }
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
.ville-tip { position: absolute; left: 50%; top: 16px; transform: translateX(-50%); max-width: min(560px, calc(100vw - 32px)); padding: 9px 16px; border-radius: 10px; background: rgba(20, 16, 10, 0.86); border: 1px solid #e2c48a; color: #fff4dc; font-weight: 600; text-align: center; box-shadow: 0 6px 20px rgba(0,0,0,.5); }
.ville-tip[hidden] { display: none; }
.ville-dialog { position: fixed; z-index: 2700; left: 50%; bottom: 22px; transform: translateX(-50%); width: min(820px, calc(100vw - 32px)); display: flex; gap: 14px; align-items: flex-end; padding: 12px 16px; border-radius: 12px; background: rgba(9, 9, 16, 0.94); border: 1px solid #e2c48a; color: #f6eedc; font: 15px/1.45 system-ui, sans-serif; box-shadow: 0 10px 34px rgba(0,0,0,.65); }
.ville-portrait { width: 112px; height: 112px; flex: none; border-radius: 10px; border: 1px solid rgba(226, 196, 138, 0.55); background: #141019; object-fit: cover; }
.ville-dialog-body { flex: 1; min-width: 0; }
.ville-dialog-body b { display: block; font: 700 17px/1.2 Georgia, serif; color: #ffe7b0; margin-bottom: 4px; }
.ville-dialog-body p { margin: 0 0 10px; }
.ville-choices { display: flex; flex-wrap: wrap; gap: 8px; }
.ville-btn.primary { background: #e2c48a; color: #1a1408; border-color: #ffe7b0; font-weight: 700; }
.ville-card { position: fixed; inset: 0; z-index: 2900; display: grid; place-content: center; text-align: center; pointer-events: none; background: radial-gradient(ellipse at 50% 50%, rgba(4,6,12,0.55), rgba(4,6,12,0.95)); color: #ffe7b0; }
.ville-card b { font: 700 clamp(40px, 6vw, 84px)/1 Georgia, serif; letter-spacing: 0.04em; text-shadow: 0 0 24px rgba(255, 190, 110, 0.35); }
.ville-card span { margin-top: 10px; font: italic 18px/1.2 Georgia, serif; color: #d8ccb4; letter-spacing: 0.2em; text-transform: uppercase; }
.ville-card.out { opacity: 0; transition: opacity 1.4s ease 1.4s; }
.ville-fade { position: fixed; inset: 0; z-index: 2950; pointer-events: none; background: #04060c; opacity: 0; transition: opacity 0.28s ease; }
.ville-fade.in { opacity: 1; }
.ville-fade.out { opacity: 0; transition-duration: 0.4s; }
.ville-toast { position: fixed; left: 50%; bottom: 28px; z-index: 2800; transform: translateX(-50%); padding: 9px 16px; border-radius: 10px; background: rgba(10, 10, 18, 0.92); border: 1px solid rgba(226, 196, 138, 0.55); color: #f6eedc; font: 14px/1.35 system-ui, sans-serif; max-width: calc(100vw - 32px); }
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
      const h = z.kind === 'parler' ? 2.05 : 2.6;
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
