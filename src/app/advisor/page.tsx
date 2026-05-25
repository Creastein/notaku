import type { Metadata } from "next";
import AdvisorPageClient from "./AdvisorPageClient";

export const metadata: Metadata = {
  title: "AI Financial Advisor | NotaKu",
  description:
    "Konsultasi langsung dengan asisten keuangan AI yang memahami riwayat transaksi bisnis Anda.",
};

export default function Page() {
  return <AdvisorPageClient />;
}
