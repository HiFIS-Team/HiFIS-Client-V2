"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

/* ── 아이콘 ─────────────────────────────────────── */
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
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
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
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
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
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}

/* ── 카테고리 (이모지로 구분) ───────────────────── */
type Cat = string;
const CATS: { key: Cat; emoji: string }[] = [
  { key: "회의", emoji: "📋" },
  { key: "마감", emoji: "⏰" },
  { key: "외근·출장", emoji: "📍" },
  { key: "휴가", emoji: "🌴" },
  { key: "사내행사", emoji: "🎉" },
  { key: "기념일", emoji: "🎂" },
  { key: "업무", emoji: "✅" },
  { key: "면접", emoji: "🧑‍💼" },
  { key: "교육·워크샵", emoji: "📘" },
  { key: "회원·상담", emoji: "🤝" },
  { key: "회식·모임", emoji: "🍻" },
  { key: "건강·병원", emoji: "🏥" },
  { key: "개인일정", emoji: "👤" },
  { key: "사내 휴일", emoji: "🏖️" },
  { key: "점검", emoji: "🔧" },
  { key: "일반", emoji: "📌" },
];
const emojiOf = (cat: Cat) => CATS.find((c) => c.key === cat)?.emoji ?? "📌";

/* ── 공유 범위 ──────────────────────────────────── */
type Scope = "전사" | "팀" | "프로젝트" | "개인" | "대상 지정";
const SCOPES: { key: Scope; desc: string; emoji: string }[] = [
  { key: "전사", desc: "모든 구성원에게 공유", emoji: "🏢" },
  { key: "팀", desc: "같은 팀 구성원에게 공유", emoji: "👥" },
  { key: "프로젝트", desc: "선택한 프로젝트 멤버에게만", emoji: "📁" },
  { key: "개인", desc: "나만 볼 수 있어요", emoji: "🔒" },
  { key: "대상 지정", desc: "선택한 구성원에게만 공유", emoji: "🎯" },
];

/* ── 색상 팔레트 ────────────────────────────────── */
const COLORS = [
  "#9d3bfc", "#3b82f6", "#0ea5e9", "#06b6d4",
  "#14b8a6", "#10b981", "#22c55e", "#84cc16",
  "#eab308", "#f59e0b", "#f97316", "#ef4444",
  "#ec4899", "#d946ef", "#8b5cf6", "#64748b",
];

/* ── 목 일정 (offset = 오늘 기준 일수) ──────────── */
type Ev = {
  id: string;
  title: string;
  emoji: string;
  cat: Cat;
  color: string;
  offset: number;
  time: string;
  endOffset?: number;
  endTime?: string;
  scope: Scope;
  memo?: string;
};

const SEED: Ev[] = [
  { id: "e1", title: "주간 운영 회의", emoji: "📋", cat: "회의", color: "#9d3bfc", offset: 0, time: "10:00", scope: "전사" },
  { id: "e2", title: "신입 트레이너 교육", emoji: "📘", cat: "교육·워크샵", color: "#0ea5e9", offset: 0, time: "14:00", scope: "팀" },
  { id: "e3", title: "런닝머신 정기 점검", emoji: "🏃", cat: "점검", color: "#10b981", offset: 1, time: "09:30", scope: "팀" },
  { id: "e4", title: "회원 이벤트 준비", emoji: "🎉", cat: "사내행사", color: "#f59e0b", offset: 2, time: "13:00", scope: "전사" },
  { id: "e5", title: "지점장 미팅", emoji: "☕", cat: "회의", color: "#9d3bfc", offset: 2, time: "17:00", scope: "대상 지정" },
  { id: "e6", title: "여름 리뉴얼 중간 점검", emoji: "🏗️", cat: "점검", color: "#10b981", offset: 4, time: "11:00", scope: "프로젝트" },
  { id: "e7", title: "월말 정산 회의", emoji: "📊", cat: "회의", color: "#9d3bfc", offset: 7, time: "16:00", scope: "전사" },
  { id: "e8", title: "GX 신규 프로그램 설명회", emoji: "🧘", cat: "교육·워크샵", color: "#0ea5e9", offset: 9, time: "15:00", scope: "전사" },
  { id: "e9", title: "안전 교육", emoji: "🦺", cat: "교육·워크샵", color: "#0ea5e9", offset: -3, time: "10:00", scope: "전사" },
  { id: "e10", title: "비품 재고 점검", emoji: "📦", cat: "점검", color: "#10b981", offset: -1, time: "18:00", scope: "팀" },
];

/* ── 날짜 유틸 ──────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const ampm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return { period: h < 12 ? "오전" : "오후", hhmm: `${pad(h % 12 === 0 ? 12 : h % 12)}:${pad(m)}` };
};

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function SchedulePage() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"월" | "주">("월");
  const [events, setEvents] = useState<Ev[]>(SEED);

  // 추가 시트
  const [addOpen, setAddOpen] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fCat, setFCat] = useState<Cat>("회의");
  const [fStartDate, setFStartDate] = useState("");
  const [fStartTime, setFStartTime] = useState("");
  const [fEndDate, setFEndDate] = useState("");
  const [fEndTime, setFEndTime] = useState("");
  const [fScope, setFScope] = useState<Scope>("전사");
  const [fColor, setFColor] = useState(COLORS[0]);
  const [fMemo, setFMemo] = useState("");
  const startDateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const endDateRef = useRef<HTMLInputElement>(null);
  const endTimeRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    setCursor(d);
    setSelected(iso(d));
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  if (!today || !cursor || !selected) {
    return <div className="px-4 pt-5" />;
  }

  const dateOf = (offset: number) => iso(addDays(today, offset));
  const byDate = new Map<string, Ev[]>();
  for (const e of events) {
    const key = dateOf(e.offset);
    const arr = byDate.get(key);
    if (arr) arr.push(e);
    else byDate.set(key, [e]);
  }
  for (const arr of byDate.values()) arr.sort((a, b) => a.time.localeCompare(b.time));

  /* 달력 셀 */
  let cells: (Date | null)[] = [];
  if (view === "월") {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const lead = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    cells = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
  } else {
    const s = startOfWeek(cursor);
    cells = Array.from({ length: 7 }, (_, i) => addDays(s, i));
  }

  const label =
    view === "월"
      ? `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`
      : (() => {
          const s = startOfWeek(cursor);
          const e = addDays(s, 6);
          return s.getMonth() === e.getMonth()
            ? `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getDate()}일`
            : `${s.getMonth() + 1}월 ${s.getDate()}일 – ${e.getMonth() + 1}월 ${e.getDate()}일`;
        })();

  const move = (dir: 1 | -1) => setCursor(view === "월" ? addMonths(cursor, dir) : addDays(cursor, dir * 7));
  const goToday = () => {
    setCursor(today);
    setSelected(iso(today));
  };

  /* 다가오는 일정 */
  const upcoming = events
    .map((e) => ({ e, date: dateOf(e.offset) }))
    .filter((x) => x.date >= selected)
    .sort((a, b) => (a.date === b.date ? a.e.time.localeCompare(b.e.time) : a.date.localeCompare(b.date)))
    .slice(0, 12);

  const groups: { date: string; list: Ev[] }[] = [];
  for (const { e, date } of upcoming) {
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.list.push(e);
    else groups.push({ date, list: [e] });
  }

  const openAdd = () => {
    setFTitle("");
    setFCat("회의");
    setFStartDate(selected);
    setFStartTime("");
    setFEndDate("");
    setFEndTime("");
    setFScope("전사");
    setFColor(COLORS[0]);
    setFMemo("");
    setAddOpen(true);
  };

  const submitAdd = () => {
    const title = fTitle.trim();
    if (!title || !fStartDate) return;
    const start = new Date(`${fStartDate}T00:00:00`);
    const offset = Math.round((start.getTime() - today.getTime()) / 86400000);
    const endOffset =
      fEndDate && fEndDate >= fStartDate
        ? Math.round((new Date(`${fEndDate}T00:00:00`).getTime() - today.getTime()) / 86400000)
        : undefined;
    idRef.current += 1;
    setEvents((l) => [
      ...l,
      {
        id: `new-${idRef.current}`,
        title,
        emoji: emojiOf(fCat),
        cat: fCat,
        color: fColor,
        offset,
        time: fStartTime || "09:00",
        endOffset,
        endTime: fEndTime || undefined,
        scope: fScope,
        memo: fMemo.trim() || undefined,
      },
    ]);
    setSelected(fStartDate);
    setCursor(start);
    setAddOpen(false);
    show(`${title} 일정을 추가했습니다`);
  };

  const todayIso = iso(today);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <h1 className="text-xl font-bold">일정</h1>

      {/* 월/주 토글 · 날짜 이동 · 추가 */}
      <div className="relative flex h-8 items-center">
        <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10">
          {(["월", "주"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === v ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="absolute left-1/2 flex max-w-[calc(100%-9rem)] -translate-x-1/2 items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="이전"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={goToday} className="min-w-0 truncate px-1.5 text-sm font-semibold tabular-nums">
            {label}
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="다음"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>

          {/* + — 화살표 옆. 흐름에서 빼서 가운데 정렬 기준은 날짜 이동 유지 */}
          <button
            type="button"
            onClick={openAdd}
            aria-label="일정 추가"
            className="btn-primary absolute left-full ml-1 grid h-8 w-8 place-items-center"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 달력 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="grid grid-cols-7 border-b border-white/10">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-semibold ${
                i === 0 ? "text-red-400" : i === 6 ? "text-sky-400" : "text-fg-muted"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={`b${i}`} className="h-14 border-b border-r border-white/5 last:border-r-0" />;
            const key = iso(d);
            const isToday = key === todayIso;
            const isSel = key === selected;
            const dow = d.getDay();
            const evs = byDate.get(key) ?? [];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`flex h-14 flex-col items-center gap-1 border-b border-r border-white/5 pt-1.5 transition-colors ${
                  isSel ? "bg-primary/10" : ""
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-[13px] font-semibold tabular-nums ${
                    isToday ? "bg-primary text-white" : dow === 0 ? "text-red-400" : dow === 6 ? "text-sky-400" : "text-fg"
                  }`}
                >
                  {d.getDate()}
                </span>
                <span className="flex items-center gap-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 다가오는 일정 */}
      <section className="rounded-2xl border border-white/10 bg-surface px-4 py-4">
        <h2 className="text-base font-bold">다가오는 일정</h2>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">예정된 일정이 없어요.</p>
        ) : (
          <div className="mt-3 divide-y divide-white/8 border-t border-white/8">
            {groups.map((g) => {
              const d = new Date(`${g.date}T00:00:00`);
              const dow = d.getDay();
              const numColor =
                g.date === todayIso
                  ? "text-primary-bright"
                  : dow === 0
                    ? "text-red-400"
                    : dow === 6
                      ? "text-sky-400"
                      : "text-fg";
              return (
                <div key={g.date} className="flex gap-3 py-3">
                  <div className="w-9 shrink-0 pt-1 text-center">
                    <p className={`text-xl font-bold leading-none tabular-nums ${numColor}`}>{d.getDate()}</p>
                    <p className="mt-1 text-[11px] text-fg-muted">{WEEKDAYS[dow]}</p>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {g.list.map((e) => {
                      const { period, hhmm } = ampm(e.time);
                      return (
                        <div key={e.id} className="flex items-center gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: e.color }} />
                          <span className="shrink-0 text-[15px] leading-none">{e.emoji}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.title}</span>
                          <span className="shrink-0 text-[11px] text-fg-muted">
                            {period} <span className="text-[12px] tabular-nums">{hhmm}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 일정 추가 바텀시트 ─────────────────────── */}
      {addOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/65"
          />

          <div className="animate-sheet-up relative flex max-h-[88svh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-surface">
            {/* 손잡이 */}
            <div className="flex shrink-0 justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* 헤더 */}
            <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-bright">
                <CalendarIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">일정 추가</p>
                <p className="text-xs text-fg-muted">팀과 공유할 일정을 만들어보세요</p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            {/* 본문 (스크롤) */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 pb-4">
              {/* 제목 */}
              <div>
                <p className={labelCls}>제목</p>
                <input
                  autoFocus
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="무엇을 계획하고 있나요?"
                  className={fieldCls}
                />
              </div>

              {/* 시작 */}
              <div>
                <p className={labelCls}>시작</p>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-[2]">
                    <input
                      ref={startDateRef}
                      type="date"
                      value={fStartDate}
                      onChange={(e) => setFStartDate(e.target.value)}
                      className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                    />
                    <button
                      type="button"
                      aria-label="시작 날짜 선택"
                      onClick={() => startDateRef.current?.showPicker()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <input
                      ref={startTimeRef}
                      type="time"
                      value={fStartTime}
                      onChange={(e) => setFStartTime(e.target.value)}
                      className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                    />
                    <button
                      type="button"
                      aria-label="시작 시간 선택"
                      onClick={() => startTimeRef.current?.showPicker()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                    >
                      <ClockIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 종료 */}
              <div>
                <p className={labelCls}>종료</p>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-[2]">
                    <input
                      ref={endDateRef}
                      type="date"
                      value={fEndDate}
                      min={fStartDate || undefined}
                      onChange={(e) => setFEndDate(e.target.value)}
                      className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                    />
                    <button
                      type="button"
                      aria-label="종료 날짜 선택"
                      onClick={() => endDateRef.current?.showPicker()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <input
                      ref={endTimeRef}
                      type="time"
                      value={fEndTime}
                      onChange={(e) => setFEndTime(e.target.value)}
                      className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                    />
                    <button
                      type="button"
                      aria-label="종료 시간 선택"
                      onClick={() => endTimeRef.current?.showPicker()}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                    >
                      <ClockIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 카테고리 */}
              <div>
                <p className={labelCls}>카테고리</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setFCat(c.key)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        fCat === c.key
                          ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright"
                          : "border-white/10 text-fg-muted"
                      }`}
                    >
                      <span className="text-[13px] leading-none">{c.emoji}</span>
                      {c.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 공유 범위 */}
              <div>
                <p className={labelCls}>공유 범위</p>
                <div className="grid grid-cols-2 gap-2">
                  {SCOPES.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setFScope(s.key)}
                      className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        fScope === s.key ? "border-primary/60 bg-primary/12" : "border-white/10"
                      }`}
                    >
                      <p className="flex items-center gap-1.5 text-[13px] font-bold">
                        <span className="text-xs leading-none">{s.emoji}</span>
                        <span className={fScope === s.key ? "text-primary-bright" : "text-fg"}>{s.key}</span>
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-fg-muted">{s.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 색상 */}
              <div>
                <p className={labelCls}>색상</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFColor(c)}
                      aria-label={`색상 ${c}`}
                      className="grid h-8 w-8 place-items-center rounded-full transition-transform"
                      style={{ backgroundColor: c }}
                    >
                      {fColor === c && <CheckIcon className="h-4 w-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 메모 */}
              <div>
                <p className={labelCls}>
                  메모 <span className="font-normal text-fg-muted">(선택)</span>
                </p>
                <textarea
                  value={fMemo}
                  onChange={(e) => setFMemo(e.target.value)}
                  rows={3}
                  placeholder="참석자·장소·준비물 등 상세 내용을 적어주세요"
                  className={`${fieldCls} resize-none`}
                />
              </div>
            </div>

            {/* 하단 버튼 */}
            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={submitAdd}
                disabled={!fTitle.trim() || !fStartDate}
                className="btn-primary flex-[2] py-2.5 text-sm"
              >
                일정 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
