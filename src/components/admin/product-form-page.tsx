'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ImageUpload } from '@/components/admin/image-upload';

interface UploadedImage {
  id?: string;
  url: string;
  alt?: string;
  order?: number;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface ProductFormInitialData {
  id?: string;
  name: string;
  description: string | null;
  price: string | number | null;
  categoryId: string;
  featured: boolean;
  published: boolean;
  images: UploadedImage[];
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface ProductFormPageProps {
  initialData?: ProductFormInitialData;
  isEditing: boolean;
}

function slugify(text: string): string {
  const turkishMap: Record<string, string> = {
    'ğ': 'g', 'Ğ': 'g',
    'ü': 'u', 'Ü': 'u',
    'ş': 's', 'Ş': 's',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ç': 'c', 'Ç': 'c',
  };

  let result = text;
  for (const [from, to] of Object.entries(turkishMap)) {
    result = result.replace(new RegExp(from, 'g'), to);
  }

  return result
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function ProductFormPage({ initialData, isEditing }: ProductFormPageProps) {
  const router = useRouter();

  const [name, setName] = useState(initialData?.name ?? '');
  const [slug, setSlug] = useState(initialData?.slug ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [price, setPrice] = useState(
    initialData?.price != null ? String(initialData.price) : ''
  );
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? '');
  const [featured, setFeatured] = useState(initialData?.featured ?? false);
  const [published, setPublished] = useState(initialData?.published ?? true);
  const [metaTitle, setMetaTitle] = useState(initialData?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(initialData?.metaDescription ?? '');
  const [images, setImages] = useState<UploadedImage[]>(initialData?.images ?? []);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.data ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (autoSlug) {
      setSlug(slugify(value));
    }
    if (errors.name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Ürün adı gereklidir';
    }
    if (!categoryId) {
      newErrors.categoryId = 'Kategori seçimi gereklidir';
    }
    if (price && (isNaN(Number(price)) || Number(price) < 0)) {
      newErrors.price = 'Geçerli bir fiyat giriniz';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);

    try {
      const body = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: price ? Number(price) : undefined,
        categoryId,
        featured,
        published,
      };

      if (isEditing && initialData?.id) {
        // Update product
        const res = await fetch(`/api/admin/products/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Ürün güncellenemedi');
        }

        // Handle image changes
        const existingImages = initialData.images ?? [];
        const existingIds = new Set(existingImages.map((img) => img.id).filter(Boolean));
        const newImageIds = new Set(images.map((img) => img.id).filter(Boolean));

        // Delete removed images
        const toDelete = existingImages.filter((img) => img.id && !newImageIds.has(img.id));
        await Promise.all(
          toDelete.map((img) =>
            fetch(`/api/admin/products/${initialData.id}/images?imageId=${img.id}`, {
              method: 'DELETE',
            })
          )
        );

        // Add new images
        const toAdd = images.filter((img) => !img.id || !existingIds.has(img.id));
        await Promise.all(
          toAdd.map((img, index) =>
            fetch(`/api/admin/products/${initialData.id}/images`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: img.url,
                alt: img.alt || name,
                order: index,
              }),
            })
          )
        );

        toast.success('Ürün başarıyla güncellendi');
      } else {
        // Create product
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Ürün oluşturulamadı');
        }

        const { data: product } = await res.json();

        // Create images
        if (images.length > 0) {
          await Promise.all(
            images.map((img, index) =>
              fetch(`/api/admin/products/${product.id}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: img.url,
                  alt: img.alt || name,
                  order: index,
                }),
              })
            )
          );
        }

        toast.success('Ürün başarıyla oluşturuldu');
      }

      router.push('/admin/urunler');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <Link href="/admin" className="hover:text-[#1a365d] dark:hover:text-[#d4a843]">
            Yönetim Paneli
          </Link>
          {' / '}
          <Link href="/admin/urunler" className="hover:text-[#1a365d] dark:hover:text-[#d4a843]">
            Ürünler
          </Link>
          {' / '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">
            {isEditing ? 'Düzenle' : 'Yeni Ürün'}
          </span>
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {isEditing ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle'}
        </h1>
        {isEditing && initialData?.name && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{initialData.name}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column - Main fields */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
                Genel Bilgiler
              </h2>

              {/* Name */}
              <div className="mb-5">
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ürün Adı *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={`w-full rounded-lg border bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 ${
                    errors.name
                      ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                      : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
                  }`}
                  placeholder="Ürün adını giriniz"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

              {/* Slug */}
              <div className="mb-5">
                <label htmlFor="slug" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slug
                </label>
                <input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                  placeholder="urun-slug"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  URL&apos;de kullanilacak benzersiz isim. Bos birakilabilir.
                </p>
              </div>

              {/* Description */}
              <div className="mb-5">
                <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Aciklama
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                  placeholder="Urun aciklamasini giriniz"
                />
              </div>

              {/* Price and Category */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="price" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fiyat
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">&#8378;</span>
                    <input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (errors.price) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.price;
                            return next;
                          });
                        }
                      }}
                      className={`w-full rounded-lg border bg-white py-2.5 pl-8 pr-4 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 ${
                        errors.price
                          ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                          : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
                </div>

                <div>
                  <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategori *
                  </label>
                  {categoriesLoading ? (
                    <div className="flex h-[42px] items-center rounded-lg border border-[#e2e8f0] bg-white px-4 dark:border-[#334155] dark:bg-[#0f172a]">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a365d] dark:border-gray-700 dark:border-t-[#d4a843]" />
                      <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">Yükleniyor...</span>
                    </div>
                  ) : (
                    <select
                      id="categoryId"
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        if (errors.categoryId) {
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.categoryId;
                            return next;
                          });
                        }
                      }}
                      className={`w-full rounded-lg border bg-white px-4 py-2.5 text-gray-900 transition-colors focus:outline-none dark:bg-[#0f172a] dark:text-white ${
                        errors.categoryId
                          ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                          : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
                      }`}
                    >
                      <option value="">Kategori seciniz</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.categoryId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId}</p>}
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
                Görseller
              </h2>
              <ImageUpload images={images} onImagesChange={setImages} />
            </div>

            {/* SEO Section */}
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
                SEO Ayarlari
              </h2>

              <div className="mb-5">
                <label htmlFor="metaTitle" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta Baslik
                </label>
                <input
                  id="metaTitle"
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                  placeholder="Sayfa basligi (SEO)"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {metaTitle.length}/60 karakter
                </p>
              </div>

              <div>
                <label htmlFor="metaDescription" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta Aciklama
                </label>
                <textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                  placeholder="Sayfa aciklamasi (SEO)"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {metaDescription.length}/160 karakter
                </p>
              </div>
            </div>
          </div>

          {/* Right column - Status & Actions */}
          <div className="space-y-6">
            {/* Status */}
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
                Durum
              </h2>

              <div className="space-y-4">
                {/* Published toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Yayinda</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {published ? 'Urun sitede gorunur' : 'Urun taslak olarak saklanir'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublished(!published)}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    style={{ backgroundColor: published ? '#22c55e' : '#cbd5e1' }}
                    role="switch"
                    aria-checked={published}
                  >
                    <span
                      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                      style={{ transform: published ? 'translateX(1.25rem)' : 'translateX(0)' }}
                    />
                  </button>
                </div>

                {/* Featured toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Öne Cikan</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Ana sayfada öne cikarilir
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeatured(!featured)}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                    style={{ backgroundColor: featured ? '#d4a843' : '#cbd5e1' }}
                    role="switch"
                    aria-checked={featured}
                  >
                    <span
                      className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                      style={{ transform: featured ? 'translateX(1.25rem)' : 'translateX(0)' }}
                    />
                  </button>
                </div>
              </div>

              {/* Status badge */}
              <div className="mt-5 rounded-lg border border-[#e2e8f0] bg-gray-50 px-4 py-3 dark:border-[#334155] dark:bg-[#0f172a]">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      published ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {published ? 'Yayinda' : 'Taslak'}
                  </span>
                  {featured && (
                    <span className="ml-auto rounded-full bg-[#d4a843]/20 px-2 py-0.5 text-xs font-medium text-[#d4a843]">
                      Öne Cikan
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1a365d] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
                >
                  {saving && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {isEditing ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/admin/urunler')}
                  className="w-full rounded-lg border border-[#e2e8f0] px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Iptal
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
