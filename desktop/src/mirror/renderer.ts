import type { Landmark, MPMask, NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { Backdrop } from './backdrop';
import { BodyFit, type BodyPose, type Segment } from './bodyFit';
import type { Garment, Point, Sleeve } from './garment';
import { MeshRenderer, type Shade } from './meshRenderer';
import { OneEuroFilter } from './oneEuroFilter';
import { SceneLight, type Lighting } from './scene';
import { liftAt } from './skin';

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
const FACE_POINTS = [0, 2, 5, 7, 8];
const MOUTH_POINTS = [9, 10];
const EYE_POINTS = [2, 5];
const MIN_VISIBILITY = 0.5;

const SHOULDER_FIT = 0.94;
const HEM_REACH = 1.12;
const MIN_TORSO_STRETCH = 0.85;
const MAX_TORSO_STRETCH = 1.2;
const MIN_YAW_COS = 0.55;
const NECK_HALF_WIDTH = 0.17;
const NECK_RAISE = 0.03;
const HEAD_RAISE = 0.22;
const HEAD_HALF_WIDTH = 0.42;
const MIN_HEAD_HALF_WIDTH = 0.22;
const HEAD_SPREAD = 1.5;
const HEAD_PADDING = 0.06;
const CHIN_BELOW = 0.8;
const CHIN_MARGIN = 0.03;
const JAW_RISE = 0.5;
const NECK_OVERLAP = 0.02;
const COLLAR_INSET = 0.015;
const CURVE_STEPS = 12;
const HAND_RADIUS = 0.11;
const HAND_MAX_DROP = 0.7;

const SLEEVE_DEAD_ZONE = (6 * Math.PI) / 180;
const ELBOW_AT = 0.47;
const EDGE_SOFTNESS = 0.009;
const MASK_SCALE = 0.5;
const MIN_SLEEVE_STRETCH = 0.75;
const MAX_SLEEVE_STRETCH = 1.25;
const SLEEVE_REACH = 1.04;

const ARM_RADIUS = 0.16;
const CHIN_WIDTH = 0.22;
const CHIN_HEIGHT = 0.085;
const CHIN_DROP = 0.03;
const CHIN_STRENGTH = 0.32;
const SHADOW_SCALE = 0.5;
const SHADOW_DISTANCE = 0.06;
const SHADOW_BLUR = 0.05;
const SHADOW_ALPHA = 0.6;
const COLLAR_SHADOW = 0.55;
const COLLAR_REACH = 1.4;
const COLLAR_FLATTEN = 0.6;

const FADE_MS = 200;
const BACKDROP_MS = 450;
const ENTER_MS = 340;
const ENTER_SCALE = 0.92;

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
}

interface Placement {
  x: number;
  y: number;
  angle: number;
  width: number;
  frontalWidth: number;
  torso: number | null;
  arms: [Arm | null, Arm | null];
  shoulders: [Point, Point];
}

interface Layer {
  garment: Garment;
  since: number;
}

interface Projected {
  along: number;
  up: number;
}

interface HeadSpan {
  center: number;
  half: number;
  chin: number | null;
  jaw: number;
}

function halfEllipse(centerAlong: number, centerUp: number, radiusAlong: number, radiusUp: number): [number, number][] {
  return Array.from({ length: CURVE_STEPS + 1 }, (_, step): [number, number] => {
    const turn = Math.PI + (Math.PI * step) / CURVE_STEPS;
    return [centerAlong + radiusAlong * Math.cos(turn), centerUp + radiusUp * Math.sin(turn)];
  });
}

function easeOut(progress: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(progress, 0), 1), 3);
}

function easeInOut(progress: number): number {
  const value = Math.min(Math.max(progress, 0), 1);
  return value * value * (3 - 2 * value);
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
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  return { canvas, context };
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
  private readonly region = makeCanvas();
  private readonly shadow = makeCanvas();
  private readonly backdrop = new Backdrop();
  private readonly scene = new SceneLight();
  private readonly bodyFit = new BodyFit();
  private readonly mesh: MeshRenderer | null;
  private readonly filters = {
    x: new OneEuroFilter(1.5, 0.01),
    y: new OneEuroFilter(1.5, 0.01),
    width: new OneEuroFilter(1, 0.006),
    frontalWidth: new OneEuroFilter(0.8, 0.004),
    torso: new OneEuroFilter(0.8, 0.004),
  };
  private readonly shoulderAngle = new AngleFilter(1.5, 1.5);
  private readonly headFilters = {
    center: new OneEuroFilter(1.2, 0.02),
    half: new OneEuroFilter(0.8, 0.01),
    chin: new OneEuroFilter(1.2, 0.02),
    jaw: new OneEuroFilter(1.2, 0.02),
  };
  private readonly armFilters: [ArmFilters, ArmFilters] = [makeArmFilters(), makeArmFilters()];
  private placement: Placement | null = null;
  private current: Layer | null = null;
  private previous: Layer | null = null;
  private bodyVisibleSince = 0;
  private bodyLostSince = 0;
  private bodyVisible = false;
  private neckLift = 0;
  private collarHeight: number | null = null;
  private backdropAmount = 0;
  private backdropTime: number | null = null;
  reducedMotion = false;
  portrait = true;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
    try {
      this.mesh = new MeshRenderer();
    } catch {
      this.mesh = null;
    }
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
    Object.values(this.headFilters).forEach((filter) => filter.reset());
    this.shoulderAngle.reset();
    this.armFilters.forEach(resetArmFilters);
    this.placement = null;
    this.bodyVisible = false;
    this.neckLift = 0;
    this.collarHeight = null;
    this.backdropAmount = 0;
    this.backdropTime = null;
    this.bodyFit.reset();
    this.scene.reset();
  }

  render(frame: Frame, result: PoseLandmarkerResult | null, now: number, cutout?: Cutout): BodyStatus {
    const { context } = this;
    const { width, height } = frame;
    if (context.canvas.width !== width || context.canvas.height !== height) {
      context.canvas.width = width;
      context.canvas.height = height;
    }
    const landmarks = result?.landmarks[0];
    const world = result?.worldLandmarks[0];
    const mask = result?.segmentationMasks?.[0];
    const cut = mask && cutout && landmarks ? cutout(mask, frame.source) : null;
    this.drawBackground(frame, cut, now);

    this.scene.update(frame, landmarks);
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
      const { placement } = this;
      const person = this.bodyVisible ? cut : null;
      const arms = landmarks ? this.armSegments(frame, landmarks) : [];
      const lighting = this.scene.lighting(!this.reducedMotion);
      this.bodyFit.capture(person, width, height, frame.mirrored);
      this.mesh?.begin(width, height, this.scene.canvas, lighting, this.shade(placement));
      if (this.previous) {
        const fadeOut = 1 - this.fade(now - this.previous.since);
        if (fadeOut <= 0) {
          this.previous = null;
        } else {
          this.drawGarment(this.previous.garment, placement, fadeOut * bodyOpacity, 1, arms, lighting);
        }
      }
      if (this.current) {
        const progress = this.reducedMotion ? 1 : easeOut((now - this.current.since) / ENTER_MS);
        const scale = ENTER_SCALE + (1 - ENTER_SCALE) * progress;
        this.drawGarment(this.current.garment, placement, progress * bodyOpacity, scale, arms, lighting);
      }
      if (this.mesh && (this.current || this.previous)) {
        this.drawShadow(frame, person, placement, lighting);
        context.drawImage(this.mesh.canvas, 0, 0);
      }
      if (person && landmarks && (this.current || this.previous)) {
        this.drawPersonOnTop(frame, person, landmarks, placement, now);
      }
    }
    return this.bodyVisible ? 'found' : 'searching';
  }

  private drawBackground(frame: Frame, cut: CanvasImageSource | null, now: number) {
    const { context } = this;
    const target = this.portrait && cut ? 1 : 0;
    const elapsed = this.backdropTime === null ? 0 : Math.max(now - this.backdropTime, 0);
    this.backdropTime = now;
    if (this.reducedMotion) {
      this.backdropAmount = target;
    } else if (target > this.backdropAmount) {
      this.backdropAmount = Math.min(target, this.backdropAmount + elapsed / BACKDROP_MS);
    } else {
      this.backdropAmount = Math.max(target, this.backdropAmount - elapsed / BACKDROP_MS);
    }
    if (target > 0 && cut) {
      this.backdrop.build(frame, cut);
    }
    const amount = easeInOut(this.backdropAmount);
    if (amount < 1 || !this.backdrop.ready) {
      this.drawSource(context, frame);
    }
    if (amount > 0 && this.backdrop.ready) {
      this.backdrop.draw(context, frame.width, frame.height, amount);
      if (cut) {
        context.save();
        context.globalAlpha = amount;
        this.drawSource(context, frame, cut);
        context.restore();
      }
    }
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
      shoulders: [left, right],
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

  private sleevePose(base: DOMMatrix, sleeve: Sleeve, arm: Arm): SleevePose {
    const pivot = base.transformPoint(new DOMPoint(sleeve.pivot.x, sleeve.pivot.y));
    const cuff = base.transformPoint(new DOMPoint(sleeve.cuff.x, sleeve.cuff.y));
    const rest = Math.atan2(cuff.y - pivot.y, cuff.x - pivot.x);
    const length = Math.hypot(cuff.x - pivot.x, cuff.y - pivot.y);
    const upperRest = length * ELBOW_AT;
    const lowerRest = length - upperRest;

    const shoulderBend = wrapAngle(arm.upper - rest);
    const magnitude = Math.abs(shoulderBend);
    const upperAngle = rest + (magnitude < SLEEVE_DEAD_ZONE ? shoulderBend * (magnitude / SLEEVE_DEAD_ZONE) : shoulderBend);
    const upperScale = clamp((arm.upperLength * SLEEVE_REACH) / upperRest, MIN_SLEEVE_STRETCH, MAX_SLEEVE_STRETCH);
    const upper = new DOMMatrix()
      .translate(pivot.x, pivot.y)
      .rotate(degrees(upperAngle))
      .scale(upperScale, 1)
      .rotate(degrees(-rest))
      .translate(-pivot.x, -pivot.y)
      .multiply(base);

    const lowerAngle = arm.lower === null ? upperAngle : upperAngle + wrapAngle(arm.lower - upperAngle);
    const lowerScale =
      arm.lowerLength === null
        ? upperScale
        : clamp((arm.lowerLength * SLEEVE_REACH) / lowerRest, MIN_SLEEVE_STRETCH, MAX_SLEEVE_STRETCH);
    const restElbow = { x: pivot.x + Math.cos(rest) * upperRest, y: pivot.y + Math.sin(rest) * upperRest };
    const elbow = {
      x: pivot.x + Math.cos(upperAngle) * upperRest * upperScale,
      y: pivot.y + Math.sin(upperAngle) * upperRest * upperScale,
    };
    const lower = new DOMMatrix()
      .translate(elbow.x, elbow.y)
      .rotate(degrees(lowerAngle))
      .scale(lowerScale, 1)
      .rotate(degrees(-rest))
      .translate(-restElbow.x, -restElbow.y)
      .multiply(base);
    return { upper, lower };
  }

  private armSegments(frame: Frame, landmarks: NormalizedLandmark[]): Segment[] {
    const segments: Segment[] = [];
    [LEFT_ARM, RIGHT_ARM].forEach((arm) => {
      const joints = [landmarks[arm.shoulder], landmarks[arm.elbow], landmarks[arm.wrist]];
      for (let index = 1; index < joints.length; index += 1) {
        const from = joints[index - 1];
        const to = joints[index];
        if (!visible(from) || !visible(to)) {
          break;
        }
        segments.push({ from: this.toDisplay(frame, from), to: this.toDisplay(frame, to) });
      }
    });
    return segments;
  }

  private shade(placement: Placement): Shade {
    const up = { x: Math.sin(placement.angle), y: -Math.cos(placement.angle) };
    const size = placement.frontalWidth;
    const neckline = this.collarHeight ?? size * NECK_RAISE + this.neckLift;
    const height = neckline - size * CHIN_DROP;
    return {
      neck: [
        placement.x + up.x * height,
        placement.y + up.y * height,
        placement.width * CHIN_WIDTH,
        placement.frontalWidth * CHIN_HEIGHT,
      ],
      neckStrength: CHIN_STRENGTH,
    };
  }

  private drawShadow(frame: Frame, cut: CanvasImageSource | null, placement: Placement, lighting: Lighting) {
    if (!this.mesh) {
      return;
    }
    const { canvas, context: shadow } = this.shadow;
    const width = Math.max(1, Math.round(frame.width * SHADOW_SCALE));
    const height = Math.max(1, Math.round(frame.height * SHADOW_SCALE));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const distance = placement.frontalWidth * SHADOW_DISTANCE * SHADOW_SCALE;
    const [lightX, lightY] = lighting.light;
    shadow.save();
    shadow.clearRect(0, 0, width, height);
    shadow.filter = `blur(${(placement.frontalWidth * SHADOW_BLUR * SHADOW_SCALE).toFixed(1)}px)`;
    shadow.drawImage(this.mesh.canvas, -lightX * distance, -lightY * distance, width, height);
    shadow.filter = 'none';
    shadow.globalCompositeOperation = 'source-in';
    shadow.fillStyle = `rgba(0, 0, 0, ${SHADOW_ALPHA})`;
    shadow.fillRect(0, 0, width, height);
    if (cut) {
      shadow.globalCompositeOperation = 'destination-in';
      if (frame.mirrored) {
        shadow.translate(width, 0);
        shadow.scale(-1, 1);
      }
      shadow.drawImage(cut, 0, 0, width, height);
    }
    shadow.restore();
    this.context.drawImage(canvas, 0, 0, frame.width, frame.height);
  }

  private drawGarment(
    garment: Garment,
    placement: Placement,
    opacity: number,
    pop: number,
    arms: Segment[],
    lighting: Lighting,
  ) {
    const base = this.garmentMatrix(garment, placement, pop);
    if (this.mesh) {
      const bones = [base];
      [0, 1].forEach((side) => {
        const arm = placement.arms[side];
        const sleeve = garment.sleeves?.[side];
        const pose = arm && sleeve ? this.sleevePose(base, sleeve, arm) : { upper: base, lower: base };
        bones.push(pose.upper, pose.lower);
      });
      const pose: BodyPose = {
        arms,
        armRadius: placement.width * ARM_RADIUS,
        shoulders: placement.shoulders,
        size: placement.frontalWidth,
      };
      const fit = this.bodyFit.fit(garment, base, pose);
      if (garment === this.current?.garment) {
        const scaleY = Math.hypot(base.c, base.d);
        this.neckLift = fit ? liftAt(fit, garment.torso.center) * scaleY : 0;
        this.collarHeight = garment.neckline.hooded ? null : garment.neckline.collar * scaleY + this.neckLift;
      }
      this.mesh.draw(garment, bones, fit, opacity);
      return;
    }
    const { context } = this;
    context.save();
    context.globalAlpha = opacity;
    context.filter = `brightness(${lighting.exposure.toFixed(3)})`;
    context.setTransform(base);
    context.drawImage(garment.image, 0, 0);
    context.restore();
  }

  private drawPersonOnTop(
    frame: Frame,
    cutout: CanvasImageSource,
    landmarks: NormalizedLandmark[],
    placement: Placement,
    now: number,
  ) {
    const { person, region } = this;
    if (person.canvas.width !== frame.width || person.canvas.height !== frame.height) {
      person.canvas.width = frame.width;
      person.canvas.height = frame.height;
    }
    const regionWidth = Math.round(frame.width * MASK_SCALE);
    const regionHeight = Math.round(frame.height * MASK_SCALE);
    if (region.canvas.width !== regionWidth || region.canvas.height !== regionHeight) {
      region.canvas.width = regionWidth;
      region.canvas.height = regionHeight;
    }

    const along = { x: Math.cos(placement.angle), y: Math.sin(placement.angle) };
    const up = { x: along.y, y: -along.x };
    const far = (frame.width + frame.height) * 2;
    const at = (alongBy: number, upBy: number): Point => ({
      x: placement.x + along.x * alongBy + up.x * upBy,
      y: placement.y + along.y * alongBy + up.y * upBy,
    });
    const size = placement.frontalWidth;
    const neck = placement.width * NECK_HALF_WIDTH;
    const neckBase = size * NECK_RAISE + this.neckLift;
    const headBase = size * HEAD_RAISE;
    const head = this.headSpan(frame, landmarks, placement, along, up, now);
    const neckBottom = this.collarHeight === null ? neckBase : Math.max(neckBase, this.collarHeight - size * COLLAR_INSET);
    const neckTop = head.chin === null ? headBase : head.chin + size * NECK_OVERLAP;
    const radius = placement.frontalWidth * HAND_RADIUS;
    const reach = (placement.torso ?? placement.frontalWidth * 1.4) * HAND_MAX_DROP;
    const hands = HAND_POINTS.map((index) => landmarks[index])
      .filter(visible)
      .map((landmark) => this.toDisplay(frame, landmark))
      .filter((point) => (point.x - placement.x) * -up.x + (point.y - placement.y) * -up.y < reach);

    const mask = region.context;
    mask.save();
    mask.clearRect(0, 0, regionWidth, regionHeight);
    mask.scale(MASK_SCALE, MASK_SCALE);
    mask.filter = `blur(${(placement.frontalWidth * EDGE_SOFTNESS * MASK_SCALE).toFixed(1)}px)`;
    mask.fillStyle = 'black';
    mask.beginPath();
    const polygon = (points: [number, number][]) => {
      points.forEach(([alongBy, upBy], index) => {
        const point = at(alongBy, upBy);
        if (index === 0) {
          mask.moveTo(point.x, point.y);
        } else {
          mask.lineTo(point.x, point.y);
        }
      });
      mask.closePath();
    };
    if (head.chin === null) {
      polygon([
        [head.center - head.half, headBase],
        [head.center + head.half, headBase],
        [head.center + head.half, far],
        [head.center - head.half, far],
      ]);
    } else {
      polygon([
        ...halfEllipse(head.center, head.jaw, head.half, head.jaw - head.chin),
        [head.center + head.half, far],
        [head.center - head.half, far],
      ]);
    }
    if (neckTop > neckBottom) {
      const depth = Math.min(neck, neckTop - neckBottom);
      const topCenter = head.chin === null ? 0 : head.center;
      polygon([
        ...halfEllipse(0, neckBottom + depth, neck, depth),
        [topCenter + neck, neckTop],
        [topCenter - neck, neckTop],
      ]);
    }
    mask.fill('nonzero');
    if (hands.length > 0) {
      mask.beginPath();
      hands.forEach((point) => {
        mask.moveTo(point.x + radius, point.y);
        mask.arc(point.x, point.y, radius, 0, Math.PI * 2);
      });
      mask.fill();
    }
    mask.restore();

    person.context.globalCompositeOperation = 'copy';
    this.drawSource(person.context, frame, cutout);
    person.context.globalCompositeOperation = 'destination-in';
    person.context.drawImage(region.canvas, 0, 0, frame.width, frame.height);
    const below = head.chin === null ? null : [at(-far, head.chin), at(far, head.chin), at(far, -far), at(-far, -far)];
    this.shadeCollar(person.context, at(0, neckBottom), neck * COLLAR_REACH, placement.angle, below);
    person.context.globalCompositeOperation = 'source-over';
    this.context.drawImage(person.canvas, 0, 0);
  }

  private headSpan(
    frame: Frame,
    landmarks: NormalizedLandmark[],
    placement: Placement,
    along: Point,
    up: Point,
    now: number,
  ): HeadSpan {
    const project = (index: number): Projected | null => {
      const landmark = landmarks[index];
      if (!visible(landmark)) {
        return null;
      }
      const point = this.toDisplay(frame, landmark);
      const dx = point.x - placement.x;
      const dy = point.y - placement.y;
      return { along: dx * along.x + dy * along.y, up: dx * up.x + dy * up.y };
    };
    const size = placement.frontalWidth;
    const filters = this.headFilters;
    const face = FACE_POINTS.map(project).filter((point): point is Projected => point !== null);
    if (face.length < 2) {
      Object.values(filters).forEach((filter) => filter.reset());
      return { center: 0, half: size * HEAD_HALF_WIDTH, chin: null, jaw: 0 };
    }
    const lowest = Math.min(...face.map((point) => point.along));
    const highest = Math.max(...face.map((point) => point.along));
    const half = clamp(((highest - lowest) / 2) * HEAD_SPREAD + size * HEAD_PADDING, size * MIN_HEAD_HALF_WIDTH, size * HEAD_HALF_WIDTH);
    const mouth = MOUTH_POINTS.map(project);
    const eyes = EYE_POINTS.map(project);
    const center = filters.center.next((lowest + highest) / 2, now);
    const width = filters.half.next(half, now);
    if (!mouth[0] || !mouth[1] || !eyes[0] || !eyes[1]) {
      filters.chin.reset();
      filters.jaw.reset();
      return { center, half: width, chin: null, jaw: 0 };
    }
    const mouthUp = (mouth[0].up + mouth[1].up) / 2;
    const eyesUp = (eyes[0].up + eyes[1].up) / 2;
    const chin = filters.chin.next(mouthUp - (eyesUp - mouthUp) * CHIN_BELOW - size * CHIN_MARGIN, now);
    const jaw = Math.max(filters.jaw.next(mouthUp + (eyesUp - mouthUp) * JAW_RISE, now), chin + 1);
    return { center, half: width, chin, jaw };
  }

  private shadeCollar(
    context: OffscreenCanvasRenderingContext2D,
    collar: Point,
    radius: number,
    angle: number,
    area: Point[] | null,
  ) {
    context.save();
    if (area) {
      context.beginPath();
      area.forEach((point, index) => (index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y)));
      context.closePath();
      context.clip();
    }
    context.globalCompositeOperation = 'source-atop';
    context.translate(collar.x, collar.y);
    context.rotate(angle);
    context.scale(1, COLLAR_FLATTEN);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${COLLAR_SHADOW})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  }
}
