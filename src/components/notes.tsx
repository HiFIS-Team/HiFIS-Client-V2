"use client";

import { useEffect, useRef, useState } from "react";

type Note = {
  id: string;
  title: string;
  attendees: string[];
  content: string;
  date: string; // ISO "2026-07-16"
  time: string; // "10:30"
};

const STAFF = ["은후", "지민", "현우", "서연", "민준"]; // 목: 이 지점 직원
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// 시드 (마운트 시 오늘 기준으로 날짜 생성 — 데모가 항상 오늘 회의를 갖도록)
const SEED_TEMPLATES = [
  {
    dayOffset: 0,
    time: "10:30",
    title: "주간 운영 회의",
    attendees: ["민준", "서연", "은후"],
    content:
      "이번 주 매장 운영 현황 공유.\n- 청소 로테이션 조정(오전·마감 2회)\n- 신규 회원 응대 매뉴얼 점검\n- 다음 주 비품 발주 확인",
  },
  {
    dayOffset: 0,
    time: "14:00",
    title: "신규 PT 프로그램 논의",
    attendees: ["현우", "지민"],
    content: "여름 시즌 그룹 PT 프로그램 구성과 가격안 검토. 다음 주까지 초안 확정하기로 함.",
  },
  {
    dayOffset: -1,
    time: "18:20",
    title: "회원 클레임 대응",
    attendees: ["서연", "민준"],
    content: "락커룸 청결 관련 클레임 2건 논의. 점검 주기를 1일 2회로 상향.",
  },
  {
    dayOffset: -3,
    time: "11:00",
    title: "월초 목표 공유",
    attendees: ["민준", "은후", "지민", "현우", "서연"],
    content: "7월 신규 등록 목표와 재등록 캠페인 일정 공유. 지점별 KPI 확인.",
  },
];

const pad = (n: number) => String(n).padStart(2, "0");
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d: Date, days: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function dateLabel(iso: string, today: string | null) {
  if (iso === today) return "오늘";
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEK[d.getDay()]})`;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
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

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [today, setToday] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [writeOpen, setWriteOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const idRef = useRef(0);

  // 마운트 시 오늘 기준으로 시드 날짜 생성 (SSR 불일치 방지 — 클라이언트에서만)
  useEffect(() => {
    const now = new Date();
    setToday(toISO(now));
    setNotes(
      SEED_TEMPLATES.map((t, i) => ({
        id: `s${i}`,
        title: t.title,
        attendees: t.attendees,
        content: t.content,
        date: toISO(addDays(now, t.dayOffset)),
        time: t.time,
      })),
    );
  }, []);

  // 상세 ESC
  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetailId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  // 작성 ESC
  useEffect(() => {
    if (!writeOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setWriteOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [writeOpen]);

  const detailNote = detailId ? notes.find((n) => n.id === detailId) ?? null : null;
  const todayCount = today ? notes.filter((n) => n.date === today).length : 0;

  // 날짜별 그룹 (notes는 최신순 유지)
  const groups: { date: string; items: Note[] }[] = [];
  for (const n of notes) {
    const last = groups[groups.length - 1];
    if (last && last.date === n.date) last.items.push(n);
    else groups.push({ date: n.date, items: [n] });
  }

  const openWrite = () => {
    setTitle("");
    setAttendees([]);
    setContent("");
    setWriteOpen(true);
  };
  const toggleAttendee = (s: string) =>
    setAttendees((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const submitWrite = () => {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c || !today) return;
    const now = new Date();
    idRef.current += 1;
    setNotes((list) => [
      {
        id: `n${idRef.current}`,
        title: t,
        attendees,
        content: c,
        date: today,
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      },
      ...list,
    ]);
    setWriteOpen(false);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 오늘 회의 요약 + 작성 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">
          오늘 회의 <span className="font-semibold text-fg">{todayCount}건</span>
        </p>
        <button
          type="button"
          onClick={openWrite}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
        >
          <PlusIcon className="h-4 w-4" />
          작성
        </button>
      </div>

      {/* 목록 (날짜별 그룹) */}
      {today === null ? null : notes.length === 0 ? (
        <p className="px-1 pt-6 text-sm text-fg-muted">아직 회의록이 없어요.</p>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.date} className="space-y-2">
              <p className="px-1 text-xs font-semibold text-fg-muted">{dateLabel(g.date, today)}</p>
              {g.items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setDetailId(n.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs font-medium tabular-nums text-primary-bright">{n.time}</span>
                      <span className="truncate text-sm font-semibold">{n.title}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-fg-muted">{n.content}</p>
                    <div className="mt-1.5 flex items-center gap-1 text-xs text-fg-muted">
                      <UsersIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {n.attendees.length ? n.attendees.join(", ") : "참석자 없음"}
                      </span>
                    </div>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 상세 패널 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="회의록 상세"
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
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">회의록</h1>
        </header>

        {detailNote && (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <h2 className="text-lg font-bold">{detailNote.title}</h2>
            <p className="mt-1 text-xs text-fg-muted">
              {dateLabel(detailNote.date, today)} · {detailNote.time}
            </p>

            <dl className="mt-4 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-fg-muted">참석자</dt>
                <dd className="text-right font-medium">
                  {detailNote.attendees.length ? detailNote.attendees.join(", ") : "없음"}
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs font-semibold text-fg-muted">내용</p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{detailNote.content}</p>
          </div>
        )}
      </div>

      {/* 작성 패널 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="회의록 작성"
        aria-hidden={!writeOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          writeOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setWriteOpen(false)}
            aria-label="닫기"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">회의록 작성</h1>
          <button
            type="button"
            onClick={submitWrite}
            disabled={!title.trim() || !content.trim()}
            className="mr-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            저장
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <label className="block text-xs text-fg-muted">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="회의 제목"
            className="mt-1 w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />

          <label className="mt-4 block text-xs text-fg-muted">참석자</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {STAFF.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleAttendee(s)}
                className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                  attendees.includes(s)
                    ? "border-primary/50 bg-primary/10 text-primary-bright"
                    : "border-white/10 bg-surface text-fg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="mt-4 block text-xs text-fg-muted">내용</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="회의 내용을 적어주세요."
            className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-primary/50"
          />
        </div>
      </div>
    </div>
  );
}
