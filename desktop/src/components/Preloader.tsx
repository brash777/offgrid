import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { es } from '../i18n/es';
import { BrandLogo } from './BrandLogo';
import styles from './Preloader.module.css';

const COUNT_MS = 1500;
const HOLD_MS = 180;
const CURTAIN_EASE: [number, number, number, number] = [0.76, 0, 0.24, 1];

interface PreloaderProps {
  onDone: () => void;
}

export function Preloader({ onDone }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    };
    const start = performance.now();
    let frame = 0;
    let hold = 0;
    const tick = (now: number) => {
      const ratio = Math.min(1, (now - start) / COUNT_MS);
      setProgress(Math.round(100 * (1 - Math.pow(1 - ratio, 3))));
      if (ratio < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        hold = window.setTimeout(finish, HOLD_MS);
      }
    };
    frame = requestAnimationFrame(tick);
    const skip = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', skip);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hold);
      window.removeEventListener('keydown', skip);
    };
  }, [onDone]);

  return (
    <motion.div
      className={styles.preloader}
      role="status"
      aria-label={es.preloader.label}
      onClick={() => {
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }}
      exit={{ y: '-100%' }}
      transition={{ duration: 0.85, ease: CURTAIN_EASE }}
    >
      <motion.div
        className={styles.center}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -40 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className={styles.logo}>
          <BrandLogo variant="wordmark" />
        </span>
        <span className={styles.bar} aria-hidden="true">
          <span className={styles.fill} style={{ transform: `scaleX(${progress / 100})` }} />
        </span>
      </motion.div>
      <p className={styles.counter} aria-hidden="true">
        {String(progress).padStart(3, '0')}
      </p>
      <p className={styles.skip}>{es.preloader.skip}</p>
    </motion.div>
  );
}
