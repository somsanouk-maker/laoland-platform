'use client';
import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Search, Heart, MapPin, Calendar, ShieldCheck, RefreshCw, CheckCircle2,
  User, Phone, Home, TrendingUp, Clock, Star, AlertTriangle, Settings,
} from 'lucide-react';
import { api } from '../../../lib/api';
import RequireRole from '../../../components/RequireRole';
import { useAuth } from '../../../contexts/AuthContext';
import { useCurrency } from '../../../contexts/CurrencyContext';

const DEMO_BUYER = '44444444-4444-4444-4444-444444444444';

const LAND_TYPES = [
  { v: 'residential', l: 'ທີ່ດິນປຸກສ້າງ' },
  { v: 'agricultural', l: 'ທີ່ດິນກະສິກຳ' },
  { v: 'commercial', l: 'ທີ່ດິນການຄ້າ' },
  { v: 'industrial', l: 'ທີ່ດິນອຸດສາຫະກຳ' },
];

const PROVINCES = ['ນະຄອນຫຼວງວຽງຈັນ', 'ຫຼວງພະບາງ', 'ສາວັນນະເຂດ', 'ຈຳປາສັກ', 'ບຶງຄານ', 'ຄຳມ່ວນ'];

type Tab = 'overview' | 'profile' | 'viewings';

export default function BuyerPage() {
  const locale = useLocale();
  const { user } = useAuth();
  const { format } = useCurrency();
  const buyerId = user?.id ?? DEMO_BUYER;

  const [tab, setTab] = useState<Tab>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [viewings, setViewings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    provinces: [] as string[],
    landTypes: [] as string[],
    budgetMin: '',
    budgetMax: '',
    notes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [prof, views] = await Promise.all([
        api.getBuyerProfile(buyerId).catch(() => null),
        api.getBuyerViewings(buyerId).catch(() => [] as any[]),
      ]);
      setProfile(prof);
      if (prof) {
        setProfileForm({
          provinces: prof.preferred_provinces ?? [],
          landTypes: prof.preferred_land_types ?? [],
          budgetMin: prof.budget_min_lak ? String(prof.budget_min_lak) : '',
          budgetMax: prof.budget_max_lak ? String(prof.budget_max_lak) : '',
          notes: prof.notes ?? '',
        });
      }
      setViewings(views);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [buyerId]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const saved = await api.saveBuyerProfile({
        preferredProvinces: profileForm.provinces,
        preferredLandTypes: profileForm.landTypes,
        budgetMinLak: profileForm.budgetMin ? Number(profileForm.budgetMin) : undefined,
        budgetMaxLak: profileForm.budgetMax ? Number(profileForm.budgetMax) : undefined,
        notes: profileForm.notes || undefined,
      }, buyerId);
      setProfile(saved);
      alert('✓ ບັນທຶກ Profile ສຳເລັດ — ລະບົບຈະ Auto-Match ທີ່ດິນໃຫ້ທ່ານ');
    } catch (e: any) {
      alert(e.data?.error ?? e.message ?? 'ເກີດຂໍ້ຜິດພາດ');
    } finally { setSavingProfile(false); }
  }

  async function confirmViewingAttendance(viewingId: string) {
    setConfirmingId(viewingId);
    try {
      await api.confirmViewing(viewingId, buyerId);
      await load();
    } catch (e: any) {
      alert(e.data?.error ?? e.message ?? 'ເກີດຂໍ້ຜິດພາດ');
    } finally { setConfirmingId(null); }
  }

  function toggleChip(arr: string[], val: string): string[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  const confirmedViewings = viewings.filter((v) => v.buyer_confirmed);
  const pendingViewings = viewings.filter((v) => !v.buyer_confirmed);

  if (!user || user.role !== 'buyer') {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 mb-4">ສຳລັບຜູ້ຊື້ທີ່ດິນເທົ່ານັ້ນ</p>
        <Link href={`/${locale}/login`} className="bg-brand text-white px-6 py-2.5 rounded-xl font-semibold">
          ເຂົ້າລະບົບ
        </Link>
      </div>
    );
  }

  return (
    <RequireRole role="buyer">
        <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">ໜ້າຜູ້ຊື້</h1>
          <p className="text-gray-500 text-sm mt-0.5">{user.name} · {user.phone}</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border hover:bg-gray-50">
          <RefreshCw size={16} className={loading ? 'animate-spin text-brand' : ''} />
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { icon: <Calendar size={16} />, label: 'ການນັດຊົມ', val: viewings.length, color: 'text-purple-500' },
          { icon: <CheckCircle2 size={16} />, label: 'ຢືນຢັນແລ້ວ', val: confirmedViewings.length, color: 'text-green-600' },
          { icon: <Clock size={16} />, label: 'ລໍຖ້າຢືນຢັນ', val: pendingViewings.length, color: 'text-amber-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white border rounded-2xl p-3 text-center shadow-sm">
            <div className={`mx-auto w-fit mb-1 ${s.color}`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Buffer Layer info panel */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-start gap-3">
        <ShieldCheck size={20} className="text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-green-700 text-sm">Buffer Layer — ຄວາມປອດໄພຂໍ້ມູນ</p>
          <p className="text-xs text-green-600 mt-1">ລາຍລະອຽດຕິດຕໍ່ເຈົ້າຂອງ <strong>ຈະບໍ່ສະແດງ</strong> ກັບທ່ານໂດຍກົງ. ການສອບຖາມທຸກຢ່າງຕ້ອງຜ່ານ<strong>ນາຍໜ້າ</strong>ທີ່ຖື Mandate — ເພື່ອຄວາມໂປ່ງໃສ ແລ ຄວາມຍຸດຕິທຳ.</p>
          <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 mt-2 bg-brand text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-brand/90 transition-colors">
            <Search size={12} /> ຊອກຫາທີ່ດິນ
          </Link>
        </div>
      </div>

      {/* Pending confirmation alert */}
      {pendingViewings.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-700 text-sm">{pendingViewings.length} ການນັດຊົມ ລໍຖ້າການຢືນຢັນ</p>
            <p className="text-xs text-amber-600 mt-0.5">ນາຍໜ້າໄດ້ບັນທຶກ GPS Viewing ກັບທ່ານ — ກົດ "ຢືນຢັນ" ເພື່ອລັອກສິດຄ່ານາຍໜ້າ</p>
            <button onClick={() => setTab('viewings')} className="mt-2 text-xs bg-amber-600 text-white px-3 py-1 rounded-lg font-semibold">
              ຢືນຢັນ →
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { key: 'overview', label: 'ພາບລວມ', icon: <Home size={14} /> },
          { key: 'profile', label: 'Profile ຂ້ອຍ', icon: <Settings size={14} /> },
          { key: 'viewings', label: 'ປະຫວັດນັດຊົມ', icon: <MapPin size={14} />, badge: pendingViewings.length },
        ] as const).map((t_) => (
          <button key={t_.key} onClick={() => setTab(t_.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              tab === t_.key ? 'bg-brand text-white border-brand' : 'bg-white hover:border-gray-400'
            }`}>
            {t_.icon} {t_.label}
            {'badge' in t_ && t_.badge > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{t_.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== TAB: Overview ===== */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Profile summary card */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Profile ການຊອກຫາ</h3>
              <button onClick={() => setTab('profile')} className="text-xs text-brand font-semibold hover:underline">
                ແກ້ໄຂ →
              </button>
            </div>

            {profile ? (
              <div className="space-y-3">
                {profile.preferred_provinces?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">ເຂດທີ່ສົນໃຈ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.preferred_provinces.map((p: string) => (
                        <span key={p} className="text-xs bg-brand/10 text-brand px-2.5 py-1 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.preferred_land_types?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">ປະເພດທີ່ດິນ</p>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.preferred_land_types.map((t: string) => (
                        <span key={t} className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                          {LAND_TYPES.find((x) => x.v === t)?.l ?? t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(profile.budget_min_lak || profile.budget_max_lak) && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">ງົບປະມານ</p>
                    <p className="text-sm font-semibold">
                      {profile.budget_min_lak ? format(profile.budget_min_lak) : '—'} →{' '}
                      {profile.budget_max_lak ? format(profile.budget_max_lak) : '—'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ຍັງບໍ່ໄດ້ຕັ້ງ Profile</p>
                <button onClick={() => setTab('profile')} className="mt-2 text-sm text-brand font-semibold hover:underline">
                  ຕັ້ງ Profile ຕອນນີ້ →
                </button>
              </div>
            )}
          </div>

          {/* Recent viewings */}
          <div className="bg-white border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">ການນັດຊົມຫຼ້າສຸດ</h3>
              <button onClick={() => setTab('viewings')} className="text-xs text-brand font-semibold hover:underline">
                ທັງໝົດ →
              </button>
            </div>
            {viewings.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">ຍັງບໍ່ມີການນັດຊົມ</p>
              </div>
            ) : (
              <div className="space-y-2">
                {viewings.slice(0, 3).map((v) => (
                  <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <Link href={`/${locale}/properties/${v.property_id}`} className="text-sm font-semibold hover:text-brand">
                        {v.district}, {v.province}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(v.created_at).toLocaleDateString()} · {v.broker_name}</p>
                    </div>
                    {v.buyer_confirmed ? (
                      <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                        <CheckCircle2 size={10} /> ຢືນຢັນ
                      </span>
                    ) : (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">ລໍຖ້າ</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB: Profile Setup Wizard ===== */}
      {tab === 'profile' && (
        <div className="bg-white border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <User size={18} className="text-brand" />
            <h2 className="font-bold text-lg">ຕັ້ງ Profile ການຊອກຫາ</h2>
          </div>
          <p className="text-xs text-gray-400 mb-5 ml-6">ລະບົບຈະ Auto-Match ທີ່ດິນທີ່ກົງກັບຄວາມຕ້ອງການຂອງທ່ານ</p>

          <div className="space-y-5">
            {/* Province chips */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">ເຂດ/ແຂວງທີ່ສົນໃຈ</p>
              <div className="flex flex-wrap gap-2">
                {PROVINCES.map((p) => (
                  <button
                    key={p}
                    onClick={() => setProfileForm((f) => ({ ...f, provinces: toggleChip(f.provinces, p) }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors ${
                      profileForm.provinces.includes(p)
                        ? 'bg-brand text-white border-brand'
                        : 'bg-white hover:border-brand hover:text-brand'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Land type chips */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">ປະເພດທີ່ດິນ</p>
              <div className="flex flex-wrap gap-2">
                {LAND_TYPES.map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setProfileForm((f) => ({ ...f, landTypes: toggleChip(f.landTypes, t.v) }))}
                    className={`px-3 py-1.5 rounded-xl text-sm border font-medium transition-colors ${
                      profileForm.landTypes.includes(t.v)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white hover:border-purple-400 hover:text-purple-700'
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Budget range */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">ງົບປະມານ (ໃນ LAK ₭)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ຕ່ຳສຸດ</label>
                  <input
                    type="number"
                    className="border rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                    placeholder="500,000,000"
                    value={profileForm.budgetMin}
                    onChange={(e) => setProfileForm((f) => ({ ...f, budgetMin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ສູງສຸດ</label>
                  <input
                    type="number"
                    className="border rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
                    placeholder="2,000,000,000"
                    value={profileForm.budgetMax}
                    onChange={(e) => setProfileForm((f) => ({ ...f, budgetMax: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">ຄວາມຕ້ອງການເພີ່ມເຕີມ</p>
              <textarea
                rows={3}
                className="border rounded-xl px-3 py-2.5 w-full focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none resize-none"
                placeholder="ຕ້ອງການທາງຊ້ວຍ, ໃກ້ໂຮງຮຽນ, ມີທ່ອນ..."
                value={profileForm.notes}
                onChange={(e) => setProfileForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={savingProfile}
              className="w-full bg-brand text-white rounded-xl py-3 font-bold hover:bg-brand/90 disabled:opacity-60 transition-colors"
            >
              {savingProfile ? '...' : '✓ ບັນທຶກ Profile'}
            </button>
          </div>
        </div>
      )}

      {/* ===== TAB: Viewing History ===== */}
      {tab === 'viewings' && (
        <div className="space-y-4">
          {/* Info */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-700 flex items-start gap-2">
            <MapPin size={16} className="shrink-0 mt-0.5" />
            <span>ທຸກການນັດຊົມໄດ້ຖືກ <strong>ບັນທຶກ GPS</strong> ໂດຍນາຍໜ້າ. ການຢືນຢັນຂອງທ່ານ → <strong>ລັອກສິດຄ່ານາຍໜ້າ 90 ມື້</strong>.</span>
          </div>

          {loading && [1, 2].map((i) => <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />)}

          {!loading && viewings.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">ຍັງບໍ່ມີການນັດຊົມ</p>
              <p className="text-sm mt-1">ເມື່ອນາຍໜ້າ Log GPS Viewing ກັບທ່ານ ຈະສະແດງຢູ່ນີ້</p>
            </div>
          )}

          {viewings.map((v) => (
            <div key={v.id} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link href={`/${locale}/properties/${v.property_id}`}
                    className="font-bold text-gray-900 hover:text-brand text-lg">
                    {v.district}, {v.province}
                  </Link>
                  <p className="text-xs text-gray-400 mt-0.5">{v.land_type}</p>
                </div>
                {v.buyer_confirmed ? (
                  <span className="flex items-center gap-1.5 text-xs bg-green-100 text-green-700 px-2.5 py-1.5 rounded-full font-semibold">
                    <CheckCircle2 size={12} /> ຢືນຢັນແລ້ວ
                  </span>
                ) : (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-semibold">ລໍຖ້າ</span>
                )}
              </div>

              {/* Broker info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <div className="w-7 h-7 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <User size={13} />
                </div>
                <span className="font-medium">{v.broker_name}</span>
                <span className="text-gray-400">·</span>
                <span className="font-mono text-xs text-gray-400">{v.broker_phone}</span>
              </div>

              {/* GPS + date info */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                <div className="flex items-center gap-1">
                  <MapPin size={11} className="text-purple-500" />
                  GPS: {Number(v.lat).toFixed(5)}, {Number(v.lng).toFixed(5)}
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(v.created_at).toLocaleDateString('lo')}
                </div>
              </div>

              {/* Lock expiry */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-gray-400">
                  <Star size={11} className="inline mr-1 text-amber-400" />
                  ສິດລັອກນາຍໜ້າ: ຈົນ {new Date(v.lock_expires_at).toLocaleDateString('lo')}
                </div>
              </div>

              {/* Confirm button */}
              {!v.buyer_confirmed && (
                <button
                  onClick={() => confirmViewingAttendance(v.id)}
                  disabled={confirmingId === v.id}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  <CheckCircle2 size={16} />
                  {confirmingId === v.id ? '...' : 'ຢືນຢັນ — ຂ້ອຍໄດ້ໄປຊົມທີ່ດິນນີ້ຈິງ'}
                </button>
              )}
              {v.buyer_confirmed && v.buyer_confirmed_at && (
                <p className="text-xs text-center text-green-600">
                  ✓ ຢືນຢັນ {new Date(v.buyer_confirmed_at).toLocaleDateString('lo')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </RequireRole>
  );
}