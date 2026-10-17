import { useEffect } from 'react';
import { fetchOrder, type Order, type OrderStatus } from '../api/orders';
import { hrefFor, navigate } from '../app/router';
import { useAuth } from '../auth/AuthContext';
import { Badge, type BadgeTone } from '../components/Badge';
import { ButtonLink } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { GarmentArt } from '../components/garment/GarmentArt';
import { SkeletonBlock } from '../components/Skeleton';
import { useAsync } from '../hooks/useAsync';
import { es } from '../i18n/es';
import { formatDateTime } from '../lib/dates';
import { garmentFor } from '../lib/garments';
import { formatCop } from '../lib/money';
import styles from './OrderPage.module.css';

export const ORDER_TONE: Record<OrderStatus, BadgeTone> = { PENDING: 'neutral', PAID: 'success', CANCELLED: 'warning' };

interface OrderPageProps {
  id: string;
  placed?: boolean;
}

export function OrderPage({ id, placed }: OrderPageProps) {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'anonymous') {
      navigate({ name: 'login', next: hrefFor({ name: 'order', id }) }, { replace: true });
    }
  }, [auth.status, id]);

  if (auth.status !== 'authenticated') {
    return (
      <div className={styles.page}>
        <SkeletonBlock className={styles.skeleton} />
      </div>
    );
  }
  return <OrderView id={id} placed={placed} />;
}

function OrderView({ id, placed }: OrderPageProps) {
  const { state, reload } = useAsync((signal) => fetchOrder(id, signal), [id]);

  if (state.status === 'loading') {
    return (
      <div className={styles.page}>
        <SkeletonBlock className={styles.skeleton} />
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div className={styles.page}>
        {state.error.status === 404 || state.error.status === 400 ? (
          <div className={styles.missing}>
            <h1 className={styles.title}>{es.orders.notFound}</h1>
            <ButtonLink href={hrefFor({ name: 'account' })}>{es.orders.backToAccount}</ButtonLink>
          </div>
        ) : (
          <ErrorState error={state.error} onRetry={reload} />
        )}
      </div>
    );
  }
  return <OrderDetail order={state.data} placed={Boolean(placed) && state.data.status === 'PAID'} />;
}

function OrderDetail({ order, placed }: { order: Order; placed: boolean }) {
  const code = es.orders.code(order.id);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumb} aria-label={es.product.breadcrumb}>
          <a href={hrefFor({ name: 'account' })}>{es.account.title}</a> / {code}
        </nav>
        <h1 className={styles.title}>{placed ? es.orders.placedTitle : es.orders.orderTitle(code)}</h1>
        {placed && <p className={styles.lead}>{es.orders.placedBody}</p>}
        <div className={styles.meta}>
          <Badge tone={ORDER_TONE[order.status]}>{es.orders.status[order.status]}</Badge>
          {order.payment && <span>{es.orders.payment[order.payment.status]}</span>}
          <span>{formatDateTime(order.createdAt)}</span>
          {placed && <span>{code}</span>}
        </div>
      </header>

      <div className={styles.grid}>
        <ul className={styles.lines} aria-label={es.orders.items}>
          {order.items.map((line) => {
            const garment = garmentFor(line.productName, line.categorySlug);
            return (
              <li key={line.variantId} className={styles.line}>
                <a className={styles.thumb} href={hrefFor({ name: 'product', id: line.productId })} tabIndex={-1} aria-hidden="true">
                  <GarmentArt kind={garment.kind} print={garment.print} color={line.colorHex} />
                </a>
                <div className={styles.lineInfo}>
                  <a className={styles.lineName} href={hrefFor({ name: 'product', id: line.productId })}>
                    {line.productName}
                  </a>
                  <p className={styles.muted}>{es.orders.variant(line.variantLabel)}</p>
                  <p className={styles.muted}>{es.orders.lineQuantity(line.quantity, formatCop(Number(line.unitPrice)))}</p>
                </div>
                <p className={styles.linePrice}>{formatCop(Number(line.lineTotal))}</p>
              </li>
            );
          })}
        </ul>

        <aside className={styles.summary}>
          <dl className={styles.totals}>
            <div>
              <dt>{es.orders.items}</dt>
              <dd>{es.checkout.units(order.itemCount)}</dd>
            </div>
            <div>
              <dt>{es.checkout.shipping}</dt>
              <dd>{es.checkout.shippingFree}</dd>
            </div>
            <div className={styles.grandTotal}>
              <dt>{es.orders.total}</dt>
              <dd>{formatCop(Number(order.total))}</dd>
            </div>
          </dl>
          <ButtonLink href={hrefFor({ name: 'catalog' })} block>
            {es.orders.keepShopping}
          </ButtonLink>
          <ButtonLink href={hrefFor({ name: 'account' })} variant="secondary" block>
            {es.orders.backToAccount}
          </ButtonLink>
        </aside>
      </div>
    </div>
  );
}
