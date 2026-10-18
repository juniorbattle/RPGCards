/**
 * Pictogrammes de l’enveloppe (M07 L4, ADR 020) : SVG écrits en code, trait `currentColor`, 24×24.
 * Ils remplacent les lignes d’explication : un pictogramme + un mot, le détail au survol et dans le nom accessible.
 */
const PATHS = {
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  deck: '<rect x="7.5" y="4" width="10" height="14" rx="1.6"/><path d="M5 7.5v11.2c0 .9.7 1.6 1.6 1.6H14"/>',
  collection: '<rect x="3.5" y="4" width="7" height="9.5" rx="1.2"/><rect x="13.5" y="4" width="7" height="9.5" rx="1.2"/><path d="M3.5 17h7M13.5 17h7M3.5 20h7M13.5 20h7"/>',
  options: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',
  help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  restart: '<path d="M5 12a7 7 0 1 0 2.1-5"/><path d="M5 4.5V8h3.5"/>',
  swords: '<path d="M4 4l9 9M20 4l-9 9M6.5 15.5l-2 2M17.5 15.5l2 2M8 14l2 2M16 14l-2 2"/>',
  crown: '<path d="M4 17l1.5-9 4.5 4 2-6 2 6 4.5-4L20 17z"/><path d="M4.5 20h15"/>',
  cards: '<rect x="4" y="6" width="9" height="13" rx="1.4" transform="rotate(-8 8.5 12.5)"/><rect x="11" y="5" width="9" height="13" rx="1.4" transform="rotate(8 15.5 11.5)"/>',
  gem: '<path d="M12 3.5l7 8.5-7 8.5-7-8.5z"/>',
  heart: '<path d="M12 19.5s-7-4.3-7-9.5a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 5.2-7 9.5-7 9.5z" fill="currentColor" fill-opacity=".25"/>',
  lock: '<rect x="6" y="11" width="12" height="9" rx="1.6"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z" fill="currentColor" stroke="none"/>',
  back: '<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  gift: '<rect x="4.5" y="9" width="15" height="11" rx="1.2"/><path d="M4.5 13h15M12 9v11M12 9c-2.5 0-4.5-1-4.5-2.6S9.6 4.5 12 9c2.4-4.5 4.5-4.2 4.5-2.6S14.5 9 12 9"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function iconSvg(name: IconName, size = 20): string {
  return `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}
