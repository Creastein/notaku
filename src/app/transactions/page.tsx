"use client";

import { useEffect, useState, useRef } from "react";
import { Transaction } from "@/types";
import { getTransactions, addTransaction, deleteTransaction, updateTransaction } from "@/lib/storage";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, ArrowDownRight, ArrowLeft, Plus, Trash, X, Microphone, MicrophoneSlash, MagnifyingGlass, Gear, Pencil } from "@phosphor-icons/react";
import { useToast } from "@/components/Toast";
import { triggerHaptic } from "@/lib/haptics";
import Link from "next/link";
import { format, isToday, isYesterday, subDays, isAfter } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { GradientOrbs } from "@/components/effects/GradientOrbs";

function fmtRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const CATEGORIES = ["Makanan", "Transport", "Belanja Modal", "Operasional", "Gaji", "Penjualan", "Jasa", "Freelance", "Lainnya"];

function dateLabel(d: string) {
  try {
    const date = new Date(d);
    if (!date || isNaN(date.getTime())) return "Lainnya";
    if (isToday(date)) return "Hari Ini";
    if (isYesterday(date)) return "Kemarin";
    if (isAfter(date, subDays(new Date(), 7))) return "Minggu Ini";
    return format(date, "MMMM yyyy", { locale: idLocale });
  } catch {
    return "Lainnya";
  }
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"income"|"expense">("all");

  // Form state (shared between add & edit)
  const [fType, setFType] = useState<"income"|"expense">("expense");
  const [fAmt, setFAmt] = useState("");
  const [fCat, setFCat] = useState("Makanan");
  const [fNotes, setFNotes] = useState("");
  const [fMerch, setFMerch] = useState("");
  const [fDate, setFDate] = useState("");

  // Edit state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setFDate(new Date().toISOString().split("T")[0]);
    load();
  }, []);

  // Lock body scroll when overlay is active
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showForm]);

  async function load() { setLoading(true); setTxs(await getTransactions()); setLoading(false); }

  function resetForm() {
    setFType("expense");
    setFAmt("");
    setFCat("Makanan");
    setFNotes("");
    setFMerch("");
    setFDate(new Date().toISOString().split("T")[0]);
  }

  function openEdit(tx: Transaction) {
    triggerHaptic(5);
    setEditingTx(tx);
    setFType(tx.type);
    setFAmt(String(tx.amount));
    setFCat(tx.category);
    setFNotes(tx.notes || "");
    setFMerch(tx.merchantName || "");
    setFDate(typeof tx.date === "string" ? tx.date.split("T")[0] : new Date(tx.date).toISOString().split("T")[0]);
    setShowForm(true);
  }

  function closeForm() {
    triggerHaptic(5);
    setShowForm(false);
    setEditingTx(null);
    resetForm();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fAmt || Number(fAmt) <= 0) {
      triggerHaptic(20);
      showToast({ type: "warning", title: "Jumlah tidak valid", message: "Masukkan nominal transaksi yang benar." });
      return;
    }
    triggerHaptic(15);
    setSaving(true);

    try {
      if (editingTx) {
        await updateTransaction(editingTx.id, {
          type: fType,
          amount: Number(fAmt),
          category: fCat,
          date: fDate,
          notes: fNotes,
          merchantName: fMerch,
        });
        showToast({ type: "success", title: "Transaksi diperbarui ✏️", message: `${fMerch || fCat} berhasil diupdate.` });
      } else {
        await addTransaction({
          type: fType,
          amount: Number(fAmt),
          category: fCat,
          date: fDate,
          notes: fNotes,
          merchantName: fMerch,
          createdAt: new Date().toISOString(),
        });

        import("canvas-confetti").then((confetti) => {
          confetti.default({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#38bdf8", "#94a3b8", "#c4b5fd"]
          });
        });
        showToast({ type: "success", title: "Transaksi tersimpan! 🎉", message: `${fType === "income" ? "Pemasukan" : "Pengeluaran"} ${fMerch || fCat} berhasil dicatat.` });
      }

      closeForm();
      await load();
    } catch {
      triggerHaptic(20);
      showToast({ type: "error", title: "Gagal menyimpan", message: "Terjadi kesalahan, silakan coba lagi." });
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    triggerHaptic(20);
    try {
      await deleteTransaction(id);
      await load();
      showToast({ type: "success", title: "Transaksi dihapus 🗑️", message: "Data transaksi berhasil dihapus." });
    } catch {
      triggerHaptic(20);
      showToast({ type: "error", title: "Gagal menghapus", message: "Terjadi kesalahan saat menghapus data." });
    }
  }

  function toggleVoice() {
    triggerHaptic(10);
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      showToast({
        type: "warning",
        title: "Voice Input tidak didukung",
        message: "Browser Anda tidak mendukung perekaman suara."
      });
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR(); r.lang = "id-ID"; r.continuous = false;
    r.onresult = (e: any) => { setFNotes(p => p ? p + " " + e.results[0][0].transcript : e.results[0][0].transcript); setIsListening(false); };
    r.onerror = () => setIsListening(false); r.onend = () => setIsListening(false);
    setIsListening(true); r.start();
  }

  const filtered = txs.filter(tx => {
    const mt = filter === "all" || tx.type === filter;
    const ms = !search || tx.merchantName?.toLowerCase().includes(search.toLowerCase()) || tx.category.toLowerCase().includes(search.toLowerCase()) || tx.notes?.toLowerCase().includes(search.toLowerCase());
    return mt && ms;
  });

  const grouped: Record<string, Transaction[]> = {};
  filtered.forEach(tx => { const l = dateLabel(tx.date as string); if (!grouped[l]) grouped[l] = []; grouped[l].push(tx); });

  useGSAP(() => {
    if (!loading && filtered.length > 0) {
      const isMobile = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

      if (isMobile) {
        // Mobile fallback using CSS animations
        const groups = containerRef.current?.querySelectorAll(".tx-group");
        groups?.forEach((el, i) => {
          (el as HTMLElement).style.animationDelay = `${i * 50}ms`;
          el.classList.add("animate-fade-in-up");
        });
        return;
      }

      try {
        gsap.from(".tx-group", {
          opacity: 0,
          y: 15,
          duration: 0.4,
          stagger: 0.1,
          ease: "power2.out",
          clearProps: "all"
        });
        gsap.from(".tx-row", {
          opacity: 0,
          scale: 0.96,
          duration: 0.4,
          stagger: 0.05,
          ease: "back.out(1.4)",
          clearProps: "all"
        });
      } catch (err) {
        console.error("GSAP animation failed:", err);
        gsap.set([".tx-group", ".tx-row"], { clearProps: "all" });
      }
    }
  }, { scope: containerRef, dependencies: [loading, filter, search, filtered.length] });

  if (loading) return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="h-8 w-40 shimmer rounded-lg" />
      <div className="h-12 shimmer rounded-xl" />
      {[1,2,3,4].map(i => <div key={i} className="h-16 shimmer rounded-xl" />)}
    </div>
  );

  return (
    <div ref={containerRef} className="p-5 space-y-4 relative">
      <GradientOrbs />
      <div className="flex items-center justify-between pt-3 animate-fade-in-up relative z-10">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Transaksi</h1>
          <p className="text-sm text-foreground/40 font-medium">{txs.length} catatan</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/settings"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.05] border border-foreground/[0.07] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
          >
            <Gear size={14} />
          </Link>
          <button onClick={() => { if (showForm && editingTx) { closeForm(); } else if (showForm) { closeForm(); } else { resetForm(); setShowForm(true); } }}
            className={`p-2.5 rounded-xl transition-all duration-300 ${showForm ? "bg-red-500/10 text-red-500 rotate-45" : ""}`}
            style={!showForm ? { background: "var(--gradient-primary)", color: "white", boxShadow: "0 4px 14px rgba(5,150,105,0.3)" } : undefined}
          >
            {showForm ? <X size={20}/> : <Plus size={20}/>}
          </button>
        </div>
      </div>

      <div className="animate-fade-in-up delay-1 space-y-2.5 relative z-10">
        <div className="relative">
          <MagnifyingGlass size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari transaksi..." className="input-premium w-full pl-10 text-sm" />
        </div>
        <div className="flex gap-2">
          {(["all","income","expense"] as const).map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === t ? (t==="income"?"bg-sky-400 text-white":t==="expense"?"bg-rose-400 text-white":"bg-primary text-white") : "clear-glass text-foreground/50"}`}
            >{t==="all"?"Semua":t==="income"?"Masuk":"Keluar"}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <>
          {/* Backdrop overlay to dim background */}
          <div className="form-backdrop-overlay" onClick={closeForm} style={{ zIndex: 60 }} />

          <div className="relative" style={{ zIndex: 70 }}>
            <form onSubmit={submit} className="glass-form-elevated animate-scale-in max-h-[85vh] flex flex-col overflow-hidden">
              {/* Scrollable content area */}
              <div className="p-5 pb-3 space-y-4 overflow-y-auto flex-1">
                {/* Form header with back button */}
                <div className="flex items-center gap-3 -mt-1 -mx-1">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="p-2 rounded-xl bg-foreground/5 hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h2 className="text-base font-extrabold tracking-tight">
                    {editingTx ? "Edit Transaksi" : "Transaksi Baru"}
                  </h2>
                </div>

                {/* Edit indicator */}
                {editingTx && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <Pencil size={12} className="text-blue-400" />
                    <span className="text-xs font-semibold text-blue-400">Mengedit transaksi</span>
                  </div>
                )}

                {/* Type toggle */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFType("expense")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      fType === "expense"
                        ? "bg-rose-400 text-white shadow-md"
                        : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => setFType("income")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      fType === "income"
                        ? "bg-sky-400 text-white shadow-md"
                        : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>

                {/* Jumlah */}
                <div>
                  <label className="text-xs text-foreground/50 font-semibold mb-1.5 block">Jumlah (Rp)</label>
                  <input
                    type="number"
                    value={fAmt}
                    onChange={e => setFAmt(e.target.value)}
                    placeholder="50000"
                    className="input-premium w-full text-xl font-extrabold"
                    required
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="text-xs text-foreground/50 font-semibold mb-1.5 block">Kategori</label>
                  <select
                    value={fCat}
                    onChange={e => setFCat(e.target.value)}
                    className="input-premium w-full"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Toko & Tanggal */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground/50 font-semibold mb-1.5 block">Toko/Sumber</label>
                    <input
                      type="text"
                      value={fMerch}
                      onChange={e => setFMerch(e.target.value)}
                      placeholder="Warung Bu Ani"
                      className="input-premium w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-foreground/50 font-semibold mb-1.5 block">Tanggal</label>
                    <input
                      type="date"
                      value={fDate}
                      onChange={e => setFDate(e.target.value)}
                      className="input-premium w-full"
                    />
                  </div>
                </div>

                {/* Catatan */}
                <div>
                  <label className="text-xs text-foreground/50 font-semibold mb-1.5 block">Catatan</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fNotes}
                      onChange={e => setFNotes(e.target.value)}
                      placeholder="Opsional..."
                      className="input-premium w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={toggleVoice}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-primary/10 text-primary hover:bg-primary/20"
                      }`}
                    >
                      {isListening ? <MicrophoneSlash size={14} /> : <Microphone size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit - sticky at bottom, always visible */}
              <div className="p-5 pt-3 border-t border-foreground/[0.06]">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : editingTx ? "Perbarui Transaksi" : "Simpan Transaksi"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-14 animate-fade-in-up relative z-10">
          <div className="text-4xl mb-3 animate-float">{search ? "🔍" : "📭"}</div>
          <p className="text-foreground/60 font-semibold text-sm">{search ? "Tidak ditemukan" : "Belum ada transaksi"}</p>
          <p className="text-foreground/30 text-xs mt-1">{search ? "Coba kata kunci lain" : "Tap + untuk menambahkan"}</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="tx-group">
              <p className="text-xs font-bold text-foreground/30 uppercase tracking-wider mb-2 px-1">{label}</p>
              <div className="space-y-2">
                {items.map((tx) => (
                  <div key={tx.id} className="tx-row glass-card flex items-center justify-between rounded-xl p-3.5 group">
                    <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(tx)}>
                      <div className={`p-2 rounded-xl shrink-0 ${tx.type==="income"?"bg-sky-400/10 text-sky-400":"bg-rose-400/10 text-rose-400"}`}>
                        {tx.type==="income" ? <ArrowUpRight size={16} weight="bold"/> : <ArrowDownRight size={16} weight="bold"/>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{tx.merchantName || tx.category}</p>
                        <p className="text-[11px] text-foreground/35 font-medium">{format(new Date(tx.date), "dd MMM", { locale: idLocale })} • {tx.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={`font-bold text-sm whitespace-nowrap ${tx.type==="income"?"text-sky-500":"text-rose-400"}`}>{tx.type==="income"?"+":"-"}{fmtRp(tx.amount)}</p>
                      <button onClick={() => openEdit(tx)} aria-label="Edit transaksi" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-foreground/20 hover:text-blue-500 rounded-lg hover:bg-blue-500/10 transition-all"><Pencil size={14}/></button>
                      <button onClick={() => del(tx.id)} aria-label="Hapus transaksi" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-foreground/20 hover:text-rose-400 rounded-lg hover:bg-rose-400/10 transition-all"><Trash size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
