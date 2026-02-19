import { NextRequest, NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { rollbackSchema } from '@/types/admin';
import bcrypt from 'bcryptjs';
import {
  acquireLock,
  releaseLock,
  npmInstall,
  prismaGenerateAndMigrate,
  npmBuild,
  pm2Restart,
  getCurrentVersion,
} from '@/lib/update-utils';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);
const COMMAND_TIMEOUT = 10 * 60 * 1000;
const PROJECT_ROOT = process.cwd();

type StepStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

interface StepInfo {
  name: string;
  status: StepStatus;
  message: string;
  startedAt: string | null;
  completedAt: string | null;
}

/** SSE yardimci: Bir event gonderir */
function sendEvent(
  controller: ReadableStreamDefaultController,
  event: string,
  data: unknown
): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

/**
 * POST /api/admin/update/rollback
 * Yedekten geri yukleme islemini SSE ile akim olarak calistirir.
 * Body: { backupId: string, password: string }
 */
export async function POST(request: NextRequest) {
  // 1. Yetkilendirme kontrolu
  const { error: authError, status: authStatus, user } = await requireAdmin();
  if (authError || !user) {
    return NextResponse.json({ error: authError }, { status: authStatus });
  }

  // 2. Istek gvdesini dogrula
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Gecersiz JSON verisi' }, { status: 400 });
  }

  const parsed = rollbackSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError =
      Object.values(fieldErrors).flat()[0] ?? 'Gecersiz istek verisi';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { backupId, password } = parsed.data;

  // 3. Admin sifresini dogrula
  const adminUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });

  if (!adminUser?.password) {
    return NextResponse.json(
      { error: 'Kullanici sifresi bulunamadi' },
      { status: 400 }
    );
  }

  const passwordValid = await bcrypt.compare(password, adminUser.password);
  if (!passwordValid) {
    return NextResponse.json({ error: 'Gecersiz sifre' }, { status: 401 });
  }

  // 4. Yedek kaydini bul
  const backup = await prisma.backup.findUnique({
    where: { id: backupId },
  });

  if (!backup) {
    return NextResponse.json(
      { error: 'Yedek kaydi bulunamadi' },
      { status: 404 }
    );
  }

  // 5. Kilit kontrolu
  if (!acquireLock()) {
    return NextResponse.json(
      { error: 'Baska bir guncelleme veya geri yukleme islemi devam ediyor' },
      { status: 409 }
    );
  }

  // 6. SSE akimi baslat
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let logId = '';

      // Adim tanimlari
      const steps: StepInfo[] = [
        { name: 'Yedek Dogrulama', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Dosya Geri Yukleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Veritabani Geri Yukleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Bagimliliklar', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Veritabani Senkronizasyonu', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Derleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Yeniden Baslatma', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Tamamlandi', status: 'pending', message: '', startedAt: null, completedAt: null },
      ];

      try {
        const currentVersion = await getCurrentVersion();

        // UpdateLog kaydini olustur (geri yukleme notu ile)
        const updateLog = await prisma.updateLog.create({
          data: {
            version: backup.version,
            commitHash: backup.commitHash,
            prevHash: currentVersion.commitHash,
            branch: currentVersion.branch,
            status: 'IN_PROGRESS',
            triggeredBy: user.email,
            error: `Rollback from ${backupId}`,
            steps: JSON.parse(JSON.stringify(steps)),
          },
        });
        logId = updateLog.id;

        // Baslangic event'i gonder
        sendEvent(controller, 'init', {
          logId,
          steps: steps.map((s) => ({ name: s.name, status: s.status })),
        });

        // Adim calistirma yardimcisi
        const runStep = async (
          index: number,
          fn: () => Promise<string>
        ): Promise<boolean> => {
          steps[index].status = 'running';
          steps[index].startedAt = new Date().toISOString();
          sendEvent(controller, 'step', { index, step: { ...steps[index] } });

          try {
            const message = await fn();
            steps[index].status = 'success';
            steps[index].message = message;
            steps[index].completedAt = new Date().toISOString();
            sendEvent(controller, 'step', { index, step: { ...steps[index] } });
            return true;
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : 'Bilinmeyen hata';
            steps[index].status = 'failed';
            steps[index].message = errMsg;
            steps[index].completedAt = new Date().toISOString();
            sendEvent(controller, 'step', { index, step: { ...steps[index] } });
            return false;
          }
        };

        // --- Adim 0: Yedek Dogrulama ---
        let success = await runStep(0, async () => {
          if (!existsSync(backup.path)) {
            throw new Error(`Yedek dosyasi bulunamadi: ${backup.path}`);
          }
          if (!existsSync(backup.dbPath)) {
            throw new Error(`Veritabani yedek dosyasi bulunamadi: ${backup.dbPath}`);
          }
          return `Yedek dosyalari dogrulandi (${backup.version} - ${backup.commitHash.substring(0, 8)})`;
        });
        if (!success) throw new Error('Yedek dogrulama basarisiz');

        // --- Adim 1: Dosya Geri Yukleme ---
        success = await runStep(1, async () => {
          await execFile('tar', ['xzf', backup.path, '-C', PROJECT_ROOT], {
            timeout: COMMAND_TIMEOUT,
            cwd: PROJECT_ROOT,
          });
          return 'Dosyalar basariyla geri yuklendi';
        });
        if (!success) throw new Error('Dosya geri yukleme basarisiz');

        // --- Adim 2: Veritabani Geri Yukleme ---
        success = await runStep(2, async () => {
          const databaseUrl = process.env.DATABASE_URL;
          if (!databaseUrl) {
            throw new Error('DATABASE_URL ortam degiskeni tanimli degil');
          }
          await execFile('psql', [databaseUrl, '-f', backup.dbPath], {
            timeout: COMMAND_TIMEOUT,
            cwd: PROJECT_ROOT,
          });
          return 'Veritabani basariyla geri yuklendi';
        });
        if (!success) throw new Error('Veritabani geri yukleme basarisiz');

        // --- Adim 3: Bagimliliklar ---
        success = await runStep(3, async () => {
          return await npmInstall();
        });
        if (!success) throw new Error('Bagimlilik kurulumu basarisiz');

        // --- Adim 4: Veritabani Senkronizasyonu ---
        success = await runStep(4, async () => {
          return await prismaGenerateAndMigrate();
        });
        if (!success) throw new Error('Veritabani senkronizasyonu basarisiz');

        // --- Adim 5: Derleme ---
        success = await runStep(5, async () => {
          return await npmBuild();
        });
        if (!success) throw new Error('Derleme basarisiz');

        // --- Adim 6: Yeniden Baslatma (hatasi kritik degil) ---
        await runStep(6, async () => {
          return await pm2Restart();
        });

        // --- Adim 7: Tamamlandi ---
        steps[7].status = 'success';
        steps[7].message = 'Geri yukleme basariyla tamamlandi';
        steps[7].startedAt = new Date().toISOString();
        steps[7].completedAt = new Date().toISOString();
        sendEvent(controller, 'step', { index: 7, step: { ...steps[7] } });

        // Basarili log kaydi
        const duration = Math.round((Date.now() - startTime) / 1000);
        await prisma.updateLog.update({
          where: { id: logId },
          data: {
            status: 'SUCCESS',
            completedAt: new Date(),
            duration,
            steps: JSON.parse(JSON.stringify(steps)),
          },
        });

        sendEvent(controller, 'complete', {
          status: 'SUCCESS',
          duration,
          version: backup.version,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Bilinmeyen hata';

        // Kalan adimlari 'skipped' olarak isaretle
        for (const step of steps) {
          if (step.status === 'pending') {
            step.status = 'skipped';
            step.message = 'Onceki adim basarisiz oldugu icin atlandi';
          }
        }

        // Basarisiz log kaydi
        const duration = Math.round((Date.now() - startTime) / 1000);
        if (logId) {
          try {
            await prisma.updateLog.update({
              where: { id: logId },
              data: {
                status: 'FAILED',
                completedAt: new Date(),
                duration,
                error: `Rollback from ${backupId}: ${errMsg}`,
                steps: JSON.parse(JSON.stringify(steps)),
              },
            });
          } catch {
            // Log guncelleme hatasi yoksay
          }
        }

        sendEvent(controller, 'complete', {
          status: 'FAILED',
          duration,
          error: errMsg,
        });
      } finally {
        releaseLock();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
