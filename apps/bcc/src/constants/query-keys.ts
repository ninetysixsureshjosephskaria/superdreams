/**
 * Centralized TanStack Query keys. Keeping keys in one place avoids typos and
 * makes cache invalidation predictable as modules are added.
 */
export const queryKeys = {
  system: {
    info: ['system', 'info'] as const,
  },
} as const;
