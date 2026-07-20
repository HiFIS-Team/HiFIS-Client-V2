"use client";

import { useEffect, useState } from "react";
import { SHIFT, useAttendance, type WorkStatus } from "@/providers/attendance";

const STATUS_META: Record<WorkStatus, { label: string; cls: string }> = {
  before: { label: "미출근", cls: "bg-white/10 text-fg-muted" },
  in: { label: "출근", cls: "bg-emerald-400/15 text-emerald-300" },
  out: { label: "퇴근", cls: "bg-primary/15 text-primary-bright" },
};

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
const pad = (n: number) => String(n).padStart(2, "0");

export function AttendanceCard() {
  const { status, checkIn, checkOut } = useAttendance();
  const [now, setNow] = useState<Date | null>(null); // SSR 불일치 방지 — 마운트 후 세팅

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clock = now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : "--:--:--";

  // 근무 진행률: 출근 ~ (현재 or 퇴근) / 전체 근무시간
  const shiftDur = toMin(SHIFT.end) - toMin(SHIFT.start);
  let pct = 0;
  if (status !== "before" && checkIn && now) {
    const inMin = toMin(checkIn);
    const refMin =
      status === "out" && checkOut
        ? toMin(checkOut)
        : now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    pct = Math.max(0, Math.min(1, (refMin - inMin) / shiftDur)) * 100;
  }

  const meta = STATUS_META[status];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-surface p-4">
      <div className="relative">
        {/* 오늘 근무 + 상태 */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-fg-muted">오늘 근무</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.cls}`}>
            {meta.label}
          </span>
        </div>

        {/* 실시간 시계 */}
        <p className="mt-1 font-mono text-3xl font-bold tabular-nums tracking-tight">{clock}</p>

        {/* 선 (근무 진행 바) */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#c471ff,#7d1ff0)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* 양끝 근무시간 + 가운데 퍼센트 */}
        <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
          <span className="text-fg-muted">{SHIFT.start}</span>
          <span className="font-semibold text-primary-bright">{Math.round(pct)}%</span>
          <span className="text-fg-muted">{SHIFT.end}</span>
        </div>

        {/* 출근 / 퇴근 시각 (바코드 스캔 시 반영) */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-sm">
          <span className="text-fg-muted">
            출근 <span className="ml-1 font-semibold text-fg tabular-nums">{checkIn ?? "--:--"}</span>
          </span>
          <span className="text-fg-muted">
            퇴근 <span className="ml-1 font-semibold text-fg tabular-nums">{checkOut ?? "--:--"}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
