'use client';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

export default function ViewingsPage() {
  const locale = useLocale();
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/buyer`} className="p-2 rounded-xl border hover:bg-gray-50">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">GPS-Verified Viewings</h1>
          <p className="text-sm text-gray-400">Your on-site visit history</p>
        </div>
      </div>
      <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 shadow-sm">
        <MapPin size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-semibold text-lg">No Viewings Recorded</p>
        <p className="text-sm mt-1">GPS-verified viewings will appear here after you visit a property on-site.</p>
      </div>
    </div>
  );
}
