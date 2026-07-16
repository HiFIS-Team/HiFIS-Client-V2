"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";

/* ── 알림 목데이터 ─────────────────────────────── */
type NotifType = "project" | "task" | "note" | "attendance" | "notice";
type Notif = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
};

const NOTIFICATIONS: Notif[] = [
  { id: "1", type: "project", title: "여름 회원 이벤트 준비", body: "마감이 7일 남았습니다 (D-7). 진행 상황을 확인하세요.", time: "방금 전", unread: true },
  { id: "2", type: "task", title: "새 프로젝트 배정", body: "‘3층 시설 점검’ 담당자로 지정되었습니다.", time: "1시간 전", unread: true },
  { id: "3", type: "note", title: "회의록 등록", body: "7월 정기 회의록이 등록되었습니다.", time: "3시간 전", unread: false },
  { id: "4", type: "attendance", title: "출근 완료", body: "오늘 09:02에 출근이 기록되었습니다.", time: "오늘 09:02", unread: false },
  { id: "5", type: "notice", title: "공지사항", body: "8월 근무표가 공지되었습니다. 확인 후 조정 요청하세요.", time: "어제", unread: false },
];

/* ── Context ───────────────────────────────────── */
type Ctx = {
  open: boolean;
  openPanel: () => void;
  closePanel: () => void;
  hasUnseen: boolean;
};
const NotificationsContext = createContext<Ctx | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);

  const openPanel = () => {
    setOpen(true);
    setSeen(true); // 열면 벨 미확인 표시 제거
  };
  const closePanel = () => setOpen(false);
  const hasUnseen = !seen && NOTIFICATIONS.some((n) => n.unread);

  return (
    <NotificationsContext.Provider value={{ open, openPanel, closePanel, hasUnseen }}>
      {children}
      <NotificationPanel open={open} onClose={closePanel} />
    </NotificationsContext.Provider>
  );
}

/* ── 슬라이드 패널 (오른쪽 → 왼쪽) ───────────────── */
function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const unreadCount = NOTIFICATIONS.filter((n) => n.unread).length;
  const shown = tab === "all" ? NOTIFICATIONS : NOTIFICATIONS.filter((n) => n.unread);

  return (
    <div
      role="dialog"
      aria-label="알림"
      aria-hidden={!open}
      className={`absolute inset-0 z-50 flex flex-col bg-bg transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* 패널 헤더: 왼쪽 뒤로가기+제목 · 오른쪽 새로고침·설정 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
        <div className="flex items-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold">알림</h1>
        </div>
        <div className="flex items-center pr-1">
          <button type="button" aria-label="새로고침" className="grid h-10 w-9 place-items-center text-fg-muted transition hover:text-fg">
            <RefreshIcon className="h-5 w-5" />
          </button>
          <button type="button" aria-label="설정" className="grid h-10 w-9 place-items-center text-fg-muted transition hover:text-fg">
            <SettingsIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 전체 / 안읽음 탭 */}
      <div className="flex shrink-0 gap-4 border-b border-white/10 px-4">
        {(
          [
            ["all", "전체"],
            ["unread", "안읽음"],
          ] as const
        ).map(([key, label]) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative py-2.5 text-sm transition-colors ${
                on ? "font-bold text-fg" : "font-medium text-fg-muted"
              }`}
            >
              {label}
              {key === "unread" && unreadCount > 0 && (
                <span className="ml-1 font-bold text-primary-bright">{unreadCount}</span>
              )}
              {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* 알림 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {shown.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-fg-muted">안 읽은 알림이 없어요.</p>
        ) : (
        <ul className="divide-y divide-white/5">
          {shown.map((n) => {
            const { cls, Icon } = STYLE[n.type];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${
                    n.unread ? "bg-primary/[0.04]" : ""
                  }`}
                >
                  <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-fg">{n.title}</span>
                      {n.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-fg-muted">{n.body}</span>
                    <span className="mt-1 block text-xs text-fg-muted/70">{n.time}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        )}
      </div>
    </div>
  );
}

/* ── 아이콘 & 타입별 스타일 ───────────────────────── */
type IconType = (props: { className?: string }) => ReactElement;

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l1.7-1.3-1.7-3-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.2 3H9.8l-.6 2a7.6 7.6 0 0 0-2.6 1.5l-2-.8-1.7 3 1.7 1.3a7.6 7.6 0 0 0 0 3l-1.7 1.3 1.7 3 2-.8a7.6 7.6 0 0 0 2.6 1.5l.6 2h4.4l.6-2a7.6 7.6 0 0 0 2.6-1.5l2 .8 1.7-3-1.7-1.3Z" />
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
function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="m8.5 12 2.4 2.4L15.5 9.5" />
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
function BarcodeMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="6" width="1.5" height="12" rx=".3" />
      <rect x="7" y="6" width="1" height="12" rx=".3" />
      <rect x="9.5" y="6" width="2" height="12" rx=".3" />
      <rect x="13" y="6" width="1" height="12" rx=".3" />
      <rect x="15.5" y="6" width="1.5" height="12" rx=".3" />
      <rect x="18.5" y="6" width="1" height="12" rx=".3" />
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

const STYLE: Record<NotifType, { cls: string; Icon: IconType }> = {
  project: { cls: "bg-amber-400/15 text-amber-300", Icon: ClockIcon },
  task: { cls: "bg-primary/15 text-primary-bright", Icon: CheckSquareIcon },
  note: { cls: "bg-sky-400/15 text-sky-300", Icon: NoteIcon },
  attendance: { cls: "bg-emerald-400/15 text-emerald-300", Icon: BarcodeMiniIcon },
  notice: { cls: "bg-violet-400/15 text-violet-300", Icon: MegaphoneIcon },
};
