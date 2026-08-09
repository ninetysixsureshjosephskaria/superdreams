/** Query-key factory for the commission admin surface. */
export const commissionKeys = {
  all: ['commission'] as const,
  config: () => [...commissionKeys.all, 'config'] as const,
};
