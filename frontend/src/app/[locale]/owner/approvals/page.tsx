'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, CheckSquare, XCircle, Star, Briefcase, Phone, RefreshCw, ShieldAlert } from 'lucide-react';
import { api } from '../../../../lib/api';
import RequireRole from '../../../../components/RequireRole';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';

// For demo: owner uses seed user id
const DEMO_OWNER = '33333333-3333-3333-3333-333333333333';

const STATUS_STYLE: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  revoked:   'bg-red-100 text-red-600',
  expired:   'bg-gray-100 text-gray-500',
  requested: 'bg-yellow-100 text-yellow-700',
};

export default function ApprovalsPage() {
  const t = useTranslations('approvals');
  const tl = useTranslations('landType');
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();

  const ownerId = user?.id ?? DEMO_OWNER;

  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'exclusive'>('all');

  async function load() {
    setLoading(true);
    try { setMandates(await api.getOwnerMandates(ownerId)); }
    catch { setMandates([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [ownerId]);

  async function revoke(mandateId: string) {
    if (!confirm(t('confirmRevoke'))) return;
    setRevoking(mandateId);
    try {
      await api.revokeOwnerMandate(mandateId, ownerId);
      await load();
    } catch (e: any) {
      alert(e.data?.error ?? e.message ?? t('error'));
    } finally { setRevoking(null); }
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
    <RequireRole role="owner">
        <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/owner`} className="p-2 rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
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

      {/* Info box */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 text-sm text-amber-800 flex items-start gap-2">
        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">{t('infoTitle')}: </span>
          {t('infoDesc')}
        </div>
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
          {[1, 2, 3].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-36 animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('empty')}</p>
          <p className="text-sm mt-1">{t('emptyHint')}</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((m) => (
          <div key={m.id} className="bg-white border rounded-2xl p-5 shadow-sm">
            {/* Property header */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <Link href={`/${locale}/properties/${m.property_id}`}
                  className="font-bold text-gray-900 hover:text-brand text-lg">
                  {m.district}, {m.province}
                </Link>
                <p className="text-sm text-gray-400 mt-0.5">{tl(m.land_type)}</p>
                {m.owner_set_price && (
                  <p className="text-brand font-bold mt-1">{format(m.owner_set_price)}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_STYLE[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {t(`status_${m.status}`)}
                </span>
                {m.is_exclusive && (
                  <span className="flex items-center gap-1 text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                    <Star size={10} fill="currentColor" /> Exclusive
                  </span>
                )}
              </div>
            </div>

            {/* Broker info */}
            <div className="bg-gray-50 border rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <Briefcase size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{m.broker_name}</p>
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                  <Phone size={11} />
                  <span className="font-mono">{m.broker_phone}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-gray-400">{t('commission')}</div>
                <div className="font-bold text-sm">{m.commission_pct}%</div>
              </div>
            </div>

            {/* Mandate details */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <div className="text-xs text-gray-400">{t('mandateType')}</div>
                <div className="font-semibold capitalize">{m.mandate_type}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">{t('since')}</div>
                <div className="font-semibold">{new Date(m.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Revoke action */}
            {m.status === 'active' && (
              <button
                onClick={() => revoke(m.id)}
                disabled={revoking === m.id}
                className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                <XCircle size={15} />
                {revoking === m.id ? '...' : t('revoke')}
              </button>
            )}
            {m.status === 'revoked' && (
              <div className="text-xs text-center text-gray-400 py-1">{t('alreadyRevoked')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
    </RequireRole>
  );
}