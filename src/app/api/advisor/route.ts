import { NextResponse } from 'next/server';
import { handleApi } from '@/lib/apiResponse';
import { validateSchema, advisorRequestSchema } from '@/lib/validation';
import { getAdvice } from '@/lib/gemini'; // assume a function that returns advice

export async function POST(request: Request) {
  const json = await request.json();
  const payload = validateSchema(advisorRequestSchema, json);

  const result = await handleApi(() => getAdvice(payload.userId, payload.query));
  return NextResponse.json(result);
}


export async function POST(request: NextRequest) {
  try {
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

    const { message, transactionHistory } = body;

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


    const systemPrompt = `Kamu adalah "NotaKu AI Advisor", penasihat keuangan cerdas untuk UMKM Indonesia.

PERAN:
- Memberikan insight bisnis berdasarkan data transaksi pengguna
- Menjawab pertanyaan seputar keuangan, pajak, dan strategi bisnis UMKM
- Menggunakan bahasa Indonesia yang ramah dan mudah dipahami
- Memberikan saran yang actionable dan praktis

DATA TRANSAKSI PENGGUNA:
${transactionHistory || "Belum ada data transaksi."}

INSTRUKSI:
- Jawab singkat tapi informatif (maksimal 3 paragraf)
- Gunakan emoji untuk membuat jawaban lebih menarik
- Jika ditanya tentang data yang tidak ada, sarankan pengguna untuk mencatat lebih banyak transaksi
- Selalu akhiri dengan satu saran actionable`;

    const result = await model.generateContent([
      systemPrompt,
      `Pertanyaan pengguna: ${message}`,
    ]);

    const response = result.response.text();

    return NextResponse.json({ success: true, response });
  } catch (error) {
    console.error("Advisor error:", error);
    return NextResponse.json(
      { error: "Gagal mendapatkan saran AI. Coba lagi." },
      { status: 500 }
    );
  }
}
