import { buildRelief, type Crease, type Relief } from './relief';
import { buildSkin, GRID_ROWS, type Skin } from './skin';

export interface Point {
  x: number;
  y: number;
}

export interface Sleeve {
  pivot: Point;
  cuff: Point;
  outline: Point[];
}

export interface Torso {
  center: number;
  top: number;
  hem: number;
  halfWidths: Float32Array;
  tops: TopSample[];
}

export interface TopSample {
  x: number;
  reach: number;
  top: number;
}

export interface Neckline {
  hooded: boolean;
  collar: number;
}

export interface Garment {
  url: string;
  image: ImageBitmap;
  leftShoulder: Point;
  rightShoulder: Point;
  hemY: number;
  sleeves: [Sleeve, Sleeve] | null;
  skin: Skin;
  torso: Torso;
  neckline: Neckline;
  relief: Relief;
}

interface Seams {
  armpit: number;
  last: number;
  seamLeft: number;
  seamRight: number;
  innerLeft: (y: number) => number;
  innerRight: (y: number) => number;
}

interface SleeveFit {
  sleeves: [Sleeve, Sleeve];
  seams: Seams;
}

const ANALYSIS_WIDTH = 240;
const ALPHA_THRESHOLD = 128;
const SLOPE_WINDOW = 0.03;
const SHOULDER_SEARCH_DEPTH = 0.6;
const CORNER_SLOPE_RATIO = 0.4;
const MIN_SHOULDER_SPAN = 0.55;
const SHOULDER_INSET = 0.14;
const SHOULDER_SLOPE = 1;
const SHOULDER_WALK = 0.1;
const SHOULDER_DROP = 0.05;
const MIN_GAP_PIXELS = 2;
const MIN_SLEEVE_ROWS = 0.15;
const SLEEVE_SEAM_INSET = 0.5;
const ESTIMATED_SLEEVE_WIDTH = 0.2;
const ARMPIT_DROP = 0.28;
const GAP_SEARCH_FROM = 0.15;
const MAX_ROW_BREAK = 3;
const MIN_SLEEVE_DROP = 0.6;
const SLEEVE_END_DROP = 0.1;
const SLEEVE_END_HOLD = 0.15;
const SLEEVE_END_SHARE = 0.9;
const MAX_SLEEVE_TILT = (40 * Math.PI) / 180;
const MAX_INWARD_CUFF = 0.05;
const CUFF_AT = 0.92;
const CROWN_LIMIT = 0.28;
const HOOD_AREA = 0.38;
const TOP_SAMPLES = [-1, -0.7, 0.7, 1];

const cache = new Map<string, Promise<Garment>>();

interface Silhouette {
  width: number;
  height: number;
  lefts: Int32Array;
  rights: Int32Array;
  innerLefts: Int32Array;
  innerRights: Int32Array;
}

function trace(pixels: Uint8ClampedArray, width: number, height: number): Silhouette {
  const lefts = new Int32Array(height).fill(-1);
  const rights = new Int32Array(height).fill(-1);
  const innerLefts = new Int32Array(height).fill(-1);
  const innerRights = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y += 1) {
    const runs: [number, number][] = [];
    let start = -1;
    for (let x = 0; x <= width; x += 1) {
      const solid = x < width && pixels[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD;
      if (solid && start < 0) {
        start = x;
      } else if (!solid && start >= 0) {
        const last = runs[runs.length - 1];
        if (last && start - last[1] <= MIN_GAP_PIXELS) {
          last[1] = x - 1;
        } else {
          runs.push([start, x - 1]);
        }
        start = -1;
      }
    }
    if (runs.length === 0) {
      continue;
    }
    lefts[y] = runs[0][0];
    rights[y] = runs[runs.length - 1][1];
    if (runs.length >= 3) {
      innerLefts[y] = runs[0][1];
      innerRights[y] = runs[runs.length - 1][0];
    }
  }
  return { width, height, lefts, rights, innerLefts, innerRights };
}

function fitLine(rows: number[], xs: Int32Array): (y: number) => number {
  const count = rows.length;
  const meanY = rows.reduce((sum, row) => sum + row, 0) / count;
  const meanX = rows.reduce((sum, row) => sum + xs[row], 0) / count;
  let covariance = 0;
  let variance = 0;
  rows.forEach((row) => {
    covariance += (row - meanY) * (xs[row] - meanX);
    variance += (row - meanY) ** 2;
  });
  const slope = variance > 0 ? covariance / variance : 0;
  return (y) => meanX + slope * (y - meanY);
}

function longestBlock(rows: number[]): number[] {
  let best: number[] = [];
  let current: number[] = [];
  rows.forEach((row) => {
    if (current.length > 0 && row - current[current.length - 1] > MAX_ROW_BREAK) {
      current = [];
    }
    current.push(row);
    if (current.length > best.length) {
      best = current;
    }
  });
  return best;
}

function sleeveEnd(shape: Silhouette, from: number, bottom: number): number {
  const width = (row: number) => (shape.lefts[row] < 0 ? 0 : shape.rights[row] - shape.lefts[row]);
  let widestRow = from;
  for (let row = from; row <= bottom; row += 1) {
    if (width(row) > width(widestRow)) {
      widestRow = row;
    }
  }
  const limit = width(widestRow) * (1 - SLEEVE_END_DROP);
  const hold = Math.max(1, Math.round((bottom - from) * SLEEVE_END_HOLD));
  for (let row = widestRow; row + hold <= bottom; row += 1) {
    if (width(row) >= limit) {
      continue;
    }
    let narrow = 0;
    for (let next = row; next <= row + hold; next += 1) {
      narrow += width(next) < limit ? 1 : 0;
    }
    if (narrow >= hold * SLEEVE_END_SHARE) {
      return row;
    }
  }
  return shape.height;
}

function sleeveCuts(shape: Silhouette, shoulderRow: number, bottom: number, useGaps: boolean, end: number) {
  const span = shape.rights[shoulderRow] - shape.lefts[shoulderRow];
  const searchFrom = Math.round(shoulderRow + (bottom - shoulderRow) * GAP_SEARCH_FROM);
  const gapRows: number[] = [];
  for (let row = searchFrom; row <= Math.min(bottom, end); row += 1) {
    if (shape.innerLefts[row] >= 0) {
      gapRows.push(row);
    }
  }
  const block = longestBlock(gapRows);
  if (useGaps && block.length >= (bottom - shoulderRow) * MIN_SLEEVE_ROWS) {
    return { rows: block, innerLefts: shape.innerLefts, innerRights: shape.innerRights };
  }
  const sleeveWidth = Math.round(span * ESTIMATED_SLEEVE_WIDTH);
  const rows: number[] = [];
  for (let row = Math.round(shoulderRow + span * ARMPIT_DROP); row <= Math.min(bottom, end); row += 1) {
    if (shape.lefts[row] >= 0) {
      rows.push(row);
    }
  }
  return {
    rows,
    innerLefts: shape.lefts.map((x) => (x < 0 ? x : x + sleeveWidth)),
    innerRights: shape.rights.map((x) => (x < 0 ? x : x - sleeveWidth)),
  };
}

function hangsDown(sleeve: Sleeve, outward: number, span: number): boolean {
  const { pivot, cuff } = sleeve;
  const drop = cuff.y - pivot.y;
  return (
    drop >= span * MIN_SLEEVE_DROP &&
    Math.abs(Math.atan2(cuff.x - pivot.x, drop)) <= MAX_SLEEVE_TILT &&
    (cuff.x - pivot.x) * outward >= -span * MAX_INWARD_CUFF
  );
}

function findSleeves(
  shape: Silhouette,
  shoulderRow: number,
  bottom: number,
  pivots: [Point, Point],
): SleeveFit | null {
  return cutSleeves(shape, shoulderRow, bottom, pivots, true) ?? cutSleeves(shape, shoulderRow, bottom, pivots, false);
}

function cutSleeves(
  shape: Silhouette,
  shoulderRow: number,
  bottom: number,
  pivots: [Point, Point],
  useGaps: boolean,
): SleeveFit | null {
  const span = shape.rights[shoulderRow] - shape.lefts[shoulderRow];
  const end = sleeveEnd(shape, Math.round(shoulderRow + span * ARMPIT_DROP), bottom);
  const { rows, innerLefts, innerRights } = sleeveCuts(shape, shoulderRow, bottom, useGaps, end);
  if (rows.length < 2) {
    return null;
  }
  const armpit = Math.min(Math.round(shoulderRow + span * ARMPIT_DROP), rows[0]);
  const lowest = rows[Math.floor((rows.length - 1) * CUFF_AT)];
  const innerLeft = fitLine(rows, innerLefts);
  const innerRight = fitLine(rows, innerRights);
  const seamLeft = shape.lefts[shoulderRow] + (pivots[0].x - shape.lefts[shoulderRow]) * SLEEVE_SEAM_INSET;
  const seamRight = shape.rights[shoulderRow] - (shape.rights[shoulderRow] - pivots[1].x) * SLEEVE_SEAM_INSET;

  const left: Sleeve = {
    pivot: pivots[0],
    cuff: { x: (shape.lefts[lowest] + innerLeft(lowest)) / 2, y: lowest },
    outline: [
      { x: -1, y: shoulderRow },
      { x: seamLeft, y: shoulderRow },
      { x: innerLeft(armpit), y: armpit },
      { x: innerLeft(end), y: end },
      { x: -1, y: end },
    ],
  };
  const right: Sleeve = {
    pivot: pivots[1],
    cuff: { x: (shape.rights[lowest] + innerRight(lowest)) / 2, y: lowest },
    outline: [
      { x: shape.width + 1, y: shoulderRow },
      { x: seamRight, y: shoulderRow },
      { x: innerRight(armpit), y: armpit },
      { x: innerRight(end), y: end },
      { x: shape.width + 1, y: end },
    ],
  };
  if (!hangsDown(left, -1, span) || !hangsDown(right, 1, span)) {
    return null;
  }
  return {
    sleeves: [left, right],
    seams: { armpit, last: rows[rows.length - 1], seamLeft, seamRight, innerLeft, innerRight },
  };
}

function torsoProfile(
  shape: Silhouette,
  shoulderRow: number,
  bottom: number,
  pivots: [Point, Point],
  seams: Seams | null,
  scale: number,
  imageHeight: number,
): Torso {
  const center = (pivots[0].x + pivots[1].x) / 2;
  const halfWidths = new Float32Array(GRID_ROWS + 1);
  for (let row = 0; row <= GRID_ROWS; row += 1) {
    const y = Math.round((row / GRID_ROWS) * imageHeight * scale);
    if (y < shoulderRow || y > bottom || shape.lefts[y] < 0) {
      continue;
    }
    let left = shape.lefts[y];
    let right = shape.rights[y];
    if (seams && y <= seams.last) {
      const progress = Math.min((y - shoulderRow) / Math.max(seams.armpit - shoulderRow, 1), 1);
      const innerLeft =
        y < seams.armpit ? seams.seamLeft + (seams.innerLeft(seams.armpit) - seams.seamLeft) * progress : seams.innerLeft(y);
      const innerRight =
        y < seams.armpit ? seams.seamRight + (seams.innerRight(seams.armpit) - seams.seamRight) * progress : seams.innerRight(y);
      left = Math.max(left, innerLeft);
      right = Math.min(right, innerRight);
    }
    halfWidths[row] = Math.max((right - left) / 2, 0) / scale;
  }
  return { center: center / scale, top: shoulderRow / scale, hem: bottom / scale, halfWidths, tops: [] };
}

function columnTop(shape: Silhouette, x: number, from: number, to: number): number {
  for (let row = from; row <= to; row += 1) {
    if (shape.lefts[row] >= 0 && shape.lefts[row] <= x && shape.rights[row] >= x) {
      return row;
    }
  }
  return to;
}

function scalePoint(point: Point, factor: number): Point {
  return { x: point.x / factor, y: point.y / factor };
}

function scaleSleeve(sleeve: Sleeve, factor: number): Sleeve {
  return {
    pivot: scalePoint(sleeve.pivot, factor),
    cuff: scalePoint(sleeve.cuff, factor),
    outline: sleeve.outline.map((point) => scalePoint(point, factor)),
  };
}

function creasesOf(sleeves: [Sleeve, Sleeve] | null): Crease[] {
  return (sleeves ?? []).map((sleeve) => ({ from: sleeve.outline[2], to: sleeve.outline[3] }));
}

function measure(image: ImageBitmap): Omit<Garment, 'url' | 'image' | 'relief'> & { span: number; creases: Crease[] } {
  const scale = ANALYSIS_WIDTH / image.width;
  const width = ANALYSIS_WIDTH;
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  context.drawImage(image, 0, 0, width, height);
  const shape = trace(context.getImageData(0, 0, width, height).data, width, height);
  const { lefts, rights } = shape;

  let top = -1;
  let bottom = -1;
  let widest = 0;
  for (let y = 0; y < height; y += 1) {
    if (lefts[y] >= 0) {
      top = top < 0 ? y : top;
      bottom = y;
      widest = Math.max(widest, rights[y] - lefts[y]);
    }
  }
  if (top < 0) {
    throw new Error('The garment image is empty');
  }

  const halfWidth = (row: number) => (lefts[row] < 0 ? 0 : (rights[row] - lefts[row]) / 2);
  const step = Math.max(2, Math.round((bottom - top) * SLOPE_WINDOW));
  const searchEnd = top + Math.round((bottom - top) * SHOULDER_SEARCH_DEPTH);
  let steepest = 0;
  let steepestRow = top;
  for (let row = top; row + step <= searchEnd; row += 1) {
    const slope = halfWidth(row + step) - halfWidth(row);
    if (slope > steepest) {
      steepest = slope;
      steepestRow = row;
    }
  }
  let shoulderRow = steepestRow;
  while (shoulderRow + step <= searchEnd && halfWidth(shoulderRow + step) - halfWidth(shoulderRow) >= steepest * CORNER_SLOPE_RATIO) {
    shoulderRow += 1;
  }
  shoulderRow = Math.min(shoulderRow + Math.round(step / 2), bottom);
  if (rights[shoulderRow] - lefts[shoulderRow] < widest * MIN_SHOULDER_SPAN) {
    shoulderRow = top;
    while (shoulderRow < bottom && rights[shoulderRow] - lefts[shoulderRow] < widest * MIN_SHOULDER_SPAN) {
      shoulderRow += 1;
    }
  }
  const walkEnd = Math.min(shoulderRow + Math.round((bottom - top) * SHOULDER_WALK), bottom - step);
  while (shoulderRow < walkEnd && (halfWidth(shoulderRow + step) - halfWidth(shoulderRow)) / step >= SHOULDER_SLOPE) {
    shoulderRow += 1;
  }
  const span = rights[shoulderRow] - lefts[shoulderRow];
  const inset = span * SHOULDER_INSET;
  const shoulderY = shoulderRow + span * SHOULDER_DROP;
  const pivots: [Point, Point] = [
    { x: lefts[shoulderRow] + inset, y: shoulderY },
    { x: rights[shoulderRow] - inset, y: shoulderY },
  ];
  const fit = findSleeves(shape, shoulderRow, bottom, pivots);
  const sleeves = fit?.sleeves ?? null;
  const crown = shoulderRow - top;
  const squash = crown > span * CROWN_LIMIT ? (span * CROWN_LIMIT) / crown : 1;
  const pivotSpan = pivots[1].x - pivots[0].x;
  let crownArea = 0;
  for (let row = top; row < shoulderRow; row += 1) {
    crownArea += lefts[row] < 0 ? 0 : rights[row] - lefts[row];
  }
  const lowered = (row: number) => (row < shoulderRow ? shoulderRow - (shoulderRow - row) * squash : row);
  const torso = torsoProfile(shape, shoulderRow, bottom, pivots, fit?.seams ?? null, scale, image.height);
  const middle = (pivots[0].x + pivots[1].x) / 2;
  torso.tops = TOP_SAMPLES.map((reach) => {
    const x = middle + ((reach < 0 ? pivots[0].x : pivots[1].x) - middle) * Math.abs(reach);
    return { x: x / scale, reach, top: (shoulderY - lowered(columnTop(shape, x, top, shoulderRow))) / scale };
  });

  const scaledSleeves: [Sleeve, Sleeve] | null = sleeves && [scaleSleeve(sleeves[0], scale), scaleSleeve(sleeves[1], scale)];
  return {
    leftShoulder: scalePoint(pivots[0], scale),
    rightShoulder: scalePoint(pivots[1], scale),
    hemY: bottom / scale,
    sleeves: scaledSleeves,
    skin: buildSkin(image.width, image.height, span / scale, scaledSleeves, { line: shoulderRow / scale, squash }),
    torso,
    neckline: {
      hooded: crownArea > pivotSpan * pivotSpan * HOOD_AREA,
      collar: (shoulderY - lowered(columnTop(shape, middle, top, shoulderRow))) / scale,
    },
    span: span / scale,
    creases: creasesOf(scaledSleeves),
  };
}

async function load(url: string): Promise<Garment> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Garment image failed with ${response.status}`);
  }
  const image = await createImageBitmap(await response.blob());
  const { span, creases, ...shape } = measure(image);
  return { url, image, ...shape, relief: buildRelief(image, span, creases) };
}

export function loadGarment(url: string): Promise<Garment> {
  let pending = cache.get(url);
  if (!pending) {
    pending = load(url);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}
