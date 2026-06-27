'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, FileText, Star, Copy, CheckCheck, ExternalLink } from 'lucide-react';
import { api } from '../../../../lib/api';
import RequireRole from '../../../../components/RequireRole';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';

const DEMO_BROKER = '11111111-1111-1111-1111-111111111111';

const STATUS_STYLE: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  revoked:  'bg-red-100 text-red-600',
  expired:  'bg-gray-100 text-gray-500',
  requested:'bg-yellow-100 text-yellow-700',
};

export default function MandatesPage() {
  const t = useTranslations('mandates');
  const tl = useTranslations('landType');
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();

  const brokerId = user?.id ?? DEMO_BROKER;

  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'exclusive'>('all');

  async function load() {
    setLoading(true);
    try { setMandates(await api.getMandates(brokerId)); }
    catch { setMandates([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [brokerId]);

  function copySlug(slug: string, id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${locale}/m/${slug}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const filtered = mandates.filter((m) => {
    if (filter === 'active') return m.status === 'active';
    if (filter === 'exclusive') return m.is_exclusive;
    return true;
  });

  const stats = {
    total: mandates.length,
    active: mandates.filter((m) => m.status === 'active').length,
    exclusive: mandates.filter((m) => m.is_exclusive).length,
  };

  return (
    <RequireRole role="broker">
        <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/workshop`} className="p-2 rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-gray-400">{stats.total} {t('total')}</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t('statTotal'), val: stats.total, color: 'text-gray-700' },
          { label: t('statActive'), val: stats.active, color: 'text-green-600' },
          { label: t('statExclusive'), val: stats.exclusive, color: 'text-brand' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-2xl p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'exclusive'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              filter === f ? 'bg-brand text-white border-brand' : 'bg-white hover:border-gray-400'
            }`}>
            {t(`filter_${f}`)}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('empty')}</p>
          <Link href={`/${locale}/workshop`}
            className="mt-3 inline-block text-sm text-brand underline">{t('addFirst')}</Link>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/${locale}/properties/${m.property_id}`}
                    className="font-bold text-gray-900 hover:text-brand flex items-center gap-1">
                    {m.district}, {m.province}
                    <ExternalLink size={12} className="opacity-40" />
                  </Link>
                  {m.is_exclusive && (
                    <span className="flex items-center gap-1 text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                      <Star size={10} fill="currentColor" /> Exclusive
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{tl(m.land_type)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${STATUS_STYLE[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                {t(`status_${m.status}`)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div>
                <div className="text-xs text-gray-400">{t('price')}</div>
                <div className="font-semibold text-brand">{format(m.owner_set_price)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{t('commission')}</div>
                <div className="font-semibold">{m.commission_pct}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{t('type')}</div>
                <div className="font-semibold capitalize">{m.mandate_type}</div>
              </div>
            </div>

            {/* Trackable link */}
            <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2">
              <span className="text-xs text-gray-400 truncate flex-1 font-mono">
                /m/{m.trackable_slug}
              </span>
              <button onClick={() => copySlug(m.trackable_slug, m.id)}
                className="shrink-0 text-brand hover:text-brand/70 transition-colors">
                {copiedId === m.id
                  ? <CheckCheck size={15} className="text-green-500" />
                  : <Copy size={15} />}
              </button>
            </div>

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {new Date(m.created_at).toLocaleDateString()}
              </span>
              <Link href={`/${locale}/workshop/properties/${m.property_id}/request-mandate`}
                className="text-xs text-brand hover:underline font-semibold">
                {t('editMandate')}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
    </RequireRole>
  );
}