"use client";

import { useState } from "react";

type IconProps = { className?: string };

function HomeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.75 12 4l9 6.75" />
      <path d="M5.5 9.5V20h13V9.5" />
    </svg>
  );
}

function TasksIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="m8.5 12 2.4 2.4L15.5 9.5" />
    </svg>
  );
}

function ProjectsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h3.6l2 2.4h6.9A1.5 1.5 0 0 1 19 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 17.5Z" />
    </svg>
  );
}

function NotesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z" />
      <path d="M14 3.5V8h4" />
      <path d="M9.5 12.5h5" />
      <path d="M9.5 16h5" />
    </svg>
  );
}

function UserIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

const TABS = [
  { key: "home", label: "홈", Icon: HomeIcon },
  { key: "tasks", label: "업무", Icon: TasksIcon },
  { key: "projects", label: "프로젝트", Icon: ProjectsIcon },
  { key: "notes", label: "회의록", Icon: NotesIcon },
  { key: "my", label: "마이", Icon: UserIcon },
] as const;

export function BottomNav() {
  const [active, setActive] = useState<string>("home");

  return (
    <nav className="shrink-0 border-t border-white/10 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="flex">
        {TABS.map(({ key, label, Icon }) => {
          const on = key === active;
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => setActive(key)}
                className="relative flex w-full flex-col items-center gap-1 py-2.5"
              >
                {on && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary shadow-[0_0_8px_1px_rgba(157,59,252,0.8)]" />
                )}
                <Icon
                  className={`h-6 w-6 transition-colors ${on ? "text-primary" : "text-fg-muted"}`}
                />
                <span className={`text-[11px] transition-colors ${on ? "font-semibold text-primary" : "text-fg-muted"}`}>
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
