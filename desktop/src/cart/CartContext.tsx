import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { GarmentSpec } from '../lib/garments';

export interface CartLine {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  colorName: string;
  colorHex: string;
  garment: GarmentSpec;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
}

export type AddResult = 'added' | 'limit';

type Action =
  | { type: 'add'; line: CartLine }
  | { type: 'setQuantity'; variantId: string; quantity: number }
  | { type: 'remove'; variantId: string };

function clamp(quantity: number, max: number): number {
  return Math.max(1, Math.min(quantity, max));
}

function reducer(lines: CartLine[], action: Action): CartLine[] {
  switch (action.type) {
    case 'add': {
      const existing = lines.find((line) => line.variantId === action.line.variantId);
      if (!existing) {
        return [...lines, action.line];
      }
      return lines.map((line) =>
        line.variantId === action.line.variantId
          ? { ...line, quantity: clamp(line.quantity + action.line.quantity, action.line.maxQuantity) }
          : line,
      );
    }
    case 'setQuantity':
      return lines.map((line) =>
        line.variantId === action.variantId ? { ...line, quantity: clamp(action.quantity, line.maxQuantity) } : line,
      );
    case 'remove':
      return lines.filter((line) => line.variantId !== action.variantId);
  }
}

export type PanelSource = 'pointer' | 'keyboard';

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  instant: boolean;
  open: (source?: PanelSource) => void;
  close: (source?: PanelSource) => void;
  toggle: (source?: PanelSource) => void;
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => AddResult;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
}

const CartContext = createContext<CartApi | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(reducer, []);
  const [panel, setPanel] = useState({ isOpen: false, instant: false });

  const open = useCallback((source: PanelSource = 'pointer') => {
    setPanel({ isOpen: true, instant: source === 'keyboard' });
  }, []);

  const close = useCallback((source: PanelSource = 'pointer') => {
    setPanel({ isOpen: false, instant: source === 'keyboard' });
  }, []);

  const toggle = useCallback((source: PanelSource = 'pointer') => {
    setPanel((current) => ({ isOpen: !current.isOpen, instant: source === 'keyboard' }));
  }, []);

  const setQuantity = useCallback(
    (variantId: string, quantity: number) => dispatch({ type: 'setQuantity', variantId, quantity }),
    [],
  );

  const remove = useCallback((variantId: string) => dispatch({ type: 'remove', variantId }), []);

  const add = useCallback(
    (line: Omit<CartLine, 'quantity'>, quantity = 1): AddResult => {
      const current = lines.find((existing) => existing.variantId === line.variantId)?.quantity ?? 0;
      if (current + quantity > line.maxQuantity) {
        return 'limit';
      }
      dispatch({ type: 'add', line: { ...line, quantity } });
      return 'added';
    },
    [lines],
  );

  const api = useMemo<CartApi>(
    () => ({
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotal: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
      isOpen: panel.isOpen,
      instant: panel.instant,
      open,
      close,
      toggle,
      add,
      setQuantity,
      remove,
    }),
    [lines, panel, open, close, toggle, add, setQuantity, remove],
  );

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return cart;
}
