export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_THRESHOLDS: ReadonlyArray<readonly [number, Rarity]> = [
  [160_000, 'legendary'],
  [100_000, 'epic'],
  [50_000, 'rare'],
];

export function rarityForPrice(price: number): Rarity {
  return RARITY_THRESHOLDS.find(([minimum]) => price >= minimum)?.[1] ?? 'common';
}
