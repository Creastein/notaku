"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Transaction } from "@/types";
import { getTransactions, seedDemoData, hasDemoData, getUserProfile } from "@/lib/storage";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  TrendUp,
  TrendDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CaretRight,
  Lightning,
  CaretDown,
  Gear,
  DownloadSimple,
  X,
} from "@phosphor-icons/react";
import { format, isSameMonth, startOfMonth, subMonths, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AIDigestCard } from "@/components/AIDigestCard";
import { SpendingAnomaly } from "@/components/SpendingAnomaly";
import { GradientOrbs } from "@/components/effects/GradientOrbs";
import { TiltCard } from "@/components/effects/TiltCard";
import { CountUp } from "@/components/effects/CountUp";
import { useToast } from "@/components/Toast";

/* ─────────────────── helpers ─────────────────── */

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 11) return { text: "Selamat Pagi", emoji: "☀️" };
  if (hour < 15) return { text: "Selamat Siang", emoji: "🌤️" };
  if (hour < 18) return { text: "Selamat Sore", emoji: "🌅" };
  return { text: "Selamat Malam", emoji: "🌙" };
}

function getTrend(transactions: Transaction[], type: "income" | "expense") {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const thisMonth = transactions.filter(
    (t) => t.type === type && isSameMonth(new Date(t.date), now)
  ).reduce((sum, t) => sum + t.amount, 0);

  const lastMonth = transactions.filter(
    (t) => t.type === type && isSameMonth(new Date(t.date), lastMonthStart)
  ).reduce((sum, t) => sum + t.amount, 0);

  if (lastMonth === 0) return { value: thisMonth > 0 ? 100 : 0, isUp: thisMonth > 0 };
  const percentChange = ((thisMonth - lastMonth) / lastMonth) * 100;
  return { value: Math.abs(percentChange), isUp: percentChange >= 0 };
}

function getSparklinePoints(transactions: Transaction[], type: "income" | "expense"): string {
  if (transactions.length === 0) return "0,20 60,20";
  
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const dailyTotals = last7Days.map(date => {
    return transactions.filter(t => 
      t.type === type && 
      new Date(t.date).toDateString() === date.toDateString()
    ).reduce((sum, t) => sum + t.amount, 0);
  });

  const max = Math.max(...dailyTotals, 1);
  const min = Math.min(...dailyTotals, 0);
  const range = max - min || 1; // Prevent division by zero
  
  return dailyTotals.map((val, i) => {
    const x = (i / 6) * 60;
    const y = 20 - ((val - min) / range) * 16 - 2; // Keep it within 2-18 bounds
    return `${x},${y}`;
  }).join(" ");
}

/* ─────────────────── Sparkline ─────────────────── */
let sparklineCounter = 0;
function Sparkline({ points, color }: { points: string; color: "green" | "red" }) {
  const strokeColor = color === "green" ? "#38bdf8" : "#fb7185";
  // Unique ID per instance to avoid SVG gradient ID collisions
  const idRef = useRef(`spark-${color}-${++sparklineCounter}`);
  const gradId = idRef.current;
  const fillUrl = `url(#${gradId})`;
  const gradColor = color === "green" ? "#38bdf8" : "#fb7185";

  return (
    <svg width="100%" height="24" className="absolute bottom-0 left-0 right-0 opacity-40 mix-blend-multiply dark:mix-blend-screen pointer-events-none" preserveAspectRatio="none" viewBox="0 0 60 24">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={gradColor} stopOpacity="0.5" />
          <stop offset="100%" stopColor={gradColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,24 ${points} 60,24`} fill={fillUrl} stroke="none" />
      <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─────────────────── animated counter ─────────────────── */
// Handled by CountUp component

/* ─────────────────── mini stat pill ─────────────────── */

function StatPill({
  label,
  value,
  color,
  icon: Icon,
  sparklinePoints,
}: {
  label: string;
  value: number;
  color: "green" | "red";
  icon: React.ElementType;
  sparklinePoints: string;
}) {
  return (
    <div
      className={`relative overflow-hidden flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-1 ${
        color === "green"
          ? "bg-sky-400/[0.08] border border-sky-400/20"
          : "bg-rose-400/[0.08] border border-rose-400/20"
      }`}
    >
      <Sparkline points={sparklinePoints} color={color} />
      <div
        className={`p-1.5 rounded-lg relative z-10 ${
          color === "green" ? "bg-sky-400/15" : "bg-rose-400/15"
        }`}
      >
        <Icon
          size={13}
          className={color === "green" ? "text-sky-400" : "text-rose-400"}
          strokeWidth={2.5}
        />
      </div>
      <div className="min-w-0 relative z-10">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            color === "green" ? "text-sky-500/70" : "text-rose-400/70"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-xs font-extrabold truncate ${
            color === "green" ? "text-sky-500" : "text-rose-400"
          }`}
        >
          {formatRupiah(value)}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── transaction row ─────────────────── */

function TxRow({ tx, index }: { tx: Transaction; index: number }) {
  const isIncome = tx.type === "income";
  return (
    <div
      className="tx-row flex items-center justify-between py-3 px-3 group cursor-default transition-colors hover:bg-foreground/[0.02] first:rounded-t-2xl last:rounded-b-2xl"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isIncome
              ? "bg-sky-400/10 text-sky-400"
              : "bg-rose-400/10 text-rose-400"
          }`}
        >
          {isIncome ? (
            <ArrowUpRight size={16} strokeWidth={2.5} />
          ) : (
            <ArrowDownRight size={16} strokeWidth={2.5} />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">
            {tx.merchantName || tx.category}
          </p>
          <p className="text-[11px] text-foreground/40 font-medium mt-0.5">
            {(() => {
              try {
                const dateObj = new Date(tx.date);
                if (!tx.date || isNaN(dateObj.getTime())) return "Baru saja";
                return format(dateObj, "dd MMM", { locale: id });
              } catch {
                return "Baru saja";
              }
            })()}
            {tx.category && tx.merchantName ? (
              <span className="ml-1.5 px-1.5 py-0.5 bg-foreground/[0.05] rounded-full text-[9px] font-semibold uppercase tracking-wide">
                {tx.category}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      {/* Right */}
      <p
        className={`font-extrabold text-sm tabular-nums ${
          isIncome ? "text-sky-500" : "text-rose-400"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatRupiah(tx.amount)}
      </p>
    </div>
  );
}

export default function HomePageClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"all" | "month">("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState({ text: "Halo", emoji: "👋" });
  const [showDemoBtn, setShowDemoBtn] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  
  const { showToast } = useToast();
  
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  /* ── GSAP entrance sequence ── */
  useGSAP(
    () => {
      if (loading) return;

      // Pada mobile (touch devices), skip animasi berat untuk menghindari
      // elemen yang stuck di opacity:0 jika GSAP gagal
      const isMobile = window.matchMedia("(pointer: coarse)").matches;

      if (isMobile) {
        // Mobile: gunakan CSS animation saja (sudah visible by default)
        // Hanya tambahkan subtle fade-in via class
        const elements = containerRef.current?.querySelectorAll(
          ".hero-card, .page-header, .stat-pill-wrap, .content-card"
        );
        elements?.forEach((el, i) => {
          (el as HTMLElement).style.animationDelay = `${i * 60}ms`;
          el.classList.add("animate-fade-in-up");
        });
        return;
      }

      // Desktop: gunakan GSAP dari `from` (bukan `fromTo`) agar elemen
      // tetap visible jika GSAP gagal — `from` animasi DARI state tertentu
      // MENUJU state natural di CSS (yang sudah opacity:1)
      try {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        tl.from(
          ".hero-card",
          { y: 40, opacity: 0, scale: 0.96, duration: 0.7, ease: "back.out(1.4)", clearProps: "all" }
        )
          .from(
            ".page-header",
            { y: -20, opacity: 0, duration: 0.5, clearProps: "all" },
            "<0.1"
          )
          .from(
            ".stat-pill-wrap",
            { y: 20, opacity: 0, duration: 0.5, stagger: 0.07, clearProps: "all" },
            "-=0.3"
          )
          .from(
            ".content-card",
            { y: 20, opacity: 0, duration: 0.45, stagger: 0.06, clearProps: "all" },
            "-=0.15"
          );

        // Safety: force visibility after 2s in case GSAP gets stuck
        setTimeout(() => {
          gsap.set([".hero-card", ".page-header", ".stat-pill-wrap", ".content-card"], { clearProps: "all" });
        }, 2000);
      } catch (err) {
        console.error("GSAP animation failed:", err);
        // Fallback: pastikan semua elemen terlihat
        gsap.set([".hero-card", ".page-header", ".stat-pill-wrap", ".content-card"], { clearProps: "all" });
      }
    },
    { scope: containerRef, dependencies: [loading] }
  );

  /* ── Hero card shine effect on touch/mouse ── */
  const handleHeroMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    
    // Shine effect calculation
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    el.style.setProperty('--x', `${x}px`);
    el.style.setProperty('--y', `${y}px`);
  }, []);

  const handleHeroLeave = useCallback(() => {
    const el = heroRef.current;
    if (!el) return;
    // Reset shine or leave it as is
  }, []);

  /* ── client-side initialization ── */
  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
    setShowDemoBtn(!hasDemoData());

    if (!localStorage.getItem("notaku_pwa_prompt_dismissed")) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      if (!isStandalone) {
        setShowPwaPrompt(true);
      }
    }
  }, []);

  /* ── data loading ── */
  useEffect(() => {
    if (!mounted) return;
    const profile = getUserProfile();
    if (!localStorage.getItem("notaku_onboarded") || !profile) {
      router.push("/onboarding");
      return;
    }
    
    // Personalize greeting
    const baseGreeting = getGreeting();
    setGreeting({
      text: `${baseGreeting.text}, ${profile.ownerName}`,
      emoji: baseGreeting.emoji
    });
    
    loadData();
  }, [mounted, router]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
      setShowDemoBtn(!hasDemoData());
    } catch (err) {
      console.error("Failed to load transactions:", err);
      // Ensure we still show the page even if loading fails
    } finally {
      setLoading(false);
    }
  }

  function handleSeedDemo() {
    const data = seedDemoData();
    setTransactions(data);
    setShowDemoBtn(false);
    showToast({ type: "success", title: "✨ 35 Data Demo Berhasil Dimuat!", message: "Data contoh transaksi telah ditambahkan ke dashboard." });
  }

  /* ── derived values ── */
  const filteredTransactions = useMemo(() => {
    if (timeFilter === "all") return transactions;
    const now = new Date();
    return transactions.filter(t => isSameMonth(new Date(t.date), now));
  }, [transactions, timeFilter]);

  const totalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const profit = totalIncome - totalExpense;
  const isProfit = profit >= 0;

  // Trend data
  const profitTrend = getTrend(transactions, "income"); // Simplification for demo
  const incomeSparkline = getSparklinePoints(filteredTransactions, "income");
  const expenseSparkline = getSparklinePoints(filteredTransactions, "expense");

  // Group recent transactions
  const groupedTransactions = useMemo(() => {
    const recent = transactions.slice(0, 8);
    const groups: { title: string; data: Transaction[] }[] = [];
    
    recent.forEach(tx => {
      const d = new Date(tx.date);
      let title = format(d, "dd MMMM yyyy", { locale: id });
      if (isToday(d)) title = "Hari Ini";
      else if (isYesterday(d)) title = "Kemarin";
      
      let group = groups.find(g => g.title === title);
      if (!group) {
        group = { title, data: [] };
        groups.push(group);
      }
      group.data.push(tx);
    });
    
    return groups;
  }, [transactions]);

  const txCount = transactions.length;

  /* ── premium shimmer loader ── */
  if (loading) {
    return (
      <div className="relative z-10 p-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 shimmer-premium rounded-full" />
            <div className="h-7 w-36 shimmer-premium rounded-lg" />
          </div>
          <div className="w-9 h-9 shimmer-premium rounded-xl" />
        </div>
        <div className="h-48 shimmer-premium rounded-[24px]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 shimmer-premium rounded-2xl" />
          <div className="h-20 shimmer-premium rounded-2xl" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 shimmer-premium rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative z-10 p-5 space-y-4 pb-6">
      <GradientOrbs />

      {/* ── PWA INSTALL PROMPT ── */}
      {showPwaPrompt && (
        <div className="bg-sky-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg relative overflow-hidden content-card animate-fade-in-up">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/20 rounded-full" />
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <DownloadSimple size={20} weight="bold" />
            </div>
            <div>
              <p className="text-[13px] font-bold">Install NotaKu di HP</p>
              <p className="text-[11px] text-white/80 leading-tight mt-0.5">Lebih cepat & bisa offline</p>
            </div>
          </div>
          <div className="relative z-10 flex items-center gap-1.5">
            <button 
              onClick={() => router.push("/settings")} 
              className="bg-white text-sky-600 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm hover:scale-105 transition-transform"
            >
              Install
            </button>
            <button 
              onClick={() => {
                localStorage.setItem("notaku_pwa_prompt_dismissed", "true");
                setShowPwaPrompt(false);
              }}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER ── */}
      <div className="page-header flex items-center justify-between pt-3">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 shrink-0">
            <img
              src="/logo.png"
              alt="NotaKu Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <p className="text-[13px] text-foreground/45 font-bold tracking-wide uppercase leading-none flex items-center gap-1.5">
              <span>{greeting.text}</span>
              <span className="text-2xl leading-none translate-y-[-2px]">{greeting.emoji}</span>
            </p>
            <h1 className="text-3xl font-black tracking-[-0.03em] mt-2 leading-none">
              Nota<span className="gradient-text">Ku</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mounted && showDemoBtn && (
            <button
              onClick={handleSeedDemo}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{
                background: "var(--gradient-primary)",
                color: "white",
                boxShadow: "0 2px 10px rgba(9,60,93,0.3)",
              }}
            >
              <Lightning size={11} />
              Demo
            </button>
          )}
          {/* Tx count badge */}
          <div className="flex items-center gap-1.5 bg-foreground/[0.05] border border-foreground/[0.07] px-2.5 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[11px] font-bold text-foreground/60">
              {txCount} trx
            </span>
          </div>
          {/* Settings link */}
          <Link
            href="/settings"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.05] border border-foreground/[0.07] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
          >
            <Gear size={14} />
          </Link>
        </div>
      </div>

      {/* ── HERO PROFIT CARD ── */}
      <TiltCard maxTilt={8} scale={1.02} className="hero-card-wrapper z-10 relative">
        <div
          ref={heroRef}
          onMouseMove={handleHeroMove}
          onMouseLeave={handleHeroLeave}
          onTouchMove={handleHeroMove}
          onTouchEnd={handleHeroLeave}
          className="hero-card animate-breathing rounded-[24px] p-6 text-white relative cursor-pointer select-none overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a7b 30%, #3b7597 65%, #4a8fb4 100%)",
            boxShadow: "0 12px 40px rgba(9,60,93,0.35), 0 2px 8px rgba(9,60,93,0.15)",
            transformStyle: "preserve-3d",
          }}
        >
        {/* Dynamic Shine Effect */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300"
          style={{
            opacity: 1,
            background: "radial-gradient(circle 120px at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.15), transparent 100%)"
          }}
        />

        {/* Ambient orbs */}
        <div
          className={`absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none animate-pulse-steel`}
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)" }}
        />
        <div
          className={`absolute -bottom-16 -left-6 w-44 h-44 rounded-full pointer-events-none animate-pulse-steel`}
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)" }}
        />
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Content */}
        <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1 relative z-20">
                <p className="text-[11px] text-white/70 font-bold uppercase tracking-widest">
                  {profit > 0 ? "Net Profit" : profit < 0 ? "Net Loss" : "Net Profit"}
                </p>
                {/* Time Filter Toggle */}
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 transition-colors px-2 py-0.5 rounded-md text-[10px] font-semibold backdrop-blur-sm border border-white/10"
                  >
                    {timeFilter === "all" ? "Semua Waktu" : "Bulan Ini"}
                    <CaretDown size={10} />
                  </button>
                  
                  {isFilterOpen && (
                    <div className="absolute top-full left-0 mt-1 w-28 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-lg shadow-xl border border-white/20 dark:border-white/10 overflow-hidden z-50 text-foreground">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTimeFilter("all"); setIsFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-sky-50 dark:hover:bg-sky-400/10 transition-colors ${timeFilter === "all" ? "text-sky-500 dark:text-sky-300" : ""}`}
                      >
                        Semua Waktu
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setTimeFilter("month"); setIsFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-sky-50 dark:hover:bg-sky-400/10 transition-colors ${timeFilter === "month" ? "text-sky-500 dark:text-sky-300" : ""}`}
                      >
                        Bulan Ini
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-[34px] font-black tracking-[-0.03em] leading-none drop-shadow-md">
                <CountUp end={profit} prefix="Rp" duration={1200} />
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-2xl mt-0.5 border border-white/20 shadow-inner">
              <Wallet size={18} className="text-white" />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${
                  profitTrend.isUp ? "bg-white/10 border-white/20 text-white" : "bg-red-500/20 border-red-500/30 text-white"
                }`}
              >
                {profitTrend.isUp ? <TrendUp size={10} /> : <TrendDown size={10} />}
                <span>{profitTrend.value.toFixed(1)}%</span>
              </div>
              <p className="text-[10px] text-white/60 font-medium">
                vs bulan lalu
              </p>
            </div>
            {/* Live Indicator */}
            <div className="bg-white/10 border border-white/20 rounded-full px-2.5 py-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              <span className="text-[10px] text-white/70 font-bold">LIVE</span>
            </div>
          </div>

          {/* Target Omset Progress */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex justify-between items-end mb-1.5">
              <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wider">Target Omset Bulan Ini</p>
              <p className="text-[11px] font-bold">{Math.min(((totalIncome / 10000000) * 100), 100).toFixed(1)}%</p>
            </div>
            <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full relative transition-all duration-1000 ease-out"
                style={{ width: `${Math.min((totalIncome / 10000000) * 100, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/50 animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-white/60 font-medium mt-1.5">
              {formatRupiah(totalIncome)} / Rp10.000.000
            </p>
          </div>
        </div>
        </div>
      </TiltCard>

      {/* ── STAT PILLS (Income / Expense) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="stat-pill-wrap">
          <StatPill label="Pemasukan" value={totalIncome} color="green" icon={TrendUp} sparklinePoints={incomeSparkline} />
        </div>
        <div className="stat-pill-wrap">
          <StatPill label="Pengeluaran" value={totalExpense} color="red" icon={TrendDown} sparklinePoints={expenseSparkline} />
        </div>
      </div>

      {/* ── AI DIGEST ── */}
      <div className="content-card">
        <AIDigestCard transactions={transactions} />
      </div>

      {/* ── SPENDING ANOMALY ── */}
      <div className="content-card">
        <SpendingAnomaly transactions={transactions} />
      </div>

      {/* ── RECENT TRANSACTIONS ── */}
      <div className="content-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-[15px] tracking-tight">
            Transaksi Terakhir
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline bg-primary/10 px-2 py-1 rounded-md transition-colors"
          >
            Semua <CaretRight size={13} />
          </Link>
        </div>

        {groupedTransactions.length === 0 ? (
          <div className="clear-glass rounded-2xl text-center py-10 px-5 mt-3 relative overflow-hidden group border-dashed">
            <div className="absolute inset-0 bg-gradient-to-br from-sky-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="text-4xl mb-3 animate-float relative z-10">✨</div>
            <p className="text-foreground/70 font-bold text-sm relative z-10">
              Kanvas Finansialmu Masih Kosong
            </p>
            <p className="text-foreground/50 text-xs mt-1.5 relative z-10">
              Mulai keajaiban dengan menekan tombol{" "}
              <Link href="/scan" className="text-primary font-bold underline decoration-primary/30 underline-offset-2">
                Scan Nota
              </Link>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map((group, groupIdx) => (
              <div key={group.title} className="space-y-1">
                <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest pl-1">
                  {group.title}
                </p>
                <div className="divide-y divide-foreground/[0.05] clear-glass rounded-2xl overflow-hidden shadow-sm">
                  {group.data.map((tx, i) => (
                    <TxRow key={tx.id} tx={tx} index={groupIdx * 3 + i} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
