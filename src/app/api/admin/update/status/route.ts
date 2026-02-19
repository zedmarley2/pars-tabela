import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import {
  getCurrentVersion,
  getServerUptime,
  isGitRepo,
  checkGitInstalled,
  checkPm2Installed,
  checkPgDumpInstalled,
  isLocked,
  checkAndCleanStaleLocks,
} from '@/lib/update-utils';

/**
 * GET /api/admin/update/status
 * Guncelleme sistemi durum bilgilerini dondurur.
 * Surum, uptime, on kosullar, kilit durumu ve son guncelleme kaydi.
 */
export async function GET() {
  const { error, status } = await requireAdmin();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    // Eski kilitlenme kayitlarini temizle (non-fatal)
    try { await checkAndCleanStaleLocks(); } catch { /* ignore */ }

    // Her bilgiyi bagimsiz try-catch ile topla
    let versionInfo = { version: '1.0.0', commitHash: 'unknown', commitDate: new Date().toISOString(), branch: 'main' };
    try { versionInfo = await getCurrentVersion(); } catch { /* varsayilan degerler */ }

    let hasGit = false;
    try { hasGit = await checkGitInstalled(); } catch { /* false */ }

    let hasPm2 = false;
    try { hasPm2 = await checkPm2Installed(); } catch { /* false */ }

    let hasPgDump = false;
    try { hasPgDump = await checkPgDumpInstalled(); } catch { /* false */ }

    let lastUpdate = null;
    try {
      lastUpdate = await prisma.updateLog.findFirst({
        orderBy: { startedAt: 'desc' },
      });
    } catch { /* DB hatasi - null dondur */ }

    let gitRepo = false;
    try { gitRepo = isGitRepo(); } catch { /* false */ }

    const uptime = getServerUptime();
    const isUpdateInProgress = isLocked();
    const repoUrl = process.env.GITHUB_REPO_URL ?? '';

    return NextResponse.json({
      data: {
        version: versionInfo.version,
        commitHash: versionInfo.commitHash,
        commitDate: versionInfo.commitDate,
        branch: versionInfo.branch,
        uptime,
        isGitRepo: gitRepo,
        hasGit,
        hasPm2,
        hasPgDump,
        isUpdateInProgress,
        lastUpdate,
        repoUrl,
      },
    });
  } catch (err) {
    console.error('Guncelleme durumu sorgu hatasi:', err);
    return NextResponse.json(
      { error: 'Sunucu hatasi' },
      { status: 500 }
    );
  }
}
