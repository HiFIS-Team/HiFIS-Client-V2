"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useToast } from "@/components/ui/toast";
import { useRefresh } from "@/hooks/use-refresh";
import { useAuth } from "@/providers/auth";
import {
  approveLeave,
  listAttendance,
  listEmployees,
  listLeaves,
  rejectLeave,
  type AttendanceDTO,
  type EmployeeLite,
  type LeaveRequestDTO,
  type LeaveStatus as LeaveStatusCode,
  type LeaveType as LeaveTypeCode,
} from "@/lib/api/hifis";

/**
 * 어드민(대표) 근태 페이지 — 본인 출퇴근/휴가가 아니라 **팀 감독** 뷰.
 * 오늘 팀 출근 현황(누가 출근/퇴근/미출근) + 휴가 승인.
 * 데이터: listAttendance({month})=팀 전원(ADMIN scope 전체) + listEmployees(로스터) + listLeaves(전체).
 * setState 는 전부 .then/핸들러 안 → set-state-in-effect 아님.
 */

const pad = (n: number) => String(n).padStart(2, "0");

const RANK_KO: Record<string, string> = {
  TRAINER: "트레이너",
  FC: "FC",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  DEVELOPER: "개발자",
  CEO: "대표",
};

type LeaveTypeKo = "연차" | "반차" | "병가" | "외근" | "기타";
type StatusKo = "승인" | "대기" | "반려" | "취소됨";
const CODE_TO_KO: Record<LeaveTypeCode, LeaveTypeKo> = { ANNUAL: "연차", HALF: "반차", SICK: "병가", FIELD: "외근", ETC: "기타" };
const STATUS_TO_KO: Record<LeaveStatusCode, StatusKo> = { PENDING: "대기", APPROVED: "승인", REJECTED: "반려", CANCELLED: "취소됨" };
const LEAVE_DOT: Record<LeaveTypeKo, string> = {
  연차: "bg-blue-400",
  반차: "bg-violet-400",
  병가: "bg-rose-400",
  외근: "bg-emerald-400",
  기타: "bg-slate-400",
};
const STATUS_STYLE: Record<StatusKo, string> = {
  승인: "bg-emerald-400/12 text-emerald-300",
  대기: "bg-amber-400/12 text-amber-300",
  반려: "bg-red-500/12 text-red-400",
  취소됨: "bg-white/8 text-fg-muted",
};

type AttStatus = "in" | "out" | "before";
const ATT_META: Record<AttStatus, { label: string; cls: string }> = {
  in: { label: "출근", cls: "bg-emerald-400/15 text-emerald-300" },
  out: { label: "퇴근", cls: "bg-primary/15 text-primary-bright" },
  before: { label: "미출근", cls: "bg-white/10 text-fg-muted" },
};
const ATT_ORDER: Record<AttStatus, number> = { in: 0, out: 1, before: 2 };

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}
function minOf(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}
function ampm(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${pad(h12)}:${pad(m)}`;
}
const daysStr = (n: number) => `${n}일`;

/* ── 아이콘 (named 컴포넌트 — svg 팩토리 금지: display-name 에러 회피) ── */
type IconP = { className?: string };
function RefreshIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}
function CalendarIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16M8 3.5v4M16 3.5v4" />
    </svg>
  );
}
function ChevronDownIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function SunIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </svg>
  );
}
function UsersIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14c2.3.3 4 2.3 4 5" />
    </svg>
  );
}
function ClockIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

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

export function AdminAttendancePage() {
  const { show } = useToast();
  const { status: authStatus, user } = useAuth();

  const [today, setToday] = useState<Date | null>(null);
  const [employees, setEmployees] = useState<EmployeeLite[]>([]);
  const [attendance, setAttendance] = useState<AttendanceDTO[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestDTO[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(() => {
    if (!user) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
    Promise.all([listEmployees(), listAttendance({ month }), listLeaves()])
      .then(([emps, att, lv]) => {
        setToday(now);
        setEmployees(emps);
        setAttendance(att);
        setLeaves(lv);
      })
      .catch(() => {});
  }, [user]);

  const { busy, refresh } = useRefresh("근태 현황을 새로고침했습니다", load);

  useEffect(() => {
    if (authStatus === "authed") load();
  }, [authStatus, load]);

  const monthLabel = today ? `${today.getFullYear()}년 ${today.getMonth() + 1}월` : "…";
  const todayStr = today ? `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` : "";

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const nameOf = (id: string) => empMap.get(id)?.name ?? "직원";

  // 오늘 팀 출근 현황 — 출근 찍는 직원(재직 + ADMIN 제외)
  const recToday = new Map<string, AttendanceDTO>();
  for (const a of attendance) if (a.date === todayStr) recToday.set(a.employeeId, a);
  const team = employees
    .filter((e) => e.status === "ACTIVE" && e.role !== "ADMIN")
    .map((e) => {
      const rec = recToday.get(e.id);
      const st: AttStatus = rec?.checkOut ? "out" : rec?.checkIn ? "in" : "before";
      return { e, rec, st };
    })
    .sort((a, b) => ATT_ORDER[a.st] - ATT_ORDER[b.st] || a.e.name.localeCompare(b.e.name));

  const activeCount = team.length;
  const todayIn = team.filter((t) => t.st !== "before").length;
  const monthDays = attendance.length;

  // 휴가 — 대기 먼저
  const leaveRows = [...leaves].sort((a, b) => {
    const ap = a.status === "PENDING" ? 0 : 1;
    const bp = b.status === "PENDING" ? 0 : 1;
    return ap - bp || (a.startDate < b.startDate ? 1 : -1);
  });
  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
  const processedCount = leaves.length - pendingCount;

  const approveOne = async (id: string) => {
    try {
      await approveLeave(id);
      show("휴가를 승인했습니다");
      load();
    } catch {
      show("처리에 실패했어요", "cancel");
    }
  };
  const doReject = async () => {
    const id = rejectId;
    const reason = rejectReason.trim();
    if (!id || !reason) return; // 반려는 사유 필수
    try {
      await rejectLeave(id, reason);
      show("휴가를 반려했습니다", "cancel");
      setRejectId(null);
      setRejectReason("");
      load();
    } catch {
      show("처리에 실패했어요", "cancel");
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      <div>
        <h1 className="text-xl font-bold">근태 · 월차</h1>
        <p className="mt-0.5 text-xs text-fg-muted">팀 근태 현황과 휴가 승인</p>
      </div>

      {/* 월 선택 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          aria-label="새로고침"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/10 bg-surface text-fg-muted"
        >
          <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </button>
        <button type="button" className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
          <CalendarIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <span className="flex-1 text-left text-sm font-bold">{monthLabel}</span>
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        </button>
      </div>

      {/* 요약 카드 */}
      {today && (
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="오늘 출근" value={`${todayIn}/${activeCount}명`} Icon={SunIcon} tint="bg-blue-500/15 text-blue-400" />
          <StatCard label="재직 인원" value={`${activeCount}명`} Icon={UsersIcon} tint="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="승인 대기" value={`${pendingCount}건`} Icon={ClockIcon} tint="bg-amber-500/15 text-amber-400" />
          <StatCard label="이번 달 출근" value={`${monthDays}일`} Icon={CalendarIcon} tint="bg-violet-500/15 text-violet-400" />
        </div>
      )}

      {/* 오늘 팀 출근 현황 */}
      {today && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="px-4 pb-2 pt-4">
            <p className="text-base font-bold">오늘 출근 현황</p>
            <p className="mt-0.5 text-xs text-fg-muted">
              출근 <span className="font-bold text-emerald-300">{todayIn}</span> · 미출근{" "}
              <span className="font-bold text-fg">{activeCount - todayIn}</span>
            </p>
          </div>
          {team.length === 0 ? (
            <p className="px-4 pb-6 pt-2 text-sm text-fg-muted">등록된 팀원이 없어요.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {team.map(({ e, rec, st }) => {
                const meta = ATT_META[st];
                return (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: e.avatarColor || avatarColor(e.name) }}>
                      {e.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{e.name}</span>
                      <span className="block text-xs text-fg-muted">{RANK_KO[e.rank] ?? e.rank}</span>
                    </span>
                    {rec?.checkIn && (
                      <span className="text-xs text-fg-muted tabular-nums">
                        {ampm(minOf(rec.checkIn))}
                        {rec.checkOut && ` – ${ampm(minOf(rec.checkOut))}`}
                      </span>
                    )}
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${meta.cls}`}>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 휴가 승인 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <p className="text-base font-bold">휴가 승인</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          대기 <span className="font-bold text-fg">{pendingCount}</span> · 처리됨 <span className="font-bold text-fg">{processedCount}</span>
        </p>
        <div className="mt-3 space-y-2">
          {leaveRows.length === 0 ? (
            <p className="py-2 text-sm text-fg-muted">신청된 휴가가 없어요.</p>
          ) : (
            leaveRows.map((l) => {
              const name = nameOf(l.employeeId);
              const typeKo = CODE_TO_KO[l.type];
              const statusKo = STATUS_TO_KO[l.status];
              const range = `${l.startDate}${l.endDate !== l.startDate ? ` ~ ${l.endDate}` : ""} (${daysStr(l.days)})`;
              return (
                <div key={l.id} className="rounded-xl border border-white/10 bg-surface-2/40 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white" style={{ backgroundColor: avatarColor(name) }}>
                        {name.charAt(0)}
                      </span>
                      <span className="truncate text-sm font-bold">{name}</span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
                        <span className={`h-2 w-2 rounded-full ${LEAVE_DOT[typeKo]}`} />
                        {typeKo}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[statusKo]}`}>{statusKo}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-fg-muted tabular-nums">기간 {range}</p>
                  {l.reason?.trim() && <p className="mt-1 text-sm">{l.reason}</p>}
                  {l.status === "REJECTED" && l.rejectReason?.trim() && (
                    <p className="mt-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-2.5 py-1.5 text-[12px] leading-snug text-red-200/90">반려 사유: {l.rejectReason}</p>
                  )}
                  {l.status === "PENDING" && (
                    <div className="mt-2.5 flex gap-2 border-t border-white/5 pt-2.5">
                      <button type="button" onClick={() => setRejectId(l.id)} className="btn-danger flex-1 py-1.5 text-xs">
                        반려
                      </button>
                      <button type="button" onClick={() => approveOne(l.id)} className="btn-primary flex-1 py-1.5 text-xs">
                        승인
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* 반려 사유 입력 모달 (사유 필수) */}
      {rejectId && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setRejectId(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-base font-bold">반려 사유</p>
            <p className="mt-0.5 text-xs text-fg-muted">반려 사유는 신청자에게 전달돼요.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="반려 사유를 입력하세요"
              className="mt-3 w-full resize-none rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
                className="btn-secondary flex-1 py-2.5 text-sm"
              >
                취소
              </button>
              <button type="button" onClick={doReject} disabled={!rejectReason.trim()} className="btn-danger flex-1 py-2.5 text-sm">
                반려
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
