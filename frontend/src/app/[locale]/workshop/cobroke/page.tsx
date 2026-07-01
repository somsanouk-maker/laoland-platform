'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Users, Plus, CheckCircle2, Clock, XCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { api } from '../../../../lib/api';
import RequireRole from '../../../../components/RequireRole';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';

const STATUS_META: Record<string, { icon: React.ReactNode; style: string }> = {
  proposed: { icon: <Clock size={13} />,        style: 'bg-yellow-100 text-yellow-700' },
  accepted: { icon: <CheckCircle2 size={13} />, style: 'bg-green-100 text-green-700' },
  rejected: { icon: <XCircle size={13} />,      style: 'bg-red-100 text-red-600' },
  closed:   { icon: <CheckCircle2 size={13} />, style: 'bg-gray-100 text-gray-500' },
};

export default function CobrokePage() {
  const t = useTranslations('cobroke');
  const tl = useTranslations('landType');
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();

  const [cobrokes, setCobrokes] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropose, setShowPropose] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Propose form state
  const [proposeForm, setProposeForm] = useState({
    propertyId: '', cobrokeBrokerId: '', splitListingPct: '50', splitCobrokePct: '50',
  });
  const [proposing, setProposing] = useState(false);
  const [proposeError, setProposeError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [cb, ma, br] = await Promise.all([
        api.getCobrokes(),
        api.getMandates(),
        api.getBrokers(),
      ]);
      setCobrokes(cb);
      setMandates(ma);
      setBrokers(br);
    } catch { setCobrokes([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function propose() {
    setProposing(true); setProposeError('');
    if (!proposeForm.propertyId) { setProposeError('ກະລຸນາເລືອກທີ່ດິນ'); setProposing(false); return; }
    if (!proposeForm.cobrokeBrokerId) { setProposeError('ກະລຸນາເລືອກນາຍໜ້າ'); setProposing(false); return; }
    const sl = Number(proposeForm.splitListingPct);
    const sc = Number(proposeForm.splitCobrokePct);
    if (sl + sc !== 100) { setProposeError(t('splitError')); setProposing(false); return; }
    try {
      await api.proposeCobroke({
        propertyId: proposeForm.propertyId,
        cobrokeBrokerId: proposeForm.cobrokeBrokerId,
        splitListingPct: sl,
        splitCobrokePct: sc,
      });
      setShowPropose(false);
      setProposeForm({ propertyId: '', cobrokeBrokerId: '', splitListingPct: '50', splitCobrokePct: '50' });
      await load();
    } catch (e: any) {
      setProposeError(e.data?.error ?? e.message ?? t('error'));
    } finally { setProposing(false); }
  }

  async function accept(id: string) {
    setAccepting(id);
    try { await api.acceptCobroke(id); await load(); }
    catch { }
    finally { setAccepting(null); }
  }

  const stats = {
    total: cobrokes.length,
    accepted: cobrokes.filter((c) => c.status === 'accepted').length,
    pending: cobrokes.filter((c) => c.status === 'proposed').length,
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
            <p className="text-sm text-gray-400">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50">
            <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
          </button>
          <button onClick={() => setShowPropose(true)}
            className="flex items-center gap-2 bg-brand text-white rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90">
            <Plus size={16} /> {t('propose')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: t('statTotal'), val: stats.total, color: 'text-gray-700' },
          { label: t('statAccepted'), val: stats.accepted, color: 'text-green-600' },
          { label: t('statPending'), val: stats.pending, color: 'text-yellow-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-2xl p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Propose modal */}
      {showPropose && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-bold text-lg mb-4">{t('proposeTitle')}</h2>
            <div className="space-y-3">
              <label className="block text-sm font-medium">
                {t('propertyId')}
                <select className="border rounded-xl px-3 py-2.5 w-full mt-1 bg-white text-sm"
                  value={proposeForm.propertyId}
                  onChange={(e) => setProposeForm({ ...proposeForm, propertyId: e.target.value })}>
                  <option value="">— ເລືອກທີ່ດິນ —</option>
                  {mandates.map((m: any) => (
                    <option key={m.property_id ?? m.id} value={m.property_id ?? m.id}>
                      {m.district}, {m.province} ({m.land_type})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                {t('cobrokeBrokerId')}
                <select className="border rounded-xl px-3 py-2.5 w-full mt-1 bg-white text-sm"
                  value={proposeForm.cobrokeBrokerId}
                  onChange={(e) => setProposeForm({ ...proposeForm, cobrokeBrokerId: e.target.value })}>
                  <option value="">— ເລືອກນາຍໜ້າ —</option>
                  {brokers.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.full_name}</option>
                  ))}
                </select>
                {brokers.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">ບໍ່ພົບນາຍໜ້າອື່ນໃນລະບົບ</p>
                )}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-medium">
                  {t('yourSplit')} (%)
                  <input type="number" min="0" max="100"
                    className="border rounded-xl px-3 py-2.5 w-full mt-1"
                    value={proposeForm.splitListingPct}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setProposeForm({ ...proposeForm, splitListingPct: String(v), splitCobrokePct: String(100 - v) });
                    }} />
                </label>
                <label className="block text-sm font-medium">
                  {t('theirSplit')} (%)
                  <input type="number" min="0" max="100"
                    className="border rounded-xl px-3 py-2.5 w-full mt-1"
                    value={proposeForm.splitCobrokePct}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setProposeForm({ ...proposeForm, splitCobrokePct: String(v), splitListingPct: String(100 - v) });
                    }} />
                </label>
              </div>
              <div className={`text-xs font-semibold text-center py-1.5 rounded-lg ${
                Number(proposeForm.splitListingPct) + Number(proposeForm.splitCobrokePct) === 100
                  ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {t('total')}: {Number(proposeForm.splitListingPct) + Number(proposeForm.splitCobrokePct)}%
                {Number(proposeForm.splitListingPct) + Number(proposeForm.splitCobrokePct) === 100 ? ' ✓' : ' ✗'}
              </div>
              {proposeError && <p className="text-red-500 text-sm">{proposeError}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowPropose(false); setProposeError(''); }}
                className="flex-1 border rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button onClick={propose} disabled={proposing}
                className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
                {proposing ? '...' : t('send')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="bg-brand/5 border border-brand/20 rounded-2xl p-4 mb-5 text-sm text-gray-600">
        <div className="flex items-start gap-2">
          <EyeOff size={16} className="text-brand mt-0.5 shrink-0" />
          <div>
            <span className="font-semibold text-brand">{t('maskingTitle')}: </span>
            {t('maskingDesc')}
          </div>
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-32 animate-pulse" />)}
        </div>
      )}

      {!loading && cobrokes.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('empty')}</p>
          <button onClick={() => setShowPropose(true)}
            className="mt-3 text-sm text-brand underline">{t('proposeFirst')}</button>
        </div>
      )}

      <div className="space-y-3">
        {cobrokes.map((c) => {
          const meta = STATUS_META[c.status] ?? STATUS_META.proposed;
          const iAmListing = c.listing_broker_name !== c.cobroke_broker_name;
          return (
            <div key={c.id} className="bg-white border rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <Link href={`/${locale}/properties/${c.property_id}`}
                    className="font-bold text-gray-900 hover:text-brand">
                    {c.district}, {c.province}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{tl(c.land_type)}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${meta.style}`}>
                  {meta.icon} {t(`status_${c.status}`)}
                </span>
              </div>

              {/* Split visualiser */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{c.listing_broker_name} ({t('listing')})</span>
                  <span>{c.cobroke_broker_name} (Co-broke)</span>
                </div>
                <div className="flex rounded-lg overflow-hidden h-5">
                  <div className="bg-brand flex items-center justify-center text-white text-xs font-bold"
                    style={{ width: `${c.split_listing_pct}%` }}>
                    {c.split_listing_pct}%
                  </div>
                  <div className="bg-brand/30 flex items-center justify-center text-brand text-xs font-bold"
                    style={{ width: `${c.split_cobroke_pct}%` }}>
                    {c.split_cobroke_pct}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    {c.mask_contacts ? <EyeOff size={12} /> : <Eye size={12} />}
                    {c.mask_contacts ? t('masked') : t('visible')}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                {c.status === 'proposed' && iAmListing && (
                  <button onClick={() => accept(c.id)} disabled={accepting === c.id}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-60">
                    {accepting === c.id ? '...' : t('accept')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </RequireRole>
  );
}