"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";

/* ── 아이콘 ─────────────────────────────────────── */
function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 7 1.5 1.5L7 6" />
      <path d="m3 16 1.5 1.5L7 15" />
      <path d="M11 7.5h9" />
      <path d="M11 16.5h9" />
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
function NoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9.5 12.5h5" />
      <path d="M9.5 16h5" />
    </svg>
  );
}
function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2.5l6 3.5v-11L6.5 10H4a1 1 0 0 0-1 1Z" />
      <path d="M16.5 9.5a3.5 3.5 0 0 1 0 5" />
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
function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}
function PayrollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5h.01" />
      <path d="M17.5 14.5h.01" />
    </svg>
  );
}
function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0Z" />
      <path d="M12 15v3" />
      <path d="M8.5 20.5h7" />
      <path d="M9.5 20.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" />
    </svg>
  );
}

/* ── 바로가기 8개 ───────────────────────────────── */
type Item = {
  key: string;
  label: string;
  color: string;
  badge: number;
  Icon: (p: { className?: string }) => ReactElement;
  href?: string;
  onClick?: () => void;
};

export function QuickActions() {
  const router = useRouter();

  // href 있으면 라우팅. 나머지(랭킹·급여)는 페이지 생기면 연결.
  const items: Item[] = [
    { key: "tasks", label: "업무", color: "text-primary-bright", badge: 2, Icon: ChecklistIcon, href: "/tasks" },
    { key: "projects", label: "프로젝트", color: "text-amber-300", badge: 2, Icon: FolderIcon, href: "/projects" },
    { key: "notes", label: "회의록", color: "text-sky-300", badge: 0, Icon: NoteIcon, href: "/notes" },
    { key: "attendance", label: "근태 월차", color: "text-rose-300", badge: 0, Icon: ClockIcon, href: "/attendance" },
    { key: "ranking", label: "랭킹", color: "text-orange-300", badge: 0, Icon: TrophyIcon },
    { key: "schedule", label: "일정", color: "text-violet-300", badge: 0, Icon: ScheduleIcon, href: "/schedule" },
    { key: "payroll", label: "급여", color: "text-teal-300", badge: 0, Icon: PayrollIcon },
    { key: "notice", label: "공지", color: "text-emerald-300", badge: 1, Icon: MegaphoneIcon, href: "/notices" },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-surface px-2 py-3.5">
      <div className="grid grid-cols-4 gap-y-4">
        {items.map(({ key, label, color, badge, Icon, href, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick ?? (href ? () => router.push(href) : undefined)}
            aria-label={label}
            className="flex flex-col items-center gap-1.5 py-1"
          >
            <span className="relative">
              <Icon className={`h-6 w-6 ${color}`} />
              {badge > 0 && (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
                  {badge}
                </span>
              )}
            </span>
            <span className="text-xs text-fg-muted">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
