/** Platform storage namespace for client-side persisted keys. */
export const STORAGE_NAMESPACE = 'superdreams';

/** Builds a namespaced storage key, e.g. `storageKey('bcc', 'theme')`. */
export function storageKey(...parts: string[]): string {
  return [STORAGE_NAMESPACE, ...parts].join('.');
}

/** API versioning constants. */
export const API = {
  version: 'v1',
  basePath: '/api/v1',
} as const;

/** Default pagination values. */
export const PAGINATION = {
  defaultPage: 1,
  defaultPageSize: 25,
  maxPageSize: 100,
} as const;

/** Common validation regular expressions. */
export const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
} as const;

/** Shared date-format tokens (Intl-agnostic references for the app layer). */
export const DATE_FORMATS = {
  iso: 'YYYY-MM-DD',
  display: 'DD MMM YYYY',
  dateTime: 'DD MMM YYYY HH:mm',
} as const;
