import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError } from '../api/http';
import { checkout, type CardDetails } from '../api/orders';
import { useNotify } from '../app/notifications';
import { hrefFor, navigate } from '../app/router';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { Button, ButtonLink } from '../components/Button';
import { LinePhoto } from '../components/LinePhoto';
import { Icon } from '../components/Icon';
import { TextField } from '../components/TextField';
import { es } from '../i18n/es';
import { formatCop } from '../lib/money';
import styles from './CheckoutPage.module.css';

type CardField = keyof CardDetails;

const EMPTY_CARD: CardDetails = { cardHolder: '', cardNumber: '', expiry: '', cvc: '' };
const TEST_CARD = { cardNumber: '4242 4242 4242 4242', expiry: '12/29', cvc: '123' };
const FIELD_FOR_CODE: Partial<Record<string, CardField>> = { CARD_INVALID: 'cardNumber', CARD_EXPIRED: 'expiry' };

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function fieldErrorsOf(error: ApiError): Partial<Record<CardField, string>> {
  const fields: Partial<Record<CardField, string>> = {};
  Object.entries(error.fields).forEach(([key, message]) => {
    fields[key.replace(/^payment\./, '') as CardField] = message;
  });
  const field = FIELD_FOR_CODE[error.code];
  if (field) {
    fields[field] = error.message;
  }
  return fields;
}

export function CheckoutPage() {
  const auth = useAuth();
  const cart = useCart();
  const notify = useNotify();
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);
  const [errors, setErrors] = useState<Partial<Record<CardField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (auth.status === 'anonymous') {
      navigate({ name: 'login', next: hrefFor({ name: 'checkout' }) }, { replace: true });
    }
  }, [auth.status]);

  const update = (field: CardField, format: (value: string) => string = (value) => value) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = format(event.target.value);
      setCard((current) => ({ ...current, [field]: value }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    };

  const fillTestCard = () => {
    setCard((current) => ({ ...TEST_CARD, cardHolder: current.cardHolder || auth.user?.fullName || '' }));
    setErrors({});
    setFormError(null);
  };

  const pay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaying(true);
    setErrors({});
    setFormError(null);
    try {
      const order = await checkout({ ...card, cardHolder: card.cardHolder.trim() });
      await cart.reload();
      if (order.status === 'PAID') {
        notify({ tone: 'success', title: es.checkout.placed, detail: es.orders.code(order.id) });
        navigate({ name: 'order', id: order.id, placed: true }, { replace: true });
        return;
      }
      setFormError(es.checkout.rejected);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : null;
      const fields = apiError ? fieldErrorsOf(apiError) : {};
      if (Object.keys(fields).length > 0) {
        setErrors(fields);
      } else {
        setFormError(apiError?.message ?? es.errors.generic);
        await cart.reload();
      }
    }
    setPaying(false);
  };

  if (auth.status !== 'authenticated') {
    return null;
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <nav className={styles.crumb} aria-label={es.product.breadcrumb}>
          <a href={hrefFor({ name: 'catalog' })}>{es.catalog.title}</a> / {es.checkout.crumb}
        </nav>
        <h1 className={styles.title}>{es.checkout.title}</h1>
      </header>

      {cart.lines.length === 0 ? (
        <div className={styles.empty}>
          <p>{es.checkout.empty}</p>
          <ButtonLink href={hrefFor({ name: 'catalog' })}>{es.cart.emptyCta}</ButtonLink>
        </div>
      ) : (
        <div className={styles.grid}>
          <form className={styles.form} onSubmit={pay} noValidate aria-labelledby="payment-title">
            <div className={styles.paymentHead}>
              <h2 id="payment-title" className={styles.sectionTitle}>
                {es.checkout.paymentTitle}
              </h2>
              <p className={styles.muted}>{es.checkout.paymentBody}</p>
              <ul className={styles.testCards}>
                {es.checkout.testCards.map((testCard) => (
                  <li key={testCard.number}>
                    <code>{testCard.number}</code>
                    <span>{testCard.result}</span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" onClick={fillTestCard} className={styles.testButton}>
                {es.checkout.useTestCard}
              </Button>
            </div>

            <TextField
              label={es.checkout.cardHolder}
              name="cardHolder"
              autoComplete="cc-name"
              value={card.cardHolder}
              onChange={update('cardHolder')}
              error={errors.cardHolder}
            />
            <TextField
              label={es.checkout.cardNumber}
              name="cardNumber"
              autoComplete="cc-number"
              inputMode="numeric"
              placeholder="0000 0000 0000 0000"
              value={card.cardNumber}
              onChange={update('cardNumber', formatCardNumber)}
              error={errors.cardNumber}
            />
            <div className={styles.row}>
              <TextField
                label={es.checkout.expiry}
                name="expiry"
                autoComplete="cc-exp"
                inputMode="numeric"
                placeholder="MM/AA"
                value={card.expiry}
                onChange={update('expiry', formatExpiry)}
                error={errors.expiry}
              />
              <TextField
                label={es.checkout.cvc}
                name="cvc"
                type="password"
                autoComplete="cc-csc"
                inputMode="numeric"
                maxLength={4}
                value={card.cvc}
                onChange={update('cvc', (value) => value.replace(/\D/g, '').slice(0, 4))}
                error={errors.cvc}
              />
            </div>

            {formError && (
              <p className={styles.formError} role="alert">
                <Icon name="alert" />
                {formError}
              </p>
            )}

            <Button type="submit" size="lg" block loading={paying} disabled={cart.busy}>
              {es.checkout.pay(formatCop(cart.subtotal))}
            </Button>
            <p className={styles.note}>{es.cart.paymentNote}</p>
          </form>

          <aside className={styles.summary} aria-labelledby="summary-title">
            <h2 id="summary-title" className={styles.sectionTitle}>
              {es.checkout.summary} · {es.checkout.units(cart.count)}
            </h2>
            <ul className={styles.lines}>
              {cart.lines.map((line) => (
                <li key={line.variantId} className={styles.line}>
                  <div className={styles.thumb} aria-hidden="true">
                    <LinePhoto
                      thumbnailUrl={line.thumbnailUrl}
                      photoColor={line.photoColor}
                      photoColorHex={line.photoColorHex}
                      colorName={line.colorName}
                      colorHex={line.colorHex}
                      fallback={line.garment}
                    />
                  </div>
                  <div>
                    <p className={styles.lineName}>{line.name}</p>
                    <p className={styles.muted}>{es.cart.lineDetail(line.size, line.colorName)}</p>
                    <p className={styles.muted}>{es.orders.lineQuantity(line.quantity, formatCop(line.unitPrice))}</p>
                  </div>
                  <p className={styles.linePrice}>{formatCop(line.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className={styles.totals}>
              <div>
                <dt>{es.cart.subtotal}</dt>
                <dd>{formatCop(cart.subtotal)}</dd>
              </div>
              <div>
                <dt>{es.checkout.shipping}</dt>
                <dd>{es.checkout.shippingFree}</dd>
              </div>
              <div className={styles.grandTotal}>
                <dt>{es.checkout.total}</dt>
                <dd>{formatCop(cart.subtotal)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
