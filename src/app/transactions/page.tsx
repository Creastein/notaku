import type { Metadata } from "next";
import TransactionsPageClient from "./TransactionsPageClient";

export const metadata: Metadata = {
  title: "Riwayat Transaksi | NotaKu",
  description:
    "Lihat dan kelola seluruh riwayat transaksi bisnis Anda secara real-time.",
};

export default function Page() {
  return <TransactionsPageClient />;
}
