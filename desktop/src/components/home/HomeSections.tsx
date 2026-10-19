import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ProductSummary } from '../../api/catalog';
import { hrefFor, navigate } from '../../app/router';
import sceneAccessories from '../../assets/home/scene-accessories.webp';
import sceneEssentials from '../../assets/home/scene-essentials.webp';
import sceneOuterwear from '../../assets/home/scene-outerwear.webp';
import sceneSneakers from '../../assets/home/scene-sneakers.webp';
import { es } from '../../i18n/es';
import { Icon, type IconName } from '../Icon';
import { ProductCard } from '../ProductCard';
import { ProductCardSkeleton } from '../Skeleton';
import styles from './HomeSections.module.css';

const SCENES: Record<string, string> = {
  outerwear: sceneOuterwear,
  sneakers: sceneSneakers,
  essentials: sceneEssentials,
  accessories: sceneAccessories,
};
const ARRIVALS = 8;
const NEW_BADGES = 3;
const REVEAL_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.9, ease: REVEAL_EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ kicker, title, id, aside }: { kicker: string; title: string; id: string; aside?: ReactNode }) {
  return (
    <header className={styles.head}>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
      </div>
      {aside}
    </header>
  );
}

export function BrandMarquee() {
  const brands = es.store.brands;
  return (
    <section className={styles.brands} aria-label={es.store.brandsLabel}>
      <p className={styles.brandsLabel}>{es.store.brandsLabel}</p>
      <div className={styles.brandsTrack}>
        {[0, 1, 2].map((copy) => (
          <ul key={copy} className={styles.brandsRow} aria-hidden={copy > 0 || undefined}>
            {brands.map((brand) => (
              <li key={brand}>{brand}</li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

export function Collections({ products }: { products: ProductSummary[] }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((product) => map.set(product.categorySlug, (map.get(product.categorySlug) ?? 0) + 1));
    return map;
  }, [products]);

  return (
    <section className={styles.section} aria-labelledby="collections-title">
      <SectionHead
        kicker={es.store.collectionsKicker}
        title={es.store.collectionsTitle}
        id="collections-title"
        aside={
          <a className={styles.viewAll} href={hrefFor({ name: 'catalog' })}>
            {es.store.viewAll}
            <span className={styles.viewAllLine} aria-hidden="true" />
          </a>
        }
      />
      <div className={styles.bento}>
        {es.store.collections.map((collection, index) => (
          <Reveal key={collection.slug} className={styles.tile} delay={index * 0.08}>
            <a className={styles.tileLink} href={hrefFor({ name: 'catalog', category: collection.slug })}>
              <img className={styles.tileImage} src={SCENES[collection.image]} alt="" loading="lazy" />
              <span className={styles.tileText}>
                <span className={styles.tileCount}>{es.store.items(counts.get(collection.slug) ?? 0)}</span>
                <span className={styles.tileName}>{collection.name}</span>
              </span>
              <span className={styles.tileArrow} aria-hidden="true">
                <Icon name="arrow-up-right" />
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function NewArrivals({ products, loading }: { products: ProductSummary[]; loading: boolean }) {
  const [filter, setFilter] = useState<string | null>(null);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    products.forEach((product) => seen.set(product.categorySlug, product.categoryName));
    return [...seen.entries()].sort((first, second) => first[1].localeCompare(second[1], 'es'));
  }, [products]);
  const visible = useMemo(
    () => products.filter((product) => !filter || product.categorySlug === filter).slice(0, ARRIVALS),
    [products, filter],
  );

  return (
    <section className={styles.section} aria-labelledby="arrivals-title">
      <SectionHead
        kicker={es.store.arrivalsKicker}
        title={es.store.arrivalsTitle}
        id="arrivals-title"
        aside={
          <div className={styles.chips} role="group" aria-label={es.store.filterLabel}>
            {[[null, es.store.filterAll] as const, ...categories].map(([slug, name]) => (
              <button
                key={slug ?? 'all'}
                type="button"
                className={styles.chip}
                aria-pressed={filter === slug}
                onClick={() => setFilter(slug)}
              >
                {filter === slug && (
                  <motion.span layoutId="chip-active" className={styles.chipActive} transition={{ duration: 0.35, ease: REVEAL_EASE }} />
                )}
                <span className={styles.chipLabel}>{name}</span>
              </button>
            ))}
          </div>
        }
      />
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: ARRIVALS }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <motion.ul layout className={styles.grid}>
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((product, index) => (
              <motion.li
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.45, ease: REVEAL_EASE, delay: Math.min(index, 7) * 0.035 }}
              >
                <ProductCard product={product} badge={index < NEW_BADGES ? es.store.newTag : undefined} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
      <div className={styles.center}>
        <a className={styles.pillLink} href={hrefFor({ name: 'catalog', category: filter ?? undefined })}>
          {es.store.seeCatalog}
          <Icon name="arrow-right" />
        </a>
      </div>
    </section>
  );
}

export function WhyUs() {
  return (
    <section className={styles.section} aria-labelledby="why-title">
      <div className={styles.whyHead}>
        <div>
          <p className={styles.kicker}>{es.store.whyKicker}</p>
          <h2 id="why-title" className={styles.title}>
            {es.store.whyTitle}
          </h2>
        </div>
        <p className={styles.whyBody}>{es.store.whyBody}</p>
      </div>
      <ul className={styles.whyGrid}>
        {es.store.why.map((item, index) => (
          <li key={item.title}>
            <Reveal className={styles.whyCard} delay={index * 0.08}>
              <span className={styles.whyNumber} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className={styles.whyIcon} aria-hidden="true">
                <Icon name={item.icon as IconName} />
              </span>
              <h3 className={styles.whyTitle}>{item.title}</h3>
              <p className={styles.whyText}>{item.body}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function JoinBanner() {
  const [email, setEmail] = useState('');

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate({ name: 'register', email: email.trim() || undefined });
  };

  return (
    <section className={styles.section} aria-labelledby="join-title">
      <Reveal className={styles.join}>
        <div className={styles.joinGlow} aria-hidden="true" />
        <h2 id="join-title" className={styles.joinTitle}>
          <span>{es.store.joinTitle}</span>
          <span className={styles.joinAccent}>{es.store.joinAccent}</span>
        </h2>
        <div className={styles.joinSide}>
          <p className={styles.joinPill}>
            <span className={styles.joinDot} aria-hidden="true" />
            {es.store.joinKicker}
          </p>
          <p className={styles.joinBody}>{es.store.joinBody}</p>
          <form className={styles.joinForm} onSubmit={submit}>
            <label className="visually-hidden" htmlFor="join-email">
              {es.store.joinLabel}
            </label>
            <input
              id="join-email"
              className={styles.joinInput}
              type="email"
              autoComplete="email"
              placeholder={es.store.joinPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button type="submit" className={styles.joinButton}>
              {es.store.joinCta}
              <Icon name="arrow-right" />
            </button>
          </form>
          <p className={styles.joinNote}>{es.store.joinNote}</p>
        </div>
      </Reveal>
    </section>
  );
}
