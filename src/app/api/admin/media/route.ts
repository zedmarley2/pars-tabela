import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { Prisma } from '@prisma/client';
import { unlink } from 'fs/promises';

/**
 * GET /api/admin/media
 * List all Media records with pagination and search.
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

    const where: Prisma.MediaWhereInput = {};

    if (search) {
      where.OR = [
        { filename: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [media, total] = await Promise.all([
      prisma.media.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.media.count({ where }),
    ]);

    return NextResponse.json({
      data: media,
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
 * Delete a Media record by id (passed as query param).
 * Also removes the file from disk.
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
      return NextResponse.json({ error: 'Media id is required' }, { status: 400 });
    }

    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Try to delete the file from disk
    try {
      await unlink(existing.path);
    } catch {
      // File may already be deleted, continue with DB cleanup
    }

    await prisma.media.delete({ where: { id } });

    return NextResponse.json({ data: { message: 'Media deleted successfully' } });
  } catch (err) {
    console.error('Error deleting media:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
