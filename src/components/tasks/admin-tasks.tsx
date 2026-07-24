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

/* ── 아이콘 (named 컴포넌트) ── */
type IconP = { className?: string };
function SparkleIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 13.6 9 19 10.6 13.6 12.2 12 17.7 10.4 12.2 5 10.6 10.4 9Z" />
      <path d="M18.5 15.5v3M17 17h3" />
    </svg>
  );
}
function TrophyIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M6 4h12v5a6 6 0 0 1-12 0Z" />
      <path d="M12 15v3M8.5 20.5h7M9.5 20.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" />
    </svg>
  );
}
function LayersIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}
function StarIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.7l5.4-.8Z" />
    </svg>
  );
}
function UsersIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14c2.3.3 4 2.3 4 5" />
    </svg>
  );
}
function HeartIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-9.4A3.6 3.6 0 0 1 12 8a3.6 3.6 0 0 1 7 2.6c0 5-7 9.4-7 9.4Z" />
    </svg>
  );
}
function DumbbellIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5v11M4 9v6M17.5 6.5v11M20 9v6M6.5 12h11" />
    </svg>
  );
}

/* ── 공용 조각 ── */
function StatTile({ label, value, Icon, tint }: { label: string; value: string; Icon: (p: IconP) => ReactElement; tint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2.5 text-[11px] text-fg-muted">{label}</p>
      <p className="mt-0.5 text-xl font-bold tabular-nums">{value}</p>
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

type Row = { id: string; name: string; sub: string; value: number; valueLabel: string };
function Leaderboard({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r, i) => (
        <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
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
        </div>
      ))}
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

  const byItem = new Map<string, { count: number; points: number }>();
  for (const l of logs) {
    const e = byItem.get(l.itemName) ?? { count: 0, points: 0 };
    e.count += 1;
    e.points += l.points;
    byItem.set(l.itemName, e);
  }
  const items = [...byItem.entries()].sort((a, b) => b[1].count - a[1].count);
  const maxCount = Math.max(1, ...items.map(([, v]) => v.count));
  const totalPoints = logs.reduce((s, l) => s + l.points, 0);
  const recent = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 12);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="총 수행" value={`${logs.length}`} Icon={SparkleIcon} tint="bg-sky-500/15 text-sky-400" />
        <StatTile label="누적 점수" value={`${totalPoints}`} Icon={TrophyIcon} tint="bg-primary/15 text-primary-bright" />
        <StatTile label="수행 항목" value={`${items.length}`} Icon={LayersIcon} tint="bg-emerald-500/15 text-emerald-400" />
      </div>

      <SectionCard title="항목별 집계" note="수행 횟수 순" loaded={loaded} empty={items.length === 0}>
        <div className="divide-y divide-white/5">
          {items.map(([name, v]) => (
            <div key={name} className="px-4 py-2.5">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate font-semibold">{name}</span>
                <span className="shrink-0 text-xs text-fg-muted tabular-nums">
                  {v.count}회 · <b className="text-primary-bright">{v.points}점</b>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className={`h-full rounded-full ${BAR}`} style={{ width: `${Math.round((v.count / maxCount) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {recent.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <p className="px-4 pb-2 pt-3.5 text-sm font-bold">최근 기록</p>
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
        </section>
      )}
    </div>
  );
}

/* ── 동료평가 집계 ── */
function AdminPeerPanel() {
  const nameOf = useEmployeeNames();
  const [reviews, setReviews] = useState<PeerReviewDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listPeerReviews({})
      .then((r) => alive && (setReviews(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const peer = reviews.filter((r) => !r.isSelf);
  const byReviewee = new Map<string, { count: number; total: number }>();
  for (const r of peer) {
    const e = byReviewee.get(r.revieweeId) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.total;
    byReviewee.set(r.revieweeId, e);
  }
  const rows: Row[] = [...byReviewee.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, v]) => ({ id, name: nameOf(id), sub: `${v.count}명 평가 · 평균 ${Math.round(v.total / v.count)}점`, value: v.total, valueLabel: `${v.total}점` }));

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="제출된 평가" value={`${reviews.length}`} Icon={StarIcon} tint="bg-sky-500/15 text-sky-400" />
        <StatTile label="동료 평가" value={`${peer.length}`} Icon={UsersIcon} tint="bg-violet-500/15 text-violet-400" />
      </div>
      <SectionCard title="직원별 받은 평가" note="동료 평가 합계 순 (자기평가 제외)" loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} />
      </SectionCard>
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
        <StatTile label="총 응답" value={`${surveys.length}`} Icon={HeartIcon} tint="bg-rose-500/15 text-rose-400" />
        <StatTile label="칭찬받은 직원" value={`${rows.length}`} Icon={UsersIcon} tint="bg-amber-500/15 text-amber-400" />
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
        <StatTile label="총 세션" value={`${signs.length}`} Icon={DumbbellIcon} tint="bg-emerald-500/15 text-emerald-400" />
        <StatTile label="수행 트레이너" value={`${rows.length}`} Icon={UsersIcon} tint="bg-sky-500/15 text-sky-400" />
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
