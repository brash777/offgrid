import { useMemo, useState } from 'react';
import { fetchProducts, type ProductSummary } from '../api/catalog';
import { hrefFor } from '../app/router';
import { ButtonLink } from '../components/Button';
import { GarmentArt } from '../components/garment/GarmentArt';
import { Icon } from '../components/Icon';
import { Hero } from '../components/Hero';
import { ProductGrid } from '../components/ProductGrid';
import { useAsync } from '../hooks/useAsync';
import { es } from '../i18n/es';
import { garmentFor } from '../lib/garments';
import styles from './HomePage.module.css';

const ALL_PRODUCTS = 100;
const NEW_ARRIVALS = 8;

interface CategoryEntry {
  slug: string;
  name: string;
  count: number;
  cover: ProductSummary;
}

function groupByCategory(products: ProductSummary[]): CategoryEntry[] {
  const groups = new Map<string, CategoryEntry>();
  products.forEach((product) => {
    const entry = groups.get(product.categorySlug);
    if (entry) {
      entry.count += 1;
      if (product.basePrice > entry.cover.basePrice) {
        entry.cover = product;
      }
    } else {
      groups.set(product.categorySlug, {
        slug: product.categorySlug,
        name: product.categoryName,
        count: 1,
        cover: product,
      });
    }
  });
  return [...groups.values()].sort((first, second) => first.name.localeCompare(second.name, 'es'));
}

function CategoryIndex({ products }: { products: ProductSummary[] }) {
  const categories = useMemo(() => groupByCategory(products), [products]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const active = categories.find((entry) => entry.slug === activeSlug) ?? categories[0];

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className={styles.categories} aria-labelledby="categories-title">
      <h2 id="categories-title" className={styles.sectionTitle}>
        {es.home.categories}
      </h2>
      <div className={styles.categoryLayout}>
        <ul className={styles.categoryList}>
          {categories.map((entry) => (
            <li key={entry.slug}>
              <a
                className={styles.categoryLink}
                href={hrefFor({ name: 'catalog', category: entry.slug })}
                data-active={entry.slug === active.slug || undefined}
                onMouseEnter={() => setActiveSlug(entry.slug)}
                onFocus={() => setActiveSlug(entry.slug)}
              >
                <span className={styles.categoryName}>{entry.name}</span>
                <span className={styles.categoryCount}>{es.common.products(entry.count)}</span>
                <Icon name="arrow-right" className={styles.categoryArrow} />
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.categoryPreview} aria-hidden="true">
          {categories.map((entry) => {
            const garment = garmentFor(entry.cover.name, entry.cover.categorySlug);
            return (
              <div
                key={entry.slug}
                className={styles.previewLayer}
                data-active={entry.slug === active.slug || undefined}
              >
                <GarmentArt
                  kind={garment.kind}
                  print={garment.print}
                  color={entry.cover.colors[0]?.hex ?? 'var(--palette-ink-800)'}
                />
                <p className={styles.previewCaption}>{entry.cover.name}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { state, reload } = useAsync((signal) => fetchProducts({ size: ALL_PRODUCTS }, signal), []);
  const products = useMemo(() => state.data?.content ?? [], [state.data]);
  const newArrivals = useMemo(
    () => [...products].sort((first, second) => second.basePrice - first.basePrice).slice(0, NEW_ARRIVALS),
    [products],
  );

  return (
    <>
      <Hero products={products} />

      <section className={styles.section} aria-labelledby="new-title">
        <header className={styles.sectionHead}>
          <h2 id="new-title" className={styles.sectionTitle}>
            {es.home.newArrivals}
          </h2>
          <ButtonLink variant="ghost" href={hrefFor({ name: 'catalog' })}>
            {es.common.viewCatalog}
            <Icon name="arrow-right" />
          </ButtonLink>
        </header>
        <ProductGrid state={state} products={newArrivals} onRetry={reload} />
      </section>

      <CategoryIndex products={products} />

      <section className={styles.limited} aria-labelledby="limited-title">
        <h2 id="limited-title" className={styles.limitedTitle}>
          {es.home.limitedTitle}
        </h2>
        <p className={styles.limitedBody}>{es.home.limitedBody}</p>
        <ButtonLink href={hrefFor({ name: 'catalog' })} size="lg">
          {es.home.limitedCta}
        </ButtonLink>
      </section>
    </>
  );
}
