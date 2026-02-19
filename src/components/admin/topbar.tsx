'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/components/pars-tabela/theme-provider';
import {
  Menu,
  Sun,
  Moon,
  Bell,
  ChevronRight,
  User,
  LogOut,
  MessageSquare,
  Package,
  Settings,
  CheckCheck,
} from 'lucide-react';

interface AdminTopbarProps {
  userName: string;
  onOpenMobileSidebar: () => void;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/teklifler': 'Teklifler',
  '/admin/urunler': 'Ürünler',
  '/admin/urunler/yeni': 'Yeni Ürün',
  '/admin/kategoriler': 'Kategoriler',
  '/admin/siparisler': 'Siparişler',
  '/admin/musteriler': 'Müşteriler',
  '/admin/medya': 'Medya',
  '/admin/ayarlar': 'Ayarlar',
  '/admin/guncelleme': 'Güncelleme',
};

function buildBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [
    { label: 'Yönetim Paneli', href: '/admin' },
  ];

  if (pathname === '/admin') {
    crumbs.push({ label: 'Dashboard', href: '/admin' });
    return crumbs;
  }

  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  let currentPath = '/admin';

  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = BREADCRUMB_MAP[currentPath];
    if (label) {
      crumbs.push({ label, href: currentPath });
    } else {
      crumbs.push({ label: decodeURIComponent(segment), href: currentPath });
    }
  }

  return crumbs;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Az önce';
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

const TYPE_ICONS: Record<string, typeof MessageSquare> = {
  inquiry: MessageSquare,
  product: Package,
  system: Settings,
  info: Bell,
};

export function AdminTopbar({ userName, onOpenMobileSidebar }: AdminTopbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = buildBreadcrumbs(pathname);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function markAllRead() {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  }

  async function markOneRead(id: string) {
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-[#334155] dark:bg-[#1e293b] sm:px-6">
      {/* Left side: hamburger + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 lg:hidden"
          aria-label="Menü"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb - desktop */}
        <nav aria-label="Breadcrumb" className="hidden items-center gap-1 text-sm sm:flex">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={crumb.href + index} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                )}
                {isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>

        {/* Mobile: scrollable breadcrumb */}
        <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs sm:hidden">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={crumb.href + index} className="flex shrink-0 items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                )}
                {isLast ? (
                  <span className="font-medium text-gray-900 dark:text-white">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-gray-500 dark:text-gray-400"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>

      {/* Right side: theme toggle, notifications, user */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
          aria-label={theme === 'dark' ? 'Açık tema' : 'Koyu tema'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification bell with dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            aria-label="Bildirimler"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-[#334155] dark:bg-[#1e293b] sm:w-96"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[#334155]">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Bildirimler
                  </h3>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex items-center gap-1 text-xs font-medium text-[#1a365d] transition-colors hover:text-[#1a365d]/70 dark:text-[#d4a843] dark:hover:text-[#d4a843]/70"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Tümünü Okundu İşaretle
                    </button>
                  )}
                </div>

                {/* Notification list */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                      <Bell className="mb-2 h-8 w-8" />
                      <p className="text-sm">Bildirim bulunmuyor</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const Icon = TYPE_ICONS[notif.type] || Bell;
                      return (
                        <button
                          key={notif.id}
                          type="button"
                          onClick={() => {
                            if (!notif.read) markOneRead(notif.id);
                            if (notif.link) {
                              setNotifOpen(false);
                              window.location.href = notif.link;
                            }
                          }}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                            !notif.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                          }`}
                        >
                          <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              !notif.read
                                ? 'bg-[#1a365d]/10 text-[#1a365d] dark:bg-[#d4a843]/10 dark:text-[#d4a843]'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p
                                className={`text-sm ${
                                  !notif.read
                                    ? 'font-semibold text-gray-900 dark:text-white'
                                    : 'font-medium text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {notif.title}
                              </p>
                              {!notif.read && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                              {notif.message}
                            </p>
                            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                              {timeAgo(notif.createdAt)}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-[#334155]">
                    <Link
                      href="/admin/siparisler"
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center justify-center py-3 text-sm font-medium text-[#1a365d] transition-colors hover:text-[#1a365d]/70 dark:text-[#d4a843] dark:hover:text-[#d4a843]/70"
                    >
                      Tüm Bildirimleri Gör
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a365d] text-sm font-bold text-[#d4a843] transition-opacity hover:opacity-80"
            aria-label="Kullanıcı menüsü"
          >
            {userName.charAt(0).toUpperCase()}
          </button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[#334155] dark:bg-[#1e293b]"
              >
                <div className="border-b border-gray-200 px-4 py-3 dark:border-[#334155]">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Yönetici</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/admin/ayarlar"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    <User className="h-4 w-4" />
                    Profil Ayarları
                  </Link>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: '/admin/login' })}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış Yap
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
