import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@superdreams/utils';

export type PopoverAlign = 'start' | 'center' | 'end';

export interface PopoverProps {
  /** Content rendered inside the trigger button. */
  trigger: ReactNode;
  children: ReactNode;
  align?: PopoverAlign;
  className?: string;
  triggerClassName?: string;
}

const alignClasses: Record<PopoverAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

/** Click-triggered popover. Closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = 'start',
  className,
  triggerClassName,
}: PopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
        }}
        className={cn('inline-flex', triggerClassName)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          role="dialog"
          className={cn(
            'absolute top-full z-popover mt-2 min-w-48 animate-scale-in rounded-md border bg-popover p-3 text-popover-foreground shadow-overlay',
            alignClasses[align],
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
