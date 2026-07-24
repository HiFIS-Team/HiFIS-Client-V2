"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { ApiError } from "@/lib/api/client";
import {
  createContribution,
  listContributions,
  listEmployees,
  type ContribType,
  type ContributionDTO,
  type EmployeeLite,
} from "@/lib/api/hifis";

/**
 * 센터 기여도 — **백엔드 연동(Phase 3)**.
 *
 * 관리자(ADMIN·MANAGER)가 특정 직원에게 "이런 기여를 했다"고 점수를 부여(투표 아님).
 * - 창의적 아이디어(IDEA) +5 / 자발적 목표 업무(GOAL) +10 / 근무 외 출근(EXTRA_WORK) 시간당 +3
 * - 매출 성과(SALES) = 개인 총매출 ÷ 10 × 2.5 (매출 연동 자동 — 부여 대상 아님)
 * 이 탭은 **로그인 사용자가 받은 기여도**를 보여준다. 부여 UI는 **ADMIN·MANAGER에게만** 노출.
 * ⚠️ 부여자 이름은 직원 명단 권한이 없으면 표시 못 함 → "관리자 부여"로 표기.
 */

const TYPE_META: Record<Exclude<ContribType, "SALES">, { label: string; emoji: string; points: number; perHour: boolean; tint: string }> = {
  IDEA: { label: "창의적 아이디어", emoji: "💡", points: 5, perHour: false, tint: "bg-amber-400/15 text-amber-300" },
  GOAL: { label: "자발적 목표 업무", emoji: "🎯", points: 10, perHour: false, tint: "bg-primary/15 text-primary-bright" },
  EXTRA_WORK: { label: "근무 외 출근", emoji: "⏰", points: 3, perHour: true, tint: "bg-sky-400/15 text-sky-300" },
};
const GRANT_TYPES = Object.keys(TYPE_META) as Array<Exclude<ContribType, "SALES">>;

const pad = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};
const RANK_KO: Record<string, string> = {
  TRAINER: "트레이너",
  FC: "FC",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  DEVELOPER: "개발자",
  CEO: "대표",
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

const labelCls = "mb-1.5 block text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function CenterContribution() {
  const { show } = useToast();
  const { user } = useAuth();
  const meId = user?.id;
  const canGrant = user?.role === "ADMIN" || user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN"; // 대표: '내가 받은' → 지점 전체 부여 내역(감독)
  const nameOf = useEmployeeNames();

  const [grants, setGrants] = useState<ContributionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  // 부여 모달 (관리자)
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<EmployeeLite[]>([]);
  const [gTo, setGTo] = useState<string | null>(null);
  const [gType, setGType] = useState<Exclude<ContribType, "SALES"> | null>(null);
  const [gHours, setGHours] = useState("");
  const [gReason, setGReason] = useState("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!meId) return;
    let alive = true;
    listContributions(isAdmin ? {} : { employeeId: meId })
      .then((rows) => {
        if (alive) setGrants(rows);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [meId, isAdmin]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reload = async () => {
    if (!meId) return;
    try {
      setGrants(await listContributions(isAdmin ? {} : { employeeId: meId }));
    } catch {
      /* 무시 */
    }
  };

  // 받은 기여도 집계
  const sumType = (t: ContribType) => grants.filter((g) => g.type === t).reduce((a, g) => a + g.points, 0);
  const ideaPts = sumType("IDEA");
  const goalPts = sumType("GOAL");
  const extraPts = sumType("EXTRA_WORK");
  const extraHours = grants.filter((g) => g.type === "EXTRA_WORK").reduce((a, g) => a + (g.hours ?? 0), 0);
  const ideaCnt = grants.filter((g) => g.type === "IDEA").length;
  const goalCnt = grants.filter((g) => g.type === "GOAL").length;
  const totalPts = ideaPts + goalPts + extraPts;

  const openGrant = async () => {
    setGTo(null);
    setGType(null);
    setGHours("");
    setGReason("");
    setOpen(true);
    if (staff.length === 0) {
      try {
        setStaff(await listEmployees({ branchId: user?.branchId }));
      } catch {
        /* 무시 */
      }
    }
  };

  const previewPts = gType === "EXTRA_WORK" ? (Number(gHours) || 0) * TYPE_META.EXTRA_WORK.points : gType ? TYPE_META[gType].points : 0;
  const valid = Boolean(gTo && gType && gReason.trim() && (gType !== "EXTRA_WORK" || Number(gHours) > 0));

  const submit = async () => {
    if (!valid || !gTo || !gType || granting) return;
    setGranting(true);
    try {
      const g = await createContribution({
        employeeId: gTo,
        type: gType,
        hours: gType === "EXTRA_WORK" ? Number(gHours) : undefined,
        reason: gReason.trim(),
      });
      const toName = staff.find((s) => s.id === gTo)?.name ?? "직원";
      show(`${toName}님에게 ${TYPE_META[gType].label} +${g.points}점 부여했습니다`);
      setOpen(false);
      if (isAdmin || gTo === meId) await reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) show("부여 권한이 없어요", "cancel");
      else show("부여에 실패했어요", "cancel");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">
          {isAdmin ? (
            "지점 전체 센터 기여도 부여 내역"
          ) : (
            <>
              <span className="font-semibold text-fg">{user?.name ?? "나"}</span>님이 받은 센터 기여도
            </>
          )}
        </p>
        {!canGrant && <span className="shrink-0 text-[11px] text-fg-muted/70">권한이 없습니다</span>}
      </div>

      {/* 요약 */}
      <section className="rounded-2xl border border-white/10 bg-surface p-4">
        <div className="flex items-end justify-between">
          <span className="text-xs text-fg-muted">{isAdmin ? "총 부여 점수" : "총 기여 점수"}</span>
          <span className="text-2xl font-bold text-primary-bright tabular-nums">{totalPts}점</span>
        </div>
        <div className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
          {[
            { emoji: "💡", label: "창의적 아이디어", sub: `${ideaCnt}건 × 5`, pts: ideaPts },
            { emoji: "🎯", label: "자발적 목표 업무", sub: `${goalCnt}건 × 10`, pts: goalPts },
            { emoji: "⏰", label: "근무 외 출근", sub: `${extraHours}시간 × 3`, pts: extraPts },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-sm">
              <span>{r.emoji}</span>
              <span className="flex-1">{r.label}</span>
              <span className="text-xs text-fg-muted tabular-nums">{r.sub}</span>
              <span className="w-12 text-right font-semibold tabular-nums">{r.pts}점</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <span>📈</span>
            <span className="flex-1">매출 성과</span>
            <span className="text-xs text-fg-muted">총매출 ÷ 10 × 2.5</span>
            <span className="w-16 text-right text-xs font-semibold text-fg-muted">연동 예정</span>
          </div>
        </div>
      </section>

      {/* 부여 (ADMIN·MANAGER만) */}
      {canGrant && (
        <button type="button" onClick={openGrant} className="btn-primary flex w-full items-center justify-center gap-1.5 py-3 text-sm">
          <PlusIcon className="h-4 w-4" />
          기여도 부여
        </button>
      )}

      {/* 받은 내역 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">
          {isAdmin ? "부여 내역" : "받은 기여도"} <span className="ml-0.5 text-xs font-semibold text-fg-muted">{grants.length}</span>
        </p>
        {loading ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : grants.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">{isAdmin ? "아직 부여한 기여도가 없어요." : "아직 받은 기여도가 없어요."}</p>
        ) : (
          <div className="divide-y divide-white/5">
            {grants.map((g) => {
              const meta = g.type === "SALES" ? null : TYPE_META[g.type];
              const rowName = isAdmin ? nameOf(g.employeeId) : user?.name ?? "나";
              return (
                <div key={g.id} className="flex gap-3 px-4 py-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: avatarColor(rowName) }}
                  >
                    {rowName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{rowName}</span>
                      {meta && (
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.tint}`}>
                          {meta.emoji} {meta.label}
                          {g.type === "EXTRA_WORK" && g.hours ? ` ${g.hours}h` : ""}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{g.reason}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted/70">{nameOf(g.grantedById, "관리자")} 부여 · {fmtDateTime(g.createdAt)}</p>
                  </div>
                  <span className="shrink-0 self-start text-xs font-bold text-primary-bright tabular-nums">+{g.points}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 기여도 부여 모달 (관리자) ── */}
      {open && (
        <div className="overlay-frame fixed inset-0 z-[80] flex items-center justify-center p-5">
          <button type="button" aria-label="닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/65" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/12 bg-surface">
            {/* 헤더 */}
            <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-lg">⭐</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">기여도 부여</p>
                <p className="text-[11px] text-fg-muted">직원에게 센터 기여 점수를 줍니다</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="닫기" className="grid h-8 w-8 shrink-0 place-items-center text-fg-muted transition hover:text-fg">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {/* 직원 선택 — 아바타 칩 */}
              <div>
                <label className={labelCls}>누구에게</label>
                {staff.length === 0 ? (
                  <p className="text-xs text-fg-muted">직원 목록을 불러오는 중…</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {staff.map((s) => {
                      const on = gTo === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setGTo(s.id)}
                          className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-semibold transition ${
                            on ? "border-primary/50 bg-primary/15 text-primary-bright" : "border-white/10 text-fg"
                          }`}
                        >
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: avatarColor(s.name) }}>
                            {s.name[0]}
                          </span>
                          {s.name}
                          <span className="text-[10px] font-normal text-fg-muted">{RANK_KO[s.rank] ?? s.rank}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 기여 유형 — 컬러 이모지 타일 */}
              <div>
                <label className={labelCls}>기여 유형</label>
                <div className="grid grid-cols-3 gap-2">
                  {GRANT_TYPES.map((k) => {
                    const m = TYPE_META[k];
                    const on = gType === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setGType(k)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 transition ${
                          on ? "border-primary/50 bg-primary/10 ring-1 ring-primary/40" : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <span className={`grid h-10 w-10 place-items-center rounded-full text-xl ${m.tint}`}>{m.emoji}</span>
                        <span className="text-center text-[11px] font-semibold leading-tight">{m.label}</span>
                        <span className="text-[10px] font-semibold text-fg-muted">{m.perHour ? "시간당 +3" : `+${m.points}점`}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {gType === "EXTRA_WORK" && (
                <div>
                  <label className={labelCls}>근무 외 출근 시간</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={gHours}
                      onChange={(e) => setGHours(e.target.value)}
                      placeholder="예) 2"
                      className={`${fieldCls} flex-1`}
                    />
                    <span className="shrink-0 text-sm text-fg-muted">시간</span>
                    <span className="shrink-0 text-sm font-bold text-primary-bright tabular-nums">= {previewPts}점</span>
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>어떤 기여인지</label>
                <textarea
                  value={gReason}
                  onChange={(e) => setGReason(e.target.value)}
                  rows={3}
                  placeholder="예) 신규 회원 리텐션 이벤트 아이디어 제안"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* 미리보기 */}
              {gTo && gType && (
                <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-[13px]">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm ${TYPE_META[gType].tint}`}>{TYPE_META[gType].emoji}</span>
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="font-bold">{staff.find((s) => s.id === gTo)?.name}</span>님에게 {TYPE_META[gType].label}
                  </span>
                  <span className="shrink-0 font-bold text-primary-bright tabular-nums">+{previewPts}점</span>
                </div>
              )}
            </div>

            <div className="kb-safe flex shrink-0 gap-2 border-t border-white/10 p-4">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submit} disabled={!valid || granting} className="btn-primary flex-[1.4] py-2.5 text-sm">
                {granting ? "부여 중…" : gType && gTo ? `+${previewPts}점 부여` : "부여"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
