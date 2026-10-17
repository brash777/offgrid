import styles from './Skeleton.module.css';

export function ProductCardSkeleton() {
  return (
    <div className={styles.card} aria-hidden="true">
      <div className={`${styles.block} ${styles.media}`} />
      <div className={`${styles.block} ${styles.line}`} />
      <div className={`${styles.block} ${styles.lineShort}`} />
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={[styles.block, className].filter(Boolean).join(' ')} aria-hidden="true" />;
}
