"use client";

import { useEffect, useState } from "react";

const COLLEAGUES = ["지민", "현우", "서연", "민준"]; // 지점 동료 (본인 은후 제외)
const MAX = 5; // 별 개수
const PER_STAR = 5; // 별 하나당 점수

type Review = { stars: number; good: string; improve: string };

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    >
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
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

function MiniStars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: MAX }, (_, i) => (
        <StarIcon
          key={i}
          filled={i < value}
          className={`h-3.5 w-3.5 ${i < value ? "text-amber-400" : "text-fg-muted/25"}`}
        />
      ))}
    </span>
  );
}

export function PeerReview() {
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [activeName, setActiveName] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [good, setGood] = useState("");
  const [improve, setImprove] = useState("");

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const open = (name: string) => {
    const r = reviews[name];
    setStars(r?.stars ?? 0);
    setGood(r?.good ?? "");
    setImprove(r?.improve ?? "");
    setActiveName(name);
    setPanelOpen(true);
  };

  const save = () => {
    if (activeName) setReviews((m) => ({ ...m, [activeName]: { stars, good, improve } }));
    setPanelOpen(false);
  };

  return (
    <div className="px-4 py-4">
      <div className="space-y-2">
        {COLLEAGUES.map((name) => {
          const r = reviews[name];
          return (
            <button
              key={name}
              type="button"
              onClick={() => open(name)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
            >
              <span className="text-sm font-medium">{name}</span>
              <span className="flex items-center gap-2">
                {r ? (
                  <>
                    <MiniStars value={r.stars} />
                    <span className="text-xs font-semibold text-primary-bright tabular-nums">
                      {r.stars * PER_STAR}점
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-fg-muted">미평가</span>
                )}
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-fg-muted" />
              </span>
            </button>
          );
        })}
      </div>

      {/* 평가 페이지 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="동료 평가"
        aria-hidden={!panelOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
            {activeName} 평가
          </h1>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          {/* 별점 + 총점 */}
          <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: MAX }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStars(i + 1)}
                  aria-label={`${i + 1}점`}
                  className={i < stars ? "text-amber-400" : "text-fg-muted/30"}
                >
                  <StarIcon filled={i < stars} className="h-9 w-9" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-fg-muted">
              총점 <span className="font-bold text-fg">{stars * PER_STAR}점</span>
              <span className="text-xs"> / {MAX * PER_STAR}점</span>
            </p>
          </div>

          {/* 잘한 점 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">잘한 점</label>
            <textarea
              value={good}
              onChange={(e) => setGood(e.target.value)}
              rows={3}
              placeholder="잘한 점을 적어주세요"
              className="w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted focus:border-primary/50"
            />
          </div>

          {/* 개선할 점 */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold">개선할 점</label>
            <textarea
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              rows={3}
              placeholder="개선할 점을 적어주세요"
              className="w-full resize-none rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted focus:border-primary/50"
            />
          </div>
        </div>

        {/* 저장 */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <button
            type="button"
            onClick={save}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
