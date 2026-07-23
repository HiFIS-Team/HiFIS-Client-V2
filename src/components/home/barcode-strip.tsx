"use client";

import { useState } from "react";
import { Barcode } from "@/components/home/barcode";
import { useAttendance } from "@/providers/attendance";
import { useAuth } from "@/providers/auth";

export function BarcodeStrip() {
  const { scan } = useAttendance();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const code = user?.barcode ?? "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="내 출근 바코드 보기"
        className="block w-full rounded-2xl bg-white px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)]"
      >
        {code ? <Barcode value={code} className="h-12 w-full" /> : <div className="h-12" />}
      </button>

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-[80] mx-auto flex max-w-md flex-col items-center justify-center gap-4 bg-black/85 px-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div className="animate-page-in w-full rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-[13px] font-semibold text-black/55">내 출근 바코드</p>
            {code ? <Barcode value={code} className="mx-auto mt-3 h-32 w-full" /> : null}
            <p className="mt-3 text-center font-mono text-lg font-bold tracking-[0.3em] text-black">{code}</p>
          </div>

          <p className="text-center text-[13px] leading-relaxed text-fg-muted">
            지점 스캐너에 이 바코드를 스캔하면
            <br />
            출근·퇴근이 기록돼요.
          </p>

          <div className="flex w-full gap-2" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                scan();
                setOpen(false);
              }}
              className="btn-primary flex-1 py-2.5 text-sm"
            >
              직접 출근/퇴근
            </button>
          </div>
        </div>
      )}
    </>
  );
}
