import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createProductImageSchema } from '@/types/admin';

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/products/:id/images
 * List all images for a product.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const images = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ data: images });
  } catch (err) {
    console.error('Error fetching product images:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/products/:id/images
 * Add an image record to a product.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const body = await request.json();
    const validation = createProductImageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { url, alt, order } = validation.data;

    const image = await prisma.productImage.create({
      data: {
        url,
        alt,
        order: order ?? 0,
        productId: id,
      },
    });

    return NextResponse.json({ data: image }, { status: 201 });
  } catch (err) {
    console.error('Error adding product image:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/products/:id/images
 * Delete an image by imageId passed in query string: ?imageId=xxx
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;
    const imageId = request.nextUrl.searchParams.get('imageId');

    if (!imageId) {
      return NextResponse.json({ error: 'imageId query parameter is required' }, { status: 400 });
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId: id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    await prisma.productImage.delete({ where: { id: imageId } });

    return NextResponse.json({ data: { message: 'Image deleted' } });
  } catch (err) {
    console.error('Error deleting product image:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
