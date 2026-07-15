"use client";

import type { ReactElement } from "react";
import { useNotifications } from "@/components/notifications";

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
function StoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 11v8a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-8" />
      <path d="M3.5 6h17l-.8 3.4A2.2 2.2 0 0 1 17.6 11H6.4a2.2 2.2 0 0 1-2.1-1.6L3.5 6Z" />
      <path d="M9.5 20v-4.5h5V20" />
    </svg>
  );
}
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
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
  onClick?: () => void;
};

export function QuickActions() {
  const { openPanel } = useNotifications();

  // TODO: 공지(알림 패널)만 실동작. 나머지는 해당 페이지/라우팅 생기면 onClick 연결.
  const items: Item[] = [
    { key: "tasks", label: "업무", color: "text-primary-bright", badge: 2, Icon: ChecklistIcon },
    { key: "projects", label: "프로젝트", color: "text-amber-300", badge: 2, Icon: FolderIcon },
    { key: "notes", label: "회의록", color: "text-sky-300", badge: 0, Icon: NoteIcon },
    { key: "notice", label: "공지", color: "text-emerald-300", badge: 1, Icon: MegaphoneIcon, onClick: openPanel },
    { key: "attendance", label: "근태", color: "text-rose-300", badge: 0, Icon: ClockIcon },
    { key: "staff", label: "직원", color: "text-violet-300", badge: 0, Icon: UsersIcon },
    { key: "branch", label: "지점", color: "text-teal-300", badge: 0, Icon: StoreIcon },
    { key: "dashboard", label: "대시보드", color: "text-orange-300", badge: 0, Icon: GridIcon },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-surface px-2 py-3.5">
      <div className="grid grid-cols-4 gap-y-4">
        {items.map(({ key, label, color, badge, Icon, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
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
