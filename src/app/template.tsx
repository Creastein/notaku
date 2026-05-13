"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function Template({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Animasi fade in & slide up sedikit yang mulus untuk setiap perpindahan halaman
    gsap.from(containerRef.current, {
      y: 10,
      opacity: 0,
      duration: 0.4,
      ease: "power2.out",
      clearProps: "y,opacity" // Bersihkan properties spesifik setelah animasi selesai
    });
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="opacity-100">
      {children}
    </div>
  );
}
