"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactElement } from "react";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth";
import { useProjects } from "@/providers/projects-store";
import { useNavTargetFor } from "@/hooks/nav-target";
import {
  createMeeting,
  listEmployees,
  listMeetings,
  toggleReaction,
  type EmployeeLite,
  type MeetingDTO,
  type MeetingScope,
  type ReactionAgg,
} from "@/lib/api/hifis";

const QUICK_EMOJI = ["👍", "❤️", "🎉", "👀", "🙏", "😂"];

type Category = "전사" | "프로젝트" | "인원";
const SCOPE_TO_CAT: Record<MeetingScope, Category> = { COMPANY: "전사", PROJECT: "프로젝트", PEOPLE: "인원" };
const CAT_TO_SCOPE: Record<Category, MeetingScope> = { 전사: "COMPANY", 프로젝트: "PROJECT", 인원: "PEOPLE" };

type Block =
  | { type: "title"; text: string }
  | { type: "meta"; text: string }
  | { type: "mentions"; people: string[] }
  | { type: "section"; text: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "p"; text: string };

// 백엔드 MeetingOut → UI Note (이름은 render 시 로스터로 조회, 날짜는 실 ISO 유지)
type Note = {
  id: string;
  title: string;
  authorId: string;
  category: Category;
  projectId?: string | null;
  attendeeIds: string[];
  blocks: Block[];
  meetingAt: string; // ISO
  createdAt: string; // ISO (수정/생성)
  reactions: ReactionAgg[];
};

function toNote(d: MeetingDTO): Note {
  return {
    id: d.id,
    title: d.title,
    authorId: d.authorId,
    category: SCOPE_TO_CAT[d.scope],
    projectId: d.projectId ?? null,
    attendeeIds: d.attendeeIds ?? [],
    blocks: (d.blocks as Block[]) ?? [],
    meetingAt: d.meetingAt,
    createdAt: d.createdAt,
    reactions: d.reactions ?? [],
  };
}

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

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
// today 기준 며칠 전 (양수=과거) — today 는 마운트 후 state
function dayDiff(today: Date, iso: string) {
  return Math.round((startOfDay(today).getTime() - startOfDay(new Date(iso)).getTime()) / 86400000);
}
function relLabel(today: Date, iso: string) {
  const a = dayDiff(today, iso);
  return a <= 0 ? "오늘" : a === 1 ? "어제" : `${a}일 전`;
}
// 고정 ISO 문자열 → 절대 표기 (new Date(고정문자열)은 순수 — render 안전)
function fullDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function modStr(iso: string) {
  const d = new Date(iso);
  return `수정 ${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* blocks에서 "안건" / "결정 사항" 목록 뽑기 (회의록 → 프로젝트 전환용). */
function itemsUnder(n: Note, keyword: string): string[] {
  const i = n.blocks.findIndex((b) => b.type === "section" && b.text.includes(keyword));
  if (i === -1) return [];
  const next = n.blocks[i + 1];
  return next && (next.type === "ul" || next.type === "ol") ? next.items : [];
}
// 목적 기본값 fallback용 — blocks 를 대충 평문으로
function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      if (b.type === "ol" || b.type === "ul") return b.items.join("\n");
      if (b.type === "mentions") return "";
      return b.text;
    })
    .filter(Boolean)
    .join("\n");
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
function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 4.5c3.5-1.5 6 1 4.5 4.5-1.2 2.8-4 5.6-7.5 7.5L7 13.5C8.9 10 11.7 7.2 14.5 6" />
      <path d="M9 15c-2 .5-3 2-3 4 2 0 3.5-1 4-3" />
      <circle cx="14.5" cy="9.5" r="1.4" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
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
function SmilePlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20a8 8 0 1 0-7.5-5.2" />
      <path d="M8.5 14a3.5 3.5 0 0 0 5.2 1.5" />
      <path d="M9 9.5h.01M15 9.5h.01" />
      <path d="M19 3v4M17 5h4" />
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
      return <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{block.text}</p>;
    default:
      return null;
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
  const router = useRouter();
  const { user, status } = useAuth();
  const meId = user?.id;
  const { projects, addProject } = useProjects();
  const nav = useNavTargetFor("/notes"); // 헤더 검색에서 넘어온 항목

  const [notes, setNotes] = useState<Note[]>([]);
  const [roster, setRoster] = useState<EmployeeLite[]>([]);
  const [today, setToday] = useState<Date | null>(null);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "mod">("date");
  const [detailId, setDetailId] = useState<string | null>(nav?.id ?? null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [wTitle, setWTitle] = useState("");
  const [wCat, setWCat] = useState<Category>("전사");
  const [wAttendeeIds, setWAttendeeIds] = useState<string[]>([]);
  const [wContent, setWContent] = useState("");
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);

  // 회의록 → 프로젝트 전환
  const [toProjOpen, setToProjOpen] = useState(false);
  const [pTitle, setPTitle] = useState("");
  const [pPurpose, setPPurpose] = useState("");
  const [pSteps, setPSteps] = useState<string[]>([]); // 체크된 결정 사항
  const [pExtra, setPExtra] = useState(""); // 직접 추가한 절차
  const [pAssigneeIds, setPAssigneeIds] = useState<string[]>([]);
  const [pDue, setPDue] = useState("");
  const pDueRef = useRef<HTMLInputElement>(null);

  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? (id === meId ? user?.name ?? "나" : "직원");
  const projectName = (id?: string | null) => (id ? projects.find((p) => p.id === id)?.title ?? null : null);

  // 로그인되면 회의록 로드 (.then 안에서만 setState → set-state-in-effect 아님)
  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    listMeetings()
      .then((rows) => {
        if (!alive) return;
        setNotes(rows.map(toNote));
        setToday(new Date());
      })
      .catch(() => {
        if (alive) setToday(new Date());
      });
    return () => {
      alive = false;
    };
  }, [status]);

  // 지점 로스터 (작성자·참석자 이름 + 피커)
  useEffect(() => {
    let alive = true;
    listEmployees()
      .then((e) => {
        if (alive) setRoster(e);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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

  const total = notes.length;
  const thisWeek = today ? notes.filter((n) => dayDiff(today, n.meetingAt) <= 7 && dayDiff(today, n.meetingAt) >= 0).length : 0;
  const mineCount = notes.filter((n) => n.authorId === meId).length;

  const q = query.trim();
  const filtered = notes.filter(
    (n) =>
      (tab === "all" ? true : tab === "mine" ? n.authorId === meId : n.category === tab) &&
      (q === "" || n.title.includes(q) || nameOf(n.authorId).includes(q)),
  );
  const sorted = [...filtered].sort((a, b) => {
    const av = new Date(sort === "date" ? a.meetingAt : a.createdAt).getTime();
    const bv = new Date(sort === "date" ? b.meetingAt : b.createdAt).getTime();
    return bv - av;
  });

  const detail = detailId ? notes.find((n) => n.id === detailId) ?? null : null;

  const openWrite = () => {
    setWTitle("");
    setWCat("전사");
    setWAttendeeIds([]);
    setWContent("");
    setWriteOpen(true);
  };
  const toggleW = (id: string) => setWAttendeeIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const reactionsOf = (n: Note) =>
    n.reactions.map((r) => ({ emoji: r.emoji, count: r.employeeIds.length, mine: meId ? r.employeeIds.includes(meId) : false }));

  const react = async (id: string, emoji: string) => {
    setPickerOpen(false);
    try {
      const res = await toggleReaction({ targetType: "MEETING", targetId: id, emoji });
      setNotes((l) => l.map((n) => (n.id === id ? { ...n, reactions: res.reactions } : n)));
    } catch {
      /* no-op */
    }
  };

  /* 회의록 → 프로젝트: 결정 사항을 체크해서 절차로 옮긴다 (AI 없이) */
  const openToProject = () => {
    if (!detail) return;
    setPTitle(detail.title);
    const agenda = itemsUnder(detail, "안건");
    setPPurpose(agenda.length ? agenda.join("\n") : blocksToText(detail.blocks));
    setPSteps(itemsUnder(detail, "결정")); // 기본으로 전부 체크
    setPExtra("");
    setPAssigneeIds(detail.attendeeIds); // 참석자(실 employeeId)를 담당자 후보로
    setPDue("");
    setToProjOpen(true);
  };
  const toggleStep = (t: string) => setPSteps((l) => (l.includes(t) ? l.filter((x) => x !== t) : [...l, t]));
  const togglePAssignee = (id: string) => setPAssigneeIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const submitToProject = async () => {
    const t = pTitle.trim();
    if (!detail || !t || !pDue) return;
    const decisions = itemsUnder(detail, "결정").filter((d) => pSteps.includes(d));
    const steps = [...decisions, ...pExtra.split("\n").map((x) => x.trim()).filter(Boolean)].join("\n");
    try {
      await addProject({
        title: t,
        purpose: pPurpose.trim() || undefined,
        steps: steps || undefined,
        assigneeIds: pAssigneeIds, // 이제 실 employeeId 라 그대로 담당자로 넘어감
        dueIso: pDue,
      });
      setToProjOpen(false);
      setDetailId(null);
      show(`${t} 프로젝트를 만들었습니다`);
      router.push("/projects");
    } catch {
      show("프로젝트 생성에 실패했어요", "cancel");
    }
  };

  const submitWrite = async () => {
    const t = wTitle.trim();
    const c = wContent.trim();
    if (!t || !c) return;
    try {
      const created = await createMeeting({
        title: t,
        scope: CAT_TO_SCOPE[wCat],
        attendeeIds: wAttendeeIds,
        meetingAt: new Date().toISOString(),
        blocks: [{ type: "p", text: c }],
      });
      setNotes((list) => [toNote(created), ...list]);
      setWriteOpen(false);
      show("회의록을 저장했습니다");
    } catch {
      show("회의록 저장에 실패했어요", "cancel");
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 + 요약 */}
      <div>
        <h1 className="text-xl font-bold">회의록</h1>
        <p className="mt-1.5 text-[13px] text-fg-muted">
          <b className="text-fg">전체 {total}</b> · 이번 주 {thisWeek} · 내가 쓴 것 {mineCount}
        </p>
      </div>

      {/* 정렬(왼쪽) + 새 회의록(오른쪽) */}
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10">
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
        <button type="button" onClick={openWrite} className="btn-primary ml-auto flex items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />새 회의록
        </button>
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
              const iso = sort === "date" ? n.meetingAt : n.createdAt;
              const label = relLabel(today, iso);
              const header = label !== last;
              last = label;
              const c = CAT[n.category];
              const author = nameOf(n.authorId);
              const proj = projectName(n.projectId);
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
                          <AuthorAvatar name={author} />
                          <span className="shrink-0 font-medium text-fg">{author}</span>
                          <span className="shrink-0">· {relLabel(today, n.meetingAt)}</span>
                          {proj && <span className="truncate">· 📁 {proj}</span>}
                        </div>
                        <span className="shrink-0 text-[11px] text-fg-muted">{modStr(n.createdAt)}</span>
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
        inert={!detailId}
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
              <button type="button" onClick={openToProject} className="btn-primary flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs">
                <RocketIcon className="h-3.5 w-3.5" />프로젝트로 만들기
              </button>
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
              <AuthorAvatar name={nameOf(detail.authorId)} />
              <span className="font-medium text-fg">{nameOf(detail.authorId)}</span>
              <span>· {fullDate(detail.meetingAt)}</span>
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

            {/* 참석자 */}
            {detail.attendeeIds.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-sm">
                <span className="text-fg-muted">참석</span>
                {detail.attendeeIds.map((id) => (
                  <span key={id} className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary-bright">
                    @{nameOf(id)}
                  </span>
                ))}
              </div>
            )}

            <div className="my-5 border-t border-white/10" />

            {/* 내용 */}
            {detail.blocks.length > 0 ? (
              detail.blocks.map((b, i) => <BlockView key={i} block={b} />)
            ) : (
              <p className="text-sm text-fg-muted">내용이 없어요.</p>
            )}

            {/* 이모지 반응 */}
            <div className="relative mt-6 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-4">
              {reactionsOf(detail).map((r) => (
                <button
                  key={r.emoji}
                  type="button"
                  onClick={() => react(detail.id, r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                    r.mine ? "border-primary/60 bg-primary/15" : "border-white/10 bg-surface-2"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className={r.mine ? "font-bold text-primary-bright" : "text-fg-muted"}>{r.count}</span>
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                aria-label="반응 남기기"
                className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${
                  pickerOpen ? "border-primary/60 bg-primary/15 text-primary-bright" : "border-white/10 bg-surface-2 text-fg-muted"
                }`}
              >
                <SmilePlusIcon className="h-4 w-4" />
              </button>

              {pickerOpen && (
                <>
                  <button type="button" aria-label="닫기" onClick={() => setPickerOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute bottom-full left-0 z-20 mb-1.5 flex gap-0.5 rounded-full border border-white/12 bg-surface-2 px-1.5 py-1 shadow-2xl">
                    {QUICK_EMOJI.map((e) => (
                      <button key={e} type="button" onClick={() => react(detail.id, e)} className="grid h-8 w-8 place-items-center rounded-full text-lg">
                        {e}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 작성 패널 */}
      <div
        role="dialog"
        aria-label="회의록 작성"
        inert={!writeOpen}
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
          {roster.length === 0 ? (
            <p className="mt-1 text-[13px] text-fg-muted">직원 명단을 불러오는 중…</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {roster.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleW(s.id)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    wAttendeeIds.includes(s.id) ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-surface text-fg-muted"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          <label className="mt-4 block text-xs text-fg-muted">내용</label>
          <textarea value={wContent} onChange={(e) => setWContent(e.target.value)} rows={12} placeholder="회의 내용을 적어주세요." className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50" />
        </div>
      </div>

      {/* ── 회의록 → 프로젝트 전환 모달 ───────────── */}
      {toProjOpen && detail && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setToProjOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-lg font-bold">프로젝트로 만들기</p>
                <p className="truncate text-xs text-fg-muted">📝 {detail.title}</p>
              </div>
              <button type="button" onClick={() => setToProjOpen(false)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              {/* 제목 */}
              <div>
                <p className="pb-1.5 text-[13px] font-bold">프로젝트 제목</p>
                <input
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50"
                />
              </div>

              {/* 목적 (안건에서) */}
              <div>
                <p className="pb-1.5 text-[13px] font-bold">
                  목적 <span className="font-normal text-fg-muted">(회의 안건에서 가져옴)</span>
                </p>
                <textarea
                  value={pPurpose}
                  onChange={(e) => setPPurpose(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50"
                />
              </div>

              {/* 절차 = 결정 사항 체크 */}
              <div>
                <p className="pb-1.5 text-[13px] font-bold">
                  절차 <span className="font-normal text-fg-muted">— 체크한 결정 사항이 절차가 됩니다</span>
                </p>
                {itemsUnder(detail, "결정").length === 0 ? (
                  <p className="rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] text-fg-muted">
                    이 회의록엔 결정 사항이 없어요. 아래에 직접 적어주세요.
                  </p>
                ) : (
                  <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
                    {itemsUnder(detail, "결정").map((d) => {
                      const on = pSteps.includes(d);
                      return (
                        <button key={d} type="button" onClick={() => toggleStep(d)} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left">
                          <span
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                              on ? "border-primary bg-primary text-white" : "border-white/25"
                            }`}
                          >
                            {on && <CheckIcon className="h-2.5 w-2.5" />}
                          </span>
                          <span className={`min-w-0 flex-1 text-[13px] ${on ? "" : "text-fg-muted line-through"}`}>{d}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <textarea
                  value={pExtra}
                  onChange={(e) => setPExtra(e.target.value)}
                  rows={2}
                  placeholder="추가할 절차가 있으면 한 줄에 하나씩"
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none placeholder:text-fg-muted focus:border-primary/50"
                />
              </div>

              {/* 담당자 (참석자에서 미리 선택) */}
              <div>
                <p className="pb-1.5 text-[13px] font-bold">
                  담당자 <span className="font-normal text-fg-muted">(참석자에서 미리 선택 · {pAssigneeIds.length}명)</span>
                </p>
                {roster.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">직원 명단을 불러오는 중…</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {roster.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => togglePAssignee(s.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          pAssigneeIds.includes(s.id) ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                        }`}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 마감일 */}
              <div>
                <p className="pb-1.5 text-[13px] font-bold">
                  마감 날짜 <span className="font-normal text-red-400">필수</span>
                </p>
                <div className="relative">
                  <input
                    ref={pDueRef}
                    type="date"
                    value={pDue}
                    onChange={(e) => setPDue(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 pr-9 text-[13px] outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <button
                    type="button"
                    aria-label="달력 열기"
                    onClick={() => pDueRef.current?.showPicker?.()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setToProjOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitToProject} disabled={!pTitle.trim() || !pDue} className="btn-primary flex-[2] py-2.5 text-sm">
                프로젝트 만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
