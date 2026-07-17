'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '../../../lib/api';

// ============================================================
// Foreign Buyer Land Wizard UI — chat-style stepper
// ຫຼັກ Progressive Disclosure: ຖາມເທື່ອລະຄຳ, ສະແດງສະເພາະທີ່ກ່ຽວຂ້ອງ
// ສົ່ງ lang ປັດຈຸບັນໄປ backend → ໄດ້ຄຳແນະນຳ 3 ພາສາ
// ============================================================
type Step = 'nationality' | 'intent' | 'entity' | 'years' | 'result';

export default function WizardPage() {
  const t = useTranslations('wizard');
  const lang = useLocale();
  const [step, setStep] = useState<Step>('nationality');
  const [answers, setAnswers] = useState<any>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  function pickNationality(v: 'lao' | 'foreign') {
    const a = { ...answers, buyerNationality: v };
    setAnswers(a);
    if (v === 'lao') return submit(a); // ລາວ → ຂ້າມໄປຜົນເລີຍ
    setStep('intent');
  }
  function pickIntent(v: string) {
    const a = { ...answers, intent: v };
    setAnswers(a);
    if (v === 'lease_land') setStep('entity');
    else submit(a); // ຊື້ທີ່ດິນ / condo → ຜົນເລີຍ
  }
  function pickEntity(v: boolean) {
    setAnswers({ ...answers, hasLaoRegisteredEntity: v });
    setStep('years');
  }
  async function submit(a: any) {
    setError(null);
    try {
      const payload = { ...a, lang };
      if (a.intent === 'lease_land' && a.leaseYears == null) payload.leaseYears = Number(answers.leaseYears) || 30;
      setResult(await api.foreignWizard(payload));
      setStep('result');
    } catch {
      setError('ເກີດຂໍ້ຜິດພາດ — ກະລຸນາລອງໃໝ່');
    }
  }
  function reset() { setStep('nationality'); setAnswers({}); setResult(null); setError(null); }

  const Btn = ({ onClick, children }: any) => (
    <button onClick={onClick} className="border rounded-xl px-4 py-3 hover:border-brand hover:bg-brand/5 text-left transition-colors">
      {children}
    </button>
  );

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-gray-500 mb-6">{t('subtitle')}</p>

      <div className="bg-white border rounded-xl p-5 space-y-4">
        {step === 'nationality' && (
          <>
            <p className="font-semibold">{t('q_nationality')}</p>
            <div className="grid gap-2">
              <Btn onClick={() => pickNationality('lao')}>{t('lao')}</Btn>
              <Btn onClick={() => pickNationality('foreign')}>{t('foreign')}</Btn>
            </div>
          </>
        )}

        {step === 'intent' && (
          <>
            <p className="font-semibold">{t('q_intent')}</p>
            <div className="grid gap-2">
              <Btn onClick={() => pickIntent('buy_land')}>{t('buy_land')}</Btn>
              <Btn onClick={() => pickIntent('lease_land')}>{t('lease_land')}</Btn>
              <Btn onClick={() => pickIntent('buy_condo')}>{t('buy_condo')}</Btn>
            </div>
          </>
        )}

        {step === 'entity' && (
          <>
            <p className="font-semibold">{t('q_entity')}</p>
            <div className="grid grid-cols-2 gap-2">
              <Btn onClick={() => pickEntity(true)}>{t('yes')}</Btn>
              <Btn onClick={() => pickEntity(false)}>{t('no')}</Btn>
            </div>
          </>
        )}

        {step === 'years' && (
          <>
            <p className="font-semibold">{t('q_years')}</p>
            <input type="number" className="border rounded px-3 py-2 w-full"
              value={answers.leaseYears ?? ''} placeholder="30"
              onChange={(e) => setAnswers({ ...answers, leaseYears: e.target.value })} />
            <button onClick={() => submit({ ...answers, leaseYears: Number(answers.leaseYears) || 30 })}
              className="bg-brand text-white px-4 py-2 rounded w-full">{t('check')}</button>
          </>
        )}

        {error && (
          <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
        )}

        {step === 'result' && result && (
          <div className="space-y-3">
            <div className={`text-lg font-bold ${result.eligible ? 'text-brand' : 'text-amber-600'}`}>
              {result.eligible ? `✓ ${t('eligible')}` : `⚠️ ${t('notEligible')}`}
            </div>
            <div className="text-sm">
              <span className="text-gray-500">{t('structure')}: </span>
              <code className="bg-gray-100 px-1.5 py-0.5 rounded">{result.recommendedStructure}</code>
            </div>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {result.notes?.map((n: string, i: number) => <li key={i}>{n}</li>)}
            </ul>
            {result.fallback && (
              <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2">
                {t('fallback')}: <strong>{result.fallback}</strong>
              </div>
            )}
            <button onClick={reset} className="text-sm text-gray-500 underline">{t('restart')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
