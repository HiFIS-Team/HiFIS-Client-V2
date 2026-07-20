"use client";

import { useState } from "react";
import { EnvironmentTasks } from "@/components/environment-tasks";
import { PeerReview } from "@/components/peer-review";

const CATEGORIES = ["환경정비", "동료평가", "회원 친절도", "수업 개수", "센터 기여도"];

export function TaskTabs() {
  const [active, setActive] = useState(0);

  return (
    <div>
      {/* 상단 탭 선택기 (사진 스타일 — 텍스트 탭 + 활성 밑줄) */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-bg/90 backdrop-blur">
        {/* 5개를 flex-1로 균등 분배 — 가로 스크롤 없이 한 화면에 다 들어오게
            (알림 패널 탭처럼 좌우로 밀리지 않음) */}
        <div className="flex">
          {CATEGORIES.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex-1 whitespace-nowrap py-3 text-xs transition-colors ${
                  on ? "font-bold text-fg" : "font-medium text-fg-muted"
                }`}
              >
                {c}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 업무 내용 (탭 전환 시 진입 애니메이션) */}
      <div key={active} className="animate-page-in">
        {active === 0 ? (
          <EnvironmentTasks />
        ) : active === 1 ? (
          <PeerReview />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-24 text-center">
            <p className="text-lg font-bold">{CATEGORIES[active]}</p>
            <p className="text-sm text-fg-muted">이 업무 화면은 준비 중이에요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
