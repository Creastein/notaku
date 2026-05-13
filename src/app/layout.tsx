import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://notaku-jvcwellinotaku.a.run.app"), // URL Cloud Run production
  title: "NotaKu — AI Pembukuan UMKM",
  description:
    "Pembukuan otomatis dengan scan nota AI dan penasihat bisnis pintar. Kelola keuangan UMKM Anda dengan mudah.",
  keywords: ["UMKM", "pembukuan", "AI", "scan nota", "keuangan", "bisnis"],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192x192.png",
  },
  openGraph: {
    title: "NotaKu — AI Pembukuan UMKM",
    description: "Pembukuan otomatis dengan scan nota AI dan penasihat bisnis pintar.",
    url: "https://notaku-jvcwellinotaku.a.run.app", // URL Cloud Run production
    siteName: "NotaKu",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NotaKu — AI Pembukuan UMKM",
    description: "Pembukuan otomatis dengan scan nota AI dan penasihat bisnis pintar.",
    images: ["/icon-512x512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={`${inter.variable} antialiased`}>
        <div className="max-w-md mx-auto relative min-h-[100dvh] pb-20 bg-card-solid shadow-2xl border-x border-border overflow-hidden">
          <main>{children}</main>
          <BottomNav />
          <PWAInstallPrompt />
        </div>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
