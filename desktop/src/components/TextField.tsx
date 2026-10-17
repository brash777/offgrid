import { useId, type InputHTMLAttributes, type Ref } from 'react';
import styles from './TextField.module.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  previewFocus?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({ label, hideLabel, hint, error, previewFocus, className, ref, ...rest }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label className={hideLabel ? 'visually-hidden' : styles.label} htmlFor={id}>
        {label}
      </label>
      <input
        {...rest}
        ref={ref}
        id={id}
        className={styles.input}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        data-preview-focus={previewFocus || undefined}
      />
      {hint && !error && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          <svg className={styles.errorIcon} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 1 L15 14 L1 14 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M8 6 L8 9.5 M8 11.5 L8 11.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
