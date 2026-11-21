export interface Relief {
  data: Uint8Array;
  width: number;
  height: number;
  radius: number;
}

export interface Crease {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const RELIEF_WIDTH = 320;
const ALPHA_THRESHOLD = 128;
const SMALL_RADIUS = 0.09;
const LARGE_RADIUS = 0.34;
const SMALL_SHARE = 0.55;
const EDGE_FEATHER = 1.6;
const CREASE_WIDTH = 1.5;
const SMOOTHING = 1.6;
const FAR = 1e20;

function lowerEnvelope(input: Float64Array, length: number, output: Float64Array, hull: Int32Array, bounds: Float64Array) {
  let top = 0;
  hull[0] = 0;
  bounds[0] = -FAR;
  bounds[1] = FAR;
  const meet = (q: number, p: number) => (input[q] + q * q - (input[p] + p * p)) / (2 * q - 2 * p);
  for (let q = 1; q < length; q += 1) {
    let crossing = meet(q, hull[top]);
    while (crossing <= bounds[top]) {
      top -= 1;
      crossing = meet(q, hull[top]);
    }
    top += 1;
    hull[top] = q;
    bounds[top] = crossing;
    bounds[top + 1] = FAR;
  }
  top = 0;
  for (let q = 0; q < length; q += 1) {
    while (bounds[top + 1] < q) {
      top += 1;
    }
    output[q] = (q - hull[top]) ** 2 + input[hull[top]];
  }
}

function distanceInside(solid: Uint8Array, width: number, height: number): Float32Array {
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const field = new Float64Array(paddedWidth * paddedHeight);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      field[(y + 1) * paddedWidth + x + 1] = solid[y * width + x] ? FAR : 0;
    }
  }
  const longest = Math.max(paddedWidth, paddedHeight);
  const input = new Float64Array(longest);
  const output = new Float64Array(longest);
  const hull = new Int32Array(longest);
  const bounds = new Float64Array(longest + 1);
  for (let x = 0; x < paddedWidth; x += 1) {
    for (let y = 0; y < paddedHeight; y += 1) {
      input[y] = field[y * paddedWidth + x];
    }
    lowerEnvelope(input, paddedHeight, output, hull, bounds);
    for (let y = 0; y < paddedHeight; y += 1) {
      field[y * paddedWidth + x] = output[y];
    }
  }
  for (let y = 0; y < paddedHeight; y += 1) {
    const row = y * paddedWidth;
    for (let x = 0; x < paddedWidth; x += 1) {
      input[x] = field[row + x];
    }
    lowerEnvelope(input, paddedWidth, output, hull, bounds);
    for (let x = 0; x < paddedWidth; x += 1) {
      field[row + x] = output[x];
    }
  }
  const distances = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      distances[y * width + x] = Math.sqrt(field[(y + 1) * paddedWidth + x + 1]);
    }
  }
  return distances;
}

function carve(solid: Uint8Array, width: number, height: number, creases: Crease[], scale: number): Uint8Array {
  const carved = Uint8Array.from(solid);
  creases.forEach(({ from, to }) => {
    const length = Math.hypot(to.x - from.x, to.y - from.y) * scale;
    const steps = Math.max(1, Math.ceil(length * 2));
    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const x = (from.x + (to.x - from.x) * progress) * scale;
      const y = (from.y + (to.y - from.y) * progress) * scale;
      for (let dy = -CREASE_WIDTH; dy <= CREASE_WIDTH; dy += 1) {
        for (let dx = -CREASE_WIDTH; dx <= CREASE_WIDTH; dx += 1) {
          const column = Math.round(x + dx);
          const row = Math.round(y + dy);
          if (column >= 0 && row >= 0 && column < width && row < height && dx * dx + dy * dy <= CREASE_WIDTH * CREASE_WIDTH) {
            carved[row * width + column] = 0;
          }
        }
      }
    }
  });
  return carved;
}

function gaussian(sigma: number): Float32Array {
  const radius = Math.ceil(sigma * 2.5);
  const weights = Float32Array.from({ length: radius * 2 + 1 }, (_, index) => Math.exp(-((index - radius) ** 2) / (2 * sigma * sigma)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

function smooth(field: Float32Array, width: number, height: number, sigma: number): Float32Array {
  const kernel = gaussian(sigma);
  const radius = (kernel.length - 1) / 2;
  const across = new Float32Array(field.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let tap = -radius; tap <= radius; tap += 1) {
        sum += kernel[tap + radius] * field[y * width + Math.min(Math.max(x + tap, 0), width - 1)];
      }
      across[y * width + x] = sum;
    }
  }
  const result = new Float32Array(field.length);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let tap = -radius; tap <= radius; tap += 1) {
        sum += kernel[tap + radius] * across[Math.min(Math.max(y + tap, 0), height - 1) * width + x];
      }
      result[y * width + x] = sum;
    }
  }
  return result;
}

function dome(progress: number): number {
  const rest = 1 - Math.min(progress, 1);
  return Math.sqrt(1 - rest * rest);
}

export function buildRelief(image: ImageBitmap, span: number, creases: Crease[]): Relief {
  const scale = RELIEF_WIDTH / image.width;
  const width = RELIEF_WIDTH;
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas 2D is not available');
  }
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const solid = new Uint8Array(width * height);
  for (let index = 0; index < solid.length; index += 1) {
    solid[index] = pixels[index * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
  }
  const distances = distanceInside(solid, width, height);
  const parts = creases.length > 0 ? distanceInside(carve(solid, width, height, creases, scale), width, height) : distances;
  const small = Math.max(span * scale * SMALL_RADIUS, 1);
  const large = Math.max(span * scale * LARGE_RADIUS, 1);
  const lifts = new Float32Array(width * height);
  for (let index = 0; index < distances.length; index += 1) {
    lifts[index] = SMALL_SHARE * dome(parts[index] / small) + (1 - SMALL_SHARE) * dome(distances[index] / large);
  }
  const smoothed = smooth(lifts, width, height, SMOOTHING);
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < distances.length; index += 1) {
    const scaled = Math.min(Math.max(smoothed[index], 0), 1) * 255;
    const coarse = Math.floor(scaled);
    const edge = Math.min(Math.max((distances[index] - 0.5) / EDGE_FEATHER, 0), 1);
    data[index * 4] = coarse;
    data[index * 4 + 1] = Math.round(edge * 255);
    data[index * 4 + 2] = Math.round((scaled - coarse) * 255);
    data[index * 4 + 3] = 255;
  }
  return { data, width, height, radius: small / scale };
}
