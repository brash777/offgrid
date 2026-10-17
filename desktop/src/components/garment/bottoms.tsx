import { Cord, Light, Part, Rivet, Seam, Shade, Stitch } from './kit';

const JEANS_BODY =
  'M120 40 L280 40 L290 116 C294 210 296 330 298 452 L208 452 C208 360 206 270 202 200 L198 200 C194 270 192 360 192 452 L102 452 C104 330 106 210 110 116 Z';

const BELT_LOOPS = [134, 174, 218, 258];

function BeltLoops() {
  return (
    <>
      {BELT_LOOPS.map((x) => (
        <Part key={x} d={`M${x} 36 L${x + 8} 36 L${x + 8} 70 L${x} 70 Z`} texture="twill">
          <Shade d={`M${x} 66 L${x + 8} 66`} width={4} opacity={0.3} blur="tight" />
        </Part>
      ))}
    </>
  );
}

export function Jeans() {
  return (
    <>
      <Part d={JEANS_BODY} texture="twill">
        <Light d="M152 230 C150 280 152 330 154 380" width={34} opacity={0.12} blur="wide" />
        <Light d="M248 230 C250 280 248 330 246 380" width={34} opacity={0.1} blur="wide" />
        <Light d="M180 128 C166 134 150 136 136 134" width={4} opacity={0.24} />
        <Light d="M182 146 C168 154 152 158 138 158" width={4} opacity={0.2} />
        <Light d="M184 166 C172 174 158 178 146 180" width={3} opacity={0.18} />
        <Light d="M220 128 C234 134 250 136 264 134" width={4} opacity={0.22} />
        <Light d="M218 146 C232 154 248 158 262 158" width={4} opacity={0.18} />
        <Shade d="M194 210 C192 300 190 380 190 450" width={12} opacity={0.2} />
        <Shade d="M206 210 C208 300 210 380 210 450" width={12} opacity={0.2} />
        <Shade d="M108 420 C130 414 160 416 190 422" width={5} opacity={0.18} blur="tight" />
        <Shade d="M210 422 C240 416 270 414 296 420" width={5} opacity={0.18} blur="tight" />
        <Seam d="M120 70 C142 74 156 94 162 120" />
        <Seam d="M280 70 C258 74 244 94 238 120" />
        <Stitch d="M124 76 C144 80 154 98 158 120" tone="copper" />
        <Stitch d="M276 76 C256 80 246 98 242 120" tone="copper" />
        <Seam d="M248 74 L270 74 L268 100 L250 100" />
        <Stitch d="M251 80 L267 80" tone="copper" />
        <Seam d="M206 64 L206 150 C206 166 202 176 198 182" />
        <Stitch d="M214 66 L214 150 C214 170 208 182 200 190" tone="copper" />
        <Stitch d="M104 444 L190 444" tone="copper" />
        <Stitch d="M210 444 L296 444" tone="copper" />
      </Part>
      <Part d="M120 40 L280 40 L282 64 L118 64 Z" texture="twill">
        <Stitch d="M121 45 L279 45" tone="copper" />
        <Stitch d="M120 59 L280 59" tone="copper" />
      </Part>
      <BeltLoops />
      <Rivet x={210} y={52} r={6} />
      <Rivet x={124} y={72} r={3} />
      <Rivet x={276} y={72} r={3} />
    </>
  );
}

const CARGO_BODY =
  'M120 40 L280 40 L294 120 C300 220 298 340 290 440 L214 446 C212 350 208 262 202 200 L198 200 C192 262 188 350 186 446 L110 440 C102 340 100 220 106 120 Z';

const JOGGER_BODY =
  'M122 40 L278 40 L292 120 C298 220 290 330 270 420 L218 422 C214 340 208 262 202 200 L198 200 C192 262 186 340 182 422 L130 420 C110 330 102 220 108 120 Z';

function CargoPocket({ mirror, top }: { mirror?: boolean; top: number }) {
  const flip = mirror ? 'translate(400 0) scale(-1 1)' : undefined;
  return (
    <g transform={flip}>
      <Part d={`M102 ${top + 8} L154 ${top + 12} L150 ${top + 98} L100 ${top + 92} Z`}>
        <Seam d={`M127 ${top + 12} L125 ${top + 94}`} />
        <Shade d={`M100 ${top + 90} L150 ${top + 96}`} width={6} opacity={0.25} blur="tight" />
        <Light d={`M104 ${top + 30} L104 ${top + 86}`} width={5} opacity={0.15} blur="tight" />
      </Part>
      <Part d={`M98 ${top} L158 ${top + 4} L158 ${top + 26} L98 ${top + 22} Z`}>
        <Shade d={`M98 ${top + 22} L158 ${top + 26}`} width={6} opacity={0.3} blur="tight" />
        <Stitch d={`M102 ${top + 5} L154 ${top + 9}`} tone="dark" />
      </Part>
      <Rivet x={128} y={top + 16} r={3.5} />
    </g>
  );
}

function LegShading({ hem }: { hem: number }) {
  return (
    <>
      <Light d={`M146 220 C142 280 144 340 150 ${hem - 30}`} width={30} opacity={0.12} blur="wide" />
      <Light d={`M254 220 C258 280 256 340 250 ${hem - 30}`} width={22} opacity={0.08} blur="wide" />
      <Shade d={`M194 210 C190 300 188 380 186 ${hem}`} width={12} opacity={0.22} />
      <Shade d={`M206 210 C210 300 212 380 214 ${hem}`} width={12} opacity={0.22} />
      <Shade d="M150 180 C166 190 180 196 196 200" width={6} opacity={0.18} />
      <Shade d="M250 180 C234 190 220 196 204 200" width={6} opacity={0.18} />
    </>
  );
}

export function CargoPants() {
  return (
    <>
      <Part d={CARGO_BODY} texture="ripstop">
        <LegShading hem={444} />
        <Seam d="M114 330 C134 338 160 340 184 330" />
        <Seam d="M286 330 C266 338 240 340 216 330" />
        <Seam d="M120 66 C140 72 152 92 158 116" />
        <Seam d="M280 66 C260 72 248 92 242 116" />
        <Seam d="M204 64 L204 150 C204 166 200 176 198 182" />
        <Stitch d="M112 432 L186 436" tone="dark" />
        <Stitch d="M214 436 L288 432" tone="dark" />
        <CargoPocket top={218} />
        <CargoPocket top={218} mirror />
      </Part>
      <Part d="M120 40 L280 40 L281 62 L119 62 Z" texture="ripstop" />
      <Part d="M112 44 L288 44 L288 58 L112 58 Z" tone="ink" texture="webbing" />
      <Part d="M188 40 L212 40 L212 62 L188 62 Z" tone="metal">
        <rect x={194} y={46} width={12} height={10} rx={2} style={{ fill: 'var(--palette-ink-900)' }} />
      </Part>
      <Part d="M114 434 L124 434 L124 452 L114 452 Z" tone="ink" />
      <Part d="M276 434 L286 434 L286 452 L276 452 Z" tone="ink" />
    </>
  );
}

const CUFF_GATHERS = [140, 154, 168, 232, 246, 260];

export function Jogger() {
  return (
    <>
      <Part d={JOGGER_BODY}>
        <LegShading hem={420} />
        {CUFF_GATHERS.map((x) => (
          <Shade key={x} d={`M${x} 396 L${x + 1} 420`} width={5} opacity={0.2} blur="tight" />
        ))}
        <Seam d="M120 70 C140 76 152 94 158 116" />
        <Seam d="M280 70 C260 76 248 94 242 116" />
        <CargoPocket top={214} />
        <CargoPocket top={214} mirror />
      </Part>
      <Part d="M130 416 L182 418 L180 448 L134 446 Z" texture="rib" />
      <Part d="M270 416 L218 418 L220 448 L266 446 Z" texture="rib" />
      <Part d="M122 40 L278 40 L280 68 L120 68 Z" texture="rib">
        <Shade d="M122 64 L278 64" width={4} opacity={0.2} blur="tight" />
      </Part>
      <Cord d="M193 60 C190 84 186 104 182 124" />
      <Cord d="M207 60 C210 84 214 106 218 128" />
      <Rivet x={182} y={127} r={3} />
      <Rivet x={218} y={131} r={3} />
    </>
  );
}

const SHORTS_BODY =
  'M122 120 L278 120 L292 196 L306 330 C270 338 236 338 210 334 L202 252 L198 252 L190 334 C164 338 130 338 94 330 L108 196 Z';

export function Shorts() {
  return (
    <>
      <Part
        d={SHORTS_BODY}
        panels={
          <>
            <path
              d="M121 148 L110 200 L100 334"
              style={{ fill: 'none', stroke: 'var(--palette-paper-50)', strokeWidth: 10 }}
            />
            <path
              d="M279 148 L290 200 L300 334"
              style={{ fill: 'none', stroke: 'var(--palette-paper-50)', strokeWidth: 10 }}
            />
          </>
        }
      >
        <Light d="M146 170 C140 220 140 280 146 320" width={30} opacity={0.14} blur="wide" />
        <Shade d="M196 256 C194 290 192 310 190 332" width={10} opacity={0.22} />
        <Shade d="M204 256 C206 290 208 310 210 332" width={10} opacity={0.22} />
        <Shade d="M150 210 C168 228 184 240 198 250" width={6} opacity={0.16} />
        <Shade d="M250 210 C232 228 216 240 202 250" width={6} opacity={0.16} />
        <Seam d="M204 146 L204 216 C204 228 200 236 198 240" />
        <Stitch d="M98 322 C130 330 164 330 190 326" />
        <Stitch d="M210 326 C236 330 270 330 302 322" />
      </Part>
      <Part d="M122 120 L278 120 L280 148 L120 148 Z" texture="rib">
        <Shade d="M122 144 L278 144" width={4} opacity={0.2} blur="tight" />
      </Part>
      <Cord d="M194 140 C190 160 188 180 186 200" />
      <Cord d="M206 140 C210 162 212 182 214 204" />
      <Rivet x={186} y={203} r={3} />
      <Rivet x={214} y={207} r={3} />
    </>
  );
}
