'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  MessageSquare,
  Phone,
  Mail,
  User,
  Package,
  Calendar,
  StickyNote,
  CheckCircle2,
} from 'lucide-react';

type InquiryStatus = 'NEW' | 'IN_REVIEW' | 'REPLIED' | 'CLOSED';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: InquiryStatus;
  productId: string | null;
  productName: string | null;
  notes: string | null;
  createdAt: string;
}

const STATUS_OPTIONS: { value: InquiryStatus | ''; label: string }[] = [
  { value: '', label: 'Tümü' },
  { value: 'NEW', label: 'Yeni' },
  { value: 'IN_REVIEW', label: 'İnceleniyor' },
  { value: 'REPLIED', label: 'Yanıtlandı' },
  { value: 'CLOSED', label: 'Kapatıldı' },
];

const STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'Yeni',
  IN_REVIEW: 'İnceleniyor',
  REPLIED: 'Yanıtlandı',
  CLOSED: 'Kapatıldı',
};

const STATUS_COLORS: Record<InquiryStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  REPLIED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '...';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="hidden h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:block" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:block" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 lg:block" />
        </div>
      ))}
    </div>
  );
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | ''>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const totalPages = Math.ceil(total / limit);

  const fetchInquiries = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInquiries(data.data ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        toast.error('Talepler yüklenirken hata oluştu');
      }
    } catch {
      toast.error('Talepler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInquiries(1);
      setSelectedIds(new Set());
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchInquiries]);

  function handlePageChange(newPage: number) {
    fetchInquiries(newPage);
    setSelectedIds(new Set());
    setExpandedId(null);
  }

  function toggleSelectAll() {
    if (selectedIds.size === inquiries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(inquiries.map((i) => i.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleStatusChange(id: string, status: InquiryStatus) {
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status } : inq))
        );
        toast.success('Durum güncellendi');
      } else {
        toast.error('Durum güncellenirken hata oluştu');
      }
    } catch {
      toast.error('Durum güncellenirken hata oluştu');
    }
  }

  async function handleBulkStatusChange(status: InquiryStatus) {
    setBulkStatusOpen(false);
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    let successCount = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/inquiries/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          successCount++;
        }
      } catch {
        // continue
      }
    }

    if (successCount > 0) {
      setInquiries((prev) =>
        prev.map((inq) =>
          selectedIds.has(inq.id) ? { ...inq, status } : inq
        )
      );
      toast.success(`${successCount} talep güncellendi`);
      setSelectedIds(new Set());
    } else {
      toast.error('Toplu güncelleme başarısız oldu');
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setInquiries((prev) => prev.filter((inq) => inq.id !== id));
        setTotal((prev) => prev - 1);
        toast.success('Talep silindi');
        if (expandedId === id) setExpandedId(null);
      } else {
        toast.error('Talep silinirken hata oluştu');
      }
    } catch {
      toast.error('Talep silinirken hata oluştu');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  async function handleSaveNotes(id: string) {
    setSavingNotes(id);
    try {
      const res = await fetch(`/api/admin/inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesMap[id] ?? '' }),
      });
      if (res.ok) {
        setInquiries((prev) =>
          prev.map((inq) =>
            inq.id === id ? { ...inq, notes: notesMap[id] ?? '' } : inq
          )
        );
        toast.success('Notlar kaydedildi');
      } else {
        toast.error('Notlar kaydedilirken hata oluştu');
      }
    } catch {
      toast.error('Notlar kaydedilirken hata oluştu');
    } finally {
      setSavingNotes(null);
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      const inq = inquiries.find((i) => i.id === id);
      if (inq && !(id in notesMap)) {
        setNotesMap((prev) => ({ ...prev, [id]: inq.notes ?? '' }));
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Talepler & Mesajlar</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Talepler & Mesajlar
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toplam {total} talep
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ad veya e-posta ile ara..."
            className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value as InquiryStatus | '')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? 'border-[#1a365d] bg-[#1a365d] text-white dark:border-[#d4a843] dark:bg-[#d4a843]/20 dark:text-[#d4a843]'
                  : 'border-[#e2e8f0] text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[#1a365d]/20 bg-[#1a365d]/5 px-4 py-3 dark:border-[#d4a843]/20 dark:bg-[#d4a843]/5">
          <span className="text-sm font-medium text-[#1a365d] dark:text-[#d4a843]">
            {selectedIds.size} talep seçildi
          </span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBulkStatusOpen(!bulkStatusOpen)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a365d] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1a365d]/90"
            >
              Durum Değiştir
              <ChevronDown className="h-3 w-3" />
            </button>
            {bulkStatusOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg dark:border-[#334155] dark:bg-[#1e293b]">
                {(['NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED'] as InquiryStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleBulkStatusChange(status)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          status === 'NEW'
                            ? 'bg-blue-500'
                            : status === 'IN_REVIEW'
                              ? 'bg-amber-500'
                              : status === 'REPLIED'
                                ? 'bg-green-500'
                                : 'bg-gray-400'
                        }`}
                      />
                      {STATUS_LABELS[status]}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Seçimi Temizle
          </button>
        </div>
      )}

      {/* Inquiries table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <LoadingSkeleton />
        ) : inquiries.length === 0 ? (
          <div className="py-20 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Henüz talep bulunmuyor
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === inquiries.length && inquiries.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 accent-[#1a365d] dark:accent-[#d4a843]"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Ad
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                    E-posta
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                    Telefon
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">
                    Ürün
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 xl:table-cell">
                    Mesaj
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Durum
                  </th>
                  <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                    Tarih
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {inquiries.map((inq) => (
                  <InquiryRow
                    key={inq.id}
                    inquiry={inq}
                    isSelected={selectedIds.has(inq.id)}
                    isExpanded={expandedId === inq.id}
                    onToggleSelect={() => toggleSelect(inq.id)}
                    onToggleExpand={() => toggleExpand(inq.id)}
                    onStatusChange={(status) => handleStatusChange(inq.id, status)}
                    onDelete={() => setDeleteConfirm(inq.id)}
                    notes={notesMap[inq.id] ?? inq.notes ?? ''}
                    onNotesChange={(val) =>
                      setNotesMap((prev) => ({ ...prev, [inq.id]: val }))
                    }
                    onSaveNotes={() => handleSaveNotes(inq.id)}
                    savingNotes={savingNotes === inq.id}
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
            onClick={() => handlePageChange(page - 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Önceki
          </button>
          <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                Talebi Sil
              </h3>
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Bu talebi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========== Inquiry Row Component ========== */

interface InquiryRowProps {
  inquiry: Inquiry;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelect: () => void;
  onToggleExpand: () => void;
  onStatusChange: (status: InquiryStatus) => void;
  onDelete: () => void;
  notes: string;
  onNotesChange: (val: string) => void;
  onSaveNotes: () => void;
  savingNotes: boolean;
}

function InquiryRow({
  inquiry,
  isSelected,
  isExpanded,
  onToggleSelect,
  onToggleExpand,
  onStatusChange,
  onDelete,
  notes,
  onNotesChange,
  onSaveNotes,
  savingNotes,
}: InquiryRowProps) {
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  return (
    <>
      <tr
        className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
          isExpanded ? 'bg-gray-50/50 dark:bg-white/[0.02]' : ''
        }`}
      >
        <td className="px-4 py-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="h-4 w-4 rounded border-gray-300 accent-[#1a365d] dark:accent-[#d4a843]"
          />
        </td>
        <td className="px-4 py-4">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 text-left text-sm font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
          >
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            )}
            {inquiry.name}
          </button>
        </td>
        <td className="hidden px-4 py-4 text-sm text-gray-600 dark:text-gray-300 sm:table-cell">
          {inquiry.email}
        </td>
        <td className="hidden px-4 py-4 text-sm text-gray-600 dark:text-gray-300 md:table-cell">
          {inquiry.phone ?? '-'}
        </td>
        <td className="hidden px-4 py-4 lg:table-cell">
          {inquiry.productName ? (
            <span className="inline-flex items-center rounded-full bg-[#1a365d]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
              {inquiry.productName}
            </span>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="hidden px-4 py-4 text-sm text-gray-600 dark:text-gray-300 xl:table-cell">
          {truncate(inquiry.message, 50)}
        </td>
        <td className="px-4 py-4">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              STATUS_COLORS[inquiry.status]
            }`}
          >
            {STATUS_LABELS[inquiry.status]}
          </span>
        </td>
        <td className="hidden px-4 py-4 text-sm text-gray-500 dark:text-gray-400 sm:table-cell">
          {formatDate(inquiry.createdAt)}
        </td>
        <td className="px-4 py-4">
          <div className="flex items-center gap-2">
            {/* Status dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {statusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setStatusDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-[#e2e8f0] bg-white py-1 shadow-lg dark:border-[#334155] dark:bg-[#1e293b]">
                    {(['NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED'] as InquiryStatus[]).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => {
                            onStatusChange(status);
                            setStatusDropdownOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
                            inquiry.status === status
                              ? 'font-semibold text-[#1a365d] dark:text-[#d4a843]'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              status === 'NEW'
                                ? 'bg-blue-500'
                                : status === 'IN_REVIEW'
                                  ? 'bg-amber-500'
                                  : status === 'REPLIED'
                                    ? 'bg-green-500'
                                    : 'bg-gray-400'
                            }`}
                          />
                          {STATUS_LABELS[status]}
                        </button>
                      )
                    )}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-[#e2e8f0] px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-[#334155] dark:text-gray-300 dark:hover:border-red-500/30 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded detail panel */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={9} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#e2e8f0] bg-gray-50/50 px-6 py-5 dark:border-[#334155] dark:bg-white/[0.02]">
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Left: Details */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <User className="h-4 w-4 text-gray-400" />
                        Müşteri Bilgileri
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Ad:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {inquiry.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">E-posta:</span>
                          <a
                            href={`mailto:${inquiry.email}`}
                            className="font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
                          >
                            {inquiry.email}
                          </a>
                        </div>
                        {inquiry.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500 dark:text-gray-400">
                              Telefon:
                            </span>
                            <a
                              href={`tel:${inquiry.phone}`}
                              className="font-medium text-gray-900 dark:text-white"
                            >
                              {inquiry.phone}
                            </a>
                          </div>
                        )}
                        {inquiry.productName && (
                          <div className="flex items-center gap-2 text-sm">
                            <Package className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500 dark:text-gray-400">Ürün:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {inquiry.productName}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500 dark:text-gray-400">Tarih:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatDateTime(inquiry.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Full message */}
                      <div>
                        <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          Mesaj
                        </h4>
                        <div className="rounded-lg border border-[#e2e8f0] bg-white p-4 text-sm leading-relaxed text-gray-700 dark:border-[#334155] dark:bg-[#0f172a] dark:text-gray-300">
                          {inquiry.message}
                        </div>
                      </div>

                      {/* Status selector */}
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Durum
                        </label>
                        <select
                          value={inquiry.status}
                          onChange={(e) =>
                            onStatusChange(e.target.value as InquiryStatus)
                          }
                          className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                        >
                          {(['NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED'] as InquiryStatus[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Right: Internal notes */}
                    <div className="space-y-4">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <StickyNote className="h-4 w-4 text-gray-400" />
                        Dahili Notlar
                      </h4>
                      <textarea
                        value={notes}
                        onChange={(e) => onNotesChange(e.target.value)}
                        rows={6}
                        placeholder="Bu talep hakkında dahili notlarınızı ekleyin..."
                        className="w-full resize-none rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                      />
                      <button
                        type="button"
                        disabled={savingNotes}
                        onClick={onSaveNotes}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
                      >
                        {savingNotes ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Notları Kaydet
                      </button>
                    </div>
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
