'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth, UserRole } from '../contexts/AuthContext';

interface Props {
  role: UserRole | UserRole[];
  children: React.ReactNode;
}

export default function RequireRole({ role, children }: Props) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  const allowed = Array.isArray(role) ? role : [role];

  useEffect(() => {
    if (isLoading) return;
    if (!user || !allowed.includes(user.role)) {
      router.replace(`/${locale}/login`);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
        ກຳລັງໂຫຼດ...
      </div>
    );
  }

  if (!user || !allowed.includes(user.role)) {
    return null; // redirect fires in useEffect, show nothing while navigating
  }

  return <>{children}</>;
}
