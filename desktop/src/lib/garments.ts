export type GarmentKind =
  | 'tee'
  | 'longsleeve'
  | 'bomber'
  | 'denim'
  | 'windbreaker'
  | 'jeans'
  | 'cargo'
  | 'jogger'
  | 'shorts'
  | 'sneaker'
  | 'boot'
  | 'sandal'
  | 'cap'
  | 'trucker'
  | 'chain'
  | 'glasses'
  | 'backpack';

export type GarmentPrint = 'wordmark' | 'sparkle';

export interface GarmentSpec {
  kind: GarmentKind;
  print?: GarmentPrint;
}

interface KeywordRule {
  keyword: string;
  spec: GarmentSpec;
}

const RULES_BY_CATEGORY: Record<string, { rules: KeywordRule[]; fallback: GarmentSpec }> = {
  camisetas: {
    rules: [
      { keyword: 'manga larga', spec: { kind: 'longsleeve' } },
      { keyword: 'estampada', spec: { kind: 'tee', print: 'wordmark' } },
      { keyword: 'grafica', spec: { kind: 'tee', print: 'sparkle' } },
    ],
    fallback: { kind: 'tee' },
  },
  chaquetas: {
    rules: [
      { keyword: 'denim', spec: { kind: 'denim' } },
      { keyword: 'jean', spec: { kind: 'denim' } },
      { keyword: 'rompevientos', spec: { kind: 'windbreaker' } },
    ],
    fallback: { kind: 'bomber' },
  },
  pantalones: {
    rules: [
      { keyword: 'jean', spec: { kind: 'jeans' } },
      { keyword: 'jogger', spec: { kind: 'jogger' } },
      { keyword: 'short', spec: { kind: 'shorts' } },
    ],
    fallback: { kind: 'cargo' },
  },
  calzado: {
    rules: [
      { keyword: 'bota', spec: { kind: 'boot' } },
      { keyword: 'sandalia', spec: { kind: 'sandal' } },
    ],
    fallback: { kind: 'sneaker' },
  },
  gorras: {
    rules: [{ keyword: 'trucker', spec: { kind: 'trucker' } }],
    fallback: { kind: 'cap' },
  },
  accesorios: {
    rules: [
      { keyword: 'lente', spec: { kind: 'glasses' } },
      { keyword: 'gafa', spec: { kind: 'glasses' } },
      { keyword: 'mochila', spec: { kind: 'backpack' } },
    ],
    fallback: { kind: 'chain' },
  },
};

const DEFAULT_SPEC: GarmentSpec = { kind: 'tee' };

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function garmentFor(productName: string, categorySlug: string): GarmentSpec {
  const category = RULES_BY_CATEGORY[categorySlug];
  if (!category) {
    return DEFAULT_SPEC;
  }
  const name = normalize(productName);
  return category.rules.find((rule) => name.includes(rule.keyword))?.spec ?? category.fallback;
}
