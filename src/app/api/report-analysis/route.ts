import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

const reportAnalysisSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    healthScore: { type: SchemaType.NUMBER, description: "Skor kesehatan bisnis antara 0-100" },
    healthLabel: { type: SchemaType.STRING, description: "Label kesehatan bisnis: Kritis, Perlu Perhatian, Sehat, atau Sangat Sehat" },
    executiveSummary: { type: SchemaType.STRING, description: "Ringkasan eksekutif 2-3 kalimat tentang kondisi bisnis" },
    keyFindings: {
      type: SchemaType.ARRAY,
      description: "Daftar 2-3 temuan penting berdasarkan data dengan angka spesifik",
      items: { type: SchemaType.STRING }
    },
    risks: {
      type: SchemaType.ARRAY,
      description: "Daftar risiko atau peringatan keuangan bagi bisnis",
      items: { type: SchemaType.STRING }
    },
    recommendations: {
      type: SchemaType.ARRAY,
      description: "Daftar rekomendasi tindakan CFO",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: { type: SchemaType.STRING, description: "Judul singkat rekomendasi" },
          description: { type: SchemaType.STRING, description: "Penjelasan detail dan langkah konkret" },
          priority: { type: SchemaType.STRING, description: "Tingkat prioritas (Tinggi/Sedang/Rendah)" },
          estimatedImpact: { type: SchemaType.STRING, description: "Perkiraan dampak positif secara finansial atau operasional" }
        },
        required: ["title", "description", "priority", "estimatedImpact"]
      }
    },
    cashflowVerdict: { type: SchemaType.STRING, description: "Status aliran kas: Positif/Negatif/Breakeven beserta penjelasan singkat" },
    targetProgress: { type: SchemaType.STRING, description: "Persentase pencapaian terhadap target omset bulanan pemilik, atau 'Target belum ditentukan'" }
  },
  required: ["healthScore", "healthLabel", "executiveSummary", "keyFindings", "risks", "recommendations", "cashflowVerdict", "targetProgress"]
};

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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: reportAnalysisSchema,
        }
      },
      { apiVersion: "v1beta" }
    );

    // Timeout of 15 seconds for Gemini API response to ensure API route responds before gateway timeouts
    const geminiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API Timeout")), 15000)
    );

    const result = await Promise.race([geminiPromise, timeoutPromise]);
    const responseText = result.response.text().trim();

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
