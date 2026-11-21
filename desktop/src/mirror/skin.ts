import type { Point, Sleeve } from './garment';

export const BONES = 5;

export interface Skin {
  rest: Float32Array;
  uv: Float32Array;
  weights: Float32Array;
  indices: Uint16Array;
}

const COLUMNS = 28;
const ROWS = 40;
const SEAM_FEATHER = 0.06;
const ELBOW_AT = 0.47;
const ELBOW_FEATHER = 0.1;
const SHOULDER_FROM = -0.04;
const SHOULDER_TO = 0.2;

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

export function buildSkin(width: number, height: number, span: number, sleeves: [Sleeve, Sleeve] | null): Skin {
  const count = (COLUMNS + 1) * (ROWS + 1);
  const rest = new Float32Array(count * 2);
  const uv = new Float32Array(count * 2);
  const weights = new Float32Array(count * BONES);
  const feather = span * SEAM_FEATHER;

  for (let row = 0; row <= ROWS; row += 1) {
    for (let column = 0; column <= COLUMNS; column += 1) {
      const vertex = row * (COLUMNS + 1) + column;
      const point = { x: (column / COLUMNS) * width, y: (row / ROWS) * height };
      rest[vertex * 2] = point.x;
      rest[vertex * 2 + 1] = point.y;
      uv[vertex * 2] = column / COLUMNS;
      uv[vertex * 2 + 1] = row / ROWS;
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

  const indices = new Uint16Array(COLUMNS * ROWS * 6);
  let cursor = 0;
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const topLeft = row * (COLUMNS + 1) + column;
      const bottomLeft = topLeft + COLUMNS + 1;
      indices.set([topLeft, bottomLeft, topLeft + 1, topLeft + 1, bottomLeft, bottomLeft + 1], cursor);
      cursor += 6;
    }
  }
  return { rest, uv, weights, indices };
}

export function deform(skin: Skin, bones: DOMMatrix[], target: Float32Array) {
  const { rest, weights } = skin;
  for (let vertex = 0; vertex < rest.length / 2; vertex += 1) {
    const x = rest[vertex * 2];
    const y = rest[vertex * 2 + 1];
    let outX = 0;
    let outY = 0;
    for (let bone = 0; bone < BONES; bone += 1) {
      const weight = weights[vertex * BONES + bone];
      if (weight > 0) {
        const matrix = bones[bone];
        outX += weight * (matrix.a * x + matrix.c * y + matrix.e);
        outY += weight * (matrix.b * x + matrix.d * y + matrix.f);
      }
    }
    target[vertex * 2] = outX;
    target[vertex * 2 + 1] = outY;
  }
}
