import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { Transaction } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactions } = body as { transactions: Transaction[] };

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 }
      );
    }

    if (transactions.length === 0) {
      return NextResponse.json({
        summary: "Halo Juragan! Belum ada transaksi minggu ini.",
        insights: ["Sepertinya bisnis sedang libur atau belum ada pencatatan."],
        recommendation: "Yuk mulai catat pemasukan dan pengeluaranmu agar keuangan bisnis tetap terpantau!"
      });
    }

    // Calculate basic metrics to give AI context without making it do math
    const income = transactions.filter(t => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    const profit = income - expense;
    
    // Group expenses by category
    const expensesByCategory: Record<string, number> = {};
    transactions.filter(t => t.type === "expense").forEach(t => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

    const contextData = JSON.stringify({
      totalIncome: income,
      totalExpense: expense,
      netProfit: profit,
      expensesByCategory,
      transactionCount: transactions.length,
    });

    const prompt = `
Anda adalah "Asisten Keuangan NotaKu", analis keuangan pintar untuk UMKM di Indonesia.
Tugas Anda adalah membaca data transaksi 7 hari terakhir dan memberikan wawasan cerdas, profesional, dan dapat ditindaklanjuti.

Data Transaksi 7 Hari Terakhir:
${contextData}

ATURAN KETAT (ANTI HALUSINASI):
1. JANGAN pernah menyebutkan angka, persentase, atau kategori yang tidak ada di data.
2. JANGAN membuat asumsi eksternal (misal: "karena cuaca buruk", "efek inflasi").
3. Hanya berikan saran taktis terkait efisiensi pengeluaran berdasarkan kategori yang membengkak, atau pujian jika profit positif.
4. Jawab dalam Bahasa Indonesia yang profesional dan akrab (sapa dengan "Juragan").

FORMAT OUTPUT (HARUS JSON MURNI TANPA MARKDOWN):
{
  "summary": "Teks sapaan dan ringkasan kondisi minggu ini (1-2 kalimat).",
  "insights": [
    "Insight spesifik 1 (misal kategori pengeluaran tertinggi).",
    "Insight spesifik 2 (misal kondisi profit/rugi)."
  ],
  "recommendation": "Satu saran konkrit yang dapat dilakukan minggu depan."
}
Pastikan hasil output HANYA JSON. Jangan ada teks pembuka atau penutup lain.
    `.trim();

    const result = await geminiModel.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Clean up potential markdown formatting from JSON
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const parsedData = JSON.parse(responseText);
      return NextResponse.json(parsedData);
    } catch (e) {
      console.error("Failed to parse JSON from AI", responseText);
      // Return graceful fallback instead of error
      return NextResponse.json({
        summary: "Maaf Juragan, format respons AI sedang tidak konsisten.",
        insights: ["Sistem sedang mencoba memperbaiki format respons otomatis."],
        recommendation: "Coba refresh halaman ini beberapa saat lagi untuk mendapatkan insight terbaru."
      });
    }
  } catch (error: unknown) {
    console.error("Digest API Error:", error);
    // Return graceful fallback instead of 500
    return NextResponse.json({
      summary: "Halo Juragan! Asisten AI sedang tidak tersedia saat ini.",
      insights: ["Koneksi ke server AI sedang terganggu. Data keuanganmu tetap aman."],
      recommendation: "Coba lagi dalam beberapa menit. Pastikan koneksi internet stabil ya."
    });
  }
}
