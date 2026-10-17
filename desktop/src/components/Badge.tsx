import type { ReactNode } from 'react';
import { es } from '../i18n/es';
import type { Rarity } from '../lib/rarity';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'solid' | 'accent' | 'ai' | 'success' | 'warning';

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}

const RARITY_LEVEL: Record<Rarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function RarityTag({ rarity }: { rarity: Rarity }) {
  return (
    <span className={styles.rarity} data-rarity={rarity}>
      <span className={styles.pips} aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} className={styles.pip} data-on={index < RARITY_LEVEL[rarity] || undefined} />
        ))}
      </span>
      {es.rarity[rarity]}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}
