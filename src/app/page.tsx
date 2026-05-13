"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Transaction } from "@/types";
import { getTransactions, seedDemoData, hasDemoData } from "@/lib/storage";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  Plus,
  BarChart3,
  Sparkles,
  ChevronRight,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AIDigestCard } from "@/components/AIDigestCard";
import { SpendingAnomaly } from "@/components/SpendingAnomaly";

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

/* ─────────────────── animated counter ─────────────────── */

function AnimatedNumber({ value, prefix = "" }: { value: number; prefix?: string }) {
  const elRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const from = prevRef.current;
    const to = value;
    prevRef.current = to;
    const start = performance.now();
    const dur = 900;
    const raf = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 4); // quartic ease-out
      const current = from + (to - from) * eased;
      el.textContent =
        prefix +
        new Intl.NumberFormat("id-ID", {
          style: "currency",
          currency: "IDR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(current);
      if (t < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [value, prefix]);

  return <span ref={elRef}>{prefix}{formatRupiah(value)}</span>;
}

/* ─────────────────── mini stat pill ─────────────────── */

function StatPill({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: "green" | "red";
  icon: React.ElementType;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl flex-1 ${
        color === "green"
          ? "bg-emerald-500/[0.08] border border-emerald-500/20"
          : "bg-red-500/[0.08] border border-red-500/20"
      }`}
    >
      <div
        className={`p-1.5 rounded-lg ${
          color === "green" ? "bg-emerald-500/15" : "bg-red-500/15"
        }`}
      >
        <Icon
          size={13}
          className={color === "green" ? "text-emerald-500" : "text-red-500"}
          strokeWidth={2.5}
        />
      </div>
      <div className="min-w-0">
        <p
          className={`text-[10px] font-semibold uppercase tracking-wider ${
            color === "green" ? "text-emerald-600/70" : "text-red-500/70"
          }`}
        >
          {label}
        </p>
        <p
          className={`text-xs font-extrabold truncate ${
            color === "green" ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {formatRupiah(value)}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── quick action button ─────────────────── */

function QuickAction({
  href,
  icon: Icon,
  label,
  sub,
  gradient,
  textColor,
  delay,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  sub: string;
  gradient: string;
  textColor: string;
  delay: number;
}) {
  const btnRef = useRef<HTMLAnchorElement>(null);

  // Magnetic hover effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.2;
    const dy = (e.clientY - cy) * 0.2;
    gsap.to(el, { x: dx, y: dy, duration: 0.3, ease: "power2.out" });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
  }, []);

  return (
    <Link
      ref={btnRef}
      href={href}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="qa-item flex flex-col items-center gap-2.5 will-change-transform"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Icon bubble */}
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg relative overflow-hidden"
        style={{ background: gradient }}
      >
        <div className="absolute inset-0 bg-white/10 rounded-2xl" />
        <Icon size={22} className="text-white relative z-10" strokeWidth={2} />
      </div>
      <div className="text-center">
        <p className={`text-[11px] font-bold ${textColor}`}>{label}</p>
        <p className="text-[9px] text-foreground/35 font-medium">{sub}</p>
      </div>
    </Link>
  );
}

/* ─────────────────── transaction row ─────────────────── */

function TxRow({ tx, index }: { tx: Transaction; index: number }) {
  const isIncome = tx.type === "income";
  return (
    <div
      className="tx-row flex items-center justify-between py-3 px-1 group cursor-default"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            isIncome
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500"
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
            {format(new Date(tx.date), "dd MMM", { locale: id })}
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
          isIncome ? "text-emerald-600" : "text-red-500"
        }`}
      >
        {isIncome ? "+" : "−"}
        {formatRupiah(tx.amount)}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── GSAP entrance sequence ── */
  useGSAP(
    () => {
      if (loading) return;

      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      // Hero card with spring pop
      tl.fromTo(
        ".hero-card",
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.4)" }
      )
        // Header fades in from top
        .fromTo(
          ".page-header",
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5 },
          "<0.1"
        )
        // Stat pills slide up
        .fromTo(
          ".stat-pill-wrap",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, stagger: 0.07 },
          "-=0.3"
        )
        // Quick actions stagger from bottom
        .fromTo(
          ".qa-item",
          { y: 24, opacity: 0, scale: 0.88 },
          { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.7)" },
          "-=0.2"
        )
        // Cards below fade in
        .fromTo(
          ".content-card",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.06 },
          "-=0.15"
        );
    },
    { scope: containerRef, dependencies: [loading] }
  );

  /* ── Hero card tilt on touch/mouse ── */
  const heroRef = useRef<HTMLDivElement>(null);

  const handleHeroMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rx = ((clientY - rect.top) / rect.height - 0.5) * -10;
    const ry = ((clientX - rect.left) / rect.width - 0.5) * 10;
    gsap.to(el, {
      rotateX: rx,
      rotateY: ry,
      duration: 0.4,
      ease: "power2.out",
      transformPerspective: 600,
    });
  }, []);

  const handleHeroLeave = useCallback(() => {
    const el = heroRef.current;
    if (!el) return;
    gsap.to(el, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: "elastic.out(1, 0.5)",
      transformPerspective: 600,
    });
  }, []);

  /* ── data loading ── */
  useEffect(() => {
    if (!localStorage.getItem("notaku_onboarded")) {
      router.push("/onboarding");
      return;
    }
    loadData();
  }, [router]);

  async function loadData() {
    setLoading(true);
    const data = await getTransactions();
    setTransactions(data);
    setLoading(false);
  }

  function handleSeedDemo() {
    const data = seedDemoData();
    setTransactions(data);
  }

  /* ── derived values ── */
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const profit = totalIncome - totalExpense;
  const recentTransactions = transactions.slice(0, 5);
  const { text: greeting, emoji } = getGreeting();
  const txCount = transactions.length;
  const isProfit = profit >= 0;

  /* ── shimmer loader ── */
  if (loading) {
    return (
      <div className="p-5 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 shimmer rounded-full" />
            <div className="h-7 w-36 shimmer rounded-lg" />
          </div>
          <div className="w-9 h-9 shimmer rounded-xl" />
        </div>
        <div className="h-44 shimmer rounded-3xl" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-20 shimmer rounded-2xl" />
          <div className="h-20 shimmer rounded-2xl" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 shimmer rounded-2xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-5 space-y-4 pb-6">

      {/* ── HEADER ── */}
      <div className="page-header flex items-center justify-between pt-3">
        <div>
          <p className="text-xs text-foreground/45 font-semibold tracking-wide uppercase">
            {greeting} {emoji}
          </p>
          <h1 className="text-[26px] font-black tracking-[-0.03em] mt-0.5 leading-none">
            Nota<span className="gradient-text">Ku</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {!hasDemoData() && (
            <button
              onClick={handleSeedDemo}
              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{
                background: "var(--gradient-primary)",
                color: "white",
                boxShadow: "0 2px 10px rgba(5,150,105,0.3)",
              }}
            >
              <Zap size={11} />
              Demo
            </button>
          )}
          {/* Tx count badge */}
          <div className="flex items-center gap-1.5 bg-foreground/[0.05] border border-foreground/[0.07] px-2.5 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-foreground/60">
              {txCount} transaksi
            </span>
          </div>
        </div>
      </div>

      {/* ── HERO PROFIT CARD ── */}
      <div
        ref={heroRef}
        onMouseMove={handleHeroMove}
        onMouseLeave={handleHeroLeave}
        onTouchMove={handleHeroMove}
        onTouchEnd={handleHeroLeave}
        className="hero-card rounded-[24px] p-6 text-white relative overflow-hidden cursor-pointer select-none"
        style={{
          background: isProfit
            ? "linear-gradient(145deg, #047857 0%, #059669 45%, #10b981 80%, #34d399 100%)"
            : "linear-gradient(145deg, #991b1b 0%, #b91c1c 45%, #dc2626 80%, #ef4444 100%)",
          boxShadow: isProfit
            ? "0 12px 40px rgba(5,150,105,0.4), 0 2px 8px rgba(5,150,105,0.2)"
            : "0 12px 40px rgba(239,68,68,0.4), 0 2px 8px rgba(239,68,68,0.2)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Ambient orbs */}
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-16 -left-6 w-44 h-44 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)" }}
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
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] text-white/60 font-bold uppercase tracking-widest mb-1">
                {isProfit ? "Net Profit" : "Net Loss"} · Semua Waktu
              </p>
              <div className="text-[34px] font-black tracking-[-0.03em] leading-none">
                <AnimatedNumber value={profit} />
              </div>
            </div>
            <div className="bg-white/15 backdrop-blur-sm p-2.5 rounded-2xl mt-0.5 border border-white/20">
              <Wallet size={18} className="text-white" />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                  isProfit ? "bg-white/20" : "bg-white/20"
                }`}
              >
                {isProfit ? (
                  <TrendingUp size={12} className="text-white" />
                ) : (
                  <TrendingDown size={12} className="text-white" />
                )}
              </div>
              <p className="text-xs text-white/70 font-semibold">
                {isProfit ? "Usaha Anda Untung 🎉" : "Perlu Dioptimalkan"}
              </p>
            </div>
            <div className="bg-white/10 border border-white/20 rounded-full px-2.5 py-1 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
              <span className="text-[10px] text-white/70 font-bold">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── STAT PILLS (Income / Expense) ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="stat-pill-wrap">
          <StatPill label="Pemasukan" value={totalIncome} color="green" icon={TrendingUp} />
        </div>
        <div className="stat-pill-wrap">
          <StatPill label="Pengeluaran" value={totalExpense} color="red" icon={TrendingDown} />
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div className="glass-card rounded-[20px] p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider">
            Aksi Cepat
          </p>
          <Sparkles size={13} className="text-primary/60" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction
            href="/scan"
            icon={Camera}
            label="Scan Nota"
            sub="AI OCR"
            gradient="linear-gradient(135deg, #059669, #10b981)"
            textColor="text-emerald-700"
            delay={0}
          />
          <QuickAction
            href="/transactions"
            icon={Plus}
            label="Tambah"
            sub="Manual input"
            gradient="linear-gradient(135deg, #d97706, #f59e0b)"
            textColor="text-amber-700"
            delay={60}
          />
          <QuickAction
            href="/reports"
            icon={BarChart3}
            label="Laporan"
            sub="Analitik"
            gradient="linear-gradient(135deg, #4f46e5, #6366f1)"
            textColor="text-indigo-700"
            delay={120}
          />
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
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-black text-[15px] tracking-tight">
            Transaksi Terakhir
          </h2>
          <Link
            href="/transactions"
            className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:underline"
          >
            Semua <ChevronRight size={13} />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="glass-card rounded-2xl text-center py-10 px-5 mt-3">
            <div className="text-4xl mb-3 animate-float">📭</div>
            <p className="text-foreground/60 font-semibold text-sm">
              Belum ada transaksi
            </p>
            <p className="text-foreground/40 text-xs mt-1.5">
              Mulai dengan{" "}
              <Link href="/scan" className="text-primary font-semibold">
                scan nota
              </Link>{" "}
              pertamamu!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-foreground/[0.05]">
            {recentTransactions.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} index={i} />
            ))}
          </div>
        )}

        {transactions.length > 5 && (
          <Link
            href="/transactions"
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-foreground/50 hover:text-primary hover:bg-primary/5 transition-colors duration-200"
          >
            Lihat {transactions.length - 5} transaksi lainnya
            <ChevronRight size={13} />
          </Link>
        )}
      </div>

    </div>
  );
}
