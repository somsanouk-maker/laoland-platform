'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'broker' | 'owner' | 'buyer' | null;

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (phone: string, role: UserRole, name?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

// Seed DB roles: 11111111=broker, 33333333=owner, 44444444=buyer
const DEMO_IDS: Record<string, string> = {
  broker: '11111111-1111-1111-1111-111111111111',
  owner:  '33333333-3333-3333-3333-333333333333',
  buyer:  '44444444-4444-4444-4444-444444444444',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('laoland_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setIsLoading(false);
  }, []);

  function login(phone: string, role: UserRole, name = 'Demo User') {
    const u: AuthUser = { id: DEMO_IDS[role!] ?? DEMO_IDS.buyer, role, name, phone };
    setUser(u);
    localStorage.setItem('laoland_user', JSON.stringify(u));
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('laoland_user');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
