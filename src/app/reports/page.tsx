"use client";

import { useEffect, useState } from "react";
import { Transaction } from "@/types";
import { getTransactions } from "@/lib/storage";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { FileDown, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import jsPDF from "jspdf";

function fmtRp(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
}

const COLORS = ["#10b981", "#f59e0b", "#6366f1", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316"];

export default function ReportsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7|30|90>(7);

  useEffect(() => { getTransactions().then(d => { setTxs(d); setLoading(false); }); }, []);

  const now = new Date();
  const periodTxs = txs.filter(t => new Date(t.date) >= subDays(now, period));

  const daily = Array.from({ length: Math.min(period, 14) }, (_, i) => {
    const d = startOfDay(subDays(now, Math.min(period, 14) - 1 - i));
    const day = periodTxs.filter(t => startOfDay(new Date(t.date)).getTime() === d.getTime());
    return {
      name: format(d, "dd/MM"),
      pemasukan: day.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0),
      pengeluaran: day.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  const catMap: Record<string, number> = {};
  periodTxs.filter(t => t.type === "expense").forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + t.amount; });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const sorted = [...periodTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let cum = 0;
  const trend = sorted.map(t => { cum += t.type === "income" ? t.amount : -t.amount; return { date: format(new Date(t.date), "dd/MM"), profit: cum }; });

  const totIn = periodTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totOut = periodTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const topCat = catData[0];
  const topCatPct = totOut > 0 && topCat ? Math.round((topCat.value / totOut) * 100) : 0;

  async function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(5, 150, 105);
    doc.text("NotaKu - Laporan Keuangan", 20, 25);
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text(`Dicetak: ${format(new Date(), "dd MMMM yyyy", { locale: idLocale })}`, 20, 33);
    doc.line(20, 37, 190, 37);
    
    // Add summary
    doc.setFontSize(11); doc.setTextColor(0);
    doc.text("Ringkasan", 20, 47);
    doc.setFontSize(10);
    doc.text(`Total Pemasukan: ${fmtRp(totIn)}`, 20, 57);
    doc.text(`Total Pengeluaran: ${fmtRp(totOut)}`, 20, 64);
    doc.text(`Profit: ${fmtRp(totIn - totOut)}`, 20, 71);
    doc.text(`Jumlah Transaksi: ${periodTxs.length}`, 20, 78);
    
    // Capture charts if available
    let y = 90;
    const chartsEl = document.getElementById("pdf-charts");
    if (chartsEl) {
      try {
        const html2canvas = (await import("html2canvas")).default;
        const canvas = await html2canvas(chartsEl, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        // Calculate width to fit A4 (210x297) with 20mm margins -> 170mm width
        const imgWidth = 170;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } catch (err) {
        console.error("Gagal capture grafik", err);
      }
    }

    // Detail Table
    if (y > 250) { doc.addPage(); y = 20; }
    doc.line(20, y-5, 190, y-5);
    doc.setFontSize(11); doc.text("Detail Transaksi", 20, y+5);
    y += 15;
    
    doc.setFontSize(8); doc.setTextColor(100);
    doc.text("Tanggal", 20, y); doc.text("Tipe", 55, y); doc.text("Kategori", 80, y); doc.text("Jumlah", 130, y);
    y += 7; doc.setTextColor(0);
    txs.slice(0, 100).forEach(tx => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(format(new Date(tx.date), "dd/MM/yy"), 20, y);
      doc.text(tx.type === "income" ? "Masuk" : "Keluar", 55, y);
      doc.text(tx.category, 80, y);
      doc.text(fmtRp(tx.amount), 130, y);
      y += 6;
    });
    
    doc.save("NotaKu_Laporan_Premium.pdf");
  }

  if (loading) return (
    <div className="p-5 space-y-4 animate-fade-in">
      <div className="h-8 w-40 shimmer rounded-lg" />
      {[1,2,3].map(i => <div key={i} className="h-52 shimmer rounded-2xl" />)}
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between pt-3 animate-fade-in-up">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight">Laporan</h1>
          <p className="text-sm text-foreground/40 font-medium">Analisis keuangan</p>
        </div>
        <button onClick={exportPDF} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105" style={{ background: "var(--gradient-primary)", color: "white", boxShadow: "0 2px 12px rgba(5,150,105,0.3)" }}>
          <FileDown size={16}/>PDF
        </button>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 animate-fade-in-up delay-1">
        {([7,30,90] as const).map(p => (
          <button key={p} onClick={() => setPeriod(p)} className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${period===p ? "bg-primary text-white shadow-md" : "glass-card text-foreground/50"}`}>
            {p} Hari
          </button>
        ))}
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
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-emerald-500"/><span className="text-[11px] text-foreground/40 font-medium">Pemasukan</span></div>
              <p className="text-base font-extrabold text-emerald-600">{fmtRp(totIn)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-red-500"/><span className="text-[11px] text-foreground/40 font-medium">Pengeluaran</span></div>
              <p className="text-base font-extrabold text-red-500">{fmtRp(totOut)}</p>
            </div>
          </div>

          {/* Insight Card */}
          {topCat && (
            <div className="glass-card rounded-2xl p-4 flex items-start gap-3 animate-fade-in-up delay-3">
              <div className="bg-amber-500/10 p-2 rounded-xl shrink-0"><Lightbulb size={16} className="text-amber-500"/></div>
              <div>
                <p className="text-xs font-bold text-foreground/60">Insight AI</p>
                <p className="text-xs text-foreground/40 mt-0.5">Pengeluaran terbesar: <span className="font-bold text-foreground/70">{topCat.name}</span> ({topCatPct}% dari total). {topCatPct > 40 ? "Pertimbangkan untuk mengurangi pengeluaran di kategori ini." : "Distribusi pengeluaran cukup seimbang."}</p>
              </div>
            </div>
          )}

          <div id="pdf-charts" className="space-y-4 bg-background">
            {/* Bar Chart */}
            <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-4">
              <h3 className="font-bold text-sm mb-4">Pemasukan vs Pengeluaran</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(1)}jt`} />
                  <Tooltip formatter={(v) => fmtRp(Number(v))} />
                  <Bar dataKey="pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="pengeluaran" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            {catData.length > 0 && (
              <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-5">
                <h3 className="font-bold text-sm mb-4">Pengeluaran per Kategori</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${((percent||0)*100).toFixed(0)}%`}>
                      {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtRp(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Trend Line */}
            {trend.length > 1 && (
              <div className="glass-card rounded-2xl p-4 animate-fade-in-up delay-6">
                <h3 className="font-bold text-sm mb-4">Tren Profit</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trend}>
                    <defs>
                      <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1e6).toFixed(1)}jt`} />
                    <Tooltip formatter={(v) => fmtRp(Number(v))} />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2.5} fill="url(#profitGrad)" dot={{ r: 3, fill: "#10b981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
