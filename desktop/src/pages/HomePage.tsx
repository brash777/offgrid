import { useMemo } from 'react';
import { fetchProducts } from '../api/catalog';
import { ErrorState } from '../components/ErrorState';
import { Hero } from '../components/home/Hero';
import { BrandMarquee, Collections, JoinBanner, NewArrivals, WhyUs } from '../components/home/HomeSections';
import { useAsync } from '../hooks/useAsync';
import styles from './HomePage.module.css';

const ALL_PRODUCTS = 100;

interface HomePageProps {
  ready: boolean;
}

export function HomePage({ ready }: HomePageProps) {
  const { state, reload } = useAsync((signal) => fetchProducts({ size: ALL_PRODUCTS }, signal), []);
  const products = useMemo(() => state.data?.content ?? [], [state.data]);

  return (
    <>
      <Hero ready={ready} products={products} />
      <BrandMarquee />
      {state.status === 'error' ? (
        <div className={styles.error}>
          <ErrorState error={state.error} onRetry={reload} />
        </div>
      ) : (
        <>
          <Collections products={products} />
          <NewArrivals products={products} loading={state.status === 'loading'} />
        </>
      )}
      <WhyUs />
      <JoinBanner />
    </>
  );
}
