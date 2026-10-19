import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ColorOption } from '../api/catalog';
import { assetUrl } from '../api/http';
import { relativeLuminance } from '../lib/color';
import styles from './ProductPhoto.module.css';

const LIGHT_PHOTO = 0.55;
const WAVE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface Wave {
  id: number;
  hex: string;
}

interface ProductPhotoProps {
  src: string | null;
  alt: string;
  photoColor: string | null;
  colors: ColorOption[];
  activeColor: string | null;
  className?: string;
  eager?: boolean;
}

function blendFor(colors: ColorOption[], photoColor: string | null): 'multiply' | 'color' {
  const photo = colors.find((color) => color.name === photoColor);
  return photo && relativeLuminance(photo.hex) > LIGHT_PHOTO ? 'multiply' : 'color';
}

export function ProductPhoto({ src, alt, photoColor, colors, activeColor, className, eager }: ProductPhotoProps) {
  const url = assetUrl(src);
  const tinted = Boolean(activeColor && photoColor && activeColor !== photoColor);
  const target = colors.find((color) => color.name === activeColor);
  const [waves, setWaves] = useState<Wave[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (!tinted || !target) {
      const timer = window.setTimeout(() => setWaves([]), 450);
      return () => window.clearTimeout(timer);
    }
    counter.current += 1;
    const wave = { id: counter.current, hex: target.hex };
    setWaves((current) => [...current.slice(-1), wave]);
  }, [tinted, target?.hex]);

  if (!url) {
    return <div className={[styles.photo, className].filter(Boolean).join(' ')} />;
  }

  const maskStyle = {
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
  } as CSSProperties;

  return (
    <div className={[styles.photo, className].filter(Boolean).join(' ')}>
      <div className={styles.frame}>
        <img className={styles.image} src={url} alt={alt} loading={eager ? 'eager' : 'lazy'} draggable={false} />
        <div
          className={styles.tint}
          style={{ ...maskStyle, mixBlendMode: blendFor(colors, photoColor) }}
          data-visible={tinted || undefined}
          aria-hidden="true"
        >
          <AnimatePresence initial={false}>
            {waves.map((wave) => (
              <motion.span
                key={wave.id}
                className={styles.wave}
                style={{ background: wave.hex, x: '-50%', y: '-50%' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.5 } }}
                transition={{ duration: 0.95, ease: WAVE_EASE }}
              />
            ))}
          </AnimatePresence>
        </div>
        <div className={styles.shine} style={maskStyle} key={`shine-${activeColor}`} aria-hidden="true" />
      </div>
    </div>
  );
}
