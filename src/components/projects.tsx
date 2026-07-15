"use client";

import { useEffect, useRef, useState } from "react";

type Status = "대기" | "진행중" | "완료";
type Project = {
  id: string;
  title: string;
  purpose?: string;
  procedure?: string;
  assignees: string[]; // 담당자 여러 명 가능
  due: string; // 표시용 "7/22"
  dday: number; // 마감까지 남은 일수 (완료는 미표시)
  progress: number; // 0-100 (상태는 여기서 도출)
};

const STAFF = ["은후", "지민", "현우", "서연", "민준"]; // 목: 이 지점 직원
const STATUSES: Status[] = ["대기", "진행중", "완료"];

// 진행률 → 상태 (대기 0 / 진행중 1~99 / 완료 100)
function statusOf(progress: number): Status {
  if (progress <= 0) return "대기";
  if (progress >= 100) return "완료";
  return "진행중";
}

// 목 프로젝트 (헤더 마퀴 항목과 동일 세트)
const SEED: Project[] = [
  { id: "p1", title: "3층 시설 점검", assignees: ["현우", "지민"], due: "7/18", dday: 3, progress: 60 },
  { id: "p2", title: "여름 회원 이벤트 준비", assignees: ["민준"], due: "7/22", dday: 7, progress: 30 },
  { id: "p3", title: "신규 트레이너 온보딩", assignees: ["서연"], due: "7/27", dday: 12, progress: 0 },
  { id: "p4", title: "PT룸 장비 교체", assignees: ["지민", "은후"], due: "8/4", dday: 20, progress: 0 },
  { id: "p5", title: "회원 관리 시스템 교육", assignees: ["은후"], due: "7/10", dday: 0, progress: 100 },
];

const STATUS_STYLE: Record<Status, string> = {
  대기: "bg-white/8 text-fg-muted",
  진행중: "bg-sky-400/12 text-sky-300",
  완료: "bg-emerald-400/12 text-emerald-300",
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

// 상태 뱃지 — 진행중이면 "진행중" 대신 진행률(%) 표시
function StatusBadge({ progress, className = "" }: { progress: number; className?: string }) {
  const s = statusOf(progress);
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
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
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

function calcDday(iso: string) {
  const due = new Date(`${iso}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}
function fmtDue(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>(SEED);
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
  const idRef = useRef(0);
  const dateRef = useRef<HTMLInputElement>(null);

  const detailProject = detailId ? projects.find((p) => p.id === detailId) ?? null : null;

  // 추가 모달 ESC 닫기
  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  // 상세 패널 ESC 닫기
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetailId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  const q = query.trim();
  const filtered = projects.filter(
    (p) =>
      (statusFilter === null || statusOf(p.progress) === statusFilter) &&
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
    idRef.current += 1;
    setProjects((list) => [
      {
        id: `new-${idRef.current}`,
        title: t,
        purpose: purpose.trim() || undefined,
        procedure: procedure.trim() || undefined,
        assignees,
        due: fmtDue(due),
        dday: calcDday(due),
        progress: 0,
      },
      ...list,
    ]);
    setAddOpen(false);
  };

  // 담당자가 진행률 수정
  const updateProgress = (id: string, progress: number) =>
    setProjects((list) => list.map((p) => (p.id === id ? { ...p, progress } : p)));

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 검색 + 추가 + 필터 */}
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-fg-muted"
          />
        </div>

        <button
          type="button"
          onClick={openAdd}
          aria-label="프로젝트 추가"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-white"
        >
          <PlusIcon className="h-5 w-5" />
        </button>

        {/* 상태 필터 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setFilterOpen((o) => !o)}
            aria-label="상태 필터"
            className={`grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
              statusFilter
                ? "border-primary/50 bg-primary/10 text-primary-bright"
                : "border-white/10 bg-surface text-fg-muted"
            }`}
          >
            <FilterIcon className="h-4 w-4" />
          </button>
          {filterOpen && (
            <>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setFilterOpen(false)}
                className="fixed inset-0 z-10"
              />
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
      {filtered.length === 0 ? (
        <p className="px-1 pt-6 text-sm text-fg-muted">해당하는 프로젝트가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setDetailId(p.id)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge progress={p.progress} className="shrink-0" />
                  <span className="truncate text-xs text-fg-muted">
                    {p.assignees.length ? p.assignees.join(", ") : "미지정"} · 마감 {p.due}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {statusOf(p.progress) === "완료" ? (
                  <CheckCircleIcon className="h-5 w-5 text-emerald-300" />
                ) : (
                  <span className={`text-xs font-bold tabular-nums ${ddayStyle(p.dday)}`}>
                    {ddayLabel(p.dday)}
                  </span>
                )}
                <ChevronRightIcon className="h-4 w-4 text-fg-muted" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 추가 모달 */}
      {addOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative max-h-[85vh] w-full max-w-xs overflow-y-auto rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">새 프로젝트</p>

            {/* 1. 제목 */}
            <label className="mt-3 block text-xs text-fg-muted">프로젝트 제목</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 3층 시설 점검"
              className="mt-1 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            {/* 2. 목적 */}
            <label className="mt-3 block text-xs text-fg-muted">목적</label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={2}
              placeholder="이 프로젝트를 왜 하나요?"
              className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            {/* 3. 절차 */}
            <label className="mt-3 block text-xs text-fg-muted">절차</label>
            <textarea
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              rows={3}
              placeholder="어떤 순서로 진행하나요?"
              className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            {/* 4. 마감 날짜 */}
            <label className="mt-3 block text-xs text-fg-muted">마감 날짜</label>
            <div className="relative mt-1">
              <input
                ref={dateRef}
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 pr-10 text-sm outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <button
                type="button"
                onClick={() => dateRef.current?.showPicker?.()}
                aria-label="달력 열기"
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-fg-muted"
              >
                <CalendarIcon className="h-4 w-4" />
              </button>
            </div>

            {/* 5. 담당자 (여러 명 선택 가능) */}
            <label className="mt-3 block text-xs text-fg-muted">담당자 (여러 명 가능)</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STAFF.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleAssignee(s)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    assignees.includes(s)
                      ? "border-primary/50 bg-primary/10 text-primary-bright"
                      : "border-white/10 bg-bg text-fg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitAdd}
                disabled={!title.trim() || !due}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로젝트 상세 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="프로젝트 상세"
        aria-hidden={!detailId}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          detailId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setDetailId(null)}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
            프로젝트
          </h1>
        </header>

        {detailProject && (
          <>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {/* 제목 + 상태 + D-day */}
            <h2 className="text-lg font-bold">{detailProject.title}</h2>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge progress={detailProject.progress} />
              {statusOf(detailProject.progress) !== "완료" && (
                <span className={`text-xs font-bold tabular-nums ${ddayStyle(detailProject.dday)}`}>
                  {ddayLabel(detailProject.dday)}
                </span>
              )}
            </div>

            {/* 진행률 — 담당자가 수정 */}
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-fg-muted">진행률</p>
                <p className="text-sm font-bold tabular-nums text-primary-bright">
                  {detailProject.progress}%
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${detailProject.progress}%` }}
                />
              </div>
            </div>

            {/* 기본 정보 */}
            <dl className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-fg-muted">담당자</dt>
                <dd className="text-right font-medium">
                  {detailProject.assignees.length ? detailProject.assignees.join(", ") : "미지정"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-fg-muted">마감일</dt>
                <dd className="font-medium">{detailProject.due}</dd>
              </div>
            </dl>

            {/* 목적 */}
            <p className="mt-5 text-xs font-semibold text-fg-muted">목적</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {detailProject.purpose || <span className="text-fg-muted">작성된 목적이 없어요.</span>}
            </p>

            {/* 절차 */}
            <p className="mt-5 text-xs font-semibold text-fg-muted">절차</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
              {detailProject.procedure || <span className="text-fg-muted">작성된 절차가 없어요.</span>}
            </p>
          </div>

          {/* 하단 진행 바 — 담당자가 진행률 조절 + 완료 */}
          <div className="shrink-0 border-t border-white/10 bg-surface/80 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-fg-muted">진행률</span>
                  <span className="text-[11px] font-bold tabular-nums text-primary-bright">
                    {detailProject.progress}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={detailProject.progress}
                  onChange={(e) => updateProgress(detailProject.id, Number(e.target.value))}
                  className="w-full [accent-color:var(--color-primary)]"
                />
              </div>
              <button
                type="button"
                onClick={() => updateProgress(detailProject.id, 100)}
                disabled={detailProject.progress === 100}
                className="shrink-0 rounded-lg bg-emerald-500/90 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                완료
              </button>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
