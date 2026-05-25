import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

const advisorSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING, description: "Teks jawaban lengkap kontekstual dan sopan, menggunakan markdown cetak tebal ** untuk penekanan, diakhiri dengan 1 langkah nyata." },
    followUps: {
      type: SchemaType.ARRAY,
      description: "Daftar 3 saran pertanyaan lanjutan kontekstual dan pendek",
      items: { type: SchemaType.STRING }
    }
  },
  required: ["reply", "followUps"]
};

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

    let { message, transactionHistory, userProfile } = body;

    // Sanitize and limit inputs
    message = typeof message === "string" ? message.trim() : "";
    transactionHistory = typeof transactionHistory === "string" 
      ? transactionHistory.substring(0, 3000).trim() 
      : "";

    const sanitizedProfile = {
      ownerName: typeof userProfile?.ownerName === "string" ? userProfile.ownerName.substring(0, 100).trim() : "Teman NotaKu",
      businessName: typeof userProfile?.businessName === "string" ? userProfile.businessName.substring(0, 100).trim() : "Usaha Anda",
      businessCategory: typeof userProfile?.businessCategory === "string" ? userProfile.businessCategory.substring(0, 100).trim() : "Lainnya",
      businessAge: typeof userProfile?.businessAge === "string" ? userProfile.businessAge.substring(0, 50).trim() : "Baru berdiri",
      targetMonthlyRevenue: typeof userProfile?.targetMonthlyRevenue === "number" && !isNaN(userProfile.targetMonthlyRevenue) && userProfile.targetMonthlyRevenue > 0
        ? userProfile.targetMonthlyRevenue
        : 0
    };

    if (message.length === 0) {
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

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel(
      {
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: advisorSchema,
        }
      },
      { apiVersion: "v1beta" }
    );


    const targetRevenueStr = sanitizedProfile.targetMonthlyRevenue > 0
      ? `Rp ${sanitizedProfile.targetMonthlyRevenue.toLocaleString('id-ID')}` 
      : "Tidak diketahui";

    const systemPrompt = `Kamu adalah "NotaKu AI Advisor", penasihat keuangan cerdas untuk UMKM Indonesia. Misi utama kamu adalah bertindak seperti CFO (Chief Financial Officer) proaktif bagi pengguna.

PROFIL BISNIS PENGGUNA:
- Nama Pemilik: ${sanitizedProfile.ownerName}
- Nama Usaha: ${sanitizedProfile.businessName}
- Kategori: ${sanitizedProfile.businessCategory}
- Lama Berdiri: ${sanitizedProfile.businessAge}
- Target Omset Bulanan: ${targetRevenueStr}

DATA TRANSAKSI:
${transactionHistory || "Belum ada data transaksi."}

PERAN & SIKAP:
- Jadilah proaktif. Jika omset bulanan terpantau jauh dari target, beri peringatan secara halus dan sarankan cara mengejarnya.
- Berikan tips spesifik sesuai kategori bisnis pengguna (${sanitizedProfile.businessCategory}).
- Sapa pengguna dengan namanya (${sanitizedProfile.ownerName}).
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

    const responseText = result.response.text().trim();

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
