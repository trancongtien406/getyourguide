'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export interface GuestCartItem {
  id: string;
  departureSlotId: string;
  quantity: number;
  currencyCode: string;
  travelerMix: Array<Record<string, unknown>>;
  languageCode?: string;
  tourId: string;
  tourTitle: string;
  optionId: string;
  optionTitle: string;
  unitPrice: number;
  lineTotal: number;
  startsAt: string;
  addedAt: string;
}

type AddGuestCartItemData = Omit<GuestCartItem, 'id' | 'addedAt' | 'lineTotal'>;

interface GuestCartContextType {
  items: GuestCartItem[];
  addItem: (item: AddGuestCartItemData) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  total: number;
  currencyCode: string | null;
}

const GuestCartContext = createContext<GuestCartContextType | null>(null);

const STORAGE_KEY = 'guestCart';

function loadCart(): GuestCartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: GuestCartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded or private browsing */ }
}

export function GuestCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<GuestCartItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
  }, []);

  const addItem = useCallback((data: AddGuestCartItemData) => {
    setItems(prev => {
      // Check if same departureSlotId already exists
      const existing = prev.find(i => i.departureSlotId === data.departureSlotId);
      let next: GuestCartItem[];

      if (existing) {
        const newQty = existing.quantity + data.quantity;
        next = prev.map(i =>
          i.id === existing.id
            ? { ...i, quantity: newQty, lineTotal: i.unitPrice * newQty, travelerMix: data.travelerMix }
            : i,
        );
      } else if (prev.length > 0 && prev[0].currencyCode !== data.currencyCode) {
        // Currency mismatch — start fresh with new currency
        next = [{
          ...data,
          id: crypto.randomUUID(),
          addedAt: new Date().toISOString(),
          lineTotal: data.unitPrice * data.quantity,
        }];
      } else {
        next = [...prev, {
          ...data,
          id: crypto.randomUUID(),
          addedAt: new Date().toISOString(),
          lineTotal: data.unitPrice * data.quantity,
        }];
      }

      saveCart(next);
      return next;
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.id !== id);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev => {
      const next = prev.map(i =>
        i.id === id ? { ...i, quantity, lineTotal: i.unitPrice * quantity } : i,
      );
      saveCart(next);
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    saveCart([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const currencyCode = items.length > 0 ? items[0].currencyCode : null;

  return (
    <GuestCartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, itemCount, total, currencyCode }}>
      {children}
    </GuestCartContext.Provider>
  );
}

export function useGuestCart() {
  const context = useContext(GuestCartContext);
  if (!context) throw new Error('useGuestCart must be used within a GuestCartProvider');
  return context;
}
