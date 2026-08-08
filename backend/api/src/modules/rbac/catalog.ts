/**
 * Canonical, code-defined authorization catalog. Permission checks reference
 * these constants (never string literals), and the catalog is synced into the
 * `permissions` / `roles` tables by {@link syncRbacCatalog}. Business modules add
 * their own permissions to this catalog in their own phases.
 */

export const PERMISSIONS = {
  ROLES_READ: 'roles.read',
  ROLES_ASSIGN: 'roles.assign',
  ROLE_PERMISSIONS_MANAGE: 'roles.permissions.manage',
  PERMISSIONS_READ: 'permissions.read',
  USER_PERMISSIONS_READ: 'users.permissions.read',

  // Authentication account status (Phase 1). Distinct from member.* (loyalty
  // profile lifecycle): these govern the underlying auth account (login access).
  ACCOUNT_READ: 'account.read',
  ACCOUNT_STATUS: 'account.status',

  // Member Management (Phase 13).
  MEMBER_READ: 'member.read',
  MEMBER_CREATE: 'member.create',
  MEMBER_UPDATE: 'member.update',
  MEMBER_DELETE: 'member.delete',
  MEMBER_STATUS: 'member.status',
  MEMBER_NOTE_CREATE: 'member.note.create',
  MEMBER_DOCUMENT_CREATE: 'member.document.create',

  // Wallet Management (Phase 14).
  WALLET_READ: 'wallet.read',
  WALLET_CREATE: 'wallet.create',
  WALLET_CREDIT: 'wallet.credit',
  WALLET_DEBIT: 'wallet.debit',
  WALLET_ADJUST: 'wallet.adjust',
  WALLET_HOLD: 'wallet.hold',
  WALLET_STATUS: 'wallet.status',
  WALLET_STATEMENT: 'wallet.statement',

  // Rewards Management (Phase 15).
  REWARD_READ: 'reward.read',
  REWARD_PROGRAM_CREATE: 'reward.program.create',
  REWARD_PROGRAM_UPDATE: 'reward.program.update',
  REWARD_PROGRAM_STATUS: 'reward.program.status',
  REWARD_ALLOCATE: 'reward.allocate',
  REWARD_REDEEM: 'reward.redeem',
  REWARD_ADJUST: 'reward.adjust',
  REWARD_EXPIRE: 'reward.expire',

  // Campaign Management (Phase 16).
  CAMPAIGN_READ: 'campaign.read',
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_UPDATE: 'campaign.update',
  CAMPAIGN_STATUS: 'campaign.status',
  CAMPAIGN_SCHEDULE: 'campaign.schedule',
  CAMPAIGN_EXECUTE: 'campaign.execute',

  // Notification Center (Phase 17).
  NOTIFICATION_READ: 'notification.read',
  NOTIFICATION_TEMPLATE_CREATE: 'notification.template.create',
  NOTIFICATION_TEMPLATE_UPDATE: 'notification.template.update',
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_QUEUE_MANAGE: 'notification.queue.manage',

  // Reports & Analytics (Phase 18).
  REPORT_READ: 'report.read',
  REPORT_EXPORT: 'report.export',
  REPORT_SCHEDULE: 'report.schedule',

  // Settings & Administration (Phase 19).
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_FEATURE_MANAGE: 'settings.feature.manage',
  SETTINGS_MAINTENANCE_MANAGE: 'settings.maintenance.manage',

  // Dream Store.
  STORE_READ: 'store.read',
  STORE_PRODUCT_MANAGE: 'store.product.manage',
  STORE_CATEGORY_MANAGE: 'store.category.manage',
  STORE_INVENTORY_MANAGE: 'store.inventory.manage',
  STORE_ORDER_MANAGE: 'store.order.manage',

  // Games.
  GAME_READ: 'game.read',
  GAME_MANAGE: 'game.manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface PermissionDefinition {
  key: string;
  resource: string;
  action: string;
  description: string;
}

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  {
    key: PERMISSIONS.ROLES_READ,
    resource: 'roles',
    action: 'read',
    description: 'List and view roles.',
  },
  {
    key: PERMISSIONS.ROLES_ASSIGN,
    resource: 'roles',
    action: 'assign',
    description: 'Assign or remove roles from users.',
  },
  {
    key: PERMISSIONS.ROLE_PERMISSIONS_MANAGE,
    resource: 'roles',
    action: 'permissions.manage',
    description: 'Assign or remove permissions from roles.',
  },
  {
    key: PERMISSIONS.PERMISSIONS_READ,
    resource: 'permissions',
    action: 'read',
    description: 'List and view permissions.',
  },
  {
    key: PERMISSIONS.USER_PERMISSIONS_READ,
    resource: 'users',
    action: 'permissions.read',
    description: 'View effective permissions for a user.',
  },
  {
    key: PERMISSIONS.ACCOUNT_READ,
    resource: 'account',
    action: 'read',
    description: 'View a member’s authentication account status (login access).',
  },
  {
    key: PERMISSIONS.ACCOUNT_STATUS,
    resource: 'account',
    action: 'status',
    description:
      'Change a member’s authentication account status (activate / suspend / deactivate login).',
  },
  {
    key: PERMISSIONS.MEMBER_READ,
    resource: 'member',
    action: 'read',
    description: 'List and view members.',
  },
  {
    key: PERMISSIONS.MEMBER_CREATE,
    resource: 'member',
    action: 'create',
    description: 'Create members.',
  },
  {
    key: PERMISSIONS.MEMBER_UPDATE,
    resource: 'member',
    action: 'update',
    description: 'Update member details.',
  },
  {
    key: PERMISSIONS.MEMBER_DELETE,
    resource: 'member',
    action: 'delete',
    description: 'Archive (soft-delete) members.',
  },
  {
    key: PERMISSIONS.MEMBER_STATUS,
    resource: 'member',
    action: 'status',
    description: 'Change member status (suspend / reactivate / archive).',
  },
  {
    key: PERMISSIONS.MEMBER_NOTE_CREATE,
    resource: 'member',
    action: 'note.create',
    description: 'Add administrative notes to a member.',
  },
  {
    key: PERMISSIONS.MEMBER_DOCUMENT_CREATE,
    resource: 'member',
    action: 'document.create',
    description: 'Add document metadata to a member.',
  },
  {
    key: PERMISSIONS.WALLET_READ,
    resource: 'wallet',
    action: 'read',
    description: 'List and view wallets, balances, transactions and statements.',
  },
  {
    key: PERMISSIONS.WALLET_CREATE,
    resource: 'wallet',
    action: 'create',
    description: 'Create wallets for members.',
  },
  {
    key: PERMISSIONS.WALLET_CREDIT,
    resource: 'wallet',
    action: 'credit',
    description: 'Credit funds to a wallet.',
  },
  {
    key: PERMISSIONS.WALLET_DEBIT,
    resource: 'wallet',
    action: 'debit',
    description: 'Debit funds from a wallet.',
  },
  {
    key: PERMISSIONS.WALLET_ADJUST,
    resource: 'wallet',
    action: 'adjust',
    description: 'Post manual balance adjustments and reversals.',
  },
  {
    key: PERMISSIONS.WALLET_HOLD,
    resource: 'wallet',
    action: 'hold',
    description: 'Place and release holds on wallet funds.',
  },
  {
    key: PERMISSIONS.WALLET_STATUS,
    resource: 'wallet',
    action: 'status',
    description: 'Activate, suspend or close wallets.',
  },
  {
    key: PERMISSIONS.WALLET_STATEMENT,
    resource: 'wallet',
    action: 'statement',
    description: 'Generate wallet statements.',
  },
  {
    key: PERMISSIONS.REWARD_READ,
    resource: 'reward',
    action: 'read',
    description: 'List and view reward programs, balances, ledgers and history.',
  },
  {
    key: PERMISSIONS.REWARD_PROGRAM_CREATE,
    resource: 'reward',
    action: 'program.create',
    description: 'Create reward programs.',
  },
  {
    key: PERMISSIONS.REWARD_PROGRAM_UPDATE,
    resource: 'reward',
    action: 'program.update',
    description: 'Update reward programs and rules.',
  },
  {
    key: PERMISSIONS.REWARD_PROGRAM_STATUS,
    resource: 'reward',
    action: 'program.status',
    description: 'Activate, deactivate or archive reward programs.',
  },
  {
    key: PERMISSIONS.REWARD_ALLOCATE,
    resource: 'reward',
    action: 'allocate',
    description: 'Allocate / earn points for a member.',
  },
  {
    key: PERMISSIONS.REWARD_REDEEM,
    resource: 'reward',
    action: 'redeem',
    description: 'Redeem points on behalf of a member.',
  },
  {
    key: PERMISSIONS.REWARD_ADJUST,
    resource: 'reward',
    action: 'adjust',
    description: 'Post manual point adjustments and reversals.',
  },
  {
    key: PERMISSIONS.REWARD_EXPIRE,
    resource: 'reward',
    action: 'expire',
    description: 'Run reward point expiry processing.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_READ,
    resource: 'campaign',
    action: 'read',
    description: 'List and view campaigns, enrollments and history.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_CREATE,
    resource: 'campaign',
    action: 'create',
    description: 'Create campaigns.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_UPDATE,
    resource: 'campaign',
    action: 'update',
    description: 'Update campaigns, audience, rules and reward mapping.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_STATUS,
    resource: 'campaign',
    action: 'status',
    description: 'Activate, pause, complete or archive campaigns.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_SCHEDULE,
    resource: 'campaign',
    action: 'schedule',
    description: 'Schedule campaigns.',
  },
  {
    key: PERMISSIONS.CAMPAIGN_EXECUTE,
    resource: 'campaign',
    action: 'execute',
    description: 'Execute campaigns (issue rewards to enrolled members).',
  },
  {
    key: PERMISSIONS.NOTIFICATION_READ,
    resource: 'notification',
    action: 'read',
    description: 'List and view notifications, queue, delivery logs and templates.',
  },
  {
    key: PERMISSIONS.NOTIFICATION_TEMPLATE_CREATE,
    resource: 'notification',
    action: 'template.create',
    description: 'Create notification templates.',
  },
  {
    key: PERMISSIONS.NOTIFICATION_TEMPLATE_UPDATE,
    resource: 'notification',
    action: 'template.update',
    description: 'Update notification templates.',
  },
  {
    key: PERMISSIONS.NOTIFICATION_SEND,
    resource: 'notification',
    action: 'send',
    description: 'Create, send and schedule notifications.',
  },
  {
    key: PERMISSIONS.NOTIFICATION_QUEUE_MANAGE,
    resource: 'notification',
    action: 'queue.manage',
    description: 'Process the queue, retry failed and cancel pending notifications.',
  },
  {
    key: PERMISSIONS.REPORT_READ,
    resource: 'report',
    action: 'read',
    description: 'View report definitions, run reports, and view dashboards and history.',
  },
  {
    key: PERMISSIONS.REPORT_EXPORT,
    resource: 'report',
    action: 'export',
    description: 'Generate and download report exports.',
  },
  {
    key: PERMISSIONS.REPORT_SCHEDULE,
    resource: 'report',
    action: 'schedule',
    description: 'Create and manage scheduled reports.',
  },
  {
    key: PERMISSIONS.SETTINGS_READ,
    resource: 'settings',
    action: 'read',
    description: 'View platform settings, categories and change history.',
  },
  {
    key: PERMISSIONS.SETTINGS_UPDATE,
    resource: 'settings',
    action: 'update',
    description: 'Update platform configuration settings.',
  },
  {
    key: PERMISSIONS.SETTINGS_FEATURE_MANAGE,
    resource: 'settings',
    action: 'feature.manage',
    description: 'Create and toggle feature flags.',
  },
  {
    key: PERMISSIONS.SETTINGS_MAINTENANCE_MANAGE,
    resource: 'settings',
    action: 'maintenance.manage',
    description: 'Enable, disable and schedule maintenance mode.',
  },
  {
    key: PERMISSIONS.STORE_READ,
    resource: 'store',
    action: 'read',
    description: 'View Dream Store products, categories, orders and inventory.',
  },
  {
    key: PERMISSIONS.STORE_PRODUCT_MANAGE,
    resource: 'store',
    action: 'product.manage',
    description: 'Create, update and archive Dream Store products.',
  },
  {
    key: PERMISSIONS.STORE_CATEGORY_MANAGE,
    resource: 'store',
    action: 'category.manage',
    description: 'Create, update and delete Dream Store categories.',
  },
  {
    key: PERMISSIONS.STORE_INVENTORY_MANAGE,
    resource: 'store',
    action: 'inventory.manage',
    description: 'Adjust Dream Store product stock levels.',
  },
  {
    key: PERMISSIONS.STORE_ORDER_MANAGE,
    resource: 'store',
    action: 'order.manage',
    description: 'View and cancel Dream Store redemption orders.',
  },
  {
    key: PERMISSIONS.GAME_READ,
    resource: 'game',
    action: 'read',
    description: 'View the games catalog and session history.',
  },
  {
    key: PERMISSIONS.GAME_MANAGE,
    resource: 'game',
    action: 'manage',
    description: 'Create and update games.',
  },
];

export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  PARTNER: 'partner',
  MEMBER: 'member',
} as const;

export type RoleKey = (typeof ROLES)[keyof typeof ROLES];

export interface SystemRoleDefinition {
  key: string;
  name: string;
  description: string;
  /** Permission keys to grant; `'*'` grants every defined permission. */
  permissions: readonly string[] | '*';
}

export const SYSTEM_ROLE_DEFINITIONS: readonly SystemRoleDefinition[] = [
  {
    key: ROLES.SUPER_ADMIN,
    name: 'Super Administrator',
    description: 'Full platform authorization access.',
    permissions: '*',
  },
  {
    key: ROLES.ADMIN,
    name: 'Administrator',
    description:
      'Operational admin. Phase 1 scope: view members and manage member/account status. Broader admin capabilities are granted in later phases.',
    permissions: [
      PERMISSIONS.MEMBER_READ,
      PERMISSIONS.MEMBER_STATUS,
      PERMISSIONS.ACCOUNT_READ,
      PERMISSIONS.ACCOUNT_STATUS,
    ],
  },
  {
    key: ROLES.PARTNER,
    name: 'Partner',
    description:
      'Referral partner. Foundation role only in Phase 1 — no partner capabilities are granted yet (added in later phases).',
    permissions: [],
  },
  {
    key: ROLES.MEMBER,
    name: 'Member',
    description:
      'End-user member. Assigned automatically on public sign-up. Member self-service endpoints are authenticated (not permission-gated), so this role carries no catalog permissions in Phase 1.',
    permissions: [],
  },
];
