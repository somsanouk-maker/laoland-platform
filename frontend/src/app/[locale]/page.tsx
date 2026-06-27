'use client';
import { useEffect, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Map, LayoutGrid, Search, Star, TrendingUp, ShieldCheck,
  Building2, SlidersHorizontal, X, ChevronDown, Phone,
  ArrowRight, Home, Briefcase, Maximize2, Minimize2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useAuth } from '../../contexts/AuthContext';
import type { MapPin } from '../../components/MapView';

const MapView = dynamic(() => import('../../components/MapView'), { ssr: false });

type ViewMode = 'grid' | 'map';

const LAND_TYPES = [
  { v: 'residential',  l: 'ທີ່ດິນປຸກສ້າງ', e: 'Residential' },
  { v: 'agricultural', l: 'ທີ່ດິນກະສິກຳ',  e: 'Agricultural' },
  { v: 'industrial',   l: 'ທີ່ດິນອຸດສາຫະ', e: 'Industrial'   },
  { v: 'commercial',   l: 'ທີ່ດິນການຄ້າ',  e: 'Commercial'  },
] as const;

const PRICE_PRESETS = [
  { l: 'ທັງໝົດ', min: 0, max: 0 },
  { l: '< 500M ₭', min: 0, max: 500_000_000 },
  { l: '500M–1B ₭', min: 500_000_000, max: 1_000_000_000 },
  { l: '1B–3B ₭', min: 1_000_000_000, max: 3_000_000_000 },
  { l: '> 3B ₭', min: 3_000_000_000, max: 0 },
];

const CURRENCIES = ['LAK', 'USD', 'THB'] as const;

export default function ShowroomPage() {
  const locale = useLocale();
  const { currency, setCurrency, format } = useCurrency();
  const { user } = useAuth();

  // Market stats
  const [stats, setStats] = useState<any>(null);

  // Search state
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [query_, setQuery_] = useState('');
  const [landType, setLandType] = useState('');
  const [pricePreset, setPricePreset] = useState(0);
  const [greenBadgeOnly, setGreenBadgeOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    api.getMarketStats().then(setStats).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ limit: '100' });
    if (query_.trim()) qs.set('province', query_.trim());
    if (landType) qs.set('landType', landType);
    const preset = PRICE_PRESETS[pricePreset];
    if (preset.min > 0) qs.set('minPrice', String(preset.min));
    if (preset.max > 0) qs.set('maxPrice', String(preset.max));
    if (greenBadgeOnly) qs.set('greenBadge', 'true');
    try { setItems(await api.searchProperties(qs.toString())); }
    finally { setLoading(false); }
  }, [query_, landType, pricePreset, greenBadgeOnly]);

  useEffect(() => { load(); }, [landType, pricePreset, greenBadgeOnly]);

  const mapPins: MapPin[] = items
    .filter((p) => p.lat && p.lng)
    .map((p) => ({
      id: p.id,
      lat: Number(p.lat),
      lng: Number(p.lng),
      label: `${p.district}, ${p.province}`,
      price: p.owner_set_price ? format(p.owner_set_price) : undefined,
      greenBadge: p.green_badge,
      onClick: () => setSelectedId(p.id),
    }));

  const selected = items.find((p) => p.id === selectedId);

  // Stat card helper
  const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number | null; sub?: string }) => (
    <div className="bg-white/90 backdrop-blur border rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="text-brand shrink-0">{icon}</div>
      <div>
        <div className="font-bold text-lg leading-tight text-gray-900">
          {value !== null && value !== undefined ? value : '—'}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{label}</div>
        {sub && <div className="text-xs text-brand font-semibold">{sub}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">

      {/* ══════════════════════════════════════════════
          HERO SECTION — Platform identity + CTA strip
          ══════════════════════════════════════════════ */}
      <div className="mb-6">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
              LaoLand <span className="text-brand">Showroom</span>
            </h1>
            <p className="text-gray-500 text-base mt-1">
              ຕະຫຼາດອະສັງຫາລິມະສັບລາວ · One Property, One Price
            </p>
          </div>

          {/* Currency toggle — global, top-right */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">ສະກຸນເງິນ:</span>
            <div className="flex border rounded-xl overflow-hidden shadow-sm bg-white">
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className={`px-3 py-2 text-xs font-bold transition-colors ${currency === c ? 'bg-brand text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ Market Snapshot Dashboard ══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <StatCard
            icon={<ShieldCheck size={20} />}
            label="ບັນທຶກທີ່ດິນທີ່ຢືນຢັນ"
            value={stats ? Number(stats.verified_records).toLocaleString() : null}
            sub="Single Source of Truth"
          />
          <StatCard
            icon={<Building2 size={20} />}
            label="Mandate ຫ້ອງການ Active"
            value={stats ? Number(stats.active_mandates).toLocaleString() : null}
            sub="ນາຍໜ້າທີ່ຢືນຢັນ"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="ລາຄາສະເລ່ຍ ວຽງຈັນ"
            value={stats?.avg_price_vientiane ? format(Number(stats.avg_price_vientiane)) : 'N/A'}
            sub="Vientiane Capital"
          />
          <StatCard
            icon={<Star size={20} />}
            label="Exclusive Listings ✓"
            value={stats ? Number(stats.exclusive_listings).toLocaleString() : null}
            sub="Green Badge · ຜ່ານຢືນຢັນ"
          />
        </div>

        {/* ══ Search bar ══ */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-56 flex items-center gap-2 bg-white border rounded-xl px-3 py-2.5 shadow-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              className="flex-1 outline-none text-sm bg-transparent"
              placeholder="ຊອກຫາ ແຂວງ, ເມືອງ, ບ້ານ..."
              value={query_}
              onChange={(e) => setQuery_(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
            {query_ && (
              <button onClick={() => { setQuery_(''); }} className="text-gray-300 hover:text-gray-500">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 border rounded-xl px-3 py-2.5 text-sm font-medium shadow-sm transition-colors ${
              showFilters || landType || pricePreset > 0 || greenBadgeOnly
                ? 'bg-brand text-white border-brand' : 'bg-white hover:border-gray-400'
            }`}>
            <SlidersHorizontal size={15} /> ກັ່ນຕອງ
            {(landType || pricePreset > 0 || greenBadgeOnly) && (
              <span className="ml-1 bg-white/30 text-white text-xs px-1.5 py-0.5 rounded-full">
                {[landType, pricePreset > 0, greenBadgeOnly].filter(Boolean).length}
              </span>
            )}
          </button>

          <button onClick={load}
            className="bg-brand text-white rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-brand/90 transition-colors">
            ຄົ້ນຫາ
          </button>

          {/* View toggle */}
          <div className="flex border rounded-xl overflow-hidden shadow-sm bg-white">
            <button onClick={() => { setViewMode('grid'); setFullscreen(false); }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <LayoutGrid size={14} /> ກຣິດ
            </button>
            <button onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'map' ? 'bg-brand text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <Map size={14} /> ແຜນທີ່
            </button>
          </div>
        </div>

        {/* ══ Filter panel ══ */}
        {showFilters && (
          <div className="bg-white border rounded-2xl p-4 mt-3 shadow-sm space-y-4">
            {/* Land type */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ປະເພດທີ່ດິນ</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setLandType('')}
                  className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors ${!landType ? 'bg-brand text-white border-brand' : 'hover:border-brand hover:text-brand'}`}>
                  ທັງໝົດ
                </button>
                {LAND_TYPES.map((lt) => (
                  <button key={lt.v} onClick={() => setLandType(lt.v === landType ? '' : lt.v)}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors ${landType === lt.v ? 'bg-brand text-white border-brand' : 'hover:border-brand hover:text-brand'}`}>
                    {lt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Price range */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ລາຄາ (LAK)</p>
              <div className="flex flex-wrap gap-2">
                {PRICE_PRESETS.map((p, i) => (
                  <button key={i} onClick={() => setPricePreset(i)}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors ${pricePreset === i ? 'bg-brand text-white border-brand' : 'hover:border-brand hover:text-brand'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Title / Badge */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ຄຸນນະພາບ Listing</p>
              <button onClick={() => setGreenBadgeOnly(!greenBadgeOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm border font-medium transition-colors ${greenBadgeOnly ? 'bg-brand text-white border-brand' : 'hover:border-brand hover:text-brand'}`}>
                <Star size={14} fill={greenBadgeOnly ? 'white' : 'none'} />
                ✓ Green Badge Only (Exclusive · ຢືນຢັນ)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          {items.length} ລາຍການ{query_ && ` · "${query_}"`}
          {landType && ` · ${LAND_TYPES.find((l) => l.v === landType)?.l}`}
          {greenBadgeOnly && ' · Green Badge'}
        </p>
      )}

      {/* ══════════════════════════════════════════════
          MAP VIEW
          ══════════════════════════════════════════════ */}
      {viewMode === 'map' && (
        <div className={`relative mb-6 ${fullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
          {loading ? (
            <div className="bg-gray-100 rounded-2xl animate-pulse" style={{ height: fullscreen ? '100vh' : '560px' }} />
          ) : (
            <MapView
              pins={mapPins}
              height={fullscreen ? '100vh' : '560px'}
              zoom={12}
              cluster={true}
            />
          )}

          {/* Fullscreen toggle */}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="absolute top-3 right-3 bg-white border rounded-xl p-2 shadow-md hover:bg-gray-50 z-10"
            title={fullscreen ? 'ອອກຈາກ Fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* Results counter on map */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur border rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm z-10">
            {mapPins.length} ທີ່ດິນ
          </div>

          {/* Selected property card — Buffer Layer compliant */}
          {selected && (
            <div className={`absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-2xl border p-5 ${fullscreen ? 'max-w-sm' : 'max-w-xs'}`}>
              {/* Top badges */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">
                  {LAND_TYPES.find((l) => l.v === selected.land_type)?.l ?? selected.land_type}
                </span>
                {selected.green_badge && (
                  <span className="flex items-center gap-1 text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                    <Star size={10} fill="white" /> Verified
                  </span>
                )}
              </div>

              {/* Location + price */}
              <p className="font-bold text-gray-900 text-lg leading-tight">{selected.district}</p>
              <p className="text-gray-500 text-sm">{selected.province}</p>
              {selected.area_sqm && (
                <p className="text-xs text-gray-400 mt-0.5">{Number(selected.area_sqm).toLocaleString()} m²</p>
              )}
              <p className="text-brand font-extrabold text-xl mt-2">{format(selected.owner_set_price)}</p>
              {selected.price_locked && (
                <p className="text-xs text-green-600 mt-0.5">🔒 ລາຄາຄົງທີ່ · One Price</p>
              )}

              {/* ★ BUFFER LAYER: no owner contact, route to mandate broker */}
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2 mb-3">
                <ShieldCheck size={14} className="text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-green-700">ຕິດຕໍ່ຜ່ານ<strong>ນາຍໜ້າ</strong>ທີ່ຖື Mandate — ເຈົ້າຂອງຈະ<strong>ບໍ່ສະແດງ</strong>ໂດຍກົງ</p>
              </div>

              <div className="flex gap-2">
                <Link href={`/${locale}/properties/${selected.id}`}
                  className="flex-1 text-center bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-brand/90 transition-colors">
                  ເບິ່ງລາຍລະອຽດ
                </Link>
                <button onClick={() => setSelectedId(null)}
                  className="px-3 py-2.5 border rounded-xl text-xs text-gray-400 hover:bg-gray-50">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          GRID VIEW
          ══════════════════════════════════════════════ */}
      {viewMode === 'grid' && (
        <>
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-44 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="text-center py-24 text-gray-400">
              <div className="text-6xl mb-4">🏯</div>
              <p className="font-semibold text-lg">ບໍ່ພົບຜົນການຊອກຫາ</p>
              <p className="text-sm mt-1">ລອງປ່ຽນຕົວກັ່ນຕອງ ຫຼື ຊອກຫາໃໝ່</p>
            </div>
          )}

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
              {items.map((p) => (
                <Link key={p.id} href={`/${locale}/properties/${p.id}`}
                  className="bg-white border rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-brand transition-all block group">
                  {/* Badges */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-lg font-medium">
                      {LAND_TYPES.find((l) => l.v === p.land_type)?.l ?? p.land_type}
                    </span>
                    {p.green_badge && (
                      <span className="flex items-center gap-1 text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                        <Star size={10} fill="white" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Location */}
                  <p className="font-bold text-gray-900 group-hover:text-brand transition-colors text-lg leading-tight">
                    {p.district}
                  </p>
                  <p className="text-sm text-gray-500">{p.province}</p>
                  {p.area_sqm && (
                    <p className="text-xs text-gray-400 mt-0.5">{Number(p.area_sqm).toLocaleString()} m²</p>
                  )}

                  {/* Price */}
                  <div className="mt-4 pt-3 border-t flex items-end justify-between">
                    <div>
                      <p className="text-brand font-extrabold text-xl">{format(p.owner_set_price)}</p>
                      {p.price_locked && (
                        <p className="text-xs text-green-600 mt-0.5">🔒 One Price · Locked</p>
                      )}
                    </div>
                    {p.owner_verified && (
                      <ShieldCheck size={16} className="text-green-500 shrink-0" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          CTA SECTION
          ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 mb-8">
        {/* Buyer CTA */}
        <div className="bg-gradient-to-br from-brand/5 to-brand/10 border border-brand/20 rounded-2xl p-6">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center mb-4">
            <Search size={20} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">ຜູ້ຊື້ / ນັກລົງທຶນ</h3>
          <p className="text-gray-600 text-sm mb-4">
            ຄົ້ນຫາທີ່ດິນດ້ວຍ<strong>ລາຄາຕົວຈິງ</strong>ຈາກເຈົ້າຂອງ — ໄຮ້ການ markup ຈາກນາຍໜ້າ. ທຸກ listing ໄດ້ຮັບການ<strong>ຢືນຢັນ GPS</strong>.
          </p>
          <Link href={`/${locale}`} onClick={() => { setViewMode('map'); setSelectedId(null); }}
            className="inline-flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand/90 transition-colors">
            ເບິ່ງແຜນທີ່ <ArrowRight size={15} />
          </Link>
        </div>

        {/* Owner CTA */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center mb-4">
            <Home size={20} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-1">ເຈົ້າຂອງທີ່ດິນ</h3>
          <p className="text-gray-600 text-sm mb-4">
            ລົງທະບຽນທີ່ດິນຂອງທ່ານ ແລ <strong>ອະນຸມັດ Mandate ທຳອິດ</strong>ຜ່ານ<strong>WhatsApp OTP</strong>. ທ່ານຄຸ້ມ Gate ທຸກຄົນທີ່ຈະຂາຍທີ່ດິນ.
          </p>
          <Link href={`/${locale}/login`}
            className="inline-flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-600 transition-colors">
            ລົງທະບຽນເລີ່ມຕົ້ນ <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Professional access strip */}
      <div className="border-t pt-5 pb-2 flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-gray-400">
          ທ່ານເປັນ<strong>ນາຍໜ້າມືອາຊີບ</strong>? ເຂົ້າ Workshop CRM ສຳລັບ Pipeline, Co-broke, ແລ Commission Protection.
        </p>
        <Link href={user?.role === 'broker' ? `/${locale}/workshop` : `/${locale}/login`}
          className="inline-flex items-center gap-2 border border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold hover:border-brand hover:text-brand transition-colors">
          <Briefcase size={14} /> ເຂົ້າ Broker Workshop →
        </Link>
      </div>
    </div>
  );
}
