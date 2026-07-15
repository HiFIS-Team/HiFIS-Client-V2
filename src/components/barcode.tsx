"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

/* ── Context ───────────────────────────────────── */
type Ctx = { open: boolean; openBarcode: () => void; closeBarcode: () => void };
const BarcodeContext = createContext<Ctx | null>(null);

export function useBarcode() {
  const ctx = useContext(BarcodeContext);
  if (!ctx) throw new Error("useBarcode must be used within BarcodeProvider");
  return ctx;
}

export function BarcodeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <BarcodeContext.Provider
      value={{ open, openBarcode: () => setOpen(true), closeBarcode: () => setOpen(false) }}
    >
      {children}
      <BarcodeSheet open={open} onClose={() => setOpen(false)} />
    </BarcodeContext.Provider>
  );
}

/* ── 바코드 드롭다운 시트 ───────────────────────── */
const DEFAULT_BRIGHTNESS = 0.9;

function BarcodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [brightness, setBrightness] = useState(DEFAULT_BRIGHTNESS);

  // 열 때마다 밝게 초기화
  useEffect(() => {
    if (open) setBrightness(DEFAULT_BRIGHTNESS);
  }, [open]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Wake Lock — 바코드 띄운 동안 화면 안 꺼짐
  useEffect(() => {
    if (!open || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: { release: () => Promise<void> } | null = null;
    const wakeLock = (navigator as unknown as {
      wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> };
    }).wakeLock;
    const request = async () => {
      try {
        sentinel = (await wakeLock?.request("screen")) ?? null;
      } catch {
        /* 지원 안 함/거부 — 무시 */
      }
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [open]);

  const pct = Math.round(brightness * 100);

  return (
    <div
      role="dialog"
      aria-label="바코드"
      aria-hidden={!open}
      className={`absolute inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
    >
      {/* 어두운 배경 (탭하면 닫힘) */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 밝기 부스트 — 화면을 흰색으로 채워 실제 발광량↑ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-300"
        style={{ opacity: open ? brightness : 0 }}
      />

      {/* 위에서 내려오는 콘텐츠 */}
      <div
        className={`absolute inset-x-0 top-0 px-4 pt-3 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "-translate-y-[130%]"
        }`}
      >
        {/* 화면 밝기 컨트롤 바 */}
        <div className="flex items-center gap-3 rounded-2xl bg-black/85 px-4 py-2.5 backdrop-blur-xl">
          <SunIcon className="h-5 w-5 shrink-0 text-white/90" />
          <span className="shrink-0 text-sm font-medium text-white">화면 밝기</span>
          <input
            type="range"
            min={0.15}
            max={1}
            step={0.01}
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            aria-label="화면 밝기 조절"
            className="brightness-range min-w-0 flex-1"
            style={{
              background: `linear-gradient(to right, #fff ${pct}%, rgba(255,255,255,0.25) ${pct}%)`,
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/80 transition hover:text-white"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* 바코드 카드 */}
        <div className="mt-3 rounded-3xl bg-white px-5 py-9 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)]">
          <Barcode className="h-40 w-full" />
          <p className="mt-5 text-center font-mono text-sm tracking-[0.35em] text-black/60">
            8012 3456 7890
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 바코드 (고정 패턴) ─────────────────────────── */
// 교대로 [막대, 공백] 폭. 짝수 인덱스 = 검정 막대.
const MODULES = [
  3, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 3, 2, 1, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 3,
  1, 2, 2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1,
  1, 3, 1, 2, 2, 1, 1, 3,
];

export function Barcode({ className }: { className?: string }) {
  const total = MODULES.reduce((a, b) => a + b, 0);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  MODULES.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${total} 100`} preserveAspectRatio="none" className={className} aria-label="바코드">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="100" fill="#000" />
      ))}
    </svg>
  );
}

/* ── 아이콘 ─────────────────────────────────────── */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
