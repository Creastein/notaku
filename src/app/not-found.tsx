import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
      {/* Floating illustration */}
      <div className="relative mb-8">
        <div
          className="text-8xl animate-float"
          style={{ filter: "drop-shadow(0 8px 24px rgba(5,150,105,0.2))" }}
        >
          📭
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full opacity-20"
          style={{ background: "var(--primary)", filter: "blur(8px)" }}
        />
      </div>

      {/* Text */}
      <div className="animate-fade-in-up">
        <h1 className="text-6xl font-extrabold gradient-text mb-2">404</h1>
        <h2 className="text-lg font-bold text-foreground/80 mb-2">
          Halaman Tidak Ditemukan
        </h2>
        <p className="text-sm text-foreground/40 max-w-xs leading-relaxed">
          Sepertinya halaman yang kamu cari sudah dipindahkan atau tidak ada.
          Yuk kembali ke beranda!
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 space-y-3 w-full max-w-xs animate-fade-in-up delay-2">
        <Link href="/" className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Kembali ke Beranda
        </Link>
        <Link
          href="/scan"
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary-light transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          Scan Nota Baru
        </Link>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-8 w-2 h-2 rounded-full bg-primary/20 animate-float" style={{ animationDelay: "0.5s" }} />
      <div className="absolute top-32 right-12 w-3 h-3 rounded-full bg-accent/20 animate-float" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-40 left-16 w-1.5 h-1.5 rounded-full bg-primary/15 animate-float" style={{ animationDelay: "1.5s" }} />
    </div>
  );
}
