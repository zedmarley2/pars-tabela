import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';

/**
 * GET /api/admin/customers
 * Aggregated customer list from Inquiry table.
 * Groups by email, returns: name, email, phone, inquiryCount, lastContactDate
 * Supports search and pagination.
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
    const search = searchParams.get('search');

    // Build where clause for filtering inquiries before grouping
    const whereClause = search
      ? `WHERE i."name" ILIKE $1 OR i."email" ILIKE $1 OR i."phone" ILIKE $1`
      : '';
    const searchPattern = search ? `%${search}%` : '';

    // Use raw queries for GROUP BY aggregation
    const countQuery = search
      ? prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM (SELECT DISTINCT "email" FROM "Inquiry" ${whereClause}) sub`,
          searchPattern
        )
      : prisma.$queryRawUnsafe<{ count: bigint }[]>(
          `SELECT COUNT(*) as count FROM (SELECT DISTINCT "email" FROM "Inquiry") sub`
        );

    const dataQuery = search
      ? prisma.$queryRawUnsafe<
          {
            name: string;
            email: string;
            phone: string | null;
            inquiryCount: bigint;
            lastContactDate: Date;
          }[]
        >(
          `SELECT
            (array_agg(i."name" ORDER BY i."createdAt" DESC))[1] as name,
            i."email",
            (array_agg(i."phone" ORDER BY i."createdAt" DESC))[1] as phone,
            COUNT(*)::bigint as "inquiryCount",
            MAX(i."createdAt") as "lastContactDate"
          FROM "Inquiry" i
          ${whereClause}
          GROUP BY i."email"
          ORDER BY MAX(i."createdAt") DESC
          LIMIT $2 OFFSET $3`,
          searchPattern,
          limit,
          skip
        )
      : prisma.$queryRawUnsafe<
          {
            name: string;
            email: string;
            phone: string | null;
            inquiryCount: bigint;
            lastContactDate: Date;
          }[]
        >(
          `SELECT
            (array_agg(i."name" ORDER BY i."createdAt" DESC))[1] as name,
            i."email",
            (array_agg(i."phone" ORDER BY i."createdAt" DESC))[1] as phone,
            COUNT(*)::bigint as "inquiryCount",
            MAX(i."createdAt") as "lastContactDate"
          FROM "Inquiry" i
          GROUP BY i."email"
          ORDER BY MAX(i."createdAt") DESC
          LIMIT $1 OFFSET $2`,
          limit,
          skip
        );

    const [countResult, customers] = await Promise.all([countQuery, dataQuery]);

    const total = Number(countResult[0]?.count ?? 0);

    // Convert bigint to number for JSON serialization
    const serializedCustomers = customers.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      inquiryCount: Number(c.inquiryCount),
      lastContactDate: c.lastContactDate,
    }));

    return NextResponse.json({
      data: serializedCustomers,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
