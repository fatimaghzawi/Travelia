"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type Toast = {
  id: number;
  message: string;
  variant: "success" | "error";
};

type ToastContextValue = {
  showToast: (message: string, variant?: "success" | "error") => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.variant === "success"
                ? "border-teal-100 bg-white text-navy-900"
                : "border-rose-200 bg-white text-rose-600"
            }`}
          >
            {toast.variant === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
            ) : (
              <XCircle className="h-4 w-4 text-rose-500" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="ml-2 text-ink-soft hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
