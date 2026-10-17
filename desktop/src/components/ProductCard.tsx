import { useState } from 'react';
import type { ProductSummary } from '../api/catalog';
import { hrefFor } from '../app/router';
import { es } from '../i18n/es';
import { LOW_STOCK_THRESHOLD } from '../lib/catalog';
import { garmentFor } from '../lib/garments';
import { formatCop } from '../lib/money';
import { Badge } from './Badge';
import { GarmentArt } from './garment/GarmentArt';
import styles from './ProductCard.module.css';

const FALLBACK_COLOR = { name: '', hex: 'var(--palette-ink-800)' };

interface ProductCardProps {
  product: ProductSummary;
}

export function ProductCard({ product }: ProductCardProps) {
  const colors = product.colors.length > 0 ? product.colors : [FALLBACK_COLOR];
  const [activeHex, setActiveHex] = useState(colors[0].hex);
  const garment = garmentFor(product.name, product.categorySlug);
  const price = formatCop(product.basePrice);
  const href = hrefFor({ name: 'product', id: product.id });
  const soldOut = product.totalStock === 0;
  const lowStock = !soldOut && product.totalStock <= LOW_STOCK_THRESHOLD;

  return (
    <article className={styles.card}>
      <a className={styles.media} href={href} tabIndex={-1} aria-hidden="true">
        {colors.map((color) => (
          <span key={color.hex} className={styles.layer} data-active={color.hex === activeHex || undefined}>
            <GarmentArt kind={garment.kind} print={garment.print} color={color.hex} />
          </span>
        ))}
        <span className={styles.flags}>
          {soldOut && <Badge tone="solid">{es.common.soldOut}</Badge>}
          {lowStock && <Badge tone="accent">{es.common.lastUnits(product.totalStock)}</Badge>}
        </span>
      </a>

      <div className={styles.info}>
        <h3 className={styles.name}>
          <a href={href} className={styles.link}>
            {product.name}
          </a>
        </h3>
        <p className={styles.price}>{price}</p>
        {colors.length > 1 && (
          <ul className={styles.swatches}>
            {colors.map((color) => (
              <li key={color.hex}>
                <button
                  type="button"
                  className={styles.swatch}
                  style={{ background: color.hex }}
                  aria-label={es.common.viewIn(color.name)}
                  aria-pressed={color.hex === activeHex}
                  onMouseEnter={() => setActiveHex(color.hex)}
                  onFocus={() => setActiveHex(color.hex)}
                  onClick={() => setActiveHex(color.hex)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
