import { useCallback, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ProductSummary } from '../api/catalog';
import { hrefFor } from '../app/router';
import { es } from '../i18n/es';
import { garmentFor, type GarmentKind } from '../lib/garments';
import { ButtonLink } from './Button';
import { BrandLogo } from './BrandLogo';
import { GarmentArt } from './garment/GarmentArt';
import { Icon } from './Icon';
import styles from './Hero.module.css';

interface HeroScene {
  tone: 'red' | 'night' | 'navy';
  kind: GarmentKind;
  preferredColor: string;
  fallbackHex: string;
}

const SCENES: readonly HeroScene[] = [
  { tone: 'red', kind: 'bomber', preferredColor: 'Negro', fallbackHex: '#1a1a1a' },
  { tone: 'night', kind: 'windbreaker', preferredColor: 'Verde Neón', fallbackHex: '#39ff14' },
  { tone: 'navy', kind: 'denim', preferredColor: 'Azul', fallbackHex: '#3b6ea5' },
];

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
const ART_ENTER = 'translateY(56px) scale(0.92) rotate(-5deg)';
const ART_REST = 'translateY(0px) scale(1) rotate(0deg)';
const ART_EXIT = 'translateY(-36px) scale(1.04) rotate(3deg)';

const pad = (value: number) => String(value).padStart(2, '0');

export function Hero({ products }: { products: ProductSummary[] }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const goTo = useCallback((next: number) => setIndex((next + SCENES.length) % SCENES.length), []);

  const handleKey = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') {
      goTo(index + 1);
    } else if (event.key === 'ArrowLeft') {
      goTo(index - 1);
    }
  };

  const scenes = SCENES.map((scene) => {
    const product = products.find((item) => garmentFor(item.name, item.categorySlug).kind === scene.kind);
    const color = product?.colors.find((option) => option.name === scene.preferredColor) ?? product?.colors[0];
    return { ...scene, product, hex: color?.hex ?? scene.fallbackHex };
  });

  const scene = scenes[index];
  const copy = es.hero.slides[index];
  const ctaHref =
    index === 0 || !scene.product ? hrefFor({ name: 'catalog' }) : hrefFor({ name: 'product', id: scene.product.id });
  const progressPaused = paused || hovered;
  const announce = paused || reducedMotion ? 'polite' : 'off';

  return (
    <section
      className={styles.hero}
      data-surface="hero"
      data-tone={scene.tone}
      aria-roledescription={es.common.carousel}
      aria-label={es.hero.label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onKeyDown={handleKey}
    >
      {scenes.map((item, sceneIndex) => (
        <div
          key={item.tone}
          className={`${styles.scene} ${styles[item.tone]}`}
          data-active={sceneIndex === index || undefined}
          aria-hidden="true"
        >
          <span className={styles.backdropWord}>{es.hero.slides[sceneIndex].backdrop}</span>
        </div>
      ))}

      <div className={styles.stage} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={scene.tone}
            className={styles.art}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: ART_ENTER }}
            animate={reducedMotion ? { opacity: 1 } : { opacity: 1, transform: ART_REST }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, transform: ART_EXIT }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          >
            <div className={styles.float}>
              <GarmentArt kind={scene.kind} color={scene.hex} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.logo}>
        <BrandLogo />
      </div>

      <div className={styles.copy} aria-live={announce}>
        <h1 key={copy.title} className={styles.title}>
          {copy.title}
        </h1>
        <ButtonLink href={ctaHref} size="lg">
          {copy.cta}
        </ButtonLink>
      </div>

      <div className={styles.controls}>
        <p className={styles.counter} aria-label={es.common.slide(index + 1, SCENES.length)}>
          <span className={styles.current}>{pad(index + 1)}</span> / {pad(SCENES.length)}
        </p>
        <span className={styles.progress} aria-hidden="true">
          {!reducedMotion && (
            <span
              key={index}
              className={styles.progressBar}
              data-paused={progressPaused || undefined}
              onAnimationEnd={() => goTo(index + 1)}
            />
          )}
        </span>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.control}
            aria-label={es.hero.previous}
            onClick={() => goTo(index - 1)}
          >
            <Icon name="arrow-left" />
          </button>
          <button
            type="button"
            className={styles.control}
            aria-label={paused ? es.common.resume : es.common.pause}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            <Icon name={paused ? 'play' : 'pause'} />
          </button>
          <button type="button" className={styles.control} aria-label={es.hero.next} onClick={() => goTo(index + 1)}>
            <Icon name="arrow-right" />
          </button>
        </div>
      </div>
    </section>
  );
}
