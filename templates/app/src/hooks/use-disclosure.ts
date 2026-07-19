"use client";

import { useCallback, useState } from "react";

export interface Disclosure {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  /** Spread onto a shadcn `<Dialog>` / `<Sheet>` / `<Popover>`. */
  props: { open: boolean; onOpenChange: (open: boolean) => void };
}

/** Open/close state for dialogs, sheets and popovers. */
export function useDisclosure(initial = false): Disclosure {
  const [isOpen, setIsOpen] = useState(initial);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    props: { open: isOpen, onOpenChange: setIsOpen },
  };
}
