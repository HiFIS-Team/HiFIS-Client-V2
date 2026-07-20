"use client";

import { Barcode } from "@/components/home/barcode";
import { useAttendance } from "@/providers/attendance";

export function BarcodeStrip() {
  const { scan } = useAttendance();
  return (
    <button
      type="button"
      onClick={scan}
      aria-label="바코드 스캔 (출퇴근)"
      className="block w-full rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
    >
      <Barcode className="h-12 w-full" />
    </button>
  );
}
