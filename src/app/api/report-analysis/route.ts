import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
    const rateCheck = checkRateLimit(`report-analysis:${ip}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
        { status: 429 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { financialData, profile, period } = body;

    if (!financialData) {
      return NextResponse.json({ error: "Data keuangan tidak tersedia." }, { status: 400 });
    }

    const targetRevenueStr = profile?.targetMonthlyRevenue
      ? `Rp ${profile.targetMonthlyRevenue.toLocaleString("id-ID")}`
      : "Tidak ditentukan";

    const prompt = `
Kamu adalah "NotaKu CFO AI", analis keuangan senior untuk UMKM Indonesia.
Tugasmu adalah menganalisis data keuangan ${period} hari terakhir dan memberikan laporan analisis MENDALAM yang bisa langsung ditindaklanjuti.

PROFIL BISNIS:
- Nama Usaha: ${profile?.businessName || "Tidak diketahui"}
- Pemilik: ${profile?.ownerName || "Tidak diketahui"}
- Kategori: ${profile?.businessCategory || "Tidak diketahui"}
- Lama Berdiri: ${profile?.businessAge || "Tidak diketahui"}
- Target Omset Bulanan: ${targetRevenueStr}

DATA KEUANGAN PERIODE ${period} HARI:
${JSON.stringify(financialData, null, 2)}

ATURAN KETAT:
1. HANYA gunakan angka dan kategori yang ADA di data. JANGAN mengarang.
2. JANGAN membuat asumsi eksternal (inflasi, cuaca, dll).
3. Berikan analisis yang SPESIFIK dan ACTIONABLE.
4. Gunakan Bahasa Indonesia profesional, sapa dengan "Juragan".
5. Jika ada target omset, bandingkan pencapaian terhadap target.

FORMAT OUTPUT (HARUS JSON MURNI):
{
  "healthScore": <angka 0-100>,
  "healthLabel": "<Kritis/Perlu Perhatian/Sehat/Sangat Sehat>",
  "executiveSummary": "<Ringkasan eksekutif 2-3 kalimat tentang kondisi bisnis>",
  "keyFindings": [
    "<Temuan penting 1 dengan angka spesifik>",
    "<Temuan penting 2>",
    "<Temuan penting 3>"
  ],
  "risks": [
    "<Risiko atau peringatan 1>",
    "<Risiko atau peringatan 2>"
  ],
  "recommendations": [
    {
      "title": "<Judul singkat rekomendasi>",
      "description": "<Penjelasan detail dan langkah konkret>",
      "priority": "<Tinggi/Sedang/Rendah>",
      "estimatedImpact": "<Perkiraan dampak positif>"
    }
  ],
  "cashflowVerdict": "<Positif/Negatif/Breakeven - penjelasan singkat>",
  "targetProgress": "<Persentase pencapaian terhadap target, atau 'Target belum ditentukan'>"
}

Pastikan output HANYA JSON valid tanpa markdown atau teks tambahan.
    `.trim();

    const result = await geminiModel.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Clean markdown formatting
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const parsed = JSON.parse(responseText);
      return NextResponse.json({ success: true, analysis: parsed });
    } catch {
      console.error("Failed to parse report analysis JSON:", responseText);
      return NextResponse.json({
        success: true,
        analysis: {
          healthScore: 50,
          healthLabel: "Perlu Perhatian",
          executiveSummary: "Maaf Juragan, format analisis sedang tidak konsisten. Coba lagi dalam beberapa saat.",
          keyFindings: ["Sistem sedang memperbaiki format respons otomatis."],
          risks: [],
          recommendations: [],
          cashflowVerdict: "Data sedang diproses ulang.",
          targetProgress: "-"
        }
      });
    }
  } catch (error) {
    console.error("Report Analysis API Error:", error);
    return NextResponse.json(
      { error: "Gagal menganalisis data. Coba lagi." },
      { status: 500 }
    );
  }
}
