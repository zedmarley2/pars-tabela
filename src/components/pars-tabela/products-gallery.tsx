'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
}

interface ProductItem {
  id: string;
  name: string;
  price: string | number | null;
  categoryId: string;
  category: CategoryItem;
  images: ProductImage[];
}

interface ProductsGalleryProps {
  products: ProductItem[];
  categories: CategoryItem[];
}

const PLACEHOLDER_GRADIENTS = [
  'from-[#1a365d]/20 to-[#1a365d]/5',
  'from-[#d4a843]/20 to-[#d4a843]/5',
  'from-slate-400/20 to-slate-400/5',
  'from-[#1a365d]/15 to-[#d4a843]/10',
];

export function ProductsGallery({ products, categories }: ProductsGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredProducts = activeCategory
    ? products.filter((p) => p.categoryId === activeCategory)
    : products;

  return (
    <section
      id="urunlerimiz"
      className="bg-white py-24 transition-colors duration-300 dark:bg-[#0f172a]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-[#1a365d] sm:text-5xl dark:text-white">
            Ürünlerimiz
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            En son projelerimiz ve ürünlerimiz
          </p>
        </div>

        {/* Category filters - horizontal scroll on mobile */}
        <div className="mb-12 flex gap-3 overflow-x-auto pb-2 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all ${
              activeCategory === null
                ? 'bg-[#1a365d] text-white dark:bg-[#d4a843] dark:text-[#0f172a]'
                : 'border border-[#e2e8f0] bg-white text-[#1f2937] hover:border-[#1a365d] dark:border-[#334155] dark:bg-[#1e293b] dark:text-gray-300 dark:hover:border-[#d4a843]'
            }`}
          >
            Tümü
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#1a365d] text-white dark:bg-[#d4a843] dark:text-[#0f172a]'
                  : 'border border-[#e2e8f0] bg-white text-[#1f2937] hover:border-[#1a365d] dark:border-[#334155] dark:bg-[#1e293b] dark:text-gray-300 dark:hover:border-[#d4a843]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product, i) => (
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Link
                  href={`/urunlerimiz/${product.id}`}
                  className="group block overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-[#334155] dark:bg-[#1e293b]"
                >
                  {/* Image or gradient placeholder */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                    {product.images.length > 0 ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.images[0].alt || product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]}`}
                      >
                        <svg className="h-12 w-12 text-[#1a365d]/30 dark:text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Card content */}
                  <div className="p-5">
                    <span className="mb-2 inline-block rounded-full bg-[#d4a843]/10 px-3 py-1 text-xs font-medium text-[#d4a843]">
                      {product.category.name}
                    </span>
                    <h3 className="mb-1 text-lg font-semibold text-[#1f2937] dark:text-white">
                      {product.name}
                    </h3>
                    {product.price && (
                      <p className="text-sm font-medium text-[#1a365d] dark:text-[#d4a843]">
                        ₺{' '}
                        {typeof product.price === 'number'
                          ? product.price.toLocaleString('tr-TR')
                          : Number(product.price).toLocaleString('tr-TR')}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <p className="mt-12 text-center text-gray-500 dark:text-gray-400">
            Bu kategoride henüz ürün bulunmuyor.
          </p>
        )}

        {/* View all button */}
        <div className="mt-12 text-center">
          <a
            href="/urunlerimiz"
            className="inline-block rounded-full bg-[#1a365d] px-8 py-3 text-lg font-semibold text-white transition-all duration-300 hover:bg-[#1a365d]/90 hover:shadow-md dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#e0b854]"
          >
            Tüm Ürünleri Gör
          </a>
        </div>
      </div>
    </section>
  );
}
