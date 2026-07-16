"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

type Rec = { d: number; dow: number; inMin: number; outMin: number; work: number };

function ampm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${pad(h12)}:${pad(m)}`;
}
const workStr = (min: number) => `${Math.floor(min / 60)}h ${min % 60}m`;

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
  const [today, setToday] = useState<Date | null>(null);
  const [records, setRecords] = useState<Rec[]>([]);
  const [pending, setPending] = useState(2);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveType, setLeaveType] = useState("연차");
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  useEffect(() => {
    const now = new Date();
    setToday(now);
    const y = now.getFullYear();
    const m = now.getMonth();
    const recs: Rec[] = [];
    for (let d = 1; d <= now.getDate(); d++) {
      const dow = new Date(y, m, d).getDay();
      if (dow === 0 || dow === 6) continue; // 주말 제외
      const inMin = 9 * 60 + ((d * 7) % 12);
      const outMin = 17 * 60 + 30 + ((d * 5) % 40);
      recs.push({ d, dow, inMin, outMin, work: outMin - inMin });
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
  const avg = records.length ? Math.round(records.reduce((a, r) => a + r.work, 0) / records.length) : 0;

  const openLeave = () => {
    setLeaveType("연차");
    setLeaveDate("");
    setLeaveReason("");
    setLeaveOpen(true);
  };
  const submitLeave = () => {
    if (!leaveDate) return;
    setPending((p) => p + 1);
    setLeaveOpen(false);
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
          <StatCard label={`${monthKey} 근무일`} value={`${records.length}일`} Icon={CalendarIcon} tint="bg-blue-500/15 text-blue-400" />
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
                <div key={r.d} className="px-4 py-3.5">
                  <p className="text-base font-bold tabular-nums">
                    {mm}-{pad(r.d)}
                  </p>
                  <p className="text-xs text-fg-muted">{WEEK[r.dow]}</p>
                  <div className="mt-2.5 space-y-1.5 border-t border-white/5 pt-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">출근</span>
                      <span className="tabular-nums">{ampm(r.inMin)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">퇴근</span>
                      <span className="tabular-nums">{ampm(r.outMin)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-fg-muted">근무시간</span>
                      <span className="font-bold tabular-nums">{workStr(r.work)}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}

      {/* 휴가 신청 모달 */}
      {leaveOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setLeaveOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">휴가 신청</p>

            <label className="mt-3 block text-xs text-fg-muted">종류</label>
            <div className="mt-1.5 flex gap-1.5">
              {["연차", "반차", "병가"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setLeaveType(t)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    leaveType === t ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-bg text-fg-muted"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="mt-3 block text-xs text-fg-muted">날짜</label>
            <input type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50" />

            <label className="mt-3 block text-xs text-fg-muted">사유 (선택)</label>
            <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} rows={2} placeholder="사유를 입력하세요" className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50" />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setLeaveOpen(false)} className="btn-secondary px-3 py-1.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitLeave} disabled={!leaveDate} className="btn-primary px-3.5 py-1.5 text-sm">
                신청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
