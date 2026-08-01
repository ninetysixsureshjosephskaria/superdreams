import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/** Accessible tabs with roving arrow-key navigation. */
export function Tabs({ items, value, defaultValue, onValueChange, className }: TabsProps) {
  const baseId = useId();
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(() => defaultValue ?? items[0]?.value ?? '');
  const active = isControlled ? value : internal;

  const select = (next: string): void => {
    if (!isControlled) {
      setInternal(next);
    }
    onValueChange?.(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.value === active);
    if (index < 0) {
      return;
    }
    let nextIndex = index;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % enabled.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + enabled.length) % enabled.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabled.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    const next = enabled[nextIndex];
    if (next) {
      select(next.value);
    }
  };

  const activeItem = items.find((item) => item.value === active);

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="inline-flex items-center gap-1 rounded-lg border bg-muted p-1"
      >
        {items.map((item) => {
          const selected = item.value === active;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.value}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.value}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onKeyDown={onKeyDown}
              onClick={() => {
                select(item.value);
              }}
              className={cn(
                'inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                selected
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem ? (
        <div
          role="tabpanel"
          id={`${baseId}-panel-${activeItem.value}`}
          aria-labelledby={`${baseId}-tab-${activeItem.value}`}
          tabIndex={0}
          className="mt-4 focus-visible:outline-none"
        >
          {activeItem.content}
        </div>
      ) : null}
    </div>
  );
}
