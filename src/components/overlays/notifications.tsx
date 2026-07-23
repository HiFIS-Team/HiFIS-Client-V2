"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useRefresh } from "@/hooks/use-refresh";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationDTO } from "@/lib/api/hifis";

/**
 * 알림함 — **백엔드 연동** (`GET /notifications`, `/read`, `/read-all`).
 * 승인·휴가·본사 등이 트리거하는 **개인 알림**(공지와 별개). Provider 가 데이터 소유.
 */

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
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [nowTs, setNowTs] = useState(0); // 패널 열 때 캡처(상대시간 기준) — 렌더에서 Date.now() 회피

  // 로그인되면 로드 (.then → set-state-in-effect 아님)
  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    listNotifications()
      .then((rows) => {
        if (alive) setItems(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [status]);

  const openPanel = () => {
    setNowTs(Date.now());
    setOpen(true);
  };
  const closePanel = () => setOpen(false);
  const reload = () => listNotifications().then(setItems).catch(() => {});

  const markRead = async (id: string) => {
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n))); // 낙관적
    try {
      await markNotificationRead(id);
    } catch {
      /* 무시 — 다음 로드에서 보정 */
    }
  };
  const markAllRead = async () => {
    setItems((l) => l.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      /* 무시 */
    }
  };

  const unreadCount = items.filter((n) => !n.read).length;
  const hasUnseen = unreadCount > 0;

  return (
    <NotificationsContext.Provider value={{ open, openPanel, closePanel, hasUnseen }}>
      {children}
      <NotificationPanel
        open={open}
        onClose={closePanel}
        items={items}
        unreadCount={unreadCount}
        nowTs={nowTs}
        markRead={markRead}
        markAllRead={markAllRead}
        reload={reload}
      />
    </NotificationsContext.Provider>
  );
}

/* ── 슬라이드 패널 (오른쪽 → 왼쪽) ───────────────── */
function NotificationPanel({
  open,
  onClose,
  items,
  unreadCount,
  nowTs,
  markRead,
  markAllRead,
  reload,
}: {
  open: boolean;
  onClose: () => void;
  items: NotificationDTO[];
  unreadCount: number;
  nowTs: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reload: () => void;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [tab, setTab] = useState<"all" | "unread">("all");
  const { busy, refresh } = useRefresh("알림을 새로고침했습니다");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const shown = tab === "all" ? items : items.filter((n) => !n.read);

  const onTap = (n: NotificationDTO) => {
    if (!n.read) markRead(n.id);
    if (n.link) {
      onClose();
      router.push(n.link);
    }
  };

  return (
    <div
      role="dialog"
      aria-label="알림"
      inert={!open}
      className={`absolute inset-0 z-50 flex flex-col bg-bg transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* 패널 헤더: 왼쪽 뒤로가기+제목 · 오른쪽 새로고침 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
        <div className="flex items-center">
          <button type="button" onClick={onClose} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold">알림</h1>
        </div>
        <div className="flex items-center pr-1">
          <button
            type="button"
            onClick={() => {
              reload();
              refresh();
            }}
            disabled={busy}
            aria-label="새로고침"
            className="grid h-10 w-9 place-items-center text-fg-muted transition hover:text-fg"
          >
            <RefreshIcon className={`h-5 w-5 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* 전체 / 안읽음 탭 + 모두 읽음 */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div className="flex gap-4">
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
                className={`relative py-2.5 text-sm transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
              >
                {label}
                {key === "unread" && unreadCount > 0 && <span className="ml-1 font-bold text-primary-bright">{unreadCount}</span>}
                {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => {
              markAllRead();
              show("모두 읽음 처리했습니다");
            }}
            className="text-xs font-semibold text-fg-muted transition hover:text-primary-bright"
          >
            모두 읽음
          </button>
        )}
      </div>

      {/* 알림 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {shown.length === 0 ? (
          <div className="px-4 pt-3">
            <p className="rounded-2xl border border-white/10 bg-surface px-4 py-16 text-center text-sm text-fg-muted">
              {tab === "unread" ? "안 읽은 알림이 없어요." : "받은 알림이 없어요."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {shown.map((n) => {
              const { cls, Icon } = styleFor(n.type);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => onTap(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition ${!n.read ? "bg-primary/[0.04]" : ""}`}
                  >
                    <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${cls}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-fg">{n.title}</span>
                        {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </span>
                      {n.body && <span className="mt-0.5 block text-sm leading-snug text-fg-muted">{n.body}</span>}
                      <span className="mt-1 block text-xs text-fg-muted/70">{nowTs ? relTime(n.createdAt, nowTs) : ""}</span>
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

// ISO → 상대시간 (now 는 패널 열 때 캡처값 — 렌더에서 Date.now() 안 씀)
function relTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const dt = new Date(iso);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
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
function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2.5l6 3.5v-11L6.5 10H4a1 1 0 0 0-1 1Z" />
      <path d="M16.5 9.5a3.5 3.5 0 0 1 0 5" />
    </svg>
  );
}
function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  );
}

// 백엔드 type(자유 문자열) → 아이콘·색 (모르는 type 은 기본 벨)
function styleFor(type: string): { cls: string; Icon: IconType } {
  switch (type) {
    case "APPROVAL":
      return { cls: "bg-primary/15 text-primary-bright", Icon: CheckSquareIcon };
    case "LEAVE":
      return { cls: "bg-amber-400/15 text-amber-300", Icon: ClockIcon };
    case "HQ":
      return { cls: "bg-violet-400/15 text-violet-300", Icon: MegaphoneIcon };
    default:
      return { cls: "bg-sky-400/15 text-sky-300", Icon: BellIcon };
  }
}
