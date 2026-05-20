import { NextRequest, NextResponse } from "next/server";
import { scanReceipt } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rateLimit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 scans per minute per IP
    const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "anonymous";
    const rateCheck = checkRateLimit(`scan:${ip}`, { maxRequests: 5, windowMs: 60_000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Coba lagi dalam 1 menit." },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
      );
    }
    const formData = await request.formData();
    const file = formData.get("receipt") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Tidak ada file yang diunggah. Silakan pilih foto nota." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Format file tidak didukung (${file.type}). Gunakan JPG, PNG, atau WebP.` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 10MB.` },
        { status: 400 }
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    const result = await scanReceipt(base64, file.type);

    // Safely parse JSON response from Gemini
    let parsed;
    try {
      let cleanResult = result.trim();
      if (cleanResult.startsWith("```json")) {
        cleanResult = cleanResult.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      } else if (cleanResult.startsWith("```")) {
        cleanResult = cleanResult.replace(/^```\n?/, "").replace(/\n?```$/, "");
      }
      parsed = JSON.parse(cleanResult);
    } catch {
      console.error("Failed to parse scan result:", result);
      return NextResponse.json(
        { error: "AI tidak dapat membaca nota ini. Coba foto ulang dengan pencahayaan lebih baik." },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Gagal memproses nota. Pastikan koneksi internet stabil dan coba lagi." },
      { status: 500 }
    );
  }
}
