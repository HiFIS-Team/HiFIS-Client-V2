import { BarcodeStrip } from "@/components/barcode-strip";
import { AttendanceCard } from "@/components/attendance-card";

const routineTasks = [
  { label: "빨래 정리", done: true },
  { label: "세탁기 돌리기", done: false },
  { label: "건조기 비우기", done: false },
];

const projects = [
  { name: "여름 회원 이벤트 준비", owner: "김은후", dday: "D-7" },
  { name: "3층 시설 점검", owner: "박트레이너", dday: "D-3" },
];

function CheckMini() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 바코드 */}
      <BarcodeStrip />

      {/* 출퇴근 카드 (바코드 스캔 반영) */}
      <AttendanceCard />

      {/* 오늘의 반복 업무 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">오늘의 반복 업무</h2>
          <span className="text-xs text-fg-muted">1/3 완료</span>
        </div>
        <ul className="space-y-3">
          {routineTasks.map((t) => (
            <li key={t.label} className="flex items-center gap-3">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                  t.done ? "border-primary bg-primary" : "border-white/25"
                }`}
              >
                {t.done && <CheckMini />}
              </span>
              <span className={t.done ? "text-fg-muted line-through" : "text-fg"}>
                {t.label}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 진행 중 프로젝트 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <h2 className="mb-3 font-semibold">진행 중 프로젝트</h2>
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.name} className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="text-xs text-fg-muted">{p.owner}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary-bright">
                {p.dday}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
