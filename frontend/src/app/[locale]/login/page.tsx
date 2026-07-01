'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MessageCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

type Step = 'phone' | 'otp' | 'done';

export default function LoginPage() {
  const t = useTranslations('login');
  const locale = useLocale();
  const router = useRouter();
  const { requestLoginOtp, verifyLoginOtp } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Full E.164: +856 + user input
  function fullPhone() {
    const digits = phone.replace(/\D/g, '');
    return `+856${digits}`;
  }

  async function sendOtp() {
    if (!phone.trim()) { setError(t('errorPhone')); return; }
    setSending(true);
    setError('');
    try {
      await requestLoginOtp(fullPhone());
      setStep('otp');
    } catch (e: any) {
      setError(e.message ?? t('errorPhone'));
    } finally {
      setSending(false);
    }
  }

  async function verifyOtpCode() {
    if (otp.length < 6) return;
    setVerifying(true);
    setError('');
    try {
      const user = await verifyLoginOtp(fullPhone(), otp);
      setStep('done');
      setTimeout(() => {
        const dest =
          user.role === 'broker' ? `/${locale}/workshop` :
          user.role === 'owner'  ? `/${locale}/owner` :
          user.role === 'admin'  ? `/${locale}/admin` :
                                   `/${locale}/buyer`;
        router.push(dest);
      }, 800);
    } catch (e: any) {
      setError(e.message ?? t('errorOtp'));
    } finally {
      setVerifying(false);
    }
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

          {/* Step 1: Phone */}
          {step === 'phone' && (
            <div>
              <h2 className="text-lg font-bold mb-1">{t('enterPhone')}</h2>
              <p className="text-sm text-gray-500 mb-5">{t('enterPhoneHint')}</p>
              <div className="space-y-3">
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
                      autoComplete="tel"
                    />
                  </div>
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  onClick={sendOtp}
                  disabled={sending || !phone.trim()}
                  className="w-full bg-brand text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <MessageCircle size={18} />
                  {sending ? '...' : t('sendOtp')}
                </button>
                <p className="text-xs text-center text-gray-400">{t('whatsappHint')}</p>
              </div>
            </div>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div>
              <button onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-sm text-gray-400 hover:text-brand mb-4 block">
                ← {t('back')}
              </button>
              <h2 className="text-lg font-bold mb-1">{t('enterOtp')}</h2>
              <p className="text-sm text-gray-500 mb-5">
                {t('otpSentTo')} <strong>+856 {phone}</strong>
              </p>
              <input
                className="border-2 rounded-xl px-4 py-4 w-full text-center text-2xl font-mono tracking-widest focus:border-brand outline-none"
                placeholder="——————"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                inputMode="numeric"
              />
              {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
              <button
                onClick={verifyOtpCode}
                disabled={otp.length < 6 || verifying}
                className="w-full bg-brand text-white rounded-xl py-3 font-bold mt-4 disabled:opacity-60"
              >
                {verifying ? '...' : t('verify')}
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
