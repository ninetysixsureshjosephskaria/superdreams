/** Query-key factory for the bonus-campaigns admin surface. */
export const bonusKeys = {
  all: ['bonus-campaigns'] as const,
  list: () => [...bonusKeys.all, 'list'] as const,
};
