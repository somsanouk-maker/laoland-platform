'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Users, Building2, FileText, ClipboardList, ShieldCheck } from 'lucide-react';
import RequireRole from '../../../components/RequireRole';

const navItems = [
  { href: 'users', label: 'ຜູ້ໃຊ້ງານ', icon: Users },
  { href: 'properties', label: 'ທີ່ດິນ', icon: Building2 },
  { href: 'mandates', label: 'Mandates', icon: FileText },
  { href: 'audit-log', label: 'Audit Log', icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <RequireRole role="admin">
      <div className="flex gap-0 min-h-screen">
        {/* Admin sidebar */}
        <aside className="w-48 shrink-0 border-r border-gray-200 bg-white pt-2 pb-10">
          <div className="flex items-center gap-2 px-4 py-3 mb-2 border-b border-gray-100">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Admin</span>
          </div>
          <nav className="flex flex-col gap-0.5 px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const full = `/${locale}/admin/${href}`;
              const active = pathname.includes(`/admin/${href}`);
              return (
                <Link
                  key={href}
                  href={full}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    active ? 'bg-red-50 text-red-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 p-6">{children}</div>
      </div>
    </RequireRole>
  );
}
