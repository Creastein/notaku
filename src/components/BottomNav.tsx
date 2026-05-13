"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Camera, PieChart, Sparkles } from "lucide-react";

const navItems = [
  { name: "Beranda", href: "/", icon: Home },
  { name: "Transaksi", href: "/transactions", icon: Receipt },
  { name: "Scan", href: "/scan", icon: Camera, isCenter: true },
  { name: "Laporan", href: "/reports", icon: PieChart },
  { name: "Advisor", href: "/advisor", icon: Sparkles },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on onboarding
  if (pathname === "/onboarding") return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-nav pb-safe z-50">
      <nav className="flex justify-between items-center px-4 py-2.5 max-w-md mx-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="absolute left-1/2 -translate-x-1/2 -top-5"
              >
                <div
                  className={`p-3.5 rounded-2xl shadow-lg transition-all duration-300 ${
                    isActive
                      ? "bg-primary scale-110 animate-pulse-glow"
                      : "bg-primary hover:scale-105"
                  }`}
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: "0 4px 20px rgba(5, 150, 105, 0.4)",
                  }}
                >
                  <Icon size={22} className="text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-300 ${
                item.name === "Transaksi"
                  ? "mr-7"
                  : item.name === "Laporan"
                  ? "ml-7"
                  : ""
              } ${
                isActive
                  ? "text-primary"
                  : "text-foreground/40 hover:text-foreground/70"
              }`}
            >
              <div
                className={`transition-all duration-300 ${
                  isActive ? "scale-110 -translate-y-0.5" : ""
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              </div>
              <span
                className={`text-[10px] transition-all duration-300 ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.name}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary animate-scale-in" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
