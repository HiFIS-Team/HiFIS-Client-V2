"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useToast } from "@/components/ui/toast";
import { useSheet } from "@/hooks/use-sheet";
import { useAuth } from "@/providers/auth";
import { API_BASE, getAccessToken } from "@/lib/api/client";
import {
  createChatRoom,
  listChatMessages,
  listChatRooms,
  listEmployees,
  markChatRoomRead,
  sendChatMessage,
  toggleReaction,
  type ChatRoomDTO,
  type EmployeeLite,
  type MessageDTO,
  type ReactionAgg,
} from "@/lib/api/hifis";

/**
 * 사내톡 — 백엔드 연동 (REST /chat + WebSocket /ws/chat).
 *
 * - 방/히스토리/전송(영속)·읽음은 REST, 실시간 수신은 WS.
 * - 메시지는 REST/WS 어느 쪽으로 보내도 서버가 **본인 포함 전원에게 WS 브로드캐스트** → 에코로 렌더(중복 없음).
 * - 이름/아바타색은 로스터(listEmployees)로 해석. DM 방 이름은 상대 이름.
 * - ⚠️ 읽음 표시(누가 읽음)·타이핑은 v1 미표시(백엔드 이벤트는 있으나 표시 생략).
 */

const QUICK_EMOJI = ["❤️", "😂", "😮", "😢", "🙏", "👍"];
const MORE_EMOJI = [
  "😀", "😅", "🥹", "😍", "🤔", "😴", "🤯", "🥳",
  "😭", "😤", "🙄", "😎", "🫡", "🤝", "👏", "💪",
  "🔥", "✨", "💯", "✅", "❌", "⚠️", "📌", "⏰",
  "🧺", "🧹", "🏋️", "🥤", "🍀", "🎉", "💜", "☕",
];

const RANK_KO: Record<string, string> = {
  JUNIOR_TRAINER: "주니어 트레이너",
  PRO_TRAINER: "프로 트레이너",
  PRO1_TRAINER: "프로1 트레이너",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  FC: "FC",
};

const pad = (n: number) => String(n).padStart(2, "0");
// ISO → "오전 2:25"
function clock(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

const AVA_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
function hashColor(key: string) {
  let h = 0;
  for (const c of key) h += c.charCodeAt(0);
  return AVA_COLORS[h % AVA_COLORS.length];
}

/* ── 아이콘 ─────────────────────────────────────── */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}
function PersonPlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 10 0" />
      <path d="M18 8v6M15 11h6" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l16-8-6 16-3-6-7-2Z" />
    </svg>
  );
}
function PeopleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.5 5.2a3.2 3.2 0 0 1 0 5.9" />
      <path d="M18.2 13.6a5.4 5.4 0 0 1 3 4.6" />
    </svg>
  );
}
function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 7.5 7 11l5-6 5 6 4-3.5-1.6 10H4.6L3 7.5Z" />
    </svg>
  );
}
function PeopleMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="8.5" cy="9" r="2.4" />
      <circle cx="15.5" cy="9" r="2.4" />
      <path d="M3.5 17.5a5 5 0 0 1 9 0Z" />
      <path d="M11.5 17.5a5 5 0 0 1 9 0Z" />
    </svg>
  );
}
function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11.5 12 19.5a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10.4 18a1.6 1.6 0 0 1-2.3-2.3l7.4-7.4" />
    </svg>
  );
}

/* ── Context ───────────────────────────────────── */
type Ctx = { open: boolean; openChat: () => void; closeChat: () => void; unread: number };
const ChatContext = createContext<Ctx | null>(null);
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [open, setOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoomDTO[]>([]);

  // authed 시 방 목록 로드(헤더 배지용). .then → set-state-in-effect 아님
  useEffect(() => {
    if (status !== "authed") return;
    let alive = true;
    listChatRooms()
      .then((rs) => {
        if (alive) setRooms(rs);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [status]);

  const unread = rooms.reduce((a, r) => a + r.unreadCount, 0);

  return (
    <ChatContext.Provider value={{ open, openChat: () => setOpen(true), closeChat: () => setOpen(false), unread }}>
      {children}
      <ChatPanel open={open} onClose={() => setOpen(false)} rooms={rooms} setRooms={setRooms} />
    </ChatContext.Provider>
  );
}

/* ── 패널 ──────────────────────────────────────── */
function ChatPanel({
  open,
  onClose,
  rooms,
  setRooms,
}: {
  open: boolean;
  onClose: () => void;
  rooms: ChatRoomDTO[];
  setRooms: Dispatch<SetStateAction<ChatRoomDTO[]>>;
}) {
  const { show } = useToast();
  const { user } = useAuth();
  const myId = user?.id ?? "";

  const [roster, setRoster] = useState<Record<string, EmployeeLite>>({});
  const [msgsByRoom, setMsgsByRoom] = useState<Record<string, MessageDTO[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const memberSheet = useSheet(membersOpen);
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [createQuery, setCreateQuery] = useState("");

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const activeIdRef = useRef<string | null>(null);

  // 이름·색 해석 (로스터)
  const nameOf = (id: string) => roster[id]?.name ?? "직원";
  const colorOf = (id: string) => roster[id]?.avatarColor ?? hashColor(id);
  const otherId = (r: ChatRoomDTO) => r.memberIds.find((x) => x !== myId) ?? r.memberIds[0] ?? "";
  const isGroup = (r: ChatRoomDTO) => r.isGroup || r.memberIds.length > 2;
  const roomTitle = (r: ChatRoomDTO) => r.name ?? nameOf(otherId(r));
  const roomColor = (r: ChatRoomDTO) => (isGroup(r) ? hashColor(r.id) : colorOf(otherId(r)));

  const activeRoom = activeId ? rooms.find((r) => r.id === activeId) ?? null : null;
  const messages = activeId ? msgsByRoom[activeId] ?? [] : [];
  const totalUnread = rooms.reduce((a, r) => a + r.unreadCount, 0);

  // activeId 를 ref 로 미러 (WS 핸들러가 최신 활성방을 참조 — WS 재생성 없이)
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 열 때: 로스터 + 방 목록 새로고침. .then → set-state-in-effect 아님
  useEffect(() => {
    if (!open) return;
    let alive = true;
    listEmployees()
      .then((emps) => {
        if (alive) setRoster(Object.fromEntries(emps.map((e) => [e.id, e])));
      })
      .catch(() => {});
    listChatRooms()
      .then((rs) => {
        if (alive) setRooms(rs);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, setRooms]);

  // WebSocket — 열려 있는 동안 연결. 핸들러의 setState 는 이벤트 콜백이라 set-state-in-effect 아님
  useEffect(() => {
    if (!open || !myId) return;
    const token = getAccessToken();
    if (!token) return;
    const url = `${API_BASE.replace(/^http/, "ws")}/ws/chat?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = (ev) => {
      let data: { type?: string; roomId?: string; message?: MessageDTO };
      try {
        data = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (data.type !== "message" || !data.message) return;
      const msg = data.message;
      setMsgsByRoom((cur) => {
        const list = cur[msg.roomId] ?? [];
        if (list.some((m) => m.id === msg.id)) return cur; // 중복 방지
        return { ...cur, [msg.roomId]: [...list, msg] };
      });
      const isActive = activeIdRef.current === msg.roomId;
      setRooms((list) =>
        list.map((r) =>
          r.id === msg.roomId
            ? { ...r, lastMessage: msg, updatedAt: msg.createdAt, unreadCount: isActive || msg.senderId === myId ? 0 : r.unreadCount + 1 }
            : r,
        ),
      );
      if (isActive && msg.senderId !== myId) markChatRoomRead(msg.roomId).catch(() => {});
    };
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
    };
    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [open, myId, setRooms]);

  // 방 열림/메시지 변경 시 맨 아래로
  useEffect(() => {
    if (activeId && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [activeId, messages.length]);

  // 키보드 올라오면 다시 맨 아래로
  useEffect(() => {
    if (!activeId) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const toBottom = () => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    };
    vv.addEventListener("resize", toBottom);
    return () => vv.removeEventListener("resize", toBottom);
  }, [activeId]);

  // ESC: 모달 > 방 > 패널 순
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (membersOpen) setMembersOpen(false);
      else if (createOpen) setCreateOpen(false);
      else if (activeId) setActiveId(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeId, createOpen, membersOpen, onClose]);

  const openRoom = (id: string) => {
    setActiveId(id);
    setDraft("");
    setRooms((list) => list.map((r) => (r.id === id ? { ...r, unreadCount: 0 } : r)));
    listChatMessages(id)
      .then((msgs) => setMsgsByRoom((cur) => ({ ...cur, [id]: msgs })))
      .catch(() => {});
    markChatRoomRead(id).catch(() => {});
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "message", roomId: activeId, body: text })); // 에코로 렌더됨
    } else {
      const roomId = activeId;
      sendChatMessage(roomId, { body: text })
        .then((msg) => {
          setMsgsByRoom((cur) => {
            const list = cur[roomId] ?? [];
            if (list.some((m) => m.id === msg.id)) return cur;
            return { ...cur, [roomId]: [...list, msg] };
          });
          setRooms((list) => list.map((r) => (r.id === roomId ? { ...r, lastMessage: msg, updatedAt: msg.createdAt } : r)));
        })
        .catch(() => show("전송에 실패했어요", "cancel"));
    }
    setDraft("");
  };

  const react = (msgId: string, emoji: string) => {
    if (!activeId) return;
    const roomId = activeId;
    toggleReaction({ targetType: "MESSAGE", targetId: msgId, emoji })
      .then((res) => {
        setMsgsByRoom((cur) => {
          const list = cur[roomId] ?? [];
          return { ...cur, [roomId]: list.map((m) => (m.id === msgId ? { ...m, reactions: res.reactions } : m)) };
        });
      })
      .catch(() => {});
    setPickerFor(null);
    setMoreOpen(false);
  };

  const startPress = (id: string) => {
    endPress();
    pressTimer.current = setTimeout(() => {
      setMoreOpen(false);
      setPickerFor(id);
    }, 420);
  };
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const onTapMessage = (id: string, t: number) => {
    if (lastTap.current && lastTap.current.id === id && t - lastTap.current.t < 300) {
      react(id, "❤️");
      lastTap.current = null;
      return;
    }
    lastTap.current = { id, t };
  };

  const toggleMember = (id: string) => setMembers((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const openCreate = () => {
    setRoomName("");
    setMembers([]);
    setCreateQuery("");
    setCreateOpen(true);
  };

  const createRoom = () => {
    if (members.length === 0) return;
    const name = roomName.trim() || undefined;
    createChatRoom({ memberIds: members, name, isGroup: members.length > 1 || !!name })
      .then((room) => {
        setRooms((list) => [room, ...list.filter((r) => r.id !== room.id)]);
        setCreateOpen(false);
        openRoom(room.id);
        show(`${roomTitle(room)} 채팅방을 만들었습니다`);
      })
      .catch(() => show("채팅방 생성에 실패했어요", "cancel"));
  };

  const q = query.trim();
  const shownRooms = rooms.filter((r) => q === "" || roomTitle(r).includes(q) || (r.lastMessage?.body.includes(q) ?? false));

  const cq = createQuery.trim();
  const pickPeople = Object.values(roster)
    .filter((e) => e.id !== myId)
    .filter((e) => cq === "" || e.name.includes(cq) || (e.team ?? "").includes(cq) || (RANK_KO[e.rank] ?? e.rank).includes(cq));

  const orderedMembers = activeRoom
    ? [...activeRoom.memberIds].sort((a, b) => {
        const rk = (id: string) => (id === activeRoom.ownerId ? 0 : id === myId ? 1 : 2);
        return rk(a) - rk(b);
      })
    : [];

  const iconBtn = "grid h-10 w-10 shrink-0 place-items-center text-fg-muted transition hover:text-fg";

  return (
    <div
      role="dialog"
      aria-label="사내톡"
      inert={!open}
      className={`absolute inset-0 z-[60] flex flex-col bg-bg transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* 목록 헤더 */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
        <div className="flex items-center">
          <button type="button" onClick={onClose} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="text-base font-semibold">사내톡</h1>
          {totalUnread > 0 && (
            <span className="ml-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
              {totalUnread}
            </span>
          )}
        </div>
        <div className="flex items-center pr-1">
          <button type="button" onClick={openCreate} aria-label="새 채팅" className="grid h-10 w-9 place-items-center text-fg-muted transition hover:text-fg">
            <PersonPlusIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 검색 */}
      <div className="shrink-0 px-4 pb-2 pt-3">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 · 메시지 검색"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
          />
        </div>
      </div>

      {/* 방 목록 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2">
        {shownRooms.length === 0 ? (
          <p className="px-2 pt-8 text-center text-sm text-fg-muted">대화가 없어요.</p>
        ) : (
          shownRooms.map((r) => {
            const last = r.lastMessage;
            const group = isGroup(r);
            return (
              <button key={r.id} type="button" onClick={() => openRoom(r.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left">
                <span className="relative shrink-0">
                  <span className="grid h-14 w-14 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: roomColor(r) }}>
                    {roomTitle(r).charAt(0)}
                  </span>
                  {group ? (
                    <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary ring-2 ring-bg">
                      <PeopleMiniIcon className="h-3 w-3 text-white" />
                    </span>
                  ) : (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-bg" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-base font-bold">{roomTitle(r)}</span>
                      {group && <span className="shrink-0 text-xs font-semibold text-fg-muted">{r.memberIds.length}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{last ? clock(last.createdAt) : ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-fg-muted">
                      {last ? (last.senderId === myId ? "나: " : "") + last.body : "대화를 시작해보세요"}
                    </span>
                    {r.unreadCount > 0 && (
                      <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                        {r.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 채팅방 (목록 위로 슬라이드) */}
      <div
        inert={!activeId}
        className={`absolute inset-0 z-10 flex flex-col bg-bg transition-transform duration-300 ease-out ${
          activeId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => {
              setMembersOpen(false);
              setActiveId(null);
            }}
            aria-label="뒤로"
            className={iconBtn}
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          {activeRoom && (
            <>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: roomColor(activeRoom) }}>
                {roomTitle(activeRoom).charAt(0)}
              </span>
              <p className="min-w-0 flex-1 truncate text-base font-bold">{roomTitle(activeRoom)}</p>
              <button type="button" onClick={() => setMembersOpen(true)} aria-label="참여자 보기" className={iconBtn}>
                <PeopleIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </header>

        {pickerFor && (
          <button
            type="button"
            aria-label="닫기"
            onClick={() => {
              setPickerFor(null);
              setMoreOpen(false);
            }}
            className="absolute inset-0 z-20"
          />
        )}

        <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-4">
          {activeRoom && messages.length === 0 && <p className="pt-10 text-center text-sm text-fg-muted">첫 메시지를 보내보세요.</p>}
          {activeRoom &&
            messages.map((m, i) => {
              const mine = m.senderId === myId;
              const prev = messages[i - 1];
              const firstOfRun = !prev || (prev.senderId === myId) !== mine || prev.senderId !== m.senderId;
              const group = isGroup(activeRoom);

              const reactions = m.reactions.length > 0 && (
                <div className={`mt-1 flex gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                  {m.reactions.map((r: ReactionAgg) => {
                    const count = r.employeeIds.length;
                    const rmine = r.employeeIds.includes(myId);
                    return (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => react(m.id, r.emoji)}
                        className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors ${
                          rmine ? "border-primary/60 bg-primary/15" : "border-white/10 bg-surface-2"
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className={rmine ? "font-bold text-primary-bright" : "text-fg-muted"}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              );
              const time = <span className="mb-0.5 shrink-0 text-[10px] text-fg-muted">{clock(m.createdAt)}</span>;

              const pressProps = {
                onPointerDown: () => startPress(m.id),
                onPointerUp: endPress,
                onPointerLeave: endPress,
                onPointerCancel: endPress,
                onClick: (e: React.MouseEvent) => onTapMessage(m.id, e.timeStamp),
                onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
              };

              const picker =
                pickerFor === m.id &&
                (moreOpen ? (
                  <div className={`absolute bottom-full z-30 mb-2 w-64 rounded-2xl border border-white/12 bg-surface-2 p-2 shadow-2xl ${mine ? "right-0" : "left-0"}`}>
                    <div className="grid grid-cols-8 gap-0.5">
                      {MORE_EMOJI.map((e) => (
                        <button key={e} type="button" onClick={() => react(m.id, e)} className="grid h-7 w-7 place-items-center rounded-lg text-base">
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`absolute -top-11 z-30 flex items-center gap-0.5 rounded-full border border-white/12 bg-surface-2 px-1.5 py-1 shadow-2xl ${mine ? "right-0" : "left-0"}`}>
                    {QUICK_EMOJI.map((e) => (
                      <button key={e} type="button" onClick={() => react(m.id, e)} className="grid h-8 w-8 place-items-center rounded-full text-lg">
                        {e}
                      </button>
                    ))}
                    <button type="button" onClick={() => setMoreOpen(true)} aria-label="이모지 더보기" className="grid h-8 w-8 place-items-center rounded-full bg-white/8 text-fg-muted">
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                ));

              if (mine) {
                return (
                  <div key={m.id} className="flex items-end justify-end gap-1.5">
                    {time}
                    <div className="relative flex max-w-[72%] flex-col items-end">
                      {picker}
                      <div {...pressProps} className="no-callout select-none rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-sm leading-snug text-white">
                        {m.body}
                      </div>
                      {reactions}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex items-end justify-start gap-2">
                  {firstOfRun ? (
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: colorOf(m.senderId) }}>
                      {nameOf(m.senderId).charAt(0)}
                    </span>
                  ) : (
                    <span className="w-8 shrink-0" />
                  )}
                  <div className="relative flex max-w-[72%] flex-col items-start">
                    {firstOfRun && group && <span className="mb-0.5 px-1 text-[11px] text-fg-muted">{nameOf(m.senderId)}</span>}
                    {picker}
                    <div {...pressProps} className="no-callout select-none rounded-2xl rounded-tl-md bg-surface-2 px-3 py-2 text-sm leading-snug text-fg">
                      {m.body}
                    </div>
                    {reactions}
                  </div>
                  {time}
                </div>
              );
            })}
        </div>

        <div className="kb-safe shrink-0 border-t border-white/10 bg-surface/80 px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-white/10 bg-bg pl-4 pr-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  send();
                }}
                placeholder="메시지를 입력하세요"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-fg-muted"
              />
              <button type="button" aria-label="첨부" className="grid h-8 w-8 shrink-0 place-items-center text-fg-muted">
                <PaperclipIcon className="h-5 w-5" />
              </button>
            </div>
            {draft.trim() && (
              <button type="button" onClick={send} aria-label="보내기" className="btn-primary grid h-10 w-10 shrink-0 place-items-center rounded-full">
                <SendIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* 참여자 시트 */}
        {memberSheet.mounted && activeRoom && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end">
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setMembersOpen(false)}
              className={`absolute inset-0 bg-black/65 ${memberSheet.closing ? "animate-fade-out" : "animate-fade-in"}`}
            />
            <div
              {...memberSheet.sheetProps}
              className={`relative flex max-h-[80%] flex-col rounded-t-2xl border-t border-white/10 bg-surface pb-[calc(env(safe-area-inset-bottom)+0.5rem)] ${
                memberSheet.closing ? "animate-sheet-down" : "animate-sheet-up"
              }`}
            >
              <div className="flex shrink-0 justify-center pt-2.5">
                <span className="h-1 w-9 rounded-full bg-white/20" />
              </div>
              <div className="flex shrink-0 items-center justify-between px-4 py-3">
                <p className="text-sm font-bold">
                  대화 상대 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{activeRoom.memberIds.length}</span>
                </p>
                <button type="button" onClick={() => setMembersOpen(false)} className="text-xs font-semibold text-fg-muted transition hover:text-fg">
                  닫기
                </button>
              </div>
              <div className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto border-t border-white/10">
                {orderedMembers.map((id) => {
                  const emp = roster[id];
                  return (
                    <div key={id} className="flex items-center gap-3 px-4 py-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: colorOf(id) }}>
                        {nameOf(id).charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-bold">{nameOf(id)}</span>
                          {id === myId && <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-fg-muted">나</span>}
                          {id === activeRoom.ownerId && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                              <CrownIcon className="h-2.5 w-2.5" />
                              방장
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-fg-muted">
                          {emp?.team ? `${emp.team} · ` : ""}
                          {emp ? RANK_KO[emp.rank] ?? emp.rank : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 새 채팅 생성 */}
      <div
        inert={!createOpen}
        className={`absolute inset-0 z-20 flex flex-col bg-bg transition-transform duration-300 ease-out ${
          createOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center px-1.5">
          <button type="button" onClick={() => setCreateOpen(false)} aria-label="뒤로" className={iconBtn}>
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <label className="block text-xs font-semibold text-fg-muted">그룹 이름 (선택)</label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="예) 본사 회의"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />

          <label className="mt-4 block text-xs font-semibold text-fg-muted">멤버 추가</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              value={createQuery}
              onChange={(e) => setCreateQuery(e.target.value)}
              placeholder="이름 · 팀 · 직급으로 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </div>

          <div className="mt-2">
            {pickPeople.length === 0 ? (
              <p className="px-1 pt-6 text-sm text-fg-muted">해당하는 멤버가 없어요.</p>
            ) : (
              pickPeople.map((p) => {
                const on = members.includes(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggleMember(p.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: colorOf(p.id) }}>
                      {p.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{p.name}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {p.team ? `${p.team} · ` : ""}
                        {RANK_KO[p.rank] ?? p.rank}
                      </p>
                    </div>
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                        on ? "border-primary bg-primary text-white" : "border-white/25 text-transparent"
                      }`}
                    >
                      {on && <CheckIcon className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-white/10 bg-surface/80 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary px-5 py-3 text-sm">
            취소
          </button>
          <button type="button" onClick={createRoom} disabled={members.length === 0} className="btn-primary flex-1 py-3 text-sm">
            {members.length > 0 ? `멤버 선택 (${members.length})` : "멤버 선택"}
          </button>
        </div>
      </div>
    </div>
  );
}
