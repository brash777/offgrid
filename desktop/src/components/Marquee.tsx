import styles from './Marquee.module.css';

interface MarqueeProps {
  items: readonly string[];
  label?: string;
}

function Sequence({ items, hidden }: { items: readonly string[]; hidden?: boolean }) {
  return (
    <ul className={styles.sequence} aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className={styles.item}>
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Marquee({ items, label }: MarqueeProps) {
  return (
    <div className={styles.marquee} data-surface="ink" aria-label={label}>
      <div className={styles.track}>
        <Sequence items={items} />
        <Sequence items={items} hidden />
        <Sequence items={items} hidden />
      </div>
    </div>
  );
}
