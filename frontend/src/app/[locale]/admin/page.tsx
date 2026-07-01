'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function AdminIndex() {
  const router = useRouter();
  const locale = useLocale();
  useEffect(() => { router.replace(`/${locale}/admin/users`); }, []);
  return null;
}
