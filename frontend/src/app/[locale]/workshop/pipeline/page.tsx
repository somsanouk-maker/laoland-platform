'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, MapPin, CheckCircle2, Phone, User, Copy, CheckCheck, Plus } from 'lucide-react';
import { api } from '../../../../lib/api';
import RequireRole from '../../../../components/RequireRole';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrency } from '../../../../contexts/CurrencyContext';

const STAGES = ['inquiry', 'viewing', 'negotiation', 'deposit', 'closed', 'lost'] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { bg: string; border: string; dot: string; label: string }> = {
  inquiry:     { bg: 'bg-blue-50',   border: 'border-blue-200',   dot: 'bg-blue-400',   label: 'ສອบຖາມ' },
  viewing:     { bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-400', label: 'ນັດຊົມ' },
  negotiation: { bg: 'bg-yellow-50', border: 'border-yellow-200', dot: 'bg-yellow-400', label: 'ຕໍ່ລອງ' },
  deposit:     { bg: 'bg-orange-50', border: 'border-orange-200', dot: 'bg-orange-400', label: 'ວາງມັດຈຳ' },
  closed:      { bg: 'bg-green-50',  border: 'border-green-200',  dot: 'bg-green-500',  label: 'ສຳເລັດ' },
  lost:        { bg: 'bg-gray-50',   border: 'border-gray-200',   dot: 'bg-gray-400',   label: 'ບໍ່ສຳເລັດ' },
};

export default function PipelinePage() {
  const t = useTranslations('pipeline');
  const tl = useTranslations('landType');
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();

  const [board, setBoard] = useState<Record<Stage, any[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<{ id: string; fromStage: Stage } | null>(null);
  const [loggingGps, setLoggingGps] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [addingNote, setAddingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  async function loadBoard() {
    setLoading(true);
    try { setBoard(await api.getPipelineBoard()); }
    catch { setBoard(null); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadBoard(); }, []);

  async function moveStage(dealId: string, stage: Stage) {
    setMoving(dealId);
    try {
      await api.movePipelineStage(dealId, stage);
      await loadBoard();
    } finally { setMoving(null); }
  }

  async function logGpsViewing(dealId: string) {
    setLoggingGps(dealId);
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      await api.logViewing(dealId, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      await loadBoard();
      alert('✓ ບັນທຶກ GPS Viewing ສຳເລັດ — Buyer ຖືກລັອກ 90 ມື້ໃຫ້ທ່ານ');
    } catch (e: any) {
      if (e.code === 1) alert('GPS ຖືກປິດໃຊ້ — ກະລຸນາເປີດ Location ໃນ Browser');
      else alert('ເກີດຂໍ້ຜິດພາດ: ' + (e.message ?? 'unknown'));
    } finally { setLoggingGps(null); }
  }

  function copyTrackable(slug: string, dealId: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${locale}/m/${slug}`);
    setCopiedSlug(dealId);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function onDragStart(dealId: string, fromStage: Stage) {
    setDraggedDeal({ id: dealId, fromStage });
  }

  async function onDrop(toStage: Stage) {
    if (!draggedDeal || draggedDeal.fromStage === toStage) {
      setDraggedDeal(null); setDragOver(null); return;
    }
    await moveStage(draggedDeal.id, toStage);
    setDraggedDeal(null); setDragOver(null);
  }

  const total = board ? STAGES.reduce((s, k) => s + (board[k]?.length ?? 0), 0) : 0;

  return (
    <RequireRole role="broker">
        <div className="min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/workshop`} className="p-2 rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-gray-400">{total} {t('deals')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadBoard} className="p-2 rounded-xl border hover:bg-gray-50">
            <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
          </button>
          <Link href={`/${locale}/workshop`}
            className="flex items-center gap-1.5 bg-brand text-white rounded-xl px-3 py-2 text-sm font-semibold hover:bg-brand/90">
            <Plus size={14} /> ເພີ່ມ Deal
          </Link>
        </div>
      </div>

      {/* Stage summary bar */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-2 bg-white border rounded-xl px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-sm">
            <span className={`w-2 h-2 rounded-full ${STAGE_META[s].dot}`} />
            {t(`stage_${s}`)}
            <span className="ml-1 text-gray-400">{board?.[s]?.length ?? 0}</span>
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex gap-3">
          {STAGES.map((s) => (
            <div key={s} className="min-w-52 flex-shrink-0 bg-gray-100 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !board && (
        <div className="text-center py-20 text-gray-400">
          <p className="font-medium">{t('error')}</p>
          <button onClick={loadBoard} className="mt-2 text-sm text-brand underline">{t('retry')}</button>
        </div>
      )}

      {!loading && board && (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div
              key={stage}
              className="min-w-64 flex-shrink-0"
              onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => onDrop(stage)}
            >
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className={`w-2.5 h-2.5 rounded-full ${STAGE_META[stage].dot}`} />
                <span className="text-sm font-bold text-gray-700">{t(`stage_${stage}`)}</span>
                <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {board[stage]?.length ?? 0}
                </span>
              </div>

              <div className={`border-2 rounded-2xl p-2 min-h-40 space-y-2 transition-colors ${
                STAGE_META[stage].bg} ${dragOver === stage ? 'border-brand bg-brand/5' : STAGE_META[stage].border}`}
              >
                {(board[stage] ?? []).length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                    {t('empty')}
                  </div>
                )}

                {(board[stage] ?? []).map((deal: any) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => onDragStart(deal.id, stage)}
                    className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing transition-opacity ${moving === deal.id ? 'opacity-40' : ''}`}
                  >
                    {/* Property */}
                    <Link href={`/${locale}/properties/${deal.property_id}`}
                      className="block font-bold text-gray-900 text-sm hover:text-brand leading-tight">
                      {deal.district}, {deal.province}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">{tl(deal.land_type)}</p>

                    {deal.amount && (
                      <p className="text-xs text-brand font-semibold mt-1.5">{format(deal.amount)}</p>
                    )}

                    {/* Buyer info (masked if co-broke) */}
                    {deal.buyer_name && (
                      <div className="mt-2 bg-gray-50 rounded-lg p-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <User size={11} />
                          <span className="font-medium">{deal.buyer_contact_masked ? maskName(deal.buyer_name) : deal.buyer_name}</span>
                        </div>
                        {deal.buyer_phone && !deal.buyer_contact_masked && (
                          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                            <Phone size={11} />
                            <span className="font-mono">{deal.buyer_phone}</span>
                          </div>
                        )}
                        {deal.buyer_contact_masked && (
                          <p className="text-xs text-amber-600 mt-0.5">★ Co-broke — ຕິດຕໍ່ຜ່ານລະບົບ</p>
                        )}
                      </div>
                    )}

                    {/* Viewing count */}
                    {Number(deal.viewing_count) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-purple-600 mt-1.5">
                        <MapPin size={11} /> {deal.viewing_count} GPS viewing{Number(deal.viewing_count) > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Commission Protection Tools */}
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-1.5">
                      {/* GPS Log Viewing button */}
                      {stage !== 'closed' && stage !== 'lost' && (
                        <button
                          onClick={() => logGpsViewing(deal.id)}
                          disabled={loggingGps === deal.id}
                          className="w-full flex items-center justify-center gap-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg py-1.5 text-xs font-semibold hover:bg-purple-100 disabled:opacity-50 transition-colors"
                        >
                          <MapPin size={12} />
                          {loggingGps === deal.id ? 'GPS...' : 'Log GPS Viewing'}
                        </button>
                      )}

                      {/* Move buttons */}
                      <div className="flex flex-wrap gap-1">
                        {STAGES.filter((s) => s !== stage && s !== 'lost').map((s) => (
                          <button
                            key={s}
                            onClick={() => moveStage(deal.id, s)}
                            disabled={!!moving}
                            className="text-xs border rounded-lg px-1.5 py-0.5 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
                          >
                            → {t(`stage_${s}`)}
                          </button>
                        ))}
                        {stage !== 'lost' && (
                          <button
                            onClick={() => moveStage(deal.id, 'lost')}
                            disabled={!!moving}
                            className="text-xs border rounded-lg px-1.5 py-0.5 text-red-400 hover:border-red-400 disabled:opacity-40"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 text-center">{t('dragHint')}</p>
    </div>
    </RequireRole>
  );
}

function maskName(name: string): string {
  return name.split(' ').map((w) => w ? w[0] + '***' : '').join(' ');
}
