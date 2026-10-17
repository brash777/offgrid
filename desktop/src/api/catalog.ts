import { getJson } from './http';

export type EquipSlot = 'HEAD' | 'TORSO' | 'LEGS' | 'FEET' | 'ACCESSORY';

export interface ColorOption {
  name: string;
  hex: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  basePrice: number;
  slot: EquipSlot;
  categorySlug: string;
  categoryName: string;
  thumbnailUrl: string | null;
  totalStock: number;
  colors: ColorOption[];
}

export interface ProductVariant {
  id: string;
  size: string;
  colorName: string;
  colorHex: string;
  sku: string;
  price: number;
  availableStock: number;
}

export interface ProductDetail {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  slot: EquipSlot;
  categorySlug: string;
  categoryName: string;
  active: boolean;
  imageUrls: string[];
  variants: ProductVariant[];
}

export interface Category {
  id: string;
  slug: string;
  name: string;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ProductQuery {
  categorySlug?: string;
  search?: string;
  page?: number;
  size?: number;
}

export function fetchProducts(query: ProductQuery, signal?: AbortSignal): Promise<Page<ProductSummary>> {
  return getJson('/api/v1/products', { query: { ...query }, signal });
}

export function fetchProduct(id: string, signal?: AbortSignal): Promise<ProductDetail> {
  return getJson(`/api/v1/products/${encodeURIComponent(id)}`, { signal });
}

export function fetchCategories(signal?: AbortSignal): Promise<Category[]> {
  return getJson('/api/v1/categories', { signal });
}
