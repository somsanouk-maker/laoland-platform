'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'broker' | 'owner' | 'buyer' | 'admin' | null;

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  phone: string;
}

interface AuthContextType {
  user: AuthUser | null;
  requestLoginOtp: (phone: string) => Promise<void>;
  verifyLoginOtp: (phone: string, code: string) => Promise<AuthUser>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  requestLoginOtp: async () => {},
  verifyLoginOtp: async () => { throw new Error('not ready'); },
  logout: () => {},
  isLoading: true,
});

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

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

  async function requestLoginOtp(phone: string): Promise<void> {
    const res = await fetch(`${BASE}/api/auth/login/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'ບໍ່ສາມາດສົ່ງ OTP');
  }

  async function verifyLoginOtp(phone: string, code: string): Promise<AuthUser> {
    const res = await fetch(`${BASE}/api/auth/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? 'OTP ບໍ່ຖືກຕ້ອງ');

    localStorage.setItem('laoland_token', data.token);
    const u: AuthUser = { id: data.user.id, role: data.user.role, name: data.user.name ?? '', phone };
    localStorage.setItem('laoland_user', JSON.stringify(u));
    setUser(u);
    return u;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('laoland_token');
    localStorage.removeItem('laoland_user');
  }

  return (
    <AuthContext.Provider value={{ user, requestLoginOtp, verifyLoginOtp, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
