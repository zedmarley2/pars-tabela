export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { AdminLayoutClient } from '@/components/admin/admin-layout-client';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/admin/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, name: true, email: true },
  });

  if (!user?.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Erişim Reddedildi</h1>
          <p className="mt-2 text-gray-500">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
        </div>
      </div>
    );
  }

  const userName = user.name ?? 'Admin';
  const userEmail = user.email ?? '';

  return (
    <AdminLayoutClient userName={userName} userEmail={userEmail}>
      {children}
    </AdminLayoutClient>
  );
}
