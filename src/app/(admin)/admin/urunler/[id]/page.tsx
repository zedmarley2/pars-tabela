import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { EditProductClient } from './edit-client';

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      images: { orderBy: { order: 'asc' } },
    },
  });

  if (!product) {
    notFound();
  }

  // Serialize for client component (Decimal -> string, Date -> string)
  const serializedProduct = {
    id: product.id,
    name: product.name,
    description: product.description,
    price: product.price ? String(product.price) : null,
    categoryId: product.categoryId,
    featured: product.featured,
    published: product.published,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? undefined,
      order: img.order,
    })),
  };

  return <EditProductClient initialData={serializedProduct} />;
}
