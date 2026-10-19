import { useState } from 'react';
import type { ProductSummary } from '../api/catalog';
import { hrefFor } from '../app/router';
import { es } from '../i18n/es';
import { LOW_STOCK_THRESHOLD } from '../lib/catalog';
import { formatCop } from '../lib/money';
import { Icon } from './Icon';
import styles from './ProductCard.module.css';
import { ProductPhoto } from './ProductPhoto';
import { useQuickView } from './store/QuickView';

interface ProductCardProps {
  product: ProductSummary;
  badge?: string;
}

export function ProductCard({ product, badge }: ProductCardProps) {
  const quickView = useQuickView();
  const [colorName, setColorName] = useState(product.photoColor ?? product.colors[0]?.name ?? null);
  const soldOut = product.totalStock === 0;
  const lowStock = !soldOut && product.totalStock <= LOW_STOCK_THRESHOLD;

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.media}
        onClick={() => quickView.open(product)}
        aria-label={es.store.quickViewOf(product.name)}
      >
        <span className={styles.photoBox}>
          <ProductPhoto
            src={product.thumbnailUrl}
            alt=""
            photoColor={product.photoColor}
            colors={product.colors}
            activeColor={colorName}
          />
        </span>
        <span className={styles.flags}>
          {badge && <span className={styles.badge}>{badge}</span>}
          {soldOut && <span className={styles.flagDark}>{es.common.soldOut}</span>}
          {lowStock && <span className={styles.flagDark}>{es.common.lastUnits(product.totalStock)}</span>}
        </span>
        <span className={styles.quick} aria-hidden="true">
          {es.store.quickView}
          <Icon name="arrow-up-right" />
        </span>
      </button>

      <div className={styles.info}>
        <div className={styles.row}>
          <h3 className={styles.name}>
            <a href={hrefFor({ name: 'product', id: product.id })} className={styles.link}>
              {product.name}
            </a>
          </h3>
          <p className={styles.price}>{formatCop(product.basePrice)}</p>
        </div>
        <div className={styles.row}>
          <p className={styles.meta}>{product.categoryName}</p>
          {product.colors.length > 1 && (
            <ul className={styles.swatches}>
              {product.colors.map((color) => (
                <li key={color.name}>
                  <button
                    type="button"
                    className={styles.swatch}
                    style={{ background: color.hex }}
                    aria-label={es.common.viewIn(color.name)}
                    aria-pressed={color.name === colorName}
                    onMouseEnter={() => setColorName(color.name)}
                    onFocus={() => setColorName(color.name)}
                    onClick={() => setColorName(color.name)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
