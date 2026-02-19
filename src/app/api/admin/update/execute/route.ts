import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';
import { updateExecuteSchema } from '@/types/admin';
import bcrypt from 'bcryptjs';
import {
  acquireLock,
  releaseLock,
  createBackup,
  gitFetchAndReset,
  npmInstall,
  prismaGenerateAndMigrate,
  npmBuild,
  pm2Restart,
  getCurrentVersion,
} from '@/lib/update-utils';

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
 * POST /api/admin/update/execute
 * Guncelleme islemini SSE ile akim olarak calistirir.
 * Body: { repoUrl: string, branch: string, password: string }
 */
export async function POST(request: NextRequest) {
  // 1. Yetkilendirme kontrolu (SSE oncesi - JSON hata donebilir)
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

  const parsed = updateExecuteSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError =
      Object.values(fieldErrors).flat()[0] ?? 'Gecersiz istek verisi';
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { repoUrl, branch, password } = parsed.data;

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

  // 4. Kilit kontrolu
  if (!acquireLock()) {
    return NextResponse.json(
      { error: 'Baska bir guncelleme islemi devam ediyor' },
      { status: 409 }
    );
  }

  // 5. SSE akimi baslat
  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let logId = '';

      // Adim tanimlari
      const steps: StepInfo[] = [
        { name: 'Yedekleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Kod Guncelleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Bagimliliklar', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Veritabani', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Derleme', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Yeniden Baslatma', status: 'pending', message: '', startedAt: null, completedAt: null },
        { name: 'Tamamlandi', status: 'pending', message: '', startedAt: null, completedAt: null },
      ];

      try {
        // Mevcut surumu al
        const currentVersion = await getCurrentVersion();

        // UpdateLog kaydini olustur
        const updateLog = await prisma.updateLog.create({
          data: {
            version: currentVersion.version,
            commitHash: currentVersion.commitHash,
            prevHash: currentVersion.commitHash,
            branch,
            status: 'IN_PROGRESS',
            triggeredBy: user.email,
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

        // --- Adim 0: Yedekleme ---
        let success = await runStep(0, async () => {
          const backup = await createBackup(
            currentVersion.version,
            currentVersion.commitHash
          );

          // Yedek kaydini veritabanina kaydet
          await prisma.backup.create({
            data: {
              path: backup.filePath,
              dbPath: backup.dbPath,
              version: currentVersion.version,
              commitHash: currentVersion.commitHash,
              sizeBytes: backup.sizeBytes,
              note: `Otomatik yedek - guncelleme oncesi (${new Date().toLocaleDateString('tr-TR')})`,
            },
          });

          return `Yedek olusturuldu (${(backup.sizeBytes / 1024 / 1024).toFixed(2)} MB)`;
        });
        if (!success) throw new Error('Yedekleme basarisiz');

        // --- Adim 1: Kod Guncelleme ---
        let newCommitHash = '';
        success = await runStep(1, async () => {
          newCommitHash = await gitFetchAndReset(repoUrl, branch);
          return `Kod guncellendi: ${newCommitHash.substring(0, 8)}`;
        });
        if (!success) throw new Error('Kod guncelleme basarisiz');

        // --- Adim 2: Bagimliliklar ---
        success = await runStep(2, async () => {
          return await npmInstall();
        });
        if (!success) throw new Error('Bagimlilik kurulumu basarisiz');

        // --- Adim 3: Veritabani ---
        success = await runStep(3, async () => {
          return await prismaGenerateAndMigrate();
        });
        if (!success) throw new Error('Veritabani guncelleme basarisiz');

        // --- Adim 4: Derleme ---
        success = await runStep(4, async () => {
          return await npmBuild();
        });
        if (!success) throw new Error('Derleme basarisiz');

        // --- Adim 5: Yeniden Baslatma (hatasi kritik degil) ---
        await runStep(5, async () => {
          return await pm2Restart();
        });
        // PM2 hatasi durumunda bile devam et

        // --- Adim 6: Tamamlandi ---
        steps[6].status = 'success';
        steps[6].message = 'Guncelleme basariyla tamamlandi';
        steps[6].startedAt = new Date().toISOString();
        steps[6].completedAt = new Date().toISOString();
        sendEvent(controller, 'step', { index: 6, step: { ...steps[6] } });

        // Yeni surumu oku
        const newVersion = await getCurrentVersion();

        // Basarili log kaydi
        const duration = Math.round((Date.now() - startTime) / 1000);
        await prisma.updateLog.update({
          where: { id: logId },
          data: {
            status: 'SUCCESS',
            commitHash: newCommitHash || newVersion.commitHash,
            version: newVersion.version,
            completedAt: new Date(),
            duration,
            steps: JSON.parse(JSON.stringify(steps)),
          },
        });

        sendEvent(controller, 'complete', {
          status: 'SUCCESS',
          duration,
          version: newVersion.version,
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
                error: errMsg,
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
