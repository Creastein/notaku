"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Trash2, Bot, Settings } from "lucide-react";
import Link from "next/link";
import { getTransactions, getUserProfile, UserProfile } from "@/lib/storage";
import { useRouter } from "next/navigation";
import { TiltCard } from "@/components/effects/TiltCard";
import { GradientOrbs } from "@/components/effects/GradientOrbs";
import { triggerHaptic } from "@/lib/haptics";

interface Message { id: string; role: "user" | "model"; content: string; }

function renderMessageContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, idx) => {
    let cleanLine = line;
    const isBullet = cleanLine.trim().startsWith("* ") || cleanLine.trim().startsWith("- ");
    if (isBullet) cleanLine = cleanLine.trim().substring(2);

    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0, match;
    while ((match = boldRegex.exec(cleanLine)) !== null) {
      if (match.index > lastIndex) parts.push(cleanLine.substring(lastIndex, match.index));
      parts.push(<strong key={match.index} className="font-extrabold text-inherit">{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    if (lastIndex < cleanLine.length) parts.push(cleanLine.substring(lastIndex));

    const contentEl = parts.length > 0 ? parts : cleanLine;
    if (isBullet) return (
      <div key={idx} className="flex items-start gap-2 ml-1 my-1">
        <span className="text-emerald-500 font-bold">•</span>
        <span className="flex-1">{contentEl}</span>
      </div>
    );
    return <p key={idx} className={cleanLine.trim() === "" ? "h-2" : "mb-1.5 last:mb-0"}>{contentEl}</p>;
  });
}

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeFollowUps, setActiveFollowUps] = useState<string[]>([]);

  async function sendMessageText(text: string) {
    if (!text.trim() || loading) return;
    triggerHaptic(10);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setActiveFollowUps([]); // clear suggestions
    setLoading(true);

    try {
      const txs = await getTransactions();
      const summary = txs.slice(0, 20).map(t =>
        `${t.type === "income" ? "Pemasukan" : "Pengeluaran"}: Rp${t.amount.toLocaleString("id-ID")} - ${t.category} (${t.merchantName || "-"})`
      ).join("\n");

      const activeProfile = profile || getUserProfile();

      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg.content, 
          transactionHistory: summary,
          userProfile: activeProfile
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "model", content: data.response }]);
      if (data.followUps && data.followUps.length > 0) {
        setActiveFollowUps(data.followUps);
      }
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "model", content: "⚠️ Maaf, terjadi kesalahan. Coba lagi nanti." }]);
    } finally { setLoading(false); }
  }

  useEffect(() => { 
    if (!localStorage.getItem("notaku_onboarded")) {
      router.push("/onboarding");
      return;
    }
    const userProf = getUserProfile();
    setProfile(userProf);
    
    // Load persisted chat history
    try {
      const persisted = localStorage.getItem("notaku_ai_messages");
      if (persisted) {
        setMessages(JSON.parse(persisted));
      }
    } catch (e) {
      console.error("Gagal memuat riwayat chat:", e);
    }

    // Check for pending prompt from reports page
    const pendingPrompt = localStorage.getItem("notaku_pending_advisor_prompt");
    if (pendingPrompt) {
      localStorage.removeItem("notaku_pending_advisor_prompt");
      setTimeout(() => {
        sendMessageText(pendingPrompt);
      }, 500);
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("notaku_ai_messages", JSON.stringify(messages));
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    sendMessageText(input);
  }

  const suggestions = [
    "Bagaimana kondisi keuangan bisnis saya?",
    "Kategori pengeluaran mana yang paling besar?",
    "Tips menghemat biaya operasional UMKM",
    "Cara menghitung pajak UMKM sederhana",
  ];

  return (
    <div className="flex flex-col h-[100dvh] relative">
      <GradientOrbs />
      
      {/* Header */}
      <div className="p-5 pt-5 flex items-center justify-between animate-fade-in-up relative z-10" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl relative" style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 16px rgba(5,150,105,0.3)" }}>
            <Bot size={20} className="text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight">AI Advisor</h1>
            <p className="text-[11px] text-foreground/40 font-medium">Penasihat bisnis pintarmu</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} aria-label="Hapus percakapan" className="p-2 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
          )}
          <Link
            href="/settings"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/[0.05] border border-foreground/[0.07] text-foreground/60 hover:text-foreground hover:bg-foreground/[0.08] transition-colors"
          >
            <Settings size={14} />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-44 relative z-10">
        {messages.length === 0 ? (
          <div className="space-y-4 animate-fade-in-up">
            <TiltCard>
              <div className="text-center py-8">
                <div className="inline-flex p-4 rounded-3xl mb-4" style={{ background: "var(--gradient-primary)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)" }}>
                  <Sparkles size={32} className="text-white" />
                </div>
                <p className="font-extrabold text-lg">Halo! Saya NotaKu AI</p>
                <p className="text-sm text-foreground/40 mt-1">Tanya apa saja tentang keuangan bisnismu</p>
              </div>
            </TiltCard>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessageText(s)}
                  className={`w-full text-left glass-card rounded-2xl p-3.5 text-sm font-medium text-foreground/60 hover:text-foreground hover:border-primary/20 transition-all duration-200 animate-fade-in-up delay-${i+1}`}
                >
                  <span className="text-amber-500 mr-2">💡</span>{s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`} style={{ animationDelay: `${i * 0.05}s` }}>
              {msg.role === "model" && (
                <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--gradient-primary)" }}>
                  <Bot size={14} className="text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "rounded-br-md text-white font-medium"
                  : "glass-card rounded-bl-md text-foreground/80"
              }`}
                style={msg.role === "user" ? { background: "var(--gradient-primary)", boxShadow: "0 2px 12px rgba(5,150,105,0.3)" } : undefined}
              >
                {msg.role === "model" ? renderMessageContent(msg.content) : msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mr-2 mt-1" style={{ background: "var(--gradient-primary)" }}>
              <Bot size={14} className="text-white" />
            </div>
            <div className="glass-card rounded-2xl rounded-bl-md px-5 py-4 flex gap-1.5">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="fixed bottom-[5.5rem] left-0 right-0 z-40 px-4 pb-2 pt-2 pointer-events-none flex flex-col justify-end">
        <div className="max-w-md w-full mx-auto pointer-events-auto space-y-2">
          {/* Dynamic suggestion chips */}
          {!loading && activeFollowUps.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {activeFollowUps.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    sendMessageText(s);
                  }}
                  className="bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-3.5 py-1.5 rounded-full shrink-0 font-bold transition-all shadow-sm duration-150 animate-fade-in-up"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2 glass-card rounded-2xl p-2" style={{ backdropFilter: "blur(20px)" }}>
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Tanya seputar bisnis..."
              className="input-premium flex-1 text-sm !border-0 !shadow-none !bg-transparent" disabled={loading} />
            <button type="submit" disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl transition-all disabled:opacity-30 shrink-0"
              style={{ background: "var(--gradient-primary)", color: "white", boxShadow: "0 2px 12px rgba(5,150,105,0.3)" }}
            ><Send size={18}/></button>
          </form>
        </div>
      </div>
    </div>
  );
}
