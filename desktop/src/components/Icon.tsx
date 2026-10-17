import type { ReactElement } from 'react';
import styles from './Icon.module.css';

export type IconName = 'arrow-left' | 'arrow-right' | 'pause' | 'play' | 'close' | 'check' | 'alert' | 'plus' | 'minus';

const PATHS: Record<IconName, ReactElement> = {
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alert: <path d="M12 7v6M12 16.5v.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
};

interface IconProps {
  name: IconName;
  className?: string;
}

export function Icon({ name, className }: IconProps) {
  return (
    <svg
      className={[styles.icon, className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
