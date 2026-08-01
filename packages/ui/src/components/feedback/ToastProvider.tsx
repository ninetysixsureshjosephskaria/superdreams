import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@superdreams/utils';

import { IconButton } from '../common/IconButton';
import { Icon, type IconName } from '../icons';
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastRecord,
  type ToastVariant,
} from './toast-context';

const DEFAULT_DURATION = 5000;

const variantMeta: Record<ToastVariant, { icon: IconName; accent: string }> = {
  default: { icon: 'info', accent: 'text-foreground' },
  success: { icon: 'check-circle', accent: 'text-success' },
  error: { icon: 'x-circle', accent: 'text-destructive' },
  warning: { icon: 'alert-triangle', accent: 'text-warning' },
  info: { icon: 'info', accent: 'text-info' },
};

export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provides the toast queue and renders the notification viewport in a portal.
 * Wrap the app once; trigger toasts with `useToast()`.
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const counter = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      setToasts((previous) => [...previous, { id, variant: 'default', ...options }]);
      const duration = options.duration ?? DEFAULT_DURATION;
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => {
            dismiss(id);
          }, duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document === 'undefined'
        ? null
        : createPortal(
            <div
              role="region"
              aria-label="Notifications"
              aria-live="polite"
              className="pointer-events-none fixed bottom-4 right-4 z-toast flex w-full max-w-sm flex-col gap-2"
            >
              {toasts.map((item) => {
                const meta = variantMeta[item.variant ?? 'default'];
                return (
                  <div
                    key={item.id}
                    className="pointer-events-auto flex animate-slide-in-right gap-3 rounded-lg border bg-card p-4 text-sm text-card-foreground shadow-overlay"
                  >
                    <span className={cn('mt-0.5 shrink-0', meta.accent)}>
                      <Icon name={meta.icon} size="sm" />
                    </span>
                    <div className="flex-1">
                      {item.title ? <p className="font-medium">{item.title}</p> : null}
                      {item.description ? (
                        <div className={cn('text-muted-foreground', item.title && 'mt-1')}>
                          {item.description}
                        </div>
                      ) : null}
                    </div>
                    <IconButton
                      label="Dismiss notification"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        dismiss(item.id);
                      }}
                      className="-mr-1 -mt-1"
                    >
                      <Icon name="x" size="sm" />
                    </IconButton>
                  </div>
                );
              })}
            </div>,
            document.body,
          )}
    </ToastContext.Provider>
  );
}
