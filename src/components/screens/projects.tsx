"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { useNavTargetFor } from "@/hooks/nav-target";
import { fmtDue, STATUSES, statusOf, useProjects } from "@/providers/projects-store";
import type { Status } from "@/providers/projects-store";
import {
  approveProjectRequest,
  awardProject,
  createProjectRequest,
  listEmployees,
  listProjectAwards,
  listProjectRequests,
  rejectProjectRequest,
} from "@/lib/api/hifis";
import type { EmployeeLite, ProjectAwardDTO, ProjectRequestDTO, ProjectRequestType } from "@/lib/api/hifis";

const STATUS_STYLE: Record<Status, string> = {
  대기: "bg-white/8 text-fg-muted",
  진행중: "bg-sky-400/12 text-sky-300",
  완료: "bg-emerald-400/12 text-emerald-300",
  누락: "bg-red-500/12 text-red-400",
};

// D-day 색상 (마감 임박도) — 헤더 티커와 동일 규칙
function ddayStyle(n: number) {
  if (n <= 3) return "text-red-400";
  if (n <= 7) return "text-amber-300";
  return "text-fg-muted";
}
function ddayLabel(n: number) {
  if (n === 0) return "D-DAY";
  if (n < 0) return `D+${-n}`;
  return `D-${n}`;
}

// 상태 뱃지 — 진행중이면 진행률(%) 표시, 그 외엔 상태 글자
function StatusBadge({ progress, dday, className = "" }: { progress: number; dday: number; className?: string }) {
  const s = statusOf(progress, dday);
  const text = s === "진행중" ? `${progress}%` : s;
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[s]} ${className}`}>
      {text}
    </span>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.4 2.4L15.5 9.5" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5.5" width="16" height="15" rx="2" />
      <path d="M4 9.5h16" />
      <path d="M8 3.5v4M16 3.5v4" />
    </svg>
  );
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

const AV = ["#9d3bfc", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
const metaLabel = "text-[11px] text-fg-muted";
const metaValue = "text-[13px] font-semibold";


export function Projects() {
  const { show } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const meId = user?.id;
  const { projects, addProject, patchProject, reloadProjects } = useProjects();
  const [roster, setRoster] = useState<EmployeeLite[]>([]);
  const [requests, setRequests] = useState<ProjectRequestDTO[]>([]);
  const nav = useNavTargetFor("/projects"); // 헤더 검색에서 넘어온 항목
  const [query, setQuery] = useState(nav?.q ?? "");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [procedure, setProcedure] = useState("");
  const [due, setDue] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(nav?.id ?? null);
  const [draftProgress, setDraftProgress] = useState(0); // 진행률 임시값 (완료 눌러야 저장)
  const [extendOpen, setExtendOpen] = useState(false);
  const [reqType, setReqType] = useState<ProjectRequestType>("EXTENSION");
  const [extendDue, setExtendDue] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const [rejectReqId, setRejectReqId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState("");
  const [awards, setAwards] = useState<ProjectAwardDTO[]>([]);
  const [awardEmp, setAwardEmp] = useState<string | null>(null); // 평가 중인 담당자 id
  const [awardPoints, setAwardPoints] = useState(10);
  const [awardComment, setAwardComment] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const extendDateRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLElement>(null);

  const detailProject = detailId ? projects.find((p) => p.id === detailId) ?? null : null;

  // 추가 모달 ESC 닫기
  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  // 요청 모달 ESC 닫기
  useEffect(() => {
    if (!extendOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExtendOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [extendOpen]);

  // 반려 사유 모달 ESC 닫기
  useEffect(() => {
    if (!rejectReqId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRejectReqId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rejectReqId]);

  // 평가 모달 ESC 닫기
  useEffect(() => {
    if (!awardEmp) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAwardEmp(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [awardEmp]);

  // 상세 패널 ESC 닫기 (모달 열려있으면 그건 위에서 처리)
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !extendOpen && !rejectReqId && !awardEmp) setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, extendOpen, rejectReqId, awardEmp]);

  // 지점 로스터 (담당자 피커 + assigneeId → 이름 표시) + 기한 변경 요청
  useEffect(() => {
    let alive = true;
    Promise.all([listEmployees(), listProjectRequests()])
      .then(([emps, reqs]) => {
        if (!alive) return;
        setRoster(emps);
        setRequests(reqs);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 완료 프로젝트 평가 — 상세 열릴 때 어드민만 로드 (awardOf는 projectId로 매칭해 stale 방지)
  useEffect(() => {
    if (!detailId || !isAdmin) return;
    let alive = true;
    listProjectAwards(detailId)
      .then((rows) => {
        if (alive) setAwards(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [detailId, isAdmin]);

  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? "직원";
  const reloadRequests = async () => {
    try {
      setRequests(await listProjectRequests());
    } catch {
      /* 무시 */
    }
  };
  const reloadAwards = async () => {
    if (!detailId) return;
    try {
      setAwards(await listProjectAwards(detailId));
    } catch {
      /* 무시 */
    }
  };
  const awardOf = (empId: string) => awards.find((a) => a.employeeId === empId && a.projectId === detailId);
  // 프로젝트별 최신 요청 (목록은 createdAt desc)
  const reqOf = (pid: string) => requests.find((r) => r.projectId === pid);
  const pendingList = requests.filter((r) => r.status === "PENDING");
  const curReq = detailProject ? reqOf(detailProject.id) : undefined;
  const pendingReq = curReq?.status === "PENDING" ? curReq : undefined;
  const rejectedReq = curReq?.status === "REJECTED" ? curReq : undefined;
  const detailOverdue = detailProject ? statusOf(detailProject.progress, detailProject.dday) === "누락" : false;
  const detailDone = detailProject ? statusOf(detailProject.progress, detailProject.dday) === "완료" : false;
  // 진행률 조절은 담당자(assignee)만. 요청 제출은 비어드민 전체, 승인/반려는 어드민.
  const isAssignee = !!(detailProject && meId && detailProject.assigneeIds.includes(meId));
  const showAdminDecide = isAdmin && !!pendingReq;
  const showMemberAction = !isAdmin && (!!pendingReq || !detailDone);
  const showFooter = isAssignee || showAdminDecide || showMemberAction;

  const q = query.trim();


  // 목록에서 선택하면 밑에 펼쳐지는 상세로 자동 스크롤
  useEffect(() => {
    if (!detailId) return;
    const t = setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [detailId]);
  // 요약 (회의록 상단과 같은 형식)
  const ongoing = projects.filter((p) => statusOf(p.progress, p.dday) === "진행중").length;
  const doneCount = projects.filter((p) => statusOf(p.progress, p.dday) === "완료").length;
  const missing = projects.filter((p) => statusOf(p.progress, p.dday) === "누락").length;

  const filtered = projects.filter(
    (p) =>
      (statusFilter === null || statusOf(p.progress, p.dday) === statusFilter) &&
      (q === "" || p.title.includes(q) || p.assigneeIds.some((id) => nameOf(id).includes(q))),
  );

  const toggleAssignee = (id: string) =>
    setAssigneeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const openAdd = () => {
    setTitle("");
    setPurpose("");
    setProcedure("");
    setDue("");
    setAssigneeIds([]);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const t = title.trim();
    if (!t || !due) return;
    try {
      await addProject({
        title: t,
        purpose: purpose.trim() || undefined,
        steps: procedure.trim() || undefined,
        assigneeIds,
        dueIso: due,
      });
      setAddOpen(false);
      show(`${t} 프로젝트를 추가했습니다`);
    } catch {
      show("프로젝트 추가에 실패했어요", "cancel");
    }
  };

  // 담당자가 진행률 저장 (완료 = 변경 사항 저장)
  const saveProgress = async (id: string, progress: number) => {
    try {
      await patchProject(id, { progress });
      show(`진행률 ${progress}% 저장했습니다`);
    } catch {
      show("진행률 저장에 실패했어요", "cancel");
    }
  };

  // 기한 변경 요청 (연장/누락 사유) 제출 → 어드민 승인
  const openRequest = (type: ProjectRequestType) => {
    setReqType(type);
    setExtendDue("");
    setExtendReason("");
    setExtendOpen(true);
  };
  const submitRequest = async () => {
    if (!detailProject || !extendDue || !extendReason.trim()) return;
    try {
      await createProjectRequest(detailProject.id, { type: reqType, newDue: extendDue, reason: extendReason.trim() });
      setExtendOpen(false);
      await reloadRequests();
      show(reqType === "OVERDUE" ? "누락 사유를 제출했습니다" : "연장 요청을 제출했습니다");
    } catch {
      show("제출에 실패했어요", "cancel");
    }
  };

  // 어드민 승인/반려
  const approveReq = async (id: string) => {
    try {
      await approveProjectRequest(id);
      await Promise.all([reloadRequests(), reloadProjects()]);
      show("요청을 승인했습니다");
    } catch {
      show("승인에 실패했어요", "cancel");
    }
  };
  const submitReject = async () => {
    if (!rejectReqId || !rejectText.trim()) return;
    try {
      await rejectProjectRequest(rejectReqId, rejectText.trim());
      setRejectReqId(null);
      setRejectText("");
      await reloadRequests();
      show("요청을 반려했습니다", "cancel");
    } catch {
      show("반려에 실패했어요", "cancel");
    }
  };

  // 완료 프로젝트 평가 (어드민) — 담당자에게 점수(-100~+100) + 코멘트
  const openAward = (empId: string) => {
    const cur = awardOf(empId);
    setAwardEmp(empId);
    setAwardPoints(cur?.points ?? 10);
    setAwardComment(cur?.comment ?? "");
  };
  const submitAward = async () => {
    if (!detailProject || !awardEmp || !awardComment.trim()) return;
    try {
      await awardProject(detailProject.id, { employeeId: awardEmp, points: awardPoints, comment: awardComment.trim() });
      const nm = nameOf(awardEmp);
      setAwardEmp(null);
      await reloadAwards();
      show(`${nm}님 평가 저장 (${awardPoints > 0 ? "+" : ""}${awardPoints}점)`);
    } catch {
      show("평가 저장에 실패했어요", "cancel");
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 (위에 혼자) */}
      <h1 className="text-xl font-bold">프로젝트</h1>

      {/* 요약(왼쪽) + 새 프로젝트(오른쪽) 한 줄 — 검색 바로 위, 요약을 버튼 밑선에 맞춤 */}
      <div className="flex items-end justify-between gap-2">
        <p className="text-[13px] text-fg-muted">
          <b className="text-fg">전체 {projects.length}</b> · 진행중 {ongoing} · 완료 {doneCount}
          {missing > 0 && <span className="text-red-400"> · 누락 {missing}</span>}
        </p>
        <button type="button" onClick={openAdd} className="btn-primary flex shrink-0 items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />새 프로젝트
        </button>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="프로젝트·담당자로 검색"
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-fg-muted"
        />
        {query.trim() !== "" && (
          <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="shrink-0 text-fg-muted">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 상태 필터 + 개수 */}
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {([null, ...STATUSES] as const).map((s) => {
            const on = statusFilter === s;
            return (
              <button
                key={s ?? "all"}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  on ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                }`}
              >
                {s ?? "전체"}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-xs text-fg-muted">{filtered.length}개</span>
      </div>

      {/* 목록 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
          <h2 className="text-sm font-bold">프로젝트 목록</h2>
          <span className="text-xs text-fg-muted">{filtered.length}건</span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 pb-10 pt-4 text-center text-sm text-fg-muted">해당하는 프로젝트가 없어요.</p>
        ) : (
          <div className="divide-y divide-white/8 border-t border-white/8">
            {filtered.map((p) => {
              const on = p.id === detailId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (on) {
                      setDetailId(null);
                      return;
                    }
                    setDraftProgress(p.progress);
                    setDetailId(p.id);
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                    on ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold ${on ? "text-primary-bright" : ""}`}>{p.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge progress={p.progress} dday={p.dday} className="shrink-0" />
                      <span className="truncate text-[11px] text-fg-muted">
                        {p.assigneeIds.length ? p.assigneeIds.map(nameOf).join(", ") : "미지정"} · 마감 {p.due}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {statusOf(p.progress, p.dday) === "완료" ? (
                      <CheckCircleIcon className="h-5 w-5 text-emerald-300" />
                    ) : (
                      <span className={`text-xs font-bold tabular-nums ${ddayStyle(p.dday)}`}>{ddayLabel(p.dday)}</span>
                    )}
                    {on ? (
                      <ChevronDownIcon className="h-4 w-4 text-primary-bright" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-fg-muted" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 상세 (목록 밑에 펼쳐짐) ────────────────── */}
      <section ref={detailRef} className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        {!detailProject ? (
          <p className="px-4 py-16 text-center text-sm text-fg-muted">목록에서 프로젝트를 선택해주세요.</p>
        ) : (
          <div className="animate-page-in">
              {/* 헤더 — 제목 + 큰 D-day + 진행률 바 */}
              <div className="px-4 pb-3.5 pt-3.5">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold leading-snug">{detailProject.title}</h2>
                    <div className="mt-1.5 flex items-center gap-2">
                      <StatusBadge progress={detailProject.progress} dday={detailProject.dday} />
                    </div>
                  </div>

                  {/* D-day 크게 */}
                  {statusOf(detailProject.progress, detailProject.dday) === "완료" ? (
                    <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-emerald-300">
                      <CheckCircleIcon className="h-5 w-5" />완료
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 text-2xl font-extrabold leading-none tabular-nums ${ddayStyle(detailProject.dday)} ${
                        detailProject.dday <= 3 ? "drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" : ""
                      }`}
                    >
                      {ddayLabel(detailProject.dday)}
                    </span>
                  )}

                  <button type="button" onClick={() => setDetailId(null)} aria-label="닫기" className="shrink-0 text-fg-muted">
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* 진행률 바 */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${detailProject.progress}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] font-bold tabular-nums text-primary-bright">
                    {detailProject.progress}%
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 border-t border-white/8 px-4 py-3.5">
                {/* 담당자 · 마감일 */}
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className={metaLabel}>담당자</p>
                    {detailProject.assigneeIds.length === 0 ? (
                      <p className={`${metaValue} text-fg-muted`}>미지정</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {detailProject.assigneeIds.map((id) => {
                          const nm = nameOf(id);
                          return (
                            <span
                              key={id}
                              className="flex items-center gap-1.5 rounded-full bg-white/6 py-0.5 pl-0.5 pr-2.5 text-[13px] font-semibold"
                            >
                              <span
                                className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: avatarColor(nm) }}
                              >
                                {nm.charAt(0)}
                              </span>
                              {nm}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className={metaLabel}>마감일</p>
                    <p className={`${metaValue} tabular-nums`}>{detailProject.due}</p>
                    <p className={`text-[11px] tabular-nums ${ddayStyle(detailProject.dday)}`}>
                      {detailProject.dday === 0 ? "오늘까지" : detailProject.dday > 0 ? `${detailProject.dday}일 남음` : `${-detailProject.dday}일 지남`}
                    </p>
                  </div>
                </div>

                {/* 목적 */}
                <div>
                  <p className={metaLabel}>🎯 목적</p>
                  <div className="mt-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                      {detailProject.purpose || <span className="text-fg-muted">작성된 목적이 없어요.</span>}
                    </p>
                  </div>
                </div>

                {/* 절차 */}
                <div>
                  <p className={metaLabel}>📋 절차</p>
                  {(() => {
                    const steps = (detailProject.steps ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
                    if (steps.length === 0) {
                      return (
                        <div className="mt-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                          <p className="text-[13px] text-fg-muted">작성된 절차가 없어요.</p>
                        </div>
                      );
                    }
                    return (
                      <ol className="mt-1 space-y-1.5">
                        {steps.map((st, i) => (
                          <li key={i} className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                            <span className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary-bright">
                              {i + 1}
                            </span>
                            <span className="min-w-0 flex-1 text-[13px] leading-relaxed">{st}</span>
                          </li>
                        ))}
                      </ol>
                    );
                  })()}
                </div>

                {/* 승인 대기 중인 기한 요청 */}
                {pendingReq && (
                  <div>
                    <p className={metaLabel}>⏳ {pendingReq.type === "OVERDUE" ? "누락 사유" : "기한 연장"} 요청 (승인 대기)</p>
                    <div className="mt-1 space-y-1.5 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-2.5">
                      <p className="text-[11px] text-fg-muted">
                        새 마감 <b className="text-amber-200">{fmtDue(pendingReq.newDue.slice(0, 10))}</b> · {nameOf(pendingReq.requestedById)} 요청
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-amber-100/90">{pendingReq.reason}</p>
                    </div>
                  </div>
                )}

                {/* 반려된 요청 */}
                {rejectedReq && (
                  <div>
                    <p className={metaLabel}>⛔ {rejectedReq.type === "OVERDUE" ? "누락 사유" : "기한 연장"} 반려됨</p>
                    <div className="mt-1 rounded-lg border border-red-500/25 bg-red-500/5 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-red-200/90">{rejectedReq.rejectReason || "사유 없음"}</p>
                    </div>
                  </div>
                )}

                {/* 연장 사유 (승인 반영됨) */}
                {detailProject.extensionReason && !pendingReq && !rejectedReq && (
                  <div>
                    <p className={metaLabel}>⚠️ 연장 사유</p>
                    <div className="mt-1 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-amber-200/90">
                        {detailProject.extensionReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* 프로젝트 평가 — 어드민 · 완료 프로젝트만 */}
                {isAdmin && detailDone && (
                  <div>
                    <p className={metaLabel}>🏆 프로젝트 평가</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">완료 기본 10점 · 대표 평가로 -100 ~ +100 조정</p>
                    {detailProject.assigneeIds.length === 0 ? (
                      <div className="mt-1.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                        <p className="text-[13px] text-fg-muted">담당자가 없어 평가할 대상이 없어요.</p>
                      </div>
                    ) : (
                      <div className="mt-1.5 space-y-1.5">
                        {detailProject.assigneeIds.map((id) => {
                          const nm = nameOf(id);
                          const a = awardOf(id);
                          return (
                            <div key={id} className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-2 px-3 py-2">
                              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: avatarColor(nm) }}>
                                {nm.charAt(0)}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{nm}</span>
                              {a ? (
                                <span className={`shrink-0 text-sm font-bold tabular-nums ${a.points > 0 ? "text-emerald-300" : a.points < 0 ? "text-red-400" : "text-fg-muted"}`}>
                                  {a.points > 0 ? "+" : ""}
                                  {a.points}점
                                </span>
                              ) : (
                                <span className="shrink-0 text-[11px] text-fg-muted">미평가</span>
                              )}
                              <button
                                type="button"
                                onClick={() => openAward(id)}
                                className="shrink-0 rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-semibold text-primary-bright"
                              >
                                {a ? "점수 조정" : "평가"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 진행률 조절(담당자만) + 기한 요청/승인 */}
              {showFooter && (
                <div className="border-t border-white/10 px-4 py-3">
                  {/* 진행률 조절 — 담당자만 */}
                  {isAssignee && (
                    <>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-fg-muted">진행률 조절</span>
                        <span className="text-[11px] font-bold tabular-nums text-primary-bright">{draftProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={draftProgress}
                        onChange={(e) => setDraftProgress(Number(e.target.value))}
                        className="w-full [accent-color:var(--color-primary)]"
                      />
                      <button
                        type="button"
                        onClick={() => saveProgress(detailProject.id, draftProgress)}
                        disabled={draftProgress === detailProject.progress}
                        className="btn-primary mt-3 w-full py-2.5 text-sm"
                      >
                        완료
                      </button>
                    </>
                  )}

                  {/* 어드민: 승인/반려 (대기 요청 있을 때) */}
                  {showAdminDecide && pendingReq && (
                    <div className={`flex gap-2 ${isAssignee ? "mt-2" : ""}`}>
                      <button type="button" onClick={() => { setRejectText(""); setRejectReqId(pendingReq.id); }} className="btn-danger flex-1 py-2.5 text-sm">
                        반려
                      </button>
                      <button type="button" onClick={() => approveReq(pendingReq.id)} className="btn-primary flex-1 py-2.5 text-sm">
                        승인
                      </button>
                    </div>
                  )}

                  {/* 비어드민: 요청 제출 / 대기 중 */}
                  {showMemberAction && (
                    pendingReq ? (
                      <button type="button" disabled className={`btn-secondary w-full py-2.5 text-sm opacity-60 ${isAssignee ? "mt-2" : ""}`}>
                        기한 요청 승인 대기 중
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openRequest(detailOverdue ? "OVERDUE" : "EXTENSION")}
                        className={`btn-secondary w-full py-2.5 text-sm ${isAssignee ? "mt-2" : ""}`}
                      >
                        {detailOverdue ? "누락 사유 제출" : "기한 연장 요청"}
                      </button>
                    )
                  )}
                </div>
              )}
          </div>
        )}
      </section>

      {/* ── 승인 대기 신청 (프로젝트 미선택 시) ──────── */}
      {!detailProject && pendingList.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="flex items-baseline justify-between px-4 pb-2.5 pt-3.5">
            <h2 className="text-sm font-bold">{isAdmin ? "승인 대기 신청" : "기한 요청 현황"}</h2>
            <span className="text-xs text-fg-muted">{pendingList.length}건</span>
          </div>
          <div className="divide-y divide-white/8 border-t border-white/8">
            {pendingList.map((r) => {
              const proj = projects.find((p) => p.id === r.projectId);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    if (!proj) return;
                    setDraftProgress(proj.progress);
                    setDetailId(proj.id);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                        {r.type === "OVERDUE" ? "누락 사유" : "기한 연장"}
                      </span>
                      <p className="truncate text-sm font-bold">{proj?.title ?? "프로젝트"}</p>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-fg-muted">
                      {nameOf(r.requestedById)} · 새 마감 {fmtDue(r.newDue.slice(0, 10))} · {r.reason}
                    </p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 새 프로젝트 모달 ───────────────────────── */}
      {addOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/70"
          />
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">새 프로젝트</p>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              {/* 1. 제목 */}
              <div>
                <p className={labelCls}>프로젝트 제목</p>
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예) 3층 시설 점검"
                  className={fieldCls}
                />
              </div>

              {/* 2. 목적 */}
              <div>
                <p className={labelCls}>목적</p>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="이 프로젝트를 왜 하나요?"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* 3. 절차 */}
              <div>
                <p className={labelCls}>절차</p>
                <textarea
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  rows={4}
                  placeholder="어떤 순서로 진행하나요?"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* 4. 마감 날짜 */}
              <div>
                <p className={labelCls}>마감 날짜</p>
                <div className="relative">
                  <input
                    ref={dateRef}
                    type="date"
                    value={due}
                    onChange={(e) => setDue(e.target.value)}
                    className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  />
                  <button
                    type="button"
                    onClick={() => dateRef.current?.showPicker?.()}
                    aria-label="달력 열기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 5. 담당자 */}
              <div>
                <p className={labelCls}>
                  담당자 <span className="font-normal text-fg-muted">(여러 명 가능 · {assigneeIds.length}명)</span>
                </p>
                {roster.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">직원 명단을 불러오는 중…</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {roster.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleAssignee(s.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          assigneeIds.includes(s.id)
                            ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright"
                            : "border-white/10 text-fg-muted"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={submitAdd}
                disabled={!title.trim() || !due}
                className="btn-primary flex-[2] py-2.5 text-sm"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 기한 요청 모달 (연장/누락 사유) ──────────── */}
      {extendOpen && detailProject && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setExtendOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/70"
          />
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-lg font-bold">{reqType === "OVERDUE" ? "누락 사유 제출" : "기한 연장 요청"}</p>
                <p className="text-xs text-fg-muted">현재 마감 {detailProject.due} · 어드민 승인 필요</p>
              </div>
              <button type="button" onClick={() => setExtendOpen(false)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>{reqType === "OVERDUE" ? "언제까지 끝낼지 (새 마감)" : "새 마감 날짜"}</p>
                <div className="relative">
                  <input
                    ref={extendDateRef}
                    type="date"
                    value={extendDue}
                    onChange={(e) => setExtendDue(e.target.value)}
                    className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  />
                  <button
                    type="button"
                    onClick={() => extendDateRef.current?.showPicker?.()}
                    aria-label="달력 열기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <p className={labelCls}>사유서</p>
                <textarea
                  autoFocus
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  rows={5}
                  placeholder={reqType === "OVERDUE" ? "왜 누락됐는지, 어떻게 마무리할지 작성하세요." : "기한을 연장하려는 사유를 작성하세요."}
                  className={`${fieldCls} resize-none`}
                />
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setExtendOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={submitRequest}
                disabled={!extendDue || !extendReason.trim()}
                className="btn-primary flex-[2] py-2.5 text-sm"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 반려 사유 모달 (어드민) ─────────────────── */}
      {rejectReqId && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setRejectReqId(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-base font-bold">요청 반려</p>
            <p className="mt-0.5 text-xs text-fg-muted">반려 사유를 남기면 신청자에게 전달돼요.</p>
            <textarea
              autoFocus
              value={rejectText}
              onChange={(e) => setRejectText(e.target.value)}
              rows={4}
              placeholder="반려 사유를 작성하세요."
              className={`${fieldCls} mt-3 resize-none`}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectReqId(null)} className="btn-secondary px-3.5 py-2 text-sm">
                취소
              </button>
              <button type="button" onClick={submitReject} disabled={!rejectText.trim()} className="btn-danger px-3.5 py-2 text-sm">
                반려
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 프로젝트 평가 모달 (어드민) ─────────────── */}
      {awardEmp && detailProject && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setAwardEmp(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-base font-bold">프로젝트 평가</p>
            <p className="mt-0.5 text-xs text-fg-muted">{nameOf(awardEmp)} · {detailProject.title}</p>

            {/* 점수 (-100 ~ +100) */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-fg-muted">점수</span>
              <span className={`text-2xl font-extrabold tabular-nums ${awardPoints > 0 ? "text-emerald-300" : awardPoints < 0 ? "text-red-400" : "text-fg-muted"}`}>
                {awardPoints > 0 ? "+" : ""}
                {awardPoints}
              </span>
            </div>
            <input
              type="range"
              min={-100}
              max={100}
              step={5}
              value={awardPoints}
              onChange={(e) => setAwardPoints(Number(e.target.value))}
              className="mt-1 w-full [accent-color:var(--color-primary)]"
            />
            <div className="flex justify-between text-[10px] text-fg-muted">
              <span>-100</span>
              <span>기본 10</span>
              <span>+100</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {[-100, -50, 10, 50, 100].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAwardPoints(v)}
                  className={`flex-1 rounded-lg border py-1 text-[11px] font-semibold tabular-nums ${
                    awardPoints === v ? "border-primary/50 bg-primary/12 text-primary-bright" : "border-white/10 text-fg-muted"
                  }`}
                >
                  {v > 0 ? "+" : ""}
                  {v}
                </button>
              ))}
            </div>

            <textarea
              autoFocus
              value={awardComment}
              onChange={(e) => setAwardComment(e.target.value)}
              rows={3}
              placeholder="평가 사유 (예: 난도 높은 프로젝트를 기한 내 완수)"
              className={`${fieldCls} mt-3 resize-none`}
            />

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAwardEmp(null)} className="btn-secondary px-3.5 py-2 text-sm">
                취소
              </button>
              <button type="button" onClick={submitAward} disabled={!awardComment.trim()} className="btn-primary px-3.5 py-2 text-sm">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
