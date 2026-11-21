import { AnimatePresence } from 'motion/react';
import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const MirrorPanel = lazy(() => import('./MirrorPanel'));

interface MirrorApi {
  isOpen: boolean;
  productId: string | null;
  open: (productId?: string) => void;
  close: () => void;
  toggle: () => void;
  select: (productId: string) => void;
}

const MirrorContext = createContext<MirrorApi | null>(null);

export function MirrorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);

  const open = useCallback((id?: string) => {
    if (id) {
      setProductId(id);
    }
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((current) => !current), []);
  const api = useMemo(
    () => ({ isOpen, productId, open, close, toggle, select: setProductId }),
    [isOpen, productId, open, close, toggle],
  );

  return (
    <MirrorContext.Provider value={api}>
      {children}
      <Suspense fallback={null}>
        <AnimatePresence>{isOpen && <MirrorPanel key="mirror" />}</AnimatePresence>
      </Suspense>
    </MirrorContext.Provider>
  );
}

export function useMirror(): MirrorApi {
  const api = useContext(MirrorContext);
  if (!api) {
    throw new Error('useMirror must be used inside MirrorProvider');
  }
  return api;
}
