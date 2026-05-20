/**
 * Simple in-memory rate limiter for API routes.
 * Limits requests per IP address within a sliding window.
 *
 * Catatan: In-memory = reset saat server restart.
 * Cukup untuk hackathon/demo. Untuk production scale, gunakan Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Bersihkan entry expired setiap 60 detik
const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Maksimal request dalam window */
  maxRequests: number;
  /** Window dalam milidetik (default: 60000 = 1 menit) */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check apakah request dari IP tertentu masih dalam batas.
 * @returns { allowed, remaining, resetAt }
 */
export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = { maxRequests: 5, windowMs: 60_000 }
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const key = ip;
  const entry = store.get(key);

  // Entry sudah expired atau belum ada → buat baru
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  // Masih dalam window
  entry.count++;
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}
