"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/* ── 아이콘 ─────────────────────────────────────── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
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

/* ── 목 검색 인덱스 ─────────────────────────────── */
type Kind = "페이지" | "공지" | "회의록" | "프로젝트" | "직원";
type Entry = { label: string; kind: Kind; href: string };

const KIND_STYLE: Record<Kind, string> = {
  페이지: "text-primary-bright bg-primary/12",
  공지: "text-emerald-300 bg-emerald-400/12",
  회의록: "text-sky-300 bg-sky-400/12",
  프로젝트: "text-amber-300 bg-amber-400/12",
  직원: "text-violet-300 bg-violet-400/12",
};

const INDEX: Entry[] = [
  { label: "홈", kind: "페이지", href: "/" },
  { label: "일정", kind: "페이지", href: "/schedule" },
  { label: "업무", kind: "페이지", href: "/tasks" },
  { label: "프로젝트", kind: "페이지", href: "/projects" },
  { label: "회의록", kind: "페이지", href: "/notes" },
  { label: "근태·월차", kind: "페이지", href: "/attendance" },
  { label: "공지", kind: "페이지", href: "/notices" },
  { label: "프로필", kind: "페이지", href: "/profile" },
  { label: "전체 메뉴", kind: "페이지", href: "/my" },
  { label: "8월 근무표 안내", kind: "공지", href: "/notices" },
  { label: "여름 유니폼 지급 공지", kind: "공지", href: "/notices" },
  { label: "환경정비 반복 업무 안내", kind: "공지", href: "/notices" },
  { label: "주간 운영 회의록", kind: "회의록", href: "/notes" },
  { label: "신규 회원 이벤트 기획 회의", kind: "회의록", href: "/notes" },
  { label: "여름 리뉴얼 프로젝트", kind: "프로젝트", href: "/projects" },
  { label: "회원 관리 시스템 개선", kind: "프로젝트", href: "/projects" },
  { label: "지민", kind: "직원", href: "/my" },
  { label: "현우", kind: "직원", href: "/my" },
  { label: "서연", kind: "직원", href: "/my" },
  { label: "민준", kind: "직원", href: "/my" },
];

/* ── Context ───────────────────────────────────── */
type Ctx = { openSearch: () => void; closeSearch: () => void };
const SearchContext = createContext<Ctx | null>(null);
export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SearchContext.Provider value={{ openSearch: () => setOpen(true), closeSearch: () => setOpen(false) }}>
      {children}
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </SearchContext.Provider>
  );
}

/* ── 오버레이 ──────────────────────────────────── */
function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 열릴 때 포커스 + 초기화, ESC 닫기
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const q = query.trim();
  const results = q === "" ? [] : INDEX.filter((e) => e.label.includes(q) || e.kind.includes(q));

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div
      role="dialog"
      aria-label="검색"
      aria-hidden={!open}
      className={`absolute inset-0 z-[65] transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* 배경 딤 + 블러 */}
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />

      {/* 검색 카드 (상단에서 내려옴) */}
      <div
        className={`absolute inset-x-0 top-0 px-4 pt-16 transition-transform duration-200 ease-out ${
          open ? "translate-y-0" : "-translate-y-3"
        }`}
      >
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-surface-2 shadow-2xl">
          {/* 입력 */}
          <div className="flex items-center gap-2.5 px-4 py-3.5">
            <SearchIcon className="h-5 w-5 shrink-0 text-fg-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="사람·공지·일정·문서·메시지 검색..."
              className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-muted"
            />
            {q !== "" && (
              <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="shrink-0 text-fg-muted">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* 결과 / 빈 상태 */}
          <div className="border-t border-white/8">
            {q === "" ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">원하는 항목을 검색해보세요.</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">
                &lsquo;{q}&rsquo; 검색 결과가 없어요.
              </p>
            ) : (
              <div className="max-h-[60vh] divide-y divide-white/5 overflow-y-auto">
                {results.map((e) => (
                  <button
                    key={`${e.kind}-${e.label}`}
                    type="button"
                    onClick={() => go(e.href)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${KIND_STYLE[e.kind]}`}>
                      {e.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{e.label}</span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
