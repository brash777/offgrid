import { request } from './http';

export interface CartItem {
  variantId: string;
  productId: string;
  productName: string;
  categorySlug: string;
  size: string;
  colorName: string;
  colorHex: string;
  thumbnailUrl: string | null;
  photoColor: string | null;
  photoColorHex: string | null;
  unitPrice: number;
  quantity: number;
  available: number;
  lineTotal: number;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  maxUnitsPerLine: number;
}

export function fetchCart(signal?: AbortSignal): Promise<Cart> {
  return request('GET', '/api/v1/cart', { auth: true, signal });
}

export function addCartItem(variantId: string, quantity: number): Promise<Cart> {
  return request('POST', '/api/v1/cart/items', { auth: true, body: { variantId, quantity } });
}

export function updateCartItem(variantId: string, quantity: number): Promise<Cart> {
  return request('PUT', `/api/v1/cart/items/${encodeURIComponent(variantId)}`, { auth: true, body: { quantity } });
}

export function removeCartItem(variantId: string): Promise<Cart> {
  return request('DELETE', `/api/v1/cart/items/${encodeURIComponent(variantId)}`, { auth: true });
}
