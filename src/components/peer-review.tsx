"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/toast";

const MAX_STARS = 5;
const COMPETENCIES = ["업무 역량", "협업 소통", "성과 기여도", "태도 성실성 및 규정 준수", "리더십 역량"];
const FINAL = "왜 이 점수인지";

// 동료 = 별 1개 4점(최대 20) · 자기평가 = 별 1개 1점(최대 5)
const perStar = (self: boolean) => (self ? 1 : 4);

type Person = { key: string; name: string; role: string; self: boolean; av: string };
type Review = { stars: number; texts: Record<string, string> };

// 지점 직원 (목) — 아바타 색·직책
const PEOPLE: Person[] = [
  { key: "self", name: "나", role: "본인 · 트레이너", self: true, av: "bg-primary/20 text-primary-bright" },
  { key: "지민", name: "지민", role: "트레이너", self: false, av: "bg-sky-400/15 text-sky-300" },
  { key: "현우", name: "현우", role: "트레이너", self: false, av: "bg-emerald-400/15 text-emerald-300" },
  { key: "서연", name: "서연", role: "데스크 매니저", self: false, av: "bg-amber-400/15 text-amber-300" },
  { key: "민준", name: "민준", role: "점장", self: false, av: "bg-violet-400/15 text-violet-300" },
];

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
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
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <StarIcon key={i} filled={i < value} className={`h-3.5 w-3.5 ${i < value ? "text-amber-400" : "text-fg-muted/25"}`} />
      ))}
    </span>
  );
}

function TextField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={2}
        placeholder={readOnly ? "" : "내용을 적어주세요"}
        className={`w-full resize-none rounded-lg border px-3 py-2.5 text-sm outline-none placeholder:text-fg-muted ${
          readOnly ? "border-white/5 bg-surface/40 text-fg-muted" : "border-white/10 bg-surface focus:border-primary/50"
        }`}
      />
    </div>
  );
}

export function PeerReview() {
  const { show } = useToast();
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [active, setActive] = useState<Person | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const open = (entry: Person) => {
    const r = reviews[entry.key];
    setStars(r?.stars ?? 0);
    setTexts(r?.texts ?? {});
    setActive(entry);
    setPanelOpen(true);
  };

  const save = () => {
    if (active) {
      setReviews((m) => ({ ...m, [active.key]: { stars, texts } }));
      show(`${active.name} 평가를 제출했습니다`);
    }
    setPanelOpen(false);
  };

  const setText = (field: string, v: string) => setTexts((t) => ({ ...t, [field]: v }));

  const activeSelf = active?.self ?? false;
  const score = stars * perStar(activeSelf);
  const maxScore = MAX_STARS * perStar(activeSelf);
  const locked = active ? Boolean(reviews[active.key]) : false; // 제출되면 수정 불가
  const done = PEOPLE.filter((p) => reviews[p.key]).length;

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-xs text-fg-muted">
        지점 직원 {PEOPLE.length}명 · <span className="font-semibold text-primary-bright">{done}명</span> 평가 완료
      </p>
      <div className="space-y-2">
        {PEOPLE.map((p) => {
          const r = reviews[p.key];
          const pts = r ? r.stars * perStar(p.self) : 0;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => open(p)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${p.av}`}>
                {p.name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  {p.self && (
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">
                      자기평가
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-fg-muted">{p.role}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {r ? (
                  <span className="flex flex-col items-end gap-0.5">
                    <MiniStars value={r.stars} />
                    <span className="text-xs font-semibold text-primary-bright tabular-nums">{pts}점</span>
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-fg-muted">미평가</span>
                )}
                <ChevronRightIcon className="h-4 w-4 text-fg-muted" />
              </span>
            </button>
          );
        })}
      </div>

      {/* 평가 페이지 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="평가"
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
            {activeSelf ? "자기평가" : `${active?.name ?? ""} 평가`}
          </h1>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {/* 별점 + 총점 */}
          <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
            <div className="flex justify-center gap-1.5">
              {Array.from({ length: MAX_STARS }, (_, i) => {
                const filled = i < stars;
                const cls = filled ? "text-amber-400" : "text-fg-muted/30";
                return locked ? (
                  <span key={i} className={cls}>
                    <StarIcon filled={filled} className="h-9 w-9" />
                  </span>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStars(i + 1)}
                    aria-label={`${i + 1}별`}
                    className={cls}
                  >
                    <StarIcon filled={filled} className="h-9 w-9" />
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-sm text-fg-muted">
              총점 <span className="font-bold text-fg">{score}점</span>
              <span className="text-xs"> / {maxScore}점</span>
              <span className="ml-1 text-xs">(별 1개 {perStar(activeSelf)}점)</span>
            </p>
          </div>

          {/* 역량 항목 */}
          {COMPETENCIES.map((f) => (
            <TextField key={f} label={f} value={texts[f] ?? ""} onChange={(v) => setText(f, v)} readOnly={locked} />
          ))}

          {/* 최종 — 왜 이 점수인지 */}
          <div className="border-t border-white/10 pt-4">
            <TextField label={FINAL} value={texts[FINAL] ?? ""} onChange={(v) => setText(FINAL, v)} readOnly={locked} />
          </div>
        </div>

        {/* 저장 / 잠금 */}
        <div className="shrink-0 border-t border-white/10 p-4">
          {locked ? (
            <p className="text-center text-sm text-fg-muted">제출된 평가라 수정할 수 없어요.</p>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={stars === 0}
              className="btn-primary w-full py-3 text-sm"
            >
              {stars === 0 ? "별점을 선택하세요" : "저장"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
