import { useMemo, useState, type CSSProperties, type PointerEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { fetchProduct, fetchProducts, type ProductDetail } from '../api/catalog';
import { useNotify } from '../app/notifications';
import { currentHref, hrefFor, navigate } from '../app/router';
import { RarityTag } from '../components/Badge';
import { Button, ButtonLink } from '../components/Button';
import { ErrorState } from '../components/ErrorState';
import { GarmentArt } from '../components/garment/GarmentArt';
import { Icon } from '../components/Icon';
import { OptionPicker } from '../components/OptionPicker';
import { ProductGrid } from '../components/ProductGrid';
import { SkeletonBlock } from '../components/Skeleton';
import { useCart } from '../cart/CartContext';
import { useAsync } from '../hooks/useAsync';
import { es } from '../i18n/es';
import { colorsOf, compareSizes, LOW_STOCK_THRESHOLD } from '../lib/catalog';
import { garmentFor } from '../lib/garments';
import { formatCop } from '../lib/money';
import { rarityForPrice } from '../lib/rarity';
import styles from './ProductPage.module.css';

const ALL_PRODUCTS = 100;
const MISSING_STATUSES = [400, 404];
const PAIR_COUNT = 4;
const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];

function Stage({
  product,
  colorHex,
  onNextColor,
}: {
  product: ProductDetail;
  colorHex: string;
  onNextColor?: () => void;
}) {
  const garment = garmentFor(product.name, product.categorySlug);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setZoom({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
  };

  const zoomStyle = zoom ? ({ '--zoom-x': `${zoom.x}%`, '--zoom-y': `${zoom.y}%` } as CSSProperties) : undefined;

  return (
    <div className={styles.stage}>
      <div
        className={styles.zoomArea}
        style={zoomStyle}
        data-zoomed={zoom ? true : undefined}
        onPointerMove={handleMove}
        onPointerLeave={() => setZoom(null)}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={colorHex}
            className={styles.art}
            initial={{ opacity: 0, x: 40, rotate: 2 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40, rotate: -2 }}
            transition={{ duration: 0.32, ease: EASE_IN_OUT }}
          >
            <div className={styles.zoomTarget}>
              <GarmentArt kind={garment.kind} print={garment.print} color={colorHex} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {onNextColor && (
        <button type="button" className={styles.next} onClick={onNextColor} aria-label={es.product.nextColor}>
          <Icon name="arrow-right" />
        </button>
      )}
    </div>
  );
}

function ProductView({ product }: { product: ProductDetail }) {
  const cart = useCart();
  const notify = useNotify();
  const [adding, setAdding] = useState(false);
  const colors = useMemo(() => colorsOf(product.variants), [product.variants]);
  const [colorHex, setColorHex] = useState(colors[0]?.hex ?? '');
  const sizes = useMemo(
    () =>
      product.variants
        .filter((variant) => variant.colorHex === colorHex)
        .sort((first, second) => compareSizes(first.size, second.size)),
    [product.variants, colorHex],
  );
  const [chosenSize, setChosenSize] = useState<string | null>(null);
  const variant =
    sizes.find((option) => option.size === chosenSize) ?? sizes.find((option) => option.availableStock > 0) ?? sizes[0];
  const color = colors.find((option) => option.hex === colorHex);
  const rarity = rarityForPrice(product.basePrice);
  const soldOut = !variant || variant.availableStock === 0;
  const price = formatCop(variant?.price ?? product.basePrice);

  const cycleColor = () => {
    const index = colors.findIndex((option) => option.hex === colorHex);
    setColorHex(colors[(index + 1) % colors.length].hex);
  };

  const addToCart = async () => {
    if (!variant || !color) {
      return;
    }
    setAdding(true);
    const result = await cart.add(variant.id);
    setAdding(false);
    if (result === 'login') {
      navigate({ name: 'login', next: currentHref() });
    } else if (result === 'added') {
      notify({
        tone: 'success',
        title: es.cart.added,
        detail: `${product.name} · ${es.cart.lineDetail(variant.size, color.name)}`,
        action: { label: es.cart.viewCart, onClick: cart.open },
      });
    }
  };

  return (
    <div className={styles.layout}>
      <section className={styles.info} aria-labelledby="product-title">
        <nav aria-label={es.product.breadcrumb} className={styles.crumb}>
          <a href={hrefFor({ name: 'catalog' })}>{es.catalog.title}</a> /{' '}
          <a href={hrefFor({ name: 'catalog', category: product.categorySlug })}>{product.categoryName}</a>
        </nav>
        <h1 id="product-title" className={styles.title}>
          {product.name}
        </h1>
        <p className={styles.price}>{price}</p>
        {product.description && <p className={styles.description}>{product.description}</p>}
        <dl className={styles.details}>
          <div>
            <dt>{es.product.category}</dt>
            <dd>{product.categoryName}</dd>
          </div>
          <div>
            <dt>{es.common.color}</dt>
            <dd>{color?.name}</dd>
          </div>
          <div>
            <dt>{es.rarity.label}</dt>
            <dd>
              <RarityTag rarity={rarity} />
            </dd>
          </div>
          {variant && (
            <div>
              <dt>{es.product.reference}</dt>
              <dd>{variant.sku}</dd>
            </div>
          )}
        </dl>
        <details className={styles.accordion}>
          <summary>
            {es.product.shipping}
            <Icon name="plus" className={styles.accordionIcon} />
          </summary>
          <p>{es.product.shippingBody}</p>
        </details>
      </section>

      <Stage product={product} colorHex={colorHex} onNextColor={colors.length > 1 ? cycleColor : undefined} />

      <section className={styles.buy} aria-label={es.common.addToCart}>
        {colors.length > 0 && (
          <OptionPicker
            legend={es.common.color}
            value={colorHex}
            onChange={setColorHex}
            options={colors.map((option) => ({ value: option.hex, label: option.name, swatch: option.hex }))}
          />
        )}
        {sizes.length > 0 && variant && (
          <OptionPicker
            legend={es.common.size}
            value={variant.size}
            onChange={setChosenSize}
            disabledSuffix={es.common.soldOut}
            options={sizes.map((option) => ({
              value: option.size,
              label: option.size,
              disabled: option.availableStock === 0,
            }))}
          />
        )}
        <p
          className={styles.stock}
          data-low={variant && variant.availableStock <= LOW_STOCK_THRESHOLD ? true : undefined}
        >
          {soldOut
            ? es.common.soldOut
            : variant.availableStock <= LOW_STOCK_THRESHOLD
              ? es.product.stockLeft(variant.availableStock)
              : es.product.inStock}
        </p>
        <Button size="lg" block disabled={soldOut} loading={adding} onClick={addToCart}>
          {soldOut ? es.common.soldOut : es.product.addWithPrice(price)}
        </Button>
        <p className={styles.payment}>{es.product.paymentNote}</p>
      </section>
    </div>
  );
}

function PairWith({ product }: { product: ProductDetail }) {
  const { state, reload } = useAsync((signal) => fetchProducts({ size: ALL_PRODUCTS }, signal), []);
  const picks = useMemo(() => {
    const seen = new Set<string>([product.categorySlug]);
    return (state.data?.content ?? [])
      .filter((item) => {
        if (seen.has(item.categorySlug)) {
          return false;
        }
        seen.add(item.categorySlug);
        return true;
      })
      .slice(0, PAIR_COUNT);
  }, [state.data, product.categorySlug]);

  return (
    <section className={styles.pair} aria-labelledby="pair-title">
      <h2 id="pair-title" className={styles.pairTitle}>
        {es.product.pairWith}
      </h2>
      <ProductGrid state={state} products={picks} skeletons={PAIR_COUNT} onRetry={reload} />
    </section>
  );
}

function ProductSkeleton() {
  return (
    <div className={styles.layout} aria-busy="true">
      <div className={styles.info}>
        <SkeletonBlock className={styles.skeletonTitle} />
        <SkeletonBlock className={styles.skeletonLine} />
        <SkeletonBlock className={styles.skeletonLine} />
      </div>
      <SkeletonBlock className={styles.skeletonStage} />
      <div className={styles.buy}>
        <SkeletonBlock className={styles.skeletonLine} />
        <SkeletonBlock className={styles.skeletonButton} />
      </div>
    </div>
  );
}

export function ProductPage({ id }: { id: string }) {
  const { state, reload } = useAsync((signal) => fetchProduct(id, signal), [id]);

  if (state.status === 'loading') {
    return <ProductSkeleton />;
  }

  if (state.status === 'error') {
    return (
      <div className={styles.message}>
        {MISSING_STATUSES.includes(state.error.status) ? (
          <>
            <h1 className={styles.title}>{es.product.notFound}</h1>
            <ButtonLink href={hrefFor({ name: 'catalog' })}>{es.product.backToCatalog}</ButtonLink>
          </>
        ) : (
          <ErrorState error={state.error} onRetry={reload} />
        )}
      </div>
    );
  }

  return (
    <>
      <ProductView key={state.data.id} product={state.data} />
      <PairWith product={state.data} />
    </>
  );
}
