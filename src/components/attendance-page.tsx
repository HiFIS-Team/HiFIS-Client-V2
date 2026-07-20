"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useToast } from "@/components/toast";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

type Rec = { d: number; dow: number; inMin: number; outMin: number | null; work: number | null; isToday: boolean };
type LeaveType = "연차" | "반차" | "병가" | "외근" | "기타";
type Status = "승인" | "대기" | "반려";
type Leave = { id: string; type: LeaveType; days: number; date: string; dateEnd?: string; reason: string; status: Status };
type AllLeave = { id: string; name: string; type: LeaveType; days: number; date: string; dateEnd?: string; status: Status };

const SEED_LEAVES: Leave[] = [
  { id: "l1", type: "연차", days: 1, date: "2026-07-02", reason: "개인 사유", status: "승인" },
  { id: "l2", type: "반차", days: 1, date: "2026-07-23", reason: "병원 진료 (오후)", status: "대기" },
  { id: "l3", type: "연차", days: 3, date: "2026-08-06", dateEnd: "2026-08-08", reason: "여름 휴가", status: "대기" },
];

const ALL_LEAVES: AllLeave[] = [
  { id: "a1", name: "김은후", type: "반차", days: 1, date: "2026-07-23", status: "대기" },
  { id: "a2", name: "지민", type: "연차", days: 1, date: "2026-07-24", status: "대기" },
  { id: "a3", name: "서연", type: "병가", days: 1, date: "2026-07-18", status: "대기" },
  { id: "a4", name: "현우", type: "연차", days: 1, date: "2026-07-10", status: "승인" },
  { id: "a5", name: "민준", type: "연차", days: 2, date: "2026-07-08", dateEnd: "2026-07-09", status: "승인" },
  { id: "a6", name: "지민", type: "반차", days: 1, date: "2026-07-05", status: "승인" },
  { id: "a7", name: "서연", type: "연차", days: 1, date: "2026-07-01", status: "반려" },
];

const LEAVE_DOT: Record<LeaveType, string> = {
  연차: "bg-blue-400",
  반차: "bg-violet-400",
  병가: "bg-rose-400",
  외근: "bg-emerald-400",
  기타: "bg-slate-400",
};
const STATUS_STYLE: Record<Status, string> = {
  승인: "bg-emerald-400/12 text-emerald-300",
  대기: "bg-amber-400/12 text-amber-300",
  반려: "bg-red-500/12 text-red-400",
};
const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}

function ampm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${pad(h12)}:${pad(m)}`;
}
const workStr = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;
const period = (l: { date: string; dateEnd?: string; days: number }) =>
  `${l.date}${l.dateEnd ? ` ~ ${l.dateEnd}` : ""} (${l.days}일)`;

type IconP = { className?: string };
const svg = (children: ReactElement) => ({ className }: IconP) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const CalendarIcon = svg(<><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M4 9.5h16M8 3.5v4M16 3.5v4" /></>);
const ClockIcon = svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
const PinIcon = svg(<><path d="M12 21s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" /></>);
const RefreshIcon = svg(<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>);
const ChevronDownIcon = svg(<path d="m6 9 6 6 6-6" />);
const PlusIcon = ({ className }: IconP) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

function StatCard({ label, value, Icon, tint }: { label: string; value: string; Icon: (p: IconP) => ReactElement; tint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2.5 text-xs text-fg-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function AttendancePage() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>(SEED_LEAVES);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>("연차");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const idRef = useRef(0);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    const y = now.getFullYear();
    const m = now.getMonth();
    const recs: Rec[] = [];
    for (let d = 1; d <= now.getDate(); d++) {
      const dow = new Date(y, m, d).getDay();
      if (dow === 0 || dow === 6) continue; // 주말 제외
      const isToday = d === now.getDate();
      const inMin = 9 * 60 + ((d * 7) % 12);
      const outMin = isToday ? null : 17 * 60 + 30 + ((d * 5) % 40);
      recs.push({ d, dow, inMin, outMin, work: outMin === null ? null : outMin - inMin, isToday });
    }
    setRecords(recs);
  }, []);

  useEffect(() => {
    if (!leaveOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLeaveOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [leaveOpen]);

  const monthKey = today ? `${today.getFullYear()}-${pad(today.getMonth() + 1)}` : "";
  const monthLabel = today ? `${today.getFullYear()}년 ${today.getMonth() + 1}월` : "…";
  const mm = today ? pad(today.getMonth() + 1) : "";
  const done = records.filter((r) => r.work !== null);
  const avg = done.length ? Math.round(done.reduce((a, r) => a + (r.work ?? 0), 0) / done.length) : 0;
  const pending = myLeaves.filter((l) => l.status === "대기").length;
  const allWait = ALL_LEAVES.filter((a) => a.status === "대기").length;
  const allDone = ALL_LEAVES.length - allWait;

  const openLeave = () => {
    setLeaveType("연차");
    setLeaveStart("");
    setLeaveEnd("");
    setLeaveReason("");
    setLeaveOpen(true);
  };
  const submitLeave = () => {
    if (!leaveStart) return;
    const end = leaveEnd && leaveEnd >= leaveStart ? leaveEnd : "";
    const days = end && end !== leaveStart ? Math.round((new Date(end).getTime() - new Date(leaveStart).getTime()) / 86400000) + 1 : 1;
    idRef.current += 1;
    setMyLeaves((list) => [
      { id: `new-${idRef.current}`, type: leaveType, days, date: leaveStart, dateEnd: end || undefined, reason: leaveReason.trim() || "(사유 없음)", status: "대기" },
      ...list,
    ]);
    setLeaveOpen(false);
    show(`${leaveType} ${days}일 신청했습니다`);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      <h1 className="text-2xl font-bold">근태 · 월차</h1>

      {/* 월 선택 + 휴가 신청 */}
      <div className="flex items-center gap-2">
        <button type="button" aria-label="새로고침" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-surface text-fg-muted">
          <RefreshIcon className="h-4 w-4" />
        </button>
        <button type="button" className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
          <CalendarIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="flex-1 text-left text-sm font-bold">{monthLabel}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        </button>
        <button type="button" onClick={openLeave} className="btn-primary flex shrink-0 items-center gap-1 px-3.5 py-2.5 text-sm">
          <PlusIcon className="h-4 w-4" />휴가 신청
        </button>
      </div>

      {/* 요약 카드 */}
      {today && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label={`${monthKey} 근무일`} value={`${done.length}일`} Icon={CalendarIcon} tint="bg-blue-500/15 text-blue-400" />
          <StatCard label="평균 근무시간" value={workStr(avg)} Icon={ClockIcon} tint="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="사용한 휴가" value="1일" Icon={PinIcon} tint="bg-amber-500/15 text-amber-400" />
          <StatCard label="승인 대기" value={`${pending}건`} Icon={ClockIcon} tint="bg-violet-500/15 text-violet-400" />
        </div>
      )}

      {/* 출퇴근 기록 */}
      {today && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="px-4 pb-2 pt-4">
            <p className="text-base font-bold">{monthKey} 출퇴근 기록</p>
            <p className="mt-0.5 text-xs text-fg-muted">총 {records.length}일 기록</p>
          </div>
          <div className="divide-y divide-white/5">
            {records
              .slice()
              .reverse()
              .map((r) => (
                <div key={r.d} className={`px-4 py-3.5 ${r.isToday ? "bg-primary/[0.08]" : ""}`}>
                  <p className="text-base font-bold tabular-nums">
                    {mm}-{pad(r.d)}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {WEEK[r.dow]}
                    {r.isToday && <span className="ml-1.5 font-semibold text-primary-bright">오늘</span>}
                  </p>
                  <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">출근</span>
                      <span className="tabular-nums">{ampm(r.inMin)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">퇴근</span>
                      <span className="tabular-nums">{r.outMin === null ? "—" : ampm(r.outMin)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">근무시간</span>
                      <span className="font-bold tabular-nums">{r.work === null ? "—" : workStr(r.work)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 내 휴가 신청 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="text-base font-bold">내 휴가 신청</p>
        <p className="mt-0.5 text-xs text-fg-muted">최근 신청 {myLeaves.length}건</p>
        <div className="mt-3 space-y-2">
          {myLeaves.slice(0, 3).map((l) => (
            <div key={l.id} className="rounded-xl border border-white/10 bg-surface-2/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${LEAVE_DOT[l.type]}`} />
                  <span className="text-sm font-bold">{l.type}</span>
                  <span className="text-xs text-fg-muted">· {l.days}일</span>
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[l.status]}`}>{l.status}</span>
              </div>
              <p className="mt-1.5 text-sm text-fg-muted tabular-nums">{l.date}{l.dateEnd ? ` ~ ${l.dateEnd}` : ""}</p>
              <p className="mt-1 text-sm">{l.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 전체 휴가 신청 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="text-base font-bold">전체 휴가 신청</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          대기 <span className="font-bold text-fg">{allWait}</span> · 처리됨 <span className="font-bold text-fg">{allDone}</span>
        </p>
        <div className="mt-3 space-y-2">
          {ALL_LEAVES.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/10 bg-surface-2/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarColor(a.name) }}>
                    {a.name.charAt(0)}
                  </span>
                  <span className="truncate text-sm font-bold">{a.name}</span>
                  <span className="shrink-0 text-xs text-fg-muted">{a.type}</span>
                </span>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[a.status]}`}>{a.status}</span>
              </div>
              <p className="mt-1.5 text-sm text-fg-muted tabular-nums">기간 {period(a)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 휴가 신청 모달 */}
      {leaveOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setLeaveOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            {/* 그라데이션 헤더 */}
            <div className="bg-[linear-gradient(120deg,#6d1cf0,#a855f7)] px-4 py-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/75">New Request</p>
              <p className="mt-0.5 text-lg font-bold text-white">휴가 신청</p>
            </div>

            <div className="max-h-[68vh] overflow-y-auto p-4">
              <label className="block text-xs text-fg-muted">종류</label>
              <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                {(["연차", "반차", "병가", "외근", "기타"] as LeaveType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setLeaveType(t)}
                    className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors ${
                      leaveType === t ? "border-primary bg-primary/10" : "border-white/10 bg-bg"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${LEAVE_DOT[t]}`} />
                    <span className={`text-xs font-semibold ${leaveType === t ? "text-primary-bright" : "text-fg-muted"}`}>{t}</span>
                  </button>
                ))}
              </div>

              <label className="mt-4 block text-xs text-fg-muted">시작일</label>
              <div className="relative mt-1">
                <input
                  ref={startRef}
                  type="date"
                  value={leaveStart}
                  onChange={(e) => setLeaveStart(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <button type="button" onClick={() => startRef.current?.showPicker?.()} aria-label="달력" className="absolute inset-y-0 right-0 grid w-10 place-items-center text-fg-muted">
                  <CalendarIcon className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-4 block text-xs text-fg-muted">종료일</label>
              <div className="relative mt-1">
                <input
                  ref={endRef}
                  type="date"
                  value={leaveEnd}
                  min={leaveStart || undefined}
                  onChange={(e) => setLeaveEnd(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2.5 pr-10 text-sm outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
                <button type="button" onClick={() => endRef.current?.showPicker?.()} aria-label="달력" className="absolute inset-y-0 right-0 grid w-10 place-items-center text-fg-muted">
                  <CalendarIcon className="h-4 w-4" />
                </button>
              </div>

              <label className="mt-4 block text-xs text-fg-muted">사유 (선택)</label>
              <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={3} placeholder="비워두어도 신청 가능" className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-bg px-3 py-2.5 text-sm outline-none focus:border-primary/50" />

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setLeaveOpen(false)} className="btn-secondary px-4 py-2 text-sm">
                  취소
                </button>
                <button type="button" onClick={submitLeave} disabled={!leaveStart} className="btn-primary px-4 py-2 text-sm">
                  신청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
