"use client";

import { Barcode } from "@/components/home/barcode";
import { useAuth } from "@/providers/auth";

/**
 * 홈 최상단 출근 바코드 카드.
 * 이 바코드를 그대로 **매장 스캐너(`/kiosk`)에 대면** 출근/퇴근이 기록된다.
 * (탭 확대 모달 없음 — 표시 전용 카드)
 */
export function BarcodeStrip() {
  const { user } = useAuth();
  const code = user?.barcode ?? "";

  return (
    <div className="rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]">
      {code ? <Barcode value={code} className="h-12 w-full" /> : <div className="h-12" />}
    </div>
  );
}
