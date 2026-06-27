'use client';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  KanbanSquare, PlusCircle, AlertTriangle, CheckCircle2, FileText,
  Clock, TrendingUp, Users, Eye, Share2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import RequireRole from '../../../components/RequireRole';

const LocationPicker = dynamic(() => import('../../../components/LocationPicker'), { ssr: false });

const DEMO_BROKER = '11111111-1111-1111-1111-111111111111';
type FlowStep = 'dedup' | 'create' | 'done';

export default function WorkshopPage() {
  const t = useTranslations('workshop');
  const tl = useTranslations('landType');
  const locale = useLocale();
  const { user } = useAuth();
  const brokerId = user?.id ?? DEMO_BROKER;

  // Live stats
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.getPipelineStats(brokerId).then(setStats).catch(() => {});
  }, [brokerId]);

  // Property registration flow
  const [step, setStep] = useState<FlowStep>('dedup');
  const [deedNo, setDeedNo] = useState('');
  const [lat, setLat] = useState('17.9757');
  const [lng, setLng] = useState('102.6331');
  const [dupResult, setDupResult] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({
    deedType: 'white_paper', landType: 'residential',
    province: '', district: '', village: '',
    areaSqm: '', ownerSetPrice: '', priceCurrency: 'LAK', addressText: '',
    ownerPhone: '', commissionPct: '3',
  });
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<any>(null);
  const [error, setError] = useState('');

  async function checkDup() {
    setChecking(true); setDupResult(null); setError('');
    try {
      const r = await api.checkDuplicate({ titleDeedNo: deedNo || null, lat: Number(lat), lng: Number(lng) }, brokerId);
      setDupResult(r);
      if (!r.isDuplicate) setStep('create');
    } catch (e: any) { setError(e.message); }
    finally { setChecking(false); }
  }

  async function createPropertyAndRequestMandate() {
    setCreating(true); setError('');
    try {
      const result = await api.createProperty({
        titleDeedNo: deedNo || null,
        deedType: form.deedType, landType: form.landType,
        lat: Number(lat), lng: Number(lng),
        province: form.province, district: form.district,
        village: form.village || undefined,
        addressText: form.addressText || undefined,
        areaSqm: form.areaSqm ? Number(form.areaSqm) : undefined,
        ownerSetPrice: form.ownerSetPrice ? Number(form.ownerSetPrice) : undefined,
        priceCurrency: form.priceCurrency,
      }, brokerId);

      // Auto-request mandate after property creation
      const propId = result.id ?? result.propertyId;
      try {
        await api.requestMandate({
          propertyId: propId,
          mandateType: 'open',
          commissionPct: Number(form.commissionPct),
        }, brokerId);
      } catch { /* mandate request optional — continue */ }

      setCreated(result);
      setStep('done');
      // Refresh stats
      api.getPipelineStats(brokerId).then(setStats).catch(() => {});
    } catch (e: any) { setError(e.data?.error ?? e.message ?? t('createError')); }
    finally { setCreating(false); }
  }

  function reset() {
    setStep('dedup'); setDupResult(null); setDeedNo('');
    setLat('17.9757'); setLng('102.6331');
    setForm({ deedType: 'white_paper', landType: 'residential', province: '', district: '', village: '', areaSqm: '', ownerSetPrice: '', priceCurrency: 'LAK', addressText: '', ownerPhone: '', commissionPct: '3' });
    setCreated(null); setError('');
  }

  const F = (label: string, node: React.ReactNode, hint?: string) => (
    <label className="block text-sm">
      <span className="text-gray-600 font-medium">{label}</span>
      {hint && <span className="text-gray-400 text-xs ml-1">({hint})</span>}
      <div className="mt-1">{node}</div>
    </label>
  );
  const Inp = (key: keyof typeof form, placeholder?: string, type = 'text') => (
    <input type={type} className="border rounded-xl px-3 py-2.5 w-full bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
      value={form[key]} placeholder={placeholder}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
  );
  const Sel = (key: keyof typeof form, options: { v: string; l: string }[]) => (
    <select className="border rounded-xl px-3 py-2.5 w-full bg-white focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
      value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );

  return (
    <RequireRole role="broker">
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          {user && <p className="text-sm text-gray-400 mt-0.5">{user.name} · {user.phone}</p>}
        </div>
        <Link href={`/${locale}/workshop/pipeline`}
          className="flex items-center gap-2 border border-brand text-brand rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand/5">
          <KanbanSquare size={16} /> {t('pipeline')}
        </Link>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { icon: <FileText size={16} />, label: t('statMandates'), val: stats?.active_mandates ?? '—', color: 'text-brand' },
          { icon: <TrendingUp size={16} />, label: t('statPipeline'), val: stats?.open_deals ?? '—', color: 'text-amber-500' },
          { icon: <Users size={16} />, label: t('statClosed'), val: stats?.closed_deals ?? '—', color: 'text-green-600' },
          { icon: <Eye size={16} />, label: t('statViewings'), val: stats?.total_viewings ?? '—', color: 'text-purple-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-2xl p-3 text-center shadow-sm">
            <div className={`mx-auto w-fit mb-1 ${s.color}`}>{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 leading-tight mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: t('myMandates'), icon: <FileText size={18} />, href: `/${locale}/workshop/mandates`, color: 'border-brand/30 text-brand' },
          { label: t('cobroke'), icon: <Share2 size={18} />, href: `/${locale}/workshop/cobroke`, color: 'border-purple-200 text-purple-600' },
          { label: t('pipeline'), icon: <KanbanSquare size={18} />, href: `/${locale}/workshop/pipeline`, color: 'border-amber-200 text-amber-600' },
        ].map((item) => (
          <Link key={item.label} href={item.href}
            className={`bg-white border rounded-2xl p-3 text-center shadow-sm hover:shadow-md transition-all ${item.color}`}>
            <div className="mx-auto w-fit mb-1.5">{item.icon}</div>
            <div className="text-xs font-semibold">{item.label}</div>
          </Link>
        ))}
      </div>

      {/* STEP 1: De-dup check */}
      <div className={`bg-white border rounded-2xl p-5 mb-4 shadow-sm ${step !== 'dedup' ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 'dedup' ? 'bg-brand text-white' : 'bg-green-500 text-white'}`}>
            {step !== 'dedup' ? '✓' : '1'}
          </div>
          <h2 className="font-bold text-base">{t('stepDedup')}</h2>
        </div>

        <div className="space-y-3">
          {F(t('deedNo'),
            <input className="border rounded-xl px-3 py-2.5 w-full bg-white font-mono focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
              value={deedNo} onChange={(e) => setDeedNo(e.target.value)}
              placeholder="VTE-2024-00123" />
          )}
          <div>
            <span className="text-sm font-medium text-gray-600">{t('location')}</span>
            <div className="mt-1">
              <LocationPicker lat={lat} lng={lng} onChange={(la, lo) => { setLat(la); setLng(lo); }} />
            </div>
          </div>
        </div>

        <button onClick={checkDup} disabled={checking}
          className="mt-4 bg-brand text-white rounded-xl py-2.5 w-full font-semibold disabled:opacity-60 hover:bg-brand/90 transition-colors">
          {checking ? '...' : t('checkDup')}
        </button>

        {dupResult?.isDuplicate && (
          <div className="mt-3 bg-amber-50 border border-amber-300 rounded-xl p-3">
            <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm mb-1">
              <AlertTriangle size={16} /> {t('dupFound')}
            </div>
            <p className="text-xs text-gray-500">{dupResult.match?.reason}{dupResult.match?.distanceMeters != null && ` — ${dupResult.match.distanceMeters}m`}</p>
            <Link href={`/${locale}${dupResult.redirectTo}`}
              className="inline-block mt-2 bg-amber-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">
              → {t('requestMandate')}
            </Link>
          </div>
        )}
        {dupResult && !dupResult.isDuplicate && (
          <div className="mt-3 bg-green-50 border border-green-300 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm font-semibold">
            <CheckCircle2 size={16} /> {t('noDup')}
          </div>
        )}
      </div>

      {/* STEP 2: Property details + mandate request */}
      {(step === 'create' || step === 'done') && (
        <div className={`bg-white border rounded-2xl p-5 mb-4 shadow-sm ${step === 'done' ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 'create' ? 'bg-brand text-white' : 'bg-green-500 text-white'}`}>
              {step === 'done' ? '✓' : '2'}
            </div>
            <h2 className="font-bold text-base">{t('stepDetails')}</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 ml-9">ຂໍ້ມູນທີ່ດິນ + ຂໍສິດນາຍໜ້າ → ລໍຖ້າເຈົ້າຂອງອະນຸມັດ</p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {F(t('deedType'), Sel('deedType', [
                { v: 'titled', l: t('deedTitled') }, { v: 'survey', l: t('deedSurvey') },
                { v: 'tax_receipt', l: t('deedTaxReceipt') }, { v: 'white_paper', l: t('deedWhitePaper') },
              ]))}
              {F(t('landTypeLabel'), Sel('landType',
                (['residential', 'agricultural', 'industrial', 'commercial'] as const).map((k) => ({ v: k, l: tl(k) }))
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {F(t('province'), Inp('province', 'ນະຄອນຫຼວງວຽງຈັນ'))}
              {F(t('district'), Inp('district', 'ໄຊເສດຖາ'))}
            </div>
            {F(t('village'), Inp('village', 'ບ້ານໂພນທັນ'))}
            {F(t('address'), Inp('addressText'))}
            <div className="grid grid-cols-3 gap-3">
              {F(t('areaSqm'), Inp('areaSqm', '500', 'number'))}
              {F(t('price'), Inp('ownerSetPrice', '500000000', 'number'))}
              {F(t('currency'), Sel('priceCurrency', [{ v: 'LAK', l: 'LAK ₭' }, { v: 'USD', l: 'USD $' }, { v: 'THB', l: 'THB ฿' }]))}
            </div>

            {/* Mandate request section */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={15} className="text-brand" />
                ຂໍ້ມູນ Mandate Request
              </p>
              <div className="grid grid-cols-2 gap-3">
                {F('ຄ່ານາຍໜ້າ (%)', Inp('commissionPct', '3', 'number'))}
                {F('ເບີໂທເຈົ້າຂອງ', Inp('ownerPhone', '+85620xxxxxxx'), 'ສຳລັບສົ່ງ OTP')}
              </div>
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <Clock size={14} className="shrink-0 mt-0.5" />
              <span>ຫຼັງຈາກບັນທຶກ — ລະບົບຈະສົ່ງ OTP ໄປ WhatsApp ເຈົ້າຂອງ. Listing ຈະ <strong>ຍັງເປັນ Private</strong> ຈົນກວ່າເຈົ້າຂອງອະນຸມັດ.</span>
            </div>
          </div>

          {error && <div className="mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">{error}</div>}

          <button onClick={createPropertyAndRequestMandate} disabled={creating || !form.province || !form.district}
            className="mt-5 bg-brand text-white rounded-xl py-2.5 w-full font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-brand/90 transition-colors">
            <PlusCircle size={16} />
            {creating ? '...' : 'ບັນທຶກ + ຂໍ Mandate'}
          </button>
        </div>
      )}

      {/* STEP 3: Done — Pending Owner Approval */}
      {step === 'done' && created && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
              <Clock size={14} />
            </div>
            <h2 className="font-bold text-amber-700">ລໍຖ້າເຈົ້າຂອງອະນຸມັດ</h2>
          </div>
          <p className="text-sm text-gray-600 mb-1">ໄດ້ສ້າງທີ່ດິນ ແລະ ຂໍ Mandate ແລ້ວ — ລາຍການຈະ <strong>ຍັງເປັນ Private</strong> ຈົນກວ່າເຈົ້າຂອງຢືນຢັນ OTP ຜ່ານ WhatsApp.</p>
          <p className="text-xs text-gray-400 mb-4">
            Property ID: <code className="font-mono text-xs bg-white border px-2 py-0.5 rounded">{created.id ?? created.propertyId}</code>
          </p>
          <div className="flex gap-2">
            <Link href={`/${locale}/properties/${created.id ?? created.propertyId}`}
              className="flex-1 text-center border border-brand text-brand rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand/5">
              {t('viewProperty')}
            </Link>
            <button onClick={reset}
              className="flex-1 text-center bg-brand text-white rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand/90">
              {t('addAnother')}
            </button>
          </div>
        </div>
      )}
    </div>
    </RequireRole>
  );
}
