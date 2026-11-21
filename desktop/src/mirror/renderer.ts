import type { Landmark, MPMask, NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import type { Garment, Point, Sleeve } from './garment';
import { OneEuroFilter } from './oneEuroFilter';

export interface Frame {
  source: HTMLVideoElement | ImageBitmap;
  width: number;
  height: number;
  mirrored: boolean;
}

export type BodyStatus = 'found' | 'searching';

export type Cutout = (mask: MPMask, source: Frame['source']) => CanvasImageSource;

const LEFT_ARM = { shoulder: 11, elbow: 13, wrist: 15 };
const RIGHT_ARM = { shoulder: 12, elbow: 14, wrist: 16 };
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
const HEAD_HALF_WIDTH = 0.42;
const HAND_RADIUS = 0.11;
const HAND_MAX_DROP = 0.7;

const SLEEVE_DEAD_ZONE = (6 * Math.PI) / 180;
const SLEEVE_FAN_FROM = (20 * Math.PI) / 180;
const SLEEVE_FAN_STEPS = [1 / 3, 2 / 3];
const SHOULDER_CAP_RADIUS = 0.3;
const ELBOW_CAP_RADIUS = 0.16;
const ELBOW_AT = 0.47;
const ELBOW_OVERLAP = 0.04;
const MIN_SLEEVE_STRETCH = 0.75;
const MAX_SLEEVE_STRETCH = 1.25;
const SLEEVE_REACH = 1.04;

const FADE_MS = 200;
const ENTER_MS = 340;
const ENTER_SCALE = 0.92;
const LUMA_EVERY_FRAMES = 12;

interface Arm {
  upper: number;
  upperLength: number;
  lower: number | null;
  lowerLength: number | null;
}

interface ArmFilters {
  upper: AngleFilter;
  lower: AngleFilter;
  upperLength: OneEuroFilter;
  lowerLength: OneEuroFilter;
}

interface SleevePose {
  upper: DOMMatrix;
  lower: DOMMatrix;
  shoulder: DOMPoint;
  elbow: DOMPoint;
  length: number;
  shoulderBend: number;
  elbowBend: number;
}

interface Placement {
  x: number;
  y: number;
  angle: number;
  width: number;
  frontalWidth: number;
  torso: number | null;
  arms: [Arm | null, Arm | null];
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

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
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

function tracePolygon(context: CanvasRenderingContext2D, points: Point[]) {
  points.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
  context.closePath();
}

function makeArmFilters(): ArmFilters {
  return {
    upper: new AngleFilter(1.8, 1.2),
    lower: new AngleFilter(1.8, 1.2),
    upperLength: new OneEuroFilter(1, 0.006),
    lowerLength: new OneEuroFilter(1, 0.006),
  };
}

function resetArmFilters(filters: ArmFilters) {
  filters.upper.reset();
  filters.lower.reset();
  filters.upperLength.reset();
  filters.lowerLength.reset();
}

class AngleFilter {
  private readonly filter: OneEuroFilter;
  private last: number | null = null;

  constructor(minCutoff: number, beta: number) {
    this.filter = new OneEuroFilter(minCutoff, beta);
  }

  reset() {
    this.filter.reset();
    this.last = null;
  }

  next(raw: number, timeMs: number): number {
    const unwrapped = this.last === null ? raw : this.last + wrapAngle(raw - this.last);
    this.last = this.filter.next(unwrapped, timeMs);
    return this.last;
  }
}

export class MirrorRenderer {
  private readonly context: CanvasRenderingContext2D;
  private readonly person = makeCanvas();
  private readonly luma = makeCanvas();
  private readonly filters = {
    x: new OneEuroFilter(1.5, 0.01),
    y: new OneEuroFilter(1.5, 0.01),
    width: new OneEuroFilter(1, 0.006),
    frontalWidth: new OneEuroFilter(0.8, 0.004),
    torso: new OneEuroFilter(0.8, 0.004),
  };
  private readonly shoulderAngle = new AngleFilter(1.5, 1.5);
  private readonly armFilters: [ArmFilters, ArmFilters] = [makeArmFilters(), makeArmFilters()];
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
    this.shoulderAngle.reset();
    this.armFilters.forEach(resetArmFilters);
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

  private trackArm(frame: Frame, landmarks: NormalizedLandmark[], arm: typeof LEFT_ARM, filters: ArmFilters, now: number): Arm | null {
    const shoulder = landmarks[arm.shoulder];
    const elbow = landmarks[arm.elbow];
    const wrist = landmarks[arm.wrist];
    if (!visible(shoulder) || !visible(elbow)) {
      resetArmFilters(filters);
      return null;
    }
    const from = this.toDisplay(frame, shoulder);
    const bend = this.toDisplay(frame, elbow);
    const upper = filters.upper.next(Math.atan2(bend.y - from.y, bend.x - from.x), now);
    const upperLength = filters.upperLength.next(Math.hypot(bend.x - from.x, bend.y - from.y), now);
    if (!visible(wrist)) {
      filters.lower.reset();
      filters.lowerLength.reset();
      return { upper, upperLength, lower: null, lowerLength: null };
    }
    const to = this.toDisplay(frame, wrist);
    return {
      upper,
      upperLength,
      lower: filters.lower.next(Math.atan2(to.y - bend.y, to.x - bend.x), now),
      lowerLength: filters.lowerLength.next(Math.hypot(to.x - bend.x, to.y - bend.y), now),
    };
  }

  private track(
    frame: Frame,
    landmarks: NormalizedLandmark[] | undefined,
    world: Landmark[] | undefined,
    now: number,
  ): boolean {
    const first = landmarks?.[LEFT_ARM.shoulder];
    const second = landmarks?.[RIGHT_ARM.shoulder];
    if (!landmarks || !visible(first) || !visible(second)) {
      return false;
    }
    const a = this.toDisplay(frame, first);
    const b = this.toDisplay(frame, second);
    const firstIsLeft = a.x <= b.x;
    const [left, right] = firstIsLeft ? [a, b] : [b, a];
    const width = Math.hypot(right.x - left.x, right.y - left.y);
    if (width < frame.width * 0.04) {
      return false;
    }
    const angle = Math.atan2(right.y - left.y, right.x - left.x);
    const middle = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };

    let yawCos = 1;
    const worldFirst = world?.[LEFT_ARM.shoulder];
    const worldSecond = world?.[RIGHT_ARM.shoulder];
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

    const { filters } = this;
    if (torso === null) {
      filters.torso.reset();
    }
    const [leftArm, rightArm] = firstIsLeft ? [LEFT_ARM, RIGHT_ARM] : [RIGHT_ARM, LEFT_ARM];
    this.placement = {
      x: filters.x.next(middle.x, now),
      y: filters.y.next(middle.y, now),
      angle: this.shoulderAngle.next(angle, now),
      width: filters.width.next(width, now),
      frontalWidth: filters.frontalWidth.next(width / yawCos, now),
      torso: torso === null ? null : filters.torso.next(torso, now),
      arms: [
        this.trackArm(frame, landmarks, leftArm, this.armFilters[0], now),
        this.trackArm(frame, landmarks, rightArm, this.armFilters[1], now),
      ],
    };
    return true;
  }

  private garmentMatrix(garment: Garment, placement: Placement, pop: number): DOMMatrix {
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
    return new DOMMatrix()
      .translate(placement.x, placement.y)
      .rotate(degrees(placement.angle - tilt))
      .scale(scaleX * pop, scaleY * pop)
      .translate(-middle.x, -middle.y);
  }

  private sleevePose(base: DOMMatrix, sleeve: Sleeve, arm: Arm, shoulderTurn = 1, elbowTurn = 1): SleevePose {
    const pivot = base.transformPoint(new DOMPoint(sleeve.pivot.x, sleeve.pivot.y));
    const cuff = base.transformPoint(new DOMPoint(sleeve.cuff.x, sleeve.cuff.y));
    const rest = Math.atan2(cuff.y - pivot.y, cuff.x - pivot.x);
    const length = Math.hypot(cuff.x - pivot.x, cuff.y - pivot.y);
    const upperRest = length * ELBOW_AT;
    const lowerRest = length - upperRest;

    const shoulderBend = wrapAngle(arm.upper - rest);
    const magnitude = Math.abs(shoulderBend);
    const eased = magnitude < SLEEVE_DEAD_ZONE ? shoulderBend * (magnitude / SLEEVE_DEAD_ZONE) : shoulderBend;
    const upperAngle = rest + eased * shoulderTurn;
    const upperStretch = clamp((arm.upperLength * SLEEVE_REACH) / upperRest, MIN_SLEEVE_STRETCH, MAX_SLEEVE_STRETCH);
    const upperScale = 1 + (upperStretch - 1) * shoulderTurn;
    const upper = new DOMMatrix()
      .translate(pivot.x, pivot.y)
      .rotate(degrees(upperAngle))
      .scale(upperScale, 1)
      .rotate(degrees(-rest))
      .translate(-pivot.x, -pivot.y)
      .multiply(base);

    const elbowBend = arm.lower === null ? 0 : wrapAngle(arm.lower - upperAngle);
    const lowerAngle = upperAngle + elbowBend * elbowTurn;
    const lowerStretch =
      arm.lowerLength === null
        ? upperScale
        : clamp((arm.lowerLength * SLEEVE_REACH) / lowerRest, MIN_SLEEVE_STRETCH, MAX_SLEEVE_STRETCH);
    const lowerScale = upperScale + (lowerStretch - upperScale) * elbowTurn;
    const restElbow = { x: pivot.x + Math.cos(rest) * upperRest, y: pivot.y + Math.sin(rest) * upperRest };
    const elbow = new DOMPoint(
      pivot.x + Math.cos(upperAngle) * upperRest * upperScale,
      pivot.y + Math.sin(upperAngle) * upperRest * upperScale,
    );
    const lower = new DOMMatrix()
      .translate(elbow.x, elbow.y)
      .rotate(degrees(lowerAngle))
      .scale(lowerScale, 1)
      .rotate(degrees(-rest))
      .translate(-restElbow.x, -restElbow.y)
      .multiply(base);

    return { upper, lower, shoulder: pivot, elbow, length, shoulderBend, elbowBend };
  }

  private drawGarment(garment: Garment, placement: Placement, opacity: number, pop: number) {
    const { context } = this;
    const base = this.garmentMatrix(garment, placement, pop);
    const { image, sleeves } = garment;
    const moving = sleeves ? placement.arms.map((arm) => arm !== null) : [false, false];

    context.save();
    context.globalAlpha = opacity;
    context.filter = `brightness(${this.brightness.toFixed(3)})`;
    context.setTransform(base);
    if (!sleeves || !moving.some(Boolean)) {
      context.drawImage(image, 0, 0);
      context.restore();
      return;
    }

    context.save();
    context.beginPath();
    context.rect(-2, -2, image.width + 4, image.height + 4);
    sleeves.forEach((sleeve, index) => {
      if (moving[index]) {
        tracePolygon(context, sleeve.outline);
      }
    });
    context.clip('evenodd');
    context.drawImage(image, 0, 0);
    context.restore();

    sleeves.forEach((sleeve, index) => {
      const arm = placement.arms[index];
      if (!arm) {
        return;
      }
      const pose = this.sleevePose(base, sleeve, arm);
      if (Math.abs(pose.shoulderBend) > SLEEVE_FAN_FROM) {
        SLEEVE_FAN_STEPS.forEach((turn) => {
          const step = this.sleevePose(base, sleeve, arm, turn, 0);
          this.drawSleevePart(image, sleeve, step.upper, 'upper', pose.shoulder, pose.length * SHOULDER_CAP_RADIUS);
        });
      }
      this.drawSleevePart(image, sleeve, pose.upper, 'upper');
      if (Math.abs(pose.elbowBend) > SLEEVE_FAN_FROM) {
        SLEEVE_FAN_STEPS.forEach((turn) => {
          const step = this.sleevePose(base, sleeve, arm, 1, turn);
          this.drawSleevePart(image, sleeve, step.lower, 'lower', pose.elbow, pose.length * ELBOW_CAP_RADIUS);
        });
      }
      this.drawSleevePart(image, sleeve, pose.lower, 'lower');
    });
    context.restore();
  }

  private drawSleevePart(
    image: ImageBitmap,
    sleeve: Sleeve,
    matrix: DOMMatrix,
    part: 'upper' | 'lower',
    capCenter?: DOMPoint,
    capRadius = 0,
  ) {
    const { context } = this;
    const { pivot, cuff } = sleeve;
    const direction = { x: cuff.x - pivot.x, y: cuff.y - pivot.y };
    const normal = { x: -direction.y * 4, y: direction.x * 4 };
    const [from, to] = part === 'upper' ? [-2, ELBOW_AT + ELBOW_OVERLAP] : [ELBOW_AT - ELBOW_OVERLAP, 3];
    const along = (t: number) => ({ x: pivot.x + direction.x * t, y: pivot.y + direction.y * t });
    const start = along(from);
    const end = along(to);

    context.save();
    if (capCenter) {
      context.resetTransform();
      context.beginPath();
      context.arc(capCenter.x, capCenter.y, capRadius, 0, Math.PI * 2);
      context.clip();
    }
    context.setTransform(matrix);
    context.beginPath();
    tracePolygon(context, sleeve.outline);
    context.clip();
    context.beginPath();
    tracePolygon(context, [
      { x: start.x + normal.x, y: start.y + normal.y },
      { x: end.x + normal.x, y: end.y + normal.y },
      { x: end.x - normal.x, y: end.y - normal.y },
      { x: start.x - normal.x, y: start.y - normal.y },
    ]);
    context.clip();
    context.drawImage(image, 0, 0);
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
    const head = placement.frontalWidth * HEAD_HALF_WIDTH;
    const neckBase = placement.frontalWidth * NECK_RAISE;
    const headBase = placement.frontalWidth * HEAD_RAISE;

    const notch = at(-neck, headBase);
    const collar = at(0, headBase);
    context.save();
    context.beginPath();
    const start = at(-head, headBase);
    context.moveTo(start.x, start.y);
    context.lineTo(notch.x, notch.y);
    context.ellipse(collar.x, collar.y, neck, headBase - neckBase, placement.angle, Math.PI, 0, true);
    [at(head, headBase), at(head, far), at(-head, far)].forEach((point) => context.lineTo(point.x, point.y));
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
