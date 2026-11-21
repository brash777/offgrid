import type { ProductSummary } from './catalog';
import { request } from './http';

export type StylistSource = 'AI' | 'RULES';

export interface StylistOutfit {
  message: string;
  items: ProductSummary[];
  source: StylistSource;
  remainingToday: number;
}

export interface StylistStatus {
  aiEnabled: boolean;
  dailyLimit: number;
  remainingToday: number;
}

export interface StylistQuestion {
  prompt: string;
  photo: string | null;
  photoConsent: boolean;
}

export function fetchStylistStatus(signal?: AbortSignal): Promise<StylistStatus> {
  return request('GET', '/api/v1/stylist/status', { auth: true, signal });
}

export function askStylist(question: StylistQuestion, signal?: AbortSignal): Promise<StylistOutfit> {
  return request('POST', '/api/v1/stylist/outfits', { auth: true, body: question, signal });
}
