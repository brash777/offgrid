import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'motion/react';
import type { ProductSummary } from '../../api/catalog';
import { assetUrl } from '../../api/http';
import { hrefFor } from '../../app/router';
import { es } from '../../i18n/es';
import { studioPhoto } from '../../lib/studioPhotos';
import { ButtonLink } from '../Button';
import { Icon } from '../Icon';
import styles from './Hero.module.css';

interface Scene {
  photo: string;
  subject: string;
}

const SCENES = ['duo', 'varsity'].flatMap((name): Scene[] => {
  const photo = studioPhoto(`studio-${name}`);
  const subject = studioPhoto(`studio-${name}-subject`);
  return photo && subject ? [{ photo, subject }] : [];
});
const LOOKS = ['beanie', 'jacket', 'hoodie', 'kicks'].flatMap((name) => studioPhoto(`look-${name}`) ?? []);
const SCENE_MS = 6500;
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

const sceneVariants: Variants = {
  hidden: { opacity: 0, scale: 1.08 },
  shown: { opacity: 1, scale: 1, transition: { duration: 1.6, ease: EASE, delay: 0.1 } },
};

const SCENE_CHANGE = {
  initial: { opacity: 0, scale: 1.05 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.9, ease: EASE },
};

const sideVariants: Variants = {
  hidden: (side: number) => ({ opacity: 0, x: 48 * side }),
  shown: { opacity: 1, x: 0, transition: { duration: 0.9, ease: EASE, delay: 0.95 } },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE, delay: 1.1 } },
};

interface SceneLayerProps {
  layer: keyof Scene;
  index: number;
  show: string;
  x: MotionValue<number>;
  y: MotionValue<number>;
  front?: boolean;
}

function SceneLayer({ layer, index, show, x, y, front = false }: SceneLayerProps) {
  return (
    <motion.div className={front ? `${styles.scene} ${styles.front}` : styles.scene} style={{ x, y }} aria-hidden="true">
      <motion.div className={styles.sceneInner} variants={sceneVariants} initial="hidden" animate={show}>
        <AnimatePresence initial={false}>
          <motion.img
            key={index}
            className={styles.photo}
            src={SCENES[index][layer]}
            alt=""
            draggable={false}
            {...SCENE_CHANGE}
          />
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

interface HeroProps {
  ready: boolean;
  products: ProductSummary[];
}

export function Hero({ ready, products }: HeroProps) {
  const reduced = useReducedMotion();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [lookIndex, setLookIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, SPRING);
  const springY = useSpring(pointerY, SPRING);
  const titleX = useTransform(springX, (value) => value * -16);
  const titleY = useTransform(springY, (value) => value * -8);
  const sceneX = useTransform(springX, (value) => value * 14);
  const sceneY = useTransform(springY, (value) => value * 8);
  const floatX = useTransform(springX, (value) => value * 30);
  const floatY = useTransform(springY, (value) => value * 16);
  const glareX = useTransform(springX, (value) => `${50 + value * 45}%`);
  const glareY = useTransform(springY, (value) => `${value * 30}%`);
  const show = ready ? 'shown' : 'hidden';
  const avatars = products.filter((product) => product.thumbnailUrl).slice(0, 3);

  useEffect(() => {
    if (!ready || reduced || SCENES.length < 2) {
      return undefined;
    }
    const timer = window.setInterval(() => setSceneIndex((index) => (index + 1) % SCENES.length), SCENE_MS);
    return () => window.clearInterval(timer);
  }, [ready, reduced]);

  useEffect(() => {
    if (!playing || reduced || LOOKS.length < 2) {
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
    <section
      className={styles.hero}
      data-surface="ink"
      aria-labelledby="hero-title"
      onPointerMove={trackPointer}
      onPointerLeave={resetPointer}
      style={{ '--glare-x': glareX, '--glare-y': glareY } as unknown as CSSProperties}
    >
      {SCENES.length > 0 && <SceneLayer layer="photo" index={sceneIndex} show={show} x={sceneX} y={sceneY} />}

      <motion.h1 id="hero-title" className={styles.title} style={{ x: titleX, y: titleY }}>
        <span className={styles.line}>
          <motion.span
            className={`${styles.lineInner} ${styles.chrome}`}
            variants={lineVariants}
            custom={0.1}
            initial="hidden"
            animate={show}
          >
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

      {SCENES.length > 0 && <SceneLayer layer="subject" index={sceneIndex} show={show} x={sceneX} y={sceneY} front />}

      <motion.aside
        className={styles.statCard}
        style={{ x: floatX, y: floatY }}
        aria-label={es.store.heroCardBody}
      >
        <motion.div
          className={`${styles.glass} ${styles.cardInner}`}
          variants={sideVariants}
          custom={-1}
          initial="hidden"
          animate={show}
        >
          <div className={styles.avatars} aria-hidden="true">
            {avatars.map((product) => (
              <span key={product.id} className={styles.avatar}>
                <img src={assetUrl(product.thumbnailUrl) ?? ''} alt="" />
              </span>
            ))}
            {products.length > 0 && <span className={styles.avatarCount}>{es.store.heroCardCount(products.length)}</span>}
          </div>
          <p className={styles.cardText}>{es.store.heroCardBody}</p>
        </motion.div>
      </motion.aside>

      {LOOKS.length > 0 && (
        <motion.div className={styles.lookbook} style={{ x: floatX, y: floatY }}>
          <motion.div
            className={`${styles.glass} ${styles.lookFrame}`}
            variants={sideVariants}
            custom={1}
            initial="hidden"
            animate={show}
          >
            <div className={styles.lookInner}>
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
            </div>
          </motion.div>
        </motion.div>
      )}

      <motion.div className={`${styles.glass} ${styles.ctas}`} variants={riseVariants} initial="hidden" animate={show}>
        <ButtonLink href={hrefFor({ name: 'catalog' })} size="lg" variant="accent">
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
