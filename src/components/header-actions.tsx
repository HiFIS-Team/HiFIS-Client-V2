"use client";

import { useNotifications } from "@/components/notifications";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  );
}
function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export function HeaderActions() {
  const { openPanel, hasUnseen } = useNotifications();

  const btn = "relative grid h-9 w-8 place-items-center text-fg-muted transition hover:text-fg";

  return (
    <div className="flex items-center gap-0.5">
      {/* 검색 (자리표시자) */}
      <button type="button" aria-label="검색" className={btn}>
        <SearchIcon className="h-5 w-5" />
      </button>

      {/* 채팅 (자리표시자) */}
      <button type="button" aria-label="채팅" className={btn}>
        <ChatIcon className="h-5 w-5" />
      </button>

      {/* 알림 — 패널 열기 + 미확인 점 */}
      <button type="button" onClick={openPanel} aria-label="알림" className={btn}>
        <BellIcon className="h-5 w-5" />
        {hasUnseen && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-surface" />
        )}
      </button>

      {/* 프로필 (자리표시자) */}
      <button type="button" aria-label="프로필" className={btn}>
        <ProfileIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
