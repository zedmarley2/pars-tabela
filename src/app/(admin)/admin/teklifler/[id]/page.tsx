import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { QuoteDetailClient } from './detail-client';
import type { Metadata } from 'next';

interface QuoteDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: QuoteDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    select: { referenceNumber: true },
  });

  if (!quote) {
    return { title: 'Teklif Bulunamadı' };
  }

  return {
    title: `Teklif ${quote.referenceNumber} | Pars Tabela`,
  };
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
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
    notFound();
  }

  // Serialize Decimal fields to string, Date fields to ISO string
  const serializedQuote = {
    id: quote.id,
    referenceNumber: quote.referenceNumber,
    status: quote.status,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    customerCompany: quote.customerCompany,
    productType: quote.productType,
    description: quote.description,
    dimensions: quote.dimensions,
    referenceImageUrl: quote.referenceImageUrl,
    estimatedDays: quote.estimatedDays,
    validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
    subtotal: quote.subtotal ? String(quote.subtotal) : null,
    taxRate: String(quote.taxRate),
    taxAmount: quote.taxAmount ? String(quote.taxAmount) : null,
    total: quote.total ? String(quote.total) : null,
    deliveryDate: quote.deliveryDate ? quote.deliveryDate.toISOString() : null,
    cancellationReason: quote.cancellationReason,
    customerNotes: quote.customerNotes,
    productId: quote.productId,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    items: quote.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      subtotal: String(item.subtotal),
      createdAt: item.createdAt.toISOString(),
    })),
    statusHistory: quote.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      note: h.note,
      createdAt: h.createdAt.toISOString(),
    })),
    notes: quote.notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt.toISOString(),
    })),
    product: quote.product
      ? {
          id: quote.product.id,
          name: quote.product.name,
          category: quote.product.category
            ? { name: quote.product.category.name }
            : null,
          images: quote.product.images.map((img) => ({
            url: img.url,
            alt: img.alt,
          })),
        }
      : null,
  };

  return <QuoteDetailClient quote={serializedQuote} />;
}
