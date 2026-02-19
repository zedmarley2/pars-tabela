import prisma from '@/lib/prisma';
import { getAllSettings } from '@/lib/settings';
import { NeonHeader } from '@/components/pars-tabela/neon-header';
import { NeonHero } from '@/components/pars-tabela/neon-hero';
import { ServicesSection } from '@/components/pars-tabela/services-section';
import { ProductsGallery } from '@/components/pars-tabela/products-gallery';
import { AboutSection } from '@/components/pars-tabela/about-section';
import { ContactSection } from '@/components/pars-tabela/contact-section';
import { NeonFooter } from '@/components/pars-tabela/neon-footer';
import { ScrollToTop } from '@/components/pars-tabela/scroll-to-top';

export default async function ParsTabelaPage() {
  const [categories, featuredProducts, settings] = await Promise.all([
    prisma.category.findMany({
      orderBy: { order: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    prisma.product.findMany({
      where: { published: true, featured: true },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        images: { select: { id: true, url: true, alt: true }, orderBy: { order: 'asc' } },
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    }),
    getAllSettings(),
  ]);

  const serializedProducts = featuredProducts.map((p) => ({
    ...p,
    price: p.price ? p.price.toString() : null,
  }));

  // Parse homepage content from settings
  const heroContent = settings.homepage?.homepage_hero ? JSON.parse(settings.homepage.homepage_hero) : null;
  const servicesContent = settings.homepage?.homepage_services ? JSON.parse(settings.homepage.homepage_services) : null;
  const aboutContent = settings.homepage?.homepage_about ? JSON.parse(settings.homepage.homepage_about) : null;
  const contactContent = settings.homepage?.homepage_contact ? JSON.parse(settings.homepage.homepage_contact) : null;
  const identity = settings.identity || {};

  return (
    <>
      <NeonHeader siteName={identity.site_name} logoLight={identity.logo_light} logoDark={identity.logo_dark} />
      <main>
        <NeonHero content={heroContent} />
        <ServicesSection content={servicesContent} />
        <ProductsGallery products={serializedProducts} categories={categories} />
        <AboutSection content={aboutContent} />
        <ContactSection contact={settings.contact} content={contactContent} />
      </main>
      <NeonFooter contact={settings.contact} social={settings.social} general={settings.general} identity={identity} />
      <ScrollToTop />
    </>
  );
}
