import type { ReactElement } from 'react';
import styles from './Icon.module.css';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-right'
  | 'pause'
  | 'play'
  | 'close'
  | 'check'
  | 'alert'
  | 'plus'
  | 'minus'
  | 'search'
  | 'bag'
  | 'user'
  | 'bolt'
  | 'truck'
  | 'shield'
  | 'pulse'
  | 'palette';

const PATHS: Record<IconName, ReactElement> = {
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-up-right': <path d="M7 17L17 7M9 7h8v8" />,
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M8 5.5v13l10-6.5z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  alert: <path d="M12 7v6M12 16.5v.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  search: <path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5L20 20" />,
  bag: <path d="M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0" />,
  bolt: <path d="M13 3L5 13.5h6L10 21l8-10.5h-6z" />,
  truck: <path d="M3 6.5h11v9H3zM14 9.5h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />,
  shield: <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6zM9 12l2.2 2.2L15.5 10" />,
  pulse: <path d="M3 12h4l2.5-6 5 12 2.5-6h4" />,
  palette: <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-.9.7-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3zM7.5 12.5h.01M9.5 8h.01M14.5 8h.01" />,
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
