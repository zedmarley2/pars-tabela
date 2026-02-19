import prisma from '@/lib/prisma';
import { getAllSettings } from '@/lib/settings';
import { NeonHeader } from '@/components/pars-tabela/neon-header';
import { ProductsGallery } from '@/components/pars-tabela/products-gallery';
import { NeonFooter } from '@/components/pars-tabela/neon-footer';
import { ScrollToTop } from '@/components/pars-tabela/scroll-to-top';

export const metadata = {
  title: 'Ürünlerimiz | Pars Tabela',
  description: 'Neon tabela, LED tabela, elektronik tabela ve kutu harf ürünlerimizi keşfedin.',
};

export default async function UrunlerimizPage() {
  const [categories, products, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.findMany({
      where: { published: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, alt: true }, orderBy: { order: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    getAllSettings(),
  ]);

  const serializedProducts = products.map((p) => ({
    ...p,
    price: p.price ? p.price.toString() : null,
  }));

  return (
    <>
      <NeonHeader />
      <main className="pt-20">
        <ProductsGallery products={serializedProducts} categories={categories} />
      </main>
      <NeonFooter contact={settings.contact} social={settings.social} general={settings.general} />
      <ScrollToTop />
    </>
  );
}
