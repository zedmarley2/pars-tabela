# Pars Tabela

Profesyonel neon tabela, LED tabela ve elektronik tabela cozumleri.
Premium admin panel ile teklif/siparis yonetimi, urun katalogu ve musteri iliskileri.

## Quick Start

```bash
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
npm install

# Setup database
npx prisma db push
npx prisma generate

# Seed data (admin: admin@parstabela.com / admin123)
npm run seed

# Start development server
npm run dev
```

## Pages

### Public Website
- **/** — Ana Sayfa (Hero, hizmetler, urunler, hakkimizda, iletisim)
- **/urunlerimiz** — Urun Galerisi (filtrelenebilir, kategorili)
- **/urunlerimiz/[id]** — Urun Detayi (resim galerisi, teklif isteme)

### Admin Panel
- **/admin** — Dashboard (gelir grafikleri, istatistikler, pipeline)
- **/admin/teklifler** — Teklifler & Siparisler (Kanban board + liste gorunumu)
- **/admin/teklifler/[id]** — Teklif Detayi (kalemler, durum gecmisi, notlar)
- **/admin/urunler** — Urun Yonetimi (CRUD, filtreleme, siralama)
- **/admin/kategoriler** — Kategori Yonetimi (siralama, ekleme/duzenleme)
- **/admin/siparisler** — Iletisim Talepleri (durum takibi)
- **/admin/musteriler** — Musteri Listesi (toplu gorunum)
- **/admin/medya** — Medya Kutuphanesi (yukleme, yonetim)
- **/admin/sayfalar/anasayfa** — Anasayfa Icerik Duzenleyici (hero, hizmetler, hakkimizda, iletisim)
- **/admin/ayarlar** — Site Ayarlari (genel, iletisim, sosyal, SEO, gorunum, site kimligi)
- **/admin/guncelleme** — Otomatik Guncelleme (GitHub'dan cek, yedekle, geri yukle)

## Features

### Quote/Order Pipeline
8-stage pipeline: Yeni Talep -> Teklif Hazirlandi -> Teklif Gonderildi -> Onaylandi -> Uretimde -> Teslime Hazir -> Teslim Edildi / Iptal

- Kanban board with drag-and-drop columns
- Auto-generated reference numbers (PT-YYYY-NNN)
- Line items with auto-calculated KDV (18%)
- Status timeline and internal notes
- Real revenue tracking from delivered quotes

### Admin Dashboard
- Real-time revenue charts (monthly, from delivered quotes)
- Pipeline summary with status counts
- Product and inquiry statistics
- Recent activity feed

### Homepage Content Management
- Edit hero section (title, subtitle, CTA)
- Add/edit/reorder service cards
- Edit about section text and stats
- Edit contact section and map URL
- All changes reflect on public site immediately

### Site Identity
- Custom logo upload (light/dark mode)
- Favicon, site name, tagline
- Dynamic header/footer branding

### Dark/Light Mode
- Toggle between dark and light themes
- Persisted in localStorage
- All components support both modes

### Auto Update System
- Pull updates from GitHub with real-time progress
- Automatic file and database backup before updates
- Rollback to any previous backup
- Full update history with step-by-step details
- Password confirmation for security

### Performance
- Optimized font loading (next/font)
- prefers-reduced-motion accessibility support
- SEO meta tags and OpenGraph
- Route-level loading states

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4 + Framer Motion
- PostgreSQL + Prisma v7 ORM
- NextAuth.js v5 (Auth.js)
- Recharts, Lucide React, React Hot Toast

## Admin Login

Email: `admin@parstabela.com`
Password: `admin123`

## Docker

```bash
docker compose up --build
```

---

Built with [AI Website Builder](https://github.com/zedmarley2/ai-website-builder)
