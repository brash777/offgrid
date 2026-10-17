import { useId } from 'react';
import styles from './GrainOverlay.module.css';

export function GrainOverlay() {
  const filterId = `grain-${useId().replaceAll(':', '')}`;

  return (
    <svg className={styles.grain} aria-hidden="true" focusable="false">
      <filter id={filterId}>
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter={`url(#${filterId})`} />
    </svg>
  );
}
