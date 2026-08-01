import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@superdreams/utils';

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  className?: string;
}

/**
 * Slide-in side panel rendered in a portal. Closes on Escape or backdrop
 * activation. Presentation-only — callers own the open/close state.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = 'right',
  className,
}: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-drawer flex">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-10 ml-auto flex h-full w-full max-w-md flex-col border-l bg-card text-card-foreground shadow-overlay',
          side === 'left'
            ? 'mr-auto ml-0 animate-slide-in-left border-l-0 border-r'
            : 'animate-slide-in-right',
          className,
        )}
      >
        <div className="border-b p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex-1 overflow-auto p-6">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t p-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
