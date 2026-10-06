// Mobile cart store — the sibling of the web `components/CartProvider.tsx`.
//
// Same domain rules (same clamp, same item shape, same "ready" hydration flag
// so the UI never flashes "empty cart" before storage has been read), same
// module-level store so the cart survives screen unmounts. Differences are
// platform ones: persistence is AsyncStorage instead of localStorage, and the
// server mirror lives in `components/CartSync.tsx`.

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import type { CartItem, Product } from "@/lib/types";

const STORAGE_KEY = "mgt.cart.v1";
const EMPTY: CartItem[] = [];

let state: CartItem[] = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartItem[] {
  return state;
}

function getServerSnapshot(): CartItem[] {
  return EMPTY;
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(99, Math.floor(value)));
}

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CartItem>;
  return (
    typeof item.slug === "string" &&
    typeof item.title === "string" &&
    typeof item.price_cents === "number" &&
    typeof item.quantity === "number"
  );
}

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
    // Storage failures are not worth interrupting the shopper for.
  });
}

function commit(next: CartItem[]) {
  state = next;
  persist();
  emit();
}

/** Read the persisted cart once at startup (AsyncStorage is async, unlike web). */
async function hydrate(): Promise<void> {
  if (hydrated) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) state = parsed.filter(isCartItem);
    }
  } catch {
    // Corrupt storage — start with an empty cart.
  }
  hydrated = true;
  emit();
}

function toItem(product: Product, quantity: number): CartItem {
  return {
    slug: product.slug,
    title: product.title,
    price_cents: product.price_cents,
    quantity: clampQuantity(quantity),
    accent: product.accent,
    image_url: product.image_url ?? null,
  };
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  ready: boolean;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Replaces the cart with a server copy (another device changed it). */
  applyRemote: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useSyncExternalStore(
    (listener) => {
      // Hydrate once, on first mount, then re-emit on every change.
      void hydrate().then(listener);
      return subscribe(listener);
    },
    () => hydrated,
    () => false,
  );

  const add = useCallback((product: Product, quantity = 1) => {
    const current = getSnapshot();
    const existing = current.find((item) => item.slug === product.slug);
    commit(
      existing
        ? current.map((item) =>
            item.slug === product.slug
              ? { ...item, quantity: clampQuantity(item.quantity + quantity) }
              : item,
          )
        : [...current, toItem(product, quantity)],
    );
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    const current = getSnapshot();
    commit(
      quantity <= 0
        ? current.filter((item) => item.slug !== slug)
        : current.map((item) =>
            item.slug === slug ? { ...item, quantity: clampQuantity(quantity) } : item,
          ),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    commit(getSnapshot().filter((item) => item.slug !== slug));
  }, []);

  const clear = useCallback(() => commit([]), []);

  const applyRemote = useCallback((next: CartItem[]) => {
    commit(Array.isArray(next) ? next.filter(isCartItem) : []);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotalCents: items.reduce((total, item) => total + item.price_cents * item.quantity, 0),
      ready,
      add,
      setQuantity,
      remove,
      clear,
      applyRemote,
    }),
    [items, ready, add, setQuantity, remove, clear, applyRemote],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>.");
  return context;
}
