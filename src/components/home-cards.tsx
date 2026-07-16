"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications";

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CardHeader({ title, count, onMore }: { title: string; count: number; onMore: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
      <p className="text-[15px] font-bold">
        {title} <span className="ml-0.5 text-sm font-semibold text-fg-muted">{count}</span>
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
      <div className="divide-y divide-white/5">
        {TODAY_TASKS.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => router.push(t.href)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left"
          >
            <span className={`h-8 w-1 shrink-0 rounded-full ${t.bar}`} />
            <span className="text-base leading-none">{t.emoji}</span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t.title}</span>
            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${t.tagCls}`}>
              {t.tag}
            </span>
          </button>
        ))}
      </div>
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
  const { openPanel } = useNotifications();

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <CardHeader title="공지" count={NOTICES.length} onMore={openPanel} />
      <div className="divide-y divide-white/5">
        {NOTICES.map((n) => (
          <button
            key={n.title}
            type="button"
            onClick={openPanel}
            className="block w-full px-4 py-3 text-left"
          >
            <div className="flex items-center gap-1.5">
              {n.pin && (
                <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-400">
                  PIN
                </span>
              )}
              <span className="truncate text-[13px] font-medium">{n.title}</span>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              {n.author} · {n.time}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
