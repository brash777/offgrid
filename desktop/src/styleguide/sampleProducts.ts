import type { ProductSummary } from '../api/catalog';
import type { GarmentKind, GarmentPrint } from '../lib/garments';

export const SAMPLE_PRODUCTS: ProductSummary[] = [
  {
    id: 'sample-bomber',
    name: 'Chaqueta Bomber Urbana',
    basePrice: 150000,
    slot: 'TORSO',
    categorySlug: 'chaquetas',
    categoryName: 'Chaquetas',
    thumbnailUrl: null,
    totalStock: 60,
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Azul', hex: '#1e3a8a' },
      { name: 'Rojo', hex: '#ff0000' },
    ],
  },
  {
    id: 'sample-tee',
    name: 'Camiseta Estampada Street',
    basePrice: 55000,
    slot: 'TORSO',
    categorySlug: 'camisetas',
    categoryName: 'Camisetas',
    thumbnailUrl: null,
    totalStock: 4,
    colors: [
      { name: 'Negro', hex: '#1a1a1a' },
      { name: 'Verde Militar', hex: '#4b5320' },
    ],
  },
  {
    id: 'sample-sneaker',
    name: 'Sneakers Chunky Blancos',
    basePrice: 180000,
    slot: 'FEET',
    categorySlug: 'calzado',
    categoryName: 'Calzado',
    thumbnailUrl: null,
    totalStock: 45,
    colors: [{ name: 'Blanco', hex: '#f5f5f5' }],
  },
  {
    id: 'sample-trucker',
    name: 'Gorra Trucker Neón',
    basePrice: 48000,
    slot: 'HEAD',
    categorySlug: 'gorras',
    categoryName: 'Gorras',
    thumbnailUrl: null,
    totalStock: 0,
    colors: [{ name: 'Verde Neón', hex: '#39ff14' }],
  },
];

export interface GarmentSample {
  kind: GarmentKind;
  color: string;
  print?: GarmentPrint;
}

export const GARMENT_SAMPLES: GarmentSample[] = [
  { kind: 'tee', color: '#f5f5f5' },
  { kind: 'tee', color: '#1a1a1a', print: 'wordmark' },
  { kind: 'tee', color: '#1a1a1a', print: 'sparkle' },
  { kind: 'longsleeve', color: '#808080' },
  { kind: 'bomber', color: '#1e3a8a' },
  { kind: 'denim', color: '#3b6ea5' },
  { kind: 'windbreaker', color: '#39ff14' },
  { kind: 'jeans', color: '#2c4a7c' },
  { kind: 'cargo', color: '#1a1a1a' },
  { kind: 'jogger', color: '#4b5320' },
  { kind: 'shorts', color: '#808080' },
  { kind: 'sneaker', color: '#f5f5f5' },
  { kind: 'boot', color: '#1a1a1a' },
  { kind: 'sandal', color: '#808080' },
  { kind: 'cap', color: '#1a1a1a' },
  { kind: 'trucker', color: '#39ff14' },
  { kind: 'chain', color: '#c0c0c0' },
  { kind: 'glasses', color: '#1a1a1a' },
  { kind: 'backpack', color: '#1a1a1a' },
];
