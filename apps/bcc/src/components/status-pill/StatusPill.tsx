import { Badge, type BadgeVariant } from '@superdreams/ui';

export interface StatusPillProps {
  /** Raw status string (any case), e.g. ACTIVE, DRAFT, PUBLISHED, SUSPENDED. */
  status: string;
  /** Override the auto-derived label (defaults to a title-cased status). */
  label?: string;
  className?: string;
}

/** Positive / live / published states → teal-green. */
const SUCCESS = new Set([
  'active',
  'live',
  'published',
  'approved',
  'completed',
  'delivered',
  'enabled',
  'paid',
  'distributed',
  'success',
  'used',
  'verified',
  'ok',
]);
/** In-progress / awaiting states → amber. */
const WARNING = new Set([
  'pending',
  'draft',
  'hold',
  'on_hold',
  'scheduled',
  'processing',
  'queued',
  'review',
  'in_review',
  'unverified',
]);
/** Failure / blocked states → coral. */
const DANGER = new Set([
  'suspended',
  'error',
  'failed',
  'rejected',
  'revoked',
  'cancelled',
  'canceled',
  'declined',
  'overdue',
]);
/** Dormant / terminal-neutral states → muted grey. */
const NEUTRAL = new Set([
  'inactive',
  'disabled',
  'expired',
  'archived',
  'closed',
  'deleted',
  'none',
  'draft_deleted',
]);

function toVariant(status: string): BadgeVariant {
  const key = status.trim().toLowerCase();
  if (SUCCESS.has(key)) return 'success';
  if (WARNING.has(key)) return 'warning';
  if (DANGER.has(key)) return 'destructive';
  if (NEUTRAL.has(key)) return 'secondary';
  return 'info';
}

function toLabel(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * Semantic Super Dreams status pill: maps a raw status string to a soft-tinted
 * Badge with consistent colour semantics across every BCC screen.
 */
export function StatusPill({ status, label, className }: StatusPillProps) {
  return (
    <Badge soft variant={toVariant(status)} className={className}>
      {label ?? toLabel(status)}
    </Badge>
  );
}
