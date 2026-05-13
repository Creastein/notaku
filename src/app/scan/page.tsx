"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, X, Plus, Zap } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GeminiReceiptResult } from "@/types";
import { addTransaction } from "@/lib/storage";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<GeminiReceiptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useGSAP(() => {
    if (scanning) {
      // Magic laser scan effect
      gsap.fromTo(".scan-laser", 
        { y: 0, opacity: 0 },
        {
          y: 260, // adjust based on image height max
          opacity: 1,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        }
      );
    }
    if (result) {
      gsap.fromTo(".result-stagger", 
        { scale: 0.9, opacity: 0, y: 20 },
        {
          scale: 1,
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.2)",
          clearProps: "scale,opacity,y"
        }
      );
    }
  }, { scope: containerRef, dependencies: [scanning, result] });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setResult(null);
      setError(null);
      setSaved(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleScan() {
    const file =
      fileInputRef.current?.files?.[0] || cameraInputRef.current?.files?.[0];
    if (!file) return;

    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("receipt", file);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal scan nota. Coba lagi."
      );
    } finally {
      setScanning(false);
    }
  }

  async function handleSave() {
    if (!result) return;

    await addTransaction({
      type: "expense",
      amount: result.totalAmount,
      category: result.category,
      date: result.date || new Date().toISOString(),
      notes:
        result.items?.map((i) => `${i.name} x${i.quantity}`).join(", ") || "",
      merchantName: result.merchantName,
      createdAt: new Date().toISOString(),
    });

    setSaved(true);

    // Wow factor: Confetti animation
    import("canvas-confetti").then((confetti) => {
      confetti.default({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"]
      });
    });

    setTimeout(() => router.push("/transactions"), 1500);
  }

  function handleReset() {
    setImagePreview(null);
    setResult(null);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <div ref={containerRef} className="p-5 space-y-5">
      {/* Header */}
      <div className="pt-3">
        <h1 className="text-xl font-extrabold tracking-tight">
          Scan <span className="gradient-text">Nota</span>
        </h1>
        <p className="text-sm text-foreground/50 font-medium mt-0.5">
          Foto struk/nota dan biarkan AI mengekstrak datanya
        </p>
      </div>

      {/* Upload Area */}
      {!imagePreview ? (
        <div>
          <div className="glass-card rounded-2xl p-8 text-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300">
            <div
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-float"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: "0 8px 24px rgba(5, 150, 105, 0.3)",
              }}
            >
              <Camera size={28} className="text-white" />
            </div>
            <p className="font-bold text-foreground/80">
              Ambil Foto atau Pilih File
            </p>
            <p className="text-xs text-foreground/40 mt-1">
              JPG, PNG (maks 5MB)
            </p>

            <div className="mt-5 flex justify-center gap-3">
              <label className="cursor-pointer">
                <span className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5">
                  <Camera size={16} /> Kamera
                </span>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <label className="cursor-pointer">
                <span className="glass-card inline-flex items-center gap-2 text-sm py-2.5 px-5 rounded-[0.875rem] font-semibold text-foreground/70 hover:text-foreground transition-colors">
                  <Upload size={16} /> Upload
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          {/* Tips */}
          <div className="mt-4 glass-card rounded-2xl p-4">
            <p className="text-xs font-bold text-foreground/60 mb-2">
              💡 Tips untuk hasil terbaik:
            </p>
            <ul className="text-xs text-foreground/40 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Pastikan nota terlihat jelas & tidak terlipat
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Ambil foto dalam pencahayaan yang baik
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                Arahkan kamera tegak lurus ke nota
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Preview */}
          <div className="relative rounded-2xl overflow-hidden glass-card">
            {scanning && (
              <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <div className="relative w-full h-full overflow-hidden">
                  <div className="scan-laser absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_4px_var(--tw-colors-primary)]" />
                </div>
              </div>
            )}
            <img
              src={imagePreview}
              alt="Preview nota"
              className="w-full max-h-72 object-contain bg-black/5"
            />
            <button
              onClick={handleReset}
              className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white p-2 rounded-xl hover:bg-black/70 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scan Button */}
          {!result && !scanning && (
            <button
              onClick={handleScan}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2.5 text-base animate-scale-in"
            >
              <Zap size={20} />
              Scan dengan AI
            </button>
          )}

          {/* Scanning State */}
          {scanning && (
            <div className="glass-card rounded-2xl text-center py-8 animate-scale-in">
              <Loader2
                size={36}
                className="animate-spin mx-auto text-primary mb-3"
              />
              <p className="font-bold text-sm text-foreground/70">
                AI sedang membaca nota...
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                Menggunakan Gemini Vision API
              </p>
              <div className="flex justify-center gap-1.5 mt-4">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm animate-scale-in flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">Gagal Scan</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="glass-card rounded-2xl p-5 space-y-4">
              <div className="result-stagger flex items-center gap-2">
                <div className="bg-emerald-500/10 p-2 rounded-xl">
                  <Check size={18} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Hasil Scan</h3>
                  <p className="text-[11px] text-foreground/40">
                    Powered by Gemini AI
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="result-stagger bg-background/50 rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Toko
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.merchantName || "-"}
                  </p>
                </div>
                <div className="result-stagger bg-background/50 rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Tanggal
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.date || "-"}
                  </p>
                </div>
                <div className="result-stagger bg-background/50 rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Kategori
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.category || "-"}
                  </p>
                </div>
                <div className="result-stagger bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Total
                  </p>
                  <p className="font-extrabold text-lg text-primary mt-0.5">
                    Rp {result.totalAmount?.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {result.items && result.items.length > 0 && (
                <div className="result-stagger border-t border-border pt-3">
                  <p className="text-xs text-foreground/40 font-semibold mb-2">
                    📋 Detail Item
                  </p>
                  <div className="space-y-1.5">
                    {result.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-background/50 transition-colors"
                      >
                        <span className="text-foreground/70">
                          {item.name}{" "}
                          <span className="text-foreground/30">
                            x{item.quantity}
                          </span>
                        </span>
                        <span className="font-semibold text-foreground/60">
                          Rp {item.price?.toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save / Discard */}
              <div className="result-stagger flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    saved
                      ? "bg-emerald-100 text-emerald-700 scale-[1.02]"
                      : "btn-primary"
                  }`}
                >
                  {saved ? (
                    <>
                      <Check size={16} /> Tersimpan! ✨
                    </>
                  ) : (
                    <>
                      <Plus size={16} /> Simpan Transaksi
                    </>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-5 py-3 rounded-xl glass-card text-sm font-semibold text-foreground/50 hover:text-foreground transition-colors"
                >
                  Ulangi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
