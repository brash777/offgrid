import { useMemo, useRef, useState } from 'react';
import { fetchProduct, fetchProducts, type ProductDetail } from '../api/catalog';
import { hrefFor } from '../app/router';
import { ButtonLink } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { Icon } from '../components/Icon';
import { ProductGrid } from '../components/ProductGrid';
import { ProductPhoto } from '../components/ProductPhoto';
import { SkeletonBlock } from '../components/Skeleton';
import { PurchasePanel } from '../components/store/PurchasePanel';
import { useAsync } from '../hooks/useAsync';
import { es } from '../i18n/es';
import { colorsOf } from '../lib/catalog';
import styles from './ProductPage.module.css';

const ALL_PRODUCTS = 100;
const MISSING_STATUSES = [400, 404];
const PAIR_COUNT = 4;

function ProductView({ product }: { product: ProductDetail }) {
  const colors = useMemo(() => colorsOf(product.variants), [product.variants]);
  const [colorName, setColorName] = useState(product.photoColor ?? colors[0]?.name ?? '');
  const photoRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.page}>
      <nav aria-label={es.product.breadcrumb} className={styles.crumb}>
        <a href={hrefFor({ name: 'catalog' })}>{es.catalog.title}</a> /{' '}
        <a href={hrefFor({ name: 'catalog', category: product.categorySlug })}>{product.categoryName}</a>
      </nav>
      <div className={styles.layout}>
        <div className={styles.gallery} ref={photoRef}>
          <div className={styles.photo}>
            <ProductPhoto
              src={product.imageUrls[0] ?? null}
              alt={product.name}
              photoColor={product.photoColor}
              colors={colors}
              activeColor={colorName}
              eager
            />
          </div>
        </div>
        <div className={styles.side}>
          <PurchasePanel
            product={product}
            colorName={colorName}
            onColorChange={setColorName}
            photoRef={photoRef}
            titleId="product-title"
            headingLevel="h1"
          />
          <details className={styles.accordion}>
            <summary>
              {es.product.shipping}
              <Icon name="plus" className={styles.accordionIcon} />
            </summary>
            <p>{es.product.shippingBody}</p>
          </details>
        </div>
      </div>
    </div>
  );
}

function PairWith({ product }: { product: ProductDetail }) {
  const { state, reload } = useAsync((signal) => fetchProducts({ size: ALL_PRODUCTS }, signal), []);
  const picks = useMemo(() => {
    const seen = new Set<string>([product.categorySlug]);
    return (state.data?.content ?? [])
      .filter((item) => {
        if (seen.has(item.categorySlug)) {
          return false;
        }
        seen.add(item.categorySlug);
        return true;
      })
      .slice(0, PAIR_COUNT);
  }, [state.data, product.categorySlug]);

  return (
    <section className={styles.pair} aria-labelledby="pair-title">
      <h2 id="pair-title" className={styles.pairTitle}>
        {es.product.pairWith}
      </h2>
      <ProductGrid state={state} products={picks} skeletons={PAIR_COUNT} onRetry={reload} />
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.layout}>
        <SkeletonBlock className={styles.skeletonPhoto} />
        <div className={styles.side}>
          <SkeletonBlock className={styles.skeletonTitle} />
          <SkeletonBlock className={styles.skeletonLine} />
          <SkeletonBlock className={styles.skeletonButton} />
        </div>
      </div>
    </div>
  );
}

export function ProductPage({ id }: { id: string }) {
  const { state, reload } = useAsync((signal) => fetchProduct(id, signal), [id]);

  if (state.status === 'loading') {
    return <ProductSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <div className={styles.message}>
        {MISSING_STATUSES.includes(state.error.status) ? (
          <>
            <h1 className={styles.messageTitle}>{es.product.notFound}</h1>
            <ButtonLink href={hrefFor({ name: 'catalog' })}>{es.product.backToCatalog}</ButtonLink>
          </>
        ) : (
          <ErrorState error={state.error} onRetry={reload} />
        )}
      </div>
    );
  }

  return (
    <>
      <ProductView key={state.data.id} product={state.data} />
      <PairWith product={state.data} />
    </>
  );
}
