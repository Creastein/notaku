import type { Metadata } from "next";
import ScanPageClient from "./ScanPageClient";

export const metadata: Metadata = {
  title: "Scan Nota AI | NotaKu",
  description:
    "Foto struk atau nota belanja, AI Gemini otomatis ekstrak detail transaksi dalam hitungan detik.",
};

export default function Page() {
  return <ScanPageClient />;
}
