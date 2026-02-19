import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import prisma from '@/lib/prisma';

const execFile = promisify(execFileCb);

/** Her komut icin 10 dakika zaman asimi */
const COMMAND_TIMEOUT = 10 * 60 * 1000;

/** Proje kok dizini */
const PROJECT_ROOT = process.cwd();

/** Yedek dosyalari dizini */
const BACKUPS_DIR = join(PROJECT_ROOT, '.backups');

// ---------------------------------------------------------------------------
// Yardimci: Komut calistirma
// ---------------------------------------------------------------------------

async function run(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<{ stdout: string; stderr: string }> {
  return execFile(command, args, {
    timeout: COMMAND_TIMEOUT,
    maxBuffer: 50 * 1024 * 1024,
    cwd: options?.cwd ?? PROJECT_ROOT,
    env: options?.env ?? process.env,
  });
}

// ---------------------------------------------------------------------------
// 1. On kosul kontrolleri
// ---------------------------------------------------------------------------

/** Git yuklu mu? */
export async function checkGitInstalled(): Promise<boolean> {
  try {
    await run('git', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** PM2 yuklu mu? */
export async function checkPm2Installed(): Promise<boolean> {
  try {
    await run('pm2', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** pg_dump yuklu mu? */
export async function checkPgDumpInstalled(): Promise<boolean> {
  try {
    await run('pg_dump', ['--version']);
    return true;
  } catch {
    return false;
  }
}

/** Proje bir git reposu mu? */
export function isGitRepo(): boolean {
  return existsSync(join(PROJECT_ROOT, '.git'));
}

// ---------------------------------------------------------------------------
// 2. Surum bilgisi
// ---------------------------------------------------------------------------

interface VersionInfo {
  version: string;
  commitHash: string;
  commitDate: string;
  branch: string;
}

/** Mevcut surum bilgilerini dondurur */
export async function getCurrentVersion(): Promise<VersionInfo> {
  let version = '0.0.0';
  try {
    const pkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
    version = pkg.version ?? '0.0.0';
  } catch {
    // package.json okunamazsa varsayilan surum kullan
  }

  let commitHash = 'bilinmiyor';
  let commitDate = new Date().toISOString();
  let branch = 'main';

  try {
    const { stdout: logOutput } = await run('git', ['log', '-1', '--format=%H|%aI']);
    const parts = logOutput.trim().split('|');
    if (parts.length >= 2) {
      commitHash = parts[0];
      commitDate = parts[1];
    }
  } catch {
    // Git hatasi - varsayilan degerler kullanilacak
  }

  try {
    const { stdout: branchOutput } = await run('git', ['branch', '--show-current']);
    branch = branchOutput.trim() || 'main';
  } catch {
    // Git hatasi - varsayilan branch kullanilacak
  }

  return { version, commitHash, commitDate, branch };
}

/** Sunucu calisma suresini saniye cinsinden dondurur */
export function getServerUptime(): number {
  return process.uptime();
}

// ---------------------------------------------------------------------------
// 3. Uzak repo karsilastirma
// ---------------------------------------------------------------------------

interface RemoteCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

interface RemoteCompareResult {
  ahead: number;
  commits: RemoteCommit[];
  latestRemoteHash: string;
}

/** Uzak repodaki yeni commitleri getirir */
export async function fetchRemoteCommits(
  repoUrl: string,
  branch: string
): Promise<RemoteCompareResult> {
  await run('git', ['fetch', repoUrl, branch]);

  const { stdout } = await run('git', [
    'log',
    'HEAD..FETCH_HEAD',
    '--format=%H|%s|%aI|%an',
  ]);

  const lines = stdout.trim().split('\n').filter(Boolean);
  const commits: RemoteCommit[] = lines.map((line) => {
    const [hash, message, date, author] = line.split('|');
    return { hash, message, date, author };
  });

  let latestRemoteHash = '';
  if (commits.length > 0) {
    latestRemoteHash = commits[0].hash;
  } else {
    // Uzak repo ile ayni noktadayiz - mevcut hash'i al
    try {
      const { stdout: headOutput } = await run('git', ['rev-parse', 'FETCH_HEAD']);
      latestRemoteHash = headOutput.trim();
    } catch {
      latestRemoteHash = '';
    }
  }

  return {
    ahead: commits.length,
    commits,
    latestRemoteHash,
  };
}

// ---------------------------------------------------------------------------
// 4. Yedekleme
// ---------------------------------------------------------------------------

interface BackupResult {
  filePath: string;
  dbPath: string;
  sizeBytes: number;
}

/** Dosya ve veritabani yedegi olusturur */
export async function createBackup(
  version: string,
  commitHash: string
): Promise<BackupResult> {
  const shortHash = commitHash.substring(0, 8);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = join(BACKUPS_DIR, `${timestamp}_v${version}_${shortHash}`);

  mkdirSync(backupDir, { recursive: true });

  const filePath = join(backupDir, 'files.tar.gz');
  const dbPath = join(backupDir, 'db.sql');

  // Dosya yedegi
  await run('tar', [
    'czf',
    filePath,
    '--exclude=node_modules',
    '--exclude=.next',
    '--exclude=.backups',
    '.',
  ]);

  // Veritabani yedegi (pg_dump yoksa atla)
  const hasPgDump = await checkPgDumpInstalled();
  const databaseUrl = process.env.DATABASE_URL;

  if (hasPgDump && databaseUrl) {
    try {
      const { stdout } = await run('pg_dump', [databaseUrl], {
        env: { ...process.env },
      });
      const { writeFileSync } = await import('node:fs');
      writeFileSync(dbPath, stdout, 'utf-8');
    } catch {
      // pg_dump hatasi kritik degil - dosya yedegi yeterli
    }
  }

  // Boyut hesaplama
  let sizeBytes = 0;
  try {
    const fileStat = statSync(filePath);
    sizeBytes = fileStat.size;
    if (existsSync(dbPath)) {
      const dbStat = statSync(dbPath);
      sizeBytes += dbStat.size;
    }
  } catch {
    // Boyut hesaplanamazsa 0 kalir
  }

  return { filePath, dbPath, sizeBytes };
}

// ---------------------------------------------------------------------------
// 5. Guncelleme adimlari
// ---------------------------------------------------------------------------

/** Git fetch ve reset islemleri - yeni commit hash dondurur */
export async function gitFetchAndReset(
  repoUrl: string,
  branch: string
): Promise<string> {
  await run('git', ['fetch', repoUrl, branch]);
  await run('git', ['reset', '--hard', 'FETCH_HEAD']);

  const { stdout } = await run('git', ['rev-parse', 'HEAD']);
  return stdout.trim();
}

/** Temiz npm kurulumu (devDependencies dahil) */
export async function npmInstall(): Promise<string> {
  // node_modules sil ve temiz kurulum yap
  await run('rm', ['-rf', 'node_modules']);

  // NODE_ENV=production ise npm install devDeps atlar.
  // next start NODE_ENV=production set eder, bu yuzden acikca development olarak calistir.
  const installEnv = { ...process.env, NODE_ENV: 'development' as const };

  const hasLockfile = existsSync(join(PROJECT_ROOT, 'package-lock.json'));
  const cmd = hasLockfile ? 'ci' : 'install';
  const { stdout, stderr } = await run('npm', [cmd], { env: installEnv });
  return stdout || stderr || `npm ${cmd} tamamlandi`;
}

/** Prisma generate ve db push calistirir */
export async function prismaGenerateAndMigrate(): Promise<string> {
  const { stdout: genOut } = await run('npx', ['prisma', 'generate']);

  // Once migrate deploy dene (migration dosyalari varsa), yoksa db push kullan
  let dbResult = '';
  try {
    const { stdout: migrateOut } = await run('npx', ['prisma', 'migrate', 'deploy']);
    dbResult = `Migrate deploy: ${migrateOut.trim()}`;
  } catch {
    const { stdout: pushOut } = await run('npx', ['prisma', 'db', 'push', '--accept-data-loss']);
    dbResult = `DB push: ${pushOut.trim()}`;
  }

  return `Prisma generate: ${genOut.trim()}\n${dbResult}`;
}

/** npm run build calistirir (eski .next cache temizlenir) */
export async function npmBuild(): Promise<string> {
  // Eski build cache'i temizle (Turbopack eski chunk'lari tekrar kullanmasin)
  await run('rm', ['-rf', '.next']);
  const { stdout, stderr } = await run('npm', ['run', 'build']);
  return stdout || stderr || 'Build tamamlandi';
}

/** PM2 restart calistirir - basarisiz olursa uyari mesaji dondurur */
export async function pm2Restart(): Promise<string> {
  try {
    const { stdout } = await run('pm2', ['restart', 'all']);
    return stdout || 'PM2 yeniden baslatildi';
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Bilinmeyen hata';
    return `PM2 yeniden baslatma uyarisi: ${message}. Uygulamayi manuel olarak yeniden baslatmaniz gerekebilir.`;
  }
}

// ---------------------------------------------------------------------------
// 6. Geri yukleme (Rollback)
// ---------------------------------------------------------------------------

/** Yedekten geri yukleme yapar */
export async function restoreBackup(
  filePath: string,
  dbPath: string
): Promise<string> {
  // Dosya geri yukleme
  await run('tar', ['xzf', filePath, '-C', PROJECT_ROOT]);

  // Veritabani geri yukleme (yedek varsa)
  if (existsSync(dbPath)) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      try {
        await run('psql', [databaseUrl, '-f', dbPath]);
      } catch {
        // DB restore hatasi kritik degil
      }
    }
  }

  // Bagimlilik ve build adimlari (temiz kurulum, devDeps dahil)
  await run('rm', ['-rf', 'node_modules']);
  const installEnv = { ...process.env, NODE_ENV: 'development' as const };
  const hasLockfile = existsSync(join(PROJECT_ROOT, 'package-lock.json'));
  await run('npm', [hasLockfile ? 'ci' : 'install'], { env: installEnv });
  await run('npx', ['prisma', 'generate']);
  await run('rm', ['-rf', '.next']);
  await run('npm', ['run', 'build']);

  // PM2 yeniden baslatma
  try {
    await run('pm2', ['restart', 'all']);
  } catch {
    // PM2 hatasi kritik degil
  }

  return 'Geri yukleme tamamlandi';
}

// ---------------------------------------------------------------------------
// 7. Kilit mekanizmasi
// ---------------------------------------------------------------------------

let _updateLock = false;

/** Kilit edinir - basarili olursa true dondurur */
export function acquireLock(): boolean {
  if (_updateLock) {
    return false;
  }
  _updateLock = true;
  return true;
}

/** Kilidi serbest birakir */
export function releaseLock(): void {
  _updateLock = false;
}

/** Kilit durumunu kontrol eder */
export function isLocked(): boolean {
  return _updateLock;
}

/** Veritabaninda 10 dakikadan eski IN_PROGRESS kayitlarini temizler */
export async function checkAndCleanStaleLocks(): Promise<void> {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const staleRecords = await prisma.updateLog.findMany({
    where: {
      status: 'IN_PROGRESS',
      startedAt: { lt: tenMinutesAgo },
    },
  });

  if (staleRecords.length > 0) {
    await prisma.updateLog.updateMany({
      where: {
        status: 'IN_PROGRESS',
        startedAt: { lt: tenMinutesAgo },
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Zaman asimi - islem 10 dakikadan uzun surdu ve otomatik olarak iptal edildi',
      },
    });

    // Bellek ici kilidi de serbest birak
    _updateLock = false;
  }
}
