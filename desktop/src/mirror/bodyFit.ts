import type { Garment, Point } from './garment';
import { GRID_ROWS, type Fit } from './skin';

export interface Segment {
  from: Point;
  to: Point;
}

export interface BodyPose {
  arms: Segment[];
  armRadius: number;
  shoulders: [Point, Point];
  size: number;
}

const MASK_WIDTH = 192;
const INSIDE = 128;
const EASE = 1.08;
const DRAPE = 0.45;
const MIN_SCALE = 0.86;
const MAX_SCALE = 1.15;
const SHOULDER_BLEND = 0.3;
const MIN_BLOCKED = 0.5;
const REACH = 1.7;
const SMOOTHING = 0.3;
const MAX_LIFT = 0.08;
const LIFT_MARGIN = 0.012;
const LIFT_REACH = 0.45;

function smoothstep(from: number, to: number, value: number): number {
  const progress = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return progress * progress * (3 - 2 * progress);
}

function distanceToSegment(x: number, y: number, segment: Segment): number {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.min(Math.max(((x - segment.from.x) * dx + (y - segment.from.y) * dy) / length, 0), 1);
  return Math.hypot(x - (segment.from.x + dx * t), y - (segment.from.y + dy * t));
}

interface Reach {
  distance: number;
  blocked: boolean;
}

export class BodyFit {
  private readonly canvas = new OffscreenCanvas(1, 1);
  private readonly context: OffscreenCanvasRenderingContext2D;
  private readonly fits = new Map<Garment, Fit>();
  private alpha: Uint8ClampedArray | null = null;
  private width = 0;
  private height = 0;
  private scale = 1;
  private arms: Segment[] = [];
  private armRadius = 0;

  constructor() {
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      throw new Error('Canvas 2D is not available');
    }
    this.context = context;
  }

  reset() {
    this.fits.clear();
    this.alpha = null;
  }

  capture(cutout: CanvasImageSource | null, frameWidth: number, frameHeight: number, mirrored: boolean) {
    if (!cutout) {
      this.alpha = null;
      return;
    }
    this.width = MASK_WIDTH;
    this.height = Math.max(1, Math.round((MASK_WIDTH * frameHeight) / frameWidth));
    this.scale = MASK_WIDTH / frameWidth;
    if (this.canvas.width !== this.width || this.canvas.height !== this.height) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }
    const { context } = this;
    context.save();
    context.clearRect(0, 0, this.width, this.height);
    if (mirrored) {
      context.translate(this.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(cutout, 0, 0, this.width, this.height);
    context.restore();
    this.alpha = context.getImageData(0, 0, this.width, this.height).data;
  }

  fit(garment: Garment, base: DOMMatrix, pose: BodyPose): Fit | null {
    const previous = this.fits.get(garment) ?? null;
    if (!this.alpha) {
      return previous;
    }
    this.arms = pose.arms;
    this.armRadius = pose.armRadius;
    const { torso } = garment;
    const scaleX = Math.hypot(base.a, base.b);
    const scaleY = Math.hypot(base.c, base.d);
    if (scaleX === 0 || scaleY === 0) {
      return previous;
    }
    const across = { x: base.a / scaleX, y: base.b / scaleX };
    const raw = new Float32Array(GRID_ROWS + 1).fill(Number.NaN);
    let measured = 0;
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const half = torso.halfWidths[row];
      if (half <= 0) {
        raw[row] = 1;
        continue;
      }
      const y = (row / GRID_ROWS) * garment.image.height;
      const middle = base.transformPoint(new DOMPoint(torso.center, y));
      if (this.inside(middle.x, middle.y) !== true || this.nearArm(middle.x, middle.y)) {
        continue;
      }
      const garmentHalf = half * scaleX;
      const limit = garmentHalf * REACH;
      const sides = [
        this.reach(middle, -across.x, -across.y, limit),
        this.reach(middle, across.x, across.y, limit),
      ].filter((side): side is Reach => side !== null && !(side.blocked && side.distance < garmentHalf * MIN_BLOCKED));
      if (sides.length === 0) {
        continue;
      }
      const body = sides.reduce((sum, side) => sum + side.distance, 0) / sides.length;
      let scale = (body * EASE) / garmentHalf;
      if (scale < 1) {
        scale = 1 - (1 - scale) * DRAPE;
      }
      scale = Math.min(Math.max(scale, MIN_SCALE), MAX_SCALE);
      const weight = smoothstep(torso.top, torso.top + (torso.hem - torso.top) * SHOULDER_BLEND, y);
      raw[row] = 1 + (scale - 1) * weight;
      measured += 1;
    }
    const lift = this.lift(garment, pose, { x: -base.c / scaleY, y: -base.d / scaleY }, scaleY);
    const liftXs = Float32Array.from(torso.tops, (sample) => sample.x);
    if (measured === 0) {
      raw.fill(1);
    }
    const filled = this.fill(raw);
    const smooth = new Float32Array(GRID_ROWS + 1);
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      const above = filled[Math.max(row - 1, 0)];
      const below = filled[Math.min(row + 1, GRID_ROWS)];
      smooth[row] = torso.halfWidths[row] > 0 ? 0.25 * above + 0.5 * filled[row] + 0.25 * below : 1;
    }
    if (previous) {
      for (let row = 0; row <= GRID_ROWS; row += 1) {
        smooth[row] = previous.rows[row] + (smooth[row] - previous.rows[row]) * SMOOTHING;
      }
      lift.forEach((value, index) => {
        lift[index] = previous.lift[index] + (value - previous.lift[index]) * SMOOTHING;
      });
    }
    const next: Fit = {
      center: torso.center,
      rows: smooth,
      lift,
      liftXs,
      liftFrom: torso.top,
      liftTo: torso.top + (torso.hem - torso.top) * LIFT_REACH,
    };
    this.fits.set(garment, next);
    return next;
  }

  private lift(garment: Garment, pose: BodyPose, up: Point, scaleY: number): Float32Array {
    const limit = pose.size * MAX_LIFT;
    const [left, right] = pose.shoulders;
    const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    return Float32Array.from(garment.torso.tops, (sample) => {
      const shoulder = sample.reach < 0 ? left : right;
      const start = {
        x: middle.x + (shoulder.x - middle.x) * Math.abs(sample.reach),
        y: middle.y + (shoulder.y - middle.y) * Math.abs(sample.reach),
      };
      if (this.inside(start.x, start.y) !== true) {
        return 0;
      }
      const garmentTop = sample.top * scaleY;
      const top = this.edge(start, up, garmentTop + limit);
      if (top === null) {
        return 0;
      }
      const needed = top + pose.size * LIFT_MARGIN - garmentTop;
      return Math.min(Math.max(needed, 0), limit) / scaleY;
    });
  }

  private edge(start: Point, direction: Point, limit: number): number | null {
    const step = 1 / this.scale;
    for (let distance = step; distance <= limit; distance += step) {
      const state = this.inside(start.x + direction.x * distance, start.y + direction.y * distance);
      if (state === null) {
        return null;
      }
      if (!state) {
        return distance;
      }
    }
    return limit;
  }

  private fill(raw: Float32Array): Float32Array {
    const filled = Float32Array.from(raw);
    for (let row = 0; row <= GRID_ROWS; row += 1) {
      if (!Number.isNaN(filled[row])) {
        continue;
      }
      let value = 1;
      for (let distance = 1; distance <= GRID_ROWS; distance += 1) {
        const above = raw[row - distance];
        const below = raw[row + distance];
        if (above !== undefined && !Number.isNaN(above)) {
          value = above;
          break;
        }
        if (below !== undefined && !Number.isNaN(below)) {
          value = below;
          break;
        }
      }
      filled[row] = value;
    }
    return filled;
  }

  private inside(x: number, y: number): boolean | null {
    const column = Math.floor(x * this.scale);
    const line = Math.floor(y * this.scale);
    if (!this.alpha || column < 0 || line < 0 || column >= this.width || line >= this.height) {
      return null;
    }
    return this.alpha[(line * this.width + column) * 4 + 3] >= INSIDE;
  }

  private nearArm(x: number, y: number): boolean {
    return this.arms.some((segment) => distanceToSegment(x, y, segment) < this.armRadius);
  }

  private reach(start: Point, dx: number, dy: number, limit: number): Reach | null {
    const step = 1 / this.scale;
    for (let distance = step; distance <= limit; distance += step) {
      const x = start.x + dx * distance;
      const y = start.y + dy * distance;
      const state = this.inside(x, y);
      if (state === null) {
        return null;
      }
      if (!state) {
        return { distance, blocked: false };
      }
      if (this.nearArm(x, y)) {
        return { distance, blocked: true };
      }
    }
    return { distance: limit, blocked: false };
  }
}
