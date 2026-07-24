"use client";

import { useNow } from "@/hooks/use-now";

const ME = "은후"; // 목: 현재 사용자(트레이너 홈 기본)
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// name 지정 시 실명 표시(어드민 홈은 useAuth().user.name 전달) — 미지정이면 기본 ME
export function GreetingCard({ name = ME }: { name?: string }) {
  // 시간대별 인사 + 오늘 날짜는 클라 시각 기반 — useNow(0=마운트 전)로 SSR 불일치/effect setState 회피
  const now = useNow();
  const d = now ? new Date(now) : null;
  const greeting = d
    ? d.getHours() < 11
      ? "좋은 아침이에요"
      : d.getHours() < 17
        ? "안녕하세요"
        : d.getHours() < 22
          ? "좋은 저녁이에요"
          : "늦은 밤이에요"
    : "안녕하세요";
  const dateStr = d ? `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일` : "";

  return (
    <section className="rounded-2xl border border-white/10 bg-surface px-4 py-5">
      {dateStr && <p className="text-[11px] text-fg-muted">{dateStr}</p>}
      <p className="mt-1.5 text-xl font-bold leading-snug">
        {name}님,
        <br />
        <span className="text-fg-muted">{greeting}</span> <span className="ml-0.5">👋</span>
      </p>
    </section>
  );
}
