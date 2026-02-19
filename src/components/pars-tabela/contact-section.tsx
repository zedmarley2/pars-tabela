'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/pars-tabela/toast';
import type { SettingsMap } from '@/lib/settings';

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const initialForm: FormData = { name: '', email: '', phone: '', message: '' };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function buildContactInfo(contact?: SettingsMap) {
  return [
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Adres',
      value: contact?.address || 'Organize Sanayi Bölgesi, 12. Cadde No:8, Isparta, Türkiye',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      ),
      label: 'Telefon',
      value: contact?.phone || '+90 (246) 555 0123',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      label: 'E-posta',
      value: contact?.email || 'info@parstabela.com',
    },
    {
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Çalışma Saatleri',
      value: contact?.working_hours_weekday || 'Pazartesi - Cuma: 08:00 - 18:00',
    },
  ];
}

const inputClasses =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1f2937] placeholder-gray-400 transition-all focus:border-[#1a365d] focus:outline-none focus:ring-1 focus:ring-[#1a365d] dark:border-[#334155] dark:bg-[#1e293b] dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-[#d4a843] dark:focus:ring-[#d4a843]';

interface ContactContent {
  title?: string;
  subtitle?: string;
  mapUrl?: string;
}

interface ContactSectionProps {
  contact?: SettingsMap;
  content?: ContactContent | null;
}

export function ContactSection({ contact, content }: ContactSectionProps) {
  const CONTACT_INFO = buildContactInfo(contact);
  const mapsUrl = content?.mapUrl || contact?.maps_url || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d99942.0!2d30.28!3d37.76!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14c5b0a7f5e9!2sIsparta!5e0!3m2!1str!2str!4v1';
  const { toast } = useToast();
  const [form, setForm] = useState<FormData>(initialForm);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/pars-tabela/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Bir hata oluştu.');
      }

      setStatus('success');
      setForm(initialForm);
      toast('Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.', 'success');
    } catch (err) {
      setStatus('error');
      toast(err instanceof Error ? err.message : 'Bir hata oluştu.', 'error');
    }
  }

  return (
    <section
      id="iletisim"
      className="bg-white py-24 transition-colors duration-300 dark:bg-[#0f172a]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-4xl font-bold text-[#1a365d] sm:text-5xl dark:text-white">
            {content?.title || 'İletişim'}
          </h2>
          <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
            {content?.subtitle || 'Projeleriniz için bizimle iletişime geçin'}
          </p>
        </div>

        <motion.div
          className="grid gap-12 lg:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {/* Left column - Contact info cards */}
          <motion.div variants={itemVariants} className="space-y-4">
            {CONTACT_INFO.map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-4 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 dark:border-[#334155] dark:bg-[#1e293b]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#1a365d]/10 text-[#1a365d] dark:bg-[#d4a843]/10 dark:text-[#d4a843]">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {item.label}
                  </p>
                  <p className="font-medium text-[#1f2937] dark:text-white">{item.value}</p>
                </div>
              </div>
            ))}

            {/* Map */}
            <div className="overflow-hidden rounded-xl border border-[#e2e8f0] dark:border-[#334155]">
              <iframe
                title="Pars Tabela Konum"
                src={mapsUrl}
                width="100%"
                height="250"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>

          {/* Right column - Contact form */}
          <motion.div variants={itemVariants}>
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-6 sm:p-8 dark:border-[#334155] dark:bg-[#1e293b]"
            >
              <div>
                <label
                  htmlFor="contact-name"
                  className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                >
                  Ad Soyad
                </label>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Adınız ve soyadınız"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                >
                  E-posta
                </label>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="ornek@email.com"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                >
                  Telefon
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+90 (5XX) XXX XX XX"
                  className={inputClasses}
                />
              </div>

              <div>
                <label
                  htmlFor="contact-message"
                  className="mb-1.5 block text-sm font-medium text-[#1f2937] dark:text-gray-300"
                >
                  Mesaj
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Projeniz hakkında bize bilgi verin..."
                  className={inputClasses}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full rounded-lg bg-[#1a365d] px-6 py-3 text-base font-semibold text-white transition-all duration-300 hover:bg-[#1a365d]/90 hover:shadow-md disabled:opacity-50 dark:bg-[#d4a843] dark:text-[#0f172a] dark:hover:bg-[#e0b854]"
              >
                {status === 'loading' ? 'Gönderiliyor...' : 'Mesaj Gönder'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
