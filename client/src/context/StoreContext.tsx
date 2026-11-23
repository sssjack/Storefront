import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest } from '../lib/api';
import type {
  StoreSettings,
  Category,
  PageBlock,
  PublicPayPalConfig,
  CartItem,
  Product,
} from '../types';

interface StoreContextValue {
  loading: boolean;
  store: StoreSettings | null;
  categories: Category[];
  homeLayout: PageBlock[];
  paypal: PublicPayPalConfig | null;
  refreshBootstrap: () => Promise<void>;
  // Cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (item: Omit<CartItem, 'key'>, openDrawer?: boolean) => void;
  updateCartQty: (key: string, qty: number) => void;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  // Global UI modals
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_STORAGE_KEY = 'sb_storefront_cart_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homeLayout, setHomeLayout] = useState<PageBlock[]>([]);
  const [paypal, setPaypal] = useState<PublicPayPalConfig | null>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 3000);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        store: StoreSettings;
        categories: Category[];
        homeLayout: PageBlock[];
        paypal: PublicPayPalConfig;
      }>('/api/store/bootstrap');
      setStore(data.store);
      setCategories(data.categories);
      setHomeLayout(data.homeLayout);
      setPaypal(data.paypal);
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  // Sync browser tab title & favicon when store branding changes
  useEffect(() => {
    if (!store) return;
    if (store.name) {
      document.title = store.tagline ? `${store.name} — ${store.tagline}` : store.name;
    }
    if (store.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = store.faviconUrl;
    }
  }, [store?.name, store?.tagline, store?.faviconUrl]);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((item: Omit<CartItem, 'key'>, openDrawer = true) => {
    const key = `${item.productId}::${item.variantId || item.variantName}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, key }];
    });
    if (openDrawer) setCartOpen(true);
  }, []);

  const updateCartQty = useCallback((key: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.key !== key));
    } else {
      setCart((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)));
    }
  }, []);

  const removeFromCart = useCallback((key: string) => {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const cartSubtotal = Number(
    cart.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0).toFixed(2)
  );

  return (
    <StoreContext.Provider
      value={{
        loading,
        store,
        categories,
        homeLayout,
        paypal,
        refreshBootstrap,
        cart,
        cartCount,
        cartSubtotal,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        searchOpen,
        setSearchOpen,
        quickViewProduct,
        setQuickViewProduct,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
