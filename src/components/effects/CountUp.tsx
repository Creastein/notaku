"use client";

import { useEffect, useState, useRef } from "react";

interface CountUpProps {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function CountUp({ 
  end, 
  duration = 1500, 
  prefix = "", 
  suffix = "", 
  decimals = 0,
  className = "" 
}: CountUpProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startRef = useRef<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let animationFrame: number;
    
    const easeOutQuart = (x: number): number => {
      return 1 - Math.pow(1 - x, 4);
    };

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = timestamp - startRef.current;
      
      const percentage = Math.min(progress / duration, 1);
      const easedPercentage = easeOutQuart(percentage);
      
      const currentCount = end * easedPercentage;
      
      setCount(currentCount);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [end, duration, isVisible]);

  const formattedCount = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(count);

  return (
    <span ref={elementRef} className={className}>
      {prefix}{formattedCount}{suffix}
    </span>
  );
}
