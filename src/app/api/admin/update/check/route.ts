import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { updateCheckSchema } from '@/types/admin';
import { fetchRemoteCommits } from '@/lib/update-utils';

/**
 * POST /api/admin/update/check
 * Uzak repoda yeni guncelleme olup olmadigini kontrol eder.
 * Body: { repoUrl: string, branch: string }
 */
export async function POST(request: NextRequest) {
  const { error, status } = await requireAdmin();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();
    const parsed = updateCheckSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        Object.values(fieldErrors).flat()[0] ?? 'Gecersiz istek verisi';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { repoUrl, branch } = parsed.data;
    const result = await fetchRemoteCommits(repoUrl, branch);

    return NextResponse.json({
      data: {
        ahead: result.ahead,
        commits: result.commits,
        latestRemoteHash: result.latestRemoteHash,
      },
    });
  } catch (err) {
    console.error('Guncelleme kontrol hatasi:', err);
    const message =
      err instanceof Error ? err.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: `Guncelleme kontrolu basarisiz: ${message}` },
      { status: 500 }
    );
  }
}
