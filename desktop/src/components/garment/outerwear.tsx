import { Cord, Light, Part, Rivet, Seam, Shade, Stitch, Zipper } from './kit';

const BOMBER_BODY =
  'M162 64 C182 58 218 58 238 64 C262 72 282 82 296 98 C318 150 336 260 342 380 L302 392 C298 300 292 240 286 196 C292 260 294 340 290 400 L110 400 C106 340 108 260 114 196 C108 240 102 300 98 392 L58 380 C64 260 82 150 104 98 C118 82 138 72 162 64 Z';

const PUCKER_X = [128, 152, 176, 222, 246, 270];

export function Bomber() {
  return (
    <>
      <Part d={BOMBER_BODY}>
        <Light d="M150 110 C138 200 140 300 150 390" width={34} opacity={0.16} blur="wide" />
        <Light d="M100 122 C84 200 76 290 72 368" width={16} opacity={0.2} />
        <Light d="M300 122 C316 200 324 290 328 368" width={10} opacity={0.08} />
        <Light d="M232 100 C250 150 256 220 252 300" width={20} opacity={0.08} blur="wide" />
        <Shade d="M116 198 C120 232 122 272 120 312" width={16} opacity={0.22} />
        <Shade d="M284 198 C280 232 278 272 280 312" width={16} opacity={0.22} />
        <Shade d="M168 86 Q200 98 232 86" width={12} opacity={0.24} />
        <Shade d="M84 330 C90 340 98 344 104 342" width={6} opacity={0.2} blur="tight" />
        <Shade d="M316 330 C310 340 302 344 296 342" width={6} opacity={0.2} blur="tight" />
        {PUCKER_X.map((x) => (
          <Shade key={x} d={`M${x} 372 L${x + 2} 400`} width={6} opacity={0.16} blur="tight" />
        ))}
        <Seam d="M106 100 C116 130 118 160 114 196" />
        <Seam d="M294 100 C284 130 282 160 286 196" />
        <Seam d="M130 298 L150 352" />
        <Seam d="M270 298 L250 352" />
        <Shade d="M128 300 L148 354" width={5} opacity={0.3} blur="tight" />
        <Shade d="M272 300 L252 354" width={5} opacity={0.3} blur="tight" />
      </Part>
      <Part d="M300 140 L326 136 L332 186 L306 190 Z">
        <Shade d="M306 190 L332 186" width={5} opacity={0.3} blur="tight" />
        <Stitch d="M304 146 L327 142" tone="dark" />
        <Seam d="M312 152 L316 182" />
      </Part>
      <Part d="M58 380 L98 392 L96 416 L56 404 Z" texture="rib" />
      <Part d="M342 380 L302 392 L304 416 L344 404 Z" texture="rib" />
      <Part d="M110 398 L290 398 L288 426 C230 432 170 432 112 426 Z" texture="rib">
        <Shade d="M112 402 L288 402" width={6} opacity={0.2} blur="tight" />
      </Part>
      <Part d="M160 62 C180 54 220 54 240 62 L232 86 C214 80 186 80 168 86 Z" texture="rib">
        <Shade d="M168 84 C186 78 214 78 232 84" width={6} opacity={0.25} blur="tight" />
      </Part>
      <Zipper d="M200 82 L200 428" pull={{ x: 200, y: 88 }} />
    </>
  );
}

const DENIM_BODY =
  'M164 64 C184 60 216 60 236 64 L292 92 C314 150 330 260 336 388 L298 396 C294 300 290 240 286 192 L290 424 L110 424 L114 192 C110 240 106 300 102 396 L64 388 C70 260 86 150 108 92 Z';

const PLACKET_BUTTONS = [150, 212, 274, 336];

function ChestPocket({ mirror }: { mirror?: boolean }) {
  const flip = mirror ? 'translate(400 0) scale(-1 1)' : undefined;
  return (
    <g transform={flip}>
      <Seam d="M132 168 L132 214 L182 214 L182 168" />
      <Seam d="M157 180 L157 214" />
      <Stitch d="M137 172 L137 209 L177 209 L177 172" tone="copper" />
      <Part d="M128 146 L186 146 L186 168 L157 180 L128 168 Z" texture="twill">
        <Shade d="M128 168 L157 180 L186 168" width={4} opacity={0.25} blur="tight" />
        <Stitch d="M133 151 L181 151 L181 165 L157 175 L133 165 Z" tone="copper" />
      </Part>
      <Rivet x={157} y={168} r={4.5} />
    </g>
  );
}

export function DenimJacket() {
  return (
    <>
      <Part d={DENIM_BODY} texture="twill">
        <Light d="M146 140 C152 200 168 270 176 340" width={44} opacity={0.14} blur="wide" />
        <Light d="M262 150 C258 210 246 270 238 330" width={30} opacity={0.1} blur="wide" />
        <Light d="M96 130 C86 210 78 300 74 372" width={14} opacity={0.18} />
        <Light d="M194 110 L194 392" width={6} opacity={0.16} blur="tight" />
        <Shade d="M116 196 C120 232 122 272 120 312" width={16} opacity={0.2} />
        <Shade d="M284 196 C280 232 278 272 280 312" width={16} opacity={0.2} />
        <Shade d="M86 300 C92 308 100 312 108 310" width={6} opacity={0.2} blur="tight" />
        <Shade d="M314 300 C308 308 300 312 292 310" width={6} opacity={0.2} blur="tight" />
        <Seam d="M108 92 C118 126 120 160 114 192" />
        <Seam d="M292 92 C282 126 280 160 286 192" />
        <Seam d="M146 214 L142 396" />
        <Seam d="M254 214 L258 396" />
        <Stitch d="M151 216 L147 394" tone="copper" />
        <Stitch d="M249 216 L253 394" tone="copper" />
        <Seam d="M126 300 L140 360" />
        <Seam d="M274 300 L260 360" />
        <Seam d="M200 100 L200 424" />
        <Stitch d="M193 104 L193 396" tone="copper" />
        <Stitch d="M213 104 L213 396" tone="copper" />
        <ChestPocket />
        <ChestPocket mirror />
      </Part>
      <Part d="M110 396 L290 396 L290 424 L110 424 Z" texture="twill">
        <Stitch d="M112 401 L288 401" tone="copper" />
        <Stitch d="M112 419 L288 419" tone="copper" />
      </Part>
      <Part d="M64 372 L100 380 L98 398 L64 390 Z" texture="twill">
        <Stitch d="M66 377 L99 384" tone="copper" />
      </Part>
      <Part d="M336 372 L300 380 L302 398 L336 390 Z" texture="twill">
        <Stitch d="M334 377 L301 384" tone="copper" />
      </Part>
      <Part d="M164 64 C184 58 216 58 236 64 L230 76 C214 70 186 70 170 76 Z" texture="twill">
        <Shade d="M164 64 C184 58 216 58 236 64 L230 76 C214 70 186 70 170 76 Z" opacity={0.35} blur="tight" />
      </Part>
      <Shade d="M138 100 L176 144" width={8} opacity={0.28} />
      <Shade d="M262 100 L224 144" width={8} opacity={0.28} />
      <Part d="M170 70 C150 76 136 84 128 92 L172 136 L198 100 Z" texture="twill">
        <Stitch d="M136 95 L171 129" tone="copper" />
      </Part>
      <Part d="M230 70 C250 76 264 84 272 92 L228 136 L202 100 Z" texture="twill">
        <Stitch d="M264 95 L229 129" tone="copper" />
      </Part>
      {PLACKET_BUTTONS.map((y) => (
        <Rivet key={y} x={206} y={y} r={5} />
      ))}
      <Rivet x={206} y={410} r={5} />
      <Rivet x={84} y={386} r={3.5} />
      <Rivet x={316} y={386} r={3.5} />
    </>
  );
}

const WINDBREAKER_BODY =
  'M150 84 C170 80 230 80 250 84 C270 88 286 94 298 104 C320 160 336 270 340 384 L304 394 C300 300 294 240 288 200 C292 270 296 350 296 412 C240 424 160 424 104 412 C104 350 108 270 112 200 C106 240 100 300 96 394 L60 384 C64 270 80 160 102 104 C114 94 130 88 150 84 Z';

const YOKE = 'M60 160 C70 130 84 112 102 104 C130 96 270 96 298 104 C316 112 330 130 340 160 C300 196 100 196 60 160 Z';

const HEM_GATHERS = [124, 146, 168, 190, 210, 232, 254, 276];

export function Windbreaker() {
  return (
    <>
      <Part d="M150 88 C144 36 256 36 250 88 C236 80 164 80 150 88 Z">
        <Light d="M170 50 C190 42 214 42 232 50" width={10} opacity={0.2} />
      </Part>
      <Part d="M162 84 C166 56 234 56 238 84 C222 94 178 94 162 84 Z">
        <Shade d="M162 84 C166 56 234 56 238 84 C222 94 178 94 162 84 Z" opacity={0.55} blur="tight" />
      </Part>
      <Part d={WINDBREAKER_BODY} panels={<path d={YOKE} style={{ fill: 'var(--palette-ink-900)' }} />}>
        <Light d="M150 200 C140 260 142 330 150 400" width={34} opacity={0.18} blur="wide" />
        <Light d="M98 200 C88 260 80 320 76 380" width={14} opacity={0.2} />
        <Light d="M130 116 C170 108 230 108 270 116" width={10} opacity={0.12} />
        <Shade d="M114 200 C118 240 120 280 118 320" width={16} opacity={0.2} />
        <Shade d="M286 200 C282 240 280 280 282 320" width={16} opacity={0.2} />
        {HEM_GATHERS.map((x) => (
          <Shade key={x} d={`M${x} 390 L${x + 1} 416`} width={5} opacity={0.18} blur="tight" />
        ))}
        <Seam d="M60 160 C100 196 300 196 340 160" />
        <Stitch d="M64 168 C104 202 296 202 336 168" />
        <Seam d="M140 282 L260 282 L268 350 L132 350 Z" />
        <Stitch d="M144 288 L256 288" />
      </Part>
      <Part d="M60 384 L96 394 L96 410 L60 400 Z" texture="rib" />
      <Part d="M340 384 L304 394 L304 410 L340 400 Z" texture="rib" />
      <Zipper d="M200 92 L200 206" pull={{ x: 200, y: 98 }} />
      <Zipper d="M150 284 L250 284" pull={{ x: 236, y: 286, rotate: -90 }} />
      <Cord d="M186 90 C184 112 182 132 180 152" />
      <Cord d="M214 90 C216 112 218 132 220 152" />
      <Part d="M175 150 L185 150 L185 166 L175 166 Z" tone="ink" />
      <Part d="M215 150 L225 150 L225 166 L215 166 Z" tone="ink" />
    </>
  );
}
