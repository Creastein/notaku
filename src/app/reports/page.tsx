import type { Metadata } from "next";
import ReportsPageClient from "./ReportsPageClient";

export const metadata: Metadata = {
  title: "Laporan Keuangan | NotaKu",
  description:
    "Grafik interaktif pengeluaran dan tren keuntungan bisnis Anda. Export ke PDF langsung dari browser.",
};

export default function Page() {
  return <ReportsPageClient />;
}
