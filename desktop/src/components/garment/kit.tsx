import { createContext, useContext, useId, type ReactNode } from 'react';
import styles from './GarmentArt.module.css';

export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 480;

export type Texture = 'none' | 'twill' | 'rib' | 'waffle' | 'ripstop' | 'mesh' | 'webbing';
export type Tone = 'base' | 'paper' | 'stone' | 'ink' | 'metal';
type Blur = 'tight' | 'soft' | 'wide';

export interface GarmentIds {
  grain: string;
  lighting: string;
  metal: string;
  sheen: string;
  lens: string;
  shadowBlur: string;
  blur: Record<Blur, string>;
  textures: Record<Exclude<Texture, 'none'>, string>;
}

interface Kit {
  color: string;
  ids: GarmentIds;
}

const KitContext = createContext<Kit | null>(null);

export const KitProvider = KitContext.Provider;

export function useKit(): Kit {
  const kit = useContext(KitContext);
  if (!kit) {
    throw new Error('Garment primitives must be rendered inside GarmentArt');
  }
  return kit;
}

const url = (id: string) => `url(#${id})`;

function toneFill(tone: Tone, kit: Kit): string {
  switch (tone) {
    case 'base':
      return kit.color;
    case 'paper':
      return 'var(--palette-paper-50)';
    case 'stone':
      return 'var(--palette-paper-300)';
    case 'ink':
      return 'var(--palette-ink-900)';
    case 'metal':
      return url(kit.ids.metal);
  }
}

interface PartProps {
  d: string;
  tone?: Tone;
  texture?: Texture;
  lit?: boolean;
  edge?: boolean;
  panels?: ReactNode;
  children?: ReactNode;
}

export function Part({ d, tone = 'base', texture = 'none', lit = true, edge = true, panels, children }: PartProps) {
  const kit = useKit();
  const clipId = `part-${useId().replaceAll(':', '')}`;

  return (
    <g>
      <clipPath id={clipId}>
        <path d={d} />
      </clipPath>
      <path d={d} style={{ fill: toneFill(tone, kit) }} />
      <g clipPath={url(clipId)}>
        {panels}
        {texture !== 'none' && (
          <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={url(kit.ids.textures[texture])} />
        )}
        {lit && <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill={url(kit.ids.lighting)} />}
        {children}
      </g>
      {edge && <path d={d} className={styles.edge} />}
    </g>
  );
}

interface SoftProps {
  d: string;
  width?: number;
  opacity?: number;
  blur?: Blur;
}

function SoftStroke({ d, width, opacity, blur = 'soft', light }: SoftProps & { light: boolean }) {
  const kit = useKit();
  const paint = light ? 'var(--color-art-light)' : 'var(--color-art-dark)';
  return (
    <path
      d={d}
      filter={url(kit.ids.blur[blur])}
      opacity={opacity}
      style={width ? { fill: 'none', stroke: paint, strokeWidth: width, strokeLinecap: 'round' } : { fill: paint }}
    />
  );
}

export function Shade({ opacity = 0.18, ...props }: SoftProps) {
  return <SoftStroke {...props} opacity={opacity} light={false} />;
}

export function Light({ opacity = 0.14, ...props }: SoftProps) {
  return <SoftStroke {...props} opacity={opacity} light />;
}

export function Seam({ d }: { d: string }) {
  return (
    <g className={styles.seam}>
      <path d={d} className={styles.seamDark} />
      <path d={d} className={styles.seamLight} transform="translate(0.9 0.9)" />
    </g>
  );
}

export function Stitch({ d, tone = 'light' }: { d: string; tone?: 'light' | 'dark' | 'copper' }) {
  return <path d={d} className={`${styles.stitch} ${styles[`stitch-${tone}`]}`} />;
}

export function Rib({ d, width }: { d: string; width: number }) {
  const kit = useKit();
  return (
    <g className={styles.rib}>
      <path d={d} style={{ stroke: 'var(--color-art-edge)', strokeWidth: width + 2 }} />
      <path d={d} style={{ stroke: kit.color, strokeWidth: width }} />
      <path d={d} style={{ stroke: url(kit.ids.textures.rib), strokeWidth: width }} />
      <path d={d} style={{ stroke: url(kit.ids.lighting), strokeWidth: width }} />
    </g>
  );
}

export function Zipper({ d, pull }: { d: string; pull?: { x: number; y: number; rotate?: number } }) {
  const kit = useKit();
  return (
    <g>
      <path d={d} className={styles.zipperTape} />
      <path d={d} className={styles.zipperTeeth} style={{ stroke: url(kit.ids.metal) }} />
      {pull && (
        <g transform={`translate(${pull.x} ${pull.y}) rotate(${pull.rotate ?? 0})`}>
          <rect x={-5} y={-2} width={10} height={22} rx={3} style={{ fill: url(kit.ids.metal) }} />
          <rect x={-2} y={12} width={4} height={5} rx={2} className={styles.hole} />
          <rect x={-5} y={-2} width={10} height={22} rx={3} className={styles.edge} />
        </g>
      )}
    </g>
  );
}

export function Cord({ d }: { d: string }) {
  return (
    <g>
      <path d={d} className={styles.cordShadow} transform="translate(1.5 2)" />
      <path d={d} className={styles.cord} />
    </g>
  );
}

export function Rivet({ x, y, r = 5 }: { x: number; y: number; r?: number }) {
  const kit = useKit();
  return (
    <g>
      <circle cx={x} cy={y} r={r} style={{ fill: url(kit.ids.metal) }} />
      <circle cx={x} cy={y} r={r} className={styles.edge} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.35} className={styles.glint} />
    </g>
  );
}
