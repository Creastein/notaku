"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useLayoutEffect, useState } from "react";
import { Home, Receipt, Camera, PieChart, Sparkles } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

// Nav items WITHOUT the center FAB — used to calculate pill position
const NAV_ITEMS = [
  { name: "Beranda",   href: "/",            icon: Home     },
  { name: "Transaksi", href: "/transactions", icon: Receipt  },
  { name: "Laporan",   href: "/reports",      icon: PieChart },
  { name: "Advisor",   href: "/advisor",      icon: Sparkles },
];

// Center FAB item (Scan)
const FAB_ITEM = { name: "Scan", href: "/scan", icon: Camera };

// Pages where nav is hidden
const HIDDEN_PATHS = ["/onboarding", "/settings"];

export default function BottomNav() {
  const pathname = usePathname();

  // Refs to measure slot widths for animated pill
  const navRef    = useRef<HTMLDivElement>(null);
  const itemRefs  = useRef<(HTMLAnchorElement | null)[]>([]);

  // Pill geometry state
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number } | null>(null);

  // Find which nav item is active (excluding FAB)
  const activeIndex = NAV_ITEMS.findIndex((item) => item.href === pathname);
  const isFabActive = pathname === FAB_ITEM.href;

  // Recalculate pill position whenever route or layout changes
  useLayoutEffect(() => {
    if (activeIndex === -1) {
      setPillStyle(null);
      return;
    }

    const el = itemRefs.current[activeIndex];
    const container = navRef.current;
    if (!el || !container) return;

    const containerRect = container.getBoundingClientRect();
    const itemRect      = el.getBoundingClientRect();

    setPillStyle({
      left:  itemRect.left - containerRect.left,
      width: itemRect.width,
    });
  }, [pathname, activeIndex]);

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    /* Outer wrapper — handles bottom offset + max-width centering */
    <div className="fixed bottom-0 left-0 right-0 pb-safe z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-3">
        {/* Floating dock container */}
        <div className="floating-dock pointer-events-auto">
          {/* Inner nav — relative so pill can be absolutely positioned */}
          <nav
            ref={navRef}
            className="relative flex items-center justify-between px-2 py-2"
          >
            {/* Animated sliding pill indicator */}
            {pillStyle && (
              <div
                className="nav-pill"
                style={{
                  left:  pillStyle.left,
                  width: pillStyle.width,
                }}
              />
            )}

            {/* Left two nav items */}
            {NAV_ITEMS.slice(0, 2).map((item, i) => {
              const isActive = pathname === item.href;
              const Icon     = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic(10)}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className="nav-item-press relative z-10 flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 min-h-[48px] justify-center"
                >
                  <div
                    className={`transition-all duration-300 ${
                      isActive ? "-translate-y-0.5 scale-110" : "scale-100"
                    }`}
                  >
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={`transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-foreground/35"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-tight transition-all duration-300 ${
                      isActive
                        ? "text-primary opacity-100 translate-y-0"
                        : "text-foreground/30 opacity-0 -translate-y-1"
                    }`}
                    aria-hidden={!isActive}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}

            {/* ── CENTER FAB (Scan) ── */}
            <div className="relative flex items-center justify-center px-2">
              <Link
                href={FAB_ITEM.href}
                onClick={() => triggerHaptic(15)}
                aria-label={FAB_ITEM.name}
                aria-current={isFabActive ? "page" : undefined}
                className="nav-item-press relative flex items-center justify-center"
              >
                {/* Orbiting ring — only shows when FAB is active */}
                {isFabActive && (
                  <svg
                    className="fab-orbit-ring absolute inset-0 w-full h-full"
                    viewBox="0 0 56 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="28"
                      cy="28"
                      r="26"
                      stroke="url(#orbit-gradient)"
                      strokeWidth="1.5"
                      strokeDasharray="12 8"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="orbit-gradient" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#10b981" stopOpacity="0.8" />
                        <stop offset="0.5" stopColor="#34d399" stopOpacity="0.4" />
                        <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                )}

                {/* FAB Button */}
                <div
                  className={`relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isFabActive ? "scale-105" : "hover:scale-105"
                  }`}
                  style={{
                    background:  "var(--gradient-primary)",
                    boxShadow:   isFabActive
                      ? "0 4px 24px rgba(5, 150, 105, 0.5), 0 0 0 3px rgba(16, 185, 129, 0.15)"
                      : "0 4px 16px rgba(5, 150, 105, 0.35)",
                  }}
                >
                  <Camera size={22} className="text-white" strokeWidth={2.5} />
                  {/* Inner shine */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
                    }}
                  />
                </div>
              </Link>
            </div>

            {/* Right two nav items */}
            {NAV_ITEMS.slice(2).map((item, i) => {
              const idx      = i + 2; // offset for ref array
              const isActive = pathname === item.href;
              const Icon     = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic(10)}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className="nav-item-press relative z-10 flex flex-col items-center gap-0.5 flex-1 py-1.5 px-1 min-h-[48px] justify-center"
                >
                  <div
                    className={`transition-all duration-300 ${
                      isActive ? "-translate-y-0.5 scale-110" : "scale-100"
                    }`}
                  >
                    <Icon
                      size={21}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={`transition-colors duration-300 ${
                        isActive ? "text-primary" : "text-foreground/35"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-tight transition-all duration-300 ${
                      isActive
                        ? "text-primary opacity-100 translate-y-0"
                        : "text-foreground/30 opacity-0 -translate-y-1"
                    }`}
                    aria-hidden={!isActive}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
