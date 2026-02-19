import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized', status: 401 as const, user: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true, email: true, name: true },
  });

  if (!user?.isAdmin) {
    return { error: 'Forbidden: Admin access required', status: 403 as const, user: null };
  }

  return { error: null, status: 200 as const, user };
}
