import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

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

/**
 * GET /api/admin/quotes/stats
 * Quote pipeline statistics, monthly revenue, recent activity.
 */
export async function GET() {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    // Pipeline counts — all statuses
    const pipelineResults = await prisma.quote.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const pipelineCounts: Record<string, number> = {
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
      pipelineCounts[row.status] = row._count.id;
    }

    // Current month boundaries
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Current month revenue (DELIVERED quotes this month)
    const currentMonthDelivered = await prisma.quote.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: {
          gte: currentMonthStart,
          lt: currentMonthEnd,
        },
      },
      select: { total: true },
    });

    const currentMonthRevenue = currentMonthDelivered.reduce(
      (sum, q) => sum + (q.total ? Number(q.total) : 0),
      0
    );

    // Total revenue — all DELIVERED quotes
    const allDelivered = await prisma.quote.findMany({
      where: { status: 'DELIVERED' },
      select: { total: true },
    });

    const totalRevenue = allDelivered.reduce(
      (sum, q) => sum + (q.total ? Number(q.total) : 0),
      0
    );

    // Pending quotes (NEW + QUOTE_SENT)
    const pendingQuotes =
      (pipelineCounts['NEW'] ?? 0) + (pipelineCounts['QUOTE_SENT'] ?? 0);

    // Active production count
    const activeProduction = pipelineCounts['IN_PRODUCTION'] ?? 0;

    // Monthly revenue — last 12 months
    const monthlyRevenue: { month: string; gelir: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

      const monthDelivered = await prisma.quote.findMany({
        where: {
          status: 'DELIVERED',
          updatedAt: {
            gte: monthDate,
            lt: monthEnd,
          },
        },
        select: { total: true },
      });

      const gelir = monthDelivered.reduce(
        (sum, q) => sum + (q.total ? Number(q.total) : 0),
        0
      );

      monthlyRevenue.push({
        month: TURKISH_MONTHS[monthDate.getMonth()],
        gelir,
      });
    }

    // Recent activity — last 10 status changes
    const recentActivity = await prisma.quoteStatusHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        quote: {
          select: { referenceNumber: true },
        },
      },
    });

    return NextResponse.json({
      data: {
        monthlyRevenue,
        currentMonthRevenue,
        totalRevenue,
        pendingQuotes,
        activeProduction,
        pipelineCounts,
        recentActivity,
      },
    });
  } catch (err) {
    console.error('Teklif istatistikleri hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
