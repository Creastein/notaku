"use client";

import { useRef, useState, ReactNode } from "react";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
}

export function TiltCard({ children, className = "", maxTilt = 10, scale = 1.02 }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    // Disable on mobile/touch devices for performance and UX
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const rect = cardRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to card center (values between -1 and 1)
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    
    // Calculate rotation
    const rotateX = y * -maxTilt;
    const rotateY = x * maxTilt;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`);
  };

  const handleMouseLeave = () => {
    setTransform("");
  };

  return (
    <div 
      className={`tilt-3d-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={cardRef}
        className="tilt-3d-inner w-full h-full"
        style={{ transform: transform || undefined }}
      >
        {children}
      </div>
    </div>
  );
}
