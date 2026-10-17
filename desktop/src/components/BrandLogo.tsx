import { useId, type CSSProperties } from 'react';
import { useReducedMotionConfig } from 'motion/react';
import { BRAND_NAME, BRAND_TAGLINE } from '../brand';
import styles from './BrandLogo.module.css';

export type LogoVariant = 'lockup' | 'wordmark';

interface BrandLogoProps {
  variant?: LogoVariant;
  spin?: boolean;
  className?: string;
}

const GLOBE = { cx: 436, cy: 212, rx: 214, ry: 150 };
const WORD = { x: 432, baseline: 262, width: 605, fontSize: 104 };
const TAGLINE = { baseline: 420, width: 428 };
const STAR = { x: 690, y: 108 };
const REGISTERED = { x: 772, y: 196, r: 8 };
const LATITUDE_OFFSETS = [28, 56, 84, 114, 138];
const MERIDIAN_COUNT = 10;
const MERIDIAN_STEP_DEGREES = 180 / MERIDIAN_COUNT;
const SPIN_SECONDS = 18;

const VIEW_BOXES: Record<LogoVariant, string> = {
  lockup: '116 50 680 384',
  wordmark: '118 178 672 96',
};

const STAR_PATH = 'M0 -44 C4 -10 8 -6 30 0 C8 6 4 10 0 44 C-4 10 -8 6 -30 0 C-8 -6 -4 -10 0 -44 Z';

const meridianPhases = Array.from({ length: MERIDIAN_COUNT }, (_, index) => index * MERIDIAN_STEP_DEGREES);

const staticMeridianWidths = [
  ...new Set(meridianPhases.map((phase) => Math.abs(Math.cos((phase * Math.PI) / 180)).toFixed(3))),
]
  .map(Number)
  .filter((width) => width < 0.99);

function latitudeHalfWidth(offset: number): number {
  return GLOBE.rx * Math.sqrt(1 - (offset / GLOBE.ry) ** 2);
}

function Globe({ spin }: { spin: boolean }) {
  return (
    <g className={styles.globe}>
      <ellipse cx={GLOBE.cx} cy={GLOBE.cy} rx={GLOBE.rx} ry={GLOBE.ry} />
      {LATITUDE_OFFSETS.flatMap((offset) =>
        [-1, 1].map((side) => {
          const halfWidth = latitudeHalfWidth(offset);
          const y = GLOBE.cy + side * offset;
          return <line key={`${offset}-${side}`} x1={GLOBE.cx - halfWidth} x2={GLOBE.cx + halfWidth} y1={y} y2={y} />;
        }),
      )}
      {spin
        ? meridianPhases.map((phase) => (
            <ellipse
              key={phase}
              className={styles.meridian}
              cx={GLOBE.cx}
              cy={GLOBE.cy}
              rx={GLOBE.rx}
              ry={GLOBE.ry}
              style={{ animationDelay: `${(-phase / 180) * SPIN_SECONDS}s` }}
            />
          ))
        : staticMeridianWidths.map((width) =>
            width === 0 ? (
              <line key={width} x1={GLOBE.cx} x2={GLOBE.cx} y1={GLOBE.cy - GLOBE.ry} y2={GLOBE.cy + GLOBE.ry} />
            ) : (
              <ellipse key={width} cx={GLOBE.cx} cy={GLOBE.cy} rx={GLOBE.rx * width} ry={GLOBE.ry} />
            ),
          )}
    </g>
  );
}

export function BrandLogo({ variant = 'lockup', spin = false, className }: BrandLogoProps) {
  const uid = useId().replaceAll(':', '');
  const reducedMotion = useReducedMotionConfig();
  const ids = { gap: `logo-gap-${uid}`, wear: `logo-wear-${uid}` };
  const lockup = variant === 'lockup';

  const wordProps = {
    x: WORD.x,
    y: WORD.baseline,
    textAnchor: 'middle' as const,
    textLength: WORD.width,
    lengthAdjust: 'spacingAndGlyphs' as const,
    fontSize: WORD.fontSize,
    className: styles.word,
  };

  const artwork = (
    <svg className={styles.layer} viewBox={VIEW_BOXES[variant]} aria-hidden="true" focusable="false">
      <defs>
        <filter id={ids.wear} x="-5%" y="-30%" width="110%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feColorMatrix
            in="noise"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  9 0 0 0 -6.3"
            result="specks"
          />
          <feComposite in="SourceGraphic" in2="specks" operator="out" />
        </filter>
      </defs>
      <text {...wordProps} filter={`url(#${ids.wear})`}>
        {BRAND_NAME}
      </text>
      <g className={styles.registered}>
        <circle cx={REGISTERED.x} cy={REGISTERED.y} r={REGISTERED.r} />
        <text x={REGISTERED.x} y={REGISTERED.y + 3.6} textAnchor="middle">
          R
        </text>
      </g>
      {lockup && (
        <>
          <path d={STAR_PATH} transform={`translate(${STAR.x} ${STAR.y})`} className={styles.star} />
          <text
            className={styles.tagline}
            x={GLOBE.cx}
            y={TAGLINE.baseline}
            textAnchor="middle"
            textLength={TAGLINE.width}
            lengthAdjust="spacing"
          >
            {BRAND_TAGLINE}
          </text>
        </>
      )}
    </svg>
  );

  return (
    <span
      className={[styles.logo, className].filter(Boolean).join(' ')}
      style={{ '--logo-spin-duration': `${SPIN_SECONDS}s` } as CSSProperties}
      role="img"
      aria-label={lockup ? `${BRAND_NAME}. ${BRAND_TAGLINE}` : BRAND_NAME}
    >
      {lockup && (
        <svg className={styles.globeLayer} viewBox={VIEW_BOXES[variant]} aria-hidden="true" focusable="false">
          <defs>
            <mask id={ids.gap} maskUnits="userSpaceOnUse" x="0" y="0" width="900" height="500">
              <rect width="900" height="500" className={styles.maskShow} />
              <text {...wordProps} className={`${styles.word} ${styles.maskHide}`}>
                {BRAND_NAME}
              </text>
            </mask>
          </defs>
          <g mask={`url(#${ids.gap})`}>
            <Globe spin={spin && !reducedMotion} />
          </g>
        </svg>
      )}
      {artwork}
    </span>
  );
}
