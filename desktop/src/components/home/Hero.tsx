import { useEffect, useState, type PointerEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from 'motion/react';
import type { ProductSummary } from '../../api/catalog';
import { assetUrl } from '../../api/http';
import { hrefFor } from '../../app/router';
import lookCamel from '../../assets/home/scene-look-camel.webp';
import lookCap from '../../assets/home/scene-look-cap.webp';
import lookMilan from '../../assets/home/scene-look-milan.webp';
import lookYellow from '../../assets/home/scene-look-yellow.webp';
import modelCamel from '../../assets/home/model-camel-jacket.webp';
import modelPink from '../../assets/home/model-pink-sweatshirt.webp';
import modelYellow from '../../assets/home/model-yellow-tracksuit.webp';
import { es } from '../../i18n/es';
import { ButtonLink } from '../Button';
import { Icon } from '../Icon';
import styles from './Hero.module.css';

const MODELS = [modelYellow, modelCamel, modelPink];
const LOOKS = [lookYellow, lookCap, lookMilan, lookCamel];
const MODEL_MS = 5200;
const LOOK_MS = 2600;
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const SPRING = { stiffness: 90, damping: 18, mass: 0.6 };

const lineVariants: Variants = {
  hidden: { y: '110%' },
  shown: (delay: number) => ({ y: '0%', transition: { duration: 1, ease: EASE, delay } }),
};

const markerVariants: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.8, ease: EASE, delay: 0.55 } },
};

const stageVariants: Variants = {
  hidden: { opacity: 0, y: 90, scale: 0.94 },
  shown: { opacity: 1, y: 0, scale: 1, transition: { duration: 1.2, ease: EASE, delay: 0.35 } },
};

const sideVariants: Variants = {
  hidden: (side: number) => ({ opacity: 0, x: 48 * side }),
  shown: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE, delay: 0.95 } },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: 1.1 } },
};

interface HeroProps {
  ready: boolean;
  products: ProductSummary[];
}

export function Hero({ ready, products }: HeroProps) {
  const reduced = useReducedMotion();
  const [modelIndex, setModelIndex] = useState(0);
  const [lookIndex, setLookIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, SPRING);
  const springY = useSpring(pointerY, SPRING);
  const titleX = useTransform(springX, (value) => value * -16);
  const titleY = useTransform(springY, (value) => value * -8);
  const modelX = useTransform(springX, (value) => value * 22);
  const modelY = useTransform(springY, (value) => value * 10);
  const floatX = useTransform(springX, (value) => value * 34);
  const floatY = useTransform(springY, (value) => value * 18);
  const show = ready ? 'shown' : 'hidden';
  const avatars = products.filter((product) => product.thumbnailUrl).slice(0, 3);

  useEffect(() => {
    if (!ready || reduced) {
      return undefined;
    }
    const timer = window.setInterval(() => setModelIndex((index) => (index + 1) % MODELS.length), MODEL_MS);
    return () => window.clearInterval(timer);
  }, [ready, reduced]);

  useEffect(() => {
    if (!playing || reduced) {
      return undefined;
    }
    const timer = window.setInterval(() => setLookIndex((index) => (index + 1) % LOOKS.length), LOOK_MS);
    return () => window.clearInterval(timer);
  }, [playing, reduced]);

  const trackPointer = (event: PointerEvent<HTMLElement>) => {
    if (reduced || event.pointerType !== 'mouse') {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 2);
  };

  const resetPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <section className={styles.hero} aria-labelledby="hero-title" onPointerMove={trackPointer} onPointerLeave={resetPointer}>
      <div className={styles.glow} aria-hidden="true" />

      <motion.h1 id="hero-title" className={styles.title} style={{ x: titleX, y: titleY }}>
        <span className={styles.line}>
          <motion.span className={styles.lineInner} variants={lineVariants} custom={0.1} initial="hidden" animate={show}>
            {es.store.heroTitle}
          </motion.span>
        </span>
        <span className={styles.line}>
          <motion.span className={styles.lineInner} variants={lineVariants} custom={0.22} initial="hidden" animate={show}>
            <span className={styles.marked}>
              <motion.span className={styles.marker} variants={markerVariants} initial="hidden" animate={show} />
              <span className={styles.markedText}>{es.store.heroAccent}</span>
            </span>
          </motion.span>
        </span>
      </motion.h1>

      <motion.div className={styles.stage} style={{ x: modelX, y: modelY }} aria-hidden="true">
        <motion.div className={styles.stageInner} variants={stageVariants} initial="hidden" animate={show}>
          <AnimatePresence initial={false}>
            <motion.img
              key={modelIndex}
              className={styles.model}
              src={MODELS[modelIndex]}
              alt=""
              draggable={false}
              initial={{ opacity: 0, y: 50, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -24, scale: 1.02 }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <motion.aside
        className={styles.statCard}
        style={{ x: floatX, y: floatY }}
        aria-label={es.store.heroCardBody}
      >
        <motion.div className={styles.cardInner} variants={sideVariants} custom={-1} initial="hidden" animate={show}>
          <div className={styles.avatars} aria-hidden="true">
            {avatars.map((product) => (
              <span key={product.id} className={styles.avatar}>
                <img src={assetUrl(product.thumbnailUrl) ?? ''} alt="" />
              </span>
            ))}
            <span className={styles.avatarCount}>{es.store.heroCardCount(products.length)}</span>
          </div>
          <p className={styles.cardText}>{es.store.heroCardBody}</p>
        </motion.div>
      </motion.aside>

      <motion.div className={styles.lookbook} style={{ x: floatX, y: floatY }}>
        <motion.div className={styles.lookInner} variants={sideVariants} custom={1} initial="hidden" animate={show}>
          {LOOKS.map((look, index) => (
            <img
              key={look}
              className={styles.look}
              src={look}
              alt=""
              data-active={index === lookIndex || undefined}
              data-playing={playing || undefined}
              draggable={false}
            />
          ))}
          <span className={styles.lookLabel}>{es.store.lookbook}</span>
          <button
            type="button"
            className={styles.lookButton}
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? es.store.lookbookPause : es.store.lookbookPlay}
            aria-pressed={!playing}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <span className={styles.lookProgress} aria-hidden="true">
            {LOOKS.map((look, index) => (
              <span key={look} data-active={index === lookIndex || undefined} />
            ))}
          </span>
        </motion.div>
      </motion.div>

      <motion.div className={styles.ctas} variants={riseVariants} initial="hidden" animate={show}>
        <ButtonLink href={hrefFor({ name: 'catalog' })} size="lg">
          {es.store.shopNow}
        </ButtonLink>
        <ButtonLink href={hrefFor({ name: 'catalog' })} size="lg" variant="secondary">
          {es.store.exploreAll}
          <Icon name="arrow-up-right" />
        </ButtonLink>
      </motion.div>
    </section>
  );
}
