'use client';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

// ສະຫຼັບພາສາ ລາວ/ອັງກິດ/ຈີນ (ປ່ຽນ prefix ໃນ URL)
const LOCALES = [
  { code: 'lo', label: 'ລາວ' },
  { code: 'en', label: 'EN' },
  { code: 'zh', label: '中文' },
];

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(code: string) {
    // ປ່ຽນ segment ທຳອິດ (/lo/... → /en/...)
    const segments = pathname.split('/');
    segments[1] = code;
    router.push(segments.join('/') || '/');
  }

  return (
    <div className="flex gap-1 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l.code}
          onClick={() => switchTo(l.code)}
          className={`px-2 py-1 rounded ${locale === l.code ? 'bg-brand text-white' : 'bg-white border'}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
