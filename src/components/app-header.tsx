import Image from "next/image";

// 마감 임박 프로젝트 (목데이터) — 헤더 마퀴에 흐름
const TICKER = [
  { label: "여름 회원 이벤트 준비", dday: "D-7" },
  { label: "3층 시설 점검", dday: "D-3" },
  { label: "신규 트레이너 온보딩", dday: "D-12" },
  { label: "PT룸 장비 교체", dday: "D-20" },
];

function BarcodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="5" width="1.6" height="14" rx=".4" />
      <rect x="6.2" y="5" width="1" height="14" rx=".4" />
      <rect x="9" y="5" width="2" height="14" rx=".4" />
      <rect x="12.6" y="5" width="1" height="14" rx=".4" />
      <rect x="15.2" y="5" width="1.6" height="14" rx=".4" />
      <rect x="18.4" y="5" width="1" height="14" rx=".4" />
      <rect x="20.8" y="5" width="0.9" height="14" rx=".4" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  );
}

export function AppHeader() {
  return (
    <header className="relative z-10 shrink-0">
      {/* 상단 바 */}
      <div className="flex h-14 items-center justify-between border-b border-white/10 bg-surface/70 px-4 backdrop-blur-xl">
        <Image src="/hifis-wordmark.png" alt="HiFIS" width={1173} height={359} priority className="h-5 w-auto" />
        <div className="flex items-center gap-0.5">
          <button className="grid h-9 w-8 place-items-center text-fg-muted transition-colors hover:text-fg">
            <BarcodeIcon className="h-5 w-5" />
          </button>
          <button className="relative grid h-9 w-8 place-items-center text-fg-muted transition-colors hover:text-fg">
            <BellIcon className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-surface" />
          </button>
        </div>
      </div>

      {/* 마감임박 마퀴 티커 */}
      <div className="flex items-center border-b border-white/5 bg-black/40 py-1.5">
        <span className="ml-3 mr-2 shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary-bright">
          마감임박
        </span>
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
