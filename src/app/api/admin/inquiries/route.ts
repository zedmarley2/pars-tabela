import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/inquiries
 * List inquiries with pagination, filtering by status, search by name/email.
 * Query params: page, limit, status (NEW|IN_REVIEW|REPLIED|CLOSED), search
 */
export async function GET(request: NextRequest) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const skip = (page - 1) * limit;
    const statusFilter = searchParams.get('status');
    const search = searchParams.get('search');

    const where: Prisma.InquiryWhereInput = {};

    if (statusFilter && ['NEW', 'IN_REVIEW', 'REPLIED', 'CLOSED'].includes(statusFilter)) {
      where.status = statusFilter as Prisma.EnumInquiryStatusFilter;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { message: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return NextResponse.json({
      data: inquiries,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching inquiries:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
