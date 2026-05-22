/**
 * Environment-agnostic UUID generator.
 * Works in secure (HTTPS) and non-secure (HTTP localhost) contexts.
 */
export function safeUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID fails for some reason
    }
  }

  // Fallback math-based UUID v4 generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
