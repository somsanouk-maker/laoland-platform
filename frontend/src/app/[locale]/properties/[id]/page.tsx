'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MessageCircle, CalendarCheck, CheckCircle2, ShieldCheck, Heart, Briefcase } from 'lucide-react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';

const MapView = dynamic(() => import('../../../../components/MapView'), { ssr: false });

type InquiryType = 'info' | 'viewing';

const STATUS_LAO: Record<string, string> = {
  active:        'ເປີດໃຊ້',
  pending_owner: 'ລໍຖ້າ',
  sold:          'ຂາຍແລ້ວ',
  archived:      'ເກັບໄວ້',
};

export default function PropertyDetailPage({ params }: { params: { id: string; locale: string } }) {
  const t = useTranslations('showroom');
  const tl = useTranslations('landType');
  const td = useTranslations('detail');
  const locale = useLocale();
  const { user, isLoading: authLoading } = useAuth();
  const { format } = useCurrency();

  const [p, setP] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Save state
  const [brokers, setBrokers] = useState<any[]>([]);
  const [selectedBroker, setSelectedBroker] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBrokerPicker, setShowBrokerPicker] = useState(false);

  // Inquiry panel state
  const [inquiryType, setInquiryType] = useState<InquiryType | null>(null);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [message, setMessage] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ brokerName: string; type: InquiryType } | null>(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    api.getProperty(params.id).then(setP).finally(() => setLoading(false));
    api.getPropertyBrokers(params.id).then(setBrokers).catch(() => {});
  }, [params.id]);

  // Sync save state and form fields whenever auth changes
  useEffect(() => {
    if (authLoading) return;
    if (user?.role === 'buyer') {
      api.getSavedProperties()
        .then((list) => setSaved(list.some((s: any) => s.id === params.id)))
        .catch(() => {});
      setBuyerName(user.name ?? '');
      setBuyerPhone(user.phone ?? '');
    } else {
      setSaved(false);
      setBuyerName('');
      setBuyerPhone('');
      setMessage('');
      setAppointmentDate('');
      setSubmitted(null);
      setInquiryType(null);
    }
  }, [user?.id, user?.role, authLoading]);

  async function toggleSave() {
    if (!user || user.role !== 'buyer') return;
    if (saved) {
      setSaving(true);
      await api.unsaveProperty(params.id).catch(() => {});
      setSaved(false); setSaving(false);
      return;
    }
    if (brokers.length === 1) {
      setSaving(true);
      await api.saveProperty({ propertyId: params.id, brokerId: brokers[0].broker_id }).catch(() => {});
      setSaved(true); setSaving(false);
    } else {
      setShowBrokerPicker(true);
    }
  }

  async function saveWithBroker(brokerId: string) {
    if (!user) return;
    setSaving(true); setShowBrokerPicker(false);
    await api.saveProperty({ propertyId: params.id, brokerId: brokerId || undefined }).catch(() => {});
    setSaved(true); setSaving(false);
  }

  async function submitInquiry() {
    if (!inquiryType || !buyerName.trim() || !buyerPhone.trim()) {
      setSubmitError('ກະລຸນາໃສ່ຊື່ ແລະ ເບີໂທ');
      return;
    }
    setSubmitting(true); setSubmitError('');
    try {
      const fullMessage = inquiryType === 'viewing' && appointmentDate
        ? `ວັນ/ເວລາ: ${new Date(appointmentDate).toLocaleString('lo-LA')}${message.trim() ? ' · ' + message.trim() : ''}`
        : message.trim() || undefined;

      const res = await api.inquireProperty(params.id, {
        type: inquiryType,
        buyerName: buyerName.trim(),
        buyerPhone: buyerPhone.trim(),
        message: fullMessage,
        buyerId: user?.id,
      });
      setSubmitted({ brokerName: res.brokerName, type: res.type });
      setInquiryType(null);
    } catch (e: any) {
      setSubmitError(e.data?.error ?? e.message ?? 'ເກີດຂໍ້ຜິດພາດ');
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="text-gray-400 py-10 text-center">...</div>;
  if (!p) return <div className="text-red-500 py-10 text-center">{td('notFound')}</div>;

  const deedLabels: Record<string, string> = {
    titled: td('titled'), survey: td('survey'),
    tax_receipt: td('taxReceipt'), white_paper: td('whitePaper'),
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <Link href={`/${locale}`} className="text-sm text-gray-400 hover:text-brand inline-block">← {td('back')}</Link>
        {!authLoading && user?.role === 'buyer' && (
          <button onClick={toggleSave} disabled={saving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-colors ${
              saved ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 text-gray-500 hover:border-brand hover:text-brand'
            }`}>
            <Heart size={15} className={saved ? 'fill-red-500 text-red-500' : ''} />
            {saved ? 'ບັນທຶກແລ້ວ' : 'ບັນທຶກ'}
          </button>
        )}
      </div>

      {/* Broker picker modal */}
      {showBrokerPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-bold text-lg mb-1">ເລືອກນາຍໜ້າ</h2>
            <p className="text-sm text-gray-500 mb-4">ເລືອກນາຍໜ້າທີ່ທ່ານຕ້ອງການໃຫ້ດູແລ</p>
            <div className="space-y-2">
              {brokers.map((b: any) => (
                <button key={b.broker_id} onClick={() => saveWithBroker(b.broker_id)}
                  className="w-full flex items-center gap-3 border rounded-xl px-4 py-3 hover:border-brand hover:bg-brand/5 text-left transition-colors">
                  <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm">
                    {b.broker_name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{b.broker_name}</div>
                    <div className="text-xs text-gray-400">
                      {b.is_exclusive ? '★ Exclusive' : 'Open'} Mandate
                    </div>
                  </div>
                  {b.is_exclusive && (
                    <span className="ml-auto text-xs bg-brand text-white px-2 py-0.5 rounded-full">Exclusive</span>
                  )}
                </button>
              ))}
              {brokers.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">ບໍ່ມີນາຍໜ້າ — ບັນທຶກໄວ້ກ່ອນ</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowBrokerPicker(false)}
                className="flex-1 border rounded-xl py-2.5 text-sm hover:bg-gray-50">ຍົກເລີກ</button>
              {brokers.length === 0 && (
                <button onClick={() => saveWithBroker('')}
                  className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold">ບັນທຶກ (ບໍ່ເລືອກ)</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded mr-2">
              {tl(p.land_type)}
            </span>
            {p.green_badge && (
              <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">
                ✓ {t('greenBadge')}
              </span>
            )}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded ${
            p.status === 'active'   ? 'bg-green-100 text-green-700' :
            p.status === 'sold'     ? 'bg-blue-100 text-blue-700' :
            p.status === 'archived' ? 'bg-gray-100 text-gray-500' :
                                      'bg-amber-100 text-amber-700'
          }`}>{STATUS_LAO[p.status] ?? p.status}</span>
        </div>

        <h1 className="text-2xl font-bold mb-1">{p.district}, {p.province}</h1>
        {p.village && <p className="text-gray-500 text-sm mb-4">{td('village')}: {p.village}</p>}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">{td('price')}</div>
            <div className="text-2xl font-bold text-brand">
              {p.owner_set_price ? format(p.owner_set_price) : '—'}
            </div>
            {p.price_locked && (
              <div className="text-xs text-green-600 mt-1">🔒 {td('priceLocked')}</div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">{td('area')}</div>
            <div className="text-xl font-bold">
              {p.area_sqm ? `${Number(p.area_sqm).toLocaleString()} m²` : '—'}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {p.title_deed_no && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">{td('deedNo')}</span>
              <span className="font-mono font-semibold">{p.title_deed_no}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">{td('deedType')}</span>
            <span>{deedLabels[p.deed_type] ?? p.deed_type}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-500">{td('ownerVerified')}</span>
            <span>{p.owner_verified ? `✓ ${td('yes')}` : td('no')}</span>
          </div>
          {p.address_text && (
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-500">{td('address')}</span>
              <span className="text-right max-w-xs">{p.address_text}</span>
            </div>
          )}
        </div>

        {/* Embedded map */}
        {p.lat && p.lng && (
          <div className="mt-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">📍 {td('viewMap')}</div>
            <MapView
              pins={[{
                id: p.id,
                lat: Number(p.lat),
                lng: Number(p.lng),
                label: `${p.district}, ${p.province}`,
                price: p.owner_set_price
                  ? `${Number(p.owner_set_price).toLocaleString()} ${p.price_currency}`
                  : undefined,
                greenBadge: !!p.green_badge,
              }]}
              center={{ lat: Number(p.lat), lng: Number(p.lng) }}
              zoom={16}
              height="280px"
              cluster={false}
            />
            <a
              href={`https://www.google.com/maps?q=${p.lat},${p.lng}`}
              target="_blank" rel="noreferrer"
              className="text-xs text-brand hover:underline mt-1 inline-block"
            >
              ↗ ເປີດໃນ Google Maps
            </a>
          </div>
        )}

        {/* Buffer Layer notice */}
        <div className="mt-6 bg-brand/5 border border-brand/20 rounded-xl p-3 flex items-start gap-2 text-sm">
          <ShieldCheck size={16} className="text-brand mt-0.5 shrink-0" />
          <span className="text-gray-600">
            ການຕິດຕໍ່ທຸກຢ່າງຜ່ານນາຍໜ້າທີ່ໄດ້ຮັບສິດ — ເຈົ້າຂອງທີ່ດິນ ແລະ ຂໍ້ມູນສ່ວນຕົວຈະຖືກປົກປ້ອງ
          </span>
        </div>

        {/* Success state */}
        {submitted && (
          <div className="mt-4 bg-green-50 border border-green-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-700 text-sm">
                {submitted.type === 'viewing' ? '✓ ສົ່ງຄຳຂໍນັດຊົມແລ້ວ' : '✓ ສົ່ງຄຳຂໍຂໍ້ມູນແລ້ວ'}
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                ນາຍໜ້າ <strong>{submitted.brokerName}</strong> ຈະຕິດຕໍ່ກັບຫາທ່ານໂດຍໄວ
              </p>
              <button onClick={() => setSubmitted(null)}
                className="mt-2 text-xs text-green-700 underline">ສົ່ງຄຳຂໍໃໝ່</button>
            </div>
          </div>
        )}

        {/* CTA buttons */}
        {!submitted && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setInquiryType(inquiryType === 'info' ? null : 'info')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
                inquiryType === 'info'
                  ? 'bg-brand text-white border-brand'
                  : 'border-brand text-brand hover:bg-brand/5'
              }`}
            >
              <MessageCircle size={16} />
              ຂໍຂໍ້ມູນເພີ່ມ
            </button>
            <button
              onClick={() => setInquiryType(inquiryType === 'viewing' ? null : 'viewing')}
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
                inquiryType === 'viewing'
                  ? 'bg-brand text-white border-brand'
                  : 'border-brand text-brand hover:bg-brand/5'
              }`}
            >
              <CalendarCheck size={16} />
              ນັດຊົມທີ່ດິນ
            </button>
          </div>
        )}

        {/* Inquiry form (inline, toggles open) */}
        {!submitted && inquiryType && (
          <div className={`mt-3 border rounded-xl p-4 space-y-3 ${
            inquiryType === 'viewing'
              ? 'border-purple-200 bg-purple-50'
              : 'border-brand/30 bg-brand/5'
          }`}>
            {/* Form header */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{inquiryType === 'viewing' ? '📅' : '💬'}</span>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {inquiryType === 'viewing' ? 'ນັດຊົມທີ່ດິນ' : 'ຂໍຂໍ້ມູນເພີ່ມເຕີມ'}
                </p>
                <p className="text-xs text-gray-400">
                  {inquiryType === 'viewing'
                    ? 'ເລືອກວັນ/ເວລາທີ່ທ່ານສະດວກ — ນາຍໜ້າຈະຢືນຢັນ'
                    : 'ຖາມຄຳຖາມ — ນາຍໜ້າຈະຕອບທາງ WhatsApp'}
                </p>
              </div>
            </div>

            {/* Contact fields */}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-600">
                ຊື່ຂອງທ່ານ <span className="text-red-400">*</span>
                <input
                  className="border rounded-lg px-3 py-2 w-full mt-1 text-sm bg-white"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="ທ. ສົມໃຈ"
                />
              </label>
              <label className="block text-xs font-medium text-gray-600">
                ເບີ WhatsApp <span className="text-red-400">*</span>
                <input
                  className="border rounded-lg px-3 py-2 w-full mt-1 text-sm bg-white"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  placeholder="+85620xxxxxxx"
                />
              </label>
            </div>

            {/* Viewing: date/time picker */}
            {inquiryType === 'viewing' && (
              <label className="block text-xs font-medium text-gray-600">
                📅 ວັນ ແລະ ເວລາທີ່ຕ້ອງການນັດ
                <input
                  type="datetime-local"
                  className="border rounded-lg px-3 py-2 w-full mt-1 text-sm bg-white"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </label>
            )}

            {/* Info: question textarea */}
            {inquiryType === 'info' && (
              <label className="block text-xs font-medium text-gray-600">
                💬 ຄຳຖາມ / ຂໍ້ຄວາມ
                <textarea
                  className="border rounded-lg px-3 py-2 w-full mt-1 text-sm bg-white resize-none"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ເຊັ່ນ: ຂໍເອກະສານໃບຕາດິນ, ສາມາດຕໍ່ລາຄາໄດ້ບໍ?"
                />
              </label>
            )}

            {/* Viewing: optional extra note */}
            {inquiryType === 'viewing' && (
              <label className="block text-xs font-medium text-gray-600">
                ຂໍ້ຄວາມເພີ່ມ (ຖ້ານ)
                <input
                  className="border rounded-lg px-3 py-2 w-full mt-1 text-sm bg-white"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ເຊັ່ນ: ນັດຢູ່ທາງເຂົ້າ, ຈະໄປ 2 ຄົນ"
                />
              </label>
            )}

            {submitError && <p className="text-xs text-red-500">{submitError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setInquiryType(null); setSubmitError(''); setAppointmentDate(''); setMessage(''); }}
                className="flex-1 border rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50 bg-white">
                ຍົກເລີກ
              </button>
              <button onClick={submitInquiry} disabled={submitting}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  inquiryType === 'viewing' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-brand hover:bg-brand/90'
                }`}>
                {submitting ? '...' : inquiryType === 'viewing' ? 'ສົ່ງຄຳຂໍນັດ' : 'ສົ່ງຄຳຖາມ'}
              </button>
            </div>
          </div>
        )}

        {/* Broker CTA — only for brokers */}
        {!authLoading && user?.role === 'broker' && (
          <div className="mt-3">
            <Link
              href={`/${locale}/workshop/properties/${p.id}/request-mandate`}
              className="block text-center border border-gray-300 text-gray-500 rounded-xl px-4 py-2.5 text-xs hover:bg-gray-50"
            >
              🏢 ນາຍໜ້າ: ຂໍ Mandate ທີ່ດິນນີ້
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
