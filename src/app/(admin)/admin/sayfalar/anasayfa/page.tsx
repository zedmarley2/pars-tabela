'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
}

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface AboutContent {
  text1: string;
  text2: string;
  text3: string;
  stats: { value: number; suffix: string; label: string }[];
}

interface ContactContent {
  title: string;
  subtitle: string;
  mapUrl: string;
}

const DEFAULT_HERO: HeroContent = {
  title: 'Profesyonel Tabela & Reklam Çözümleri',
  subtitle: 'Işığınızla Fark Yaratın',
  description: '15 yılı aşkın deneyim ile markanızı en iyi şekilde yansıtan tabela çözümleri sunuyoruz',
  ctaText: 'Hizmetlerimizi Keşfedin',
  ctaLink: '#hizmetlerimiz',
};

const DEFAULT_SERVICES: ServiceItem[] = [
  { id: '1', icon: 'lightbulb', title: 'Neon Tabela', description: 'Klasik ve modern neon tabelalar ile markanızı ön plana çıkarın.' },
  { id: '2', icon: 'zap', title: 'LED Tabela', description: 'Enerji tasarruflu LED tabelalar ile 7/24 görünürlük sağlayın.' },
  { id: '3', icon: 'monitor', title: 'Elektronik Tabela', description: 'Dijital ekranlar ve programlanabilir LED paneller ile dinamik içerik gösterin.' },
  { id: '4', icon: 'type', title: 'Kutu Harf', description: 'Işıklı ve ışıksız kutu harf uygulamaları.' },
];

const DEFAULT_ABOUT: AboutContent = {
  text1: 'Pars Tabela olarak 15 yılı aşkın deneyimimizle Türkiye\'nin önde gelen tabela üreticilerinden biriyiz.',
  text2: 'Neon tabeladan LED aydınlatmaya, kutu harften elektronik tabelalara kadar geniş ürün yelpazemizle her sektöre özel çözümler üretiyoruz.',
  text3: 'Müşteri memnuniyetini her zaman ön planda tutarak, kaliteli malzeme ve profesyonel işçilik ile uzun ömürlü ürünler sunmayı hedefliyoruz.',
  stats: [
    { value: 15, suffix: '+', label: 'Yıllık Deneyim' },
    { value: 3000, suffix: '+', label: 'Tamamlanan Proje' },
    { value: 500, suffix: '+', label: 'Mutlu Müşteri' },
  ],
};

const DEFAULT_CONTACT: ContactContent = {
  title: 'İletişim',
  subtitle: 'Projeleriniz için bizimle iletişime geçin',
  mapUrl: '',
};

const inputClass =
  'w-full rounded-lg border border-[#e2e8f0] bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-[#1a365d] focus:outline-none dark:border-[#334155] dark:bg-[#0f172a] dark:text-white dark:placeholder-gray-500 dark:focus:border-[#d4a843]';

const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300';

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function AnasayfaEditorPage() {
  const [hero, setHero] = useState<HeroContent>(DEFAULT_HERO);
  const [services, setServices] = useState<ServiceItem[]>(DEFAULT_SERVICES);
  const [about, setAbout] = useState<AboutContent>(DEFAULT_ABOUT);
  const [contact, setContact] = useState<ContactContent>(DEFAULT_CONTACT);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    hero: true,
    services: true,
    about: true,
    contact: true,
  });

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // Load existing data
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          const homepage = data.data?.homepage;
          if (homepage) {
            if (homepage.homepage_hero) {
              try { setHero({ ...DEFAULT_HERO, ...JSON.parse(homepage.homepage_hero) }); } catch { /* ignore */ }
            }
            if (homepage.homepage_services) {
              try {
                const parsed = JSON.parse(homepage.homepage_services);
                if (parsed.items?.length) setServices(parsed.items);
              } catch { /* ignore */ }
            }
            if (homepage.homepage_about) {
              try { setAbout({ ...DEFAULT_ABOUT, ...JSON.parse(homepage.homepage_about) }); } catch { /* ignore */ }
            }
            if (homepage.homepage_contact) {
              try { setContact({ ...DEFAULT_CONTACT, ...JSON.parse(homepage.homepage_contact) }); } catch { /* ignore */ }
            }
          }
        } else {
          toast.error('Veriler yüklenirken hata oluştu');
        }
      } catch {
        toast.error('Veriler yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const settingsArray = [
        { key: 'homepage_hero', value: JSON.stringify(hero), group: 'homepage' },
        { key: 'homepage_services', value: JSON.stringify({ items: services }), group: 'homepage' },
        { key: 'homepage_about', value: JSON.stringify(about), group: 'homepage' },
        { key: 'homepage_contact', value: JSON.stringify(contact), group: 'homepage' },
      ];

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsArray }),
      });

      if (res.ok) {
        toast.success('Anasayfa içeriği kaydedildi');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Kaydedilirken hata oluştu');
      }
    } catch {
      toast.error('Kaydedilirken hata oluştu');
    } finally {
      setSaving(false);
    }
  }

  // Service helpers
  function addService() {
    setServices((prev) => [
      ...prev,
      { id: generateId(), icon: 'lightbulb', title: '', description: '' },
    ]);
  }

  function removeService(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  function updateService(id: string, field: keyof ServiceItem, value: string) {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function moveService(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= services.length) return;
    const updated = [...services];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setServices(updated);
  }

  // Stat helpers
  function addStat() {
    setAbout((prev) => ({
      ...prev,
      stats: [...prev.stats, { value: 0, suffix: '+', label: '' }],
    }));
  }

  function removeStat(index: number) {
    setAbout((prev) => ({
      ...prev,
      stats: prev.stats.filter((_, i) => i !== index),
    }));
  }

  function updateStat(index: number, field: string, value: string | number) {
    setAbout((prev) => ({
      ...prev,
      stats: prev.stats.map((s, i) =>
        i === index ? { ...s, [field]: field === 'value' ? Number(value) : value } : s
      ),
    }));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Yönetim Paneli / Sayfa Yönetimi /{' '}
            <span className="text-[#1a365d] dark:text-[#d4a843]">Anasayfa</span>
          </p>
          <div className="mt-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anasayfa İçerik Düzenleme</h1>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yönetim Paneli / Sayfa Yönetimi /{' '}
          <span className="text-[#1a365d] dark:text-[#d4a843]">Anasayfa</span>
        </p>
        <div className="mt-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Anasayfa İçerik Düzenleme</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ana sayfa bölümlerinin içeriklerini düzenleyin
          </p>
        </div>
      </div>

      {/* Hero Section */}
      <CollapsibleCard
        title="Hero Bölümü"
        isOpen={openSections.hero}
        onToggle={() => toggleSection('hero')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Başlık</label>
            <input
              type="text"
              value={hero.title}
              onChange={(e) => setHero((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Profesyonel Tabela & Reklam Çözümleri"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Alt Başlık</label>
            <input
              type="text"
              value={hero.subtitle}
              onChange={(e) => setHero((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Işığınızla Fark Yaratın"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>CTA Buton Metni</label>
            <input
              type="text"
              value={hero.ctaText}
              onChange={(e) => setHero((prev) => ({ ...prev, ctaText: e.target.value }))}
              placeholder="Hizmetlerimizi Keşfedin"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Açıklama</label>
            <textarea
              value={hero.description}
              onChange={(e) => setHero((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="15 yılı aşkın deneyim ile..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>CTA Link</label>
            <input
              type="text"
              value={hero.ctaLink}
              onChange={(e) => setHero((prev) => ({ ...prev, ctaLink: e.target.value }))}
              placeholder="#hizmetlerimiz"
              className={inputClass}
            />
          </div>
        </div>
      </CollapsibleCard>

      {/* Services Section */}
      <CollapsibleCard
        title="Hizmetlerimiz Bölümü"
        isOpen={openSections.services}
        onToggle={() => toggleSection('services')}
      >
        <div className="space-y-4">
          {services.map((service, index) => (
            <div
              key={service.id}
              className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4 dark:border-[#334155] dark:bg-[#0f172a]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hizmet {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveService(index, 'up')}
                    disabled={index === 0}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Yukarı taşı"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveService(index, 'down')}
                    disabled={index === services.length - 1}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 disabled:opacity-30 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Aşağı taşı"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeService(service.id)}
                    className="rounded p-1 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>İkon</label>
                  <select
                    value={service.icon}
                    onChange={(e) => updateService(service.id, 'icon', e.target.value)}
                    className={inputClass}
                  >
                    <option value="lightbulb">Ampul (lightbulb)</option>
                    <option value="zap">Şimşek (zap)</option>
                    <option value="monitor">Monitör (monitor)</option>
                    <option value="type">Metin (type)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Başlık</label>
                  <input
                    type="text"
                    value={service.title}
                    onChange={(e) => updateService(service.id, 'title', e.target.value)}
                    placeholder="Hizmet adı"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className={labelClass}>Açıklama</label>
                  <input
                    type="text"
                    value={service.description}
                    onChange={(e) => updateService(service.id, 'description', e.target.value)}
                    placeholder="Hizmet açıklaması"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addService}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-400 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
          >
            <Plus className="h-4 w-4" />
            Hizmet Ekle
          </button>
        </div>
      </CollapsibleCard>

      {/* About Section */}
      <CollapsibleCard
        title="Hakkımızda Bölümü"
        isOpen={openSections.about}
        onToggle={() => toggleSection('about')}
      >
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Paragraf 1</label>
            <textarea
              value={about.text1}
              onChange={(e) => setAbout((prev) => ({ ...prev, text1: e.target.value }))}
              rows={3}
              placeholder="İlk paragraf metni..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Paragraf 2</label>
            <textarea
              value={about.text2}
              onChange={(e) => setAbout((prev) => ({ ...prev, text2: e.target.value }))}
              rows={3}
              placeholder="İkinci paragraf metni..."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className={labelClass}>Paragraf 3</label>
            <textarea
              value={about.text3}
              onChange={(e) => setAbout((prev) => ({ ...prev, text3: e.target.value }))}
              rows={3}
              placeholder="Üçüncü paragraf metni..."
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="border-t border-[#e2e8f0] pt-4 dark:border-[#334155]">
            <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">İstatistikler</h4>
            <div className="space-y-3">
              {about.stats.map((stat, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Değer</label>
                    <input
                      type="number"
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="w-20">
                    <label className={labelClass}>Sonek</label>
                    <input
                      type="text"
                      value={stat.suffix}
                      onChange={(e) => updateStat(index, 'suffix', e.target.value)}
                      placeholder="+"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Etiket</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Yıllık Deneyim"
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="mb-0.5 rounded p-2 text-red-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addStat}
                className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[#e2e8f0] px-4 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-[#1a365d] hover:text-[#1a365d] dark:border-[#334155] dark:text-gray-400 dark:hover:border-[#d4a843] dark:hover:text-[#d4a843]"
              >
                <Plus className="h-4 w-4" />
                İstatistik Ekle
              </button>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* Contact Section */}
      <CollapsibleCard
        title="İletişim Bölümü"
        isOpen={openSections.contact}
        onToggle={() => toggleSection('contact')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Başlık</label>
            <input
              type="text"
              value={contact.title}
              onChange={(e) => setContact((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="İletişim"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Alt Başlık</label>
            <input
              type="text"
              value={contact.subtitle}
              onChange={(e) => setContact((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder="Projeleriniz için bizimle iletişime geçin"
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Google Maps Embed URL</label>
            <input
              type="text"
              value={contact.mapUrl}
              onChange={(e) => setContact((prev) => ({ ...prev, mapUrl: e.target.value }))}
              placeholder="https://www.google.com/maps/embed?pb=..."
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Google Maps embed URL&apos;sini girin. Boş bırakırsanız varsayılan harita kullanılır.
            </p>
          </div>
        </div>
      </CollapsibleCard>

      {/* Save button */}
      <div className="flex items-center justify-end">
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
  );
}

/* ========== Collapsible Card Component ========== */

interface CollapsibleCardProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleCard({ title, isOpen, onToggle, children }: CollapsibleCardProps) {
  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-sm dark:border-[#334155] dark:bg-[#1e293b]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-[#e2e8f0] px-6 py-5 dark:border-[#334155]">
          {children}
        </div>
      )}
    </div>
  );
}
