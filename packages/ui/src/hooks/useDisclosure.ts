import { useCallback, useMemo, useState } from 'react';

export interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

/** Controlled open/close state for overlays (modals, drawers, popovers). */
export function useDisclosure(initialOpen = false): Disclosure {
  const [isOpen, setOpen] = useState(initialOpen);
  const open = useCallback(() => {
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    setOpen(false);
  }, []);
  const toggle = useCallback(() => {
    setOpen((current) => !current);
  }, []);
  return useMemo<Disclosure>(
    () => ({ isOpen, open, close, toggle, setOpen }),
    [isOpen, open, close, toggle],
  );
}
