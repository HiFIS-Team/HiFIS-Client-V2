"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function AllIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/tasks", label: "업무", Icon: TasksIcon },
  { href: "/projects", label: "프로젝트", Icon: ProjectsIcon },
  { href: "/notes", label: "회의록", Icon: NotesIcon },
  { href: "/my", label: "전체", Icon: AllIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav data-no-press className="kb-hide shrink-0 border-t border-white/10 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="flex px-1 pt-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const on = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} className="flex w-full flex-col items-center gap-1 pb-1.5">
                {/* 활성 탭: 아이콘 뒤 퍼플 알약 하이라이트 */}
                <span
                  className={`grid h-8 w-14 place-items-center rounded-full transition-all duration-200 ${
                    on ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon className={`h-[22px] w-[22px] transition-colors ${on ? "text-primary-bright" : "text-fg-muted"}`} />
                </span>
                <span className={`text-[11px] leading-none transition-colors ${on ? "font-semibold text-primary-bright" : "text-fg-muted"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
