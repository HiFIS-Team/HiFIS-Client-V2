"use client";

import type { ReactElement } from "react";
import { useNotifications } from "@/components/notifications";

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

  // TODO: 업무/프로젝트/회의록은 해당 페이지 생기면 라우팅 연결 (지금은 자리표시자)
  const items: Item[] = [
    { key: "tasks", label: "업무", color: "text-primary-bright", badge: 2, Icon: ChecklistIcon },
    { key: "projects", label: "프로젝트", color: "text-amber-300", badge: 2, Icon: FolderIcon },
    { key: "notes", label: "회의록", color: "text-sky-300", badge: 0, Icon: NoteIcon },
    { key: "notice", label: "공지", color: "text-emerald-300", badge: 1, Icon: MegaphoneIcon, onClick: openPanel },
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-surface px-2 py-3">
      <div className="grid grid-cols-4">
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
