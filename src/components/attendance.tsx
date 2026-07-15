"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type WorkStatus = "before" | "in" | "out";

// 근무 시간 (목업)
export const SHIFT = { start: "09:00", end: "18:00" };

type Ctx = {
  status: WorkStatus;
  checkIn: string | null;
  checkOut: string | null;
  scan: () => void; // 바코드 스캔 시뮬레이션
};
const AttendanceContext = createContext<Ctx | null>(null);

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used within AttendanceProvider");
  return ctx;
}

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WorkStatus>("before");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  // 바코드 찍을 때마다: 미출근 → 출근 → 퇴근 → (다시) 초기화
  const scan = () => {
    if (status === "before") {
      setCheckIn(nowHHMM());
      setCheckOut(null);
      setStatus("in");
    } else if (status === "in") {
      setCheckOut(nowHHMM());
      setStatus("out");
    } else {
      setCheckIn(null);
      setCheckOut(null);
      setStatus("before");
    }
  };

  return (
    <AttendanceContext.Provider value={{ status, checkIn, checkOut, scan }}>
      {children}
    </AttendanceContext.Provider>
  );
}
