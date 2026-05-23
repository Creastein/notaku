"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Receipt, Camera, ChartPie, Sparkle } from "@phosphor-icons/react";
import { triggerHaptic } from "@/lib/haptics";

// Navigation items
const ALL_ITEMS = [
  { name: "Beranda",   href: "/",            icon: House    },
  { name: "Transaksi", href: "/transactions", icon: Receipt  },
  { name: "Scan",      href: "/scan",        icon: Camera   },
  { name: "Laporan",   href: "/reports",      icon: ChartPie },
  { name: "Advisor",   href: "/advisor",      icon: Sparkle  },
];

// Pages where bottom nav is hidden
const HIDDEN_PATHS = ["/onboarding", "/settings"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 pb-safe z-50 pointer-events-none">
      <div className="max-w-md mx-auto px-4 pb-4">
        {/* Floating glass dock container */}
        <div className="floating-dock pointer-events-auto">
          <nav className="flex items-center justify-between px-3 py-2">
            {ALL_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              const Icon     = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic(10)}
                  aria-label={item.name}
                  aria-current={isActive ? "page" : undefined}
                  className="nav-item-press flex-1 flex items-center justify-center py-1"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 relative ${
                      isActive
                        ? "bg-white/20 dark:bg-white/10 text-sky-400 dark:text-sky-300 border border-white/20 shadow-md scale-110"
                        : "text-foreground/45 hover:text-foreground/75 hover:bg-white/5"
                    }`}
                  >
                    <Icon size={22} weight={isActive ? "duotone" : "light"} />
                    
                    {/* Small subtle accent dot under scan button to guide user, when not active */}
                    {item.href === "/scan" && !isActive && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-400/50" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
