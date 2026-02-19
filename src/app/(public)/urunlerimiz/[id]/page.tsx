import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAllSettings } from '@/lib/settings';
import { NeonHeader } from '@/components/pars-tabela/neon-header';
import { NeonFooter } from '@/components/pars-tabela/neon-footer';
import { ScrollToTop } from '@/components/pars-tabela/scroll-to-top';
import { ProductDetail } from '@/components/pars-tabela/product-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true, description: true },
  });

  if (!product) return { title: 'Ürün Bulunamadı | Pars Tabela' };

  return {
    title: `${product.name} | Pars Tabela`,
    description: product.description?.slice(0, 160) || `${product.name} - Pars Tabela profesyonel tabela çözümleri`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id, published: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { order: 'asc' } },
    },
  });

  if (!product) notFound();

  const settings = await getAllSettings();

  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
      published: true,
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      images: { select: { id: true, url: true, alt: true }, orderBy: { order: 'asc' }, take: 1 },
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
  });

  const serializedProduct = {
    ...product,
    price: product.price ? product.price.toString() : null,
  };

  const serializedRelated = relatedProducts.map((p) => ({
    ...p,
    price: p.price ? p.price.toString() : null,
  }));

  return (
    <>
      <NeonHeader />
      <main className="pt-20">
        <ProductDetail product={serializedProduct} relatedProducts={serializedRelated} />
      </main>
      <NeonFooter contact={settings.contact} social={settings.social} general={settings.general} />
      <ScrollToTop />
    </>
  );
}
