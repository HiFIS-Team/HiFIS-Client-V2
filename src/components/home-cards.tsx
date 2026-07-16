"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/components/notifications";

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/* ── 오늘의 업무 ───────────────────────────────── */
type TodayTask = { title: string; tag: string; tagCls: string; dot: string; href: string };

const TODAY_TASKS: TodayTask[] = [
  { title: "환경정비 반복 업무", tag: "반복", tagCls: "bg-primary/15 text-primary-bright", dot: "bg-primary", href: "/tasks" },
  { title: "3층 시설 점검", tag: "D-3", tagCls: "bg-red-500/12 text-red-400", dot: "bg-red-400", href: "/projects" },
  { title: "여름 회원 이벤트 준비", tag: "D-7", tagCls: "bg-amber-400/12 text-amber-300", dot: "bg-amber-400", href: "/projects" },
];

export function TodayTasks() {
  const router = useRouter();

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <div className="flex items-center justify-between px-3.5 pb-1.5 pt-3">
        <p className="text-sm font-semibold">오늘의 업무</p>
        <button
          type="button"
          onClick={() => router.push("/tasks")}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary-bright"
        >
          전체 보기
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {TODAY_TASKS.map((t) => (
          <button
            key={t.title}
            type="button"
            onClick={() => router.push(t.href)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</span>
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${t.tagCls}`}>
              {t.tag}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ── 공지 ──────────────────────────────────────── */
const NOTICES = [
  { title: "8월 근무표 공지", time: "어제" },
  { title: "여름 휴가 신청 안내", time: "2일 전" },
  { title: "락커룸 점검 일정 변경", time: "3일 전" },
];

export function NoticesCard() {
  const { openPanel } = useNotifications();

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <div className="flex items-center justify-between px-3.5 pb-1.5 pt-3">
        <p className="text-sm font-semibold">공지</p>
        <button
          type="button"
          onClick={openPanel}
          className="flex items-center gap-0.5 text-xs font-semibold text-primary-bright"
        >
          전체 보기
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="divide-y divide-white/5">
        {NOTICES.map((n) => (
          <button
            key={n.title}
            type="button"
            onClick={openPanel}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{n.title}</span>
            <span className="shrink-0 text-xs text-fg-muted">{n.time}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
