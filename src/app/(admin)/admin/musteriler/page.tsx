'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Search,
  Users,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
} from 'lucide-react';

interface CustomerInquiry {
  id: string;
  message: string;
  status: string;
  productName: string | null;
  createdAt: string;
}

interface Customer {
  name: string;
  email: string;
  phone: string | null;
  inquiryCount: number;
  lastContactDate: string | null;
  inquiries?: CustomerInquiry[];
}

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Yeni',
  IN_REVIEW: 'İnceleniyor',
  REPLIED: 'Yanıtlandı',
  CLOSED: 'Kapatıldı',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  IN_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  REPLIED: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400',
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
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

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="hidden h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:block" />
          <div className="hidden h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700 md:block" />
          <div className="hidden h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 lg:block" />
        </div>
      ))}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [expandedInquiries, setExpandedInquiries] = useState<CustomerInquiry[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(false);

  const totalPages = Math.ceil(total / limit);

  const fetchCustomers = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.data ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        toast.error('Müşteriler yüklenirken hata oluştu');
      }
    } catch {
      toast.error('Müşteriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [search, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(1);
      setExpandedEmail(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  function handlePageChange(newPage: number) {
    fetchCustomers(newPage);
    setExpandedEmail(null);
  }

  async function toggleExpand(email: string) {
    if (expandedEmail === email) {
      setExpandedEmail(null);
      setExpandedInquiries([]);
      return;
    }

    setExpandedEmail(email);
    setLoadingInquiries(true);
    try {
      const params = new URLSearchParams();
      params.set('search', email);
      params.set('limit', '100');

      const res = await fetch(`/api/admin/inquiries?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setExpandedInquiries(data.data ?? []);
      } else {
        setExpandedInquiries([]);
      }
    } catch {
      setExpandedInquiries([]);
    } finally {
      setLoadingInquiries(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Müşteriler</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Müşteriler</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toplam {total} müşteri
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
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
      </div>

      {/* Customers table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <LoadingSkeleton />
        ) : customers.length === 0 ? (
          <div className="py-20 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              Henüz müşteri bulunmuyor
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Ad
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 sm:table-cell">
                    E-posta
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">
                    Telefon
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Talep Sayısı
                  </th>
                  <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">
                    Son İletişim
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {customers.map((customer) => (
                  <CustomerRow
                    key={customer.email}
                    customer={customer}
                    isExpanded={expandedEmail === customer.email}
                    onToggleExpand={() => toggleExpand(customer.email)}
                    inquiries={expandedEmail === customer.email ? expandedInquiries : []}
                    loadingInquiries={expandedEmail === customer.email && loadingInquiries}
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
    </div>
  );
}

/* ========== Customer Row Component ========== */

interface CustomerRowProps {
  customer: Customer;
  isExpanded: boolean;
  onToggleExpand: () => void;
  inquiries: CustomerInquiry[];
  loadingInquiries: boolean;
}

function CustomerRow({
  customer,
  isExpanded,
  onToggleExpand,
  inquiries,
  loadingInquiries,
}: CustomerRowProps) {
  return (
    <>
      <tr
        className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
          isExpanded ? 'bg-gray-50/50 dark:bg-white/[0.02]' : ''
        }`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#1a365d]/10 text-sm font-bold text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {customer.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">
                {customer.email}
              </p>
            </div>
          </div>
        </td>
        <td className="hidden px-6 py-4 sm:table-cell">
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-[#1a365d] dark:text-gray-300 dark:hover:text-[#d4a843]"
          >
            <Mail className="h-3.5 w-3.5" />
            {customer.email}
          </a>
        </td>
        <td className="hidden px-6 py-4 md:table-cell">
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              {customer.phone}
            </a>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="px-6 py-4">
          <span className="inline-flex items-center rounded-full bg-[#1a365d]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
            {customer.inquiryCount}
          </span>
        </td>
        <td className="hidden px-6 py-4 text-sm text-gray-500 dark:text-gray-400 lg:table-cell">
          {formatDate(customer.lastContactDate)}
        </td>
        <td className="px-6 py-4">
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e8f0] px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Gizle
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Talepler
              </>
            )}
          </button>
        </td>
      </tr>

      {/* Expanded inquiries */}
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={6} className="px-0 py-0">
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="border-t border-[#e2e8f0] bg-gray-50/50 px-6 py-4 dark:border-[#334155] dark:bg-white/[0.02]">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                    {customer.name} - Talepler
                  </h4>

                  {loadingInquiries ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a365d] dark:border-gray-700 dark:border-t-[#d4a843]" />
                    </div>
                  ) : inquiries.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      Bu müşteriye ait talep bulunamadı
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {inquiries.map((inq) => (
                        <div
                          key={inq.id}
                          className="rounded-lg border border-[#e2e8f0] bg-white p-4 dark:border-[#334155] dark:bg-[#1e293b]"
                        >
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                STATUS_COLORS[inq.status] ?? STATUS_COLORS['NEW']
                              }`}
                            >
                              {STATUS_LABELS[inq.status] ?? inq.status}
                            </span>
                            {inq.productName && (
                              <span className="inline-flex items-center rounded-full bg-[#1a365d]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
                                {inq.productName}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(inq.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                            {inq.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}
