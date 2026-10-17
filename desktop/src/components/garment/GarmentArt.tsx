import { useId, useMemo, type ReactElement } from 'react';
import type { GarmentKind, GarmentPrint } from '../../lib/garments';
import { Chain, Glasses, Backpack, Snapback, Trucker } from './accessories';
import { CargoPants, Jeans, Jogger, Shorts } from './bottoms';
import { Boot, Sandal, Sneaker } from './footwear';
import { CANVAS_HEIGHT, CANVAS_WIDTH, KitProvider, type GarmentIds } from './kit';
import { Bomber, DenimJacket, Windbreaker } from './outerwear';
import { LongSleeve, Tee } from './tops';
import styles from './GarmentArt.module.css';

interface GarmentArtProps {
  kind: GarmentKind;
  color: string;
  print?: GarmentPrint;
  className?: string;
}

interface Floor {
  cx: number;
  cy: number;
  rx: number;
}

const FLOORS: Record<GarmentKind, Floor> = {
  tee: { cx: 200, cy: 448, rx: 120 },
  longsleeve: { cx: 200, cy: 448, rx: 130 },
  bomber: { cx: 200, cy: 446, rx: 140 },
  denim: { cx: 200, cy: 446, rx: 140 },
  windbreaker: { cx: 200, cy: 446, rx: 140 },
  jeans: { cx: 200, cy: 466, rx: 110 },
  cargo: { cx: 200, cy: 464, rx: 110 },
  jogger: { cx: 200, cy: 464, rx: 90 },
  shorts: { cx: 200, cy: 356, rx: 120 },
  sneaker: { cx: 204, cy: 358, rx: 170 },
  boot: { cx: 194, cy: 414, rx: 160 },
  sandal: { cx: 204, cy: 386, rx: 160 },
  cap: { cx: 190, cy: 372, rx: 150 },
  trucker: { cx: 190, cy: 372, rx: 150 },
  chain: { cx: 200, cy: 430, rx: 0 },
  glasses: { cx: 200, cy: 300, rx: 140 },
  backpack: { cx: 200, cy: 448, rx: 120 },
};

function drawingFor(kind: GarmentKind, print?: GarmentPrint): ReactElement {
  switch (kind) {
    case 'tee':
      return <Tee print={print} />;
    case 'longsleeve':
      return <LongSleeve />;
    case 'bomber':
      return <Bomber />;
    case 'denim':
      return <DenimJacket />;
    case 'windbreaker':
      return <Windbreaker />;
    case 'jeans':
      return <Jeans />;
    case 'cargo':
      return <CargoPants />;
    case 'jogger':
      return <Jogger />;
    case 'shorts':
      return <Shorts />;
    case 'sneaker':
      return <Sneaker />;
    case 'boot':
      return <Boot />;
    case 'sandal':
      return <Sandal />;
    case 'cap':
      return <Snapback />;
    case 'trucker':
      return <Trucker />;
    case 'chain':
      return <Chain />;
    case 'glasses':
      return <Glasses />;
    case 'backpack':
      return <Backpack />;
  }
}

function buildIds(uid: string): GarmentIds {
  const id = (name: string) => `garment-${name}-${uid}`;
  return {
    grain: id('grain'),
    lighting: id('lighting'),
    metal: id('metal'),
    sheen: id('sheen'),
    lens: id('lens'),
    shadowBlur: id('shadow'),
    blur: { tight: id('blur-tight'), soft: id('blur-soft'), wide: id('blur-wide') },
    textures: {
      twill: id('twill'),
      rib: id('rib'),
      waffle: id('waffle'),
      ripstop: id('ripstop'),
      mesh: id('mesh'),
      webbing: id('webbing'),
    },
  };
}

const FILTER_BLEED = 40;

const CANVAS = {
  x: -FILTER_BLEED,
  y: -FILTER_BLEED,
  width: CANVAS_WIDTH + FILTER_BLEED * 2,
  height: CANVAS_HEIGHT + FILTER_BLEED * 2,
  filterUnits: 'userSpaceOnUse',
} as const;

function Definitions({ ids }: { ids: GarmentIds }) {
  return (
    <defs>
      <filter id={ids.grain} {...CANVAS}>
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" seed="11" result="noise" />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2 0 0 0 -0.07"
          result="darkGrain"
        />
        <feColorMatrix
          in="noise"
          type="matrix"
          values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0.1 0 0 -0.04"
          result="lightGrain"
        />
        <feMerge result="grain">
          <feMergeNode in="darkGrain" />
          <feMergeNode in="lightGrain" />
        </feMerge>
        <feComposite in="grain" in2="SourceAlpha" operator="in" result="grainInside" />
        <feMerge>
          <feMergeNode in="SourceGraphic" />
          <feMergeNode in="grainInside" />
        </feMerge>
      </filter>
      <filter id={ids.blur.tight} {...CANVAS}>
        <feGaussianBlur stdDeviation="1.6" />
      </filter>
      <filter id={ids.blur.soft} {...CANVAS}>
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id={ids.blur.wide} {...CANVAS}>
        <feGaussianBlur stdDeviation="16" />
      </filter>
      <filter id={ids.shadowBlur} x="-20%" y="-20%" width="140%" height="160%">
        <feDropShadow
          dx="0"
          dy="6"
          stdDeviation="5"
          style={{ floodColor: 'var(--palette-black)', floodOpacity: 0.35 }}
        />
      </filter>
      <linearGradient id={ids.lighting} gradientUnits="userSpaceOnUse" x1="60" y1="30" x2="360" y2="470">
        <stop offset="0" style={{ stopColor: 'var(--palette-white)' }} stopOpacity="0.18" />
        <stop offset="0.42" style={{ stopColor: 'var(--palette-white)' }} stopOpacity="0" />
        <stop offset="0.7" style={{ stopColor: 'var(--palette-black)' }} stopOpacity="0" />
        <stop offset="1" style={{ stopColor: 'var(--palette-black)' }} stopOpacity="0.26" />
      </linearGradient>
      <linearGradient id={ids.metal} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--palette-chrome-100)' }} />
        <stop offset="0.35" style={{ stopColor: 'var(--palette-chrome-400)' }} />
        <stop offset="0.55" style={{ stopColor: 'var(--palette-chrome-200)' }} />
        <stop offset="0.8" style={{ stopColor: 'var(--palette-chrome-700)' }} />
        <stop offset="1" style={{ stopColor: 'var(--palette-chrome-200)' }} />
      </linearGradient>
      <linearGradient id={ids.sheen} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--palette-white)' }} stopOpacity="0.8" />
        <stop offset="0.35" style={{ stopColor: 'var(--palette-white)' }} stopOpacity="0" />
        <stop offset="0.6" style={{ stopColor: 'var(--palette-black)' }} stopOpacity="0.45" />
        <stop offset="0.92" style={{ stopColor: 'var(--palette-white)' }} stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id={ids.lens} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" style={{ stopColor: 'var(--palette-violet-300)' }} stopOpacity="0.5" />
        <stop offset="0.5" style={{ stopColor: 'var(--palette-teal-300)' }} stopOpacity="0.3" />
        <stop offset="1" style={{ stopColor: 'var(--palette-amber-400)' }} stopOpacity="0.4" />
      </linearGradient>
      <pattern
        id={ids.textures.twill}
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(-35)"
      >
        <rect width="5" height="1.6" style={{ fill: 'var(--palette-black)' }} opacity="0.09" />
        <rect y="2.6" width="5" height="1" style={{ fill: 'var(--palette-white)' }} opacity="0.07" />
      </pattern>
      <pattern id={ids.textures.rib} width="4" height="4" patternUnits="userSpaceOnUse">
        <rect width="1.6" height="4" style={{ fill: 'var(--palette-black)' }} opacity="0.2" />
        <rect x="2.2" width="0.8" height="4" style={{ fill: 'var(--palette-white)' }} opacity="0.08" />
      </pattern>
      <pattern id={ids.textures.waffle} width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 0.5 H6 M0.5 0 V6" style={{ stroke: 'var(--palette-black)' }} strokeOpacity="0.12" />
      </pattern>
      <pattern id={ids.textures.ripstop} width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M0 0.5 H10 M0.5 0 V10" style={{ stroke: 'var(--palette-black)' }} strokeOpacity="0.08" />
      </pattern>
      <pattern id={ids.textures.mesh} width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.5" style={{ fill: 'var(--palette-black)' }} opacity="0.4" />
      </pattern>
      <pattern id={ids.textures.webbing} width="4" height="3" patternUnits="userSpaceOnUse">
        <rect width="4" height="1" style={{ fill: 'var(--palette-black)' }} opacity="0.22" />
      </pattern>
    </defs>
  );
}

export function GarmentArt({ kind, color, print, className }: GarmentArtProps) {
  const uid = useId().replaceAll(':', '');
  const ids = useMemo(() => buildIds(uid), [uid]);
  const kit = useMemo(() => ({ color, ids }), [color, ids]);
  const floor = FLOORS[kind];

  return (
    <svg
      className={[styles.art, className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      aria-hidden="true"
      focusable="false"
    >
      <Definitions ids={ids} />
      {floor.rx > 0 && (
        <g filter={`url(#${ids.blur.wide})`}>
          <ellipse className={styles.shadow} cx={floor.cx} cy={floor.cy} rx={floor.rx} ry={14} />
        </g>
      )}
      {floor.rx > 0 && (
        <g filter={`url(#${ids.blur.soft})`}>
          <ellipse className={styles.shadow} cx={floor.cx} cy={floor.cy - 4} rx={floor.rx * 0.7} ry={6} />
        </g>
      )}
      <KitProvider value={kit}>
        <g filter={`url(#${ids.grain})`}>{drawingFor(kind, print)}</g>
      </KitProvider>
    </svg>
  );
}
