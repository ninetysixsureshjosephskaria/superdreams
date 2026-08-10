import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@superdreams/utils';

import { useDialogA11y } from '../../hooks';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  /**
   * Opt-in: render as a bottom sheet on small screens (rounded top, anchored to
   * the bottom) and a centered dialog from `sm` up. Default `false` keeps the
   * centered-on-all-sizes behavior.
   */
  mobileSheet?: boolean;
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
  mobileSheet = false,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useDialogA11y({ isOpen, onClose, dialogRef });

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        mobileSheet ? 'items-end p-0 sm:items-center sm:p-4' : 'items-center p-4',
      )}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/50 [backdrop-filter:blur(var(--overlay-blur,0px))]"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-lg animate-scale-in border bg-card p-6 text-card-foreground shadow-overlay focus:outline-none',
          mobileSheet ? 'rounded-t-surface sm:rounded-surface' : 'rounded-surface',
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
