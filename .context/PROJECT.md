# NotaKu — AI Pembukuan UMKM

## 🎯 Tujuan Proyek
Aplikasi mobile-first pembukuan untuk UMKM Indonesia yang didukung AI.
**Target: Juara 1 kompetisi #JuaraVibeCoding.**

## 📋 Kompetisi
- **Nama**: #JuaraVibeCoding Hackathon
- **Platform deploy wajib**: Google Cloud Run (via Dockerfile)
- **Kriteria penilaian** (asumsi umum hackathon):
  1. Inovasi & keunikan solusi
  2. Penggunaan AI (Gemini API)
  3. UX/UI design quality
  4. Kelengkapan fitur & fungsionalitas
  5. Kesiapan deployment (production-ready)

## 🏗️ Tech Stack
| Layer         | Teknologi                                   |
|---------------|---------------------------------------------|
| Framework     | Next.js 16.2.6 (App Router, Turbopack)      |
| UI            | React 19 + Tailwind CSS v4                  |
| Bahasa        | TypeScript 5                                |
| AI            | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Database      | Firebase Firestore (+ localStorage fallback) |
| Charts        | Recharts 3.8                                |
| PDF           | jsPDF 4.2                                   |
| Icons         | Lucide React                                |
| Date          | date-fns 4                                  |
| Deploy        | Docker → Google Cloud Run (port 8080)       |

## 🔧 WAJIB: MCP Context7 & Skills

> **PERINGATAN**: Sebelum menulis kode yang melibatkan library/framework APAPUN di tabel di atas,
> **WAJIB** cari dokumentasi terbaru via **MCP Context7** (`resolve-library-id` → `query-docs`).
> Jangan andalkan training data lama — API bisa berubah kapan saja.
>
> Selain itu, **SELALU cek dan gunakan Skills yang relevan** sebelum mengerjakan task.
> Baca `SKILL.md` dari skill yang cocok sebelum mulai coding.
>
> Contoh mapping:
> | Task                    | Context7 Library          | Skills yang Relevan                          |
> |------------------------|---------------------------|----------------------------------------------|
> | Next.js routing/SSR    | `next.js`                | `nextjs-best-practices`                      |
> | React component        | `react`                  | `react-patterns`, `react-component-performance` |
> | Tailwind styling       | `tailwindcss`            | `tailwind-patterns`, `design-spells`         |
> | Firebase Firestore     | `firebase`               | —                                            |
> | Gemini AI              | `@google/generative-ai`  | `gemini-api-dev`                             |
> | Recharts visualization | `recharts`               | —                                            |
> | PDF export             | `jspdf`                  | —                                            |
> | Testing                | `playwright` / `jest`    | `webapp-testing`, `tdd-workflow`             |
> | Code quality           | —                        | `code-reviewer`, `vibe-code-auditor`         |
> | Performance            | —                        | `web-performance-optimization`               |
> | Deployment             | —                        | `vercel-deployment` (atau Cloud Run docs)    |

## 📁 Struktur File
```
notaku/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout (Inter font, BottomNav, max-w-md mobile frame)
│   │   ├── globals.css         # Design system (tokens, glassmorphism, animations)
│   │   ├── page.tsx            # HOME — Dashboard: profit card, income/expense, quick actions, recent txs
│   │   ├── onboarding/
│   │   │   └── page.tsx        # Onboarding 3-step + demo data seeder
│   │   ├── scan/
│   │   │   └── page.tsx        # SCAN — Camera/upload → Gemini OCR → save transaction
│   │   ├── transactions/
│   │   │   └── page.tsx        # TRANSACTIONS — CRUD, search, filter, voice input, grouped by date
│   │   ├── reports/
│   │   │   └── page.tsx        # REPORTS — Bar/Pie/Area charts, AI insight, PDF export
│   │   ├── advisor/
│   │   │   └── page.tsx        # ADVISOR — Chat AI penasihat bisnis (context-aware)
│   │   └── api/
│   │       ├── scan/route.ts   # POST — Gemini Vision OCR for receipts
│   │       └── advisor/route.ts # POST — Gemini chat with transaction context
│   ├── components/
│   │   └── BottomNav.tsx       # Bottom navigation (5 items, center camera FAB)
│   ├── lib/
│   │   ├── firebase.ts         # Firebase init + isFirebaseConfigured() guard
│   │   ├── gemini.ts           # Gemini model + scanReceipt() with JSON schema
│   │   └── storage.ts          # CRUD layer: Firestore-first → localStorage fallback + demo seeder
│   └── types/
│       └── index.ts            # Transaction, GeminiReceiptResult, AIAdvisorMessage types
├── .env.local                  # GEMINI_API_KEY (aktif), Firebase vars (belum diisi)
├── Dockerfile                  # Multi-stage build, standalone output, port 8080
├── next.config.ts              # output: "standalone"
└── package.json
```

## 🔑 Environment Variables
| Variable                               | Status       | Catatan                             |
|----------------------------------------|-------------|-------------------------------------|
| `GEMINI_API_KEY`                       | ✅ Aktif    | Server-side only (aman)             |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars)      | ❌ Kosong   | Firebase belum dikonfigurasi        |

**Konsekuensi**: Saat ini app 100% menggunakan localStorage. Firebase jadi noop.

## ✅ Fitur yang Sudah Jadi
1. **Onboarding** — 3 step carousel + demo data seeder
2. **Dashboard** — Profit card, income/expense cards, quick actions, recent transactions
3. **Scan Nota** — Camera/upload → API → Gemini Vision OCR → parsed JSON → save
4. **Transaksi** — Add manual, voice input (Web Speech API), search, filter, delete, grouped by date
5. **Laporan** — Bar chart (daily), Pie chart (category), Area chart (profit trend), AI insight, PDF export
6. **AI Advisor** — Chat dengan context transaksi, suggested questions
7. **Design** — Glassmorphism, gradients, micro-animations, shimmer loading, premium scrollbar
8. **Mobile UX** — Bottom nav with center FAB, safe-area padding, dvh

## ⚠️ Masalah yang Diketahui
1. Firebase env vars kosong → app hanya pakai localStorage (data hilang jika clear browser)
2. `@theme inline` CSS warning di IDE (bukan error, Tailwind v4 feature)
3. Belum ada PWA manifest/service worker yang real
4. Belum ada error boundary
5. Advisor & Scan API tidak ada rate limiting
6. Export PDF sangat basic (teks saja, tidak ada chart)
7. Belum ada authentication / multi-user
8. `next.config.ts` hanya `output: "standalone"` — belum ada image optimization config dll

## 🎯 Area Peningkatan untuk Juara 1
- [ ] PWA penuh (manifest, service worker, offline support)
- [ ] Firebase Firestore aktif (data persist cross-device)
- [ ] Error boundaries + better error handling
- [ ] Accessibility audit
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] More sophisticated AI features (spending predictions, anomaly detection)
- [ ] Export PDF yang lebih kaya (include charts)
- [ ] Unit/E2E tests
- [ ] SEO & meta tags lengkap
- [ ] CI/CD pipeline
