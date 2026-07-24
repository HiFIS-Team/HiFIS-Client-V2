"use client";

import { useEffect, useState } from "react";

const ME = "은후"; // 목: 현재 사용자(트레이너 홈 기본)
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

// name 지정 시 실명 표시(어드민 홈은 useAuth().user.name 전달) — 미지정이면 기본 ME
export function GreetingCard({ name = ME }: { name?: string }) {
  const [greeting, setGreeting] = useState("안녕하세요");
  const [dateStr, setDateStr] = useState("");

  // 시간대별 인사 + 오늘 날짜 (클라이언트에서만 — SSR 불일치 방지)
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(
      h < 11 ? "좋은 아침이에요" : h < 17 ? "안녕하세요" : h < 22 ? "좋은 저녁이에요" : "늦은 밤이에요",
    );
    setDateStr(`${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEK[now.getDay()]}요일`);
  }, []);

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
