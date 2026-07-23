"use client";

import { useRouter } from "next/navigation";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}

function CardHeader({ title, count, onMore }: { title: string; count: number; onMore: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
      <p className="text-sm font-bold">
        {title} <span className="ml-0.5 text-xs font-semibold text-fg-muted">{count}</span>
      </p>
      <button
        type="button"
        onClick={onMore}
        className="flex items-center gap-1 text-xs font-semibold text-fg-muted transition hover:text-fg"
      >
        전체
        <ArrowRightIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ── 오늘의 업무 ───────────────────────────────── */
type TodayTask = { emoji: string; title: string; bar: string; tag: string; tagCls: string; href: string };

const TODAY_TASKS: TodayTask[] = [
  { emoji: "🧺", title: "환경정비 반복 업무", bar: "bg-primary", tag: "반복", tagCls: "bg-primary/15 text-primary-bright", href: "/tasks" },
  { emoji: "🔧", title: "3층 시설 점검", bar: "bg-red-400", tag: "D-3", tagCls: "bg-red-500/12 text-red-400", href: "/projects" },
  { emoji: "🎟️", title: "여름 회원 이벤트 준비", bar: "bg-amber-400", tag: "D-7", tagCls: "bg-amber-400/12 text-amber-300", href: "/projects" },
];

export function TodayTasks() {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <CardHeader title="오늘의 업무" count={TODAY_TASKS.length} onMore={() => router.push("/tasks")} />
      {TODAY_TASKS.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-fg-muted">오늘 예정된 업무가 없어요.</p>
      ) : (
      <div className="divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => {
          const t = TODAY_TASKS[i];
          return t ? (
            <button
              key={t.title}
              type="button"
              onClick={() => router.push(t.href)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <span className={`h-8 w-1 shrink-0 rounded-full ${t.bar}`} />
              <span className="text-[15px] leading-none">{t.emoji}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{t.title}</span>
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.tagCls}`}>{t.tag}</span>
            </button>
          ) : (
            <div key={`empty-${i}`} className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
              <span className="h-8 w-1 shrink-0 rounded-full bg-white/5" />
              <span className="h-2.5 w-28 rounded-full bg-white/5" />
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}

/* ── 공지 ──────────────────────────────────────── */
type Notice = { pin?: boolean; title: string; author: string; time: string };

const NOTICES: Notice[] = [
  { pin: true, title: "8월 근무표 공지", author: "점장", time: "16시간 전" },
  { title: "여름 휴가 사용 가이드 — 6~8월", author: "본사", time: "2일 전" },
  { title: "신규 트레이너 환영 인사", author: "민준", time: "4일 전" },
  { title: "정수기 점검 예정 — 7/20 오전", author: "본사", time: "5일 전" },
];

export function NoticesCard() {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <CardHeader title="공지" count={NOTICES.length} onMore={() => router.push("/notices")} />
      {NOTICES.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-fg-muted">등록된 공지가 없어요.</p>
      ) : (
      <div className="divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => {
          const n = NOTICES[i];
          return n ? (
            <button
              key={n.title}
              type="button"
              onClick={() => router.push("/notices")}
              className="block w-full px-4 py-3 text-left"
            >
              <div className="flex items-center gap-1.5">
                {n.pin && (
                  <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    <BoltIcon className="h-2.5 w-2.5" />
                    고정
                  </span>
                )}
                <span className="min-w-0 truncate text-sm font-bold">{n.title}</span>
              </div>
              <p className="mt-1 text-[11px] text-fg-muted">
                {n.author} · {n.time}
              </p>
            </button>
          ) : (
            <div key={`empty-${i}`} className="px-4 py-3" aria-hidden="true">
              <span className="block h-3 w-32 rounded-full bg-white/5" />
              <span className="mt-1.5 block h-2 w-20 rounded-full bg-white/[0.04]" />
            </div>
          );
        })}
      </div>
      )}
    </section>
  );
}
