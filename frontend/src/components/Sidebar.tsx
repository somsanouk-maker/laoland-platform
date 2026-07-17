'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  Search, Briefcase, Globe, LayoutDashboard, PlusSquare,
  KanbanSquare, FileText, Users, Home, CheckSquare,
  TrendingUp, UserCircle, Heart, LogOut, Menu, X, ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LocaleSwitcher from './LocaleSwitcher';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);

  const p = (path: string) => `/${locale}${path}`;
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Public links (always visible)
  const publicLinks: NavItem[] = [
    { href: p('/'), label: t('showroom'), icon: <Search size={18} /> },
    { href: p('/wizard'), label: t('wizard'), icon: <Globe size={18} /> },
  ];

  // Role-based links
  const brokerLinks: NavItem[] = [
    { href: p('/workshop'), label: t('dashboard'), icon: <LayoutDashboard size={18} /> },
    { href: p('/workshop/pipeline'), label: t('pipeline'), icon: <KanbanSquare size={18} /> },
    { href: p('/workshop/mandates'), label: t('myMandates'), icon: <FileText size={18} /> },
    { href: p('/workshop/cobroke'), label: t('cobroke'), icon: <Users size={18} /> },
  ];

  const ownerLinks: NavItem[] = [
    { href: p('/owner'), label: t('myProperties'), icon: <Home size={18} /> },
    { href: p('/owner/approvals'), label: t('approvals'), icon: <CheckSquare size={18} /> },
    { href: p('/owner/market'), label: t('marketTrends'), icon: <TrendingUp size={18} /> },
  ];

  const buyerLinks: NavItem[] = [
    { href: p('/buyer'), label: t('myProfile'), icon: <UserCircle size={18} /> },
    { href: p('/buyer/saved'), label: t('savedProperties'), icon: <Heart size={18} /> },
  ];

  const adminLinks: NavItem[] = [
    { href: p('/admin/users'), label: 'ຜູ້ໃຊ້ງານ', icon: <Users size={18} /> },
    { href: p('/admin/properties'), label: 'ທີ່ດິນ', icon: <Home size={18} /> },
    { href: p('/admin/mandates'), label: 'Mandates', icon: <FileText size={18} /> },
    { href: p('/admin/audit-log'), label: 'Audit Log', icon: <ShieldCheck size={18} /> },
  ];

  const roleLinks =
    user?.role === 'broker' ? brokerLinks :
    user?.role === 'owner'  ? ownerLinks  :
    user?.role === 'buyer'  ? buyerLinks  :
    user?.role === 'admin'  ? adminLinks  : [];

  const roleLabelMap: Record<string, string> = {
    broker: t('roleBroker'),
    owner:  t('roleOwner'),
    buyer:  t('roleBuyer'),
    admin:  'Admin',
  };

  const NavLink = ({ item }: { item: NavItem }) => (
    <Link
      href={item.href}
      onClick={() => setOpen(false)}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        active(item.href)
          ? 'bg-brand text-white font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b">
        <Link href={p('/')} className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <span className="text-2xl">🏯</span>
          <div>
            <div className="font-bold text-brand text-lg leading-tight">LaoLand</div>
            <div className="text-xs text-gray-400">ອະສັງຫາລິມະສັບລາວ</div>
          </div>
        </Link>
      </div>

      {/* User card */}
      {user ? (
        <div className="mx-3 mt-3 mb-1 bg-brand/5 border border-brand/20 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">{user.name}</div>
              <div className="text-xs text-brand font-medium">{roleLabelMap[user.role!]}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-3 mt-3 mb-1 space-y-2">
          <Link
            href={p('/login')}
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-2 w-full bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90"
          >
            {t('login')} / ລົງທະບຽນ
          </Link>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {/* Public */}
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">
          {t('sectionPublic')}
        </div>
        {publicLinks.map((item) => <NavLink key={item.href + item.label} item={item} />)}

        {/* Role-specific */}
        {roleLinks.length > 0 && (
          <>
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 pt-4 pb-1">
              {user?.role === 'broker' ? t('sectionWorkshop') :
               user?.role === 'owner'  ? t('sectionOwner')    :
               user?.role === 'admin'  ? 'Admin Portal'       : t('sectionBuyer')}
            </div>
            {roleLinks.map((item) => <NavLink key={item.href + item.label} item={item} />)}
          </>
        )}
      </nav>

      {/* Bottom: locale + logout */}
      <div className="border-t px-3 py-3 space-y-2">
        <LocaleSwitcher />
        {user && (
          <button
            onClick={() => { logout(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 w-10 h-10 bg-white border rounded-lg flex items-center justify-center shadow-sm"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-100">
          <X size={20} />
        </button>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-60 bg-white border-r z-30">
        <SidebarContent />
      </aside>
    </>
  );
}
