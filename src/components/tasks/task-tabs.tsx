"use client";

import { useState } from "react";
import { EnvironmentTasks } from "@/components/tasks/environment-tasks";
import { PeerReview } from "@/components/tasks/peer-review";
import { ClassCount } from "@/components/tasks/class-count";
import { MemberKindness } from "@/components/tasks/member-kindness";

const CATEGORIES = ["환경정비", "동료평가", "회원 친절도", "수업 개수", "센터 기여도"];

export function TaskTabs() {
  const [active, setActive] = useState(0);

  return (
    /* 알림 패널과 같은 구조: 바는 shrink-0으로 고정하고 "내용만" 스크롤시킨다.
       (sticky는 스크롤 조상이 main이라 페이지가 밀릴 때 같이 움직여 보였음) */
    <div className="flex h-full flex-col">
      {/* 상단 탭 선택기 — 스크롤해도 위에 붙어 있음 */}
      <div className="shrink-0 border-b border-white/10 bg-bg/90 backdrop-blur">
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

      {/* 선택된 업무 내용 (탭 전환 시 진입 애니메이션) — 여기만 스크롤 */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={active} className="animate-page-in">
        {active === 0 ? (
          <EnvironmentTasks />
        ) : active === 1 ? (
          <PeerReview />
        ) : active === 2 ? (
          <MemberKindness />
        ) : active === 3 ? (
          <ClassCount />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-24 text-center">
            <p className="text-lg font-bold">{CATEGORIES[active]}</p>
            <p className="text-sm text-fg-muted">이 업무 화면은 준비 중이에요.</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
