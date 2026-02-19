'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Globe,
  Phone,
  Share2,
  Search as SearchIcon,
  Palette,
  Image as ImageIcon2,
  Save,
  Loader2,
} from 'lucide-react';

type SettingsGroup = 'general' | 'contact' | 'social' | 'seo' | 'appearance' | 'identity';

interface TabConfig {
  key: SettingsGroup;
  label: string;
  icon: React.ElementType;
}

const TABS: TabConfig[] = [
  { key: 'general', label: 'Genel', icon: Globe },
  { key: 'contact', label: 'İletişim', icon: Phone },
  { key: 'social', label: 'Sosyal Medya', icon: Share2 },
  { key: 'seo', label: 'SEO', icon: SearchIcon },
  { key: 'appearance', label: 'Görünüm', icon: Palette },
  { key: 'identity', label: 'Site Kimliği', icon: ImageIcon2 },
];

interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'color' | 'select' | 'email';
  placeholder?: string;
  helper?: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
}

const FIELD_CONFIGS: Record<SettingsGroup, FieldConfig[]> = {
  general: [
    {
      key: 'site_name',
      label: 'Site Adı',
      type: 'text',
      placeholder: 'Pars Tabela',
      defaultValue: 'Pars Tabela',
    },
    {
      key: 'site_description',
      label: 'Site Açıklaması',
      type: 'textarea',
      placeholder: 'Sitenizin kısa açıklaması...',
    },
    {
      key: 'footer_text',
      label: 'Footer Metni',
      type: 'textarea',
      placeholder: 'Alt bilgi metni...',
    },
  ],
  contact: [
    {
      key: 'company_name',
      label: 'Firma Adı',
      type: 'text',
      placeholder: 'Pars Tabela',
    },
    {
      key: 'address',
      label: 'Adres',
      type: 'textarea',
      placeholder: 'Firma adresi...',
    },
    {
      key: 'phone',
      label: 'Telefon',
      type: 'text',
      placeholder: '+90 xxx xxx xx xx',
    },
    {
      key: 'email',
      label: 'E-posta',
      type: 'email',
      placeholder: 'info@example.com',
    },
    {
      key: 'maps_url',
      label: 'Google Maps URL',
      type: 'url',
      placeholder: 'https://www.google.com/maps/embed?...',
      helper: 'Google Maps embed URL giriniz',
    },
    {
      key: 'working_hours_weekday',
      label: 'Çalışma Saatleri (Hafta İçi)',
      type: 'text',
      placeholder: 'Pazartesi - Cuma: 08:00 - 18:00',
      defaultValue: 'Pazartesi - Cuma: 08:00 - 18:00',
    },
    {
      key: 'working_hours_saturday',
      label: 'Çalışma Saatleri (Cumartesi)',
      type: 'text',
      placeholder: 'Cumartesi: 09:00 - 14:00',
      defaultValue: 'Cumartesi: 09:00 - 14:00',
    },
    {
      key: 'working_hours_sunday',
      label: 'Çalışma Saatleri (Pazar)',
      type: 'text',
      placeholder: 'Pazar: Kapalı',
      defaultValue: 'Pazar: Kapalı',
    },
  ],
  social: [
    {
      key: 'instagram',
      label: 'Instagram',
      type: 'url',
      placeholder: 'https://instagram.com/...',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      type: 'url',
      placeholder: 'https://facebook.com/...',
    },
    {
      key: 'twitter',
      label: 'Twitter / X',
      type: 'url',
      placeholder: 'https://twitter.com/...',
    },
    {
      key: 'youtube',
      label: 'YouTube',
      type: 'url',
      placeholder: 'https://youtube.com/...',
    },
    {
      key: 'linkedin',
      label: 'LinkedIn',
      type: 'url',
      placeholder: 'https://linkedin.com/...',
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      type: 'text',
      placeholder: '+90 xxx xxx xx xx',
      helper: 'Telefon numarasını girin',
    },
  ],
  seo: [
    {
      key: 'meta_title',
      label: 'Meta Başlık',
      type: 'text',
      placeholder: 'Sayfa başlığı...',
      helper: 'Arama motorlarında görünen başlık (60 karakter önerilir)',
    },
    {
      key: 'meta_description',
      label: 'Meta Açıklama',
      type: 'textarea',
      placeholder: 'Sayfa açıklaması...',
      helper: 'Arama motorlarında görünen açıklama (160 karakter önerilir)',
    },
    {
      key: 'google_analytics_id',
      label: 'Google Analytics ID',
      type: 'text',
      placeholder: 'G-XXXXXXXXXX',
      helper: 'Google Analytics ölçüm ID\'si',
    },
    {
      key: 'google_search_console',
      label: 'Google Search Console',
      type: 'text',
      placeholder: 'Doğrulama kodu...',
      helper: 'HTML meta etiketi doğrulama kodu',
    },
  ],
  appearance: [
    {
      key: 'primary_color',
      label: 'Ana Renk',
      type: 'color',
      defaultValue: '#1a365d',
    },
    {
      key: 'secondary_color',
      label: 'İkincil Renk',
      type: 'color',
      defaultValue: '#d4a843',
    },
    {
      key: 'font',
      label: 'Yazı Tipi',
      type: 'select',
      options: [
        { value: 'Inter', label: 'Inter' },
        { value: 'Poppins', label: 'Poppins' },
        { value: 'Roboto', label: 'Roboto' },
        { value: 'Open Sans', label: 'Open Sans' },
      ],
    },
    {
      key: 'header_style',
      label: 'Üst Menü Stili',
      type: 'select',
      options: [
        { value: 'transparent', label: 'Şeffaf' },
        { value: 'solid', label: 'Düz' },
        { value: 'glass', label: 'Cam Efekti' },
      ],
    },
  ],
  identity: [
    {
      key: 'site_name',
      label: 'Site Adı',
      type: 'text',
      placeholder: 'Pars Tabela',
      defaultValue: 'Pars Tabela',
    },
    {
      key: 'site_tagline',
      label: 'Slogan',
      type: 'text',
      placeholder: 'Profesyonel Tabela & Reklam Çözümleri',
    },
    {
      key: 'logo_light',
      label: 'Logo (Açık Tema)',
      type: 'text',
      placeholder: '/uploads/logo-light.png',
      helper: 'Açık temada kullanılacak logo URL\'si. Medya sayfasından yükleyip URL\'yi yapıştırın.',
    },
    {
      key: 'logo_dark',
      label: 'Logo (Koyu Tema)',
      type: 'text',
      placeholder: '/uploads/logo-dark.png',
      helper: 'Koyu temada kullanılacak logo URL\'si.',
    },
    {
      key: 'favicon_url',
      label: 'Favicon',
      type: 'text',
      placeholder: '/favicon.ico',
      helper: 'Favicon dosyasının URL\'si (.ico veya .png)',
    },
  ],
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
          />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsGroup>('general');
  const [settings, setSettings] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data.data ?? {});
        } else {
          toast.error('Ayarlar yüklenirken hata oluştu');
        }
      } catch {
        toast.error('Ayarlar yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  function getFieldValue(group: SettingsGroup, key: string): string {
    const field = FIELD_CONFIGS[group]?.find((f) => f.key === key);
    return settings[group]?.[key] ?? field?.defaultValue ?? '';
  }

  function setFieldValue(group: SettingsGroup, key: string, value: string) {
    setSettings((prev) => ({
      ...prev,
      [group]: {
        ...(prev[group] ?? {}),
        [key]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fields = FIELD_CONFIGS[activeTab] ?? [];
      const settingsArray = fields.map((field) => ({
        key: field.key,
        value: getFieldValue(activeTab, field.key),
        group: activeTab,
      }));

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });

      if (res.ok) {
        toast.success('Ayarlar kaydedildi');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Ayarlar kaydedilirken hata oluştu');
      }
    } catch {
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Ayarlar</span>
        </p>
        <div className="mt-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ayarlar</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Site ayarlarını yönetin
          </p>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <>
          {/* Tab navigation */}
          <div className="border-b border-[#e2e8f0] dark:border-[#334155]">
            <div className="-mb-px flex gap-1 overflow-x-auto">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex flex-shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-[#d4a843] text-[#1a365d] dark:text-[#d4a843]'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab content */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
            <div className="grid gap-6 sm:grid-cols-2">
              {(FIELD_CONFIGS[activeTab] ?? []).map((field) => (
                <SettingsField
                  key={field.key}
                  field={field}
                  value={getFieldValue(activeTab, field.key)}
                  onChange={(val) => setFieldValue(activeTab, field.key, val)}
                />
              ))}
            </div>

            {/* Save button */}
            <div className="mt-8 flex items-center justify-end border-t border-[#e2e8f0] pt-6 dark:border-[#334155]">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1a365d] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1a365d]/90 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ========== Settings Field Component ========== */

interface SettingsFieldProps {
  field: FieldConfig;
  value: string;
  onChange: (val: string) => void;
}

function SettingsField({ field, value, onChange }: SettingsFieldProps) {
  const inputBaseClass =
    'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]';

  const isFullWidth = field.type === 'textarea' || field.type === 'url';

  return (
    <div className={isFullWidth ? 'sm:col-span-2' : ''}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {field.label}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.placeholder}
          className={`${inputBaseClass} resize-none`}
        />
      ) : field.type === 'select' ? (
        <select
          value={value || field.options?.[0]?.value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputBaseClass}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === 'color' ? (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={value || field.defaultValue || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-[#e2e8f0] bg-white p-1 dark:border-[#334155] dark:bg-[#0f172a]"
          />
          <input
            type="text"
            value={value || field.defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className={`${inputBaseClass} flex-1`}
          />
        </div>
      ) : (
        <input
          type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputBaseClass}
        />
      )}

      {field.helper && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{field.helper}</p>
      )}
    </div>
  );
}
