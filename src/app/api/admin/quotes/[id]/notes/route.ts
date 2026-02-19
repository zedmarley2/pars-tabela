import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { createQuoteNoteSchema } from '@/types/admin';

/**
 * POST /api/admin/quotes/[id]/notes
 * Add a note to a quote.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = createQuoteNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Doğrulama hatası', details: validation.error.format() },
        { status: 400 }
      );
    }

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 });
    }

    const note = await prisma.quoteNote.create({
      data: {
        quoteId: id,
        content: validation.data.content,
      },
    });

    return NextResponse.json({ data: note });
  } catch (err) {
    console.error('Not ekleme hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
