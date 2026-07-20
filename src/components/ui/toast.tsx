"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/* 완료/취소 캡슐 토스트 — 상단에서 내려와 1.6초 후 사라짐 */
type Kind = "done" | "cancel";
type Toast = { id: number; text: string; kind: Kind };

type Ctx = { show: (text: string, kind?: Kind) => void };
const ToastContext = createContext<Ctx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const idRef = useRef(0);

  const show = useCallback((text: string, kind: Kind = "done") => {
    idRef.current += 1;
    setToast({ id: idRef.current, text, kind });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-[95] flex justify-center px-4">
          <div
            key={toast.id}
            className={`animate-toast-drop flex items-center gap-2 rounded-full border bg-surface-2/95 py-2 pl-2.5 pr-4 shadow-xl backdrop-blur ${
              toast.kind === "done" ? "border-primary/30" : "border-red-500/30"
            }`}
          >
            <span
              className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                toast.kind === "done" ? "bg-primary/20 text-primary-bright" : "bg-red-500/20 text-red-400"
              }`}
            >
              {toast.kind === "done" ? <CheckIcon className="h-3.5 w-3.5" /> : <MinusIcon className="h-3.5 w-3.5" />}
            </span>
            <span className="text-sm font-semibold">{toast.text}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
