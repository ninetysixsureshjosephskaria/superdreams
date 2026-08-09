/**
 * Drizzle schema barrel — the single source of truth for the database shape.
 *
 * Contains only platform-level foundation tables. Business modules add their own
 * tables in later phases through independent migrations.
 */
export * from './enums';
export * from './platform';
export * from './audit';
export * from './jobs';
export * from './reference';
export * from './identity';
export * from './auth';
export * from './rbac';
export * from './members';
export * from './wallet';
export * from './finance';
export * from './network';
export * from './earnings';
export * from './profit';
export * from './bonus';
export * from './activation';
export * from './rewards';
export * from './campaigns';
export * from './notifications';
export * from './reports';
export * from './settings';
export * from './store';
export * from './games';
