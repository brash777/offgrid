export interface BackdropFrame {
  source: CanvasImageSource;
  width: number;
  height: number;
  mirrored: boolean;
}

interface Surface {
  canvas: OffscreenCanvas;
  context: OffscreenCanvasRenderingContext2D;
}

const BASE_WIDTH = 320;
const BLUR_WIDTH = 160;
const SMALLEST_SIDE = 2;
const BLUR = 0.02;
const ERASE_SPREAD = 1.2;
const DIM = 0.93;
const SATURATION = 0.88;
const VIGNETTE = 0.28;
const VIGNETTE_START = 0.35;
const FALLBACK = '#3a3a3a';

function surface(): Surface {
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  return { canvas, context };
}

function resize(target: Surface, width: number, height: number) {
  if (target.canvas.width !== width || target.canvas.height !== height) {
    target.canvas.width = width;
    target.canvas.height = height;
  }
}

export class Backdrop {
  private readonly levels: Surface[] = [];
  private readonly padded = surface();
  private readonly soft = surface();
  private blurLevel = 0;
  private margin = 0;
  private aspect = 0;
  ready = false;

  build(frame: BackdropFrame, person: CanvasImageSource) {
    this.layout(frame.width, frame.height);
    const base = this.levels[0];
    const { width, height } = base.canvas;
    const context = base.context;
    context.save();
    context.globalCompositeOperation = 'copy';
    if (frame.mirrored) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(frame.source, 0, 0, width, height);
    context.globalCompositeOperation = 'destination-out';
    context.filter = `blur(${ERASE_SPREAD}px)`;
    context.drawImage(person, 0, 0, width, height);
    context.filter = 'none';
    context.drawImage(person, 0, 0, width, height);
    context.restore();

    for (let index = 1; index < this.levels.length; index += 1) {
      const level = this.levels[index];
      level.context.globalCompositeOperation = 'copy';
      level.context.drawImage(this.levels[index - 1].canvas, 0, 0, level.canvas.width, level.canvas.height);
    }
    const smallest = this.levels[this.levels.length - 1];
    smallest.context.globalCompositeOperation = 'destination-over';
    smallest.context.fillStyle = FALLBACK;
    smallest.context.fillRect(0, 0, smallest.canvas.width, smallest.canvas.height);
    for (let index = this.levels.length - 2; index >= this.blurLevel; index -= 1) {
      const level = this.levels[index];
      level.context.globalCompositeOperation = 'destination-over';
      level.context.drawImage(this.levels[index + 1].canvas, 0, 0, level.canvas.width, level.canvas.height);
    }

    const filled = this.levels[this.blurLevel].canvas;
    const margin = this.margin;
    const paddedWidth = filled.width + margin * 2;
    const paddedHeight = filled.height + margin * 2;
    resize(this.padded, paddedWidth, paddedHeight);
    resize(this.soft, paddedWidth, paddedHeight);
    const padded = this.padded.context;
    padded.globalCompositeOperation = 'copy';
    padded.drawImage(filled, 0, 0, paddedWidth, paddedHeight);
    padded.globalCompositeOperation = 'source-over';
    padded.drawImage(filled, margin, margin);

    const soft = this.soft.context;
    soft.save();
    soft.globalCompositeOperation = 'copy';
    soft.filter = `blur(${(filled.width * BLUR).toFixed(2)}px) saturate(${SATURATION}) brightness(${DIM})`;
    soft.drawImage(this.padded.canvas, 0, 0);
    soft.filter = 'none';
    soft.globalCompositeOperation = 'source-atop';
    const centerX = paddedWidth / 2;
    const centerY = paddedHeight / 2;
    const reach = Math.hypot(filled.width, filled.height) / 2;
    const vignette = soft.createRadialGradient(centerX, centerY, reach * VIGNETTE_START, centerX, centerY, reach);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, `rgba(0, 0, 0, ${VIGNETTE})`);
    soft.fillStyle = vignette;
    soft.fillRect(0, 0, paddedWidth, paddedHeight);
    soft.restore();
    this.ready = true;
  }

  draw(target: CanvasRenderingContext2D, width: number, height: number, opacity: number) {
    if (!this.ready) {
      return;
    }
    const filled = this.levels[this.blurLevel].canvas;
    target.save();
    target.globalAlpha = opacity;
    target.imageSmoothingQuality = 'high';
    target.drawImage(this.soft.canvas, this.margin, this.margin, filled.width, filled.height, 0, 0, width, height);
    target.restore();
  }

  private layout(width: number, height: number) {
    const aspect = height / width;
    if (aspect === this.aspect && this.levels.length > 0) {
      return;
    }
    this.aspect = aspect;
    this.levels.length = 0;
    let levelWidth = BASE_WIDTH;
    let levelHeight = Math.max(1, Math.round(BASE_WIDTH * aspect));
    for (;;) {
      const level = surface();
      resize(level, levelWidth, levelHeight);
      if (levelWidth === BLUR_WIDTH) {
        this.blurLevel = this.levels.length;
      }
      this.levels.push(level);
      if (levelWidth <= SMALLEST_SIDE && levelHeight <= SMALLEST_SIDE) {
        break;
      }
      levelWidth = Math.max(1, Math.ceil(levelWidth / 2));
      levelHeight = Math.max(1, Math.ceil(levelHeight / 2));
    }
    this.margin = Math.ceil(BLUR_WIDTH * BLUR * 3);
    this.ready = false;
  }
}
