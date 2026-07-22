"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * 앱 둘러보기(온보딩 가이드).
 *
 * - **자동 노출**: 앱을 처음 실행(회원가입 후 첫 로그인 등)해 아직 가이드를 본 적 없을 때만 자동으로 뜬다.
 *   로그인·회원가입 화면(bare 라우트)에서는 뜨지 않는다.
 * - **다시 보기**: 전체 메뉴의 "앱 가이드"에서 `openGuide()`로 언제든 다시 열 수 있다.
 * - **본 적 있음 판단**: localStorage(`hifis-guide-seen`)로 저장. `useSyncExternalStore`로 읽어
 *   SSR 안전 + set-state-in-effect 없이 처리(lint 무증가).
 */

const SEEN_KEY = "hifis-guide-seen";

// useSyncExternalStore 스냅샷 — 모듈 레벨로 두어 구독이 안정적이게
const subscribe = () => () => {};
const getSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true; // 접근 불가(프라이빗 모드 등)면 '봤음'으로 취급 → 방해하지 않음
  }
};
const getSeenServer = () => true; // 서버에선 렌더하지 않음(깜빡임 방지)

type GuideCtx = { openGuide: () => void };
const Ctx = createContext<GuideCtx | null>(null);

export function useGuide() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useGuide must be used within GuideProvider");
  return c;
}

/* ── 슬라이드 정의 (HiFIS에 맞춰 각색) ─────────────────── */
type Slide = {
  eyebrow: string;
  emoji: string;
  title: string;
  desc: string;
  bullets: string[];
  glow: string; // 상단 발광 원
  text: string; // eyebrow 색
  bar: string; // 진행바 색
  dot: string; // 불릿 점 색
};

const SLIDES: Slide[] = [
  {
    eyebrow: "WELCOME",
    emoji: "👋",
    title: "피트니스스타에 오신 걸 환영해요",
    desc: "매장 운영에 필요한 업무·점수·소통을 한 앱에서 처리해요. 지금 보이는 데이터는 모두 데모이고, 변경 사항은 저장되지 않아요.",
    bullets: [],
    glow: "bg-primary/25",
    text: "text-primary-bright",
    bar: "bg-primary",
    dot: "bg-primary",
  },
  {
    eyebrow: "NAVIGATION",
    emoji: "🧭",
    title: "하단 탭으로 페이지 이동",
    desc: "자주 쓰는 메뉴는 하단 탭 5개에 모여 있어요. 나머지 메뉴는 ‘전체’ 탭에서 찾을 수 있어요.",
    bullets: ["홈 — 출근·오늘 업무·공지 한눈에", "업무 — 환경정비·동료평가·친절도 점수", "프로젝트 — 목적·절차·마감 관리"],
    glow: "bg-sky-500/25",
    text: "text-sky-300",
    bar: "bg-sky-400",
    dot: "bg-sky-400",
  },
  {
    eyebrow: "SCORE",
    emoji: "🎯",
    title: "업무가 곧 점수예요",
    desc: "업무 5개 탭이 전부 점수로 쌓이고, 그 점수가 랭킹으로 이어져요.",
    bullets: ["환경정비·동료평가·회원 친절도·수업 개수·센터 기여도", "쌓인 점수는 피드백왕·친절왕·종합왕 랭킹에 반영"],
    glow: "bg-amber-500/25",
    text: "text-amber-300",
    bar: "bg-amber-400",
    dot: "bg-amber-400",
  },
  {
    eyebrow: "COMMUNICATION",
    emoji: "💬",
    title: "상단 아이콘으로 소통",
    desc: "우측 상단에서 검색·채팅·알림을 열 수 있어요.",
    bullets: ["사내톡 — 1:1·그룹·이모지 반응", "알림 — 새 소식이 오면 벨에 빨간 점"],
    glow: "bg-pink-500/25",
    text: "text-pink-300",
    bar: "bg-pink-400",
    dot: "bg-pink-400",
  },
  {
    eyebrow: "READY",
    emoji: "🚀",
    title: "이제 시작해볼까요?",
    desc: "가이드가 다시 보고 싶으면 언제든 ‘전체 › 앱 가이드’에서 열 수 있어요.",
    bullets: [],
    glow: "bg-emerald-500/25",
    text: "text-emerald-300",
    bar: "bg-emerald-400",
    dot: "bg-emerald-400",
  },
];

function GuideOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [closing, setClosing] = useState(false);
  const s = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  // 닫기 요청 → 나가는 애니메이션 재생, 끝나면 실제 언마운트(onClose)
  const requestClose = () => setClosing(true);
  const onAnimEnd = (e: React.AnimationEvent) => {
    if (closing && e.animationName.includes("guide-out")) onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      onAnimationEnd={onAnimEnd}
      className={`absolute inset-0 z-[90] flex flex-col overflow-hidden bg-bg ${closing ? "animate-guide-out pointer-events-none" : "animate-fade-in"}`}
    >
      {/* 배경 발광 — 상단은 슬라이드 색, 하단은 은은한 퍼플 아우라 */}
      <div className={`pointer-events-none absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full blur-[70px] transition-colors duration-500 ${s.glow}`} />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: "radial-gradient(60% 60% at 50% 100%, rgba(157,59,252,0.16), transparent 72%)" }}
      />

      {/* 상단 바 */}
      <div className="relative flex items-center justify-between px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-white">H</span>
          <span className="text-sm font-semibold text-fg-muted">HiFIS · 둘러보기</span>
        </div>
        {!isLast && (
          <button type="button" onClick={requestClose} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-fg-muted">
            건너뛰기
          </button>
        )}
      </div>

      {/* 본문 (슬라이드 전환마다 page-in 재생) */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div key={step} className="animate-page-in flex w-full flex-col items-center">
          <p className={`text-xs font-bold tracking-[0.3em] ${s.text}`}>{s.eyebrow}</p>
          <span className="mt-6 text-6xl leading-none">{s.emoji}</span>
          <h1 className="mt-6 text-2xl font-bold leading-snug">{s.title}</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">{s.desc}</p>
          {s.bullets.length > 0 && (
            <ul className="mt-6 space-y-2.5 text-left">
              {s.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-[13px] text-fg">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 하단: 진행바 + 버튼 */}
      <div className="relative px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-300 ${s.bar}`}
            style={{ width: `${((step + 1) / SLIDES.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-2.5">
          {step > 0 && (
            <button type="button" onClick={() => setStep((n) => n - 1)} className="btn-secondary flex-1 py-3 text-sm">
              ← 이전
            </button>
          )}
          {isLast ? (
            <button type="button" onClick={requestClose} className="btn-primary flex-[2] py-3 text-sm">
              시작하기
            </button>
          ) : (
            <button type="button" onClick={() => setStep((n) => n + 1)} className="btn-primary flex-[2] py-3 text-sm">
              다음 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const seen = useSyncExternalStore(subscribe, getSeen, getSeenServer);
  const pathname = usePathname();
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false); // 이번 세션에서 닫음

  // 로그인·회원가입 화면에서는 자동 노출하지 않음
  const bare = pathname === "/login" || pathname === "/signup";
  const autoOpen = !seen && !dismissed && !bare;
  const open = manualOpen || autoOpen;

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* 무시 */
    }
    setDismissed(true);
    setManualOpen(false);
  };

  return (
    <Ctx.Provider value={{ openGuide: () => setManualOpen(true) }}>
      {children}
      {open && <GuideOverlay onClose={close} />}
    </Ctx.Provider>
  );
}
