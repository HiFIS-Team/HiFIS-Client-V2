"use client";

import { useAuth } from "@/providers/auth";
import { AdminHome } from "@/components/home/admin-home";
import { BarcodeStrip } from "@/components/home/barcode-strip";
import { GreetingCard } from "@/components/home/greeting-card";
import { AttendanceCard } from "@/components/home/attendance-card";
import { QuickActions } from "@/components/home/quick-actions";
import { TodayTasks, NoticesCard } from "@/components/home/home-cards";

export default function Home() {
  const { user } = useAuth();

  // 어드민(대표)은 감독자 홈 — 바코드·근태·환경정비 대신 결재/출근/요약
  if (user?.role === "ADMIN") return <AdminHome />;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 바코드 */}
      <BarcodeStrip />

      {/* 인사 메시지 */}
      <GreetingCard />

      {/* 출퇴근 카드 (바코드 스캔 반영) */}
      <AttendanceCard />

      {/* 빠른 실행 */}
      <QuickActions />

      {/* 오늘의 업무 */}
      <TodayTasks />

      {/* 공지 */}
      <NoticesCard />
    </div>
  );
}
