/** M17 — styles des leçons (maître de table, mise en lumière, rideau, bibliothèque), posés une fois. */
const CSS = `
.lecon-voile { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 4; pointer-events: none; opacity: 0; transition: opacity 0.25s ease; }
.lecon-voile.on { opacity: 1; }
.lecon-anneaux { position: fixed; inset: 0; z-index: 4; pointer-events: none; }
.lecon-anneau { position: fixed; border-radius: 10px; box-shadow: 0 0 0 2px #ffd36b, 0 0 18px 4px rgba(255, 196, 90, 0.75); animation: leconPulse 1.3s ease-in-out infinite; }
@keyframes leconPulse { 50% { box-shadow: 0 0 0 3px #fff0bf, 0 0 28px 8px rgba(255, 196, 90, 0.9); } }
.reduced .lecon-anneau, .lecon-calme .lecon-anneau { animation: none; }
.lecon-coach { position: fixed; z-index: 5; left: calc(var(--g, 16px)); top: 50%; translate: 0 -50%; width: clamp(300px, 26vw, 470px); display: grid; gap: 0.45rem; padding: 0.7rem 0.85rem 0.75rem; border-radius: 12px;
  border: 1px solid rgba(232, 185, 74, 0.75); background: linear-gradient(180deg, rgba(28, 20, 14, 0.96), rgba(14, 10, 8, 0.96)); box-shadow: 0 12px 34px rgba(0, 0, 0, 0.7); color: #f3e9d6; font-size: calc(clamp(0.86rem, 0.72vw + 0.3rem, 1.05rem) * var(--ui-scale, 1)); line-height: 1.42; }
.lecon-coach[hidden] { display: none; }
.lecon-coach.droite { left: auto; right: calc(var(--g, 16px)); }
.lecon-plaque { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.2rem 0.6rem; }
.lecon-plaque b { font-family: Georgia, serif; color: #ffd98a; font-size: 1.02em; letter-spacing: 0.02em; }
.lecon-titre { font-size: 0.74em; text-transform: uppercase; letter-spacing: 0.12em; color: #c9b48d; }
.lecon-dire { margin: 0; }
.lecon-faire { margin: 0; padding: 0.35rem 0.55rem; border-radius: 8px; background: rgba(255, 211, 107, 0.12); border-left: 3px solid #ffd36b; color: #fff3cf; font-weight: 600; }
.lecon-coach .btn { justify-self: start; padding: 0.2rem 0.7rem; font-size: 0.78em; }
.lecon-rideau { position: fixed; inset: 0; z-index: 2900; background: #04060c; opacity: 0; pointer-events: none; transition: opacity 0.6s cubic-bezier(0.45, 0, 0.55, 1); }
.lecon-rideau.on { opacity: 1; pointer-events: auto; }
.lecon-fin h2, .lecon-dialog h2 { margin: 0.2rem 0 0.4rem; }
.lecon-dialog { max-width: min(42rem, 94vw); max-height: 88vh; overflow: auto; }
.lecon-profils { display: grid; gap: 0.5rem; margin: 0.6rem 0; }
.lecon-profil { display: grid; gap: 0.15rem; text-align: left; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1px solid rgba(232, 185, 74, 0.5); background: rgba(255, 255, 255, 0.04); color: inherit; cursor: pointer; font: inherit; }
.lecon-profil:hover, .lecon-profil:focus-visible { border-color: #ffd36b; background: rgba(255, 211, 107, 0.1); outline: none; }
.lecon-profil b { color: #ffd98a; }
.lecon-profil small { color: #c9b48d; }
.lecon-groupe { margin: 0.7rem 0 0.3rem; font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.14em; color: #c9b48d; }
.lecon-liste { display: grid; gap: 0.3rem; }
.lecon-ligne { display: grid; grid-template-columns: 1.4rem 1fr auto; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; border-radius: 8px; background: rgba(255, 255, 255, 0.035); }
.lecon-ligne .ok { color: #8fd18f; font-weight: 900; text-align: center; }
.lecon-ligne b { color: #f3e9d6; }
.lecon-ligne small { display: block; color: #b9a98a; }
.lecon-ligne .badge { margin-left: 0.4rem; font-size: 0.68rem; padding: 0.05rem 0.4rem; border-radius: 999px; background: #3a2a10; border: 1px solid #e8b94a; color: #ffd98a; }
.lecon-ligne .btn { padding: 0.2rem 0.7rem; font-size: 0.8rem; }
.lecon-tete { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; justify-content: space-between; }
`;

let pose = false;
export function installerStylesLecons(): void {
  if (pose || typeof document === 'undefined') return;
  pose = true;
  const s = document.createElement('style');
  s.dataset.lqv = 'lecons';
  s.textContent = CSS;
  document.head.append(s);
}
