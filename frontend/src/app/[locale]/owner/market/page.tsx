'use client';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, TrendingUp } from 'lucide-react';

export default function MarketTrendsPage() {
  const locale = useLocale();
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/owner`} className="p-2 rounded-xl border hover:bg-gray-50">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Market Trends</h1>
          <p className="text-sm text-gray-400">Price trends and market insights for your area</p>
        </div>
      </div>
      <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 shadow-sm">
        <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
        <p className="font-semibold text-lg">Coming Soon</p>
        <p className="text-sm mt-1">Market analytics will be available in a future release.</p>
      </div>
    </div>
  );
}
