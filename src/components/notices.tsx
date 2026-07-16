"use client";

import { useEffect, useState } from "react";

// 공지 = 회사 내부에서 올리는 공지사항 (알림[푸시 수신]과는 별개)
type Announcement = {
  id: string;
  pin?: boolean;
  title: string;
  author: string;
  time: string;
  content: string;
};

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "a1",
    pin: true,
    title: "8월 근무표 공지",
    author: "점장",
    time: "16시간 전",
    content:
      "8월 근무표가 확정되었습니다.\n조정이 필요한 경우 이번 주 금요일까지 데스크로 전달해 주세요.\n\n- 오픈/마감 로테이션은 지난달과 동일합니다.\n- 여름 성수기 주말 인원이 1명씩 보강됩니다.",
  },
  {
    id: "a2",
    title: "여름 휴가 사용 가이드 — 6~8월",
    author: "본사",
    time: "2일 전",
    content:
      "여름 성수기(6~8월) 휴가 사용 원칙과 신청 절차 안내입니다.\n\n- 같은 주 최대 2명까지 동시 사용 가능\n- 최소 2주 전 신청\n- 성수기 주말은 지점장 승인 필요",
  },
  {
    id: "a3",
    title: "신규 트레이너 환영 인사",
    author: "민준",
    time: "4일 전",
    content: "이번 달 합류한 신규 트레이너를 소개합니다. 따뜻하게 맞아주세요! 온보딩 일정은 개별 공유됩니다.",
  },
  {
    id: "a4",
    title: "정수기 점검 예정 — 7/20 오전",
    author: "본사",
    time: "5일 전",
    content: "7월 20일 오전 정수기 정기 점검이 예정되어 있습니다. 점검 중에는 라운지 정수기 사용이 잠시 제한됩니다.",
  },
];

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function PinBadge() {
  return (
    <span className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-400">
      PIN
    </span>
  );
}

export function Notices() {
  const [detailId, setDetailId] = useState<string | null>(null);

  useEffect(() => {
    if (!detailId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDetailId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  // 고정(PIN) 먼저
  const list = [...ANNOUNCEMENTS.filter((a) => a.pin), ...ANNOUNCEMENTS.filter((a) => !a.pin)];
  const detail = detailId ? ANNOUNCEMENTS.find((a) => a.id === detailId) ?? null : null;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      <div className="space-y-2">
        {list.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setDetailId(a.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {a.pin && <PinBadge />}
                <span className="truncate text-sm font-semibold">{a.title}</span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-fg-muted">{a.content}</p>
              <p className="mt-1 text-[11px] text-fg-muted">
                {a.author} · {a.time}
              </p>
            </div>
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
          </button>
        ))}
      </div>

      {/* 상세 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="공지 상세"
        aria-hidden={!detailId}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          detailId ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setDetailId(null)}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">공지</h1>
        </header>

        {detail && (
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
            <div className="flex items-center gap-1.5">
              {detail.pin && <PinBadge />}
              <h2 className="text-lg font-bold">{detail.title}</h2>
            </div>
            <p className="mt-1 text-xs text-fg-muted">
              {detail.author} · {detail.time}
            </p>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed">{detail.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}
