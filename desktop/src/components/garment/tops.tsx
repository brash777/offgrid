import { BRAND_NAME } from '../../brand';
import type { GarmentPrint } from '../../lib/garments';
import { Light, Part, Rib, Seam, Shade, Stitch } from './kit';
import styles from './GarmentArt.module.css';

const NECK_INSIDE = 'M170 70 C184 60 216 60 230 70 C220 90 180 90 170 70 Z';
const NECK_FRONT = 'M168 70 C178 94 222 94 232 70';
const NECK_BACK = 'M172 69 C186 61 214 61 228 69';

const TEE_BODY =
  'M168 70 C150 76 128 84 112 92 C88 116 64 146 46 176 L96 210 C110 200 116 190 122 178 C124 260 118 360 114 428 Q200 440 286 428 C282 360 276 260 278 178 C284 190 290 200 304 210 L354 176 C336 146 312 116 288 92 C272 84 250 76 232 70 C222 94 178 94 168 70 Z';

const LONGSLEEVE_BODY =
  'M168 70 C150 76 128 84 112 92 C88 150 62 270 40 382 L78 392 C94 300 110 232 124 184 C124 260 118 360 114 428 Q200 440 286 428 C282 360 276 260 276 184 C290 232 306 300 322 392 L360 382 C338 270 312 150 288 92 C272 84 250 76 232 70 C222 94 178 94 168 70 Z';

const PRINT_WIDTH = 128;

const SPARKLE = 'M0 -40 C4 -8 8 -4 40 0 C8 4 4 8 0 40 C-4 8 -8 4 -40 0 C-8 -4 -4 -8 0 -40 Z';

function Neckline() {
  return (
    <>
      <Part d={NECK_INSIDE}>
        <Shade d={NECK_INSIDE} opacity={0.5} blur="tight" />
      </Part>
      <Rib d={NECK_BACK} width={6} />
      <Rib d={NECK_FRONT} width={9} />
    </>
  );
}

function Print({ print }: { print: GarmentPrint }) {
  if (print === 'wordmark') {
    return (
      <g transform="translate(200 186)">
        <text
          className={styles.printText}
          textAnchor="middle"
          textLength={PRINT_WIDTH}
          lengthAdjust="spacingAndGlyphs"
          style={{ fill: 'var(--palette-ink-950)' }}
          y={3}
        >
          {BRAND_NAME}
        </text>
        <text
          className={styles.printText}
          textAnchor="middle"
          textLength={PRINT_WIDTH}
          lengthAdjust="spacingAndGlyphs"
          style={{ fill: 'var(--palette-paper-50)' }}
        >
          {BRAND_NAME}
        </text>
      </g>
    );
  }
  return (
    <g>
      <g transform="translate(200 196) scale(1.3)" style={{ fill: 'var(--palette-neon-pink)' }}>
        <path d={SPARKLE} />
      </g>
      <g transform="translate(152 150) scale(0.42)" style={{ fill: 'var(--palette-neon-lime)' }}>
        <path d={SPARKLE} />
      </g>
      <g transform="translate(250 246) scale(0.55)" style={{ fill: 'var(--palette-neon-lime)' }}>
        <path d={SPARKLE} />
      </g>
      <g transform="translate(246 136) scale(0.26)" style={{ fill: 'var(--palette-paper-50)' }}>
        <path d={SPARKLE} />
      </g>
    </g>
  );
}

function TorsoShading() {
  return (
    <>
      <Shade d="M200 96 C188 98 176 100 170 104 C186 112 214 112 230 104 C224 100 212 98 200 96 Z" opacity={0.3} />
      <Shade d="M122 186 C132 240 138 300 134 390" width={18} opacity={0.15} />
      <Shade d="M278 186 C268 240 262 300 266 390" width={18} opacity={0.15} />
      <Shade d="M128 204 C150 232 168 256 178 298" width={8} opacity={0.1} />
      <Shade d="M272 204 C250 232 232 256 222 298" width={8} opacity={0.1} />
      <Shade d="M118 426 Q200 436 282 426" width={10} opacity={0.14} />
      <Light d="M152 118 C142 186 150 262 160 336" width={44} opacity={0.12} blur="wide" />
      <Light d="M250 130 C258 190 252 262 244 322" width={24} opacity={0.07} blur="wide" />
    </>
  );
}

export function Tee({ print }: { print?: GarmentPrint }) {
  return (
    <>
      <Part d={TEE_BODY}>
        <TorsoShading />
        <Shade d="M112 96 C96 124 78 150 62 176" width={12} opacity={0.14} />
        <Shade d="M288 96 C304 124 322 150 338 176" width={12} opacity={0.14} />
        <Light d="M96 112 C84 128 72 146 60 166" width={10} opacity={0.12} />
        {print && <Print print={print} />}
        <Seam d="M112 92 C120 120 124 150 122 178" />
        <Seam d="M288 92 C280 120 276 150 278 178" />
        <Stitch d="M53 170 L101 202" />
        <Stitch d="M347 170 L299 202" />
        <Stitch d="M117 418 Q200 429 283 418" />
      </Part>
      <Neckline />
    </>
  );
}

export function LongSleeve() {
  return (
    <>
      <Part d={LONGSLEEVE_BODY} texture="waffle">
        <TorsoShading />
        <Light d="M102 112 C84 190 68 280 54 364" width={12} opacity={0.12} />
        <Light d="M298 112 C316 190 332 280 346 364" width={8} opacity={0.07} />
        <Shade d="M72 252 C80 258 90 262 100 260" width={6} opacity={0.2} blur="tight" />
        <Shade d="M66 284 C76 292 88 296 98 292" width={5} opacity={0.18} blur="tight" />
        <Shade d="M328 252 C320 258 310 262 300 260" width={6} opacity={0.2} blur="tight" />
        <Shade d="M334 284 C324 292 312 296 302 292" width={5} opacity={0.18} blur="tight" />
        <Seam d="M112 92 C120 122 124 152 124 184" />
        <Seam d="M288 92 C280 122 276 152 276 184" />
        <Stitch d="M117 418 Q200 429 283 418" />
      </Part>
      <Part d="M43 364 L81 372 L78 394 L39 386 Z" texture="rib" />
      <Part d="M357 364 L319 372 L322 394 L361 386 Z" texture="rib" />
      <Neckline />
    </>
  );
}
