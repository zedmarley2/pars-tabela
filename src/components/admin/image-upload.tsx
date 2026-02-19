'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface UploadedImage {
  id?: string;
  url: string;
  alt?: string;
  order?: number;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({ images, onImagesChange }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<UploadedImage | null> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Geçersiz dosya tipi: ${file.name}. Sadece JPG, PNG, WebP, GIF.`);
      return null;
    }
    if (file.size > MAX_SIZE) {
      setError(`Dosya çok büyük: ${file.name}. Maksimum 5MB.`);
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Yükleme hatası');
    }

    const { data } = await res.json();
    return { url: data.url, alt: file.name };
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setUploading(true);
    setProgress(0);

    try {
      const fileArray = Array.from(files);
      const results: UploadedImage[] = [];

      for (let i = 0; i < fileArray.length; i++) {
        const result = await uploadFile(fileArray[i]);
        if (result) {
          results.push(result);
        }
        setProgress(Math.round(((i + 1) / fileArray.length) * 100));
      }

      if (results.length > 0) {
        onImagesChange([...images, ...results.map((img, i) => ({
          ...img,
          order: images.length + i,
        }))]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yükleme sırasında hata oluştu');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [images, onImagesChange, uploadFile]);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    e.target.value = '';
  }

  function removeImage(index: number) {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all ${
          dragOver
            ? 'border-[#1a365d] bg-[#1a365d]/5 dark:border-[#d4a843] dark:bg-[#d4a843]/5'
            : 'border-[#e2e8f0] hover:border-gray-300 hover:bg-gray-50 dark:border-[#334155] dark:hover:border-gray-600 dark:hover:bg-white/5'
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#1a365d] dark:border-gray-700 dark:border-t-[#d4a843]" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Yükleniyor... {progress}%</p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-[#1a365d] transition-all dark:bg-[#d4a843]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <svg className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Resim yüklemek için <span className="font-medium text-[#1a365d] dark:text-[#d4a843]">sürükleyin</span> veya <span className="font-medium text-[#1a365d] dark:text-[#d4a843]">tıklayın</span>
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">JPG, PNG, WebP, GIF (maks. 5MB)</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <div
              key={`${img.url}-${index}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-[#e2e8f0] bg-gray-50 dark:border-[#334155] dark:bg-[#0f172a]"
            >
              <Image
                src={img.url}
                alt={img.alt || 'Ürün görseli'}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label="Görseli kaldır"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-white">{img.alt || 'Görsel'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
