import { useAuth } from '../../auth/AuthContext';
import { useCart } from '../../cart/CartContext';
import { BrandLogo } from '../../components/BrandLogo';
import { es } from '../../i18n/es';
import { currentHref, hrefFor, type Route } from '../router';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  route: Route;
  overlay: boolean;
  onSearch: () => void;
}

export function SiteHeader({ route, overlay, onSearch }: SiteHeaderProps) {
  const cart = useCart();
  const auth = useAuth();
  const onAuthPage = route.name === 'login' || route.name === 'register';

  return (
    <header className={styles.header} data-overlay={overlay || undefined} data-surface={overlay ? 'hero' : undefined}>
      <nav className={styles.nav} aria-label={es.nav.main}>
        <a
          href={hrefFor({ name: 'home' })}
          className={styles.link}
          aria-current={route.name === 'home' ? 'page' : undefined}
        >
          {es.nav.home}
        </a>
        <a
          href={hrefFor({ name: 'catalog' })}
          className={styles.link}
          aria-current={route.name === 'catalog' ? 'page' : undefined}
        >
          {es.nav.catalog}
        </a>
      </nav>

      <a href={hrefFor({ name: 'home' })} className={styles.logo} aria-label={es.nav.homeLink}>
        <BrandLogo variant="wordmark" />
      </a>

      <div className={styles.actions}>
        <button type="button" className={styles.link} onClick={onSearch} aria-keyshortcuts="/">
          {es.nav.search}
        </button>
        {auth.status === 'authenticated' && (
          <a
            href={hrefFor({ name: 'account' })}
            className={styles.link}
            aria-current={route.name === 'account' ? 'page' : undefined}
          >
            {es.nav.account}
          </a>
        )}
        {auth.status === 'anonymous' && (
          <a
            href={hrefFor({ name: 'login', next: onAuthPage ? undefined : currentHref() })}
            className={styles.link}
            aria-current={onAuthPage ? 'page' : undefined}
          >
            {es.nav.signIn}
          </a>
        )}
        <button
          type="button"
          className={styles.link}
          onClick={() => cart.toggle()}
          aria-expanded={cart.isOpen}
          aria-keyshortcuts="C"
        >
          {es.nav.cart(cart.count)}
        </button>
      </div>
    </header>
  );
}
