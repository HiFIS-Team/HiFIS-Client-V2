"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { listAttendance, scanAttendance, type AttendanceDTO } from "@/lib/api/hifis";

export type WorkStatus = "before" | "in" | "out";

// 근무 시간 (표시용 기준 — 진행 바 계산)
export const SHIFT = { start: "09:00", end: "18:00" };

type Ctx = {
  status: WorkStatus;
  checkIn: string | null; // "HH:MM"
  checkOut: string | null; // "HH:MM"
  scan: () => void; // 바코드 스캔 (POST /attendance/scan)
};
const AttendanceContext = createContext<Ctx | null>(null);

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used within AttendanceProvider");
  return ctx;
}

const pad = (n: number) => String(n).padStart(2, "0");
function hhmm(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function statusFrom(a: AttendanceDTO | null): WorkStatus {
  if (!a || !a.checkIn) return "before";
  return a.checkOut ? "out" : "in";
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { show } = useToast();
  const { status: authStatus, user } = useAuth();
  const [record, setRecord] = useState<AttendanceDTO | null>(null);

  // 로그인 시 오늘 기록 복원 (리로드해도 상태 유지). .then 안에서만 setState → set-state-in-effect 아님.
  useEffect(() => {
    if (authStatus !== "authed" || !user) return;
    let alive = true;
    const now = new Date();
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    const todayStr = `${month}-${pad(now.getDate())}`;
    listAttendance({ employeeId: user.id, month })
      .then((rows) => {
        if (alive) setRecord(rows.find((r) => r.date === todayStr) ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authStatus, user]);

  // 바코드 찍을 때마다: 당일 첫 스캔=출근, 이후=퇴근(시각 갱신). 리셋 없음(서버 토글).
  const scan = async () => {
    try {
      const a = await scanAttendance();
      setRecord(a);
      show(a.checkOut ? `${hhmm(a.checkOut)} 퇴근했습니다` : `${hhmm(a.checkIn)} 출근했습니다`);
    } catch {
      show("출퇴근 스캔에 실패했어요", "cancel");
    }
  };

  const value: Ctx = {
    status: statusFrom(record),
    checkIn: hhmm(record?.checkIn),
    checkOut: hhmm(record?.checkOut),
    scan,
  };

  return <AttendanceContext.Provider value={value}>{children}</AttendanceContext.Provider>;
}
