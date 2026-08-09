/** Query-key factory for the activation-bonus admin surface. */
export const activationBonusKeys = {
  all: ['activation-bonus'] as const,
  config: () => [...activationBonusKeys.all, 'config'] as const,
};
