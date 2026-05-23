"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addTransaction, saveUserProfile, loadProfileFromFirestore, migrateTransactionsToUid, UserProfile } from "@/lib/storage";
import { useAuth } from "@/lib/auth-context";
import gsap from "gsap";
import { 
  Scan, ChartBar, Robot, CaretRight, Sparkle, 
  User, Buildings, Briefcase, Calendar, Target, SignIn
} from "@phosphor-icons/react";
import { GradientOrbs } from "@/components/effects/GradientOrbs";
import { TiltCard } from "@/components/effects/TiltCard";

function getDemoTransactions() {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const now = new Date().toISOString();
  return [
    { type: "income" as const, amount: 2500000, category: "Penjualan", date: today, notes: "Penjualan harian", merchantName: "Toko Utama", createdAt: now },
    { type: "expense" as const, amount: 350000, category: "Belanja Modal", date: today, notes: "Stok bahan baku", merchantName: "Supplier A", createdAt: now },
    { type: "expense" as const, amount: 150000, category: "Operasional", date: today, notes: "Listrik & air", merchantName: "PLN", createdAt: now },
    { type: "income" as const, amount: 800000, category: "Jasa", date: yesterday, notes: "Jasa konsultasi", merchantName: "Client B", createdAt: now },
    { type: "expense" as const, amount: 200000, category: "Transport", date: yesterday, notes: "Ongkir pengiriman", merchantName: "JNE", createdAt: now },
  ];
}

type StepType = "intro" | "input" | "select";

interface Step {
  id: string;
  type: StepType;
  icon: React.ElementType;
  emoji: string;
  title: string;
  desc: string;
  color: string;
  placeholder?: string;
  options?: string[];
  inputType?: "text" | "number";
}

const STEPS: Step[] = [
  // Intro Steps
  {
    id: "intro1",
    type: "intro",
    icon: Scan,
    emoji: "📸",
    title: "Scan Struk Otomatis",
    desc: "Foto struk belanja dan AI akan membaca otomatis. Tidak perlu input manual lagi!",
    color: "#38bdf8",
  },
  {
    id: "intro2",
    type: "intro",
    icon: ChartBar,
    emoji: "📊",
    title: "Laporan Visual",
    desc: "Lihat grafik pemasukan & pengeluaran. Pahami kondisi bisnis dalam sekejap.",
    color: "#818cf8",
  },
  {
    id: "intro3",
    type: "intro",
    icon: Robot,
    emoji: "🤖",
    title: "AI Penasihat Bisnis",
    desc: "Tanya apa saja soal keuangan. AI kami siap bantu 24/7 dengan saran yang relevan.",
    color: "#4a8fb4",
  },
  // Profile Steps
  {
    id: "ownerName",
    type: "input",
    inputType: "text",
    icon: User,
    emoji: "👋",
    title: "Halo! Boleh tahu namamu?",
    desc: "Supaya saya bisa menyapa dengan lebih personal.",
    color: "#38bdf8",
    placeholder: "Cth: Budi",
  },
  {
    id: "businessName",
    type: "input",
    inputType: "text",
    icon: Buildings,
    emoji: "🏪",
    title: "Apa nama usahamu?",
    desc: "Identitas dari bisnis hebat yang sedang kamu bangun.",
    color: "#38bdf8",
    placeholder: "Cth: Warung Makmur",
  },
  {
    id: "businessCategory",
    type: "select",
    icon: Briefcase,
    emoji: "💼",
    title: "Bergerak di bidang apa?",
    desc: "Pilih kategori yang paling sesuai.",
    color: "#818cf8",
    options: ["F&B (Makanan/Minuman)", "Jasa", "Retail / Toko", "Freelance", "Lainnya"],
  },
  {
    id: "businessAge",
    type: "select",
    icon: Calendar,
    emoji: "⏳",
    title: "Sudah berapa lama berdiri?",
    desc: "Membantu AI menyusun strategi yang tepat.",
    color: "#fb7185",
    options: ["< 6 Bulan", "6-12 Bulan", "1-3 Tahun", "> 3 Tahun"],
  },
  {
    id: "targetMonthlyRevenue",
    type: "input",
    inputType: "number",
    icon: Target,
    emoji: "🎯",
    title: "Berapa target omset bulanan?",
    desc: "AI akan memonitor dan membantu mencapainya.",
    color: "#4a8fb4",
    placeholder: "Cth: 10000000",
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [inputValue, setInputValue] = useState("");
  const router = useRouter();
  const { signInWithGoogle } = useAuth();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;



  useEffect(() => {
    // Animate content change
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 40, scale: 0.95 },
        { opacity: 1, x: 0, scale: 1, duration: 0.5, ease: "back.out(1.2)" }
      );
    }
  }, [step]);

  // Handle Google Sign-In: try to restore profile from Firestore
  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      // Add timeout to prevent infinite hang
      const timeoutPromise = new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error("Login timeout - popup mungkin diblokir browser")), 30000)
      );
      
      const user = await Promise.race([signInWithGoogle(), timeoutPromise]);
      if (!user) {
        setGoogleLoading(false);
        return;
      }

      // Try to load existing profile from Firestore
      const existingProfile = await loadProfileFromFirestore(user.uid);
      if (existingProfile) {
        // Profile found! User has used NotaKu before — skip onboarding
        localStorage.setItem("notaku_onboarded", "true");
        router.push("/");
        return;
      }

      // No existing profile — pre-fill name from Google account and continue onboarding
      setFormData(prev => ({
        ...prev,
        ownerName: user.displayName || "",
        userId: user.uid,
      }));

      // Jump to profile steps (skip intro)
      gsap.to(contentRef.current, {
        opacity: 0,
        x: -40,
        scale: 0.95,
        duration: 0.3,
        onComplete: () => {
          setStep(3); // ownerName step
          setInputValue(user.displayName || "");
        },
      });
    } catch (error: any) {
      console.error("Google login error:", error);
      alert("Login gagal: " + (error?.message || "Coba lagi atau lewati intro untuk daftar manual."));
    } finally {
      setGoogleLoading(false);
    }
  }

  async function finish() {
    setLoading(true);
    
    // Save current step data if it's an input step
    let finalData = { ...formData };
    if (cur.type !== "intro" && inputValue) {
      finalData[cur.id as keyof UserProfile] = cur.inputType === "number" ? Number(inputValue) : inputValue as any;
    }

    // Save profile
    const finalProfile: UserProfile = {
      userId: (finalData.userId as string) || undefined,
      ownerName: (finalData.ownerName as string) || "Bos",
      businessName: (finalData.businessName as string) || "Bisnisku",
      businessCategory: (finalData.businessCategory as string) || "Lainnya",
      businessAge: (finalData.businessAge as string) || "< 6 Bulan",
      targetMonthlyRevenue: (finalData.targetMonthlyRevenue as number) || 0,
      onboardedAt: new Date().toISOString(),
    };
    saveUserProfile(finalProfile);

    // If user is signed in with Google, migrate existing transactions to their UID
    if (finalProfile.userId) {
      await migrateTransactionsToUid(finalProfile.userId);
    }

    // Seed demo data
    const demoTxs = getDemoTransactions();
    for (const tx of demoTxs) await addTransaction(tx);
    
    localStorage.setItem("notaku_onboarded", "true");
    
    router.push("/");
  }

  const handleNext = () => {
    // If we're on an input step, save the value
    if (cur.type !== "intro") {
      const newData = { ...formData, [cur.id]: cur.inputType === "number" ? Number(inputValue) : inputValue };
      setFormData(newData);
    }

    if (isLast) {
      finish();
    } else {
      gsap.to(contentRef.current, {
        opacity: 0,
        x: -40,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          setStep(s => s + 1);
          setInputValue(""); // Reset input for next step
        }
      });
    }
  };

  const skipIntro = () => {
    // Find the first input step (index 3)
    gsap.to(contentRef.current, {
      opacity: 0,
      x: -40,
      scale: 0.95,
      duration: 0.3,
      onComplete: () => {
        setStep(3);
        setInputValue("");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (cur.type === "intro" || inputValue)) {
      handleNext();
    }
  };

  const isInputValid = cur.type === "intro" || inputValue.toString().trim().length > 0;

  return (
    <div ref={containerRef} className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden app-container">
      <GradientOrbs />
      
      {/* Sleek App Branding */}
      <div className="flex items-center gap-2 mb-6 z-10 animate-fade-in">
        <img
          src="/logo.png"
          alt="NotaKu Logo"
          className="w-9 h-9 object-contain rounded-xl shadow-md border border-foreground/[0.08] bg-white/5 backdrop-blur-sm"
        />
        <span className="text-xl font-black tracking-[-0.03em]">
          Nota<span className="gradient-text">Ku</span>
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-10 z-10 w-full max-w-xs justify-center">
        {STEPS.map((s, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step ? "w-8" : i < step ? "w-3" : "w-1.5 opacity-30"
            }`}
            style={{ background: i <= step ? s.color : "var(--border-strong)" }} 
          />
        ))}
      </div>

      {/* Content wrapper */}
      <div className="w-full max-w-xs z-10 flex flex-col items-center">
        <div ref={contentRef} className="w-full text-center">
          <TiltCard maxTilt={15} scale={1.05} className="inline-block mb-6">
            <div 
              className="inline-flex p-5 rounded-3xl" 
              style={{ 
                background: `${cur.color}15`, 
                boxShadow: `0 8px 32px ${cur.color}20`, 
                border: `1px solid ${cur.color}30` 
              }}
            >
              <cur.icon size={48} style={{ color: cur.color }} strokeWidth={1.5} />
            </div>
          </TiltCard>
          
          <div className="text-5xl mb-4 animate-float">{cur.emoji}</div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-3">{cur.title}</h2>
          <p className="text-sm text-foreground/50 leading-relaxed mb-8">{cur.desc}</p>

          {/* Input Fields */}
          {cur.type === "input" && (
            <div className="mb-8">
              <input
                type={cur.inputType === "number" ? "number" : "text"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={cur.placeholder}
                className="w-full bg-foreground/[0.03] border border-foreground/10 rounded-2xl px-5 py-4 text-lg font-bold text-center focus:outline-none focus:ring-2 transition-all placeholder:text-foreground/20 placeholder:font-medium"
                style={{ '--tw-ring-color': cur.color } as any}
                autoFocus
              />
            </div>
          )}

          {cur.type === "select" && (
            <div className="grid gap-2 mb-8">
              {cur.options?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setInputValue(opt);
                    // Slight delay before auto-next for better UX
                    setTimeout(() => {
                      const btn = document.getElementById("next-btn");
                      if (btn) btn.click();
                    }, 300);
                  }}
                  className={`px-5 py-4 rounded-xl border transition-all duration-200 text-sm font-bold ${
                    inputValue === opt 
                      ? "shadow-md scale-[1.02]" 
                      : "border-foreground/10 hover:border-foreground/20 hover:bg-foreground/5 text-foreground/70"
                  }`}
                  style={inputValue === opt ? { 
                    borderColor: cur.color, 
                    backgroundColor: `${cur.color}15`, 
                    color: cur.color 
                  } : {}}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4 w-full space-y-3 z-10">
          <button 
            id="next-btn"
            onClick={handleNext} 
            disabled={!isInputValid || loading}
            className={`w-full py-4 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl transition-all duration-300 ${
              isInputValid
                ? "text-white shadow-lg translate-y-0"
                : "bg-foreground/5 text-foreground/30 cursor-not-allowed"
            }`}
            style={isInputValid ? { 
              background: `linear-gradient(135deg, ${cur.color}, ${cur.color}dd)`,
              boxShadow: `0 4px 20px ${cur.color}40`
            } : {}}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
            ) : isLast ? (
              <><Sparkle size={18}/> Selesai</>
            ) : (
              <>Lanjut <CaretRight size={18} weight="bold" /></>
            )}
          </button>

          {cur.type === "intro" && step < 2 && (
            <button 
              onClick={skipIntro} 
              className="w-full py-2.5 text-sm text-foreground/40 font-medium hover:text-foreground/70 transition-colors"
            >
              Lewati Intro
            </button>
          )}

          {/* Google Sign-In button — shown on first intro step */}
          {step === 0 && (
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full py-3.5 flex items-center justify-center gap-3 text-sm font-semibold rounded-2xl border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06] text-foreground/70 hover:text-foreground transition-all duration-300"
            >
              {googleLoading ? (
                <><div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" /> Menghubungkan...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Masuk dengan Google
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
