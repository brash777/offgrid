import { useAuth } from '../../auth/AuthContext';
import { useCart } from '../../cart/CartContext';
import { BrandLogo } from '../../components/BrandLogo';
import { Icon } from '../../components/Icon';
import { useScrolled } from '../../hooks/useScrolled';
import { es } from '../../i18n/es';
import { currentHref, hrefFor, type Route } from '../router';
import styles from './SiteHeader.module.css';

interface SiteHeaderProps {
  route: Route;
  onSearch: () => void;
}

const SCROLL_THRESHOLD = 8;

function isCurrent(route: Route, category: string | undefined): boolean {
  return route.name === 'catalog' && route.category === category;
}

export function SiteHeader({ route, onSearch }: SiteHeaderProps) {
  const cart = useCart();
  const auth = useAuth();
  const scrolled = useScrolled(SCROLL_THRESHOLD);
  const onAuthPage = route.name === 'login' || route.name === 'register';

  return (
    <header className={styles.header} data-scrolled={scrolled || undefined}>
      <a href={hrefFor({ name: 'home' })} className={styles.logo} aria-label={es.nav.homeLink}>
        <BrandLogo variant="wordmark" />
        <span className={styles.dot} aria-hidden="true" />
      </a>

      <nav className={styles.nav} aria-label={es.nav.main}>
        {es.nav.links.map((link) => (
          <a
            key={link.label}
            href={hrefFor({ name: 'catalog', category: link.category })}
            className={styles.link}
            aria-current={isCurrent(route, link.category) ? 'page' : undefined}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onSearch}
          aria-label={es.nav.search}
          aria-keyshortcuts="/"
        >
          <Icon name="search" />
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
          className={styles.bag}
          onClick={() => cart.toggle()}
          aria-expanded={cart.isOpen}
          aria-keyshortcuts="C"
          aria-label={es.nav.bag(cart.count)}
          data-cart-target
        >
          <Icon name="bag" />
          {cart.count > 0 && (
            <span key={cart.count} className={styles.badge} aria-hidden="true">
              {cart.count}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
