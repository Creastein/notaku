import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth-context";
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

const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('notaku_theme') || 'system';
      var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <div className="max-w-md mx-auto relative min-h-[100dvh] pb-28 app-container shadow-2xl border-x border-border overflow-x-hidden">
                <main>{children}</main>
                <BottomNav />
              </div>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
