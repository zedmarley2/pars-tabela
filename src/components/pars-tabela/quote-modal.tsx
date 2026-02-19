'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/pars-tabela/toast';

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productId?: string;
}

interface QuoteForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany: string;
  productType: string;
  description: string;
  dimensions: string;
}

const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: 'Seçiniz...' },
  { value: 'Neon Tabela', label: 'Neon Tabela' },
  { value: 'LED Tabela', label: 'LED Tabela' },
  { value: 'Elektronik Tabela', label: 'Elektronik Tabela' },
  { value: 'Kutu Harf', label: 'Kutu Harf' },
  { value: 'Işıklı Tabela', label: 'Işıklı Tabela' },
  { value: 'Totem Tabela', label: 'Totem Tabela' },
  { value: 'Diğer', label: 'Diğer' },
];

const inputClasses =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1f2937] placeholder-gray-400 transition-all focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] dark:border-[#334155] dark:bg-[#0f172a] dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]';

const selectClasses =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1f2937] transition-all focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] dark:border-[#334155] dark:bg-[#0f172a] dark:text-gray-100 dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]';

export function QuoteModal({ open, onClose, productName, productId }: QuoteModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState<QuoteForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerCompany: '',
    productType: '',
    description: `"${productName}" ürünü hakkında fiyat teklifi almak istiyorum.`,
    dimensions: '',
  });
  const [loading, setLoading] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function resetForm() {
    setForm({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerCompany: '',
      productType: '',
      description: `"${productName}" ürünü hakkında fiyat teklifi almak istiyorum.`,
      dimensions: '',
    });
    setSuccessRef(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, string | undefined> = {
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        description: form.description,
      };

      if (form.customerPhone) payload.customerPhone = form.customerPhone;
      if (form.customerCompany) payload.customerCompany = form.customerCompany;
      if (form.productType) payload.productType = form.productType;
      if (form.dimensions) payload.dimensions = form.dimensions;
      if (productId) payload.productId = productId;

      const res = await fetch('/api/pars-tabela/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      const data = await res.json();
      const refNumber = data.data?.referenceNumber || '';
      setSuccessRef(refNumber);
      toast('Teklif talebiniz başarıyla gönderildi!', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl sm:p-8 dark:border-[#334155] dark:bg-[#1e293b]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#1a365d] dark:text-white">
                    Teklif İste
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {productName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-gray-300"
                  aria-label="Kapat"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Success state */}
              {successRef ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <svg
                      className="h-8 w-8 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    Talebiniz alınmıştır. Referans numaranız:{' '}
                    <span className="font-bold text-[#1a365d] dark:text-[#d4a843]">
                      {successRef}
                    </span>
                    . En kısa sürede dönüş yapacağız.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-4 rounded-lg bg-[#1a365d] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a365d]/90 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#e0b854]"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                /* Form */
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="quote-name"
                      className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                    >
                      Ad Soyad *
                    </label>
                    <input
                      id="quote-name"
                      type="text"
                      name="customerName"
                      value={form.customerName}
                      onChange={handleChange}
                      required
                      placeholder="Adınız ve soyadınız"
                      className={inputClasses}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="quote-email"
                        className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                      >
                        E-posta *
                      </label>
                      <input
                        id="quote-email"
                        type="email"
                        name="customerEmail"
                        value={form.customerEmail}
                        onChange={handleChange}
                        required
                        placeholder="ornek@email.com"
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="quote-phone"
                        className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                      >
                        Telefon
                      </label>
                      <input
                        id="quote-phone"
                        type="tel"
                        name="customerPhone"
                        value={form.customerPhone}
                        onChange={handleChange}
                        placeholder="+90 (5XX) XXX XX XX"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="quote-company"
                      className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                    >
                      Firma
                    </label>
                    <input
                      id="quote-company"
                      type="text"
                      name="customerCompany"
                      value={form.customerCompany}
                      onChange={handleChange}
                      placeholder="Firma adınız (opsiyonel)"
                      className={inputClasses}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="quote-productType"
                        className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                      >
                        Ürün Tipi
                      </label>
                      <select
                        id="quote-productType"
                        name="productType"
                        value={form.productType}
                        onChange={handleChange}
                        className={selectClasses}
                      >
                        {PRODUCT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="quote-dimensions"
                        className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                      >
                        Boyutlar
                      </label>
                      <input
                        id="quote-dimensions"
                        type="text"
                        name="dimensions"
                        value={form.dimensions}
                        onChange={handleChange}
                        placeholder="ör. 3m x 1m"
                        className={inputClasses}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="quote-message"
                      className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                    >
                      Açıklama *
                    </label>
                    <textarea
                      id="quote-message"
                      name="description"
                      value={form.description}
                      onChange={handleChange}
                      required
                      rows={4}
                      placeholder="Projeniz hakkında bilgi verin..."
                      className={inputClasses}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 rounded-lg bg-[#1a365d] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#1a365d]/90 disabled:opacity-50 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#e0b854]"
                    >
                      {loading ? 'Gönderiliyor...' : 'Teklif Talep Et'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-lg border border-[#e2e8f0] px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-[#334155] dark:text-gray-300 dark:hover:bg-white/5"
                    >
                      İptal
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
