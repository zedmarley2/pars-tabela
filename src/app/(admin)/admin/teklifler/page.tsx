'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  LayoutGrid,
  List,
  Filter,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  ArrowRight,
  XCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type QuoteStatus =
  | 'NEW'
  | 'QUOTE_PREPARED'
  | 'QUOTE_SENT'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

interface Quote {
  id: string;
  referenceNumber: string;
  status: QuoteStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerCompany: string | null;
  productType: string | null;
  description: string | null;
  total: string | null;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'createdAt' | 'total';
type SortDir = 'asc' | 'desc';
type ViewMode = 'kanban' | 'list';

// ─── Status config ───────────────────────────────────────────────────────────

const STATUSES: QuoteStatus[] = [
  'NEW',
  'QUOTE_PREPARED',
  'QUOTE_SENT',
  'APPROVED',
  'IN_PRODUCTION',
  'READY_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

const PIPELINE_STATUSES: QuoteStatus[] = STATUSES.filter((s) => s !== 'CANCELLED');

const STATUS_LABELS: Record<QuoteStatus, string> = {
  NEW: 'Yeni Talep',
  QUOTE_PREPARED: 'Teklif Hazirlandi',
  QUOTE_SENT: 'Teklif Gonderildi',
  APPROVED: 'Onaylandi',
  IN_PRODUCTION: 'Uretimde',
  READY_FOR_DELIVERY: 'Teslime Hazir',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'Iptal Edildi',
};

const STATUS_COLORS: Record<QuoteStatus, { badge: string; bg: string; dot: string; border: string }> = {
  NEW: {
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-500/5',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-500/30',
  },
  QUOTE_PREPARED: {
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
    bg: 'bg-indigo-50/50 dark:bg-indigo-500/5',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200 dark:border-indigo-500/30',
  },
  QUOTE_SENT: {
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    bg: 'bg-purple-50/50 dark:bg-purple-500/5',
    dot: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-500/30',
  },
  APPROVED: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    bg: 'bg-emerald-50/50 dark:bg-emerald-500/5',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-500/30',
  },
  IN_PRODUCTION: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-500/5',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-500/30',
  },
  READY_FOR_DELIVERY: {
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
    bg: 'bg-cyan-50/50 dark:bg-cyan-500/5',
    dot: 'bg-cyan-500',
    border: 'border-cyan-200 dark:border-cyan-500/30',
  },
  DELIVERED: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
    bg: 'bg-green-50/50 dark:bg-green-500/5',
    dot: 'bg-green-500',
    border: 'border-green-200 dark:border-green-500/30',
  },
  CANCELLED: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    bg: 'bg-red-50/50 dark:bg-red-500/5',
    dot: 'bg-red-500',
    border: 'border-red-200 dark:border-red-500/30',
  },
};

// Quick action transitions: from current status -> { label, targetStatus }
const QUICK_ACTIONS: Record<QuoteStatus, { label: string; target: QuoteStatus }[]> = {
  NEW: [{ label: 'Teklif Hazirla', target: 'QUOTE_PREPARED' }],
  QUOTE_PREPARED: [{ label: 'Teklifi Gonder', target: 'QUOTE_SENT' }],
  QUOTE_SENT: [
    { label: 'Onaylandi', target: 'APPROVED' },
    { label: 'Reddedildi', target: 'CANCELLED' },
  ],
  APPROVED: [{ label: 'Uretime Basla', target: 'IN_PRODUCTION' }],
  IN_PRODUCTION: [{ label: 'Uretim Tamamlandi', target: 'READY_FOR_DELIVERY' }],
  READY_FOR_DELIVERY: [{ label: 'Teslim Edildi', target: 'DELIVERED' }],
  DELIVERED: [],
  CANCELLED: [],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value: string | null): string {
  if (!value) return 'Teklif bekleniyor';
  const num = parseFloat(value);
  if (isNaN(num)) return 'Teklif bekleniyor';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
  }).format(num);
}

function daysInStatus(updatedAt: string): number {
  const updated = new Date(updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function daysLabel(days: number): string {
  if (days === 0) return 'Bugun';
  if (days === 1) return '1 gun';
  return `${days} gun`;
}

// ─── Loading Skeletons ──────────────────────────────────────────────────────

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="w-72 flex-shrink-0 rounded-xl border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b]"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-6 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, cardIdx) => (
              <div
                key={cardIdx}
                className="rounded-lg border border-[#e2e8f0] p-3 dark:border-[#334155]"
              >
                <div className="mb-2 h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mb-2 h-3 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:block" />
          <div className="h-5 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 lg:block" />
          <div className="hidden h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:block" />
          <div className="h-8 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}

// ─── Cancel Confirmation Modal ──────────────────────────────────────────────

interface CancelModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

function CancelModal({ open, onClose, onConfirm, loading }: CancelModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              Teklifi Iptal Et
            </h3>
            <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              Bu teklifi iptal etmek istediginize emin misiniz?
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Iptal Nedeni
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Iptal nedenini yazin..."
                className="w-full resize-none rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
              />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
              >
                Vazgec
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(reason)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
              >
                {loading && (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Iptal Et
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Kanban Card ────────────────────────────────────────────────────────────

interface KanbanCardProps {
  quote: Quote;
  onStatusChange: (id: string, status: QuoteStatus) => void;
  onCancelClick: (id: string) => void;
}

function KanbanCard({ quote, onStatusChange, onCancelClick }: KanbanCardProps) {
  const router = useRouter();
  const days = daysInStatus(quote.updatedAt);
  const actions = QUICK_ACTIONS[quote.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="cursor-pointer rounded-lg border border-[#e2e8f0] bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-[#334155] dark:bg-[#1e293b]"
      onClick={() => router.push(`/admin/teklifler/${quote.id}`)}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold text-[#1a365d] dark:text-[#d4a843]">
          {quote.referenceNumber}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="h-3 w-3" />
          {daysLabel(days)}
        </span>
      </div>

      <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
        {quote.customerName}
      </p>

      {quote.productType && (
        <span className="mb-2 inline-flex items-center rounded-full bg-[#1a365d]/10 px-2 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
          {quote.productType}
        </span>
      )}

      <p className="mt-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
        {formatCurrency(quote.total)}
      </p>

      {/* Quick actions */}
      {(actions.length > 0 || quote.status !== 'CANCELLED') && (
        <div className="mt-3 flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
          {actions.map((action) => (
            <button
              key={action.target}
              type="button"
              onClick={() => onStatusChange(quote.id, action.target)}
              className="rounded-md bg-[#1a365d]/10 px-2 py-1 text-xs font-medium text-[#1a365d] transition-colors hover:bg-[#1a365d]/20 dark:bg-[#d4a843]/10 dark:text-[#d4a843] dark:hover:bg-[#d4a843]/20"
            >
              {action.label}
            </button>
          ))}
          {quote.status !== 'CANCELLED' && quote.status !== 'DELIVERED' && (
            <button
              type="button"
              onClick={() => onCancelClick(quote.id)}
              className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Iptal Et
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Kanban Column ──────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: QuoteStatus;
  quotes: Quote[];
  onStatusChange: (id: string, status: QuoteStatus) => void;
  onCancelClick: (id: string) => void;
}

function KanbanColumn({ status, quotes, onStatusChange, onCancelClick }: KanbanColumnProps) {
  const colors = STATUS_COLORS[status];

  return (
    <div className={`flex w-72 flex-shrink-0 flex-col rounded-xl border ${colors.border} ${colors.bg}`}>
      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-[#e2e8f0] px-4 py-3 dark:border-[#334155]">
        <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {STATUS_LABELS[status]}
        </h3>
        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200/80 px-1.5 text-xs font-bold text-gray-700 dark:bg-white/10 dark:text-gray-300">
          {quotes.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ maxHeight: '60vh' }}>
        <LayoutGroup>
          <AnimatePresence mode="popLayout">
            {quotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Inbox className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Bu durumda teklif yok
                </p>
              </div>
            ) : (
              quotes.map((quote) => (
                <KanbanCard
                  key={quote.id}
                  quote={quote}
                  onStatusChange={onStatusChange}
                  onCancelClick={onCancelClick}
                />
              ))
            )}
          </AnimatePresence>
        </LayoutGroup>
      </div>
    </div>
  );
}

// ─── Quick Status Dropdown (for list view) ──────────────────────────────────

interface QuickStatusDropdownProps {
  quote: Quote;
  onStatusChange: (id: string, status: QuoteStatus) => void;
  onCancelClick: (id: string) => void;
}

function QuickStatusDropdown({ quote, onStatusChange, onCancelClick }: QuickStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actions = QUICK_ACTIONS[quote.status];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const hasActions =
    actions.length > 0 || (quote.status !== 'CANCELLED' && quote.status !== 'DELIVERED');

  if (!hasActions) {
    return <span className="text-xs text-gray-400 dark:text-gray-500">-</span>;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
      >
        Islem
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg dark:border-[#334155] dark:bg-[#1e293b]">
          {actions.map((action) => (
            <button
              key={action.target}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(quote.id, action.target);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <ArrowRight className="h-3.5 w-3.5 text-gray-400" />
              {action.label}
            </button>
          ))}
          {quote.status !== 'CANCELLED' && quote.status !== 'DELIVERED' && (
            <>
              <div className="my-1 border-t border-[#e2e8f0] dark:border-[#334155]" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCancelClick(quote.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <XCircle className="h-3.5 w-3.5" />
                Iptal Et
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Summary ───────────────────────────────────────────────────────

interface PipelineSummaryProps {
  counts: Record<QuoteStatus, number>;
}

function PipelineSummary({ counts }: PipelineSummaryProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {STATUSES.map((status) => {
        const colors = STATUS_COLORS[status];
        const count = counts[status] || 0;
        return (
          <div
            key={status}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${colors.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
            {STATUS_LABELS[status]}
            <span className="font-bold">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function AdminQuotesPage() {
  const router = useRouter();

  // Data state
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // List view state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Cancel modal
  const [cancelQuoteId, setCancelQuoteId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const totalPages = Math.ceil(total / limit);

  // Detect mobile for initial view
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setViewMode(mq.matches ? 'kanban' : 'list');
  }, []);

  // ─── Data fetching ──────────────────────────────────────────────────

  const fetchQuotes = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        // For kanban, fetch all (use high limit)
        if (viewMode === 'kanban') {
          params.set('page', '1');
          params.set('limit', '500');
        } else {
          params.set('page', String(p));
          params.set('limit', String(limit));
        }
        if (search) params.set('search', search);
        if (statusFilter) params.set('status', statusFilter);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);

        const res = await fetch(`/api/admin/quotes?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setQuotes(data.data ?? []);
          setTotal(data.total ?? 0);
          if (viewMode === 'list') {
            setPage(data.page ?? p);
          }
        } else {
          toast.error('Teklifler yuklenirken hata olustu');
        }
      } catch {
        toast.error('Teklifler yuklenirken hata olustu');
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, dateFrom, dateTo, limit, viewMode]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotes(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  // ─── Status change handler ─────────────────────────────────────────

  async function handleStatusChange(id: string, newStatus: QuoteStatus) {
    try {
      const res = await fetch(`/api/admin/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === id ? { ...q, status: newStatus, updatedAt: new Date().toISOString() } : q
          )
        );
        toast.success(`Durum "${STATUS_LABELS[newStatus]}" olarak guncellendi`);
      } else {
        toast.error('Durum guncellenirken hata olustu');
      }
    } catch {
      toast.error('Durum guncellenirken hata olustu');
    }
  }

  async function handleCancel(reason: string) {
    if (!cancelQuoteId) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/quotes/${cancelQuoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', cancelReason: reason }),
      });
      if (res.ok) {
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === cancelQuoteId
              ? { ...q, status: 'CANCELLED' as QuoteStatus, updatedAt: new Date().toISOString() }
              : q
          )
        );
        toast.success('Teklif iptal edildi');
        setCancelQuoteId(null);
      } else {
        toast.error('Iptal isleminde hata olustu');
      }
    } catch {
      toast.error('Iptal isleminde hata olustu');
    } finally {
      setCancelling(false);
    }
  }

  // ─── Sort helpers ─────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  }

  function getSortIcon(field: SortField) {
    if (sortField !== field)
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    return sortDir === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#1a365d] dark:text-[#d4a843]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#1a365d] dark:text-[#d4a843]" />
    );
  }

  // ─── Sort quotes locally for list view ─────────────────────────────

  const sortedQuotes = [...quotes].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'createdAt') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'total') {
      const aVal = a.total ? parseFloat(a.total) : -1;
      const bVal = b.total ? parseFloat(b.total) : -1;
      cmp = aVal - bVal;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // ─── Group quotes by status for kanban ─────────────────────────────

  const quotesByStatus: Record<QuoteStatus, Quote[]> = {
    NEW: [],
    QUOTE_PREPARED: [],
    QUOTE_SENT: [],
    APPROVED: [],
    IN_PRODUCTION: [],
    READY_FOR_DELIVERY: [],
    DELIVERED: [],
    CANCELLED: [],
  };

  for (const q of quotes) {
    quotesByStatus[q.status].push(q);
  }

  // Pipeline counts from all quotes
  const statusCounts: Record<QuoteStatus, number> = {
    NEW: 0,
    QUOTE_PREPARED: 0,
    QUOTE_SENT: 0,
    APPROVED: 0,
    IN_PRODUCTION: 0,
    READY_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const q of quotes) {
    statusCounts[q.status]++;
  }

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yonetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Teklifler & Siparisler</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Teklifler & Siparisler
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Teklif ve siparis sureclerini yonetin
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-[#e2e8f0] bg-white dark:border-[#334155] dark:bg-[#1e293b]">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`inline-flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-[#1a365d] text-white dark:bg-[#d4a843]/20 dark:text-[#d4a843]'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1a365d] text-white dark:bg-[#d4a843]/20 dark:text-[#d4a843]'
                    : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-white/5'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Liste</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline summary */}
      {!loading && <PipelineSummary counts={statusCounts} />}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Referans no, musteri adi veya e-posta ile ara..."
              className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
            />
          </div>

          {/* Status filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as QuoteStatus | '')}
              className="appearance-none rounded-lg border border-[#e2e8f0] bg-white py-2.5 pl-3 pr-8 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
            >
              <option value="">Tum Durumlar</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Toggle advanced filters */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
              showFilters || dateFrom || dateTo
                ? 'border-[#1a365d] bg-[#1a365d]/5 text-[#1a365d] dark:border-[#d4a843] dark:bg-[#d4a843]/10 dark:text-[#d4a843]'
                : 'border-[#e2e8f0] text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filtreler</span>
          </button>
        </div>

        {/* Date range filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-3 rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b] sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Baslangic Tarihi
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
                    Bitis Tarihi
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                    />
                  </div>
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-400 dark:hover:bg-white/5"
                  >
                    <X className="h-3.5 w-3.5" />
                    Temizle
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Kanban View ─────────────────────────────────────────────── */}
      {viewMode === 'kanban' && (
        <>
          {loading ? (
            <KanbanSkeleton />
          ) : quotes.length === 0 && !statusFilter && !search ? (
            <div className="rounded-xl border border-[#e2e8f0] bg-white py-20 text-center shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                Henuz teklif bulunmuyor
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Main pipeline columns */}
              <div className="flex gap-4 overflow-x-auto pb-4">
                {PIPELINE_STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    quotes={quotesByStatus[status]}
                    onStatusChange={handleStatusChange}
                    onCancelClick={(id) => setCancelQuoteId(id)}
                  />
                ))}
              </div>

              {/* Cancelled section */}
              {quotesByStatus.CANCELLED.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {STATUS_LABELS.CANCELLED}
                    </h3>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                      {quotesByStatus.CANCELLED.length}
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence>
                      {quotesByStatus.CANCELLED.map((quote) => (
                        <KanbanCard
                          key={quote.id}
                          quote={quote}
                          onStatusChange={handleStatusChange}
                          onCancelClick={(id) => setCancelQuoteId(id)}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── List View ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <>
          <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            {loading ? (
              <ListSkeleton />
            ) : quotes.length === 0 ? (
              <div className="py-20 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                <p className="mt-3 text-gray-500 dark:text-gray-400">
                  Henuz teklif bulunmuyor
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Referans No
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Musteri
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                        Urun Tipi
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Durum
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort('total')}
                          className="inline-flex items-center gap-1"
                        >
                          Toplam
                          {getSortIcon('total')}
                        </button>
                      </th>
                      <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                        <button
                          type="button"
                          onClick={() => handleSort('createdAt')}
                          className="inline-flex items-center gap-1"
                        >
                          Tarih
                          {getSortIcon('createdAt')}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Islemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                    {sortedQuotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                        onClick={() => router.push(`/admin/teklifler/${quote.id}`)}
                      >
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-[#1a365d] dark:text-[#d4a843]">
                            {quote.referenceNumber}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {quote.customerName}
                            </p>
                            {quote.customerCompany && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {quote.customerCompany}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 md:table-cell">
                          {quote.productType ? (
                            <span className="inline-flex items-center rounded-full bg-[#1a365d]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
                              {quote.productType}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[quote.status].badge}`}
                          >
                            {STATUS_LABELS[quote.status]}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 lg:table-cell">
                          <span
                            className={`text-sm font-medium ${
                              quote.total
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {formatCurrency(quote.total)}
                          </span>
                        </td>
                        <td className="hidden px-4 py-4 text-sm text-gray-500 dark:text-gray-400 sm:table-cell">
                          {formatDate(quote.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <QuickStatusDropdown
                            quote={quote}
                            onStatusChange={handleStatusChange}
                            onCancelClick={(id) => setCancelQuoteId(id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 0 && (
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              {/* Items per page */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400">Sayfa basina:</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="rounded-lg border border-[#e2e8f0] bg-white px-2 py-1.5 text-xs text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  Toplam {total} kayit
                </span>
              </div>

              {/* Page navigation */}
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setPage(page - 1);
                      fetchQuotes(page - 1);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Onceki
                  </button>
                  <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage(page + 1);
                      fetchQuotes(page + 1);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    Sonraki
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      <CancelModal
        open={cancelQuoteId !== null}
        onClose={() => setCancelQuoteId(null)}
        onConfirm={handleCancel}
        loading={cancelling}
      />
    </div>
  );
}
