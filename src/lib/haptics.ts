/**
 * Triggers a light haptic feedback on supported mobile devices.
 * Uses the Web Vibration API. Safely falls back if unsupported or in SSR.
 */
export function triggerHaptic(duration = 10) {
  if (typeof window !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Abaikan jika tidak didukung atau diblokir browser
    }
  }
}
