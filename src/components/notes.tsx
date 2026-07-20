"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useToast } from "@/components/toast";

const ME = "은후";
const STAFF = ["지민", "현우", "서연", "민준"];

type Category = "전사" | "프로젝트" | "인원";
type Block =
  | { type: "title"; text: string }
  | { type: "meta"; text: string }
  | { type: "mentions"; people: string[] }
  | { type: "section"; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "p"; text: string };
type Note = {
  id: string;
  title: string;
  author: string;
  category: Category;
  project?: string;
  attendees: string[];
  content: string;
  blocks?: Block[]; // 있으면 리치 렌더, 없으면 content 문단
  meetingOffset: number; // 회의 날짜 (오늘 기준, 0 이하)
  modOffset: number; // 최근 수정 (오늘 기준)
  modTime: string; // "16:00"
  mine: boolean;
};

const SEED: Note[] = [
  {
    id: "n1",
    title: "지점 주간 운영 회의",
    author: "민준",
    category: "전사",
    attendees: ["민준", "서연", "은후"],
    content: "이번 주 운영 현황 공유.",
    blocks: [
      { type: "title", text: "지점 주간 운영 회의 — 7월 14일" },
      { type: "meta", text: "일시 · 7월 14일 (월) 10:30 ~ 11:30 · 강남점 라운지" },
      { type: "mentions", people: ["민준", "서연", "은후"] },
      { type: "section", text: "📋 안건" },
      { type: "ol", items: ["지난주 청소 로테이션 회고", "신규 회원 응대 매뉴얼 점검", "여름 비품 발주 확인", "주말 인력 배치 조정"] },
      { type: "section", text: "✅ 결정 사항" },
      {
        type: "ul",
        items: ["청소는 오전·마감 2회로 고정", "응대 매뉴얼 v2 이번 주 내 배포", "비품 발주는 금요일까지 서연 담당", "주말 트레이너 1명 추가 배치"],
      },
      { type: "quote", text: "“기본을 지키는 게 회원 만족의 시작” — 이번 주 키워드" },
    ],
    meetingOffset: -2,
    modOffset: -1,
    modTime: "16:00",
    mine: false,
  },
  {
    id: "n2",
    title: "여름 회원 이벤트 준비",
    author: "서연",
    category: "프로젝트",
    project: "여름 회원 이벤트",
    attendees: ["서연", "현우"],
    content: "여름 시즌 그룹 PT·프로모션 구성과 일정 검토. 다음 주까지 초안 확정.",
    meetingOffset: -4,
    modOffset: -3,
    modTime: "11:00",
    mine: false,
  },
  {
    id: "n3",
    title: "신규 트레이너 온보딩 논의",
    author: "현우",
    category: "인원",
    attendees: ["현우", "지민", "은후"],
    content: "신규 트레이너 온보딩 절차와 멘토 배정 논의. 2주 교육 커리큘럼 확정.",
    meetingOffset: -6,
    modOffset: -5,
    modTime: "14:00",
    mine: false,
  },
];

const CAT: Record<Category, { full: string; bar: string; badge: string; Icon: (p: { className?: string }) => ReactElement }> = {
  전사: { full: "전사", bar: "bg-emerald-400", badge: "bg-emerald-400/12 text-emerald-300", Icon: GlobeIcon },
  프로젝트: { full: "프로젝트", bar: "bg-indigo-400", badge: "bg-indigo-400/12 text-indigo-300", Icon: FolderIcon },
  인원: { full: "특정 인원", bar: "bg-amber-400", badge: "bg-amber-400/12 text-amber-300", Icon: UsersIcon },
};

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "mine", label: "내가 쓴 것" },
  { key: "전사", label: "전사 공개" },
  { key: "프로젝트", label: "프로젝트" },
  { key: "인원", label: "특정 인원" },
];

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}
const pad = (n: number) => String(n).padStart(2, "0");
function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function relLabel(offset: number) {
  const a = -offset;
  return a === 0 ? "오늘" : a === 1 ? "어제" : `${a}일 전`;
}
function fullDate(today: Date, offset: number) {
  const d = addDays(today, offset);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/* ── 아이콘 ─────────────────────────────────────── */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  );
}
function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h3.6l2 2.4h6.9A1.5 1.5 0 0 1 19 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 17.5Z" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19a5 5 0 0 1 10 0" />
      <path d="M16 6.5a2.8 2.8 0 0 1 0 5.5" />
      <path d="M17 14.2a5 5 0 0 1 3 4.8" />
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
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
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
function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 15 6-6" />
      <path d="M10.5 6.5 12 5a4 4 0 0 1 6 6l-1.5 1.5" />
      <path d="M13.5 17.5 12 19a4 4 0 0 1-6-6l1.5-1.5" />
    </svg>
  );
}
function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      className={`${className ?? ""} ${filled ? "text-amber-300" : "text-fg-muted"}`}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.8 6.6 20l1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  );
}
function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V4h10v5" />
      <rect x="4" y="9" width="16" height="7" rx="2" />
      <path d="M7 14h10v6H7z" />
    </svg>
  );
}
function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 5v4h4" />
      <path d="M12 8v4l3 2" />
    </svg>
  );
}
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2 2 0 0 0-3-3L5 17z" />
      <path d="m13.5 6.5 3 3" />
    </svg>
  );
}
function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "title":
      return <h3 className="mt-2 text-xl font-bold leading-snug">{block.text}</h3>;
    case "meta":
      return <p className="mt-2 text-sm text-fg-muted">{block.text}</p>;
    case "mentions":
      return (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-fg-muted">참석</span>
          {block.people.map((p) => (
            <span key={p} className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary-bright">
              @{p}
            </span>
          ))}
        </p>
      );
    case "section":
      return <h4 className="mt-6 text-lg font-bold">{block.text}</h4>;
    case "ol":
      return (
        <ol className="mt-2 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="shrink-0 font-semibold text-fg-muted">{i + 1}.</span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      );
    case "ul":
      return (
        <ul className="mt-2 space-y-1.5">
          {block.items.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
              <span className="shrink-0 text-primary-bright">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    case "quote":
      return <blockquote className="mt-4 border-l-2 border-primary/50 pl-3 text-sm italic leading-relaxed text-fg-muted">{block.text}</blockquote>;
    case "p":
      return <p className="mt-2 text-sm leading-relaxed">{block.text}</p>;
  }
}

function AuthorAvatar({ name, size = "h-5 w-5", text = "text-[10px]" }: { name: string; size?: string; text?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full ${text} font-bold text-white`} style={{ backgroundColor: avatarColor(name) }}>
      {name.charAt(0)}
    </span>
  );
}

export function Notes() {
  const { show } = useToast();
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [today, setToday] = useState<Date | null>(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "mod">("date");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [wTitle, setWTitle] = useState("");
  const [wCat, setWCat] = useState<Category>("전사");
  const [wAttendees, setWAttendees] = useState<string[]>([]);
  const [wContent, setWContent] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const idRef = useRef(0);

  useEffect(() => setToday(new Date()), []);

  const copyLink = (id: string) => {
    navigator.clipboard?.writeText(`https://hifis.app/notes/${id}`).catch(() => {});
    show("링크를 복사했습니다");
  };
  const toggleStar = (id: string) =>
    setStarred((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  useEffect(() => {
    if (!detailId && !writeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (writeOpen) setWriteOpen(false);
      else setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId, writeOpen]);

  const total = notes.length;
  const thisWeek = notes.filter((n) => -n.meetingOffset <= 7).length;
  const mineCount = notes.filter((n) => n.mine).length;

  const q = query.trim();
  const filtered = notes.filter(
    (n) =>
      (tab === "all" ? true : tab === "mine" ? n.mine : n.category === tab) &&
      (q === "" || n.title.includes(q) || n.author.includes(q)),
  );
  const sorted = [...filtered].sort((a, b) =>
    sort === "date" ? b.meetingOffset - a.meetingOffset : b.modOffset - a.modOffset,
  );

  const detail = detailId ? notes.find((n) => n.id === detailId) ?? null : null;

  const openWrite = () => {
    setWTitle("");
    setWCat("전사");
    setWAttendees([]);
    setWContent("");
    setWriteOpen(true);
  };
  const toggleW = (s: string) => setWAttendees((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submitWrite = () => {
    const t = wTitle.trim();
    const c = wContent.trim();
    if (!t || !c || !today) return;
    idRef.current += 1;
    const now = new Date();
    setNotes((list) => [
      {
        id: `w${idRef.current}`,
        title: t,
        author: ME,
        category: wCat,
        attendees: wAttendees,
        content: c,
        meetingOffset: 0,
        modOffset: 0,
        modTime: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        mine: true,
      },
      ...list,
    ]);
    setWriteOpen(false);
    show("회의록을 저장했습니다");
  };

  const modStr = (n: Note) => {
    if (!today) return "";
    const d = addDays(today, n.modOffset);
    return `수정 ${d.getMonth() + 1}. ${d.getDate()}. ${n.modTime}`;
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 + 요약 */}
      <div>
        <p className="text-xs font-semibold text-fg-muted">업무</p>
        <h1 className="text-xl font-bold">회의록</h1>
        <p className="mt-1.5 text-[13px] text-fg-muted">
          <b className="text-fg">전체 {total}</b> · 이번 주 {thisWeek} · 내가 쓴 것 {mineCount}
        </p>
      </div>

      {/* 새 회의록 + 정렬 */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={openWrite} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />새 회의록
        </button>
        <div className="ml-auto flex shrink-0 overflow-hidden rounded-lg border border-white/10">
          {(
            [
              ["date", "회의 날짜"],
              ["mod", "최근 수정"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={`px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                sort === key ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·작성자로 검색"
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-fg-muted"
        />
        {query.trim() !== "" && (
          <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="shrink-0 text-fg-muted">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 필터 + 개수 */}
      <div className="flex items-center gap-1.5">
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const on = tab === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTab(f.key)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                  on ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-xs text-fg-muted">{filtered.length}개</span>
      </div>

      {/* 목록 (상대 날짜 그룹) */}
      {today &&
        (sorted.length === 0 ? (
          <p className="px-1 pt-4 text-sm text-fg-muted">해당하는 회의록이 없어요.</p>
        ) : (
          (() => {
            let last = "";
            return sorted.map((n) => {
              const off = sort === "date" ? n.meetingOffset : n.modOffset;
              const label = relLabel(off);
              const header = label !== last;
              last = label;
              const c = CAT[n.category];
              return (
                <div key={n.id}>
                  {header && <p className="mb-2 mt-4 px-1 text-xs font-semibold text-fg-muted">{label}</p>}
                  <button
                    type="button"
                    onClick={() => setDetailId(n.id)}
                    className="flex w-full items-stretch overflow-hidden rounded-2xl border border-white/10 bg-surface text-left"
                  >
                    <span className={`w-1.5 shrink-0 ${c.bar}`} />
                    <div className="min-w-0 flex-1 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-[15px] font-bold">{n.title}</p>
                        <span className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${c.badge}`}>
                          <c.Icon className="h-3 w-3" />
                          {c.full}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-fg-muted">
                          <AuthorAvatar name={n.author} />
                          <span className="shrink-0 font-medium text-fg">{n.author}</span>
                          <span className="shrink-0">· {relLabel(n.modOffset)}</span>
                          {n.project && <span className="truncate">· 📁 {n.project}</span>}
                        </div>
                        <span className="shrink-0 text-[11px] text-fg-muted">{modStr(n)}</span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            });
          })()
        ))}

      {/* 상세 패널 */}
      <div
        role="dialog"
        aria-label="회의록 상세"
        aria-hidden={!detailId}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          detailId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <div className="shrink-0 px-4 pb-2 pt-[calc(env(safe-area-inset-top)+1rem)]">
          <button type="button" onClick={() => setDetailId(null)} className="text-sm font-medium text-fg-muted transition hover:text-fg">
            ← 회의록 목록
          </button>
        </div>
        {detail && (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-10">
            {/* 액션 툴바 */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              <button type="button" onClick={() => copyLink(detail.id)} className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.12] bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg">
                <LinkIcon className="h-3.5 w-3.5" />링크 복사
              </button>
              <button type="button" onClick={() => toggleStar(detail.id)} aria-label="즐겨찾기" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.12] bg-surface-2">
                <StarIcon className="h-4 w-4" filled={starred.has(detail.id)} />
              </button>
              <button type="button" aria-label="공유" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.12] bg-surface-2 text-fg">
                <ShareIcon className="h-4 w-4" />
              </button>
              <button type="button" className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.12] bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg">
                <PrinterIcon className="h-3.5 w-3.5" />인쇄
              </button>
              <button type="button" className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.12] bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg">
                <HistoryIcon className="h-3.5 w-3.5" />히스토리
              </button>
              <button type="button" className="flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.12] bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg">
                <PencilIcon className="h-3.5 w-3.5" />편집
              </button>
            </div>

            {/* 제목 · 작성자 · 공개 범위 */}
            <h2 className="mt-4 text-2xl font-bold leading-tight">{detail.title}</h2>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-fg-muted">
              <AuthorAvatar name={detail.author} />
              <span className="font-medium text-fg">{detail.author}</span>
              <span>· {today ? fullDate(today, detail.meetingOffset) : ""}</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-fg-muted">공개 범위</span>
              <span className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${CAT[detail.category].badge}`}>
                {(() => {
                  const I = CAT[detail.category].Icon;
                  return <I className="h-3 w-3" />;
                })()}
                {CAT[detail.category].full}
              </span>
            </div>

            <div className="my-5 border-t border-white/10" />

            {/* 내용 */}
            {detail.blocks ? (
              detail.blocks.map((b, i) => <BlockView key={i} block={b} />)
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.content}</p>
            )}
          </div>
        )}
      </div>

      {/* 작성 패널 */}
      <div
        role="dialog"
        aria-label="회의록 작성"
        aria-hidden={!writeOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          writeOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button type="button" onClick={() => setWriteOpen(false)} aria-label="닫기" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">회의록 작성</h1>
          <button type="button" onClick={submitWrite} disabled={!wTitle.trim() || !wContent.trim()} className="btn-primary mr-1.5 px-3 py-1.5 text-sm">
            저장
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label className="block text-xs text-fg-muted">공개 범위</label>
          <div className="mt-1.5 flex gap-1.5">
            {(["전사", "프로젝트", "인원"] as Category[]).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setWCat(cat)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  wCat === cat ? "bg-primary text-white" : "border border-white/10 bg-surface text-fg-muted"
                }`}
              >
                {(() => {
                  const I = CAT[cat].Icon;
                  return <I className="h-3.5 w-3.5" />;
                })()}
                {CAT[cat].full}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs text-fg-muted">제목</label>
          <input value={wTitle} onChange={(e) => setWTitle(e.target.value)} placeholder="회의 제목" className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50" />

          <label className="mt-4 block text-xs text-fg-muted">참석자</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {STAFF.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleW(s)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  wAttendees.includes(s) ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-surface text-fg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs text-fg-muted">내용</label>
          <textarea value={wContent} onChange={(e) => setWContent(e.target.value)} rows={12} placeholder="회의 내용을 적어주세요." className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50" />
        </div>
      </div>
    </div>
  );
}
