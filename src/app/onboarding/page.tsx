"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addTransaction } from "@/lib/storage";
import { ScanLine, BarChart3, Bot, ChevronRight, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: ScanLine,
    emoji: "📸",
    title: "Scan Struk Otomatis",
    desc: "Foto struk belanja dan AI akan membaca otomatis. Tidak perlu input manual lagi!",
    color: "#10b981",
  },
  {
    icon: BarChart3,
    emoji: "📊",
    title: "Laporan Visual",
    desc: "Lihat grafik pemasukan & pengeluaran. Pahami kondisi bisnis dalam sekejap.",
    color: "#6366f1",
  },
  {
    icon: Bot,
    emoji: "🤖",
    title: "AI Penasihat Bisnis",
    desc: "Tanya apa saja soal keuangan. AI kami siap bantu 24/7 dengan saran yang relevan.",
    color: "#f59e0b",
  },
];

const DEMO_TXS = [
  { type: "income" as const, amount: 2500000, category: "Penjualan", date: new Date().toISOString().split("T")[0], notes: "Penjualan harian", merchantName: "Toko Utama", createdAt: new Date().toISOString() },
  { type: "expense" as const, amount: 350000, category: "Belanja Modal", date: new Date().toISOString().split("T")[0], notes: "Stok bahan baku", merchantName: "Supplier A", createdAt: new Date().toISOString() },
  { type: "expense" as const, amount: 150000, category: "Operasional", date: new Date().toISOString().split("T")[0], notes: "Listrik & air", merchantName: "PLN", createdAt: new Date().toISOString() },
  { type: "income" as const, amount: 800000, category: "Jasa", date: new Date(Date.now() - 86400000).toISOString().split("T")[0], notes: "Jasa konsultasi", merchantName: "Client B", createdAt: new Date().toISOString() },
  { type: "expense" as const, amount: 200000, category: "Transport", date: new Date(Date.now() - 86400000).toISOString().split("T")[0], notes: "Ongkir pengiriman", merchantName: "JNE", createdAt: new Date().toISOString() },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function finish() {
    setLoading(true);
    for (const tx of DEMO_TXS) await addTransaction(tx);
    localStorage.setItem("notaku_onboarded", "true");
    router.push("/");
  }

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: "var(--gradient-bg)" }}>
      {/* Progress dots */}
      <div className="flex gap-2 mb-10 animate-fade-in">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-8" : "w-1.5"}`}
            style={{ background: i === step ? cur.color : "var(--border-strong)" }} />
        ))}
      </div>

      {/* Content */}
      <div className="text-center max-w-xs animate-fade-in-up" key={step}>
        <div className="inline-flex p-5 rounded-3xl mb-6" style={{ background: `${cur.color}15`, boxShadow: `0 8px 32px ${cur.color}20` }}>
          <cur.icon size={48} style={{ color: cur.color }} />
        </div>
        <div className="text-5xl mb-4 animate-float">{cur.emoji}</div>
        <h2 className="text-2xl font-extrabold tracking-tight mb-3">{cur.title}</h2>
        <p className="text-sm text-foreground/50 leading-relaxed">{cur.desc}</p>
      </div>

      {/* Actions */}
      <div className="mt-12 w-full max-w-xs space-y-3 animate-fade-in-up delay-2">
        {isLast ? (
          <button onClick={finish} disabled={loading}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyiapkan...</>
            ) : (
              <><Sparkles size={16}/> Mulai Sekarang</>
            )}
          </button>
        ) : (
          <button onClick={() => setStep(s => s + 1)}
            className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm">
            Lanjut <ChevronRight size={16}/>
          </button>
        )}

        {!isLast && (
          <button onClick={finish} className="w-full py-2.5 text-sm text-foreground/30 font-medium hover:text-foreground/50 transition-colors">
            Lewati
          </button>
        )}
      </div>
    </div>
  );
}
