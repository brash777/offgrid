import { useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { currentHref, hrefFor } from '../app/router';
import { ButtonLink } from '../components/Button';
import { GarmentArt } from '../components/garment/GarmentArt';
import { Icon } from '../components/Icon';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { es } from '../i18n/es';
import { formatCop } from '../lib/money';
import { useCart, type CartLine } from './CartContext';
import styles from './CartDrawer.module.css';

const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];
const DRAWER_SECONDS = 0.42;
const SCRIM_SECONDS = 0.24;

function LineItem({ line }: { line: CartLine }) {
  const cart = useCart();
  return (
    <li className={styles.line}>
      <a
        className={styles.thumb}
        href={hrefFor({ name: 'product', id: line.productId })}
        onClick={() => cart.close()}
        tabIndex={-1}
        aria-hidden="true"
      >
        <GarmentArt kind={line.garment.kind} print={line.garment.print} color={line.colorHex} />
      </a>
      <div className={styles.lineInfo}>
        <a
          className={styles.lineName}
          href={hrefFor({ name: 'product', id: line.productId })}
          onClick={() => cart.close()}
        >
          {line.name}
        </a>
        <p className={styles.lineMeta}>{es.cart.lineDetail(line.size, line.colorName)}</p>
        <div className={styles.lineControls}>
          <div className={styles.stepper} role="group" aria-label={`${es.cart.quantity}: ${line.name}`}>
            <button
              type="button"
              aria-label={es.cart.decrease}
              disabled={cart.busy || line.quantity <= 1}
              onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
            >
              <Icon name="minus" />
            </button>
            <output aria-live="polite">{line.quantity}</output>
            <button
              type="button"
              aria-label={es.cart.increase}
              disabled={cart.busy || line.quantity >= line.maxQuantity}
              onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
            >
              <Icon name="plus" />
            </button>
          </div>
          <button
            type="button"
            className={styles.remove}
            disabled={cart.busy}
            onClick={() => cart.remove(line.variantId)}
          >
            {es.cart.remove}
          </button>
        </div>
      </div>
      <p className={styles.linePrice}>{formatCop(line.lineTotal)}</p>
    </li>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const { close } = cart;
  const closeFromKeyboard = useCallback(() => close('keyboard'), [close]);
  useFocusTrap(panelRef, cart.isOpen, closeFromKeyboard);
  const drawerSeconds = cart.instant ? 0 : DRAWER_SECONDS;
  const scrimSeconds = cart.instant ? 0 : SCRIM_SECONDS;

  return (
    <AnimatePresence>
      {cart.isOpen && (
        <div className={styles.layer}>
          <motion.div
            className={styles.scrim}
            onClick={() => close()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: scrimSeconds }}
          />
          <motion.aside
            ref={panelRef}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: drawerSeconds, ease: EASE_DRAWER }}
          >
            <header className={styles.head}>
              <h2 id="cart-title" className={styles.title}>
                {es.nav.cart(cart.count)}
              </h2>
              <button type="button" className={styles.close} onClick={() => close()} aria-label={es.common.close}>
                <Icon name="close" />
              </button>
            </header>

            {!cart.signedIn ? (
              <div className={styles.empty}>
                <p className={styles.emptyTitle}>{es.cart.signInTitle}</p>
                <p>{es.cart.signInBody}</p>
                <ButtonLink href={hrefFor({ name: 'login', next: currentHref() })} onClick={() => close()}>
                  {es.cart.signInCta}
                </ButtonLink>
              </div>
            ) : cart.lines.length === 0 ? (
              <div className={styles.empty}>
                <p>{es.cart.empty}</p>
                <ButtonLink href={hrefFor({ name: 'catalog' })} onClick={() => close()}>
                  {es.cart.emptyCta}
                </ButtonLink>
              </div>
            ) : (
              <>
                <ul className={styles.lines}>
                  {cart.lines.map((line) => (
                    <LineItem key={line.variantId} line={line} />
                  ))}
                </ul>
                <footer className={styles.foot}>
                  <p className={styles.subtotal}>
                    <span>{es.cart.subtotal}</span>
                    <span>{formatCop(cart.subtotal)}</span>
                  </p>
                  <ButtonLink
                    size="lg"
                    block
                    href={hrefFor({ name: 'checkout' })}
                    onClick={() => close()}
                    aria-describedby="checkout-note"
                  >
                    {es.cart.checkout}
                  </ButtonLink>
                  <p id="checkout-note" className={styles.note}>
                    {es.cart.paymentNote}
                  </p>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
