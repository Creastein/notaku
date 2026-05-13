"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center">
      {/* Error illustration */}
      <div className="relative mb-8">
        <div
          className="text-7xl animate-float"
          style={{ filter: "drop-shadow(0 8px 24px rgba(239,68,68,0.2))" }}
        >
          ⚠️
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full opacity-20"
          style={{ background: "var(--destructive)", filter: "blur(8px)" }}
        />
      </div>

      {/* Text */}
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-extrabold text-foreground/90 mb-2">
          Oops, Terjadi Kesalahan
        </h1>
        <p className="text-sm text-foreground/40 max-w-xs leading-relaxed mb-1">
          Sepertinya ada yang tidak beres. Tenang, data kamu tetap aman.
        </p>
        {error.digest && (
          <p className="text-[10px] text-foreground/20 font-mono">
            Kode: {error.digest}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-8 space-y-3 w-full max-w-xs animate-fade-in-up delay-2">
        <button
          onClick={reset}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          Coba Lagi
        </button>
        <a
          href="/"
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold text-foreground/40 hover:text-foreground/60 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Kembali ke Beranda
        </a>
      </div>

      {/* Glass card tip */}
      <div className="mt-8 glass-card rounded-2xl p-4 max-w-xs animate-fade-in-up delay-4">
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <p className="text-xs text-foreground/40 text-left leading-relaxed">
            Jika masalah ini terus terjadi, coba refresh halaman atau bersihkan cache browser.
          </p>
        </div>
      </div>
    </div>
  );
}
