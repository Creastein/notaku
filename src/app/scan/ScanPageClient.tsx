"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, UploadSimple, CircleNotch, Check, X, Plus, Lightning, Gear, FileText } from "@phosphor-icons/react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GeminiReceiptResult, TransactionType } from "@/types";
import { addTransaction, getUserProfile } from "@/lib/storage";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TiltCard } from "@/components/effects/TiltCard";
import { GradientOrbs } from "@/components/effects/GradientOrbs";
import { triggerHaptic } from "@/lib/haptics";

export default function ScanPageClient() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{ name: string; type: string; size: number } | null>(null);
  const [scanMode, setScanMode] = useState<"auto" | "income" | "expense">("auto");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<GeminiReceiptResult | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const isNarrow = window.innerWidth <= 768;
      setIsMobile(hasTouchScreen && isNarrow);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cleanup webcam on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const openWebcam = useCallback(async () => {
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setWebcamActive(true);
      // Wait for videoRef to be available after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error("Webcam error:", err);
      setWebcamError("Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan di browser.");
    }
  }, []);

  const closeWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamActive(false);
    setWebcamError(null);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `webcam-${Date.now()}.jpg`, { type: "image/jpeg" });
      setSelectedFile(file);
      setSelectedFileMeta({ name: file.name, type: file.type, size: file.size });
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setImagePreview(dataUrl);
      setResult(null);
      setError(null);
      setSaved(false);
      closeWebcam();
      triggerHaptic(10);
    }, "image/jpeg", 0.9);
  }, [closeWebcam]);

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

    // Store file in state so handleScan can always access it
    setSelectedFile(file);
    setSelectedFileMeta({
      name: file.name,
      type: file.type,
      size: file.size,
    });

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
    // Use file from state instead of input refs (which can lose their reference)
    const file = selectedFile;
    if (!file) {
      setError("File tidak ditemukan. Silakan upload ulang.");
      return;
    }

    setScanning(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("receipt", file);
      const profile = getUserProfile();
      formData.append("businessName", profile?.businessName || "");
      formData.append("scanMode", scanMode);

      const res = await fetch("/api/scan", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
      if (scanMode !== "auto") {
        setTransactionType(scanMode);
      } else if (data.data.type) {
        setTransactionType(data.data.type);
      }
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
    triggerHaptic(15);

    await addTransaction({
      type: transactionType,
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
        colors: ["#38bdf8", "#94a3b8", "#c4b5fd"]
      });
    });

    setTimeout(() => router.push("/transactions"), 1500);
  }

  function handleReset() {
    setImagePreview(null);
    setSelectedFile(null);
    setSelectedFileMeta(null);
    setResult(null);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  return (
    <div ref={containerRef} className="p-5 pb-28 space-y-5 relative overflow-hidden">
      <GradientOrbs />
      {/* Header */}
      <div className="pt-3 relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/75 bg-clip-text text-transparent">
            Pindai Nota
          </h1>
          <p className="text-xs text-foreground/45 mt-0.5 font-medium">
            Scan struk belanjaan atau invoice otomatis
          </p>
        </div>
        <Link
          href="/settings"
          className="p-2.5 rounded-xl glass-card hover:bg-white/10 transition-all text-foreground/60 hover:text-foreground"
        >
          <Gear size={20} />
        </Link>
      </div>

      {!imagePreview && (
        <div className="relative z-10 p-0.5 bg-foreground/[0.03] border border-foreground/[0.05] rounded-xl flex gap-1">
          <button
            onClick={() => {
              triggerHaptic(5);
              setScanMode("auto");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              scanMode === "auto"
                ? "bg-white/10 dark:bg-white/5 border border-white/10 shadow-sm text-sky-400"
                : "text-foreground/45 hover:text-foreground/60"
            }`}
          >
            🤖 Auto (AI Tebak)
          </button>
          <button
            onClick={() => {
              triggerHaptic(5);
              setScanMode("income");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              scanMode === "income"
                ? "bg-sky-500/10 border border-sky-500/25 shadow-sm text-sky-400"
                : "text-foreground/45 hover:text-foreground/60"
            }`}
          >
            📥 Pemasukan
          </button>
          <button
            onClick={() => {
              triggerHaptic(5);
              setScanMode("expense");
            }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              scanMode === "expense"
                ? "bg-rose-500/10 border border-rose-500/25 shadow-sm text-rose-400"
                : "text-foreground/45 hover:text-foreground/60"
            }`}
          >
            📤 Pengeluaran
          </button>
        </div>
      )}

      {/* Upload Area */}
      {/* Hidden canvas for webcam capture */}
      <canvas ref={canvasRef} className="hidden" />

      {!imagePreview ? (
        <div className="relative z-10">
          {/* Webcam View */}
          {webcamActive ? (
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full max-h-80 object-cover bg-black rounded-t-2xl"
                />
                {/* Viewfinder overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-sky-400 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-sky-400 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-sky-400 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-sky-400 rounded-br-lg" />
                </div>
                {/* Close button */}
                <button
                  onClick={closeWebcam}
                  className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white p-2 rounded-xl hover:bg-black/70 transition-colors z-20"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-foreground/50 font-medium">Arahkan kamera ke nota, lalu tekan tombol di bawah</p>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 group"
                >
                  {/* Outer ring */}
                  <span className="absolute inset-0 rounded-full border-[3px] border-sky-400/80 group-hover:border-sky-300 transition-colors" />
                  {/* Inner circle */}
                  <span className="w-12 h-12 rounded-full bg-sky-400 group-hover:bg-sky-300 transition-colors flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.4)]">
                    <Camera size={22} className="text-white" />
                  </span>
                </button>
                <p className="text-[11px] text-foreground/35">📸 Tekan untuk ambil foto</p>
              </div>
            </div>
          ) : (
            /* Upload Area */
            <div
              className="glass-card rounded-2xl p-8 text-center border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all duration-300 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 animate-float"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 8px 24px rgba(9, 60, 93, 0.3)",
                }}
              >
                <Camera size={28} className="text-white" />
              </div>
              <p className="font-bold text-foreground/80">
                Ambil Foto atau Pilih File
              </p>
              <p className="text-xs text-foreground/40 mt-1">
                JPG, PNG, PDF (maks 10MB)
              </p>

              <div className="mt-5 flex justify-center gap-3" onClick={(e) => e.stopPropagation()}>
                {/* Camera button — mobile: native capture, desktop: webcam */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    if (isMobile) {
                      cameraInputRef.current?.click();
                    } else {
                      openWebcam();
                    }
                  }}
                  className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5 cursor-pointer"
                >
                  <Camera size={16} /> Ambil Foto
                </button>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(5);
                    fileInputRef.current?.click();
                  }}
                  className="glass-card text-foreground/70 hover:text-foreground inline-flex items-center gap-2 text-sm py-2.5 px-5 rounded-[0.875rem] font-semibold transition-colors cursor-pointer"
                >
                  <UploadSimple size={16} /> Pilih File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Webcam error message */}
              {webcamError && (
                <div className="mt-4 p-3 bg-rose-400/10 border border-rose-400/20 rounded-xl text-xs text-rose-400 font-medium">
                  ⚠️ {webcamError}
                </div>
              )}
            </div>
          )}

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
        <div className="space-y-4 relative z-10">
          {/* Image Preview */}
          <div className="relative rounded-2xl overflow-hidden glass-card">
            {scanning && (
              <div className="absolute inset-0 z-10 bg-black/30 backdrop-blur-[2px] flex flex-col items-center justify-center">
                <div className="relative w-full h-full overflow-hidden">
                  <div className="scan-laser absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_20px_4px_var(--tw-colors-primary)]" />
                </div>
              </div>
            )}
            {selectedFileMeta?.type === "application/pdf" ? (
              <div className="w-full py-12 flex flex-col items-center justify-center bg-foreground/[0.02]">
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl text-red-400 mb-3 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                  <FileText size={44} className="animate-pulse" />
                </div>
                <p className="font-bold text-sm text-foreground/80 max-w-[80%] truncate text-center px-4">
                  {selectedFileMeta.name}
                </p>
                <p className="text-xs text-foreground/45 mt-1">
                  Dokumen PDF • {(selectedFileMeta.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <img
                src={imagePreview || ""}
                alt="Preview nota"
                className="w-full max-h-72 object-contain bg-black/5"
              />
            )}
            <button
              onClick={handleReset}
              className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white p-2 rounded-xl hover:bg-black/70 transition-colors z-20"
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
              <Lightning size={20} />
              Scan dengan AI
            </button>
          )}

          {/* Scanning State */}
          {scanning && (
            <div className="glass-card rounded-2xl text-center py-8 animate-scale-in">
              <CircleNotch
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
            <div className="glass-card border-rose-400/30 bg-rose-400/5 text-rose-500 p-4 rounded-2xl text-sm animate-scale-in flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="font-semibold">Gagal Scan</p>
                <p className="text-xs text-red-500 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="result-stagger flex items-center gap-2">
                  <div className="bg-sky-400/10 p-2 rounded-xl">
                  <Check size={18} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Hasil Scan</h3>
                  <p className="text-[11px] text-foreground/40">
                    Powered by Gemini AI
                  </p>
                </div>
              </div>

              {/* Translucent Type Toggle */}
              <div className="result-stagger clear-glass rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/60 ml-1">
                  Tipe Transaksi
                </span>
                <div className="flex gap-1.5 p-0.5 bg-foreground/[0.05] rounded-lg border border-foreground/[0.05]">
                  <button
                    onClick={() => {
                      triggerHaptic(5);
                      setTransactionType("income");
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                      transactionType === "income"
                        ? "bg-sky-500/20 text-sky-400 border border-sky-400/20 shadow-sm animate-scale-in"
                        : "text-foreground/45 hover:text-foreground/60"
                    }`}
                  >
                    📥 Pemasukan
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic(5);
                      setTransactionType("expense");
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                      transactionType === "expense"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-400/20 shadow-sm animate-scale-in"
                        : "text-foreground/45 hover:text-foreground/60"
                    }`}
                  >
                    📤 Pengeluaran
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="result-stagger clear-glass rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Toko
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.merchantName || "-"}
                  </p>
                </div>
                <div className="result-stagger clear-glass rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Tanggal
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.date || "-"}
                  </p>
                </div>
                <div className="result-stagger clear-glass rounded-xl p-3">
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Kategori
                  </p>
                  <p className="font-bold text-sm mt-0.5">
                    {result.category || "-"}
                  </p>
                </div>
                <div className={`result-stagger rounded-xl p-3 border transition-all duration-300 ${
                  transactionType === "income"
                    ? "bg-sky-400/10 border-sky-400/20 shadow-[0_0_15px_rgba(56,189,248,0.06)]"
                    : "bg-rose-400/10 border-rose-400/20 shadow-[0_0_15px_rgba(251,113,133,0.06)]"
                }`}>
                  <p className="text-foreground/40 text-[11px] font-medium">
                    Total
                  </p>
                  <p className={`font-extrabold text-lg transition-colors duration-300 mt-0.5 ${
                    transactionType === "income" ? "text-sky-400" : "text-rose-400"
                  }`}>
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
                        className="flex justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-foreground/[0.04] transition-colors"
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
              </div>

              {/* Save / Discard - outside glass-card for reliable clicking */}
              <div className="result-stagger flex gap-3 relative z-20">
                <button
                  onClick={handleSave}
                  disabled={saved}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                    saved
                      ? "bg-sky-400/20 text-sky-500 dark:text-sky-300 scale-[1.02] border border-sky-400/30"
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
