import type { ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export type StatTrendDirection = 'up' | 'down' | 'neutral';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  trend?: { direction: StatTrendDirection; label: string };
  className?: string;
}

const trendClasses: Record<StatTrendDirection, string> = {
  up: 'text-success',
  down: 'text-destructive',
  neutral: 'text-muted-foreground',
};

/** Compact metric surface for dashboards. Presentation-only. */
export function StatCard({ label, value, icon, hint, trend, className }: StatCardProps) {
  return (
    <div
      className={cn('rounded-card border bg-card p-5 text-card-foreground shadow-card', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {trend || hint ? (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {trend ? (
            <span className={cn('font-medium', trendClasses[trend.direction])}>{trend.label}</span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
