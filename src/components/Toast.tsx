"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { CheckCircle, XCircle, Warning, Info, X } from "@phosphor-icons/react";
import { safeUUID } from "../lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = safeUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[90vw] sm:max-w-sm">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onRemove,
}: {
  toast: ToastItem;
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const duration = toast.duration ?? 3500;
    const leaveTimer = setTimeout(() => {
      setIsLeaving(true);
    }, duration);

    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, duration + 400);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, toast.duration, onRemove]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => onRemove(toast.id), 400);
  };

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={20} weight="duotone" />,
    error: <XCircle size={20} weight="duotone" />,
    warning: <Warning size={20} weight="duotone" />,
    info: <Info size={20} weight="duotone" />,
  };

  const colorMap: Record<ToastType, string> = {
    success:
      "from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400",
    error:
      "from-red-500/20 to-red-600/5 border-red-500/30 text-red-400",
    warning:
      "from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400",
    info: "from-sky-500/20 to-sky-600/5 border-sky-500/30 text-sky-400",
  };

  const iconColorMap: Record<ToastType, string> = {
    success: "text-emerald-400",
    error: "text-red-400",
    warning: "text-amber-400",
    info: "text-sky-400",
  };

  const progressColorMap: Record<ToastType, string> = {
    success: "bg-emerald-400",
    error: "bg-red-400",
    warning: "bg-amber-400",
    info: "bg-sky-400",
  };

  return (
    <div
      className={`
        pointer-events-auto relative overflow-hidden
        rounded-2xl border backdrop-blur-xl shadow-2xl
        bg-gradient-to-r ${colorMap[toast.type]}
        transition-all duration-400 ease-out
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"}
      `}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        {/* Icon */}
        <div
          className={`flex-shrink-0 mt-0.5 ${iconColorMap[toast.type]} drop-shadow-lg`}
        >
          {iconMap[toast.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-foreground/60 mt-1 leading-relaxed">
              {toast.message}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center
                     text-foreground/40 hover:text-foreground/80 hover:bg-foreground/10
                     transition-all duration-200"
          aria-label="Tutup notifikasi"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="h-[2px] w-full bg-foreground/5">
        <div
          className={`h-full ${progressColorMap[toast.type]} rounded-full`}
          style={{
            animation: `toast-progress ${toast.duration ?? 3500}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
