/**
 * RNG gameplay déterministe (xorshift32). L’état (un entier) vit DANS l’état de jeu,
 * ce qui rend `applyCommand` pur et le replay exact. Aucune utilisation de Math.random().
 */
export function seedToState(seed: number): number {
  // Mélange simple (splitmix-like) pour éviter les graines faibles.
  let x = (seed | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return x >>> 0 || 0x1234567;
}

export function nextState(state: number): number {
  let x = state >>> 0;
  x ^= x << 13; x >>>= 0;
  x ^= x >>> 17;
  x ^= x << 5; x >>>= 0;
  return x >>> 0;
}

/** Holder mutable utilisé à l’intérieur d’une transition (sur une copie de l’état). */
export interface RngHolder { rng: number }

export function nextFloat(holder: RngHolder): number {
  holder.rng = nextState(holder.rng);
  return holder.rng / 4294967296;
}

export function nextInt(holder: RngHolder, maxExclusive: number): number {
  return Math.floor(nextFloat(holder) * maxExclusive);
}

export function shuffleInPlace<T>(holder: RngHolder, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = nextInt(holder, i + 1);
    const tmp = arr[i] as T;
    arr[i] = arr[j] as T;
    arr[j] = tmp;
  }
}

/** RNG autonome (IA, art) : n’altère jamais l’état gameplay. */
export function makeRng(seed: number): () => number {
  let s = seedToState(seed);
  return () => {
    s = nextState(s);
    return s / 4294967296;
  };
}

/** Hash 32 bits FNV-1a d’une chaîne (graines dérivées, hash de replay). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
