'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Home, CheckSquare, Eye, Lock, MessageCircle, RefreshCw, ShieldAlert,
  Briefcase, Phone, Star, Clock, TrendingUp, FileText, Upload, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { api } from '../../../lib/api';
import RequireRole from '../../../components/RequireRole';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrency } from '../../../contexts/CurrencyContext';

const STATUS_COLORS: Record<string, string> = {
  active:       'bg-green-100 text-green-700',
  draft:        'bg-gray-100 text-gray-500',
  pending_owner:'bg-amber-100 text-amber-700',
  sold:         'bg-blue-100 text-blue-700',
  archived:     'bg-gray-100 text-gray-400',
};

const MANDATE_STATUS: Record<string, string> = {
  requested: 'bg-yellow-100 text-yellow-700',
  active:    'bg-green-100 text-green-700',
  revoked:   'bg-red-100 text-red-600',
  expired:   'bg-gray-100 text-gray-500',
};

type Tab = 'properties' | 'mandates' | 'documents';

// Document Vault: owner uploads docs for verification
const DOC_TYPES = [
  { key: 'land_title', label: 'ໃບຕາດິນ (ຕອງແດງ / ໃບຂາວ)', icon: '📄' },
  { key: 'tax_receipt', label: 'ໃບເສຍພາສີ', icon: '🧾' },
  { key: 'family_book', label: 'ປຶ້ມຄອບຄົວ', icon: '📒' },
  { key: 'id_card', label: 'ບັດປະຈຳຕົວ', icon: '🪪' },
];

export default function OwnerPage() {
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();

  const [tab, setTab] = useState<Tab>('properties');
  const [properties, setProperties] = useState<any[]>([]);
  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // OTP flow for property activation
  const [otpPropertyId, setOtpPropertyId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpPrice, setOtpPrice] = useState('');
  const [otpCurrency, setOtpCurrency] = useState<'LAK' | 'USD' | 'THB'>('LAK');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Uploaded docs (mock — would be stored per property in production)
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const [props, mands] = await Promise.all([
        api.getOwnerProperties().catch(() => [] as any[]),
        api.getOwnerMandates().catch(() => [] as any[]),
      ]);
      setProperties(props);
      setMandates(mands);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function approveMandate(mandateId: string) {
    if (!confirm('ທ່ານຕ້ອງການອະນຸມັດ Mandate ນາຍໜ້ານີ້ບໍ?')) return;
    setApprovingId(mandateId);
    try {
      await api.approveMandate(mandateId);
      await load();
    } catch (e: any) {
      alert(e.data?.error ?? e.message ?? 'ເກີດຂໍ້ຜິດພາດ');
    } finally { setApprovingId(null); }
  }

  async function revokeMandate(mandateId: string) {
    if (!confirm('ທ່ານຕ້ອງການຍົກເລີກ Mandate ນີ້ບໍ?')) return;
    setRevokingId(mandateId);
    try {
      await api.revokeOwnerMandate(mandateId);
      await load();
    } catch (e: any) {
      alert(e.data?.error ?? e.message ?? 'ເກີດຂໍ້ຜິດພາດ');
    } finally { setRevokingId(null); }
  }

  async function sendOtp(propertyId: string) {
    setOtpSending(true); setOtpError('');
    try {
      await api.requestOwnerOtp(propertyId);
      setOtpPropertyId(propertyId);
      setOtpSent(true);
    } catch (e: any) {
      setOtpError(e.data?.error ?? e.message ?? 'ບໍ່ສາມາດສົ່ງ OTP');
    } finally { setOtpSending(false); }
  }

  async function verifyOtp() {
    if (!otpPropertyId) return;
    setOtpVerifying(true); setOtpError('');
    try {
      await api.verifyOwnerOtp({
        propertyId: otpPropertyId, code: otpCode,
        ownerSetPrice: Number(otpPrice), priceCurrency: otpCurrency,
      });
      setOtpPropertyId(null); setOtpCode(''); setOtpPrice(''); setOtpSent(false);
      await load();
    } catch (e: any) {
      setOtpError(e.data?.error ?? e.message ?? 'OTP ບໍ່ຖືກຕ້ອງ');
    } finally { setOtpVerifying(false); }
  }

  const pendingMandates = mandates.filter((m) => m.status === 'requested');
  const activeMandates = mandates.filter((m) => m.status === 'active');

  return (
    <RequireRole role="owner">
        <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">ຄັງຄວບຄຸມເຈົ້າຂອງ</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user?.name} · {user?.phone}</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { icon: <Home size={16} />, label: 'ທີ່ດິນ', val: properties.length, color: 'text-brand' },
          { icon: <Clock size={16} />, label: 'ລໍຖ້າ', val: pendingMandates.length, color: 'text-amber-500' },
          { icon: <CheckSquare size={16} />, label: 'Mandate Active', val: activeMandates.length, color: 'text-green-600' },
          { icon: <Eye size={16} />, label: 'ການສອບຖາມ', val: properties.reduce((s, p) => s + Number(p.inquiries ?? 0), 0), color: 'text-purple-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-2xl p-3 text-center shadow-sm">
            <div className={`mx-auto w-fit mb-1 ${s.color}`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Pending mandate alert */}
      {pendingMandates.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-700 text-sm">{pendingMandates.length} Mandate ລໍຖ້າການອະນຸມັດ</p>
            <p className="text-xs text-amber-600 mt-0.5">ນາຍໜ້າໄດ້ຂໍສິດຂາຍທີ່ດິນຂອງທ່ານ — ກະລຸນາກວດ ແລ່ ອະນຸມັດ ຫຼື ປະຕິເສດ</p>
            <button onClick={() => setTab('mandates')} className="mt-2 text-xs bg-amber-600 text-white px-3 py-1 rounded-lg font-semibold">
              ກວດ Mandate →
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'properties', label: 'ທີ່ດິນຂອງຂ້ອຍ', icon: <Home size={14} /> },
          { key: 'mandates', label: 'ຈັດການ Mandate', icon: <Briefcase size={14} />, badge: pendingMandates.length },
          { key: 'documents', label: 'ຄັງເອກະສານ', icon: <FileText size={14} /> },
        ] as const).map((tab_) => (
          <button key={tab_.key} onClick={() => setTab(tab_.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === tab_.key ? 'bg-brand text-white border-brand' : 'bg-white hover:border-gray-400'
            }`}>
            {tab_.icon} {tab_.label}
            {'badge' in tab_ && tab_.badge > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {tab_.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB: My Properties ===== */}
      {tab === 'properties' && (
        <div className="space-y-4">
          {loading && [1, 2].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-44 animate-pulse" />)}

          {!loading && properties.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Home size={40} className="mx-auto mb-3 opacity-30" />
              <p>ຍັງບໍ່ມີທີ່ດິນ — ໂທຫານາຍໜ້າ ຫຼື ລົງທະບຽນ</p>
            </div>
          )}

          {properties.map((p) => (
            <div key={p.id} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/${locale}/properties/${p.id}`} className="font-bold text-gray-900 hover:text-brand text-lg">
                    {p.district}, {p.province}
                  </Link>
                  <p className="text-sm text-gray-400 mt-0.5">{p.land_type} · {p.deed_type}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_LAO[p.status] ?? p.status}
                </span>
              </div>

              {/* Performance stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-purple-500 mb-1"><Eye size={14} /></div>
                  <div className="font-bold text-lg">{p.inquiries ?? 0}</div>
                  <div className="text-xs text-gray-400">ສອບຖາມ</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-500 mb-1"><Briefcase size={14} /></div>
                  <div className="font-bold text-lg">{p.active_mandates ?? 0}</div>
                  <div className="text-xs text-gray-400">Mandate Active</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1"><Lock size={14} /></div>
                  <div className="font-bold text-base">
                    {p.owner_set_price ? format(p.owner_set_price) : '—'}
                  </div>
                  <div className="text-xs text-gray-400">ລາຄາ{p.price_locked ? ' (Locked)' : ''}</div>
                </div>
              </div>

              {/* Activate via WhatsApp OTP */}
              {p.status !== 'active' && p.status !== 'sold' && (
                <div className="mt-3">
                  {otpPropertyId !== p.id ? (
                    <button
                      onClick={() => sendOtp(p.id)}
                      disabled={otpSending}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                    >
                      <MessageCircle size={16} />
                      {otpSending ? '...' : 'ຢືນຢັນ + ຕັ້ງລາຄາ ຜ່ານ WhatsApp OTP'}
                    </button>
                  ) : (
                    <div className="border border-green-300 rounded-xl p-4 bg-green-50">
                      <p className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 size={16} /> ສົ່ງ OTP ໄປ WhatsApp ແລ້ວ
                      </p>
                      <div className="space-y-2">
                        <input
                          className="border rounded-xl px-3 py-2.5 w-full text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-green-300 outline-none"
                          placeholder="ໃສ່ OTP 6 ຕົວ"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          maxLength={6}
                        />
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" className="border rounded-xl px-3 py-2 col-span-2 focus:ring-2 focus:ring-green-300 outline-none"
                            placeholder="ລາຄາ (ຕາມຈິງ)" value={otpPrice} onChange={(e) => setOtpPrice(e.target.value)} />
                          <select className="border rounded-xl px-2 py-2 bg-white focus:ring-2 focus:ring-green-300 outline-none"
                            value={otpCurrency} onChange={(e) => setOtpCurrency(e.target.value as any)}>
                            <option value="LAK">LAK ₭</option>
                            <option value="USD">USD $</option>
                            <option value="THB">THB ฿</option>
                          </select>
                        </div>
                        {otpError && <p className="text-xs text-red-600">{otpError}</p>}
                        <button onClick={verifyOtp} disabled={otpVerifying || !otpCode || !otpPrice}
                          className="w-full bg-green-600 text-white rounded-xl py-2.5 font-semibold disabled:opacity-60 hover:bg-green-700 transition-colors">
                          {otpVerifying ? '...' : '✓ ຢືນຢັນ + ເປີດໃຊ້ Listing'}
                        </button>
                        <p className="text-xs text-gray-400 text-center">Demo OTP: 123456</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {p.status === 'active' && (
                <div className="flex items-center gap-2 text-green-600 text-sm font-semibold mt-2">
                  <CheckCircle2 size={16} /> Listing Active — ລາຄາ Locked ✓
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== TAB: Mandate Management ===== */}
      {tab === 'mandates' && (
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700 flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>ທ່ານເປັນ "ຜູ້ຄຸ້ມ Gate" — ທ່ານຕ້ອງ <strong>ອະນຸມັດ</strong> ກ່ອນ ນາຍໜ້າຈຶ່ງຂາຍທີ່ດິນໄດ້. ທ່ານຍົກເລີກ Mandate ໄດ້ທຸກເວລາ.</span>
          </div>

          {loading && [1, 2].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-36 animate-pulse" />)}

          {!loading && mandates.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Briefcase size={36} className="mx-auto mb-3 opacity-30" />
              <p>ຍັງບໍ່ມີ Mandate ຮ້ອງຂໍ</p>
            </div>
          )}

          {mandates.map((m) => (
            <div key={m.id} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <Link href={`/${locale}/properties/${m.property_id}`}
                    className="font-bold text-gray-900 hover:text-brand text-lg">
                    {m.district}, {m.province}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{m.land_type}</p>
                  {m.owner_set_price && <p className="text-brand font-bold mt-1">{format(m.owner_set_price)}</p>}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${MANDATE_STATUS[m.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {MANDATE_LAO[m.status] ?? m.status}
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
                  <p className="font-semibold text-sm">{m.broker_name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Phone size={11} /><span className="font-mono">{m.broker_phone}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">ຄ່ານາຍໜ້າ</div>
                  <div className="font-bold text-sm">{m.commission_pct}%</div>
                </div>
              </div>

              <div className="flex items-center text-xs text-gray-400 mb-3">
                <Clock size={11} className="mr-1" />
                ຮ້ອງຂໍ: {new Date(m.created_at).toLocaleDateString()}
                {m.approved_at && <> · ອະນຸມັດ: {new Date(m.approved_at).toLocaleDateString()}</>}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {m.status === 'requested' && (
                  <>
                    <button
                      onClick={() => approveMandate(m.id)}
                      disabled={approvingId === m.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                    >
                      <CheckCircle2 size={15} />
                      {approvingId === m.id ? '...' : 'ອະນຸມັດ'}
                    </button>
                    <button
                      onClick={() => revokeMandate(m.id)}
                      disabled={revokingId === m.id}
                      className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
                    >
                      {revokingId === m.id ? '...' : 'ປະຕິເສດ'}
                    </button>
                  </>
                )}
                {m.status === 'active' && (
                  <button
                    onClick={() => revokeMandate(m.id)}
                    disabled={revokingId === m.id}
                    className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-60 transition-colors"
                  >
                    {revokingId === m.id ? '...' : 'ຍົກເລີກ Mandate'}
                  </button>
                )}
                {(m.status === 'revoked' || m.status === 'expired') && (
                  <div className="flex-1 text-center text-xs text-gray-400 py-2">ສິ້ນສຸດແລ້ວ</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== TAB: Document Vault ===== */}
      {tab === 'documents' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5 text-sm text-blue-700 flex items-start gap-2">
            <FileText size={16} className="shrink-0 mt-0.5" />
            <span>ອັບໂຫຼດເອກະສານສຳຄັນ — ຊ່ວຍໃຫ້ Listing ໄດ້ <strong>Green Badge ✓</strong> ຜ່ານການຢືນຢັນ.</span>
          </div>

          <div className="space-y-3">
            {DOC_TYPES.map((doc) => (
              <div key={doc.key} className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{doc.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{doc.label}</p>
                    {uploadedDocs[doc.key]
                      ? <p className="text-xs text-green-600 mt-0.5">✓ ອັບໂຫຼດແລ້ວ</p>
                      : <p className="text-xs text-gray-400 mt-0.5">ຍັງບໍ່ໄດ້ອັບໂຫຼດ</p>
                    }
                  </div>
                </div>
                <label className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
                  uploadedDocs[doc.key]
                    ? 'bg-green-50 border border-green-300 text-green-700 hover:bg-green-100'
                    : 'bg-brand text-white hover:bg-brand/90'
                }`}>
                  <Upload size={13} />
                  {uploadedDocs[doc.key] ? 'ປ່ຽນໃໝ່' : 'ອັບໂຫຼດ'}
                  <input type="file" className="hidden" accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setUploadedDocs((prev) => ({ ...prev, [doc.key]: file.name }));
                    }} />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-5 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-700 flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>ການຈັດເກັບໄຟລ໌ຈິງ (Cloud Storage) ຈະຖືກນຳໃຊ້ໃນ Production — ລະຫວ່າງ MVP ນີ້ເປັນການສາທິດ UI.</span>
          </div>
        </div>
      )}
    </div>
    </RequireRole>
  );
}

const STATUS_LAO: Record<string, string> = {
  active: 'ເປີດໃຊ້', draft: 'ຮ່າງ', pending_owner: 'ລໍຖ້າ', sold: 'ຂາຍແລ້ວ', archived: 'ເກັບໄວ້',
};
const MANDATE_LAO: Record<string, string> = {
  requested: 'ລໍຖ້າ', active: 'Active', revoked: 'ຖືກຍົກເລີກ', expired: 'ໝົດອາຍຸ',
};
