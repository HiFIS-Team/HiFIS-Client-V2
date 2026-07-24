"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { CenterContribution } from "@/components/tasks/center-contribution";
import {
  listEnvLogs,
  listKindnessSurveys,
  listPeerReviews,
  listSessionSigns,
  type EnvLogDTO,
  type KindnessSurveyDTO,
  type PeerReviewDTO,
  type SessionSignDTO,
} from "@/lib/api/hifis";

/**
 * 업무 5탭 (어드민/대표) — 수행 UI가 아니라 **감독/열람 뷰**.
 * 환경정비 감사로그 · 동료평가 집계 · 회원 친절도 응답 · 수업(세션) 집계 · 센터 기여도(부여+전체).
 * admin scope 라 각 도메인 전체 조회가 열림. 센터 기여도는 admin-aware CenterContribution 재사용.
 * 전부 읽기 전용(±스테퍼·제출 없음). setState 는 .then 안 → set-state-in-effect 아님.
 * 디자인: 랭킹(순위 뱃지·그라데이션 바) + 근태 카드(컬러 아이콘 타일) 톤 계승.
 */

const CATEGORIES = ["환경정비", "동료평가", "회원 친절도", "수업 개수", "센터 기여도"];
const SCORE_PER_SIGN = 2;
const SCORE_PER_PRAISE = 10;
const BAR = "bg-[linear-gradient(90deg,#c471ff,#7d1ff0)]"; // 앱 표준 퍼플 그라데이션
const PEER_ITEMS = [
  ["competency", "업무 역량"],
  ["collaboration", "협업 소통"],
  ["contribution", "성과 기여도"],
  ["attitude", "태도 (성실성·규정 준수)"],
  ["leadership", "리더십 역량"],
] as const;

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc", "#f43f5e"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}
const pad = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

/* ── 공용 조각 ── */
// 요약 타일 (아이콘 없이 — 라벨 + 큰 숫자)
function PlainTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-primary-bright" : ""}`}>{value}</p>
    </div>
  );
}
// 이름 타일 (라벨 + 직원 이름 + 점수) — 최고/최저 등
function NameTile({ label, name, score, tone }: { label: string; name?: string; score?: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${name ? tone : "text-fg-muted"}`}>{name ?? "—"}</p>
      <p className="text-[11px] text-fg-muted tabular-nums">{score != null ? `${score}점` : "—"}</p>
    </div>
  );
}
function RankBadge({ n }: { n: number }) {
  const cls =
    n === 1 ? "bg-amber-400/20 text-amber-300" : n === 2 ? "bg-slate-300/15 text-slate-200" : n === 3 ? "bg-amber-700/25 text-amber-500" : "bg-white/5 text-fg-muted";
  return <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${cls}`}>{n}</span>;
}
function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: avatarColor(name) }}>
      {name[0]}
    </span>
  );
}
function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
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
// 별점 (멤버 동료평가 화면과 동일 — 채운 별 앰버 / 빈 별 흐림, h-6)
function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function StarRow({ n }: { n: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? "text-amber-400" : "text-fg-muted/30"}>
          <StarIcon filled={i < n} className="h-6 w-6" />
        </span>
      ))}
    </span>
  );
}

type Row = { id: string; name: string; sub: string; value: number; valueLabel: string };
function Leaderboard({ rows, onRowClick }: { rows: Row[]; onRowClick?: (id: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r, i) => {
        const body = (
          <>
            <RankBadge n={i + 1} />
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{r.name}</span>
                <span className="shrink-0 text-sm font-bold text-primary-bright tabular-nums">{r.valueLabel}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${BAR}`} style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
                </div>
                <span className="shrink-0 text-[11px] text-fg-muted">{r.sub}</span>
              </div>
            </div>
          </>
        );
        return onRowClick ? (
          <button key={r.id} type="button" onClick={() => onRowClick(r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-60">
            {body}
            <Chevron className="h-4 w-4 shrink-0 text-fg-muted" />
          </button>
        ) : (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}
function SectionCard({ title, note, loaded, empty, children }: { title: string; note?: string; loaded: boolean; empty: boolean; children: ReactElement }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <div className="px-4 pb-2 pt-3.5">
        <p className="text-sm font-bold">{title}</p>
        {note && <p className="mt-0.5 text-[11px] text-fg-muted">{note}</p>}
      </div>
      {!loaded ? <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p> : empty ? <p className="px-4 pb-6 pt-1 text-center text-sm text-fg-muted">{note ? "아직 데이터가 없어요." : ""}</p> : children}
    </section>
  );
}

/* ── 환경정비 감사로그 ── */
function AdminEnvPanel() {
  const { user } = useAuth();
  const nameOf = useEmployeeNames();
  const [logs, setLogs] = useState<EnvLogDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.branchId) return;
    let alive = true;
    listEnvLogs({ branchId: user.branchId })
      .then((r) => alive && (setLogs(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [user?.branchId]);

  const totalPoints = logs.reduce((s, l) => s + l.points, 0);
  const itemCount = new Set(logs.map((l) => l.itemName)).size;
  const recent = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 30);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-3 gap-2">
        <PlainTile label="총 수행" value={`${logs.length}`} />
        <PlainTile label="누적 점수" value={`${totalPoints}`} accent />
        <PlainTile label="수행 항목" value={`${itemCount}`} />
      </div>

      <SectionCard title="최근 기록" note="누가·언제 수행했는지" loaded={loaded} empty={logs.length === 0}>
        <div className="divide-y divide-white/5">
          {recent.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className={`h-8 w-1 shrink-0 rounded-full ${BAR}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {l.itemName}
                  {l.note ? <span className="text-fg-muted"> · {l.note}</span> : null}
                </span>
                <span className="block text-[11px] text-fg-muted">
                  {nameOf(l.employeeId)} · {fmtDateTime(l.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary-bright tabular-nums">+{l.points}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

/* ── 동료평가 집계 ── */
function AdminPeerPanel() {
  const nameOf = useEmployeeNames();
  const [reviews, setReviews] = useState<PeerReviewDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null); // 선택된 평가자(리뷰)
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    listPeerReviews({})
      .then((r) => alive && (setReviews(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPanelOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  // 개인평가(자기평가) 포함 — 직원별 받은 평가 지점 통합
  const byReviewee = new Map<string, { count: number; total: number }>();
  for (const r of reviews) {
    const e = byReviewee.get(r.revieweeId) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.total;
    byReviewee.set(r.revieweeId, e);
  }
  const rows: Row[] = [...byReviewee.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, v]) => ({ id, name: nameOf(id), sub: `평가 ${v.count}건 · 평균 ${Math.round(v.total / v.count)}점`, value: v.total, valueLabel: `${v.total}점` }));
  const top = rows[0];
  const bottom = rows.length > 1 ? rows[rows.length - 1] : undefined;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-3 gap-2">
        <PlainTile label="제출된 평가" value={`${reviews.length}`} />
        <NameTile label="점수 높은 직원" name={top?.name} score={top?.value} tone="text-emerald-300" />
        <NameTile label="점수 낮은 직원" name={bottom?.name} score={bottom?.value} tone="text-rose-300" />
      </div>
      <SectionCard title="직원별 받은 평가" note="직원을 누르면 상세 · 개인평가 포함 (지점 통합)" loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} onRowClick={(id) => { setDetailId(id); setDetailReviewId(null); setPanelOpen(true); }} />
      </SectionCard>

      {/* 직원 상세 — 받은 평가 (멤버 동료평가와 동일한 오른쪽 슬라이드 페이지) */}
      <div
        role="dialog"
        aria-label="동료평가 상세"
        inert={!panelOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${panelOpen ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button type="button" onClick={() => setPanelOpen(false)} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">{detailId ? `${nameOf(detailId)} 평가` : ""}</h1>
        </header>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {(() => {
            const received = detailId ? reviews.filter((r) => r.revieweeId === detailId) : [];
            const sel = received.find((r) => r.id === detailReviewId) ?? received[0];
            if (!sel) return <p className="py-8 text-center text-sm text-fg-muted">아직 받은 평가가 없어요.</p>;
            return (
              <>
                {/* 평가자 필터 — 나를 평가한 사람 중 선택 */}
                <div className="flex flex-wrap gap-1.5">
                  {received.map((r) => {
                    const on = sel.id === r.id;
                    const label = r.isSelf ? "본인" : nameOf(r.reviewerId);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setDetailReviewId(r.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${on ? "border-primary/50 bg-primary/15 text-primary-bright" : "border-white/10 text-fg-muted"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* 총점 카드 (멤버 동료평가 화면 디자인) */}
                <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
                  <p className="text-sm text-fg-muted">
                    총점 <span className="font-bold text-primary-bright">{sel.total}점</span>
                    <span className="text-xs"> / {sel.isSelf ? 25 : 100}점</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-muted">{sel.isSelf ? "자기평가 · 별 1개 1점 환산" : "동료평가 · 별 1개 4점 환산"}</p>
                </div>

                {/* 항목별 별점 + 사유(글) */}
                {PEER_ITEMS.map(([k, label]) => {
                  const reason = sel.reasons[k];
                  return (
                    <div key={k} className="rounded-2xl border border-white/10 bg-surface p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{label}</span>
                        <StarRow n={sel.scores[k]} />
                      </div>
                      <div className="mt-2 min-h-[5rem] w-full whitespace-pre-wrap rounded-lg border border-white/5 bg-surface-2/40 px-3 py-2 text-[13px] leading-relaxed text-fg-muted">
                        {reason?.trim() ? reason : "사유 없음"}
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

/* ── 회원 친절도 응답 ── */
function AdminKindnessPanel() {
  const nameOf = useEmployeeNames();
  const [surveys, setSurveys] = useState<KindnessSurveyDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listKindnessSurveys({})
      .then((r) => alive && (setSurveys(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const byEmp = new Map<string, number>();
  for (const s of surveys) byEmp.set(s.praisedEmployeeId, (byEmp.get(s.praisedEmployeeId) ?? 0) + 1);
  const rows: Row[] = [...byEmp.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, cnt]) => ({ id, name: nameOf(id), sub: `칭찬 ${cnt}회`, value: cnt, valueLabel: `+${cnt * SCORE_PER_PRAISE}점` }));
  const recent = [...surveys].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)).slice(0, 10);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <PlainTile label="총 응답" value={`${surveys.length}`} />
        <PlainTile label="칭찬받은 직원" value={`${rows.length}`} />
      </div>

      <SectionCard title="친절왕" note="칭찬 수 순 (1건당 +10점)" loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} />
      </SectionCard>

      {recent.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <p className="px-4 pb-2 pt-3.5 text-sm font-bold">최근 응답</p>
          <div className="divide-y divide-white/5">
            {recent.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{s.memberName}</span>
                  <span className="text-[11px] text-fg-muted">→</span>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary-bright">{nameOf(s.praisedEmployeeId)} 칭찬</span>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-muted">{fmtDateTime(s.submittedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-fg-muted">{s.praiseComment}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 수업(세션 싸인) 집계 ── */
function AdminClassPanel() {
  const nameOf = useEmployeeNames();
  const [signs, setSigns] = useState<SessionSignDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listSessionSigns({})
      .then((r) => alive && (setSigns(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const byTrainer = new Map<string, number>();
  for (const s of signs) byTrainer.set(s.performedByTrainerId, (byTrainer.get(s.performedByTrainerId) ?? 0) + 1);
  const rows: Row[] = [...byTrainer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, cnt]) => ({ id, name: nameOf(id), sub: `${cnt}회 수행`, value: cnt, valueLabel: `${cnt * SCORE_PER_SIGN}점` }));

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <PlainTile label="총 세션" value={`${signs.length}`} />
        <PlainTile label="수행 트레이너" value={`${rows.length}`} />
      </div>
      <SectionCard title="트레이너별 수업 개수" note={`세션 싸인 1건당 +${SCORE_PER_SIGN}점`} loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} />
      </SectionCard>
    </div>
  );
}

export function AdminTasks() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-white/10 bg-bg/90 backdrop-blur">
        <div className="flex">
          {CATEGORIES.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex-1 whitespace-nowrap py-3 text-xs transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
              >
                {c}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={active} className="animate-page-in">
          {active === 0 ? (
            <AdminEnvPanel />
          ) : active === 1 ? (
            <AdminPeerPanel />
          ) : active === 2 ? (
            <AdminKindnessPanel />
          ) : active === 3 ? (
            <AdminClassPanel />
          ) : (
            <CenterContribution />
          )}
        </div>
      </div>
    </div>
  );
}
