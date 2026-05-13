import { useMemo } from "react";
import { Transaction } from "@/types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SpendingAnomaly({ transactions }: { transactions: Transaction[] }) {
  const anomaly = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    if (expenses.length < 3) return null; // Need at least 3 expenses to establish a baseline

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const avgExpense = totalExpense / expenses.length;

    // Find the first transaction that is > 2.5x the average
    const anomalousTx = expenses.find((t) => t.amount > avgExpense * 2.5);

    if (anomalousTx) {
      return {
        ...anomalousTx,
        avg: avgExpense,
      };
    }

    return null;
  }, [transactions]);

  if (!anomaly) return null;

  return (
    <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden animate-fade-in-up">
      <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full" />
      <div className="flex items-start gap-3 relative z-10">
        <div className="bg-amber-500/20 p-2 rounded-xl text-amber-600 shrink-0">
          <AlertTriangle size={20} className="animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-1">
            Pengeluaran Tidak Wajar Dideteksi
          </h4>
          <p className="text-xs text-foreground/70 leading-snug mb-2">
            Transaksi <b>{anomaly.category}</b> sebesar{" "}
            <span className="font-bold text-red-500">{formatRupiah(anomaly.amount)}</span> pada{" "}
            {new Date(anomaly.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}{" "}
            jauh lebih tinggi dari rata-rata ({formatRupiah(anomaly.avg)}).
          </p>
          <Link
            href="/advisor"
            className="inline-block text-[11px] font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
          >
            Tanya AI Advisor cara menghemat →
          </Link>
        </div>
      </div>
    </div>
  );
}
