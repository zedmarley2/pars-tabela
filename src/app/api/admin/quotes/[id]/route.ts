import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { updateQuoteSchema } from '@/types/admin';
import { Prisma } from '@prisma/client';

/**
 * GET /api/admin/quotes/[id]
 * Full quote with items, statusHistory, notes, product info.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { error, status } = await requireAdmin();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
        product: {
          include: {
            category: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ data: quote });
  } catch (err) {
    console.error('Teklif detay hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/quotes/[id]
 * Update quote — status, items, estimatedDays, validUntil, customerNotes,
 * cancellationReason, deliveryDate.
 */
export async function PATCH(
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
    const validation = updateQuoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Doğrulama hatası', details: validation.error.format() },
        { status: 400 }
      );
    }

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Teklif bulunamadı' }, { status: 404 });
    }

    const {
      status: newStatus,
      items,
      estimatedDays,
      validUntil,
      customerNotes,
      cancellationReason,
      deliveryDate,
    } = validation.data;

    const updateData: Record<string, unknown> = {};

    // Handle status change
    if (newStatus && newStatus !== existing.status) {
      updateData.status = newStatus;

      // Auto-set deliveryDate when status changes to DELIVERED
      if (newStatus === 'DELIVERED' && !deliveryDate && !existing.deliveryDate) {
        updateData.deliveryDate = new Date();
      }
    }

    // Handle items replacement — recalculate totals
    if (items !== undefined) {
      // Delete existing items
      await prisma.quoteItem.deleteMany({ where: { quoteId: id } });

      // Create new items
      const TAX_RATE = 18;
      let subtotal = new Prisma.Decimal(0);

      for (const item of items) {
        const itemSubtotal = new Prisma.Decimal(item.unitPrice).mul(item.quantity);
        subtotal = subtotal.add(itemSubtotal);

        await prisma.quoteItem.create({
          data: {
            quoteId: id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            subtotal: itemSubtotal,
          },
        });
      }

      const taxAmount = subtotal.mul(TAX_RATE).div(100);
      const total = subtotal.add(taxAmount);

      updateData.subtotal = subtotal;
      updateData.taxRate = new Prisma.Decimal(TAX_RATE);
      updateData.taxAmount = taxAmount;
      updateData.total = total;
    }

    if (estimatedDays !== undefined) {
      updateData.estimatedDays = estimatedDays;
    }

    if (validUntil !== undefined) {
      updateData.validUntil = validUntil ? new Date(validUntil) : null;
    }

    if (customerNotes !== undefined) {
      updateData.customerNotes = customerNotes;
    }

    if (cancellationReason !== undefined) {
      updateData.cancellationReason = cancellationReason;
    }

    if (deliveryDate !== undefined) {
      updateData.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Güncellenecek alan bulunamadı' },
        { status: 400 }
      );
    }

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        notes: { orderBy: { createdAt: 'desc' } },
        product: {
          select: { id: true, name: true },
        },
      },
    });

    // Create status history entry if status changed
    if (newStatus && newStatus !== existing.status) {
      await prisma.quoteStatusHistory.create({
        data: {
          quoteId: id,
          fromStatus: existing.status,
          toStatus: newStatus,
        },
      });
    }

    return NextResponse.json({ data: updatedQuote });
  } catch (err) {
    console.error('Teklif güncelleme hatası:', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
