'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  Search,
  Upload,
  Trash2,
  Copy,
  ImageIcon,
  CloudUpload,
  Calendar,
  HardDrive,
} from 'lucide-react';

interface MediaItem {
  id: string;
  filename: string;
  path: string;
  url: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white dark:border-[#334155] dark:bg-[#1e293b]"
        >
          <div className="aspect-square animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(total / limit);

  const fetchMedia = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', String(limit));
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMedia(data.data ?? []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? p);
      } else {
        toast.error('Medya dosyaları yüklenirken hata oluştu');
      }
    } catch {
      toast.error('Medya dosyaları yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [search, limit]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMedia]);

  function handlePageChange(newPage: number) {
    fetchMedia(newPage);
  }

  async function handleUpload(files: FileList | File[]) {
    const validFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`Desteklenmeyen dosya türü: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Dosya çok büyük (maks 5MB): ${file.name}`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of validFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          successCount++;
        } else {
          const data = await res.json();
          toast.error(data.error || `Yükleme başarısız: ${file.name}`);
        }
      } catch {
        toast.error(`Yükleme hatası: ${file.name}`);
      }
    }

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? 'Dosya başarıyla yüklendi'
          : `${successCount} dosya başarıyla yüklendi`
      );
      fetchMedia(1);
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/media?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia((prev) => prev.filter((m) => m.id !== id));
        setTotal((prev) => prev - 1);
        toast.success('Dosya silindi');
      } else {
        toast.error('Dosya silinirken hata oluştu');
      }
    } catch {
      toast.error('Dosya silinirken hata oluştu');
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  }

  async function handleCopyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL kopyalandı');
    } catch {
      toast.error('URL kopyalanamadı');
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Medya Kütüphanesi</span>
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Medya Kütüphanesi
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Toplam {total} dosya
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
          >
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Dosya Yükle
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-[#1a365d] bg-[#1a365d]/5 dark:border-[#d4a843] dark:bg-[#d4a843]/5'
            : 'border-[#e2e8f0] bg-white hover:border-[#1a365d]/50 dark:border-[#334155] dark:bg-[#1e293b] dark:hover:border-[#d4a843]/50'
        }`}
      >
        <CloudUpload
          className={`mx-auto h-10 w-10 ${
            dragActive
              ? 'text-[#1a365d] dark:text-[#d4a843]'
              : 'text-gray-400 dark:text-gray-500'
          }`}
        />
        <p className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          {uploading
            ? 'Yükleniyor...'
            : dragActive
              ? 'Dosyayı bırakın'
              : 'Dosyaları sürükleyip bırakın veya tıklayın'}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          JPEG, PNG, WebP, GIF - Maks. 5MB
        </p>
      </div>

      {/* Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Dosya adı ile ara..."
            className="w-full rounded-lg border border-[#e2e8f0] bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]"
          />
        </div>
      </div>

      {/* Media grid */}
      {loading ? (
        <LoadingSkeleton />
      ) : media.length === 0 ? (
        <div className="rounded-xl border border-[#e2e8f0] bg-white py-20 text-center shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Henüz medya dosyası bulunmuyor
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 text-sm font-medium text-[#1a365d] hover:underline dark:text-[#d4a843]"
          >
            İlk dosyayı yükle
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {media.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onCopyUrl={() => handleCopyUrl(item.url)}
              onDelete={() => setDeleteConfirm(item.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Önceki
          </button>
          <span className="px-3 text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded-lg border border-[#e2e8f0] px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
          >
            Sonraki
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
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
              <h3 className="text-center text-lg font-semibold text-gray-900 dark:text-white">
                Dosyayı Sil
              </h3>
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Bu dosyayı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 rounded-lg border border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                >
                  İptal
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(deleteConfirm)}
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

/* ========== Media Card Component ========== */

interface MediaCardProps {
  item: MediaItem;
  onCopyUrl: () => void;
  onDelete: () => void;
}

function MediaCard({ item, onCopyUrl, onDelete }: MediaCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm transition-shadow hover:shadow-md dark:border-[#334155] dark:bg-[#1e293b]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-[#0f172a]">
        <Image
          src={item.url}
          alt={item.filename}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center gap-3 bg-black/50"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCopyUrl();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-lg transition-colors hover:bg-white"
                title="URL Kopyala"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg transition-colors hover:bg-red-600"
                title="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-3">
        <p
          className="truncate text-sm font-medium text-gray-900 dark:text-white"
          title={item.filename}
        >
          {item.filename}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(item.size)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
