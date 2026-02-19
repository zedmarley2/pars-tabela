'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { QuoteModal } from '@/components/pars-tabela/quote-modal';

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  order: number;
}

interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
}

interface ProductData {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  categoryId: string;
  featured: boolean;
  published: boolean;
  category: CategoryInfo;
  images: ProductImage[];
  createdAt: Date;
}

interface RelatedProduct {
  id: string;
  name: string;
  price: string | null;
  category: CategoryInfo;
  images: { id: string; url: string; alt: string | null }[];
}

interface ProductDetailProps {
  product: ProductData;
  relatedProducts: RelatedProduct[];
}

const PLACEHOLDER_GRADIENTS = [
  'from-[#1a365d]/20 to-[#1a365d]/5',
  'from-[#d4a843]/20 to-[#d4a843]/5',
  'from-slate-400/20 to-slate-400/5',
  'from-[#1a365d]/15 to-[#d4a843]/10',
];

export function ProductDetail({ product, relatedProducts }: ProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <>
      <div className="bg-white transition-colors duration-300 dark:bg-[#0f172a]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/"
              className="transition-colors hover:text-[#1a365d] dark:hover:text-[#d4a843]"
            >
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link
              href="/urunlerimiz"
              className="transition-colors hover:text-[#1a365d] dark:hover:text-[#d4a843]"
            >
              Ürünlerimiz
            </Link>
            <span>/</span>
            <span className="text-[#1f2937] dark:text-white">{product.name}</span>
          </nav>

          {/* Back button */}
          <Link
            href="/urunlerimiz"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#1a365d] transition-colors hover:text-[#1a365d]/70 dark:text-[#d4a843] dark:hover:text-[#d4a843]/70"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Tüm Ürünler
          </Link>

          {/* Product content */}
          <div className="grid gap-10 lg:grid-cols-2">
            {/* Left: Image gallery */}
            <div className="space-y-4">
              {/* Main image */}
              <div className="relative aspect-square overflow-hidden rounded-xl border border-[#e2e8f0] bg-gray-50 dark:border-[#334155] dark:bg-[#1e293b]">
                {product.images.length > 0 ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedImage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative h-full w-full"
                    >
                      <Image
                        src={product.images[selectedImage].url}
                        alt={product.images[selectedImage].alt || product.name}
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        className="object-cover"
                        priority
                      />
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1a365d]/10 to-[#d4a843]/10">
                    <svg className="h-20 w-20 text-[#1a365d]/20 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        selectedImage === i
                          ? 'border-[#1a365d] shadow-md dark:border-[#d4a843]'
                          : 'border-[#e2e8f0] hover:border-gray-300 dark:border-[#334155] dark:hover:border-gray-600'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={img.alt || `${product.name} - ${i + 1}`}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product info */}
            <div className="flex flex-col">
              {/* Category badge */}
              <span className="mb-4 inline-block w-fit rounded-full bg-[#d4a843]/10 px-4 py-1.5 text-sm font-medium text-[#d4a843]">
                {product.category.name}
              </span>

              {/* Name */}
              <h1 className="mb-4 text-3xl font-bold text-[#1a365d] sm:text-4xl dark:text-white">
                {product.name}
              </h1>

              {/* Price */}
              {product.price && (
                <p className="mb-6 text-2xl font-semibold text-[#1a365d] dark:text-[#d4a843]">
                  &#8378; {Number(product.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              )}

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <h2 className="mb-3 text-lg font-semibold text-[#1f2937] dark:text-gray-200">
                    Ürün Açıklaması
                  </h2>
                  <div className="prose max-w-none text-gray-600 dark:text-gray-400">
                    {product.description.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-3 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Specs table */}
              <div className="mb-8 overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                      <td className="bg-[#f8fafc] px-5 py-3 font-medium text-[#1f2937] dark:bg-[#1e293b] dark:text-gray-300">
                        Kategori
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {product.category.name}
                      </td>
                    </tr>
                    <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                      <td className="bg-[#f8fafc] px-5 py-3 font-medium text-[#1f2937] dark:bg-[#1e293b] dark:text-gray-300">
                        Durum
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {product.featured ? 'Öne Çıkan Ürün' : 'Standart'}
                      </td>
                    </tr>
                    {product.price && (
                      <tr className="border-b border-[#e2e8f0] dark:border-[#334155]">
                        <td className="bg-[#f8fafc] px-5 py-3 font-medium text-[#1f2937] dark:bg-[#1e293b] dark:text-gray-300">
                          Fiyat
                        </td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                          &#8378; {Number(product.price).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="bg-[#f8fafc] px-5 py-3 font-medium text-[#1f2937] dark:bg-[#1e293b] dark:text-gray-300">
                        Görsel Sayısı
                      </td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-400">
                        {product.images.length} adet
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                onClick={() => setQuoteOpen(true)}
                className="w-full rounded-xl bg-[#1a365d] px-8 py-4 text-lg font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#1a365d]/90 hover:shadow-lg dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#e0b854] sm:w-auto"
              >
                Teklif İste
              </button>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="mt-20 border-t border-[#e2e8f0] pt-16 dark:border-[#334155]">
              <h2 className="mb-8 text-2xl font-bold text-[#1a365d] dark:text-white">
                Benzer Ürünler
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {relatedProducts.map((rp, i) => (
                  <Link
                    key={rp.id}
                    href={`/urunlerimiz/${rp.id}`}
                    className="group overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-[#334155] dark:bg-[#1e293b]"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {rp.images.length > 0 ? (
                        <Image
                          src={rp.images[0].url}
                          alt={rp.images[0].alt || rp.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]}`}
                        >
                          <svg className="h-10 w-10 text-[#1a365d]/30 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <span className="mb-1.5 inline-block rounded-full bg-[#d4a843]/10 px-2.5 py-0.5 text-xs font-medium text-[#d4a843]">
                        {rp.category.name}
                      </span>
                      <h3 className="text-sm font-semibold text-[#1f2937] dark:text-white">
                        {rp.name}
                      </h3>
                      {rp.price && (
                        <p className="mt-1 text-sm font-medium text-[#1a365d] dark:text-[#d4a843]">
                          &#8378; {Number(rp.price).toLocaleString('tr-TR')}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quote Modal */}
      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        productName={product.name}
        productId={product.id}
      />
    </>
  );
}
