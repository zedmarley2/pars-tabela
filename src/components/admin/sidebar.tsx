'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  Tags,
  FileText,
  FileEdit,
  MessageSquare,
  Users,
  ImageIcon,
  Settings,
  RefreshCw,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Teklifler', href: '/admin/teklifler', icon: FileText },
  { label: 'Sayfa Yönetimi', href: '/admin/sayfalar', icon: FileEdit },
  { label: 'Ürünler', href: '/admin/urunler', icon: Package },
  { label: 'Kategoriler', href: '/admin/kategoriler', icon: Tags },
  { label: 'Siparişler', href: '/admin/siparisler', icon: MessageSquare },
  { label: 'Müşteriler', href: '/admin/musteriler', icon: Users },
  { label: 'Medya', href: '/admin/medya', icon: ImageIcon },
  { label: 'Ayarlar', href: '/admin/ayarlar', icon: Settings },
  { label: 'Güncelleme', href: '/admin/guncelleme', icon: RefreshCw },
];

export function AdminSidebar({
  userName,
  userEmail,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0f172a]">
      {/* Logo section */}
      <div className={`border-b border-white/10 px-4 py-5 ${collapsed ? 'px-2 text-center' : ''}`}>
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          {/* Hexagonal P icon */}
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
            <svg viewBox="0 0 40 40" className="h-10 w-10">
              <polygon
                points="20,2 36,11 36,29 20,38 4,29 4,11"
                fill="#1a365d"
                stroke="#d4a843"
                strokeWidth="1.5"
              />
              <text
                x="20"
                y="25"
                textAnchor="middle"
                fill="#d4a843"
                fontSize="18"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                P
              </text>
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-white">Pars Tabela</h1>
              <p className="text-xs font-medium text-[#d4a843]">Yönetim Paneli</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? 'bg-[#1a365d] text-white'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-[#d4a843]" />
              )}
              <Icon
                className={`h-5 w-5 flex-shrink-0 ${
                  active ? 'text-[#d4a843]' : 'text-gray-400 group-hover:text-gray-300'
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="my-3 border-t border-white/10" />

        {/* External link: Siteyi Gör */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Siteyi Gör' : undefined}
        >
          <ExternalLink className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-300" />
          {!collapsed && (
            <span className="flex items-center gap-2">
              Siteyi Gör
              <ExternalLink className="h-3 w-3 text-gray-500" />
            </span>
          )}
        </a>
      </nav>

      {/* Collapse toggle - desktop only */}
      <div className="hidden border-t border-white/10 px-3 py-2 lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* User area */}
      <div className="border-t border-white/10 px-3 py-4">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1a365d] text-sm font-bold text-[#d4a843]">
            {userName.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-gray-500">{userEmail}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className={`mt-3 flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-gray-400 transition-colors hover:border-red-500/30 hover:text-red-400 ${collapsed ? 'justify-center' : 'justify-center'}`}
          title={collapsed ? 'Çıkış Yap' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden flex-shrink-0 transition-all duration-300 lg:block ${collapsed ? 'w-16' : 'w-64'}`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={onCloseMobile}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 h-full w-64 lg:hidden"
            >
              {/* Mobile close button */}
              <button
                type="button"
                onClick={onCloseMobile}
                className="absolute right-3 top-5 z-10 rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="Menüyü kapat"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
