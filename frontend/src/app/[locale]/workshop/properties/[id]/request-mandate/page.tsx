'use client';
import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { api } from '../../../../../../lib/api';

const DEMO_BROKER = '11111111-1111-1111-1111-111111111111';

export default function RequestMandatePage({ params }: { params: { id: string } }) {
  const t = useTranslations('mandate');
  const tl = useTranslations('landType');
  const locale = useLocale();

  const [property, setProperty] = useState<any>(null);
  const [isExclusive, setIsExclusive] = useState(false);
  const [commissionPct, setCommissionPct] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getProperty(params.id).then(setProperty).catch(() => setProperty(null));
  }, [params.id]);

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.requestMandate(
        { propertyId: params.id, isExclusive, commissionPct: Number(commissionPct) },
        DEMO_BROKER,
      );
      setResult(data);
    } catch (e: any) {
      setError(e.data?.error ?? e.message ?? t('error'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg">
      <Link href={`/${locale}/workshop`} className="text-sm text-gray-400 hover:text-brand mb-4 inline-block">
        ← {t('back')}
      </Link>

      <h1 className="text-2xl font-bold mb-1">{t('title')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('subtitle')}</p>

      {/* Property summary */}
      {property && (
        <div className="bg-gray-50 border rounded-xl p-4 mb-5 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{tl(property.land_type)}</span>
            {property.green_badge && (
              <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">✓ Exclusive</span>
            )}
          </div>
          <p className="font-semibold">{property.district}, {property.province}</p>
          {property.owner_set_price && (
            <p className="text-brand font-bold mt-1">
              {Number(property.owner_set_price).toLocaleString()} {property.price_currency}
            </p>
          )}
        </div>
      )}

      {!result ? (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          {/* Mandate type */}
          <div>
            <p className="text-sm font-semibold mb-2">{t('mandateType')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsExclusive(false)}
                className={`border rounded-lg p-3 text-sm text-left transition-colors ${
                  !isExclusive ? 'border-brand bg-brand/5 text-brand font-semibold' : 'hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">{t('open')}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t('openDesc')}</div>
              </button>
              <button
                onClick={() => setIsExclusive(true)}
                className={`border rounded-lg p-3 text-sm text-left transition-colors ${
                  isExclusive ? 'border-brand bg-brand/5 text-brand font-semibold' : 'hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">{t('exclusive')}</div>
                <div className="text-xs text-gray-500 mt-0.5">{t('exclusiveDesc')}</div>
              </button>
            </div>
          </div>

          {/* Commission */}
          <label className="block text-sm">
            <span className="font-semibold">{t('commission')} (%)</span>
            <input
              type="number"
              min="1" max="10" step="0.5"
              className="border rounded-lg px-3 py-2 w-full mt-1"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
            />
            <span className="text-xs text-gray-400 mt-0.5 block">{t('commissionHint')}</span>
          </label>

          {isExclusive && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              ⚠️ {t('exclusiveWarning')}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">{error}</div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            className="bg-brand text-white px-4 py-2.5 rounded-lg w-full font-semibold disabled:opacity-60"
          >
            {submitting ? '...' : t('submit')}
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-300 rounded-xl p-5 space-y-3">
          <div className="text-lg font-bold text-green-700">✓ {t('success')}</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">{t('mandateId')}</span>
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">{result.id}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('mandateType')}</span>
              <span>{result.mandate_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t('trackableSlug')}</span>
              <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">{result.trackable_slug}</code>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link
              href={`/${locale}/properties/${params.id}`}
              className="flex-1 text-center border border-brand text-brand rounded-lg px-3 py-2 text-sm hover:bg-brand/5"
            >
              {t('viewProperty')}
            </Link>
            <Link
              href={`/${locale}/workshop/pipeline`}
              className="flex-1 text-center bg-brand text-white rounded-lg px-3 py-2 text-sm"
            >
              {t('viewPipeline')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
