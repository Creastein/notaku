import { GoogleGenerativeAI, SchemaType, ResponseSchema } from "@google/generative-ai";

// Ensure we don't crash if env var is missing during build
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Get a configured generative model.
 * Using 'v1' explicitly to avoid 'v1beta' 404 issues with gemini-1.5-flash.
 */
export function getModel(modelName = "gemini-2.5-flash") {
  return genAI.getGenerativeModel(
    { model: modelName },
    { apiVersion: "v1beta" }
  );
}

export const geminiModel = getModel();


// Define the expected schema for the OCR
const receiptSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    merchantName: { type: SchemaType.STRING, description: "Nama toko, restoran, atau penjual" },
    totalAmount: { type: SchemaType.NUMBER, description: "Total harga atau jumlah yang dibayarkan" },
    date: { type: SchemaType.STRING, description: "Tanggal transaksi dalam format YYYY-MM-DD" },
    category: { type: SchemaType.STRING, description: "Kategori transaksi (contoh: Makanan, Transport, Belanja Modal, Operasional, Penjualan, Jasa, Lainnya)" },
    type: { 
      type: SchemaType.STRING, 
      description: "Tipe transaksi, harus bernilai 'income' (pemasukan) atau 'expense' (pengeluaran). Struk belanja modal atau pembelian bahan baku adalah 'expense'. Faktur penjualan atau invoice penagihan ke client adalah 'income'." 
    },
    items: {
      type: SchemaType.ARRAY,
      description: "Daftar barang yang dibeli atau dijual",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          quantity: { type: SchemaType.NUMBER },
          price: { type: SchemaType.NUMBER }
        }
      }
    }
  },
  required: ["merchantName", "totalAmount", "date", "category", "type"]
};

export async function scanReceipt(base64Image: string, mimeType: string, businessName?: string, scanMode?: string) {
  const model = genAI.getGenerativeModel(
    {
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
      }
    },
    { apiVersion: "v1beta" }
  );

  let prompt = "Ekstrak informasi dari struk/nota belanja atau faktur penjualan ini. Format sesuai JSON schema yang diberikan. Jika ada informasi yang kabur, coba tebak dengan logis, atau kembalikan string kosong / angka 0. Pastikan totalAmount berbentuk angka (tanpa titik ribuan atau simbol mata uang).";
  
  if (businessName) {
    prompt += ` Pemilik aplikasi ini menjalankan bisnis bernama "${businessName}". Gunakan informasi ini untuk menentukan 'type' transaksi: jika bisnis ini adalah penjual/penerbit faktur (menerima uang), klasifikasikan sebagai 'income'. Jika bisnis ini adalah pembeli/pelanggan (membayar uang), klasifikasikan sebagai 'expense'.`;
  }

  if (scanMode === "income") {
    prompt += " PENTING: Transaksi ini didefinisikan sebagai PEMASUKAN (income). Cari informasi penjualan, pendapatan, atau kas masuk dari pelanggan. Set 'type' ke 'income'.";
  } else if (scanMode === "expense") {
    prompt += " PENTING: Transaksi ini didefinisikan sebagai PENGELUARAN (expense). Cari informasi pembelian barang, modal, operasional, belanja, atau kas keluar ke penjual. Set 'type' ke 'expense'.";
  }

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: base64Image,
        mimeType
      }
    }
  ]);

  return result.response.text();
}
