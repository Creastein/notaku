"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CaretLeft, User, Moon, Sun, Desktop, Trash, Info, Download, FloppyDisk, ArrowsCounterClockwise, SignOut, Shield } from "@phosphor-icons/react";
import { useToast } from "@/components/Toast";
import { useTheme } from "@/components/ThemeProvider";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAuth } from "@/lib/auth-context";
import { getUserProfile, saveUserProfile, clearAllData, loadProfileFromFirestore, migrateTransactionsToUid, UserProfile } from "@/lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { isInstallable, handleInstallClick } = usePWAInstall();
  const { showToast } = useToast();
  const { user, signInWithGoogle, signOut } = useAuth();

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
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const p = getUserProfile();
    if (p) {
      setProfile(p);
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

  const handleLinkGoogle = async () => {
    setIsLinking(true);
    try {
      const googleUser = await signInWithGoogle();
      if (googleUser) {
        // Update profile with Google UID
        const updatedProfile = { ...profile, userId: googleUser.uid };
        setProfile(updatedProfile);
        saveUserProfile(updatedProfile);
        await migrateTransactionsToUid(googleUser.uid);
        showToast({
          type: "success",
          title: "Akun Google terhubung! 🔗",
          message: "Data Anda sekarang tersinkron dan aman di cloud.",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Gagal menghubungkan",
        message: "Tidak bisa menghubungkan akun Google. Coba lagi.",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    showToast({
      type: "info",
      title: "Berhasil keluar",
      message: "Anda telah keluar dari akun Google.",
    });
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
            <CaretLeft size={24} className="text-foreground" />
          </button>
          <h1 className="text-lg font-semibold text-foreground">Pengaturan</h1>
        </div>
      </header>

      <div className="flex-1 p-4 space-y-6">

        {/* Account Card */}
        <div className="glass-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Shield size={20} />
            </div>
            <h2 className="font-semibold text-foreground">Akun & Sinkronisasi</h2>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border-2 border-emerald-500/30" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold">
                    {user.displayName?.[0] || "U"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
                  <p className="text-xs text-foreground/50 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold">Tersinkron</span>
                </div>
              </div>
              <p className="text-xs text-foreground/40 leading-relaxed">
                ✅ Data Anda tersimpan di cloud. Saat install ulang, login dengan akun Google ini untuk memulihkan semua data.
              </p>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-foreground/5 text-foreground/60 hover:bg-foreground/10 hover:text-foreground transition-colors"
              >
                <SignOut size={16} />
                Keluar dari Akun
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-foreground/50 leading-relaxed">
                ⚠️ Data hanya tersimpan di perangkat ini. Hubungkan akun Google agar data aman dan bisa dipulihkan saat install ulang.
              </p>
              <button
                onClick={handleLinkGoogle}
                disabled={isLinking}
                className="w-full py-3 flex items-center justify-center gap-3 text-sm font-semibold rounded-xl bg-foreground/[0.03] border border-foreground/10 hover:bg-foreground/[0.06] text-foreground/70 hover:text-foreground transition-all"
              >
                {isLinking ? (
                  <><div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground/60 rounded-full animate-spin" /> Menghubungkan...</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Hubungkan Akun Google
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
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
                <FloppyDisk size={16} />
              )}
              {isSaving ? "Menyimpan..." : "Simpan Profil"}
            </button>
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
              <Trash size={20} />
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
                  <ArrowsCounterClockwise size={16} className="text-foreground/60" />
                  Ulangi Onboarding
                </div>
                <CaretLeft size={16} className="rotate-180 text-foreground/40" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors"
              >
                <div className="flex items-center gap-3 text-sm font-medium text-red-600 dark:text-red-400">
                  <Trash size={16} />
                  Hapus Semua Data
                </div>
                <CaretLeft size={16} className="rotate-180 text-red-500/40" />
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
