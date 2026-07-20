import Image from "next/image";
import { HeaderActions } from "@/components/layout/header-actions";

// 마감 임박 프로젝트 (목데이터) — 헤더 마퀴에 흐름
const TICKER = [
  { label: "여름 회원 이벤트 준비", dday: "D-7" },
  { label: "3층 시설 점검", dday: "D-3" },
  { label: "신규 트레이너 온보딩", dday: "D-12" },
  { label: "PT룸 장비 교체", dday: "D-20" },
];

// D-day 숫자로 긴급도 색상 결정 (글자 대신 색으로 "빨리 해야 한다" 신호)
function urgency(dday: string) {
  const n = parseInt(dday.replace(/\D/g, ""), 10);
  if (n <= 3)
    return {
      label: "text-fg",
      dday: "font-bold text-red-400 [text-shadow:0_0_9px_rgba(248,113,113,0.7)]",
      dot: "bg-red-500 animate-pulse shadow-[0_0_7px_2px_rgba(239,68,68,0.75)]",
    };
  if (n <= 7)
    return {
      label: "text-fg/90",
      dday: "font-bold text-amber-300 [text-shadow:0_0_8px_rgba(252,211,77,0.55)]",
      dot: "bg-amber-400 shadow-[0_0_6px_1px_rgba(251,191,36,0.6)]",
    };
  return {
    label: "text-fg-muted",
    dday: "font-bold text-primary-bright",
    dot: "bg-primary/70",
  };
}

export function AppHeader() {
  return (
    <header className="relative z-10 shrink-0">
      {/* 상단 바 */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-surface/70 px-4 backdrop-blur-xl">
        {/* 로고는 트림돼서 글자가 높이를 꽉 채움 → 아이콘(h-5 박스, 실제 획은 ~15px)과
            눈으로 맞추려면 h-4가 적당하다. h-5로 두면 로고만 커 보임. */}
        <Image src="/hifis-logo.png" alt="HiFIS" width={1600} height={332} priority className="h-4 w-auto" />
        <HeaderActions />
      </div>

      {/* 마감 임박 마퀴 티커 */}
      <div className="flex items-center border-b border-white/5 bg-black/40 py-2 pl-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee items-center">
            {[...TICKER, ...TICKER].map((t, i) => {
              const u = urgency(t.dday);
              return (
                <span key={i} className="flex shrink-0 items-center gap-2 pr-9 text-[13px]">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${u.dot}`} />
                  <span className={u.label}>{t.label}</span>
                  <span className={u.dday}>{t.dday}</span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
