import { NextRequest, NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_MESSAGE_LENGTH = 300;

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 per minute per IP
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
    const rateCheck = checkRateLimit(`parse-tx:${ip}`, { maxRequests: 20, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "AI belum dikonfigurasi. Hubungi admin." },
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

    let { text } = body;
    text = typeof text === "string" ? text.trim() : "";

    if (text.length === 0) {
      return NextResponse.json(
        { error: "Teks tidak boleh kosong." },
        { status: 400 }
      );
    }

    if (text.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Teks terlalu panjang (${text.length} karakter). Maksimal ${MAX_MESSAGE_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    const systemPrompt = `Kamu adalah AI asisten pembukuan yang bertugas mengubah teks natural (bahasa gaul/sehari-hari) menjadi data transaksi terstruktur.
Tugasmu:
1. Ekstrak nominal uang (amount). Jika ada "50rb", ubah jadi 50000.
2. Tentukan tipe transaksi:
   - "income": jika user menerima uang (contoh: "jual", "laku", "dapet", "bayaran", dsb).
   - "expense": jika user mengeluarkan uang (contoh: "beli", "bayar", "belanja", "ongkos", dsb).
3. Tentukan kategori singkat (contoh: "Makanan", "Operasional", "Bahan Baku", "Penjualan").
4. Ekstrak merchantName / nama item (contoh: "Gojek", "Bahan Kopi", "Listrik", dsb).

FORMAT OUTPUT (HARUS JSON MURNI TANPA MARKDOWN):
{
  "amount": <number, wajib>,
  "type": "<income | expense>",
  "category": "<string, singkat>",
  "merchantName": "<string, nama item/toko>"
}

CONTOH 1:
Input: "baru aja beli token listrik 100 ribu di indomaret"
Output:
{
  "amount": 100000,
  "type": "expense",
  "category": "Operasional",
  "merchantName": "Indomaret"
}

CONTOH 2:
Input: "hari ini laku 3 porsi nasi goreng total dapet 45rb"
Output:
{
  "amount": 45000,
  "type": "income",
  "category": "Penjualan",
  "merchantName": "Nasi Goreng"
}`;

    const result = await geminiModel.generateContent([
      systemPrompt,
      `Input: "${text}"`
    ]);

    let responseText = result.response.text().trim();
    responseText = responseText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "");

    try {
      const parsed = JSON.parse(responseText);
      
      // Basic validation
      if (typeof parsed.amount !== "number" || isNaN(parsed.amount)) {
        throw new Error("Invalid amount");
      }
      if (parsed.type !== "income" && parsed.type !== "expense") {
        parsed.type = "expense"; // fallback
      }
      if (!parsed.category) parsed.category = "Lainnya";
      if (!parsed.merchantName) parsed.merchantName = "Catatan Cepat";

      return NextResponse.json({
        success: true,
        data: {
          amount: Math.abs(parsed.amount),
          type: parsed.type,
          category: parsed.category,
          merchantName: parsed.merchantName
        }
      });
    } catch {
      return NextResponse.json(
        { error: "Gagal memproses teks. Pastikan menyebutkan nominal dan jenis transaksinya." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Parse tx error:", error);
    return NextResponse.json(
      { error: "Gagal menyambung ke AI. Coba lagi." },
      { status: 500 }
    );
  }
}
