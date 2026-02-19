import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createCategorySchema } from '@/types/admin';

/**
 * GET /api/admin/categories
 * List all categories ordered by the `order` field.
 */
export async function GET() {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (err) {
    console.error('Error fetching categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/categories
 * Create a new category.
 */
export async function POST(request: Request) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, slug, description, order } = validation.data;

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: { name, slug, description, order: order ?? 0 },
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (err) {
    console.error('Error creating category:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
