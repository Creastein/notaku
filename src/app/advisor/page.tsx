"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Loader2, Trash2, Bot } from "lucide-react";
import { getTransactions } from "@/lib/storage";

interface Message { id: string; role: "user" | "model"; content: string; }

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const txs = await getTransactions();
      const summary = txs.slice(0, 20).map(t =>
        `${t.type === "income" ? "Pemasukan" : "Pengeluaran"}: Rp${t.amount.toLocaleString("id-ID")} - ${t.category} (${t.merchantName || "-"})`
      ).join("\n");

      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, transactionHistory: summary }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "model", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "model", content: "⚠️ Maaf, terjadi kesalahan. Coba lagi nanti." }]);
    } finally { setLoading(false); }
  }

  const suggestions = [
    "Bagaimana kondisi keuangan bisnis saya?",
    "Kategori pengeluaran mana yang paling besar?",
    "Tips menghemat biaya operasional UMKM",
    "Cara menghitung pajak UMKM sederhana",
  ];

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Header */}
      <div className="p-5 pt-5 flex items-center justify-between animate-fade-in-up" style={{ borderBottom: "1px solid var(--border)" }}>
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
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} aria-label="Hapus percakapan" className="p-2 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><Trash2 size={16}/></button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 pb-32">
        {messages.length === 0 ? (
          <div className="space-y-4 animate-fade-in-up">
            <div className="text-center py-8">
              <div className="inline-flex p-4 rounded-3xl mb-4" style={{ background: "var(--gradient-primary)", boxShadow: "0 8px 24px rgba(5,150,105,0.3)" }}>
                <Sparkles size={32} className="text-white" />
              </div>
              <p className="font-extrabold text-lg">Halo! Saya NotaKu AI</p>
              <p className="text-sm text-foreground/40 mt-1">Tanya apa saja tentang keuangan bisnismu</p>
            </div>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
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
                {msg.content}
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
      <div className="fixed bottom-16 left-0 right-0 z-40 p-3" style={{ background: "var(--gradient-card)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--border)" }}>
        <form onSubmit={handleSend} className="max-w-md mx-auto flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Tanya seputar bisnis..."
            className="input-premium flex-1 text-sm" disabled={loading} />
          <button type="submit" disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl transition-all disabled:opacity-30"
            style={{ background: "var(--gradient-primary)", color: "white", boxShadow: "0 2px 12px rgba(5,150,105,0.3)" }}
          ><Send size={18}/></button>
        </form>
      </div>
    </div>
  );
}
