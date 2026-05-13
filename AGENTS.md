<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 🏆 NOTAKU PROJECT RULES — TARGET: JUARA 1

## MISI
Proyek ini adalah submission untuk kompetisi **#JuaraVibeCoding**.
Satu-satunya tujuan: **menang juara 1**. Setiap keputusan, setiap baris kode, harus berkontribusi pada kemenangan itu.

---

## 🧠 PRINSIP UTAMA

### 1. ANTI HALUSINASI — Fakta di Atas Segalanya
- **JANGAN** menulis kode berdasarkan asumsi. Jika tidak yakin sebuah API/fungsi/prop ada, VERIFIKASI dulu di kode yang sudah ada atau dokumentasi.
- **JANGAN** mengarang nama file, nama fungsi, atau import path. Cek dulu apakah file itu benar-benar ada.
- Jika diminta menggunakan library yang belum ter-install, KATAKAN ke user bahwa perlu `npm install` dulu.
- Jika diminta fitur yang membutuhkan setup tambahan (mis. Firebase Auth, Stripe), jelaskan prerequisite-nya sebelum coding.
- **SELALU** baca `.context/PROJECT.md` untuk memahami state terkini proyek sebelum membuat perubahan besar.

### 2. KOREKSI USER — Jangan Jadi Yes-Man
- Jika user memberi instruksi yang akan **merusak** arsitektur, **katakan langsung** dan jelaskan alternatif yang lebih baik.
- Jika user meminta sesuatu yang **tidak mungkin** secara teknis, jelaskan kenapa dan tawarkan solusi realistis.
- Jika user menyebutkan library/API yang **salah** (misal "pakai Gemini Pro" padahal projectnya pakai Gemini Flash), koreksi dengan bukti dari kode yang ada.
- Jika user meminta perubahan yang akan **menurunkan** skor kompetisi (UX buruk, code smell, fitur tidak berguna), tolak dengan sopan dan jelaskan dampaknya.
- **Prioritas**: kualitas proyek untuk menang > keinginan sesaat user.

### 3. WAJIB PAKAI MCP CONTEXT7 & SKILLS
- **SEBELUM** menulis kode yang melibatkan library/framework (Next.js, React, Tailwind, Firebase, Recharts, jsPDF, date-fns, Gemini API, dll), **WAJIB** cari dokumentasi terbaru via MCP Context7.
- Langkah: (1) `resolve-library-id` untuk cari ID library, (2) `query-docs` untuk cari API/contoh yang relevan.
- **JANGAN** mengandalkan training data lama. API bisa berubah — Context7 memberikan docs terkini.
- **SELALU** cek dan gunakan **Skills** yang relevan sebelum mengerjakan task. Contoh:
  - Mengerjakan UI? → Cek `nextjs-best-practices`, `react-patterns`, `tailwind-patterns`, `design-spells`
  - Deploy? → Cek `vercel-deployment` atau skill Docker/Cloud Run
  - Testing? → Cek `webapp-testing`, `tdd-workflow`
  - Performance? → Cek `react-component-performance`, `web-performance-optimization`
  - Code review? → Cek `code-reviewer`, `vibe-code-auditor`
- Jika ada skill yang cocok, **baca SKILL.md dulu** sebelum mulai coding.
- Ini bukan opsional. Ini **wajib** untuk memastikan kode berkualitas kompetisi.

### 4. STANDAR PRO PROGRAMMER
- Kode harus **production-ready**, bukan prototype/demo.
- Setiap file harus punya **satu tanggung jawab jelas** (Single Responsibility).
- Gunakan **TypeScript strict** — jangan pakai `any` kecuali benar-benar terpaksa (dan jelaskan alasannya).
- Semua error harus di-handle dengan baik, **jangan** silent fail.
- Penamaan variabel/fungsi harus **deskriptif** dalam bahasa Inggris, komentar boleh bahasa Indonesia.
- **JANGAN** meninggalkan `console.log` untuk debugging di production code. Gunakan proper error logging.

---

## 🔒 ATURAN KODE

### TypeScript
- Strict mode. Hindari `any`, `as any`, `@ts-ignore`.
- Definisikan types di `src/types/index.ts` atau file type terpisah.
- Prefer `interface` untuk object shapes, `type` untuk unions/intersections.

### React / Next.js
- Gunakan `"use client"` hanya jika komponen benar-benar butuh client-side features (hooks, events, browser APIs).
- Server Components untuk data fetching jika memungkinkan.
- Jangan buat komponen monolitik >200 baris. Pecah menjadi sub-komponen.
- Gunakan `useCallback`/`useMemo` hanya jika ada masalah performa nyata, bukan premature optimization.

### Styling
- Design tokens ada di `globals.css` `:root`. Gunakan `var(--token)`, jangan hardcode warna.
- Gunakan class utility yang sudah ada (`.glass-card`, `.btn-primary`, `.gradient-text`, dll).
- Animasi pakai class yang sudah ada (`.animate-fade-in-up`, `.delay-1`, dll).
- Jika perlu style baru, tambahkan ke `globals.css` sebagai utility class, bukan inline style berulang.

### API Routes
- Selalu validasi input.
- Selalu return response format yang konsisten: `{ success: boolean, data?: any, error?: string }`.
- Handle error dengan try/catch dan return proper HTTP status codes.
- Jangan expose sensitive data di response.

### Storage
- Semua operasi data melalui `src/lib/storage.ts`. Jangan akses Firebase/localStorage langsung dari komponen.
- Pertahankan pola Firestore-first + localStorage-fallback yang sudah ada.

---

## 📁 KONVENSI FILE

| Jenis File        | Lokasi                        | Penamaan              |
|--------------------|-------------------------------|-----------------------|
| Page               | `src/app/<route>/page.tsx`    | Selalu `page.tsx`     |
| API Route          | `src/app/api/<name>/route.ts` | Selalu `route.ts`     |
| Component          | `src/components/<Name>.tsx`   | PascalCase            |
| Utility/Lib        | `src/lib/<name>.ts`           | camelCase             |
| Type Definitions   | `src/types/<name>.ts`         | camelCase             |
| Hooks              | `src/hooks/use<Name>.ts`      | camelCase, prefix `use` |
| Context/Docs       | `.context/<NAME>.md`          | UPPERCASE.md          |

---

## 🎯 PRIORITAS KERJA (untuk menang kompetisi)

### Tier 1 — Kritis (harus sempurna)
1. ✅ Semua fitur utama berfungsi tanpa error
2. ✅ AI integration bekerja (Scan OCR + Advisor)
3. ✅ UI/UX premium dan polished
4. ✅ Build berhasil + deploy ke Cloud Run

### Tier 2 — Poin Bonus Besar
5. 🔲 PWA (offline capable, installable)
6. 🔲 Error handling yang robust
7. 🔲 Loading & empty states yang cantik
8. 🔲 Accessibility (WCAG basic)

### Tier 3 — Differentiator (menang vs runner-up)
9. 🔲 Unique AI features (spending prediction, anomaly detection)
10. 🔲 Data export yang komprehensif
11. 🔲 Smooth animations & micro-interactions
12. 🔲 Performance score tinggi (Lighthouse)

---

## 🚫 YANG TIDAK BOLEH DILAKUKAN

1. **JANGAN** mengubah file tanpa membaca isinya dulu.
2. **JANGAN** menambah dependency baru tanpa alasan kuat dan persetujuan user.
3. **JANGAN** menghapus fitur yang sudah jalan tanpa alasan.
4. **JANGAN** membuat perubahan yang merusak build tanpa segera memperbaiki.
5. **JANGAN** over-engineering — sederhana yang benar lebih baik dari kompleks yang rapuh.
6. **JANGAN** copy-paste kode. Jika pola berulang, abstraksi menjadi utility/component.
7. **JANGAN** abaikan warning TypeScript/ESLint — perbaiki atau jelaskan kenapa diabaikan.

---

## ✅ WORKFLOW SEBELUM MENGERJAKAN TASK

1. Baca `.context/PROJECT.md` untuk memahami state proyek
2. Baca `.context/DECISIONS.md` untuk memahami keputusan yang sudah diambil
3. **Cari dokumentasi terkini** via MCP Context7 untuk library/API yang akan dipakai
4. **Cek Skills yang relevan** dan baca SKILL.md-nya sebelum mulai
5. Verifikasi file/fungsi yang akan diubah benar-benar ada
6. Jika task besar, buat plan dulu dan minta persetujuan user
7. Setelah selesai, update `.context/PROGRESS.md`
