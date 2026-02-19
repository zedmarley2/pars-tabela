'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Tags, Plus, Pencil, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  _count: { products: number };
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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [autoSlug, setAutoSlug] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data ?? []);
      }
    } catch {
      toast.error('Kategoriler yüklenirken hata olustu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function resetForm() {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormOrder('0');
    setAutoSlug(true);
    setFormError(null);
    setEditingId(null);
    setShowModal(false);
  }

  function openNewModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(cat: Category) {
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description ?? '');
    setFormOrder(String(cat.order));
    setAutoSlug(false);
    setEditingId(cat.id);
    setFormError(null);
    setShowModal(true);
  }

  function handleNameChange(value: string) {
    setFormName(value);
    if (autoSlug) {
      setFormSlug(slugify(value));
    }
  }

  async function handleSave() {
    if (!formName.trim()) {
      setFormError('Kategori adi gereklidir');
      return;
    }
    if (!formSlug.trim()) {
      setFormError('Slug gereklidir');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const body = {
        name: formName.trim(),
        slug: formSlug.trim(),
        description: formDescription.trim() || undefined,
        order: parseInt(formOrder, 10) || 0,
      };

      const url = editingId
        ? `/api/admin/categories/${editingId}`
        : '/api/admin/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Bir hata olustu');
        return;
      }

      toast.success(editingId ? 'Kategori güncellendi' : 'Kategori olusturuldu');
      resetForm();
      fetchCategories();
    } catch {
      setFormError('Bir hata olustu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Silinemedi');
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== id));
        toast.success('Kategori silindi');
      }
    } catch {
      toast.error('Silme sirasinda hata olustu');
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  async function moveOrder(cat: Category, direction: 'up' | 'down') {
    const sorted = [...categories].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((c) => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;

    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const other = sorted[swapIdx];
    const catOrder = cat.order;
    const otherOrder = other.order;

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === cat.id) return { ...c, order: otherOrder };
        if (c.id === other.id) return { ...c, order: catOrder };
        return c;
      })
    );

    try {
      await Promise.all([
        fetch(`/api/admin/categories/${cat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: otherOrder }),
        }),
        fetch(`/api/admin/categories/${other.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order: catOrder }),
        }),
      ]);
    } catch {
      toast.error('Sira güncellenirken hata olustu');
      fetchCategories(); // Re-fetch on error
    }
  }

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli / <span className="text-[#1a365d] dark:text-[#d4a843]">Kategoriler</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kategoriler</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toplam {categories.length} kategori
            </p>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90"
          >
            <Plus className="h-4 w-4" />
            Yeni Kategori
          </button>
        </div>
      </div>

      {/* Categories table */}
      <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-4 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="py-20 text-center">
            <Tags className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
            <p className="mt-3 text-gray-500 dark:text-gray-400">Henüz kategori eklenmemis.</p>
            <button
              type="button"
              onClick={openNewModal}
              className="mt-3 text-sm font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
            >
              Ilk kategoriyi ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-left dark:border-[#334155]">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Sira</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ad</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Aciklama</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Ürün Sayisi</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Islemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] dark:divide-[#334155]">
                {sortedCategories.map((cat, idx) => (
                  <tr key={cat.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className="mr-2 text-sm font-medium text-gray-500 dark:text-gray-400">{cat.order}</span>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveOrder(cat, 'up')}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-gray-200"
                          title="Yukari tasi"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === sortedCategories.length - 1}
                          onClick={() => moveOrder(cat, 'down')}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 dark:hover:bg-white/10 dark:hover:text-gray-200"
                          title="Asagi tasi"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-white/10 dark:text-gray-400">
                        {cat.slug}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-xs truncate text-sm text-gray-500 dark:text-gray-400">
                        {cat.description || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-[#1a365d]/10 px-2.5 py-0.5 text-xs font-medium text-[#1a365d] dark:bg-[#d4a843]/20 dark:text-[#d4a843]">
                        {cat._count.products}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(cat)}
                          className="rounded-lg border border-[#e2e8f0] p-2 text-gray-700 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-300 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(cat.id)}
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

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingId ? 'Kategori Düzenle' : 'Yeni Kategori'}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
                  <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="cat-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ad *
                  </label>
                  <input
                    id="cat-name"
                    type="text"
                    value={formName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                    placeholder="Kategori adi"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="cat-slug" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Slug *
                  </label>
                  <input
                    id="cat-slug"
                    type="text"
                    value={formSlug}
                    onChange={(e) => {
                      setAutoSlug(false);
                      setFormSlug(e.target.value);
                    }}
                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                    placeholder="kategori-slug"
                  />
                </div>
                <div>
                  <label htmlFor="cat-desc" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Aciklama
                  </label>
                  <textarea
                    id="cat-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                    placeholder="Kategori aciklamasi"
                  />
                </div>
                <div>
                  <label htmlFor="cat-order" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sira
                  </label>
                  <input
                    id="cat-order"
                    type="number"
                    min="0"
                    value={formOrder}
                    onChange={(e) => setFormOrder(e.target.value)}
                    className="w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
                >
                  {saving && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  {editingId ? 'Güncelle' : 'Kaydet'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-[#e2e8f0] px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Iptal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-xl dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white">Kategoriyi Sil</h3>
              {(() => {
                const cat = categories.find((c) => c.id === deleteConfirmId);
                if (cat && cat._count.products > 0) {
                  return (
                    <p className="mt-2 text-center text-sm text-amber-600 dark:text-amber-400">
                      Bu kategoride {cat._count.products} ürün bulunmaktadir. Silmeden önce ürünleri baska bir kategoriye tasiyiniz.
                    </p>
                  );
                }
                return (
                  <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    Bu kategoriyi silmek istediginize emin misiniz? Bu islem geri alinamaz.
                  </p>
                );
              })()}
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  Iptal
                </button>
                <button
                  type="button"
                  disabled={
                    deleting ||
                    (categories.find((c) => c.id === deleteConfirmId)?._count.products ?? 0) > 0
                  }
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting && (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  )}
                  Evet, Sil
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
