'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  GitCommit,
  Download,
  History,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Server,
  Shield,
  ArrowUpCircle,
  Circle,
  Lock,
  X,
  Archive,
  RotateCcw,
  Eye,
  Info,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatusData {
  version: string;
  commitHash: string;
  commitDate: string;
  branch: string;
  uptime: number;
  isGitRepo: boolean;
  hasGit: boolean;
  hasPm2: boolean;
  hasPgDump: boolean;
  isUpdateInProgress: boolean;
  lastUpdate: { completedAt: string; version: string } | null;
  repoUrl: string | null;
}

interface CheckResult {
  ahead: number;
  commits: Array<{ hash: string; message: string; date: string; author: string }>;
  latestRemoteHash: string;
}

interface StepResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  message?: string;
  startedAt?: string;
  completedAt?: string;
}

interface CompleteResult {
  status: 'SUCCESS' | 'FAILED';
  duration: number;
  version?: string;
  error?: string;
}

interface BackupEntry {
  id: string;
  path: string;
  dbPath: string;
  version: string;
  commitHash: string;
  sizeBytes: number;
  note: string | null;
  createdAt: string;
  exists: boolean;
}

interface UpdateLogEntry {
  id: string;
  version: string;
  commitHash: string;
  prevHash: string | null;
  branch: string;
  status: 'IN_PROGRESS' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  steps: StepResult[] | null;
  error: string | null;
  triggeredBy: string | null;
}

type TabKey = 'status' | 'update' | 'backups' | 'history';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'status', label: 'Durum', icon: Activity },
  { key: 'update', label: 'Guncelle', icon: ArrowUpCircle },
  { key: 'backups', label: 'Yedekler', icon: Archive },
  { key: 'history', label: 'Gecmis', icon: History },
];

const INITIAL_STEPS: StepResult[] = [
  { name: 'Yedekleme', status: 'pending' },
  { name: 'Veritabani Yedekleme', status: 'pending' },
  { name: 'Git Pull', status: 'pending' },
  { name: 'Bagimlilik Kurulumu', status: 'pending' },
  { name: 'Veritabani Migrasyonu', status: 'pending' },
  { name: 'Build', status: 'pending' },
  { name: 'Yeniden Baslatma', status: 'pending' },
];

const ROLLBACK_STEPS: StepResult[] = [
  { name: 'Dosya Geri Yukleme', status: 'pending' },
  { name: 'Veritabani Geri Yukleme', status: 'pending' },
  { name: 'Bagimlilik Kurulumu', status: 'pending' },
  { name: 'Build', status: 'pending' },
  { name: 'Yeniden Baslatma', status: 'pending' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes} dakika`;
  return `${hours} saat ${minutes} dakika`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}sn`;
  return `${mins}dk ${secs}sn`;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Skeleton Components
// ---------------------------------------------------------------------------

function StatusSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]"
          >
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-6 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:block" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:block" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 lg:block" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Progress Component
// ---------------------------------------------------------------------------

function StepProgress({
  steps,
  result,
}: {
  steps: StepResult[];
  result: CompleteResult | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]"
    >
      <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
        Guncelleme Ilerlemesi
      </h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200 dark:bg-[#334155]" />

        <div className="space-y-0">
          {steps.map((step, index) => (
            <StepItem key={index} step={step} isLast={index === steps.length - 1} />
          ))}
        </div>
      </div>

      {/* Completion summary */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div
              className={`rounded-lg border p-4 ${
                result.status === 'SUCCESS'
                  ? 'border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10'
                  : 'border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.status === 'SUCCESS' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                )}
                <div>
                  <p
                    className={`font-semibold ${
                      result.status === 'SUCCESS'
                        ? 'text-green-800 dark:text-green-300'
                        : 'text-red-800 dark:text-red-300'
                    }`}
                  >
                    {result.status === 'SUCCESS'
                      ? 'Guncelleme basariyla tamamlandi!'
                      : 'Guncelleme basarisiz oldu'}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    Sure: {formatDuration(result.duration)}
                    {result.version && ` | Versiyon: ${result.version}`}
                  </p>
                  {result.error && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      Hata: {result.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StepItem({ step, isLast }: { step: StepResult; isLast: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (step.status !== 'running' || !step.startedAt) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(step.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [step.status, step.startedAt]);

  function getStepIcon() {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-green-500 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500 dark:text-red-400" />;
      case 'running':
        return (
          <div className="flex h-6 w-6 items-center justify-center">
            <div className="h-4 w-4 animate-pulse rounded-full bg-blue-500 dark:bg-blue-400" />
          </div>
        );
      case 'skipped':
        return (
          <div className="flex h-6 w-6 items-center justify-center">
            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" strokeDasharray="4 2" />
          </div>
        );
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center">
            <Circle className="h-4 w-4 text-gray-300 dark:text-gray-600" />
          </div>
        );
    }
  }

  function getStatusBadge() {
    switch (step.status) {
      case 'success':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
            Basarili
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
            Basarisiz
          </span>
        );
      case 'running':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            Calisiyor
            {elapsed > 0 && <span>({elapsed}sn)</span>}
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
            Atlandi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
            Bekliyor
          </span>
        );
    }
  }

  function getTextColor() {
    switch (step.status) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'failed':
        return 'text-red-700 dark:text-red-400';
      case 'running':
        return 'text-blue-700 dark:text-blue-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }

  return (
    <div className={`relative flex items-start gap-4 ${isLast ? '' : 'pb-6'}`}>
      <div className="relative z-10 flex-shrink-0 rounded-full bg-white dark:bg-[#1e293b]">
        {getStepIcon()}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pt-0.5">
        <div className="min-w-0">
          <p className={`text-sm font-medium ${getTextColor()}`}>{step.name}</p>
          {step.message && (
            <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
              {step.message}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">{getStatusBadge()}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Password Modal Component
// ---------------------------------------------------------------------------

function PasswordModal({
  title,
  description,
  isOpen,
  onClose,
  onConfirm,
  loading,
}: {
  title: string;
  description: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  loading: boolean;
}) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Sifre gerekli');
      return;
    }
    onConfirm(password);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>

            <form onSubmit={handleSubmit} className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Admin Sifresi
              </label>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sifrenizi girin"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]"
              />

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1e293b] dark:text-gray-300 dark:hover:bg-[#334155]"
                >
                  Iptal
                </button>
                <button
                  type="submit"
                  disabled={loading || !password.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-50 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#d4a843]/90"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Onayla
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdminUpdatePage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('status');

  // Status tab
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // Update tab
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSteps, setUpdateSteps] = useState<StepResult[]>([]);
  const [updateResult, setUpdateResult] = useState<CompleteResult | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'update' | 'rollback' | null>(null);
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Backups tab
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);

  // History tab
  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/update/status');
      if (res.ok) {
        const json = await res.json();
        const statusData = json?.data ?? json;
        setStatus(statusData);
        if (statusData?.repoUrl && !repoUrl) {
          setRepoUrl(statusData.repoUrl);
        }
        if (statusData?.branch) {
          setBranch(statusData.branch);
        }
      } else {
        toast.error('Durum bilgisi yuklenirken hata olustu');
      }
    } catch {
      toast.error('Durum bilgisi yuklenirken hata olustu');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchBackups = useCallback(async () => {
    setBackupsLoading(true);
    try {
      const res = await fetch('/api/admin/update/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups ?? data.data ?? []);
      } else {
        toast.error('Yedekler yuklenirken hata olustu');
      }
    } catch {
      toast.error('Yedekler yuklenirken hata olustu');
    } finally {
      setBackupsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      const res = await fetch(`/api/admin/update/log?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? data.data ?? []);
        setLogsTotal(data.total ?? 0);
        setLogsPage(data.page ?? page);
      } else {
        toast.error('Guncelleme gecmisi yuklenirken hata olustu');
      }
    } catch {
      toast.error('Guncelleme gecmisi yuklenirken hata olustu');
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Tab change -> fetch data
  useEffect(() => {
    if (activeTab === 'backups') {
      fetchBackups();
    } else if (activeTab === 'history') {
      fetchLogs(1);
    }
  }, [activeTab, fetchBackups, fetchLogs]);

  // -------------------------------------------------------------------------
  // Update check
  // -------------------------------------------------------------------------

  async function handleCheck() {
    if (!repoUrl.trim()) {
      toast.error('Repo URL gerekli');
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/admin/update/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch }),
      });
      if (res.ok) {
        const json = await res.json();
        setCheckResult(json?.data ?? json);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error || 'Guncelleme kontrolu basarisiz');
      }
    } catch {
      toast.error('Guncelleme kontrolu sirasinda hata olustu');
    } finally {
      setChecking(false);
    }
  }

  // -------------------------------------------------------------------------
  // Update execution (SSE)
  // -------------------------------------------------------------------------

  async function executeUpdate(password: string) {
    setIsUpdating(true);
    setUpdateSteps(INITIAL_STEPS);
    setUpdateResult(null);
    setPasswordLoading(false);
    setShowPasswordModal(false);

    try {
      const res = await fetch('/api/admin/update/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, password }),
      });

      // Check if response is JSON error or SSE stream
      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        toast.error(data.error || 'Guncelleme baslatilamadi');
        setIsUpdating(false);
        return;
      }

      // Read SSE stream
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'step') {
                setUpdateSteps((prev) => {
                  const next = [...prev];
                  next[data.index] = data.step;
                  return next;
                });
              } else if (currentEvent === 'complete') {
                setUpdateResult(data);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error('Guncelleme sirasinda baglanti hatasi olustu');
    } finally {
      setIsUpdating(false);
    }
  }

  // -------------------------------------------------------------------------
  // Rollback execution (SSE)
  // -------------------------------------------------------------------------

  async function executeRollback(password: string) {
    if (!selectedBackupId) return;

    setIsUpdating(true);
    setUpdateSteps(ROLLBACK_STEPS);
    setUpdateResult(null);
    setPasswordLoading(false);
    setShowPasswordModal(false);

    try {
      const res = await fetch('/api/admin/update/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: selectedBackupId, password }),
      });

      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        toast.error(data.error || 'Geri yukleme baslatilamadi');
        setIsUpdating(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7);
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === 'step') {
                setUpdateSteps((prev) => {
                  const next = [...prev];
                  next[data.index] = data.step;
                  return next;
                });
              } else if (currentEvent === 'complete') {
                setUpdateResult(data);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      toast.error('Geri yukleme sirasinda baglanti hatasi olustu');
    } finally {
      setIsUpdating(false);
    }
  }

  // -------------------------------------------------------------------------
  // Password modal handler
  // -------------------------------------------------------------------------

  function handlePasswordConfirm(password: string) {
    setPasswordLoading(true);
    if (pendingAction === 'update') {
      executeUpdate(password);
    } else if (pendingAction === 'rollback') {
      executeRollback(password);
    }
  }

  function openUpdateConfirmation() {
    setPendingAction('update');
    setShowPasswordModal(true);
  }

  function openRollbackConfirmation(backupId: string) {
    setSelectedBackupId(backupId);
    setPendingAction('rollback');
    setShowPasswordModal(true);
  }

  // -------------------------------------------------------------------------
  // History log pagination
  // -------------------------------------------------------------------------

  const logsTotalPages = Math.ceil(logsTotal / 10);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yonetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Guncelleme</span>
        </p>
        <div className="mt-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sistem Guncellemesi
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sistemi guncelleyin, yedekleri yonetin ve gecmis guncellemeleri inceleyin
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#e2e8f0] dark:border-[#334155]">
        <div className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-[#d4a843] text-[#1a365d] dark:text-[#d4a843]'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'status' && (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <StatusTab status={status} loading={loading} />
          </motion.div>
        )}

        {activeTab === 'update' && (
          <motion.div
            key="update"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <UpdateTab
              repoUrl={repoUrl}
              setRepoUrl={setRepoUrl}
              branch={branch}
              setBranch={setBranch}
              checking={checking}
              onCheck={handleCheck}
              checkResult={checkResult}
              isUpdating={isUpdating}
              updateSteps={updateSteps}
              updateResult={updateResult}
              onStartUpdate={openUpdateConfirmation}
              statusData={status}
            />
          </motion.div>
        )}

        {activeTab === 'backups' && (
          <motion.div
            key="backups"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <BackupsTab
              backups={backups}
              loading={backupsLoading}
              isUpdating={isUpdating}
              updateSteps={updateSteps}
              updateResult={updateResult}
              onRollback={openRollbackConfirmation}
            />
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <HistoryTab
              logs={logs}
              loading={logsLoading}
              page={logsPage}
              totalPages={logsTotalPages}
              onPageChange={(p) => fetchLogs(p)}
              expandedId={expandedLogId}
              onToggleExpand={(id) =>
                setExpandedLogId(expandedLogId === id ? null : id)
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Confirmation Modal */}
      <PasswordModal
        title={
          pendingAction === 'update' ? 'Guncelleme Onayi' : 'Geri Yukleme Onayi'
        }
        description={
          pendingAction === 'update'
            ? 'Guncellemeyi baslatmak icin admin sifrenizi girin.'
            : 'Geri yuklemeyi baslatmak icin admin sifrenizi girin.'
        }
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordLoading(false);
        }}
        onConfirm={handlePasswordConfirm}
        loading={passwordLoading}
      />
    </div>
  );
}

// ===========================================================================
// Tab: Durum (Status)
// ===========================================================================

function StatusTab({
  status,
  loading,
}: {
  status: StatusData | null;
  loading: boolean;
}) {
  if (loading || !status) {
    return <StatusSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Update in progress warning */}
      {status?.isUpdateInProgress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Bir guncelleme islemi devam ediyor...
          </p>
        </motion.div>
      )}

      {/* Info cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a365d]/10 dark:bg-[#1a365d]/30">
              <Server className="h-5 w-5 text-[#1a365d] dark:text-[#d4a843]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Versiyon
              </p>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                {status?.version ?? '1.0.0'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/20">
              <GitCommit className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Commit
              </p>
              <p className="mt-0.5 font-mono text-lg font-bold text-gray-900 dark:text-white">
                {status?.commitHash?.slice(0, 8) ?? 'Bilinmiyor'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
              <GitBranch className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Branch
              </p>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                {status?.branch ?? 'main'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/20">
              <Clock className="h-5 w-5 text-amber-600 dark:text-[#d4a843]" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Sunucu Suresi
              </p>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">
                {formatUptime(status?.uptime ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Son Guncelleme */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <RefreshCw className="h-4 w-4 text-gray-400" />
          Son Guncelleme
        </h3>
        <div className="mt-3">
          {status?.lastUpdate ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Versiyon {status.lastUpdate?.version ?? '-'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDateTime(status.lastUpdate?.completedAt)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-gray-400" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Henuz guncelleme yapilmamis
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sistem Gereksinimleri */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <Shield className="h-4 w-4 text-gray-400" />
          Sistem Gereksinimleri
        </h3>
        <div className="mt-4 space-y-3">
          <RequirementRow label="git" available={status?.hasGit ?? false} />
          <RequirementRow label="pm2" available={status?.hasPm2 ?? false} />
          <RequirementRow label="pg_dump" available={status?.hasPgDump ?? false} />
          <div className="flex items-center gap-3">
            {status?.isGitRepo ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Git Deposu
            </span>
            <span
              className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                status?.isGitRepo
                  ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
              }`}
            >
              {status?.isGitRepo ? 'Evet' : 'Hayir'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequirementRow({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      {available ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
      )}
      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span
        className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          available
            ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
            : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
        }`}
      >
        {available ? 'Yuklu' : 'Bulunamadi'}
      </span>
    </div>
  );
}

// ===========================================================================
// Tab: Guncelle (Update)
// ===========================================================================

function UpdateTab({
  repoUrl,
  setRepoUrl,
  branch,
  setBranch,
  checking,
  onCheck,
  checkResult,
  isUpdating,
  updateSteps,
  updateResult,
  onStartUpdate,
  statusData,
}: {
  repoUrl: string;
  setRepoUrl: (v: string) => void;
  branch: string;
  setBranch: (v: string) => void;
  checking: boolean;
  onCheck: () => void;
  checkResult: CheckResult | null;
  isUpdating: boolean;
  updateSteps: StepResult[];
  updateResult: CompleteResult | null;
  onStartUpdate: () => void;
  statusData: StatusData | null;
}) {
  return (
    <div className="space-y-6">
      {/* Update in progress warning */}
      {statusData?.isUpdateInProgress && !isUpdating && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Bir guncelleme islemi devam ediyor. Yeni guncelleme baslatamazsiniz.
          </p>
        </div>
      )}

      {/* Config form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Guncelleme Ayarlari
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              GitHub Repo URL
            </label>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              disabled={isUpdating}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] disabled:opacity-50 dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              disabled={isUpdating}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] disabled:opacity-50 dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={onCheck}
              disabled={checking || isUpdating || !repoUrl.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-50 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#d4a843]/90"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Guncellemeleri Kontrol Et
            </button>
          </div>
        </div>
      </div>

      {/* Check results */}
      {checkResult && !isUpdating && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-gray-200 bg-white p-6 dark:border-[#334155] dark:bg-[#1e293b]"
        >
          {(checkResult?.ahead ?? 0) === 0 ? (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Sistem guncel, guncelleme mevcut degil
                </p>
                <span className="mt-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                  Guncel
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {checkResult?.ahead ?? 0} yeni guncelleme mevcut
                    </p>
                    <span className="mt-1 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                      Guncelleme Mevcut
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onStartUpdate}
                  disabled={statusData?.isUpdateInProgress}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a365d]/90 disabled:opacity-50 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#d4a843]/90"
                >
                  <ArrowUpCircle className="h-4 w-4" />
                  Guncelle
                </button>
              </div>

              {/* Commit list */}
              {(checkResult?.commits?.length ?? 0) > 0 && (
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    Degisiklikler
                  </h4>
                  <div className="space-y-2">
                    {checkResult?.commits?.map((commit, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-[#334155]/50 dark:bg-[#0f172a]/50"
                      >
                        <GitCommit className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-[#334155] dark:text-gray-300">
                              {commit?.hash?.slice(0, 8) ?? '-'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {commit.author}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                            {commit.message}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                            {formatDateTime(commit.date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Update progress */}
      {isUpdating && (
        <StepProgress steps={updateSteps} result={updateResult} />
      )}

      {/* Post-update result (when not actively updating) */}
      {!isUpdating && updateResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StepProgress steps={updateSteps} result={updateResult} />
        </motion.div>
      )}
    </div>
  );
}

// ===========================================================================
// Tab: Yedekler (Backups)
// ===========================================================================

function BackupsTab({
  backups,
  loading,
  isUpdating,
  updateSteps,
  updateResult,
  onRollback,
}: {
  backups: BackupEntry[];
  loading: boolean;
  isUpdating: boolean;
  updateSteps: StepResult[];
  updateResult: CompleteResult | null;
  onRollback: (backupId: string) => void;
}) {
  // If rollback is in progress, show progress panel
  if (isUpdating) {
    return (
      <div className="space-y-6">
        <StepProgress steps={updateSteps} result={updateResult} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Post-rollback result */}
      {!isUpdating && updateResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <StepProgress steps={updateSteps} result={updateResult} />
        </motion.div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <TableSkeleton />
        ) : backups.length === 0 ? (
          <div className="py-20 text-center">
            <Archive className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Henuz yedek olusturulmamis
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Versiyon
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                    Commit
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                    Boyut
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Aksiyon
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {backups.map((backup) => (
                  <tr
                    key={backup.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {formatDateTime(backup.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {backup.version}
                    </td>
                    <td className="hidden whitespace-nowrap px-6 py-4 sm:table-cell">
                      <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-[#334155] dark:text-gray-300">
                        {backup?.commitHash?.slice(0, 8) ?? '-'}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
                      {formatBytes(backup?.sizeBytes ?? 0)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {backup.exists ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                          Mevcut
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                          Silinmis
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        type="button"
                        disabled={!backup.exists || isUpdating}
                        onClick={() => onRollback(backup.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:bg-[#1e293b] dark:text-gray-300 dark:hover:bg-[#334155]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Geri Yukle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// Tab: Gecmis (History)
// ===========================================================================

function HistoryTab({
  logs,
  loading,
  page,
  totalPages,
  onPageChange,
  expandedId,
  onToggleExpand,
}: {
  logs: UpdateLogEntry[];
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  const statusBadge = (status: UpdateLogEntry['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
            Basarili
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
            Basarisiz
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            Devam Ediyor
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <TableSkeleton />
        ) : logs.length === 0 ? (
          <div className="py-20 text-center">
            <History className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Henuz guncelleme kaydi yok
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tarih
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Versiyon
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                    Commit
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Durum
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                    Sure
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">
                    Tetikleyen
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Detay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {logs.map((log) => (
                  <HistoryRow
                    key={log.id}
                    log={log}
                    isExpanded={expandedId === log.id}
                    onToggle={() => onToggleExpand(log.id)}
                    statusBadge={statusBadge}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Onceki
          </button>
          <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  log,
  isExpanded,
  onToggle,
  statusBadge,
}: {
  log: UpdateLogEntry;
  isExpanded: boolean;
  onToggle: () => void;
  statusBadge: (status: UpdateLogEntry['status']) => React.ReactNode;
}) {
  return (
    <>
      <tr className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
          {formatDateTime(log.startedAt)}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
          {log.version}
        </td>
        <td className="hidden whitespace-nowrap px-6 py-4 sm:table-cell">
          <span className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:bg-[#334155] dark:text-gray-300">
            {log?.commitHash?.slice(0, 8) ?? '-'}
          </span>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          {statusBadge(log.status)}
        </td>
        <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 md:table-cell">
          {log.duration != null ? formatDuration(log.duration) : '-'}
        </td>
        <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-gray-600 dark:text-gray-400 lg:table-cell">
          {log.triggeredBy ?? '-'}
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
          >
            <Eye className="h-3.5 w-3.5" />
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded step details */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={7} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#e2e8f0] bg-gray-50/50 px-6 py-5 dark:border-[#334155] dark:bg-white/[0.02]">
                  {log.error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">
                        Hata: {log.error}
                      </p>
                    </div>
                  )}

                  {log?.steps && (log.steps?.length ?? 0) > 0 ? (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                        Adimlar
                      </h4>
                      <div className="relative">
                        <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-[#334155]" />
                        <div className="space-y-0">
                          {log.steps?.map((step, idx) => (
                            <MiniStepItem
                              key={idx}
                              step={step}
                              isLast={idx === (log.steps?.length ?? 0) - 1}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Adim detayi bulunamadi
                    </p>
                  )}

                  {/* Additional info */}
                  <div className="mt-4 flex flex-wrap gap-4 border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Branch:</span> {log.branch}
                    </div>
                    {log.prevHash && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Onceki Commit:</span>{' '}
                        <span className="font-mono">{log.prevHash?.slice(0, 8) ?? '-'}</span>
                      </div>
                    )}
                    {log.completedAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-medium">Tamamlanma:</span>{' '}
                        {formatDateTime(log.completedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function MiniStepItem({
  step,
  isLast,
}: {
  step: StepResult;
  isLast: boolean;
}) {
  function getIcon() {
    switch (step.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case 'skipped':
        return (
          <div className="flex h-5 w-5 items-center justify-center">
            <Circle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" strokeDasharray="4 2" />
          </div>
        );
      default:
        return (
          <div className="flex h-5 w-5 items-center justify-center">
            <Circle className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
          </div>
        );
    }
  }

  function getColor() {
    switch (step.status) {
      case 'success':
        return 'text-green-700 dark:text-green-400';
      case 'failed':
        return 'text-red-700 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }

  return (
    <div className={`relative flex items-center gap-3 ${isLast ? '' : 'pb-3'}`}>
      <div className="relative z-10 flex-shrink-0 rounded-full bg-gray-50 dark:bg-white/[0.02]">
        {getIcon()}
      </div>
      <span className={`text-sm ${getColor()}`}>{step.name}</span>
      {step.message && (
        <span className="truncate text-xs text-gray-400 dark:text-gray-500">
          - {step.message}
        </span>
      )}
    </div>
  );
}
