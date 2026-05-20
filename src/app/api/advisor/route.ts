import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGE_LENGTH = 1000;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 advisor chats per minute per IP
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
    const rateCheck = checkRateLimit(`advisor:${ip}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }

    if (!process.env.GEMINI_API_KEY) {

      return NextResponse.json(
        { error: "AI Advisor belum dikonfigurasi. Hubungi admin." },
        { status: 503 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format permintaan tidak valid." },
        { status: 400 }
      );
    }

    const { message, transactionHistory, userProfile } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Pesan terlalu panjang (${message.length} karakter). Maksimal ${MAX_MESSAGE_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const model = geminiModel;


    const targetRevenueStr = userProfile?.targetMonthlyRevenue 
      ? `Rp ${userProfile.targetMonthlyRevenue.toLocaleString('id-ID')}` 
      : "Tidak diketahui";

    const systemPrompt = `Kamu adalah "NotaKu AI Advisor", penasihat keuangan cerdas untuk UMKM Indonesia. Misi utama kamu adalah bertindak seperti CFO (Chief Financial Officer) proaktif bagi pengguna.

PROFIL BISNIS PENGGUNA:
- Nama Pemilik: ${userProfile?.ownerName || "Tidak diketahui"}
- Nama Usaha: ${userProfile?.businessName || "Tidak diketahui"}
- Kategori: ${userProfile?.businessCategory || "Tidak diketahui"}
- Lama Berdiri: ${userProfile?.businessAge || "Tidak diketahui"}
- Target Omset Bulanan: ${targetRevenueStr}

DATA TRANSAKSI:
${transactionHistory || "Belum ada data transaksi."}

PERAN & SIKAP:
- Jadilah proaktif. Jika omset bulanan terpantau jauh dari target, beri peringatan secara halus dan sarankan cara mengejarnya.
- Berikan tips spesifik sesuai kategori bisnis pengguna (${userProfile?.businessCategory || "bisnis ini"}).
- Sapa pengguna dengan namanya (${userProfile?.ownerName || "pengguna"}).
- Gunakan bahasa Indonesia yang ramah, profesional, dan mudah dipahami.
- Jawaban singkat, padat, dan jelas (maksimal 3 paragraf).
- Selalu gunakan emoji yang relevan.
- Selalu akhiri dengan satu langkah nyata (actionable advice) yang bisa dilakukan hari ini.

FORMAT OUTPUT (HARUS JSON MURNI):
{
  "reply": "<Teks jawaban lengkap. Gunakan Markdown sederhana seperti cetak tebal ** untuk poin penting. Sapa pengguna dengan namanya, gunakan emoji relevan, dan akhiri dengan 1 langkah nyata.>",
  "followUps": [
    "<Saran pertanyaan lanjutan kontekstual 1, buat pendek dan spesifik. Contoh: 'Bagaimana cara menekan biaya operasional?', 'Berapa margin keuntungan saya?'>",
    "<Saran pertanyaan lanjutan kontekstual 2>",
    "<Saran pertanyaan lanjutan kontekstual 3>"
  ]
}`;

    const result = await model.generateContent([
      systemPrompt,
      `Pertanyaan pengguna: ${message}`,
    ]);

    let responseText = result.response.text().trim();
    
    // Clean markdown
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const parsed = JSON.parse(responseText);
      return NextResponse.json({
        success: true,
        response: parsed.reply,
        followUps: parsed.followUps || []
      });
    } catch {
      // Fallback
      return NextResponse.json({
        success: true,
        response: result.response.text(),
        followUps: [
          "Bagaimana kondisi keuangan bisnis saya?",
          "Tips menghemat biaya operasional",
          "Cara mencapai target omset bulanan"
        ]
      });
    }
  } catch (error) {
    console.error("Advisor error:", error);
    return NextResponse.json(
      { error: "Gagal mendapatkan saran AI. Coba lagi." },
      { status: 500 }
    );
  }
}
