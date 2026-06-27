'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Briefcase, Home, UserCircle, MessageCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth, UserRole } from '../../../contexts/AuthContext';

type Step = 'role' | 'phone' | 'otp' | 'done';

const ROLES: { key: UserRole; icon: React.ReactNode; color: string }[] = [
  { key: 'broker', icon: <Briefcase size={28} />, color: 'border-brand bg-brand/5 text-brand' },
  { key: 'owner', icon: <Home size={28} />, color: 'border-amber-500 bg-amber-50 text-amber-600' },
  { key: 'buyer', icon: <UserCircle size={28} />, color: 'border-blue-500 bg-blue-50 text-blue-600' },
];

// Mock OTP for demo — real implementation calls backend /api/owners/otp
const DEMO_OTP = '123456';

export default function LoginPage() {
  const t = useTranslations('login');
  const locale = useLocale();
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<UserRole>(null);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  function pickRole(r: UserRole) {
    setRole(r);
    setStep('phone');
  }

  async function sendOtp() {
    if (!phone.trim()) { setError(t('errorPhone')); return; }
    setSending(true);
    setError('');
    // MVP: simulate sending — in prod call POST /api/owners/otp
    await new Promise((r) => setTimeout(r, 800));
    setSending(false);
    setStep('otp');
  }

  function verifyOtp() {
    setError('');
    if (otp !== DEMO_OTP) { setError(t('errorOtp')); return; }
    login(phone, role, name || `User ${phone.slice(-4)}`);
    setStep('done');
    setTimeout(() => {
      const dest = role === 'broker' ? `/${locale}/workshop` :
                   role === 'owner'  ? `/${locale}/owner` :
                                       `/${locale}/buyer`;
      router.push(dest);
    }, 1000);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏯</div>
          <h1 className="text-2xl font-bold">LaoLand</h1>
          <p className="text-gray-500 text-sm mt-1">{t('subtitle')}</p>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">

          {/* Step 1: Choose role */}
          {step === 'role' && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t('chooseRole')}</h2>
              <p className="text-sm text-gray-500 mb-5">{t('chooseRoleHint')}</p>
              <div className="space-y-3">
                {ROLES.map(({ key, icon, color }) => (
                  <button
                    key={key}
                    onClick={() => pickRole(key)}
                    className={`w-full flex items-center gap-4 border-2 rounded-xl p-4 text-left hover:shadow-sm transition-all ${color}`}
                  >
                    <div className="shrink-0">{icon}</div>
                    <div>
                      <div className="font-bold text-base">{t(`role_${key}`)}</div>
                      <div className="text-sm opacity-70">{t(`role_${key}_desc`)}</div>
                    </div>
                    <ArrowRight size={16} className="ml-auto opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Phone + Name */}
          {step === 'phone' && (
            <div>
              <button onClick={() => setStep('role')} className="text-sm text-gray-400 hover:text-brand mb-4 block">← {t('back')}</button>
              <h2 className="text-lg font-bold mb-1">{t('enterPhone')}</h2>
              <p className="text-sm text-gray-500 mb-5">{t('enterPhoneHint')}</p>
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  {t('name')}
                  <input
                    className="border rounded-xl px-4 py-3 w-full mt-1 text-base"
                    placeholder={t('namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium">
                  {t('phone')}
                  <div className="flex gap-2 mt-1">
                    <span className="border rounded-xl px-3 py-3 bg-gray-50 text-sm font-mono">+856</span>
                    <input
                      className="border rounded-xl px-4 py-3 flex-1 text-base font-mono"
                      placeholder="20 xxxxxxxx"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={sendOtp}
                  disabled={sending}
                  className="w-full bg-brand text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <MessageCircle size={18} />
                  {sending ? '...' : t('sendOtp')}
                </button>
                <p className="text-xs text-center text-gray-400">{t('whatsappHint')}</p>
              </div>
            </div>
          )}

          {/* Step 3: OTP */}
          {step === 'otp' && (
            <div>
              <button onClick={() => setStep('phone')} className="text-sm text-gray-400 hover:text-brand mb-4 block">← {t('back')}</button>
              <h2 className="text-lg font-bold mb-1">{t('enterOtp')}</h2>
              <p className="text-sm text-gray-500 mb-5">
                {t('otpSentTo')} <strong>+856 {phone}</strong>
                <br /><span className="text-xs text-gray-400">(Demo OTP: <strong>123456</strong>)</span>
              </p>
              <input
                className="border-2 rounded-xl px-4 py-4 w-full text-center text-2xl font-mono tracking-widest focus:border-brand outline-none"
                placeholder="——————"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
              <button
                onClick={verifyOtp}
                disabled={otp.length < 6}
                className="w-full bg-brand text-white rounded-xl py-3 font-bold mt-4 disabled:opacity-60"
              >
                {t('verify')}
              </button>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-brand mx-auto mb-3" />
              <h2 className="text-lg font-bold">{t('welcome')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('redirecting')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
