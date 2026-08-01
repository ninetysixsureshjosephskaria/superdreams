import { useId, useState, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

import { Icon } from '../icons';

export interface AccordionItem {
  value: string;
  title: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  /** `single` collapses others on open; `multiple` allows many open. */
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  className?: string;
}

/** Accessible accordion built on native disclosure semantics. */
export function Accordion({ items, type = 'single', defaultValue, className }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<Set<string>>(() => {
    if (Array.isArray(defaultValue)) {
      return new Set(defaultValue);
    }
    return new Set(defaultValue ? [defaultValue] : []);
  });

  const toggle = (value: string): void => {
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(value)) {
        next.delete(value);
      } else {
        if (type === 'single') {
          next.clear();
        }
        next.add(value);
      }
      return next;
    });
  };

  return (
    <div className={cn('divide-y rounded-lg border', className)}>
      {items.map((item) => {
        const isOpen = open.has(item.value);
        return (
          <div key={item.value}>
            <h3 className="m-0">
              <button
                type="button"
                id={`${baseId}-trigger-${item.value}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-region-${item.value}`}
                disabled={item.disabled}
                onClick={() => {
                  toggle(item.value);
                }}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{item.title}</span>
                <Icon
                  name="chevron-down"
                  size="sm"
                  className={cn(
                    'shrink-0 text-muted-foreground transition-transform duration-normal',
                    isOpen && 'rotate-180',
                  )}
                />
              </button>
            </h3>
            {isOpen ? (
              <div
                role="region"
                id={`${baseId}-region-${item.value}`}
                aria-labelledby={`${baseId}-trigger-${item.value}`}
                className="px-4 pb-4 text-sm text-muted-foreground"
              >
                {item.content}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
