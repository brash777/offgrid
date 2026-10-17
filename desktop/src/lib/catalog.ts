import type { ColorOption, ProductVariant } from '../api/catalog';

export const LOW_STOCK_THRESHOLD = 5;

export function colorsOf(variants: ProductVariant[]): ColorOption[] {
  const byHex = new Map<string, ColorOption>();
  variants.forEach((variant) => {
    if (!byHex.has(variant.colorHex)) {
      byHex.set(variant.colorHex, { name: variant.colorName, hex: variant.colorHex });
    }
  });
  return [...byHex.values()];
}

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'UNI'];

export function compareSizes(first: string, second: string): number {
  const firstIndex = SIZE_ORDER.indexOf(first);
  const secondIndex = SIZE_ORDER.indexOf(second);
  if (firstIndex >= 0 && secondIndex >= 0) {
    return firstIndex - secondIndex;
  }
  return first.localeCompare(second, 'es', { numeric: true });
}
