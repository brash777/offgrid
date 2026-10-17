import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { AuthProvider } from '../auth/AuthContext';
import { CartDrawer } from '../cart/CartDrawer';
import { CartProvider, useCart } from '../cart/CartContext';
import { IntroSplash } from '../components/IntroSplash';
import { Marquee } from '../components/Marquee';
import { useScrolled } from '../hooks/useScrolled';
import { es } from '../i18n/es';
import { AccountPage } from '../pages/AccountPage';
import { AuthPage } from '../pages/AuthPage';
import { CatalogPage } from '../pages/CatalogPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { OrderPage } from '../pages/OrderPage';
import { ProductPage } from '../pages/ProductPage';
import { SiteFooter } from './layout/SiteFooter';
import { SiteHeader } from './layout/SiteHeader';
import { NotificationsProvider } from './notifications';
import { navigate, routeKey, useRoute, type Route } from './router';
import { requestSearchFocus } from './searchFocus';
import styles from './App.module.css';

const INTRO_SEEN_KEY = 'flowstore.intro-seen';
const HERO_SCROLL_THRESHOLD = 0.75;

function readIntroSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, 'true');
  } catch {
    return;
  }
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

function PageFor({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomePage />;
    case 'catalog':
      return <CatalogPage category={route.category} search={route.search} />;
    case 'product':
      return <ProductPage id={route.id} />;
    case 'login':
    case 'register':
      return <AuthPage mode={route.name} next={route.next} />;
    case 'account':
      return <AccountPage />;
    case 'checkout':
      return <CheckoutPage />;
    case 'order':
      return <OrderPage id={route.id} placed={route.placed} />;
    case 'notFound':
      return <NotFoundPage />;
  }
}

function Shell() {
  const route = useRoute();
  const cart = useCart();
  const mainRef = useRef<HTMLElement>(null);
  const [introDone, setIntroDone] = useState(readIntroSeen);
  const pastHero = useScrolled(window.innerHeight * HERO_SCROLL_THRESHOLD);
  const overlay = route.name === 'home' && !pastHero;
  const pageKey = routeKey(route);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pageKey]);

  const finishIntro = useCallback(() => {
    rememberIntroSeen();
    setIntroDone(true);
  }, []);

  const openSearch = useCallback(() => {
    requestSearchFocus();
    if (route.name !== 'catalog') {
      navigate({ name: 'catalog' });
    }
  }, [route.name]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!introDone || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      if (event.key === '/') {
        event.preventDefault();
        openSearch();
      } else if (event.key.toLowerCase() === 'c') {
        cart.toggle('keyboard');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [introDone, openSearch, cart]);

  return (
    <>
      <button type="button" className="skip-link" onClick={() => mainRef.current?.focus()}>
        {es.nav.skipToContent}
      </button>
      <Marquee items={es.announcement} />
      <SiteHeader route={route} overlay={overlay} onSearch={openSearch} />
      <main ref={mainRef} className={styles.main} tabIndex={-1}>
        <div key={pageKey} className={styles.page}>
          <PageFor route={route} />
        </div>
      </main>
      <SiteFooter />
      <CartDrawer />
      <AnimatePresence>{!introDone && <IntroSplash key="intro" onEnter={finishIntro} />}</AnimatePresence>
    </>
  );
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <NotificationsProvider>
        <AuthProvider>
          <CartProvider>
            <Shell />
          </CartProvider>
        </AuthProvider>
      </NotificationsProvider>
    </MotionConfig>
  );
}
