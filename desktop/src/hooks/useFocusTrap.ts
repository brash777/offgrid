import { useEffect, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    container?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }
      if (event.key !== 'Tab' || !container) {
        return;
      }
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, onEscape]);
}
