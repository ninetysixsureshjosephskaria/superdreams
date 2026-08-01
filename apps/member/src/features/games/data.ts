/**
 * Presentation helpers for the Games page. Game data comes from the backend
 * (`/api/v1/games`); these helpers only pick the decorative illustration and
 * gradient for each game card by its code.
 */
export type GameIllustrationKind = 'spin' | 'scratch' | 'draw';

const ILLUSTRATIONS: Record<string, GameIllustrationKind> = {
  SPIN_AND_WIN: 'spin',
  SCRATCH_CARD: 'scratch',
  LUCKY_DRAW: 'draw',
};

const GRADIENTS: Record<GameIllustrationKind, string> = {
  spin: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  scratch: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  draw: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
};

const KINDS: readonly GameIllustrationKind[] = ['spin', 'scratch', 'draw'];

/** Maps a game code to a decorative illustration kind (stable fallback by hash). */
export function illustrationFor(code: string): GameIllustrationKind {
  const known = ILLUSTRATIONS[code];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return KINDS[hash % KINDS.length] as GameIllustrationKind;
}

/** Decorative gradient for a game card. */
export function gradientFor(code: string): string {
  return GRADIENTS[illustrationFor(code)];
}
