"use client";
import { useState, useEffect } from "react";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the prompt after a short delay so it's not too aggressive
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    
    // We no longer need the prompt. Clear it up.
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm z-50 animate-fade-in-up">
      <div className="glass-card rounded-2xl p-4 shadow-xl border border-primary/20 flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground/90">Install NotaKu</h4>
          <p className="text-[11px] text-foreground/50 leading-snug">
            Akses lebih cepat & bisa dipakai offline!
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={handleInstallClick}
            className="btn-primary py-1.5 px-3 text-xs rounded-lg whitespace-nowrap"
          >
            Install
          </button>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-[10px] font-medium text-foreground/40 hover:text-foreground/60 px-2 py-1"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}
