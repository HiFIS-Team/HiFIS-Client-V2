import Image from "next/image";
import { HeaderActions } from "@/components/header-actions";

// 마감 임박 프로젝트 (목데이터) — 헤더 마퀴에 흐름
const TICKER = [
  { label: "여름 회원 이벤트 준비", dday: "D-7" },
  { label: "3층 시설 점검", dday: "D-3" },
  { label: "신규 트레이너 온보딩", dday: "D-12" },
  { label: "PT룸 장비 교체", dday: "D-20" },
];

export function AppHeader() {
  return (
    <header className="relative z-10 shrink-0">
      {/* 상단 바 */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-surface/70 px-4 backdrop-blur-xl">
        <Image src="/hifis-wordmark.png" alt="HiFIS" width={1173} height={359} priority className="h-5 w-auto" />
        <HeaderActions />
      </div>

      {/* 마감 임박 마퀴 티커 */}
      <div className="flex items-center border-b border-white/5 bg-black/40 py-1.5 pl-4">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-marquee items-center">
            {[...TICKER, ...TICKER].map((t, i) => (
              <span key={i} className="flex shrink-0 items-center gap-1.5 pr-8 text-xs">
                <span className="text-fg-muted">{t.label}</span>
                <span className="font-bold text-primary-bright">{t.dday}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
