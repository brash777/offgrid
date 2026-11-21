import type { NormalizedLandmark } from '@mediapipe/tasks-vision';

export type Vector3 = [number, number, number];

export interface Lighting {
  exposure: number;
  black: number;
  white: number;
  tint: Vector3;
  light: Vector3;
  grain: number;
  seed: number;
}

interface SceneFrame {
  source: CanvasImageSource;
  width: number;
  height: number;
  mirrored: boolean;
}

const SCENE_WIDTH = 64;
const ANALYZE_EVERY = 6;
const FACE_SIZE = 12;
const NOSE = 0;
const LEFT_EAR = 7;
const RIGHT_EAR = 8;
const MIN_VISIBILITY = 0.5;
const FACE_GAIN = 3;
const MAX_SIDE_LIGHT = 0.85;
const LIGHT_HEIGHT = -0.55;
const LIGHT_FRONT = 0.8;
const BLACK_SHARE = 0.5;
const MAX_BLACK = 0.2;
const WHITE_SHARE = 0.6;
const MAX_WHITE_DROP = 0.25;
const TINT_SHARE = 0.35;
const MAX_TINT = 0.15;
const ADAPT = 0.35;
const LIVE_GRAIN = 0.028;
const STILL_GRAIN = 0.014;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function luma(red: number, green: number, blue: number): number {
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function context2d(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  return context;
}

export class SceneLight {
  readonly canvas = new OffscreenCanvas(SCENE_WIDTH, 36);
  private readonly context = context2d(this.canvas);
  private readonly face = new OffscreenCanvas(FACE_SIZE, FACE_SIZE);
  private readonly faceContext = context2d(this.face);
  private exposure = 1;
  private black = 0;
  private white = 1;
  private tint: Vector3 = [1, 1, 1];
  private side = 0;
  private count = 0;
  private live = true;

  reset() {
    this.count = 0;
  }

  update(frame: SceneFrame, landmarks: NormalizedLandmark[] | undefined) {
    const height = Math.max(1, Math.round((SCENE_WIDTH * frame.height) / frame.width));
    if (this.canvas.height !== height) {
      this.canvas.height = height;
    }
    const { context } = this;
    context.save();
    if (frame.mirrored) {
      context.translate(SCENE_WIDTH, 0);
      context.scale(-1, 1);
    }
    context.drawImage(frame.source, 0, 0, SCENE_WIDTH, height);
    context.restore();
    this.live = frame.source instanceof HTMLVideoElement;
    if (this.count % ANALYZE_EVERY === 0) {
      const first = this.count === 0;
      this.analyze(height, first);
      this.readFace(frame, landmarks, first);
    }
    this.count += 1;
  }

  lighting(animated: boolean): Lighting {
    const length = Math.hypot(this.side, LIGHT_HEIGHT, LIGHT_FRONT);
    return {
      exposure: this.exposure,
      black: this.black,
      white: this.white,
      tint: this.tint,
      light: [this.side / length, LIGHT_HEIGHT / length, LIGHT_FRONT / length],
      grain: this.live ? LIVE_GRAIN : STILL_GRAIN,
      seed: this.live && animated ? this.count % 997 : 0,
    };
  }

  private adapt(current: number, target: number, first: boolean): number {
    return first ? target : current + (target - current) * ADAPT;
  }

  private analyze(height: number, first: boolean) {
    const pixels = this.context.getImageData(0, 0, SCENE_WIDTH, height).data;
    const histogram = new Uint32Array(64);
    let red = 0;
    let green = 0;
    let blue = 0;
    const count = pixels.length / 4;
    for (let index = 0; index < pixels.length; index += 4) {
      red += pixels[index];
      green += pixels[index + 1];
      blue += pixels[index + 2];
      histogram[Math.min(63, Math.floor(luma(pixels[index], pixels[index + 1], pixels[index + 2]) / 4))] += 1;
    }
    const percentile = (share: number) => {
      let seen = 0;
      for (let bin = 0; bin < histogram.length; bin += 1) {
        seen += histogram[bin];
        if (seen >= share * count) {
          return ((bin + 0.5) * 4) / 255;
        }
      }
      return 1;
    };
    const mean = luma(red, green, blue) / count / 255;
    this.exposure = this.adapt(this.exposure, clamp(0.68 + 0.6 * mean, 0.78, 1.06), first);
    this.black = this.adapt(this.black, clamp(percentile(0.04), 0, MAX_BLACK) * BLACK_SHARE, first);
    this.white = this.adapt(this.white, 1 - clamp(1 - percentile(0.98), 0, MAX_WHITE_DROP) * WHITE_SHARE, first);

    const average = Math.max(luma(red, green, blue), 1);
    const raw: Vector3 = [red / average, green / average, blue / average];
    const mixed = raw.map((channel) => 1 + clamp(channel - 1, -MAX_TINT, MAX_TINT) * TINT_SHARE) as Vector3;
    const weight = luma(mixed[0], mixed[1], mixed[2]);
    this.tint = this.tint.map((channel, index) => this.adapt(channel, mixed[index] / weight, first)) as Vector3;
  }

  private readFace(frame: SceneFrame, landmarks: NormalizedLandmark[] | undefined, first: boolean) {
    const nose = landmarks?.[NOSE];
    const leftEar = landmarks?.[LEFT_EAR];
    const rightEar = landmarks?.[RIGHT_EAR];
    const seen = [nose, leftEar, rightEar].every((point) => (point?.visibility ?? 0) >= MIN_VISIBILITY);
    const half = seen && leftEar && rightEar ? Math.abs(leftEar.x - rightEar.x) * frame.width * 0.4 : 0;
    if (!nose || half < 6) {
      this.side = this.adapt(this.side, 0, first);
      return;
    }
    const centerX = nose.x * frame.width;
    const centerY = nose.y * frame.height + half * 0.3;
    this.faceContext.drawImage(frame.source, centerX - half, centerY - half, half * 2, half * 2, 0, 0, FACE_SIZE, FACE_SIZE);
    const pixels = this.faceContext.getImageData(0, 0, FACE_SIZE, FACE_SIZE).data;
    let left = 0;
    let right = 0;
    for (let y = 0; y < FACE_SIZE; y += 1) {
      for (let x = 0; x < FACE_SIZE; x += 1) {
        const index = (y * FACE_SIZE + x) * 4;
        const value = luma(pixels[index], pixels[index + 1], pixels[index + 2]);
        if (x < FACE_SIZE / 2) {
          left += value;
        } else {
          right += value;
        }
      }
    }
    const balance = (right - left) / (right + left + 1);
    const side = clamp(balance * FACE_GAIN * (frame.mirrored ? -1 : 1), -MAX_SIDE_LIGHT, MAX_SIDE_LIGHT);
    this.side = this.adapt(this.side, side, first);
  }
}
