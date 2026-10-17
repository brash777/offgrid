import { useEffect } from 'react';
import { motion } from 'motion/react';
import { BRAND_EDITION, BRAND_NAME } from '../brand';
import { es } from '../i18n/es';
import { Kbd } from './Badge';
import { BrandLogo } from './BrandLogo';
import { GrainOverlay } from './GrainOverlay';
import styles from './IntroSplash.module.css';

interface IntroSplashProps {
  onEnter: () => void;
}

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function IntroSplash({ onEnter }: IntroSplashProps) {
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.preventDefault();
        onEnter();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onEnter]);

  return (
    <motion.div
      className={styles.splash}
      data-surface="ink"
      role="dialog"
      aria-modal="true"
      aria-label={BRAND_NAME}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.8, ease: EASE_OUT }}
    >
      <span className={styles.glow} aria-hidden="true" />
      <GrainOverlay />

      <motion.div
        className={styles.frame}
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: EASE_OUT }}
      >
        <span className={styles.edition}>{BRAND_EDITION}</span>
      </motion.div>

      <div className={styles.center}>
        <motion.div
          className={styles.logo}
          initial={{ opacity: 0, scale: 0.86, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.2, ease: EASE_OUT }}
        >
          <BrandLogo spin />
        </motion.div>

        <motion.button
          type="button"
          className={styles.enter}
          onClick={onEnter}
          autoFocus
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, ease: EASE_OUT }}
        >
          <span className={styles.enterLine} aria-hidden="true" />
          {es.common.enter}
          <span className={styles.enterLine} aria-hidden="true" />
        </motion.button>
      </div>

      <p className={styles.hint}>
        <Kbd>Enter</Kbd> {es.common.enter} · <Kbd>Esc</Kbd> {es.common.skip}
      </p>
    </motion.div>
  );
}
