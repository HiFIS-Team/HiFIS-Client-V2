"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import {
  createPeerReview,
  listEmployees,
  listPeerReviews,
  type EmployeeLite,
  type PeerReviewDTO,
  type PeerScoreKey,
  type PeerScores,
} from "@/lib/api/hifis";

/**
 * 동료평가 — **백엔드 연동(Phase 3)**.
 *
 * 항목 5개(업무역량·협업소통·성과기여도·태도·리더십)를 **각각 별점(1~5)+사유**로 평가.
 * 배점(항목당): 상대=별×4(항목 최대 20) / 자기=별×1(항목 최대 5) → 전체 최대 상대 100·자기 25. 제출하면 잠김.
 * ⚠️ total은 서버 저장값(`review.total`) 표시 — 백엔드가 아직 평균×배수면 프리뷰(합계)와 어긋남(백엔드 수정 필요).
 * 대상 명단은 `GET /employees`(지점 로스터). 내가 쓴 것은 `?reviewerId=me`로 조회해 잠금 표시.
 */

const COMPS: { key: PeerScoreKey; label: string }[] = [
  { key: "competency", label: "업무 역량" },
  { key: "collaboration", label: "협업 소통" },
  { key: "contribution", label: "성과 기여도" },
  { key: "attitude", label: "태도 (성실성·규정 준수)" },
  { key: "leadership", label: "리더십 역량" },
];
const ZERO: PeerScores = { competency: 0, collaboration: 0, contribution: 0, attitude: 0, leadership: 0 };

const RANK_KO: Record<string, string> = {
  JUNIOR_TRAINER: "주니어 트레이너",
  PRO_TRAINER: "프로 트레이너",
  PRO1_TRAINER: "프로1 트레이너",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  FC: "FC",
};

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// 항목당 배점: 상대=별×4(항목 최대 20) / 자기=별×1(항목 최대 5) → 별점 합 × 배수(전체 최대 상대 100·자기 25).
// ⚠️ 백엔드 `_compute_total`도 평균×배수 → 합계×배수로 바꿔야 저장/표시 total이 일치함.
function previewTotal(scores: PeerScores, isSelf: boolean) {
  const sum = COMPS.reduce((a, c) => a + scores[c.key], 0);
  return sum * (isSelf ? 1 : 4);
}

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

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc"];
const avatarColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

export function PeerReview() {
  const { show } = useToast();
  const { user } = useAuth();
  const meId = user?.id;

  const [people, setPeople] = useState<EmployeeLite[]>([]);
  const [myReviews, setMyReviews] = useState<Record<string, PeerReviewDTO>>({}); // revieweeId → 내 평가
  const [loading, setLoading] = useState(true);

  const [active, setActive] = useState<EmployeeLite | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [scores, setScores] = useState<PeerScores>(ZERO);
  const [reasons, setReasons] = useState<Partial<Record<PeerScoreKey, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!meId) return;
    let alive = true;
    Promise.all([listEmployees(), listPeerReviews({ reviewerId: meId, period: currentPeriod() })])
      .then(([emps, revs]) => {
        if (!alive) return;
        setPeople(emps);
        const map: Record<string, PeerReviewDTO> = {};
        for (const r of revs) map[r.revieweeId] = r;
        setMyReviews(map);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [meId]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // 나 먼저(자기평가), 그다음 동료
  const me = people.find((p) => p.id === meId);
  const others = people.filter((p) => p.id !== meId);
  const ordered = me ? [me, ...others] : others;
  const doneCount = Object.keys(myReviews).length;

  const activeSelf = active?.id === meId;
  const locked = active ? Boolean(myReviews[active.id]) : false;

  const open = (p: EmployeeLite) => {
    const r = myReviews[p.id];
    setScores(r ? r.scores : ZERO);
    setReasons(r ? r.reasons : {});
    setActive(p);
    setPanelOpen(true);
  };

  const allRated = COMPS.every((c) => scores[c.key] >= 1);

  const save = async () => {
    if (!active || !allRated || saving) return;
    setSaving(true);
    try {
      const r = await createPeerReview({ revieweeId: active.id, period: currentPeriod(), scores, reasons });
      setMyReviews((m) => ({ ...m, [active.id]: r }));
      show(`${activeSelf ? "자기평가" : `${active.name} 평가`}를 제출했습니다 (${r.total}점)`);
      setPanelOpen(false);
    } catch {
      show("평가 제출에 실패했어요", "cancel");
    } finally {
      setSaving(false);
    }
  };

  const preview = previewTotal(scores, activeSelf);
  const maxScore = activeSelf ? 5 : 20;

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-xs text-fg-muted">
        지점 직원 {ordered.length}명 · <span className="font-semibold text-primary-bright">{doneCount}명</span> 평가 완료
      </p>

      {loading ? (
        <p className="text-sm text-fg-muted">불러오는 중…</p>
      ) : (
        <div className="space-y-2">
          {ordered.map((p) => {
            const r = myReviews[p.id];
            const self = p.id === meId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => open(p)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-left"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: avatarColor(p.name) }}>
                  {p.name[0]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{self ? "나" : p.name}</span>
                    {self && <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-bright">자기평가</span>}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-fg-muted">{RANK_KO[p.rank] ?? p.rank}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {r ? (
                    <span className="flex flex-col items-end gap-0.5">
                      <span className="rounded-full bg-emerald-400/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">제출됨</span>
                      <span className="text-xs font-semibold text-primary-bright tabular-nums">{r.total}점</span>
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
      )}

      {/* 평가 페이지 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="평가"
        inert={!panelOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          panelOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button type="button" onClick={() => setPanelOpen(false)} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">{activeSelf ? "자기평가" : `${active?.name ?? ""} 평가`}</h1>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/* 총점 프리뷰 */}
          <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
            <p className="text-sm text-fg-muted">
              총점 <span className="font-bold text-primary-bright">{locked && active ? myReviews[active.id].total : preview}점</span>
              <span className="text-xs"> / {maxScore}점</span>
            </p>
            <p className="mt-0.5 text-[11px] text-fg-muted">항목 평균 × {activeSelf ? 1 : 4} (별 1개 {activeSelf ? 1 : 4}점 환산)</p>
          </div>

          {/* 항목별 별점 + 사유 */}
          {COMPS.map((c) => {
            const val = scores[c.key];
            return (
              <div key={c.key} className="rounded-2xl border border-white/10 bg-surface p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{c.label}</span>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => {
                      const filled = i < val;
                      const cls = filled ? "text-amber-400" : "text-fg-muted/30";
                      return locked ? (
                        <span key={i} className={cls}>
                          <StarIcon filled={filled} className="h-6 w-6" />
                        </span>
                      ) : (
                        <button key={i} type="button" onClick={() => setScores((s) => ({ ...s, [c.key]: i + 1 }))} aria-label={`${c.label} ${i + 1}점`} className={cls}>
                          <StarIcon filled={filled} className="h-6 w-6" />
                        </button>
                      );
                    })}
                  </span>
                </div>
                <textarea
                  value={reasons[c.key] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [c.key]: e.target.value }))}
                  readOnly={locked}
                  rows={4}
                  placeholder={locked ? "" : "왜 이 점수인지 사유를 적어주세요"}
                  className={`mt-2 min-h-[6rem] w-full rounded-lg border px-3 py-2 text-[13px] outline-none placeholder:text-fg-muted ${
                    locked ? "resize-none border-white/5 bg-surface-2/40 text-fg-muted" : "resize-y border-white/10 bg-surface-2 focus:border-primary/50"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="kb-safe shrink-0 border-t border-white/10 p-4">
          {locked ? (
            <p className="text-center text-sm text-fg-muted">제출된 평가라 수정할 수 없어요.</p>
          ) : (
            <button type="button" onClick={save} disabled={!allRated || saving} className="btn-primary w-full py-3 text-sm">
              {saving ? "제출 중…" : !allRated ? "5개 항목을 모두 평가하세요" : `제출 · ${preview}점`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
