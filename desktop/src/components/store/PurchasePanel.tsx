import { useMemo, useRef, useState, type RefObject } from 'react';
import type { ProductDetail } from '../../api/catalog';
import { assetUrl } from '../../api/http';
import { useNotify } from '../../app/notifications';
import { currentHref, hrefFor, navigate } from '../../app/router';
import { useCart } from '../../cart/CartContext';
import { flyToCart } from '../../cart/flyToCart';
import { es } from '../../i18n/es';
import { colorsOf, compareSizes, LOW_STOCK_THRESHOLD } from '../../lib/catalog';
import { formatCop } from '../../lib/money';
import { Button } from '../Button';
import { Icon } from '../Icon';
import styles from './PurchasePanel.module.css';

interface PurchasePanelProps {
  product: ProductDetail;
  colorName: string;
  onColorChange: (name: string) => void;
  photoRef?: RefObject<HTMLElement | null>;
  titleId: string;
  headingLevel?: 'h1' | 'h2';
}

export function PurchasePanel({ product, colorName, onColorChange, photoRef, titleId, headingLevel = 'h2' }: PurchasePanelProps) {
  const cart = useCart();
  const notify = useNotify();
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const [chosenSize, setChosenSize] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const colors = useMemo(() => colorsOf(product.variants), [product.variants]);
  const sizes = useMemo(
    () =>
      product.variants
        .filter((variant) => variant.colorName === colorName)
        .sort((first, second) => compareSizes(first.size, second.size)),
    [product.variants, colorName],
  );
  const variant =
    sizes.find((option) => option.size === chosenSize) ?? sizes.find((option) => option.availableStock > 0) ?? sizes[0];
  const soldOut = !variant || variant.availableStock === 0;
  const price = formatCop(variant?.price ?? product.basePrice);
  const Title = headingLevel;

  const add = async (mode: 'add' | 'buy') => {
    if (!variant) {
      return;
    }
    setBusy(mode);
    const result = await cart.add(variant.id);
    setBusy(null);
    if (result === 'login') {
      navigate({ name: 'login', next: mode === 'buy' ? hrefFor({ name: 'checkout' }) : currentHref() });
      return;
    }
    if (result !== 'added') {
      return;
    }
    if (mode === 'buy') {
      navigate({ name: 'checkout' });
      return;
    }
    flyToCart(assetUrl(product.imageUrls[0]), photoRef?.current ?? buttonRef.current);
    notify({
      tone: 'success',
      title: es.cart.added,
      detail: `${product.name} · ${es.cart.lineDetail(variant.size, variant.colorName)}`,
      action: { label: es.cart.viewCart, onClick: cart.open },
    });
  };

  return (
    <div className={styles.panel}>
      <p className={styles.kicker}>{product.categoryName}</p>
      <Title id={titleId} className={styles.title}>
        {product.name}
      </Title>
      <p className={styles.price}>{price}</p>
      {product.description && <p className={styles.description}>{product.description}</p>}

      {colors.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            {es.store.colorLabel}
            <span className={styles.current}>{colorName}</span>
          </legend>
          <div className={styles.swatches}>
            {colors.map((color) => (
              <label key={color.name} className={styles.swatch} title={color.name}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name={`${titleId}-color`}
                  checked={color.name === colorName}
                  onChange={() => {
                    onColorChange(color.name);
                    setChosenSize(null);
                  }}
                />
                <span className={styles.swatchDot} style={{ background: color.hex }} />
                <span className="visually-hidden">{color.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {sizes.length > 0 && variant && (
        <fieldset className={styles.group}>
          <legend className={styles.legend}>
            {es.store.sizeLabel}
            <span className={styles.current}>{variant.size}</span>
          </legend>
          <div className={styles.sizes}>
            {sizes.map((option) => (
              <label
                key={option.id}
                className={styles.size}
                data-disabled={option.availableStock === 0 || undefined}
                data-wide={option.size.length > 3 || undefined}
              >
                <input
                  className="visually-hidden"
                  type="radio"
                  name={`${titleId}-size`}
                  checked={option.id === variant.id}
                  disabled={option.availableStock === 0}
                  onChange={() => setChosenSize(option.size)}
                />
                <span>{option.size}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <p className={styles.stock} data-low={variant && variant.availableStock <= LOW_STOCK_THRESHOLD ? true : undefined}>
        <span className={styles.stockDot} aria-hidden="true" />
        {soldOut
          ? es.common.soldOut
          : variant.availableStock <= LOW_STOCK_THRESHOLD
            ? es.product.stockLeft(variant.availableStock)
            : es.product.inStock}
      </p>

      <div className={styles.actions} ref={buttonRef}>
        <Button
          variant="accent"
          size="lg"
          disabled={soldOut || busy !== null}
          loading={busy === 'add'}
          onClick={() => add('add')}
          icon={<Icon name="bag" />}
        >
          {es.store.addToCart}
        </Button>
        <Button
          size="lg"
          disabled={soldOut || busy !== null}
          loading={busy === 'buy'}
          onClick={() => add('buy')}
          icon={<Icon name="bolt" />}
        >
          {es.store.buyNow}
        </Button>
      </div>
      <p className={styles.note}>{es.product.paymentNote}</p>
    </div>
  );
}
