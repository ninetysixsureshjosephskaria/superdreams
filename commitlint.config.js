/**
 * Super Dreams — Conventional Commits configuration.
 *
 * Enforces the Conventional Commits specification for every commit message.
 * A scope is optional, but when provided it must belong to the platform's
 * known set of modules, domains, and workspaces.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        // Cross-cutting
        'platform',
        'repo',
        'deps',
        'config',
        'ci',
        'docs',
        'infra',
        // Backend services
        'api',
        'worker',
        'scheduler',
        // Applications
        'bcc',
        'member',
        // Domains / modules
        'identity',
        'auth',
        'rbac',
        'members',
        'wallet',
        'rewards',
        'campaigns',
        'notifications',
        'reports',
        'settings',
        // Shared packages
        'ui',
        'theme',
        'api-client',
        'validation',
        'permissions',
        'constants',
        'types',
        'utils',
      ],
    ],
  },
};
