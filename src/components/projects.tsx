"use client";

import { useEffect, useRef, useState } from "react";

type Status = "대기" | "진행" | "완료";
type Project = {
  id: string;
  title: string;
  assignee: string;
  due: string; // 표시용 "7/22"
  dday: number; // 마감까지 남은 일수 (완료는 미표시)
  status: Status;
};

const STAFF = ["은후", "지민", "현우", "서연", "민준"]; // 목: 이 지점 직원

// 목 프로젝트 (헤더 마퀴 항목과 동일 세트)
const SEED: Project[] = [
  { id: "p1", title: "3층 시설 점검", assignee: "현우", due: "7/18", dday: 3, status: "진행" },
  { id: "p2", title: "여름 회원 이벤트 준비", assignee: "민준", due: "7/22", dday: 7, status: "진행" },
  { id: "p3", title: "신규 트레이너 온보딩", assignee: "서연", due: "7/27", dday: 12, status: "대기" },
  { id: "p4", title: "PT룸 장비 교체", assignee: "지민", due: "8/4", dday: 20, status: "대기" },
  { id: "p5", title: "회원 관리 시스템 교육", assignee: "은후", due: "7/10", dday: 0, status: "완료" },
];

const STATUS_STYLE: Record<Status, string> = {
  대기: "bg-white/8 text-fg-muted",
  진행: "bg-sky-400/12 text-sky-300",
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

const pad = (n: number) => String(n).padStart(2, "0");
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
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const idRef = useRef(0);

  // 추가 모달 ESC 닫기
  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  const q = query.trim();
  const filtered = projects.filter(
    (p) => q === "" || p.title.includes(q) || p.assignee.includes(q),
  );

  const openAdd = () => {
    setTitle("");
    setAssignee("");
    setDue("");
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
        assignee: assignee.trim() || "미지정",
        due: fmtDue(due),
        dday: calcDday(due),
        status: "대기",
      },
      ...list,
    ]);
    setAddOpen(false);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 검색 + 추가 */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="프로젝트·담당자 검색"
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
      </div>

      {/* 목록 */}
      {filtered.length === 0 ? (
        <p className="px-1 pt-6 text-sm text-fg-muted">해당하는 프로젝트가 없어요.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{p.title}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[p.status]}`}>
                    {p.status}
                  </span>
                  <span className="truncate text-xs text-fg-muted">
                    {p.assignee} · 마감 {p.due}
                  </span>
                </div>
              </div>
              {p.status === "완료" ? (
                <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <span className={`shrink-0 text-xs font-bold tabular-nums ${ddayStyle(p.dday)}`}>
                  {ddayLabel(p.dday)}
                </span>
              )}
            </div>
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
          <div className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">새 프로젝트</p>

            <label className="mt-3 block text-xs text-fg-muted">프로젝트명</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAdd()}
              placeholder="예) 3층 시설 점검"
              className="mt-1 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            <label className="mt-3 block text-xs text-fg-muted">담당자</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STAFF.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAssignee((cur) => (cur === s ? "" : s))}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    assignee === s
                      ? "border-primary/50 bg-primary/10 text-primary-bright"
                      : "border-white/10 bg-bg text-fg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="mt-3 block text-xs text-fg-muted">마감일</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

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
    </div>
  );
}
