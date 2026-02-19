import prisma from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import {
  Package,
  Tags,
  Eye,
  FileEdit,
  Plus,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Clock,
  Factory,
  FileText,
} from 'lucide-react';
import { DashboardCharts } from '@/components/admin/dashboard-charts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
}

type QuoteStatus =
  | 'NEW'
  | 'QUOTE_PREPARED'
  | 'QUOTE_SENT'
  | 'APPROVED'
  | 'IN_PRODUCTION'
  | 'READY_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TURKISH_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

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

const STATUS_BAR_COLORS: Record<QuoteStatus, string> = {
  NEW: 'bg-blue-500',
  QUOTE_PREPARED: 'bg-indigo-500',
  QUOTE_SENT: 'bg-purple-500',
  APPROVED: 'bg-emerald-500',
  IN_PRODUCTION: 'bg-amber-500',
  READY_FOR_DELIVERY: 'bg-cyan-500',
  DELIVERED: 'bg-green-500',
  CANCELLED: 'bg-red-500',
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

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------

function StatCard({ icon, value, label, color, bgColor }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-[#334155] dark:bg-[#1e293b]">
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColor}`}>
          <div className={color}>{icon}</div>
        </div>
        <div>
          <p className="text-2xl font-bold text-[#1a365d] dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  if (published) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
        Yayinda
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
      Taslak
    </span>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    // Product stats
    totalProducts,
    totalCategories,
    publishedProducts,
    draftProducts,
    recentProducts,
    // Quote pipeline counts
    pipelineResults,
    // Current month delivered quotes
    currentMonthDelivered,
    // All delivered quotes
    allDelivered,
    // Recent status history
    recentActivity,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.product.count({ where: { published: false } }),
    prisma.product.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' }, take: 1 },
      },
    }),
    prisma.quote.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.quote.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { gte: currentMonthStart, lt: currentMonthEnd },
      },
      select: { total: true },
    }),
    prisma.quote.findMany({
      where: { status: 'DELIVERED' },
      select: { total: true },
    }),
    prisma.quoteStatusHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        quote: { select: { referenceNumber: true, id: true } },
      },
    }),
  ]);

  // Build pipeline counts
  const pipelineCounts: Record<QuoteStatus, number> = {
    NEW: 0,
    QUOTE_PREPARED: 0,
    QUOTE_SENT: 0,
    APPROVED: 0,
    IN_PRODUCTION: 0,
    READY_FOR_DELIVERY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  for (const row of pipelineResults) {
    pipelineCounts[row.status as QuoteStatus] = row._count.id;
  }

  const currentMonthRevenue = currentMonthDelivered.reduce(
    (sum, q) => sum + (q.total ? Number(q.total) : 0),
    0
  );

  const totalRevenue = allDelivered.reduce(
    (sum, q) => sum + (q.total ? Number(q.total) : 0),
    0
  );

  const pendingQuotes = (pipelineCounts.NEW ?? 0) + (pipelineCounts.QUOTE_SENT ?? 0);
  const activeProduction = pipelineCounts.IN_PRODUCTION ?? 0;

  // Monthly revenue — last 12 months (fetched in parallel)
  const monthlyRevenuePromises = Array.from({ length: 12 }, (_, i) => {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    return prisma.quote
      .findMany({
        where: {
          status: 'DELIVERED',
          updatedAt: { gte: monthDate, lt: monthEnd },
        },
        select: { total: true },
      })
      .then((quotes) => ({
        month: TURKISH_MONTHS[monthDate.getMonth()],
        gelir: quotes.reduce((sum, q) => sum + (q.total ? Number(q.total) : 0), 0),
      }));
  });

  const monthlyRevenue = await Promise.all(monthlyRevenuePromises);

  // Pipeline total for bar width calculation
  const pipelineTotal = Object.values(pipelineCounts).reduce((s, c) => s + c, 0);
  const pipelineEntries = (Object.entries(pipelineCounts) as [QuoteStatus, number][]).filter(
    ([, count]) => count > 0
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli / <span className="text-[#1a365d] dark:text-[#d4a843]">Dashboard</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Hos Geldiniz</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pars Tabela yönetim paneline hos geldiniz
        </p>
      </div>

      {/* Row 1: Revenue / Quote stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          value={formatCurrency(currentMonthRevenue)}
          label="Aylık Gelir"
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-500/20"
        />
        <StatCard
          icon={<DollarSign className="h-6 w-6" />}
          value={formatCurrency(totalRevenue)}
          label="Toplam Gelir"
          color="text-[#1a365d] dark:text-[#d4a843]"
          bgColor="bg-[#1a365d]/10 dark:bg-[#1a365d]/30"
        />
        <StatCard
          icon={<Clock className="h-6 w-6" />}
          value={pendingQuotes}
          label="Bekleyen Teklifler"
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-100 dark:bg-purple-500/20"
        />
        <StatCard
          icon={<Factory className="h-6 w-6" />}
          value={activeProduction}
          label="Aktif Üretim"
          color="text-amber-600 dark:text-[#d4a843]"
          bgColor="bg-amber-100 dark:bg-amber-500/20"
        />
      </div>

      {/* Row 2: Product stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Package className="h-6 w-6" />}
          value={totalProducts}
          label="Toplam Ürün"
          color="text-[#1a365d] dark:text-[#d4a843]"
          bgColor="bg-[#1a365d]/10 dark:bg-[#1a365d]/30"
        />
        <StatCard
          icon={<Tags className="h-6 w-6" />}
          value={totalCategories}
          label="Kategoriler"
          color="text-violet-600 dark:text-violet-400"
          bgColor="bg-violet-100 dark:bg-violet-500/20"
        />
        <StatCard
          icon={<Eye className="h-6 w-6" />}
          value={publishedProducts}
          label="Yayinda"
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-100 dark:bg-green-500/20"
        />
        <StatCard
          icon={<FileEdit className="h-6 w-6" />}
          value={draftProducts}
          label="Taslak"
          color="text-amber-600 dark:text-[#d4a843]"
          bgColor="bg-amber-100 dark:bg-amber-500/20"
        />
      </div>

      {/* Row 3: Revenue Chart (2/3) + Pipeline Summary (1/3) */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b] lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aylik Gelir</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Son 12 aylik gelir grafiği
              </p>
            </div>
          </div>
          <DashboardCharts data={monthlyRevenue} />
        </div>

        {/* Pipeline Summary */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            Teklif Hattı
          </h2>

          {/* Colored bar */}
          {pipelineTotal > 0 ? (
            <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-[#0f172a]">
              {pipelineEntries.map(([status, count]) => (
                <div
                  key={status}
                  className={`${STATUS_BAR_COLORS[status]} transition-all`}
                  style={{ width: `${(count / pipelineTotal) * 100}%` }}
                  title={`${STATUS_LABELS[status]}: ${count}`}
                />
              ))}
            </div>
          ) : (
            <div className="mb-4 h-3 rounded-full bg-gray-100 dark:bg-[#0f172a]" />
          )}

          {/* Status breakdown list */}
          <div className="space-y-2.5">
            {(Object.entries(pipelineCounts) as [QuoteStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {STATUS_LABELS[status]}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="mt-6 space-y-3 border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
            <Link
              href="/admin/teklifler"
              className="flex w-full items-center gap-3 rounded-lg border border-[#e2e8f0] px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-[#1a365d] hover:bg-[#1a365d]/5 hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:bg-[#d4a843]/5 dark:hover:text-[#d4a843]"
            >
              <FileEdit className="h-4 w-4" />
              Teklifleri Yönet
            </Link>
            <Link
              href="/admin/urunler/yeni"
              className="flex w-full items-center gap-3 rounded-lg border border-[#e2e8f0] px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-[#1a365d] hover:bg-[#1a365d]/5 hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:bg-[#d4a843]/5 dark:hover:text-[#d4a843]"
            >
              <Plus className="h-4 w-4" />
              Yeni Ürün Ekle
            </Link>
            <a
              href="/pars-tabela"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-lg border border-[#e2e8f0] px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:border-[#1a365d] hover:bg-[#1a365d]/5 hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:bg-[#d4a843]/5 dark:hover:text-[#d4a843]"
            >
              <ExternalLink className="h-4 w-4" />
              Siteyi Gör
            </a>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Products (1/2) + Recent Quote Activity (1/2) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Products */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 dark:border-[#334155]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Son Eklenen Ürünler</h2>
            <Link
              href="/admin/urunler"
              className="text-sm font-medium text-[#1a365d] transition-colors hover:text-[#1a365d]/70 dark:text-[#d4a843] dark:hover:text-[#d4a843]/80"
            >
              Tümünü Gör
            </Link>
          </div>

          {recentProducts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">Henüz ürün eklenmemis</p>
              <Link
                href="/admin/urunler/yeni"
                className="mt-3 inline-block text-sm font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
              >
                Ilk ürünü ekle
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Görsel</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ürün Adi</th>
                    <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 md:table-cell">Kategori</th>
                    <th className="hidden px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 lg:table-cell">Fiyat</th>
                    <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                  {recentProducts.slice(0, 5).map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-6 py-4">
                        {product.images[0] ? (
                          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#334155]">
                            <Image
                              src={product.images[0].url}
                              alt={product.images[0].alt ?? product.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-gray-50 dark:border-[#334155] dark:bg-[#0f172a]">
                            <Package className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/urunler/${product.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
                        >
                          {product.name}
                        </Link>
                      </td>
                      <td className="hidden px-6 py-4 md:table-cell">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
                          {product.category.name}
                        </span>
                      </td>
                      <td className="hidden px-6 py-4 lg:table-cell">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {product.price ? `${Number(product.price).toLocaleString('tr-TR')} \u20BA` : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge published={product.published} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Quote Activity */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
          <div className="flex items-center justify-between border-b border-[#e2e8f0] px-6 py-4 dark:border-[#334155]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Son Teklif Hareketleri</h2>
            <Link
              href="/admin/teklifler"
              className="text-sm font-medium text-[#1a365d] transition-colors hover:text-[#1a365d]/70 dark:text-[#d4a843] dark:hover:text-[#d4a843]/80"
            >
              Tümünü Gör
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-gray-500 dark:text-gray-400">Henüz teklif hareketi yok</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
              {recentActivity.map((activity) => {
                const toStatus = activity.toStatus as QuoteStatus;
                const fromStatus = activity.fromStatus as QuoteStatus | null;
                return (
                  <div key={activity.id} className="px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/admin/teklifler/${activity.quote.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
                        >
                          {activity.quote.referenceNumber}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {fromStatus && (
                            <>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {STATUS_LABELS[fromStatus]}
                              </span>
                              <span className="text-xs text-gray-400">&rarr;</span>
                            </>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_BAR_COLORS[toStatus]
                                ? STATUS_BAR_COLORS[toStatus].replace('bg-', 'bg-').replace('-500', '-100') +
                                  ' ' +
                                  STATUS_BAR_COLORS[toStatus].replace('bg-', 'text-').replace('-500', '-700')
                                : 'bg-gray-100 text-gray-700'
                            } dark:bg-white/10 dark:text-gray-300`}
                          >
                            {STATUS_LABELS[toStatus]}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDateTime(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
