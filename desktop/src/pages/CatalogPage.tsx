import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchProducts } from '../api/catalog';
import { consumeSearchFocus, SEARCH_FOCUS_EVENT } from '../app/searchFocus';
import { hrefFor, navigate } from '../app/router';
import { Button } from '../components/Button';
import { ProductGrid } from '../components/ProductGrid';
import { TextField } from '../components/TextField';
import { useAsync } from '../hooks/useAsync';
import { useDebounced } from '../hooks/useDebounced';
import { es } from '../i18n/es';
import styles from './CatalogPage.module.css';

const PAGE_SIZE = 12;
const ALL_PRODUCTS = 100;
const SEARCH_DELAY_MS = 300;

interface CatalogPageProps {
  category?: string;
  search?: string;
}

export function CatalogPage({ category, search }: CatalogPageProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(search ?? '');
  const debouncedQuery = useDebounced(query.trim(), SEARCH_DELAY_MS);
  const lastDebouncedQuery = useRef(debouncedQuery);
  const [pageCount, setPageCount] = useState(1);
  const filterKey = `${category ?? ''}|${search ?? ''}`;
  const [syncedFilterKey, setSyncedFilterKey] = useState(filterKey);

  if (filterKey !== syncedFilterKey) {
    setSyncedFilterKey(filterKey);
    setPageCount(1);
    if ((search ?? '') !== query.trim()) {
      setQuery(search ?? '');
    }
  }

  const all = useAsync((signal) => fetchProducts({ size: ALL_PRODUCTS }, signal), []);
  const results = useAsync(
    (signal) => fetchProducts({ categorySlug: category, search, size: PAGE_SIZE * pageCount }, signal),
    [category, search, pageCount],
  );

  useEffect(() => {
    if (debouncedQuery === lastDebouncedQuery.current) {
      return;
    }
    lastDebouncedQuery.current = debouncedQuery;
    if (debouncedQuery !== (search ?? '')) {
      navigate({ name: 'catalog', category, search: debouncedQuery || undefined }, { replace: true });
    }
  }, [debouncedQuery, category, search]);

  useEffect(() => {
    const focusSearch = () => {
      consumeSearchFocus();
      searchRef.current?.focus();
    };
    if (consumeSearchFocus()) {
      searchRef.current?.focus();
    }
    window.addEventListener(SEARCH_FOCUS_EVENT, focusSearch);
    return () => window.removeEventListener(SEARCH_FOCUS_EVENT, focusSearch);
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    (all.state.data?.content ?? []).forEach((product) => {
      const entry = counts.get(product.categorySlug);
      if (entry) {
        entry.count += 1;
      } else {
        counts.set(product.categorySlug, { slug: product.categorySlug, name: product.categoryName, count: 1 });
      }
    });
    return [...counts.values()].sort((first, second) => first.name.localeCompare(second.name, 'es'));
  }, [all.state.data]);

  const activeCategory = categories.find((entry) => entry.slug === category);
  const page = results.state.data;
  const products = page?.content ?? [];
  const hasMore = page ? page.totalElements > products.length : false;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumb} aria-label={es.product.breadcrumb}>
          <a href={hrefFor({ name: 'home' })}>{es.nav.home}</a> /{' '}
          {activeCategory ? (
            <>
              <a href={hrefFor({ name: 'catalog', search })}>{es.catalog.title}</a> / {activeCategory.name}
            </>
          ) : (
            es.catalog.title
          )}
        </nav>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{activeCategory?.name ?? es.catalog.title}</h1>
          {page && <p className={styles.count}>{es.common.products(page.totalElements)}</p>}
        </div>
      </header>

      <div className={styles.toolbar}>
        <nav aria-label={es.catalog.filters}>
          <ul className={styles.filters}>
            <li>
              <a
                className={styles.filter}
                href={hrefFor({ name: 'catalog', search })}
                aria-current={!category ? 'page' : undefined}
              >
                {es.catalog.all}
              </a>
            </li>
            {categories.map((entry) => (
              <li key={entry.slug}>
                <a
                  className={styles.filter}
                  href={hrefFor({ name: 'catalog', category: entry.slug, search })}
                  aria-current={entry.slug === category ? 'page' : undefined}
                >
                  {entry.name}
                  <sup className={styles.filterCount}>{entry.count}</sup>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <TextField
          ref={searchRef}
          className={styles.search}
          type="search"
          label={es.catalog.searchLabel}
          hideLabel
          placeholder={es.catalog.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-keyshortcuts="/"
        />
      </div>

      {results.state.status === 'success' && products.length === 0 ? (
        <div className={styles.empty}>
          <p>{es.catalog.empty}</p>
          <Button variant="secondary" onClick={() => setQuery('')}>
            {es.catalog.clear}
          </Button>
        </div>
      ) : (
        <ProductGrid state={results.state} products={products} onRetry={results.reload} />
      )}

      {hasMore && (
        <div className={styles.more}>
          <Button
            variant="secondary"
            size="lg"
            loading={results.state.status === 'loading'}
            onClick={() => setPageCount((value) => value + 1)}
          >
            {es.catalog.loadMore}
          </Button>
        </div>
      )}
    </div>
  );
}
