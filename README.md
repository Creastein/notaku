# 🧾 NotaKu — AI-Powered Bookkeeping for Indonesian MSMEs

[![Built with Gemini](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-blueviolet?style=flat-square)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Database-Firebase%20Firestore-orange?style=flat-square)](https://firebase.google.com/)
[![Google Cloud Run](https://img.shields.io/badge/Hosting-Google%20Cloud%20Run-blue?style=flat-square)](https://cloud.google.com/run)
[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black?style=flat-square)](https://nextjs.org/)

**NotaKu** adalah aplikasi pembukuan pintar berbasis AI yang dirancang khusus untuk membantu 65 juta pelaku UMKM (Usaha Mikro, Kecil, dan Menengah) di Indonesia dalam mengelola keuangan bisnis mereka secara otomatis, cepat, dan akurat. 

Proyek ini dibangun dan disubmit untuk kompetisi **#JuaraVibeCoding** dengan tema *"Bangkit Bersama AI"*.

---

## 🌟 Fitur Utama

*   **📸 AI-Powered OCR Receipt Scanner**: Cukup ambil foto struk/nota belanja, dan AI Gemini (1.5 Flash) secara otomatis mengekstrak informasi detail transaksi (nama toko, tanggal, nominal, kategori, hingga detail barang) tanpa perlu input manual.
*   **📊 Real-time Financial Dashboard**: Visualisasi profit/loss, arus kas (pemasukan vs pengeluaran), dan tracker saldo terkini dengan tampilan UI yang modern, clean, serta animasi micro-interaction yang smooth.
*   **⚠️ Smart Anomaly & Alert System**: AI secara cerdas mendeteksi adanya kejanggalan pengeluaran (spending anomaly) dan memberikan peringatan otomatis beserta ringkasan insight keuangan mingguan (*AI Weekly Digest*).
*   **🤖 Interactive AI Financial Advisor**: Konsultasi langsung dengan asisten keuangan pribadi bertenaga AI yang memahami riwayat transaksi bisnis Anda secara spesifik untuk memberikan rekomendasi penghematan dan strategi bisnis.
*   **📈 Laporan Keuangan & Export PDF**: Laporan grafik interaktif (kategori pengeluaran, tren keuntungan) yang dapat diekspor langsung menjadi file PDF resmi dan profesional siap pakai.
*   **📱 Progressive Web App (PWA)**: Aplikasi dapat di-install langsung dari browser di handphone atau laptop Anda untuk penggunaan offline yang ringan.

---

## 🛠️ Teknologi & Library (Tech Stack)

*   **Frontend**: Next.js 16 (App Router), React 19, TypeScript
*   **Styling & Animasi**: Tailwind CSS v4, GSAP (GreenSock) untuk animasi performa tinggi
*   **AI/LLM Engine**: Google Gemini API (`@google/generative-ai`) untuk OCR, deteksi anomali, dan chatbot
*   **Database & Auth**: Firebase Suite (Authentication & Cloud Firestore untuk real-time data syncing)
*   **Libraries Penting**:
    *   `recharts` untuk diagram dan grafik finansial yang interaktif
    *   `jspdf` & `html2canvas` untuk pembuatan laporan PDF client-side
    *   `canvas-confetti` untuk perayaan visual (wow moment) setelah mencatat transaksi
    *   `lucide-react` untuk ikon antarmuka yang modern

---

## 📁 Struktur Folder Proyek

```text
notaku/
├── docs/                 # Panduan video demo dan materi publikasi LinkedIn
├── public/               # Asset statis, logo, dan file manifest PWA
├── src/
│   ├── app/              # Next.js App Router (Landing page, Scan, Advisor, Reports, dll)
│   ├── components/       # Komponen UI reusable (Charts, Modals, Layout)
│   ├── hooks/            # Custom React hooks (e.g., useTransactions)
│   ├── lib/              # Konfigurasi SDK & logika API (Firebase, Gemini API, Storage)
│   └── types/            # TypeScript type definitions untuk data transaksi & AI
├── deploy.sh             # Script deploy otomatis ke Google Cloud Run (Linux/macOS)
├── deploy.ps1            # Script deploy otomatis ke Google Cloud Run (Windows PowerShell)
└── Dockerfile            # Konfigurasi container image untuk deployment
```

---

## 🚀 Memulai (Local Development)

### Prasyarat (Prerequisites)
Pastikan Anda sudah memiliki:
*   Node.js v20 atau versi terbaru
*   Google Gemini API Key (Bisa didapatkan via [Google AI Studio](https://aistudio.google.com/))
*   Project Firebase (Aktifkan Anonymous Auth & Firestore Database)

### Langkah Setup

1.  **Clone Repository**:
    ```bash
    git clone https://github.com/Creastein/notaku.git
    cd notaku
    ```

2.  **Instalasi Dependencies**:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment**:
    Buat file bernama `.env.local` di folder root proyek dan isi dengan kredensial berikut:
    ```env
    GEMINI_API_KEY=YOUR_GEMINI_API_KEY
    
    NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_FIREBASE_AUTH_DOMAIN
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
    NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
    ```

4.  **Jalankan Server Lokal**:
    ```bash
    npm run dev
    ```
    Buka [http://localhost:3000](http://localhost:3000) di browser Anda untuk melihat aplikasi secara lokal.

---

## 🚢 Panduan Deployment ke Google Cloud Run

Proyek ini dilengkapi dengan script deployment otomatis satu-klik menggunakan Docker ke **Google Cloud Run (Jakarta Region: `asia-southeast2`)** untuk responsivitas server terbaik bagi pengguna Indonesia.

### Persiapan Gcloud CLI
1.  Unduh dan install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install).
2.  Login ke akun Google Cloud Anda:
    ```bash
    gcloud auth login
    ```

### Menjalankan Deployment
*   **Untuk Windows (PowerShell)**:
    ```powershell
    ./deploy.ps1
    ```
*   **Untuk Linux / macOS**:
    ```bash
    chmod +x deploy.sh
    ./deploy.sh
    ```

Script ini akan otomatis mengunggah kode ke Cloud Build, membangun container Docker, dan menyebarkannya di Google Cloud Run dengan batas memori optimal (512Mi, CPU 1, max instances 3).

---

## 🎥 Video Demo & Link Live

*   **Link Aplikasi Live (Google Cloud Run)**: *[Tautan Cloud Run Anda]*
*   **Video Demo Produk (LinkedIn)**: *[Tautan Postingan LinkedIn Anda]*

---

Dibuat dengan ❤️ oleh **Creastein** untuk kemajuan UMKM Indonesia. #JuaraVibeCoding #BangkitBersamaAI
