import { BarcodeStrip } from "@/components/barcode-strip";
import { AttendanceCard } from "@/components/attendance-card";
import { QuickActions } from "@/components/quick-actions";

export default function Home() {
  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 바코드 */}
      <BarcodeStrip />

      {/* 출퇴근 카드 (바코드 스캔 반영) */}
      <AttendanceCard />

      {/* 빠른 실행 */}
      <QuickActions />
    </div>
  );
}
