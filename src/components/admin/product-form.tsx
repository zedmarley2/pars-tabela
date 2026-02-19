'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/admin/image-upload';

interface ProductImage {
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

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  featured: boolean;
  published: boolean;
}

interface ProductFormProps {
  initialData?: {
    id: string;
    name: string;
    description: string | null;
    price: string | number | null;
    categoryId: string;
    featured: boolean;
    published: boolean;
    images: ProductImage[];
  };
  onSubmit: (data: ProductFormData, images: ProductImage[]) => Promise<void>;
  isEditing: boolean;
}

export function ProductForm({ initialData, onSubmit, isEditing }: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [images, setImages] = useState<ProductImage[]>(initialData?.images ?? []);

  const [form, setForm] = useState<ProductFormData>({
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    price: initialData?.price != null ? String(initialData.price) : '',
    categoryId: initialData?.categoryId ?? '',
    featured: initialData?.featured ?? false,
    published: initialData?.published ?? true,
  });

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

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Ürün adı gereklidir';
    }
    if (!form.categoryId) {
      newErrors.categoryId = 'Kategori seçimi gereklidir';
    }
    if (form.price && (isNaN(Number(form.price)) || Number(form.price) <= 0)) {
      newErrors.price = 'Geçerli bir fiyat giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(form, images);
    } catch {
      setErrors({ submit: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
    } finally {
      setLoading(false);
    }
  }

  function updateField(field: keyof ProductFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Ürün Adı *
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className={`w-full rounded-lg border bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none dark:bg-[#1e293b] dark:text-white dark:placeholder-gray-500 ${
                errors.name
                  ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                  : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
              }`}
              placeholder="Ürün adını giriniz"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Açıklama
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#1e293b] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
              placeholder="Ürün açıklamasını giriniz"
            />
          </div>

          {/* Price */}
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
                value={form.price}
                onChange={(e) => updateField('price', e.target.value)}
                className={`w-full rounded-lg border bg-white py-2.5 pl-8 pr-4 text-gray-900 placeholder-gray-400 transition-colors focus:outline-none dark:bg-[#1e293b] dark:text-white dark:placeholder-gray-500 ${
                  errors.price
                    ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                    : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="categoryId" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kategori *
            </label>
            {categoriesLoading ? (
              <div className="flex h-11 items-center rounded-lg border border-[#e2e8f0] bg-white px-4 dark:border-[#334155] dark:bg-[#1e293b]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a365d] dark:border-gray-700 dark:border-t-[#d4a843]" />
                <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">Kategoriler yükleniyor...</span>
              </div>
            ) : (
              <select
                id="categoryId"
                value={form.categoryId}
                onChange={(e) => updateField('categoryId', e.target.value)}
                className={`w-full rounded-lg border bg-white px-4 py-2.5 text-gray-900 transition-colors focus:outline-none dark:bg-[#1e293b] dark:text-white ${
                  errors.categoryId
                    ? 'border-red-300 focus:border-red-500 dark:border-red-500/50'
                    : 'border-[#e2e8f0] focus:border-[#1a365d] dark:border-[#334155] dark:focus:border-[#d4a843]'
                }`}
              >
                <option value="">Kategori seçiniz</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}
            {errors.categoryId && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId}</p>}
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-8">
            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                onClick={() => updateField('featured', !form.featured)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: form.featured ? '#d4a843' : '#cbd5e1' }}
                role="switch"
                aria-checked={form.featured}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                  style={{ transform: form.featured ? 'translateX(1.25rem)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">Öne Çıkan</span>
            </label>

            <label className="flex cursor-pointer items-center gap-3">
              <button
                type="button"
                onClick={() => updateField('published', !form.published)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                style={{ backgroundColor: form.published ? '#22c55e' : '#cbd5e1' }}
                role="switch"
                aria-checked={form.published}
              >
                <span
                  className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                  style={{ transform: form.published ? 'translateX(1.25rem)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">Yayında</span>
            </label>
          </div>
        </div>

        {/* Right column - Images */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Görseller</label>
          <ImageUpload images={images} onImagesChange={setImages} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-[#e2e8f0] pt-6 dark:border-[#334155]">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
        >
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {isEditing ? 'Güncelle' : 'Kaydet'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="rounded-lg border border-[#e2e8f0] px-6 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
