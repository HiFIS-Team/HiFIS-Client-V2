"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { calcDday, fmtDue, STAFF, STATUSES, statusOf, useProjects } from "@/components/projects-store";
import type { Status } from "@/components/projects-store";

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
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16l-6 7v5l-4 2v-7l-6-7Z" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
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

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
const metaLabel = "text-[11px] text-fg-muted";
const metaValue = "text-[13px] font-semibold";


export function Projects() {
  const { show } = useToast();
  const { projects, setProjects, addProject } = useProjects();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [procedure, setProcedure] = useState("");
  const [due, setDue] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [draftProgress, setDraftProgress] = useState(0); // 진행률 임시값 (완료 눌러야 저장)
  const [extendOpen, setExtendOpen] = useState(false);
  const [extendDue, setExtendDue] = useState("");
  const [extendReason, setExtendReason] = useState("");
  const dateRef = useRef<HTMLInputElement>(null);
  const extendDateRef = useRef<HTMLInputElement>(null);

  const detailProject = detailId ? projects.find((p) => p.id === detailId) ?? null : null;

  // 추가 모달 ESC 닫기
  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  // 연장 모달 ESC 닫기
  useEffect(() => {
    if (!extendOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExtendOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [extendOpen]);

  // 상세 패널 ESC 닫기 (연장 모달 열려있으면 그건 위에서 처리)
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !extendOpen) setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, extendOpen]);

  const q = query.trim();
  const filtered = projects.filter(
    (p) =>
      (statusFilter === null || statusOf(p.progress, p.dday) === statusFilter) &&
      (q === "" || p.title.includes(q) || p.assignees.some((a) => a.includes(q))),
  );

  const toggleAssignee = (s: string) =>
    setAssignees((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const openAdd = () => {
    setTitle("");
    setPurpose("");
    setProcedure("");
    setDue("");
    setAssignees([]);
    setAddOpen(true);
  };

  const submitAdd = () => {
    const t = title.trim();
    if (!t || !due) return;
    addProject({
      title: t,
      purpose: purpose.trim() || undefined,
      procedure: procedure.trim() || undefined,
      assignees,
      dueIso: due,
    });
    setAddOpen(false);
    show(`${t} 프로젝트를 추가했습니다`);
  };

  // 담당자가 진행률 저장 (완료 = 변경 사항 저장)
  const saveProgress = (id: string, progress: number) => {
    setProjects((list) => list.map((p) => (p.id === id ? { ...p, progress } : p)));
    show(`진행률 ${progress}% 저장했습니다`);
  };

  // 기한 연장 (사유서 제출)
  const openExtend = () => {
    setExtendDue("");
    setExtendReason("");
    setExtendOpen(true);
  };
  const submitExtend = () => {
    if (!detailProject || !extendDue || !extendReason.trim()) return;
    const id = detailProject.id;
    setProjects((list) =>
      list.map((p) =>
        p.id === id
          ? { ...p, due: fmtDue(extendDue), dday: calcDday(extendDue), extensionReason: extendReason.trim() }
          : p,
      ),
    );
    setExtendOpen(false);
    show("연장 사유서를 제출했습니다");
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
        <p className="text-xs font-semibold text-fg-muted">업무</p>
        <h1 className="text-xl font-bold">프로젝트</h1>
      </div>

      {/* 검색 + 추가 + 필터 */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            className="min-w-0 flex-1 bg-transparent py-1.5 text-[13px] outline-none placeholder:text-fg-muted"
          />
        </div>

        <button
          type="button"
          onClick={openAdd}
          aria-label="프로젝트 추가"
          className="btn-primary grid h-8 w-8 shrink-0 place-items-center"
        >
          <PlusIcon className="h-4 w-4" />
        </button>

        {/* 상태 필터 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-label="상태 필터"
            className={`grid h-8 w-8 place-items-center rounded-lg border transition-colors ${
              statusFilter
                ? "border-primary/50 bg-primary/10 text-primary-bright"
                : "border-white/10 bg-surface text-fg-muted"
            }`}
          >
            <FilterIcon className="h-4 w-4" />
          </button>
          {filterOpen && (
            <>
              <button type="button" aria-label="닫기" onClick={() => setFilterOpen(false)} className="fixed inset-0 z-10" />
              <div className="absolute right-0 top-full z-20 mt-1.5 w-28 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatusFilter((cur) => (cur === s ? null : s));
                      setFilterOpen(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                      statusFilter === s ? "font-semibold text-primary-bright" : "text-fg"
                    }`}
                  >
                    {s}
                    {statusFilter === s && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
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
                        {p.assignees.length ? p.assignees.join(", ") : "미지정"} · 마감 {p.due}
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
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        {!detailProject ? (
          <p className="px-4 py-16 text-center text-sm text-fg-muted">목록에서 프로젝트를 선택해주세요.</p>
        ) : (
          <div className="animate-page-in">
              {/* 헤더 */}
              <div className="flex items-start gap-2 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-bold leading-snug">{detailProject.title}</h2>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge progress={detailProject.progress} dday={detailProject.dday} />
                    {statusOf(detailProject.progress, detailProject.dday) !== "완료" && (
                      <span className={`text-xs font-bold tabular-nums ${ddayStyle(detailProject.dday)}`}>
                        {ddayLabel(detailProject.dday)}
                      </span>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => setDetailId(null)} aria-label="닫기" className="shrink-0 text-fg-muted">
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3.5 border-t border-white/8 px-4 py-3.5">
                {/* 출처 회의록 */}
                {detailProject.fromNote && (
                  <div>
                    <p className={metaLabel}>출처</p>
                    <p className={metaValue}>📝 {detailProject.fromNote} 회의에서 생성</p>
                  </div>
                )}

                {/* 담당자 */}
                <div>
                  <p className={metaLabel}>담당자</p>
                  <p className={metaValue}>
                    {detailProject.assignees.length ? detailProject.assignees.join(", ") : "미지정"}
                  </p>
                </div>

                {/* 마감일 */}
                <div>
                  <p className={metaLabel}>마감일</p>
                  <p className={`${metaValue} tabular-nums`}>{detailProject.due}</p>
                </div>

                {/* 목적 */}
                <div>
                  <p className={metaLabel}>목적</p>
                  <div className="mt-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                      {detailProject.purpose || <span className="text-fg-muted">작성된 목적이 없어요.</span>}
                    </p>
                  </div>
                </div>

                {/* 절차 */}
                <div>
                  <p className={metaLabel}>절차</p>
                  <div className="mt-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed">
                      {detailProject.procedure || <span className="text-fg-muted">작성된 절차가 없어요.</span>}
                    </p>
                  </div>
                </div>

                {/* 연장 사유 */}
                {detailProject.extensionReason && (
                  <div>
                    <p className={metaLabel}>연장 사유</p>
                    <div className="mt-1 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-amber-200/90">
                        {detailProject.extensionReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 진행률 + 완료/연장 */}
              <div className="border-t border-white/10 px-4 py-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-fg-muted">진행률</span>
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
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveProgress(detailProject.id, draftProgress)}
                    disabled={draftProgress === detailProject.progress}
                    className="btn-primary flex-1 py-2.5 text-sm"
                  >
                    완료
                  </button>
                  <button type="button" onClick={openExtend} className="btn-secondary flex-1 py-2.5 text-sm">
                    연장
                  </button>
                </div>
              </div>
          </div>
        )}
      </section>

      {/* ── 새 프로젝트 모달 ───────────────────────── */}
      {addOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/70"
          />
          <div className="animate-page-in relative flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
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
                  담당자 <span className="font-normal text-fg-muted">(여러 명 가능 · {assignees.length}명)</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STAFF.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleAssignee(s)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        assignees.includes(s)
                          ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright"
                          : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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

      {/* ── 기한 연장 사유서 모달 ──────────────────── */}
      {extendOpen && detailProject && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setExtendOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/70"
          />
          <div className="animate-page-in relative flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-lg font-bold">기한 연장</p>
                <p className="text-xs text-fg-muted">현재 마감 {detailProject.due}</p>
              </div>
              <button type="button" onClick={() => setExtendOpen(false)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>새 마감 날짜</p>
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
                  placeholder="기한을 연장하는 사유를 작성하세요."
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
                onClick={submitExtend}
                disabled={!extendDue || !extendReason.trim()}
                className="btn-primary flex-[2] py-2.5 text-sm"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
