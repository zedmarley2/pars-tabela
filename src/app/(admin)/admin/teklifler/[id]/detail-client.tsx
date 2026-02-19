'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Package,
  Ruler,
  FileText,
  Edit3,
  Plus,
  Trash2,
  Save,
  X,
  Clock,
  Calendar,
  Hash,
  Printer,
  MessageSquare,
  Send,
  CheckCircle2,
  XCircle,
  Factory,
  Truck,
  CircleDot,
  ImageIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuoteStatus =
  | 'NEW'
  | 'QUOTE_PREPARED'
  | 'QUOTE_SENT'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

interface SerializedQuoteItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  createdAt: string;
}

interface SerializedStatusHistory {
  id: string;
  fromStatus: QuoteStatus | null;
  toStatus: QuoteStatus;
  note: string | null;
  createdAt: string;
}

interface SerializedNote {
  id: string;
  content: string;
  createdAt: string;
}

interface SerializedQuote {
  id: string;
  referenceNumber: string;
  status: QuoteStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  customerCompany: string | null;
  productType: string | null;
  description: string;
  dimensions: string | null;
  referenceImageUrl: string | null;
  estimatedDays: number | null;
  validUntil: string | null;
  subtotal: string | null;
  taxRate: string;
  taxAmount: string | null;
  total: string | null;
  deliveryDate: string | null;
  cancellationReason: string | null;
  customerNotes: string | null;
  productId: string | null;
  createdAt: string;
  updatedAt: string;
  items: SerializedQuoteItem[];
  statusHistory: SerializedStatusHistory[];
  notes: SerializedNote[];
  product: {
    id: string;
    name: string;
    category: { name: string } | null;
    images: { url: string; alt: string | null }[];
  } | null;
}

interface EditableItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface QuoteDetailClientProps {
  quote: SerializedQuote;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<QuoteStatus, string> = {
  NEW: 'Yeni Talep',
  QUOTE_PREPARED: 'Teklif Hazırlandı',
  QUOTE_SENT: 'Teklif Gönderildi',
  APPROVED: 'Onaylandı',
  IN_PRODUCTION: 'Üretimde',
  READY_FOR_DELIVERY: 'Teslime Hazır',
  DELIVERED: 'Teslim Edildi',
  CANCELLED: 'İptal Edildi',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  QUOTE_PREPARED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  QUOTE_SENT: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  IN_PRODUCTION: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  READY_FOR_DELIVERY: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};

const STATUS_DOT_COLORS: Record<QuoteStatus, string> = {
  NEW: 'bg-blue-500',
  QUOTE_PREPARED: 'bg-indigo-500',
  QUOTE_SENT: 'bg-purple-500',
  APPROVED: 'bg-emerald-500',
  IN_PRODUCTION: 'bg-amber-500',
  READY_FOR_DELIVERY: 'bg-cyan-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
};

const TAX_RATE = 18;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteDetailClient({ quote: initialQuote }: QuoteDetailClientProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<SerializedQuote>(initialQuote);
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editableItems, setEditableItems] = useState<EditableItem[]>([]);
  const [savingItems, setSavingItems] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [editingValidUntil, setEditingValidUntil] = useState(false);
  const [validUntilValue, setValidUntilValue] = useState(
    quote.validUntil ? quote.validUntil.split('T')[0] : ''
  );
  const [editingEstimatedDays, setEditingEstimatedDays] = useState(false);
  const [estimatedDaysValue, setEstimatedDaysValue] = useState(
    quote.estimatedDays?.toString() ?? ''
  );

  // -- Item editing --

  function startEditItems() {
    setEditableItems(
      quote.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: parseFloat(item.unitPrice),
      }))
    );
    setIsEditingItems(true);
  }

  function cancelEditItems() {
    setIsEditingItems(false);
    setEditableItems([]);
  }

  function addItem() {
    setEditableItems((prev) => [
      ...prev,
      { id: generateTempId(), name: '', quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(id: string) {
    setEditableItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, field: keyof EditableItem, value: string | number) {
    setEditableItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function getEditableSubtotal(): number {
    return editableItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }

  const saveItems = useCallback(async () => {
    if (editableItems.some((item) => !item.name.trim())) {
      toast.error('Tüm kalemlerin adı girilmelidir');
      return;
    }

    setSavingItems(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: editableItems.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Kalemler kaydedilemedi');
        return;
      }

      const { data } = await res.json();
      setQuote((prev) => ({
        ...prev,
        items: data.items.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          name: item.name as string,
          quantity: item.quantity as number,
          unitPrice: String(item.unitPrice),
          subtotal: String(item.subtotal),
          createdAt: item.createdAt as string,
        })),
        subtotal: data.subtotal ? String(data.subtotal) : null,
        taxRate: String(data.taxRate),
        taxAmount: data.taxAmount ? String(data.taxAmount) : null,
        total: data.total ? String(data.total) : null,
      }));
      setIsEditingItems(false);
      toast.success('Kalemler kaydedildi');
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setSavingItems(false);
    }
  }, [editableItems, quote.id]);

  // -- Status change --

  async function handleStatusChange(newStatus: QuoteStatus) {
    setUpdatingStatus(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'DELIVERED') {
        body.deliveryDate = new Date().toISOString();
      }

      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Durum güncellenemedi');
        return;
      }

      toast.success(`Durum "${STATUS_LABELS[newStatus]}" olarak güncellendi`);
      router.refresh();

      // Optimistic update
      setQuote((prev) => ({
        ...prev,
        status: newStatus,
        statusHistory: [
          {
            id: generateTempId(),
            fromStatus: prev.status,
            toStatus: newStatus,
            note: null,
            createdAt: new Date().toISOString(),
          },
          ...prev.statusHistory,
        ],
      }));
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleCancel() {
    if (!cancelReason.trim()) {
      toast.error('İptal nedeni girilmelidir');
      return;
    }

    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
          cancellationReason: cancelReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'İptal işlemi başarısız');
        return;
      }

      toast.success('Teklif iptal edildi');
      setShowCancelModal(false);
      setCancelReason('');
      router.refresh();

      setQuote((prev) => ({
        ...prev,
        status: 'CANCELLED',
        cancellationReason: cancelReason,
        statusHistory: [
          {
            id: generateTempId(),
            fromStatus: prev.status,
            toStatus: 'CANCELLED',
            note: null,
            createdAt: new Date().toISOString(),
          },
          ...prev.statusHistory,
        ],
      }));
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setCancelling(false);
    }
  }

  // -- Notes --

  async function handleAddNote() {
    if (!newNote.trim()) {
      toast.error('Not içeriği girilmelidir');
      return;
    }

    setAddingNote(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? 'Not eklenemedi');
        return;
      }

      const { data } = await res.json();
      setQuote((prev) => ({
        ...prev,
        notes: [
          {
            id: data.id,
            content: data.content,
            createdAt: data.createdAt,
          },
          ...prev.notes,
        ],
      }));
      setNewNote('');
      toast.success('Not eklendi');
    } catch {
      toast.error('Bir hata oluştu');
    } finally {
      setAddingNote(false);
    }
  }

  // -- Field updates --

  async function saveValidUntil() {
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          validUntil: validUntilValue ? new Date(validUntilValue).toISOString() : null,
        }),
      });

      if (!res.ok) {
        toast.error('Geçerlilik süresi güncellenemedi');
        return;
      }

      setQuote((prev) => ({
        ...prev,
        validUntil: validUntilValue ? new Date(validUntilValue).toISOString() : null,
      }));
      setEditingValidUntil(false);
      toast.success('Geçerlilik süresi güncellendi');
    } catch {
      toast.error('Bir hata oluştu');
    }
  }

  async function saveEstimatedDays() {
    const days = parseInt(estimatedDaysValue, 10);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estimatedDays: isNaN(days) ? null : days,
        }),
      });

      if (!res.ok) {
        toast.error('Tahmini teslimat güncellenemedi');
        return;
      }

      setQuote((prev) => ({
        ...prev,
        estimatedDays: isNaN(days) ? null : days,
      }));
      setEditingEstimatedDays(false);
      toast.success('Tahmini teslimat güncellendi');
    } catch {
      toast.error('Bir hata oluştu');
    }
  }

  // -- Status action buttons --

  function renderStatusActions() {
    const s = quote.status;
    const disabled = updatingStatus;
    const btnBase =
      'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50';

    const actions: React.ReactNode[] = [];

    if (s === 'NEW') {
      actions.push(
        <button
          key="prepare"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('QUOTE_PREPARED')}
          className={`${btnBase} bg-indigo-600 text-white hover:bg-indigo-700`}
        >
          <FileText className="h-4 w-4" />
          Teklif Hazırla
        </button>
      );
    }

    if (s === 'QUOTE_PREPARED') {
      actions.push(
        <button
          key="send"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('QUOTE_SENT')}
          className={`${btnBase} bg-purple-600 text-white hover:bg-purple-700`}
        >
          <Send className="h-4 w-4" />
          Teklifi Gönder
        </button>
      );
    }

    if (s === 'QUOTE_SENT') {
      actions.push(
        <button
          key="approve"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('APPROVED')}
          className={`${btnBase} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Müşteri Onayladı
        </button>
      );
      actions.push(
        <button
          key="reject"
          type="button"
          disabled={disabled}
          onClick={() => setShowCancelModal(true)}
          className={`${btnBase} border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10`}
        >
          <XCircle className="h-4 w-4" />
          Müşteri Reddetti
        </button>
      );
    }

    if (s === 'APPROVED') {
      actions.push(
        <button
          key="production"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('IN_PRODUCTION')}
          className={`${btnBase} bg-amber-600 text-white hover:bg-amber-700`}
        >
          <Factory className="h-4 w-4" />
          Üretime Başla
        </button>
      );
    }

    if (s === 'IN_PRODUCTION') {
      actions.push(
        <button
          key="ready"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('READY_FOR_DELIVERY')}
          className={`${btnBase} bg-cyan-600 text-white hover:bg-cyan-700`}
        >
          <Package className="h-4 w-4" />
          Üretim Tamamlandı
        </button>
      );
    }

    if (s === 'READY_FOR_DELIVERY') {
      actions.push(
        <button
          key="deliver"
          type="button"
          disabled={disabled}
          onClick={() => handleStatusChange('DELIVERED')}
          className={`${btnBase} bg-green-600 text-white hover:bg-green-700`}
        >
          <Truck className="h-4 w-4" />
          Teslim Edildi
        </button>
      );
    }

    // Cancel button for any non-terminal status
    if (s !== 'DELIVERED' && s !== 'CANCELLED') {
      actions.push(
        <button
          key="cancel"
          type="button"
          disabled={disabled}
          onClick={() => setShowCancelModal(true)}
          className={`${btnBase} mt-2 border border-[#e2e8f0] text-gray-600 hover:border-red-300 hover:text-red-600 dark:border-[#334155] dark:text-gray-400 dark:hover:border-red-500/30 dark:hover:text-red-400`}
        >
          <XCircle className="h-4 w-4" />
          İptal Et
        </button>
      );
    }

    return <div className="space-y-2">{actions}</div>;
  }

  // -- Computed values --

  const subtotal = quote.subtotal ? parseFloat(quote.subtotal) : 0;
  const taxAmount = quote.taxAmount ? parseFloat(quote.taxAmount) : 0;
  const total = quote.total ? parseFloat(quote.total) : 0;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <Link href="/admin" className="hover:text-[#1a365d] dark:hover:text-[#d4a843]">
              Yönetim Paneli
            </Link>
            {' / '}
            <Link
              href="/admin/teklifler"
              className="hover:text-[#1a365d] dark:hover:text-[#d4a843]"
            >
              Teklifler
            </Link>
            {' / '}
            <span className="text-[#1a365d] dark:text-[#d4a843]">{quote.referenceNumber}</span>
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href="/admin/teklifler"
              className="rounded-lg border border-[#e2e8f0] p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-400 dark:hover:bg-white/5"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Teklif: {quote.referenceNumber}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[quote.status]}`}
            >
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
        >
          <Printer className="h-4 w-4" />
          Teklif Yazdır
        </button>
      </div>

      {/* Print header - only visible when printing */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Teklif: {quote.referenceNumber}</h1>
        <p className="text-sm text-gray-600">
          Durum: {STATUS_LABELS[quote.status]} | Tarih: {formatDate(quote.createdAt)}
        </p>
      </div>

      {/* Main layout: Two columns */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer Info Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Müşteri Bilgileri
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Ad Soyad</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {quote.customerName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 flex-shrink-0 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">E-posta</p>
                  <a
                    href={`mailto:${quote.customerEmail}`}
                    className="text-sm font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
                  >
                    {quote.customerEmail}
                  </a>
                </div>
              </div>
              {quote.customerPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Telefon</p>
                    <a
                      href={`tel:${quote.customerPhone}`}
                      className="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {quote.customerPhone}
                    </a>
                  </div>
                </div>
              )}
              {quote.customerCompany && (
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Şirket</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {quote.customerCompany}
                    </p>
                  </div>
                </div>
              )}
              {quote.productType && (
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Ürün Tipi</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {quote.productType}
                    </p>
                  </div>
                </div>
              )}
              {quote.dimensions && (
                <div className="flex items-center gap-3">
                  <Ruler className="h-4 w-4 flex-shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Boyutlar</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {quote.dimensions}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="mt-4 border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">Açıklama</p>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {quote.description}
              </p>
            </div>

            {/* Reference Image */}
            {quote.referenceImageUrl && (
              <div className="mt-4 border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
                <p className="mb-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Referans Görsel
                </p>
                <div className="relative h-48 w-full overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#334155]">
                  <Image
                    src={quote.referenceImageUrl}
                    alt="Referans görsel"
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 66vw"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quote Items Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 dark:border-[#334155]">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Teklif Kalemleri
              </h2>
              {!isEditingItems && quote.status !== 'DELIVERED' && quote.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={startEditItems}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Düzenle
                </button>
              )}
              {isEditingItems && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelEditItems}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                  >
                    <X className="h-3.5 w-3.5" />
                    İptal
                  </button>
                  <button
                    type="button"
                    disabled={savingItems}
                    onClick={saveItems}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#1a365d] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
                  >
                    {savingItems ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Kaydet
                  </button>
                </div>
              )}
            </div>

            {isEditingItems ? (
              /* Edit mode */
              <div className="p-6">
                <div className="space-y-3">
                  {editableItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-lg border border-[#e2e8f0] p-3 dark:border-[#334155] sm:flex-row sm:items-center"
                    >
                      <span className="text-xs font-medium text-gray-400">{index + 1}.</span>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Kalem adı"
                        className="flex-1 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                        }
                        min={1}
                        className="w-20 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                        placeholder="Adet"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(
                              item.id,
                              'unitPrice',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                          min={0}
                          step={0.01}
                          className="w-28 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 pr-8 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                          placeholder="Fiyat"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                          &#8378;
                        </span>
                      </div>
                      <span className="w-24 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#e2e8f0] px-4 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-400 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
                >
                  <Plus className="h-4 w-4" />
                  Kalem Ekle
                </button>

                {/* Totals */}
                <div className="mt-4 border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
                  <div className="ml-auto max-w-xs space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Ara Toplam</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(getEditableSubtotal())}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">KDV (%{TAX_RATE})</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(getEditableSubtotal() * (TAX_RATE / 100))}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-[#e2e8f0] pt-2 dark:border-[#334155]">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        Genel Toplam
                      </span>
                      <span className="text-lg font-bold text-[#1a365d] dark:text-[#d4a843]">
                        {formatCurrency(getEditableSubtotal() * (1 + TAX_RATE / 100))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* View mode */
              <div>
                {quote.items.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Henüz teklif kalemi eklenmemiş
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Kalem Adı
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Miktar
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Birim Fiyat
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Ara Toplam
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                          {quote.items.map((item) => (
                            <tr key={item.id}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                                {formatCurrency(parseFloat(item.unitPrice))}
                              </td>
                              <td className="px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(parseFloat(item.subtotal))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals footer */}
                    <div className="border-t border-[#e2e8f0] px-6 py-4 dark:border-[#334155]">
                      <div className="ml-auto max-w-xs space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Ara Toplam</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            KDV (%{parseFloat(quote.taxRate)})
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(taxAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-[#e2e8f0] pt-2 dark:border-[#334155]">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            Genel Toplam
                          </span>
                          <span className="text-lg font-bold text-[#1a365d] dark:text-[#d4a843]">
                            {formatCurrency(total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Status Timeline Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
              Durum Geçmişi
            </h2>

            {quote.statusHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Henüz durum değişikliği yok
              </p>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-3 top-2 h-[calc(100%-16px)] w-0.5 bg-[#e2e8f0] dark:bg-[#334155]" />

                <div className="space-y-6">
                  {quote.statusHistory.map((entry, index) => (
                    <div key={entry.id} className="relative flex gap-4 pl-0">
                      {/* Dot */}
                      <div
                        className={`relative z-10 mt-0.5 h-6 w-6 flex-shrink-0 rounded-full border-2 border-white dark:border-[#1e293b] ${
                          index === 0
                            ? STATUS_DOT_COLORS[entry.toStatus]
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <CircleDot
                          className={`h-full w-full p-0.5 ${
                            index === 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pb-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[entry.toStatus]}`}
                          >
                            {STATUS_LABELS[entry.toStatus]}
                          </span>
                          {entry.fromStatus && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {STATUS_LABELS[entry.fromStatus]} &rarr;
                            </span>
                          )}
                        </div>
                        {entry.note && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {entry.note}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6 print:hidden">
          {/* Status & Actions Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Durum & İşlemler
            </h2>

            {/* Current status - large badge */}
            <div className="mb-4 flex items-center justify-center">
              <span
                className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-bold ${STATUS_COLORS[quote.status]}`}
              >
                {STATUS_LABELS[quote.status]}
              </span>
            </div>

            <div className="space-y-3 border-b border-[#e2e8f0] pb-4 dark:border-[#334155]">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Referans:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {quote.referenceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Oluşturma:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatDate(quote.createdAt)}
                </span>
              </div>

              {/* Valid until - editable */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Geçerlilik Süresi:</span>
                {editingValidUntil ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="date"
                      value={validUntilValue}
                      onChange={(e) => setValidUntilValue(e.target.value)}
                      className="rounded border border-[#e2e8f0] bg-white px-2 py-1 text-xs text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                    />
                    <button
                      type="button"
                      onClick={saveValidUntil}
                      className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingValidUntil(false)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingValidUntil(true)}
                    className="font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
                  >
                    {quote.validUntil ? formatDate(quote.validUntil) : 'Belirtilmemiş'}
                  </button>
                )}
              </div>

              {/* Estimated days - editable */}
              <div className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500 dark:text-gray-400">Tahmini Teslimat:</span>
                {editingEstimatedDays ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={estimatedDaysValue}
                      onChange={(e) => setEstimatedDaysValue(e.target.value)}
                      min={1}
                      className="w-16 rounded border border-[#e2e8f0] bg-white px-2 py-1 text-xs text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:focus:border-[#d4a843]"
                      placeholder="Gün"
                    />
                    <span className="text-xs text-gray-400">gün</span>
                    <button
                      type="button"
                      onClick={saveEstimatedDays}
                      className="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEstimatedDays(false)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingEstimatedDays(true)}
                    className="font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
                  >
                    {quote.estimatedDays ? `${quote.estimatedDays} gün` : 'Belirtilmemiş'}
                  </button>
                )}
              </div>
            </div>

            {/* Status action buttons */}
            <div className="pt-4">{renderStatusActions()}</div>
          </div>

          {/* Notes Card */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              Notlar
            </h2>

            {/* Add note form */}
            <div className="mb-4">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                placeholder="Yeni not ekleyin..."
                className="w-full resize-none rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
              />
              <button
                type="button"
                disabled={addingNote || !newNote.trim()}
                onClick={handleAddNote}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
              >
                {addingNote ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Not Ekle
              </button>
            </div>

            {/* Notes list */}
            {quote.notes.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Henüz not eklenmemiş</p>
            ) : (
              <div className="space-y-3">
                {quote.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-[#e2e8f0] bg-gray-50 p-3 dark:border-[#334155] dark:bg-[#0f172a]"
                  >
                    <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                      {note.content}
                    </p>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {formatDateTime(note.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm print:hidden"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                Teklifi İptal Et
              </h3>
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Bu teklifi iptal etmek istediğinize emin misiniz? Lütfen iptal nedenini belirtiniz.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="İptal nedeni..."
                className="mt-4 w-full resize-none rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-red-500 focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-red-500"
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                  }}
                  className="flex-1 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={cancelling || !cancelReason.trim()}
                  onClick={handleCancel}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  İptal Et
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
