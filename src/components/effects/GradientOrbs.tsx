"use client";

import { useEffect, useState } from "react";

export function GradientOrbs() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    // Gunakan absolute (bukan fixed) agar orbs mengikuti scroll container
    // dan tidak ter-clip oleh parent overflow
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Top right emerald orb */}
      <div
        className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full opacity-30 filter blur-[80px] animate-orb-float dark:mix-blend-screen mix-blend-multiply"
        style={{ background: "var(--primary-light)" }}
      />
      {/* Bottom left teal orb */}
      <div
        className="absolute -bottom-[10%] -left-[10%] w-[60%] h-[60%] rounded-full opacity-20 filter blur-[100px] animate-orb-float-delayed dark:mix-blend-screen mix-blend-multiply"
        style={{ background: "var(--primary)" }}
      />
      {/* Center amber orb */}
      <div
        className="absolute top-[30%] left-[20%] w-[40%] h-[40%] rounded-full opacity-10 filter blur-[60px] animate-gentle-rotate dark:mix-blend-screen mix-blend-multiply"
        style={{ background: "var(--accent)" }}
      />
    </div>
  );
}
