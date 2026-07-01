'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowLeft, Heart, Briefcase, MapPin, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../contexts/AuthContext';
import RequireRole from '../../../../components/RequireRole';

const LAND_TYPE_LAO: Record<string, string> = {
  residential: 'ທີ່ດິນປຸກສ້າງ',
  agricultural: 'ທີ່ດິນກະສິກຳ',
  industrial: 'ທີ່ດິນອຸດສາຫະກຳ',
  commercial: 'ທີ່ດິນການຄ້າ',
};

export default function SavedPage() {
  const locale = useLocale();
  const { user } = useAuth();

  const [saved, setSaved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try { setSaved(await api.getSavedProperties()); }
    catch { setSaved([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function remove(propertyId: string) {
    setRemovingId(propertyId);
    try {
      await api.unsaveProperty(propertyId);
      setSaved((prev) => prev.filter((s) => s.id !== propertyId));
    } finally { setRemovingId(null); }
  }

  return (
    <RequireRole role="buyer">
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/buyer`} className="p-2 rounded-xl border hover:bg-gray-50">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">ທີ່ດິນທີ່ບັນທຶກໄວ້</h1>
            <p className="text-sm text-gray-400">{saved.length} ລາຍການ</p>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && saved.length === 0 && (
        <div className="bg-white border rounded-2xl p-12 text-center text-gray-400 shadow-sm">
          <Heart size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-lg">ຍັງບໍ່ມີທີ່ດິນທີ່ບັນທຶກ</p>
          <p className="text-sm mt-1">ກົດປຸ່ມ ❤ ຢູ່ໃນໜ້າທີ່ດິນ ເພື່ອບັນທຶກໄວ້ທີ່ນີ້</p>
          <Link href={`/${locale}`}
            className="mt-4 inline-block text-sm text-brand font-semibold hover:underline">
            ຄົ້ນຫາທີ່ດິນ →
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {saved.map((s: any) => (
          <div key={s.saved_id} className="bg-white border rounded-2xl p-4 shadow-sm hover:border-brand/40 transition-colors">
            <div className="flex items-start gap-4">
              {/* Property info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {LAND_TYPE_LAO[s.land_type] ?? s.land_type}
                  </span>
                  {s.green_badge && (
                    <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full">✓ Exclusive</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded ml-auto ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{s.status}</span>
                </div>

                <Link href={`/${locale}/properties/${s.id}`}
                  className="font-bold text-gray-900 hover:text-brand text-base leading-tight">
                  {s.district}, {s.province}
                </Link>
                {s.village && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <MapPin size={11} /> {s.village}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <div>
                    <span className="text-lg font-bold text-brand">
                      {s.owner_set_price ? `${Number(s.owner_set_price).toLocaleString()} ${s.price_currency}` : '—'}
                    </span>
                  </div>
                  {s.area_sqm && (
                    <span className="text-sm text-gray-500">{Number(s.area_sqm).toLocaleString()} m²</span>
                  )}
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={() => remove(s.id)}
                disabled={removingId === s.id}
                className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                title="ລົບອອກ"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Selected broker */}
            {s.broker_name ? (
              <div className="mt-3 flex items-center gap-2 bg-brand/5 border border-brand/20 rounded-xl px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-brand text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {s.broker_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700">{s.broker_name}</div>
                  <div className="text-xs text-gray-400">ນາຍໜ້າທີ່ເລືອກ</div>
                </div>
                <Link href={`/${locale}/properties/${s.id}`}
                  className="text-xs text-brand font-semibold hover:underline shrink-0">
                  ຕິດຕໍ່ →
                </Link>
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <Briefcase size={14} className="text-amber-500 shrink-0" />
                <span className="text-xs text-amber-700 flex-1">ຍັງບໍ່ໄດ້ເລືອກນາຍໜ້າ</span>
                <Link href={`/${locale}/properties/${s.id}`}
                  className="text-xs text-amber-700 font-semibold hover:underline shrink-0">
                  ເລືອກນາຍໜ້າ →
                </Link>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-400">
              ບັນທຶກໃນ {new Date(s.saved_at).toLocaleDateString('lo-LA')}
            </div>
          </div>
        ))}
      </div>
    </div>
    </RequireRole>
  );
}
