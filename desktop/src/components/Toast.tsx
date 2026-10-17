import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { es } from '../i18n/es';
import { Icon } from './Icon';
import styles from './Toast.module.css';

export type ToastTone = 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
  action?: ToastAction;
}

const AUTO_DISMISS_MS = 4500;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    setToasts((current) => [...current.slice(-2), { ...toast, id: Date.now() + Math.random() }]);
  }, []);

  return { toasts, push, dismiss };
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.li
      layout
      className={styles.toast}
      data-tone={toast.tone}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon name={toast.tone === 'success' ? 'check' : 'alert'} />
      </span>
      <div className={styles.text}>
        <p className={styles.title}>{toast.title}</p>
        {toast.detail && <p className={styles.detail}>{toast.detail}</p>}
      </div>
      {toast.action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            toast.action?.onClick();
            onDismiss(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={styles.close} onClick={() => onDismiss(toast.id)} aria-label={es.common.close}>
        <Icon name="close" />
      </button>
    </motion.li>
  );
}

export function ToastRegion({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <ol className={styles.region} role="status" aria-live="polite" data-surface="ink">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </ol>
  );
}
