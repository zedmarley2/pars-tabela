import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { updateProductSchema } from '@/types/admin';
import { Prisma } from '@prisma/client';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/products/:id
 * Get a single product with category and images.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (err) {
    console.error('Error fetching product:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/products/:id
 * Update a product.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { price, categoryId, ...rest } = validation.data;

    if (categoryId) {
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
    }

    const updateData: Prisma.ProductUpdateInput = { ...rest };
    if (categoryId) {
      updateData.category = { connect: { id: categoryId } };
    }
    if (price !== undefined) {
      updateData.price = price != null ? new Prisma.Decimal(price) : null;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json({ data: product });
  } catch (err) {
    console.error('Error updating product:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/:id
 * Delete a product (cascades to images).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ data: { message: 'Product deleted' } });
  } catch (err) {
    console.error('Error deleting product:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
