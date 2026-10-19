import type { Page } from './catalog';
import { request } from './http';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';
export type PaymentStatus = 'APPROVED' | 'REJECTED';

export interface OrderLine {
  variantId: string;
  productId: string;
  productName: string;
  variantLabel: string;
  categorySlug: string;
  colorName: string;
  colorHex: string;
  thumbnailUrl: string | null;
  photoColor: string | null;
  photoColorHex: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;
  items: OrderLine[];
  itemCount: number;
  total: number;
  payment: { method: string; status: PaymentStatus; paidAt: string | null } | null;
}

export interface CardDetails {
  cardHolder: string;
  cardNumber: string;
  expiry: string;
  cvc: string;
}

export function checkout(payment: CardDetails): Promise<Order> {
  return request('POST', '/api/v1/orders', { auth: true, body: { payment } });
}

export function fetchOrders(signal?: AbortSignal): Promise<Page<Order>> {
  return request('GET', '/api/v1/orders', { auth: true, signal, query: { size: 20 } });
}

export function fetchOrder(id: string, signal?: AbortSignal): Promise<Order> {
  return request('GET', `/api/v1/orders/${encodeURIComponent(id)}`, { auth: true, signal });
}
