import { Light, Part, Rivet, Seam, Shade, Stitch } from './kit';
import styles from './GarmentArt.module.css';

const SNEAKER_EYELETS = Array.from({ length: 6 }, (_, index) => ({
  x: 176 + index * 17,
  y: 210 - index * 8,
}));

export function Sneaker() {
  return (
    <>
      <Part d="M40 330 C38 342 48 352 66 352 L340 352 C358 352 366 340 362 326 Z" tone="stone" texture="rib" />
      <Part
        d="M36 314 C32 292 44 280 66 278 L160 274 C220 270 290 266 336 268 C360 270 368 292 362 326 C330 334 80 336 40 330 Z"
        tone="paper"
      >
        <Seam d="M50 310 C92 298 130 314 170 304 C210 294 250 310 290 298 C320 290 340 300 360 296" />
        <Seam d="M54 322 C140 316 260 320 358 314" />
        <Light d="M56 284 C140 278 260 272 340 274" width={6} opacity={0.6} blur="tight" />
        <Shade d="M44 328 C140 332 260 332 362 324" width={6} opacity={0.18} blur="tight" />
      </Part>
      <Part d="M56 282 C48 254 62 236 94 228 L150 214 C170 192 192 170 220 160 L268 146 C292 140 308 146 318 162 L336 200 C350 226 358 250 360 274 C300 274 120 280 56 282 Z">
        <Light d="M76 242 C96 236 116 232 136 230" width={10} opacity={0.32} />
        <Light d="M180 190 C210 172 240 160 270 152" width={8} opacity={0.16} />
        <Shade d="M270 150 C286 146 302 152 314 166" width={8} opacity={0.26} />
        <Shade d="M66 278 C150 274 280 270 358 272" width={8} opacity={0.12} />
      </Part>
      <Part d="M56 282 C48 258 62 242 92 234 L130 228 C120 250 118 268 124 280 Z">
        <Shade d="M124 280 C118 266 120 248 130 228" width={6} opacity={0.16} blur="tight" />
        <Stitch d="M62 272 C60 256 72 246 94 240 L124 234" tone="dark" />
      </Part>
      <Part d="M58 282 C120 278 300 272 360 274 C358 262 354 254 348 246 C300 256 180 262 96 266 C80 268 66 272 58 282 Z">
        <Shade d="M58 282 C120 278 300 272 360 274" width={4} opacity={0.2} blur="tight" />
        <Stitch d="M98 271 C180 268 300 262 348 254" tone="dark" />
      </Part>
      <Part d="M150 214 C170 194 192 174 220 164 L266 150 C262 178 250 206 236 232 C210 238 180 242 160 244 C148 236 144 224 150 214 Z">
        <Light d="M160 220 C186 200 220 180 258 160" width={8} opacity={0.18} />
        <Stitch d="M156 220 C176 202 198 184 222 172 L260 158" tone="dark" />
      </Part>
      <Part d="M300 160 C324 176 346 214 356 270 L300 272 C306 240 306 196 300 160 Z">
        <Shade d="M300 272 C306 240 306 196 300 160" width={5} opacity={0.2} blur="tight" />
        <Stitch d="M308 172 C326 192 340 226 348 264" tone="dark" />
      </Part>
      <Part d="M222 162 C222 140 242 126 264 130 L270 150 Z">
        <Shade d="M224 156 L268 146" width={5} opacity={0.24} blur="tight" />
      </Part>
      <Part d="M314 160 C318 146 332 144 336 156 L330 176 Z" tone="stone" />
      {SNEAKER_EYELETS.map((eyelet, index) => (
        <g key={eyelet.x}>
          <circle cx={eyelet.x} cy={eyelet.y} r={3} className={styles.hole} />
          {index < SNEAKER_EYELETS.length - 1 && (
            <path d={`M${eyelet.x - 4} ${eyelet.y + 7} L${eyelet.x + 13} ${eyelet.y - 12}`} className={styles.lace} />
          )}
        </g>
      ))}
    </>
  );
}

const BOOT_EYELETS = [
  { x: 216, y: 124 },
  { x: 216, y: 152 },
  { x: 215, y: 180 },
  { x: 214, y: 208 },
  { x: 213, y: 236 },
  { x: 211, y: 262 },
  { x: 194, y: 286 },
  { x: 174, y: 298 },
];

const TREAD_X = [64, 96, 128, 160, 192, 224, 256, 288, 316];

export function Boot() {
  return (
    <>
      <Part d="M44 372 L338 368 L340 396 C340 404 334 408 326 408 L60 408 C50 408 44 402 44 394 Z" tone="ink">
        {TREAD_X.map((x) => (
          <rect key={x} x={x} y={396} width={16} height={12} style={{ fill: 'var(--palette-black)' }} />
        ))}
        <Light d="M50 376 L336 372" width={3} opacity={0.2} blur="tight" />
      </Part>
      <Part d="M46 360 L338 356 L338 372 L46 376 Z" tone="ink">
        <Stitch d="M50 367 L334 363" />
      </Part>
      <Part d="M50 364 C44 340 58 326 92 320 L164 304 C184 298 196 286 200 266 L206 112 C206 102 214 96 224 96 L316 96 C326 96 332 102 332 112 L338 360 Z">
        <Light d="M74 334 C92 326 112 322 132 318" width={12} opacity={0.32} />
        <Light d="M252 120 C250 180 248 240 246 300" width={20} opacity={0.12} blur="wide" />
        <Light d="M314 120 C316 200 318 280 320 340" width={8} opacity={0.14} />
        <Shade d="M210 300 C230 296 260 296 290 300" width={10} opacity={0.24} />
        <Shade d="M216 230 C240 226 270 228 296 234" width={6} opacity={0.18} blur="tight" />
        <Seam d="M300 116 C304 200 304 260 300 300" />
        <Stitch d="M294 120 C298 200 298 258 294 298" />
      </Part>
      <Part d="M50 364 C44 342 58 328 90 322 L124 316 C116 334 114 352 118 362 Z">
        <Light d="M60 340 C70 332 84 328 100 326" width={6} opacity={0.3} />
        <Stitch d="M114 322 C110 336 110 350 112 360" />
      </Part>
      <Part d="M300 300 C320 306 334 330 338 360 L290 362 C290 340 292 316 300 300 Z">
        <Stitch d="M296 308 C292 326 292 344 294 358" />
      </Part>
      <Part d="M206 96 L332 96 L332 114 L206 114 Z">
        <Shade d="M206 110 L332 110" width={5} opacity={0.3} blur="tight" />
        <Stitch d="M210 104 L328 104" />
      </Part>
      <Part d="M318 98 C318 76 338 74 340 90 L336 118 L326 116 Z">
        <Stitch d="M324 98 C324 86 334 84 336 92" />
      </Part>
      {BOOT_EYELETS.map((eyelet, index) => {
        const next = BOOT_EYELETS[index + 1];
        return (
          <g key={`${eyelet.x}-${eyelet.y}`}>
            {next && <path d={`M${eyelet.x - 8} ${eyelet.y} L${next.x + 6} ${next.y}`} className={styles.laceDark} />}
            <Rivet x={eyelet.x} y={eyelet.y} r={3.2} />
          </g>
        );
      })}
    </>
  );
}

export function Sandal() {
  return (
    <>
      <Part d="M50 360 C48 372 58 380 72 380 L336 380 C352 380 360 372 358 360 Z" tone="ink" texture="rib" />
      <Part d="M48 362 C44 346 56 336 76 334 L328 330 C350 330 362 344 358 362 Z" tone="paper">
        <Seam d="M56 352 C120 344 220 352 352 346" />
        <Shade d="M50 360 C140 364 260 364 356 360" width={5} opacity={0.2} blur="tight" />
      </Part>
      <Part d="M92 336 C96 296 150 286 174 334 L156 334 C146 304 114 304 110 336 Z" texture="webbing">
        <Light d="M100 318 C112 300 142 296 160 312" width={4} opacity={0.24} blur="tight" />
      </Part>
      <Part d="M190 332 C196 262 262 252 282 330 L262 330 C252 274 210 276 208 332 Z" texture="webbing">
        <Light d="M198 300 C208 276 246 268 268 290" width={4} opacity={0.24} blur="tight" />
      </Part>
      <Part d="M214 288 L250 282 L254 300 L218 306 Z" texture="mesh">
        <Shade d="M218 306 L254 300" width={3} opacity={0.3} blur="tight" />
      </Part>
      <Part
        d="M262 300 C286 280 320 272 340 286 C350 294 352 310 350 330 L334 330 C334 314 332 302 326 298 C310 290 288 300 272 314 Z"
        texture="webbing"
      >
        <Light d="M276 296 C296 284 318 280 334 288" width={4} opacity={0.24} blur="tight" />
      </Part>
      <Part d="M294 284 L310 280 L314 296 L298 300 Z" tone="metal" />
    </>
  );
}
