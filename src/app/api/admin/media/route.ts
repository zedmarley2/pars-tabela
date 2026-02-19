import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/media
 * List all ProductImages with pagination, search by alt/url.
 * Query params: page, limit, search
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

    const where: Prisma.ProductImageWhereInput = {};

    if (search) {
      where.OR = [
        { alt: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [images, total] = await Promise.all([
      prisma.productImage.findMany({
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
      prisma.productImage.count({ where }),
    ]);

    return NextResponse.json({
      data: images,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error('Error fetching media:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/media
 * Delete a ProductImage by id (passed as query param).
 * Query params: id
 */
export async function DELETE(request: NextRequest) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Image id is required' }, { status: 400 });
    }

    const existing = await prisma.productImage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id } });

    return NextResponse.json({ data: { message: 'Image deleted successfully' } });
  } catch (err) {
    console.error('Error deleting media:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
