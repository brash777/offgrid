import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { es } from '../i18n/es';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type PreviewState = 'hover' | 'focus';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

function buttonClass({ variant = 'primary', size = 'md', block, className }: StyleProps): string {
  return [styles.button, styles[variant], styles[size], block && styles.block, className].filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleProps {
  loading?: boolean;
  icon?: ReactNode;
  previewState?: PreviewState;
}

export function Button({
  variant,
  size,
  block,
  className,
  loading = false,
  icon,
  previewState,
  disabled,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      className={buttonClass({ variant, size, block, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-preview-state={previewState}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : icon}
      <span className={styles.label}>{children}</span>
      {loading && <span className="visually-hidden">{es.common.loading}</span>}
    </button>
  );
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement>, StyleProps {
  icon?: ReactNode;
}

export function ButtonLink({ variant, size, block, className, icon, children, ...rest }: ButtonLinkProps) {
  return (
    <a {...rest} className={buttonClass({ variant, size, block, className })}>
      {icon}
      <span className={styles.label}>{children}</span>
    </a>
  );
}
