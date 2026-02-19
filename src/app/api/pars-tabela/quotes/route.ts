import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createQuoteSchema } from '@/types/admin';

/**
 * POST /api/pars-tabela/quotes
 * Public quote submission — creates a new Quote with status NEW.
 * Auto-generates reference number in format PT-YYYY-NNN.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createQuoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Doğrulama hatası', details: validation.error.format() },
        { status: 400 }
      );
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      productType,
      description,
      dimensions,
      productId,
    } = validation.data;

    // Generate reference number: PT-YYYY-NNN
    const currentYear = new Date().getFullYear();
    const yearPrefix = `PT-${currentYear}-`;

    const latestQuote = await prisma.quote.findFirst({
      where: {
        referenceNumber: { startsWith: yearPrefix },
      },
      orderBy: { referenceNumber: 'desc' },
      select: { referenceNumber: true },
    });

    let nextNumber = 1;
    if (latestQuote) {
      const lastPart = latestQuote.referenceNumber.split('-').pop();
      if (lastPart) {
        nextNumber = parseInt(lastPart, 10) + 1;
      }
    }

    const referenceNumber = `${yearPrefix}${String(nextNumber).padStart(3, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        referenceNumber,
        status: 'NEW',
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        customerCompany: customerCompany || null,
        productType: productType || null,
        description,
        dimensions: dimensions || null,
        productId: productId || null,
      },
    });

    // Create initial status history entry
    await prisma.quoteStatusHistory.create({
      data: {
        quoteId: quote.id,
        fromStatus: null,
        toStatus: 'NEW',
        note: 'Teklif talebi oluşturuldu',
      },
    });

    // Create notification for admin
    await prisma.notification.create({
      data: {
        title: 'Yeni Teklif Talebi',
        message: `${customerName} yeni bir teklif talebi gönderdi: ${description.slice(0, 100)}${description.length > 100 ? '...' : ''}`,
        type: 'quote',
        link: '/admin/teklifler',
      },
    });

    return NextResponse.json({
      data: { referenceNumber: quote.referenceNumber },
    });
  } catch (err) {
    console.error('Teklif oluşturma hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
