import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { addCartItem, fetchCart, removeCartItem, updateCartItem, type Cart } from '../api/cart';
import { ApiError } from '../api/http';
import { useNotify } from '../app/notifications';
import { useAuth } from '../auth/AuthContext';
import { es } from '../i18n/es';
import { garmentFor, type GarmentSpec } from '../lib/garments';

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
  lineTotal: number;
}

export type AddResult = 'added' | 'login' | 'error';
export type PanelSource = 'pointer' | 'keyboard';

interface CartApi {
  lines: CartLine[];
  count: number;
  subtotal: number;
  signedIn: boolean;
  busy: boolean;
  isOpen: boolean;
  instant: boolean;
  open: (source?: PanelSource) => void;
  close: (source?: PanelSource) => void;
  toggle: (source?: PanelSource) => void;
  add: (variantId: string, quantity?: number) => Promise<AddResult>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const EMPTY_CART: Cart = { items: [], itemCount: 0, subtotal: 0, maxUnitsPerLine: 10 };

const CartContext = createContext<CartApi | null>(null);

function toLines(cart: Cart): CartLine[] {
  return cart.items.map((item) => ({
    variantId: item.variantId,
    productId: item.productId,
    name: item.productName,
    size: item.size,
    colorName: item.colorName,
    colorHex: item.colorHex,
    garment: garmentFor(item.productName, item.categorySlug),
    unitPrice: Number(item.unitPrice),
    quantity: item.quantity,
    maxQuantity: Math.min(item.available, cart.maxUnitsPerLine),
    lineTotal: Number(item.lineTotal),
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const notify = useNotify();
  const signedIn = auth.status === 'authenticated';
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState({ isOpen: false, instant: false });

  const reload = useCallback(async () => {
    if (!signedIn) {
      setCart(EMPTY_CART);
      return;
    }
    try {
      setCart(await fetchCart());
    } catch {
      setCart(EMPTY_CART);
    }
  }, [signedIn]);

  useEffect(() => {
    void reload();
  }, [reload, auth.user?.id]);

  const mutate = useCallback(
    async (change: () => Promise<Cart>): Promise<boolean> => {
      setBusy(true);
      try {
        setCart(await change());
        return true;
      } catch (error) {
        notify({ tone: 'error', title: error instanceof ApiError ? error.message : es.errors.generic });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [notify],
  );

  const add = useCallback(
    async (variantId: string, quantity = 1): Promise<AddResult> => {
      if (!signedIn) {
        return 'login';
      }
      return (await mutate(() => addCartItem(variantId, quantity))) ? 'added' : 'error';
    },
    [signedIn, mutate],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      await mutate(() => updateCartItem(variantId, quantity));
    },
    [mutate],
  );

  const remove = useCallback(
    async (variantId: string) => {
      await mutate(() => removeCartItem(variantId));
    },
    [mutate],
  );

  const open = useCallback((source: PanelSource = 'pointer') => {
    setPanel({ isOpen: true, instant: source === 'keyboard' });
  }, []);

  const close = useCallback((source: PanelSource = 'pointer') => {
    setPanel({ isOpen: false, instant: source === 'keyboard' });
  }, []);

  const toggle = useCallback((source: PanelSource = 'pointer') => {
    setPanel((current) => ({ isOpen: !current.isOpen, instant: source === 'keyboard' }));
  }, []);

  const api = useMemo<CartApi>(
    () => ({
      lines: toLines(cart),
      count: cart.itemCount,
      subtotal: Number(cart.subtotal),
      signedIn,
      busy,
      isOpen: panel.isOpen,
      instant: panel.instant,
      open,
      close,
      toggle,
      add,
      setQuantity,
      remove,
      reload,
    }),
    [cart, signedIn, busy, panel, open, close, toggle, add, setQuantity, remove, reload],
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
