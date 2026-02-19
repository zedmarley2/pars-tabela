export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { getSetting } from '@/lib/settings';
import { ThemeProvider } from '@/components/pars-tabela/theme-provider';
import { ToastProvider } from '@/components/pars-tabela/toast';

export async function generateMetadata(): Promise<Metadata> {
  const [title, description] = await Promise.all([
    getSetting('meta_title'),
    getSetting('meta_description'),
  ]);

  const resolvedTitle = title || 'Pars Tabela | Profesyonel Tabela & Reklam Çözümleri';
  const resolvedDescription =
    description ||
    'Neon tabela, LED tabela, kutu harf ve elektronik tabela üretimi. 15 yılı aşkın deneyim ile profesyonel tabela çözümleri.';

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: 'tabela, neon tabela, led tabela, kutu harf, reklam, ışıklı tabela, Isparta',
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      type: 'website',
      locale: 'tr_TR',
    },
  };
}

export default function ParsTabelaLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#f8fafc] text-[#1f2937] transition-colors duration-300 dark:bg-[#0f172a] dark:text-[#f3f4f6]">
          {children}
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
