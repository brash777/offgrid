import type { Landmark, MPMask, NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { Garment, Point } from './garment';
import { OneEuroFilter } from './oneEuroFilter';

export interface Frame {
  source: HTMLVideoElement | ImageBitmap;
  width: number;
  height: number;
  mirrored: boolean;
}

export type BodyStatus = 'found' | 'searching';

export type Cutout = (mask: MPMask, source: Frame['source']) => CanvasImageSource;

const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const HAND_POINTS = [17, 18, 19, 20, 21, 22];
const MIN_VISIBILITY = 0.5;

const SHOULDER_FIT = 0.94;
const HEM_REACH = 1.12;
const MIN_TORSO_STRETCH = 0.85;
const MAX_TORSO_STRETCH = 1.2;
const MIN_YAW_COS = 0.55;
const NECK_HALF_WIDTH = 0.19;
const NECK_RAISE = 0.03;
const HEAD_RAISE = 0.22;
const HAND_RADIUS = 0.11;
const HAND_MAX_DROP = 0.7;

const FADE_MS = 200;
const ENTER_MS = 340;
const ENTER_SCALE = 0.92;
const LUMA_EVERY_FRAMES = 12;

interface Placement {
  x: number;
  y: number;
  angle: number;
  width: number;
  frontalWidth: number;
  torso: number | null;
}

interface Layer {
  garment: Garment;
  since: number;
}

function easeOut(progress: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(progress, 0), 1), 3);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function visible(landmark: NormalizedLandmark | undefined): landmark is NormalizedLandmark {
  return landmark !== undefined && (landmark.visibility ?? 0) >= MIN_VISIBILITY;
}

function makeCanvas(): { canvas: OffscreenCanvas; context: OffscreenCanvasRenderingContext2D } {
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  return { canvas, context };
}

export class MirrorRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly person = makeCanvas();
  private readonly luma = makeCanvas();
  private readonly filters = {
    x: new OneEuroFilter(1.5, 0.01),
    y: new OneEuroFilter(1.5, 0.01),
    angle: new OneEuroFilter(1.5, 1.5),
    width: new OneEuroFilter(1, 0.006),
    frontalWidth: new OneEuroFilter(0.8, 0.004),
    torso: new OneEuroFilter(0.8, 0.004),
  };
  private placement: Placement | null = null;
  private current: Layer | null = null;
  private previous: Layer | null = null;
  private bodyVisibleSince = 0;
  private bodyLostSince = 0;
  private bodyVisible = false;
  private brightness = 1;
  private frameCount = 0;
  reducedMotion = false;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  setGarment(garment: Garment | null, now: number) {
    if (this.current?.garment === garment) {
      return;
    }
    this.previous = this.current ? { garment: this.current.garment, since: now } : null;
    this.current = garment ? { garment, since: now } : null;
  }

  reset() {
    Object.values(this.filters).forEach((filter) => filter.reset());
    this.placement = null;
    this.bodyVisible = false;
  }

  render(frame: Frame, result: PoseLandmarkerResult | null, now: number, cutout?: Cutout): BodyStatus {
    const { context } = this;
    const { width, height } = frame;
    if (context.canvas.width !== width || context.canvas.height !== height) {
      context.canvas.width = width;
      context.canvas.height = height;
    }
    this.drawSource(context, frame);
    this.updateBrightness(frame);

    const landmarks = result?.landmarks[0];
    const world = result?.worldLandmarks[0];
    const found = this.track(frame, landmarks, world, now);
    if (found !== this.bodyVisible) {
      this.bodyVisible = found;
      if (found) {
        this.bodyVisibleSince = now;
      } else {
        this.bodyLostSince = now;
      }
    }

    const bodyOpacity = this.bodyVisible
      ? this.fade(now - this.bodyVisibleSince)
      : 1 - this.fade(now - this.bodyLostSince);
    if (this.placement && bodyOpacity > 0) {
      if (this.previous) {
        const fadeOut = 1 - this.fade(now - this.previous.since);
        if (fadeOut <= 0) {
          this.previous = null;
        } else {
          this.drawGarment(this.previous.garment, this.placement, fadeOut * bodyOpacity, 1);
        }
      }
      if (this.current) {
        const progress = this.reducedMotion ? 1 : easeOut((now - this.current.since) / ENTER_MS);
        const scale = ENTER_SCALE + (1 - ENTER_SCALE) * progress;
        this.drawGarment(this.current.garment, this.placement, progress * bodyOpacity, scale);
      }
      const mask = result?.segmentationMasks?.[0];
      if (mask && cutout && landmarks && this.bodyVisible && (this.current || this.previous)) {
        this.drawPersonOnTop(frame, cutout(mask, frame.source), landmarks, this.placement);
      }
    }
    this.frameCount += 1;
    return this.bodyVisible ? 'found' : 'searching';
  }

  private fade(elapsed: number): number {
    return this.reducedMotion ? 1 : clamp(elapsed / FADE_MS, 0, 1);
  }

  private toDisplay(frame: Frame, landmark: NormalizedLandmark): Point {
    const x = frame.mirrored ? 1 - landmark.x : landmark.x;
    return { x: x * frame.width, y: landmark.y * frame.height };
  }

  private drawSource(
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    frame: Frame,
    image: CanvasImageSource = frame.source,
  ) {
    context.save();
    if (frame.mirrored) {
      context.translate(frame.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(image, 0, 0, frame.width, frame.height);
    context.restore();
  }

  private updateBrightness(frame: Frame) {
    if (this.frameCount % LUMA_EVERY_FRAMES !== 0) {
      return;
    }
    const { canvas, context } = this.luma;
    canvas.width = 16;
    canvas.height = 9;
    context.drawImage(frame.source, 0, 0, 16, 9);
    const pixels = context.getImageData(0, 0, 16, 9).data;
    let total = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      total += 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
    }
    const luma = total / (pixels.length / 4) / 255;
    const target = clamp(0.68 + 0.6 * luma, 0.78, 1.06);
    this.brightness += (target - this.brightness) * 0.35;
  }

  private track(
    frame: Frame,
    landmarks: NormalizedLandmark[] | undefined,
    world: Landmark[] | undefined,
    now: number,
  ): boolean {
    const first = landmarks?.[LEFT_SHOULDER];
    const second = landmarks?.[RIGHT_SHOULDER];
    if (!landmarks || !visible(first) || !visible(second)) {
      return false;
    }
    const a = this.toDisplay(frame, first);
    const b = this.toDisplay(frame, second);
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    const width = Math.hypot(right.x - left.x, right.y - left.y);
    if (width < frame.width * 0.04) {
      return false;
    }
    const angle = Math.atan2(right.y - left.y, right.x - left.x);
    const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };

    let yawCos = 1;
    const worldFirst = world?.[LEFT_SHOULDER];
    const worldSecond = world?.[RIGHT_SHOULDER];
    if (worldFirst && worldSecond) {
      const across = Math.abs(worldFirst.x - worldSecond.x);
      const depth = Math.abs(worldFirst.z - worldSecond.z);
      yawCos = clamp(across / Math.max(Math.hypot(across, depth), 0.0001), MIN_YAW_COS, 1);
    }

    let torso: number | null = null;
    const leftHip = landmarks[LEFT_HIP];
    const rightHip = landmarks[RIGHT_HIP];
    if (visible(leftHip) && visible(rightHip) && leftHip.y < 1 && rightHip.y < 1) {
      const hipA = this.toDisplay(frame, leftHip);
      const hipB = this.toDisplay(frame, rightHip);
      const hipMiddle = { x: (hipA.x + hipB.x) / 2, y: (hipA.y + hipB.y) / 2 };
      const along = (hipMiddle.x - middle.x) * -Math.sin(angle) + (hipMiddle.y - middle.y) * Math.cos(angle);
      torso = along > width * 0.6 ? along : null;
    }

    const filters = this.filters;
    if (torso === null) {
      filters.torso.reset();
    }
    this.placement = {
      x: filters.x.next(middle.x, now),
      y: filters.y.next(middle.y, now),
      angle: filters.angle.next(angle, now),
      width: filters.width.next(width, now),
      frontalWidth: filters.frontalWidth.next(width / yawCos, now),
      torso: torso === null ? null : filters.torso.next(torso, now),
    };
    return true;
  }

  private drawGarment(garment: Garment, placement: Placement, opacity: number, pop: number) {
    const { context } = this;
    const { leftShoulder, rightShoulder, hemY } = garment;
    const span = Math.hypot(rightShoulder.x - leftShoulder.x, rightShoulder.y - leftShoulder.y);
    const tilt = Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x);
    const middle = { x: (leftShoulder.x + rightShoulder.x) / 2, y: (leftShoulder.y + rightShoulder.y) / 2 };
    const scaleX = (placement.width * SHOULDER_FIT) / span;
    let scaleY = (placement.frontalWidth * SHOULDER_FIT) / span;
    if (placement.torso !== null) {
      const stretch = (placement.torso * HEM_REACH) / (hemY - middle.y);
      scaleY = clamp(stretch, scaleY * MIN_TORSO_STRETCH, scaleY * MAX_TORSO_STRETCH);
    }

    context.save();
    context.globalAlpha = opacity;
    context.filter = `brightness(${this.brightness.toFixed(3)})`;
    context.translate(placement.x, placement.y);
    context.rotate(placement.angle - tilt);
    context.scale(scaleX * pop, scaleY * pop);
    context.drawImage(garment.image, -middle.x, -middle.y);
    context.restore();
  }

  private drawPersonOnTop(frame: Frame, cutout: CanvasImageSource, landmarks: NormalizedLandmark[], placement: Placement) {
    const person = this.person;
    if (person.canvas.width !== frame.width || person.canvas.height !== frame.height) {
      person.canvas.width = frame.width;
      person.canvas.height = frame.height;
    }
    person.context.clearRect(0, 0, frame.width, frame.height);
    this.drawSource(person.context, frame, cutout);

    const { context } = this;
    const along = { x: Math.cos(placement.angle), y: Math.sin(placement.angle) };
    const up = { x: along.y, y: -along.x };
    const far = (frame.width + frame.height) * 2;
    const at = (alongBy: number, upBy: number): Point => ({
      x: placement.x + along.x * alongBy + up.x * upBy,
      y: placement.y + along.y * alongBy + up.y * upBy,
    });
    const neck = placement.width * NECK_HALF_WIDTH;
    const neckBase = placement.frontalWidth * NECK_RAISE;
    const headBase = placement.frontalWidth * HEAD_RAISE;

    const start = at(-far, headBase);
    const notch = at(-neck, headBase);
    const collar = at(0, headBase);
    const corners = [at(far, headBase), at(far, far), at(-far, far)];
    context.save();
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(notch.x, notch.y);
    context.ellipse(collar.x, collar.y, neck, headBase - neckBase, placement.angle, Math.PI, 0, true);
    corners.forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.clip();
    context.drawImage(person.canvas, 0, 0);
    context.restore();

    const radius = placement.frontalWidth * HAND_RADIUS;
    const reach = (placement.torso ?? placement.frontalWidth * 1.4) * HAND_MAX_DROP;
    const hands = HAND_POINTS.map((index) => landmarks[index])
      .filter(visible)
      .map((landmark) => this.toDisplay(frame, landmark))
      .filter((point) => (point.x - placement.x) * -up.x + (point.y - placement.y) * -up.y < reach);
    if (hands.length > 0) {
      context.save();
      context.beginPath();
      hands.forEach((point) => {
        context.moveTo(point.x + radius, point.y);
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      });
      context.clip();
      context.drawImage(person.canvas, 0, 0);
      context.restore();
    }
  }
}
