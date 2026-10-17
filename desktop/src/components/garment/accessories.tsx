import { Light, Part, Rivet, Seam, Shade, Stitch, Zipper, useKit } from './kit';
import styles from './GarmentArt.module.css';

const CROWN = 'M110 300 C104 214 160 148 236 146 C310 146 344 214 334 300 C280 314 160 314 110 300 Z';
const CROWN_BACK = 'M236 146 C310 146 344 214 334 300 C310 306 290 308 270 308 C272 240 262 180 236 146 Z';
const BRIM =
  'M114 296 C80 300 50 314 44 332 C40 350 80 362 150 356 C200 352 240 338 262 314 C212 312 160 306 114 296 Z';

function Cap({ mesh }: { mesh: boolean }) {
  return (
    <>
      <Part d={CROWN}>
        {mesh && <Part d={CROWN_BACK} tone="paper" texture="mesh" edge={false} />}
        <Light d="M150 196 C140 236 140 270 146 298" width={34} opacity={0.18} blur="wide" />
        <Light d="M206 160 C230 154 260 156 284 166" width={10} opacity={0.2} />
        <Shade d="M300 190 C320 220 330 260 330 298" width={22} opacity={0.18} blur="wide" />
        <Seam d="M236 146 C214 186 200 240 196 306" />
        <Seam d="M236 146 C262 180 272 240 270 308" />
        <Stitch d="M230 152 C210 190 196 240 190 304" />
        <Stitch d="M242 152 C266 186 276 240 276 306" />
        <circle cx={168} cy={206} r={3.5} className={styles.hole} />
        <circle cx={300} cy={206} r={3.5} className={styles.hole} />
      </Part>
      <Part d="M226 146 A10 5 0 1 0 246 146 A10 5 0 1 0 226 146 Z">
        <Shade d="M226 148 L246 148" width={3} opacity={0.3} blur="tight" />
      </Part>
      <Part d={BRIM}>
        <Shade d="M120 302 C160 312 220 316 262 314" width={14} opacity={0.34} />
        <Light d="M60 330 C90 318 130 312 170 314" width={8} opacity={0.22} />
        <Stitch d="M62 330 C100 316 170 314 240 320" />
        <Stitch d="M56 338 C100 324 170 322 236 328" />
        <Shade d="M44 334 C46 352 90 362 150 358 C200 354 240 340 262 316" width={4} opacity={0.3} blur="tight" />
      </Part>
    </>
  );
}

export function Snapback() {
  return <Cap mesh={false} />;
}

export function Trucker() {
  return <Cap mesh />;
}

const LINK_COUNT = 28;
const LOOP = { cx: 200, cy: 238, rx: 118, ry: 150 };

const LINKS = Array.from({ length: LINK_COUNT }, (_, index) => {
  const angle = (index / LINK_COUNT) * Math.PI * 2;
  const x = LOOP.cx + LOOP.rx * Math.sin(angle);
  const y = LOOP.cy - LOOP.ry * Math.cos(angle);
  const tangent = (Math.atan2(LOOP.ry * Math.sin(angle), LOOP.rx * Math.cos(angle)) * 180) / Math.PI;
  return { x, y, tangent, flat: index % 2 === 0 };
});

export function Chain() {
  const { color, ids } = useKit();
  const sheen = `url(#${ids.sheen})`;
  const ordered = [...LINKS.filter((link) => !link.flat), ...LINKS.filter((link) => link.flat)];

  return (
    <g filter={`url(#${ids.shadowBlur})`}>
      {ordered.map((link) => (
        <g
          key={`${link.x.toFixed(1)}-${link.y.toFixed(1)}`}
          transform={`translate(${link.x} ${link.y}) rotate(${link.tangent})`}
        >
          {link.flat ? (
            <>
              <rect x={-20} y={-13} width={40} height={26} rx={13} style={{ fill: color }} />
              <rect x={-20} y={-13} width={40} height={26} rx={13} style={{ fill: sheen }} />
              <rect x={-11} y={-4.5} width={22} height={9} rx={4.5} className={styles.hole} />
              <rect x={-20} y={-13} width={40} height={26} rx={13} className={styles.edge} />
            </>
          ) : (
            <>
              <rect x={-18} y={-6} width={36} height={12} rx={6} style={{ fill: color }} />
              <rect x={-18} y={-6} width={36} height={12} rx={6} style={{ fill: sheen }} />
              <rect x={-18} y={-6} width={36} height={12} rx={6} className={styles.edge} />
            </>
          )}
        </g>
      ))}
      <g transform={`translate(${LOOP.cx} ${LOOP.cy + LOOP.ry + 18})`}>
        <rect x={-9} y={-6} width={18} height={30} rx={8} style={{ fill: color }} />
        <rect x={-9} y={-6} width={18} height={30} rx={8} style={{ fill: sheen }} />
        <rect x={-9} y={-6} width={18} height={30} rx={8} className={styles.edge} />
      </g>
    </g>
  );
}

const LENS =
  'M60 214 C62 182 124 168 200 168 C276 168 338 182 340 214 C342 252 312 276 268 272 C238 268 224 248 200 248 C176 248 162 268 132 272 C88 276 58 252 60 214 Z';

export function Glasses() {
  const { ids } = useKit();
  return (
    <>
      <Part d="M56 206 L26 196 L24 204 L54 216 Z" tone="ink" />
      <Part d="M344 206 L374 196 L376 204 L346 216 Z" tone="ink" />
      <Part d={LENS} panels={<path d={LENS} style={{ fill: `url(#${ids.lens})` }} />}>
        <path d="M108 178 L150 174 L104 266 L74 254 Z" className={styles.reflection} />
        <path d="M250 172 L270 172 L236 262 L218 262 Z" className={styles.reflectionFaint} />
        <Shade d="M180 248 C190 240 210 240 220 248" width={8} opacity={0.4} blur="tight" />
      </Part>
      <Part
        d="M56 212 C58 176 124 160 200 160 C276 160 342 176 344 212 L336 206 C330 186 270 172 200 172 C130 172 70 186 64 206 Z"
        tone="ink"
      >
        <Light d="M90 176 C130 166 270 166 310 176" width={3} opacity={0.4} blur="tight" />
      </Part>
      <Rivet x={70} y={200} r={3} />
      <Rivet x={330} y={200} r={3} />
    </>
  );
}

const MOLLE_ROWS = [262, 300, 338, 376];
const BAR_TACKS = [154, 176, 198, 220, 242];

function SideStrap({ y, mirror }: { y: number; mirror?: boolean }) {
  return (
    <g transform={mirror ? 'translate(400 0) scale(-1 1)' : undefined}>
      <Part d={`M96 ${y} L124 ${y + 2} L124 ${y + 12} L96 ${y + 10} Z`} tone="ink" texture="webbing" />
      <Part d={`M104 ${y - 4} L116 ${y - 3} L116 ${y + 15} L104 ${y + 14} Z`} tone="ink">
        <Light d={`M106 ${y - 2} L106 ${y + 12}`} width={2} opacity={0.4} blur="tight" />
      </Part>
    </g>
  );
}

export function Backpack() {
  return (
    <>
      <Part d="M128 92 C100 120 90 200 96 300 L112 300 C108 210 116 132 140 100 Z">
        <Shade d="M128 92 C100 120 90 200 96 300 L112 300 C108 210 116 132 140 100 Z" opacity={0.35} blur="tight" />
      </Part>
      <Part d="M272 92 C300 120 310 200 304 300 L288 300 C292 210 284 132 260 100 Z">
        <Shade d="M272 92 C300 120 310 200 304 300 L288 300 C292 210 284 132 260 100 Z" opacity={0.35} blur="tight" />
      </Part>
      <path d="M178 92 C178 60 222 60 222 92" className={styles.handle} />
      <Part
        d="M112 118 C112 94 132 82 158 82 L242 82 C268 82 288 94 288 118 L296 404 C296 424 282 436 262 436 L138 436 C118 436 104 424 104 404 Z"
        texture="ripstop"
      >
        <Light d="M124 120 C118 200 116 300 118 400" width={18} opacity={0.18} />
        <Light d="M150 92 L250 92" width={8} opacity={0.18} />
        <Shade d="M282 130 C288 220 290 320 290 410" width={18} opacity={0.24} />
        <Shade d="M112 428 L290 428" width={10} opacity={0.2} />
        <Seam d="M118 140 C118 112 140 100 160 100 L240 100 C260 100 282 112 282 140" />
      </Part>
      <Zipper d="M120 136 C120 114 140 104 160 104 L240 104 C260 104 280 114 280 136" pull={{ x: 150, y: 106 }} />
      <Part d="M168 132 L232 132 L232 180 L168 180 Z" texture="mesh">
        <Stitch d="M172 136 L228 136 L228 176 L172 176 Z" />
      </Part>
      <Part
        d="M134 226 C134 214 142 208 154 208 L246 208 C258 208 266 214 266 226 L270 400 C270 412 262 418 250 418 L150 418 C138 418 130 412 130 400 Z"
        texture="ripstop"
      >
        <Light d="M140 230 L140 400" width={8} opacity={0.14} />
        <Shade d="M262 230 L266 404" width={10} opacity={0.2} />
        {MOLLE_ROWS.map((y) => (
          <g key={y}>
            <Part d={`M132 ${y} L268 ${y} L268 ${y + 12} L132 ${y + 12} Z`} texture="webbing">
              <Shade d={`M132 ${y + 12} L268 ${y + 12}`} width={4} opacity={0.4} blur="tight" />
            </Part>
            {BAR_TACKS.map((x) => (
              <path key={x} d={`M${x + 22} ${y + 2} L${x + 22} ${y + 10}`} className={styles.barTack} />
            ))}
          </g>
        ))}
      </Part>
      <Zipper d="M144 222 L256 222" pull={{ x: 248, y: 224, rotate: -90 }} />
      <SideStrap y={196} />
      <SideStrap y={326} />
      <SideStrap y={196} mirror />
      <SideStrap y={326} mirror />
      <Rivet x={150} y={196} r={3} />
      <Rivet x={250} y={196} r={3} />
    </>
  );
}
