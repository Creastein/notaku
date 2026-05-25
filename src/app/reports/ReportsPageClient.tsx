"use client";

import { useEffect, useState, useRef } from "react";
import { Transaction } from "@/types";
import { getTransactions, getUserProfile, UserProfile } from "@/lib/storage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { FileArrowDown, TrendUp, TrendDown, Gear, Sparkle } from "@phosphor-icons/react";
import { useToast } from "@/components/Toast";
import LinkNext from "next/link";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { GradientOrbs } from "@/components/effects/GradientOrbs";
import { TiltCard } from "@/components/effects/TiltCard";

function fmtRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

function formatYAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
  return String(value);
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl p-3.5 border border-white/10 shadow-2xl backdrop-blur-md text-xs font-semibold space-y-1.5 bg-slate-950/95 text-slate-100 min-w-[150px]">
        <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">{label}</p>
        {payload.map((pld: any, index: number) => {
          const color = pld.color || pld.fill || "#38bdf8";
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-200">{pld.name}</span>
              </div>
              <span className="font-extrabold text-right" style={{ color }}>{fmtRp(pld.value)}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const COLORS = ["#2dd4bf", "#3b7597", "#94a3b8", "#c4b5fd", "#093c5d", "#0ea5e9", "#64748b", "#38bdf8"];

export default function ReportsPageClient() {
  const router = useRouter();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7|30|90>(7);
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
    getTransactions().then(d => { setTxs(d); setLoading(false); });
    setProfile(getUserProfile());
  }, []);

  // Robust local date formatting to prevent timezone shifts and Safari parsing bugs
  function getLocalDateString(dateInput: any): string {
    try {
      if (!dateInput) return "";
      const dateObj = new Date(dateInput);
      if (isNaN(dateObj.getTime())) return "";
      
      // If it's a pure YYYY-MM-DD string, return directly
      if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
        return dateInput;
      }
      
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "";
    }
  }

  // All Date-dependent calculations only run client-side after mount
  const now = mounted ? new Date() : new Date(0);
  const threshold = startOfDay(subDays(now, period));
  const periodTxs = mounted ? txs.filter(t => {
    const tDate = new Date(t.date);
    return !isNaN(tDate.getTime()) && tDate >= threshold;
  }) : [];

  const daily = mounted ? Array.from({ length: Math.min(period, 14) }, (_, i) => {
    const d = startOfDay(subDays(now, Math.min(period, 14) - 1 - i));
    const dStr = getLocalDateString(d);
    const day = periodTxs.filter(t => getLocalDateString(t.date) === dStr);
    return {
      name: format(d, "dd/MM"),
      pemasukan: day.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      pengeluaran: day.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  }) : [];

  const catMap: Record<string, number> = {};
  if (mounted) {
    periodTxs.filter(t => t.type === "expense").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  }
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  interface AIDigest {
    healthScore: number;
    healthLabel: string;
    executiveSummary: string;
    keyFindings: string[];
    risks: string[];
    recommendations: { title: string; description: string; priority: string; estimatedImpact: string }[];
    cashflowVerdict: string;
    targetProgress: string;
  }
  const [aiDigest, setAiDigest] = useState<AIDigest | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    if (!mounted || txs.length === 0) return;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds client-side timeout

    async function fetchAiAnalysis() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setAiLoading(true);
      setAiError(false);

      const cacheKey = `notaku_report_analysis_${period}_v1`;
      const cached = localStorage.getItem(cacheKey);

      const income = periodTxs.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
      const expense = periodTxs.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
      const profit = income - expense;
      const txCount = periodTxs.length;

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isExpired = Date.now() - parsed.timestamp > 12 * 60 * 60 * 1000;
          const dataChanged = parsed.transactionCount !== txCount || parsed.netProfit !== profit;

          if (!isExpired && !dataChanged && parsed.analysis?.executiveSummary) {
            setAiDigest(parsed.analysis);
            setAiLoading(false);
            isFetchingRef.current = false;
            clearTimeout(timeoutId);
            return;
          }
        } catch {
          // ignore cache error
        }
      }

      try {
        const res = await fetch("/api/report-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            financialData: {
              totalIncome: income,
              totalExpense: expense,
              netProfit: profit,
              transactionCount: txCount,
              periodText: `${period} Hari Terakhir`,
              categories: catData
            },
            profile,
            period
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.analysis) {
            setAiDigest(data.analysis);
            localStorage.setItem(cacheKey, JSON.stringify({
              analysis: data.analysis,
              timestamp: Date.now(),
              transactionCount: txCount,
              netProfit: profit
            }));
          } else {
            setAiError(true);
          }
        } else {
          setAiError(true);
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.warn("Report AI analysis fetch aborted due to timeout");
        } else {
          console.error("Gagal mendapatkan analisis AI:", err);
          setAiError(true);
        }
      } finally {
        setAiLoading(false);
        isFetchingRef.current = false;
        clearTimeout(timeoutId);
      }
    }

    fetchAiAnalysis();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      isFetchingRef.current = false;
    };
  }, [txs, period, mounted, profile, retryTrigger]);

  const sorted = mounted ? [...periodTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) : [];
  let cum = 0;
  const trend = sorted.map(t => { cum += t.type === "income" ? t.amount : -t.amount; return { date: format(new Date(t.date), "dd/MM"), profit: cum }; });

  const totIn = periodTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totOut = periodTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const topCat = catData[0];
  const topCatPct = totOut > 0 && topCat ? Math.round((topCat.value / totOut) * 100) : 0;

  async function exportPDF() {
   try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // 1. Premium Header (Kop Surat)
    // Dark Navy Accent line at the very top
    doc.setFillColor(9, 60, 93);
    doc.rect(0, 0, 210, 8, "F");

    // Title / Brand
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(9, 60, 93);
    doc.text("NotaKu", 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Pencatatan Keuangan & CFO AI Pendamping UMKM", 20, 29);

    // Business Profile Box (Right Side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(profile?.businessName || "Nama Usaha", 130, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100);
    doc.text(`Pemilik: ${profile?.ownerName || "-"}`, 130, 24.5);
    doc.text(`Kategori Usaha: ${profile?.businessCategory || "-"}`, 130, 29);
    const targetText = profile?.targetMonthlyRevenue ? fmtRp(profile.targetMonthlyRevenue) : "-";
    doc.text(`Target Omset: ${targetText}`, 130, 33.5);

    // Elegant Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);

    // 2. Title & Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("LAPORAN ANALISIS KEUANGAN", 20, 48);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    const printedDate = format(new Date(), "dd MMMM yyyy, HH:mm", { locale: idLocale });
    doc.text(`Periode Laporan: ${period} Hari Terakhir  |  Waktu Cetak: ${printedDate} WIB`, 20, 53);

    // 3. Financial KPI Summary Cards
    // 3 columns at y = 59, height = 20mm. Each width = 52mm, gap = 7mm
    // Card 1: Pemasukan
    doc.setFillColor(240, 249, 255); // Soft sky bg
    doc.setDrawColor(186, 230, 253); // border
    doc.roundedRect(20, 59, 52, 20, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("TOTAL PEMASUKAN", 24, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text(fmtRp(totIn), 24, 73);

    // Card 2: Pengeluaran
    doc.setFillColor(255, 241, 242); // Soft rose bg
    doc.setDrawColor(254, 205, 211); // border
    doc.roundedRect(79, 59, 52, 20, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("TOTAL PENGELUARAN", 83, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(251, 113, 133); // rose-400
    doc.text(fmtRp(totOut), 83, 73);

    // Card 3: Profit Bersih
    const isProfit = totIn - totOut >= 0;
    if (isProfit) {
      doc.setFillColor(240, 249, 255); // Soft sky bg
      doc.setDrawColor(186, 230, 253); // border
    } else {
      doc.setFillColor(255, 241, 242); // Soft rose bg
      doc.setDrawColor(254, 205, 211); // border
    }
    doc.roundedRect(138, 59, 52, 20, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("PROFIT BERSIH", 142, 65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    if (isProfit) {
      doc.setTextColor(56, 189, 248); // sky-400
    } else {
      doc.setTextColor(251, 113, 133); // rose-400
    }
    doc.text(fmtRp(totIn - totOut), 142, 73);

    // 4. Trend & Chart Capture
    let y = 87;
    const chartsEl = document.getElementById("pdf-charts");
    if (chartsEl) {
      try {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(30, 41, 59);
        doc.text("Visualisasi Tren & Kategori", 20, y + 5);
        doc.setDrawColor(241, 245, 249);
        doc.line(20, y + 8, 190, y + 8);
        y += 11;

        // Apply temporary print-friendly styles for high-contrast screenshotting to the parent container
        chartsEl.classList.add("pdf-export-mode");
        
        // Brief pause to allow style recalculation & paint to complete before screenshotting
        await new Promise((resolve) => setTimeout(resolve, 150));

        const html2canvas = (await import("html2canvas")).default;
        
        // Get all individual chart cards
        const chartCards = Array.from(chartsEl.children) as HTMLElement[];
        
        for (let i = 0; i < chartCards.length; i++) {
          const cardEl = chartCards[i];
          if (!cardEl.classList.contains("glass-card")) continue;

          const canvas = await html2canvas(cardEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff", // clean premium light background for printing!
          } as any);

          const imgData = canvas.toDataURL("image/png");
          
          // Maximize to full width of A4 (170mm)
          const finalImgWidth = 170;
          const finalImgHeight = (canvas.height * finalImgWidth) / canvas.width;
          
          // If rendering this chart exceeds page height (A4 height ~297mm, bottom margin ~20mm -> max Y ~277)
          if (y + finalImgHeight > 277) {
            doc.addPage();
            y = 20; // reset y for new page
          }

          doc.addImage(imgData, "PNG", 20, y, finalImgWidth, finalImgHeight);
          y += finalImgHeight + 8; // 8mm gap between charts
        }

        // Revert to original dashboard style immediately
        chartsEl.classList.remove("pdf-export-mode");
      } catch (err) {
        // Clean up class just in case an error occurs
        chartsEl.classList.remove("pdf-export-mode");
        console.error("Gagal capture grafik untuk PDF", err);
      }
    }

    // 4.5. AI CFO Analysis Section in PDF
    if (aiDigest) {
      if (y > 180) {
        doc.addPage();
        y = 20;
      } else {
        y += 6;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(9, 60, 93); // Navy color for AI!
      doc.text("Analisis & Peringatan AI CFO", 20, y);
      doc.setDrawColor(186, 220, 235);
      doc.line(20, y + 3, 190, y + 3);
      y += 8;

      // Draw background card for AI content
      doc.setFillColor(249, 250, 251); // ultra light gray/white
      doc.setDrawColor(229, 231, 235); // border
      
      const boxStartY = y;
      let textY = y + 6;

      // Health Score / Tag
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`Skor Kesehatan Bisnis: ${aiDigest.healthScore}/100 (${aiDigest.healthLabel})`, 25, textY);
      
      // Target Progress / Cashflow Verdict
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Aliran Kas: ${aiDigest.cashflowVerdict} | Kemajuan Target Omset: ${aiDigest.targetProgress}`, 25, textY + 5);
      textY += 12;

      // 1. Executive Summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Ringkasan Eksekutif:", 25, textY);
      textY += 4.5;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const summaryLines = doc.splitTextToSize(aiDigest.executiveSummary, 160);
      doc.text(summaryLines, 25, textY);
      textY += (summaryLines.length * 4) + 4;

      // 2. Temuan Penting & Risiko
      if ((aiDigest.keyFindings && aiDigest.keyFindings.length > 0) || (aiDigest.risks && aiDigest.risks.length > 0)) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Temuan & Risiko Utama:", 25, textY);
        textY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        
        const allFindings = [...(aiDigest.keyFindings || []), ...(aiDigest.risks || []).map(r => `[Peringatan] ${r}`)];
        allFindings.forEach((finding) => {
          const findingLines = doc.splitTextToSize(`• ${finding}`, 155);
          doc.text(findingLines, 25, textY);
          textY += (findingLines.length * 4) + 2;
        });
        textY += 2;
      }

      // 3. Recommendation Box
      if (aiDigest.recommendations && aiDigest.recommendations.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Rekomendasi Tindakan CFO:", 25, textY);
        textY += 4.5;

        aiDigest.recommendations.forEach((rec) => {
          doc.setFillColor(254, 251, 232); // amber 50
          doc.setDrawColor(254, 243, 199); // amber 100
          
          const recText = `${rec.title} - ${rec.description} (Prioritas: ${rec.priority} | Dampak: ${rec.estimatedImpact})`;
          const recLines = doc.splitTextToSize(recText, 150);
          const recHeight = (recLines.length * 3.8) + 6;

          if (textY + recHeight > 270) {
            // Draw background for what we have done
            doc.setDrawColor(229, 231, 235);
            doc.setFillColor(0, 0, 0, 0); 
            doc.roundedRect(20, boxStartY, 170, (textY - boxStartY - 2), 3, 3, "D");
            
            doc.addPage();
            y = 20;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(9, 60, 93);
            doc.text("Rekomendasi Tindakan (Lanjutan)", 20, y);
            doc.setDrawColor(186, 220, 235);
            doc.line(20, y + 3, 190, y + 3);
            y += 8;
            
            textY = y + 6;
          }

          doc.roundedRect(24, textY, 162, recHeight, 2, 2, "FD");
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          doc.text(recLines, 28, textY + 4.5);
          textY += recHeight + 3;
        });
      }

      // Draw the outer container box
      doc.setDrawColor(229, 231, 235);
      doc.setFillColor(0, 0, 0, 0); // transparent fill
      doc.roundedRect(20, boxStartY, 170, (textY - boxStartY - 2), 3, 3, "D");
      
      y = textY + 6;
    }

    // 5. Detailed Transaction Table (autotable)
    // If the next table is too close to bottom of page (Y > 210), start on fresh page!
    if (y > 210) {
      doc.addPage();
      y = 20;
    } else {
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Rincian Transaksi Finansial", 20, y);

    // jspdf-autotable custom rendering
    autoTable(doc, {
      startY: y + 4,
      head: [["Tanggal", "Tipe", "Kategori", "Merchant / Keterangan", "Nominal"]],
      body: periodTxs.map(tx => {
        const formattedDate = format(new Date(tx.date), "dd/MM/yyyy");
        const txType = tx.type === "income" ? "Masuk" : "Keluar";
        const desc = tx.merchantName 
          ? `${tx.merchantName}${tx.notes ? ` (${tx.notes})` : ""}`
          : (tx.notes || "-");
        return [
          formattedDate,
          txType,
          tx.category,
          desc,
          fmtRp(tx.amount)
        ];
      }),
      styles: {
        fontSize: 8,
        font: "helvetica",
        cellPadding: 2.5,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [9, 60, 93],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 20 },
        2: { cellWidth: 32 },
        3: { cellWidth: 64 },
        4: { cellWidth: 30, halign: "right", fontStyle: "bold" }
      },
      margin: { left: 20, right: 20 },
      theme: "striped",
      didDrawPage: function (data) {
        // Footer signature for each page
        const currentPage = data.pageNumber;

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont("helvetica", "normal");
        
        // Border line at the footer
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(20, 283, 190, 283);

        doc.text(`NotaKu CFO AI Laporan Finansial  |  Dihasilkan secara otomatis`, 20, 288);
        doc.text(`Halaman ${currentPage}`, 190, 288, { align: "right" });
      }
    });

    const fileSuffix = profile?.businessName 
      ? profile.businessName.replace(/\s+/g, "_")
      : "UMKM";
    doc.save(`Laporan_Finansial_NotaKu_${fileSuffix}.pdf`);
    showToast({ type: "success", title: "PDF berhasil diunduh! 📄", message: `Laporan_Finansial_NotaKu_${fileSuffix}.pdf telah tersimpan.` });
   } catch (err) {
    console.error("PDF export error:", err);
    showToast({ type: "error", title: "Gagal membuat PDF", message: "Terjadi kesalahan saat mengekspor laporan." });
   }
  }

  if (loading) return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="h-8 w-40 shimmer rounded-lg" />
      {[1,2,3].map(i => <div key={i} className="h-52 shimmer rounded-2xl" />)}
    </div>
  );

  return (
    <div className="relative min-h-screen pb-20">
      <GradientOrbs />
      
      <div className="p-5 space-y-4 relative z-10">
        <div className="flex items-center justify-between pt-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Laporan</h1>
          <p className="text-sm text-foreground/40 font-medium">Analisis keuangan</p>
        </div>
        <div className="flex items-center gap-2">
          <LinkNext
            href="/settings"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.05] border border-foreground/[0.07] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
          >
            <Gear size={14} />
          </LinkNext>
          <button onClick={exportPDF} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: "var(--gradient-primary)", color: "white", boxShadow: "0 2px 12px rgba(9, 60, 93, 0.3)" }}>
            <FileArrowDown size={16}/>PDF
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex animate-fade-in-up delay-1">
        <div className="glass-card rounded-2xl p-1 flex gap-1 shadow-sm">
          {([7, 30, 90] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                period === p
                  ? "bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]"
                  : "text-foreground/50 hover:text-foreground/85 hover:bg-foreground/[0.02]"
              }`}
            >
              {p} Hari
            </button>
          ))}
        </div>
      </div>

      {txs.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-14 animate-fade-in-up">
          <div className="text-4xl mb-3 animate-float">📈</div>
          <p className="text-foreground/60 font-semibold text-sm">Tambahkan transaksi dulu</p>
          <p className="text-foreground/30 text-xs mt-1">Grafik akan muncul setelah ada data</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-2">
            <TiltCard>
              <div className="glass-card rounded-2xl p-4 h-full relative overflow-hidden group">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-lg bg-sky-400/10 text-sky-500 dark:text-sky-300">
                    <TrendUp size={14} />
                  </div>
                  <span className="text-[11px] text-foreground/45 font-bold uppercase tracking-wider">Pemasukan</span>
                </div>
                <p className="text-lg font-black text-sky-500 mt-1">{fmtRp(totIn)}</p>
                <div className="absolute -right-3 -bottom-3 text-sky-400/5 group-hover:scale-110 transition-transform duration-300">
                  <TrendUp size={64} />
                </div>
              </div>
            </TiltCard>
            <TiltCard>
              <div className="glass-card rounded-2xl p-4 h-full relative overflow-hidden group">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1 rounded-lg bg-rose-400/10 text-rose-500 dark:text-rose-300">
                    <TrendDown size={14} />
                  </div>
                  <span className="text-[11px] text-foreground/45 font-bold uppercase tracking-wider">Pengeluaran</span>
                </div>
                <p className="text-lg font-black text-rose-400 mt-1">{fmtRp(totOut)}</p>
                <div className="absolute -right-3 -bottom-3 text-rose-400/5 group-hover:scale-110 transition-transform duration-300">
                  <TrendDown size={64} />
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Real AI Advisor Card - Simplified Option 3 */}
          {aiLoading ? (
            <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-3 space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-3">
                <div className="bg-sky-400/10 p-2 rounded-xl text-sky-400 shadow-sm shrink-0">
                  <Sparkle className="animate-pulse" size={16} />
                </div>
                <div className="h-4 w-32 bg-foreground/10 rounded animate-pulse" />
              </div>
              <div className="h-3 w-5/6 bg-foreground/5 rounded animate-pulse" />
            </div>
          ) : aiError ? (
            <div className="glass-card rounded-2xl p-4 border border-rose-500/20 bg-rose-500/5 animate-fade-in-up delay-3 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="bg-rose-500/10 p-2 rounded-xl text-rose-500 dark:text-rose-400 shadow-sm shrink-0">
                    <Sparkle size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-rose-500 dark:text-rose-400 uppercase tracking-widest">AI CFO Penasihat</p>
                    <p className="text-[10px] text-rose-500/70 font-semibold mt-0.5">Analisis tertunda / timeout</p>
                  </div>
                </div>
                <button
                  onClick={() => setRetryTrigger(prev => prev + 1)}
                  className="px-3 py-1 rounded-xl text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all border border-rose-500/20 active:scale-95 cursor-pointer"
                >
                  Coba Lagi 🔄
                </button>
              </div>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Maaf Juragan, koneksi server AI sedang sibuk atau melambat. Silakan klik tombol di kanan atas untuk memuat ulang analisis.
              </p>
            </div>
          ) : aiDigest ? (
            <div className="relative rounded-2xl p-[1.5px] overflow-hidden animate-fade-in-up delay-3 shadow-lg shadow-sky-400/5">
              {/* Dynamic premium glowing border */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#38bdf8]/15 via-cyan-500/15 to-[#3b7597]/15 blur-[2px]" />
              <div className="relative bg-white/35 dark:bg-slate-950/40 backdrop-blur-2xl rounded-2xl p-4 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-sky-400 to-cyan-600 p-2 rounded-xl text-white shadow-sm shadow-sky-400/10 shrink-0">
                    <Sparkle size={16} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-black text-sky-500 dark:text-sky-300 uppercase tracking-widest">AI CFO Penasihat</p>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-500">
                      Skor Sehat: {aiDigest.healthScore}/100
                    </span>
                  </div>
                </div>
                
                {/* Body Text */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-foreground/90 leading-relaxed">
                    {aiDigest.executiveSummary}
                  </p>
                  <p className="text-[11px] text-foreground/50 flex flex-wrap gap-x-2">
                    <span>Aliran Kas: <span className="font-bold text-foreground/70">{aiDigest.cashflowVerdict}</span></span>
                    <span className="hidden sm:inline">|</span>
                    <span>Target Omset: <span className="font-bold text-foreground/70">{aiDigest.targetProgress}</span></span>
                  </p>
                </div>
                
                {/* Action Button */}
                <button
                  onClick={() => {
                    localStorage.setItem(
                      "notaku_pending_advisor_prompt",
                      `Berikan saya rekomendasi keuangan berdasarkan laporan keuangan ${period} hari terakhir. Skor kesehatan bisnis saya adalah ${aiDigest.healthScore}/100 dengan status aliran kas "${aiDigest.cashflowVerdict}" dan pencapaian target "${aiDigest.targetProgress}".`
                    );
                    router.push("/advisor");
                  }}
                  className="w-full mt-1 py-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                  style={{
                    background: "var(--gradient-primary)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(9, 60, 93, 0.2)"
                  }}
                >
                  Diskusikan Rekomendasi di AI Chat ➔
                </button>
              </div>
            </div>
          ) : null}

          <div id="pdf-charts" className="space-y-4 bg-background">
            {/* Bar Chart */}
            <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-4">
              <h3 className="font-extrabold text-sm mb-4 tracking-tight">Pemasukan vs Pengeluaran</h3>
              <div className="w-full h-[200px] relative min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: "var(--foreground)", opacity: 0.5 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "var(--foreground)", opacity: 0.5 }} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pemasukan" name="Pemasukan" fill="#2dd4bf" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="pengeluaran" name="Pengeluaran" fill="#fb7185" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart */}
            {catData.length > 0 && (
              <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-5">
                <h3 className="font-extrabold text-sm mb-4 tracking-tight">Pengeluaran per Kategori</h3>
                <div className="relative flex items-center justify-center h-[200px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <PieChart>
                      <Pie
                        data={catData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                        isAnimationActive={false}
                      >
                        {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-wider text-foreground/45 font-bold">Total Keluar</span>
                    <span className="text-base font-black text-rose-400 mt-0.5">{fmtRp(totOut)}</span>
                  </div>
                </div>

                {/* Premium Bento Grid Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {catData.map((item, i) => {
                    const percent = totOut > 0 ? (item.value / totOut) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex flex-col p-3 rounded-2xl glass-card relative overflow-hidden transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md"
                        style={{ borderLeft: `4px solid ${COLORS[i % COLORS.length]}` }}
                      >
                        <span className="text-xs font-bold text-foreground/75 truncate">{item.name}</span>
                        <div className="flex items-baseline justify-between mt-1 gap-1">
                          <span className="text-sm font-extrabold text-foreground">{fmtRp(item.value)}</span>
                          <span className="text-[10px] font-black text-foreground/40 shrink-0">{percent.toFixed(0)}%</span>
                        </div>
                        <div
                          className="absolute inset-0 opacity-[0.03] pointer-events-none"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trend Line */}
            {trend.length > 1 && (
              <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-6">
                <h3 className="font-extrabold text-sm mb-4 tracking-tight">Tren Profit</h3>
                <div className="w-full h-[200px] relative min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 600, fill: "var(--foreground)", opacity: 0.5 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: "var(--foreground)", opacity: 0.5 }} tickFormatter={formatYAxis} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" name="Tren Profit" dataKey="profit" stroke="#2dd4bf" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ r: 3.5, fill: "#2dd4bf", strokeWidth: 1, stroke: "#fff" }} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      </div>
    </div>
  );
}
