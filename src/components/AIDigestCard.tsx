"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/types";
import { Sparkles, Bot, TrendingUp, Lightbulb } from "lucide-react";

interface AIDigestData {
  summary: string;
  insights: string[];
  recommendation: string;
}

interface AIDigestCardProps {
  transactions: Transaction[];
}

export function AIDigestCard({ transactions }: AIDigestCardProps) {
  const [digest, setDigest] = useState<AIDigestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDigest() {
      if (!transactions || transactions.length === 0) {
        setDigest({
          summary: "Halo Juragan! Belum ada data transaksi minggu ini.",
          insights: ["Belum ada aktivitas finansial yang tercatat."],
          recommendation: "Yuk mulai catat pemasukan dan pengeluaran pertamamu!"
        });
        setLoading(false);
        return;
      }

      // Filter last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const recentTransactions = transactions.filter(t => new Date(t.date) >= sevenDaysAgo);
      
      // Calculate basic metrics for cache invalidation
      const income = recentTransactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const expense = recentTransactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const profit = income - expense;
      const txCount = recentTransactions.length;

      const cacheKey = "notaku_weekly_digest_v3"; // Bumped version after API fix
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsedCache = JSON.parse(cached);
          const isExpired = Date.now() - parsedCache.timestamp > 24 * 60 * 60 * 1000; // 24 hours
          const hasDataChanged = parsedCache.transactionCount !== txCount || parsedCache.netProfit !== profit;

          if (!isExpired && !hasDataChanged && parsedCache.digest?.summary) {
            setDigest(parsedCache.digest);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore cache error
        }
      }

      // If no valid cache, fetch from API
      try {
        const res = await fetch("/api/digest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: recentTransactions }),
        });

        if (res.ok) {
          const data = await res.json();
          setDigest(data);
          
          // Save to cache
          localStorage.setItem(cacheKey, JSON.stringify({
            digest: data,
            timestamp: Date.now(),
            transactionCount: txCount,
            netProfit: profit
          }));
        } else {
          setDigest({
            summary: "Maaf Juragan, asisten sedang beristirahat sebentar.",
            insights: ["Terjadi gangguan koneksi saat menghubungi server AI."],
            recommendation: "Coba refresh halaman ini beberapa saat lagi."
          });
        }
      } catch (error) {
        setDigest({
          summary: "Gagal terhubung ke asisten AI.",
          insights: ["Tidak ada koneksi internet atau server sedang sibuk."],
          recommendation: "Pastikan koneksi internetmu stabil ya."
        });
      } finally {
        setLoading(false);
      }
    }

    // Small delay to let other UI load first
    const timer = setTimeout(() => fetchDigest(), 500);
    return () => clearTimeout(timer);
  }, [transactions]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 animate-fade-in relative overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-primary/20 p-2 rounded-xl">
            <Bot size={20} className="text-primary animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="h-3 w-48 shimmer rounded" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-12 w-full shimmer rounded-xl" />
          <div className="h-12 w-full shimmer rounded-xl" />
        </div>
      </div>
    );
  }

  if (!digest) return null;

  return (
    <div className="relative rounded-2xl p-[1.5px] overflow-hidden animate-fade-in-up">
      {/* Animated gradient border */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 opacity-60 blur-[3px]" />
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 opacity-40 animate-pulse" />
      
      <div className="relative bg-background/95 backdrop-blur-xl rounded-2xl p-5 h-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-600 p-2 rounded-xl shadow-sm mt-0.5">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 mb-1">
              Insight Mingguan AI
            </p>
            <p className="text-sm font-medium leading-snug text-foreground/80">
              {digest.summary}
            </p>
          </div>
        </div>
        
        {/* Insights */}
        {digest.insights && digest.insights.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {digest.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2.5 bg-foreground/[0.03] p-3 rounded-xl">
                <div className="mt-0.5 text-indigo-500">
                  <TrendingUp size={16} />
                </div>
                <p className="text-[13px] font-medium text-foreground/75 leading-relaxed">
                  {insight}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        {digest.recommendation && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-3.5 rounded-xl flex items-start gap-3">
            <div className="mt-0.5 text-amber-600">
              <Lightbulb size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-0.5">Rekomendasi Tindakan</p>
              <p className="text-[13px] font-medium text-foreground/80 leading-relaxed">
                {digest.recommendation}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
