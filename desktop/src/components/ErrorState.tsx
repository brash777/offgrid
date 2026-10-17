import type { ApiError } from '../api/http';
import { es } from '../i18n/es';
import { Button } from './Button';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const title = error.code === 'NETWORK' ? es.errors.title : es.errors.loadTitle;
  return (
    <div className={styles.error} role="alert">
      <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 L23 21 L1 21 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9 L12 14 M12 17 L12 17.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className={styles.copy}>
        <p className={styles.title}>{title}</p>
        <p className={styles.message}>{error.message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {es.common.retry}
        </Button>
      )}
    </div>
  );
}
