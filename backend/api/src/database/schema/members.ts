import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

import { baseColumns } from './columns';
import { recordStatus } from './enums';
import { users } from './identity';

/**
 * Member aggregate root. A member is a platform end-user record. It may
 * optionally link to an identity `users` row (for portal login) but never
 * duplicates authentication data. Reuses the shared `record_status` enum.
 */
export const members = pgTable(
  'members',
  {
    ...baseColumns(),
    memberNumber: text('member_number').notNull(),
    /** Optional link to an identity account (login). */
    userId: uuid('user_id').references(() => users.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    status: recordStatus('status').notNull().default('PENDING'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    /**
     * Network relationships (Phase 2D). Self-referential, both nullable:
     * `referredBy` = the member who directly referred this member (the immediate
     * upline for the downline tree); `partnerId` = the Partner this member belongs
     * to. Set on invite acceptance. Existing members have both NULL (top-level).
     */
    referredBy: uuid('referred_by').references((): AnyPgColumn => members.id),
    partnerId: uuid('partner_id').references((): AnyPgColumn => members.id),
  },
  (table) => [
    uniqueIndex('members_member_number_uq').on(table.memberNumber),
    uniqueIndex('members_email_uq').on(table.email),
    index('members_status_idx').on(table.status),
    index('members_user_id_idx').on(table.userId),
    index('members_last_name_idx').on(table.lastName),
    index('members_referred_by_idx').on(table.referredBy),
    index('members_partner_id_idx').on(table.partnerId),
  ],
);

/** 1:1 extended profile for a member. */
export const memberProfiles = pgTable(
  'member_profiles',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    dateOfBirth: date('date_of_birth'),
    gender: text('gender'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
  },
  (table) => [uniqueIndex('member_profiles_member_id_uq').on(table.memberId)],
);

/** Member postal addresses. */
export const memberAddresses = pgTable(
  'member_addresses',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    label: text('label'),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city').notNull(),
    state: text('state'),
    postalCode: text('postal_code'),
    country: text('country').notNull(),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (table) => [index('member_addresses_member_id_idx').on(table.memberId)],
);

/** Member contact channels (phone / email / emergency). */
export const memberContacts = pgTable(
  'member_contacts',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    type: text('type').notNull(),
    value: text('value').notNull(),
    label: text('label'),
    isPrimary: boolean('is_primary').notNull().default(false),
  },
  (table) => [index('member_contacts_member_id_idx').on(table.memberId)],
);

/** Free-text administrative notes attached to a member. */
export const memberNotes = pgTable(
  'member_notes',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    authorId: uuid('author_id'),
    body: text('body').notNull(),
  },
  (table) => [index('member_notes_member_id_idx').on(table.memberId)],
);

/** Document metadata (no binary storage in this phase). */
export const memberDocuments = pgTable(
  'member_documents',
  {
    ...baseColumns(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    name: text('name').notNull(),
    category: text('category'),
    contentType: text('content_type'),
    sizeBytes: integer('size_bytes'),
    uploadedBy: uuid('uploaded_by'),
  },
  (table) => [index('member_documents_member_id_idx').on(table.memberId)],
);

/** Append-only status transition history. */
export const memberStatusHistory = pgTable(
  'member_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    fromStatus: recordStatus('from_status'),
    toStatus: recordStatus('to_status').notNull(),
    reason: text('reason'),
    changedBy: uuid('changed_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('member_status_history_member_id_idx').on(table.memberId)],
);

/** Append-only member activity feed. */
export const memberActivityLogs = pgTable(
  'member_activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memberId: uuid('member_id')
      .notNull()
      .references(() => members.id),
    action: text('action').notNull(),
    description: text('description'),
    actorId: uuid('actor_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('member_activity_logs_member_id_idx').on(table.memberId)],
);
