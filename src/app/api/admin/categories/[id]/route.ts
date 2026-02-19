import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { updateCategorySchema } from '@/types/admin';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/categories/:id
 * Get a single category by ID.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { order: 'asc' },
          include: { images: { orderBy: { order: 'asc' } } },
        },
        _count: { select: { products: true } },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ data: category });
  } catch (err) {
    console.error('Error fetching category:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/categories/:id
 * Update a category.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    if (validation.data.slug && validation.data.slug !== existing.slug) {
      const slugTaken = await prisma.category.findUnique({
        where: { slug: validation.data.slug },
      });
      if (slugTaken) {
        return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: validation.data,
    });

    return NextResponse.json({ data: category });
  } catch (err) {
    console.error('Error updating category:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories/:id
 * Delete a category. Fails if it still has products.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with existing products. Move or delete products first.' },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ data: { message: 'Category deleted' } });
  } catch (err) {
    console.error('Error deleting category:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
