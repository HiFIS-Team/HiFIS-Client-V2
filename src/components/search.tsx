"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { setNavTarget } from "@/components/nav-target";

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
type Kind = "페이지" | "공지" | "회의록" | "프로젝트" | "결재" | "문서" | "직원";
type Entry = { label: string; kind: Kind; href: string; id?: string; q?: string };

const KIND_STYLE: Record<Kind, string> = {
  페이지: "text-primary-bright bg-primary/12",
  공지: "text-emerald-300 bg-emerald-400/12",
  회의록: "text-sky-300 bg-sky-400/12",
  프로젝트: "text-amber-300 bg-amber-400/12",
  결재: "text-rose-300 bg-rose-400/12",
  문서: "text-teal-300 bg-teal-400/12",
  직원: "text-violet-300 bg-violet-400/12",
};

const INDEX: Entry[] = [
  // 페이지
  { label: "홈", kind: "페이지", href: "/" },
  { label: "일정", kind: "페이지", href: "/schedule" },
  { label: "업무", kind: "페이지", href: "/tasks" },
  { label: "프로젝트", kind: "페이지", href: "/projects" },
  { label: "전자결재", kind: "페이지", href: "/approvals" },
  { label: "문서함", kind: "페이지", href: "/docs" },
  { label: "직원", kind: "페이지", href: "/staff" },
  { label: "회의록", kind: "페이지", href: "/notes" },
  { label: "근태·월차", kind: "페이지", href: "/attendance" },
  { label: "공지", kind: "페이지", href: "/notices" },
  { label: "프로필", kind: "페이지", href: "/profile" },
  { label: "전체 메뉴", kind: "페이지", href: "/my" },

  // 공지 (notices.tsx SEED와 id 일치)
  { label: "8월 근무표 공지", kind: "공지", href: "/notices", id: "a1" },
  { label: "여름 휴가 사용 가이드 — 6 ~ 8월", kind: "공지", href: "/notices", id: "a2" },
  { label: "신규 트레이너 환영 인사", kind: "공지", href: "/notices", id: "a3" },
  { label: "정수기 점검 예정 — 7/20 오전", kind: "공지", href: "/notices", id: "a4" },

  // 회의록 (notes.tsx SEED)
  { label: "지점 주간 운영 회의", kind: "회의록", href: "/notes", id: "n1" },
  { label: "여름 회원 이벤트 준비", kind: "회의록", href: "/notes", id: "n2" },
  { label: "신규 트레이너 온보딩 논의", kind: "회의록", href: "/notes", id: "n3" },

  // 프로젝트 (projects-store.tsx SEED)
  { label: "3층 시설 점검", kind: "프로젝트", href: "/projects", id: "p1" },
  { label: "여름 회원 이벤트 준비", kind: "프로젝트", href: "/projects", id: "p2" },
  { label: "신규 트레이너 온보딩", kind: "프로젝트", href: "/projects", id: "p3" },
  { label: "PT룸 장비 교체", kind: "프로젝트", href: "/projects", id: "p4" },
  { label: "회원 관리 시스템 교육", kind: "프로젝트", href: "/projects", id: "p5" },
  { label: "상반기 비품 재고 조사", kind: "프로젝트", href: "/projects", id: "p6" },

  // 결재 (approvals.tsx SEED)
  { label: "런닝머신 벨트 교체 부품", kind: "결재", href: "/approvals", id: "m1" },
  { label: "수건 200장 · 세제 추가 발주", kind: "결재", href: "/approvals", id: "m2" },
  { label: "외부 PT 세미나 참가비", kind: "결재", href: "/approvals", id: "m3" },

  // 문서 (docs.tsx SEED)
  { label: "2026 근무 규정 v3", kind: "문서", href: "/docs", q: "2026 근무 규정" },
  { label: "신입 트레이너 온보딩 가이드", kind: "문서", href: "/docs", q: "온보딩 가이드" },
  { label: "안전 교육 자료", kind: "문서", href: "/docs", q: "안전 교육" },
  { label: "8월 근무표", kind: "문서", href: "/docs", q: "8월 근무표" },

  // 직원 (staff.tsx SEED)
  { label: "김은후", kind: "직원", href: "/staff", q: "김은후" },
  { label: "민준", kind: "직원", href: "/staff", q: "민준" },
  { label: "서연", kind: "직원", href: "/staff", q: "서연" },
  { label: "지민", kind: "직원", href: "/staff", q: "지민" },
  { label: "현우", kind: "직원", href: "/staff", q: "현우" },
  { label: "하늘", kind: "직원", href: "/staff", q: "하늘" },
  { label: "예린", kind: "직원", href: "/staff", q: "예린" },
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

  // 목적지에서 해당 항목이 선택되도록 target을 남기고 이동
  const go = (e: Entry) => {
    onClose();
    if (e.id || e.q) setNavTarget({ path: e.href, id: e.id, q: e.q });
    router.push(e.href);
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
                    onClick={() => go(e)}
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
