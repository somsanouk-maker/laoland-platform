'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

export type Currency = 'LAK' | 'USD' | 'THB';

// Approximate exchange rates (LAK base) — update via API in production
const RATES: Record<Currency, number> = {
  LAK: 1,
  USD: 1 / 21000,
  THB: 1 / 590,
};

const SYMBOLS: Record<Currency, string> = {
  LAK: '₭',
  USD: '$',
  THB: '฿',
};

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  format: (lakAmount: number | string | null) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'LAK',
  setCurrency: () => {},
  format: () => '—',
  symbol: '₭',
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>('LAK');

  function format(lakAmount: number | string | null): string {
    if (!lakAmount) return '—';
    const val = Number(lakAmount) * RATES[currency];
    const sym = SYMBOLS[currency];
    if (currency === 'LAK') return `${sym} ${Math.round(val).toLocaleString()}`;
    if (currency === 'USD') return `${sym} ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    return `${sym} ${Math.round(val).toLocaleString()}`;
  }

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format, symbol: SYMBOLS[currency] }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
