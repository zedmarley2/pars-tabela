'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTheme } from '@/components/pars-tabela/theme-provider';

const NAV_ITEMS = [
  { label: 'Ana Sayfa', href: '#hero', path: '/' },
  { label: 'Hizmetlerimiz', href: '#hizmetlerimiz', path: '/#hizmetlerimiz' },
  { label: 'Ürünlerimiz', href: '#urunlerimiz', path: '/#urunlerimiz' },
  { label: 'Hakkımızda', href: '#hakkimizda', path: '/#hakkimizda' },
  { label: 'İletişim', href: '#iletisim', path: '/#iletisim' },
];

interface NeonHeaderProps {
  siteName?: string;
  logoLight?: string;
  logoDark?: string;
}

export function NeonHeader({ siteName, logoLight, logoDark }: NeonHeaderProps = {}) {
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isMainPage = pathname === '/';

  // Client-side mount detection for portal rendering (avoids SSR mismatch)
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // ESC key closes menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobileMenu();
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, item: (typeof NAV_ITEMS)[number]) {
    e.preventDefault();
    closeMobileMenu();

    if (isMainPage) {
      if (item.href === '#hero') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const target = document.querySelector(item.href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else {
      router.push(item.path);
    }
  }

  function handleLogoClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    closeMobileMenu();
    if (isMainPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/');
    }
  }

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 shadow-md backdrop-blur-md dark:bg-[#0f172a]/95'
            : 'bg-white/70 backdrop-blur-sm dark:bg-[#0f172a]/70'
        }`}
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <a
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-3"
          >
            {logoLight || logoDark ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoLight && <img src={logoLight} alt={siteName || 'Pars Tabela'} className="h-10 w-auto block dark:hidden" />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {logoDark && <img src={logoDark} alt={siteName || 'Pars Tabela'} className="h-10 w-auto hidden dark:block" />}
                {!logoDark && logoLight && <img src={logoLight} alt={siteName || 'Pars Tabela'} className="h-10 w-auto hidden dark:block" />}
              </>
            ) : (
              <>
                <HexLogo />
                <div className="flex flex-col">
                  <span className="text-lg font-bold leading-tight text-[#1a365d] dark:text-white">
                    {siteName || 'Pars Tabela'}
                  </span>
                  <span className="text-[10px] font-medium tracking-widest text-[#d4a843] uppercase">
                    Profesyonel Tabela
                  </span>
                </div>
              </>
            )}
          </a>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-8 md:flex">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={isMainPage ? item.href : item.path}
                  onClick={(e) => handleNavClick(e, item)}
                  className="text-sm font-medium text-[#1f2937] transition-colors hover:text-[#1a365d] dark:text-gray-300 dark:hover:text-[#d4a843]"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e8f0] bg-white text-sm transition-colors hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1e293b] dark:hover:bg-[#334155]"
                aria-label="Tema değiştir"
              >
                {theme === 'light' ? (
                  <span className="text-[#1a365d]">&#9790;</span>
                ) : (
                  <span className="text-[#d4a843]">&#9728;</span>
                )}
              </button>
            </li>
          </ul>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="relative z-[9999] flex flex-col gap-1.5 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menüyü aç"
          >
            <motion.span
              animate={mobileMenuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              className="block h-0.5 w-6 bg-[#1a365d] dark:bg-white"
            />
            <motion.span
              animate={mobileMenuOpen ? { opacity: 0 } : { opacity: 1 }}
              className="block h-0.5 w-6 bg-[#1a365d] dark:bg-white"
            />
            <motion.span
              animate={mobileMenuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              className="block h-0.5 w-6 bg-[#1a365d] dark:bg-white"
            />
          </button>
        </nav>
      </header>

      {/* Mobile menu portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm md:hidden"
                onClick={closeMobileMenu}
              />

              {/* Slide-in panel */}
              <motion.div
                key="mobile-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed right-0 top-0 z-[9999] flex h-full w-[280px] flex-col bg-white shadow-2xl dark:bg-gray-900 md:hidden"
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={closeMobileMenu}
                  className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                  aria-label="Menüyü kapat"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Logo at top */}
                <div className="px-6 pt-5 pb-4">
                  <a
                    href="/"
                    onClick={handleLogoClick}
                    className="flex items-center gap-2"
                  >
                    <HexLogo size={32} />
                    <span className="text-base font-bold text-[#1a365d] dark:text-white">
                      {siteName || 'Pars Tabela'}
                    </span>
                  </a>
                </div>

                {/* Navigation links */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="flex flex-col">
                    {NAV_ITEMS.map((item) => (
                      <a
                        key={item.href}
                        href={isMainPage ? item.href : item.path}
                        onClick={(e) => handleNavClick(e, item)}
                        className="border-b border-gray-100 px-6 py-4 text-lg font-medium text-[#1f2937] transition-colors hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-white/5"
                      >
                        {item.label}
                      </a>
                    ))}
                  </nav>
                </div>

                {/* Dark mode toggle */}
                <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-[#1f2937] transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5"
                  >
                    {theme === 'light' ? (
                      <>
                        <span className="text-lg">&#9790;</span>
                        <span>Koyu Tema</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg text-[#d4a843]">&#9728;</span>
                        <span>Açık Tema</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Contact info at bottom */}
                <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>+90 (246) 555 0123</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>info@parstabela.com</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function HexLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
        className="fill-[#1a365d] dark:fill-[#d4a843]"
      />
      <path
        d="M20 5L33.5 12.5V27.5L20 35L6.5 27.5V12.5L20 5Z"
        className="fill-white dark:fill-[#0f172a]"
      />
      <path
        d="M20 8L31 14.5V25.5L20 32L9 25.5V14.5L20 8Z"
        className="fill-[#1a365d] dark:fill-[#d4a843]"
      />
      <text
        x="20"
        y="24"
        textAnchor="middle"
        className="fill-white dark:fill-[#0f172a]"
        style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}
      >
        P
      </text>
    </svg>
  );
}
