'use client';

import { useState, type ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/pars-tabela/theme-provider';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';

interface AdminLayoutClientProps {
  userName: string;
  userEmail: string;
  children: ReactNode;
}

export function AdminLayoutClient({ userName, userEmail, children }: AdminLayoutClientProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-[#1e293b] dark:text-white dark:border-[#334155]',
          duration: 4000,
        }}
      />
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
        <AdminSidebar
          userName={userName}
          userEmail={userEmail}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
        <div
          className={`transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}
        >
          <AdminTopbar
            userName={userName}
            onOpenMobileSidebar={() => setMobileOpen(true)}
          />
          <main>
            <div className="mx-auto max-w-7xl p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}
