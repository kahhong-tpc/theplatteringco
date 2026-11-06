"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface BagContextValue {
  items: string[];
  count: number;
  add: (id: string) => void;
}

const BagContext = createContext<BagContextValue | null>(null);

/** Minimal bag state so the header badge works. Swap for Wix cart later. */
export function BagProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<string[]>([]);

  const value = useMemo<BagContextValue>(
    () => ({
      items,
      count: items.length,
      add: (id) => setItems((prev) => (prev.includes(id) ? prev : [...prev, id])),
    }),
    [items],
  );

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) throw new Error("useBag must be used inside <BagProvider>");
  return ctx;
}
