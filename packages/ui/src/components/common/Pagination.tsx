import { cn } from '@superdreams/utils';

import { Icon } from '../icons';
import { IconButton } from './IconButton';

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Page numbers to show on each side of the current page. */
  siblingCount?: number;
  className?: string;
}

type PageItem = number | 'ellipsis';

function buildPages(page: number, pageCount: number, siblingCount: number): PageItem[] {
  const total = siblingCount * 2 + 5;
  if (pageCount <= total) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }
  const left = Math.max(page - siblingCount, 1);
  const right = Math.min(page + siblingCount, pageCount);
  const items: PageItem[] = [1];
  if (left > 2) {
    items.push('ellipsis');
  }
  for (let value = Math.max(left, 2); value <= Math.min(right, pageCount - 1); value += 1) {
    items.push(value);
  }
  if (right < pageCount - 1) {
    items.push('ellipsis');
  }
  items.push(pageCount);
  return items;
}

/** Accessible pagination control. Fully controlled. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (pageCount <= 1) {
    return null;
  }
  const pages = buildPages(page, pageCount, siblingCount);

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <IconButton
        label="Previous page"
        size="sm"
        variant="ghost"
        disabled={page <= 1}
        onClick={() => {
          onPageChange(page - 1);
        }}
      >
        <Icon name="chevron-left" size="sm" />
      </IconButton>
      {pages.map((item, index) =>
        item === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            aria-label={`Page ${item}`}
            onClick={() => {
              onPageChange(item);
            }}
            className={cn(
              'inline-flex h-8 min-w-8 items-center justify-center rounded-control px-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-safe:active:scale-[var(--press-scale-icon)]',
              item === page
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {item}
          </button>
        ),
      )}
      <IconButton
        label="Next page"
        size="sm"
        variant="ghost"
        disabled={page >= pageCount}
        onClick={() => {
          onPageChange(page + 1);
        }}
      >
        <Icon name="chevron-right" size="sm" />
      </IconButton>
    </nav>
  );
}
