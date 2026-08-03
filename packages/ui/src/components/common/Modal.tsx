import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@superdreams/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog rendered in a portal. Closes on Escape or backdrop
 * activation. Presentation-only — callers own the open/close state.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative z-10 w-full max-w-lg animate-scale-in rounded-lg border bg-card p-6 text-card-foreground shadow-overlay',
          className,
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
