"use client";

import { useAuth } from "@/providers/auth";
import { AttendancePage } from "@/components/screens/attendance-page";
import { AdminAttendancePage } from "@/components/screens/admin-attendance";

export default function Attendance() {
  const { user } = useAuth();

  // 어드민(대표)은 출근 안 찍음 — 본인 근태 대신 팀 감독 뷰
  if (user?.role === "ADMIN") return <AdminAttendancePage />;
  return <AttendancePage />;
}
