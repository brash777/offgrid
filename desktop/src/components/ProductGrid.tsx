import type { CSSProperties } from 'react';
import type { ProductSummary } from '../api/catalog';
import type { AsyncState } from '../hooks/useAsync';
import { ErrorState } from './ErrorState';
import { ProductCard } from './ProductCard';
import { ProductCardSkeleton } from './Skeleton';
import styles from './ProductGrid.module.css';

interface ProductGridProps {
  state: AsyncState<unknown>;
  products: ProductSummary[];
  skeletons?: number;
  onRetry?: () => void;
  columns?: 3 | 4;
}

export function ProductGrid({ state, products, skeletons = 8, onRetry, columns = 4 }: ProductGridProps) {
  if (state.status === 'error' && products.length === 0) {
    return <ErrorState error={state.error} onRetry={onRetry} />;
  }

  const loadingFirstPage = state.status === 'loading' && products.length === 0;

  return (
    <ul className={styles.grid} data-columns={columns} aria-busy={state.status === 'loading' || undefined}>
      {loadingFirstPage
        ? Array.from({ length: skeletons }, (_, index) => (
            <li key={index}>
              <ProductCardSkeleton />
            </li>
          ))
        : products.map((product, index) => (
            <li key={product.id} className={styles.item} style={{ '--index': index } as CSSProperties}>
              <ProductCard product={product} />
            </li>
          ))}
    </ul>
  );
}
