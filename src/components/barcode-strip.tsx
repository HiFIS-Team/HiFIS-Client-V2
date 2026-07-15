"use client";

import { Barcode, useBarcode } from "@/components/barcode";

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3H5a2 2 0 0 0-2 2v4M15 3h4a2 2 0 0 1 2 2v4M9 21H5a2 2 0 0 1-2-2v-4M15 21h4a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

export function BarcodeStrip() {
  const { openBarcode } = useBarcode();
  return (
    <button
      type="button"
      onClick={openBarcode}
      aria-label="바코드 크게 보기"
      className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
    >
      <span className="min-w-0 flex-1">
        <Barcode className="h-9 w-full" />
        <span className="mt-1.5 block text-center font-mono text-[10px] tracking-[0.3em] text-black/45">
          8012 3456 7890
        </span>
      </span>
      <ExpandIcon className="h-4 w-4 shrink-0 text-black/30" />
    </button>
  );
}
