"use client";

import { useEffect, useRef, useState } from "react";

const ME = "은후"; // 목: 현재 사용자
const STAFF = ["지민", "현우", "서연", "민준"]; // 목: 이 지점 동료 (나 제외)
const ROOM_COLORS = ["#9d3bfc", "#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#14b8a6"];

type Message = { id: string; sender: string; text: string; time: string; mine: boolean };
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
      { id: "m1", sender: "민준", text: "다들 오늘 마감 청소 잊지 마세요", time: "14:20", mine: false },
      { id: "m2", sender: "서연", text: "넵 확인했습니다!", time: "14:22", mine: false },
      { id: "m3", sender: "은후", text: "저 빨래 돌려놨어요 🧺", time: "14:25", mine: true },
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
      { id: "m3", sender: "지민", text: "저도 그때 맞춰볼게요", time: "12:13", mine: false },
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

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
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

function RoomAvatar({ room, size = "h-11 w-11" }: { room: Room; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full text-sm font-bold text-white`}
      style={{ backgroundColor: room.color }}
    >
      {isGroup(room) ? `${room.members.length}` : room.name.charAt(0)}
    </span>
  );
}

export function Chat() {
  const [rooms, setRooms] = useState<Room[]>(SEED_ROOMS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const idRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const activeRoom = activeId ? rooms.find((r) => r.id === activeId) ?? null : null;

  // 방 열림/메시지 변경 시 맨 아래로 스크롤
  useEffect(() => {
    if (activeRoom && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [activeId, activeRoom?.messages.length]);

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (createOpen) setCreateOpen(false);
      else if (activeId) setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId, createOpen]);

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
    setCreateOpen(true);
  };

  const createRoom = () => {
    if (members.length === 0) return;
    idRef.current += 1;
    const id = `new-${idRef.current}`;
    const name = roomName.trim() || (members.length === 1 ? members[0] : members.join(", "));
    const room: Room = {
      id,
      name,
      members: [...members, ME],
      color: ROOM_COLORS[rooms.length % ROOM_COLORS.length],
      unread: 0,
      messages: [],
    };
    setRooms((list) => [room, ...list]);
    setCreateOpen(false);
    setDraft("");
    setActiveId(id);
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 상단 */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold">
          사내톡 <span className="ml-0.5 text-xs font-semibold text-fg-muted">{rooms.length}</span>
        </p>
        <button type="button" onClick={openCreate} className="btn-primary flex items-center gap-1 px-3 py-2 text-sm">
          <PlusIcon className="h-4 w-4" />새 채팅
        </button>
      </div>

      {/* 방 목록 */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="divide-y divide-white/5">
          {rooms.map((r) => {
            const last = r.messages[r.messages.length - 1];
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openRoom(r.id)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
              >
                <RoomAvatar room={r} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">
                      {r.name}
                      {isGroup(r) && <span className="ml-1 text-xs font-normal text-fg-muted">{r.members.length}</span>}
                    </span>
                    <span className="shrink-0 text-[11px] text-fg-muted">{last?.time ?? ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-fg-muted">
                      {last ? (last.mine ? "나: " : "") + last.text : "대화를 시작해보세요"}
                    </span>
                    {r.unread > 0 && (
                      <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                        {r.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 채팅방 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="채팅방"
        aria-hidden={!activeId}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          activeId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveId(null)}
            aria-label="뒤로"
            className="grid h-10 w-9 shrink-0 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          {activeRoom && (
            <div className="flex min-w-0 items-center gap-2">
              <RoomAvatar room={activeRoom} size="h-8 w-8" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeRoom.name}</p>
                {isGroup(activeRoom) && (
                  <p className="truncate text-[11px] text-fg-muted">{activeRoom.members.join(", ")}</p>
                )}
              </div>
            </div>
          )}
        </header>

        {/* 메시지 */}
        <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-4">
          {activeRoom?.messages.length === 0 && (
            <p className="pt-10 text-center text-sm text-fg-muted">첫 메시지를 보내보세요.</p>
          )}
          {activeRoom?.messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[76%] ${m.mine ? "items-end" : "items-start"} flex flex-col`}>
                {!m.mine && activeRoom && isGroup(activeRoom) && (
                  <span className="mb-0.5 px-1 text-[11px] text-fg-muted">{m.sender}</span>
                )}
                <div className="flex items-end gap-1.5">
                  {m.mine && <span className="text-[10px] text-fg-muted">{m.time}</span>}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm leading-snug ${
                      m.mine ? "bg-primary text-white" : "bg-surface-2 text-fg"
                    }`}
                  >
                    {m.text}
                  </div>
                  {!m.mine && <span className="text-[10px] text-fg-muted">{m.time}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 입력 바 */}
        <div className="shrink-0 border-t border-white/10 bg-surface/80 px-3 pt-2.5 pb-[calc(env(safe-area-inset-bottom)+0.625rem)] backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="메시지 입력"
              className="min-w-0 flex-1 rounded-full border border-white/10 bg-bg px-4 py-2.5 text-sm outline-none focus:border-primary/50"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="보내기"
              className="btn-primary grid h-10 w-10 shrink-0 place-items-center rounded-full"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 새 채팅 모달 */}
      {createOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setCreateOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">새 채팅방</p>

            <label className="mt-3 block text-xs text-fg-muted">방 이름 (선택)</label>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="여러 명이면 이름을 정해주세요"
              className="mt-1 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />

            <label className="mt-3 block text-xs text-fg-muted">대화 상대</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {STAFF.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMember(s)}
                  className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
                    members.includes(s)
                      ? "border-primary/50 bg-primary/10 text-primary-bright"
                      : "border-white/10 bg-bg text-fg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setCreateOpen(false)} className="btn-secondary px-3 py-1.5 text-sm">
                취소
              </button>
              <button type="button" onClick={createRoom} disabled={members.length === 0} className="btn-primary px-3.5 py-1.5 text-sm">
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
