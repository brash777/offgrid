export interface Point {
  x: number;
  y: number;
}

export interface Garment {
  url: string;
  image: ImageBitmap;
  leftShoulder: Point;
  rightShoulder: Point;
  hemY: number;
}

const ANALYSIS_WIDTH = 240;
const ALPHA_THRESHOLD = 128;
const SLOPE_WINDOW = 0.03;
const SHOULDER_SEARCH_DEPTH = 0.6;
const CORNER_SLOPE_RATIO = 0.4;
const MIN_SHOULDER_SPAN = 0.55;
const SHOULDER_INSET = 0.12;
const SHOULDER_DROP = 0.05;

const cache = new Map<string, Promise<Garment>>();

function measure(image: ImageBitmap): Omit<Garment, 'url' | 'image'> {
  const scale = ANALYSIS_WIDTH / image.width;
  const width = ANALYSIS_WIDTH;
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;

  const lefts = new Int32Array(height).fill(-1);
  const rights = new Int32Array(height).fill(-1);
  let top = -1;
  let bottom = -1;
  let widest = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD) {
        if (lefts[y] < 0) {
          lefts[y] = x;
        }
        rights[y] = x;
      }
    }
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
  const span = rights[shoulderRow] - lefts[shoulderRow];
  const inset = span * SHOULDER_INSET;
  const shoulderY = (shoulderRow + span * SHOULDER_DROP) / scale;

  return {
    leftShoulder: { x: (lefts[shoulderRow] + inset) / scale, y: shoulderY },
    rightShoulder: { x: (rights[shoulderRow] - inset) / scale, y: shoulderY },
    hemY: bottom / scale,
  };
}

async function load(url: string): Promise<Garment> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Garment image failed with ${response.status}`);
  }
  const image = await createImageBitmap(await response.blob());
  return { url, image, ...measure(image) };
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
