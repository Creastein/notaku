"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, User, Moon, Sun, Laptop, Trash2, Info, Download, Save, RefreshCcw } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/ThemeProvider";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { getUserProfile, saveUserProfile, clearAllData, UserProfile } from "@/lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isInstallable, handleInstallClick } = usePWAInstall();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile>({
    ownerName: "",
    businessName: "",
    businessCategory: "F&B",
    businessAge: "1-3_tahun",
    targetMonthlyRevenue: 10000000,
    onboardedAt: new Date().toISOString(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  useEffect(() => {
    const p = getUserProfile();
    if (p) {
      setProfile(p);
    } else {
      // If no profile, maybe they shouldn't be here, but we allow it
    }
  }, []);

  const handleSaveProfile = () => {
    setIsSaving(true);
    try {
      // Validasi sederhana
      if (!profile.ownerName.trim() || !profile.businessName.trim()) {
        showToast({
          type: "warning",
          title: "Data belum lengkap",
          message: "Nama pemilik dan nama bisnis harus diisi.",
        });
        setIsSaving(false);
        return;
      }

      saveUserProfile(profile);

      setTimeout(() => {
        setIsSaving(false);
        showToast({
          type: "success",
          title: "Profil berhasil disimpan! ✨",
          message: "Perubahan data bisnis Anda telah tersimpan.",
        });
      }, 600);
    } catch {
      setIsSaving(false);
      showToast({
        type: "error",
        title: "Gagal menyimpan profil",
        message: "Terjadi kesalahan, silakan coba lagi.",
      });
    }
  };

  const handleResetOnboarding = () => {
    localStorage.removeItem("notaku_user_profile");
    router.push("/onboarding");
  };

  const handleDeleteAll = () => {
    if (deleteInput === "HAPUS") {
      clearAllData();
      router.push("/onboarding");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col app-container">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/20 dark:bg-slate-950/20 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 h-16">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-foreground/5 transition-colors"
          >
            <ChevronLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Pengaturan</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">
        
        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <User size={20} />
            </div>
            <h2 className="font-semibold text-foreground">Profil Bisnis</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground/60 mb-1 block">Nama Pemilik</label>
              <input
                type="text"
                value={profile.ownerName}
                onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/60 mb-1 block">Nama Bisnis</label>
              <input
                type="text"
                value={profile.businessName}
                onChange={(e) => setProfile({ ...profile, businessName: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/60 mb-1 block">Kategori Bisnis</label>
              <select
                value={profile.businessCategory}
                onChange={(e) => setProfile({ ...profile, businessCategory: e.target.value })}
                className="w-full bg-foreground/5 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
              >
                <option value="F&B">F&B (Makanan/Minuman)</option>
                <option value="Retail">Retail/Toko</option>
                <option value="Jasa">Jasa</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground/60 mb-1 block">Target Omzet Bulanan</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/50 text-sm">Rp</span>
                <input
                  type="number"
                  value={profile.targetMonthlyRevenue}
                  onChange={(e) => setProfile({ ...profile, targetMonthlyRevenue: Number(e.target.value) })}
                  className="w-full bg-foreground/5 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full btn-primary py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 mt-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
              {isSaving ? "Menyimpan..." : "Simpan Profil"}
            </button>
          </div>
        </div>

        {/* Tampilan Card */}
        <div className="glass-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Sun size={20} className="dark:hidden" />
              <Moon size={20} className="hidden dark:block" />
            </div>
            <h2 className="font-semibold text-foreground">Tampilan</h2>
          </div>

          <div className="flex bg-foreground/5 p-1 rounded-xl">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize flex items-center justify-center gap-1.5 transition-all ${
                  theme === t ? "bg-background shadow-sm text-foreground" : "text-foreground/50 hover:text-foreground"
                }`}
              >
                {t === "light" && <Sun size={14} />}
                {t === "dark" && <Moon size={14} />}
                {t === "system" && <Laptop size={14} />}
                {t === "system" ? "Sistem" : t === "light" ? "Terang" : "Gelap"}
              </button>
            ))}
          </div>
        </div>

        {/* App Info Card */}
        <div className="glass-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-500">
              <Info size={20} />
            </div>
            <h2 className="font-semibold text-foreground">Info Aplikasi</h2>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm font-medium text-foreground/70">Versi</span>
            <span className="text-sm text-foreground font-mono">1.0.0</span>
          </div>

          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="w-full mt-2 bg-sky-400/10 text-sky-600 dark:text-sky-400 hover:bg-sky-400/20 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Download size={16} />
              Install Aplikasi (PWA)
            </button>
          )}
        </div>

        {/* Danger Zone Card */}
        <div className="glass-card rounded-2xl p-5 border border-red-500/20 bg-red-500/5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <Trash2 size={20} />
            </div>
            <h2 className="font-semibold text-red-600 dark:text-red-400">Zona Bahaya</h2>
          </div>

          {!showDeleteConfirm ? (
            <div className="space-y-3">
              <button
                onClick={handleResetOnboarding}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors"
              >
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <RefreshCcw size={16} className="text-foreground/60" />
                  Ulangi Onboarding
                </div>
                <ChevronLeft size={16} className="rotate-180 text-foreground/40" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400">
                  <Trash2 size={16} />
                  Hapus Semua Data
                </div>
                <ChevronLeft size={16} className="rotate-180 text-red-500/40" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <p className="text-xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Semua data transaksi, histori chat AI, dan profil akan dihapus permanen.
                <br /><br />
                Ketik <strong className="font-bold">HAPUS</strong> untuk mengonfirmasi.
              </p>
              <input
                type="text"
                placeholder="Ketik HAPUS"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full bg-background border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleteInput !== "HAPUS"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600 transition-colors"
                >
                  Konfirmasi
                </button>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
