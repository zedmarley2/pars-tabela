import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/pars-tabela/categories
 * Public category listing, ordered by order field.
 */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        order: true,
        _count: { select: { products: { where: { published: true } } } },
      },
    });

    return NextResponse.json({ data: categories });
  } catch (err) {
    console.error('Error fetching public categories:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
