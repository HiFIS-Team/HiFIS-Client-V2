"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useToast } from "@/components/toast";

const ME = "은후"; // 목: 현재 사용자

type Person = { name: string; team: string; role: string };
const PEOPLE: Person[] = [
  { name: "지민", team: "트레이닝팀", role: "트레이너" },
  { name: "현우", team: "트레이닝팀", role: "트레이너" },
  { name: "서연", team: "프론트데스크", role: "매니저" },
  { name: "민준", team: "강남점", role: "점장" },
  { name: "하늘", team: "트레이닝팀", role: "트레이너" },
  { name: "도윤", team: "GX팀", role: "강사" },
  { name: "서아", team: "프론트데스크", role: "리셉션" },
  { name: "재현", team: "본사", role: "매니저" },
  { name: "유진", team: "트레이닝팀", role: "트레이너" },
  { name: "예린", team: "GX팀", role: "강사" },
];
const ROOM_COLORS = ["#9d3bfc", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6"];

type Reaction = { emoji: string; count: number };
type Message = { id: string; sender: string; text: string; time: string; mine: boolean; reactions?: Reaction[] };
type Room = {
  id: string;
  name: string;
  members: string[]; // 나 포함
  color: string;
  unread: number;
  messages: Message[];
};

const SEED_ROOMS: Room[] = [
  {
    id: "r1",
    name: "강남점 전체",
    members: ["은후", "지민", "현우", "서연", "민준"],
    color: "#9d3bfc",
    unread: 2,
    messages: [
      { id: "m1", sender: "민준", text: "다들 오늘 마감 청소 잊지 마세요", time: "14:20", mine: false, reactions: [{ emoji: "🙏", count: 1 }] },
      { id: "m2", sender: "서연", text: "넵 확인했습니다!", time: "14:22", mine: false },
      { id: "m3", sender: "은후", text: "저 빨래 돌려놨어요 🧺", time: "14:25", mine: true, reactions: [{ emoji: "👍", count: 2 }] },
      { id: "m4", sender: "민준", text: "굿 👍", time: "14:26", mine: false },
    ],
  },
  {
    id: "r2",
    name: "지민",
    members: ["은후", "지민"],
    color: "#0ea5e9",
    unread: 0,
    messages: [
      { id: "m1", sender: "지민", text: "은후님 오늘 몇 시에 퇴근하세요?", time: "12:10", mine: false },
      { id: "m2", sender: "은후", text: "6시요!", time: "12:12", mine: true },
      { id: "m3", sender: "지민", text: "저도 그때 맞춰볼게요 👍", time: "12:13", mine: false },
    ],
  },
  {
    id: "r3",
    name: "현우",
    members: ["은후", "현우"],
    color: "#22c55e",
    unread: 1,
    messages: [{ id: "m1", sender: "현우", text: "비품 신청 목록 공유드려요", time: "어제", mine: false }],
  },
];

const pad = (n: number) => String(n).padStart(2, "0");
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const isGroup = (r: Room) => r.members.length > 2;

// "14:25" → "오후 2:25" (시간 아닌 값["어제" 등]은 그대로)
function ampm(t: string) {
  if (!/^\d{1,2}:\d{2}$/.test(t)) return t;
  const [h, m] = t.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h < 12 ? "오전" : "오후"} ${h12}:${pad(m)}`;
}

const AVA_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AVA_COLORS[h % AVA_COLORS.length];
}
// 1:1은 방 색, 그룹은 발신자별 색
const senderColor = (room: Room, sender: string) => (isGroup(room) ? avatarColor(sender) : room.color);

/* ── 아이콘 ─────────────────────────────────────── */
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
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
function SenderAvatar({ room, sender }: { room: Room; sender: string }) {
  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ backgroundColor: senderColor(room, sender) }}
    >
      {sender.charAt(0)}
    </span>
  );
}

function RoomAvatar({ room, size = "h-14 w-14", badge = true }: { room: Room; size?: string; badge?: boolean }) {
  const group = isGroup(room);
  return (
    <span className="relative shrink-0">
      <span
        className={`grid ${size} place-items-center rounded-full text-base font-bold text-white`}
        style={{ backgroundColor: room.color }}
      >
        {group ? room.name.charAt(0) : room.name.charAt(0)}
      </span>
      {badge &&
        (group ? (
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-primary ring-2 ring-bg">
            <PeopleMiniIcon className="h-3 w-3 text-white" />
          </span>
        ) : (
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-bg" />
        ))}
    </span>
  );
}

/* ── Context ───────────────────────────────────── */
type Ctx = { open: boolean; openChat: () => void; closeChat: () => void };
const ChatContext = createContext<Ctx | null>(null);
export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <ChatContext.Provider value={{ open, openChat: () => setOpen(true), closeChat: () => setOpen(false) }}>
      {children}
      <ChatPanel open={open} onClose={() => setOpen(false)} />
    </ChatContext.Provider>
  );
}

/* ── 패널 ──────────────────────────────────────── */
function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { show } = useToast();
  const [rooms, setRooms] = useState<Room[]>(SEED_ROOMS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [createQuery, setCreateQuery] = useState("");
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const activeRoom = activeId ? rooms.find((r) => r.id === activeId) ?? null : null;
  const totalUnread = rooms.reduce((a, r) => a + r.unread, 0);

  const q = query.trim();
  const shownRooms = rooms.filter(
    (r) => q === "" || r.name.includes(q) || (r.messages[r.messages.length - 1]?.text.includes(q) ?? false),
  );

  const cq = createQuery.trim();
  const filteredPeople = PEOPLE.filter(
    (p) => cq === "" || p.name.includes(cq) || p.team.includes(cq) || p.role.includes(cq),
  );

  // 방 열림/메시지 변경 시 맨 아래로 스크롤
  useEffect(() => {
    if (activeRoom && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [activeId, activeRoom?.messages.length]);

  // ESC: 모달 > 방 > 패널 순으로 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (createOpen) setCreateOpen(false);
      else if (activeId) setActiveId(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeId, createOpen, onClose]);

  const openRoom = (id: string) => {
    setRooms((list) => list.map((r) => (r.id === id ? { ...r, unread: 0 } : r)));
    setDraft("");
    setActiveId(id);
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !activeId) return;
    idRef.current += 1;
    setRooms((list) =>
      list.map((r) =>
        r.id === activeId
          ? { ...r, messages: [...r.messages, { id: `s${idRef.current}`, sender: ME, text, time: nowTime(), mine: true }] }
          : r,
      ),
    );
    setDraft("");
  };

  const toggleMember = (s: string) =>
    setMembers((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const openCreate = () => {
    setRoomName("");
    setMembers([]);
    setCreateQuery("");
    setCreateOpen(true);
  };

  const createRoom = () => {
    if (members.length === 0) return;
    idRef.current += 1;
    const id = `new-${idRef.current}`;
    const name = roomName.trim() || (members.length === 1 ? members[0] : members.join(", "));
    setRooms((list) => [
      { id, name, members: [...members, ME], color: ROOM_COLORS[list.length % ROOM_COLORS.length], unread: 0, messages: [] },
      ...list,
    ]);
    setCreateOpen(false);
    setDraft("");
    setActiveId(id);
    show(`${name} 채팅방을 만들었습니다`);
  };

  const circleBtn = "grid h-10 w-10 place-items-center rounded-full bg-white/5 text-fg transition hover:bg-white/10";

  return (
    <div
      role="dialog"
      aria-label="사내톡"
      aria-hidden={!open}
      className={`absolute inset-0 z-[60] flex flex-col bg-bg transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
    >
      {/* 목록 헤더 */}
      <header className="shrink-0 px-4 pb-3 pt-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">사내톡</h1>
            <p className="mt-0.5 text-sm text-fg-muted">
              {totalUnread > 0 ? `안 읽은 메시지 ${totalUnread}개` : "모든 메시지를 확인했어요"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={openCreate} aria-label="새 채팅" className={circleBtn}>
              <PersonPlusIcon className="h-5 w-5" />
            </button>
            <button type="button" onClick={onClose} aria-label="닫기" className={circleBtn}>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* 검색 */}
      <div className="shrink-0 px-4 pb-2">
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
            const last = r.messages[r.messages.length - 1];
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openRoom(r.id)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left"
              >
                <RoomAvatar room={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-base font-bold">{r.name}</span>
                      {isGroup(r) && <span className="shrink-0 text-xs font-semibold text-fg-muted">{r.members.length}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{last ? ampm(last.time) : ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-fg-muted">
                      {last ? (last.mine ? "나: " : "") + last.text : "대화를 시작해보세요"}
                    </span>
                    {r.unread > 0 && (
                      <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                        {r.unread}
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
        className={`absolute inset-0 z-10 flex flex-col bg-bg transition-transform duration-300 ease-out ${
          activeId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 bg-surface/70 px-3 backdrop-blur-xl">
          <button type="button" onClick={() => setActiveId(null)} aria-label="뒤로" className={circleBtn}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          {activeRoom && (
            <>
              <RoomAvatar room={activeRoom} size="h-9 w-9" badge={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{activeRoom.name}</p>
                <p className="truncate text-xs text-fg-muted">
                  {isGroup(activeRoom) ? `그룹 · ${activeRoom.members.length}명` : "1:1 대화"}
                </p>
              </div>
            </>
          )}
          <button type="button" onClick={onClose} aria-label="닫기" className={circleBtn}>
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain px-3 py-4">
          {activeRoom?.messages.length === 0 && (
            <p className="pt-10 text-center text-sm text-fg-muted">첫 메시지를 보내보세요.</p>
          )}
          {activeRoom?.messages.map((m, i) => {
            const prev = activeRoom.messages[i - 1];
            const firstOfRun = !prev || prev.mine !== m.mine || prev.sender !== m.sender;
            const group = isGroup(activeRoom);
            const reactions = m.reactions && (
              <div className="mt-1 flex gap-1">
                {m.reactions.map((r, ri) => (
                  <span key={ri} className="flex items-center gap-0.5 rounded-full border border-white/10 bg-surface-2 px-1.5 py-0.5 text-[11px]">
                    <span>{r.emoji}</span>
                    <span className="text-fg-muted">{r.count}</span>
                  </span>
                ))}
              </div>
            );
            const time = <span className="mb-0.5 shrink-0 text-[10px] text-fg-muted">{ampm(m.time)}</span>;

            if (m.mine) {
              return (
                <div key={m.id} className="flex items-end justify-end gap-1.5">
                  {time}
                  <div className="flex max-w-[72%] flex-col items-end">
                    <div className="rounded-2xl rounded-tr-md bg-primary px-3 py-2 text-sm leading-snug text-white">{m.text}</div>
                    {reactions}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex items-end justify-start gap-2">
                {firstOfRun ? <SenderAvatar room={activeRoom} sender={m.sender} /> : <span className="w-8 shrink-0" />}
                <div className="flex max-w-[72%] flex-col items-start">
                  {firstOfRun && group && <span className="mb-0.5 px-1 text-[11px] text-fg-muted">{m.sender}</span>}
                  <div className="rounded-2xl rounded-tl-md bg-surface-2 px-3 py-2 text-sm leading-snug text-fg">{m.text}</div>
                  {reactions}
                </div>
                {time}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-surface/80 px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-white/10 bg-bg pl-4 pr-1">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="메시지를 입력하세요"
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-fg-muted"
              />
              <button type="button" aria-label="첨부" className="grid h-8 w-8 shrink-0 place-items-center text-fg-muted">
                <PaperclipIcon className="h-5 w-5" />
              </button>
            </div>
            {draft.trim() && (
              <button
                type="button"
                onClick={send}
                aria-label="보내기"
                className="btn-primary grid h-10 w-10 shrink-0 place-items-center rounded-full"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 새 채팅 생성 (전체화면 슬라이드) */}
      <div
        className={`absolute inset-0 z-20 flex flex-col bg-bg transition-transform duration-300 ease-out ${
          createOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex h-16 shrink-0 items-center justify-between px-3">
          <button type="button" onClick={() => setCreateOpen(false)} aria-label="뒤로" className={circleBtn}>
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateOpen(false);
              onClose();
            }}
            aria-label="닫기"
            className={circleBtn}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <label className="block text-xs font-semibold text-fg-muted">그룹 이름 (선택)</label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="예) 강남점 회의"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary/50"
          />

          <label className="mt-4 block text-xs font-semibold text-fg-muted">멤버 추가</label>
          <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2.5">
            <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              value={createQuery}
              onChange={(e) => setCreateQuery(e.target.value)}
              placeholder="이름 · 팀 · 직책으로 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </div>

          <div className="mt-2">
            {filteredPeople.length === 0 ? (
              <p className="px-1 pt-6 text-sm text-fg-muted">해당하는 멤버가 없어요.</p>
            ) : (
              filteredPeople.map((p) => {
                const on = members.includes(p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => toggleMember(p.name)}
                    className="flex w-full items-center gap-3 py-2.5 text-left"
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: avatarColor(p.name) }}
                    >
                      {p.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{p.name}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {p.team} · {p.role}
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

        {/* 하단 바 */}
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
