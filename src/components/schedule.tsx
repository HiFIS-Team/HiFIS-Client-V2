"use client";

import { useEffect, useRef, useState } from "react";

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

/* ── 카테고리 ───────────────────────────────────── */
type Cat = "회의" | "교육" | "행사" | "점검" | "기타";
const CATS: Cat[] = ["회의", "교육", "행사", "점검", "기타"];
const CAT_STYLE: Record<Cat, { dot: string; text: string; bg: string; emoji: string }> = {
  회의: { dot: "bg-primary", text: "text-primary-bright", bg: "bg-primary/12", emoji: "🗓️" },
  교육: { dot: "bg-sky-400", text: "text-sky-300", bg: "bg-sky-400/12", emoji: "📘" },
  행사: { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-400/12", emoji: "🎉" },
  점검: { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-400/12", emoji: "🔧" },
  기타: { dot: "bg-slate-400", text: "text-slate-300", bg: "bg-slate-400/12", emoji: "📌" },
};

/* ── 목 일정 (offset = 오늘 기준 일수) ──────────── */
type Ev = { id: string; title: string; emoji: string; cat: Cat; offset: number; time: string };

const SEED: Ev[] = [
  { id: "e1", title: "주간 운영 회의", emoji: "🗓️", cat: "회의", offset: 0, time: "10:00" },
  { id: "e2", title: "신입 트레이너 교육", emoji: "📘", cat: "교육", offset: 0, time: "14:00" },
  { id: "e3", title: "런닝머신 정기 점검", emoji: "🔧", cat: "점검", offset: 1, time: "09:30" },
  { id: "e4", title: "회원 이벤트 준비", emoji: "🎉", cat: "행사", offset: 2, time: "13:00" },
  { id: "e5", title: "지점장 미팅", emoji: "🗓️", cat: "회의", offset: 2, time: "17:00" },
  { id: "e6", title: "여름 리뉴얼 중간 점검", emoji: "🔧", cat: "점검", offset: 4, time: "11:00" },
  { id: "e7", title: "월말 정산 회의", emoji: "🗓️", cat: "회의", offset: 7, time: "16:00" },
  { id: "e8", title: "GX 신규 프로그램 설명회", emoji: "📘", cat: "교육", offset: 9, time: "15:00" },
  { id: "e9", title: "안전 교육", emoji: "📘", cat: "교육", offset: -3, time: "10:00" },
  { id: "e10", title: "비품 재고 점검", emoji: "🔧", cat: "점검", offset: -1, time: "18:00" },
];

/* ── 날짜 유틸 ──────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const addMonths = (d: Date, n: number) => {
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return x;
};
const startOfWeek = (d: Date) => addDays(d, -d.getDay());
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const ampm = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const p = h < 12 ? "오전" : "오후";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${p} ${hh}:${pad(m)}`;
};

export function SchedulePage() {
  const [today, setToday] = useState<Date | null>(null);
  const [cursor, setCursor] = useState<Date | null>(null); // 표시 중인 달/주 기준
  const [selected, setSelected] = useState<string | null>(null); // "YYYY-MM-DD"
  const [view, setView] = useState<"월" | "주">("월");
  const [events, setEvents] = useState<Ev[]>(SEED);

  // 추가 모달
  const [addOpen, setAddOpen] = useState(false);
  const [fTitle, setFTitle] = useState("");
  const [fCat, setFCat] = useState<Cat>("회의");
  const [fDate, setFDate] = useState("");
  const [fTime, setFTime] = useState("10:00");
  const dateRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
    setCursor(d);
    setSelected(iso(d));
  }, []);

  // ESC로 모달 닫기
  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  if (!today || !cursor || !selected) {
    return <div className="px-4 pt-5" />;
  }

  // offset → 실제 날짜(ISO) 맵
  const dateOf = (offset: number) => iso(addDays(today, offset));
  const byDate = new Map<string, Ev[]>();
  for (const e of events) {
    const key = dateOf(e.offset);
    const arr = byDate.get(key);
    if (arr) arr.push(e);
    else byDate.set(key, [e]);
  }
  for (const arr of byDate.values()) arr.sort((a, b) => a.time.localeCompare(b.time));

  /* 달력 셀 만들기 */
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

  /* 다가오는 일정 = 선택일 이후, 날짜별 그룹 */
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
    setFDate(selected);
    setFTime("10:00");
    setAddOpen(true);
  };

  const submitAdd = () => {
    const title = fTitle.trim();
    if (!title || !fDate) return;
    const target = new Date(`${fDate}T00:00:00`);
    const offset = Math.round((target.getTime() - today.getTime()) / 86400000);
    idRef.current += 1;
    setEvents((l) => [
      ...l,
      { id: `new-${idRef.current}`, title, emoji: CAT_STYLE[fCat].emoji, cat: fCat, offset, time: fTime || "10:00" },
    ]);
    setSelected(fDate);
    setCursor(target);
    setAddOpen(false);
  };

  const todayIso = iso(today);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <h1 className="text-xl font-bold">일정</h1>

      {/* 월/주 토글(왼쪽) + 이동·추가(가운데) */}
      <div className="relative flex h-8 items-center">
        <div className="flex overflow-hidden rounded-lg border border-white/10">
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

        <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="이전"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button type="button" onClick={goToday} className="whitespace-nowrap px-1.5 text-sm font-semibold tabular-nums">
            {label}
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            aria-label="다음"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-fg-muted"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openAdd}
            aria-label="일정 추가"
            className="btn-primary grid h-8 w-8 place-items-center"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 달력 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        {/* 요일 */}
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

        {/* 날짜 */}
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
                    isToday
                      ? "bg-primary text-white"
                      : dow === 0
                        ? "text-red-400"
                        : dow === 6
                          ? "text-sky-400"
                          : "text-fg"
                  }`}
                >
                  {d.getDate()}
                </span>
                <span className="flex items-center gap-0.5">
                  {evs.slice(0, 3).map((e) => (
                    <span key={e.id} className={`h-1.5 w-1.5 rounded-full ${CAT_STYLE[e.cat].dot}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 다가오는 일정 */}
      <section className="rounded-2xl border border-white/10 bg-surface px-4 py-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-bold">다가오는 일정</h2>
          <span className="text-xs text-fg-muted">{upcoming.length}건</span>
        </div>

        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">예정된 일정이 없어요.</p>
        ) : (
          <div className="mt-2 divide-y divide-white/5">
            {groups.map((g) => {
              const d = new Date(`${g.date}T00:00:00`);
              const isToday = g.date === todayIso;
              return (
                <div key={g.date} className="flex gap-3 py-3">
                  {/* 날짜 열 */}
                  <div className="w-8 shrink-0 text-center">
                    <p className={`text-lg font-bold tabular-nums ${isToday ? "text-primary-bright" : "text-fg"}`}>
                      {d.getDate()}
                    </p>
                    <p className="text-[11px] text-fg-muted">{WEEKDAYS[d.getDay()]}</p>
                  </div>

                  {/* 일정들 */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {g.list.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-lg border border-white/8 bg-surface-2 px-2.5 py-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${CAT_STYLE[e.cat].dot}`} />
                        <span className="shrink-0 text-sm">{e.emoji}</span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{e.title}</span>
                        <span className="shrink-0 text-[11px] text-fg-muted tabular-nums">{ampm(e.time)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 일정 추가 모달 */}
      {addOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setAddOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            {/* 그라데이션 헤더 */}
            <div className="bg-[linear-gradient(120deg,#6d1cf0,#a855f7)] px-4 py-3.5">
              <p className="text-[10px] font-bold tracking-widest text-white/70">NEW EVENT</p>
              <p className="text-base font-bold text-white">일정 추가</p>
            </div>

            <div className="space-y-3 p-4">
              {/* 종류 */}
              <div>
                <p className="pb-1.5 text-[11px] font-semibold text-fg-muted">종류</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {CATS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFCat(c)}
                      className={`flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors ${
                        fCat === c ? "border-primary/50 bg-primary/12" : "border-white/10"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${CAT_STYLE[c].dot}`} />
                      <span className={`text-[11px] ${fCat === c ? "font-semibold text-primary-bright" : "text-fg-muted"}`}>{c}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <p className="pb-1.5 text-[11px] font-semibold text-fg-muted">제목</p>
                <input
                  autoFocus
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="일정 제목을 입력하세요"
                  className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-[13px] outline-none focus:border-primary/50"
                />
              </div>

              {/* 날짜 · 시간 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="pb-1.5 text-[11px] font-semibold text-fg-muted">날짜</p>
                  <div className="relative">
                    <input
                      ref={dateRef}
                      type="date"
                      value={fDate}
                      onChange={(e) => setFDate(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 pr-8 text-[13px] outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                    <button
                      type="button"
                      aria-label="날짜 선택"
                      onClick={() => dateRef.current?.showPicker()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted"
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="pb-1.5 text-[11px] font-semibold text-fg-muted">시간</p>
                  <div className="relative">
                    <input
                      type="time"
                      value={fTime}
                      onChange={(e) => setFTime(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-bg px-3 py-2 pr-8 text-[13px] outline-none focus:border-primary/50 [&::-webkit-calendar-picker-indicator]:opacity-0"
                    />
                    <ClockIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1 py-2 text-[13px]">
                  취소
                </button>
                <button type="button" onClick={submitAdd} disabled={!fTitle.trim() || !fDate} className="btn-primary flex-1 py-2 text-[13px]">
                  추가하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
