'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Package, Plus, Search, Trash2, Pencil, ChevronUp, ChevronDown } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  categoryId: string;
  featured: boolean;
  published: boolean;
  category: Category;
  images: ProductImage[];
  createdAt: string;
}

type SortField = 'name' | 'createdAt' | 'price';
type SortOrder = 'asc' | 'desc';

export default function AdminProductsPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'published' | 'draft'>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products?limit=1000');
      if (res.ok) {
        const data = await res.json();
        setAllProducts(data.data ?? []);
      }
    } catch {
      toast.error('Ürünler yüklenirken hata olustu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch('/api/admin/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.data ?? []);
        }
      } catch {
        // Silently fail
      }
    }
    loadCategories();
    fetchProducts();
  }, [fetchProducts]);

  // Filter, sort, paginate client-side
  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.description && p.description.toLowerCase().includes(s))
      );
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((p) => p.category.slug === categoryFilter);
    }

    // Status filter
    if (statusFilter === 'published') {
      result = result.filter((p) => p.published);
    } else if (statusFilter === 'draft') {
      result = result.filter((p) => !p.published);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'tr');
      } else if (sortField === 'price') {
        const aPrice = a.price ? Number(a.price) : 0;
        const bPrice = b.price ? Number(b.price) : 0;
        cmp = aPrice - bPrice;
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allProducts, search, categoryFilter, statusFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const paginatedProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, pageSize]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ChevronUp className="ml-1 inline h-3 w-3 text-gray-300 dark:text-gray-600" />;
    }
    return sortOrder === 'asc' ? (
      <ChevronUp className="ml-1 inline h-3 w-3 text-[#1a365d] dark:text-[#d4a843]" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3 text-[#1a365d] dark:text-[#d4a843]" />
    );
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Bu ürünü silmek istediginize emin misiniz? Bu islem geri alinamaz.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAllProducts((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.success('Ürün basariyla silindi');
      } else {
        toast.error('Ürün silinirken hata olustu');
      }
    } catch {
      toast.error('Ürün silinirken hata olustu');
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    if (
      !window.confirm(
        `${selectedIds.size} ürünü silmek istediginize emin misiniz? Bu islem geri alinamaz.`
      )
    ) {
      return;
    }

    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/admin/products/${id}`, { method: 'DELETE' })
        )
      );

      const succeeded = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as Response).ok
      ).length;
      const failed = results.length - succeeded;

      setAllProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());

      if (failed === 0) {
        toast.success(`${succeeded} ürün basariyla silindi`);
      } else {
        toast.error(`${succeeded} ürün silindi, ${failed} ürün silinemedi`);
      }
    } catch {
      toast.error('Toplu silme sirasinda hata olustu');
    } finally {
      setBulkDeleting(false);
    }
  }

  async function togglePublished(product: Product) {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !product.published }),
      });
      if (res.ok) {
        setAllProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, published: !p.published } : p))
        );
        toast.success(product.published ? 'Ürün taslaga alindi' : 'Ürün yayina alindi');
      }
    } catch {
      toast.error('Durum güncellenirken hata olustu');
    }
  }

  function formatDate(dateStr: string): string {
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(dateStr));
  }

  // Loading skeleton
  function LoadingSkeleton() {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli / <span className="text-[#1a365d] dark:text-[#d4a843]">Ürünler</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürünler</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toplam {filteredProducts.length} ürün
            </p>
          </div>
          <Link
            href="/admin/urunler/yeni"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90"
          >
            <Plus className="h-4 w-4" />
            Yeni Ürün Ekle
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara..."
            className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#1e293b] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#1e293b] dark:text-white dark:focus:border-[#d4a843]"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | 'published' | 'draft')}
          className="rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-gray-900 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#1e293b] dark:text-white dark:focus:border-[#d4a843]"
        >
          <option value="">Tümü</option>
          <option value="published">Yayinda</option>
          <option value="draft">Taslak</option>
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedIds.size} ürün secildi
          </span>
          <button
            type="button"
            disabled={bulkDeleting}
            onClick={handleBulkDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {bulkDeleting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Secilenleri Sil
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Secimi Kaldir
          </button>
        </div>
      )}

      {/* Products table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <LoadingSkeleton />
        ) : paginatedProducts.length === 0 ? (
          <div className="py-20 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">
              {search || categoryFilter || statusFilter ? 'Filtrelere uygun ürün bulunamadi.' : 'Henüz ürün eklenmemis.'}
            </p>
            {!search && !categoryFilter && !statusFilter && (
              <Link
                href="/admin/urunler/yeni"
                className="mt-3 inline-block text-sm font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
              >
                Ilk ürünü ekle
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d] dark:border-gray-600"
                    />
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Görsel
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button type="button" onClick={() => handleSort('name')} className="inline-flex items-center hover:text-gray-700 dark:hover:text-gray-200">
                      Ürün Adi <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Kategori
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button type="button" onClick={() => handleSort('price')} className="inline-flex items-center hover:text-gray-700 dark:hover:text-gray-200">
                      Fiyat <SortIcon field="price" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <button type="button" onClick={() => handleSort('createdAt')} className="inline-flex items-center hover:text-gray-700 dark:hover:text-gray-200">
                      Tarih <SortIcon field="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Islemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 rounded border-gray-300 text-[#1a365d] focus:ring-[#1a365d] dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {product.images[0] ? (
                        <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-[#e2e8f0] dark:border-[#334155]">
                          <Image
                            src={product.images[0].url}
                            alt={product.images[0].alt ?? product.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e2e8f0] bg-gray-50 dark:border-[#334155] dark:bg-[#0f172a]">
                          <Package className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/urunler/${product.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#1a365d] dark:text-white dark:hover:text-[#d4a843]"
                      >
                        {product.name}
                      </Link>
                      {product.featured && (
                        <span className="ml-2 text-xs font-medium text-[#d4a843]">Öne Cikan</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-white/10 dark:text-gray-300">
                        {product.category.name}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {product.price ? `${Number(product.price).toLocaleString('tr-TR')} \u20BA` : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => togglePublished(product)}
                        className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                        style={{ backgroundColor: product.published ? '#22c55e' : '#94a3b8' }}
                        role="switch"
                        aria-checked={product.published}
                        aria-label={product.published ? 'Yayinda' : 'Taslak'}
                      >
                        <span
                          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200"
                          style={{ transform: product.published ? 'translateX(1.25rem)' : 'translateX(0)' }}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(product.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/urunler/${product.id}`}
                          className="rounded-lg border border-[#e2e8f0] p-2 text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg border border-[#e2e8f0] p-2 text-gray-700 transition-colors hover:border-red-300 hover:text-red-600 dark:border-[#334155] dark:text-gray-300 dark:hover:border-red-500/30 dark:hover:text-red-400"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredProducts.length > 0 && (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sayfa basina:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-[#e2e8f0] bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#1e293b] dark:text-white"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
            >
              Önceki
            </button>
            <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
              {page} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
