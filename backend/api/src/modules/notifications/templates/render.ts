/**
 * Minimal, safe template rendering — pure `{{variable}}` substitution only. No
 * scripting language, no code execution: placeholders are replaced with their
 * string value; unknown placeholders render as an empty string.
 */

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

/** The variables a template accepts (name → string value). */
export type TemplateVariables = Record<string, string | number | boolean | null | undefined>;

/** Extracts the distinct variable names referenced by a template string. */
export function extractVariables(text: string): string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER)) {
    if (match[1]) {
      names.add(match[1]);
    }
  }
  return [...names];
}

/** Substitutes `{{name}}` placeholders with values (missing → empty string). */
export function render(text: string, variables: TemplateVariables): string {
  return text.replace(PLACEHOLDER, (_full, name: string) => {
    const value = variables[name];
    return value === undefined || value === null ? '' : String(value);
  });
}

/** Renders a subject + body pair with the given variables. */
export function renderTemplate(
  template: { subject: string | null; body: string },
  variables: TemplateVariables,
): { subject: string | null; body: string } {
  return {
    subject: template.subject === null ? null : render(template.subject, variables),
    body: render(template.body, variables),
  };
}

/** Returns declared variables that are missing from the provided values. */
export function missingVariables(declared: string[], provided: TemplateVariables): string[] {
  return declared.filter(
    (name) => provided[name] === undefined || provided[name] === null || provided[name] === '',
  );
}
