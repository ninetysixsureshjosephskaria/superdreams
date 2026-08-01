type ClassValue = string | number | null | false | undefined;

/**
 * Joins truthy class name values into a single string. A dependency-free helper
 * for conditional Tailwind class composition.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string | number => Boolean(value)).join(' ');
}
