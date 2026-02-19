import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { contactFormSchema } from '@/types/admin';

/**
 * POST /api/pars-tabela/contact
 * Public contact form submission — saves to Inquiry table.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = contactFormSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { name, email, phone, message, productId } = validation.data;

    await prisma.inquiry.create({
      data: {
        name,
        email,
        phone: phone || null,
        message,
        productId: productId || null,
        status: 'NEW',
      },
    });

    // Create a notification for admin
    await prisma.notification.create({
      data: {
        title: 'Yeni İletişim Talebi',
        message: `${name} yeni bir mesaj gönderdi: ${message.slice(0, 100)}`,
        type: 'inquiry',
        link: '/admin/siparisler',
      },
    });

    return NextResponse.json({
      data: { message: 'Your message has been received. We will get back to you soon.' },
    });
  } catch (err) {
    console.error('Error processing contact form:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
