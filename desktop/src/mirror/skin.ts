import type { Point, Sleeve } from './garment';

export const BONES = 5;
export const GRID_COLUMNS = 28;
export const GRID_ROWS = 40;

export interface Skin {
  rest: Float32Array;
  uv: Float32Array;
  weights: Float32Array;
  indices: Uint16Array;
}

export interface Crown {
  line: number;
  squash: number;
}

export interface Fit {
  center: number;
  rows: Float32Array;
  lift: Float32Array;
  liftXs: Float32Array;
  liftFrom: number;
  liftTo: number;
}

const SEAM_FEATHER = 0.06;
const ELBOW_AT = 0.47;
const ELBOW_FEATHER = 0.1;
const SHOULDER_FROM = -0.04;
const SHOULDER_TO = 0.2;
const SLEEVE_LAYER = 0.5;

function smoothstep(from: number, to: number, value: number): number {
  const progress = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return progress * progress * (3 - 2 * progress);
}

function inside(point: Point, polygon: Point[]): boolean {
  let result = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      result = !result;
    }
  }
  return result;
}

function distanceToEdges(point: Point, polygon: Point[]): number {
  let best = Infinity;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[previous];
    const b = polygon[index];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0), 1);
    best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
  }
  return best;
}

function sleeveWeights(point: Point, sleeve: Sleeve, feather: number): [number, number] {
  const distance = distanceToEdges(point, sleeve.outline);
  const signed = inside(point, sleeve.outline) ? distance : -distance;
  const dx = sleeve.cuff.x - sleeve.pivot.x;
  const dy = sleeve.cuff.y - sleeve.pivot.y;
  const along = ((point.x - sleeve.pivot.x) * dx + (point.y - sleeve.pivot.y) * dy) / (dx * dx + dy * dy);
  const belongs = smoothstep(-feather, feather, signed) * smoothstep(SHOULDER_FROM, SHOULDER_TO, along);
  const lower = smoothstep(ELBOW_AT - ELBOW_FEATHER, ELBOW_AT + ELBOW_FEATHER, along);
  return [belongs * (1 - lower), belongs * lower];
}

export function buildSkin(
  width: number,
  height: number,
  span: number,
  sleeves: [Sleeve, Sleeve] | null,
  crown: Crown,
): Skin {
  const count = (GRID_COLUMNS + 1) * (GRID_ROWS + 1);
  const rest = new Float32Array(count * 2);
  const uv = new Float32Array(count * 2);
  const weights = new Float32Array(count * BONES);
  const feather = span * SEAM_FEATHER;

  for (let row = 0; row <= GRID_ROWS; row += 1) {
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const vertex = row * (GRID_COLUMNS + 1) + column;
      const point = { x: (column / GRID_COLUMNS) * width, y: (row / GRID_ROWS) * height };
      rest[vertex * 2] = point.x;
      rest[vertex * 2 + 1] = point.y < crown.line ? crown.line - (crown.line - point.y) * crown.squash : point.y;
      uv[vertex * 2] = column / GRID_COLUMNS;
      uv[vertex * 2 + 1] = row / GRID_ROWS;
      const [leftUpper, leftLower] = sleeves ? sleeveWeights(point, sleeves[0], feather) : [0, 0];
      const [rightUpper, rightLower] = sleeves ? sleeveWeights(point, sleeves[1], feather) : [0, 0];
      const sleeveTotal = Math.min(leftUpper + leftLower + rightUpper + rightLower, 1);
      const offset = vertex * BONES;
      weights[offset] = 1 - sleeveTotal;
      weights[offset + 1] = leftUpper;
      weights[offset + 2] = leftLower;
      weights[offset + 3] = rightUpper;
      weights[offset + 4] = rightLower;
    }
  }

  const torso: number[] = [];
  const arms: number[] = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const topLeft = row * (GRID_COLUMNS + 1) + column;
      const bottomLeft = topLeft + GRID_COLUMNS + 1;
      const corners = [topLeft, topLeft + 1, bottomLeft, bottomLeft + 1];
      const sleeve = corners.reduce((sum, vertex) => sum + 1 - weights[vertex * BONES], 0) / corners.length;
      (sleeve > SLEEVE_LAYER ? arms : torso).push(topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1);
    }
  }
  return { rest, uv, weights, indices: Uint16Array.from([...torso, ...arms]) };
}

export function surfaceFrames(positions: Float32Array, target: Float32Array) {
  const stride = GRID_COLUMNS + 1;
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const above = Math.max(row - 1, 0);
    const below = Math.min(row + 1, GRID_ROWS);
    const down = (below - above) / GRID_ROWS;
    for (let column = 0; column <= GRID_COLUMNS; column += 1) {
      const left = Math.max(column - 1, 0);
      const right = Math.min(column + 1, GRID_COLUMNS);
      const across = (right - left) / GRID_COLUMNS;
      const vertex = row * stride + column;
      const rightIndex = (row * stride + right) * 2;
      const leftIndex = (row * stride + left) * 2;
      const belowIndex = (below * stride + column) * 2;
      const aboveIndex = (above * stride + column) * 2;
      target[vertex * 4] = (positions[rightIndex] - positions[leftIndex]) / across;
      target[vertex * 4 + 1] = (positions[rightIndex + 1] - positions[leftIndex + 1]) / across;
      target[vertex * 4 + 2] = (positions[belowIndex] - positions[aboveIndex]) / down;
      target[vertex * 4 + 3] = (positions[belowIndex + 1] - positions[aboveIndex + 1]) / down;
    }
  }
}

export function liftAt(fit: Fit, x: number): number {
  const { lift, liftXs } = fit;
  if (x <= liftXs[0]) {
    return lift[0];
  }
  for (let index = 1; index < liftXs.length; index += 1) {
    if (x <= liftXs[index]) {
      const progress = (x - liftXs[index - 1]) / Math.max(liftXs[index] - liftXs[index - 1], 0.0001);
      return lift[index - 1] + (lift[index] - lift[index - 1]) * progress;
    }
  }
  return lift[lift.length - 1];
}

function lifted(fit: Fit, x: number, y: number): number {
  return y - liftAt(fit, x) * (1 - smoothstep(fit.liftFrom, fit.liftTo, y));
}

export function deform(skin: Skin, bones: DOMMatrix[], target: Float32Array, fit: Fit | null) {
  const { rest, weights } = skin;
  for (let vertex = 0; vertex < rest.length / 2; vertex += 1) {
    const x = rest[vertex * 2];
    const y = fit ? lifted(fit, x, rest[vertex * 2 + 1]) : rest[vertex * 2 + 1];
    const torsoX = fit ? fit.center + (x - fit.center) * fit.rows[Math.floor(vertex / (GRID_COLUMNS + 1))] : x;
    let outX = 0;
    let outY = 0;
    for (let bone = 0; bone < BONES; bone += 1) {
      const weight = weights[vertex * BONES + bone];
      if (weight > 0) {
        const matrix = bones[bone];
        const boneX = bone === 0 ? torsoX : x;
        outX += weight * (matrix.a * boneX + matrix.c * y + matrix.e);
        outY += weight * (matrix.b * boneX + matrix.d * y + matrix.f);
      }
    }
    target[vertex * 2] = outX;
    target[vertex * 2 + 1] = outY;
  }
}
