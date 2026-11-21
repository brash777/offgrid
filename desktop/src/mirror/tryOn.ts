import type { EquipSlot } from '../api/catalog';

export const TRY_ON_CATEGORIES = ['buzos', 'chaquetas'];

export function canTryOn(product: { slot: EquipSlot; categorySlug: string }): boolean {
  return product.slot === 'TORSO' && TRY_ON_CATEGORIES.includes(product.categorySlug);
}
