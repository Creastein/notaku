import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: "NotaKu — Scan Nota, Catat Otomatis | AI Pembukuan UMKM Indonesia",
  description:
    "Kelola keuangan UMKM Anda tanpa ribet. Foto struk, AI langsung catat. Dashboard profit/loss real-time, deteksi anomali pengeluaran, dan laporan PDF siap pakai.",
};

export default function Page() {
  return <HomePageClient />;
}
