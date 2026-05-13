# Catatan Keputusan Teknis

Log keputusan arsitektur dan desain yang sudah diambil selama pengembangan.

## 001 — Framework: Next.js 16 App Router
- **Tanggal**: 2026-05-09
- **Alasan**: SSR + API routes dalam satu framework. App Router adalah standar modern. Turbopack untuk DX cepat.
- **Konsekuensi**: Semua page components harus `"use client"` jika butuh hooks/state.

## 002 — Storage: Firestore + localStorage Fallback
- **Tanggal**: 2026-05-09
- **Alasan**: Firebase gratis untuk skala UMKM kecil. localStorage sebagai fallback agar app tetap jalan tanpa Firebase config.
- **Konsekuensi**: Data di localStorage hilang saat clear browser. Perlu migrasi localStorage → Firestore saat user setup Firebase.

## 003 — AI: Gemini 1.5 Flash
- **Tanggal**: 2026-05-09
- **Alasan**: Gratis tier dari Google, support Vision (untuk OCR nota), JSON structured output, response cepat.
- **Konsekuensi**: API key disimpan server-side only (`GEMINI_API_KEY`, bukan `NEXT_PUBLIC_*`). Scan & Advisor lewat API routes.

## 004 — Design: Glassmorphism + Emerald Palette
- **Tanggal**: 2026-05-09
- **Alasan**: Tampilan premium, modern, cocok untuk app keuangan (emerald = uang/growth). Glassmorphism memberikan depth tanpa terasa berat.
- **Konsekuensi**: Harus hati-hati dengan backdrop-filter performance di low-end devices.

## 005 — Mobile Frame: max-w-md centered
- **Tanggal**: 2026-05-09
- **Alasan**: Target utama mobile UMKM. max-w-md (448px) mensimulasikan phone viewport bahkan di desktop.
- **Konsekuensi**: Layout selalu terlihat mobile-like. Tidak ada desktop-optimized view.

## 006 — Deploy Target: Google Cloud Run
- **Tanggal**: 2026-05-09
- **Alasan**: Requirement kompetisi. Dockerfile sudah disiapkan dengan multi-stage build + standalone output.
- **Konsekuensi**: Harus pastikan `next.config.ts` punya `output: "standalone"`. Port harus 8080.
