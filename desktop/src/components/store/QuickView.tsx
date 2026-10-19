import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fetchProduct, type ProductSummary } from '../../api/catalog';
import { hrefFor, useRoute } from '../../app/router';
import { useAsync } from '../../hooks/useAsync';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { es } from '../../i18n/es';
import { ErrorState } from '../ErrorState';
import { Icon } from '../Icon';
import { ProductPhoto } from '../ProductPhoto';
import { SkeletonBlock } from '../Skeleton';
import { PurchasePanel } from './PurchasePanel';
import styles from './QuickView.module.css';

const CARD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface QuickViewApi {
  open: (product: ProductSummary) => void;
  close: () => void;
}

const QuickViewContext = createContext<QuickViewApi | null>(null);
const NO_QUICK_VIEW: QuickViewApi = { open: () => undefined, close: () => undefined };

export function QuickViewProvider({ children }: { children: ReactNode }) {
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const route = useRoute();
  const open = useCallback((next: ProductSummary) => setProduct(next), []);
  const close = useCallback(() => setProduct(null), []);
  const api = useMemo(() => ({ open, close }), [open, close]);

  useEffect(() => {
    setProduct(null);
  }, [route]);

  return (
    <QuickViewContext.Provider value={api}>
      {children}
      <AnimatePresence>{product && <QuickView key={product.id} summary={product} onClose={close} />}</AnimatePresence>
    </QuickViewContext.Provider>
  );
}

export function useQuickView(): QuickViewApi {
  return useContext(QuickViewContext) ?? NO_QUICK_VIEW;
}

interface QuickViewProps {
  summary: ProductSummary;
  onClose: () => void;
}

function QuickView({ summary, onClose }: QuickViewProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const [colorName, setColorName] = useState(summary.photoColor ?? summary.colors[0]?.name ?? '');
  const { state, reload } = useAsync((signal) => fetchProduct(summary.id, signal), [summary.id]);
  const titleId = `quick-${summary.id}`;
  useFocusTrap(cardRef, true, onClose);

  return (
    <div className={styles.layer}>
      <motion.div
        className={styles.scrim}
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      />
      <motion.div
        ref={cardRef}
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.5, ease: CARD_EASE }}
      >
        <button type="button" className={styles.close} onClick={onClose} aria-label={es.common.close}>
          <Icon name="close" />
        </button>

        <div className={styles.media} ref={photoRef}>
          <ProductPhoto
            src={summary.thumbnailUrl}
            alt={summary.name}
            photoColor={summary.photoColor}
            colors={summary.colors}
            activeColor={colorName}
            eager
          />
        </div>

        <div className={styles.info}>
          {state.status === 'loading' && (
            <>
              <h2 id={titleId} className="visually-hidden">
                {summary.name}
              </h2>
              <SkeletonBlock className={styles.skeleton} />
            </>
          )}
          {state.status === 'error' && <ErrorState error={state.error} onRetry={reload} />}
          {state.status === 'success' && (
            <>
              <PurchasePanel
                product={state.data}
                colorName={colorName}
                onColorChange={setColorName}
                photoRef={photoRef}
                titleId={titleId}
              />
              <a className={styles.detail} href={hrefFor({ name: 'product', id: summary.id })}>
                {es.store.fullDetail}
                <Icon name="arrow-up-right" />
              </a>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
